#!/usr/bin/env python3
"""
ensure_invest_style_columns.py — 幂等准备「基金投资风格」所需的数据库对象。

新增列（public.fund_scores）：
  - invest_style  text  最新报告期投资风格（大盘价值 / 中盘平衡 / … 共 9 种）
  - style_period  text  该风格对应报告期（如 2026年3季度）

同时重建 public.fund_scores_main 物化视图：视图定义虽是
`SELECT DISTINCT ON (...) f.*`，但物化视图的列是「创建时快照」，
给 fund_scores 加列后不会自动出现在视图里，必须 DROP + CREATE。
定义以 scripts/fund_scores_main.sql 为唯一真源。

另外 DROP 残留 _fs_backup：promote_staging.py 用
  CREATE TABLE IF NOT EXISTS _fs_backup (LIKE fund_scores INCLUDING ALL)
  INSERT INTO _fs_backup SELECT * FROM fund_scores
做备份/回滚，两表列数与顺序必须完全一致。若上一次流水线异常退出留下
旧结构备份表，加列后会导致按位置 INSERT 错位。正常流程末尾本来就会
DROP，这里只是兜底。

环境变量：SUPABASE_PAT / SUPABASE_MGMT_TOKEN（Management API）、
可选 SUPABASE_PROJECT_REF。
"""
import os
import sys
import time
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VIEW_SQL_FILE = os.path.join(SCRIPT_DIR, 'fund_scores_main.sql')
PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF') or 'tqhtegazxykkqfcpejky'
MGMT_API = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'

TOKEN = os.environ.get('SUPABASE_PAT') or os.environ.get('SUPABASE_MGMT_TOKEN')

NEW_COLUMNS = [
    ('invest_style', 'text', '最新报告期投资风格（9 种规模×风格组合）'),
    ('style_period', 'text', '投资风格报告期，如 2026年3季度'),
]


def pg(sql, timeout=300):
    """执行单条 SQL（Management API），带 3 次重试。返回 list[dict] 或 []。"""
    if not TOKEN:
        raise RuntimeError('缺少 SUPABASE_PAT / SUPABASE_MGMT_TOKEN')
    last = None
    for attempt in range(3):
        try:
            r = requests.post(
                MGMT_API,
                headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
                json={'query': sql},
                timeout=timeout,
            )
            if r.status_code >= 500:
                last = f'HTTP {r.status_code}: {r.text[:200]}'
                print(f'  [pg] 5xx（第{attempt+1}/3 次，5s 后重试）: {last}', flush=True)
                time.sleep(5)
                continue
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict):
                if data.get('message'):
                    raise RuntimeError(str(data['message'])[:300])
                return []
            return data if isinstance(data, list) else []
        except requests.exceptions.RequestException as e:
            last = str(e)
            print(f'  [pg] 请求异常（第{attempt+1}/3 次，5s 后重试）: {e}', flush=True)
            time.sleep(5)
    raise RuntimeError(f'SQL 重试 3 次仍失败: {last}')


def split_sql(text):
    """去掉整行注释后按分号拆分（视图定义文件里没有引号内分号）。"""
    lines = [ln for ln in text.splitlines() if not ln.strip().startswith('--')]
    body = '\n'.join(lines)
    return [s.strip() for s in body.split(';') if s.strip()]


def view_columns():
    rows = pg("""SELECT a.attname FROM pg_attribute a
                 WHERE a.attrelid = 'public.fund_scores_main'::regclass
                   AND a.attnum > 0 AND NOT a.attisdropped""")
    return [r['attname'] for r in rows]


def main():
    print(f'准备投资风格数据库对象（project: {PROJECT_REF}）', flush=True)
    need_rebuild = False

    # 1) 幂等加列
    for col, dtype, comment in NEW_COLUMNS:
        exists = pg("""SELECT 1 AS ok FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='fund_scores'
                         AND column_name='""" + col + "'")
        if exists:
            print(f'  ✓ {col} 已存在，跳过', flush=True)
        else:
            pg(f'ALTER TABLE public.fund_scores ADD COLUMN IF NOT EXISTS {col} {dtype};')
            need_rebuild = True
            print(f'  + 新增 {col} ({dtype}) — {comment}', flush=True)

    # 2) 视图列检查：物化视图列是创建时快照，加列后必须重建才会出现新列。
    #    但**只在真的缺列时**重建 —— 每周 CI 无脑 DROP 会让线上「主代码」列表
    #    在 DROP → CREATE 之间短暂不可用。
    try:
        have = view_columns()
        missing = [c for c in ('invest_style', 'style_period', 'tags') if c not in have]
        if missing:
            need_rebuild = True
            print(f'  物化视图缺列 {missing}，需要重建', flush=True)
    except Exception:
        need_rebuild = True
        print('  物化视图不存在或不可读，需要重建', flush=True)

    # 3) 清理可能残留的旧结构备份表（见模块注释；每次执行都无害）
    pg('DROP TABLE IF EXISTS public._fs_backup;')
    print('  ✓ 已检查残留 _fs_backup（防止加列后按位置 INSERT 错位）', flush=True)

    # 4) 按需重建物化视图
    if need_rebuild:
        with open(VIEW_SQL_FILE, encoding='utf-8') as f:
            statements = split_sql(f.read())
        print(f'  重建 fund_scores_main：执行 {len(statements)} 条 SQL', flush=True)
        for i, stmt in enumerate(statements, 1):
            pg(stmt, timeout=600)
            print(f'    [{i}/{len(statements)}] {stmt.splitlines()[0][:70]}', flush=True)
    else:
        print('  ✓ 列与物化视图均已就绪，跳过重建（避免每周 DROP 视图影响线上）', flush=True)

    # 4) 验收
    cols = pg("""SELECT column_name FROM information_schema.columns
                 WHERE table_name='fund_scores'
                   AND column_name IN ('invest_style','style_period')
                 ORDER BY 1""")
    names = [r['column_name'] for r in cols]
    assert sorted(names) == ['invest_style', 'style_period'], f'加列失败: {names}'

    kind = pg("SELECT c.relkind FROM pg_class c WHERE c.relname='fund_scores_main'")
    assert kind and kind[0]['relkind'] == 'm', f'物化视图未建好: {kind}'

    mv_cols = pg("""SELECT a.attname FROM pg_attribute a
                    WHERE a.attrelid = 'public.fund_scores_main'::regclass
                      AND a.attnum > 0 AND NOT a.attisdropped
                      AND a.attname IN ('invest_style','style_period','tags')
                    ORDER BY 1""")
    mv_names = [r['attname'] for r in mv_cols]
    assert 'invest_style' in mv_names and 'style_period' in mv_names and 'tags' in mv_names, \
        f'物化视图缺列: {mv_names}'

    stat = pg("""SELECT
        (SELECT count(*) FROM fund_scores) AS fs,
        (SELECT count(*) FROM fund_scores_main) AS fsm,
        (SELECT count(*) FILTER (WHERE tags IS NOT NULL AND cardinality(tags)>0) FROM fund_scores_main) AS fsm_tags""")[0]
    print(f'  ✓ 验收通过：fund_scores {stat["fs"]} 行 / fund_scores_main {stat["fsm"]} 行'
          f'（视图中带标签 {stat["fsm_tags"]} 行）', flush=True)
    print(f'  ✓ 物化视图新列: {", ".join(mv_names)}', flush=True)
    print('✅ 投资风格数据库对象就绪', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'✗ 失败: {type(e).__name__}: {e}', flush=True)
        sys.exit(1)
