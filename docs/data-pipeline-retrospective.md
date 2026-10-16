# allfund 数据管线复盘（基金 / 股票 / 指数 / 策略 / 估值 / 风格 / 组合）

> 复盘视角：按「构建流程」把每个功能拆成三个阶段——①寻找数据源 → ②拉数据（落地型 + 直用型）→ ③按功能计算并展示。
> 重点回答：每个阶段怎么做、有哪些数据接口、能拉到什么、哪些接口好用 / 不能用、时间到底耗在哪。
> 结论先行：**项目主要延误确实发生在「数据接口的选择与处理」——外部接口的 WAF / CORS / 反爬 / 覆盖不全，以及「同源代理层」反复重构，是时间黑洞。**

---

## 一、总体数据架构（三阶段）

```
① 寻找数据源 ──► ② 拉数据 ──────────────────────► ③ 计算 & 展示
   （外部站点/API）   ├─ 落地型：Python 脚本(GitHub Actions) → Supabase 表
                     └─ 直用型：前端/边缘函数 直接 fetch 外部 API（行情类）
                                                  │
                          落地数据经 staging→promote 三级流水线原子切换
                                                  │
                                  前端经 /api/sb-proxy 同源代理读 Supabase
```

| 阶段 | 载体 | 典型技术 |
|---|---|---|
| ① 寻找数据源 | 天天基金、东方财富、中证指数、蛋卷、腾讯、新浪期货 | 公开 Web API / 页面接口 |
| ② 拉数据·落地型 | `scripts/*.py` + GitHub Actions cron | 写 `fund_scores` / `stock_scores` / `index_scores` 等 Supabase 表 |
| ② 拉数据·直用型 | 前端 `fetch` / EdgeOne 边缘函数 | push2 行情、csindex PE、danjuan 估值 |
| ③ 计算&展示 | `compute_*.py` 评分脚本 / 前端组件 | 靠谱指数 v7、五维指数评分、风格因子、组合回测 |

---

## 二、按功能逐块拆解

### 1. 基金（FundRankPage · 靠谱指数评分）
- **数据源**：天天基金 `fund.eastmoney.com` / `api.fund.eastmoney.com`（净值、分类 t0/t1、经理、规模、分红、资产配置）、天天基金 push2 行情。
- **拉数据·落地型**：`fetch_fund_basic_info.py`、`fetch_fund_indices_em.py`、`fetch_return_all.py`、`fetch_dividends.py`、`fetch_fund_allocation.py`、`fetch_currency_funds.py` 在 `update-scores.yml` 跑，写入 `fund_scores`(46 列)、`fund_quarterly_scores`、`fund_combined`、`fund_scores_meta`、`fund_tags`、`fund_tag_funds`、`fund_tag_perf`、`tougu_products`。走 **staging 过渡表 → promote_staging.py 原子切换** 三级流水线。
- **拉数据·直用型**：前端 `fetchFundScores / fetchFundScoresCount / fetchFundMeta / fetchFundCategories / fetchFundTags`（`api/data.js`）经 `/api/sb-proxy` 同源代理读 Supabase PostgREST。
- **计算&展示**：靠谱指数 v7 = 收益 50% + 回撤 25% + 夏普 25%，横截面百分位 0–100，覆盖 8 周期(k3m–k10)，19000+ 产品含 QDII；前端服务端排序分页 + 多维度筛选。
- **接口清单**：天天基金(可用)、Supabase PostgREST via sb-proxy(可用，有 502/416 坑)、`fund_scores_meta`(提供数据日期/总数)。

### 2. 股票（StockPage · 股票选品 + stock_scores）
- **数据源**：东方财富 `push2.eastmoney.com`（实时/历史行情，CORS 直连，7/7 secid 可用）、`push2his.eastmoney.com`（历史）、腾讯 `qt.gtimg.cn` / `web.ifzq.gtimg.cn`（实时行情备用）。
- **拉数据·落地型**：`fetch_stock_scores.py` 在 `update-stock-scores.yml` 抓取沪深京 A 股 + 港股全市场，写入 `stock_scores`（**独立成长股评分公式，不走基金公式**）；staging→promote 原子切换。
- **拉数据·直用型**：前端 StockPage 直接 push2 CORS 取行情/财务；`stock_pk` 选股。
- **计算&展示**：独立基本面高分成长股公式；UI 百分比进度条（0–100%）。
- **接口清单**：push2(可用·CORS)、push2his(可用)、gtimg(可用·备用)。

