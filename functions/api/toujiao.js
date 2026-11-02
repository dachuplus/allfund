/**
 * 投教内容聚合 — 边缘函数只读接口
 * 路由：GET /api/toujiao?company=<domain>&url=<edu_url>
 *  - company: 公司主域名（作为 company_key）
 *  - url:     该公司投教基地地址（可选，用于「缓存未命中时」对 SSR 站点实时兜底抓取）
 *
 * 数据来源：Supabase 表 toujiao_articles（由 scripts/toujiao_crawler.py 定时渲染写入）。
 * 回退策略：缓存空 → 若给出 url 且站点为服务端渲染，则边缘实时抓取一次（不写库，保持数据不落地）。
 * 安全：仅用 publishable anon key 只读；不写库、不写盘。
 */

const SUPABASE_URL = 'https://tqhtegazxykkqfcpejky.supabase.co'
const ANON_KEY = 'sb_publishable_iFtMcvav774gqF28gGYQVw_QMmuS-z3'
const TIMEOUT_MS = 12000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const NAV_NOISE = /(登录|注册|首页|关于我们|关于|联系我们|隐私|版权|友情链接|设为首页|收藏|下载APP|手机|客服|免责|备案|招贤|招聘|加入我们|微博|微信|English|EN$|地图|反馈|投诉|RSS|订阅)/

// 页面常误标 charset（如声明 UTF-8 实为 GBK），故不盲信 meta/header，
// 改用「严格 UTF-8 校验」判据：GBK 字节流几乎必然含非法 UTF-8 序列 → 解码抛错 → 回退 GBK。
function smartDecode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch (e) {
    try {
      return new TextDecoder('gbk').decode(buf)
    } catch (e2) {
      return new TextDecoder('utf-8').decode(buf)
    }
  }
}

function parseAnchors(html, base) {
  const out = []
  const seen = new Set()
  const re = /<a\b[^>]*\shref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    let href = m[1].trim()
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!text || text.length < 6 || text.length > 60) continue
    if (!/[一-鿿]/.test(text)) continue
    if (NAV_NOISE.test(text)) continue
    if (!/^https?:\/\//i.test(href)) {
      try { href = new URL(href, base).href } catch { continue }
    }
    const uh = new URL(href)
    const baseHost = new URL(base).host
    if (uh.host !== baseHost && !uh.host.endsWith('.' + baseHost) && !baseHost.endsWith('.' + uh.host)) {
      // 允许同主域子站
      const root = baseHost.split('.').slice(-2).join('.')
      if (!uh.host.endsWith('.' + root) && uh.host !== root) continue
    }
    if (seen.has(href)) continue
    seen.add(href)
    out.push({ title: text, url: href })
    if (out.length >= 40) break
  }
  return out
}

async function fetchHtml(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const buf = new Uint8Array(await res.arrayBuffer())
    return smartDecode(buf)
  } finally {
    clearTimeout(t)
  }
}

async function readCache(company) {
  const url =
    `${SUPABASE_URL}/rest/v1/toujiao_articles?company_key=eq.${encodeURIComponent(company)}` +
    `&select=title,url,category,fetched_at&order=fetched_at.desc`
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error('sb ' + res.status)
  const rows = await res.json()
  return (rows || []).map((r) => ({
    title: r.title,
    url: r.url,
    category: r.category || '',
    date: r.fetched_at || '',
  }))
}

export async function onRequest(context) {
  const { request } = context
  const u = new URL(request.url)
  const company = (u.searchParams.get('company') || '').trim()
  const liveUrl = (u.searchParams.get('url') || '').trim()
  if (!company) {
    return new Response(JSON.stringify({ error: 'missing company' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  try {
    const cached = await readCache(company)
    if (cached.length) {
      return json({
        source: company,
        status: 'cached',
        count: cached.length,
        updatedAt: cached[0].date || '',
        items: cached,
      })
    }
  } catch (e) {
    // 缓存读取失败不致命，继续走实时兜底
  }
  // 缓存未命中：对给出 url 的站点做一次实时抓取（兼容服务端渲染站点）
  if (liveUrl) {
    try {
      const html = await fetchHtml(liveUrl)
      const items = parseAnchors(html, liveUrl)
      if (items.length) {
        return json({
          source: company,
          status: 'live',
          count: items.length,
          updatedAt: new Date().toISOString(),
          items,
        })
      }
    } catch (e) {
      // 实时抓取失败（多为 SPA，需爬虫渲染）
    }
  }
  return json({
    source: company,
    status: 'pending',
    count: 0,
    updatedAt: '',
    items: [],
  })
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
    },
  })
}
