#!/usr/bin/env python3
"""从《2026年古诗文初选知识点分析.pdf》提取复习文档，生成
src/data/gushiwenZhishidian.js（blocks 结构：h1/h2/h3/p/kv）。

文档结构（行级状态机）：
  - 「第X部分 …」→ h1；「X、…」/「X年级X册…」→ h2；「◆ 《…》」→ h3
  - 「原文：…」「考察句：…」→ kv 字段块（条目内容）
  - 「第N 页…」开头的知识点条目 → p 段落（可跨行）
  - 其余行为续行，拼接进当前块；水印「乐读郭嘉豪」等噪声丢弃
"""
import json
import os
import re
import sys

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else '/Users/maoshanbo/Downloads/2026年古诗文初选知识点分析.pdf'

RE_H1 = re.compile(r'^第[一二三四五六七八九十]+部分')
RE_H2_NUM = re.compile(r'^[一二三四五六七八九十]+、')
RE_H2_GRADE = re.compile(r'^[一二三四五六]年级[上下]册')
RE_H3 = re.compile(r'^◆\s*')
RE_KV = re.compile(r'^(原文|考察句|译文|注释|考察)\s*[：:]\s*')
RE_PAGE_ITEM = re.compile(r'^第\d+\s*[^，。；]{0,8}页')  # 「第1-2 页」「第12 页」「第51—52 页」
RE_NOISE = [
    re.compile(r'^乐读郭嘉豪$'),
    re.compile(r'^\d{1,3}$'),
    re.compile(r'^北辰课堂'),
    re.compile(r'蕊风语文'),
]
TITLE_LINE = '2026 小学生古诗文大会初选题目 知识点分析'


def clean_line(s):
    s = s.strip()
    if not s:
        return None
    for p in RE_NOISE:
        if p.search(s):
            return None
    return s


def parse():
    reader = PdfReader(PDF)
    title = '2026小学古诗文大会初选·知识点分析'
    blocks = []  # {t, label?, text}
    cur = None   # 当前开放块（续行拼进来）

    def close():
        nonlocal cur
        if cur is not None:
            text = re.sub(r'\s{2,}', ' ', cur['text']).strip()
            if text:
                cur['text'] = text
                blocks.append(cur)
            cur = None

    def open_block(t, text, label=None):
        nonlocal cur
        close()
        blk = {'t': t, 'text': text}
        if label:
            blk['label'] = label
        if t in ('h1', 'h2', 'h3'):
            blocks.append(blk)   # 标题独立成块，不留开放态
        else:
            cur = blk

    for page in reader.pages:
        for raw in (page.extract_text() or '').splitlines():
            s = clean_line(raw)
            if s is None:
                continue
            if TITLE_LINE in s:
                continue
            if RE_H1.match(s):
                open_block('h1', s)
            elif RE_H2_NUM.match(s) or RE_H2_GRADE.match(s):
                open_block('h2', s)
            elif RE_H3.match(s):
                open_block('h3', RE_H3.sub('', s))
            else:
                m = RE_KV.match(s)
                if m:
                    open_block('kv', s[m.end():].strip(), label=m.group(1))
                elif RE_PAGE_ITEM.match(s):
                    open_block('p', s)
                elif cur is not None:
                    cur['text'] += s
                else:
                    open_block('p', s)
    close()
    return title, blocks


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def write_js(title, blocks):
    lines = [
        '// 自动生成：2026小学古诗文大会初选题目知识点分析（复习文档，非题库）',
        '// 来源：用户提供的同名 PDF；纯前端展示数据，零网络请求。',
        f'export const GUSHIWEN_ZD_TITLE = {js_str(title)}',
        '// block: { t: "h1"|"h2"|"h3"|"p"|"kv", text, label? }',
        'export const GUSHIWEN_ZD_BLOCKS = [',
    ]
    for b in blocks:
        if b['t'] == 'kv':
            lines.append('  { t: "kv", label: %s, text: %s },' % (js_str(b['label']), js_str(b['text'])))
        else:
            lines.append('  { t: %s, text: %s },' % (js_str(b['t']), js_str(b['text'])))
    lines.append(']')
    lines.append('')
    out = os.path.join(ROOT, 'src/data/gushiwenZhishidian.js')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    return out


def main():
    title, blocks = parse()
    from collections import Counter
    c = Counter(b['t'] for b in blocks)
    print(f'块统计: {dict(c)} / 共 {len(blocks)} 块')
    # 抽样核对
    for b in blocks[:3] + blocks[-3:]:
        print(' ', b)
    out = write_js(title, blocks)
    print(f'→ {out} ({os.path.getsize(out)} bytes)')


if __name__ == '__main__':
    main()
