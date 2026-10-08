<template>
  <div class="yw">
    <!-- 学段切换：小学 / 初中 / 高中 -->
    <div class="yw-stages">
      <button
        v-for="b in BOOK_LIST"
        :key="b.key"
        type="button"
        class="yw-stage"
        :class="{ active: stage === b.key }"
        :title="b.book"
        @click="switchStage(b.key)"
      >{{ b.label }}<span class="yw-stage-n">（{{ b.count }} 篇）</span></button>
    </div>
    <p class="yw-book">{{ currentBook.book }}　共 {{ currentBook.count }} 篇</p>

    <!-- 筛选栏 -->
    <div class="yw-filters">
      <input
        v-model="search"
        class="yw-search"
        type="text"
        placeholder="搜索篇名 / 作者 / 出处"
      />
      <div class="yw-groups">
        <button
          type="button"
          class="yw-chip"
          :class="{ active: group === 'all' }"
          @click="group = 'all'; page = 1"
        >全部</button>
        <button
          v-for="g in groupList"
          :key="g.key"
          type="button"
          class="yw-chip"
          :class="{ active: group === g.key }"
          @click="group = g.key; page = 1"
        >{{ g.label }}<span class="yw-chip-n">（{{ g.n }}）</span></button>
      </div>
      <span class="yw-count">共 {{ filtered.length }} 篇</span>
    </div>

    <!-- 篇目列表 -->
    <div v-if="!current.length" class="yw-empty">该筛选条件下暂无篇目</div>
    <div v-else class="yw-list">
      <div
        v-for="p in pageItems"
        :key="p.n"
        class="yw-card"
        :class="{ open: opened === p.n }"
      >
        <div class="yw-card-head" @click="toggle(p.n)">
          <span class="yw-n">{{ p.n }}</span>
          <span class="yw-title">{{ p.t }}</span>
          <span v-if="p.d || p.a || p.s" class="yw-meta">
            <span v-if="p.d">{{ p.d }}</span>
            <span v-if="p.a">· {{ p.a }}</span>
            <span v-if="p.s">· {{ p.s }}</span>
          </span>
          <span v-if="p.w" class="yw-words">{{ p.w }} 字</span>
          <span class="yw-caret">{{ opened === p.n ? '▴' : '▾' }}</span>
        </div>

        <!-- 展开：原文全文（含注音） -->
        <div v-if="opened === p.n" class="yw-body">
          <div class="yw-text">{{ p.c }}</div>
          <div v-if="p.nt && p.nt.length" class="yw-notes">
            <div class="yw-sec">读音说明</div>
            <p v-for="(nt, i) in p.nt" :key="i">{{ nt }}</p>
          </div>
          <p class="yw-tip">
            原文与注音逐字照录自《小初高必背古诗文 333 篇》，括号内为拼音。
          </p>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="yw-pager">
      <button class="yw-pg" :disabled="page <= 1" type="button" @click="page = 1">首页</button>
      <button class="yw-pg" :disabled="page <= 1" type="button" @click="page = page - 1">上一页</button>
      <span class="yw-pg-info">第 {{ page }} / {{ totalPages }} 页</span>
      <button class="yw-pg" :disabled="page >= totalPages" type="button" @click="page = page + 1">下一页</button>
      <select v-model.number="pageSize" class="yw-size" @change="page = 1">
        <option :value="20">20 篇/页</option>
        <option :value="50">50 篇/页</option>
        <option :value="100">100 篇/页</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BOOKS, PRIMARY, JUNIOR, SENIOR } from './yuwenData.js'

const DATA = { primary: PRIMARY, junior: JUNIOR, senior: SENIOR }
const BOOK_LIST = [BOOKS.primary, BOOKS.junior, BOOKS.senior]

const stage = ref('primary')
const search = ref('')
const group = ref('all')
const opened = ref(0)
const page = ref(1)
const pageSize = ref(20)

function switchStage(k) {
  stage.value = k
  group.value = 'all'
  page.value = 1
  opened.value = 0
}
function toggle(n) { opened.value = opened.value === n ? 0 : n }

const current = computed(() => DATA[stage.value] || [])
const currentBook = computed(() => BOOKS[stage.value])

