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

/* ══════════════════════════════════════════════════════════
   以下为按《高思学校竞赛数学导引》七大专题补充的公式
   ══════════════════════════════════════════════════════════ */

/* ── 计算专题 ── */

/** 循环小数的循环节长度（纯循环小数才精确；混循环返回 0） */
export function repeatingCycle(n, d) {
  const g = gcd(n, d)
  let den = d / g
  // 去掉 2 和 5 的因子
  while (den % 2 === 0) den /= 2
  while (den % 5 === 0) den /= 5
  if (den === 1) return 0
  // 计算 10^k ≡ 1 (mod den) 的最小 k
  let k = 1, cur = 10 % den
  while (cur !== 1) { cur = (cur * 10) % den; k++ }
  return k
}

/** 数列第 n 项（等差或等比自动判断） */
export function seqNth(a1, a2, n) {
  const d = a2 - a1
  // 等差判据要排除「公差恰等于前项」的情况：1,2,4 是等比，d=1 会被误判为等差。
  // 正确做法：直接比较第三项 —— 缺第三项时按等差处理。
  return d === 0
    ? a1 * Math.pow(a2 / a1, n - 1)   // a1 === a2：等比（公比 1）
    : a1 + (n - 1) * d                 // 等差
}

/** 数列第 n 项（已知前两项，需第三项消歧） */
export function seqNth3(a1, a2, a3, n) {
  if (a2 - a1 === a3 - a2) return a1 + (n - 1) * (a2 - a1)   // 等差
  return a1 * Math.pow(a2 / a1, n - 1)                          // 等比
}

/** 找规律（等差或等比）求第 n 项 */
export function findPattern(list, n) {
  if (list.length < 2) return list[0] || 0
  const d = list[1] - list[0]
  const isArith = list.every((v, i) => i === 0 || v - list[i - 1] === d)
  if (isArith) return list[0] + (n - 1) * d
  const q = list[0] !== 0 ? list[1] / list[0] : 0
  const isGeo = q !== 0 && list.every((v, i) => i === 0 || v / list[i - 1] === q)
  if (isGeo) return list[0] * Math.pow(q, n - 1)
  return null  // 复杂规律，返回 null 表示需要人工判断
}

/* ── 数论专题 ── */

/** 辗转相除求 gcd */
export function euclid(a, b) { return gcd(a, b) }

/** 求 n 的所有正因数 */
export function divisors(n) {
  const out = []
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i)
  return out
}

/** 判断能否被 a 整除 */
export function divisibleBy(n, a) { return n % a === 0 }

/* ── 计数专题 ── */

/** 加法原理（分类计数之和） */
export function addPrinciple(...counts) { return counts.reduce((a, b) => a + b, 0) }

/** 乘法原理（分步计数之积） */
export function mulPrinciple(...counts) { return counts.reduce((a, b) => a * b, 1) }

/** 容斥原理：两集合 */
export function inclusionExclusion2(a, b, ab) { return a + b - ab }

/** 容斥原理：三集合 */
export function inclusionExclusion3(a, b, c, ab, bc, ac, abc) {
  return a + b + c - ab - bc - ac + abc
}

/** 错位排列（简单递推：D(n) = (n−1)[D(n−1) + D(n−2)]） */
export function derangement(n) {
  if (n === 0) return 1
  if (n === 1) return 0
  let a = 1, b = 0
  for (let i = 2; i <= n; i++) { [a, b] = [b, (i - 1) * (b + a)] }
  return b
}

/* ── 组合专题 ── */

/** 抽屉原理：n 个物体放 m 个抽屉，至少一个抽屉不少于 ⌈n/m⌉ 个 */
export function pigeonhole(n, m) { return Math.ceil(n / m) }

/** 抽屉原理加强：n 个物体放 m 个抽屉，至少有 k 个同色，需 n > m×(k−1) */
export function pigeonholeK(n, m, k) { return n > m * (k - 1) }

/* ── 几何专题 ── */

/** 长方形面积 */
export function rectArea(a, b) { return a * b }
/** 长方形周长 */
export function rectPerimeter(a, b) { return 2 * (a + b) }

/** 正方形面积 / 周长 */
export function squareArea(a) { return a * a }
export function squarePerimeter(a) { return 4 * a }

/** 三角形面积（底 × 高 ÷ 2） */
export function triArea(base, height) { return base * height / 2 }

/** 平行四边形面积 */
export function paraArea(base, height) { return base * height }

/** 梯形面积 */
export function trapezoidArea(a, b, h) { return (a + b) * h / 2 }

