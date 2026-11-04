#!/usr/bin/env python3
"""从《2026年小学古诗文大会复赛讲义2》PDF 提取单选题 + 专题讲义，生成 gushiwenDasaiFzJiangyi2.js。

结构特点（与之前 4 本练习册不同，也是最易错的地方）：
  - 多专题、题目按专题「连续重新编号」，共 7 段；
  - 题型混合：绝大多数 [单选题]，少量 [填空题]（无选项，MC 不收录，跳过）；
  - 部分单选题（第 7 段 92–112 题）连 [单选题] 标记都没有，仅 `N．题干`；
  - 题目与题目之间、以及段首，穿插「专题讲义」块：
        * 标题行：专题N：xxx / ︱专题讲解·xxx︱ / 十二时辰与五更 / 谦称 等（不带题号）；
        * 讲解正文（不带题号）；
        * 编号诗句/举例列表：1.写春天的诗句… 2.写夏天的诗句…（带题号但非题目）。
    这些讲义块必须「提取出来单独展示」，绝不能塞进任何题目的题干或选项里。
  - 末尾独立 `参考答案` 段，答案形如 `N．答案：X 解析：…`，且存在：
        * 解析文字中夹带的伪 `N．答案：…` 引用（共 22 处，落于 nums 92–112 及 num37 第三处）；
        * 个别答案为「文字」而非字母（如某题答案「崔颢」），需回映射选项字母。

关键修复（相对上一版）：
  1. 题目块只在「选项行 / 题干续行」范围内延伸；一旦遇到「专题标题 / 讲义正文」行，立即结束当前题目、开启讲义块。
  2. 无标记无括号但题干内联 A/B/C/D 选项的题目（如 96．杜甫名篇…A 玉米 B 小麦…）也必须识别为独立题目，不能并入上一题。
  3. 答案定位改用「按段 + 题号」精确匹配（取该段内该编号的首次出现，跳过伪引用），不再依赖脆弱的 occur 计数。
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

# 题目起始：N． 或 N. （可选题型标记）
Q_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*(?:\[(单选|填空|判断)题\])?\s*(.*)$')
# 答案起始：N．答案[:：；;]（冒号可选，因部分答案无冒号）
ANS_START_RE = re.compile(r'(\d{1,3})\s*[．.]\s*答案\s*[：:；;]?')

# 选项：字母后跟 ．（点）/ 、 / ，/ , / 空格 之一，再跟非空字符；收紧以避免把「A选项」误判
# 注意：个别题目用「C,对秋日…」逗号分隔（如复赛讲义2 段4 Q48），逗号也必须纳入，否则该题整题丢失。
OPT_RE = re.compile(r'(?<![A-Za-z])([A-D])(?:[．.、，,]\s*|\s{1,4})(?=\S)')


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


def extract_options(s):
    """返回首个按序 A,B,C,(D) 序列的位置列表，或 None。"""
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


# 讲义标题判定（仅用于「不带题号的续行」判断）：必须是「显式标题」，绝不能与题目/选项混淆。
# 题目题干永远带题号（N．开头），选项行永远以 A-D 字母开头；所以以下前缀只会出现在讲义标题上。
EXPLICIT_HEAD_PREFIX = (
    '专题', '︱', '【', '（一）', '（二）', '（三）', '（四）', '（五）', '（六）', '（七）', '（八）',
    '干支', '十二', '谦称', '敬称', '科举', '节气', '生肖', '称谓', '考点', '背诵', '积累',
    '常识', '文化', '文学', '古诗', '古文', '名句', '名篇', '成语', '典故', '历史', '地理',
    '天文', '天干', '地支', '时辰', '诗词', '二十四',
)


def is_explicit_heading(ln):
    """不带题号的行，是否为讲义标题（应开启新讲义块）。

    仅匹配显式标题：以 专题/︱/【/（N）/ 或上述讲义专有前缀开头。
    这些前缀不可能出现在选项行（以 A-D 开头）或题目续行上，因此安全。
    """
    s = ln.strip()
    if not s:
        return False
    for p in EXPLICIT_HEAD_PREFIX:
        if s.startswith(p):
            return True
    return False


def is_option_line(ln):
    """续行是否为选项行（以 A-D 选项字母开头，其后可跟 ．.、，, 或空白）。"""
    return bool(re.match(r'^[A-D](?:[．.、，,]|\s)', ln))


# 无标记、无选项的「题号行」如何区分「填空题」还是「讲义编号举例」：
#   填空题常带赛事/年份标记（如（2006 年古诗文大赛·复赛））；讲义举例（写X的诗句/XX的谦称）不会。
FILL_HINT = re.compile(r'（\d{4}|初赛|复赛|决赛|大赛|真题|模拟')


# 答案区解析里夹带的「伪引用 / 讲义正文」标记——只取这些绝不出现在正常答案解析中的串，
# 遇到即从该处截断，避免把讲义正文污染进 analysis。（注意：不能用「谦称/敬称」等，
# 因为正常解析里本就会讲到谦称敬称，截了反而毁掉正确解析。）
ANALYSIS_CUT = re.compile(r'︱|孟、仲、季|写[春夏天秋]天的诗句|专题讲解|专题\s*\d')


def clean_analysis(a):
    a = (a or '').strip()
    m = ANALYSIS_CUT.search(a)
    if m:
        a = a[:m.start()].strip()
    return a


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
    # 关键：ans_start 行本身往往就含首个答案（如「1．答案：C … 2．答案：B …」），必须包含进来
    aa_text = '\n'.join(lines[ans_start:])

    # ---- 解析答案区：按起始标记切块，段内首段=答案文字，其后=解析 ----
    ans_matches = list(ANS_START_RE.finditer(aa_text))
    # 平面列表 (num, raw, analysis)
    ans_flat = []
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
        ans_flat.append((num, araw, analysis))

    # 按「编号回退」切成答案段（与题目段对应）；伪引用落在段内会被过滤（其编号超出该段尺寸）
    ans_sections = []
    cur = []
    prev = None
    for num, araw, analysis in ans_flat:
        if prev is not None and num < prev:
            ans_sections.append(cur)
            cur = []
        cur.append((num, araw, analysis))
        prev = num
    ans_sections.append(cur)
    # 每段建立 num -> 首次(raw, analysis)，并过滤超出段尺寸的伪引用
    ans_by_sec = []
    for sec in ans_sections:
        d = {}
        for num, araw, analysis in sec:
            if num not in d:
                d[num] = (araw, analysis)
        ans_by_sec.append(d)

    # ---- 解析题目区：分离「题目」与「专题讲义」 ----
    items = []          # 混合序列：{'kind':'q'|'doc', ...}
    cur_doc = None       # 当前讲义块 {'title','body':[lines]}
    problems = []
    skipped_fill = 0

    def flush_doc():
        nonlocal cur_doc
        if cur_doc is None:
            return
        title = cur_doc['title'].strip()
        # 清理多余分隔符（︱ 等），并跳过空行
        body_lines = [l.replace('︱', '').strip() for l in cur_doc['body']]
        body_lines = [l for l in body_lines if l]
        body = '\n'.join(body_lines).strip()
        title = title.replace('︱', '').strip(' ｜|')
        items.append({'kind': 'doc', 'title': title, 'body': body})
        cur_doc = None

    N = len(qa)
    i = 0
    while i < N:
        ln = qa[i]
        m = Q_RE.match(ln)
        if m:
            num = int(m.group(1))
            typ = m.group(2)
            rest = m.group(3)
            # 收集题目块：起始行 + 后续不带题号行，直到下一题号 / 讲义标题
            blk_lines = [ln]
            opts_seen = extract_options(ln) is not None
            j = i + 1
            while j < N:
                nxt = qa[j]
                if Q_RE.match(nxt):
                    break
                if is_explicit_heading(nxt):
                    break
                if is_option_line(nxt):
                    blk_lines.append(nxt)
                    opts_seen = True
                    j += 1
                    continue
                if not opts_seen:
                    # 题干续行（选项尚未出现）
                    blk_lines.append(nxt)
                    j += 1
                    continue
                # 选项已齐，后续非选项行（讲义正文）→ 结束题目块
                break
            blk = '\n'.join(blk_lines)
            # 判定题目 or 讲义内的编号举例：
            #   题目 = 带题型标记，或题干内联/续行含 A-B-C-D 选项；
            #   讲义编号举例（如「1.写春天的诗句…」）无选项 → 归入讲义块。
            #   注意：不能用「含（」判断——诗句举例里也有（春）（夏）等括号。
            is_q = (typ in ('单选', '填空', '判断')) or (extract_options(blk) is not None)

            if is_q:
                flush_doc()
                if typ == '填空':
                    skipped_fill += 1
                    i = j
                    continue
                items.append({'kind': 'q', 'num': num, 'blk': blk, 'typ': typ})
                i = j
                continue
            else:
                # 无标记、无选项：可能是「未标 [填空题] 的填空题」，也可能是「讲义编号举例」。
                # 带赛事/年份标记的判为填空题（跳过）；其余（写X的诗句/XX的谦称等）归入讲义块。
                if FILL_HINT.search(ln):
                    skipped_fill += 1
                    i = j
                    continue
                # 编号举例（如 1.写春天的诗句）——归入当前讲义块
                if cur_doc is None:
                    cur_doc = {'title': '', 'body': []}
                cur_doc['body'].append(ln)
                i = j
                continue
        else:
            # 不带题号的行
            if cur_doc is None:
                cur_doc = {'title': '', 'body': []}
            # 首行作为标题（若有专题标识则优先；否则用首行）
            if cur_doc['title'] == '' and (('专题' in ln) or ('：' in ln) or not cur_doc['body']):
                cur_doc['title'] = ln
            else:
                cur_doc['body'].append(ln)
            i += 1
    flush_doc()

    # ---- 题目分段（仅按题目编号回退；讲义块不影响） ----
    qs = [it for it in items if it['kind'] == 'q']
    sections = []
    cur = []
    prev_num = None
    for q in qs:
        n = q['num']
        if prev_num is not None and n < prev_num:
            sections.append(cur)
            cur = []
        cur.append(q)
        prev_num = n
    sections.append(cur)
    sec_sizes = [len(s) for s in sections]

    # ---- 答案匹配：按段 + 题号 ----
    gid = 0
    unmatched = []
    for gi, sec in enumerate(sections):
        adict = ans_by_sec[gi] if gi < len(ans_by_sec) else {}
        for q in sec:
            n = q['num']
            if n not in adict:
                unmatched.append((n, gi))
                q['_result'] = None
                continue
            araw, analysis = adict[n]
            blk = q['blk']
            run = extract_options(blk)
            if run is None:
                problems.append(f'原Q{n}(段{gi+1}) 有题号但无选项，跳过')
                q['_result'] = None
                continue
            A, B, C = run[0], run[1], run[2]
            D = run[3] if len(run) > 3 else None
            q_text = blk[:A[0]].replace('\n', '').strip()
            # 去掉题号前缀（N．）与题型标记（[单选题]），UI 已显示全局「第 N 题」计数器
            q_text = re.sub(r'^\d{1,3}\s*[．.]\s*', '', q_text)
            q_text = re.sub(r'^\[(?:单选|填空|判断)题\]', '', q_text).strip()
            opts = []
            for k, pos in enumerate([A[0], B[0], C[0]] + ([D[0]] if D else [])):
                end = run[k + 1][0] if k + 1 < len(run) else len(blk)
                opts.append(blk[pos + 2:end].replace('\n', '').strip())
            analysis = clean_analysis(analysis)

            # 字母答案 or 文字答案回映射
            letter = araw.upper() if re.fullmatch(r'[A-Da-d]', araw) else None
            if letter is None:
                hit = [jj for jj, o in enumerate(opts) if (o == araw or araw in o)]
                if len(hit) == 1:
                    letter = chr(65 + hit[0])
                elif len(hit) > 1:
                    problems.append(f'原Q{n}(段{gi+1}) 文字答案「{araw}」命中多选项')
                    q['_result'] = None
                    continue
                else:
                    problems.append(f'原Q{n}(段{gi+1}) 答案「{araw}」无法映射到选项')
                    q['_result'] = None
                    continue
            if ord(letter) - 65 >= len(opts):
                problems.append(f'原Q{n}(段{gi+1}) 答案{letter}超出选项数{len(opts)}')
                q['_result'] = None
                continue
            gid += 1
            q['_result'] = {
                'id': gid,
                'q': q_text,
                'options': opts,
                'answer': letter,
                'analysis': analysis,
            }

    # ---- 重建混合输出：题目块替换为已匹配题目（失败的整块丢弃，不占位），讲义块原样保留 ----
    result = []
    for it in items:
        if it['kind'] == 'doc':
            result.append({'type': 'doc', 'title': it['title'], 'body': it['body']})
        else:
            if it.get('_result') is not None:
                result.append(it['_result'])

    n_q = sum(1 for it in items if it.get('kind') == 'q' and it.get('_result') is not None)
    stat = {
        'questions': n_q,
        'skipped_fill': skipped_fill,
        'sections': sec_sizes,
        'ans_sections': [len(d) for d in ans_by_sec],
        'unmatched': unmatched,
    }
    return result, problems, stat


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def write_js(paper, items):
    nq = sum(1 for x in items if x.get('type') != 'doc')
    nd = sum(1 for x in items if x.get('type') == 'doc')
    lines = [
        f'// 自动生成：{paper["title"]}',
        f'// 来源：用户提供的同名 PDF；共 {nq} 题单选题（填空题未收录），并提取 {nd} 个专题讲义块单独展示。纯前端展示数据，零网络请求。',
        f'export const {paper["tvar"]} = {js_str(paper["title"])}',
        f'export const {paper["lvar"]} = [',
    ]
    for it in items:
        if it.get('type') == 'doc':
            lines.append('  {')
            lines.append(f'    type: "doc",')
            lines.append(f'    title: {js_str(it["title"])},')
            lines.append(f'    body: {js_str(it["body"])},')
            lines.append('  },')
        else:
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
    pdf_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads')
    path = os.path.join(pdf_dir, PAPER['pdf'])
    if not os.path.isfile(path):
        print(f'✗ 缺少 PDF: {path}')
        sys.exit(2)
    items, problems, stat = parse_paper(path)
    print(f'== {PAPER["pdf"]}')
    print(f'   单选题 {stat["questions"]} / 跳过填空题 {stat["skipped_fill"]}')
    print(f'   题目分段尺寸    = {stat["sections"]}')
    print(f'   答案分段尺寸    = {stat["ans_sections"]}')
    if stat['unmatched']:
        print(f'   ⚠ 未匹配答案的题号（段,编号）: {stat["unmatched"][:20]}'
              + (' …' if len(stat['unmatched']) > 20 else ''))
        print(f'   ⚠ 未匹配总数: {len(stat["unmatched"])}')
    for msg in problems:
        print(f'   ⚠ {msg}')
    out = write_js(PAPER, items)
    print(f'   → {PAPER["out"]} ({os.path.getsize(out)} bytes)')
    # 校验：题库内不应残留讲义「标题/分隔符」关键字（这些串只可能来自讲义块，绝不属正常题干/选项/解析）。
    # 注意：'谦称'/'敬称' 是正常考点，题干里就会讲到，不能列入（否则误报）。
    bad = [x for x in items if x.get('type') != 'doc' and any(
        k in (x.get('q', '') + ''.join(x.get('options', [])) + x.get('analysis', ''))
        for k in ['专题', '︱', '诗词中的季节', '孟、仲、季', '讲解·', '专题讲解'])]
    if bad:
        print(f'   ⚠ 校验失败：{len(bad)} 道题目仍含讲义关键字，请检查')
    ndoc = sum(1 for x in items if x.get('type') == 'doc')
    print(f'   提取专题讲义块: {ndoc} 个')
    if items and not bad and not stat['unmatched'] and not problems:
        f = [x for x in items if x.get('type') != 'doc']
        if f:
            print(f'   首题: {f[0]["q"][:30]} … 答案 {f[0]["answer"]}')
            print(f'   末题: {f[-1]["q"][:30]} … 答案 {f[-1]["answer"]}')
        print('\n✓ 解析通过')
    else:
        print('\n⚠ 存在告警，请人工核对后再上线')
        sys.exit(2)


PAPER = {
    'pdf': '2026年小学古诗文大会复赛讲义2.pdf',
    'label': '复赛讲义2',
    'title': '2026小学古诗文大会复赛讲义2（重点专题补充·含答案）',
    'tvar': 'GUSHIWEN_FZ_JIANGYI2_TITLE',
    'lvar': 'GUSHIWEN_FZ_JIANGYI2',
    'out': 'src/data/gushiwenDasaiFzJiangyi2.js',
}

if __name__ == '__main__':
    main()
