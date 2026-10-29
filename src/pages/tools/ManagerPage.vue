<template>
  <div class="manager-page">
    <!-- 页面说明行：标题 / 数据来源 / 截止时间 / 覆盖范围（gov.uk 风格，与基金评分页一致） -->
    <div class="mgr-summary">
      <h2 class="mgr-summary-title">基金经理图鉴</h2>
      <div class="mgr-summary-meta">
        <span>数据来源：东方财富基金经理接口（在线实时）</span>
        <span class="mgr-summary-sep">·</span>
        <span v-if="lastLoadedAt">截止时间：{{ lastLoadedAt }}</span>
        <span class="mgr-summary-sep">·</span>
        <span>覆盖 {{ rawAll.length }} 位基金经理</span>
      </div>
    </div>

    <!-- 类型 tab：全部 / 股票型 / 混合型 / 债券型 / 收益型 -->
    <nav class="type-tabs" aria-label="基金经理类型">
      <button
        v-for="t in typeTabs"
        :key="t.key"
        class="type-tab"
        :class="{ 'type-tab--active': type === t.key }"
        @click="switchType(t.key)"
      >{{ t.label }}</button>
    </nav>

    <!-- 操作条：搜索框 + 更多筛选 -->
    <div class="toolbar">
      <div class="search-box">
        <input v-model.trim="f.search" type="text" placeholder="搜索经理 / 公司 / 基金 / ID" aria-label="搜索" />
      </div>
      <button class="btn-ghost" :class="{ 'is-active': showMore }" @click="showMore = !showMore">
        更多筛选<span v-if="activeFilterCount">（{{ activeFilterCount }}）</span>
      </button>
      <span class="result-count">共 <b>{{ filtered.length }}</b> 位经理</span>
    </div>

    <!-- 更多筛选（默认收起） -->
    <div v-show="showMore" class="filter-card">
      <div class="filter-head">
        <span class="filter-title">筛选条件</span>
        <span class="filter-hint">数据来自东方财富基金经理在线接口，实时拉取、不落库。点「确认筛选」按条件重新拉取全量。</span>
      </div>
      <div class="filter-grid">
        <!-- 公司 -->
        <div class="field">
          <label>公司</label>
          <input v-model.trim="f.company" type="text" placeholder="如 易方达 / 华夏" />
        </div>
        <!-- 姓名 -->
        <div class="field">
          <label>姓名</label>
          <input v-model.trim="f.name" type="text" placeholder="经理姓名 / 拼音" />
        </div>
        <!-- 经理ID -->
        <div class="field">
          <label>经理ID</label>
          <input v-model.trim="f.managerId" type="text" placeholder="如 300015" />
        </div>
        <!-- 现任基金 -->
        <div class="field">
          <label>现任基金</label>
          <input v-model.trim="f.fund" type="text" placeholder="基金代码 / 名称" />
        </div>
        <!-- 产品数量 -->
        <div class="field">
          <label>产品数量（只）</label>
          <div class="range">
            <input v-model.trim="f.countMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.countMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 管理时间 -->
        <div class="field">
          <label>管理时间（年）</label>
          <div class="range">
            <input v-model.trim="f.yearsMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.yearsMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 管理总规模 -->
        <div class="field">
          <label>管理总规模（亿元）</label>
          <div class="range">
            <input v-model.trim="f.scaleMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.scaleMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 最佳回报 -->
        <div class="field">
          <label>最佳回报（%）</label>
          <div class="range">
            <input v-model.trim="f.retMin" type="number" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.retMax" type="number" placeholder="最大" />
          </div>
        </div>
        <!-- 最佳回报基金 -->
        <div class="field">
          <label>最佳回报基金</label>
          <input v-model.trim="f.bestFund" type="text" placeholder="基金名称关键词" />
        </div>
        <!-- 代表产品类型 -->
        <div class="field">
          <label>代表产品类型</label>
          <input v-model.trim="f.prodType" type="text" placeholder="如 股票型 / 混合型 / 债券型" />
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="loading" @click="confirmFilter">确认筛选（重新拉取）</button>
        <button class="btn-ghost" :disabled="loading" @click="resetFilters">重置</button>
      </div>
    </div>

    <!-- 状态 -->
    <div class="status-bar">
      <template v-if="loading"><span class="loading">数据加载中…</span></template>
      <template v-else-if="error"><span class="error">加载失败：{{ error }}</span></template>
    </div>

    <!-- 结果表 -->
    <div v-if="!loading && !error" class="result-wrap">
      <table class="result-table">
        <thead>
          <tr>
            <th @click="sortBy('name')" :class="sortClass('name')">经理<span class="arrow" v-if="sortKey==='name'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th @click="sortBy('company')" :class="sortClass('company')">所属公司<span class="arrow" v-if="sortKey==='company'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th class="num" @click="sortBy('fundCount')" :class="sortClass('fundCount')">现任产品<span class="arrow" v-if="sortKey==='fundCount'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th @click="sortBy('manageDays')" :class="sortClass('manageDays')">管理时间<span class="arrow" v-if="sortKey==='manageDays'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th class="num" @click="sortBy('scale')" :class="sortClass('scale')">管理总规模<span class="arrow" v-if="sortKey==='scale'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th class="num" @click="sortBy('bestReturn')" :class="sortClass('bestReturn')">最佳回报<span class="arrow" v-if="sortKey==='bestReturn'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
            <th class="rep-col" @click="sortBy('bestReturnFund')" :class="sortClass('bestReturnFund')">代表产品<span class="arrow" v-if="sortKey==='bestReturnFund'">{{ sortDir==='desc'?'↓':'↑' }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in paged" :key="m.id">
            <td>
              <a :href="'https://fund.eastmoney.com/manager/' + m.id + '.html'" target="_blank" rel="noopener">{{ m.name }}</a>
              <span class="sub-id">ID {{ m.id }}</span>
            </td>
            <td>
              <a v-if="m.companyId" :href="'https://fund.eastmoney.com/company/' + m.companyId + '.html'" target="_blank" rel="noopener">{{ m.company }}</a>
              <span v-else>{{ m.company }}</span>
            </td>
            <td class="num">{{ m.fundCount }}</td>
            <td>{{ fmtYears(m.manageDays) }}</td>
            <td class="num">{{ m.scale || '—' }}</td>
            <td class="num" :class="retClass(m.bestReturn)">{{ m.bestReturn || '—' }}</td>
            <td class="rep">
              <template v-if="repOf(m)">
                <a class="rep-name" :href="'https://fund.eastmoney.com/' + repOf(m).code + '.html'" target="_blank" rel="noopener">{{ repOf(m).name || m.bestReturnFund }}</a>
                <div class="rep-sub">
                  <a :href="'https://fund.eastmoney.com/' + repOf(m).code + '.html'" target="_blank" rel="noopener">{{ repOf(m).code }}</a>
                  <span v-if="repOf(m).type" class="rep-type">{{ repOf(m).type }}</span>
                  <span v-if="repOf(m).scale" class="rep-scale">{{ repOf(m).scale }}</span>
                </div>
              </template>
              <span v-else>{{ m.bestReturnFund || '—' }}</span>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td colspan="7" class="empty">无匹配结果，请放宽筛选条件。</td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div class="pager" v-if="filtered.length > pageSize">
        <button :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { toast } from '../../composables/useToast'

const typeTabs = [
  { key: 'all', label: '全部' },
  { key: 'gp', label: '股票型' },
  { key: 'hh', label: '混合型' },
  { key: 'zq', label: '债券型' },
  { key: 'sy', label: '收益型' },
]
const type = ref('all')
const currentTypeLabel = computed(() => (typeTabs.find(t => t.key === type.value) || {}).label || '')

// 筛选维度
const f = reactive({
  search: '',          // 顶部统一搜索框（经理 / 公司 / 基金 / ID）
  company: '', name: '', managerId: '', fund: '',
  countMin: '', countMax: '',
  yearsMin: '', yearsMax: '',
  scaleMin: '', scaleMax: '',
  retMin: '', retMax: '',
  bestFund: '',
  prodType: '',        // 代表产品类型（contains 匹配）
})

const rawAll = ref([])        // 当前类型已加载的全部数据
const loading = ref(false)
const error = ref('')
const lastLoadedAt = ref('')   // 当次数据拉取时刻（东方财富在线实时接口，无固定快照日，以拉取时间作为有效截止点）
const sortKey = ref('bestReturn')
const sortDir = ref('desc')       // 'desc' | 'asc'
const showMore = ref(false)       // 更多筛选抽屉是否展开
const currentPage = ref(1)
const pageSize = 1000            // 单页 1000 行，减少翻页
const managerRep = ref({})        // 经理ID -> 代表产品 {code,name,type,scale}，来自静态 manager_rep.json

function toNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}
function parseScale(s) {
  if (!s) return NaN
  const m = String(s).match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : NaN
}
function parsePct(s) {
  if (!s) return NaN
  const m = String(s).match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : NaN
}
function fmtYears(days) {
  const d = parseInt(days, 10) || 0
  const y = Math.floor(d / 365)
  const rem = d - y * 365
  if (y <= 0) return rem + '天'
  return y + '年' + rem + '天'
}
// 北京时间格式化（用于说明行的「截止时间」）
function fmtNow() {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d)
  const get = (t) => parts.find(x => x.type === t)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

