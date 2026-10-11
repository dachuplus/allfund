<template>
  <div class="page-tougu">
    <!-- 页头 -->
    <header class="tg-head">
      <div class="tg-head__row">
        <h1 class="tg-title">投顾产品</h1>
        <span class="tg-help-btn" role="button" tabindex="0"
              @click="showHelp = true" @keydown.enter="showHelp = true">?</span>
      </div>
      <p class="tg-sub">
        <span>数据截止 {{ updateTime || '--' }}</span>
        <span class="tg-sep">·</span>
        <span>{{ totalCount }} 只产品</span>
        <span class="tg-sep">·</span>
        <span>{{ companyCount }} 家管理人</span>
        <span class="tg-sep">·</span>
        <span class="tg-refresh" role="button" tabindex="0"
              @click="loadData" @keydown.enter="loadData">{{ loading ? '加载中…' : '刷新' }}</span>
      </p>
      <p class="tg-source">数据来源：天天基金投顾管家公开信息。仅供参考，不构成投资建议。</p>
    </header>

    <!-- 控制条：分类 / 搜索 / 排序 -->
    <div class="tg-controls">
      <div class="tg-types">
        <button
          v-for="(t, idx) in types" :key="t.key"
          type="button"
          class="tg-type"
          :class="{ 'tg-type--active': currentType === idx }"
          @click="switchType(idx)"
        >{{ t.name }}</button>
      </div>
      <div class="tg-filters">
        <label class="tg-field">
          <span class="tg-field__label">搜索</span>
          <input
            v-model.trim="keyword" type="search" class="tg-field__input"
            placeholder="产品名 / 管理人" @keyup.enter="onSearchEnter"
          />
        </label>
        <label class="tg-field">
          <span class="tg-field__label">排序</span>
          <select v-model="sortKey" class="tg-field__input">
            <option value="return1y">近1年收益 高→低</option>
            <option value="return3m">近3月收益 高→低</option>
            <option value="maxdrawdown">最大回撤 小→大</option>
            <option value="name">名称 A→Z</option>
          </select>
        </label>
      </div>
    </div>

    <!-- 结果计数 -->
    <p class="tg-count" v-if="!loading">
      共 {{ viewList.length }} 只<span v-if="keyword">（关键词「{{ keyword }}」）</span>
    </p>

    <!-- 列表：宽屏表格 / 窄屏卡片 -->
    <div class="tg-list" v-if="!loading">
      <template v-if="viewList.length > 0">
        <div class="tg-table" role="table">
          <div class="tg-thead" role="row">
            <span class="th th-name" role="columnheader">产品 / 管理人</span>
            <span class="th th-type" role="columnheader">分类</span>
            <span class="th th-num" role="columnheader">近3月</span>
            <span class="th th-num" role="columnheader">近1年</span>
            <span class="th th-num" role="columnheader">最大回撤</span>
            <span class="th th-act" role="columnheader">操作</span>
          </div>
          <div
            v-for="item in viewList" :key="item.id || item.name"
            class="tg-row" role="row"
          >
            <span class="td td-name" role="cell">
              <span class="td-name__main">
                <a
                  class="td-name__link" :href="productUrl(item)"
                  target="_blank" rel="noopener noreferrer"
                >{{ item.name }}</a>
                <span
                  v-if="item.desc || (item.tags && item.tags.length)"
                  class="td-name__help" role="button" tabindex="0"
                  title="查看策略说明"
                  @click.stop="openItemHelp(item)" @keydown.enter.stop="openItemHelp(item)"
                >?</span>
              </span>
              <span class="td-name__sub">{{ item.company || '--' }}</span>
            </span>
            <span class="td td-type" role="cell">
              <span class="tg-tag">{{ item.typename || '--' }}</span>
            </span>
            <span class="td td-num" role="cell">
              <span class="td-label">近3月</span>
              <span class="td-value" :class="pctClass(item.return3m)">{{ fmtPctSigned(item.return3m) }}</span>
            </span>
            <span class="td td-num" role="cell">
              <span class="td-label">近1年</span>
              <span class="td-value" :class="pctClass(item.return1y)">{{ fmtPctSigned(item.return1y) }}</span>
            </span>
            <span class="td td-num" role="cell">
              <span class="td-label">最大回撤</span>
              <span class="td-value" :class="item.maxdrawdown != null ? 'is-down' : ''">{{ fmtDrawdown(item.maxdrawdown) }}</span>
            </span>
            <span class="td td-act" role="cell">
              <a class="tg-link" :href="productUrl(item)" target="_blank" rel="noopener noreferrer">查看产品页</a>
            </span>
          </div>
        </div>
      </template>

      <div class="tg-empty" v-else>
        <p class="tg-empty__title">没有符合条件的投顾产品</p>
        <p class="tg-empty__hint">请调整分类或关键词后重试</p>
      </div>
    </div>

    <div class="tg-loading" v-if="loading"><span>正在加载投顾产品…</span></div>

    <!-- 策略说明弹窗 -->
    <Teleport to="body">
      <template v-if="itemHelp">
        <div class="tg-mask" @click="itemHelp = null"></div>
        <div class="tg-panel">
          <div class="tg-panel__head">
            <span class="tg-panel__title">{{ itemHelp.name }}</span>
            <span class="tg-panel__close" role="button" @click="itemHelp = null">
              <SvgIcon name="close" :size="16" />
            </span>
          </div>
          <div class="tg-panel__body">
            <div class="tg-block" v-if="itemHelp.company">
              <span class="tg-block__label">管理人</span>
              <p class="tg-block__text">{{ itemHelp.company }}</p>
            </div>
            <div class="tg-block" v-if="itemHelp.typename">
              <span class="tg-block__label">分类</span>
              <p class="tg-block__text">{{ itemHelp.typename }}</p>
            </div>
            <div class="tg-block" v-if="itemHelp.desc">
              <span class="tg-block__label">策略理念</span>
              <p class="tg-block__text tg-block__text--pre">{{ itemHelp.desc }}</p>
            </div>
            <div class="tg-block" v-if="itemHelp.tags && itemHelp.tags.length">
              <span class="tg-block__label">策略标签</span>
              <div class="tg-tags">
                <span class="tg-tag tg-tag--plain" v-for="tag in itemHelp.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="tg-block">
              <a class="tg-link" :href="productUrl(itemHelp)" target="_blank" rel="noopener noreferrer">查看产品页</a>
            </div>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 页面说明弹窗 -->
    <Teleport to="body">
      <template v-if="showHelp">
        <div class="tg-mask" @click="showHelp = false"></div>
        <div class="tg-panel">
          <div class="tg-panel__head">
            <span class="tg-panel__title">投顾产品说明</span>
            <span class="tg-panel__close" role="button" @click="showHelp = false">
              <SvgIcon name="close" :size="16" />
            </span>
          </div>
          <div class="tg-panel__body">
            <div class="tg-block">
              <span class="tg-block__label">数据来源</span>
              <p class="tg-block__text">天天基金投顾管家公开信息（涵盖全市场投顾组合产品）。</p>
            </div>
            <div class="tg-block">
              <span class="tg-block__label">分类规则</span>
              <p class="tg-block__text">追求高收益：默认分类</p>
              <p class="tg-block__text">稳健理财：含「固收 / 债券 / 低波」等关键词</p>
              <p class="tg-block__text">养老储蓄：含「养老 / 90后 / 80后」等关键词</p>
            </div>
            <div class="tg-block">
              <span class="tg-block__label">收益指标</span>
              <p class="tg-block__text">展示近3月、近1年收益率（阶段真实收益）及最大回撤。无数据显示「--」。</p>
            </div>
            <div class="tg-block">
              <span class="tg-block__label">点击跳转</span>
              <p class="tg-block__text">点击产品名称或「查看产品页」，跳转到该产品在天天基金的对应页面；若该平台未提供公开详情页，则跳转东方财富站内按产品名检索的结果页。</p>
            </div>
            <div class="tg-block">
              <span class="tg-block__label">更新频率</span>
              <p class="tg-block__text">每日自动更新（北京时间 09:00）。数据源无新数据时保留上一次已入库数据，页面顶部始终显示数据截止日期。</p>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchTouguProducts } from '../../api/data.js'
