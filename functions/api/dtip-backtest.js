/**
 * EdgeOne Pages Function — 定投助手回测引擎（walk-forward 估值分位定投）
 * 路由：GET /api/dtip-backtest?codes=000300,000905&weeks=52
 *
 * 逻辑：
 *   对过去 N 周（默认 52 周 ≈ 1 年）的每一个周一（对齐真实交易日），
 *   用「截至该周一、前推 5 年滚动窗口内的 PE 分布」计算估值分位（trailing percentile）
 *   → 映射 5 档估值区间 → 得到该周操作（低估买 / 合理买 / 高估观望 / 极度高估按比例卖出）
 *   → 以该周一收盘价成交，walk-forward 累积。
 *   模型为「上班族周度固定金额定投」：每个买入档对应一个固定周投入额（极度低估3000/低估2000/合理1000），
 *   该金额作为当周外部现金流出；极度高估按持仓市值 10% 赎回落袋；期末组合现值 = 剩余持仓市值 + 累计落袋现金。
 *   收益率 = (组合现值 − 累计投入) / 累计投入；XIRR 为按每周实际现金流的资金加权年化收益率。
 *
 * 【2026-10-22 改版】由「一次性 10 万本金资金池」改为「每周固定金额定投」模型：
 *   原模型下每周仅投 150/300/450 元，是被「资金不能耗尽」约束反推出来的，对用户而言既不好执行、
 *   也不符合真实工资定投习惯；且整笔本金躺在账上导致 XIRR 被闲置现金摊薄。新模型改为每周外部固定投入，
 *   无枯竭风险，XIRR 即为真正的资金加权定投收益率。估值分位口径维持滚动 5 年（PCT_WINDOW_DAYS=1825）。
 *
 * 数据源：
 *   - PE 全史：中证指数官网 csindex.com.cn（与 /api/csi-pe 同源，海外边缘节点可达）
 *   - 历史收盘：腾讯财经 K 线 web.ifzq.gtimg.cn（主，覆盖沪深300/500/800/1000/A500/全指且为最新数据）
 *              / 新浪财经 K 线（回退，沪市指数可用，但海外节点偏陈旧）
 *              / 东方财富 push2his（兜底，仅当腾讯+新浪都取空时调用，如中证2000 932000 在腾讯/新浪免费源无日线
 *                但东财 push2his(secid=2.932000) 有完整历史；实测 EdgeOne 海外节点可直连，须带 ut 参数+完整 fields）
 *   中证2000(932000) 在腾讯/新浪免费源无历史行情，现已由东方财富 push2his 兜底，回测可用（PE 历史自 2023-06 起，故有效回测约 3 年）。
 *
 * 安全：仅允许 6 位数字指数代码；只读公开接口，无密钥。
 */

const CSI_BASE = 'https://www.csindex.com.cn/csindex-home/perf/indexCsiDsPe'
const TENCENT_KLINE = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get'
const SINA_KLINE = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData'
const TIMEOUT_MS = 11000

// 10 年回测约需 2600+ 个交易日；留出余量，确保能取到最近 ~520 个周一
const KLINE_COUNT = 3200
// 腾讯 K 线 datalen 超过 2000 会返回异常结构（数组而非对象，param error），故腾讯单独限 2000。
// 2000 日线 ≈ 7.7 年，叠加新浪（更长历史）按日期合并取并集后可覆盖 10 年窗口。
const TENCENT_MAX = 2000

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

