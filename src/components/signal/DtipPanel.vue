<template>
  <div class="dtip-panel">
    <!-- ============ 1. 规则说明 ============ -->
    <div class="card">
      <div class="card-title">定投助手<span class="card-subtitle">估值分位策略定投 · 周度跟踪</span></div>
      <p class="card-desc">
        依据指数 PE（TTM）相对其发布以来全部历史的百分位确定每周定投金额：估值分位越低，定投金额越高；分位越高，定投金额越低；分位进入极高区间时执行卖出。估值分位口径取自中证指数有限公司官方数据。
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
      <p class="data-source">数据来源：中证指数有限公司（官方 PE / 历史分位）· 东方财富（实时行情）。以上内容仅供研究参考，不构成任何投资建议。</p>
    </div>

    <!-- ============ 2. 指数估值看板 ============ -->
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
              <th class="num">建议周定投金额</th>
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

    <!-- ============ 4. 当前区间 + 记录表单 ============ -->
    <div class="card">
      <div class="card-title">
        记录每周定投
        <span class="card-subtitle">{{ activeName }} · 成交价与金额已按当前估值区间自动带入，可手动修改</span>
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

      <div class="dtip-form">
        <label class="fld">
          <span class="fld-label">日期</span>
          <input type="date" v-model="form.date" class="fld-input" />
        </label>
        <label class="fld">
          <span class="fld-label">成交价（指数点位）</span>
          <input type="number" step="0.0001" min="0" v-model.number="form.price" class="fld-input" />
          <span class="fld-hint" v-if="curQuote">当前收盘 {{ fmt(curQuote.price, 2) }}</span>
        </label>
        <label class="fld">
          <span class="fld-label">金额（元，买入为正 / 卖出为负）</span>
          <input type="number" step="100" v-model.number="form.amount" class="fld-input" />
          <span class="fld-hint">{{ curZone.actionText }}</span>
        </label>
        <button type="button" class="submit-btn" :disabled="!canSubmit" @click="submitRecord">记录</button>
      </div>
      <p class="form-err" v-if="formErr">{{ formErr }}</p>
    </div>

    <!-- ============ 5. 定投记录 ============ -->
    <div class="card">
      <div class="card-title">
        定投记录
        <span class="card-subtitle">{{ activeName }} · 共 {{ sortedRecords.length }} 笔 · 数据仅保存在本地浏览器</span>
        <button v-if="sortedRecords.length" class="refresh-btn danger" type="button" @click="clearRecords">{{ clearArmed ? '再次点击确认清空' : '清空记录' }}</button>
      </div>
      <p class="val-loading" v-if="!sortedRecords.length">暂无记录。在上方表单记录第一笔每周定投。</p>
      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th class="num">成交价</th>
              <th class="num">金额</th>
              <th class="num">份额</th>
              <th class="num">该笔当前市值</th>
              <th class="num">该笔收益</th>
              <th class="num">该笔收益率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in recordRows" :key="i">
              <td>{{ r.d }}</td>
              <td class="num">{{ fmt(r.p, 2) }}</td>
              <td class="num" :class="r.a >= 0 ? 'text-up' : 'text-down'">{{ fmt(r.a, 0) }}</td>
              <td class="num">{{ fmt(r.shares, 4) }}</td>
              <td class="num">{{ fmt(r.mv, 2) }}</td>
              <td class="num" :class="r.profit >= 0 ? 'text-up' : 'text-down'">{{ fmt(r.profit, 2) }}</td>
              <td class="num" :class="r.profit >= 0 ? 'text-up' : 'text-down'">{{ fmt(r.rate * 100, 2) }}%</td>
              <td><button type="button" class="del-btn" @click="removeRecord(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 6. 收益统计 ============ -->
    <div class="card" v-if="sortedRecords.length">
      <div class="card-title">收益统计<span class="card-subtitle">{{ activeName }} · 基于定投记录与最新收盘价计算</span></div>

      <div class="stat-grid">
        <div class="stat-cell">
          <div class="stat-label">账户收益</div>
          <div class="stat-value" :class="stats.totalProfit >= 0 ? 'text-up' : 'text-down'">
            {{ fmt(stats.totalProfit, 2) }} 元
          </div>
          <div class="stat-sub" :class="stats.totalReturn != null ? (stats.totalReturn >= 0 ? 'text-up' : 'text-down') : ''">
            收益率 {{ stats.totalReturn != null ? fmt(stats.totalReturn * 100, 2) + '%' : '--' }}
          </div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">总收益（年化）</div>
          <div class="stat-value" :class="(stats.totalAnn ?? 0) >= 0 ? 'text-up' : 'text-down'">
            {{ stats.totalAnn != null ? fmt(stats.totalAnn * 100, 2) + '%' : '--' }}
          </div>
          <div class="stat-sub">持有 {{ stats.days }} 天<span v-if="stats.days < 90"> · 满 90 天展示年化</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">时间加权收益率（年化）</div>
          <div class="stat-value" :class="(stats.twrAnn ?? 0) >= 0 ? 'text-up' : 'text-down'">
            {{ stats.twrAnn != null ? fmt(stats.twrAnn * 100, 2) + '%' : '--' }}
          </div>
          <div class="stat-sub">剔除资金申赎时点影响 · 区间收益 {{ fmt(stats.twrTotal * 100, 2) }}%<span v-if="stats.days < 90"> · 满 90 天展示年化</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">资金加权收益率（年化）</div>
          <div class="stat-value" :class="(stats.mwrAnn ?? 0) >= 0 ? 'text-up' : 'text-down'">
            {{ stats.mwrAnn != null ? fmt(stats.mwrAnn * 100, 2) + '%' : '--' }}
          </div>
          <div class="stat-sub">按资金实际占用时间加权<span v-if="stats.days < 90"> · 满 90 天展示年化</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">内部收益率 IRR（年化）</div>
          <div class="stat-value" :class="(stats.irr ?? 0) >= 0 ? 'text-up' : 'text-down'">
            {{ stats.irr != null ? fmt(stats.irr * 100, 2) + '%' : '--' }}
          </div>
          <div class="stat-sub">现金流内部收益率（XIRR）<span v-if="stats.days < 90"> · 满 90 天展示年化</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">累计定投收益</div>
          <div class="stat-value" :class="stats.sumProfit >= 0 ? 'text-up' : 'text-down'">
            {{ fmt(stats.sumProfit, 2) }} 元
          </div>
          <div class="stat-sub">各笔浮动收益与已实现收益合计</div>
        </div>
      </div>

      <div class="aux-row">
        <span>净投入 <b :class="stats.netInvested >= 0 ? '' : 'text-down'">{{ fmt(stats.netInvested, 2) }}</b> 元</span>
        <span>持有份额 <b>{{ fmt(stats.shares, 4) }}</b></span>
        <span>当前市值 <b>{{ fmt(stats.marketValue, 2) }}</b> 元</span>
        <span>最新价 <b>{{ fmt(stats.curPrice, 2) }}</b></span>
      </div>
      <p class="data-source">口径说明：账户收益 =（当前市值 − 净投入）/ 净投入；时间加权收益率按相邻成交价链式复利；资金加权收益率按资金实际占用时间加权；内部收益率（IRR）以每笔现金流与最新市值求解。定投记录与行情均为本地演示数据，非真实交易。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchCsiPe, fetchIndexCloses } from '../../utils/api'

