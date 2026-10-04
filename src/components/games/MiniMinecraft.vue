<template>
  <div class="mc-game" ref="rootRef" tabindex="0">
    <div class="mc-hud">
      <div class="mc-stats">
        <span>坐标 <strong>{{ posText }}</strong></span>
        <span>方块 <strong>{{ inventoryCount }}</strong>/64</span>
        <span>已挖 <strong>{{ dugCount }}</strong></span>
        <span class="mc-clock">{{ timeText }}</span>
      </div>
      <button class="mc-btn" @click="regen">重新生成世界</button>
    </div>

    <div class="mc-stage">
      <canvas ref="canvasRef" class="mc-canvas"></canvas>
      <div class="mc-hotbar">
        <button
          v-for="(t, i) in HOTBAR"
          :key="t.id"
          class="mc-slot"
          :class="{ active: selected === i }"
          @click="selected = i"
        >
          <span class="mc-swatch" :style="{ background: t.color }"></span>
          <span class="mc-slot-name">{{ t.name }}</span>
          <span class="mc-slot-num">{{ i + 1 }}</span>
        </button>
      </div>
    </div>

    <div class="mc-actions">
      <button class="mc-act" @click="digForward">挖掘前方</button>
      <button class="mc-act" @click="placeForward">放置方块</button>
    </div>

    <div class="mc-pad">
      <button class="mc-key mc-key--l" @pointerdown="setDir('left', true)" @pointerup="setDir('left', false)" @pointerleave="setDir('left', false)">左</button>
      <button class="mc-key mc-key--r" @pointerdown="setDir('right', true)" @pointerup="setDir('right', false)" @pointerleave="setDir('right', false)">右</button>
      <button class="mc-key mc-key--j" @pointerdown="setJump(true)" @pointerup="setJump(false)" @pointerleave="setJump(false)">跳</button>
    </div>

    <p class="mc-hint">
      PC：方向键/WASD 移动，空格跳；<b>鼠标左键挖方块、右键放方块</b>（指向准星对着的格子）。手机用下方按键 + 挖掘/放置。
    </p>
  </div>
</template>

<script setup>
/**
 * 迷你方块世界 —— 2D 侧视沙盒建造。
 * 物理与碰撞复用 engine/platformer.js（与「超级平台冒险」共用同一套）。
 */
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'
import {
  TileMap, Actor, Camera, createLoop, setupCanvas,
  stepPhysics, createInput, bindVirtualButton,
} from './engine/platformer.js'

const HOTBAR = [
  { id: 'grass', name: '草', color: '#4a8b3d' },
  { id: 'dirt', name: '土', color: '#8a5a2b' },
  { id: 'stone', name: '石', color: '#8d8d8d' },
  { id: 'wood', name: '木', color: '#a9793f' },
  { id: 'brick', name: '砖', color: '#b04a3a' },
  { id: 'glass', name: '玻璃', color: '#9cc9d8' },
]
const COLORS = {
  grass: '#4a8b3d', dirt: '#8a5a2b', stone: '#8d8d8d',
  wood: '#a9793f', brick: '#b04a3a', glass: '#9cc9d8',
}

const TILE = 24
const VIEW_W = 480
const VIEW_H = 300
const WORLD_W = 120
const WORLD_H = 44

const rootRef = ref(null)
const canvasRef = ref(null)
const selected = ref(0)
const posText = ref('0, 0')
const inventoryCount = ref(0)
const dugCount = ref(0)
const timeText = ref('白天')

const state = reactive({ jump: false, jumpPressed: false, left: false, right: false })

let map, player, cam, loop, inputCtl, ctx, mouse = { x: 0, y: 0, inside: false }
let keyState = null
let tick = 0
let inv = {}          // 背包：type -> count
let dug = 0
const bound = []

