#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_index_raw.py — 【第1级】指数原始数据抓取 → index_scores_raw

对齐 fund/stock 的三级流水线：raw(原始) → staging(算分) → 生产表。
本脚本只负责「把外部原始数据落库」，不做任何计算，便于断点续跑与限流分批。

⚠️ 数据源变更（2026-10-10）：原 csindex（中证官网）在云 CI IP 上被 WAF 403 拦截
（首次请求即拦，本地非云 IP 才通），导致 index_scores 卡在 10/8 无法刷新。
经实测，改用以下免费、云可达的数据源（用户已确认「用东财的数据接口」）：
  1) 成分股列表：EastMoney datacenter-web RPT_INDEX_CONSTITUENT
     （按 INDEX_CODE 裸6位精确锁定，沪深300→300条、中证白酒→17条；无 WEIGHT 列）
  2) 成分股权重：内部 stock_scores.mktcap 推导（市值加权，标准做法，免外部权重源）
  3) 指数级 PE：内部 stock_scores 汇总口径 Σmktcap / Σ(mktcap/pe_ttm)
     —— 满足「估值必须用指数级 PE」铁律（成分股 pe_ttm 加权会严重失真，
        实测沪深300 成分股加权 PE=37.32 vs 真实≈13），故必须算指数级。
  4) 指数收盘价/日期：腾讯 gtimg（仅展示用，从 EastMoney 的 INDCODE 后缀推导前缀）
  5) 估值分位：不再依赖 5 年历史（csindex 才给），改由 compute_index_scores.py
     在同池内做横截面 PE 分位（用真实指数 PE），彻底去掉 csindex 依赖。

限流/容错：
  - EastMoney datacenter 免费云可达（stock 流水线已在云验证），但仍加 --interval 留余量。
  - 每个指数：EastMoney 取成分（带分页）+ gtimg 取收盘。失败自动重试，整指数跳过不阻断。
  - 全部失败时写 /tmp/WAF_BLOCKED.flag，workflow 据此走护栏（保旧数据）。

用法：
  export SUPABASE_PAT=...
  python3 scripts/fetch_index_raw.py                 # 刷新全部 universe（默认 159 只）
  python3 scripts/fetch_index_raw.py --limit 10      # 只跑 10 只（分批/调试）
  python3 scripts/fetch_index_raw.py --interval 0.4  # 放慢速率
"""
import os
import sys
import json
import time
import argparse
import subprocess
import warnings
from datetime import date
from urllib.request import Request, urlopen

warnings.filterwarnings('ignore')

# 注意：PAT 在 main() 内 _load_env_local() 之后才确定（.env.local 可能含 SUPABASE_PAT）。
# 此处先占位，main() 开头会重新赋值；不要在此处因 PAT 为空而 sys.exit（会先于 env 加载触发）。
PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'
HDRS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}

DDL = """
CREATE TABLE IF NOT EXISTS index_scores_raw (
  code text PRIMARY KEY,
  name text,
  index_class text,
  pool text,
  assets_class text,
  cons_number int,
  close numeric,
  trade_date text,
  pe_index numeric,             -- 指数级市盈率（Σmktcap/Σ(mktcap/pe_ttm)）
  pe_pct_5y numeric,            -- 现改存「同池横截面 PE 分位」（compute 计算后回写，仅展示）
  pe_span_years int,            -- 不再使用（历史遗留列）
  cons_json jsonb,              -- [{code, weight}] 成分股权重（由 stock_scores.mktcap 推导）
  cons_date text,               -- 成分股权重日期（本次刷新日）
  fetched_at timestamptz DEFAULT now()
);
ALTER TABLE index_scores_raw ADD COLUMN IF NOT EXISTS pe_span_years int;
CREATE INDEX IF NOT EXISTS idx_index_raw_pool ON index_scores_raw(pool);

ALTER TABLE index_scores_raw ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_read_index_scores_raw ON index_scores_raw;
CREATE POLICY anon_read_index_scores_raw ON index_scores_raw
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS auth_read_index_scores_raw ON index_scores_raw;
CREATE POLICY auth_read_index_scores_raw ON index_scores_raw
  FOR SELECT TO authenticated USING (true);
