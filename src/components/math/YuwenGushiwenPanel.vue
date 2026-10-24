<template>
  <div class="gsw">
    <p class="gsw-sub">{{ title }}　共 {{ list.length }} 题（含答案与解析）</p>

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
        <option :value="10">10 题/页</option>
        <option :value="20">20 题/页</option>
        <option :value="50">50 题/页</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { GUSHIWEN_DASAI, GUSHIWEN_DASAI_TITLE } from '../../data/gushiwenDasai.js'

const title = GUSHIWEN_DASAI_TITLE
const list = GUSHIWEN_DASAI

const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const selected = ref({})   // { [id]: 'A'|'B'|'C'|'D' }
const revealed = ref({})   // { [id]: true } —— 已点开答案
const revealAll = ref(false)
const onlyWrong = ref(false)   // 错题本筛选

// 搜索 / 切换错题本时回到第一页
watch([search, onlyWrong], () => { page.value = 1 })

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  let arr = list
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
  for (const it of list) {
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
