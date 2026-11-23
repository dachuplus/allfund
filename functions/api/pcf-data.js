/**
 * EdgeOne Pages Function — 主动ETF PCF 静态 JSON 同源代理（国内回退）
 * 路由：GET /api/pcf-data?path=pcf/latest.json  或  /api/pcf-data?path=pcf/2026-11-23.json
 *
 * 数据真源在 GitHub 独立分支 pcf-data（CI 每交易日生成），公开仓库无密钥。
 * 前端优先直读 jsDelivr/raw CDN；国内个别网络访问 CDN 不稳时回退到本同源接口。
 * 服务端只做透传 + 短缓存，不落数据库、不占 Supabase 空间。
 *
 * 安全：path 仅允许 pcf/ 下、结尾 .json、且只含 0-9A-Za-z._-/，防目录穿越。
 */

const OWNER = 'dachuplus'
const REPO = 'allfund'
const BRANCH = 'pcf-data'
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`

const CACHE_MS = 5 * 60 * 1000
let cache = {} // path -> { at, data }

function validPath(p) {
  return /^pcf\/[0-9A-Za-z._/-]+\.json$/.test(p) && p.indexOf('..') === -1
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const path = (url.searchParams.get('path') || 'pcf/latest.json').trim()
  if (!validPath(path)) {
    return new Response(JSON.stringify({ error: 'invalid path' }), {
      status: 400, headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  const hit = cache[path]
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return new Response(JSON.stringify(hit.data), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-pcf-cache': 'hit' },
    })
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    let res
    try {
      res = await fetch(RAW + path, { signal: ctrl.signal, headers: { 'user-agent': 'allfund-pcf-proxy' } })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new Error('upstream ' + res.status)
    const data = await res.json()
    cache[path] = { at: Date.now(), data }
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-pcf-cache': 'miss' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message || e) }), {
      status: 502, headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
}
