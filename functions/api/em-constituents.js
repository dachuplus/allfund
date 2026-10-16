/**
 * EdgeOne Pages Function — 东方财富指数成分股代取
 * 路由：GET /api/em-constituents?index=000300
 *
 * 用途：fetch_index_raw.py 在 GitHub Actions 云 CI 上直连 datacenter-web.eastmoney.com
 * 会被 WAF 拦截，故由本边缘函数（EdgeOne 海外节点）同源代取，再经 www.dachu.me 返回。
 *
 * 返回：
 *   ok: true
 *   index: 6 位指数代码
 *   indcode: 如 000300.SH（用于 gtimg 前缀推导）
 *   close: 指数收盘价（东财 CM_CLOSE）
 *   count: 成分股数量
 *   cons: [{ code(裸6位), name }]
 */

const EM_BASE = 'https://datacenter-web.eastmoney.com/api/data/v1/get'
const TIMEOUT_MS = 12000

async function fetchPage(code, page) {
  const url = `${EM_BASE}?reportName=RPT_INDEX_CONSTITUENT&columns=ALL` +
    `&filter=(INDEX_CODE=%22${code}%22)&pageNumber=${page}&pageSize=1000&sortColumns=INDEX_CODE`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://data.eastmoney.com/',
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return { ok: false, http: res.status }
    const json = await res.json()
    const result = json && json.result || {}
    return {
      ok: true,
      pages: parseInt(result.pages || '1', 10) || 1,
      rows: result.data || [],
    }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchConstituents(code) {
  const first = await fetchPage(code, 1)
  if (!first.ok) return { ok: false, page: 1, error: first.error || ('http ' + first.http) }

  let allRows = first.rows.slice()
  const pages = first.pages
  let indcode = null
  let close = null
  if (first.rows.length) {
    indcode = first.rows[0].INDCODE || null
    close = first.rows[0].CM_CLOSE != null ? Number(first.rows[0].CM_CLOSE) : null
  }

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => fetchPage(code, i + 2))
    )
    for (const r of rest) {
      if (r.ok) allRows = allRows.concat(r.rows)
    }
  }

  const cons = []
  for (const r of allRows) {
    const sc = (r.SECURITY_CODE || '').trim()
    if (sc) {
      cons.push({
        code: sc,
        name: (r.SECURITY_NAME_ABBR || '').trim(),
      })
    }
  }

  return {
    ok: true,
    index: code,
    indcode,
    close,
    count: cons.length,
    cons,
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const code = (url.searchParams.get('index') || '').trim()

  if (!/^\d{6}$/.test(code)) {
    return new Response(JSON.stringify({ ok: false, error: 'index must be 6 digits' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const result = await fetchConstituents(code)
  const status = result.ok ? 200 : 502
  return new Response(JSON.stringify(result), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
