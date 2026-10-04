<template>
  <div class="mn">
    <!-- 知识点分类 -->
    <div class="mn-cats">
      <div
        v-for="c in CATS"
        :key="c.key"
        class="mn-cat"
        :class="{ active: cat === c.key }"
        @click="cat = c.key"
      >{{ c.label }}<span class="mn-cat-n">{{ c.count }}</span></div>
    </div>

    <div class="mn-body">
      <p class="mn-intro">{{ currentCat.intro }}</p>

      <div
        v-for="topic in currentCat.topics"
        :key="topic.title"
        class="mn-card"
      >
        <div class="mn-card-head">
          <h3 class="mn-card-title">{{ topic.title }}</h3>
          <span class="mn-level" :class="'mn-level--' + topic.level">{{ LEVEL_LABEL[topic.level] }}</span>
        </div>

        <p class="mn-summary">{{ topic.summary }}</p>

        <!-- 例题 -->
        <div class="mn-example">
          <div class="mn-example-q">
            <span class="mn-tag">例题</span>{{ topic.example.q }}
          </div>
          <button class="mn-reveal" @click="toggle(topic.title)">
            {{ opened[topic.title] ? '收起解答' : '看解答' }}
          </button>
          <div v-if="opened[topic.title]" class="mn-example-a">
            <p><strong>思路：</strong>{{ topic.example.idea }}</p>
            <p v-if="topic.example.steps"><strong>步骤：</strong></p>
            <ul v-if="topic.example.steps">
              <li v-for="(s, i) in topic.example.steps" :key="i">{{ s }}</li>
            </ul>
            <p class="mn-answer"><strong>答：</strong>{{ topic.example.a }}</p>
          </div>
        </div>

        <!-- 要点 -->
        <ul v-if="topic.points" class="mn-points">
          <li v-for="(p, i) in topic.points" :key="i">{{ p }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 奥数知识点库 —— 分难度递进（基础 / 进阶 / 拔高）。
 * 只做知识讲解与例题，不做答题器（用户选择「知识点库」）。
 * 公式口径见 mathCore.js，那边有单元测试保证算法正确。
 */
import { ref, computed } from 'vue'

const LEVEL_LABEL = { 1: '基础', 2: '进阶', 3: '拔高' }

const CATS = [
  {
    key: 'num',
    label: '数与数论',
    intro: '整除、质数、约数倍数、余数问题。奥数里数论是最“硬”的一块，规律性最强，做熟后见效最快。',
    topics: [
      {
        title: '整除特征速判',
        level: 1,
        summary: '不用算，一眼看出一个数能不能被 2、3、4、5、8、9、11 整除。',
        points: [
          '被 2 整除：末位是 0/2/4/6/8',
          '被 4 整除：末两位能被 4 整除',
          '被 8 整除：末三位能被 8 整除',
          '被 3 或 9 整除：各位数字之和能被 3（或 9）整除',
          '被 5 整除：末位是 0 或 5；被 10 整除：末位是 0',
          '被 11 整除：奇数位数字和 − 偶数位数字和 是 11 的倍数（含 0）',
        ],
        example: {
          q: '判断 47392 能否被 8 整除？',
          idea: '只看末三位。',
          steps: ['末三位是 392', '392 ÷ 8 = 49，整除', '所以 47392 能被 8 整除'],
          a: '能（47392 ÷ 8 = 5924）',
        },
      },
      {
        title: '质数与合数',
        level: 1,
        summary: '只有 1 和它本身两个因数的数叫质数（素数）；因数超过两个的叫合数。1 既不是质数也不是合数。',
        points: [
          '2 是唯一的偶质数，其余偶数都是合数',
          '判断方法：试除到 √n 即可（n 较大时不必试完）',
          '常见质数：2 3 5 7 11 13 17 19 23 29 31 …',
        ],
        example: {
          q: '判断 91 和 97 是否为质数。',
          idea: '91 = 7 × 13 是合数；97 试除 2/3/5/7（√97 ≈ 9.8）均不整除。',
          a: '91 是合数，97 是质数',
        },
      },
      {
        title: '最大公约数与最小公倍数',
        level: 1,
        summary: '把两数分别分解质因数：公因数取公有质因数的较小指数之积；公倍数取全部质因数的较大指数之积。',
        points: [
          '短除法更适合小学：两数共同除以公因数，直到商互质',
          '重要性质：最大公约数 × 最小公倍数 = 两数之积',
        ],
        example: {
          q: '求 12 与 18 的最大公约数和最小公倍数。',
          idea: '12 = 2²×3，18 = 2×3²。公因数取较小指数：2¹×3¹ = 6；公倍数取较大指数：2²×3² = 36。',
          steps: ['分解：12 = 2² × 3', '分解：18 = 2 × 3²', 'gcd = 2 × 3 = 6', 'lcm = 4 × 9 = 36'],
          a: '最大公约数 6，最小公倍数 36',
        },
      },
      {
        title: '余数问题（同余）',
        level: 2,
        summary: '核心思想：余数会“循环”。除以 5 余数按 5 一循环，除以 7 按 7 一循环。',
        points: [
          '和的余数 = 余数之和再取余（可先各自取余再相加）',
          '找一个“被除数 + 余数”恰好能被除数整除，就能简算',
          '例：8 ÷ 5 余 3，12 ÷ 5 余 2，那么 8 + 12 = 20，除以 5 余 0',
        ],
        example: {
          q: '一个数除以 7 余 3，除以 5 余 2，这个数最小是多少？',
          idea: '符合除以 7 余 3 的数：3, 10, 17, 24, 31 … 逐个检验是否除以 5 余 2。',
          steps: ['除以 7 余 3：3, 10, 17, 24, 31, 38 …', '17 ÷ 5 = 3 余 2 ✓'],
          a: '17（规律：若余数小于除数，可用「被除数 + 除数」逐步上跳检验）',
        },
      },
      {
        title: '中国剩余定理（物不知数）',
        level: 3,
        summary: '一组数除以不同数各余固定数，求最小数。技巧：逐步满足，最后用公倍数补到最小。',
        points: [
          '逐步满足法：先满足第一个条件，再在同余的数里挑满足第二个的',
          '口诀：先满足一个，再加公倍数“凑”下一个',
        ],
        example: {
          q: '一个数除以 3 余 1，除以 5 余 2，除以 7 余 3，求最小值。',
          idea: '先满足除以 3 余 1：1, 4, 7, 10, 13, 16, 19 … 在这些数里找除以 5 余 2 的：7（7÷5=1余2 不对）… 22 不在此列。继续：1,4,7,10,13,16,19,22,25,28… 22÷5=4余2 ✓ 且 22÷3=7余1 ✓，再检验 22÷7=3余1 ✗，加 21（3与7的公倍数）…',
          steps: [
            '满足 ÷3余1 与 ÷5余2：22 ✓（22 = 3×7+1 = 5×4+2）',
            '22 ÷ 7 = 3 余 1，不满足“余3”',
            '在保持前两个条件的前提下加 3×5=15 的倍数：22 + 15k',
            '22+15=37，37 ÷ 7 = 5 余 2；22+30=52，52 ÷ 7 = 7 余 3 ✓',
            '再验证 52÷3=17余1 ✓，52÷5=10余2 ✓',
          ],
          a: '52',
        },
      },
    ],
  },
  {
    key: 'arith',
    label: '计算与数论应用',
    intro: '把“算”变成“巧算”。高斯求和、凑整、提取公因数，是一切速算的地基。',
    topics: [
      {
        title: '高斯求和（等差数列）',
        level: 1,
        summary: '1 + 2 + 3 + … + n = n(n+1) ÷ 2。两头一配，秒出答案。',
        points: [
          '首尾配对：最小 + 最大 = 固定值',
          '项数 n = (末项 − 首项) ÷ 公差 + 1',
          '前 n 项和 = (首项 + 末项) × n ÷ 2',
        ],
        example: {
          q: '计算 1 + 2 + 3 + … + 100。',
          idea: '首尾配对：1+100=101，2+99=101 … 共 50 对。',
          steps: ['共 100 个数，配成 100 ÷ 2 = 50 对', '每对都是 101', '50 × 101 = 5050'],
          a: '5050（公式：100 × 101 ÷ 2）',
        },
      },
      {
        title: '乘法分配律的巧用',
        level: 1,
        summary: '看到 25、125 要立刻联想到 100、1000；看到 a × 99 联想成 a × 100 − a。',
        points: [
          'a × 99 = a × 100 − a',
          'a × 101 = a × 100 + a',
          'a × 25 = a × 100 ÷ 4（先凑整再除）',
          'a × 125 = a × 1000 ÷ 8',
        ],
        example: {
          q: '计算 99 × 47。',
          idea: '把 99 拆成 100 − 1。',
          steps: ['99 × 47 = (100 − 1) × 47', '= 100 × 47 − 47', '= 4700 − 47'],
          a: '4653',
        },
      },
      {
        title: '等差数列通项与求和',
        level: 2,
        summary: '相邻两项差相同的数列叫等差数列。第 n 项 = 首项 + (n−1)×公差。',
        points: [
          '第 n 项 aₙ = a₁ + (n−1)d',
          '前 n 项和 Sₙ = (a₁ + aₙ) × n ÷ 2',
          '奇数项时：Sₙ = 中间项 × 项数（更快）',
        ],
        example: {
          q: '数列 1, 4, 7, 10, … 的第 20 项是多少？前 20 项和是多少？',
          idea: '首项 1，公差 3。',
          steps: ['a₂₀ = 1 + (20−1) × 3 = 1 + 57 = 58', 'S₂₀ = (1 + 58) × 20 ÷ 2 = 590'],
          a: '第 20 项 58，前 20 项和 590',
        },
      },
      {
        title: '周期问题',
        level: 2,
        summary: '按固定规律重复出现，求“第 n 个是什么”或“第 n 天是星期几”。',
        points: [
          '找准一个完整周期的长度',
          '用总数除以周期长度，看余数',
          '余数 0 表示落在周期最后一个；余数几就是第几个',
          '两个不同周期同时回到起点 = 最小公倍数',
        ],
        example: {
          q: '按“红黄蓝绿”的顺序循环排列彩旗，第 2026 面是什么颜色？',
          idea: '周期为 4。',
          steps: ['2026 ÷ 4 = 506 余 2', '余 2 ⇒ 落在周期第 2 个'],
          a: '黄色',
        },
      },
      {
        title: '抽屉原理',
        level: 3,
        summary: 'n 个物体放进 m 个抽屉，至少有一个抽屉里的物体不少于 ⌈n/m⌉ 个。',
        points: [
          '先算平均数，再向上取整',
          '结论常以“至少……保证……”的句式出现',
        ],
        example: {
          q: '一个盒子里有红、黄、蓝三种颜色的球各若干个。至少要摸出几个球，才能保证有 2 个同色？',
          idea: '最坏情况：先摸到红黄蓝各 1 个（3 个），再摸 1 个必与其中之一同色。',
          steps: ['抽屉 = 3 种颜色', '⌈3/3⌉ + 1 = 2', '即 3 + 1 = 4 个'],
          a: '4 个',
        },
      },
    ],
  },
  {
    key: 'word',
    label: '应用题经典模型',
    intro: '奥数应用题说到底是“找关系”。把每种题型的核心等式背熟，遇到题先套关系再代数。',
    topics: [
      {
        title: '和差问题',
        level: 1,
        summary: '已知两数之和与两数之差，求两数。大数 = (和 + 差) ÷ 2。',
        points: [
          '和差问题：和 = 大 + 小，差 = 大 − 小',
          '公式：大数 = (和 + 差) ÷ 2，小数 = (和 − 差) ÷ 2',
          '变式：和倍问题大数 = 和 ÷ (倍数 + 1)',
          '变式：差倍问题大数 = 差 ÷ (倍数 − 1)',
        ],
        example: {
          q: '甲乙两数的和是 48，差是 12，求两数。',
          idea: '直接套公式。',
          steps: ['大数 = (48 + 12) ÷ 2 = 30', '小数 = (48 − 12) ÷ 2 = 18', '检验：30 + 18 = 48 ✓，30 − 18 = 12 ✓'],
          a: '甲 30，乙 18',
        },
      },
      {
        title: '和倍与差倍问题',
        level: 2,
        summary: '一个数是另一个数的几倍，关键是把“1 倍量”找出来。',
        points: [
          '和倍：小数 = 和 ÷ (倍数 + 1)，大数 = 小数 × 倍数',
          '差倍：大数 = 差 ÷ (倍数 − 1)，小数 = 大数 ÷ 倍数',
        ],
        example: {
          q: '甲乙两数的和是 60，甲是乙的 2 倍，求两数。',
          idea: '把乙看作 1 份，甲是 2 份，共 3 份。',
          steps: ['乙 = 60 ÷ (2 + 1) = 20', '甲 = 20 × 2 = 40', '检验：40 + 20 = 60 ✓'],
          a: '甲 40，乙 20',
        },
      },
      {
        title: '年龄问题',
        level: 2,
        summary: '年龄差永远不变，这是解法的钥匙。几年前年龄差不变，倍数关系在变。',
        points: [
          '年龄差是个定值，不随时间改变',
          '“几年前/几年后”年龄差不变，倍数关系会变',
        ],
        example: {
          q: '父亲今年 30 岁，儿子今年 10 岁。几年前父亲是儿子的 3 倍？',
          idea: '年龄差恒为 20 岁。当父亲是儿子的 3 倍时，差是儿子的 2 倍。',
          steps: ['年龄差 = 30 − 10 = 20（永远不变）', '当父 = 3 × 子时：3x − x = 20', '2x = 20 ⇒ x = 10', '那时儿子 10 岁 ⇒ 是现在（今年）', '所以 0 年前（今年）父亲 30 = 3 × 10 ✓'],
          a: '0 年前（即今年）；若问“几年后”则为无穷远',
        },
      },
      {
        title: '鸡兔同笼',
        level: 2,
        summary: '假设全是鸡，多出来的脚就是兔子换来的。每换一只兔，脚增加 2 只。',
        points: [
          '假设法：设全是鸡，总脚数 = 头数 × 2',
          '兔数 = (实际脚数 − 假设脚数) ÷ (兔脚 − 鸡脚) = (94 − 70) ÷ 2 = 12',
          '鸡数 = 头数 − 兔数',
        ],
        example: {
          q: '鸡兔同笼，共 35 个头、94 只脚，鸡兔各几只？',
          idea: '假设 35 只全是鸡，脚应为 70 只，比实际少 24 只。',
          steps: ['假设全是鸡：35 × 2 = 70 只脚', '实际 94 只，比假设多 94 − 70 = 24 只', '每把一只鸡换成兔，脚多 2 只', '兔 = 24 ÷ 2 = 12 只', '鸡 = 35 − 12 = 23 只'],
          a: '鸡 23 只，兔 12 只',
        },
      },
      {
        title: '盈亏问题',
        level: 3,
        summary: '每人分 a 个多 b 个，每人分 c 个少 d 个，求人数。人数 = (盈 + 亏) ÷ 两次每人差。',
        points: [
          '公式：份数 = (盈 + 亏) ÷ 两次每份数之差',
          '注意“盈”和“亏”要相加（一个多一个少）',
        ],
        example: {
          q: '把一些糖果分给小朋友：每人 3 颗多 8 颗，每人 4 颗少 4 颗。共有多少个小朋友？',
          idea: '两次每人相差 1 颗，总量相差 8 + 4 = 12 颗。',
          steps: ['盈 8，亏 4，总差 = 8 + 4 = 12', '每人差 = 4 − 3 = 1', '人数 = 12 ÷ 1 = 12 人', '检验：12×3+8 = 44，12×4−4 = 44 ✓'],
          a: '12 个小朋友',
        },
      },
      {
        title: '平均数问题',
        level: 1,
        summary: '平均数 = 总数 ÷ 个数。关键是“移多补少”，以及“总数不變时个数与平均数成反比”。',
        points: [
          '基础：平均 = 总数 ÷ 份数',
          '总数不变，份数越多平均数越小',
          '移多补少法：多的匀给少的，总数不变',
        ],
        example: {
          q: '5 个数的平均数是 20，去掉一个数后，剩下 4 个数的平均数是 18。去掉的数是多少？',
          idea: '先还原两个总数。',
          steps: ['原总数 = 20 × 5 = 100', '新总数 = 18 × 4 = 72', '去掉的数 = 100 − 72 = 28'],
          a: '28',
        },
      },
    ],
  },
  {
    key: 'travel',
    label: '行程问题',
    intro: '画一条时间轴或线段图，把“谁在哪、走了多久”标清楚，行程题就不难了。',
    topics: [
      {
        title: '相遇问题',
        level: 1,
        summary: '两人相向而行。相遇时间 = 总路程 ÷ 速度和。',
        points: [
          '相遇：路程和 = 速度和 × 时间',
          '相遇时间 = 总路程 ÷ 速度和',
          '相遇点距甲 = 甲速 × 相遇时间',
        ],
        example: {
          q: '甲乙两地相距 400 千米，甲车每小时行 60 千米，乙车每小时行 40 千米，两车同时从两地相向而行，几小时相遇？',
          idea: '速度和 = 60 + 40 = 100。',
          steps: ['速度和 = 60 + 40 = 100 千米/时', '相遇时间 = 400 ÷ 100 = 4 小时'],
          a: '4 小时相遇（甲行驶 240 千米，乙行驶 160 千米）',
        },
      },
      {
        title: '追及问题',
        level: 2,
        summary: '同向而行，快者追慢者。追及时间 = 追及距离 ÷ 速度差。',
        points: [
          '追及：路程差 = 速度差 × 追及时间',
          '追及时间 = 初始差距 ÷ (快者速度 − 慢者速度)',
        ],
        example: {
          q: '弟弟每分钟走 60 米，先出发 5 分钟，哥哥每分钟走 100 米。哥哥出发后几分钟追上弟弟？',
          idea: '弟弟领先距离 = 60 × 5 = 300 米。',
          steps: ['领先 = 60 × 5 = 300 米', '速度差 = 100 − 60 = 40 米/分', '追及时间 = 300 ÷ 40 = 7.5 分'],
          a: '7.5 分钟',
        },
      },
      {
        title: '流水行船',
        level: 2,
        summary: '船在静水中的速度 + 水速 = 顺水速度；− 水速 = 逆水速度。',
        points: [
          '顺水速度 = 船速 + 水速',
          '逆水速度 = 船速 − 水速',
          '顺水与逆水路程相同 ⇒ 顺水时间与逆水时间之比 = 逆水速度:顺水速度',
        ],
        example: {
          q: '一只船在静水中每小时行 20 千米，水流速度每小时 3 千米。顺水航行 84 千米需要多少时间？',
          idea: '顺水速度 = 20 + 3 = 23。',
          steps: ['顺水速度 = 20 + 3 = 23 千米/时', '时间 = 84 ÷ 23'],
          a: '84/23 小时（约 3.65 小时）',
        },
      },
      {
        title: '火车过桥',
        level: 2,
        summary: '火车完全通过一座桥，走的距离 = 桥长 + 车长。',
        points: [
          '完全过桥路程 = 桥长 + 车长',
          '时间 = (桥长 + 车长) ÷ 车速',
        ],
        example: {
          q: '一列长 200 米的火车以每秒 20 米通过一座长 600 米的大桥，需要多少秒？',
          idea: '车尾也要离开桥，所以总路程 = 桥 + 车。',
          steps: ['总路程 = 600 + 200 = 800 米', '时间 = 800 ÷ 20 = 40 秒'],
          a: '40 秒',
        },
      },
      {
        title: '环形相遇与追及',
        level: 3,
        summary: '在环形跑道上，反向跑每相遇一次合走一圈；同向跑每追上一次多跑一圈。',
        points: [
          '反向相遇：第 n 次相遇 ⇒ 两人合走 n 圈 ⇒ t = n × C ÷ (v₁ + v₂)',
          '同向追及：第 n 次追上 ⇒ 快者比慢者多跑 n 圈 ⇒ t = n × C ÷ (v₁ − v₂)',
        ],
        example: {
          q: '环形跑道长 400 米，两人反向跑，速度分别为每秒 6 米和每秒 4 米。第 3 次相遇需多少秒？',
          idea: '反向相遇 n 次 = 合走 n 圈。',
          steps: ['速度和 = 6 + 4 = 10 米/秒', '3 次相遇合走 3 × 400 = 1200 米', '时间 = 1200 ÷ 10 = 120 秒'],
          a: '120 秒',
        },
      },
    ],
  },
  {
    key: 'frac',
    label: '分数与百分数',
    intro: '分数应用题的关键是“单位 1”。找准单位 1，一切比例关系都围着它转。',
    topics: [
      {
        title: '分数乘除法的意义',
        level: 1,
        summary: '求一个数的几分之几是多少 → 乘；已知几分之几是多少，求这个数 → 除。',
        points: [
          'a 的 b/c 是多少：a × b/c',
          'a 的 b/c 是 x，求 a：x ÷ b/c',
        ],
        example: {
          q: '一本书共 240 页，第一天看了全书的 1/4，第二天看了余下的 1/3，第二天看了多少页？',
          idea: '先求余下页数，再乘 1/3。',
          steps: ['余下 = 240 × (1 − 1/4) = 180 页', '第二天 = 180 × 1/3 = 60 页'],
          a: '60 页',
        },
      },
      {
        title: '分数与百分数互化',
        level: 1,
        summary: '百分数化分数：分子分母同时除以 100。分数化百分数：小数点右移两位并加百分号。',
        points: [
          '25% = 25/100 = 1/4；75% = 3/4',
          '1/8 = 0.125 = 12.5%',
          '常见互化：1/2=50% 1/4=25% 3/4=75% 1/5=20% 1/10=10%',
        ],
        example: {
          q: '把 0.625 化成百分数和最简分数。',
          idea: '小数右移两位加 %；分数用 625/1000 约分。',
          steps: ['0.625 = 62.5%', '625/1000 约分（÷125）= 5/8'],
          a: '62.5% = 5/8',
        },
      },
      {
        title: '工程问题',
        level: 3,
        summary: '把工作总量看作 1，效率就是“每天完成总量的几分之一”。合作效率相加。',
        points: [
          '工作总量 = 1，效率 a 表示 1/a 天完成',
          '合作时间 = 1 ÷ (效率之和)',
          '交替工作：先算一个周期（几天完成多少），再看余数',
        ],
        example: {
          q: '一项工程，甲单独做 6 天完成，乙单独做 3 天完成。两人合作几天完成？',
          idea: '总量设为 1。',
          steps: ['甲效率 = 1/6', '乙效率 = 1/3', '合作效率 = 1/6 + 1/3 = 1/2', '时间 = 1 ÷ 1/2 = 2 天'],
          a: '2 天',
        },
      },
    ],
  },
  {
    key: 'geometry',
    label: '图形与面积',
    intro: '图形题的关键是“割补”：把不规则的拼成规则的，把大图拆成小图。',
    topics: [
      {
        title: '周长与面积',
        level: 1,
        summary: '长方形 S = ab，C = 2(a+b)；正方形 S = a²，C = 4a；三角形 S = ah ÷ 2；平行四边形 S = ah；梯形 S = (a+b)h ÷ 2；圆 S = πr²，C = 2πr。',
        points: [
          '三角形面积 = 底 × 高 ÷ 2（别忘 ÷2）',
          '梯形面积 = (上底 + 下底) × 高 ÷ 2',
          '圆周长与面积的区别：一个是长度、一个是面积',
        ],
        example: {
          q: '一个梯形上底 6 cm、下底 10 cm、高 4 cm，求面积。',
          idea: '套梯形公式。',
          steps: ['S = (6 + 10) × 4 ÷ 2', '= 16 × 4 ÷ 2 = 32'],
          a: '32 cm²',
        },
      },
      {
        title: '割补法求面积',
        level: 2,
        summary: '把不规则图形补成大图形，再减去多余部分。',
        points: [
          '常用技巧：补成正方形/长方形',
          '“等积变形”：同底等高的三角形面积相等',
        ],
        example: {
          q: '一个正方形边长 10 cm，从中挖去一个边长 4 cm 的小正方形，求剩余面积。',
          idea: '大正减小。',
          steps: ['大正 = 10 × 10 = 100 cm²', '小正 = 4 × 4 = 16 cm²', '剩余 = 100 − 16 = 84 cm²'],
          a: '84 cm²',
        },
      },
      {
        title: '组合图形与重叠',
        level: 3,
        summary: '重叠部分被算了两遍，要减一次。',
        points: [
          '两图形重叠面积 = A + B − 重叠部分',
          '“覆盖”类题目用容斥：A∪B = A + B − A∩B',
        ],
        example: {
          q: '两个长方形面积分别为 12 和 18，重叠部分面积是 5，合并后（不重叠部分）总面积是多少？',
          idea: '容斥原理。',
          steps: ['A + B = 12 + 18 = 30', '减去重复计算的 5', '= 30 − 5 = 25'],
          a: '25',
        },
      },
    ],
  },
  {
    key: 'logic',
    label: '逻辑与推理',
    intro: '逻辑题没有公式，靠列表画图。把确定的信息先标出来，矛盾的信息就是突破口。',
    topics: [
      {
        title: '真假话问题',
        level: 2,
        summary: '先假设某人说真话，逐一检验；若矛盾则反设。',
        points: [
          '只有一个人说真话（其余假）→ 假设法最有效',
          '“只有…才…”是必要条件，方向容易搞反',
        ],
        example: {
          q: '甲乙两人争论一题答案。甲说“答案是 A”，乙说“答案不是 A”。已知两人中只有一人说对，答案是 A 还是 B？',
          idea: '甲乙的话互相矛盾，必有一真一假。',
          steps: ['若答案是 A：甲对、乙错 ⇒ 恰一人对 ✓', '若答案是 B：甲错、乙对 ⇒ 也恰一人对 ✓'],
          a: '无法确定——信息不足（两句话完全对立，只靠“恰一真”不能判定）',
        },
      },
      {
        title: '列表法推理',
        level: 2,
        summary: '把人和事物列成表格，用 “√/×” 排除。信息量大时列表法最稳。',
        points: [
          '先填唯一确定的信息',
          '用“同一行/列不重复”原则逐步排除',
        ],
        example: {
          q: '甲乙丙分别学钢琴、画画、书法。已知甲不学钢琴，乙不学画画，丙学书法。谁学画画？',
          idea: '由丙学书法排除法。',
          steps: ['丙 → 书法', '甲 → 不钢琴 ⇒ 甲只能是画画', '乙 → 剩下的钢琴'],
          a: '甲学画画',
        },
      },
      {
        title: '数图形（数线段/三角形）',
        level: 3,
        summary: '数线段用公式：n 个点共 C(n,2) 条。数三角形要分类加总。',
        points: [
          '直线上 n 个点，线段总数 = n(n−1) ÷ 2',
          '数长方形：m × n 个格，(m)(m+1)(n)(n+1) ÷ 4',
        ],
        example: {
          q: '一条直线上有 6 个点，一共能数出多少条线段？',
          idea: '两两配对。',
          steps: ['C(6,2) = 6 × 5 ÷ 2', '= 15'],
          a: '15 条',
        },
      },
    ],
  },
]

const cat = ref('num')
const opened = ref({})
// 用 computed 而非函数：模板里直接 currentCat.xxx 访问。
// 之前写成普通函数却在模板当对象用，导致所有卡片都不渲染（cards: 0）。
const currentCat = computed(() => CATS.find((c) => c.key === cat.value) || CATS[0])

function toggle(title) {
  opened.value[title] = !opened.value[title]
}
</script>

<style scoped>
.mn { user-select: none; }
.mn-cats {
  display: flex; flex-wrap: wrap;
  border: 1px solid #b1b4b6;
  margin-bottom: 14px;
}
.mn-cat {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 15px;
  color: #1d70b8;
  background: #fff;
  border-right: 1px solid #b1b4b6;
  white-space: nowrap;
}
.mn-cat:last-child { border-right: none; }
.mn-cat.active { background: #1d70b8; color: #fff; font-weight: 700; }
.mn-cat-n {
  display: inline-block;
  margin-left: 6px;
  font-size: 12px;
  color: inherit;
  opacity: 0.75;
}
.mn-intro {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.mn-card {
  border: 1px solid #b1b4b6;
  border-left: 4px solid #1d70b8;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: #fff;
}
.mn-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 8px; flex-wrap: wrap;
}
.mn-card-title { margin: 0; font-size: 16px; font-weight: 700; color: #0b0c0c; }
.mn-level {
  font-size: 12px; font-weight: 700; padding: 2px 8px;
  border: 1px solid; white-space: nowrap;
}
.mn-level--1 { color: #00703c; border-color: #00703c; }
.mn-level--2 { color: #b58800; border-color: #b58800; }
.mn-level--3 { color: #d4351c; border-color: #d4351c; }
.mn-summary {
  margin: 0 0 10px; font-size: 14px; color: var(--text-primary); line-height: 1.7;
}
.mn-example {
  background: #f3f2f1;
  padding: 10px 12px;
  border-left: 3px solid #5f5e5a;
}
.mn-example-q { font-size: 14px; line-height: 1.7; margin-bottom: 8px; }
.mn-tag {
  display: inline-block; margin-right: 8px;
  background: #1d70b8; color: #fff;
  font-size: 11px; font-weight: 700; padding: 1px 6px;
}
.mn-reveal {
  background: #fff; border: 1px solid #1d70b8; color: #1d70b8;
  padding: 5px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.mn-reveal:hover { background: #e6f1fb; }
.mn-example-a {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px dashed #b1b4b6;
  font-size: 14px; line-height: 1.8; color: var(--text-primary);
}
.mn-example-a p { margin: 0 0 6px; }
.mn-example-a ul { margin: 0 0 6px; padding-left: 22px; }
.mn-example-a li { margin-bottom: 3px; }
.mn-answer { color: #00703c; font-weight: 700; }
.mn-points {
  margin: 10px 0 0; padding-left: 20px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.8;
}
.mn-points li { margin-bottom: 2px; }
</style>
