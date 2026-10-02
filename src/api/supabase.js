/**
 * Supabase 客户端配置
 * 在 .env 文件中填写你的 Supabase Project URL 和 anon key
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * 带超时的 fetch：Supabase 新加坡节点偶发延迟高（实测 auth 冷启动 7~20s、REST 偶发超时），
 * 给每个请求套 45s 上限，超时即 Abort，避免前端无限"处理中…"。
 *
 * 关键兼容点：supabase-js v2 内部会给 fetch 传入自己的 AbortSignal（用于其自身的取消/重试逻辑）。
 * 绝不能把它的 signal 直接透传给 fetch —— 会导致 supabase 内部响应解析异常（返回空 error {}、耗时翻倍）。
 * 正确做法：始终用我们自己的 controller.signal 调 fetch，并把 supabase 的 signal 关联过来
 * （它一 abort 我们也 abort），这样既保留超时保护，又不破坏 supabase 内部流程。
 *
 * **认证端点双路并行 (2026-09-03)**：/auth/v1/* 同时打到「浏览器直连 Supabase」和
 * 「sb-proxy (EdgeOne overseas)」，谁先返回响应用谁的——因为 EdgeOne 出口到 Supabase Singapore
 * 的骨干网当前持续挂掉，但浏览器直连也可能偶发慢，并行 race 反而最稳。其余端点不变。
 */
const FETCH_TIMEOUT_MS = 45000
const baseFetch = (typeof fetch !== 'undefined' ? fetch : (...a) => Promise.reject(new Error('no fetch')))

/**
 * 同域代理改写：把对本项目 Supabase 域名（*.supabase.co）的 fetch 重写为同源
 * /api/sb-proxy?path=<原路径+查询>，由 EdgeOne 海外节点函数转发到 Supabase 新加坡，
 * 绕开浏览器跨境直连的不稳定。其余域名（如实时宏观数据 macro-data 函数、第三方源）不改写。
 *
 * 用 query 携带目标路径，避免多级路由匹配问题；path 值整体 encodeURIComponent。
 */
const SUPABASE_HOST = 'tqhtegazxykkqfcpejky.supabase.co'
const PROXY_BASE = 'https://dachu.me/api/sb-proxy'

/**
 * ⚠️ EdgeOne CDN 对带 Range 头的请求会在边缘层直接返回 416
 * （响应头 EO-Cache-Status: Return Directly，请求根本到不了 sb-proxy 函数），
 * 导致 supabase-js 的 .range(from,to) 经代理一律失败。
 * 这里把 Range 头等价改写成 PostgREST 的 offset/limit 查询参数，并删掉 Range 头。
 * 返回 { targetPath, headers }（headers 为原对象，已就地删除 Range）。
 */
function convertRangeToOffsetLimit(targetPath, headers) {
  let rangeVal = null
  try {
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      rangeVal = headers.get('range')
    } else if (Array.isArray(headers)) {
      const p = headers.find(([k]) => String(k).toLowerCase() === 'range')
      rangeVal = p ? p[1] : null
    } else if (headers && typeof headers === 'object') {
      rangeVal = headers.range || headers.Range || null
    }
  } catch (_) {
    rangeVal = null
  }
  if (!rangeVal) return { targetPath, headers }

  // 删除 Range / Range-Unit，避免 CDN 再次判 416
  try {
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      headers.delete('range')
      headers.delete('range-unit')
    } else if (Array.isArray(headers)) {
      for (let i = headers.length - 1; i >= 0; i--) {
        const k = String(headers[i][0] || '').toLowerCase()
        if (k === 'range' || k === 'range-unit') headers.splice(i, 1)
      }
    } else if (headers && typeof headers === 'object') {
      delete headers.range
      delete headers.Range
      delete headers['range-unit']
      delete headers['Range-Unit']
    }
  } catch (_) { /* 只读 headers 时忽略 */ }

  const m = /(?:items=)?\s*(\d+)\s*-\s*(\d*)/.exec(String(rangeVal).trim())
  if (!m) return { targetPath, headers }
  const from = parseInt(m[1], 10)
  const toStr = m[2]
  const to = toStr === '' || toStr == null ? null : parseInt(toStr, 10)
  if (Number.isNaN(from)) return { targetPath, headers }
  const [p, qs] = targetPath.split('?')
  const usp = new URLSearchParams(qs || '')
  usp.set('offset', String(from))
  usp.set('limit', String(to === null ? 1 : Math.max(0, to - from + 1)))
  return { targetPath: p + '?' + usp.toString(), headers }
}

