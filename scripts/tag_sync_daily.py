#!/usr/bin/env python3
"""
热门标签关联基金「每日同步」包装器（2026-11-14，按中间表架构重写）。

主防护已上移到数据层，本包装器只做「运行前备份 + 运行后兜底」：

  scripts/sync_tag_funds_full.py 内部：
    抓取 → 只写 public.fund_tag_funds_staging（边抓边写，正式表零改动）
    → staging 完整性校验 → 校验通过才调用 public.apply_fund_tag_funds(true)
    → 单事务落地（正式表替换 + fund_scores.tags / has_concept / has_industry
       重算 + 物化视图刷新），函数起始拿 advisory lock 与评分流水线串行。

  因此脚本失败时，绝大多数情况是「事务未提交、生产完全没动」，不需要也不应该
  从备份回滚（盲目回滚反而会把已成功落地的新数据覆盖成旧数据）。本包装器据
  max(updated_at) 判断是否真的发生了落地：

    · 时间未变 → 未落地，保留生产现状，直接报失败；
    · 时间已变 → 落地事务已提交且已通过函数内护栏，只做完成度复核，不回滚；
    · 完成度异常（疑似上游残缺）→ 才从备份恢复并调用同一函数重贴。

  备份 public._tag_funds_backup_daily 仅作最后一道保险，不再是并发一致性手段。
  一致性由 staging + 单事务 + advisory lock 保证，与 cron 是否错开评分流水线无关。

仅用 SUPABASE_MGMT_TOKEN（与现有 CI 同一个 Secret），不新增密钥。
用法：SUPABASE_MGMT_TOKEN=... python3 scripts/tag_sync_daily.py
"""

import json
import os
import subprocess
import sys
import urllib.request

REF = 'tqhtegazxykkqfcpejky'
MGMT_URL = f'https://api.supabase.com/v1/projects/{REF}/database/query'
PAT = os.environ.get('SUPABASE_MGMT_TOKEN') or os.environ.get('SUPABASE_PAT', '')
BACKUP = 'public._tag_funds_backup_daily'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if not PAT:
    print('[ERROR] 需设置 SUPABASE_MGMT_TOKEN', flush=True)
    sys.exit(1)


def pg(sql, timeout=600):
    req = urllib.request.Request(
        MGMT_URL,
        data=json.dumps({'query': sql}).encode(),
        headers={'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json'},
    )
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode())


def stats():
    return pg(
        'SELECT count(*) AS rows, count(DISTINCT fund_code) AS funds, '
        'max(updated_at) AS last FROM public.fund_tag_funds'
    )[0]


def reapply_from_prod():
    """调用同一数据库函数，从正式表重贴 tags/flags 并刷新物化视图。"""
    r = pg('SELECT public.apply_fund_tag_funds(false) AS r;', timeout=1200)
    print('  ✓ 统一重贴:', json.dumps(r, ensure_ascii=False, default=str), flush=True)


def refresh_view():
    pg('REFRESH MATERIALIZED VIEW public.fund_scores_main;', timeout=600)


def restore():
    """最后一道保险：恢复备份的正式表，再用同一函数把 tags 重贴回 fund_scores。"""
    print('  [ROLLBACK] 从备份恢复 fund_tag_funds 并统一重贴', flush=True)
    pg('TRUNCATE TABLE public.fund_tag_funds;')
    pg(f'INSERT INTO public.fund_tag_funds SELECT * FROM {BACKUP};', timeout=600)
    reapply_from_prod()
    print('  [ROLLBACK] 已恢复', json.dumps(stats(), ensure_ascii=False, default=str), flush=True)


def main():
    before = stats()
    print('同步前:', json.dumps(before, ensure_ascii=False, default=str), flush=True)

    pg(f'DROP TABLE IF EXISTS {BACKUP};')
    pg(f'CREATE TABLE {BACKUP} AS SELECT * FROM public.fund_tag_funds;', timeout=600)
    print('  ✓ 已备份到', BACKUP, flush=True)

    target = os.path.join(ROOT, 'scripts', 'sync_tag_funds_full.py')
    rc = subprocess.run([sys.executable, target], cwd=ROOT).returncode

    after = stats()
    print('同步后:', json.dumps(after, ensure_ascii=False, default=str), flush=True)
    committed = str(after['last']) != str(before['last'])

    if rc != 0:
        if not committed:
            print('  [FATAL] 全量同步脚本失败，且落地事务未提交；'
                  '生产表、fund_scores.tags 与物化视图均未改动，无需回滚', flush=True)
            sys.exit(1)
        print('  [WARN] 脚本非零退出，但落地事务已提交；'
              '数据已通过函数内护栏，不做回滚，转入完成度复核', flush=True)

    bad = (
        after['rows'] < before['rows'] * 0.9
        or after['funds'] < before['funds'] * 0.9
        or after['rows'] == 0
    )
    if bad:
        print('  [FATAL] 落地后映射条数或关联基金数不足旧值 90%，疑似上游抓取不全', flush=True)
        restore()
        sys.exit(1)

    # 落地函数内已刷新过物化视图；这里做一次幂等兜底，防止函数版本较旧未刷新。
    try:
        refresh_view()
        print('  ✓ 已刷新物化视图 fund_scores_main', flush=True)
    except Exception as e:
        print(f'  [WARN] 兜底刷新物化视图失败（不影响已落地数据）: {e}', flush=True)

    print('✅ 标签数据同步完成', flush=True)


if __name__ == '__main__':
    main()