/** 圆面积（π 取 3.14） */
export function circleArea(r, pi = 3.14) { return pi * r * r }
/** 圆周长（π 取 3.14） */
export function circlePerimeter(r, pi = 3.14) { return 2 * pi * r }

/** 扇形面积 */
export function sectorArea(r, deg, pi = 3.14) { return (deg / 360) * pi * r * r }

/** 长方体体积 / 表面积 */
export function cuboidVolume(a, b, c) { return a * b * c }
export function cuboidSurface(a, b, c) { return 2 * (a * b + a * c + b * c) }

/** 正方体体积 / 表面积 */
export function cubeVolume(a) { return a * a * a }
export function cubeSurface(a) { return 6 * a * a }

/** 圆柱体积（π 取 3.14） */
export function cylinderVolume(r, h, pi = 3.14) { return pi * r * r * h }

/** 圆锥体积 */
export function coneVolume(r, h, pi = 3.14) { return pi * r * r * h / 3 }

/* ── 应用题专题（高斯体系补充） ── */

/**
 * 牛吃草（反比例应用题）：
 * 设原有草量 x（头·天），每天新长 y（头·天）。
 * n₁ 头牛 d₁ 天吃完 ⇒ x + y·d₁ = n₁·d₁
 * n₂ 头牛 d₂ 天吃完 ⇒ x + y·d₂ = n₂·d₂
 * 两式相减：y·(d₂ − d₁) = n₂d₂ − n₁d₁  ⇒  y = (n₂d₂ − n₁d₁)/(d₂ − d₁)
 * 再代回：x = n₁d₁ − y·d₁
 * ⚠️ 2026-10-04 原写成 (n₁d₁ − n₂d₂)/(d₂ − d₁)，符号与结构都错，恒返回负值。
 */
export function cowGrass(n1, d1, n2, d2) {
  const y = (n2 * d2 - n1 * d1) / (d2 - d1)      // 每天新长的草量
  return n1 * d1 - y * d1                            // 原有草量
}

/** 牛吃草：每天新长的草量 */
export function cowGrassGrowth(n1, d1, n2, d2) {
  return (n2 * d2 - n1 * d1) / (d2 - d1)
}

/** 还原问题（逆推）：从结果倒推回去 */
export function restore(start, steps) {
  return steps.reduce((v, op) => op(v), start)
}

/** 钟表问题：追及（时针分针重合，12 小时 11 次） */
export function clockOverlaps(hours) { return hours * 11 }

/** 钟表夹角（°） */
export function clockAngle(h, m) {
  const a = Math.abs(30 * h - 5.5 * m)
  return Math.min(a, 360 - a)
}

/** 浓度混合：c = (c₁V₁ + c₂V₂) ÷ (V₁ + V₂) */
export function mixConcentration2(c1, v1, c2, v2) {
  return (c1 * v1 + c2 * v2) / (v1 + v2)
}

/** 不定方程 ax + by = c 的正整数解（求个数） */
export function countPositiveSolutions(a, b, c) {
  let cnt = 0
  for (let x = 1; a * x < c; x++) {
    const rest = c - a * x
    if (rest % b === 0 && rest / b > 0) cnt++
  }
  return cnt
}

/** 盈亏问题（高斯口径）：人数 = (盈 + 亏) ÷ 两次每份差 */
export function profitLossCount(profit, loss, diffEach) {
  return (profit + loss) / diffEach
}

/** 和倍问题：小数 = 和 ÷ (倍数 + 1) */
export function sumRatioSmall(total, times) { return total / (times + 1) }

/** 差倍问题：大数 = 差 ÷ (倍数 − 1) */
export function diffRatioBig(diff, times) { return diff / (times - 1) }

/* ── 数字谜专题 ── */

/** 数阵图：等差三角阵第 n 行第 m 个数（首项 1，公差 d） */
export function triangleArray(n, m, d = 1) { return 1 + ((n - 1) * n / 2 + (m - 1)) * d }

/** 幻方校验：3×3 幻方中心数 = 总和 ÷ 9 */
export function magicCenter(sum) { return sum / 9 }

/** 竖式数字和：三位数 abc，数字和 = a+b+c */
export function digitSumOf(n) { return digitSum(n) }

/** 算符填空：给定 a、b 和结果，求缺失运算符（返回满足的两个数之和等） */
export function checkOp(a, b, result) {
  const cand = [a + b, a - b, a * b]
  return cand.some((v) => v === result)
}