// 5 档估值区间 → 每周操作（与 DtipPanel.vue ZONES 一致）
// 【2026-10-22 改版】改为「上班族周度固定金额定投」模型：每个买入档位对应一个固定周投入额，
//   极度低估 3000 / 低估 2000 / 估值合理 1000；高估(70-90 分位) 观望不操作；极度高估(≥90) 按持仓市值 10% 卖出落袋。
//   不再使用「一次性 10 万本金资金池」模型——那个模型下 150/300/450 的金额是被「资金不能耗尽」反推出来的，
//   对用户而言「每周才买 150 元」既不好执行也不符合真实工资定投习惯。改为每周外部固定投入后，
//   本金不再有枯竭风险，XIRR 也变为真正的「资金加权定投收益率」。
//   估值分位口径：滚动 5 年（PCT_WINDOW_DAYS=1825），详见 buildPctSeries。
const ZONES = [
  { key: 'deep_low',  label: '极度低估', min: 0,  max: 10,       amount:  3000, mode: 'buy',        action: '买入 3000 元' },
  { key: 'low',       label: '低估',   min: 10, max: 30,       amount:  2000, mode: 'buy',        action: '买入 2000 元' },
  { key: 'normal',    label: '估值合理', min: 30, max: 70,       amount:  1000, mode: 'buy',        action: '买入 1000 元' },
  { key: 'high',      label: '高估',   min: 70, max: 90,       amount:  0,   mode: 'hold',       action: '观望不操作' },
  { key: 'deep_high', label: '极度高估', min: 90, max: Infinity, amount:  0,   mode: 'trim',       action: '卖出持仓 10%', sellPct: 0.10 },
]
// 极度高估时按「持仓市值的比例」赎回落袋（而非固定金额），
// 使落袋额随持仓规模自动伸缩：仓位重时回收多、仓位轻时回收少，避免把仓位一次性清空或永远回不了本。
const SELL_RATIO = 0.10
// 【2026-10-22 选项 B】上班族现金流护栏：按月薪 5 万设定，每月最多从工资中投 2.5 万。
// 回测按自然月累计买入额，达到上限后当月剩余买入信号按剩余额度部分成交或跳过，次月自动重置。
// 注意：在当前档位（极度低估3000/低估2000/合理1000）下，单月最多约 5 个买入周 × 3000 = 1.5 万，
// 恒小于 2.5 万上限，故默认参数下该护栏不会触发（结构性上限，档位上调后才真正约束）。
const MONTHLY_SALARY = 50000
const MONTHLY_INVEST_CAP = 25000
// 分位锚采用滚动窗口（trailing window）而非「发布至今全史」，避免早年高 PE 体制长期污染分位判定
const PCT_WINDOW_DAYS = 1825   // 5 年
const PCT_MIN_OBS = 100        // 滚动窗口内样本不足时，回退到全史分位

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
function zoneOf(pct) {
  if (pct == null) return { key: 'unknown', label: '数据缺失', amount: 0, mode: 'hold', action: '观望不操作' }
  for (const z of ZONES) {
    if (pct >= z.min && pct < z.max) return z
  }
  return ZONES[ZONES.length - 1]
}
/** 升序数组 a 中第一个 >= v 的下标；返回值使得 [0,pos) 全部 < v */
function lowerBound(a, v) {
  let lo = 0, hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] < v) lo = mid + 1
    else hi = mid
  }
  return lo
}
/** 升序数组 a 中第一个 > v 的下标；返回值即「<= v 的元素个数」（含自身，与旧版全史分位口径一致） */
function upperBound(a, v) {
  let lo = 0, hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] <= v) lo = mid + 1
    else hi = mid
  }
  return lo
}
/**
 * 预计算 PE 序列的「滚动窗口分位」：
 *   pctWin[i] = pe[i] 在 [i 之前 PCT_WINDOW_DAYS 天内的 PE 样本] 中的百分位
 *   pctAll[i] = pe[i] 在 [0..i] 全史样本中的百分位（滚动窗口样本不足时的回退值）
 * 用两个「可删元素的升序多重集」滑动维护，整体 O(n·W) 的内存搬移，避免每个周一重排序导致边缘函数超时。
 */
