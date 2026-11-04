#!/usr/bin/env python3
"""从 4 本新 PDF（课内四/课内三/补充100/复赛真题四）提取选择题，
生成与 gushiwenDasai*.js 同构的前端数据文件。

结构：题目区 `N.[单选题]题干` + `A. x B. y C. z D. w`（可跨行），
答案区独立 `参考答案` 段：`N.答案：X 解析：…`（连续编号，与题目一一对应）。

相对旧脚本的修复：
  - 答案标记兼容 `答案；`（全角分号 typo）
  - 选项正确提取「首个按序出现的 A,B,C,D」序列，规避选项跨行回车导致的
    尾部 `C. … D. …` 干扰（如页码断裂把 D 选项挤到下一行）
"""
import json
import os
import re
import sys

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_TRANS = {}
for i in range(10):
    _TRANS[chr(0xFF10 + i)] = str(i)
for i in range(26):
    _TRANS[chr(0xFF21 + i)] = chr(0x41 + i)
    _TRANS[chr(0xFF41 + i)] = chr(0x61 + i)

NOISE = [
    re.compile(r'北辰课堂'),
    re.compile(r'蕊风语文'),
    re.compile(r'^\d{1,3}$'),
    re.compile(r'^参考答案$'),
    re.compile(r'^单选题$'),
    re.compile(r'复赛真题'),
    re.compile(r'课内古诗词练习'),
    re.compile(r'专辑补充篇目'),
    re.compile(r'^乐读郭嘉豪$'),
    re.compile(r'^【.+】$'),
    re.compile(r'^[壹贰叁肆伍陆柒捌玖拾]+︱'),
    re.compile(r'^(三年级|五年级|四年级)$'),
]

Q_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*(.*)$')
ANS_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*答案\s*[：:；;]\s*([A-D])\s*(.*)$')
ANS_ANY_RE = re.compile(r'(\d{1,3})\s*[．.]\s*答案\s*[：:；;]\s*([A-D])')
# 选项标记：字母 + 可选点（兼容 "A. x" 与 "A x" 两种写法）
OPT_RE = re.compile(r'(?<![A-Za-z])([A-D])\s*[．.]?\s*(?=\S)')

PAPERS = [
    {
        'key': 'k4', 'pdf': '课内古诗词练习1-四年级.pdf',
        'label': '课内四', 'title': '课内四（四年级课内古诗词练习·含答案）',
        'tvar': 'GUSHIWEN_KE_NEI_SI_TITLE', 'lvar': 'GUSHIWEN_KE_NEI_SI',
        'out': 'src/data/gushiwenDasaiKeNeiSi.js',
    },
    {
        'key': 'k3', 'pdf': '课内古诗词练习1-三年级.pdf',
        'label': '课内三', 'title': '课内三（三年级课内古诗词练习·含答案）',
        'tvar': 'GUSHIWEN_KE_NEI_SAN_TITLE', 'lvar': 'GUSHIWEN_KE_NEI_SAN',
        'out': 'src/data/gushiwenDasaiKeNeiSan.js',
    },
    {
        'key': 'bc100', 'pdf': '2026专辑补充篇目100题.pdf',
        'label': '补充100', 'title': '补充100（2026专辑补充篇目100题·含答案）',
        'tvar': 'GUSHIWEN_BU_CHONG_100_TITLE', 'lvar': 'GUSHIWEN_BU_CHONG_100',
        'out': 'src/data/gushiwenDasaiBuChong100.js',
    },
    {
        'key': 'fz4', 'pdf': '2025复赛真题 4年级.pdf',
        'label': '复赛真题四', 'title': '复赛真题四（2025复赛真题4年级·含答案）',
        'tvar': 'GUSHIWEN_FS_ZHENTI_SI_TITLE', 'lvar': 'GUSHIWEN_FS_ZHENTI_SI',
        'out': 'src/data/gushiwenDasaiFsZhentiSi.js',
    },
]


def clean_lines(text):
    out = []
    for raw in text.splitlines():
        s = raw.translate(_TRANS).strip()
        if not s:
            continue
        if any(p.search(s) for p in NOISE):
            continue
        out.append(s)
    return out


def split_groups(entries):
    groups, cur, prev = [], [], None
    for entry in entries:
        _id = entry[0]
        if prev is not None and _id <= prev:
            groups.append(cur)
            cur = []
        cur.append(entry)
        prev = _id
    if cur:
        groups.append(cur)
    return groups


