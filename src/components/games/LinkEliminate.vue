<template>
  <div class="le-game">
    <div class="le-hud">
      <div class="le-stats">
        <span>得分 <strong>{{ score }}</strong></span>
        <span>消除 <strong>{{ cleared }}</strong></span>
        <span>连击 <strong>{{ combo > 1 ? 'x' + combo : '—' }}</strong></span>
      </div>
      <button class="le-btn" @click="newGame">新一局</button>
    </div>

    <div class="le-stage">
      <svg
        class="le-svg"
        :viewBox="'0 0 ' + (COLS * CELL) + ' ' + (ROWS * CELL)"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <rect
          v-for="p in dots"
          :key="'d' + p.id"
          :x="p.x * CELL + 3"
          :y="p.y * CELL + 3"
          :width="CELL - 6"
          :height="CELL - 6"
          :fill="p.color"
          :opacity="p.fade ? 0.25 : 1"
          rx="2"
        />
        <g v-if="path.length > 1">
          <polyline
            :points="pathPts"
            fill="none"
            :stroke="activeColor"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.75"
          />
          <circle
            v-for="(p, i) in path"
            :key="'c' + i"
            :cx="p.x * CELL + CELL / 2"
            :cy="p.y * CELL + CELL / 2"
            r="3"
            fill="#0b0c0c"
          />
        </g>
      </svg>
    </div>

    <p class="le-status">
      <template v-if="msg">{{ msg }}</template>
      <template v-else>按住并拖动，把 <strong>5 个及以上同色</strong>的点连成一条线（拐弯不超过 2 次）即可消除。</template>
    </p>
  </div>
</template>

<script setup>
/**
 * 连线消除 —— ≥5 同色、≤3 段直线（拐弯≤2）连成一线即消除。
 * 纯前端、纯点击/触摸，PC 手机通用。
 */
import { ref, computed, onMounted } from 'vue'

const COLS = 8
const ROWS = 8
const CELL = 34
const NEED = 5
const COLORS = ['#1d70b8', '#00703c', '#b58800', '#993c1d']

const score = ref(0)
const cleared = ref(0)
const combo = ref(0)
const msg = ref('')
const grid = ref([])   // { id, x, y, color, fade }
const path = ref([])
const dragging = ref(false)

let nextId = 1

const activeColor = computed(() => (path.value.length ? path.value[0].color : '#1d70b8'))
const pathPts = computed(() => path.value.map((p) => (p.x * CELL + CELL / 2) + ',' + (p.y * CELL + CELL / 2)).join(' '))
const dots = computed(() => grid.value.flat().filter((d) => d && !d.gone))

function colorAt(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null
  const d = grid.value[y][x]
  return d && !d.gone ? d : null
}

/** 棋盘上是否存在 >=NEED 的同色直线（横或竖）。用于保证开局可玩。 */
function hasLine() {
  for (let y = 0; y < ROWS; y++) {
    let run = 1
    for (let x = 1; x < COLS; x++) {
      const a = grid.value[y][x - 1]
      const b = grid.value[y][x]
      if (a && b && a.color === b.color) { run++; if (run >= NEED) return true }
      else run = 1
    }
  }
  for (let x = 0; x < COLS; x++) {
    let run = 1
    for (let y = 1; y < ROWS; y++) {
      const a = grid.value[y - 1][x]
      const b = grid.value[y][x]
      if (a && b && a.color === b.color) { run++; if (run >= NEED) return true }
      else run = 1
    }
  }
  return false
}

function newGame() {
  // 重roll直到存在可消直线，否则开局无处可点（实测 5 色时经常出现）
  for (let attempt = 0; attempt < 60; attempt++) {
    grid.value = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => ({ id: nextId++, x, y, color: COLORS[Math.floor(Math.random() * COLORS.length)], gone: false }))
    )
    if (hasLine()) break
  }
  score.value = 0
  cleared.value = 0
  combo.value = 0
  msg.value = ''
  path.value = []
}

function svgPos(e) {
  const svg = e.currentTarget
  const r = svg.getBoundingClientRect()
  return {
    x: Math.floor(((e.clientX - r.left) / r.width) * COLS),
    y: Math.floor(((e.clientY - r.top) / r.height) * ROWS),
  }
}

function onDown(e) {
  e.preventDefault()
  dragging.value = true
  const { x, y } = svgPos(e)
  const d = colorAt(x, y)
  path.value = d ? [d] : []
}

