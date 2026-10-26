/**
 * 小托福加油站 · Week 2（阅读 + 语用（代词与主谓一致））
 *
 * 数据来源：Week 讲义 PDF（题目与选项）+ 答案解析 PDF（答案、简析、听力原文）。
 * 静态数据，零网络请求；听力音频为原讲义二维码解析出的外链。
 */

export const WEEK = {
  "key": "w2",
  "label": "Week 2",
  "subject": "阅读 + 语用（代词与主谓一致）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 阅读",
      "subtitle": "主旨题 Main idea",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-5",
          "questions": [
            {
              "n": 1,
              "q": "What is the article mainly about?",
              "options": [
                "How to take care of dogs and cats at home",
                "A charity sale organized by students to help an animal shelter",
                "Why a local bakery gave cupcakes to a school",
                "The best way to raise money for a school playground"
              ],
              "answer": 1,
              "why": {
                "right": "全文围绕学生为动物收容所办周末义卖、卖出物品并把 850 美元送到收容所展开。",
                "wrong": [
                  "A 如何在家照顾猫狗不是文章内容",
                  "C 面包店送杯子蛋糕只是其中一个细节，不能概括全文",
                  "D 原文是为动物收容所筹款，不是为操场筹款"
                ]
              }
            },
            {
              "n": 2,
              "q": "Why did the students decide to hold the sale?",
              "options": [
                "Their school needed new playground tables.",
                "Their teacher asked them to do a class project.",
                "An animal shelter did not have enough money for food.",
                "A local bakery wanted to sell more cupcakes."
              ],
              "answer": 2,
              "why": {
                "right": "原文第 1 段：收容所有 62 只猫狗，却买不起足够的食物（could not afford enough food）。",
                "wrong": [
                  "A 学校需要新桌子原文没有提到",
                  "B 老师要求做项目原文没有提到，是学生自己决定",
                  "D 面包店想多卖蛋糕与原文相反，蛋糕是免费送的"
                ]
              }
            },
            {
              "n": 3,
              "q": "What did the students NOT collect from their families and neighbors?",
              "options": [
                "Old books",
                "Toys",
                "Clothes",
                "Cupcakes"
              ],
              "answer": 3,
              "why": {
                "right": "原文收集的是 old books、toys、clothes；杯子蛋糕是面包店免费给的，不是向邻居收集的。",
                "wrong": [
                  "A 旧书在收集清单里",
                  "B 玩具在收集清单里",
                  "C 衣服在收集清单里"
                ]
              }
            },
            {
              "n": 4,
              "q": "In the passage, the wordpersuaded is closest in meaning to",
              "options": [
                "allowed",
                "convinced",
                "reminded",
                "invited"
              ],
              "answer": 1,
              "why": {
                "right": "persuaded 意为「说服」，Ben 说服面包店免费提供 50 个杯子蛋糕，与 convinced 同义。",
                "wrong": [
                  "A allowed 是允许，语气与结果都不符",
                  "C reminded 是提醒，不能表达说服成功",
                  "D invited 是邀请，不是说服"
                ]
              }
            },
            {
              "n": 5,
              "q": "What will the students probably do next?",
              "options": [
                "Close the animal shelter",
                "Give the shelter 850 dollars every month",
                "Organize another charity sale",
                "Ask the bakery to sell their cupcakes at school"
              ],
              "answer": 2,
              "why": {
                "right": "结尾说学生已经在计划春天办第二次义卖（planning a second sale in the spring）。",
                "wrong": [
                  "A 关闭收容所与原文相反",
                  "B 每月给 850 美元没有依据，850 是这次义卖的总额",
                  "D 让面包店来学校卖蛋糕原文没有提到"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Questions 1-7",
          "questions": [
            {
              "n": 1,
              "q": "What is the passage mainly about?",
              "options": [
                "How pigeons were used to carry messages in the past",
                "The experiments that showed pigeons use only their sense of smell",
                "How scientists have tried to explain the pigeon’s ability to find its way home",
                "Why magnets confuse birds that are flying over long distances"
              ],
              "answer": 2,
              "why": {
                "right": "全文讲科学家为解释鸽子归巢能力所做的各种研究与实验。",
                "wrong": [
                  "A 古代用鸽子送信只是背景，不是全文主题",
                  "B 「只用嗅觉」与原文不符，原文给了多种解释",
                  "D 磁铁让鸟迷路只是其中一个实验"
                ]
              }
            },
            {
              "n": 2,
              "q": "In the 1950s experiments, where did researchers take the pigeons?",
              "options": [
                "To a place a short distance from their home",
                "To a place far from home, along a winding road",
                "To a laboratory in another country",
                "To a place where other pigeons were kept"
              ],
              "answer": 1,
              "why": {
                "right": "原文说研究者把鸽子带到离家很远的地方，而且走的是蜿蜒的路（a winding road）。",
                "wrong": [
                  "A 与原文相反，是距离很远而不是很近",
                  "C 另一个国家的实验室原文没有提到",
                  "D 关着其他鸽子的地方原文没有提到"
                ]
              }
            },
            {
              "n": 3,
              "q": "What did the experiment with frosted contact lenses show?",
              "options": [
                "Pigeons cannot fly when they cannot see clearly.",
                "Pigeons find their way home by following the sun.",
                "Pigeons need to recognize landmarks to find home.",
                "Pigeons with magnets on their backs become lost."
              ],
              "answer": 2,
              "why": {
                "right": "磨砂隐形眼镜实验说明：鸽子看不清地标就找不到家，即需要辨认地标。",
                "wrong": [
                  "A 太绝对，鸽子照样能飞，只是方向出错",
                  "B 跟随太阳与该实验无关",
                  "D 背磁铁是另一个实验的内容"
                ]
              }
            },
            {
              "n": 4,
              "q": "In the sentence “Some birds did become disoriented,” the word disoriented is closest in meaning to",
              "options": [
                "unable to find the right direction",
                "unwilling to fly any further",
                "unable to see in the dark",
                "unwilling to leave the box"
              ],
              "answer": 0,
              "why": {
                "right": "disoriented 意为「迷失方向的」，与 unable to find the right direction 同义。",
                "wrong": [
                  "B 不愿再飞与词义不符",
                  "C 黑暗中看不见与词义不符",
                  "D 不愿离开箱子与词义不符"
                ]
              }
            },
            {
              "n": 5,
              "q": "In the sentence “birds whose nostrils are blocked,” the wordnostrils refers to",
              "options": [
                "the birds’ eyes",
                "the birds’ wings",
                "the birds’ noses",
                "the birds’ feet"
              ],
              "answer": 2,
              "why": {
                "right": "nostrils 指鼻孔，即 the birds' noses；实验把鸽子的鼻孔堵住。",
                "wrong": [
                  "A 不是眼睛",
                  "B 不是翅膀",
                  "D 不是脚"
                ]
              }
            },
            {
              "n": 6,
              "q": "In the sentence “The birds flew faithfully in the same direction,”faithfully is closest in meaning to",
              "options": [
                "quickly",
                "accurately",
                "suddenly",
                "safely"
              ],
              "answer": 1,
              "why": {
                "right": "faithfully 在此意为「忠实地、准确地」沿同一方向飞，与 accurately 最接近。",
                "wrong": [
                  "A quickly 强调速度，原文强调的是方向一致",
                  "C suddenly 突然，与原文不符",
                  "D safely 安全地，与原文不符"
                ]
              }
            },
            {
              "n": 7,
              "q": "What can be inferred from the passage about pigeons’ navigation?",
              "options": [
                "It depends on a single sense that scientists have finally identified.",
                "It works better on cloudy days than on sunny days.",
                "It is a skill that pigeons must be taught when they are young.",
                "It is the result of several senses working together."
              ],
              "answer": 3,
              "why": {
                "right": "原文列举视觉地标、嗅觉、磁场等多种因素，可推断是多种感官共同作用。",
                "wrong": [
                  "A 与原文相反，科学家并未认定单一感官",
                  "B 阴天晴天效果比较原文没有此结论",
                  "C 需要幼时学习原文没有提到"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "题 1 2 3 4 5 答案 B C D C C"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "代词与主谓一致",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "Our photo cluba class photo competition this spring, ______",
              "options": [
                "is holding",
                "has held",
                "holds",
                "was holding"
              ],
              "answer": 0,
              "why": {
                "right": "this spring 指本届正在进行，用现在进行时。B has held 与 this spring 不搭",
                "wrong": [
                  "C 一般现在时不能指当下这一届",
                  "D 过"
                ]
              }
            },
            {
              "n": 2,
              "q": "Please read the rules below before you start, and remember that every photo must be ______",
              "options": [
                "yours",
                "your",
                "you",
                "yourself"
              ],
              "answer": 0,
              "why": {
                "right": "空格后没有名词，须用名词性物主代词 be yours。B your、C you、D yourself 都不能单独作表语。",
                "wrong": [
                  "B your：与正确项不符——空格后没有名词，须用名词性物主代词 be yours。B your、C you、D you…",
                  "C you：与正确项不符——空格后没有名词，须用名词性物主代词 be yours。B your、C you、D you…",
                  "D yourself：与正确项不符——空格后没有名词，须用名词性物主代词 be yours。B your、C you、D you…"
                ]
              }
            },
            {
              "n": 3,
              "q": "will look at every picture carefully, and only the best photos will win a prize. ______",
              "options": [
                "that means",
                "which mean",
                "means that",
                "meaning which"
              ],
              "answer": 0,
              "why": {
                "right": "空格前已有 and，需要一个带主语的分句——that 是指示代词，回指「评委仔细看每张照片」这件事。C means that",
                "wrong": [
                  "B which mean：与正确项不符——空格前已有 and，需要一个带主语的分句——that 是指示代词，回指「评委仔细看每张照片…",
                  "C means that：与正确项不符——空格前已有 and，需要一个带主语的分句——that 是指示代词，回指「评委仔细看每张照片…",
                  "D meaning which：与正确项不符——空格前已有 and，需要一个带主语的分句——that 是指示代词，回指「评委仔细看每张照片…"
                ]
              }
            },
            {
              "n": 4,
              "q": "Half of the classes have already sent in their photos, and the rest will hand ______",
              "options": [
                "them in",
                "in their",
                "theirs in",
                "in themselves"
              ],
              "answer": 2,
              "why": {
                "right": "hand in 是「动词 + 副词」短语，代词宾语必须放中间，并且“其他人把他们的作品上交”，故选择 theirs in，",
                "wrong": [
                  "A them in：与正确项不符——hand in 是「动词 + 副词」短语，代词宾语必须放中间，并且“其他人把他们的作品上交…",
                  "B in their：与正确项不符——hand in 是「动词 + 副词」短语，代词宾语必须放中间，并且“其他人把他们的作品上交…",
                  "D in themselves：与正确项不符——hand in 是「动词 + 副词」短语，代词宾语必须放中间，并且“其他人把他们的作品上交…"
                ]
              }
            },
            {
              "n": 5,
              "q": "Amy and Ben won second prize last year. The photo on the wall now is. ______",
              "options": [
                "theirs",
                "they",
                "them",
                "their"
              ],
              "answer": 0,
              "why": {
                "right": "句末没有名词，用名词性物主代词 theirs。B they、C them 是主格与宾格",
                "wrong": [
                  "D their 不能单独使用"
                ]
              }
            },
            {
              "n": 6,
              "q": "Please look after them carefully, because a few of may need to borrow one. ______",
              "options": [
                "other classes",
                "others classes",
                "the other classes",
                "the others classes"
              ],
              "answer": 2,
              "why": {
                "right": "特指「其余那些班」，用 the other + 复数名词。A 缺定冠词",
                "wrong": [
                  "B",
                  "D 把 other 误加复数词尾 or -s"
                ]
              }
            },
            {
              "n": 7,
              "q": "The competitionevery spring, and every class joins in. ______",
              "options": [
                "holds",
                "takes place",
                "is taken place",
                "taking place"
              ],
              "answer": 1,
              "why": {
                "right": "主语是单数 competition，一般现在时用 takes place。A holds 与 place 不搭",
                "wrong": [
                  "C take place 没有被动语态",
                  "D 分词不"
                ]
              }
            },
            {
              "n": 8,
              "q": "This year the older students are teaching how to use the new camera. ______",
              "options": [
                "the younger ones",
                "young one",
                "the one young",
                "younger one"
              ],
              "answer": 0,
              "why": {
                "right": "老同学教新同学，同属于“同学”一类，但从语境推断新同学不止一人，因此用复数，选择 the younger ones。",
                "wrong": [
                  "B young one：与正确项不符——老同学教新同学，同属于“同学”一类，但从语境推断新同学不止一人，因此用复数，选择 the …",
                  "C the one young：与正确项不符——老同学教新同学，同属于“同学”一类，但从语境推断新同学不止一人，因此用复数，选择 the …",
                  "D younger one：与正确项不符——老同学教新同学，同属于“同学”一类，但从语境推断新同学不止一人，因此用复数，选择 the …"
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
              "q": "Please return the two books that are notby Friday. Thank you. ______",
              "options": [
                "yours",
                "your",
                "you",
                "yourself"
              ],
              "answer": 0,
              "why": {
                "right": "空格后没有名词，用名词性物主代词 yours。B your 不能单独使用",
                "wrong": [
                  "C you",
                  "D yourself 词义与词性都不对"
                ]
              }
            },
            {
              "n": 10,
              "q": "One of the missing books is called Stars and Planets, andis about the moon. ______",
              "options": [
                "other",
                "the other",
                "another",
                "others"
              ],
              "answer": 1,
              "why": {
                "right": "共提到两本书，第二本用 the other。A other 后不接名词时不能表特指",
                "wrong": [
                  "C another 指不确定的「再一个」",
                  "D others"
                ]
              }
            },
            {
              "n": 11,
              "q": "The book about stars has no pictures, so please return it first. ______",
              "options": [
                "in all",
                "of all",
                "at all",
                "at all of"
              ],
              "answer": 2,
              "why": {
                "right": "at all 是与否定词连用的固定短语（no pictures at all）。A in all 意为「总共」",
                "wrong": [
                  "B of all",
                  "D at all of 结构不成立"
                ]
              }
            },
            {
              "n": 12,
              "q": "Two books are still missing from the library, andhas come back yet. ______",
              "options": [
                "neither the two books",
                "either of the two books",
                "neither of the two book",
                "neither of the two books"
              ],
              "answer": 3,
              "why": {
                "right": "neither of + 复数名词作主语，谓语用单数 has，故 neither of the two books。A 缺 of",
                "wrong": [
                  "B either 表「两者中任一」与"
                ]
              }
            },
            {
              "n": 13,
              "q": "I will put your names on the list myself, so you need not writeagain. ______",
              "options": [
                "they",
                "their",
                "themselves",
                "them"
              ],
              "answer": 3,
              "why": {
                "right": "need not write 后接宾语，用宾格 them。A they 是主格",
                "wrong": [
                  "B their 不能单独作宾语",
                  "C themselves 指回主语 you"
                ]
              }
            },
            {
              "n": 14,
              "q": "so you may have to wait until the student in front of you . ______",
              "options": [
                "gives it back",
                "gives back it",
                "gives it to back",
                "gives back it you"
              ],
              "answer": 0,
              "why": {
                "right": "give back 是「动词 + 副词」短语，代词宾语必须放中间，故 gives it back。B gives back it 语序错",
                "wrong": [
                  "C gives it to"
                ]
              }
            },
            {
              "n": 15,
              "q": "If you would like to borrow a book, please writeon the list on my desk. ______",
              "options": [
                "your name",
                "you name",
                "yours name",
                "yourself name"
              ],
              "answer": 0,
              "why": {
                "right": "write 后需要「形容词性物主代词 + 名词」。B you、C yours、D yourself 都不能修饰 name。",
                "wrong": [
                  "B you name：与正确项不符——write 后需要「形容词性物主代词 + 名词」。B you、C yours、D your…",
                  "C yours name：与正确项不符——write 后需要「形容词性物主代词 + 名词」。B you、C yours、D your…",
                  "D yourself name：与正确项不符——write 后需要「形容词性物主代词 + 名词」。B you、C yours、D your…"
                ]
              }
            },
            {
              "n": 16,
              "q": "Ia few students how to find the book they want. ______",
              "options": [
                "have already shown",
                "has already shown",
                "have already show",
                "already have shown"
              ],
              "answer": 0,
              "why": {
                "right": "主语 I 用 have，already 放在助动词与过去分词之间。B has 与 I 不一致",
                "wrong": [
                  "C 的 show 未用过去分词",
                  "D already 误放"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "Our club, ______",
              "options": [
                "which have entered a team every spring since 2017,",
                "which has entered a team every spring since 2017,",
                "who has entered a team every spring since 2017,",
                "which has entered a team every spring from 2017,"
              ],
              "answer": 1,
              "why": {
                "right": "先行词 club 是物，用 which，且为单数，用 has entered。A which have 主谓不一致",
                "wrong": [
                  "C who 指人",
                  "D 用 from 2017"
                ]
              }
            },
            {
              "n": 2,
              "q": "Only after the judges had announced the results ______",
              "options": [
                "the team realised how close the final had been",
                "the team did realise how close the final had been",
                "did the team realise how close the final had been",
                "did the team realise how close had the final been"
              ],
              "answer": 2,
              "why": {
                "right": "Only after 置于句首，主句部分倒装（did the team realise），宾语从句用陈述语序。A 未倒装",
                "wrong": [
                  "B 只把 did 提前"
                ]
              }
            },
            {
              "n": 3,
              "q": "The judges askedwhether we had built the robot ourselves. ______",
              "options": [
                "we",
                "ourselves",
                "our",
                "us"
              ],
              "answer": 3,
              "why": {
                "right": "asked 后接宾格 us。A we 是主格",
                "wrong": [
                  "B ourselves 是反身代词",
                  "C our 不能单独作宾"
                ]
              }
            },
            {
              "n": 4,
              "q": "The other team 's robot had practised. ______",
              "options": [
                "a year longer than we",
                "a year longer than ours did",
                "longer a year than ours did",
                "more long than we did"
              ],
              "answer": 1,
              "why": {
                "right": "比较级结构是「a year longer + than + 从句」，从句用 did 替代重复的 had practised。A 少了替代动词且代词错误",
                "wrong": [
                  "A a year longer than we：与正确项不符——比较级结构是「a year longer + than + 从句」，从句用 did 替代重…",
                  "C longer a year than ours did：与正确项不符——比较级结构是「a year longer + than + 从句」，从句用 did 替代重…",
                  "D more long than we did：与正确项不符——比较级结构是「a year longer + than + 从句」，从句用 did 替代重…"
                ]
              }
            },
            {
              "n": 5,
              "q": "Neither the two pilots nor the coach ______",
              "options": [
                "were able to explain why the robot had stopped",
                "was able to explain why the robot had stopped",
                "was able to explain why had the robot stopped",
                "were able to explain why the robot has stopped"
              ],
              "answer": 1,
              "why": {
                "right": "neither … nor 按就近原则取单数 the coach，用 was。A were 与就近主语不一致",
                "wrong": [
                  "C 宾语从句误用疑问语序",
                  "D 时态"
                ]
              }
            },
            {
              "n": 6,
              "q": "The camera, together with four small magnets,find its way around the table. ______",
              "options": [
                "help the robot",
                "help them",
                "helps the robot",
                "helps them"
              ],
              "answer": 2,
              "why": {
                "right": "together with 只是补充说明，真正的主语是单数 camera，谓语用 helps。A、B 用复数 help",
                "wrong": [
                  "D 的 them 指向前文磁"
                ]
              }
            },
            {
              "n": 7,
              "q": "The members were so pleased with the result that they could not help . ______",
              "options": [
                "feel proud of themselves",
                "feeling proud of them",
                "to feel proud of ourselves",
                "feeling proud of themselves"
              ],
              "answer": 3,
              "why": {
                "right": "cannot help doing 是固定搭配，help 后接动名词",
                "wrong": [
                  "B 的"
                ]
              }
            },
            {
              "n": 8,
              "q": "Our next robot will be lighter, and it should travel. ______",
              "options": [
                "twice as faster as this one does",
                "twice as fast as this one does",
                "twice fast as this one does",
                "two times as fast than this one does"
              ],
              "answer": 1,
              "why": {
                "right": "倍数表达是「倍数 + as + 原级 + as」，这里 twice as fast as this one does。A 把比较级与 as … as 混用",
                "wrong": [
                  "C 缺第二"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "A 主格与宾格 1 I　2 him　3 us　4 her　5 They　6 you；me　7 him　8 I"
        },
        {
          "title": "专项练习答案",
          "answer": "B 物主代词 1 my　2 mine　3 your；mine　4 its　5 ours　6 Her　7 his； hers　8 their"
        },
        {
          "title": "专项练习答案",
          "answer": "C one / ones 与 it 1 one　2 it　3 ones　4 one　5 one　6 it"
        },
        {
          "title": "专项练习答案",
          "answer": "D other 的各种形式 1 the other　2 others　3 The others　4 other　5 another　6 another　7 every other　8 each other"
        },
        {
          "title": "专项练习答案",
          "answer": "E 反身代词1 2 3 4 5 6 7 8 9 答案myself himself yourself ourselves her her him himself yourself"
        },
        {
          "title": "专项练习答案",
          "answer": "F 主谓一致 1 2 3 4 5 6 7 答案 is are Is is likes are is"
        },
        {
          "title": "专项练习答案",
          "answer": "F 主谓一致 8 9 10 11 12 13 14 答案 is is is is is are has"
        }
      ]
    }
  ]
}
