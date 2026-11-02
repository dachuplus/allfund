#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
投教内容聚合爬虫（定时任务，方案④核心）
- 用 Playwright 无头浏览器渲染各基金公司「投教基地」站点（兼容 SPA / SSR）
- 提取页面中的文章标题+跳转链接（同域、中文标题、过滤导航/页脚噪音）
- upsert 进 Supabase 表 toujiao_articles，供边缘函数 /api/toujiao 只读展示

运行：
  pip install playwright requests && playwright install chromium
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [SUPABASE_PAT=...] \
      python3 scripts/toujiao_crawler.py [--limit N] [--start K] [--company domain]

环境变量：
  SUPABASE_URL                 默认 https://tqhtegazxykkqfcpejky.supabase.co
  SUPABASE_SERVICE_ROLE_KEY    写库用（service_role，跳过 RLS）
  SUPABASE_PAT                 （可选）Management API PAT，用于自动建表
  TOUJIAO_MAX_PER_COMPANY      每家公司保留条数，默认 40
"""
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
COMPANIES = json.load(open(os.path.join(HERE, "toujiao_companies.json"), encoding="utf-8"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tqhtegazxykkqfcpejky.supabase.co")
SUPABASE_REF = "tqhtegazxykkqfcpejky"
# 仅用 Management API PAT 写库（与现有流水线一致，避免引入 service_role 新密钥）
PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
MAX_PER = int(os.environ.get("TOUJIAO_MAX_PER_COMPANY", "40"))

NAV_NOISE = re.compile(
    r"(登录|注册|首页|关于我们|关于|联系我们|联系方式|隐私|版权|友情链接|设为首页|"
    r"收藏|下载APP|手机|客服|免责|免责声明|备案|招贤|招聘|加入我们|新浪|微博|微信|"
    r"English|EN$|地图|站点|反馈|投诉|RSS|订阅)"
)
HAN = re.compile(r"[一-鿿]")


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def run_sql(sql):
    """经 Management API 执行 SQL（建表 / 写数据），仅依赖 PAT。"""
    import requests
    r = requests.post(
        f"https://api.supabase.com/v1/projects/{SUPABASE_REF}/database/query",
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"},
        json={"query": sql}, timeout=60,
    )
    return r


def ensure_table():
    if not PAT:
        log("（无 SUPABASE_PAT/MGMT_TOKEN，跳过自动建表；请确保 toujiao_articles 已存在）")
        return
    try:
        import requests  # noqa
    except ImportError:
        return
    sql = open(os.path.join(HERE, "toujiao_schema.sql"), encoding="utf-8").read()
    for stmt in sql.split(";"):
        s = stmt.strip()
        if not s:
            continue
        r = run_sql(s)
        if r.status_code >= 400:
            log("  schema stmt ->", r.status_code, r.text[:160])


def extract_links(page, base_host):
    try:
        anchors = page.eval_on_selector_all(
            "a",
            """els => els.map(a => ({t:(a.innerText||'').replace(/\\s+/g,' ').trim(),
                                     h:a.getAttribute('href')||''}))""",
        )
    except Exception:
        return []
    items, seen = [], set()
    for a in anchors:
        t, h = a.get("t", ""), a.get("h", "")
        if not t or not (6 <= len(t) <= 60) or not HAN.search(t):
            continue
        if NAV_NOISE.search(t):
            continue
        if not h.startswith("http"):
            continue
        uh = urlparse(h)
        if uh.netloc != base_host and base_host.split(".")[-2] not in uh.netloc:
            continue
        if h in seen:
            continue
        seen.add(h)
        items.append({"title": t, "url": h})
        if len(items) >= MAX_PER:
            break
    return items


def crawl_one(browser, c):
    key, url = c["domain"], c["edu"]
    host = urlparse(url).netloc
    try:
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=25000)
        try:
            page.wait_for_load_state("networkidle", timeout=9000)
        except Exception:
            pass
        page.wait_for_timeout(1500)
        links = extract_links(page, host)
        ctx.close()
        return key, c["name"], links
    except Exception as e:
        return key, c["name"], []


def _esc(s):
    return str(s).replace("'", "''").replace("\\", "\\\\")


def upsert(company_key, company_name, links):
    if not PAT:
        log(f"  [skip-write] {company_key} 获取到 {len(links)} 条（无 PAT，未写库）")
        return
    # 先清旧，再插入（同一公司最新一期的文章集）
    sql = f"DELETE FROM toujiao_articles WHERE company_key='{_esc(company_key)}';"
    if links:
        vals = ", ".join(
            f"('{_esc(company_key)}','{_esc(company_name)}','{_esc(l['title'])}','{_esc(l['url'])}','')"
            for l in links
        )
        sql += (
            f"INSERT INTO toujiao_articles(company_key,company_name,title,url,category) "
            f"VALUES {vals};"
        )
    r = run_sql(sql)
    log(f"  upsert {company_key} ({company_name}) {len(links)} 条 -> HTTP {r.status_code}")
    if r.status_code >= 400:
        log("    ", r.text[:200])


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=len(COMPANIES))
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--company", type=str, default=None, help="只爬指定 domain")
    args = ap.parse_args()

    ensure_table()

    targets = COMPANIES
    if args.company:
        targets = [c for c in COMPANIES if c["domain"] == args.company]
    else:
        targets = targets[args.start: args.start + args.limit]

    log(f"待爬公司 {len(targets)} 家（总计 {len(COMPANIES)}）")
    from playwright.sync_api import sync_playwright

    ok = fail = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for i, c in enumerate(targets, 1):
            log(f"[{i}/{len(targets)}] {c['name']} ({c['domain']}) -> {c['edu']}")
            key, name, links = crawl_one(browser, c)
            if links:
                ok += 1
            else:
                fail += 1
            upsert(key, name, links)
        browser.close()
    log(f"完成：成功提取 {ok} 家，无内容/不可达 {fail} 家。")


if __name__ == "__main__":
    main()