function fetchManagers({ ft, com = '', input = '', id = '', full = true }) {
  const params = new URLSearchParams()
  params.set('ft', ft)
  params.set('mc', 'returnjson')
  if (full) params.set('full', '1')   // 边缘函数内部翻页拉全量（sn 封顶 2000/页）
  if (com) params.set('com', com)      // 服务端：公司名模糊过滤
  if (input) params.set('input', input) // 服务端：姓名/拼音模糊搜索
  if (id) params.set('id', id)          // 服务端：经理 ID 精确
  return fetch('/api/fund-managers?' + params.toString())
    .then(r => r.json())
    .then(json => {
      if (!json.ok) throw new Error(json.error || '接口返回失败')
      return Array.isArray(json.data) ? json.data : []
    })
}

function applyFilters(list) {
  const company = f.company.trim()
  const name = f.name.trim()
  const mid = f.managerId.trim()
  const fund = f.fund.trim()
  const bestFund = f.bestFund.trim()
  const q = (f.search || '').trim().toLowerCase()
  // 代表产品类型筛选（引用 managerRep 使 computed 在静态数据加载后重算）
  const prodType = f.prodType.trim().toLowerCase()
  const countMin = toNum(f.countMin), countMax = toNum(f.countMax)
  const yearsMin = toNum(f.yearsMin), yearsMax = toNum(f.yearsMax)
  const scaleMin = toNum(f.scaleMin), scaleMax = toNum(f.scaleMax)
  const retMin = toNum(f.retMin), retMax = toNum(f.retMax)

  return list.filter(m => {
    // 顶部统一搜索框：经理 / 公司 / 基金 / ID 关键字（包含匹配）
    if (q) {
      const hay = [m.name, m.company, m.id, m.bestReturnFund, ...(m.fundNames || []), ...(m.fundCodes || [])].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    // 代表产品类型筛选
    if (prodType) {
      const t = (repOf(m)?.type || '').toLowerCase()
      if (!t.includes(prodType)) return false
    }
    if (company && !String(m.company).includes(company)) return false
    if (name && !String(m.name).includes(name)) return false
    if (mid && !String(m.id).includes(mid)) return false
    if (fund) {
      const codes = m.fundCodes || []
      const names = m.fundNames || []
      const hit = codes.some(c => String(c).includes(fund)) || names.some(n => String(n).includes(fund))
      if (!hit) return false
    }
    if (bestFund && !String(m.bestReturnFund).includes(bestFund)) return false

    if (!inRange(m.fundCount, countMin, countMax)) return false

    const years = m.manageDays / 365
    if (!inRange(years, yearsMin, yearsMax)) return false

    const sc = parseScale(m.scale)
    if (!inRange(sc, scaleMin, scaleMax)) return false

    const br = parsePct(m.bestReturn)
    if (!inRange(br, retMin, retMax)) return false

    return true
  })
}

function inRange(val, min, max) {
  if (min !== null && (isNaN(val) || val < min)) return false
  if (max !== null && (isNaN(val) || val > max)) return false
  return true
}

const NUMERIC_KEYS = ['bestReturn', 'scale', 'fundCount', 'manageDays']

function sortList(list) {
  const arr = list.slice()
  const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    let cmp
    if (NUMERIC_KEYS.includes(sortKey.value)) {
      let va, vb
      switch (sortKey.value) {
        case 'scale': va = parseScale(a.scale); vb = parseScale(b.scale); break
        case 'fundCount': va = a.fundCount; vb = b.fundCount; break
        case 'manageDays': va = a.manageDays; vb = b.manageDays; break
        default: va = parsePct(a.bestReturn); vb = parsePct(b.bestReturn); break
      }
      if (isNaN(va)) va = -Infinity
      if (isNaN(vb)) vb = -Infinity
      cmp = va - vb
    } else {
      const va = String(a[sortKey.value] || '')
      const vb = String(b[sortKey.value] || '')
      cmp = va.localeCompare(vb, 'zh')
    }
    return cmp * dir
  })
  return arr
}

