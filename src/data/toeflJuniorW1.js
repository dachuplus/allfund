/**
 * 小托福加油站 · Week 1（听力 + 语用（名词与冠词））
 *
 * 数据来源：Week 讲义 PDF（题目与选项）+ 答案解析 PDF（答案、简析、听力原文）。
 * 静态数据，零网络请求；听力音频为原讲义二维码解析出的外链。
 */

export const WEEK = {
  "key": "w1",
  "label": "Week 1",
  "subject": "听力 + 语用（名词与冠词）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 听力",
      "subtitle": "讲话、公告、通知类",
      "groups": [
        {
          "key": "a0",
          "label": "Basic",
          "questions": [
            {
              "n": 1,
              "q": "Listen to a teacher talking about a school trip. What does the teacher want the students to do?",
              "options": [
                "Pay for the ticket at the museum",
                "Give back a signed form by Wednesday",
                "Order lunch for the whole class",
                "Meet at the museum on Thursday"
              ],
              "answer": 1,
              "key": "bring back the permission form … by Wednesday",
              "why": {
                "right": "老师明确要求「bring back the permission form … by Wednesday」——周三前把家长签好的同意书交回来。",
                "wrong": [
                  "A 原文只要求交回同意书，没有提到在博物馆买票",
                  "C 原文没有订午餐这一要求",
                  "D 原文说的是周五出行、在校门口集合，不是在博物馆见面"
                ]
              }
            },
            {
              "n": 2,
              "q": "Listen to a coach talking to a sports team. Why will the team meeting be on Thursday?",
              "options": [
                "Room 12 is closed on Wednesday",
                "The coach has another game on Wednesday",
                "Students need more time to practise",
                "There is a match on Thursday afternoon"
              ],
              "answer": 1,
              "key": "On Wednesday I'm helping out at the middle school game",
              "why": {
                "right": "关键句「On Wednesday I'm helping out at the middle school game」——教练周三要去中学的比赛帮忙，所以队会改到周四。",
                "wrong": [
                  "A 原文提到会议室是 12 号房，没说周三关闭",
                  "C 需要更多练习时间在原文中没有提到",
                  "D 周四是改期后的时间，原文没说周四下午有比赛"
                ]
              }
            },
            {
              "n": 3,
              "q": "Listen to a librarian talking to students. What change does the library have?",
              "options": [
                "New books have arrived",
                "It will now close earlier",
                "It will open earlier in the morning",
                "Computer rooms are open on weekends"
              ],
              "answer": 2,
              "key": "open at 8:30 … instead of 9:00",
              "why": {
                "right": "关键句「open at 8:30 … instead of 9:00」——图书馆早上提前半小时开门。",
                "wrong": [
                  "A 到新书原文没有提到",
                  "B 与原文相反，是提前开门而不是提前关门",
                  "D 机房周末开放原文没有提到"
                ]
              }
            },
            {
              "n": 4,
              "q": "Listen to a school principal making an announcement. What is the announcement about?",
              "options": [
                "A guest speaker will visit the school",
                "The school is opening a new library",
                "Students will have a shorter lunch break",
                "A new sports team is forming"
              ],
              "answer": 0,
              "key": "welcome a famous nature photographer to our school",
              "why": {
                "right": "关键句「welcome a famous nature photographer to our school」——宣布一位著名自然摄影师将来学校。",
                "wrong": [
                  "B 新图书馆原文没有提到",
                  "C 午休缩短原文没有提到",
                  "D 组建新运动队原文没有提到"
                ]
              }
            },
            {
              "n": 5,
              "q": "Listen to a teacher introducing a class project. What is the project about?",
              "options": [
                "Growing plants in the classroom",
                "Writing a report about a famous person",
                "Recording a short science experiment",
                "Drawing a map of the school"
              ],
              "answer": 0,
              "key": "grow a small garden by the classroom window",
              "why": {
                "right": "关键句「grow a small garden by the classroom window」——项目是在教室窗边种一个小花园。",
                "wrong": [
                  "B 写名人报告不是这个项目的内容",
                  "C 记录科学实验原文没有提到",
                  "D 画学校地图原文没有提到"
                ]
              }
            },
            {
              "n": 6,
              "q": "Listen to a school nurse talking to students. What should students do?",
              "options": [
                "Go to the office if they feel better",
                "Stay home and rest if they have a fever",
                "Drink more water in winter",
                "Wash their hands after lunch"
              ],
              "answer": 1,
              "key": "if you have a fever, stay home and rest",
              "why": {
                "right": "关键句「if you have a fever, stay home and rest」——发烧就在家休息。",
                "wrong": [
                  "A 与原文相反，原文强调发烧要在家休息而不是去办公室",
                  "C 多喝水只是次要建议，不是主要要求",
                  "D 饭后洗手原文没有提到"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Advanced",
          "questions": [
            {
              "n": 7,
              "q": "Listen to a teacher explaining a change to the homework schedule. Why does the teacher change the plan?",
              "options": [
                "The class will visit a museum on Friday",
                "There is a school assembly on Thursday",
                "The students need extra practice in grammar",
                "The teacher is away on the original due date"
              ],
              "answer": 3,
              "key": "I'll be away at a conference this Friday",
              "why": {
                "right": "关键句「I'll be away at a conference this Friday」——老师原定周五要去开会，所以把测验改到周一。",
                "wrong": [
                  "A 周五去博物馆原文没有提到",
                  "B 周四有集会原文没有提到",
                  "C 需要多练语法不是改期的原因"
                ]
              }
            },
            {
              "n": 8,
              "q": "Listen to a school manager talking about the new bus route. What will be different for some students?",
              "options": [
                "They may need to walk a little further",
                "The bus will now stop at every house",
                "They will have to wake up much earlier",
                "The bus service will stop after this term"
              ],
              "answer": 0,
              "key": "you may need to walk five more minutes",
              "why": {
                "right": "关键句「you may need to walk five more minutes」——新站点离学校更远，要多走几分钟。",
                "wrong": [
                  "B 原文没有说每家每户都停",
                  "C 只是多走五分钟，不必比以前早起很多",
                  "D 校车停运原文没有提到"
                ]
              }
            },
            {
              "n": 9,
              "q": "Listen to a teacher talking about a class competition. What can we infer about the teacher?",
              "options": [
                "She wants every student to take part",
                "She is worried about the prize money",
                "She thinks the competition is too difficult",
                "She will choose the winner herself"
              ],
              "answer": 0,
              "key": "I'd really love to see each of you take part",
              "why": {
                "right": "关键句「I'd really love to see each of you take part」——老师希望每个学生都参加。",
                "wrong": [
                  "B 担心奖金原文没有提到",
                  "C 与原文相反，老师说不必是最好的写手也能参加",
                  "D 原文说大家分组合作，没有说自己来选冠军"
                ]
              }
            }
          ]
        }
      ],
      "audio": [
        {
          "label": "Q1-6 音频",
          "url": "https://bnokj.speiyou.com/peiQi/?url=3948"
        },
        {
          "label": "Q7-9 音频",
          "url": "https://bnokj.speiyou.com/peiQi/?url=3949"
        }
      ],
      "audioNote": "以上链接来自原讲义二维码（扫描后跳转）。听力每段只播放一次，可先读题干与选项再播放。",
      "transcript": [
        {
          "label": "Q1",
          "text": "Narrator: Listen to a teacher talking about a school trip.\nTeacher: \"Class, a quick reminder about Friday's trip to the science museum. You need to bring back the permission form that\nyour parents signed. Please give it to me by Wednesday, not Thursday, because I need to count how many tickets to order. If\nyou forget it, you won't be able to come.\""
        },
        {
          "label": "Q2",
          "text": "Narrator: Listen to a coach talking to a sports team.\nCoach: \"Thanks, everyone, for a great practice today! One change to our week: our team meeting is now on Thursday at noon\nin room 12, not Wednesday. On Wednesday I'm helping out at the middle school game, so we can't meet then. Please bring\nyour playbook and a water bottle.\""
        },
        {
          "label": "Q3",
          "text": "Narrator: Listen to a librarian talking to students.\nLibrarian: \"Just a note for everyone: starting next Monday, our library will open at 8:30 in the morning instead of 9:00. The\nchange is because more students are coming early to study. Please come in quietly, and remember to bring your student card\nto take books home.\""
        },
        {
          "label": "Q4",
          "text": "Narrator: Listen to a school principal making an announcement.\nPrincipal: \"I'm very happy to announce that we'll welcome a famous nature photographer to our school on Friday morning.\nShe'll share her pictures from around the world at a special assembly in the main hall. All students are encouraged to attend.\""
        },
        {
          "label": "Q5",
          "text": "Narrator: Listen to a teacher introducing a class project.\nTeacher: \"This term we're starting a class project. We're going to grow a small garden by the classroom window — flowers\nand a few herbs. You'll each take care of one plant and keep notes about how it grows. By June, we'll have our own little\ngarden!\""
        },
        {
          "label": "Q6",
          "text": "Narrator: Listen to a school nurse talking to students.\nNurse: \"With the cold weather coming, please look after yourselves. The most important thing is this: if you have a fever,\nstay home and rest until you feel better. That way you won't pass it to your classmates. Drink plenty of water and cover your\ncough.\""
        },
        {
          "label": "Q7",
          "text": "Narrator: Listen to a teacher explaining a change to the homework schedule.\nTeacher: \"Just so you know, I've moved our grammar quiz to Monday. I'll be away at a conference this Friday, so we can't\ntake the test on the day I'd planned. Please bring your homework on Monday, and we'll go over it together before the quiz.\""
        },
        {
          "label": "Q8",
          "text": "Narrator: Listen to a school manager talking about the new bus route.\nManager: \"From next term, the school bus will drop students at the gate on Austin Road instead of the old stop on the corner.\nIt's a bit further from the school building — you may need to walk five more minutes. Please plan for the extra time so you're\nnot late.\""
        },
        {
          "label": "Q9",
          "text": "Narrator: Listen to a teacher talking about a class competition.\nTeacher: \"This writing competition is open to everyone, and I'd really love to see each of you take part. You don't have to be\nthe best writer to join — we'll work in teams, and everyone gets a chance to share ideas. It's about enjoying the process, not\njust winning.\""
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "A 识别问法 1 M　2 D　3 D　4 D　5 M"
        },
        {
          "title": "专项练习答案",
          "answer": "B 找关键词 转折：but / however / still / yet / though / despite 因果：because / since / due to；so / that's why / as a result of 目的：want you to / to tell you about / in order to / don't forget to / so that"
        },
        {
          "title": "专项练习答案",
          "answer": "C 识别同义替换 B"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "名词与冠词",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "Thank you for your letter about my visit. Let me give you some ______",
              "options": [
                "informations",
                "information",
                "an information",
                "of information"
              ],
              "answer": 1,
              "why": {
                "right": "information 不可数，不加  -s 也不用  an",
                "wrong": [
                  "A 复数错",
                  "C 加冠词错",
                  "D 多  of "
                ]
              }
            },
            {
              "n": 2,
              "q": "I need to booknear your house for two night and I will reach the station. ______",
              "options": [
                "the hotel",
                "a hotel",
                "an hotel",
                "hotel"
              ],
              "answer": 1,
              "why": {
                "right": "首次提到、可数单数用  a",
                "wrong": [
                  "C an 不接  /h/ 音",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 3,
              "q": "on Friday morning. Last week I sent to your mother, but I am not sure she has read it. ______",
              "options": [
                "a email",
                "an email",
                "the email",
                "email"
              ],
              "answer": 1,
              "why": {
                "right": "email 以元音音素  /iː/ 开头用  an",
                "wrong": [
                  "A 用  a 错",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 4,
              "q": "I was happy to get about your new school. ______",
              "options": [
                "a news",
                "a piece of news",
                "many news",
                "piece of news"
              ],
              "answer": 1,
              "why": {
                "right": "news 不可数，计「一条」用  a piece of news",
                "wrong": [
                  "C many 不接不可数",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 5,
              "q": "I would love to seeof your town, so please bring your camera. ______",
              "options": [
                "photo",
                "photos",
                "a photos",
                "photoes"
              ],
              "answer": 1,
              "why": {
                "right": "photos 复数直接加  -s",
                "wrong": [
                  "D photoes 拼写错",
                  "C a photos 单复数冲突"
                ]
              }
            },
            {
              "n": 6,
              "q": "My sister will join us on Saturday, so we needfor the show. ______",
              "options": [
                "the more tickets",
                "a tickets",
                "two more tickets",
                "more two tickets"
              ],
              "answer": 2,
              "why": {
                "right": "two more tickets ：数词  + more + 复数名词",
                "wrong": [
                  "A the more 特指不当",
                  "B a tickets 单复数冲突",
                  "D 词序错"
                ]
              }
            },
            {
              "n": 7,
              "q": "I will bringfor us, so you do not need to prepare anything. ______",
              "options": [
                "enough sleeping bags",
                "sleeping bag enough",
                "enough of sleeping bags",
                "sleeping bags of enough"
              ],
              "answer": 0,
              "why": {
                "right": "enough + 复数名词， enough 置前",
                "wrong": [
                  "B sleeping bag enough：与正确项不符——enough + 复数名词， enough 置前",
                  "C enough of sleeping bags：与正确项不符——enough + 复数名词， enough 置前",
                  "D sleeping bags of enough：与正确项不符——enough + 复数名词， enough 置前"
                ]
              }
            },
            {
              "n": 8,
              "q": "Thank you again for. I am looking forward to seeing you. ______",
              "options": [
                "a invitation",
                "an invitation",
                "the invitation",
                "invitation"
              ],
              "answer": 1,
              "why": {
                "right": "invitation 以元音音素  /ɪ/ 开头用  an",
                "wrong": [
                  "A 用  a 错",
                  "D 缺冠词"
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
              "q": "Our community will hold a sports day next month. It isbig event for everyone in the town. ______",
              "options": [
                "a",
                "an",
                "the",
                "ø"
              ],
              "answer": 0,
              "why": {
                "right": "big event 首次提到用  a",
                "wrong": [
                  "B an 不接  /b/ 音",
                  "C the 特指不当",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 10,
              "q": "The games will start at nine and finish at noon, so the whole morning will last . ______",
              "options": [
                "a hour",
                "an hour",
                "the hour",
                "hour"
              ],
              "answer": 1,
              "why": {
                "right": "hour 的  h 不发音，用  an",
                "wrong": [
                  "A 用  a 错",
                  "C the 特指不当",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 11,
              "q": "We need helpers for the races. Every must bring comfortable shoes. ______",
              "options": [
                "student",
                "students",
                "of student",
                "the student"
              ],
              "answer": 0,
              "why": {
                "right": "every + 单数可数名词  student",
                "wrong": [
                  "B 复数错"
                ]
              }
            },
            {
              "n": 12,
              "q": "Please also bring, because the weather will be hot all day. ______",
              "options": [
                "a water",
                "waters",
                "some water",
                "many water"
              ],
              "answer": 2,
              "why": {
                "right": "water 不可数，用  some water",
                "wrong": [
                  "A a water：与正确项不符——water 不可数，用  some water",
                  "B waters：与正确项不符——water 不可数，用  some water",
                  "D many water：与正确项不符——water 不可数，用  some water"
                ]
              }
            },
            {
              "n": 13,
              "q": "We must take care of all the, because the school lends it to us. ______",
              "options": [
                "equipments",
                "equipment",
                "an equipment",
                "of equipments"
              ],
              "answer": 1,
              "why": {
                "right": "equipment 不可数，无复数、不加冠词",
                "wrong": [
                  "A 复数错",
                  "C 加冠词错",
                  "D 词序与复数双错"
                ]
              }
            },
            {
              "n": 14,
              "q": "Two parents are preparingfor the running race. ______",
              "options": [
                "the list of players",
                "players the list",
                "list of the players",
                "the players of list"
              ],
              "answer": 0,
              "why": {
                "right": "the list of players ： the + 名词  + of + 名词",
                "wrong": [
                  "C 缺  the "
                ]
              }
            },
            {
              "n": 15,
              "q": "We hope everyone will come and enjoywith us. ______",
              "options": [
                "a day",
                "the day",
                "day",
                "an day"
              ],
              "answer": 1,
              "why": {
                "right": "特指这次  sports day 的那一天用  the",
                "wrong": [
                  "A 特指不当",
                  "C 缺冠词",
                  "D an 不接  /d/ 音"
                ]
              }
            },
            {
              "n": 16,
              "q": "For more information, please contact the office. Thank you for ______",
              "options": [
                "many help",
                "some help",
                "a help",
                "helps"
              ],
              "answer": 1,
              "why": {
                "right": "help 不可数，用  some help",
                "wrong": [
                  "A many 不接不可数",
                  "C a 不接不可数",
                  "D 复数错"
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
              "q": "Last year our school startedscience club for students who love science. ______",
              "options": [
                "a",
                "an",
                "the",
                "ø"
              ],
              "answer": 0,
              "why": {
                "right": "science club 首次提到用  a",
                "wrong": [
                  "B an 不接  /s/ 音",
                  "C the 特指不当",
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 2,
              "q": "The old instrument was once used by . ______",
              "options": [
                "a famous local astronomer",
                "famous a local astronomer",
                "local famous astronomer",
                "famous local an astronomer"
              ],
              "answer": 0,
              "why": {
                "right": "a + 形容词  + 名词（ a famous local astronomer ）",
                "wrong": [
                  "B famous a local astronomer：与正确项不符——a + 形容词  + 名词（ a famous local astronomer ）",
                  "C local famous astronomer：与正确项不符——a + 形容词  + 名词（ a famous local astronomer ）",
                  "D famous local an astronomer：与正确项不符——a + 形容词  + 名词（ a famous local astronomer ）"
                ]
              }
            },
            {
              "n": 3,
              "q": "incupboard next to the door. ______",
              "options": [
                "the",
                "a",
                "an",
                "ø"
              ],
              "answer": 0,
              "why": {
                "right": "特指门口那个柜子用  the",
                "wrong": [
                  "D 缺冠词"
                ]
              }
            },
            {
              "n": 4,
              "q": "There are alsoon the shelf. The lamp is switched on every evening ______",
              "options": [
                "some old bottles",
                "old some bottles",
                "bottles some old",
                "some bottles old"
              ],
              "answer": 0,
              "why": {
                "right": "some + 形容词  + 复数名词（ some old bottles ）",
                "wrong": [
                  "B old some bottles：与正确项不符——some + 形容词  + 复数名词（ some old bottles ）",
                  "C bottles some old：与正确项不符——some + 形容词  + 复数名词（ some old bottles ）",
                  "D some bottles old：与正确项不符——some + 形容词  + 复数名词（ some old bottles ）"
                ]
              }
            },
            {
              "n": 5,
              "q": "so that we can see. This telescope is than the old one, so we use it most. ______",
              "options": [
                "more better",
                "much better",
                "much well",
                "better much"
              ],
              "answer": 1,
              "why": {
                "right": "much better ： better 已是比较级，前加  much 加强",
                "wrong": [
                  "A 叠加错"
                ]
              }
            },
            {
              "n": 6,
              "q": "The club has bought for the new laboratory. ______",
              "options": [
                "several new instruments",
                "new several instrument",
                "several instrument new",
                "new several of instruments"
              ],
              "answer": 0,
              "why": {
                "right": "several + 形容词  + 复数名词（ several new instruments ）",
                "wrong": [
                  "B new several instrument：与正确项不符——several + 形容词  + 复数名词（ several new instrument…",
                  "C several instrument new：与正确项不符——several + 形容词  + 复数名词（ several new instrument…",
                  "D new several of instruments：与正确项不符——several + 形容词  + 复数名词（ several new instrument…"
                ]
              }
            },
            {
              "n": 7,
              "q": "The next meeting will be held next Friday.of the members is excited to share ideas. ______",
              "options": [
                "Many",
                "Both",
                "Every",
                "Some"
              ],
              "answer": 3,
              "why": {
                "right": "选项  (D) Some 为按试卷选项的标答",
                "wrong": [
                  "A Many：与正确项不符——选项  (D) Some 为按试卷选项的标答",
                  "B Both：与正确项不符——选项  (D) Some 为按试卷选项的标答",
                  "C Every：与正确项不符——选项  (D) Some 为按试卷选项的标答"
                ]
              }
            },
            {
              "n": 8,
              "q": "The club always needshelp from new students, so you are welcomed to join us ! ______",
              "options": [
                "every",
                "many",
                "a",
                "much"
              ],
              "answer": 3,
              "why": {
                "right": "help 不可数，用  much help",
                "wrong": [
                  "A every 后接单数可数名词",
                  "B many 不接不可数",
                  "C a 不接不可数"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "专项练习答案",
          "answer": "A 复数 books, cities, children, knives, photos, buses, roofs, ／ , ／ , ／； women, leaves, teeth, sheep, ／ , houses, ／ , ／ , heroes, toys"
        },
        {
          "title": "专项练习答案",
          "answer": "B 数量表达 one: egg / chair / book 　 many: buses / people / leaves 　 much: rice / water / information / help"
        },
        {
          "title": "专项练习答案",
          "answer": "C 所有格 1 Tom's 　 2 girls' 　 3 children's 　 4 Mr. Green's"
        },
        {
          "title": "专项练习答案",
          "answer": "D 名词作定1 five-minute 　 2 three-day 　 3 ten-page 　 4 one-hour"
        },
        {
          "title": "专项练习答案",
          "answer": "E 量词词组 1 a lot of 　 2 a piece of 　 3 a variety of 　 4 a great deal of 　 5 a number of 　 6 an amount of 　 7 the number of 　 8 a couple of"
        },
        {
          "title": "专项练习答案",
          "answer": "F 冠词 1 a 　 2 an 　 3 the 　 4 ø 　 5 ø 　 6 an 　 7 the 　 8 a 　 9 the 　 10 the"
        }
      ]
    }
  ]
}