function buildPctSeries(peSeries) {
  const n = peSeries.length
  const pes = peSeries.map(p => p.pe)
  const ts = peSeries.map(p => new Date(p.d + 'T00:00:00Z').getTime())
  const cutoffMs = PCT_WINDOW_DAYS * 86400000
  const win = []      // 滚动窗口内的升序 PE
  const all = []      // 全史升序 PE
  const pctWin = new Array(n).fill(null)
  const pctAll = new Array(n).fill(null)
  const winLen = new Array(n).fill(0)
  let start = 0       // 滚动窗口左端下标
  for (let i = 0; i < n; i++) {
    const pe = pes[i]
    win.splice(lowerBound(win, pe), 0, pe)
    all.splice(lowerBound(all, pe), 0, pe)
    // 左端过期样本出窗（同值多处时删任意一个即可，分位计数不受影响）
    while (start <= i && ts[i] - ts[start] > cutoffMs) {
      const rp = lowerBound(win, pes[start])
      if (rp < win.length) win.splice(rp, 1)
      start++
    }
    const cntWin = upperBound(win, pe)   // <= 当前 PE 的样本数（含自身）
    const cntAll = upperBound(all, pe)
    if (win.length) pctWin[i] = Math.round((cntWin / win.length) * 10000) / 100
    pctAll[i] = Math.round((cntAll / all.length) * 10000) / 100
    winLen[i] = win.length
  }
  // 滚动窗口样本不足时回退全史；其余采用滚动窗口（各点独立判断）
  return pctWin.map((v, i) => (v != null && winLen[i] >= PCT_MIN_OBS ? v : pctAll[i]))
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
    return { ok: true, series: all, name, lastDate: all[all.length - 1].d, source: 'cache' }
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
    return { ok: true, series, name: rows[rows.length - 1].indexName || '', lastDate: series[series.length - 1].d, source: 'live' }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

/** 优先读缓存全量序列，未命中或异常则回退 csindex 实时取数（保留 cacheError 便于排查） */
async function fetchPeSeries(code) {
  const cached = await fetchPeSeriesCache(code)
  if (cached.ok && cached.series.length) return cached
  const live = await fetchPeSeriesLive(code)
  if (!cached.ok && cached.error) live.cacheError = cached.error
  return live
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
    const res = await fetch(`${TENCENT_KLINE}?param=${symbol},day,,,${TENCENT_MAX},qfq`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://gu.qq.com/',
      },
    })
    if (!res.ok) return { ok: false, http: res.status }
    const json = await res.json()
    // 防御：datalen 过大时腾讯返回的是数组 / 错误对象而非标准结构
    if (!json || typeof json !== 'object' || Array.isArray(json) || !json.data || !json.data[symbol]) {
      return { ok: false, msg: 'tencent bad structure' }
    }
    const node = json.data[symbol] || {}
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