import { fmtPctSigned } from '../../utils/format.js'
import SvgIcon from '../../components/SvgIcon.vue'

const types = [
  { name: '全部',       key: 'all'     },
  { name: '追求高收益', key: 'high'    },
  { name: '稳健理财',   key: 'stable'  },
  { name: '养老储蓄',   key: 'pension' },
]

const currentType = ref(0)
const rawList    = ref([])
const loading    = ref(false)
const updateTime = ref('')
const keyword    = ref('')
const sortKey    = ref('return1y')
const showHelp   = ref(false)
const itemHelp   = ref(null)

const totalCount = computed(() => rawList.value.length)
const companyCount = computed(() => {
  const s = new Set(rawList.value.map(x => x.company).filter(Boolean))
  return s.size
})

// 搜索 + 排序（纯前端，数据源仅百余条，无需服务端下推）
const viewList = computed(() => {
  const kw = (keyword.value || '').toLowerCase()
  let arr = rawList.value.slice()
  if (kw) {
    arr = arr.filter(x =>
      (x.name || '').toLowerCase().includes(kw) ||
      (x.company || '').toLowerCase().includes(kw) ||
      (Array.isArray(x.tags) && x.tags.join(' ').toLowerCase().includes(kw))
    )
  }
  const k = sortKey.value
  const num = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v)
  arr.sort((a, b) => {
    if (k === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN')
    const av = num(a[k]), bv = num(b[k])
    // 空值恒排最后（宁空不假，不参与比较）
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    // 最大回撤为负数，绝对值小（大）者更优 → 降序；收益降序
    return bv - av
  })
  return arr
})

