/**
 * useFeatureFlags.js — 全局功能开放开关
 *
 * 用途：站长处（57502460@qq.com）在「管理-用户分析-功能开放控制」面板里
 * 逐个切换功能（信号 / 工具 / 组合 / 内容）的开放/关闭，前端据此动态控制
 * 路由可见性与访问权限。未建表或查询失败时回退 DEFAULT_FLAGS（全部开放），
 * 保证站点不崩。
 *
 * 数据来源：Supabase 表 feature_flags（anon 可读，RLS using(true)）；
 * 写入走 SECURITY DEFINER 的 RPC set_feature_flag（仅主管理员可执行）。
 */
import { ref } from 'vue'
import { supabase } from '../api/supabase'

// 默认开关：表不存在时的兜底（全部开放，内容公开可读）。
// 二级/三级 tab 同样默认开放（安全默认：权限墙默认关闭、各子功能默认开放）。
const DEFAULT_FLAGS = {
  // 一级
  'fund-rank': true,
  signal: true,
  portfolio: true,
  content: true,
  'login-wall': false,  // 首页权限墙：默认关闭（公开可读）。
                        // 注意：此前默认 true，但 feature_flags 查询失败（Supabase 抖动/表异常）
                        // 会回退到此默认→误弹墙+锁门外。改为 false 避免「一抖就锁门」。
                        // 平时仍按 DB 里的开关值生效（设为 on 则照常开墙）。
  // 选品 · 二级
  'tools-stock': true,
  'tools-index': true,
  'tools-fund-index': true,
  'tools-tougu': true,
  // 策略 · 二级
  'signal-macro': true,
  'signal-asset': true,
  'signal-factor': true,
  'signal-jqr': true,
  'signal-valuation': true,
  'signal-dtip': true,
  // 策略 · 风格因子 · 三级
  'factor-stock': true,
  'factor-bond': true,
  'factor-commodity': true,
  // 娱乐 · 二级
  'content-blog': true,
  'content-film': true,
  'content-food': true,
  'content-math': true,
  'content-yuwen': true,
  'content-game': true,
  'content-tool': true,
  'content-eng': true,
  'content-xinao': true,
  // 娱乐 · 语文 · 三级
  'yuwen-gushiwen': true,
  // 娱乐 · 奥数 · 三级
  'math-gaosi': true,
  'math-junior': true,
  'math-mogu': true,
  'math-mc': true,
  'math-ledu': true,
  'math-aojing': true,
  'math-prime': true,
  'math-mul': true,
  'math-base': true,
  // 娱乐 · 英文 · 三级
  'eng-unlock': true,
  'eng-re': true,
  'eng-ledu': true,
  'eng-nce': true,
  'eng-toefl': true,
  // 娱乐 · 美食 · 三级
  'food-chef': true,
  'food-musteat': true,
  // 娱乐 · 信奥 · 三级
  'xinao-ascii': true,
}

/**
 * 子功能 → 父功能 映射（用于沿父链判断权限）。
 * 任一祖先关闭，则该子功能整体关闭；父开启但子关闭，则子单独关闭。
 * 权限在「一级粒度」授予：用户只要拥有一级功能（如 fund-rank），
 * 即视为拥有其下所有二级/三级子功能（hasFeature 沿父链向上匹配）。
 */
export const SUB_FEATURE_PARENTS = {
  // 选品 · 二级
  'tools-stock': 'fund-rank',
  'tools-index': 'fund-rank',
  'tools-fund-index': 'fund-rank',
  'tools-tougu': 'fund-rank',
  // 策略 · 二级
  'signal-macro': 'signal',
  'signal-asset': 'signal',
  'signal-factor': 'signal',
  'signal-jqr': 'signal',
  'signal-valuation': 'signal',
  'signal-dtip': 'signal',
  // 策略 · 风格因子 · 三级
  'factor-stock': 'signal-factor',
  'factor-bond': 'signal-factor',
  'factor-commodity': 'signal-factor',
  // 娱乐 · 二级（注意：content-blog 已提升为独立一级根节点，见 FEATURE_GROUPS[0]，不再挂 content 下）
  'content-film': 'content',
  'content-food': 'content',
  'content-math': 'content',
  'content-yuwen': 'content',
  'yuwen-gushiwen': 'content-yuwen',
  'content-game': 'content',
  'content-tool': 'content',
  'content-eng': 'content',
  'content-xinao': 'content',
  // 娱乐 · 奥数 · 三级
  'math-gaosi': 'content-math',
  'math-junior': 'content-math',
  'math-mogu': 'content-math',
  'math-mc': 'content-math',
  'math-ledu': 'content-math',
  'math-aojing': 'content-math',
  'math-prime': 'content-math',
  'math-mul': 'content-math',
  'math-base': 'content-math',
  // 娱乐 · 英文 · 三级
  'eng-unlock': 'content-eng',
  'eng-re': 'content-eng',
  'eng-ledu': 'content-eng',
  'eng-nce': 'content-eng',
  'eng-toefl': 'content-eng',
  // 娱乐 · 美食 · 三级
  'food-chef': 'content-food',
  'food-musteat': 'content-food',
  // 娱乐 · 信奥 · 三级
  'xinao-ascii': 'content-xinao',
}

