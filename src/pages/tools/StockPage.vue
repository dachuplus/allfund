<template>
  <div class="stock-page">
    <!-- 标题 + 数据日期 -->
    <div class="sp-head">
      <h2 class="sp-title">股票选品 · 靠谱成长指数</h2>
      <div class="sp-meta">
        <span v-if="dataDate">数据日期：{{ dataDate }}</span>
        <span class="sp-sep">·</span>
        <span>沪深京 A 股 + 港股全市场，共 {{ marketTotalLabel }} 只</span>
        <span v-if="dataPeriod" class="sp-sep">·</span>
        <span v-if="dataPeriod">最新报告期：{{ dataPeriod }}</span>
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
      <div class="sp-seg">
        <button
          v-for="e in exchanges"
          :key="e.key"
          :class="['sp-seg-btn', { active: exchange === e.key }]"
          type="button"
          @click="setExchange(e.key)"
        >{{ e.label }}</button>
      </div>
      <label class="sp-check">
        <input v-model="onlyScored" type="checkbox" @change="load" />
        <span>仅看有评分</span>
      </label>
      <button class="sp-toggle" type="button" @click="toggleCols">
        {{ allCols ? '精简列' : '全部列' }}
      </button>
      <span class="sp-count">显示 {{ rows.length }} 条</span>
    </div>

    <!-- 高级筛选行 -->
    <div class="sp-filters sp-filters-2">
      <label class="sp-filter-item">
        <span class="sp-filter-label">靠谱指数 ≥</span>
        <input v-model="kAllMin" class="sp-num" type="number" min="0" max="100" step="1" placeholder="0" @change="onFilterChange" />
      </label>
      <label class="sp-filter-item">
        <span class="sp-filter-label">总市值(亿)</span>
        <select v-model="mktcapPreset" class="sp-sel" @change="onMktcapPreset">
          <option value="all">全部</option>
          <option value="large">大盘 ≥200</option>
          <option value="mid">中盘 50–200</option>
          <option value="small">小盘 &lt;50</option>
        </select>
      </label>
      <label class="sp-filter-item">
        <span class="sp-filter-label">风险</span>
        <select v-model="riskMode" class="sp-sel" @change="onFilterChange">
          <option value="all">全部</option>
          <option value="clean">排除风险股</option>
          <option value="risk">仅看风险股</option>
        </select>
      </label>
      <span class="sp-count2">
        筛选结果 <b>{{ totalLabel }}</b> 只<template v-if="industries.length">（行业 {{ industries.length }} 个）</template>
        <template v-if="hasAnyFilter">
          <button class="sp-clear" type="button" @click="resetFilters">清空筛选</button>
        </template>
      </span>
    </div>

    <!-- 行业筛选弹层 -->
    <div v-if="showIndustryPanel" class="sp-ind-panel">
      <div class="sp-ind-head">
        <input v-model="industrySearch" class="sp-ind-search" type="text" placeholder="搜索行业" />
        <button class="sp-ind-btn" type="button" @click="selectAllIndustries">全选</button>
        <button class="sp-ind-btn" type="button" @click="clearIndustries">清空</button>
        <button class="sp-ind-btn" type="button" @click="showIndustryPanel = false">收起</button>
        <span class="sp-ind-stat">已选 {{ industries.length }} / {{ industryList.length }}</span>
      </div>
      <div class="sp-ind-list">
        <label v-for="ind in filteredIndustries" :key="ind" class="sp-ind-opt">
          <input type="checkbox" :value="ind" v-model="industries" @change="onIndChange" />
          <span>{{ ind }}</span>
        </label>
        <div v-if="!filteredIndustries.length" class="sp-ind-empty">无匹配行业</div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="sp-tablewrap">
      <table class="sp-table">
        <thead>
          <tr>
            <th
              v-for="c in cols"
              :key="c.key"
              :class="[c.num ? 'num' : '', c.key === 'k_all' ? 'col-score' : '', 'sortable', sortCls(c.key), { 'col-filterable': c.filterable, 'col-filter-on': c.filterable && industries.length }]"
              @click="onHeaderClick(c.key)"
            >
              <span class="th-label">{{ c.label }}</span>
              <span v-if="c.filterable && industries.length" class="th-badge">{{ industries.length }}</span>
              <span v-else-if="c.filterable" class="th-filter-ico" aria-hidden="true">▾</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.code">
            <template v-for="c in cols" :key="c.key">
              <td v-if="c.key === 'code'" class="col-code">
                <a
                  v-if="emUrl(row)"
                  class="sp-link"
                  :href="emUrl(row)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="'在东方财富查看 ' + cleanName(row.name) + ' 行情'"
                >{{ row.code }}</a>
                <span v-else>{{ row.code }}</span>
              </td>
              <td v-else-if="c.key === 'name'" class="col-name">
                <a
                  v-if="emUrl(row)"
                  class="sp-link"
                  :href="emUrl(row)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="'在东方财富查看 ' + cleanName(row.name) + ' 行情'"
                >{{ cleanName(row.name) }}</a>
                <span v-else>{{ cleanName(row.name) }}</span>
              </td>
              <td v-else-if="c.key === 'exchange'" class="col-exch">{{ exchLabel(row.exchange) }}</td>
              <td v-else-if="c.key === 'mktcap'" class="num">{{ fmtMktcap(row.mktcap) }}</td>
              <td v-else-if="c.key === 'industry'" class="col-ind">{{ row.industry || '--' }}</td>
              <td v-else-if="c.key === 'k_all'" class="num col-score">
                <span class="score-val" :style="scoreColor(row.k_all)">{{ fmtScore(row.k_all) }}</span>
              </td>
              <td v-else-if="c.key === 'risk_flag'" class="col-risk">
                <span v-if="!row.risk_flag" class="risk-none">—</span>
                <span v-else class="risk-flag">{{ riskLabel(row.risk_flag) }}</span>
              </td>
              <td v-else-if="c.key === 'return_1y'" class="num" :class="signClass(row.return_1y)">
                {{ fmtPct(row.return_1y) }}
              </td>
              <td v-else-if="c.key === 'max_drawdown'" class="num neg">{{ fmtDD(row.max_drawdown) }}</td>
              <td v-else-if="c.key === 'sharpe'" class="num">{{ fmtSR(row.sharpe) }}</td>
              <td v-else class="num">{{ fmtPct2(row[c.key]) }}</td>
            </template>
          </tr>
          <tr v-if="!loading && rows.length === 0">
            <td :colspan="cols.length" class="sp-empty">暂无数据</td>
          </tr>
          <tr v-if="loading">
            <td :colspan="cols.length" class="sp-empty">加载中…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="sp-pager">
      <button class="sp-pg-btn" :disabled="currentPage <= 1" type="button" @click="goPage(1)">首页</button>
      <button class="sp-pg-btn" :disabled="currentPage <= 1" type="button" @click="goPage(currentPage - 1)">上一页</button>
      <span class="sp-pager-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button class="sp-pg-btn" :disabled="currentPage >= totalPages" type="button" @click="goPage(currentPage + 1)">下一页</button>
      <select v-model.number="pageSize" class="sp-pagesize" @change="goPage(1)">
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
        <option :value="100">100 条/页</option>
      </select>
    </div>

    <div class="sp-note">
      <p class="sp-note-p">
        <b>评分口径</b>：靠谱成长指数为股票专属模型，与基金评分公式不同。先对全市场做横截面百分位（0–100），再按下列权重加权：
        <b>成长 30%</b>（营收同比、净利同比、近3年净利复合增速）、
        <b>质量 25%</b>（ROE、毛利率、经营现金流 / 净利润）、
        <b>健康 20%</b>（资产负债率反向、连续亏损年数反向）、
        <b>估值 15%</b>（PE-TTM、PB、PEG 均反向）、
        <b>动量 10%</b>（近1年收益、近1年最大回撤反向、近1年夏普）。
        缺失维度按权重重新归一化；成长与质量任一缺失则不给出总分。
      </p>
      <p class="sp-note-p">
        <b>覆盖范围</b>：沪深京 A 股 + 香港市场全市场，剔除无有效报价（退市/长期停牌）标的。
        顶部只数为<b>四市场全量</b>，不随任何筛选变化；筛选后的结果只数显示在<b>筛选条件行右侧</b>。
      </p>
      <p class="sp-note-p">
        <b>报告期口径</b>：营收同比 / 净利同比取<b>最新一期已披露报告</b>；ROE、毛利率、资产负债率
        取<b>最近一期年报</b>——因半年累计口径的 ROE 与全年 ROE 不可比，跨市场横截面排名必须同口径。
        <b>香港市场只披露中报（6/30）与年报（12/31），不披露季报</b>；A 股四季齐全。
        因此「最新报告期」在两地的含义一致但披露节奏不同：每年 1–4 月两地同看上一年度年报，
        5–8 月后 A 股看季报 / 港股看中报，10 月后 A 股三季报陆续披露而港股仍为中报。
        单只股票的实际报告期见其财务数据，未披露最新期的沿用上一期年报。
      </p>
      <p class="sp-note-p">
        <b>风险标记</b>：ST / 退市 / 停牌 / 上市未满60日 / 连续两年亏损的股票<b>保留展示但排序置底</b>，并在此列标注。
        评分仅反映公开历史数据的相对位置，不构成任何投资建议，不代表未来表现。
      </p>
      <p class="sp-note-p">
        <b>行情跳转</b>：点击表格中的<b>代码</b>或<b>名称</b>可在新标签页打开东方财富对应行情页
        （沪 quote.eastmoney.com/sh600519.html、深 quote.eastmoney.com/sz300750.html、
        京 quote.eastmoney.com/bj/920045.html、港 quote.eastmoney.com/hk/01815.html），跳转目标为第三方公开行情页。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchStockScores, fetchStockIndustries, fetchStockMarketTotal } from '../../api/data.js'
