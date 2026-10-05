<template>
  <div class="hn">
    <div class="hn-hud">
      <select v-model="n" class="hn-select">
        <option :value="3">3 盘（7 步）</option>
        <option :value="4">4 盘（15 步）</option>
        <option :value="5">5 盘（31 步）</option>
        <option :value="6">6 盘（63 步）</option>
        <option :value="7">7 盘（127 步）</option>
      </select>
      <div class="hn-stat">已移动：{{ moves }} 步</div>
      <div class="hn-stat">最少需要：{{ optimal }} 步</div>
      <button class="hn-btn" @click="reset">重来</button>
      <button class="hn-btn" @click="autoSolve">演示最优解</button>
    </div>

    <div class="hn-msg" :class="{ ok: won }">
      <template v-if="won">🎉 恭喜！你用了 {{ moves }} 步（最优 {{ optimal }} 步）{{ moves === optimal ? '，完美！' : '，再想想能否更快？' }}</template>
      <template v-else-if="autoRunning">正在演示最优解…</template>
      <template v-else>规则：每次只能移动最上面的一个盘子，大盘不能压在小盘上。</template>
    </div>

    <div class="hn-pegs">
      <div
        v-for="(peg, pi) in state"
        :key="pi"
        class="hn-peg"
        @click="tapPeg(pi)"
        :class="{ 'hn-peg-target': selFrom >= 0 && selFrom !== pi, 'hn-peg-from': selFrom === pi }"
      >
        <!-- 盘子在上、底座横线在下（底座要看起来在柱子脚下） -->
        <div class="hn-disks">
          <!-- state[pi] 数组末尾是柱顶（最小盘），所以从后往前渲染 -->
          <div
            v-for="(disk, di) in peg.slice().reverse()"
            :key="di"
            class="hn-disk"
            :style="diskStyle(disk)"
          >{{ disk }}</div>
        </div>
        <div class="hn-peg-base"></div>
        <div class="hn-peg-name">{{ pegNames[pi] }}</div>
      </div>
    </div>

    <div class="hn-info">
      <div><strong>递推思路：</strong>n 个盘最少需 2ⁿ − 1 步</div>
      <div class="hn-formula">最少步数 = 2<sup>{{ n }}</sup> − 1 = {{ optimal }}</div>
    </div>
  </div>
</template>

<script setup>
/**
 * 汉诺塔：递归思维的直观呈现。
 * 核心算法见 hanoiCore.js（minMoves / solve / validateMoves）。
 *
 * 状态约定：state[peg] 数组**末尾是柱顶**（最小盘），所以大盘在数组前部。
 */
import { ref, computed, onUnmounted } from 'vue'
import { minMoves, solve, validateMoves } from './hanoiCore.js'

const n = ref(3)
const state = ref([[], [], []])
const moves = ref(0)
const won = ref(false)
const autoRunning = ref(false)
const selFrom = ref(-1)
const pegNames = ['A 柱', 'B 柱', 'C 柱']

let autoTimer = null

/** 目标：全部移到 C 柱（index 2） */
const optimal = computed(() => minMoves(n.value))

function diskStyle(disk) {
  const w = 26 + disk * 12
  return {
    width: w + 'px',
    background: disk % 2 === 0 ? '#1d70b8' : '#00703c',
    color: '#fff',
  }
}

function reset() {
  stopAuto()
  const s = [[], [], []]
  for (let k = n.value; k >= 1; k--) s[0].push(k)   // 末尾是柱顶 ⇒ 大盘先入栈
  state.value = s
  moves.value = 0
  won.value = false
  selFrom.value = -1
}

/** 点柱子：第一次点选源柱，第二次点目标柱（空柱也可作为目标） */
function tapPeg(pi) {
  if (won.value || autoRunning.value) return
  if (selFrom.value === -1) { selFrom.value = pi; return }
  if (selFrom.value === pi) { selFrom.value = -1; return }

  tryMove(selFrom.value, pi)
  selFrom.value = -1
}

/** 用柱子名点击移动（备用交互） */
function tryMove(from, to) {
  const src = state.value[from]
  const dst = state.value[to]
  if (!src.length) return
  const disk = src[src.length - 1]
  if (dst.length && dst[dst.length - 1] < disk) return    // 大盘不能压小盘
  const ns = state.value.map((p, i) => {
    if (i === from) return p.slice(0, -1)
    if (i === to) return [...p, disk]
    return p.slice()
  })
  state.value = ns
  moves.value++
  if (state.value[2].length === n.value) {
    won.value = true
    stopAuto()
  }
}

function autoSolve() {
  reset()
  autoRunning.value = true
  const seq = solve(n.value, 0, 2, 1)
  // 校验序列合法再演示（防核心算法出错）
  if (!validateMoves(seq, n.value)) { autoRunning.value = false; return }
  let i = 0
  autoTimer = setInterval(() => {
    if (i >= seq.length) { stopAuto(); return }
    const m = seq[i++]
    tryMove(m.from, m.to)
  }, 380)
}

function stopAuto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null }
  autoRunning.value = false
}

import { watch } from 'vue'
watch(n, reset)
onUnmounted(stopAuto)
reset()
</script>

<style scoped>
.hn { user-select: none; }
.hn-hud { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.hn-select, .hn-btn {
  font-size: 14px; padding: 6px 12px; border: 1px solid #1d70b8;
  background: #fff; color: #1d70b8; cursor: pointer; font-family: inherit;
}
.hn-btn:hover { background: #e6f1fb; }
.hn-stat { font-size: 14px; color: #0b0c0c; }
.hn-msg {
  font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;
  padding: 6px 10px; background: #f3f2f1; border-left: 3px solid #b1b4b6;
}
.hn-msg.ok { border-left-color: #00703c; color: #00703c; font-weight: 700; }

.hn-pegs { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
.hn-peg { width: 130px; display: flex; flex-direction: column; align-items: center; }
.hn-peg-base {
  width: 100%; height: 10px; background: #5f5e5a; margin-top: -1px;
}
.hn-disks {
  display: flex; flex-direction: column; justify-content: flex-end;
  align-items: center; height: 210px; width: 100%;
  border-left: 3px solid #b1b4b6;   /* 柱子本身 */
  border-right: 3px solid #b1b4b6;
}
.hn-disk {
  height: 22px; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; margin: 1px 0; cursor: pointer;
  border: 1px solid rgba(0,0,0,0.2);
}
.hn-disk:hover { filter: brightness(1.15); }
.hn-peg-name { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.hn-peg-target .hn-peg-base { background: #1d70b8; }
.hn-peg-from .hn-disks { border-color: #1d70b8; box-shadow: inset 0 0 0 1px #1d70b8; }
.hn-peg-from .hn-peg-name { color: #1d70b8; font-weight: 700; }
.hn-peg { cursor: pointer; }

.hn-info {
  margin-top: 16px; font-size: 13px; color: var(--text-secondary);
  line-height: 1.8; background: #f3f2f1; padding: 10px 12px;
  border-left: 3px solid #1d70b8;
}
.hn-formula { font-family: ui-monospace, Menlo, monospace; color: #1d70b8; font-weight: 700; }
</style>
