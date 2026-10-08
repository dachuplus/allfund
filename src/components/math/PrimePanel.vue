<template>
  <div class="pn">
    <!-- ========== 一、快速判定方法 ========== -->
    <section class="pn-sec">
      <h3 class="pn-h">一、怎么快速判定一个数是不是质数</h3>

      <div class="pn-rule">
        <div class="pn-rule-h">核心结论：只需试除到 √n</div>
        <p>
          若 n 能被某个数整除，那这个数一定成对出现：其中一个必定 ≤ √n。
          所以<strong>只要 2 到 √n 之间没有任何一个数能整除 n，n 就是质数</strong>。
          100 以内最多只要试到 10（√100），1000 以内只要试到 32。
        </p>
      </div>

      <div class="pn-steps">
        <div v-for="(s, i) in RULES" :key="i" class="pn-step">
          <div class="pn-step-n">{{ i + 1 }}</div>
          <div class="pn-step-b">
            <div class="pn-step-t">{{ s.t }}</div>
            <div class="pn-step-d">{{ s.d }}</div>
          </div>
        </div>
      </div>

      <div class="pn-tipbox">
        <div class="pn-tip-t">三个秒杀技巧（考场先用它们筛掉绝大多数数）</div>
        <ul>
          <li>
            <b>排除 1</b>：1 既不是质数也不是合数（唯一「孤独」的正整数），最容易被误答。
          </li>
          <li>
            <b>大于 2 的偶数全部合数</b>：能被 2 整除。所以只需试奇数 3、5、7、9…，步长 2，省一半工作量。
          </li>
          <li>
            <b>各位数字和是 3 的倍数 ⇒ 是 3 的倍数</b>：如 561（5+6+1=12）。这一招能一次干掉一批数。
          </li>
          <li>
            <b>末位是 5 的（且不等于 5）⇒ 合数</b>：如 195、2015。只需试 5 就能排除。
          </li>
        </ul>
      </div>
    </section>

    <!-- ========== 二、质数验证计算器 ========== -->
    <section class="pn-sec">
      <h3 class="pn-h">二、质数验证计算器（展示试除全过程）</h3>

      <div class="pn-calc">
        <div class="pn-calc-row">
          <label class="pn-calc-label" for="pn-input">输入一个整数</label>
          <input
            id="pn-input"
            v-model="input"
            class="pn-input"
            type="number"
            inputmode="numeric"
            placeholder="例如 2026"
            @keyup.enter="run"
          />
          <button class="pn-btn" type="button" @click="run">开始验证</button>
          <button class="pn-btn pn-btn--ghost" type="button" @click="pickRandom">随机试试</button>
        </div>
        <p class="pn-calc-hint">范围 −10⁶ ~ 10⁹；非整数会自动取绝对值并四舍五入。</p>
      </div>

      <div v-if="result" class="pn-out">
        <div class="pn-out-verdict" :class="result.isPrime ? 'ok' : 'no'">
          <span class="pn-out-big">{{ absInput }}</span>
          <span class="pn-out-tag">{{ result.verdict }}</span>
        </div>

        <!-- 步骤 0：前置判断 -->
        <div v-if="result.pre.length" class="pn-out-sec">
          <div class="pn-out-sec-t">第 0 步：前置快速排除</div>
          <ul class="pn-out-list">
            <li v-for="(x, i) in result.pre" :key="'p' + i" :class="{ bad: !x.ok }">
              <span class="pn-mark" :class="x.ok ? 'yes' : 'no'">{{ x.ok ? '✓' : '✗' }}</span>
              {{ x.t }}
            </li>
          </ul>
        </div>

        <!-- 试除过程 -->
        <div v-if="result.trials.length" class="pn-out-sec">
          <div class="pn-out-sec-t">
            第 1 步：试除（只试奇数，从 3 到 {{ result.limit }}，因为 √{{ absInput }} ≈ {{ result.sqrt }}）
          </div>
          <table class="pn-trials">
            <thead>
              <tr>
                <th class="num">除数 d</th>
                <th class="num">{{ absInput }} ÷ d</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in result.trials" :key="'t' + i" :class="{ hit: t.hit }">
                <td class="num">{{ t.d }}</td>
                <td class="num">{{ t.q }}</td>
                <td>
                  <span v-if="t.hit" class="pn-hit">
                    整除！{{ absInput }} = {{ t.d }} × {{ t.q2 }}，所以 {{ absInput }} 是<b>合数</b>
                  </span>
                  <span v-else class="pn-nodiv">不能整除，继续</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 结论 -->
        <div class="pn-out-sec pn-out-final">
          <div class="pn-out-sec-t">结论</div>
          <p class="pn-final">
            <template v-if="result.isPrime">
              从 3 试除到 {{ result.limit }}（√{{ absInput }} ≈ {{ result.sqrt }}）<b>没有一个能整除 {{ absInput }}</b>，
              因此 <b>{{ absInput }} 是质数</b>。
            </template>
            <template v-else-if="result.factors">
              {{ absInput }} = <b>{{ result.factors }}</b>，有除 1 和它本身以外的因数，所以是<b>合数</b>。
            </template>
            <template v-else>
              {{ result.reason }}
            </template>
          </p>
          <ul v-if="result.notes.length" class="pn-out-notes">
            <li v-for="(x, i) in result.notes" :key="'n' + i">{{ x }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========== 三、0–1000 质数表 ========== -->
    <section class="pn-sec">
      <h3 class="pn-h">三、0–1000 以内的质数（共 {{ PRIMES_1000.length }} 个）</h3>
      <p class="pn-sub">
        绿底 = 质数（共 {{ PRIMES_1000.length }} 个），白底 = 合数。
        1 既不是质数也不是合数。
      </p>
      <div class="pn-grid">
        <span
          v-for="n in range1000"
          :key="n"
          class="pn-cell"
          :class="{ p: isP(n) }"
        >{{ n }}</span>
      </div>
      <p class="pn-note">
        规律：1000 以内质数共 168 个；大于 2 的质数全是奇数；个位只可能是 1、3、7、9（质数大于 5）。
      </p>
    </section>

    <!-- ========== 四、1900–2999 年代指数质数表 ========== -->
    <section class="pn-sec">
      <h3 class="pn-h">四、奥数「年代指数」常用区间 1900–2999（共 {{ PRIMES_1900.length }} 个）</h3>
      <p class="pn-sub">
        奥数里「某人出生于 19xx/19xx 年」这类题，常要判断年份是否为质数（如 1949、1997 是质数）。
        下表绿底为质数，可直接查。
      </p>
      <div class="pn-grid">
        <span
          v-for="n in range1900"
          :key="n"
          class="pn-cell"
          :class="{ p: isP1900(n) }"
        >{{ n }}</span>
      </div>
      <div class="pn-years">
        <div class="pn-years-t">这一区间里最常考的年份</div>
        <div class="pn-years-list">
          <span
            v-for="y in FAMOUS"
            :key="y.n"
            class="pn-year"
            :class="{ p: y.p }"
          >{{ y.n }}<i>{{ y.note }}</i></span>
        </div>
      </div>
    </section>

    <!-- ========== 五、陷阱数 ========== -->
    <section class="pn-sec">
      <h3 class="pn-h">五、质数考试常见陷阱数（看着像质数，其实不是）</h3>
      <p class="pn-sub">
        这些数<b>不是质数</b>，但长得「像」质数——大多个位是 1/3/7/9、不是平方就是某个质数的倍数。
        括号里是真实因子分解，全部由程序分解验证。
      </p>
      <table class="pn-traps">
        <thead>
          <tr>
            <th class="num">陷阱数</th>
            <th>外观特征</th>
            <th>真实身份</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in TRAPS" :key="t.n">
            <td class="num pn-trap-n">{{ t.n }}</td>
            <td class="pn-trap-look">{{ lookOf(t.n) }}</td>
            <td class="pn-trap-f">{{ t.n }} = {{ t.f }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pn-tipbox pn-tipbox--warn">
        <div class="pn-tip-t">考场最容易踩的 5 个坑</div>
        <ol>
          <li><b>把 1 当质数</b> —— 1 不是质数，也不是合数。</li>
          <li><b>忘了 2 是偶质数</b> —— 唯一的偶质数是 2，「偶数都不是质数」这句话要加「大于 2」。</li>
          <li><b>平方数没识别</b> —— 9、25、49、121、169、289… 外形和质数一模一样，但都是平方。</li>
          <li><b>试除到一半就停</b> —— 必须试到 √n 为止。如 91 只试 3、5、7 会误判，必须试到 7 才看出 91=7×13。</li>
          <li><b>末尾 1/3/7/9 就当质数</b> —— 这四种个位里合数极多，如 21(3×7)、51(3×17)、91(7×13)。</li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PRIMES_1000, PRIMES_1900, TRAPS } from './primeData.js'

/* ---------- 判定方法说明 ---------- */
const RULES = [
  {
    t: '先处理 0、1 和负数',
    d: '它们都不是质数。质数必须是大于 1 的正整数。',
  },
  {
    t: '若是 2，直接是质数',
    d: '2 是唯一的偶质数。一旦大于 2 且为偶数，立即判合数。',
  },
  {
    t: '大于 2 的偶数 → 合数',
    d: '能被 2 整除。所以试除时只需试奇数 3、5、7、9…，步长 2。',
  },
  {
    t: '只试到 √n 为止',
    d: '因数总是成对出现，若 a×b = n 则至少有一个 ≤ √n。只需试到 √n 即可判定。',
  },
  {
    t: '全部试完都除不尽 → 质数',
    d: '这就是完整判定。注意「试到 √n」而不是「试到 n−1」，能省大量时间。',
  },
]

/* ---------- 常用质数自查表 ---------- */
const FAMOUS = [
  { n: 1901, note: '质数', p: true },
  { n: 1907, note: '质数', p: true },
  { n: 1913, note: '质数', p: true },
  { n: 1931, note: '质数', p: true },
  { n: 1949, note: '质数', p: true },
  { n: 1973, note: '质数', p: true },
  { n: 1979, note: '质数', p: true },
  { n: 1987, note: '质数', p: true },
  { n: 1993, note: '质数', p: true },
  { n: 1997, note: '质数', p: true },
  { n: 1999, note: '质数', p: true },
  { n: 1900, note: '合数', p: false },
  { n: 1948, note: '合数', p: false },
  { n: 1976, note: '合数', p: false },
  { n: 1984, note: '合数', p: false },
  { n: 1988, note: '合数', p: false },
  { n: 1990, note: '合数', p: false },
  { n: 1998, note: '合数', p: false },
  { n: 2000, note: '合数', p: false },
]

/* ---------- 质数表 ---------- */
const range1000 = Array.from({ length: 1001 }, (_, i) => i)
const range1900 = Array.from({ length: 1100 }, (_, i) => 1900 + i)

const SET_1000 = new Set(PRIMES_1000)
const SET_1900 = new Set(PRIMES_1900)
function isP(n) { return SET_1000.has(n) }
function isP1900(n) { return SET_1900.has(n) }

/* ---------- 陷阱数外观特征 ---------- */
function lookOf(n) {
  const s = String(n)
  const last = s[s.length - 1]
  if (last === '5') return '末位 5（且不等于 5）'
  if (last === '0' || last === '2' || last === '4' || last === '6' || last === '8') {
    return last === '0' ? '末位 0，整十数' : '偶数'
  }
  const r = Math.sqrt(n)
  if (Number.isInteger(r)) return `${r} 的平方`
  const dsum = s.split('').reduce((a, c) => a + Number(c), 0)
  if (dsum % 3 === 0) return `各位和 ${dsum}，3 的倍数`
  return '末位 1/3/7/9，易误认'
}

/* ---------- 计算器 ---------- */
const input = ref('2026')
const absInput = computed(() => Math.abs(Math.round(Number(input.value) || 0)))

/** 质数判定 + 完整试除过程（严格试到 √n，与教学口径一致） */
function analyse(raw) {
  const n = Math.abs(Math.round(Number(raw) || 0))
  const pre = []
  const notes = []

  if (n < 2) {
    return {
      isPrime: false,
      verdict: '不是质数',
      pre: [],
      trials: [],
      limit: 0,
      sqrt: '0',
      factors: '',
      notes: [],
      reason: n === 1
        ? '1 既不是质数也不是合数 —— 它只有一个正因数（自己），不符合质数「大于 1 且只有 1 和自身两个因数」的定义。'
        : `${n} 小于 2，不是质数。质数必须是大于 1 的正整数。`,
    }
  }
  if (n === 2) {
    return {
      isPrime: true, verdict: '质数', pre: [], trials: [], limit: 0, sqrt: '1.41',
      factors: '', notes: ['2 是唯一的偶质数；除 1 和 2 外没有其他正因数。'],
      reason: '2 只有 1 和 2 两个正因数，是质数；它也是唯一的偶质数。',
    }
  }
  if (n % 2 === 0) {
    pre.push({ ok: false, t: `${n} 是偶数，能被 2 整除（${n} = 2 × ${n / 2}）` })
    return {
      isPrime: false, verdict: '合数', pre, trials: [], limit: 0,
      sqrt: Math.sqrt(n).toFixed(2), factors: `2 × ${n / 2}`, notes: [],
      reason: `${n} 是大于 2 的偶数，能被 2 整除，所以是合数。`,
    }
  }

  pre.push({ ok: true, t: `${n} > 2 且是奇数，排除偶数情况` })
  const dsum = String(n).split('').reduce((a, c) => a + Number(c), 0)
  if (dsum % 3 === 0) {
    pre.push({ ok: false, t: `各位数字和 = ${dsum}，是 3 的倍数，所以 ${n} 能被 3 整除` })
  } else {
    pre.push({ ok: true, t: `各位数字和 = ${dsum}，不是 3 的倍数` })
  }
  const last = String(n)[String(n).length - 1]
  if (last === '5') pre.push({ ok: false, t: `末位是 5，${n} 能被 5 整除` })
  else pre.push({ ok: true, t: `末位是 ${last}，不是 5` })

  // 完整试除：3, 5, 7, ... 直到 d*d > n
  const trials = []
  let hit = null
  for (let d = 3; d * d <= n; d += 2) {
    const q = Math.floor(n / d)
    const divisible = n % d === 0
    trials.push({ d, q, q2: q, hit: divisible })
    if (divisible) { hit = { d, q }; break }
  }

  const limit = trials.length ? trials[trials.length - 1].d : 3
  if (hit) {
    const f = factorize(n)
    const fs = f.map(([p, k]) => (k > 1 ? `${p}^${k}` : `${p}`)).join(' × ')
    notes.push(`只需试到 ${hit.d} 就能发现因数 ${hit.d}，因为 ${hit.d}² = ${hit.d * hit.d} ≤ ${n}。`)
    return {
      isPrime: false, verdict: '合数', pre, trials, limit,
      sqrt: Math.sqrt(n).toFixed(2), factors: fs, notes,
      reason: `试除到 ${hit.d} 时发现 ${n} 能被 ${hit.d} 整除，${n} = ${fs}，除了 1 和自身外还有因数，所以是合数。`,
    }
  }
  notes.push(`√${n} ≈ ${Math.sqrt(n).toFixed(2)}，所以只需试到 ${limit} 即可，无需再往上试。`)
  notes.push(`${n} 不含因数 2（奇数）、不含 5（末位不是 0/5），其余质因数也都试过了。`)
  return {
    isPrime: true, verdict: '质数', pre, trials, limit,
    sqrt: Math.sqrt(n).toFixed(2), factors: '', notes,
    reason: `试除从 3 到 ${limit} 都没有整除 ${n} 的数，而 ${limit * limit} = ${limit * limit} ≥ ${n}，判定完成，${n} 是质数。`,
  }
}

function factorize(n) {
  const out = []
  let d = 2
  while (d * d <= n) {
    while (n % d === 0) { out.push(d); n = Math.floor(n / d) }
    d += 1
  }
  if (n > 1) out.push(n)
  const res = []
  for (const p of out) {
    if (res.length && res[res.length - 1][0] === p) res[res.length - 1][1] += 1
    else res.push([p, 1])
  }
  return res
}

const result = computed(() => (input.value === '' ? null : analyse(input.value)))

function run() { /* computed 自动更新，这里保留为显式点击入口 */ }
function pickRandom() {
  // 随机取一个有代表性的数：70% 质数、30% 合数，方便验证两种路径
  if (Math.random() < 0.7) {
    const arr = Math.random() < 0.5 ? PRIMES_1000 : PRIMES_1900
    input.value = String(arr[Math.floor(Math.random() * arr.length)])
  } else {
    let c = 2
    while (isPrime(c)) c = 2 + Math.floor(Math.random() * 400)
    input.value = String(c)
  }
}
</script>

<style scoped>
.pn { padding: 4px 0 24px; color: var(--text-primary, #0b0c0c); }
.pn-sec { margin-bottom: 34px; }
.pn-h {
  font-size: 19px;
  font-weight: 700;
  color: #1d70b8;
  margin: 0 0 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--border, #d6d6d6);
}
.pn-sub { margin: 0 0 12px; font-size: 13px; color: var(--text-secondary, #505a5f); line-height: 1.6; }
.pn-note { margin: 10px 0 0; font-size: 12px; color: var(--text-secondary, #505a5f); line-height: 1.6; }

/* 判定方法 */
.pn-rule {
  border-left: 4px solid #1d70b8;
  background: var(--bg-body, #f3f2f1);
  padding: 12px 14px;
  margin-bottom: 14px;
}
.pn-rule-h { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.pn-rule p { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-secondary, #505a5f); }
.pn-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.pn-step { display: flex; gap: 10px; border: 1px solid var(--border, #d6d6d6); padding: 10px 12px; background: #fff; }
.pn-step-n {
  flex: none; width: 24px; height: 24px; background: #1d70b8; color: #fff;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.pn-step-t { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.pn-step-d { font-size: 13px; color: var(--text-secondary, #505a5f); line-height: 1.6; }
.pn-tipbox {
  margin-top: 14px; border: 1px solid #1d70b8; background: #fff; padding: 12px 14px;
}
.pn-tipbox--warn { border-color: #d4351c; }
.pn-tip-t { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.pn-tipbox ul, .pn-tipbox ol { margin: 0; padding-left: 22px; }
.pn-tipbox li { font-size: 13px; line-height: 1.8; color: var(--text-secondary, #505a5f); }
.pn-tipbox li b { color: var(--text-primary, #0b0c0c); }

/* 计算器 */
.pn-calc { border: 1px solid var(--border, #d6d6d6); padding: 12px 14px; background: #fff; }
.pn-calc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.pn-calc-label { font-size: 14px; font-weight: 700; }
.pn-input {
  width: 180px; border: 2px solid #0b0c0c; padding: 8px 12px;
  font-size: 16px; font-family: inherit; background: #fff;
}
.pn-input:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.pn-btn {
  border: 2px solid #1d70b8; background: #1d70b8; color: #fff;
  padding: 8px 18px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
  white-space: nowrap;
}
.pn-btn:hover { background: #003078; border-color: #003078; }
.pn-btn--ghost { background: #fff; color: #1d70b8; }
.pn-btn--ghost:hover { background: #f3f2f1; color: #003078; }
.pn-calc-hint { margin: 8px 0 0; font-size: 12px; color: var(--text-muted, #b1b4b6); }

.pn-out { margin-top: 14px; border: 1px solid var(--border, #d6d6d6); background: #fff; }
.pn-out-verdict {
  display: flex; align-items: baseline; gap: 12px; padding: 12px 14px;
  border-bottom: 1px solid var(--border, #d6d6d6);
}
.pn-out-verdict.ok { background: #e8f4ea; border-left: 5px solid #1d70b8; }
.pn-out-verdict.no { background: #fdf0ee; border-left: 5px solid #d4351c; }
.pn-out-big { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pn-out-tag { font-size: 17px; font-weight: 700; }
.pn-out-verdict.ok .pn-out-tag { color: #1d70b8; }
.pn-out-verdict.no .pn-out-tag { color: #d4351c; }
.pn-out-sec { padding: 12px 14px; border-bottom: 1px solid var(--border, #d6d6d6); }
.pn-out-sec:last-child { border-bottom: none; }
.pn-out-sec-t { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.pn-out-list { margin: 0; padding-left: 20px; }
.pn-out-list li { font-size: 13px; line-height: 1.8; color: var(--text-secondary, #505a5f); }
.pn-out-list li.bad { color: #a32d2d; }
.pn-mark { font-weight: 700; margin-right: 4px; }
.pn-mark.yes { color: #1d70b8; }
.pn-mark.no { color: #d4351c; }

.pn-trials { width: 100%; border-collapse: collapse; font-size: 13px; }
.pn-trials th, .pn-trials td {
  padding: 5px 8px; border-bottom: 1px solid var(--border, #d6d6d6); text-align: left;
}
.pn-trials th { background: #f3f2f1; font-weight: 700; }
.pn-trials .num { text-align: right; font-variant-numeric: tabular-nums; }
.pn-trials tr.hit { background: #fdf0ee; }
.pn-hit { color: #a32d2d; font-weight: 700; }
.pn-nodiv { color: var(--text-secondary, #505a5f); }
.pn-out-final { background: #f8f8f8; }
.pn-final { margin: 0 0 8px; font-size: 14px; line-height: 1.8; }
.pn-out-notes { margin: 0; padding-left: 20px; }
.pn-out-notes li { font-size: 13px; line-height: 1.8; color: var(--text-secondary, #505a5f); }

/* 质数表 */
.pn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
  gap: 3px;
}
.pn-cell {
  display: flex; align-items: center; justify-content: center;
  padding: 5px 2px; font-size: 13px;
  border: 1px solid #e8e8e8; background: #fff;
  color: var(--text-muted, #b1b4b6);
  font-variant-numeric: tabular-nums;
}
.pn-cell.p { background: #1d70b8; color: #fff; border-color: #1d70b8; font-weight: 700; }

.pn-years { margin-top: 14px; }
.pn-years-t { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.pn-years-list { display: flex; flex-wrap: wrap; gap: 6px; }
.pn-year {
  border: 1px solid #e8e8e8; background: #fff; padding: 4px 8px;
  font-size: 13px; font-variant-numeric: tabular-nums; color: var(--text-muted, #b1b4b6);
  display: inline-flex; align-items: baseline; gap: 5px;
}
.pn-year i { font-style: normal; font-size: 11px; }
.pn-year.p { background: #1d70b8; color: #fff; border-color: #1d70b8; font-weight: 700; }
.pn-year.p i { color: #d6e9f8; }

/* 陷阱表 */
.pn-traps { width: 100%; border-collapse: collapse; font-size: 13px; }
.pn-traps th, .pn-traps td {
  padding: 7px 10px; border-bottom: 1px solid var(--border, #d6d6d6); text-align: left;
}
.pn-traps th { background: #f3f2f1; font-weight: 700; }
.pn-traps .num { text-align: right; font-variant-numeric: tabular-nums; }
.pn-trap-n { font-weight: 700; }
.pn-trap-look { color: var(--text-secondary, #505a5f); }
.pn-trap-f { font-weight: 700; color: #a32d2d; }

@media (max-width: 768px) {
  .pn-h { font-size: 17px; }
  .pn-out-big { font-size: 24px; }
  .pn-grid { grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); }
  .pn-cell { font-size: 12px; padding: 4px 1px; }
  .pn-input { width: 130px; }
}
</style>
