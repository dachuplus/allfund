import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../api/supabase.js'

const routes = [
  {
    path: '/',
    component: () => import('../pages/my-content/MyContentPage.vue'),
    meta: {
      tab: 'home',
      feature: 'content',
      title: '靠谱工具',
      description: 'ALLFUND-靠谱工具：提供公开市场数据的整理、评分与筛选工具，仅代表个人观点，不构成投资建议或金融产品营销。',
      keywords: 'ALLFUND,靠谱工具,评分工具,数据工具,独立研究'
    }
  },
  {
    path: '/signal',
    component: () => import('../pages/signal/SignalPage.vue'),
    meta: {
      tab: 'signal',
      feature: 'signal',
      title: '策略',
      description: '宏观指标信号：股债利差、FED模型、大类资产性价比、风格因子与行业估值，叠加上证指数走势，辅助判断市场位置。',
      keywords: '宏观指标,股债利差,FED模型,大类资产,风格因子,行业估值'
    }
  },
  {
    path: '/tools',
    component: () => import('../pages/tools/SelectionPage.vue'),
    meta: {
      tab: 'tools',
      title: '选品',
      description: '选品：多资产评分与筛选工具入口，支持股票、指数等公开市场数据的整理、对比与筛选。',
      keywords: '选品,评分工具,数据筛选,股票选品'
    },
    children: [
      {
        path: '',
        redirect: { name: 'tools-fund' }
      },
      {
        path: 'fund',
        name: 'tools-fund',
        component: () => import('../pages/fund-rank/FundRankPage.vue'),
        meta: {
          tab: 'tools',
          feature: 'fund-rank',
          title: '选品 · 靠谱指数',
          description: '靠谱指数工具：覆盖全市场近2万只产品，按收益率、最大回撤、夏普比率综合折算为 0~100 分，支持分类、份额、ETF/LOF 等多维筛选。',
          keywords: '靠谱指数工具,靠谱工具,评分工具,数据筛选'
        }
      },
      {
        path: 'stock',
        name: 'tools-stock',
        component: () => import('../pages/tools/StockPage.vue'),
        meta: {
          tab: 'tools',
          title: '选品 · 股票',
          description: '股票选品：股票筛选、排序与对比工具（开发中）。',
          keywords: '股票选品,股票筛选'
        }
      },
      {
        path: 'index',
        name: 'tools-index',
        component: () => import('../pages/tools/IndexPage.vue'),
        meta: {
          tab: 'tools',
          title: '选品 · 指数',
          description: '指数选品：按成长、估值、市值流动性、质量、股东回报五个维度对指数做横截面评分与排序，支持规模风格、行业、固收分类查看。',
          keywords: '指数选品,指数评分,指数筛选'
        }
      }
    ]
  },
  {
    path: '/tools/tougu',
    component: () => import('../pages/tougu/TouguPage.vue'),
    meta: {
      tab: 'tools',
      title: '投顾产品公开信息',
      description: '公开披露高收益、稳健、养老三类投顾产品的近3月、近1年收益与最大回撤等历史数据，供客观查阅。',
      keywords: '投顾产品,公开信息,稳健理财,养老储蓄'
    }
  },
  {
    path: '/tools/fund-rank',
    redirect: '/tools'
  },
  {
    path: '/portfolio',
    component: () => import('../pages/portfolio/PortfolioPage.vue'),
    meta: {
      tab: 'tools',
      feature: 'portfolio',
      title: '组合',
      description: '智能组合构建：自建组合、DeepSeek AI 推荐组合（16 策略）与基于 Kan&Zhou 增强型风险平价的风险平价组合，辅助资产配置。',
      keywords: '智能组合,资产配置,风险平价,AI组合'
    }
  },
  {
    path: '/fund/:code',
    component: () => import('../pages/fund-detail/FundDetailPage.vue'),
    meta: {
      tab: 'tools',
      feature: 'fund-rank',
      title: '评分详情',
      description: '单只产品详情：靠谱指数综合评分、分值档位与各周期收益数据。',
      keywords: '评分详情,靠谱指数,收益数据'
    }
  },
  {
    path: '/watchlist',
    component: () => import('../pages/watchlist/WatchlistPage.vue'),
    meta: {
      tab: 'profile',
      title: '我的关注',
      description: '自选关注列表：快速查看评分与各周期收益。',
      keywords: '自选关注,关注列表,评分跟踪'
    }
  },
  {
    path: '/compare',
    component: () => import('../pages/compare/CompareToolPage.vue'),
    meta: {
      tab: 'tools',
      title: '数据对比',
      description: '多只产品同维度对比：评分、收益与回撤数据。',
      keywords: '数据对比,评分比较,数据筛选'
    }
  },
  {
    path: '/calc',
    component: () => import('../pages/calc/SipCalcPage.vue'),
    meta: {
      tab: 'tools',
      title: '定投计算器',
      description: '定投收益计算器：输入定投金额与期限，估算期末本息与总收益。',
      keywords: '定投计算器,收益计算,复利估算'
    }
  },
  {
    path: '/data-center',
    component: () => import('../pages/data-center/DataCenterPage.vue'),
    meta: {
      tab: 'tools',
      feature: 'data-center',
      ownerOnly: true,
      title: '管理',
      description: '管理：提供数据中心的数据下载与用户管理（含权限申请审批）等功能。',
      keywords: '管理中心,数据中心,数据下载,宏观数据'
    }
  },
  {
    path: '/profile',
    component: () => import('../pages/profile/ProfilePage.vue'),
    meta: {
      tab: 'profile',
      title: '我的',
      description: '我的：管理自选智能组合、查看历史 AI 组合推荐与账户信息。',
      keywords: '我的,自选关注,账户信息'
    }
  },
  // ===== 我的内容（个人内容栏目，类公众号）=====
  // 权限模型（站长明确）：
  //  - 阅读：公开可读（任何登录用户均可查看，仅代表个人观点）；
  //  - 写/发布/编辑/删除：仅管理员可操作（ownerOnly），其他用户无任何写入口。
  {
    path: '/content',
    component: () => import('../pages/my-content/MyContentPage.vue'),
    meta: {
      tab: 'content',
      feature: 'content',
      title: '娱乐 · 个人观点',
      description: 'ALLFUND-娱乐：分享个人观点、影视、美食、游戏与工具等内容，仅代表个人观点，不构成投资建议。',
      keywords: 'ALLFUND,娱乐,个人观点,影视,美食,游戏,工具'
    }
  },
  {
    path: '/content/:id',
    component: () => import('../pages/my-content/ArticleDetailPage.vue'),
    meta: {
      tab: 'content',
      feature: 'content',
      title: '文章详情',
      description: 'ALLFUND-文章详情：个人观点与内容分享。',
      keywords: 'ALLFUND,文章详情,个人观点'
    }
  },
  {
    path: '/content/editor',
    component: () => import('../pages/my-content/ArticleEditorPage.vue'),
    meta: {
      tab: 'content',
      ownerOnly: true,
      title: '写文章',
      description: '撰写独立性研究文章。',
      keywords: '写文章,独立研究'
    }
  },
  {
    path: '/content/editor/:id',
    component: () => import('../pages/my-content/ArticleEditorPage.vue'),
    meta: {
      tab: 'content',
      ownerOnly: true,
      title: '编辑文章',
      description: '编辑独立性研究文章。',
      keywords: '编辑文章,独立研究'
    }
  },
  // 旧路径重定向（带 tab 参数，跳转到正确视图）
  {
    path: '/config',
    redirect: '/signal?tab=asset'
  },
  {
    path: '/style-factor',
    redirect: '/signal?tab=factor'
  },
  {
    path: '/tools/industry-rank',
    redirect: '/signal?tab=industry'
  },
  // SPA 兜底：未匹配的前端路由重定向到首页（配合 EdgeOne SPA fallback）
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ---- 访问日志（数据中心「用户分析」数据来源） ----
let _geoCache = null
let _lastTrackPath = ''
let _lastTrackTs = 0
async function _getGeo() {
  if (_geoCache) return _geoCache
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const r = await fetch('https://ipwho.is/', { signal: ctrl.signal })
    clearTimeout(timer)
    if (r.ok) {
      const d = await r.json()
      if (d && d.success) {
        const loc = [d.region, d.city].filter(Boolean).join(' ')
        const region = (d.country === 'China' || d.country_code === 'CN')
          ? (loc || d.country)
          : (loc ? loc + ', ' + d.country : d.country)
        _geoCache = { ip: d.ip || null, region: region || null }
        return _geoCache
      }
    }
  } catch (e) { /* 忽略：geo 仅用于展示，失败则留空 */ }
  _geoCache = { ip: null, region: null }
  return _geoCache
}
async function _trackVisit(path) {
  try {
    const now = Date.now()
    if (path === _lastTrackPath && now - _lastTrackTs < 5000) return // 同路径 5s 内节流，避免刷屏
    _lastTrackPath = path
    _lastTrackTs = now
    const { data: { user } } = await supabase.auth.getUser()
    const geo = await _getGeo()
    await supabase.from('visitor_logs').insert({
      email: user?.id ? 'authenticated' : 'anonymous',
      page_path: path,
      user_agent: navigator.userAgent,
      ip_address: geo.ip,
      region: geo.region,
      visit_time: new Date().toISOString()
    })
  } catch (e) { /* 静默失败，绝不阻塞页面 */ }
}

router.afterEach((to) => {
  const baseTitle = 'ALLFUND-靠谱工具'
  document.title = (to.meta?.title || '靠谱工具') + ' | ' + baseTitle

  // 动态注入 SEO meta（description / keywords）
  const meta = to.meta || {}
  setMeta('description', meta.description || 'ALLFUND-靠谱工具 — 提供公开市场数据的整理、评分与筛选工具，仅代表个人观点，不构成投资建议。')
  setMeta('keywords', meta.keywords || 'ALLFUND,靠谱工具,评分工具,数据工具')
  // Open Graph（社交分享卡片）
  setMeta('og:title', document.title, 'property')
  setMeta('og:description', meta.description || 'ALLFUND-靠谱工具，提供公开市场数据的整理、评分与筛选，仅代表个人观点，不构成投资建议。', 'property')
  setMeta('og:type', 'website', 'property')
  setMeta('og:url', location.origin + to.fullPath, 'property')
  // 记录访问（异步，不阻塞导航）
  _trackVisit(to.fullPath)
})

/** 获取或创建 meta 标签（name 或 property 属性）并设值 */
function setMeta(key, value, attr = 'name') {
  if (!value) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

export default router
