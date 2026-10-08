#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_dividends.py — 采集 A 股股息率 / 分红比例 → dividend_scores 表

数据源：东方财富 分红送配（akshare stock_fhps_em，本质是 RPT_F10_FINANCE_GINCOMEQ）
  - 现金分红-股息率      → dividend_yield（该字段按公告时股价计算，为近似口径）
  - 现金分红-现金分红比例 → 每 10 股派息金额 → payout_per10
  - 每股收益            → 用于剔除亏损股（EPS<0 时股息率失真为正数，必须剔除）

为什么要剔除亏损股（实测结论）：
  2024 年报期 3653 条中有 119 条（3.3%）EPS<0 却算出正股息率，
  例：好想你 EPS=-0.16 但股息率 8.59%、尚品宅配 EPS=-1.14 但 6.68%。
  这类公司亏损时分红来源异常（可能是存量分配），留在池里会污染股息维度。

报告期选择（实测）：
  20241231（年报期）覆盖 3653 只，最全；
  20240331/20250331 只有 13 条（ quarterly 分红少）；
  20240630=726 / 20240930=350 / 20250630=854。
  故以「最近一个年报期」为主，缺失时回退到最近一期。

用法：
  export SUPABASE_PAT=...
  python3 scripts/fetch_dividends.py
