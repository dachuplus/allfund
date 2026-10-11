#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_tougu_products.py — 每日自动更新投顾产品数据（tougu_products）

数据源（按优先级尝试，两条通路都保留）：
  1) 天天基金投顾管家公开列表接口
     https://api.fund.eastmoney.com/WJLC/GSRankList?...&pageSize=200
  2) 天天基金投顾管家网页（服务端渲染列表，正则解析）
     https://fund.eastmoney.com/tg/

⚠️ 2026-10-11 实测结论（重要，避免后人重复排查）：
   - fund.eastmoney.com/tg/ 现为 18KB 空壳，页面内不含任何产品区块
     （info-desc / info-tag / list-title / data-id 命中数均为 0），
     搜索引擎收录的「华夏权益优选组合 / 中欧超级股票全明星 …」为历史快照。
   - api.fund.eastmoney.com/WJLC/GSRankList 接口存活（ErrCode=0）但 TotalCount=0、Data=[]。
   - 蛋卷 danjuanfunds.com、好买 howbuy 等仅提供「单组合」接口（需组合代码），
     无公开「投顾产品列表」接口；本库 103 条产品均无组合代码，无法调用。
   => 因此当前每日任务会走「无新数据」护栏分支：保留上一次已入库数据，不覆盖。
      平台恢复公开数据后，本脚本无需改代码即可自动生效。

护栏（最高风控：宁空不假 / 不破坏已有数据）：
  - 两路都抓到 0 条，或请求/解析异常：不写库、不清表，保留生产表现有数据，exit 0（不阻断 CI）
  - 抓到数据：写 staging → 校验（条数 ≥ 30、名称非空率 ≥ 95%、收益字段不全空）
    → 校验通过才原子切换到生产表；不通过则保留旧数据

