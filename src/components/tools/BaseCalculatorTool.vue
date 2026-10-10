<template>
  <div class="bc-calc">
    <p class="bc-calc-intro">
      先选进制，再在输入框写算式（支持 <code>+ - * / ( )</code> 与整数次幂 <code>^</code>），
      结果按所选进制输出。例：二进制输入 <code>1010 + 1011</code> → <code>10101</code>；
      十六进制 <code>FF * 2</code> → <code>1FE</code>。支持小数，除法给出精确分数进制展开。
    </p>

    <div class="bc-calc-base">
      <span class="bc-label">进制</span>
      <div class="bc-base-picks">
        <button
          v-for="b in quickBases"
          :key="b"
          type="button"
          :class="['bc-base-btn', { active: base === b }]"
          @click="base = b"
        >{{ b }}</button>
        <label class="bc-base-custom">
          自定义
          <input type="number" min="2" max="36" v-model.number="base" />
        </label>
      </div>
      <span class="bc-base-hint">
        当前：{{ base }} 进制（可用符号 0-9{{ base > 10 ? '、a-' + DIGITS[base - 1] : '' }}）
      </span>
    </div>

    <label class="bc-block">
      <span class="bc-label">算式（{{ base }} 进制）</span>
      <textarea
        v-model="expr"
        class="bc-input bc-expr"
        rows="3"
        placeholder="例如：1010 + 1011   或   FF * 2   或   (1A + 2) / 3"
      ></textarea>
    </label>

    <div v-if="error" class="bc-error">{{ error }}</div>

    <label class="bc-block">
      <span class="bc-label">结果（{{ base }} 进制）</span>
      <div class="bc-result-wrap">
        <textarea
          :value="result"
          class="bc-input bc-output"
          rows="3"
          readonly
          placeholder="计算结果将显示在这里"
        ></textarea>
        <button
          v-if="result"
          class="bc-copy"
          type="button"
          @click="copyResult"
        >{{ copied ? '已复制' : '复制' }}</button>
      </div>
    </label>

    <p v-if="decimalText" class="bc-decimal">十进制参考值：{{ decimalText }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 进制计算器：在选定进制下求值算式，结果仍以该进制输出。
// 复用「有理数」思路（分子/分母均为 BigInt）保证整数与小数精确，无浮点误差。
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const MAX_BASE = 36

const base = ref(10)
const expr = ref('')
const copied = ref(false)
const quickBases = [2, 8, 10, 16]

function charToDigit(ch) {
  return DIGITS.indexOf(ch.toLowerCase())
}

function gcd(a, b) {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a || 1n
}

// 约分，符号统一放分子
function reduce(num, den) {
  if (den === 0n) throw new Error('分母为零')
  if (den < 0n) {
    num = -num
    den = -den
  }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

// 解析单个数字串（base ≤ 36）为有理数
function parseRational(value, b) {
  let s = value.trim()
  if (!s) throw new Error('空数值')
  let negative = false
  if (s[0] === '-') {
    negative = true
    s = s.slice(1).trim()
  } else if (s[0] === '+') {
    s = s.slice(1).trim()
  }
  const dot = s.indexOf('.')
  if (dot !== -1 && s.indexOf('.', dot + 1) !== -1) {
    throw new Error('只能包含一个小数点')
  }
  const intStr = dot === -1 ? s : s.slice(0, dot)
  const fracStr = dot === -1 ? '' : s.slice(dot + 1)
  const B = BigInt(b)
  let intPart = 0n
  for (const ch of intStr) {
    if (ch === ' ') continue
    const d = charToDigit(ch)
    if (d === -1 || d >= b) throw new Error(`"${ch}" 不是合法的 ${b} 进制符号`)
    intPart = intPart * B + BigInt(d)
  }
  let fracNum = 0n
  let fracDen = 1n
  if (fracStr) {
    for (const ch of fracStr) {
      if (ch === ' ') continue
      const d = charToDigit(ch)
      if (d === -1 || d >= b) throw new Error(`"${ch}" 不是合法的 ${b} 进制符号`)
      fracNum = fracNum * B + BigInt(d)
      fracDen = fracDen * B
    }
  }
  let numerator = intPart * fracDen + fracNum
  if (negative) numerator = -numerator
  return reduce(numerator, fracDen)
}

function formatInt(value, b) {
  if (value === 0n) return '0'
  const B = BigInt(b)
  const digits = []
  let v = value
  while (v > 0n) {
    digits.push(DIGITS[Number(v % B)])
    v = v / B
  }
  return digits.reverse().join('')
}

// 有理数 → 指定进制的字符串（整数/小数部分，分数截断以 … 标记）
function toBase({ num, den }, b) {
  if (num === 0n) return '0'
  const negative = num < 0n
  let n = negative ? -num : num
  const d = den
  const B = BigInt(b)
  const intPart = n / d
  let rem = n % d
  const sign = negative ? '-' : ''
  let result = sign + formatInt(intPart, b)
  if (rem === 0n) return result
  const maxFrac = 32
  const frac = []
  let i = 0
  while (rem !== 0n && i < maxFrac) {
    rem = rem * B
    const digit = rem / d
    rem = rem % d
    frac.push(DIGITS[Number(digit)])
    i++
  }
  const truncated = rem !== 0n ? '…' : ''
  return `${result}.${frac.join('')}${truncated}`
}

// ===== 算式解析：tokenizer + 递归下降 =====
function tokenize(input, b) {
  const tokens = []
  let i = 0
  const isNumChar = (ch) => /[0-9a-zA-Z]/.test(ch)
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if ('+-*/()^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    if (isNumChar(ch) || ch === '.') {
      let j = i
      let dotCount = 0
      while (j < input.length && (isNumChar(input[j]) || input[j] === '.')) {
        if (input[j] === '.') dotCount++
        j++
      }
      const numStr = input.slice(i, j)
      if (dotCount > 1) throw new Error(`非法数字：${numStr}`)
      for (const c of numStr) {
        if (c === '.') continue
        const d = charToDigit(c)
        if (d === -1 || d >= b) throw new Error(`"${c}" 不是合法的 ${b} 进制符号`)
      }
      tokens.push({ type: 'num', value: numStr })
      i = j
      continue
    }
    throw new Error(`无法识别的字符："${ch}"`)
  }
  return tokens
}

function parseExpr(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseExpression() {
    let node = parseTerm()
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value
      node = { type: 'binop', op, left: node, right: parseTerm() }
    }
    return node
  }
  function parseTerm() {
    let node = parseFactor()
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = next().value
      node = { type: 'binop', op, left: node, right: parseFactor() }
    }
    return node
  }
  function parseFactor() {
    let node = parsePrimary()
    while (peek() && peek().type === 'op' && peek().value === '^') {
      next()
      node = { type: 'binop', op: '^', left: node, right: parseFactor() } // 右结合
    }
    return node
  }
  function parsePrimary() {
    const t = peek()
    if (!t) throw new Error('算式不完整')
    if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
      const op = next().value
      return { type: 'unary', op, operand: parsePrimary() }
    }
    if (t.type === 'op' && t.value === '(') {
      next()
      const node = parseExpression()
      if (!peek() || peek().value !== ')') throw new Error('括号不匹配')
      next()
      return node
    }
    if (t.type === 'num') {
      next()
      return { type: 'num', value: t.value }
    }
    throw new Error('意外的符号')
  }

  const ast = parseExpression()
  if (pos !== tokens.length) throw new Error('算式有多余内容')
  return ast
}

