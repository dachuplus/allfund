<template>
  <div class="valuation-page">
    <!-- 标题 -->
    <div class="val-head">
      <h2 class="val-title">估值</h2>
      <div class="val-meta">
        <span v-if="dataDate">数据日期：{{ dataDate }}</span>
        <span class="val-sep">·</span>
        <span>中证指数官方估值口径（PE / PB / 股息率 / ROE）</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">指数估值排行</div>

      <!-- 加载 / 错误 -->
      <div class="error-card" v-if="errorMsg">
        <p>{{ errorMsg }}</p>
      </div>
      <p class="val-loading" v-else-if="loading">估值数据加载中…</p>

      <template v-else>
        <div class="filter-row">
          <span
            v-for="f in industryFilters" :key="f.key"
            class="filter-chip" :class="{ active: industryFilter === f.key }"
            @click="industryFilter = f.key"
          >{{ f.label }}</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable" @click="sortIndustry('name')">名称 {{ sortIcon('name') }}</th>
                <th class="sortable num" @click="sortIndustry('pe')">PE {{ sortIcon('pe') }}</th>
                <th class="sortable num" @click="sortIndustry('pe_pct')">PE百分位 {{ sortIcon('pe_pct') }}</th>
                <th class="sortable num" @click="sortIndustry('pb')">PB {{ sortIcon('pb') }}</th>
                <th class="sortable num" @click="sortIndustry('pb_pct')">PB百分位 {{ sortIcon('pb_pct') }}</th>
                <th class="sortable num" @click="sortIndustry('div_yield')">股息率 {{ sortIcon('div_yield') }}</th>
                <th class="sortable num" @click="sortIndustry('roe')">ROE {{ sortIcon('roe') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in industryList" :key="row.code">
                <td>{{ row.name }}</td>
                <td class="num">{{ fmtNum(row.pe, 4) }}</td>
                <td class="num" :class="row.pe_pct_color">{{ fmtNum(row.pe_pct, 2) }}%</td>
                <td class="num">{{ fmtNum(row.pb, 4) }}</td>
                <td class="num" :class="row.pb_pct_color">{{ fmtNum(row.pb_pct, 2) }}%</td>
                <td class="num">{{ fmtNum(row.div_yield, 2) }}%</td>
                <td class="num">{{ fmtNum(row.roe, 2) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="data-source">数据来源：公开网络</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { fetchIndexEva } from '../../utils/api'

// ===== 筛选 =====
const industryFilters = [
  { key: 'all', label: '全部' },
  { key: 'broad', label: '宽基' },
  { key: 'strategy', label: '策略' },
  { key: 'sector', label: '行业主题' },
]
const industryFilter = ref('all')
const industryRaw = ref([])
const industrySort = reactive({ field: 'pe_pct', asc: true })

// ===== 状态 =====
const loading = ref(false)
const errorMsg = ref('')
const dataDate = ref('')

const filteredIndustry = computed(() => {
  let list = [...industryRaw.value]
  if (industryFilter.value === 'broad') {
    list = list.filter(r => r.cat === 'broad')
  } else if (industryFilter.value === 'strategy') {
    list = list.filter(r => r.cat === 'strategy')
  } else if (industryFilter.value === 'sector') {
    list = list.filter(r => r.cat === 'sector')
  }
  const f = industrySort.field
  list.sort((a, b) => {
    const va = a[f]; const vb = b[f]
    if (va == null && vb == null) return 0
    if (va == null) return 1; if (vb == null) return -1
    return industrySort.asc ? va - vb : vb - va
  })
  return list.map(r => ({
    ...r,
    pe_pct_color: r.pe_pct > 70 ? 'text-up' : r.pe_pct < 30 ? 'text-down' : '',
    pb_pct_color: r.pb_pct > 70 ? 'text-up' : r.pb_pct < 30 ? 'text-down' : '',
  }))
})

const industryList = computed(() => filteredIndustry.value.slice(0, 100))

// ===== 工具函数 =====
function fmtNum(v, d = 2) {
  if (v == null || v === '' || isNaN(Number(v))) return '--'
  return Number(v).toFixed(d)
}

function sortIndustry(field) {
  if (industrySort.field === field) {
    industrySort.asc = !industrySort.asc
  } else {
    industrySort.field = field
    industrySort.asc = field === 'pe_pct' || field === 'pb_pct'
  }
}

function sortIcon(field) {
  if (industrySort.field !== field) return ''
  return industrySort.asc ? '▲' : '▼'
}

// ===== 数据加载（实时，经蛋卷估值中心，不落库） =====
async function loadIndustry() {
  loading.value = true
  errorMsg.value = ''
  try {
    const rows = await fetchIndexEva()
    if (!rows || rows.length === 0) {
      errorMsg.value = '估值数据暂不可用（蛋卷接口暂无返回）'
      return
    }
    industryRaw.value = rows.map(r => ({
      code: r.index_code,
      name: r.name,
      cat: r.cat || 'other',
      ttype: r.ttype,
      pe: r.pe != null ? r.pe : null,
      pe_pct: r.pe_percentile != null ? parseFloat(r.pe_percentile) : null,
      pb: r.pb != null ? r.pb : null,
      pb_pct: r.pb_percentile != null ? parseFloat(r.pb_percentile) : null,
      div_yield: r.dividend_yield != null ? parseFloat(r.dividend_yield) : null,
      roe: r.roe != null ? parseFloat(r.roe) : null,
    }))
    dataDate.value = rows[0]?.date || ''
  } catch (e) {
    errorMsg.value = '估值数据加载失败'
    console.error('估值加载失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadIndustry)
</script>

<style scoped>
/* ========== gov.uk 蓝白灰 估值页 ========== */
.valuation-page { padding-bottom: var(--space-2xl); overflow-x: hidden; max-width: 100%; }

.val-head { padding: var(--space-sm) 0; border-bottom: 1px solid var(--border); margin-bottom: var(--space-lg); }
.val-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.val-meta { font-size: 13px; color: var(--text-secondary); }
.val-sep { margin: 0 6px; color: var(--text-secondary); }

/* 卡片 */
.card {
  background: #ffffff; border: 1px solid var(--border);
  padding: var(--space-lg); margin-bottom: var(--space-xl);
}
.card-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-md); }

/* 加载 / 错误 */
.val-loading { font-size: 14px; color: var(--text-secondary); padding: var(--space-md) 0; }
.error-card { border-left: 5px solid #d4351c; padding: var(--space-md); margin-bottom: var(--space-xl); background: #fff; }
.error-card p { margin: 0; font-size: 16px; color: #d4351c; }

/* 筛选 */
.filter-row { display: flex; gap: var(--space-md); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px solid var(--border); }
.filter-chip { font-size: 14px; color: var(--text-secondary); cursor: pointer; padding: 2px 0; border-bottom: 2px solid transparent; }
.filter-chip.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 700; }

/* 表格 */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { text-align: left; padding: var(--space-sm); color: var(--text-secondary); border-bottom: 2px solid var(--border); font-weight: 700; white-space: nowrap; }
.data-table td { padding: var(--space-sm); color: var(--text-primary); border-bottom: 1px solid var(--border); white-space: nowrap; }
.data-table th.num, .data-table td.num { text-align: right; }
.td-name { font-weight: 700; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: var(--brand); }

.data-source { font-size: 12px; color: var(--text-secondary); margin-top: var(--space-sm); }
.text-up { color: var(--color-up) !important; }
.text-down { color: var(--color-down) !important; }
</style>
