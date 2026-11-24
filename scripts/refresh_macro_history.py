#!/usr/bin/env python3
"""按抓数铁律增量刷新 macro_history：抓取 -> staging -> 校验 -> promote。

背景：
  - 旧脚本 scripts/fetch_macro_history.py 使用 DELETE + INSERT 直接写生产，
    不符合「任何抓数先写中间表、校验后再写生产」的铁律，本脚本不修改旧脚本，
    只作为新的日更入口。
  - SignalPage.vue 的 FED 股债性价比历史图仍直接读取 macro_history：
    metric=cn10y（中国 10Y 国债）与 metric=sh000001（上证指数）。
  - 因此 cn10y / sh000001 必须持续更新；us10y / shibor_on 作为同一批宏观
    历史序列一并补齐。

数据源（akshare==1.20.1，旧接口在 1.20.65 已被移除）：
  - cn10y / us10y : akshare.bond_zh_us_rate
  - shibor_on     : akshare.macro_china_shibor_all
  - sh000001      : akshare.stock_zh_index_daily(symbol='sh000001')

用法：
  python3 scripts/refresh_macro_history.py --status
  python3 scripts/refresh_macro_history.py --dry-run
  python3 scripts/refresh_macro_history.py --to-staging
  python3 scripts/refresh_macro_history.py --promote
  python3 scripts/refresh_macro_history.py --promote --metric cn10y,sh000001
"""
import argparse
import json
import math
import os
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, '.env.local')

PROJECT_REF = 'tqhtegazxykkqfcpejky'
MGMT_API = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
STAGING_TABLE = 'public.macro_history_staging'
PROD_TABLE = 'public.macro_history'

DEFAULT_METRICS = ('cn10y', 'us10y', 'shibor_on', 'sh000001')
SOURCE = {
    'cn10y': 'akshare:bond_zh_us_rate',
    'us10y': 'akshare:bond_zh_us_rate',
    'shibor_on': 'akshare:macro_china_shibor_all',
    'sh000001': 'akshare:stock_zh_index_daily',
}
# (最小值, 最大值, 重叠日期允许最大误差)
RANGE = {
    'cn10y': (-5.0, 20.0, 0.25),
    'us10y': (-5.0, 20.0, 0.25),
    'shibor_on': (-5.0, 30.0, 0.25),
    'sh000001': (1.0, 100000.0, 0.05),
}
# 日频序列用 7 天；Shibor 来源（金十）本身有约 1–2 周延迟，单独放宽到 21 天。
FRESHNESS_DAYS = {
    'cn10y': 7,
    'us10y': 7,
    'shibor_on': 21,
    'sh000001': 7,
}


def load_env():
    if not os.path.exists(ENV_PATH):
        return
    with open(ENV_PATH, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
TOKEN = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
if not TOKEN:
    sys.exit('缺少 SUPABASE_PAT / SUPABASE_MGMT_TOKEN')


def run_sql(sql, timeout=300):
    req = Request(
        MGMT_API,
        data=json.dumps({'query': sql}, ensure_ascii=False).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )
    last = None
    for attempt in range(4):
        try:
            with urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode('utf-8')
            return json.loads(raw) if raw else []
        except HTTPError as exc:
            last = exc
            if exc.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            body = exc.read().decode('utf-8', 'replace')[:300]
            raise RuntimeError(f'SQL HTTP {exc.code}: {body}')
        except Exception as exc:
            last = exc
            if attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f'SQL 请求失败: {last}')
    raise RuntimeError(f'SQL 请求失败: {last}')


def ensure_schema():
    stmts = [
        f'''CREATE TABLE IF NOT EXISTS {STAGING_TABLE} (
              metric text NOT NULL,
              date date NOT NULL,
              value double precision,
              source text,
              fetched_at timestamptz NOT NULL DEFAULT now(),
              PRIMARY KEY (metric, date)
            )''',
        f'CREATE UNIQUE INDEX IF NOT EXISTS macro_history_staging_metric_date_key '
        f'ON {STAGING_TABLE} (metric, date)',
        f'GRANT SELECT ON {STAGING_TABLE} TO anon, authenticated, service_role',
    ]
    for stmt in stmts:
        run_sql(stmt, timeout=120)
    print(f'  ✓ 已确保中间表 {STAGING_TABLE} 存在', flush=True)


def parse_metrics(raw):
    if not raw:
        return list(DEFAULT_METRICS)
    parts = [m.strip() for m in raw.split(',') if m.strip()]
    bad = [m for m in parts if m not in DEFAULT_METRICS]
    if bad:
        raise SystemExit(f'不支持的 metric: {bad}，可选：{list(DEFAULT_METRICS)}')
    return parts


def metric_list_sql(metrics):
    return ','.join("'" + m.replace("'", "''") + "'" for m in metrics)


def sql_literal(s):
    return "'" + str(s).replace("'", "''") + "'"


