/**
 * 小托福加油站 · Week 6（阅读 + 语用（被动语态））
 *
 * 数据来源：Week 6 讲义 PDF（题目、选项、专项练习）+ 答案解析 PDF（答案、简析）。
 * 静态数据，零网络请求。阅读周无音频。
 * 说明：阅读周的文章正文不入库，面板仅渲染题目（q/options/why）与专项练习（drills）。
 */

export const WEEK = {
  "key": "w6",
  "label": "Week 6",
  "subject": "阅读 + 语用（被动语态）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 阅读",
      "subtitle": "推断题（Inference）",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-5",
          "questions": [
            {
              "n": 1,
              "q": "What is the main purpose of the article?",
              "options": [
                "To explain how to build a rainwater-collection system",
                "To report on the creation and success of a school rooftop garden",
                "To persuade students to join the school environmental committee",
                "To ask local families to donate vegetables to a food bank"
              ],
              "answer": 1,
              "why": {
                "right": "四段依次介绍屋顶菜园的提议与获批、暑期建设与种植、蔬菜丰收与捐赠、吸引其他学校参观，整体是在报道学校屋顶菜园的建立与成功。",
                "wrong": [
                  "A To explain how to build a rainwater-collectio…：与正确项不符——全文主旨是报道菜园项目的建立与成功，而非讲解如何搭建雨水系统。",
                  "C To persuade students to join the school env…：与正确项不符——全文是客观报道，并非号召加入委员会。",
                  "D To ask local families to donate vegetables t…：与正确项不符——捐赠蔬菜只是其中一环，不是文章主旨。"
                ]
              }
            },
            {
              "n": 2,
              "q": "Why did the volunteers install a rainwater-collection system?",
              "options": [
                "To prevent the flat gymnasium roof from flooding",
                "To provide drinking water for the school kitchen",
                "To lower the amount of regular watering required",
                "To test a science project for the environmental committee"
              ],
              "answer": 2,
              "why": {
                "right": "第 2 段：set up a simple rainwater-collection system to reduce the need for regular watering，直接对应 C（降低日常浇水的需求）。",
                "wrong": [
                  "A To prevent the flat gymnasium roof from flo…：与正确项不符——安装雨水系统是为减少日常浇水，而非防止屋顶淹水。",
                  "B To provide drinking water for the school ki…：与正确项不符——原文未说用于饮用。",
                  "D To test a science project for the environmen…：与正确项不符——这是实际建设项目，不是测试。"
                ]
              }
            },
            {
              "n": 3,
              "q": "In paragraph 1, the word \"modest\" is closest in meaning to",
              "options": [
                "limited",
                "enormous",
                "secret",
                "delayed"
              ],
              "answer": 0,
              "why": {
                "right": "modest 修饰预算（budget）时意为“数额不大的、适度的”，与 limited（有限的）意思最接近。",
                "wrong": [
                  "B enormous：与正确项不符——modest 意为“适度的、有限的”，与 enormous（巨大的）相反。",
                  "C secret：与正确项不符——modest 在此指数额不大，不是“秘密的”。",
                  "D delayed：与正确项不符——modest 在此指数额不大，不是“延迟的”。"
                ]
              }
            },
            {
              "n": 4,
              "q": "What can be inferred about the school kitchen's capacity?",
              "options": [
                "It was recently expanded to handle more fresh produce.",
                "It could not process all the vegetables the garden produced.",
                "It donated all of its regular food supplies to the food bank.",
                "It had been ordering vegetables from the rooftop garden before it opened."
              ],
              "answer": 1,
              "why": {
                "right": "第 3 段：producing more vegetables than the school kitchen could use（产出的蔬菜超过了学校厨房能消耗的量），可推知学校厨房无法消化菜园产出的所有蔬菜。",
                "wrong": [
                  "A It was recently expanded to handle more fre…：与正确项不符——原文未提厨房扩建。",
                  "C It donated all of its regular food supplies…：与正确项不符——是菜园的蔬菜捐给食物银行，不是厨房捐出自己的食物。",
                  "D It had been ordering vegetables from the ro…：与正确项不符——原文未提厨房之前就订购菜园蔬菜。"
                ]
              }
            },
            {
              "n": 5,
              "q": "What does the interest from other schools most likely suggest?",
              "options": [
                "The other schools have already built their own rooftop gardens.",
                "The project has been recognized as a successful and replicable idea.",
                "The district has ordered all schools to build rooftop gardens next year.",
                "The student committee plans to move their garden to a different school."
              ],
              "answer": 1,
              "why": {
                "right": "第 4 段提到学区内另外三所学校都派代表来参观并与负责学生交流，说明该项目被认为是一个成功且值得借鉴推广的做法。",
                "wrong": [
                  "A The other schools have already built their …：与正确项不符——原文说“派代表来参观”，并未说已经建好。",
                  "C The district has ordered all schools to bui…：与正确项不符——原文未提学区下令。",
                  "D The student committee plans to move their g…：与正确项不符——原文未提搬迁。"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Advanced · Questions 1-7",
          "questions": [
            {
              "n": 1,
              "q": "What is the passage mainly about?",
              "options": [
                "How bacteria and roundworms compete for nutrients in garden soil",
                "Why scientists prefer growing microorganisms in laboratory dishes",
                "The vital partnership between soil fungi and plants and how modern farming threatens it",
                "The history of synthetic fertilizers in modern agriculture"
              ],
              "answer": 2,
              "why": {
                "right": "全文围绕土壤中的菌根真菌（mycorrhizal fungi）与植物的重要共生关系，以及现代农业（翻耕和化肥）如何威胁这一网络展开。",
                "wrong": [
                  "A How bacteria and roundworms compete for nut…：与正确项不符——细菌和线虫只是文中提到的微生物例子，不是主旨。",
                  "B Why scientists prefer growing microorganism…：与正确项不符——原文说真菌无法像细菌那样在实验室培养，并未说科学家更喜欢实验室。",
                  "D The history of synthetic fertilizers in mod…：与正确项不符——化肥只是威胁因素之一，不是全文主旨。"
                ]
              }
            },
            {
              "n": 2,
              "q": "In paragraph 1, the word \"inert\" is closest in meaning to",
              "options": [
                "lifeless",
                "damp",
                "valuable",
                "poisonous"
              ],
              "answer": 0,
              "why": {
                "right": "inert 意为“无生命的、惰性的”，与后文一茶匙健康土壤中含有比地球人口还多的微生物（microorganisms）形成对比，因此与 lifeless 最接近。",
                "wrong": [
                  "B damp：与正确项不符——inert 意为“无生命的”，而非“潮湿的”。",
                  "C valuable：与正确项不符——inert 在此指“惰性的、无生命的”，不是“有价值的”。",
                  "D poisonous：与正确项不符——inert 在此指“惰性的”，不是“有毒的”。"
                ]
              }
            },
            {
              "n": 3,
              "q": "According to paragraph 2, what do plants provide to mycorrhizal fungi?",
              "options": [
                "Mineral nutrients such as phosphorus",
                "Thread-like extensions called hyphae",
                "Sugars created through photosynthesis",
                "Protection from harmful soil bacteria"
              ],
              "answer": 2,
              "why": {
                "right": "第 2 段：In return, the plant provides the fungi with sugars produced through photosynthesis。A、B 是真菌提供给植物或真菌自身长出的结构；D 原文未提及。",
                "wrong": [
                  "A Mineral nutrients such as phosphorus：与正确项不符——磷等矿物质是真菌提供给植物的，不是植物提供给真菌的。",
                  "B Thread-like extensions called hyphae：与正确项不符——hyphae 是真菌长出的结构。",
                  "D Protection from harmful soil bacteria：与正确项不符——原文未提及植物为真菌提供保护。"
                ]
              }
            },
            {
              "n": 4,
              "q": "Why does the author mention \"50 percent fewer mycorrhizal fungi\" in paragraph 3?",
              "options": [
                "To prove that most plants do not actually need fungal partners",
                "To illustrate the negative impact of heavy synthetic fertilizer use on soil fungi",
                "To show that plowing is more harmful to soil than synthetic fertilizers",
                "To explain why farmers need to double the amount of fertilizer they use"
              ],
              "answer": 1,
              "why": {
                "right": "第 3 段先指出广泛使用合成化肥使植物不再那么依赖真菌伙伴，随后列举“长期高剂量使用合成化肥的土壤中菌根真菌减少多达 50%”的研究数据，目的是具体说明大量使用合成化肥对土壤真菌的负面影响。",
                "wrong": [
                  "A To prove that most plants do not actually n…：与正确项不符——数据恰恰说明化肥削弱了植物对真菌的依赖，而非证明植物不需要真菌。",
                  "C To show that plowing is more harmful to soi…：与正确项不符——该句讲的是化肥，未比较翻耕与化肥的危害。",
                  "D To explain why farmers need to double the a…：与正确项不符——原文未建议加倍施肥。"
                ]
              }
            },
            {
              "n": 5,
              "q": "What does the passage imply about mycorrhizal fungi and laboratory conditions?",
              "options": [
                "They grow faster in a laboratory than in natural soil.",
                "They cannot be cultivated independently outside of a living plant partnership.",
                "Scientists have successfully created artificial versions of these fungi in a lab.",
                "Laboratory conditions are more favorable to fungi than to bacteria."
              ],
              "answer": 1,
              "why": {
                "right": "第 2 段末句：Because these fungi require a living plant partner to survive, they cannot be grown in a laboratory dish the way bacteria can，说明它们离开活体植物伙伴后无法在实验室中独立培养。",
                "wrong": [
                  "A They grow faster in a laboratory than in nat…：与正确项不符——原文说无法像细菌那样在实验室培养。",
                  "C Scientists have successfully created artific…：与正确项不符——原文明确说不能独立培养。",
                  "D Laboratory conditions are more favorable to …：与正确项不符——原文未比较实验室与细菌培养条件。"
                ]
              }
            },
            {
              "n": 6,
              "q": "What can be inferred about the long-term effects of modern farming on soil?",
              "options": [
                "Modern farming has permanently eliminated all microorganisms from farmed soil.",
                "The effects are likely to remain invisible and cause no measurable harm.",
                "Reduced biodiversity in the soil may gradually weaken the reliability of crop production.",
                "Plowing has been found to increase the number of mycorrhizal fungi over time."
              ],
              "answer": 2,
              "why": {
                "right": "第 4 段：the long-term loss of soil biodiversity may quietly undermine the stability of agricultural systems，说明土壤生物多样性的减少可能会逐渐削弱农业生产的稳定性。A 中的 permanently eliminated all 过于绝对；B、D 与原文意思相反。",
                "wrong": [
                  "A Modern farming has permanently eliminated al…：与正确项不符——原文说“可能削弱”，并非“永久消除全部微生物”，过于绝对。",
                  "B The effects are likely to remain invisible a…：与正确项不符——原文指出会削弱农业系统稳定性，并非无害。",
                  "D Plowing has been found to increase the numbe…：与正确项不符——原文说翻耕破坏真菌网络，与“增加”相反。"
                ]
              }
            },
            {
              "n": 7,
              "q": "Based on the final paragraph, what can be inferred about scientists' views on the situation?",
              "options": [
                "They believe the damage to soil biodiversity is already irreversible.",
                "They think returning to certain older farming practices might help recover lost soil health.",
                "They recommend stopping all use of fertilizers immediately.",
                "They are confident that technology will solve the problem without changing farming methods."
              ],
              "answer": 1,
              "why": {
                "right": "最后一段提到研究人员正在探索恢复少耕耕作方式（returning to low-tillage farming methods）和减少化肥依赖能否帮助修复这些古老的共生关系，可推知科学家认为回归某些传统耕作方式可能有助于恢复受损的土壤健康。A“不可逆转”、C“立即停止一切化肥使用”、D“无需改变耕作方式”均与原文不符。",
                "wrong": [
                  "A They believe the damage ... is already irrev…：与正确项不符——原文说正在探索恢复方法，并未认定不可逆转。",
                  "C They recommend stopping all use of fertiliz…：与正确项不符——原文说“减少依赖”，并非“立即停止一切”。",
                  "D They are confident that technology will solv…：与正确项不符——原文强调回归旧耕作方式，而非仅靠技术。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习（推断理解）",
          "prompt": "PART A · 阅读 —— 推断题（Inference）\n题型指南：推断题考查能否根据文中已有信息，推导出作者未直接说出的结论。答案必须是原文信息的“合理延伸”，不能凭空猜测，也不能直接照搬原文（直接复述是陷阱）。\n常见提问方式：What can be inferred about ...? / What does the author imply about ...? / It can be concluded from the passage that ...?\n解题步骤：① 找关键词回原文定位；② 读懂字面含义与上下文；③ 做出合理推断（不是复述，也不是过度推测）；④ 排除陷阱项。\n\nPassage 1\nThe school library recently introduced a new \"silent reading hour\" policy. Every Tuesday and Thursday from 3:00 to 4:00 p.m., all students in the library must read silently without talking, using their phones, or playing music. The librarian announced that the policy was created after a survey showed that 78 percent of students felt it was often too noisy to concentrate in the library.\nWhat can be inferred from the passage?\nA. The library was completely empty before the new policy was introduced.\nB. Students had difficulty focusing in the library before the policy was put in place.\nC. The librarian created the policy without consulting students.\nD. All students at the school were required to visit the library on Tuesdays and Thursdays.\n\nPassage 2\nThe Greenfield Middle School science fair attracted entries from 94 students this year, compared with 61 entries last year. The winning project, which examined the effect of different soils on plant growth, was completed by a team of three seventh-graders over a period of eight weeks.\nWhat can be inferred about the science fair?\nA. The number of student participants has grown over the past year.\nB. Only seventh-grade students were allowed to enter the science fair this year.\nC. The winning team had previously won the science fair in a different category.\nD. Students were required to complete their projects in under two months.\n\nPassage 3\nDeep in the Amazon rainforest, some trees can grow to a height of over 40 meters, blocking nearly all sunlight from reaching the forest floor. As a result, the plants and animals that live on or near the ground have developed remarkable ways of surviving in near-total darkness. Many ground-level plants have unusually large leaves that can absorb the small amounts of scattered light that filter through the canopy above.\nWhat can be inferred about the large leaves of ground-level plants in the Amazon?\nA. They evolved as a response to the limited amount of sunlight on the forest floor.\nB. They prevent animals from walking through the lower parts of the forest.\nC. They are found only in the Amazon rainforest and nowhere else in the world.\nD. They grow larger during the dry season when rain is scarce.\n\nPassage 4\nDr. Patel's after-school robotics club has a strict attendance policy: any student who misses more than two sessions without a valid excuse is removed from the club. Last semester, fifteen students completed the full program and presented their projects at the district technology competition.\nWhat can be inferred about the students who presented at the competition?\nA. They had all previously won awards at a technology competition.\nB. They attended the required sessions consistently throughout the semester.\nC. They were all in the same grade and had studied robotics before joining the club.\nD. They each built their robots without any help from other club members.\n\nPassage 5\nIn the mid-nineteenth century, the city of London had a serious problem with its water supply. Most residents drew their drinking water directly from the River Thames, which also received large amounts of raw sewage. In 1854, a deadly outbreak of cholera killed over 600 people in a single London neighborhood. A physician named John Snow carefully mapped each case and discovered that nearly all of them were clustered around a single public water pump on Broad Street. He persuaded local authorities to remove the handle of the pump, and the outbreak quickly subsided.\nWhat can most likely be inferred about John Snow's discovery?\nA. It proved that contaminated water was the cause of the cholera outbreak in that neighborhood.\nB. It showed that cholera was spread through the air rather than through water.\nC. It convinced the city of London to ban all public water pumps permanently.\nD. It was ignored by local authorities, who refused to take any action.",
          "answer": "1 B  2 A  3 A  4 B  5 A",
          "note": "推断题答案是原文信息的合理延伸，不是直接复述原文，也不是过度推测（选项逻辑上可能成立但原文支持不足）。\n1 B：原文提到调查显示 78% 学生觉得图书馆太吵、难以集中注意力，之后才推出该政策，可推知政策出台前学生很难专心学习；A、D 过于绝对，C 与原文做了问卷调查矛盾。\n2 A：今年 94 人参赛、去年 61 人，说明过去一年参赛人数增长；B、C、D 原文均无依据。\n3 A：高大树木遮挡绝大部分阳光，地面植物为在近乎全黑环境中生存长出大叶片以吸收散射光，可推知大叶片为适应环境进化而来；C 中 only 过于绝对，B、D 未提及。\n4 B：俱乐部规定无故缺席超两次即除名，这 15 名学生完成全部课程并展示项目，说明他们整学期坚持出勤；A、C、D 未提及。\n5 A：病例集中在 Broad Street 一处水泵周围，拆掉手柄后疫情迅速平息，可推知该发现证明受污染水源是霍乱爆发原因；B 与水源传播相反，C 过度推断，D 与说服当局行动矛盾。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "被动语态",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "Right now, the main reading room ______ with new shelves and brighter lighting.",
              "options": [
                "to be fitted",
                "is being fitted",
                "has fitted",
                "fits"
              ],
              "answer": 1,
              "why": {
                "right": "Right now 提示现在进行时；阅览室是“正在被安装”新书架，用现在进行时被动 is being fitted。",
                "wrong": [
                  "A to be fitted：与正确项不符——这是不定式，不能单独作谓语。",
                  "C has fitted：与正确项不符——现在完成时主动，与 right now 进行时语境及被动关系均不符。",
                  "D fits：与正确项不符——主动语态，主语 reading room 不能自己安装。"
                ]
              }
            },
            {
              "n": 2,
              "q": "The old carpet ______ last Monday, and the painters have already begun work on the ceiling.",
              "options": [
                "removes",
                "was removed",
                "has removed",
                "is removing"
              ],
              "answer": 1,
              "why": {
                "right": "last Monday 提示一般过去时；旧地毯“被移除”，用一般过去时被动 was removed。",
                "wrong": [
                  "A removes：与正确项不符——一般现在时主动，与 last Monday 及被动语境不符。",
                  "C has removed：与正确项不符——现在完成时主动，语态与语境均错。",
                  "D is removing：与正确项不符——现在进行时主动，语态错。"
                ]
              }
            },
            {
              "n": 3,
              "q": "Since the work began, more than 3,000 books ______ to a temporary storage room on the second floor.",
              "options": [
                "moved",
                "have moved",
                "have been moved",
                "are moving"
              ],
              "answer": 2,
              "why": {
                "right": "Since the work began 提示现在完成时；3,000 多本书是“被搬走”，用现在完成时被动 have been moved。",
                "wrong": [
                  "A moved：与正确项不符——主动语态，书不能自己搬。",
                  "B have moved：与正确项不符——主动语态，书不能自己搬。",
                  "D are moving：与正确项不符——现在进行时主动，语态错。"
                ]
              }
            },
            {
              "n": 4,
              "q": "The new computers ______ by the end of next week, and a quiet study area will open beside the main entrance.",
              "options": [
                "will install",
                "will be installed",
                "are installing",
                "have installed"
              ],
              "answer": 1,
              "why": {
                "right": "by the end of next week 提示将来时间；新电脑“将被安装”，用一般将来时被动 will be installed。",
                "wrong": [
                  "A will install：与正确项不符——主动语态，电脑不能自己安装。",
                  "C are installing：与正确项不符——现在进行时主动，语态与将来时间均错。",
                  "D have installed：与正确项不符——现在完成时主动，语态错。"
                ]
              }
            },
            {
              "n": 5,
              "q": "During the renovation, students ______ to use the temporary reading room on the second floor.",
              "options": [
                "are asked",
                "ask",
                "are asking",
                "have asked"
              ],
              "answer": 0,
              "why": {
                "right": "在装修期间，学生“被要求”使用二楼临时阅览室，陈述现行规定，用一般现在时被动 are asked。",
                "wrong": [
                  "B ask：与正确项不符——主动语态，学生不能自己要求自己。",
                  "C are asking：与正确项不符——现在进行时主动，语态错。",
                  "D have asked：与正确项不符——现在完成时主动，语态错。"
                ]
              }
            },
            {
              "n": 6,
              "q": "If a student ______ a borrowed book late during this period, no overdue fees will be charged.",
              "options": [
                "returns",
                "is returned",
                "returned",
                "will return"
              ],
              "answer": 0,
              "why": {
                "right": "if 引导条件状语从句，遵循“主将从现”；且主语 a student 是动作 return 的执行者（后面有宾语 a borrowed book），用主动形式 returns。",
                "wrong": [
                  "B is returned：与正确项不符——学生还书是主动，不是“被还”。",
                  "C returned：与正确项不符——主句需用将来时（will return）或一般现在时表将来，过去式错。",
                  "D will return：与正确项不符——if 条件从句中要用现在时表将来，不能用 will。"
                ]
              }
            },
            {
              "n": 7,
              "q": "When I walked past the library yesterday afternoon, the windows ______ by a team of workers.",
              "options": [
                "were cleaned",
                "were being cleaned",
                "have been cleaned",
                "clean"
              ],
              "answer": 1,
              "why": {
                "right": "When I walked past ... yesterday afternoon 提供过去时间点背景；窗户当时“正在被擦”，用过去进行时被动 were being cleaned。",
                "wrong": [
                  "A were cleaned：与正确项不符——一般过去时被动强调动作完成，不能体现“当时正在被擦”的进行状态。",
                  "C have been cleaned：与正确项不符——现在完成时被动，与过去时间点不符。",
                  "D clean：与正确项不符——原形动词不能作谓语，且语态错。"
                ]
              }
            },
            {
              "n": 8,
              "q": "Please note that silence ______ at all times in the temporary reading room.",
              "options": [
                "must maintain",
                "must be maintained",
                "must have maintained",
                "maintains"
              ],
              "answer": 1,
              "why": {
                "right": "silence 与 maintain 之间为被动关系，情态动词被动结构为 must be maintained。",
                "wrong": [
                  "A must maintain：与正确项不符——主动语态，silence 不能自己维持。",
                  "C must have maintained：与正确项不符——must have done 表对过去的推测，且为主动语态，错。",
                  "D maintains：与正确项不符——主动语态，错。"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Advanced · Questions 9-16",
          "questions": [
            {
              "n": 9,
              "q": "Over the past few decades, reefs around the world ______ by a combination of rising ocean temperatures, pollution, and destructive fishing methods.",
              "options": [
                "have severely damaged",
                "have been severely damaged",
                "are severely damaging",
                "been severely damaged have"
              ],
              "answer": 1,
              "why": {
                "right": "Over the past few decades 提示现在完成时，且后有 by 引出施动原因，用现在完成时被动 have been severely damaged；D 语序错误。",
                "wrong": [
                  "A have severely damaged：与正确项不符——主动语态，reefs 不能自己破坏自己。",
                  "C are severely damaging：与正确项不符——现在进行时主动，语态与现在完成时语境均错。",
                  "D been severely damaged have：与正确项不符——语序错误，缺少助动词正确位置。"
                ]
              }
            },
            {
              "n": 10,
              "q": "In some regions, more than half of the living coral ______ since 1990.",
              "options": [
                "has destroyed completely",
                "have been completely destroyed",
                "has been completely destroyed",
                "was destroying completely"
              ],
              "answer": 2,
              "why": {
                "right": "since 1990 提示现在完成时；coral 在此作不可数名词，“一半以上的活珊瑚”谓语用单数 has been completely destroyed；A 缺 be 动词且语序不佳；B 主谓不一致。",
                "wrong": [
                  "A has destroyed completely：与正确项不符——主动语态，coral 不能自己破坏自己，且语序不佳。",
                  "B have been completely destroyed：与正确项不符——coral 不可数，谓语应用单数 has，主谓不一致。",
                  "D was destroying completely：与正确项不符——过去进行时主动，语态与现在完成时语境均错。"
                ]
              }
            },
            {
              "n": 11,
              "q": "Today, damaged reefs in several tropical regions ______ with these nursery-grown corals.",
              "options": [
                "are carefully restoring",
                "are being carefully restored",
                "carefully restore",
                "have carefully restored"
              ],
              "answer": 1,
              "why": {
                "right": "Today 提示当前正在进行的修复工作；受损珊瑚礁“正在被修复”，用现在进行时被动 are being carefully restored。",
                "wrong": [
                  "A are carefully restoring：与正确项不符——现在进行时主动，reefs 不能自己修复自己。",
                  "C carefully restore：与正确项不符——主动语态且缺 be，错。",
                  "D have carefully restored：与正确项不符——现在完成时主动，语态错。"
                ]
              }
            },
            {
              "n": 12,
              "q": "it ______ for several months in a protected nursery until it is large enough to survive on its own.",
              "options": [
                "must keep safely",
                "must be kept safely",
                "must have kept safely",
                "is keeping safely"
              ],
              "answer": 1,
              "why": {
                "right": "it 指代 young coral，与 keep 为被动关系，用情态动词被动结构 must be kept safely。",
                "wrong": [
                  "A must keep safely：与正确项不符——主动语态，coral 不能自己保存自己。",
                  "C must have kept safely：与正确项不符——must have done 表对过去的推测，且为主动语态，错。",
                  "D is keeping safely：与正确项不符——现在进行时主动，语态错。"
                ]
              }
            },
            {
              "n": 13,
              "q": "Scientists ______ that certain fish, such as parrotfish, play in keeping reefs clean, because a reef without these animals recovers far more slowly.",
              "options": [
                "are particularly interested in the role",
                "are particularly interesting in the role",
                "particularly interested in the role are",
                "are interested particularly on the role"
              ],
              "answer": 0,
              "why": {
                "right": "固定搭配 be interested in（对……感兴趣），副词 particularly 置于 be 动词之后、分词之前；B 误用 interesting；C 语序错误；D 介词 on 错误。",
                "wrong": [
                  "B are particularly interesting in the role：与正确项不符——interested 表“感到感兴趣的”，interesting 表“令人感兴趣的”，此处应用 interested；且介词应为 in。",
                  "C particularly interested in the role are：与正确项不符——语序错误，主语 Scientists 应在 be 动词前。",
                  "D are interested particularly on the role：与正确项不符——固定搭配是 be interested in，介词 on 错误。"
                ]
              }
            },
            {
              "n": 14,
              "q": "In a healthy reef, rock surfaces are often covered with a thin layer of algae ______ throughout the day.",
              "options": [
                "what these fish feed on",
                "that these fish are fed on",
                "that these fish feed on",
                "which is fed on these fish"
              ],
              "answer": 2,
              "why": {
                "right": "先行词为 algae，关系代词引导定语从句并在从句中作 feed on 的宾语；这些鱼以藻类为食（these fish feed on algae），为主动关系，用 that these fish feed on；A 中 what 不能引导定语从句；B、D 语态错误。",
                "wrong": [
                  "A what these fish feed on：与正确项不符——what 不能引导定语从句。",
                  "B that these fish are fed on：与正确项不符——这些鱼“吃”藻类是主动关系，被动语态错。",
                  "D which is fed on these fish：与正确项不符——语态错误且语序混乱。"
                ]
              }
            },
            {
              "n": 15,
              "q": "Many local families ______ of the reefs, since their livelihoods depend on fishing and tourism.",
              "options": [
                "worry deeply of the future",
                "are deeply worried with the future",
                "are deeply worried about the future",
                "are worrying deeply at the future"
              ],
              "answer": 2,
              "why": {
                "right": "固定搭配 be worried about（对……感到担心）；A、B、D 介词搭配均错误。",
                "wrong": [
                  "A worry deeply of the future：与正确项不符——worry 作谓语动词时搭配应为 worry about，且语态也错（应用 are worried）。",
                  "B are deeply worried with the future：与正确项不符——固定搭配是 be worried about，介词 with 错误。",
                  "D are worrying deeply at the future：与正确项不符——应用 be worried about 的被动结构，介词 at 也错误。"
                ]
              }
            },
            {
              "n": 16,
              "q": "the restoration project ______ two additional islands next year, and training programs for local volunteers have already been planned.",
              "options": [
                "will be expanded to include",
                "will expand to including",
                "is expanding for include",
                "has been expanded to including"
              ],
              "answer": 0,
              "why": {
                "right": "next year 提示将来时间，项目“将被扩大以包含……”，用一般将来时被动 will be expanded，后接不定式 to include 表目的或结果；B、D 中 to including 语法错误；C 结构错误。",
                "wrong": [
                  "B will expand to including：与正确项不符——project 与 expand 为被动关系，应用被动，且 to including 语法错误。",
                  "C is expanding for include：与正确项不符——结构错误，且未用被动。",
                  "D has been expanded to including：与正确项不符——现在完成时与 next year 将来时间不符，且 to including 语法错误。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "A. 被动语态的含义、基本用法和基本结构",
          "prompt": "被动语态结构：be（变化形式）+ 过去分词 (p.p.)；动作执行者用 by + 执行者表示，常可省略。\n只有及物动词（transitive verbs）才能构成被动语态；arrive, happen, occur, appear 等不及物动词不能用被动。\n\n练习：判断下列句子是主动语态（A）还是被动语态（P），并圈出谓语动词部分。\n1. The students planted twenty trees along the school fence last Friday. ( A / P )\n2. The school newsletter is published every two weeks. ( A / P )\n3. A new science laboratory was built next to the main building last year. ( A / P )\n4. Our class won the inter-school debate competition. ( A / P )\n5. The books were returned to the library before noon. ( A / P )\n6. The coach trains the swimming team every morning. ( A / P )\n7. All the invitations were sent out by the student council yesterday. ( A / P )\n8. Several famous scientists attended the annual technology conference. ( A / P )",
          "answer": "A: 1 A  2 P  3 P  4 A  5 P  6 A  7 P  8 A",
          "note": "主语是动作执行者为主动（A），结构为“主语 + 谓语动词 + 宾语”；主语是动作承受者且出现 be + 过去分词（is published / was built / were returned / were sent out）为被动（P）。"
        },
        {
          "title": "B. 不同时态下的被动语态",
          "prompt": "时态被动结构速查：\n· 一般现在时：am / is / are + p.p.（English is spoken here.）\n· 一般过去时：was / were + p.p.（The letter was sent yesterday.）\n· 一般将来时：will be + p.p.（The results will be announced tomorrow.）\n· 现在进行时：am / is / are + being + p.p.（The road is being repaired right now.）\n· 过去进行时：was / were + being + p.p.（The project was being reviewed when he arrived.）\n· 现在完成时：have / has + been + p.p.（The report has been submitted.）\n· 过去完成时：had + been + p.p.（The form had been filled in before the deadline.）\n\n练习：根据句意及括号内提示，用正确时态的被动语态填空。\n1. The gym ______ every evening by the maintenance staff. （一般现在时：clean）\n2. The annual sports day ______ because of heavy rain last year. （一般过去时：cancel）\n3. A new bicycle path ______ along the river next summer. （一般将来时：build）\n4. Look! The classroom walls ______ at the moment. （现在进行时：paint）\n5. The science fair projects ______ already ______ by the committee. （现在完成时：judge）\n6. The trophy ______ in the front hall when we arrived. （过去进行时：display）\n7. All tickets ______ before the show began. （过去完成时：sell out）\n8. The new timetable ______ on the school website next Monday. （一般将来时：post）",
          "answer": "B: 1 is cleaned  2 was canceled / was cancelled  3 will be built  4 are being painted  5 have ... been judged  6 was being displayed  7 had been sold out  8 will be posted",
          "note": "先根据句中时间状语（every evening / last year / next summer / Look! / already / when we arrived / before ... began / next Monday）判定时态，再套用对应的 be + p.p. 结构；注意主语单复数决定 be 动词形式，及规则动词过去分词（cancel → canceled/cancelled，sell → sold）。"
        },
        {
          "title": "C. 情态动词和情态动词短语的被动形式",
          "prompt": "情态动词被动结构：情态动词 + be + p.p.（情态动词本身不变形，be 永远用原形）。\n常见：can/could be + p.p.；must be + p.p.；should be + p.p.；may/might be + p.p.；will/would be + p.p.。\n情态动词短语被动：have to be + p.p.；be supposed to be + p.p.；be going to be + p.p.；used to be + p.p.；ought to be + p.p.。\n否定形式：在情态动词或第一个助动词后加 not。\n\n练习：用括号内情态动词（或情态动词短语）的被动形式改写句子。\n1. Someone must return the equipment to the storage room by 5 p.m.\n→ The equipment ______ to the storage room by 5 p.m. (must)\n2. We should notify all parents about the schedule change.\n→ All parents ______ about the schedule change. (should)\n3. You have to hand in all assignments before the deadline.\n→ All assignments ______ before the deadline. (have to)\n4. They are going to repair the science lab roof during the holidays.\n→ The science lab roof ______ during the holidays. (be going to)\n5. Someone is supposed to water the plants in the greenhouse every day.\n→ The plants in the greenhouse ______ every day. (be supposed to)\n6. We can solve this math problem in a different way.\n→ This math problem ______ in a different way. (can)\n7. They ought to update the school website more regularly.\n→ The school website ______ more regularly. (ought to)\n8. People used to call the old library the Reading Hall.\n→ The old library ______ the Reading Hall. (used to)",
          "answer": "C: 1 must be returned  2 should be notified  3 have to be handed in  4 is going to be repaired  5 are supposed to be watered  6 can be solved  7 ought to be updated  8 used to be called",
          "note": "把原句的宾语变为被动句主语，谓语动词改为“情态动词 + be + 过去分词”；短语动词（hand in、notify 去 y 变 i 加 -ed）保持完整，主语单数用 is / has，复数用 are / have to。"
        },
        {
          "title": "D. 表示状态的被动语态及特殊被动考点",
          "prompt": "状态被动（Stative Passive）说明主语“处于什么状态”，分词起形容词作用，常可与 for / since 连用，不可用于进行时；动作被动说明“动作被实施”，常带 by + 执行者。\n常见状态被动固定搭配（并非全用 by）：\nbe interested in / be excited or worried about / be surprised at or by / be satisfied with / be made of（看得出材料）or from（看不出）/ be known for（因…闻名）or as（作为…闻名）/ be covered or filled with / be located in or near or on / be based on / be used for or to do / be dressed in。\n补充：get + p.p. 表突发意外被动；happen, occur, appear, disappear, arrive, belong to, consist of, lack, resemble, fit, suit 等不及物或状态动词无被动；部分“物”作主语时主动形式表被动（washes easily / sells well）。\n\n练习：根据固定搭配或语境，圈出括号内正确的选项。\n1. Many students are interested ( in / on ) the school's robotics program.\n2. The classroom walls were covered ( by / with ) colorful posters before the open day.\n3. This modern bridge is made ( of / from ) strong steel and concrete.\n4. The small town is known ( for / as ) its annual spring flower festival.\n5. Our new gymnasium is located ( near / to ) the east gate of the campus.\n6. The documentary we watched yesterday was based ( on / in ) a true historical event.\n7. When we arrived, the auditorium was already filled ( of / with ) parents and teachers.\n8. A strange loud noise suddenly ( happened / was happened ) outside the laboratory last night.",
          "answer": "D: 1 in  2 with  3 of  4 for  5 near  6 on  7 with  8 happened",
          "note": "状态被动搭配用特定介词（interested in / covered with / made of / known for / located near / based on / filled with），不用 by 或 to；happen 是不及物动词，没有被动语态，直接用 happened。"
        }
      ]
    }
  ]
}
