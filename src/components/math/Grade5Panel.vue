<template>
  <div class="g5">
    <!-- 24 讲列表 -->
    <div class="g5-nav">
      <div
        v-for="lec in data"
        :key="lec.n"
        class="g5-nav-item"
        :class="{ active: cur === lec.n }"
        @click="cur = lec.n"
      >
        <span class="g5-nav-n">第{{ lec.n }}讲</span>
        <span class="g5-nav-t">{{ lec.title }}</span>
      </div>
    </div>

    <!-- 讲内容 -->
    <div v-if="lec" class="g5-body">
      <div class="g5-head">
        <h3 class="g5-title">第{{ lec.n }}讲 {{ lec.title }}</h3>
        <span class="g5-topic">{{ lec.topic }}</span>
      </div>

      <p class="g5-intro">{{ lec.intro }}</p>

      <div v-if="lec.points" class="g5-points">
        <div class="g5-sec">要点</div>
        <ul>
          <li v-for="(p, i) in lec.points" :key="i">{{ p }}</li>
        </ul>
      </div>

      <div v-if="lec.formulas" class="g5-formulas">
        <div class="g5-sec">公式</div>
        <div v-for="(f, i) in lec.formulas" :key="i" class="g5-formula">
          <code class="g5-f">{{ f.f }}</code>
          <span class="g5-fd">{{ f.d }}</span>
        </div>
      </div>

      <!-- 三档：兴趣 / 拓展 / 超越 -->
      <div class="g5-levels">
        <div
          v-for="lv in lec.levels"
          :key="lv.lv"
          class="g5-lv"
          :class="'g5-lv--' + LVKEY[lv.lv]"
        >
          <div class="g5-lv-head">
            <span class="g5-lv-name">{{ lv.lv }}</span>
            <span class="g5-lv-star">{{ '★'.repeat(lv.star) }}</span>
            <button class="g5-toggle" @click="toggle(lec.n + '-' + lv.lv)">
              {{ opened[lec.n + '-' + lv.lv] ? '收起' : '看解答' }}
            </button>
          </div>
          <div class="g5-q">{{ lv.q }}</div>
          <div v-if="opened[lec.n + '-' + lv.lv]" class="g5-a">
            <p><strong>思路：</strong>{{ lv.idea }}</p>
            <p v-if="lv.steps"><strong>步骤：</strong></p>
            <ul v-if="lv.steps">
              <li v-for="(s, i) in lv.steps" :key="i">{{ s }}</li>
            </ul>
            <p v-if="lv.check" class="g5-check"><strong>验算：</strong>{{ lv.check }}</p>
            <p class="g5-ans"><strong>答：</strong>{{ lv.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 小学奥数通用年级面板 —— 支持机构维度（inst）× 年级（grade）。
 * 每讲含「兴趣篇 / 拓展篇 / 超越篇」三档。
 * 各机构使用各自独立的知识点体系（严禁复用高斯内容）：
 *   - gaosi：高思导引体系（grade3Data.js ~ grade6Data.js）
 *   - mogu / mc / ledu：各自独立课程体系的 data 模块（moguData.js / mcData.js / leduData.js）
 * 公式口径见 mathCore.js（有单元测试 + 暴力对拍）。
 */
import { ref, computed, watch } from 'vue'
import gaosiData from './gaosiData.js'
import moguData from './moguData.js'
import mcData from './mcData.js'
import leduData from './leduData.js'

const props = defineProps({
  grade: { type: String, default: 'g5' },
  inst: { type: String, default: 'gaosi' },
})

// 各机构独立的年级数据（每个机构一份，互不共用）
const REGISTRY = { gaosi: gaosiData, mogu: moguData, mc: mcData, ledu: leduData }

const LVKEY = { 兴趣篇: 'a', 拓展篇: 'b', 超越篇: 'c' }

const gradeData = computed(() => REGISTRY[props.inst] || gaosiData)
const data = computed(() => gradeData.value[props.grade] || gaosiData.g5)
const cur = ref(1)
const opened = ref({})
// ⚠️ 用 computed 而非普通函数：模板里直接 lec.xxx 访问
const lec = computed(() => data.value.find((l) => l.n === cur.value) || data.value[0])

// 切换机构或年级时重置到第 1 讲，避免停留在越界讲号上
watch(() => [props.inst, props.grade], () => { cur.value = 1; opened.value = {} })

function toggle(key) {
  opened.value[key] = !opened.value[key]
}
</script>

<style scoped>
.g5 { user-select: none; }
.g5-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 4px;
  margin-bottom: 16px;
}
.g5-nav-item {
  border: 1px solid #b1b4b6;
  background: #fff;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.g5-nav-item:hover { background: #e6f1fb; }
.g5-nav-item.active { background: #1d70b8; border-color: #1d70b8; }
.g5-nav-n { font-size: 11px; color: var(--text-tertiary); }
.g5-nav-item.active .g5-nav-n { color: rgba(255,255,255,0.8); }
.g5-nav-t { font-size: 13px; color: #1d70b8; line-height: 1.4; }
.g5-nav-item.active .g5-nav-t { color: #fff; font-weight: 700; }

.g5-body { border-top: 2px solid #1d70b8; padding-top: 14px; }
.g5-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; flex-wrap: wrap;
}
.g5-title { margin: 0; font-size: 18px; font-weight: 700; color: #0b0c0c; }
.g5-topic {
  font-size: 12px; padding: 2px 8px;
  border: 1px solid #1d70b8; color: #1d70b8;
}
.g5-intro {
  margin: 0 0 12px; font-size: 14px;
  color: var(--text-secondary); line-height: 1.7;
}
.g5-sec {
  font-size: 13px; font-weight: 700; color: #1d70b8; margin-bottom: 6px;
}
.g5-points {
  background: #f3f2f1; padding: 10px 12px; margin-bottom: 12px;
  border-left: 3px solid #5f5e5a;
}
.g5-points ul { margin: 0; padding-left: 20px; }
.g5-points li { font-size: 13px; line-height: 1.8; color: var(--text-secondary); }
.g5-formulas {
  background: #f3f2f1; padding: 10px 12px; margin-bottom: 12px;
  border-left: 3px solid #1d70b8;
}
.g5-formula { margin-bottom: 8px; }
.g5-formula:last-child { margin-bottom: 0; }
.g5-f {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; font-weight: 700; color: #0b0c0c;
  background: #fff; padding: 2px 8px; margin-bottom: 3px;
}
.g5-fd {
  display: block; font-size: 13px; color: var(--text-secondary); line-height: 1.6;
}

.g5-levels { display: flex; flex-direction: column; gap: 10px; }
.g5-lv { border: 1px solid #b1b4b6; padding: 10px 12px; }
.g5-lv--a { border-left: 4px solid #00703c; }
.g5-lv--b { border-left: 4px solid #b58800; }
.g5-lv--c { border-left: 4px solid #d4351c; }
.g5-lv-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 6px; flex-wrap: wrap;
}
.g5-lv-name { font-size: 14px; font-weight: 700; }
.g5-lv--a .g5-lv-name { color: #00703c; }
.g5-lv--b .g5-lv-name { color: #b58800; }
.g5-lv--c .g5-lv-name { color: #d4351c; }
.g5-lv-star { font-size: 12px; color: #b58800; letter-spacing: 1px; }
.g5-toggle {
  margin-left: auto;
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 4px 12px; font-size: 12px; font-weight: 700; cursor: pointer;
}
.g5-toggle:hover { background: #e6f1fb; }
.g5-q { font-size: 14px; line-height: 1.7; color: var(--text-primary); }
.g5-a {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px dashed #b1b4b6;
  font-size: 14px; line-height: 1.8; color: var(--text-primary);
}
.g5-a p { margin: 0 0 6px; }
.g5-a ul { margin: 0 0 6px; padding-left: 22px; }
.g5-a li { margin-bottom: 3px; }
.g5-check { color: var(--text-secondary); font-size: 13px; }
.g5-ans { color: #00703c; font-weight: 700; }
</style>
