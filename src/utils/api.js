/**
 * utils/api.js - 前端 API 层
 *
 * 数据获取统一入口：
 * - 开发环境：通过 Vite proxy 代理腾讯行情 / 蛋卷等第三方源
 * - 生产环境：优先 Supabase Edge Function，降级走 CORS 代理
 * - 腾讯行情API：直连（qt.gtimg.cn 无 CORS 限制）
 * - 东财 push2 API：直连（push2.eastmoney.com 支持 CORS）
 * - Supabase 数据库：通过 @supabase/supabase-js
 */

import { supabase, rewriteSupabaseUrl } from '../api/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const IS_DEV = import.meta.env.DEV

// ========== 宏观参考数据（独立 Edge Function） ==========

/**
 * 获取宏观参考数据（国债/SHIBOR/M2/CPI/PMI/沪深300估值）
 * 数据源：专属 Supabase Edge Function macro-data（服务端聚合东财+蛋卷，脱离已失效的 value500.com）
 * 该端点免鉴权、CORS 已开放，前端直接 GET 即可；失败返回 null（前端按空值优雅降级）。
 * 返回扁平 JSON：
 *   { bond:{date,yield10y,spread}, shibor:{date,on}, m2:{date,m2yoy}, cpi:{date,cpi}, pmi:{date,pmi}, pe300:{date,pe,pePercentile,pb} }
 * 单位：yield10y/spread(on)/cpi/shibor.on 为小数；m2.m2yoy/pmi/pe300.pePercentile 为百分数；spread 为 10Y-2Y 百分点。
 */