function genWorld() {
  map = new TileMap(WORLD_W, WORLD_H, TILE)
  inv = {}
  dug = 0
  dugCount.value = 0

  // 地形：起伏的地面 +  caves 洞穴
  const surface = []
  for (let c = 0; c < WORLD_W; c++) {
    const h = 18 + Math.round(
      Math.sin(c * 0.09) * 2.2 +
      Math.sin(c * 0.031 + 1.7) * 3.1 +
      Math.sin(c * 0.21 + 0.4) * 1.1
    )
    surface.push(h)
  }
  for (let c = 0; c < WORLD_W; c++) {
    const top = surface[c]
    for (let r = top; r < WORLD_H; r++) {
      let type = 'dirt'
      if (r === top) type = 'grass'
      else if (r > top + 4 && r < WORLD_H - 3) type = 'stone'
      map.set(c, r, { t: type })
    }
  }
  // 挖几条横向洞穴，避免世界太实心
  for (let k = 0; k < 7; k++) {
    let c = Math.floor(Math.random() * (WORLD_W - 14))
    const r = 22 + Math.floor(Math.random() * 12)
    const len = 6 + Math.floor(Math.random() * 8)
    for (let i = 0; i < len && c + i < WORLD_W; i++) {
      for (let j = 0; j < 2; j++) {
        const rr = r + j
        if (map.get(c + i, rr)) map.set(c + i, rr, null)
      }
    }
  }
  // 地图外边界：整列石头封边（engine 里 out-of-bounds 也算实心，双保险）
  for (let r = 0; r < WORLD_H; r++) {
    map.set(0, r, { t: 'stone' })
    map.set(WORLD_W - 1, r, { t: 'stone' })
  }

  // 找一块空地放玩家
  let px = 4, pr = 0
  for (let c = 3; c < WORLD_W - 3; c++) {
    if (map.get(c, surface[c] - 1) === null) { px = c; pr = surface[c] - 1; break }
  }
  player = new Actor(px * TILE + 2, pr * TILE - 26, 20, 26)
  cam = new Camera(VIEW_W, VIEW_H)
  // 初始给点材料
  for (const t of ['dirt', 'stone', 'wood']) inv[t] = 8
  tick = 0
  updateHud()
}

// 手机端没有鼠标准星，改为「挖掘/放置玩家正前方」的方块。
// ⚠️ 不能只取眼睛高度那一格：绝大多数时候那里是空气，按了没反应。
// 改为在前方那一列上下扫描：取最近的实体（挖）/ 最近的空位且不与玩家身体重叠（放）。
function frontCell() {
  const c = Math.floor(player.cx / TILE) + player.facing
  return c
}
function scanDig() {
  const c = frontCell()
  const rEye = Math.floor(player.cy / TILE)
  // 从上往下扫（含脚下高度），找第一格实体
  for (let r = Math.max(0, rEye - 2); r < map.h; r++) {
    if (map.solidAt(c, r)) return { c, r }
  }
  return { c, r: rEye }
}
function scanPlace() {
  const c = frontCell()
  const rEye = Math.floor(player.cy / TILE)
  for (let r = Math.max(0, rEye - 2); r < map.h; r++) {
    if (map.solidAt(c, r)) continue
    // 不许放在玩家身体里
    const inPlayer =
      c * TILE < player.right && (c + 1) * TILE > player.left &&
      r * TILE < player.bottom && (r + 1) * TILE > player.top
    if (inPlayer) continue
    return { c, r }
  }
  return { c, r: rEye }
}

function dig(c, r) {
  const t = map.get(c, r)
  if (!t) return false
  map.set(c, r, null)
  inv[t.t] = (inv[t.t] || 0) + 1
  dug++
  dugCount.value = dug
  updateHud()
  return true
}

function place(c, r) {
  if (map.get(c, r)) return false
  // 不许埋在角色身体里
  const inPlayer =
    c * TILE < player.right && (c + 1) * TILE > player.left &&
    r * TILE < player.bottom && (r + 1) * TILE > player.top
  if (inPlayer) return false
  const type = HOTBAR[selected.value].id
  if ((inv[type] || 0) <= 0) return false
  inv[type]--
  map.set(c, r, { t: type })
  updateHud()
  return true
}

function digForward() { const t = scanDig(); dig(t.c, t.r) }
function placeForward() { const t = scanPlace(); place(t.c, t.r) }

function updateHud() {
  posText.value = Math.floor(player.cx / TILE) + ', ' + Math.floor(player.cy / TILE)
  inventoryCount.value = Object.values(inv).reduce((a, b) => a + b, 0)
}

function setDir(k, v) { state[k] = v }
function setJump(v) {
  if (v && !state.jump) state.jumpPressed = true
  state.jump = v
}

function render() {
  ctx.fillStyle = '#0b0c0c'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  // 昼夜：每 900 帧一个昼夜周期
  const phase = (tick % 900) / 900
  const night = phase > 0.55
  timeText.value = night ? '夜晚' : '白天'

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
      ctx.fillStyle = COLORS[t.t] || '#666'
      ctx.fillRect(x, y, TILE, TILE)
      // 顶面高光，弱化也能看出方块感
      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      ctx.fillRect(x, y, TILE, 2)
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(x, y + TILE - 2, TILE, 2)
    }
  }

  // 玩家
  const px = player.x - cam.x
  const py = player.y - cam.y
  ctx.fillStyle = '#1d70b8'
  ctx.fillRect(px, py + 6, player.w, player.h - 6)   // 身体
  ctx.fillStyle = '#e0a080'
  ctx.fillRect(px + 3, py, player.w - 6, 8)           // 头
  // 朝向指示
  ctx.fillStyle = '#0b0c0c'
  ctx.fillRect(player.facing > 0 ? px + player.w - 8 : px + 2, py + 3, 4, 3)

  // 准星：指向鼠标所在格
  if (mouse.inside) {
    const wc = Math.floor((mouse.x + cam.x) / TILE)
    const wr = Math.floor((mouse.y + cam.y) / TILE)
    const hx = wc * TILE - cam.x
    const hy = wr * TILE - cam.y
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2)
  }

  // 夜晚遮罩
  if (night) {
    ctx.fillStyle = 'rgba(11,12,12,0.45)'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
}

