/**
 * EdgeOne Pages Function — Supabase 同域代理
 * 路由：/api/sb-proxy?path=<目标路径及查询参数>
 *
 * 作用：前端把对 *.supabase.co 的请求改写为同源 /api/sb-proxy?path=...，
 *       由本函数转发到 Supabase 新加坡节点（经 EdgeOne 优化骨干网），
 *       绕开浏览器跨境直连的不稳定，提升登录 / 查库速度。
 *
 * 备案边界：dachu.me 为 EdgeOne overseas 海外节点，本函数亦运行在海外，
 *          转发目标 Supabase 新加坡同样在境外 —— 全链路无中国大陆境内接入点，不触发 ICP 备案。
 *
 * 安全性：不存储任何密钥。前端请求自带的 apikey / Authorization 头原样透传。
 *        仅允许转发到本项目固定 Supabase 域名的相对路径，禁止绝对 URL / 跨域转发。
 */

const SUPABASE_BASE = 'https://tqhtegazxykkqfcpejky.supabase.co'
// EdgeOne Pages 函数平台上限约 15-17s（实测）。我们必须在被平台强杀前返回自己的 502 JSON，
// 否则 supabase-js 拿到 HTML 无法解析 → error.message 空 → UI 看不到真实错误。
// 因此用 Promise.race 形式：超时立即拒绝、不等底层 fetch 收尾；并随即 abort 底层 fetch 以释放资源。
// 同时不允许任何重试 —— 一次慢就是真慢，重试只会把总耗时推到 30s+，必触发平台强杀。
// 原 8000ms 对「EdgeOne(海外)→Supabase 新加坡」慢链路过于苛刻：连接/握手常需 3-8s，
// 一旦超过 8s 即被我们主动 502，前端表现为「暂无数据」。平台函数上限约 15-17s，
// 14s 是安全天花板 —— 单次慢查询最多等到 14s，既不误杀、也不触发平台强杀。
const UPSTREAM_TIMEOUT_MS = 14000
const RETRY_ON_NETWORK_ERROR = 0

// 不应转发给上游的逐跳（hop-by-hop）及代理相关头
const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
  'content-length', // 交给 fetch 按实际 body 重新计算
  'te',
  'trailer',
])

function buildUpstreamHeaders(incoming) {
  const headers = new Headers()
  for (const [key, value] of incoming.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    // 去掉 accept-encoding：让上游返回未压缩 JSON，避免经 EdgeOne 二次压缩导致正文损坏
    if (lower === 'accept-encoding') continue
    // 去掉浏览器 / 边缘网关注入的转发类伪头，避免干扰上游
    if (lower.startsWith('x-forwarded') || lower.startsWith('x-real-ip') || lower.startsWith('cf-')) continue
    headers.set(key, value)
  }
  return headers
}

async function proxyOnce(targetUrl, method, headers, body) {
  // 用 Promise.race 而非 fetch abort：EdgeOne 运行时下 fetch 的 AbortSignal
  // 似乎不会真正取消底层连接（实测 8s abort 后仍跑到 15s+ 被平台强杀 HTML 504）。
  // 改用 race：超时瞬间 resolve 一个哨兵��我们立刻返回干净 jsonError(502) 并 best-effort abort。
  // 这样函数在 UPSTREAM_TIMEOUT_MS 内就能返回，不被平台强杀。
  const controller = new AbortController()
  let timer
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve('__timeout__'), UPSTREAM_TIMEOUT_MS)
  })
  const fetchPromise = fetch(targetUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
    signal: controller.signal,
    redirect: 'follow',
  })
  const winner = await Promise.race([fetchPromise, timeoutPromise])
  clearTimeout(timer)
  if (winner === '__timeout__') {
    controller.abort() // best-effort；race 已胜，handler 立即返回
    return jsonError(`upstream timeout after ${UPSTREAM_TIMEOUT_MS}ms`, 502)
  }
  return winner
}

function buildResponse(upstream, req) {
  // 过滤响应中的 hop-by-hop 头，避免下游浏览器误用
  const respHeaders = new Headers()
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    if (lower.startsWith('cf-')) continue
    respHeaders.set(key, value)
  }
  // 补齐 CORS 头（覆盖式 set：上游若已带 ACAO:* 也只是覆盖同值，不会重复）
  for (const [k, v] of Object.entries(corsHeaders(req))) respHeaders.set(k, v)
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  })
}

function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg, proxy: 'sb-proxy' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── CORS（2026-10-11 新增）─────────────────────────────────────────────
// 背景：www.dachu.me 上线后页面 origin 与 dachu.me 不同源，所有经 sb-proxy 的
// 请求变跨域。Supabase 网关对 /rest/v1 的 OPTIONS 预检会回 200+CORS 头，
// 但对 /functions/v1 的 OPTIONS（预检不带 apikey）回 401 且**无任何 CORS 头**
// → 浏览器拦截后续 POST，前端表现为 "Failed to fetch"（删除用户即此症状）。
// 修法：① OPTIONS 预检在边缘直接应答，不转发上游；
//       ② 所有响应补齐 CORS 头（覆盖式 set，避免与上游头重复）。
function corsHeaders(req) {
  const reqHeaders = req.headers.get('access-control-request-headers')
    || 'authorization,content-type,apikey,x-client-info,prefer,range,accept'
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': reqHeaders,
    'Access-Control-Max-Age': '86400',
  }
}

export async function onRequest(context) {
  const req = context.request
  const url = new URL(req.url)
  const targetPath = url.searchParams.get('path')

  // 预检：边缘直接应答（不校验 path、不回源）
  if (req.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (!targetPath) {
    return jsonError('missing path query param', 400)
  }

  // 防目录穿越 / 越权：仅允许转发到本项目 Supabase 的相对路径
  if (
    targetPath.startsWith('http://') ||
    targetPath.startsWith('https://') ||
    targetPath.startsWith('//') ||
    targetPath.startsWith('../')
  ) {
    return jsonError('absolute or relative traversal url not allowed', 400)
  }

  const targetUrl = SUPABASE_BASE + (targetPath.startsWith('/') ? targetPath : '/' + targetPath)
  const method = req.method.toUpperCase()
  const headers = buildUpstreamHeaders(req.headers)

  // 读取 body（仅一次），重试时复用同一份 ArrayBuffer
  let body = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  let lastErr = null
  for (let attempt = 0; attempt <= RETRY_ON_NETWORK_ERROR; attempt++) {
    try {
      const upstream = await proxyOnce(targetUrl, method, headers, body)
      return buildResponse(upstream, req)
    } catch (err) {
      lastErr = err
      // 仅在网络层错误（超时 / 连接失败）时重试；4xx/5xx 不会进入这里
      if (attempt < RETRY_ON_NETWORK_ERROR) {
        await new Promise((r) => setTimeout(r, 300))
        continue
      }
    }
  }

  const msg =
    lastErr && lastErr.name === 'AbortError'
      ? `upstream timeout after ${UPSTREAM_TIMEOUT_MS}ms`
      : (lastErr && lastErr.message) || 'upstream fetch failed'
  const errResp = jsonError(msg, 502)
  for (const [k, v] of Object.entries(corsHeaders(req))) errResp.headers.set(k, v)
  return errResp
}
