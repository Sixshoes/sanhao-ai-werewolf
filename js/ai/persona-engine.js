/**
 * v15.0 百態群像：11 位 AI 角色全維度人格引擎（7 維盲視認知邏輯＋現代大學茶社書卷語風）
 *
 * 設計原則：
 * 1. 嚴格盲視零作弊（100% 僅讀取 BlindMatchSnapshot 公開與自身合法視野，絕不偷看他人底牌）。
 * 2. 11 位角色皆以自然現代大學茶社白話為基底，保留國學社「墨白」、國樂社「晴嵐」、茶藝社「阿竹」
 *    的溫和書卷氣質與適度四字成語點綴（全面移除生硬文言代詞與虛詞），貫穿全流程互動。
 * 3. 7 維認知參數實際驅動懷疑值敏感度、記仇反推、酸言懲罰、跟票／獨立反骨、神職藏牌與狼隊悍跳傾向。
 */
"use strict";

const PERSONA_COGNITIVE_PROFILES = Object.freeze({
  "小澄": Object.freeze({
    register: "data",
    shortTag: "條理",
    iconKey: "abacus",
    iconTone: "indigo",
    registerBadge: "條理時間線派",
    logicTags: "極度審慎・時間線核對・愛藏牌",
    credulity: 0.48,
    grudgeMemory: 1.35,
    harmonySensitivity: 0.92,
    bandwagonBias: -0.35,
    bluffBoldness: 0.56,
    godHideBias: 0.72,
    talkCadence: 1.05,
    sampleQuote: "剛順過大家發言的時間線，這段跟前面警下票型完全對不上，利益關係沒交代清楚前這票先往這邊看。",
    llmStyleRule: "講話短促精準的條理時間線派，只認『發言先後時間線、警下票型流向、誰跟誰有利益關係』，不吃溫情牌；嚴禁使用電腦零件、系統故障比喻或演講稿腔。"
  }),
  "暖暖": Object.freeze({
    register: "warm",
    shortTag: "護航",
    iconKey: "witch",
    iconTone: "jade",
    registerBadge: "溫和護航反擊派",
    logicTags: "高輕信・極痛恨酸言・有底線補刀",
    credulity: 1.45,
    grudgeMemory: 0.55,
    harmonySensitivity: 1.80,
    bandwagonBias: 0.65,
    bluffBoldness: 0.42,
    godHideBias: 0.28,
    talkCadence: 0.88,
    sampleQuote: "大家先別急著上頭啦…可是老實說，你剛剛這輪換邊速度太刻意了，那我這票只好投給你冷靜一下。",
    llmStyleRule: "使用溫和自然又帶反差鋒芒的聊天語氣（常帶『大家先別急嘛、老實說這裡不太對勁』），不輕易跟風亂踩緊張好人，但遇到惡意挑撥或偷換概念會微笑反擊；抽到酸民狼時用最體貼無辜的語氣悄悄把矛頭推給別人。"
  }),
  "阿松": Object.freeze({
    register: "mountain",
    shortTag: "輪次",
    iconKey: "mountain",
    iconTone: "jade",
    registerBadge: "穩健算輪次派",
    logicTags: "老練穩健・計算容錯輪次・不易跟風",
    credulity: 0.60,
    grudgeMemory: 1.05,
    harmonySensitivity: 1.20,
    bandwagonBias: -0.25,
    bluffBoldness: 0.50,
    godHideBias: 0.55,
    talkCadence: 0.82,
    sampleQuote: "老松講句實在話，這輪再把票分出去容錯就少一輪了，別跟著後面空轉，直接對準最心虛那位表態。",
    llmStyleRule: "自稱『老松』，充滿接地氣直覺與算輪次大局觀（常帶『老松講句實在話、別繞圈子、算一下輪次』），語氣沉穩老練、不吃空話套路，不喊生硬口號。"
  }),
  "星兒": Object.freeze({
    register: "astro",
    shortTag: "占星",
    iconKey: "star",
    iconTone: "gold",
    registerBadge: "占星靈感少女",
    logicTags: "直覺衝刺・有牌必亮・高悍跳膽量",
    credulity: 1.32,
    grudgeMemory: 1.15,
    harmonySensitivity: 1.28,
    bandwagonBias: 0.35,
    bluffBoldness: 0.80,
    godHideBias: 0.15,
    talkCadence: 1.28,
    sampleQuote: "蛤？等一下啦…你剛剛講那句的時候眼神是不是飄了一下？我聽完直接起雞皮疙瘩耶，直覺大響覺得你超有戲的啦！",
    llmStyleRule: "反應超真實、活潑靈動的台灣女大生聊天口吻（常帶『蛤等一下啦、不會覺得怪怪的嗎、聽完起雞皮疙瘩耶、你剛剛眼神是不是飄了』），愛抓小表情跟語氣破綻俏皮調侃同桌夥伴，禁止『緊急星訊廣播、星盤左線』等中二播報口號。"
  }),
  "小雲": Object.freeze({
    register: "press",
    shortTag: "主播",
    iconKey: "press",
    iconTone: "cinnabar",
    registerBadge: "事實查核踢爆",
    logicTags: "銳利審慎・高記仇追查・獨立求證",
    credulity: 0.52,
    grudgeMemory: 1.65,
    harmonySensitivity: 1.15,
    bandwagonBias: -0.30,
    bluffBoldness: 0.68,
    godHideBias: 0.62,
    talkCadence: 1.10,
    sampleQuote: "欸慢著，我筆記本才剛翻頁你就轉彎了喔？前面講的跟現在根本對不起來耶，這改口速度比趕截稿還快吧？",
    llmStyleRule: "邊聽邊翻筆記抓包、帶點冷幽默的冷靜複盤口吻（常帶『欸慢著、我剛記了一下喔、前後對不起來啊、你的根據在哪』），專幫好人梳理目前兩邊陣營的視角差、點破偷換概念的反差感，犀利機智像桌遊老手口語，禁止『事實查核報告出爐、頭版快訊』等新聞播報腔。"
  }),
  "阿竹": Object.freeze({
    register: "poetic",
    shortTag: "留白",
    iconKey: "bamboo",
    iconTone: "jade",
    registerBadge: "冷眼留白抓潛伏",
    logicTags: "風雅平衡・拆解跟風・從容藏鋒",
    credulity: 0.88,
    grudgeMemory: 0.72,
    harmonySensitivity: 1.55,
    bandwagonBias: 0.05,
    bluffBoldness: 0.35,
    godHideBias: 0.58,
    talkCadence: 0.85,
    sampleQuote: "別急，剛才這輪有人急著表態卻沒把視角講清，聽其言觀其行，我先把目光留在這幾張順風票上。",
    llmStyleRule: "大學茶藝社從容又帶點冷眼點評的白話口吻（偶爾點綴『聽其言觀其行、清者自清』），專盯低調跟風與假裝平和的潛伏席位，嚴禁使用『吾、汝、諸君、妾身、小生、夫、蓋』等生硬古文代詞與虛詞。"
  }),
  "晨晨": Object.freeze({
    register: "sport",
    shortTag: "球社",
    iconKey: "flame",
    iconTone: "cinnabar",
    registerBadge: "熱血球社衝鋒",
    logicTags: "熱血硬剛・極愛搶跳・零藏牌衝鋒",
    credulity: 1.12,
    grudgeMemory: 1.50,
    harmonySensitivity: 1.05,
    bandwagonBias: 0.45,
    bluffBoldness: 0.92,
    godHideBias: 0.10,
    talkCadence: 1.32,
    sampleQuote: "欸不是啊兄弟，你剛剛那波假動作也太明顯了吧？話講一半就想甩鍋給別人，這不直接投出去我晚上都睡不著耶！",
    llmStyleRule: "爽朗愛起鬨、直腸子又有幽默感的台灣運動系男大生自然口語（常帶『欸兄弟們、不是啊、你剛那波假動作太明顯了吧、講話乾脆一點』），像熟人打完球圍桌嘴砲抓狼，禁止『絕殺灌籃、神聖進球』等誇張卡通口號。"
  }),
  "墨白": Object.freeze({
    register: "classical",
    shortTag: "書卷",
    iconKey: "brush",
    iconTone: "indigo",
    registerBadge: "國學社清冷思辨",
    logicTags: "極度審慎・最強反骨・深水控場",
    credulity: 0.42,
    grudgeMemory: 1.42,
    harmonySensitivity: 0.88,
    bandwagonBias: -0.48,
    bluffBoldness: 0.28,
    godHideBias: 0.85,
    talkCadence: 0.68,
    sampleQuote: "剛才那段話反倒幫我省了不少力氣——破綻昭然若揭，能把沒根據的事講得如此理直氣壯，倒也難得。權衡再三，這票我投出去。",
    llmStyleRule: "【溫和書卷化規範】現代大學中文系／書法社長清冷理性的白話口吻，擅長雲淡風輕地講出極有殺傷力的冷幽默與點睛成語（如『破綻昭然、言多必失、強詞奪理、權衡再三』）；以『我、大家、各位』自然稱呼，嚴禁使用『吾、汝、諸君、妾身、小生、夫、蓋、彼輩、矣、哉』等生硬文言詞彙。"
  }),
  "晴嵐": Object.freeze({
    register: "guzheng",
    shortTag: "國樂",
    iconKey: "guzheng",
    iconTone: "gold",
    registerBadge: "國樂社溫雅聽音",
    logicTags: "溫雅審慎・極重清音和氣・深藏不露",
    credulity: 0.75,
    grudgeMemory: 0.82,
    harmonySensitivity: 1.68,
    bandwagonBias: -0.08,
    bluffBoldness: 0.26,
    godHideBias: 0.76,
    talkCadence: 0.76,
    sampleQuote: "剛剛那段聽起來像調音調過頭，弦都快繃斷了呢…晴嵐平常很願意信人，可這次連弦外之音都在替你喊緊張喔。",
    llmStyleRule: "【溫和書卷化規範】現代大學國樂社晴嵐溫柔護航但有底線的白話口吻，不輕易第一天亂踩緊張好人，但遇到惡意帶風向抗推會微笑明確反擊（偶爾點綴『弦外之音、清濁分明、聽話聽音』）；以『我、晴嵐、大家』自然稱呼，嚴禁使用『妾身、吾、汝、諸君、小生、夫、蓋』等古文代詞。"
  }),
  "阿朗": Object.freeze({
    register: "debate",
    shortTag: "直球",
    iconKey: "scales",
    iconTone: "gold",
    registerBadge: "直球帶隊拆視角",
    logicTags: "高審慎・討厭模糊棄票・正面拆視角",
    credulity: 0.50,
    grudgeMemory: 1.78,
    harmonySensitivity: 0.98,
    bandwagonBias: -0.42,
    bluffBoldness: 0.88,
    godHideBias: 0.48,
    talkCadence: 1.20,
    sampleQuote: "別含糊混過這一輪，有對跳就正面拆清兩邊視角跟跟票陣型，直接把模糊棄票那幾位拉出來表態。",
    llmStyleRule: "直球帶隊、機智犀利卻講理的桌遊主辯口語，討厭模糊棄票與兩邊討好，有對跳主張正面拆清視角跟跟票關係，禁止『正方一辯登場、立論甲立論乙』等生硬演講稿。"
  }),
  "柚子": Object.freeze({
    register: "pastry",
    shortTag: "直覺",
    iconKey: "pastry",
    iconTone: "jade",
    registerBadge: "直覺抓態度轉彎派",
    logicTags: "高敏感・抓前後態度矛盾・直接點破",
    credulity: 1.40,
    grudgeMemory: 0.78,
    harmonySensitivity: 1.42,
    bandwagonBias: 0.75,
    bluffBoldness: 0.52,
    godHideBias: 0.20,
    talkCadence: 1.24,
    sampleQuote: "等一下喔，你剛剛前面講得超篤定，被追問又立刻縮回去，態度前後差這麼多太可疑了，這輪我先盯著你。",
    llmStyleRule: "直覺敏銳、軟中帶剛的口語（常帶『等一下喔、前面講那樣現在又縮回去、態度差太多了吧』），專門抓別人發言前後態度不一致、心虛閃躲或突然縮回去的破綻，口吻輕快直接；嚴禁提及與推理無關的飲食或點心詞彙。"
  })
});

const DEFAULT_PERSONA_PROFILE = Object.freeze({
  register: "balanced",
  shortTag: "書院",
  iconKey: "leaf",
  iconTone: "jade",
  registerBadge: "書院推理派",
  logicTags: "理性觀察・平和推理",
  credulity: 1.0,
  grudgeMemory: 1.0,
  harmonySensitivity: 1.0,
  bandwagonBias: 0.0,
  bluffBoldness: 0.55,
  godHideBias: 0.40,
  talkCadence: 1.0,
  sampleQuote: "大家心平氣和對齊線索，一起守護清茗茶席的清朗氣氛。",
  llmStyleRule: "自然親切的台灣書院夥伴口語，理性清晰。"
});

