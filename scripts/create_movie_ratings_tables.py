#!/usr/bin/env python3
"""创建电影评分库数据表（幂等）。

真源 SQL 内联于此脚本，便于本地与 CI 复现。执行链路：
  读 allfund/.env.local 的 SUPABASE_PAT -> Supabase Management API /database/query

表：
  movie_ratings_staging  抓取暂存（脚本只写这里）
  movie_ratings          正式表（前端只读这里）
  promote_movie_ratings() 校验 + 单事务替换（Delete + Insert 同一事务）

安全：RLS 开启，anon / authenticated 均可 SELECT（防登录态盲区）；
      正式表写入仅 service_role / SECURITY DEFINER 函数。
"""
import json
import os
import pathlib
import sys
import urllib.request
import urllib.error

REF = os.environ.get("SUPABASE_REF") or "tqhtegazxykkqfcpejky"
ENV_PATH = pathlib.Path(__file__).resolve().parent.parent / ".env.local"


def load_pat():
    pat = os.environ.get("SUPABASE_PAT")
    if pat:
        return pat
    if not ENV_PATH.exists():
        print("SUPABASE_PAT 未设置且找不到 .env.local", file=sys.stderr)
        sys.exit(2)
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if k.strip() == "SUPABASE_PAT":
                return v.strip().strip('"').strip("'")
    print(".env.local 中无 SUPABASE_PAT", file=sys.stderr)
    sys.exit(2)


PAT = load_pat()
URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"

STATEMENTS = [
    # ---------- 正式表 ----------
    """
    CREATE TABLE IF NOT EXISTS public.movie_ratings (
      tmdb_id        bigint PRIMARY KEY,
      title          text NOT NULL,
      original_title text,
      year           integer,
      vote_average   numeric(3,1),
      vote_count     integer,
      poster_path    text,
      source_url     text,
      fetch_date     date NOT NULL DEFAULT CURRENT_DATE,
      rank           integer,
      created_at     timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS public.movie_ratings_staging (
      tmdb_id        bigint PRIMARY KEY,
      title          text NOT NULL,
      original_title text,
      year           integer,
      vote_average   numeric(3,1),
      vote_count     integer,
      poster_path    text,
      source_url     text,
      fetch_date     date NOT NULL DEFAULT CURRENT_DATE,
      rank           integer,
      created_at     timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_movie_ratings_rank ON public.movie_ratings(rank)",
    "CREATE INDEX IF NOT EXISTS idx_movie_ratings_vote ON public.movie_ratings(vote_average DESC)",
    "CREATE INDEX IF NOT EXISTS idx_movie_ratings_year ON public.movie_ratings(year)",
    # ---------- RLS：anon + authenticated 均可读（铁律：防登录态盲区） ----------
    "ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.movie_ratings_staging ENABLE ROW LEVEL SECURITY",
    """
    DROP POLICY IF EXISTS "movie_ratings_public_read" ON public.movie_ratings
    """,
    """
    CREATE POLICY "movie_ratings_public_read" ON public.movie_ratings
      FOR SELECT TO anon, authenticated USING (true)
    """,
    """
    DROP POLICY IF EXISTS "movie_ratings_staging_public_read" ON public.movie_ratings_staging
    """,
    """
    CREATE POLICY "movie_ratings_staging_public_read" ON public.movie_ratings_staging
      FOR SELECT TO anon, authenticated USING (true)
    """,
    # ---------- 切换函数：校验 + 单事务替换 ----------
    """
    CREATE OR REPLACE FUNCTION public.promote_movie_ratings()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      n_staging  int;
      n_distinct int;
      n_before   int;
      d_min      date;
    BEGIN
      SELECT count(*), count(DISTINCT tmdb_id), min(fetch_date)
        INTO n_staging, n_distinct, d_min
        FROM movie_ratings_staging;

      IF n_staging < 9000 THEN
        RAISE EXCEPTION 'staging 行数不足：% (需 >= 9000)', n_staging;
      END IF;
      IF n_distinct <> n_staging THEN
        RAISE EXCEPTION 'staging 存在重复 tmdb_id：distinct=% total=%', n_distinct, n_staging;
      END IF;
      IF d_min IS NULL OR d_min < CURRENT_DATE - INTERVAL '30 days' THEN
        RAISE EXCEPTION 'staging fetch_date 过旧：%', d_min;
      END IF;

      SELECT count(*) INTO n_before FROM movie_ratings;

      DELETE FROM movie_ratings;
      INSERT INTO movie_ratings
        (tmdb_id, title, original_title, year, vote_average, vote_count,
         poster_path, source_url, fetch_date, rank)
      SELECT tmdb_id, title, original_title, year, vote_average, vote_count,
             poster_path, source_url, fetch_date, rank
        FROM movie_ratings_staging;

      RETURN jsonb_build_object('before', n_before, 'after', n_staging, 'fetch_date', d_min);
    END;
    $fn$
    """,
    # 默认 CREATE FUNCTION 会给 PUBLIC EXECUTE，须显式回收，
    # 只留 service_role 可调用切换（防止匿名触发清空/替换正式表）。
    "REVOKE EXECUTE ON FUNCTION public.promote_movie_ratings() FROM PUBLIC, anon, authenticated",
    "GRANT EXECUTE ON FUNCTION public.promote_movie_ratings() TO service_role",
    "NOTIFY pgrst, 'reload schema'",
]


def run_sql(sql):
    req = urllib.request.Request(
        URL,
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {PAT}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 allfund-movie-ratings-setup",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main():
    for i, stmt in enumerate(STATEMENTS, 1):
        code, body = run_sql(stmt)
        one = " ".join(stmt.split())[:80]
        print(f"[{i:02d}/{len(STATEMENTS)}] HTTP {code} :: {one}")
        if code >= 400:
            print(body, file=sys.stderr)
            sys.exit(1)
    print("OK: movie_ratings 表结构 + RLS + promote 函数已就绪")

    code, body = run_sql(
        "SELECT (SELECT count(*) FROM public.movie_ratings) AS formal, "
        "(SELECT count(*) FROM public.movie_ratings_staging) AS staging"
    )
    print("verify:", code, body)


if __name__ == "__main__":
    main()
