#!/usr/bin/env python3
"""
reconcile_fund_universe.py — 全量基金主列表差集对账 + 补录（永久闸门）

背景：
  fund_scores 的 .OF 场外基金来自 nightly 的 fetch_and_import_funds（5 大类 FundGuideapi），
  ETF/LOF 来自 sync_etfs_to_fund_scores（仅"标签关联"的场内基金）。两条数据流都非全量，
  且无与权威主列表的对账 → 经理「代表产品」中有大量基金不在 fund_scores（事故：878 只），
  且每日只重算不补新基金。

  本脚本是根因修复的"永久闸门"：
    1. 拉取东方财富全量主列表 fundcode_search.js（约 28210 只，权威全集）；
    2. 与 fund_scores 按归一化代码（ltrim(regexp_replace(c,'\\D','g'),'0')）做差集；
    3. 缺失的基金按主列表类型补录为 fund_scores 行——场内 ETF/LOF/封闭 → 裸 6 位码，
       其余（含定开、场外） → 加 .OF 后缀；默认仅写 c/n/t0/t1/t1_tt 骨架（瞬间关闭覆盖缺口，
       经理图鉴即可解析出类型/规模占位），可选 --enrich 抓 fundf10 jbgk 补经理/规模等明细；
    4. 打印覆盖率；低于阈值（默认 0.99）时 --report 模式 exit 非 0，供 CI/daily 告警。

  幂等：只处理差集，重跑安全；骨架 INSERT 用 ON CONFLICT(c) DO NOTHING，明细 UPSERT 用
  ON CONFLICT(c) DO UPDATE。已存在的行（无论采用何种 key 形式）一律跳过，绝不覆盖既有数据。

用法：
  python3 reconcile_fund_universe.py --report                 # 仅校验覆盖率（CI/daily 前置闸门）
  python3 reconcile_fund_universe.py                          # 差集补录骨架（幂等）
  python3 reconcile_fund_universe.py --enrich --limit 500    # 顺便抓 jbgk 补经理/规模（限 500 只/次）
"""
import os
import re
import sys
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from _db import run_sql  # 统一 SQL 层（SUPABASE_DB_URL 直连 / PAT 回退）

MASTER_URL = 'https://fund.eastmoney.com/js/fundcode_search.js'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

# 补录骨架的列（其余 55 列默认 NULL，满足"仅 c 为 NOT NULL 无默认"约束）
STUB_COLS = ['c', 'n', 't0', 't1', 't1_tt']
# 明细补充列（--enrich 抓取后 UPSERT 填充，不覆盖已有非空值）
ENRICH_COLS = [
    'fund_manager', 'company', 'fund_scale', 'share_scale',
    'manage_fee', 'custody_fee', 'sale_fee', 'found_date',
]


def is_on_exchange(code):
    """场内基金（ETF/LOF/封闭）：沪市 5xxxxx、深市 15xxxx/16xxxx。其余为场外。"""
    if not code or len(code) != 6 or not code.isdigit():
        return False
    return code.startswith('5') or code.startswith('15') or code.startswith('16')


def canonical_key(code):
    """fund_scores 主键规则（与 sync_etfs_to_fund_scores.py 一致）：
    场内用裸码，场外加 .OF 后缀。"""
    return code if is_on_exchange(code) else code + '.OF'


def norm_int(code):
    """归一化代码为整数（去非数字 + 去前导零），用于跨源 join。"""
    if not code:
        return None
    digits = re.sub(r'\D', '', str(code))
    digits = digits.lstrip('0')
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def map_type(mt):
    """主列表 type 字段（如 "混合型"/"ETF"/"定开债券型"）→ (t0一级, t1二级, t1_tt展示)。
    t1_tt 保留完整主列表类型（经理图鉴展示用）；t0 归一到 fund_scores 既有大类词汇。
    """
    if not mt:
        return ('', '', '')
    t = mt.strip()
    if 'ETF' in t:
        base = 'ETF'
    elif 'LOF' in t:
        base = 'LOF'
    elif t.startswith('QDII') or '海外' in t or '全球' in t:
        base = 'QDII'
    elif '货币' in t:
        base = '货币型'
    elif '债券' in t:
        base = '债券型'
    elif '股票' in t:
        base = '股票型'
    elif '混合' in t:
        base = '混合型'
    elif '指数' in t:
        base = '指数型'
    elif 'FOF' in t.upper():
        base = 'FOF'
    elif '保本' in t:
        base = '保本型'
    elif '理财' in t:
        base = '理财型'
    elif '封闭' in t:
        base = '封闭式'
    else:
        base = t
    return (base, t, t)


