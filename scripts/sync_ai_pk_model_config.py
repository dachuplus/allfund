#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_ai_pk_model_config.py — 基金组合（原基金 AI 大 PK）模型 API 配置自愈脚本

作用（幂等）：
  仅更新 ai_pk_models 表的 api_provider / api_model / api_key_env 三列，
  不触碰 mode / picks / persona / category_logic 等运行结果，避免覆盖真实选基结果。

背景（2026-10-11 修正）：
  智谱 / MiniMax / Kimi 均经阿里云百炼(DashScope)托管 → api_provider 统一为 "qwen"
  （走 call_qwen 百炼端点）+ 同一把 QWEN_API_KEY，且模型名必须用「原生名」：
    实测 ZHIPU/GLM-5.2       → 200 但 content 为空
    实测 kimi/kimi-k2.5      → 404 does not exist（基金组合 Kimi 失败真因）
    实测 MiniMax/MiniMax-M3  → 200（但曾有 Step2 150s 读超时史）
    原生 glm-5 / kimi-k2.5 / MiniMax-M2.5 → 均 200 且有内容
  ds 走百炼市场名 vanchin/deepseek-v3（实测 200；勿用 deepseek-v3-0324 → 400 Access denied）。

仅在 CI（持有有效 SUPABASE_PAT）中运行；本地无 token 时静默跳过。
"""
import os
import sys
import requests

PAT = os.environ.get("SUPABASE_PAT") or os.environ.get("SUPABASE_MGMT_TOKEN")
if not PAT:
    print("[SKIP] 未检测到 SUPABASE_PAT，跳过基金组合模型配置同步（仅 CI 中执行）。")
    sys.exit(0)

REF = "tqhtegazxykkqfcpejky"
MGMT_URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"
MGMT_HEADERS = {"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"}

# 与 seed_ai_pk.py _API_CONFIG 保持一致的权威配置（provider=qwen 即表示走百炼端点）
_CONFIG = {
    "ds":      {"api_provider": "qwen",      "api_model": "vanchin/deepseek-v3", "api_key_env": "QWEN_API_KEY"},
    "qwen":    {"api_provider": "qwen",      "api_model": "qwen-plus",           "api_key_env": "QWEN_API_KEY"},
    "zhipu":   {"api_provider": "qwen",      "api_model": "glm-5",               "api_key_env": "QWEN_API_KEY"},
    "kimi":    {"api_provider": "qwen",      "api_model": "kimi-k2.5",           "api_key_env": "QWEN_API_KEY"},
    "minimax": {"api_provider": "qwen",      "api_model": "MiniMax-M2.5",        "api_key_env": "QWEN_API_KEY"},
    "wenxin":  {"api_provider": "wenxin",    "api_model": "ernie-5.1",           "api_key_env": "WENXIN_API_KEY"},
    "doubao":  {"api_provider": "volc-ark",  "api_model": "ep-20260712083200-pjvq9", "api_key_env": "ARK_API_KEY"},
}


def mgmt_query(sql, expect_ok=(200, 201)):
    r = requests.post(MGMT_URL, headers=MGMT_HEADERS, json={"query": sql}, timeout=120)
    if r.status_code not in expect_ok:
        print(f"[MGMT ERR] {r.status_code}: {r.text[:400]}")
        raise SystemExit(1)
    return r


def main():
    print("[CONFIG-SYNC] 对齐 ai_pk_models 的 api_provider/api_model/api_key_env ...")
    for mid, cfg in _CONFIG.items():
        p = cfg["api_provider"].replace("'", "''")
        m = cfg["api_model"].replace("'", "''")
        k = cfg["api_key_env"].replace("'", "''")
        sql = (
            f"UPDATE public.ai_pk_models SET api_provider='{p}', api_model='{m}', api_key_env='{k}' "
            f"WHERE id='{mid}';"
        )
        mgmt_query(sql)
        print(f"  [OK] {mid}: provider={cfg['api_provider']} model={cfg['api_model']} key_env={cfg['api_key_env']}")
    rows = mgmt_query(
        "SELECT id,api_provider,api_model,api_key_env FROM public.ai_pk_models "
        "WHERE id IN ('ds','qwen','zhipu','kimi','minimax','wenxin','doubao') ORDER BY id;"
    )
    for row in (rows.json() if rows.status_code == 200 else []):
        print(f"   VERIFY {row.get('id')}: {row.get('api_provider')}/{row.get('api_model')}/{row.get('api_key_env')}")
    print("[CONFIG-SYNC] 完成")


if __name__ == "__main__":
    main()