export async function fetchMacroData() {
  try {
    const res = await fetch(rewriteSupabaseUrl(`${SUPABASE_URL}/functions/v1/macro-data`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (data?.error) throw new Error(data.error)
    return data
  } catch (err) {
    console.error('[api] macro-data 获取失败:', err)
    return null
  }
}

// ========== 蛋卷基金估值 ==========

const DANJUAN_DEV_URL = '/api/danjuan/djapi/index_eva/dj'
const DANJUAN_API      = 'https://danjuanfunds.com/djapi/index_eva/dj'

/**
 * 获取蛋卷基金指数估值数据
 * 开发环境：通过 Vite proxy 直连
 * 生产环境：优先 Supabase Edge Function，降级走 CORS 代理
 * 返回：{ code: 0, data: [...], total: number, source: string }
 */
export async function fetchDanjuanEva() {
  try {
    let raw
    if (IS_DEV) {
      // 开发环境：Vite proxy
      const res = await fetch(DANJUAN_DEV_URL, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      raw = await res.json()
    } else {
      // 生产环境：优先专属 Edge Function（直连蛋卷，脱离已失效的 value500）
      try {
        const res = await fetch(rewriteSupabaseUrl(`${SUPABASE_URL}/functions/v1/danjuan-eva`), {
          method: 'GET',
          signal: AbortSignal.timeout(12000)
        })
        if (res.ok) {
          raw = await res.json()
        }
      } catch (efErr) {
        console.error('[api] danjuan-eva Edge Function 失败，降级 CORS 代理:', efErr)
      }
      // 降级：CORS 代理直连蛋卷 API
      if (!raw?.data?.items) {
        const res = await fetch(CORS_PROXY + encodeURIComponent(DANJUAN_API), {
          signal: AbortSignal.timeout(10000)
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        raw = await res.json()
      }
    }

    // 解析蛋卷返回格式
    if (!raw?.data?.items) return { code: -1, data: null, msg: '蛋卷数据格式异常' }
    const items = raw.data.items.map(item => ({
      name:        item.name,
      code:        item.index_code,
      ttype:       item.ttype,
      pe:          item.pe > 0           ? item.pe           : null,
      pePercentile: item.pe_percentile > 0 ? Math.round(item.pe_percentile * 10000) / 100 : null,
      pb:          item.pb > 0           ? item.pb           : null,
      pbPercentile: item.pb_percentile > 0 ? Math.round(item.pb_percentile * 10000) / 100 : null,
      dividendYield: item.yeild > 0         ? Math.round(item.yeild * 10000) / 100   : null,
      roe:         item.roe > 0          ? Math.round(item.roe * 10000) / 100    : null,
      peg:         item.peg > 0          ? item.peg          : null,
      evaType:     item.eva_type || '',
      evaText:     evaTypeText(item.eva_type),
      evaColor:    evaTypeColor(item.eva_type),
      date:         item.date || '',
    }))
    return { code: 0, data: items, total: items.length, source: 'danjuanfunds.com' }
  } catch (err) {
    return { code: -1, data: null, msg: err.message }
  }
}

function evaTypeText(type) {
  if (type === 'low')    return '低估'
  if (type === 'normal') return '适中'
  if (type === 'high')   return '高估'
  return '--'
}

function evaTypeColor(type) {
  if (type === 'low')    return '#FF5252'
  if (type === 'normal') return '#FFA502'
  if (type === 'high')   return '#2ED573'
  return '#6E7681'
}

// ========== Supabase 数据库查询 ==========

/**
 * 查询靠谱基金列表
 */
export async function fetchFundScores(options = {}) {
  const {
    category = null,
    minScore = 0,
    orderBy = 'score',
    orderDir = 'desc',
    limit = 50,
    offset = 0
  } = options

  let query = supabase
    .from('fund_scores')
    .select('*')
    .gte('score', minScore)

  if (category) {
    query = query.eq('category', category)
  }

  query = query
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

/**
 * 查询投顾产品列表
 */
export async function fetchTouguProducts(options = {}) {
  const { type, limit = 50 } = options
  let query = supabase.from('tougu_products').select('*')
  if (type && type !== 'all') query = query.eq('type', type)
  query = query.order('return1y', { ascending: false, nullsFirst: false }).limit(limit)
  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * 查询配置项
 */
export async function fetchConfig(type) {
  const { data, error } = await supabase
    .from('config')
    .select('value, v')
    .eq('type', type)
    .limit(1)
    .single()
  if (error) return null
  return data?.value || data?.v || null
}

/**
 * 查询指数估值（实时，不落库）
 * 数据源：蛋卷估值中心 (danjuanfunds.com/djapi/index_eva/dj)，
 *   经专属 Supabase Edge Function danjuan-eva 服务端代理抓取（直连蛋卷，脱离已失效的 value500），
 *   当场解析返回；失败降级 CORS 代理。不依赖 value500.com。
 * 返回行（字段量级与旧 index_eva 生产表完全一致：百分位/股息率/roe 均为 0-100 百分比）：
 *   index_code, name, ttype, cat, pe, pe_percentile, pb, pb_percentile, dividend_yield, roe, eva_type, date
 * 前端 loadIndustry 无需改动即可消费。
 */
const INDEX_EVA_CAT_MAP = { '1': 'broad', '2': 'strategy', '3': 'sector' }

export async function fetchIndexEva() {
  const dj = await fetchDanjuanEva()
  if (!dj || dj.code !== 0 || !Array.isArray(dj.data)) {
    console.warn('[api] 蛋卷估值实时拉取失败:', dj && dj.msg)
    return []
  }
  const rows = dj.data.map(it => {
    const ttype = String(it.ttype || '1')
    return {
      index_code:    it.code,
      name:          it.name,
      ttype:         ttype,
      cat:           INDEX_EVA_CAT_MAP[ttype] || 'other',
      pe:            it.pe != null ? it.pe : null,
      pe_percentile: it.pePercentile != null ? it.pePercentile : null,
      pb:            it.pb != null ? it.pb : null,
      pb_percentile: it.pbPercentile != null ? it.pbPercentile : null,
      dividend_yield: it.dividendYield != null ? it.dividendYield : null,
      roe:           it.roe != null ? it.roe : null,
      eva_type:      it.evaType || '',
      date:          it.date || '',
    }
  })
  // 还原旧生产表默认排序：cat 升序（broad < sector < strategy），同组内 pe_percentile 降序
  rows.sort((a, b) => {
    if (a.cat < b.cat) return -1
    if (a.cat > b.cat) return 1
    return (b.pe_percentile ?? -1) - (a.pe_percentile ?? -1)
  })
  return rows
}

/**
 * 查询风格因子评分生产表（factor_scores，Barra 六因子性价比评分）
 * 返回行：factor_key, name, percentile, value_score, value_label, cost_score, cost_label, signal, signal_label, color
 */
export async function fetchFactorScores() {
  const { data, error } = await supabase
    .from('factor_scores')
    .select('factor_key,name,percentile,value_score,value_label,cost_score,cost_label,signal,signal_label,color')
    .order('factor_key')
  if (error) throw error
  return data || []
}

/**
 * 查询风格因子信号生产表（style_factors）
 * category ∈ 'stock' | 'bond' | 'commodity'
 * 返回行：category, factor_key, name, sub_style, percentile, value_score,
 *         value_label, cost_score, cost_label, signal, signal_label, reason, color
 */
export async function fetchStyleFactors(category) {
  const { data, error } = await supabase
    .from('style_factors')
    .select('category,factor_key,name,sub_style,percentile,value_score,value_label,cost_score,cost_label,signal,signal_label,reason,color,updated_at')
    .eq('category', category)
    .order('factor_key')
  if (error) throw error
  return data || []
}

// ========== 定投助手：中证官方 PE 历史分位 ==========

/**
 * 定投助手估值分位数据源：同源 EdgeOne 边缘函数 /api/csi-pe
 * （函数内直连中证指数官网 csindex.com.cn 官方日史，服务端计算分位后只回传摘要；
 *   本地非云 IP 直连官方可达，但 GitHub Actions 云 IP 曾被 WAF 拦，故走边缘函数代取）
 *
 * @param {string[]} codes 6 位指数代码，如 ['000300','932000']
 * @returns {Promise<Array>} [{ code, name, date, pe, pct_all, pct_5y, pct_3y, n, first, last }]
 *   pe=最新交易日 PE(TTM)；pct_* = 该 PE 在对应历史窗口中的百分位(0-100)；n=历史样本数
 */
export async function fetchCsiPe(codes) {
  const list = (codes || []).filter(c => /^\d{6}$/.test(c))
  if (!list.length) return []
  const res = await fetch(`/api/csi-pe?codes=${list.join(',')}`, {
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const json = await res.json()
  return (json && json.data) || []
}

/**
 * 定投助手回测引擎：同源 EdgeOne 边缘函数 /api/dtip-backtest
 * （函数内直连中证官方 PE 全史 + 新浪/东财历史收盘，walk-forward 模拟每周一估值分位定投）
 *
 * @param {string[]} codes 6 位指数代码，如 ['000300','932000']
 * @param {number} weeks 回测周数，默认 52（≈1 年）
 * @returns {Promise<{weeks:number, ok:number, total:number, summary:Object|null, data:Array}>}
 *   data[i] = { code, name, ok, weeksActual, startDate, endDate, latestDate, peLast, pctLast,
 *     zoneLast, amountLast, priceLast, shares, netInvested, marketValue, totalProfit, profitPct,
 *     irr, trades:[{date,zone,zoneKey,type,amount,price,sharesAdded,sharesAfter,valueAfter}] }
 */
export async function fetchDtipBacktest(codes, weeks = 52) {
  const list = (codes || []).filter(c => /^\d{6}$/.test(c))
  if (!list.length) return { weeks, ok: 0, total: 0, summary: null, data: [] }
  const qs = `codes=${list.join(',')}&weeks=${weeks}`
  const res = await fetch(`/api/dtip-backtest?${qs}`, {
    signal: AbortSignal.timeout(25000)
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return await res.json()
}

/**
 * 定投助手成交价数据源：东财 push2 实时/收盘行情（指数）
 * （push2 支持 CORS 直连；注意中证2000(932000) 的 secid 市场段为 2，其余沪市指数为 1）
 *
 * @param {string[]} secids 东财 secid，如 ['1.000300','2.932000']
 * @returns {Promise<Object>} { '1.000300': { price, ts, code, name } }
 */
export async function fetchIndexCloses(secids) {
  const out = {}
  await Promise.all((secids || []).map(async (secid) => {
    try {
      const res = await fetch(
        `https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(secid)}&fields=f43,f57,f58,f86`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return
      const json = await res.json()
      const d = json && json.data
      if (!d || !d.f43) return
      out[secid] = {
        price: d.f43 / 100,
        code: d.f57 || '',
        name: d.f58 || '',
        ts: d.f86 || 0,
      }
    } catch (e) {
      // 单个指数失败不影响其余
    }
  }))
  return out
}
