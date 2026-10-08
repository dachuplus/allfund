#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_index_scores.py — 【第2级】从 index_scores_raw 算五维评分 → index_scores_staging

对齐 fund/stock 三级流水线：raw(原始) → staging(算分) → 生产表。
本脚本**不联网抓任何外部数据**，只读index_scores_raw + stock_scores + dividend_scores，
所以可以反复重跑调权重而不受数据源限流影响。

五维（权重按用户提供的框架，适配指数无财报的实际情况）
  成长性 25%   近3年净利复合 60% + 营收同比 40%          ← 缩尾加权
  估值   25%   中证官方 PE 近5年分位(反向) 70% + PB(反向) 30%
  市值流动性 15% 加权平均市值 40% + 前十大集中度(适度) 30% + 成分数 30%
  质量   20%   ROE 40% + 毛利率 25% + 经营现金流/净利 20% + 资产负债率(反向) 15%
  股东回报 15%股息率 70% + 每10股派息 30%

三条铁律（都是实测踩出来的坑，勿改）
  1. **估值维必须用中证官方指数 PE**，不能用成分股 pe_ttm 加权。
     实测沪深300 成分股加权 PE = 37.32，官方 = 13.15，严重失真
     （权重大盘 PE 低、小盘高 PE 反被加权放大）。
  2. **成长维必须缩尾**。实测不加缩尾时沪深300 净利同比加权 340.79%、
     中证1000 1230.97%（成分股盈利暴增/亏损转盈把均值拉爆）。
  3. **必须分池标准化**。实测中证红利 ROE 9.64% vs 上证50 16.50%、
     负债率 57.23% vs 52.86%——红利指数天然高负债低 ROE，不分类归一它永远垫底。
     分 broad(规模/风格/策略/综合) / sector(行业) / fixed(固收) 三池，
     **三池分数不可横向比较**，前端按分类分别排名。

用法：
  export SUPABASE_PAT=...
  python3 scripts/compute_index_scores.py
"""
import os
import sys
import json
import math
import subprocess

PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not PAT:
    sys.exit('请设置环境变量 SUPABASE_PAT')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'

# 维度权重
W_GROWTH, W_VALUE, W_MKTLIQ, W_QUALITY, W_DIVIDEND = 0.25, 0.25, 0.15, 0.20, 0.15
# 维度内权重
W_CAGR, W_REVYOY = 0.60, 0.40
W_PEPCT, W_PB = 0.70, 0.30
W_MKTCAP, W_CONC, W_CONSN = 0.40, 0.30, 0.30
W_ROE, W_GM, W_OCF, W_DEBT = 0.40, 0.25, 0.20, 0.15
W_DY, W_PAYOUT = 0.70, 0.30
# 集中度理想区间（前10大权重和）
CONC_LO, CONC_HI = 0.15, 0.30
# 缩尾比例
WINSOR = 0.05

DDL = """
-- ⚠️ 必须先 DROP 再建：`CREATE TABLE IF NOT EXISTS` 不会给已存在的表补新列，
-- 而本表在开发期改过多次 schema，留着旧表会导致 INSERT 报 42703（列不存在）。
DROP TABLE IF EXISTS index_scores_staging;
DROP TABLE IF EXISTS index_scores;

CREATE TABLE index_scores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text UNIQUE,
  name text,
  index_class text,
  pool text,
  cons_number int,
  close numeric,
  trade_date text,
  cons_date text,
  fin_period text,
  k_growth numeric, k_value numeric, k_mktliq numeric,
  k_quality numeric, k_dividend numeric, k_all numeric,
  grade text,
  profit_cagr_3y numeric, rev_yoy numeric,
  pe_index numeric, pe_pct_5y numeric, pb numeric,
  roe numeric, gross_margin numeric, ocf_to_profit numeric, debt_ratio numeric,
  div_yield numeric, payout_per10 numeric,
  mktcap_weighted numeric, top10_weight numeric,
  cons_match_rate numeric, fin_period_cover numeric,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_index_scores_pool ON index_scores(pool);
CREATE INDEX IF NOT EXISTS idx_index_scores_kall ON index_scores(k_all DESC);

CREATE TABLE index_scores_staging (LIKE index_scores INCLUDING ALL);


ALTER TABLE index_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_read_index_scores ON index_scores;
CREATE POLICY anon_read_index_scores ON index_scores
  FOR SELECT TO anon USING (true);
-- ⚠️ 必须同时覆盖 authenticated：表只有 anon 策略时，登录用户读0 行
DROP POLICY IF EXISTS auth_read_index_scores ON index_scores;
CREATE POLICY auth_read_index_scores ON index_scores
  FOR SELECT TO authenticated USING (true);