function evalNode(node, b) {
  if (node.type === 'num') return parseRational(node.value, b)
  if (node.type === 'unary') {
    const v = evalNode(node.operand, b)
    return node.op === '-' ? { num: -v.num, den: v.den } : v
  }
  if (node.type === 'binop') {
    const l = evalNode(node.left, b)
    const r = evalNode(node.right, b)
    switch (node.op) {
      case '+':
        return reduce(l.num * r.den + r.num * l.den, l.den * r.den)
      case '-':
        return reduce(l.num * r.den - r.num * l.den, l.den * r.den)
      case '*':
        return reduce(l.num * r.num, l.den * r.den)
      case '/':
        if (r.num === 0n) throw new Error('除数不能为零')
        return reduce(l.num * r.den, l.den * r.num)
      case '^': {
        if (r.den !== 1n) throw new Error('幂运算的指数必须为整数')
        const e = r.num
        if (e < 0n) {
          if (l.num === 0n) throw new Error('0 的负次幂无定义')
          return reduce(l.den ** -e, l.num ** -e)
        }
        return reduce(l.num ** e, l.den ** e)
      }
    }
  }
  throw new Error('无法计算')
}

// 单一求值入口：避免重复计算（result 与 decimalText 共用）
const evaluated = computed(() => {
  const b = base.value
  const e = expr.value.trim()
  if (!e) return { rational: null, decimal: '', error: '' }
  if (b < 2 || b > MAX_BASE) return { rational: null, decimal: '', error: `进制需为 2-${MAX_BASE}` }
  try {
    const tokens = tokenize(e, b)
    if (tokens.length === 0) return { rational: null, decimal: '', error: '' }
    const ast = parseExpr(tokens)
    const rational = evalNode(ast, b)
    return { rational, decimal: toBase(rational, 10), error: '' }
  } catch (err) {
    return { rational: null, decimal: '', error: err.message || '算式有误' }
  }
})

