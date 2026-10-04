<template>
  <div class="pr-game" ref="rootRef" tabindex="0">
    <div class="pr-hud">
      <div class="pr-stats">
        <span>关卡 <strong>{{ level + 1 }}/{{ LEVELS.length }}</strong></span>
        <span>金币 <strong>{{ coins }}</strong></span>
        <span>得分 <strong>{{ score }}</strong></span>
        <span>生命 <strong>{{ lives }}</strong></span>
      </div>
      <button class="pr-btn" @click="restartLevel">重开本关</button>
    </div>

    <div class="pr-stage">
      <canvas ref="canvasRef" class="pr-canvas"></canvas>
    </div>

    <p v-if="won" class="pr-status pr-status--win">全部通关！得分 {{ score }}。</p>
    <p v-else-if="dead" class="pr-status pr-status--lose">撞到了！按「重开本关」继续。</p>
    <p v-else class="pr-status">{{ levelMsg }}</p>

    <div class="pr-pad">
      <button class="pr-key" @pointerdown="setDir('left', true)" @pointerup="setDir('left', false)" @pointerleave="setDir('left', false)">左</button>
      <button class="pr-key" @pointerdown="setDir('right', true)" @pointerup="setDir('right', false)" @pointerleave="setDir('right', false)">右</button>
      <button class="pr-key pr-key--j" @pointerdown="setJump(true)" @pointerup="setJump(false)" @pointerleave="setJump(false)">跳</button>
    </div>

    <p class="pr-hint">
      PC：方向键移动，空格/W/↑ 跳。<b>站在怪物头上会踩扁它</b>；顶问号砖出金币；走到关底旗子过关。手机用下方按键。
    </p>
  </div>
</template>

<script setup>
/**
 * 超级平台冒险 —— 2D 横版关卡跳跃。
 * 物理/碰撞复用 engine/platformer.js（与「迷你方块世界」共用）。
 */
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'
import {
  TileMap, Actor, Camera, createLoop, setupCanvas,
  stepPhysics, createInput, bindVirtualButton,
} from './engine/platformer.js'

const TILE = 20
const VIEW_W = 440
const VIEW_H = 260

// 关卡用字符串数组手写，每行必须等宽（矩形），否则关卡边界会出现空洞。
// '~'天空 '.'空 '#'土 'B'砖 '?'问号砖 '^'尖刺 'o'金币 'e'敌人 'F'旗子
// rows[0] 是最上面一行（渲染时反转为世界 y 向下）。
// ⚠️ 旗子正下方必须是 '#'（否则走不到终点会掉下去）；敌人下方也要有地。
const LEVELS = [
  {
    msg: '向右走，顶问号砖拿金币，最后踩平敌人。',
    rows: [
      '....................................................',
      '....................................................',
      '....................................................',
      '....................................................',
      '......B?B.......B?B...........?B....................',
      '........................oo..........................',
      '..........oooe......oo.e..........e...oo..e.........',
      '..#################^^^#######^^^###########^^^#F##..',
      '..################################################..',
      '..................#####.....#####.........#####.....',
      '....................................................',
    ],
  },
  {
    msg: '这一关要跳高台，连着跳三次。',
    rows: [
      '....................................................',
      '....................................................',
      '....................................................',
      '.................................oo.................',
      '.............?B....oo...##.?B..B?.........B?........',
      '.....oooe...........e...^^....####e#######....oe....',
      '................############..############..........',
      '..############..############..############..#####F#.',
      '..############..############..############..#######.',
      '..############..############..############..#######.',
      '..############..############..############..#######.',
    ],
  },
  {
    msg: '最后一关：高低塔 + 空中金币串。',
    rows: [
      '....................................................',
      '....................................................',
      '....................................................',
      '........?...oooo.?....ooo..?...oo...?...oo...?......',
      '.................#..................#...............',
      '........#..................#.................#......',
      '..........e..........e........e........e.......e....',
      '..############^^^######^^^######^^^#####^^^#######F#',
      '..##################################################',
      '.............#####....#####....#####...#####........',
      '....................................................',
    ],
  },
]

const TYPES = {
  '#': { t: 'ground', solid: true, color: '#8a5a2b' },
  'B': { t: 'brick', solid: true, color: '#b04a3a' },
  '?': { t: 'question', solid: true, color: '#d9a400' },
  'P': { t: 'pipe', solid: true, color: '#2f7a4f' },
  '^': { t: 'spike', solid: false, color: '#a32d2d' },
}

const rootRef = ref(null)
const canvasRef = ref(null)
const level = ref(0)
const coins = ref(0)
const score = ref(0)
const lives = ref(3)
const dead = ref(false)
const won = ref(false)
const levelMsg = ref('')
const state = reactive({ left: false, right: false, jump: false, jumpPressed: false })

let map, player, cam, loop, inputCtl, ctx, keyState
let enemies = [], coinList = [], flag = null
let bumpTile = null   // 被顶到的问号砖 { c, r, t }
let tick = 0

const levelMsgText = () => LEVELS[level.value].msg