"""

COLS = ('code,name,index_class,pool,cons_number,close,trade_date,cons_date,fin_period,'
        'k_growth,k_value,k_mktliq,k_quality,k_dividend,k_all,grade,'
        'profit_cagr_3y,rev_yoy,pe_index,pe_pct_5y,pb,roe,gross_margin,'
        'ocf_to_profit,debt_ratio,div_yield,payout_per10,mktcap_weighted,'
        'top10_weight,cons_match_rate,fin_period_cover')


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


# ---------- 统计工具 ----------

def num(v):
    if v is None or v == '':
        return None
    try:
        f = float(v)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def percentile_rank(values, higher_better=True):
    """{key: value} → {key: 0-100 百分位}。"""
    keys = [k for k, v in values.items() if v is not None]
    if not keys:
        return {}
    if len(keys) == 1:
        return {keys[0]: 50.0}
    ordered = sorted(keys, key=lambda k: values[k])
    n = len(ordered)
    return {k: ((i / (n - 1) * 100) if higher_better else (100 - i / (n - 1) * 100))
            for i, k in enumerate(ordered)}


def sub_score(parts, weights):
    """维度内加权，缺失项按权重重新归一化。"""
    num_, den = 0.0, 0.0
    for k, w in weights.items():
        v = parts.get(k)
        if v is None:
            continue
        num_ += v * w
        den += w
    return round(num_ / den, 2) if den > 0 else None


def conc_score(x):
    """集中度（适度指标）：理想区间得100，偏离越远扣分。"""
    if x is None:
        return None
    if x < CONC_LO:
        return round(x / CONC_LO * 80, 2)
    if x > CONC_HI:
        return round(CONC_HI / x * 80, 2)
    return 100.0


def grade_of(k):
    if k is None:
        return None
    return('A' if k >= 85 else 'B' if k >= 70 else 'C' if k >= 55 else 'D' if k >= 40 else 'E')


def lit(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(round(v, 6))
    return "'" + str(v).replace("'", "''") + "'"


def main():
    _load_env_local()
    print('=== [1/5] 建表 + RLS ===')
    pg(DDL)
    print('  ok')

    print('=== [2/5] 读 raw + 基本面 ===')
    raw = pg("SELECT code,name,index_class,pool,cons_number,close,trade_date,cons_date,"
             "pe_index,pe_pct_5y,cons_json FROM index_scores_raw ORDER BY code")
    if not raw:
        sys.exit('index_scores_raw 为空，请先跑 fetch_index_raw.py')
    print(f'  raw {len(raw)} 条')

    frows = pg("SELECT code,rev_yoy,profit_cagr_3y,roe,gross_margin,ocf_to_profit,"
               "debt_ratio,pb,mktcap FROM stock_scores "
               "WHERE is_st = false AND is_delisted = false")
    fmap = {}
    for r in frows:
        c = (r.get('code') or '').split('.')[0]
        if c:
            fmap[c] = r
    print(f'  stock_scores {len(fmap)} 只')

    drows = pg("SELECT code,dividend_yield,payout_per10 FROM dividend_scores")
    dmap = {r['code']: r for r in drows if r.get('code')}
    print(f'  dividend_scores {len(dmap)} 只')

    per = pg("SELECT fin_period, count(*) AS n FROM stock_scores "
             "WHERE fin_period IS NOT NULL AND is_st = false "
             "GROUP BY fin_period ORDER BY fin_period DESC LIMIT 1")
    market_period = per[0]['fin_period'] if per else None
    print(f'  全市场最新财报期 {market_period}')

    print('=== [3/5] 逐指数加权聚合（缩尾）===')
    recs = []
    for r in raw:
        try:
            pairs = r.get('cons_json') or []
            if isinstance(pairs, str):
                pairs = json.loads(pairs)
        except Exception:
            pairs = []
        if not pairs:
            print(f"  {r['code']} 成分为空，跳过")
            continue
        wsum = sum(float(p['weight']) for p in pairs)
        if wsum <= 0:
            continue
        wr = {p['code']: float(p['weight']) / wsum for p in pairs}

        cols = {k: {} for k in ('cagr', 'revyoy', 'roe', 'gm', 'ocf', 'debt', 'pb', 'mktcap')}
        div_y, payout = {}, {}
        matched = 0
        for p in pairs:
            c = p['code']
            f = fmap.get(c)
            if f:
                matched += 1
                for k, col in (('cagr', 'profit_cagr_3y'), ('revyoy', 'rev_yoy'),
                               ('roe', 'roe'), ('gm', 'gross_margin'),
                               ('ocf', 'ocf_to_profit'), ('debt', 'debt_ratio'),
                               ('pb', 'pb'), ('mktcap', 'mktcap')):
                    v = num(f.get(col))
                    if v is not None:
                        cols[k][c] = v
            d = dmap.get(c)
            if d:
                v = num(d.get('dividend_yield'))
                if v is not None:
                    div_y[c] = v
                v = num(d.get('payout_per10'))
                if v is not None:
                    payout[c] = v

        def wavg(dct):
            """加权平均，缺失按已有值中位数填补。"""
            if not dct:
                return None, 0.0
            vals = sorted(dct.values())
            fill = vals[len(vals) // 2]
            acc = ww = 0.0
            for c, v in dct.items():
                acc += v * wr[c]
                ww += wr[c]
            if ww < 1.0:
                acc += fill * (1.0 - ww)
                ww = 1.0
            return (acc / ww if ww else None), (len(dct) / len(pairs))

        def wins(dct):
            """缩尾加权：夹到 [5%,95%] 分位界内再平均（铁律2）。"""
            if not dct:
                return None, 0.0
            vals = sorted(dct.values())
            n = len(vals)
            a = int(n * WINSOR)
            b = max(a + 1, int(n * (1 - WINSOR)))
            lo, hi = vals[a], vals[b - 1]
            acc = ww = 0.0
            for c, v in dct.items():
                acc += min(max(v, lo), hi) * wr[c]
                ww += wr[c]
            return (acc / ww if ww else None), (len(dct) / len(pairs))

        cagr, cov1 = wins(cols['cagr'])
        revyoy, cov2 = wins(cols['revyoy'])
        roe, cov3 = wavg(cols['roe'])
        gm, cov4 = wavg(cols['gm'])
        ocf, cov5 = wavg(cols['ocf'])
        debt, cov6 = wavg(cols['debt'])
        pb, _ = wavg(cols['pb'])
        mcap, _ = wavg(cols['mktcap'])
        dy, _ = wavg(div_y)
        po, _ = wavg(payout)

        top10 = sum(sorted([float(p['weight']) for p in pairs], reverse=True)[:10]) / wsum
        basic_cov = sum([cov1, cov2, cov3, cov4, cov5, cov6]) / 6

        recs.append({
            'code': r['code'], 'name': r['name'], 'index_class': r['index_class'],
            'pool': r['pool'], 'cons_number': r['cons_number'] or len(pairs),
            'close': num(r['close']), 'trade_date': r['trade_date'],
            'cons_date': r['cons_date'], 'fin_period': market_period,
            '_cagr': cagr, '_revyoy': revyoy, '_roe': roe, '_gm': gm, '_ocf': ocf,
            '_debt': debt, '_pb': pb, '_pe': num(r['pe_index']),
            '_pe_pct': num(r['pe_pct_5y']), '_dy': dy, '_payout': po,
            '_mktcap': mcap, '_conc': top10,
            '_match': matched / len(pairs), '_basic_cov': basic_cov,
        })
    print(f'  聚合 {len(recs)} 条')

    print('=== [4/5] 分池标准化 + 加权 ===')
    for pool_name in ('broad', 'sector', 'fixed'):
        sub = [x for x in recs if x['pool'] == pool_name]
        if len(sub) < 3:
            print(f'  池 {pool_name} 仅 {len(sub)} 只，跳过评分（样本不足无法横截面标准化）')
            for x in sub:
                x.update({k: None for k in ('k_growth', 'k_value', 'k_mktliq',
                                            'k_quality', 'k_dividend', 'k_all', 'grade')})
            continue
        print(f'  池 {pool_name}: {len(sub)} 只')
        g = percentile_rank({x['code']: x['_cagr'] for x in sub}, True)
        g2 = percentile_rank({x['code']: x['_revyoy'] for x in sub}, True)
        v = percentile_rank({x['code']: x['_pe_pct'] for x in sub}, False)
        v2 = percentile_rank({x['code']: x['_pb'] for x in sub}, False)
        m = percentile_rank({x['code']: x['_mktcap'] for x in sub}, True)
        m2 = {x['code']: conc_score(x['_conc']) for x in sub}
        m3 = percentile_rank({x['code']: float(x['cons_number']) for x in sub}, True)
        q = percentile_rank({x['code']: x['_roe'] for x in sub}, True)
        q2 = percentile_rank({x['code']: x['_gm'] for x in sub}, True)
        q3 = percentile_rank({x['code']: x['_ocf'] for x in sub}, True)
        q4 = percentile_rank({x['code']: x['_debt'] for x in sub}, False)
        dd = percentile_rank({x['code']: x['_dy'] for x in sub}, True)
        dd2 = percentile_rank({x['code']: x['_payout'] for x in sub}, True)
        for x in sub:
            c = x['code']
            x['k_growth'] = sub_score({'a': g.get(c), 'b': g2.get(c)},
                                      {'a': W_CAGR, 'b': W_REVYOY})
            x['k_value'] = sub_score({'a': v.get(c), 'b': v2.get(c)},
                                     {'a': W_PEPCT, 'b': W_PB})
            x['k_mktliq'] = sub_score({'a': m.get(c), 'b': m2.get(c), 'c': m3.get(c)},
                                      {'a': W_MKTCAP, 'b': W_CONC, 'c': W_CONSN})
            x['k_quality'] = sub_score({'a': q.get(c), 'b': q2.get(c), 'c': q3.get(c),
                                        'd': q4.get(c)},
                                       {'a': W_ROE, 'b': W_GM, 'c': W_OCF, 'd': W_DEBT})
            x['k_dividend'] = sub_score({'a': dd.get(c), 'b': dd2.get(c)},
                                        {'a': W_DY, 'b': W_PAYOUT})
            x['k_all'] = sub_score(
                {'g': x['k_growth'], 'v': x['k_value'], 'm': x['k_mktliq'],
                 'q': x['k_quality'], 'd': x['k_dividend']},
                {'g': W_GROWTH, 'v': W_VALUE, 'm': W_MKTLIQ,
                 'q': W_QUALITY, 'd': W_DIVIDEND})
            x['grade'] = grade_of(x['k_all'])

    print('=== [5/5] 写 staging ===')
    pg('TRUNCATE index_scores_staging')
    BATCH = 25
    for i in range(0, len(recs), BATCH):
        chunk = recs[i:i + BATCH]
        vals = []
        for x in chunk:
            row = dict(x)
            row['pe_index'] = x['_pe']; row['pe_pct_5y'] = x['_pe_pct']
            row['profit_cagr_3y'] = x['_cagr']; row['rev_yoy'] = x['_revyoy']
            row['roe'] = x['_roe']; row['gross_margin'] = x['_gm']
            row['ocf_to_profit'] = x['_ocf']; row['debt_ratio'] = x['_debt']
            row['pb'] = x['_pb']; row['div_yield'] = x['_dy']
            row['payout_per10'] = x['_payout']; row['mktcap_weighted'] = x['_mktcap']
            row['top10_weight'] = x['_conc']; row['cons_match_rate'] = x['_match']
            row['fin_period_cover'] = x['_basic_cov']
            vals.append('(' + ','.join(lit(row[c]) for c in COLS.split(',')) + ')')
        pg(f"INSERT INTO index_scores_staging ({COLS}) VALUES " + ','.join(vals) + ';')
        print(f'  已写 {min(i+BATCH, len(recs))}/{len(recs)}')

    st = pg("""SELECT count(*) AS total, count(k_all) AS k_all_n,
                  count(pe_pct_5y) AS pe_n, count(DISTINCT pool) AS pools,
                  round(avg(cons_match_rate)::numeric,3) AS match_avg
               FROM index_scores_staging""")
    print('\nstaging 概况:', json.dumps(st[0] if st else {}, ensure_ascii=False))
    top = pg("""SELECT code,name,pool,index_class,k_all,grade,k_growth,k_value,
                      k_mktliq,k_quality,k_dividend,pe_index,pe_pct_5y,div_yield
               FROM index_scores_staging WHERE k_all IS NOT NULL
               ORDER BY pool, k_all DESC LIMIT 12""")
    print('\n各池 Top（验证分布）:')
    for t in top:
        f = lambda k: (float(t[k]) if t.get(k) is not None else 0)
        print(f"    [{t['pool']:6s}] {t['code']} {t['name'][:10]:12s} "
              f"总分={f('k_all'):5.1f} {t['grade']} | "
              f"成长{f('k_growth'):5.1f} 估值{f('k_value'):5.1f} 市值{f('k_mktliq'):5.1f} "
              f"质量{f('k_quality'):5.1f} 回报{f('k_dividend'):5.1f} | "
              f"PE={t['pe_index']} 分位{t['pe_pct_5y']}%")
    print('\n完成。下一步：python3 scripts/promote_index_scores.py')


if __name__ == '__main__':
    main()