def sql_num(v):
    return 'NULL' if v is None else str(float(v))


def norm_date(value):
    s = str(value)
    if ' ' in s:
        s = s.split(' ')[0]
    return s[:10]


def is_missing(value):
    if value is None:
        return True
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return True


def dedupe_sorted(rows):
    by_date = {}
    for metric, d, v, src in rows:
        by_date[d] = (metric, d, v, src)
    return [by_date[d] for d in sorted(by_date)]


def fetch_rows(metric):
    """返回 [(metric, date, value, source), ...]，升序、同日去重。"""
    import akshare as ak

    needed = {
        'cn10y': 'bond_zh_us_rate',
        'us10y': 'bond_zh_us_rate',
        'shibor_on': 'macro_china_shibor_all',
        'sh000001': 'stock_zh_index_daily',
    }[metric]
    if not hasattr(ak, needed):
        raise RuntimeError(
            f'akshare {getattr(ak, "__version__", "?")} 缺少 {needed}；'
            '请固定安装 akshare==1.20.1'
        )

    if metric in ('cn10y', 'us10y'):
        df = ak.bond_zh_us_rate()
        col = '中国国债收益率10年' if metric == 'cn10y' else '美国国债收益率10年'
        date_col = '日期'
    elif metric == 'shibor_on':
        df = ak.macro_china_shibor_all()
        col = 'O/N-定价'
        date_col = '日期'
    elif metric == 'sh000001':
        df = ak.stock_zh_index_daily(symbol='sh000001')
        col = 'close'
        date_col = 'date'
    else:
        raise RuntimeError(f'未定义抓取器: {metric}')

    if df is None or len(df) == 0:
        raise RuntimeError(f'{metric}: 数据源返回 0 行')
    if date_col not in df.columns or col not in df.columns:
        raise RuntimeError(
            f'{metric}: 数据源字段变化，期望 {date_col}/{col}，实际 {list(df.columns)[:20]}'
        )

    rows = []
    for _, item in df.iterrows():
        d = norm_date(item[date_col])
        raw = item[col]
        if is_missing(raw):
            continue
        try:
            v = float(raw)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(v):
            continue
        lo, hi, _tol = RANGE[metric]
        if v < lo or v > hi:
            continue
        rows.append((metric, d, round(v, 4), SOURCE[metric]))
    rows = dedupe_sorted(rows)
    if not rows:
        raise RuntimeError(f'{metric}: 清洗后无有效行')
    return rows


def write_staging(all_rows):
    run_sql(f'TRUNCATE TABLE {STAGING_TABLE}', timeout=120)
    print('  ✓ 已清空中间表', flush=True)
    total = 0
    chunk = 500
    for i in range(0, len(all_rows), chunk):
        vals = []
        for metric, d, v, src in all_rows[i:i + chunk]:
            vals.append(
                f"({sql_literal(metric)}, {sql_literal(d)}, {sql_num(v)}, {sql_literal(src)}, now())"
            )
        sql = (
            f'INSERT INTO {STAGING_TABLE} (metric, date, value, source, fetched_at) '
            f"VALUES {', '.join(vals)} "
            'ON CONFLICT (metric, date) DO UPDATE SET '
            'value=EXCLUDED.value, source=EXCLUDED.source, fetched_at=now()'
        )
        run_sql(sql, timeout=300)
        total += len(vals)
        if total % 2000 < chunk or total == len(all_rows):
            print(f'  ✓ 中间表写入 {total}/{len(all_rows)} 行', flush=True)
    return total


