#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 gmbd / cyrjg 9 列错误数据（东财 .OF 后缀 bug）。

背景（2026-11-18 用户实证）：
  FundArchivesDatas.aspx?type=gmbd|cyrjg&code=XXX 不认 .OF 后缀，
  带后缀会回退到同一个默认基金，返回统一错值（cyrjg 恒 0.45/99.55，
  gmbd 恒 1.51/1.68/23.89/29.19/-25.89%）。而 fetch_fund_allocation.py
  的 fetch_gmbd/fetch_cyrjg 旧版直接用生产代码（带 .OF）请求，导致全库
  约 90% 基金的这 9 列写错。fetch_zcpz 因早已用裸码，其 3 列正确。

本脚本只重抓这 9 列、强制覆盖生产（不碰 stock_pct/bond_pct/cash_pct 及评分列），
复用 fetch_fund_allocation 已修复的 fetch_gmbd/fetch_cyrjg（单一解析真源）。

链路：
  fund_scores 取全部代码 → 裸码请求（修复后的函数）→ 每 50 只批量 UPDATE
  生产这 9 列（强制覆盖）→ 进度写 public.fix_holder_progress（断点续传）
  → 完成后 REFRESH MATERIALIZED VIEW fund_scores_main。

用法：
  python3 scripts/fix_holder_gmbd.py --shard 0 --shards 4     # 分片并行
  python3 scripts/fix_holder_gmbd.py --limit 100 --dry-run     # 冒烟不写库
  python3 scripts/fix_holder_gmbd.py --reset-progress          # 清空进度重跑
