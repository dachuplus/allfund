<template>
  <div class="manager-page">
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

    <!-- 筛选区：10 个维度 -->
    <div class="filter-card">
      <div class="filter-head">
        <span class="filter-title">筛选维度（10 项）</span>
        <span class="filter-hint">拉全部数据后即时筛选；点「确认筛选」会按公司/姓名向服务端再次精确拉取。</span>
      </div>

      <div class="filter-grid">
        <!-- 1. 类型（只读，由上方 tab 决定） -->
        <div class="field">
          <label>① 类型</label>
          <div class="readonly-val">{{ currentTypeLabel }}</div>
        </div>
        <!-- 2. 公司 -->
        <div class="field">
          <label>② 公司</label>
          <input v-model.trim="f.company" type="text" placeholder="如 易方达 / 华夏" />
        </div>
        <!-- 3. 姓名 -->
        <div class="field">
          <label>③ 姓名</label>
          <input v-model.trim="f.name" type="text" placeholder="经理姓名 / 拼音" />
        </div>
        <!-- 4. 经理ID -->
        <div class="field">
          <label>④ 经理ID</label>
          <input v-model.trim="f.managerId" type="text" placeholder="如 300015" />
        </div>
        <!-- 5. 现任基金 -->
        <div class="field">
          <label>⑤ 现任基金</label>
          <input v-model.trim="f.fund" type="text" placeholder="基金代码 / 名称" />
        </div>
        <!-- 6. 产品数量 -->
        <div class="field">
          <label>⑥ 产品数量（只）</label>
          <div class="range">
            <input v-model.trim="f.countMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.countMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 7. 管理时间 -->
        <div class="field">
          <label>⑦ 管理时间（年）</label>
          <div class="range">
            <input v-model.trim="f.yearsMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.yearsMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 8. 管理总规模 -->
        <div class="field">
          <label>⑧ 管理总规模（亿元）</label>
          <div class="range">
            <input v-model.trim="f.scaleMin" type="number" min="0" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.scaleMax" type="number" min="0" placeholder="最大" />
          </div>
        </div>
        <!-- 9. 最佳回报 -->
        <div class="field">
          <label>⑨ 最佳回报（%）</label>
          <div class="range">
            <input v-model.trim="f.retMin" type="number" placeholder="最小" />
            <span>~</span>
            <input v-model.trim="f.retMax" type="number" placeholder="最大" />
          </div>
        </div>
        <!-- 10. 最佳回报基金 -->
        <div class="field">
          <label>⑩ 最佳回报基金</label>
          <input v-model.trim="f.bestFund" type="text" placeholder="基金名称关键词" />
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="loading" @click="confirmFilter">确认筛选（重新拉取）</button>
        <button class="btn-ghost" :disabled="loading" @click="resetFilters">重置</button>
        <span class="sort-wrap">
          排序：
          <select v-model="sortKey">
            <option value="bestReturn">最佳回报 ↓</option>
            <option value="scale">管理规模 ↓</option>
            <option value="fundCount">产品数量 ↓</option>
            <option value="manageDays">管理时间 ↓</option>
          </select>
        </span>
      </div>
    </div>

    <!-- 状态 -->
    <div class="status-bar">
      <template v-if="loading"><span class="loading">数据加载中…</span></template>
      <template v-else-if="error"><span class="error">加载失败：{{ error }}</span></template>
      <template v-else>
        <span>共 <b>{{ filtered.length }}</b> 位经理（已加载 {{ rawAll.length }} 条）</span>
        <span class="muted">数据来源：东方财富基金经理接口（在线，不落库）</span>
      </template>
    </div>

    <!-- 结果表 -->
    <div v-if="!loading && !error" class="result-wrap">
      <table class="result-table">
        <thead>
          <tr>
            <th>经理</th>
            <th>所属公司</th>
            <th class="num">现任产品</th>
            <th>管理时间</th>
            <th class="num">管理总规模</th>
            <th class="num">最佳回报</th>
            <th>最佳回报基金</th>
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
            <td class="best-fund">{{ m.bestReturnFund || '—' }}</td>
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

// 10 个筛选维度
const f = reactive({
  company: '', name: '', managerId: '', fund: '',
  countMin: '', countMax: '',
  yearsMin: '', yearsMax: '',
  scaleMin: '', scaleMax: '',
  retMin: '', retMax: '',
  bestFund: '',
})

const rawAll = ref([])        // 当前类型已加载的全部数据
const loading = ref(false)
const error = ref('')
const sortKey = ref('bestReturn')
const currentPage = ref(1)
const pageSize = 100

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

