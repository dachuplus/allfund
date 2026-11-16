<template>
  <div class="mcq">
    <div class="mcq-head">
      <p class="mcq-sub">
        MC 图鉴题库共 {{ total }} 题，覆盖 {{ cats.length }} 个分类；每组随机抽 {{ PICK }} 题，全部作答后提交评级。
      </p>
      <button v-if="!loading && !loadError" class="mcq-btn" type="button" @click="draw">再抽一组</button>
    </div>

    <div v-if="loading" class="mcq-empty">题库加载中…</div>
    <div v-else-if="loadError" class="mcq-empty">
      题库加载失败：{{ loadError }}
      <button class="mcq-link" type="button" @click="load">重试</button>
    </div>

    <template v-else>
      <!-- 提交前：作答进度 -->
      <div v-if="!submitted" class="mcq-progress">
        <div class="mcq-track"><span class="mcq-fill" :style="{ width: progressPct + '%' }"></span></div>
        <span class="mcq-progress-text">已作答 {{ answeredCount }} / {{ PICK }} 题</span>
      </div>

      <!-- 提交后：星级评定 -->
      <div v-else class="mcq-result">
        <div class="mcq-stars">
          <span v-for="n in 5" :key="n" class="mcq-star" :class="{ on: n <= rank.level }"></span>
        </div>
        <div class="mcq-rank">{{ rank.title }}</div>
        <div class="mcq-result-line">答对 {{ correctCount }} / {{ PICK }} 题，正确率 {{ rate }}%</div>
        <button class="mcq-toggle" type="button" :class="{ on: onlyWrong }" @click="onlyWrong = !onlyWrong">
          {{ onlyWrong ? '显示全部' : '只看错题' }}
        </button>
      </div>

      <div v-if="!shownItems.length" class="mcq-empty">本组全部答对，没有错题</div>
      <div v-else class="mcq-list">
        <div v-for="item in shownItems" :key="item.id" class="mcq-card" :class="{ open: submitted }">
          <div class="mcq-q">
            <span class="mcq-n">第 {{ item._no }} 题</span>
            <span class="mcq-cat">{{ item.cat }}</span>
            <span class="mcq-qtext">{{ item.q }}</span>
          </div>

          <div class="mcq-opts">
            <button
              v-for="(opt, i) in item.options"
              :key="i"
              type="button"
              class="mcq-opt"
              :class="optClass(item, i)"
              :disabled="submitted"
              @click="select(item, i)"
            >
              <span class="mcq-opt-key">{{ letters[i] }}</span>
              <span class="mcq-opt-text">{{ opt }}</span>
            </button>
          </div>

          <div v-if="submitted" class="mcq-ans">
            <div class="mcq-ans-line">
              <span class="mcq-ans-label">答案</span>
              <span class="mcq-ans-key">{{ letters[item.answer] }}. {{ item.options[item.answer] }}</span>
              <span class="mcq-verdict" :class="isCorrect(item) ? 'ok' : 'no'">
                {{ isCorrect(item) ? '答对了' : '答错了' }}
              </span>
            </div>
            <p class="mcq-analysis"><span class="mcq-ans-label">解析</span>{{ item.note }}</p>
          </div>
        </div>
      </div>

      <div v-if="!submitted" class="mcq-submit">
        <button class="mcq-primary" type="button" :disabled="answeredCount < PICK" @click="submit">
          {{ answeredCount < PICK ? '还有 ' + (PICK - answeredCount) + ' 题未作答' : '提交并评级' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const PICK = 10
const letters = ['A', 'B', 'C', 'D']

// 全量题库不入响应式，避免 1000 条数据被深度代理；仅当前 10 题进入 ref
let bank = []
let lastIds = new Set()

const loading = ref(true)
const loadError = ref('')
const total = ref(0)
const cats = ref([])
const items = ref([])
const selected = ref({})
const submitted = ref(false)
const onlyWrong = ref(false)

const answeredCount = computed(() => items.value.filter(x => selected.value[x.id] !== undefined).length)
const correctCount = computed(() => items.value.filter(x => selected.value[x.id] === x.answer).length)
const rate = computed(() => Math.round(correctCount.value / PICK * 100))
const progressPct = computed(() => Math.round(answeredCount.value / PICK * 100))

const rank = computed(() => {
  const c = correctCount.value
  if (c >= 10) return { level: 5, title: '五星玩家' }
  if (c >= 8) return { level: 4, title: '四星玩家' }
  if (c >= 6) return { level: 3, title: '三星玩家' }
  if (c >= 4) return { level: 2, title: '二星玩家' }
  return { level: 1, title: '一星玩家' }
})

const shownItems = computed(() => {
  if (!submitted.value || !onlyWrong.value) return items.value
  return items.value.filter(x => !isCorrect(x))
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const mod = await import('../../data/mcQuizBank.js')
    bank = Array.isArray(mod.MC_QUIZ_BANK) ? mod.MC_QUIZ_BANK : []
    cats.value = Array.isArray(mod.MC_QUIZ_CATS) ? mod.MC_QUIZ_CATS : []
    total.value = bank.length
    if (bank.length < PICK) throw new Error('题库不足 ' + PICK + ' 题')
    lastIds = new Set()
    items.value = []
    draw()
  } catch (e) {
    loadError.value = (e && e.message) ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// Fisher-Yates 洗牌抽 10 题；「再抽一组」避开上一组，组内不重复
function draw() {
  lastIds = new Set(items.value.map(x => x.id))
  const pool = bank.filter(x => !lastIds.has(x.id))
  const src = pool.length >= PICK ? pool : bank.slice()
  const a = src.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  items.value = a.slice(0, PICK).map((x, i) => ({ ...x, _no: i + 1 }))
  selected.value = {}
  submitted.value = false
  onlyWrong.value = false
}

function select(item, i) {
  if (submitted.value) return
  selected.value = { ...selected.value, [item.id]: i }
}

function submit() {
  if (answeredCount.value < PICK) return
  submitted.value = true
}

function isCorrect(item) {
  return selected.value[item.id] === item.answer
}

function optClass(item, i) {
  if (!submitted.value) return selected.value[item.id] === i ? 'picked' : ''
  if (i === item.answer) return 'right'
  if (selected.value[item.id] === i) return 'wrong'
  return ''
}

onMounted(load)
</script>

<style scoped>
.mcq { width: 100%; padding: 4px 0 24px; }

.mcq-head {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.mcq-sub {
  flex: 1 1 240px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, #505a5f);
}

.mcq-btn {
  flex: none;
  border: 2px solid #1d70b8;
  background: #fff;
  color: #1d70b8;
  padding: 7px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.mcq-btn:hover { background: #e7f0f8; }

.mcq-link {
  border: none;
  background: transparent;
  color: #1d70b8;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 0 0 0 8px;
  text-decoration: underline;
}

.mcq-empty {
  padding: 28px 0;
  text-align: center;
  font-size: 15px;
  color: var(--text-secondary, #505a5f);
}

/* 作答进度 */
.mcq-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.mcq-track {
  flex: 1;
  height: 12px;
  border: 1px solid var(--border, #d6d6d6);
  background: #fff;
}
.mcq-fill {
  display: block;
  height: 100%;
  background: #1d70b8;
  transition: width 0.15s;
}
.mcq-progress-text {
  flex: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  font-variant-numeric: tabular-nums;
}

/* 结果卡 */
.mcq-result {
  border: 2px solid #1d70b8;
  background: #fff;
  padding: 16px;
  margin-bottom: 16px;
}
.mcq-stars { display: flex; gap: 6px; margin-bottom: 10px; }
.mcq-star {
  width: 20px;
  height: 20px;
  border: 2px solid #b1b4b6;
  background: #fff;
}
.mcq-star.on { background: #1d70b8; border-color: #1d70b8; }
.mcq-rank {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  color: #1d70b8;
}
.mcq-result-line {
  margin-top: 4px;
  font-size: 14px;
  color: var(--text-secondary, #505a5f);
  font-variant-numeric: tabular-nums;
}
.mcq-toggle {
  margin-top: 12px;
  border: 2px solid #d4351c;
  background: #fff;
  color: #d4351c;
  padding: 7px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.mcq-toggle:hover { background: #fbe9e7; }
.mcq-toggle.on { background: #d4351c; color: #fff; }

/* 题目列表 */
.mcq-list { display: flex; flex-direction: column; gap: 12px; }
.mcq-card { border: 1px solid var(--border, #d6d6d6); background: #fff; }
.mcq-card.open { border-color: #1d70b8; }
.mcq-q {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
}
.mcq-n {
  flex: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted, #b1b4b6);
  font-variant-numeric: tabular-nums;
}
.mcq-cat {
  flex: none;
  font-size: 12px;
  color: #1d70b8;
  border: 1px solid #1d70b8;
  padding: 0 6px;
}
.mcq-qtext {
  flex: 1 1 200px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.6;
  color: var(--text-primary, #0b0c0c);
}

.mcq-opts { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 12px; }
.mcq-opt {
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
.mcq-opt:not(:disabled):hover { background: #f3f2f1; }
.mcq-opt:disabled { cursor: default; }
.mcq-opt-key {
  flex: none;
  min-width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid transparent;
  color: var(--text-secondary, #505a5f);
}
.mcq-opt-text { flex: 1; min-width: 0; line-height: 1.5; }
.mcq-opt.picked { background: #e7f0f8; border-color: #1d70b8; }
.mcq-opt.picked .mcq-opt-key { color: #1d70b8; }
.mcq-opt.right { background: #e6f3e6; border-color: #00703c; }
.mcq-opt.right .mcq-opt-key { background: #00703c; color: #fff; border-color: #00703c; }
.mcq-opt.wrong { background: #fbe9e7; border-color: #d4351c; }
.mcq-opt.wrong .mcq-opt-key { background: #d4351c; color: #fff; border-color: #d4351c; }

.mcq-ans { padding: 4px 14px 14px; border-top: 1px solid var(--border, #d6d6d6); }
.mcq-ans-line { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.mcq-ans-label {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #1d70b8;
  padding: 1px 8px;
}
.mcq-ans-key { font-size: 15px; font-weight: 700; color: #00703c; }
.mcq-verdict { font-size: 13px; font-weight: 700; padding: 1px 8px; }
.mcq-verdict.ok { color: #00703c; background: #e6f3e6; }
.mcq-verdict.no { color: #d4351c; background: #fbe9e7; }
.mcq-analysis {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #505a5f);
}

.mcq-submit { margin-top: 18px; }
.mcq-primary {
  width: 100%;
  border: 2px solid #1d70b8;
  background: #1d70b8;
  color: #fff;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.mcq-primary:hover { background: #003078; border-color: #003078; }
.mcq-primary:disabled {
  background: #f3f2f1;
  border-color: #b1b4b6;
  color: var(--text-secondary, #505a5f);
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .mcq-q { gap: 8px; padding: 10px 12px; }
  .mcq-qtext { font-size: 15px; }
  .mcq-opts { padding: 0 12px 10px; }
  .mcq-opt { font-size: 14px; padding: 8px 10px; }
  .mcq-rank { font-size: 21px; }
}
</style>
