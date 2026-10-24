#!/usr/bin/env python3
"""从用户提供的古诗文大会 PDF 讲义中提取选择题，生成与 gushiwenDasai.js
同构的前端数据文件（含答案与解析）。

PDF 结构（讲义1/2/3 三四年级/五年级 同构）：
  - 页眉「北辰课堂·学习资料 … 公众号：蕊风语文」+ 独立页码行（丢弃）
  - 前半部分：`N．题干…` + `A.选项 B.选项 C.选项 D.选项`（可换行）
  - 后半部分：`N．答案：X 解析：…`（解析可换行）

用法： python3 scripts/extract_gushiwen_pdf.py [PDF目录]
输出： src/data/gushiwenDasaiG3.js / G5 / Jy1 / Jy2
"""
import json
import os
import re
import sys

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 全角 → 半角（数字/字母），保证题号与选项字母标记可匹配
_TRANS = {}
for i in range(10):
    _TRANS[chr(0xFF10 + i)] = str(i)
for i in range(26):
    _TRANS[chr(0xFF21 + i)] = chr(0x41 + i)
    _TRANS[chr(0xFF41 + i)] = chr(0x61 + i)
_TRANS['：'] = '：'  # 保留中文冒号（仅标记用），不转

NOISE_PATTERNS = [
    re.compile(r'北辰课堂'),
    re.compile(r'蕊风语文'),
    re.compile(r'^\d{1,3}$'),                 # 独立页码行
    re.compile(r'^乐读郭嘉豪$'),
    re.compile(r'^【.+】$'),                   # 【真题赏析】等小节标记
    re.compile(r'^[壹贰叁肆伍陆柒捌玖拾]+︱'),  # 壹︱题型训练…
    re.compile(r'^(三年级|五年级|四年级)$'),    # 卷首年级标题
]

Q_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*(.*)$')
ANS_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*答案\s*[：:]\s*([A-D])\s*(.*)$')
# 行首匹配用于定位答案区起点；正式解析用不限行首版本（pypdf 会把两条答案挤进同一物理行）
ANS_ANY_RE = re.compile(r'(\d{1,3})\s*[．.]\s*答案\s*[：:]\s*([A-D])')
OPT_RE = re.compile(r'(?<![A-Za-z])([A-D])\s*[．.]\s*')

PAPERS = [
    {
        'key': 'g3',
        'pdf': '2026年小学古诗文大会初赛讲义3-三年级.pdf',
        'title': '2026小学古诗文大会初赛讲义3（三年级·含答案）',
        'comment': '2026小学古诗文大会初赛讲义3（三年级，含答案与解析）',
        'tvar': 'GUSHIWEN_DASAI_G3_TITLE',
        'lvar': 'GUSHIWEN_DASAI_G3',
        'out': 'src/data/gushiwenDasaiG3.js',
    },
    {
        'key': 'g5',
        'pdf': '2026年小学古诗文大会初赛讲义3-五年级.pdf',
        'title': '2026小学古诗文大会初赛讲义3（五年级·含答案）',
        'comment': '2026小学古诗文大会初赛讲义3（五年级，含答案与解析）',
        'tvar': 'GUSHIWEN_DASAI_G5_TITLE',
        'lvar': 'GUSHIWEN_DASAI_G5',
        'out': 'src/data/gushiwenDasaiG5.js',
    },
    {
        'key': 'jy1',
        'pdf': '2026年小学古诗文大会初赛讲义1.pdf',
        'title': '2026小学古诗文大会初赛讲义1（真题题型训练·含答案）',
        'comment': '2026小学古诗文大会初赛讲义1（真题题型训练，含答案与解析）',
        'tvar': 'GUSHIWEN_JY1_TITLE',
        'lvar': 'GUSHIWEN_JY1',
        'out': 'src/data/gushiwenDasaiJy1.js',
    },
    {
        'key': 'jy2',
        'pdf': '2026年小学古诗文大会初赛讲义2.pdf',
        'title': '2026小学古诗文大会初赛讲义2（真题题型训练·含答案）',
        'comment': '2026小学古诗文大会初赛讲义2（真题题型训练，含答案与解析）',
        'tvar': 'GUSHIWEN_JY2_TITLE',
        'lvar': 'GUSHIWEN_JY2',
        'out': 'src/data/gushiwenDasaiJy2.js',
    },
]


def clean_lines(text):
    out = []
    for raw in text.splitlines():
        s = raw.translate(_TRANS).strip()
        if not s:
            continue
        if any(p.search(s) for p in NOISE_PATTERNS):
            continue
        out.append(s)
    return out


