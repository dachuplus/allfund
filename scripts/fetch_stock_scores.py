#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_stock_scores.py — 沪深京港全市场股票「靠谱成长指数 v1」→ stock_scores_staging

设计（2026-10-02 重构，替代旧的 1800 只成分股 + 基金式评分）：

【覆盖面】沪深京 A 股 + 香港市场全市场（不再限于沪深300/中证500/中证1000 成分股）
  - A 股 universe：东财 datacenter 业绩报表 RPT_LICO_FN_CPD（最新报告期）
                   并集 资产负债表 RPT_DMSK_FN_BALANCE（含北交所）
  - 港股 universe：东财 datacenter RPT_HKF10_INFO_ORGPROFILE（公司资料）
                   再用腾讯报价过滤掉停牌/退市（取不到报价即剔除）

【基本面因子】
  A 股：RPT_LICO_FN_CPD  营收同比 YSTZ / 净利同比 SJLTZ / ROE WEIGHTAVG_ROE /
        毛利率 XSMLL / 每股收益 BASIC_EPS / 每股经营现金流 MGJYXJJE / 归母净利 PARENT_NETPROFIT
        RPT_DMSK_FN_BALANCE 资产负债率 DEBT_ASSET_RATIO / 行业 INDUSTRY_NAME
  港股：RPT_HKF10_FN_MAININDICATOR 营收同比 OPERATE_INCOME_YOY / 净利同比 HOLDER_PROFIT_YOY /
        ROE ROE_AVG / 毛利率 GROSS_PROFIT_RATIO / 每股收益 BASIC_EPS /
        每股经营现金流 PER_NETCASH_OPERATE / 归母净利 HOLDER_PROFIT /
        资产负债率 DEBT_ASSET_RATIO / PE_TTM / PB_TTM / 总市值 TOTAL_MARKET_CAP
  历史归母净利（年报 2022–2025）→ 近3年净利复合增速 profit_cagr_3y、连续亏损年数 loss_years

【五维评分（股票专属，不是基金公式）】横截面百分位 0–100
  k_growth   成长 30% ← 营收同比、净利同比、近3年净利复合增速
  k_quality  质量 25% ← ROE、毛利率、经营现金流含金量(每股经营现金流/每股收益)
  k_safety   健康 20% ← 资产负债率(反向)、连续亏损年数(反向)
  k_value    估值 15% ← PE_TTM(反向)、PB(反向)、PEG(反向)
  k_momentum 动量 10% ← 近1年收益、近1年最大回撤(反向)、近1年夏普
  k_all = 加权和（缺失维度按权重重新归一化；成长与质量任一缺失则 k_all 置空）
  风控股（ST/退市/停牌/次新/连续2年亏损）**保留并置底标记**（risk_flag），不删不置空。

【行情】腾讯 qt.gtimg.cn 批量报价（sh/sz/bj/hk）；K 线：A 股走新浪（北交所唯一可用），港股走腾讯。

用法：
  export SUPABASE_PAT="$(grep -E '^SUPABASE_PAT=' .env.local | cut -d= -f2-)"
  python3 scripts/fetch_stock_scores.py [--limit N] [--no-kline] [--kline-budget 900]
