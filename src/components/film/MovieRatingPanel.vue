<template>
  <section class="mr-panel">
    <h2 class="mr-title">电影评分库</h2>
    <p class="mr-intro">
      按 TMDB 用户评分整理电影 Top 1 万，每周同步一次。点击片名前往 TMDB 查看详细介绍、剧照与更多评分。
    </p>

    <div class="mr-controls">
      <label class="mr-search">
        <span class="mr-label">搜索片名</span>
        <input v-model="keyword" type="search" placeholder="输入中文或英文片名" @keyup.enter="reload" />
        <button class="mr-btn" @click="reload">搜索</button>
      </label>
      <label class="mr-order">
        <span class="mr-label">排序</span>
        <select v-model="order" @change="reload">
          <option value="rank">综合排名</option>
          <option value="vote_average">评分高低</option>
          <option value="vote_count">评分人数</option>
          <option value="year">上映年份</option>
        </select>
      </label>
    </div>

    <p v-if="loading && !rows.length" class="mr-status">正在加载电影评分…</p>
    <p v-else-if="error && !rows.length" class="mr-status mr-status--err">
      加载失败：{{ error }}
      <button class="mr-btn" @click="reload">重试</button>
    </p>
    <p v-else-if="!loading && !rows.length" class="mr-status">
      暂无数据。评分库每周同步一次，若刚上线请稍后再来，或检查 TMDB 数据源是否已配置。
    </p>

    <div v-if="rows.length" class="mr-table-wrap">
      <table class="mr-table">
        <thead>
          <tr>
            <th class="mr-col-rank">#</th>
            <th class="mr-col-title">片名</th>
            <th class="mr-col-score">评分</th>
            <th class="mr-col-votes">评分人数</th>
            <th class="mr-col-year">年份</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="row.tmdb_id">
            <td class="mr-col-rank">{{ displayRank(row, i) }}</td>
            <td class="mr-col-title">
              <a :href="row.source_url || ('https://www.themoviedb.org/movie/' + row.tmdb_id)" target="_blank" rel="noopener noreferrer">
                {{ row.title }}
              </a>
              <span v-if="row.original_title && row.original_title !== row.title" class="mr-original">{{ row.original_title }}</span>
            </td>
            <td class="mr-col-score">{{ fmtScore(row.vote_average) }}</td>
            <td class="mr-col-votes">{{ fmtVotes(row.vote_count) }}</td>
            <td class="mr-col-year">{{ row.year || '--' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rows.length" class="mr-more">
      <button class="mr-btn" :disabled="loading || !hasMore" @click="loadMore">
        {{ loading ? '加载中…' : (hasMore ? '加载更多' : '已全部显示') }}
      </button>
    </div>

    <p v-if="fetchDate" class="mr-meta">数据同步日期：{{ fetchDate }}</p>
    <p class="mr-source">{{ TMDB_ATTR }}</p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchMovieRatings, fetchMovieRatingsFetchDate, TMDB_ATTR } from '../../api/movieRatings'

const rows = ref([])
const keyword = ref('')
const order = ref('rank')
const loading = ref(false)
const error = ref('')
const hasMore = ref(false)
const fetchDate = ref('')

async function load(reset = true) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const from = reset ? 0 : rows.value.length
    const res = await fetchMovieRatings({ keyword: keyword.value, order: order.value, from })
    rows.value = reset ? res.rows : rows.value.concat(res.rows)
    hasMore.value = res.hasMore
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

function reload() { load(true) }
function loadMore() { load(false) }

function displayRank(row, i) {
  return order.value === 'rank' && row.rank ? row.rank : i + 1
}
function fmtScore(v) {
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(1) : '--'
}
function fmtVotes(v) {
  if (v === null || v === undefined) return '--'
  return Number(v).toLocaleString('zh-CN')
}

onMounted(async () => {
  load(true)
  try { fetchDate.value = await fetchMovieRatingsFetchDate() } catch (e) { /* 同步日期拿不到不影响主列表 */ }
})
</script>

<style scoped>
.mr-panel { max-width: 960px; }
.mr-title { font-size: 24px; margin: 0 0 8px; color: #0b0c0c; }
.mr-intro { font-size: 16px; color: #505a5f; margin: 0 0 20px; line-height: 1.6; }
.mr-controls { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 20px; }
.mr-label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #0b0c0c; }
.mr-search input { padding: 8px 10px; font-size: 16px; border: 2px solid #0b0c0c; min-width: 240px; }
.mr-order select { padding: 8px 10px; font-size: 16px; border: 2px solid #0b0c0c; background: #fff; }
.mr-btn { padding: 8px 16px; font-size: 16px; background: #1d70b8; color: #fff; border: 0; cursor: pointer; }
.mr-btn:hover { background: #003078; }
.mr-btn:disabled { background: #b1b4b6; cursor: default; }
.mr-status { font-size: 16px; color: #505a5f; padding: 20px 0; }
.mr-status--err { color: #d4351c; }
.mr-table-wrap { overflow-x: auto; }
.mr-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.mr-table th { text-align: left; border-bottom: 2px solid #b1b4b6; padding: 8px 10px; white-space: nowrap; }
.mr-table td { border-bottom: 1px solid #b1b4b6; padding: 10px; vertical-align: top; }
.mr-col-rank { width: 56px; color: #505a5f; }
.mr-col-title a { color: #1d70b8; text-decoration: underline; }
.mr-col-title a:hover { color: #003078; }
.mr-original { display: block; font-size: 13px; color: #505a5f; margin-top: 2px; }
.mr-col-score { width: 90px; font-weight: 700; }
.mr-col-votes { width: 120px; }
.mr-col-year { width: 80px; }
.mr-more { margin: 20px 0; }
.mr-meta { font-size: 14px; color: #505a5f; margin-top: 16px; }
.mr-source { font-size: 13px; color: #505a5f; line-height: 1.6; margin-top: 8px; border-top: 1px solid #b1b4b6; padding-top: 12px; }
@media (max-width: 640px) {
  .mr-search input { min-width: 0; width: 100%; }
  .mr-col-votes, .mr-col-year { display: none; }
}
</style>
