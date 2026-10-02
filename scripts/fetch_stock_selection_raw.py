#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_stock_selection_raw.py — 抓取 A 股股票数据写入 stock_scrape_raw（选品·股票 tab 独立流水线第1级）

与基金 fund_scores / AI-PK 的 stock_scores 完全隔离：新建独立表 stock_scrape_raw。
本脚本只负责「抓取落库」，不计算任何跨截面百分位评分（k_* 由 promote_stock_selection.py 在评分阶段计算）。

数据源：
  - 成分股：东财 datacenter（沪深300+中证500+中证1000，约 1800 只 A 股）
  - 行情/估值：腾讯 qt.gtimg.cn 批量报价（pe/pb/市值/换手/涨跌幅/最新价）
  - 区间收益/回撤/夏普：新浪日线 K 线（scale=240, datalen=800 ≈ 近3年）
  - 二级行业：东财行业板块成员映射（best-effort，失败留空不阻塞）

风控标记（仅标记，不删除）：is_st / is_delisted / is_suspended / list_date(上市<60天剔除)。
落库：TRUNCATE stock_scrape_raw 后整表 INSERT，并写 etl_run_log。

用法：
  export SUPABASE_PAT="$(grep -E '^SUPABASE_PAT=' .env.local | cut -d= -f2-)"
  python3 scripts/fetch_stock_selection_raw.py            # 全量
  python3 scripts/fetch_stock_selection_raw.py --limit 10 # 调试
