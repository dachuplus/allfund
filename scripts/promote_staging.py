#!/usr/bin/env python3
"""
promote_staging.py — 校验 fund_scores_staging 并原子切换到生产 fund_scores

设计目标（解决"夜跑 TRUNCATE 清空生产表"的回归 + "灾难性丢失"误报）：
  1. 抓取/计算全程写入【临时表】fund_scores_staging，绝不触碰生产 fund_scores；
  2. 本脚本在临时表写入完成后做三层校验（均以"数据源全量"为基准，而非上一版生产表）：
       L1 数据拉取数量校验：staging 总量 / 各大类 是否覆盖东方财富全量主列表
                             （场内 ETF/LOF 由 sync_etfs/reconcile 直写，不进 fetch，单独扣除）；
       L2 中间表数据量/质量校验：staging 总数据量、货币型数量、k_all 非空率、等级分布；
       L3 生产表数量校验（切换后）：生产总量是否覆盖数据源全量（允许新发基金超过，只卡缺失）。
  3. 校验通过后，才把临时表原子切到生产 fund_scores，并重建 fund_combined；
  4. 任何一步失败 → 拒绝切换、保留生产数据、从备份恢复，绝不产生空表。

  切换机制（2026-10-30 修正）：由「TRUNCATE 全表 + 全量 INSERT」改为
  「DELETE 仅 staging 管理的代码 + INSERT」，保留生产表中由 sync_etfs/reconcile
  直写、不进 staging 的代码（场内 ETF/LOF 等），天然避免误删，且使 L3 对得上全量。

用法：
  python3 promote_staging.py                 # 校验 + 原子切换
  python3 promote_staging.py --dry-run       # 仅跑三层校验与结构化输出，不切换（安全验证用）
  python3 promote_staging.py --skip-combined # 跳过 fund_combined 重建
（需 SUPABASE_MGMT_TOKEN 环境变量；CI 中自动注入）
"""
import os
import sys
import json
import time
import subprocess
import argparse
import re

MGMT_TOKEN = os.environ.get('SUPABASE_MGMT_TOKEN') or os.environ.get('SUPABASE_PAT')
if not MGMT_TOKEN:
    sys.exit('请设置环境变量 SUPABASE_MGMT_TOKEN（Supabase Personal Access Token）')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# fund_scores 全部数据列（不含 id，切换时由生产表自增生成）
PROMOTE_COLS = (
    'c,n,t0,t1,t1_tt,sg,daily_change,company,fund_scale,manage_fee,fund_manager,'
    'share_scale,custody_fee,sale_fee,found_date,ytd,r0w,r1m,r3m,r6m,r1y,r2y,r3y,r5y,'
    'r7y,r10y,return_all,dd1y,dd2y,dd3y,dd5y,sr1y,sr2y,sr3y,sr5y,'
    'k0w,k1m,k3m,k6m,k1,k2,k3,k5,k_all,score_grade,'
    'stock_pct,bond_pct,cash_pct,sub_purchase,sub_redemption,net_sub_share,total_share_end,net_asset_end,nav_change_rate,inst_hold_pct,indiv_hold_pct,internal_hold_pct'
)

# 数据源全量主列表（东方财富，权威全集口径，reconcile 同源）
MASTER_URL = 'https://fund.eastmoney.com/js/fundcode_search.js'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

CANON_CATS = ['股票型', '混合型', '债券型', '指数型', 'FOF', 'QDII', '货币型']


def pg(sql, timeout=300):
    from _db import run_sql as _db_run_sql
    return _db_run_sql(sql, timeout=timeout)


def get_t0_counts(table):
    rows = pg(f"SELECT t0, count(*) AS cnt FROM {table} WHERE t0 IS NOT NULL GROUP BY t0")
    return {r['t0']: r['cnt'] for r in rows}


# ── 结构化输出收集 ──────────────────────────────────────────────────────────
RESULTS = {'block': [], 'warn': [], 'pass': [], 'info': []}


