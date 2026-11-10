<template>
  <div class="sq">
    <h2 class="sq-title">平方数速查表（1–100）</h2>
    <p class="sq-intro">
      本表列出 <strong>1 到 100 每个整数的平方</strong>（n² = n × n），共 100 行，按每 25 个一组分成四段，便于对照速查。
      所有数值由页面当场计算，不做人工录入。另附「100 以内的完全平方数」清单与常用速算方法。
    </p>

    <!-- 一、速查工具 -->
    <section class="sq-sec">
      <h3 class="sq-h">一、速查工具</h3>
      <div class="sq-tools">
        <div class="sq-tool">
          <label class="sq-label" for="sq-n">由数查平方（1–100）</label>
          <input
            id="sq-n"
            v-model="qn"
            class="sq-input"
            type="number"
            min="1"
            max="100"
            inputmode="numeric"
            placeholder="如 37"
            @keyup.enter="doFind"
          />
          <span class="sq-eq">→</span>
          <span class="sq-result">{{ sqResult }}</span>
          <button class="sq-btn" type="button" @click="doFind">定位</button>
        </div>
        <div class="sq-tool">
          <label class="sq-label" for="sq-rev">由平方反查原数</label>
          <input
            id="sq-rev"
            v-model="qs"
            class="sq-input"
            type="number"
            min="0"
            max="10000"
            inputmode="numeric"
            placeholder="如 1369"
            @keyup.enter="doReverse"
          />
          <span class="sq-eq">→</span>
          <span class="sq-result sq-result--wide">{{ reverseText }}</span>
          <button class="sq-btn" type="button" @click="doReverse">反查</button>
        </div>
      </div>
      <p class="sq-tip">输入后按回车也可以。命中结果会在下方表格中高亮并滚动定位；反查不到时给出相邻的两个平方数。</p>
    </section>

    <!-- 二、1–100 平方数全表 -->
    <section class="sq-sec">
      <h3 class="sq-h">二、1–100 平方数全表</h3>
      <div class="sq-groups">
        <div class="sq-group" v-for="g in GROUPS" :key="g.from">
          <h4 class="sq-group-h">{{ g.from }} – {{ g.to }}</h4>
          <table class="sq-grid">
            <thead>
              <tr><th scope="col">n</th><th scope="col">n²</th></tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rowsOf(g)"
                :key="r.n"
                :id="'sq-n-' + r.n"
                :class="{ 'sq-hit': hit === r.n }"
              >
                <td class="sq-n">{{ r.n }}</td>
                <td class="sq-v">{{ r.sq }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 三、100 以内的完全平方数 -->
    <section class="sq-sec">
      <h3 class="sq-h">三、100 以内的完全平方数</h3>
      <p class="sq-lead">平方值不超过 100 的共有 {{ SMALL.length }} 个：</p>
      <div class="sq-chips">
        <span class="sq-chip" v-for="s in SMALL" :key="s.v">{{ s.n }}² = {{ s.v }}</span>
      </div>
    </section>

    <!-- 四、常用速算方法 -->
    <section class="sq-sec">
      <h3 class="sq-h">四、常用速算方法</h3>
      <div class="sq-rule" v-for="(r, i) in RULES" :key="i">
        <div class="sq-rule-name">{{ i + 1 }}. {{ r.name }}</div>
        <div class="sq-rule-text">{{ r.rule }}</div>
        <div class="sq-egs">
          <span class="sq-eg" v-for="(e, j) in r.demo" :key="j">{{ e }}</span>
        </div>
      </div>
      <p class="sq-tip">建议先把 1 到 25 的平方背熟，这一段在奥数计算题里出现频率最高。</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 口径：1–100 每个整数的平方；所有数值都在运行时计算，杜绝手写数字出错
const MAX = 100
const GROUPS = [
  { from: 1, to: 25 },
  { from: 26, to: 50 },
  { from: 51, to: 75 },
  { from: 76, to: 100 },
]
const rowsOf = (g) => Array.from({ length: g.to - g.from + 1 }, (_, i) => {
  const n = g.from + i
  return { n, sq: n * n }
})
// 「100 以内的完全平方数」：1² ~ 10²，共 10 个
const SMALL = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  return { n, v: n * n }
})

// 速算示例同样由 JS 当场算出
const s5 = (a) => { const v = a * 10 + 5; return `${v}² = ${v * v}` }
const sNear = (a) => { const v = 100 - a; return `${v}² = ${v * v}` }
const RULES = [
  {
    name: '末位是 5 的平方',
    rule: '把 5 前面的部分记作 a，结果就是 a ×（a + 1）后面接 25。',
    demo: [s5(1), s5(3), s5(9)],
  },
  {
    name: '相邻两个平方数递推',
    rule: '（n + 1）² = n² + 2n + 1。知道一个平方，加一次「2n + 1」就得到下一个。',
    demo: [`40² = ${40 * 40}`, `41² = ${41 * 41}`, `42² = ${42 * 42}`],
  },
  {
    name: '接近整十整百',
    rule: '（a − b）² = a² − 2ab + b²。把 99² 想成（100 − 1）²，比列竖式快。',
    demo: [sNear(1), sNear(2), sNear(3)],
  },
  {
    name: '平方差公式',
    rule: 'a² − b² =（a − b）（a + b）。两数之和凑成整十整百时尤其好用。',
    demo: [
      `53² − 47² = ${53 * 53 - 47 * 47}`,
      `32² − 28² = ${32 * 32 - 28 * 28}`,
      `26² − 24² = ${26 * 26 - 24 * 24}`,
    ],
  },
]

