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

// 10 年回测约需 2600+ 个交易日；留出余量，确保能取到最近 ~520 个周一
const KLINE_COUNT = 3200

// 定投助手默认指数全集（与 DtipPanel.vue / csi-pe.js 保持一致）
const DEFAULT_CODES = ['000300', '000905', '000906', '000852', '000510', '932000', '000985']

// ===== 缓存层（方案 A）：优先读 dtip_pe_history 全量序列，csindex 实时仅兜底 =====
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
  const npv = (r) => {
    let s = 0
    for (const f of flows) {
      const yrs = (f.t - t0) / (365 * 86400000)
      s += f.cf / Math.pow(1 + r, yrs)
    }
    return s
  }
  // 扫描多个利率点，寻找 NPV 变号区间后再二分（比单一 [-0.9999,10] 括号更鲁棒，
  // 避免 npv(10) 因浮点舍入约等于 0 导致括号失效返回 null 的情况）。
  const pts = [-0.9999, -0.9, -0.5, -0.2, 0, 0.2, 0.5, 1, 2, 5, 10, 50]
  let prevR = null, prevV = null
  for (const r of pts) {
    const v = npv(r)
    if (prevV !== null && isFinite(prevV) && isFinite(v)) {
      if (prevV === 0) return prevR
      if (v === 0) return r
      if ((prevV < 0 && v > 0) || (prevV > 0 && v < 0)) {
        let lo = prevR, hi = r, fLo = prevV, fHi = v
        for (let k = 0; k < 100; k++) {
          const mid = (lo + hi) / 2
          const fMid = npv(mid)
          if (!isFinite(fMid) || Math.abs(fMid) < 1e-9) return mid
          if (fLo * fMid <= 0) { hi = mid; fHi = fMid } else { lo = mid; fLo = fMid }
        }
        return (lo + hi) / 2
      }
    }
    prevR = r; prevV = v
  }
  return null
}

// ===== 数据拉取 =====

/** 缓存读：从 dtip_pe_history 分页拉全量 PE 序列（升序），命中返回 {ok, series:[{d,pe}], name, lastDate} */
async function fetchPeSeriesCache(code) {
  try {
    const all = []
    let offset = 0
    const LIMIT = 1000
    let name = ''
    while (true) {
      const page = await sbSelect(
        `dtip_pe_history?select=trade_date,pe,name` +
        `&index_code=eq.${code}&order=trade_date.asc&limit=${LIMIT}&offset=${offset}`
      )
      if (!Array.isArray(page) || !page.length) break
      for (const r of page) {
        if (r.name) name = r.name
        all.push({ d: String(r.trade_date), pe: Number(r.pe) })
      }
      if (page.length < LIMIT) break
      offset += LIMIT
    }
    if (!all.length) return { ok: false }
    all.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    return { ok: true, series: all, name, lastDate: all[all.length - 1].d }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  }
}

