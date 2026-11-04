#!/usr/bin/env python3
"""从《2026年小学古诗文大会复赛讲义2》PDF 提取单选题，生成 gushiwenDasaiFzJiangyi2.js。

结构特点（与之前 4 本练习册不同）：
  - 多专题、题目按专题「连续重新编号」（每专题从 1 开始），共 7 段；
  - 题型混合：绝大多数 [单选题]，少量 [填空题]（无选项，MC 模型不收录，跳过）；
  - 部分单选题（第 7 段 92–112 题）连 [单选题] 标记都没有，仅 `N．题干`；
  - 末尾独立 `参考答案` 段，答案形如 `N．答案：X 解析：…`，且存在：
      * 解析文字中夹带的伪 `N．答案：…` 引用（共 22 处，落于 nums 92–112 及 num37 第三处）；
      * 个别答案为「文字」而非字母（如 Q90 答案「崔颢」），需回映射选项字母。

策略：
  - 题目块以 `^N．` 起（标记可选）；按编号回退切段。
  - 答案按「题目所在段序号 + 该题号」定位：第 k 个含该题号的答案段即为本题答案
    （伪引用总是排在真实答案之后，取前 K 个真实答案即可，K=含该题号的段数）。
  - 填空题 / 无选项块 → 跳过并统计；文字答案 → 命中唯一含该文字的选项字母。
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
    re.compile(r'^选择题$'),
    re.compile(r'^填空題$'),
    re.compile(r'^填空题$'),
    re.compile(r'^判断题$'),
    re.compile(r'复赛讲义'),
    re.compile(r'^壹[︱|]'), re.compile(r'^贰[︱|]'), re.compile(r'^叁[︱|]'),
    re.compile(r'^肆[︱|]'), re.compile(r'^伍[︱|]'), re.compile(r'^陆[︱|]'),
    re.compile(r'^柒[︱|]'), re.compile(r'^捌[︱|]'), re.compile(r'^玖[︱|]'),
    re.compile(r'^拾[︱|]'),
    re.compile(r'^【.+】$'),
    re.compile(r'^乐读郭嘉豪$'),
]

Q_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*(?:\[(单选|填空|判断)题\])?\s*(.*)$')
ANS_START_RE = re.compile(r'(\d{1,3})\s*[．.]\s*答案\s*[：:；;]?')
OPT_RE = re.compile(r'(?<![A-Za-z])([A-D])\s*[．.]?\s*(?=\S)')

PAPER = {
    'pdf': '2026年小学古诗文大会复赛讲义2.pdf',
    'label': '复赛讲义2',
    'title': '2026小学古诗文大会复赛讲义2（重点专题补充·含答案）',
    'tvar': 'GUSHIWEN_FZ_JIANGYI2_TITLE',
    'lvar': 'GUSHIWEN_FZ_JIANGYI2',
    'out': 'src/data/gushiwenDasaiFzJiangyi2.js',
}


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


def extract_options(s):
    """返回首个按序 A,B,C,(D) 序列的 (marks) 或 None。"""
    seq = ['A', 'B', 'C', 'D']
    marks = [(m.start(), m.group(1)) for m in OPT_RE.finditer(s)]
    for i in range(len(marks)):
        run = []
        for m in marks[i:]:
            if len(run) < 4 and m[1] == seq[len(run)]:
                run.append(m)
            else:
                break
        if len(run) >= 3:
            return run
    return None


def parse_paper(path):
    reader = PdfReader(path)
    lines = []
    for page in reader.pages:
        lines.extend(clean_lines(page.extract_text() or ''))

    ans_start = None
    for i, ln in enumerate(lines):
        if ln == '参考答案':
            ans_start = i
            break
    if ans_start is None:
        for i, ln in enumerate(lines):
            if ANS_START_RE.search(ln):
                ans_start = i
                break
    if ans_start is None:
        raise RuntimeError(f'{path}: 未找到答案区')

    qa = lines[:ans_start]
    # 注意：ans_start 这一行本身往往就含首个答案（如「1．答案：C … 2．答案：B …」），
    # 必须包含进来，否则第一段前两题的答案会被丢掉、后续每段偏移全错。
    aa_text = '\n'.join(lines[ans_start:])

    # ---- 解析答案区：按起始标记切块，段内首段=答案文字，其后=解析 ----
    ans_matches = list(ANS_START_RE.finditer(aa_text))
    buckets = {}  # num -> [(answer_raw, analysis), ...] 顺序即出现序
    for i, m in enumerate(ans_matches):
        num = int(m.group(1))
        start = m.end()
        end = ans_matches[i + 1].start() if i + 1 < len(ans_matches) else len(aa_text)
        seg = aa_text[start:end]
        if '解析' in seg:
            araw, analysis = seg.split('解析', 1)
        else:
            araw, analysis = seg, ''
        araw = araw.strip()
        analysis = re.sub(r'^[：:]\s*', '', analysis).strip()
        buckets.setdefault(num, []).append((araw, analysis))

    # ---- 解析题目区：按编号切段 ----
    # 仅当该行确为「题目起始」才开新块：需带题型标记或含括号（涵盖无标记的 92–112 题）；
    # 其余带编号的罗列行（如「1．子 2．丑」）视为上题续行，避免误切段。
    blocks = []  # (num, typ, [lines])
    cur = None
    for ln in qa:
        m = Q_RE.match(ln)
        is_start = False
        if m:
            typ = m.group(2)
            rest = m.group(3)
            marker = typ is not None
            has_paren = '（' in ln
            if marker or has_paren:
                is_start = True
        if is_start:
            cur = [int(m.group(1)), typ, [rest] if rest else []]
            blocks.append(cur)
        elif cur is not None:
            cur[2].append(ln)
    q_groups = split_groups([(b[0], b) for b in blocks])

    # 各段尺寸（用于推算「某题号在第几段第几次出现」）
    sec_sizes = [len(g) for g in q_groups]

    items, problems, skipped_fill = [], [], 0
    gid = 0
    for gi, qg in enumerate(q_groups):
        for (_bnum, b) in qg:
            _num, typ, blines = b[0], b[1], b[2]
            s = '\n'.join(blines)
            is_fill = (typ == '填空') or ('[填空题]' in s)
            if is_fill:
                skipped_fill += 1
                continue
            run = extract_options(s)
            if run is None:
                # 无选项：明确标记的单选题视为残缺告警；无标记（如未标 [填空题] 的填空题干）按填空静默跳过
                if typ is None:
                    skipped_fill += 1
                    continue
                problems.append((gid + 1, f'原Q{_num} 无选项且非填空，跳过'))
                continue
            gid += 1
            A, B, C = run[0], run[1], run[2]
            D = run[3] if len(run) > 3 else None
            q_text = s[:A[0]].replace('\n', '').strip()
            q_text = re.sub(r'^\[(单选|填空|判断)题\]', '', q_text).strip()
            opts = []
            for k, pos in enumerate([A[0], B[0], C[0]] + ([D[0]] if D else [])):
                end = run[k + 1][0] if k + 1 < len(run) else len(s)
                opts.append(s[pos + 2:end].replace('\n', '').strip())

            # 答案定位：第 k 次出现（k = 之前含该题号的段数）
            occur = sum(1 for t in range(gi) if sec_sizes[t] >= _num)
            ans_pair = None
            if _num in buckets and occur < len(buckets[_num]):
                ans_pair = buckets[_num][occur]
            if ans_pair is None:
                problems.append((gid, f'原Q{_num} 找不到对应答案（occur={occur}）'))
                continue
            answer_raw, analysis = ans_pair
            # 字母答案 or 文字答案回映射
            letter = answer_raw.upper() if re.fullmatch(r'[A-Da-d]', answer_raw) else None
            if letter is None:
                hit = [j for j, o in enumerate(opts) if (o == answer_raw or answer_raw in o)]
                if len(hit) == 1:
                    letter = chr(65 + hit[0])
                elif len(hit) > 1:
                    problems.append((gid, f'原Q{_num} 文字答案「{answer_raw}」命中多选项'))
                    continue
                else:
                    problems.append((gid, f'原Q{_num} 答案「{answer_raw}」无法映射到选项'))
                    continue
            if ord(letter) - 65 >= len(opts):
                problems.append((gid, f'原Q{_num} 答案{letter}超出选项数{len(opts)}'))
                continue
            items.append({
                'id': gid,
                'q': q_text,
                'options': opts,
                'answer': letter,
                'analysis': analysis,
            })

    stat = {
        'questions': len(items),
        'skipped_fill': skipped_fill,
        'sections': sec_sizes,
    }
    return items, problems, stat


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def write_js(paper, items):
    lines = [
        f'// 自动生成：{paper["title"]}',
        f'// 来源：用户提供的同名 PDF；共 {len(items)} 题单选题（填空题 {0} 道未收录）。纯前端展示数据，零网络请求。',
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
    path = os.path.join(pdf_dir, PAPER['pdf'])
    if not os.path.isfile(path):
        print(f'✗ 缺少 PDF: {path}')
        sys.exit(2)
    items, problems, stat = parse_paper(path)
    print(f'== {PAPER["pdf"]}')
    print(f'   单选题 {stat["questions"]} / 跳过填空题 {stat["skipped_fill"]} / 分节题数={stat["sections"]}')
    for qid, msg in problems:
        print(f'   ⚠ Q{qid}: {msg}')
    out = write_js(PAPER, items)
    print(f'   → {PAPER["out"]} ({os.path.getsize(out)} bytes)')
    if items:
        f, l = items[0], items[-1]
        print(f'   首题: {f["q"][:36]} … 答案 {f["answer"]}')
        print(f'   末题: {l["q"][:36]} … 答案 {l["answer"]}')
    if problems:
        print('\n⚠ 存在告警，请人工核对后再上线')
        sys.exit(2)
    print('\n✓ 解析通过')


if __name__ == '__main__':
    main()