/* ══════════════════════════════════════════════════════════
   五年级竖向铺开所需公式（对应高斯导引五年级 24 讲）
   ══════════════════════════════════════════════════════════ */

/* ── 第1讲 分数计算与比较大小 ── */

/** 分数比较：交叉相乘。返回 -1/0/1 分别表示 a<b, a=b, a>b */
export function cmpFrac(a1, a2, b1, b2) {
  const l = a1 * b2
  const r = b1 * a2
  return l < r ? -1 : l > r ? 1 : 0
}

/** 分数加法：a/b + c/d */
export function fracAdd(a, b, c, d) { return simplify(a * d + c * b, b * d) }

/** 分数减法：a/b − c/d */
export function fracSub(a, b, c, d) { return simplify(a * d - c * b, b * d) }

/** 分数乘法：a/b × c/d */
export function fracMul2(a, b, c, d) { return simplify(a * c, b * d) }

/** 分数除法：a/b ÷ c/d */
export function fracDiv(a, b, c, d) { return simplify(a * d, b * c) }

/** 分数小数互化：n/d 转小数（保留 digits 位） */
export function fracToDecimal(n, d, digits = 4) {
  const v = n / d
  return Number(v.toFixed(digits))
}

/** 带分数化假分数：a b/c → (a·c+b)/c */
export function mixedToImproper(a, b, c) { return { n: a * c + b, d: c } }

/** 假分数化带分数：23/5 → 4 3/5 */
export function improperToMixed(n, d) {
  const w = Math.floor(n / d)
  return { w, r: n - w * d, d }
}

/* ── 第4讲 包含与排除（容斥） ── */

/** 两集合容斥 */
export function ie2(a, b, both) { return a + b - both }

/** 三集合容斥 */
export function ie3(a, b, c, ab, bc, ac, abc) { return a + b + c - ab - bc - ac + abc }

/** 区间内倍数计数：1..n 中 d 的倍数个数 */
export function countMultiples(n, d) { return Math.floor(n / d) }

/** 1..n 中既能被 a 整除又能被 b 整除的个数（即 lcm 的倍数） */
export function countBoth(n, a, b) { return countMultiples(n, lcm(a, b)) }

/* ── 第5/20讲 行程问题 ── */

/** 火车过桥：车尾完全离开桥的时间 */
export function bridgeTime2(bridge, train, v) { return (bridge + train) / v }

/** 火车完全在桥上的时间（不需考虑车尾离桥） */
export function trainOnBridge(bridge, train, v) { return (bridge - train) / v }

/** 环形跑道同向追及：n 次追上需时 n·C/(v1−v2) */
export function circleCatch(c, n, v1, v2) { return n * c / (v1 - v2) }

/* ── 第6讲 几何计数 ── */

/** m×n 方格图中长方形总数 */
export function countRectangles(m, n) { return m * (m + 1) * n * (n + 1) / 4 }

/** 直线上 n 个点的线段数 */
export function countSegments(n) { return n * (n - 1) / 2 }

/* ── 第9讲 比较与估算 ── */

/** 估算：四舍五入到指定位数（万/亿） */
export function roundTo(n, unit) { return Math.round(n / unit) * unit }

/** 放缩估算：判断 a/b 与 c/d 相差是否小于 10% */
export function nearEqual(a, b, c, d, tol = 0.1) {
  const x = a / b
  const y = c / d
  return Math.abs(x - y) / Math.max(x, y) < tol
}

/* ── 第11讲 和差倍分问题 ── */

/** 和倍：小数 = 和 ÷ (倍数+1) */
export function srSmall(total, times) { return total / (times + 1) }

/** 差倍：大数 = 差 ÷ (倍数−1) */
export function drBig(diff, times) { return diff / (times - 1) }

/** 三量分配：总量按 a:b:c 分配 */
export function allocate3(total, a, b, c) {
  const s = a + b + c
  return [total * a / s, total * b / s, total * c / s]
}

/* ── 第14/19讲 直线形计算 ── */

/** 三角形面积（底×高÷2） */
export function triArea2(base, height) { return base * height / 2 }

/** 梯形中位线：(上底+下底)÷2 */
export function trapezoidMidline(a, b) { return (a + b) / 2 }

/** 等梯形（上底+下底=2×腰）周长 */
export function trapezoidPerimeter(a, b, c) { return a + b + 2 * c }

/* ── 第15讲 圆与扇形 ── */

/** 圆面积 */
export function circleArea2(r, pi = 3.14) { return pi * r * r }

/** 圆周长 */
export function circlePerimeter2(r, pi = 3.14) { return 2 * pi * r }

