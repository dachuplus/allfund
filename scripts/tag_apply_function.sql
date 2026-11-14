-- tag_apply_function.sql
-- 标签数据「统一落地」数据库函数（2026-11-14 架构改造）
--
-- 背景：旧链路是「TRUNCATE 正式表 → 分批 INSERT → UPDATE fund_scores SET tags=NULL
--        → 聚合回填」，正式表与 fund_scores.tags 会有对前端可见的空窗期；
--        promote_staging.py [2.5] 也会分步清空/重贴，两边并发会互相清空。
--        过去靠把每日同步排在北京 05:00 错开 21:30 评分流水线来规避，属于调度层兜底，
--        不是架构上消除中间态。
--
-- 现在：抓取全程只写 public.fund_tag_funds_staging；全部拉完并校验通过后，
--       由本函数在【单个数据库事务】内一次性完成：
--         ① 正式表 fund_tag_funds 替换（TRUNCATE + INSERT FROM staging）
--         ② fund_scores.tags / has_concept / has_industry 全量重算
--         ③ REFRESH MATERIALIZED VIEW public.fund_scores_main
--       事务提交前，外部会话看到的始终是旧快照，不存在「表已清空、标签还没贴」的中间态。
--
-- 并发：函数一开始拿 pg_advisory_xact_lock(847261935001)，评分流水线
--       promote_staging.py [2.5] 也调用同一函数（p_from_staging=false），
--       两处对 tags 的写入被同一把事务级锁串行化。锁在事务提交/回滚时自动释放，
--       不依赖调度时间、也不依赖 session 连接（Management API 每次请求可能换连接）。
--
-- 调用方：
--   scripts/sync_tag_funds_full.py  → SELECT public.apply_fund_tag_funds(true);
--   scripts/promote_staging.py [2.5] → SELECT public.apply_fund_tag_funds(false);
-- 本文件由 sync_tag_funds_full.py 每次运行幂等执行（CREATE OR REPLACE），是函数真源。

CREATE OR REPLACE FUNCTION public.apply_fund_tag_funds(p_from_staging boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_prev_rows  bigint;
  v_prev_funds bigint;
  v_rows       bigint;
  v_funds      bigint;
  v_tags       bigint;
  v_tagged     bigint;
BEGIN
  -- 与评分流水线 [2.5] 共用同一把事务级 advisory lock：所有对 fund_scores.tags 的
  -- 写入串行执行，杜绝「A 清空 → B 清空 → A 贴 → B 贴」式的互相清空。
  PERFORM pg_advisory_xact_lock(847261935001);

  SELECT count(*), count(DISTINCT fund_code)
    INTO v_prev_rows, v_prev_funds
    FROM public.fund_tag_funds;

  IF p_from_staging THEN
    IF to_regclass('public.fund_tag_funds_staging') IS NULL THEN
      RAISE EXCEPTION 'fund_tag_funds_staging 不存在，拒绝落地';
    END IF;

    SELECT count(*), count(DISTINCT fund_code), count(DISTINCT tag_name)
      INTO v_rows, v_funds, v_tags
      FROM public.fund_tag_funds_staging;

    -- 函数内二次护栏：即使有人绕过 Python 包装器直接调用，也不会用半成品覆盖生产数据。
    IF v_rows = 0 OR v_funds = 0 OR v_tags < 100 THEN
      RAISE EXCEPTION 'staging 数据不完整: rows=%, funds=%, tags=%', v_rows, v_funds, v_tags;
    END IF;
    IF v_prev_rows > 0 AND (v_rows < v_prev_rows * 0.9 OR v_funds < v_prev_funds * 0.9) THEN
      RAISE EXCEPTION 'staging 不足旧值 90%%: rows %/%, funds %/%',
        v_rows, v_prev_rows, v_funds, v_prev_funds;
    END IF;

    -- ① 正式表一次性替换（TRUNCATE 不重置 id 序列，INSERT 不指定 id）
    TRUNCATE TABLE public.fund_tag_funds;
    INSERT INTO public.fund_tag_funds
      (tag_name, tag_index_code, fund_code, fund_name, fund_type,
       syl_1n, syl_d, relation, sort_order, updated_at, fund_manager)
    SELECT tag_name, tag_index_code, fund_code, fund_name, fund_type,
           syl_1n, syl_d, relation, sort_order, now(), fund_manager
      FROM public.fund_tag_funds_staging;
  ELSE
    v_rows := v_prev_rows;
    v_funds := v_prev_funds;
    SELECT count(DISTINCT tag_name) INTO v_tags FROM public.fund_tag_funds;
    -- 评分流水线只是「把标签重新贴回切换后的 fund_scores」；若正式表被意外清空，
    -- 宁可报错保留旧 tags，也不能把全站标签抹掉。
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'fund_tag_funds 为空，拒绝清空 fund_scores.tags';
    END IF;
  END IF;

  -- 列缺失才 DDL：常态下不取 fund_scores 的 AccessExclusiveLock。
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'fund_scores'
                   AND column_name = 'tags') THEN
    EXECUTE 'ALTER TABLE public.fund_scores ADD COLUMN tags text[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'fund_scores'
                   AND column_name = 'has_concept') THEN
    EXECUTE 'ALTER TABLE public.fund_scores ADD COLUMN has_concept boolean';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'fund_scores'
                   AND column_name = 'has_industry') THEN
    EXECUTE 'ALTER TABLE public.fund_scores ADD COLUMN has_industry boolean';
  END IF;

  -- ② 全量重算：两步 UPDATE 在同一事务内，外部读者只能看到提交前/提交后两种状态。
  --    先整体复位，再把聚合结果一次性贴回；未命中的基金保持「无标签 + false」。
  UPDATE public.fund_scores
     SET tags = NULL, has_concept = false, has_industry = false;

  UPDATE public.fund_scores fs
     SET tags = sub.tags,
         has_concept = COALESCE(sub.has_concept, false),
         has_industry = COALESCE(sub.has_industry, false)
    FROM (
      SELECT tf.fund_code,
             array_agg(DISTINCT tf.tag_name) AS tags,
             bool_or(ft.tag_type = 'concept')  AS has_concept,
             bool_or(ft.tag_type = 'industry') AS has_industry
        FROM public.fund_tag_funds tf
        LEFT JOIN public.fund_tags ft ON ft.name = tf.tag_name
       GROUP BY tf.fund_code
    ) sub
   WHERE fs.c = sub.fund_code OR fs.c = sub.fund_code || '.OF';

  SELECT count(*) INTO v_tagged FROM public.fund_scores WHERE tags IS NOT NULL;

  -- ③ 物化视图是创建时快照，必须在同一事务里刷新，否则主代码列表的 tags 会停在旧快照。
  EXECUTE 'REFRESH MATERIALIZED VIEW public.fund_scores_main';

  RETURN jsonb_build_object(
    'from_staging', p_from_staging,
    'mappings', v_rows,
    'funds', v_funds,
    'tags', v_tags,
    'tagged', v_tagged,
    'applied_at', now()
  );
END
$fn$;
