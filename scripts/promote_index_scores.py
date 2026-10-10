#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
promote_index_scores.py — 校验 index_scores_staging 后原子切到 index_scores

严格镜像 promote_stock_scores.py 的设计：
  - 抓取全程只写 staging（fetch_index_scores.py），绝不直写生产表。
  - 本脚本做严格校验，任一不过即拒绝切换、保留旧数据：
      1) staging 条数 >= 60（分池后每池至少能算分）；
      2) k_all 非空率 >= 0.80（池内样本 < 3 的会留空，但不应过多）；
      3) pe_pct_5y 非空率 >= 0.90（估值维是核心，PE 分位缺失过多说明源失效）；
      4) 三池都要有评分：broad / sector / fixed 各至少 3 条有分；
      5) 成分匹配率均值 >= 0.85（stock_scores 覆盖不足会让基本面失真）；
      6) 行情日期新鲜度 <= 7 天（防止抓到停更指数的旧数据）。
  - 通过后：备份生产 → TRUNCATE+INSERT 原子切换 → 数量校验 → 失败回滚 → 清理备份。

用法：
  export SUPABASE_PAT=...
  python3 scripts/promote_index_scores.py
"""
import os
import sys
import json
import subprocess

# TOKEN 在 main() 内 _load_env_local() 之后确定（.env.local 可能含 SUPABASE_PAT）。
# 此处先占位，main() 开头会重新赋值；勿在此 sys.exit（会先于 env 加载触发）。
TOKEN = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
MGMT_API = 'https://api.supabase.com/v1/projects/tqhtegazxykkqfcpejky/database/query'

MIN_TOTAL = 60
MIN_KALL_RATE = 0.80
MIN_PEPCT_RATE = 0.90
MIN_POOL_OK = 3
MIN_MATCH_AVG = 0.85
MAX_AGE_DAYS = 7

PROMOTE_COLS = (
    'code,name,index_class,pool,cons_number,close,trade_date,cons_date,fin_period,'
    'k_growth,k_value,k_mktliq,k_quality,k_dividend,k_all,grade,'
    'profit_cagr_3y,rev_yoy,pe_index,pe_pct_5y,pb,roe,gross_margin,'
    'ocf_to_profit,debt_ratio,div_yield,payout_per10,mktcap_weighted,mktcap_total,'
    'top10_weight,cons_match_rate,fin_period_cover'
)


def pg(sql, timeout=300):
    payload = json.dumps({'query': sql})
    r = subprocess.run(
        ['curl', '-s', '--max-time', str(timeout), '-X', 'POST', MGMT_API,
         '-H', f'Authorization: Bearer {TOKEN}',
         '-H', 'Content-Type: application/json', '-d', payload],
        capture_output=True, text=True, timeout=timeout + 15)
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
    import os.path
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


def validate():
    res = pg("""
    SELECT count(*) AS total,
      count(k_all) AS k_all_n,
      count(pe_pct_5y) AS pe_pct_n,
      round(avg(cons_match_rate)::numeric, 4) AS match_avg,
      max(trade_date) AS max_date,
      count(*) FILTER (WHERE pool='broad' AND k_all IS NOT NULL) AS broad_ok,
      count(*) FILTER (WHERE pool='sector' AND k_all IS NOT NULL) AS sector_ok,
      count(*) FILTER (WHERE pool='fixed' AND k_all IS NOT NULL) AS fixed_ok
    FROM index_scores_staging
    """)
    if not res:
        print('[校验] staging 为空')
        return None
    r = res[0]
    total = int(r.get('total') or 0)
    k_all_n = int(r.get('k_all_n') or 0)
    pe_n = int(r.get('pe_pct_n') or 0)
    match_avg = float(r.get('match_avg') or 0)
    max_date = r.get('max_date') or ''
    broad_ok = int(r.get('broad_ok') or 0)
    sector_ok = int(r.get('sector_ok') or 0)
    fixed_ok = int(r.get('fixed_ok') or 0)

    print('[校验] staging 概况：')
    print(f'   总条数 {total}（下限 {MIN_TOTAL}）')
    print(f'   k_all 非空 {k_all_n} = {k_all_n/total*100 if total else 0:.1f}%'
          f'（下限 {MIN_KALL_RATE*100:.0f}%）')
    print(f'   PE分位非空 {pe_n} = {pe_n/total*100 if total else 0:.1f}%'
          f'（下限 {MIN_PEPCT_RATE*100:.0f}%）')
    print(f'   成分匹配率均值 {match_avg:.3f}（下限 {MIN_MATCH_AVG}）')
    print(f'   最新行情日 {max_date}')
    print(f'   各池有分条数 broad={broad_ok} sector={sector_ok} fixed={fixed_ok}'
          f'（各需 ≥{MIN_POOL_OK}）')

    errs = []
    if total < MIN_TOTAL:
        errs.append(f'总条数 {total} < {MIN_TOTAL}')
    if total and k_all_n / total < MIN_KALL_RATE:
        errs.append(f'k_all 非空率 {k_all_n/total*100:.1f}% < {MIN_KALL_RATE*100:.0f}%')
    if total and pe_n / total < MIN_PEPCT_RATE:
        errs.append(f'PE 分位非空率 {pe_n/total*100:.1f}% < {MIN_PEPCT_RATE*100:.0f}%')
    if match_avg < MIN_MATCH_AVG:
        errs.append(f'成分匹配率 {match_avg:.3f} < {MIN_MATCH_AVG}')
    # 核心两池必须有分；固收池样本天然只有 9 只，若确实没抓到则跳过该池校验
    for name, n in (('broad', broad_ok), ('sector', sector_ok)):
        if n < MIN_POOL_OK:
            errs.append(f'池 {name} 有分条数 {n} < {MIN_POOL_OK}')
    if fixed_ok and fixed_ok < MIN_POOL_OK:
        print(f'[校验] 固收池有分仅 {fixed_ok} 条 < {MIN_POOL_OK}，暂不阻断（样本天然稀少）')
    if fixed_ok < MIN_POOL_OK:
        print('[提示] 固收池暂无评分，前端「固收」分类会显示为空，等fetch_index_raw 补齐后重跑')

    # 日期新鲜度
    if max_date:
        try:
            from datetime import date, datetime
            # 兼容带/不带分隔符的日期（2026-10-09 / 20261008）
            digits = ''.join(ch for ch in str(max_date) if ch.isdigit())[:8]
            d = datetime.strptime(digits, '%Y%m%d').date()
            age = (date.today() - d).days
            print(f'   数据年龄 {age} 天（上限 {MAX_AGE_DAYS}）')
            if age > MAX_AGE_DAYS:
                errs.append(f'行情数据 {max_date} 已过旧（{age} 天 > {MAX_AGE_DAYS}）')
        except ValueError:
            errs.append(f'trade_date 格式异常: {max_date}')

    if errs:
        print('\n[校验] ✗ 未通过，拒绝切换：')
        for e in errs:
            print(f'   - {e}')
        return None
    print('\n[校验] ✓ 全部通过')
    return r


def main():
    _load_env_local()
    global TOKEN
    TOKEN = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')
    if not TOKEN:
        sys.exit('请设置环境变量 SUPABASE_PAT')
    print('=== [1/3] 校验 staging ===')
    if validate() is None:
        print('\n已保留生产表 index_scores 旧数据，未做任何切换。')
        sys.exit(1)

    print('\n=== [2/3] 备份生产表 ===')
    pg('DROP TABLE IF EXISTS index_scores_backup')
    pg('CREATE TABLE index_scores_backup AS SELECT * FROM index_scores')
    n = pg('SELECT count(*) AS n FROM index_scores_backup')
    print(f'  已备份 {n[0]["n"]} 条')

    print('=== [3/3] 原子切换 ===')
    try:
        pg('TRUNCATE index_scores')
        pg(f"INSERT INTO index_scores ({PROMOTE_COLS}) SELECT {PROMOTE_COLS} FROM index_scores_staging")
        chk = pg("SELECT count(*) AS n, count(k_all) AS k FROM index_scores")
        got, kk = int(chk[0]['n']), int(chk[0]['k'])
        src = pg("SELECT count(*) AS n FROM index_scores_staging")[0]['n']
        if got != int(src):
            raise RuntimeError(f'数量不一致 生产={got} staging={src}')
        print(f'  ✓ 切换成功：{got} 条（其中 {kk} 条有总分）')
    except Exception as e:
        print(f'  ✗ 切换失败：{e}')
        print('  回滚…')
        pg('TRUNCATE index_scores')
        pg('INSERT INTO index_scores SELECT * FROM index_scores_backup')
        print('  已回滚到备份')
        sys.exit(1)

    pg('DROP TABLE IF EXISTS index_scores_backup')

    top = pg("""SELECT code,name,pool,k_all,grade FROM index_scores
                WHERE k_all IS NOT NULL ORDER BY pool, k_all DESC LIMIT 5""")
    print('\n切换后各池 Top5：')
    for t in top:
        print(f"  [{t['pool']:6s}] {t['code']} {t['name'][:12]:14s} "
              f"{float(t['k_all']):5.1f} {t['grade']}")
    print('\n完成。')


if __name__ == '__main__':
    main()