// 已激活的筛选条件数量（用于「更多筛选」按钮角标）
const activeFilterCount = computed(() => {
  let n = 0
  if (f.company) n++
  if (f.name) n++
  if (f.managerId) n++
  if (f.fund) n++
  if (f.countMin || f.countMax) n++
  if (f.yearsMin || f.yearsMax) n++
  if (f.scaleMin || f.scaleMax) n++
  if (f.retMin || f.retMax) n++
  if (f.bestFund) n++
  if (f.prodType) n++
  return n
})

// 点击表头排序：同列切换升/降序，不同列按字段类型给默认方向
function sortBy(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = NUMERIC_KEYS.includes(key) ? 'desc' : 'asc'
  }
  currentPage.value = 1
}
function sortClass(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'desc' ? 'sort-desc' : 'sort-asc'
}

const filtered = computed(() => sortList(applyFilters(rawAll.value)))
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function retClass(s) {
  const n = parsePct(s)
  if (isNaN(n)) return ''
  return n >= 0 ? 'pos' : 'neg'
}

// 代表产品：优先用实时接口返回的代码/名称，类型与规模来自静态 manager_rep.json（by 经理ID）
function repOf(m) {
  const meta = managerRep.value[m.id] || {}
  const code = m.bestReturnFundCode || meta.code || ''
  const name = m.bestReturnFund || meta.name || ''
  if (!code && !name) return null
  return { code, name, type: meta.type || '', scale: meta.scale || '' }
}

