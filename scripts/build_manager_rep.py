#!/usr/bin/env python3
"""
构建基金经理「代表产品」静态映射 public/manager_rep.json

用途：
    经理图鉴页（/tools/manager）需要展示每位经理的「代表产品」= 最佳回报基金，
    并给出该产品的 代码 / 名称 / 类型(t1_tt) / 规模(fund_scale)，且产品代码+名称
    可跳转天天基金。东方财富基金经理接口只返回代表产品名称(raw[9])，不返回类型/规模；
    类型与规模是基金级属性，取自 allfund 自有 fund_scores 表（c=代码, n=名称,
    t1_tt=类型, fund_scale=规模）。

    本脚本：
      1) 调用东方财富基金经理接口（ft=all, 全量翻页，复刻边缘函数逻辑）拿到每位经理
         的 id(raw[0])、代表产品代码(raw[8])、代表产品名称(raw[9])；
      2) 收集所有代表产品代码，批量查 fund_scores 得到 类型/规模；
      3) 写出 public/manager_rep.json = { managerId: {code, name, type, scale} }。
    前端按 managerId join 即可，无需逐经理查库。

运行：python3 scripts/build_manager_rep.py   （需 .env.local 中 SUPABASE_PAT）
产物：public/manager_rep.json（vite build 时自动拷入 dist/）
"""
import os
import sys
import json
import time
import urllib.parse
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

EM_BASE = "https://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx"
TIMEOUT = 20
MAX_PN = 2000
MAX_PAGES = 50

SUPABASE_REF = os.environ.get("SUPABASE_PROJECT_REF", "tqhtegazxykkqfcpejky")
SUPABASE_PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
MGMT_API = f"https://api.supabase.com/v1/projects/{SUPABASE_REF}/database/query"
HEADERS = {"Authorization": f"Bearer {SUPABASE_PAT}", "Content-Type": "application/json"}


def fetch_managers_full():
    """复刻边缘函数：顺序翻页拉全量（pn<=2000），返回 [{id, rep_code, rep_name}]。"""
    all_rows = []
    page = 1
    while page <= MAX_PAGES:
        params = {
            "dt": "14", "ft": "all", "mc": "returnjson",
            "pn": str(MAX_PN), "pi": str(page),
        }
        url = f"{EM_BASE}?{urllib.parse.urlencode(params)}"
        r = requests.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
            "Referer": "https://fund.eastmoney.com/manager/",
            "Accept": "*/*",
        }, timeout=TIMEOUT)
        r.raise_for_status()
        text = r.text.strip()
        import re
        m = re.search(r"returnjson\s*=\s*(\{[\s\S]*\})\s*;?\s*$", text)
        if not m:
            raise RuntimeError(f"第{page}页 jsonp 解析失败")
        # 给键名加引号
        obj_txt = re.sub(r"(^|[\s,{])(\w+)\s*:", r'\1"\2":', m.group(1))
        obj = json.loads(obj_txt)
        data = obj.get("data") or []
        pages = int(obj.get("pages") or 1)
        for raw in data:
            if not isinstance(raw, list):
                continue
            mid = (raw[0] or "").strip()
            rep_code = (raw[8] or "").strip() if len(raw) > 8 else ""
            rep_name = (raw[9] or "").strip() if len(raw) > 9 else ""
            all_rows.append({"id": mid, "rep_code": rep_code, "rep_name": rep_name})
        print(f"  已拉第{page}/{pages}页，累计 {len(all_rows)} 位经理", flush=True)
        if page >= pages:
            break
        page += 1
    return all_rows


def norm_code(c):
    """归一化基金代码：去所有非数字字符、再去前导零，转整数。
    东方财富返回 '020236'，fund_scores.c 可能是 '020236' / '20236' / '000001.OF'，
    统一归一成整数 20236 才能跨源匹配。"""
    if not c:
        return None
    digits = "".join(ch for ch in str(c) if ch.isdigit())
    digits = digits.lstrip("0")
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def query_fund_meta(codes):
    """批量查 fund_scores：原始代码 -> {type, scale, name}。分块避免 IN 过大。
    关键：fund_scores.c 格式混乱（纯6位 / 带.OF后缀），用归一化表达式
    ltrim(regexp_replace(c,'\\D','','g'),'0') 与入参（去前导零整数）比对。"""
    meta = {}
    norm_map = {}          # 归一化整数 -> 原始代码（保留前导零用于回写/链接）
    int_codes = []
    for c in codes:
        n = norm_code(c)
        if n is None:
            continue
        norm_map[n] = c
        int_codes.append(n)
    if not int_codes:
        return meta
    chunks = [int_codes[i:i + 800] for i in range(0, len(int_codes), 800)]
    for ci, chunk in enumerate(chunks):
        lit = ",".join(f"'{n}'" for n in chunk)   # 去前导零文本字面量，匹配 text 表达式
        sql = (
            "SELECT c, n, t1_tt, fund_scale FROM fund_scores "
            "WHERE ltrim(regexp_replace(c, '\\D', '', 'g'), '0') IN (" + lit + ")"
        )
        resp = requests.post(MGMT_API, headers=HEADERS, json={"query": sql}, timeout=90)
        if resp.status_code >= 400:
            print(f"  [warn] fund_meta 分块{ci} 查询失败 {resp.status_code}: {resp.text[:200]}", flush=True)
            continue
        rows = resp.json()
        if not isinstance(rows, list):
            continue
        for row in rows:
            n = norm_code(row.get("c"))
            orig = norm_map.get(n) if n is not None else None
            if not orig:
                continue
            scale = row.get("fund_scale")
            try:
                scale = float(scale) if scale is not None else None
            except (TypeError, ValueError):
                scale = None
            meta[orig] = {
                "type": (row.get("t1_tt") or "").strip(),
                "scale": scale,
                "name": (row.get("n") or "").strip(),
            }
        print(f"  fund_meta 分块{ci} 命中 {len(rows)} 条", flush=True)
    return meta


def fmt_scale(scale):
    if scale is None:
        return ""
    try:
        s = float(scale)
    except (TypeError, ValueError):
        return ""
    return f"{s:.2f}亿"


def main():
    print("==> 1/3 拉取全量基金经理（含代表产品代码/名称）", flush=True)
    managers = fetch_managers_full()
    rep_codes = sorted({m["rep_code"] for m in managers if m["rep_code"]})
    print(f"    经理总数 {len(managers)}，去重代表产品代码 {len(rep_codes)}", flush=True)

    print("==> 2/3 查 fund_scores 得到类型/规模", flush=True)
    meta = query_fund_meta(rep_codes)

    print("==> 3/3 写出 public/manager_rep.json", flush=True)
    out = {}
    hit = 0
    for m in managers:
        mid = m["id"]
        if not mid:
            continue
        rep = meta.get(m["rep_code"], {})
        out[mid] = {
            "code": m["rep_code"],
            "name": m["rep_name"] or rep.get("name", ""),
            "type": rep.get("type", ""),
            "scale": fmt_scale(rep.get("scale")),
        }
        if rep.get("type") or rep.get("scale"):
            hit += 1
    dest = PUBLIC / "manager_rep.json"
    dest.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    size = dest.stat().st_size
    print(f"    写出 {len(out)} 条，其中含类型/规模 {hit} 条，文件 {size/1024:.1f} KB -> {dest}", flush=True)


if __name__ == "__main__":
    main()
