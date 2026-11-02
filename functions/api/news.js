/**
 * EdgeOne Pages Function — 资讯聚合（在线拉取，不落地）
 * 路由： GET /api/news?cat=<分类>&src=<站点key>&refresh=1
 *
 * 设计原则：
 *  1. 数据不落地：在边缘节点实时抓取各站点公开列表页、归一化返回 JSON，不写库、不写盘。
 *  2. 分源聚合：每个「分类 tab → 网站子 tab」对应一次独立抓取；单源失败不影响其它。
 *  3. 同源边缘缓存：s-maxage=180 + stale-while-revalidate，降低上游压力、加速响应。
 *  4. 编码自适应：自动探测 UTF-8 / GBK(GB2312/GB18030) 并正确解码，避免中文乱码。
 *  5. 通用解析：以 <a> 标题抽取为主，配合每源可选过滤（排除域/链接模式/关键词）。
 *
 * 说明：本函数运行在 EdgeOne 海外边缘节点。实测以下站点从此出口可达（带浏览器 UA + 本站 Referer）：
 *   新浪娱乐/搜狐娱乐/时光网/豆果美食/红餐网/美食杰/中国证券报/上海证券报/证券时报/
 *   同花顺(基金)/和讯/中国基金报/新浪财经股票/同花顺/财联社电报/雷锋网/爱范儿/钛媒体/
 *   观察者网军事/中华网军事。
 *   财联社「深度」(cls depth) 与 东方财富基金页 为 JS 渲染/SPA，无稳定公开接口，暂不接入。
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

/* ============ 源注册表（分类 → 站点） ============ */
const REGISTRY = {
  yingshi: [
    { key: 'sina', name: '新浪娱乐', url: 'https://ent.sina.com.cn/', enc: 'auto' },
    { key: 'sohu', name: '搜狐娱乐', url: 'https://yule.sohu.com/', enc: 'auto' },
    { key: 'mtime', name: '时光网', url: 'https://www.mtime.com/', enc: 'auto' },
  ],
  meishi: [
    { key: 'douguo', name: '豆果美食', url: 'https://www.douguo.com/', enc: 'auto' },
    { key: 'canyin88', name: '红餐网', url: 'https://www.canyin88.com/', enc: 'auto' },
    { key: 'meishichina', name: '美食杰', url: 'https://www.meishichina.com/', enc: 'auto' },
  ],
  fund: [
    { key: 'cs', name: '中国证券报', url: 'https://www.cs.com.cn/tzjj/', enc: 'auto' },
    { key: 'cnstock', name: '上海证券报', url: 'https://www.cnstock.com/channel/10033', enc: 'auto' },
    { key: 'stcn', name: '证券时报', url: 'https://www.stcn.com/article/list/fund.html', enc: 'auto', excludeDomains: ['stcn.com/ad/'] },
    { key: 'jqka', name: '同花顺', url: 'https://fund.10jqka.com.cn/jjzx_list/', enc: 'auto', excludeDomains: ['trade.5ifund.com'], linkPattern: /fund\.10jqka\.com\.cn\/\d{8}\/c\d+\.shtml/ },
    { key: 'hexun', name: '和讯', url: 'https://funds.hexun.com/hotnews/', enc: 'auto', linkPattern: /funds\.hexun\.com\/\d{4}-\d{2}-\d{2}\// },
    { key: 'chnfund', name: '中国基金报', url: 'https://www.chnfund.com/fund', enc: 'auto' },
    { key: 'sina', name: '新浪基金', url: 'https://finance.sina.com.cn/fund/', enc: 'auto', linkPattern: /finance\.sina\.com\.cn\/(jjxw|money\/fund)\// },
    // —— 以下 3 个为「暂不可用」占位：源站为 JS 动态渲染(SPA) 或 数据接口有反爬保护，
    //    边缘节点（海外出口）无法解析其文章列表。前端进入后展示「暂不可接入」说明，不报错重试。
    { key: 'cls', name: '财联社基金', url: 'https://www.cls.cn/depth?id=1110', unavailable: true, reason: '财联社「深度」为动态渲染（SPA）且数据接口有反爬保护，边缘节点暂无法抓取。' },
    { key: 'ttjj', name: '天天基金', url: 'https://fund.eastmoney.com/a/cjjyw.html', unavailable: true, reason: '天天基金资讯页为 JavaScript 渲染（GBK），静态 HTML 无文章列表，边缘节点无法解析。' },
    { key: 'morningstar', name: '晨星观点', url: 'https://www.morningstar.cn/page/insights.html', unavailable: true, reason: '晨星观点为动态渲染（SPA）且数据接口有反爬保护，边缘节点暂无法抓取。' },
  ],
  stock: [
    { key: 'sina', name: '新浪财经·股票', url: 'https://finance.sina.com.cn/stock/', enc: 'auto' },
    { key: 'jqka', name: '同花顺', url: 'https://www.10jqka.com.cn/', enc: 'auto' },
    { key: 'cls', name: '财联社电报', url: 'https://www.cls.cn/api/v1/telegraph?page=1', enc: 'json' },
  ],
  tech: [
    { key: 'leiphone', name: '雷锋网', url: 'https://www.leiphone.com/', enc: 'auto' },
    { key: 'ifanr', name: '爱范儿', url: 'https://www.ifanr.com/', enc: 'auto' },
    { key: 'tmtpost', name: '钛媒体', url: 'https://www.tmtpost.com/', enc: 'auto' },
  ],
  military: [
    { key: 'guancha', name: '观察者网·军事', url: 'https://www.guancha.cn/military/', enc: 'auto' },
    { key: 'china', name: '中华网军事', url: 'https://military.china.com/', enc: 'auto' },
  ],
}

/* ============ 工具 ============ */

function baseOf(url) {
  const m = url.match(/^https?:\/\/[^/]+/i)
  return m ? m[0] : ''
}

function htmlUnescape(s) {
  return (s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/gi, ' ')
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '')
}

function detectEnc(buf, ct) {
  let cs = ''
  const cm = (ct || '').match(/charset=["']?([\w-]+)/i)
  if (cm) cs = cm[1].toLowerCase()
  if (!cs) {
    const head = new TextDecoder('utf-8').decode(buf.slice(0, 1024))
    const hm = head.match(/charset=["']?([\w-]+)/i)
    if (hm) cs = hm[1].toLowerCase()
  }
  if (cs === 'gbk' || cs === 'gb2312' || cs === 'gb18030') return 'gbk'
  return 'utf-8'
}

/** 从文本片段中尽力抽取时间（返回时间戳，失败返回 now） */
function extractDate(s) {
  if (!s) return Date.now()
  let m = s.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/)
  if (m) {
    const y = +m[1]
    const mo = +m[2]
    const d = +m[3]
    if (y > 1970 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      let h = 0
      let mi = 0
      const tm = s.match(/(\d{1,2}):(\d{2})/)
      if (tm) {
        h = +tm[1]
        mi = +tm[2]
      }
      const dt = new Date(y, mo - 1, d, h, mi)
      if (!isNaN(dt.getTime())) return dt.getTime()
    }
  }
  return Date.now()
}

/** fetch 带超时（AbortController） */
async function fetchBytes(url, timeout = 9000, extraHeaders = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...extraHeaders,
      },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const buf = new Uint8Array(await res.arrayBuffer())
    return { buf, ct: res.headers.get('content-type') || '' }
  } finally {
    clearTimeout(t)
  }
}

/** 抓取并解码 HTML（自动探测编码） */
async function fetchHtml(url, timeout = 9000) {
  const base = baseOf(url)
  const { buf, ct } = await fetchBytes(url, timeout, { Referer: base + '/' })
  const enc = detectEnc(buf, ct)
  let text
  try {
    text = new TextDecoder(enc).decode(buf)
  } catch (e) {
    text = new TextDecoder('utf-8').decode(buf)
  }
  return text
}

/** fetch JSON */
async function fetchJson(url, timeout = 8000, headers = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/* ============ 通用 HTML 解析 ============ */

function parseAnchors(html, base, opts = {}) {
  const {
    minLen = 8,
    maxLen = 60,
    excludeDomains = [],
    linkPattern = null,
    blacklist = ['登录', '注册', '首页', '客户端', '公众号', '更多', '视频', '图片', '专题', '直播', 'APP', '下载', '返回', '导航', '搜索', '关于', '联系', '版权', '备案', '隐私'],
  } = opts

  const out = []
  const seenT = new Set()
  const seenU = new Set()
  const re = /<a\b[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    let href = m[1].trim()
    const raw = m[2]
    let title = htmlUnescape(stripTags(raw)).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

    if (!href) continue
    if (href.startsWith('//')) href = 'https:' + href
    else if (href.startsWith('/')) href = base + href
    else if (!/^https?:\/\//i.test(href)) continue

    if (excludeDomains.some((d) => href.includes(d))) continue
    if (linkPattern && !linkPattern.test(href)) continue
    if (/\.(js|css|png|jpg|jpeg|gif|ico|pdf|zip)(\?|$)/i.test(href)) continue
    if (href.startsWith('javascript:') || href.startsWith('mailto:')) continue
    if (!/[\u4e00-\u9fff]/.test(title)) continue
    if (title.length < minLen || title.length > maxLen) continue
    if (blacklist.some((b) => title.includes(b))) continue
    if (seenT.has(title) || seenU.has(href)) continue
    seenT.add(title)
    seenU.add(href)

    const ctx = raw + html.slice(re.lastIndex, re.lastIndex + 200)
    out.push({ title, link: href, publishedAt: extractDate(ctx) })
    if (out.length >= 30) break
  }
  return out
}

/* ============ 财联社电报（JSON 特例） ============ */

async function fetchClsTelegraph(url) {
  const data = await fetchJson(url, 8000, {
    Referer: 'https://www.cls.cn/telegraph',
    Origin: 'https://www.cls.cn',
  })
  if (!data || data.errno === undefined) return []
  if (data.errno !== 0) return []
  const arr = (data.data && data.data.data) || data.data || []
  if (!Array.isArray(arr)) return []
  return arr
    .slice(0, 30)
    .map((it) => ({
      title: htmlUnescape(stripTags(it.content || it.title || '')).slice(0, 120),
      link: 'https://www.cls.cn/detail/' + (it.id || ''),
      publishedAt: it.time
        ? Number(it.time) * 1000
        : it.created_at
        ? Date.parse(it.created_at)
        : Date.now(),
    }))
    .filter((x) => x.title)
}

/* ============ 主入口 ============ */

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const cat = (url.searchParams.get('cat') || '').toLowerCase()
  const src = (url.searchParams.get('src') || '').toLowerCase()
  const force = url.searchParams.get('refresh') === '1'

  const list = REGISTRY[cat]
  if (!list) {
    return new Response(JSON.stringify({ error: 'unknown cat: ' + cat }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
  const s = list.find((x) => x.key === src) || list[0]

  // 占位源：源站为 SPA/反爬，边缘节点无法抓取，直接返回「暂不可接入」说明（不发起抓取、不报错重试）。
  if (s.unavailable) {
    const body = {
      updatedAt: new Date().toISOString(),
      cat,
      src: s.key,
      source: { name: s.name, url: s.url },
      count: 0,
      items: [],
      unavailable: true,
      error: s.reason || '该数据源暂不可接入。',
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  let items = []
  let err = null
  try {
    if (s.enc === 'json') {
      items = await fetchClsTelegraph(s.url)
    } else {
      const html = await fetchHtml(s.url, 9000)
      items = parseAnchors(html, baseOf(s.url), s)
    }
  } catch (e) {
    err = String((e && e.message) || e)
  }

  const body = {
    updatedAt: new Date().toISOString(),
    cat,
    src: s.key,
    source: { name: s.name, url: s.url },
    count: items.length,
    items,
    error: err,
  }

  const cacheCtrl = force ? 'no-store' : 'public, s-maxage=180, stale-while-revalidate=300'
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheCtrl,
      'Access-Control-Allow-Origin': '*',
    },
  })
}