def split_groups(entries):
    """按题号回退切组：讲义1/2 每节题号从 1 重新编号（题区与答案区同构）。
    entries: [(id, payload)] 按文档顺序。返回 [[(id, payload), ...], ...]（保留 id）。
    """
    groups = []
    cur = []
    prev = None
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

    # 找到答案区起点（第一个 “N.答案：X” 行）
    ans_start = None
    for i, ln in enumerate(lines):
        if ANS_RE.match(ln):
            ans_start = i
            break
    if ans_start is None:
        raise RuntimeError(f'{path}: 未找到答案区')

    # ---- 解析答案区（全文按 “N.答案：X” 标记切块，允许两条答案挤同一行）----
    ans_text = '\n'.join(lines[ans_start:])
    ans_matches = list(ANS_ANY_RE.finditer(ans_text))
    ans_entries = []  # (id, {answer, analysis})
    for i, m in enumerate(ans_matches):
        start = m.end()
        end = ans_matches[i + 1].start() if i + 1 < len(ans_matches) else len(ans_text)
        analysis = ans_text[start:end].replace('\n', '').strip()
        # UI 已有「解析」标签，剥掉源文本冗余前缀
        analysis = re.sub(r'^解析\s*[：:]\s*', '', analysis)
        ans_entries.append((int(m.group(1)), {
            'qid': int(m.group(1)),
            'answer': m.group(2),
            'analysis': analysis,
        }))
    ans_groups = split_groups(ans_entries)

    # ---- 解析题目区（按节分组）----
    qlines = lines[:ans_start]
    # 按题号行切块
    blocks = []  # (id, [lines])
    for ln in qlines:
        m = Q_RE.match(ln)
        if m:
            blocks.append((int(m.group(1)), [m.group(2)]))
        elif blocks:
            blocks[-1][1].append(ln)
        # 首题之前的散行（页眉残留等）忽略
    q_groups = split_groups(blocks)

    if len(q_groups) != len(ans_groups):
        raise RuntimeError(
            f'{path}: 分节数不一致 题{[len(g) for g in q_groups]} '
            f'vs 答{[len(g) for g in ans_groups]}')

    # ---- 按节配对，全局重编号 ----
    items = []
    problems = []
    gid = 0
    for gi, (qg, ag) in enumerate(zip(q_groups, ans_groups), 1):
        if len(qg) != len(ag):
            raise RuntimeError(
                f'{path}: 第{gi}节 题数{len(qg)} != 答案数{len(ag)}')
        for (qid, blines), (_aid, ans) in zip(qg, ag):
            gid += 1
            s = '\n'.join(blines)
            # 找 A-D 选项标记（必须按 A,B,C,D 顺序恰好出现）
            marks = [(m.start(), m.group(1)) for m in OPT_RE.finditer(s)]
            seq = [L for _, L in marks]
            if seq != ['A', 'B', 'C', 'D']:
                problems.append((gid, f'原Q{qid} 选项标记异常: ' + '/'.join(seq) + ' | ' + s[:60]))
                continue
            q_text = s[:marks[0][0]].replace('\n', '').strip()
            q_text = q_text.replace('[单选题]', '').strip()
            opts = []
            for j, (pos, _) in enumerate(marks):
                end = marks[j + 1][0] if j + 1 < len(marks) else len(s)
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
    return items, {}, problems, stat


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def write_js(paper, items):
    lines = [
        f'// 自动生成：{paper["comment"]}',
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
        items, _answers, problems, stat = parse_paper(path)
        print(f'== {paper["pdf"]}')
        print(f'   题 {stat["questions"]} / 答案 {stat["answers"]} / 分节题数={stat["sections"]}')
        for qid, msg in problems:
            print(f'   ⚠ Q{qid}: {msg}')
        if problems:
            fail = True
        out = write_js(paper, items)
        size = os.path.getsize(out)
        print(f'   → {paper["out"]} ({size} bytes)')
        # 打印首末题样例供人工核对
        if items:
            f, l = items[0], items[-1]
            print(f'   样例首题 Q{f["id"]}: {f["q"][:40]} … 答案 {f["answer"]}')
            print(f'   样例末题 Q{l["id"]}: {l["q"][:40]} … 答案 {l["answer"]}')
    if fail:
        print('\n⚠ 存在告警，请人工核对后再上线')
        sys.exit(2)
    print('\n✓ 全部解析通过')


if __name__ == '__main__':
    main()
