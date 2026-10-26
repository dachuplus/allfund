/**
 * 小托福加油站 · Week 5（听力 + 语用（动词时态 · 二））
 *
 * 数据来源：Week 讲义 PDF（题目、选项、专项练习）+ 答案解析 PDF（答案、简析、听力原文）。
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
          "title": "A. 捕捉讲座主旨",
          "prompt": "阅读下列讲座开头，划出主旨句，选出讲座的主题。\n1.\nTeacher: Good morning, everyone. Last week we talked about how plants make food from sunlight.\nToday we're focusing on something different: how plants protect themselves from the animals that want to\neat them. Some plants grow sharp thorns, and others produce chemicals that taste terrible.\nWhat is the talk mainly about?\nA. How plants make food from sunlight\nB. How plants defend themselves against animals\nC. Why some animals eat only plants\n2.\nTeacher: OK, class, before we start, don't forget the quiz on Friday. Now, what I want to discuss today is\nwhy the Moon seems to change its shape during the month. As you'll see, the Moon itself doesn't really\nchange at all.\nWhat is the talk mainly about?\nA. The quiz on Friday\nB. Why the Moon's shape seems to change\nC. How far the Moon is from Earth\n2\n3.\nTeacher: You've probably all seen a rainbow after a storm. But have you ever wondered why the colors\nalways appear in the same order — red on the outside, violet on the inside? That's the question we'll try to\nanswer this morning.\nWhat is the talk mainly about?\nA. Why the colors of a rainbow appear in a fixed order\nB. Where storms usually come from\nC. How to take good photos of rainbows\n4.\nTeacher: Many people think that the Great Wall was built all at once by one emperor. Actually, that's not\ntrue. Today I'd like to talk about how the wall was built and rebuilt over more than two thousand years.\nWhat is the talk mainly about?\nA. The emperor who built the whole wall\nB. Why so many tourists visit the Great Wall\nC. How the Great Wall was built over a long period of time",
          "answer": "1 B “Today we're focusing on something different: how plants protect themselves...” 才是本次；2 B “What I want to discuss today is why the Moon seems to change its shape...” 直接点题；；3 A “Have you ever wondered why...?” 提出问题，后文说明彩虹颜色为何总按固定顺序出；4 C “Actually, that's not true” 先否定误解，随后用  “Today I'd like to talk about...” 引出长城长",
          "note": "讲座主旨句通常在开头（Today we're focusing on... / I'd like to talk about... / What I want to discuss is...），结尾常常重申。只覆盖某一个细节的选项是干扰项，不能充当主旨。"
        },
        {
          "title": "B. 借助语境线索推断词汇含义",
          "prompt": "阅读下列讲座片段和题干，划出原文中解释题干中加引号生词的部分，然后选出生词的意思。\n1.\nTeacher: Owls, bats and many kinds of moths are nocturnal, which means they are active mainly at night.\nDuring the day, they rest in trees, in caves or in other dark places.\nWhat does \"nocturnal\" mean?\nA. Living in caves\nB. Able to fly\nC. Active mainly at night\n2.\nTeacher: In this part of the country, most forests are made up of deciduous trees — in other words, trees\nthat lose their leaves every autumn. Pine trees are different. They stay green all year round.\nWhat are \"deciduous trees\"?\nA. Trees that lose their leaves every autumn\nB. Trees that stay green all year\nC. Trees that grow only in cold places\n3.\nTeacher: Water vapor can go through the process of condensation, or the change of water vapor into\nliquid water. You can see it on a hot day, when tiny drops form on the outside of a cold glass of juice.\nWhat happens during \"condensation\"?\nA. Liquid water turns into ice.\nB. Water vapor turns into liquid water.\nC. Water disappears into the air.\n3\n4.\nTeacher: Every grassland has its predators. For instance, lions hunt zebras, and eagles catch rabbits.\nWithout them, there would soon be far too many plant-eating animals.\nWhat is a \"predator\"?\nA. An animal that hunts and eats other animals\nB. An animal that eats only grass\nC. An animal that always lives in large groups",
          "answer": "1 C “which means” 是下定义路标； nocturnal 指主要在夜间活动。 caves 只是白天休息的地；2 A “in other words” 引出同义重述； deciduous trees 指每年秋天落叶的树。后面对松树的描；3 B “or” 引出同位语释义； condensation 是水蒸气变成液态水。；4 A “For instance” 后列出狮子捕猎斑马、鹰捕捉兔子，可归纳出  predator 是捕食其他动物的",
          "note": "学术生词后面通常会马上给出解释，标志有 which means、that is、in other words、is called、破折号，以及 for instance 引出的例子。答案是这个解释本身，而不是单词的字面意思。"
        },
        {
          "title": "C. 识别逻辑信号词",
          "prompt": "阅读下列讲座片段，划出逻辑信号词，选出最合适的一项。\n1.\nTeacher: Bees are very important to farmers. First, they carry pollen from flower to flower, which helps\nfruit and vegetables grow. Second, bees...\nWhat will the teacher most likely talk about next?\nA. Another way bees help farmers\nB. A problem that bees cause on farms\nC. The history of farming\n2.\nTeacher: For many years, scientists believed that the giant panda was more closely related to raccoons,\nbecause of some features of its skull and teeth. However, newer studies of the panda's genes showed that...\nWhat will the teacher most likely say next?\nA. Pandas are actually a kind of bear.\nB. Raccoons are much larger than people thought.\nC. Scientists stopped studying pandas.\n3.\nTeacher: In the 1930s, very little rain fell on the American Great Plains for several years. Because of this,\nthe dry soil was easily picked up by strong winds. Consequently, huge dust storms covered whole towns,\nand many farmers had to leave their land.\nHow does the teacher organize this information?\nA. By comparing two different places\nB. By describing causes and effects\nC. By listing the steps of an experiment\n4.\nTeacher: Geologists divide rocks into three main types. The first type, igneous rock, forms when hot lava\ncools down. The second type, sedimentary rock, forms from layers of sand and mud. The third type...\nHow does the teacher organize the talk?\nA. By presenting a problem and then a solution\nB. By telling the history of geology in time order\nC. By describing different types one by one\n4",
          "answer": "1 A “First... Second...” 表示顺承列举，后面将继续介绍蜜蜂帮助农民的另一种方式。；2 A “However” 表示转折，后面的基因研究会推翻 “ 更接近浣熊 ” 的旧观点：大熊猫属于熊科。；3 B “Because of this” 和  “Consequently” 构成因果链：少雨导致土壤干燥，进而出现沙尘暴并；4 C “The first type... The second type... The third type...” 表示按类别逐一介绍。",
          "note": "First / Then / Another feature 表示顺承或并列；However / In contrast 表示转折；Because of this / Consequently 表示因果。判断逻辑关系就能推断下文要讲什么。"
        },
        {
          "title": "D. 根据上下文推断例子与细节意图",
          "prompt": "阅读下列讲座片段，选出老师提到加粗内容的目的。\n1.\nTeacher: Some birds travel amazing distances when they migrate. The Arctic tern, for example, flies\nfrom the Arctic to the Antarctic and back again every year — that's about 70,000 kilometers!\nWhy does the teacher mention the Arctic tern?\nA. To show how far some birds can travel\nB. To explain why birds live in cold places\nC. To compare two different kinds of terns\n2.\nTeacher: Sound travels much faster in water than in air, and it can travel very far. That's why whales can\nhear each other's calls from hundreds of kilometers away.\nWhy does the teacher mention whales?\nA. To explain why whales are so large\nB. To give an example of how sound travels far in water\nC. To show that whales are in danger\n3.\nTeacher: The ancient Egyptians didn't have clocks like ours. But think about a simple stick in the\nground. As the sun moves across the sky, the stick's shadow moves too. By watching the shadow, people\ncould tell what time of day it was.\nWhy does the teacher mention a stick in the ground?\nA. To describe a simple way people measured time\nB. To explain how the pyramids were built\nC. To show that the Egyptians liked gardening\n4.\nTeacher: All plants need light to grow, but not all plants need the same amount. Have you ever noticed\nthe plants growing on the floor of a thick forest? Very little sunlight reaches them, yet they stay\nperfectly healthy.\nWhy does the teacher mention the plants on the forest floor?\nA. To explain why forests are being cut down\nB. To show that some plants can grow with little light\nC. To argue that all plants need full sunlight\n5",
          "answer": "1 A 北极燕鸥每年往返约  70,000 千米，用来具体说明某些鸟类迁徙距离非常远。；2 B 鲸鱼能听到数百千米外的叫声，是 “ 声音在水中传播很远 ” 的例子。；3 A 地上的木棍和移动的影子说明古埃及人如何用影子判断时间。；4 B 森林地面的植物几乎照不到阳光却能健康生长，说明有些植物只需要较少光照。",
          "note": "举例是为了支撑某个论点。问「为什么提到 X」时，答案是 X 所支撑的那个观点，而不是 X 这个例子本身的内容。"
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
          "title": "A. 状态动词",
          "prompt": "1. 含义\n状态动词表示认知、感情、拥有、感官感受等状态。这些含义通常不用进行时（包括完成进行时）；根据\n时间关系，选用一般时或完成时。\n例：I know the answer now.（现在知道；× am knowing）／I have known her for three years.（认识已持续三\n年；× have been knowing）\n常见类别 常见动词 表示的状态 例句\n认知、观点 know, understand,知道、理解、相信、记得；thinkI believe your story.\nbelieve, remember,表示“认为”I think this plan is useful.\nthink\n感情、愿望 like, love, hate, prefer,喜欢、讨厌、偏爱、想要、需要 She prefers tea to coffee.\nwant, needWe need more time.\n拥有、所属、包have, own, belong,拥有、属于、含有；have 表示“有” He has two brothers.\n含contain, includeThis bag belongs to me.\n感官感受 see, hear, smell, taste 看见、听见、闻起来、尝起来 I hear music.\nThe soup tastes good.\n性质、外观 be, seem, appear 是、似乎、看起来；appear 表示She is friendly.\n“显得”He seems tired.\n价格、重量 cost, weigh 价格是、重量是 The ticket costs $10.\nThis bag weighs two kilos.\n2. 表示状态或动作的动词及其时态运用\n表示状态：通常不用进行时 表示动作：可以用进行时\nI think the answer is right.I'm thinking about the problem.\nthink = 认为think about = 正在思考，考虑\nShe has a new bike.She's having lunch.\nhave = 拥有have lunch = 正在吃午饭\nThe soup tastes salty.The cook is tasting the soup.\ntaste = 尝起来taste = 正在品尝\nI see a bird in the tree.I'm seeing the dentist this afternoon.\nsee = 看见see = 约见，看诊\nTom is polite.Tom is being very polite today.\nbe = 一贯的性格、性质be = 此刻的行为表现\n8\n练习：根据动词的含义和时间线索，选出括号中正确的一项。\n1. Ella ( knows / is knowing ) the answer now, so she raises her hand.\n2. The red pencil case ( belongs / is belonging ) to my sister.\n3. We ( have known / have been knowing ) each other for five years.\n4. Don't call Leo now. He ( has / is having ) dinner with his family.\n5. Leo ( has / is having ) two younger brothers.\n6. I ( think / am thinking ) your answer is correct.\n7. Please give me a minute. I ( think / am thinking ) about how to solve this problem.\n8. Look! The cook ( tastes / is tasting ) the soup to check whether it needs more salt.",
          "answer": "1 knows know 表示状态，不用进行时。　2 belongs belong 表示所属关系，不用进行时。　3 haveknow 是状态动词，和  for five years 连用用现在完成时。　known　4 is having have dinner 表示正在进行的活动，此处可以用进行时。　5 has have two younger brothers 表示拥有关系，用一般现在时。　6 think think 表示观点 “ 认为 ” ，不用进行时。　7 am thinking think about 表示正在思考，属于可进行的动作。　8 is tasting 厨师正在品尝汤来检查味道，表示当前动作。",
          "note": "know、belong、own、like、understand 等表示状态和所属关系的动词一般不用进行时；如果表示的是正在进行的动作（如 have dinner），则可以用进行时。"
        },
        {
          "title": "B. 瞬间动词与延续性动词",
          "prompt": "1. 含义\n瞬间动词（非延续性动词）表示到达、离开、买到、加入、开始、结束等变化。这类用法强调动作发生或\n完成的那一刻，不能延续一段时间。如果需要表达持续状态，则需要替换为延续性动词。因此，当完成时\n句子中有 for / since 等表示一段时间的时间标志词时，往往需要将瞬间动词替换为延续性动词。\n表示已发生的动作：可以用完成时 表示持续的状态：换成可延续的表达\nHe has already arrived.He has been here for two hours.\n他已经到了。他在这里已经两小时了。\n× He has arrived here for two hours.\nI have bought a bike.I have owned this bike for two years.\n我买了一辆自行车。我拥有这辆自行车已经两年了。\n× I have bought this bike for two years.\n时间轴表示\n例：buy → own：买入 → 拥有\n买入是一次变化；拥有是可以持续的状态\nbuy：买入 own：（买入之后）一直拥有\n两年前 现在\nI bought this bike two years ago. → I have owned this bike for two years.\n2. 瞬间动词与延续性动词的转换（一）：用动作发生后处于的状态动词\n瞬间动作 可延续的状态表达 完成时表示持续的例句\nbuy（买到） have / own（拥有） I have owned this bike for two years.\nborrow（借⼊） keep（保留、持有） I have kept this book for a week.\n9\n瞬间动作 可延续的状态表达 完成时表示持续的例句\narrive in / at, reach（到be in / at; be here / there（在某处） She has been in Beijing since Monday.\n达）\nleave（离开） be away (from)（不在、离开某地的状He has been away from home for a month.\n态）\njoin（加⼊组织） be in / be a member of（是成员） She has been a member of the club for three\nyears.\nbecome（变成） be + ⾝份 / 性质（是、处于某状态） He has been a teacher since 2020.\n3. 瞬间动词与延续性动词的转换（二）：用 be + 形容词或其他状态表达\n瞬间动作 可延续的状态表达 完成时表示持续的例句\ndie（死亡） be dead（已去世） The dog has been dead for two years.\nfall asleep（⼊睡） be asleep（睡着） The baby has been asleep for an hour.\nget married（结婚） be married（处于已婚状态） They have been married for ten years.\nopen / close（打开 / 关闭） be open / be closed（开着 / 关着） The shop has been closed since Monday.\nstart / begin（电影、演出开始） be on（正在放映、进⾏） The film has been on for twenty minutes.\nend / finish（活动结束） be over（已结束） The concert has been over for half an hour.\n4. have gone vs. have been\nhave gone to: She has gone to Shanghai. （“她已经去上海了。” 强调去了某地，目前人不在说话现场，\n可能在去的路上或已到达目的地，通常不用于第一、二人称陈述句。）\nhave been to: She has been to Shanghai twice. （“她去过上海两次。” 强调过去曾",
          "answer": "瞬间动词与延续性动词　1 has justonly a moment ago 与  just 呼应，表示刚刚到达。　arrived　2 has beenleave 是瞬间动作；持续两小时要改成  be away 。　away　3 have had buy 是瞬间动作；从三月一直拥有相机用  have had 。　4 haven'tsince Monday 与现在完成时连用，表示到现在仍未收到。　received　5 has been ajoin 是瞬间动作；持续三年要改成  be a member of 。　member of　6 has been电影开始是瞬间动作；持续二十分钟用  be on 。　7 haveown 表示持续拥有： have owned this bike for two years 。　owned　8 has had borrow 是瞬间动作；持续拥有词典用  has had 。　9 have beenarrive 是瞬间动作；仍在城里用  have been in this town 。　10 has beenleave 是瞬间动作；离开后一直未回来用  has been away from 。　away from　11 has been ajoin 是瞬间动作；仍是成员用  has been a member of 。　member of　12 has beendie 是瞬间动作；持续两年用  be dead 。　dead",
          "note": "buy、die、join、leave 这类瞬间动词不能与 for、since 连用，要换成延续性表达：have had、be dead、be a member of、be away。"
        },
        {
          "title": "C. 现在进行时 / 一般现在时表将来",
          "prompt": "用法 结构 适用情况 例句\n一般现在时表将do / does 时刻表、课程表、日程等（已The next lesson begins at 2 p.m.\n来经定好、不会轻易改变）tomorrow.\n现在进行时表将am / is / are + doing 个人已经安排好的计划（票已We're meeting our cousins for dinner\n来买好、人已约好），不限于位on Saturday.\n移动词，常见动词有 come,\ngo, leave, arrive, fly 等\n注意：\n在第一条件句中，主句用一般将来时，从句用一般现在时（“主将从现”）。\n主将从现的“从句”指时间/条件状语从句。宾语从句仍按实际时间选时态：I don't know if he will come.\n（宾语从句，可用 will）\n练习：选出括号中正确的一项。\n1. According to the timetable, the train to Beijing ( leaves / left ) at 7:15 tomorrow morning.\n2. My aunt ( arriving / is arriving ) this evening. She called to say that she has already bought her ticket.\n3. According to its opening schedule, the museum ( opens / opened ) at 9 a.m. tomorrow.\n4. We ( having / are having ) a class party next Friday. Mrs. Lin has already booked the hall.\n5. I'll call you as soon as I ( get / will get ) home.\n6. If it ( rains / will rain ) tomorrow, the sports day will be put off.\n11\n7. The new term ( starts / start ) on September 1, as printed on the school calendar.\n8. — What ( are you do / are you doing ) this weekend?\n— I'm visiting my grandparents in the countryside.",
          "answer": "现在进行时  / 一般现在时表将来　1 leaves According to the timetable 表示时刻表上的固定安排，用一般现在时表将来。　2 is arriving 已经买好票，说明到达是确定的个人安排，用现在进行时表将来。　3 opens According to its opening schedule 表示按开放时间表执行，用一般现在时。　4 are having 场地已经预订，聚会属于已经安排好的计划，用现在进行时。　5 get as soon as 引导将来的时间状语从句，遵循主将从现。　6 rains if 引导将来的条件状语从句，从句用一般现在时。　7 starts 校历上的既定日程用一般现在时表将来。　8 are you答句说明周末已有安排，问句用现在进行时表将来。　doing",
          "note": "已经安排好、马上要发生的动作用现在进行时表将来（I'm leaving tonight）；时刻表、日程等既定安排用一般现在时表将来（The train leaves at eight）。"
        },
        {
          "title": "D. 将来进行时专练",
          "prompt": "时间轴表示\n将来进行时\nwill be doing 或 am/is/are going to be doing将来某一时刻\n将来某个时刻动作正在进行\n过去 现在 将来\n结构：will be doing；am / is / are going to be doing\n否定：will not (won't) be doing；am not / is not / are not going to be doing\n疑问：Will + 主语 + be doing?；Am / Is / Are + 主语 + going to be doing?\n用法 例句\n将来某一具体时刻正在进行的动作 At noon tomorrow, I will be swimming at the sports center. /\nAt noon tomorrow, I am going to be swimming at the sports\ncenter.\n按事情的正常进程，将来自然会发生的事 The visitors will be checking in shortly.\n委婉打听对方的安排 Will you be staying for dinner?\n标志词：this time tomorrow / next week, at 8 p.m. tomorrow, at that time (tomorrow), when you arrive ...\n注意：will be doing 可以表达按正常进程将发生的事或委婉询问；am / is / are going to be doing 常用于已有的\n计划或预期，两者都可以表示“将来某时正在进行”的含义。\n练习：用括号内动词的将来进行时形态填空。\n1. Don't call me at eight tonight. I  (watch) the final match then.\n2. This time next week, we  (fly) to London for our holiday.\n3. At 10 a.m. tomorrow, the students  (take) their science test, so the hall will be\nquiet.\n4.  you  (use) your laptop this afternoon? If not, may I borrow it?\n5. Hurry up! The guests  (arrive) in a few minutes.\n6. When you get to the station, I  (wait) for you at the north exit.\n12",
          "answer": "1 will beat eight tonight 指将来某一时刻正在进行的动作。　watching　2 will beThis time next week 指下周此时正在进行。　flying　3 will beAt 10 a.m. tomorrow 指将来的具体时刻。　taking　4 Will you be用将来进行时委婉询问对方下午是否会使用电脑。　using　5 will bein a few minutes 表示按正常进程即将发生；本题目标是将来进行时， are arriving / will　arrivingarrive 也可表达自然语义。　6 will beWhen you get... 的时间从句用一般现在时，主句表示到站时我正在等候。　waiting",
          "note": "将来某一时刻正在进行的动作用 will be doing，常与 at this time tomorrow、when you arrive 这类时间状语连用。"
        },
        {
          "title": "E. 一般过去时 vs 现在完成时 vs 过去完成时",
          "prompt": "时间轴对比\n一般过去时\ndid过去发生\n过去某时发生了\n过去 现在 将来\n现在完成时\nhave / has done结果 / 影响到现在\n从现在角度看，过去动作对现在有影响\n过去 现在 将来\n过去完成时\nhad done更早完成\n以过去某时为参考，动作发生在此之前\n过去 现在 将来\n过去参照点\n先找参照点：过去的时间 → did；到现在 → have / has done；过去某时之前 → had done。\n时态 结构 核心含义 例句\n一般过去时 did 发生在明确的过去时间，不强We visited the Palace Museum last\n调与现在的联系summer.\n现在完成时 have / has done 到现在为止的经历、结果或持I have visited the Palace Museum\n续状态three times so far.\n过去完成时 had done 在过去某一参照点之前已经完The film had started before we got to\n成the cinema.\n过去完成时标志词：by the time + 一般过去时，by + 过去时间（by 2019, by last June），before / after /\nwhen + 过去时，already，never ... before\n注意：两个接连发生的过去动作按先后顺序叙述时，可以都用一般过去时：He opened the door and went in.\n（先后顺序清楚且动作接连发生，不必用过去完成时）\n练习：用括号内动词的适当形式填空。\n1. I  (visit) the Palace Museum three times so far.\n2. We  (visit) the Palace Museum last summer.\n3. By the time we got to the cinema, the film  (already start).\n4. She  (live) in this city since 2020.\n5. When I arrived at the party, most of the guests  (leave).\n6. Columbus  (reach) America in 1492.\n13\n7. Tom told me that he  (lose) his key the day before.\n8.  you ever  (try) Peking duck?\n9. I  (not see) him since he moved to Canada.\n10. Before she came to China, she  (never use) chopsticks.",
          "answer": "一般过去时  / 现在完成时  / 过去完成时　1 havethree times so far 表示截至目前的经历。　visited　2 visited last summer 是明确的过去时间。　3 had already电影开场早于我们到达影院，是 “ 过去的过去 ” 。　started　4 has lived since 2020 表示从过去持续到现在； has been living 也可表达持续性。　5 had left 客人在我到达派对前已经离开。　6 reached in 1492 是历史上的明确过去时间。　7 had lost told 是过去时，丢钥匙发生在告诉我之前。　8 Have youever 用于询问到目前为止的经历。　ever tried　9 haven'tsince he moved... 要求主句使用现在完成时的否定形式。　seen　10 had never在她来中国之前从未使用过筷子，是过去的过去。　used",
          "note": "过去完成时表示「过去的过去」，动作发生在另一个过去动作之前，常与 by the time、before、already 搭配。"
        },
        {
          "title": "F. 现在完成时 vs 现在完成进行时",
          "prompt": "时间轴对比\n现在完成时\nhave / has done结果 / 影响到现在\n强调完成的结果\n过去 现在 将来\n现在完成进行时\nhave / has been doing一直持续到现在 可能继续\n强调持续过程（且可能持续到将来）\n过去 现在 将来\n现在完成时也可表示持续到现在的状态；状态动词通常用完成时，不用完成进行时。\n结构：have / has been doing\n现在完成时 现在完成进行时\nhave / has done have / has been doing\n强调动作已经完成，或者强调结果 强调动作从过去一直持续到现在，可能还会继续\n常和次数、数量连用：three emails, twice 常和 for / since / all day / how long 连用\nHe has painted two rooms today.（刷完了 2 个房间） He has been painting the house all day.（一整天都在刷房\n子）\n注意：\n状态动词（know, like, love, own, belong, believe 等）一般不用进行时，要用现在完成时：She has\nowned this bike since 2022.（× has been owning）\n现在完成进行时可以解释眼前的现象：You're out of breath. Have you been running?\n练习：选出括号中正确的一项。\n1. I ( have read / have been reading ) this novel since lunchtime, and I'm only on page 50.\n2. She ( has written / has been writing ) three emails this morning.\n3. Your eyes are red. ( Have you cried / Have you been crying )?\n4. We ( have known / have been knowing ) each other for ten years.\n14\n5. It ( has rained / has been raining ) all day, and it still hasn't stopped.\n6. Look! I ( have finished / have been finishing ) my model plane at last.",
          "answer": "现在完成时  / 现在完成进行时　1 have beensince lunch 且只读到第  50 页，强调动作一直持续。　reading　2 has written three emails 强调已经完成的数量，用现在完成时。　3 Have you眼睛发红是持续动作留下的眼前迹象，用现在完成进行时。　been crying　4 haveknow 是状态动词，通常不用进行时。　known　5 has beenall day 且现在还没有停止，强调持续过程。　raining　6 haveat last 强调模型终于完成，关注结果。　finished",
          "note": "强调结果、数量、完成次数用现在完成时；强调动作一直持续、到现在还在继续用现在完成进行时。"
        },
        {
          "title": "G. 过去完成时 vs 过去完成进行时",
          "prompt": "时间轴对比\n过去完成时\nhad done更早完成\n强调此前已经完成\n过去 现在 将来\n过去参照点\n过去完成进行时\nhad been doing此前一直持续\n强调此前一直进行\n过去 现在 将来\n过去参照点\n动作可以在过去参照点时仍继续，也可以刚结束；完成进行时强调此前的持续过程。\n时态 结构 核心含义 例句\n过去完成时 had done “过去的过去”：在过去某一时By the time the guests arrived, we\n间或动作之前已经完成had already prepared dinner.\n过去完成进行时 had been doing 在过去某一时间之前一直持续He was out of breath because he had\n进行的动作been running for half an hour.\n练习：选出括号中更符合语境侧重点的一项。\n1. When I got to the station, the train ( had left / had been leaving ).\n2. Her hands were dirty because she ( had worked / had been working ) in the garden all afternoon.\n3. By 2019, he ( had written / had been writing ) four novels.\n4. The ground was wet. It ( had rained / had been raining ) for hours.\n5. They ( had been talking / had talked ) for an hour when the teacher came in.\n6. She was happy because she ( had passed / had been passing ) the exam.\n15",
          "answer": "过去完成时  / 过去完成进行时　1 had left 火车开走是一次性完成动作，不用进行时。　2 had beenall afternoon 且手很脏，强调此前持续工作留下的结果； had worked 也可接受。　working　3 had written four novels 强调到  2019 年已经完成的数量。　4 had beenfor hours 且地面湿，强调此前持续下雨； had rained 也可接受。　raining　5 had beenfor an hour when... 强调老师进来前一直在谈； had talked 也可接受。　talking　6 had passed pass the exam 是一次性结果，用过去完成时。",
          "note": "同理把时间参照点放在过去某一点之前：强调之前已经完成用 had done，强调之前一直在做用 had been doing。"
        },
        {
          "title": "H. 将来完成时与将来完成进行时",
          "prompt": "时间轴对比\n将来完成时\nwill have done完成\n到将来某时间点前已经完成\n过去 现在 将来\n将来某时间点\n将来完成进行时\nwill have been doing一直持续\n一直持续到将来某时间点\n过去 现在 将来\n将来某时间点\n时态 结构 核心含义 例句\n将来完成时 will have done 到将来某一时间为止，动作已By the end of this month, she will\n经完成have saved enough money for a new\nbike.\n将来完成进行时 will have been doing 动作一直持续到将来某一时By December, we will have been\n间，并且可能还会继续training together for two years.\n标志词：by + 将来时间（by next Friday, by 2030, by the end of this year），by the time + ⼀般现在时从句\n辨析小窍门：\n句中有完成的数量（three reports, fifty books），或者强调已经做完 → will have done\n句中有“for + 一段时间”，并且强调一直在做、还没停 → will have been doing\n练习：选出括号中更符合语境侧重点的一项。\n1. By next Friday, I ( will have finished / will have been finishing ) all three book reports.\n2. By 2030, the city ( will have built / will have been building ) five new subway lines.\n3. By the time the bus comes, we ( will have been waiting / will have waited ) in the rain for forty minutes!\n4. By the end of this year, Lucy ( will have read / will have been reading ) fifty English books.\n5. Next month, my grandfather ( will have been working / will have worked ) in this garden for thirty years,\nand he still goes there every morning.\n6. By the time the concert starts, the band ( will have practiced / will have been practicing ) the new song\nmore than 100 times.\n16\n练习：用括号内动词的适当形式填空。\n1. According to the schedule, the flight to Paris  (take off) at 10:40 tomorrow.\n2. Please wait here until the doctor  (come) back.\n3. This time tomorrow, I  (sit) on a plane to Sydney.\n4. By the end of next year, they  (build) the new library.\n5. — How long  you  (learn) English?\n— For six years.\n6. When the police arrived, the thief  (already run) away.\n7. He was tired because he  (play) basketball for two hours.\n8. I  (meet) my best friend on my first day at school in 2019.\n9. We  (leave) for the airport in an ",
          "answer": "将来完成时  / 将来完成进行时　1 will haveall three book reports 强调到下周五完成的数量和结果。　finished　2 will havefive new subway lines 强调到  2030 年已经建成的结果。　built　3 will havefor forty minutes 强调等待一直持续到公交车到来； will have waited 也合乎语法，但更强　been调累计时长。　waiting　4 will havefifty English books 是到年底完成的数量。　read　5 will havefor thirty years 且工作仍未停止，优先用将来完成进行时； will have worked 也可接受。　been　working　6 will havemore than 100 times 强调练习次数和完成结果。　practiced",
          "note": "by + 将来时间点之前会完成用 will have done；强调到那时为止一直在做用 will have been doing。"
        }
      ]
    }
  ]
}
