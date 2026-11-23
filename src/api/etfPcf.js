// 主动ETF PCF（申购赎回清单）数据读取
// 数据由 CI 每交易日生成，推到 pcf-data 分支，前端经公共 CDN 直读。
// 不落数据库、不占 Supabase 空间；跨日对比由前端读取多日 JSON 完成。

const BRANCH = 'pcf-data'
const REPO = 'dachuplus/allfund'

// 双 CDN 回退：jsDelivr 主，raw.githubusercontent 备（国内访问任一可达即可）
const SOURCES = [
  (path, t) => `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${path}?t=${t}`,
  (path, t) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}?t=${t}`,
]

const cache = new Map() // path -> { at, data }（5 分钟内存缓存）
const CACHE_MS = 5 * 60 * 1000

async function fetchJson(path, force = false) {
  const cached = cache.get(path)
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.data
  const t = Date.now()
  let lastErr
  for (const makeUrl of SOURCES) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 12000)
      let res
      try {
        res = await fetch(makeUrl(path, t), { signal: ctrl.signal, cache: 'no-store' })
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      cache.set(path, { at: Date.now(), data })
      return data
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('数据读取失败')
}

// 最新一份 PCF（含 date / count / funds[]）
export async function fetchLatestPcf(force = false) {
  return fetchJson('pcf/latest.json', force)
}

// 指定交易日 PCF；不存在时返回 null
export async function fetchPcfByDate(date) {
  try {
    return await fetchJson(`pcf/${date}.json`)
  } catch (e) {
    return null
  }
}

// 读取最近 N 个自然日中实际存在的交易日数据（用于跨日对比）。
// 从 latest.date 往前扫，遇到无数据日跳过，最多扫 maxScan 天，取到 found 份为止。
export async function fetchRecentPcf(found = 5, maxScan = 14) {
  const latest = await fetchLatestPcf()
  if (!latest || !latest.date) return { latest: null, history: [] }
  const out = []
  const [y, m, d] = latest.date.split('-').map(Number)
  let cursor = new Date(Date.UTC(y, m - 1, d))
  for (let i = 0; i < maxScan && out.length < found; i++) {
    const ds = cursor.toISOString().slice(0, 10)
    const day = await fetchPcfByDate(ds)
    if (day && day.count) out.push(day)
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return { latest, history: out }
}

export const PCF_CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/`