def fetch_master_list():
    """拉取东方财富全量基金主列表，返回 [{code, name, type}]。"""
    import subprocess
    for attempt in range(1, 4):
        try:
            r = subprocess.run(
                ['curl', '-s', '--max-time', '40', '-H', f'User-Agent: {UA}',
                 '-H', 'Referer: https://fund.eastmoney.com/', MASTER_URL],
                capture_output=True, text=True, timeout=50)
            txt = r.stdout
            m = re.search(r'var r\s*=\s*(\[.*\]);', txt, re.S)
            if not m:
                print(f'  [warn] 主列表解析失败（第{attempt}/3 次），重试', flush=True)
                time.sleep(3)
                continue
            rows = re.findall(r'\["([0-9]{6})","([^"]*)","([^"]*)","([^"]*)","([^"]*)"\]', m.group(1))
            out = []
            for code, _py, name, t, _py3 in rows:
                out.append({'code': code, 'name': name.strip(), 'type': t.strip()})
            print(f'  [ok] 主列表解析 {len(out)} 只', flush=True)
            return out
        except Exception as e:
            print(f'  [warn] 主列表抓取异常（第{attempt}/3 次）: {e}', flush=True)
            time.sleep(3)
    raise RuntimeError('主列表拉取失败（3 次重试耗尽）')


def get_existing():
    """返回 (set_of_c 精确键, set_of_norm 归一化整数)。"""
    rows = run_sql("SELECT c FROM fund_scores")
    exact = set()
    norm = set()
    for r in rows:
        c = r.get('c')
        if not c:
            continue
        exact.add(c)
        n = norm_int(c)
        if n is not None:
            norm.add(n)
    return exact, norm


def compute_diff(master, existing_exact, existing_norm):
    """返回缺失基金列表（已判定差集，绝不重复插入已存在行）。"""
    missing = []
    for f in master:
        ckey = canonical_key(f['code'])
        if ckey in existing_exact:
            continue
        n = norm_int(f['code'])
        if n is not None and n in existing_norm:
            continue  # 已以另一种 key 形式存在，lookup 归一化可命中，跳过
        missing.append(f)
    return missing


def _esc(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def insert_stubs(missing):
    """批量 INSERT 骨架行（c/n/t0/t1/t1_tt），ON CONFLICT(c) DO NOTHING 保证幂等。"""
    if not missing:
        return 0
    total = 0
    BATCH = 500
    for i in range(0, len(missing), BATCH):
        batch = missing[i:i + BATCH]
        values = []
        for f in batch:
            t0, t1, t1_tt = map_type(f['type'])
            vals = [_esc(canonical_key(f['code'])), _esc(f['name']),
                    _esc(t0), _esc(t1), _esc(t1_tt)]
            values.append('(' + ', '.join(vals) + ')')
        sql = (f"INSERT INTO fund_scores ({', '.join(STUB_COLS)}) VALUES "
               + ', '.join(values)
               + " ON CONFLICT (c) DO NOTHING;")
        run_sql(sql, timeout=300)
        total += len(batch)
        print(f'  insert stubs {total}/{len(missing)}', flush=True)
    return total


def fetch_jbgk(code):
    """抓 fundf10 概况页解析经理/规模等（复用兄弟脚本解析器）。"""
    try:
        from fetch_fund_basic_info import parse_jbgk
    except Exception:
        return {}
    url = f'https://fundf10.eastmoney.com/jbgk_{code}.html'
    try:
        import requests
        r = requests.get(url, headers={'User-Agent': UA,
                                        'Referer': 'https://fundf10.eastmoney.com/'},
                         timeout=12)
        if r.status_code == 200 and ('基金经理' in r.text or '基金类型' in r.text):
            return parse_jbgk(r.text)
    except Exception:
        pass
    return {}


def get_detail_missing_codes(limit):
    """返回 fund_scores 中「缺基金经理或规模」的裸码列表（含本次补录的骨架行）。
    这些是 jbgk 待充实目标；用裸码（去 .OF 后缀）拼 jbgk URL。"""
    sql = ("SELECT c FROM fund_scores "
           "WHERE fund_manager IS NULL OR fund_scale IS NULL "
           "ORDER BY c")
    if limit:
        sql += f" LIMIT {int(limit)}"
    rows = run_sql(sql)
    out = []
    for r in rows:
        c = r.get('c') or ''
        out.append(c.replace('.OF', ''))
    return out


def enrich(codes):
    """对给定裸码批量抓 jbgk 补明细，UPSERT（ON CONFLICT(c) DO UPDATE，仅填非空）。"""
    if not codes:
        return 0
    print(f'  [enrich] 抓取 jbgk 明细 {len(codes)} 只（并发 8）...', flush=True)
    rows = [None] * len(codes)

    def worker(idx, code):
        info = fetch_jbgk(code)
        if not info:
            return idx, None
        return idx, {'c': canonical_key(code), **info}

    done = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(worker, i, code): i for i, code in enumerate(codes)}
        for fut in as_completed(futs):
            idx, row = fut.result()
            rows[idx] = row
            done += 1
            if done % 100 == 0:
                print(f'    ... 已解析 {done}/{len(codes)}', flush=True)
            time.sleep(0.05)
    rows = [r for r in rows if r]
    upd = 0
    for r in rows:
        set_clauses = []
        for col in ENRICH_COLS:
            if r.get(col) not in (None, ''):
                set_clauses.append(f"{col}=EXCLUDED.{col}")
        if not set_clauses:
            continue
        # 仅更新明细列，绝不覆盖 t0/t1/t1_tt（类型以主列表/既有为准）
        sql = (f"INSERT INTO fund_scores (c, {', '.join(ENRICH_COLS)}) "
               f"VALUES ({_esc(r['c'])}, {', '.join(_esc(r.get(c)) for c in ENRICH_COLS)}) "
               f"ON CONFLICT (c) DO UPDATE SET {', '.join(set_clauses)};")
        run_sql(sql, timeout=120)
        upd += 1
    print(f'  [enrich] UPSERT 明细 {upd} 只', flush=True)
    return upd


