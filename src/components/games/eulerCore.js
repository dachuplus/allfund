/**
 * 一笔画核心算法：欧拉路径判定（奇点个数）+ Hierholzer 求路径。
 * 判定定理：连通图中，奇点数为 0 或 2 时可一笔画成。
 */

/** 计算每个点的度数 */
export function degrees(edges, nodeCount) {
  const d = new Array(nodeCount).fill(0)
  for (const [u, v] of edges) { d[u]++; d[v]++ }
  return d
}

/** 找出奇点（度数为奇数） */
export function oddNodes(edges, nodeCount) {
  const d = degrees(edges, nodeCount)
  const res = []
  for (let i = 0; i < nodeCount; i++) if (d[i] % 2 === 1) res.push(i)
  return res
}

/** 连通性检查：所有非孤立点是否连通 */
export function isConnected(edges, nodeCount) {
  if (edges.length === 0) return true
  const adj = Array.from({ length: nodeCount }, () => [])
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }
  const start = edges[0][0]
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) {
    const cur = stack.pop()
    for (const nx of adj[cur]) if (!seen.has(nx)) { seen.add(nx); stack.push(nx) }
  }
  for (let i = 0; i < nodeCount; i++) {
    if (adj[i].length > 0 && !seen.has(i)) return false
  }
  return true
}

/** 是否可一笔画 */
export function canDraw(edges, nodeCount) {
  if (!isConnected(edges, nodeCount)) return { ok: false, reason: '图不连通，存在断开的部分，无法一笔画' }
  const odd = oddNodes(edges, nodeCount)
  if (odd.length === 0) return { ok: true, reason: '无奇点，可从任意点起笔（欧拉回路）', start: 0 }
  if (odd.length === 2) return { ok: true, reason: '恰有 2 个奇点，须从一个奇点起笔、另一个收笔', start: odd[0] }
  return { ok: false, reason: '有 ' + odd.length + ' 个奇点（须为 0 或 2 个），无法一笔画' }
}

/** Hierholzer 算法求欧拉路径，无解返回 null */
export function eulerPath(edges, nodeCount) {
  const chk = canDraw(edges, nodeCount)
  if (!chk.ok) return null
  const start = chk.start

  const adj = Array.from({ length: nodeCount }, () => [])
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }

  const key = (u, v) => (u < v ? u + '-' + v : v + '-' + u)
  const used = new Set()
  const path = []
  const stack = [start]

  while (stack.length) {
    const cur = stack[stack.length - 1]
    let nxt = -1
    for (const nx of adj[cur]) {
      if (!used.has(key(cur, nx))) { nxt = nx; break }
    }
    if (nxt === -1) {
      path.push(stack.pop())
    } else {
      used.add(key(cur, nxt))
      stack.push(nxt)
    }
  }
  return path.reverse()
}

/** 校验路径：每条边恰好用一次，相邻点间必有边 */
export function validatePath(path, edges) {
  if (!path) return false
  const key = (u, v) => (u < v ? u + '-' + v : v + '-' + u)
  const edgeKeys = new Set(edges.map(([u, v]) => key(u, v)))
  if (edgeKeys.size !== edges.length) return false
  if (path.length !== edges.length + 1) return false

  const used = new Set()
  for (let i = 0; i < path.length - 1; i++) {
    const k = key(path[i], path[i + 1])
    if (!edgeKeys.has(k)) return false
    if (used.has(k)) return false
    used.add(k)
  }
  return true
}

/* ── 关卡生成 ── */

/** 随机生成可一笔画的关卡（先造链保证连通，再补边并校验奇点数） */
export function genLevel(level = 1, seed = Date.now()) {
  let s = (seed >>> 0) || 1
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

  const idx = Math.max(0, Math.min(2, level - 1))
  const N = [6, 8, 10][idx]
  const targetE = [7, 11, 15][idx]

  for (let attempt = 0; attempt < 400; attempt++) {
    const edges = []
    const seen = new Set()
    for (let i = 0; i < N - 1; i++) { seen.add(i + '-' + (i + 1)); edges.push([i, i + 1]) }
    let guard = 0
    while (edges.length < targetE && guard++ < 300) {
      const u = Math.floor(rng() * N)
      const v = Math.floor(rng() * N)
      if (u === v) continue
      const k = u < v ? u + '-' + v : v + '-' + u
      if (seen.has(k)) continue
      seen.add(k); edges.push([u, v])
    }
    const chk = canDraw(edges, N)
    if (chk.ok) {
      const path = eulerPath(edges, N)
      if (validatePath(path, edges)) return { nodes: N, edges, solution: path, level }
    }
  }
  const edges = []
  for (let i = 0; i < N - 1; i++) edges.push([i, i + 1])
  return { nodes: N, edges, solution: eulerPath(edges, N), level }
}
