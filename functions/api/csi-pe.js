/**
 * EdgeOne Pages Function — 中证指数官方历史 PE（定投助手估值分位数据源）
 * 路由：GET /api/csi-pe?codes=000300,000905,...（codes 可省略，默认定投助手 7 指数全集）
 *
 * 数据源：中证指数官网 csindex.com.cn /csindex-home/perf/indexCsiDsPe（官方滚动市盈率日史）。
 *   本地非云 IP 直连官方可达；GitHub Actions 云 IP 曾被 WAF 403（见 update-index-scores.yml 注释），
 *   故改由本边缘函数代取：若 EdgeOne 海外节点未被 WAF 拦截，则前端/CI 均可经同源 /api/csi-pe 消费。
 *
 * 计算：对每个指数取官方日史序列，输出
 *   pe       最新交易日 PE(TTM)
 *   pct_all  最新 PE 在「全部历史」中的分位（0-100）
 *   pct_5y   最新 PE 在「近5年(约1210个交易日)」中的分位
 *   pct_3y   最新 PE 在「近3年(约726个交易日)」中的分位
 *   n        历史样本数；first/last 历史起止日期
 *
 * 安全：仅允许 6 位数字指数代码；只读官方公开接口，无密钥。
 */

const CSI_BASE = 'https://www.csindex.com.cn/csindex-home/perf/indexCsiDsPe'
const TIMEOUT_MS = 11000

// 定投助手默认指数全集（国证3000 不存在，见交付说明；第 7 个以 000985 中证全指占位，可改）
const DEFAULT_CODES = ['000300', '000905', '000906', '000852', '000510', '932000', '000985']

// ===== 缓存层（方案 A）：优先读 dtip_pe_history，csindex 实时仅兜底 =====
// anon key 为 publishable（前端 bundle 已用），嵌于边缘函数无保密风险。
const SUPABASE_URL = 'https://tqhtegazxykkqfcpejky.supabase.co'
const ANON_KEY = 'sb_publishable_iFtMcvav774gqF28gGYQVw_QMmuS-z3'

/** 经 Supabase anon REST 读取缓存表（SELECT 受 anon_select_dtip_pe 策略放行） */
async function sbSelect(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}&apikey=${ANON_KEY}`
  const res = await fetch(url, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error('sb ' + res.status)
  return res.json()
}

/** 从缓存表读最新一行 + 全史聚合（n/first/last），命中返回对象，未命中/异常返回 null */
async function fetchOneCache(code) {
  try {
    const latest = await sbSelect(
      `dtip_pe_history?select=pe,pct_all,pct_5y,pct_3y,name,trade_date` +
      `&index_code=eq.${code}&order=trade_date.desc&limit=1`
    )
    if (!Array.isArray(latest) || !latest.length) return null
    const row = latest[0]
    const agg = await sbSelect(
      `dtip_pe_history?select=count(),min(trade_date),max(trade_date)` +
      `&index_code=eq.${code}`
    )
    const a = (Array.isArray(agg) && agg[0]) || {}
    const n = a.count != null ? Number(a.count) : null
    return {
      code,
      name: row.name || '',
      ok: true,
      date: row.trade_date,
      pe: Number(row.pe),
      pct_all: Number(row.pct_all),
      pct_5y: Number(row.pct_5y),
      pct_3y: Number(row.pct_3y),
      n,
      first: a.min || null,
      last: a.max || null,
      source: 'cache',
    }
  } catch (e) {
    return null
  }
}

/** 计算 value 在升序数组中的百分位（0-100，含自身） */
function percentile(sortedAsc, value) {
  if (!sortedAsc.length || value == null) return null
  let lo = 0, hi = sortedAsc.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sortedAsc[mid] <= value) lo = mid + 1
    else hi = mid
  }
  // lo = 小于等于 value 的个数；用 (count-1)/(n-1) 或 count/n 均可，这里用 count/n*100 四舍五入
  return Math.round((lo / sortedAsc.length) * 10000) / 100
}

async function fetchOneLive(code) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${CSI_BASE}?indexCode=${code}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': `https://www.csindex.com.cn/zh-CN/indices/index-detail/${code}`,
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return { code, ok: false, http: res.status }
    const json = await res.json()
    const rows = (json && json.data) || []
    if (!rows.length) return { code, ok: false, http: res.status, msg: json && json.msg }
    // 官方字段名为 peg（实为 PE-TTM 数值）；按日期升序
    const series = rows
      .map(r => ({ d: String(r.tradeDate || ''), pe: Number(r.peg) }))
      .filter(r => r.d && isFinite(r.pe) && r.pe > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { code, ok: false, http: res.status, msg: 'no valid pe rows' }
    const pes = series.map(r => r.pe)
    const latest = series[series.length - 1]
    const asc = pes.slice().sort((a, b) => a - b)
    const tail = (n) => (pes.length > n ? pes.slice(pes.length - n) : pes).slice().sort((a, b) => a - b)
    return {
      code,
      name: rows[rows.length - 1].indexName || '',
      ok: true,
      date: latest.d,
      pe: latest.pe,
      pct_all: percentile(asc, latest.pe),
      pct_5y: percentile(tail(1210), latest.pe),
      pct_3y: percentile(tail(726), latest.pe),
      n: series.length,
      first: series[0].d,
      last: latest.d,
    }
  } catch (e) {
    return { code, ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

/** 优先读缓存，未命中或异常则回退 csindex 实时取数 */
async function fetchOne(code) {
  const cached = await fetchOneCache(code)
  if (cached && cached.ok && isFinite(cached.pe)) return cached
  return fetchOneLive(code)
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const raw = (url.searchParams.get('codes') || '').trim()
  let codes = raw
    ? raw.split(',').map(s => s.trim()).filter(s => /^\d{6}$/.test(s))
    : DEFAULT_CODES
  if (!codes.length) codes = DEFAULT_CODES
  if (codes.length > 12) codes = codes.slice(0, 12)

  const results = await Promise.all(codes.map(fetchOne))
  const okCount = results.filter(r => r.ok).length
  const allCache = results.length > 0 && results.every(r => r.ok && r.source === 'cache')
  return new Response(JSON.stringify({
    source: allCache ? 'dtip_pe_history (cached)' : 'csindex.com.cn',
    ok: okCount,
    total: results.length,
    data: results,
    ts: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
