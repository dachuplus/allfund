/**
 * 数据 API 封装层
 * - 仅从 Supabase 云数据库读取真实数据
 * - 未配置 Supabase 时：返回空结果（前端显示「暂无数据 / --」），绝不展示伪造示例数据
 */
import { supabase, supabaseDirect } from './supabase.js'
import { withCache } from '../utils/cache.js'

// ========== 工具函数 ==========
// 格式化函数已统一到 src/utils/format.js（fmtScore/fmtPct/scoreColor 等）

// ========== 投顾产品 ==========
export async function fetchTouguProducts(filters = {}) {
  if (supabase) {
    let query = supabase.from('tougu_products').select('*')
    if (filters.type) query = query.eq('type', filters.type)
    const { data, error } = await query.order('return1y', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data
  }
  // 未配置 Supabase：按最高风控规则返回空，绝不展示伪造的示例数据
  return []
}

// ========== 基金靠谱指数 ==========
// fund_scores 表实际列（核心视图）：代码/名称/分类/详情/评分
// 合规：不再向前端下发短周期（<3 个月）评分列 k0w/k1m ——《证券投资基金评价业务管理暂行办法》
// 第十四条第(七)项禁止发布单一指标排名期间少于 3 个月的结果，页面对应周期已一并下架。
const FUND_SCORES_COLS = 'c,n,t0,t1,t1_tt,sg,daily_change,company,fund_manager,fund_scale,share_scale,manage_fee,custody_fee,sale_fee,found_date,k3m,k6m,k1,k2,k3,k5,k_all,score_grade,r1y,r2y,r3y,r5y'
export function fetchFundScores(params = {}) {
  const key = 'fundScores:' + JSON.stringify(params)
  return withCache(key, 60000, () => fetchFundScoresImpl(params))
}

// 升序数组中 ≤ v 的元素个数（bisect_right），用于计算「严格大于 v」的数量
function bisectRight(arr, v) {
  let lo = 0, hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid] <= v) lo = mid + 1
    else hi = mid
  }
  return lo
}

// 计算基金在「细分品类(t1_tt)」内的靠谱分排名
// 返回 { [code]: { cat, rank, total } }：rank 为该品类内按 k_all 降序的名次（1 起），total 为该品类基金总数
// 用于在组合成份基金后展示「债券型-混合二级 1|1480」这样的细分品类排名
// 优化：仅 2 次查询 —— ①取给定基金自身(1次) ②一次性拉取涉及品类的全量 k_all 在内存排序算排名(1次)，
//       彻底消除原来「每只基金 2 次 count」的 N+1 隐患（列表放大到 300 只时原需 600+ 次请求）
export async function getCategoryRankInfo(codes) {
  if (!supabase || !codes || codes.length === 0) return {}
  const unique = [...new Set(codes.filter(Boolean))]
  try {
    // ① 取给定基金自身的 (code, 品类, k_all)
    const { data, error } = await supabase
      .from('fund_scores')
      .select('c,t1_tt,k_all')
      .in('c', unique)
    if (error || !data) return {}
    const info = {}
    const cats = []
    const catSet = new Set()
    for (const f of data) {
      const k = f.k_all == null ? null : Number(f.k_all)
      info[f.c] = { cat: f.t1_tt || null, kAll: k }
      if (f.t1_tt && !catSet.has(f.t1_tt)) { catSet.add(f.t1_tt); cats.push(f.t1_tt) }
    }
    if (cats.length === 0) {
      // 所有基金都无细分品类，直接返回空排名
      const result = {}
      for (const f of data) result[f.c] = { cat: info[f.c].cat, rank: null, total: 0 }
      return result
    }
    // ② 一次性拉取这些品类下的全部 (t1_tt, k_all)
    //    失败时降级：返回步骤①的基础信息，rank=null
    const { data: all, error: e2 } = await supabase
      .from('fund_scores')
      .select('t1_tt,k_all')
      .in('t1_tt', cats)
    if (e2 || !all) {
      console.warn('[getCategoryRankInfo] 品类排名查询失败，降级为仅显示分类（无排名）')
      const result = {}
      for (const f of data) result[f.c] = { cat: info[f.c].cat, rank: null, total: 0 }
      return result
    }
    // 按品类聚合 k_all（升序），用于二分查找排名
    const byCat = {}
    for (const f of all) {
      const k = f.k_all == null ? null : Number(f.k_all)
      if (k == null) continue
      if (!byCat[f.t1_tt]) byCat[f.t1_tt] = []
      byCat[f.t1_tt].push(k)
    }
    const totals = {}
    for (const cat of Object.keys(byCat)) {
      byCat[cat].sort((a, b) => a - b)
      totals[cat] = byCat[cat].length
    }
    // ③ 计算每只基金排名：品类内 k_all 严格大于本基金的数量 + 1
    const result = {}
    for (const f of data) {
      const r = info[f.c]
      if (!r.cat || r.kAll == null) {
        result[f.c] = { cat: r.cat, rank: null, total: r.cat ? (totals[r.cat] || 0) : 0 }
        continue
      }
      const total = totals[r.cat] || 0
      const rank = total - bisectRight(byCat[r.cat] || [], r.kAll) + 1
      result[f.c] = { cat: r.cat, rank, total }
    }
    return result
  } catch (e) {
    console.error('[getCategoryRankInfo]', e)
    return {}
  }
}

