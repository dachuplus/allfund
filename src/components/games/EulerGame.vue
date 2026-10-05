<template>
  <div class="eu">
    <div class="eu-hud">
      <select v-model="level" class="eu-select">
        <option :value="1">简单（6 点）</option>
        <option :value="2">中等（8 点）</option>
        <option :value="3">困难（10 点）</option>
      </select>
      <div class="eu-stat">已用边：{{ usedEdges.length }} / {{ edges.length }}</div>
      <button class="eu-btn" @click="newGame">新关卡</button>
      <button class="eu-btn" @click="undo">撤销</button>
      <button class="eu-btn" @click="showHint">提示</button>
      <button class="eu-btn" @click="resetAll">清除</button>
    </div>

    <div class="eu-msg" :class="{ ok: won, err: errMsg }">
      <template v-if="won">🎉 完成！你用 {{ usedEdges.length }} 步把所有边走了一遍</template>
      <template v-else-if="errMsg">{{ errMsg }}</template>
      <template v-else>点击两个有连线的点，即可画一条边。要求：<strong>一笔画完，不重复不遗漏</strong>。</template>
    </div>

    <div class="eu-info">
      <div><strong>判定定理：</strong>{{ theory }}</div>
      <div class="eu-nodes">点数 {{ nodes }} · 边数 {{ edges.length }} · 奇点 {{ oddCount }} 个</div>
    </div>

    <div class="eu-board" :style="boardStyle">
      <svg :width="W" :height="H" class="eu-svg">
        <line
          v-for="(e, i) in edges"
          :key="'e' + i"
          :x1="pos(e[0]).x" :y1="pos(e[0]).y"
          :x2="pos(e[1]).x" :y2="pos(e[1]).y"
          :stroke="isUsed(i) ? '#00703c' : '#b1b4b6'"
          :stroke-width="isUsed(i) ? 4 : 2.5"
        />
      </svg>

      <div
        v-for="(c, idx) in coords"
        :key="'n' + idx"
        class="eu-node"
        :class="{
          'eu-node-odd': isOdd(idx),
          'eu-node-sel': sel === idx,
          'eu-node-last': lastNode === idx,
        }"
        :style="{ left: c.x - 13 + 'px', top: c.y - 13 + 'px' }"
        @click="clickNode(idx)"
      >{{ idx + 1 }}</div>
    </div>

    <div v-if="hintNode >= 0" class="eu-hint">
      提示：从 <strong>{{ hintNode + 1 }}</strong> 起笔可一笔画成
      <span v-if="oddCount === 2">（必须从一个奇点开始）</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 一笔画：欧拉路径的判定与求解。
 * 核心算法见 eulerCore.js（奇点判定 / Hierholzer 算法 / validatePath）。
 */
import { ref, computed, onUnmounted } from 'vue'
import { genLevel, canDraw, oddNodes, eulerPath } from './eulerCore.js'

const level = ref(1)
const nodes = ref(6)
const edges = ref([])
const usedEdges = ref([])   // 已用边的索引
const sel = ref(-1)          // 当前选中的点
const lastNode = ref(-1)     // 上一个点
const won = ref(false)
const errMsg = ref('')
const hintNode = ref(-1)

const W = 320
const H = 240

let coords = ref([])

function newGame() {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0
  const r = genLevel(level.value, seed)
  nodes.value = r.nodes
  edges.value = r.edges
  usedEdges.value = []
  sel.value = -1
  lastNode.value = -1
  won.value = false
  errMsg.value = ''
  hintNode.value = -1
  layout()
}

/** 点位排布：简单分两圈，保证不重叠（coords 为 0 基，标签显示 idx+1） */
function layout() {
  const n = nodes.value
  const arr = []
  const cx = W / 2, cy = H / 2
  const r1 = 78, r2 = 45
  const outer = Math.min(6, n)
  for (let i = 0; i < n; i++) {
    if (i < outer) {
      const a = (i / outer) * Math.PI * 2 - Math.PI / 2
      arr.push({ x: cx + r1 * Math.cos(a), y: cy + r1 * Math.sin(a) })
    } else {
      const a = ((i - outer) / Math.max(1, n - outer)) * Math.PI * 2 - Math.PI / 2
      arr.push({ x: cx + r2 * Math.cos(a), y: cy + r2 * Math.sin(a) })
    }
  }
  coords.value = arr
}