// ===== 定投目标指数（secid 为东财行情代码；中证2000 市场段为 2，其余沪市指数为 1）=====
// 注：用户原列的「国证3000」经核实不存在（国证官方系列无此指数；399300 为沪深300深市镜像代码），
//     经用户确认以「中证全指 000985」（覆盖全部 A 股的全市场宽基）替代。
const DCA_INDICES = [
  { code: '000510', name: '中证A500', secid: '1.000510' },
  { code: '000300', name: '沪深300',  secid: '1.000300' },
  { code: '000905', name: '中证500',  secid: '1.000905' },
  { code: '000906', name: '中证800',  secid: '1.000906' },
  { code: '000852', name: '中证1000', secid: '1.000852' },
  { code: '932000', name: '中证2000', secid: '2.932000' },
  { code: '000985', name: '中证全指', secid: '1.000985' },
]

// ===== 5 档估值区间 → 每周定投金额（PE 历史分位策略）=====
// 区间命名采用专业估值术语：估值分位越低，定投金额越高；分位进入极高区间执行卖出。
// 标签色：tag-green = 低估（机会）/ tag-blue = 合理（中性）/ tag-red = 高估（风险），与全站信号规范一致。
const ZONES = [
  { key: 'deep_low',  label: '极度低估', min: 0,       max: 10,       amount:  3000, side: 'buy',  tagClass: 'tag-green', rangeText: '< 10%',      sideText: '买入', amountText: '+3000 元', actionText: '买入 3000 元' },
  { key: 'low',       label: '低估',   min: 10,      max: 30,       amount:  2000, side: 'buy',  tagClass: 'tag-green', rangeText: '10% ~ 30%',  sideText: '买入', amountText: '+2000 元', actionText: '买入 2000 元' },
  { key: 'normal',    label: '估值合理', min: 30,      max: 70,       amount:  1000, side: 'buy',  tagClass: 'tag-blue',  rangeText: '30% ~ 70%',  sideText: '买入', amountText: '+1000 元', actionText: '买入 1000 元' },
  { key: 'high',      label: '高估',   min: 70,      max: 90,       amount:   500, side: 'buy',  tagClass: 'tag-red',   rangeText: '70% ~ 90%',  sideText: '买入', amountText: '+500 元',  actionText: '买入 500 元' },
  { key: 'deep_high', label: '极度高估', min: 90,      max: Infinity, amount: -3000, side: 'sell', tagClass: 'tag-red',   rangeText: '≥ 90%',      sideText: '卖出', amountText: '−3000 元', actionText: '卖出 3000 元' },
]

