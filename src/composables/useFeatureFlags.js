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

// 默认开关：表不存在时的兜底（全部开放，内容公开可读）
const DEFAULT_FLAGS = {
  'fund-rank': true,
  signal: true,
  portfolio: true,
  content: true,
  'login-wall': false,  // 首页权限墙：默认关闭（公开可读）。
                        // 注意：此前默认 true，但 feature_flags 查询失败（Supabase 抖动/表异常）
                        // 会回退到此默认→误弹墙+锁门外。改为 false 避免「一抖就锁门」。
                        // 平时仍按 DB 里的开关值生效（设为 on 则照常开墙）。
}

// 可在面板中切换的功能清单（与一级 tab 完全一致：娱乐/策略/选品/组合/管理）
export const TOGGLEABLE_FEATURES = [
  { key: 'content', label: '娱乐', desc: '娱乐内容，公开可读（无需登录）' },
  { key: 'signal', label: '策略', desc: '宏观信号、股债性价比、风格因子、行业估值' },
  { key: 'fund-rank', label: '选品', desc: '靠谱指数评分、基金详情、基金对比' },
  { key: 'portfolio', label: '组合', desc: '个人组合、智能选基、组合回测' },
  { key: 'admin', label: '管理', desc: '数据中心(管理)权限，可管理其他用户' },
  { key: 'login-wall', label: '首页权限墙', desc: '开启后未登录访客访问站点需先登录（首页权限墙）；关闭则全站公开可读（默认关闭）。' },
]

// 模块级单例：所有组件共享同一份 flags
const flags = ref({ ...DEFAULT_FLAGS })
const loaded = ref(false)

export function useFeatureFlags() {
  /** 从 feature_flags 表加载开关（失败回退默认，不抛错） */
  async function loadFeatureFlags() {
    if (!supabase) { loaded.value = true; return }
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, open')
        .limit(100)
      if (!error && Array.isArray(data)) {
        const map = { ...DEFAULT_FLAGS }
        for (const row of data) map[row.key] = !!row.open
        flags.value = map
      }
    } catch (e) {
      // 表不存在或网络异常：保留默认（全部开放）
    } finally {
      loaded.value = true
    }
  }

  /** 某功能当前是否全局开放（未配置视为开放） */
  function featureEnabled(key) {
    if (key == null) return true
    const v = flags.value[key]
    return v === undefined ? true : v
  }

  /** 管理员切换开关（走 SECURITY DEFINER RPC，服务端校验 57502460@qq.com） */
  async function setFeatureFlag(key, open) {
    if (!supabase) throw new Error('未连接数据库')
    const { error } = await supabase.rpc('set_feature_flag', { p_key: key, p_open: open })
    if (error) throw error
    flags.value = { ...flags.value, [key]: open }
  }

  return { flags, loaded, loadFeatureFlags, featureEnabled, setFeatureFlag }
}
