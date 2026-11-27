/**
 * 小托福加油站 · Week 9（听力 + 语用（定语从句））
 *
 * 数据来源：Week 9 讲义 PDF（11 页：题目、选项、专项练习）
 *          + 答案解析 PDF（6 页：答案、简析、听力原文）。
 * 静态数据，零网络请求。听力周提供三段听力原文；原讲义未印出音频外链，
 * 二维码为图片且解析不到 URL，故不提供音频按钮（不臆造链接）。
 * 说明：阅读/完形类文章正文不入库，面板仅渲染题干（q/options/why）、
 *      听力原文（transcript）与专项练习（drills）。
 */

export const WEEK = {
  "key": "w9",
  "label": "Week 9",
  "subject": "听力 + 语用（定语从句）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 听力",
      "subtitle": "综合强化（一）",
      "groups": [
        {
          "key": "a0",
          "label": "Talk and Announcement · Questions 1-4",
          "questions": [
            {
              "n": 1,
              "q": "What is the main purpose of the announcement?",
              "options": [
                "To announce a change to the science fair schedule",
                "To explain how to build a display table",
                "To invite parents to a school concert",
                "To report the results of last year's fair"
              ],
              "answer": 0,
              "why": {
                "right": "校长说明因大风和降雨预报，科学展的时间和地点需要调整，主旨是宣布安排变化。原文：\"Because of the strong winds and possible rain in the forecast, we are adjusting our schedule and locations.\"",
                "wrong": [
                  "B 如何搭建展台：通知未讲展台搭建方法。",
                  "C 邀请家长参加音乐会：与科学展无关。",
                  "D 报告去年科学展结果：通知只讲本次安排调整。"
                ]
              }
            },
            {
              "n": 2,
              "q": "Why does the speaker mention the gym entrance?",
              "options": [
                "It is the only entrance with electricity.",
                "Students must bring their projects there first.",
                "Visitors will use it after the fair begins.",
                "Visitors will need help finding the gym."
              ],
              "answer": 1,
              "why": {
                "right": "学生要先把作品带到体育馆入口；主入口因维修仍关闭是补充原因。原文：\"all participating students must bring their projects directly to the gym entrance, since the main entrance is still closed for repairs.\"",
                "wrong": [
                  "A 唯一有电的入口：原文未提供电。",
                  "C 访客在展览开始后使用：通知说的是参赛学生送作品。",
                  "D 访客需要帮助找体育馆：未提及引导。"
                ]
              }
            },
            {
              "n": 3,
              "q": "What should students do before 8:30 a.m.?",
              "options": [
                "Set up their displays in the gym.",
                "Meet the judges in the library.",
                "Move the project tables outside.",
                "Collect tickets from the office."
              ],
              "answer": 0,
              "why": {
                "right": "通知要求学生在八点半前到达并在体育馆内完成展台布置。原文：\"finish setting up your displays inside the gym before 8:30 a.m.\"",
                "wrong": [
                  "B 在图书馆见评委：原文评委在体育馆评审。",
                  "C 把桌子搬到室外：展台在体育馆内布置。",
                  "D 到办公室领票：通知未提。"
                ]
              }
            },
            {
              "n": 4,
              "q": "What can be inferred about the weather plan?",
              "options": [
                "The fair will be canceled if it rains.",
                "Some activities may move indoors.",
                "Students will present only online.",
                "The gym will be used for parking."
              ],
              "answer": 1,
              "why": {
                "right": "如果下雨，原计划在室外跑道举行的太阳能车演示会移到餐厅。原文：\"if it starts raining, that outdoor demonstration will be moved into the cafeteria.\"",
                "wrong": [
                  "A 下雨就取消科学展：只是把户外活动移到室内，并未取消。",
                  "C 只线上展示：未提及。",
                  "D 体育馆用作停车场：与原文无关。"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Conversation · Questions 5-8",
          "questions": [
            {
              "n": 5,
              "q": "Why does Maya speak with the librarian?",
              "options": [
                "She needs help choosing a research source.",
                "She wants to reserve a study room.",
                "She is returning a damaged book.",
                "She needs a map of the library."
              ],
              "answer": 0,
              "why": {
                "right": "Maya 因为不会从数据库的大量结果中选择合适的研究资料而来求助。原文：\"I'm having trouble choosing the right research sources from the school database.\"",
                "wrong": [
                  "B 想预订自习室：未提及。",
                  "C 归还破损图书：未提及。",
                  "D 需要图书馆地图：未提及。"
                ]
              }
            },
            {
              "n": 6,
              "q": "What problem does the librarian identify?",
              "options": [
                "Maya's topic is too broad.",
                "Maya has missed the project deadline.",
                "The library computers are not working.",
                "The article has no pictures."
              ],
              "answer": 0,
              "why": {
                "right": "她只搜索了 \"bridges\"，范围太大，三页报告难以覆盖所有桥梁类型。原文：\"The problem is that your topic is much too broad.\"",
                "wrong": [
                  "B 错过了截止日期：原文说初稿下周五交，未逾期。",
                  "C 电脑故障：未提及。",
                  "D 文章没有图片：未提及。"
                ]
              }
            },
            {
              "n": 7,
              "q": "What does the librarian suggest Maya do first?",
              "options": [
                "Interview a local engineer.",
                "Search for articles about one kind of bridge.",
                "Write the final conclusion.",
                "Compare two library buildings."
              ],
              "answer": 1,
              "why": {
                "right": "Mr. Carter 建议先聚焦一种桥，例如 suspension bridges，再检索相关文章。原文：\"I suggest you start by focusing on just one specific type of bridge.\"",
                "wrong": [
                  "A 采访当地工程师：未提及。",
                  "C 写结论：这不是第一步。",
                  "D 比较两座图书馆建筑：与话题无关。"
                ]
              }
            },
            {
              "n": 8,
              "q": "What will Maya probably do next?",
              "options": [
                "Choose a narrower topic and search the database.",
                "Ask her teacher to cancel the assignment.",
                "Print every article about bridges.",
                "Visit the city bridge that afternoon."
              ],
              "answer": 0,
              "why": {
                "right": "Maya 表示会缩小主题并立即重新搜索数据库。原文：\"I'll narrow my topic to suspension bridges and search the database again right now.\"",
                "wrong": [
                  "B 请老师取消作业：与她积极配合的态度相反。",
                  "C 打印所有桥梁文章：她要聚焦一类桥。",
                  "D 当天去参观桥：未提及。"
                ]
              }
            }
          ]
        },
        {
          "key": "a2",
          "label": "Academic Talk · Questions 9-12",
          "questions": [
            {
              "n": 9,
              "q": "What is the talk mainly about?",
              "options": [
                "Why cities are usually windier than villages",
                "How urban heat islands affect city temperatures",
                "How to design a new kind of weather station",
                "Why trees grow faster in warm soil"
              ],
              "answer": 1,
              "why": {
                "right": "讲座解释城市热岛如何使城市温度高于附近乡村地区。原文：\"An urban heat island occurs when a city experiences much warmer temperatures than nearby rural areas.\"",
                "wrong": [
                  "A 城市为何比乡村风大：讲的是温度不是风。",
                  "C 设计新型气象站：未提及。",
                  "D 树在暖土中长得更快：未提及。"
                ]
              }
            },
            {
              "n": 10,
              "q": "According to the professor, why do dark roofs become hot?",
              "options": [
                "They absorb more sunlight than light roofs.",
                "They produce heat from underground pipes.",
                "They receive less rain than light roofs.",
                "They reflect sunlight toward nearby trees."
              ],
              "answer": 0,
              "why": {
                "right": "深色屋顶吸收的阳光多于浅色屋顶，因此更容易变热。原文：\"dark roofs become extremely hot because they absorb much more sunlight and trap that heat during the day.\"",
                "wrong": [
                  "B 地下管道产热：未提及。",
                  "C 雨水更少：未提及。",
                  "D 把阳光反射向树：恰恰相反，深色屋顶吸收阳光。"
                ]
              }
            },
            {
              "n": 11,
              "q": "Why does the professor mention a school playground?",
              "options": [
                "To give an example of a place with little shade",
                "To compare two kinds of playground equipment",
                "To explain how students measure wind speed",
                "To show that playgrounds are always cooler than parks"
              ],
              "answer": 0,
              "why": {
                "right": "无树荫的铺装操场是\"缺少遮阴、地面升温很快\"的具体例子。原文：\"a typical paved school playground that has no trees around it—because it has so little shade, the ground heats up very quickly.\"",
                "wrong": [
                  "B 比较两种游乐设备：未提及。",
                  "C 解释学生如何测风速：未提及。",
                  "D 操场总比公园凉：与例子含义相反。"
                ]
              }
            },
            {
              "n": 12,
              "q": "What solution does the professor suggest?",
              "options": [
                "Painting every road white",
                "Adding shade and reflective surfaces",
                "Closing schools during summer",
                "Building taller roofs over all cities"
              ],
              "answer": 1,
              "why": {
                "right": "解决办法包括多种树增加遮阴，并在屋顶和路面使用浅色反光材料。原文：\"By planting more trees to add shade and using lighter, reflective surfaces on roofs and pavements, cities can lower their temperatures.\"",
                "wrong": [
                  "A 把所有路刷白：夸张化，原文是浅色反光材料。",
                  "C 夏天停课：未提及。",
                  "D 全城加盖更高屋顶：未提及。"
                ]
              }
            }
          ]
        }
      ],
      "transcript": [
        {
          "label": "Q1–Q4 · Science Fair Schedule Changes",
          "text": "Narrator: Listen to an announcement from a school principal.\nPrincipal: Good morning, everyone. I have an important update about tomorrow's school science fair. Because of the strong winds and possible rain in the forecast, we are adjusting our schedule and locations. Instead of checking in at the courtyard at nine o'clock, all participating students must bring their projects directly to the gym entrance, since the main entrance is still closed for repairs. Please make sure you arrive early and finish setting up your displays inside the gym before 8:30 a.m., as the judges will begin reviewing projects at 8:30 sharp. We still hope to hold the solar-car demonstration on the outdoor track at 11:00, but if it starts raining, that outdoor demonstration will be moved into the cafeteria. Thank you for your cooperation!"
        },
        {
          "label": "Q5–Q8 · Narrowing a History Report Topic",
          "text": "Narrator: Listen to a conversation between a student and a librarian.\nMaya: Excuse me, Mr. Carter. I'm working on my history report about bridges, and I'm having trouble choosing the right research sources from the school database. There are thousands of results, and I don't know where to start.\nMr. Carter: Let's take a look at your search terms, Maya. Well, you just typed in \"bridges.\" The problem is that your topic is much too broad. If you try to write about every kind of bridge in history, you'll have way too much information to cover in a three-page paper.\nMaya: That makes sense. How should I narrow it down?\nMr. Carter: I suggest you start by focusing on just one specific type of bridge—for example, suspension bridges—and search for articles only about that kind.\nMaya: Should I read every article I find?\nMr. Carter: No. Start with the titles and abstracts, save two or three useful sources, and record each author and publication date. Your first draft is due next Friday.\nMaya: That helps a lot. I'll narrow my topic to suspension bridges and search the database again right now. Thanks for your help!"
        },
        {
          "label": "Q9–Q12 · How Urban Heat Islands Raise City Temperatures",
          "text": "Narrator: Listen to a science teacher talking to a class.\nTeacher: Today we're going to discuss how urban heat islands affect city temperatures. An urban heat island occurs when a city experiences much warmer temperatures than nearby rural areas. A major cause of this effect is the dark surfaces found across cities, such as asphalt roads and dark building roofs. Unlike light-colored surfaces, dark roofs become extremely hot because they absorb much more sunlight and trap that heat during the day. Another factor is the lack of trees and vegetation. For instance, think about a typical paved school playground that has no trees around it—because it has so little shade, the ground heats up very quickly under the afternoon sun. Fortunately, city planners have practical solutions to reduce this heat. By planting more trees to add shade and using lighter, reflective surfaces on roofs and pavements, cities can lower their temperatures significantly."
        }
      ],
      "drills": [
        {
          "title": "A. 听记填空 1 · Museum Notice",
          "prompt": "听录音，完成填空（每空填写 1–3 个词）。\nMuseum Director: Good morning, students. I have a quick announcement about this week. The school museum will close early on Friday at ____ for an electrical ____. Students should use the ____ entrance because the west entrance will be locked. Please ____ all audio guides before leaving. The guided tour of the new fossils begins at ____, and students who attend it should arrive ____ minutes early.",
          "answer": "2:45 p.m. / inspection / east / return / 12:30 p.m. / ten (10)",
          "note": "注意时间与方位细节：周五 2:45 p.m. 提前闭馆做电路检修；走东门；归还讲解器；化石导览 12:30 开始，提前 10 分钟到。"
        },
        {
          "title": "B. 听记填空 2 · Weather Station Field Trip",
          "prompt": "听录音，完成填空（每空填写 1–3 个词）。\nTeacher: All right, everyone, here are the details for our trip. On Thursday, our weather station field trip will begin at the ____ steps. Bring a ____ notebook because we may record data outside. The bus leaves at ____, and we should return before ____. If it rains heavily, we will stay at school and use the ____ simulator instead. Please don't forget your ____ forms.",
          "answer": "library / waterproof / 8:15 / noon / indoor / permission",
          "note": "集合地点是图书馆台阶；带防水笔记本；8:15 出发、中午前返回；大雨则留校用室内模拟器；别忘许可表。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "定语从句",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Email · Questions 1-4",
          "questions": [
            {
              "n": 1,
              "q": "Mr. Lee, the teacher ______ judged our projects, said our poster was one of the clearest in the gym.",
              "options": [
                "judged",
                "who judged",
                "he judged",
                "was judging"
              ],
              "answer": 1,
              "why": {
                "right": "the teacher who judged our projects 是同位语，里面带一个定语从句。先行词指人，关系词在从句中作主语，用 who。",
                "wrong": [
                  "A judged：缺关系词，句子多出一个谓语。",
                  "C he judged：两个句子直接用逗号连接，结构错误。",
                  "D was judging：同样缺关系词且语义为过去进行，不当。"
                ]
              }
            },
            {
              "n": 2,
              "q": "He also told us ______ our results section before the city competition.",
              "options": [
                "improve",
                "improving",
                "improved",
                "to improve"
              ],
              "answer": 3,
              "why": {
                "right": "tell sb. to do sth. 表示\"告诉某人做某事\"，用不定式 to improve。",
                "wrong": [
                  "A improve：tell 后不能直接接原形。",
                  "B improving：tell sb. doing 不是正确搭配。",
                  "C improved：过去分词不合语义。"
                ]
              }
            },
            {
              "n": 3,
              "q": "I have already ______ the new graphs, so could you check them this weekend?",
              "options": [
                "arrived",
                "happened",
                "finished",
                "joined"
              ],
              "answer": 2,
              "why": {
                "right": "finish the graphs 意为\"完成图表\"，与后文请对方检查相呼应。",
                "wrong": [
                  "A arrived / B happened 是不及物动词，不能接宾语 the new graphs。",
                  "D joined 意思不通。"
                ]
              }
            },
            {
              "n": 4,
              "q": "The competition will be held at City Hall, ______ a large room for student displays.",
              "options": [
                "it has",
                "where has",
                "that it has",
                "which has"
              ],
              "answer": 3,
              "why": {
                "right": "逗号后补充说明 City Hall，从句缺主语，用 which has（非限定性定语从句，which 作主语）。",
                "wrong": [
                  "A it has：两个句子直接用逗号连接。",
                  "B where has：where 后需完整主谓。",
                  "C that it has：that 不能引导非限定性从句。"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Intermediate · Notice · Questions 5-12",
          "questions": [
            {
              "n": 5,
              "q": "This Saturday, the Green Club ______ a volunteer day in the school garden.",
              "options": [
                "holding",
                "will hold",
                "to hold",
                "have held"
              ],
              "answer": 1,
              "why": {
                "right": "This Saturday 指将来，主语 the Green Club 是单数，用 will hold。",
                "wrong": [
                  "A holding：缺少谓语。",
                  "C to hold：不定式不能作谓语。",
                  "D have held：时态与将来时间不符，且主谓不一致。"
                ]
              }
            },
            {
              "n": 6,
              "q": "Students ______ want to take part should sign up in Room 204 by Thursday.",
              "options": [
                "they",
                "which",
                "who",
                "whose"
              ],
              "answer": 2,
              "why": {
                "right": "先行词 Students 指人，从句缺主语，用 who。",
                "wrong": [
                  "A they：会让句子出现两个谓语。",
                  "B which：不能指人。",
                  "D whose：作定语，后面需接名词。"
                ]
              }
            },
            {
              "n": 7,
              "q": "Volunteers will plant vegetables in the area ______ the old greenhouse used to stand.",
              "options": [
                "which",
                "that",
                "in that",
                "where"
              ],
              "answer": 3,
              "why": {
                "right": "从句 the old greenhouse used to stand 中 stand 不及物，缺的是地点状语，用 where。",
                "wrong": [
                  "A which / B that：在从句中作主宾，但此处缺状语。",
                  "C in that：that 不能放在介词后引导定语从句。"
                ]
              }
            },
            {
              "n": 8,
              "q": "Please wear old clothes, ______ the soil may still be wet from the rain.",
              "options": [
                "because",
                "unless",
                "although",
                "so that"
              ],
              "answer": 0,
              "why": {
                "right": "\"穿旧衣服\"是因为\"土可能还是湿的\"，表原因用 because。",
                "wrong": [
                  "B unless 除非：语义不通。",
                  "C although 尽管：不合逻辑。",
                  "D so that 以便：后文是原因不是目的。"
                ]
              }
            },
            {
              "n": 9,
              "q": "Gloves and tools will be ______ by the club, so you do not need to bring your own.",
              "options": [
                "provide",
                "providing",
                "provided",
                "provides"
              ],
              "answer": 2,
              "why": {
                "right": "工具是\"被提供\"的，will be + 过去分词，用 provided。",
                "wrong": [
                  "A provide：被动语态需过去分词。",
                  "B providing / D provides：均非被动形式。"
                ]
              }
            },
            {
              "n": 10,
              "q": "This year's garden will be ______ than last year's, so we need more helpers.",
              "options": [
                "large",
                "largest",
                "more large",
                "larger"
              ],
              "answer": 3,
              "why": {
                "right": "后面有 than，用比较级 larger。",
                "wrong": [
                  "A large：原级不能与 than 连用。",
                  "B largest：最高级。",
                  "C more large：large 的比较级是 larger。"
                ]
              }
            },
            {
              "n": 11,
              "q": "Each volunteer will be given a small plant ______ home and care for over the summer.",
              "options": [
                "to take",
                "taking",
                "takes",
                "took"
              ],
              "answer": 0,
              "why": {
                "right": "不定式 to take home 作后置定语，表示\"用来带回家的植物\"。",
                "wrong": [
                  "B taking / C takes / D took：均不能作后置定语表示用途。"
                ]
              }
            },
            {
              "n": 12,
              "q": "Any vegetables ______ in the garden this fall will be shared with the school cafeteria.",
              "options": [
                "are grown",
                "that are grown",
                "they are grown",
                "grown they are"
              ],
              "answer": 1,
              "why": {
                "right": "句子的谓语是 will be shared，空格处只能填定语从句 that are grown 修饰 vegetables。",
                "wrong": [
                  "A are grown / C they are grown / D grown they are：都会让句子出现两个谓语或结构错乱。"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Advanced · Article · Questions 13-20",
          "questions": [
            {
              "n": 13,
              "q": "______ a bird that weighs only about 100 grams, the Arctic tern makes the longest migration of any animal.",
              "options": [
                "It is",
                "Despite being",
                "Because of",
                "Even it is"
              ],
              "answer": 1,
              "why": {
                "right": "Despite being... 表让步，\"虽然只是一只约 100 克的鸟\"。",
                "wrong": [
                  "A It is / D Even it is：两个句子直接用逗号连接。",
                  "C Because of：语义不通，让步关系不是原因。"
                ]
              }
            },
            {
              "n": 14,
              "q": "Each year it flies from the Arctic to Antarctica and back, a round trip ______ can cover more than 70,000 kilometers.",
              "options": [
                "where",
                "what",
                "it",
                "which"
              ],
              "answer": 3,
              "why": {
                "right": "a round trip 是同位语，which 在从句中作主语，引导非限定性定语从句。",
                "wrong": [
                  "A where：后面需完整主谓。",
                  "B what：不能引导定语从句。",
                  "C it：两个句子直接用逗号连接。"
                ]
              }
            },
            {
              "n": 15,
              "q": "Scientists who tracked the birds with tiny devices ______ that the terns do not fly in a straight line.",
              "options": [
                "discovering",
                "to discover",
                "discovered",
                "who discovered"
              ],
              "answer": 2,
              "why": {
                "right": "who tracked... 是修饰主语 Scientists 的定语从句，主句还缺谓语，所以选 discovered。",
                "wrong": [
                  "A discovering / B to discover：主句缺谓语。",
                  "D who discovered：会再套一层定语从句，主句仍缺谓语。"
                ]
              }
            },
            {
              "n": 16,
              "q": "Instead, they follow a zigzag route ______ winds help them save energy.",
              "options": [
                "which",
                "on which",
                "that",
                "what"
              ],
              "answer": 1,
              "why": {
                "right": "从句 winds help them save energy 成分完整，缺地点状语；还原为 winds help them on the route，用 on which（= where）。",
                "wrong": [
                  "A which / C that：在从句中作主宾，此处缺状语。",
                  "D what：不能引导定语从句。"
                ]
              }
            },
            {
              "n": 17,
              "q": "This clever path allows the terns to ______ long stretches of ocean without stopping to rest.",
              "options": [
                "cross",
                "reach",
                "arrive",
                "meet"
              ],
              "answer": 0,
              "why": {
                "right": "cross long stretches of ocean 意为\"飞越大片海洋\"。",
                "wrong": [
                  "B reach：及物但语义不如 cross 贴切。",
                  "C arrive：后面要接介词 at/in。",
                  "D meet 意思不通。"
                ]
              }
            },
            {
              "n": 18,
              "q": "Because the tern spends summer in both the north and the south, it sees more daylight ______ any other animal on Earth.",
              "options": [
                "as",
                "then",
                "than",
                "more than"
              ],
              "answer": 2,
              "why": {
                "right": "more...than... 比较结构，后面有 any other animal，用 than。",
                "wrong": [
                  "A as：不构成比较。",
                  "B then：形近干扰项，表\"然后\"。",
                  "D more than：前面已有 more，重复。"
                ]
              }
            },
            {
              "n": 19,
              "q": "The tern, ______ feathers are mostly white and gray, is hard to spot against bright skies.",
              "options": [
                "which",
                "its",
                "that",
                "whose"
              ],
              "answer": 3,
              "why": {
                "right": "whose feathers 意为\"它的羽毛\"，whose 在从句中作定语。",
                "wrong": [
                  "A which / C that：不能作定语修饰 feathers。",
                  "B its：会让句子结构断裂，逗号后不能接独立名词短语。"
                ]
              }
            },
            {
              "n": 20,
              "q": "Researchers hope that the data ______ from these birds will help protect the places where they stop to feed.",
              "options": [
                "collected",
                "collecting",
                "collects",
                "was collected"
              ],
              "answer": 0,
              "why": {
                "right": "the data collected from these birds 相当于 which was collected... 省略后的过去分词作后置定语，句子谓语是 will help。",
                "wrong": [
                  "B collecting：现在分词表主动，数据是\"被采集\"。",
                  "C collects：会造成双谓语。",
                  "D was collected：从句谓语形式，此处需非谓语作定语。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "A. 先行词与关系词",
          "prompt": "选择最恰当的关系词。\n1. The scientist ______ discovered the comet won an award.\n2. The experiment ______ we discussed yesterday needs more data.\n3. The student ______ notebook was missing reported it to the office.\n4. The laboratory ______ the students work has new safety equipment.\n5. The year ______ the observatory opened was unusually rainy.\n6. The reason ______ the team changed its plan was simple.",
          "answer": "1 D (who)　2 C (which)　3 B (whose)　4 A (where)　5 C (when)　6 B (why)",
          "note": "scientist 指人作主语用 who；experiment 指物作宾语用 which；notebook 前需定语用 whose；laboratory 表地点用 where；year 表时间用 when；reason 表原因用 why。"
        },
        {
          "title": "B. 关系副词与介词 + 关系代词",
          "prompt": "选出最恰当的答案。\n1. This is the room ______ we held the meeting.\n2. I remember the day ______ we first met.\n3. That is the reason ______ the lights were turned off.",
          "answer": "1 C (in which)　2 A (on which)　3 A (for which)",
          "note": "介词来自从句动词搭配：held the meeting in the room → in which；met on the day → on which；turned off the lights for a reason → for which。"
        },
        {
          "title": "C. 限定性与非限定性定语从句",
          "prompt": "选择正确的一项，注意题干与选项中的逗号与关系词。\n1. Jonathan, ______ went abroad five years ago, is coming back to Shanghai next week.\n2. The students ______ joined the robotics club must attend the safety meeting.\n3. The Amazon River, ______ is one of the longest rivers in the world, flows through several countries.\n4. Which sentence is correct?\n5. The first telescope ______ Galileo used changed astronomy.",
          "answer": "1 A (who)　2 B (who)　3 C (which)　4 C (My bike, which I repaired yesterday, works well.)　5 D (that)",
          "note": "逗号后的非限定性从句指人用 who、指物用 which（不能用 that）；无逗号限定性从句说明是哪一批，用 who；非限定性从句两侧需逗号；先行词指物作宾语，限定性可用 that。"
        },
        {
          "title": "D. 语用综合操练",
          "prompt": "选择最恰当的一项。\n1. The engineer ______ designs the bridge lives nearby.\n2. The bridge, ______ was built in 1925, is still open to cars.\n3. The village ______ my grandparents grew up is beside a lake.\n4. The book ______ cover is torn belongs to the science club.\n5. The month ______ the festival is held changes each year.\n6. The reason ______ the trail was closed was heavy snow.\n7. The report ______ you sent contains two useful maps.\n8. Our teacher, ______ has studied volcanoes for years, explained the warning signs.",
          "answer": "1 B (who)　2 A (which)　3 B (where)　4 B (whose)　5 D (when)　6 C (why)　7 C (which)　8 D (who)",
          "note": "engineer 指人作主语用 who；逗号后非限定指物用 which；village 表地点用 where；cover 前需定语用 whose；month 表时间用 when；reason 缺原因状语用 why；report 指物作宾语用 which；逗号后非限定指人用 who。"
        }
      ]
    }
  ]
}
