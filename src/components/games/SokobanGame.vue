<template>
  <div class="sk-game">
    <div class="sk-hud">
      <div class="sk-stats">
        <span>关卡 <strong>{{ level + 1 }}/{{ LEVELS.length }}</strong></span>
        <span>步数 <strong>{{ moves }}</strong></span>
        <span>推箱 <strong>{{ pushed }}</strong></span>
        <span>最佳 <strong>{{ bestMoves }}</strong></span>
      </div>
      <div class="sk-btns">
        <button class="sk-btn" @click="undo" :disabled="history.length === 0">撤销</button>
        <button class="sk-btn" @click="restart">重开</button>
      </div>
    </div>

    <div class="sk-stage">
      <div class="sk-grid" :style="gridStyle">
        <template v-for="(cell, i) in cells" :key="i">
          <div class="sk-cell" :class="'sk-cell--' + cell.kind">
            <span
              v-if="cell.kind === 'box' || cell.kind === 'boxDone'"
              class="sk-box"
              :class="{ 'sk-box--done': cell.kind === 'boxDone' }"
            ></span>
            <span v-else-if="cell.kind === 'player'" class="sk-player"></span>
            <span v-else-if="cell.kind === 'target'" class="sk-target"></span>
          </div>
        </template>
      </div>
    </div>

    <p v-if="won" class="sk-status sk-status--win">全部通关！本关 {{ moves }} 步。</p>
    <p v-else-if="levelDone" class="sk-status sk-status--win">本关完成！{{ moves }} 步（最佳 {{ bestMoves }}）。</p>
    <p v-else class="sk-status">用方向键把箱子推到圆点上。箱子只能推、不能拉。</p>

    <div class="sk-pad">
      <button class="sk-key" @click="tryMove('up', 0, -1)">上</button>
      <button class="sk-key" @click="tryMove('left', -1, 0)">左</button>
      <button class="sk-key" @click="tryMove('down', 0, 1)">下</button>
      <button class="sk-key" @click="tryMove('right', 1, 0)">右</button>
    </div>
  </div>
</template>

<script setup>
/**
 * 推箱子 —— 纯规划解谜，无任何反应成分。
 * PC 用方向键，手机用下方按钮；支持撤销（解谜类必须能反悔）。
 */
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'

// '#'墙 ' '空 '$'箱 '@'人 '*'箱在目标点 'o'目标 '.'已达成目标
// 用扁平字符串 + 逗号分隔多关
const LEVELS = [
  {
    name: '第 1 关 · 教学',
    grid: [
      '#######',
      '#     #',
      '# #$o #',
      '#  @  #',
      '#     #',
      '#######',
    ],
  },
  {
    name: '第 2 关 · 双箱',
    grid: [
      '########',
      '#  .   #',
      '# $$#  #',
      '#  @   #',
      '#  .   #',
      '########',
    ],
  },
  {
    name: '第 3 关 · 绕行',
    grid: [
      '#########',
      '#   #   #',
      '# $ # $ #',
      '# .@.   #',
      '#   #   #',
      '#########',
    ],
  },
  {
    name: '第 4 关 · 错位',
    grid: [
      '##########',
      '#  ...   #',
      '#        #',
      '#  $ $ $ #',
      '#   @    #',
      '##########',
    ],
  },
  {
    name: '第 5 关 · 三角',
    grid: [
      '#########',
      '#.   .  #',
      '# $$ $  #',
      '#   .   #',
      '#  @    #',
      '#########',
    ],
  },
]

const level = ref(0)
const moves = ref(0)
const pushed = ref(0)
const won = ref(false)
const levelDone = ref(false)
const bestMoves = ref(0)
const history = ref([])

// ⚠️ 这些必须是 reactive：用普通 let 时，computed(cells) 读它们没有响应式依赖，
// load() 改完也不会重算 ⇒ 棋盘永远停在初始空态（2026-10-04 实测：0 箱 0 目标 0 人）。
const walls = ref([])
const targets = ref(new Set())
const boxes = ref([])
const player = reactive({ r: 0, c: 0 })

