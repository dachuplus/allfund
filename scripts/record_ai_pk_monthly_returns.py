#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
record_ai_pk_monthly_returns.py — 记录每个 AI 模型的「月度组合收益」，用于收益 PK 时间线

口径（真实数据，不编造）：
  组合月度收益 = 该期持仓（ai_pk_picks.picks，5 只 × 20% 等权）
                 按权重加权各成分基金的「近1月收益 r1m」(fund_scores)
  period_month 取该期持仓自身的月份（不是运行当天所在月），
  因此每个 (model_id, period_month) 只有一条记录，随每日运行不断刷新，
  到下一期调仓后自然定格 —— 形成可回溯的月度收益时间线。

护栏：
  - 无持仓 / 无 r1m 数据 → 不写该模型该期（宁空不假）
  - 全部模型都无数据 → 不写库，保留上一次结果，exit 0

环境变量：SUPABASE_PAT（或 SUPABASE_MGMT_TOKEN）
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta

if not os.environ.get('SUPABASE_PAT') and os.environ.get('SUPABASE_MGMT_TOKEN'):
    os.environ['SUPABASE_PAT'] = os.environ['SUPABASE_MGMT_TOKEN']

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _pgsql import pg  # noqa: E402

DDL = """
CREATE TABLE IF NOT EXISTS ai_pk_monthly_returns (
  model_id     text NOT NULL,
  period_month text NOT NULL,
  ret          numeric,
  fund_count   integer,
  as_of        date,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (model_id, period_month)
);
ALTER TABLE ai_pk_monthly_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_pk_monthly_returns_public_read" ON ai_pk_monthly_returns;
CREATE POLICY "ai_pk_monthly_returns_public_read"
  ON ai_pk_monthly_returns FOR SELECT TO anon, authenticated USING (true);
"""


def esc(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def main():
    today = datetime.now(timezone(timedelta(hours=8))).date()
    print(f'=== 记录 AI 模型月度组合收益 {today} ===')

    pg(DDL)

    # 各模型最新一期持仓
    rows = pg("SELECT DISTINCT ON (model_id) model_id, period_month, picks "
              "FROM ai_pk_picks ORDER BY model_id, period_month DESC")
    if not rows:
        print('[SKIP] ai_pk_picks 无数据')
        return 0
    print(f'[INFO] 取到 {len(rows)} 个模型的最新持仓')

    # 汇总所有成分基金代码
    codes = set()
    parsed = []
    for r in rows:
        picks = r.get('picks')
        if isinstance(picks, str):
            try:
                picks = json.loads(picks)
            except Exception:
                picks = []
        if not isinstance(picks, list):
            picks = []
        items = []
        for p in picks:
            code = (p or {}).get('code')
            if not code:
                continue
            w = (p or {}).get('weight')
            try:
                w = float(w)
            except (TypeError, ValueError):
                w = 20.0  # 缺省等权 20%
            items.append({'code': str(code), 'weight': w})
            codes.add(str(code))
        if items:
            parsed.append({'model_id': r['model_id'], 'period_month': r['period_month'], 'picks': items})

    if not codes:
        print('[SKIP] 无有效成分基金')
        return 0

    # 批量取 r1m（分片，避免 URL/查询过长）
    # ⚠️ 脏值护栏：单只基金「近1月」涨跌幅绝对值 > 100% 属源数据异常
    # （实测 013835.OF 中加优享纯债债券C r1m=221.98%，债券基金不可能，疑为净值折算/分红口径错误），
    # 此类值一律剔除、不计入加权 —— 宁空不假，不让脏值污染模型效果评估。
    MAX_ABS_RET = 100.0
    code_list = sorted(codes)
    ret_map = {}
    bad_values = []
    for i in range(0, len(code_list), 200):
        chunk = code_list[i:i + 200]
        in_list = ','.join(esc(c) for c in chunk)
        fr = pg(f'SELECT c, r1m FROM fund_scores WHERE c IN ({in_list})')
        for x in fr:
            v = x.get('r1m')
            if v is None:
                continue
            fv = float(v)
            if abs(fv) > MAX_ABS_RET:
                bad_values.append((x['c'], fv))
                continue
            ret_map[x['c']] = fv
    if bad_values:
        print(f'[WARN] 剔除 {len(bad_values)} 个异常收益值（|r1m| > {MAX_ABS_RET}%）：'
              + ', '.join(f'{c}={v}%' for c, v in bad_values[:10]))
    print(f'[INFO] 成分基金 {len(code_list)} 只，其中 {len(ret_map)} 只有近1月收益')

    # 加权
    out = []
    for item in parsed:
        vsum, wsum, n = 0.0, 0.0, 0
        for p in item['picks']:
            v = ret_map.get(p['code'])
            if v is None:
                continue
            vsum += p['weight'] * v
            wsum += p['weight']
            n += 1
        # 有效成分不足 3 只 → 该期不记录（避免个别基金主导、失真）
        if wsum <= 0 or n < 3:
            print(f"[SKIP] {item['model_id']} {item['period_month']} 有效成分仅 {n} 只（<3），跳过")
            continue
        ret = round(vsum / wsum, 2)
        out.append((item['model_id'], item['period_month'], ret, n))
        print(f"[CALC] {item['model_id']:8s} {item['period_month']}  ret={ret:+.2f}%  (成分 {n})")

    if not out:
        print('[SKIP] 无任何模型可计算，保留上一次结果')
        return 0

    # upsert
    values = ',\n'.join(
        f"({esc(m)}, {esc(pm)}, {ret}, {n}, {esc(str(today))}, now(), now())"
        for m, pm, ret, n in out
    )
    pg('INSERT INTO ai_pk_monthly_returns '
       '(model_id, period_month, ret, fund_count, as_of, created_at, updated_at) '
       f'VALUES\n{values}\n'
       'ON CONFLICT (model_id, period_month) DO UPDATE SET '
       'ret = EXCLUDED.ret, fund_count = EXCLUDED.fund_count, '
       'as_of = EXCLUDED.as_of, updated_at = now();')

    rows = pg('SELECT count(*) AS n FROM ai_pk_monthly_returns')
    print(f'[OK] 已写入/更新 {len(out)} 条，表内累计 {rows[0]["n"] if rows else 0} 条')
    return 0


if __name__ == '__main__':
    sys.exit(main())