function buildLevel(idx) {
  const L = LEVELS[idx]
  const rows = L.rows
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  map = new TileMap(w, h, TILE)
  enemies = []
  coinList = []
  flag = null
  bumpTile = null

  for (let r = 0; r < h; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      const y = h - 1 - r   // rows[0] 是顶部 ⇒ 反转成 y 向下
      if (ch === '.') continue
      if (ch === 'o') { coinList.push({ c, r: y, got: false }); continue }
      if (ch === 'e') { enemies.push({ c, r: y, alive: true, vx: -0.6 }); continue }
      if (ch === 'F') { flag = { c, r: y }; continue }
      if (TYPES[ch]) map.set(c, y, { ...TYPES[ch], ch })
    }
  }

  player = new Actor(2 * TILE + 2, (h - 4) * TILE, 16, 18)
  player.x = 2 * TILE
  player.y = (h - 4) * TILE
  // 出生点脚下如果是实地，抬上去
  while (player.onGround === false && player.y < (h - 1) * TILE) {
    player.y += 1
    if (map.solidAt(Math.floor(player.cx / TILE), Math.floor((player.bottom + 2) / TILE))) break
  }
  player.vy = 0
  cam = new Camera(VIEW_W, VIEW_H)
  dead.value = false
  levelMsg.value = L.msg
  tick = 0
}

function restartLevel() {
  dead.value = false
  buildLevel(level.value)
}

function onStomp(e) {
  e.alive = false
  score.value += 100
  player.vy = -320
}

function kill(reason) {
  if (dead.value || won.value) return
  dead.value = true
  lives.value = Math.max(0, lives.value - 1)
  levelMsg.value = reason
}

function tileAtPlayerHead() {
  // 顶砖检测：玩家上移（vy<0）时检查头顶所在格
  if (player.vy >= 0) return null
  const c = Math.floor(player.cx / TILE)
  const r = Math.floor((player.top - 2) / TILE)
  const t = map.get(c, r)
  if (t && (t.ch === '?' || t.ch === 'B')) return { c, r, t }
  return null
}

function update(dt) {
  if (dead.value || won.value) return
  const inp = {
    left: keyState.left || state.left,
    right: keyState.right || state.right,
    jump: keyState.jump || state.jump,
    jumpPressed: keyState.jumpPressed || state.jumpPressed,
  }
  stepPhysics(player, map, inp, dt)
  keyState.jumpPressed = false
  state.jumpPressed = false

  const pc = Math.floor(player.cx / TILE)
  const pr = Math.floor(player.cy / TILE)
  const pTop = Math.floor(player.top / TILE)

  // 顶问号砖
  const hit = tileAtPlayerHead()
  if (hit && (!bumpTile || bumpTile.c !== hit.c || bumpTile.r !== hit.r)) {
    bumpTile = { c: hit.c, r: hit.r, t: 0 }
    if (hit.t.ch === '?') {
      map.set(hit.c, hit.r, { t: 'used', solid: true, color: '#8d8d8d' })
      coins.value++
      score.value += 50
    } else {
      score.value += 10
    }
  }
  if (bumpTile) { bumpTile.t++; if (bumpTile.t > 10) bumpTile = null }

  // 敌人
  for (const e of enemies) {
    if (!e.alive) continue
    const ex = e.c * TILE
    const ey = e.r * TILE
    // 踩踏判定：玩家下移且脚在敌人头顶附近
    const overlapX = player.right > ex + 1 && player.left < ex + TILE - 1
    const overlapY = player.bottom > ey && player.top < ey + TILE
    if (overlapX && overlapY) {
      const fromAbove = player.vy > 0 && player.bottom - player.vy * dt <= ey + 6
      if (fromAbove) onStomp(e)
      else { kill('撞到怪物了！'); return }
    }
    // 巡逻 + 转向
    e.x += e.vx * TILE * dt * 4
    const ec = Math.floor((e.x + (e.vx > 0 ? TILE - 2 : 2)) / TILE)
    if (map.solidAt(ec, e.r) || map.solidAt(ec, e.r + 1)) e.vx = -e.vx
  }

  // 金币
  for (const c of coinList) {
    if (c.got) continue
    const ex = c.c * TILE
    const ey = c.r * TILE
    if (player.right > ex && player.left < ex + TILE && player.bottom > ey && player.top < ey + TILE) {
      c.got = true
      coins.value++
      score.value += 25
    }
  }

  // 尖刺
  for (let r = 0; r < map.h; r++) {
    for (let cc = 0; cc < map.w; cc++) {
      const t = map.get(cc, r)
      if (!t || t.ch !== '^') continue
      const sx = cc * TILE, sy = r * TILE
      if (player.right > sx + 2 && player.left < sx + TILE - 2 && player.bottom > sy + 4 && player.top < sy + TILE) {
        kill('踩到尖刺了！'); return
      }
    }
  }

  // 旗子过关
  if (flag) {
    const fx = flag.c * TILE
    if (player.right > fx && player.left < fx + TILE) {
      score.value += 500 + lives.value * 100
      if (level.value + 1 < LEVELS.length) {
        level.value++
        buildLevel(level.value)
      } else {
        won.value = true
        levelMsg.value = '恭喜通关！'
      }
    }
  }

  // 掉出关卡底部
  if (player.y > map.h * TILE + 40) { kill('掉下去了！'); return }

  cam.follow(player, map, { deadzoneY: 70, followY: false })
  tick++
}