/** 小学按朝代分组，初中/高中按体裁分组（字段不同：g vs gn） */
const groupList = computed(() => {
  const key = stage.value === 'primary' ? 'g' : 'gn'
  const cnt = {}
  for (const p of current.value) {
    const g = p[key] || '其他'
    cnt[g] = (cnt[g] || 0) + 1
  }
  return Object.keys(cnt)
    .map((k) => ({ key: k, label: k, n: cnt[k] }))
    .sort((a, b) => b.n - a.n)
})

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  const key = stage.value === 'primary' ? 'g' : 'gn'
  return current.value.filter((p) => {
    if (group.value !== 'all' && (p[key] || '其他') !== group.value) return false
    if (!kw) return true
    return (
      String(p.t || '').toLowerCase().includes(kw) ||
      String(p.a || '').toLowerCase().includes(kw) ||
      String(p.s || '').toLowerCase().includes(kw) ||
      String(p.d || '').toLowerCase().includes(kw) ||
      String(p.n) === kw
    )
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pageItems = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filtered.value.slice(from, from + pageSize.value)
})
</script>

<style scoped>
.yw { padding: 4px 0 24px; }

/* Tab 栏：窄屏自动折行，底线由每个 tab 自带（与全站规范一致） */
.yw-stages {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  row-gap: 2px;
  margin-bottom: 6px;
}
.yw-stage {
  background: transparent;
  border: none;
  padding: 8px 18px;
  font-family: inherit;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-secondary, #505a5f);
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 4px solid var(--border, #d6d6d6);
  transition: color 0.15s, border-color 0.15s;
}
.yw-stage:hover { color: var(--text-primary, #0b0c0c); }
.yw-stage.active { color: #1d70b8; border-bottom-color: #1d70b8; }
.yw-stage-n { font-weight: 400; font-size: 13px; }
.yw-stage.active .yw-stage-n { color: #1d70b8; }
.yw-book {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--text-secondary, #505a5f);
}

.yw-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.yw-search {
  flex: 1;
  min-width: 180px;
  border: 2px solid #0b0c0c;
  padding: 8px 12px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}
.yw-search:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.yw-groups { display: flex; flex-wrap: wrap; gap: 6px; }
.yw-chip {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
  white-space: nowrap;
}
.yw-chip:hover { background: #f3f2f1; }
.yw-chip.active { background: #1d70b8; border-color: #1d70b8; color: #fff; }
.yw-chip-n { font-weight: 400; }
.yw-count { font-size: 13px; color: var(--text-secondary, #505a5f); margin-left: auto; }

.yw-list { display: flex; flex-direction: column; gap: 8px; }
.yw-card { border: 1px solid var(--border, #d6d6d6); background: #fff; }
.yw-card-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
}
.yw-card-head:hover { background: #f8f8f8; }
.yw-card.open { border-color: #1d70b8; }
.yw-n {
  flex: none;
  min-width: 34px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted, #b1b4b6);
  font-variant-numeric: tabular-nums;
}
.yw-title { font-size: 17px; font-weight: 700; color: var(--text-primary, #0b0c0c); }
.yw-meta { font-size: 13px; color: var(--text-secondary, #505a5f); }
.yw-words {
  font-size: 12px;
  color: var(--text-secondary, #505a5f);
  border: 1px solid var(--border, #d6d6d6);
  padding: 0 6px;
  white-space: nowrap;
}
.yw-caret { margin-left: auto; color: var(--text-muted, #b1b4b6); font-size: 11px; }

.yw-body { padding: 4px 14px 14px; border-top: 1px solid var(--border, #d6d6d6); }
.yw-text {
  margin-top: 12px;
  font-size: 16px;
  line-height: 2;
  color: var(--text-primary, #0b0c0c);
  white-space: pre-wrap;   /* 保留原文换行 */
  text-align: justify;
  text-justify: inter-ideograph;
}
.yw-notes {
  margin-top: 14px;
  padding: 10px 12px;
  border-left: 4px solid var(--brand, #1d70b8);
  background: var(--bg-body, #f3f2f1);
}
.yw-notes p { margin: 0 0 4px; font-size: 13px; color: var(--text-secondary, #505a5f); line-height: 1.6; }
.yw-notes p:last-child { margin-bottom: 0; }
.yw-sec { font-size: 13px; font-weight: 700; color: var(--text-primary, #0b0c0c); margin-bottom: 6px; }
.yw-tip { margin: 12px 0 0; font-size: 12px; color: var(--text-muted, #b1b4b6); }

.yw-empty { padding: 28px 0; text-align: center; color: var(--text-secondary, #505a5f); font-size: 15px; }

.yw-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.yw-pg {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 7px 14px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.yw-pg:disabled { opacity: 0.4; cursor: not-allowed; }
.yw-pg-info { font-size: 14px; color: var(--text-secondary, #505a5f); }
.yw-size {
  border: 2px solid #0b0c0c;
  padding: 6px 8px;
  font-size: 14px;
  font-family: inherit;
}

@media (max-width: 768px) {
  .yw-stage { padding: 8px 12px; font-size: 15px; }
  .yw-search { min-width: 140px; }
  .yw-title { font-size: 16px; }
  .yw-text { font-size: 15px; line-height: 1.9; }
}
</style>