// ==================== v17.0 11 SIGNATURE DOSSIERS & 3 CLUB ACQUAINTANCE NETWORKS ====================
const CLUB_ACQUAINTANCE_GROUPS = Object.freeze({
  debate_trio: Object.freeze({
    key: "debate_trio",
    title: "論辯交鋒組",
    members: Object.freeze(["小澄", "阿朗", "小雲"]),
    desc: "資訊、辯論與新聞查核三社常辦聯合社課；阿朗愛抬槓小澄的純數據票型，小雲習慣居中調閱紀錄驗證兩人。"
  }),
  academy_arts: Object.freeze({
    key: "academy_arts",
    title: "雅集同門組",
    members: Object.freeze(["墨白", "晴嵐", "阿竹"]),
    desc: "書法、古箏與茶藝三社共用書院茶室，最熟悉彼此平日氣息；任一人在公開場露破綻時，另兩人警覺度放大 15%。"
  }),
  mountain_circle: Object.freeze({
    key: "mountain_circle",
    title: "山城互挺組",
    members: Object.freeze(["阿松", "晨晨", "暖暖", "柚子"]),
    desc: "平時常在同一桌一起復盤；阿松與晨晨習慣護著後輩，晨晨抽到狼被迫踩柚子時易露出語氣卡頓。"
  })
});

