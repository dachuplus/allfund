/**
 * EdgeOne Pages Function — 基金分类静态清单同源代理（国内回退）
 * 路由：GET /api/category-data?t=<timestamp>
 *
 * 数据真源在 GitHub 独立分支 category-data（CI 每日聚合 fund_scores + 校验后生成），
 * 公开仓库无密钥。前端优先直读本同源接口；国内个别网络访问 jsDelivr/raw 不稳时回退。
 * 服务端只做透传 + 短缓存，不落数据库、不调 Supabase。
 */

const OWNER = 'dachuplus'
const REPO = 'allfund'
const BRANCH = 'category-data'
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/fund-categories.json`

const CACHE_MS = 10 * 60 * 1000
let cached = null // { at, data }

export async function onRequest(context) {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600', 'x-category-cache': 'hit' },
    })
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    let res
    try {
      res = await fetch(RAW, { signal: ctrl.signal, headers: { 'user-agent': 'allfund-category-proxy' } })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new Error('upstream ' + res.status)
    const data = await res.json()
    // 结构校验，防止上游异常时缓存脏数据
    if (!data || !Array.isArray(data.t0) || !Array.isArray(data.t1) || data.t0.length < 5) {
      throw new Error('invalid category data')
    }
    cached = { at: Date.now(), data }
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600', 'x-category-cache': 'miss' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message || e) }), {
      status: 502, headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
}
