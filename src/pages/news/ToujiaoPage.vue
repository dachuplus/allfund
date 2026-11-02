<template>
  <div class="tj-page govuk-width-container">
    <header class="tj-header">
      <h1 class="govuk-heading-l">投教基地</h1>
      <p class="govuk-body tj-intro">
        聚合 100 家公募基金公司的投资者教育基地公开内容，按公募管理规模排序。点击公司查看其投教文章列表，标题即跳转链接，点击直达原文。
        服务端渲染站点实时聚合；动态渲染（SPA）站点由定时爬虫渲染后缓存展示。
      </p>
    </header>

    <div class="tj-layout">
      <!-- 左侧：可搜索公司列表 -->
      <aside class="tj-side">
        <input
          v-model="kw"
          class="tj-search"
          type="search"
          placeholder="搜索基金公司（按规模排序）"
          aria-label="搜索基金公司"
        />
        <div class="tj-side__list" role="listbox" aria-label="基金公司">
          <button
            v-for="c in filtered"
            :key="c.domain"
            class="tj-co"
            :class="{ 'tj-co--active': activeDomain === c.domain }"
            role="option"
            :aria-selected="activeDomain === c.domain"
            @click="selectCompany(c)"
          >
            <span class="tj-co__rank">{{ c.rank }}</span>
            <span class="tj-co__name">{{ c.name }}</span>
            <span v-if="c.verified" class="tj-co__ok" title="域名已确认">✓</span>
          </button>
          <p v-if="filtered.length === 0" class="tj-side__empty">无匹配公司</p>
        </div>
      </aside>

      <!-- 右侧：文章列表 -->
      <section class="tj-main">
        <div class="tj-toolbar">
          <span class="tj-cur">{{ activeName || '请选择公司' }}</span>
          <span class="tj-status" :class="'tj-status--' + status" v-if="!loading && status">
            <template v-if="status === 'cached'">已缓存 · 每日更新</template>
            <template v-else-if="status === 'live'">实时抓取（服务端渲染站点）</template>
            <template v-else-if="status === 'pending'">数据采集中（动态站点，爬虫接入中）</template>
          </span>
          <span class="tj-count" v-if="!loading">
            {{ items.length > 0 ? `共 ${items.length} 条` : (status === 'pending' ? '暂无内容' : '暂无数据') }}
            <span class="tj-updated" v-if="updatedAt"> · {{ formatTime(updatedAt) }}</span>
          </span>
          <span v-else class="tj-count">加载中…</span>
          <a v-if="activeEdu" class="tj-golink" :href="activeEdu" target="_blank" rel="noopener noreferrer">访问官网投教基地 ↗</a>
          <button class="tj-refresh" :disabled="loading || !activeDomain" @click="load(true)">
            {{ loading ? '刷新中…' : '刷新' }}
          </button>
        </div>

        <div v-if="loading" class="tj-loading">
          <div v-for="n in 6" :key="n" class="tj-skeleton">
            <div class="skeleton skeleton-line" style="width: 18%"></div>
            <div class="skeleton skeleton-line" style="width: 92%"></div>
            <div class="skeleton skeleton-line" style="width: 60%"></div>
          </div>
        </div>

        <div v-else-if="error" class="tj-error" role="alert">
          <p class="tj-error__title">加载失败</p>
          <p class="tj-error__desc">{{ error }}</p>
          <button class="tj-refresh" @click="load(true)">重试</button>
        </div>

        <div v-else-if="items.length === 0" class="tj-empty">
          <template v-if="status === 'pending'">
            该投教站点为动态渲染（SPA），内容需经定时无头浏览器爬虫抓取后缓存展示，首次抓取将在下次定时任务后上线。你也可以直接访问
            <a :href="activeEdu" target="_blank" rel="noopener noreferrer">官网投教基地 ↗</a> 查看最新内容。
          </template>
          <template v-else>
            当前站点暂无可用资讯。可能是上游站点临时不可达或页面结构变动，请稍后刷新重试，或直接访问
            <a :href="activeEdu" target="_blank" rel="noopener noreferrer">官网投教基地 ↗</a>。
          </template>
        </div>

        <ul v-else class="tj-list">
          <li v-for="(it, i) in items" :key="it.url + i" class="tj-item">
            <div class="tj-item__meta">
              <span class="tag tag-blue">{{ activeName }}</span>
            </div>
            <a class="tj-item__title" :href="it.url" target="_blank" rel="noopener noreferrer">{{ it.title }}</a>
          </li>
        </ul>
      </section>
    </div>

    <footer class="tj-foot">
      数据来源：各基金公司投教基地公开页面，经边缘节点聚合或定时爬虫渲染缓存。内容著作权归原公司所有，点击标题跳转原文。
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import companies from '../../../scripts/toujiao_companies.json'

const activeDomain = ref('')
const activeName = ref('')
const activeEdu = ref('')
const items = ref([])
const loading = ref(false)
const error = ref('')
const updatedAt = ref('')
const status = ref('')
const kw = ref('')

const filtered = computed(() => {
  const k = kw.value.trim()
  if (!k) return companies
  return companies.filter((c) => c.name.includes(k) || c.domain.includes(k.toLowerCase()))
})

let abortCtrl = null

function selectCompany(c) {
  activeDomain.value = c.domain
  activeName.value = c.name
  activeEdu.value = c.edu
  items.value = []
  status.value = ''
  load(false)
}

