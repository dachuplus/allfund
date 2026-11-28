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
