<template>
  <div class="stock-page">
    <!-- 标题 + 数据日期 -->
    <div class="sp-head">
      <h2 class="sp-title">股票选品 · 靠谱指数</h2>
      <div class="sp-meta">
        <span v-if="dataDate">数据日期：{{ dataDate }}</span>
        <span class="sp-sep">·</span>
        <span>共 {{ total }} 只（沪深300 + 中证500 + 中证1000 成分股）</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="sp-filters">
      <input
        v-model="search"
        class="sp-search"
        type="text"
        placeholder="搜索代码 / 名称"
        @input="onSearchInput"
      />
      <div class="sp-exch">
        <button
          v-for="e in exchanges"
          :key="e.key"
          :class="['sp-exch-btn', { active: exchange === e.key }]"
          type="button"
          @click="setExchange(e.key)"
        >{{ e.label }}</button>
      </div>
      <span class="sp-count">显示 {{ paged.length }} / {{ total }} 条</span>
    </div>

    <!-- 表格 -->
    <div class="sp-tablewrap">
      <table class="sp-table">
        <thead>
          <tr>
            <th class="col-code sortable" :class="sortCls('code')" @click="sortBy('code')">代码</th>
            <th class="col-name sortable" :class="sortCls('name')" @click="sortBy('name')">名称</th>
            <th class="col-exch sortable" :class="sortCls('exchange')" @click="sortBy('exchange')">市场</th>
            <th class="num sortable" :class="sortCls('pe_ttm')" @click="sortBy('pe_ttm')">市盈率(TTM)</th>
            <th class="num sortable" :class="sortCls('pb')" @click="sortBy('pb')">市净率</th>
            <th class="num sortable" :class="sortCls('mktcap')" @click="sortBy('mktcap')">总市值(亿)</th>
            <th class="num sortable" :class="sortCls('return_1y')" @click="sortBy('return_1y')">近1年%</th>
            <th class="num sortable" :class="sortCls('return_3y')" @click="sortBy('return_3y')">近3年%</th>
            <th class="num sortable" :class="sortCls('max_drawdown')" @click="sortBy('max_drawdown')">最大回撤%</th>
            <th class="num sortable" :class="sortCls('sharpe')" @click="sortBy('sharpe')">夏普</th>
            <th class="num col-score sortable" :class="sortCls('k_all')" @click="sortBy('k_all')">靠谱指数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in paged" :key="row.code">
            <td class="col-code">{{ row.code }}</td>
            <td class="col-name">{{ cleanName(row.name) }}</td>
            <td class="col-exch">{{ exchLabel(row.exchange) }}</td>
            <td class="num">{{ fmtNum(row.pe_ttm) }}</td>
            <td class="num">{{ fmtNum(row.pb) }}</td>
            <td class="num">{{ fmtNum(row.mktcap) }}</td>
            <td class="num" :class="signClass(row.return_1y)">{{ fmtPct(row.return_1y) }}</td>
            <td class="num" :class="signClass(row.return_3y)">{{ fmtPct(row.return_3y) }}</td>
            <td class="num neg">{{ fmtDD(row.max_drawdown) }}</td>
            <td class="num">{{ fmtSR(row.sharpe) }}</td>
            <td class="num col-score">
              <span class="score-val" :style="scoreColor(row.k_all)">{{ fmtScore(row.k_all) }}</span>
            </td>
          </tr>
          <tr v-if="!loading && paged.length === 0">
            <td colspan="11" class="sp-empty">暂无数据</td>
          </tr>
          <tr v-if="loading">
            <td colspan="11" class="sp-empty">加载中…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="sp-pager">
      <button class="sp-pg-btn" :disabled="currentPage <= 1" type="button" @click="currentPage--">上一页</button>
      <span class="sp-pager-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button class="sp-pg-btn" :disabled="currentPage >= totalPages" type="button" @click="currentPage++">下一页</button>
      <select v-model.number="pageSize" class="sp-pagesize" @change="currentPage = 1">
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
        <option :value="100">100 条/页</option>
      </select>
    </div>

    <p class="sp-note">
      评分说明：靠谱指数基于公开行情数据，综合收益率、最大回撤、夏普比率，按横截面百分位加权计算（k_all = 0.5·收益 + 0.25·回撤 + 0.25·夏普），取值 0~100。评分仅反映历史数据的相对位置，不代表未来表现。
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchStockScores } from '../../api/data.js'
import { fmtScore, fmtNum, fmtDD, fmtSR, scoreColor } from '../../utils/format.js'

