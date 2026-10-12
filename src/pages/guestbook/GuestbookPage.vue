<template>
  <div class="guestbook-page govuk-width-container">
    <h1 class="govuk-heading-l">留言板</h1>
    <p class="govuk-body">
      欢迎留言，分享观点、建议或遇到的问题。所有留言仅代表个人观点，不构成投资建议。
    </p>

    <div class="guestbook-form">
      <div class="govuk-form-group">
        <label class="govuk-label" for="guestbook-name">昵称</label>
        <input
          id="guestbook-name"
          v-model="form.name"
          class="govuk-input"
          type="text"
          maxlength="30"
          placeholder="怎么称呼你"
        />
      </div>
      <div class="govuk-form-group">
        <label class="govuk-label" for="guestbook-content">留言内容</label>
        <textarea
          id="guestbook-content"
          v-model="form.content"
          class="govuk-textarea"
          rows="4"
          maxlength="500"
          placeholder="写下你的想法..."
        ></textarea>
        <div class="govuk-hint">{{ form.content.length }}/500 字</div>
      </div>
      <button
        class="govuk-button"
        :disabled="submitting || !form.content.trim()"
        @click="submitMessage"
      >
        {{ submitting ? '提交中...' : '提交留言' }}
      </button>
    </div>

    <h2 class="govuk-heading-m">全部留言</h2>
    <div v-if="loading" class="govuk-body">加载中...</div>
    <div v-else-if="messages.length === 0" class="govuk-body">
      暂无留言，来做第一个留言的人吧。
    </div>
    <ul v-else class="guestbook-list">
      <li v-for="m in messages" :key="m.id" class="guestbook-item">
        <div class="guestbook-item__header">
          <strong>{{ m.name || '匿名' }}</strong>
          <span class="guestbook-item__time">{{ formatTime(m.created_at) }}</span>
        </div>
        <p class="guestbook-item__content">{{ m.content }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../../api/supabase.js'

const messages = ref([])
const loading = ref(false)
const submitting = ref(false)
const form = reactive({ name: '', content: '' })

async function loadMessages() {
  loading.value = true
  const { data, error } = await supabase
    .from('guestbook_messages')
    .select('id, name, content, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  loading.value = false
  if (error) {
    console.error('load guestbook messages error:', error)
    return
  }
  messages.value = data || []
}

async function submitMessage() {
  const name = form.name.trim() || '匿名'
  const content = form.content.trim()
  if (!content) return
  if (content.length > 500) {
    alert('留言内容不能超过 500 字')
    return
  }

  submitting.value = true
  const { error } = await supabase
    .from('guestbook_messages')
    .insert({ name, content })
  submitting.value = false

  if (error) {
    console.error('submit guestbook message error:', error)
    alert('提交失败，请稍后再试')
    return
  }

  form.content = ''
  form.name = ''
  await loadMessages()
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadMessages)
</script>

<style scoped>
.govuk-width-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 30px 20px;
}
.govuk-heading-l {
  font-size: 36px;
  line-height: 1.2;
  margin-bottom: 20px;
  color: #0b0c0c;
}
.govuk-heading-m {
  font-size: 24px;
  line-height: 1.2;
  margin: 30px 0 15px;
  color: #0b0c0c;
}
.govuk-body {
  font-size: 17px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #0b0c0c;
}
.govuk-form-group {
  margin-bottom: 20px;
}
.govuk-label {
  display: block;
  margin-bottom: 5px;
  font-weight: 700;
  font-size: 16px;
  color: #0b0c0c;
}
.govuk-input,
.govuk-textarea {
  width: 100%;
  padding: 8px;
  border: 2px solid #0b0c0c;
  font-size: 16px;
  font-family: inherit;
  box-sizing: border-box;
  border-radius: 0;
}
.govuk-textarea {
  resize: vertical;
}
.govuk-hint {
  font-size: 14px;
  color: #505a5f;
  margin-top: 5px;
}
.govuk-button {
  background: #1d70b8;
  color: #fff;
  border: 0;
  padding: 10px 20px;
  font-size: 17px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 0;
}
.govuk-button:hover {
  background: #155389;
}
.govuk-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.guestbook-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.guestbook-item {
  border-bottom: 1px solid #b1b4b6;
  padding: 20px 0;
}
.guestbook-item__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  gap: 12px;
}
.guestbook-item__time {
  color: #505a5f;
  font-size: 14px;
  white-space: nowrap;
}
.guestbook-item__content {
  white-space: pre-wrap;
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: #0b0c0c;
  word-break: break-word;
}
@media (max-width: 640px) {
  .guestbook-item__header {
    flex-direction: column;
    gap: 4px;
  }
  .guestbook-item__time {
    white-space: normal;
  }
}
</style>