function onMove(e) {
  if (!dragging.value || !path.value.length) return
  const { x, y } = svgPos(e)
  const d = colorAt(x, y)
  if (!d) return
  if (d.color !== path.value[0].color) { endPath(); return }

  const last = path.value[path.value.length - 1]
  if (d === last) return
  if (path.value.includes(d)) {
    // 走回已选点 ⇒ 截断路径（标准连连看行为）
    const i = path.value.indexOf(d)
    if (i >= 0) { path.value = path.value.slice(0, i + 1); return }
  }
  if (canReach(last, d)) path.value.push(d)
  else { endPath(); return }   // 顶到死路，自动结算已选部分
}

function canReach(from, to) {
  if (path.value.length < NEED) {
    // 未达 5 个时允许自由走，只需相邻
    return isAdjacent(from, to)
  }
  // 已达 5 个后必须走直线：拐弯不超过 2 次
  const dirs = []
  for (let i = 1; i < path.value.length; i++) dirs.push(dirOf(path.value[i - 1], path.value[i]))
  if (isAdjacent(from, to)) {
    const nd = dirOf(from, to)
    const lastD = dirs[dirs.length - 1]
    if (lastD === nd) return true
    return countTurns(path.value) + 1 <= 2
  }
  // 非相邻但共线且中间无阻挡 → 允许跨格（拖快时补齐）
  return canSlide(from, to, dirs)
}

function canSlide(from, to, dirs) {
  const dx = Math.sign(to.x - from.x)
  const dy = Math.sign(to.y - from.y)
  if (dx !== 0 && dy !== 0) return false
  const curDir = dirs.length ? dirs[dirs.length - 1] : null
  const newDir = dx !== 0 ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
  if (curDir && curDir !== newDir) {
    // 拐弯：只有当前线段长度≥1 才算真拐弯
    const turns = countTurns(path.value)
    if (turns + 1 > 2) return false
  }
  // 中间不能有阻挡
  let cx = from.x + dx
  let cy = from.y + dy
  while (cx !== to.x || cy !== to.y) {
    const blocker = grid.value[cy] && grid.value[cy][cx] && grid.value[cy][cx].gone === false
    if (blocker) return false
    cx += dx
    cy += dy
  }
  return true
}

function dirOf(a, b) {
  if (b.x > a.x) return 'R'
  if (b.x < a.x) return 'L'
  if (b.y > a.y) return 'D'
  return 'U'
}
function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}
function countTurns(p) {
  let t = 0
  for (let i = 2; i < p.length; i++) {
    if (dirOf(p[i - 1], p[i]) !== dirOf(p[i - 2], p[i - 1])) t++
  }
  return t
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  endPath()
}

function endPath() {
  const p = path.value
  if (p.length >= NEED) {
    const gained = p.length * 10 * (combo.value + 1)
    score.value += gained
    cleared.value += p.length
    combo.value++
    p.forEach((d) => { d.gone = true; d.fade = true })
    msg.value = '消除 ' + p.length + ' 个，+' + gained + ' 分' + (combo.value > 1 ? '（连击 x' + combo.value + '）' : '')
    setTimeout(() => {
      collapse()
      if (!hasAnyColor(NEED)) {
        refill()
        msg.value = '棋盘已重排，继续！'
      }
    }, 220)
  }
  path.value = []
}

function collapse() {
  for (let x = 0; x < COLS; x++) {
    const col = []
    for (let y = ROWS - 1; y >= 0; y--) if (grid.value[y][x] && !grid.value[y][x].gone) col.push(grid.value[y][x])
    let writeY = ROWS - 1
    for (const d of col) { grid.value[writeY][x] = d; d.y = writeY; writeY-- }
    for (; writeY >= 0; writeY--) grid.value[writeY][x] = null
  }
}

function refill() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!grid.value[y][x]) {
        grid.value[y][x] = { id: nextId++, x, y, color: COLORS[Math.floor(Math.random() * COLORS.length)], gone: false }
      }
    }
  }
  combo.value = 0
}

/** 判断棋盘上是否还存在 >=NEED 个同色（决定要不要重排） */
function hasAnyColor(n) {
  const count = {}
  let best = 0
  grid.value.forEach((row) => row.forEach((d) => {
    if (!d || d.gone) return
    count[d.color] = (count[d.color] || 0) + 1
    if (count[d.color] > best) best = count[d.color]
  }))
  return best >= n
}

onMounted(newGame)
</script>

<style scoped>
.le-game { user-select: none; }
.le-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
}
.le-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-primary); }
.le-stats strong { font-weight: 700; }
.le-btn {
  background: #1d70b8; color: #fff; border: none;
  padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.le-btn:hover { background: #003078; }
.le-stage { display: flex; justify-content: center; }
.le-svg {
  width: 100%; max-width: 340px; height: auto;
  background: #f3f2f1; border: 1px solid #b1b4b6;
  touch-action: none; cursor: pointer; display: block;
}
.le-status { margin: 10px 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.le-status strong { color: #1d70b8; }
</style>
