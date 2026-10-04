<template>
  <div class="cl">
    <div class="cl-hud">
      <select v-model="level" class="cl-select">
        <option :value="1">简单（5 区）</option>
        <option :value="2">中等（7 区）</option>
        <option :value="3">困难（9 区）</option>
      </select>
      <div class="cl-stat">已用色：{{ usedColors }} 种</div>
      <div class="cl-stat">最少需要：{{ minNeeded }} 色</div>
      <button class="cl-btn" @click="newGame">新地图</button>
      <button class="cl-btn" @click="autoSolve">自动求解</button>
      <button class="cl-btn" @click="resetAll">清除</button>
    </div>

    <div class="cl-msg" :class="{ ok: won, err: errMsg }">
      <template v-if="won">🎉 完成！用了 {{ usedColors }} 种颜色{{ usedColors === minNeeded ? '，正是最少色数，完美！' : '' }}</template>
      <template v-else-if="errMsg">{{ errMsg }}</template>
      <template v-else>规则：给每个区域涂一种颜色，<strong>相邻区域不能同色</strong>。目标：用最少的颜色完成。</template>
    </div>

    <div class="cl-body">
      <div class="cl-palette">
        <div class="cl-sec">调色板</div>
        <button
          v-for="c in 4"
          :key="c"
          class="cl-color"
          :style="{ background: COLORS[c - 1] }"
          :class="{ active: curColor === c }"
          @click="curColor = c"
        >{{ c }}</button>
        <div class="cl-tip">当前颜色：第 {{ curColor }} 色</div>
      </div>

      <!-- 按区域聚合：同一区域的所有小格用 SVG path 连成一个整体色块，
           这样视觉上才是「地图上的一个省」，而不是一堆散方块。 -->
      <div class="cl-map" :style="{ width: W * cell + 'px', height: H * cell + 'px' }">
        <svg :width="W * cell" :height="H * cell" class="cl-svg">
          <path
            v-for="rg in regionShapes"
            :key="rg.id"
            :d="rg.d"
            :fill="colors[rg.id] >= 0 ? COLORS[colors[rg.id]] : '#ffffff'"
            :stroke="'#0b0c0c'"
            stroke-width="1.5"
            @click="paint(rg.id)"
            @contextmenu.prevent="erase(rg.id)"
          />
        </svg>
        <!-- 透明点击层：保证每个区域（含被覆盖的）都能点到 -->
        <div
          v-for="(cellIdx, i) in cells"
          :key="'h' + i"
          class="cl-hit"
          :style="{ left: (i % W) * cell + 'px', top: Math.floor(i / W) * cell + 'px', width: cell + 'px', height: cell + 'px' }"
          @click="paint(cellIdx)"
          @contextmenu.prevent="erase(cellIdx)"
        ><span class="cl-hit-label">{{ cellIdx + 1 }}</span></div>
      </div>
    </div>

    <div class="cl-info">
      <strong>四色定理：</strong>任何平面地图都能用不超过 4 种颜色染完，使相邻区域不同色。
      本题需要 <strong>{{ minNeeded }}</strong> 色。
    </div>
  </div>
</template>

<script setup>
/**
 * 四色定理染色游戏：给地图分区染色，相邻不同色，用色最少。
 * 核心算法见 colorCore.js（minColors 回溯求最少色数 / validateColor）。
 */
import { ref, computed, watch } from 'vue'
import { genMap, minColors, validateColor } from './colorCore.js'

const COLORS = ['#d4351c', '#00703c', '#1d70b8', '#b58800']

const level = ref(1)
const W = ref(4)
const H = ref(4)
const cells = ref([])
const adj = ref([])
const colors = ref([])
const solution = ref([])
const minNeeded = ref(3)
const curColor = ref(1)
const won = ref(false)
const errMsg = ref('')

const cell = 44

function newGame() {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0
  const r = genMap(level.value, seed)
  if (!r) { errMsg.value = '地图生成失败，请再试一次'; return }
  W.value = r.W
  H.value = r.H
  cells.value = r.cells.slice()
  adj.value = r.adj
  solution.value = r.solution
  minNeeded.value = r.min
  colors.value = new Array(r.regions).fill(-1)
  won.value = false
  errMsg.value = ''
  curColor.value = 1
}

const usedColors = computed(() => new Set(colors.value.filter((c) => c >= 0)).size)

/**
 * 把同一区域的所有小格合并成一条 SVG path。
 * 做法：收集该区域所有格子 → 求外轮廓的矩形并集（用「每行连续段」拼多边形）。
 * 简单可靠：把每个格子的矩形按行分组，横向合并连续段，再纵向合并完全相同的段。
 */
