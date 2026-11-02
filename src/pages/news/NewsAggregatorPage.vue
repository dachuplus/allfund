<template>
  <div class="news-page govuk-width-container">
    <!-- 页头 -->
    <header class="news-header">
      <h1 class="govuk-heading-l">资讯聚合</h1>
      <p class="govuk-body news-intro">
        在线聚合各大资讯站点的公开内容，按领域与站点分类实时拉取、不落地存储。仅作信息整理与便捷阅读入口，不代表本站立場，不构成任何投资建议。
      </p>
    </header>

    <!-- 分类 tab -->
    <nav class="news-cats" role="tablist" aria-label="资讯分类">
      <button
        v-for="c in cats"
        :key="c.key"
        class="news-cat"
        :class="{ 'news-cat--active': activeCat === c.key }"
        role="tab"
        :aria-selected="activeCat === c.key"
        @click="switchCat(c.key)"
      >
        {{ c.label }}
      </button>
    </nav>

    <!-- 网站子 tab -->
    <nav class="news-subs" role="tablist" aria-label="资讯站点">
      <button
        v-for="s in currentSources"
        :key="s.key"
        class="news-sub"
        :class="{ 'news-sub--active': activeSrc === s.key }"
        role="tab"
        :aria-selected="activeSrc === s.key"
        @click="switchSrc(s.key)"
      >
        {{ s.name }}
      </button>
    </nav>

    <!-- 工具条 -->
    <div class="news-toolbar">
      <span class="news-cur">当前：{{ activeCatLabel }} · {{ activeSrcName }}</span>
      <span class="news-count" v-if="!loading">
        {{ items.length > 0 ? `共 ${items.length} 条` : '暂无数据' }}
        <span class="news-updated" v-if="updatedAt"> · 更新于 {{ formatTime(updatedAt) }}</span>
      </span>
      <span v-else class="news-count">加载中…</span>
      <button class="news-refresh" :disabled="loading" @click="load(true)">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="news-loading">
      <div v-for="n in 6" :key="n" class="news-skeleton">
        <div class="skeleton skeleton-line" style="width: 18%"></div>
        <div class="skeleton skeleton-line" style="width: 92%"></div>
        <div class="skeleton skeleton-line" style="width: 60%"></div>
      </div>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="news-error" role="alert">
      <p class="news-error__title">资讯加载失败</p>
      <p class="news-error__desc">{{ error }}</p>
      <button class="news-refresh" @click="load(true)">重试</button>
    </div>

    <!-- 空态 -->
    <div v-else-if="items.length === 0" class="empty-state">
      当前站点暂无可用资讯。可能是上游站点临时不可达或页面结构变动，请稍后刷新重试。
    </div>

    <!-- 列表 -->
    <ul v-else class="news-list">
      <li v-for="(it, i) in items" :key="it.link + i" class="news-item">
        <div class="news-item__meta">
          <span class="tag tag-blue">{{ activeSrcName }}</span>
          <span class="news-item__time">{{ timeAgo(it.publishedAt) }}</span>
        </div>
        <a class="news-item__title" :href="it.link" target="_blank" rel="noopener noreferrer">{{ it.title }}</a>
      </li>
    </ul>

    <!-- 数据来源说明 -->
    <footer class="news-foot">
      数据来源：各资讯站点公开列表页，经边缘节点实时聚合，不落地存储。内容著作权归原站点所有，点击标题跳转原文。
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const cats = [
  { key: 'yingshi', label: '影视' },
  { key: 'meishi', label: '美食' },
  { key: 'fund', label: '基金' },
  { key: 'stock', label: '股票' },
  { key: 'tech', label: '科技' },
  { key: 'military', label: '军事' },
]
const sources = {
  yingshi: [
    { key: 'sina', name: '新浪娱乐' },
    { key: 'sohu', name: '搜狐娱乐' },
    { key: 'mtime', name: '时光网' },
  ],
  meishi: [
    { key: 'douguo', name: '豆果美食' },
    { key: 'canyin88', name: '红餐网' },
    { key: 'meishichina', name: '美食杰' },
  ],
  fund: [
    { key: 'cs', name: '中国证券报' },
    { key: 'cnstock', name: '上海证券报' },
    { key: 'stcn', name: '证券时报' },
    { key: 'jqka', name: '同花顺' },
    { key: 'hexun', name: '和讯' },
    { key: 'chnfund', name: '中国基金报' },
    { key: 'sina', name: '新浪基金' },
  ],
  stock: [
    { key: 'sina', name: '新浪财经·股票' },
    { key: 'jqka', name: '同花顺' },
    { key: 'cls', name: '财联社电报' },
  ],
  tech: [
    { key: 'leiphone', name: '雷锋网' },
    { key: 'ifanr', name: '爱范儿' },
    { key: 'tmtpost', name: '钛媒体' },
  ],
  military: [
    { key: 'guancha', name: '观察者网·军事' },
    { key: 'china', name: '中华网军事' },
  ],
}

const activeCat = ref('yingshi')
const activeSrc = ref(sources.yingshi[0].key)
const items = ref([])
const loading = ref(false)
const error = ref('')
const updatedAt = ref('')

