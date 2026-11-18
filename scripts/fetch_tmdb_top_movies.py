#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fetch_tmdb_top_movies.py — 抓取 TMDB 电影 Top 1 万评分，写入 staging 并原子切换正式表。

数据源：TMDB Discover API（/3/discover/movie），按 vote_count 降序取电影，
       只存精简字段（片名/年份/评分/评分人数/海报路径/来源链接/排名），
       不存简介全文、不存海报二进制，用户点片名跳 TMDB 原页看详情。

链路（与项目 staging 铁律一致）：
  1. 分页抓取 → 全部写 movie_ratings_staging（正式表零改动）
  2. 抓取完成做护栏校验（行数、字段完整度）
  3. 校验通过 → 调 promote_movie_ratings() 单事务删旧插新 + 保留 fetch_date
  4. 校验失败 → 抛错退出，正式表保持旧数据不变

密钥（不硬编码）：
  TMDB_READ_TOKEN  — 优先，v4 Bearer Token（推荐，无需 api_key 查询参数）
  TMDB_API_KEY     — 回退，v3 api_key（两者至少有一个）

用法：
  TMDB_READ_TOKEN=xxx python3 scripts/fetch_tmdb_top_movies.py
  TMDB_API_KEY=xxx python3 scripts/fetch_tmdb_top_movies.py --limit 200   # 小样本冒烟
  python3 scripts/fetch_tmdb_top_movies.py --resume                        # 断点续抓（未实现整程，仅记录进度提示）

