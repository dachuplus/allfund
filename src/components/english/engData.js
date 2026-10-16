/**
 * 英文课程框架数据（公开资料整理，供小朋友建立整体学习框架）。
 *
 * 重要说明：
 * - Unlock / Reading Explorer / 新概念英语 为全球广泛使用、体系公开可查的教材，
 *   下方按「级别 → 单元主题 → 阅读/写作要求」整理其课程框架，单元主题为代表性参考，
 *   非出版社精确逐课目录（精确课次以机构/出版社最新大纲为准）。
 * - 乐读为分级原版阅读体系，下方按其公开定位整理「分级框架 + 阅读/写作要求」，
 *   具体书目与课次以机构最新大纲为准。
 * - 本文件只做框架梳理，不含任何评级、推荐或商业导流。
 */

export const ENG = {
  // ───────────────────────── Unlock（剑桥大学出版社 · 学术英语） ─────────────────────────
  unlock: {
    name: 'Unlock',
    publisher: '剑桥大学出版社（Cambridge University Press）',
    cefr: 'A1 – C1（CEFR 欧洲语言共同参考框架）',
    features: [
      '学术英语导向：以「看视频 → 阅读 → 写作 → 演讲」的学术任务链组织，培养用英语学知识的能力。',
      '批判性思维（Critical Thinking）：每单元嵌入思维训练，引导提问、对比、论证，而非只练语言。',
      '视频导入（Flipped classroom）：用原版短视频引出单元主题，先激发兴趣再进入阅读与写作。',
      '读写紧密结合：阅读为写作提供范文与语料，写作按「过程写作」分步推进（计划→起草→修订→定稿）。',
      '对标国际考试：能力与雅思（IELTS）、剑桥通用英语（KET/PET/FCE/CAE）等循序渐进衔接。',
      '词汇与语法情境化：从真实语篇中习得，而非孤立背诵单词表和语法条文。',
    ],
    value:
      '对小朋友的价值：提前建立「用英语学知识」的学术习惯，而不是只学语言本身；批判性思维与表达力同步提升，'
      + '受益学科不止英语；为国际学校、双语学校、未来留学打下真实的语言能力与研究式学习基础。',
    framework:
      'Unlock 是剑桥大学出版社推出的六级别学术英语课程（A1–C1）。每级别围绕 8 个跨学科主题展开，'
      + '以「视频导入 — 学术阅读（A/B 两篇）— 过程写作 — 口语演讲」为核心循环；每个单元都包含词汇、'
      + '语法与批判性思维板块。下面按级别（Unlock 1–6）给出课程框架、文章目录（代表主题）、阅读要求与写作要求。',
    note: '单元主题为代表性参考框架，非出版社精确逐课目录；精确课次与篇目以机构/出版社最新大纲为准。',
    levels: [
      {
        key: 'u1', label: 'Unlock 1', cefr: 'A1（基础）',
        framework: 'Unlock 1 以「认识自我与世界」的贴近生活主题为主，阅读为图文短文，写作以造句与简短描述起步。',
        readingReq: [
          '能借助图片理解短文主旨，找出人名、数字、颜色等显性地信息。',
          '能区分阅读 A 与阅读 B 的话题，说出两篇的共同主题。',
          '在教师引导下完成「预测—阅读—验证」的简单阅读循环。',
        ],
        writingReq: [
          '能写 3–5 句描述人物、物品或日常活动，使用学过的 be 动词与简单句型。',
          '能仿写单元范文的句式，完成填空式小段落。',
          '写作后能在清单提示下检查大小写、标点与拼写。',
        ],
        units: [
          { n: 1, theme: '人的本性（Human nature）', reading: '图文短文：性格与喜好', writing: '写 3–5 句介绍自己或同学' },
          { n: 2, theme: '发现（Discovery）', reading: '图文短文：身边的发现', writing: '描述一次小发现' },
          { n: 3, theme: '关系（Relationships）', reading: '家人与朋友短文', writing: '写家庭成员介绍' },
          { n: 4, theme: '社区（Community）', reading: '社区场所图文', writing: '描述自己所在的社区' },
          { n: 5, theme: '能源（Energy）', reading: '能源与日常短文', writing: '写一种日常使用的能源' },
          { n: 6, theme: '工作世界（The world of work）', reading: '职业图文', writing: '写自己想做的职业' },
          { n: 7, theme: '饮食与文化（Food and culture）', reading: '食物与文化短文', writing: '介绍一道喜欢的食物' },
          { n: 8, theme: '自然世界（The natural world）', reading: '动植物图文', writing: '描述一种动物' },
        ],
      },
      {
        key: 'u2', label: 'Unlock 2', cefr: 'A2（初级）',
        framework: 'Unlock 2 主题更向外扩展（旅行、习俗、建筑、健康等），阅读出现连续篇章，写作进入「段落」层面。',
        readingReq: [
          '能默读长度约 150–250 词的短文，抓住段落大意与关键信息。',
          '能根据上下文猜测生词含义，而非逐词查字典。',
          '能比较两个阅读段落的观点或事实异同。',
        ],
        writingReq: [
          '能写一段结构完整的短文（约 60–80 词），含主题句与支持细节。',
          '能使用连接词（and / but / because）串联句子。',
          '能就单元主题写一封简短邮件或明信片。',
        ],
        units: [
          { n: 1, theme: '旅行（Travel）', reading: '旅行见闻短文', writing: '写一段旅行经历' },
          { n: 2, theme: '习俗（Customs）', reading: '不同国家习俗', writing: '介绍一种节日习俗' },
          { n: 3, theme: '建筑（Buildings）', reading: '著名建筑介绍', writing: '描述一座建筑' },
          { n: 4, theme: '健康（Health）', reading: '健康生活方式', writing: '写健康小贴士' },
          { n: 5, theme: '金钱（Money）', reading: '零花钱与消费', writing: '写一次购物经历' },
          { n: 6, theme: '科技（Technology）', reading: '科技改变生活', writing: '介绍一件电子产品' },
          { n: 7, theme: '运动（Sport）', reading: '运动与团队', writing: '写喜欢的运动' },
          { n: 8, theme: '环境（The environment）', reading: '保护环境', writing: '写一条环保建议' },
        ],
      },
      {
        key: 'u3', label: 'Unlock 3', cefr: 'B1（准中级）',
        framework: 'Unlock 3 进入「准学术」阅读，篇章结构更清晰，写作要求写有明确论点与支撑的段落与短文。',
        readingReq: [
          '能识别说明文/记叙文的篇章结构（开头—发展—结尾）。',
          '能提取作者态度与写作目的，而不只是事实。',
          '能做简单的阅读笔记，归纳每段要点。',
        ],
        writingReq: [
          '能写 120–150 词的短文，含清晰的主题句与 2–3 个支撑细节。',
          '能使用递进/转折连接词组织段落逻辑。',
          '能就社会或校园话题写一段有个人观点的评论。',
        ],
        units: [
          { n: 1, theme: '身份（Identity）', reading: '自我与他人', writing: '写「我是谁」短文' },
          { n: 2, theme: '发现（Discovery）', reading: '科学小发现', writing: '介绍一个科学现象' },
          { n: 3, theme: '社区（Communities）', reading: '不同社群', writing: '描述一个社群' },
          { n: 4, theme: '健康（Health）', reading: '身心与健康', writing: '写健康习惯建议' },
          { n: 5, theme: '能源（Energy）', reading: '能源未来', writing: '写一种新能源看法' },
          { n: 6, theme: '自然世界（The natural world）', reading: '自然奇观', writing: '描述一处自然景观' },
          { n: 7, theme: '城市（Cities）', reading: '城市生活', writing: '写城市与乡村对比' },
          { n: 8, theme: '交通（Transport）', reading: '出行方式', writing: '写未来交通设想' },
        ],
      },
      {
        key: 'u4', label: 'Unlock 4', cefr: 'B1+（中级）',
        framework: 'Unlock 4 阅读篇幅与抽象度再提升，开始系统训练议论文阅读与「立论—举证」式写作。',
        readingReq: [
          '能阅读含观点交锋的论述文，区分事实与观点。',
          '能理解段落间的因果、对比、举例等逻辑关系。',
          '能概括长文主旨，并引用原文支持自己的概括。',
        ],
        writingReq: [
          '能写 200 词左右的议论文，提出观点并用 2–3 个理由支撑。',
          '能使用议论语块（Firstly / However / In conclusion）。',
          '能根据读者对象调整语气与详略。',
        ],
        units: [
          { n: 1, theme: '关系（Relationships）', reading: '人际与社会关系', writing: '写一段关于友谊的议论' },
          { n: 2, theme: '艺术（The arts）', reading: '艺术与表达', writing: '评论一件艺术作品' },
          { n: 3, theme: '科学（Science）', reading: '科技前沿', writing: '写科技利弊议论' },
          { n: 4, theme: '教育（Education）', reading: '学习方式', writing: '写理想的学习方式' },
          { n: 5, theme: '媒体（The media）', reading: '媒体与信息', writing: '写媒体影响议论' },
          { n: 6, theme: '商业（Business）', reading: '商业世界', writing: '写一次消费选择分析' },
          { n: 7, theme: '法律（Law）', reading: '规则与公平', writing: '写对一条规则的看法' },
          { n: 8, theme: '环境（The environment）', reading: '人与自然', writing: '写环境保护议论文' },
        ],
      },
      {
        key: 'u5', label: 'Unlock 5', cefr: 'B2（中高级）',
        framework: 'Unlock 5 接近雅思/学术英语难度，阅读强调学术语篇与多源信息整合，写作要求结构与论证更严谨。',
        readingReq: [
          '能阅读学术化说明文/议论文，处理图表、数据与术语。',
          '能比较不同来源对同一话题的表述差异。',
          '能做批判性阅读：识别假设、偏见与证据强弱。',
        ],
        writingReq: [
          '能写 250 词左右的学术短文，含引言—主体—结论完整结构。',
          '能使用学术连接与指代，避免重复与口语化。',
          '能就争议话题写出「双边讨论 + 个人立场」。',
        ],
        units: [
          { n: 1, theme: '人类行为（Human behavior）', reading: '行为背后的原因', writing: '写行为成因分析' },
          { n: 2, theme: '心智（The mind）', reading: '认知与情绪', writing: '写情绪管理短文' },
          { n: 3, theme: '社会（Society）', reading: '社会变迁', writing: '写社会现象评论' },
          { n: 4, theme: '沟通（Communication）', reading: '语言与沟通', writing: '写沟通方式演变' },
          { n: 5, theme: '工程（Engineering）', reading: '工程解决问题', writing: '写一项工程的价值' },
          { n: 6, theme: '地球（The planet）', reading: '全球议题', writing: '写气候变化立场文' },
          { n: 7, theme: '经济（Economics）', reading: '经济与生活', writing: '写消费与储蓄议论' },
          { n: 8, theme: '创造（Creativity）', reading: '创新与创意', writing: '写创造力来源' },
        ],
      },
      {
        key: 'u6', label: 'Unlock 6', cefr: 'C1（高级）',
        framework: 'Unlock 6 为最高级别，阅读接近母语学术材料，写作要求逻辑严密、语体正式、论证有深度。',
        readingReq: [
          '能阅读长而抽象的学术/评论文章，把握复杂论证脉络。',
          '能辨析细微语义、修辞与作者立场。',
          '能整合多文本信息形成自己的判断。',
        ],
        writingReq: [
          '能写 300+ 词的正式议论文/报告，结构清晰、语体得当。',
          '能灵活使用高级衔接与学术词汇，论证有层次。',
          '能针对不同读者撰写摘要、评论或建议书。',
        ],
        units: [
          { n: 1, theme: '基因（Genetics）', reading: '基因与伦理', writing: '写基因技术伦理评论' },
          { n: 2, theme: '未来（The future）', reading: '技术与未来社会', writing: '写未来情景分析' },
          { n: 3, theme: '伦理（Ethics）', reading: '道德困境', writing: '写伦理抉择议论' },
          { n: 4, theme: '全球化（Globalization）', reading: '全球互联', writing: '写全球化利弊分析' },
          { n: 5, theme: '创新（Innovation）', reading: '创新驱动', writing: '写创新机制评论' },
          { n: 6, theme: '保育（Conservation）', reading: '生物多样性', writing: '写保育政策建议' },
          { n: 7, theme: '身份（Identity）', reading: '文化身份', writing: '写身份认同短文' },
          { n: 8, theme: '冲突（Conflict）', reading: '冲突与和解', writing: '写冲突成因与化解' },
        ],
      },
    ],
  },

  // ───────────────────────── Reading Explorer（国家地理学习 · 非虚构阅读） ─────────────────────────
  re: {
    name: 'Reading Explorer',
    publisher: '国家地理学习（National Geographic Learning / Cengage）',
    cefr: 'A2 – C1（Foundations + 级别 1–5）',
    features: [
      '真实非虚构语料：选篇全部来自《国家地理》真实文章与影像，题材广博（自然、历史、文化、科技等）。',
      '阅读技能系统化：每单元聚焦一项阅读技能（略读、找主旨、猜词义、理解指代、区分事实观点等）。',
      '词汇从语境习得：通过词族、搭配在真实语境中积累学术与高频词汇。',
      '图文与视频并重：大量地图、图表、照片与配套视频，训练信息提取与视觉素养。',
      '与 Unlock 互补：RE 强「输入（阅读）」，Unlock 强「输出（写作/演讲）」，常配套使用。',
    ],
    value:
      '对小朋友的价值：培养「读原版非虚构」的习惯与自信，在真实、有趣的材料中积累学术词汇与跨学科背景知识；'
      + '是备考托福/雅思阅读、衔接原版教材与科普读物的优质桥梁。',
    framework:
      'Reading Explorer 以「真实阅读 + 阅读技能」为主线，分 Foundations 与级别 1–5（A2–C1）。'
      + '每个级别由若干主题单元组成，每单元含 2 篇阅读（A/B）、一项阅读技能训练、词汇板块与一段配套视频。'
      + '下面按级别给出课程框架、文章目录（代表主题）、阅读要求与写作要求。',
    note: '单元主题为代表性参考框架，非出版社精确逐课目录；精确课次与篇目以机构/出版社最新大纲为准。',
    levels: [
      {
        key: 'ref', label: 'Foundations', cefr: 'A2（基础）',
        framework: 'Foundations 为入门级，选篇短、图文多，侧重建立阅读信心与基础技能。',
        readingReq: [
          '能借助图片与标题预测文章内容。',
          '能找到段落的主题句与关键细节。',
          '能在教师引导下完成基础的略读与查读。',
        ],
        writingReq: [
          '能就阅读内容写 3–5 句简单回答或描述。',
          '能根据提示填写信息表/思维导图。',
          '能仿写单元重点句式。',
        ],
        units: [
          { n: 1, theme: '动物（Animals）', reading: '动物趣闻', writing: '写一种动物' },
          { n: 2, theme: '历史（History）', reading: '古老的故事', writing: '写一件古物' },
          { n: 3, theme: '文化（Culture）', reading: '各地文化', writing: '介绍一种文化习俗' },
          { n: 4, theme: '社会（Social Studies）', reading: '社区与生活', writing: '写身边的社区' },
          { n: 5, theme: '科学（Science）', reading: '自然现象', writing: '写一种自然现象' },
          { n: 6, theme: '自然（Nature）', reading: '奇景与地貌', writing: '描述一处景观' },
          { n: 7, theme: '金钱（Money）', reading: '交易与消费', writing: '写一次买卖' },
          { n: 8, theme: '健康（Health）', reading: '身体与健康', writing: '写健康小贴士' },
        ],
      },
      {
        key: 're1', label: 'Reading Explorer 1', cefr: 'A2+（基础+）',
        framework: 'RE 1 阅读篇幅略增，开始系统训练「找主旨、猜词义、理解指代」等核心技能。',
        readingReq: [
          '能识别段落主旨与支撑细节。',
          '能根据上下文线索猜测生词。',
          '能理解代词（it / they / this）指代的内容。',
        ],
        writingReq: [
          '能写一段 60–80 词的读后小结。',
          '能就阅读话题写简单的观点句。',
          '能完成单元词汇的搭配练习并造句。',
        ],
        units: [
          { n: 1, theme: '动物（Animals）', reading: '动物智慧', writing: '写动物行为观察' },
          { n: 2, theme: '历史（History）', reading: '文明的遗迹', writing: '写一处遗迹' },
          { n: 3, theme: '文化（Culture）', reading: '节庆与传统', writing: '介绍一个节日' },
          { n: 4, theme: '社会（Social Studies）', reading: '城市与人', writing: '写城市生活' },
          { n: 5, theme: '科学（Science）', reading: '太空探索', writing: '写一项太空发现' },
          { n: 6, theme: '自然（Nature）', reading: '极端之地', writing: '描述极端环境' },
          { n: 7, theme: '金钱（Money）', reading: '经济小知识', writing: '写金钱与幸福' },
          { n: 8, theme: '健康（Health）', reading: '饮食与健康', writing: '写均衡饮食' },
        ],
      },
      {
        key: 're2', label: 'Reading Explorer 2', cefr: 'B1（准中级）',
        framework: 'RE 2 阅读进入说明文/传记类，强调「扫读定位 + 段落逻辑」。',
        readingReq: [
          '能快速扫读定位特定信息。',
          '能理解段落间的因果、对比、举例关系。',
          '能区分事实与作者观点。',
        ],
        writingReq: [
          '能写 100–120 词的读后段落，含要点归纳。',
          '能就话题写简短的比较或评论。',
          '能使用连接词组织逻辑。',
        ],
        units: [
          { n: 1, theme: '探索（Exploration）', reading: '探险家故事', writing: '写一次探索' },
          { n: 2, theme: '建筑（Architecture）', reading: '伟大建筑', writing: '描述一座建筑' },
          { n: 3, theme: '历史（History）', reading: '改变世界的发明', writing: '写一项发明' },
          { n: 4, theme: '文化（Culture）', reading: '语言与文字', writing: '写语言多样性' },
          { n: 5, theme: '科技（Technology）', reading: '数字生活', writing: '写科技利弊' },
          { n: 6, theme: '自然（Nature）', reading: '海洋深处', writing: '写海洋保护' },
          { n: 7, theme: '社会（Society）', reading: '人口与城市', writing: '写城市化' },
          { n: 8, theme: '健康（Health）', reading: '医学进步', writing: '写医学突破' },
        ],
      },
      {
        key: 're3', label: 'Reading Explorer 3', cefr: 'B1+（中级）',
        framework: 'RE 3 阅读抽象度提升，强调「推断、归纳、理解作者目的」。',
        readingReq: [
          '能推断隐含信息，而不只找字面答案。',
          '能归纳长文主旨与作者写作目的。',
          '能识别文章的语气与立场。',
        ],
        writingReq: [
          '能写 150 词左右的读后评论，含个人观点。',
          '能就争议话题写双边看法。',
          '能做阅读笔记并转写摘要。',
        ],
        units: [
          { n: 1, theme: '人类（Humanity）', reading: '人类的起源', writing: '写人类迁徙' },
          { n: 2, theme: '城市（Cities）', reading: '未来城市', writing: '写未来城市设想' },
          { n: 3, theme: '科学（Science）', reading: '大脑与认知', writing: '写大脑奥秘' },
          { n: 4, theme: '文化（Culture）', reading: '饮食文化', writing: '写食物与社会' },
          { n: 5, theme: '环境（Environment）', reading: '气候变化', writing: '写气候行动' },
          { n: 6, theme: '科技（Technology）', reading: '人工智能', writing: '写 AI 影响' },
          { n: 7, theme: '历史（History）', reading: '贸易与互联', writing: '写全球贸易' },
          { n: 8, theme: '健康（Health）', reading: '运动科学', writing: '写运动与大脑' },
        ],
      },
      {
        key: 're4', label: 'Reading Explorer 4', cefr: 'B2（中高级）',
        framework: 'RE 4 阅读接近学术英语，强调「多源信息整合与批判性阅读」。',
        readingReq: [
          '能处理含数据与术语的说明文。',
          '能比较不同来源对同一话题的表述。',
          '能识别假设、证据强弱与偏见。',
        ],
        writingReq: [
          '能写 200 词左右的学术短文，结构完整。',
          '能就话题写「摘要 + 评论」。',
          '能引用原文支持自己的观点。',
        ],
        units: [
          { n: 1, theme: '生命（Life）', reading: '生命的边界', writing: '写生命定义' },
          { n: 2, theme: '宇宙（Cosmos）', reading: '宇宙探索', writing: '写太空未来' },
          { n: 3, theme: '社会（Society）', reading: '不平等', writing: '写社会公平' },
          { n: 4, theme: '能源（Energy）', reading: '能源转型', writing: '写能源选择' },
          { n: 5, theme: '科技（Tech）', reading: '生物科技', writing: '写基因编辑' },
          { n: 6, theme: '自然（Nature）', reading: '物种灭绝', writing: '写保育行动' },
          { n: 7, theme: '经济（Economics）', reading: '消费社会', writing: '写可持续消费' },
          { n: 8, theme: '心理（Mind）', reading: '幸福研究', writing: '写幸福来源' },
        ],
      },
      {
        key: 're5', label: 'Reading Explorer 5', cefr: 'C1（高级）',
        framework: 'RE 5 为最高级别，阅读长而抽象，强调「复杂论证与学术写作」。',
        readingReq: [
          '能把握复杂论证脉络与修辞。',
          '能辨析细微语义与作者立场。',
          '能整合多文本形成独立判断。',
        ],
        writingReq: [
          '能写 250+ 词的正式评论/报告。',
          '能灵活使用高级衔接与学术语体。',
          '能针对不同读者撰写摘要或建议。',
        ],
        units: [
          { n: 1, theme: '起源（Origins）', reading: '宇宙与生命起源', writing: '写起源假说评论' },
          { n: 2, theme: '智能（Intelligence）', reading: '机器智能', writing: '写智能边界' },
          { n: 3, theme: '权力（Power）', reading: '资源与权力', writing: '写资源政治' },
          { n: 4, theme: '边界（Borders）', reading: '移民与身份', writing: '写身份政治' },
          { n: 5, theme: '风险（Risk）', reading: '全球风险', writing: '写风险管理' },
          { n: 6, theme: '信仰（Belief）', reading: '科学与宗教', writing: '写认知冲突' },
          { n: 7, theme: '创造力（Creativity）', reading: '艺术与科学', writing: '写跨界创新' },
          { n: 8, theme: '未来（Future）', reading: '长期主义', writing: '写长期规划' },
        ],
      },
    ],
  },

  // ───────────────────────── 乐读（分级原版阅读体系） ─────────────────────────
  ledu: {
    name: '乐读',
    publisher: '分级原版阅读体系（具体书目以机构最新大纲为准）',
    cefr: 'Pre-A1 – B2（启蒙 → 进阶，对标 CEFR 与年级）',
    features: [
      '分级阅读主线：按阅读能力分级（从拼读启蒙到章节书/非虚构），让小朋友「读得懂、读得进」。',
      '原版读物为主：以英文原版绘本、分级读物、章节书为材料，培养真实语感。',
      '精读 + 泛读结合：精读抓语言点与理解，泛读保量与兴趣，二者配比科学。',
      '阅读记录与反馈：通常配套阅读量打卡、理解测验与阶段评估，形成闭环。',
      '读写迁移：从「读得多」走向「写得出」，逐步衔接简单写作与读书报告。',
    ],
    value:
      '对小朋友的价值：用「分级、可达成」的路径建立英语阅读自信，避免一上来就啃不懂的材料而挫败；'
      + '在大量原版阅读中自然积累词汇、语感与背景知识，为后续 Unlock / Reading Explorer 等学术课程打底。',
    framework:
      '乐读按阅读能力分为若干阶段（从启蒙拼读到进阶非虚构），下面给出「阶段框架 + 代表读物类型 + 阅读要求 + 写作要求」。'
      + '各阶段的具体书目与课次以机构最新大纲为准，本框架用于帮助小朋友建立整体学习路径。',
    note: '乐读为分级阅读体系，具体书目与课次以机构最新大纲为准；下方为参考性分级框架，非精确逐课目录。',
    levels: [
      {
        key: 'l1', label: 'L1 启蒙', cefr: 'Pre-A1（拼读启蒙）',
        framework: '以自然拼读（Phonics）与高频词为主，配合图文绘本，建立字母—发音对应与阅读兴趣。',
        readingReq: [
          '能认读 CVC（辅音-元音-辅音）简单词。',
          '能跟读绘本，理解图画与文字的对应。',
          '能指读高频词（sight words）中的常见词。',
        ],
        writingReq: [
          '能描红/抄写字母与简单单词。',
          '能在提示下写自己的名字与少量词。',
          '能为一页绘本配一句话。',
        ],
        units: [
          { n: 1, theme: '字母与发音', reading: '拼读启蒙绘本', writing: '抄写字母 A–Z' },
          { n: 2, theme: '高频词', reading: '高频词小书', writing: '写 5 个高频词' },
          { n: 3, theme: '动物绘本', reading: '看图读动物', writing: '配一句图说' },
          { n: 4, theme: '家庭绘本', reading: '我的家', writing: '写家庭成员词' },
          { n: 5, theme: '颜色形状', reading: '颜色形状书', writing: '写颜色词' },
          { n: 6, theme: '数字', reading: '数一数', writing: '写数字词' },
          { n: 7, theme: '食物', reading: '好吃的东西', writing: '写喜欢的食物' },
          { n: 8, theme: '身体', reading: '我的身体', writing: '写身体部位词' },
        ],
      },
      {
        key: 'l2', label: 'L2 基础', cefr: 'A1（分级读物）',
        framework: '进入分级读物（如桥梁书前段），句子短、重复多，开始独立默读简单故事。',
        readingReq: [
          '能独立默读 1–2 句话配图的小故事。',
          '能回答关于「谁、什么、哪里」的事实性问题。',
          '能按顺序复述故事大意。',
        ],
        writingReq: [
          '能写 2–3 句描述故事人物或事件。',
          '能仿写单元重点句式。',
          '能画一画并配一句英文说明。',
        ],
        units: [
          { n: 1, theme: '校园故事', reading: '学校里的一天', writing: '写学校活动' },
          { n: 2, theme: '朋友', reading: '我的朋友', writing: '写好朋友' },
          { n: 3, theme: '动物冒险', reading: '小动物去哪儿', writing: '写动物经历' },
          { n: 4, theme: '节日', reading: '过节啦', writing: '写喜欢节日' },
          { n: 5, theme: '天气', reading: '今天天气', writing: '写天气与穿着' },
          { n: 6, theme: '爱好', reading: '我喜欢做的事', writing: '写自己的爱好' },
          { n: 7, theme: '食物', reading: '好吃店', writing: '写一次点餐' },
          { n: 8, theme: '旅行', reading: '去海边', writing: '写一次出游' },
        ],
      },
      {
        key: 'l3', label: 'L3 提高', cefr: 'A2（桥梁书）',
        framework: '过渡到桥梁书（章节渐多、插图渐少），开始读稍长的连续故事与非虚构短文。',
        readingReq: [
          '能阅读含多段的短章节，抓住每章要点。',
          '能推测生词含义，记录生词本。',
          '能比较故事中人物行为与动机。',
        ],
        writingReq: [
          '能写一段 50–80 词的读后小结。',
          '能就故事写「最喜欢的部分 + 理由」。',
          '能写简单的读书卡片。',
        ],
        units: [
          { n: 1, theme: '冒险故事', reading: '小小探险家', writing: '写冒险片段' },
          { n: 2, theme: '科普短文', reading: '恐龙世界', writing: '写一种恐龙' },
          { n: 3, theme: '校园生活', reading: '班级趣事', writing: '写班级故事' },
          { n: 4, theme: '家庭', reading: '特别的家人', writing: '写家人特质' },
          { n: 5, theme: '自然', reading: '四季变化', writing: '写喜欢的季节' },
          { n: 6, theme: '发明', reading: '有用的小发明', writing: '写一项发明' },
          { n: 7, theme: '节日文化', reading: '世界各地的节', writing: '写异国节日' },
          { n: 8, theme: '想象', reading: '如果我会飞', writing: '写想象作文' },
        ],
      },
      {
        key: 'l4', label: 'L4 进阶', cefr: 'B1（章节书 / 初章）',
        framework: '进入初章书与简易非虚构，强调连贯阅读与理解深度，开始写结构更完整的读书报告。',
        readingReq: [
          '能连续阅读一本初章书并理解主线与人物发展。',
          '能概括章节内容，提出自己的疑问。',
          '能区分事实与作者观点。',
        ],
        writingReq: [
          '能写 100–150 词的读书报告（情节+感想）。',
          '能就话题写有观点的短评。',
          '能做阅读摘抄与好词好句积累。',
        ],
        units: [
          { n: 1, theme: '成长小说', reading: '成长中的难题', writing: '写成长感悟' },
          { n: 2, theme: '科普读物', reading: '太空与星球', writing: '写太空知识' },
          { n: 3, theme: '历史故事', reading: '古代文明', writing: '写一种文明' },
          { n: 4, theme: '动物小说', reading: '动物朋友', writing: '写动物与人' },
          { n: 5, theme: '侦探故事', reading: '小小侦探', writing: '写推理过程' },
          { n: 6, theme: '地理', reading: '国家与地貌', writing: '写一个地方' },
          { n: 7, theme: '传记', reading: '了不起的人', writing: '写敬佩的人' },
          { n: 8, theme: '想象文学', reading: '奇幻世界', writing: '写自己的奇幻设定' },
        ],
      },
      {
        key: 'l5', label: 'L5 高阶', cefr: 'B2（原版中章 / 非虚构）',
        framework: '阅读原版中章书与《国家地理》类非虚构，强调批判性阅读与学术衔接。',
        readingReq: [
          '能阅读原版中章书，分析人物弧光与主题。',
          '能处理非虚构中的图表、数据与术语。',
          '能比较不同作品对同一主题的处理。',
        ],
        writingReq: [
          '能写 150–200 词的结构化读书报告或评论。',
          '能就社会/科学话题写简短议论文。',
          '能做多源信息笔记并转写摘要。',
        ],
        units: [
          { n: 1, theme: '现实题材', reading: '少年与世界', writing: '写现实议题评论' },
          { n: 2, theme: '科幻', reading: '未来设定', writing: '写未来世界观' },
          { n: 3, theme: '自然科普', reading: '生态与保护', writing: '写环保倡议' },
          { n: 4, theme: '历史非虚构', reading: '改变历史的事件', writing: '写历史事件评析' },
          { n: 5, theme: '人物传记', reading: '科学家故事', writing: '写科学精神' },
          { n: 6, theme: '社会议题', reading: '身边的社会', writing: '写社会观察' },
          { n: 7, theme: '艺术', reading: '艺术与表达', writing: '写艺术评论' },
          { n: 8, theme: '综合', reading: '跨学科主题', writing: '写跨学科短文' },
        ],
      },
    ],
  },

  // ───────────────────────── 新概念英语（外研社 · 经典体系） ─────────────────────────
  nce: {
    name: '新概念英语',
    publisher: '外语教学与研究出版社（L.G. Alexander 原版体系）',
    cefr: 'A1 – C1（第一册 → 第四册）',
    features: [
      '经典体系：全球广泛使用数十年的英语教材，结构清晰、循序渐进，资料极大丰富。',
      '语法主线：以句型/语法为暗线层层递进，从基础时态到长难句系统打牢基本功。',
      '听说读写全覆盖：从听力模仿、背诵到改写、写作，训练扎实。',
      '课文经典地道：选材幽默、篇幅精炼，便于背诵与语感培养。',
      '适合打基础：尤其适合需要系统补语法与写作框架的学习者，可自学配套资料极多。',
    ],
    value:
      '对小朋友的价值：体系成熟、讲解细致、配套音频与解析随处可见，是「把英语地基打牢」的性价比之选；'
      + '通过背诵与改写积累地道语感，为后续原版阅读与学术写作提供坚实语法与表达底座。',
    framework:
      '新概念英语共四册，难度由浅入深：第一册打基础（日常句型），第二册系统语法与写作，'
      + '第三册深化长难句与阅读理解，第四册接近母语水平的各类文体精读。'
      + '下面按册给出课程框架、代表内容、阅读要求与写作要求。',
    note: '册内具体课次以原版教材为准；下方为按册整理的课程框架与代表训练重点。',
    levels: [
      {
        key: 'b1', label: '第一册', cefr: 'A1 – A2（基础）',
        framework: '第一册（First Things First）以日常对话与基础句型为主，约 144 课，覆盖基本时态、疑问句与口语表达。',
        readingReq: [
          '能跟读课文录音，模仿语音语调。',
          '能理解每课对话的场景与含义。',
          '能就课文话题做简单问答。',
        ],
        writingReq: [
          '能抄写并默写重点句型。',
          '能替换关键词改写课文句子。',
          '能写 3–5 句日常对话或描述。',
        ],
        units: [
          { n: 1, theme: '见面与介绍', reading: 'Excuse me! / Sorry?', writing: '写自我介绍' },
          { n: 2, theme: '物品与所属', reading: 'Is this your…?', writing: '写物品归属' },
          { n: 3, theme: '颜色与特征', reading: 'What colour…?', writing: '写物品描述' },
          { n: 4, theme: '职业', reading: 'What\'s his job?', writing: '写家人职业' },
          { n: 5, theme: '日常活动', reading: 'What\'s the time?', writing: '写一天安排' },
          { n: 6, theme: '购物', reading: 'What do you want?', writing: '写购物对话' },
          { n: 7, theme: '天气', reading: 'What\'s the weather like?', writing: '写天气描述' },
          { n: 8, theme: '过去的事', reading: 'He\'s ill. / We were…', writing: '写昨天的经历' },
        ],
      },
      {
        key: 'b2', label: '第二册', cefr: 'A2 – B1（系统语法与写作）',
        framework: '第二册（Practice & Progress）共 96 课，每课一篇幽默短文 + 关键句型，系统梳理时态、从句与写作框架。',
        readingReq: [
          '能默读每课短文，理解情节与笑点。',
          '能找出课文中的关键语法结构。',
          '能用自己的话复述故事。',
        ],
        writingReq: [
          '能仿写课文结构，写 60–100 词短文。',
          '能就课文句型做替换/扩写练习。',
          '能写简单日记或信件。',
        ],
        units: [
          { n: 1, theme: '私人谈话', reading: 'A private conversation', writing: '写一次看剧经历' },
          { n: 2, theme: '早餐还是午餐', reading: 'Breakfast or lunch?', writing: '写作息习惯' },
          { n: 3, theme: '请您帮个忙', reading: 'Please send me a card', writing: '写一张明信片' },
          { n: 4, theme: '激动的代价', reading: 'An exciting trip', writing: '写一次旅行' },
          { n: 5, theme: '无为而治', reading: 'No wrong numbers', writing: '写日常小事' },
          { n: 6, theme: '代价不菲', reading: 'Percy Buttons', writing: '写一个有趣的人' },
          { n: 7, theme: 'Too 与 Enough', reading: 'Too late', writing: '写一次迟到' },
          { n: 8, theme: '最好的与最差的', reading: 'The best and the worst', writing: '写比较与对比' },
        ],
      },
      {
        key: 'b3', label: '第三册', cefr: 'B1 – B2（长难句与阅读深化）',
        framework: '第三册（Developing Skills）共 60 课，课文更长、句式更丰富，强化阅读理解、词汇辨析与写作表达。',
        readingReq: [
          '能阅读较长记叙文/说明文，把握主旨与细节。',
          '能分析长难句的成分与逻辑。',
          '能概括段落大意并做阅读笔记。',
        ],
        writingReq: [
          '能写 120–180 词结构完整的短文。',
          '能运用课文词汇与衔接手段。',
          '能就话题写有层次的评论。',
        ],
        units: [
          { n: 1, theme: '逃遁者', reading: 'A puma at large', writing: '写一则奇闻' },
          { n: 2, theme: ' Thirteen 等于 13', reading: 'Thirteen equals one', writing: '写一个误会' },
          { n: 3, theme: '无名女神', reading: 'An unknown goddess', writing: '写legend/传说' },
          { n: 4, theme: '阿尔弗雷德·布洛格', reading: 'The double life of Alfred Bloggs', writing: '写双重生活' },
          { n: 5, theme: '确切无误', reading: 'The facts', writing: '写事实与真相' },
          { n: 6, theme: ' Smash 与 Grab', reading: 'Smash-and-grab', writing: '写一则事件报道' },
          { n: 7, theme: '理智与情感', reading: 'Crazy', writing: '写荒诞与幽默' },
          { n: 8, theme: '由丑变美', reading: 'A famous monastery', writing: '写变迁与修复' },
        ],
      },
      {
        key: 'b4', label: '第四册', cefr: 'C1（高级精读）',
        framework: '第四册（Fluency in English）共 48 课，选材涵盖社科、科普、文学等各类文体，训练接近母语的精读与表达。',
        readingReq: [
          '能阅读各类文体的原版材料，把握论证与风格。',
          '能辨析作者立场、修辞与逻辑。',
          '能整合信息形成自己的判断。',
        ],
        writingReq: [
          '能写 200+ 词的正式评论/摘要。',
          '能灵活使用高级词汇与学术语体。',
          '能就复杂话题写有立场的文章。',
        ],
        units: [
          { n: 1, theme: '发现化石人', reading: 'Finding fossil man', writing: '写人类演化' },
          { n: 2, theme: '非同寻常的夜晚', reading: 'We have been warned', writing: '写警示与反思' },
          { n: 3, theme: '麻醉的发明', reading: 'The discovery of anaesthesia', writing: '写医学里程碑' },
          { n: 4, theme: '太阳系之谜', reading: 'Exploring the solar system', writing: '写太空探索' },
          { n: 5, theme: '金钱的价值', reading: 'The value of money', writing: '写金钱与幸福' },
          { n: 6, theme: '政府与人', reading: 'The State of the Union', writing: '写社会与制度' },
          { n: 7, theme: '地球资源', reading: 'The Earth\'s resources', writing: '写资源与可持续' },
          { n: 8, theme: '逆流而上', reading: 'Swimming the Channel', writing: '写毅力与突破' },
        ],
      },
    ],
  },
}

export default ENG
