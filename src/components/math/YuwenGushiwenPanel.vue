<template>
  <div class="gsw">
    <!-- 试卷切换 -->
    <div class="gsw-papers" role="tablist">
      <button
        v-for="p in papers"
        :key="p.key"
        type="button"
        role="tab"
        class="gsw-ptab"
        :class="{ on: paperKey === p.key }"
        :disabled="loading"
        :aria-selected="paperKey === p.key"
        @click="switchPaper(p.key)"
      >
        {{ p.label }}
      </button>
    </div>

    <p class="gsw-sub">
      {{ title }}　{{ isDoc ? '复习文档（可搜索）' : '共 ' + list.length + ' 题（含答案与解析）' }}{{ loading ? '　加载中…' : '' }}
    </p>

    <!-- 知识点文档视图 -->
    <template v-if="isDoc">
      <div class="gsw-filters">
        <input
          v-model="docSearch"
          class="gsw-search"
          type="text"
          placeholder="搜索知识点关键字（章节标题始终显示）"
        />
      </div>
      <div class="gsw-doc">
        <template v-for="(b, i) in docFiltered" :key="i">
          <h4 v-if="b.t === 'h1'" class="gsw-doc-h1">{{ b.text }}</h4>
          <h5 v-else-if="b.t === 'h2'" class="gsw-doc-h2">{{ b.text }}</h5>
          <h6 v-else-if="b.t === 'h3'" class="gsw-doc-h3">{{ b.text }}</h6>
          <p v-else-if="b.t === 'p'" class="gsw-doc-p"><template v-for="(seg, j) in splitKw(b.text)" :key="j"><mark v-if="seg.hit" class="gsw-doc-hit">{{ seg.s }}</mark><template v-else>{{ seg.s }}</template></template></p>
          <p v-else class="gsw-doc-kv"><span class="gsw-doc-label">{{ b.label }}</span><template v-for="(seg, j) in splitKw(b.text)" :key="j"><mark v-if="seg.hit" class="gsw-doc-hit">{{ seg.s }}</mark><template v-else>{{ seg.s }}</template></template></p>
        </template>
        <div v-if="!docFiltered.length" class="gsw-empty">没有匹配的知识点</div>
      </div>
    </template>

    <!-- 题库视图 -->
    <template v-else>
    <!-- 实时统计条 + 错题本切换 -->
    <div class="gsw-stats">
      <div class="gsw-stat">
        <span class="gsw-stat-num">{{ stats.answered }}</span>
        <span class="gsw-stat-label">已作答</span>
      </div>
      <div class="gsw-stat ok">
        <span class="gsw-stat-num">{{ stats.correct }}</span>
        <span class="gsw-stat-label">答对</span>
      </div>
      <div class="gsw-stat no">
        <span class="gsw-stat-num">{{ stats.wrong }}</span>
        <span class="gsw-stat-label">答错</span>
      </div>
      <div class="gsw-stat">
        <span class="gsw-stat-num">{{ stats.rate }}%</span>
        <span class="gsw-stat-label">正确率</span>
      </div>
      <button
        class="gsw-toggle"
        type="button"
        :class="{ on: onlyWrong }"
        @click="onlyWrong = !onlyWrong"
      >
        {{ onlyWrong ? '退出错题本' : '只看错题' }}
      </button>
    </div>

    <!-- 工具栏：搜索 + 一键揭示全部答案 -->
    <div class="gsw-filters">
      <input
        v-model="search"
        class="gsw-search"
        type="text"
        placeholder="搜索题目关键字 / 解析"
      />
      <button class="gsw-btn" type="button" @click="revealAll = !revealAll">
        {{ revealAll ? '收起全部答案' : '显示全部答案' }}
      </button>
    </div>

    <!-- 题目列表 -->
    <div v-if="!pageItems.length" class="gsw-empty">
      {{ onlyWrong ? '答错的题目会在这里～先做几道题吧' : '没有匹配的题目' }}
    </div>
    <div v-else class="gsw-list">
      <div
        v-for="item in pageItems"
        :key="item.id"
        class="gsw-card"
        :class="{ open: revealed[item.id] || revealAll }"
      >
        <div class="gsw-q">
          <span class="gsw-n">第 {{ item.id }} 题</span>
          <span class="gsw-qtext">{{ item.q }}</span>
        </div>

        <div class="gsw-opts">
          <button
            v-for="(opt, i) in item.options"
            :key="i"
            type="button"
            class="gsw-opt"
            :class="optClass(item, i)"
            @click="select(item, i)"
          >
            <span class="gsw-opt-key">{{ String.fromCharCode(65 + i) }}</span>
            <span class="gsw-opt-text">{{ opt }}</span>
          </button>
        </div>

        <!-- 展开：答案 + 解析 -->
        <div v-if="revealed[item.id] || revealAll" class="gsw-ans">
          <div class="gsw-ans-line">
            <span class="gsw-ans-label">答案</span>
            <span class="gsw-ans-key">{{ item.answer }}</span>
            <span v-if="selected[item.id]" class="gsw-verdict" :class="isCorrect(item) ? 'ok' : 'no'">
              {{ isCorrect(item) ? '答对了' : '答错了' }}
            </span>
          </div>
          <p class="gsw-analysis">
            <span class="gsw-ans-label">解析</span>{{ item.analysis }}
          </p>
        </div>
        <div v-else class="gsw-foot">
          <button class="gsw-link" type="button" @click="toggleReveal(item)">显示答案 / 解析</button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="gsw-pager">
      <button class="gsw-pg" :disabled="page <= 1" type="button" @click="page = 1">首页</button>
      <button class="gsw-pg" :disabled="page <= 1" type="button" @click="page = page - 1">上一页</button>
      <span class="gsw-pg-info">第 {{ page }} / {{ totalPages }} 页</span>
      <button class="gsw-pg" :disabled="page >= totalPages" type="button" @click="page = page + 1">下一页</button>
      <select v-model.number="pageSize" class="gsw-size" @change="page = 1">
        <option :value="1000">1000 题/页</option>
        <option :value="50">50 题/页</option>
        <option :value="20">20 题/页</option>
        <option :value="10">10 题/页</option>
      </select>
    </div>

    <!-- 末尾统计条（翻到题库末尾也能看答题结果） -->
    <div class="gsw-stats gsw-stats-bottom">
      <div class="gsw-stat">
        <span class="gsw-stat-num">{{ stats.answered }}</span>
        <span class="gsw-stat-label">已作答</span>
      </div>
      <div class="gsw-stat ok">
        <span class="gsw-stat-num">{{ stats.correct }}</span>
        <span class="gsw-stat-label">答对</span>
      </div>
      <div class="gsw-stat no">
        <span class="gsw-stat-num">{{ stats.wrong }}</span>
        <span class="gsw-stat-label">答错</span>
      </div>
      <div class="gsw-stat">
        <span class="gsw-stat-num">{{ stats.rate }}%</span>
        <span class="gsw-stat-label">正确率</span>
      </div>
      <button
        class="gsw-toggle"
        type="button"
        :class="{ on: onlyWrong }"
        @click="toggleWrongFromBottom"
      >
        {{ onlyWrong ? '退出错题本' : '只看错题' }}
      </button>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { GUSHIWEN_DASAI, GUSHIWEN_DASAI_TITLE } from '../../data/gushiwenDasai.js'