def report_coverage(master, existing_exact, existing_norm, threshold=0.99):
    """打印覆盖率并返回是否达标。"""
    present = 0
    by_type_missing = {}
    for f in master:
        ckey = canonical_key(f['code'])
        n = norm_int(f['code'])
        if ckey in existing_exact or (n is not None and n in existing_norm):
            present += 1
        else:
            key = (map_type(f['type'])[0] or '未知')
            by_type_missing[key] = by_type_missing.get(key, 0) + 1
    total = len(master)
    cov = present / total if total else 1.0
    print('=' * 60, flush=True)
    print(f'  覆盖率校验：{present}/{total} = {cov*100:.2f}%  (阈值 {threshold*100:.0f}%)', flush=True)
    print(f'  缺失 {total - present} 只，按大类分布：', flush=True)
    for k, v in sorted(by_type_missing.items(), key=lambda x: -x[1]):
        print(f'    {k}: {v}', flush=True)
    ok = cov >= threshold
    print(f'  结论：{"达标 ✓" if ok else "未达标 ✗"}', flush=True)
    print('=' * 60, flush=True)
    return ok


def main():
    ap = argparse.ArgumentParser(description='全量基金主列表差集对账 + 补录')
    ap.add_argument('--report', action='store_true', help='仅校验覆盖率，不写入')
    ap.add_argument('--enrich', action='store_true', help='补录骨架后抓 jbgk 补明细')
    ap.add_argument('--limit', type=int, default=0, help='--enrich 单次抓取上限（0=不限）')
    ap.add_argument('--threshold', type=float, default=0.99, help='覆盖率达标阈值')
    args = ap.parse_args()

    print('=' * 60, flush=True)
    print(' 全量基金主列表差集对账（reconcile_fund_universe）', flush=True)
    print('=' * 60, flush=True)

    print('\n[1] 拉取权威主列表...', flush=True)
    master = fetch_master_list()

    print('\n[2] 读取 fund_scores 现有键...', flush=True)
    existing_exact, existing_norm = get_existing()
    print(f'    fund_scores 现有 {len(existing_exact)} 行', flush=True)

    print('\n[3] 计算差集...', flush=True)
    missing = compute_diff(master, existing_exact, existing_norm)
    print(f'    缺失 {len(missing)} 只', flush=True)

    if args.report:
        ok = report_coverage(master, existing_exact, existing_norm, args.threshold)
        sys.exit(0 if ok else 2)

    if missing:
        print(f'\n[4] 补录骨架行（{len(missing)} 只）...', flush=True)
        n = insert_stubs(missing)
        print(f'    写入 {n} 只', flush=True)
    else:
        print('\n[4] 无缺失，fund_scores 已覆盖全量主列表 ✓', flush=True)

    if args.enrich:
        print(f'\n[5] 补充明细（enrich：抓取缺经理/规模的行）...', flush=True)
        codes = get_detail_missing_codes(args.limit)
        print(f'    待充实 {len(codes)} 只', flush=True)
        enrich(codes)

    print('\n[6] 复核覆盖率...', flush=True)
    existing_exact, existing_norm = get_existing()
    report_coverage(master, existing_exact, existing_norm, args.threshold)
    print('\n完成。', flush=True)


if __name__ == '__main__':
    main()