function fmtDrawdown(val) {
  if (val == null) return '--'
  return (val * 100).toFixed(2) + '%'
}

function pctClass(val) {
  if (val == null) return ''
  return val > 0 ? 'is-up' : val < 0 ? 'is-down' : ''
}

// 跳转：优先用库内真实产品页；缺失时按产品名跳转东方财富站内检索
// （不编造详情页地址，宁可给检索页也不给错链）
function productUrl(item) {
  const u = (item && (item.url || '') || '').trim()
  if (u && u !== '#') return u
  return 'https://so.eastmoney.com/web/s?keyword=' + encodeURIComponent(item?.name || '')
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const type = types[currentType.value].key
    const data = await fetchTouguProducts(type === 'all' ? {} : { type })
    rawList.value = data || []
    const dates = rawList.value.map(x => x.updatedate).filter(Boolean).sort()
    updateTime.value = dates.length ? dates[dates.length - 1] : ''
  } catch (e) {
    console.error('[tougu] 加载失败', e)
    rawList.value = []
  } finally {
    loading.value = false
  }
}

function switchType(idx) {
  currentType.value = idx
  loadData()
}

// 中文输入法：回车触发搜索时若正在组词则忽略（避免误触发）
function onSearchEnter(e) {
  if (e && e.isComposing) return
}

function openItemHelp(item) {
  itemHelp.value = item
}

onMounted(loadData)
</script>

<style scoped>
/* ========== gov.uk 风格投顾产品页 ========== */
.page-tougu { padding-bottom: var(--space-2xl); }

