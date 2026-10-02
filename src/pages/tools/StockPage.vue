<template>
  <div class="tool-placeholder">
    <div class="tool-placeholder__title">股票选品</div>
    <p class="tool-placeholder__desc">
      该功能正在开发中，敬请期待。后续将在此提供股票筛选、排序与对比等选品工具。
    </p>
  </div>
</template>

<script setup></script>

<style scoped>
.tool-placeholder {
  max-width: 720px;
  margin: 48px auto;
  padding: 40px 32px;
  text-align: center;
  background: #ffffff;
  border: 2px solid var(--border);
  border-left: 6px solid var(--brand);
}
.tool-placeholder__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}
.tool-placeholder__desc {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}
@media (max-width: 768px) {
  .tool-placeholder { margin: 24px 16px; padding: 28px 20px; }
}
</style>
