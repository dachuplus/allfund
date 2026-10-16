#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_em_constituents.py — 本地验证 /api/em-constituents 边缘函数对 7 个目标指数的成分股返回。

用法：
  python3 scripts/test_em_constituents.py
  EM_CONSTITUENTS_API=https://your.domain/api/em-constituents python3 scripts/test_em_constituents.py
"""
import os
import sys
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = os.environ.get('EM_CONSTITUENTS_API') or 'https://www.dachu.me/api/em-constituents'
# 与定投助手默认 7 指数一致
CODES = ['000300', '000905', '000906', '000852', '000510', '932000', '000985']
HEADERS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}


def fetch_one(code):
    url = f'{API}?index={code}'
    req = Request(url, headers=HEADERS, method='GET')
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode('utf-8', 'ignore'))
    except HTTPError as e:
        return {'ok': False, 'http': e.code, 'error': e.read().decode('utf-8', 'ignore')[:200]}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def main():
    print(f'测试边缘函数: {API}')
    print(f'目标指数: {CODES}')
    all_ok = True
    for code in CODES:
        t0 = time.time()
        d = fetch_one(code)
        dt = round((time.time() - t0) * 1000)
        if not d.get('ok'):
            all_ok = False
            print(f'  ❌ {code}: 失败 {d.get("error") or d.get("http")} ({dt}ms)')
            continue
        count = d.get('count', 0)
        indcode = d.get('indcode') or '--'
        close = d.get('close')
        sample = (d.get('cons') or [])[:2]
        status = '✅' if count > 0 else '⚠️'
        print(f'  {status} {code} ({indcode}) 成分{count}只 收盘={close} ({dt}ms) 样例={sample}')
    print('')
    print('全部通过' if all_ok else '存在失败')
    sys.exit(0 if all_ok else 1)


if __name__ == '__main__':
    main()
