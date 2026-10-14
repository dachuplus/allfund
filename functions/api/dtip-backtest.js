/**
 * EdgeOne Pages Function — 定投助手回测引擎（walk-forward 估值分位定投）
 * 路由：GET /api/dtip-backtest?codes=000300,000905&weeks=52
 *
 * 逻辑：
 *   对过去 N 周（默认 52 周 ≈ 1 年）的每一个周一（对齐真实交易日），
 *   用「截至该周一的 PE 全史」计算 PE 历史分位 → 映射 5 档估值区间
 *   → 得到该周定投金额（低估多买 / 高估少买 / 极高卖出）
 *   → 以该周一收盘价买入（或卖出 3000 元）对应份额，walk-forward 累积。
 *   期末以最新收盘价计市值，统计累计净投入、当前市值、累计收益、收益率、XIRR 等。
 *
 * 数据源：
 *   - PE 全史：中证指数官网 csindex.com.cn（与 /api/csi-pe 同源，海外边缘节点可达）
 *   - 历史收盘：腾讯财经 K 线 web.ifzq.gtimg.cn（主，覆盖 6/7 指数且为最新数据）
 *              / 新浪财经 K 线（回退，沪市 5 大指数可用，但中证全指偏陈旧）
 *   注：东方财富 push2his 在 EdgeOne 海外节点被墙（返回空），已移除，避免 11s 级超时拖垮整批。
 *   中证2000(932000) 在免费可直连源均无历史行情，回测对其返回「暂不支持」并保留在估值看板。
 *
 * 安全：仅允许 6 位数字指数代码；只读公开接口，无密钥。
 */

const CSI_BASE = 'https://www.csindex.com.cn/csindex-home/perf/indexCsiDsPe'
const TENCENT_KLINE = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get'
const SINA_KLINE = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData'
const TIMEOUT_MS = 11000

// 定投助手默认指数全集（与 DtipPanel.vue / csi-pe.js 保持一致）
const DEFAULT_CODES = ['000300', '000905', '000906', '000852', '000510', '932000', '000985']

// 5 档估值区间 → 每周定投金额（与 DtipPanel.vue ZONES 一致）
const ZONES = [
  { key: 'deep_low',  label: '极度低估', min: 0,      max: 10,       amount:  3000 },
  { key: 'low',       label: '低估',   min: 10,     max: 30,       amount:  2000 },
  { key: 'normal',    label: '估值合理', min: 30,     max: 70,       amount:  1000 },
  { key: 'high',      label: '高估',   min: 70,     max: 90,       amount:   500 },
  { key: 'deep_high', label: '极度高估', min: 90,     max: Infinity, amount: -3000 },
]

// ===== 工具 =====
function normDateCsi(s) {
  // "20110628" → "2011-06-28"
  if (!s || s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}
function normNum(v) {
  const n = Number(v)
  return isFinite(n) ? n : null
}
/** value 在升序数组中的百分位（0-100，含自身） */
function percentile(sortedAsc, value) {
  if (!sortedAsc.length || value == null) return null
  let lo = 0, hi = sortedAsc.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sortedAsc[mid] <= value) lo = mid + 1
    else hi = mid
  }
  return Math.round((lo / sortedAsc.length) * 10000) / 100
}
function zoneOf(pct) {
  if (pct == null) return { key: 'unknown', label: '数据缺失', amount: 0 }
  for (const z of ZONES) {
    if (pct >= z.min && pct < z.max) return z
  }
  return ZONES[ZONES.length - 1]
}
/** 现金流 XIRR（年化），flows: [{t:Date, cf:Number}]，买入为负、卖出/期末为正 */
function solveXirr(flows) {
  if (!flows || flows.length < 2) return null
  const t0 = flows.reduce((m, f) => (f.t < m ? f.t : m), flows[0].t)
  const npv = (r) => flows.reduce((s, f) => {
    const yrs = (f.t - t0) / (365 * 86400000)
    return s + f.cf / Math.pow(1 + r, yrs)
  }, 0)
  let lo = -0.9999, hi = 10
  let fLo = npv(lo), fHi = npv(hi)
  let guard = 0
  while (fLo * fHi > 0 && guard < 40) { hi *= 10; fHi = npv(hi); guard++ }
  if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return null
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-10) return mid
    if (fLo * fMid <= 0) { hi = mid; fHi = fMid } else { lo = mid; fLo = fMid }
  }
  return (lo + hi) / 2
}

