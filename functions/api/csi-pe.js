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

async function fetchOne(code) {
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
  return new Response(JSON.stringify({
    source: 'csindex.com.cn',
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
