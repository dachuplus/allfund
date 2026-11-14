#!/usr/bin/env python3
"""
fetch_invest_style.py — 抓取基金「最新报告期投资风格」并写回 fund_scores。

数据源：公开网络的 F10 特色数据页 tsdata_{code}.html（静态 HTML，UTF-8）。
页面结构：<div id="jjtzfg"> → <table class="fgtb">，表头后第一行即最新报告期：
    <tr><td >2026年3季度</td><td >大盘价值</td></tr>
左侧九宫格是图片，不解析；表头用 <th>，正则只匹配 <td>，不会误取。

设计要点（2026-11-13 实测 / 2026-11-14 重构）：
  - 风格是季度数据，不适合每日全量抓；由 .github/workflows/invest-style.yml
    每周一全量跑一次 + 手动触发，不污染每日评分流水线。
  - 并发上限 8：实测 3/5/8 并发完整率均 95.3%，12/16 并发开始出现残缺页。
  - 页面分类（重要）：
      * 完整页 ~48KB 且含「标准差」→ 有效页，解析出风格 = styled，无 fgtb 表 = no_style；
      * 404 页固定 3814 字节、标题「页面未找到」→ no_page，**确定性无数据**，
        不重试、不计入限流护栏，但要记进度避免续跑时反复抓；
      * 其余短页 → 疑似限流，重试后仍短则 incomplete，**不记进度**（续跑会重试）。
  - 解析失败 / 页面无风格块：跳过该基金，**不清空旧值**（防限流把全库刷成 NULL）。
  - 风格值白名单 9 种（大盘/中盘/小盘 × 价值/平衡/成长），报告期须匹配
    YYYY年[1-4]季度，脏值不入库。
  - ⚠️ 分批增量落库（2026-11-14）：旧版把 2.8 万只结果全攒内存、跑完才一次写库，
    中途取消/超时即 0 写入。现按 --chunk 分批，每批抓完立刻
    UPDATE fund_scores + 写进度表 public.fund_style_fetch，并周期性 REFRESH
    物化视图。任何时刻被中断，已完成批次的数据都已落库。
  - 进度表与续跑：
      * 默认全量运行开始时 TRUNCATE 进度表（周更仍需重新核对全部基金，才能抓到新季度）；
      * --resume 不清空进度表，跳过已记录代码，用于「上次跑挂了接着跑」；
      * --only-missing 只取 invest_style 为空的代码（轻量补漏）。
  - 护栏按批生效：单批完整率 < 60% 视为疑似限流，该批的 no_style 结果**不记进度**
    （续跑会重试），但已解析出的 styled 结果照常写库（它们是真实值）。
  - 结束后 REFRESH MATERIALIZED VIEW fund_scores_main（默认「主代码」列表读它）。

用法：
  python3 scripts/fetch_invest_style.py --dry-run --limit 30     # 本地小样本验证
  python3 scripts/fetch_invest_style.py                         # 全量（分批落库）
  python3 scripts/fetch_invest_style.py --resume                # 断点续跑
  python3 scripts/fetch_invest_style.py --only-missing          # 只补尚无风格的
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

PROGRESS_TABLE = 'public.fund_style_fetch'
CREATE_PROGRESS_SQL = f"""CREATE TABLE IF NOT EXISTS {PROGRESS_TABLE} (
    c           text PRIMARY KEY,
    state       text NOT NULL,
    period      text,
    style       text,
    checked_at  timestamptz NOT NULL DEFAULT now()
)"""


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
    """抓取单只基金。返回 (有效页 0/1, (code, period, style) 或 None, 状态)。

    状态：styled / no_style / no_page / incomplete / error
      - no_page 是 F10 无此基金的确定性 404，不重试也不计入限流护栏；
      - incomplete / error 不写进度表，留待 --resume 重试。
    """
    base = code.split('.')[0]
    url = f'https://fundf10.eastmoney.com/tsdata_{base}.html'
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode('utf-8', errors='replace')
            # 404：东方财富固定的「页面未找到」模板，约 3814 字节。确定性无数据。
            if len(html) < 6000 or '页面未找到' in html[:1500]:
                return 0, None, 'no_page'
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
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def batch_update(rows, batch_size=400):
    """批量 UPDATE fund_scores，返回写入行数。"""
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


def log_progress(rows, batch_size=400):
    """把已确认结果写入进度表（styled / no_style / no_page）。

    rows: [(code, state, period_or_None, style_or_None)]
    """
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        pg(f"""INSERT INTO {PROGRESS_TABLE} (c, state, period, style, checked_at)
               VALUES {', '.join(
                   f'({sql_lit(c)},{sql_lit(st)},{sql_lit(p)},{sql_lit(s)},now())'
                   for c, st, p, s in chunk)}
               ON CONFLICT (c) DO UPDATE
                 SET state = EXCLUDED.state,
                     period = EXCLUDED.period,
                     style = EXCLUDED.style,
                     checked_at = now();""", timeout=300)


def refresh_view():
    pg('REFRESH MATERIALIZED VIEW public.fund_scores_main;', timeout=900)


def get_codes(args):
    """按参数选出本次要抓的代码列表。"""
    conds = []
    if args.only_missing:
        conds.append('f.invest_style IS NULL')
    if args.resume:
        conds.append(f'NOT EXISTS (SELECT 1 FROM {PROGRESS_TABLE} p WHERE p.c = f.c)')
    where = ('WHERE ' + ' AND '.join(conds)) if conds else ''
    sql = f'SELECT f.c FROM public.fund_scores f {where} ORDER BY f.c'
    if args.limit:
        sql += f' LIMIT {args.limit} OFFSET {args.offset}'
    return [r['c'] for r in pg(sql, timeout=300)]


def main():
    ap = argparse.ArgumentParser(description='抓取基金最新报告期投资风格（分批增量落库）')
    ap.add_argument('--workers', type=int, default=8, help='并发数（默认 8，>8 会被限流）')
    ap.add_argument('--delay', type=float, default=0.12, help='提交间隔秒数')
    ap.add_argument('--chunk', type=int, default=400, help='每批只数，抓完立即写库（默认 400）')
    ap.add_argument('--limit', type=int, default=0, help='只处理前 N 只（调试用，0=全部）')
    ap.add_argument('--offset', type=int, default=0, help='起始偏移（配合 --limit 分批）')
    ap.add_argument('--only-missing', action='store_true', help='只抓 invest_style 为空的基金')
    ap.add_argument('--resume', action='store_true', help='断点续跑：不清空进度表，跳过已抓代码')
    ap.add_argument('--dry-run', action='store_true', help='只抓取统计，不写库 / 不刷新视图')
    ap.add_argument('--refresh-every', type=int, default=8,
                    help='每 N 批刷新一次物化视图（默认 8），结束再刷一次')
    ap.add_argument('--min-ok', type=int, default=0,
                    help='成功解析风格的最少行数护栏（0=按样本量自动推断）')
    args = ap.parse_args()

    if args.workers < 1:
        ap.error('--workers 必须 >= 1')

    if not args.dry_run:
        pg(CREATE_PROGRESS_SQL)
        # 周更全量：清空进度表重新核对（新季度才会被抓到）。
        # --resume / --limit / --only-missing 都是「接着跑」，不清空。
        if not args.resume and not args.limit and not args.only_missing:
            pg(f'TRUNCATE TABLE {PROGRESS_TABLE};')
            print('  ✓ 已清空进度表（本周全量重新核对）', flush=True)

    codes = get_codes(args)
    if not codes:
        print('没有需要抓取的基金，退出', flush=True)
        if not args.dry_run:
            refresh_view()
            print('  ✓ 已刷新物化视图 fund_scores_main', flush=True)
        return

    print('=' * 68, flush=True)
    print(f'投资风格抓取（最新报告期）  共 {len(codes)} 只', flush=True)
    print(f'并发 {args.workers} / 每批 {args.chunk} / 间隔 {args.delay}s / '
          f'resume={args.resume} / only-missing={args.only_missing} / dry-run={args.dry_run}',
          flush=True)
    print('=' * 68, flush=True)

    total = len(codes)
    chunks = [codes[i:i + args.chunk] for i in range(0, total, args.chunk)]
    stats = {'styled': 0, 'no_style': 0, 'no_page': 0, 'incomplete': 0, 'error': 0}
    complete = 0          # 有效完整页 styled + no_style
    attempted = 0         # 需要计入限流护栏的请求数（排除 no_page）
    written = 0
    bad_chunks = 0
    started = time.time()

    for ci, chunk in enumerate(chunks, 1):
        chunk_styled = []
        chunk_log = []
        chunk_ok = 0
        chunk_attempted = 0
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {}
            for c in chunk:
                futures[pool.submit(fetch_one, c)] = c
                # 均匀提交，避免整批同时打出去造成瞬时尖峰
                time.sleep(args.delay / max(args.workers, 1))
            for fut in as_completed(futures):
                ok, row, state = fut.result()
                code = futures[fut]
                stats[state] = stats.get(state, 0) + 1
                if state != 'no_page':
                    chunk_attempted += 1
                    chunk_ok += ok
                if state == 'styled' and row:
                    chunk_styled.append(row)
                    chunk_log.append((code, 'styled', row[1], row[2]))
                elif state == 'no_style':
                    chunk_log.append((code, 'no_style', None, None))
                elif state == 'no_page':
                    chunk_log.append((code, 'no_page', None, None))
                # incomplete / error 不记进度，留待 --resume 重试

        rate = chunk_ok * 100.0 / chunk_attempted if chunk_attempted else 100.0
        # 护栏：疑似限流批次不把 no_style 记成「已确认无风格」，续跑时会重试
        if rate < 60.0:
            bad_chunks += 1
            chunk_log = [r for r in chunk_log if r[1] == 'styled']

        complete += chunk_ok
        attempted += chunk_attempted

        if not args.dry_run:
            try:
                if chunk_styled:
                    written += batch_update(chunk_styled)
                if chunk_log:
                    log_progress(chunk_log)
                if args.refresh_every and ci % args.refresh_every == 0:
                    refresh_view()
            except Exception as e:
                # 单批写库失败不能吞掉后续批次；打印后继续，最后统一报告
                print(f'  [WARN] 第 {ci} 批写库失败: {type(e).__name__}: {e}', flush=True)

        done = sum(stats.values())
        elapsed = time.time() - started
        print(f'  批次 {ci}/{len(chunks)} | 已处理 {done}/{total} ({done*100.0/total:.1f}%) | '
              f'本批完整率 {rate:.0f}% | 累计风格 {stats["styled"]} | '
              f'无披露 {stats["no_style"]} | 无页面 {stats["no_page"]} | '
              f'残缺/失败 {stats["incomplete"] + stats["error"]} | 耗时 {elapsed:.0f}s',
              flush=True)

    rate = complete * 100.0 / attempted if attempted else 100.0
    print('-' * 68, flush=True)
    print(f'有效页完整率 {rate:.1f}% ({complete}/{attempted}，已排除确定性 404)', flush=True)
    print(f'解析到风格 {stats["styled"]} 只；完整页无披露 {stats["no_style"]}；'
          f'无 F10 页面 {stats["no_page"]}；残缺/失败 {stats["incomplete"] + stats["error"]}；'
          f'疑似限流批次 {bad_chunks}', flush=True)

    min_ok = args.min_ok
    if min_ok == 0:
        min_ok = 1000 if total > 5000 else max(1, int(total * 0.10))

    if args.dry_run:
        print('dry-run：不写库、不刷新物化视图', flush=True)
        return

    # 最终刷新：无论中途刷新过几次，结束时一定再刷一次，保证视图与库一致
    refresh_view()
    print('  ✓ 已刷新物化视图 fund_scores_main', flush=True)

    check = pg("""SELECT count(*) AS n, count(DISTINCT invest_style) AS kinds,
                        max(style_period) AS latest
                 FROM public.fund_scores WHERE invest_style IS NOT NULL""")[0]
    progress = pg(f'SELECT count(*) AS n FROM {PROGRESS_TABLE}')[0]
    print(f'  ✓ 本次写回 {written} 行；进度表已记录 {progress["n"]} 只', flush=True)
    print(f'  ✓ 库内现有风格 {check["n"]} 只 / {check["kinds"]} 种 / 最新报告期 {check["latest"]}',
          flush=True)

    # 数据已增量落库，护栏只用于给 CI 一个明确的降级信号，不做回滚
    if rate < 60.0:
        print(f'✗ 有效页完整率 {rate:.1f}% < 60%，本次为降级结果；'
              f'可用 --resume 续跑补齐未记录的代码', flush=True)
        sys.exit(1)
    if stats['styled'] < min_ok:
        print(f'⚠ 解析到风格 {stats["styled"]} < 参考阈值 {min_ok}（数据已落库，仅提示）',
              flush=True)
    print('✅ 完成', flush=True)


if __name__ == '__main__':
    main()
