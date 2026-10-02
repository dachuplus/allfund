<template>
  <div class="bc-tool">
    <div class="bc-row">
      <label class="bc-field">
        <span class="bc-label">源进制</span>
        <select v-model.number="sourceBase" class="bc-select">
          <option v-for="n in baseOptions" :key="n" :value="n">{{ n }} 进制</option>
        </select>
      </label>
      <button class="bc-swap" type="button" @click="swap" title="交换源与目标进制">⇄</button>
      <label class="bc-field">
        <span class="bc-label">目标进制</span>
        <select v-model.number="targetBase" class="bc-select">
          <option v-for="n in baseOptions" :key="n" :value="n">{{ n }} 进制</option>
        </select>
      </label>
    </div>

    <label class="bc-block">
      <span class="bc-label">输入值（{{ sourceHint }}）</span>
      <textarea
        v-model="inputValue"
        class="bc-input"
        rows="3"
        placeholder="在此输入待转换的数值"
      ></textarea>
    </label>

    <div v-if="error" class="bc-error">{{ error }}</div>

    <label class="bc-block">
      <span class="bc-label">转换结果（{{ targetHint }}）</span>
      <div class="bc-result-wrap">
        <textarea
          :value="outputValue"
          class="bc-input bc-output"
          rows="3"
          readonly
          placeholder="转换结果将显示在这里"
        ></textarea>
        <button
          v-if="outputValue"
          class="bc-copy"
          type="button"
          @click="copyResult"
        >{{ copied ? '已复制' : '复制' }}</button>
      </div>
    </label>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const baseOptions = Array.from({ length: 99 }, (_, i) => i + 2)
const sourceBase = ref(10)
const targetBase = ref(2)
const inputValue = ref('')
const copied = ref(false)

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

const sourceHint = computed(() =>
  sourceBase.value <= 36 ? `支持 0-9${sourceBase.value > 10 ? '、a-' + DIGITS[sourceBase.value - 1] : ''}` : '每位用空格分隔的十进制数（0-' + (sourceBase.value - 1) + '）'
)
const targetHint = computed(() =>
  targetBase.value <= 36 ? '标准进制表示' : '每位用空格分隔的十进制数'
)

function charToDigit(ch) {
  const c = ch.toLowerCase()
  const idx = DIGITS.indexOf(c)
  return idx
}

function parseInput(value, base) {
  const s = value.trim()
  if (!s) return 0n
  if (base <= 36) {
    let result = 0n
    for (const ch of s) {
      if (ch === ' ') continue
      const d = charToDigit(ch)
      if (d === -1 || d >= base) {
        throw new Error(`字符 "${ch}" 不是合法的 ${base} 进制符号`)
      }
      result = result * BigInt(base) + BigInt(d)
    }
    return result
  }
  // 37+ 进制：每位用空格分隔的十进制数
  const parts = s.split(/\s+/).filter(Boolean)
  if (!parts.length) return 0n
  let result = 0n
  for (const p of parts) {
    const d = BigInt(p)
    if (d < 0n || d >= BigInt(base)) {
      throw new Error(`位值 ${p} 超出 ${base} 进制范围（0-${base - 1}）`)
    }
    result = result * BigInt(base) + d
  }
  return result
}

function formatOutput(value, base) {
  if (base <= 36) {
    if (value === 0n) return '0'
    let negative = false
    if (value < 0n) {
      negative = true
      value = -value
    }
    const b = BigInt(base)
    const digits = []
    while (value > 0n) {
      digits.push(DIGITS[Number(value % b)])
      value = value / b
    }
    return (negative ? '-' : '') + digits.reverse().join('')
  }
  // 37+ 进制：每位用空格分隔的十进制数
  if (value === 0n) return '0'
  let negative = false
  if (value < 0n) {
    negative = true
    value = -value
  }
  const b = BigInt(base)
  const digits = []
  while (value > 0n) {
    digits.push(String(value % b))
    value = value / b
  }
  return (negative ? '- ' : '') + digits.reverse().join(' ')
}

const error = computed(() => {
  try {
    parseInput(inputValue.value, sourceBase.value)
    return ''
  } catch (e) {
    return e.message || '输入格式有误'
  }
})

const outputValue = computed(() => {
  try {
    const val = parseInput(inputValue.value, sourceBase.value)
    return formatOutput(val, targetBase.value)
  } catch (e) {
    return ''
  }
})

function swap() {
  const tmp = sourceBase.value
  sourceBase.value = targetBase.value
  targetBase.value = tmp
}

async function copyResult() {
  if (!outputValue.value) return
  try {
    await navigator.clipboard.writeText(outputValue.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (e) {
    // 降级：选中文本
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
.bc-tool {
  padding: 4px 0;
}
.bc-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.bc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 120px;
}
.bc-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
}
.bc-select,
.bc-input {
  border: 2px solid #0b0c0c;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--text-primary, #0b0c0c);
  background: #fff;
  font-family: inherit;
}
.bc-select {
  appearance: auto;
  cursor: pointer;
}
.bc-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  line-height: 1.5;
}
.bc-input:focus,
.bc-select:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
}
.bc-swap {
  flex: none;
  align-self: flex-end;
  margin-bottom: 2px;
  padding: 8px 12px;
  font-size: 18px;
  line-height: 1;
  border: 2px solid #0b0c0c;
  background: #fff;
  color: #1d70b8;
  cursor: pointer;
}
.bc-swap:hover {
  background: #1d70b8;
  color: #fff;
}
.bc-block {
  display: block;
  margin-bottom: 18px;
}
.bc-block .bc-label {
  display: block;
  margin-bottom: 6px;
}
.bc-result-wrap {
  position: relative;
}
.bc-output {
  padding-right: 66px;
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
.bc-copy:hover { background: #003078; }
.bc-error {
  color: #d4351c;
  font-size: 14px;
  margin: -8px 0 14px;
  line-height: 1.5;
}
</style>