/* 页头 */
.tg-head { border-bottom: 1px solid var(--border); padding-bottom: var(--space-sm); }
.tg-head__row { display: flex; align-items: center; gap: 8px; }
.tg-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0; }
@media (min-width: 641px) { .tg-title { font-size: 36px; } }
.tg-help-btn {
  width: 24px; height: 24px; font-size: 14px; font-weight: 700; color: var(--text-secondary);
  border: 2px solid var(--text-secondary); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.tg-sub { margin: 6px 0 0; font-size: 14px; color: var(--text-secondary); }
.tg-sep { margin: 0 6px; }
.tg-refresh { color: var(--link); text-decoration: underline; cursor: pointer; }
.tg-source { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }

/* 控制条 */
.tg-controls {
  display: flex; flex-wrap: wrap; gap: var(--space-md);
  align-items: flex-end; justify-content: space-between;
  padding: var(--space-md) 0;
}
.tg-types { display: flex; flex-wrap: wrap; row-gap: 2px; }
.tg-type {
  padding: var(--space-sm) var(--space-md); font-size: 16px; font-weight: 700;
  color: var(--text-secondary); background: #fff; cursor: pointer; white-space: nowrap;
  border: none; border-bottom: 3px solid var(--border);
}
.tg-type:hover { color: var(--text-primary); }
.tg-type--active { color: #1d70b8; border-bottom-color: #1d70b8; }
.tg-filters { display: flex; flex-wrap: wrap; gap: var(--space-md); }
.tg-field { display: inline-flex; align-items: center; gap: 6px; }
.tg-field__label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.tg-field__input {
  font-size: 14px; padding: 5px 8px; min-width: 160px;
  border: 1px solid var(--border); border-radius: 0; background: #fff; color: var(--text-primary);
}
.tg-field__input:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.tg-count { margin: 0 0 var(--space-sm); font-size: 14px; color: var(--text-secondary); }

/* 列表（表格） */
.tg-list { border-top: 1px solid var(--border); }
.tg-table { display: block; }
.tg-thead, .tg-row {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) 110px 92px 92px 108px 104px;
  gap: var(--space-sm); align-items: center;
  padding: var(--space-sm) 0; border-bottom: 1px solid var(--border);
}
.tg-thead { border-bottom: 2px solid var(--border); }
.th { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.th-num, .th-act { text-align: right; }
.td { font-size: 14px; color: var(--text-primary); min-width: 0; }
.td-name { display: flex; flex-direction: column; gap: 2px; }
.td-name__main { display: flex; align-items: center; gap: 6px; min-width: 0; }
.td-name__link {
  font-size: 17px; font-weight: 700; color: #1d70b8; text-decoration: underline;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.td-name__link:focus { outline: 3px solid #ffdd00; background: #ffdd00; }
.td-name__help {
  flex: 0 0 auto; width: 18px; height: 18px; font-size: 11px; font-weight: 700;
  color: var(--text-secondary); border: 1px solid var(--text-secondary); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.td-name__sub { font-size: 13px; color: var(--text-secondary); }
.td-type { }
.td-num { text-align: right; font-variant-numeric: tabular-nums; }
.td-label { display: none; }
.td-value { font-size: 17px; font-weight: 700; }
.td-value.is-up { color: var(--color-up); }
.td-value.is-down { color: var(--color-down); }
.td-act { text-align: right; }
.tg-link { font-size: 14px; font-weight: 700; color: #1d70b8; text-decoration: underline; white-space: nowrap; }
.tg-link:hover { color: #003078; text-decoration-thickness: 3px; }
.tg-link:focus { outline: 3px solid #ffdd00; background: #ffdd00; }
.tg-tag {
  display: inline-block; padding: 2px 8px; font-size: 13px; font-weight: 700;
  color: #0b0c0c; background: #f3f2f1;
}
.tg-tag--plain { font-weight: 400; background: #fff; border: 1px solid var(--border); }

.tg-loading { display: flex; justify-content: center; padding: var(--space-2xl) 0; font-size: 16px; color: var(--text-secondary); }
.tg-empty { text-align: center; padding: var(--space-2xl); }
.tg-empty__title { font-size: 19px; font-weight: 700; color: var(--text-primary); margin: 0 0 var(--space-sm); }
.tg-empty__hint { font-size: 16px; color: var(--text-secondary); margin: 0; }

/* 窄屏：表格转卡片 */
@media (max-width: 768px) {
  .tg-thead { display: none; }
  .tg-row {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm) var(--space-sm);
    padding: var(--space-md) 0;
  }
  .td-name { grid-column: 1 / -1; }
  .td-type { grid-column: 1 / -1; }
  .td-num { text-align: left; display: flex; flex-direction: column; }
  .td-label { display: block; font-size: 12px; color: var(--text-secondary); }
  .td-act { grid-column: 1 / -1; text-align: left; }
}

/* 弹窗 */
.tg-mask { position: fixed; inset: 0; background: rgba(11,12,12,0.6); z-index: 100; }
.tg-panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100% - 32px); max-width: 600px; max-height: 80vh;
  background: #fff; border: 1px solid var(--border);
  display: flex; flex-direction: column; z-index: 101; overflow: hidden;
}
.tg-panel__head {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border);
  background: #f3f2f1; flex-shrink: 0;
}
.tg-panel__title { font-size: 19px; font-weight: 700; color: var(--text-primary); }
.tg-panel__close { cursor: pointer; line-height: 1; color: var(--text-primary); }
.tg-panel__body { flex: 1; overflow-y: auto; padding: var(--space-lg); }
.tg-block { margin-bottom: var(--space-lg); }
.tg-block:last-child { margin-bottom: 0; }
.tg-block__label {
  display: block; font-size: 17px; font-weight: 700; margin-bottom: var(--space-sm);
  border-bottom: 2px solid var(--border); padding-bottom: 4px; color: var(--text-primary);
}
.tg-block__text { margin: 0 0 4px; font-size: 15px; color: var(--text-primary); line-height: 1.7; }
.tg-block__text--pre { white-space: pre-wrap; }
.tg-tags { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
</style>