import { fmtScore, fmtNum, fmtDD, fmtSR, scoreColor } from '../../utils/format.js'

// 报告期 → 披露口径名称（港股只披露年报与中报，A 股四季齐全）
const PERIOD_NAME = { '12-31': '年报', '09-30': '三季报', '06-30': '中报', '03-31': '一季报' }

const exchanges = [
  { key: 'ALL', label: '全部' },
  { key: 'SH', label: '沪' },
  { key: 'SZ', label: '深' },
  { key: 'BJ', label: '京' },
  { key: 'HK', label: '港' },
]

// group: 'base' 精简视图；'extra' 仅在「全部列」下出现
const COLUMNS = [
  { key: 'code', label: '代码', num: false, group: 'base' },
  { key: 'name', label: '名称', num: false, group: 'base' },
  { key: 'exchange', label: '市场', num: false, group: 'base' },
  { key: 'industry', label: '行业', num: false, group: 'base', filterable: true },
  { key: 'mktcap', label: '总市值(亿)', num: true, group: 'base' },
  { key: 'k_all', label: '靠谱指数', num: true, group: 'base' },
  { key: 'k_growth', label: '成长', num: true, group: 'base' },
  { key: 'k_quality', label: '质量', num: true, group: 'base' },
  { key: 'k_safety', label: '健康', num: true, group: 'base' },
  { key: 'k_value', label: '估值', num: true, group: 'base' },
  { key: 'k_momentum', label: '动量', num: true, group: 'base' },
  { key: 'rev_yoy', label: '营收同比%', num: true, group: 'base' },
  { key: 'profit_yoy', label: '净利同比%', num: true, group: 'base' },
  { key: 'roe', label: 'ROE%', num: true, group: 'base' },
  { key: 'gross_margin', label: '毛利率%', num: true, group: 'base' },
  { key: 'debt_ratio', label: '负债率%', num: true, group: 'base' },
  { key: 'return_1y', label: '近1年%', num: true, group: 'base' },
  { key: 'risk_flag', label: '风险', num: false, group: 'base' },
  { key: 'profit_cagr_3y', label: '3年净利复合%', num: true, group: 'extra' },
  { key: 'peg', label: 'PEG', num: true, group: 'extra' },
  { key: 'ocf_to_profit', label: '现金流/净利', num: true, group: 'extra' },
  { key: 'pe_ttm', label: 'PE(TTM)', num: true, group: 'extra' },
  { key: 'pb', label: 'PB', num: true, group: 'extra' },
  { key: 'max_drawdown', label: '最大回撤%', num: true, group: 'extra' },
  { key: 'sharpe', label: '夏普', num: true, group: 'extra' },
]

