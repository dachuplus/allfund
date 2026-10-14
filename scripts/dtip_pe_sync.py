#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dtip_pe_sync.py — 定投助手 PE 历史缓存层夜间同步（方案 A）

每晚（北京 02:00 = UTC 18:00）由 GitHub Actions 调用：
  1. 经同源 EdgeOne 边缘函数 /api/dtip-pe-sync 取 7 指数全量 PE 日史
     （规避 GitHub 云 IP 被 csindex WAF 403；边缘函数在海外节点代取）
  2. 在本地预计算三档估值分位：
       pct_all  最新 PE 在「全部历史」中的分位
       pct_5y   最新 PE 在「近5年(约1210个交易日)」中的分位
       pct_3y   最新 PE 在「近3年(约726个交易日)」中的分位
     —— 但本脚本做「逐行」分位（截至该行当日为止的历史分位），
        供回测 walk-forward 与估值看板通用；缓存读端按需取最新一行或全序列。
  3. 增量写入 public.dtip_pe_history（PK (index_code, trade_date) ON CONFLICT DO NOTHING 幂等）

写入走 Supabase Management API（_pgsql.pg），绕过 RLS；前端 / 边缘函数读走 anon + SELECT 策略。

依赖：SUPABASE_PAT 或 SUPABASE_MGMT_TOKEN 环境变量（CI secrets.SUPABASE_MGMT_TOKEN）。
"""

import os
import sys
import json
import bisect
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _pgsql import pg  # noqa: E402

# 定投助手默认指数全集（与 csi-pe.js / dtip-backtest.js 保持一致）
DCA_INDICES = [
    '000510',  # 中证A500
    '000300',  # 沪深300
    '000905',  # 中证500
    '000906',  # 中证800
    '000852',  # 中证1000
    '932000',  # 中证2000
    '000985',  # 中证全指
]

PE_SYNC_URL = 'https://www.dachu.me/api/dtip-pe-sync'
HTTP_TIMEOUT = 30

# 近 5 年 / 近 3 年 交易日窗口（约数，与 csi-pe.js tail(1210)/tail(726) 一致）
WINDOW_5Y = 1210
WINDOW_3Y = 726

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'


def http_get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://www.dachu.me/'})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def compute_rows(series):
    """series: 升序 [(date_str, pe), ...]。返回 [(date, pe, pct_all, pct_5y, pct_3y), ...]。

    分位定义：截至该行当日为止的历史中，<= 当前 PE 的比例（含自身），0-100。
    用 running sorted + bisect 在 O(n log n) 内算全史分位；
    5y/3y 用定长滑动窗口（双端缓冲 + 有序窗口）维持。
    """
    out = []
    running_all = []
    win_5y = []          # 有序 PE 窗口（近 5y）
    buf_5y = []          # 按时间顺序的 PE 缓冲，用于窗口淘汰
    win_3y = []
    buf_3y = []
    for d, pe in series:
        # —— 全史分位 ——
        bisect.insort(running_all, pe)
        lo_all = bisect.bisect_right(running_all, pe)
        pct_all = round(lo_all / len(running_all) * 100, 2)

        # —— 近 5y 窗口分位 ——
        buf_5y.append(pe)
        bisect.insort(win_5y, pe)
        if len(buf_5y) > WINDOW_5Y:
            old = buf_5y.pop(0)
            idx = bisect.bisect_left(win_5y, old)
            if idx < len(win_5y) and win_5y[idx] == old:
                win_5y.pop(idx)
        cnt5 = bisect.bisect_right(win_5y, pe)
        pct_5y = round(cnt5 / len(win_5y) * 100, 2) if win_5y else None

        # —— 近 3y 窗口分位 ——
        buf_3y.append(pe)
        bisect.insort(win_3y, pe)
        if len(buf_3y) > WINDOW_3Y:
            old = buf_3y.pop(0)
            idx = bisect.bisect_left(win_3y, old)
            if idx < len(win_3y) and win_3y[idx] == old:
                win_3y.pop(idx)
        cnt3 = bisect.bisect_right(win_3y, pe)
        pct_3y = round(cnt3 / len(win_3y) * 100, 2) if win_3y else None

        out.append((d, pe, pct_all, pct_5y, pct_3y))
    return out


def ensure_table():
    sql = """
    CREATE TABLE IF NOT EXISTS public.dtip_pe_history (
      index_code   text        NOT NULL,
      trade_date   date        NOT NULL,
      pe           numeric,
      pct_all      numeric,
      pct_5y       numeric,
      pct_3y       numeric,
      name         text,
      created_at   timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (index_code, trade_date)
    );

    ALTER TABLE public.dtip_pe_history ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'dtip_pe_history'
          AND policyname = 'anon_select_dtip_pe'
      ) THEN
        CREATE POLICY anon_select_dtip_pe ON public.dtip_pe_history
          FOR SELECT USING (true);
      END IF;
    END $$;
    """
    pg(sql)
    print('  [table] dtip_pe_history 已就绪（含 anon SELECT 策略）')


def insert_rows(code, name, rows):
    """rows: [(date, pe, pct_all, pct_5y, pct_3y), ...]，按 500 行一批增量写入。"""
    BATCH = 500
    safe_name = name.replace("'", "''")
    n = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        vals = []
        for (d, pe, pa, p5, p3) in chunk:
            pa_s = 'NULL' if pa is None else repr(float(pa))
            p5_s = 'NULL' if p5 is None else repr(float(p5))
            p3_s = 'NULL' if p3 is None else repr(float(p3))
            vals.append(
                f"('{code}','{d}',{repr(float(pe))},{pa_s},{p5_s},{p3_s},'{safe_name}')"
            )
        sql = (
            "INSERT INTO public.dtip_pe_history "
            "(index_code, trade_date, pe, pct_all, pct_5y, pct_3y, name) VALUES "
            + ",".join(vals)
            + " ON CONFLICT (index_code, trade_date) DO NOTHING;"
        )
        pg(sql)
        n += len(chunk)
    return n


def main():
    print('============================================')
    print('  定投助手 · PE 历史缓存层夜间同步')
    print(f'  运行时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
    print('============================================')

    ensure_table()

    print(f'  [sync] 拉取 {PE_SYNC_URL}')
    try:
        payload = http_get_json(PE_SYNC_URL)
    except Exception as e:
        print(f'  [sync] 取数失败: {e}')
        return
    ok = payload.get('ok')
    total = payload.get('total')
    print(f'  [sync] 取数结果: ok={ok}/{total}')

    written_total = 0
    for item in (payload.get('data') or []):
        if not item.get('ok'):
            print(f'  [skip] {item.get("code")}: 取数未成功 ({item.get("detail")})')
            continue
        code = item['code']
        name = item.get('name') or code
        try:
            series = [(str(r['d']), float(r['pe'])) for r in item['series']]
        except (KeyError, TypeError, ValueError) as e:
            print(f'  [skip] {code} {name}: 序列解析失败 {e}')
            continue
        series.sort(key=lambda x: x[0])
        rows = compute_rows(series)
        n = insert_rows(code, name, rows)
        written_total += n
        print(f'  [ok]   {code} {name}: 写入 {n} 行 PE 历史（截至 {series[-1][0]}）')

    print('--------------------------------------------')
    print(f'  同步完成: 累计处理 {written_total} 行 PE 历史')
    print(f'  完成时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')


if __name__ == '__main__':
    main()
