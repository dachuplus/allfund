/**
 * 电影评分库数据层（娱乐 → 评分）
 *
 * 只读 Supabase 正式表 public.movie_ratings（TMDB 单源，每周同步）。
 * 严格遵守项目铁律：
 *  - 不用 head + count=exact（EdgeOne 会 502），直接分页拉数据；
 *  - anon/authenticated 均可读（表 RLS 已覆盖两角色）；
 *  - 只存精简字段，用户点片名跳 TMDB 原页看详情，本站不存简介/海报二进制。
 */
import { supabase } from './supabase.js'

const PAGE_SIZE = 50

/**
 * 拉取电影评分列表。
 * @param {{ keyword?:string, order?:string, from?:number, pageSize?:number }} opts
 *   order: 'rank' | 'vote_average' | 'vote_count' | 'year'
 * @returns {Promise<{rows:Array, hasMore:boolean}>}
 */
export async function fetchMovieRatings(opts = {}) {
  const keyword = (opts.keyword || '').trim()
  const order = opts.order || 'rank'
  const from = opts.from || 0
  const pageSize = opts.pageSize || PAGE_SIZE

  const orderCol = ({ rank: 'rank', vote_average: 'vote_average', vote_count: 'vote_count', year: 'year' })[order] || 'rank'

  let q = supabase
    .from('movie_ratings')
    .select('tmdb_id,title,original_title,year,vote_average,vote_count,poster_path,source_url,fetch_date,rank')
    .order(orderCol, { ascending: order === 'rank' })
    .range(from, from + pageSize - 1)

  if (keyword) {
    // 中文/英文片名模糊匹配（不加 count，避免长 URL 与 count=exact）
    q = q.or(`title.ilike.%${escapeFilter(keyword)}%,original_title.ilike.%${escapeFilter(keyword)}%`)
  }

  const { data, error } = await q
  if (error) throw error
  const rows = data || []
  return { rows, hasMore: rows.length === pageSize }
}

function escapeFilter(s) {
  return String(s).replace(/[%,()]/g, ' ').trim()
}

/** 取数据最新同步日期（用最大 fetch_date 近似），展示在页面底部 */
export async function fetchMovieRatingsFetchDate() {
  const { data, error } = await supabase
    .from('movie_ratings')
    .select('fetch_date')
    .order('fetch_date', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.fetch_date || null
}

export const TMDB_ATTR = '数据来源：TMDB（The Movie Database）。本站仅展示评分与片名，点击片名前往 TMDB 查看详情；评分版权归 TMDB 所有，本站未获 TMDB 背书或认证。'