function onMove(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
  mouse.inside = true
}
function onLeave() { mouse.inside = false }
function onClick(e) {
  if (!mouse.inside) return
  const c = Math.floor((mouse.x + cam.x) / TILE)
  const r = Math.floor((mouse.y + cam.y) / TILE)
  if (e.button === 0) dig(c, r)
  else if (e.button === 2) place(c, r)
}
function onContext(e) { e.preventDefault() }
function regen() { genWorld() }

onMounted(() => {
  ctx = setupCanvas(canvasRef.value, VIEW_W, VIEW_H)
  genWorld()

  inputCtl = createInput(rootRef.value, {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'jump', w: 'jump', W: 'jump', ArrowUp: 'jump',
  })
  keyState = inputCtl.state

  const cv = canvasRef.value
  cv.addEventListener('mousemove', onMove)
  cv.addEventListener('mouseleave', onLeave)
  cv.addEventListener('mousedown', onClick)
  cv.addEventListener('contextmenu', onContext)
  bound.push(() => cv.removeEventListener('mousemove', onMove))
  bound.push(() => cv.removeEventListener('mouseleave', onLeave))
  bound.push(() => cv.removeEventListener('mousedown', onClick))
  bound.push(() => cv.removeEventListener('contextmenu', onContext))

  const pad = rootRef.value.querySelectorAll('.mc-key')
  pad.forEach((el) => {
    const isL = el.classList.contains('mc-key--l')
    const isR = el.classList.contains('mc-key--r')
    const act = isL ? 'left' : isR ? 'right' : 'jump'
    bindVirtualButton(el, state, act)
  })

  loop = createLoop(
    (dt) => {
      // 合并键盘与触屏输入
      const inp = {
        left: keyState.left || state.left,
        right: keyState.right || state.right,
        jump: keyState.jump || state.jump,
        jumpPressed: keyState.jumpPressed || state.jumpPressed,
      }
      stepPhysics(player, map, inp, dt)
      // 消费一次性脉冲
      keyState.jumpPressed = false
      state.jumpPressed = false
      // 掉出世界底部 → 回到地面
      if (player.y > map.h * TILE + 60) {
        genWorld()
      }
      cam.follow(player, map, { deadzoneY: 60, followY: false })
      tick++
      if (tick % 5 === 0) updateHud()
    },
    render
  )
})

onBeforeUnmount(() => {
  if (loop) loop.stop()
  if (inputCtl) inputCtl.dispose()
  bound.forEach((f) => f())
})
</script>

<style scoped>
.mc-game { user-select: none; outline: none; }
.mc-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
}
.mc-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-primary); flex-wrap: wrap; }
.mc-stats strong { font-weight: 700; }
.mc-clock { color: var(--text-secondary); }
.mc-btn {
  background: #1d70b8; color: #fff; border: none;
  padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.mc-btn:hover { background: #003078; }
.mc-stage {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.mc-canvas {
  display: block;
  background: #0b0c0c;
  border: 1px solid #b1b4b6;
  max-width: 100%;
  image-rendering: pixelated;
  cursor: crosshair;
}
.mc-hotbar { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
.mc-slot {
  position: relative;
  width: 62px; height: 52px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background: #fff; border: 1px solid #b1b4b6; cursor: pointer; padding: 0;
}
.mc-slot.active { border-color: #1d70b8; background: #e6f1fb; }
.mc-swatch { width: 22px; height: 22px; display: block; border: 1px solid rgba(0,0,0,0.25); }
.mc-slot-name { font-size: 11px; color: var(--text-primary); }
.mc-slot-num {
  position: absolute; top: 1px; left: 3px;
  font-size: 10px; color: var(--text-tertiary);
}
.mc-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: center; }
.mc-act {
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.mc-act:hover { background: #e6f1fb; }
.mc-pad { display: none; gap: 8px; margin-top: 10px; justify-content: center; }
.mc-key {
  width: 62px; height: 56px; font-size: 15px; font-weight: 700;
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8; cursor: pointer;
}
.mc-key:active { background: #1d70b8; color: #fff; }
.mc-hint { margin: 10px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.mc-hint b { color: #1d70b8; }
@media (pointer: coarse) { .mc-pad { display: flex; } }
</style>