### 3. 指数（IndexPage · 指数评分 + 指数估值）
- **数据源**：
  - 中证指数官网 `www.csindex.com.cn`（`indexCsiDsPe` PE-TTM 日史）→ 经 **`/api/csi-pe` 边缘函数代取**（本地 IP 直连可达、GitHub Actions 云 IP 被 WAF 403、EdgeOne 海外边缘节点可直连）。
  - 东方财富 push2（指数行情 secid，CORS 直连 7/7，中证 2000 用深市段 `2.932000`）。
  - 蛋卷 `danjuanfunds.com`（`index_eva/dj`）→ `/api/danjuan-eva` 代理（覆盖仅 **3/7**：沪深300/中证500/中证1000，**不作主源**）。
  - 乐咕乐股 `legulegu.com`（`index-basic-pe?token=MD5(日期)`）→ **已失效 404，禁用**。
- **拉数据·落地型**：`compute_index_scores.py`（`update-index-scores.yml`）算五维评分写 `index_scores`；`dtip_pe_sync.py`（`dtip-pe-sync.yml`）刷 PE 历史写 `dtip_pe_history` + `index_pe_history`。
- **拉数据·直用型**：`/api/csi-pe` 实时兜底；ValuationPage `fetchIndexEva` 走 danjuan-eva 代理。
- **计算&展示**：五维指数评分流水线；定投助手 / 指数评分实时化。
- **接口清单**：csindex via /api/csi-pe(可用·海外)、push2(可用)、danjuan(受限·3/7)、legulegu(**失效**)。

### 4. 策略（SignalPage · 宏观信号 / 特色指标 / 期货）
- **数据源**：宏观 `fetch_macro_history.py` 落地 `macro_history`（国债收益率、上证指数等）；特色指标 `jqr_indicators`（`fetch_jqr_indicators.py`）；期货/大宗商品 新浪 `finance.sina.com.cn/futures/quotes/*`（AG0/AU0/RB0… 主力合约）。
- **拉数据·落地型**：`macro_history` / `jqr_indicators` 表，前端从 Supabase 直读（经 sb-proxy）。
- **拉数据·直用型**：期货主力合约行情前端直接 fetch 新浪。
- **计算&展示**：SignalPage 多图——股债性价比、行业估值、破净→市值/GDP、大宗→主力合约（commodity 性价比此前因 `build_style_factors.py` 无 cron 过期，已补 `update-style-factors.yml`）。
- **接口清单**：新浪期货 quotes(可用·直连)、Supabase macro_history/jqr(可用)。

### 5. 估值（估值页 / 定投助手 DtipPanel）
- **数据源**：同指数估值（csindex PE + danjuan）。
- **拉数据·落地型**：`dtip_pe_sync.py` 落地 `dtip_pe_history`；`/api/csi-pe` 实时。
- **计算&展示**：DtipPanel、ValuationPage（`fetchIndexEva` → danjuan）。
- **已知坑**：danjuan 仅 3/7 覆盖、legulegu 404 死。

### 6. 风格（风格因子 StyleFactorPage）
- **数据源**：`build_style_factors.py` / `calc_style_factors.py`（commodity 等）。
- **拉数据·落地型**：写 `style_factors` 表（此前无 cron，2026 补 `update-style-factors.yml`）。
- **计算&展示**：股票 / 债券 / 大宗商品 三档风格因子。
- **接口清单**：复用宏观/行情落地数据。

### 7. 组合（组合 / 智能选基 / AI 大 PK）
- **数据源**：复用 `fund_scores` / `stock_scores`。
- **拉数据·落地型**：组合持仓、AI 组合标签（DeepSeek 生成）、规模约束 >2 亿。
- **计算&展示**：PortfolioPage、AIPkPanel、StockPkPanel；AI 大 PK 走真实 LLM（千问百炼 deepseek 等），`stock_pk`/`fund_pk` 表。
- **接口清单**：Supabase（可用）、千问百炼 API（部分欠费 403）。