const currentSources = computed(() => sources[activeCat.value] || [])
const activeCatLabel = computed(() => (cats.find((c) => c.key === activeCat.value) || {}).label || '')
const activeSrcName = computed(() => {
  const s = (currentSources.value || []).find((x) => x.key === activeSrc.value)
  return s ? s.name : ''
})

let abortCtrl = null

function buildUrl() {
  return '/api/news?cat=' + activeCat.value + '&src=' + activeSrc.value
}

async function load(force) {
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()
  loading.value = true
  error.value = ''
  const url = buildUrl() + (force ? '&refresh=1' : '')
  try {
    const res = await Promise.race([
      fetch(url, { signal: abortCtrl.signal, headers: { Accept: 'application/json' } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('请求超时（>15s），请稍后重试')), 15000)),
    ])
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    items.value = Array.isArray(data.items) ? data.items : []
    updatedAt.value = data.updatedAt || ''
    if (data.error) error.value = '上游站点抓取失败：' + data.error
  } catch (e) {
    if (e && e.name === 'AbortError') return
    error.value = (e && e.message) || '未知错误'
    items.value = []
  } finally {
    loading.value = false
  }
}

function switchCat(key) {
  if (key === activeCat.value) return
  activeCat.value = key
  activeSrc.value = (sources[key] && sources[key][0].key) || ''
  items.value = []
  load(false)
}
function switchSrc(key) {
  if (key === activeSrc.value) return
  activeSrc.value = key
  items.value = []
  load(false)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 0) return formatTime(ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return formatTime(ts)
}

onMounted(load)
onUnmounted(() => {
  if (abortCtrl) abortCtrl.abort()
})
</script>

<style scoped>
.news-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px 40px;
}
.news-header { margin-bottom: 20px; }
.govuk-heading-l {
  font-size: 36px;
  line-height: 1.2;
  font-weight: 700;
  margin: 0 0 12px;
  color: #0b0c0c;
}
.news-intro {
  font-size: 16px;
  line-height: 1.6;
  color: #505a5f;
  margin: 0;
}

/* 分类 tab */
.news-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-bottom: 2px solid #b1b4b6;
  margin-bottom: 0;
}
.news-cat {
  padding: 12px 24px;
  font-size: 18px;
  font-weight: 700;
  color: #1d70b8;
  background: transparent;
  border: none;
  border-bottom: 4px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
}
.news-cat:hover { border-bottom-color: #1d70b8; }
.news-cat--active {
  color: #0b0c0c;
  border-bottom-color: #1d70b8;
}

/* 网站子 tab */
.news-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 0 4px;
  border-bottom: 1px solid #b1b4b6;
  margin-bottom: 16px;
}
.news-sub {
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 700;
  color: #1d70b8;
  background: #f3f2f1;
  border: 1px solid #b1b4b6;
  cursor: pointer;
}
.news-sub:hover { background: #e8e7e6; }
.news-sub--active {
  color: #ffffff;
  background: #1d70b8;
  border-color: #1d70b8;
}

/* 工具条 */
.news-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.news-cur { font-size: 14px; font-weight: 700; color: #0b0c0c; }
.news-count { font-size: 14px; color: #505a5f; }
.news-updated { color: #b1b4b6; }
.news-refresh {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: #1d70b8;
  border: none;
  padding: 6px 16px;
  cursor: pointer;
}
.news-refresh:hover { background: #003078; }
.news-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* 列表 */
.news-list { list-style: none; padding: 0; margin: 0; }
.news-item {
  padding: 16px 0;
  border-bottom: 1px solid #b1b4b6;
}
.news-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.tag-blue {
  background: #1d70b8;
  color: #ffffff;
  font-size: 13px;
  padding: 1px 8px;
  font-weight: 700;
}
.news-item__time { font-size: 13px; color: #505a5f; }
.news-item__title {
  display: block;
  font-size: 18px;
  line-height: 1.4;
  font-weight: 700;
  color: #0b0c0c;
  text-decoration: none;
  margin-bottom: 6px;
  word-break: break-word;
}
.news-item__title:hover { color: #1d70b8; text-decoration: underline; }

/* 错误态 */
.news-error {
  text-align: center;
  padding: 40px 20px;
}
.news-error__title { font-size: 20px; font-weight: 700; color: #d4351c; margin: 0 0 8px; }
.news-error__desc { font-size: 15px; color: #505a5f; margin: 0 0 16px; }

/* 骨架屏 */
.news-loading { padding-top: 8px; }
.news-skeleton { padding: 16px 0; border-bottom: 1px solid #b1b4b6; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line { height: 14px; }
.skeleton { background: #f3f2f1; animation: shimmer 1.2s infinite; }
@keyframes shimmer { 0% { opacity: .3 } 50% { opacity: .6 } 100% { opacity: .3 } }

/* 底部说明 */
.news-foot {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid #b1b4b6;
  font-size: 13px;
  line-height: 1.6;
  color: #505a5f;
}

@media (max-width: 640px) {
  .govuk-heading-l { font-size: 28px; }
  .news-cat { padding: 10px 16px; font-size: 16px; }
  .news-item__title { font-size: 16px; }
}
</style>
