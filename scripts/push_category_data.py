#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把分类静态清单推送到独立数据分支 category-data（不碰 main，避开字节一致对账）。

目标路径（category-data 分支）：
  fund-categories.json   前端优先读这份（同源代理 / jsDelivr / raw）

前端读取顺序：同源代理 /api/category-data → jsDelivr CDN → raw CDN → 本地 public 基线 → RPC。
jsDelivr 对分支文件约 5 分钟缓存；同源代理服务端直连 raw 且有 5 分钟缓存，国内更稳。

用法：
  python3 scripts/push_category_data.py --src public/fund-categories.json
  GITHUB_TOKEN=<pat> python3 scripts/push_category_data.py --src public/fund-categories.json
"""
import argparse
import base64
import json
import os
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = "https://api.github.com"
OWNER = "dachuplus"
REPO = "allfund"
BRANCH = "category-data"
TARGET = "fund-categories.json"


def load_token():
    t = os.environ.get("GITHUB_TOKEN", "").strip()
    if t:
        return t
    env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            if line.strip().startswith("GITHUB_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


TOKEN = load_token()
if not TOKEN:
    sys.exit("缺少 GITHUB_TOKEN")
H = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github.v3+json",
     "Content-Type": "application/json", "User-Agent": "allfund-category-push"}


def api(method, path, body=None, retries=4):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = Request(f"{API}{path}", data=data, headers=H, method=method)
    for i in range(retries):
        try:
            with urlopen(req, timeout=60) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else None
        except HTTPError as e:
            if e.code in (400, 502, 503, 504) and i < retries - 1:
                time.sleep(1.5 * (i + 1)); continue
            raise
        except Exception:
            if i < retries - 1:
                time.sleep(1.5 * (i + 1)); continue
            raise


def put_file(path, content_bytes, message):
    """用 Contents API 写文件（存在则更新，需 sha）。"""
    b64 = base64.b64encode(content_bytes).decode()
    try:
        cur = api("GET", f"/repos/{OWNER}/{REPO}/contents/{path}?ref={BRANCH}")
        sha = cur.get("sha")
    except HTTPError as e:
        if e.code == 404:
            sha = None
        else:
            raise
    body = {"message": message, "content": b64, "branch": BRANCH}
    if sha:
        body["sha"] = sha
    r = api("PUT", f"/repos/{OWNER}/{REPO}/contents/{path}", body)
    return r.get("content", {}).get("sha", "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="本地分类 JSON 路径")
    args = ap.parse_args()

    raw = open(args.src, "rb").read()
    payload = json.loads(raw.decode("utf-8"))
    # 推送前校验：结构与计数完整性，避免脏数据上 CDN
    if not isinstance(payload.get("t0"), list) or len(payload["t0"]) < 5:
        sys.exit("校验失败：一级分类不足 5 类，拒绝推送")
    if not isinstance(payload.get("t1"), list) or len(payload["t1"]) < 30:
        sys.exit("校验失败：二级分类不足 30 项，拒绝推送")
    total = int(payload.get("total") or 0)
    if total < 1000:
        sys.exit("校验失败：total 异常，拒绝推送")
    if sum(int(x.get("cnt") or 0) for x in payload["t0"]) != total:
        sys.exit("校验失败：一级计数和 != total，拒绝推送")

    sha = put_file(TARGET, raw, f"分类静态清单 {payload.get('generated_at', '')} ({total} 只)")
    print(f"推送完成: {BRANCH}/{TARGET} sha={sha[:12]}")
    print(f"CDN: https://cdn.jsdelivr.net/gh/{OWNER}/{REPO}@{BRANCH}/{TARGET}")


if __name__ == "__main__":
    main()
