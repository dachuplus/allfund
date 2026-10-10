// fund-scores-count — 返回「当前筛选条件下 fund_scores 的真实总数」。
//
// 为什么需要它：前端 fetchFundScoresImpl 故意不带 count='exact'
// （经 /api/sb-proxy 一律 502，且 22000+ 行 ×30 列会触发 57014 statement_timeout），
// 导致前端 totalCount 恒为 null、只能回退已加载条数（2000）。
// 本函数用 SERVICE_ROLE 直连 Supabase（不经代理），对 fund_scores 做 head + count='exact'，
// 完整复刻 fetchFundScoresImpl 的服务端过滤链 + 前端的「场内」(filterCN) 客户端过滤，
// 返回与列表完全一致口径的真实总数。
//
// 调用方式：POST /functions/v1/fund-scores-count，body 为与 fetchFundScores 同构的筛选参数。
// 鉴权：要求调用者为已登录用户（getUser 成功即可，与 fund_scores 页面只读权限一致）。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ============ 与 src/api/data.js 完全一致的过滤辅助函数 ============
// 任何改动都必须与 data.js 保持逐字节一致，否则计数与列表会不一致。

// ---------- 份额 ----------
const SHARE_CLASS_MAIN = 'MAIN'
const SHARE_CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'R', 'T', 'Y']
const SHARE_PRODUCT_SUFFIX = '(ETF联接|ETF|LOF|FOF|QDII|REITs|REIT)$'

function shareClassFilter(selected: any) {
  if (!selected || !selected.length) return null
  const hasMain = selected.includes(SHARE_CLASS_MAIN)
  const letters = selected.filter((s: string) => s !== SHARE_CLASS_MAIN && SHARE_CLASS_LETTERS.includes(s))
  const parts: string[] = []
  if (hasMain) parts.push('.*[^ABCDEFHIRTY]', '.*(ETF|LOF|FOF|QDII|REIT)')
  if (letters.length) parts.push('.*(' + letters.join('|') + ')$')
  if (!parts.length) return null
  return {
    match: '^(' + parts.join('|') + ')$',
    notMatch: hasMain ? null : SHARE_PRODUCT_SUFFIX,
  }
}

// ---------- 持有期 ----------
const HOLDING_PERIOD_TOKENS: Record<string, { d: string[]; c: string[] }> = {
  '7天': { d: ['7天', '7日'], c: [] },
  '30天': { d: ['30天', '30日', '1个月', '1月'], c: ['一个月'] },
  '60天': { d: ['60天', '60日', '2个月', '2月'], c: ['两个月', '双月'] },
  '90天': { d: ['90天', '90日', '3个月', '3月'], c: ['三个月'] },
  '120天': { d: ['120天', '120日', '4个月', '4月'], c: ['四个月'] },
  '180天': { d: ['180天', '180日', '6个月', '6月'], c: ['六个月', '六月'] },
  '1年': { d: ['1年', '12个月', '12月'], c: ['一年'] },
  '2年': { d: ['2年', '24个月'], c: ['两年'] },
  '3年': { d: ['3年', '36个月'], c: ['三年'] },
  '5年': { d: ['5年', '60个月'], c: ['五年'] },
}
const HOLDING_NO_LIMIT = '无限制'
const HOLDING_NO_LIMIT_REGEX = '^(?:[^持]|持(?!有))*$'

function holdingPeriodRegex(selected: any) {
  const list = Array.isArray(selected) ? selected : selected ? [selected] : []
  if (!list.length) return null
  const wantNoLimit = list.includes(HOLDING_NO_LIMIT)
  const dt: string[] = []
  const ct: string[] = []
  for (const k of list) {
    const t = HOLDING_PERIOD_TOKENS[k]
    if (!t) continue
    dt.push(...t.d)
    ct.push(...t.c)
  }
  const parts: string[] = []
  if (dt.length || ct.length) {
    const alts: string[] = []
    if (dt.length) alts.push('(?:^|[^0-9])(?:' + dt.join('|') + ')')
    if (ct.length) alts.push('(?:' + ct.join('|') + ')')
    parts.push('(?:' + alts.join('|') + ').{0,4}持有')
  }
  if (wantNoLimit) parts.push('(?:' + HOLDING_NO_LIMIT_REGEX + ')')
  return parts.length ? parts.join('|') : null
}

// ---------- 规模 ----------
function scaleFilterExpr(ranges: any) {
  if (!ranges || !ranges.length) return null
  const parts: string[] = []
  for (const [mn, mx] of ranges) {
    const conds: string[] = []
    if (mn != null) conds.push('fund_scale.gte.' + mn)
    if (mx != null) conds.push('fund_scale.lte.' + mx)
    if (!conds.length) continue
    parts.push(conds.length === 1 ? conds[0] : 'and(' + conds.join(',') + ')')
  }
  return parts.length ? parts.join(',') : null
}

// 「场内」(isExchangeListed) 等效正则，复刻前端 isExchangeListed：
//   (name.includes('ETF') && !name.includes('ETF联接')) || name.includes('LOF') || name.includes('REIT')
const CN_LISTED_REGEX = 'ETF(?!联接)|LOF|REIT'

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: ue } = await supabase.auth.getUser()
    if (ue || !userData.user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const {
      t0, t1, search,
      etf, lof, dk, sg, zz, dailyLimit,
      scaleMin, scaleMax, scaleRanges,
      shareClasses, mainCode, holding, holdingPeriods,
      filterCN,
    } = body

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // head + count='exact'：只取总数，不返回行（极轻量，不触发 57014）
    let query = admin.from('fund_scores').select('c', { count: 'exact', head: true })

    if (t1) {
      query = query.eq('t1_tt', t1)
    } else if (t0) {
      if (Array.isArray(t0) && t0.length > 0) query = query.in('t0', t0)
      else if (t0) query = query.eq('t0', t0)
    }
    if (search) query = query.or(`n.ilike.%${search}%,c.ilike.%${search}%`)
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
    if (zz) {
      if (zz === '1') query = query.ilike('n', '%增强%').ilike('t1', '%指数%')
      else if (zz === '0') query = query.or('n.not.ilike.%增强%,t1.not.ilike.%指数%')
    }
    if (dailyLimit) {
      if (dailyLimit === '1') query = query.gte('daily_change', 20)
      else if (dailyLimit === '0') query = query.or('daily_change.lt.20,daily_change.is.null')
    }
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
    const shareFilter = (shareClasses && shareClasses.length)
      ? shareClassFilter(shareClasses)
      : (mainCode ? shareClassFilter([SHARE_CLASS_MAIN]) : null)
    if (shareFilter) {
      query = query.filter('n', 'match', shareFilter.match)
      if (shareFilter.notMatch) query = query.not('n', 'match', shareFilter.notMatch)
    }
    const holdingRx = (holdingPeriods && holdingPeriods.length)
      ? holdingPeriodRegex(holdingPeriods)
      : (holding ? holdingPeriodRegex([holding]) : null)
    if (holdingRx) query = query.filter('n', 'match', holdingRx)

    // 场内（ETF不含联接/LOF/REITs → 是；其余含ETF联接 → 否），复刻前端 isExchangeListed
    if (filterCN === '1') {
      query = query.filter('n', 'match', CN_LISTED_REGEX)
    } else if (filterCN === '0') {
      query = query.not('n', 'match', CN_LISTED_REGEX)
    }

    const { count, error } = await query
    if (error) return json({ error: error.message }, 500)

    return json({ count: count ?? 0 })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