"""


def pg(sql, timeout=300):
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
        raise RuntimeError(f'非 JSON 响应: {t[:200]}')
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


def num(v):
    if v is None or v == '':
        return None
    try:
        f = float(v)
        return None if __import__('math').isnan(f) else f
    except (TypeError, ValueError):
        return None


def get_json(url, timeout=20, retries=3):
    last = None
    for a in range(retries):
        try:
            req = Request(url, headers=HDRS, method='GET')
            with urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8', 'ignore'))
        except Exception as e:
            last = e
            time.sleep(1.0 + a)
    return None


def fetch_em_cons(code):
    """EastMoney 成分股列表。返回 (indcode, index_close, cons_list)。

    indcode 形如 000300.SH / 399997.SZ（用于推导 gtimg 前缀）。
    index_close = CM_CLOSE（每行一致，即指数收盘价）。
    cons_list = [{code(裸6位), name}]。
    """
    all_rows, page, pages, indcode, index_close = [], 1, 1, None, None
    while page <= pages and page <= 60:
        u = ('https://datacenter-web.eastmoney.com/api/data/v1/get'
             f'?reportName=RPT_INDEX_CONSTITUENT&columns=ALL'
             f'&filter=(INDEX_CODE=%22{code}%22)&pageNumber={page}&pageSize=1000'
             '&sortColumns=INDEX_CODE')
        d = get_json(u, timeout=20)
        if d is None:
            return None
        res = d.get('result') or {}
        pages = int(res.get('pages', 1) or 1)
        rows = res.get('data') or []
        if page == 1 and rows:
            indcode = rows[0].get('INDCODE')
            index_close = num(rows[0].get('CM_CLOSE'))
        all_rows.extend(rows)
        page += 1
    cons = []
    for r in all_rows:
        sc = (r.get('SECURITY_CODE') or '').strip()
        if sc:
            cons.append({'code': sc, 'name': (r.get('SECURITY_NAME_ABBR') or '').strip()})
    return {'indcode': indcode, 'close': index_close, 'cons': cons}


def fetch_gtimg(code, indcode):
    """腾讯 gtimg 取指数收盘价 + 日期（仅展示）。前缀由 EastMoney INDCODE 后缀推导。"""
    pref = 'sh' if (indcode or '').endswith('.SH') else 'sz'
    url = f'https://qt.gtimg.cn/q={pref}{code}'
    try:
        raw = urlopen(Request(url, headers=HDRS), timeout=15).read()
        text = raw.decode('gbk', 'ignore')
    except Exception:
        return None, None
    parts = text.split('~')
    if len(parts) < 32:
        return None, None
    close = num(parts[3])
    date_raw = parts[30] if len(parts) > 30 else ''
    tdate = None
    if date_raw and len(date_raw) >= 8:
        tdate = f'{date_raw[0:4]}-{date_raw[4:6]}-{date_raw[6:8]}'
    return close, tdate


def lit(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    _load_env_local()
    global PAT
    PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
    if not PAT:
        sys.exit('请设置环境变量 SUPABASE_PAT')
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='本次最多刷多少只（0=全部 universe）')
    ap.add_argument('--interval', type=float, default=0.35, help='每只间隔秒（默认0.35）')
    ap.add_argument('--no-gtimg', action='store_true', help='跳过 gtimg（仅用 EastMoney CM_CLOSE）')
    args = ap.parse_args()

    print('=== [1/4] 建表 + RLS ===')
    pg(DDL)
    print('  ok')

    print('=== [2/4] 读 universe（index_scores_raw 现有代码）===')
    exist = pg("SELECT code,name,index_class,pool,assets_class FROM index_scores_raw")
    if not exist:
        sys.exit('index_scores_raw 为空：请先手工写入指数代码清单（universe）后再跑。')
    universe = {r['code']: r for r in exist}
    print(f'  universe {len(universe)} 只')

    print('=== [3/4] 载入 stock_scores 市值/PE（权重与指数PE用）===')
    frows = pg("SELECT code, mktcap, pe_ttm FROM stock_scores "
               "WHERE is_st = false AND is_delisted = false AND mktcap IS NOT NULL")
    fmap = {}
    for r in frows:
        c = (r.get('code') or '').split('.')[0]
        if c:
            fmap[c] = {'mktcap': num(r.get('mktcap')), 'pe_ttm': num(r.get('pe_ttm'))}
    print(f'  stock_scores 可用 {len(fmap)} 只')

    todo = sorted(universe)
    if args.limit:
        todo = todo[:args.limit]
    print(f'  本次待刷 {len(todo)} 只\n')

    print('=== [4/4] 串行刷新（东财成分 + stock_scores 权/PE + gtimg 收盘）===')
    okc, fail, em_reachable = [], [], 0
    t0 = time.time()
    today = date.today().strftime('%Y-%m-%d')
    for i, code in enumerate(todo, 1):
        meta = universe[code]
        try:
            em = fetch_em_cons(code)
        except Exception as e:
            print(f'  [{i}/{len(todo)}] {code} 东财成分异常 {str(e)[:50]}')
            fail.append((code, 'em'))
            time.sleep(args.interval)
            continue
        if em is None:
            # 东财 API 不可达（网络/限流导致整次返回 None），不计入可达
            print(f'  [{i}/{len(todo)}] {code} 东财 API 不可达（网络/限流）')
            fail.append((code, 'em_none'))
            time.sleep(args.interval)
            continue
        em_reachable += 1
        if not em['cons']:
            print(f'  [{i}/{len(todo)}] {code} 东财返回 0 成分股（可能是债券指数）')
            fail.append((code, 'empty'))
            time.sleep(args.interval)
            continue

        # 用 stock_scores.mktcap 推导权重；用 pe_ttm 算指数级 PE
        pairs, tot_mc = [], 0.0
        for c in em['cons']:
            f = fmap.get(c['code'])
            if f and f['mktcap']:
                pairs.append({'code': c['code'], 'mktcap': f['mktcap'], 'pe_ttm': f['pe_ttm']})
                tot_mc += f['mktcap']
        if not pairs or tot_mc <= 0:
            print(f'  [{i}/{len(todo)}] {code} 成分在 stock_scores 均无市值映射')
            fail.append((code, 'unmapped'))
            time.sleep(args.interval)
            continue
        for p in pairs:
            p['weight'] = round(p['mktcap'] / tot_mc, 6)
        pe_num = sum(p['mktcap'] / p['pe_ttm'] for p in pairs
                     if p['pe_ttm'] and p['pe_ttm'] > 0)
        index_pe = tot_mc / pe_num if pe_num > 0 else None

        # 收盘价/日期
        close, tdate = (em['close'], None) if args.no_gtimg else fetch_gtimg(code, em['indcode'])
        if close is None:
            close = em['close']
        if tdate is None:
            tdate = today

        cons_json = json.dumps([{'code': p['code'], 'weight': p['weight']} for p in pairs],
                               ensure_ascii=False)
        cj = cons_json.replace("'", "''")
        pg("""INSERT INTO index_scores_raw
                (code,name,index_class,pool,assets_class,cons_number,close,trade_date,
                 pe_index,pe_pct_5y,cons_json,cons_date)
              VALUES (""" +
            ','.join([
                lit(code), lit(meta.get('name')), lit(meta.get('index_class')),
                lit(meta.get('pool')), lit(meta.get('assets_class')),
                str(len(em['cons'])), lit(close), lit(tdate),
                lit(index_pe), 'NULL',
                "'" + cj + "'::jsonb", lit(today),
            ]) + """)
            ON CONFLICT (code) DO UPDATE SET
              name=EXCLUDED.name, index_class=EXCLUDED.index_class, pool=EXCLUDED.pool,
              assets_class=EXCLUDED.assets_class, cons_number=EXCLUDED.cons_number,
              close=EXCLUDED.close, trade_date=EXCLUDED.trade_date,
              pe_index=EXCLUDED.pe_index, pe_pct_5y=EXCLUDED.pe_pct_5y,
              cons_json=EXCLUDED.cons_json, cons_date=EXCLUDED.cons_date,
              fetched_at=now();""")
        okc.append(code)
        print(f'  [{i}/{len(todo)}] {code} {(meta.get("name") or "")[:10]:12s} '
              f'成分{len(em["cons"]):5d} 命中{len(pairs):5d} PE={index_pe if index_pe is None else round(index_pe,2)} '
              f'收盘={close} {tdate}')

        if i % 20 == 0 or i == len(todo):
            print(f'    —— 进度 {len(okc)}/{len(todo)}（{time.time()-t0:.0f}s）')
        time.sleep(args.interval)

    print(f'\n成功 {len(okc)} / 失败 {len(fail)}，耗时 {time.time()-t0:.0f}s'
          f'（平均 {round((time.time()-t0)/max(1,len(todo)),2)}s/只）')
    if fail:
        print(f'失败清单: {fail[:20]}')
    if not okc and em_reachable == 0:
        # 东财整体不可达（非个别指数无成分）→ 写 flag，workflow 走护栏保旧数据
        open('/tmp/WAF_BLOCKED.flag', 'w').write('eastmoney_unreachable')
        print('⚠️ 东财整体不可达，已写 /tmp/WAF_BLOCKED.flag（workflow 将保旧数据）')
    stat = pg("SELECT count(*) AS n, count(pe_index) AS pe_n, max(trade_date) AS d "
              "FROM index_scores_raw")
    print('库内现状:', json.dumps(stat[0] if stat else {}, ensure_ascii=False))
    print('\n完成。下一步：python3 scripts/compute_index_scores.py')


if __name__ == '__main__':
    main()
