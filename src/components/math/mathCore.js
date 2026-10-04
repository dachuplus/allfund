/**
 * 奥数知识点库 —— 计算内核。
 *
 * 单独抽成 .js 是为了能写单元测试：知识点库里每个公式算错都会教错孩子，
 * 所以每条题型都要有断言（见 /tmp/tmath.mjs）。
 */

/** 约分：返回最简分数 { n, d }，符号跟随分子（-3/6 → -1/2） */
export function simplify(n, d) {
  if (d === 0) throw new Error('分母不能为 0')
  const sign = d < 0 ? -1 : 1
  const sn = n * sign
  const sd = Math.abs(d)
  const g = gcd(sn, sd)
  return { n: sn / g, d: sd / g }
}

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

export function lcm(a, b) {
  if (!a || !b) return 0
  return Math.abs(a * b) / gcd(a, b)
}

/** 百分数互化：p% 转分数 { n, d } */
export function percentToFrac(p) {
  return simplify(p, 100)
}

/** 求 n 个数的和 */
export function sum(list) { return list.reduce((a, b) => a + b, 0) }

/** 平均数 */
export function average(list) {
  if (!list.length) return 0
  return sum(list) / list.length
}

/** 中位数 */
export function median(list) {
  if (!list.length) return 0
  const s = [...list].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** 众数（可能有多个，返回数组） */
export function mode(list) {
  const m = new Map()
  list.forEach((v) => m.set(v, (m.get(v) || 0) + 1))
  let max = 0
  m.forEach((c) => { if (c > max) max = c })
  if (max <= 1) return []
  return [...m.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b)
}

/** 极差 */
export function range(list) {
  if (!list.length) return 0
  return Math.max(...list) - Math.min(...list)
}

/* ── 行程问题 ── */

/** 相遇：s = (v1 + v2) * t */
export function meetTime(s, v1, v2) { return s / (v1 + v2) }
/** 相遇：s1 = v1 * t */
export function meetDist1(s, v1, v2) { return v1 * meetTime(s, v1, v2) }
/** 追及：追及时间 = 距离差 / 速度差 */
export function catchTime(d, v1, v2) {
  if (v1 === v2) return Infinity
  return d / Math.abs(v1 - v2)
}

/* ── 火车过桥 ── */
/** 完全过桥时间：(桥长 + 车长) / 车速 */
export function bridgeTime(bridge, train, v) { return (bridge + train) / v }

/* ── 流水行船 ── */
/** 顺水速度 = 船速 + 水速；逆水 = 船速 - 水速 */
export function boatSpeed(boat, water, down) { return down ? boat + water : boat - water }

/* ── 浓度 ── */
/** 混合两种溶液：c1/c2 为浓度(%)，v1/v2 为体积，c = (c1·v1 + c2·v2)/(v1+v2) */
export function mixConcentration(c1, v1, c2, v2) {
  return (c1 * v1 + c2 * v2) / (v1 + v2)
}
/** 稀释：c1V1 = c2V2 */
export function dilute(c1, v1, c2) { return c1 * v1 / c2 }

/* ── 行程/工程问题 ── */
/** 工程：t = 1 / (a + b) */
export function workTime(rates) { return 1 / rates.reduce((a, b) => a + b, 0) }

/** 数字 1..n 的和 */
export function sumTo(n) { return (n * (n + 1)) / 2 }

/** 数字 1..n 的平方和 */
export function sumSquares(n) { return (n * (n + 1) * (2 * n + 1)) / 6 }

/** 各位数字之和 */
export function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((a, d) => a + (+d), 0)
}

/** 各位数字之积 */
export function digitProduct(n) {
  return String(Math.abs(n)).split('').reduce((a, d) => a * (+d), 1)
}

/** 回文数判断 */
export function isPalindrome(n) {
  const s = String(n)
  return s === s.split('').reverse().join('')
}

/** 阶乘 */
export function factorial(n) {
  if (n < 0) throw new Error('阶乘不支持负数')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

/** 组合数 C(n, k) */
export function combination(n, k) {
  if (k < 0 || k > n) return 0
  return Math.round(factorial(n) / (factorial(k) * factorial(n - k)))
}

/** 排列数 A(n, k) */
export function permutation(n, k) {
  if (k < 0 || k > n) return 0
  return factorial(n) / factorial(n - k)
}

/* ── 周期问题 ── */
/** 两个周期同时回到起点：lcm(a, b) */
export function cycleLcm(a, b) { return lcm(a, b) }

/* ── 抽屉原理 ── */
/** n 个物体放入 m 个抽屉，至少有一个抽屉不少于 ceil(n/m) 个 */
export function pigeonholeMin(n, m) { return Math.ceil(n / m) }

/* ── 盈亏问题 ── */
/**
 * 盈亏问题：n 个小朋友分 m 个苹果，每人分 q 个余 r 个。
 * 求人数：人数 = (总差额) / (每人差额)
 */
export function profitLoss(items1, each1, items2, each2) {
  const d = each1 - each2
  if (d === 0) return Infinity
  return (items1 - items2) / d
}

/* ── 年龄问题 ── */
/** 几年前/几年后：x = (现在差) / 倍数差 */
export function ageAgo(nowDiff, times) {
  const d = times - 1
  if (d === 0) return Infinity
  return nowDiff / d
}

/* ── 鸡兔同笼 ── */
export function chickenRabbit(heads, legs) {
  const chicken = (4 * heads - legs) / 2
  const rabbit = heads - chicken
  return { chicken, rabbit }
}

/* ── 植树问题 ── */
/** 两端都种：棵数 = 总长/间隔 + 1；只种一端：= 总长/间隔；两端都不种：= 总长/间隔 - 1 */
export function trees(length, gap, bothEnds) {
  const n = length / gap
  if (bothEnds === 'both') return n + 1
  if (bothEnds === 'none') return n - 1
  return n
}

/* ── 分数分数应用 ── */
/** 分数乘法：a/b × c/d */
export function fracMul(a, b, c, d) { return simplify(a * c, b * d) }

/** 已知一个数的几分之几是多少，求这个数：x = part / (num/den) */
export function findWhole(part, num, den) { return part * den / num }

/* ── 等差数列 ── */
/** 等差数列第 n 项：a1 + (n-1)d */
export function arithmeticNth(a1, d, n) { return a1 + (n - 1) * d }
/** 等差数列前 n 项和：(a1 + an) * n / 2 */
export function arithmeticSum(a1, d, n) {
  return (2 * a1 + (n - 1) * d) * n / 2
}

/* ── 追及与环形相遇 ── */
/** 环形跑道相遇（反向）：n * C / (v1 + v2) */
export function circleMeetTimes(c, n, v1, v2) { return n * c / (v1 + v2) }

/* ── 质数 ── */
export function isPrime(n) {
  if (n < 2) return false
  if (n % 2 === 0) return n === 2
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false
  return true
}

/** 分解质因数 */
export function factorize(n) {
  const out = []
  let d = 2
  while (d * d <= n) {
    while (n % d === 0) { out.push(d); n /= d }
    d++
  }
  if (n > 1) out.push(n)
  return out
}
