#!/usr/bin/env python3
"""
导出基金分类清单为静态 JSON（减负 B1）。

背景：
    前端每次打开基金评分页都要调用 RPC get_fund_categories()，该函数对 fund_scores
    全表（2.8 万行）做 GROUP BY 聚合。PostgREST 层 statement timeout 更短，实测该 RPC
    多次返回 57014 canceling statement due to statement timeout —— 既是页面首屏只显示
    「全部」的根因，也是打满免费实例、导致整库 PGRST002 的负载来源之一。

本脚本把这份「低频变化」的分类清单改为夜间 CI 静态导出：
    - 只读生产表 fund_scores，不写任何数据库表（不违反「抓数先中间表、核对后写生产」铁律）；
    - 聚合 SQL 与 public.get_fund_categories() 逐字一致，保证结构与前端归一化逻辑完全兼容；
    - 走 Supabase Management API（database/query），零第三方依赖（urllib 标准库），本地/CI 均可跑；
    - 校验通过后才原子落盘到 public/fund-categories.json；
    - CI 提交该文件后，前端优先读静态 JSON，RPC 只作为兜底。

产出结构（与 RPC 返回一致）：
    { "t0": [{"t0": "...", "cnt": N}], "t1": [{"t0": "...", "t1_tt": "...", "cnt": N}],
      "generated_at": "...", "total": N }

环境变量：SUPABASE_MGMT_TOKEN（或 SUPABASE_PAT / SUPABASE_ACCESS_TOKEN）、SUPABASE_PROJECT_REF（可选，默认本项目）
用法：python3 scripts/export_fund_categories.py [--output public/fund-categories.json]
"""
import os
import sys
import json
import time
import argparse
import datetime
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUTPUT = os.path.join(ROOT, "public", "fund-categories.json")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "tqhtegazxykkqfcpejky")
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

# 与 get_fund_categories() 函数体内两条聚合 SQL 逐字一致（含排序）
SQL_T0 = "SELECT t0, count(*)::int AS cnt FROM fund_scores GROUP BY t0 ORDER BY cnt DESC"
SQL_T1 = ("SELECT t0, t1_tt, count(*)::int AS cnt FROM fund_scores "
          "WHERE t1_tt IS NOT NULL GROUP BY t0, t1_tt ORDER BY t0, cnt DESC")
SQL_TOTAL = "SELECT count(*)::int AS cnt FROM fund_scores"


def _token():
    for k in ("SUPABASE_MGMT_TOKEN", "SUPABASE_PAT", "SUPABASE_ACCESS_TOKEN"):
        v = os.environ.get(k, "").strip().strip('"')
        if v:
            return v
    raise RuntimeError("缺少 SUPABASE_MGMT_TOKEN / SUPABASE_PAT / SUPABASE_ACCESS_TOKEN")


def query(sql, timeout=120):
    """走 Management API 执行只读 SQL，带 3 次重试。返回 list[dict]。"""
    token = _token()
    body = json.dumps({"query": sql}).encode()
    last = ""
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                MGMT_URL, data=body, method="POST",
                headers={"Authorization": f"Bearer {token}",
                         "Content-Type": "application/json", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = json.loads(r.read().decode())
            if isinstance(data, dict):
                if data.get("message"):
                    raise RuntimeError(data["message"][:300])
                return []
            return data or []
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read().decode()[:200]}"
            if e.code < 500:
                raise RuntimeError(last)
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:200]}"
        print(f"[分类导出] 查询重试 {attempt + 1}/3: {last}", flush=True)
        if attempt < 2:
            time.sleep(3)
    raise RuntimeError(f"查询重试 3 次仍失败: {last}")


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def validate(payload, total):
    """落地前校验：分类数量、计数总和、字段类型，异常直接抛错不落盘。"""
    t0 = payload.get("t0") or []
    t1 = payload.get("t1") or []
    if not t0:
        raise RuntimeError("校验失败：一级分类为空")
    if len(t0) < 5:
        raise RuntimeError(f"校验失败：一级分类仅 {len(t0)} 个（应 >=5）")
    if not t1:
        raise RuntimeError("校验失败：二级分类为空")
    if len(t1) < 30:
        raise RuntimeError(f"校验失败：二级分类仅 {len(t1)} 个（应 >=30）")
    sum_t0 = sum(_int(x.get("cnt")) for x in t0)
    if total <= 0:
        raise RuntimeError(f"校验失败：fund_scores 总数异常 {total}")
    if sum_t0 != total:
        raise RuntimeError(f"校验失败：一级计数和 {sum_t0} != 全表 {total}")
    sum_t1 = sum(_int(x.get("cnt")) for x in t1)
    if sum_t1 > total or sum_t1 <= 0:
        raise RuntimeError(f"校验失败：二级计数和 {sum_t1} 超出合理范围 [1,{total}]")
    for x in t0:
        if "t0" not in x or "cnt" not in x:
            raise RuntimeError(f"校验失败：一级分类字段缺失 {x}")
    for x in t1:
        if "t0" not in x or "t1_tt" not in x or "cnt" not in x:
            raise RuntimeError(f"校验失败：二级分类字段缺失 {x}")
    return sum_t0, sum_t1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=DEFAULT_OUTPUT, help="输出文件路径")
    args = ap.parse_args()

    print("[分类导出] 从生产 fund_scores 只读聚合（Management API，不写库）...", flush=True)
    t0_rows = query(SQL_T0)
    t1_rows = query(SQL_T1)
    total_rows = query(SQL_TOTAL)
    total = _int(total_rows[0].get("cnt")) if total_rows else 0

    t0 = [{"t0": r["t0"] if r["t0"] is not None else "", "cnt": _int(r["cnt"])} for r in t0_rows]
    t1 = [{"t0": r["t0"] if r["t0"] is not None else "", "t1_tt": r["t1_tt"], "cnt": _int(r["cnt"])} for r in t1_rows]

    payload = {
        "t0": t0,
        "t1": t1,
        "generated_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec="seconds"),
        "total": total,
    }

    sum_t0, sum_t1 = validate(payload, total)
    print(f"[分类导出] 校验通过：一级 {len(t0)} 类/{sum_t0} 只，二级 {len(t1)} 项/{sum_t1} 条，全表 {total} 行", flush=True)

    out = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, out)
    print(f"[分类导出] 已写入 {out} ({os.path.getsize(out)} bytes), generated_at={payload['generated_at']}", flush=True)


if __name__ == "__main__":
    main()
