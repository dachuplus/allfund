/**
 * 数独核心算法：生成可解且唯一解的题目 + 求解器。
 * 难度由「挖空数量」控制：30/36/40/45/48 个空格。
 */

/** 0 表示空格，1-9 表示已填数字 */
export function emptyGrid(n = 9) {
  return Array.from({ length: n }, () => Array(n).fill(0))
}

/** 判断在 (r,c) 填 v 是否合法 */
export function canPlace(g, r, c, v) {
  const n = g.length
  const box = Math.sqrt(n)
  // 同行
  for (let i = 0; i < n; i++) if (g[r][i] === v) return false
  // 同列
  for (let i = 0; i < n; i++) if (g[i][c] === v) return false
  // 同宫
  const br = Math.floor(r / box) * box
  const bc = Math.floor(c / box) * box
  for (let i = 0; i < box; i++)
    for (let j = 0; j < box; j++)
      if (g[br + i][bc + j] === v) return false
  return true
}

/**
 * 回溯求解。返回解数组，无解返回 null。
 * opts.count = true 时返回解的个数（用于验证唯一解）
 */
export function solve(g, opts = {}) {
  const n = g.length
  const out = []
  const cur = g.map((r) => r.slice())

  function bt() {
    if (opts.count && out.length >= (opts.limit || 2)) return
    // 找最空的格子（候选最少）—— MRV 启发式，大幅加速
    let br = -1, bc = -1, best = Infinity
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (cur[r][c] === 0) {
        let cnt = 0
        for (let v = 1; v <= n; v++) if (canPlace(cur, r, c, v)) cnt++
        if (cnt === 0) return          // 死路
        if (cnt < best) { best = cnt; br = r; bc = c }
        if (cnt === 1) break
      }
    }
    if (br === -1) { out.push(cur.map((r) => r.slice())); return }  // 填满 ⇒ 找到解
    for (let v = 1; v <= n; v++) {
      if (!canPlace(cur, br, bc, v)) continue
      cur[br][bc] = v
      bt()
      cur[br][bc] = 0
      if (opts.count && out.length >= (opts.limit || 2)) return
    }
  }
  bt()
  if (opts.count) return out.length
  return out.length ? out[0] : null
}

/** 数某个格子的候选数 */
export function candidates(g, r, c) {
  const n = g.length
  const res = []
  for (let v = 1; v <= n; v++) if (canPlace(g, r, c, v)) res.push(v)
  return res
}

/** 校验完整盘面是否合法且已填满 */
export function isSolved(g) {
  const n = g.length
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] === 0) return false
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!canPlace(g, r, c, g[r][c])) {
      // canPlace 对已填格需换一种校验：检查有无同值冲突
      const box = Math.sqrt(n)
      for (let i = 0; i < n; i++) if (i !== c && g[r][i] === g[r][c]) return false
      for (let i = 0; i < n; i++) if (i !== r && g[i][c] === g[r][c]) return false
      const br = Math.floor(r / box) * box, bc = Math.floor(c / box) * box
      for (let i = 0; i < box; i++) for (let j = 0; j < box; j++) {
        if ((br + i !== r || bc + j !== c) && g[br + i][bc + j] === g[r][c]) return false
      }
    }
  }
  return true
}

/* ── 生成器 ── */

/** 造一个完整合法盘面（用随机合法解 + 随机置换） */
export function makeFullGrid(n = 9, rng = Math.random) {
  const g = emptyGrid(n)
  const okFill = fill(g, 0, 0, n, rng)
  if (!okFill) return null   // 随机置换失败（极罕见）
  return g
}

function fill(g, r, c, n, rng) {
  // 基 case 必须用 r === n（行号越过最后一行），不能用 c === n ——
  // 后者在 c === n-1 递归到 fill(r+1, 0) 时会越界，报 undefined。
  if (r === n) return true
  if (c === n) return fill(g, r + 1, 0, n, rng)
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, n), rng)
  for (const v of nums) {
    if (!canPlace(g, r, c, v)) continue
    g[r][c] = v
    if (fill(g, r, c + 1, n, rng)) return true
    g[r][c] = 0
  }
  return false
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 生成题目：挖 blanks 个空格，保证**唯一解**。
 * 用「对称挖空 + 唯一性校验」，失败则减少挖空数重试。
 */
export function generate(blanks = 45, seed = Date.now()) {
  let s = seed >>> 0
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

  for (let attempt = 0; attempt < 40; attempt++) {
    const full = makeFullGrid(9, rng)
    const puzzle = full.map((r) => r.slice())
    // 随机顺序挖空
    const cells = shuffle([...Array(81).keys()], rng)
    let removed = 0
    for (const idx of cells) {
      if (removed >= blanks) break
      const r = Math.floor(idx / 9), c = idx % 9
      const bak = puzzle[r][c]
      puzzle[r][c] = 0
      if (solve(puzzle, { count: true, limit: 2 }) !== 1) puzzle[r][c] = bak  // 会导致多解 ⇒ 还原
      else removed++
    }
    if (removed === blanks) return { puzzle, solution: full, blanks: removed }
  }
  // 兜底：返回较少挖空的版本
  const full = makeFullGrid(9, rng)
  const puzzle = full.map((r) => r.slice())
  let removed = 0
  for (const idx of shuffle([...Array(81).keys()], rng)) {
    if (removed >= 40) break
    const r = Math.floor(idx / 9), c = idx % 9
    const bak = puzzle[r][c]
    puzzle[r][c] = 0
    if (solve(puzzle, { count: true, limit: 2 }) !== 1) puzzle[r][c] = bak
    else removed++
  }
  return { puzzle, solution: full, blanks: removed }
}
