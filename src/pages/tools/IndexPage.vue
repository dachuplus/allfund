<template>
  <div class="index-page">
    <!-- 标题 + 数据日期 -->
    <div class="ix-head">
      <h2 class="ix-title">指数选品 · 靠谱指数</h2>
      <div class="ix-meta">
        <span v-if="dataDate">数据日期：{{ dataDate }}</span>
        <span class="ix-sep">·</span>
        <span>{{ poolLabel }}池，共 {{ poolTotalLabel }} 只</span>
        <span class="ix-sep">·</span>
        <span>中证指数官方成分与估值口径</span>
      </div>
    </div>

    <!-- 池切换：⚠️ 三个池各自标准化，分数不可横向比较 -->
    <nav class="ix-pools" aria-label="指数分类">
      <button
        v-for="p in INDEX_POOLS"
        :key="p.key"
        type="button"
        class="ix-pool"
        :class="{ active: pool === p.key }"
        :title="p.desc"
        @click="switchPool(p.key)"
      >{{ p.label }}<span class="ix-pool-n">（{{ poolCounts[p.key] ?? '—' }}）</span></button>
    </nav>
    <p class="ix-pool-tip">{{ poolDesc }}。各池独立标准化，<b>跨池分数不可直接比较</b>。</p>

    <!-- 筛选栏 -->
    <div class="ix-filters">
      <input
        v-model="search"
        class="ix-search"
        type="text"
        placeholder="搜索指数名称"
        @input="onSearchInput"
      />
      <label class="ix-check">
        <input v-model="onlyScored" type="checkbox" @change="onFilterChange" />
        <span>仅看有评分</span>
      </label>
      <button class="ix-toggle" type="button" @click="toggleCols">
        {{ allCols ? '精简列' : '全部列' }}
      </button>
      <span class="ix-count">显示 {{ rows.length }} 条</span>
    </div>

    <!-- 高级筛选行 -->
    <div class="ix-filters ix-filters-2">
      <label class="ix-filter-item">
        <span class="ix-filter-label">靠谱指数 ≥</span>
        <input v-model="kAllMin" class="ix-num" type="number" min="0" max="100" step="1" placeholder="0" @change="onFilterChange" />
      </label>
      <label class="ix-filter-item">
        <span class="ix-filter-label">分档</span>
        <select v-model="grade" class="ix-sel" @change="onFilterChange">
          <option value="all">全部</option>
          <option value="A">A（85–100）</option>
          <option value="B">B（70–84）</option>
          <option value="C">C（55–69）</option>
          <option value="D">D（40–54）</option>
          <option value="E">E（0–39）</option>
        </select>
      </label>
      <label class="ix-filter-item">
        <span class="ix-filter-label">分类</span>
        <select v-model="indexClass" class="ix-sel" @change="onFilterChange">
          <option value="all">全部</option>
          <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <span class="ix-count2">
        筛选结果 <b>{{ totalLabel }}</b> 只
        <template v-if="hasAnyFilter">
          <button class="ix-clear" type="button" @click="resetFilters">清空筛选</button>
        </template>
      </span>
    </div>

    <!-- 表格 -->
    <div class="ix-tablewrap">
      <table class="ix-table">
        <thead>
          <tr>
            <th
              v-for="c in cols"
              :key="c.key"
              :class="[c.num ? 'num' : '', c.key === 'k_all' ? 'col-score' : '', 'sortable', sortCls(c.key)]"
              @click="sortBy(c.key)"
            >{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.code">
            <tr class="ix-row" @click="toggleCard(row.code)">
              <td class="col-code">
                <a
                  v-if="csUrl(row.code)"
                  class="ix-link"
                  :href="csUrl(row.code)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="'在 csindex.com.cn 查看 ' + row.name + ' 指数详情'"
                  @click.stop
                >{{ row.code }}</a>
                <span v-else>{{ row.code }}</span>
              </td>
              <td class="col-name">
                <a
                  v-if="csUrl(row.code)"
                  class="ix-link"
                  :href="csUrl(row.code)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >{{ cleanName(row.name) }}</a>
                <span v-else>{{ cleanName(row.name) }}</span>
                <span class="ix-caret">{{ expanded === row.code ? '▴' : '▾' }}</span>
              </td>
              <td class="col-class">{{ row.index_class || '--' }}</td>
              <td class="num">{{ fmtInt(row.cons_number) }}</td>
              <td class="num col-score">
                <span class="score-val" :style="scoreColor(row.k_all)">{{ fmtScore(row.k_all) }}</span>
                <span v-if="row.grade" class="ix-grade" :class="'g' + row.grade">{{ row.grade }}</span>
              </td>
              <td class="num">{{ fmtScore(row.k_growth) }}</td>
              <td class="num">{{ fmtScore(row.k_value) }}</td>
              <td class="num">{{ fmtScore(row.k_mktliq) }}</td>
              <td class="num">{{ fmtScore(row.k_quality) }}</td>
              <td class="num">{{ fmtScore(row.k_dividend) }}</td>
              <td v-if="allCols" class="num">{{ fmtNum(row.pe_index) }}</td>
              <td v-if="allCols" class="num">{{ fmtPct1(row.pe_pct_5y) }}</td>
              <td v-if="allCols" class="num">{{ fmtNum(row.pb) }}</td>
              <td v-if="allCols" class="num">{{ fmtPct2(row.div_yield) }}</td>
              <td v-if="allCols" class="num">{{ fmtNum(row.roe) }}%</td>
              <td v-if="allCols" class="num">{{ fmtNum(row.gross_margin) }}%</td>
              <td v-if="allCols" class="num">{{ fmtNum(row.profit_cagr_3y) }}%</td>
              <td class="num">{{ fmtCap(row.mktcap_total) }}</td>
              <td v-if="allCols" class="num">{{ fmtInt(row.mktcap_weighted) }}</td>
              <td v-if="allCols" class="num">{{ fmtPct1(row.top10_weight) }}</td>
            </tr>
            <!-- 评分卡（展开） -->
            <tr v-if="expanded === row.code" :key="row.code + '-card'" class="ix-card-row">
              <td :colspan="cols.length">
                <div class="ix-card">
                  <div class="ix-card-head">
                    <b>{{ cleanName(row.name) }}</b>
                    <span class="ix-card-code">{{ row.code }}</span>
                    <span class="ix-card-total">总分 {{ fmtScore(row.k_all) }}</span>
                    <span v-if="row.grade" class="ix-grade" :class="'g' + row.grade">{{ row.grade }} 档</span>
                  </div>
                  <div class="ix-card-grid">
                    <div v-for="d in cardDims(row)" :key="d.key" class="ix-card-dim">
                      <div class="ix-card-dim-h">
                        <span>{{ d.label }}</span>
                        <span class="ix-card-dim-w">权重 {{ d.w }}%</span>
                      </div>
                      <div class="ix-card-dim-s" :style="scoreColor(d.score)">{{ fmtScore(d.score) }}</div>
                      <div class="ix-card-bar"><i :style="{ width: Math.max(0, Math.min(100, d.score || 0)) + '%' }"></i></div>
                      <div class="ix-card-dim-n">{{ d.note }}</div>
                    </div>
                  </div>
                  <p class="ix-card-note">{{ cardSummary(row) }}</p>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loading && rows.length === 0">
            <td :colspan="cols.length" class="ix-empty">暂无数据</td>
          </tr>
          <tr v-if="loading">
            <td :colspan="cols.length" class="ix-empty">加载中…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="ix-pager">
      <button class="ix-pg-btn" :disabled="currentPage <= 1" type="button" @click="goPage(1)">首页</button>
      <button class="ix-pg-btn" :disabled="currentPage <= 1" type="button" @click="goPage(currentPage - 1)">上一页</button>
      <span class="ix-pager-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button class="ix-pg-btn" :disabled="currentPage >= totalPages" type="button" @click="goPage(currentPage + 1)">下一页</button>
      <select v-model.number="pageSize" class="ix-pagesize" @change="goPage(1)">
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
        <option :value="100">100 条/页</option>
      </select>
    </div>

    <div class="ix-note">
      <p class="ix-note-p">
        <b>评分口径</b>：指数没有财务报表，因此不使用股票那套营收/ROE 模型，改用<b>成分股基本面加权</b>构建五维：
        <b>成长 25%</b>（近3年净利复合 60% + 营收同比 40%，均按成分股权重缩尾加权）、
        <b>估值 25%</b>（中证官方滚动 PE 近5年分位反向 70% + 成分股加权 PB 反向 30%）、
        <b>市值流动性 15%</b>（加权平均成分股市值 40% + 前十大权重集中度 30% + 成分股数量 30%）、
        <b>质量 20%</b>（ROE 40% + 毛利率 25% + 经营现金流/净利润 20% + 资产负债率反向 15%）、
        <b>股东回报 15%</b>（股息率 70% + 每10股派息 30%）。
        各维度先在<b>所属池内做横截面百分位</b>（0–100），再按权重加权，缺失维度权重重新归一化。
      </p>
      <p class="ix-note-p">
        <b>分池说明</b>：规模/风格/策略/综合类归入<b>规模风格池</b>，行业类归入<b>行业池</b>，利率债/信用债/可转债归入<b>固收池</b>。
        三个池<b>各自独立标准化，分数不可跨池比较</b>——例如中证红利 ROE 天然低于上证50（高分红行业特征），
        若混在一起排名，红利类指数会系统性垫底。切换上方分类即可查看对应池的排名。
      </p>
      <p class="ix-note-p">
        <b>两种市值口径的区别</b>：表格里的<b>总市值</b>是成分股总市值的<b>简单加总</b>，反映指数覆盖的规模；
        评分维里的「加权平均成分股市值」是<b>按权重加权</b>的每股平均市值，用于衡量「典型成分股的大小」，
        两者相差很大（例：上证50 总市值 22.6 万亿，加权平均 0.6 万亿），不是同一件事。
        总市值只统计成功匹配到行情的成分股，未匹配部分不计入。
      </p>
      <p class="ix-note-p">
        <b>分档标准</b>：A 85–100、B 70–84、C 55–69、D 40–54、E 0–39。
        分档仅表示该池内的相对位置，<b>不代表未来收益、不构成投资建议</b>。
      </p>
      <p class="ix-note-p">
        <b>数据来源与口径</b>：成分股与权重、指数估值历史来自中证指数有限公司官网（csindex.com.cn）；
        成分股基本面来自本平台全市场财务数据；股息率与分红比例来自东方财富分红送配（已剔除亏损公司的失真股息率）。
        估值维使用<b>中证官方指数 PE</b>而非成分股 PE 加权（后者因权重结构会显著失真）。
        部分指数股息率绝对值低于中证官方口径（未分红公司按 0 计入拉低），横向排序不受影响。
        行情日期为最近一个交易日的官方收盘。
      </p>
      <p class="ix-note-p">
        评分仅反映公开历史数据的相对位置，<b>不构成任何投资建议，不代表未来表现</b>。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchIndexScores, fetchIndexPoolTotal, fetchIndexClassOptions, INDEX_POOLS } from '../../api/data.js'
