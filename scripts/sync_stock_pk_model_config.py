#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_stock_pk_model_config.py — 股票组合 PK 模型 API 配置自愈脚本

作用（幂等）：
  仅更新 stock_pk_models 的 api_provider / api_model / api_key_env 三列，
  不触碰 mode / picks / persona / category_logic 等运行结果，避免覆盖真实选股结果。

背景（2026-10-10 修正）：
  智谱 / MiniMax / Kimi 均经阿里云百炼(DashScope)托管，走百炼兼容端点 + 同一把 QWEN_API_KEY。
  DeepSeek 走官方 api.deepseek.com + DEEPSEEK_API_KEY（百炼侧未开通该服务，实测 400 Access denied）。
  原代码路由混乱导致这些模型真实选股失败。本脚本把 DB 中的 api_provider/model/key_env 对齐到正确路由，
  由 run_stock_pk_monthly.py 在每次真实选股前调用，保证配置自修复、不依赖人工改库。

仅在 CI（持有有效 SUPABASE_PAT）中运行；本地无 token 时静默跳过。
"""
import os
import sys
import requests

PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
if not PAT:
    print("[SKIP] 未检测到 SUPABASE_PAT，跳过模型配置同步（仅 CI 中执行）。")
    sys.exit(0)

REF = "tqhtegazxykkqfcpejky"
MGMT_URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
MGMT_HEADERS = {"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"}

# 与 seed_stock_pk.py _API_CONFIG 保持一致的权威配置
# 智谱/MiniMax/Kimi 经百炼(DashScope)托管 → 统一 QWEN_API_KEY；
# DeepSeek 走官方 api.deepseek.com → DEEPSEEK_API_KEY（百炼侧未开通 DeepSeek 服务，实测 400）。
_CONFIG = {
    "ds":      {"api_provider": "deepseek", "api_model": "deepseek-chat", "api_key_env": "DEEPSEEK_API_KEY"},
    "zhipu":   {"api_provider": "zhipu",    "api_model": "glm-5",            "api_key_env": "QWEN_API_KEY"},
    "minimax": {"api_provider": "minimax",  "api_model": "MiniMax-M2.5",     "api_key_env": "QWEN_API_KEY"},
    "kimi":    {"api_provider": "kimi",     "api_model": "kimi-k2.5",        "api_key_env": "QWEN_API_KEY"},
    "qwen":    {"api_provider": "qwen",     "api_model": "qwen-plus",        "api_key_env": "QWEN_API_KEY"},
    "wenxin":  {"api_provider": "wenxin",   "api_model": "ernie-5.1",        "api_key_env": "WENXIN_API_KEY"},
    "doubao":  {"api_provider": "volc-ark", "api_model": "ep-20260712083200-pjvq9", "api_key_env": "ARK_API_KEY"},
}


def mgmt_query(sql, expect_ok=(200, 201)):
    r = requests.post(MGMT_URL, headers=MGMT_HEADERS, json={"query": sql}, timeout=120)
    if r.status_code not in expect_ok:
        print(f"[MGMT ERR] {r.status_code}: {r.text[:400]}")
        raise SystemExit(1)
    return r


def main():
    print("[CONFIG-SYNC] 对齐 stock_pk_models 的 api_provider/api_model/api_key_env 到百炼路由 ...")
    for mid, cfg in _CONFIG.items():
        p = cfg["api_provider"].replace("'", "''")
        m = cfg["api_model"].replace("'", "''")
        k = cfg["api_key_env"].replace("'", "''")
        sql = (
            f"UPDATE public.stock_pk_models SET api_provider='{p}', api_model='{m}', api_key_env='{k}' "
            f"WHERE id='{mid}';"
        )
        mgmt_query(sql)
        print(f"  [OK] {mid}: provider={cfg['api_provider']} model={cfg['api_model']} key_env={cfg['api_key_env']}")
    # 复查
    rows = mgmt_query(
        "SELECT id,api_provider,api_model,api_key_env FROM public.stock_pk_models "
        "WHERE id IN ('ds','zhipu','minimax','kimi','qwen','wenxin','doubao') ORDER BY id;"
    )
    for row in (rows.json() if rows.status_code == 200 else []):
        print(f"   VERIFY {row.get('id')}: {row.get('api_provider')}/{row.get('api_model')}/{row.get('api_key_env')}")
    print("[CONFIG-SYNC] 完成")


if __name__ == "__main__":
    main()