function rewriteToProxy(input, init) {
  let str
  if (typeof input === 'string') str = input
  else if (input && typeof input.url === 'string') str = input.url
  else return input
  if (str.indexOf(SUPABASE_HOST) === -1) return input
  let u
  try {
    u = new URL(str)
  } catch (_) {
    return input
  }
  let targetPath = u.pathname + u.search
  if (init && init.headers) {
    targetPath = convertRangeToOffsetLimit(targetPath, init.headers).targetPath
  }
  return `${PROXY_BASE}?path=${encodeURIComponent(targetPath)}`
}

/**
 * 供直接 fetch Supabase 端点（如各 Edge Function）的前端代码复用，
 * 把 *.supabase.co URL 改写成同源 /api/sb-proxy?path=...。
 */
export const rewriteSupabaseUrl = rewriteToProxy

/**
 * 解析 fetch 入参为最终 URL 字符串（统一处理 string / Request）。
 */
function urlOf(input) {
  if (typeof input === 'string') return input
  if (input && typeof input.url === 'string') return input.url
  return ''
}

/**
 * 对 /auth/v1/* 同时打到「直接 Supabase」和「sb-proxy」两条路，
 * 谁先返回 (resolve) 响应用谁的，另一条请求会在浏览器层继续跑完（fetch 无法中途取消），
 * 但 Promise.any 会忽略它的结果。
 *
 * 两条路的 fetch 共享同一个 AbortSignal：上游 controller 超时或被 abort 时两条同时终止。
 */
function raceAuthFetch(input, init, signal) {
  const directUrl = urlOf(input)
  const proxyUrl = rewriteToProxy(input)
  const raceInit = { ...init, signal }
  if (!proxyUrl || proxyUrl === directUrl) return baseFetch(directUrl || input, raceInit)
  // 双路并行：direct + proxy
  return Promise.any([
    baseFetch(directUrl, raceInit),
    baseFetch(proxyUrl, raceInit),
  ])
}

function timeoutFetch(input, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  // 若 supabase 自带 signal，把它和我们的 controller 关联：它取消时我们也取消
  if (init.signal && typeof init.signal.addEventListener === 'function') {
    init.signal.addEventListener('abort', () => controller.abort())
  }
  // 始终用我们自己的 signal 调底层 fetch（绝不用 supabase 的 signal 直接透传）
  const str = urlOf(input)
  let p
  if (str.indexOf('/auth/v1/') !== -1) {
    // 认证端点：浏览器直连 + sb-proxy 同时打，谁先返回用谁
    p = raceAuthFetch(input, init, controller.signal)
  } else {
    // 其他端点：继续走代理（沿用之前的优化链路，等 EdgeOne→Supabase 骨干网恢复）
    // 传 init 以便把 supabase-js 的 Range 头改写为 offset/limit（CDN 会拦截 Range 返 416）
    const rewritten = rewriteToProxy(input, init)
    p = baseFetch(rewritten, { ...init, signal: controller.signal })
  }
  return p.finally(() => clearTimeout(timer))
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: timeoutFetch },
    })
  : null

/**
 * 直连 Supabase 客户端：不走 /api/sb-proxy 代理，用于只读查询。
 * 背景：sb-proxy 近期对 GET /rest/v1/* 返回 502，导致股票评分等页面拿不到数据；
 * 浏览器直连新加坡 PostgREST 实测可达，读取端点用直连更稳。
 */
function directTimeoutFetch(input, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  if (init.signal && typeof init.signal.addEventListener === 'function') {
    init.signal.addEventListener('abort', () => controller.abort())
  }
  return baseFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export const supabaseDirect = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: directTimeoutFetch },
    })
  : null

export const isSupabaseReady = () => !!supabase
export const isSupabaseDirectReady = () => !!supabaseDirect

/**
 * 暴露 anon key（供直接 fetch Edge Function 时作为 apikey header 用）
 */
export const getSupabaseAnonKey = () => SUPABASE_ANON_KEY
