#!/usr/bin/env python3
"""Dump raw cleaned qa lines of 复赛讲义2 to understand structure."""
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
def clean(text):
    out=[]
    for raw in text.splitlines():
        s=raw.translate(_TRANS).strip()
        if not s: continue
        if any(p.search(s) for p in NOISE): continue
        out.append(s)
    return out
reader=PdfReader(pdf)
lines=[]
for page in reader.pages:
    lines.extend(clean(page.extract_text() or ''))
ans_start=None
for i,ln in enumerate(lines):
    if ln=='参考答案': ans_start=i; break
if ans_start is None:
    for i,ln in enumerate(lines):
        if re.search(r'(\d{1,3})\s*[．.]\s*答案', ln): ans_start=i; break
qa=lines[:ans_start]
print('=== qa lines:', len(qa), '===')
Q_RE=re.compile(r'^(\d{1,3})\s*[．.]\s*(?:\[(单选|填空|判断)题\])?\s*(.*)$')
for i,ln in enumerate(qa):
    tag=''
    m=Q_RE.match(ln)
    if m: tag=f'[NUM {m.group(1)} marker={m.group(2)}]'
    if re.search(r'专题', ln): tag+=' <TOPIC>'
    if re.search(r'专题讲解', ln): tag+=' <LECTURE>'
    print(f'{i:4d} {tag:28s} {ln[:90]}')
