<template>
  <div class="mt">
    <!-- ========== 一、乘法巧算技巧 ========== -->
    <section class="mt-sec">
      <h3 class="mt-h">一、乘法巧算技巧（口算提速）</h3>
      <p class="mt-lead">
        下面这些技巧只在特定数字特征下成立，遇到对应特征时用它们能跳过列竖式。
        每个技巧都配了当场算出的例子，对照看一遍就会。
      </p>

      <div class="mt-trick" v-for="(t, i) in TRICKS" :key="i">
        <div class="mt-trick-name">{{ i + 1 }}. {{ t.name }}</div>
        <div class="mt-trick-rule">{{ t.rule }}</div>
        <div class="mt-trick-eg">
          <span class="mt-eg" v-for="(e, j) in t.demo" :key="j">{{ e }}</span>
        </div>
      </div>
    </section>

    <!-- ========== 二、1×1 到 99×99 乘法口诀表 ========== -->
    <section class="mt-sec">
      <h3 class="mt-h">二、乘法口诀表（1×1 ~ 99×99）</h3>
      <p class="mt-lead">
        下表列出从 1×1 到 99×99 的全部乘积。第一列是被乘数、第一行是乘数；
        鼠标移到任意格子上会高亮它所在的整行整列，方便对照。
      </p>

      <!-- 工具条：定位某行 / 查乘积 -->
      <div class="mt-tools">
        <div class="mt-tool">
          <label class="mt-tool-label" for="mt-jump">定位被乘数</label>
          <input
            id="mt-jump"
            v-model.number="jumpBase"
            class="mt-input"
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            placeholder="1-99"
          />
          <button class="mt-btn" type="button" @click="doJump">定位行</button>
        </div>
        <div class="mt-tool">
          <label class="mt-tool-label">查乘积</label>
          <input
            v-model.number="qa"
            class="mt-input mt-input--sm"
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            placeholder="a"
          />
          <span class="mt-x">×</span>
          <input
            v-model.number="qb"
            class="mt-input mt-input--sm"
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            placeholder="b"
          />
          <span class="mt-eq">=</span>
          <span class="mt-result">{{ lookup }}</span>
          <button class="mt-btn" type="button" @click="doLookup">定位格</button>
        </div>
      </div>

      <!-- 表格：允许左右横向滚动，纵向随页面滚动（不设内部纵向滚动条），首行首列吸顶吸左 -->
      <div class="mt-scroll" ref="scrollEl">
        <table class="mt-grid" @mouseover="onOver" @mouseleave="onLeave">
          <thead>
            <tr>
              <th class="mt-corner">×</th>
              <th
                v-for="c in cols"
                :key="'h' + c"
                :data-c="c"
                :class="{ 'mt-hl': hoveredC === c }"
              >{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="'r' + r" :id="'mt-row-' + r">
              <th
                class="mt-rowh"
                :data-r="r"
                :class="{ 'mt-hl': hoveredR === r }"
              >{{ r }}</th>
              <td
                v-for="c in cols"
                :key="'d' + r + '-' + c"
                :data-r="r"
                :data-c="c"
                :class="{ 'mt-hl': hoveredR === r || hoveredC === c }"
              >{{ r * c }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
// 用 JS 当场算出每个例子的结果，杜绝手写数字出错（教育内容必须验算）
const p = (a, b) => `${a}×${b}=${a * b}`

const TRICKS = [
  {
    name: '两位数 × 11',
    rule: '把两位数的首尾两个数字拉开，中间插入首尾之和（满十向首位进一）。',
    demo: [p(23, 11), p(57, 11)],
  },
  {
    name: '末位是 5 的平方',
    rule: '任何以 5 结尾的数平方 = 十位以前的部分 ×（它 +1），后面接 25。',
    demo: [p(35, 35), p(85, 85)],
  },
  {
    name: '头同尾合十（十位相同，个位相加 = 10）',
    rule: 'ab × ac（b + c = 10）= 十位 a ×（a +1），后面接 b × c（不够两位补 0）。',
    demo: [p(23, 27), p(41, 49)],
  },
  {
    name: '尾同头合十（个位相同，十位相加 = 10）',
    rule: 'ab × cb（a + c = 10）=（a × c + b），后面接 b 的平方（不够两位补 0）。',
    demo: [p(26, 86), p(73, 33)],
  },
  {
    name: '接近整十 / 整百（补数法）',
    rule: '（整 − b）×（整 − c）= 整² − 整 ×（b + c）+ b × c。把 98×97 想成 (100−2)(100−3)。',
    demo: [p(98, 97), p(96, 98)],
  },
  {
    name: '十几 × 十几（两个十位都是 1）',
    rule: '1a × 1b =（10 + a + b）× 10 + a × b（a、b 为个位）。即先算（10 + a + b）作前段，乘 10 后加上 a × b 作后段。例：13×12 =（10+3+2）×10 + 3×2 = 156。',
    demo: [p(13, 12), p(14, 15)],
  },
  {
    name: '乘 5 / 25 / 125（折半加倍）',
    rule: '× 5 = × 10 ÷ 2；× 25 = × 100 ÷ 4；× 125 = × 1000 ÷ 8。遇到 5 的倍数直接减半最快。',
    demo: [p(24, 5), p(16, 25), p(32, 125)],
  },
  {
    name: '平方差公式',
    rule: 'a² − b² =（a − b）（a + b），常用于（整 ± 差）×（整 ± 差）这类对称乘法。',
    demo: [p(97, 103), p(54, 46)],
  },
]

// 1 ~ 99 的完整乘法表
const rows = Array.from({ length: 99 }, (_, i) => i + 1)
const cols = rows

// 悬停高亮：记录当前格子的行/列
const hoveredR = ref(0)
const hoveredC = ref(0)
function onOver(e) {
  const el = e.target
  const r = el.getAttribute('data-r')
  const c = el.getAttribute('data-c')
  if (r) hoveredR.value = Number(r)
  if (c) hoveredC.value = Number(c)
}
function onLeave() {
  hoveredR.value = 0
  hoveredC.value = 0
}

// 工具条：定位某行
const jumpBase = ref(null)
const scrollEl = ref(null)
function clamp(n) {
  n = Math.round(Number(n))
  if (!Number.isFinite(n)) return 0
  return Math.min(99, Math.max(1, n))
}
function doJump() {
  const n = clamp(jumpBase.value)
  if (!n) return
  hoveredR.value = n
  hoveredC.value = 0
  const row = document.getElementById('mt-row-' + n)
  if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// 工具条：查乘积并定位格子
const qa = ref(null)
const qb = ref(null)
const lookup = computed(() => {
  const a = clamp(qa.value)
  const b = clamp(qb.value)
  if (!a || !b) return '—'
  return a * b
})
function doLookup() {
  const a = clamp(qa.value)
  const b = clamp(qb.value)
  if (!a || !b) return
  hoveredR.value = a
  hoveredC.value = b
  const row = document.getElementById('mt-row-' + a)
  if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
</script>

<style scoped>
.mt {
  font-size: 14px;
  line-height: 1.6;
  color: #0b0c0c;
}
.mt-sec {
  margin-bottom: 28px;
}
.mt-h {
  font-size: 18px;
  font-weight: 700;
  color: #0b0c0c;
  margin: 0 0 10px;
  padding-left: 10px;
  border-left: 4px solid #1d70b8;
}
.mt-lead {
  margin: 0 0 14px;
  color: #505a5e;
  font-size: 13px;
}
/* 巧算技巧卡片：gov.uk 风格，无圆角无阴影 */
.mt-trick {
  border: 1px solid #b1b4b6;
  border-left: 4px solid #1d70b8;
  background: #f3f2f1;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.mt-trick-name {
  font-weight: 700;
  color: #1d70b8;
  font-size: 15px;
  margin-bottom: 4px;
}
.mt-trick-rule {
  color: #0b0c0c;
  font-size: 13px;
  margin-bottom: 6px;
}
.mt-trick-eg {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mt-eg {
  display: inline-block;
  background: #ffffff;
  border: 1px solid #b1b4b6;
  padding: 2px 10px;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
/* 工具条 */
.mt-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}
.mt-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.mt-tool-label {
  font-size: 13px;
  font-weight: 700;
  color: #0b0c0c;
}
.mt-input {
  width: 92px;
  padding: 6px 8px;
  border: 1px solid #0b0c0c;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.mt-input--sm {
  width: 56px;
}
.mt-input:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
}
.mt-btn {
  background: #1d70b8;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.mt-btn:hover {
  background: #003078;
}
.mt-x, .mt-eq {
  font-size: 15px;
  font-weight: 700;
  color: #0b0c0c;
}
.mt-result {
  display: inline-block;
  min-width: 56px;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: #f3f2f1;
  border: 1px solid #b1b4b6;
  padding: 4px 8px;
}
/* 表格容器：仅允许左右横向滚动，纵向不出现内部滚动条（整页纵向滚动替代） */
.mt-scroll {
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid #b1b4b6;
  background: #ffffff;
}
.mt-grid {
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.mt-grid th,
.mt-grid td {
  border: 1px solid #b1b4b6;
  padding: 3px 6px;
  text-align: center;
  min-width: 36px;
  white-space: nowrap;
}
/* 表头行（乘数）吸顶 */
.mt-grid thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #1d70b8;
  color: #ffffff;
  font-weight: 700;
}
/* 首列（被乘数）吸左 */
.mt-grid th.mt-rowh {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #1d70b8;
  color: #ffffff;
  font-weight: 700;
}
/* 左上角交叉格，层级最高 */
.mt-grid .mt-corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  background: #003078;
  color: #ffffff;
  font-weight: 700;
}
/* 悬停高亮整行整列 */
.mt-grid .mt-hl {
  background: #d6e8f5;
}
.mt-grid tbody td:hover {
  background: #ffdd00;
  color: #0b0c0c;
}
</style>
