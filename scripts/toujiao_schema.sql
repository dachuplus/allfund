-- 投教文章聚合表（基金公司投教基地内容聚合）
-- 由 scripts/toujiao_crawler.py（Playwright 无头渲染）定时写入；
-- 投教 tab 经边缘函数 /api/toujiao 用 anon key 只读。
create table if not exists public.toujiao_articles (
  id           bigint generated always as identity primary key,
  company_key  text    not null,
  company_name text    not null,
  title        text    not null,
  url          text    not null,
  category     text    default '',
  fetched_at   timestamptz default now()
);
create index if not exists idx_toujiao_company on public.toujiao_articles(company_key);
alter table public.toujiao_articles enable row level security;
grant select on public.toujiao_articles to anon;
drop policy if exists anon_select_toujiao on public.toujiao_articles;
create policy anon_select_toujiao on public.toujiao_articles
  for select to anon using (true);
-- 同一公司+同链接去重，便于爬虫 upsert
drop index if exists uniq_toujiao_company_url;
create unique index if not exists uniq_toujiao_company_url
  on public.toujiao_articles(company_key, url);
