/**
 * 共享防护模块（下划线开头 → EdgeOne 不将其作为独立路由暴露）
 *
 * 背景（2026-11-28）：AhrefsBot/7.0 遍历 /tools/fund 全部分页，每页都触发
 * /api/fs-count（全表分页累加）与 /api/sb-proxy 的大 offset 查询，20:56-21:03
 * 把 Supabase 免费实例打挂（57014 statement timeout）。
 *
 * 本模块在边缘函数入口直接拒绝已知「只抓取不带来流量价值」的 SEO 爬虫 UA，
 * 不给它们任何回源机会。Googlebot / Bingbot / Baiduspider 正常放行，避免误伤 SEO。
 */

const BOT_UA = [
  /ahrefsbot/i,
  /semrushbot/i,
  /semrush/i,
  /mj12bot/i,
  /dotbot/i,
  /linkdexbot/i,
  /majesticbot/i,
  /blexbot/i,
  /spbot/i,
  /screaming frog/i,
  /petalbot/i,
  /bytespider/i,
]

export function isKnownBot(req) {
  const ua = (req && req.headers && req.headers.get('user-agent')) || ''
  return BOT_UA.some((re) => re.test(ua))
}

/**
 * 命中已知 bot 时返回 403 Response；正常用户返回 null。
 * X-Robots-Tag: noindex 阻止搜索引擎把这些拦截页纳入索引。
 */
export function botGuard(req) {
  if (!isKnownBot(req)) return null
  return new Response(JSON.stringify({ error: 'bot blocked' }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

// ── 通用深分页限流（防伪装 UA 的爬虫）──────────────────────────────────────
// 日志里打挂 DB 的模式是 limit=1000 & offset>=4000 连续翻页。UA 可伪造，
// 因此对「大表 + 深分页」按 IP 再做一道粗粒度限流：60 秒内超过 20 次即 429。
const DEEP_HITS = new Map()
const DEEP_WINDOW_MS = 60 * 1000
const DEEP_MAX = 20

/** 取客户端 IP：优先 XFF 第一段，其次 X-Real-IP；都不存在时给固定兜底值（同归一类，仍受限） */
export function clientIp(req) {
  const forwarded = (req && req.headers && req.headers.get('x-forwarded-for')) || ''
  return forwarded.split(',')[0].trim()
    || ((req && req.headers && req.headers.get('x-real-ip')) || '')
    || 'unknown'
}

/**
 * 通用 IP 限流（2026-11-28 二次盘点新增）。
 * 解决的是「UA 可伪造」的问题：已知 bot UA 拦截只能挡老实爬虫，
 * 换成普通浏览器 UA 后，循环打昂贵接口（count=exact / fs-count 分页累加）
 * 仍会用 10 个免费连接池位把整库占死。因此在边缘按 IP 做粗粒度计数，
 * 超阈值直接 429，根本不回源 Supabase。
 * @param {string} bucket 限流桶名（不同接口各自计数，互不干扰）
 * @param {number} max 窗口内最大请求数
 * @param {number} windowMs 窗口毫秒
 */
const IP_BUCKETS = new Map()
const IP_BUCKET_MAX_KEYS = 4000
export function ipRateLimit(req, bucket, max = 20, windowMs = 60 * 1000) {
  const ip = clientIp(req)
  const key = bucket + '|' + ip
  const now = Date.now()
  let rec = IP_BUCKETS.get(key)
  if (!rec || now - rec.t > windowMs) rec = { n: 0, t: now }
  rec.n += 1
  IP_BUCKETS.set(key, rec)
  // 只淘汰「已过期」的键，不再无差别 clear()：避免伪造大量 XFF IP 触发全清、绕过限流
  if (IP_BUCKETS.size > IP_BUCKET_MAX_KEYS) {
    for (const [k, v] of IP_BUCKETS) {
      if (now - v.t > windowMs) IP_BUCKETS.delete(k)
    }
    // 极端情况（瞬时 >4000 个真实 IP）仍超限时，只删最旧的一个，绝不全清
    while (IP_BUCKETS.size > IP_BUCKET_MAX_KEYS) {
      const oldest = IP_BUCKETS.keys().next().value
      if (oldest === undefined) break
      IP_BUCKETS.delete(oldest)
    }
  }
  if (rec.n <= max) return null
  return new Response(JSON.stringify({ error: 'rate limited', bucket }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': String(Math.ceil(windowMs / 1000)),
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

export function deepPaginationGuard(req, targetPath) {
  const m = /[?&]offset=(\d+)/.exec(targetPath || '')
  if (!m || Number(m[1]) < 4000) return null
  if (!/fund_scores|stock_scores/.test(targetPath)) return null

  const ip = clientIp(req)
  const now = Date.now()
  let rec = DEEP_HITS.get(ip)
  if (!rec || now - rec.t > DEEP_WINDOW_MS) rec = { n: 0, t: now }
  rec.n += 1
  DEEP_HITS.set(ip, rec)
  // 同样改为只淘汰过期键，避免伪造 XFF 全清绕过
  if (DEEP_HITS.size > 2000) {
    for (const [k, v] of DEEP_HITS) {
      if (now - v.t > DEEP_WINDOW_MS) DEEP_HITS.delete(k)
    }
  }
  if (rec.n <= DEEP_MAX) return null
  return new Response(JSON.stringify({ error: 'deep pagination rate limited' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': '60',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
