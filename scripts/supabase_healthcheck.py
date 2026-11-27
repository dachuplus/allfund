#!/usr/bin/env python3
"""
Supabase DB 健康探活 + 自动重启自愈（减负 C 方案）。

背景：
    免费共享 Postgres 实例会间歇性卡死（控制面/pooler/auth 正常，仅 db 本体无响应）。
    此前两次故障均靠人工发现 + 手动调 POST /v1/projects/{ref}/restart 恢复，
    从故障到恢复间隔长。本脚本由 GitHub Actions 定时运行，自动完成「探活 → 判定 → 重启 → 验收」。

防误杀设计（关键）：
    - 必须连续 N 次（默认 3 次，间隔 60s）探测 db 均为 UNHEALTHY 才触发重启，
      单次抖动/网络抽风不会误重启（重启会短暂中断全站服务）。
    - 只以 db 服务的 healthy 字段为准；rest/pooler/auth 仅记录不参与判定
      （已知这些服务在 db 卡死时可能仍显示 ACTIVE_HEALTHY）。
    - 重启后轮询最多 15 分钟等待 db 恢复，避免无限等待。
    - --dry-run 只探活不重启，用于人工验证。

零第三方依赖（urllib 标准库），本地和 CI 均可跑。
环境变量：SUPABASE_MGMT_TOKEN（或 SUPABASE_PAT / SUPABASE_ACCESS_TOKEN）、SUPABASE_PROJECT_REF。
用法：
    python3 scripts/supabase_healthcheck.py                 # 连续3次不健康则重启
    python3 scripts/supabase_healthcheck.py --dry-run        # 只探活
    python3 scripts/supabase_healthcheck.py --threshold 3 --interval 60 --max-wait 900
"""
import os
import sys
import json
import time
import argparse
import datetime
import urllib.request
import urllib.error

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "tqhtegazxykkqfcpejky")
BASE = f"https://api.supabase.com/v1/projects/{PROJECT_REF}"
HEALTH_URL = BASE + "/health?services=db,rest,pooler,auth"
RESTART_URL = BASE + "/restart"
SERVICES = ("db", "rest", "pooler", "auth")


def _token():
    for k in ("SUPABASE_MGMT_TOKEN", "SUPABASE_PAT", "SUPABASE_ACCESS_TOKEN"):
        v = os.environ.get(k, "").strip().strip('"')
        if v:
            return v
    raise RuntimeError("缺少 SUPABASE_MGMT_TOKEN / SUPABASE_PAT / SUPABASE_ACCESS_TOKEN")


def _ts():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec="seconds")