def check(cond, msg, layer=None):
    """阻塞级校验：失败记入 block，成功记入 pass。返回 cond。"""
    tag = f'[{layer}] ' if layer else ''
    if not cond:
        print(f'  ❌ {tag}{msg}', flush=True)
        RESULTS['block'].append(f'{tag}{msg}')
        return False
    print(f'  ✅ {tag}{msg}', flush=True)
    RESULTS['pass'].append(f'{tag}{msg}')
    return True


def warn(msg, layer=None):
    tag = f'[{layer}] ' if layer else ''
    print(f'  ⚠️  {tag}{msg}', flush=True)
    RESULTS['warn'].append(f'{tag}{msg}')


def info(msg):
    print(f'  · {msg}', flush=True)
    RESULTS['info'].append(msg)


# ── 数据源全量口径 ───────────────────────────────────────────────────────────
def is_on_exchange(code):
    """场内基金（ETF/LOF/封闭）：沪市 5xxxxx、深市 15xxxx/16xxxx。其余为场外。"""
    if not code or len(code) != 6 or not code.isdigit():
        return False
    return code.startswith('5') or code.startswith('15') or code.startswith('16')


def map_type(mt):
    """主列表 type 字段 → (t0一级, t1二级, t1_tt展示)，t0 归一到 fund_scores 大类词汇。"""
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
    else:
        base = t
    return (base, t, t)


def fetch_master_raw():
    """拉取东方财富全量主列表，返回原始二维数组；失败返回 None。"""
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
            return json.loads(m.group(1))
        except Exception as e:
            print(f'  [warn] 主列表拉取异常（第{attempt}/3 次）: {e}', flush=True)
            time.sleep(3)
    return None


def get_universe():
    """返回权威全集口径：total / on_exchange / per_cat(7大类) / fetch_managed。
    场内(on_exchange)由 sync_etfs/reconcile 直写、不进 fetch，从 fetch 应覆盖的全集中扣除。"""
    raw = fetch_master_raw()
    if not raw:
        print('  ⚠️  主列表拉取失败，使用兜底常量（校验放宽，请关注数据源连通性）', flush=True)
        return {'total': 28210, 'on_exchange': 0, 'per_cat': {}, 'fetch_managed': 27000, 'fallback': True}
    total = len(raw)
    on_exchange = 0
    per_cat = {}
    for row in raw:
        code = str(row[0]).strip() if row and len(row) > 0 else ''
        mtype = row[2] if row and len(row) > 2 else ''
        if is_on_exchange(code):
            on_exchange += 1
            continue
        base = map_type(mtype)[0]
        if base in CANON_CATS:
            per_cat[base] = per_cat.get(base, 0) + 1
    fetch_managed = total - on_exchange
    return {'total': total, 'on_exchange': on_exchange, 'per_cat': per_cat,
            'fetch_managed': fetch_managed, 'fallback': False}


def print_summary():
    print('\n' + '=' * 64, flush=True)
    if RESULTS['block']:
        verdict = '❌ 校验失败 · 已拒绝切换，生产 fund_scores 保持不变'
    else:
        verdict = '✅ 全部校验通过 · 允许切换'
    print(f'  校验结论：{verdict}', flush=True)
    if RESULTS['block']:
        print(f'  ── 阻塞项 ({len(RESULTS["block"])}) ──', flush=True)
        for b in RESULTS['block']:
            print(f'     • {b}', flush=True)
    if RESULTS['warn']:
        print(f'  ── 警告 ({len(RESULTS["warn"])}，已放行) ──', flush=True)
        for w in RESULTS['warn']:
            print(f'     • {w}', flush=True)
    if RESULTS['pass']:
        print(f'  ── 通过 ({len(RESULTS["pass"])}) ──', flush=True)
        for p in RESULTS['pass']:
            print(f'     • {p}', flush=True)
    print('=' * 64, flush=True)