// 东方财富 push2his 日线（回退源）：腾讯/新浪均缺失时兜底（如中证2000 932000
// 在腾讯/新浪免费源无日线，但东财 push2his 有完整历史，secid=2.932000）。
// 注意：必须带 ut 参数 + 完整 fields，否则返回空。
const EM_KLINE = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'
const EM_UT = 'fa5fd1943c7b386f172d6893dbfba10b'
async function fetchCloseEastmoney(code) {
  // 中证2000(932xxx) 在东方财富属深交所市场，secid=2.xxxxxx；其余中证系列属 1.xxxxxx
  const market = code.startsWith('932') ? '2' : '1'
  const secid = `${market}.${code}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = `${EM_KLINE}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&lmt=${KLINE_COUNT}&end=20500101&ut=${EM_UT}`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36' },
    })
    if (!res.ok) return { ok: false, http: res.status }
    const json = await res.json()
    const k = json && json.data
    const klines = (k && k.klines) || []
    if (!klines.length) return { ok: false, msg: 'empty' }
    const series = klines
      .map(r => {
        const p = String(r).split(',')
        return { d: String(p[0]).slice(0, 10), close: normNum(p[2]) }
      })
      .filter(r => r.d && r.close > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { ok: false, msg: 'no valid close' }
    return { ok: true, series, source: 'eastmoney', lastDate: series[series.length - 1].d }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

/** 合并多源收盘价序列：按日期去重取并集，优先保留较早来源之外的较新数据。
 *  解决单源从某些边缘节点返回陈旧数据（如新浪海外节点止于 2023）导致回测流水截断的问题。 */
function mergeCloseSeries(sources) {
  const map = new Map()
  for (const src of sources) {
    if (!src || !src.ok || !Array.isArray(src.series)) continue
    for (const r of src.series) {
      if (!r || !r.d || !(r.close > 0)) continue
      if (!map.has(r.d)) map.set(r.d, { d: r.d, close: r.close })
    }
  }
  const arr = Array.from(map.values())
  arr.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  return arr
}

async function fetchClose(code) {
  // 并发取腾讯（限 2000，当前数据）+ 新浪（更长历史），合并取并集。
  // 任一路从特定 IP 返回陈旧/失败时，另一路补齐，回测即可覆盖至最新。
  const [tx, sina] = await Promise.all([
    fetchCloseTencent(code),
    fetchCloseSina(code),
  ])
  const merged = mergeCloseSeries([tx, sina])
  if (merged.length) {
    const txLast = tx.ok && tx.series.length ? tx.series[tx.series.length - 1].d : ''
    const sinaLast = sina.ok && sina.series.length ? sina.series[sina.series.length - 1].d : ''
    const primary = (sinaLast >= txLast) ? 'sina' : 'tencent'
    return { ok: true, series: merged, source: `merged(${primary})`, lastDate: merged[merged.length - 1].d }
  }
  // 腾讯/新浪都取不到（如中证2000 在免费源无日线）→ 回退东方财富 push2his
  const em = await fetchCloseEastmoney(code)
  if (em.ok) return em
  return tx.ok ? tx : (sina.ok ? sina : tx)
}

// ===== 回测核心（walk-forward）=====
// 模型（2026-10-22 改版：上班族周度固定金额定投）：
//   不设固定本金池。每周一按估值分位判定：买入档从外部投入固定金额（极度低估3000/低估2000/合理1000），
//   该金额作为当周外部现金流出；极度高估档按持仓市值 10% 赎回，赎回款作为当周现金流入（落袋）；
//   高估档观望。期末组合现值 = 剩余持仓市值(份额×最新价) + 累计落袋现金；
//   收益率 = (组合现值 − 累计投入) / 累计投入；XIRR 为按每周实际现金流（买入负、赎回正、期末清算剩余持仓）的资金加权年化。
//   现金流护栏（选项 B）：每月累计买入不超过 MONTHLY_INVEST_CAP（月薪 5 万 → 月投上限 2.5 万），自然月重置。

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
  let cash = 0                  // 累计落袋现金（极度高估赎回款，期末计入总值）
  let totalInvested = 0        // 累计外部投入（各买入档固定金额之和）
  let totalWithdrawn = 0       // 累计赎回
  let buyWeeks = 0, sellWeeks = 0
  let monthKey = null          // 当前自然月（YYYY-MM），月度现金流护栏用
  let monthInvested = 0        // 当月累计买入额（受 MONTHLY_INVEST_CAP 约束）
  let capHitWeeks = 0          // 因月度封顶被缩减/跳过的买入周数

  // 预计算「每一个 PE 观测点在其之前 5 年滚动窗口内的分位」一次（滑动多重集，O(n·W) 内存搬移），
  // 避免在 520 个周一循环里反复排序整段 PE 序列导致边缘函数超时。
  const pctSeries = buildPctSeries(peSeries)

  let peCursor = 0             // PE 序列游标（按周一升序推进）
  const flows = []             // XIRR 外部现金流：买入为负、赎回为正、期末清算剩余持仓为正

  for (const m of window) {
    // 月度现金流护栏：自然月切换时重置当月已投额度（每月最多投 MONTHLY_INVEST_CAP）
    const ym = m.d.slice(0, 7)
    if (ym !== monthKey) { monthKey = ym; monthInvested = 0 }
    // 取「截至该周一已发布」的最后一个 PE 观测点（窗口按周一升序推进，用游标替代整段 filter，避免 O(n·weeks) 扫描）
    let peIdx = -1
    while (peCursor < peSeries.length && peSeries[peCursor].d <= m.d) peIdx = peCursor++
    if (peIdx < 1) continue
    const pct = pctSeries[peIdx]
    const zone = zoneOf(pct)
    const price = m.close
    if (price <= 0) continue
    // 高估区（mode='hold'）不做任何操作：既不买入也不卖出，等待估值进一步走向极端
    if (zone.mode === 'hold') {
      // zone.key === 'unknown' 表示该周一尚无 PE 数据，需与「主动观望」区分呈现
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'skip', skipReason: zone.key === 'unknown' ? 'no_data' : 'hold_zone', amount: 0, price, sharesAdded: 0, sharesAfter: shares, cashAfter: cash, valueAfter: shares * price + cash })
      continue
    }

    if (zone.mode === 'buy') {
      // 月度封顶：当月预算用尽则跳过买入；不足则按剩余额度部分成交
      const budgetLeft = MONTHLY_INVEST_CAP - monthInvested
      if (budgetLeft <= 0) {
        capHitWeeks++
        trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'skip', skipReason: 'monthly_cap', amount: 0, price, sharesAdded: 0, sharesAfter: shares, cashAfter: cash, valueAfter: shares * price + cash })
        continue
      }
      const amount = Math.min(zone.amount, budgetLeft)
      if (amount < zone.amount) capHitWeeks++
      const addSh = amount / price
      shares += addSh
      costBasis += amount
      monthInvested += amount
      // 注意：落袋现金（cash）不在低位自动复投——保持「固定金额买入」语义清晰，
      // 极度高估卖出的钱留在账上作为已兑现收益，仅随卖出累积、不被买入清零。
      totalInvested += amount
      buyWeeks++
      flows.push({ t: new Date(m.d + 'T00:00:00'), cf: -amount })
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'buy', amount, price, sharesAdded: addSh, sharesAfter: shares, cashAfter: cash, valueAfter: shares * price + cash })
    } else {
      // trim：按持仓市值比例赎回落袋
      const sellPct = zone.sellPct || SELL_RATIO
      const execAmt = shares * price * sellPct
      if (execAmt <= 0.01) {
        // 无持仓可卖：估值信号为卖出，但无可卖份额；记录「跳过」行
        trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'skip', skipReason: 'no_holding', amount: 0, price, sharesAdded: 0, sharesAfter: shares, cashAfter: cash, valueAfter: shares * price + cash })
        continue
      }
      const soldSh = execAmt / price
      const costOfSold = shares > 0 ? (soldSh / shares) * costBasis : 0
      cash += execAmt
      shares -= soldSh
      costBasis -= costOfSold
      totalWithdrawn += execAmt
      sellWeeks++
      flows.push({ t: new Date(m.d + 'T00:00:00'), cf: execAmt })
      trades.push({ date: m.d, zone: zone.label, zoneKey: zone.key, type: 'sell', sellPct, amount: execAmt, price, sharesAdded: -soldSh, sharesAfter: shares, cashAfter: cash, valueAfter: shares * price + cash })
    }
  }

  const lastClose = closeSeries[closeSeries.length - 1]
  const latestPrice = lastClose.close
  const equity = shares * latestPrice
  const cashFromSells = cash
  const marketValue = equity + cashFromSells

  // XIRR：外部现金流（买入负、赎回正），期末仅清算剩余持仓市值（落袋现金已在赎回周计入，避免重复）
  flows.push({ t: new Date(), cf: equity })
  const irr = solveXirr(flows)

  // 当前（最新交易日）的滚动 5 年分位与本周计划
  const lastPe = peSeries[peSeries.length - 1]
  const pctLast = pctSeries[peSeries.length - 1]
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
    amountLast: zoneLast.mode === 'buy' ? zoneLast.amount : 0,
    planLast: zoneLast.action,
    sellPctLast: zoneLast.sellPct || null,
    pctWindowDays: PCT_WINDOW_DAYS,
    sellRatio: SELL_RATIO,
    monthlySalary: MONTHLY_SALARY,
    monthlyInvestCap: MONTHLY_INVEST_CAP,
    capHitWeeks,
    buyWeeks, sellWeeks,
    priceLast: latestPrice,
    trades,
    totalInvested,
    totalWithdrawn,
    cash: cashFromSells,
    shares,
    equity,
    marketValue,
    totalProfit: marketValue - totalInvested,
    profitPct: totalInvested > 0 ? (marketValue - totalInvested) / totalInvested : null,
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
    results.push({ ...backtest({ ...pe, code }, close, weeks), code, peSource: pe.source })
  }

  const okList = results.filter(r => r.ok)
  // 组合汇总（各指数独立回测，等权累加）
  let agg = null
  if (okList.length) {
    let totalInvested = 0, totalWithdrawn = 0, marketValue = 0, cash = 0, equity = 0, shares = 0, capHitWeeks = 0
    for (const r of okList) {
      totalInvested += r.totalInvested
      totalWithdrawn += r.totalWithdrawn
      marketValue += r.marketValue
      cash += r.cash
      equity += r.equity
      shares += r.shares
      capHitWeeks += r.capHitWeeks || 0
    }
    const totalProfit = marketValue - totalInvested
    agg = {
      indices: okList.length,
      totalInvested,
      totalWithdrawn,
      cash,
      equity,
      shares,
      marketValue,
      totalProfit,
      capHitWeeks,
      profitPct: totalInvested > 0 ? totalProfit / totalInvested : null,
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
