/**
 * 汉诺塔核心算法：最少步数、最优解序列、任意合法状态判定。
 */

/** 最少步数：2^n − 1 */
export function minMoves(n) {
  return Math.pow(2, n) - 1
}

/**
 * 生成最优移动序列。
 * @param n 盘子数
 * @param from 起始柱 index (0/1/2)
 * @param to 目标柱 index
 * @param aux 辅助柱 index
 * @returns 数组，元素为 {disk, from, to}，disk 从 1（最小盘）开始
 */
export function solve(n, from = 0, to = 2, aux = 1) {
  const moves = []
  hanoi(n, from, to, aux, moves)
  return moves
}

function hanoi(n, from, to, aux, out) {
  if (n === 0) return
  hanoi(n - 1, from, aux, to, out)
  out.push({ disk: n, from, to })
  hanoi(n - 1, aux, to, from, out)
}

/**
 * 从当前状态求解到目标状态的最少步数（BFS，适用于小规模 n）。
 * 状态编码：每根柱用从小到大的盘号列表表示。
 */
export function distanceToGoal(state, goal) {
  if (state === goal) return 0
  const keyOf = (s) => s.map((peg) => peg.join(',')).join('|')
  const startK = keyOf(state)
  const goalK = keyOf(goal)
  if (startK === goalK) return 0

  const seen = new Set([startK])
  let frontier = [{ s: state, d: 0 }]
  let depth = 0
  while (frontier.length && depth < 40) {
    const next = []
    depth++
    for (const { s } of frontier) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === j || s[i].length === 0) continue
          const disk = s[i][s[i].length - 1]      // 柱顶盘（数组末尾）
          // 目标柱为空，或其顶盘比当前盘大
          if (s[j].length && s[j][s[j].length - 1] < disk) continue
          const ns = s.map((p, k) => (k === i ? p.slice(0, -1) : k === j ? [...p, disk] : p.slice()))
          const nk = keyOf(ns)
          if (seen.has(nk)) continue
          if (nk === goalK) return depth
          seen.add(nk)
          next.push({ s: ns, d: depth })
        }
      }
    }
    frontier = next
  }
  return -1
}

/**
 * 状态是否合法：大盘必须在下、小盘在上。
 * 约定：state[peg] **末尾是柱顶**（最小盘）⇒ 数组应「大 → 小」递减。
 * 例：[3,2,1] 合法（3 在下、1 在上）；[3,1,2] 非法（2 比 1 小却在上面）。
 */
export function isValidState(state) {
  for (const peg of state) {
    for (let i = 0; i < peg.length - 1; i++) {
      if (peg[i] < peg[i + 1]) return false   // 小的在下、大的在上 ⇒ 违反「大盘在下」
    }
  }
  return true
}

/** 统计已移动步数是否与状态匹配（用于校验） */
export function validateMoves(moves, n) {
  const state = [[], [], []]
  // 约定：state[peg] 数组**末尾是柱顶**（最小盘）。所以大盘要先入栈。
  for (let k = n; k >= 1; k--) state[0].push(k)
  for (const m of moves) {
    const disk = m.disk
    const from = state[m.from]
    if (!from.length || from[from.length - 1] !== disk) return false  // 移动的不是柱顶盘
    from.pop()
    const to = state[m.to]
    if (to.length && to[to.length - 1] < disk) return false          // 大盘压小盘
    to.push(disk)
  }
  return state[2].length === n
}
