<template>
  <div class="dtip-panel">
    <!-- ============ 1. 规则说明 ============ -->
    <div class="card">
      <div class="card-title">定投助手<span class="card-subtitle">估值分位策略定投 · 周度自动执行</span></div>
      <p class="card-desc">
        系统依据指数 PE（TTM）相对其发布以来全部历史的百分位，在每周一自动判定估值区间并执行定投：估值分位越低，定投金额越高；分位越高，定投金额越低；分位进入极高区间时自动卖出。估值分位口径取自中证指数有限公司官方数据，历史成交价取自公开行情。
      </p>
      <div class="table-wrap">
        <table class="data-table rule-table">
          <thead>
            <tr>
              <th>估值区间</th>
              <th>PE 历史分位</th>
              <th>每周操作</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in ZONES" :key="z.key">
              <td><span class="tag" :class="z.tagClass">{{ z.label }}</span></td>
              <td>{{ z.rangeText }}</td>
              <td>{{ z.sideText }}</td>
              <td>{{ z.amountText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="data-source">数据来源：中证指数有限公司（官方 PE / 历史分位）· 新浪财经 / 东方财富（历史行情）。回测为策略历史模拟演示，非真实交易，不构成投资建议。</p>
    </div>

    <!-- ============ 2. 指数估值看板（实时）============ -->
    <div class="card">
      <div class="card-title">
        指数估值分位
        <span class="card-subtitle">中证指数官方 PE · 每30分钟更新</span>
        <button class="refresh-btn" type="button" :disabled="loadingEva" @click="loadEva">{{ loadingEva ? '加载中…' : '刷新' }}</button>
      </div>
      <div class="error-card" v-if="evaError">
        <p>估值数据加载失败：{{ evaError }}</p>
        <p class="err-hint">提示：/api/csi-pe 为 EdgeOne 边缘函数，建议在线上环境查看；本地调试可直连中证指数官网核对。</p>
      </div>
      <p class="val-loading" v-else-if="loadingEva">估值数据加载中…</p>
      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>指数</th>
              <th class="num">PE(TTM)</th>
              <th class="num">全史分位</th>
              <th class="num">近5年分位</th>
              <th class="num">近3年分位</th>
              <th>估值区间</th>
              <th class="num">本周计划金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="idx in DCA_INDICES" :key="idx.code" :class="{ 'row-active': idx.code === activeCode }" @click="activeCode = idx.code">
              <td>{{ idx.name }}</td>
              <td class="num">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pe, 2) }}</td>
              <td class="num" :class="pctClass(evaByCode[idx.code] && evaByCode[idx.code].pct_all)">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_all, 2) }}%</td>
              <td class="num" :class="pctClass(evaByCode[idx.code] && evaByCode[idx.code].pct_5y)">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_5y, 2) }}%</td>
              <td class="num" :class="pctClass(evaByCode[idx.code] && evaByCode[idx.code].pct_3y)">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_3y, 2) }}%</td>
              <td><span class="tag" :class="zoneOf(idx.code).tagClass">{{ zoneOf(idx.code).label }}</span></td>
              <td class="num">{{ zoneOf(idx.code).amountText }}</td>
            </tr>
          </tbody>
        </table>
        <p class="data-source" v-if="evaDate">估值数据日期：{{ evaDate }}（样本区间为指数发布以来；中证A500、中证2000 等新指数历史较短，分位按发布以来计算）</p>
      </div>
    </div>

    <!-- ============ 3. 指数选择 ============ -->
    <div class="dtip-tabs">
      <button
        v-for="idx in DCA_INDICES"
        :key="idx.code"
        type="button"
        class="dtip-tab"
        :class="{ active: idx.code === activeCode }"
        @click="activeCode = idx.code"
      >{{ idx.name }}</button>
    </div>

    <!-- ============ 4. 本周自动定投计划 ============ -->
    <div class="card">
      <div class="card-title">
        本周自动定投计划
        <span class="card-subtitle">{{ activeName }} · 系统将于本周一按以下方案自动执行</span>
      </div>
      <div class="zone-banner" :class="curZone.tagClass === 'tag-green' ? 'is-cheap' : curZone.tagClass === 'tag-red' ? 'is-expensive' : 'is-neutral'">
        <div class="zone-main">
          <span class="zone-label">当前估值区间</span>
          <span class="tag" :class="curZone.tagClass">{{ curZone.label }}</span>
          <span class="zone-amount">本周操作：{{ curZone.actionText }}</span>
        </div>
        <div class="zone-sub" v-if="curEva">
          PE(TTM) {{ fmt(curEva.pe, 2) }} · 全史分位 {{ fmt(curEva.pct_all, 2) }}% · 近5年 {{ fmt(curEva.pct_5y, 2) }}%
        </div>
        <div class="zone-sub" v-else>估值数据加载中或暂无</div>
      </div>
      <p class="plan-note">说明：以上为「本周计划」演示。服务端自动定投（Part 2）将按相同规则在每周一开盘前判定并执行，定投记录可在「定投效果」中查看。</p>
    </div>

    <!-- ============ 5. 自动定投回测（策略历史模拟）============ -->
    <div class="card">
      <div class="card-title">
        自动定投回测 · 策略效果模拟
        <span class="card-subtitle">过去 {{ btWeeks }} 周每周一按估值分位定投 · 数据源边缘函数实时计算</span>
        <button class="refresh-btn" type="button" :disabled="loadingBt" @click="loadBacktest">{{ loadingBt ? '计算中…' : '重新计算' }}</button>
      </div>

      <div class="error-card" v-if="btError">
        <p>回测数据加载失败：{{ btError }}</p>
        <p class="err-hint">提示：/api/dtip-backtest 为 EdgeOne 边缘函数，依赖中证官方与公开行情，建议在线上环境查看。</p>
      </div>
      <p class="val-loading" v-else-if="loadingBt">回测计算中（拉取 PE 全史与历史行情，约数秒）…</p>
      <div v-else-if="btData">
        <!-- 组合汇总 -->
        <div class="stat-grid" v-if="btData.summary">
          <div class="stat-cell">
            <div class="stat-label">组合累计净投入</div>
            <div class="stat-value">{{ fmt(btData.summary.netInvested, 0) }} 元</div>
            <div class="stat-sub">已买入 {{ fmt(btData.summary.totalInvested, 0) }} / 已赎回 {{ fmt(btData.summary.totalWithdrawn, 0) }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合当前市值</div>
            <div class="stat-value">{{ fmt(btData.summary.marketValue, 0) }} 元</div>
            <div class="stat-sub">覆盖 {{ btData.summary.indices }} 个指数</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合累计收益</div>
            <div class="stat-value" :class="btData.summary.totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(btData.summary.totalProfit, 0) }} 元</div>
            <div class="stat-sub" :class="btData.summary.profitPct != null ? (btData.summary.profitPct >= 0 ? 'text-up' : 'text-down') : ''">
              收益率 {{ btData.summary.profitPct != null ? fmt(btData.summary.profitPct * 100, 2) + '%' : '--' }}
            </div>
          </div>
        </div>

        <!-- 各指数回测结果表 -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>指数</th>
                <th class="num">回测周数</th>
                <th class="num">净投入</th>
                <th class="num">当前市值</th>
                <th class="num">累计收益</th>
                <th class="num">收益率</th>
                <th class="num">XIRR</th>
                <th>行情源</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="idx in DCA_INDICES" :key="idx.code" :class="{ 'row-active': idx.code === activeCode }" @click="activeCode = idx.code">
                <td>{{ idx.name }}</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok">{{ btByCode[idx.code].weeksActual }}</td>
                <td class="num" v-else colspan="1">--</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok">{{ fmt(btByCode[idx.code].netInvested, 0) }}</td>
                <td class="num" v-else>--</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok">{{ fmt(btByCode[idx.code].marketValue, 0) }}</td>
                <td class="num" v-else>--</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok" :class="btByCode[idx.code].totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(btByCode[idx.code].totalProfit, 0) }}</td>
                <td class="num" v-else>--</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok" :class="btByCode[idx.code].profitPct != null ? (btByCode[idx.code].profitPct >= 0 ? 'text-up' : 'text-down') : ''">{{ btByCode[idx.code].profitPct != null ? fmt(btByCode[idx.code].profitPct * 100, 2) + '%' : '--' }}</td>
                <td class="num" v-else>--</td>
                <td class="num" v-if="btByCode[idx.code] && btByCode[idx.code].ok" :class="(btByCode[idx.code].irr ?? 0) >= 0 ? 'text-up' : 'text-down'">{{ btByCode[idx.code].irr != null ? fmt(btByCode[idx.code].irr * 100, 2) + '%' : '--' }}</td>
                <td class="num" v-else>--</td>
                <td v-if="btByCode[idx.code] && btByCode[idx.code].ok">{{ btByCode[idx.code].closeSource }}</td>
                <td v-else class="text-na">数据暂不可用</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 当前指数交易流水 -->
        <div class="trades-block" v-if="activeBt && activeBt.ok">
          <div class="trades-title">{{ activeName }} · 定投交易流水（共 {{ activeBt.trades.length }} 笔）</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>估值区间</th>
                  <th>操作</th>
                  <th class="num">金额</th>
                  <th class="num">成交价</th>
                  <th class="num">本期份额</th>
                  <th class="num">累计份额</th>
                  <th class="num">累计市值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in activeBt.trades" :key="i">
                  <td>{{ t.date }}</td>
                  <td><span class="tag" :class="zoneTagClass(t.zoneKey)">{{ t.zone }}</span></td>
                  <td><span class="op-tag" :class="t.type === 'buy' ? 'op-buy' : 'op-sell'">{{ t.type === 'buy' ? '买入' : '卖出' }}</span></td>
                  <td class="num" :class="t.amount >= 0 ? 'cash-out' : 'cash-in'">{{ t.amount >= 0 ? '+' : '−' }}{{ fmt(Math.abs(t.amount), 0) }}</td>
                  <td class="num">{{ fmt(t.price, 2) }}</td>
                  <td class="num">{{ fmt(t.sharesAdded, 4) }}</td>
                  <td class="num">{{ fmt(t.sharesAfter, 4) }}</td>
                  <td class="num">{{ fmt(t.valueAfter, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="data-source" v-if="activeBt.startDate">回测区间：{{ activeBt.startDate }} 至 {{ activeBt.endDate }}（每周一）；最新行情日 {{ activeBt.latestDate }}，最新价 {{ fmt(activeBt.priceLast, 2) }}，最新 PE(TTM) {{ fmt(activeBt.peLast, 2) }}（全史分位 {{ fmt(activeBt.pctLast, 2) }}%）。</p>
        </div>
        <div class="empty-note" v-else-if="activeBt && !activeBt.ok">
          《{{ activeName }}》回测数据暂不可用（PE 或历史行情源暂未覆盖），其余指数可正常查看。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCsiPe, fetchDtipBacktest } from '../../utils/api'

// ===== 定投目标指数 =====
const DCA_INDICES = [
  { code: '000510', name: '中证A500' },
  { code: '000300', name: '沪深300' },
  { code: '000905', name: '中证500' },
  { code: '000906', name: '中证800' },
  { code: '000852', name: '中证1000' },
  { code: '932000', name: '中证2000' },
  { code: '000985', name: '中证全指' },
]

// ===== 5 档估值区间 → 每周定投金额 =====
const ZONES = [
  { key: 'deep_low',  label: '极度低估', min: 0,        max: 10,       amount:  3000, side: 'buy',  tagClass: 'tag-green', rangeText: '< 10%',     sideText: '买入', amountText: '+3000 元', actionText: '买入 3000 元' },
  { key: 'low',       label: '低估',   min: 10,       max: 30,       amount:  2000, side: 'buy',  tagClass: 'tag-green', rangeText: '10% ~ 30%', sideText: '买入', amountText: '+2000 元', actionText: '买入 2000 元' },
  { key: 'normal',    label: '估值合理', min: 30,       max: 70,       amount:  1000, side: 'buy',  tagClass: 'tag-blue',  rangeText: '30% ~ 70%', sideText: '买入', amountText: '+1000 元', actionText: '买入 1000 元' },
  { key: 'high',      label: '高估',   min: 70,       max: 90,       amount:   500, side: 'buy',  tagClass: 'tag-red',   rangeText: '70% ~ 90%', sideText: '买入', amountText: '+500 元',  actionText: '买入 500 元' },
  { key: 'deep_high', label: '极度高估', min: 90,       max: Infinity, amount: -3000, side: 'sell', tagClass: 'tag-red',   rangeText: '≥ 90%',     sideText: '卖出', amountText: '−3000 元', actionText: '卖出 3000 元' },
]
const ZONE_TAG = {
  deep_low: 'tag-green', low: 'tag-green', normal: 'tag-blue', high: 'tag-red', deep_high: 'tag-red',
}

const btWeeks = 52

// ===== 状态 =====
const activeCode = ref('000300')
const evaByCode = ref({})
const evaDate = ref('')
const evaError = ref('')
const loadingEva = ref(false)

const btData = ref(null)
const loadingBt = ref(false)
const btError = ref('')

// ===== 工具 =====
function fmt(v, digits = 2) {
  if (v == null || !isFinite(v)) return '--'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
function pctClass(pct) {
  if (pct == null) return ''
  return pct >= 70 ? 'text-up' : pct < 30 ? 'text-down' : ''
}
function zoneTagClass(key) {
  return ZONE_TAG[key] || ''
}

// ===== 数据加载 =====
async function loadEva() {
  loadingEva.value = true
  evaError.value = ''
  try {
    const rows = await fetchCsiPe(DCA_INDICES.map(i => i.code))
    const map = {}
    let date = ''
    for (const r of rows) {
      if (r && r.ok) {
        map[r.code] = r
        if (r.date && r.date > date) date = r.date
      }
    }
    evaByCode.value = map
    evaDate.value = date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : ''
  } catch (e) {
    evaError.value = String(e && e.message || e)
  } finally {
    loadingEva.value = false
  }
}

async function loadBacktest() {
  loadingBt.value = true
  btError.value = ''
  try {
    const res = await fetchDtipBacktest(DCA_INDICES.map(i => i.code), btWeeks)
    btData.value = res
  } catch (e) {
    btError.value = String(e && e.message || e)
  } finally {
    loadingBt.value = false
  }
}

// ===== 计算属性 =====
const activeName = computed(() => (DCA_INDICES.find(i => i.code === activeCode.value) || {}).name || '')
const curEva = computed(() => evaByCode.value[activeCode.value] || null)

function zoneOf(code) {
  const eva = evaByCode.value[code]
  const pct = eva && eva.pct_all
  if (pct == null) return { key: 'unknown', label: '数据缺失', tagClass: '', amountText: '--', sideText: '--', amount: 0, actionText: '--' }
  for (const z of ZONES) {
    if (pct >= z.min && pct < z.max) return z
  }
  return ZONES[ZONES.length - 1]
}
const curZone = computed(() => zoneOf(activeCode.value))

const btByCode = computed(() => {
  const map = {}
  if (btData.value && btData.value.data) {
    for (const r of btData.value.data) map[r.code] = r
  }
  return map
})
const activeBt = computed(() => btByCode.value[activeCode.value] || null)

onMounted(() => {
  loadEva()
  loadBacktest()
})
</script>

<style scoped>
.dtip-panel { width: 100%; }

/* 规则表 */
.rule-table th, .rule-table td { text-align: left; }
.rule-table td:first-child { white-space: nowrap; }

/* 刷新按钮 */
.refresh-btn {
  appearance: none; -webkit-appearance: none;
  margin-left: auto;
  background: #ffffff;
  border: 2px solid var(--brand);
  color: var(--brand);
  font-size: 14px; font-weight: 700;
  padding: 4px 14px;
  cursor: pointer;
  font-family: inherit;
}
.refresh-btn:hover { background: #f0f6fb; }
.refresh-btn:disabled { opacity: 0.5; cursor: default; }

/* 估值表 */
.val-loading { padding: 24px 0; color: var(--text-secondary); }
.row-active { background: #f0f6fb; }
.row-active td { font-weight: 700; }
.tag { white-space: nowrap; }

/* 数据表（DtipPanel 独立组件，需自包含） */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th {
  text-align: left;
  padding: var(--space-sm);
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
  font-weight: 700;
  white-space: nowrap;
}
.data-table td {
  padding: var(--space-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  vertical-align: middle;
}
.data-table th.num, .data-table td.num { text-align: right; }
.text-na { color: var(--text-secondary); }

/* 指数 tabs */
.dtip-tabs {
  display: flex; align-items: stretch; flex-wrap: wrap;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  margin-bottom: var(--space-md);
}
.dtip-tab {
  appearance: none; -webkit-appearance: none;
  background: transparent; border: none;
  border-bottom: 3px solid transparent;
  padding: 12px 18px;
  font-size: 16px; line-height: 1.4;
  color: var(--text-secondary);
  cursor: pointer; font-family: inherit;
}
.dtip-tab:hover { color: var(--text-primary); }
.dtip-tab.active { color: #1d70b8; border-bottom-color: #1d70b8; font-weight: 700; }
@media (max-width: 640px) {
  .dtip-tabs { padding: 0 12px; }
  .dtip-tab { padding: 10px 12px; font-size: 15px; }
}

/* 本周计划横幅 */
.zone-banner {
  border: 1px solid var(--border);
  border-left: 5px solid var(--border);
  padding: 14px 16px;
  margin-bottom: var(--space-md);
  background: var(--bg-card);
}
.zone-banner.is-cheap { border-left-color: var(--color-down); }
.zone-banner.is-expensive { border-left-color: var(--color-up); }
.zone-banner.is-neutral { border-left-color: var(--brand); }
.zone-main { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.zone-label { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.zone-amount { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.zone-sub { margin-top: 8px; font-size: 14px; color: var(--text-secondary); }
.plan-note { margin-top: 12px; font-size: 13px; color: var(--text-secondary); }

/* 回测汇总卡 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: var(--space-md);
}
.stat-cell {
  border: 1px solid var(--border);
  background: #f8f8f8;
  padding: 14px 16px;
}
.stat-label { font-size: 14px; color: var(--text-secondary); font-weight: 700; }
.stat-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
.stat-sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: 1fr; } }

/* 交易流水 */
.trades-block { margin-top: var(--space-md); }
.trades-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.op-tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--border);
}
.op-buy { color: var(--brand); border-color: var(--brand); }
.op-sell { color: var(--color-up); border-color: var(--color-up); }
/* 现金流出（买入，钱出去）= 红；现金流入（卖出，钱回来）= 绿 */
.cash-out { color: var(--color-up); }
.cash-in { color: var(--color-down); }
.empty-note { margin-top: 12px; padding: 16px; border: 1px dashed var(--border); color: var(--text-secondary); font-size: 14px; }
</style>