// 可在面板中切换的功能清单（按网站结构分组：一级 → 二级 → 三级）。
// 每项含 key / label / desc；FEATURE_GROUPS 用于「管理-功能开放控制」按层级渲染，
// TOGGLEABLE_FEATURES 为其扁平化（保留旧调用方兼容）。
export const FEATURE_GROUPS = [
  {
    title: '一级功能（总开关）',
    items: [
      { key: 'content', label: '娱乐', desc: '娱乐内容，公开可读（无需登录）' },
      { key: 'content-blog', label: '博客', desc: '博客内容，公开可读（无需登录）；关闭后博客 Tab 与文章全站不可见。' },
      { key: 'signal', label: '策略', desc: '宏观信号、股债性价比、风格因子、行业估值' },
      { key: 'fund-rank', label: '选品', desc: '靠谱指数评分、基金详情、基金对比' },
      { key: 'portfolio', label: '组合', desc: '个人组合、智能选基、组合回测' },
      { key: 'admin', label: '管理', desc: '数据中心(管理)权限，可管理其他用户' },
      { key: 'login-wall', label: '首页权限墙', desc: '开启后未登录访客访问站点需先登录（首页权限墙）；关闭则全站公开可读（默认关闭）。' },
    ],
  },
  {
    title: '选品 · 二级 Tab',
    items: [
      { key: 'tools-stock', label: '股票', desc: '选品下的股票筛选 / 排序 / 对比' },
      { key: 'tools-index', label: '指数', desc: '选品下的指数评分与筛选' },
      { key: 'tools-fund-index', label: '基金指数', desc: '选品下的基金指数行情与分类指数' },
      { key: 'tools-tougu', label: '投顾产品', desc: '选品下的投顾产品公开数据' },
    ],
  },
  {
    title: '策略 · 二级 Tab',
    items: [
      { key: 'signal-macro', label: '宏观策略', desc: '策略下的宏观指标信号' },
      { key: 'signal-asset', label: '资产配置', desc: '策略下的资产配置 / 风险平价' },
      { key: 'signal-factor', label: '风格因子', desc: '策略下的风格因子（含三级：股票 / 债券 / 大宗商品）' },
      { key: 'signal-jqr', label: '特色指标', desc: '策略下的特色指标' },
      { key: 'signal-valuation', label: '行业估值', desc: '策略下的行业估值' },
      { key: 'signal-dtip', label: '定投助手', desc: '策略下的定投助手' },
    ],
  },
  {
    title: '策略 · 风格因子 · 三级 Tab',
    items: [
      { key: 'factor-stock', label: '股票风格', desc: '风格因子下的股票风格' },
      { key: 'factor-bond', label: '债券风格', desc: '风格因子下的债券风格' },
      { key: 'factor-commodity', label: '大宗商品', desc: '风格因子下的大宗商品' },
    ],
  },
  {
    title: '娱乐 · 二级 Tab',
    items: [
      { key: 'content-film', label: '影视', desc: '娱乐下的影视内容' },
      { key: 'content-food', label: '美食', desc: '娱乐下的美食（含三级：大厨榜 / 必吃榜）' },
      { key: 'content-game', label: '游戏', desc: '娱乐下的游戏内容' },
      { key: 'content-math', label: '奥数', desc: '娱乐下的奥数（含三级：各机构）' },
      { key: 'content-yuwen', label: '语文', desc: '娱乐下的语文内容' },
      { key: 'content-tool', label: '工具', desc: '娱乐下的工具内容' },
      { key: 'content-xinao', label: '信奥', desc: '娱乐下的信奥（信息学奥赛）内容（含三级：ASCII码表）' },
    ],
  },
  {
    title: '娱乐 · 奥数 · 三级 Tab（机构）',
    items: [
      { key: 'math-gaosi', label: '高斯', desc: '奥数下的高斯导引' },
      { key: 'math-junior', label: '初联', desc: '奥数下的初中联赛' },
      { key: 'math-mogu', label: '蘑菇', desc: '奥数下的蘑菇培优' },
      { key: 'math-mc', label: '学而思MC-club', desc: '奥数下的学而思 MC' },
      { key: 'math-ledu', label: '乐读集训队', desc: '奥数下的乐读集训队' },
      { key: 'math-aojing', label: '奥精', desc: '奥数下的奥数精讲与测试' },
      { key: 'math-prime', label: '质数', desc: '奥数下的质数' },
      { key: 'math-mul', label: '乘法口诀', desc: '奥数下的乘法口诀' },
      { key: 'math-base', label: '进位制', desc: '奥数下的进位制转换与进位制计算器' },
    ],
  },
  {
    title: '娱乐 · 英文 · 三级 Tab（课程）',
    items: [
      { key: 'eng-unlock', label: 'Unlock', desc: '英文下的 Unlock（剑桥学术英语）' },
      { key: 'eng-re', label: 'Reading Explorer', desc: '英文下的 Reading Explorer（国家地理非虚构阅读）' },
      { key: 'eng-ledu', label: '乐读', desc: '英文下的乐读（分级原版阅读）' },
      { key: 'eng-nce', label: '新概念', desc: '英文下的新概念英语' },
      { key: 'eng-toefl', label: '小托福', desc: '英文下的小托福加油站（Week1-5 听力/阅读/语用）' },
    ],
  },
  {
    title: '娱乐 · 美食 · 三级 Tab',
    items: [
      { key: 'food-chef', label: '大厨榜-上海', desc: '美食下的大厨榜-上海' },
      { key: 'food-musteat', label: '必吃榜-上海', desc: '美食下的必吃榜-上海' },
    ],
  },
  {
    title: '娱乐 · 信奥 · 三级 Tab',
    items: [
      { key: 'xinao-ascii', label: 'ASCII码表', desc: '信奥下的 ASCII 码表查询工具' },
    ],
  },
  {
    title: '娱乐 · 语文 · 三级 Tab',
    items: [
      { key: 'yuwen-gushiwen', label: '古诗文大赛', desc: '语文下的古诗文大赛讲义（四年级·含答案，170 题）' },
    ],
  },
]