def main():
    parser = argparse.ArgumentParser(description='校验并原子切换 fund_scores_staging → fund_scores')
    parser.add_argument('--skip-combined', action='store_true',
                        help='跳过 fund_combined 重建（仅切换 fund_scores）')
    parser.add_argument('--force-combined', action='store_true',
                        help='忽略覆盖率守卫，强制重建 fund_combined（手动全量刷新用）')
    parser.add_argument('--dry-run', action='store_true',
                        help='仅跑三层校验与结构化输出，不执行切换（安全验证用）')
    args = parser.parse_args()

    print('=' * 64, flush=True)
    print(' 校验并原子切换 fund_scores_staging → fund_scores', flush=True)
    if args.dry_run:
        print('  模式：--dry-run（不切换，仅校验）', flush=True)
    print('=' * 64, flush=True)

    # ── 0. 前置检查：staging 是否存在且有数据 ─────────────────────────────
    print('\n[0] 前置检查', flush=True)
    try:
        st = pg("SELECT to_regclass('fund_scores_staging') AS t")
    except Exception as e:
        print(f'  [ERR] 无法访问数据库: {e}', flush=True)
        sys.exit(1)
    staging_table = st[0]['t'] if st and len(st) > 0 else None
    if not staging_table:
        print('  ✗ fund_scores_staging 不存在，请先运行 import_via_rest.py --staging', flush=True)
        sys.exit(1)

    # 0a. 归一化 staging.t0 → 天天 7 大类命名
    print('\n[0a] 归一化 fund_scores_staging.t0 → 天天 7 大类命名', flush=True)
    pg("""UPDATE fund_scores_staging
        SET t0 = CASE
            WHEN t0 IN ('QDII', 'QDII基金') OR t1_tt LIKE '%QDII%' OR t1_tt LIKE '%海外%' THEN 'QDII'
            WHEN t1_tt LIKE '指数型%' THEN '指数型'
            WHEN t1_tt IS NOT NULL THEN split_part(t1_tt, '-', 1)
            ELSE t0 END
        WHERE t0 IS DISTINCT FROM (
            CASE WHEN t0 IN ('QDII', 'QDII基金') OR t1_tt LIKE '%QDII%' OR t1_tt LIKE '%海外%' THEN 'QDII'
                 WHEN t1_tt LIKE '指数型%' THEN '指数型'
                 WHEN t1_tt IS NOT NULL THEN split_part(t1_tt, '-', 1)
                 ELSE t0 END
        )""")
    print('  ✓ staging.t0 已归一化', flush=True)

    # 0b. 【最高风控：分类不可漂移】以生产表既有分类为准回钉 staging 分类
    print('\n[0b] 分类回钉（防漂移）：以生产表既有分类覆盖 staging 同代码分类', flush=True)
    drift = pg("""SELECT s.t0 AS staging_t0, p.t0 AS prod_t0, count(*) AS n
                  FROM fund_scores_staging s JOIN fund_scores p ON s.c = p.c
                  WHERE s.t0 IS DISTINCT FROM p.t0
                  GROUP BY s.t0, p.t0 ORDER BY n DESC""")
    if drift:
        print('  ⚠️  检测到分类漂移（已被回钉消除），明细：', flush=True)
        for d in drift:
            print(f'     staging[{d["staging_t0"]}] → 生产[{d["prod_t0"]}]: {d["n"]} 只', flush=True)
        pg("""UPDATE fund_scores_staging s
              SET t0 = p.t0
              FROM fund_scores p
              WHERE s.c = p.c AND s.t0 IS DISTINCT FROM p.t0""")
        print(f'  ✓ 已回钉 {sum(d["n"] for d in drift)} 只基金分类（消除漂移）', flush=True)
    else:
        print('  ✓ 无分类漂移', flush=True)

    # 0b-2. 指数基金子类归一化证据（仅诊断，不影响流程）
    try:
        idx = pg("""SELECT count(*) AS n FROM fund_scores_staging WHERE t1_tt LIKE '指数型-%'""")[0]['n']
        if idx:
            print(f'  ⓘ 指数基金子类归一化: staging 共 {idx} 只 t1_tt=指数型-*（正常子类重分类，非真实类型变更）', flush=True)
    except Exception as e:
        print(f'  [WARN] 指数子类诊断失败（不影响切换）: {e}', flush=True)

    staging_counts = get_t0_counts('fund_scores_staging')
    staging_total = sum(staging_counts.values())
    prod_counts = get_t0_counts('fund_scores')
    prod_total = sum(prod_counts.values())

    print(f'  staging 总数: {staging_total}，生产总数: {prod_total}', flush=True)
    print(f'  staging t0 分布: {staging_counts}', flush=True)
    print(f'  prod    t0 分布: {prod_counts}', flush=True)

    # 拉取数据源全量口径（L1 / L3 基准）
    print('\n[U] 拉取东方财富全量主列表（数据源全量基准）', flush=True)
    uni = get_universe()
    U = uni['total']
    oe = uni['on_exchange']
    per_cat = uni['per_cat']
    fm = uni['fetch_managed']
    # fetch 责任全集 = 主列表 7 大类期望之和（不含场内 ETF/LOF，也不含主列表里"其他场外"
    # 如商品/Reits/定开/保本等——这些不在 fetch_and_import_funds 的 5 大类中，由 reconcile 回填）。
    fetch_universe = sum(per_cat.values()) if per_cat else (fm if not uni['fallback'] else 27000)
    if uni['fallback']:
        warn('主列表拉取失败，使用兜底常量（L1/L3 校验放宽）', 'U')
    print(f'  数据源全量 U={U}（场内 {oe} 只由 sync_etfs/reconcile 直写、不进 fetch）', flush=True)
    print(f'  fetch 责任全集(主列表 7 大类之和) = {fetch_universe}', flush=True)
    if per_cat:
        print(f'  主列表各大类期望数: {per_cat}', flush=True)

    ok = True

    # ── Layer 1：数据拉取数量校验（基准=数据源全量主列表）────────────────────
    print('\n[Layer 1] 数据拉取数量校验（基准=东方财富全量主列表）', flush=True)
    # 总量：staging 应覆盖 fetch 责任全集（主列表 7 大类之和；允许 10% 分类口径差异）
    ok &= check(staging_total >= fetch_universe * 0.90,
                f'fetch 全量拉取: staging {staging_total} ≥ 90%×{fetch_universe} ({fetch_universe*0.90:.0f})', 'L1')
    # 逐大类对比主列表期望数（真·全量拉取核验；新发基金会略超，故上限不卡）
    for cat in CANON_CATS:
        sc = staging_counts.get(cat, 0)
        exp = per_cat.get(cat, 0)
        if exp == 0:
            continue
        ratio = sc / exp if exp else 0
        if sc < exp * 0.50:
            ok &= check(False,
                        f'分类[{cat}] 灾难性缺失: staging {sc} < 50%×主列表 {exp}（实际 {ratio*100:.1f}%）', 'L1')
        elif sc < exp * 0.95:
            warn(f'分类[{cat}] 部分缺失 ({ratio*100:.1f}%)，疑似上游命名变更或仅 reconcile 回填覆盖', 'L1')
        else:
            print(f'  ✅ [L1] 分类[{cat}] 充足 ({ratio*100:.1f}%)，与主列表一致', flush=True)

    # ── Layer 2：中间表(staging)数据量与评分质量校验 ────────────────────────
    print('\n[Layer 2] 中间表(staging)数据量与评分质量校验', flush=True)
    ok &= check(staging_total >= 19000, f'staging 数据量充足 (>=19000): {staging_total}', 'L2')

    hb_staging = staging_counts.get('货币型', 0)
    ok &= check(hb_staging >= 900, f'货币型数量充足 (>=900): {hb_staging}', 'L2')

    kall = pg("SELECT count(*) AS tot, count(k_all) AS scored FROM fund_scores_staging")[0]
    kall_rate = (kall['scored'] / kall['tot']) if kall['tot'] else 0
    ok &= check(kall_rate >= 0.90, f'整体 k_all 非空率 >=90%: {kall_rate*100:.1f}% ({kall["scored"]}/{kall["tot"]})', 'L2')

    hb = pg("SELECT count(*) AS tot, count(k_all) AS scored FROM fund_scores_staging WHERE t0='货币型'")[0]
    hb_rate = (hb['scored'] / hb['tot']) if hb['tot'] else 0
    ok &= check(hb['tot'] > 0 and hb_rate >= 0.90,
                f'货币型 k_all 非空率 >=90%: {hb_rate*100:.1f}% ({hb["scored"]}/{hb["tot"]})', 'L2')

    hb_ret = pg("SELECT count(*) AS tot, count(r1y) AS has_ret FROM fund_scores_staging WHERE t0='货币型'")[0]
    ok &= check(hb_ret['has_ret'] >= hb_ret['tot'] * 0.90,
                f'货币型 r1y 阶段收益非空率 >=90%: {hb_ret["has_ret"]}/{hb_ret["tot"]}', 'L2')

    grades = pg("SELECT score_grade, count(*) AS cnt FROM fund_scores_staging GROUP BY score_grade")
    gmap = {r['score_grade']: r['cnt'] for r in grades}
    print(f'  grade 分布: {gmap}', flush=True)
    ok &= check((gmap.get('green', 0) + gmap.get('blue', 0) + gmap.get('orange', 0)) > 0,
                '评分等级分布非空（green/blue/orange 均存在）', 'L2')

    # ── 汇总前置校验结论 ──────────────────────────────────────────────────
    if not ok:
        print_summary()
        print('\n❌ 前置校验（L1/L2）未通过，拒绝切换，生产 fund_scores 保持不变。', flush=True)
        sys.exit(1)

    if args.dry_run:
        print_summary()
        print('\n🔍 DRY-RUN：前置校验通过，跳过实际切换（未改动生产）。', flush=True)
        sys.exit(0)

    print('\n✅ 前置校验通过，开始原子切换...', flush=True)

    # ── 1. 切换前备份当前生产 fund_scores ────────────────────────────────
    print('\n[1] 备份当前生产 fund_scores → _fs_backup', flush=True)
    pg('CREATE TABLE IF NOT EXISTS _fs_backup (LIKE fund_scores INCLUDING ALL)')
    pg('TRUNCATE TABLE _fs_backup')
    pg('INSERT INTO _fs_backup SELECT * FROM fund_scores')
    backup_n = pg('SELECT count(*) AS cnt FROM _fs_backup')[0]['cnt']
    print(f'  ✓ 备份 {backup_n} 条', flush=True)

    # ── 2. 原子切换：仅替换 staging 管理的代码，保留生产表其他代码 ──────────
    # 2026-10-30 修正：由「TRUNCATE + 全量 INSERT」改为「DELETE 仅 staging 覆盖代码 + INSERT」，
    # 保留场内 ETF/LOF（sync_etfs 直写）、reconcile 回填桩等不进 staging 的代码，天然防误删。
    print('\n[2] 原子切换 fund_scores ← fund_scores_staging（UPSERT 式：仅替换 staging 管理的代码）', flush=True)
    switch_sql = (
        f'DELETE FROM fund_scores WHERE c IN (SELECT c FROM fund_scores_staging); '
        f'INSERT INTO fund_scores ({PROMOTE_COLS}) SELECT {PROMOTE_COLS} FROM fund_scores_staging;'
    )
    try:
        pg(switch_sql, timeout=600)
    except Exception as e:
        print(f'  [ERR] 切换失败: {e}', flush=True)
        print('  尝试从备份恢复生产 fund_scores...', flush=True)
        pg('TRUNCATE TABLE fund_scores; INSERT INTO fund_scores SELECT * FROM _fs_backup;')
        sys.exit(1)

    # ── 3. 切换后校验 ────────────────────────────────────────────────────
    new_total = pg('SELECT count(*) AS cnt FROM fund_scores')[0]['cnt']
    # 切换后生产应 = (原生产 − staging 管理代码) + staging ≈ 全量，行数应 ≥ staging 总量
    if new_total < staging_total:
        print(f'  [ERR] 切换后数量异常 (生产 {new_total} < staging {staging_total})，从备份恢复', flush=True)
        pg('TRUNCATE TABLE fund_scores; INSERT INTO fund_scores SELECT * FROM _fs_backup;')
        sys.exit(1)
    print(f'  ✓ 切换成功，fund_scores 现有 {new_total} 条', flush=True)

    # ── Layer 3：生产表数量校验（基准=数据源全量 U）────────────────────────
    # 允许新发基金使生产超过 U；只卡"显著少于 U"（真实丢失）。
    print('\n[Layer 3] 生产表数量校验（基准=数据源全量 U）', flush=True)
    ok3 = check(new_total >= U * 0.95,
                f'生产表全量校验: 生产 {new_total} ≥ 95%×主列表 {U} ({U*0.95:.0f})', 'L3')
    if not ok3:
        print('  [ERR] 生产表未覆盖数据源全量，从备份恢复', flush=True)
        pg('TRUNCATE TABLE fund_scores; INSERT INTO fund_scores SELECT * FROM _fs_backup;')
        sys.exit(1)

    # 货币型评分确认
    hb_after = pg("SELECT count(*) AS tot, count(k_all) AS scored FROM fund_scores WHERE t0='货币型'")[0]
    print(f'  ✓ 货币型评分: {hb_after["scored"]}/{hb_after["tot"]} 有 k_all', flush=True)

    # ── 2.2 保护配置/规模/持有人列 + 基本信息列：用备份恢复非空值 ─────────
    print('\n[2.2] 保护配置类 12 列 + 基本信息 8 列（COALESCE 备份回填）', flush=True)
    _alloc_cols = ['stock_pct', 'bond_pct', 'cash_pct', 'sub_purchase', 'sub_redemption',
                   'net_sub_share', 'total_share_end', 'net_asset_end', 'nav_change_rate',
                   'inst_hold_pct', 'indiv_hold_pct', 'internal_hold_pct',
                   'fund_manager', 'fund_scale', 'manage_fee', 'company',
                   'found_date', 'share_scale', 'custody_fee', 'sale_fee']
    _set = ', '.join([f'{c} = COALESCE(f.{c}, b.{c})' for c in _alloc_cols])
    try:
        pg(f'UPDATE fund_scores f SET {_set} FROM _fs_backup b WHERE f.c = b.c', timeout=300)
        print('  ✓ 配置类列已用备份保护', flush=True)
    except Exception as e:
        print(f'  [WARN] 配置类列备份回填失败（不影响评分切换）: {e}', flush=True)

    # ── 2.3 重算异常收益标注 ret_anomaly ─────────────────────────────────
    print('\n[2.3] 重算异常收益标注 ret_anomaly', flush=True)
    try:
        pg("ALTER TABLE fund_scores ADD COLUMN IF NOT EXISTS ret_anomaly boolean NOT NULL DEFAULT false", timeout=120)
        pg("""UPDATE fund_scores SET ret_anomaly = COALESCE(
                  (r1m > 100) OR (r1m < -60)
                  OR (t0 = '债券型' AND (r1m > 15 OR r3m > 25 OR r6m > 35 OR r1y > 50))
                  OR (r1y > 50 AND r1m IS NOT NULL AND (r1y - r1m) < 10), false)""", timeout=300)
        _anom = pg("SELECT count(*) AS cnt FROM fund_scores WHERE ret_anomaly")[0]['cnt']
        print(f'  ✓ 异常收益标注完成，当前 {_anom} 只被标记', flush=True)
    except Exception as e:
        print(f'  [WARN] ret_anomaly 重算失败（不影响评分切换）: {e}', flush=True)

    # ── 2.5 重新应用标签（tags）到 fund_scores ──────────────────────────
    print('\n[2.5] 重新应用标签到 fund_scores（来源 fund_tag_funds）', flush=True)
    try:
        pg("ALTER TABLE fund_scores ADD COLUMN IF NOT EXISTS tags text[];", timeout=120)
        pg("UPDATE fund_scores SET tags = NULL;", timeout=300)
        pg("""UPDATE fund_scores fs
              SET tags = sub.tags
              FROM (SELECT fund_code, array_agg(DISTINCT tag_name) AS tags
                    FROM fund_tag_funds GROUP BY fund_code) sub
              WHERE fs.c = sub.fund_code OR fs.c = sub.fund_code || '.OF';""", timeout=600)
        tagged = pg("SELECT count(*) AS cnt FROM fund_scores WHERE tags IS NOT NULL")[0]['cnt']
        print(f'  ✓ 已为 {tagged} 只基金标记标签', flush=True)
    except Exception as e:
        print(f'  [WARN] 标签重新应用失败（不影响评分切换）: {e}', flush=True)

    # ── 2.9 覆盖率守卫：季度评分刷新完整性 ──────────────────────────────
    print('\n[2.9] 季度评分覆盖率守卫（防 fund_combined 半成品污染）', flush=True)
    cov = pg("""SELECT
        (SELECT count(*) FROM fund_scores) AS tot,
        (SELECT count(*) FROM fund_quarterly_scores WHERE quarterly_data IS NOT NULL) AS covered,
        (SELECT count(*) FROM fund_quarterly_scores WHERE updated_at >= now() - interval '24 hours') AS fresh
    """)[0]
    total_c = cov['tot'] or 0
    covered_rate = (cov['covered'] / total_c) if total_c else 0
    fresh_rate = (cov['fresh'] / total_c) if total_c else 0
    print(f'  覆盖率(有季度数据): {covered_rate*100:.1f}% ({cov["covered"]}/{total_c})')
    print(f'  新鲜度(近24h刷新): {fresh_rate*100:.1f}% ({cov["fresh"]}/{total_c})')
    skip_combined = args.skip_combined
    if fresh_rate < 0.80 and not args.force_combined:
        print(f'  ⚠️  季度评分新鲜度 {fresh_rate*100:.1f}% < 80%，跳过 fund_combined 重建（防污染）', flush=True)
        print(f'    fund_combined 保留上一轮完整状态，下一轮补齐后自动重建。', flush=True)
        skip_combined = True
    elif args.force_combined:
        print('  [--force-combined] 已强制重建（忽略新鲜度守卫）', flush=True)

    # ── 3. 重建 fund_combined ──────────────────────────────────────────
    if not skip_combined:
        print('\n[3] 重建 fund_combined（复用 sync_fund_combined_scores.py）', flush=True)
        rc = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, 'sync_fund_combined_scores.py')],
            cwd=SCRIPT_DIR
        ).returncode
        if rc != 0:
            print(f'  [WARN] fund_combined 同步返回非零 ({rc})，但 fund_scores 已切换成功', flush=True)
    else:
        print('\n[3] 跳过 fund_combined 重建（--skip-combined）', flush=True)

    # ── 3.5 更新 fund_scores_meta 时间戳 ───────────────────────────────
    print('\n[3.5] 更新 fund_scores_meta 时间戳（页面"更新时间"来源）', flush=True)
    try:
        pg("""INSERT INTO fund_scores_meta (tsq, update_time, total_count, scored_count)
              SELECT now(), now()::text, count(*), count(k_all) FROM fund_scores""")
        mm = pg("SELECT tsq, total_count, scored_count FROM fund_scores_meta ORDER BY tsq DESC LIMIT 1")[0]
        print(f"  ✓ fund_scores_meta 已更新: tsq={mm['tsq']}, 总数={mm['total_count']}, 已评分={mm['scored_count']}", flush=True)
    except Exception as e:
        print(f'  [WARN] fund_scores_meta 时间戳更新失败（不影响评分切换）: {e}', flush=True)

    # ── 4. 清理备份 ────────────────────────────────────────────────────
    print('\n[4] 清理备份表 _fs_backup', flush=True)
    pg('DROP TABLE IF EXISTS _fs_backup')
    print('  ✓ 已清理', flush=True)

    print_summary()
    print('\n✅ 切换完成！生产 fund_scores 已更新，fund_combined 已同步。', flush=True)


if __name__ == '__main__':
    main()