const COLS = computed(() => 10)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${widthOf.value}, 1fr)`,
}))
const widthOf = computed(() => {
  const g = LEVELS[level.value].grid
  return Math.max(...g.map((r) => r.length))
})

const cells = computed(() => {
  const g = LEVELS[level.value].grid
  const out = []
  const w = widthOf.value
  const tset = targets.value
  const blist = boxes.value
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < w; c++) {
      const ch = g[r][c] || ' '
      const isWall = ch === '#'
      const isTarget = tset.has(r * 100 + c)
      const isBox = blist.some((b) => b.r === r && b.c === c)
      const isPlayer = player.r === r && player.c === c
      let kind = 'floor'
      if (isWall) kind = 'wall'
      else if (isBox) kind = isTarget ? 'boxDone' : 'box'
      else if (isPlayer) kind = 'player'
      else if (isTarget) kind = 'target'
      out.push({ kind })
    }
  }
  return out
})

function isWall(r, c) {
  return walls.value.some((w) => w.r === r && w.c === c)
}

function load(i) {
  const g = LEVELS[i].grid
  const w = []
  const t = new Set()
  const b = []
  let pl = { r: 0, c: 0 }
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < (g[r] || ' ').length; c++) {
      const ch = g[r][c]
      if (ch === '#') w.push({ r, c })
      if (ch === 'o' || ch === '.' || ch === '*') t.add(r * 100 + c)
      if (ch === '$' || ch === '*') b.push({ r, c })
      if (ch === '@') pl = { r, c }
    }
  }
  walls.value = w
  targets.value = t
  boxes.value = b
  player.r = pl.r
  player.c = pl.c
  moves.value = 0
  pushed.value = 0
  history.value = []
  levelDone.value = false
  won.value = false
  bestMoves.value = Number(localStorage.getItem('sk_best_' + i) || 0)
}

function isBox(r, c) { return boxes.value.some((b) => b.r === r && b.c === c) }
function isTarget(r, c) { return targets.value.has(r * 100 + c) }

function tryMove(dir, dr, dc) {
  if (won.value) return
  const nr = player.r + dr
  const nc = player.c + dc
  if (isWall(nr, nc)) return

  history.value.push({ pr: player.r, pc: player.c, boxes: boxes.value.map((b) => ({ ...b })), moves: moves.value, pushed: pushed.value })

  if (isBox(nr, nc)) {
    const br = nr + dr
    const bc = nc + dc
    // 箱子后面必须是空地且不能是另一个箱子
    if (isWall(br, bc) || isBox(br, bc)) {
      history.value.pop()
      return
    }
    const b = boxes.value.find((x) => x.r === nr && x.c === nc)
    b.r = br
    b.c = bc
    pushed.value++
  }

  player.r = nr
  player.c = nc
  moves.value++

  if (checkWin()) {
    levelDone.value = true
    const bKey = 'sk_best_' + level.value
    if (!bestMoves.value || moves.value < bestMoves.value) {
      bestMoves.value = moves.value
      localStorage.setItem(bKey, String(moves.value))
    }
    setTimeout(() => {
      if (level.value + 1 < LEVELS.length) {
        level.value++
        load(level.value)
      } else {
        won.value = true
      }
    }, 900)
  }
  if (history.value.length > 300) history.value.shift()
}

function checkWin() {
  return boxes.value.length > 0 && boxes.value.every((b) => isTarget(b.r, b.c))
}

function undo() {
  if (!history.value.length || won.value) return
  const h = history.value.pop()
  player.r = h.pr
  player.c = h.pc
  boxes.value = h.boxes
  moves.value = h.moves
  pushed.value = h.pushed
  levelDone.value = false
}

function restart() { load(level.value) }

function onKey(e) {
  const map = { ArrowUp: ['up', 0, -1], ArrowDown: ['down', 0, 1], ArrowLeft: ['left', -1, 0], ArrowRight: ['right', 1, 0], w: ['up', 0, -1], s: ['down', 0, 1], a: ['left', -1, 0], d: ['right', 1, 0] }
  const m = map[e.key]
  if (m) { e.preventDefault(); tryMove(m[0], m[1], m[2]) }
}

onMounted(() => { load(0); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.sk-game { user-select: none; }
.sk-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
}
.sk-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-primary); flex-wrap: wrap; }
.sk-stats strong { font-weight: 700; }
.sk-btns { display: flex; gap: 6px; }
.sk-btn {
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.sk-btn:hover:not(:disabled) { background: #e6f1fb; }
.sk-btn:disabled { border-color: #b1b4b6; color: #b1b4b6; cursor: not-allowed; }
.sk-stage { display: flex; justify-content: center; }
.sk-grid {
  display: grid; gap: 2px;
  background: #b1b4b6;
  padding: 2px;
  border: 1px solid #b1b4b6;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
}
.sk-cell {
  position: relative;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
}
.sk-cell--wall { background: #5f5e5a; }
.sk-box {
  width: 74%; height: 74%;
  background: #b04a3a;
  border: 2px solid #712b13;
}
.sk-box--done { background: #00703c; border-color: #0b0c0c; }
.sk-target {
  position: absolute;
  width: 62%; height: 62%;
  border: 2px solid #1d70b8;
  border-radius: 50%;
}
.sk-player {
  width: 52%; height: 52%;
  background: #1d70b8;
  border-radius: 50%;
}
.sk-status { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: var(--text-primary); }
.sk-status--win { color: #00703c; }
.sk-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; max-width: 240px; margin-left: auto; margin-right: auto; }
.sk-key {
  padding: 14px 0; font-size: 15px; font-weight: 700;
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8; cursor: pointer;
}
.sk-key:active { background: #1d70b8; color: #fff; }
.sk-pad .sk-key:nth-child(1) { grid-column: 2; }
.sk-pad .sk-key:nth-child(2) { grid-column: 1; }
</style>
