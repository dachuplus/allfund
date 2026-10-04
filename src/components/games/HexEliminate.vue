<template>
  <div class="hx-game">
    <div class="hx-hud">
      <div class="hx-stats">
        <span>得分 <strong>{{ score }}</strong></span>
        <span>消除 <strong>{{ cleared }}</strong></span>
        <span>步数 <strong>{{ moves }}</strong></span>
      </div>
      <button class="hx-btn" @click="newGame">新一局</button>
    </div>

    <div class="hx-stage">
      <svg
        class="hx-svg"
        :viewBox="'-14 -10 ' + (viewW + 28) + ' ' + (viewH + 20)"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <!-- 蜂窝 -->
        <g
          v-for="h in hexes"
          :key="h.id"
          :opacity="h.pop ? 0.3 : 1"
          class="hx-cell"
          @pointerdown.stop="tapHex(h)"
        >
          <polygon
            :points="hexPts(h)"
            :fill="h.color"
            stroke="#ffffff"
            stroke-width="2"
          />
        </g>
        <!-- 选中高亮 -->
        <polygon
          v-if="selected.length"
          :points="hexPts(selected[selected.length - 1])"
          fill="none"
          stroke="#0b0c0c"
          stroke-width="3"
        />
        <circle
          v-for="(h, i) in selected"
          :key="'s' + i"
          :cx="hexX(h.c, h.r)"
          :cy="hexY(h.r)"
          r="4"
          fill="#0b0c0c"
        />
      </svg>
    </div>

    <p class="hx-status">
      <template v-if="msg">{{ msg }}</template>
      <template v-else>点 <strong>3 个及以上相邻同色</strong>的六边形即可消除。上下左右斜向相邻也算相邻。</template>
    </p>
  </div>
</template>

<script setup>
/**
 * 六角消除 —— 蜂窝网格上点选同色连通块消除。
 * 比方形三消形态更fresh，规则同样"点一下就懂"。
 */
import { ref, computed, onMounted } from 'vue'

const COLS = 8
const ROWS = 9
const R = 19            // 六边形外接圆半径
const SQ3 = Math.sqrt(3)
// ⚠️ 颜色数必须少：6 色 × 72 格时，任意两个相邻格同色的概率极低（实测最大连通块=1），
// 会出现"开局无处可消"的死局。3 色经实测开局必有 >=3 的可消块。
const COLORS = ['#1d70b8', '#00703c', '#b58800']

const score = ref(0)
const cleared = ref(0)
const moves = ref(0)
const msg = ref('')
const hexes = ref([])
const selected = ref([])

let nextId = 1
let locked = false

// 蜂窝坐标：奇数行整体右移半格（这才是真蜂窝；此前 hexX 只算 c 不算 r，
// 画出来是矩形阵列，与 neighbors() 的奇偶行偏移不匹配 ⇒ 判定与画面不符，永远消不掉）
function hexX(c, r) { return c * SQ3 * R + (r % 2 === 1 ? SQ3 * R / 2 : 0) + R }
function hexY(r) { return r * 1.5 * R }
const viewW = (COLS + 0.5) * SQ3 * R + R
const viewH = ROWS * 1.5 * R

function hexPts(h) {
  const x = hexX(h.c, h.r)
  const y = hexY(h.r)
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push((x + R * Math.cos(a) * 0.92).toFixed(1) + ',' + (y + R * Math.sin(a) * 0.92).toFixed(1))
  }
  return pts.join(' ')
}

/** 蜂窝邻居：上下 + 左右（考虑奇偶行偏移） */
function neighbors(h) {
  const { r, c } = h
  const odd = r % 2 === 1
  const offs = odd
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
  return offs.map(([dr, dc]) => {
    const t = hexes.value.find((x) => x.r === r + dr && x.c === c + dc)
    return t || null
  }).filter(Boolean)
}

/** 是否存在 >=3 的同色连通块（保证开局可玩） */
function hasBlock() {
  return hexes.value.some((h) => floodBlock(h).length >= 3)
}

function newGame() {
  // 重roll直到有可消块，否则开局点不动（2026-10-04 实测出现过）
  for (let attempt = 0; attempt < 60; attempt++) {
    hexes.value = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        hexes.value.push({
          id: nextId++, r, c,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          pop: false,
        })
      }
    }
    if (hasBlock()) break
  }
  score.value = 0
  cleared.value = 0
  moves.value = 0
  msg.value = ''
  selected.value = []
  locked = false
}

function onDown(e) { locked = false }
function onMove() {}
function onUp() {}

function tapHex(h) {
  if (locked) return
  // 求 h 所在的同色连通块；>=3 个即可消除
  const block = floodBlock(h)
  if (block.length >= 3) {
    locked = true
    moves.value++
    const gained = block.length * 10
    score.value += gained
    cleared.value += block.length
    msg.value = '消除 ' + block.length + ' 个，+' + gained + ' 分'
    block.forEach((x) => { x.pop = true })
    setTimeout(() => {
      hexes.value = hexes.value.filter((x) => !x.pop)
      compact()
      // 补位：从底部补新块
      for (let c = 0; c < COLS; c++) {
        let need = 0
        for (let r = ROWS - 1; r >= 0; r--) {
          if (!hexes.value.find((x) => x.r === r && x.c === c)) need++
        }
        for (let r = ROWS - 1; r >= 0 && need > 0; r--) {
          if (!hexes.value.find((x) => x.r === r && x.c === c)) {
            hexes.value.push({
              id: nextId++, r, c,
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
              pop: false,
            })
            need--
          }
        }
      }
      selected.value = []
      locked = false
    }, 240)
  } else {
    msg.value = '至少要 3 个同色相邻才能消除'
    setTimeout(() => { msg.value = '' }, 900)
  }
}

function floodBlock(start) {
  const color = start.color
  const seen = new Set([start.id])
  const q = [start]
  const out = []
  while (q.length) {
    const cur = q.shift()
    out.push(cur)
    for (const n of neighbors(cur)) {
      if (n.color !== color) continue
      if (seen.has(n.id)) continue
      seen.add(n.id)
      q.push(n)
    }
  }
  return out
}

/** 让每列的块整体下落贴底（保持蜂窝行结构） */
function compact() {
  for (let c = 0; c < COLS; c++) {
    const col = hexes.value.filter((x) => x.c === c).sort((a, b) => a.r - b.r)
    const offset = ROWS - col.length
    col.forEach((x, i) => { x.r = i + offset })
  }
}

onMounted(newGame)
</script>

<style scoped>
.hx-game { user-select: none; }
.hx-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
}
.hx-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-primary); }
.hx-stats strong { font-weight: 700; }
.hx-btn {
  background: #1d70b8; color: #fff; border: none;
  padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.hx-btn:hover { background: #003078; }
.hx-stage { display: flex; justify-content: center; }
.hx-svg {
  width: 100%; max-width: 360px; height: auto;
  background: #f3f2f1; border: 1px solid #b1b4b6;
  touch-action: manipulation; display: block;
}
.hx-cell { cursor: pointer; }
.hx-cell:hover polygon { stroke: #0b0c0c; stroke-width: 2.5; }
.hx-status { margin: 10px 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.hx-status strong { color: #1d70b8; }
</style>
