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
/**
 * 托勒密定理：圆内接四边形 ABCD，AC·BD = AB·CD + BC·AD。
 * ⚠️ 必须用容差比较，不能用 `===`：正方形边长 1 时 √2·√2 = 2.0000000000000004，
 *    严格相等会误判为「不成立」。这是几何判定的通用坑。
 */
export function ptolemy(ab, bc, cd, da, ac, bd) {
  return Math.abs(ab * cd + bc * da - ac * bd) < 1e-9
}

/** 等比数列性质：相似三角形面积比 = 相似比的平方 */
export function areaRatio(k) { return k * k }

/* ── 绝对值与代数变形 ── */

/** 平方和公式 Σk² */
export function sumSquares(n) { return (n * (n + 1) * (2 * n + 1)) / 6 }

/** 立方和公式 Σk³ = [n(n+1)/2]² */
export function sumCubes(n) { const s = (n * (n + 1)) / 2; return s * s }

/** 平方和 Σk = n(n+1)/2 */
export function sumTo(n) { return (n * (n + 1)) / 2 }

/* ══════════════════════════════════════════════════════════
   初联（初中联赛 · 上海六年级）补充公式
   依据：乔一鹏《初中数学竞赛辅导与练习·初中数学方法80讲》
        （上海交通大学出版社，依据上海二期课改新教材教学进度，初中六、七年级）
   另参考：小蓝书《数学奥林匹克小丛书·初中卷》分册结构
        （因式分解 / 方程与方程组 / 一次函数与二次函数 / 三角形与四边形 / 圆 / 整除同余与不定方程 / 组合趣题 / 解题方法与策略）
   ══════════════════════════════════════════════════════════ */

/* ── 数论：整除方法（第55讲） ── */

