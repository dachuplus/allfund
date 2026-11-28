#!/usr/bin/env python3
"""按基金主体刷新规模、上季规模、规模增长%（数据源：天天基金 pingzhongdata）。

口径（已与用户确认）：
  1. 非货币基金：Data_assetAllocation 的「净资产」序列已是基金主体合并口径；
     同一主体 A/B/C/D/E/F/I/O/R/T/U/Y 等份额返回相同序列，禁止再按份额相加。
  2. 货币基金：pingzhongdata 没有合并「净资产」序列；用各份额的
     Data_fluctuationScale.series[].y（单份额规模，数值等于总份额），按主体求和。
  3. 当季 = 最新报告期；上季 = 次新报告期。
  4. 增长 = (当季 - 上季) / 上季 * 100，保留 2 位；上季缺失/为 0 时置 NULL。

写入策略（用户 2026-11-24 要求）：
  - 抓取阶段只写中间表 public.fund_scale_snapshot，严禁直接改生产；
  - 校验阶段核对行数、覆盖率、负值/异常值、两个已知样本；
  - 校验全部通过后才按基金代码分批（默认 2000/批、小事务）写回 fund_scores；
    2026-11-28 起不再用一条覆盖 2.8 万行的大 UPDATE，避免长事务/WAL 打挂免费实例；
  - 2026-11-28 起物化视图统一由调度中心链尾刷新一次，本脚本不再单独 REFRESH，
    避免同一张视图被多个任务反复全量重建；
  - --rebuild-view 只在视图结构（列/规则）变更时用，会 DROP + CREATE。

用法：
  # 只看样本，不写任何表
  python3 scripts/refresh_fund_scale_growth.py --dry-run --limit 20

  # 抓取 → 只写中间表（夜间 CI 第一步）
  python3 scripts/refresh_fund_scale_growth.py --to-staging

  # 校验中间表 → 写生产（夜间 CI 第二步）
  python3 scripts/refresh_fund_scale_growth.py --promote

  # 首次加列后重建主份额视图
  python3 scripts/refresh_fund_scale_growth.py --promote --rebuild-view
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, '.env.local')
PROGRESS_FILE = '/tmp/allfund_scale_growth.progress'
FAIL_FILE = '/tmp/allfund_scale_growth.failures'

PROJECT_REF = 'tqhtegazxykkqfcpejky'
MGMT_API = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
SNAPSHOT_TABLE = 'public.fund_scale_snapshot'

NEW_COLUMNS = ('fund_scale_prev', 'fund_scale_growth')
# 上季规模低于 0.2 亿（2000 万元）视为无可比基数：多为次新基金/份额变更，
# 增长率会失真，统一置 NULL，前端显示 --；保留覆盖仍 >90%。
MIN_PREV_SCALE = 0.2

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

import threading
_lock = threading.Lock()
_last_fetch = [0.0]

# 与 fund_scores_main.sql 的分组规则一致，额外纳入 O/U 份额后缀
SHARE_SUFFIX_RE = re.compile(r'[ABCDEFHIOURTY]$')
FRONT_END_RE = re.compile(r'\((?:前端|后端)\)$')


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
TOKEN = os.environ.get('SUPABASE_MGMT_TOKEN') or os.environ.get('SUPABASE_PAT')
if not TOKEN:
    sys.exit('缺少 SUPABASE_MGMT_TOKEN / SUPABASE_PAT')


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
    stmts = []
    for table in ('public.fund_scores', 'public.fund_scores_staging', 'public.fund_scores_test'):
        for col in NEW_COLUMNS:
            stmts.append(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} double precision;')
    stmts.extend([
        f'''CREATE TABLE IF NOT EXISTS {SNAPSHOT_TABLE} (
              c text PRIMARY KEY,
              fund_scale double precision,
              fund_scale_prev double precision,
              fund_scale_growth double precision,
              updated_at timestamptz NOT NULL DEFAULT now()
            )''',
        f'GRANT SELECT ON {SNAPSHOT_TABLE} TO anon, authenticated, service_role',
    ])
    for stmt in stmts:
        run_sql(stmt, timeout=120)
    print(f'  ✓ 已确保生产新列与中间表 {SNAPSHOT_TABLE} 存在', flush=True)


def clear_snapshot():
    run_sql(f'TRUNCATE TABLE {SNAPSHOT_TABLE}', timeout=120)
    print('  ✓ 已清空中间表', flush=True)


def rebuild_main_view():
    path = os.path.join(SCRIPT_DIR, 'fund_scores_main.sql')
    with open(path, encoding='utf-8') as fh:
        raw = fh.read()
    lines = [ln for ln in raw.splitlines() if not ln.strip().startswith('--')]
    body = '\n'.join(lines)
    statements, buf, in_str, in_dq = [], [], False, False
    for ch in body:
        if ch == "'" and not in_dq:
            in_str = not in_str
        elif ch == '"' and not in_str:
            in_dq = not in_dq
        if ch == ';' and not in_str and not in_dq:
            stmt = ''.join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
        else:
            buf.append(ch)
    tail = ''.join(buf).strip()
    if tail:
        statements.append(tail)
    for stmt in statements:
        run_sql(stmt, timeout=600)
    print(f'  ✓ 已重建 fund_scores_main（执行 {len(statements)} 条语句）', flush=True)


def rate_sleep(delay):
    with _lock:
        wait = delay - (time.time() - _last_fetch[0])
        if wait > 0:
            time.sleep(wait)
        _last_fetch[0] = time.time()


def extract_json(js, var_name):
    m = re.search(r'var\s+' + re.escape(var_name) + r'\s*=\s*(\{.*?\});', js, re.S)
    if not m:
        return None
    raw = m.group(1)
    depth, in_str, escaped, end = 0, False, False, -1
    for i, ch in enumerate(raw):
        if escaped:
            escaped = False
            continue
        if ch == '\\':
            escaped = True
            continue
        if ch == "'":
            in_str = not in_str
        elif not in_str:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    if end <= 0:
        return None
    try:
        return json.loads(raw[:end])
    except Exception:
        return None


def fetch_js(code, delay):
    bare = str(code).replace('.OF', '').replace('.of', '').strip()
    url = f'https://fund.eastmoney.com/pingzhongdata/{bare}.js'
    rate_sleep(delay)
    cmd = [
        'curl', '-sS', '-L', '--compressed', '--max-time', '25',
        '-A', UA, '-e', 'https://fund.eastmoney.com/', url,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except Exception:
        return None
    if proc.returncode != 0 or not proc.stdout:
        return None
    return {
        'alloc': extract_json(proc.stdout, 'Data_assetAllocation'),
        'scale': extract_json(proc.stdout, 'Data_fluctuationScale'),
    }


def non_money_latest_prev(js):
    alloc = js.get('alloc') if js else None
    if not alloc:
        return None, None
    cats = alloc.get('categories') or []
    net = None
    for s in alloc.get('series') or []:
        if s.get('name') == '净资产':
            net = s.get('data') or []
            break
    if not net:
        return None, None
    pairs = []
    for i, cat in enumerate(cats):
        if i < len(net) and net[i] is not None:
            try:
                pairs.append((str(cat), float(net[i])))
            except (TypeError, ValueError):
                pass
    pairs.sort(key=lambda x: x[0])
    if not pairs:
        return None, None
    cur = pairs[-1][1]
    prev = pairs[-2][1] if len(pairs) >= 2 else None
    return cur, prev


def money_latest_prev(js_list):
    """js_list: [(code, js), ...]；按报告期对齐后把所有份额的规模求和。"""
    by_share = []
    all_dates = set()
    for _code, js in js_list:
        scale = js.get('scale') if js else None
        if not scale:
            continue
        cats = scale.get('categories') or []
        series = scale.get('series') or []
        if not cats or not series:
            continue
        vals = []
        for s in series:
            if isinstance(s, dict) and s.get('y') is not None:
                try:
                    vals.append(float(s['y']))
                except (TypeError, ValueError):
                    vals.append(None)
            else:
                vals.append(None)
        d = {}
        for i, cat in enumerate(cats):
            if i < len(vals) and vals[i] is not None:
                d[str(cat)] = vals[i]
        if d:
            by_share.append(d)
            all_dates.update(d)
    if not by_share or not all_dates:
        return None, None
    dates = sorted(all_dates)
    cur_date, prev_date = dates[-1], (dates[-2] if len(dates) >= 2 else None)
    cur = sum(d[cur_date] for d in by_share if cur_date in d)
    prev = sum(d[prev_date] for d in by_share if prev_date in d) if prev_date else None
    return round(cur, 4), (round(prev, 4) if prev is not None else None)


def growth_pct(cur, prev):
    if cur is None or prev is None or prev <= 0:
        return None
    if prev < MIN_PREV_SCALE:
        return None
    return round((cur - prev) / prev * 100, 2)


def norm_group(name):
    s = FRONT_END_RE.sub('', name or '')
    s = SHARE_SUFFIX_RE.sub('', s).strip()
    return s


def load_groups():
    rows = run_sql(
        'SELECT c, n, t0, found_date FROM public.fund_scores ORDER BY c',
        timeout=300,
    )
    groups = {}
    for row in rows:
        grp = norm_group(row.get('n'))
        if not grp:
            continue
        g = groups.setdefault(grp, {'codes': [], 'money': False, 'found': {}})
        g['codes'].append(row['c'])
        if row.get('t0') == '货币型':
            g['money'] = True
        g['found'][row['c']] = row.get('found_date') or ''
    return groups


def pick_non_money_rep(codes, found):
    def key(c):
        a_first = 0 if re.search(r'A(?:\.OF)?$', c) else 1
        date = found.get(c) or '9999-99-99'
        return (a_first, date, c)
    return sorted(codes, key=key)[0]


def process_group(item, delay):
    grp, g = item
    codes = g['codes']
    try:
        if g['money']:
            js_list = [(c, fetch_js(c, delay)) for c in codes]
            cur, prev = money_latest_prev(js_list)
        else:
            rep = pick_non_money_rep(codes, g['found'])
            cur, prev = non_money_latest_prev(fetch_js(rep, delay))
        growth = growth_pct(cur, prev)
        # 极小上季基数没有可比意义，连上季规模一起置空，避免前端显示 0.0001 亿这类脏值
        if prev is not None and prev < MIN_PREV_SCALE:
            prev = None
        return {
            'grp': grp, 'codes': codes, 'money': g['money'],
            'cur': cur, 'prev': prev, 'growth': growth, 'error': None,
        }
    except Exception as exc:
        return {'grp': grp, 'codes': codes, 'error': str(exc), 'cur': None, 'prev': None, 'growth': None}


def load_set(path):
    if not os.path.exists(path):
        return set()
    with open(path, encoding='utf-8') as fh:
        return {ln.strip() for ln in fh if ln.strip()}


def save_set(path, values):
    with open(path, 'w', encoding='utf-8') as fh:
        for v in sorted(values):
            fh.write(v + '\n')


def sql_num(v):
    return 'NULL' if v is None else str(float(v))


def write_snapshot(flat):
    total = 0
    chunk = 500
    for i in range(0, len(flat), chunk):
        vals = []
        for c, cur, prev, growth in flat[i:i + chunk]:
            c = str(c).replace("'", "''")
            if not re.fullmatch(r'[0-9A-Za-z.]+', c):
                continue
            vals.append(
                f"('{c}', {sql_num(cur)}, {sql_num(prev)}, {sql_num(growth)}, now())"
            )
        if not vals:
            continue
        sql = (
            f'INSERT INTO {SNAPSHOT_TABLE} (c, fund_scale, fund_scale_prev, fund_scale_growth, updated_at) '
            f"VALUES {', '.join(vals)} "
            'ON CONFLICT (c) DO UPDATE SET '
            'fund_scale=EXCLUDED.fund_scale, '
            'fund_scale_prev=EXCLUDED.fund_scale_prev, '
            'fund_scale_growth=EXCLUDED.fund_scale_growth, '
            'updated_at=now()'
        )
        run_sql(sql, timeout=300)
        total += len(vals)
        print(f'  ✓ 中间表写入 {total}/{len(flat)} 行', flush=True)
    return total


def sanitize_snapshot():
    """把极小上季基数视为无可比样本：上季规模和增长率一起置 NULL。"""
    sql = f"""
      UPDATE {SNAPSHOT_TABLE}
      SET fund_scale_prev = NULL, fund_scale_growth = NULL
      WHERE fund_scale_prev IS NOT NULL
        AND (fund_scale_prev <= 0 OR fund_scale_prev < {MIN_PREV_SCALE})
    """
    run_sql(sql, timeout=300)
    print(f'  ✓ 已清洗极小上季基数（< {MIN_PREV_SCALE} 亿）', flush=True)


def validate_snapshot():
    sql = f"""
      SELECT
        (SELECT count(*) FROM public.fund_scores) AS prod_total,
        count(*) AS snap_rows,
        count(fund_scale) AS has_cur,
        count(fund_scale_prev) AS has_prev,
        count(fund_scale_growth) AS has_growth,
        count(*) FILTER (
          WHERE (fund_scale IS NOT NULL AND fund_scale < 0)
             OR (fund_scale_prev IS NOT NULL AND fund_scale_prev < 0)
             OR (fund_scale_growth IS NOT NULL
                 AND (fund_scale_growth < -100 OR fund_scale_growth > 10000))
             OR (fund_scale_prev IS NOT NULL AND fund_scale_prev > 0
                 AND fund_scale_prev < {MIN_PREV_SCALE})
             OR (fund_scale_prev = 0 AND fund_scale_growth IS NOT NULL)
        ) AS bad_rows
      FROM {SNAPSHOT_TABLE}
    """
    st = run_sql(sql, timeout=300)[0]
    print('  校验统计:', st, flush=True)

    def need(cond, msg):
        if not cond:
            raise RuntimeError(f'中间表校验失败：{msg}')

    need(st['snap_rows'] >= st['prod_total'] * 0.90,
         f"覆盖行数 {st['snap_rows']} < 90%×生产 {st['prod_total']}")
    need(st['has_cur'] >= st['snap_rows'] * 0.95,
         f"当季规模覆盖 {st['has_cur']}/{st['snap_rows']} < 95%")
    need(st['has_prev'] >= st['snap_rows'] * 0.85,
         f"上季规模覆盖 {st['has_prev']}/{st['snap_rows']} < 85%")
    need(st['has_growth'] >= st['snap_rows'] * 0.85,
         f"增长覆盖 {st['has_growth']}/{st['snap_rows']} < 85%")
    need(st['bad_rows'] == 0, f"异常行数 {st['bad_rows']} > 0")

    samples = run_sql(
        f"SELECT c, fund_scale, fund_scale_prev, fund_scale_growth "
        f"FROM {SNAPSHOT_TABLE} WHERE c IN ('018080.OF', '202301.OF')",
        timeout=120,
    )
    smap = {r['c']: r for r in samples}
    a = smap.get('018080.OF')
    m = smap.get('202301.OF')

    def growth_matches(row):
        if not row:
            return False
        cur, prev, growth = row['fund_scale'], row['fund_scale_prev'], row['fund_scale_growth']
        if cur is None or prev is None or prev <= 0 or growth is None:
            return False
        return abs(((cur - prev) / prev * 100) - float(growth)) < 0.02

    # 不再写死季度数字：上季度换数后会误拦。改查口径是否合理。
    # 018080.OF = 非货币主体合并口径；202301.OF = 南方现金增利货币 A/B/C/D/E/F 六份额合并。
    need(a is not None and 10 <= a['fund_scale'] <= 30 and 10 <= a['fund_scale_prev'] <= 30,
         '非货币样本 018080.OF 规模落在主体合并口径合理区间外')
    need(m is not None and m['fund_scale'] >= 100 and m['fund_scale_prev'] >= 100,
         '货币样本 202301.OF 不是六份额合并口径（单 A 份额约 45 亿）')
    need(growth_matches(a) and growth_matches(m),
         '样本规模增长率与当季/上季规模不一致')
    print('  ✓ 中间表校验全部通过', flush=True)
    return st


def promote_snapshot(batch_size=2000):
    """按 c 分批小事务写生产，保持口径与原来的单条 UPDATE ... FROM 完全一致。"""
    codes = [r['c'] for r in run_sql(
        f"SELECT c FROM {SNAPSHOT_TABLE} WHERE fund_scale IS NOT NULL ORDER BY c",
        timeout=300)]
    if not codes:
        raise RuntimeError('中间表无可写回的规模数据（fund_scale 全为 NULL）')
    print(f'  ✓ 规模写回 {len(codes)} 行，分 {(len(codes) + batch_size - 1) // batch_size} 批'
          f'（每批 {batch_size}）', flush=True)

    for idx, start in enumerate(range(0, len(codes), batch_size), 1):
        chunk = codes[start:start + batch_size]
        ins = ','.join("'" + c.replace("'", "''") + "'" for c in chunk)
        sql = f"""
          UPDATE public.fund_scores f SET
            fund_scale = s.fund_scale,
            fund_scale_prev = s.fund_scale_prev,
            fund_scale_growth = s.fund_scale_growth
          FROM {SNAPSHOT_TABLE} s
          WHERE f.c = s.c AND s.c IN ({ins}) AND s.fund_scale IS NOT NULL
        """
        run_sql(sql, timeout=300)
        if idx % 5 == 0 or idx * batch_size >= len(codes):
            print(f'    规模写回批次 {idx}/{(len(codes) + batch_size - 1) // batch_size}', flush=True)
    print('  ✓ 已分批写入生产表 fund_scores', flush=True)
    # 物化视图由调度中心链尾统一刷新一次；此处不再单独 REFRESH。
    print('  ✓ 规模写回完成（物化视图由调度中心链尾统一刷新）', flush=True)


def cmd_fetch(args):
    print('[1] 读取基金主体分组...', flush=True)
    groups = load_groups()
    items = sorted(groups.items())
    items = [it for i, it in enumerate(items) if i % args.shards == args.shard]
    done = load_set(PROGRESS_FILE) if args.resume else set()
    items = [it for it in items if it[0] not in done]
    if args.limit:
        items = items[:args.limit]
    print(f'  待处理主体 {len(items)}（货币 {sum(1 for _, g in items if g["money"])}）', flush=True)

    print('[2] 按 pingzhongdata 抓取并计算...', flush=True)
    results, failures = [], []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process_group, it, args.delay) for it in items]
        for n, fut in enumerate(as_completed(futures), 1):
            r = fut.result()
            if r.get('error') or r['cur'] is None:
                failures.append(r['grp'])
            else:
                results.append(r)
            if n % 500 == 0:
                print(f'  已处理 {n}/{len(items)}，有效 {len(results)}，失败 {len(failures)}', flush=True)

    print(f'  完成：有效 {len(results)}，失败 {len(failures)}', flush=True)
    for r in results[:5]:
        print(f"  样本 {r['grp']}: cur={r['cur']} prev={r['prev']} growth={r['growth']}", flush=True)

    if args.dry_run:
        print('  --dry-run：未写任何表', flush=True)
        return

    print('[3] 确保 schema...', flush=True)
    ensure_schema()
    print('[4] 清空并写入中间表...', flush=True)
    clear_snapshot()
    flat = []
    for r in results:
        for c in r['codes']:
            flat.append((c, r['cur'], r['prev'], r['growth']))
    written = write_snapshot(flat)
    print(f'  中间表最终写入 {written} 行', flush=True)
    sanitize_snapshot()
    save_set(PROGRESS_FILE, done | {r['grp'] for r in results})
    save_set(FAIL_FILE, set(failures))
    print('抓取阶段完成（未写生产）', flush=True)


def cmd_promote(args):
    print('[1] 确保 schema...', flush=True)
    ensure_schema()
    print('[2] 清洗极小上季基数...', flush=True)
    sanitize_snapshot()
    print('[3] 校验中间表...', flush=True)
    validate_snapshot()
    print('[4] 写生产表...', flush=True)
    promote_snapshot()
    if args.rebuild_view:
        print('[5] 重建主份额物化视图...', flush=True)
        rebuild_main_view()
    print('生产切换完成', flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--dry-run', action='store_true', help='只抓取并打印样本，不写任何表')
    ap.add_argument('--to-staging', action='store_true', help='抓取并只写中间表')
    ap.add_argument('--promote', action='store_true', help='校验中间表并写生产表')
    ap.add_argument('--limit', type=int, default=None, help='只处理前 N 个主体（冒烟）')
    ap.add_argument('--shard', type=int, default=0, help='分片编号（从 0 开始）')
    ap.add_argument('--shards', type=int, default=1, help='分片总数')
    ap.add_argument('--workers', type=int, default=8, help='并发数')
    ap.add_argument('--delay', type=float, default=0.12, help='每请求最小间隔（秒）')
    ap.add_argument('--resume', action='store_true', help='跳过进度文件中已完成的主体')
    ap.add_argument('--rebuild-view', action='store_true', help='promote 后重建 fund_scores_main')
    args = ap.parse_args()

    if args.rebuild_view and not args.promote:
        print('[1] 仅重建主份额物化视图...', flush=True)
        ensure_schema()
        rebuild_main_view()
        return

    if args.promote:
        if args.dry_run or args.to_staging:
            sys.exit('--promote 不能与 --dry-run/--to-staging 同用')
        cmd_promote(args)
        return

    if not args.dry_run and not args.to_staging:
        sys.exit('必须指定 --to-staging（写中间表）或 --promote（校验后写生产）')
    cmd_fetch(args)


if __name__ == '__main__':
    main()