"""
import os, re, sys, json, math, time, datetime, argparse, subprocess, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
if not PAT:
    raise SystemExit("缺少 SUPABASE_PAT 环境变量。")
REF = "tqhtegazxykkqfcpejky"
MGMT_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

HEADERS_EM = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Referer': 'https://quote.eastmoney.com/', 'Accept': '*/*', 'Accept-Language': 'zh-CN,zh;q=0.9'}
HEADERS_TX = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://gu.qq.com/', 'Accept': '*/*'}
HEADERS_SINA = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.sina.com.cn/', 'Accept': '*/*'}

INDEX_CODES = ["000300", "000905", "000852"]
TD_1M, TD_3M, TD_6M, TD_1Y, TD_3Y = 21, 63, 126, 252, 756
BATCH_ID = datetime.datetime.now().strftime("batch_%Y%m%d_%H%M%S")
SCRAPE_SOURCE = "eastmoney-constituents+tencent-quotes+sina-kline"


def http_get(url, headers, timeout=20, tries=3):
    last = None
    for _ in range(tries):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r.text
            last = r.status_code
        except Exception as e:
            last = e
        time.sleep(1.0)
    return None


def fetch_constituents():
    out = {}
    for idx in INDEX_CODES:
        u = ("https://datacenter-web.eastmoney.com/api/data/v1/get"
             f"?reportName=RPT_INDEX_CONSTITUENT&columns=SECURITY_CODE,SECURITY_NAME_ABBR,SECUCODE,INDEX_CODE"
             f"&filter=(INDEX_CODE=%22{idx}%22)&pageSize=2000&sortColumns=SECURITY_CODE&sortTypes=1&source=WEB")
        txt = http_get(u, HEADERS_EM, timeout=25)
        if not txt:
            print(f"  [WARN] 成分股接口失败 INDEX={idx}", flush=True)
            continue
        try:
            j = json.loads(txt)
        except Exception:
            print(f"  [WARN] 成分股 JSON 解析失败 INDEX={idx}", flush=True)
            continue
        rows = (j.get('result') or {}).get('data') or []
        for r in rows:
            code = (r.get('SECURITY_CODE') or '').strip()
            name = (r.get('SECURITY_NAME_ABBR') or '').strip()
            secu = (r.get('SECUCODE') or '').strip()
            if not code:
                continue
            if not re.match(r'^(60|68|00|30|8)', code):
                continue
            suffix = secu.split('.')[-1] if '.' in secu else ('SH' if code[:1] in '68' else ('BJ' if code[:1] == '8' else 'SZ'))
            exch = {'SH': 'SH', 'SZ': 'SZ', 'BJ': 'BJ'}.get(suffix, 'SH' if code[:1] in '68' else ('BJ' if code[:1] == '8' else 'SZ'))
            out[code] = (code, name, secu, exch)
    print(f"  [成分股] 去重后 A 股成分股: {len(out)} 只", flush=True)
    return list(out.values())


def fetch_industry_map():
    m = {}
    t0 = time.time()
    BUDGET = 150
    u = ("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=300&po=1&fltt=2&invt=2&fid=f3"
         "&fs=m:90+t:2&fields=f12,f13,f14")
    txt = http_get(u, HEADERS_EM, timeout=20, tries=2)
    if not txt:
        print("  [行业] 板块列表获取失败，industry 留空", flush=True)
        return m
    try:
        boards = (json.loads(txt).get('data') or {}).get('diff') or []
    except Exception:
        return m
    for b in boards:
        if time.time() - t0 > BUDGET:
            break
        bk = (b.get('f12') or '').strip()
        bname = (b.get('f14') or '').strip()
        if not bk:
            continue
        pn = 1
        while True:
            if time.time() - t0 > BUDGET:
                break
            ub = ("https://push2.eastmoney.com/api/qt/clist/get?pn=%d&pz=500&po=1&fltt=2&invt=2&fid=f3"
                  f"&fs=b:{bk}&fields=f12,f13,f14" % pn)
            tb = http_get(ub, HEADERS_EM, timeout=20, tries=2)
            if not tb:
                break
            try:
                dd = json.loads(tb).get('data') or {}
                mem = dd.get('diff') or []
                tot = dd.get('total') or 0
            except Exception:
                break
            for x in mem:
                mc = (x.get('f12') or '').strip()
                if mc:
                    m[mc] = bname
            if len(mem) < 500 or pn * 500 >= (tot or 0):
                break
            pn += 1
            time.sleep(0.25)
        time.sleep(0.2)
    print(f"  [行业] 映射完成，覆盖 {len(m)} 只股票行业", flush=True)
    return m


def sym_of(code, exch):
    p = {'SH': 'sh', 'SZ': 'sz', 'BJ': 'bj'}.get(exch, 'sh')
    return f"{p}{code}"


def tx_field_map(parts):
    def g(i):
        try:
            return parts[i]
        except Exception:
            return ''
    return {'name': g(1), 'code': g(2), 'close': g(3), 'change_pct': g(32),
            'turnover': g(38), 'pe_ttm': g(39), 'mktcap': g(44), 'circ_mktcap': g(45), 'pb': g(46)}


def fetch_quotes_batch(syms):
    if not syms:
        return {}
    s = ','.join(syms)
    u = "https://qt.gtimg.cn/q=" + s
    txt = http_get(u, HEADERS_TX, timeout=20, tries=3)
    res = {}
    if not txt:
        return res
    for line in txt.strip().split('\n'):
        if '="' not in line:
            continue
        try:
            sym = line.split('="')[0].split('_')[-1]
            body = line.split('="')[1].rstrip('";')
            res[sym] = tx_field_map(body.split('~'))
        except Exception:
            continue
    return res


def fetch_kline(sym):
    u = ("https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
         f"CN_MarketData.getKLineData?symbol={sym}&scale=240&ma=no&datalen=800")
    txt = http_get(u, HEADERS_SINA, timeout=20, tries=3)
    if not txt:
        return None, None
    try:
        bars = json.loads(txt)
    except Exception:
        return None, None
    if not bars:
        return None, None
    closes, first_date = [], None
    for b in bars:
        try:
            closes.append(float(b['close']))
            if first_date is None:
                first_date = b.get('day', '')[:10]
        except Exception:
            pass
    return (closes, first_date) if closes else (None, None)


def pct_return(closes, bars_back):
    if len(closes) <= bars_back:
        return None
    old, new = closes[-(bars_back + 1)], closes[-1]
    if not old:
        return None
    return (new - old) / old * 100.0


def max_drawdown(closes, bars_back):
    window = closes if len(closes) <= bars_back else closes[-(bars_back + 1):]
    if len(window) < 2:
        return None
    peak, mdd = window[0], 0.0
    for p in window:
        if p > peak:
            peak = p
        if peak > 0:
            dd = (p - peak) / peak
            if dd < mdd:
                mdd = dd
    return mdd * 100.0


def sharpe(closes, bars_back):
    window = closes if len(closes) <= bars_back else closes[-(bars_back + 1):]
    if len(window) < 3:
        return None
    rets = [ (window[i] - window[i-1]) / window[i-1] for i in range(1, len(window)) if window[i-1] ]
    if len(rets) < 2:
        return None
    mean = sum(rets) / len(rets)
    var = sum((x - mean) ** 2 for x in rets) / (len(rets) - 1)
    std = math.sqrt(var)
    return (mean / std) * math.sqrt(252) if std else None


def risk_flags(name, list_date):
    name_u = (name or '').upper()
    is_st = 'ST' in name_u
    is_delisted = '退' in (name or '')
    is_suspended = '停' in (name or '')
    listed_recent = False
    if list_date:
        try:
            if (datetime.date.today() - datetime.date.fromisoformat(list_date)).days < 60:
                listed_recent = True
        except Exception:
            pass
    return is_st, is_delisted, is_suspended, listed_recent


def pg(sql, timeout=600):
    r = subprocess.run(['curl', '-s', '--max-time', str(timeout), '-X', 'POST', MGMT_API,
                        '-H', f'Authorization: Bearer {PAT}', '-H', 'Content-Type: application/json',
                        '-d', json.dumps({'query': sql})], capture_output=True, text=True, timeout=timeout + 30)
    if r.returncode != 0:
        raise RuntimeError(f'curl fail: {r.stderr[:100]}')
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
    return 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"


def write_scrape_raw(rows):
    pg("TRUNCATE TABLE public.stock_scrape_raw;")
    cols = ["code", "name", "exchange", "secid", "industry", "industry_code", "close", "pe_ttm", "pb",
            "mktcap", "circ_mktcap", "turnover_rate", "return_1m", "return_3m", "return_6m", "return_1y",
            "return_3y", "daily_change", "max_drawdown", "sharpe", "is_st", "is_delisted", "is_suspended",
            "list_date", "scrape_batch_id", "scrape_source"]
    BATCH = 150
    now = datetime.datetime.now().isoformat()
    total = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        val_parts = []
        for r in chunk:
            vals = [sql_str(r['code']), sql_str(r['name']), sql_str(r['exchange']), sql_str(r['secid']),
                    sql_str(r['industry']), sql_str(r['industry_code']), sql_num(r['close']), sql_num(r['pe_ttm']),
                    sql_num(r['pb']), sql_num(r['mktcap']), sql_num(r['circ_mktcap']), sql_num(r['turnover_rate']),
                    sql_num(r['return_1m']), sql_num(r['return_3m']), sql_num(r['return_6m']), sql_num(r['return_1y']),
                    sql_num(r['return_3y']), sql_num(r['daily_change']), sql_num(r['max_drawdown']), sql_num(r['sharpe']),
                    'true' if r['is_st'] else 'false', 'true' if r['is_delisted'] else 'false',
                    'true' if r['is_suspended'] else 'false', sql_str(r['list_date']),
                    sql_str(BATCH_ID), sql_str(SCRAPE_SOURCE)]
            val_parts.append("(" + ",".join(vals) + ")")
        try:
            pg(f"INSERT INTO public.stock_scrape_raw ({','.join(cols)}) VALUES " + ",".join(val_parts) + ";", timeout=300)
            total += len(chunk)
        except Exception as e:
            print(f"  [ERR] 批量写入失败(跳过该批): {e}", flush=True)
    return total


def write_etl_log(rows, status, detail):
    today = datetime.date.today().isoformat()
    now = datetime.datetime.now().isoformat()
    sql = (f"INSERT INTO public.etl_run_log (run_date, step_name, status, start_time, end_time, "
           f"rows_affected, error_message) VALUES ('{today}','fetch_stock_selection_raw','{status}','{now}','{now}',"
           f"{rows},'{detail.replace(chr(39), chr(39)*2)}');")
    try:
        pg(sql, timeout=120)
    except Exception as e:
        print(f"  [WARN] etl_run_log 写入失败: {e}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='限制处理的成分股数量（调试用）')
    ap.add_argument('--skip-industry', action='store_true', help='跳过行业映射')
    args = ap.parse_args()
    print('=' * 64, flush=True)
    print(f' 抓取 A 股股票数据 → stock_scrape_raw  (batch={BATCH_ID})', flush=True)
    print('=' * 64, flush=True)

    constituents = fetch_constituents()
    if not constituents:
        print('  [ERR] 成分股为空，终止', flush=True)
        write_etl_log(0, 'failed', '成分股接口返回空')
        sys.exit(1)

    industry_map = {} if args.skip_industry else fetch_industry_map()

    print('  [行情] 腾讯批量报价...', flush=True)
    syms = [sym_of(c, e) for (c, n, s, e) in constituents]
    quote_map = {}
    for i in range(0, len(syms), 50):
        quote_map.update(fetch_quotes_batch(syms[i:i + 50]))
        time.sleep(0.15)
    print(f'  [行情] 获取到 {len(quote_map)} 只报价', flush=True)

    print('  [K线] 新浪日线计算收益/回撤/夏普...', flush=True)
    kline_cache = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        fut = {ex.submit(fetch_kline, sym): sym for sym in syms}
        for f in as_completed(fut):
            sym = fut[f]
            try:
                kline_cache[sym] = f.result()
            except Exception:
                kline_cache[sym] = (None, None)
    print(f'  [K线] 获取到 {sum(1 for v in kline_cache.values() if v[0])} 只有效 K 线', flush=True)

    rows, ok = [], 0
    for (code, name, secu, exch) in constituents:
        if args.limit and ok >= args.limit:
            break
        sym = sym_of(code, exch)
        q = quote_map.get(sym, {})
        closes, first_date = kline_cache.get(sym, (None, None))
        nm = (q.get('name') or name or '').strip()
        if not nm:
            continue
        def fnum(x):
            try:
                return float(x)
            except Exception:
                return None
        close = fnum(q.get('close')); daily_change = fnum(q.get('change_pct'))
        pe = fnum(q.get('pe_ttm')); pb = fnum(q.get('pb')); mktcap = fnum(q.get('mktcap'))
        circ = fnum(q.get('circ_mktcap')); turnover = fnum(q.get('turnover'))
        r1m = pct_return(closes, TD_1M) if closes else None
        r3m = pct_return(closes, TD_3M) if closes else None
        r6m = pct_return(closes, TD_6M) if closes else None
        r1y = pct_return(closes, TD_1Y) if closes else None
        r3y = pct_return(closes, TD_3Y) if closes else None
        mdd = max_drawdown(closes, TD_1Y) if closes else None
        shp = sharpe(closes, TD_1Y) if closes else None
        r1m = None if (r1m is not None and abs(r1m) > 100) else r1m
        r3m = None if (r3m is not None and abs(r3m) > 200) else r3m
        r6m = None if (r6m is not None and abs(r6m) > 350) else r6m
        r1y = None if (r1y is not None and abs(r1y) > 400) else r1y
        r3y = None if (r3y is not None and abs(r3y) > 1000) else r3y
        mdd = None if (mdd is not None and (mdd > 0 or mdd < -100)) else mdd
        secid_prefix = '1' if exch == 'SH' else '0'
        secid = f"{secid_prefix}.{code}"
        is_st, is_delisted, is_suspended, _ = risk_flags(nm, first_date)
        rows.append({'code': f"{code}.{exch}", 'name': nm, 'exchange': exch, 'secid': secid,
                     'industry': industry_map.get(code), 'industry_code': None, 'close': close,
                     'pe_ttm': pe, 'pb': pb, 'mktcap': mktcap, 'circ_mktcap': circ, 'turnover_rate': turnover,
                     'return_1m': r1m, 'return_3m': r3m, 'return_6m': r6m, 'return_1y': r1y, 'return_3y': r3y,
                     'daily_change': daily_change, 'max_drawdown': mdd, 'sharpe': shp,
                     'is_st': is_st, 'is_delisted': is_delisted, 'is_suspended': is_suspended, 'list_date': first_date})
        ok += 1

    print(f'  [合并] 构建 {len(rows)} 行', flush=True)
    print('  [写入] stock_scrape_raw ...', flush=True)
    written = write_scrape_raw(rows)
    print(f'  [写入] 完成，scrape_raw 写入 {written} 行', flush=True)
    status = 'ok' if written >= 1500 else ('partial' if written > 0 else 'failed')
    detail = f"成分股{len(constituents)}只, 报价{len(quote_map)}只, K线有效{sum(1 for r in rows if r['return_3y'] is not None)}只, 行业覆盖{len(industry_map)}只"
    write_etl_log(written, status, detail)
    print(f'\n=== 抓取完成：status={status}, rows={written} ===', flush=True)


if __name__ == '__main__':
    main()
