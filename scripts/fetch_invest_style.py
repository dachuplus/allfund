#!/usr/bin/env python3
"""
fetch_invest_style.py — 抓取基金「最新报告期投资风格」并写回 fund_scores。

数据源：公开网络的 F10 特色数据页 tsdata_{code}.html（静态 HTML，UTF-8）。
页面结构：<div id="jjtzfg"> → <table class="fgtb">，表头后第一行即最新报告期：
    <tr><td >2026年3季度</td><td >大盘价值</td></tr>
左侧九宫格是图片，不解析；表头用 <th>，正则只匹配 <td>，不会误取。

设计要点（2026-11-13 实测）：
  - 风格是季度数据，不适合每日全量抓；由 .github/workflows/invest-style.yml
    每周一全量跑一次 + 手动触发，不污染每日评分流水线。
  - 低并发（默认 3）：并发 10 时 120 只仅 25 个页面完整（限流），
    并发 3 时 60 只页面 100% 完整。
  - 页面完整性校验：必须含「标准差」且长度 > 20KB，否则视为限流残缺页并重试。
  - 解析失败 / 页面无风格块：跳过该基金，**不清空旧值**（防限流把全库刷成 NULL）。
  - 风格值白名单 9 种（大盘/中盘/小盘 × 价值/平衡/成长），报告期须匹配
    YYYY年[1-4]季度，脏值不入库。
  - 批量 UPDATE ... FROM (VALUES ...) 写回，避免 2.8 万次单条 UPDATE。
  - 结束后 REFRESH MATERIALIZED VIEW fund_scores_main（默认「主代码」列表读它）。
  - 护栏：完整页面率 < 60%，或成功解析行数低于 --min-ok 时中止且不写库。

用法：
  python3 scripts/fetch_invest_style.py --dry-run --limit 30    # 本地小样本验证
  python3 scripts/fetch_invest_style.py                        # 全量
  python3 scripts/fetch_invest_style.py --only-missing         # 只抓尚无风格的（续跑）
"""
import os
import re
import sys
import time
import argparse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF') or 'tqhtegazxykkqfcpejky'
MGMT_API = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
TOKEN = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://fundf10.eastmoney.com/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

# 9 种风格组合（实测 tsdata 页面取值域）
STYLES = {f'{cap}{val}' for cap in ('大盘', '中盘', '小盘')
          for val in ('价值', '平衡', '成长')}
PERIOD_RE = re.compile(r'^\d{4}年[1-4]季度$')
FGTB_RE = re.compile(r'<table[^>]*class=["\']fgtb["\'][^>]*>(.*?)</table>', re.S)
ROW_RE = re.compile(r'<tr>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*</tr>')


def pg(sql, timeout=300):
    """执行单条 SQL（Management API），带 3 次重试。"""
    if not TOKEN:
        raise RuntimeError('缺少 SUPABASE_PAT / SUPABASE_MGMT_TOKEN')
    last = None
    for attempt in range(3):
        try:
            r = requests.post(
                MGMT_API,
                headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
                json={'query': sql},
                timeout=timeout,
            )
            if r.status_code >= 500:
                last = f'HTTP {r.status_code}: {r.text[:200]}'
                time.sleep(5)
                continue
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict):
                if data.get('message'):
                    raise RuntimeError(str(data['message'])[:300])
                return []
            return data if isinstance(data, list) else []
        except requests.exceptions.RequestException as e:
            last = str(e)
            time.sleep(5)
    raise RuntimeError(f'SQL 重试 3 次仍失败: {last}')


def parse_style(html):
    """返回 (报告期, 风格)；页面无风格块或脏值返回 None。"""
    m = FGTB_RE.search(html)
    if not m:
        return None
    row = ROW_RE.search(m.group(1))
    if not row:
        return None
    period = row.group(1).replace('&nbsp;', ' ').strip()
    style = row.group(2).replace('&nbsp;', ' ').strip()
    if not PERIOD_RE.match(period) or style not in STYLES:
        return None
    return period, style


def fetch_one(code, retries=2):
    """抓取单只基金。返回 (完整页面数 0/1, (code, period, style) 或 None, 状态)。"""
    base = code.split('.')[0]
    url = f'https://fundf10.eastmoney.com/tsdata_{base}.html'
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode('utf-8', errors='replace')
            # 限流时上游返回残缺页：长度骤减且缺固定风险指标表
            if len(html) < 20000 or '标准差' not in html:
                if attempt < retries:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                return 0, None, 'incomplete'
            parsed = parse_style(html)
            if parsed:
                return 1, (code, parsed[0], parsed[1]), 'styled'
            return 1, None, 'no_style'
        except Exception:
            if attempt < retries:
                time.sleep(0.8 * (attempt + 1))
                continue
            return 0, None, 'error'
    return 0, None, 'error'


def sql_lit(s):
    return "'" + str(s).replace("'", "''") + "'"


