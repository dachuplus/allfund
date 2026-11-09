-- 基金主份额物化视图：fund_scores_main
-- 规则（2026-11-09 用户确认）：
--   1. 同一基金的不同份额，以「最早成立」的份额为主代码；
--   2. 若成立日相同（或无法比较），则 A 份额为主代码；
--   3. 组内既无有效成立日差异、又无 A 份额时，按
--      「无份额字母后缀 → 其他字母份额 → (前端)/(后端) 变体 → 代码升序」兜底。
--
-- 分组：归一化主体名（先剥离 (前端)/(后端)，再剥离末尾份额字母 [ABCDEFHIRTY]）。
--   ⚠️ 分组键只用主体名，勿加 fund_manager（有噪声）或 company（4232 行空值），
--      实测只用主体名时「组内出现 ≥2 个不同非空公司名」组数为 0，无跨公司误合并。
--
-- 数据说明：found_date 为 text，仅识别 YYYY-MM-DD 有效值；覆盖率约 81.8%（23174/28315）。
--   用 fd_kinds > 1 作为开关：仅当组内存在两个及以上不同有效成立日时才按日期排序。
--   这样既能严格实现「最早成立」，又避免「主份额缺日期、其他份额有日期」被误判成更晚成立。

-- ⚠️ 物化视图（2026-11-09）：普通视图做 count=exact / 全量扫描会触发
--    57014 statement_timeout（DISTINCT ON + regexp 全表排序），无法给出精确总数。
--    每次生产表切换后由 scripts/promote_staging.py 的 [2.2] 步 REFRESH。
DROP MATERIALIZED VIEW IF EXISTS public.fund_scores_main;
CREATE MATERIALIZED VIEW public.fund_scores_main AS
WITH stat AS (
  SELECT
    regexp_replace(
      regexp_replace(coalesce(n, ''), '\((前端|后端)\)$', ''),
      '[ABCDEFHIRTY]$', ''
    ) AS grp,
    count(DISTINCT CASE WHEN found_date ~ '^\d{4}-\d{2}-\d{2}$' THEN found_date END) AS fd_kinds
  FROM public.fund_scores
  GROUP BY 1
)
SELECT DISTINCT ON (s.grp) f.*
FROM public.fund_scores f
JOIN stat s
  ON s.grp = regexp_replace(
       regexp_replace(coalesce(f.n, ''), '\((前端|后端)\)$', ''),
       '[ABCDEFHIRTY]$', '')
ORDER BY
  s.grp,
  -- 1) 最早成立（仅组内存在不同成立日时生效；否则全为 NULL 并列，落到下一层）
  CASE WHEN s.fd_kinds > 1 AND f.found_date ~ '^\d{4}-\d{2}-\d{2}$'
       THEN f.found_date END ASC NULLS LAST,
  -- 2) 成立日并列 → A 份额优先（排除 ...A(后端) 这类变体）
  CASE WHEN f.n ~ 'A$' AND f.n !~ '\)$' THEN 0 ELSE 1 END,
  -- 3) 兜底
  CASE WHEN f.n ~ '\((前端|后端)\)$' THEN 3
       WHEN f.n ~ '[^ABCDEFHIRTY]$' THEN 1
       WHEN f.n ~ '[CDEFHIRTY]$' THEN 2
       ELSE 4 END,
  f.c;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fsm_c ON public.fund_scores_main (c);
GRANT SELECT ON public.fund_scores_main TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- 数据刷新：每日由 promote_staging.py 自动执行；手工可执行下一行
-- REFRESH MATERIALIZED VIEW public.fund_scores_main;