const exchanges = [
  { key: 'ALL', label: '全部' },
  { key: 'SH', label: '沪' },
  { key: 'SZ', label: '深' },
  { key: 'BJ', label: '京' },
]

const loading = ref(false)
const rows = ref([])
const search = ref('')
const exchange = ref('ALL')
const sortKey = ref('k_all')
const sortAsc = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)

const dataDate = computed(() => {
  if (!rows.value.length) return ''
  const d = rows.value[0].updated_at
  return d ? String(d).slice(0, 10) : ''
})

const total = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

async function load() {
  loading.value = true
  try {
    const data = await fetchStockScores({
      search: search.value.trim(),
      exchange: exchange.value,
      sortKey: sortKey.value,
      sortAsc: sortAsc.value,
    })
    rows.value = data || []
    currentPage.value = 1
  } catch (e) {
    console.error('[StockPage] 加载股票评分失败:', e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
}

function setExchange(key) {
  exchange.value = key
  load()
}

function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = false
  }
  load()
}

function sortCls(key) {
  return sortKey.value === key ? (sortAsc.value ? 'sort-asc' : 'sort-desc') : ''
}

function cleanName(n) {
  return (n || '').replace(/\s+/g, '')
}
function exchLabel(e) {
  return { SH: '沪', SZ: '深', BJ: '京' }[e] || e || '--'
}
// 股票 return_*/max_drawdown 在库中已为「百分比数值」（如 361.22 表示 +361.22%），直接展示，勿用 fmtRet
function fmtPct(v) {
  if (v == null || v === '') return '--'
  const n = parseFloat(v)
  if (isNaN(n)) return '--'
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%'
}
function signClass(v) {
  if (v == null || v === '') return ''
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return ''
  return n > 0 ? 'pos' : 'neg'
}

onMounted(load)
watch(pageSize, () => { currentPage.value = 1 })
</script>

<style scoped>
.stock-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 0 24px;
}
.sp-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.sp-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  margin: 0;
}
.sp-meta {
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
}
.sp-sep { color: var(--text-muted, #b1b4b6); margin: 0 4px; }
.sp-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.sp-search {
  flex: 1;
  min-width: 200px;
  border: 2px solid #0b0c0c;
  padding: 9px 12px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}
.sp-search:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
}
.sp-exch { display: flex; gap: 0; }
.sp-exch-btn {
  border: 2px solid #0b0c0c;
  border-right-width: 0;
  background: #fff;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary, #505a5f);
  cursor: pointer;
}
.sp-exch-btn:last-child { border-right-width: 2px; }
.sp-exch-btn.active {
  background: #1d70b8;
  color: #fff;
}
.sp-count {
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
  margin-left: auto;
}
.sp-tablewrap {
  overflow-x: auto;
  border: 1px solid var(--border, #d6d6d6);
}
.sp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.sp-table th,
.sp-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border, #d6d6d6);
  white-space: nowrap;
}
.sp-table thead th {
  text-align: left;
  background: #f3f2f1;
  color: var(--text-primary, #0b0c0c);
  font-weight: 700;
  position: sticky;
  top: 0;
}
.sp-table th.num,
.sp-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.sp-table tbody tr:hover { background: #f8f8f8; }
.col-code { color: var(--text-secondary, #505a5f); }
.col-score { width: 84px; text-align: center !important; }
.col-score .score-val { font-weight: 700; font-size: 14px; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: #1d70b8; }
.sort-asc::after { content: ' ▲'; font-size: 10px; color: #1d70b8; }
.sort-desc::after { content: ' ▼'; font-size: 10px; color: #1d70b8; }
.pos { color: #cf1322; font-weight: 600; }
.neg { color: #238b45; }
.sp-empty {
  text-align: center;
  color: var(--text-secondary, #505a5f);
  padding: 28px 0 !important;
  font-size: 15px;
}
.sp-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.sp-pg-btn {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 7px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.sp-pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sp-pager-info { font-size: 14px; color: var(--text-secondary, #505a5f); }
.sp-pagesize {
  border: 2px solid #0b0c0c;
  padding: 6px 8px;
  font-size: 14px;
  font-family: inherit;
}
.sp-note {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-left: 4px solid var(--brand, #1d70b8);
  background: var(--bg-body, #f3f2f1);
  color: var(--text-secondary, #505a5f);
  font-size: 13px;
  line-height: 1.6;
}
@media (max-width: 768px) {
  .sp-title { font-size: 20px; }
  .sp-count { width: 100%; margin-left: 0; }
}
</style>