环境变量：SUPABASE_PAT（或 SUPABASE_MGMT_TOKEN）
"""
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

# CI 仅配置 SUPABASE_MGMT_TOKEN，脚本两种命名都兼容
if not os.environ.get('SUPABASE_PAT') and os.environ.get('SUPABASE_MGMT_TOKEN'):
    os.environ['SUPABASE_PAT'] = os.environ['SUPABASE_MGMT_TOKEN']

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _pgsql import pg  # noqa: E402

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')

API_URL = ('https://api.fund.eastmoney.com/WJLC/GSRankList'
           '?tzqx=0&cplx=0&minsg=0&qxdate=0&orderType=0&pageIndex=1&pageSize=200')
PAGE_URL = 'https://fund.eastmoney.com/tg/'

# 分类关键词（与前端/历史口径一致）
STABLE_KEYS = ('固收', '债券', '低波', '稳健', '货币', '理财')
PENSION_KEYS = ('养老', '90后', '80后', '70后', '60后')

MIN_ROWS = 30           # 校验下限：低于此条数视为抓取异常，不覆盖生产表
MIN_NAME_RATE = 0.95    # 名称非空率下限


def http_get(url, referer, timeout=20):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Referer': referer,
        'Accept': '*/*',
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='ignore')


def get_any(d, keys):
    """字段容错：不同版本接口字段名不一致，逐个候选尝试"""
    for k in keys:
        v = d.get(k)
        if v not in (None, '', [], {}):
            return v
    return None


def classify(name, desc, raw_type=None):
    """返回 (type, typename)"""
    if raw_type:
        rt = str(raw_type)
        if '稳健' in rt or '固收' in rt:
            return 'stable', '稳健理财'
        if '养老' in rt:
            return 'pension', '养老储蓄'
        if '高收益' in rt or '权益' in rt:
            return 'high', '追求高收益'
    text = f'{name} {desc}'
    if any(k in text for k in PENSION_KEYS):
        return 'pension', '养老储蓄'
    if any(k in text for k in STABLE_KEYS):
        return 'stable', '稳健理财'
    return 'high', '追求高收益'


def to_pct(v):
    """统一成小数：接口可能给 14.82(%) 或 0.1482"""
    if v is None:
        return None
    try:
        f = float(str(v).replace('%', '').strip())
    except (TypeError, ValueError):
        return None
    if f == 0:
        return 0.0
    # 绝对值 > 1.5 视为百分数（投顾收益极少出现 >150% 的小数形态）
    return round(f / 100, 6) if abs(f) > 1.5 else round(f, 6)


def fetch_from_api():
    """通路1：天天基金投顾管家列表接口"""
    try:
        raw = http_get(API_URL, 'https://fund.eastmoney.com/tg/')
        obj = json.loads(raw)
        rows = obj.get('Data') or []
        print(f'[API] TotalCount={obj.get("TotalCount")}, Data={len(rows)}')
        out = []
        for r in rows:
            name = get_any(r, ['Name', 'name', 'CPMC', 'Title', 'ShortName'])
            if not name:
                continue
            company = get_any(r, ['Company', 'company', 'JJGS', 'OrgName', 'Manager']) or ''
            desc = get_any(r, ['Desc', 'desc', 'Strategy', 'Remark']) or ''
            t, tn = classify(str(name), str(desc), get_any(r, ['TypeName', 'typename', 'CPLX']))
            out.append({
                'name': str(name).strip(),
                'company': str(company).strip(),
                'type': t,
                'typename': tn,
                'desc': str(desc).strip(),
                'tags': [],
                'return3m': to_pct(get_any(r, ['R3M', 'Return3M', 'Syl3M', 'r3m'])),
                'return1y': to_pct(get_any(r, ['R1Y', 'Return1Y', 'Syl1Y', 'r1y'])),
                'maxdrawdown': to_pct(get_any(r, ['MaxDrawDown', 'maxdrawdown', 'MDD'])),
                'url': str(get_any(r, ['Url', 'url', 'DetailUrl']) or '').strip(),
            })
        return out
    except Exception as e:
        print(f'[API] 抓取失败: {e}')
        return []


def fetch_from_page():
    """通路2：天天基金投顾管家网页（服务端渲染）"""
    try:
        html = http_get(PAGE_URL, 'https://fund.eastmoney.com/')
        print(f'[PAGE] HTML {len(html)} 字节')
        if 'info-desc' not in html and 'info-tag' not in html:
            print('[PAGE] 页面无产品区块（平台已下线网页端列表）')
            return []
        out = []
        sections = re.split(r'<div class="list-title"[^>]*>', html)
        for sec in sections[1:]:
            h3 = re.search(r'<h3>([^<]+)', sec)
            category = h3.group(1).strip() if h3 else ''
            for row in re.findall(r'<tr[^>]*>(.*?)</tr>', sec, re.DOTALL):
                title = re.search(r'data-id="([^"]+)">([^<]+)<span class="info-tag">([^<]+)', row)
                if not title:
                    continue
                name = title.group(2).strip()
                company = title.group(3).strip().replace('出品', '')
                d = re.search(r'<p class="info-desc">(.*?)</p>', row)
                desc = d.group(1).strip() if d else ''
                syls = re.findall(
                    r'<p class="syl (?:red|green)?">([-\d.]+)%</p>\s*<p class="syl-desc">(.*?)</p>',
                    row, re.DOTALL)
                rd = {}
                for val, period in syls:
                    rd[period.strip()] = float(val)
                mdd = None
                m = re.search(r'回撤.*?(\d+(?:\.\d+)?)%', desc)
                if m:
                    mdd = -abs(float(m.group(1))) / 100
                t, tn = classify(name, desc, category)
                out.append({
                    'name': name, 'company': company, 'type': t, 'typename': tn,
                    'desc': desc, 'tags': [],
                    'return3m': round(rd['近3月'] / 100, 6) if '近3月' in rd else None,
                    'return1y': round(rd['近1年'] / 100, 6) if '近1年' in rd else None,
                    'maxdrawdown': mdd, 'url': '',
                })
        return out
    except Exception as e:
        print(f'[PAGE] 抓取失败: {e}')
        return []


def esc(v):
    if v is None:
        return 'NULL'
    s = str(v).replace("'", "''")
    return f"'{s}'"


def num_sql(v):
    return 'NULL' if v is None else str(v)


def tags_sql(tags):
    if not tags:
        return 'NULL'
    items = ','.join(esc(t) for t in tags)
    return f'ARRAY[{items}]::text[]'


def main():
    today = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d')
    print(f'=== 投顾产品每日更新 {today} ===')

    products = fetch_from_api()
    if not products:
        products = fetch_from_page()

    if not products:
        # 护栏：无新数据 → 保留生产表现有数据，任务成功退出（不阻断 CI）
        try:
            rows = pg('SELECT count(*) AS n, max(updatedate) AS d FROM tougu_products')
            n = rows[0]['n'] if rows else 0
            d = rows[0]['d'] if rows else ''
            print(f'[SKIP] 数据源无新数据，保留现有 {n} 条（数据截止 {d}）')
        except Exception as e:
            print(f'[SKIP] 数据源无新数据（读取现有条数失败: {e}）')
        return 0

    named = [p for p in products if p.get('name')]
    if len(named) < MIN_ROWS or len(named) / max(len(products), 1) < MIN_NAME_RATE:
        print(f'[ABORT] 校验未通过：总条数 {len(products)}，有效命名 {len(named)}，保留现有数据')
        return 0

    # 写 staging
    pg('CREATE TABLE IF NOT EXISTS tougu_products_staging (LIKE tougu_products INCLUDING ALL)')
    pg('TRUNCATE TABLE tougu_products_staging')
    for i in range(0, len(named), 50):
        chunk = named[i:i + 50]
        values = ',\n'.join(
            "({name}, {company}, {type}, {typename}, {desc}, {tags}, {r3m}, {r1y}, {mdd}, {url}, {ud}, {ds})".format(
                name=esc(p['name']),
                company=esc(p['company']),
                type=esc(p['type']),
                typename=esc(p['typename']),
                desc=esc(p['desc']),
                tags=tags_sql(p.get('tags')),
                r3m=num_sql(p.get('return3m')),
                r1y=num_sql(p.get('return1y')),
                mdd=num_sql(p.get('maxdrawdown')),
                url=esc(p.get('url') or ''),
                ud=esc(today),
                ds=esc('天天基金'),
            ) for p in chunk
        )
        pg('INSERT INTO tougu_products_staging '
           '(name, company, type, typename, "desc", tags, return3m, return1y, maxdrawdown, url, updatedate, datasource) '
           f'VALUES\n{values}')

    # 校验 staging
    rows = pg('SELECT count(*) AS n FROM tougu_products_staging WHERE name IS NOT NULL AND name <> \'\'')
    n_ok = rows[0]['n'] if rows else 0
    rows = pg('SELECT count(*) AS n FROM tougu_products_staging WHERE return1y IS NOT NULL')
    n_ret = rows[0]['n'] if rows else 0
    print(f'[CHECK] staging 有效条数 {n_ok}，含近1年收益 {n_ret}')
    if n_ok < MIN_ROWS or n_ret == 0:
        print('[ABORT] staging 校验未通过，保留现有生产表数据')
        return 0

    # 原子切换：DELETE + INSERT 放在同一条请求内（Management API 单次请求为同一事务），
    # 避免分成两次请求时中途失败导致生产表被清空
    pg('DELETE FROM tougu_products; '
       'INSERT INTO tougu_products '
       '(name, company, type, typename, "desc", tags, return3m, return1y, maxdrawdown, url, updatedate, datasource) '
       'SELECT name, company, type, typename, "desc", tags, return3m, return1y, maxdrawdown, url, updatedate, datasource '
       'FROM tougu_products_staging;')
    rows = pg('SELECT count(*) AS n FROM tougu_products')
    print(f'[OK] 已更新生产表，共 {rows[0]["n"] if rows else 0} 条')
    return 0


if __name__ == '__main__':
    sys.exit(main())