function render() {
  ctx.fillStyle = '#4a8b3d'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)          // 天空/草地色
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(0, 0, VIEW_W, 46)              // 远景

  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1)
  const c1 = Math.min(map.w - 1, Math.ceil((cam.x + VIEW_W) / TILE) + 1)
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1)
  const r1 = Math.min(map.h - 1, Math.ceil((cam.y + VIEW_H) / TILE) + 1)

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = map.get(c, r)
      if (!t) continue
      const x = c * TILE - cam.x
      const y = r * TILE - cam.y
      ctx.fillStyle = t.color
      ctx.fillRect(x, y, TILE, TILE)
      if (t.ch === '?' && (!bumpTile || bumpTile.c !== c || bumpTile.r !== r)) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4)
      }
      if (t.ch === '^') {  // 尖刺画三角
        ctx.fillStyle = '#7f1d1d'
        ctx.beginPath()
        ctx.moveTo(x, y + TILE)
        ctx.lineTo(x + TILE / 2, y)
        ctx.lineTo(x + TILE, y + TILE)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  // 金币
  for (const c of coinList) {
    if (c.got) continue
    const x = c.c * TILE - cam.x
    const y = c.r * TILE - cam.y
    ctx.fillStyle = '#d9a400'
    ctx.beginPath()
    ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2)
    ctx.fill()
  }

  // 敌人
  for (const e of enemies) {
    if (!e.alive) continue
    const x = e.x - cam.x
    const y = e.r * TILE - cam.y
    ctx.fillStyle = '#993c1d'
    ctx.fillRect(x + 1, y + 4, TILE - 2, TILE - 6)
    ctx.fillStyle = '#fff'
    ctx.fillRect(x + 4, y + 8, 3, 3)
    ctx.fillRect(x + TILE - 7, y + 8, 3, 3)
  }

  // 旗子
  if (flag) {
    const x = flag.c * TILE - cam.x
    const y = flag.r * TILE - cam.y
    ctx.fillStyle = '#5f5e5a'
    ctx.fillRect(x + TILE / 2 - 1, y - 6, 2, TILE + 6)
    ctx.fillStyle = '#00703c'
    ctx.fillRect(x + TILE / 2, y - 4, 12, 9)
  }

  // 玩家
  const px = player.x - cam.x
  const py = player.y - cam.y
  ctx.fillStyle = '#d4351c'
  ctx.fillRect(px, py + 5, player.w, player.h - 5)
  ctx.fillStyle = '#e0a080'
  ctx.fillRect(px + 2, py, player.w - 4, 7)
  ctx.fillStyle = '#993c1d'
  ctx.fillRect(player.facing > 0 ? px + player.w - 6 : px + 2, py + 2, 4, 3)
}

function setDir(k, v) { state[k] = v }
function setJump(v) { if (v && !state.jump) state.jumpPressed = true; state.jump = v }

onMounted(() => {
  ctx = setupCanvas(canvasRef.value, VIEW_W, VIEW_H)
  buildLevel(0)
  inputCtl = createInput(rootRef.value, {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'jump', w: 'jump', W: 'jump', ArrowUp: 'jump', ArrowDown: 'jump',
  })
  keyState = inputCtl.state
  rootRef.value.querySelectorAll('.pr-key').forEach((el) => {
    const isL = el.classList.contains('pr-key') && !el.classList.contains('pr-key--j')
    const act = el.classList.contains('pr-key--j') ? 'jump' : (el.textContent.trim() === '左' ? 'left' : 'right')
    bindVirtualButton(el, state, act)
  })
  loop = createLoop(update, render)
})

onBeforeUnmount(() => {
  if (loop) loop.stop()
  if (inputCtl) inputCtl.dispose()
})
</script>

<style scoped>
.pr-game { user-select: none; outline: none; }
.pr-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
}
.pr-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-primary); flex-wrap: wrap; }
.pr-stats strong { font-weight: 700; }
.pr-btn {
  background: #1d70b8; color: #fff; border: none;
  padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.pr-btn:hover { background: #003078; }
.pr-stage { display: flex; justify-content: center; }
.pr-canvas {
  display: block; border: 1px solid #b1b4b6;
  max-width: 100%; image-rendering: pixelated;
}
.pr-status { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: var(--text-primary); }
.pr-status--win { color: #00703c; }
.pr-status--lose { color: #d4351c; }
.pr-pad { display: none; gap: 8px; margin-top: 10px; justify-content: center; }
.pr-key {
  width: 62px; height: 56px; font-size: 15px; font-weight: 700;
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8; cursor: pointer;
}
.pr-key:active { background: #1d70b8; color: #fff; }
.pr-hint { margin: 10px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.pr-hint b { color: #1d70b8; }
@media (pointer: coarse) { .pr-pad { display: flex; } }
</style>
