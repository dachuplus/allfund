-- 资讯聚合：SPA 站点缓存表
-- 由 scripts/news_spa_crawler.py（定时 Playwright 渲染）写入，边缘函数 /api/news 只读展示。
-- 适用：纯前端渲染（Vue/Umi SPA）、静态 HTML 无文章列表、又无公开数据接口的资讯源（如搜狐 xtopic）。

CREATE TABLE IF NOT EXISTS public.news_spa_cache (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key    text NOT NULL,
  source_name   text NOT NULL,
  title         text NOT NULL,
  url           text NOT NULL,
  category      text DEFAULT '',
  published_at  timestamptz,
  fetched_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_spa_cache_source ON public.news_spa_cache (source_key);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_news_spa_cache_src_url ON public.news_spa_cache (source_key, url);

ALTER TABLE public.news_spa_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS news_spa_cache_anon_select ON public.news_spa_cache;
CREATE POLICY news_spa_cache_anon_select ON public.news_spa_cache
  FOR SELECT TO anon USING (true);