// ===== 数据拉取 =====
async function fetchPeSeries(code) {
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
    if (!res.ok) return { ok: false, http: res.status }
    const json = await res.json()
    const rows = (json && json.data) || []
    const series = rows
      .map(r => ({ d: normDateCsi(String(r.tradeDate || '')), pe: normNum(r.peg) }))
      .filter(r => r.d && r.pe && r.pe > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { ok: false, msg: 'no valid pe rows' }
    return { ok: true, series, name: rows[rows.length - 1].indexName || '', lastDate: series[series.length - 1].d }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

// 新浪 K 线：sh/sz 前缀
async function fetchCloseSina(code) {
  const prefix = code.startsWith('932') ? 'sz' : 'sh'
  const symbol = `${prefix}${code}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${SINA_KLINE}?symbol=${symbol}&scale=240&ma=no&datalen=2000`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://finance.sina.com.cn/',
      },
    })
    if (!res.ok) return { ok: false, http: res.status }
    const rows = await res.json()
    if (!Array.isArray(rows) || !rows.length) return { ok: false, msg: 'empty' }
    const series = rows
      .map(r => ({ d: String(r.day || '').slice(0, 10), close: normNum(r.close) }))
      .filter(r => r.d && r.close > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { ok: false, msg: 'no valid close' }
    const last = series[series.length - 1].d
    return { ok: true, series, source: 'sina', lastDate: last }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

// 腾讯财经 K 线（主源）：web.ifzq.gtimg.cn，返回 data[sym].day = [[date,open,close,high,low,vol],...]
async function fetchCloseTencent(code) {
  const symbol = `sh${code}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${TENCENT_KLINE}?param=${symbol},day,,,1500,qfq`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://gu.qq.com/',
      },
    })
    if (!res.ok) return { ok: false, http: res.status }
    const json = await res.json()
    const node = (json && json.data && json.data[symbol]) || {}
    const rows = node.qfqday || node.day || []
    if (!Array.isArray(rows) || !rows.length) return { ok: false, msg: 'empty' }
    const series = rows
      .map(r => (Array.isArray(r) ? { d: String(r[0]).slice(0, 10), close: normNum(r[2]) } : null))
      .filter(r => r && r.d && r.close > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { ok: false, msg: 'no valid close' }
    return { ok: true, series, source: 'tencent', lastDate: series[series.length - 1].d }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchClose(code) {
  // 主源：腾讯财经 K 线（覆盖 6/7 指数，且为最新数据；中证2000 无历史 → 回退）
  const tx = await fetchCloseTencent(code)
  if (tx.ok) return tx
  // 回退：新浪（沪市 5 大指数可用，但中证全指偏陈旧；仅作主源失败兜底）
  const sina = await fetchCloseSina(code)
  if (sina.ok) return sina
  return tx.ok ? tx : sina
}

// ===== 回测核心（walk-forward）=====
function backtest(peResult, closeResult, weeks) {
  const peSeries = peResult.series
  const closeSeries = closeResult.series
  if (!peSeries.length || !closeSeries.length) {
    return { ok: false, reason: 'insufficient data', peRows: peSeries.length, closeRows: closeSeries.length }
  }
  // 取收盘价序列中的周一（真实交易日），取最近 weeks 个
  const mondays = closeSeries.filter(r => {
    const dt = new Date(r.d + 'T00:00:00')
    return dt.getDay() === 1
  })
  const window = mondays.slice(Math.max(0, mondays.length - weeks))
  if (!window.length) {
    return { ok: false, reason: 'no monday in window' }
  }

  const trades = []
  let shares = 0, costBasis = 0, totalInvested = 0, totalWithdrawn = 0
  for (const m of window) {
    const pePrefix = peSeries.filter(p => p.d <= m.d)
    if (pePrefix.length < 2) continue
    const peAtM = pePrefix[pePrefix.length - 1].pe
    const asc = pePrefix.map(p => p.pe).sort((a, b) => a - b)
    const pct = percentile(asc, peAtM)
    const zone = zoneOf(pct)
    const amount = zone.amount
    if (!amount) continue
    const price = m.close
    if (price <= 0) continue

    if (amount > 0) {
      const addSh = amount / price
      shares += addSh
      costBasis += amount
      totalInvested += amount
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'buy', amount, price, sharesAdded: addSh, sharesAfter: shares, valueAfter: shares * price })
    } else {
      const sellAmt = -amount
      const wantSh = sellAmt / price
      const soldSh = Math.min(wantSh, shares)
      const costOfSold = shares > 0 ? (soldSh / shares) * costBasis : 0
      const proceeds = soldSh * price
      shares -= soldSh
      costBasis -= costOfSold
      totalWithdrawn += proceeds
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'sell', amount, price, sharesAdded: -soldSh, sharesAfter: shares, valueAfter: shares * price })
    }
  }

  const lastClose = closeSeries[closeSeries.length - 1]
  const latestPrice = lastClose.close
  const marketValue = shares * latestPrice
  const netInvested = totalInvested - totalWithdrawn
  const totalProfit = marketValue - netInvested
  const profitPct = netInvested > 0 ? totalProfit / netInvested : (netInvested === 0 ? (totalProfit > 0 ? 1 : 0) : null)

  // XIRR
  const flows = []
  for (const t of trades) {
    flows.push({ t: new Date(t.date + 'T00:00:00'), cf: -t.amount })
  }
  flows.push({ t: new Date(), cf: marketValue })
  const irr = (trades.length >= 2) ? solveXirr(flows) : null

  // 当前（最新交易日）估值区间与本周计划
  const lastPe = peSeries[peSeries.length - 1]
  const allPeAsc = peSeries.map(p => p.pe).sort((a, b) => a - b)
  const pctLast = percentile(allPeAsc, lastPe.pe)
  const zoneLast = zoneOf(pctLast)

  return {
    ok: true,
    code: peResult.code,
    name: peResult.name,
    weeksRequested: weeks,
    weeksActual: window.length,
    startDate: window[0].d,
    endDate: window[window.length - 1].d,
    latestDate: lastClose.d,
    peLast: lastPe.pe,
    pctLast,
    zoneLast: zoneLast.label,
    zoneLastKey: zoneLast.key,
    amountLast: zoneLast.amount,
    priceLast: latestPrice,
    trades,
    totalInvested,
    totalWithdrawn,
    netInvested,
    shares,
    latestPrice,
    marketValue,
    totalProfit,
    profitPct,
    irr,
    closeSource: closeResult.source,
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const raw = (url.searchParams.get('codes') || '').trim()
  let codes = raw
    ? raw.split(',').map(s => s.trim()).filter(s => /^\d{6}$/.test(s))
    : DEFAULT_CODES.slice()
  if (!codes.length) codes = DEFAULT_CODES.slice()
  if (codes.length > 12) codes = codes.slice(0, 12)
  const weeks = Math.min(520, Math.max(4, parseInt(url.searchParams.get('weeks') || '52', 10) || 52))

  const results = await Promise.all(codes.map(async (code) => {
    const pe = await fetchPeSeries(code)
    if (!pe.ok) {
      return { code, ok: false, reason: 'pe fetch failed', detail: pe }
    }
    const close = await fetchClose(code)
    if (!close.ok) {
      return { code, ok: false, name: pe.name, reason: 'close fetch failed', detail: close }
    }
    const r = backtest({ ...pe, code }, close, weeks)
    return { ...r, code }
  }))

  const okList = results.filter(r => r.ok)
  // 组合汇总（等权累加：各指数独立账户）
  let agg = null
  if (okList.length) {
    let totalInvested = 0, totalWithdrawn = 0, marketValue = 0, shares = 0
    for (const r of okList) {
      totalInvested += r.totalInvested
      totalWithdrawn += r.totalWithdrawn
      marketValue += r.marketValue
      shares += r.shares
    }
    const netInvested = totalInvested - totalWithdrawn
    const totalProfit = marketValue - netInvested
    agg = {
      indices: okList.length,
      totalInvested,
      totalWithdrawn,
      netInvested,
      shares,
      marketValue,
      totalProfit,
      profitPct: netInvested > 0 ? totalProfit / netInvested : null,
    }
  }

  return new Response(JSON.stringify({
    source: 'csindex.com.cn (PE) + tencent/sina (close)',
    weeks,
    ok: okList.length,
    total: results.length,
    summary: agg,
    data: results,
    ts: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=600',
    },
  })
}
