<template>
  <div class="dtip-panel">
    <!-- ============ 1. 规则说明 ============ -->
    <div class="card">
      <div class="card-title">定投助手<span class="card-subtitle">估值分位策略定投 · 周度自动执行</span></div>
      <p class="card-desc">
        系统依据指数 PE（TTM）相对其<b>滚动 5 年</b>历史的百分位，在每周一自动判定估值区间并执行：估值分位越低，买入金额越高；分位进入极高区间时按持仓市值 15% 卖出回收资金；中间「高估」档位<b>观望不操作</b>，不在偏贵的位置继续消耗资金。每周 450/300/150 元的金额并非随意设定，而是由指数波动周期测算反推，详见下方「策略与资金测算说明」。估值分位口径与历史成交价均取自公开网络。
      </p>
      <div class="table-wrap">
        <table class="data-table rule-table">
          <thead>
            <tr>
              <th>估值区间</th>
              <th>滚动 5 年 PE 分位</th>
              <th>每周操作</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in ZONES" :key="z.key">
              <td><span class="tag" :class="z.tagClass">{{ z.label }}</span></td>
              <td>{{ z.rangeText }}</td>
              <td>{{ z.sideText }}</td>
              <td>{{ z.actionText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="data-source">数据来源：公开网络。回测为策略历史模拟演示，非真实交易，不构成投资建议。</p>
    </div>

    <!-- ============ 1.5 策略与资金测算说明 ============ -->
    <div class="card study-card">
      <div class="card-title">策略与资金测算说明<span class="card-subtitle">为什么是每周 450 / 300 / 150 元</span></div>

      <div class="study-step">
        <div class="study-idx">1</div>
        <div class="study-body">
          <div class="study-h">每周金额不是拍脑袋定的，而是被「资金不能耗尽」这个约束反推出来的</div>
          <p class="study-p">
            真金白银是有限的：本金 <b>10 万元</b>一次性放入账户，此后不再追加。策略会自动买卖、卖出回款会补充现金，
            但资金池没有任何外部补给，唯一的致命风险是——<b>遇上一段很长、一直没有触发卖出的单边买入行情</b>，本金被买光后策略就停摆了。
            所以正确的算法不是「10 年 × 每周 500 元 = 26 万」这种按名义年限直接相乘的算法（它忽略了卖出回款），
            而是先测出指数<b>最长的连续买入周期</b>要占用多少钱，再反推每周该买多少。
          </p>
        </div>
      </div>

      <div class="study-step">
        <div class="study-idx">2</div>
        <div class="study-body">
          <div class="study-h">先测波动周期：滚动 5 年分位锚下，各指数最长「连续买方季」</div>
          <p class="study-p">
            「买方季」指相邻两次卖出之间的那段连续买入期。样本区间 {{ SIZING_STUDY.sample }}，实测结果：
          </p>
          <div class="table-wrap">
            <table class="data-table study-table">
              <thead>
                <tr>
                  <th>指数</th>
                  <th class="num">最长买方季</th>
                  <th class="num">折合</th>
                  <th class="num">该季资金需求*</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in SIZING_STUDY.seasons" :key="s.name" :class="{ 'row-worst': s.name === SIZING_STUDY.worstName }">
                  <td>{{ s.name }}<span v-if="s.name === SIZING_STUDY.worstName" class="tag tag-blue study-badge">最坏</span></td>
                  <td class="num">{{ s.weeks }} 周</td>
                  <td class="num">{{ s.years }}</td>
                  <td class="num">{{ fmt(s.need, 0) }} 元</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="data-source">* 按改造前的基准金额（极低 3000 / 低 2000 / 合理 1000）测算，已扣除期间卖出回款，即真实的资金占用峰值。</p>
        </div>
      </div>

      <div class="study-step">
        <div class="study-idx">3</div>
        <div class="study-body">
          <div class="study-h">反推尺寸：本金 ÷ 最坏需求</div>
          <div class="study-formula">
            缩放系数 = 固定本金 100,000 元 ÷ 最坏资金需求 {{ fmt(SIZING_STUDY.worstNeed, 0) }} 元（{{ SIZING_STUDY.worstName }}）= {{ fmt(SIZING_STUDY.scaleRaw, 4) }}
            → 保守取整 <b>{{ fmt(SIZING_STUDY.scaleUsed, 3) }}</b>
          </div>
          <div class="study-formula">
            每周金额 = 基准金额 × {{ fmt(SIZING_STUDY.scaleUsed, 3) }} → 极低 3000 → <b>450 元</b>　低 2000 → <b>300 元</b>　合理 1000 → <b>150 元</b>
          </div>
          <p class="study-p">
            也就是说：即使重演 {{ SIZING_STUDY.worstName }} 那段 {{ SIZING_STUDY.seasons.find(s => s.name === SIZING_STUDY.worstName).years }} 一次都没触发卖出的极端行情，
            10 万元本金也刚好够用到最后一周（实际占用峰值 99,600 元，留有余量），不会中途枯竭。
          </p>
        </div>
      </div>

      <div class="study-step">
        <div class="study-idx">4</div>
        <div class="study-body">
          <div class="study-h">验证：7 个指数跑同样的 10 年，资金耗尽次数 = {{ SIZING_STUDY.exhausted }}</div>
          <div class="table-wrap">
            <table class="data-table study-table">
              <thead>
                <tr>
                  <th>指数</th>
                  <th class="num">周数</th>
                  <th class="num">买入次数</th>
                  <th class="num">卖出次数</th>
                  <th class="num">累计投入</th>
                  <th class="num">期末总值</th>
                  <th class="num">本金收益率</th>
                  <th class="num">资金 IRR</th>
                  <th class="num">平均仓位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in SIZING_STUDY.results" :key="r.name">
                  <td>{{ r.name }}</td>
                  <td class="num">{{ r.weeks }}</td>
                  <td class="num">{{ r.buys }}</td>
                  <td class="num">{{ r.sells }}</td>
                  <td class="num">{{ fmt(r.invested, 0) }}</td>
                  <td class="num">{{ fmt(r.value, 0) }}</td>
                  <td class="num" :class="r.profitPct >= 0 ? 'text-up' : 'text-down'">{{ fmt(r.profitPct, 1) }}%</td>
                  <td class="num" :class="r.irr >= 0 ? 'text-up' : 'text-down'">{{ fmt(r.irr, 1) }}%</td>
                  <td class="num">{{ fmt(r.avgPos, 1) }}%</td>
                </tr>
                <tr class="row-sum">
                  <td>平均</td>
                  <td class="num">—</td>
                  <td class="num">—</td>
                  <td class="num">—</td>
                  <td class="num">—</td>
                  <td class="num">—</td>
                  <td class="num text-up">{{ fmt(SIZING_STUDY.avgProfitPct, 1) }}%</td>
                  <td class="num text-up">{{ fmt(SIZING_STUDY.avgIrr, 1) }}%</td>
                  <td class="num">{{ fmt(SIZING_STUDY.avgPos, 1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="data-source">
            中证2000（160 周）与中证A500（100 周）样本较短，仅覆盖最近 2–3 年，其收益率不具统计意义，仅列出以保证口径完整。<br>
            <b>两个收益率口径的区别</b>：「本金收益率」= 期末总值 ÷ 10 万本金 − 1，衡量这 10 万整体赚了多少；
            「资金 IRR」= 按每周实际投入现金流计算的资金加权收益，衡量<b>已动用资金</b>的效率，因此数值明显高于前者。
            上方回测卡片显示的 IRR 是前者口径（全组合年化），两者分母不同，不可直接比较。
          </p>
        </div>
      </div>

      <div class="study-step">
        <div class="study-idx">5</div>
        <div class="study-body">
          <div class="study-h">这次改动的三件事，以及为什么必须一起改</div>
          <div class="table-wrap">
            <table class="data-table study-table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>改造前</th>
                  <th>改造后</th>
                  <th>为什么要改</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>分位锚</td>
                  <td>发布至今全史</td>
                  <td>滚动 5 年</td>
                  <td class="study-cell-left">
                    全史锚会被早年高 PE 体制长期污染。实测：中证500/1000 锚到早年高估值时代后，
                    现在永远显示「便宜」，极度高估周占比仅 1.3%、回补率 0.1%，等于只买不卖，必然买光本金；
                    反之 A500/2000 因发布晚、样本短，37%~41% 的周都在卖出，回补率超过 100%。
                    两者都不是真正的均值回复，而是锚的方向决定的单边偏置。
                  </td>
                </tr>
                <tr>
                  <td>高估档（70%~90%）</td>
                  <td>买入 500 元</td>
                  <td>观望不操作</td>
                  <td class="study-cell-left">
                    在相对偏贵的位置继续花钱买入，本身就是自相矛盾。同等条件下对照（卖出同为 15%）：
                    改为观望后 7 指数平均本金收益率由 18.6% 提升到 19.3%，
                    同时最长买方季的资金需求从 70.8 万降到 66.4 万 —— 省下来的钱让每周额度可以从 424 元提到 450 元。
                  </td>
                </tr>
                <tr>
                  <td>极度高估档（≥90%）</td>
                  <td>固定赎回 3000 元</td>
                  <td>赎回持仓市值的 {{ SELL_RATIO_TEXT }}</td>
                  <td class="study-cell-left">
                    固定金额与仓位规模脱节：仓位小时一次卖穿、仓位大时卖不动，回款跟不上支出。
                    改为比例赎回后回补额随仓位自动伸缩，实测 7 指数资金回补率落在 103%~136% 区间（卖出回款 ≥ 累计投入），
                    现金池才真正能自我周转。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="study-step">
        <div class="study-idx">6</div>
        <div class="study-body">
          <div class="study-h">窗口为什么选 5 年而不是 3 年</div>
          <p class="study-p">
            在<b>只换分位窗口、卖出规则不动</b>的前提下，各窗口几乎没有区别——7 指数平均本金收益率全史 21.6%、5 年 23.8%、2 年 24.0%，
            最大差距不到 2.5 个百分点。只有把卖出同时改成「按持仓比例」之后，滚动窗口的优势才显现出来：
          </p>
          <div class="table-wrap">
            <table class="data-table study-table">
              <thead>
                <tr>
                  <th>分位锚窗口</th>
                  <th class="num">仅换窗口（卖出仍固定金额）</th>
                  <th class="num">窗口 + 比例卖出</th>
                  <th class="num">资金回补率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in SIZING_STUDY.windowCompare" :key="w.w" :class="{ 'row-worst': w.w === '近5年' }">
                  <td>{{ w.w }}<span v-if="w.w === '近5年'" class="tag tag-blue study-badge">采用</span></td>
                  <td class="num">{{ fmt(w.oldRet, 1) }}%</td>
                  <td class="num" :class="w.newRet >= 0 ? 'text-up' : 'text-down'">{{ fmt(w.newRet, 1) }}%</td>
                  <td class="num">{{ fmt(w.recov, 1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="study-p">
            滚动 5 年既能覆盖一轮完整的牛熊周期，又不至于把早年高估值体制带进样本；
            再短（1–2 年）会被短期噪声牵着走，再长（7 年 / 全史）又回到体制污染的老问题。故选 5 年。
          </p>
          <p class="study-p study-warn">
            诚实边界：以上为单条历史路径的样本内测算，样本约 11 年、含 2015 年高点起步的不利起点，未计交易费用与冲击成本；
            不同缩放口径下收益率差异均在 ±1.5 个百分点内，说明结论对参数不敏感，但不应据此推断未来收益。
          </p>
        </div>
      </div>
    </div>

    <!-- ============ 2. 指数估值看板（实时）============ -->
    <div class="card">
      <div class="card-title">
        指数估值分位
        <span class="card-subtitle">公开网络官方 PE · 每30分钟更新</span>
        <button class="refresh-btn" type="button" :disabled="loadingEva" @click="loadEva">{{ loadingEva ? '加载中…' : '刷新' }}</button>
      </div>
      <div class="error-card" v-if="evaError">
        <p>估值数据加载失败：{{ evaError }}</p>
        <p class="err-hint">提示：/api/csi-pe 为 EdgeOne 边缘函数，建议在线上环境查看；本地调试可直连公开网络数据源核对。</p>
      </div>
      <p class="val-loading" v-else-if="loadingEva">估值数据加载中…</p>
      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>指数</th>
              <th class="num">全史分位<span class="th-note">参考</span></th>
              <th class="num">近5年分位<span class="th-note">判据</span></th>
              <th class="num">近3年分位<span class="th-note">参考</span></th>
              <th>估值区间</th>
              <th>本周计划</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="idx in DCA_INDICES" :key="idx.code" :class="{ 'row-active': idx.code === activeCode }" @click="activeCode = idx.code">
              <td>{{ idx.name }}</td>
              <td class="num">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pe, 2) }}</td>
              <td class="num muted-col" :class="pctClass(evaByCode[idx.code] && evaByCode[idx.code].pct_all)">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_all, 2) }}%</td>
              <td class="num key-col">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_5y, 2) }}%</td>
              <td class="num muted-col" :class="pctClass(evaByCode[idx.code] && evaByCode[idx.code].pct_3y)">{{ fmt(evaByCode[idx.code] && evaByCode[idx.code].pct_3y, 2) }}%</td>
              <td><span class="tag" :class="zoneOf(idx.code).tagClass">{{ zoneOf(idx.code).label }}</span></td>
              <td>{{ zoneOf(idx.code).actionText }}</td>
            </tr>
          </tbody>
        </table>
        <p class="data-source" v-if="evaDate">估值数据日期：{{ evaDate }}。区间判定以<b>滚动 5 年分位</b>为准（全史、近 3 年两列仅供交叉参考）；中证A500、中证2000 等新指数历史较短，滚动窗口内样本不足时会自动回退到全史分位。</p>
      </div>
    </div>

    <!-- ============ 3. 指数选择 ============ -->
    <div class="dtip-tabs">
      <button
        v-for="idx in DCA_INDICES"
        :key="idx.code"
        type="button"
        class="dtip-tab"
        :class="{ active: idx.code === activeCode }"
        @click="activeCode = idx.code"
      >{{ idx.name }}</button>
    </div>

    <!-- ============ 4. 本周自动定投计划 ============ -->
    <div class="card">
      <div class="card-title">
        本周自动定投计划
        <span class="card-subtitle">{{ activeName }} · 系统将于本周一按以下方案自动执行</span>
      </div>
      <div class="zone-banner" :class="curZone.tagClass === 'tag-green' ? 'is-cheap' : curZone.tagClass === 'tag-red' ? 'is-expensive' : 'is-neutral'">
        <div class="zone-main">
          <span class="zone-label">当前估值区间</span>
          <span class="tag" :class="curZone.tagClass">{{ curZone.label }}</span>
          <span class="zone-amount">本周操作：{{ curZone.actionText }}</span>
        </div>
        <div class="zone-sub" v-if="curEva">
          PE(TTM) {{ fmt(curEva.pe, 2) }} · <b>滚动5年分位 {{ fmt(curEva.pct_5y, 2) }}%</b>（判据） · 全史 {{ fmt(curEva.pct_all, 2) }}% · 近3年 {{ fmt(curEva.pct_3y, 2) }}%
        </div>
        <div class="zone-sub" v-else>估值数据加载中或暂无</div>
      </div>
      <p class="plan-note">说明：以上为「本周计划」演示。服务端自动定投（Part 2）将按相同规则在每周一开盘前判定并执行，定投记录可在「定投效果」中查看。</p>
    </div>

    <!-- ============ 5. 自动定投回测（策略历史模拟）============ -->
    <div class="card">
      <div class="card-title">
        自动定投回测 · 策略效果模拟
        <span class="card-subtitle">过去 10 年（约 {{ btWeeks }} 周）每周一按滚动 5 年估值分位调仓 · 初始本金各指数 10 万元</span>
        <button class="refresh-btn" type="button" :disabled="loadingBt" @click="loadBacktest">{{ loadingBt ? '计算中…' : '重新计算' }}</button>
      </div>

      <div class="error-card" v-if="btError">
        <p>回测数据加载失败：{{ btError }}</p>
        <p class="err-hint">提示：/api/dtip-backtest 为 EdgeOne 边缘函数，依赖中证官方与公开行情，建议在线上环境查看。</p>
      </div>
      <p class="val-loading" v-else-if="loadingBt">回测计算中（边缘函数逐指数拉取 PE 全史与历史行情，首次约 10–20 秒，后续命中 CDN 缓存更快）…</p>
      <div v-else-if="btData">
        <!-- 组合汇总 -->
        <div class="stat-grid" v-if="btData.summary">
          <div class="stat-cell">
            <div class="stat-label">组合初始本金</div>
            <div class="stat-value">{{ fmt(btData.summary.netInvested, 0) }} 元</div>
            <div class="stat-sub">{{ btData.summary.indices }} 个指数 × {{ fmt(btData.summary.initCapital, 0) }} 元</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合现值（权益+现金）</div>
            <div class="stat-value">{{ fmt(btData.summary.marketValue, 0) }} 元</div>
            <div class="stat-sub">已买入 {{ fmt(btData.summary.totalInvested, 0) }} / 已赎回 {{ fmt(btData.summary.totalWithdrawn, 0) }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合累计收益</div>
            <div class="stat-value" :class="btData.summary.totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(btData.summary.totalProfit, 0) }} 元</div>
            <div class="stat-sub" :class="btData.summary.profitPct != null ? (btData.summary.profitPct >= 0 ? 'text-up' : 'text-down') : ''">
              收益率 {{ btData.summary.profitPct != null ? fmt(btData.summary.profitPct * 100, 2) + '%' : '--' }}
            </div>
          </div>
        </div>

        <!-- 各指数回测结果表 -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>指数</th>
                <th class="num">回测周数</th>
                <th class="num">初始本金</th>
                <th class="num">组合现值</th>
                <th class="num">累计收益</th>
                <th class="num">收益率</th>
                <th class="num">XIRR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="idx in DCA_INDICES" :key="idx.code" :class="{ 'row-active': idx.code === activeCode }" @click="activeCode = idx.code">
                <td>{{ idx.name }}</td>
                <template v-if="btByCode[idx.code] && btByCode[idx.code].ok">
                  <td class="num">{{ btByCode[idx.code].weeksActual }}</td>
                  <td class="num">{{ fmt(btByCode[idx.code].netInvested, 0) }}</td>
                  <td class="num">{{ fmt(btByCode[idx.code].marketValue, 0) }}</td>
                  <td class="num" :class="btByCode[idx.code].totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(btByCode[idx.code].totalProfit, 0) }}</td>
                  <td class="num" :class="btByCode[idx.code].profitPct != null ? (btByCode[idx.code].profitPct >= 0 ? 'text-up' : 'text-down') : ''">{{ btByCode[idx.code].profitPct != null ? fmt(btByCode[idx.code].profitPct * 100, 2) + '%' : '--' }}</td>
                  <td class="num" :class="(btByCode[idx.code].irr ?? 0) >= 0 ? 'text-up' : 'text-down'">{{ btByCode[idx.code].irr != null ? fmt(btByCode[idx.code].irr * 100, 2) + '%' : '--' }}</td>
                </template>
                <template v-else>
                  <td colspan="6" class="text-na">数据暂不可用</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 当前指数交易流水 -->
        <div class="trades-block" v-if="activeBt && activeBt.ok">
          <div class="trades-title">{{ activeName }} · 定投交易流水（共 {{ activeBt.trades.length }} 笔）</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th class="zone-col">估值区间</th>
                  <th>操作</th>
                  <th class="num">金额</th>
                  <th class="num">成交价</th>
                  <th class="num">本期份额</th>
                  <th class="num">累计份额</th>
                  <th class="num">剩余本金</th>
                  <th class="num">组合现值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in activeBt.trades.slice().reverse()" :key="i">
                  <td>{{ t.date }}</td>
                  <td class="zone-col"><span class="tag" :class="zoneTagClass(t.zoneKey)">{{ t.zone }}</span></td>
                  <td>
                    <span v-if="t.type === 'skip'" class="op-tag op-skip">{{ skipText(t) }}</span>
                    <span v-else class="op-tag" :class="t.type === 'buy' ? 'op-buy' : 'op-sell'">{{ t.type === 'buy' ? '买入' : '卖出' }}</span>
                  </td>
                  <td class="num" :class="t.amount >= 0 ? 'cash-out' : 'cash-in'">{{ t.amount >= 0 ? '+' : '−' }}{{ fmt(Math.abs(t.amount), 0) }}</td>
                  <td class="num">{{ fmt(t.price, 2) }}</td>
                  <td class="num">{{ fmt(t.sharesAdded, 4) }}</td>
                  <td class="num">{{ fmt(t.sharesAfter, 4) }}</td>
                  <td class="num" :class="{ 'cash-zero': t.type === 'skip' && t.skipReason === 'capital_exhausted' }">{{ fmt(t.cashAfter, 0) }}</td>
                  <td class="num">{{ fmt(t.valueAfter, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="data-source" v-if="activeBt.startDate">回测区间：{{ activeBt.startDate }} 至 {{ activeBt.endDate }}（每周一）；最新行情日 {{ activeBt.latestDate }}，最新价 {{ fmt(activeBt.priceLast, 2) }}，最新 PE(TTM) {{ fmt(activeBt.peLast, 2) }}（滚动5年分位 {{ fmt(activeBt.pctLast, 2) }}%）。</p>
        </div>
        <div class="empty-note" v-else-if="activeBt && !activeBt.ok">
          《{{ activeName }}》回测数据暂不可用（PE 或历史行情源暂未覆盖），其余指数可正常查看。
        </div>
      </div>
    </div>

    <!-- ============ 6. 真实定投记录（服务端自动执行）============ -->
    <div class="card">
      <div class="card-title">
        自动定投记录 · 真实执行效果
        <span class="card-subtitle">每周一按估值分位自动写入 · 自 {{ autoFirstDate || '首个周一运行' }} 起累积</span>
        <button class="refresh-btn" type="button" :disabled="loadingAuto" @click="loadAuto">{{ loadingAuto ? '加载中…' : '刷新' }}</button>
      </div>

      <div class="error-card" v-if="autoError">
        <p>真实记录加载失败：{{ autoError }}</p>
      </div>
      <p class="val-loading" v-else-if="loadingAuto">真实记录加载中…</p>
      <div v-else-if="autoRecords.length">
        <!-- 组合汇总 -->
        <div class="stat-grid" v-if="autoSummary.indices">
          <div class="stat-cell">
            <div class="stat-label">组合初始本金</div>
            <div class="stat-value">{{ fmt(autoSummary.netInvested, 0) }} 元</div>
            <div class="stat-sub">{{ autoSummary.indices }} 个指数 × {{ fmt(autoSummary.initCapital, 0) }} 元</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合现值（权益+现金）</div>
            <div class="stat-value">{{ fmt(autoSummary.marketValue, 0) }} 元</div>
            <div class="stat-sub">按最近一次交易价或实时价估算</div>
          </div>
          <div class="stat-cell">
            <div class="stat-label">组合累计收益</div>
            <div class="stat-value" :class="autoSummary.totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(autoSummary.totalProfit, 0) }} 元</div>
            <div class="stat-sub" :class="autoSummary.profitPct != null ? (autoSummary.profitPct >= 0 ? 'text-up' : 'text-down') : ''">
              收益率 {{ autoSummary.profitPct != null ? fmt(autoSummary.profitPct * 100, 2) + '%' : '--' }}
            </div>
          </div>
        </div>

        <!-- 各指数真实记录 -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>指数</th>
                <th class="num">定投次数</th>
                <th class="num">累计份额</th>
                <th class="num">初始本金</th>
                <th class="num">组合现值</th>
                <th class="num">累计收益</th>
                <th class="num">收益率</th>
                <th class="num">当前价</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="idx in DCA_INDICES" :key="idx.code" :class="{ 'row-active': idx.code === activeCode }" @click="activeCode = idx.code">
                <td>{{ idx.name }}</td>
                <template v-if="autoByCode[idx.code] && autoByCode[idx.code].records.length">
                  <td class="num">{{ autoByCode[idx.code].weeks }}</td>
                  <td class="num">{{ fmt(autoByCode[idx.code].shares, 4) }}</td>
                  <td class="num">{{ fmt(autoByCode[idx.code].netInvested, 0) }}</td>
                  <td class="num">{{ fmt(autoByCode[idx.code].marketValue, 0) }}</td>
                  <td class="num" :class="autoByCode[idx.code].totalProfit >= 0 ? 'text-up' : 'text-down'">{{ fmt(autoByCode[idx.code].totalProfit, 0) }}</td>
                  <td class="num" :class="autoByCode[idx.code].profitPct != null ? (autoByCode[idx.code].profitPct >= 0 ? 'text-up' : 'text-down') : ''">{{ autoByCode[idx.code].profitPct != null ? fmt(autoByCode[idx.code].profitPct * 100, 2) + '%' : '--' }}</td>
                  <td class="num">{{ fmt(autoByCode[idx.code].price, 2) }}</td>
                </template>
                <template v-else>
                  <td colspan="7" class="text-na">暂无记录</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 当前指数真实交易流水 -->
        <div class="trades-block" v-if="activeAuto && activeAuto.records.length">
          <div class="trades-title">{{ activeName }} · 真实交易流水（共 {{ activeAuto.records.length }} 笔）</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th class="zone-col">估值区间</th>
                  <th>操作</th>
                  <th class="num">金额</th>
                  <th class="num">成交价</th>
                  <th class="num">本期份额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in activeAuto.records.slice().reverse()" :key="i">
                  <td>{{ t.trade_date }}</td>
                  <td class="zone-col"><span class="tag" :class="zoneTagClass(ZONES.find(z => z.label === t.zone)?.key || t.zone)">{{ t.zone }}</span></td>
                  <td><span class="op-tag" :class="Number(t.amount) >= 0 ? 'op-buy' : 'op-sell'">{{ Number(t.amount) >= 0 ? '买入' : '卖出' }}</span></td>
                  <td class="num" :class="Number(t.amount) >= 0 ? 'cash-out' : 'cash-in'">{{ Number(t.amount) >= 0 ? '+' : '−' }}{{ fmt(Math.abs(Number(t.amount)), 0) }}</td>
                  <td class="num">{{ fmt(t.close_price, 2) }}</td>
                  <td class="num">{{ fmt(t.shares, 4) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p class="empty-note" v-else>
        暂无真实定投记录。系统将于每周一（北京时间 09:00）自动按当前估值分位执行并写入，首次运行后此处展示真实定投效果。
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCsiPe, fetchDtipBacktest, fetchDtipAutoRecords, fetchIndexCloses } from '../../utils/api'

// ===== 定投目标指数 =====
const DCA_INDICES = [
  { code: '000510', name: '中证A500' },
  { code: '000300', name: '沪深300' },
  { code: '000905', name: '中证500' },
  { code: '000906', name: '中证800' },
  { code: '000852', name: '中证1000' },
  { code: '932000', name: '中证2000' },
  { code: '000985', name: '中证全指' },
]

// ===== 5 档估值区间 → 每周操作 =====
// 【2026-10-22 定版】金额由「指数波动周期测算法」反推，非拍脑袋给定：
//   滚动 5 年锚下，7 个指数各自出现过的最长「连续买方季」资金需求（按原 3000/2000/1000 基准）为 4.5 万~66.4 万，
//   取最坏者 66.4 万（中证500，含 95% 分位极端情形）→ 缩放系数 = 10 万 ÷ 66.4 万 = 0.1506 → 保守取整 0.150，
//   得 450 / 300 / 150。实测该组合在 2015-11 → 2026-10 全样本上 7 个指数资金耗尽次数 = 0。
const ZONES = [
  { key: 'deep_low',  label: '极度低估', min: 0,        max: 10,       amount:  450, side: 'buy',  tagClass: 'tag-green', rangeText: '< 10%',     sideText: '买入', amountText: '+450 元', actionText: '买入 450 元' },
  { key: 'low',       label: '低估',   min: 10,       max: 30,       amount:  300, side: 'buy',  tagClass: 'tag-green', rangeText: '10% ~ 30%', sideText: '买入', amountText: '+300 元', actionText: '买入 300 元' },
  { key: 'normal',    label: '估值合理', min: 30,       max: 70,       amount:  150, side: 'buy',  tagClass: 'tag-blue',  rangeText: '30% ~ 70%', sideText: '买入', amountText: '+150 元', actionText: '买入 150 元' },
  { key: 'high',      label: '高估',   min: 70,       max: 90,       amount:    0, side: 'hold', tagClass: 'tag-red',   rangeText: '70% ~ 90%', sideText: '观望', amountText: '0 元',    actionText: '观望不操作' },
  { key: 'deep_high', label: '极度高估', min: 90,       max: Infinity, amount:    0, side: 'trim', tagClass: 'tag-red',   rangeText: '≥ 90%',     sideText: '卖出', amountText: '持仓 15%', actionText: '卖出持仓 15%' },
]
// 极度高估时按「持仓市值的比例」赎回，而非固定金额
const SELL_RATIO = 0.15
const SELL_RATIO_TEXT = '15%'
const ZONE_TAG = {
  deep_low: 'tag-green', low: 'tag-green', normal: 'tag-blue', high: 'tag-red', deep_high: 'tag-red',
}

const btWeeks = 520
const INIT_CAPITAL = 100000

// ===== 策略与资金测算说明（实测数据，随代码版本固定）=====
// 数据源：7 个指数的中证官方 PE 日史 + 公开行情日线，样本 2015-11 → 2026-10（约 570 周）。
const SIZING_STUDY = {
  window: '滚动 5 年',
  sample: '2015-11 → 2026-10（约 570 个周一）',
  // 每个指数在滚动 5 年锚下的「最长连续买方季」（期间一次都没触发卖出）及其资金需求
  seasons: [
    { name: '中证1000', weeks: 455, years: '8.8 年', need: 642000 },
    { name: '中证500',  weeks: 454, years: '8.7 年', need: 664000 },
    { name: '中证全指', weeks: 219, years: '4.2 年', need: 377000 },
    { name: '沪深300',  weeks: 235, years: '4.5 年', need: 286000 },
    { name: '中证800',  weeks: 213, years: '4.1 年', need: 284000 },
    { name: '中证2000', weeks: 64,  years: '1.2 年', need: 129000 },
    { name: '中证A500', weeks: 41,  years: '0.8 年', need: 45000 },
  ],
  worstName: '中证500',
  worstNeed: 664000,
  scaleRaw: 0.1506,
  scaleUsed: 0.150,
  // 定尺寸后，7 指数在 10 万固定本金下跑全样本的结果
  results: [
    { name: '沪深300',  weeks: 520, buys: 329, sells: 72, invested: 76500, value: 120480, profitPct: 20.5, irr: 12.0, avgPos: 17.3 },
    { name: '中证500',  weeks: 520, buys: 366, sells: 48, invested: 99600, value: 125149, profitPct: 25.1, irr: 4.7,  avgPos: 45.9 },
    { name: '中证800',  weeks: 520, buys: 343, sells: 63, invested: 83400, value: 124373, profitPct: 24.4, irr: 13.3, avgPos: 17.6 },
    { name: '中证1000', weeks: 520, buys: 421, sells: 43, invested: 96450, value: 123545, profitPct: 23.5, irr: 4.9,  avgPos: 39.4 },
    { name: '中证2000', weeks: 160, buys: 68,  sells: 64, invested: 20850, value: 103712, profitPct: 3.7,  irr: 23.3, avgPos: 4.6 },
    { name: '中证全指', weeks: 520, buys: 361, sells: 60, invested: 94350, value: 136263, profitPct: 36.3, irr: 19.0, avgPos: 27.7 },
    { name: '中证A500', weeks: 100, buys: 42,  sells: 37, invested: 8250,  value: 101380, profitPct: 1.4,  irr: 40.0, avgPos: 2.0 },
  ],
  exhausted: 0,
  avgProfitPct: 19.3,
  avgIrr: 16.7,
  avgPos: 22.1,
  // 窗口选型实测：只换窗口、不改卖出规则时各窗口几乎无差异；
  // 同时把卖出改为「按持仓 25%」后差距才拉开，5 年最优。收益率=7 指数平均本金收益率。
  windowCompare: [
    { w: '全史',  oldRet: 21.6, newRet: 23.3, recov: 53.0 },
    { w: '近1年', oldRet: 19.5, newRet: 6.0,  recov: 92.6 },
    { w: '近2年', oldRet: 24.0, newRet: 10.7, recov: 101.3 },
    { w: '近3年', oldRet: 23.4, newRet: 26.4, recov: 108.4 },
    { w: '近5年', oldRet: 23.8, newRet: 34.5, recov: 118.4 },
    { w: '近7年', oldRet: 21.8, newRet: 25.5, recov: 101.8 },
  ],
}

// ===== 状态 =====
const activeCode = ref('000300')
const evaByCode = ref({})
const evaDate = ref('')
const evaError = ref('')
const loadingEva = ref(false)

const btData = ref(null)
const loadingBt = ref(false)
const btError = ref('')

// ===== 真实定投记录（Part2）=====
const autoRecords = ref([])
const loadingAuto = ref(false)
const autoError = ref('')
const liveCloses = ref({})

// ===== 工具 =====
function fmt(v, digits = 2) {
  if (v == null || !isFinite(v)) return '--'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
function pctClass(pct) {
  if (pct == null) return ''
  return pct >= 70 ? 'text-up' : pct < 30 ? 'text-down' : ''
}
function zoneTagClass(key) {
  return ZONE_TAG[key] || ''
}
/** 流水「跳过」行的原因文案：高估区观望是策略既定行为，不应显示为故障态 */
function skipText(t) {
  if (t.skipReason === 'no_data') return '无估值数据·跳过'
  if (t.skipReason === 'hold_zone') return '高估·观望'
  if (t.skipReason === 'capital_exhausted') return '本金已投满·暂停买入'
  if (t.skipReason === 'no_holding') return '无持仓·跳过'
  return '跳过'
}

// ===== 数据加载 =====
async function loadEva() {
  loadingEva.value = true
  evaError.value = ''
  try {
    const rows = await fetchCsiPe(DCA_INDICES.map(i => i.code))
    const map = {}
    let date = ''
    for (const r of rows) {
      if (r && r.ok) {
        map[r.code] = r
        if (r.date && r.date > date) date = r.date
      }
    }
    evaByCode.value = map
    evaDate.value = date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : ''
  } catch (e) {
    evaError.value = String(e && e.message || e)
  } finally {
    loadingEva.value = false
  }
}

async function loadBacktest() {
  loadingBt.value = true
  btError.value = ''
  try {
    const res = await fetchDtipBacktest(DCA_INDICES.map(i => i.code), btWeeks)
    btData.value = res
  } catch (e) {
    btError.value = String(e && e.message || e)
  } finally {
    loadingBt.value = false
  }
}

async function loadAuto() {
  loadingAuto.value = true
  autoError.value = ''
  liveCloses.value = {}
  try {
    const recs = await fetchDtipAutoRecords()
    autoRecords.value = recs || []
    // 拉取实时收盘价，用于真实记录市值估算（失败则用最近一次交易价）
    const secids = DCA_INDICES
      .filter(i => i.code !== '932000')
      .map(i => (i.code.startsWith('932') ? '2.' : '1.') + i.code)
    try {
      const closes = await fetchIndexCloses(secids)
      const byCode = {}
      for (const [secid, v] of Object.entries(closes)) {
        if (v && v.price > 0) {
          const code = secid.split('.')[1]
          byCode[code] = v.price
        }
      }
      liveCloses.value = byCode
    } catch (e) {
      console.warn('[dtip] 实时收盘价获取失败:', e)
    }
  } catch (e) {
    autoError.value = String(e && e.message || e)
  } finally {
    loadingAuto.value = false
  }
}

// ===== 计算属性 =====
const activeName = computed(() => (DCA_INDICES.find(i => i.code === activeCode.value) || {}).name || '')
const curEva = computed(() => evaByCode.value[activeCode.value] || null)

function zoneOf(code) {
  const eva = evaByCode.value[code]
  // 【2026-10-22】判据改为「滚动 5 年分位 pct_5y」：全史分位会被早年高 PE 体制长期污染，
  // 使宽基指数永远显示便宜（几乎不触发卖出），或使短历史指数过半时间显示极度高估。
  // pct_5y 缺失时退回全史，避免看板出现「数据缺失」。
  const pct = eva && (eva.pct_5y != null ? eva.pct_5y : eva.pct_all)
  if (pct == null) return { key: 'unknown', label: '数据缺失', tagClass: '', amountText: '--', sideText: '--', amount: 0, actionText: '--' }
  for (const z of ZONES) {
    if (pct >= z.min && pct < z.max) return z
  }
  return ZONES[ZONES.length - 1]
}
const curZone = computed(() => zoneOf(activeCode.value))

const btByCode = computed(() => {
  const map = {}
  if (btData.value && btData.value.data) {
    for (const r of btData.value.data) map[r.code] = r
  }
  return map
})
const activeBt = computed(() => btByCode.value[activeCode.value] || null)

// 真实记录聚合：按「100k 初始本金资金池」口径逐指数重建 权益/现金/组合现值
const autoByCode = computed(() => {
  const map = {}
  for (const idx of DCA_INDICES) {
    map[idx.code] = { name: idx.name, records: [], shares: 0, deployed: 0, withdrawn: 0, latestClose: 0, latestDate: '' }
  }
  for (const r of autoRecords.value) {
    const e = map[r.index_code]
    if (!e) continue
    e.records.push(r)
    const amt = Number(r.amount) || 0
    const sh = Number(r.shares) || 0
    e.shares += sh
    if (amt > 0) e.deployed += amt
    if (amt < 0) e.withdrawn += -amt
    if (!e.latestDate || r.trade_date > e.latestDate) {
      e.latestClose = Number(r.close_price) || 0
      e.latestDate = r.trade_date
    }
  }
  for (const code in map) {
    const e = map[code]
    if (!e.records.length) continue
    const live = liveCloses.value[code]
    const price = (live != null && live > 0) ? live : e.latestClose
    e.price = price
    e.cash = INIT_CAPITAL - e.deployed + e.withdrawn
    e.equity = e.shares * price
    e.marketValue = e.equity + e.cash
    e.netInvested = INIT_CAPITAL
    e.totalProfit = e.marketValue - INIT_CAPITAL
    e.profitPct = e.totalProfit / INIT_CAPITAL
    e.weeks = e.records.length
  }
  return map
})

const autoOkCodes = computed(() => Object.keys(autoByCode.value).filter(c => autoByCode.value[c].records.length > 0))

const autoSummary = computed(() => {
  let marketValue = 0, shares = 0, weeks = 0
  for (const c of autoOkCodes.value) {
    const e = autoByCode.value[c]
    marketValue += e.marketValue
    shares += e.shares
    weeks = Math.max(weeks, e.weeks)
  }
  const netInvested = INIT_CAPITAL * autoOkCodes.value.length
  const totalProfit = marketValue - netInvested
  return {
    indices: autoOkCodes.value.length,
    initCapital: INIT_CAPITAL,
    netInvested,
    marketValue,
    shares,
    totalProfit,
    profitPct: netInvested > 0 ? totalProfit / netInvested : null,
    weeks,
  }
})

const activeAuto = computed(() => autoByCode.value[activeCode.value] || null)

const autoFirstDate = computed(() => {
  if (!autoRecords.value.length) return ''
  return autoRecords.value.map(r => r.trade_date).sort()[0]
})

onMounted(() => {
  loadEva()
  loadBacktest()
  loadAuto()
})
</script>

<style scoped>
.dtip-panel { width: 100%; }

/* 规则表 */
.rule-table th, .rule-table td { text-align: left; }
.rule-table td:first-child { white-space: nowrap; }

/* 刷新按钮 */
.refresh-btn {
  appearance: none; -webkit-appearance: none;
  margin-left: auto;
  background: #ffffff;
  border: 2px solid var(--brand);
  color: var(--brand);
  font-size: 14px; font-weight: 700;
  padding: 4px 14px;
  cursor: pointer;
  font-family: inherit;
}
.refresh-btn:hover { background: #f0f6fb; }
.refresh-btn:disabled { opacity: 0.5; cursor: default; }

/* 估值表 */
.val-loading { padding: 24px 0; color: var(--text-secondary); }
.row-active { background: #f0f6fb; }
.row-active td { font-weight: 700; }
.tag { white-space: nowrap; }

/* 数据表（DtipPanel 独立组件，需自包含） */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th {
  text-align: left;
  padding: var(--space-sm);
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
  font-weight: 700;
  white-space: nowrap;
}
.data-table td {
  padding: var(--space-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  vertical-align: middle;
}
.data-table th.num, .data-table td.num { text-align: right; }
.text-na { color: var(--text-secondary); }

/* 指数 tabs */
.dtip-tabs {
  display: flex; align-items: stretch; flex-wrap: wrap;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  margin-bottom: var(--space-md);
}
.dtip-tab {
  appearance: none; -webkit-appearance: none;
  background: transparent; border: none;
  border-bottom: 3px solid transparent;
  padding: 12px 18px;
  font-size: 16px; line-height: 1.4;
  color: var(--text-secondary);
  cursor: pointer; font-family: inherit;
}
.dtip-tab:hover { color: var(--text-primary); }
.dtip-tab.active { color: #1d70b8; border-bottom-color: #1d70b8; font-weight: 700; }
@media (max-width: 640px) {
  .dtip-tabs { padding: 0 12px; }
  .dtip-tab { padding: 10px 12px; font-size: 15px; }
}

/* 本周计划横幅 */
.zone-banner {
  border: 1px solid var(--border);
  border-left: 5px solid var(--border);
  padding: 14px 16px;
  margin-bottom: var(--space-md);
  background: var(--bg-card);
}
.zone-banner.is-cheap { border-left-color: var(--color-down); }
.zone-banner.is-expensive { border-left-color: var(--color-up); }
.zone-banner.is-neutral { border-left-color: var(--brand); }
.zone-main { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.zone-label { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.zone-amount { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.zone-sub { margin-top: 8px; font-size: 14px; color: var(--text-secondary); }
.plan-note { margin-top: 12px; font-size: 13px; color: var(--text-secondary); }

/* 回测汇总卡 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: var(--space-md);
}
.stat-cell {
  border: 1px solid var(--border);
  background: #f8f8f8;
  padding: 14px 16px;
}
.stat-label { font-size: 14px; color: var(--text-secondary); font-weight: 700; }
.stat-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
.stat-sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: 1fr; } }

/* 交易流水 */
.trades-block { margin-top: var(--space-md); }
.trades-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.op-tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--border);
}
.op-buy { color: var(--brand); border-color: var(--brand); }
.op-sell { color: var(--color-up); border-color: var(--color-up); }
.op-skip { color: var(--text-secondary); border-color: var(--border); background: #f4f4f4; }
.cash-zero { color: var(--color-up); font-weight: 700; }
/* 现金流出（买入，钱出去）= 红；现金流入（卖出，钱回来）= 绿 */
.cash-out { color: var(--color-up); }
.cash-in { color: var(--color-down); }
.empty-note { margin-top: 12px; padding: 16px; border: 1px dashed var(--border); color: var(--text-secondary); font-size: 14px; }

/* 交易流水表格：估值区间列加宽，避免标签拥挤；时间倒序后最新交易置顶 */
.trades-block .data-table th.zone-col,
.trades-block .data-table td.zone-col {
  min-width: 96px;
}
.trades-block .data-table .tag {
  display: inline-block;
  padding: 2px 10px;
}

/* ===== 策略与资金测算说明 ===== */
.study-step {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.study-step:last-child { border-bottom: 0; }
.study-idx {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}
.study-body { flex: 1; min-width: 0; }
.study-h { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.study-p { font-size: 14px; line-height: 1.7; color: var(--text-secondary); margin: 0 0 10px; }
.study-p b { color: var(--text-primary); }
.study-formula {
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #f3f7fb;
  border-left: 4px solid var(--brand);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  overflow-x: auto;
  white-space: nowrap;
}
.study-formula b { color: var(--brand); }
.study-card .study-table { font-size: 14px; }
.study-card .study-table th,
.study-card .study-table td { padding: 8px 10px; }
.study-cell-left { text-align: left; line-height: 1.7; color: var(--text-secondary); }
.study-badge { margin-left: 6px; padding: 1px 6px; font-size: 12px; }
.study-warn {
  padding: 10px 12px;
  background: #f8f8f8;
  border-left: 4px solid var(--text-secondary);
  color: var(--text-secondary);
}
.row-worst > td { font-weight: 700; }
.row-sum > td { font-weight: 700; background: #f4f4f4; }
.key-col { font-weight: 700; color: var(--text-primary); }
.muted-col { color: var(--text-secondary); }
.th-note { display: block; font-size: 12px; font-weight: 400; color: var(--text-secondary); }

@media (max-width: 640px) {
  .study-step { flex-direction: column; gap: 8px; }
  .study-formula { white-space: normal; }
}
</style>