const LS_KEY = 'af_dtip_records_v1'

// 年化指标最少持有天数：短持有期年化会爆炸（如 14 天 +26% 年化后数值荒谬），满 90 天才展示
const ANN_MIN_DAYS = 90

// ===== 状态 =====
const activeCode = ref('000300')
const evaByCode = ref({})
const evaDate = ref('')
const evaError = ref('')
const loadingEva = ref(false)
const quotes = ref({})
const records = ref(loadRecords())
const form = ref({ date: todayStr(), price: null, amount: null })
const formErr = ref('')
const clearArmed = ref(false)

// ===== 工具 =====
function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function fmt(v, digits = 2) {
  if (v == null || !isFinite(v)) return '--'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch (e) { return {} }
}
function saveRecords() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records.value)) } catch (e) { /* 配额溢出时静默 */ }
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

async function loadQuotes() {
  const map = await fetchIndexCloses(DCA_INDICES.map(i => i.secid))
  quotes.value = map
}

// ===== 计算属性 =====
const activeName = computed(() => (DCA_INDICES.find(i => i.code === activeCode.value) || {}).name || '')
const curEva = computed(() => evaByCode.value[activeCode.value] || null)
const curQuote = computed(() => quotes.value[(DCA_INDICES.find(i => i.code === activeCode.value) || {}).secid] || null)

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

const sortedRecords = computed(() => {
  const list = (records.value[activeCode.value] || []).slice()
  list.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  return list
})

const recordRows = computed(() => {
  const curPrice = curQuote.value && curQuote.value.price
  return sortedRecords.value.map(r => {
    const shares = r.p > 0 ? r.a / r.p : 0
    const mv = curPrice ? shares * curPrice : null
    const profit = mv != null ? mv - r.a : null
    const rate = r.a !== 0 && profit != null ? profit / Math.abs(r.a) : null
    return { ...r, shares, mv, profit, rate }
  })
})

