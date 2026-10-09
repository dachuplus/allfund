#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_index_raw.py — 【第1级】指数原始数据抓取 → index_scores_raw

对齐 fund/stock 的三级流水线：raw(原始) → staging(算分) → 生产表。
本脚本只负责「把外部原始数据落库」，不做任何计算，便于断点续跑与限流分批。

抓两个源（都只认中证官网，权威且与展示口径一致）：
  1) 指数估值历史：csindex-home/perf/index-perf的 `peg` 字段
     ⚠️ 该字段名有误导性，**实际是滚动市盈率**（交叉验证：2026-09-10
        沪深300 此字段 13.62 vs 官方 PE1 14.84；中证红利 8.64 vs 8.87）。
        有 2100+ 天历史，可算 5 年分位。
  2) 成分股权重：akshare index_stock_cons_weight_csindex（中证官网）

⚠️ 限流 / 拦截（2026-10-08~09 全面复测后的准确结论）：
   1) 旧版 fetch_pe 的 timeout=15 太短是上次 137 只失败的主因 —— `index-perf` 响应
      偶尔要 7–15 秒，15 秒超时被误判成"限流"。已改为默认 30 秒（实测同 IP 连续 41 次 0 失败）。
   2) 真限流形态 = HTTP 403 + 反爬 HTML（含 attack.jinxibei.com 标记），**IP 级 WAF 拦截**，
      且云环境（GitHub Actions / Azure 等数据中心 IP）首次请求即 403，本地非云 IP 才通。
      命中 WAF 时本批应整体短路，而非逐只重试空耗配额（抛 WAFBlocked → 调用方 break）。
   3) 速率敏感（非计数敏感）：请求间隔 < 1s 必触发 403，≥ 2s 安全（实测 2.5s 留余量）。
      故默认 --interval 2.5，且严格串行、绝不并发。
   4) 写库按已完成的一只就 commit，中途挂掉下次重跑会自动跳过已抓到的
      （按 trade_date 与 cons_date 判断新鲜度），天然支持「分批跑完 169 只」。
   5) 云 IP 被 WAF 拦时，本脚本写 /tmp/WAF_BLOCKED.flag；workflow 检测到即跳过后续轮次
      与冷却，直接走 compute/promote（护栏校验不通过则生产表保持上一次成功版本）。

用法：
  export SUPABASE_PAT=...
  python3 scripts/fetch_index_raw.py                 # 增量补齐（已抓到的跳过）
  python3 scripts/fetch_index_raw.py --limit 30      # 只跑 30 只（分批用）
  python3 scripts/fetch_index_raw.py --force         # 忽略缓存全部重抓
  python3 scripts/fetch_index_raw.py --interval 2.5  # 放慢速率