const regionShapes = computed(() => {
  const n = W.value * H.value
  // 每个区域 → 该区域占据的格子索引集合
  const byRegion = new Map()
  for (let i = 0; i < n; i++) {
    const rg = cells.value[i]
    if (rg === undefined) continue
    if (!byRegion.has(rg)) byRegion.set(rg, [])
    byRegion.get(rg).push(i)
  }

  const shapes = []
  for (const [id, list] of byRegion) {
    // 转成 [row, col] 并按行分组
    const rows = new Map()
    for (const idx of list) {
      const r = Math.floor(idx / W.value)
      const c = idx % W.value
      if (!rows.has(r)) rows.set(r, [])
      rows.get(r).push(c)
    }
    // 逐行求连续区间 [c1,c2]
    const segs = []
    for (const [r, cs] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      cs.sort((a, b) => a - b)
      let start = cs[0], prev = cs[0]
      for (let i = 1; i <= cs.length; i++) {
        if (i === cs.length || cs[i] !== prev + 1) {
          segs.push({ r, c1: start, c2: prev })
          start = cs[i]
        }
        prev = cs[i]
      }
    }
    shapes.push({ id, d: segsToPath(segs) })
  }
  return shapes
})

/** 把行区间列表拼成 path 的 d 属性（行间竖向合并） */
function segsToPath(segs) {
  const k = cell
  let d = ''
  let i = 0
  while (i < segs.length) {
    // 把纵向连续且左右边界一致的段合并成一个矩形
    const s0 = segs[i]
    let j = i + 1
    while (
      j < segs.length &&
      segs[j].r === segs[j - 1].r + 1 &&
      segs[j].c1 === s0.c1 &&
      segs[j].c2 === s0.c2
    ) j++
    const rEnd = segs[j - 1].r + 1
    d += 'M' + s0.c1 * k + ',' + s0.r * k +
         'H' + (s0.c2 + 1) * k +
         'V' + rEnd * k +
         'H' + s0.c1 * k + 'Z'
    i = j
  }
  return d
}

function paint(regionIdx) {
  if (won.value) return
  errMsg.value = ''
  // 涂色前先检查：若同色邻居已存在，提示
  const neighborSame = adj.value[regionIdx].some(
    (nb) => colors.value[nb] === curColor.value
  )
  colors.value[regionIdx] = curColor.value
  if (neighborSame) {
    errMsg.value = '注意：有相邻区域已经是第 ' + curColor.value + ' 色'
  }
  checkWin()
}

function erase(regionIdx) {
  colors.value[regionIdx] = -1
  won.value = false
  errMsg.value = ''
}

function checkWin() {
  if (colors.value.some((c) => c < 0)) return
  if (!validateColor(adj.value, colors.value, 4)) {
    errMsg.value = '还有相邻区域同色，请检查'
    return
  }
  won.value = true
}

function autoSolve() {
  colors.value = solution.value.slice()
  checkWin()
}

function resetAll() {
  colors.value = new Array(adj.value.length).fill(-1)
  won.value = false
  errMsg.value = ''
}

watch(level, newGame)
newGame()
</script>

<style scoped>
.cl { user-select: none; }
.cl-hud { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.cl-select, .cl-btn {
  font-size: 14px; padding: 6px 12px; border: 1px solid #1d70b8;
  background: #fff; color: #1d70b8; cursor: pointer; font-family: inherit;
}
.cl-btn:hover { background: #e6f1fb; }
.cl-stat { font-size: 14px; color: #0b0c0c; }
.cl-msg {
  font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;
  padding: 6px 10px; background: #f3f2f1; border-left: 3px solid #b1b4b6;
}
.cl-msg.ok { border-left-color: #00703c; color: #00703c; font-weight: 700; }
.cl-msg.err { border-left-color: #d4351c; color: #d4351c; }

.cl-body { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.cl-palette { border: 1px solid #b1b4b6; background: #f3f2f1; padding: 10px 12px; }
.cl-sec { font-size: 13px; font-weight: 700; color: #1d70b8; margin-bottom: 8px; }
.cl-color {
  display: block; width: 44px; height: 32px; margin-bottom: 6px;
  border: 2px solid transparent; cursor: pointer;
  color: #fff; font-weight: 700; font-size: 14px;
}
.cl-color.active { border-color: #0b0c0c; }
.cl-tip { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

.cl-map {
  position: relative; border: 2px solid #0b0c0c; background: #fff;
}
.cl-svg { position: absolute; inset: 0; }
.cl-svg path { cursor: pointer; }
.cl-svg path:hover { filter: brightness(0.94); }
.cl-hit {
  position: absolute; display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.cl-hit-label {
  font-size: 10px; color: #b1b4b6; pointer-events: none; font-weight: 700;
}

.cl-info {
  margin-top: 14px; font-size: 13px; color: var(--text-secondary);
  line-height: 1.8; background: #f3f2f1; padding: 10px 12px;
  border-left: 3px solid #1d70b8;
}
</style>