import { fmtScore, fmtNum, scoreColor } from '../../utils/format.js'

const pool = ref('broad')
const search = ref('')
const onlyScored = ref(false)
const kAllMin = ref('')
const grade = ref('all')
const allCols = ref(false)
const sortKey = ref('k_all')
const sortAsc = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const rows = ref([])
const total = ref(null)
const hasMore = ref(false)
const loading = ref(false)
const poolCounts = ref({})
const expanded = ref('')
const indexClass = ref('all')
const classOptions = ref([])

const COLUMNS = [
  { key: 'code', label: '代码', num: false, group: 'base' },
  { key: 'name', label: '名称', num: false, group: 'base' },
  { key: 'index_class', label: '分类', num: false, group: 'base' },
  { key: 'cons_number', label: '成分数', num: true, group: 'base' },
  { key: 'k_all', label: '靠谱指数', num: true, group: 'base' },
  { key: 'k_growth', label: '成长', num: true, group: 'base' },
  { key: 'k_value', label: '估值', num: true, group: 'base' },
  { key: 'k_mktliq', label: '市值流动性', num: true, group: 'base' },
  { key: 'k_quality', label: '质量', num: true, group: 'base' },
  { key: 'k_dividend', label: '股东回报', num: true, group: 'base' },
  { key: 'pe_index', label: 'PE(滚动)', num: true, group: 'extra' },
  { key: 'pe_pct_5y', label: 'PE5年分位%', num: true, group: 'extra' },
  { key: 'pb', label: 'PB', num: true, group: 'extra' },
  { key: 'div_yield', label: '股息率%', num: true, group: 'extra' },
  { key: 'roe', label: 'ROE%', num: true, group: 'extra' },
  { key: 'gross_margin', label: '毛利率%', num: true, group: 'extra' },
  { key: 'profit_cagr_3y', label: '3年净利复合%', num: true, group: 'extra' },
  { key: 'mktcap_total', label: '总市值(亿)', num: true, group: 'base' },
  { key: 'mktcap_weighted', label: '加权平均市值(亿)', num: true, group: 'extra' },
  { key: 'top10_weight', label: '前十大集中度%', num: true, group: 'extra' },
]
const cols = computed(() => COLUMNS.filter((c) => allCols.value || c.group === 'base'))