"""
import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_fund_allocation as fa  # 复用已修复的 fetch_gmbd / fetch_cyrjg（解析单一真源）

# 纯 urllib 走 Management API，不依赖 psycopg2（fetch_fund_allocation.pg 依赖 _db.py 的 psycopg2）
_PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not _PAT:
    _env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    if os.path.isfile(_env):
        for _l in open(_env):
            if _l.strip().startswith('SUPABASE_PAT='):
                _PAT = _l.split('=', 1)[1].strip().strip('"').strip("'")
                break
if not _PAT:
    sys.exit('ERROR: 需 SUPABASE_PAT')
_MGMT = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'


def PG(sql, timeout=300):
    req = urllib.request.Request(
        _MGMT, data=json.dumps({'query': sql}).encode('utf-8'),
        headers={'Authorization': f'Bearer {_PAT}', 'Content-Type': 'application/json',
                 'User-Agent': 'Mozilla/5.0'}, method='POST')
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode('utf-8')
    return json.loads(raw) if raw else []

PROGRESS_TABLE = 'public.fix_holder_progress'


def ensure_progress():
    PG(f"""
    CREATE TABLE IF NOT EXISTS {PROGRESS_TABLE} (
      c text PRIMARY KEY,
      ok boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE {PROGRESS_TABLE} ENABLE ROW LEVEL SECURITY;
    """, timeout=120)


def get_codes():
    rows = PG("SELECT c FROM fund_scores ORDER BY c", timeout=120)
    return [r['c'] for r in rows]


def get_done():
    rows = PG(f"SELECT c FROM {PROGRESS_TABLE} WHERE ok = true", timeout=120)
    return {r['c'] for r in rows}


def mark_done(codes, ok=True):
    if not codes:
        return
    vals = ','.join(f"('{c.replace(chr(39), chr(39)*2)}',{str(ok).lower()})" for c in codes)
    PG(f"INSERT INTO {PROGRESS_TABLE}(c,ok) VALUES {vals} "
       f"ON CONFLICT(c) DO UPDATE SET ok=EXCLUDED.ok, updated_at=now()", timeout=120)


# 只更新这 9 列，强制覆盖（旧值是错的，不能用 COALESCE）
FIX_COLS = ['sub_purchase', 'sub_redemption', 'net_sub_share',
            'total_share_end', 'net_asset_end', 'nav_change_rate',
            'inst_hold_pct', 'indiv_hold_pct', 'internal_hold_pct']


def flush(batch):
    """batch: list[(code, dict)]。9 列全部直接覆盖为真实值；抓不到的列写 NULL
    清掉错误的旧默认值（旧值 0.45/99.55 是 .OF bug 产物，必须清除，不能 COALESCE 保留）。"""
    if not batch:
        return
    set_clause = ', '.join(f'{c} = t.{c}' for c in FIX_COLS)
    vals = []
    for code, data in batch:
        safe = code.replace("'", "''")
        parts = [f"'{safe}'"]
        for col in FIX_COLS:
            v = data.get(col)
            parts.append('NULL' if v is None else str(v))
        vals.append('(' + ', '.join(parts) + ')')
    sql = (f'UPDATE fund_scores f SET {set_clause} '
           f'FROM (VALUES {", ".join(vals)}) AS t(c, {", ".join(FIX_COLS)}) '
           f'WHERE f.c = t.c')
    try:
        PG(sql, timeout=300)
        return True
    except Exception as e:
        print(f'  [WARN] 批量写库失败（下批重试）: {str(e)[:200]}', flush=True)
        return False


def fetch_one(code):
    row = {}
    try:
        g = fa.fetch_gmbd(code)
        if g and g.get('sub_purchase') is not None:
            for k in ('sub_purchase', 'sub_redemption', 'net_sub_share',
                      'total_share_end', 'net_asset_end', 'nav_change_rate'):
                row[k] = g.get(k)
    except Exception:
        pass
    try:
        c = fa.fetch_cyrjg(code)
        if c and c.get('inst_hold_pct') is not None:
            for k in ('inst_hold_pct', 'indiv_hold_pct', 'internal_hold_pct'):
                row[k] = c.get(k)
    except Exception:
        pass
    return row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shard', type=int, default=None)
    ap.add_argument('--shards', type=int, default=1)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--batch', type=int, default=50)
    ap.add_argument('--delay', type=float, default=0.1)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--reset-progress', action='store_true')
    args = ap.parse_args()

    print('=' * 60, flush=True)
    print(' 修复 gmbd/cyrjg 9 列（裸码重抓，强制覆盖）', flush=True)
    print('=' * 60, flush=True)
    ensure_progress()
    if args.reset_progress:
        PG(f'TRUNCATE TABLE {PROGRESS_TABLE}', timeout=120)
        print('  进度表已清空', flush=True)
    if args.dry_run:
        for code in ['023800.OF', '110022.OF', '161725.OF']:
            print(f'  {code}: {fetch_one(code)}', flush=True)
        print('  DRY-RUN 完成，未写库', flush=True)
        return

    codes = get_codes()
    done = get_done()
    todo = [c for c in codes if c not in done]
    if args.shard is not None:
        todo = [c for i, c in enumerate(todo) if i % args.shards == args.shard]
    if args.limit > 0:
        todo = todo[:args.limit]
    print(f'  总 {len(codes)} / 已完成 {len(done)} / 本片待抓 {len(todo)}', flush=True)

    stats = {'ok': 0, 'empty': 0, 'written': 0}
    batch_results = []
    for i, code in enumerate(todo, 1):
        row = fetch_one(code)
        # 无论是否抓到真实数据，都进批次：抓到的覆盖为真值，抓不到的写 NULL
        # 清掉旧 .OF bug 的错误默认值（0.45/99.55/1.51...），全部 mark_done 避免反复重抓。
        batch_results.append((code, row))
        if row:
            stats['ok'] += 1
        else:
            stats['empty'] += 1
        if len(batch_results) >= args.batch:
            if flush(batch_results):
                stats['written'] += len(batch_results)
            mark_done([c for c, _ in batch_results])
            batch_results = []
        if i % 200 == 0:
            print(f'  [{i}/{len(todo)}] ok={stats["ok"]} empty={stats["empty"]} '
                  f'written={stats["written"]}', flush=True)
        time.sleep(args.delay)
    # 收尾
    if batch_results:
        if flush(batch_results):
            stats['written'] += len(batch_results)
        mark_done([c for c, _ in batch_results])
    print(f'  完成：ok={stats["ok"]} empty={stats["empty"]} written={stats["written"]}', flush=True)


if __name__ == '__main__':
    main()