// 按指定评分列（默认 k1=1年评分）在「细分品类(t1_tt)」内排名
// 返回 { [code]: { cat, score, rank, total } }：
//   - cat: 细分品类名（t1_tt）
//   - score: 该基金在 scoreCol 上的评分（如 k1）
//   - rank: 该品类内按 scoreCol 降序的名次（1 起），total 为该品类基金总数
// 用于在组合成份基金后展示「分类 + 1年评分 + 排名 153|1480」
// 允许作为 scoreCol 的列名白名单（避免拼接进查询字符串时产生 SQL 注入）
const SCORE_COLS = new Set(['k0w', 'k1m', 'k3m', 'k6m', 'k1', 'k2', 'k3', 'k5', 'k_all'])
// 品类总数缓存：同一组合里多只基金常属同一品类，避免重复 COUNT
const _catTotalCache = new Map()

export async function getCategoryRankInfoByScore(codes, scoreCol = 'k1') {
  if (!supabase || !codes || codes.length === 0) return {}
  if (!SCORE_COLS.has(scoreCol)) {
    console.error('[getCategoryRankInfoByScore] 非法 scoreCol:', scoreCol)
    return {}
  }
  const unique = [...new Set(codes.filter(Boolean))]
  try {
    // ① 批量取所有基金的 (code, 细分品类 t1_tt, 评分) —— 1 次查询搞定全部基金
    const { data, error } = await supabase
      .from('fund_scores')
      .select(`c,t1_tt,${scoreCol}`)
      .in('c', unique)
    if (error || !data) return {}
    const info = {}
    const cats = []
    const catSet = new Set()
    for (const f of data) {
      const k = f[scoreCol] == null ? null : Number(f[scoreCol])
      info[f.c] = { cat: f.t1_tt || null, score: k }
      if (f.t1_tt && !catSet.has(f.t1_tt)) { catSet.add(f.t1_tt); cats.push(f.t1_tt) }
    }
    if (cats.length === 0) {
      const result = {}
      for (const f of data) result[f.c] = { cat: info[f.c].cat, score: info[f.c].score, rank: null, total: 0 }
      return result
    }
    // ② 批量取这些品类下的全部 (t1_tt, 评分) —— 分页拉全量后内存排序算排名（避免 1000 行上限截断导致排名错）
    //    注意：此步骤失败不应丢弃步骤①已获取的基金基础信息，降级返回 rank=null 即可
    const all = []
    let from = 0
    const PAGE = 1000
    let rankQueryOk = true
    while (true) {
      const { data: page, error: e2 } = await supabase
        .from('fund_scores')
        .select(`t1_tt,${scoreCol}`)
        .in('t1_tt', cats)
        .range(from, from + PAGE - 1)
      if (e2) {
        console.warn('[getCategoryRankInfoByScore] 品类排名查询失败，降级为仅显示分类+评分（无排名）:', e2.message || e2)
        rankQueryOk = false
        break
      }
      if (!page || page.length === 0) break
      all.push(...page)
      if (page.length < PAGE) break
      from += PAGE
    }
    const byCat = {}
    for (const f of all) {
      const k = f[scoreCol] == null ? null : Number(f[scoreCol])
      if (k == null) continue
      if (!byCat[f.t1_tt]) byCat[f.t1_tt] = []
      byCat[f.t1_tt].push(k)
    }
    const totals = {}
    for (const cat of Object.keys(byCat)) {
      byCat[cat].sort((a, b) => a - b) // 升序，配合 bisectRight 计算降序名次
      totals[cat] = byCat[cat].length
    }
    // ③ 计算排名：品类内 score 严格大于本基金的只数 + 1（降序名次），纯内存计算
    //    若步骤②失败（rankQueryOk=false），则返回步骤①的基础信息，rank=null
    const result = {}
    if (!rankQueryOk || all.length === 0) {
      // 降级：只返回分类+评分，无排名数据
      for (const f of data) {
        const r = info[f.c]
        result[f.c] = { cat: r.cat, score: r.score, rank: null, total: 0 }
      }
      return result
    }
    for (const f of data) {
      const r = info[f.c]
      if (!r.cat || r.score == null) {
        result[f.c] = { cat: r.cat, score: r.score, rank: null, total: r.cat ? (totals[r.cat] || 0) : 0 }
        continue
      }
      const total = totals[r.cat] || 0
      const rank = total - bisectRight(byCat[r.cat] || [], r.score) + 1
      result[f.c] = { cat: r.cat, score: r.score, rank, total }
    }
    return result
  } catch (e) {
    console.error('[getCategoryRankInfoByScore] 异常，降级返回空（分类/排名均不可用）:', e)
    return {}
  }
}

