<template>
  <div class="sd">
    <div class="sd-hud">
      <select v-model="level" class="sd-select">
        <option :value="30">入门（30 空）</option>
        <option :value="36">简单（36 空）</option>
        <option :value="40">中等（40 空）</option>
        <option :value="45">困难（45 空）</option>
        <option :value="48">专家（48 空）</option>
      </select>
      <div class="sd-stat">用时：{{ time }}</div>
      <button class="sd-btn" @click="newGame">新游戏</button>
      <button class="sd-btn" @click="hint">提示一格</button>
      <button class="sd-btn" @click="checkAll">检查</button>
    </div>

    <div class="sd-msg" :class="{ err: messageType === 'err', ok: messageType === 'ok' }">
      {{ message || '规则：每行、每列、每个 3×3 宫内 1-9 各出现一次。' }}
    </div>

    <div class="sd-wrap">
      <div class="sd-board">
        <div
          v-for="(row, r) in board"
          :key="r"
          class="sd-row"
        >
          <div
            v-for="(cell, c) in row"
            :key="c"
            class="sd-cell"
            :class="{
              'sd-box-r': c % 3 === 2 && c !== 8,
              'sd-box-b': r % 3 === 2 && r !== 8,
              'sd-given': given[r][c],
              'sd-sel': selR === r && selC === c,
              'sd-same': sameRegion(r, c),
              'sd-conflict': conflictSet.has(r + ',' + c),
            }"
            @click="select(r, c)"
          >
            {{ cell || '' }}
            <span v-if="!cell && candAt(r, c).length" class="sd-cands">
              {{ candAt(r, c).join('') }}
            </span>
          </div>
        </div>
      </div>

      <div class="sd-pad">
        <div class="pad-title">候选数</div>
        <div class="pad-nums">
          <button
            v-for="n in 9"
            :key="n"
            class="pad-btn"
            :class="{ used: countUsed(n) >= 9 }"
            :disabled="countUsed(n) >= 9"
            @click="inputNum(n)"
          >{{ n }}</button>
        </div>
        <button class="pad-btn pad-clear" @click="clearCell">清除</button>

        <div class="pad-title" style="margin-top:14px">提示</div>
        <div class="pad-tip">{{ tipText }}</div>
      </div>
    </div>

    <div v-if="solved" class="sd-win">🎉 完成！用时 {{ time }}</div>
  </div>
</template>

<script setup>
/**
 * 数独：9×9 唯一解题盘。
 * 核心算法见 sudokuCore.js（生成器保证唯一解，求解器用 MRV 启发）。
 */
import { ref, computed } from 'vue'
import { generate, solve, candidates, isSolved } from './sudokuCore.js'

const level = ref(45)
const board = ref([])
const given = ref([])
const solution = ref([])
const selR = ref(-1)
const selC = ref(-1)
const solved = ref(false)
const message = ref('')
const messageType = ref('')
const startAt = ref(Date.now())
const now = ref(Date.now())
const time = ref('0:00')

let timer = null
function tick() {
  const s = Math.floor((Date.now() - startAt.value) / 1000)
  time.value = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

function newGame() {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0
  const r = generate(level.value, seed)
  board.value = r.puzzle.map((row) => row.slice())
  given.value = r.puzzle.map((row) => row.map((v) => v !== 0))
  solution.value = r.solution
  selR.value = -1
  selC.value = -1
  solved.value = false
  message.value = ''
  messageType.value = ''
  startAt.value = Date.now()
  now.value = Date.now()
  if (!timer) timer = setInterval(() => { now.value = Date.now(); tick() }, 1000)
}

function select(r, c) {
  selR.value = r
  selC.value = c
}

/** 选中格是否与选中格同行/同列/同宫 */
function sameRegion(r, c) {
  if (selR.value < 0) return false
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
  const sr = Math.floor(selR.value / 3) * 3, sc = Math.floor(selC.value / 3) * 3
  return r === selR.value || c === selC.value || (br === sr && bc === sc)
}

function candAt(r, c) {
  if (board.value[r][c]) return []
  return candidates(board.value, r, c)
}

function countUsed(n) {
  let cnt = 0
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board.value[r][c] === n) cnt++
  return cnt
}

function inputNum(n) {
  if (selR.value < 0 || selC.value < 0) { setMsg('请先点一个空格', 'err'); return }
  const r = selR.value, c = selC.value
  if (given.value[r][c]) { setMsg('这是题目给定的数字，不能改', 'err'); return }
  board.value[r][c] = board.value[r][c] === n ? 0 : n
  message.value = ''
  if (isSolved(board.value)) {
    solved.value = true
    setMsg('完成！', 'ok')
    if (timer) { clearInterval(timer); timer = null }
  }
}

