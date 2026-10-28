#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dtip_pe_sync_local.py — 本地直连 csindex 同步 PE 历史（绕过边缘函数超时）

背景：/api/dtip-pe-sync 边缘函数串行拉取 34 支指数全史时，累计耗时超出函数执行时限
（实测 34 支串行 ~60-90s，远超 Pages Functions 超时），导致夜间同步取数失败。

本脚本改为**本地直连 csindex 官网**（沙箱出口可达，已实测）抓取全史 PE 日史，
复用 dtip_pe_sync.py 的 compute_rows / insert_rows 写库，经 Supabase Management API（_pgsql.pg）写入
public.dtip_pe_history。幂等：PK (index_code, trade_date) ON CONFLICT DO NOTHING。

用法：在 allfund/ 目录下
  set -a && . ./.env.local && set +a && python3 scripts/dtip_pe_sync_local.py
"""
import os
import sys
import json
import time
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dtip_pe_sync import compute_rows, insert_rows, ensure_table, DCA_INDICES  # noqa: E402

CSI_BASE = 'https://www.csindex.com.cn/csindex-home/perf/indexCsiDsPe'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'


def norm_date(s):
    if not s or len(s) != 8:
        return None
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}'


def is_finite(v):
    try:
        f = float(v)
        return f == f and f > 0
    except Exception:
        return False


def fetch_csindex(code, tries=3):
    """直连 csindex 取全史 PE 序列，返回 (series[(date,pe)], name)。"""
    last_err = None
    for attempt in range(tries):
        try:
            url = f'{CSI_BASE}?indexCode={code}'
            req = urllib.request.Request(url, headers={
                'User-Agent': UA,
                'Referer': f'https://www.csindex.com.cn/zh-CN/indices/index-detail/{code}',
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode('utf-8'))
            rows = (data and data.get('data')) or []
            series = []
            name = ''
            for x in rows:
                d = norm_date(str(x.get('tradeDate', '')))
                pe = x.get('peg')
                if d and is_finite(pe):
                    series.append((d, float(pe)))
                if x.get('indexName'):
                    name = x.get('indexName')
            if rows:
                name = rows[-1].get('indexName', '') or name
            return series, (name or code)
        except Exception as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'{code} 取数失败: {last_err}')


def main():
    print('============================================')
    print('  定投助手 · 本地直连 csindex PE 历史同步')
    print(f'  运行时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
    print(f'  指数数量: {len(DCA_INDICES)}')
    print('============================================')

    ensure_table()

    written_total = 0
    for idx, code in enumerate(DCA_INDICES):
        try:
            series, name = fetch_csindex(code)
        except Exception as e:
            print(f'  [skip] {code}: {e}')
            continue
        if not series:
            print(f'  [skip] {code}: 空序列')
            continue
        series.sort(key=lambda x: x[0])
        rows = compute_rows(series)
        n = insert_rows(code, name, rows)
        written_total += n
        print(f'  [{idx+1:2d}/{len(DCA_INDICES)}] {code} {name}: 写入 {n} 行（截至 {series[-1][0]}）')
        time.sleep(0.2)  # 轻微错峰，规避 csindex 瞬时限流

    print('--------------------------------------------')
    print(f'  同步完成: 累计处理 {written_total} 行 PE 历史')
    print(f'  完成时间: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')


if __name__ == '__main__':
    main()