const allCols = ref(false)
const cols = computed(() => COLUMNS.filter((c) => allCols.value || c.group === 'base'))

const loading = ref(false)
const rows = ref([])
const marketTotal = ref(null)   // 四市场全量（顶部固定展示，不随筛选变化）
const total = ref(null)         // 当前筛选条件下的结果数（展示在筛选行）
const hasMore = ref(false)
const search = ref('')
const exchange = ref('ALL')
const onlyScored = ref(false)
const kAllMin = ref('')
const kAllMax = ref('')
const mktcapPreset = ref('all')
const mktcapMin = ref(null)
const mktcapMax = ref(null)
const riskMode = ref('all')
const industries = ref([])
const industryList = ref([])
const showIndustryPanel = ref(false)
const industrySearch = ref('')
const sortKey = ref('k_all')
const sortAsc = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)

const totalLabel = computed(() => (total.value == null ? '—' : total.value.toLocaleString()))
const marketTotalLabel = computed(() => (marketTotal.value == null ? '—' : marketTotal.value.toLocaleString()))
const hasAnyFilter = computed(() =>
  !!search.value.trim() || exchange.value !== 'ALL' || onlyScored.value ||
  (kAllMin.value !== '' && kAllMin.value != null) ||
  mktcapPreset.value !== 'all' || riskMode.value !== 'all' || industries.value.length > 0
)
const totalPages = computed(() => {
  if (total.value != null) return Math.max(1, Math.ceil(total.value / pageSize.value))
  // 总数不可得时（RPC 异常）退化为「有无下一页」
  return Math.max(1, currentPage.value + (hasMore.value ? 1 : 0))
})