const poolLabel = computed(() => (INDEX_POOLS.find((p) => p.key === pool.value) || {}).label || '')
const poolDesc = computed(() => (INDEX_POOLS.find((p) => p.key === pool.value) || {}).desc || '')
const poolTotalLabel = computed(() =>
  poolCounts.value[pool.value] != null ? poolCounts.value[pool.value].toLocaleString() : '—'
)
const totalLabel = computed(() => (total.value == null ? '—' : total.value.toLocaleString()))
const hasAnyFilter = computed(() =>
  !!search.value.trim() || onlyScored.value || (kAllMin.value !== '' && kAllMin.value != null) || grade.value !== 'all' || (indexClass.value && indexClass.value !== 'all')
)
const totalPages = computed(() => {
  if (total.value != null) return Math.max(1, Math.ceil(total.value / pageSize.value))
  return Math.max(1, currentPage.value + (hasMore.value ? 1 : 0))
})

function fmtTradeDate(v) {
  if (v == null || v === '') return ''
  const s = String(v).trim()
  // 已是带分隔符的日期：YYYY-MM-DD 或 YYYY-M-D（部分环境未补零）
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // 纯 8 位整数 YYYYMMDD
  const digits = s.replace(/\D/g, '')
  if (/^\d{8}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  return s
}
const dataDate = computed(() => {
  for (const r of rows.value) {
    if (r.trade_date) return fmtTradeDate(r.trade_date)
  }
  return ''
})

async function switchPool(k) {
  pool.value = k
  currentPage.value = 1
  expanded.value = ''
  indexClass.value = 'all'
  await loadClassOptions()
  load()
}
function toggleCard(code) { expanded.value = expanded.value === code ? '' : code }
function cleanName(n) { return (n || '').replace(/\s+/g, '') }
/** 中证指数官网详情页：https://www.csindex.com.cn/#/indices/family/detail?indexCode=000300 */
function csUrl(code) {
  if (!code) return ''
  return `https://www.csindex.com.cn/#/indices/family/detail?indexCode=${code}`
}
function fmtInt(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return Math.round(n).toLocaleString('zh-CN')
}
function fmtPct1(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return isNaN(n) ? '—' : n.toFixed(1)
}
/** 小数形式的股息率转百分比显示 */
function fmtPct2(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return isNaN(n) ? '—' : (n * 100).toFixed(2)
}

/**
 * 指数总市值格式化。单位是「亿元」，跨度数大（几十亿 ~ 上百万亿），
 * 故 ≥1 万亿时用「万亿」显示，否则用「亿」，避免一串零看不清。
 */
function fmtCap(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + ' 万亿'
  return Math.round(n).toLocaleString('zh-CN') + ' 亿'
}

function cardDims(row) {
  return [
    { key: 'g', label: '成长性', w: 25, score: row.k_growth,
      note: `3年净利复合 ${fmtNum(row.profit_cagr_3y)}% · 营收同比 ${fmtNum(row.rev_yoy)}%` },
    { key: 'v', label: '估值', w: 25, score: row.k_value,
      note: `PE ${fmtNum(row.pe_index)}（近5年分位 ${fmtPct1(row.pe_pct_5y)}%）· PB ${fmtNum(row.pb)}` },
    { key: 'm', label: '市值流动性', w: 15, score: row.k_mktliq,
      note: `总市值 ${fmtCap(row.mktcap_total)} · 成分 ${fmtInt(row.cons_number)} 只 · 前十大 ${fmtPct1(row.top10_weight)}%` },
    { key: 'q', label: '质量', w: 20, score: row.k_quality,
      note: `ROE ${fmtNum(row.roe)}% · 毛利率 ${fmtNum(row.gross_margin)}% · 负债率 ${fmtNum(row.debt_ratio)}%` },
    { key: 'd', label: '股东回报', w: 15, score: row.k_dividend,
      note: `股息率 ${fmtPct2(row.div_yield)}% · 每10股派 ${fmtNum(row.payout_per10)} 元` },
  ]
}

/** 一句话概述：找出最高维与最低维（张力所在），全部居中时给中性描述。合规：不带推介语。 */
function cardSummary(row) {
  const dims = cardDims(row).filter((d) => d.score != null)
  if (dims.length < 3) return '该指数可用维度不足，未给出总分。'
  const sorted = [...dims].sort((a, b) => b.score - a.score)
  const hi = sorted[0]
  const lo = sorted[sorted.length - 1]
  const nm = cleanName(row.name)
  if (hi.score - lo.score < 12) {
    return `${nm} 各维度表现较为均衡（最高 ${hi.label} ${fmtScore(hi.score)}，最低 ${lo.label} ${fmtScore(lo.score)}），无明显偏向。`
  }
  return `${nm} 在本池内${hi.label}维度相对靠前（${fmtScore(hi.score)} 分），${lo.label}维度相对靠后（${fmtScore(lo.score)} 分）。`
}

async function load() {
  loading.value = true
  try {
    const res = await fetchIndexScores({
      search: search.value.trim(),
      pool: pool.value,
      sortKey: sortKey.value,
      sortAsc: sortAsc.value,
      page: currentPage.value,
      pageSize: pageSize.value,
      onlyScored: onlyScored.value,
      kAllMin: kAllMin.value,
      grade: grade.value,
      indexClass: indexClass.value === 'all' ? '' : indexClass.value,
    })
    rows.value = res.rows || []
    total.value = res.total
    hasMore.value = !!res.hasMore
  } catch (e) {
    console.error('[IndexPage] 加载指数评分失败:', e)
    rows.value = []
    total.value = null
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

async function loadCounts() {
  try {
    const r = await fetchIndexPoolTotal()
    if (r) poolCounts.value = r
  } catch (e) {
    console.warn('[IndexPage] 池统计获取失败:', e)
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; load() }, 300)
}
function onFilterChange() { currentPage.value = 1; load() }
function resetFilters() {
  search.value = ''
  onlyScored.value = false
  kAllMin.value = ''
  grade.value = 'all'
  indexClass.value = 'all'
  currentPage.value = 1
  load()
}
function goPage(p) { currentPage.value = Math.max(1, p); load() }
function toggleCols() { allCols.value = !allCols.value }
function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = false }
  currentPage.value = 1
  load()
}
function sortCls(key) {
  return sortKey.value === key ? (sortAsc.value ? 'sort-asc' : 'sort-desc') : ''
}

