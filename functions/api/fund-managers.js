/**
 * EdgeOne Pages Function — 东方财富基金经理列表代取
 * 路由：GET /api/fund-managers?ft=all&pn=10000&pi=1&mc=returnjson[&com=&input=&ini=&sc=&st=&id=]
 *
 * 用途：基金经理图鉴（/tools/manager）在线拉取东方财富真实基金经理数据，不落库。
 * 东方财富页面 https://fund.eastmoney.com/manager/ 通过该端点取数，前端直接 CORS 不可达，
 * 故由本边缘函数（EdgeOne 海外节点）代取并归一化后返回。
 *
 * 原始返回为 JSONP 包装：var returnjson= {...}; 须剥离前缀再 JSON.parse。
 * 每行 data[i] 为 12 字段数组，本函数归一化为可读对象：
 *   id, name, companyId, company, fundCodes[], fundNames[],
 *   fundCount, manageDays, bestReturn, bestReturnFund, scale
 *
 * 参数：
 *   ft   类型 all/gp/hh/zq/sy（全部/股票型/混合型/债券型/收益型）
 *   pn   每页条数（默认 10000，单页拉全部）
 *   pi   页码（默认 1）
 *   com  公司名（服务端模糊过滤，需 URLEncode）
 *   input 姓名/拼音（服务端模糊搜索）
 *   ini  字母索引（A-Z）
 *   sc   排序列（已知可用 abbname=姓名）
 *   st   排序方向 asc/desc
 *   id   经理 ID（精确）
 */

const EM_BASE = 'https://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx'
const TIMEOUT_MS = 12000

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

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const ft = (url.searchParams.get('ft') || 'all').trim()
  const pi = (url.searchParams.get('pi') || '1').trim()
  const pn = (url.searchParams.get('pn') || '10000').trim()
  const sc = (url.searchParams.get('sc') || '').trim()
  const st = (url.searchParams.get('st') || '').trim()
  const com = (url.searchParams.get('com') || '').trim()
  const input = (url.searchParams.get('input') || '').trim()
  const ini = (url.searchParams.get('ini') || '').trim()
  const id = (url.searchParams.get('id') || '').trim()

  if (!['all', 'gp', 'hh', 'zq', 'sy'].includes(ft)) {
    return jsonResponse({ ok: false, error: 'ft must be one of all|gp|hh|zq|sy' }, 400)
  }

  const params = new URLSearchParams()
  params.set('dt', '14')
  params.set('ft', ft)
  params.set('pn', pn)
  params.set('pi', pi)
  params.set('mc', 'returnjson')
  if (sc) params.set('sc', sc)
  if (st) params.set('st', st)
  if (com) params.set('com', com)
  if (input) params.set('input', input)
  if (ini) params.set('ini', ini)
  if (id) params.set('id', id)

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
    if (!res.ok) {
      return jsonResponse({ ok: false, error: `upstream http ${res.status}` }, 502)
    }
    const text = await res.text()
    // 剥离 JSONP 前缀：var returnjson= {...};
    const m = text.match(/returnjson\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)
    if (!m) {
      return jsonResponse({ ok: false, error: 'unexpected upstream payload (jsonp parse failed)' }, 502)
    }
    const obj = JSON.parse(m[1])
    const rawList = Array.isArray(obj.data) ? obj.data : []
    const data = rawList.map(normalize).filter(Boolean)

    return jsonResponse({
      ok: true,
      ft,
      record: obj.record || data.length,
      pages: obj.pages || 1,
      curpage: obj.curpage || 1,
      count: data.length,
      data,
    }, 200)
  } catch (e) {
    return jsonResponse({ ok: false, error: String((e && e.message) || e) }, 502)
  } finally {
    clearTimeout(timer)
  }
}