const dataDate = computed(() => {
  if (!rows.value.length) return ''
  const d = rows.value[0].updated_at
  return d ? String(d).slice(0, 10) : ''
})
const finPeriod = computed(() => {
  for (const r of rows.value) {
    if (r.fin_period) return String(r.fin_period).slice(0, 10)
  }
  return ''
})

// 覆盖范围在顶部固定写「沪深京 A 股 + 港股全市场」+ 全量只数，不受筛选影响。
// 报告期：A 股与港股目前同为最新一期已披露报告（中报/季报，随披露进度推进）。
const dataPeriod = computed(() => {
  if (!finPeriod.value) return ''
  const md = finPeriod.value.slice(5)
  const nm = PERIOD_NAME[md]
  return nm ? finPeriod.value + '（' + nm + '）' : finPeriod.value
})

async function loadMarketTotal() {
  try {
    marketTotal.value = await fetchStockMarketTotal()
  } catch (e) {
    console.warn('[StockPage] 全市场总数获取失败:', e)
  }
}

// 行业多选：搜索框按输入过滤候选，勾选后即时重查
const filteredIndustries = computed(() => {
  const kw = industrySearch.value.trim().toLowerCase()
  if (!kw) return industryList.value
  return industryList.value.filter((i) => String(i).toLowerCase().includes(kw))
})

async function loadIndustryList() {
  try {
    industryList.value = await fetchStockIndustries()
  } catch (e) {
    console.warn('[StockPage] 行业列表加载失败:', e)
  }
}