// ========== 份额 / 持有期 / 规模的「多选」服务端下推 ==========
// 之所以必须走服务端：fund_scores 查询不带 count='exact'（会触发 57014 statement timeout），
// 前端 totalCount 恒为 null、仅以已加载条数兜底；任何「只在客户端筛」的条件都会
// 让首页 1000 条里命中数严重偏少，且翻页时计数与列表不一致。
// 多选 = 同一筛选维度内取「并集」，只能用一个 regex（或一个 or 表达式）表达，故统一在服务端构造。

// ---------- 份额 ----------
export const SHARE_CLASS_MAIN = 'MAIN'          // 「主代码」档
export const SHARE_CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'R', 'T', 'Y']
// 产品类型后缀（ETF联接 必须排在 ETF 前，避免被误剥）
const SHARE_PRODUCT_SUFFIX = '(ETF联接|ETF|LOF|FOF|QDII|REITs|REIT)$'
// 主代码：名称末位不是份额字母，或名称本身就是产品类型后缀结尾
export const MAIN_CODE_REGEX = '^(.*[^ABCDEFHIRTY]|.*(ETF|LOF|FOF|QDII|REIT))$'

/**
 * 份额多选 → 服务端过滤条件。
 * 与前端原 extractShareClass() 判定**逐档完全一致**（已用 SQL 对 11 个档位全量核对，差值均为 0）：
 *   字母档 = 名称末位为该字母 且 名称不以产品类型后缀结尾（否则 「XXETF」 会被误判成 F 类）。
 * 返回 { match, notMatch }；notMatch 为 null 表示无需附加取反条件。返回 null 表示不做过滤。
 */
export function shareClassFilter(selected) {
  if (!selected || !selected.length) return null
  const hasMain = selected.includes(SHARE_CLASS_MAIN)
  const letters = selected.filter(s => s !== SHARE_CLASS_MAIN && SHARE_CLASS_LETTERS.includes(s))
  const parts = []
  if (hasMain) parts.push('.*[^ABCDEFHIRTY]', '.*(ETF|LOF|FOF|QDII|REIT)')
  if (letters.length) parts.push('.*(' + letters.join('|') + ')$')
  if (!parts.length) return null
  return {
    match: '^(' + parts.join('|') + ')$',
    // 仅选字母档时需要排除产品类型后缀结尾的名称；与「主代码」同选时无需（主代码分支已覆盖）
    notMatch: hasMain ? null : SHARE_PRODUCT_SUFFIX,
  }
}