const stats = computed(() => {
  const recs = sortedRecords.value
  const curPrice = curQuote.value && curQuote.value.price
  const empty = {
    totalProfit: 0, totalReturn: null, totalAnn: null, twrAnn: null, twrTotal: 0,
    mwrAnn: null, irr: null, sumProfit: 0, netInvested: 0, shares: 0,
    marketValue: 0, curPrice: curPrice || null, days: 0, years: 0,
  }
  if (!recs.length || !curPrice) return empty

  let shares = 0, netInvested = 0, sumProfit = 0
  for (const r of recs) {
    const sh = r.p > 0 ? r.a / r.p : 0
    shares += sh
    netInvested += r.a
    sumProfit += sh * curPrice - r.a
  }
  const marketValue = shares * curPrice
  const totalProfit = marketValue - netInvested
  const totalReturn = netInvested > 0 ? totalProfit / netInvested : null

  const t0 = new Date(recs[0].d + 'T00:00:00')
  const now = new Date()
  const days = Math.max(1, Math.round((now - t0) / 86400000))
  const years = days / 365

  // 时间加权：相邻成交价链式相乘，末段延伸至最新价
  let twrFactor = 1
  for (let i = 0; i < recs.length - 1; i++) {
    if (recs[i].p > 0 && recs[i + 1].p > 0) twrFactor *= recs[i + 1].p / recs[i].p
  }
  const last = recs[recs.length - 1]
  if (last.p > 0) twrFactor *= curPrice / last.p
  const twrTotal = twrFactor - 1
  const twrAnn = days >= ANN_MIN_DAYS ? Math.pow(twrFactor, 1 / years) - 1 : null

  const totalAnn = totalReturn != null && days >= ANN_MIN_DAYS ? Math.pow(1 + totalReturn, 1 / years) - 1 : null

  // 资金加权（基金业协会式）：收益额 / 加权平均资产
  //   买入资金权重 = 停留时间占比；卖出资金权重 = 卖出前停留时间占比
  let avgAsset = 0
  for (const r of recs) {
    const ti = new Date(r.d + 'T00:00:00')
    const wIn = Math.min(1, Math.max(0, (now - ti) / 86400000 / days))
    const wOut = 1 - wIn
    avgAsset += r.a >= 0 ? r.a * wIn : r.a * wOut
  }
  const mwr = avgAsset > 0 ? totalProfit / avgAsset : null
  const mwrAnn = mwr != null && mwr > -1 && days >= ANN_MIN_DAYS ? Math.pow(1 + mwr, 1 / years) - 1 : null

  // IRR（XIRR）：投资者视角现金流（买入为负、卖出为正、末值为正）
  const flows = recs.map(r => ({ t: new Date(r.d + 'T00:00:00'), cf: -r.a }))
  flows.push({ t: now, cf: marketValue })
  const irr = days >= ANN_MIN_DAYS ? solveXirr(flows) : null

  return {
    totalProfit, totalReturn, totalAnn, twrAnn, twrTotal, mwrAnn, irr, sumProfit,
    netInvested, shares, marketValue, curPrice, days, years,
  }
})

function solveXirr(flows) {
  if (flows.length < 2) return null
  const t0 = flows.reduce((m, f) => (f.t < m ? f.t : m), flows[0].t)
  const npv = (r) => flows.reduce((s, f) => {
    const yrs = (f.t - t0) / (365 * 86400000)
    return s + f.cf / Math.pow(1 + r, yrs)
  }, 0)
  let lo = -0.9999, hi = 10
  let fLo = npv(lo), fHi = npv(hi)
  // 高收益场景（短期资金翻倍）IRR 可能远超 1000%，需自适应放大上界
  let guard = 0
  while (fLo * fHi > 0 && guard < 40) {
    hi *= 10
    fHi = npv(hi)
    guard++
  }
  if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return null
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-10) return mid
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid } else { lo = mid; fLo = fMid }
  }
  return (lo + hi) / 2
}

// ===== 表单 =====
function pctClass(pct) {
  if (pct == null) return ''
  return pct >= 70 ? 'text-up' : pct < 30 ? 'text-down' : ''
}

watch([curZone, curQuote], () => {
  // 区间/行情就绪后自动带出金额与价格（用户已手改则不覆盖）
  if (form.value.amount == null || form.value.amount === '') {
    form.value.amount = curZone.value.amount || null
  }
  if ((form.value.price == null || form.value.price === '') && curQuote.value) {
    form.value.price = curQuote.value.price
  }
}, { immediate: true })