export const TOGGLEABLE_FEATURES = FEATURE_GROUPS.flatMap(g => g.items)

// 模块级单例：所有组件共享同一份 flags
const flags = ref({ ...DEFAULT_FLAGS })
// 受限标记（开放但需申请权限才能访问）；默认全部 false（未配置即不受限）
const restrictedFlags = ref({})
const loaded = ref(false)

export function useFeatureFlags() {
  /** 从 feature_flags 表加载开关（失败回退默认，不抛错） */
  async function loadFeatureFlags() {
    if (!supabase) { loaded.value = true; return }
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, open, restricted')
        .limit(100)
      if (!error && Array.isArray(data)) {
        const map = { ...DEFAULT_FLAGS }
        const rmap = {}
        for (const row of data) {
          map[row.key] = !!row.open
          rmap[row.key] = !!row.restricted
        }
        flags.value = map
        restrictedFlags.value = rmap
      }
    } catch (e) {
      // 表不存在或网络异常：保留默认（全部开放、不受限）
    } finally {
      loaded.value = true
    }
  }

  /** 某功能当前是否全局开放（未配置视为开放；沿父链向上，任一祖先关闭则整体关闭） */
  function featureEnabled(key) {
    if (key == null) return true
    let k = key
    while (k != null) {
      const v = flags.value[k]
      if (v === false) return false   // 显式关闭 → 整条链路关闭
      // 未配置（undefined）→ 视为开放（安全默认），继续向上检查父级
      k = SUB_FEATURE_PARENTS[k] ?? null
    }
    return true
  }

  /** 某功能当前是否「受限」（开放但需申请权限才能访问；沿父链向上，任一祖先受限则整体受限） */
  function featureRestricted(key) {
    if (key == null) return false
    let k = key
    while (k != null) {
      if (restrictedFlags.value[k]) return true   // 显式受限 → 整条链路受限
      k = SUB_FEATURE_PARENTS[k] ?? null
    }
    return false
  }

  /** 管理员切换开关（走 SECURITY DEFINER RPC，服务端校验 57502460@qq.com）。
   *  open: 是否开放；restricted: 是否需申请权限（null = 保持原值，向后兼容旧调用） */
  async function setFeatureFlag(key, open, restricted = null) {
    if (!supabase) throw new Error('未连接数据库')
    const { error } = await supabase.rpc('set_feature_flag', {
      p_key: key,
      p_open: open,
      p_restricted: restricted,
    })
    if (error) throw error
    flags.value = { ...flags.value, [key]: open }
    if (restricted !== null) {
      restrictedFlags.value = { ...restrictedFlags.value, [key]: restricted }
    }
  }

  return { flags, restrictedFlags, loaded, loadFeatureFlags, featureEnabled, featureRestricted, setFeatureFlag }
}