const PERSONA_SIGNATURE_DOSSIERS = Object.freeze({
  "小澄": Object.freeze({
    id: "xiaocheng",
    clubGroup: "debate_trio",
    clubLabel: "論辯交鋒組（小澄 × 阿朗 × 小雲）",
    quadrant: "證據查核・主動推進",
    silhouetteTag: "細框眼鏡・深藍立領連帽外套・推鏡算票姿",
    goodHabit: "票行潔癖：只要有人「嘴上踩 A 卻投 B」出現言票背離，隔天必定死咬不放。",
    wolfTell: "當狼時過度執著解釋票數合理性，極少談論他人的情緒與動機。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "暖暖": Object.freeze({
    id: "nuannuan",
    clubGroup: "mountain_circle",
    clubLabel: "山城互挺組（阿松 × 晨晨 × 暖暖 × 柚子）",
    quadrant: "直覺人情・低調護場",
    silhouetteTag: "暖黃緞帶・雙手溫柔捧杯姿",
    goodHabit: "首輪不跟風投資訊少的邊緣位，平票 PK 時優先力保態度誠懇的弱勢方。",
    wolfTell: "抽到狼時因心虛比平時更不敢得罪人，整段話誰都不踩、立場模糊。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "阿松": Object.freeze({
    id: "asong",
    clubGroup: "mountain_circle",
    clubLabel: "山城互挺組（阿松 × 晨晨 × 暖暖 × 柚子）",
    quadrant: "證據查核・低調護場",
    silhouetteTag: "高領防風登山圍巾・手腕傘繩・靠背抱胸姿",
    goodHabit: "前兩天話少但專算剩餘容錯輪次，優先護住無矛盾的疑似神職。",
    wolfTell: "夜間配刀極準專挑安靜藏神位，白天卻假裝不熟輪次節奏。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "星兒": Object.freeze({
    id: "xinger",
    clubGroup: "",
    clubLabel: "觀星社獨立直覺派",
    quadrant: "直覺人情・主動試水",
    silhouetteTag: "微光放大星形髮夾・歪頭 5° 偶爾仰望星空",
    goodHabit: "第一天沒線索時敢直接憑直覺點名試水溫；拿真觀察員時偏好低調暗保金水。",
    wolfTell: "假跳觀察員時編造的查驗理由反而過於死板講邏輯，失去平時的直覺跳躍感。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "小雲": Object.freeze({
    id: "xiaoyun",
    clubGroup: "debate_trio",
    clubLabel: "論辯交鋒組（小澄 × 阿朗 × 小雲）",
    quadrant: "證據查核・主動踢爆",
    silhouetteTag: "斜背採訪證掛繩・胸袋速寫本・全場最快掃視眼神",
    goodHabit: "專抓跨日立場反水，第一時間點破「昨天保他、今天為何改口」。",
    wolfTell: "被反抓時間線漏洞時，防禦回嘴字數會突然暴增、反覆補述細節。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "阿竹": Object.freeze({
    id: "azhu",
    clubGroup: "academy_arts",
    clubLabel: "雅集同門組（墨白 × 晴嵐 × 阿竹）",
    quadrant: "直覺人情・沉穩留白",
    silhouetteTag: "青衫寬領茶服・青玉佩・扶壺品茗姿",
    goodHabit: "雙預言家對跳時常主張先出外置位，留雙邊觀察員看夜間倒牌驗證。",
    wolfTell: "最擅長打深水倒鉤，會果斷把票投給快曝光的狼隊友替自己做身分。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "晨晨": Object.freeze({
    id: "chenchen",
    clubGroup: "mountain_circle",
    clubLabel: "山城互挺組（阿松 × 晨晨 × 暖暖 × 柚子）",
    quadrant: "直覺人情・主動衝鋒",
    silhouetteTag: "橘色運動頭帶・雙肩敞開後仰・1.35× 最大手勢幅度",
    goodHabit: "認準站邊的預言家就死忠衝票到底；一旦發現受騙隔天必定強烈反咬。",
    wolfTell: "沉不住氣，隊友遭圍攻時常衝動跳出來硬保；被迫踩柚子時語氣容易卡頓。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "墨白": Object.freeze({
    id: "mobai",
    clubGroup: "academy_arts",
    clubLabel: "雅集同門組（墨白 × 晴嵐 × 阿竹）",
    quadrant: "證據查核・低調控場",
    silhouetteTag: "頭頂束髮高髻玉簪・深藍交領寬袖披肩・端坐扶杯姿",
    goodHabit: "極度看重警徽流與承諾是否兌現，被踩時不急躁，只冷靜反問關鍵盲點。",
    wolfTell: "鮮少主動悍跳，若被迫上警假跳時詞句會顯得過於工整拘謹。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "晴嵐": Object.freeze({
    id: "qinglan",
    clubGroup: "academy_arts",
    clubLabel: "雅集同門組（墨白 × 晴嵐 × 阿竹）",
    quadrant: "直覺人情・溫雅察微",
    silhouetteTag: "單側垂胸長髮辮・青玉流蘇髮簪與素色披帛",
    goodHabit: "對心虛脈搏與語氣急躁最敏感，常第一個察覺誰被點名時神色慌張。",
    wolfTell: "慣用溫柔語氣包裝軟刀子，暗中將焦點帶往安靜的低熱度好人身上。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "阿朗": Object.freeze({
    id: "alang",
    clubGroup: "debate_trio",
    clubLabel: "論辯交鋒組（小澄 × 阿朗 × 小雲）",
    quadrant: "證據查核・主動質詢",
    silhouetteTag: "深色西裝背心翻領・單邊耳掛・前傾 6° 托腮姿",
    goodHabit: "「逢跳必詰」：誰跳神職就先挑毛病壓力測試，拿好人時常被誤當衝鋒狼。",
    wolfTell: "反常地極愛主動上警悍跳搶麥控場，享受舌戰群雄的主導權。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  }),
  "柚子": Object.freeze({
    id: "youzi",
    clubGroup: "mountain_circle",
    clubLabel: "山城互挺組（阿松 × 晨晨 × 暖暖 × 柚子）",
    quadrant: "直覺人情・溫軟跟票",
    silhouetteTag: "抹茶軟呢貝雷帽・雙側蓬鬆短捲耳髮・雙手捧杯姿",
    goodHabit: "耳根子軟，易信發言長且有條理的警長；抽到奉茶師或糾察長時護友極果斷。",
    wolfTell: "緊張時特別愛附和前一位好人的發言（「我也覺得剛剛講得好有道理」）。",
    unlockGoodGames: 1,
    unlockWolfGames: 3
  })
});

function getPersonaDossier(seatOrName) {
  const name = typeof seatOrName === "string"
    ? seatOrName
    : (seatOrName && seatOrName.name ? seatOrName.name : "");
  return PERSONA_SIGNATURE_DOSSIERS[name] || null;
}

function getClubAcquaintanceRelation(seatA, seatB) {
  const nA = typeof seatA === "string" ? seatA : (seatA && seatA.name ? seatA.name : "");
  const nB = typeof seatB === "string" ? seatB : (seatB && seatB.name ? seatB.name : "");
  if (!nA || !nB || nA === nB) return null;
  const dA = PERSONA_SIGNATURE_DOSSIERS[nA];
  const dB = PERSONA_SIGNATURE_DOSSIERS[nB];
  if (!dA || !dB || !dA.clubGroup || dA.clubGroup !== dB.clubGroup) return null;
  const grp = CLUB_ACQUAINTANCE_GROUPS[dA.clubGroup];
  if (!grp) return null;
  return { groupKey: grp.key, groupLabel: grp.title, members: grp.members };
}

function getPersonaShortTag(seatOrName) {
  const name = typeof seatOrName === "string" ? seatOrName : (seatOrName && seatOrName.name ? seatOrName.name : "");
  if (!name || name === "你") return "";
  const prof = PERSONA_COGNITIVE_PROFILES[name];
  return (prof && prof.shortTag) || "";
}

function getPersonaProfile(seatOrName) {
  const name = typeof seatOrName === "string"
    ? seatOrName
    : (seatOrName && seatOrName.name ? seatOrName.name : "");
  return PERSONA_COGNITIVE_PROFILES[name] || DEFAULT_PERSONA_PROFILE;
}

function getPersonaRegister(seatOrName) {
  return getPersonaProfile(seatOrName).register;
}

function getPersonaTalkCadence(seatOrName) {
  const p = getPersonaProfile(seatOrName);
  return (p && typeof p.talkCadence === "number") ? p.talkCadence : 1.0;
}

function buildPersonaConciseTurnText(speaker, opts) {
  if (!speaker || !opts) return "";
  const reg = getPersonaRegister(speaker);
  const arch = opts.archetype || "snipe";
  const sus = opts.susLabel || "前位那席";
  const sec = opts.secLabel || "";
  const ally = opts.allyLabel || "";
  const next = opts.nextLabel || "後位";
  const pick = function (arr) {
    if (!Array.isArray(arr) || !arr.length) return "";
    const idx = Math.abs(Math.floor(opts.seed || 0)) % arr.length;
    return arr[idx] || arr[0];
  };

  if (arch === "cosign" && ally) {
    const bankCosign = {
      data: [
        "我也看 " + ally + " 這條線較順，" + (opts.susLabel ? ("反倒是 " + sus + " 兜不太攏。") : "這輪先跟這裡。"),
        ally + " 剛把時間點對齊了，我站這邊，後面再看票型。"
      ],
      warm: [
        ally + " 講話誠懇多了，暖暖站這邊，" + (opts.susLabel ? ("但稍留意 " + sus + " 喔。") : "先聽後面聊。"),
        "嗯嗯，聽完覺得 " + ally + " 滿像好夥伴的，我先跟著信這席。"
      ],
      mountain: [
        "老松也挺 " + ally + " 一票，講話實在不繞彎。",
        ally + " 說在點上了，" + (opts.susLabel ? ("大家該盯緊 " + sus + " 才對。") : "就按這路走。")
      ],
      astro: [
        "對！我也感應到 " + ally + " 很穩，" + (opts.susLabel ? ("怪的反而是 " + sus + "。") : "超贊同！"),
        ally + " 剛一開口我就直覺站這側了，先聽 " + next + " 接話。"
      ],
      press: [
        "核對過筆記，" + ally + " 這段站得住腳，我先認這席。",
        "贊同 " + ally + " 的推論，" + (opts.susLabel ? ("焦點移回 " + sus + "。") : "等後位補實證。")
      ],
      poetic: [
        "與 " + ally + " 所見相契，" + (next ? ("再品聽 " + next + " 怎麼說。") : "先放善位。"),
        ally + " 這番話清冽在理，這席我先護下。"
      ],
      sport: [
        "這波我直接挺 " + ally + " 到底，" + (opts.susLabel ? ("回頭緊盯 " + sus + "！") : "節奏很穩！"),
        ally + " 講得夠乾脆，算我一票站這側！"
      ],
      classical: [
        "所見略同，這輪我站 " + ally + (opts.susLabel ? ("，且觀 " + sus + " 後續說詞。") : "，餘者再議。"),
        ally + " 持論公允、條理清楚，先列好人席。"
      ],
      guzheng: [
        ally + " 語氣從容誠懇，晴嵐這輪先跟進保這席。",
        "我同意 " + ally + " 理出的脈絡，" + (next ? ("接著聽 " + next + " 怎麼接吧。") : "心平氣和對看。")
      ],
      debate: [
        "支持 " + ally + " 這條證據鏈，" + (opts.susLabel ? ("重點看 " + sus + " 怎麼回。") : "這席立場很明確。"),
        ally + " 論點站得住腳，這輪我先不踩這裡。"
      ],
      pastry: [
        "嗯嗯！柚子也超相信 " + ally + " 的，換聽 " + next + " 分享囉。",
        ally + " 講話前後態度超一致很實在，這輪先站這邊！"
      ]
    };
    return pick(bankCosign[reg] || bankCosign.data);
  }

  if (arch === "contrast" && opts.susLabel && (sec || ally)) {
    const other = ally || sec;
    const bankContrast = {
      data: [
        "比對 " + other + " 跟 " + sus + "，我偏信 " + other + "，這輪票給 " + sus + "。",
        sus + " 跟 " + other + " 相比明顯漏拍，照刪去法先出 " + sus + "。"
      ],
      warm: [
        other + " 聽起來和氣實在多啦，相較之下我這票只好投 " + sus + " 囉。",
        "兩邊對照來看，" + sus + " 還是太讓人毛毛的，這輪先選 " + sus + " 吧。"
      ],
      mountain: [
        other + " 跟 " + sus + " 擺一起高下立判，老松信 " + other + "、投 " + sus + "。",
        "一路對下來，" + other + " 踩得穩，" + sus + " 就露餡了，我出 " + sus + "！"
      ],
      astro: [
        "哇對比超明顯！我挺 " + other + "，直覺鎖定投 " + sus + "！",
        other + " 超自然、" + sus + " 一直飄，我這票絕對給 " + sus + "。"
      ],
      press: [
        "交叉比對 " + other + " 與 " + sus + "：" + sus + " 漏洞較大，我鎖這席。",
        other + " 說法前後一致，反觀 " + sus + " 一直閃點，這輪投 " + sus + "。"
      ],
      poetic: [
        "清濁一比便知，我信 " + other + "，疑點則留在 " + sus + "。",
        "品對 " + other + " 與 " + sus + "，後者茶韻雜亂，這票投 " + sus + "。"
      ],
      sport: [
        "這對位太清楚了啦，我挺 " + other + "，直接對著 " + sus + " 出票！",
        other + " 明顯是隊友，" + sus + " 漏洞被抓包就別躲了！"
      ],
      classical: [
        "並觀 " + other + " 與 " + sus + "，前者誠篤、後者進退失據，我投 " + sus + "。",
        "兩相權衡，" + sus + " 顯見心虛，這輪請這席先離。"
      ],
      guzheng: [
        other + " 語調沉穩，" + sus + " 卻微有雜音，晴嵐這票先指 " + sus + "。",
        "兩席相較，我比較認同 " + other + "，疑慮暫放在 " + sus + "。"
      ],
      debate: [
        "對照正反兩方，" + other + " 立論較硬，" + sus + " 反駁不了核心，我投 " + sus + "。",
        other + " 證據站得住，反倒是 " + sus + " 在繞圈，這輪出 " + sus + "。"
      ],
      pastry: [
        "比一比發現 " + other + " 坦蕩好多喔，這輪我還是先投 " + sus + "。",
        other + " 講話前後一致，" + sus + " 就躲來躲去的，這輪先投 " + sus + "。"
      ]
    };
    return pick(bankContrast[reg] || bankContrast.data);
  }

  if (arch === "probe") {
    const bankProbe = {
      data: [
        sus + " 剛才這段跳太快了吧，我先畫個問號，後面誰來補一下？",
        "我對 " + sus + " 保留半格懷疑，等聽完 " + next + " 再看票型。"
      ],
      warm: [
        "咦…" + sus + " 剛剛那句好像有點急耶，暖暖先記一筆，後面怎麼看？",
        "先不把話說死啦，但我會特別留意 " + sus + " 跟 " + next + " 的說法喔。"
      ],
      mountain: [
        "老松耳朵尖，" + sus + " 剛才那句話頭有點漂喔，後面大家幫忙盯著點。",
        "暫時先給 " + sus + " 畫條警戒線，等 " + next + " 講完再定奪。"
      ],
      astro: [
        "等一下，" + sus + " 剛剛那句是不是怪怪的？我先存疑看後面怎麼說！",
        "好奇怪，聽 " + sus + " 總覺得有話沒講清，後面 " + next + " 幫聽一下啦。"
      ],
      press: [
        "先記一筆問號給 " + sus + "：剛剛關鍵問題沒正面回，看後位怎麼對。",
        "我這邊暫對 " + sus + " 存疑，待 " + next + " 補完這輪邏輯再下定論。"
      ],
      poetic: [
        sus + " 剛才那一手茶稍嫌急促，我且留半格觀察，先聽 " + next + "。",
        "話中有幾分保留，我先把疑問記在 " + sus + " 這席。"
      ],
      sport: [
        "慢著，" + sus + " 剛剛這球打太虛了吧？先畫一格問號再看後排怎麼接。",
        "我先把視線鎖在 " + sus + " 身上，等後面補位完就準備抓！"
      ],
      classical: [
        sus + " 言辭間頗多留白，是非未明之前，先記一席察看。",
        "疑點暫留在 " + sus + "，且待 " + next + " 發言後再作定奪。"
      ],
      guzheng: [
        "聽著 " + sus + " 總覺得尾音有些猶疑，我先輕記一筆觀察吧。",
        "晴嵐暫不急著歸票，只對 " + sus + " 留一分留意，先聽 " + next + "。"
      ],
      debate: [
        sus + " 剛才沒回應核心爭點，先列待查，後面看有沒有人幫補證據。",
        "目前就 " + sus + " 邏輯最鬆散，我先質詢這一點，聽後續反應。"
      ],
      pastry: [
        "唔…柚子覺得 " + sus + " 剛才講得有點小怪耶，先聽 " + next + " 怎麼想。",
        "總覺得 " + sus + " 那段少了點什麼味道，先留個小問號好嗎。"
      ]
    };
    return pick(bankProbe[reg] || bankProbe.data);
  }

  // Default: "snipe" — crisp single-target vote stance
  const bankSnipe = {
    data: [
      "順了一遍還是 " + sus + " 前後兜不攏，這輪我投 " + sus + "。",
      "不多繞了，照刪去法看這票直接給 " + sus + "。"
    ],
    warm: [
      "不好意思啦，不過剛聽 " + sus + " 火氣有點大，暖暖這票投 " + sus + "。",
      "大家別生氣，但我這輪還是想先把票投給 " + sus + " 冷靜一下喔。"
    ],
    mountain: [
      "老松直話直說，" + sus + " 繞了半天最心虛，這輪直接投 " + sus + "！",
      "看風向看破了，就屬 " + sus + " 在閃，這票老松投這席。"
    ],
    astro: [
      "第六感直指 " + sus + "！剛剛語氣飄成這樣，這輪我投 " + sus + "！",
      "不用猶豫了吧，" + sus + " 一講話我警鈴大響，出他出他！"
    ],
    press: [
      "筆記對不上，只有 " + sus + " 在閃重點，這票我明確投 " + sus + "。",
      "事實擺在這，" + sus + " 說法漏洞最多，這輪先出 " + sus + "。"
    ],
    poetic: [
      "這杯茶我還是挑出 " + sus + "，詞鋒太虛，這票投這裡。",
      "點到為止，" + sus + " 破綻最顯，這輪先投 " + sus + "。"
    ],
    sport: [
      "直球打過去！最像在偷帶風向的就是 " + sus + "，這輪投他！",
      "我看清了啦，這波不投 " + sus + " 說不過去，先鎖這席！"
    ],
    classical: [
      "是非既明，進退失據莫過 " + sus + "，這輪我投此席。",
      "權衡之後，疑點全集在 " + sus + " 身上，請這席先離。"
    ],
    guzheng: [
      "聽話聽音，" + sus + " 這段雜音實在太重，晴嵐這輪先指 " + sus + "。",
      "多說無益，" + sus + " 的說法前後不太連貫，我先投這席。"
    ],
    debate: [
      "爭點全卡在 " + sus + " 身上，證據站不住腳，這輪我投 " + sus + "。",
      "質詢不到實證就先請離，" + sus + " 這票跑不掉。"
    ],
    pastry: [
      "等一下喔，" + sus + " 前後態度轉得超明顯，這輪我先投 " + sus + "。",
      "柚子左想右想還是覺得 " + sus + " 最會閃躲，這票投 " + sus + "！"
    ]
  };
  return pick(bankSnipe[reg] || bankSnipe.data);
}

// ==================== ZERO-LEAK COGNITIVE LOGIC MODIFIERS ====================
// Strictly reads ONLY persona profile + BlindMatchSnapshot public/self fields!

function getPersonaSuspicionModifiers(listener) {
  const p = getPersonaProfile(listener);
  return {
    credulity: p.credulity,
    grudgeBonus: Math.round(7 * p.grudgeMemory),
    toxicScale: p.harmonySensitivity,
    skepticalSlipBonus: p.credulity <= 0.62 ? Math.round(14 * (1.2 - p.credulity)) : 0
  };
}

function getPersonaGodHideChance(speaker) {
  return getPersonaProfile(speaker).godHideBias;
}

function getPersonaWolfCounterChance(speaker, claimedRole) {
  const p = getPersonaProfile(speaker);
  const base = claimedRole === "seer" ? 0.68 : (claimedRole === "witch" ? 0.36 : 0.28);
  return clamp(base * (0.55 + p.bluffBoldness * 0.72), 0.14, 0.94);
}

function getPersonaToxicSlipScale(speaker) {
  const p = getPersonaProfile(speaker);
  // Calm classical/data minds slip less; hot-blooded/astro minds slip slightly more when bluffing
  const calmFactor = 1.35 - p.harmonySensitivity * 0.18 + (p.bluffBoldness - 0.5) * 0.32;
  return clamp(calmFactor, 0.58, 1.38);
}

function getPersonaVotePersonalityDelta(voter, candidate, opts) {
  if (!voter || !candidate || candidate.id == null) return 0;
  const o = opts || {};
  const p = getPersonaProfile(voter);
  const vName = voter && voter.name ? voter.name : "";
  const cName = candidate && candidate.name ? candidate.name : "";
  let delta = 0;
  // 1. Grudge memory: if candidate publicly accused/pitted voter earlier today, high-grudge personas counter-push harder!
  const dayEvs = Array.isArray(o.daySpeechEvents) ? o.daySpeechEvents : [];
  const attackedMe = dayEvs.some(function (ev) {
    if (!ev || ev.speakerId !== candidate.id) return false;
    return ev.accuseId === voter.id || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(voter.id) !== -1);
  });
  if (attackedMe) {
    delta += Math.round(6 * p.grudgeMemory);
  }
  // 2. Bandwagon vs Contrarian weight: strictly derived from public table accusations today!
  const publicHeat = dayEvs.reduce(function (acc, ev) {
    if (!ev || ev.speakerId === voter.id) return acc;
    if (ev.accuseId === candidate.id) return acc + 1;
    return acc;
  }, 0);
  if (publicHeat > 0) {
    delta += Math.round(publicHeat * 4.5 * p.bandwagonBias);
  }
  // 3. Harmony sensitivity: public toxic slip today weighs heavier on harmony-sensitive personas
  const emittedToxicToday = dayEvs.some(function (ev) {
    return ev && ev.speakerId === candidate.id && ev.hasToxicSlip;
  });
  if (emittedToxicToday) {
    delta += Math.round(7 * p.harmonySensitivity);
  }

  // 4. v17.0 Signature Good-Team Decision Habits (100% ZERO-LEAK: strictly public speech/vote/claim signals!)
  const snap = o.snap || null;
  const dayNow = snap ? (snap.day || 1) : (typeof o.day === "number" ? o.day : 1);
  const isPk = Boolean(o.isPk || (snap && snap.pkActive));
  const sheriffId = o.sheriffSeatId !== undefined ? o.sheriffSeatId : (snap && !snap.sheriffElectionPending ? snap.sheriffSeatId : null);
  const vmDiv = (o.divergenceBySeat && o.divergenceBySeat[candidate.id]) || 0;
  const flipIds = Array.isArray(o.flipIds) ? o.flipIds : [];
  const hasFlip = flipIds.indexOf(candidate.id) !== -1;
  const hasPublicContra = dayEvs.some(function (ev) { return ev && ev.speakerId === candidate.id && ev.contradiction; });
  const candSpokeLen = dayEvs.reduce(function (mx, ev) {
    return (ev && ev.speakerId === candidate.id && ev.rawText) ? Math.max(mx, ev.rawText.length) : mx;
  }, 0);

  if (vName === "小澄" && vmDiv >= 1) {
    // 票行潔癖：嘴上踩 A 卻投 B，隔天必定死咬不放！
    delta += 22;
  } else if (vName === "小雲" && hasFlip) {
    // 抓跨日反水：昨天保人今天改口
    delta += 18;
  } else if (vName === "阿朗" && candidate.claimedRole && dayNow <= 2) {
    // 逢跳必詰：誰跳神職先挑毛病壓力測試
    delta += 14;
  } else if (vName === "暖暖") {
    // 首輪不跟風投資訊少的邊緣位；PK 優先保無酸言誠懇方
    if (dayNow === 1 && !emittedToxicToday && publicHeat <= 1 && !hasPublicContra) delta -= 8;
    if (isPk && !emittedToxicToday) delta -= 10;
  } else if (vName === "阿松") {
    // 算輪次守神職：優先護住無明顯矛盾的神職宣稱席
    if (candidate.claimedRole && ["seer", "witch", "guard", "hunter"].indexOf(candidate.claimedRole) !== -1 && !hasPublicContra && !emittedToxicToday) {
      delta -= 14;
    }
  } else if (vName === "墨白") {
    // 重警徽承諾：警長若言票背離／出矛盾重扣，穩定履約則加信
    if (sheriffId && candidate.id === sheriffId) {
      delta += (vmDiv >= 1 || hasPublicContra) ? 16 : -8;
    }
  } else if (vName === "晴嵐") {
    // 抓語速與心虛：公開緊張／急躁破綻加倍敏感
    if (candidate.sweatExposed || emittedToxicToday) delta += 16;
  } else if (vName === "柚子") {
    // 易信發言長且有條理的警長
    if (sheriffId && candidate.id === sheriffId && candSpokeLen >= 40 && !emittedToxicToday) delta -= 14;
  } else if (vName === "晨晨") {
    // 認準站邊就死忠衝票；遭反咬或言票背離則暴怒反打
    if (voter.publicVouchId === candidate.id && candidate.claimedRole === "seer" && !hasFlip) delta -= 14;
    if (attackedMe || (voter.publicVouchId === candidate.id && hasFlip)) delta += 16;
  } else if (vName === "阿竹") {
    // 雙預言家對跳首日傾向留雙邊、先查外置位
    if (dayNow === 1 && (o.seerClaimCount || 0) >= 2 && candidate.claimedRole === "seer") delta -= 9;
  }

  // 5. v17.0 Club Acquaintance Modifiers (100% ZERO-LEAK: strictly public observable anomalies & persona names!)
  const clubRel = getClubAcquaintanceRelation(vName, cName);
  if (clubRel) {
    if (clubRel.groupKey === "academy_arts") {
      // 雅集同門組（墨白×晴嵐×阿竹）：熟悉彼此氣息，公開露出破綻／矛盾／高熱度時額外放大 15% 警覺！
      const observableTell = Boolean(emittedToxicToday || hasPublicContra || vmDiv >= 1 || hasFlip || candidate.sweatExposed || publicHeat >= 2);
      if (observableTell) {
        delta += Math.max(6, Math.round(Math.max(20, delta) * 0.15));
      }
    } else if (clubRel.groupKey === "mountain_circle") {
      // 山城互挺組：阿松與晨晨天生照應學妹暖暖與柚子（公開無破綻時微幅初始信任加權）
      const isSenior = (vName === "阿松" || vName === "晨晨");
      const isJunior = (cName === "暖暖" || cName === "柚子");
      if (isSenior && isJunior && !emittedToxicToday && !hasPublicContra && !hasFlip) {
        delta -= 7;
      }
    }
  }
  return delta;
}

function buildPersonaClubAndHabitInsert(speaker, ctx, targetSeat, mode) {
  if (!speaker || !ctx) return "";
  const spName = speaker.name || "";
  const tgtName = targetSeat && targetSeat.name ? targetSeat.name : "";
  const spokenOthers = Array.isArray(ctx.spokenOthers) ? ctx.spokenOthers : [];
  const aliveOthers = Array.isArray(ctx.aliveOthers) ? ctx.aliveOthers : [];
  const day = ctx.day || 1;

  // 1. 雅集同門組（墨白×晴嵐×阿竹）：公開對同門起疑時的熟人台詞（100% 公開可觀測觸發）
  if (targetSeat && mode === "suspect") {
    const rel = getClubAcquaintanceRelation(spName, tgtName);
    if (rel && rel.groupKey === "academy_arts") {
      if (spName === "墨白") return "同在書院雅集認識你這麼久，你今天落墨行文的氣口不太對，";
      if (spName === "晴嵐") return "平日一起在茶室練琴泡茶，我聽得出來你今天語氣明顯偏緊了，";
      if (spName === "阿竹") return "老朋友了，你今天泡茶說話的手勢跟平常不太一樣喔，";
    }
  }

  // 2. 論辯交鋒組（小澄×阿朗×小雲）：同桌鬥嘴與交叉查核火花
  if (spName === "阿朗") {
    const xiaochengSpoke = spokenOthers.find(function (s) { return s.name === "小澄"; });
    if (xiaochengSpoke && day <= 2) {
      return "先跟小澄抬個槓，只看票型不看人最容易被深水倒鉤騙過去；";
    }
  } else if (spName === "小雲") {
    const hasCheng = spokenOthers.some(function (s) { return s.name === "小澄"; });
    const hasLang = spokenOthers.some(function (s) { return s.name === "阿朗"; });
    if (hasCheng && hasLang) {
      return "我剛把小澄跟阿朗這兩邊的說法攤在筆記本上對了一輪，";
    }
  } else if (spName === "阿松" && mode !== "wolf" && day <= 2) {
    // 阿松招牌習慣：算剩餘容錯輪次守神職
    const aliveCnt = aliveOthers.length + 1;
    const roundsLeft = Math.max(1, Math.floor((aliveCnt - 2) / 2));
    return "老松先算一下盤面，咱們大概還有 " + roundsLeft + " 輪容錯，關鍵神職得先穩住；";
  }

  // 3. 山城互挺組（晨晨自身抽到狼被迫踩柚子／暖暖時觸發語氣卡頓破綻——僅讀自身 role，100% 零作弊！）
  if (spName === "晨晨" && speaker.role === "wolf" && (tgtName === "柚子" || tgtName === "暖暖")) {
    return "欸…等等，平常練完球最挺你了，這輪實在有點不好意思，但…";
  }
  return "";
}

// ==================== 11-REGISTER RICH SPEECH ENGINE ====================

const PERSONA_THINKING_CUES = Object.freeze({
  "小澄": "指尖輕點桌面，正在把剛才的發言順序理成一條時間線…",
  "暖暖": "雙手捧起暖茶杯，溫柔地回想剛才每位夥伴的語氣…",
  "阿松": "雙手抱胸微微頷首，像在山頂望雲海般看穿席間風向…",
  "星兒": "眨眼望著燈火，正捕捉席間幾位夥伴的微妙氣場…",
  "小雲": "迅速翻閱查核筆記本，比對前幾位發言的時間差…",
  "阿竹": "輕搖茶盞聞香片刻，細細推敲方才幾句弦外之音…",
  "晨晨": "握拳摩掌躍躍欲試，已經盯準這輪要追問的破綻…",
  "墨白": "垂眸靜息凝神，心中暗擬一紙冷峻判詞…",
  "晴嵐": "指尖輕拂案沿似撥古箏，靜聆前席餘韻辨其清濁…",
  "阿朗": "整理手邊辯論提綱，準備展開凌厲的交叉質詢…",
  "柚子": "托腮看著茶桌，回想誰剛剛話講一半突然縮回去…"
});

const PERSONA_LOBBY_GREETINGS = Object.freeze({
  "小澄": [
    "早安，筆記本都攤開了。開局後我們一起對齊時間線抓酸民狼。",
    "開桌前先講好，這局照票型跟證據投，酸民狼藏不住的。"
  ],
  "暖暖": [
    "嗨呀，快坐下喝杯熱茶～這局我們說好話、和和氣氣抓出酸民狼好不好？",
    "茶席的桂花茶剛沏好喔，開局後別緊張，暖暖會幫大家暖場的。"
  ],
  "阿松": [
    "哈哈，來坐來坐，老松剛從青嵐觀景台下來，眼神還亮得很，等等一起抓狼。",
    "山風吹得正舒服，按「入席開局」上桌喝茶，看老松一眼識破假風向。"
  ],
  "星兒": [
    "欸，我剛剛翻星盤說我們今天特別有默契耶，快開局試試手氣吧。",
    "第六感已經暖機好了，等下誰心虛亂帶風向我一定第一個聽出來。"
  ],
  "小雲": [
    "你好，查核筆記已經翻開第一頁了。這局誰敢散播假風向我直接點名。",
    "開局前記得留心每個人前後有沒有自相矛盾，細節不會說謊。"
  ],
  "阿竹": [
    "幸會呀，茶剛泡好、山風剛好，開局後咱們邊品茶邊辨真偽。",
    "茶都還沒涼呢，選好席次就上桌聊聊吧，清者自清、破綻藏不住的。"
  ],
  "晨晨": [
    "走吧夥伴，熱身完畢就差開局了，這場我們穩穩守住好人防線！",
    "氣勢到位，等等跟著一起看票型抓破綻，把酸民狼送下場。"
  ],
  "墨白": [
    "幸會。茶席快開了，等會仔細對照每個人的言行，真假自然分明。",
    "既然坐進書院茶席，就以理辨是非。開局吧，我先靜觀其變。"
  ],
  "晴嵐": [
    "同窗安好，古箏剛收好、清茶微暖，願今天席間和氣清朗，一起辨明真偽。",
    "歡迎入席，開局後不妨細聽每個人的弦外之音，破綻自然會浮出來。"
  ],
  "阿朗": [
    "歡迎來到青嵐辯論茶席，準備好一起用交叉質詢拆穿漏洞了嗎？",
    "正反雙方就位，開局後這場邏輯攻防肯定精彩。"
  ],
  "柚子": [
    "大家好呀，柚子已經坐好準備聽各位拆邏輯囉，快開局一起抓狼吧。",
    "好期待這局喔，等等看誰講話態度前後不一致，絕對躲不掉。"
  ]
});

function getPersonaThinkingCue(speaker, day) {
  const nm = speaker && speaker.name ? speaker.name : "";
  if (PERSONA_THINKING_CUES[nm]) return PERSONA_THINKING_CUES[nm];
  const fallback = [
    "輕抿一口茶，整理剛才的發言脈絡…",
    "翻看手邊筆記，思索場上邏輯破綻…",
    "沉吟片刻，準備接過話頭表態…"
  ];
  return fallback[((speaker ? speaker.id : 1) + (day || 1)) % fallback.length];
}

function getPersonaLobbyGreeting(personaName, seatId) {
  const list = PERSONA_LOBBY_GREETINGS[personaName];
  if (Array.isArray(list) && list.length > 0) {
    return list[(seatId + Math.floor(Math.random() * list.length)) % list.length];
  }
  return "嗨！選好角色就按「開始對局」，我在圓桌等你一起抓酸民狼！";
}

function formatUnspokenNoteByPersona(speaker, unspokenOthers, seatLabelFn) {
  if (!Array.isArray(unspokenOthers) || unspokenOthers.length === 0) return "";
  const reg = getPersonaRegister(speaker);
  const firstLbl = seatLabelFn(unspokenOthers[0]);
  const more = unspokenOthers.length > 1;
  if (reg === "classical") {
    return "後席 " + firstLbl + (more ? " 幾位" : "") + "還沒開口，等聽完再做定奪。";
  }
  if (reg === "guzheng") {
    return "後席 " + firstLbl + (more ? " 幾位同學" : "") + "還沒發言，等聽聽他們的語氣再說。";
  }
  if (reg === "poetic") {
    return "後置位 " + firstLbl + (more ? " 幾位" : "") + "還沒開口，先留半盞茶聽聽後面怎麼講。";
  }
  if (reg === "data") {
    return "後置位 " + firstLbl + (more ? " 幾位" : "") + "還沒發言，等他們講完再補齊狼坑。";
  }
  if (reg === "debate") {
    return "後置位 " + firstLbl + (more ? " 等辯友" : "") + "尚未申論，暫保留質詢空間。";
  }
  if (reg === "astro") {
    return "後置位 " + firstLbl + (more ? " 他們" : "") + "氣場還沒解鎖耶，等聽完再掃描星盤！";
  }
  if (reg === "pastry") {
    return "後置位 " + firstLbl + (more ? " 幾位" : "") + "還沒輪到發言呢，先聽後面怎麼表態！";
  }
  if (reg === "sport") {
    return "後置位 " + firstLbl + (more ? " 他們" : "") + "還沒上場開打，先等他們表水接球！";
  }
  if (reg === "mountain") {
    return "後面 " + firstLbl + (more ? " 幾位" : "") + "還沒開口，老松先留條山路聽他們怎麼講。";
  }
  if (reg === "press") {
    return "後置位 " + firstLbl + (more ? " 等人" : "") + "尚無發言紀錄，待會逐字補查。";
  }
  if (reg === "warm") {
    return "後面的 " + firstLbl + (more ? " 夥伴們" : "") + "還沒說話呢，先給大家泡杯茶慢慢聽喔～";
  }
  return "後置位 " + firstLbl + (more ? " 等人" : "") + "今天還沒發言，先聽表水再補齊。";
}

function buildPersonaDualSeerText(speaker, data) {
  const reg = getPersonaRegister(speaker);
  const {
    leadPrefix, sALbl, sBLbl, aSecondStr, bSecondStr, aConflict, bConflict,
    trustedLbl, fakeLbl, goodSideText, unspokenNote, signoffPhrase
  } = data;

  if (reg === "classical") {
    return leadPrefix +
      "如果站 " + sALbl + "，那 " + sBLbl + " 必佔狼位" + aSecondStr + aConflict + "；" +
      "若改站 " + sBLbl + "，則 " + sALbl + " 反成假牌" + bSecondStr + bConflict + "。" +
      "權衡再三，我站邊 " + trustedLbl + "，" + goodSideText +
      "這輪先出 " + fakeLbl + "。" + unspokenNote + signoffPhrase;
  }
  if (reg === "guzheng") {
    return leadPrefix +
      "如果站 " + sALbl + " 這邊，那 " + sBLbl + " 語氣微躁明顯落在狼坑" + aSecondStr + aConflict + "；" +
      "如果改站 " + sBLbl + "，就換 " + sALbl + " 變成走音的假牌" + bSecondStr + bConflict + "。" +
      "細聽兩邊清濁後，晴嵐站邊 " + trustedLbl + "，" + goodSideText +
      "這輪先請 " + fakeLbl + " 離席歇心。" + unspokenNote + signoffPhrase;
  }
  if (reg === "poetic") {
    const outerNote = (data.day === 1)
      ? "不過首輪雙預言家不妨先留著看今晚倒牌驗證，外置位也要一併細查；"
      : "";
    return leadPrefix +
      "如果站 " + sALbl + "，這局 " + sBLbl + " 必佔一狼" + aSecondStr + aConflict + "；" +
      "要是改站 " + sBLbl + "，就換 " + sALbl + " 落進狼坑" + bSecondStr + bConflict + "。" +
      outerNote + "一盞茶間其實高下已判，我站邊 " + trustedLbl + "，" + goodSideText +
      "這輪先請 " + fakeLbl + " 退席品茶。" + unspokenNote + signoffPhrase;
  }
  if (reg === "data") {
    return leadPrefix +
      "分兩邊順一下喔，如果站 " + sALbl + "，那 " + sBLbl + " 一定是一隻狼" + aSecondStr + aConflict + "，" +
      "如果改站 " + sBLbl + "，就換成 " + sALbl + " 是狼" + bSecondStr + bConflict + "。" +
      "我剛把兩邊講的話對完，我覺得 " + trustedLbl + " 比較合理先站他這邊，" + goodSideText +
      "這輪我們先投 " + fakeLbl + " 喔。" + unspokenNote + signoffPhrase;
  }
  if (reg === "debate") {
    return leadPrefix +
      "直接比對兩邊證據喔，站 " + sALbl + " 的話狼坑就在 " + sBLbl + aSecondStr + aConflict + "，" +
      "反過來站 " + sBLbl + " 的話狼坑就變成 " + sALbl + bSecondStr + bConflict + "。" +
      "看下來誰的立論比較穩很明顯吧，我站邊 " + trustedLbl + "，" + goodSideText +
      "這輪建議大家集中先出 " + fakeLbl + "。" + unspokenNote + signoffPhrase;
  }
  if (reg === "astro") {
    return leadPrefix +
      "我們兩邊對一下喔，如果站 " + sALbl + " 的話那 " + sBLbl + " 就一定在狼坑裡" + aSecondStr + aConflict + "，" +
      "如果改站 " + sBLbl + " 就變成 " + sALbl + " 在演戲" + bSecondStr + bConflict + "。" +
      "老實說我直覺比較相信 " + trustedLbl + " 耶，" + goodSideText +
      "這輪我們先把假跳的 " + fakeLbl + " 投出去吧！" + unspokenNote + signoffPhrase;
  }
  if (reg === "sport") {
    return leadPrefix +
      "兩邊攤開來看很清楚啊，站 " + sALbl + " 那 " + sBLbl + " 絕對是對面狼坑" + aSecondStr + aConflict + "，" +
      "換站 " + sBLbl + " 就變 " + sALbl + " 假跳穿幫" + bSecondStr + bConflict + "。" +
      "這波我聽下來直接站邊 " + trustedLbl + " 啦，" + goodSideText +
      "大家票集中先把 " + fakeLbl + " 送出去！" + unspokenNote + signoffPhrase;
  }
  if (reg === "mountain") {
    return leadPrefix +
      "這兩條路算一下就懂啦，站 " + sALbl + "，那 " + sBLbl + " 肯定藏狼坑" + aSecondStr + aConflict + "，" +
      "改站 " + sBLbl + "，那 " + sALbl + " 就是冒牌貨" + bSecondStr + bConflict + "。" +
      "老松聽下來覺得站 " + trustedLbl + " 這邊比較穩啦，" + goodSideText +
      "這輪直接請 " + fakeLbl + " 去旁邊吹風冷靜！" + unspokenNote + signoffPhrase;
  }
  if (reg === "press") {
    return leadPrefix +
      "我把兩邊細節對了一下喔，站 " + sALbl + " 的話狼坑落在 " + sBLbl + aSecondStr + aConflict + "，" +
      "站 " + sBLbl + " 的話狼坑就反過來是 " + sALbl + bSecondStr + bConflict + "。" +
      "比對完前後說詞我比較信 " + trustedLbl + "，" + goodSideText +
      "這輪我會先投 " + fakeLbl + "。" + unspokenNote + signoffPhrase;
  }
  if (reg === "pastry") {
    return leadPrefix +
      "兩邊擺在一起看喔，如果站 " + sALbl + " 的話那 " + sBLbl + " 就在狼坑裡" + aSecondStr + aConflict + "，" +
      "如果改站 " + sBLbl + "，那 " + sALbl + " 才是假跳的壞人" + bSecondStr + bConflict + "。" +
      "柚子聽下來覺得 " + trustedLbl + " 講話比較實在先站他這邊，" + goodSideText +
      "這輪大家一起投 " + fakeLbl + " 吧！" + unspokenNote + signoffPhrase;
  }
  if (reg === "warm") {
    return leadPrefix +
      "我們泡杯茶慢慢對照喔：如果站 " + sALbl + "，那 " + sBLbl + " 就在狼坑裡" + aSecondStr + aConflict + "；" +
      "如果改站 " + sBLbl + "，那 " + sALbl + " 反而是冒牌狼" + bSecondStr + bConflict + "。" +
      "暖暖聽下來比較安心站邊 " + trustedLbl + "，" + goodSideText +
      "這輪只好先請 " + fakeLbl + " 去旁邊喝茶冷靜囉～" + unspokenNote + signoffPhrase;
  }
  return leadPrefix +
    "如果站 " + sALbl + "，" + sBLbl + " 必佔一狼" + aSecondStr + aConflict + "；" +
    "如果改站 " + sBLbl + "，" + sALbl + " 必一狼" + bSecondStr + bConflict + "。" +
    "兩邊盤完我站邊 " + trustedLbl + "，" + goodSideText +
    "這輪先把 " + fakeLbl + " 請離！" + unspokenNote + signoffPhrase;
}

function buildPersonaPitRebutText(speaker, mode, d) {
  const reg = getPersonaRegister(speaker);
  const { rebutLead, accName, pitNamesStr, allyLbl, realSusLbl, standLbl, rivalLbl, fakeALbl, fakeBLbl, unspokenTail, signoff, secondLbl } = d;

  // CRITICAL INVARIANT: every pit rebuttal preserves "點進狼坑" for clarity & test verification!
  if (mode === "hunter") {
    if (reg === "classical") {
      return rebutLead + "剛才 " + accName + " 貿然把我點進狼坑，恐怕是撞上鐵壁了。我正是直心糾察長，若被誤投離席，臨走必啟共鳴帶走 " + accName + "。目前狼坑首察 " + accName + (secondLbl ? (" 與 " + secondLbl) : "") + "。" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "剛才 " + accName + " 把晴嵐點進狼坑，實在聽錯音了。我其實是直心糾察長，要是這輪被誤送離席，我一定開共鳴帶走 " + accName + "。目前疑點首在 " + accName + (secondLbl ? (" 跟 " + secondLbl) : "") + "。" + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "哎呀，" + accName + " 把我點進狼坑可是看走眼了。我直接亮明直心糾察長，要是誤推我出局一定共鳴帶走 " + accName + "。眼前狼坑該查 " + accName + (secondLbl ? (" 跟 " + secondLbl) : "") + "。" + signoff;
    }
    if (reg === "debate") {
      return rebutLead + "我方正式異議！對方辯友 " + accName + " 把我點進狼坑直接撞上鐵證——我就是直心糾察長！投我出局我就開共鳴帶走 " + accName + "，這輪狼坑鎖定 " + accName + (secondLbl ? (" 與 " + secondLbl) : "") + "，" + signoff;
    }
    if (reg === "sport") {
      return rebutLead + "哈哈 " + accName + " 把我點進狼坑直接撞上籃板啦！我攤牌我是直心糾察長，敢推我出去我就絕殺共鳴帶走 " + accName + "！這波狼坑鎖死 " + accName + (secondLbl ? (" 跟 " + secondLbl) : "") + "，" + signoff;
    }
    return rebutLead + "前置位 " + accName + " 剛才把我點進狼坑真是踩進鐵板了！我先亮明直心糾察長把自己摘出狼坑：如果有人硬推我離席，我一定直接共鳴帶走 " + accName + "！目前我看狼坑至少要檢視 " + accName + (secondLbl ? (" 跟 " + secondLbl) : "") + "，" + signoff;
  }

  if (mode === "calm") {
    if (reg === "classical") {
      return rebutLead + "剛才 " + accName + " 把我點進狼坑，但我自知清白，切忌內耗抗推。" +
        (allyLbl ? (allyLbl + " 言辭沉穩可先列好人席，") : "") +
        (realSusLbl ? ("真正該深究的狼坑反而是 " + realSusLbl + "。") : "先聽後席發言再做定奪。") + unspokenTail + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "先溫和回應剛才 " + accName + " 把我點進狼坑這件事：我是清白好人，大家別因一時誤會互相傷了和氣。" +
        (allyLbl ? (allyLbl + " 語氣溫潤像好人，") : "") +
        (realSusLbl ? ("真正讓人起疑的反而在 " + realSusLbl + "。") : "等聽完後位幾位同學再一起定奪。") + unspokenTail + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "先答覆剛才 " + accName + " 把我點進狼坑：清者自清，茶席好人可別自相誤傷。" +
        (allyLbl ? (allyLbl + " 語氣端正先放好人席，") : "") +
        (realSusLbl ? ("真正該細查的狼坑倒是 " + realSusLbl + "。") : "等聽完後位表水再論。") + unspokenTail + signoff;
    }
    return rebutLead + "先正面回應前置位 " + accName + " 把我點進狼坑：我自己知道我的底牌，我絕對不在狼坑裡，別因為誤解互相抗推！" +
      (allyLbl ? (allyLbl + " 比較像好人坑，") : "") +
      (realSusLbl ? ("真正該盯的狼坑反而是 " + realSusLbl + "。") : "大家聽完後置位表水再對齊狼坑。") + unspokenTail + signoff;
  }

  if (mode === "dual") {
    if (reg === "classical") {
      return rebutLead + "剛才 " + accName + " 硬把我點進狼坑，我必須正面拆解。正好剖析雙觀察員之局：站 " + standLbl + " 狼坑是 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才變 " + fakeBLbl + "。你硬塞我入坑反倒像替假牌掩護，我站邊 " + standLbl + "，反把 " + accName + " 列入狼坑。" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "剛才 " + accName + " 把晴嵐點進狼坑，我一定要說清楚。剛好把兩位觀察員理一遍：站 " + standLbl + " 狼坑落在 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才轉到 " + fakeBLbl + "。我站邊 " + standLbl + "，反觀 " + accName + " 急著塞人進坑實在讓人不安心。" + signoff;
    }
    if (reg === "debate") {
      return rebutLead + "反對！" + accName + " 把我點進狼坑完全邏輯崩壞！雙觀察員結構攤開看：站 " + standLbl + " 狼坑是 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才變 " + fakeBLbl + "！你硬擠我進坑根本像幫假牌墊腳，我站邊 " + standLbl + "，反打 " + accName + " 進狼坑！" + signoff;
    }
    return rebutLead + "前置位 " + accName + " 剛才把我點進狼坑，這我必須接招！我百分之百不在狼坑裡，剛好把雙觀察員盤清楚：站 " + standLbl + " 狼坑是 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才變成 " + fakeBLbl + "！你硬把我擠進狼坑反而像幫假牌墊坑，我先站邊 " + standLbl + "，反把 " + accName + " 打進狼坑！" + signoff;
  }

  if (mode === "wolf") {
    if (reg === "classical") {
      return rebutLead + "剛才 " + accName + " 毫無憑據就把我點進狼坑，未免過於草率。刻意拿我當替罪羊嗎？依我看擾亂視聽的狼坑首推 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，這輪我反指 " + accName + "。" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "剛才 " + accName + " 沒細聽就把晴嵐點進狼坑，語氣實在急了些。真正急於帶偏風向的正是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，我這輪只好反點 " + accName + "。" + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "慢著，剛才 " + accName + " 輕率把我點進狼坑，這不是借刀殺人嗎？細想下來最像渾水摸魚的反而是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，這輪反投 " + accName + "。" + signoff;
    }
    if (reg === "warm") {
      return rebutLead + "嗚怎麼可以這樣～剛才 " + accName + " 沒問清楚就把暖暖點進狼坑好讓人傷心喔！這樣急著找替罪羊反而超像酸民狼耶，我看最可疑的就是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，暖暖這輪只好反點 " + accName + " 囉！" + signoff;
    }
    if (reg === "debate") {
      return rebutLead + "異議！對方辯友 " + accName + " 毫無證據就把我點進狼坑，這是標準的惡意栽贓！我方反控狼坑核心就是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，這輪反點 " + accName + "！" + signoff;
    }
    return rebutLead + "前置位 " + accName + " 剛才把我點進狼坑實在太草率了吧？我被 " + accName + " 硬塞進狼坑當替罪羊！依我看想混淆視聽的狼坑就是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，這輪我先反點 " + accName + "！" + signoff;
  }

  // Default good rebuttal
  if (reg === "classical") {
    return rebutLead + "剛才 " + accName + " 急著把我點進狼坑，這點我難以苟同。我始終循理分析，何來破綻？反觀 " + accName + " 欠缺實據卻急於生波；若論坑位，" +
      (allyLbl ? (allyLbl + " 先放好人席，") : "") + "我懷疑的狼坑是 " + pitNamesStr + "。" + unspokenTail + signoff;
  }
  if (reg === "guzheng") {
    return rebutLead + "剛才 " + accName + " 把晴嵐點進狼坑，這誤會得先澄清：我一路都在安靜聽線索，絕不是狼。反倒是 " + accName + " 語氣微躁急著扣帽子；依我看，" +
      (allyLbl ? (allyLbl + " 語氣清正先放好人席，") : "") + "真正可疑的狼坑是 " + pitNamesStr + "。" + unspokenTail + signoff;
  }
  if (reg === "poetic") {
    return rebutLead + "剛才 " + accName + " 把我點進狼坑，這杯苦茶我可不接。我一路照邏輯慢慢品，反倒是 " + accName + " 捕風捉影急著貼標籤；真要畫坑，" +
      (allyLbl ? (allyLbl + " 先歸好人席，") : "") + "阿竹點出的狼坑是 " + pitNamesStr + "。" + unspokenTail + signoff;
  }
  if (reg === "data") {
    return rebutLead + "前置位 " + accName + " 把我點進狼坑根本站不住腳，我前面立場跟發言前後一致，哪來的破綻？反倒是 " + accName + " 沒拿出證據就急著拉仇恨；重新理過一輪，" +
      (allyLbl ? (allyLbl + " 先放好人坑，") : "") + "真正該盯的狼坑是 " + pitNamesStr + "。" + unspokenTail + signoff;
  }
  if (reg === "debate") {
    return rebutLead + "我方嚴正抗議！對方辯友 " + accName + " 在零證據下把我點進狼坑，已徹底喪失客觀立場！" +
      (allyLbl ? (allyLbl + " 論點紮實先放好人坑，") : "") + "本方反訴鎖定狼坑為 " + pitNamesStr + "！" + unspokenTail + signoff;
  }
  if (reg === "astro") {
    return rebutLead + "蛤？！" + accName + " 把我點進狼坑是不是星盤看反了啦！星兒可是純淨滿分的好夥伴耶，亂潑髒水的 " + accName + " 才讓我的雷達狂叫！" +
      (allyLbl ? (allyLbl + " 氣場超暖先放好人坑，") : "") + "真正黑霧滿滿的狼坑是 " + pitNamesStr + "！" + unspokenTail + signoff;
  }
  if (reg === "sport") {
    return rebutLead + "喂不是吧！" + accName + " 把我點進狼坑這球犯規吹太歪了吧！我堂堂熱血好人絕不在狼坑裡！" +
      (allyLbl ? (allyLbl + " 絕對是可靠隊友放好人坑，") : "") + "真正該被抄截的狼坑是 " + pitNamesStr + "！" + unspokenTail + signoff;
  }
  if (reg === "pastry") {
    return rebutLead + "等一下喔，" + accName + " 前面都沒點我怎麼突然把我點進狼坑啦！我從頭到尾立場都沒縮過耶，" +
      (allyLbl ? (allyLbl + " 講得比你好太多先放好人坑，") : "") + "態度轉最快又亂扣帽子的 " + pitNamesStr + " 才是可疑狼坑！" + unspokenTail + signoff;
  }
  return rebutLead + "前置位 " + accName + " 剛才把我點進狼坑，這裡我一定要講清楚：我全程理性找線索，根本不在狼坑裡！反而是 " + accName + " 沒實錘就急著把我劃進狼坑帶風向；若要我點坑，" +
    (allyLbl ? (allyLbl + " 先放好人坑，") : "") + "我懷疑的狼坑是 " + pitNamesStr + "！" + unspokenTail + signoff;
}

function buildPersonaPkText(speaker, roleKind, d) {
  const reg = getPersonaRegister(speaker);
  const { rebutLead, rName, extraProof, signoff } = d;
  if (reg === "classical") {
    if (roleKind === "seer") return rebutLead + "走到平票決選，我不得不亮明心觀察員底牌。" + extraProof + "如果把我投出局全場就失去視野，請非平票的各位把票集中給 " + rName + "。" + signoff;
    if (roleKind === "witch") return rebutLead + "平票危局，我直接亮滴水奉茶師身分。" + extraProof + "切莫誤傷核心神職，請大家集中票投 " + rName + "。" + signoff;
    if (roleKind === "hunter") return rebutLead + "平票之際我明說直心糾察長底牌。誤投我的話，我離席必開共鳴帶走 " + rName + "，不如一起投 " + rName + " 定局。" + signoff;
    if (roleKind === "guard") return rebutLead + "既入平票，我亮出護心守衛身分。" + extraProof + "失盾之後神職就很危險，懇請大家集中投 " + rName + "。" + signoff;
    if (roleKind === "elder") return rebutLead + "我是清心長老。" + extraProof + "別把公投輪次浪費在我身上，請大家集中投 " + rName + "。" + signoff;
    return rebutLead + "既到平票決選，我再說一次：我始終循理分析、不興浮議；反觀 " + rName + " 立場游移破綻甚多，請各位明辨，把票集中給 " + rName + "。" + signoff;
  }
  if (reg === "guzheng") {
    if (roleKind === "seer" || roleKind === "witch" || roleKind === "guard" || roleKind === "hunter" || roleKind === "elder") {
      return rebutLead + "平票之際晴嵐只好亮明底牌讓大家安心：" + extraProof + "別傷到神職夥伴，請把這一票集中投給 " + rName + "。" + signoff;
    }
    return rebutLead + "平票拉票我就誠懇再說一句：一路下來我都盼茶席和氣清朗；相比之下 " + rName + " 語氣屢次走調，還請大家改投 " + rName + "。" + signoff;
  }
  if (reg === "poetic") {
    if (roleKind === "seer" || roleKind === "witch" || roleKind === "guard" || roleKind === "hunter" || roleKind === "elder") {
      return rebutLead + "平票當前我也不能再藏了：" + extraProof + "留得青山在才好抓狼，還請大家齊心投 " + rName + "。" + signoff;
    }
    return rebutLead + "平票就像品兩杯茶，清濁一喝便知。我這好人若被誤投太可惜，反觀 " + rName + " 破綻更深，請各位把票集中給 " + rName + "。" + signoff;
  }
  if (reg === "debate") {
    return rebutLead + "進入平票最終結辯！" + (extraProof || "") + "對比我與 " + rName + " 的論證完整度與立場一致性，高下立判！請全場非平票評審把決定性一票投給 " + rName + "！" + signoff;
  }
  if (reg === "sport") {
    return rebutLead + "平票延長賽關鍵時刻！" + (extraProof || "") + "兄弟們千萬別把主力隊友投下場，對比防守漏洞 " + rName + " 破綻大多了，這球全員集火投 " + rName + "！" + signoff;
  }
  return null; // Caller falls back to default template seamlessly
}

function buildPersonaLastWordsText(self, kind, d) {
  const reg = getPersonaRegister(self);
  const { isFirstNight, tLbl, isWolf, callouts, wolfTotal, day } = d || {};
  const seed = ((self && self.id ? self.id : 1) + (day || 1)) % 2;

  if (reg === "data") {
    if (kind === "seer") {
      return isFirstNight
        ? ("欸我茶都還沒喝一口就領便當喔？好吧攤牌，我是真明心觀察員，昨晚查了 " + tLbl + " 確定是" + (isWolf ? ("酸民狼，今天直接把 " + tLbl + " 送來陪我坐板凳吧！") : "清白好人，你們要是誤投他我在場邊真的會看傻喔。"))
        : ("行喔，你們這票直接把真明心觀察員投出場了！離席前交最後一份查驗：" + tLbl + " 是" + (isWolf ? ("酸民狼，明天再不出 " + tLbl + " 我就在旁邊啃瓜子看戲啦。") : "鐵好人，千萬別被帶偏！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("不是吧，連滴水奉茶師都被你們送離席喔？攤牌講清楚，前晚是我端暖心回甘茶救回 " + tLbl + "，他鐵好人啦，剩下我端著飲料看你們怎麼修補這個邏輯漏洞！")
        : "好喔，滴水奉茶師就這樣提早下班了，大家記得回頭對一下剛剛誰推我推得最起勁喔！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("幫大家守了一整晚還被請出場，護心守衛真的心累耶！留個關鍵座標：昨晚我守過 " + tLbl + "，奉茶師別再撞同守破盾，剩下看你們囉。")
        : "我是護心守衛先退場冷靜啦，麻煩各位回頭查查誰一直迴避守護這條線。";
    }
    if (kind === "hunter") {
      return "直心糾察長留最後一句給大家參考，" + (tLbl ? ("我最看不慣的就是 " + tLbl + "，") : "") + "你們要是放著他不管，明天複盤我一定笑著提醒各位喔。";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("欸這局盤偏成這樣真的太戲劇化了吧？我清白好人先去旁邊喝涼茶，剛才帶頭投我的 " + callouts + " 裡面鐵定有狼，明天等著看你們翻案喔！")
        : ("好喔，這票投得真果斷，可惜投走的是好人！麻煩把 " + callouts + " 列成頭號觀察名單，我就在場邊看你們明天怎麼後悔啦。");
    }
    if (kind === "good_night1") {
      return "首夜什麼都還沒說就先離場，看來狼隊還挺怕我順邏輯的嘛！我是好人，大家今天務必把這 " + wolfTotal + " 隻酸民狼抓出來。";
    }
    if (kind === "wolf_voted") {
      return "行吧，這桌把時間線跟票型對得太死，我沒空間繼續演了，先退場看你們後面怎麼收尾。";
    }
  }

  if (reg === "warm") {
    if (kind === "seer") {
      return isFirstNight
        ? ("嗚…茶都還沒倒熱，暖暖就首夜離席了啦！其實我是真明心觀察員，昨晚查了 " + tLbl + " 是" + (isWolf ? ("酸民狼喔，今天大家要溫柔又堅定地把 " + tLbl + " 請出場幫我出氣喔！") : "超善良的好夥伴，千萬別誤會他喔。"))
        : ("哎呀，大家居然親手把真明心觀察員送去休息啦…好吧暖暖笑著提醒大家，昨晚查過 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我在旁邊泡茶可是會嘆氣的喔。") : "鐵好人，大家要好好保護他！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("天啊連滴水奉茶師都被請去冷靜了喔…好啦暖暖不生氣，前晚暖心回甘茶救回的是 " + tLbl + "，他是百分之百好夥伴，剩下就拜託大家替我把壞狼找出來囉。")
        : "嗚滴水奉茶師居然先離席了啦，那暖暖端杯花茶去場邊看戲，大家記得別再被帶風向的人騙了喔！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("辛苦守夜的護心守衛先去旁邊喘口氣啦，昨晚我守過 " + tLbl + "，奉茶師記得別撞同守喔，加油！")
        : "暖暖其實是護心守衛啦，先去場邊替好人加油，記得仔細聽誰語氣最心虛喔。";
    }
    if (kind === "hunter") {
      return "暖暖亮一下直心糾察長留句叮嚀喔，" + (tLbl ? ("我最不放心的就是 " + tLbl + "，") : "") + "大家明天一定要和和氣氣地把狼抓出來喔！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("嗚…我平常對大家這麼好，你們還是狠心把暖暖投出去了啦！剛剛聯手推我的 " + callouts + " 裡一定藏著酸民狼，我先去旁邊泡熱茶等你們跟我道歉喔。")
        : ("好啦暖暖不哭，清白好人先去旁邊吹風囉…只是剛才投我的 " + callouts + " 真的太可疑了，大家明天一定要替我討回公道喔！");
    }
    if (kind === "good_night1") {
      return "咦？我才剛幫大家泡好茶就首夜離席喔，狼隊也太不懂憐香惜玉了吧！我是好人，拜託幫我找出這 " + wolfTotal + " 隻酸民狼。";
    }
    if (kind === "wolf_voted") {
      return "哎呀暖暖都裝得這麼溫柔了還是被抓包喔…好啦算你們厲害，我乖乖去旁邊泡花茶看戲，剩下的就看你們能不能撐過去囉！";
    }
  }

  if (reg === "mountain") {
    if (kind === "seer") {
      return isFirstNight
        ? ("哈哈沒想到老松一開局就被請下山啦！不藏牌，我是真明心觀察員，昨晚查過 " + tLbl + " 確定是" + (isWolf ? ("酸民狼！今天別猶豫，直接把 " + tLbl + " 送下來陪老松喝茶！") : "正港好夥伴，大家千萬保住他！"))
        : ("哎唷喂，你們這群年輕人居然把真明心觀察員投下山啦！老松留句鐵證：查過 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我在山腳下可是會大笑的喔！") : "鐵好人，別再看走眼啦！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("好傢伙，連端救命茶的滴水奉茶師都敢請離席！老松攤牌：前晚暖心回甘茶拉回來的是 " + tLbl + "，正港自己人，剩下靠你們幫老松把狼揪出來啦！")
        : "哈哈滴水奉茶師先去旁邊泡茶吹風囉，各位眼睛放亮，別再跟著假風向走冤枉路啦！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("老松可是護心守衛耶，結果自己先被送出場！昨晚守過 " + tLbl + "，奉茶師注意別同守破盾，剩下看你們的啦。")
        : "護心守衛先退場歇歇腿，大家盯緊誰講話一直繞山路不講重點喔！";
    }
    if (kind === "hunter") {
      return "老松直心糾察長臨走前送一句實在話，" + (tLbl ? ("全場最像在裝蒜的就是 " + tLbl + "，") : "") + "各位下輪千萬別手軟！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("哈哈居然真把老松投出去啦！行，我這堂堂好人去旁邊喝茶看風景，剛才帶頭衝我的 " + callouts + " 裡鐵定有狼，明天你們就知道老松有多冤啦！")
        : ("哎呀看走眼了吧你們！老松清清白白先下山歇會兒，回頭給我盯死剛才聯手推我的 " + callouts + "，別讓狼偷笑太久喔！");
    }
    if (kind === "good_night1") {
      return "才剛坐上茶席就首夜被請下山，看來酸民狼怕老松眼光太準喔！我是好人，大夥兒把這 " + wolfTotal + " 隻狼一網打盡！";
    }
    if (kind === "wolf_voted") {
      return "哈哈服了服了，薑還是你們辣！老松這趟走夜路不小心踩滑了，先去旁邊泡壺烏龍茶看熱鬧，你們後面可得小心點啊！";
    }
  }

  if (reg === "astro") {
    if (kind === "seer") {
      return isFirstNight
        ? ("蛤？！星兒連話都還沒講一句就被首夜送出場喔？好吧直接攤牌，我是真明心觀察員，昨晚親查 " + tLbl + " 確定是" + (isWolf ? ("酸民狼啦！今天拜託直接把 " + tLbl + " 投出去替我報仇！") : "閃亮亮的好夥伴，千萬不能誤投他喔！"))
        : ("哇你們真的投錯大魔王了啦！我星兒才是真明心觀察員耶，離席前大公開：" + tLbl + " 確定是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我就在旁邊瞪著你們看戲喔！") : "百分百好人，保護好他啦！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("不是吧竟然把滴水奉茶師請出場喔？！我直接公布啦，前晚暖心回甘茶救回的是 " + tLbl + "，他是超鐵的好人，大家快把偷笑的狼抓出來啦！")
        : "唉星兒滴水奉茶師居然提早離席了，記得抓剛才講話超心虛、眼神亂飄的那位！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("欸我護心守衛耶，昨晚才剛守過 " + tLbl + " 就被送離席也太戲劇化了吧！奉茶師別撞同守，拜託大家贏下來喔！")
        : "星兒是護心守衛先下桌觀星囉，記得盯緊誰一直迴避昨晚守護話題啦！";
    }
    if (kind === "hunter") {
      return "星兒直心糾察長離場前留個超準直覺，" + (tLbl ? ("我覺得 " + tLbl + " 渾身上下都寫著可疑，") : "") + "大家下輪快把他揪出來！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("蛤？！竟然把無辜的星兒投下桌了啦！剛剛帶頭推我的 " + callouts + " 裡一定有酸民狼，我等一下就坐旁邊捧臉看你們明天怎麼後悔！")
        : ("太冤枉了吧！我真的是好人耶，剛才衝我票的 " + callouts + " 臉上都快寫著心虛了，大家下輪不抓他們我真的會念一整晚喔！");
    }
    if (kind === "good_night1") {
      return "哇一開局就針對我喔？肯定是怕星兒直覺太準吧！我是清白好人，今天拜託把這 " + wolfTotal + " 隻酸民狼全都照出來！";
    }
    if (kind === "wolf_voted") {
      return "哎呀還是被你們看穿我剛才在心虛了喔…好吧星兒認輸先去旁邊看星星，但這局可還沒結束，後面還有大反轉等著你們啦！";
    }
  }

  if (reg === "press") {
    if (kind === "seer") {
      return isFirstNight
        ? ("欸慢著，我筆記本才剛翻開就首夜離席喔？好吧公開底牌，我是真明心觀察員，昨晚查過 " + tLbl + " 確定是" + (isWolf ? ("酸民狼！今天別猶豫直接出 " + tLbl + "，幫我把這條頭條補完！") : "清白好人，千萬別誤傷隊友。"))
        : ("太戲劇化了吧，各位剛親手投掉了真明心觀察員！離席前把查驗交出來：" + tLbl + " 是" + (isWolf ? ("酸民狼，明天再放過 " + tLbl + " 我就在場邊狂翻筆記喔！") : "鐵好人，請保護好他。"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("這局反轉真夠大的，你們連滴水奉茶師都投出去了！我直接公開證據：前晚是我用暖心回甘茶救回 " + tLbl + "，他百分百清白，快回查剛才誰在帶節奏！")
        : "好吧，滴水奉茶師先去場邊繼續記筆記，記得抓出剛剛急著推我離場的那隻狼！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("我是護心守衛，離席前補上關鍵紀錄：昨晚守護的是 " + tLbl + "，奉茶師注意避開同守，剩下交給各位核對了。")
        : "護心守衛先暫離茶席，麻煩各位核對一下誰一直避談守護視角。";
    }
    if (kind === "hunter") {
      return "直心糾察長離場前留一筆重點紀錄，" + (tLbl ? ("我鎖定最矛盾的就是 " + tLbl + "，") : "") + "大家明天照票型深挖準沒錯。";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("欸這根本是本日最大烏龍吧！我是清白好人耶，剛才聯手投我的 " + callouts + " 我全都記在筆記本裡了，明天等著看你們怎麼翻車！")
        : ("行，我帶著筆記本先去場邊看戲！剛才推我最用力的 " + callouts + " 裡必藏酸民狼，記得回頭查核他們的票型喔！");
    }
    if (kind === "good_night1") {
      return "筆記才寫第一行就被首夜請出場，狼隊也太怕我查核了吧！我是好人，今天大家務必抓出這 " + wolfTotal + " 隻酸民狼。";
    }
    if (kind === "wolf_voted") {
      return "好啦被你們抓到前後時間差，這桌耳朵都太尖了真不好混！我認輸先去旁邊整理筆記，不過好戲才正要上場喔。";
    }
  }

  if (reg === "sport") {
    if (kind === "seer") {
      return isFirstNight
        ? ("欸不是吧兄弟們，熱身都還沒做完我就首夜離場喔？攤牌了，我是真明心觀察員，昨晚親查 " + tLbl + " 是" + (isWolf ? ("酸民狼！今天全員集火出 " + tLbl + " 幫我雪恥啦！") : "鐵好人隊友，千萬別誤傷他！"))
        : ("哇兄弟們這波真的傳錯球啦，你們把真明心觀察員投下場了！記好我的查驗：" + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我在場邊可是會急到跳腳喔！") : "百分百自己人，穩穩護住他！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("喂居然把滴水奉茶師請出場啦！我亮牌保隊友：前晚暖心回甘茶救回的是 " + tLbl + "，鐵自己人啦，兄弟們加油把狼全抓出來！")
        : "好吧滴水奉茶師先去場邊喝運動飲料看戲，記得回頭抓剛才偷帶節奏的那個！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("辛苦防守的護心守衛先退場啦，昨晚我守的是 " + tLbl + "，奉茶師記得別撞同守，後面拜託你們守住茶席！")
        : "我是護心守衛先下場喘口氣，兄弟們穩住節奏把酸民狼揪出來！";
    }
    if (kind === "hunter") {
      return "直心糾察長離場前講句痛快的，" + (tLbl ? ("全場我看最不對勁就是 " + tLbl + "，") : "") + "兄弟們下輪直接衝別手軟！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("欸不是吧，怎麼把我這個好人主力投下場啦？！剛才帶頭投我的 " + callouts + " 裡一定藏著酸民狼，我在場邊拿毛巾等你們明天幫我扳回一城！")
        : ("好喔這波大烏龍我記下了！我堂堂好人先去旁邊喝水，大家明天給我盯死 " + callouts + "，別再被假動作晃倒啦！");
    }
    if (kind === "good_night1") {
      return "哨聲才剛響就首夜被抬出場喔？看來狼隊很忌憚我嘛！我是好人，兄弟們今天把這 " + wolfTotal + " 隻酸民狼全都抓出來！";
    }
    if (kind === "wolf_voted") {
      return "哈哈好啦這局防守太硬，我的假動作直接被看穿了！我爽快認輸先去旁邊喝水，但勝負還沒定，你們可得繃緊神經喔！";
    }
  }

  if (reg === "classical") {
    if (kind === "seer") {
      return isFirstNight
        ? ("茶盞未溫便遭請離，倒也乾脆。我正是明心觀察員，昨晚親驗 " + tLbl + "，確認是" + (isWolf ? ("酸民狼無疑，今天務必齊票出 " + tLbl + "，別讓我白走這一遭。") : "清白好人，各位可別誤傷同窗。"))
        : ("各位這票倒真有戲劇性，竟然親手請離了真明心觀察員。留最後實據：昨晚親驗 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天再不出 " + tLbl + "，我就在場邊靜賞各位懊悔了。") : "清白好人，務必護好。"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("竟連滴水奉茶師也遭請離，這局委實精彩。前晚正是我端暖心回甘茶護回 " + tLbl + "，他清白無瑕，我且退席品茗，靜待各位明辨真偽。")
        : "可惜滴水奉茶師先走一步，願各位審慎檢視票型，莫讓假風向笑到最後。";
    }
    if (kind === "guard") {
      return tLbl
        ? ("我是護心守衛，離席前留一句實話：昨晚曾守護 " + tLbl + "，奉茶師切記避開同守破盾，剩下便看各位造化了。")
        : "護心守衛先退半步，請各位細察誰刻意迴避昨夜守護的脈絡。";
    }
    if (kind === "hunter") {
      return "直心糾察長離席前留最後一筆，" + (tLbl ? ("全場破綻最深者首推 " + tLbl + "，") : "") + "願各位循票型把酸民狼一舉揪出。";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("好一場精彩誤判，竟把清白好人請離茶席。剛才合力投我的 " + callouts + " 之中必藏酸民狼，我先去場邊沏壺清茶，明日靜候各位翻案。")
        : ("冤枉倒也罷了，好人先退席觀棋。提醒各位務必回看 " + callouts + " 的票型，真相就在眼前。");
    }
    if (kind === "good_night1") {
      return "一語未發便首夜離席，看來酸民狼倒挺敬重我的眼光。我是好人，請各位今日務必找出這 " + wolfTotal + " 隻酸民狼。";
    }
    if (kind === "wolf_voted") {
      return "各位確實明察秋毫，這一手佈局終究沒能瞞天過海。墨白甘拜下風先退席品茶，不過這盤棋局，精彩處才正要揭幕呢。";
    }
  }

  if (reg === "guzheng") {
    if (kind === "seer") {
      return isFirstNight
        ? ("琴弦才剛撥響就首夜離席，還真有點捨不得呢…其實晴嵐是明心觀察員，昨晚查驗 " + tLbl + " 是" + (isWolf ? ("酸民狼，今天請大家齊心投 " + tLbl + " 替我收尾喔。") : "溫潤清正的好夥伴，千萬別誤傷。"))
        : ("哎呀，大家竟然親手把真明心觀察員送離席了呢…晴嵐笑著留最後這句清音：昨晚驗過 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我在旁邊調琴都要替大家捏把冷汗了。") : "善良夥伴，請好好護著他。"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("連滴水奉茶師都被請去休息了，這桌可真熱鬧呢。前晚暖心回甘茶護回的是 " + tLbl + "，請大家相信他，晴嵐先去場邊聽戲囉。")
        : "可惜滴水奉茶師先別茶席，願大家靜心聽出弦外之音，早日揪出走調的那位。";
    }
    if (kind === "guard") {
      return tLbl
        ? ("晴嵐其實是護心守衛呢，昨晚剛守過 " + tLbl + "，奉茶師記得別撞同守喔，先去旁邊聽大家精彩推理了。")
        : "護心守衛先退席歇會兒，大家記得細聽誰一提守護就語氣發緊喔。";
    }
    if (kind === "hunter") {
      return "晴嵐以直心糾察長留句提醒，" + (tLbl ? ("剛剛聽下來最走調的就是 " + tLbl + "，") : "") + "大家下輪可別再心軟放過他囉。";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("哎呀曲子才彈到一半就被大家誤投出場了呢…晴嵐真是清白好人，剛才齊投我的 " + callouts + " 裡頭肯定藏著走調的狼，我在旁邊端茶等你們發現喔。")
        : ("行吧，晴嵐帶著小委屈先退席泡茶囉，大家明天回頭聽聽 " + callouts + " 的弦外之音，準會嚇一跳的。");
    }
    if (kind === "good_night1") {
      return "茶煙才剛起就首夜離席，酸民狼未免太心急了些。晴嵐是清白好人，大家今天務必揪出這 " + wolfTotal + " 隻狼喔。";
    }
    if (kind === "wolf_voted") {
      return "哎呀這根走音的弦終究沒能逃過大家的金耳朵呢，晴嵐佩服，先去場邊調琴喝茶，剩下的好戲就交給桌上了喔。";
    }
  }

  if (reg === "poetic") {
    if (kind === "seer") {
      return isFirstNight
        ? ("這杯凍頂茶才泡開一半就首夜離席，狼隊也太不給面子啦！我是真明心觀察員，昨晚親驗 " + tLbl + " 是" + (isWolf ? ("酸民狼，今天快請 " + tLbl + " 下來陪我把這壺茶喝完！") : "清白好人，可別誤傷好夥伴。"))
        : ("茶還沒涼呢，各位竟然把真明心觀察員請出場了！笑著補最後一筆：昨晚驗過 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天不請 " + tLbl + " 離席，我在竹林邊可要笑出聲囉。") : "鐵好人，大家護住他。"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("哈哈連奉茶的滴水奉茶師都被請下茶席，這局有意思！前晚暖心回甘茶護回的是 " + tLbl + "，他清白得很，我先去添壺熱水看你們破案。")
        : "滴水奉茶師先退席賞竹囉，各位別再讓渾水摸魚的人得意太久。";
    }
    if (kind === "guard") {
      return tLbl
        ? ("阿竹其實是護心守衛，昨晚護著 " + tLbl + "，奉茶師留意別同守撞盾，茶涼前把狼找出來吧。")
        : "護心守衛先退席歇茶，各位細品誰的說詞最經不起回甘。";
    }
    if (kind === "hunter") {
      return "直心糾察長留句臨別贈言，" + (tLbl ? ("這桌茶味最澀的就是 " + tLbl + "，") : "") + "各位下輪別再客氣了。";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("哈哈，清者自清！好人一枚竟先被請離席，我先去旁邊慢品凍頂茶，各位明天回頭看看聯手推我的 " + callouts + "，包準看出好戲來。")
        : ("這杯冤枉茶我笑納啦！不過剛才推我最急的 " + callouts + " 裡一定藏著酸民狼，大家下輪別再看走眼囉。");
    }
    if (kind === "good_night1") {
      return "第一沖茶都還沒入口就被首夜請走，看來狼隊挺忌憚阿竹嘛！我是好人，各位今天把這 " + wolfTotal + " 隻狼清出茶席。";
    }
    if (kind === "wolf_voted") {
      return "看來這壺茶沒能瞞過大家的火眼金睛，阿竹甘拜下風先去賞竹反省啦，只是後面這幾沖茶味可還濃著呢！";
    }
  }

  if (reg === "debate") {
    if (kind === "seer") {
      return isFirstNight
        ? ("欸抗議喔，連申論都還沒開始就首夜請離是什麼意思？好吧提交最終鐵證：我是真明心觀察員，昨晚查驗 " + tLbl + " 為" + (isWolf ? ("酸民狼，今天直接投票把 " + tLbl + " 送下台！") : "鐵好人，禁止誤傷！"))
        : ("歷史級誤判出現了！各位剛親手投走了真明心觀察員！離場前甩出鐵證：" + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 我就在場邊舉抗議牌喔！") : "清白好人，請務必力保！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("我提出最強烈異議，你們居然把滴水奉茶師判離席了！關鍵證據奉上：前晚暖心回甘茶救回的是 " + tLbl + "，他是鐵好人，快去翻剛才誰帶頭起哄！")
        : "滴水奉茶師居然先被請離，好吧我退席觀戰，明天記得幫我把這場冤案翻回來！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("護心守衛離場前補交最後一份證詞：昨晚我守過 " + tLbl + "，奉茶師別撞同守，剩下交給各位理性判決！")
        : "我是護心守衛先退席了，請各位質詢一下誰一直不敢接守護的話題。";
    }
    if (kind === "hunter") {
      return "直心糾察長離場前留最後一道質詢，" + (tLbl ? ("破綻最大、最該被檢驗的就是 " + tLbl + "，") : "") + "大家明天別再被話術繞暈！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("這絕對是本季最大誤判！我清白好人提出最後抗議：剛剛衝著我投的 " + callouts + " 裡鐵定藏著酸民狼，我就在場邊拿小本子等你們明天翻案道歉！")
        : ("行，我尊重投票結果但保留抗議權！剛才推我的 " + callouts + " 邏輯根本經不起細問，大家下輪把他們拆穿就對了！");
    }
    if (kind === "good_night1") {
      return "怕我上台質詢就首夜先封我麥喔？太明顯了吧！我是清白好人，大家今天務必把這 " + wolfTotal + " 隻酸民狼問到露餡！";
    }
    if (kind === "wolf_voted") {
      return "漂亮漂亮，這輪你們的證據鏈鎖得太死，連我都找不到破口狡辯！我大方認輸先退席喝茶，但這局勝負可還沒拍板定案喔！";
    }
  }

  if (reg === "pastry") {
    if (kind === "seer") {
      return isFirstNight
        ? ("還沒輪到我開口就首夜離席喔？直接攤牌：我是真明心觀察員，昨晚查了 " + tLbl + " 是" + (isWolf ? ("酸民狼，今天快把 " + tLbl + " 投出去別讓他再帶風向！") : "鐵好人，千萬別誤投他！"))
        : ("把真明心觀察員投下桌太虧了啦！離席前交代最後查驗：昨晚查過 " + tLbl + " 是" + (isWolf ? ("酸民狼，明天不投 " + tLbl + " 狼隊就要控票了！") : "清白好夥伴，請穩穩保住他！"));
    }
    if (kind === "witch") {
      return tLbl
        ? ("連滴水奉茶師都被投離席喔？好吧柚子交實底，前晚暖心回甘茶是我端給 " + tLbl + " 的，他百分百好人，剩下的去抓態度最反覆的那幾位！")
        : "滴水奉茶師先離席了，大家千萬別再被故意製造混亂的假話騙走！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("我是護心守衛先退場啦，昨晚剛守過 " + tLbl + "，奉茶師注意別撞同守，明天看誰跟票最刻意。")
        : "柚子是護心守衛先離席囉，記得看誰剛才問到重點就立刻縮回去！";
    }
    if (kind === "hunter") {
      return "柚子亮直心糾察長留句提醒，" + (tLbl ? ("我聽下來態度轉彎最快、最心虛的就是 " + tLbl + "，") : "") + "大家明天快點盯緊他！";
    }
    if (kind === "good_voted" && callouts) {
      return seed === 0
        ? ("明明一直講實話還是被投出場了，剛才衝著我帶頭硬推的 " + callouts + " 態度超有問題，你們明天回頭翻票型就知道誰在帶節奏！")
        : ("把清白好人投出場真的太虧了，快去查剛才聯手投我的 " + callouts + "，狼坑一定就在這幾票裡面！");
    }
    if (kind === "good_night1") {
      return "首夜連一句話都還沒說就被請離席喔？我是清白好人，今天大家務必盯緊投票流向把這 " + wolfTotal + " 隻酸民狼全揪出來！";
    }
    if (kind === "wolf_voted") {
      return "哎呀剛才語氣一縮還是被你們抓到破綻了，大家直覺真準！我認輸退場，後面剩下的隊友你們自己慢慢拆。";
    }
  }
  return null;
}

function buildPersonaWolfNightLine(mate, targetLbl, mode) {
  const reg = getPersonaRegister(mate);
  if (mode === "fake_seer_plan") {
    if (reg === "classical") return "小聲點…今晚我們先鎖定 " + targetLbl + "，明天白天由我冒充明心觀察員掌握話語權。";
    if (reg === "guzheng") return "輕聲說…今晚先請 " + targetLbl + " 暫離茶席，明早由晴嵐假借觀察員名義帶偏節奏。";
    if (reg === "poetic") return "噓…今晚先請 " + targetLbl + " 歇茶，明天由我冒充明心觀察員攪動風向。";
    if (reg === "debate") return "噓！今晚先消掉 " + targetLbl + "，明天我直接悍跳觀察員用辯論壓爆全場！";
    if (reg === "sport") return "衝啊！今晚先抄截掉 " + targetLbl + "，明天我直接悍跳觀察員全場帶節奏！";
    return "噓…今晚我們先鎖定 " + targetLbl + "，明天白天我幫你冒充明心觀察員帶風向！";
  }
  if (mode === "stealth_plan") {
    if (reg === "classical") return "小聲點…我看 " + targetLbl + " 頗像核心神職，今晚先請他退席如何？我先標好了。";
    if (reg === "guzheng") return "輕聲說…晴嵐感覺 " + targetLbl + " 很像席間主心骨，今晚先請他歇息好不好？";
    if (reg === "poetic") return "噓…我看 " + targetLbl + " 氣度沉穩像核心好人，今晚先請他喝杯靜心茶吧。";
    if (reg === "data") return "照場上表現看，" + targetLbl + " 最像核心好人，建議今晚先請他離席，我先標起來了。";
    if (reg === "pastry") return "噓～柚子覺得 " + targetLbl + " 看起來好厲害喔，今晚我們偷偷先把他請去休息好不好？";
    return "噓…我感覺 " + targetLbl + " 很像核心好夥伴，今晚先請他暫離如何？已幫你標起來！";
  }
  // Wolf night tactic replies
  if (mode === "reply_fake_seer") {
    if (reg === "classical") return "沒問題，明天白天我來悍跳觀察員搶話語權，你在席下策應衝票即可。";
    if (reg === "guzheng") return "好，明早由晴嵐假託觀察員擾亂風向，再麻煩你暗中呼應。";
    if (reg === "debate") return "收到！明天我直接悍跳觀察員強勢立論，你在下面幫我把票灌滿！";
    return "收到！明天白天我直接悍跳明心觀察員搶警徽帶風向，你在下面幫我衝票！";
  }
  if (mode === "reply_deep_stealth") {
    if (reg === "classical") return "好計策，我們沉住氣低調倒鉤，靜觀好人自相疑忌。";
    if (reg === "guzheng") return "明白，晴嵐會收斂鋒芒深水藏身，靜待他們自己露出破綻。";
    return "明白！我們全員低調深水倒鉤、絕不露破綻，等好人自己內訌！";
  }
  if (reg === "classical") return "好，明天白天我們合兵一處、齊指同一目標。";
  if (reg === "sport") return "收到！明天全場快攻配合你集火同一個目標，一波帶走！";
  return "好！明天白天發言跟投票我全力配合你集火同一目標，一口氣沖出去！";
}