async function fetchPeSeriesLive(code) {
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

/** 优先读缓存全量序列，未命中或异常则回退 csindex 实时取数 */
async function fetchPeSeries(code) {
  const cached = await fetchPeSeriesCache(code)
  if (cached.ok && cached.series.length) return cached
  return fetchPeSeriesLive(code)
}

// 新浪 K 线：sh/sz 前缀
async function fetchCloseSina(code) {
  const prefix = code.startsWith('932') ? 'sz' : 'sh'
  const symbol = `${prefix}${code}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${SINA_KLINE}?symbol=${symbol}&scale=240&ma=no&datalen=${KLINE_COUNT}`, {
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
    const res = await fetch(`${TENCENT_KLINE}?param=${symbol},day,,,${KLINE_COUNT},qfq`, {
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
// 模型：以「初始本金 initCapital」为唯一外部资本，每周一按估值分位在 现金↔权益 间调仓：
//   - 买入区：从现金池按 zone 金额买入（现金不足则满仓，不再买入）
//   - 极度高估区：卖出 zone 金额对应的份额（**仅当实际持有时才卖；无持仓则跳过**，不能卖出没有的份额）
// 期末组合现值 = 持仓市值(份额×最新价) + 剩余现金；收益率以初始本金为分母。
// XIRR 仅含「期初本金流出」与「期末组合现值流入」两笔外部现金流（内部买卖为组合内调仓）。
const INIT_CAPITAL = 100000

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
  let shares = 0, costBasis = 0
  let cash = INIT_CAPITAL
  let totalInvested = 0   // 累计从现金池投入权益
  let totalWithdrawn = 0  // 累计从权益赎回至现金池

  // 预计算「每一个 PE 点相对其历史至今的百分位」一次（O(n log n)），
  // 避免在 520 个周一循环里反复排序整段 PE 序列导致边缘函数超时。
  const pctSeries = new Array(peSeries.length)
  const running = []
  for (let i = 0; i < peSeries.length; i++) {
    const pe = peSeries[i].pe
    let lo = 0, hi = running.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (running[mid] <= pe) lo = mid + 1
      else hi = mid
    }
    running.splice(lo, 0, pe)
    pctSeries[i] = Math.round((lo / running.length) * 10000) / 100
  }

  for (const m of window) {
    const pePrefix = peSeries.filter(p => p.d <= m.d)
    if (pePrefix.length < 2) continue
    const pct = pctSeries[pePrefix.length - 1]
    const zone = zoneOf(pct)
    const amount = zone.amount
    if (!amount) continue
    const price = m.close
    if (price <= 0) continue

    if (amount > 0) {
      // 买入：从现金池支出，封顶可用现金（满仓后不再买入）
      const buyAmt = Math.min(amount, cash)
      if (buyAmt <= 0) continue
      const addSh = buyAmt / price
      shares += addSh
      costBasis += buyAmt
      cash -= buyAmt
      totalInvested += buyAmt
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'buy', amount: buyAmt, price, sharesAdded: addSh, sharesAfter: shares, valueAfter: shares * price + cash })
    } else {
      // 卖出：赎回 zone 金额对应份额，封顶实际持仓市值；**无持仓则跳过**
      const sellAmt = -amount
      const holdingsValue = shares * price
      const execAmt = Math.min(sellAmt, holdingsValue)
      if (execAmt <= 0) continue
      const soldSh = execAmt / price
      const costOfSold = shares > 0 ? (soldSh / shares) * costBasis : 0
      cash += execAmt
      shares -= soldSh
      costBasis -= costOfSold
      totalWithdrawn += execAmt
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'sell', amount: -execAmt, price, sharesAdded: -soldSh, sharesAfter: shares, valueAfter: shares * price + cash })
    }
  }

  const lastClose = closeSeries[closeSeries.length - 1]
  const latestPrice = lastClose.close
  const equity = shares * latestPrice
  const portfolioValue = equity + cash

  // XIRR：仅期初本金流出 + 期末组合现值流入（内部买卖非外部现金流）
  const flows = [{ t: new Date(window[0].d + 'T00:00:00'), cf: -INIT_CAPITAL }]
  flows.push({ t: new Date(), cf: portfolioValue })
  const irr = solveXirr(flows)

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
    initCapital: INIT_CAPITAL,
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
    netInvested: INIT_CAPITAL,
    cash,
    shares,
    equity,
    marketValue: portfolioValue,
    totalProfit: portfolioValue - INIT_CAPITAL,
    profitPct: (portfolioValue - INIT_CAPITAL) / INIT_CAPITAL,
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

  // 串行处理各指数：边缘函数对「并发出网连接数」有限额，
  // 一次性 Promise.all 多指数（6+ 并发 fetch）会触发限额导致整体失败。
  // 串行保证任意时刻最多 2 个并发 fetch（单指数内 PE+收盘并行），且单指数远低于函数超时。
  const results = []
  for (const code of codes) {
    const pe = await fetchPeSeries(code)
    if (!pe.ok) {
      results.push({ code, ok: false, reason: 'pe fetch failed', detail: pe })
      continue
    }
    const close = await fetchClose(code)
    if (!close.ok) {
      results.push({ code, ok: false, name: pe.name, reason: 'close fetch failed', detail: close })
      continue
    }
    results.push({ ...backtest({ ...pe, code }, close, weeks), code })
  }

  const okList = results.filter(r => r.ok)
  // 组合汇总（等权累加：各指数独立 100k 资金池）
  let agg = null
  if (okList.length) {
    let totalInvested = 0, totalWithdrawn = 0, marketValue = 0, shares = 0
    for (const r of okList) {
      totalInvested += r.totalInvested
      totalWithdrawn += r.totalWithdrawn
      marketValue += r.marketValue
      shares += r.shares
    }
    const netInvested = INIT_CAPITAL * okList.length
    const totalProfit = marketValue - netInvested
    agg = {
      indices: okList.length,
      initCapital: INIT_CAPITAL,
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
