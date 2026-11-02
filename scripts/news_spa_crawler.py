#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
资讯聚合 — SPA 站点爬虫（定时任务）
- 用 Playwright 无头浏览器渲染纯前端(SPA)资讯站点，提取文章标题+跳转链接
- upsert 进 Supabase 表 news_spa_cache，供边缘函数 /api/news 只读展示

与 scripts/toujiao_crawler.py 同方案（基金公司投教聚合已验证可行）。
当前覆盖：搜狐娱乐 xtopic（Vue SPA，无 SSR/公开接口）。

运行：
  pip install playwright requests && playwright install chromium
  SUPABASE_PAT=<PAT> [SUPABASE_MGMT_TOKEN=<PAT>] \
      python3 scripts/news_spa_crawler.py [--source sohu]

环境变量：
  SUPABASE_URL          默认 https://tqhtegazxykkqfcpejky.supabase.co
  SUPABASE_PAT          写库用 Management API PAT（与现有流水线一致，避免引入 service_role 新密钥）
  NEWS_SPA_MAX_PER      每源保留条数，默认 40
"""
import json
import os
import re
import time

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tqhtegazxykkqfcpejky.supabase.co")
SUPABASE_REF = "tqhtegazxykkqfcpejky"
PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
MAX_PER = int(os.environ.get("NEWS_SPA_MAX_PER", "40"))

# SPA 资讯源配置（按 key 索引；后续可在此追加其它 SPA 源）
SOURCES = [
    {
        "key": "sohu",
        "name": "搜狐娱乐",
        "url": "https://www.sohu.com/xtopic/TURBd05EYzNORGd5",
    },
]

NAV_NOISE = re.compile(
    r"(登录|注册|首页|关于我们|关于|联系我们|联系方式|隐私|版权|友情链接|设为首页|"
    r"收藏|下载APP|手机|客服|免责|免责声明|备案|招贤|招聘|加入我们|微博|微信|"
    r"English|EN$|地图|站点|反馈|投诉|RSS|订阅|客户端|APP|更多|视频)"
)
HAN = re.compile(r"[一-鿿]")


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def run_sql(sql):
    import requests
    r = requests.post(
        f"https://api.supabase.com/v1/projects/{SUPABASE_REF}/database/query",
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"},
        json={"query": sql}, timeout=60,
    )
    return r


def ensure_table():
    if not PAT:
        log("（无 SUPABASE_PAT/MGMT_TOKEN，跳过自动建表；请确保 news_spa_cache 已存在）")
        return
    try:
        import requests  # noqa
    except ImportError:
        return
    here = os.path.dirname(os.path.abspath(__file__))
    sql = open(os.path.join(here, "news_spa_schema.sql"), encoding="utf-8").read()
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
        from urllib.parse import urlparse
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
    from urllib.parse import urlparse
    key, url = c["key"], c["url"]
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


def upsert(source_key, source_name, links):
    if not PAT:
        log(f"  [skip-write] {source_key} 获取到 {len(links)} 条（无 PAT，未写库）")
        return
    sql = f"DELETE FROM news_spa_cache WHERE source_key='{_esc(source_key)}';"
    if links:
        vals = ", ".join(
            f"('{_esc(source_key)}','{_esc(source_name)}','{_esc(l['title'])}','{_esc(l['url'])}','')"
            for l in links
        )
        sql += (
            f"INSERT INTO news_spa_cache(source_key,source_name,title,url,category) "
            f"VALUES {vals};"
        )
    r = run_sql(sql)
    log(f"  upsert {source_key} ({source_name}) {len(links)} 条 -> HTTP {r.status_code}")
    if r.status_code >= 400:
        log("    ", r.text[:200])


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=str, default=None, help="只爬指定 source_key")
    args = ap.parse_args()

    ensure_table()

    targets = SOURCES
    if args.source:
        targets = [c for c in SOURCES if c["key"] == args.source]
    if not targets:
        log("无匹配源，退出")
        return

    log(f"待爬源 {len(targets)} 个")
    from playwright.sync_api import sync_playwright

    ok = fail = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for i, c in enumerate(targets, 1):
            log(f"[{i}/{len(targets)}] {c['name']} ({c['key']}) -> {c['url']}")
            key, name, links = crawl_one(browser, c)
            if links:
                ok += 1
            else:
                fail += 1
            upsert(key, name, links)
        browser.close()
    log(f"完成：成功提取 {ok} 个源，无内容/不可达 {fail} 个。")


if __name__ == "__main__":
    main()
