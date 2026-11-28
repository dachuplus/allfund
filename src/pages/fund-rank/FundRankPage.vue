<template>
  <div class="page-fund-rank">
    <!-- 页面说明行：页面功能 / 数据来源 / 截止时间 / 覆盖范围（gov.uk 风格，与股票选品页一致） -->
    <div class="frk-summary">
      <h2 class="frk-summary-title">基金评分 · 靠谱指数</h2>
      <div class="frk-summary-meta">
        <span>数据来源：公开网络</span>
        <span class="frk-summary-sep">·</span>
        <span v-if="summaryDate">截止时间：{{ summaryDate }}</span>
        <span v-if="meta.total_count" class="frk-summary-sep">·</span>
        <span v-if="meta.total_count">覆盖 {{ meta.total_count }} 只开放式基金（含 ETF/LOF/QDII）</span>
        <span v-if="meta.interface_total" class="frk-summary-sep">·</span>
        <span v-if="meta.interface_total">接口包含基金总量 {{ meta.interface_total }} 只</span>
      </div>
    </div>

    <!-- 功能切换 Tab：评分（默认）/ 热门，两者并列 -->
    <div class="fund-view-tabs">
      <button type="button" class="fund-view-tab" :class="{ active: activeTab === 'score' }" @click="activeTab = 'score'">评分</button>
      <button type="button" class="fund-view-tab" :class="{ active: activeTab === 'hot' }" @click="activeTab = 'hot'">热门</button>
    </div>

    <!-- 热门基金（标签功能区） -->
    <div v-show="activeTab === 'hot'">
      <HotTags ref="hotTagsRef" />
    </div>

    <!-- 基金评分主区 -->
    <div v-show="activeTab === 'score'">

    <!-- 顶部：搜索（用「搜索」按钮提交，不用回车 —— 中文输入法选词的 Enter
         会误触发 @keyup.enter，导致每选一次候选词就发一次全表查询把页面卡死） -->
    <div class="top-bar">
      <div class="search-box">
        <input
          class="search-input"
          placeholder="搜基金名/代码"
          v-model="searchText"
          @keyup.enter="onSearchEnter"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
        />
        <span class="search-clear" v-if="searchText" @click="clearSearch">✕</span>
      </div>
      <button class="search-btn" type="button" :disabled="loading" @click="doSearch">
        {{ loading ? '搜索中…' : '搜索' }}
      </button>
    </div>

    <!-- 筛选区 -->
    <div class="filter-section">
      <!-- 一级分类（多选勾选框，来自 fund_scores.t0） -->
      <div class="filter-row">
        <span class="filter-label">一级分类</span>
        <div class="filter-chips">
          <div class="filter-chip check-chip" :class="{ active: selectAllT0 }" @click="clearT0">
            <span class="check-box" :class="{ checked: selectAllT0 }"></span>全部
          </div>
          <div v-for="item in t0List" :key="item.value" class="filter-chip check-chip" :class="{ active: selectAllT0 || filterT0.includes(item.value) }" @click="toggleT0(item.value)">
            <span class="check-box" :class="{ checked: selectAllT0 || filterT0.includes(item.value) }"></span>{{ item.label }}<span class="chip-cnt" v-if="item.cnt">{{ item.cnt }}</span>
          </div>
        </div>
      </div>

      <!-- 二级分类（默认全部铺开，按一级分组，组内多选勾选框） -->
      <div v-for="t0 in t0List" :key="'t1grp-' + t0.value" class="filter-row t1-group-row" v-show="(t1Map[t0.value] || []).length > 0">
        <span class="filter-label t1-group-label">{{ t0.value }}</span>
        <div class="filter-chips">
          <div class="filter-chip check-chip" :class="{ active: selectAllT0 || !!t1All[t0.value] }" @click="toggleT1All(t0.value)">
            <span class="check-box" :class="{ checked: selectAllT0 || !!t1All[t0.value] }"></span>全部
          </div>
          <div v-for="item in (t1Map[t0.value] || [])" :key="item.value" class="filter-chip check-chip" :class="{ active: isT1Checked(item.value, t0.value) }" @click="toggleT1(item.value, t0.value)">
            <span class="check-box" :class="{ checked: isT1Checked(item.value, t0.value) }"></span>{{ item.label }}<span class="chip-cnt" v-if="item.cnt">{{ item.cnt }}</span>
          </div>
        </div>
      </div>

      <!-- 更多筛选（弹窗入口） -->
      <div class="filter-actions-row">
        <div class="filter-action-btn" @click="openMoreFilter">
          <span>更多筛选</span>
          <span class="more-badge" v-if="activeMoreFilterCount">{{ activeMoreFilterCount }}</span>
          <span class="toggle-arrow">▾</span>
        </div>

        <!-- 评分指标（弹窗入口） -->
        <div class="filter-action-btn" @click="showScoreIndicator = true">
          <span>评分指标</span>
          <span class="toggle-arrow">▾</span>
        </div>
      </div>

      <!-- 更多筛选弹窗 -->
      <Teleport to="body">
        <template v-if="showMoreFilter">
          <div class="mask" @click="cancelMoreFilter"></div>
          <div class="more-modal">
            <div class="more-modal-header">
              <span class="more-modal-title">更多筛选</span>
              <span class="more-modal-close" @click="cancelMoreFilter">&#x2715;</span>
            </div>
            <div class="more-modal-body">
              <!-- 投资风格（多选）：公开网络最新报告期，季度更新 -->
              <div class="filter-row">
                <span class="filter-label">投资风格</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterInvestStyle.length === 0 }" @click="filterInvestStyle = []">全部</div>
                  <div v-for="s in INVEST_STYLE_OPTIONS" :key="s" class="filter-chip" :class="{ active: filterInvestStyle.includes(s) }" @click="mToggleStyle(s)">{{ s }}</div>
                  <div class="filter-chip" :class="{ active: filterInvestStyle.includes(INVEST_STYLE_UNDISCLOSED) }" @click="mToggleStyle(INVEST_STYLE_UNDISCLOSED)">未披露</div>
                </div>
              </div>

              <!-- 概念标签（多选并集）：标签来自「热门」tab 底层 fund_tags -->
              <div class="filter-row">
                <span class="filter-label">概念</span>
                <div class="tag-picker">
                  <div class="tag-picker-bar">
                    <div class="filter-chip" :class="{ active: filterConceptTags.length === 0 }" @click="filterConceptTags = []">全部</div>
                    <div class="filter-chip" :class="{ active: filterConceptTags.includes(TAG_UNDISCLOSED) }" @click="mToggleTag('concept', TAG_UNDISCLOSED)">未分类</div>
                    <input class="tag-search" v-model="tagSearch.concept" placeholder="搜概念标签" />
                    <span class="tag-toggle" @click="tagExpanded.concept = !tagExpanded.concept">{{ tagExpanded.concept ? '收起' : '展开全部 ' + conceptTagOptions.length }}</span>
                  </div>
                  <div class="tag-chip-list" :class="{ expanded: tagExpanded.concept }">
                    <div v-for="t in visibleTagOptions('concept')" :key="t" class="filter-chip" :class="{ active: filterConceptTags.includes(t) }" @click="mToggleTag('concept', t)">{{ t }}</div>
                  </div>
                  <div class="tag-selected" v-if="filterConceptTags.length">已选 {{ filterConceptTags.length }} 个：{{ filterConceptTags.join('、') }}</div>
                </div>
              </div>

              <!-- 行业标签（多选并集） -->
              <div class="filter-row">
                <span class="filter-label">行业</span>
                <div class="tag-picker">
                  <div class="tag-picker-bar">
                    <div class="filter-chip" :class="{ active: filterIndustryTags.length === 0 }" @click="filterIndustryTags = []">全部</div>
                    <div class="filter-chip" :class="{ active: filterIndustryTags.includes(TAG_UNDISCLOSED) }" @click="mToggleTag('industry', TAG_UNDISCLOSED)">未分类</div>
                    <input class="tag-search" v-model="tagSearch.industry" placeholder="搜行业标签" />
                    <span class="tag-toggle" @click="tagExpanded.industry = !tagExpanded.industry">{{ tagExpanded.industry ? '收起' : '展开全部 ' + industryTagOptions.length }}</span>
                  </div>
                  <div class="tag-chip-list" :class="{ expanded: tagExpanded.industry }">
                    <div v-for="t in visibleTagOptions('industry')" :key="t" class="filter-chip" :class="{ active: filterIndustryTags.includes(t) }" @click="mToggleTag('industry', t)">{{ t }}</div>
                  </div>
                  <div class="tag-selected" v-if="filterIndustryTags.length">已选 {{ filterIndustryTags.length }} 个：{{ filterIndustryTags.join('、') }}</div>
                </div>
              </div>

              <!-- 份额类别（多选） -->
              <div class="filter-row">
                <span class="filter-label">份额</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterSC.length === 0 }" @click="filterSC = []">全部</div>
                  <div class="filter-chip" :class="{ active: filterSC.includes('MAIN') }" @click="mToggleSC('MAIN')">主代码</div>
                  <div v-for="sc in shareClassOptions" :key="sc" class="filter-chip" :class="{ active: filterSC.includes(sc) }" @click="mToggleSC(sc)">{{ sc }}类</div>
                </div>
              </div>

              <!-- 是否场内 -->
              <div class="filter-row">
                <span class="filter-label">场内</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterCN === '' }" @click="mToggleCN('')">全部</div>
                  <div class="filter-chip" :class="{ active: filterCN === '1' }" @click="mToggleCN('1')">是</div>
                  <div class="filter-chip" :class="{ active: filterCN === '0' }" @click="mToggleCN('0')">否</div>
                </div>
              </div>

              <!-- 是否ETF -->
              <div class="filter-row">
                <span class="filter-label">ETF</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterETF === '' }" @click="mToggleFlag('ETF', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterETF === '1' }" @click="mToggleFlag('ETF', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterETF === '0' }" @click="mToggleFlag('ETF', '0')">否</div>
                </div>
              </div>

              <!-- 是否LOF -->
              <div class="filter-row">
                <span class="filter-label">LOF</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterLOF === '' }" @click="mToggleFlag('LOF', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterLOF === '1' }" @click="mToggleFlag('LOF', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterLOF === '0' }" @click="mToggleFlag('LOF', '0')">否</div>
                </div>
              </div>

              <!-- 是否FOF -->
              <div class="filter-row">
                <span class="filter-label">FOF</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterFOF === '' }" @click="mToggleFlag('FOF', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterFOF === '1' }" @click="mToggleFlag('FOF', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterFOF === '0' }" @click="mToggleFlag('FOF', '0')">否</div>
                </div>
              </div>

              <!-- 是否指增（指数增强）：名称含「增强」且二级分类 t1 含「指数」 -->
              <div class="filter-row">
                <span class="filter-label">指增</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterZZ === '' }" @click="mToggleFlag('ZZ', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterZZ === '1' }" @click="mToggleFlag('ZZ', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterZZ === '0' }" @click="mToggleFlag('ZZ', '0')">否</div>
                </div>
              </div>

              <!-- 是否定开 -->
              <div class="filter-row">
                <span class="filter-label">定开</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterDK === '' }" @click="mToggleFlag('DK', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterDK === '1' }" @click="mToggleFlag('DK', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterDK === '0' }" @click="mToggleFlag('DK', '0')">否</div>
                </div>
              </div>

              <!-- 持有期（多选，按基金名称中的持有期字样筛选） -->
              <div class="filter-row">
                <span class="filter-label">持有期</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterHolding.length === 0 }" @click="filterHolding = []">全部</div>
                  <div v-for="h in HOLDING_PERIOD_OPTIONS" :key="h" class="filter-chip" :class="{ active: filterHolding.includes(h) }" @click="mToggleHolding(h)">{{ h }}</div>
                </div>
              </div>

              <!-- 申购状态 -->
              <div class="filter-row">
                <span class="filter-label">状态</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterSG === '' }" @click="mToggleSG('')">全部</div>
                  <div class="filter-chip" :class="{ active: filterSG === '1' }" @click="mToggleSG('1')">可申购</div>
                  <div class="filter-chip" :class="{ active: filterSG === '0' }" @click="mToggleSG('0')">暂停申购</div>
                </div>
              </div>

              <!-- 单日涨跌≥20% -->
              <div class="filter-row">
                <span class="filter-label">20%</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterDailyLimit === '' }" @click="mToggleDailyLimit('')">全部</div>
                  <div class="filter-chip" :class="{ active: filterDailyLimit === '0' }" @click="mToggleDailyLimit('0')">否</div>
                  <div class="filter-chip" :class="{ active: filterDailyLimit === '1' }" @click="mToggleDailyLimit('1')">是</div>
                </div>
              </div>

              <!-- 异常收益（数据源脏值标注，如单点净值毛刺） -->
              <div class="filter-row">
                <span class="filter-label">异常</span>
                <div class="filter-chips">
                  <div class="filter-chip" :class="{ active: filterAnomaly === '' }" @click="mToggleFlag('ANOM', '')">全部</div>
                  <div class="filter-chip" :class="{ active: filterAnomaly === '1' }" @click="mToggleFlag('ANOM', '1')">是</div>
                  <div class="filter-chip" :class="{ active: filterAnomaly === '0' }" @click="mToggleFlag('ANOM', '0')">否</div>
                </div>
              </div>

              <!-- 基金规模区间（亿元）：多选预设，或自定义区间 -->
              <div class="filter-row">
                <span class="filter-label">规模</span>
                <div class="filter-scale-presets">
                  <div
                    v-for="p in SCALE_PRESETS"
                    :key="p.key"
                    class="filter-chip"
                    :class="{ active: isScaleActive(p.key) }"
                    @click="pickScalePreset(p.key)"
                  >{{ p.label }}</div>
                </div>
              </div>
              <div class="filter-row" v-if="scaleCustom">
                <span class="filter-label">自定义</span>
                <div class="filter-scale-range">
                  <input type="number" class="scale-input" v-model="filterScaleMin" placeholder="最小" @input="onScaleInput" @keyup.enter="applyMoreFilters" />
                  <span class="scale-dash">—</span>
                  <input type="number" class="scale-input" v-model="filterScaleMax" placeholder="最大" @input="onScaleInput" @keyup.enter="applyMoreFilters" />
                  <span class="scale-unit">亿</span>
                </div>
              </div>

              <!-- 股票仓位区间（%） -->
              <div class="filter-row">
                <span class="filter-label">股票仓位</span>
                <div class="filter-scale-range">
                  <input type="number" class="scale-input" v-model="filterStockMin" placeholder="最小" @keyup.enter="applyMoreFilters" />
                  <span class="scale-dash">—</span>
                  <input type="number" class="scale-input" v-model="filterStockMax" placeholder="最大" @keyup.enter="applyMoreFilters" />
                  <span class="scale-unit">%</span>
                </div>
              </div>

              <!-- 债券仓位区间（%） -->
              <div class="filter-row">
                <span class="filter-label">债券仓位</span>
                <div class="filter-scale-range">
                  <input type="number" class="scale-input" v-model="filterBondMin" placeholder="最小" @keyup.enter="applyMoreFilters" />
                  <span class="scale-dash">—</span>
                  <input type="number" class="scale-input" v-model="filterBondMax" placeholder="最大" @keyup.enter="applyMoreFilters" />
                  <span class="scale-unit">%</span>
                </div>
              </div>

              <!-- 货币(现金)仓位区间（%） -->
              <div class="filter-row">
                <span class="filter-label">货币仓位</span>
                <div class="filter-scale-range">
                  <input type="number" class="scale-input" v-model="filterCashMin" placeholder="最小" @keyup.enter="applyMoreFilters" />
                  <span class="scale-dash">—</span>
                  <input type="number" class="scale-input" v-model="filterCashMax" placeholder="最大" @keyup.enter="applyMoreFilters" />
                  <span class="scale-unit">%</span>
                </div>
              </div>

              <!-- 机构持有比例区间（%） -->
              <div class="filter-row">
                <span class="filter-label">机构比例</span>
                <div class="filter-scale-range">
                  <input type="number" class="scale-input" v-model="filterInstMin" placeholder="最小" @keyup.enter="applyMoreFilters" />
                  <span class="scale-dash">—</span>
                  <input type="number" class="scale-input" v-model="filterInstMax" placeholder="最大" @keyup.enter="applyMoreFilters" />
                  <span class="scale-unit">%</span>
                </div>
              </div>

              <!-- 筛选说明 -->
              <div class="filter-tip">
                注：份额/持有期/规模可<strong>多选</strong>（同一行内多选为「并集」，不同行之间为「且」）。投资风格来自公开网络最新报告期，按季度更新，未披露的产品不显示风格标签；概念/行业标签来自热门板块标签数据，两行多选均为「并集」，跨行也是并集。ETF/LOF/定开/申购状态/单日涨跌/异常基于数据库字段精确筛选；场内/份额类别/持有期基于基金名称识别，可能存在少量误判。「异常」为收益数据合理性校验标注（如单月收益超 100%、债券型收益超上限、各期累计收益几乎相同等数据源脏值特征），名称旁带红标，选基时建议选「否」剔除。持有期按名称中的「7天/30天/1个月/一年」等字样归类；「无限制」指名称不含「持有」字样的产品（即无持有期条款，其中含少量定期开放产品，可用上方「定开」进一步区分）。规模自定义区间与预设区间互斥。<br>
              </div>
            </div>
            <div class="more-modal-footer">
              <button class="btn-reset" @click="resetMoreFilters">重置</button>
              <button class="btn-confirm" @click="applyMoreFilters">确认</button>
            </div>
          </div>
        </template>
      </Teleport>

      <!-- 评分指标弹窗 -->
      <Teleport to="body">
        <template v-if="showScoreIndicator">
          <div class="mask" @click="cancelScoreIndicator"></div>
          <div class="score-indicator-modal">
            <div class="more-modal-header">
              <span class="more-modal-title">评分指标</span>
              <span class="more-modal-close" @click="cancelScoreIndicator">&#x2715;</span>
            </div>
            <div class="more-modal-body">
              <p class="score-tip">自定义评分权重（合计 100%）
                <span class="weight-sum" :class="{ valid: weightSum === 100, invalid: weightSum !== 100 }">当前：{{ weightSum }}%</span>
              </p>
              <div class="weight-sliders">
                <div class="weight-row" v-for="item in weightItems" :key="item.key">
                  <span class="weight-label">{{ item.label }}</span>
                  <input type="range" :min="0" :max="100" :value="item.value" class="weight-range" @input="e => item.value = Number(e.target.value)" />
                  <input type="number" :min="0" :max="100" :value="item.value" class="weight-num" @input="e => item.value = Number(e.target.value)" />%
                </div>
              </div>
            </div>
            <div class="more-modal-footer">
              <button class="btn-reset" @click="resetWeights">恢复默认</button>
              <button class="btn-confirm" :disabled="weightSum !== 100" @click="applyScoreIndicator">确认</button>
            </div>
          </div>
        </template>
      </Teleport>

      <!-- 筛选结果数量 -->
      <div class="filter-result-row" v-if="dataLoaded">
        <span class="filter-result-count">
          筛选结果：<strong>{{ totalCount != null ? totalCount : funds.length }}</strong> 只，已加载 <strong>{{ funds.length }}</strong> 只
        </span>
        <span class="result-actions">
          <span class="data-refresh" :class="{ refreshing }" @click="refreshData">
            {{ refreshing ? '刷新中' : '刷新' }}
          </span>
          <button class="export-btn" @click="exportCsv">导出 CSV</button>
        </span>
      </div>
    </div>

    <!-- 基金列表 - 桌面端：横向表格 -->
    <div
      class="fund-table-top-scroll"
      v-if="!isMobile && funds.length > 0"
      ref="tableHeadScrollRef"
      @scroll="onTableHeadScroll"
      aria-hidden="true"
    >
      <div class="fund-table-top-scroll-inner" :style="{ width: tableScrollWidth + 'px' }"></div>
    </div>
    <div
      class="fund-table-wrap"
      v-if="!isMobile && funds.length > 0"
      ref="tableBodyScrollRef"
      @scroll="onTableBodyScroll"
    >
      <table class="fund-table" ref="fundTableRef" :style="frozenStyle">
        <thead>
          <tr>
            <th class="col-code sortable" @click="toggleColumnSort('c')">
              基金代码<span class="th-arrow" v-if="sortField === 'c'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-name sortable" @click="toggleColumnSort('n')">
              基金简称<span class="th-arrow" v-if="sortField === 'n'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-manager sortable" @click="toggleColumnSort('fund_manager')">
              基金经理<span class="th-arrow" v-if="sortField === 'fund_manager'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-t1">二级分类</th>
            <th class="col-style">投资风格</th>
            <th class="col-tags">概念</th>
            <th class="col-tags">行业</th>
            <th class="col-scale sortable" @click="toggleColumnSort('fund_scale_prev')">
              上季规模（亿）<span class="th-arrow" v-if="sortField === 'fund_scale_prev'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-scale sortable" @click="toggleColumnSort('fund_scale')">
              规模（亿）<span class="th-arrow" v-if="sortField === 'fund_scale'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-growth sortable" @click="toggleColumnSort('fund_scale_growth')">
              规模增长%<span class="th-arrow" v-if="sortField === 'fund_scale_growth'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-fee sortable" @click="toggleColumnSort('manage_fee')">
              费率<span class="th-arrow" v-if="sortField === 'manage_fee'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-inst sortable" @click="toggleColumnSort('inst_hold_pct')" title="机构持有比例（最近报告期，来自公开披露）">
              机构占比<span class="th-arrow" v-if="sortField === 'inst_hold_pct'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-ret sortable" @click="toggleColumnSort('r1y')">
              近1年<span class="th-arrow" v-if="sortField === 'r1y'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-ret sortable" @click="toggleColumnSort('r2y')">
              近2年<span class="th-arrow" v-if="sortField === 'r2y'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-ret sortable" @click="toggleColumnSort('r3y')">
              近3年<span class="th-arrow" v-if="sortField === 'r3y'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="col-ret sortable" @click="toggleColumnSort('r5y')">
              近5年<span class="th-arrow" v-if="sortField === 'r5y'">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th v-for="p in displayPeriods" :key="p.key" class="col-score sortable" :class="{ 'col-sort': currentPeriod === p.key }" @click="switchPeriod(p.key)">
              {{ p.label }}评分<span class="th-arrow" v-if="currentPeriod === p.key">{{ sortAsc ? '▲' : '▼' }}</span>
            </th>
            <th class="col-actions">投票</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(fund, idx) in sortedFunds"
            :key="fund.c"
            class="fund-row"
          >
            <td class="col-code"><a :href="eastMoneyUrl(fund.c)" target="_blank" @click.stop>{{ fund.c }}</a></td>
            <td class="col-name"><a :href="eastMoneyUrl(fund.c)" target="_blank" @click.stop>{{ fund.n || '基金' + fund.c }}</a><span v-if="fund.ret_anomaly" class="anom-badge" title="收益数据异常（疑似单点净值毛刺或源数据脏值），筛选「异常-否」可剔除">异常</span></td>
            <td class="col-manager" :title="fund.fund_manager">
              <router-link v-if="fund.fund_manager" :to="{ name: 'tools-manager', query: { name: fund.fund_manager } }" @click.stop>{{ fund.fund_manager }}</router-link>
              <span v-else>--</span>
            </td>
            <td class="col-t1" :title="fund.t1_tt || fund.t1">{{ fund.t1_tt || fund.t1 || '--' }}</td>
            <td class="col-style">
              <span v-if="fund.invest_style" class="style-badge" :title="'投资风格：' + fund.invest_style + '（' + (fund.style_period || '最新报告期') + '）'">{{ fund.invest_style }}</span>
              <span v-else class="tag-empty">--</span>
            </td>
            <td class="col-tags" :title="conceptOf(fund).join('、')">
              <template v-if="conceptOf(fund).length">
                <span v-for="t in conceptOf(fund).slice(0, 3)" :key="t" class="tag-badge concept">{{ t }}</span>
                <span v-if="conceptOf(fund).length > 3" class="tag-more" :title="conceptOf(fund).slice(3).join('、')">+{{ conceptOf(fund).length - 3 }}</span>
              </template>
              <span v-else class="tag-empty">--</span>
            </td>
            <td class="col-tags" :title="industryOf(fund).join('、')">
              <template v-if="industryOf(fund).length">
                <span v-for="t in industryOf(fund).slice(0, 3)" :key="t" class="tag-badge industry">{{ t }}</span>
                <span v-if="industryOf(fund).length > 3" class="tag-more" :title="industryOf(fund).slice(3).join('、')">+{{ industryOf(fund).length - 3 }}</span>
              </template>
              <span v-else class="tag-empty">--</span>
            </td>
            <td class="col-scale">{{ fmtFundScale(fund.fund_scale_prev) }}</td>
            <td class="col-scale">{{ fmtFundScale(fund.fund_scale) }}</td>
            <td class="col-growth">{{ fmtScaleGrowth(fund.fund_scale_growth) }}</td>
            <td class="col-fee">{{ fmtManageFee(fund.manage_fee) }}</td>
            <td class="col-inst">{{ fmtInstPct(fund.inst_hold_pct) }}</td>
            <td class="col-ret" :style="{ color: retColor(fund.r1y) }">{{ fmtRetPlain(fund.r1y) }}</td>
            <td class="col-ret" :style="{ color: retColor(fund.r2y) }">{{ fmtRetPlain(fund.r2y) }}</td>
            <td class="col-ret" :style="{ color: retColor(fund.r3y) }">{{ fmtRetPlain(fund.r3y) }}</td>
            <td class="col-ret" :style="{ color: retColor(fund.r5y) }">{{ fmtRetPlain(fund.r5y) }}</td>
            <td v-for="p in displayPeriods" :key="p.key" class="col-score" :class="{ 'col-sort': currentPeriod === p.key }">
              <span class="score-val" :style="scoreColor(fund[p.key])">{{ fmtScore(fund[p.key]) }}</span>
            </td>
            <td class="col-actions">
              <span class="action-btn" :class="{ active: likesMap[fund.c] > 0 }" title="点赞" @click.stop="thumbUp(fund)">
                <SvgIcon name="thumbs-up" :size="16" />
                <span class="action-count" v-if="likesMap[fund.c] > 0">{{ likesMap[fund.c] }}</span>
              </span>
              <span class="action-btn" :class="{ active: dislikedSet.has(fund.c) }" title="吐槽" @click.stop="thumbDown(fund)">
                <SvgIcon name="thumbs-down" :size="16" />
              </span>
              <span class="action-btn action-add" title="加入组合" @click.stop="openPortfolioPicker(fund)">
                <SvgIcon name="plus-circle" :size="16" />
              </span>
              <span class="action-btn fav" :class="{ active: isFav(fund.c) }" title="关注" @click.stop="toggleFav({ c: fund.c, name: fund.n })">
                <SvgIcon name="star" :size="16" />
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 基金列表 - 移动端：卡片布局 -->
    <div class="mobile-fund-list" v-if="isMobile && funds.length > 0">
      <div
        v-for="fund in sortedFunds"
        :key="fund.c"
        class="fund-card"
      >
        <div class="fund-card-top">
          <a class="fund-code" :href="eastMoneyUrl(fund.c)" target="_blank" @click.stop>{{ fund.c }}</a>
          <a class="fund-name" :href="eastMoneyUrl(fund.c)" target="_blank" @click.stop>{{ fund.n || '基金' + fund.c }}</a>
          <span v-if="fund.ret_anomaly" class="anom-badge" title="收益数据异常（疑似单点净值毛刺或源数据脏值），筛选「异常-否」可剔除">异常</span>
          <span class="fund-card-actions" @click.stop>
            <span class="action-icon" :class="{ active: likesMap[fund.c] > 0 }" title="点赞" @click="thumbUp(fund)">
              <SvgIcon name="thumbs-up" :size="16" />
              <span class="action-count-sm" v-if="likesMap[fund.c] > 0">{{ likesMap[fund.c] }}</span>
            </span>
            <span class="action-icon" :class="{ active: dislikedSet.has(fund.c) }" title="吐槽" @click="thumbDown(fund)">
              <SvgIcon name="thumbs-down" :size="16" />
            </span>
            <span class="action-icon" title="加入组合" @click="openPortfolioPicker(fund)">
              <SvgIcon name="plus-circle" :size="16" />
            </span>
            <span class="action-icon fav" :class="{ active: isFav(fund.c) }" title="关注" @click.stop="toggleFav({ c: fund.c, name: fund.n })">
              <SvgIcon name="star" :size="16" />
            </span>
          </span>
        </div>
        <div class="fund-card-mgr" v-if="fund.fund_manager">
          <router-link :to="{ name: 'tools-manager', query: { name: fund.fund_manager } }" @click.stop>{{ fund.fund_manager }}</router-link>
        </div>
        <div class="fund-card-tags">
          <span v-if="fund.invest_style" class="style-badge" :title="'投资风格：' + fund.invest_style + '（' + (fund.style_period || '最新报告期') + '）'">{{ fund.invest_style }}</span>
          <span class="tag-line" v-if="conceptOf(fund).length"><em>概念</em>{{ conceptOf(fund).slice(0, 5).join('、') }}<span v-if="conceptOf(fund).length > 5"> 等 {{ conceptOf(fund).length }} 个</span></span>
          <span class="tag-line" v-if="industryOf(fund).length"><em>行业</em>{{ industryOf(fund).slice(0, 5).join('、') }}<span v-if="industryOf(fund).length > 5"> 等 {{ industryOf(fund).length }} 个</span></span>
        </div>
        <div class="fund-card-scale" v-if="fund.fund_scale != null || fund.inst_hold_pct != null">规模（亿）：{{ fmtFundScale(fund.fund_scale) }} · 费率：{{ fmtManageFee(fund.manage_fee) }} · 机构占比：{{ fmtInstPct(fund.inst_hold_pct) }}</div>
        <div class="fund-card-scale" v-if="fund.fund_scale_prev != null || fund.fund_scale_growth != null">上季规模（亿）：{{ fmtFundScale(fund.fund_scale_prev) }} · 规模增长：{{ fmtScaleGrowth(fund.fund_scale_growth) }}</div>
        <div class="fund-card-ret">
          <span :style="{ color: retColor(fund.r1y) }">近1年收益 {{ fmtRetPlain(fund.r1y) }}</span>
          <span :style="{ color: retColor(fund.r2y) }">近2年收益 {{ fmtRetPlain(fund.r2y) }}</span>
          <span :style="{ color: retColor(fund.r3y) }">近3年收益 {{ fmtRetPlain(fund.r3y) }}</span>
          <span :style="{ color: retColor(fund.r5y) }">近5年收益 {{ fmtRetPlain(fund.r5y) }}</span>
        </div>
        <div class="fund-card-scores">
          <span
            v-for="p in displayPeriods"
            :key="p.key"
            class="score-chip"
            :class="{ 'score-chip-active': currentPeriod === p.key }"
            @click.stop="switchPeriod(p.key)"
          >
            <span class="chip-label">{{ p.label }}</span>
            <span class="chip-val" :style="scoreColor(fund[p.key])">{{ fmtScore(fund[p.key]) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div class="load-more" v-if="hasMore && funds.length > 0" @click="loadMore">
      {{ loading ? '加载中...' : '加载更多' }}
    </div>

    <!-- 已加载完全部 -->
    <div class="loaded-all" v-if="!hasMore && funds.length > 0 && dataLoaded">
      已加载全部 <strong>{{ funds.length }}</strong> 只
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="dataLoaded && funds.length === 0 && !loading">
      <template v-if="loadError">
        <p class="empty-text">基金数据加载失败</p>
        <p class="empty-hint retry-hint" @click="refreshData">点击此处重试 ↻</p>
      </template>
      <template v-else>
        <p class="empty-text">没有找到符合条件的基金</p>
        <p class="empty-hint">试试调整筛选条件或关键词</p>
      </template>
    </div>

    <!-- 加载中（首次） -->
    <div class="loading-wrap" v-if="loading && funds.length === 0">
      <span class="loading-text">正在加载基金数据...</span>
    </div>

    <!-- 底部说明 -->
    <div class="bottom-info">
      <p class="bottom-line">
        <span>更新时间：{{ meta.updateTime ? fmtUpdateTime(meta.updateTime) : (metaLoading ? '加载中...' : '暂无') }}</span>
      </p>
      <p class="bottom-line">数据来源：公开网络</p>
      <p class="bottom-line">评分说明：靠谱指数评分基于公开净值数据，综合收益率、最大回撤、夏普比率、卡玛比率、信息比率、跟踪误差等指标，按百分位加权计算，取值 0~100 分。评分仅反映历史数据的相对位置，不代表未来表现。</p>
      <p class="bottom-warning">风险提示：评分基于历史公开数据自动计算，不构成任何投资建议，不作为投资依据，亦不预测未来收益。市场有风险，投资需谨慎。</p>
    </div>
    </div><!-- /基金评分主区 -->

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <template v-if="detailFund">
        <div class="mask" @click="detailFund = null"></div>
        <div class="detail-panel">
          <div class="detail-header">
            <span class="detail-name">{{ detailFund.n }}</span>
            <span class="detail-close" @click="detailFund = null">&#x2715;</span>
          </div>
          <div class="detail-body">
            <!-- 基本信息 -->
            <div class="detail-section">
              <div class="attr-row">
                <span class="attr-label">基金代码</span>
                <span class="attr-value">{{ detailFund.c }}</span>
              </div>
              <div class="attr-row">
                <span class="attr-label">分类</span>
                <span class="attr-value">{{ detailFund.t0 }} › {{ detailFund.t1 }}</span>
              </div>
              <div class="attr-row" v-if="detailFund.nav">
                <span class="attr-label">最新净值</span>
                <span class="attr-value">{{ detailFund.nav }}<span v-if="detailFund.date" class="attr-date">（{{ detailFund.date }}）</span></span>
              </div>
              <div class="attr-row" v-if="detailFund.fund_manager">
                <span class="attr-label">基金经理</span>
                <span class="attr-value">{{ detailFund.fund_manager }}</span>
              </div>
              <div class="attr-row" v-if="detailFund.company">
                <span class="attr-label">管理人</span>
                <span class="attr-value">{{ detailFund.company }}</span>
              </div>
              <div class="attr-row" v-if="detailFund.found_date">
                <span class="attr-label">成立日期</span>
                <span class="attr-value">{{ detailFund.found_date }}</span>
              </div>
              <div class="attr-row" v-if="detailFund.share_scale != null">
                <span class="attr-label">份额规模</span>
                <span class="attr-value">{{ fmtScale(detailFund.share_scale) }}</span>
              </div>
              <div class="attr-row" v-if="detailFund.custody_fee != null">
                <span class="attr-label">托管费率</span>
                <span class="attr-value">{{ detailFund.custody_fee }}%/年</span>
              </div>
              <div class="attr-row" v-if="detailFund.sale_fee != null">
                <span class="attr-label">销售服务费率</span>
                <span class="attr-value">{{ detailFund.sale_fee }}%/年</span>
              </div>
            </div>

            <!-- 靠谱分 -->
            <div class="detail-section">
              <span class="detail-section-title">靠谱指数评分（v6）</span>
              <div class="detail-scores-grid">
                <div v-for="p in periods" :key="p.key" class="ds-item">
                  <span class="ds-period">{{ p.label }}</span>
                  <span class="ds-score" :style="scoreColor(detailFund[p.key])">
                    {{ fmtScore(detailFund[p.key]) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 阶段收益率 -->
            <div class="detail-section" v-if="hasReturns(detailFund)">
              <div class="section-title-row">
                <span class="detail-section-title">阶段收益率</span>
                <span class="section-source">公开网络{{ detailFund.date ? ' · 截至' + detailFund.date : '' }}</span>
              </div>
              <div class="returns-grid">
                <div class="return-col" v-if="detailFund.r0w != null">
                  <span class="ret-label">近1周</span>
                  <span class="ret-value" :class="retCls(detailFund.r0w)">{{ fmtRet(detailFund.r0w) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r1m != null">
                  <span class="ret-label">近1月</span>
                  <span class="ret-value" :class="retCls(detailFund.r1m)">{{ fmtRet(detailFund.r1m) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r3m != null">
                  <span class="ret-label">近3月</span>
                  <span class="ret-value" :class="retCls(detailFund.r3m)">{{ fmtRet(detailFund.r3m) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r6m != null">
                  <span class="ret-label">近6月</span>
                  <span class="ret-value" :class="retCls(detailFund.r6m)">{{ fmtRet(detailFund.r6m) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r1y != null">
                  <span class="ret-label">近1年</span>
                  <span class="ret-value" :class="retCls(detailFund.r1y)">{{ fmtRet(detailFund.r1y) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r2y != null">
                  <span class="ret-label">近2年</span>
                  <span class="ret-value" :class="retCls(detailFund.r2y)">{{ fmtRet(detailFund.r2y) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r3y != null">
                  <span class="ret-label">近3年</span>
                  <span class="ret-value" :class="retCls(detailFund.r3y)">{{ fmtRet(detailFund.r3y) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.r5y != null">
                  <span class="ret-label">近5年</span>
                  <span class="ret-value" :class="retCls(detailFund.r5y)">{{ fmtRet(detailFund.r5y) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.ytd != null">
                  <span class="ret-label">今年来</span>
                  <span class="ret-value" :class="retCls(detailFund.ytd)">{{ fmtRet(detailFund.ytd) }}</span>
                </div>
                <div class="return-col" v-if="detailFund.return_all != null">
                  <span class="ret-label">成立以来</span>
                  <span class="ret-value" :class="retCls(detailFund.return_all)">{{ fmtRet(detailFund.return_all) }}</span>
                </div>
              </div>
            </div>

            <!-- 风险指标 -->
            <div class="detail-section" v-if="hasRisk(detailFund)">
              <div class="section-title-row">
                <span class="detail-section-title">风险指标</span>
                <span class="section-source">历史净值回算</span>
              </div>
              <div class="risk-table">
                <div class="risk-head">
                  <span class="risk-th" style="width:60px">周期</span>
                  <span class="risk-th" style="flex:1;text-align:center">最大回撤</span>
                  <span class="risk-th" style="flex:1;text-align:center">夏普比率</span>
                </div>
                <div v-for="rp in riskPeriods" :key="rp.label" class="risk-row"
                  v-show="detailFund[rp.dd] != null || detailFund[rp.sr] != null">
                  <span class="risk-label">{{ rp.label }}</span>
                  <span class="risk-val" :class="ddCls(detailFund[rp.dd])">
                    {{ fmtDD(detailFund[rp.dd]) }}
                  </span>
                  <span class="risk-val">{{ fmtSR(detailFund[rp.sr]) }}</span>
                </div>
              </div>
            </div>

            <!-- 天天基金跳转 -->
            <a :href="eastMoneyUrl(detailFund.c)" target="_blank" class="detail-goto">
              在天天基金查看详情 →
            </a>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 靠谱分说明弹窗 -->
    <Teleport to="body">
      <template v-if="showScoreHelp">
        <div class="mask" @click="showScoreHelp = false"></div>
        <div class="help-panel">
          <div class="help-header">
            <span class="help-title">靠谱指数评分说明（v6）</span>
            <span class="help-close" @click="showScoreHelp = false">&#x2715;</span>
          </div>
          <div class="help-body">
            <div class="help-section">
              <span class="help-desc">
                靠谱指数评分基于公开净值数据，综合基金的收益率、最大回撤、夏普比率等指标，按百分位加权计算，取值 0~100 分。评分仅反映该周期内历史数据的相对位置，不代表未来表现。
              </span>
              <span class="help-desc" style="margin-top:12px;font-weight:600;">
                评分权重：收益率 50% + 最大回撤 25% + 夏普比率 25%
              </span>
            </div>
            <div class="help-section">
              <span class="help-section-label">颜色分区（百分位渐变）</span>
              <div class="gradient-legend">
                <div class="gradient-bar"></div>
                <div class="gradient-labels">
                  <span>0分 · 绿（后 50%）</span>
                  <span>50分 · 黄绿（中位）</span>
                  <span>75分 · 橙（前 25%）</span>
                  <span>100分 · 红（前 1%）</span>
                </div>
              </div>
            </div>
            <div class="help-section">
              <span class="help-section-label">参与条件</span>
              <span class="help-desc">
                所有基金均参与评分（不再限制收益率>0）。评分按全样本统一百分位折算，取值 0~100 分。
              </span>
            </div>
            <div class="help-section">
              <span class="help-section-label">数据更新</span>
              <span class="help-desc">
                基金数据每个交易日 21:30 后更新（源自 公开网络），靠谱分在数据更新后同步重算。净值日期见页面顶部。
              </span>
            </div>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 加入组合选择器 -->
    <Teleport to="body">
      <template v-if="pickerFund">
        <div class="mask" @click="pickerFund = null"></div>
        <div class="picker-panel">
          <div class="picker-header">
            <span class="picker-title">加入组合</span>
            <span class="picker-close" @click="pickerFund = null">&#x2715;</span>
          </div>
          <div class="picker-body">
            <p class="picker-fund-name">{{ pickerFund.name }}（{{ pickerFund.code }}）</p>
            <p class="picker-hint">请选择要加入的自建组合：</p>
            <div class="picker-list" v-if="portfolios && portfolios.length > 0">
              <button
                v-for="p in portfolios"
                :key="p.id"
                class="picker-item"
                @click="confirmAddToPortfolio(p.id)"
              >
                <SvgIcon name="portfolio" :size="18" />
                <span class="picker-item-name">{{ p.name }}</span>
                <span class="picker-item-count">{{ (p.portfolio_data || []).length }} 只基金</span>
              </button>
            </div>
            <div class="picker-empty" v-else>
              <p>暂无自建组合</p>
              <p class="picker-empty-hint">请先在「组合」页面创建一个组合</p>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { fetchFundScores, fetchFundScoresCount, fetchFundMeta, fetchFundCategories, fetchFundTags, HOLDING_PERIOD_OPTIONS, HOLDING_NO_LIMIT, INVEST_STYLE_OPTIONS, INVEST_STYLE_UNDISCLOSED, TAG_TYPE_CONCEPT, TAG_TYPE_INDUSTRY, TAG_UNDISCLOSED } from '../../api/data.js'
import { fmtScore, fmtRet, fmtRetPlain, fmtDD, fmtSR, fmtScale, fmtFundScale, fmtScaleGrowth, fmtManageFee, scoreColor } from '../../utils/format.js'
import { addFundToPortfolio } from '../../api/user-data'
import { useAuth } from '../../composables/useAuth.js'
import { toast } from '../../composables/useToast.js'
import SvgIcon from '../../components/SvgIcon.vue'
import HotTags from '../../components/HotTags.vue'
import { useFavorites } from '../../composables/useFavorites.js'
const { isLoggedIn, portfolios } = useAuth()
const { isFav, toggleFav } = useFavorites()

// ========== 常量 ==========
// 展示周期：仅保留 3 个月及以上的周期（合规：《证券投资基金评价业务管理暂行办法》第十四条第(七)项，
// 不得发布单一指标排名期间少于 3 个月的结果，含具有点击排序功能的网站数据列示）。
const periods = [
  { key: 'k3m', label: '3月' },
  { key: 'k6m', label: '6月' },
  { key: 'k1',  label: '1年' },
  { key: 'k2',  label: '2年' },
  { key: 'k3',  label: '3年' },
  { key: 'k5',  label: '5年' },
]

// 表格固定展示的评分列：始终显示 1年/2年/3年/5年（点击表头排序不会改变展示列）
const displayPeriods = computed(() =>
  periods.filter(p => ['k1', 'k2', 'k3', 'k5'].includes(p.key))
)

const riskPeriods = [
  { label: '近1年', dd: 'dd1y', sr: 'sr1y' },
  { label: '近2年', dd: 'dd2y', sr: 'sr2y' },
  { label: '近3年', dd: 'dd3y', sr: 'sr3y' },
  { label: '近5年', dd: 'dd5y', sr: 'sr5y' },
]

// 分类数据源：动态取自 fund_scores 的 t0（一级分类）与 t1_tt（二级分类）
// 通过 Supabase RPC get_fund_categories() 聚合，保证筛选项与数据完全一致
//
// 静态骨架（2026-11-25）：RPC 慢/失败时页面首屏只剩「全部」，需等很久才看到分类。
// 这里内置一份生产分类快照，首屏同步展示全部分类；RPC 返回后仅用实时计数覆盖。
// 结构：[归一化一级, 计数, 原始 t0 列表]，原始 t0 用于「混合型/混合型基金」合并过滤。
const FALLBACK_T0 = [
  ['混合型', 9802, ['混合型', '混合型基金']],
  ['债券型', 7448, ['债券型', '债券型基金']],
  ['指数型', 5462, ['指数型']],
  ['股票型', 2296, ['股票型']],
  ['FOF', 1413, ['FOF']],
  ['货币型', 977, ['货币型']],
  ['QDII', 745, ['QDII']],
  ['新发基金', 227, ['']],
  ['Reits', 103, ['Reits']],
  ['其他', 20, ['其他']],
  ['商品', 2, ['商品']],
]
// 二级分类按归一化一级分组，[t1_tt, 计数]，计数为合并后的快照值
const FALLBACK_T1 = {
  '混合型': [['混合型-偏股', 5828], ['混合型-灵活', 2387], ['混合型-偏债', 1475], ['混合型-平衡', 74], ['混合型-绝对收益', 38]],
  '债券型': [['债券型-长债', 2638], ['债券型-混合二级', 1987], ['债券型-中短债', 1340], ['债券型-混合一级', 962], ['债券型-利率债', 323], ['债券型-信用债', 198]],
  '指数型': [['指数型-股票', 4703], ['指数型-固收', 677], ['指数型-其他', 70], ['混合型-灵活', 7], ['混合型-偏股', 5]],
  '股票型': [['股票型', 1148], ['指数型-股票', 1148]],
  'FOF': [['FOF-稳健型', 801], ['FOF-均衡型', 382], ['FOF-进取型', 230]],
  '货币型': [['货币型-普通货币', 969], ['货币型-浮动净值', 8]],
  'QDII': [['指数型-海外股票', 367], ['QDII-混合偏股', 131], ['QDII-普通股票', 90], ['QDII-纯债', 57], ['QDII-混合灵活', 29], ['QDII-混合债', 26], ['QDII-商品', 23], ['QDII-FOF', 9], ['QDII-混合平衡', 8], ['QDII-REITs', 5]],
  '新发基金': [['指数型-股票', 14], ['QDII-混合偏股', 2], ['混合型-偏股', 2]],
  'Reits': [['Reits', 103]],
  '其他': [['指数型-股票', 18]],
  '商品': [['商品', 2]],
}
const fallbackT0List = () => FALLBACK_T0.map(([value, cnt]) => ({ value, label: value, cnt }))
const fallbackT0RawMap = () => Object.fromEntries(FALLBACK_T0.map(([value, , raw]) => [value, [...raw]]))
const fallbackT1Map = () => Object.fromEntries(
  Object.entries(FALLBACK_T1).map(([k, list]) => [k, list.map(([value, cnt]) => ({ value, label: value, cnt }))])
)

const catLoading = ref(false)
const t0List = ref(fallbackT0List())   // [{ value, label, cnt }]
const t1Map = ref(fallbackT1Map())     // { [normalizedT0]: [{ value, label, cnt }] }
const t0RawMap = ref(fallbackT0RawMap()) // { [normalizedT0]: [rawT0Values] }，用于归一化后按多个原始 t0 过滤

// 一级分类归一化：数据库里同时存在「混合型」和「混合型基金」，应合并展示为「混合型」
// 空 t0（新发基金分类尚未回填）归一化为「新发基金」，否则筛选项只剩一个孤零零的数字计数
function normT0(t0) {
  return (t0 || '').replace(/基金$/, '') || '新发基金'
}

async function fetchCategories() {
  catLoading.value = true
  try {
    const data = await fetchFundCategories()
    const t0Arr = (data && data.t0) || []
    const t1Arr = (data && data.t1) || []
    // RPC 返回空（DB 慢/异常）时保留静态骨架，避免首屏只剩「全部」
    if (!t0Arr.length && !t1Arr.length) return

    // 一级分类归一化并合并计数（如 "混合型" + "混合型基金" → "混合型"）
    const t0Merged = {}
    const rawMap = {}
    for (const x of t0Arr) {
      const key = normT0(x.t0)
      if (!t0Merged[key]) {
        t0Merged[key] = { value: key, label: key, cnt: 0 }
        rawMap[key] = new Set()
      }
      t0Merged[key].cnt += x.cnt
      rawMap[key].add(x.t0)
    }
    t0List.value = Object.values(t0Merged).sort((a, b) => b.cnt - a.cnt)
    t0RawMap.value = Object.fromEntries(Object.entries(rawMap).map(([k, v]) => [k, [...v]]))

    // 二级分类按归一化后的一级分类分组，并按 t1_tt 合并计数
    // （防御上游脏数据：同一 t1_tt 在多个原始 t0 下出现时，会被 normT0 合并到同一 t0Key，
    //   但 t1Arr 仍按原始 t0 分组，导致同名二级分类重复出现；此处按 t1_tt 聚合避免重复）
    const map = {}
    for (const x of t1Arr) {
      if (!x.t1_tt) continue
      const t0Key = normT0(x.t0)
      if (!map[t0Key]) map[t0Key] = {}
      const bucket = map[t0Key]
      if (!bucket[x.t1_tt]) {
        bucket[x.t1_tt] = { value: x.t1_tt, label: x.t1_tt, cnt: 0 }
      }
      bucket[x.t1_tt].cnt += x.cnt
    }
    const merged = {}
    for (const [k, v] of Object.entries(map)) {
      merged[k] = Object.values(v).sort((a, b) => b.cnt - a.cnt)
    }
    t1Map.value = merged
  } catch (e) {
    console.error('[fund-rank] fetchCategories error', e)
  } finally {
    catLoading.value = false
  }
}

// ========== 响应式断点 ==========
const isMobile = ref(window.innerWidth < 641)
const tableHeadScrollRef = ref(null)
const tableBodyScrollRef = ref(null)
const fundTableRef = ref(null)
const tableScrollWidth = ref(0)
let tableScrollSyncing = false

// 固定前四列的 sticky left 偏移：必须按真实渲染宽度累加，不能硬编码。
// table-layout:fixed + width:100% 下浏览器会按比例放大列宽，硬编码 0/80/220/298
// 与真实宽度有偏差，横向滚动时相邻固定列之间会露出滚动内容的细缝。
const frozenLefts = ref([0, 80, 220, 298])
const frozenStyle = computed(() => ({
  '--fl-code': frozenLefts.value[0] + 'px',
  '--fl-name': frozenLefts.value[1] + 'px',
  '--fl-manager': frozenLefts.value[2] + 'px',
  '--fl-t1': frozenLefts.value[3] + 'px',
}))
function measureFrozenLefts() {
  const table = fundTableRef.value
  if (!table) return
  const ths = table.querySelectorAll('thead th')
  if (ths.length < 4) return
  const widths = []
  for (let i = 0; i < 4; i++) widths.push(ths[i].getBoundingClientRect().width)
  const next = [0]
  for (let i = 1; i < 4; i++) next.push(next[i - 1] + widths[i - 1])
  // 差异超过 0.5px 才更新，避免无谓重渲染
  if (next.some((v, i) => Math.abs(v - frozenLefts.value[i]) > 0.5)) frozenLefts.value = next
}

function syncTableScrollWidth() {
  nextTick(() => {
    const el = tableBodyScrollRef.value
    if (el) tableScrollWidth.value = el.scrollWidth
    measureFrozenLefts()
  })
}

function syncScrollLeft(from, to) {
  if (!from || !to || tableScrollSyncing) return
  if (Math.abs(from.scrollLeft - to.scrollLeft) < 1) return
  tableScrollSyncing = true
  to.scrollLeft = from.scrollLeft
  requestAnimationFrame(() => { tableScrollSyncing = false })
}

function onTableHeadScroll() {
  syncScrollLeft(tableHeadScrollRef.value, tableBodyScrollRef.value)
}

function onTableBodyScroll() {
  syncScrollLeft(tableBodyScrollRef.value, tableHeadScrollRef.value)
}

function onResize() { isMobile.value = window.innerWidth < 641; syncTableScrollWidth() }

// ========== 状态 ==========
const funds = ref([])
watch([funds, isMobile, displayPeriods], syncTableScrollWidth)
const meta = ref({})
const metaLoading = ref(false)
// 摘要行展示用的截止时间：优先净值日期 nav_date，截断到「日」（兼容时间戳）
const summaryDate = computed(() => {
  const d = meta.value?.nav_date || meta.value?.updateTime || ''
  if (!d) return ''
  const s = String(d)
  return s.length > 10 ? s.slice(0, 10) : s
})

// 分类筛选（多选勾选框）：组内并集、一级与二级之间交集。
// 用户 2026-11-25 指定默认：一级只勾「混合型」，二级只勾「混合型-偏股」（即偏股混合基金）。
// 一级「全部」= 空数组（不过滤）。
// 二级按一级分组独立存储（同名二级如「混合型-偏股」在多组都出现，必须按组区分）：
//   t1ByGroup[t0] = 该组勾选的二级数组
//   t1All[t0] = true 表示该组勾了「全部」（= 该一级下所有二级，t1 传空）
//   两者都没勾 = 该组未选（用户允许结果为空）
// 一级「全部」勾选 = 真·全选：所有一级/二级框都显示为勾选，筛选不过滤分类。
// 单独用布尔表示，避免用 filterT0=[] 兼表「全部」和「一个都没勾」两种相反语义。
const selectAllT0 = ref(false)
const filterT0 = ref(['混合型'])
const t1ByGroup = ref({ '混合型': ['混合型-偏股'] })
const t1All = ref({})

// 从全选状态退出：展开为「所有一级 + 每组全部」，供后续单项取消操作使用
function leaveSelectAll() {
  if (!selectAllT0.value) return
  selectAllT0.value = false
  filterT0.value = t0List.value.map(x => x.value)
  const a = {}
  for (const key of filterT0.value) a[key] = true
  t1All.value = a
  t1ByGroup.value = {}
}

// 更多筛选
const showMoreFilter = ref(false)
// 默认筛选（用户 2026-11-23 指定）：进入页面即应用，「重置」也回到这组值。
// 定开=否 / 持有期=无限制 / 规模=大于2亿(gt2)；下方角标把这组默认视为「未主动筛选」。
const DEFAULT_MORE_FILTERS = {
  dk: '0',
  holding: [HOLDING_NO_LIMIT],
  scalePicks: ['gt2'],
}
// 默认「主代码」：只显示每只基金的主份额（服务端去重视图 fund_scores_main），
// 避免 A/C/Y/后端份额并列造成「重复基金」观感。点「全部」或任一字母档即可查看其它份额。
const filterSC = ref(['MAIN'])  // 份额（多选）：可含 'MAIN' 主代码 与 份额字母 A/B/C/...（空数组=全部）
const filterHolding = ref([...DEFAULT_MORE_FILTERS.holding])  // 持有期（多选）：默认「无限制」
const filterETF = ref('')
const filterLOF = ref('')
const filterFOF = ref('')
const filterZZ = ref('')       // 指增（指数增强）：''全部 '1'是 '0'否
const filterAnomaly = ref('')  // 异常收益标注：''全部 '1'仅看异常 '0'剔除异常
const filterCN = ref('')       // 场内：''全部 '1'是(ETF/LOF/REITs不计联接) '0'否(场外+ETF联接)
const filterDK = ref(DEFAULT_MORE_FILTERS.dk)  // 定开：默认「否」
const filterDailyLimit = ref('')
const filterSG = ref('')       // 申购状态：''全部 '1'可申购 '0'暂停申购
const filterScaleMin = ref('')  // 基金规模区间（亿元）自定义最小值
const filterScaleMax = ref('')  // 基金规模区间（亿元）自定义最大值
const scalePicks = ref([...DEFAULT_MORE_FILTERS.scalePicks])  // 规模预设（多选）：默认「大于2亿」(gt2)
const scaleCustom = ref(false)  // 规模自定义区间开关（与预设多选互斥）

// 资产配置仓位区间（%）：股票/债券/货币(现金)仓位，与规模筛选同构
const filterStockMin = ref('')
const filterStockMax = ref('')
const filterBondMin = ref('')
const filterBondMax = ref('')
const filterCashMin = ref('')
const filterCashMax = ref('')
const filterInstMin = ref('')   // 机构持有比例区间（%）：与仓位筛选同构
const filterInstMax = ref('')

// 投资风格 / 概念·行业标签（2026-11-13）：
// 标签元数据直接复用「热门」tab 底层的 fund_tags（name + tag_type），不另建表。
const filterInvestStyle = ref([])   // 投资风格多选（可含「未披露」）
const filterConceptTags = ref([])   // 概念标签多选（可含「未分类」哨兵）
const filterIndustryTags = ref([])  // 行业标签多选（可含「未分类」哨兵）
const tagMeta = ref([])             // [{ name, tag_type, ... }]
const tagExpanded = reactive({ concept: false, industry: false })
const tagSearch = reactive({ concept: '', industry: '' })

/** 把输入框字符串转成数字，空/非法返回 undefined（与规模自定义区间 NaN 守卫同构） */
function numOrUndef(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}
const SCALE_PRESETS = [
  { key: 'all',     label: '全部',      min: '',   max: '' },
  { key: 'gt2',     label: '大于2亿',   min: 2,    max: '' },
  { key: '2to5',    label: '2-5亿',     min: 2,    max: 5 },
  { key: '5to10',   label: '5-10亿',    min: 5,    max: 10 },
  { key: '10to20',  label: '10-20亿',   min: 10,   max: 20 },
  { key: '20to50',  label: '20-50亿',   min: 20,   max: 50 },
  { key: '50to100', label: '50-100亿',  min: 50,   max: 100 },
  { key: 'gt100',   label: '100亿以上', min: 100,  max: '' },
  { key: 'custom',  label: '自定义',    min: null, max: null },
]

/** 当前生效的规模区间列表（多选并集）；空数组 = 不做规模过滤 */
const scaleRanges = computed(() => {
  if (scaleCustom.value) {
    const mn = filterScaleMin.value !== '' && filterScaleMin.value != null ? parseFloat(filterScaleMin.value) : null
    const mx = filterScaleMax.value !== '' && filterScaleMax.value != null ? parseFloat(filterScaleMax.value) : null
    if (mn == null && mx == null) return []
    if (Number.isNaN(mn) || Number.isNaN(mx)) return []
    return [[mn, mx]]
  }
  return scalePicks.value
    .map(k => SCALE_PRESETS.find(p => p.key === k))
    .filter(Boolean)
    .map(p => [p.min === '' ? null : p.min, p.max === '' ? null : p.max])
})

/** 规模预设 chip 的选中态 */
function isScaleActive(key) {
  if (key === 'all') return scalePicks.value.length === 0 && !scaleCustom.value
  if (key === 'custom') return scaleCustom.value
  return scalePicks.value.includes(key)
}

// 评分指标权重（6项）
const showScoreIndicator = ref(false)
const DEFAULT_WEIGHTS = { ret: 50, dd: 25, sr: 25, calmar: 0, ir: 0, te: 0 }
const weightItems = reactive([
  { key: 'ret',    label: '区间收益', value: DEFAULT_WEIGHTS.ret },
  { key: 'dd',     label: '最大回撤', value: DEFAULT_WEIGHTS.dd },
  { key: 'sr',     label: '夏普比率', value: DEFAULT_WEIGHTS.sr },
  { key: 'calmar', label: '卡玛比例', value: DEFAULT_WEIGHTS.calmar },
  { key: 'ir',     label: '信息比率', value: DEFAULT_WEIGHTS.ir },
  { key: 'te',     label: '跟踪误差', value: DEFAULT_WEIGHTS.te },
])
const weightSum = computed(() => weightItems.reduce((s, i) => s + (Number(i.value) || 0), 0))

function resetWeights() {
  weightItems.forEach(i => { i.value = DEFAULT_WEIGHTS[i.key] })
}

function applyCustomWeights() {
  if (weightSum.value !== 100) return
  showScoreIndicator.value = false
  // Re-fetch with updated weights (custom weight scoring computed client-side)
  loadData(true)
}

// 评分指标弹窗操作
function cancelScoreIndicator() {
  showScoreIndicator.value = false
}

function applyScoreIndicator() {
  applyCustomWeights()
}

// 搜索/周期/分页/排序
const searchText = ref('')
const currentPeriod = ref('k3')     // 默认按 3 年评分降序排序（2026-11-27 用户要求）
const activeTab = ref('score')      // 选品-基金视图：默认显示「评分」，与「热门」并列切换
const sortAsc = ref(false)        // 靠谱指数排序方向（false=降序，true=升序）
const sortField = ref('')          // 客户端排序列（非评分列）：'c'|'n'|'equityPct'|'bondPct'
const sortDir = ref('desc')        // 客户端排序方向
const page = ref(1)
const pageSize = 1000   // 首屏默认 1000 只（原 100，按用户 2026-08-26 反馈调整）；PostgREST 单次 range 上限 1000，正好对齐
const hasMore = ref(false)
const loading = ref(false)
const dataLoaded = ref(false)
const loadError = ref(false)
const refreshing = ref(false)
const totalCount = ref(null)      // 当前筛选条件下后端总数（来自 Supabase count）

// 弹窗
const detailFund = ref(null)
const showScoreHelp = ref(false)


// ========== 点赞 / 吐槽（localStorage 持久化） ==========
const LS_LIKES_KEY = 'af_fund_likes'
const LS_DISLIKES_KEY = 'af_fund_dislikes'

function loadLikes() {
  try { return JSON.parse(localStorage.getItem(LS_LIKES_KEY) || '{}') } catch { return {} }
}
function loadDislikes() {
  try { return JSON.parse(localStorage.getItem(LS_DISLIKES_KEY) || '{}') } catch { return {} }
}
function saveLikes(m) { localStorage.setItem(LS_LIKES_KEY, JSON.stringify(m)) }
function saveDislikes(m) { localStorage.setItem(LS_DISLIKES_KEY, JSON.stringify(m)) }

const likesMap = ref(loadLikes())       // { [code]: count }
const dislikedSet = ref(new Set(Object.keys(loadDislikes())))

function persistLikes() { saveLikes(likesMap.value) }
function persistDislikes() { saveDislikes(Object.fromEntries([...dislikedSet.value].map(c => [c, 1]))) }

function thumbUp(fund) {
  const c = fund.c
  if (dislikedSet.value.has(c)) dislikedSet.value.delete(c)
  const cur = (likesMap.value[c] || 0)
  if (cur > 0) {
    // 已点赞：取消
    delete likesMap.value[c]
  } else {
    // 未点赞：+1
    likesMap.value[c] = cur + 1
  }
  likesMap.value = { ...likesMap.value }
  dislikedSet.value = new Set(dislikedSet.value)
  persistLikes()
  persistDislikes()
}

function thumbDown(fund) {
  const c = fund.c
  if (likesMap.value[c]) delete likesMap.value[c]
  if (dislikedSet.value.has(c)) {
    dislikedSet.value.delete(c)
  } else {
    dislikedSet.value.add(c)
  }
  likesMap.value = { ...likesMap.value }
  dislikedSet.value = new Set(dislikedSet.value)
  persistLikes()
  persistDislikes()
}

// ========== 加入组合选择器 ==========
const pickerFund = ref(null)        // 当前要添加的基金 { code, name }

function openPortfolioPicker(fund) {
  if (!isLoggedIn.value) {
    toast('请先登录', 'error')
    return
  }
  pickerFund.value = { code: fund.c, name: fund.n || ('基金' + fund.c) }
}
async function confirmAddToPortfolio(portfolioId) {
  if (!pickerFund.value) return
  const f = pickerFund.value
  const result = await addFundToPortfolio(f.code, f.name, portfolioId)
  if (result.success) {
    toast(result.message, 'success')
  } else {
    toast(result.message || result.error || '添加失败', 'error')
  }
  pickerFund.value = null
}

function retCls(v) {
  const n = parseFloat(v) || 0
  if (n > 0) return 'ret-up'
  if (n < 0) return 'ret-down'
  return ''
}

function ddCls(v) {
  if (v == null) return ''
  const n = parseFloat(v)
  if (n <= -20) return 'risk-high'
  if (n <= -10) return 'risk-mid'
  return 'risk-low'
}

// ========== 份额类别提取（基于基金名称末尾大写字母） ==========
function hasReturns(f) {
  return f.r1y != null || f.r3y != null || f.ytd != null
}

function hasRisk(f) {
  return riskPeriods.some(p => f[p.dd] != null || f[p.sr] != null)
}

function eastMoneyUrl(code) {
  if (!code) return '#'
  const pureCode = code.replace(/\.of$/i, '').replace(/\.OF$/, '')
  return `https://fund.eastmoney.com/${pureCode}.html`
}

function fmtUpdateTime(tsq) {
  if (!tsq) return ''
  try {
    const d = new Date(tsq)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '' }
}

// ========== 份额类别提取（基于基金名称，排除产品类型关键词） ==========
// 产品类型关键词（ETF/LOF/FOF/QDII/REITs 不是份额类别！）
// 按长关键词优先顺序排列，避免 ETF联接 被误剥离为 ETF
const PRODUCT_TYPE_KEYWORDS = ['ETF联接', 'ETF', 'LOF', 'FOF', 'QDII', 'REITs', 'REIT']
// 有效份额类别字母
const VALID_SHARE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'R', 'T', 'Y']

/** 判断名称是否为场内产品（ETF不含联接/LOF/REITs） */
function isExchangeListed(name) {
  if (!name) return false
  return (name.includes('ETF') && !name.includes('ETF联接')) || name.includes('LOF') || name.includes('REIT')
}

/**
 * 从基金名称提取份额类别字母，排除 ETF/LOF/FOF/QDII/REITs 等产品类型。
 *
 * ⚠️ v4.0.11 起份额筛选（含多选）已改为**服务端 regex 下推**（见 `src/api/data.js` 的
 * `shareClassFilter()`），本函数不再是筛选链路的一部分，保留作为该口径的参照实现 ——
 * 两者已用 SQL 对 11 个档位全量核对，结果逐档一致（差值均为 0）。
 */
function extractShareClass(name) {
  if (!name) return ''
  let clean = name
  // 剥离末尾的产品类型关键词
  for (const kw of PRODUCT_TYPE_KEYWORDS) {
    if (clean.endsWith(kw)) {
      clean = clean.slice(0, -kw.length)
      break  // 只剥离一个产品类型（不循环复用）
    }
  }
  // 提取末尾大写字母作为份额类别
  const match = clean.match(/([A-Z])$/)
  if (match && VALID_SHARE_CLASSES.includes(match[1])) {
    return match[1]
  }
  return ''
}

const shareClassOptions = VALID_SHARE_CLASSES

// ========== 投资风格 / 概念·行业标签：选项、行内拆分、多选交互 ==========
const tagTypeMap = computed(() => {
  const m = {}
  for (const t of tagMeta.value) m[t.name] = t.tag_type
  return m
})
const conceptTagOptions = computed(() =>
  tagMeta.value.filter(t => t.tag_type === TAG_TYPE_CONCEPT).map(t => t.name))
const industryTagOptions = computed(() =>
  tagMeta.value.filter(t => t.tag_type === TAG_TYPE_INDUSTRY).map(t => t.name))

// 列表两列：把 fund.tags（text[]）按 fund_tags.tag_type 拆成概念 / 行业两组
function conceptOf(f) {
  return (Array.isArray(f.tags) ? f.tags : []).filter(t => tagTypeMap.value[t] === TAG_TYPE_CONCEPT)
}
function industryOf(f) {
  return (Array.isArray(f.tags) ? f.tags : []).filter(t => tagTypeMap.value[t] === TAG_TYPE_INDUSTRY)
}

// 标签 101 + 85 个，默认只露前 12 个；可搜索或展开全部，避免撑爆弹窗
function visibleTagOptions(type) {
  let list = type === 'concept' ? conceptTagOptions.value : industryTagOptions.value
  const q = (tagSearch[type] || '').trim()
  if (q) list = list.filter(n => n.includes(q))
  else if (!tagExpanded[type]) list = list.slice(0, 12)
  return list
}
function mToggleTag(type, name) {
  const r = type === 'concept' ? filterConceptTags : filterIndustryTags
  r.value = r.value.includes(name) ? r.value.filter(x => x !== name) : r.value.concat(name)
}
function mToggleStyle(val) {
  filterInvestStyle.value = filterInvestStyle.value.includes(val)
    ? filterInvestStyle.value.filter(x => x !== val)
    : filterInvestStyle.value.concat(val)
}
async function loadTagMeta() {
  try {
    const rows = await fetchFundTags()
    if (Array.isArray(rows)) tagMeta.value = rows
  } catch (e) {
    console.warn('[fund-rank] 标签元数据加载失败（两列显示 --，不影响其它筛选）', e)
  }
}

// ========== 数据加载 ==========
const LOAD_TIMEOUT_MS = 60000 // 60 秒超时（Supabase 免费档偶尔响应偏慢，给足时间避免误报 0 只）
const MAX_RETRIES = 1           // 失败后自动重试 1 次

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时（' + ms / 1000 + 's）')), ms))
  ])
}

async function loadData(reset = true, _retryCount = 0) {
  if (loading.value && _retryCount === 0) return
  loading.value = true
  loadError.value = false
  if (reset) page.value = 1
  // 切换筛选条件时先清空旧总数，加载期间回退到已加载条数，避免残留上一筛选的真实总数
  if (reset) totalCount.value = null

  try {
    // 分类多选（2026-11-25 重写）：按一级分组，每组 = 该一级 AND 其名下勾选的二级；
    // 组间 OR。这样「债券型勾全部（无二级勾选）」= 该组只按一级过滤，包含其下所有二级。
    // 一级分类已归一化（"混合型"+"混合型基金"→"混合型"），用原始 t0 值匹配保证计数一致。
    let categoryGroups
    if (filterFOF.value === '1') {
      // FOF 模式走单独一组，忽略二级勾选
      categoryGroups = [{ t0: ['FOF'], t1: [] }]
    } else if (selectAllT0.value) {
      // 一级「全部」勾选：不过滤分类，返回全部基金
      categoryGroups = undefined
    } else if (!selectAllT0.value && !filterT0.value.length) {
      // 一级「全部」被取消勾选：一个一级都没选 → 空结果（不返回全部基金）
      categoryGroups = [{ t0: ['__NONE__'], t1: [] }]
    } else if (filterT0.value.length) {
      categoryGroups = []
      for (const key of filterT0.value) {
        const raw = t0RawMap.value[key]
        const t0Arr = raw && raw.length ? [...raw] : [key]
        if (t1All.value[key]) {
          // 该一级勾了「全部」：只按一级过滤，含其下所有二级
          categoryGroups.push({ t0: t0Arr, t1: [] })
        } else if ((t1ByGroup.value[key] || []).length) {
          // 该一级勾了具体二级：组内 AND
          categoryGroups.push({ t0: t0Arr, t1: [...t1ByGroup.value[key]] })
        } else {
          // 一级勾了但二级「全部」和具体二级都没勾 → 该组不匹配任何基金（结果可为空）
          categoryGroups.push({ t0: ['__NONE__'], t1: [] })
        }
      }
    }
    // filterT0 为空且非全选/非 FOF：categoryGroups = undefined，不过滤分类

    // 当前筛选条件（同时用于「列表」与「真实总数」两次请求，保证口径一致）
    const queryParams = {
      categoryGroups,
      search: buildSearchText(),
      shareClasses: filterSC.value.length ? filterSC.value : undefined,
      holdingPeriods: filterHolding.value.length ? filterHolding.value : undefined,
      kKey: currentPeriod.value,
      sortAsc: sortAsc.value,
      page: page.value,
      pageSize,
      etf: filterETF.value || undefined,
      lof: filterLOF.value || undefined,
      dk: filterDK.value || undefined,
      zz: filterZZ.value || undefined,
      sg: filterSG.value || undefined,
      dailyLimit: filterDailyLimit.value || undefined,
      retAnomaly: filterAnomaly.value || undefined,
      scaleRanges: scaleRanges.value.length ? scaleRanges.value : undefined,
      stockMin: numOrUndef(filterStockMin.value),
      stockMax: numOrUndef(filterStockMax.value),
      bondMin: numOrUndef(filterBondMin.value),
      bondMax: numOrUndef(filterBondMax.value),
      cashMin: numOrUndef(filterCashMin.value),
      cashMax: numOrUndef(filterCashMax.value),
      instMin: numOrUndef(filterInstMin.value),
      instMax: numOrUndef(filterInstMax.value),
      sortField: sortField.value || undefined,
      sortDir: sortDir.value || undefined,
      // 投资风格 / 概念·行业：两行 UI 各自独立成组（组间取交集），与列表同一条链
      investStyles: filterInvestStyle.value.length ? filterInvestStyle.value : undefined,
      conceptTagFilters: filterConceptTags.value.length ? [...filterConceptTags.value] : undefined,
      industryTagFilters: filterIndustryTags.value.length ? [...filterIndustryTags.value] : undefined,
    }

    // 并行拉取「真实总数」：复用与列表完全相同的过滤链做服务端 count=exact，
    // 不受 pageSize 限制。默认「主代码」查 fund_scores_main 视图时口径同样一致，
    // 因此不再跳过（2026-11-09 修复「筛选结果只显示已加载 1000 只」）。
    // 不阻塞列表加载；结果回来后响应式更新 totalCount（失败则保持 null，回退 funds.length）。
    fetchFundScoresCount(queryParams)
      .then(cnt => { if (cnt != null) totalCount.value = cnt })
      .catch(() => {})

    // t0（一级分类）/ t1（二级分类 t1_tt）直接来自 fund_scores，服务端按总表过滤
    const result = await withTimeout(fetchFundScores(queryParams), LOAD_TIMEOUT_MS)

    if (result.data) {
      // 服务端过滤后的真实总数（已含 t0/t1/search 及下推的 ETF/LOF/定开/申购状态/±20%）
      if (result.count != null) totalCount.value = result.count
      // 前端补充筛选：仅「场内」无法服务端下推（份额类别已改为服务端 regex 下推）
      let filtered = result.data
      // 场内（ETF不含联接/LOF/REITs → 是；其余含ETF联接 → 否）
      if (filterCN.value === '1') filtered = filtered.filter(f => isExchangeListed(f.n))
      if (filterCN.value === '0') filtered = filtered.filter(f => !isExchangeListed(f.n))

      funds.value = reset ? filtered : funds.value.concat(filtered)
      hasMore.value = result.data.length >= pageSize
    }
  } catch (e) {
    console.error('[fund-rank] load error', e)
    if (_retryCount < MAX_RETRIES) {
      // 自动重试一次（网络抖动 / DNS / 限流等瞬时问题）
      console.warn('[fund-rank] retrying...', _retryCount + 1, '/', MAX_RETRIES)
      return loadData(reset, _retryCount + 1)
    }
    loadError.value = true
  } finally {
    loading.value = false
    dataLoaded.value = true
  }
}

function buildSearchText() {
  return searchText.value || undefined
}

async function loadMeta() {
  metaLoading.value = true
  try {
    const m = await fetchFundMeta()
    if (m) meta.value = m
    else console.warn('[fund-rank] meta: no data')
  } catch (e) {
    console.error('[fund-rank] meta load error:', e)
  } finally {
    metaLoading.value = false
  }
}

async function refreshData() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await Promise.all([loadData(true), loadMeta()])
  } finally {
    refreshing.value = false
  }
}

// ========== 交互（分类多选勾选框） ==========
function toggleT0(val) {
  // 全选状态下点某个一级：退出全选，只保留被点击的这一级（该组视为「全部」）
  if (selectAllT0.value) {
    selectAllT0.value = false
    filterT0.value = [val]
    t1ByGroup.value = {}
    t1All.value = { [val]: true }
    clearMoreFilters()
    loadData(true)
    return
  }
  const arr = filterT0.value
  const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
  filterT0.value = next
  // 取消一级勾选时，清空该组二级与「全部」，避免留下"二级勾了但一级没勾"的不一致状态
  if (!next.includes(val)) {
    const m = { ...t1ByGroup.value }; delete m[val]; t1ByGroup.value = m
    const a = { ...t1All.value }; delete a[val]; t1All.value = a
  }
  clearMoreFilters()
  loadData(true)
}

// 一级「全部」勾选/取消：勾选=真全选（所有框都勾、不过滤）；取消=清空到空结果
function clearT0() {
  selectAllT0.value = !selectAllT0.value
  filterT0.value = []
  t1ByGroup.value = {}
  t1All.value = {}
  clearMoreFilters()
  loadData(true)
}

// 某二级是否勾选：一级全选 / 该组「全部」/ 该组具体勾选，三者任一成立即勾选
function isT1Checked(val, t0Key) {
  return selectAllT0.value || !!t1All.value[t0Key] || (t1ByGroup.value[t0Key] || []).includes(val)
}

// 勾选某二级：按一级分组独立记录；勾选时自动勾上其一级，并取消该组「全部」
function toggleT1(val, t0Key) {
  const wasChecked = isT1Checked(val, t0Key)
  if (selectAllT0.value) {
    // 一级全选态下点某二级：退出全选，只保留该二级
    selectAllT0.value = false
    filterT0.value = t0Key ? [t0Key] : []
    t1ByGroup.value = t0Key ? { [t0Key]: [val] } : {}
    t1All.value = {}
    loadData(true)
    return
  }
  if (t1All.value[t0Key]) {
    // 该组「全部」勾选态下点某二级：全部展开为具体二级，并去掉被点的这一项
    // （视觉上所有二级都勾着，点一个 = 取消它，保留其余）
    const all = (t1Map.value[t0Key] || []).map(x => x.value).filter(v => v !== val)
    const a = { ...t1All.value }; delete a[t0Key]; t1All.value = a
    t1ByGroup.value = { ...t1ByGroup.value, [t0Key]: all }
    loadData(true)
    return
  }
  const arr = t1ByGroup.value[t0Key] || []
  const next = wasChecked ? arr.filter(v => v !== val) : [...arr, val]
  t1ByGroup.value = { ...t1ByGroup.value, [t0Key]: next }
  if (!wasChecked) {
    if (t0Key && !filterT0.value.includes(t0Key)) filterT0.value = [...filterT0.value, t0Key]
  }
  loadData(true)
}

// 勾选该一级的「全部」：t1All[t0]=true，清空该组具体二级，并自动勾上一级
function toggleT1All(t0) {
  if (selectAllT0.value) {
    // 全选状态下点某组「全部」：退出全选，只保留该一级的全部二级
    selectAllT0.value = false
    filterT0.value = t0 ? [t0] : []
    t1ByGroup.value = {}
    t1All.value = t0 ? { [t0]: true } : {}
    loadData(true)
    return
  }
  const on = !t1All.value[t0]
  const a = { ...t1All.value }
  const m = { ...t1ByGroup.value }
  if (on) {
    a[t0] = true
    delete m[t0]            // 「全部」与具体二级互斥
    if (t0 && !filterT0.value.includes(t0)) filterT0.value = [...filterT0.value, t0]
  } else {
    delete a[t0]
  }
  t1All.value = a
  t1ByGroup.value = m
  loadData(true)
}

/** 清除所有更多筛选条件（份额回到默认「主代码」） */
function clearMoreFilters() {
  filterSC.value = ['MAIN']
  filterHolding.value = [...DEFAULT_MORE_FILTERS.holding]
  filterCN.value = ''
  filterETF.value = ''
  filterLOF.value = ''
  filterFOF.value = ''
  filterZZ.value = ''
  filterAnomaly.value = ''
  filterDK.value = DEFAULT_MORE_FILTERS.dk
  filterDailyLimit.value = ''
  filterSG.value = ''
  filterScaleMin.value = ''
  filterScaleMax.value = ''
  scalePicks.value = [...DEFAULT_MORE_FILTERS.scalePicks]
  scaleCustom.value = false
  filterStockMin.value = ''
  filterStockMax.value = ''
  filterBondMin.value = ''
  filterBondMax.value = ''
  filterCashMin.value = ''
  filterCashMax.value = ''
  filterInstMin.value = ''
  filterInstMax.value = ''
  filterInvestStyle.value = []
  filterConceptTags.value = []
  filterIndustryTags.value = []
  tagExpanded.concept = false
  tagExpanded.industry = false
  tagSearch.concept = ''
  tagSearch.industry = ''
}

// ========== 更多筛选弹窗（确认后才查询，取消恢复） ==========
let moreFilterSnapshot = null

function openMoreFilter() {
  moreFilterSnapshot = {
    sc: [...filterSC.value], holding: [...filterHolding.value], etf: filterETF.value, lof: filterLOF.value, fof: filterFOF.value, zz: filterZZ.value, anom: filterAnomaly.value,
    cn: filterCN.value, dk: filterDK.value, dl: filterDailyLimit.value, sg: filterSG.value,
    smin: filterScaleMin.value, smax: filterScaleMax.value,
    allT0: selectAllT0.value,
    t0: [...filterT0.value], t1ByGroup: JSON.parse(JSON.stringify(t1ByGroup.value)), t1All: JSON.parse(JSON.stringify(t1All.value)),
    sp: [...scalePicks.value], scu: scaleCustom.value,
    psm: filterStockMin.value, psx: filterStockMax.value,
    pbm: filterBondMin.value, pbx: filterBondMax.value,
    pcm: filterCashMin.value, pcx: filterCashMax.value,
    pim: filterInstMin.value, pix: filterInstMax.value,
    ist: [...filterInvestStyle.value], ct: [...filterConceptTags.value], it: [...filterIndustryTags.value],
  }
  showMoreFilter.value = true
}

function cancelMoreFilter() {
  if (moreFilterSnapshot) {
    filterSC.value = [...moreFilterSnapshot.sc]
    filterHolding.value = [...moreFilterSnapshot.holding]
    filterETF.value = moreFilterSnapshot.etf
    filterLOF.value = moreFilterSnapshot.lof
    filterFOF.value = moreFilterSnapshot.fof
    filterZZ.value = moreFilterSnapshot.zz
    filterAnomaly.value = moreFilterSnapshot.anom || ''
    filterCN.value = moreFilterSnapshot.cn
    filterDK.value = moreFilterSnapshot.dk
    filterDailyLimit.value = moreFilterSnapshot.dl
    filterSG.value = moreFilterSnapshot.sg
    filterScaleMin.value = moreFilterSnapshot.smin
    filterScaleMax.value = moreFilterSnapshot.smax
    selectAllT0.value = !!moreFilterSnapshot.allT0
    filterT0.value = Array.isArray(moreFilterSnapshot.t0) ? [...moreFilterSnapshot.t0] : []
    t1ByGroup.value = moreFilterSnapshot.t1ByGroup ? JSON.parse(JSON.stringify(moreFilterSnapshot.t1ByGroup)) : {}
    t1All.value = moreFilterSnapshot.t1All ? JSON.parse(JSON.stringify(moreFilterSnapshot.t1All)) : {}
    scalePicks.value = [...moreFilterSnapshot.sp]
    scaleCustom.value = moreFilterSnapshot.scu
    filterStockMin.value = moreFilterSnapshot.psm
    filterStockMax.value = moreFilterSnapshot.psx
    filterBondMin.value = moreFilterSnapshot.pbm
    filterBondMax.value = moreFilterSnapshot.pbx
    filterCashMin.value = moreFilterSnapshot.pcm
    filterCashMax.value = moreFilterSnapshot.pcx
    filterInstMin.value = moreFilterSnapshot.pim || ''
    filterInstMax.value = moreFilterSnapshot.pix || ''
    filterInvestStyle.value = [...(moreFilterSnapshot.ist || [])]
    filterConceptTags.value = [...(moreFilterSnapshot.ct || [])]
    filterIndustryTags.value = [...(moreFilterSnapshot.it || [])]
  }
  showMoreFilter.value = false
}

function applyMoreFilters() {
  showMoreFilter.value = false
  loadData(true)
}

function resetMoreFilters() {
  clearMoreFilters()
}

// 弹窗内筛选只改本地状态，确认后才查询（份额/持有期/规模为多选：同行内多选取并集）
function mToggleSC(val) {
  filterSC.value = filterSC.value.includes(val)
    ? filterSC.value.filter(x => x !== val)
    : filterSC.value.concat(val)
}
function mToggleHolding(val) {
  filterHolding.value = filterHolding.value.includes(val)
    ? filterHolding.value.filter(x => x !== val)
    : filterHolding.value.concat(val)
}
function mToggleCN(val) { filterCN.value = filterCN.value === val ? '' : val }
function mToggleSG(val) { filterSG.value = filterSG.value === val ? '' : val }
function mToggleDailyLimit(val) { filterDailyLimit.value = filterDailyLimit.value === val ? '' : val }
function mToggleFlag(type, val) {
  const map = { ETF: filterETF, LOF: filterLOF, FOF: filterFOF, DK: filterDK, ZZ: filterZZ, ANOM: filterAnomaly }
  const r = map[type]
  if (!r) return
  const next = r.value === val ? '' : val
  r.value = next
  if (type === 'FOF' && next === '1') { selectAllT0.value = false; filterT0.value = []; t1ByGroup.value = {}; t1All.value = {} }
}

function pickScalePreset(key) {
  // 「全部」= 清空规模条件；「自定义」与预设多选互斥
  if (key === 'all') {
    scalePicks.value = []
    scaleCustom.value = false
    return
  }
  if (key === 'custom') {
    scaleCustom.value = !scaleCustom.value
    if (scaleCustom.value) scalePicks.value = []
    return
  }
  scaleCustom.value = false
  scalePicks.value = scalePicks.value.includes(key)
    ? scalePicks.value.filter(x => x !== key)
    : scalePicks.value.concat(key)
}

function onScaleInput() {
  // 手动修改规模输入框视为自定义区间（与预设多选互斥）
  scaleCustom.value = true
  scalePicks.value = []
}

const activeMoreFilterCount = computed(() => {
  let n = 0
  // 默认「主代码」不算用户主动筛选，避免「更多筛选」按钮默认就显示 1
  if (filterSC.value.length && !(filterSC.value.length === 1 && filterSC.value[0] === 'MAIN')) n++
  // 默认「无限制」不算主动筛选
  if (filterHolding.value.length && !(filterHolding.value.length === 1 && filterHolding.value[0] === HOLDING_NO_LIMIT)) n++
  if (filterETF.value) n++
  if (filterLOF.value) n++
  if (filterFOF.value) n++
  if (filterZZ.value) n++
  if (filterAnomaly.value) n++
  if (filterCN.value) n++
  // 默认「否」不算主动筛选
  if (filterDK.value && filterDK.value !== DEFAULT_MORE_FILTERS.dk) n++
  if (filterDailyLimit.value) n++
  if (filterSG.value) n++
  // 默认「大于2亿」不算主动筛选
  if (scaleRanges.value.length && !(scaleCustom.value === false && scalePicks.value.length === 1 && scalePicks.value[0] === DEFAULT_MORE_FILTERS.scalePicks[0])) n++
  if (filterStockMin.value !== '' || filterStockMax.value !== '') n++
  if (filterBondMin.value !== '' || filterBondMax.value !== '') n++
  if (filterCashMin.value !== '' || filterCashMax.value !== '') n++
  if (filterInvestStyle.value.length) n++
  if (filterConceptTags.value.length) n++
  if (filterIndustryTags.value.length) n++
  return n
})

function switchPeriod(key) {
  sortField.value = ''  // 切换到服务端排序，清除客户端排序
  if (currentPeriod.value === key) {
    // 已选中：切换升降序
    sortAsc.value = !sortAsc.value
  } else {
    // 新选中：默认降序（高分在前）
    currentPeriod.value = key
    sortAsc.value = false
  }
  loadData(true)
}

/** 列排序（代码/简称/经理/规模/管理费/各阶段收益）：改由服务端在整个 fund_scores 表排序后返回 */
function toggleColumnSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'  // 首次点击默认升序
  }
  // 触发服务端重新拉取（排序已下推到数据库，覆盖全表而非仅已加载的 100 条）
  loadData(true)
}

/** 机构持有比例：数值百分比，保留两位小数加 %；无数据显示 -- */
function fmtInstPct(v) {
  if (v == null || v === '') return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return n.toFixed(2) + '%'
}

/** 收益涨跌幅颜色：涨红跌绿（中国习惯），0/空为次要文本色 */
function retColor(v) {
  if (v == null) return 'var(--text-secondary)'
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return 'var(--text-secondary)'
  return n > 0 ? '#d4351c' : '#00703c'
}

/** 排序后的基金列表
 *  排序已在服务端完成（整个 fund_scores 表按筛选条件过滤后，按靠谱分周期或指定列排序），
 *  这里直接返回 funds（服务端已按正确顺序分页返回，加载更多时顺序保持全局一致）。
 *  不再做客户端排序——否则只会排已加载的前 100 条，无法反映全表排序结果。 */
const sortedFunds = computed(() => funds.value)

function doSearch() { loadData(true) }

/**
 * 回车提交守卫：中文输入法选词时按的 Enter 也会冒泡成 keyup.enter，
 * 若直接搜索会在「选词确认」阶段连发多次全表查询（22k+ 行 × 30 列）把页面卡死。
 * 判定规则：event.isComposing 为 true（正在选词）→ 忽略；
 * 若输入框以 composition 结束（部分浏览器此时 isComposing 已是 false，
 * 但紧接着会有一次 keydown 的 Enter 229），用「刚结束输入法」的时间窗兜底拦截。
 */
let lastCompositionEnd = 0
function onCompositionStart() { /* 组合态开始，onSearchEnter 靠 e.isComposing 拦截 */ }
function onCompositionEnd() { lastCompositionEnd = Date.now() }
function onSearchEnter(e) {
  if (e && e.isComposing) return
  // 选词确认后的 250ms 内不视为「用户想搜索」，避免误触发
  if (Date.now() - lastCompositionEnd < 250) return
  doSearch()
}

function clearSearch() {
  searchText.value = ''
  loadData(true)
}

// ========== 导出 CSV（导出当前已加载的筛选+排序结果） ==========
function exportCsv() {
  if (!sortedFunds.value.length) {
    toast('暂无数据可导出', 'error')
    return
  }
  const headers = ['基金代码', '基金简称', '基金经理', '二级分类', '投资风格', '概念', '行业', '上季规模(亿)', '基金规模(亿)', '规模增长(%)', '费率', '近1年', '近2年', '近3年', '近5年']
  const periodHeaders = displayPeriods.value.map(p => p.label + '评分')
  const allHeaders = [...headers, ...periodHeaders]

  const rows = sortedFunds.value.map(f => {
    const base = [
      f.c,
      f.n || '',
      f.fund_manager || '',
      f.t1_tt || f.t1 || '',
      f.invest_style || '',
      conceptOf(f).join('、'),
      industryOf(f).join('、'),
      f.fund_scale_prev != null ? f.fund_scale_prev : '',
      f.fund_scale != null ? f.fund_scale : '',
      f.fund_scale_growth != null ? Number(f.fund_scale_growth).toFixed(2) : '',
      f.manage_fee != null ? f.manage_fee : '',
      f.r1y != null ? f.r1y : '',
      f.r2y != null ? f.r2y : '',
      f.r3y != null ? f.r3y : '',
      f.r5y != null ? f.r5y : '',
    ]
    const scores = displayPeriods.value.map(p => (f[p.key] != null ? Number(f[p.key]).toFixed(1) : ''))
    return [...base, ...scores]
  })

  const escapeCsv = v => {
    const s = String(v == null ? '' : v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = [allHeaders, ...rows].map(r => r.map(escapeCsv).join(',')).join('\r\n')
  // 加 UTF-8 BOM，确保 Excel 正确识别中文
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ts = new Date()
  const pad = n => String(n).padStart(2, '0')
  const fname = `ALLFUND_靠谱指数_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`
  a.href = url
  a.download = fname
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast(`已导出 ${rows.length} 只基金`, 'success')
}

function loadMore() {
  if (!loading.value && hasMore.value) {
    page.value++
    loadData(false)
  }
}

function openDetail(fund) {
  detailFund.value = { ...fund }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  fetchCategories()
  loadData()
  loadMeta()
  loadTagMeta()
  syncTableScrollWidth()
})
onActivated(() => {
  // keep-alive 缓存激活时：数据已存在（秒开），仅刷新 meta（更新时间）
  loadMeta()
  syncTableScrollWidth()
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* ========== gov.uk 风格靠谱指数 ========== */
.page-fund-rank { min-height: 100vh; }

/* 选品-基金 视图切换 Tab（评分/热门），gov.uk 风格：无圆角/阴影，激活态蓝色下划线 */
.fund-view-tabs { display: flex; align-items: stretch; background: #ffffff; border-bottom: 1px solid var(--border); padding: 0 16px; }
/* 页面说明行：标题 + 数据来源 / 截止时间 / 覆盖范围（与股票选品页一致，gov.uk 风格） */
.frk-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 16px 8px;
}
.frk-summary-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #0b0c0c);
  margin: 0;
}
.frk-summary-meta {
  font-size: 13px;
  color: var(--text-secondary, #505a5f);
}
.frk-summary-sep {
  color: var(--text-muted, #b1b4b6);
  margin: 0 4px;
}
@media (max-width: 640px) {
  .frk-summary-title { font-size: 20px; }
}
.fund-view-tab { appearance: none; -webkit-appearance: none; background: transparent; border: none; border-bottom: 3px solid transparent; padding: 12px 18px; font-size: 16px; line-height: 1.4; color: var(--text-secondary); cursor: pointer; font-family: inherit; }
.fund-view-tab:hover { color: var(--text-primary); }
.fund-view-tab.active { color: #1d70b8; border-bottom-color: #1d70b8; font-weight: 700; }
@media (max-width: 640px) { .fund-view-tabs { padding: 0 12px; } .fund-view-tab { padding: 10px 14px; font-size: 15px; } }

/* 顶部栏 */
.top-bar {
  display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-md); border-bottom: 1px solid var(--border);
  background: #ffffff;
}
.top-title-row { display: flex; align-items: baseline; gap: 6px; flex-shrink: 0; }
.top-title-text { font-size: 24px; font-weight: 700; color: var(--text-primary); }
@media (min-width: 641px) { .top-title-text { font-size: 36px; } }

.help-icon-btn {
  width: 24px; height: 24px; line-height: 24px; text-align: center;
  font-size: 14px; color: var(--text-secondary);
  border: 2px solid var(--text-secondary); cursor: pointer;
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
}

.search-box { flex: 1; position: relative; width: 100%; }
.search-input {
  width: 100%; padding: 8px 36px 8px 8px;
  border: 2px solid #1d70b8; font-size: 16px;
  color: var(--text-primary); outline: none; box-sizing: border-box;
}
.search-btn {
  flex-shrink: 0;
  padding: 8px 18px;
  border: 2px solid #1d70b8;
  background: #1d70b8;
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.search-btn:hover:not(:disabled) { background: #003078; border-color: #003078; }
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.search-input:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.search-input::placeholder { color: var(--text-secondary); }
.search-clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  color: var(--text-secondary); font-size: 14px; cursor: pointer;
}

/* 数据信息条 */
.data-info-bar {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: var(--space-sm) var(--space-md); background: #ffffff;
  border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text-secondary);
}
.data-info-row { display: flex; align-items: center; gap: var(--space-sm); }
.data-refresh {
  margin-left: var(--space-sm); padding: 2px 8px;
  font-size: 14px; color: var(--link); cursor: pointer; text-decoration: underline;
}
.data-refresh.refreshing { opacity: 0.5; }

.result-actions { display: flex; align-items: center; gap: var(--space-md); }
.export-btn {
  padding: 4px 14px; font-size: 14px; color: #fff; background: #1d70b8;
  border: none; cursor: pointer; font-weight: 600;
}
.export-btn:hover { background: #155a96; }

/* 筛选区 */
.filter-section { background: #ffffff; border-bottom: 1px solid var(--border); }
.filter-row { display: flex; align-items: flex-start; padding: var(--space-sm) var(--space-md); gap: var(--space-sm); }
.filter-label {
  font-size: 14px; color: var(--text-secondary); font-weight: 700;
  flex-shrink: 0; padding-top: 4px;
}
.filter-select {
  padding: 6px 12px; font-size: 16px; border: 1px solid var(--border);
  background: #fff; color: var(--text-primary); flex: 1; max-width: 100%;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23505a5f' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
  padding-right: 30px; cursor: pointer;
}
.filter-select:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.filter-chips { display: flex; flex-wrap: wrap; gap: 0; flex: 1; }
.filter-chip {
  padding: 4px 12px; font-size: 16px; color: var(--link);
  cursor: pointer; text-decoration: underline; text-underline-offset: 4px;
  text-decoration-color: transparent; transition: text-decoration-color 0.15s;
}
.filter-chip:hover { text-decoration-color: var(--link); }
.filter-chip.active {
  color: #1d70b8; font-weight: 400; text-decoration: none;
}
.chip-cnt {
  font-size: 12px; font-weight: 400; color: var(--text-secondary);
  margin-left: 4px; font-variant-numeric: tabular-nums;
}
.filter-chip.active .chip-cnt { color: #1d70b8; }
/* 分类多选勾选框：gov.uk 风格方角，无 emoji，选中为蓝底白勾 */
.check-chip { display: inline-flex; align-items: center; gap: 6px; }
.check-box {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border: 1px solid #505a5f; background: #fff;
  flex: 0 0 auto; box-sizing: border-box;
}
.check-box.checked { background: #1d70b8; border-color: #1d70b8; }
.check-box.checked::after {
  content: ''; width: 4px; height: 8px; border: solid #fff;
  border-width: 0 1px 1px 0; transform: rotate(45deg) translateY(-1px);
}
/* 二级分类按一级分组：组名加蓝色左边框标识层级，行缩进对齐 */
.t1-group-row { padding-top: 2px; padding-bottom: 2px; }
.t1-group-label {
  min-width: 80px; text-align: right; color: var(--text-primary);
  border-left: 4px solid #1d70b8; padding: 4px 8px 4px 0;
}
.more-chip { position: relative; }
.source-dropdown {
  position: absolute; top: 100%; left: 0; z-index: 100;
  background: #fff; border: 1px solid var(--border); min-width: 160px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.source-drop-item {
  padding: var(--space-sm) var(--space-md); font-size: 14px; cursor: pointer;
  color: var(--text-primary); text-decoration: none;
}
.source-drop-item:hover { background: #f3f2f1; }
.source-drop-item.disabled { color: var(--text-secondary); cursor: not-allowed; }

.more-filter-toggle {
  display: flex; align-items: center; gap: 4px;
  padding: var(--space-sm) var(--space-md); font-size: 16px; color: var(--link);
  cursor: pointer; text-decoration: underline;
}
.filter-action-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 92px; padding: 6px 12px; font-size: 14px; font-weight: 700;
  color: #1d70b8; background: #ffffff;
  border: 1px solid #1d70b8;
  cursor: pointer; text-decoration: none;
  box-sizing: border-box;
}
.filter-action-btn:hover { background: #f3f2f1; }
.toggle-arrow { display: inline-block; transition: transform 0.2s; font-size: 16px; }
.toggle-arrow.open { transform: rotate(180deg); }
.filter-scale-range { display: flex; align-items: center; gap: 6px; flex: 1; }
.scale-input {
  width: 80px; padding: 4px 8px; font-size: 14px;
  border: 1px solid var(--border); background: #fff; color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.scale-input:focus { outline: 3px solid #ffdd00; outline-offset: 0; }
.scale-dash { color: var(--text-secondary); }
.scale-unit { font-size: 14px; color: var(--text-secondary); }
.filter-tip { padding: var(--space-sm) var(--space-md); font-size: 14px; color: var(--text-secondary); }

/* 周期Tab - 已移除 toolbar 行，周期选择通过表头点击完成 */

.filter-result-row {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-md);
  padding: var(--space-sm) var(--space-md); background: #f3f2f1;
  border-top: 1px solid var(--border);
}
.filter-result-left { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; }
.filter-result-count { font-size: 16px; color: var(--text-secondary); }
.filter-result-count strong { color: #0b0c0c; font-weight: 700; }
.filter-update-time { font-size: 13px; color: var(--text-secondary); }
.filter-update-time::before { content: '·'; margin-right: 6px; }

/* 基金列表 - 横向滚动表格 */
.fund-table-top-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  background: #f3f2f1;
  height: 10px;
}
.fund-table-top-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
.fund-table-top-scroll::-webkit-scrollbar-thumb { background: #b1b4b6; border-radius: 4px; }
.fund-table-top-scroll::-webkit-scrollbar-thumb:hover { background: #808185; }
.fund-table-top-scroll::-webkit-scrollbar-track { background: #f3f2f1; }
.fund-table-top-scroll-inner { height: 1px; }
.fund-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-top: 1px solid var(--border);
  position: relative;
}
.fund-table-wrap::-webkit-scrollbar {
  height: 8px; width: 8px;
}
.fund-table-wrap::-webkit-scrollbar-thumb {
  background: #b1b4b6; border-radius: 4px;
}
.fund-table-wrap::-webkit-scrollbar-thumb:hover { background: #808185; }
.fund-table-wrap::-webkit-scrollbar-track {
  background: #f3f2f1;
}
.fund-table {
  width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; white-space: nowrap;
  min-width: 860px; table-layout: fixed;
}
.fund-table thead { background: #f3f2f1; }
.fund-table th {
  padding: 4px 5px; text-align: center;
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  border-bottom: 2px solid var(--border);
  border-right: 0.5px solid #eaeaea;
  position: sticky; top: 0; background: #f3f2f1; z-index: 1;
}
.fund-table td {
  padding: 5px 6px; border-bottom: 0.5px solid #eaeaea;
  border-right: 0.5px solid #eaeaea;
  vertical-align: middle;
}
/* 最右列去掉右边框，避免外缘出现多余竖线 */
.fund-table th:last-child,
.fund-table td:last-child { border-right: none; }
/* 斑马纹：奇数行用页面浅灰底，偶数行白底（仅保留细分割线） */
.fund-table tbody tr:nth-child(odd) { background: var(--bg-body); }
.fund-table tbody tr:nth-child(even) { background: #ffffff; }
/* 悬停高亮：整行统一浅蓝，规则见下方固定列背景之后（需高于斑马纹与偶数行白底特异性） */

.col-code { width: 80px; font-weight: 400; color: var(--text-primary); font-family: monospace; font-size: 12px; }
.col-code a { color: var(--text-primary); text-decoration: none; }
.col-code a:hover { color: var(--link); text-decoration: underline; }
/* 固定前四列：基金代码 / 基金简称 / 基金经理 / 二级分类（横向滚动时锁定）
   left 由 measureFrozenLefts() 按真实列宽动态写入 CSS 变量，禁止硬编码——
   硬编码与真实列宽的偏差会让滚动内容从列缝漏出 */
.fund-table th.col-code    { position: sticky; left: var(--fl-code, 0px);     z-index: 4; }
.fund-table th.col-name    { position: sticky; left: var(--fl-name, 80px);    z-index: 4; }
.fund-table th.col-manager { position: sticky; left: var(--fl-manager, 220px); z-index: 4; }
.fund-table th.col-t1      { position: sticky; left: var(--fl-t1, 298px);     z-index: 4; }
.fund-table td.col-code,
.fund-table td.col-name,
.fund-table td.col-manager,
.fund-table td.col-t1 { position: sticky; z-index: 2; background: var(--bg-body); }
.fund-table td.col-code    { left: var(--fl-code, 0px); }
.fund-table td.col-name    { left: var(--fl-name, 80px); }
.fund-table td.col-manager { left: var(--fl-manager, 220px); }
.fund-table td.col-t1      { left: var(--fl-t1, 298px); }
/* 固定区与滚动区之间的分界线（gov.uk 无阴影，用 2px 边框） */
.fund-table th.col-t1,
.fund-table td.col-t1 { border-right: 2px solid var(--border); }
/* 固定列背景必须不透明：斑马纹/悬停时同步，避免横向滚动透出下层文字 */
.fund-table tbody tr:nth-child(even) td.col-code,
.fund-table tbody tr:nth-child(even) td.col-name,
.fund-table tbody tr:nth-child(even) td.col-manager,
.fund-table tbody tr:nth-child(even) td.col-t1 { background: #ffffff; }
/* 悬停整行高亮：tr 与其所有 td 一起着色。
   特异性必须同时高于斑马纹(0,2,2) 与偶数行固定列白底(0,3,3)，
   否则只有奇数行左四列变蓝、右侧列不变。 */
.fund-table tbody tr.fund-row:hover,
.fund-table tbody tr.fund-row:hover > td { background: #d4e6fb !important; }
.col-name { width: 140px; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-name a { color: var(--text-primary); text-decoration: none; }
.col-name a:hover { color: var(--link); text-decoration: underline; }
.col-manager { width: 78px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-manager a { color: var(--text-secondary); text-decoration: none; }
.col-manager a:hover { color: var(--link); text-decoration: underline; }
.col-manager.sortable { cursor: pointer; user-select: none; }
.col-manager.sortable:hover { background: #e0e7ef; }
.col-scale { width: 74px; text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.col-scale.sortable { cursor: pointer; user-select: none; }
.col-scale.sortable:hover { background: #e0e7ef; }
.col-growth { width: 72px; text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.col-growth.sortable { cursor: pointer; user-select: none; }
.col-growth.sortable:hover { background: #e0e7ef; }
.col-num { width: 80px; text-align: right; color: var(--text-secondary); }
.col-pct { width: 60px; text-align: right; color: var(--text-secondary); }
.col-score { width: 70px; text-align: center; }
.col-score .score-val { font-weight: 700; font-size: 13px; }
.col-sort { background: #e8f0fe; }
.col-actions { width: 84px; text-align: center; }
.col-fee { width: 60px; text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.col-inst { width: 68px; text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.col-inst.sortable { cursor: pointer; user-select: none; }
.col-inst.sortable:hover { background: #e0e7ef; }
.col-t1 { width: 100px; color: var(--text-secondary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-ret { width: 90px; text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }

/* ===== 投资风格 / 概念·行业标签（2026-11-13，gov.uk 风格：无圆角/阴影/渐变） ===== */
.col-style { width: 84px; text-align: left; }
.col-tags { width: 156px; font-size: 12px; color: var(--text-secondary); }
.style-badge, .tag-badge {
  display: inline-block; padding: 1px 5px; margin: 1px 3px 1px 0;
  font-size: 11px; line-height: 1.5; font-weight: 700;
  border: 1px solid #1d70b8; color: #1d70b8; background: #fff; white-space: nowrap;
}
.style-badge { color: #fff; background: #1d70b8; }
.tag-badge.industry { border-color: #505a5f; color: #505a5f; }
.tag-more, .tag-empty { font-size: 12px; color: var(--text-secondary); }
.tag-more { cursor: help; }

/* 标签选择器：101 概念 + 85 行业，默认露出前 12 个，可搜索/展开 */
.tag-picker { flex: 1; min-width: 0; }
.tag-picker-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 0 8px; }
.tag-search {
  width: 130px; padding: 3px 6px; font-size: 13px; font-family: inherit;
  border: 1px solid var(--border); background: #fff; color: var(--text-primary);
}
.tag-toggle { font-size: 13px; color: var(--link); cursor: pointer; text-decoration: underline; }
.tag-chip-list { display: flex; flex-wrap: wrap; gap: 0; max-height: 72px; overflow: hidden; margin-top: 2px; }
.tag-chip-list.expanded { max-height: 190px; overflow-y: auto; }
.tag-selected { margin-top: 4px; font-size: 12px; color: var(--text-secondary); }
.col-ret.sortable { cursor: pointer; user-select: none; }
.col-ret.sortable:hover { background: #e0e7ef; }
/* 表头字号略缩，确保「近N年收益%」与排序三角形同处一列不被截断 */
.fund-table th.col-ret { font-size: 12px; }

/* ===== 移动端卡片布局 ===== */
.mobile-fund-list {
  border-top: 1px solid var(--border);
}

.fund-card {
  padding: var(--space-md); border-bottom: 1px solid var(--border);
  background: #fff;
}
.fund-card:active { background: #f3f2f1; }

.fund-card-top {
  display: flex; align-items: center; gap: var(--space-sm);
}
.fund-card-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 6px 0 2px; font-size: 12px; color: var(--text-secondary); }
.fund-card-tags .tag-line em { font-style: normal; font-weight: 700; color: #505a5f; margin-right: 4px; }

.fund-code {
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  font-family: monospace; flex-shrink: 0; min-width: 56px;
  text-decoration: none;
}
.fund-code:hover { color: var(--link); text-decoration: underline; }

.fund-name {
  flex: 1; font-size: 15px; font-weight: 700; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  min-width: 0; line-height: 1.4; text-decoration: none;
}
.fund-name:hover { color: var(--link); text-decoration: underline; }
/* 异常收益红标（gov.uk 风格：无圆角） */
.anom-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 4px;
  background: #d4351c;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  white-space: nowrap;
  vertical-align: middle;
  cursor: help;
}

.fund-card-mgr {
  font-size: 13px; color: var(--text-secondary);
  margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fund-card-mgr a { color: var(--text-secondary); text-decoration: none; }
.fund-card-mgr a:hover { color: var(--link); text-decoration: underline; }

.fund-card-scale {
  font-size: 13px; color: var(--text-secondary);
  margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.fund-card-ret {
  display: flex; flex-wrap: wrap; gap: 4px 14px;
  font-size: 12px; color: var(--text-secondary); margin-top: 4px;
}
.fund-card-ret span { font-weight: 700; }

.fund-card-actions {
  display: flex; align-items: center; gap: 2px; flex-shrink: 0;
}

.action-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; cursor: pointer; color: var(--text-muted);
}
.action-icon:active, .action-icon.active { color: #d4351c; }

.fund-card-scores {
  display: flex; gap: var(--space-sm); margin-top: 8px;
  flex-wrap: wrap;
}

.score-chip {
  display: flex; align-items: center; gap: 3px;
  padding: 3px 10px; border: 1px solid var(--border);
  background: #f8f8f8;
}

.score-chip-active {
  border-color: #1d70b8; background: #e8f0fe;
  box-shadow: inset 0 0 0 1px #1d70b8;
}

.chip-label {
  font-size: 11px; color: var(--text-secondary); font-weight: 400;
}

.chip-val {
  font-size: 14px; font-weight: 700;
}

/* 可排序表头 */
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { background: #e0e7ef; }
.th-arrow { font-size: 11px; margin-left: 3px; color: #1d70b8; }

/* 渐变色条图例 */
.gradient-legend { margin-top: 8px; }
.gradient-bar {
  height: 12px; border-radius: 6px;
  background: linear-gradient(to right,
    hsl(120, 85%, 45%),   /* 0分 绿 */
    hsl(90, 85%, 45%),    /* 25分 */
    hsl(60, 85%, 45%),    /* 50分 黄绿 */
    hsl(30, 85%, 45%),    /* 75分 橙 */
    hsl(0, 85%, 45%)      /* 100分 红 */
  );
}
.gradient-labels {
  display: flex; justify-content: space-between;
  margin-top: 6px; font-size: 11px; color: var(--text-secondary);
}

.action-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; cursor: pointer; color: var(--text-muted);
  vertical-align: middle; margin: 0 2px; position: relative;
}
.action-btn:hover { color: var(--brand); }
.action-btn.active { color: #d4351c; }
.action-add:hover { color: #00703c; }
.action-btn.fav.active, .action-icon.fav.active { color: #1d70b8; }
.action-count {
  position: absolute; top: -6px; right: -8px;
  font-size: 10px; line-height: 14px; padding: 0 3px;
  background: #d4351c; color: #fff; border-radius: 7px;
  font-weight: 700; min-width: 14px; text-align: center;
}
.action-count-sm {
  font-size: 9px; margin-left: 1px; color: #d4351c; font-weight: 700;
}

/* 加载更多 */
.load-more {
  text-align: center; padding: var(--space-lg);
  font-size: 16px; color: var(--link); cursor: pointer; text-decoration: underline;
}
.load-more:hover { background: #f3f2f1; }
.loaded-all {
  padding: var(--space-md); text-align: center; font-size: 14px; color: var(--text-secondary);
  border-top: 1px solid var(--border);
}
.loaded-all strong { color: #0b0c0c; font-weight: 700; }

/* 筛选操作行：更多筛选 + 评分指标 并列 */
.filter-actions-row {
  display: flex; align-items: center; gap: var(--space-md);
}

/* 显示周期选择器 */
.period-select-row {
  display: flex; align-items: center; gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: #f3f2f1;
  flex-wrap: wrap;
}
.period-tag {
  display: inline-block; padding: 4px 12px;
  font-size: 14px; color: var(--link);
  cursor: pointer; border: 1px solid var(--border);
  background: #fff;
}
.period-tag:hover { border-color: #1d70b8; }
.period-tag.active {
  color: #fff; background: #1d70b8; border-color: #1d70b8;
}
.period-select-dropdown {
  padding: 4px 28px 4px 10px; font-size: 14px;
  border: 2px solid #1d70b8; border-radius: 4px; color: var(--text-primary);
  background: #fff; cursor: pointer; margin-left: var(--space-xs);
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231d70b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
}
.period-select-dropdown:focus { outline: 3px solid #ffdd00; outline-offset: 0; }

/* 状态 */
.empty-state { text-align: center; padding: var(--space-2xl) var(--space-md); }
.empty-text { font-size: 19px; color: var(--text-primary); font-weight: 700; margin-bottom: var(--space-sm); }
.empty-hint { font-size: 16px; color: var(--text-secondary); }
.retry-hint { color: var(--link); cursor: pointer; text-decoration: underline; }
.loading-wrap { display: flex; justify-content: center; padding: var(--space-2xl) 0; }
.loading-text { font-size: 16px; color: var(--text-secondary); }

/* 底部 */
.bottom-info {
  display: flex; flex-direction: column; gap: 4px;
  padding: var(--space-xl) var(--space-md) var(--space-2xl);
  border-top: 1px solid var(--border); margin-top: var(--space-xl);
}
.bottom-line {
  margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6;
}
.bottom-warning {
  margin: 8px 0 0; font-size: 13px; color: #d4351c; line-height: 1.6; font-weight: 700;
}

/* 颜色 */
.ret-up { color: var(--color-up); }
.ret-down { color: var(--color-down); }

/* ===== 弹窗 ===== */
.mask { position: fixed; inset: 0; background: rgba(29,112,184,0.6); z-index: 100; }

/* 更多筛选弹窗 */
.more-modal {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100%; max-width: 560px; max-height: 82vh;
  background: #ffffff; border: 1px solid var(--border);
  display: flex; flex-direction: column; z-index: 101;
}
.more-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border);
  background: #f3f2f1; flex-shrink: 0;
}
.more-modal-title { font-size: 19px; font-weight: 700; color: var(--text-primary); }
.more-modal-close { font-size: 24px; color: var(--text-primary); cursor: pointer; padding: 4px; line-height: 1; }
.more-modal-body { flex: 1; overflow-y: auto; padding: var(--space-sm) 0; }
.more-modal-footer {
  display: flex; justify-content: flex-end; gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg); border-top: 1px solid var(--border);
  flex-shrink: 0; background: #ffffff;
}
.more-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: #1d70b8; color: #fff; font-size: 12px; font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.filter-scale-presets { display: flex; flex-wrap: wrap; gap: 0; flex: 1; }

.detail-panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100% - 32px); max-width: 600px; max-height: 88vh;
  background: #ffffff; border: 1px solid var(--border);
  overflow: hidden; display: flex; flex-direction: column; z-index: 101;
}
.detail-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border);
  background: #f3f2f1; flex-shrink: 0;
}
.detail-name { font-size: 19px; font-weight: 700; flex: 1; margin-right: var(--space-md); line-height: 1.3; }
.detail-close { font-size: 24px; color: var(--text-primary); cursor: pointer; padding: 4px; line-height: 1; }
.detail-body { flex: 1; overflow-y: auto; padding: var(--space-lg); }
.detail-section { margin-bottom: var(--space-xl); }
.detail-section-title {
  font-size: 19px; font-weight: 700; color: var(--text-primary);
  display: block; margin-bottom: var(--space-md);
  border-bottom: 2px solid var(--border); padding-bottom: 4px;
}
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); }
.section-source { font-size: 14px; color: var(--text-secondary); }
.attr-row { display: flex; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--border); }
.attr-label { font-size: 16px; color: var(--text-secondary); flex-shrink: 0; width: 80px; }
.attr-value { font-size: 16px; color: var(--text-primary); text-align: right; flex: 1; line-height: 1.4; }
.attr-date { font-size: 14px; color: var(--text-secondary); }

.detail-scores-grid {
  display: flex; justify-content: space-around; padding: var(--space-md);
  border: 1px solid var(--border);
}
.ds-item { display: flex; flex-direction: column; align-items: center; }
.ds-period { font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
.ds-score { font-size: 19px; font-weight: 700; }

.returns-grid { display: flex; flex-wrap: wrap; gap: var(--space-md); }
.return-col { display: flex; flex-direction: column; align-items: center; min-width: 70px; padding: var(--space-sm); border: 1px solid var(--border); }
.ret-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
.ret-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }

.risk-table { border: 1px solid var(--border); }
.risk-head { display: flex; padding: var(--space-sm); border-bottom: 2px solid var(--border); background: #f3f2f1; }
.risk-th { font-size: 14px; color: var(--text-secondary); font-weight: 700; }
.risk-row { display: flex; align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border); }
.risk-row:last-child { border-bottom: none; }
.risk-label { width: 60px; font-size: 14px; color: var(--text-secondary); flex-shrink: 0; font-weight: 700; }
.risk-val { flex: 1; text-align: center; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.risk-val.risk-high { color: #d4351c; }
.risk-val.risk-mid { color: #f47738; }
.risk-val.risk-low { color: #00703c; }

.detail-goto {
  display: block; text-align: center; padding: var(--space-md) 0 var(--space-sm);
  margin-top: var(--space-lg); border-top: 1px solid var(--border);
  font-size: 16px; color: var(--link); font-weight: 700; text-decoration: underline;
}

/* 帮助弹窗 */
.help-panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100% - 32px); max-width: 600px; max-height: 80vh;
  background: #ffffff; border: 1px solid var(--border);
  overflow: hidden; display: flex; flex-direction: column; z-index: 101;
}
.help-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border);
  background: #f3f2f1; flex-shrink: 0;
}
.help-title { font-size: 19px; font-weight: 700; color: var(--text-primary); }
.help-close { font-size: 24px; color: var(--text-primary); cursor: pointer; padding: 4px; line-height: 1; }
.help-body { flex: 1; overflow-y: auto; padding: var(--space-lg); }
.help-section { margin-bottom: var(--space-lg); }
.help-section-label { display: block; font-size: 19px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-sm); border-bottom: 2px solid var(--border); padding-bottom: 4px; }
.help-desc { display: block; font-size: 16px; color: var(--text-primary); line-height: 1.7; }
/* 评分指标弹窗 */
.score-indicator-modal {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 101;
  width: min(520px, 92vw); max-height: 80vh;
  background: #fff; border: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.score-indicator-modal .more-modal-body {
  padding: var(--space-md) var(--space-lg);
}
.score-tip {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-xs); flex-wrap: wrap;
}

.weight-sliders { display: flex; flex-direction: column; gap: var(--space-md); }
.weight-row { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-xs) 0; }
.weight-label { font-size: 15px; min-width: 90px; color: var(--text-primary); flex-shrink: 0; }
.weight-range { flex: 1; height: 8px; -webkit-appearance: none; background: #f3f2f1; outline: none; }
.weight-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #1d70b8; cursor: pointer; }
.weight-num { width: 56px; padding: 4px 6px; border: 1px solid var(--border); font-size: 15px; text-align: center; flex-shrink: 0; }
.weight-sum { font-size: 14px; margin-left: var(--space-sm); }
.weight-sum.valid { color: #00703c; }
.weight-sum.invalid { color: #d4351c; }

.btn-reset { padding: var(--space-xs) var(--space-lg); font-size: 14px; background: #f3f2f1; color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; }
.btn-confirm { padding: var(--space-xs) var(--space-lg); font-size: 14px; background: #00703c; color: #fff; border: none; cursor: pointer; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reset:hover { background: #e5e4e2; }

/* 分类源禁用 */
.filter-chip.disabled { color: var(--text-secondary); opacity: 0.5; cursor: not-allowed; }

/* ===== 组合选择器弹窗 ===== */
.picker-panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100% - 32px); max-width: 440px; max-height: 80vh;
  background: #ffffff; border: 2px solid #1d70b8;
  overflow: hidden; display: flex; flex-direction: column; z-index: 101;
}
.picker-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-lg); border-bottom: 2px solid var(--border);
  background: #f3f2f1; flex-shrink: 0;
}
.picker-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.picker-close { font-size: 24px; color: var(--text-primary); cursor: pointer; padding: 4px; line-height: 1; }
.picker-body { flex: 1; overflow-y: auto; padding: var(--space-lg); }
.picker-fund-name { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-sm); }
.picker-hint { font-size: 14px; color: var(--text-secondary); margin-bottom: var(--space-md); }
.picker-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.picker-item {
  display: flex; align-items: center; gap: var(--space-sm);
  width: 100%; padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border); background: #fff;
  cursor: pointer; text-align: left; font-size: 15px;
  color: var(--text-primary); font-weight: 600;
}
.picker-item:hover { border-color: #1d70b8; background: #e8f0fe; }
.picker-item-name { flex: 1; }
.picker-item-count { font-size: 13px; font-weight: 400; color: var(--text-secondary); }
.picker-empty { text-align: center; padding: var(--space-xl) 0; }
.picker-empty p { font-size: 16px; color: var(--text-secondary); margin: var(--space-xs) 0; }
.picker-empty-hint { font-size: 14px; color: var(--link); }
</style>
