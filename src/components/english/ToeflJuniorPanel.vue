<template>
  <div class="tj">
    <!-- 周次切换 -->
    <div class="tj-weeks" role="tablist">
      <button
        v-for="w in weeks"
        :key="w.key"
        type="button"
        role="tab"
        class="tj-wtab"
        :class="{ on: weekKey === w.key }"
        :disabled="loading"
        :aria-selected="weekKey === w.key"
        @click="switchWeek(w.key)"
      >{{ w.label }}</button>
    </div>

    <p v-if="loading" class="tj-sub">加载中…</p>

    <template v-else-if="week">
      <div class="tj-head">
        <h3 class="tj-title">小托福加油站 · {{ week.label }}</h3>
        <p class="tj-subject">{{ week.subject }}</p>
      </div>

      <!-- 统计条 + 错题本 -->
      <div class="tj-stats">
        <div class="tj-stat">
          <span class="tj-num">{{ stats.answered }}</span>
          <span class="tj-label">已作答</span>
        </div>
        <div class="tj-stat ok">
          <span class="tj-num">{{ stats.correct }}</span>
          <span class="tj-label">答对</span>
        </div>
        <div class="tj-stat no">
          <span class="tj-num">{{ stats.wrong }}</span>
          <span class="tj-label">答错</span>
        </div>
        <div class="tj-stat">
          <span class="tj-num">{{ stats.rate }}%</span>
          <span class="tj-label">正确率</span>
        </div>
        <button type="button" class="tj-btn" :class="{ on: onlyWrong }" @click="toggleWrong">
          {{ onlyWrong ? '退出错题本' : '只看错题' }}
        </button>
        <button type="button" class="tj-btn" :class="{ on: revealAll }" @click="revealAll = !revealAll">
          {{ revealAll ? '收起全部解析' : '显示全部解析' }}
        </button>
      </div>

      <!-- 各部分 -->
      <div v-for="part in week.parts" :key="part.key" class="tj-part">
        <div class="tj-part-head">
          <h4 class="tj-part-title">{{ part.title }}</h4>
          <span v-if="part.subtitle" class="tj-part-sub">{{ part.subtitle }}</span>
        </div>

        <!-- 听力音频（二维码解析出的链接） -->
        <div v-if="part.audio && part.audio.length" class="tj-audio">
          <div class="tj-audio-label">听力音频（原讲义二维码）</div>
          <div class="tj-audio-links">
            <a
              v-for="(a, i) in part.audio"
              :key="i"
              class="tj-audio-link"
              :href="a.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ a.label }}　打开音频</a>
          </div>
          <p v-if="part.audioNote" class="tj-audio-note">{{ part.audioNote }}</p>
        </div>

        <!-- 听力原文（可折叠） -->
        <div v-if="part.transcript && part.transcript.length" class="tj-trans">
          <button type="button" class="tj-fold" @click="toggleTrans(part.key)">
            {{ transOpen[part.key] ? '收起听力原文' : '展开听力原文（听完再看）' }}
          </button>
          <div v-if="transOpen[part.key]" class="tj-trans-body">
            <div v-for="(t, i) in part.transcript" :key="i" class="tj-trans-item">
              <div class="tj-trans-label">{{ t.label }}</div>
              <div class="tj-trans-text">{{ t.text }}</div>
            </div>
          </div>
        </div>

        <!-- 专项练习答案（可折叠，非选择题） -->
        <div v-if="part.drills && part.drills.length" class="tj-drills">
          <button type="button" class="tj-fold" @click="toggleDrill(part.key)">
            {{ drillOpen[part.key] ? '收起专项练习答案' : '展开专项练习答案' }}
          </button>
          <div v-if="drillOpen[part.key]" class="tj-drill-body">
            <div v-for="(d, i) in part.drills" :key="i" class="tj-drill">
              <div class="tj-drill-title">{{ d.title }}</div>
              <div class="tj-drill-text">{{ d.answer }}</div>
            </div>
          </div>
        </div>

        <!-- 考场实战题目组 -->
        <div v-for="g in part.groups" :key="g.key" class="tj-group">
          <div class="tj-group-head">
            <span class="tj-group-label">{{ g.label }}</span>
            <span v-if="g.passageNote" class="tj-group-note">{{ g.passageNote }}</span>
          </div>

          <div v-if="!visibleQuestions(part.key, g.key).length" class="tj-empty">
            {{ onlyWrong ? '这部分还没有错题' : '暂无题目' }}
          </div>

          <div
            v-for="q in visibleQuestions(part.key, g.key)"
            :key="q.uid"
            class="tj-card"
            :class="{ wrong: isWrong(q.uid) }"
          >
            <div class="tj-q">
              <span class="tj-n">第 {{ q.n }} 题</span>
              <span class="tj-qtext">{{ q.q }}</span>
            </div>

            <div class="tj-opts">
              <button
                v-for="(opt, i) in q.options"
                :key="i"
                type="button"
                class="tj-opt"
                :class="optClass(q, i)"
                @click="select(q, i)"
              >
                <span class="tj-opt-key">{{ String.fromCharCode(65 + i) }}</span>
                <span class="tj-opt-text">{{ opt }}</span>
              </button>
            </div>

            <!-- 解题逻辑：默认隐藏，可展开 -->
            <div class="tj-why-bar">
              <button type="button" class="tj-fold sm" @click="toggleWhy(q.uid)">
                {{ whyOpen[q.uid] ? '收起解题逻辑' : '查看解题逻辑' }}
              </button>
              <span v-if="answers[q.uid] != null" class="tj-verdict" :class="isCorrect(q.uid) ? 'ok' : 'no'">
                {{ isCorrect(q.uid) ? '答对了' : '答错了' }}
              </span>
            </div>

            <div v-if="whyOpen[q.uid]" class="tj-why">
              <div v-if="q.key" class="tj-why-clue">
                <span class="tj-why-tag">原文依据</span>
                <span class="tj-why-text">{{ q.key }}</span>
              </div>
              <div v-if="q.why && q.why.right" class="tj-why-right">
                <span class="tj-why-tag ok">正确项 {{ String.fromCharCode(65 + q.answer) }} 为什么对</span>
                <span class="tj-why-text">{{ q.why.right }}</span>
              </div>
              <div v-if="q.why && q.why.wrong && q.why.wrong.length" class="tj-why-wrong">
                <span class="tj-why-tag no">其他选项为什么错</span>
                <ul class="tj-why-list">
                  <li v-for="(w, i) in q.why.wrong" :key="i">{{ w }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 小托福加油站（TOEFL Junior）练习面板。
 *
 * 数据来源：Week1-5 学生讲义 + 答案解析 PDF，解析为静态 JS 数据（零网络请求）。
 * 结构：周次 tab → PART A / PART B → 专项练习答案（折叠）
 *      → 考场实战题目（作答判定 + 解题逻辑折叠 + 只看错题）。
 * 听力音频为原讲义二维码解析出的外链，target=_blank 打开。
 */
import { ref, computed, reactive, watch } from 'vue'

const WEEKS = [
  { key: 'w1', label: 'Week 1' },
  { key: 'w2', label: 'Week 2' },
  { key: 'w3', label: 'Week 3' },
  { key: 'w4', label: 'Week 4' },
  { key: 'w5', label: 'Week 5' },
]
const LOADERS = {
  w1: () => import('../../data/toeflJuniorW1.js'),
  w2: () => import('../../data/toeflJuniorW2.js'),
  w3: () => import('../../data/toeflJuniorW3.js'),
  w4: () => import('../../data/toeflJuniorW4.js'),
  w5: () => import('../../data/toeflJuniorW5.js'),
}

const weeks = WEEKS
const loading = ref(false)
const weekKey = ref('w1')
const week = ref(null)

// 作答状态：uid -> 选中下标
const answers = reactive({})
const whyOpen = reactive({})
const transOpen = reactive({})
const drillOpen = reactive({})
const onlyWrong = ref(false)
const revealAll = ref(false)

async function loadWeek(k) {
  loading.value = true
  try {
    const m = await LOADERS[k]()
    week.value = m.WEEK || null
  } catch (e) {
    week.value = null
  } finally {
    loading.value = false
  }
}

function switchWeek(k) {
  if (k === weekKey.value && week.value) return
  weekKey.value = k
  resetAll()
  loadWeek(k)
}

function resetAll() {
  Object.keys(answers).forEach((k) => delete answers[k])
  Object.keys(whyOpen).forEach((k) => delete whyOpen[k])
  Object.keys(transOpen).forEach((k) => delete transOpen[k])
  Object.keys(drillOpen).forEach((k) => delete drillOpen[k])
  onlyWrong.value = false
  revealAll.value = false
}

// 全部题目（扁平，用于统计）
const allQuestions = computed(() => {
  if (!week.value) return []
  const out = []
  week.value.parts.forEach((p) => {
    p.groups.forEach((g) => {
      g.questions.forEach((q) => {
        out.push({ ...q, uid: `${p.key}-${g.key}-${q.n}` })
      })
    })
  })
  return out
})

const stats = computed(() => {
  let answered = 0
  let correct = 0
  allQuestions.value.forEach((q) => {
    const a = answers[q.uid]
    if (a != null) {
      answered += 1
      if (a === q.answer) correct += 1
    }
  })
  return {
    answered,
    correct,
    wrong: answered - correct,
    rate: answered ? Math.round((correct / answered) * 100) : 0,
  }
})

function select(q, i) {
  answers[q.uid] = i
  // 作答后自动展开该题解题逻辑
  whyOpen[q.uid] = true
}

function isCorrect(uid) {
  const q = allQuestions.value.find((x) => x.uid === uid)
  return q && answers[uid] === q.answer
}
function isWrong(uid) {
  return answers[uid] != null && !isCorrect(uid)
}

function optClass(q, i) {
  const a = answers[q.uid]
  if (a == null) return ''
  if (i === q.answer) return 'right'
  if (i === a) return 'bad'
  return 'dim'
}

function visibleQuestions(pkey, gkey) {
  const part = week.value && week.value.parts.find((p) => p.key === pkey)
  if (!part) return []
  const g = part.groups.find((x) => x.key === gkey)
  if (!g) return []
  const list = g.questions.map((q) => ({ ...q, uid: `${pkey}-${gkey}-${q.n}` }))
  if (onlyWrong.value) return list.filter((q) => isWrong(q.uid))
  return list
}

function toggleWhy(uid) {
  whyOpen[uid] = !whyOpen[uid]
}
function toggleTrans(k) {
  transOpen[k] = !transOpen[k]
}
function toggleDrill(k) {
  drillOpen[k] = !drillOpen[k]
}
function toggleWrong() {
  onlyWrong.value = !onlyWrong.value
  if (onlyWrong.value) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 全部展开/收起解析
watch(revealAll, (v) => {
  allQuestions.value.forEach((q) => { whyOpen[q.uid] = v })
})

loadWeek('w1')
</script>

<style scoped>
.tj { user-select: none; }
.tj-weeks { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.tj-wtab {
  border: 1px solid #b1b4b6; background: #fff; padding: 6px 14px;
  cursor: pointer; font-size: 13px; color: #1d70b8;
}
.tj-wtab:hover { background: #e6f1fb; }
.tj-wtab.on { background: #1d70b8; border-color: #1d70b8; color: #fff; font-weight: 700; }
.tj-wtab:disabled { opacity: 0.5; cursor: default; }

.tj-head { border-bottom: 2px solid #1d70b8; padding-bottom: 8px; margin-bottom: 12px; }
.tj-title { margin: 0; font-size: 17px; font-weight: 700; color: #0b0c0c; }
.tj-subject { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
.tj-sub { font-size: 13px; color: var(--text-secondary); }

.tj-stats {
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
  border: 1px solid #b1b4b6; background: #f3f2f1;
  padding: 8px 12px; margin-bottom: 14px;
}
.tj-stat { display: flex; align-items: baseline; gap: 4px; }
.tj-num { font-size: 16px; font-weight: 700; color: #0b0c0c; }
.tj-stat.ok .tj-num { color: #00703c; }
.tj-stat.no .tj-num { color: #d4351c; }
.tj-label { font-size: 12px; color: var(--text-secondary); }
.tj-btn {
  border: 1px solid #1d70b8; background: #fff; color: #1d70b8;
  padding: 4px 10px; font-size: 12px; cursor: pointer;
}
.tj-btn:hover { background: #e6f1fb; }
.tj-btn.on { background: #1d70b8; color: #fff; }

.tj-part { border-top: 2px solid #1d70b8; padding-top: 12px; margin-top: 18px; }
.tj-part-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.tj-part-title { margin: 0; font-size: 15px; font-weight: 700; color: #0b0c0c; }
.tj-part-sub { font-size: 12px; color: var(--text-secondary); }

.tj-audio { border: 1px solid #b1b4b6; padding: 8px 10px; margin-bottom: 10px; }
.tj-audio-label { font-size: 12px; font-weight: 700; color: #1d70b8; margin-bottom: 6px; }
.tj-audio-links { display: flex; flex-wrap: wrap; gap: 8px; }
.tj-audio-link {
  font-size: 13px; color: #1d70b8; text-decoration: underline;
  border: 1px solid #1d70b8; padding: 3px 8px;
}
.tj-audio-link:hover { background: #e6f1fb; }
.tj-audio-note { margin: 6px 0 0; font-size: 11px; color: var(--text-tertiary); }

.tj-trans, .tj-drills { margin-bottom: 10px; }
.tj-fold {
  border: 1px solid #b1b4b6; background: #fff; color: #1d70b8;
  font-size: 12px; padding: 4px 10px; cursor: pointer;
}
.tj-fold:hover { background: #e6f1fb; }
.tj-fold.sm { font-size: 11px; padding: 3px 8px; }
.tj-trans-body, .tj-drill-body {
  margin-top: 8px; border-left: 3px solid #b1b4b6; padding-left: 10px;
}
.tj-trans-item { margin-bottom: 10px; }
.tj-trans-label { font-size: 12px; font-weight: 700; color: #0b0c0c; }
.tj-trans-text {
  font-size: 13px; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap;
}
.tj-drill { margin-bottom: 8px; }
.tj-drill-title { font-size: 12px; font-weight: 700; color: #0b0c0c; }
.tj-drill-text { font-size: 13px; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; }

.tj-group { margin-top: 14px; }
.tj-group-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
.tj-group-label { font-size: 13px; font-weight: 700; color: #1d70b8; }
.tj-group-note { font-size: 12px; color: var(--text-tertiary); }
.tj-empty { font-size: 13px; color: var(--text-tertiary); padding: 8px 0; }

.tj-card {
  border: 1px solid #b1b4b6; border-left: 3px solid #b1b4b6;
  padding: 10px 12px; margin-bottom: 10px;
}
.tj-card.wrong { border-left-color: #d4351c; }
.tj-q { display: flex; gap: 8px; margin-bottom: 8px; }
.tj-n { font-size: 12px; color: #1d70b8; font-weight: 700; white-space: nowrap; }
.tj-qtext { font-size: 14px; line-height: 1.7; color: #0b0c0c; }

.tj-opts { display: flex; flex-direction: column; gap: 4px; }
.tj-opt {
  display: flex; gap: 8px; align-items: flex-start; text-align: left;
  border: 1px solid #b1b4b6; background: #fff;
  padding: 5px 8px; cursor: pointer; font-size: 13px; color: #0b0c0c;
}
.tj-opt:hover { background: #f3f2f1; }
.tj-opt-key { font-weight: 700; min-width: 14px; }
.tj-opt.right { border-color: #00703c; background: #e7f4ea; }
.tj-opt.bad { border-color: #d4351c; background: #f6e5e3; }
.tj-opt.dim { opacity: 0.55; }

.tj-why-bar { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.tj-verdict { font-size: 12px; font-weight: 700; }
.tj-verdict.ok { color: #00703c; }
.tj-verdict.no { color: #d4351c; }

.tj-why { margin-top: 8px; border-top: 1px dashed #b1b4b6; padding-top: 8px; }
.tj-why-clue, .tj-why-right, .tj-why-wrong { margin-bottom: 6px; }
.tj-why-tag {
  display: inline-block; font-size: 11px; font-weight: 700;
  color: #0b0c0c; background: #f3f2f1; padding: 1px 6px; margin-right: 6px;
}
.tj-why-tag.ok { background: #e7f4ea; color: #00703c; }
.tj-why-tag.no { background: #f6e5e3; color: #d4351c; }
.tj-why-text { font-size: 13px; line-height: 1.7; color: var(--text-secondary); }
.tj-why-list { margin: 4px 0 0; padding-left: 20px; }
.tj-why-list li { font-size: 13px; line-height: 1.7; color: var(--text-secondary); }
</style>