async function loadClassOptions() {
  try {
    const opts = await fetchIndexClassOptions(pool.value)
    classOptions.value = opts || []
  } catch (e) {
    console.warn('[IndexPage] 分类选项获取失败:', e)
    classOptions.value = []
  }
}

onMounted(() => {
  loadCounts()
  loadClassOptions()
  load()
})
</script>

<style scoped>
.index-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 4px 0 24px;
}
.ix-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.ix-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  margin: 0;
}
.ix-meta { font-size: 13px; color: var(--text-secondary, #505a5f); }
.ix-sep { color: var(--text-muted, #b1b4b6); margin: 0 4px; }

/* 池切换：Tab 栏窄屏自动折行，底线由每个 tab 自带（与全站规范一致） */
.ix-pools {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  row-gap: 2px;
  margin-bottom: 6px;
}
.ix-pool {
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary, #505a5f);
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 4px solid var(--border, #d6d6d6);
  transition: color 0.15s, border-color 0.15s;
}
.ix-pool:hover { color: var(--text-primary, #0b0c0c); }
.ix-pool.active { color: #1d70b8; border-bottom-color: #1d70b8; }
.ix-pool-n { font-weight: 400; font-size: 13px; }
.ix-pool.active .ix-pool-n { color: #1d70b8; }
.ix-pool-tip {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--text-secondary, #505a5f);
  line-height: 1.6;
}

.ix-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.ix-filters-2 { margin-bottom: 14px; }
.ix-search {
  flex: 1;
  min-width: 180px;
  border: 2px solid #0b0c0c;
  padding: 9px 12px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}
.ix-search:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.ix-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
}
.ix-filter-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary, #0b0c0c);
  white-space: nowrap;
}
.ix-filter-label { color: var(--text-secondary, #505a5f); }
.ix-num {
  width: 72px;
  border: 2px solid #0b0c0c;
  padding: 7px 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}
.ix-num:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.ix-sel {
  border: 2px solid #0b0c0c;
  padding: 7px 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}
.ix-sel:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.ix-toggle {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
}
.ix-count { font-size: 13px; color: var(--text-secondary, #505a5f); margin-left: auto; }
.ix-count2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
  margin-left: auto;
}
.ix-count2 b { color: var(--text-primary, #0b0c0c); font-size: 15px; }
.ix-clear {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0b0c0c;
  cursor: pointer;
}
.ix-clear:hover { background: #f3f2f1; }

.ix-tablewrap { overflow-x: auto; border: 1px solid var(--border, #d6d6d6); }
.ix-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ix-table th,
.ix-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border, #d6d6d6);
  white-space: nowrap;
}
.ix-table thead th {
  text-align: left;
  background: #f3f2f1;
  color: var(--text-primary, #0b0c0c);
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
}
.ix-table th.num,
.ix-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.ix-row { cursor: pointer; }
.ix-row:hover { background: #f8f8f8; }
.col-code { color: var(--text-secondary, #505a5f); }
.col-name { font-weight: 700; color: var(--text-primary, #0b0c0c); }
.col-class { color: var(--text-secondary, #505a5f); }
.ix-caret { color: var(--text-muted, #b1b4b6); font-size: 11px; margin-left: 5px; }
.ix-link {
  color: #1d70b8;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.ix-link:hover { text-decoration-thickness: 3px; color: #003078; }
.col-score { width: 108px; text-align: center !important; }
.col-score .score-val { font-weight: 700; font-size: 14px; }
.ix-grade {
  display: inline-block;
  margin-left: 5px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid #b1b4b6;
  color: #505a5f;
  background: #fff;
}
.ix-grade.gA { border-color: #1d70b8; color: #1d70b8; }
.ix-grade.gB { border-color: #4a90d9; color: #185fa5; }
.ix-grade.gC { border-color: #b1b4b6; color: #505a5f; }
.ix-grade.gD { border-color: #f47738; color: #8a4b00; }
.ix-grade.gE { border-color: #d4351c; color: #d4351c; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: #1d70b8; }
.sort-asc::after { content: ' ▲'; font-size: 10px; color: #1d70b8; }
.sort-desc::after { content: ' ▼'; font-size: 10px; color: #1d70b8; }
.ix-empty {
  text-align: center;
  color: var(--text-secondary, #505a5f);
  padding: 28px 0 !important;
  font-size: 15px;
}

/* 评分卡 */
.ix-card-row td { background: #f8f8f8; white-space: normal; }
.ix-card { padding: 14px 16px; border-left: 4px solid #1d70b8; background: #fff; }
.ix-card-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 16px;
  color: var(--text-primary, #0b0c0c);
}
.ix-card-code { font-size: 13px; color: var(--text-secondary, #505a5f); font-weight: 400; }
.ix-card-total { font-weight: 700; color: #1d70b8; }
.ix-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.ix-card-dim {
  border: 1px solid var(--border, #d6d6d6);
  padding: 10px 12px;
  background: #fff;
}
.ix-card-dim-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary, #0b0c0c);
  font-weight: 700;
}
.ix-card-dim-w { font-weight: 400; font-size: 11px; color: var(--text-secondary, #505a5f); }
.ix-card-dim-s { font-size: 22px; font-weight: 700; margin: 4px 0 6px; }
.ix-card-bar {
  height: 5px;
  background: #f3f2f1;
  border: 1px solid var(--border, #d6d6d6);
  margin-bottom: 6px;
}
.ix-card-bar i { display: block; height: 100%; background: #1d70b8; }
.ix-card-dim-n { font-size: 11px; color: var(--text-secondary, #505a5f); line-height: 1.5; }
.ix-card-note {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
  line-height: 1.6;
}

.ix-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.ix-pg-btn {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 7px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.ix-pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-pager-info { font-size: 14px; color: var(--text-secondary, #505a5f); }
.ix-pagesize {
  border: 2px solid #0b0c0c;
  padding: 6px 8px;
  font-size: 14px;
  font-family: inherit;
}
.ix-note {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-left: 4px solid var(--brand, #1d70b8);
  background: var(--bg-body, #f3f2f1);
  color: var(--text-secondary, #505a5f);
  font-size: 13px;
  line-height: 1.6;
}
.ix-note-p { margin: 0 0 8px; }
.ix-note-p:last-child { margin-bottom: 0; }

@media (max-width: 768px) {
  .ix-title { font-size: 20px; }
  .ix-pool { padding: 8px 12px; font-size: 15px; }
  .ix-search { min-width: 140px; }
}
</style>
