<template>
  <div class="pcf-page">
    <div class="pcf-head">
      <h2 class="pcf-title">主动ETF · PCF 组合观察</h2>
      <p class="pcf-intro">
        首批 18 只主动管理 ETF 每交易日盘前披露申购赎回清单（PCF）。本页按日整理各产品 PCF 的申赎参数与成分证券，
        并支持跨日对比成分数量变化。
      </p>
      <p class="pcf-notice">
        PCF 是申购赎回的「一篮子证券 + 现金替代」清单，并非基金全部真实持仓，也不代表实时仓位。
        本页仅作基于公开 PCF 的组合观察，不构成任何投资建议。
      </p>
    </div>

    <div class="pcf-bar">
      <span class="pcf-meta" v-if="dataDate">数据日期：<strong>{{ dataDate }}</strong></span>
      <span class="pcf-meta" v-else>数据日期：加载中…</span>
      <span class="pcf-sep">·</span>
      <span class="pcf-meta" v-if="latest">{{ latest.count || funds.length }} 只主动ETF</span>
      <button class="pcf-btn" type="button" :disabled="loading" @click="reload">
        {{ loading ? '加载中…' : '刷新' }}
      </button>
    </div>

    <p v-if="loading && !latest" class="pcf-status">正在加载 PCF 数据…</p>
    <p v-else-if="error && !latest" class="pcf-status pcf-status--err">
      加载失败：{{ error }}
      <button class="pcf-btn" type="button" @click="reload">重试</button>
    </p>
    <p v-else-if="!loading && (!funds || !funds.length)" class="pcf-status">
      暂无数据。数据由每交易日盘前自动生成，若刚上线请稍后再来。
    </p>

    <template v-if="funds.length">
      <!-- 基金选择 -->
      <div class="pcf-picker">
        <div class="pcf-picker-group" v-for="g in marketGroups" :key="g.key">
          <span class="pcf-picker-label">{{ g.label }}</span>
          <button
            v-for="f in g.funds" :key="f.code"
            type="button"
            class="pcf-chip"
            :class="{ 'pcf-chip--active': f.code === selectedCode }"
            @click="selectFund(f.code)"
          >{{ f.short_name || f.code }}</button>
        </div>
      </div>

      <!-- 当前基金详情 -->
      <div v-if="current" class="pcf-detail">
        <div class="pcf-detail-head">
          <h3 class="pcf-fund-name">{{ current.fund_name || current.short_name }}</h3>
          <span class="pcf-fund-code">{{ current.code }} · {{ current.source || (current.market === 'sh' ? '上交所' : '深交所') }}</span>
        </div>

        <div class="pcf-facts">
          <div class="pcf-fact"><span class="pcf-fact-k">基金份额净值</span><span class="pcf-fact-v">{{ fmtFund(current.nav) }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">最小申赎单位净值</span><span class="pcf-fact-v">{{ fmtFund(current.nav_per_unit) }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">最小申赎单位</span><span class="pcf-fact-v">{{ fmtInt(current.creation_unit) }} 份</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">上一日现金差额</span><span class="pcf-fact-v">{{ fmtFund(current.pre_cash) }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">当日预估现金</span><span class="pcf-fact-v">{{ fmtFund(current.est_cash) }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">现金替代上限</span><span class="pcf-fact-v">{{ current.max_cash_ratio || '--' }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">申赎状态</span><span class="pcf-fact-v">{{ current.creation_status || '--' }}</span></div>
          <div class="pcf-fact"><span class="pcf-fact-k">成分证券</span><span class="pcf-fact-v">{{ current.component_count }} 只</span></div>
        </div>

        <!-- 跨日对比 -->
        <div v-if="compare" class="pcf-compare">
          <h4 class="pcf-subtitle">跨日对比（{{ compare.from }} → {{ compare.to }}）</h4>
          <p class="pcf-compare-line">
            成分数量 {{ compare.oldCount }} → {{ compare.newCount }}
            <span v-if="compare.delta !== null" :class="deltaClass(compare.delta)">
              （{{ compare.delta > 0 ? '+' : '' }}{{ compare.delta }}）
            </span>
          </p>
          <p class="pcf-compare-line" v-if="compare.added.length">
            新增：{{ compare.added.map(x => x.name || x.code).join('、') }}
          </p>
          <p class="pcf-compare-line" v-if="compare.removed.length">
            退出：{{ compare.removed.map(x => x.name || x.code).join('、') }}
          </p>
          <p class="pcf-compare-line pcf-muted" v-if="!compare.added.length && !compare.removed.length && compare.delta === 0">
            成分证券无变化。
          </p>
        </div>

        <!-- 成分股表 -->
        <h4 class="pcf-subtitle">成分证券明细（{{ filteredComponents.length }} 只）</h4>
        <div class="pcf-filters">
          <input v-model="keyword" class="pcf-search" type="text" placeholder="搜索代码 / 名称" />
          <button
            v-for="opt in flagFilters" :key="opt.key"
            type="button" class="pcf-seg-btn"
            :class="{ active: flagFilter === opt.key }"
            @click="flagFilter = opt.key"
          >{{ opt.label }}</button>
          <span class="pcf-count">共 {{ filteredComponents.length }} 条</span>
        </div>
        <div class="pcf-table-wrap">
          <table class="pcf-table">
            <thead>
              <tr>
                <th>证券代码</th>
                <th>证券简称</th>
                <th class="num">数量（股/份）</th>
                <th>现金替代标志</th>
                <th class="num">申购溢价率</th>
                <th class="num">赎回折价率</th>
                <th>挂牌市场</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in pagedComponents" :key="c.code + '_' + c.name">
                <td class="code">{{ c.code }}</td>
                <td>{{ c.name }}</td>
                <td class="num">{{ fmtInt(c.quantity) }}</td>
                <td>{{ c.sub_flag_text || c.sub_flag || '--' }}</td>
                <td class="num">{{ c.creation_premium || '--' }}</td>
                <td class="num">{{ c.redemption_discount || '--' }}</td>
                <td>{{ c.market || '--' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pcf-pager" v-if="totalPages > 1">
          <button class="pcf-btn" type="button" :disabled="page <= 1" @click="page--">上一页</button>
          <span class="pcf-page-info">{{ page }} / {{ totalPages }}</span>
          <button class="pcf-btn" type="button" :disabled="page >= totalPages" @click="page++">下一页</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { fetchRecentPcf } from '../../api/etfPcf.js'

const latest = ref(null)
const history = ref([]) // 按日期从近到远，[0] 即 latest
const loading = ref(false)
const error = ref('')
const selectedCode = ref('')
const keyword = ref('')
const flagFilter = ref('ALL')
const page = ref(1)
const PAGE_SIZE = 50

const flagFilters = [
  { key: 'ALL', label: '全部' },
  { key: '允许', label: '允许' },
  { key: '必须', label: '必须' },
  { key: '禁止', label: '禁止' },
]

const funds = computed(() => latest.value?.funds || [])
const dataDate = computed(() => latest.value?.date || '')
const marketGroups = computed(() => [
  { key: 'sh', label: '上交所（581）', funds: funds.value.filter(f => f.market === 'sh') },
  { key: 'sz', label: '深交所（1589）', funds: funds.value.filter(f => f.market === 'sz') },
].filter(g => g.funds.length))
const current = computed(() => funds.value.find(f => f.code === selectedCode.value) || funds.value[0] || null)

const filteredComponents = computed(() => {
  const list = current.value?.components || []
  const kw = keyword.value.trim().toLowerCase()
  return list.filter(c => {
    if (flagFilter.value !== 'ALL') {
      const flag = c.sub_flag_text || c.sub_flag || ''
      if (!flag.includes(flagFilter.value)) return false
    }
    if (kw && !(String(c.code).includes(kw) || String(c.name || '').toLowerCase().includes(kw))) return false
    return true
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredComponents.value.length / PAGE_SIZE)))
const pagedComponents = computed(() => filteredComponents.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

// 与上一份有该基金数据的交易日对比
const compare = computed(() => {
  if (!current.value || history.value.length < 2) return null
  const code = current.value.code
  let prev = null
  for (let i = 1; i < history.value.length; i++) {
    const f = (history.value[i].funds || []).find(x => x.code === code)
    if (f) { prev = { day: history.value[i].date, fund: f }; break }
  }
  if (!prev) return null
  const nowMap = new Map((current.value.components || []).map(c => [c.code, c]))
  const oldMap = new Map((prev.fund.components || []).map(c => [c.code, c]))
  const added = (current.value.components || []).filter(c => !oldMap.has(c.code))
  const removed = (prev.fund.components || []).filter(c => !nowMap.has(c.code))
  const newCount = current.value.component_count ?? (current.value.components || []).length
  const oldCount = prev.fund.component_count ?? (prev.fund.components || []).length
  return {
    from: prev.day, to: dataDate.value,
    oldCount, newCount, delta: newCount - oldCount,
    added, removed,
  }
})

function deltaClass(d) {
  return d > 0 ? 'pcf-up' : (d < 0 ? 'pcf-down' : 'pcf-muted')
}
function fmtInt(v) {
  if (v === null || v === undefined || v === '') return '--'
  return Number(v).toLocaleString('zh-CN')
}
function fmtFund(v) {
  if (v === null || v === undefined || v === '') return '--'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
function selectFund(code) {
  selectedCode.value = code
  page.value = 1; keyword.value = ''; flagFilter.value = 'ALL'
}
async function reload(force = false) {
  loading.value = true; error.value = ''
  try {
    const r = await fetchRecentPcf(5, 14)
    latest.value = r.latest
    history.value = r.history || []
    if (!selectedCode.value && funds.value.length) selectedCode.value = funds.value[0].code
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}
onMounted(() => reload())
watch([keyword, flagFilter], () => { page.value = 1 })
</script>

<style scoped>
.pcf-page { padding: 20px 16px 48px; color: var(--text-primary); }
.pcf-title { font-size: 24px; margin: 0 0 10px; color: var(--brand); }
.pcf-intro { font-size: 15px; line-height: 1.6; margin: 0 0 8px; }
.pcf-notice { font-size: 13px; line-height: 1.6; color: #505a5f; background: #f3f2f1; border-left: 4px solid var(--border); padding: 10px 12px; margin: 0 0 16px; }
.pcf-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 0; border-bottom: 2px solid var(--brand); margin-bottom: 16px; }
.pcf-meta { font-size: 14px; }
.pcf-sep { color: var(--border); }
.pcf-btn { font-size: 14px; padding: 6px 14px; border: 1px solid var(--brand); background: var(--brand); color: #fff; cursor: pointer; }
.pcf-btn:disabled { opacity: 0.5; cursor: default; }
.pcf-status { font-size: 15px; padding: 20px 0; color: #505a5f; }
.pcf-status--err { color: #d4351c; }
.pcf-picker { margin-bottom: 20px; }
.pcf-picker-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.pcf-picker-label { font-size: 13px; font-weight: 700; color: #505a5f; min-width: 120px; }
.pcf-chip { font-size: 13px; padding: 5px 10px; border: 1px solid var(--border); background: #fff; color: var(--brand); cursor: pointer; }
.pcf-chip:hover { border-color: var(--brand); }
.pcf-chip--active { background: var(--brand); color: #fff; border-color: var(--brand); }
.pcf-detail { border-top: 1px solid var(--border); padding-top: 16px; }
.pcf-detail-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.pcf-fund-name { font-size: 19px; margin: 0; }
.pcf-fund-code { font-size: 13px; color: #505a5f; }
.pcf-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 20px; }
.pcf-fact { background: #fff; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.pcf-fact-k { font-size: 12px; color: #505a5f; }
.pcf-fact-v { font-size: 16px; font-weight: 700; }
.pcf-subtitle { font-size: 16px; margin: 20px 0 10px; }
.pcf-compare { background: #f3f2f1; padding: 12px 14px; margin-bottom: 8px; }
.pcf-compare-line { font-size: 14px; margin: 4px 0; line-height: 1.5; }
.pcf-muted { color: #505a5f; }
.pcf-up { color: #d4351c; font-weight: 700; }
.pcf-down { color: #00703c; font-weight: 700; }
.pcf-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.pcf-search { font-size: 14px; padding: 6px 10px; border: 1px solid var(--border); min-width: 180px; }
.pcf-seg-btn { font-size: 13px; padding: 5px 12px; border: 1px solid var(--border); background: #fff; color: var(--text-primary); cursor: pointer; }
.pcf-seg-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.pcf-count { font-size: 13px; color: #505a5f; margin-left: auto; }
.pcf-table-wrap { overflow-x: auto; border: 1px solid var(--border); }
.pcf-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.pcf-table th, .pcf-table td { padding: 8px 10px; border-bottom: 1px solid #d8dde0; text-align: left; white-space: nowrap; }
.pcf-table th { background: #f3f2f1; font-weight: 700; border-bottom: 2px solid var(--border); }
.pcf-table tbody tr:last-child td { border-bottom: none; }
.pcf-table .num { text-align: right; }
.pcf-table .code { font-variant-numeric: tabular-nums; color: var(--brand); }
.pcf-pager { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 14px; }
.pcf-page-info { font-size: 14px; }
@media (max-width: 640px) {
  .pcf-title { font-size: 20px; }
  .pcf-picker-label { min-width: 100%; }
  .pcf-facts { grid-template-columns: repeat(2, 1fr); }
}
</style>
