#!/bin/bash
# ============================================================
# 靠谱指数每日自动更新脚本（含全量主列表对账补录）
# 0. 全量主列表差集对账 + 补录新基金（reconcile_fund_universe）—— 修复「只重算不补新」
# 0b. 补充基金基本信息（经理/规模/费率，fetch_fund_basic_info）
# 0c. 重建经理代表产品映射（build_manager_rep，使新基金在经理图鉴可解析）
# 1. 重新计算各周期靠谱分 (k0w-k5)
# 2. 计算 k_all 综合分 + score_grade
# 3. 更新 fund_scores_meta
# 4. 写日志到 logs/ 目录
# ============================================================
set -e

PROJECT_DIR="$HOME/WorkBuddy/20260405093252/allfund"
cd "$PROJECT_DIR"

# 创建日志目录
mkdir -p logs

LOG_FILE="logs/daily_update_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========================================"
echo "靠谱指数 Supabase 每日更新（含主列表对账）"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# 加载环境变量
if [ -f .env.local ]; then
  export SUPABASE_MGMT_TOKEN=$(grep SUPABASE_PAT .env.local | cut -d'=' -f2)
  export SUPABASE_PAT=$SUPABASE_MGMT_TOKEN
  echo "SUPABASE_MGMT_TOKEN: ${SUPABASE_MGMT_TOKEN:0:10}..."
else
  echo "ERROR: .env.local not found"
  exit 1
fi

# Python 环境
PYTHON=$HOME/.workbuddy/binaries/python/envs/default/bin/python
if [ ! -f "$PYTHON" ]; then
  echo "Python venv not found, creating..."
  $HOME/.workbuddy/binaries/python/versions/3.13.12/bin/python3 -m venv $HOME/.workbuddy/binaries/python/envs/default
  $HOME/.workbuddy/binaries/python/envs/default/bin/pip install requests -q
fi

# ============================================================
echo ""
echo "[Step 0] 全量主列表对账 + 补录新基金（reconcile_fund_universe）"
echo "========================================"
# 差集补录骨架（幂等），并顺带充实缺明细的行（--limit 控制单次抓取量，0=不限）
$PYTHON scripts/reconcile_fund_universe.py --enrich --limit 0

# ============================================================
echo ""
echo "[Step 0b] 补充基金基本信息（经理/规模/费率，fetch_fund_basic_info）"
echo "========================================"
$PYTHON scripts/fetch_fund_basic_info.py

# ============================================================
echo ""
echo "[Step 0c] 重建经理代表产品映射（build_manager_rep）"
echo "========================================"
$PYTHON scripts/build_manager_rep.py

# ============================================================
echo ""
echo "[Step 1/3] 重新计算各周期靠谱分 (k0w-k5)..."
echo "========================================"
$PYTHON scripts/recalc_all_scores.py

echo ""
echo "[Step 2/3] 计算 k_all 综合分 + score_grade..."
echo "========================================"
$PYTHON scripts/compute_k_all.py

echo ""
echo "========================================"
echo "更新完成: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
