<template>
  <div class="page-selection">
    <!-- 二级 tab：基金 / 股票 / 指数（按功能开关过滤显示） -->
    <nav class="selection-tabs" aria-label="选品分类">
      <router-link
        v-for="t in visibleToolTabs"
        :key="t.name"
        :to="t.to"
        class="selection-tab"
        :class="{ 'selection-tab--active': route.name === t.name }"
      >{{ t.label }}</router-link>
    </nav>

    <router-view v-slot="{ Component }">
      <keep-alive :include="['FundRankPage']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFeatureFlags } from '../../composables/useFeatureFlags'

const route = useRoute()
const { featureEnabled } = useFeatureFlags()

// 选品二级 tab：由功能开关（含父级 fund-rank）控制显隐
const toolTabs = [
  { to: '/tools/fund',       name: 'tools-fund',       label: '基金',     feature: 'fund-rank' },
  { to: '/tools/stock',      name: 'tools-stock',      label: '股票',     feature: 'tools-stock' },
  { to: '/tools/index',      name: 'tools-index',      label: '指数',     feature: 'tools-index' },
  { to: '/tools/fund-index', name: 'tools-fund-index', label: '基金指数', feature: 'tools-fund-index' },
  { to: '/tools/tougu',      name: 'tools-tougu',      label: '投顾产品', feature: 'tools-tougu' },
]
const visibleToolTabs = computed(() => toolTabs.filter(t => featureEnabled(t.feature)))
</script>

<style scoped>
.page-selection {
  width: 100%;
}
/* ========== 二级 tab（gov.uk 风格，蓝白配色、无圆角/阴影） ========== */
/* 窄屏自动折行，底线由每个 tab 自带 */
.selection-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  row-gap: 2px;
  margin-bottom: var(--space-md);
}
.selection-tab {
  display: inline-block;
  padding: 12px 28px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 4px solid var(--border);
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.selection-tab:hover {
  color: var(--brand);
  background: #f8f8f8;
}
.selection-tab--active {
  color: var(--brand);
  border-bottom-color: var(--brand);
}
@media (max-width: 768px) {
  .selection-tab {
    padding: 10px 16px;
    font-size: 15px;
  }
}
</style>