function clamp(v, lo, hi) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 0
  return Math.min(hi, Math.max(lo, n))
}

const qn = ref(null)
const qs = ref(null)
const hit = ref(0)

const sqResult = computed(() => {
  const n = clamp(qn.value, 1, MAX)
  return n ? `${n}² = ${n * n}` : '—'
})

/** 反查：完全平方则给出 n；否则给出相邻两个平方数夹住它 */
function analyse(v) {
  if (v === '' || v === null || v === undefined) return null
  const x = Number(v)
  if (!Number.isFinite(x) || !Number.isInteger(x) || x < 0) return { bad: true }
  if (x === 0) return { zero: true }
  const r = Math.round(Math.sqrt(x))
  if (r >= 1 && r <= MAX && r * r === x) return { exact: true, n: r }
  if (x > MAX * MAX) return { over: true }
  const lo = Math.floor(Math.sqrt(x))
  const hi = Math.min(MAX, lo + 1)
  return { exact: false, lo, loSq: lo * lo, hi, hiSq: hi * hi }
}
const reverseText = computed(() => {
  const a = analyse(qs.value)
  if (!a) return '—'
  if (a.bad) return '请输入非负整数'
  if (a.zero) return '0² = 0（不在本表范围内）'
  if (a.over) return `超出 ${MAX}² = ${MAX * MAX}`
  if (a.exact) return `${a.n}²`
  return `${a.lo}² = ${a.loSq} ＜ 它 ＜ ${a.hi}² = ${a.hiSq}`
})

function scrollTo(n) {
  const el = document.getElementById('sq-n-' + n)
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
function doFind() {
  const n = clamp(qn.value, 1, MAX)
  if (!n) return
  hit.value = n
  scrollTo(n)
}
function doReverse() {
  const a = analyse(qs.value)
  if (!a || a.bad || a.zero || a.over) { hit.value = 0; return }
  const n = a.exact ? a.n : a.lo
  hit.value = n
  if (n >= 1) scrollTo(n)
}
</script>

<style scoped>
.sq {
  font-size: 14px;
  line-height: 1.6;
  color: #0b0c0c;
}
.sq-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #0b0c0c;
}
.sq-intro {
  margin: 0 0 20px;
  color: #505a5e;
  font-size: 13px;
}
.sq-sec {
  margin-bottom: 28px;
}
.sq-h {
  font-size: 18px;
  font-weight: 700;
  color: #0b0c0c;
  margin: 0 0 10px;
  padding-left: 10px;
  border-left: 4px solid #1d70b8;
}
.sq-lead,
.sq-tip {
  margin: 0 0 12px;
  color: #505a5e;
  font-size: 13px;
}
.sq-tip {
  margin: 10px 0 0;
}

/* 速查工具条：gov.uk 风格，无圆角无阴影 */
.sq-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 4px;
}
.sq-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sq-label {
  font-size: 13px;
  font-weight: 700;
  color: #0b0c0c;
}
.sq-input {
  width: 92px;
  padding: 6px 8px;
  border: 1px solid #0b0c0c;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.sq-input:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
}
.sq-btn {
  background: #1d70b8;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.sq-btn:hover {
  background: #003078;
}
.sq-eq {
  font-size: 15px;
  font-weight: 700;
  color: #0b0c0c;
}
.sq-result {
  display: inline-block;
  min-width: 92px;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: #f3f2f1;
  border: 1px solid #b1b4b6;
  padding: 4px 8px;
}
.sq-result--wide {
  min-width: 190px;
  font-size: 13px;
}

/* 全表：四段并排，窄屏自动降为两列 / 一列（移动优先，不需要横向滚动） */
.sq-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
  align-items: start;
}
.sq-group-h {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: #1d70b8;
  margin: 0;
  padding: 6px 10px;
}
.sq-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.sq-grid th,
.sq-grid td {
  border: 1px solid #b1b4b6;
  padding: 3px 8px;
  text-align: center;
  white-space: nowrap;
}
.sq-grid thead th {
  background: #f3f2f1;
  font-weight: 700;
  color: #0b0c0c;
}
.sq-grid .sq-n {
  font-weight: 700;
  color: #1d70b8;
  width: 40%;
}
.sq-grid .sq-v {
  font-weight: 700;
  color: #0b0c0c;
}
.sq-grid tbody tr:hover td {
  background: #d6e8f5;
}
.sq-grid .sq-hit td {
  background: #ffdd00;
  color: #0b0c0c;
}

/* 100 以内完全平方数 */
.sq-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sq-chip {
  display: inline-block;
  background: #ffffff;
  border: 1px solid #b1b4b6;
  padding: 3px 10px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

/* 速算方法 */
.sq-rule {
  border: 1px solid #b1b4b6;
  border-left: 4px solid #1d70b8;
  background: #f3f2f1;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.sq-rule-name {
  font-weight: 700;
  color: #1d70b8;
  font-size: 15px;
  margin-bottom: 4px;
}
.sq-rule-text {
  color: #0b0c0c;
  font-size: 13px;
  margin-bottom: 6px;
}
.sq-egs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sq-eg {
  display: inline-block;
  background: #ffffff;
  border: 1px solid #b1b4b6;
  padding: 2px 10px;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

@media (max-width: 480px) {
  .sq-title { font-size: 19px; }
  .sq-tools { gap: 12px; }
  .sq-tool { width: 100%; }
  .sq-result--wide { min-width: 150px; }
}
</style>