// ---------- 持有期 ----------
// 持有期：fund_scores 无该列，按基金名称中的持有期字样推导（与页面展示口径一致）。
// 分词两类，处理边界差异：
//   ① 数字型词（7天 / 30天 / 1个月 / 12个月…）：前面必须是行首或非数字，避免「210天」被「10天」误命中；
//   ② 中文型词（一年 / 三个月 / 双月…）：不加前导边界 —— 否则「养老目标2060五年持有」的
//      「五年」因前面是数字「0」而被误排除（实测该基金确实属于 5 年持有，必须收进来）。
const HOLDING_PERIOD_TOKENS = {
  '7天':   { d: ['7天', '7日'], c: [] },
  '30天':  { d: ['30天', '30日', '1个月', '1月'], c: ['一个月'] },
  '60天':  { d: ['60天', '60日', '2个月', '2月'], c: ['两个月', '双月'] },
  '90天':  { d: ['90天', '90日', '3个月', '3月'], c: ['三个月'] },
  '120天': { d: ['120天', '120日', '4个月', '4月'], c: ['四个月'] },
  '180天': { d: ['180天', '180日', '6个月', '6月'], c: ['六个月', '六月'] },
  '1年':   { d: ['1年', '12个月', '12月'], c: ['一年'] },
  '2年':   { d: ['2年', '24个月'], c: ['两年'] },
  '3年':   { d: ['3年', '36个月'], c: ['三年'] },
  '5年':   { d: ['5年', '60个月'], c: ['五年'] },
}

// 「无限制」不是名称字段（全库 0 条名称含此词），而是「没有持有期条款」的口径：名称不含「持有」。
// 用负向前瞻一次表达（Postgres ARE 支持 (?!...)）：字符串中每个「持」后面都不跟「有」。
export const HOLDING_NO_LIMIT = '无限制'
// 「无限制」的等价子串判据（取反匹配即得该档；保留给单档老参数使用）
export const HOLDING_NAME_MARK = '持有'
const HOLDING_NO_LIMIT_REGEX = '^(?:[^持]|持(?!有))*$'

// 供 UI 渲染的持有期选项（顺序即展示顺序）
export const HOLDING_PERIOD_OPTIONS = [HOLDING_NO_LIMIT, ...Object.keys(HOLDING_PERIOD_TOKENS)]

/**
 * 持有期多选 → 单个服务端 regex（null 表示不做过滤）。
 * 各档 token 合并进同一分支，多档即并集；「无限制」为独立分支与各档 OR。
 * 单档结果与逐档写法完全等价（例：['30天'] → (?:(?:^|[^0-9])(?:30天|30日|1个月|1月)|(?:一个月)).{0,4}持有）。
 */
export function holdingPeriodRegex(selected) {
  const list = Array.isArray(selected) ? selected : (selected ? [selected] : [])
  if (!list.length) return null
  const wantNoLimit = list.includes(HOLDING_NO_LIMIT)
  const dt = []
  const ct = []
  for (const k of list) {
    const t = HOLDING_PERIOD_TOKENS[k]
    if (!t) continue
    dt.push(...t.d)
    ct.push(...t.c)
  }
  const parts = []
  if (dt.length || ct.length) {
    const alts = []
    if (dt.length) alts.push('(?:^|[^0-9])(?:' + dt.join('|') + ')')
    if (ct.length) alts.push('(?:' + ct.join('|') + ')')
    parts.push('(?:' + alts.join('|') + ').{0,4}持有')
  }
  if (wantNoLimit) parts.push('(?:' + HOLDING_NO_LIMIT_REGEX + ')')
  return parts.length ? parts.join('|') : null
}

// ---------- 规模 ----------
/**
 * 规模区间多选 → PostgREST or 表达式（null 表示不做过滤）。
 * ranges: [[min|null, max|null], ...]，单位亿元。
 * 单段由调用方走 gte/lte（保持与旧行为逐字节一致），此处只负责多段拼接。
 */
export function scaleFilterExpr(ranges) {
  if (!ranges || !ranges.length) return null
  const parts = []
  for (const [mn, mx] of ranges) {
    const conds = []
    if (mn != null) conds.push('fund_scale.gte.' + mn)
    if (mx != null) conds.push('fund_scale.lte.' + mx)
    if (!conds.length) continue
    parts.push(conds.length === 1 ? conds[0] : 'and(' + conds.join(',') + ')')
  }
  return parts.length ? parts.join(',') : null
}