def validate_staging(metrics):
    ml = metric_list_sql(metrics)
    stats = run_sql(f'''
      SELECT
        s.metric,
        count(*) AS n,
        min(s.date) AS first_date,
        max(s.date) AS last_date,
        count(*) FILTER (
          WHERE s.value IS NULL
             OR s.value::text IN ('NaN', 'Infinity', '-Infinity')
             OR s.value::double precision < {min(RANGE[m][0] for m in metrics)}
             OR s.value::double precision > {max(RANGE[m][1] for m in metrics)}
        ) AS bad_rows
      FROM {STAGING_TABLE} s
      WHERE s.metric = ANY (ARRAY[{ml}]::text[])
      GROUP BY s.metric
      ORDER BY s.metric
    ''', timeout=300)
    smap = {r['metric']: r for r in stats}
    need = set(metrics) - set(smap)
    if need:
        raise RuntimeError(f'中间表校验失败：缺少 metric {sorted(need)}')

    prod = run_sql(f'''
      SELECT metric, count(*) AS n, max(date) AS last_date
      FROM {PROD_TABLE}
      WHERE metric = ANY (ARRAY[{ml}]::text[])
      GROUP BY metric
    ''', timeout=300)
    pmap = {r['metric']: r for r in prod}

    overlap = run_sql(f'''
      SELECT s.metric, max(abs(s.value::double precision - p.value::double precision)) AS max_diff
      FROM {STAGING_TABLE} s
      JOIN {PROD_TABLE} p ON p.metric = s.metric AND p.date = s.date
      WHERE s.metric = ANY (ARRAY[{ml}]::text[])
      GROUP BY s.metric
    ''', timeout=300)
    omap = {r['metric']: float(r['max_diff'] or 0) for r in overlap}

    for m in metrics:
        st = smap[m]
        pt = pmap.get(m, {'n': 0, 'last_date': None})
        if st['n'] <= 0:
            raise RuntimeError(f'中间表校验失败：{m} 行数为 0')
        if st['bad_rows'] != 0:
            raise RuntimeError(f'中间表校验失败：{m} 异常行数 {st["bad_rows"]}')
        if st['n'] < pt['n'] * 0.90:
            raise RuntimeError(
                f'中间表校验失败：{m} 行数 {st["n"]} < 生产 90% ({pt["n"]})'
            )
        latest = str(st['last_date'])[:10]
        max_days = FRESHNESS_DAYS[m]
        if latest < time.strftime('%Y-%m-%d', time.localtime(time.time() - max_days * 86400)):
            raise RuntimeError(f'中间表校验失败：{m} 最新日期 {latest} 超过 {max_days} 天未更新')
        tol = RANGE[m][2]
        diff = omap.get(m, 0.0)
        if diff > tol:
            raise RuntimeError(f'中间表校验失败：{m} 重叠日期最大差异 {diff} > {tol}')
        print(
            f'  ✓ {m}: staging={st["n"]} 行, 最新 {latest}, '
            f'生产最新 {pt["last_date"] or "--"}, 重叠最大差 {diff}',
            flush=True,
        )
    print('  ✓ 中间表校验全部通过', flush=True)


def promote_staging(metrics):
    ml = metric_list_sql(metrics)
    sql = f'''
      INSERT INTO {PROD_TABLE} (metric, date, value, source)
      SELECT s.metric, s.date, s.value, s.source
      FROM {STAGING_TABLE} s
      WHERE s.metric = ANY (ARRAY[{ml}]::text[])
      ON CONFLICT (date, metric) DO UPDATE SET
        value = EXCLUDED.value,
        source = EXCLUDED.source
    '''
    run_sql(sql, timeout=600)
    print('  ✓ 已按 (date, metric) 增量写入生产 macro_history（未删除历史）', flush=True)


def cmd_status(metrics):
    ml = metric_list_sql(metrics)
    rows = run_sql(f'''
      SELECT metric, count(*) AS n, min(date) AS first_date, max(date) AS last_date
      FROM {PROD_TABLE}
      WHERE metric = ANY (ARRAY[{ml}]::text[])
      GROUP BY metric ORDER BY metric
    ''', timeout=300)
    for r in rows:
        print(f'  生产 {r["metric"]}: n={r["n"]} first={r["first_date"]} last={r["last_date"]}')


def cmd_fetch(metrics, dry_run):
    all_rows = []
    for m in metrics:
        print(f'-- 抓取 {m} --', flush=True)
        rows = fetch_rows(m)
        print(f'   {m}: {len(rows)} 行，最新 {rows[-1][1]}，值 {rows[-1][2]}', flush=True)
        all_rows.extend(rows)
    if dry_run:
        print('  --dry-run：未写任何表', flush=True)
        return
    print(f'[2] 写入 {STAGING_TABLE}（共 {len(all_rows)} 行）...', flush=True)
    ensure_schema()
    written = write_staging(all_rows)
    print(f'  抓取阶段完成，中间表最终写入 {written} 行（未写生产）', flush=True)


def cmd_promote(metrics):
    print('[1] 确保中间表存在...', flush=True)
    ensure_schema()
    print('[2] 校验中间表...', flush=True)
    validate_staging(metrics)
    print('[3] 增量写生产...', flush=True)
    promote_staging(metrics)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--status', action='store_true', help='只读显示生产表当前状态')
    ap.add_argument('--dry-run', action='store_true', help='抓取并打印样本，不写任何表')
    ap.add_argument('--to-staging', action='store_true', help='抓取并只写中间表')
    ap.add_argument('--promote', action='store_true', help='校验中间表并写生产表')
    ap.add_argument('--metric', help='只处理指定 metric，逗号分隔，默认四个日更序列')
    args = ap.parse_args()
    metrics = parse_metrics(args.metric)

    print('=== macro_history 增量刷新（staging → promote） ===')
    if args.status:
        cmd_status(metrics)
        return
    if args.promote:
        if args.dry_run or args.to_staging:
            sys.exit('--promote 不能与 --dry-run/--to-staging 同用')
        cmd_promote(metrics)
        return
    if args.to_staging or args.dry_run:
        cmd_fetch(metrics, args.dry_run)
        return
    sys.exit('必须指定 --status / --dry-run / --to-staging / --promote')


if __name__ == '__main__':
    main()