def batch_update(rows, batch_size=400):
    """批量 UPDATE，返回写入行数。"""
    written = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        values = ', '.join(
            f'({sql_lit(c)},{sql_lit(p)},{sql_lit(s)})' for c, p, s in chunk
        )
        pg(f"""UPDATE public.fund_scores f
               SET invest_style = v.s, style_period = v.p
               FROM (VALUES {values}) AS v(c,p,s)
               WHERE f.c = v.c;""", timeout=300)
        written += len(chunk)
    return written


def main():
    ap = argparse.ArgumentParser(description='抓取基金最新报告期投资风格')
    ap.add_argument('--workers', type=int, default=3, help='并发数（默认 3，>5 会被限流）')
    ap.add_argument('--delay', type=float, default=0.12, help='提交间隔秒数')
    ap.add_argument('--limit', type=int, default=0, help='只处理前 N 只（调试用，0=全部）')
    ap.add_argument('--offset', type=int, default=0, help='起始偏移（配合 --limit 分批）')
    ap.add_argument('--only-missing', action='store_true', help='只抓 invest_style 为空的基金')
    ap.add_argument('--dry-run', action='store_true', help='只抓取统计，不写库 / 不刷新视图')
    ap.add_argument('--min-ok', type=int, default=0,
                    help='成功解析风格的最少行数护栏（0=按样本量自动推断）')
    args = ap.parse_args()

    where = 'WHERE invest_style IS NULL' if args.only_missing else ''
    sql = f'SELECT c FROM public.fund_scores {where} ORDER BY c'
    if args.limit:
        sql += f' LIMIT {args.limit} OFFSET {args.offset}'
    codes = [r['c'] for r in pg(sql, timeout=300)]
    if not codes:
        print('没有需要抓取的基金，退出', flush=True)
        return

    print('=' * 64, flush=True)
    print(f'投资风格抓取（最新报告期）  共 {len(codes)} 只', flush=True)
    print(f'并发 {args.workers} / 间隔 {args.delay}s / dry-run={args.dry_run}', flush=True)
    print('=' * 64, flush=True)

    complete = 0
    styled = []
    stats = {'styled': 0, 'no_style': 0, 'incomplete': 0, 'error': 0}
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {}
        for code in codes:
            futures[pool.submit(fetch_one, code)] = code
            time.sleep(args.delay / max(args.workers, 1))
        done = 0
        for fut in as_completed(futures):
            done += 1
            ok, row, state = fut.result()
            complete += ok
            stats[state] = stats.get(state, 0) + 1
            if row:
                styled.append(row)
            if done % 200 == 0 or done == len(futures):
                pct = done * 100.0 / len(futures)
                print(f'  进度 {done}/{len(futures)} ({pct:.1f}%) | '
                      f'完整 {complete} | 有风格 {len(styled)} | '
                      f'无风格 {stats["no_style"]} | 残缺 {stats["incomplete"]} | '
                      f'耗时 {time.time()-started:.0f}s', flush=True)

    rate = complete * 100.0 / len(codes)
    print('-' * 64, flush=True)
    print(f'完整页面率 {rate:.1f}% ({complete}/{len(codes)})', flush=True)
    print(f'解析到风格 {len(styled)} 只；无风格披露 {stats["no_style"]}；'
          f'残缺/失败 {stats["incomplete"] + stats["error"]}', flush=True)

    # 护栏：限流会把「无风格」误当成事实。本脚本不清空旧值，但仍不写可疑批次。
    min_ok = args.min_ok
    if min_ok == 0:
        min_ok = 1000 if len(codes) > 5000 else max(1, int(len(codes) * 0.10))
    if rate < 60.0:
        print(f'✗ 完整页面率 {rate:.1f}% < 60%，疑似被限流，终止本次写库', flush=True)
        sys.exit(1)
    if len(styled) < min_ok:
        print(f'✗ 解析到风格 {len(styled)} < 护栏 {min_ok}，终止本次写库', flush=True)
        sys.exit(1)
    if args.dry_run:
        print('dry-run：不写库、不刷新物化视图', flush=True)
        if styled:
            print('  样本：' + ', '.join(f'{c}={p}/{s}' for c, p, s in styled[:8]), flush=True)
        return

    written = batch_update(styled)
    print(f'  ✓ 已写回 {written} 只基金的 invest_style / style_period', flush=True)
    pg('REFRESH MATERIALIZED VIEW public.fund_scores_main;', timeout=900)
    print('  ✓ 已刷新物化视图 fund_scores_main', flush=True)

    check = pg("""SELECT count(*) AS n, count(DISTINCT invest_style) AS kinds,
                        max(style_period) AS latest
                 FROM public.fund_scores WHERE invest_style IS NOT NULL""")[0]
    print(f'  ✓ 库内现有风格 {check["n"]} 只 / {check["kinds"]} 种 / 最新报告期 {check["latest"]}',
          flush=True)
    print('✅ 完成', flush=True)


if __name__ == '__main__':
    main()
