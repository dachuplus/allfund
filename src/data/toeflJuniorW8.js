/**
 * 小托福加油站 · Week 8（阅读（指代题） + 语用（非谓语动词））
 *
 * 数据来源：Week 8 讲义 PDF（19 页：题目、选项、专项练习）
 *          + 答案解析 PDF（6 页：答案、简析）。
 * 静态数据，零网络请求。说明：阅读文章正文不入库，面板仅渲染题干（q/options/why）
 * 与专项练习（drills）；非谓语专项练习以"题目+答案+要点"形式折叠展示。
 */

export const WEEK = {
  "key": "w8",
  "label": "Week 8",
  "subject": "阅读（指代题） + 语用（非谓语动词）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 阅读",
      "subtitle": "指代题（Reference）",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-7",
          "questions": [
            {
              "n": 1,
              "q": "What is the passage mainly about?",
              "options": [
                "How leaf colors help scientists predict winter temperatures",
                "Why all trees need cold weather before losing their leaves",
                "How autumn leaf colors develop and why they vary",
                "Which kinds of trees make the most food during summer"
              ],
              "answer": 2,
              "why": {
                "right": "全文从秋叶变色的熟悉现象切入，依次解释绿色减少、原有黄色和橙色显露、部分树木新产生红色色素，以及天气和树种造成的差异。C同时涵盖\"形成原因\"和\"变化差异\"。",
                "wrong": [
                  "A 预测冬温：文章不是讲用叶色预测气温。",
                  "B 所有树都需受冷才落叶：原文明确说单靠寒冷不能解释叶色。",
                  "D 哪种树夏天产糖最多：产糖只是机制细节，非主旨。"
                ]
              }
            },
            {
              "n": 2,
              "q": "What does They refer to in paragraph 2?",
              "options": [
                "The green substances",
                "The yellow and orange pigments",
                "The leaves making sugar",
                "The trees growing in summer"
              ],
              "answer": 1,
              "why": {
                "right": "第2段先说 yellow and orange pigments 也在叶片中，紧接着说 They are simply hidden by all that green。They 指这些原有的黄色和橙色色素，代回句中数量和语义均吻合。",
                "wrong": [
                  "A 绿色物质：是\"遮住\"他物的因素，不是被遮住的对象。",
                  "C 制造糖的叶子：叶子本身并未被绿色遮住。",
                  "D 夏天生长的树：与句中 They 无关。"
                ]
              }
            },
            {
              "n": 3,
              "q": "The word visible in paragraph 3 is closest in meaning to...",
              "options": [
                "ready to fall",
                "easy to grow",
                "likely to disappear",
                "able to be seen"
              ],
              "answer": 3,
              "why": {
                "right": "第3段先说明叶绿素减少，接着说黄橙色 become visible，后面的 stand out 再次提示它们更容易被看到。visible 意为\"可看见的\"。",
                "wrong": [
                  "A ready to fall 即将落下：与\"显现\"无关。",
                  "B easy to grow 易生长：不合语境。",
                  "C likely to disappear 可能消失：恰恰相反，是变得可见。"
                ]
              }
            },
            {
              "n": 4,
              "q": "Why does the author mention a quiet voice in a noisy room in paragraph 3?",
              "options": [
                "To explain how the loss of green makes other colors easier to notice",
                "To show why leaves stop capturing light when the season changes",
                "To compare the amount of sugar made during warm and cool weather",
                "To suggest that small changes cannot be noticed without special equipment"
              ],
              "answer": 0,
              "why": {
                "right": "第3段把强烈的绿色比作噪声，把原有的其他颜色比作小声说话。噪声停止后声音更易听见；相应地，绿色减少后其他颜色更显眼。该类比帮助解释颜色显露机制。",
                "wrong": [
                  "B 说明叶子为何停止采光：类比讲的是颜色显现，不是采光。",
                  "C 比较冷暖天气产糖量：与类比无关。",
                  "D 说微小变化需设备才能察觉：类比为日常可感，恰相反。"
                ]
              }
            },
            {
              "n": 5,
              "q": "What does These conditions refer to in paragraph 4?",
              "options": [
                "Longer autumn nights followed by an early frost that makes the leaves fall",
                "A growing season in which leaves keep making chlorophyll that hides other pigments",
                "Sunny days that help make sugar, together with cool nights that keep sugar in the leaves",
                "Changes in the kinds of trees that grow in a forest from one year to another"
              ],
              "answer": 2,
              "why": {
                "right": "第4段 These conditions 概括前一句的两种配合条件：warm, sunny days 使叶片产生糖，cool nights 使更多糖留在叶片内。这些条件有利于红色色素产生。",
                "wrong": [
                  "A 霜冻使叶片落下：霜冻在后文出现，不是这里的回指对象。",
                  "B 绿色遮色：谈的是生长季，不是此处条件。",
                  "D 树种逐年变化：与 These conditions 无关。"
                ]
              }
            },
            {
              "n": 6,
              "q": "According to paragraph 4, what is true about red pigments?",
              "options": [
                "Some trees produce them during autumn.",
                "They appear in every kind of tree after the first frost.",
                "They are present in all leaves throughout the summer.",
                "They prevent leaves from falling during cold weather."
              ],
              "answer": 0,
              "why": {
                "right": "第4段明说 Some trees produce new red pigments in autumn，与 A 一致。",
                "wrong": [
                  "B 每种树霜冻后都出现：把范围扩大为所有树并添加霜冻条件。",
                  "C 所有叶子整个夏天都有：原文是部分树秋季新产生。",
                  "D 阻止叶片在寒冷时落下：原文说霜冻可能使叶片提早落下。"
                ]
              }
            },
            {
              "n": 7,
              "q": "How is the passage mainly organized?",
              "options": [
                "It compares the colors of trees growing in cities with those growing in forests.",
                "It describes a scientific experiment and then explains why the results were unexpected.",
                "It lists several kinds of trees and then ranks them by the brightness of their colors.",
                "It introduces a familiar scene and then explains the causes of the colors and their differences."
              ],
              "answer": 3,
              "why": {
                "right": "第1段呈现秋叶变色的日常场景；第2–3段解释绿色和黄色/橙色；第4段补充红色的形成与天气影响；第5段加入树种差异并收束全文。D准确概括\"现象引入→解释成因与差异\"。",
                "wrong": [
                  "A 城乡树木颜色比较：文章未做城乡对比。",
                  "B 描述实验并解释意外结果：没有实验过程。",
                  "C 列出树种并按色彩亮度排名：未做排名。"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Advanced · Questions 8-15",
          "questions": [
            {
              "n": 8,
              "q": "What is the passage mainly about?",
              "options": [
                "How a seaside town became a popular place for tourists",
                "How Anning gained expertise and advanced science despite limited recognition",
                "Why Anning chose to study living animals instead of fossils",
                "Why scientists stopped collecting marine reptiles after Anning's death"
              ],
              "answer": 1,
              "why": {
                "right": "文章按人生经历介绍 Anning 如何通过家庭采集、自学与观察成为化石专家，并说明重要发现与有限的正式认可之间的落差。B同时涵盖三条主线。",
                "wrong": [
                  "A 海滨小镇如何成为旅游胜地：主题不是小镇。",
                  "C 为何研究现生动物：与事实相反，她研究化石。",
                  "D 科学家为何停止采集：文章未说停止。"
                ]
              }
            },
            {
              "n": 9,
              "q": "What does them refer to in paragraph 3?",
              "options": [
                "Scientific papers",
                "Different types of fossils",
                "The rocks along the coast",
                "The letters Mary received"
              ],
              "answer": 0,
              "why": {
                "right": "第3段 She read scientific papers and copied them by hand 中，read 和 copied 并列，两个动作的对象一致；them 回指 scientific papers。",
                "wrong": [
                  "B 不同种类化石：在后文才出现，不是该句宾语。",
                  "C 沿岸岩石：与 copied 搭配不当。",
                  "D 收到的信件：该句未提信件。"
                ]
              }
            },
            {
              "n": 10,
              "q": "Why does the author mention Anning's 1822 letter?",
              "options": [
                "To explain why she stopped selling fossils",
                "To show that she wanted to leave Lyme Regis",
                "To describe a disagreement with her brother",
                "To provide evidence of her detailed geological knowledge"
              ],
              "answer": 3,
              "why": {
                "right": "第3段先指出她持续提升知识，再用1822年的信作具体证据：她不仅列举沿岸化石，还认识到不同化石与特定岩层的对应关系。作者提及信件是为了支持她具有细致的地质知识。",
                "wrong": [
                  "A 解释她为何停止卖化石：与信的内容无关。",
                  "B 表明她想离开 Lyme Regis：无依据。",
                  "C 描述与哥哥的分歧：无依据。"
                ]
              }
            },
            {
              "n": 11,
              "q": "According to paragraph 4, why did Cuvier first doubt the plesiosaur specimen?",
              "options": [
                "It had been found far from the sea.",
                "Its bones were too small to study.",
                "Its physical appearance seemed unusual.",
                "It had already been described by another collector."
              ],
              "answer": 2,
              "why": {
                "right": "第4段说蛇颈龙的 long neck and small head looked so unfamiliar，以至于 Cuvier 怀疑标本是否真实。C的 physical appearance seemed unusual 概括该因果关系。",
                "wrong": [
                  "A 远离海岸发现：未提及。",
                  "B 骨头太小：是外形不寻常，不是尺寸小。",
                  "D 已被其他采集者描述：未提及。"
                ]
              }
            },
            {
              "n": 12,
              "q": "The word genuine in paragraph 4 is closest in meaning to ...",
              "options": [
                "Complete",
                "Real",
                "Valuable",
                "Familiar"
              ],
              "answer": 1,
              "why": {
                "right": "第4段先说 Cuvier 怀疑 whether the specimen was real，接着写 He later accepted that it was genuine。前后形成\"起初怀疑—后来确认\"的变化，genuine 意为\"真实的\"。",
                "wrong": [
                  "A Complete 完整的：描述完整性，非此处含义。",
                  "C Valuable 有价值的：描述价值。",
                  "D Familiar 熟悉的：描述熟悉程度。"
                ]
              }
            },
            {
              "n": 13,
              "q": "What does Its refer to in paragraph 5?",
              "options": [
                "Lyme Regis",
                "The Natural History Museum",
                "The plesiosaur skeleton",
                "The Geological Society of London"
              ],
              "answer": 3,
              "why": {
                "right": "第5段前句提到 the Geological Society of London，后句 Its members 即\"该学会的成员\"。Its 是所有格形式，代入后语义连贯。",
                "wrong": [
                  "A Lyme Regis 是城镇：无法与 members 搭配。",
                  "B 自然历史博物馆：在第6段才出现。",
                  "C 蛇颈龙骨架：是标本，不能与 members 自然搭配。"
                ]
              }
            },
            {
              "n": 14,
              "q": "What can be inferred from paragraph 5?",
              "options": [
                "Society membership did not always reflect a person's scientific knowledge.",
                "Scientists in London had no interest in fossils from Lyme Regis.",
                "Anning's specimens were studied only after her death.",
                "Collectors automatically received the same status as society members."
              ],
              "answer": 0,
              "why": {
                "right": "第5段一方面写 Anning 不能加入学会，另一方面写学会成员研究她提供的标本，且科学家到访向她学习。可推断：是否拥有会员身份并不总能体现个人的科学知识。",
                "wrong": [
                  "B 伦敦科学家对化石无兴趣：与到访学习矛盾。",
                  "C 标本只在死后才被研究：无依据。",
                  "D 采集者自动获得同等地位：与 equal status 受限相反。"
                ]
              }
            },
            {
              "n": 15,
              "q": "How is the passage mainly organised?",
              "options": [
                "It compares the methods used by two competing fossil collectors.",
                "It explains the steps for identifying three kinds of marine reptiles.",
                "It traces Anning's life and considers her contributions and recognition.",
                "It presents a scientific theory and then lists experiments that disproved it."
              ],
              "answer": 2,
              "why": {
                "right": "第1–2段介绍家庭背景和早期采集；第3段写自学；第4段列重要发现；第5段讨论身份与认可；第6段写去世及贡献。C准确概括\"追溯人生经历，同时讨论贡献与认可\"。",
                "wrong": [
                  "A 两位采集者竞争：未提及第二位采集者。",
                  "B 鉴定三种海生爬行动物的步骤：非说明文流程。",
                  "D 提出理论再列实验推翻：与文章结构不符。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习 · 找出指代对象（Passage 1–6）",
          "prompt": "Passage 1: The school art room has a new photo lamp. It shines on small objects, so students can take clear pictures even on cloudy days.\n1. What does It refer to?  A. The school  B. The art room  C. The new photo lamp  D. The cloudy days\n\nPassage 2: Visitors used to walk across the wet meadow. The park built a raised wooden path through it to protect the small plants. The path keeps people's shoes above the soil.\n2. What does it refer to?  A. The wet meadow  B. The wooden path  C. The soil  D. The park\n\nPassage 3: The science club tested two kinds of paper. The first kind absorbed water in a few seconds, even though its label said \"water-resistant.\" This surprised the students.\n3. What does This refer to?  A. The students' science club  B. The label on the paper  C. The students testing two kinds of paper  D. The first kind of paper absorbing water quickly despite its \"water-resistant\" label\n\nPassage 4: Mr. Lee brought a camera and a tripod to the greenhouse. He set the tripod beside the east window and fixed the camera onto it so the class could photograph the seedlings.\n4. What does it refer to?  A. The greenhouse  B. The tripod  C. The east window  D. The class\n\nPassage 5: The library lends field guides about birds, trees, and insects. Students may borrow these for one week, but they must return them before the next class visit.\n5. What does these refer to?  A. The students  B. The class visits  C. The field guides  D. The insects\n\nPassage 6: The school garden has several narrow paths between the planting beds. One is wide enough for a small cart, but the others are for walking only.\n6. What does One refer to?  A. A planting bed  B. A garden cart  C. A school  D. A path",
          "answer": "1 C　2 A　3 D　4 B　5 C　6 D",
          "note": "1 It 是后一句主语，前一句单数物品是 a new photo lamp。2 through it 指穿过湿地，木栈道建在湿地之上。3 This 概括前一句完整情况：第一种纸标为耐水却几秒吸水。4 onto it 指向前文的 the tripod。5 these 是复数，指鸟类/树木/昆虫图鉴 field guides。6 One 指 paths 中的一条小路。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "非谓语动词",
      "groups": [
        {
          "key": "b0",
          "label": "Basic 1 · Notice · Questions 1-6",
          "questions": [
            {
              "n": 1,
              "q": "Please remember ______ a bottle of water and a packed lunch.",
              "options": [
                "bringing",
                "to bring",
                "bring",
                "brought"
              ],
              "answer": 1,
              "why": {
                "right": "remember to do 表示记得去完成待办事项；步行尚未开始，需记得带水和午餐，用 to bring。",
                "wrong": [
                  "A bringing：remember doing 指记得做过，不符合待办语境。",
                  "C bring：remember 后不接原形。",
                  "D brought：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 2,
              "q": "Before ______ the gate, the guide will hand out maps and explain the route.",
              "options": [
                "leave",
                "to leave",
                "leaving",
                "left"
              ],
              "answer": 2,
              "why": {
                "right": "before 在这里是介词，后接动名词 leaving，表示离开入口之前。",
                "wrong": [
                  "A leave / B to leave：before 作介词时不接原形或不定式。",
                  "D left：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 3,
              "q": "For safety, each student ______ to stay on the marked trail.",
              "options": [
                "has",
                "have",
                "having",
                "to have"
              ],
              "answer": 0,
              "why": {
                "right": "主语 each student 是单数，谓语用 has；has to stay 表示安全规则要求学生留在指定小径上。",
                "wrong": [
                  "B have：主谓不一致。",
                  "C having / D to have：不能作谓语。"
                ]
              }
            },
            {
              "n": 4,
              "q": "To avoid ______ them, please keep your voices low.",
              "options": [
                "disturb",
                "to disturb",
                "disturbed",
                "disturbing"
              ],
              "answer": 3,
              "why": {
                "right": "avoid doing，用 disturbing。代词 them 指前句的鸟；压低声音是为了避免惊扰鸟。",
                "wrong": [
                  "A disturb / B to disturb：avoid 后接动名词。",
                  "C disturbed：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 5,
              "q": "After the walk, we will stop at the visitor center ______ our lunches.",
              "options": [
                "eating",
                "to eat",
                "eat",
                "ate"
              ],
              "answer": 1,
              "why": {
                "right": "停在访客中心的目的是吃午餐，用目的不定式 to eat。",
                "wrong": [
                  "A eating：不表目的。",
                  "C eat / D ate：不能作目的状语。"
                ]
              }
            },
            {
              "n": 6,
              "q": "We look forward to ______ you on Saturday.",
              "options": [
                "see",
                "to see",
                "seeing",
                "seen"
              ],
              "answer": 2,
              "why": {
                "right": "look forward to 中的 to 是介词，后接动名词 seeing；不能因为看到 to 就接原形。",
                "wrong": [
                  "A see / B to see：介词 to 后需动名词。",
                  "D seen：过去分词不合语义。"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Basic 2 · Email · Questions 7-14",
          "questions": [
            {
              "n": 7,
              "q": "This time, we have decided ______ visitors into two groups.",
              "options": [
                "divide",
                "dividing",
                "to divide",
                "divided"
              ],
              "answer": 2,
              "why": {
                "right": "去年入口拥挤，所以今年决定分两组入场；decide to do，用 to divide。",
                "wrong": [
                  "A divide / B dividing：decide 后接不定式。",
                  "D divided：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 8,
              "q": "Students ______ surnames begin with A–L should come at 12:15 p.m.",
              "options": [
                "whose",
                "who",
                "whom",
                "which"
              ],
              "answer": 0,
              "why": {
                "right": "关系从句修饰 Students，空后是名词 surnames，需用表示所属关系的 whose：姓氏以 A–L 开头的学生。",
                "wrong": [
                  "B who / C whom：在从句中作主宾，不能作定语。",
                  "D which：不能指人。"
                ]
              }
            },
            {
              "n": 9,
              "q": "It is important for everyone ______ at the correct time.",
              "options": [
                "arrive",
                "arriving",
                "arrived",
                "to arrive"
              ],
              "answer": 3,
              "why": {
                "right": "It is + adj. + for sb. + to do，It 为形式主语，真正的主语是不定式短语 to arrive at the correct time。",
                "wrong": [
                  "A arrive / B arriving / C arrived：均不能作真正主语。"
                ]
              }
            },
            {
              "n": 10,
              "q": "Before ______ a book, please give your books to a volunteer at the entrance.",
              "options": [
                "choose",
                "choosing",
                "to choosing",
                "chosen"
              ],
              "answer": 1,
              "why": {
                "right": "before 是介词，后接动名词 choosing；须先交书拿票，再选书，顺序与后文规则一致。",
                "wrong": [
                  "A choose：介词后不接原形。",
                  "C to choosing：结构错误。",
                  "D chosen：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 11,
              "q": "The volunteer will let you ______ one ticket for each book you bring.",
              "options": [
                "to take",
                "taking",
                "take",
                "taken"
              ],
              "answer": 2,
              "why": {
                "right": "主动句中 let sb. do sth.，let 后的宾语 you 再接动词原形 take。",
                "wrong": [
                  "A to take：let 后不加 to。",
                  "B taking / D taken：均非原形。"
                ]
              }
            },
            {
              "n": 12,
              "q": "Keep your tickets with you ______ you will need one for each book you choose.",
              "options": [
                "because",
                "unless",
                "although",
                "until"
              ],
              "answer": 0,
              "why": {
                "right": "后句解释为什么要保管好票：每选一本书都需要一张票，用因果连接词 because。",
                "wrong": [
                  "B unless 除非：语义不通。",
                  "C although 尽管：不合逻辑。",
                  "D until 直到：不表原因。"
                ]
              }
            },
            {
              "n": 13,
              "q": "Books left at the end of the event ______ to the community center.",
              "options": [
                "will donate",
                "donating",
                "have donated",
                "will be donated"
              ],
              "answer": 3,
              "why": {
                "right": "Books 是捐赠动作的承受者，活动在下周五，需用一般将来时被动语态 will be donated。",
                "wrong": [
                  "A will donate：主动语态，书不能自己捐赠。",
                  "B donating / C have donated：均非被动。"
                ]
              }
            },
            {
              "n": 14,
              "q": "We hope you have fun ______ a story you might not otherwise have tried!",
              "options": [
                "discover",
                "discovering",
                "to discovering",
                "discovered"
              ],
              "answer": 1,
              "why": {
                "right": "have fun doing sth. 表示做某事很开心，用 discovering。",
                "wrong": [
                  "A discover / C to discovering / D discovered：have fun 后接动名词。"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Advanced · Article · Questions 15-24",
          "questions": [
            {
              "n": 15,
              "q": "Students placed small sound recorders at six locations ______ which birds used the area.",
              "options": [
                "finding out",
                "found out",
                "find out",
                "to find out"
              ],
              "answer": 3,
              "why": {
                "right": "学生放置录音设备是为了弄清哪些鸟使用这片林地，目的用不定式 to find out。",
                "wrong": [
                  "A finding out / B found out / C find out：均不表目的。"
                ]
              }
            },
            {
              "n": 16,
              "q": "The recorders switched on automatically before sunrise, ______ many birds were active.",
              "options": [
                "which",
                "when",
                "whose",
                "where"
              ],
              "answer": 1,
              "why": {
                "right": "逗号后的补充说明指向前面的时间 before sunrise，意为\"那时许多鸟很活跃\"，用关系副词 when。",
                "wrong": [
                  "A which：指物，不指时间。",
                  "C whose：作定语。",
                  "D where：指地点。"
                ]
              }
            },
            {
              "n": 17,
              "q": "This let the students ______ sounds without being in the woodland themselves.",
              "options": [
                "collect",
                "to collect",
                "collecting",
                "collected"
              ],
              "answer": 0,
              "why": {
                "right": "主动句中 let sb. do sth.，用原形 collect；自动录音让学生不必亲自待在林地里。",
                "wrong": [
                  "B to collect：let 后不加 to。",
                  "C collecting / D collected：均非原形。"
                ]
              }
            },
            {
              "n": 18,
              "q": "The recorders were placed high enough ______ out of reach of curious dogs.",
              "options": [
                "staying",
                "stayed",
                "to stay",
                "stay"
              ],
              "answer": 2,
              "why": {
                "right": "adj. + enough + to do，用 to stay；stay out of reach of 表示保持在触及范围之外。安装高度既使狗够不到设备，也保证学生能安全取回。",
                "wrong": [
                  "A staying / B stayed / D stay：enough 后需不定式。"
                ]
              }
            },
            {
              "n": 19,
              "q": "Each recorder saved the sounds on ______ own memory card.",
              "options": [
                "its",
                "it's",
                "it",
                "itself"
              ],
              "answer": 0,
              "why": {
                "right": "Each recorder 是单数物品，own memory card 前需要形容词性物主代词 its。it's 是 it is / it has 的缩写，不能修饰名词。",
                "wrong": [
                  "B it's：缩写形式，不能作定语。",
                  "C it：主格不能修饰名词。",
                  "D itself：反身代词不合语义。"
                ]
              }
            },
            {
              "n": 20,
              "q": "They spent several afternoons ______ to short sections and comparing them with recordings in an online bird guide.",
              "options": [
                "listen",
                "to listen",
                "listened",
                "listening"
              ],
              "answer": 3,
              "why": {
                "right": "spend time doing sth.，用 listening，并与后面的 comparing 构成平行结构。",
                "wrong": [
                  "A listen / B to listen / C listened：spend time 后接动名词。"
                ]
              }
            },
            {
              "n": 21,
              "q": "At first, the students had trouble ______ some similar bird calls apart.",
              "options": [
                "tell",
                "telling",
                "to tell",
                "told"
              ],
              "answer": 1,
              "why": {
                "right": "have trouble doing sth.，用 telling；tell ... apart 表示分辨，后句专家提供辨认线索。",
                "wrong": [
                  "A tell / C to tell / D told：have trouble 后接动名词。"
                ]
              }
            },
            {
              "n": 22,
              "q": "A local expert explained ______, such as the length of a call or a repeated pattern.",
              "options": [
                "what to listen for",
                "what they to listen for",
                "what should they listen for",
                "what listening for"
              ],
              "answer": 0,
              "why": {
                "right": "what + to do 可作 explained 的宾语；what to listen for 表示要留心听哪些特征。C使用了疑问句语序，不能直接接在 explained 后作间接问句。",
                "wrong": [
                  "B what they to listen for：结构错误。",
                  "C what should they listen for：疑问句语序，不能作宾语。",
                  "D what listening for：不合语法。"
                ]
              }
            },
            {
              "n": 23,
              "q": "The project produced a more varied list than the club's earlier walks had done. ______, that does not prove that more birds had moved into the area.",
              "options": [
                "Therefore",
                "For example",
                "However",
                "In addition"
              ],
              "answer": 2,
              "why": {
                "right": "前句说录得的鸟类名单更丰富，后句提醒这不能证明鸟变多，存在转折，用 However。后文提出\"新方法发现过去漏听的鸟\"这一替代解释。",
                "wrong": [
                  "A Therefore 因此：不表转折。",
                  "B For example 例如：非举例关系。",
                  "D In addition 此外：不表转折。"
                ]
              }
            },
            {
              "n": 24,
              "q": "The club now plans to use both methods, since each ______ information the other may overlook.",
              "options": [
                "provide",
                "providing",
                "to provide",
                "provides"
              ],
              "answer": 3,
              "why": {
                "right": "since 引导的从句中，主语是单数 each，谓语需用 provides；这里描述两种方法各有长处的一般情况。",
                "wrong": [
                  "A provide：主谓不一致。",
                  "B providing / C to provide：从句缺谓语。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "A. 用括号内动词的适当形式完成句子（1–24）",
          "prompt": "1. The robotics team practices ______ a small bridge before the contest. (build)\n2. We decided ______ the model after we found a weak joint. (rebuild)\n3. After ______ the instructions, the group started the experiment. (read)\n4. The teacher reminded us ______ safety goggles in the lab. (wear)\n5. It is necessary ______ the equipment before starting. (check)\n6. The teacher let us ______ the magnifying glasses during the lesson. (use)\n7. Ms. Lee had the teams ______ the tables to the side of the room. (move)\n8. The coach made the players ______ the exercise. (repeat)\n9. We got the caretaker ______ the cabinet so we could take out the tools. (unlock)\n10. The visitors were made ______ safety helmets before entering the tunnel. (wear)\n11. We spent ten minutes ______ the tools after the experiment. (clean)\n12. The children had fun ______ paper boats by the pond. (make)\n13. Eva had trouble ______ the tiny labels, so she asked for a magnifying glass. (read)\n14. Our group had difficulty ______ the last problem on the worksheet. (solve)\n15. When I entered the workshop, I found Ben ______ a model bridge. (build)\n16. This box is too heavy for one child ______ alone. (lift)\n17. Mina is old enough ______ the contest without an adult. (enter)\n18. The students stopped ______ when the teacher began to speak. (talk)\n19. We had walked for an hour, so we stopped ______ some water. (drink)\n20. Please remember ______ your safety goggles with you. (bring)\n21. I remember ______ this tree on my first day at the school. (plant)\n22. After a short break, we continued ______ the story. (read)\n23. The caretaker helped us ______ the heavy boxes upstairs. (carry)\n24. We raked the ______ leaves into bags. (fall)",
          "answer": "1 building　2 to rebuild　3 reading/having read　4 to wear　5 to check　6 use　7 move/moving　8 repeat　9 to unlock/unlocking　10 to wear　11 cleaning　12 making　13 reading　14 solving　15 building　16 to lift　17 to enter　18 talking　19 to drink　20 to bring　21 planting/having planted　22 reading/to read　23 carry/to carry　24 fallen",
          "note": "practice doing / decide to do / after + doing / remind sb. to do / It is + adj. + to do / let sb. do / have sb. do(doing) / make sb. do / get sb. to do(doing) / be made to do / spend time doing / have fun doing / have trouble(difficulty) doing / find sb. doing / too+adj.+to do / adj.+enough+to do / stop doing(停止正在做) vs stop to do(停下来去做) / remember to do(记得去做) vs remember doing(记得做过) / continue doing(to do) / help sb. do(to do) / 过去分词 fallen 作定语。列出多种形式的题任写一种即可。"
        },
        {
          "title": "B. 选出能正确完成句子的选项（1–8）",
          "prompt": "1. We watched Mia ______ her routine from beginning to end.  (A) perform (B) to perform (C) performed (D) to performing\n2. As we passed the music room, we heard the choir ______ a new song.  (A) to sing (B) sung (C) singing (D) to singing\n3. It is difficult ______ younger children to carry these heavy boxes.  (A) of (B) for (C) to (D) by\n4. The student ______ the map is our guide for today's walk.  (A) held (B) hold (C) holds (D) holding\n5. The posters ______ by the art club will be displayed in the entrance hall.  (A) made (B) making (C) make (D) makes\n6. It was kind ______ Nora to share her notes with us.  (A) for (B) of (C) with (D) to\n7. The instructions are simple enough ______ without a teacher.  (A) follow (B) following (C) followed (D) to follow\n8. We had the cracked window ______ before winter.  (A) to repair (B) repairing (C) repaired (D) repair",
          "answer": "1 A　2 C　3 B　4 D　5 A　6 B　7 D　8 C",
          "note": "1 watch sb. do 把完整表演看作一个事件。2 hear sb. doing 突出经过时听到的过程。3 It is difficult for sb. to do。4 现在分词 holding 后置修饰 student。5 过去分词 made 后置修饰 posters（被动）。6 It was kind of sb. to do。7 adj.+enough+to do。8 have sth. done 表示安排别人完成。"
        },
        {
          "title": "C. 改错（1–8）",
          "prompt": "改正每句加粗部分的一处语法错误。\n1. My brother enjoys to draw birds in his notebook.\n2. The club is busy to prepare its display for the school fair.\n3. The nature trail is worth to visit in spring.\n4. We could not help to laugh when the puppy fell asleep in the empty flowerpot.\n5. The shelf is enough low for younger students to reach.\n6. We have enough time finishing the model before lunch.\n7. It was careless for Ben to leave his schoolbag on the bus.\n8. On Monday morning, we found the gate breaking by the weekend storm.",
          "answer": "1 drawing　2 preparing　3 visiting　4 laughing / but laugh　5 low enough　6 to finish　7 of careless　8 broken",
          "note": "1 enjoy doing。2 be busy doing。3 be worth doing。4 could not help doing / could not help but do。5 enough 修饰形容词放其后。6 enough + 名词 + to do。7 评价人的行为用 of sb.。8 过去分词 broken 作宾补，by 引出施动者。"
        },
        {
          "title": "D. 疑问词 + 不定式改写（1–8）",
          "prompt": "将加粗的从句改为\"疑问词 + 不定式\"。\n1. I do not know what I should do next.\n2. Please show us how we can fold this map.\n3. We have not decided where we should put these boxes.\n4. The guide will tell us when we should start.\n5. Eva has not decided whether she should join the club.\n6. I need to find out where I should leave my bag.\n7. We must decide what we should take on the trip.\n8. Mei learned how she could adjust the straps on her backpack.",
          "answer": "1 what to do next　2 how to fold this map　3 where to put these boxes　4 when to start　5 whether to join the club　6 where to leave my bag　7 what to take on the trip　8 how to adjust the straps on her backpack",
          "note": "\"疑问词 + to do\"可替换宾语从句；what 已是 do 的宾语不再加 it；whether 不能用 if 替换；保留宾语与物主代词。"
        }
      ]
    }
  ]
}