// 试卷清单：四年级（讲义3）静态内置，其余懒加载（动态 import 独立分包，不撑大主包）
const papers = [
  {
    key: 'g4',
    label: '四年级',
    load: () => Promise.resolve({ title: GUSHIWEN_DASAI_TITLE, list: GUSHIWEN_DASAI }),
  },
  {
    key: 'g3',
    label: '三年级',
    load: () => import('../../data/gushiwenDasaiG3.js').then((m) => ({ title: m.GUSHIWEN_DASAI_G3_TITLE, list: m.GUSHIWEN_DASAI_G3 })),
  },
  {
    key: 'g5',
    label: '五年级',
    load: () => import('../../data/gushiwenDasaiG5.js').then((m) => ({ title: m.GUSHIWEN_DASAI_G5_TITLE, list: m.GUSHIWEN_DASAI_G5 })),
  },
  {
    key: 'jy1',
    label: '初赛1',
    load: () => import('../../data/gushiwenDasaiJy1.js').then((m) => ({ title: m.GUSHIWEN_JY1_TITLE, list: m.GUSHIWEN_JY1 })),
  },
  {
    key: 'jy2',
    label: '初赛2',
    load: () => import('../../data/gushiwenDasaiJy2.js').then((m) => ({ title: m.GUSHIWEN_JY2_TITLE, list: m.GUSHIWEN_JY2 })),
  },
  {
    key: 'fs11',
    label: '复赛1',
    load: () => import('../../data/gushiwenDasaiFs11.js').then((m) => ({ title: m.GUSHIWEN_FS11_TITLE, list: m.GUSHIWEN_FS11 })),
  },
  {
    key: 'fs12',
    label: '复赛2',
    load: () => import('../../data/gushiwenDasaiFs12.js').then((m) => ({ title: m.GUSHIWEN_FS12_TITLE, list: m.GUSHIWEN_FS12 })),
  },
  {
    key: 'fs13',
    label: '复赛3',
    load: () => import('../../data/gushiwenDasaiFs13.js').then((m) => ({ title: m.GUSHIWEN_FS13_TITLE, list: m.GUSHIWEN_FS13 })),
  },
  {
    key: 'fs14',
    label: '复赛4',
    load: () => import('../../data/gushiwenDasaiFs14.js').then((m) => ({ title: m.GUSHIWEN_FS14_TITLE, list: m.GUSHIWEN_FS14 })),
  },
  {
    key: 'fs15',
    label: '复赛5',
    load: () => import('../../data/gushiwenDasaiFs15.js').then((m) => ({ title: m.GUSHIWEN_FS15_TITLE, list: m.GUSHIWEN_FS15 })),
  },
  {
    key: 'zd',
    label: '知识点',
    doc: true,
    load: () => import('../../data/gushiwenZhishidian.js').then((m) => ({ title: m.GUSHIWEN_ZD_TITLE, blocks: m.GUSHIWEN_ZD_BLOCKS })),
  },
]