// 加载代表产品静态映射（基金代码 -> 类型/规模），一次加载后缓存
function loadRepMeta() {
  fetch('/manager_rep.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => { managerRep.value = d || {} })
    .catch(() => { /* 静态映射缺失时降级：仅显示名称，类型/规模留空 */ })
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    rawAll.value = await fetchManagers({ ft: type.value })
    lastLoadedAt.value = fmtNow()
    currentPage.value = 1
  } catch (e) {
    error.value = (e && e.message) || String(e)
    rawAll.value = []
  } finally {
    loading.value = false
  }
}

// 点确认：向服务端重新拉取全量（full=1，边缘函数内部翻页合并），
// 再在客户端叠加全部 10 维度筛选。保证结果基于服务端最新全量，而非仅筛内存已显示部分。
// 注：东方财富 com/input 为精确/全名匹配（如"易方达基金"而非"易方达"），与界面"包含"语义不符，
// 故此处统一走 full=1 全量拉取 + 客户端 contains 过滤，避免服务端精确匹配导致漏筛。
async function confirmFilter() {
  loading.value = true
  error.value = ''
  try {
    rawAll.value = await fetchManagers({ ft: type.value })
    lastLoadedAt.value = fmtNow()
    currentPage.value = 1
    toast(`已重新拉取全量并筛选，共 ${filtered.value.length} 位经理`)
  } catch (e) {
    error.value = (e && e.message) || String(e)
  } finally {
    loading.value = false
  }
}

