// 页面宽度偏好：首页下拉框选择，localStorage 持久化，写入 :root 的 --pc-max-width。
// 全站容器（.pc-main / .govuk-width-container / 各页根容器 / header）均引用该变量，改一处全站联动。
import { ref } from 'vue'

const KEY = 'allfund_pc_width'
const DEFAULT = '960' // gov.uk 标准宽度

// 可选项（值 -> 标签）
export const PAGE_WIDTH_OPTIONS = [
  { value: '960', label: '960px（gov.uk）' },
  { value: '1000', label: '1000px（新浪 / 搜狐）' },
  { value: '1200', label: '1200px（腾讯 / 网易）' },
  { value: '1440', label: '1440px（宽屏门户）' },
  { value: 'full', label: '全宽（满屏）' },
]

const current = ref(DEFAULT)

function toCssValue(v) {
  if (v === 'full') return '100%'
  const px = parseInt(v, 10)
  return Number.isFinite(px) && px > 0 ? px + 'px' : '100%'
}

function apply(v) {
  const val = PAGE_WIDTH_OPTIONS.some((o) => o.value === v) ? v : DEFAULT
  current.value = val
  document.documentElement.style.setProperty('--pc-max-width', toCssValue(val))
}

/** 设置并持久化页面宽度 */
export function applyPageWidth(v) {
  apply(v)
  try {
    localStorage.setItem(KEY, current.value)
  } catch (e) {
    /* 隐私模式等忽略 */
  }
}

/** 应用启动时调用：恢复上次保存的宽度 */
export function initPageWidth() {
  let saved = DEFAULT
  try {
    saved = localStorage.getItem(KEY) || DEFAULT
  } catch (e) {
    /* ignore */
  }
  apply(saved)
}

/** 组件内使用：拿到当前值与设置方法 */
export function usePageWidth() {
  return { current, applyPageWidth }
}
