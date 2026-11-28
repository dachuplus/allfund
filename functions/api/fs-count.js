/**
 * EdgeOne Pages Function — 基金评分「精确筛选总数」
 * 路由：/api/fs-count?path=<PostgREST 相对路径及查询参数>
 *
 * 背景（2026-11-09）：
 *  - EdgeOne CDN 对入站携带 `Prefer: count=exact` 的请求一律 502；
 *  - 让 sb-proxy 在服务端代加该头后，上游 PostgREST 返回 206 Partial Content，
 *    边缘层仍会把整个响应吞成 502 HTML（改写成 200 也无效）。
 * 因此本函数在服务端自行向上游发起 HEAD + Prefer: count=exact（出站不受 CDN 入站规则
 * 限制），只把从 content-range 解析出的总数以普通 200 JSON 返回浏览器。
 *
 * 前端传来的 path 由 supabase-js 查询构造器生成，含与列表完全相同的筛选条件，
 * 因此「筛选结果」总数与列表口径 100% 一致，且不受 pageSize 限制。
 *
 * 安全：仅允许 /rest/v1/ 相对路径，禁止绝对 URL / 目录穿越；apikey 由前端透传。
 *
 * 2026-11-28 防护：
 *  - 已知 SEO bot UA（AhrefsBot 等）直接在边缘 403，不回源；
 *  - 相同筛选条件的结果缓存 5 分钟，避免爬虫遍历分页时反复全表累加；
 *  - 计数算法改为「1 行探针 + 倍增/二分」：原来最多 8×8=64 次 ×1000 行
 *    （约 6.4 万行传输 + 64 个深分页查询），现在约 32 次 ×1 行。
 *    EdgeOne 仍禁 Prefer: count=exact / 206，故不能用服务端 HEAD 计数。
 */

import { botGuard, ipRateLimit } from './_bot_guard.js'

const SUPABASE_BASE = 'https://tqhtegazxykkqfcpejky.supabase.co'
const UPSTREAM_TIMEOUT_MS = 14000
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 500
const COUNT_CACHE = new Map()

function cacheGet(key) {
  const hit = COUNT_CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.t > CACHE_TTL_MS) { COUNT_CACHE.delete(key); return null }
  return hit.v
}

function cacheSet(key, value) {
  if (COUNT_CACHE.size >= CACHE_MAX) {
    const oldest = COUNT_CACHE.keys().next().value
    if (oldest !== undefined) COUNT_CACHE.delete(oldest)
  }
  COUNT_CACHE.set(key, { t: Date.now(), v: value })
}

function json(o, status = 200) {
  // 2026-11-28：成功响应交给 CDN 缓存 5 分钟（仅返回计数、无隐私数据）。
  // 原因：EdgeOne 每个请求是独立函数实例，应用层 Map 计数/缓存跨实例不共享
  // （实测同 IP 连打 45 次全部落到函数，内存 IP 限流从未触发 429）。
  // CDN 缓存是唯一能跨实例吸收重复请求的防线，让爬虫遍历相同筛选条件时
  // 直接在边缘命中、不到函数更不到 Supabase。
  const cacheControl = status === 200 && !o.error
    ? 'public, s-maxage=300, stale-while-revalidate=60'
    : 'no-store'
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  })
}

export async function onRequest(context) {
  const req = context.request
  if (req.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  const blocked = botGuard(req)
  if (blocked) return blocked
  // 2026-11-28 二次盘点：缓存 key 由筛选条件构成，可任意变化（500 key × 64 次分页
  // = 5min 内约 3.2 万次查询）。UA 可伪造，故再按 IP 限流：每 60s 最多 30 次计数
  // 请求，正常用户筛选/翻页远低于此值；超阈值直接 429，不回源。
  const limited = ipRateLimit(req, 'fs-count', 30, 60 * 1000)
  if (limited) return limited
  const url = new URL(req.url)
  const targetPath = url.searchParams.get('path')
  if (!targetPath) return json({ count: null, error: 'missing path' }, 400)
  if (
    targetPath.startsWith('http://') || targetPath.startsWith('https://') ||
    targetPath.startsWith('//') || targetPath.includes('..') ||
    !targetPath.startsWith('/rest/v1/')
  ) {
    return json({ count: null, error: 'invalid path' }, 400)
  }

  // 只保留过滤条件，去掉排序 / 分页（总数与排序无关）；select 统一收窄为 c
  let inner = targetPath
  try {
    const [p, qs] = inner.split('?')
    const usp = new URLSearchParams(qs || '')
    usp.set('select', 'c')
    usp.delete('order')
    usp.delete('offset')
    usp.delete('limit')
    inner = p + (usp.toString() ? '?' + usp.toString() : '')
  } catch (_) { /* 无 query 时忽略 */ }

  const cached = cacheGet(inner)
  if (cached !== null) return json({ count: cached, cached: true })

  const headers = new Headers()
  for (const k of ['apikey', 'authorization']) {
    const v = req.headers.get(k)
    if (v) headers.set(k, v)
  }
  // ⚠️ 绝不能带 `Prefer: count=exact`：EdgeOne 边缘层对入站和函数出站携带该头的
  //    请求都会返回自家 502 HTML（实测诊断回显），上游的 206 响应同样被吞。
  //    改为普通 GET 分页取回代码列再累加 —— 不产生 206，不受该限制影响。

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  // 单次探针：只取 1 行，按 c 稳定排序，保证 offset 语义一致。
  async function probe(offset) {
    const u = new URL(SUPABASE_BASE + inner)
    u.searchParams.set('select', 'c')
    u.searchParams.set('order', 'c.asc')
    u.searchParams.set('limit', '1')
    u.searchParams.set('offset', String(offset))
    const r = await fetch(u.toString(), {
      method: 'GET', headers, signal: controller.signal, redirect: 'follow',
    })
    if (!r.ok) return { error: r.status }
    const arr = await r.json().catch(() => [])
    return { has: Array.isArray(arr) && arr.length > 0 }
  }

  try {
    // 空结果集：offset=0 无行，直接返回 0（1 次请求）。
    const first = await probe(0)
    if (first.error) return json({ count: null, error: 'upstream ' + first.error }, 502)
    if (!first.has) { cacheSet(inner, 0); return json({ count: 0 }) }

    // 倍增找上界：第一个「无行」的 offset 即总数。
    let lo = 0
    let hi = 1
    for (let guard = 0; guard < 20 && hi <= 200000; guard++) {
      const r = await probe(hi)
      if (r.error) return json({ count: null, error: 'upstream ' + r.error }, 502)
      if (!r.has) break
      lo = hi
      hi *= 2
    }
    // 二分收敛：lo 一定有行、hi 一定无行。
    for (let guard = 0; guard < 20 && lo + 1 < hi; guard++) {
      const mid = Math.floor((lo + hi) / 2)
      const r = await probe(mid)
      if (r.error) return json({ count: null, error: 'upstream ' + r.error }, 502)
      if (r.has) lo = mid
      else hi = mid
    }
    cacheSet(inner, hi)
    return json({ count: hi })
  } catch (e) {
    return json({ count: null, error: String((e && e.message) || e) }, 502)
  } finally {
    clearTimeout(timer)
  }
}
