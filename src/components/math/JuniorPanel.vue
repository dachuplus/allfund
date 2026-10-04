<template>
  <div class="js">
    <div class="js-note">
      <strong>依据：</strong>乔一鹏《初中数学竞赛辅导与练习·初中数学方法80讲》（上海交通大学出版社，依据上海二期课改新教材教学进度，初中六、七年级）——
      本书是<strong>方法论</strong>教材，80 讲中「化归」出现 9 次、「方程思想」9 次，与小学奥数（高斯导引，知识点体系）恰好互补。
      另参考小蓝书《数学奥林匹克小丛书·初中卷》分册结构。
    </div>

    <!-- 板块导航 -->
    <div class="js-cats">
      <div
        v-for="c in JUNIOR"
        :key="c.key"
        class="js-cat"
        :class="{ active: cat === c.key }"
        @click="cat = c.key"
      >{{ c.label }}<span class="js-cat-n">{{ c.topics.length }}</span></div>
    </div>

    <div v-if="cur" class="js-body">
      <div class="js-head">
        <h3 class="js-title">{{ cur.label }}</h3>
        <span class="js-topic">{{ cur.topic }}</span>
      </div>
      <p class="js-intro">{{ cur.intro }}</p>

      <div v-for="t in cur.topics" :key="t.title" class="js-card">
        <div class="js-card-head">
          <h4 class="js-card-title">{{ t.title }}</h4>
          <span class="js-level" :class="'js-level--' + t.level">{{ LEVEL_LABEL[t.level] }}</span>
        </div>

        <p class="js-summary">{{ t.summary }}</p>

        <div v-if="t.formulas" class="js-formulas">
          <div class="js-sec">公式</div>
          <div v-for="(f, i) in t.formulas" :key="i" class="js-formula">
            <code class="js-f">{{ f.f }}</code>
            <span class="js-fd">{{ f.d }}</span>
          </div>
        </div>

        <div v-if="t.points" class="js-points">
          <div class="js-sec">要点</div>
          <ul>
            <li v-for="(p, i) in t.points" :key="i">{{ p }}</li>
          </ul>
        </div>

        <div class="js-example">
          <div class="js-q"><span class="js-tag">例题</span>{{ t.example.q }}</div>
          <button class="js-toggle" @click="toggle(t.title)">
            {{ opened[t.title] ? '收起解答' : '看解答' }}
          </button>
          <div v-if="opened[t.title]" class="js-a">
            <p><strong>思路：</strong>{{ t.example.idea }}</p>
            <p v-if="t.example.steps"><strong>步骤：</strong></p>
            <ul v-if="t.example.steps">
              <li v-for="(s, i) in t.example.steps" :key="i">{{ s }}</li>
            </ul>
            <p v-if="t.example.note" class="js-check"><strong>验算/说明：</strong>{{ t.example.note }}</p>
            <p class="js-ans"><strong>答：</strong>{{ t.example.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 初联（初中联赛 · 上海六年级）知识点库。
 * 数据见 juniorData.js，公式见 juniorCore.js（有单元测试 + 暴力对拍）。
 */
import { ref, computed } from 'vue'
import { JUNIOR } from './juniorData.js'

const LEVEL_LABEL = { 1: '基础', 2: '拓展', 3: '挑战' }

const cat = ref('huigui')
const opened = ref({})
// 用 computed 而非普通函数：模板里直接 cur.xxx 访问
const cur = computed(() => JUNIOR.find((c) => c.key === cat.value) || JUNIOR[0])

function toggle(title) {
  opened.value[title] = !opened.value[title]
}
</script>

<style scoped>
.js { user-select: none; }
.js-note {
  background: #f3f2f1;
  border-left: 3px solid #1d70b8;
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
}
.js-note strong { color: #1d70b8; }

.js-cats {
  display: flex; flex-wrap: wrap;
  border: 1px solid #b1b4b6;
  margin-bottom: 14px;
}
.js-cat {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #1d70b8;
  background: #fff;
  border-right: 1px solid #b1b4b6;
  white-space: nowrap;
}
.js-cat:last-child { border-right: none; }
.js-cat:hover { background: #e6f1fb; }
.js-cat.active { background: #1d70b8; color: #fff; font-weight: 700; }
.js-cat-n {
  display: inline-block; margin-left: 6px;
  font-size: 12px; color: inherit; opacity: 0.75;
}

.js-body { border-top: 2px solid #1d70b8; padding-top: 14px; }
.js-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; flex-wrap: wrap;
}
.js-title { margin: 0; font-size: 17px; font-weight: 700; color: #0b0c0c; }
.js-topic {
  font-size: 12px; padding: 2px 8px;
  border: 1px solid #1d70b8; color: #1d70b8;
}
.js-intro {
  margin: 0 0 14px; font-size: 14px;
  color: var(--text-secondary); line-height: 1.7;
}

.js-card {
  border: 1px solid #b1b4b6;
  border-left: 4px solid #1d70b8;
  padding: 12px 14px; margin-bottom: 12px; background: #fff;
}
.js-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 6px; flex-wrap: wrap;
}
.js-card-title { margin: 0; font-size: 15px; font-weight: 700; color: #0b0c0c; }
.js-level { font-size: 12px; font-weight: 700; padding: 2px 8px; border: 1px solid; }
.js-level--1 { color: #00703c; border-color: #00703c; }
.js-level--2 { color: #b58800; border-color: #b58800; }
.js-level--3 { color: #d4351c; border-color: #d4351c; }
.js-summary { margin: 0 0 10px; font-size: 14px; color: var(--text-primary); line-height: 1.7; }

.js-sec { font-size: 13px; font-weight: 700; color: #1d70b8; margin-bottom: 6px; }
.js-formulas {
  background: #f3f2f1; padding: 10px 12px; margin-bottom: 10px;
  border-left: 3px solid #1d70b8;
}
.js-formula { margin-bottom: 8px; }
.js-formula:last-child { margin-bottom: 0; }
.js-f {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; font-weight: 700; color: #0b0c0c;
  background: #fff; padding: 2px 8px; margin-bottom: 3px;
}
.js-fd { display: block; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.js-points {
  background: #f3f2f1; padding: 10px 12px; margin-bottom: 10px;
  border-left: 3px solid #5f5e5a;
}
.js-points ul { margin: 0; padding-left: 20px; }
.js-points li { font-size: 13px; line-height: 1.8; color: var(--text-secondary); }

.js-example {
  background: #f3f2f1; padding: 10px 12px;
  border-left: 3px solid #5f5e5a;
}
.js-q { font-size: 14px; line-height: 1.7; margin-bottom: 8px; }
.js-tag {
  display: inline-block; margin-right: 8px;
  background: #1d70b8; color: #fff;
  font-size: 11px; font-weight: 700; padding: 1px 6px;
}
.js-toggle {
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 5px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.js-toggle:hover { background: #e6f1fb; }
.js-a {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px dashed #b1b4b6;
  font-size: 14px; line-height: 1.8; color: var(--text-primary);
}
.js-a p { margin: 0 0 6px; }
.js-a ul { margin: 0 0 6px; padding-left: 22px; }
.js-a li { margin-bottom: 3px; }
.js-check { color: var(--text-secondary); font-size: 13px; }
.js-ans { color: #00703c; font-weight: 700; }
</style>
