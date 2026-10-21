#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dtip_weekly_commit.py — 定投助手 Part2 服务端真实定时定投写入

每周一（北京时间 09:00，即 UTC 周一 01:00）由 GitHub Actions 自动触发：
  1. 经同源边缘函数 /api/csi-pe 取 7 指数当前 PE 的**滚动 5 年分位 pct_5y**
     （规避 GitHub 云 IP 被 csindex WAF 403；边缘函数在海外节点代取）
  2. 按 5 档估值区间映射本周操作（与前端 /api/dtip-backtest 完全一致：
     低估买入 / 合理小额买 / 高估观望 / 极度高估按持仓市值 15% 赎回）
  3. 经腾讯财经 K 线（主）/ 新浪财经 K 线（回退）取最新收盘价
  4. 计算有符号份额 shares = amount / close（卖出为负）
  5. INSERT 进 public.dtip_auto_records（PK (index_code, trade_date) ON CONFLICT DO NOTHING 幂等）

写入走 Supabase Management API（_pgsql.pg），绕过 RLS；前端读取走 anon + SELECT 策略。

约束（与回测一致）：
  - 【2026-10-22】分位锚由「全史 pct_all」改为「滚动 5 年 pct_5y」：
    全史锚会被早年高 PE 体制长期污染（宽基指数永远显示便宜 → 几乎不触发卖出 /
    短历史指数锚太短 → 过半时间卖出），滚动窗口才是真正的均值回复。
  - 每周金额 450/300/150 由「指数波动周期测算法」反推（10 万本金 ÷ 历史最长买方季资金需求），
    使固定本金在样本期内不出现资金耗尽。

约束（与回测一致）：
  - 中证2000(932000) 在免费可直连源均无历史收盘 → 自动跳过，仅留估值看板。
  - 不回填历史：从首次运行当周起逐周累积真实记录。
