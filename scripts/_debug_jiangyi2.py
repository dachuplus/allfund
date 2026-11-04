#!/usr/bin/env python3
"""Debug: map answer-area section boundaries via num resets."""
import os, re, sys
sys.path.insert(0, '/tmp/pylibs')
from pypdf import PdfReader

pdf = os.path.expanduser('~/Downloads/2026年小学古诗文大会复赛讲义2.pdf')
_TRANS = {}
for i in range(10): _TRANS[chr(0xFF10 + i)] = str(i)
for i in range(26):
    _TRANS[chr(0xFF21 + i)] = chr(0x41 + i); _TRANS[chr(0xFF41 + i)] = chr(0x61 + i)
NOISE = [re.compile(r'北辰课堂'), re.compile(r'蕊风语文'), re.compile(r'^\d{1,3}$'),
    re.compile(r'^参考答案$'), re.compile(r'^单选题$'), re.compile(r'^选择题$'),
    re.compile(r'^填空題$'), re.compile(r'^填空题$'), re.compile(r'^判断题$'),
    re.compile(r'复赛讲义'), re.compile(r'^壹[︱|]'), re.compile(r'^贰[︱|]'),
    re.compile(r'^叁[︱|]'), re.compile(r'^肆[︱|]'), re.compile(r'^伍[︱|]'),
    re.compile(r'^陆[︱|]'), re.compile(r'^柒[︱|]'), re.compile(r'^捌[︱|]'),
    re.compile(r'^玖[︱|]'), re.compile(r'^拾[︱|]'), re.compile(r'^【.+】$'),
    re.compile(r'^乐读郭嘉豪$')]
Q_RE = re.compile(r'^(\d{1,3})\s*[．.]\s*(?:\[(单选|填空|判断)题\])?\s*(.*)$')
ANS_START_RE = re.compile(r'(\d{1,3})\s*[．.]\s*答案\s*[：:；;]?')

def clean_lines(text):
    out = []
    for raw in text.splitlines():
        s = raw.translate(_TRANS).strip()
        if not s: continue
        if any(p.search(s) for p in NOISE): continue
        out.append(s)
    return out

reader = PdfReader(pdf)
lines = []
for page in reader.pages:
    lines.extend(clean_lines(page.extract_text() or ''))

ans_start = None
for i, ln in enumerate(lines):
    if ln == '参考答案': ans_start = i; break
if ans_start is None:
    for i, ln in enumerate(lines):
        if ANS_START_RE.search(ln): ans_start = i; break
aa_text = '\n'.join(lines[ans_start + 1:])
matches = list(ANS_START_RE.finditer(aa_text))

# Walk matches, detect section boundaries by num reset, also flag embedded (same prev num & very close pos)
seq = []
prev_num = None
section_num = 0
cur = []
for i, m in enumerate(matches):
    num = int(m.group(1))
    # crude: attach answer letter
    start = m.end()
    end = matches[i+1].start() if i+1 < len(matches) else len(aa_text)
    seg = aa_text[start:end]
    letter = seg.strip()[:1]
    if prev_num is not None and num <= prev_num:
        # boundary (could be new section OR embedded pseudo-ref where num==prev)
        # heuristic: if num==prev_num AND this is a known-pseudo (92-112 / 37 third), mark embedded
        pass
    cur.append((num, letter))
    prev_num = num

# Better: print the raw num/letter sequence in chunks to eyeball
print('idx  num letter  (reset when num drops)')
prev = 999
for i, (num, letter) in enumerate(cur):
    mark = '  <== RESET' if num <= prev else ''
    print(f'{i:4d}  {num:3d}   {letter}  {mark}')
    prev = num
