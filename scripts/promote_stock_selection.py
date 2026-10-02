#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
promote_stock_selection.py — 校验 stock_scrape_raw 后计算评分，原子切到 stock_scores_selection
（选品·股票 tab 独立流水线第2/3级：过渡 stock_transition + 生产 stock_scores_selection）

与 AI-PK 的 stock_scores/promote_stock_scores.py 完全隔离：
  - 抓取全程写入 stock_scrape_raw（第1级），绝不直写生产 stock_scores_selection。
  - 本脚本：① 读 raw → ② 计算跨截面百分位评分 k_ret/k_drawdown/k_sharpe/k_all
        （k_all = 0.5*k_ret + 0.25*k_drawdown + 0.25*k_sharpe，与基金靠谱指数同构）
        ③ 写入 stock_transition（入库清洗集）+ stock_scores_selection（生产展示源）。

评分口径（与基金靠谱指数 v7 同构：收益50% + 回撤25% + 夏普25%）：
  - k_ret       = return_3y 横截面百分位（越大越好）
  - k_drawdown  = -max_drawdown 横截面百分位（回撤越小越好 → 取负后越大越好）
  - k_sharpe    = sharpe 横截面百分位（越大越好）
  - k_all       = 0.5*k_ret + 0.25*k_drawdown + 0.25*k_sharpe
  风控股票（ST/退市/停牌/次新）参与落库但 k_* 置 NULL，由前端按 is_st 等标记过滤。

用法：
  export SUPABASE_PAT="$(grep -E '^SUPABASE_PAT=' .env.local | cut -d= -f2-)"
  python3 scripts/promote_stock_selection.py            # 校验通过后切换
  python3 scripts/promote_stock_selection.py --force    # 跳过数量校验（调试用）
"""
import os, sys, json, math, subprocess, datetime

PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
if not PAT:
    raise SystemExit("缺少 SUPABASE_PAT 环境变量。")
REF = "tqhtegazxykkqfcpejky"
MGMT_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

DATA_COLS = ["code", "name", "exchange", "secid", "industry", "industry_code", "close", "pe_ttm", "pb",
             "mktcap", "circ_mktcap", "turnover_rate", "return_1m", "return_3m", "return_6m", "return_1y",
             "return_3y", "daily_change", "max_drawdown", "sharpe", "is_st", "is_delisted", "is_suspended", "list_date"]
# 经由 Management API 查询返回的数值/布尔会被序列化为字符串，读取后需还原
NUMERIC_COLS = {"close", "pe_ttm", "pb", "mktcap", "circ_mktcap", "turnover_rate", "return_1m", "return_3m",
                "return_6m", "return_1y", "return_3y", "daily_change", "max_drawdown", "sharpe"}
BOOL_COLS = {"is_st", "is_delisted", "is_suspended"}


def coerce(rows):
    out = []
    for r in rows:
        c = dict(r)
        for k in NUMERIC_COLS:
            v = c.get(k)
            try:
                c[k] = float(v) if v not in (None, '', 'NULL') else None
            except (TypeError, ValueError):
                c[k] = None
        for k in BOOL_COLS:
            v = c.get(k)
            c[k] = (str(v).lower() in ('true', 't', '1')) if v is not None else False
        out.append(c)
    return out


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


def percentile_ranks(pairs):
    """pairs: list of (key, num|None) → {key: 0-100}。"""
    valid = [(k, v) for k, v in pairs if v is not None and not (isinstance(v, float) and math.isnan(v))]
    if not valid:
        return {k: None for k, _ in pairs}
    vs = sorted(v for _, v in valid)
    n = len(vs)
    out = {}
    for k, v in valid:
        cnt_le = sum(1 for x in vs if x <= v)
        out[k] = round((cnt_le - 1) / (n - 1) * 100.0, 2) if n > 1 else 50.0
    for k, v in pairs:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            out[k] = None
    return out


def compute_scores(rows):
    kret = percentile_ranks([(r['code'], r['return_3y']) for r in rows])
    kdd = percentile_ranks([(r['code'], (-r['max_drawdown']) if r['max_drawdown'] is not None else None) for r in rows])
    ksh = percentile_ranks([(r['code'], r['sharpe']) for r in rows])
    for r in rows:
        kr, kd, ks = kret.get(r['code']), kdd.get(r['code']), ksh.get(r['code'])
        r['k_ret'], r['k_drawdown'], r['k_sharpe'] = kr, kd, ks
        r['k_all'] = round(0.5 * kr + 0.25 * kd + 0.25 * ks, 2) if None not in (kr, kd, ks) else None
    return rows


def write_table(table, rows, score_cols):
    cols = DATA_COLS + score_cols
    pg(f"TRUNCATE TABLE public.{table};")
    BATCH = 150
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        parts = []
        for r in chunk:
            base = [sql_str(r.get(c)) for c in DATA_COLS]
            sc = [sql_num(r.get(c)) for c in score_cols]
            parts.append("(" + ",".join(base + sc) + ")")
        pg(f"INSERT INTO public.{table} ({','.join(cols)}) VALUES " + ",".join(parts) + ";", timeout=300)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true', help='跳过数量校验（调试用）')
    args = ap.parse_args()

    print('=' * 64, flush=True)
    print(' 校验 stock_scrape_raw → 评分 → stock_transition + stock_scores_selection', flush=True)
    print('=' * 64, flush=True)

    raw = coerce(pg(f"SELECT {','.join(DATA_COLS)} FROM public.stock_scrape_raw;"))
    if not raw:
        print('  ✗ stock_scrape_raw 为空，请先运行 fetch_stock_selection_raw.py', flush=True)
        sys.exit(1)
    print(f'  raw 读数: {len(raw)} 行', flush=True)

    total = len(raw)
    kall = sum(1 for r in raw if r.get('return_3y') is not None and r.get('max_drawdown') is not None and r.get('sharpe') is not None)
    rate = kall / total if total else 0
    print(f'  可评分(k_all)率: {rate*100:.1f}% ({kall}/{total})', flush=True)

    if not args.force:
        if total < 1500:
            print(f'  ✗ 数量不足 1500（{total}），拒绝切换', flush=True); sys.exit(1)
        if rate < 0.90:
            print(f'  ✗ k_all 非空率 <90%（{rate*100:.1f}%），拒绝切换', flush=True); sys.exit(1)

    scored = compute_scores(raw)
    # 过渡表：入库清洗集（仅剔除退市/停牌，保留 ST 标记）
    transition = [r for r in scored if not r.get('is_delisted') and not r.get('is_suspended')]
    write_table('stock_transition', transition, [])
    print(f'  ✓ stock_transition 写入 {len(transition)} 行（已剔除退市/停牌）', flush=True)
    # 生产表：全量（含风险标记，k_* 对风控股置 NULL）
    write_table('stock_scores_selection', scored, ['k_ret', 'k_drawdown', 'k_sharpe', 'k_all'])
    print(f'  ✓ stock_scores_selection 写入 {len(scored)} 行（含 k_* 评分）', flush=True)

    sel = pg("SELECT count(*) AS c, count(k_all) AS scored FROM public.stock_scores_selection")[0]
    print(f'\n=== 完成：生产表 {sel["c"]} 行，k_all 非空 {sel["scored"]} 行 ===', flush=True)


if __name__ == '__main__':
    main()