const result = computed(() => (evaluated.value.rational ? toBase(evaluated.value.rational, base.value) : ''))
const decimalText = computed(() => evaluated.value.decimal)
const error = computed(() => evaluated.value.error)

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (e) {
    const el = document.querySelector('.bc-output')
    if (el) {
      el.select()
      document.execCommand('copy')
      copied.value = true
      setTimeout(() => (copied.value = false), 1500)
    }
  }
}
</script>

<style scoped>
.bc-calc {
  padding: 4px 0;
}
.bc-calc-intro {
  font-size: 13px;
  color: #505a5f;
  line-height: 1.6;
  margin: 0 0 16px;
}
.bc-calc-intro code {
  background: #f3f2f1;
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 12px;
}
.bc-calc-base {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.bc-base-picks {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.bc-base-btn {
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 700;
  border: 2px solid #0b0c0c;
  background: #fff;
  color: #0b0c0c;
  cursor: pointer;
}
.bc-base-btn.active {
  background: #1d70b8;
  color: #fff;
  border-color: #1d70b8;
}
.bc-base-custom {
  font-size: 13px;
  color: #505a5f;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.bc-base-custom input {
  width: 56px;
  padding: 5px 8px;
  border: 2px solid #0b0c0c;
  font-size: 14px;
  font-family: inherit;
}
.bc-base-hint {
  font-size: 13px;
  color: #505a5f;
  flex-basis: 100%;
}
.bc-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
}
.bc-block {
  display: block;
  margin-bottom: 18px;
}
.bc-block .bc-label {
  display: block;
  margin-bottom: 6px;
}
.bc-input {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid #0b0c0c;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--text-primary, #0b0c0c);
  background: #fff;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
}
.bc-input:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
}
.bc-expr {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.5px;
}
.bc-result-wrap {
  position: relative;
}
.bc-output {
  padding-right: 66px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.5px;
}
.bc-copy {
  position: absolute;
  right: 8px;
  top: 8px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: #1d70b8;
  color: #fff;
  cursor: pointer;
}
.bc-copy:hover {
  background: #003078;
}
.bc-error {
  color: #d4351c;
  font-size: 14px;
  margin: -8px 0 14px;
  line-height: 1.5;
}
.bc-decimal {
  font-size: 13px;
  color: #505a5f;
  margin: -8px 0 4px;
}
</style>