function fetchManagers({ ft, com = '', input = '' }) {
  const params = new URLSearchParams()
  params.set('ft', ft)
  params.set('pn', '10000')   // 单页最大 10000 条，一次拉全部
  params.set('pi', '1')
  params.set('mc', 'returnjson')
  if (com) params.set('com', com)
  if (input) params.set('input', input)
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
  const countMin = toNum(f.countMin), countMax = toNum(f.countMax)
  const yearsMin = toNum(f.yearsMin), yearsMax = toNum(f.yearsMax)
  const scaleMin = toNum(f.scaleMin), scaleMax = toNum(f.scaleMax)
  const retMin = toNum(f.retMin), retMax = toNum(f.retMax)

  return list.filter(m => {
    if (company && !String(m.company).includes(company)) return false
    if (name && !String(m.name).includes(name)) return false
    if (mid && !String(m.id).includes(mid)) return false
    if (fund) {
      const hit = m.fundCodes.some(c => c.includes(fund)) || m.fundNames.some(n => n.includes(fund))
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

function sortList(list) {
  const arr = list.slice()
  arr.sort((a, b) => {
    let va, vb
    switch (sortKey.value) {
      case 'scale': va = parseScale(a.scale); vb = parseScale(b.scale); break
      case 'fundCount': va = a.fundCount; vb = b.fundCount; break
      case 'manageDays': va = a.manageDays; vb = b.manageDays; break
      case 'bestReturn':
      default: va = parsePct(a.bestReturn); vb = parsePct(b.bestReturn); break
    }
    if (isNaN(va)) va = -Infinity
    if (isNaN(vb)) vb = -Infinity
    return vb - va
  })
  return arr
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

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    rawAll.value = await fetchManagers({ ft: type.value })
    currentPage.value = 1
  } catch (e) {
    error.value = (e && e.message) || String(e)
    rawAll.value = []
  } finally {
    loading.value = false
  }
}

// 点确认：按公司/姓名向服务端再次精确拉取，再叠加其余 8 维客户端过滤
async function confirmFilter() {
  loading.value = true
  error.value = ''
  try {
    rawAll.value = await fetchManagers({ ft: type.value, com: f.company.trim(), input: f.name.trim() })
    currentPage.value = 1
    toast(`已重新拉取并筛选，共 ${filtered.value.length} 位经理`)
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
  f.company = ''; f.name = ''; f.managerId = ''; f.fund = ''
  f.countMin = ''; f.countMax = ''
  f.yearsMin = ''; f.yearsMax = ''
  f.scaleMin = ''; f.scaleMax = ''
  f.retMin = ''; f.retMax = ''
  f.bestFund = ''
  currentPage.value = 1
}

// 输入即时筛选（基于已加载全量，结果准确）
watch(() => [
  f.company, f.name, f.managerId, f.fund, f.bestFund,
  f.countMin, f.countMax, f.yearsMin, f.yearsMax, f.scaleMin, f.scaleMax, f.retMin, f.retMax,
  sortKey.value,
], () => { currentPage.value = 1 })

onMounted(loadAll)
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
.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px 16px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 13px; font-weight: 700; color: #0b0c0c; }
.field input, .field select { padding: 8px 10px; border: 1px solid #b1b4b6; font-size: 14px; }
.field input:focus { outline: 3px solid #ffdd00; outline-offset: 0; border-color: var(--brand, #1d70b8); }
.readonly-val { padding: 8px 10px; background: #f3f2f1; border: 1px solid var(--border, #ccc); font-weight: 700; }
.range { display: flex; align-items: center; gap: 6px; }
.range input { width: 100%; }
.range span { color: var(--text-secondary, #505a5a); }

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
.result-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.result-table th, .result-table td { border: 1px solid var(--border, #ccc); padding: 8px 10px; text-align: left; vertical-align: top; }
.result-table thead th { background: #f3f2f1; font-weight: 700; }
.result-table .num { text-align: right; white-space: nowrap; }
.result-table a { color: var(--brand, #1d70b8); text-decoration: none; }
.result-table a:hover { text-decoration: underline; }
.sub-id { display: block; font-size: 12px; color: var(--text-secondary, #505a5a); }
.best-fund { color: #0b0c0c; }
.pos { color: #d4351c; font-weight: 700; }  /* 涨：红 */
.neg { color: #00703c; font-weight: 700; }  /* 跌：绿 */
.empty { text-align: center; color: var(--text-secondary, #505a5a); padding: 24px; }

/* 分页 */
.pager { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 14px; }
.pager button { padding: 6px 14px; border: 1px solid var(--brand, #1d70b8); background: #fff; color: var(--brand, #1d70b8); cursor: pointer; }
.pager button:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 768px) {
  .filter-grid { grid-template-columns: 1fr 1fr; }
  .sort-wrap { margin-left: 0; }
}
</style>
