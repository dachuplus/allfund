#!/usr/bin/env python3
"""MC 图鉴题库结构校验（scripts/check_mc_quiz.py）

校验 src/data/mcQuizBank.js：
  · 1000 题、10 类各 100 题、id 连续唯一；
  · 题干全局唯一、非空；每题 4 个非空且互不重复的选项；
  · answer ∈ 0..3，且正确答案必须出现在 note 里（事实一致性弱校验）；
  · A/B/C/D 答案分布均衡（各 240–260 题）；
  · 不允许出现 '以上都不对' 这类兜底干扰项。

用法：python3 scripts/check_mc_quiz.py
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'src', 'data', 'mcQuizBank.js')
EXPECT_TOTAL = 1000
EXPECT_PER_CAT = 100


def load():
    with open(PATH, encoding='utf-8') as f:
        src = f.read()
    body = src.split('export const MC_QUIZ_BANK = [', 1)[1].rsplit(']', 1)[0]
    return [json.loads(line.strip().rstrip(',')) for line in body.strip().split('\n') if line.strip()]


def main():
    rows = load()
    errs = []
    if len(rows) != EXPECT_TOTAL:
        errs.append(f'题目总数 {len(rows)} ≠ {EXPECT_TOTAL}')

    ids, qs, dist, cats = set(), set(), [0, 0, 0, 0], {}
    for r in rows:
        i = r.get('id')
        if i in ids:
            errs.append(f'id 重复: {i}')
        ids.add(i)
        q = (r.get('q') or '').strip()
        if not q:
            errs.append(f'id={i} 题干为空')
        if q in qs:
            errs.append(f'id={i} 题干重复: {q[:40]}')
        qs.add(q)
        opts = r.get('options') or []
        if len(opts) != 4:
            errs.append(f'id={i} 选项数 {len(opts)} ≠ 4')
        if any(not str(x).strip() for x in opts):
            errs.append(f'id={i} 存在空选项')
        if len(set(map(str, opts))) != len(opts):
            errs.append(f'id={i} 选项重复')
        if '以上都不对' in opts:
            errs.append(f'id={i} 使用了兜底干扰项')
        a = r.get('answer')
        if not isinstance(a, int) or not 0 <= a <= 3:
            errs.append(f'id={i} answer 非法: {a}')
        else:
            dist[a] += 1
            if str(opts[a]) not in (r.get('note') or ''):
                errs.append(f'id={i} 正确答案未出现在解析中: {opts[a]}')
        if not (r.get('note') or '').strip():
            errs.append(f'id={i} 解析为空')
        cats[r.get('cat')] = cats.get(r.get('cat'), 0) + 1

    if sorted(ids) != list(range(1, EXPECT_TOTAL + 1)):
        errs.append('id 不是 1..1000 连续整数')
    for c, n in cats.items():
        if n != EXPECT_PER_CAT:
            errs.append(f'类别「{c}」题数 {n} ≠ {EXPECT_PER_CAT}')
    if len(cats) != 10:
        errs.append(f'类别数 {len(cats)} ≠ 10')
    for k, n in enumerate(dist):
        if not 240 <= n <= 260:
            errs.append(f'答案 {"ABCD"[k]} 分布 {n} 偏离 250 过多')

    print(json.dumps({
        'total': len(rows),
        'categories': cats,
        'answer_distribution': dict(zip('ABCD', dist)),
        'unique_questions': len(qs),
        'errors': errs[:20],
        'error_count': len(errs),
    }, ensure_ascii=False, indent=2))
    if errs:
        sys.exit(1)


if __name__ == '__main__':
    main()
