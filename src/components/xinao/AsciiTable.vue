<template>
  <div class="ascii-table">
    <h2 class="ascii-title">ASCII 码表</h2>
    <p class="ascii-intro">
      ASCII（American Standard Code for Information Interchange，美国信息交换标准代码）共定义
      <strong>128</strong> 个字符：<strong>0–31</strong> 与 <strong>127</strong> 为控制字符（共 33 个，不可显示），
      <strong>32–126</strong> 为可显示字符（共 95 个）。下表同时列出扩展部分
      <strong>128–255</strong>（Latin-1 补充，依赖代码页）。可按十进制 / 十六进制 / 字符 / 说明检索。
    </p>

    <div class="ascii-toolbar">
      <input
        v-model="keyword"
        class="ascii-search"
        type="text"
        placeholder="检索：十进制 / 十六进制 / 字符 / 说明"
        @input="onInput"
      />
      <label class="ascii-toggle">
        <input type="checkbox" v-model="onlyControl" @change="apply" />
        仅显示控制字符
      </label>
      <span class="ascii-count">共 {{ filtered.length }} 条</span>
    </div>

    <div class="ascii-scroll">
      <table class="ascii-grid">
        <thead>
          <tr>
            <th>十进制</th>
            <th>十六进制</th>
            <th>八进制</th>
            <th>二进制</th>
            <th>字符</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.dec"
            :class="{ 'is-control': row.kind === 'control', 'is-ext': row.kind === 'ext' }"
          >
            <td class="num">{{ row.dec }}</td>
            <td class="num">{{ row.hex }}</td>
            <td class="num">{{ row.oct }}</td>
            <td class="num mono">{{ row.bin }}</td>
            <td class="chr">{{ row.display }}</td>
            <td class="desc">{{ row.desc }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="ascii-empty">没有匹配的结果</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="ascii-note">
      说明：控制字符的「字符」列显示其标准缩写（如 NUL / SOH / ESC）；可显示字符显示实际符号；
      空格（32）以 ␠ 标记。扩展区 128–159 为 C1 控制字符，160–255 为 Latin-1 可显示字符。
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 0–31 与 127 控制字符的标准缩写与中文说明
const CONTROL = {
  0: ['NUL', '空字符（Null）'],
  1: ['SOH', '标题开始（Start of Heading）'],
  2: ['STX', '正文开始（Start of Text）'],
  3: ['ETX', '正文结束（End of Text）'],
  4: ['EOT', '传输结束（End of Transmission）'],
  5: ['ENQ', '请求（Enquiry）'],
  6: ['ACK', '确认（Acknowledgment）'],
  7: ['BEL', '响铃（Bell）'],
  8: ['BS', '退格（Backspace）'],
  9: ['HT', '水平制表符（Horizontal Tab）'],
  10: ['LF', '换行（Line Feed）'],
  11: ['VT', '垂直制表符（Vertical Tab）'],
  12: ['FF', '换页（Form Feed）'],
  13: ['CR', '回车（Carriage Return）'],
  14: ['SO', '移出（Shift Out）'],
  15: ['SI', '移入（Shift In）'],
  16: ['DLE', '数据链路转义（Data Link Escape）'],
  17: ['DC1', '设备控制 1（Device Control 1，XON）'],
  18: ['DC2', '设备控制 2（Device Control 2）'],
  19: ['DC3', '设备控制 3（Device Control 3，XOFF）'],
  20: ['DC4', '设备控制 4（Device Control 4）'],
  21: ['NAK', '拒绝接收（Negative Acknowledge）'],
  22: ['SYN', '同步空闲（Synchronous Idle）'],
  23: ['ETB', '传输块结束（End of Transmission Block）'],
  24: ['CAN', '取消（Cancel）'],
  25: ['EM', '介质结束（End of Medium）'],
  26: ['SUB', '替换（Substitute）'],
  27: ['ESC', '转义（Escape）'],
  28: ['FS', '文件分隔符（File Separator）'],
  29: ['GS', '组分隔符（Group Separator）'],
  30: ['RS', '记录分隔符（Record Separator）'],
  31: ['US', '单元分隔符（Unit Separator）'],
  127: ['DEL', '删除（Delete）'],
}

// 160–255 Latin-1 补充字符名称（128–159 为 C1 控制字符，统一标注）
const EXT_LATIN1 = {
  160: '不换行空格', 161: '倒置感叹号', 162: '美分符号', 163: '英镑符号', 164: '通用货币符号',
  165: '日元符号', 166: '断竖线', 167: '小节符号', 168: '分音符', 169: '版权符号',
  170: '阴性序数记号', 171: '左双尖引号', 172: '逻辑非', 173: '软连字符', 174: '注册商标符号',
  175: '长音符号', 176: '度数符号', 177: '加减号', 178: '上标二', 179: '上标三',
  180: '尖音符', 181: '微符号', 182: '段落符号', 183: '间隔号（中点）', 184: '下加符',
  185: '上标一', 186: '阳性序数记号', 187: '右双尖引号', 188: '四分之一', 189: '二分之一',
  190: '四分之三', 191: '倒置问号', 192: 'À 大写 A 带抑扬符', 193: 'Á 大写 A 带尖音符',
  194: 'Â 大写 A 带扬抑符', 195: 'Ã 大写 A 带波浪号', 196: 'Ä 大写 A 带分音符',
  197: 'Å 大写 A 带上圆圈', 198: 'Æ 大写 AE', 199: 'Ç 大写 C 下加符', 200: 'È 大写 E 带抑扬符',
  201: 'É 大写 E 带尖音符', 202: 'Ê 大写 E 带扬抑符', 203: 'Ë 大写 E 带分音符',
  204: 'Ì 大写 I 带抑扬符', 205: 'Í 大写 I 带尖音符', 206: 'Î 大写 I 带扬抑符',
  207: 'Ï 大写 I 带分音符', 208: 'Ð 大写 ETH', 209: 'Ñ 大写 N 带波浪号', 210: 'Ò 大写 O 带抑扬符',
  211: 'Ó 大写 O 带尖音符', 212: 'Ô 大写 O 带扬抑符', 213: 'Õ 大写 O 带波浪号',
  214: 'Ö 大写 O 带分音符', 215: '乘号', 216: 'Ø 大写 O 带斜杠', 217: 'Ù 大写 U 带抑扬符',
  218: 'Ú 大写 U 带尖音符', 219: 'Û 大写 U 带扬抑符', 220: 'Ü 大写 U 带分音符',
  221: 'Ý 大写 Y 带尖音符', 222: 'Þ 大写 Thorn', 223: 'ß 德语清音 S', 224: 'à 小写 a 带抑扬符',
  225: 'á 小写 a 带尖音符', 226: 'â 小写 a 带扬抑符', 227: 'ã 小写 a 带波浪号',
  228: 'ä 小写 a 带分音符', 229: 'å 小写 a 带上圆圈', 230: 'æ 小写 ae', 231: 'ç 小写 c 下加符',
  232: 'è 小写 e 带抑扬符', 233: 'é 小写 e 带尖音符', 234: 'ê 小写 e 带扬抑符',
  235: 'ë 小写 e 带分音符', 236: 'ì 小写 i 带抑扬符', 237: 'í 小写 i 带尖音符',
  238: 'î 小写 i 带扬抑符', 239: 'ï 小写 i 带分音符', 240: 'ð 小写 eth', 241: 'ñ 小写 n 带波浪号',
  242: 'ò 小写 o 带抑扬符', 243: 'ó 小写 o 带尖音符', 244: 'ô 小写 o 带扬抑符',
  245: 'õ 小写 o 带波浪号', 246: 'ö 小写 o 带分音符', 247: '除号', 248: 'ø 小写 o 带斜杠',
  249: 'ù 小写 u 带抑扬符', 250: 'ú 小写 u 带尖音符', 251: 'û 小写 u 带扬抑符',
  252: 'ü 小写 u 带分音符', 253: 'ý 小写 y 带尖音符', 254: 'þ 小写 thorn', 255: 'ÿ 小写 y 带分音符',
}

function buildRows() {
  const rows = []
  for (let i = 0; i < 256; i++) {
    const hex = i.toString(16).toUpperCase().padStart(2, '0')
    const oct = i.toString(8).padStart(3, '0')
    const bin = i.toString(2).padStart(8, '0')
    let display = ''
    let desc = ''
    let kind = 'print'
    if (i <= 31 || i === 127) {
      const c = CONTROL[i] || ['', '控制字符']
      display = c[0]
      desc = c[1]
      kind = 'control'
    } else if (i === 32) {
      display = '␠'
      desc = '空格（Space）'
      kind = 'print'
    } else if (i <= 126) {
      display = String.fromCharCode(i)
      desc = '可显示字符'
      kind = 'print'
    } else if (i <= 159) {
      display = ''
      desc = 'C1 控制字符（扩展）'
      kind = 'ext'
    } else {
      display = String.fromCharCode(i)
      desc = EXT_LATIN1[i] || 'Latin-1 扩展字符'
      kind = 'ext'
    }
    rows.push({ dec: i, hex, oct, bin, display, desc, kind })
  }
  return rows
}

const allRows = buildRows()
const keyword = ref('')
const onlyControl = ref(false)
const filtered = ref(allRows)

function apply() {
  const kw = keyword.value.trim().toLowerCase()
  filtered.value = allRows.filter((r) => {
    if (onlyControl.value && r.kind !== 'control') return false
    if (!kw) return true
    return (
      String(r.dec) === kw ||
      r.hex.toLowerCase() === kw ||
      '0x' + r.hex.toLowerCase() === kw ||
      r.display.toLowerCase() === kw ||
      r.desc.toLowerCase().includes(kw) ||
      (r.kind === 'control' && r.display.toLowerCase().includes(kw))
    )
  })
}

function onInput() {
  apply()
}

apply()
</script>

<style scoped>
.ascii-table {
  margin-top: var(--space-sm);
}
.ascii-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px;
}
.ascii-intro {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-left: 4px solid var(--brand);
  background: var(--bg-body);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
.ascii-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.ascii-search {
  flex: 1 1 240px;
  min-width: 200px;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #b1b4b6;
  border-radius: 0;
  background: #fff;
  color: var(--text-primary);
}
.ascii-search:focus {
  outline: 3px solid #ffdd00;
  outline-offset: 0;
  border-color: #1d70b8;
}
.ascii-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.ascii-count {
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}
.ascii-scroll {
  overflow-x: auto;
  border: 1px solid #b1b4b6;
}
.ascii-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ascii-grid th,
.ascii-grid td {
  border: 1px solid #b1b4b6;
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.ascii-grid thead th {
  background: #1d70b8;
  color: #fff;
  font-weight: 700;
  position: sticky;
  top: 0;
}
.ascii-grid tbody tr:nth-child(even) {
  background: #f3f2f1;
}
.ascii-grid .num {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.ascii-grid .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.ascii-grid .chr {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 15px;
  text-align: center;
  min-width: 3em;
  color: var(--text-primary);
}
.ascii-grid .desc {
  white-space: normal;
  color: var(--text-secondary);
}
.ascii-grid tr.is-control .chr {
  color: #d4351c;
  font-weight: 700;
}
.ascii-grid tr.is-ext .chr {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.ascii-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
}
.ascii-note {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
</style>
