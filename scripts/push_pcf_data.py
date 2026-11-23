#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 PCF JSON 推送到独立数据分支 pcf-data（不碰 main，避开 push_files_explicit 对账）。

目标路径（pcf-data 分支）：
  pcf/<YYYY-MM-DD>.json   按日存档
  pcf/latest.json         最新一份（前端 CDN 常读这个，避免猜日期）

前端读取：https://cdn.jsdelivr.net/gh/dachuplus/allfund@pcf-data/pcf/latest.json
（jsDelivr 对 GitHub 分支文件约 5 分钟缓存；前端带 ?t= 时间戳破缓存）

用法：
  python3 scripts/push_pcf_data.py --src /tmp/pcf_all.json
  python3 scripts/push_pcf_data.py --src /tmp/pcf_all.json --date 2026-11-23
  GITHUB_TOKEN=<pat> python3 scripts/push_pcf_data.py ...   # CI 用环境变量
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
BRANCH = "pcf-data"


def load_token():
    t = os.environ.get("GITHUB_TOKEN", "").strip()
    if t:
        return t
    env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    for line in open(env, encoding="utf-8"):
        if line.strip().startswith("GITHUB_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


TOKEN = load_token()
if not TOKEN:
    sys.exit("缺少 GITHUB_TOKEN")
H = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github.v3+json",
     "Content-Type": "application/json", "User-Agent": "pcf-push"}


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
    ap.add_argument("--src", required=True, help="本地 PCF JSON 路径")
    ap.add_argument("--date", default="", help="日期 YYYY-MM-DD（默认读 JSON 里的 date）")
    args = ap.parse_args()

    raw = open(args.src, "rb").read()
    payload = json.loads(raw.decode("utf-8"))
    date = args.date or payload.get("date")
    if not date:
        sys.exit("无法确定日期，请用 --date 指定")
    # 校验：至少有基金数据
    if not payload.get("count"):
        sys.exit("JSON 无基金数据，拒绝推送")
    # 规范化写入：确保 date 字段一致
    payload["date"] = date
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    daily = f"pcf/{date}.json"
    sh1 = put_file(daily, content, f"PCF {date} ({payload['count']} 只主动ETF)")
    sh2 = put_file("pcf/latest.json", content, f"PCF latest -> {date}")
    print(f"推送完成: {daily} sha={sh1[:12]}, latest.json sha={sh2[:12]}")
    print(f"CDN: https://cdn.jsdelivr.net/gh/{OWNER}/{REPO}@{BRANCH}/pcf/latest.json")


if __name__ == "__main__":
    main()
