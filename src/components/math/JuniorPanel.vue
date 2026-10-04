<template>
  <div class="jr">
    <!-- 专题分类 -->
    <div class="jr-cats">
      <div
        v-for="c in CATS"
        :key="c.key"
        class="jr-cat"
        :class="{ active: cat === c.key }"
        @click="cat = c.key"
      >{{ c.label }}<span class="jr-cat-n">{{ c.count }}</span></div>
    </div>

    <div class="jr-body">
      <p class="jr-intro">{{ currentCat.intro }}</p>

      <div v-for="t in currentCat.topics" :key="t.title" class="jr-card">
        <div class="jr-card-head">
          <h3 class="jr-card-title">{{ t.title }}</h3>
          <span class="jr-level" :class="'jr-level--' + t.level">{{ LEVEL_LABEL[t.level] }}</span>
        </div>

        <p class="jr-summary">{{ t.summary }}</p>

        <!-- 公式 / 定理 -->
        <div v-if="t.formulas && t.formulas.length" class="jr-formulas">
          <div class="jr-sec-title">公式与定理</div>
          <div v-for="(f, i) in t.formulas" :key="i" class="jr-formula">
            <code class="jr-f">{{ f.f }}</code>
            <span class="jr-fd">{{ f.d }}</span>
          </div>
        </div>

        <!-- 要点 -->
        <ul v-if="t.points" class="jr-points">
          <li v-for="(p, i) in t.points" :key="i">{{ p }}</li>
        </ul>

        <!-- 思路 -->
        <div v-if="t.idea" class="jr-idea">
          <div class="jr-sec-title">解题思路</div>
          <p>{{ t.idea }}</p>
        </div>

        <!-- 例题 -->
        <div class="jr-example">
          <div class="jr-example-q">
            <span class="jr-tag">例题</span>{{ t.example.q }}
          </div>
          <button class="jr-reveal" @click="toggle(t.title)">
            {{ opened[t.title] ? '收起解答' : '看解答' }}
          </button>
          <div v-if="opened[t.title]" class="jr-example-a">
            <p v-if="t.example.steps"><strong>步骤：</strong></p>
            <ul v-if="t.example.steps">
              <li v-for="(s, i) in t.example.steps" :key="i">{{ s }}</li>
            </ul>
            <p v-if="t.example.note"><strong>逻辑：</strong>{{ t.example.note }}</p>
            <p class="jr-answer"><strong>答：</strong>{{ t.example.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 初中数学联赛（初联）知识点库 —— 分难度递进。
 * 与小学奥数（MathPanel.vue）分开：初联偏代数/几何/数论定理。
 * 所有公式在 juniorCore.js 里有单元测试 + 暴力枚举交叉验证。
 */
import { ref, computed } from 'vue'

const LEVEL_LABEL = { 1: '基础', 2: '进阶', 3: '拔高' }

const CATS = [
  {
    key: 'numtheory',
    label: '数论',
    intro: '初联数论的核心是「整除」与「因数个数」。这两块打通，很多证明题会瞬间变简单。',
    topics: [
      {
        title: '因数个数与完全平方数',
        level: 2,
        summary: '一个关键性质：把 n 的因数按 d 和 n/d 配对，只有 n 是完全平方数时才有一个“孤独”的因数 √n。',
        formulas: [
          { f: 'd(n) = (a₁+1)(a₂+1)···(aₖ+1)', d: 'n = p₁^a₁ p₂^a₂ ⋯ pₖ^aₖ 时，n 的正因数个数' },
          { f: 'σ(n) = (1+p₁+···+p₁^a₁)···(1+pₖ+···+pₖ^aₖ)', d: 'n 的所有正因数之和' },
        ],
        points: [
          '因数个数为奇数 ⟺ n 是完全平方数（因 d 与 n/d 成对，√n 单独成对）',
          '完全数：真因数之和等于自身，如 6、28、496',
        ],
        idea: '求因数个数别一个个试，先做质因数分解再套公式，快得多。',
        example: {
          q: '求 360 的正因数个数；并判断 360 的正因数之和。',
          steps: [
            '质因数分解：360 = 2³ × 3² × 5',
            '因数个数 = (3+1)(2+1)(1+1) = 4×3×2 = 24',
            '因数和 = (1+2+4+8)(1+3+9)(1+5) = 15 × 13 × 6 = 1170',
          ],
          note: '因数个数 24 是偶数，所以 360 不是完全平方数——两者互为逆命题。',
          a: '24 个正因数，和为 1170',
        },
      },
      {
        title: '整除与同余',
        level: 2,
        summary: 'a ≡ b (mod n) 表示 a−b 能被 n 整除。同余可以传递、可以相加。',
        formulas: [
          { f: 'a ≡ b (mod n) ⟺ n | (a − b)', d: '同余的定义' },
          { f: 'a ≡ b, c ≡ d (mod n) ⇒ a + c ≡ b + d (mod n)', d: '同余可相加' },
        ],
        points: [
          '找一个“被除数 + 若干个除数”恰好被整除的数，就能简算',
          '中国剩余定理：多条件余数问题逐步满足',
        ],
        idea: '看到余数就想到“加除数”：a÷5余3 与 a÷7余2，先满足一个，再在同余的数里挑。',
        example: {
          q: '一个数除以 5 余 3，除以 7 余 2，求最小值。',
          steps: [
            '满足 ÷5余3：3, 8, 13, 18, 23, 28 …',
            '在 13 ÷ 7 = 1 余 6 ✗；18 ÷ 7 = 2 余 4 ✗；23 ÷ 7 = 3 余 2 ✗',
            '28 ÷ 7 = 4 余 0 ✗；33 ÷ 7 = 4 余 5 ✗；38 ÷ 7 = 5 余 3 ✗；43 ÷ 7 = 6 余 1 ✗；48 ÷ 7 = 6 余 6 ✗；53 ÷ 7 = 7 余 4 ✗；58 ÷ 7 = 8 余 2 ✓',
          ],
          note: '更快的办法：满足 ÷5余3 的数模 35 循环，依次为 3,8,13,18,23,28,33（7次一循环），其中 23+35=58 满足。',
          a: '58',
        },
      },
      {
        title: '梅森素数与完全数',
        level: 3,
        summary: '形如 2^p − 1 的素数叫梅森素数；它与偶完全数一一对应。',
        formulas: [
          { f: 'p 为素数时，Mₚ = 2ᵖ − 1', d: '可能是素数（还需实际检验）' },
          { f: 'Mₚ 为素数 ⇒ 2ᵖ − 1 与 2ᵖ(p) 对应偶完全数', d: '欧几里得-欧拉定理' },
        ],
        points: [
          'p 不是素数时 2ᵖ−1 必为合数（可证）',
          '已知的偶完全数：6、28、496、8128',
        ],
        idea: '这类题常考“判断 2ⁿ−1 是否为素数”，先看指数 n 是否素数。',
        example: {
          q: '判断 2⁵ − 1 与 2⁴ − 1 是否为素数。',
          steps: [
            '2⁵ − 1 = 31，试除 2/3/5 均不整除 ⇒ 31 是素数',
            '2⁴ − 1 = 15 = 3 × 5 ⇒ 合数（且 4 不是素数，符合结论）',
          ],
          note: 'n=4 不是素数 ⇒ 2⁴−1 必为合数，这里得到了验证。',
          a: '31 是素数，15 是合数',
        },
      },
    ],
  },
  {
    key: 'algebra',
    label: '代数与方程',
    intro: '韦达定理是不定方程的钥匙：不解方程就能知道两根的和与积。',
    topics: [
      {
        title: '韦达定理与根的判别',
        level: 2,
        summary: 'ax² + bx + c = 0 的两根 x₁, x₂ 满足：和 = −b/a，积 = c/a。判别式决定根的情况。',
        formulas: [
          { f: 'x₁ + x₂ = −b/a', d: '两根之和' },
          { f: 'x₁ · x₂ = c/a', d: '两根之积' },
          { f: 'Δ = b² − 4ac', d: '判别式：Δ>0 两不等实根，Δ=0 两相等实根，Δ<0 无实根' },
        ],
        points: [
          '已知“一根 + 和/积”求另一根，不必解方程',
          '根的判别可反过来约束系数：若要求有实根，则 Δ ≥ 0',
        ],
        idea: '题目问“两根之差”“1/x₁+1/x₂”这类看似复杂的东西时，先用韦达把它换算成和与积。',
        example: {
          q: '已知 x² − 5x + 6 = 0 的两根为 x₁, x₂，求 1/x₁ + 1/x₂ 与 (x₁−x₂)²。',
          steps: [
            '和 x₁+x₂ = 5，积 x₁x₂ = 6',
            '1/x₁ + 1/x₂ = (x₁+x₂)/(x₁x₂) = 5/6',
            '(x₁−x₂)² = (x₁+x₂)² − 4x₁x₂ = 25 − 24 = 1',
          ],
          note: '技巧：把陌生式子“翻译”成韦达能提供的和与积，不要去解出具体根。',
          a: '1/x₁+1/x₂ = 5/6；(x₁−x₂)² = 1',
        },
      },
      {
        title: '均值不等式与柯西',
        level: 3,
        summary: '求“最值”的两大工具。AM-GM 处理乘积，柯西处理平方和。',
        formulas: [
          { f: '(a₁+a₂+···+aₙ)/n ≥ (a₁a₂···aₙ)^(1/n)', d: 'AM-GM：n 个正数的算术平均 ≥ 几何平均' },
          { f: '(a²+b²)(c²+d²) ≥ (ac+bd)²', d: '柯西不等式（二元形式）' },
        ],
        points: [
          'AM-GM 的等号条件：各数相等',
          '“和为定值求乘积最大”→ 用 AM-GM；“平方和最小”→ 用柯西',
        ],
        idea: '看到“和一定，乘积最大”就是 AM-GM 的标准信号。',
        example: {
          q: '已知 a + b = 10（a,b > 0），求 ab 的最大值。',
          steps: [
            '由 AM-GM：(a+b)/2 ≥ √(ab)',
            '即 5 ≥ √(ab)',
            '所以 ab ≤ 25',
          ],
          note: '等号在 a = b = 5 时成立，此时 ab = 25 确实取到。',
          a: 'ab 最大值为 25（a = b = 5 时）',
        },
      },
    ],
  },
  {
    key: 'sequence',
    label: '数列',
    intro: '数列题先判断类型：看相邻两项的差（等差）还是比（等比），有时还要看二阶差。',
    topics: [
      {
        title: '等差与等比数列',
        level: 2,
        summary: '等差看差相等，等比看比相等。求和优先用公式，别硬加。',
        formulas: [
          { f: 'aₙ = a₁ + (n−1)d', d: '等差通项' },
          { f: 'Sₙ = n(a₁+aₙ)/2 = (2a₁+(n−1)d)·n/2', d: '等差求和' },
          { f: 'aₙ = a₁q^(n−1)', d: '等比通项（q≠0）' },
          { f: 'Sₙ = a₁(qⁿ−1)/(q−1)', d: '等比求和（q≠1）' },
        ],
        points: [
          '等差中项：a₁+a₃ = 2a₂',
          '等比中项：a₁a₃ = a₂²（各项同号时成立）',
        ],
        idea: '奇数项求和时，等差数列有更快的方法：S = 中间项 × 项数。',
        example: {
          q: '求 1 + 3 + 5 + … + 99 的和。',
          steps: [
            '首项 1，公差 2，末项 99',
            '项数 n = (99−1)/2 + 1 = 50',
            'S = n(a₁+aₙ)/2 = 50 × (1+99)/2 = 50 × 50 = 2500',
          ],
          note: '也可用“奇数项求和 = 中间项 × 项数”：中间项是 50，共 50 项，50×50=2500，结果一致。',
          a: '2500',
        },
      },
      {
        title: '斐波那契数列',
        level: 3,
        summary: 'F₁ = F₂ = 1，之后每项是前两项之和。常见考点是求指定项或证明整除性。',
        formulas: [
          { f: 'F₁ = F₂ = 1, Fₙ = Fₙ₋₁ + Fₙ₋₂', d: '递推定义' },
          { f: 'F₁+F₂+···+Fₙ = Fₙ₊₂ − 1', d: '前缀和恒等式' },
        ],
        points: [
          '相邻两项互质',
          'Fₙ 的个位数字以 60 为周期循环（ Pisano 周期）',
        ],
        idea: '求和优先用 Fₙ₊₂ − 1，别逐项加。',
        example: {
          q: '求 F₁ + F₂ + … + F₁₀ 的值。',
          steps: [
            'F₁₀ = 55，F₁₂ = 144',
            '由恒等式：和 = F₁₂ − 1 = 144 − 1 = 143',
          ],
          note: '逐项相加 1+1+2+3+5+8+13+21+34+55 = 143，与公式一致（可验算）。',
          a: '143',
        },
      },
    ],
  },
  {
    key: 'count',
    label: '计数原理',
    intro: '分类用加法，分步用乘法，去重用容斥，保证用抽屉。选对工具是第一步。',
    topics: [
      {
        title: '加法、乘法与容斥原理',
        level: 2,
        summary: '“分类”计数相加，“分步”计数相乘；有重叠时用容斥把重复的减掉。',
        formulas: [
          { f: '分类：总数 = 各类之和', d: '加法原理（互斥分类）' },
          { f: '分步：总数 = 各步之积', d: '乘法原理（依次完成）' },
          { f: '|A∪B| = |A| + |B| − |A∩B|', d: '二集合容斥' },
          { f: '|A∪B∪C| = |A|+|B|+|C| − |A∩B| − |B∩C| − |A∩C| + |A∩B∩C|', d: '三集合容斥' },
        ],
        points: [
          '容斥的关键：加到几集合，减几项，最后加回几重',
          '注意“互斥”前提：若两类有交集就直接相加会重复计数',
        ],
        idea: '数 1~100 中能被 2 或 3 或 5 整除的个数，就用三集合容斥。',
        example: {
          q: '1~100 中，能被 2 或 3 或 5 中至少一个整除的数有多少个？',
          steps: [
            '能被 2 整除：50 个；被 3：33 个；被 5：20 个',
            '同时被 2 和 3（即 6）：16 个；2 和 5（10）：10 个；3 和 5（15）：6 个',
            '同时被 2、3、5（30）：3 个',
            '50+33+20 − 16 − 10 − 6 + 3 = 103 − 32 + 3 = 74',
          ],
          note: '验算：74 = 50+33+20 −(16+10+6) + 3。容斥项数：加 3 项、减 3 项、加回 1 项。',
          a: '74 个',
        },
      },
      {
        title: '组合数与二项式定理',
        level: 3,
        summary: 'C(n,k) 是“从 n 个里选 k 个不看顺序”，A(n,k) 是“选 k 个且看顺序”。',
        formulas: [
          { f: 'C(n,k) = n!/[k!(n−k)!]', d: '组合数（不考虑顺序）' },
          { f: 'A(n,k) = n!/(n−k)!', d: '排列数（考虑顺序）' },
          { f: '(a+b)ⁿ 中 aᵏb^(n−k) 的系数 = C(n,k)', d: '二项式定理' },
        ],
        points: [
          'C(n,k) = C(n, n−k)（对称性）',
          '求“至少/至多”常用补集：C(n,k) 的和 = 2ⁿ',
        ],
        idea: '“至少选 1 个红球”这类，用总数减去“一个都没选”的补集更快。',
        example: {
          q: '5 个人中选 3 个参加比赛，有多少种选法？再求 5 个人中至少 2 个不选的选法。',
          steps: [
            '选 3 人：C(5,3) = 5!/(3!·2!) = 10',
            '5 人共 2⁵ = 32 种选法（每人选/不选）',
            '“至少 2 个不选” = 0 个不选 + 1 个不选 = C(5,0) + C(5,1) = 1 + 5 = 6',
          ],
          note: '直接数“至少2个不选”也可，但用补集把“至少”转成“至多”更清晰。',
          a: '10 种；6 种',
        },
      },
    ],
  },
  {
    key: 'geometry',
    label: '几何',
    intro: '几何证明的两条主线：找全等（证相等）、找相似（证比例）。圆的问题优先想圆幂定理。',
    topics: [
      {
        title: '勾股定理与勾股数',
        level: 1,
        summary: 'a² + b² = c² 及其逆定理。逆定理用来判断直角，是“证垂直”的常用手段。',
        formulas: [
          { f: 'a² + b² = c²', d: '勾股定理' },
          { f: 'a² + b² = c² ⇒ 三角形 ABC 为直角三角形', d: '勾股定理逆定理' },
          { f: 'S = ½·a·h', d: '三角形面积 = ½ × 底 × 高' },
        ],
        points: [
          '常见勾股数：(3,4,5)、(5,12,13)、(8,15,17)、(7,24,25)',
          '海伦公式 S = √(s(s−a)(s−b)(s−c))，s 为半周长',
        ],
        idea: '要证两条边垂直，先算三边长度的平方，看是否满足勾股逆定理。',
        example: {
          q: '三角形三边长为 5、12、13，求面积；并判断是否为直角三角形。',
          steps: [
            '5² + 12² = 25 + 144 = 169，而 13² = 169 ⇒ 两边平方和等于第三边平方',
            '由勾股定理逆定理，是直角三角形（5、12 为直角边）',
            '面积 = ½ × 5 × 12 = 30',
          ],
          note: '海伦公式验算：s = 15，S = √(15×10×3×2) = √900 = 30，与 30 一致。',
          a: '是直角三角形，面积 30',
        },
      },
      {
        title: '全等与相似',
        level: 2,
        summary: '全等看“一样大”（可叠加），相似看“成比例”（可放大缩小）。',
        formulas: [
          { f: '相似：a/a′ = b/b′ = c/c′ = k', d: '相似比 k' },
          { f: 'S : S′ = k²', d: '相似三角形面积比 = 相似比的平方' },
          { f: '周长比 = k', d: '相似三角形周长比 = 相似比' },
        ],
        points: [
          '面积比是相似比的平方（不是一次方，这是最常错的地方）',
          '常见判定：AAA（角）、SAS/ASA（角边角）',
        ],
        idea: '涉及“面积随长度放大”时，先求相似比再平方，别直接用长度比。',
        example: {
          q: '两个相似三角形的相似比为 2 : 3，它们的面积比和周长比分别是多少？',
          steps: [
            '相似比 k = 2/3',
            '周长比 = k = 2 : 3',
            '面积比 = k² = (2/3)² = 4/9 ⇒ 4 : 9',
          ],
          note: '面积比 4:9 ≠ 周长比 2:3，这是最常见的错误点。',
          a: '周长比 2 : 3，面积比 4 : 9',
        },
      },
      {
        title: '圆幂定理与托勒密定理',
        level: 3,
        summary: '圆外一点向圆引两条割线，得到的四个线段满足乘积相等——这是初联圆的重点。',
        formulas: [
          { f: 'PA · PB = PC · PD', d: '圆幂定理：P 为圆外一点，两条割线交圆' },
          { f: 'PA² = PB · PC', d: '切线-割线：PA 为切线' },
          { f: 'AC · BD = AB · CD + BC · AD', d: '托勒密定理：圆内接四边形 ABCD' },
        ],
        points: [
          '圆幂定理的直观理解：“同一点出发的所有割线，乘积都相同”',
          '托勒密定理只对**圆内接**四边形成立，非圆内接不适用',
        ],
        idea: '看到“圆外一点引两条线”就条件反射用圆幂定理，把两段长度对应相乘即可。',
        example: {
          q: 'P 是圆外一点，割线 PAB（P、… 与… 顺序：P 在外，A 近、B 远）满足 PA = 3，PB = 12；另一条割线 PCD 满足 PC = 6。求 PD。',
          steps: [
            '由圆幂定理：PA · PB = PC · PD',
            '3 × 12 = 6 × PD',
            'PD = 36 ÷ 6 = 6',
          ],
          note: '验算：PA·PB = 36，PC·PD = 6×6 = 36，两边相等 ✓。',
          a: 'PD = 6',
        },
      },
    ],
  },
]

const cat = ref('numtheory')
const opened = ref({})
// 用 computed 而非普通函数：模板里直接 currentCat.xxx 访问
const currentCat = computed(() => CATS.find((c) => c.key === cat.value) || CATS[0])

function toggle(title) {
  opened.value[title] = !opened.value[title]
}
</script>

<style scoped>
.jr { user-select: none; }
.jr-cats {
  display: flex; flex-wrap: wrap;
  border: 1px solid #b1b4b6;
  margin-bottom: 14px;
}
.jr-cat {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 15px;
  color: #1d70b8;
  background: #fff;
  border-right: 1px solid #b1b4b6;
  white-space: nowrap;
}
.jr-cat:last-child { border-right: none; }
.jr-cat.active { background: #1d70b8; color: #fff; font-weight: 700; }
.jr-cat-n {
  display: inline-block; margin-left: 6px;
  font-size: 12px; color: inherit; opacity: 0.75;
}
.jr-intro {
  margin: 0 0 16px; font-size: 14px;
  color: var(--text-secondary); line-height: 1.7;
}
.jr-card {
  border: 1px solid #b1b4b6;
  border-left: 4px solid #1d70b8;
  padding: 14px 16px; margin-bottom: 12px; background: #fff;
}
.jr-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 8px; flex-wrap: wrap;
}
.jr-card-title { margin: 0; font-size: 16px; font-weight: 700; color: #0b0c0c; }
.jr-level { font-size: 12px; font-weight: 700; padding: 2px 8px; border: 1px solid; }
.jr-level--1 { color: #00703c; border-color: #00703c; }
.jr-level--2 { color: #b58800; border-color: #b58800; }
.jr-level--3 { color: #d4351c; border-color: #d4351c; }
.jr-summary { margin: 0 0 10px; font-size: 14px; color: var(--text-primary); line-height: 1.7; }

.jr-sec-title {
  font-size: 13px; font-weight: 700; color: #1d70b8;
  margin-bottom: 6px;
}
.jr-formulas {
  background: #f3f2f1; padding: 10px 12px; margin-bottom: 10px;
  border-left: 3px solid #1d70b8;
}
.jr-formula { margin-bottom: 8px; }
.jr-formula:last-child { margin-bottom: 0; }
.jr-f {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; font-weight: 700; color: #0b0c0c;
  background: #fff; padding: 2px 8px; margin-bottom: 3px;
}
.jr-fd {
  display: block; font-size: 13px; color: var(--text-secondary); line-height: 1.6;
}
.jr-points {
  margin: 0 0 10px; padding-left: 20px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.8;
}
.jr-points li { margin-bottom: 3px; }
.jr-idea {
  background: #e6f1fb; padding: 10px 12px; margin-bottom: 10px;
  font-size: 13px; line-height: 1.7;
}
.jr-idea p { margin: 0; }

.jr-example {
  background: #f3f2f1; padding: 10px 12px;
  border-left: 3px solid #5f5e5a;
}
.jr-example-q { font-size: 14px; line-height: 1.7; margin-bottom: 8px; }
.jr-tag {
  display: inline-block; margin-right: 8px;
  background: #1d70b8; color: #fff;
  font-size: 11px; font-weight: 700; padding: 1px 6px;
}
.jr-reveal {
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 5px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.jr-reveal:hover { background: #e6f1fb; }
.jr-example-a {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px dashed #b1b4b6;
  font-size: 14px; line-height: 1.8; color: var(--text-primary);
}
.jr-example-a p { margin: 0 0 6px; }
.jr-example-a ul { margin: 0 0 6px; padding-left: 22px; }
.jr-example-a li { margin-bottom: 3px; }
.jr-answer { color: #00703c; font-weight: 700; }
</style>