function onHeaderClick(key) {
  if (key === 'industry') {
    showIndustryPanel.value = !showIndustryPanel.value
    return
  }
  sortBy(key)
}
function onIndChange() { currentPage.value = 1; load() }
function selectAllIndustries() {
  industries.value = filteredIndustries.value.slice()
  onIndChange()
}
function clearIndustries() {
  industries.value = []
  onIndChange()
}
function resetFilters() {
  search.value = ''
  exchange.value = 'ALL'
  onlyScored.value = false
  kAllMin.value = ''
  mktcapPreset.value = 'all'
  mktcapMin.value = null
  mktcapMax.value = null
  riskMode.value = 'all'
  industries.value = []
  currentPage.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchStockScores({
      search: search.value.trim(),
      exchange: exchange.value,
      sortKey: sortKey.value,
      sortAsc: sortAsc.value,
      page: currentPage.value,
      pageSize: pageSize.value,
      bottomRisk: true,
      onlyScored: onlyScored.value,
      kAllMin: kAllMin.value,
      kAllMax: kAllMax.value,
      mktcapMin: mktcapMin.value,
      mktcapMax: mktcapMax.value,
      riskMode: riskMode.value,
      industries: industries.value,
    })
    rows.value = res.rows || []
    total.value = res.total
    hasMore.value = !!res.hasMore
  } catch (e) {
    console.error('[StockPage] 加载股票评分失败:', e)
    rows.value = []
    total.value = null
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; load() }, 300)
}
function setExchange(key) { exchange.value = key; currentPage.value = 1; load() }
function goPage(p) { currentPage.value = Math.max(1, p); load() }
function toggleCols() { allCols.value = !allCols.value }
function onFilterChange() { currentPage.value = 1; load() }
function onMktcapPreset() {
  const m = {
    all: [null, null],
    large: [200, null],
    mid: [50, 200],
    small: [null, 50],
  }[mktcapPreset.value] || [null, null]
  mktcapMin.value = m[0]
  mktcapMax.value = m[1]
  onFilterChange()
}
function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = false }
  currentPage.value = 1
  load()
}
function sortCls(key) {
  return sortKey.value === key ? (sortAsc.value ? 'sort-asc' : 'sort-desc') : ''
}

function cleanName(n) { return (n || '').replace(/\s+/g, '') }
function fmtMktcap(v) {
  if (v == null || v === '') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
}
function exchLabel(e) { return { SH: '沪', SZ: '深', BJ: '京', HK: '港' }[e] || e || '--' }

/**
 * 东方财富行情页链接（代码 / 名称两列共用）。2026-10 实测各市场可用格式：
 *   沪 A  https://quote.eastmoney.com/sh600519.html
 *   深 A  https://quote.eastmoney.com/sz300750.html
 *   京 A  https://quote.eastmoney.com/bj/920045.html   ⚠️ 北交所有斜杠，bj920045 已 404
 *   港股  https://quote.eastmoney.com/hk/01815.html     ⚠️ 旧式 /q/116.01815 已废弃
 * 代码后缀与 exchange 字段互为兜底：任一缺失都能推出市场，推不出则返回空串（降级为纯文本）。
 */
function emUrl(row) {
  const raw = String((row && row.code) || '').trim()
  if (!raw) return ''
  let ex = String((row && row.exchange) || '').toUpperCase()
  const m = raw.match(/\.(SH|SZ|BJ|HK)$/i)
  const suffix = m ? m[1].toUpperCase() : ''
  if (!ex && suffix) ex = suffix
  if (!ex) return ''
  const c = raw.replace(/\.(SH|SZ|BJ|HK)$/i, '').trim()
  if (!c) return ''
  if (ex === 'HK') return 'https://quote.eastmoney.com/hk/' + c + '.html'
  const pref = ex === 'SH' ? 'sh' : ex === 'SZ' ? 'sz' : ex === 'BJ' ? 'bj/' : ''
  if (!pref) return ''
  return 'https://quote.eastmoney.com/' + pref + c + '.html'
}
/** 基本面/估值等无量纲列：保留两位小数，不补 %（表头已标注单位） */
function fmtPct2(v) {
  if (v == null || v === '') return '--'
  const n = parseFloat(v)
  if (isNaN(n)) return '--'
  return n.toFixed(2)
}
// 股票 return_*/max_drawdown 在库中已为「百分比数值」（如 361.22 表示 +361.22%）
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
const RISK_MAP = { ST: 'ST', DELISTED: '退市', SUSPENDED: '停牌', NEW: '次新', LOSS2: '连亏' }
function riskLabel(flag) {
  if (!flag) return ''
  return String(flag).split(',').map((k) => RISK_MAP[k] || k).join('·')
}

onMounted(() => { load(); loadIndustryList(); loadMarketTotal() })
watch(pageSize, () => { currentPage.value = 1 })
</script>

