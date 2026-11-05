#!/usr/bin/env python3
"""从《2026年小学古诗文大会专辑补充篇目（上/下）》PDF 提取为「古诗文诵读/赏析」文档块。

结构特点（与题库 PDF 完全不同，本文件不含任何题目）：
  - 目录（TOC）+ 正文。正文按「板块一/二/三…」分块，每块含若干「（一）《篇名》…」诗文条目。
  - 每个诗文条目：
        （一） 《端午》            ← 条目标题（含《篇名》）
        端午                      ← 篇名重复（冗余，丢弃）
        [唐]李隆基               ← 作者/朝代（[x] 开头）
        端午临中夏，…曲糵且传觞。 ← 诗文正文（中文碎片，行间夹拼音注音行）
        【逐句翻译】…            ← 逐句翻译段
        【内容主旨】…            ← 主旨段
  - 拼音注音（qǔ / niè / shānɡ …）为独立拉丁行，无汉字，直接丢弃；正文中文碎片拼接即还原全诗。
  - TOC 里的「（一） 《端午》 ……… 2」以「点号+页码」结尾，与正文同名条目区分 → 丢弃 TOC 行。

输出：blocks 数组（{t:'h1'|'h2'|'p', text}），供 YuwenGushiwenPanel 的 doc 视图渲染（可搜索）。

用法：
  python3 scripts/extract_gushiwen_buchong.py <pdf> <out_js> <title> <blockvar> <lvar>
"""
import json
import os
import re
import sys

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- 噪声行（整行丢弃） ----
NOISE_SUB = ['公众号', '微信号', '古诗文大会专辑', '目录']


def clean_lines(text):
    out = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if any(sub in s for sub in NOISE_SUB):
            continue
        # 纯页码（如 "2" "34"）
        if re.fullmatch(r'\d+', s):
            continue
        # 无汉字的行（拼音注音 / 纯拉丁）→ 丢弃
        if not re.search(r'[一-鿿]', s):
            continue
        out.append(s)
    return out


BLOCK_RE = re.compile(r'^[板版]块[一二三四五六七八九十百]+[:：]')
POEM_RE = re.compile(r'^[（(][一二三四五六七八九十百]+[）)]\s*《([^》]+)》')
AUTHOR_RE = re.compile(r'^[\[【][^】\]]+[\]】]')
# TOC 行：以「点号/空格 + 数字」结尾
TOC_TAIL = re.compile(r'[.．·\s]+\d+\s*$')


def is_toc(line):
    return bool(TOC_TAIL.search(line))


def parse(pdf_path):
    reader = PdfReader(pdf_path)
    lines = []
    for page in reader.pages:
        lines.extend(clean_lines(page.extract_text() or ''))

    blocks = []
    cur = None          # 当前诗文条目 {title, author, body[], trans[], theme[]}
    mode = 'body'       # body | trans | theme

    def flush():
        nonlocal cur
        if cur is None:
            return
        if cur['title']:
            blocks.append({'t': 'h2', 'text': '《' + cur['title'] + '》'})
        if cur['author']:
            blocks.append({'t': 'p', 'text': cur['author']})
        body = ''.join(cur['body']).strip()
        if body:
            blocks.append({'t': 'p', 'text': body})
        trans = '\n'.join(cur['trans']).strip()
        if trans:
            blocks.append({'t': 'h3', 'text': '译文'})
            blocks.append({'t': 'p', 'text': trans})
        theme = '\n'.join(cur['theme']).strip()
        if theme:
            blocks.append({'t': 'h3', 'text': '内容主旨'})
            blocks.append({'t': 'p', 'text': theme})
        cur = None

    for ln in lines:
        # TOC 行（板块/诗文条目以页码结尾）→ 跳过
        if is_toc(ln):
            continue
        m = BLOCK_RE.match(ln)
        if m:
            flush()
            blocks.append({'t': 'h1', 'text': ln})
            mode = 'body'
            continue
        m = POEM_RE.match(ln)
        if m:
            flush()
            cur = {'title': m.group(1).strip(), 'author': '', 'body': [], 'trans': [], 'theme': []}
            mode = 'body'
            continue
        if ln == '【逐句翻译】':
            mode = 'trans'
            continue
        if ln == '【内容主旨】':
            mode = 'theme'
            continue
        if cur is None:
            # 板块内但非诗文条目的散行（如板块导语）—并入上一块或丢弃
            continue
        if mode == 'body':
            if AUTHOR_RE.match(ln):
                cur['author'] = ln
            elif ln == cur['title']:
                pass  # 冗余篇名重复行
            else:
                cur['body'].append(ln)
        elif mode == 'trans':
            cur['trans'].append(ln)
        elif mode == 'theme':
            cur['theme'].append(ln)
    flush()
    return blocks


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    if len(sys.argv) < 6:
        print('用法: extract_gushiwen_buchong.py <pdf> <out_js> <title> <blockvar> <lvar>')
        sys.exit(2)
    pdf, out_rel, title, blockvar, lvar = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
    blocks = parse(pdf)
    nh1 = sum(1 for b in blocks if b['t'] == 'h1')
    nh2 = sum(1 for b in blocks if b['t'] == 'h2')
    np_ = sum(1 for b in blocks if b['t'] == 'p')
    out_path = os.path.join(ROOT, out_rel)
    lines = [
        f'// 自动生成：{title}',
        '// 来源：用户提供的同名 PDF；诗词诵读/赏析材料（含逐句翻译与内容主旨），纯前端展示，零网络请求。',
        '// block: { t: "h1"|"h2"|"p", text }',
        f'export const {lvar}_TITLE = {js_str(title)}',
        f'export const {blockvar} = [',
    ]
    for b in blocks:
        lines.append(f'  {js_str(b)},')
    lines.append(']')
    lines.append('')
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print(f'  → {out_rel} ({os.path.getsize(out_path)} bytes)')
    print(f'    blocks: h1={nh1}（板块） h2={nh2}（诗文条目） p={np_}')
    if nh2 == 0:
        print('  ⚠ 未提取到任何诗文条目，请检查 PDF 结构')
        sys.exit(2)
    print('\n✓ 解析通过')


if __name__ == '__main__':
    main()
