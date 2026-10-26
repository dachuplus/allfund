/**
 * 小托福加油站 · Week 5（听力 + 语用（动词时态 · 二））
 *
 * 数据来源：Week 讲义 PDF（题目与选项）+ 答案解析 PDF（答案、简析、听力原文）。
 * 静态数据，零网络请求；听力音频为原讲义二维码解析出的外链。
 */

export const WEEK = {
  "key": "w5",
  "label": "Week 5",
  "subject": "听力 + 语用（动词时态 · 二）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 听力",
      "subtitle": "学术演讲 Academic Talk",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-4",
          "questions": [
            {
              "n": 1,
              "q": "What is the talk mainly about?",
              "options": [
                "How the Arctic fox's coat helps it hide",
                "Why Arctic foxes form groups in cold weather",
                "What Arctic foxes eat during the winter months",
                "How scientists track Arctic foxes across the snow"
              ],
              "answer": 0,
              "why": {
                "right": "主旨句是  “Today we're focusing on... the Arctic fox” ，并具体说明它如何躲避天敌和猎",
                "wrong": [
                  "B Why Arctic foxes form groups i…：与正确项不符——主旨句是  “Today we're focusing on... the Arctic …",
                  "C What Arctic foxes eat during t…：与正确项不符——主旨句是  “Today we're focusing on... the Arctic …",
                  "D How scientists track Arctic fo…：与正确项不符——主旨句是  “Today we're focusing on... the Arctic …"
                ]
              }
            },
            {
              "n": 2,
              "q": "According to the teacher, what is \"molting\"?",
              "options": [
                "Hiding in a hole under the snow",
                "Losing old fur and growing a new coat",
                "Changing color by eating certain plants",
                "Sleeping through the coldest months"
              ],
              "answer": 1,
              "why": {
                "right": "“Molting is when an animal loses its old fur and grows a new coat.” 这是直接下定义。",
                "wrong": [
                  "A Hiding in a hole under the sno…：与正确项不符——“Molting is when an animal loses its old fur …",
                  "C Changing color by eating certa…：与正确项不符——“Molting is when an animal loses its old fur …",
                  "D Sleeping through the coldest m…：与正确项不符——“Molting is when an animal loses its old fur …"
                ]
              }
            },
            {
              "n": 3,
              "q": "Why is it useful for the Arctic fox to have a brown or gray coat in summer?",
              "options": [
                "It helps the fox stay warm at night.",
                "It makes the fox look bigger to its enemies.",
                "It matches the rocks and soil after the snow melts.",
                "It protects the fox's skin from strong sunlight."
              ],
              "answer": 2,
              "why": {
                "right": "夏天积雪融化后，地面变成棕灰色并有岩石、土壤和低矮植物",
                "wrong": [
                  "A It helps the fox stay warm at …：与正确项不符——夏天积雪融化后，地面变成棕灰色并有岩石、土壤和低矮植物",
                  "B It makes the fox look bigger t…：与正确项不符——夏天积雪融化后，地面变成棕灰色并有岩石、土壤和低矮植物",
                  "D It protects the fox's skin fro…：与正确项不符——夏天积雪融化后，地面变成棕灰色并有岩石、土壤和低矮植物"
                ]
              }
            },
            {
              "n": 4,
              "q": "Why does the teacher mention the snowshoe hare?",
              "options": [
                "To compare how fast hares and Arctic foxes can run through snow",
                "To show how hares grow larger than Arctic foxes",
                "To explain why Arctic foxes stay away from forests",
                "To show another animal that changes coats with the seasons"
              ],
              "answer": 3,
              "why": {
                "right": "“The Arctic fox isn't the only animal that does this. Take the snowshoe hare as an",
                "wrong": [
                  "A To compare how fast hares and …：与正确项不符——“The Arctic fox isn't the only animal that do…",
                  "B To show how hares grow larger …：与正确项不符——“The Arctic fox isn't the only animal that do…",
                  "C To explain why Arctic foxes st…：与正确项不符——“The Arctic fox isn't the only animal that do…"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Questions 5-8",
          "questions": [
            {
              "n": 5,
              "q": "What is the talk mainly about?",
              "options": [
                "How rivers carry soil and water into the ocean",
                "How people save water at home and at school",
                "Why ocean water tastes saltier than water in lakes",
                "How clouds form and produce rain or snow"
              ],
              "answer": 3,
              "why": {
                "right": "开头明确提出  “how clouds form, and how the water in them falls back... as rain or",
                "wrong": [
                  "A How rivers carry soil and wate…：与正确项不符——开头明确提出  “how clouds form, and how the water i…",
                  "B How people save water at home …：与正确项不符——开头明确提出  “how clouds form, and how the water i…",
                  "C Why ocean water tastes saltier…：与正确项不符——开头明确提出  “how clouds form, and how the water i…"
                ]
              }
            },
            {
              "n": 6,
              "q": "According to the teacher, what is the correct order of the process?",
              "options": [
                "Clouds form → water evaporates → vapor cools → rain falls",
                "Water evaporates → vapor rises and cools → clouds form → rain or snow falls",
                "Vapor cools → water evaporates → rain falls → clouds form",
                "Rain falls → clouds form → water evaporates → vapor cools"
              ],
              "answer": 1,
              "why": {
                "right": "信号词串联出顺序： evaporation （水蒸发） → warm, moist air rises and cools （上升冷",
                "wrong": [
                  "A Clouds form → water evaporates…：与正确项不符——信号词串联出顺序： evaporation （水蒸发） → warm, moist air…",
                  "C Vapor cools → water evaporates…：与正确项不符——信号词串联出顺序： evaporation （水蒸发） → warm, moist air…",
                  "D Rain falls → clouds form → wat…：与正确项不符——信号词串联出顺序： evaporation （水蒸发） → warm, moist air…"
                ]
              }
            },
            {
              "n": 7,
              "q": "What is the role of condensation nuclei?",
              "options": [
                "They heat the air so that water vapor can rise.",
                "They break large raindrops into smaller ones.",
                "They give water vapor a surface to collect on.",
                "They stop clouds from moving too fast."
              ],
              "answer": 2,
              "why": {
                "right": "凝结核是尘埃、海盐或烟等微小颗粒，为水蒸气提供附着、聚集成水滴的表面。",
                "wrong": [
                  "A They heat the air so that wate…：与正确项不符——凝结核是尘埃、海盐或烟等微小颗粒，为水蒸气提供附着、聚集成水滴的表面。",
                  "B They break large raindrops int…：与正确项不符——凝结核是尘埃、海盐或烟等微小颗粒，为水蒸气提供附着、聚集成水滴的表面。",
                  "D They stop clouds from moving t…：与正确项不符——凝结核是尘埃、海盐或烟等微小颗粒，为水蒸气提供附着、聚集成水滴的表面。"
                ]
              }
            },
            {
              "n": 8,
              "q": "What can be inferred about a cloud that does not produce rain?",
              "options": [
                "Its droplets are still too small and light to fall.",
                "It contains no water at all.",
                "It is too close to the ground.",
                "It is made only of dust and salt."
              ],
              "answer": 0,
              "why": {
                "right": "云滴很小、很轻，空气能托住它们",
                "wrong": [
                  "B It contains no water at all.：与正确项不符——云滴很小、很轻，空气能托住它们",
                  "C It is too close to the ground.：与正确项不符——云滴很小、很轻，空气能托住它们",
                  "D It is made only of dust and sa…：与正确项不符——云滴很小、很轻，空气能托住它们"
                ]
              }
            }
          ]
        },
        {
          "key": "a2",
          "label": "Questions 9-12",
          "questions": [
            {
              "n": 9,
              "q": "What is the main topic of the talk?",
              "options": [
                "Why the Romans built tall stone bridges",
                "How rich Roman families paid for their water",
                "How the Romans used aqueducts to bring water to their cities",
                "Why modern cities no longer need water from mountains"
              ],
              "answer": 2,
              "why": {
                "right": "讲座从 “ 百万人口城市如何获得干净水 ” 引出古罗马用  aqueducts 把远处水源引入城市。",
                "wrong": [
                  "A Why the Romans built tall ston…：与正确项不符——讲座从 “ 百万人口城市如何获得干净水 ” 引出古罗马用  aqueducts 把远处水源…",
                  "B How rich Roman families paid f…：与正确项不符——讲座从 “ 百万人口城市如何获得干净水 ” 引出古罗马用  aqueducts 把远处水源…",
                  "D Why modern cities no longer ne…：与正确项不符——讲座从 “ 百万人口城市如何获得干净水 ” 引出古罗马用  aqueducts 把远处水源…"
                ]
              }
            },
            {
              "n": 10,
              "q": "According to the teacher, why did most aqueducts run underground?",
              "options": [
                "To keep water cool, clean, and safe from enemies",
                "To make water channels shorter and much cheaper to build",
                "To prevent ordinary people from finding and using the water",
                "To make water flow faster through tunnels into the city"
              ],
              "answer": 0,
              "why": {
                "right": "原文说大部分水道在地下，这样可以保持水凉爽、干净，并保护水源不受敌人破坏。",
                "wrong": [
                  "B To make water channels shorter…：与正确项不符——原文说大部分水道在地下，这样可以保持水凉爽、干净，并保护水源不受敌人破坏。",
                  "C To prevent ordinary people fro…：与正确项不符——原文说大部分水道在地下，这样可以保持水凉爽、干净，并保护水源不受敌人破坏。",
                  "D To make water flow faster thro…：与正确项不符——原文说大部分水道在地下，这样可以保持水凉爽、干净，并保护水源不受敌人破坏。"
                ]
              }
            },
            {
              "n": 11,
              "q": "According to the teacher, what is a \"gradient\"?",
              "options": [
                "A large storage tank that holds the city's water",
                "A powerful pump that pushes water up a hill",
                "A row of stone arches supporting a water channel",
                "A slight downward slope that lets water flow"
              ],
              "answer": 3,
              "why": {
                "right": "“gradient — that is, a very slight downward slope” 是破折号加  that is 的释义，指轻微的",
                "wrong": [
                  "A A large storage tank that hold…：与正确项不符——“gradient — that is, a very slight downward s…",
                  "B A powerful pump that pushes wa…：与正确项不符——“gradient — that is, a very slight downward s…",
                  "C A row of stone arches supporti…：与正确项不符——“gradient — that is, a very slight downward s…"
                ]
              }
            },
            {
              "n": 12,
              "q": "What can be inferred about how water was shared in Roman cities?",
              "options": [
                "Rich families received water before everyone else.",
                "Public needs came before private homes.",
                "Only people who paid could use the fountains.",
                "The public baths received the least water."
              ],
              "answer": 1,
              "why": {
                "right": "水先送往公共喷泉，再到公共浴场，最后才供给富裕家庭，说明公共需要优先于私人住",
                "wrong": [
                  "A Rich families received water b…：与正确项不符——水先送往公共喷泉，再到公共浴场，最后才供给富裕家庭，说明公共需要优先于私人住",
                  "C Only people who paid could use…：与正确项不符——水先送往公共喷泉，再到公共浴场，最后才供给富裕家庭，说明公共需要优先于私人住",
                  "D The public baths received the …：与正确项不符——水先送往公共喷泉，再到公共浴场，最后才供给富裕家庭，说明公共需要优先于私人住"
                ]
              }
            }
          ]
        }
      ],
      "audio": [
        {
          "label": "Q1-4 音频",
          "url": "https://ilxwp.speiyou.com/peiQi/?url=4001"
        },
        {
          "label": "Q5-8 音频",
          "url": "https://ilxwp.speiyou.com/peiQi/?url=4002"
        },
        {
          "label": "Q9-12 音频",
          "url": "https://bnokj.speiyou.com/peiQi/?url=4003"
        }
      ],
      "audioNote": "以上链接来自原讲义二维码（扫描后跳转）。听力每段只播放一次，可先读题干与选项再播放。",
      "transcript": [
        {
          "label": "Q1–Q4",
          "text": "Narrator: Listen to a teacher in a science class.\nTeacher: Good morning, class. Today we're focusing on an animal that lives in one of the coldest places on\nEarth — the Arctic fox. In particular, I want to look at how it hides from its enemies and from the animals it\nhunts.\nTeacher: First, let's start with a key word: camouflage. Camouflage means colors or patterns that help an\nanimal blend in with its surroundings, so that other animals can't see it easily.\nTeacher: In winter, the Arctic fox has a thick white coat. Against the snow and ice, it's almost invisible. This\nhelps it sneak up on small animals, and it also helps it hide from larger hunters, like wolves and polar bears.\nTeacher: But here's the interesting part. The Arctic doesn't stay white all year. In summer, much of the snow\nmelts, and the ground turns brown and gray, with rocks, soil and low plants. A white fox would stand out\nclearly. So the fox goes through a process called molting. Molting is when an animal loses its old fur and\ngrows a new coat. In spring, the Arctic fox loses its white winter fur and grows a thinner brown or gray coat.\nBecause of this, it matches the rocks and soil around it. Then in autumn, it molts again and grows its white\ncoat back.\nTeacher: The Arctic fox isn't the only animal that does this. Take the snowshoe hare as an example. It lives in\nthe forests of North America, and it also turns white in winter and brown in summer.\nTeacher: So, the main point is this: for these animals, changing coats with the seasons is a matter of survival.\nFor next class, please find one more animal that uses camouflage."
        },
        {
          "label": "Q5–Q8",
          "text": "Narrator: Listen to a teacher in an earth science class.\nTeacher: OK, everyone, let's get started. Have you ever looked up at a cloud and wondered what it's actually\nmade of? What I want to discuss today is how clouds form, and how the water in them falls back to the\nground as rain or snow.\nTeacher: It all begins with evaporation. When the sun heats oceans, lakes and rivers, some of the water turns\ninto water vapor — that is, water in the form of a gas. We can't see it, but it's in the air all around us.\nTeacher: Then, this warm, moist air rises. As it goes higher, it expands and cools down. As the air cools,\nsome of the water vapor begins to turn back into tiny drops of liquid water. This is condensation.\nTeacher: But there's one more thing water vapor needs. It can't easily form drops on its own. It needs\nsomething to collect on. Scientists call these tiny bits condensation nuclei. They're very small pieces of dust,\nsalt from the ocean, or even smoke, floating in the air. Each one gives the vapor a surface to collect on, so a\ndroplet can start to form. Millions and millions of these droplets together make a cloud.\nTeacher: However, not every cloud brings rain. Cloud droplets are extremely small and light, so the air keeps\nthem up. Inside the cloud, the droplets bump into each other and join together. Only when they grow big and\nheavy enough do they fall. This is called precipitation — water falling from clouds as rain, snow, or hail. If\nthe air is cold enough, it falls as snow.\nTeacher: So remember: evaporation, cooling, condensation, and precipitation. The same water goes around\nand around, again and again."
        },
        {
          "label": "Q9–Q12",
          "text": "Narrator: Listen to a teacher in a history class.\nTeacher: Good afternoon, everyone. Imagine a city of one million people, but with no electric pumps and no\nelectricity. How would everyone get clean water? Today I'd like to talk about how the ancient Romans solved\nthis problem by building aqueducts.\nTeacher: So, what is an aqueduct? The word refers to a long channel that carries water from a distant source,\nlike a lake or a spring in the mountains, all the way to a city. Some aqueducts were more than eighty\nkilometers long.\nTeacher: Now, you might picture tall stone bridges with rows of arches. Those bridges are famous, and some\nof them are still standing today. But actually, most of an aqueduct ran underground, in tunnels or covered\nchannels. This kept the water cool and clean, and it also protected the water from enemies.\nTeacher: So how did the water move without pumps? The Romans used gravity. The engineers built each\nchannel with a gradient — that is, a very slight downward slope. The slope had to be planned very carefully.\nIf it was too steep, the fast-moving water would damage the channel. If it was too flat, the water would stop\nmoving and become dirty. On some aqueducts, the channel dropped only about thirty centimeters for every\nkilometer it traveled. Because of this, building a single aqueduct could take many years.\nTeacher: When the water reached the city, it flowed into large storage tanks. From there, it was sent first to\npublic fountains, where ordinary people collected water for free. Next, it went to the public baths. And finally,\nwhatever was left went to the homes of rich families, who paid for a private supply.\nTeacher: Why does all this matter? Well, a steady supply of clean water allowed Roman cities to grow much\nlarger than ever before. And the idea didn't disappear. Many modern cities still use gravity to bring drinking\nwater from faraway mountains. For next class, please find one city that still uses an old Roman aqueduct\ntoday."
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "题号 答案 解析 1 B “Today we're focusing on something different: how plants protect themselves...” 才是本次 讲座主题；上周讲植物如何制造食物只是背景。 2 B “What I want to discuss today is why the Moon seems to change its shape...” 直接点题； 小测提醒属于课前通知。 3 A “Have you ever wondered why...?” 提出问题，后文说明彩虹颜色为何总按固定顺序出 4 C “Actually, that's not true” 先否定误解，随后用  “Today I'd like to talk about...” 引出长城长 期修建、重建的主题。 题号 答案 解析 1 C “which means” 是下定义路标； nocturnal 指主要在夜间活动。 caves 只是白天休息的地 2 A “in other words” 引出同义重述； deciduous trees 指每年秋天落叶的树。后面对松树的描 述是反向对比。 3 B “or” 引出同位语释义； condensation 是水蒸气变成液态水。 4 A “For instance” 后列出狮子捕猎斑马、鹰捕捉兔子，可归纳出  predator 是捕食其他动物的 题号 答案 解析 1 A “First... Second...” 表示顺承列举，后面将继续介绍蜜蜂帮助农民的另一种方式。 2 A “However” 表示转折，后面的基因研究会推翻 “ 更接近浣熊 ” 的旧观点：大熊猫属于熊科。 3 B “Because of this” 和  “Consequently” 构成因果链：少雨导致土壤干燥，进而出现沙尘暴并 迫使农民离开。 4 C “The first type... The second type... The third type...” 表示按类别逐一介绍。 题号 答案 解析 1 A 北极燕鸥每年往返约  70,000 千米，用来具体说明某些鸟类迁徙距离非常远。 2 B 鲸鱼能听到数百千米外的叫声，是 “ 声音在水中传播很远 ” 的例子。 3 A 地上的木棍和移动的影子说明古埃及人如何用影子判断时间。 4 B 森林地面的植物几乎照不到阳光却能健康生长，说明有些植物只需要较少光照。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "动词时态（二）",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "As shown on the school calendar, this school year's Annual Science Fair at 9:00 a.m. ______",
              "options": [
                "opens",
                "opened",
                "has opened",
                "was opening"
              ],
              "answer": 0,
              "why": {
                "right": "opens： As shown on the school calendar 表示校历上的固定安排，用一般现在时表将",
                "wrong": [
                  "B opened：与正确项不符——opens： As shown on the school calendar 表示校历上的…",
                  "C has opened：与正确项不符——opens： As shown on the school calendar 表示校历上的…",
                  "D was opening：与正确项不符——opens： As shown on the school calendar 表示校历上的…"
                ]
              }
            },
            {
              "n": 2,
              "q": "This year, three scientists from a local university to judge the projects. Ms. Park has ______",
              "options": [
                "came",
                "are coming",
                "have come",
                "were coming"
              ],
              "answer": 1,
              "why": {
                "right": "are coming： Ms. Park has already invited them ，说明三位科学家已经确定会来，用现",
                "wrong": [
                  "A came：与正确项不符——are coming： Ms. Park has already invited them…",
                  "C have come：与正确项不符——are coming： Ms. Park has already invited them…",
                  "D were coming：与正确项不符——are coming： Ms. Park has already invited them…"
                ]
              }
            },
            {
              "n": 3,
              "q": "Please bring your project to the gym before 8:30 a.m. As soon as you , a teacher will ______",
              "options": [
                "will arrive",
                "arrived",
                "arrive",
                "had arrived"
              ],
              "answer": 2,
              "why": {
                "right": "arrive： as soon as 引导时间状语从句，主句用  will ，从句用一般现在时。",
                "wrong": [
                  "A will arrive：与正确项不符——arrive： as soon as 引导时间状语从句，主句用  will ，从句用一般现…",
                  "B arrived：与正确项不符——arrive： as soon as 引导时间状语从句，主句用  will ，从句用一般现…",
                  "D had arrived：与正确项不符——arrive： as soon as 引导时间状语从句，主句用  will ，从句用一般现…"
                ]
              }
            },
            {
              "n": 4,
              "q": "At 10:00 a.m., the judges around the gym and asking questions, so please stay ______",
              "options": [
                "walk",
                "walked",
                "have walked",
                "will be walking"
              ],
              "answer": 3,
              "why": {
                "right": "will be walking： At 10:00 a.m. 指将来的具体时刻，且与  asking questions 并列，表示届",
                "wrong": [
                  "A walk：与正确项不符——will be walking： At 10:00 a.m. 指将来的具体时刻，且与  a…",
                  "B walked：与正确项不符——will be walking： At 10:00 a.m. 指将来的具体时刻，且与  a…",
                  "C have walked：与正确项不符——will be walking： At 10:00 a.m. 指将来的具体时刻，且与  a…"
                ]
              }
            },
            {
              "n": 5,
              "q": "If your project electricity, please tell Mr. Grant by Wednesday. ______",
              "options": [
                "needs",
                "will need",
                "needed",
                "had needed"
              ],
              "answer": 0,
              "why": {
                "right": "needs： if 引导条件状语从句，从句用一般现在时",
                "wrong": [
                  "B will need：与正确项不符——needs： if 引导条件状语从句，从句用一般现在时",
                  "C needed：与正确项不符——needs： if 引导条件状语从句，从句用一般现在时",
                  "D had needed：与正确项不符——needs： if 引导条件状语从句，从句用一般现在时"
                ]
              }
            },
            {
              "n": 6,
              "q": "Our school band at the opening ceremony. The members have already chosen three ______",
              "options": [
                "performed",
                "is performing",
                "has performed",
                "had performed"
              ],
              "answer": 1,
              "why": {
                "right": "is performing：乐队已经选好歌曲，演出是已经安排好的将来计划。",
                "wrong": [
                  "A performed：与正确项不符——is performing：乐队已经选好歌曲，演出是已经安排好的将来计划。",
                  "C has performed：与正确项不符——is performing：乐队已经选好歌曲，演出是已经安排好的将来计划。",
                  "D had performed：与正确项不符——is performing：乐队已经选好歌曲，演出是已经安排好的将来计划。"
                ]
              }
            },
            {
              "n": 7,
              "q": "While the judges are scoring the projects in the afternoon, the Science Club free ______",
              "options": [
                "was serving",
                "served",
                "will be serving",
                "has served"
              ],
              "answer": 2,
              "why": {
                "right": "will be serving： While the judges are scoring... 表示下午某段时间，主句用将来进行时",
                "wrong": [
                  "A was serving：与正确项不符——will be serving： While the judges are scoring…",
                  "B served：与正确项不符——will be serving： While the judges are scoring…",
                  "D has served：与正确项不符——will be serving： While the judges are scoring…"
                ]
              }
            },
            {
              "n": 8,
              "q": "Finally, the award ceremony at 3:30 p.m., as printed in the program. Parents are ______",
              "options": [
                "begins",
                "began",
                "has begun",
                "was beginning"
              ],
              "answer": 0,
              "why": {
                "right": "begins： as printed in the program 表示节目单上的固定时间，用一般现在时表将来。",
                "wrong": [
                  "B began：与正确项不符——begins： as printed in the program 表示节目单上的固定时间…",
                  "C has begun：与正确项不符——begins： as printed in the program 表示节目单上的固定时间…",
                  "D was beginning：与正确项不符——begins： as printed in the program 表示节目单上的固定时间…"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Questions 9-16",
          "questions": [
            {
              "n": 9,
              "q": "I've been at the Marine Biology Summer Camp for ten days now, and I an ______",
              "options": [
                "write",
                "wrote",
                "have been writing",
                "had been writing"
              ],
              "answer": 2,
              "why": {
                "right": "have been writing： for ten days 、 since I arrived 、 every evening 共同说明从过去持续",
                "wrong": [
                  "A write：与正确项不符——have been writing： for ten days 、 since I arr…",
                  "B wrote：与正确项不符——have been writing： for ten days 、 since I arr…",
                  "D had been writing：与正确项不符——have been writing： for ten days 、 since I arr…"
                ]
              }
            },
            {
              "n": 10,
              "q": "our instructor how to use the underwater cameras. ______",
              "options": [
                "shows and explaining",
                "had shown and explained",
                "showed and explained",
                "will be explaining"
              ],
              "answer": 1,
              "why": {
                "right": "showed and explained： Before we left the harbor 是过去时间，讲解发生在出港前，用",
                "wrong": [
                  "A shows and explaining：与正确项不符——showed and explained： Before we left the harb…",
                  "C showed and explained：与正确项不符——showed and explained： Before we left the harb…",
                  "D will be explaining：与正确项不符——showed and explained： Before we left the harb…"
                ]
              }
            },
            {
              "n": 11,
              "q": "By the time we reached the coral reef, we had already all our equipment twice. ______",
              "options": [
                "checking",
                "have checked",
                "checked",
                "check"
              ],
              "answer": 2,
              "why": {
                "right": "checked：结构是  had already checked",
                "wrong": [
                  "A checking：与正确项不符——checked：结构是  had already checked",
                  "B have checked：与正确项不符——checked：结构是  had already checked",
                  "D check：与正确项不符——checked：结构是  had already checked"
                ]
              }
            },
            {
              "n": 12,
              "q": "The water was so clear! We watching a group of dolphins for almost an hour when dark ______",
              "options": [
                "had been",
                "have been",
                "are",
                "will be"
              ],
              "answer": 0,
              "why": {
                "right": "had been：结构是  had been watching",
                "wrong": [
                  "B have been：与正确项不符——had been：结构是  had been watching",
                  "C are：与正确项不符——had been：结构是  had been watching",
                  "D will be：与正确项不符——had been：结构是  had been watching"
                ]
              }
            },
            {
              "n": 13,
              "q": "Luckily, we had a captain the weather report that morning, so he was ready for ______",
              "options": [
                "which had checked",
                "who checking",
                "who had checked",
                "whose had checked"
              ],
              "answer": 2,
              "why": {
                "right": "who had checked： captain 是人，用  who",
                "wrong": [
                  "A which had checked：与正确项不符——who had checked： captain 是人，用  who",
                  "B who checking：与正确项不符——who had checked： captain 是人，用  who",
                  "D whose had checked：与正确项不符——who had checked： captain 是人，用  who"
                ]
              }
            },
            {
              "n": 14,
              "q": "We to the camp safely at about six o'clock that evening. ______",
              "options": [
                "return",
                "returned",
                "had return",
                "returning"
              ],
              "answer": 1,
              "why": {
                "right": "returned： at about six o'clock that evening 是明确的过去时间，用一般过去时。",
                "wrong": [
                  "A return：与正确项不符——returned： at about six o'clock that evening 是…",
                  "C had return：与正确项不符——returned： at about six o'clock that evening 是…",
                  "D returning：与正确项不符——returned： at about six o'clock that evening 是…"
                ]
              }
            },
            {
              "n": 15,
              "q": "Since then, my team the photos we took on the reef. ______",
              "options": [
                "studies",
                "studied",
                "had been studying",
                "has been studying"
              ],
              "answer": 3,
              "why": {
                "right": "has been studying： Since then 表示从那时一直到现在，用现在完成进行时。",
                "wrong": [
                  "A studies：与正确项不符——has been studying： Since then 表示从那时一直到现在，用现在完…",
                  "B studied：与正确项不符——has been studying： Since then 表示从那时一直到现在，用现在完…",
                  "C had been studying：与正确项不符——has been studying： Since then 表示从那时一直到现在，用现在完…"
                ]
              }
            },
            {
              "n": 16,
              "q": "So far, twelve different kinds of fish in our photographs. I can't wait to show ______",
              "options": [
                "have identified",
                "are identifying",
                "have been identified",
                "had been identified"
              ],
              "answer": 2,
              "why": {
                "right": "have been identified： fish 是被识别出来的对象， So far 表示截至目前的结果，使用现",
                "wrong": [
                  "A have identified：与正确项不符——have been identified： fish 是被识别出来的对象， So far …",
                  "B are identifying：与正确项不符——have been identified： fish 是被识别出来的对象， So far …",
                  "D had been identified：与正确项不符——have been identified： fish 是被识别出来的对象， So far …"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Questions 17-24",
          "questions": [
            {
              "n": 17,
              "q": "By the end of 2040, for sixteen years without a break, and their ______",
              "options": [
                "has been successful",
                "was successfully completed",
                "was successful completed",
                "will have succeeded"
              ],
              "answer": 1,
              "why": {
                "right": "was successfully completed： in 1990 是明确过去时间，且  launch 与  complete 在句中",
                "wrong": [
                  "A has been successful：与正确项不符——was successfully completed： in 1990 是明确过去时间，且…",
                  "C was successful completed：与正确项不符——was successfully completed： in 1990 是明确过去时间，且…",
                  "D will have succeeded：与正确项不符——was successfully completed： in 1990 是明确过去时间，且…"
                ]
              }
            },
            {
              "n": 18,
              "q": "The mission schedule explains what at midnight on July 1, 2041, ______",
              "options": [
                "has produced a large number of",
                "had produced a great deal of",
                "had produced a large number of",
                "will produce several"
              ],
              "answer": 2,
              "why": {
                "right": "had produced a large number of： By the time Hubble reached... in 2020 以过去时作参",
                "wrong": [
                  "A has produced a large number of：与正确项不符——had produced a large number of： By the time H…",
                  "B had produced a great deal of：与正确项不符——had produced a large number of： By the time H…",
                  "D will produce several：与正确项不符——had produced a large number of： By the time H…"
                ]
              }
            },
            {
              "n": 19,
              "q": "Webb's engineers instruments continuously for several years, right up to the ______",
              "options": [
                "have been checking the",
                "had been checking their",
                "had been checking them",
                "will perform tests on its"
              ],
              "answer": 1,
              "why": {
                "right": "had been checking their： Before its December 2021 launch + for several years 表示发",
                "wrong": [
                  "A have been checking the：与正确项不符——had been checking their： Before its December …",
                  "C had been checking them：与正确项不符——had been checking their： Before its December …",
                  "D will perform tests on its：与正确项不符——had been checking their： Before its December …"
                ]
              }
            },
            {
              "n": 20,
              "q": "Scientists currently use measurements that Webb's detectors since ______",
              "options": [
                "will soon transmit regularly",
                "have been sending steady",
                "has been sending steadily",
                "have been sending steadily"
              ],
              "answer": 3,
              "why": {
                "right": "have been sending steadily： detectors 是复数，且  since scientific observations began",
                "wrong": [
                  "A will soon transmit regularly：与正确项不符——have been sending steadily： detectors 是复数，且  …",
                  "B have been sending steady：与正确项不符——have been sending steadily： detectors 是复数，且  …",
                  "C has been sending steadily：与正确项不符——have been sending steadily： detectors 是复数，且  …"
                ]
              }
            },
            {
              "n": 21,
              "q": "instruments once that the cover is fully open. Until then, the ______",
              "options": [
                "the sensor that checks it reports",
                "the sensor that checks it will report",
                "the sensor whose checks it reports",
                "these sensors has reported"
              ],
              "answer": 0,
              "why": {
                "right": "the sensor that checks it reports： once 引导时间状语从句，表示将来时从句用一般现",
                "wrong": [
                  "B the sensor that checks it will…：与正确项不符——the sensor that checks it reports： once 引导时间状…",
                  "C the sensor whose checks it rep…：与正确项不符——the sensor that checks it reports： once 引导时间状…",
                  "D these sensors has reported：与正确项不符——the sensor that checks it reports： once 引导时间状…"
                ]
              }
            },
            {
              "n": 22,
              "q": "deadline, astronomers map of the surveyed galaxies, ready for ______",
              "options": [
                "had produced an accurate",
                "will have created an detailed digital",
                "will have created a detailed digital",
                "will have created a detailed digitally"
              ],
              "answer": 2,
              "why": {
                "right": "will have created a detailed digital： By that deadline 表示到  2040 年前应已完成，用",
                "wrong": [
                  "A had produced an accurate：与正确项不符——will have created a detailed digital： By that…",
                  "B will have created an detailed …：与正确项不符——will have created a detailed digital： By that…",
                  "D will have created a detailed d…：与正确项不符——will have created a detailed digital： By that…"
                ]
              }
            },
            {
              "n": 23,
              "q": "By the end of 2040, for sixteen years without a break, and their ______",
              "options": [
                "them will have been collaborating",
                "they had worked together",
                "will they have been collaborating",
                "they will have been collaborating"
              ],
              "answer": 3,
              "why": {
                "right": "they will have been collaborating： By the end of 2040 + for sixteen years 表示持续到",
                "wrong": [
                  "A them will have been collaborat…：与正确项不符——they will have been collaborating： By the end…",
                  "B they had worked together：与正确项不符——they will have been collaborating： By the end…",
                  "C will they have been collaborat…：与正确项不符——they will have been collaborating： By the end…"
                ]
              }
            },
            {
              "n": 24,
              "q": "The mission schedule explains what at midnight on July 1, 2041, ______",
              "options": [
                "will its cameras be recording",
                "its cameras will be recording",
                "its cameras had already recorded",
                "a camera will be record"
              ],
              "answer": 1,
              "why": {
                "right": "its cameras will be recording： explains what 引导宾语从句，使用陈述语序",
                "wrong": [
                  "A will its cameras be recording：与正确项不符——its cameras will be recording： explains what …",
                  "C its cameras had already record…：与正确项不符——its cameras will be recording： explains what …",
                  "D a camera will be record：与正确项不符——its cameras will be recording： explains what …"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "A. 状态动词 题号 答案 依据 1 knows know 表示状态，不用进行时。 2 belongs belong 表示所属关系，不用进行时。 3 haveknow 是状态动词，和  for five years 连用用现在完成时。 known 4 is having have dinner 表示正在进行的活动，此处可以用进行时。 5 has have two younger brothers 表示拥有关系，用一般现在时。 6 think think 表示观点 “ 认为 ” ，不用进行时。 7 am thinking think about 表示正在思考，属于可进行的动作。 8 is tasting 厨师正在品尝汤来检查味道，表示当前动作。 B. 瞬间动词与延续性动词 题号 答案 依据 1 has justonly a moment ago 与  just 呼应，表示刚刚到达。 arrived 2 has beenleave 是瞬间动作；持续两小时要改成  be away 。 away 3 have had buy 是瞬间动作；从三月一直拥有相机用  have had 。 4 haven'tsince Monday 与现在完成时连用，表示到现在仍未收到。 received 5 has been ajoin 是瞬间动作；持续三年要改成  be a member of 。 member of 6 has been电影开始是瞬间动作；持续二十分钟用  be on 。 7 haveown 表示持续拥有： have owned this bike for two years 。 owned 8 has had borrow 是瞬间动作；持续拥有词典用  has had 。 9 have beenarrive 是瞬间动作；仍在城里用  have been in this town 。 10 has beenleave 是瞬间动作；离开后一直未回来用  has been away from 。 away from 11 has been ajoin 是瞬间动作；仍是成员用  has been a member of 。 member of 题号 答案 依据 12 has beendie 是瞬间动作；持续两年用  be dead 。 dead C. 现在进行时  / 一般现在时表将来 题号 答案 依据 1 leaves According to the timetable 表示时刻表上的固定安排，用一般现在时表将来。 2 is arriving 已经买好票，说明到达是确定的个人安排，用现在进行时表将来。 3 opens According to its opening schedule 表示按开放时间表执行，用一般现在时。 4 are having 场地已经预订，聚会属于已经安排好的计划，用现在进行时。 5 get as soon as 引导将来的时间状语从句，遵循主将从现。 6 rains if 引导将来的条件状语从句，从句用一般现在时。 7 starts 校历上的既定日程用一般现在时表将来。 8 are you答句说明周末已有安排，问句用现在进行时表将来。 doing D. 将来进行时 题号 答案 依据 1 will beat eight tonight 指将来某一时刻正在进行的动作。 watching 2 will beThis time next week 指下周此时正在进行。 flying 3 will beAt 10 a.m. tomorrow 指将来的具体时刻。 taking 4 Will you be用将来进行时委婉询问对方下午是否会使用电脑。 using 5 will bein a few minutes 表示按正常进程即将发生；本题目标是将来进行时， are arriving / will arrivingarrive 也可表达自然语义。 6 will beWhen you get... 的时间从句用一般现在时，主句表示到站时我正在等候。 waiting E. 一般过去时  / 现在完成时  / 过去完成时 题号 答案 依据 1 havethree times so far 表示截至目前的经历。 visited 2 visited last summer 是明确的过去时间。 3 had already电影开场早于我们到达影院，是 “ 过去的过去 ” 。 started 4 has lived since 2020 表示从过去持续到现在； has been living 也可表达持续性。 题号 答案 依据 5 had left 客人在我到达派对前已经离开。 6 reached in 1492 是历史上的明确过去时间。 7 had lost told 是过去时，丢钥匙发生在告诉我之前。 8 Have youever 用于询问到目前为止的经历。 ever tried 9 haven'tsince he moved... 要求主句使用现在完成时的否定形式。 seen 10 had never在她来中国之前从未使用过筷子，是过去的过去。 used F. 现在完成时  / 现在完成进行时 题号 答案 依据 1 have beensince lunch 且只读到第  50 页，强调动作一直持续。 reading 2 has written three emails 强调已经完成的数量，用现在完成时。 3 Have you眼睛发红是持续动作留下的眼前迹象，用现在完成进行时。 been crying 4 haveknow 是状态动词，通常不用进行时。 known 5 has beenall day 且现在还没有停止，强调持续过程。 raining 6 haveat last 强调模型终于完成，关注结果。 finished G. 过去完成时  / 过去完成进行时 题号 答案 依据 1 had left 火车开走是一次性完成动作，不用进行时。 2 had beenall afternoon 且手很脏，强调此前持续工作留下的结果； had worked 也可接受。 working 3 had written four novels 强调到  2019 年已经完成的数量。 4 had beenfor hours 且地面湿，强调此前持续下雨； had rained 也可接受。 raining 5 had beenfor an hour when... 强调老师进来前一直在谈； had talked 也可接受。 talking 6 had passed pass the exam 是一次性结果，用过去完成时。 H. 将来完成时  / 将来完成进行时 题号 答案 依据 1 will haveall three book reports 强调到下周五完成的数量和结果。 finished 2 will havefive new subway lines 强调到  2030 年已经建成的结果。 built 3 will havefor forty minutes 强调等待一直持续到公交车到来； will have waited 也合乎语法，但更强 been调累计时长。 waiting 4 will havefifty English books 是到年底完成的数量。 read 5 will havefor thirty years 且工作仍未停止，优先用将来完成进行时； will have worked 也可接受。 been working 6 will havemore than 100 times 强调练习次数和完成结果。 practiced I. 时态综合操练 题号 答案 依据 1 takes off According to the schedule 表示固定时刻表，使用一般现在时表将来。 2 comes until 引导时间状语从句，遵循主将从现。 3 will beThis time tomorrow 表示明天此时正在进行。 sitting 4 will haveBy the end of next year 表示到将来某时已完成。 built 5 have...How long + For six years 且学习仍在继续，用现在完成进行时； have learned 也可接 been受。 learning 6 had already警察到达前小偷已经逃走， already 放在  had 与过去分词之间。 7 had beenwas tired 与  for two hours 说明此前持续打球。 playing 8 met in 2019 是明确的过去时间。 9 are leaving 行李已经收好，说明去机场是确定安排； will leave / are going to leave 也可接受。 10 will haveBy next June + married for twenty years 表示到将来某时已持续二十年； be 是状态动词。 been 11 has justjust 且现在可以看电视，强调刚刚完成的结果。 finished 12 will haveBy the time... + for twelve years 强调学习持续到将来参照点； will have studied 也可接 been受。 studying"
        }
      ]
    }
  ]
}