"""

import os
import sys
import json
import urllib.request
from datetime import datetime, timedelta, timezone

# 让脚本在 CI（python scripts/xxx.py，cwd=repo 根）与本地均可 import 同目录的 _pgsql
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _pgsql import pg  # noqa: E402

# ============ 常量（与前端 ZONES / DtipPanel.vue / dtip-backtest.js 完全一致）============
DCA_INDICES = [
    ('000510', '中证A500'),
    ('000300', '沪深300'),
    ('000905', '中证500'),
    ('000906', '中证800'),
    ('000852', '中证1000'),
    ('932000', '中证2000'),
    ('000985', '中证全指'),
]

# 5 档估值区间 → 本周操作（与前端 ZONES / dtip-backtest.js 完全一致）
#   buy  = 买入固定金额；hold = 观望不操作；trim = 按持仓市值比例赎回
#   【2026-10-22 定版】金额由「指数波动周期测算法」反推：10 万本金 ÷ 历史最长买方季资金需求
#   （7 指数中最坏者为中证500，scale=1.0 时需 66.4 万 → 缩放 0.150）。
#   高估区由「买入 500」改「观望」：不在偏贵位置继续消耗资金。
ZONES = [
    {'key': 'deep_low',  'label': '极度低估', 'min': 0,        'max': 10,       'mode': 'buy',  'amount':  450},
    {'key': 'low',       'label': '低估',   'min': 10,       'max': 30,       'mode': 'buy',  'amount':  300},
    {'key': 'normal',    'label': '估值合理', 'min': 30,       'max': 70,       'mode': 'buy',  'amount':  150},
    {'key': 'high',      'label': '高估',   'min': 70,       'max': 90,       'mode': 'hold', 'amount':    0},
    {'key': 'deep_high', 'label': '极度高估', 'min': 90,       'max': float('inf'), 'mode': 'trim', 'amount': 0, 'sell_pct': 0.15},
]

# 极度高估时按「持仓市值的比例」赎回（非固定金额），使回补额随仓位规模自动伸缩
SELL_RATIO = 0.15

# 定投助手资金池模型：每个指数以 10 万元为唯一初始本金，每周一按估值分位在 现金↔权益 间调仓
INIT_CAPITAL = 100000

CSI_PE_URL = 'https://www.dachu.me/api/csi-pe'
TENCENT_KLINE = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get'
SINA_KLINE = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData'
HTTP_TIMEOUT = 15
KLINE_COUNT = 3200

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'


def http_get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://www.dachu.me/'})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def zone_of(pct):
    if pct is None:
        return None
    for z in ZONES:
        if z['min'] <= pct < z['max']:
            return z
    return ZONES[-1]


def monday_of_this_week(now=None):
    """返回当前周周一日期（与 cron 周一执行语义一致；手动触发时取最近一个周一）。"""
    now = now or datetime.now(timezone.utc)
    return (now - timedelta(days=now.weekday())).date()


# ============ 数据源 ============

def fetch_pe_from_cache():
    """从 dtip_pe_history 缓存表读取每个指数最新一行（pe/pct_5y/pct_all/name）。

    【2026-10-22】主判据改为 pct_5y（滚动 5 年分位），与回测引擎口径一致：
    全史分位 pct_all 会被早年高 PE 体制长期污染，导致宽基指数「永远便宜」从而几乎不触发卖出。
    返回 {code: {pe, pct_5y, pct_all, name}}；表不存在或异常时返回空字典（上层回退实时）。
    """
    sql = (
        "SELECT index_code, pe, pct_5y, pct_all, name FROM ("
        "  SELECT index_code, pe, pct_5y, pct_all, name,"
        "         row_number() OVER (PARTITION BY index_code ORDER BY trade_date DESC) AS rn"
        "  FROM public.dtip_pe_history"
        ") t WHERE rn = 1;"
    )
    rows = pg(sql) or []
    out = {}
    for r in rows:
        code = r.get('index_code')
        # 优先滚动 5 年；pct_5y 缺失时退回全史，保证 Cron 不因缺列而漏写
        pct = r.get('pct_5y')
        if pct is None:
            pct = r.get('pct_all')
        if code is None or pct is None:
            continue
        out[code] = {
            'pe': r.get('pe'),
            'pct_5y': float(pct),
            'pct_all': float(r['pct_all']) if r.get('pct_all') is not None else float(pct),
            'name': r.get('name') or code,
        }
    return out


def fetch_csi_pe_live(codes):
    """返回 {code: {pe, pct_5y, pct_all, name}}；失败的 code 不入字典。
    优先取滚动 5 年分位 pct_5y，缺失时退回 pct_all。"""
    codes_arg = ','.join(c for c, _ in codes)
    url = f'{CSI_PE_URL}?codes={codes_arg}'
    out = {}
    try:
        data = http_get_json(url)
    except Exception as e:
        print(f'  [csi-pe] 拉取失败: {e}')
        return out
    for row in (data.get('data') or []):
        if not row.get('ok'):
            continue
        code = row.get('code')
        pct5 = row.get('pct_5y')
        pctall = row.get('pct_all')
        pct = pct5 if pct5 is not None else pctall
        if code is None or pct is None:
            continue
        out[code] = {
            'pe': row.get('pe'),
            'pct_5y': float(pct),
            'pct_all': float(pctall) if pctall is not None else float(pct),
            'name': row.get('name') or dict(codes).get(code, code),
        }
    return out


def fetch_csi_pe(codes):
    """优先读 dtip_pe_history 缓存（服务端 pg），缺失的 code 回退实时 /api/csi-pe。"""
    out = {}
    try:
        cache = fetch_pe_from_cache()
        for code, _ in codes:
            if code in cache:
                out[code] = cache[code]
        print(f'  [csi-pe] 缓存命中 {len(out)}/{len(codes)} 指数')
    except Exception as e:
        print(f'  [csi-pe] 缓存读取失败，转实时: {e}')
    if len(out) < len(codes):
        missing = [c for c, _ in codes if c not in out]
        print(f'  [csi-pe] 实时补齐 {len(missing)} 个缺失指数')
        live = fetch_csi_pe_live([(c, n) for c, n in codes if c in missing])
        out.update(live)
    return out


def fetch_close_tencent(code):
    """腾讯财经 K 线主源：web.ifzq.gtimg.cn。返回最新收盘价或 None。"""
    symbol = f'sh{code}'
    url = f'{TENCENT_KLINE}?param={symbol},day,,,{KLINE_COUNT},qfq'
    try:
        data = http_get_json(url)
        node = (data.get('data') or {}).get(symbol) or {}
        rows = node.get('qfqday') or node.get('day') or []
        if not rows:
            return None
        series = []
        for r in rows:
            if isinstance(r, list) and len(r) >= 3:
                series.append((str(r[0])[:10], float(r[2])))
        series = [(d, c) for d, c in series if d and c > 0]
        if not series:
            return None
        series.sort(key=lambda x: x[0])
        return series[-1][1]
    except Exception:
        return None


def fetch_close_sina(code):
    """新浪财经 K 线回退源。返回最新收盘价或 None。"""
    prefix = 'sz' if code.startswith('932') else 'sh'
    symbol = f'{prefix}{code}'
    url = f'{SINA_KLINE}?symbol={symbol}&scale=240&ma=no&datalen={KLINE_COUNT}'
    try:
        data = http_get_json(url)
        if not isinstance(data, list) or not data:
            return None
        series = []
        for r in data:
            d = str(r.get('day') or '')[:10]
            c = r.get('close')
            try:
                c = float(c)
            except (TypeError, ValueError):
                continue
            if d and c > 0:
                series.append((d, c))
        if not series:
            return None
        series.sort(key=lambda x: x[0])
        return series[-1][1]
    except Exception:
        return None


def fetch_close(code):
    """主源腾讯 → 回退新浪；均无则 None（932000 走此路径被跳过）。"""
    c = fetch_close_tencent(code)
    if c:
        return c, 'tencent'
    c = fetch_close_sina(code)
    if c:
        return c, 'sina'
    return None, None


def fetch_prior_state(code, trade_date):
    """读取该指数在 trade_date 之前的所有记录，重建资金池状态。
    返回 (deployed, withdrawn, shares, cash)：
      deployed/withdrawn = 累计买入/赎回金额；shares = 累计份额；cash = 初始本金 - deployed + withdrawn。
    """
    sql = (
        "SELECT amount, shares FROM public.dtip_auto_records "
        f"WHERE index_code = '{code}' AND trade_date < '{trade_date}' ORDER BY trade_date;"
    )
    rows = pg(sql) or []
    deployed = 0.0
    withdrawn = 0.0
    shares = 0.0
    for r in rows:
        amt = float(r.get('amount') or 0)
        sh = float(r.get('shares') or 0)
        shares += sh
        if amt > 0:
            deployed += amt
        elif amt < 0:
            withdrawn += -amt
    cash = INIT_CAPITAL - deployed + withdrawn
    return deployed, withdrawn, shares, cash


# ============ 建表（幂等，含 anon SELECT RLS）============

def ensure_table():
    sql = """
    CREATE TABLE IF NOT EXISTS public.dtip_auto_records (
      index_code   text        NOT NULL,
      index_name   text        NOT NULL,
      trade_date   date        NOT NULL,
      pe           numeric,
      pe_pct       numeric,
      zone         text,
      amount       numeric     NOT NULL,   -- 有符号：买入为正、卖出为负
      close_price  numeric,
      shares       numeric     NOT NULL,   -- 有符号：买入为正、卖出为负
      created_at   timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (index_code, trade_date)
    );

    ALTER TABLE public.dtip_auto_records ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'dtip_auto_records'
          AND policyname = 'anon_select_dtip'
      ) THEN
        CREATE POLICY anon_select_dtip ON public.dtip_auto_records
          FOR SELECT USING (true);
      END IF;
    END $$;
    """
    pg(sql)
    print('  [table] dtip_auto_records 已就绪（含 anon SELECT 策略）')


# ============ 主流程 ============

def main():
    print('============================================')
    print('  定投助手 · 周一定投真实写入')
    print(f'  运行时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
    print('============================================')

    trade_date = monday_of_this_week()
    print(f'  交易日期(trade_date，本周一): {trade_date}')

    ensure_table()

    pe_map = fetch_csi_pe(DCA_INDICES)
    print(f'  [csi-pe] 取到 {len(pe_map)}/{len(DCA_INDICES)} 指数 PE 分位')

    inserted = 0
    skipped = 0
    for code, name in DCA_INDICES:
        eva = pe_map.get(code)
        if not eva:
            print(f'  [skip] {code} {name}: 无 PE 分位（csi-pe 未覆盖）')
            skipped += 1
            continue
        zone = zone_of(eva['pct_5y'])
        pct_used = eva['pct_5y']
        if zone is None:
            print(f'  [skip] {code} {name}: 估值分位缺失，无法判定档位')
            skipped += 1
            continue
        close, src = fetch_close(code)
        if close is None:
            print(f'  [skip] {code} {name}: 无可用收盘价（如中证2000，跳过真实交易）')
            skipped += 1
            continue

        # 资金池状态：读历史记录重建（首个运行周历史为空，现金=初始本金）
        deployed, withdrawn, shares, cash = fetch_prior_state(code, trade_date)
        holdings_value = shares * close

        if zone['mode'] == 'hold':
            # 高估区：不买也不卖，等待估值进一步走向极端（避免在偏贵位置继续消耗资金）
            print(f'  [skip] {code} {name}: 处于「{zone["label"]}」区，本周观望不操作（分位={pct_used:.1f}%）')
            skipped += 1
            continue

        if zone['mode'] == 'buy':
            # 买入：从现金池支出，封顶可用现金
            exec_amt = min(zone['amount'], cash)
            if exec_amt <= 0:
                print(f'  [skip] {code} {name}: 现金池已耗尽（满仓），本周不再买入')
                skipped += 1
                continue
            exec_shares = exec_amt / close
            signed_amt = exec_amt
        else:
            # trim：按「当前持仓市值的固定比例」赎回，自动跟随仓位规模伸缩
            sell_pct = zone.get('sell_pct') or SELL_RATIO
            exec_amt = holdings_value * sell_pct
            if exec_amt <= 0.01:
                print(f'  [skip] {code} {name}: 无持仓，无法卖出（已跳过）')
                skipped += 1
                continue
            exec_shares = -exec_amt / close
            signed_amt = -exec_amt

        sql = (
            "INSERT INTO public.dtip_auto_records "
            "(index_code, index_name, trade_date, pe, pe_pct, zone, amount, close_price, shares) "
            f"VALUES ('{code}', '{name}', '{trade_date}', "
            f"{repr(float(eva['pe']))}, {repr(float(pct_used))}, '{zone['label']}', "
            f"{repr(float(signed_amt))}, {repr(float(close))}, {repr(float(exec_shares))}) "
            "ON CONFLICT (index_code, trade_date) DO NOTHING;"
        )
        pg(sql)
        inserted += 1
        op = '买入' if signed_amt > 0 else '卖出'
        print(f'  [ok]    {code} {name}: 区间={zone["label"]} {op} {signed_amt:+} 收盘={close:.2f} 份额={exec_shares:+.4f} 源={src}')

    print('--------------------------------------------')
    print(f'  写入完成: 新增 {inserted} 条 / 跳过 {skipped} 条；trade_date={trade_date}')
    print(f'  完成时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')


if __name__ == '__main__':
    main()
