<template>
  <div class="page-selection">
    <!-- 二级 tab：基金 / 股票 / 指数 -->
    <nav class="selection-tabs" aria-label="选品分类">
      <router-link
        to="/tools/fund"
        class="selection-tab"
        :class="{ 'selection-tab--active': route.name === 'tools-fund' }"
      >基金</router-link>
      <router-link
        to="/tools/stock"
        class="selection-tab"
        :class="{ 'selection-tab--active': route.name === 'tools-stock' }"
      >股票</router-link>
      <router-link
        to="/tools/index"
        class="selection-tab"
        :class="{ 'selection-tab--active': route.name === 'tools-index' }"
      >指数</router-link>
    </nav>

    <router-view v-slot="{ Component }">
      <keep-alive :include="['FundRankPage']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
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
