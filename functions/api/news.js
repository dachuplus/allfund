/**
 * EdgeOne Pages Function — 资讯聚合（在线拉取，不落地）
 * 路由： GET /api/news?cat=all|finance|fund|stock|global&refresh=1
 *
 * 设计原则：
 *  1. 数据不落地：所有资讯在边缘节点实时抓取、归一化、返回 JSON，不写库、不写盘。
 *  2. 多源容错：每个源独立 fetch + 超时 + 解析；单源失败不影响整体，返回空数组。
 *  3. 同源边缘缓存：Cache-Control s-maxage=300 + stale-while-revalidate，降低上游压力、加速响应。
 *  4. 分类策略：
 *     - 综合(finance)：以新浪财经要闻为可靠主干；
 *     - 基金(fund)/股票(stock)/全球(global)：除各自专属源外，新浪主干中标题命中关键词
 *       （基金/ETF/净值/公募 → fund；A股/港股/美股/个股 → stock；美股/全球/美联储/海外 → global）
 *       的文章会自动归入对应分类，保证每个 tab 都有内容。
 *
 * 注意：本函数运行在 EdgeOne 海外边缘节点，出口 IP 为海外，部分国内站点可能不可达；
 * 不可达的源会在线上实测后从 SOURCES 中剔除（添加/移除源为单点改动）。
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

/** fetch 带超时（AbortController） */
async function fetchText(url, timeout = 8000, headers = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept': '*/*', ...headers },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

/** fetch JSON */
async function fetchJson(url, timeout = 8000, headers = {}) {
  const text = await fetchText(url, timeout, { 'Accept': 'application/json', ...headers })
  return JSON.parse(text)
}

/* ============ 解析器 ============ */

/** 新浪财经要闻 JSON（feed.mix.sina.com.cn，已验证可达） */
function parseSinaJson(text, label) {
  const data = JSON.parse(text)
  const arr = (data && data.result && data.result.data) || []
  return arr.map((it) => ({
    title: (it.title || '').replace(/<\/?[^>]+>/g, ''),
    link: it.url || it.wapurl || '',
    summary: (it.intro || it.summary || it.wapsummary || '').replace(/<\/?[^>]+>/g, '').slice(0, 200),
    publishedAt: it.ctime ? Number(it.ctime) * 1000 : Date.now(),
    source: it.media_name || label,
    category: 'finance',
  })).filter((x) => x.title && x.link)
}

/** 通用 RSS / Atom 解析（正则容错） */
function parseRss(xml, source, cat) {
  if (!xml) return []
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g) || []
  const out = []
  for (const b of blocks) {
    const title = textOf(b, 'title')
    if (!title) continue
    const link = linkOf(b)
    const desc = textOf(b, 'description') || textOf(b, 'summary') || textOf(b, 'content')
    const pub = textOf(b, 'pubDate') || textOf(b, 'published') || textOf(b, 'updated') || textOf(b, 'dc:date')
    out.push({
      title: stripHtml(title).slice(0, 120),
      link,
      summary: stripHtml(desc).replace(/\s+/g, ' ').slice(0, 200),
      publishedAt: parseDate(pub),
      source,
      category: cat,
    })
  }
  return out.filter((x) => x.title && x.link)
}

/** 东方财富基金新闻 HTML（best-effort，海外节点可达性待实测） */
function parseEastmoneyFundHtml(html) {
  if (!html) return []
  const out = []
  const re = /<a[^>]+href="(https?:\/\/[^"]*eastmoney\.com\/[^"]+)"[^>]*>([^<]{6,80})<\/a>/g
  let m
  const seen = new Set()
  while ((m = re.exec(html)) !== null) {
    const link = m[1]
    const title = m[2].trim()
    if (seen.has(title)) continue
    seen.add(title)
    out.push({
      title,
      link,
      summary: '',
      publishedAt: Date.now(),
      source: '东方财富基金',
      category: 'fund',
    })
    if (out.length >= 30) break
  }
  return out
}

/* ============ 文本工具 ============ */