async function fetchFundScoresImpl(params = {}) {
  const { t0, t1, search, kKey = 'k1', page = 1, pageSize = 100, sortAsc, etf, lof, dk, sg, dailyLimit, scaleMin, scaleMax, sortField, sortDir, mainCode, holding, shareClasses, holdingPeriods, scaleRanges } = params
  if (supabase) {
    // 注意：不带 count='exact'（之前会因为 22000+ 行 × 30 列触发数据库 statement_timeout 57014，
    //       表现为页面「基金数据加载失败」）。改用 funds.length 作为显示总数（见 FundRankPage.vue）。
    //       如需精确总数，可后续用 count=planned（pg_class.reltuples 估计，较快）。
    let query = supabase.from('fund_scores').select(FUND_SCORES_COLS)
    // 分类筛选：直接采用 fund_scores 的「一级分类 t0」与「二级分类 t1_tt」
    // （从总表服务端过滤，而非客户端对前 100 条再筛）
    if (t1) {
      // 二级分类：按天天分类 t1_tt 精确过滤
      query = query.eq('t1_tt', t1)
    } else if (t0) {
      // 一级分类：按聚源 t0 过滤（货币型 t1_tt 为 NULL，也走此分支）
      // 支持数组（如归一化后同时匹配 "混合型" 和 "混合型基金"）
      if (Array.isArray(t0) && t0.length > 0) {
        query = query.in('t0', t0)
      } else {
        query = query.eq('t0', t0)
      }
    }
    if (search) query = query.or(`n.ilike.%${search}%,c.ilike.%${search}%`)
    // 服务端下推：产品类型/状态筛选（避免前端只过滤首页导致计数与展示不一致）
    if (etf) {
      if (etf === '1') query = query.ilike('n', '%ETF%')
      else if (etf === '0') query = query.not('n', 'ilike', '%ETF%')
    }
    if (lof) {
      if (lof === '1') query = query.ilike('n', '%LOF%')
      else if (lof === '0') query = query.not('n', 'ilike', '%LOF%')
    }
    if (dk) {
      if (dk === '1') query = query.or('n.ilike.%定开%,n.ilike.%定期开放%')
      else if (dk === '0') query = query.not('n', 'ilike', '%定开%').not('n', 'ilike', '%定期开放%')
    }
    if (sg) {
      if (sg === '1') query = query.eq('sg', 1)
      else if (sg === '0') query = query.neq('sg', 1)
    }
    if (dailyLimit) {
      if (dailyLimit === '1') query = query.gte('daily_change', 20)
      else if (dailyLimit === '0') query = query.or('daily_change.lt.20,daily_change.is.null')
    }
    // 基金规模区间（亿元）：服务端下推。多选区间 → or=(and(gte,lte),...)；单区间仍走 gte/lte（与旧行为一致）
    if (scaleRanges && scaleRanges.length) {
      if (scaleRanges.length === 1) {
        const [mn, mx] = scaleRanges[0]
        if (mn != null) query = query.gte('fund_scale', mn)
        if (mx != null) query = query.lte('fund_scale', mx)
      } else {
        const expr = scaleFilterExpr(scaleRanges)
        if (expr) query = query.or(expr)
      }
    } else {
      if (scaleMin != null) query = query.gte('fund_scale', scaleMin)
      if (scaleMax != null) query = query.lte('fund_scale', scaleMax)
    }
    // 份额（多选，含「主代码」）：名称 regex 服务端下推
    const shareFilter = (shareClasses && shareClasses.length)
      ? shareClassFilter(shareClasses)
      : (mainCode ? shareClassFilter([SHARE_CLASS_MAIN]) : null)
    if (shareFilter) {
      query = query.filter('n', 'match', shareFilter.match)
      if (shareFilter.notMatch) query = query.not('n', 'match', shareFilter.notMatch)
    }
    // 持有期（多选，含「无限制」）：各档 token 合并为单个 regex 下推
    const holdingRx = (holdingPeriods && holdingPeriods.length)
      ? holdingPeriodRegex(holdingPeriods)
      : (holding ? holdingPeriodRegex([holding]) : null)
    if (holdingRx) query = query.filter('n', 'match', holdingRx)
    // 不再过滤 null 评分（否则债券型-混合二级等数据源未覆盖的分类会显示为空）
    // 改用 nullsFirst: false 让 null 排到最后
    // 排序：若指定了列排序（sortField），则在整个 fund_scores 表（已按筛选条件过滤）基础上按该列排序；
    //       否则按靠谱分周期 kKey 排序。两种排序均在服务端完成，覆盖全表而非仅已加载的 100 条。
    const orderField = sortField || kKey
    const orderAsc = sortField ? (sortDir === 'asc') : !!sortAsc
    const from = (page - 1) * pageSize
    const { data, error } = await query
      .order(orderField, { ascending: orderAsc, nullsFirst: false })
      .range(from, from + pageSize - 1)
    if (error) throw error
    // 不带 count（见上方说明），前端会用 funds.length 作为总数 fallback
    return { data: data || [], count: null }
  }
  // 未配置 Supabase：按最高风控规则返回空，绝不展示伪造的示例数据
  return { data: [], count: 0 }
}

