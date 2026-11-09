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
 */

const SUPABASE_BASE = 'https://tqhtegazxykkqfcpejky.supabase.co'
const UPSTREAM_TIMEOUT_MS = 14000

function json(o, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function onRequest(context) {
  const req = context.request
  if (req.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
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
  const PAGE = 1000      // Supabase 单次返回上限
  const BATCH = 8        // 每轮并发页数，控制耗时
  try {
    let total = 0
    let offset = 0
    let done = false
    for (let round = 0; round < 8 && !done; round++) {
      const offsets = Array.from({ length: BATCH }, (_, i) => offset + i * PAGE)
      const pages = await Promise.all(offsets.map(async (o) => {
        const u = new URL(SUPABASE_BASE + inner)
        u.searchParams.set('limit', String(PAGE))
        u.searchParams.set('offset', String(o))
        const r = await fetch(u.toString(), {
          method: 'GET', headers, signal: controller.signal, redirect: 'follow',
        })
        if (!r.ok) return { n: -1, status: r.status }
        const arr = await r.json().catch(() => [])
        return { n: Array.isArray(arr) ? arr.length : 0, status: r.status }
      }))
      for (const pg of pages) {
        if (pg.n < 0) return json({ count: null, error: 'upstream ' + pg.status }, 502)
        total += pg.n
        if (pg.n < PAGE) { done = true; break }
      }
      offset += BATCH * PAGE
    }
    return json({ count: total })
  } catch (e) {
    return json({ count: null, error: String((e && e.message) || e) }, 502)
  } finally {
    clearTimeout(timer)
  }
}