/** 辗转相除（更相减损术亦可，此处用除法版） */
export function euclid(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

/** 末位数问题（第44讲）：求 a^n 的个位数字 */
export function lastDigit(a, n) {
  if (n <= 0) return 1
  const r = a % 10
  const cyc = []
  let cur = r
  for (let i = 0; i < 4; i++) { cyc.push(cur); cur = (cur * r) % 10 }
  return cyc[(n - 1) % 4]
}

/** 末两位：求 a^n 的后两位（模 100） */
export function lastTwoDigits(a, n) {
  let r = 1
  for (let i = 0; i < n; i++) r = (r * a) % 100
  return r
}

/** 数字和迭代（数根） */
export function digitalRoot(n) {
  let x = Math.abs(n)
  while (x >= 10) {
    let s = 0
    while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
    x = s
  }
  return x
}

/* ── 数论：同余与不定方程（小蓝书卷6） ── */

/** 线性同余方程 ax ≡ b (mod m) 的解：返回最小非负解，无解返回 -1 */
export function solveLinearCongruence(a, b, m) {
  const g = gcd(a, m)
  if (g === 0) return m === 1 ? 0 : -1
  if (b % g !== 0) return -1            // 无解
  const mod = m / g
  // 化简后 a' x ≡ b' (mod mod)，用扩展欧几里得求解
  let [oldR, r] = [((a % m) + m) % m, m]
  let [oldS, s] = [1, 0]
  while (r !== 0) { const q = Math.floor(oldR / r);[oldR, r] = [r, oldR - q * r];[oldS, s] = [s, oldS - q * s] }
  const inv = ((oldS % mod) + mod) % mod
  return (((b / g) * inv) % mod + mod) % mod
}

/** 中国剩余定理：两式同余的最小非负解 */
export function crt2(a, r1, b, r2) {
  const g = gcd(a, b)
  if ((r2 - r1) % g !== 0) return -1
  const l = (a * b) / g
  for (let n = r1 % l; n < l; n += a) {
    if (n % b === r2 % b) return n
  }
  return -1
}

/** 扩展中国剩余定理（多模） */
export function crtN(pairs) {
  let x = 0, M = 1
  for (const [m, r] of pairs) {
    const t = solveLinearCongruence(M % m, (r - x) % m, m)
    if (t === -1) return -1
    x = x + M * t
    M = M * m
    x = ((x % M) + M) % M
  }
  return x
}

/** 正因数个数 */
export function numDivisors(n) {
  if (n <= 0) return 0
  let c = 1, m = n
  for (let p = 2; p * p <= m; p++) {
    if (m % p !== 0) continue
    let e = 0
    while (m % p === 0) { m /= p; e++ }
    c *= e + 1
  }
  if (m > 1) c *= 2
  return c
}

/** 不定方程 ax + by = c 的正整数解个数 */
export function countPosSolutions(a, b, c) {
  let cnt = 0
  for (let x = 1; a * x < c; x++) {
    const r = c - a * x
    if (r % b === 0 && r / b > 0) cnt++
  }
  return cnt
}
/* ── 代数：因式分解技巧（小蓝书卷1） ── */

/** 提取公因数 ax + ay = a(x+y) */
export function factorCommon(a) { return a }

/** 平方差：a² − b² = (a+b)(a−b) */
export function diffOfSquares(a, b) { return [(a + b), (a - b)] }

/** 完全平方：a² ± 2ab + b² = (a ± b)² */
export function perfectSquare(a, b, sign = 1) { return Math.pow(sign * a + b, 2) }

/** 立方和/差：a³ ± b³ = (a ± b)(a² ∓ ab + b²) */
export function sumOfCubes(a, b) { return [a + b, a * a - a * b + b * b] }
export function diffOfCubes(a, b) { return [a - b, a * a + a * b + b * b] }

/** 十字相乘法分解二次项：x² + (p+q)x + pq */
export function factorQuadratic(p, q) { return [p, q] }

/* ── 代数：方程与方程组（小蓝书卷2） ── */

/** 一元二次方程判别式 */
export function disc(a, b, c) { return b * b - 4 * a * c }

/** 韦达：根之和、根之积 */
export function vSum(a, b) { return -b / a }
export function vProd(a, c) { return c / a }

/** 解一元二次方程，返回根数组 */
export function solveQuadratic(a, b, c) {
  const d = disc(a, b, c)
  if (d < 0) return []
  if (d === 0) return [-b / (2 * a)]
  const s = Math.sqrt(d)
  return [(-b + s) / (2 * a), (-b - s) / (2 * a)]
}

/** 二元一次方程组（消元法）：ax+by=c, dx+ey=f */
export function solveLinear2(a, b, c, d, e, f) {
  const det = a * e - b * d
  if (det === 0) return null
  return { x: (c * e - b * f) / det, y: (a * f - c * d) / det }
}

/** 三元一次方程组（克拉默法则） */
export function solveLinear3(a, b, c, d, e, f, g, h, i, j, k, l) {
  const D = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  if (D === 0) return null
  const Dx = j * (e * i - f * h) - b * (k * i - f * l) + c * (k * h - e * l)
  const Dy = a * (k * i - f * l) - j * (d * i - f * g) + c * (d * l - k * g)
  const Dz = a * (e * l - k * h) - b * (d * l - k * g) + j * (d * h - e * g)
  return { x: Dx / D, y: Dy / D, z: Dz / D }
}

/* ── 代数：不等式（第33-37讲） ── */

/** 解一元一次不等式 ax + b > c（a>0）→ 返回下界 */
export function solveIneq(a, b, c) { return (c - b) / a }

/** 区间长度：数轴上 a ≤ x ≤ b 的整数个数 */
export function integerCount(a, b) { return Math.floor(b) - Math.ceil(a) + 1 }

/** 绝对值方程 |x − a| = b 的解 */
export function solveAbs(a, b) { return b >= 0 ? [a - b, a + b] : [] }

/** |x − a| < b 的区间 */
export function solveAbsIneq(a, b) { return b > 0 ? [a - b, a + b] : null }

/* ── 代数：一次函数与二次函数（小蓝书卷3） ── */

/** 一次函数 y = kx + b */
export const linear = (k, b, x) => k * x + b

/** 二次函数顶点：x = −b/(2a)，y = (4ac − b²)/(4a) */
export function quadVertex(a, b) {
  return { x: -b / (2 * a), y: (4 * a * 0 + (-b * b)) / (4 * a) }
}

/** 二次函数与 x 轴交点个数 */
export function quadRootCount(a, b, c) {
  const d = disc(a, b, c)
  return d > 0 ? 2 : d === 0 ? 1 : 0
}

/** 抛物线顶点纵坐标 = (4ac − b²)/(4a) */
export function quadVertexY(a, b, c) { return (4 * a * c - b * b) / (4 * a) }

/* ── 几何：三角形与四边形（小蓝书卷4、卷8） ── */

/** 勾股定理 */
export function hyp(a, b) { return Math.sqrt(a * a + b * b) }

/** 三角形面积（底×高÷2） */
export function triArea(b, h) { return b * h / 2 }
/** 中位线（三角形两边中点连线 = 第三边一半） */
export function midSegment(c) { return c / 2 }
/* ── 数论/代数：M = A·B + C 型（第51讲） ── */

/** 余数结构的周期：n 除以 d 的余数序列周期为 d */
export function modPeriod(d) { return d }

/* ── 方法论：容斥建模（第4讲 分类讨论） ── */

/** 互斥分类计数之和 */
export function addAll(...xs) { return xs.reduce((a, b) => a + b, 0) }

/** 分步计数之积 */
export function mulAll(...xs) { return xs.reduce((a, b) => a * b, 1) }
/** 错位排列 */
export function derange(n) {
  if (n === 0) return 1
  if (n === 1) return 0
  let a = 1, b = 0
  for (let i = 2; i <= n; i++) { [a, b] = [b, (i - 1) * (b + a)] }
  return b
}
/** gcd 别名（避免与旧名冲突） */
export function gcdf(a, b) { return gcd(a, b) }

/* ── 基础数论工具（本文件内部多处依赖） ── */

/** 最大公约数（辗转相除） */
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

/** 最小公倍数 */
export function lcm(a, b) {
  if (!a || !b) return 0
  return Math.abs(a * b) / gcd(a, b)
}

/* ── 补回：去重时被误删的函数 ── */

/** 切线长：PA² = PB·PC */
export function tangentLength(PB, PC) { return Math.sqrt(PB * PC) }

/** 抽屉原理加强版：n 个物体 m 个抽屉，保证至少 k 个同抽屉 */
export function pigeonholeGuarantee(n, m, k) { return n > m * (k - 1) }

/** 二集合容斥 */
export function inclusionExclusion2(a, b, ab) { return a + b - ab }

/** 三集合容斥 */
export function inclusionExclusion3(a, b, c, ab, bc, ac, abc) {
  return a + b + c - ab - bc - ac + abc
}