// ========== 基金分类（动态，来自 fund_scores 的 t0/t1_tt）==========
// 调用 Supabase RPC get_fund_categories()，返回：
//   { t0: [{t0, cnt}], t1: [{t0, t1_tt, cnt}] }
// 一级分类用 t0，二级分类用 t1_tt（货币型 t1_tt 为 NULL，前端单独处理）
export function fetchFundCategories() {
  return withCache('fundCategories', 86400000, fetchFundCategoriesImpl)
}

async function fetchFundCategoriesImpl() {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_fund_categories')
    if (error) throw error
    return data
  }
  return { t0: [], t1: [] }
}

// ========== 基金元信息 ==========
export function fetchFundMeta() {
  return withCache('fundMeta', 60000, fetchFundMetaImpl)
}

async function fetchFundMetaImpl() {
  if (supabase) {
    // 取 fund_scores_meta 最新一行（用 limit(1) 而非 .single()，避免多行时
    // pgrst 在 object 模式下返回 406 导致整体查询失败、截止时间显示「暂无/—」）
    const { data, error } = await supabase
      .from('fund_scores_meta')
      .select('nav_date,total_count,scored_count,tsq,update_time')
      .order('tsq', { ascending: false })
      .limit(1)
    if (error) {
      console.error('[fetchFundMeta] query error:', error)
      throw error
    }
    const row = Array.isArray(data) ? data[0] : data
    if (row && (row.tsq || row.update_time || row.nav_date)) {
      // 统一截止时间字段：优先 tsq → update_time → nav_date，供前端统一读取
      return { ...row, updateTime: row.tsq || row.update_time || row.nav_date }
    }
    console.warn('[fetchFundMeta] no valid row found')
  }
  return null
}

// ========== 热门标签（行业/概念） ==========
export function fetchFundTags() {
  return withCache('fundTags', 3600000, fetchFundTagsImpl) // 缓存1小时
}

async function fetchFundTagsImpl() {
  if (supabase) {
    const { data, error } = await supabase
      .from('fund_tags')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data || []
  }
  return []
}

// ========== 配置（API Key等）==========
export async function fetchConfig(type) {
  if (supabase) {
    const { data, error } = await supabase.from('config').eq('type', type).single()
    if (error) return null
    return data
  }
  return null
}

// ========== PE 历史 ==========
export async function fetchPEHistory(indexCode = '000300') {
  if (supabase) {
    const { data, error } = await supabase
      .from('index_pe_history')
      .select('*')
      .eq('index_code', indexCode)
      .order('trade_date', { ascending: true })
    if (error) throw error
    return data
  }
  return []
}

