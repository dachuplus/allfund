#!/usr/bin/env python3
"""
sync_tag_funds_full.py — 标签-基金关联全量重拉（中间表）→ 校验 → 单事务统一落地

架构（2026-11-14 改造，按用户要求「先拉到中间表，等数据拉完了，再统一写到 fund scores」）：

  1. 从东财 ZTJJ 分页拉取每个标签的【全部】关联基金；
  2. 全程只写中间表 public.fund_tag_funds_staging，【边抓边写】，
     抓取中断/取消也只留下 staging 半成品，正式表与 fund_scores 一根手指都不碰；
  3. 全部拉完后对 staging 做完整性校验（行数、基金数、标签数、空标签数，
     与旧生产值比对 ≥90%），不合格直接退出，生产数据保持原样；
  4. 校验通过后调用数据库函数 public.apply_fund_tag_funds(true)，
     在【单个事务】内一次性完成：正式表替换 → fund_scores.tags /
     has_concept / has_industry 全量重算 → 刷新物化视图。
     事务提交前外部只能看到旧快照，不存在「表已清空、标签还没贴」的中间态；
  5. 函数起始处拿 pg_advisory_xact_lock，promote_staging.py [2.5] 调用同一函数，
     两边写入被串行化 —— 不再依赖「把 cron 错开 21:30」来防互相清空。

  函数真源：scripts/tag_apply_function.sql（每次运行幂等 CREATE OR REPLACE）。

用法：
  SUPABASE_MGMT_TOKEN="$PAT" python3 scripts/sync_tag_funds_full.py
  SUPABASE_MGMT_TOKEN="$PAT" python3 scripts/sync_tag_funds_full.py --no-apply   # 只抓 staging 演练
  SUPABASE_MGMT_TOKEN="$PAT" python3 scripts/sync_tag_funds_full.py --apply-only # 用已有 staging 落地

依赖：标准库 + requests
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import requests

# ── 配置 ──────────────────────────────────────────────
REF = "tqhtegazxykkqfcpejky"
MGMT_URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"

PAT = os.environ.get("SUPABASE_MGMT_TOKEN") or os.environ.get("SUPABASE_PAT", "")
if not PAT:
    print("[ERROR] 需设置 SUPABASE_MGMT_TOKEN 或 SUPABASE_PAT")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FN_SQL_PATH = os.path.join(ROOT, "scripts", "tag_apply_function.sql")
STAGING = "public.fund_tag_funds_staging"
STAGING_COLS = (
    "tag_name, tag_index_code, fund_code, fund_name, fund_type, "
    "syl_1n, syl_d, relation, sort_order"
)

# 东财 API
# 默认走 HTTPS（实测 HTTP/HTTPS 均可用）；403/429/5xx 时指数退避重试，
# 第 3 次起自动切备用协议，规避东财 WAF 对单一出口的短时限流。
EM_API_BASE = "https://api.fund.eastmoney.com"
EM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://fund.eastmoney.com/ztjj/",
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
}


class EMFetchError(Exception):
    """东财接口重试耗尽（403/429/5xx/网络异常）；必须与「正常无数据」区分。"""


def mgmt_rows(sql: str, label: str = "", timeout: int = 600, retries: int = 2) -> list:
    """通过 Management API 执行 SQL 并返回行；SQL 错误/网络错误一律抛异常。

    与旧 mgmt() 只判 HTTP 状态不同：落地函数内的 RAISE EXCEPTION 会返回 400，
    必须让调用方感知，否则会把「事务回滚、生产未变」误判成成功。
    5xx / 连接异常重试；4xx（SQL 错误）立即抛出。
    """
    last = ""
    for attempt in range(1, retries + 1):
        try:
            r = requests.post(
                MGMT_URL,
                headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"},
                json={"query": sql},
                timeout=timeout,
            )
        except Exception as e:
            last = f"请求异常 {type(e).__name__}: {e}"
            if attempt < retries:
                print(f"  [mgmt:{label}] {last}，{attempt}/{retries} 重试", flush=True)
                time.sleep(4)
                continue
            raise RuntimeError(f"[mgmt:{label}] {last}")

        if r.status_code in (200, 201):
            data = r.json()
            if isinstance(data, dict) and data.get("message"):
                raise RuntimeError(f"[mgmt:{label}] {str(data['message'])[:300]}")
            return data if isinstance(data, list) else []

        last = f"HTTP {r.status_code}: {r.text[:250]}"
        if r.status_code >= 500 and attempt < retries:
            print(f"  [mgmt:{label}] {last}，{attempt}/{retries} 重试", flush=True)
            time.sleep(5)
            continue
        raise RuntimeError(f"[mgmt:{label}] {last}")
    raise RuntimeError(f"[mgmt:{label}] 重试耗尽: {last}")


def mgmt(sql: str, label: str = "", timeout: int = 600) -> bool:
    """DDL / 写入用：只需成功与否，失败打日志返回 False。"""
    try:
        mgmt_rows(sql, label, timeout)
        print(f"  [mgmt:{label}] OK", flush=True)
        return True
    except Exception as e:
        print(f"  [mgmt:{label}] FAIL {e}", flush=True)
        return False


def esc(s: str) -> str:
    return str(s).replace("'", "''")


def em_get(url: str, retries: int = 5) -> dict | None:
    """调用东财 JSONP API，返回完整 dict（含 TotalCount）。

    403/429/5xx 与网络异常做指数退避（2/4/8/16s），第 3 次起切备用协议；
    重试耗尽抛 EMFetchError，让调用方把「抓取失败」与「板块本身无基金」区分开，
    避免静默少抓数据却照样落地（2026-11-14 实测标签列表曾瞬时 403）。
    """
    last = ""
    for attempt in range(1, retries + 1):
        u = url
        if attempt >= 3:
            u = ("http://" + url[8:]) if url.startswith("https://") else ("https://" + url[7:])
        try:
            req = urllib.request.Request(u, headers=EM_HEADERS)
            resp = urllib.request.urlopen(req, timeout=30)
            raw = resp.read().decode("utf-8", errors="ignore")
            m = re.search(r"\((\{.*\})\)", raw, re.DOTALL)
            data = json.loads(m.group(1)) if m else json.loads(raw)
            if isinstance(data, dict) and data.get("ErrCode") not in (None, 0):
                raise ValueError(f"ErrCode={data.get('ErrCode')} msg={data.get('ErrMsg')}")
            return data
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:120]}"
            if attempt < retries:
                wait = min(2 ** attempt, 16)
                print(f"    [WARN] 第{attempt}/{retries}次 {u.split('/ZTJJ/')[-1][:40]} 失败 {last}，{wait}s 后重试", flush=True)
                time.sleep(wait)
    raise EMFetchError(last)


def fallback_tags_from_prod() -> list:
    """标签列表接口不可用时，用生产表上次成功的板块代码清单继续更新成分基金。

    只降级「板块清单」，成分基金仍逐板块全量重拉；不新增上游新板块，
    但保证每日同步不会因列表接口一次抖动就整轮跳过（页面数据时间仍会刷新）。
    """
    rows = mgmt_rows("""SELECT DISTINCT ON (t.tag_index_code)
                               t.tag_index_code AS code, t.tag_name AS name,
                               COALESCE(g.tag_type, 'concept') AS tag_type
                        FROM public.fund_tag_funds t
                        LEFT JOIN public.fund_tags g ON g.name = t.tag_name
                        ORDER BY t.tag_index_code, t.updated_at DESC;""",
                     "fallback_tags", timeout=180)
    return [(r["code"], r["name"], r["tag_type"]) for r in rows if r["code"] and r["name"]]


def fetch_all_tags() -> tuple[list, bool]:
    """返回 (标签列表, 是否为降级清单)。"""
    url = f"{EM_API_BASE}/ZTJJ/GetBKListByBKTypeNew?callback=?"
    try:
        resp = em_get(url)
    except EMFetchError as e:
        print(f"  [WARN] 东财标签列表接口重试仍失败({e})，降级用生产表板块清单", flush=True)
        tags = fallback_tags_from_prod()
        print(f"  [DEGRADED] 降级清单 {len(tags)} 个板块（不会新增上游新板块）", flush=True)
        return tags, True
    if not resp or not isinstance(resp, dict):
        print("[ERROR] 标签列表响应异常")
        return [], False

    tags = []
    type_map = {"hy1": "industry", "hy2": "industry", "gn": "concept"}
    for cat_key, tag_type in type_map.items():
        for item in resp.get("Data", {}).get(cat_key, []):
            code = item.get("INDEXCODE", "")
            name = item.get("INDEXNAME", "")
            if code and name:
                tags.append((code, name, tag_type))

    seen = set()
    unique = []
    for t in tags:
        if t[0] not in seen:
            seen.add(t[0])
            unique.append(t)
    return unique, False


def fetch_tag_funds_full(index_code: str) -> list:
    """分页拉取某标签的全部关联基金（修复旧脚本只取 15 只）。"""
    all_funds = []
    page = 1
    ps = 200
    while True:
        params = urllib.parse.urlencode({
            "callback": "?",
            "sort": "SYL_D",
            "sorttype": "DESC",
            "pageindex": str(page),
            "pagesize": str(ps),
            "tp": index_code,
            "isbuy": "0",
        })
        url = f"{EM_API_BASE}/ZTJJ/GetBKRelTopicFundNew?{params}"
        try:
            d = em_get(url)
        except EMFetchError as e:
            # 某页失败不能当成「抓完了」，否则该板块会静默少一大截数据。
            raise EMFetchError(f"{index_code} 第{page}页: {e}")
        if not d or not isinstance(d, dict):
            break
        data = d.get("Data", []) or []
        if not data:
            break
        all_funds.extend(data)
        total = d.get("TotalCount", 0) or 0
        if len(all_funds) >= total or len(data) < ps:
            break
        page += 1
        time.sleep(0.15)
    return all_funds


def fmt_val(v):
    if v is None:
        return "NULL"
    try:
        return str(float(v))
    except (ValueError, TypeError):
        return "NULL"


# ── staging 表 ────────────────────────────────────────
def ensure_staging() -> bool:
    """重建 staging 表。上次中断留下的半成品直接丢弃（正式表从未被触碰）。"""
    ok = mgmt(f"DROP TABLE IF EXISTS {STAGING};", "stg_drop")
    ok = mgmt(f"""CREATE TABLE {STAGING} (
        tag_name        text NOT NULL,
        tag_index_code  text NOT NULL,
        fund_code       text NOT NULL,
        fund_name       text NOT NULL,
        fund_type       text,
        syl_1n          double precision,
        syl_d           double precision,
        relation        double precision,
        sort_order      integer DEFAULT 0,
        updated_at      timestamptz NOT NULL DEFAULT now(),
        fund_manager    text
    );""", "stg_create") and ok
    ok = mgmt(f"CREATE INDEX idx_ftfs_fund_code ON {STAGING} (fund_code);", "stg_idx_fund") and ok
    ok = mgmt(f"CREATE INDEX idx_ftfs_tag_name ON {STAGING} (tag_name);", "stg_idx_tag") and ok
    return ok


def insert_rows(rows: list, seq: list) -> int:
    """把缓存行写入 staging（每 300 行一条 INSERT）。"""
    written = 0
    for start in range(0, len(rows), 300):
        chunk = rows[start:start + 300]
        values = ",".join(
            f"('{r[0]}','{r[1]}','{r[2]}','{r[3]}','{r[4]}',{r[5]},{r[6]},{r[7]},{r[8]})"
            for r in chunk
        )
        seq[0] += 1
        sql = f"INSERT INTO {STAGING} ({STAGING_COLS}) VALUES {values};"
        if not mgmt(sql, f"stg_ins{seq[0]}"):
            raise RuntimeError(f"staging 第 {seq[0]} 批写入失败")
        written += len(chunk)
    return written


# ── 校验 ──────────────────────────────────────────────
def staging_stats() -> dict:
    return mgmt_rows(f"""SELECT
          count(*) AS rows,
          count(DISTINCT fund_code) AS funds,
          count(DISTINCT tag_name) AS tags,
          count(DISTINCT tag_index_code) AS tag_codes,
          (SELECT count(*) FROM public.fund_tags g
            WHERE NOT EXISTS (SELECT 1 FROM {STAGING} t
                              WHERE t.tag_name = g.name)) AS empty_tags
        FROM {STAGING};""", "stg_stats", timeout=180)[0]


def prod_stats() -> dict:
    return mgmt_rows("""SELECT
          count(*) AS rows,
          count(DISTINCT fund_code) AS funds,
          count(DISTINCT tag_name) AS tags
        FROM public.fund_tag_funds;""", "prod_stats", timeout=180)[0]


def validate(st: dict, prev: dict, tag_list: int, written: int) -> list:
    """返回不通过原因列表；空列表 = 可以落地。"""
    bad = []
    if st["rows"] != written:
        bad.append(f"staging 行数 {st['rows']} ≠ 已写入 {written}")
    if st["rows"] <= 0 or st["funds"] <= 0:
        bad.append("staging 为空")
    if prev["rows"] > 0 and st["rows"] < prev["rows"] * 0.9:
        bad.append(f"映射行数 {st['rows']} < 旧值 {prev['rows']} 的 90%")
    if prev["funds"] > 0 and st["funds"] < prev["funds"] * 0.9:
        bad.append(f"关联基金数 {st['funds']} < 旧值 {prev['funds']} 的 90%")
    if st["tags"] < max(100, int(prev["tags"] * 0.9)):
        bad.append(f"标签数 {st['tags']} 偏少（旧值 {prev['tags']}）")
    if st["tag_codes"] < tag_list * 0.9:
        bad.append(f"抓到板块代码 {st['tag_codes']} / 标签清单 {tag_list} 不足 90%")
    if st["empty_tags"] > max(10, int(tag_list * 0.1)):
        bad.append(f"无关联基金的标签 {st['empty_tags']} 个，疑似抓取失败")
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-apply", action="store_true", help="只抓 staging 并校验，不落地（演练）")
    ap.add_argument("--apply-only", action="store_true", help="跳过抓取，用已有 staging 落地")
    ap.add_argument("--flush-every", type=int, default=5, help="每 N 个标签 flush 一次 staging")
    args = ap.parse_args()

    print("=" * 68)
    print(" 标签-基金关联：中间表全量抓取 → 校验 → 单事务统一落地")
    print("=" * 68)

    written = 0
    if not args.apply_only:
        # 1) 标签列表
        print("\n[1/6] 获取东财标签列表...")
        tags, degraded = fetch_all_tags()
        print(f"  共 {len(tags)} 个标签" + ("（降级清单）" if degraded else ""))
        if not tags:
            print("[ERROR] 标签列表为空，生产数据未变动")
            sys.exit(1)
        tc = {}
        for _, _, tt in tags:
            tc[tt] = tc.get(tt, 0) + 1
        print(f"  分布: {tc}")

        # 2) 重建 staging 表
        print("\n[2/6] 重建中间表（正式表与 fund_scores 保持不动）...")
        if not ensure_staging():
            print("[FATAL] staging 表创建失败，生产数据未变动")
            sys.exit(1)

        # 3) 边抓边写 staging
        print(f"\n[3/6] 全量抓取并边抓边写 {STAGING}（{len(tags)} 个标签）...")
        pending = []
        empty_tags = []
        failed_tags = []
        seq = [0]
        for i, (idx_code, tag_name, tag_type) in enumerate(tags):
            try:
                funds = fetch_tag_funds_full(idx_code)
            except EMFetchError as e:
                failed_tags.append(tag_name)
                print(f"    [WARN] 板块 {tag_name} 抓取失败: {str(e)[:120]}", flush=True)
                funds = []
            if not funds:
                empty_tags.append(tag_name)
            for j, f in enumerate(funds):
                code = str(f.get("FCODE", "")).strip()
                fname = str(f.get("SHORTNAME", "")).strip()
                if not code or not fname:
                    continue
                pending.append((
                    esc(tag_name), esc(idx_code), esc(code), esc(fname),
                    esc(f.get("FTYPE") or ""),
                    fmt_val(f.get("SYL_1N")), fmt_val(f.get("SYL_Z")),
                    fmt_val(f.get("RELATION")), j + 1,
                ))
            if pending and (len(pending) >= 2000 or (i + 1) % args.flush_every == 0):
                written += insert_rows(pending, seq)
                pending = []
            if (i + 1) % 20 == 0 or i == len(tags) - 1:
                print(f"  进度: {i+1}/{len(tags)} | 已落 staging {written} 条 | 空 {len(empty_tags)} | 失败 {len(failed_tags)}", flush=True)
            time.sleep(0.2)
        if pending:
            written += insert_rows(pending, seq)
        print(f"  ✓ staging 写入 {written} 条（空标签 {len(empty_tags)} 个 / 抓取失败 {len(failed_tags)} 个）")
        if empty_tags:
            print(f"    无关联基金示例: {empty_tags[:10]}")
        # 抓取失败板块过多时直接拒绝落地：宁可让页面显示旧数据 + 过期红字，
        # 也不能用残缺快照覆盖生产（用户明确要求「没更新必须有提示」）。
        max_failed = max(3, int(len(tags) * 0.05))
        if len(failed_tags) > max_failed:
            print(f"  [BLOCK] 抓取失败板块 {len(failed_tags)} > 阈值 {max_failed}，"
                  f"拒绝落地；正式表与 fund_scores 完全未改动", flush=True)
            sys.exit(1)
    else:
        print("\n[1-3/6] --apply-only：跳过抓取，直接使用已有 staging")

    # 4) staging 完整性校验
    print("\n[4/6] 校验 staging 完整性（不通过则不落地，生产数据保持原样）...")
    try:
        st = staging_stats()
        prev = prod_stats()
        tag_list = mgmt_rows("SELECT count(*) AS n FROM public.fund_tags;", "tag_list")[0]["n"]
    except Exception as e:
        print(f"  [FATAL] 校验查询失败: {e}")
        sys.exit(1)
    print("  staging:", json.dumps(st, ensure_ascii=False, default=str))
    print("  生产现值:", json.dumps(prev, ensure_ascii=False, default=str), "| 标签清单", tag_list)

    if args.apply_only:
        written = st["rows"]  # apply-only 没有「已写入」计数
    bad = validate(st, prev, tag_list, written)
    if bad:
        for b in bad:
            print(f"  [BLOCK] {b}")
        print("  [FATAL] staging 校验未通过，拒绝落地；正式表与 fund_scores 完全未改动")
        sys.exit(1)
    print("  ✓ 校验通过")

    if args.no_apply:
        print("\n[5-6/6] --no-apply：演练结束，未执行落地")
        return

    # 5) 单事务统一落地
    print("\n[5/6] 创建/更新落地函数并单事务执行...")
    with open(FN_SQL_PATH, encoding="utf-8") as fh:
        fn_sql = fh.read()
    if not mgmt(fn_sql, "create_fn", timeout=180):
        print("  [FATAL] 落地函数创建失败，生产数据未变动")
        sys.exit(1)
    try:
        res = mgmt_rows(
            "SELECT public.apply_fund_tag_funds(true) AS r;",
            "apply", timeout=1200, retries=2,
        )
        print("  落地函数返回:", json.dumps(res, ensure_ascii=False, default=str))
    except Exception as e:
        print(f"  [FATAL] 落地事务失败（已整体回滚，生产数据保持旧快照）: {e}")
        sys.exit(1)

    # 6) 落地后复核
    print("\n[6/6] 落地后复核...")
    chk = mgmt_rows("""SELECT
          (SELECT count(*) FROM public.fund_tag_funds) AS mappings,
          (SELECT count(DISTINCT fund_code) FROM public.fund_tag_funds) AS funds,
          (SELECT count(DISTINCT tag_name) FROM public.fund_tag_funds) AS tags,
          (SELECT max(updated_at) FROM public.fund_tag_funds) AS last,
          (SELECT count(*) FROM public.fund_scores WHERE tags IS NOT NULL) AS tagged,
          (SELECT count(*) FROM public.fund_scores WHERE has_concept) AS has_concept,
          (SELECT count(*) FROM public.fund_scores WHERE has_industry) AS has_industry,
          (SELECT count(*) FROM public.fund_scores_main WHERE tags IS NOT NULL) AS main_tagged,
          (SELECT count(*) FROM public.fund_tags g
            WHERE NOT EXISTS (SELECT 1 FROM public.fund_tag_funds t
                              WHERE t.tag_name = g.name)) AS empty_tags;""", "final", timeout=300)[0]
    print("  库内校验:", json.dumps(chk, ensure_ascii=False, default=str))
    if chk["tagged"] == 0 or chk["main_tagged"] == 0:
        print("  [FATAL] 落地后 fund_scores / 物化视图标签为空")
        sys.exit(1)
    print("\n完成。")


if __name__ == "__main__":
    main()