const paperKey = ref('g4')
const title = ref(GUSHIWEN_DASAI_TITLE)
const list = ref(GUSHIWEN_DASAI)
const docBlocks = ref([])
const docSearch = ref('')
const loading = ref(false)

const isDoc = computed(() => {
  const p = papers.find((x) => x.key === paperKey.value)
  return !!(p && p.doc)
})

// 文档视图：标题块常驻（保留章节结构），正文块按关键字过滤
const docFiltered = computed(() => {
  const kw = docSearch.value.trim().toLowerCase()
  if (!kw) return docBlocks.value
  return docBlocks.value.filter(
    (b) => b.t === 'h1' || b.t === 'h2' || b.t === 'h3'
      || b.text.toLowerCase().includes(kw),
  )
})

// 关键字高亮分段
function splitKw(text) {
  const kw = docSearch.value.trim()
  if (!kw) return [{ s: text }]
  const parts = []
  const lower = text.toLowerCase()
  const k = kw.toLowerCase()
  let i = 0
  for (;;) {
    const j = lower.indexOf(k, i)
    if (j === -1) {
      if (i < text.length) parts.push({ s: text.slice(i) })
      break
    }
    if (j > i) parts.push({ s: text.slice(i, j) })
    parts.push({ s: text.slice(j, j + kw.length), hit: true })
    i = j + kw.length
  }
  return parts
}