function buildUrl() {
  return '/api/toujiao?company=' + encodeURIComponent(activeDomain.value) +
    '&url=' + encodeURIComponent(activeEdu.value)
}

async function load(force) {
  if (!activeDomain.value) return
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
    status.value = data.status || (data.error ? 'pending' : '')
    if (data.error) error.value = '抓取失败：' + data.error
  } catch (e) {
    if (e && e.name === 'AbortError') return
    error.value = (e && e.message) || '未知错误'
    items.value = []
    status.value = 'pending'
  } finally {
    loading.value = false
  }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  // 默认选中规模第一的易方达
  if (companies.length) selectCompany(companies[0])
})
onUnmounted(() => {
  if (abortCtrl) abortCtrl.abort()
})
</script>

<style scoped>
.tj-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px 40px;
}
.tj-header { margin-bottom: 20px; }
.govuk-heading-l {
  font-size: 36px; line-height: 1.2; font-weight: 700; margin: 0 0 12px; color: #0b0c0c;
}
.tj-intro { font-size: 16px; line-height: 1.6; color: #505a5f; margin: 0; }

.tj-layout { display: flex; gap: 24px; align-items: flex-start; }
.tj-side {
  width: 280px; flex: 0 0 280px; position: sticky; top: 16px;
  max-height: calc(100vh - 40px); display: flex; flex-direction: column;
}
.tj-search {
  width: 100%; padding: 10px 12px; font-size: 14px; border: 2px solid #0b0c0c; margin-bottom: 10px;
  box-sizing: border-box;
}
.tj-side__list { overflow-y: auto; border: 1px solid #b1b4b6; flex: 1; }
.tj-co {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 8px 12px; font-size: 14px; background: #ffffff; border: none;
  border-bottom: 1px solid #f3f2f1; cursor: pointer; color: #0b0c0c;
}
.tj-co:hover { background: #f3f2f1; }
.tj-co--active { background: #1d70b8; color: #ffffff; }
.tj-co__rank { width: 28px; flex: 0 0 28px; color: #505a5f; font-variant-numeric: tabular-nums; }
.tj-co--active .tj-co__rank { color: #ffffff; }
.tj-co__name { flex: 1; font-weight: 700; }
.tj-co__ok { color: #00703c; font-weight: 700; }
.tj-co--active .tj-co__ok { color: #ffffff; }
.tj-side__empty { padding: 16px; color: #505a5f; font-size: 14px; }

.tj-main { flex: 1; min-width: 0; }
.tj-toolbar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;
  padding-bottom: 12px; border-bottom: 1px solid #b1b4b6;
}
.tj-cur { font-size: 16px; font-weight: 700; color: #0b0c0c; }
.tj-status { font-size: 13px; padding: 1px 8px; font-weight: 700; }
.tj-status--cached { background: #e7f3e7; color: #00703c; }
.tj-status--live { background: #fff4e5; color: #b95307; }
.tj-status--pending { background: #f3f2f1; color: #505a5f; }
.tj-count { font-size: 14px; color: #505a5f; }
.tj-updated { color: #b1b4b6; }
.tj-golink { font-size: 13px; color: #1d70b8; margin-left: auto; text-decoration: none; }
.tj-golink:hover { text-decoration: underline; }
.tj-refresh {
  font-size: 14px; font-weight: 700; color: #ffffff; background: #1d70b8; border: none; padding: 6px 16px; cursor: pointer;
}
.tj-refresh:hover { background: #003078; }
.tj-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.tj-list { list-style: none; padding: 0; margin: 0; }
.tj-item { padding: 16px 0; border-bottom: 1px solid #b1b4b6; }
.tj-item__meta { margin-bottom: 6px; }
.tag-blue { background: #1d70b8; color: #ffffff; font-size: 13px; padding: 1px 8px; font-weight: 700; }
.tj-item__title {
  display: block; font-size: 18px; line-height: 1.4; font-weight: 700; color: #0b0c0c;
  text-decoration: none; margin-bottom: 6px; word-break: break-word;
}
.tj-item__title:hover { color: #1d70b8; text-decoration: underline; }

.tj-error, .tj-empty { text-align: center; padding: 40px 20px; background: #f3f2f1; border: 1px solid #b1b4b6; }
.tj-error__title { font-size: 20px; font-weight: 700; color: #d4351c; margin: 0 0 8px; }
.tj-error__desc, .tj-empty { font-size: 15px; color: #505a5f; margin: 0; line-height: 1.7; }
.tj-error .tj-refresh { margin-top: 16px; }
.tj-empty a { color: #1d70b8; }

.tj-loading { padding-top: 8px; }
.tj-skeleton { padding: 16px 0; border-bottom: 1px solid #b1b4b6; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line { height: 14px; }
.skeleton { background: #f3f2f1; animation: shimmer 1.2s infinite; }
@keyframes shimmer { 0% { opacity: .3 } 50% { opacity: .6 } 100% { opacity: .3 } }

.tj-foot {
  margin-top: 28px; padding-top: 16px; border-top: 1px solid #b1b4b6;
  font-size: 13px; line-height: 1.6; color: #505a5f;
}

@media (max-width: 900px) {
  .tj-layout { flex-direction: column; }
  .tj-side { width: 100%; flex: none; position: static; max-height: 280px; }
  .govuk-heading-l { font-size: 28px; }
  .tj-item__title { font-size: 16px; }
}
</style>