---

## 三、数据接口可用性「红黑榜」

### ✅ 好用（稳定、可直接依赖）
| 接口 | 用途 | 备注 |
|---|---|---|
| 东方财富 `push2` / `push2his` | 股票/基金/指数实时&历史行情 | CORS 直连，7/7 secid 可用，最稳 |
| 天天基金 `fund.eastmoney.com` | 基金基础信息/净值/分类/经理/规模 | CI 抓取稳定，主数据源 |
| 中证指数 `csindex` 经 `/api/csi-pe` | PE-TTM 日史 | **必须走 EdgeOne 海外边缘函数**，7 目标指数全 200 |
| `/api/sb-proxy` 同源代理 | 国内→新加坡 Supabase 读 | 双路竞争兜底（直连+代理） |
| 腾讯 `qt.gtimg.cn` / `web.ifzq.gtimg.cn` | 实时行情 | push2 备用 |
| 新浪期货 `finance.sina.com.cn/futures/quotes` | 大宗商品主力合约 | 直接可用 |

### ❌ 不能用 / 严重受限
| 接口 | 问题 | 处置 |
|---|---|---|
| `csindex` **直连**（GitHub Actions 云 IP） | WAF 403（本地可直连） | 一律走 `/api/csi-pe` 边缘函数代取 |
| 蛋卷 `danjuan` | 覆盖仅 **3/7**（沪深300/中证500/中证1000），且需代理 | 只能补充，不做主源；`index_code` 须前后缀包含匹配 |
| 乐咕乐股 `legulegu` | `index-basic-pe` **404 已失效** | 仅留档，**禁用** |
| `/api/sb-proxy` + `Prefer: count=exact` | 一律 **502** | 改用 `.limit().single()` 或手动 count |
| EdgeOne CDN 对 `Range` 头 | 边缘层直接 **416** | `supabase.js` 已把 Range 改写为 offset/limit |
| 国内直连 Supabase 新加坡 | 写操作不稳定 | 写统一走 Edge Function 代理 |

---

## 四、时间到底耗在哪（根因分析）

1. **外部接口试错成本高**：WAF 403（csindex 云 IP）、CORS 限制、反爬、字段口径不明（danjuan 前后缀匹配规则、legulegu 失效是跑通后才发现）。每个新数据源都经历「试→被拦→换方案」的循环。
2. **同源代理层反复重构**：`sb-proxy` 的 502 / 416 问题，双路竞争、Range 改写、认证端点双打——这块是隐性时间黑洞，且容易和「真的没数据」混淆。
3. **落地型 vs 直用型 的权衡反复**：哪些该进 Supabase（稳定、可控、可算），哪些可前端直连（行情）。csindex 被迫走边缘函数代取就是典型——本想直连，被 WAF 逼成「自建代理层」。
4. **数据口径漂移导致反复排查**：`fund_scale` 冻结、`t0` 分类权威不可漂移、蛋卷覆盖不全导致「算出来是空」——定位「空」比写代码更耗时。
5. **三级流水线（staging→promote）的断点续传 / 校验开销**：保质量但拉长单次数据更新链路，CI 失败常在「落库前校验」环节。

---

## 五、复盘结论与建议

- **建立「接口健康度清单」**：状态（可用 / 受限 / 失效）+ 替代方案 + 谁在用 + 上次验证时间。把本次红黑榜沉淀成单一事实源，避免重复踩坑。
- **统一代理层**：所有外部受限接口（csindex 类）一律走 EdgeOne 边缘函数同源代取，**前端不在浏览器里硬直连受限源**。
- **落地优先原则**：凡是参与「计算」的数据（评分 / 因子 / 估值分位），一律先落 Supabase 再算，前端只做展示；**纯展示型行情（push2）才直连**。
- **CI 把接口可用性自检前置**：如 csindex 云 IP 403 在 CI 第一步就告警，而非运行时才发现数据断流。
- **字段口径集中定义**：danjuan 前后缀匹配、分类权威来源等规则集中到一处，避免散落各脚本。
- **代理层与「无数据」解耦诊断**：给 sb-proxy 返回加明确的错误码（区分 502/416/404/超时），避免把「网络层异常」误判成「业务无数据」。
