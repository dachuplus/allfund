<template>
  <div class="eng">
    <!-- 课程头部 -->
    <div class="eng-head">
      <h3 class="eng-name">{{ course.name }}</h3>
      <div class="eng-meta">
        <span class="eng-pub">{{ course.publisher }}</span>
        <span class="eng-cefr">{{ course.cefr }}</span>
      </div>
    </div>

    <!-- 课程概述：框架 / 特点 / 价值 -->
    <div class="eng-overview">
      <div class="eng-sec">课程框架</div>
      <p class="eng-framework">{{ course.framework }}</p>

      <div class="eng-sec">课程特点</div>
      <ul class="eng-features">
        <li v-for="(f, i) in course.features" :key="i">{{ f }}</li>
      </ul>

      <div class="eng-sec">对小朋友的价值</div>
      <p class="eng-value">{{ course.value }}</p>
    </div>

    <!-- 级别子 tab -->
    <div class="eng-levels-nav">
      <div
        v-for="lv in course.levels"
        :key="lv.key"
        class="eng-level-tab"
        :class="{ active: cur === lv.key }"
        @click="cur = lv.key"
      >
        {{ lv.label }}
      </div>
    </div>

    <!-- 选中级别详情 -->
    <div v-if="level" class="eng-level-body">
      <div class="eng-level-head">
        <h4 class="eng-level-title">{{ level.label }}</h4>
        <span class="eng-level-cefr">{{ level.cefr }}</span>
      </div>
      <p class="eng-level-framework">{{ level.framework }}</p>

      <div class="eng-sec">文章目录</div>
      <table class="eng-units">
        <thead>
          <tr>
            <th class="eng-u-n">序号</th>
            <th class="eng-u-theme">主题</th>
            <th class="eng-u-read">阅读篇目</th>
            <th class="eng-u-write">写作任务</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in level.units" :key="u.n">
            <td class="eng-u-n">{{ u.n }}</td>
            <td class="eng-u-theme">{{ u.theme }}</td>
            <td class="eng-u-read">{{ u.reading }}</td>
            <td class="eng-u-write">{{ u.writing }}</td>
          </tr>
        </tbody>
      </table>

      <div class="eng-reqs">
        <div class="eng-req-block">
          <div class="eng-sec">阅读要求</div>
          <ul class="eng-req">
            <li v-for="(r, i) in level.readingReq" :key="i">{{ r }}</li>
          </ul>
        </div>
        <div class="eng-req-block">
          <div class="eng-sec">写作要求</div>
          <ul class="eng-req">
            <li v-for="(r, i) in level.writingReq" :key="i">{{ r }}</li>
          </ul>
        </div>
      </div>

      <p v-if="course.note" class="eng-note">{{ course.note }}</p>
    </div>
  </div>
</template>

<script setup>
/**
 * 英文课程面板 —— 按课程（inst）展示课程体系。
 * 数据来自 engData.js（公开资料整理的参考框架，含 disclaimer，不含评级/推荐/导流）。
 * 结构：课程头部（名称/出版方/CEFR）→ 课程概述（框架/特点/价值）
 *      → 级别子 tab（levels[]）→ 选中级别（框架 + 文章目录表 + 阅读要求 + 写作要求）。
 */
import { ref, computed, watch } from 'vue'
import { ENG } from './engData.js'

const props = defineProps({
  inst: { type: String, default: 'unlock' },
})

const course = computed(() => ENG[props.inst] || ENG.unlock)
const cur = ref(course.value.levels[0]?.key || '')
const level = computed(
  () => course.value.levels.find((l) => l.key === cur.value) || course.value.levels[0]
)

// 切换课程时重置到该课程第一个级别
watch(
  () => props.inst,
  () => { cur.value = course.value.levels[0]?.key || '' }
)
</script>

<style scoped>
.eng { user-select: none; }
.eng-head {
  display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
  border-bottom: 2px solid #1d70b8; padding-bottom: 10px; margin-bottom: 14px;
}
.eng-name { margin: 0; font-size: 18px; font-weight: 700; color: #0b0c0c; }
.eng-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.eng-pub { font-size: 13px; color: var(--text-secondary); }
.eng-cefr {
  font-size: 12px; padding: 2px 8px;
  border: 1px solid #1d70b8; color: #1d70b8;
}

.eng-overview { margin-bottom: 16px; }
.eng-sec {
  font-size: 13px; font-weight: 700; color: #1d70b8;
  margin: 12px 0 6px;
}
.eng-framework {
  margin: 0; font-size: 14px; line-height: 1.8;
  color: var(--text-secondary);
}
.eng-features { margin: 0; padding-left: 20px; }
.eng-features li {
  font-size: 13px; line-height: 1.8; color: var(--text-secondary);
}
.eng-value {
  margin: 0; font-size: 14px; line-height: 1.8;
  color: var(--text-primary);
  background: #f3f2f1; padding: 10px 12px;
  border-left: 3px solid #5f5e5a;
}

.eng-levels-nav {
  display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px;
}
.eng-level-tab {
  border: 1px solid #b1b4b6;
  background: #fff;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px; color: #1d70b8;
}
.eng-level-tab:hover { background: #e6f1fb; }
.eng-level-tab.active {
  background: #1d70b8; border-color: #1d70b8; color: #fff; font-weight: 700;
}

.eng-level-body { border-top: 2px solid #1d70b8; padding-top: 14px; }
.eng-level-head {
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  margin-bottom: 8px;
}
.eng-level-title { margin: 0; font-size: 16px; font-weight: 700; color: #0b0c0c; }
.eng-level-cefr {
  font-size: 12px; padding: 2px 8px;
  border: 1px solid #1d70b8; color: #1d70b8;
}
.eng-level-framework {
  margin: 0 0 12px; font-size: 14px; line-height: 1.7;
  color: var(--text-secondary);
}

.eng-units {
  width: 100%; border-collapse: collapse; margin-bottom: 14px;
  font-size: 13px;
}
.eng-units th, .eng-units td {
  border: 1px solid #b1b4b6;
  padding: 6px 8px; text-align: left; vertical-align: top;
}
.eng-units th { background: #1d70b8; color: #fff; font-weight: 700; }
.eng-units tbody tr:nth-child(even) { background: #f3f2f1; }
.eng-u-n { width: 44px; text-align: center; white-space: nowrap; }
.eng-u-theme { width: 22%; font-weight: 700; color: #0b0c0c; }
.eng-u-read { width: 37%; color: var(--text-secondary); }
.eng-u-write { width: 37%; color: var(--text-secondary); }

.eng-reqs { display: flex; gap: 16px; flex-wrap: wrap; }
.eng-req-block { flex: 1; min-width: 260px; }
.eng-req { margin: 0; padding-left: 20px; }
.eng-req li {
  font-size: 13px; line-height: 1.8; color: var(--text-secondary);
}

.eng-note {
  margin: 14px 0 0; font-size: 12px; line-height: 1.7;
  color: var(--text-tertiary);
  border-top: 1px dashed #b1b4b6; padding-top: 10px;
}
</style>
