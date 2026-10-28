/**
 * 小托福加油站 · Week 3（听力 + 语用（形容词与副词））
 *
 * 数据来源：Week 讲义 PDF（题目、选项、专项练习）+ 答案解析 PDF（答案、简析、听力原文）。
 * 静态数据，零网络请求；听力音频为原讲义二维码解析出的外链。
 */

export const WEEK = {
  "key": "w3",
  "label": "Week 3",
  "subject": "听力 + 语用（形容词与副词）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 听力",
      "subtitle": "双人对话",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-4",
          "questions": [
            {
              "n": 1,
              "q": "Why does the student come to the library?",
              "options": [
                "To return a book that is late",
                "To pay a fine for a lost book",
                "To get a book that is not on the shelf",
                "To borrow a laptop for a report"
              ],
              "answer": 2,
              "key": "I looked for this book on the shelf, but I couldn't find it anywhere.” → 要一本架上没有的书。",
              "why": {
                "right": "“I looked for this book on the shelf, but I couldn't find it anywhere.” → 要一本架上没有的书。",
                "wrong": [
                  "A To return a book that is late：与正确项不符——“I looked for this book on the shelf, but I c…",
                  "B To pay a fine for a lost book：与正确项不符——“I looked for this book on the shelf, but I c…",
                  "D To borrow a laptop for a repor…：与正确项不符——“I looked for this book on the shelf, but I c…"
                ]
              }
            },
            {
              "n": 2,
              "q": "When is the book due? 收听 Q1-4音频",
              "options": [
                "On the twenty-second, before noon",
                "On the twenty-eighth, before five in the afternoon",
                "On Friday, before the library closes",
                "Two days after the student's presentation"
              ],
              "answer": 1,
              "key": "it's due on the twenty-eighth, before five in the afternoon.” → 直接给出期限。",
              "why": {
                "right": "“it's due on the twenty-eighth, before five in the afternoon.” → 直接给出期限。",
                "wrong": [
                  "A On the twenty-second, before n…：与正确项不符——“it's due on the twenty-eighth, before five i…",
                  "C On Friday, before the library …：与正确项不符——“it's due on the twenty-eighth, before five i…",
                  "D Two days after the student's p…：与正确项不符——“it's due on the twenty-eighth, before five i…"
                ]
              }
            },
            {
              "n": 3,
              "q": "What does the librarian suggest the student do?",
              "options": [
                "Present the report earlier",
                "Renew the book on the library website",
                "Return the book at the sorting cart",
                "Write a slip with the student's name"
              ],
              "answer": 1,
              "key": "you might want to renew it … on the library website.” → 网上续借。",
              "why": {
                "right": "“you might want to renew it … on the library website.” → 网上续借。",
                "wrong": [
                  "A Present the report earlier：与正确项不符——“you might want to renew it … on the library …",
                  "C Return the book at the sorting…：与正确项不符——“you might want to renew it … on the library …",
                  "D Write a slip with the student'…：与正确项不符——“you might want to renew it … on the library …"
                ]
              }
            },
            {
              "n": 4,
              "q": "What will the student probably do next?",
              "options": [
                "Look for the book on the shelf again",
                "Buy a copy of the book",
                "Ask a classmate for help with the report",
                "Renew the book on the library website"
              ],
              "answer": 3,
              "key": "I'll do it on the website, then.” → 跟着建议走。",
              "why": {
                "right": "“I'll do it on the website, then.” → 跟着建议走。",
                "wrong": [
                  "A Look for the book on the shelf…：与正确项不符——“I'll do it on the website, then.” → 跟着建议走。",
                  "B Buy a copy of the book：与正确项不符——“I'll do it on the website, then.” → 跟着建议走。",
                  "C Ask a classmate for help with …：与正确项不符——“I'll do it on the website, then.” → 跟着建议走。"
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
              "q": "Why does the student go to the cafeteria?",
              "options": [
                "To buy a sandwich before class",
                "To ask about the vegetarian meals",
                "To return a food container",
                "To complain about the prices"
              ],
              "answer": 1,
              "key": "I usually have the vegetarian meal here on Tuesdays, but I didn't see it on the menu today.” → 打听素",
              "why": {
                "right": "“I usually have the vegetarian meal here on Tuesdays, but I didn't see it on the menu today.” → 打听素",
                "wrong": [
                  "A To buy a sandwich before class：与正确项不符——“I usually have the vegetarian meal here on T…",
                  "C To return a food container：与正确项不符——“I usually have the vegetarian meal here on T…",
                  "D To complain about the prices：与正确项不符——“I usually have the vegetarian meal here on T…"
                ]
              }
            },
            {
              "n": 6,
              "q": "What is the change to the cafeteria? 收听 Q5-8音频",
              "options": [
                "It will close on Fridays.",
                "It will serve hot meals on only four days a week.",
                "It will stop serving sandwiches.",
                "It will open later in the morning."
              ],
              "answer": 1,
              "key": "we'll only serve hot meals on Monday, Tuesday, Wednesday and Thursday.” → 热餐减为每周四天。",
              "why": {
                "right": "“we'll only serve hot meals on Monday, Tuesday, Wednesday and Thursday.” → 热餐减为每周四天。",
                "wrong": [
                  "A It will close on Fridays.：与正确项不符——“we'll only serve hot meals on Monday, Tuesda…",
                  "C It will stop serving sandwiche…：与正确项不符——“we'll only serve hot meals on Monday, Tuesda…",
                  "D It will open later in the morn…：与正确项不符——“we'll only serve hot meals on Monday, Tuesda…"
                ]
              }
            },
            {
              "n": 7,
              "q": "What does the worker suggest the student do?",
              "options": [
                "Bring lunch from home",
                "Join the queue before noon",
                "Fill in a form at the front desk",
                "Check the menu on the board"
              ],
              "answer": 2,
              "key": "Write your name on the form at the front desk and hand it in by Friday.” → 填表。",
              "why": {
                "right": "“Write your name on the form at the front desk and hand it in by Friday.” → 填表。",
                "wrong": [
                  "A Bring lunch from home：与正确项不符——“Write your name on the form at the front des…",
                  "B Join the queue before noon：与正确项不符——“Write your name on the form at the front des…",
                  "D Check the menu on the board：与正确项不符——“Write your name on the form at the front des…"
                ]
              }
            },
            {
              "n": 8,
              "q": "What can be inferred about the student?",
              "options": [
                "She works in the cafeteria.",
                "She does not eat meat.",
                "She has never eaten in the cafeteria before.",
                "She is a member of the cooking club."
              ],
              "answer": 1,
              "key": "I don't eat meat, so I don't want a chicken sandwich.” → 她不吃肉。",
              "why": {
                "right": "“I don't eat meat, so I don't want a chicken sandwich.” → 她不吃肉。",
                "wrong": [
                  "A She works in the cafeteria.：与正确项不符——“I don't eat meat, so I don't want a chicken …",
                  "C She has never eaten in the caf…：与正确项不符——“I don't eat meat, so I don't want a chicken …",
                  "D She is a member of the cooking…：与正确项不符——“I don't eat meat, so I don't want a chicken …"
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
              "q": "Why does the student mention the photos on the class blog?",
              "options": [
                "He wants to know if his teacher liked them.",
                "He wants to put more photos on the blog.",
                "He wants to borrow the camera the teacher used.",
                "He wants to ask if he may enter the photography competition."
              ],
              "answer": 3,
              "why": {
                "right": "老师追问“Did you come to ask about the photography competition?”，学生答“That's right.” → 真实来",
                "wrong": [
                  "A He wants to know if his teache…：与正确项不符——老师追问“Did you come to ask about the photograph…",
                  "B He wants to put more photos on…：与正确项不符——老师追问“Did you come to ask about the photograph…",
                  "C He wants to borrow the camera …：与正确项不符——老师追问“Did you come to ask about the photograph…"
                ]
              }
            },
            {
              "n": 10,
              "q": "Why does the photo need to be printed again? 收听 Q9-12音频",
              "options": [
                "Every entry has to be A4 size, and his is smaller.",
                "The photo is not clear enough for the judges.",
                "Two entries were sent back last year.",
                "The judges cannot accept photos printed at home."
              ],
              "answer": 0,
              "why": {
                "right": "规则要求 A4 尺寸，学生承认“it came out smaller.” → 尺寸不合。",
                "wrong": [
                  "B The photo is not clear enough …：与正确项不符——规则要求 A4 尺寸，学生承认“it came out smaller.” → 尺寸不合。",
                  "C Two entries were sent back las…：与正确项不符——规则要求 A4 尺寸，学生承认“it came out smaller.” → 尺寸不合。",
                  "D The judges cannot accept photo…：与正确项不符——规则要求 A4 尺寸，学生承认“it came out smaller.” → 尺寸不合。"
                ]
              }
            },
            {
              "n": 11,
              "q": "What does the teacher mean when she says \"much too old\"?",
              "options": [
                "The photo was taken more than two months ago, so it is not allowed.",
                "The photo looks like a picture from a much older school.",
                "The student looks too young in the photo.",
                "The photo must be taken at the school fair again."
              ],
              "answer": 0,
              "why": {
                "right": "规则只接受近两个月拍的照片，而照片摄于三月 → 拍摄时间超期、不合资格。",
                "wrong": [
                  "B The photo looks like a picture…：与正确项不符——规则只接受近两个月拍的照片，而照片摄于三月 → 拍摄时间超期、不合资格。",
                  "C The student looks too young in…：与正确项不符——规则只接受近两个月拍的照片，而照片摄于三月 → 拍摄时间超期、不合资格。",
                  "D The photo must be taken at the…：与正确项不符——规则只接受近两个月拍的照片，而照片摄于三月 → 拍摄时间超期、不合资格。"
                ]
              }
            },
            {
              "n": 12,
              "q": "What can be inferred about the student's photo for the competition?",
              "options": [
                "The teacher will take a new photo for him.",
                "He will have to take a new photo before the deadline.",
                "He has already entered the same photo in another competition.",
                "The photo of the science stand is sure to win a prize."
              ],
              "answer": 1,
              "why": {
                "right": "尺寸与时间都不合规则，学生说周六去公园“get something better” → 须重拍。",
                "wrong": [
                  "A The teacher will take a new ph…：与正确项不符——尺寸与时间都不合规则，学生说周六去公园“get something better” → 须…",
                  "C He has already entered the sam…：与正确项不符——尺寸与时间都不合规则，学生说周六去公园“get something better” → 须…",
                  "D The photo of the science stand…：与正确项不符——尺寸与时间都不合规则，学生说周六去公园“get something better” → 须…"
                ]
              }
            }
          ]
        }
      ],
      "audio": [
        {
          "label": "Q1-4 音频",
          "url": "https://ilxwp.speiyou.com/peiQi/?url=3988"
        },
        {
          "label": "Q5-8 音频",
          "url": "https://bnokj.speiyou.com/peiQi/?url=3989"
        },
        {
          "label": "Q9-12 音频",
          "url": "https://bnokj.speiyou.com/peiQi/?url=3990"
        }
      ],
      "audioNote": "以上链接来自原讲义二维码（扫描后跳转）。听力每段只播放一次，可先读题干与选项再播放。",
      "transcript": [
        {
          "label": "Q1–Q4",
          "text": "Narrator: Listen to a conversation between a student and a librarian.\nStudent: Excuse me. I looked for this book on the shelf, but I couldn't find it anywhere.\nLibrarian: Let me check. ... Ah, I see — every copy is out right now. Someone returned one about ten minutes ago, though, so it's still on the sorting cart at the back.\nStudent: Great. Could you put it aside for me? I really need it for my history report.\nLibrarian: Sure. I'll write your name on a slip and keep it behind the desk until Friday.\nStudent: Thank you. And when do I have to bring it back?\nLibrarian: Our usual loan is two weeks, so it's due on the twenty-eighth, before five in the afternoon.\nStudent: The twenty-eighth? That's the day of my presentation.\nLibrarian: Then you might want to renew it. You can do that on the library website — just log in with your student number and click “renew”.\nStudent: I didn't know that. I'll do it on the website, then. Thanks a lot.\nLibrarian: You're welcome. And good luck with the report."
        },
        {
          "label": "Q5–Q8",
          "text": "Narrator: Listen to a conversation between a student and a cafeteria worker.\nStudent: Excuse me. I usually have the vegetarian meal here on Tuesdays, but I didn't see it on the menu today. Do you know why?\nWorker: Ah, that's because of the repairs in the kitchen. From next week, we'll only serve hot meals on Monday, Tuesday, Wednesday and Thursday — not on Friday. The sandwich counter will stay open every day, though.\nStudent: I see. So there won't be any hot food at all on Fridays?\nWorker: That's right. It should only be for a month or so, while the new ovens are put in.\nStudent: But I don't eat meat, so I don't want a chicken sandwich.\nWorker: Then you can ask for a vegetarian meal. Write your name on the form at the front desk and hand it in by Friday, and the kitchen will keep one for you.\nStudent: Great. I'll fill it in before I go home.\nWorker: No problem. Next, please!"
        },
        {
          "label": "Q9–Q12",
          "text": "Narrator: Listen to a conversation between a student and his teacher, Ms. Warren.\nStudent: Morning, Ms. Warren. Do you have a minute?\nMs. Warren: Of course. What can I do for you?\nStudent: Well, you might have seen the photos on our class blog — the ones I took at the school fair.\nMs. Warren: I did. I thought they were lovely. Did you come to ask about the photography competition? The deadline is next Friday.\nStudent: That's right. I'd like to enter the picture of the science stand.\nMs. Warren: Then let's check it against the rules. Every photo has to be A4 size ... Is yours?\nStudent: I'm not sure. I printed it at home, and it came out smaller.\nMs. Warren: I'm afraid the rules are strict about that. Last year two entries were sent back because they were the wrong size. You'll need to print it again.\nStudent: No problem. I can do that this evening.\nMs. Warren: There's one more thing. The judges only accept photos taken in the last two months. How old is yours?\nStudent: I took it at the school fair last March.\nMs. Warren: That's much too old, I'm afraid. But the competition doesn't need a school event. A photo of anything is fine, so long as you took it yourself.\nStudent: Really? I've got three tests this week, so I probably won't have time before the weekend.\nMs. Warren: The weekend is fine. There's still almost a week before the deadline.\nStudent: Then I'll go to the park on Saturday and try to get something better than this one."
        }
      ],
            "drills":       [
        {
          "title": "A. 判断说话人关系 —— 阅读下列对话，选出说话人之间最可能的关系。",
          "prompt": "1. A: Have you finished marking our essays, Mr. Bell? B: Almost. I'll hand them back on Thursday, and we can talk about the comments in class.\nA. Two classmates\nB. A customer and a shop assistant\nC. A student and a teacher\n2. A: Could I have two tickets for the eight o'clock show? B: Certainly. That'll be sixteen dollars. Screen Three, on your right.\nA. A customer and a cinema worker\nB. A student and a librarian\nC. Two neighbours\n3. A: Mum, I can't find my swimming goggles. B: Look in the bag by the door. And don't forget your towel this time.\nA. A coach and a player\nB. Two students\nC. A parent and a child\n4. A: Excuse me, is this seat free? B: Yes, go ahead. The lecture starts in five minutes.\nA. Two students in a university classroom\nB. A teacher and a parent at home\nC. Two passengers on a plane\n5. A: Good morning. I'd like to open a savings account for my daughter. B: Certainly, sir. Could I see your ID, please?\nA. A student and a teacher\nB. A customer and a bank clerk\nC. Two friends",
          "answer": "判断说话人关系　1 C　2 A　3 C　4 A　5 B",
          "note": "抓称呼和场景词判断关系：Mr. / Ms. 加姓氏多为师生，excuse me 加 menu / ticket 多为服务人员与顾客，谈论作业和作业布置多为同学之间。"
        },
        {
          "title": "B. 识别细节 —— 阅读下列对话以及题目，选出正确选项，并在对话原文中划出相关句子。",
          "prompt": "1. Student: Are you coming to the football match on Saturday? We're meeting at the school gate at two. Friend: I'd love to, but I'm visiting my grandparents that afternoon. Student: That's a pity. What about Sunday? There's another match, but it's in the morning. Friend: Sunday morning is fine. I'll bring the tickets.\nWhat is the friend going to do on Saturday?\nA. Visit his grandparents\nB. Go to a football match\nC. Buy the tickets\n2. Student: The bus to the science museum leaves at nine, doesn't it? I don't want to be late. Clerk: Not this week. It's leaving at half past eight, and there's another one at noon. Student: Half past eight? I thought the early bus was at eight. Clerk: That's the city bus, not the school bus. The school bus is the one at half past eight.\nWhen does the school bus leave this week?\nA. At 8:30\nB. At 9:00\nC. At noon\n3. Student: I can't find my library card anywhere. I looked through my schoolbag twice this morning. Friend: You left it on the desk in the reading room. I saw it there when I came in. Student: Are you sure? I was only in the reading room for ten minutes. Friend: Yes, and someone handed it to the librarian at the front desk later. Go and ask her.\nWhere did the woman first see the card?\nA. On the desk in the reading room\nB. In the student's schoolbag\nC. At the front desk\n4. Teacher: Did you finish the whole project by yourself? That poster looks like a lot of work. Student: No, my cousin helped me with the drawings. I did the writing and the title. Teacher: Your cousin is good at drawing, isn't she? Student: Yes, she's much better than I am. She wants to study art.\nWhat did the student's cousin do?\nA. She wrote the report.\nB. She helped with the drawings.\nC. She did the whole project.\n5. Student: When does the library close today? I need to return a book before six. Librarian: At four, not six. The staff have a meeting this afternoon. Student: A meeting? I thought it was a public holiday today. Librarian: No, the library is open tomorrow as usual. Only today is shorter.\nWhy does the library close early today?\nA. It is a public holiday.\nB. The staff have a meeting.\nC. The building is being cleaned.",
          "answer": "识别细节　1 A　2 A　3 A　4 B　5 B",
          "note": "先读题干确定要找的信息（时间、价格、地点、数量），听的时候只抓对应的具体词，不要指望听懂每一个词。"
        },
        {
          "title": "C. 推断意图 —— 阅读下列对话，根据下划线句子，选出该说话人真正想表达的意思。",
          "prompt": "1. Friend: Can you help me with the poster on Sunday? Student: I've got three tests next week.\nA. He is not free on Sunday.\nB. He wants to borrow the test papers.\nC. He wants help with his tests.\n2. Friend: Let's take a taxi. It's only a ten-minute walk. Student: It's raining, and I'm carrying two heavy bags.\nA. She wants to walk faster.\nB. She does not want to walk.\nC. She is worried about missing the train.\n3. Classmate: Are you coming to the party? Student: I'll see how much homework I have.\nA. He has already decided to come.\nB. He would like to come, but he is not sure yet.\nC. He does not like parties at all.\n4. Student: Mr. Chen, I've finished all the exercises but the last one. Teacher: That's fine. Bring your questions to class tomorrow.\nA. He wants the teacher to check his work.\nB. He wants the teacher to give him more exercises.\nC. He wants to know the answer to the last exercise.\n5. Student: Look, I've got the new game! Friend: You've already got three games you never play.\nA. She thinks he should play more games.\nB. She thinks he has bought too many games.\nC. She wants to borrow the new game.",
          "answer": "推断意图　1 A　2 B　3 B　4 C　5 B",
          "note": "说话人常常不直说，要结合语境推断真实意思：委婉拒绝、间接请求、提醒或抱怨。字面意思往往不是答案。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "形容词与副词",
      "groups": [
        {
          "key": "b0",
          "label": "Basic · Questions 1-8",
          "questions": [
            {
              "n": 1,
              "q": "I'm really ______ that you're joining our science club next Saturday.",
              "options": [
                "exciting",
                "excited",
                "excitement",
                "excitedly"
              ],
              "answer": 1,
              "why": {
                "right": "excited 表示人“感到兴奋”",
                "wrong": [
                  "A exciting：与正确项不符——excited 表示人“感到兴奋”",
                  "C excitement：与正确项不符——excited 表示人“感到兴奋”",
                  "D excitedly：与正确项不符——excited 表示人“感到兴奋”"
                ]
              }
            },
            {
              "n": 2,
              "q": "The project sounds ______, and we'll test how much weight each bridge can hold.",
              "options": [
                "interested",
                "interestingly",
                "interest",
                "interesting"
              ],
              "answer": 3,
              "why": {
                "right": "sound 为系动词，后接形容词：项目“听起来有趣”用 interesting。",
                "wrong": [
                  "A interested：与正确项不符——sound 为系动词，后接形容词：项目“听起来有趣”用 interesting。",
                  "B interestingly：与正确项不符——sound 为系动词，后接形容词：项目“听起来有趣”用 interesting。",
                  "C interest：与正确项不符——sound 为系动词，后接形容词：项目“听起来有趣”用 interesting。"
                ]
              }
            },
            {
              "n": 3,
              "q": "At the start, please listen ______ while Mr. Hall explains the rules.",
              "options": [
                "carefully",
                "careful",
                "care",
                "caring"
              ],
              "answer": 0,
              "why": {
                "right": "修饰动词 listen 用副词 carefully（认真地听）。",
                "wrong": [
                  "B careful：与正确项不符——修饰动词 listen 用副词 carefully（认真地听）。",
                  "C care：与正确项不符——修饰动词 listen 用副词 carefully（认真地听）。",
                  "D caring：与正确项不符——修饰动词 listen 用副词 carefully（认真地听）。"
                ]
              }
            },
            {
              "n": 4,
              "q": "There was so much noise that we could ______ hear his instructions!",
              "options": [
                "hard",
                "harder",
                "hardly",
                "hardest"
              ],
              "answer": 2,
              "why": {
                "right": "hardly 表示“几乎不”",
                "wrong": [
                  "A hard：与正确项不符——hardly 表示“几乎不”",
                  "B harder：与正确项不符——hardly 表示“几乎不”",
                  "D hardest：与正确项不符——hardly 表示“几乎不”"
                ]
              }
            },
            {
              "n": 5,
              "q": "This time, we'll meet in the library, which is ______ than our usual classroom.",
              "options": [
                "more quieter",
                "much quieter",
                "much quiet",
                "much quietly"
              ],
              "answer": 1,
              "why": {
                "right": "than 提示比较级",
                "wrong": [
                  "A more quieter：与正确项不符——than 提示比较级",
                  "C much quiet：与正确项不符——than 提示比较级",
                  "D much quietly：与正确项不符——than 提示比较级"
                ]
              }
            },
            {
              "n": 6,
              "q": "We'll give everyone a box that is small ______ to fit inside a schoolbag.",
              "options": [
                "too",
                "so",
                "very",
                "enough"
              ],
              "answer": 3,
              "why": {
                "right": "enough 修饰形容词时后置：small enough to fit（小到能装进去）。",
                "wrong": [
                  "A too：与正确项不符——enough 修饰形容词时后置：small enough to fit（小到能装进去）。",
                  "B so：与正确项不符——enough 修饰形容词时后置：small enough to fit（小到能装进去）。",
                  "C very：与正确项不符——enough 修饰形容词时后置：small enough to fit（小到能装进去）。"
                ]
              }
            },
            {
              "n": 7,
              "q": "You don't need to bring paper or glue because I've ______ bought all the supplies.",
              "options": [
                "yet",
                "ever",
                "already",
                "ago"
              ],
              "answer": 2,
              "why": {
                "right": "already 表示“已经”，位于助动词与主要动词之间：have already bought。",
                "wrong": [
                  "A yet：与正确项不符——already 表示“已经”，位于助动词与主要动词之间：have already boug…",
                  "B ever：与正确项不符——already 表示“已经”，位于助动词与主要动词之间：have already boug…",
                  "D ago：与正确项不符——already 表示“已经”，位于助动词与主要动词之间：have already boug…"
                ]
              }
            },
            {
              "n": 8,
              "q": "I'll send you another message as ______ as I know.",
              "options": [
                "soon",
                "sooner",
                "soonest",
                "more soon"
              ],
              "answer": 0,
              "why": {
                "right": "as soon as表示“一……就……”，两个 as 之间用原级 soon。",
                "wrong": [
                  "B sooner：与正确项不符——as soon as表示“一……就……”，两个 as 之间用原级 soon。",
                  "C soonest：与正确项不符——as soon as表示“一……就……”，两个 as 之间用原级 soon。",
                  "D more soon：与正确项不符——as soon as表示“一……就……”，两个 as 之间用原级 soon。"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Questions 9-15",
          "questions": [
            {
              "n": 9,
              "q": "The school's old reading corner was ______ a whole class,",
              "options": [
                "too small for hold",
                "too small to hold",
                "small too to hold",
                "too small holding"
              ],
              "answer": 1,
              "why": {
                "right": "too +形容词 + to do表示“太……而不能……”：太小，容不下整个班。",
                "wrong": [
                  "A too small for hold：与正确项不符——too +形容词 + to do表示“太……而不能……”：太小，容不下整个班。",
                  "C small too to hold：与正确项不符——too +形容词 + to do表示“太……而不能……”：太小，容不下整个班。",
                  "D too small holding：与正确项不符——too +形容词 + to do表示“太……而不能……”：太小，容不下整个班。"
                ]
              }
            },
            {
              "n": 10,
              "q": "The reading room was ______, receiving almost sixty percent of the votes.",
              "options": [
                "the more popular choice",
                "the most popularly choice",
                "most popular the choice",
                "the most popular choice"
              ],
              "answer": 3,
              "why": {
                "right": "三者比较、得票最多 → 最高级 the most popular choice",
                "wrong": [
                  "A the more popular choice：与正确项不符——三者比较、得票最多 → 最高级 the most popular choice",
                  "B the most popularly choice：与正确项不符——三者比较、得票最多 → 最高级 the most popular choice",
                  "C most popular the choice：与正确项不符——三者比较、得票最多 → 最高级 the most popular choice"
                ]
              }
            },
            {
              "n": 11,
              "q": "\"The new room will be ______ our old corner,\"",
              "options": [
                "much more comfortable than",
                "much comfortable than",
                "more comfortably than",
                "much more comfortable as"
              ],
              "answer": 0,
              "why": {
                "right": "comfortable 作表语，more comfortable比较级，much 修饰比较级，than 引出比较对象。",
                "wrong": [
                  "B much comfortable than：与正确项不符——comfortable 作表语，more comfortable比较级，much 修饰比较…",
                  "C more comfortably than：与正确项不符——comfortable 作表语，more comfortable比较级，much 修饰比较…",
                  "D much more comfortable as：与正确项不符——comfortable 作表语，more comfortable比较级，much 修饰比较…"
                ]
              }
            },
            {
              "n": 12,
              "q": "The team has also chosen brighter desk lamps so that students can, ______",
              "options": [
                "read much more easy",
                "read much easily",
                "read much more easily",
                "read more much easily"
              ],
              "answer": 2,
              "why": {
                "right": "easily 修饰 read，more easily为副词比较级，much 进一步修饰：read much more easily。",
                "wrong": [
                  "A read much more easy：与正确项不符——easily 修饰 read，more easily为副词比较级，much 进一步修饰：r…",
                  "B read much easily：与正确项不符——easily 修饰 read，more easily为副词比较级，much 进一步修饰：r…",
                  "D read more much easily：与正确项不符——easily 修饰 read，more easily为副词比较级，much 进一步修饰：r…"
                ]
              }
            },
            {
              "n": 13,
              "q": "\"It will be ______ that teachers will be able to bring small groups here",
              "options": [
                "so a useful space",
                "such a useful space",
                "such useful a space",
                "a such useful space"
              ],
              "answer": 1,
              "why": {
                "right": "such + a/an +形容词 + 单数可数名词 + that从句：such a useful space that…。",
                "wrong": [
                  "A so a useful space：与正确项不符——such + a/an +形容词 + 单数可数名词 + that从句：such a use…",
                  "C such useful a space：与正确项不符——such + a/an +形容词 + 单数可数名词 + that从句：such a use…",
                  "D a such useful space：与正确项不符——such + a/an +形容词 + 单数可数名词 + that从句：such a use…"
                ]
              }
            },
            {
              "n": 14,
              "q": "Several volunteers are ______ after school",
              "options": [
                "working hard and staying late",
                "working hardly and staying late",
                "working hard and staying lately",
                "working hardly and staying lately"
              ],
              "answer": 0,
              "why": {
                "right": "work hard（努力工作）、stay late（待到很晚）",
                "wrong": [
                  "B working hardly and staying lat…：与正确项不符——work hard（努力工作）、stay late（待到很晚）",
                  "C working hard and staying latel…：与正确项不符——work hard（努力工作）、stay late（待到很晚）",
                  "D working hardly and staying lat…：与正确项不符——work hard（努力工作）、stay late（待到很晚）"
                ]
              }
            },
            {
              "n": 15,
              "q": "However, the room ______ for students to use.",
              "options": [
                "is not yet safely enough",
                "is not yet enough safe",
                "is not safety enough yet",
                "is not safe enough yet"
              ],
              "answer": 3,
              "why": {
                "right": "safe 在 is 后作表语，enough 后置",
                "wrong": [
                  "A is not yet safely enough：与正确项不符——safe 在 is 后作表语，enough 后置",
                  "B is not yet enough safe：与正确项不符——safe 在 is 后作表语，enough 后置",
                  "C is not safety enough yet：与正确项不符——safe 在 is 后作表语，enough 后置"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Questions 16-23",
          "questions": [
            {
              "n": 16,
              "q": "On a hot day, a tree-lined street can feel ______ even in summer.",
              "options": [
                "surprising cool",
                "surprisingly coolly",
                "surprisingly cool",
                "surprising coolly"
              ],
              "answer": 2,
              "why": {
                "right": "feel 为系动词，后接形容词 cool",
                "wrong": [
                  "A surprising cool：与正确项不符——feel 为系动词，后接形容词 cool",
                  "B surprisingly coolly：与正确项不符——feel 为系动词，后接形容词 cool",
                  "D surprising coolly：与正确项不符——feel 为系动词，后接形容词 cool"
                ]
              }
            },
            {
              "n": 17,
              "q": "Generally, the more sunlight their leaves block, ______ reaches the ground.",
              "options": [
                "the less direct sunlight",
                "the fewer direct sunlight",
                "the least direct sunlight",
                "less the direct sunlight"
              ],
              "answer": 0,
              "why": {
                "right": "“the + 比较级…，the + 比较级…”",
                "wrong": [
                  "B the fewer direct sunlight：与正确项不符——“the + 比较级…，the + 比较级…”",
                  "C the least direct sunlight：与正确项不符——“the + 比较级…，the + 比较级…”",
                  "D less the direct sunlight：与正确项不符——“the + 比较级…，the + 比较级…”"
                ]
              }
            },
            {
              "n": 18,
              "q": "A tree shading forty square meters covers an area ______ that of a tree",
              "options": [
                "exactly twice larger as",
                "exactly as twice large as",
                "exactly twice as larger as",
                "exactly twice as large as"
              ],
              "answer": 3,
              "why": {
                "right": "倍数比较：倍数 + as + 原级 + as → exactly twice as large as。",
                "wrong": [
                  "A exactly twice larger as：与正确项不符——倍数比较：倍数 + as + 原级 + as → exactly twice as lar…",
                  "B exactly as twice large as：与正确项不符——倍数比较：倍数 + as + 原级 + as → exactly twice as lar…",
                  "C exactly twice as larger as：与正确项不符——倍数比较：倍数 + as + 原级 + as → exactly twice as lar…"
                ]
              }
            },
            {
              "n": 19,
              "q": "However, if the soil becomes ______ ",
              "options": [
                "such dry that",
                "so dry that",
                "so that dry",
                "such dried that"
              ],
              "answer": 1,
              "why": {
                "right": "so + 形容词 + that 从句",
                "wrong": [
                  "A such dry that：与正确项不符——so + 形容词 + that 从句",
                  "C so that dry：与正确项不符——so + 形容词 + that 从句",
                  "D such dried that：与正确项不符——so + 形容词 + that 从句"
                ]
              }
            },
            {
              "n": 20,
              "q": "For these reasons, choosing trees for a city is ______ it might seem.",
              "options": [
                "not nearly as simply as",
                "not nearly as simpler as",
                "not nearly as simple as",
                "not nearly as simple than"
              ],
              "answer": 2,
              "why": {
                "right": "not nearly as + 原级 + as 表示“远没有……那么……”",
                "wrong": [
                  "A not nearly as simply as：与正确项不符——not nearly as + 原级 + as 表示“远没有……那么……”",
                  "B not nearly as simpler as：与正确项不符——not nearly as + 原级 + as 表示“远没有……那么……”",
                  "D not nearly as simple than：与正确项不符——not nearly as + 原级 + as 表示“远没有……那么……”"
                ]
              }
            },
            {
              "n": 21,
              "q": "In some locations, trees need to be planted ______ ",
              "options": [
                "sufficient far apart",
                "sufficiently far apart",
                "far sufficient parted",
                "partly far sufficient"
              ],
              "answer": 1,
              "why": {
                "right": "sufficiently 是副词，修饰 far",
                "wrong": [
                  "A sufficient far apart：与正确项不符——sufficiently 是副词，修饰 far",
                  "C far sufficient parted：与正确项不符——sufficiently 是副词，修饰 far",
                  "D partly far sufficient：与正确项不符——sufficiently 是副词，修饰 far"
                ]
              }
            },
            {
              "n": 22,
              "q": "Simply planting ______ is therefore not always the best solution.",
              "options": [
                "as many trees as possible",
                "as much trees as possible",
                "as many trees than possible",
                "as more trees as possible"
              ],
              "answer": 0,
              "why": {
                "right": "as many + 复数可数名词 + as possible",
                "wrong": [
                  "B as much trees as possible：与正确项不符——as many + 复数可数名词 + as possible",
                  "C as many trees than possible：与正确项不符——as many + 复数可数名词 + as possible",
                  "D as more trees as possible：与正确项不符——as many + 复数可数名词 + as possible"
                ]
              }
            },
            {
              "n": 23,
              "q": "The aim of the study is to identify how trees can provide ______ cooling benefit\u0002,",
              "options": [
                "the greatest possibly",
                "the most greatest",
                "the greatest possible",
                "the most greatly"
              ],
              "answer": 2,
              "why": {
                "right": "greatest 已是最高级，不再加 most",
                "wrong": [
                  "A the greatest possibly：与正确项不符——greatest 已是最高级，不再加 most",
                  "B the most greatest：与正确项不符——greatest 已是最高级，不再加 most",
                  "D the most greatly：与正确项不符——greatest 已是最高级，不再加 most"
                ]
              }
            }
          ]
        }
      ],
            "drills":       [
        {
          "title": "A. 形容词与副词的位置 —— 选出最合适的一项。",
          "prompt": "1. The soup ____ .\nA. tastes well\nB. tastes delicious\nC. is tasting well\nD. tastes deliciously\n2. This exercise is ____ for beginners.\nA. enough easy\nB. easy enough\nC. easily enough\nD. enough easily\n3. My grandmother lives in ____ house.\nA. an old small\nB. old a small\nC. a small olde r\nD. a small old\n4. The noise outside kept me ____ all night.\nA. wake\nB. awake\nC. wakefully\nD. waking\n5. He can spell the new words ____.\nA. correct\nB. correctly\nC. correctedly\nD. correctiv e\n6. ____, the bus came on time.\nA. Lucky\nB. Luck\nC. Luckil y\nD. Luckly\n7. It was ____ cold outside. You'd better put on your coat.\nA. extreme\nB. extremely\nC. extremity\nD. extremeness\n8. The train arrived ____ at the station.\nA. safe\nB. safly\nC. safet y\nD. safely",
          "answer": "形容词与副词的位置　1 B　2 B　3 D　4 B　5 B　6 C　7 B　8 D",
          "note": "形容词放在名词前或系动词后；副词修饰动词、形容词或整句；enough 修饰形容词时必须后置（easy enough，不是 enough easy）。"
        },
        {
          "title": "B. 形容词与副词的变换 —— 用括号内词的正确形式填空。",
          "prompt": "1. She answered the question ______. (happy)\n2. He ______ finished the race. (final)\n3. The novel is ______ great. (true)\n4. Our teacher is very ______ to us. (friendly)\n5. He was ______ hurt in the accident. (bad)\n6. She sings ______ than anyone in our class. (beautiful)\n7. It was raining ______ all afternoon. (heavy)\n8. The child played the violin very ______. (good)",
          "answer": "形容词与副词的变换　1 happily　2 finally　3 truly　4 friendly　5 badly　6 more beautifully　7 heavily　8 well",
          "note": "修饰名词用形容词，修饰动词或形容词用副词（多数加 -ly）。注意 friendly 是形容词不是副词；hard、high、late、near 本身既可作形容词也可作副词。"
        },
        {
          "title": "C. 易混淆的形容词与副词 —— 使用括号内词的适当形式填空。",
          "prompt": "1. It was raining ______, so we stayed inside. (hard)\n2. He ______ ever goes to the cinema. (hardly)\n3. I haven't seen him ______. (late)\n4. We arrived ______ because the bus was slow. (late)\n5. The bird flew ______ above the trees. (high)\n6. The book is ______ praised by teachers. (highly)\n7. It is ______ five o'clock; we should go home. (near)\n8. Don't stand so ______ to the river. (near)\n9. He works ______ and never gives up. (hard)\n10. You must dig ______ so that you can find the treasure underground. (deep)",
          "answer": "易混淆的形容词与副词　1 hard　2 hardly　3 lately　4 late　5 high　6 highly　7 nearly　8 near　9 hard　10 deep",
          "note": "hard 是「努力地」、hardly 是「几乎不」；late 是「晚」、lately 是「最近」；high 指具体高度、highly 指抽象「高度地」；near 是「近」、nearly 是「几乎」。"
        },
        {
          "title": "D. 比较级与最高级的词形变化 —— 用括号内词的正确形式填空。",
          "prompt": "1. This box is ______ than that one. (heavy)\n2. A car is ______ than a bike. (fast)\n3. Today is ______ than yesterday. (hot)\n4. This is the ______ building in the city. (old)\n5. This is the ______ film of the three. (good)\n6. His handwriting is ______ than his brother's. (bad)\n7. There are ______ students in Class Two than in Class One. (many)\n8. Of all the students in our class, Tom runs ______. (fast)",
          "answer": "比较级与最高级的词形变化　1 heavier　2 faster　3 hotter　4 oldest　5 best　6 worse　7 more　8 (the) fastest",
          "note": "单音节和部分双音节加 -er / -est；辅音字母 + y 结尾变 y 为 i 再加 -er / -est；重读闭音节双写末尾辅音；good → better → best、bad → worse → worst 为不规则变化。"
        },
        {
          "title": "E. 比较结构与句型 —— 选出最合适的一项。",
          "prompt": "1. She is ____ her sister.\nA. as tall as\nB. as taller as\nC. so tall than\nD. as tall than\n2. The new machine is ____ more efficient than the old one.\nA. very\nB. much\nC. more\nD. too\n3. He is ____ confident than he was last year.\nA. little\nB. few\nC. leas t\nD. less\n4. ____ you read, the more you know.\nA. More\nB. The most\nC. The more\nD. Muc h\n5. He is the tallest student ____ our class.\nA. of\nB. in\nC. than\nD. at\n6. This book is ____ interesting than that one.\nA. very\nB. much more\nC. more much\nD. too more\n7. It is ____ today than it was yesterday.\nA. much colder\nB. more colder\nC. very colder\nD. colder much\n8. This box is ____ that one.\nA. not as heavy than\nB. not so heavy than\nC. not as heavy as\nD. not heavy as as",
          "answer": "比较结构与句型　1 A　2 B　3 D　4 C　5 B　6 B　7 A　8 C",
          "note": "同级比较用 as + 原级 + as；两者比较用比较级 + than；三者以上用 the + 最高级；much / far / a lot 可以修饰比较级表示程度，more 不能再叠加在 -er 形式前。"
        },
        {
          "title": "F. 形容词的顺序 —— 把括号内的形容词按正确顺序填入空格。",
          "prompt": "1. She has a ______ bag. (leather, small, brown)\n2. They live in a ______ house. (wooden, long, red, old, lovely)\n3. He is a ______ player. (young, talented, Japanese)\n4. I bought two ______ tables. (wooden, comfortable, small, round)\n5. There is a ______ box on the shelf. (metal, small, black)\n6. She was wearing a ______ scarf. (silk, long, red)\n7. He is a ______ engineer. (young, brilliant, Japanese)\n8. I'd like to buy a ______ chair. (wooden, comfortable, small)",
          "answer": "形容词的顺序　1 a small brown leather bag　2 a lovely old wooden house　3 a talented young Chinese player　4 two small round wooden tables　5 a small black metal box　6 a long red silk scarf　7 a brilliant young Japanese engineer　8 a comfortable small wooden chair",
          "note": "多个形容词修饰名词的顺序是：限定词 → 观点 → 尺寸 → 形状 → 年龄 → 颜色 → 国籍 → 材料 → 名词，如 a lovely small old round brown wooden table。"
        },
        {
          "title": "G. 形容词辨析（-ed 与 -ing） —— 使用括号内词的适当形式填空。",
          "prompt": "1. The film was ______, and we all laughed. (amuse)\n2. I was ______ to hear the news. (surprise)\n3. The story is very ______ to children. (interest)\n4. We were ______ to hear that the trip was cancelled. (disappoint)\n5. The instructions were ______, so nobody knew what to do. (confuse)\n6. The good news was very ______. (excite)",
          "answer": "形容词辨析（-ed 与 -ing）　1 amusing　2 surprised　3 interesting　4 disappointed　5 confusing　6 exciting",
          "note": "-ed 形容词描述人的感受（interested、surprised、excited），-ing 形容词描述事物给人的感觉（interesting、surprising、exciting）。"
        },
        {
          "title": "H. so / such 的用法 —— 选出最合适的一项。",
          "prompt": "1. It was ____ a hot day that we stayed inside.\nA. so\nB. such\nC. such a\nD. so a\n2. The soup was ____ hot that I could not drink it.\nA. so\nB. such\nC. such a\nD. very a\n3. There were ____ many people that we could not get in.\nA. such\nB. so\nC. so a\nD. such a\n4. She is ____ a kind person that everyone likes her.\nA. so\nB. very\nC. much\nD. such\n5. The weather was ____ bad that we stayed at home.\nA. such\nB. such a\nC. so\nD. so a\n6. He made ____ a loud noise that the baby woke up.\nA. so\nB. such\nC. so a\nD. very\n7. There was ____ much traffic that we were late.\nA. such\nB. so\nC. so a\nD. such a\n8. It was ____ an interesting film that I watched it twice.\nA. such\nB. so\nC. so a\nD. very",
          "answer": "so / such 的用法　1 B　2 A　3 B　4 D　5 C　6 B　7 B　8 A",
          "note": "so + 形容词 / 副词 + that；such + (a / an) + 形容词 + 名词 + that；so many / much + 名词 + that。注意 so 后接形容词或副词，such 后接名词短语。"
        },
        {
          "title": "I. too / enough 的用法 —— 选出最合适的一项。",
          "prompt": "1. The soup is ____ hot to drink.\nA. too\nB. enough\nC. very\nD. so\n2. He is old ____ to go to school by himself.\nA. too\nB. enough\nC. very\nD. so\n3. There isn't ____ time to finish the test.\nA. many\nB. very\nC. enough\nD. such\n4. This box is ____ heavy for me to carry.\nA. enough\nB. too\nC. so\nD. very\n5. He wasn't ____ to answer the last question.\nA. quick enough\nB. enough quick\nC. too quick\nD. so quick\n6. He is strong ____ to lift that box.\nA. too\nB. enough\nC. so\nD. very",
          "answer": "too / enough 的用法　1 A　2 B　3 C　4 B　5 A　6 B",
          "note": "too + 形容词 + to do 表示「太……而不能……」；形容词 + enough + to do 中 enough 后置；enough 修饰形容词时放在形容词后面。"
        },
        {
          "title": "J. yet / already / still / any more —— 使用 yet / already / still / any more 填空。",
          "prompt": "1. Have you finished your homework ______?\n2. She has ______ read three books this month.\n3. I don't live there ______.\n4. He hasn't come back ______.\n5. The shop is ______ closed; it's only six o'clock in the morning.\n6. I have ______ seen that film three times.",
          "answer": "yet / already / still / any more　1 yet　2 already　3 any more　4 yet　5 still　6 already",
          "note": "yet 用于疑问句和否定句（还 / 尚未）；already 用于肯定句（已经）；still 表示「仍然」；not ... any more 表示「不再」。"
        }
      ]
    }
  ]
};