"""
import os
import re
import sys
import json
import math
import time
import bisect
import datetime
import subprocess
import argparse
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# ===== 凭证 =====
PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
if not PAT:
    raise SystemExit("缺少 SUPABASE_PAT 环境变量")
REF = "tqhtegazxykkqfcpejky"
MGMT_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

HEADERS_EM = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://data.eastmoney.com/',
    'Accept': '*/*', 'Accept-Language': 'zh-CN,zh;q=0.9',
}
HEADERS_TX = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://gu.qq.com/', 'Accept': '*/*'}
HEADERS_SINA = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.sina.com.cn/', 'Accept': '*/*'}

EM_BASE = "https://datacenter-web.eastmoney.com/api/data/v1/get"

TD_1M, TD_3M, TD_6M, TD_1Y, TD_3Y = 21, 63, 126, 252, 756

# 五维权重（用户 2026-10-02 拍板：推荐版）
WEIGHTS = [('k_growth', 0.30), ('k_quality', 0.25), ('k_safety', 0.20),
           ('k_value', 0.15), ('k_momentum', 0.10)]

_SESS = requests.Session()
_adapter = requests.adapters.HTTPAdapter(pool_connections=64, pool_maxsize=64)
_SESS.mount('https://', _adapter)
_SESS.mount('http://', _adapter)


def log(*a):
    print(' '.join(str(x) for x in a), flush=True)


# ============================================================
# 通用 HTTP
# ============================================================
def http_get(url, headers, timeout=20, tries=3, session=None):
    s = session or _SESS
    for i in range(tries):
        try:
            r = s.get(url, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass
        time.sleep(0.6 * (i + 1))
    return None


def http_json(url, headers, timeout=25, tries=3):
    t = http_get(url, headers, timeout=timeout, tries=tries)
    if not t:
        return None
    try:
        return json.loads(t)
    except Exception:
        return None


# ============================================================
# 东财 datacenter 分页拉取
# ============================================================
def em_fetch(report, filt="", page_size=500, max_pages=60, sort="SECURITY_CODE", tag=""):
    """返回 (rows, count)。success=False 时返回 ([], 0)。"""
    out = []
    total = 0
    page = 1
    while page <= max_pages:
        u = (f"{EM_BASE}?reportName={report}&columns=ALL&pageSize={page_size}"
             f"&pageNumber={page}&source=WEB&client=WEB")
        if filt:
            u += f"&filter={filt}"
        if sort:
            u += f"&sortColumns={sort}&sortTypes=1"
        j = http_json(u, HEADERS_EM, timeout=30, tries=3)
        if not j or j.get('success') is False:
            if page == 1:
                log(f"  [EM] {tag or report} 失败: {(j or {}).get('message')}")
            break
        res = j.get('result') or {}
        rows = res.get('data') or []
        total = res.get('count') or total
        if not rows:
            break
        out.extend(rows)
        if len(rows) < page_size:
            break
        page += 1
        time.sleep(0.12)
    return out, total


def latest_periods(today):
    """按当前日期推测可选的最新报告期（由新到旧）"""
    y = today.year
    if today.month >= 11:
        return [f"{y}-09-30", f"{y}-06-30", f"{y}-03-31", f"{y-1}-12-31"]
    if today.month >= 8:
        return [f"{y}-06-30", f"{y}-03-31", f"{y-1}-12-31", f"{y-1}-09-30"]
    if today.month >= 5:
        return [f"{y}-03-31", f"{y-1}-12-31", f"{y-1}-09-30", f"{y-1}-06-30"]
    return [f"{y-1}-12-31", f"{y-1}-09-30", f"{y-1}-06-30", f"{y-1}-03-31"]


def annual_periods(today, n=4):
    """最近 n 个「已披露」年报期，由新到旧。
    Y 年年报在 Y+1 年 1–4 月披露：5 月起最新年报为 Y-1 年，4 月前为 Y-2 年。"""
    y = today.year - 1 if today.month >= 5 else today.year - 2
    return [f"{y - i}-12-31" for i in range(n)]


def latest_annual_year(today):
    return today.year - 1 if today.month >= 5 else today.year - 2


def pick_period(report, cands, date_col, tag=""):
    """依次尝试报告期，返回第一个有数据的 (period, rows)"""
    for p in cands:
        rows, cnt = em_fetch(report, filt=f"({date_col}='{p}')", tag=f"{tag}@{p}")
        if rows:
            log(f"  [EM] {tag} 采用报告期 {p}（{len(rows)} 行 / count={cnt}）")
            return p, rows
    return None, []


# ============================================================
# A 股
# ============================================================
A_CODE_RE = re.compile(r'^(6|0|3|4|8|9)')
# 实测 2026-10-02：RPT_LICO_FN_CPD 单期 11449 行 = A股 5578 + 三板股 5791 + B股 79 + CDR 1
# 只保留 SECURITY_TYPE='A股'（沪 2319 + 深 2908 + 京 351），新三板/老三板/B股一律剔除
A_SECURITY_TYPE = 'A股'


def is_a_share(r):
    """判定是否为沪深京 A 股（排除三板股/B股/存托凭证）"""
    return (r.get('SECURITY_TYPE') or '').strip() == A_SECURITY_TYPE


def exchange_of_a(code):
    # 注意：北交所已整体启用 920xxx 代码（沪B 为 900xxx，需区分）
    if code.startswith('6'):
        return 'SH'
    if code.startswith('0') or code.startswith('3'):
        return 'SZ'
    if code.startswith('92'):
        return 'BJ'
    if code.startswith('4') or code.startswith('8'):
        return 'BJ'
    return None


def fetch_a_universe(today):
    """返回 (period, {code: row}) 与 (bal_period, {code: row})"""
    cands = latest_periods(today)
    period, rows = pick_period("RPT_LICO_FN_CPD", cands, "REPORTDATE", "A股业绩报表")
    fin = {}
    kept = 0
    for r in rows:
        code = (r.get('SECURITY_CODE') or '').strip()
        if not code or not A_CODE_RE.match(code):
            continue
        if exchange_of_a(code) is None:
            continue
        if not is_a_share(r):
            continue          # 剔除新三板/老三板/B股/CDR
        kept += 1
        prev = fin.get(code)
        score = (1 if str(r.get('ISNEW')) == '1' else 0)
        if prev is None or score > prev[0]:
            fin[code] = (score, r)
    fin = {k: v[1] for k, v in fin.items()}
    log(f"  [A股] 业绩报表 A股 {kept} 条 → 去重后 {len(fin)} 只（报告期 {period}）")

    # 年报期（用于 ROE/毛利率/负债率，与港股年报口径可比）
    ann_cands = annual_periods(today, 4)
    ann_period, ann_rows = pick_period("RPT_LICO_FN_CPD", ann_cands, "REPORTDATE", "A股年报业绩")
    ann = {}
    for r in ann_rows:
        code = (r.get('SECURITY_CODE') or '').strip()
        if code and A_CODE_RE.match(code) and exchange_of_a(code) and is_a_share(r):
            ann[code] = r
    log(f"  [A股] 年报业绩 {len(ann)} 只（报告期 {ann_period}）")

    # 资产负债表（仅作查询用，不参与 universe）
    bal_period, bal_rows = pick_period("RPT_DMSK_FN_BALANCE", cands + ann_cands,
                                       "REPORT_DATE", "A股资产负债表")
    bal = {}
    for r in bal_rows:
        code = (r.get('SECURITY_CODE') or '').strip()
        if code and A_CODE_RE.match(code) and exchange_of_a(code):
            bal[code] = r
    log(f"  [A股] 资产负债表 {len(bal)} 只（报告期 {bal_period}）")

    # 年报归母净利（2022–2025）→ CAGR / 连续亏损
    profits = {}
    for y in ann_cands[::-1][:4]:
        rr, _ = em_fetch("RPT_LICO_FN_CPD", filt=f"(REPORTDATE='{y}')", tag=f"A股年报{y}")
        m = {}
        for r in rr:
            code = (r.get('SECURITY_CODE') or '').strip()
            if code and A_CODE_RE.match(code) and is_a_share(r):
                m[code] = r.get('PARENT_NETPROFIT')
        profits[y[:4]] = m
        log(f"  [A股] 年报 {y[:4]} 归母净利 {len(m)} 只")
        time.sleep(0.1)

    return period, fin, ann_period, ann, bal_period, bal, profits


# ============================================================
# 港股
# ============================================================
def fetch_hk_list():
    rows, _ = em_fetch("RPT_HKF10_INFO_ORGPROFILE", page_size=500, max_pages=40,
                       sort="SECURITY_CODE", tag="港股公司资料")
    out = {}
    for r in rows:
        code = (r.get('SECURITY_CODE') or '').strip()
        if not code or not re.match(r'^\d{5}$', code):
            continue
        out[code] = {
            'name': (r.get('SECURITY_NAME_ABBR') or '').strip(),
            'industry': (r.get('BELONG_INDUSTRY') or '').strip() or None,
            'list_date': (r.get('LISTING_DATE') or '')[:10] or None,
            'market': (r.get('BELONG_MARKET') or '').strip() or None,
        }
    log(f"  [港股] 公司资料 {len(out)} 只")
    return out


def fetch_hk_fin(today):
    """返回 (period, {code: row}) 与 {year: {code: netprofit}}"""
    ay = latest_annual_year(today)
    cands = [f"{ay}-12-31", f"{ay - 1}-12-31"]
    period, rows = pick_period("RPT_HKF10_FN_MAININDICATOR", cands, "REPORT_DATE", "港股F10")
    fin = {}
    for r in rows:
        code = (r.get('SECURITY_CODE') or '').strip()
        if code and re.match(r'^\d{5}$', code):
            fin[code] = r
    log(f"  [港股] F10 主要指标 {len(fin)} 只（报告期 {period}）")

    profits = {}
    ys = [str(ay - i) for i in range(4)]
    for y in ys:
        rr, _ = em_fetch("RPT_HKF10_FN_MAININDICATOR", filt=f"(REPORT_DATE='{y}-12-31')",
                         tag=f"港股年报{y}")
        m = {}
        for r in rr:
            code = (r.get('SECURITY_CODE') or '').strip()
            if code:
                m[code] = r.get('HOLDER_PROFIT')
        profits[y] = m
        log(f"  [港股] 年报 {y} 归母净利 {len(m)} 只")
        time.sleep(0.1)
    return period, fin, profits


# ============================================================
# 腾讯批量报价
# ============================================================
def sym_of(code, exch):
    return {'SH': 'sh', 'SZ': 'sz', 'BJ': 'bj', 'HK': 'hk'}.get(exch, 'sh') + code


def parse_quote(parts, exch):
    def g(i):
        try:
            return parts[i]
        except Exception:
            return ''
    d = {
        'name': g(1), 'close': g(3), 'change_pct': g(32),
        'turnover': g(38), 'pe_ttm': g(39),
        'mktcap': g(44), 'circ_mktcap': g(45),
    }
    if exch == 'HK':
        # 港股第 46 位是英文简称，不是 PB；PB 由东财 F10 的 PB_TTM 提供
        d['pb'] = None
    else:
        d['pb'] = g(46)
    return d


def fetch_quotes_batch(syms, exch):
    if not syms:
        return {}
    u = "https://qt.gtimg.cn/q=" + ','.join(syms)
    txt = http_get(u, HEADERS_TX, timeout=20, tries=3)
    res = {}
    if not txt:
        return res
    try:
        txt = txt.encode('latin-1').decode('gbk', errors='ignore')
    except Exception:
        pass
    for line in txt.strip().split('\n'):
        if '="' not in line:
            continue
        try:
            sym = line.split('="')[0].split('_')[-1]
            body = line.split('="')[1].rstrip('";')
            res[sym] = parse_quote(body.split('~'), exch)
        except Exception:
            continue
    return res


# ============================================================
# K 线
# ============================================================
def kline_tx(sym, n=260):
    """A 股日线（前复权）。"""
    u = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={sym},day,,,{n},qfq"
    j = http_json(u, HEADERS_TX, timeout=15, tries=2)
    if not j:
        return None
    d = j.get('data') or {}
    k = d.get(sym) or {}
    day = k.get('qfqday') or k.get('day') or []
    if len(day) < 2:
        return None
    out = []
    for b in day:
        try:
            out.append(float(b[2]))
        except Exception:
            pass
    return out or None


def kline_tx_hk(sym, n=260):
    """港股日线必须用 hkfqkline 端点：通用 fqkline 对港股返回非 JSON，会全部失败。"""
    u = f"https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get?param={sym},day,,,{n},qfq"
    j = http_json(u, HEADERS_TX, timeout=15, tries=2)
    if not j:
        return None
    d = j.get('data') or {}
    k = d.get(sym) or {}
    day = k.get('qfqday') or k.get('day') or []
    if len(day) < 2:
        return None
    out = []
    for b in day:
        try:
            out.append(float(b[2]))
        except Exception:
            pass
    return out or None


def kline_sina(sym, n=260):
    u = ("https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
         f"CN_MarketData.getKLineData?symbol={sym}&scale=240&ma=no&datalen={n}")
    t = http_get(u, HEADERS_SINA, timeout=15, tries=2)
    if not t:
        return None
    try:
        bars = json.loads(t)
    except Exception:
        return None
    out = []
    for b in bars or []:
        try:
            out.append(float(b['close']))
        except Exception:
            pass
    return out or None


def fetch_kline(sym, exch):
    if exch == 'HK':
        return kline_tx_hk(sym) or kline_tx(sym)
    c = kline_tx(sym)
    if c and len(c) >= 20:
        return c
    return kline_sina(sym)


# ============================================================
# 指标
# ============================================================
def pct_return(closes, bars_back):
    if not closes or len(closes) <= bars_back:
        return None
    old = closes[-(bars_back + 1)]
    if not old:
        return None
    return (closes[-1] - old) / old * 100.0


def max_drawdown(closes, bars_back):
    if not closes:
        return None
    window = closes[-(bars_back + 1):] if len(closes) > bars_back else closes
    if len(window) < 2:
        return None
    peak = window[0]
    mdd = 0.0
    for p in window:
        if p > peak:
            peak = p
        if peak > 0:
            dd = (p - peak) / peak
            if dd < mdd:
                mdd = dd
    return mdd * 100.0


def sharpe(closes, bars_back):
    if not closes:
        return None
    window = closes[-(bars_back + 1):] if len(closes) > bars_back else closes
    if len(window) < 3:
        return None
    rets = []
    for i in range(1, len(window)):
        if window[i - 1]:
            rets.append((window[i] - window[i - 1]) / window[i - 1])
    if len(rets) < 2:
        return None
    mean = sum(rets) / len(rets)
    var = sum((x - mean) ** 2 for x in rets) / (len(rets) - 1)
    std = math.sqrt(var)
    if std == 0:
        return None
    return (mean / std) * math.sqrt(252)


def percentile_ranks(pairs):
    """pairs: [(key, val|None)] → {key: 0-100 百分位}（并列取平均秩）"""
    valid = [(k, v) for k, v in pairs if v is not None and not (isinstance(v, float) and
             (math.isnan(v) or math.isinf(v)))]
    out = {k: None for k, _ in pairs}
    if not valid:
        return out
    vs = sorted(v for _, v in valid)
    n = len(vs)
    if n == 1:
        out[valid[0][0]] = 50.0
        return out
    for k, v in valid:
        lo = bisect.bisect_left(vs, v)
        hi = bisect.bisect_right(vs, v)
        rank = lo + (hi - lo - 1) / 2.0
        out[k] = round(rank / (n - 1) * 100.0, 2)
    return out


def build_dim(rows, factors):
    """factors: [(attr, reverse), ...] 返回 {code: 0-100}（各因子分位取平均）"""
    pcts = []
    for attr, rev in factors:
        pairs = [(r['code'], (None if r[attr] is None else -r[attr]) if rev else r[attr])
                 for r in rows]
        pcts.append(percentile_ranks(pairs))
    out = {}
    for r in rows:
        vals = [p.get(r['code']) for p in pcts]
        vals = [v for v in vals if v is not None]
        out[r['code']] = round(sum(vals) / len(vals), 2) if vals else None
    return out


def fnum(x):
    try:
        if x is None or x == '':
            return None
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except Exception:
        return None


# ============================================================
# 写库
# ============================================================
def pg(sql, timeout=600):
    payload = json.dumps({'query': sql})
    r = subprocess.run(
        ['curl', '-s', '--max-time', str(timeout), '-X', 'POST', MGMT_API,
         '-H', f'Authorization: Bearer {PAT}',
         '-H', 'Content-Type: application/json', '-d', payload],
        capture_output=True, text=True, timeout=timeout + 30)
    if r.returncode != 0:
        raise RuntimeError(f'curl fail: {r.stderr[:150]}')
    t = r.stdout.strip()
    if not t:
        return []
    try:
        resp = json.loads(t)
    except json.JSONDecodeError:
        raise RuntimeError(f'非JSON响应: {t[:200]}')
    if isinstance(resp, dict) and resp.get('message'):
        raise RuntimeError(resp['message'][:300])
    return resp


def sql_num(v):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return 'NULL'
    return str(v)


def sql_str(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def sql_bool(v):
    return 'true' if v else 'false'


COLS = ["code", "name", "industry", "industry_code", "exchange", "secid", "close",
        "pe_ttm", "pb", "mktcap", "circ_mktcap", "turnover_rate",
        "return_1m", "return_3m", "return_6m", "return_1y", "return_3y",
        "daily_change", "max_drawdown", "sharpe",
        "k_ret", "k_drawdown", "k_sharpe", "k_all",
        "is_st", "is_delisted", "is_suspended", "list_date", "updated_at",
        "rev_yoy", "profit_yoy", "profit_cagr_3y", "roe", "gross_margin",
        "ocf_to_profit", "debt_ratio", "loss_years", "peg", "fin_period", "risk_flag",
        "k_growth", "k_quality", "k_safety", "k_value", "k_momentum"]


def _insert_batch(chunk):
    """插入一批，返回成功写入行数。失败抛异常。"""
    parts = []
    for r in chunk:
        vals = [sql_str(r.get(c)) if c in ('code', 'name', 'industry', 'industry_code',
                                           'exchange', 'secid', 'list_date',
                                           'fin_period', 'risk_flag')
                else ('true' if r.get(c) else 'false') if c in ('is_st', 'is_delisted', 'is_suspended')
                else sql_str(r.get('updated_at')) if c == 'updated_at'
                else sql_num(r.get(c))
                for c in COLS]
        parts.append("(" + ",".join(vals) + ")")
    sql = (f"INSERT INTO public.stock_scores_staging ({','.join(COLS)}) VALUES "
           + ",".join(parts) + ";")
    pg(sql, timeout=300)
    return len(chunk)


def _insert_with_retry(chunk, depth=0):
    """带重试的批次写入：失败重试 3 次，仍失败则对半拆分再各自重试（最多拆 3 层）。"""
    last = None
    for attempt in range(3):
        try:
            return _insert_batch(chunk)
        except Exception as e:
            last = e
            time.sleep(2 * (attempt + 1))
    if depth < 3 and len(chunk) > 1:
        mid = len(chunk) // 2
        ok = 0
        for half in (chunk[:mid], chunk[mid:]):
            try:
                ok += _insert_with_retry(half, depth + 1)
            except Exception:
                pass
        if ok:
            return ok
    raise last if last else RuntimeError('批次写入失败')


def write_staging(rows):
    pg("TRUNCATE TABLE public.stock_scores_staging;")
    BATCH = 120
    now = datetime.datetime.now().isoformat()
    for r in rows:
        r['updated_at'] = now
    total = 0
    failed = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        try:
            total += _insert_with_retry(chunk)
        except Exception as e:
            failed += len(chunk)
            log(f"  [ERR] 批次写入最终失败（丢失 {len(chunk)} 行）: {str(e)[:160]}")
    if failed:
        log(f"  [WARN] 共丢失 {failed} 行")
    return total


def write_etl_log(rows, status, detail):
    today = datetime.date.today().isoformat()
    now = datetime.datetime.now().isoformat()
    sql = (f"INSERT INTO public.etl_run_log (run_date, step_name, status, start_time, end_time, "
           f"rows_affected, error_message) VALUES ('{today}','fetch_stock_scores','{status}','{now}','{now}',"
           f"{rows},'{detail.replace(chr(39), chr(39) * 2)}');")
    try:
        pg(sql, timeout=120)
    except Exception as e:
        log(f"  [WARN] etl_run_log 写入失败: {e}")


# ============================================================
# 主流程
# ============================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='调试：限制处理数量')
    ap.add_argument('--no-kline', action='store_true', help='跳过 K 线（动量维度留空）')
    ap.add_argument('--kline-budget', type=int, default=1200, help='K 线总时间预算（秒）')
    ap.add_argument('--dump', default='', help='把组装+评分后的结果转储为 JSON（便于写库失败后快速回灌）')
    ap.add_argument('--from-dump', default='',
                    help='从 JSON 转储恢复并直接写库（跳过全部抓取，用于写库失败后补救）')
    args = ap.parse_args()

    today = datetime.date.today()
    t_start = time.time()
    log('=' * 66)
    log(' 沪深京港全市场 · 靠谱成长指数 v1 → stock_scores_staging')
    log('=' * 66)

    # ---------- 0. 从转储恢复（写库失败后的补救路径）----------
    if args.from_dump:
        with open(args.from_dump, encoding='utf-8') as fh:
            rows = json.load(fh)
        log(f'  [回灌] 从 {args.from_dump} 载入 {len(rows)} 行')
        written = write_staging(rows)
        log(f'  [回灌] 写入 stock_scores_staging {written} 行')
        write_etl_log(written, 'ok' if written >= 5000 else 'partial',
                      f'from-dump 回灌，载入{len(rows)}行，写入{written}行')
        return

    # ---------- 1. 基本面 ----------
    log('\n[1/6] 抓取 A 股财务数据...')
    a_period, a_fin, a_ann_period, a_ann, a_bal_period, a_bal, a_profits = fetch_a_universe(today)
    log('\n[2/6] 抓取港股财务数据...')
    hk_list = fetch_hk_list()
    hk_period, hk_fin, hk_profits = fetch_hk_fin(today)

    # ---------- 2. 组装 universe ----------
    universe = {}   # code -> dict(exchange, name, ...)
    # A 股 universe 只取「业绩报表 + 年报业绩」中 SECURITY_TYPE='A股' 的代码，
    # 资产负债表仅作指标查询，不参与 universe（否则会混入新三板）
    for code in a_fin:
        exch = exchange_of_a(code)
        if exch:
            universe[code] = {'exchange': exch, 'src': 'A'}
    for code in a_ann:
        exch = exchange_of_a(code)
        if exch and code not in universe:
            universe[code] = {'exchange': exch, 'src': 'A'}
    for code in hk_list:
        universe[code] = {'exchange': 'HK', 'src': 'HK'}
    log(f"\n[3/6] universe 合计 {len(universe)} 只"
        f"（A股 {sum(1 for v in universe.values() if v['src'] == 'A')} / "
        f"港股 {sum(1 for v in universe.values() if v['src'] == 'HK')}）")

    # ---------- 3. 行情 ----------
    log('\n[4/6] 腾讯批量报价...')
    quote_map = {}
    for exch in ('SH', 'SZ', 'BJ', 'HK'):
        syms = [sym_of(c, v['exchange']) for c, v in universe.items() if v['exchange'] == exch]
        got = 0
        for i in range(0, len(syms), 50):
            q = fetch_quotes_batch(syms[i:i + 50], exch)
            quote_map.update(q)
            got += len(q)
            time.sleep(0.12)
        log(f"  [{exch}] 请求 {len(syms)} 只，取到 {got} 只")

    # 过滤无有效报价（退市/长期停牌）
    alive = {}
    for code, meta in universe.items():
        sym = sym_of(code, meta['exchange'])
        q = quote_map.get(sym) or {}
        if fnum(q.get('close')):
            alive[code] = meta
    log(f"  有有效报价 {len(alive)} 只（剔除 {len(universe) - len(alive)} 只无报价）")

    codes = sorted(alive.keys())
    if args.limit:
        codes = codes[:args.limit]

    # ---------- 4. K 线 ----------
    kline_cache = {}
    if not args.no_kline:
        log(f'\n[5/6] 日线 K 线（预算 {args.kline_budget}s，32 并发）...')
        t0 = time.time()
        todo = [(c, alive[c]['exchange']) for c in codes]
        done = 0
        with ThreadPoolExecutor(max_workers=32) as ex:
            futs = {ex.submit(fetch_kline, sym_of(c, e), e): c for c, e in todo}
            for f in as_completed(futs):
                code = futs[f]
                done += 1
                try:
                    kline_cache[code] = f.result()
                except Exception:
                    kline_cache[code] = None
                if done % 1000 == 0:
                    log(f"    K线进度 {done}/{len(todo)}，用时 {time.time() - t0:.0f}s")
                if time.time() - t0 > args.kline_budget:
                    log(f"    K线超出预算，停止（已完成 {done}/{len(todo)}）")
                    break
        ok = sum(1 for v in kline_cache.values() if v)
        log(f"  K线有效 {ok} 只，用时 {time.time() - t0:.0f}s")
    else:
        log('\n[5/6] 跳过 K 线')

    # ---------- 5. 组装 + 评分 ----------
    log('\n[6/6] 组装指标并计算五维评分...')
    rows = []
    for code in codes:
        meta = alive[code]
        exch = meta['exchange']
        sym = sym_of(code, exch)
        q = quote_map.get(sym) or {}
        nm = (q.get('name') or '').strip()

        rec = {c: None for c in COLS}
        rec['code'] = f"{code}.{exch}"
        rec['exchange'] = exch
        rec['secid'] = ('116.' + code) if exch == 'HK' else (('1.' if exch == 'SH' else '0.') + code)
        rec['close'] = fnum(q.get('close'))
        rec['daily_change'] = fnum(q.get('change_pct'))
        rec['turnover_rate'] = fnum(q.get('turnover')) or None
        rec['mktcap'] = fnum(q.get('mktcap'))
        rec['circ_mktcap'] = fnum(q.get('circ_mktcap'))
        rec['pe_ttm'] = fnum(q.get('pe_ttm'))
        rec['pb'] = fnum(q.get('pb'))
        rec['name'] = nm
        rec['industry'] = None
        rec['industry_code'] = None
        rec['list_date'] = None
        fin_period = None

        if exch == 'HK':
            info = hk_list.get(code, {})
            if not nm:
                nm = info.get('name') or ''
            rec['name'] = nm
            rec['industry'] = info.get('industry')
            rec['list_date'] = info.get('list_date')
            f = hk_fin.get(code, {})
            if f:
                fin_period = (f.get('REPORT_DATE') or '')[:10] or None
                rec['rev_yoy'] = fnum(f.get('OPERATE_INCOME_YOY'))
                rec['profit_yoy'] = fnum(f.get('HOLDER_PROFIT_YOY'))
                rec['roe'] = fnum(f.get('ROE_AVG'))
                rec['gross_margin'] = fnum(f.get('GROSS_PROFIT_RATIO'))
                rec['debt_ratio'] = fnum(f.get('DEBT_ASSET_RATIO'))
                eps = fnum(f.get('BASIC_EPS'))
                ocf = fnum(f.get('PER_NETCASH_OPERATE'))
                if eps and eps > 0 and ocf is not None:
                    rec['ocf_to_profit'] = round(ocf / eps, 3)
                if rec['pe_ttm'] is None:
                    rec['pe_ttm'] = fnum(f.get('PE_TTM'))
                rec['pb'] = fnum(f.get('PB_TTM'))
                if rec['mktcap'] is None:
                    rec['mktcap'] = fnum(f.get('TOTAL_MARKET_CAP'))
            pmap = hk_profits
        else:
            f_new = a_fin.get(code, {})
            f_ann = a_ann.get(code, {})
            b = a_bal.get(code, {})
            rec['industry'] = (b.get('INDUSTRY_NAME') or f_new.get('BOARD_NAME') or
                               f_ann.get('BOARD_NAME') or None)
            rec['industry_code'] = b.get('INDUSTRY_CODE')
            # 同比用最新期，ROE/毛利率/负债率用年报（与港股口径一致）
            if f_new:
                fin_period = (f_new.get('REPORTDATE') or '')[:10] or None
                rec['rev_yoy'] = fnum(f_new.get('YSTZ'))
                rec['profit_yoy'] = fnum(f_new.get('SJLTZ'))
            if f_ann:
                if fin_period is None:
                    fin_period = (f_ann.get('REPORTDATE') or '')[:10] or None
                if rec['rev_yoy'] is None:
                    rec['rev_yoy'] = fnum(f_ann.get('YSTZ'))
                if rec['profit_yoy'] is None:
                    rec['profit_yoy'] = fnum(f_ann.get('SJLTZ'))
                rec['roe'] = fnum(f_ann.get('WEIGHTAVG_ROE'))
                rec['gross_margin'] = fnum(f_ann.get('XSMLL'))
                eps = fnum(f_ann.get('BASIC_EPS'))
                ocf = fnum(f_ann.get('MGJYXJJE'))
                if eps and eps > 0 and ocf is not None:
                    rec['ocf_to_profit'] = round(ocf / eps, 3)
            if b:
                rec['debt_ratio'] = fnum(b.get('DEBT_ASSET_RATIO'))
            pmap = a_profits
        rec['fin_period'] = fin_period

        # 年报净利 → CAGR / 连续亏损年数
        years = sorted(pmap.keys(), reverse=True)[:4]
        if years:
            seq = []
            for y in years:
                seq.append(fnum((pmap.get(y) or {}).get(code)))
            latest = seq[0]
            oldest = seq[-1]
            if latest is not None and oldest is not None and oldest > 0 and latest > 0 and len(years) >= 4:
                try:
                    rec['profit_cagr_3y'] = round(((latest / oldest) ** (1.0 / (len(years) - 1)) - 1) * 100, 2)
                except Exception:
                    rec['profit_cagr_3y'] = None
            ly = 0
            for v in seq:
                if v is None:
                    break
                if v < 0:
                    ly += 1
                else:
                    break
            rec['loss_years'] = ly

        # PEG
        if rec['pe_ttm'] is not None and rec['pe_ttm'] > 0 and rec['profit_yoy'] is not None \
                and rec['profit_yoy'] > 0:
            rec['peg'] = round(rec['pe_ttm'] / rec['profit_yoy'], 3)

        # 估值反向百分位：亏损股 PE<=0 无意义
        if rec['pe_ttm'] is not None and rec['pe_ttm'] <= 0:
            rec['pe_ttm'] = None

        # K 线指标
        closes = kline_cache.get(code)
        if closes:
            r1m = pct_return(closes, TD_1M)
            r3m = pct_return(closes, TD_3M)
            r6m = pct_return(closes, TD_6M)
            r1y = pct_return(closes, TD_1Y)
            r3y = pct_return(closes, TD_3Y)
            mdd = max_drawdown(closes, TD_1Y)
            shp = sharpe(closes, TD_1Y)
            r1m = None if (r1m is not None and abs(r1m) > 100) else r1m
            r3m = None if (r3m is not None and abs(r3m) > 200) else r3m
            r6m = None if (r6m is not None and abs(r6m) > 350) else r6m
            r1y = None if (r1y is not None and abs(r1y) > 400) else r1y
            r3y = None if (r3y is not None and abs(r3y) > 1000) else r3y
            mdd = None if (mdd is not None and (mdd > 0 or mdd < -100)) else mdd
            rec['return_1m'], rec['return_3m'], rec['return_6m'] = r1m, r3m, r6m
            rec['return_1y'], rec['return_3y'] = r1y, r3y
            rec['max_drawdown'], rec['sharpe'] = mdd, shp

        # 风控标记
        flags = []
        name_u = (nm or '').upper()
        is_st = 'ST' in name_u
        is_delisted = '退' in (nm or '')
        is_suspended = ('停' in (nm or '')) or (rec['close'] is not None and rec['turnover_rate'] == 0)
        listed_recent = False
        if rec['list_date']:
            try:
                ld = datetime.date.fromisoformat(rec['list_date'])
                if (today - ld).days < 60:
                    listed_recent = True
            except Exception:
                pass
        rec['is_st'], rec['is_delisted'], rec['is_suspended'] = is_st, is_delisted, is_suspended
        if is_st:
            flags.append('ST')
        if is_delisted:
            flags.append('DELISTED')
        if is_suspended:
            flags.append('SUSPENDED')
        if listed_recent:
            flags.append('NEW')
        if (rec['loss_years'] or 0) >= 2:
            flags.append('LOSS2')
        rec['risk_flag'] = ','.join(flags) or None
        rows.append(rec)

    log(f"  组装 {len(rows)} 行")

    # ---- 五维分位 ----
    kg = build_dim(rows, [('rev_yoy', False), ('profit_yoy', False), ('profit_cagr_3y', False)])
    kq = build_dim(rows, [('roe', False), ('gross_margin', False), ('ocf_to_profit', False)])
    ks = build_dim(rows, [('debt_ratio', True), ('loss_years', True)])
    kv = build_dim(rows, [('pe_ttm', True), ('pb', True), ('peg', True)])
    # 动量：近1年收益 + 回撤(反向) + 夏普
    km = build_dim(rows, [('return_1y', False), ('max_drawdown', True), ('sharpe', False)])
    # 兼容旧列
    pr_ret = percentile_ranks([(r['code'], r['return_3y']) for r in rows])
    pr_dd = percentile_ranks([(r['code'], (-r['max_drawdown']) if r['max_drawdown'] is not None else None)
                              for r in rows])
    pr_sh = percentile_ranks([(r['code'], r['sharpe']) for r in rows])

    for r in rows:
        c = r['code']
        r['k_growth'], r['k_quality'], r['k_safety'] = kg.get(c), kq.get(c), ks.get(c)
        r['k_value'], r['k_momentum'] = kv.get(c), km.get(c)
        r['k_ret'], r['k_drawdown'], r['k_sharpe'] = pr_ret.get(c), pr_dd.get(c), pr_sh.get(c)
        # 核心基本面（成长+质量）必须齐全，否则不给总分
        if r['k_growth'] is None or r['k_quality'] is None:
            r['k_all'] = None
            continue
        num = 0.0
        den = 0.0
        for name, w in WEIGHTS:
            v = r.get(name)
            if v is not None:
                num += w * v
                den += w
        r['k_all'] = round(num / den, 2) if den > 0 else None

    scored = sum(1 for r in rows if r['k_all'] is not None)
    log(f"  k_all 非空 {scored}/{len(rows)}")

    n_a = sum(1 for r in rows if r['exchange'] != 'HK')
    n_hk = sum(1 for r in rows if r['exchange'] == 'HK')
    log(f"  A股 {n_a} / 港股 {n_hk}")

    # 转储（写库失败可 --from-dump 秒级回灌，无需重跑抓取）
    if args.dump:
        try:
            with open(args.dump, 'w', encoding='utf-8') as fh:
                json.dump(rows, fh, ensure_ascii=False)
            log(f'  [转储] 已写入 {args.dump}（{len(rows)} 行）')
        except Exception as e:
            log(f'  [WARN] 转储失败: {e}')

    written = write_staging(rows)
    log(f"  写入 stock_scores_staging {written} 行，总耗时 {time.time() - t_start:.0f}s")

    status = 'ok' if written >= 5000 else ('partial' if written > 0 else 'failed')
    detail = (f"universe{len(universe)}只, 有报价{len(alive)}只, 写入{written}只, "
              f"A股{n_a}/港股{n_hk}, k_all非空{scored}, "
              f"A股财报{a_period or 'NA'}|年报{a_ann_period or 'NA'}, 港股财报{hk_period or 'NA'}")
    write_etl_log(written, status, detail)
    log(f"\n=== 完成 status={status} rows={written} ===")


if __name__ == '__main__':
    main()