<style scoped>
.stock-page {
  width: 100%;
  max-width: 1400px;
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
.sp-meta { font-size: 13px; color: var(--text-secondary, #505a5f); }
.sp-sep { color: var(--text-muted, #b1b4b6); margin: 0 4px; }
.sp-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.sp-filters-2 {
  margin-top: 0;
  margin-bottom: 14px;
  padding-top: 2px;
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
.sp-search:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.sp-seg { display: flex; }
.sp-seg-btn {
  border: 2px solid #0b0c0c;
  border-right-width: 0;
  background: #fff;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary, #505a5f);
  cursor: pointer;
}
.sp-seg-btn:last-child { border-right-width: 2px; }
.sp-seg-btn.active { background: #1d70b8; color: #fff; }
.sp-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
}
.sp-filter-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary, #0b0c0c);
  white-space: nowrap;
}
.sp-filter-label { color: var(--text-secondary, #505a5f); }
.sp-num {
  width: 72px;
  border: 2px solid #0b0c0c;
  padding: 7px 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}
.sp-num:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.sp-sel {
  border: 2px solid #0b0c0c;
  padding: 7px 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}
.sp-sel:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.sp-toggle {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
}
.sp-count { font-size: 13px; color: var(--text-secondary, #505a5f); margin-left: auto; }
.sp-count2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
  margin-left: auto;
}
.sp-count2 b { color: var(--text-primary, #0b0c0c); font-size: 15px; }
.sp-clear {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0b0c0c;
  cursor: pointer;
}
.sp-clear:hover { background: #f3f2f1; }
.sp-tablewrap { overflow-x: auto; border: 1px solid var(--border, #d6d6d6); }
.sp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
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
.col-code { color: var(--text-secondary, #505a5f); white-space: nowrap; }
.sp-link {
  color: #1d70b8;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.sp-link:hover { text-decoration-thickness: 3px; color: #003078; }
.sp-link:focus { outline: 3px solid #ffdd00; outline-offset: 0; background: #ffdd00; }
.col-ind { color: var(--text-secondary, #505a5f); max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.col-score { width: 84px; text-align: center !important; }
.col-score .score-val { font-weight: 700; font-size: 14px; }
.col-risk { text-align: center; }
.risk-flag {
  display: inline-block;
  background: #f3f2f1;
  border: 1px solid #b1b4b6;
  color: #505a5f;
  font-size: 12px;
  padding: 1px 6px;
  white-space: nowrap;
}
.risk-none { color: var(--text-muted, #b1b4b6); }
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
.sp-note-p { margin: 0 0 8px; }
.sp-note-p:last-child { margin-bottom: 0; }

/* 表头可筛选列 */
.sp-table thead th.col-filterable { cursor: pointer; user-select: none; }
.sp-table thead th.col-filterable:hover { color: #1d70b8; }
.sp-table thead th.col-filter-on { background: #1d70b8; color: #fff; }
.sp-table thead th.col-filter-on:hover { color: #fff; }
.th-label { white-space: nowrap; }
.th-filter-ico { margin-left: 4px; font-size: 10px; opacity: 0.75; }
.th-badge {
  display: inline-block;
  margin-left: 5px;
  min-width: 16px;
  padding: 0 4px;
  background: #ffdd00;
  color: #0b0c0c;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
/* 行业多选弹层 */
.sp-ind-panel {
  border: 2px solid #0b0c0c;
  background: #fff;
  margin: 0 0 14px;
  padding: 10px 12px;
}
.sp-ind-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.sp-ind-search {
  flex: 1;
  min-width: 160px;
  border: 2px solid #0b0c0c;
  padding: 7px 10px;
  font-size: 14px;
  font-family: inherit;
}
.sp-ind-search:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.sp-ind-btn {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #0b0c0c;
  cursor: pointer;
  white-space: nowrap;
}
.sp-ind-btn:hover { background: #f3f2f1; }
.sp-ind-stat { font-size: 13px; color: #505a5f; margin-left: auto; }
.sp-ind-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  max-height: 260px;
  overflow-y: auto;
}
.sp-ind-opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #0b0c0c;
  cursor: pointer;
  white-space: nowrap;
}
.sp-ind-empty { font-size: 13px; color: #505a5f; padding: 6px 0; }

@media (max-width: 768px) {
  .sp-title { font-size: 20px; }
  .sp-count { width: 100%; margin-left: 0; }
}
</style>