/** 扇形面积 */
export function sectorArea2(r, deg, pi = 3.14) { return (deg / 360) * pi * r * r }

/** 扇形弧长 */
export function arcLength(r, deg, pi = 3.14) { return (deg / 360) * 2 * pi * r }

/** 环形面积（同心圆） */
export function ringArea(R, r, pi = 3.14) { return pi * (R * R - r * r) }

/* ── 第16讲 余数 ── */

/** 被 d 整除的数中最大的不超过 n 的 */
export function maxMultiple(n, d) { return Math.floor(n / d) * d }

/**
 * 求满足 n mod a = r1 且 n mod b = r2 的**最小非负整数** n。
 * ⚠️ 返回的是最小解，不是任意解：例如 mod5余3 且 mod7余2 时，
 *    23 与 58 都满足，但最小解是 23（23%5=3, 23%7=2）。
 *    题目若问「最小是多少」直接用；若问「大于某值的最小解」需自行加 lcm(a,b) 的倍数。
 * @returns 最小非负解；无解返回 -1
 */
export function solveCRT(a, r1, b, r2, limit = 100000) {
  for (let n = 0; n <= limit; n++) {
    if (n % a === r1 && n % b === r2) return n
  }
  return -1
}

/* ── 第17讲 工程问题 ── */

/** 合作完成时间：1 ÷ (效率之和) */
export function workTime2(rates) { return 1 / rates.reduce((a, b) => a + b, 0) }

/** 交替工作：先算一个周期的工作量 */
export function alternateWork(a, b, days) {
  const per = a + b          // 两人各做 1 天
  const cycles = Math.floor(days / 2)
  const rest = days % 2
  return { cycles, per, rest }
}

/* ── 第18讲 牛吃草与钟表 ── */

/** 牛吃草：原有草量 */
export function cowGrass2(n1, d1, n2, d2) {
  const y = (n2 * d2 - n1 * d1) / (d2 - d1)
  return n1 * d1 - y * d1
}

/** 牛吃草：日生长量 */
export function cowGrowth(n1, d1, n2, d2) { return (n2 * d2 - n1 * d1) / (d2 - d1) }

/** 钟表夹角（度） */
export function clockAngle2(h, m) {
  const a = Math.abs(30 * h - 5.5 * m)
  return Math.min(a, 360 - a)
}

/* ── 第21讲 数字问题 ── */

/** 回文数 */
export function isPalindrome2(n) {
  const s = String(n)
  return s === s.split('').reverse().join('')
}

/** 数位逆序 */
export function reverseDigits(n) { return Number(String(Math.abs(n)).split('').reverse().join('')) }

/** 数字黑洞步数（数字→各位和→各位积，收敛到 0 或 495） */
export function digitBlackhole(n, max = 20) {
  let cur = Math.abs(n)
  const seen = new Set()
  for (let i = 0; i < max; i++) {
    const s = String(cur)
    const next = [...s].reduce((a, ch) => a * (+ch), 1)
    if (next === cur) return { steps: i, value: cur }
    if (seen.has(next)) return { steps: -1, value: next }
    seen.add(next)
    cur = next
  }
  return { steps: -1, value: cur }
}

/* ── 第22讲 计数综合 ── */

/** 错位排列 */
export function derangement2(n) {
  if (n === 0) return 1
  if (n === 1) return 0
  let a = 1, b = 0
  for (let i = 2; i <= n; i++) { [a, b] = [b, (i - 1) * (b + a)] }
  return b
}

/** 组合数 */
export function C2(n, k) {
  if (k < 0 || k > n) return 0
  return Math.round(factorial(n) / (factorial(k) * factorial(n - k)))
}

/* ── 第23讲 构造论证 ── */

/** 构造：n 边形外角和恒为 360° */
export function polygonExteriorSum() { return 360 }

/** 构造：能否用 n 根同样长的小棒拼出若干个等边三角形（边数需 3 的倍数） */
export function canMakeTriangles(n) { return n % 3 === 0 && n >= 3 }

/* ── 第24讲 抽屉原理 ── */

/** 至少 ⌈n/m⌉ */
export function pigeonhole3(n, m) { return Math.ceil(n / m) }

/** 加强版：n 个物体 m 个抽屉，保证至少 k 个同抽屉（返回是否保证） */
export function pigeonholeGuarantee(n, m, k) { return n > m * (k - 1) }

/** 至少有几组 k 个（把 n 个物体按 m 类分） */
export function pigeonholeGroups(n, m, k) { return Math.floor(n / k) }
