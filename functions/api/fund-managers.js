/**
 * EdgeOne Pages Function — 东方财富基金经理列表代取
 * 路由：GET /api/fund-managers?ft=all&full=1[&com=&input=&ini=&id=&sc=&st=]
 *
 * 用途：基金经理图鉴（/tools/manager）在线拉取东方财富真实基金经理数据，不落库。
 * 东方财富页面 https://fund.eastmoney.com/manager/ 通过该端点取数，前端直接 CORS 不可达，
 * 故由本边缘函数（EdgeOne 海外节点）代取并归一化后返回。
 *
 * 重要约束（实测 2026-10-28）：
 *   1) 返回为 JSONP 包装的「JavaScript 对象字面量」：var returnjson= {data:[...],record:4373,...}
 *      —— 键名不带引号（data: / record:），不是合法 JSON，须先给键名加引号再 JSON.parse。
 *   2) 东方财富对单页大小 pn 有硬上限 2000：pn>2000 会被忽略并回退默认页大小（~50/页）。
 *      因此「拉全部」必须内部翻页：pn=2000 循环 pi=1..pages 累加，最多 3 页拉完 4373 条。
 *
 * 每行 data[i] 为 12 字段数组，本函数归一化为可读对象：
 *   id, name, companyId, company, fundCodes[], fundNames[],
 *   fundCount, manageDays, bestReturn, bestReturnFund, scale
 *
 * 参数：
 *   ft   类型 all/gp/hh/zq/sy（全部/股票型/混合型/债券型/收益型）
 *   full 传 "1" 时内部翻页拉全量（忽略 pi），返回完整数据集
 *   com  公司名（服务端模糊过滤，需 URLEncode）
 *   input 姓名/拼音（服务端模糊搜索）
 *   ini  字母索引（A-Z）
 *   id   经理 ID（精确）
 *   sc   排序列；st 排序方向 asc/desc
 *   pn/pi 可选：单页模式下的页大小/页码（默认 pn=2000, pi=1）
 */

const EM_BASE = 'https://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx'
const TIMEOUT_MS = 12000
const MAX_PN = 2000          // 东方财富单页硬上限
const MAX_PAGES = 50         // 翻页安全护栏

function normalize(raw) {
  if (!Array.isArray(raw)) return null
  const fundCodes = (raw[4] || '').split(',').map(s => s.trim()).filter(Boolean)
  const fundNames = (raw[5] || '').split(',').map(s => s.trim()).filter(Boolean)
  return {
    id: raw[0] || '',
    name: raw[1] || '',
    companyId: raw[2] || '',
    company: raw[3] || '',
    fundCodes,
    fundNames,
    fundCount: fundCodes.length,
    manageDays: parseInt(raw[6], 10) || 0,
    bestReturn: raw[7] || '',       // 如 "22.44%"
    bestReturnFund: raw[9] || '',   // 最佳回报对应基金名
    scale: raw[10] || '',           // 如 "2.48亿元"
  }
}

/** 把「键名无引号的 JS 对象字面量」转成合法 JSON 字符串。 */
function quoteKeys(text) {
  // 仅匹配对象键位置上的裸标识符后跟冒号：{data:  ,record:  ",record:"
  // 注意：键前的字符可能是 {（首键）或 , 或空白，必须都纳入前缀字符类。
  return text.replace(/(^|[\s,{])(\w+)\s*:/g, '$1"$2":')
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

/** 解析单页 JSONP 文本 → { record, pages, curpage, data[] } */
function parsePayload(text) {
  const m = text.match(/returnjson\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)
  if (!m) throw new Error('unexpected upstream payload (jsonp parse failed)')
  const obj = JSON.parse(quoteKeys(m[1].trim()))
  const rawList = Array.isArray(obj.data) ? obj.data : []
  const data = rawList.map(normalize).filter(Boolean)
  return {
    record: obj.record || data.length,
    pages: obj.pages || 1,
    curpage: obj.curpage || 1,
    data,
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const ft = (url.searchParams.get('ft') || 'all').trim()
  const full = url.searchParams.get('full') === '1'
  const pi = (url.searchParams.get('pi') || '1').trim()
  const pn = (url.searchParams.get('pn') || String(MAX_PN)).trim()
  const sc = (url.searchParams.get('sc') || '').trim()
  const st = (url.searchParams.get('st') || '').trim()
  const com = (url.searchParams.get('com') || '').trim()
  const input = (url.searchParams.get('input') || '').trim()
  const ini = (url.searchParams.get('ini') || '').trim()
  const id = (url.searchParams.get('id') || '').trim()

  if (!['all', 'gp', 'hh', 'zq', 'sy'].includes(ft)) {
    return jsonResponse({ ok: false, error: 'ft must be one of all|gp|hh|zq|sy' }, 400)
  }

  // 公共查询参数
  const base = new URLSearchParams()
  base.set('dt', '14')
  base.set('ft', ft)
  base.set('mc', 'returnjson')
  if (sc) base.set('sc', sc)
  if (st) base.set('st', st)
  if (com) base.set('com', com)
  if (input) base.set('input', input)
  if (ini) base.set('ini', ini)
  if (id) base.set('id', id)

  const fetchOne = async (pageNo, pageSize) => {
    const params = new URLSearchParams(base)
    params.set('pn', String(pageSize))
    params.set('pi', String(pageNo))
    const target = `${EM_BASE}?${params.toString()}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(target, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          'Referer': 'https://fund.eastmoney.com/manager/',
          'Accept': '*/*',
        },
      })
      if (!res.ok) throw new Error(`upstream http ${res.status}`)
      const text = (await res.text()).trim()
      return parsePayload(text)
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    const allData = []
    let record = 0, pages = 1, curpage = 1

    if (full) {
      // 内部翻页拉全量（pn 封顶 2000）
      let pageNo = 1
      while (pageNo <= MAX_PAGES) {
        const page = await fetchOne(pageNo, MAX_PN)
        allData.push(...page.data)
        record = page.record
        pages = page.pages
        curpage = page.curpage
        if (pageNo >= page.pages) break
        pageNo++
      }
    } else {
      const pageSize = Math.min(parseInt(pn, 10) || MAX_PN, MAX_PN)
      const page = await fetchOne(parseInt(pi, 10) || 1, pageSize)
      allData.push(...page.data)
      record = page.record
      pages = page.pages
      curpage = page.curpage
    }

    return jsonResponse({
      ok: true,
      ft,
      full,
      record,
      pages,
      curpage,
      count: allData.length,
      data: allData,
    }, 200)
  } catch (e) {
    return jsonResponse({ ok: false, error: String((e && e.message) || e) }, 502)
  }
}
