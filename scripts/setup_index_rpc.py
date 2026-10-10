#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
setup_index_rpc.py — 建 index_scores 的两个 SECURITY DEFINER RPC

为什么必须走 RPC 而不是前端 `count: 'exact'`：
  EdgeOne CDN 对带 `Prefer: count=exact|planned|estimated` 的请求**一律返回 502**
  （见 MEMORY.md「EdgeOne CDN 对 /api/sb-proxy 硬限制」）。所以精确计数只能
  在库里用 SECURITY DEFINER 函数算，绕过 PostgREST 的 Prefer 头。

两个函数：
  index_scores_stats(...)     → 按当前筛选条件返回精确总数
  index_scores_pool_total()   → 各池条数（顶部概览用）

⚠️ 必须 `DROP FUNCTION IF EXISTS` 后重建：改了返回类型��会报
   "cannot change return type of existing function"。

用法：
  export SUPABASE_PAT=...
  python3 scripts/setup_index_rpc.py
"""
import os
import sys
import json
import subprocess

PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not PAT:
    sys.exit('请设置环境变量 SUPABASE_PAT')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'

STATS = """
DROP FUNCTION IF EXISTS public.index_scores_stats(text, text, boolean, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.index_scores_stats(text, text, boolean, numeric, numeric, text, text);
CREATE FUNCTION public.index_scores_stats(
  p_search    text    DEFAULT NULL,
  p_pool      text    DEFAULT NULL,
  p_only_scored boolean DEFAULT false,
  p_k_all_min numeric DEFAULT NULL,
  p_k_all_max numeric DEFAULT NULL,
  p_grade     text    DEFAULT 'all',
  p_index_class text  DEFAULT NULL
)
RETURNS TABLE(total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.index_scores s
  WHERE (p_search IS NULL OR s.name ILIKE '%' || p_search || '%')
    AND (p_pool IS NULL OR s.pool = p_pool)
    AND (p_index_class IS NULL OR s.index_class = p_index_class)
    AND (NOT p_only_scored OR s.k_all IS NOT NULL)
    AND (p_k_all_min IS NULL OR s.k_all >= p_k_all_min)
    AND (p_k_all_max IS NULL OR s.k_all <= p_k_all_max)
    AND (p_grade IS NULL OR p_grade = 'all' OR s.grade = p_grade);
$$;
GRANT EXECUTE ON FUNCTION public.index_scores_stats(text, text, boolean, numeric, numeric, text, text) TO anon, authenticated;
"""

POOL_TOTAL = """
DROP FUNCTION IF EXISTS public.index_scores_pool_total();
CREATE FUNCTION public.index_scores_pool_total()
RETURNS TABLE(pool text, n bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.pool, count(*)::bigint
  FROM public.index_scores s
  GROUP BY s.pool
  ORDER BY s.pool;
$$;
GRANT EXECUTE ON FUNCTION public.index_scores_pool_total() TO anon, authenticated;
"""


def pg(sql, timeout=180):
    payload = json.dumps({'query': sql})
    r = subprocess.run(
        ['curl', '-s', '--max-time', str(timeout), '-X', 'POST', MGMT_API,
         '-H', f'Authorization: Bearer {PAT}',
         '-H', 'Content-Type: application/json', '-d', payload],
        capture_output=True, text=True, timeout=timeout + 15)
    if r.returncode != 0:
        raise RuntimeError(f'curl fail: {r.stderr[:150]}')
    t = r.stdout.strip()
    if not t:
        return []
    try:
        resp = json.loads(t)
    except json.JSONDecodeError:
        raise RuntimeError(f'非 JSON: {t[:200]}')
    if isinstance(resp, dict) and resp.get('message'):
        raise RuntimeError(resp['message'][:400])
    return resp


def _load_env_local():
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    try:
        with open(p) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
    except FileNotFoundError:
        pass


def main():
    _load_env_local()
    print('=== [1/2] index_scores_stats ===')
    pg(STATS)
    print('  ok')

    print('=== [2/2] index_scores_pool_total ===')
    pg(POOL_TOTAL)
    print('  ok')

    chk = pg("""SELECT p.proname, pg_get_function_result(p.oid) AS returns
                FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname='public' AND p.proname LIKE 'index_scores%'
                ORDER BY p.proname""")
    print('\n已创建/确认的函数:')
    for c in chk:
        print(f"  {c['proname']} → {c['returns']}")
    print('\n完成。前端 src/api/data.js 已按这两个名字调用。')


if __name__ == '__main__':
    main()