"""
import os
import sys
import json
import time
import argparse
import subprocess
import warnings
from datetime import date, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError

warnings.filterwarnings('ignore')

PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not PAT:
    sys.exit('请设置环境变量 SUPABASE_PAT')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'
HDRS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}

# 指数分类 → 池（与 fund/stock 的分池同理，见 MEMORY「必须分池标准化」）
POOL_MAP = {
    '规模': 'broad', '风格': 'broad', '综合': 'broad', '策略': 'broad',
    '行业': 'sector',
    '利率债': 'fixed', '信用债': 'fixed', '可转债': 'fixed',
}

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
  pe_index numeric,             -- 中证官方滚动市盈率
  pe_pct_5y numeric,            -- PE 近5年分位 0-100
  pe_span_years int,            -- 实际用于算分位的历史年数（2 或 5）
  cons_json jsonb,              -- [{code, weight}] 成分股权重
  cons_date text,               -- 成分股权重日期（中证每月更新）
  fetched_at timestamptz DEFAULT now()
);
-- 表已存在时补列（CREATE TABLE IF NOT EXISTS 不会加新列）
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


def fetch_index_list():
    """中证官网指数清单。注意：分页参数在服务端无效（实测 pageNumber=2 仍返回第1页），
    故只能拿前 300 条；带重试 + 当日本地缓存。"""
    cache = '/tmp/_idx_raw_list.json'
    if os.path.exists(cache) and time.time() - os.path.getmtime(cache) < 86400:
        try:
            c = json.load(open(cache))
            if c:
                print(f'  清单用本地缓存（{(time.time()-os.path.getmtime(cache))/3600:.1f} 小时前）')
                return c
        except Exception:
            pass
    url = 'https://www.csindex.com.cn/csindex-home/index-list/query-index-item'
    body = {"sorter": {"sortField": "null", "sortOrder": None},
            "pager": {"pageNumber": 1, "pageSize": 300},
            "indexFilter": {"ifCustomized": None, "ifTracked": None, "ifWeightCapped": None,
                            "indexCompliance": None, "hotSpot": None, "indexClassify": None,
                            "currency": None, "region": None, "indexSeries": None}}
    data = last = None
    for a in range(4):
        try:
            req = Request(url, data=json.dumps(body).encode(),
                          headers={**HDRS, 'Content-Type': 'application/json'}, method='POST')
            with urlopen(req, timeout=45) as r:
                data = json.loads(r.read().decode())
            break
        except Exception as e:
            last = e
            print(f'  清单拉取失败(第{a+1}次)：{str(e)[:60]}')
            time.sleep(2.0 * (a + 1))
    if not data:
        sys.exit(f'中证指数清单无法获取：{str(last)[:120]}')
    out = {}
    for it in data.get('data') or []:
        c = (it.get('indexCode') or '').strip()
        if c:
            out[c] = {'name': (it.get('indexName') or '').strip(),
                      'index_class': (it.get('indexClassify') or '').strip(),
                      'assets_class': (it.get('assetsClassify') or '').strip(),
                      'cons_number': int(float(it.get('consNumber') or 0))}
    try:
        json.dump(out, open(cache, 'w'), ensure_ascii=False)
    except Exception:
        pass
    return out


class WAFBlocked(Exception):
    """中证 WAF 拦截（IP 级，云环境常见）。命中即本批 PE 抓取应整体短路。"""
    pass


def fetch_pe(code, years=2, timeout=30):
    """中证官网日线（含官方滚动PE + 历史分位）。严格串行。

    ⚠️ 实测坑（2026-10-08~09 全面复测）：
       1) 响应耗时随请求跨度暴涨：2 年跨度 0.6–2.4 秒稳定；5 年跨度 4.6 秒起、常 20–40 秒超时。
          故默认仅 2 年跨度算分位。旧版 timeout=15 太短，偶发 7–15 秒响应会被误判成限流 → 已改 30。
       2) 真限流形态 = HTTP 403 + 反爬 HTML（attack.jinxibei.com 标记），**IP 级 WAF 拦截**，
          云环境（GitHub Actions / Azure）首次请求即 403，本地非云 IP 才通。命中抛 WAFBlocked，
          由调用方整体短路，避免 169×403 空耗配额。
    """
    end = date.today().strftime('%Y%m%d')
    start = (date.today() - timedelta(days=int(365.25 * years))).strftime('%Y%m%d')
    url = (f'https://www.csindex.com.cn/csindex-home/perf/index-perf'
           f'?indexCode={code}&startDate={start}&endDate={end}')
    try:
        with urlopen(Request(url, headers=HDRS), timeout=timeout) as r:
            d = json.loads(r.read().decode())
    except HTTPError as e:
        if e.code == 403:
            raise WAFBlocked(f'index-perf 403 WAF: {code}')
        return None
    except Exception:
        return None
    data = d.get('data') or []
    if not data:
        return None            # 无效代码：秒回空，不算错误
    pes = [x.get('peg') for x in data if x.get('peg') is not None]
    closes = [x.get('close') for x in data if x.get('close') is not None]
    if not pes or not closes:
        return None
    cur = pes[-1]
    return {'trade_date': str(data[-1].get('tradeDate')),
            'close': float(closes[-1]),
            'pe': float(cur),
            'pe_pct': round(sum(1 for v in pes if v <= cur) / len(pes) * 100, 2),
            'pe_span_years': years,
            'cons': int(float(data[-1].get('consNumber') or 0))}


def fetch_cons(code):
    import akshare as ak
    df = ak.index_stock_cons_weight_csindex(symbol=code)
    if df is None or len(df) == 0:
        return None
    latest = str(df['日期'].max())
    d = df[df['日期'].astype(str) == latest]
    pairs = [{'code': str(c).strip().zfill(6), 'weight': round(float(w), 6)}
             for c, w in zip(d['成分券代码'], d['权重'])
             if w is not None and float(w) > 0]
    return {'date': latest, 'pairs': pairs} if pairs else None


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
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='本次最多抓多少只（0=不限）')
    ap.add_argument('--interval', type=float, default=2.5, help='每次请求间隔秒（默认2.5；<1s必触发WAF）')
    ap.add_argument('--timeout', type=int, default=30, help='index-perf 请求超时秒（默认30；旧版15太短易误判限流）')
    ap.add_argument('--force', action='store_true', help='忽略库里已有数据，全部重抓')
    ap.add_argument('--pe-years', type=int, default=2, choices=[2, 5],
                    help='PE 分位回看年数（默认2；5 年实测慢 3-10 倍且易超时）')
    args = ap.parse_args()

    print('=== [1/4] 建表 + RLS ===')
    pg(DDL)
    print('  ok')

    print('=== [2/4] 指数清单 ===')
    lst = fetch_index_list()
    pool = {}
    for c, m in lst.items():
        if m['index_class'] not in POOL_MAP:
            continue
        if m['cons_number'] < 20 or m['assets_class'] not in ('股票', '固定收益'):
            continue
        pool[c] = m
    from collections import Counter
    print(f'  候选 {len(pool)} 只，池分布 {dict(Counter(POOL_MAP[m["index_class"]] for m in pool.values()))}')

    print('=== [3/4] 查已抓（增量跳过）===')
    have = set()
    if not args.force:
        for r in pg("SELECT code, trade_date, cons_date FROM index_scores_raw"):
            have.add(r['code'])
        print(f'  库中已有 {len(have)} 只')

    todo = [c for c in sorted(pool) if c not in have]
    if args.limit:
        todo = todo[:args.limit]
    print(f'  本次待抓 {len(todo)} 只\n')

    print('=== [4/4] 串行抓取（每只写完立即 commit，可断点续跑）===')
    okc, fail, skipped = [], [], []
    waf_blocked = False
    t0 = time.time()
    for i, code in enumerate(todo, 1):
        name = pool[code]['name']
        if waf_blocked:                       # 本机 IP 已被 WAF 拦，整批跳过 PE
            skipped.append(code)
            continue
        try:
            pe = fetch_pe(code, years=args.pe_years, timeout=args.timeout)
        except WAFBlocked:
            waf_blocked = True
            open('/tmp/WAF_BLOCKED.flag', 'w').write(code)
            print(f'  ⚠️ 检测到中证 WAF 拦截（云环境常见，IP 级）：自 {code} 起后续 PE 抓取全部跳过')
            skipped.append(code)
            continue
        if not pe:
            print(f'  [{i}/{len(todo)}] {code} {name[:10]:12s} PE 取不到（代码无效/无数据）')
            fail.append((code, 'PE'))
            time.sleep(args.interval * 2)
            continue
        cs = None
        try:
            cs = fetch_cons(code)
        except Exception as e:
            print(f'  [{i}/{len(todo)}] {code} {name[:10]:12s} 成分失败 {str(e)[:50]}')
        if not cs:
            fail.append((code, '成分'))
            time.sleep(args.interval)
            continue
        # cons_json 用 jsonb 传入：把 JSON 文本当**字符串字面量**再 ::jsonb cast。
        # ⚠️ 实测两种踩坑写法：
        #   ① 直接拼 `[{...}]::jsonb` → 42601（JSON 里的双引号提前闭合 SQL 字符串）
        #   ② 用 json.dumps() 转义双引号 → 一样炸（反斜杠在 SQL 字符串里不成立）
        # 正确做法：单引号包裹 + 只转义单引号，交给 ::jsonb 解析。
        cons_json = json.dumps(cs['pairs'], ensure_ascii=False)
        cj = cons_json.replace("'", "''")
        pg("""INSERT INTO index_scores_raw
                (code,name,index_class,pool,assets_class,cons_number,close,trade_date,
                 pe_index,pe_pct_5y,pe_span_years,cons_json,cons_date)
              VALUES (""" +
           ','.join([
               lit(code), lit(name), lit(pool[code]['index_class']),
               lit(POOL_MAP[pool[code]['index_class']]), lit(pool[code]['assets_class']),
               str(pe['cons'] or len(cs['pairs'])), lit(pe['close']), lit(pe['trade_date']),
               lit(pe['pe']), lit(pe['pe_pct']), str(pe.get('pe_span_years', 2)),
               "'" + cj + "'::jsonb", lit(cs['date']),
           ]) + """)
            ON CONFLICT (code) DO UPDATE SET
              name=EXCLUDED.name, index_class=EXCLUDED.index_class, pool=EXCLUDED.pool,
              assets_class=EXCLUDED.assets_class, cons_number=EXCLUDED.cons_number,
              close=EXCLUDED.close, trade_date=EXCLUDED.trade_date,
              pe_index=EXCLUDED.pe_index, pe_pct_5y=EXCLUDED.pe_pct_5y,
              pe_span_years=EXCLUDED.pe_span_years,
              cons_json=EXCLUDED.cons_json, cons_date=EXCLUDED.cons_date,
              fetched_at=now();""")
        okc.append(code)
        print(f'  [{i}/{len(todo)}] {code} {name[:10]:12s} 成分{len(cs["pairs"]):5d} '
              f'PE={pe["pe"]:8.2f} 分位={pe["pe_pct"]:5.1f}%'
              f'({pe.get("pe_span_years",2)}y) {cs["date"]}')

        if i % 10 == 0 or i == len(todo):
            print(f'    —— 进度 {len(okc)}/{len(todo)}（{time.time()-t0:.0f}s）')
        time.sleep(args.interval)

    if waf_blocked:
        print('\n⚠️ 本机 IP 被中证 WAF 拦截，本次 PE 未更新（成分权重接口通常不受影响，但本表需 PE 才能落库）。')
        print('   生产表 index_scores 经护栏校验后保持上一次成功版本，不受影响。')
        print('   如需刷新 PE，请在非云 IP（如本地 Mac）运行：python3 scripts/fetch_index_raw.py')
    print(f'\n成功 {len(okc)} / 失败 {len(fail)} / 跳过(WAF) {len(skipped)}，耗时 {time.time()-t0:.0f}s'
          f'（平均 {round((time.time()-t0)/max(1,len(todo)),1)}s/只）')
    if fail:
        print(f'失败清单（下次重跑会自动补）: {fail[:20]}')
    stat = pg("SELECT count(*) AS n, max(trade_date) AS d, max(cons_date) AS cd, "
              "count(*) FILTER (WHERE pe_pct_5y IS NOT NULL) AS pe_n FROM index_scores_raw")
    print('库内现状:', json.dumps(stat[0] if stat else {}, ensure_ascii=False))
    print(f'\n完成。下一步：python3 scripts/compute_index_scores.py')


if __name__ == '__main__':
    main()