环境变量（Supabase，写库必需）：SUPABASE_PAT 或 .env.local 内的 SUPABASE_PAT
"""
import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REF = "tqhtegazxykkqfcpejky"
MGMT_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"
TMDB_API = "https://api.themoviedb.org/3"
TOP_N = 10000          # 目标：Top 1 万
PAGE_SIZE = 20         # TMDB 每页固定 20
MAX_PAGES = 500   # TMDB Discover 深分页上限 500 页（≈10000 条），再多 API 会 422
UA = "Mozilla/5.0 (compatible; allfund-movie-ratings/1.0)"


# ---------------- 凭证 ----------------
def load_env_file(path):
    out = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def get_pat(env):
    return env.get("SUPABASE_PAT") or os.environ.get("SUPABASE_PAT") or ""


def get_tmdb_creds(env):
    """返回 (auth_header, params)。优先 v4 token，回退 v3 key。"""
    token = env.get("TMDB_READ_TOKEN") or os.environ.get("TMDB_READ_TOKEN")
    key = env.get("TMDB_API_KEY") or os.environ.get("TMDB_API_KEY")
    if token:
        return {"Authorization": f"Bearer {token}"}, {}
    if key:
        return {}, {"api_key": key}
    return None, None


# ---------------- Management API SQL ----------------
def mgmt_sql(sql, pat, timeout=120):
    req = urllib.request.Request(
        MGMT_API,
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={"Authorization": f"Bearer {pat}", "Content-Type": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read().decode("utf-8")
    return json.loads(body)


def sql_literal(s):
    """把 Python 值转成安全 SQL 字面量（字段名固定、值全部转义）。"""
    if s is None:
        return "NULL"
    if isinstance(s, bool):
        return "TRUE" if s else "FALSE"
    if isinstance(s, (int, float)):
        return str(s)
    return "'" + str(s).replace("'", "''") + "'"


# ---------------- TMDB 抓取 ----------------
def tmdb_get(path, params, headers, retries=4):
    url = f"{TMDB_API}{path}?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={**headers, "User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(1.5 * (attempt + 1))
                continue
            raise RuntimeError(f"TMDB {path} 失败：{last} {e.read()[:200]}")
        except Exception as e:
            last = str(e)
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"TMDB {path} 重试 {retries} 次仍失败：{last}")


def fetch_movies(headers, base_params, limit, log):
    """按 vote_count 降序翻页抓电影，返回精简行列表。"""
    rows = []
    seen = set()
    page = 1
    while len(rows) < limit and page <= MAX_PAGES:
        params = dict(base_params)
        params.update({
            "sort_by": "vote_count.desc",
            "include_adult": "false",
            "include_video": "false",
            "language": "zh-CN",
            "page": page,
        })
        data = tmdb_get("/discover/movie", params, headers)
        results = data.get("results") or []
        if not results:
            log(f"第 {page} 页无结果，停止")
            break
        for m in results:
            mid = m.get("id")
            if not mid or mid in seen:
                continue
            seen.add(mid)
            rel = m.get("release_date") or ""
            year = None
            if len(rel) >= 4 and rel[:4].isdigit():
                y = int(rel[:4])
                if 1888 <= y <= 2100:
                    year = y
            va = m.get("vote_average")
            vc = m.get("vote_count")
            rows.append({
                "tmdb_id": int(mid),
                "title": (m.get("title") or "").strip() or (m.get("original_title") or f"tmdb-{mid}"),
                "original_title": (m.get("original_title") or "").strip() or None,
                "year": year,
                "vote_average": round(float(va), 1) if va not in (None, "") else None,
                "vote_count": int(vc) if vc is not None else None,
                "poster_path": (m.get("poster_path") or "").strip() or None,
                "source_url": f"https://www.themoviedb.org/movie/{mid}",
                "fetch_date": "CURRENT_DATE",
                "rank": len(rows) + 1,
            })
            if len(rows) >= limit:
                break
        total_pages = data.get("total_pages") or 0
        log(f"第 {page}/{total_pages} 页：本页 {len(results)} 条，累计 {len(rows)} 条")
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.15)   # 温和限速，避免触发 TMDB 429
    return rows


def write_staging(rows, pat, batch=400, dry_run=False, log=print):
    """分批把行写入 staging。先清空 staging（正式表不动）。"""
    if dry_run:
        log(f"[dry-run] 跳过写库，共 {len(rows)} 行")
        return
    mgmt_sql("TRUNCATE TABLE public.movie_ratings_staging", pat)
    log("staging 已清空")
    cols = "(tmdb_id,title,original_title,year,vote_average,vote_count,poster_path,source_url,fetch_date,rank)"
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        values = []
        for r in chunk:
            fd = "CURRENT_DATE" if r["fetch_date"] == "CURRENT_DATE" else sql_literal(r["fetch_date"])
            values.append("(" + ",".join([
                sql_literal(r["tmdb_id"]),
                sql_literal(r["title"]),
                sql_literal(r["original_title"]),
                sql_literal(r["year"]),
                sql_literal(r["vote_average"]),
                sql_literal(r["vote_count"]),
                sql_literal(r["poster_path"]),
                sql_literal(r["source_url"]),
                fd,
                sql_literal(r["rank"]),
            ]) + ")")
        sql = f"INSERT INTO public.movie_ratings_staging {cols} VALUES " + ",".join(values)
        mgmt_sql(sql, pat)
        log(f"staging 已写 {min(i + batch, len(rows))}/{len(rows)}")


def verify_staging(pat, min_rows, log):
    res = mgmt_sql(
        "SELECT count(*) AS n, count(DISTINCT tmdb_id) AS uniq, "
        "count(title) AS titled, min(fetch_date) AS fmin FROM public.movie_ratings_staging",
        pat,
    )
    row = res[0] if isinstance(res, list) and res else {}
    n, uniq = int(row.get("n", 0)), int(row.get("uniq", 0))
    log(f"staging 校验：行数={n} 唯一 tmdb_id={uniq} fetch_date={row.get('fmin')}")
    if n < min_rows:
        raise RuntimeError(f"staging 行数 {n} < 下限 {min_rows}，拒绝切换")
    if n != uniq:
        raise RuntimeError(f"staging 存在重复 tmdb_id（{uniq}/{n}），拒绝切换")
    return n


def promote(pat, log):
    res = mgmt_sql("SELECT public.promote_movie_ratings() AS result", pat)
    log(f"切换结果：{json.dumps(res, ensure_ascii=False)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=TOP_N, help="抓取条数（默认 10000，冒烟可传 200）")
    ap.add_argument("--min-rows", type=int, default=None, help="切换护栏最小行数（默认按 limit 的 90%%，且不低于 8500）")
    ap.add_argument("--dry-run", action="store_true", help="只抓取不写库、不切换")
    args = ap.parse_args()

    env = load_env_file(pathlib.Path(__file__).resolve().parent.parent / ".env.local")
    headers, base_params = get_tmdb_creds(env)
    if headers is None:
        print("缺少 TMDB_READ_TOKEN 或 TMDB_API_KEY（环境变量或 .env.local）", file=sys.stderr)
        sys.exit(2)
    pat = get_pat(env)
    if not pat and not args.dry_run:
        print("缺少 SUPABASE_PAT（环境变量或 .env.local）", file=sys.stderr)
        sys.exit(2)

    # 完整抓取（limit≈10000）时护栏至少 8500；小样本冒烟按比例 90%，避免必然失败。
    min_rows = args.min_rows or (max(8500, int(args.limit * 0.9)) if args.limit >= 9000 else max(1, int(args.limit * 0.7)))

    def log(msg):
        print(msg, flush=True)

    log(f"开始抓取 TMDB 电影 Top {args.limit}（排序 vote_count.desc）...")
    rows = fetch_movies(headers, base_params, args.limit, log)
    log(f"抓取完成，共 {len(rows)} 条")
    if len(rows) < min_rows:
        log(f"抓取条数 {len(rows)} < 护栏 {min_rows}，不写库不切换")
        if not args.dry_run:
            sys.exit(3)
        return

    write_staging(rows, pat, dry_run=args.dry_run, log=log)
    if args.dry_run:
        log("dry-run 结束")
        return
    verify_staging(pat, min_rows, log)
    promote(pat, log)
    log("完成：staging 已原子切换到正式表 movie_ratings")


if __name__ == "__main__":
    main()
