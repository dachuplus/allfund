/**
 * 初中数学联赛（初联）知识点库 —— 计算内核。
 *
 * 与小学奥数（mathCore.js）分开：初联偏代数/几何/数论定理，公式更抽象。
 * 每个公式都有对应断言（/tmp/tjunior.mjs），算错等于教错。
 */

/* ── 整除与数的性质 ── */

/** 完数（完全平方数）判定 */
export function isPerfectSquare(n) {
  if (n < 0) return false
  const r = Math.round(Math.sqrt(n))
  return r * r === n
}

/** 正因数个数 */
export function divisorCount(n) {
  if (n <= 0) return 0
  let c = 1
  let m = n
  for (let p = 2; p * p <= m; p++) {
    if (m % p !== 0) continue
    let e = 0
    while (m % p === 0) { m /= p; e++ }
    c *= e + 1
  }
  if (m > 1) c *= 2
  return c
}

/** 正因数之和 */
export function divisorSum(n) {
  if (n <= 0) return 0
  let s = 1
  let m = n
  for (let p = 2; p * p <= m; p++) {
    if (m % p !== 0) continue
    // 因子和 = 1 + p + p² + … + p^e（e 为 p 的指数，共 e+1 项）。
    // s1 先放 p^0=1；每次除法后 pw 升到 p^1、p^2 … 再累加。
    // ⚠️ 顺序坑：若「先累加再乘 p」，最后一次乘法后的 p^e 永远加不上
    //    （2026-10-04 因此把 12 算成 12、28 算成 24，正确是 28、56）。
    let s1 = 1
    let pw = 1
    while (m % p === 0) {
      m /= p
      pw *= p
      s1 += pw
    }
    s *= s1
  }
  if (m > 1) s *= 1 + m
  return s
}

/** 真因数之和（不含自身） */
export function properDivisorSum(n) { return divisorSum(n) - n }

/** 完全数：真因数之和等于自身（6/28/496/8128） */
export function isPerfectNumber(n) {
  return n > 1 && properDivisorSum(n) === n
}

/** 梅森素数判定：2^p − 1 为素数（p 须为素数） */
export function isMersennePrime(p) {
  const m = Math.pow(2, p) - 1
  if (m < 2) return false
  for (let i = 2; i * i <= m; i++) if (m % i === 0) return false
  return true
}

/* ── 方程与不等式 ── */

/** 一元二次 ax²+bx+c=0 的判别式 */
export function discriminant(a, b, c) { return b * b - 4 * a * c }

/** 韦达定理：两根之和 = −b/a，两根之积 = c/a */
export function vietaSum(a, b) { return -b / a }
export function vietaProduct(a, c) { return c / a }

/** 根的判别：返回 '两个不等实根' | '两个相等实根' | '无实根' */
export function rootNature(a, b, c) {
  const d = discriminant(a, b, c)
  if (d > 0) return '两个不等实根'
  if (d === 0) return '两个相等实根'
  return '无实根'
}

/** 均值不等式（AM-GM）：n 个正数算术平均 ≥ 几何平均 */
export function amgm(list) {
  if (!list.length) return 0
  const prod = list.reduce((a, b) => a * b, 1)
  return Math.pow(prod, 1 / list.length)
}

/** 柯西不等式：(a²+b²)(c²+d²) ≥ (ac+bd)² */
export function cauchyLHS(a, b) { return a * a + b * b }
export function cauchyRHS(a, b, c, d) { return a * c + b * d }

/* ── 数列 ── */

/** 等差数列第 n 项 */
export function arithNth(a1, d, n) { return a1 + (n - 1) * d }
/** 等差数列前 n 项和 */
export function arithSum(a1, d, n) { return (2 * a1 + (n - 1) * d) * n / 2 }
/** 等比数列第 n 项 */
export function geoNth(a1, q, n) { return a1 * Math.pow(q, n - 1) }
/** 等比数列前 n 项和（q≠1） */
export function geoSum(a1, q, n) { return a1 * (Math.pow(q, n) - 1) / (q - 1) }

/** 斐波那契数列第 n 项（F1=F2=1） */
export function fib(n) {
  if (n <= 0) return 0
  let a = 1, b = 1
  for (let i = 3; i <= n; i++) { [a, b] = [b, a + b] }
  return n === 1 || n === 2 ? 1 : b
}

/* ── 组合计数 ── */

/** 阶乘 */
export function fact(n) {
  if (n < 0) throw new Error('阶乘不支持负数')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

/** 组合数 C(n,k) */
export function C(n, k) {
  if (k < 0 || k > n) return 0
  return Math.round(fact(n) / (fact(k) * fact(n - k)))
}

/** 排列数 A(n,k) */
export function A(n, k) {
  if (k < 0 || k > n) return 0
  return fact(n) / fact(n - k)
}

/** 二项式展开 (a+b)^n 的第 k 项系数 C(n,k) */
export function binomialCoeff(n, k) { return C(n, k) }

/** 加法原理：分步计数之和 */
export function addPrinciple(...counts) { return counts.reduce((a, b) => a + b, 0) }

/** 乘法原理：分步计数之积 */
export function mulPrinciple(...counts) { return counts.reduce((a, b) => a * b, 1) }

/**
 * 容斥原理（三集合）：|A∪B∪C| = |A|+|B|+|C| − |A∩B| − |B∩C| − |A∩C| + |A∩B∩C|
 */
export function inclusionExclusion(a, b, c, ab, bc, ac, abc) {
  return a + b + c - ab - bc - ac + abc
}

/** 抽屉原理：n 个物体放 m 个抽屉，至少一个抽屉不少于 ⌈n/m⌉ 个 */
export function pigeonhole(n, m) { return Math.ceil(n / m) }

/* ── 几何 ── */

/** 勾股定理：直角边 a,b，斜边 c */
export function hypotenuse(a, b) { return Math.sqrt(a * a + b * b) }

/** 勾股定理逆定理：判断三个数能否构成直角三角形 */
export function isRightTriangle(a, b, c) {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q)
  return x * x + y * y === z * z
}

/** 三角形三边关系检验：任意两边之和大于第三边 */
export function canFormTriangle(a, b, c) {
  return a + b > c && a + c > b && b + c > a
}

/** 三角形面积（海伦公式）：s 为半周长 */
export function heron(a, b, c) {
  const s = (a + b + c) / 2
  return Math.sqrt(s * (s - a) * (s - b) * (s - c))
}

/** 圆幂定理：PA·PB = PC·PD（P 为圆外一点，两条割线） */
export function powerOfPoint(PA, PB) { return PA * PB }

/** 托勒密定理：圆内接四边形 ABCD，AC·BD = AB·CD + BC·AD */
export function ptolemy(ab, bc, cd, da, ac, bd) { return ab * cd + bc * da === ac * bd }

/** 等比数列性质：相似三角形面积比 = 相似比的平方 */
export function areaRatio(k) { return k * k }

/* ── 绝对值与代数变形 ── */

/** 平方和公式 Σk² */
export function sumSquares(n) { return (n * (n + 1) * (2 * n + 1)) / 6 }

/** 立方和公式 Σk³ = [n(n+1)/2]² */
export function sumCubes(n) { const s = (n * (n + 1)) / 2; return s * s }

/** 平方和 Σk = n(n+1)/2 */
export function sumTo(n) { return (n * (n + 1)) / 2 }
