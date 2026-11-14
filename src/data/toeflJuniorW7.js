/**
 * 小托福加油站 · Week 7（听力 + 语用（情态动词 · 一））
 *
 * 数据来源：Week 7 讲义 PDF（14 页：题目、选项、专项练习）
 *          + 答案解析 PDF（6 页：答案、简析、听力原文）。
 * 静态数据，零网络请求。听力周提供三段听力原文；原讲义未印出音频外链，
 * 二维码为图片且解析不到 URL，故不提供音频按钮（不臆造链接）。
 * 说明：阅读/完形类文章正文不入库，面板仅渲染题干（q/options/why）、
 *      听力原文（transcript）与专项练习（drills）。
 */

export const WEEK = {
  "key": "w7",
  "label": "Week 7",
  "subject": "听力 + 语用（情态动词 · 一）",
  "parts": [
    {
      "key": "a",
      "title": "PART A · 听力",
      "subtitle": "学术讨论 Academic Discussion",
      "groups": [
        {
          "key": "a0",
          "label": "Basic · Questions 1-4",
          "questions": [
            {
              "n": 1,
              "q": "What are the speakers mainly trying to do?",
              "options": [
                "Choose a new science teacher",
                "Plan a class garden project",
                "Decide which plants taste best",
                "Compare two school gardens"
              ],
              "answer": 1,
              "why": {
                "right": "谈话围绕空地、光照、土壤和种植计划展开，核心是班级园艺项目。",
                "wrong": [
                  "A 选择新科学老师：对话里 Mr. Evans 一直在指导本班项目，没有换老师的话题。",
                  "C 判断哪种植物最好吃：讨论的是空地能种什么、怎么准备，没有比较口味。",
                  "D 比较两座校园花园：只提到科学教室后面的一块空地，不存在两处对比。"
                ]
              }
            },
            {
              "n": 2,
              "q": "Why does Mr. Evans mention last year's tomatoes?",
              "options": [
                "To show that tomatoes are expensive",
                "To explain why students dislike tomatoes",
                "To suggest using knowledge from earlier experience",
                "To prove that the garden should be moved"
              ],
              "answer": 2,
              "why": {
                "right": "去年七年级学生在该区域成功种出西红柿，说明这块地至少能种好一种作物，可借鉴已有经验。",
                "wrong": [
                  "A 说明西红柿很贵：原文完全没有提到价格。",
                  "B 解释学生为什么不喜欢西红柿：原文说的是种得成，不是喜不喜欢吃。",
                  "D 证明花园该搬走：恰恰相反，举例是为了说明这块地可用。"
                ]
              }
            },
            {
              "n": 3,
              "q": "What will Carlos do first?",
              "options": [
                "Draw the garden design",
                "Interview the school cook",
                "Buy tools from a garden center",
                "Check how much sunlight the area gets"
              ],
              "answer": 3,
              "why": {
                "right": "Carlos 先观察并记录一周的日照时间、再测土壤排水，之后才画最终设计图。",
                "wrong": [
                  "A 画设计图：老师说 \"After you have that information, draw the final design\"，是最后一步。",
                  "B 采访学校厨师：听力原文中没有出现厨师。",
                  "C 去园艺中心买工具：老师明确说 \"Before you buy anything\"，先别买。"
                ]
              }
            },
            {
              "n": 4,
              "q": "What can be inferred about the project?",
              "options": [
                "It has already been completed.",
                "It will begin only next year.",
                "It will use vegetables from the school kitchen.",
                "It depends on information gathering before planting."
              ],
              "answer": 3,
              "why": {
                "right": "老师要求先收集光照和土壤信息，整地安排在下周假期之后，种植必须在信息收集完成后。",
                "wrong": [
                  "A 项目已完成：对话还在讨论怎么开始。",
                  "B 明年才开始：原文是 \"after next week's holiday\"，只是下周假期后。",
                  "C 用学校厨房的蔬菜：原文没有提到厨房供货。"
                ]
              }
            }
          ]
        },
        {
          "key": "a1",
          "label": "Intermediate · Questions 5-8",
          "questions": [
            {
              "n": 5,
              "q": "What is the class discussion mainly about?",
              "options": [
                "When the school will buy recycling bins",
                "How to clean a river without volunteers",
                "Why stores sell reusable bags",
                "Whether plastic bags should cost money"
              ],
              "answer": 3,
              "why": {
                "right": "讨论从\"商店是否该对塑料袋收费\"开始，并延伸到如何用证据和方案来研究这个问题。",
                "wrong": [
                  "A 学校何时买回收箱：课堂讨论的是商店收费，不是学校采购。",
                  "B 如何在没有志愿者的情况下清理河流：全场没有河流清理话题。",
                  "C 商店为什么卖环保袋：只是 Daniel 论证里的细节，不是整场讨论的主旨。"
                ]
              }
            },
            {
              "n": 6,
              "q": "What does Maya mean when she says, \"We shouldn't judge before we measure\"?",
              "options": [
                "People should use measuring cups.",
                "People should collect evidence before making claims.",
                "People should compare prices before shopping.",
                "People should measure the size of a plastic bag."
              ],
              "answer": 1,
              "why": {
                "right": "Maya 建议先统计顾客用袋数量、比较价格、收集反馈，再据此下判断；measure 在此指调查取证。",
                "wrong": [
                  "A 应当使用量杯：把 measure 误解成物理量具，与她的调查建议无关。",
                  "C 购物前比价：比价只是她列举的证据之一，不是这句话的意图。",
                  "D 量塑料袋的尺寸：原文没有测量袋子尺寸的意思。"
                ]
              }
            },
            {
              "n": 7,
              "q": "Why does Mr. Chen mention the grocery store visit?",
              "options": [
                "To turn their idea into a practical data-collection task",
                "To warn students not to talk to store managers",
                "To show that reusable bags always save money",
                "To replace the class debate with a shopping trip"
              ],
              "answer": 0,
              "why": {
                "right": "Mr. Chen 把\"只辩论观点\"变成可操作的商店实地调查：记录袋子数、环保袋数与顾客反应。",
                "wrong": [
                  "B 警告别和店长说话：他反而让学生 \"Ask the manager politely\" 去取得许可。",
                  "C 证明环保袋总能省钱：原文没有做这个结论。",
                  "D 用购物取代课堂辩论：走访是收集数据，不是取消研究。"
                ]
              }
            },
            {
              "n": 8,
              "q": "What will the students probably do next?",
              "options": [
                "Cancel the project because it is too difficult",
                "Write a law for the city council",
                "Buy reusable bags for every student",
                "Design a data sheet and contact stores"
              ],
              "answer": 3,
              "why": {
                "right": "老师说 \"Prepare a simple data sheet first\"，Maya 当晚会设计记录表，取得两家商店许可后周四放学采集数据。",
                "wrong": [
                  "A 因太难取消项目：没有任何放弃的表述。",
                  "B 给市议会写法律：课堂没有立法任务。",
                  "C 给每位同学买环保袋：讨论的是调查，不是采购。"
                ]
              }
            }
          ]
        },
        {
          "key": "a2",
          "label": "Advanced · Questions 9-12",
          "questions": [
            {
              "n": 9,
              "q": "What problem is the seminar group mainly discussing?",
              "options": [
                "How to keep a restored wetland healthy",
                "Where to place bird boxes around the old mill",
                "How to begin a new wetland restoration project",
                "Which invasive plants are growing near the water"
              ],
              "answer": 0,
              "why": {
                "right": "恢复六年的湿地近年变干、青蛙消失、水鸟减少，小组在讨论如何维持水与动植物环境的健康。",
                "wrong": [
                  "B 鸟箱放在哪里：加鸟箱只是学生的最初设想之一，不是核心问题。",
                  "C 如何启动新的恢复项目：项目六年前就已启动，现在是维护。",
                  "D 水边长了哪些入侵植物：老师明确要求别只盯着植被。"
                ]
              }
            },
            {
              "n": 10,
              "q": "Why does Mr. Diaz mention beavers?",
              "options": [
                "To show that animals can change water flow",
                "To recommend moving beavers into the wetland immediately",
                "To argue that invasive plants are the main cause of drying",
                "To compare how beavers and waterbirds build their homes"
              ],
              "answer": 0,
              "why": {
                "right": "海狸坝会减慢水流、形成浅湿区；海狸离开或坝体破损，水就更容易流走，说明动物能改变水流。",
                "wrong": [
                  "B 建议马上把海狸迁进湿地：老师只是借旧报告启发思考，没有提出引入动物。",
                  "C 论证入侵植物是变干主因：他恰恰提醒不要只关注植被。",
                  "D 比较海狸和水鸟筑巢：原文没有比较筑巢方式。"
                ]
              }
            },
            {
              "n": 11,
              "q": "What does Mr. Diaz imply about the students' plan?",
              "options": [
                "It should begin with adding more bird boxes.",
                "It should combine field evidence with expert knowledge.",
                "It can rely on historical reports instead of new measurements.",
                "It should measure water levels once after removing plants."
              ],
              "answer": 1,
              "why": {
                "right": "老师要求把当前水位测量、城市旧报告记录和湿地工程师意见结合起来；旧报告不能替代新数据。",
                "wrong": [
                  "A 应先多加鸟箱：他认为只关注巢箱不够。",
                  "C 可以只靠历史报告：原文要求对比当前水位与旧记录，两者都要。",
                  "D 清除植物后测一次水位：Maya 提出的是连续两年每月监测。"
                ]
              }
            },
            {
              "n": 12,
              "q": "What can be inferred about Maya's view?",
              "options": [
                "She values long-term monitoring.",
                "She expects one visit to reveal whether changes will last.",
                "She prefers to finish monitoring before speaking with an engineer.",
                "She thinks bird counts should replace water-level records."
              ],
              "answer": 0,
              "why": {
                "right": "Maya 希望连续两年每月监测水位和鸟类数量，才能看出变化是否持久，说明她重视长期数据。",
                "wrong": [
                  "B 一次走访就够：与\"两年、每月\"直接矛盾。",
                  "C 先监测完再咨询工程师：她没有设置这个先后条件。",
                  "D 用鸟类计数取代水位记录：她说的是两者一起监测。"
                ]
              }
            }
          ]
        }
      ],
      "transcript": [
        {
          "label": "Q1–Q4 · Planning the Class Garden",
          "text": "Narrator: Listen to a conversation between a student and a teacher.\nCarlos: Mr. Evans, our class wants to turn the empty area behind the science rooms into a small garden. Where should we start?\nMr. Evans: Before you buy anything, find out what the space can support. The seventh-grade class grew tomatoes there last year, so you already know that at least one crop can grow well.\nCarlos: That's useful. Should we plant the same vegetables?\nMr. Evans: You can choose, but first record how many hours of sunlight the area receives each day. Then test whether the soil drains well.\nCarlos: So I'll observe the light for a week, record the times, and test the soil with a simple kit.\nMr. Evans: Exactly. After you have that information, draw the final design. We can prepare the beds after next week's holiday."
        },
        {
          "label": "Q5–Q8 · Plastic Bags: From Debate to Data",
          "text": "Narrator: Listen to a discussion in a social studies class.\nMr. Chen: Today we're discussing whether stores should charge customers for plastic bags. Daniel, you support the charge. Why?\nDaniel: Because people often throw bags away after one use. Charging even a small amount may make them bring reusable bags.\nMaya: I agree with the goal, but we shouldn't judge before we measure. We could count how many bags customers use, compare prices, and ask how they feel about paying.\nMr. Chen: That's exactly what good research does. Instead of only debating opinions, we could visit a grocery store and collect real data.\nDaniel: Would the store allow us to do that?\nMr. Chen: Ask the manager politely. If two stores agree, you can record the number of bags, the number of reusable bags, and customer responses. Prepare a simple data sheet first.\nMaya: I can design it tonight. If we get permission, we can collect data after school on Thursday."
        },
        {
          "label": "Q9–Q12 · A Restored Wetland Needs Attention",
          "text": "Narrator: Listen to a discussion in an environmental science seminar.\nMr. Diaz: Your group has been studying the wetland behind the old mill. What concerns you most?\nJosh: The restoration project began six years ago, but parts of the wetland have become much drier. Some frogs have disappeared, and fewer waterbirds visit in spring.\nMaya: Our first idea is to remove invasive plants near the water and add bird boxes.\nMr. Diaz: Those actions may help, but think about water flow. Why do you think beavers are mentioned in the city's older reports?\nJosh: Because beaver dams slow water down and create shallow wet areas. If beavers left or their dams broke, more water could drain away.\nMr. Diaz: Precisely. So don't focus only on vegetation and nesting sites. Compare current water levels with the water-level records in the city's older reports, and talk with a wetland engineer.\nMaya: I'd also like to monitor water levels and bird counts every month for two years. That would show whether changes last."
        }
      ],
      "drills": [
        {
          "title": "A. 抓谈话目的与主要问题",
          "prompt": "阅读下列对话片段，选出说话人主要关心的事项。\n1. Ben: Ms. Carter, our robot keeps stopping after ten seconds.\nMs. Carter: Check whether the battery connector is loose. That happened to last year's team too.\nWhat is Ben's main problem?\nA. The robot is too heavy.\nB. It keeps stopping after running for ten seconds.\nC. The team lost an important part.\nD. The robot cannot move forward.\n2. Ana: We have posters and a model, but our report is still only half finished.\nLeo: Let's finish the results section tonight and check the graphs tomorrow.\nWhat are the speakers mainly discussing?\nA. How to print posters\nB. How to build a model\nC. How to choose another science topic\nD. How to complete their project report\n3. Teacher: Your survey has forty students from one class. Could that limit your conclusion?\nMia: Maybe. We should ask students from other grades too.\nWhat concern does the teacher raise?\nA. The survey is too long.\nB. The survey question is unclear.\nC. The result may be inaccurate.\nD. The students refused to answer.",
          "answer": "1 B　2 D　3 C",
          "note": "1 keeps stopping after ten seconds 指机器人反复在运行十秒后停下，对应 B。\n2 两人指出报告只完成一半，并安排先完成 results、再检查图表，核心是完成报告。\n3 四十名样本全来自一个班，老师担心结果可能不够准确；Mia 建议扩大调查范围。"
        },
        {
          "title": "B. 分清说话人与观点",
          "prompt": "根据对话片段，选出正确的一项。\n4. David: We should interview the school gardener.\nElla: Good idea. I'll write six questions tonight.\nWhat will Ella do?\nA. Find the gardener\nB. Suggest another interview\nC. Prepare interview questions\nD. Ask David to write the report\n5. Sam: A video will definitely be more interesting than a poster.\nRita: Interesting, yes, but we don't have enough time to edit it.\nWhat does Rita think?\nA. A poster is completely useless.\nB. Sam should edit the poster.\nC. Videos are never interesting.\nD. There is not enough time to edit a video.\n6. Mr. Reed: Your graph shows rainfall, not temperature.\nAmy: Oh, you're right. I'll replace it with the temperature data.\nWhat does Mr. Reed do?\nA. He praises Amy's conclusion.\nB. He rejects the whole project.\nC. He asks Amy to collect rainfall data.\nD. He points out an error in the graph.",
          "answer": "4 C　5 D　6 D",
          "note": "4 Ella 认可建议并说今晚写六个问题，即准备采访问题。\n5 Rita 承认视频有趣，但转折后指出没有足够时间剪辑，这是她的主要顾虑。\n6 Mr. Reed 指出图中是降雨量而非温度，属于纠错。"
        },
        {
          "title": "C. 理解建议、同意与礼貌反驳",
          "prompt": "选出最符合说话人意图的一项。\n7. Tom: Why don't we test the bridge with fifty grams first?\nKate: Sure. That's safer than starting with one kilogram.\nWhat does Kate agree to do?\nA. Start with a small weight\nB. Build a heavier bridge\nC. Use one kilogram immediately\nD. Ask the teacher for a safer test\n8. Lily: Could we use the school garden as our outdoor lab?\nMr. Hall: You could, but please don't remove any plants.\nWhat does Mr. Hall mean?\nA. Lily may use the garden, but she must not remove any plants.\nB. Lily must choose another location.\nC. Lily has to plant new vegetables.\nD. Lily should not visit the garden.\n9. Ben: Maybe we can finish the entire model tonight.\nSara: I'd rather paint it tomorrow when the glue is completely dry.\nWhat does Sara suggest?\nA. Painting before gluing\nB. Using stronger glue\nC. Working faster tonight\nD. Waiting before painting",
          "answer": "7 A　8 A　9 D",
          "note": "7 Kate 同意先用 fifty grams，因为比一千克安全，即从小的重量开始。\n8 Mr. Hall 同意使用花园，同时明确禁止移除植物，是附带条件的许可。\n9 Sara 想等胶水完全干后再涂色，即延后涂色。"
        },
        {
          "title": "D. 推断举例与细节意图",
          "prompt": "选出说话人提到举例或细节的目的。\n10. Teacher: A reliable source should show who wrote it. For example, a university website often names its researchers.\nWhy does the teacher mention a university website?\nA. To show how a source might be named\nB. To say students must use only university websites\nC. To prove universities never make mistakes\nD. To explain how to design a website\n11. Student: Our project needs a clear question. \"Which paper towel absorbs the most water?\" works better than \"Paper towels are interesting.\"\nWhat does the student want to show?\nA. How to choose paper towels\nB. That experiments need measurable questions\nC. That interesting projects are useless\nD. That water should not be used in experiments\n12. Teacher: Remember to record results immediately. If you wait until tomorrow, you may forget exact numbers.\nWhy does the teacher give this warning?\nA. To encourage careful and timely recording\nB. To show that tomorrow's experiment is canceled\nC. To suggest memorizing all the numbers\nD. To say exact results are unnecessary",
          "answer": "10 A　11 B　12 A",
          "note": "10 大学网站通常标明研究者姓名，说明可通过作者署名识别来源，对应 how a source might be named。\n11 可测量的问题优于笼统的兴趣陈述，说明实验问题需要可检验。\n12 等到明天可能忘记准确数字，因此要立刻、及时地记录。"
        }
      ]
    },
    {
      "key": "b",
      "title": "PART B · 语用",
      "subtitle": "情态动词（一）",
      "groups": [
        {
          "key": "b0",
          "label": "Basic 1 · Notice · Questions 1-5",
          "questions": [
            {
              "n": 1,
              "q": "Notice · Each student ______ a name tag before entering the greenhouse.",
              "options": [
                "must wears",
                "must wear",
                "has to wearing",
                "could have worn"
              ],
              "answer": 1,
              "why": {
                "right": "通知中的入场要求用 must + 动词原形；主语 each student 是第三人称单数，情态动词后仍用 wear。",
                "wrong": [
                  "A must wears：情态动词后不能加三单 -s。",
                  "C has to wearing：has to 后必须接动词原形。",
                  "D could have worn：表示对过去的推测，与\"入场前必须佩戴\"的规定不符。"
                ]
              }
            },
            {
              "n": 2,
              "q": "Notice · Students who want to help should write ______ names by Wednesday afternoon.",
              "options": [
                "they",
                "them",
                "their",
                "theirs"
              ],
              "answer": 2,
              "why": {
                "right": "names 前需要形容词性物主代词，指代 students，故用 their。",
                "wrong": [
                  "A they：主格代词，不能修饰名词。",
                  "B them：宾格代词，不能作定语。",
                  "D theirs：名词性物主代词，后面不再接名词。"
                ]
              }
            },
            {
              "n": 3,
              "q": "Notice · The club has enough gloves for everyone, so you ______ your own.",
              "options": [
                "don't have to bring",
                "mustn't bring",
                "couldn't have brought",
                "shouldn't have brought"
              ],
              "answer": 0,
              "why": {
                "right": "俱乐部已备好手套，所以学生没有必要自带；这是\"不必\"，不是\"禁止\"。",
                "wrong": [
                  "B mustn't bring：语义变成\"禁止自带\"，与\"已备好手套\"的宽松语气不符。",
                  "C couldn't have brought：对过去的不可能推测，时态与语义都不对。",
                  "D shouldn't have brought：表示\"本不该带却带了\"的事后批评，不合语境。"
                ]
              }
            },
            {
              "n": 4,
              "q": "Notice · The beds were watered an hour ago, and the soil is still wet. It ______ dry enough to water again.",
              "options": [
                "must be",
                "may be",
                "can't be",
                "must have been"
              ],
              "answer": 2,
              "why": {
                "right": "土壤刚浇过且仍湿，根据现有证据推断\"不可能已经干到需要再浇\"，用 can't be。",
                "wrong": [
                  "A must be：与\"土壤仍湿\"矛盾。",
                  "B may be：只是可能性，而这里是有明确证据的否定推断。",
                  "D must have been：对过去的肯定推测，且语义相反。"
                ]
              }
            },
            {
              "n": 5,
              "q": "Notice · Before students leave, all tools ______ to the locked cabinet.",
              "options": [
                "must return",
                "must be returned",
                "must have returned",
                "must be returning"
              ],
              "answer": 1,
              "why": {
                "right": "工具是被归还的对象，表示规定用情态动词被动结构 must be returned。",
                "wrong": [
                  "A must return：主动语态，工具自己不能归还自己。",
                  "C must have returned：对过去的主动推测，不是规定。",
                  "D must be returning：进行式主动，语义不通。"
                ]
              }
            }
          ]
        },
        {
          "key": "b1",
          "label": "Basic 2 · Email · Questions 6-11",
          "questions": [
            {
              "n": 6,
              "q": "Email · According to the delivery notice, the two new sensors ______ tomorrow morning.",
              "options": [
                "should arrive",
                "should have arrive",
                "should arrives",
                "might arrived"
              ],
              "answer": 0,
              "why": {
                "right": "根据送货通知推测明早到货，用 should + 动词原形表示按预期会发生。",
                "wrong": [
                  "B should have arrive：结构错误，完成式应为 should have arrived。",
                  "C should arrives：情态动词后不能加 -s。",
                  "D might arrived：情态动词后须用动词原形。"
                ]
              }
            },
            {
              "n": 7,
              "q": "Email · The two sensors produce hourly ______ that each team member enters in the shared file every afternoon.",
              "options": [
                "readed",
                "readings",
                "read",
                "reader"
              ],
              "answer": 1,
              "why": {
                "right": "hourly 修饰可数名词，且传感器每小时都产生多条读数，故用复数名词 readings。",
                "wrong": [
                  "A readed：read 的过去式是 read，不存在 readed 这个词。",
                  "C read：原形/过去式，不能作\"读数\"的复数名词。",
                  "D reader：意为\"读者/阅读器\"，不是数据读数。"
                ]
              }
            },
            {
              "n": 8,
              "q": "Email · The safety notice forbids contact with exposed cables, so students ______ them while the power is on.",
              "options": [
                "don't have to touch",
                "might not have touched",
                "mustn't touch",
                "should have touched"
              ],
              "answer": 2,
              "why": {
                "right": "安全通知明确禁止触碰通电裸线，应使用 mustn't，而非\"不必\"。",
                "wrong": [
                  "A don't have to touch：只是\"不必碰\"，弱化了明文禁止。",
                  "B might not have touched：对过去的可能推测，时态不对。",
                  "D should have touched：意为\"本该碰却没碰\"，与安全要求相反。"
                ]
              }
            },
            {
              "n": 9,
              "q": "Email · At three tomorrow, during the middle of the hour-long test, the sensors ______ data continuously for the display.",
              "options": [
                "may record",
                "would have recorded",
                "could be recorded",
                "should be recording"
              ],
              "answer": 3,
              "why": {
                "right": "具体未来时点正在记录数据，用 should be doing 表示按安排届时正在进行。",
                "wrong": [
                  "A may record：只表可能，丢掉\"按时刻表正在进行\"的含义。",
                  "B would have recorded：对过去的虚拟，与 tomorrow 冲突。",
                  "C could be recorded：被动语态，传感器是记录数据的主体。"
                ]
              }
            },
            {
              "n": 10,
              "q": "Email · If the screen freezes during the test, you ______ restart the whole system; simply refreshing the page will fix it.",
              "options": [
                "don't have to",
                "mustn't",
                "can't have",
                "shouldn't have"
              ],
              "answer": 0,
              "why": {
                "right": "如果屏幕冻结，没必要重启整个系统，刷新页面即可；用 don't have to 表示\"不必\"。",
                "wrong": [
                  "B mustn't：变成\"禁止重启\"，与\"刷新即可\"的建议语气不符。",
                  "C can't have：结构不完整，且语义不通。",
                  "D shouldn't have：对过去行为的事后批评，这里是操作说明。"
                ]
              }
            },
            {
              "n": 11,
              "q": "Email · Before the visitors arrive, the final chart ______ beside the display.",
              "options": [
                "must have placed",
                "must be placed",
                "must place",
                "must have been placing"
              ],
              "answer": 1,
              "why": {
                "right": "图表是被放置的对象，访客到达前必须完成，故用 must be placed。",
                "wrong": [
                  "A must have placed：主动完成式，图表不能自己放自己。",
                  "C must place：主动语态，缺少施动者。",
                  "D must have been placing：完成进行式主动，语义与结构都不成立。"
                ]
              }
            }
          ]
        },
        {
          "key": "b2",
          "label": "Advanced · Article · Questions 12-18",
          "questions": [
            {
              "n": 12,
              "q": "Article · Last year, on April 3, the organizers ______ the survey, and the same team will return this spring.",
              "options": [
                "begin",
                "has begun",
                "began",
                "had begun"
              ],
              "answer": 2,
              "why": {
                "right": "Last year / on April 3 指明确的过去时间，用一般过去时 began。",
                "wrong": [
                  "A begin：现在时，与过去时间状语冲突。",
                  "B has begun：现在完成时不能与明确过去时间连用。",
                  "D had begun：过去完成时需有另一个过去参照点，此处没有。"
                ]
              }
            },
            {
              "n": 13,
              "q": "Article · By the time the students reached the north pond, a branch ______ across the path during the storm the night before.",
              "options": [
                "fell",
                "was falling",
                "has fallen",
                "had fallen"
              ],
              "answer": 3,
              "why": {
                "right": "树枝倒下发生在学生到达之前，是\"过去的过去\"，用过去完成时 had fallen。",
                "wrong": [
                  "A fell：一般过去时无法体现\"先于到达\"的先后关系。",
                  "B was falling：强调正在进行，与\"夜里暴风雨时已倒下\"不符。",
                  "C has fallen：现在完成时不能锚定在过去某时点之前。"
                ]
              }
            },
            {
              "n": 14,
              "q": "Article · After days of heavy rain, this morning's water level is well above yesterday's mark. It ______ quickly overnight.",
              "options": [
                "must rise",
                "must have risen",
                "must have been risen",
                "must be rising"
              ],
              "answer": 1,
              "why": {
                "right": "结合连续大雨和明显升高的水位，推断水位夜间一定上涨，用 must have + 过去分词。",
                "wrong": [
                  "A must rise：对现在/将来的推测，与 overnight 这一过去时间不符。",
                  "C must have been risen：rise 是不及物动词，没有被动语态。",
                  "D must be rising：表示此刻正在上涨，而证据指向已经涨完。"
                ]
              }
            },
            {
              "n": 15,
              "q": "Article · Several nests are broken, and fresh branches lie around them after last night's storm. The nests ______ by falling branches.",
              "options": [
                "must have damaged",
                "must be damaged",
                "must have been damaged",
                "must have been damaging"
              ],
              "answer": 2,
              "why": {
                "right": "根据风暴后的断枝和破损鸟巢作过去推测；鸟巢是受损对象，故用 must have been damaged。",
                "wrong": [
                  "A must have damaged：主动语态，鸟巢不会自己损坏自己。",
                  "B must be damaged：只对现在状态作推测，缺少\"过去发生\"的含义。",
                  "D must have been damaging：完成进行式主动，语义不通。"
                ]
              }
            },
            {
              "n": 16,
              "q": "Article · The fenced section is closed until July. Visitors ______ it during that time.",
              "options": [
                "don't have to enter",
                "could have entered",
                "mustn't enter",
                "shouldn't have entered"
              ],
              "answer": 2,
              "why": {
                "right": "围栏区域关闭期间禁止进入，用 mustn't；don't have to 只表示不必。",
                "wrong": [
                  "A don't have to enter：只是\"不必进入\"，没有表达封闭禁令。",
                  "B could have entered：对过去的可能推测，与\"关闭至七月\"矛盾。",
                  "D shouldn't have entered：事后批评，不是现行的规定。"
                ]
              }
            },
            {
              "n": 17,
              "q": "Article · Before the first bird count begins, each measuring tool ______ by the science teacher.",
              "options": [
                "must have checked",
                "should have checked",
                "must have been checking",
                "must be checked"
              ],
              "answer": 3,
              "why": {
                "right": "每件测量工具必须由老师检查；主语承受动作，使用 must be checked。",
                "wrong": [
                  "A must have checked：主动完成式，工具不能自己检查。",
                  "B should have checked：对过去的反思，且是主动语态。",
                  "C must have been checking：完成进行式主动，语义不通。"
                ]
              }
            },
            {
              "n": 18,
              "q": "Article · No exact times were written down, so they ______ the exact times as well as the water level.",
              "options": [
                "should have recorded",
                "should record",
                "must have recorded",
                "should be recording"
              ],
              "answer": 0,
              "why": {
                "right": "小组去年没有记录具体时间，事后指出本该及时记录，用 should have + 过去分词。",
                "wrong": [
                  "B should record：对现在/将来的建议，不能评价去年已发生的疏漏。",
                  "C must have recorded：表示\"一定记过\"，与 \"No exact times were written down\" 矛盾。",
                  "D should be recording：此刻正在进行，与去年的事无关。"
                ]
              }
            }
          ]
        }
      ],
      "drills": [
        {
          "title": "A-1 基本形式与含义 · 单项选择",
          "prompt": "1. My aunt ______ swim across the pool when she was six.\n(A) can (B) could (C) is able (D) has to\n2. Does every student ______ a visitor badge?\n(A) has to wear (B) have to wear (C) must wears (D) have to wears\n3. You ______ carry a packed lunch; sandwiches are provided.\n(A) mustn't (B) don't have to (C) couldn't (D) should have\n4. We'd better ______ the lab door closed.\n(A) keep (B) to keep (C) keeping (D) kept",
          "answer": "1 B　2 B　3 B　4 A",
          "note": "1 when she was six 指过去能力，用 could。\n2 Does 后接动词原形 have to wear。\n3 学校提供午餐，没有必要自带，用 don't have to。\n4 had better 后接动词原形 keep。"
        },
        {
          "title": "A-2 选词填空（每词用一次）",
          "prompt": "must　·　mustn't　·　doesn't have to　·　may\n1. Every visitor ______ sign in at the front desk.\n2. Mia ______ use the saw without an adult beside her.\n3. The fee is optional, so Liam ______ pay it.\n4. After orientation (迎新会), parents ______ enter the lab with their children.",
          "answer": "1 must　2 mustn't　3 doesn't have to　4 may",
          "note": "1 每位访客都必须登记。\n2 没有成年人陪同，禁止使用锯子。\n3 费用为自愿缴纳，因此 Liam 不必支付；第三人称单数主语用 doesn't have to。\n4 may 在此表示许可。"
        },
        {
          "title": "B-1 对现在和将来的推测 · 单项选择",
          "prompt": "1. The office lights are on and Dad's bicycle is outside. He ______ in the office.\n(A) must be (B) can't be (C) may not (D) should have been\n2. That ______ Ms. Wu; she is in Hong Kong all week.\n(A) must be (B) can't be (C) may not (D) should be\n3. I can't find the cat. It ______ under the sofa.\n(A) mustn't be (B) can't have (C) might be (D) should have\n4. The sky is cloudy, but the forecast is uncertain. It ______ later.\n(A) must raining (B) may rain (C) can't rains (D) should have rained\n5. According to the usual schedule, the package ______ before noon.\n(A) should arrive (B) should arrives (C) should have arriving (D) should arrived\n6. I can hear music in Ben's room, and his desk lamp is on. He ______ now.\n(A) must studying (B) must be studying (C) must have study (D) must to study\n7. I haven't checked the gym, but our team ______ there for practice.\n(A) might be waiting (B) must waiting (C) can't have wait (D) should waits\n8. The courier is running late, so the parcel ______ before the shop closes.\n(A) may not arrive (B) mustn't arriving (C) can't arrived (D) should have arrive",
          "answer": "1 A　2 B　3 C　4 B　5 A　6 B　7 A　8 A",
          "note": "1 灯亮且自行车在外，依据充分，用 must be 表几乎肯定。\n2 Ms. Wu 整周都在香港，此人不可能是她，用 can't be。\n3 不确定猫的位置，用 might be 表可能。\n4 预报不确定，用 may + 动词原形表稍后可能下雨。\n5 按通常时刻表推测包裹中午前到，用 should arrive。\n6 由灯光和音乐推测正在学习，用 must be doing。\n7 尚未确认地点，用 might be waiting 表可能正在等候。\n8 快递延误，可能赶不上关店；表\"可能不\"用 may not。"
        },
        {
          "title": "C-1 对过去的推测或评价 · 用括号内动词的适当形式完成短语",
          "prompt": "1. The lights are all off. They ______ (must / go) to bed early.\n2. I failed the test. I ______ (should / read) the questions more carefully.\n3. We ______ (needn't / buy) so many paints, but we did.\n4. She looks exhausted. She ______ (must / work) since dawn.",
          "answer": "1 must have gone　2 should have read　3 needn't have bought　4 must have been working",
          "note": "1 所有灯都关了，推测他们早早上床；对过去作肯定推测用 must have + 过去分词。\n2 事后反思没有认真读题，用 should have + 过去分词。\n3 颜料已买但其实不需要，用 needn't have + 过去分词。\n4 根据疲惫状态推测一直工作，用 must have been doing。"
        },
        {
          "title": "C-2 对过去的推测或评价 · 单项选择",
          "prompt": "1. The phone was switched off all day, so he ______ the message before the game.\n(A) can't have received (B) must have received (C) should receive (D) needn't have received\n2. Ava isn't in class, and her notebook is missing. She ______ it on the bus.\n(A) might have left (B) must leave (C) should be leaving (D) needn't leave\n3. The meeting is still on. You ______ Sam it was cancelled.\n(A) should have told (B) shouldn't have told (C) could tell (D) needn't tell\n4. We ______ an earlier train, but we chose to finish our project first.\n(A) could have taken (B) must take (C) can't have taken (D) needn't take",
          "answer": "1 A　2 A　3 B　4 A",
          "note": "1 手机整天关机，不可能收到信息，用 can't have received。\n2 笔记本也不见了，推测可能落在公交车上，用 might have left。\n3 会议仍举行，告诉 Sam 会议取消是不该发生的，用 shouldn't have told。\n4 有机会搭早班车却选择留下，用 could have taken 表本来可以但没做。"
        },
        {
          "title": "D-1 情态动词的被动语态 · 用提示完成被动结构",
          "prompt": "1. The application ______ by noon. (must / submit)\n2. These tablets ______ from the library. (can / borrow)\n3. A new footbridge ______ next spring. (will / build)\n4. The broken window ______ by Friday. (should / repair)\n5. The old temple ______ more than 300 years ago. (may / build)\n6. The doors ______ before the visitors arrived. (should / lock)\n7. Food ______ at room temperature. (must / not / leave)\n8. The results ______ with every team member. (should / share)",
          "answer": "1 must be submitted　2 can be borrowed　3 will be built　4 should be repaired\n5 may have been built　6 should have been locked　7 must not be left　8 should be shared",
          "note": "1 申请表是被提交的对象，用 must + be + 过去分词。\n2 平板是可以被借用的对象，用 can be borrowed。\n3 人行桥将于下个春天建造，用将来时被动 will be + 过去分词。\n4 窗户应该被修好，使用一般式情态动词被动。\n5 对过去的推测被动结构为 may have been + 过去分词。\n6 门在访客到达前本该被锁好，用过去完成式情态被动。\n7 食物不能被留在室温下；否定词置于情态动词后。\n8 结果应被分享，用 should be + 过去分词。"
        },
        {
          "title": "E-1 表达意愿与偏好 · 单项选择",
          "prompt": "1. I'd rather ______ at home tonight.\n(A) stay (B) to stay (C) staying (D) stayed\n2. I prefer ______ the train to driving.\n(A) take (B) to take (C) taking (D) took\n3. Would you like ______ us for lunch?\n(A) join (B) to join (C) joining (D) joined\n4. I'd prefer ______ rather than drive in the rain.\n(A) to walk (B) walk (C) walking (D) walked",
          "answer": "1 A　2 C　3 B　4 A",
          "note": "1 would rather 后接动词原形。\n2 prefer A to B 两侧形式平行，用 taking...to driving。\n3 would like 后接 to do。\n4 would prefer to do...rather than...。"
        },
        {
          "title": "E-2 表达意愿与偏好 · 用括号内动词完成短语",
          "prompt": "1. I'm tired. I'd rather ______ (wait) here.\n2. Would you like ______ (come) to the concert?\n3. She prefers ______ (read) at home to going out on school nights.\n4. I'd love ______ (join) the science club.",
          "answer": "1 wait　2 to come　3 reading　4 to join",
          "note": "1 would rather 后接动词原形。\n2 would like 后接 to do。\n3 prefer A to B 两边形式平行，此处用动名词 reading。\n4 would love 后接 to do。"
        }
      ]
    }
  ]
}
