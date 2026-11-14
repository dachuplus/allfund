#!/usr/bin/env python3
"""
热门标签关联基金「每日同步」包装器（2026-11-14）。

背景：fund_tag_funds 自 2026-07-13 起 4 个月未更新，页面也没有任何数据时间提示，
导致概念/行业标签覆盖严重失真（上游「高端制造」板块 2687 只、库内仅 1008 只）
却长期无人察觉。本包装器给 scripts/sync_tag_funds_full.py 套上生产护栏：

  1. 运行前把 fund_tag_funds 完整备份到 public._tag_funds_backup_daily；
  2. 调用全量重拉脚本（TRUNCATE + 重写 + 回填 fund_scores.tags）；
  3. 校验映射行数 / 关联基金数不低于旧值的 90%，否则判失败；
  4. 失败则从备份恢复关联表与 fund_scores.tags，绝不留下半截数据；
  5. 成功后 REFRESH MATERIALIZED VIEW public.fund_scores_main
     （物化视图的列/数据是创建时快照，不刷新主代码列表的 tags 会停在旧快照）。

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


def apply_tags():
    """从 fund_tag_funds 重新聚合 fund_scores.tags（与 promote_staging [2.5] 同口径）。"""
    pg('UPDATE public.fund_scores SET tags = NULL;', timeout=300)
    pg(
        """UPDATE public.fund_scores fs
              SET tags = sub.tags
              FROM (SELECT fund_code, array_agg(DISTINCT tag_name) AS tags
                    FROM public.fund_tag_funds GROUP BY fund_code) sub
              WHERE fs.c = sub.fund_code OR fs.c = sub.fund_code || '.OF';""",
        timeout=600,
    )


def refresh_view():
    pg('REFRESH MATERIALIZED VIEW public.fund_scores_main;', timeout=600)


def restore():
    print('  [ROLLBACK] 从备份恢复 fund_tag_funds 与 fund_scores.tags', flush=True)
    pg('TRUNCATE TABLE public.fund_tag_funds;')
    pg(f'INSERT INTO public.fund_tag_funds SELECT * FROM {BACKUP};', timeout=600)
    apply_tags()
    refresh_view()
    print('  [ROLLBACK] 已恢复', json.dumps(stats(), ensure_ascii=False, default=str), flush=True)


def main():
    before = stats()
    print('同步前:', json.dumps(before, ensure_ascii=False, default=str), flush=True)

    pg(f'DROP TABLE IF EXISTS {BACKUP};')
    pg(f'CREATE TABLE {BACKUP} AS SELECT * FROM public.fund_tag_funds;', timeout=600)
    print('  ✓ 已备份到', BACKUP, flush=True)

    target = os.path.join(ROOT, 'scripts', 'sync_tag_funds_full.py')
    rc = subprocess.run([sys.executable, target], cwd=ROOT).returncode
    if rc != 0:
        print(f'  [FATAL] 全量同步脚本退出码 {rc}', flush=True)
        restore()
        sys.exit(1)

    after = stats()
    print('同步后:', json.dumps(after, ensure_ascii=False, default=str), flush=True)
    ok = (
        after['rows'] >= before['rows'] * 0.9
        and after['funds'] >= before['funds'] * 0.9
    )
    if not ok:
        print('  [FATAL] 映射条数或关联基金数不足旧值 90%，疑似上游抓取不全', flush=True)
        restore()
        sys.exit(1)

    refresh_view()
    print('  ✓ 已刷新物化视图 fund_scores_main', flush=True)
    print('✅ 标签数据同步完成', flush=True)


if __name__ == '__main__':
    main()
