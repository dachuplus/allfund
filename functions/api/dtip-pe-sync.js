/**
 * EdgeOne Pages Function — 定投助手 PE 历史同步「取数端」
 * 路由：GET /api/dtip-pe-sync
 *
 * 仅由夜间同步脚本 scripts/dtip_pe_sync.py（GitHub Actions 调用）消费：
 * 从 csindex 官方拉取 7 指数全量 PE 日史（每天仅一次），返回原始
 *   { code, name, series:[{d:"YYYY-MM-DD", pe:Number}] }
 * 由 Python 端预计算分位并写入 dtip_pe_history 缓存表，供 /api/csi-pe、
 * /api/dtip-backtest、周一定投 cron 读缓存，彻底消除「每次请求实时拉 3800 行」的脆弱性。
 *
 * 设计：csindex 对并发不友好，故串行拉取（夜间单次，不敏感延迟）；单指数失败不影响其余。
 * 安全：只读官方公开接口，无密钥。
 */

const CSI_BASE = 'https://www.csindex.com.cn/csindex-home/perf/indexCsiDsPe'
const TIMEOUT_MS = 11000

// 定投助手默认指数全集（与 DtipPanel.vue / csi-pe.js / dtip-backtest.js 保持一致）
// 2026-10-23 扩充：新增宽基扩展 / 风格(价值·成长·质量·红利) / 行业(中证行业系列+主题) / 境外(港股通·沪港深) 共 27 支。
// 仅含 csindex PE 接口实测「请求名=返回名、PE 数值合理」的指数；中证500/800 价值·成长及多数境外指数 csindex 返回张冠李戴 PE，已剔除。
const DEFAULT_CODES = [
  '000510', '000300', '000905', '000906', '000852', '932000', '000985', // 宽基核心
  '000001', '000016', '000010', '000688', '931643',                     // 宽基扩展
  '000919', '000920', '930855', '931155', '000922',                     // 风格：价值/成长/质量/红利
  '000928', '000929', '000930', '000931', '000932', '000933', '000934', // 行业
  '000935', '000936', '000937', '930997', 'H30184', '399997', '399986', '399967', // 行业(续)
  '930931', 'H30455',                                                   // 境外/港股通
]

function normDateCsi(s) {
  // "20110628" → "2011-06-28"
  if (!s || s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
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
    const series = rows
      .map(r => ({ d: normDateCsi(String(r.tradeDate || '')), pe: Number(r.peg) }))
      .filter(r => r.d && isFinite(r.pe) && r.pe > 0)
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    if (!series.length) return { code, ok: false, msg: 'no valid pe rows' }
    return { code, ok: true, name: rows[rows.length - 1].indexName || '', series }
  } catch (e) {
    return { code, ok: false, error: String(e && e.message || e) }
  } finally {
    clearTimeout(timer)
  }
}

export async function onRequest() {
  const data = []
  let okCount = 0
  for (const code of DEFAULT_CODES) {
    const r = await fetchOne(code)
    if (r.ok) {
      okCount++
      data.push({ code: r.code, name: r.name, ok: true, series: r.series })
    } else {
      data.push({ code, ok: false, detail: r })
    }
  }
  return new Response(JSON.stringify({
    ok: okCount,
    total: DEFAULT_CODES.length,
    data,
    ts: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