function clearCell() {
  if (selR.value < 0) return
  const r = selR.value, c = selC.value
  if (given.value[r][c]) { setMsg('题目给定的数字不能清除', 'err'); return }
  board.value[r][c] = 0
}

function hint() {
  if (selR.value < 0) { setMsg('请先点一个空格再要提示', 'err'); return }
  const r = selR.value, c = selC.value
  if (given.value[r][c]) { setMsg('这格是给定的', 'err'); return }
  board.value[r][c] = solution.value[r][c]
  setMsg('已填入正确答案', 'ok')
  if (isSolved(board.value)) { solved.value = true; if (timer) { clearInterval(timer); timer = null } }
}

function checkAll() {
  let bad = 0
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (board.value[r][c] && board.value[r][c] !== solution.value[r][c]) bad++
  }
  if (bad === 0) setMsg(solved.value ? '已全部正确' : '目前填的都正确，继续！', 'ok')
  else setMsg('有 ' + bad + ' 格填错了', 'err')
}

function setMsg(m, t) { message.value = m; messageType.value = t }

// 冲突标记（同行同列同宫有重复数字）
const conflictSet = computed(() => {
  const bad = new Set()
  const mark = (r, c, n) => {
    for (let i = 0; i < 9; i++) {
      if (i !== c && board.value[r][i] === n) { bad.add(r + ',' + c); bad.add(r + ',' + i) }
      if (i !== r && board.value[i][c] === n) { bad.add(r + ',' + c); bad.add(i + ',' + c) }
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const rr = br + i, cc = bc + j
      if ((rr !== r || cc !== c) && board.value[rr][cc] === n) { bad.add(r + ',' + c); bad.add(rr + ',' + cc) }
    }
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board.value[r][c]) mark(r, c, board.value[r][c])
  return bad
})

const tipText = computed(() => {
  if (selR.value < 0) return '先点一个格子'
  const list = candAt(selR.value, selC.value)
  return list.length ? '候选：' + list.join(' ') : '该格无候选数'
})

newGame()
import { onUnmounted } from 'vue'
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.sd { user-select: none; }
.sd-hud { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.sd-select, .sd-btn {
  font-size: 14px; padding: 6px 12px; border: 1px solid #1d70b8;
  background: #fff; color: #1d70b8; cursor: pointer; font-family: inherit;
}
.sd-btn:hover { background: #e6f1fb; }
.sd-stat { font-size: 14px; color: #0b0c0c; }
.sd-msg {
  font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;
  min-height: 20px; padding: 6px 10px; background: #f3f2f1; border-left: 3px solid #b1b4b6;
}
.sd-msg.err { border-left-color: #d4351c; color: #d4351c; }
.sd-msg.ok { border-left-color: #00703c; color: #00703c; }

.sd-wrap { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.sd-board {
  display: grid; grid-template-rows: repeat(9, 34px);
  width: 306px; border: 2px solid #0b0c0c; background: #fff;
}
.sd-row { display: grid; grid-template-columns: repeat(9, 34px); }
.sd-cell {
  border: 1px solid #d8d8d8; display: flex; align-items: center; justify-content: center;
  font-size: 17px; cursor: pointer; position: relative;
  font-weight: 700; color: #1d70b8;
}
.sd-cell.sd-box-r { border-right: 2px solid #0b0c0c; }
.sd-cell.sd-box-b { border-bottom: 2px solid #0b0c0c; }
.sd-cell.sd-given { color: #0b0c0c; background: #f3f2f1; }
.sd-cell.sd-same { background: #e6f1fb; }
.sd-cell.sd-sel { background: #1d70b8; color: #fff; }
.sd-cell.sd-conflict { color: #d4351c; }
.sd-cell.sd-sel.sd-conflict { color: #fff; }
.sd-cands {
  position: absolute; bottom: 1px; right: 2px;
  font-size: 9px; color: #b1b4b6; font-weight: 400; letter-spacing: 0;
}

.sd-pad {
  border: 1px solid #b1b4b6; padding: 10px 12px; background: #f3f2f1;
  width: 180px;
}
.pad-title { font-size: 13px; font-weight: 700; color: #1d70b8; margin-bottom: 6px; }
.pad-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.pad-btn {
  border: 1px solid #1d70b8; background: #fff; color: #1d70b8;
  font-size: 16px; font-weight: 700; padding: 8px 0; cursor: pointer;
}
.pad-btn:hover:not(:disabled) { background: #e6f1fb; }
.pad-btn.used { opacity: 0.4; cursor: not-allowed; }
.pad-clear { width: 100%; margin-top: 6px; }
.pad-tip { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.sd-win {
  margin-top: 12px; font-size: 16px; font-weight: 700; color: #00703c;
  padding: 10px; background: #e6f1fb; border-left: 3px solid #00703c;
}
</style>