// ========== 股票选品评分（stock_scores）==========
// 2026-10-02 重构：覆盖面由「沪深300+中证500+中证1000 成分股」升级为
// **沪深京 A 股 + 港股全市场**；评分由基金式（收益/回撤/夏普）改为股票专属五维模型。
// 五维（横截面百分位 0-100）：
//   k_growth 成长 30% ← 营收同比、净利同比、近3年净利复合增速
//   k_quality 质量 25% ← ROE、毛利率、经营现金流含金量
//   k_safety  健康 20% ← 资产负债率(反向)、连续亏损年数(反向)
//   k_value   估值 15% ← PE_TTM(反向)、PB(反向)、PEG(反向)
//   k_momentum 动量 10% ← 近1年收益、近1年最大回撤(反向)、近1年夏普
//   k_all = 加权和（缺失维度按权重归一化；成长/质量任一缺失则 k_all 为 NULL）
// 注意：return_*/max_drawdown 在库中已为「百分比数值」（如 return_1y=361.22 表示 +361.22%），
// 故前端展示时直接 toFixed(2)+'%'，切勿再用 fmtRet（会把小数×100）。
const STOCK_SCORES_COLS =
  'code,name,exchange,industry,close,pe_ttm,pb,mktcap,return_1y,return_3y,max_drawdown,sharpe,' +
  'rev_yoy,profit_yoy,profit_cagr_3y,roe,gross_margin,ocf_to_profit,debt_ratio,loss_years,peg,' +
  'fin_period,risk_flag,k_growth,k_quality,k_safety,k_value,k_momentum,k_all,updated_at'

function applyStockFilters(query, params) {
  const { search = '', exchange = '' } = params
  let q = query
  if (search) {
    q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  }
  if (exchange && exchange !== 'ALL') {
    q = q.eq('exchange', exchange)
  }
  return q
}

/**
 * 取总数。
 * ⚠️ 不能用 PostgREST 的 Prefer: count=exact —— 实测经 /api/sb-proxy 一律 502
 * （EdgeOne 平台层拦截，与表大小无关）。改用 SECURITY DEFINER 的 RPC
 * public.stock_scores_stats(p_search, p_exchange, p_only_scored) 精确计数。
 */
async function fetchStockCount(client, params) {
  const { search = '', exchange = '', onlyScored = false } = params
  try {
    const { data, error } = await client.rpc('stock_scores_stats', {
      p_search: search || null,
      p_exchange: exchange && exchange !== 'ALL' ? exchange : null,
      p_only_scored: !!onlyScored,
    })
    if (!error && Array.isArray(data) && data.length) {
      return Number(data[0].total) || 0
    }
  } catch (e) {
    console.warn('[fetchStockScores] 总数获取失败，降级为不显示总数:', e)
  }
  return null
}

/**
 * 分页查询。返回 { rows, total, hasMore }
 * 说明：supabase-js 的 .range() 会发 Range 头，而 EdgeOne CDN 在边缘层对 Range 请求
 * 直接返回 416；src/api/supabase.js 已把 Range 等价改写为 offset/limit，此处照常使用 .range()。
 * 多取 1 行用于判断 hasMore（total 为 null 时的兜底）。
 */
export async function fetchStockScores(params = {}) {
  const client = supabase || supabaseDirect
  if (!client) return { rows: [], total: 0, hasMore: false }
  const {
    search = '', exchange = '', sortKey = 'k_all', sortAsc = false,
    page = 1, pageSize = 50, bottomRisk = true, onlyScored = false,
  } = params
  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize // 多取 1 行判断 hasMore
  const maxRetries = 2

  const total = await fetchStockCount(client, { search, exchange, onlyScored })

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let query = client.from('stock_scores').select(STOCK_SCORES_COLS)
      query = applyStockFilters(query, { search, exchange })
      if (onlyScored) query = query.not('k_all', 'is', null)
      // 风险股（risk_flag 非空）置底：先按 risk_flag 升序且 NULL 排最前，再按目标列排序
      if (bottomRisk && sortKey === 'k_all') {
        query = query.order('risk_flag', { ascending: true, nullsFirst: true })
      }
      query = query.order(sortKey, { ascending: sortAsc, nullsFirst: false })
      const { data, error } = await query.range(from, to)
      if (error) throw error
      const all = data || []
      const hasMore = all.length > pageSize
      return { rows: hasMore ? all.slice(0, pageSize) : all, total, hasMore }
    } catch (e) {
      console.warn(`[fetchStockScores] 第 ${attempt + 1} 次失败:`, e)
      if (attempt === maxRetries) throw e
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  return { rows: [], total, hasMore: false }
}
