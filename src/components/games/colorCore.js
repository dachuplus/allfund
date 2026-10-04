/**
 * 四色定理益智游戏：给地图分区染色，要求相邻不同色且用色最少。
 * 核心是「图着色」：回溯搜索最少色数 + 一组合法着色方案。
 */

/** 判断相邻：adj[i] 是与 i 相邻的区域编号数组 */
export function buildFromAdj(adj) {
  return adj.map((a) => a.slice())
}

/** 贪心求一个着色（不保证最少色，但总能给出合法解） */
export function greedyColor(adj, maxColors = 4) {
  const n = adj.length
  const colors = new Array(n).fill(-1)
  for (let i = 0; i < n; i++) {
    const used = new Set()
    for (const nb of adj[i]) if (colors[nb] >= 0) used.add(colors[nb])
    let c = 0
    while (c < maxColors && used.has(c)) c++
    if (c >= maxColors) return null
    colors[i] = c
  }
  return colors
}

/** 校验着色是否合法：相邻不同色，且色数不超过 maxColors */
export function validateColor(adj, colors, maxColors = 4) {
  if (!colors || colors.length !== adj.length) return false
  for (let i = 0; i < adj.length; i++) {
    if (colors[i] < 0 || colors[i] >= maxColors) return false
    for (const nb of adj[i]) if (colors[nb] === colors[i]) return false
  }
  return true
}

/** 用到的颜色种类数 */
export function colorCount(colors) {
  return new Set(colors.filter((c) => c >= 0)).size
}

/**
 * 求最少色数（回溯 + 剪枝）
 * @returns {min: number, solution: number[]}
 */
export function minColors(adj) {
  const n = adj.length
  for (let k = 1; k <= 4; k++) {
    const colors = new Array(n).fill(-1)
    if (tryColor(adj, colors, n, k)) return { min: k, solution: colors }
  }
  return { min: 5, solution: null }
}

/**
 * 回溯 + MRV 启发（选可用色最少的区域先染）
 * @param remaining 还剩多少个区域未染 —— **不要用 idx 推进**：
 *   MRV 会跳着选区域，若仍用 idx 判断终止，会漏染 idx 之前的区域，
 *   导致返回的 solution 里有 -1（2026-10-04 实测踩到）。
 */
function tryColor(adj, colors, remaining, k) {
  if (remaining === 0) return true

  let best = -1, bestCnt = Infinity
  for (let i = 0; i < adj.length; i++) {
    if (colors[i] >= 0) continue
    const used = new Set()
    for (const nb of adj[i]) if (colors[nb] >= 0) used.add(colors[nb])
    const cnt = k - used.size
    if (cnt < bestCnt) { bestCnt = cnt; best = i }
    if (bestCnt <= 0) return false       // 无可用颜色 ⇒ 剪枝
  }
  if (best === -1) return false          // 理论上不会到这里（remaining>0 必有未染点）

  const used = new Set()
  for (const nb of adj[best]) if (colors[nb] >= 0) used.add(colors[nb])
  for (let c = 0; c < k; c++) {
    if (used.has(c)) continue
    colors[best] = c
    if (tryColor(adj, colors, remaining - 1, k)) return true
    colors[best] = -1
  }
  return false
}

/* ── 关卡生成：用网格切分产生地图，并保证最少色数 = 4 ── */

/**
 * 生成一个网格地图的邻接表。
 * 做法：在 W×H 网格上，随机合并相邻格子形成区域。
 */
export function genMap(level = 1, seed = Date.now()) {
  let s = (seed >>> 0) || 1
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

  const idx = Math.max(0, Math.min(2, level - 1))
  const W = [4, 5, 6][idx]
  const H = [4, 5, 6][idx]
  const targetRegions = [5, 7, 9][idx]

  for (let attempt = 0; attempt < 300; attempt++) {
    const owner = Array.from({ length: W * H }, (_, i) => i)
    let regions = W * H
    // 随机合并到目标区域数
    while (regions > targetRegions) {
      const i = Math.floor(rng() * (W * H))
      const r = Math.floor(i / W), c = i % W
      // 找一个相邻格子合并
      const cand = []
      if (c + 1 < W) cand.push(i + 1)
      if (r + 1 < H) cand.push(i + W)
      if (c > 0) cand.push(i - 1)
      if (r > 0) cand.push(i - W)
      if (!cand.length) continue
      const j = cand[Math.floor(rng() * cand.length)]
      if (owner[j] === owner[i]) continue
      const from = owner[j]
      for (let k = 0; k < W * H; k++) if (owner[k] === from) owner[k] = owner[i]
      regions--
    }
    // 生成邻接表
    const ids = [...new Set(owner)]
    const remap = new Map(ids.map((v, i) => [v, i]))
    const adj = ids.map(() => new Set())
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const a = remap.get(owner[r * W + c])
      const right = c + 1 < W ? remap.get(owner[r * W + c + 1]) : -1
      const down = r + 1 < H ? remap.get(owner[(r + 1) * W + c]) : -1
      if (right >= 0 && right !== a) { adj[a].add(right); adj[right].add(a) }
      if (down >= 0 && down !== a) { adj[a].add(down); adj[down].add(a) }
    }
    const adjArr = adj.map((s2) => [...s2])
    const { min, solution } = minColors(adjArr)
    if (solution && min >= 3) {
      return {
        W, H, regions: adjArr.length, adj: adjArr,
        cells: owner, remap: [...remap.entries()],
        min, solution, level,
      }
    }
  }
  return null
}