function switchType(key) {
  if (key === type.value) return
  type.value = key
  loadAll()
}

function resetFilters() {
  f.search = ''
  f.company = ''; f.name = ''; f.managerId = ''; f.fund = ''
  f.countMin = ''; f.countMax = ''
  f.yearsMin = ''; f.yearsMax = ''
  f.scaleMin = ''; f.scaleMax = ''
  f.retMin = ''; f.retMax = ''
  f.bestFund = ''
  f.prodType = ''
  currentPage.value = 1
}

// 输入即时筛选（基于已加载全量，结果准确）
watch(() => [
  f.search, f.company, f.name, f.managerId, f.fund, f.bestFund, f.prodType,
  f.countMin, f.countMax, f.yearsMin, f.yearsMax, f.scaleMin, f.scaleMax, f.retMin, f.retMax,
  sortKey.value, sortDir.value, managerRep.value,
], () => { currentPage.value = 1 })

onMounted(() => { loadAll(); loadRepMeta() })
</script>

<style scoped>
.manager-page { width: 100%; }
/* 类型 tab（gov.uk 风格） */
.type-tabs { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 16px; border-bottom: 2px solid var(--border, #ccc); }
.type-tab {
  padding: 10px 22px; font-size: 16px; font-weight: 700; cursor: pointer;
  background: transparent; border: none; border-bottom: 4px solid transparent;
  color: var(--text-secondary, #505a5a);
}
.type-tab--active { color: var(--brand, #1d70b8); border-bottom-color: var(--brand, #1d70b8); }

/* 筛选卡 */
.filter-card { border: 1px solid var(--border, #ccc); padding: 16px; margin-bottom: 16px; }
.filter-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.filter-title { font-weight: 700; font-size: 16px; color: var(--brand, #1d70b8); }
.filter-hint { font-size: 13px; color: var(--text-secondary, #505a5a); }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px 18px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary, #505a5a); }
.field input, .field select { padding: 8px 10px; border: 1px solid #b1b4b6; font-size: 14px; border-radius: 0; background: #fff; }
.field input:focus { outline: 3px solid #ffdd00; outline-offset: 0; border-color: var(--brand, #1d70b8); }
.readonly-val { padding: 8px 10px; background: #f3f2f1; border: 1px solid var(--border, #ccc); font-weight: 700; }
.range { display: flex; align-items: center; gap: 8px; }
.range input { width: 100%; min-width: 0; }
.range span { color: var(--text-secondary, #505a5a); white-space: nowrap; }

.filter-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 14px; }
.btn-primary {
  background: var(--brand, #1d70b8); color: #fff; border: none; padding: 10px 20px;
  font-size: 15px; font-weight: 700; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-ghost { background: #fff; border: 1px solid var(--brand, #1d70b8); color: var(--brand, #1d70b8); padding: 10px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
.sort-wrap { margin-left: auto; font-size: 14px; }
.sort-wrap select { padding: 8px 10px; border: 1px solid #b1b4b6; }

/* 状态栏 */
.status-bar { margin: 12px 0; font-size: 14px; }
.status-bar .loading { color: var(--brand, #1d70b8); }
.status-bar .error { color: #d4351c; font-weight: 700; }
.status-bar .muted { color: var(--text-secondary, #505a5a); margin-left: 12px; }
.status-bar b { color: var(--brand, #1d70b8); }

/* 结果表 */
.result-wrap { overflow-x: auto; }
.result-table { width: 100%; min-width: 1040px; border-collapse: collapse; font-size: 14px; }
/* 只保留横向分隔线，去掉竖线（gov.uk 风格：无网格边框，靠行线与留白分隔） */
.result-table th, .result-table td { border: 0; border-bottom: 1px solid #b1b4b6; padding: 10px 20px 10px 0; text-align: left; vertical-align: top; }
.result-table thead th { background: #f3f2f1; border-bottom: 2px solid #0b0c0c; font-weight: 700; white-space: nowrap; }
.result-table tbody tr:last-child td { border-bottom: 0; }
.result-table .num { text-align: right; white-space: nowrap; }
.result-table a { color: var(--brand, #1d70b8); text-decoration: none; }
.result-table a:hover { text-decoration: underline; }
.sub-id { display: block; font-size: 12px; color: var(--text-secondary, #505a5a); }
.rep { vertical-align: top; }
.rep-name { font-weight: 600; }
.rep-sub { margin-top: 4px; font-size: 12px; color: var(--text-secondary, #505a5a); display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.rep-sub a { color: var(--text-secondary, #505a5a); }
.rep-sub a:hover { color: var(--brand, #1d70b8); }
.rep-type { background: #f3f2f1; padding: 1px 7px; }
.rep-scale { color: #0b0c0c; font-weight: 600; }
.pos { color: #d4351c; font-weight: 700; }  /* 涨：红 */
.neg { color: #00703c; font-weight: 700; }  /* 跌：绿 */
.empty { text-align: center; color: var(--text-secondary, #505a5a); padding: 24px; }

/* 分页 */
.pager { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 14px; }
.pager button { padding: 6px 14px; border: 1px solid var(--brand, #1d70b8); background: #fff; color: var(--brand, #1d70b8); cursor: pointer; }
.pager button:disabled { opacity: 0.5; cursor: default; }

/* 操作条：搜索框 + 更多筛选 */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
.search-box { flex: 1 1 260px; min-width: 0; }
.search-box input { width: 100%; padding: 10px 12px; border: 2px solid #b1b4b6; font-size: 15px; border-radius: 0; background: #fff; }
.search-box input:focus { outline: 3px solid #ffdd00; outline-offset: 0; border-color: var(--brand, #1d70b8); }
.result-count { font-size: 14px; color: var(--text-secondary, #505a5a); white-space: nowrap; margin-left: auto; }
.result-count b { color: var(--brand, #1d70b8); }
.btn-ghost.is-active { background: var(--brand, #1d70b8); color: #fff; }

/* 可排序表头 */
.result-table th { cursor: pointer; user-select: none; white-space: nowrap; }
.result-table th:hover { color: var(--brand, #1d70b8); }
.result-table th.rep-col { min-width: 240px; }
.result-table th.sort-asc, .result-table th.sort-desc { color: var(--brand, #1d70b8); }
.result-table th .arrow { font-size: 12px; margin-left: 3px; }

@media (max-width: 768px) {
  .filter-grid { grid-template-columns: 1fr 1fr; }
  .sort-wrap { margin-left: 0; }
}

/* 页面说明行（与基金评分页一致，gov.uk 风格） */
.mgr-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.mgr-summary-title { font-size: 24px; font-weight: 700; color: var(--text-primary, #0b0c0c); margin: 0; }
.mgr-summary-meta { font-size: 13px; color: var(--text-secondary, #505a5f); }
.mgr-summary-sep { color: var(--text-muted, #b1b4b6); }
</style>