function toggleWrongFromBottom() {
  onlyWrong.value = !onlyWrong.value
  if (onlyWrong.value) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const search = ref('')
const page = ref(1)
const pageSize = ref(1000)   // 默认一页展示全部，减少翻页
const selected = ref({})   // { [id]: 'A'|'B'|'C'|'D' }
const revealed = ref({})   // { [id]: true } —— 已点开答案
const revealAll = ref(false)
const onlyWrong = ref(false)   // 错题本筛选

async function switchPaper(key) {
  if (key === paperKey.value || loading.value) return
  paperKey.value = key
  loading.value = true
  try {
    const p = papers.find((x) => x.key === key)
    const { title: t, list: l, blocks: b } = await p.load()
    // 切卷重置作答状态
    selected.value = {}
    revealed.value = {}
    search.value = ''
    onlyWrong.value = false
    revealAll.value = false
    page.value = 1
    docSearch.value = ''
    title.value = t
    list.value = l || []
    docBlocks.value = b || []
  } finally {
    loading.value = false
  }
}

// 搜索 / 切换错题本时回到第一页
watch([search, onlyWrong], () => { page.value = 1 })

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  let arr = list.value
  if (kw) {
    arr = arr.filter(
      (it) => it.q.toLowerCase().includes(kw) || it.analysis.toLowerCase().includes(kw),
    )
  }
  if (onlyWrong.value) {
    arr = arr.filter((it) => selected.value[it.id] && !isCorrect(it))
  }
  return arr
})

// 实时统计：已作答 / 答对 / 答错 / 正确率
const stats = computed(() => {
  const sel = selected.value
  let answered = 0
  let correct = 0
  let wrong = 0
  for (const it of list.value) {
    const s = sel[it.id]
    if (!s) continue
    answered++
    if (s === it.answer) correct++
    else wrong++
  }
  const rate = answered ? Math.round((correct / answered) * 100) : 0
  return { answered, correct, wrong, rate }
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pageItems = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filtered.value.slice(from, from + pageSize.value)
})

function select(item, i) {
  const letter = String.fromCharCode(65 + i)
  selected.value = { ...selected.value, [item.id]: letter }
}
function toggleReveal(item) {
  revealed.value = { ...revealed.value, [item.id]: !revealed.value[item.id] }
}
function isCorrect(item) {
  return selected.value[item.id] === item.answer
}
function optClass(item, i) {
  const letter = String.fromCharCode(65 + i)
  const show = revealed.value[item.id] || revealAll.value
  if (show) {
    if (letter === item.answer) return 'right'
    if (selected.value[item.id] === letter) return 'wrong'
    return ''
  }
  return selected.value[item.id] === letter ? 'picked' : ''
}
</script>

<style scoped>
.gsw { padding: 4px 0 24px; }