（优先 SUPABASE_PAT，回退 SUPABASE_MGMT_TOKEN）
"""
import os
import sys
import json
import subprocess
import datetime
import time
import warnings

warnings.filterwarnings('ignore')

PAT = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not PAT:
    sys.exit('请设置环境变量 SUPABASE_PAT')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'

# 候选报告期，按优先级降序（年报期最全）
REPORT_DATES = ['20241231', '20250630', '20240930', '20240630']

DDL = """
CREATE TABLE IF NOT EXISTS dividend_scores (
  code text PRIMARY KEY,
  name text,
  dividend_yield numeric,     -- 股息率（小数，0.035 = 3.5%）
  payout_per10 numeric,       -- 每 10 股派息金额（元）
  eps numeric,                -- 每股收益（用于校验/后续派息率计算）
  report_date text,           -- 报告期 yyyymmdd
  scheme_status text,         -- 方案进度（实施分配 / 预案等）
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dividend_scores_code ON dividend_scores(code);

ALTER TABLE dividend_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_read_dividend_scores ON dividend_scores;
CREATE POLICY anon_read_dividend_scores ON dividend_scores
  FOR SELECT TO anon USING (true);
-- ⚠️ 必须同时覆盖 authenticated：表只有 anon 策略时，登录用户（role=authenticated）
--    读 0 行，未登录反而正常。这是项目里踩过的坑（见 MEMORY.md「RLS 登录态盲区」）。
DROP POLICY IF EXISTS auth_read_dividend_scores ON dividend_scores;
CREATE POLICY auth_read_dividend_scores ON dividend_scores
  FOR SELECT TO authenticated USING (true);
"""


def pg(sql, timeout=300):
    """通过 Management API 执行 SQL（curl 防 Cloudflare 拦截）。"""
    payload = json.dumps({'query': sql})
    r = subprocess.run(
        ['curl', '-s', '--max-time', str(timeout), '-X', 'POST', MGMT_API,
         '-H', f'Authorization: Bearer {PAT}',
         '-H', 'Content-Type: application/json', '-d', payload],
        capture_output=True, text=True, timeout=timeout + 10)
    if r.returncode != 0:
        raise RuntimeError(f'curl fail: {r.stderr[:150]}')
    t = r.stdout.strip()
    if not t:
        return []
    try:
        resp = json.loads(t)
    except json.JSONDecodeError:
        raise RuntimeError(f'非 JSON 响应: {t[:300]}')
    if isinstance(resp, dict) and resp.get('message'):
        raise RuntimeError(resp['message'][:500])
    return resp


def _load_env_local():
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    try:
        with open(p) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
    except FileNotFoundError:
        pass


def fetch_report(date):
    """拉一个报告期的分红送配全量。"""
    import akshare as ak
    print(f'  拉取 {date} ...', flush=True)
    df = ak.stock_fhps_em(date=date)
    return df


def normalize(df, report_date):
    """把东财原始表整形成可入库的记录，剔除亏损股。"""
    out = {}
    dropped_loss = 0
    dropped_nan = 0
    for _, r in df.iterrows():
        dy = r.get('现金分红-股息率')
        if dy is None or (isinstance(dy, float) and dy != dy):  # NaN
            dropped_nan += 1
            continue
        try:
            dy = float(dy)
        except (TypeError, ValueError):
            dropped_nan += 1
            continue
        eps = r.get('每股收益')
        try:
            eps = float(eps)
        except (TypeError, ValueError):
            eps = None
        # 剔除亏损股：EPS<0 时股息率失真（实测 119 条）
        if eps is not None and eps < 0:
            dropped_loss += 1
            continue
        code = str(r.get('代码', '')).strip().zfill(6)
        if not code or code == '000000':
            continue
        payout = r.get('现金分红-现金分红比例')
        try:
            payout = float(payout)
        except (TypeError, ValueError):
            payout = None
        name = str(r.get('名称', '')).strip()
        # 名称里东财带全角空格（如"万  科Ａ"），归一化掉
        name = name.replace('　', '').replace(' ', '')
        out[code] = {
            'code': code,
            'name': name,
            'dividend_yield': round(dy, 6),
            'payout_per10': payout,
            'eps': eps,
            'report_date': report_date,
            'scheme_status': str(r.get('方案进度', '') or '').strip() or None,
        }
    print(f'  → 有效 {len(out)} 条，剔除亏损股 {dropped_loss} 条，剔除无股息率 {dropped_nan} 条')
    return out


def main():
    _load_env_local()
    print('=== [1/4] 建表 + RLS ===')
    pg(DDL)
    print('  ok')

    print('=== [2/4] 拉取分红送配 ===')
    records = {}
    used_date = None
    for date in REPORT_DATES:
        try:
            df = fetch_report(date)
        except Exception as e:
            print(f'  {date} 拉取失败: {str(e)[:80]}')
            continue
        if len(df) < 500:
            print(f'  {date} 仅 {len(df)} 条，跳过')
            continue
        rec = normalize(df, date)
        if len(rec) > len(records):
            records = rec
            used_date = date
            print(f'  选定报告期 {date}（{len(rec)} 条）')
        if len(rec) >= 2000:
            break
        time.sleep(0.5)

    if not records:
        sys.exit('所有报告期均未取到足够分红数据，终止（不写入）')

    print('=== [3/4] 写入 dividend_scores ===')
    payload = json.dumps(list(records.values()), ensure_ascii=False)
    # 分批插入，避免单条 SQL 过大
    items = list(records.values())
    BATCH = 300
    total = 0
    for i in range(0, len(items), BATCH):
        chunk = items[i:i + BATCH]
        vals = ','.join(
            "('{code}','{nm}',{dy},{po},{eps},'{rd}',{st})".format(
                code=c['code'],
                nm=(c['name'].replace("'", "''") or ''),
                dy=c['dividend_yield'],
                po=c['payout_per10'] if c['payout_per10'] is not None else 'NULL',
                eps=c['eps'] if c['eps'] is not None else 'NULL',
                rd=c['report_date'],
                st=("'" + c['scheme_status'].replace("'", "''") + "'")
                if c['scheme_status'] else 'NULL',
            ) for c in chunk)
        sql = f"""
        INSERT INTO dividend_scores
          (code,name,dividend_yield,payout_per10,eps,report_date,scheme_status)
        VALUES {vals}
        ON CONFLICT (code) DO UPDATE SET
          name=EXCLUDED.name, dividend_yield=EXCLUDED.dividend_yield,
          payout_per10=EXCLUDED.payout_per10, eps=EXCLUDED.eps,
          report_date=EXCLUDED.report_date, scheme_status=EXCLUDED.scheme_status,
          updated_at=now();
        """
        pg(sql)
        total += len(chunk)
        print(f'  已写 {total}/{len(items)}')
    payload = None

    print('=== [4/4] 校验 ===')
    res = pg("""
    SELECT count(*) AS total,
           count(dividend_yield) AS dy,
           round(avg(dividend_yield)::numeric, 6) AS dy_avg,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dividend_yield)::numeric, 6) AS dy_p50,
           count(*) FILTER (WHERE eps < 0) AS still_loss
    FROM dividend_scores
    """)
    print('  ' + json.dumps(res, ensure_ascii=False))
    ok = res and res[0].get('total', 0) >= 2000 and res[0].get('still_loss', 0) == 0
    print(f'\n报告期 {used_date}，写入 {len(records)} 条，'
          f'校验{"通过" if ok else "未达标（≥2000 条且无亏损股）"}')
    print(f'完成。数据日期 {datetime.date.today()}')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