function textOf(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
  return m ? m[1] : ''
}
function linkOf(block) {
  // RSS <link>https://...</link> 或 <link href="..."/>
  const inline = block.match(/<link[^>]*href="([^"]+)"/i)
  if (inline) return inline[1]
  const txt = textOf(block, 'link')
  return (txt || '').trim()
}
function stripHtml(s) {
  return (s || '').replace(/<\/?[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}
function parseDate(s) {
  if (!s) return Date.now()
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : Date.now()
}

/** 新浪主干文章按标题关键词自动归入 基金/股票/全球 分类（返回分类数组，避免去重时丢失） */
function autoTagCategories(item) {
  const cats = new Set([item.category])
  const t = item.title || ''
  if (/(基金|ETF|净值|公募|私募|货币|债券|偏股|FOF|投顾|基金经理|份额|申购|赎回|持仓|理财)/.test(t)) cats.add('fund')
  if (/(A股|港股|美股|个股|大盘|沪深|创业板|科创板|北证|股票|券商|上市公司|涨停|跌停|市值|板块)/.test(t)) cats.add('stock')
  if (/(美股|全球|美联储|海外|国际|美元|汇率|黄金|原油|欧股|日经|地缘|降息|加息)/.test(t)) cats.add('global')
  return Array.from(cats)
}

/* ============ 源注册表 ============ */

const SINA_FINANCE = 'https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&num=80&r=1'

/* 已实测（EdgeOne 海外边缘节点）：
 *   ✅ 新浪财经要闻 feed.mix JSON 接口 —— 稳定可达，作为主干。
 *   ✅ 财联社电报 /api/v1/telegraph       —— 可达（需带 Referer/Origin 头规避反爬）。
 *   ❌ 东方财富 / 中国基金报 / 格隆汇 / 证券时报 —— 海外 IP 被限流或超时（504/404），已剔除。
 *   ❌ 华尔街见闻 /api* 快讯接口           —— 路径返回 71404 Not Found，暂未找到可用端点。
 * 说明：剔除不可达源既保证响应速度，也避免单源超时拖累整体。新增源只需在下方 SOURCES 追加一项。
 */
const SOURCES = [
  {
    id: 'sina-finance',
    name: '新浪财经要闻',
    cat: 'finance',
    async fetch() {
      const text = await fetchText(SINA_FINANCE, 9000)
      return parseSinaJson(text, '新浪财经')
    },
  },
  {
    id: 'cls-telegraph',
    name: '财联社电报',
    cat: 'stock',
    async fetch() {
      const data = await fetchJson('https://www.cls.cn/api/v1/telegraph?page=1', 8000, {
        'Accept': 'application/json',
        'Referer': 'https://www.cls.cn/telegraph',
        'Origin': 'https://www.cls.cn',
      })
      // 反爬 / 加载态（errno 非 0 视为无数据，不报错）
      if (!data || data.errno === undefined) return []
      if (data.errno !== 0) return []
      const arr = (data.data && data.data.data) || data.data || []
      if (!Array.isArray(arr)) return []
      return arr.slice(0, 30).map((it) => ({
        title: stripHtml(it.content || it.title || '').slice(0, 120),
        link: 'https://www.cls.cn/detail/' + (it.id || ''),
        summary: '',
        publishedAt: (it.time ? Number(it.time) * 1000 : (it.created_at ? Date.parse(it.created_at) : Date.now())),
        source: '财联社',
        category: 'stock',
      })).filter((x) => x.title)
    },
  },
]


/* ============ 主入口 ============ */

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const cat = (url.searchParams.get('cat') || 'all').toLowerCase()
  const forceRefresh = url.searchParams.get('refresh') === '1'

  const settled = await Promise.allSettled(SOURCES.map((s) => s.fetch()))
  let items = []
  const srcStatus = {}
  settled.forEach((r, i) => {
    const src = SOURCES[i]
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      srcStatus[src.id] = { ok: true, count: r.value.length }
      items = items.concat(r.value)
    } else {
      srcStatus[src.id] = { ok: false, error: String(r.reason && r.reason.message || r.reason) }
    }
  })

  // 展开分类（新浪主干按关键词自动归入 基金/股票/全球），每条保留完整分类数组
  const enriched = items.map((it) => ({
    ...it,
    categories: autoTagCategories(it),
  }))

  // 去重（按标题 + 链接），保留带全部分类的单一记录
  const seen = new Set()
  let merged = []
  for (const it of enriched) {
    const key = (it.title + '|' + it.link).slice(0, 160)
    if (seen.has(key)) continue
    seen.add(key)
    // category 取主分类（数组首项），供前端展示
    merged.push({ ...it, category: it.categories[0] })
  }

  // 按分类过滤（cat=all 不过滤；否则要求分类数组包含该分类）
  if (cat !== 'all') {
    merged = merged.filter((it) => (it.categories || []).includes(cat))
  }

  // 排序（最新优先）+ 截断
  merged.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
  const limit = 80
  if (merged.length > limit) merged = merged.slice(0, limit)

  const body = {
    updatedAt: new Date().toISOString(),
    cat,
    count: merged.length,
    items: merged,
    sources: srcStatus,
  }

  const cacheCtrl = forceRefresh
    ? 'no-store'
    : 'public, s-maxage=300, stale-while-revalidate=600'

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheCtrl,
      'Access-Control-Allow-Origin': '*',
    },
  })
}