def parse_paper(path):
    reader = PdfReader(path)
    lines = []
    for page in reader.pages:
        lines.extend(clean_lines(page.extract_text() or ''))

    ans_start = None
    for i, ln in enumerate(lines):
        if ANS_RE.match(ln):
            ans_start = i
            break
    if ans_start is None:
        raise RuntimeError(f'{path}: 未找到答案区')

    ans_text = '\n'.join(lines[ans_start:])
    ans_matches = list(ANS_ANY_RE.finditer(ans_text))
    ans_entries = []
    for i, m in enumerate(ans_matches):
        start = m.end()
        end = ans_matches[i + 1].start() if i + 1 < len(ans_matches) else len(ans_text)
        analysis = ans_text[start:end].replace('\n', '').strip()
        analysis = re.sub(r'^解析\s*[：:]\s*', '', analysis)
        ans_entries.append((int(m.group(1)), {
            'qid': int(m.group(1)),
            'answer': m.group(2),
            'analysis': analysis,
        }))
    ans_groups = split_groups(ans_entries)

    qlines = lines[:ans_start]
    blocks = []
    for ln in qlines:
        m = Q_RE.match(ln)
        if m:
            blocks.append((int(m.group(1)), [m.group(2)]))
        elif blocks:
            blocks[-1][1].append(ln)
    q_groups = split_groups(blocks)

    if len(q_groups) != len(ans_groups):
        raise RuntimeError(
            f'{path}: 分节数不一致 题{[len(g) for g in q_groups]} '
            f'vs 答{[len(g) for g in ans_groups]}')

    items, problems = [], []
    gid = 0
    for gi, (qg, ag) in enumerate(zip(q_groups, ans_groups), 1):
        if len(qg) != len(ag):
            raise RuntimeError(f'{path}: 第{gi}节 题数{len(qg)} != 答案数{len(ag)}')
        for (qid, blines), (_aid, ans) in zip(qg, ag):
            if qid != ans['qid']:
                problems.append((gid + 1, f'题号错位 题{qid} vs 答{ans["qid"]}'))
            gid += 1
            s = '\n'.join(blines)
            marks = [(m.start(), m.group(1)) for m in OPT_RE.finditer(s)]
            # 取首个按序出现的 A,B,C,(D) 序列；兼容 3 选项（无 D）题目
            seq = ['A', 'B', 'C', 'D']
            best = None
            for i in range(len(marks)):
                run = []
                for m in marks[i:]:
                    if len(run) < 4 and m[1] == seq[len(run)]:
                        run.append(m)
                    else:
                        break
                if len(run) >= 3:
                    best = run
                    break
            if best is None:
                problems.append((gid, f'原Q{qid} 选项标记异常: ' + '/'.join(m[1] for m in marks) + ' | ' + s[:60]))
                continue
            A, B, C = best[0], best[1], best[2]
            D = best[3] if len(best) > 3 else None
            q_text = s[:A[0]].replace('\n', '').strip()
            q_text = q_text.replace('[单选题]', '').replace('[选择题]', '').strip()
            opts = []
            for k, pos in enumerate([A[0], B[0], C[0]] + ([D[0]] if D else [])):
                end = best[k + 1][0] if k + 1 < len(best) else len(s)
                opts.append(s[pos + 2:end].replace('\n', '').strip())
            items.append({
                'id': gid,
                'q': q_text,
                'options': opts,
                'answer': ans['answer'],
                'analysis': ans['analysis'],
            })

    stat = {
        'questions': len(items),
        'answers': len(ans_entries),
        'sections': [len(g) for g in q_groups],
    }
    return items, problems, stat


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def write_js(paper, items):
    lines = [
        f'// 自动生成：{paper["title"]}',
        f'// 来源：用户提供的同名 PDF；共 {len(items)} 题选择题。纯前端展示数据，零网络请求。',
        f'export const {paper["tvar"]} = {js_str(paper["title"])}',
        f'export const {paper["lvar"]} = [',
    ]
    for it in items:
        lines.append('  {')
        lines.append(f'    id: {it["id"]},')
        lines.append(f'    q: {js_str(it["q"])},')
        lines.append('    options: [%s],' % ', '.join(js_str(o) for o in it['options']))
        lines.append(f'    answer: {js_str(it["answer"])},')
        lines.append(f'    analysis: {js_str(it["analysis"])},')
        lines.append('  },')
    lines.append(']')
    lines.append('')
    out_path = os.path.join(ROOT, paper['out'])
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    return out_path


def main():
    pdf_dir = sys.argv[1] if len(sys.argv) > 1 else '/Users/maoshanbo/Downloads'
    fail = False
    for paper in PAPERS:
        path = os.path.join(pdf_dir, paper['pdf'])
        if not os.path.isfile(path):
            print(f'✗ 缺少 PDF: {path}')
            fail = True
            continue
        items, problems, stat = parse_paper(path)
        print(f'== {paper["pdf"]}')
        print(f'   题 {stat["questions"]} / 答案 {stat["answers"]} / 分节题数={stat["sections"]}')
        for qid, msg in problems:
            print(f'   ⚠ Q{qid}: {msg}')
        if problems:
            fail = True
        out = write_js(paper, items)
        print(f'   → {paper["out"]} ({os.path.getsize(out)} bytes)')
        if items:
            f, l = items[0], items[-1]
            print(f'   首题: {f["q"][:36]} … 答案 {f["answer"]}')
            print(f'   末题: {l["q"][:36]} … 答案 {l["answer"]}')
    if fail:
        print('\n⚠ 存在告警，请人工核对后再上线')
        sys.exit(2)
    print('\n✓ 全部解析通过')


if __name__ == '__main__':
    main()
