-- 基金分类指数聚合 RPC（2026-11-28 减负）
--
-- 背景：FundIndexPanel 原先用 supabase.from('fund_scores').select(9 列).range()
-- 循环拉全表 2.85 万行（两路共约 56 次请求 / 5.7 万行传输），在免费实例上
-- 属于高成本前端查询。改为服务端一次聚合：实测 HashAggregate 290ms、1 次请求。
--
-- 口径：与前端原逻辑逐字对齐——按 t0（p_level=1）或 t1_tt（p_level=2）分组，
-- 空/纯空白归入「其他」，count 为该分类基金只数，各周期收益取非 NULL 值的平均值。
--
-- 注意：本函数只读，SECURITY DEFINER 仅用于绕开 RLS 差异；不写任何表。

CREATE OR REPLACE FUNCTION public.get_fund_category_index(p_level integer DEFAULT 1)
RETURNS TABLE (
  name text,
  count bigint,
  daily_change double precision,
  r0w double precision,
  r1m double precision,
  r3m double precision,
  r6m double precision,
  r1y double precision,
  r2y double precision,
  r3y double precision,
  r5y double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    coalesce(nullif(btrim(CASE WHEN p_level = 1 THEN f.t0 ELSE f.t1_tt END), ''), '其他') AS name,
    count(*)::bigint AS count,
    avg(f.daily_change)::double precision AS daily_change,
    avg(f.r0w)::double precision AS r0w,
    avg(f.r1m)::double precision AS r1m,
    avg(f.r3m)::double precision AS r3m,
    avg(f.r6m)::double precision AS r6m,
    avg(f.r1y)::double precision AS r1y,
    avg(f.r2y)::double precision AS r2y,
    avg(f.r3y)::double precision AS r3y,
    avg(f.r5y)::double precision AS r5y
  FROM public.fund_scores f
  GROUP BY 1
$fn$;

GRANT EXECUTE ON FUNCTION public.get_fund_category_index(integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