watch(activeCode, () => {
  formErr.value = ''
  clearArmed.value = false
  form.value.price = curQuote.value ? curQuote.value.price : null
  form.value.amount = curZone.value.amount || null
})

const canSubmit = computed(() =>
  form.value.date && form.value.price > 0 && form.value.amount != null && form.value.amount !== 0
)

function submitRecord() {
  formErr.value = ''
  const d = String(form.value.date || '').trim()
  const p = Number(form.value.price)
  const a = Number(form.value.amount)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { formErr.value = '请选择有效日期'; return }
  if (!(p > 0)) { formErr.value = '成交价必须大于 0'; return }
  if (!a) { formErr.value = '金额不能为 0（买入为正 / 卖出为负）'; return }
  const list = (records.value[activeCode.value] || []).slice()
  list.push({ d, p, a })
  list.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0))
  records.value = { ...records.value, [activeCode.value]: list }
  saveRecords()
}

function removeRecord(idx) {
  const list = (records.value[activeCode.value] || []).slice()
  list.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0))
  list.splice(idx, 1)
  records.value = { ...records.value, [activeCode.value]: list }
  saveRecords()
}

function clearRecords() {
  if (!clearArmed.value) { clearArmed.value = true; return }
  records.value = { ...records.value, [activeCode.value]: [] }
  saveRecords()
  clearArmed.value = false
}

onMounted(() => {
  loadEva()
  loadQuotes()
})
</script>

<style scoped>
.dtip-panel { width: 100%; }

/* 规则表 */
.rule-table th, .rule-table td { text-align: left; }
.rule-table td:first-child { font-weight: 700; white-space: nowrap; }

/* 刷新按钮（与页面标题行右侧小按钮一致） */
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
.refresh-btn.danger { border-color: var(--color-up); color: var(--color-up); }
.refresh-btn.danger:hover { background: #fdf1ef; }

/* 估值表 */
.val-loading { padding: 24px 0; color: var(--text-secondary); }
.row-active { background: #f0f6fb; }
.row-active td { font-weight: 700; }
/* 估值区间标签复用全局 .tag（tag-green / tag-blue / tag-red），与全站 gov.uk 标签规范一致 */
.tag { white-space: nowrap; }

/* 指数 tabs（gov.uk 下划线 tab，与 SignalPage 一致） */
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

/* 当前区间横幅 */
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

/* 记录表单 */
.dtip-form {
  display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
}
.fld { display: flex; flex-direction: column; gap: 6px; min-width: 180px; flex: 1; }
.fld-label { font-size: 14px; font-weight: 700; color: var(--text-secondary); }
.fld-input {
  appearance: none; -webkit-appearance: none;
  border: 2px solid var(--brand);
  background: #ffffff;
  padding: 8px 10px;
  font-size: 16px; font-family: inherit;
  color: var(--text-primary);
  width: 100%;
}
.fld-input:focus { outline: 3px solid #ffdd00; outline-offset: 0; border-color: var(--brand); }
.fld-hint { font-size: 13px; color: var(--text-secondary); }
.submit-btn {
  appearance: none; -webkit-appearance: none;
  background: var(--brand);
  border: 2px solid var(--brand);
  color: #ffffff;
  font-size: 16px; font-weight: 700;
  padding: 9px 28px;
  cursor: pointer; font-family: inherit;
}
.submit-btn:hover { background: #16599b; border-color: #16599b; }
.submit-btn:disabled { opacity: 0.5; cursor: default; }
.form-err { margin-top: 10px; color: var(--color-up); font-size: 14px; font-weight: 700; }

/* 记录表 */
.del-btn {
  appearance: none; -webkit-appearance: none;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px; padding: 2px 10px; cursor: pointer; font-family: inherit;
}
.del-btn:hover { color: var(--color-up); border-color: var(--color-up); }

/* 统计卡 */
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
.aux-row {
  display: flex; flex-wrap: wrap; gap: 8px 28px;
  font-size: 15px; color: var(--text-secondary);
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.aux-row b { color: var(--text-primary); }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: 1fr; } }
</style>
