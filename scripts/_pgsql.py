#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pgsql.py — 通过 Supabase Management API 执行 SQL 的小工具（沙箱用，绕过直连 SSL 问题）

用法:
  python3 pgsql.py "SELECT 1"
  python3 pgsql.py --file script.sql
环境变量: SUPABASE_PAT
"""
import os
import sys
import json
import subprocess

PAT = os.environ.get("SUPABASE_PAT")
if not PAT:
    raise SystemExit("缺少 SUPABASE_PAT")
REF = "tqhtegazxykkqfcpejky"
MGMT_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def pg(sql, timeout=600):
    # 服务端兜底超时：客户端超时只是不再等结果，服务端查询可能继续占住连接池/IO。
    # 固定 660s（11min），与当前 Management API 会话实测默认值一致，不放宽长查询上限。
    sql = f"SET statement_timeout = '660s'; {sql}"
    payload = json.dumps({"query": sql})
    r = subprocess.run(
        ["curl", "-s", "--max-time", str(timeout), "-X", "POST", MGMT_API,
         "-H", f"Authorization: Bearer {PAT}",
         "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True, text=True, timeout=timeout + 30)
    if r.returncode != 0:
        raise RuntimeError(f"curl fail: {r.stderr[:200]}")
    t = r.stdout.strip()
    if not t:
        return []
    try:
        resp = json.loads(t)
    except json.JSONDecodeError:
        raise RuntimeError(f"非JSON响应: {t[:300]}")
    if isinstance(resp, dict) and resp.get("message"):
        raise RuntimeError(resp["message"][:500])
    return resp


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--file":
        sql = open(args[1], encoding="utf-8").read()
    else:
        sql = " ".join(args)
    try:
        out = pg(sql)
        # ⚠️ 曾经这里写的是 json.dumps(...)[:8000] 做「防爆屏截断」，
        # 结果被误当成「Management API 响应上限 8000 字符」，导致上层脚本
        # 白白设计了「必须 SQL 端聚合、不能拉明细回本地」的复杂绕道。
        # 实测（2026-10-08）：一次查 stock_scores 全部 9057 行返回 1.95 MB，
        # HTTP 201，JSON 完整可解析 —— **API 侧没有任何 8000 字符限制**。
        # 故去掉切片；真要防爆屏，请用 --raw 输出到文件而不是截断 stdout。
        print(json.dumps(out, ensure_ascii=False, indent=2))
    except Exception as e:
        print("ERROR:", e)
        sys.exit(1)