def _req(url, method="GET", timeout=30):
    token = _token()
    req = urllib.request.Request(
        url, method=method,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode()
        return r.status, (json.loads(raw) if raw else None)


def probe():
    """返回 (db_healthy: bool|None, 详情 dict)。网络异常返回 None，不视为健康也不视为故障。"""
    try:
        status, body = _req(HEALTH_URL, timeout=30)
        if status != 200 or not isinstance(body, list):
            return None, {"http": status, "raw": str(body)[:200]}
        info = {}
        for row in body:
            info[row.get("name")] = {"healthy": row.get("healthy"), "status": row.get("status")}
        db = info.get("db", {}).get("healthy")
        return (True if db is True else False if db is False else None), info
    except Exception as e:
        return None, {"error": f"{type(e).__name__}: {str(e)[:200]}"}


def restart():
    status, body = _req(RESTART_URL, method="POST", timeout=60)
    return status, body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=int, default=3, help="连续 N 次不健康才重启（默认 3）")
    ap.add_argument("--interval", type=int, default=60, help="探测间隔秒（默认 60）")
    ap.add_argument("--max-wait", type=int, default=900, help="重启后等待恢复最长秒（默认 900）")
    ap.add_argument("--stable-checks", type=int, default=3, help="重启后需连续 N 次健康才判恢复（默认 3，每次间隔 30s）")
    ap.add_argument("--dry-run", action="store_true", help="只探活，不执行重启")
    args = ap.parse_args()

    print(f"[DB探活] {_ts()} 开始，连续 {args.threshold} 次不健康才重启（dry_run={args.dry_run}）", flush=True)

    consecutive = 0
    for i in range(args.threshold):
        ok, info = probe()
        db_state = ok if ok is not None else "UNKNOWN(网络异常)"
        print(f"[DB探活] {_ts()} 第 {i+1}/{args.threshold} 次: db={db_state} 详情={json.dumps(info, ensure_ascii=False)}", flush=True)
        if ok is True:
            print(f"[DB探活] {_ts()} DB 健康，无需重启，退出。", flush=True)
            return 0
        if ok is False:
            consecutive += 1
        else:
            # 网络异常不累积连续计数（避免探活接口自身抖动误判）
            print(f"[DB探活] 探测请求异常，本次不计入连续判定。", flush=True)
        if i < args.threshold - 1:
            time.sleep(args.interval)

    if consecutive < args.threshold:
        print(f"[DB探活] 连续不健康次数 {consecutive} < 阈值 {args.threshold}，不重启，退出。", flush=True)
        return 0

    print(f"[DB探活] {_ts()} 连续 {consecutive} 次 DB UNHEALTHY，判定实例卡死。", flush=True)
    if args.dry_run:
        print("[DB探活] dry-run 模式，跳过重启。", flush=True)
        return 0

    # 执行重启
    print(f"[DB探活] {_ts()} 调用 POST /v1/projects/{PROJECT_REF}/restart ...", flush=True)
    try:
        status, body = restart()
        print(f"[DB探活] 重启请求 HTTP {status} 响应={str(body)[:200]}", flush=True)
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:300]
        print(f"[DB探活] 重启请求失败 HTTP {e.code}: {err}", flush=True)
        return 2
    except Exception as e:
        print(f"[DB探活] 重启请求异常 {type(e).__name__}: {str(e)[:200]}", flush=True)
        return 2

    # 轮询等待恢复：必须连续 N 次健康才算稳住。
    # 2026-11-27 实测教训：第一次重启后 22:46:24 探针短暂 healthy，1 分钟后又 UNHEALTHY，
    # 第二次重启才真正稳定。若看到单次 healthy 就退出，会误判恢复、DB 仍在抖动无人处理。
    waited = 0
    step = 30
    streak = 0
    while waited < args.max_wait:
        time.sleep(step)
        waited += step
        ok, info = probe()
        streak = streak + 1 if ok is True else 0
        print(f"[DB探活] {_ts()} 重启后 +{waited}s: db={ok} 详情={json.dumps(info, ensure_ascii=False)} 连续健康={streak}/{args.stable_checks}", flush=True)
        if streak >= args.stable_checks:
            # 稳定窗内最后再做一次真实 SQL 查询，确认数据面确实可服务（探针健康不代表能查库）
            try:
                qbody = json.dumps({"query": "SELECT count(*)::int AS cnt FROM fund_scores"}).encode()
                qreq = urllib.request.Request(
                    f"{BASE}/database/query", data=qbody, method="POST",
                    headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json", "Accept": "application/json"})
                with urllib.request.urlopen(qreq, timeout=60) as qr:
                    qd = json.loads(qr.read().decode())
                cnt = qd[0].get("cnt") if isinstance(qd, list) and qd else None
                print(f"[DB探活] {_ts()} 真实查询 fund_scores={cnt} 行，确认可服务。", flush=True)
            except Exception as e:
                print(f"[DB探活] {_ts()} 真实查询失败（探针健康但库不可查），继续等待: {type(e).__name__}: {str(e)[:150]}", flush=True)
                streak = 0
                continue
            print(f"[DB探活] {_ts()} DB 连续 {streak} 次健康 + 真实查询通过，自愈成功（耗时 {waited}s）。", flush=True)
            return 0
    print(f"[DB探活] {_ts()} 重启后等待 {args.max_wait}s 仍未稳定恢复，需人工介入。", flush=True)
    return 3


if __name__ == "__main__":
    sys.exit(main())