/* 试卷切换 tabs */
.gsw-papers {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--border, #d6d6d6);
}
.gsw-ptab {
  border: none;
  background: transparent;
  padding: 10px 14px 8px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  color: #1d70b8;
  cursor: pointer;
  box-shadow: inset 0 -4px 0 transparent;
}
.gsw-ptab:hover { background: #f3f2f1; }
.gsw-ptab.on {
  color: var(--text-primary, #0b0c0c);
  background: #fff;
  box-shadow: inset 0 -4px 0 #1d70b8;
}
.gsw-ptab:disabled { opacity: 0.5; cursor: wait; }

.gsw-sub {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--text-secondary, #505a5f);
}

/* 实时统计条 */
.gsw-stats {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.gsw-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 8px 12px;
  border: 1px solid var(--border, #d6d6d6);
  background: #fff;
}
.gsw-stat-num {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary, #0b0c0c);
  font-variant-numeric: tabular-nums;
}
.gsw-stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary, #505a5f);
}
.gsw-stat.ok .gsw-stat-num { color: #00703c; }
.gsw-stat.no .gsw-stat-num { color: #d4351c; }

.gsw-toggle {
  margin-left: auto;
  align-self: center;
  border: 2px solid #d4351c;
  background: #fff;
  color: #d4351c;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.gsw-toggle:hover { background: #fbe9e7; }
.gsw-toggle.on { background: #d4351c; color: #fff; }

.gsw-stats-bottom { margin-top: 20px; border-top: 2px solid var(--border, #d6d6d6); padding-top: 16px; }

/* 知识点文档视图 */
.gsw-doc { padding: 4px 0 24px; }
.gsw-doc-h1 {
  margin: 22px 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  border-left: 6px solid #1d70b8;
  padding-left: 10px;
}
.gsw-doc-h1:first-child { margin-top: 4px; }
.gsw-doc-h2 {
  margin: 18px 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: #1d70b8;
}
.gsw-doc-h3 {
  margin: 14px 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
}
.gsw-doc-h3::before { content: '◆ '; color: #1d70b8; }
.gsw-doc-p, .gsw-doc-kv {
  margin: 6px 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-secondary, #505a5f);
}
.gsw-doc-kv { padding-left: 18px; }
.gsw-doc-label {
  display: inline-block;
  margin-right: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #1d70b8;
  padding: 1px 8px;
}
.gsw-doc-hit { background: #ffdd00; color: var(--text-primary, #0b0c0c); }

.gsw-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.gsw-search {
  flex: 1;
  min-width: 180px;
  border: 2px solid #0b0c0c;
  padding: 8px 12px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}
.gsw-search:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.gsw-btn {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
  white-space: nowrap;
}
.gsw-btn:hover { background: #f3f2f1; }

.gsw-list { display: flex; flex-direction: column; gap: 10px; }
.gsw-card { border: 1px solid var(--border, #d6d6d6); background: #fff; }
.gsw-card.open { border-color: #1d70b8; }
.gsw-q {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
}
.gsw-n {
  flex: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted, #b1b4b6);
  font-variant-numeric: tabular-nums;
}
.gsw-qtext { font-size: 16px; font-weight: 700; color: var(--text-primary, #0b0c0c); line-height: 1.6; }

.gsw-opts { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 12px; }
/* 默认无边框（transparent 占位避免对齐跳动）；仅「答案项」揭示后带边框高亮 */
.gsw-opt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 2px solid transparent;
  background: transparent;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 15px;
  color: var(--text-primary, #0b0c0c);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.gsw-opt:hover { background: #f3f2f1; }
.gsw-opt-key {
  flex: none;
  min-width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-weight: 700;
  border: 1px solid transparent;
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
}
.gsw-opt-text { flex: 1; min-width: 0; line-height: 1.5; }
.gsw-opt.picked { background: #e7f0f8; border-color: #1d70b8; }
.gsw-opt.picked .gsw-opt-key { color: #1d70b8; }
.gsw-opt.right { background: #e6f3e6; border-color: #00703c; }
.gsw-opt.right .gsw-opt-key { background: #00703c; color: #fff; border-color: #00703c; }
.gsw-opt.wrong { background: #fbe9e7; border-color: #d4351c; }
.gsw-opt.wrong .gsw-opt-key { background: #d4351c; color: #fff; border-color: #d4351c; }

.gsw-ans { padding: 4px 14px 14px; border-top: 1px solid var(--border, #d6d6d6); }
.gsw-ans-line { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.gsw-ans-label {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #1d70b8;
  padding: 1px 8px;
}
.gsw-ans-key { font-size: 16px; font-weight: 700; color: #00703c; }
.gsw-verdict { font-size: 13px; font-weight: 700; padding: 1px 8px; }
.gsw-verdict.ok { color: #00703c; background: #e6f3e6; }
.gsw-verdict.no { color: #d4351c; background: #fbe9e7; }
.gsw-analysis { margin: 8px 0 0; font-size: 14px; color: var(--text-secondary, #505a5f); line-height: 1.7; }

.gsw-foot { padding: 0 14px 12px; }
.gsw-link {
  background: transparent;
  border: none;
  color: #1d70b8;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.gsw-empty { padding: 28px 0; text-align: center; color: var(--text-secondary, #505a5f); font-size: 15px; }

.gsw-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.gsw-pg {
  border: 2px solid #0b0c0c;
  background: #fff;
  padding: 7px 14px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.gsw-pg:disabled { opacity: 0.4; cursor: not-allowed; }
.gsw-pg-info { font-size: 14px; color: var(--text-secondary, #505a5f); }
.gsw-size { border: 2px solid #0b0c0c; padding: 6px 8px; font-size: 14px; font-family: inherit; }

@media (max-width: 768px) {
  .gsw-search { min-width: 140px; }
  .gsw-qtext { font-size: 15px; }
  .gsw-opt { font-size: 14px; }
}
</style>