const boardStyle = computed(() => ({ width: W + 'px', height: H + 'px' }))

function pos(i) { return coords.value[i] || { x: 0, y: 0 } }

const oddList = computed(() => oddNodes(edges.value, nodes.value))
const oddCount = computed(() => oddList.value.length)

const theory = computed(() => {
  const chk = canDraw(edges.value, nodes.value)
  return chk.ok ? chk.reason : chk.reason
})

function isOdd(i) { return oddList.value.includes(i) }

function edgeIndex(a, b) {
  return edges.value.findIndex(([u, v]) => (u === a && v === b) || (u === b && v === a))
}

function isUsed(idx) { return usedEdges.value.includes(idx) }

function clickNode(i) {
  if (won.value) return
  errMsg.value = ''
  if (sel.value === -1) { sel.value = i; return }
  if (sel.value === i) { sel.value = -1; return }

  const idx = edgeIndex(sel.value, i)
  if (idx === -1) { errMsg.value = '这两个点之间没有连线'; sel.value = i; return }
  if (isUsed(idx)) { errMsg.value = '这条边已经走过了，不能重复'; sel.value = i; return }

  usedEdges.value = [...usedEdges.value, idx]
  lastNode.value = sel.value
  sel.value = i
  checkWin()
}

function checkWin() {
  if (usedEdges.value.length === edges.value.length) {
    won.value = true
    hintNode.value = -1
  }
}

function undo() {
  if (!usedEdges.value.length) return
  usedEdges.value = usedEdges.value.slice(0, -1)
  won.value = false
}

function resetAll() {
  usedEdges.value = []
  sel.value = -1
  won.value = false
  errMsg.value = ''
}

function showHint() {
  const chk = canDraw(edges.value, nodes.value)
  if (!chk.ok) { errMsg.value = chk.reason; return }
  const path = eulerPath(edges.value, nodes.value)
  hintNode.value = path[0]
  errMsg.value = ''
}

import { watch } from 'vue'
watch(level, newGame)
onUnmounted(() => {})
newGame()
</script>

<style scoped>
.eu { user-select: none; }
.eu-hud { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.eu-select, .eu-btn {
  font-size: 14px; padding: 6px 12px; border: 1px solid #1d70b8;
  background: #fff; color: #1d70b8; cursor: pointer; font-family: inherit;
}
.eu-btn:hover { background: #e6f1fb; }
.eu-stat { font-size: 14px; color: #0b0c0c; }
.eu-msg {
  font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;
  padding: 6px 10px; background: #f3f2f1; border-left: 3px solid #b1b4b6;
}
.eu-msg.ok { border-left-color: #00703c; color: #00703c; font-weight: 700; }
.eu-msg.err { border-left-color: #d4351c; color: #d4351c; }

.eu-info {
  font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  margin-bottom: 10px;
}
.eu-nodes { color: #1d70b8; font-weight: 700; }

.eu-board {
  position: relative; border: 1px solid #b1b4b6; background: #fff;
  max-width: 100%;
}
.eu-svg { position: absolute; inset: 0; }
.eu-node {
  position: absolute; width: 26px; height: 26px;
  border: 2px solid #1d70b8; border-radius: 50%;
  background: #fff; color: #1d70b8;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; cursor: pointer;
}
.eu-node:hover { background: #e6f1fb; }
.eu-node-odd { border-color: #d4351c; color: #d4351c; }
.eu-node-sel { background: #1d70b8; color: #fff; }
.eu-node-last { border-color: #00703c; background: #00703c; color: #fff; }

.eu-hint {
  margin-top: 10px; font-size: 13px; color: #00703c;
  padding: 6px 10px; background: #e6f1fb; border-left: 3px solid #00703c;
}
</style>
