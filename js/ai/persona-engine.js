/**
 * v15.0 百態群像：11 位 AI 角色全維度人格引擎（7 維盲視認知邏輯＋現代大學茶社書卷語風）
 *
 * 設計原則：
 * 1. 嚴格盲視零作弊（100% 僅讀取 BlindMatchSnapshot 公開與自身合法視野，絕不偷看他人底牌）。
 * 2. 11 位角色皆以自然現代台灣大學茶社白話為基底，保留國學社「墨白」、國樂社「晴嵐」、茶藝社「阿竹」
 *    的溫和書卷氣質與適度四字成語點綴（全面移除生硬文言代詞與虛詞），貫穿全流程互動。
 * 3. 7 維認知參數實際驅動懷疑值敏感度、記仇反推、酸言懲罰、跟票／獨立反骨、神職藏牌與狼隊悍跳傾向。
 */
"use strict";

const PERSONA_COGNITIVE_PROFILES = Object.freeze({
  "小澄": Object.freeze({
    register: "data",
    shortTag: "數據",
    iconKey: "abacus",
    iconTone: "indigo",
    registerBadge: "邏輯推演派",
    logicTags: "極度審慎・獨立派・愛藏牌",
    credulity: 0.48,
    grudgeMemory: 1.35,
    harmonySensitivity: 0.92,
    bandwagonBias: -0.35,
    bluffBoldness: 0.56,
    godHideBias: 0.72,
    talkCadence: 1.05,
    sampleQuote: "欸等一下，我剛順了一遍大家講的時間點，這邊前後根本兜不起來啊…照刪去法看這輪我先投這張。",
    llmStyleRule: "使用真實自然的台灣資工系男大生日常聊天口吻（常帶『欸等一下、我剛順了一遍、前後兜不攏耶、照刪去法看』），短句自然呼吸停頓，像朋友圍桌推理；不重複喊制式『先這樣，過！』，嚴禁使用『邏輯閉環、高置信度、異常值、算力』或演講稿腔。"
  }),
  "暖暖": Object.freeze({
    register: "warm",
    shortTag: "泡茶",
    iconKey: "witch",
    iconTone: "jade",
    registerBadge: "暖茶反差萌",
    logicTags: "高輕信・極痛恨酸言・溫柔補刀",
    credulity: 1.45,
    grudgeMemory: 0.55,
    harmonySensitivity: 1.80,
    bandwagonBias: 0.65,
    bluffBoldness: 0.42,
    godHideBias: 0.28,
    talkCadence: 0.88,
    sampleQuote: "欸大家先喝口熱茶別吵架嘛…可是老實說，剛剛聽那樣刺刺的口氣心裡有點毛毛的耶，這輪只好先請他去旁邊冷靜一下囉。",
    llmStyleRule: "使用溫柔自然的台灣女大生日常聊天語氣（常帶『欸大家先別急嘛、老實說心裡有點毛毛的、先喝口茶慢慢講』），自然親切不誇張；抽到酸民狼時用最柔和客氣的口吻默默推人。"
  }),
  "阿松": Object.freeze({
    register: "mountain",
    shortTag: "登山",
    iconKey: "mountain",
    iconTone: "jade",
    registerBadge: "山林江湖台味",
    logicTags: "老練穩健・不易跟風・重義氣",
    credulity: 0.60,
    grudgeMemory: 1.05,
    harmonySensitivity: 1.20,
    bandwagonBias: -0.25,
    bluffBoldness: 0.50,
    godHideBias: 0.55,
    talkCadence: 0.82,
    sampleQuote: "欸老松講句實在話吼，剛剛聽半天都在繞圈子沒講重點，聽起來超心虛啊，這輪大家別分票直接抓狼啦，過。",
    llmStyleRule: "自稱『老松』，充滿台灣登山社老學長接地氣的自然聊天味（常帶『欸老松講句實在話吼、別繞圈子啦、我看人很準的』），鬆弛自然像真人長輩學長聊天，不喊生硬口號。"
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
    sampleQuote: "欸等一下啦…你們剛聽那段不會覺得哪裡怪怪的嗎？我聽完真的起雞皮疙瘩耶，直覺他超像在演的，過。",
    llmStyleRule: "直覺敏銳的台灣女大生自然聊天口吻（常帶『欸等一下啦、不會覺得怪怪的嗎、聽完起雞皮疙瘩耶、我直覺超在意』），像真實朋友圓桌聊天，禁止『緊急星訊廣播、星盤左線』等中二播報口號。"
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
    sampleQuote: "欸慢著，我剛邊聽邊記了一下喔，前面講的跟剛剛講的根本對不起來啊，這很明顯在帶風向吧？",
    llmStyleRule: "邊聽邊記筆記的台灣新聞社學姊自然口吻（常帶『欸慢著、我剛記了一下喔、前後對不起來啊、你的根據在哪』），敏銳直接但像真人口語，禁止『事實查核報告出爐、頭版快訊』等新聞播報腔。"
  }),
  "阿竹": Object.freeze({
    register: "poetic",
    shortTag: "茶藝",
    iconKey: "bamboo",
    iconTone: "jade",
    registerBadge: "茶藝社詩茶從容",
    logicTags: "風雅平衡・重三好氣度・從容藏鋒",
    credulity: 0.88,
    grudgeMemory: 0.72,
    harmonySensitivity: 1.55,
    bandwagonBias: 0.05,
    bluffBoldness: 0.35,
    godHideBias: 0.58,
    talkCadence: 0.85,
    sampleQuote: "別急，這杯凍頂茶都還沒涼呢，破綻其實已經浮出來了。聽其言觀其行，我這輪會先盯緊前後對不上的那位。",
    llmStyleRule: "現代大學茶藝社成員的自然白話口吻，從容帶點幽默與書卷氣（偶爾點綴『一盞茶還沒涼、聽其言觀其行、清者自清』等自然詞句），嚴禁使用『吾、汝、諸君、妾身、小生、夫、蓋』等生硬古文代詞與虛詞。"
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
    sampleQuote: "欸不是啊兄弟們，剛剛那段破綻也太大了吧，講話一直閃重點還想帶節奏，這不直接投出去說不過去吧！",
    llmStyleRule: "爽朗直率的台灣運動系男大生自然口語（常帶『欸兄弟們、不是啊、破綻很大耶、講話乾脆一點』），像真實朋友同桌討論，禁止『絕殺灌籃、神聖進球』等誇張卡通口號。"
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
    sampleQuote: "把剛才幾位的說法對照來看，破綻已經昭然若揭。語氣閃爍又急著定調，權衡再三，我這票會投出去。",
    llmStyleRule: "【溫和書卷化規範】現代大學中文系／書法社長的清冷理性白話口吻，簡練克制、少口水字，僅在關鍵處自然點綴四字成語（如『破綻昭然、言之成理、權衡再三、是非分明』）；以『我、大家、各位』自然稱呼，嚴禁使用『吾、汝、諸君、妾身、夫、蓋、彼輩、矣、哉』等生硬文言詞彙。"
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
    sampleQuote: "剛剛安靜聽完大家聊下來，這位語氣裡有種藏不住的弦外之音，越聽越覺得微躁，我這輪會先多留意他。",
    llmStyleRule: "【溫和書卷化規範】現代大學國樂社古箏學姊的自然溫雅白話口吻，柔和而有主見，偶爾點綴『弦外之音、清濁分明、聽話聽音』等雅致詞彙；以『我、晴嵐、大家』自然稱呼，嚴禁使用『妾身、吾、汝、諸君、夫、蓋』等古文代詞。"
  }),
  "阿朗": Object.freeze({
    register: "debate",
    shortTag: "辯論",
    iconKey: "scales",
    iconTone: "gold",
    registerBadge: "法庭奧瑞岡辯論",
    logicTags: "高審慎・最高記仇反打・強勢對跳",
    credulity: 0.50,
    grudgeMemory: 1.78,
    harmonySensitivity: 0.98,
    bandwagonBias: -0.42,
    bluffBoldness: 0.88,
    godHideBias: 0.48,
    talkCadence: 1.20,
    sampleQuote: "欸等一下，這邏輯說不通吧？連半點實際證據都沒拿出來就急著扣帽子，這輪照證據看我建議先投他，過。",
    llmStyleRule: "犀利但自然的台灣辯論社男大生日常口語（常帶『欸等一下、這證據在哪、邏輯說不通吧、別偷換概念、照證據投』），擅長反問抓漏洞但像真人對話，禁止『正方一辯登場、立論甲立論乙』等生硬演講稿。"
  }),
  "柚子": Object.freeze({
    register: "pastry",
    shortTag: "甜點",
    iconKey: "pastry",
    iconTone: "jade",
    registerBadge: "元氣烘焙甜點派",
    logicTags: "高輕信・最強跟票共鳴・甜美活潑",
    credulity: 1.40,
    grudgeMemory: 0.78,
    harmonySensitivity: 1.42,
    bandwagonBias: 0.75,
    bluffBoldness: 0.52,
    godHideBias: 0.20,
    talkCadence: 1.24,
    sampleQuote: "咦…等一下喔，剛剛聽那段怎麼空空的像塌掉的舒芙蕾一樣沒重點呀，柚子覺得怪怪的，這輪我先投他喔。",
    llmStyleRule: "親切自然的台灣點心社學妹口語（常帶『咦…等一下喔、怎麼聽起來空空的、我覺得怪怪的耶』，偶爾點綴自然甜點比喻），禁止『叮咚烤箱計時器大響、雙重試吃開始』等卡通旁白。"
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
  sampleQuote: "大家心平氣和對齊線索，一起守護林美山茶席的清朗氣氛。",
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
    desc: "登山社與球社練完常去茶社和點心社吃茶點；阿松與晨晨天生照應學妹，晨晨抽到狼被迫踩柚子時易露出語氣卡頓。"
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
  "柚子": "歪頭托腮眨眨眼，回味誰的說法像沒烤熟的舒芙蕾…"
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
    "哈哈，來坐來坐，老松剛從林美山觀景台下來，眼神還亮得很，等等一起抓狼。",
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
    "歡迎來到林美山辯論茶席，準備好一起用交叉質詢拆穿漏洞了嗎？",
    "正反雙方就位，開局後這場邏輯攻防肯定精彩。"
  ],
  "柚子": [
    "學長姊好呀，柚子剛烤好小茶點端上桌囉，快開局一起抓狼吧。",
    "好期待這局喔，等等大家溫柔說好話，可別被酸溜溜的壞狼騙走了。"
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
    return "後置位 " + firstLbl + (more ? " 學長姊" : "") + "還沒出爐發言喔，先留著聽聽味道！";
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
    return rebutLead + "咦？！" + accName + " 怎麼突然把柚子點進狼坑啦，我都快委屈得像塌掉的戚風蛋糕了！我真的是乖乖好夥伴耶，" +
      (allyLbl ? (allyLbl + " 感覺好真誠先放好人坑，") : "") + "亂點火的 " + pitNamesStr + " 才是可疑狼坑啦！" + unspokenTail + signoff;
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
  const { isFirstNight, tLbl, isWolf, callouts, topSusLbl, wolfTotal } = d;
  if (reg === "classical") {
    if (kind === "seer") {
      return "各位明辨！我是真明心觀察員，離席前留這條關鍵查驗：昨晚親驗 " + tLbl + "，確認是" + (isWolf ? ("酸民狼無疑，明天務必齊票出 " + tLbl + "。") : "清白好人，大家千萬別誤傷。");
    }
    if (kind === "witch") {
      return tLbl
        ? ("我亮滴水奉茶師留遺言：前晚正是我用暖心回甘茶護回 " + tLbl + "，他清白無瑕，剩下的局勢就交給各位明辨了。")
        : "可惜我拿滴水奉茶師卻先離席，請各位審慎對照票型，別被假風向帶偏。";
    }
    if (kind === "guard") {
      return tLbl
        ? ("我亮護心守衛留遺言：昨晚曾守護 " + tLbl + "，奉茶師留意別同守破盾，後面就拜託各位了。")
        : "我是護心守衛先走一步，請各位細察誰在迴避昨晚守護的脈絡。";
    }
    if (kind === "hunter") {
      return "我是直心糾察長留最後一句，" + (tLbl ? ("全場最可疑的首推 " + tLbl + "，") : "") + "願大家循票型把酸民狼找出來。";
    }
    if (kind === "good_voted" && callouts) {
      return "冤枉了，我確是清白好人。剛才帶頭投我的 " + callouts + " 之中必藏酸民狼，請各位回看票型辨明是非。";
    }
    if (kind === "good_night1") {
      return "首夜就離席確實可惜。我是好人，請大家今天細聽誰急著挑起節奏，找出這 " + wolfTotal + " 隻酸民狼。";
    }
  }
  if (reg === "guzheng") {
    if (kind === "seer") {
      return "請大家聽晴嵐最後這句清音：我是明心觀察員，昨晚查驗 " + tLbl + " 確認是" + (isWolf ? ("酸民狼，務必把票集中給 " + tLbl + "。") : "善良夥伴，千萬別誤投。");
    }
    if (kind === "witch") {
      return tLbl
        ? ("我以滴水奉茶師身分留這句提醒：前晚暖心回甘茶護回的是 " + tLbl + "，請大家保護他別投錯了。")
        : "可惜滴水奉茶師先別茶席，願大家靜心聽出弦外之音，早日看清真相。";
    }
    if (kind === "good_voted" && callouts) {
      return "這局還沒聽完就被誤投了…晴嵐真是好夥伴，離席前提醒大家回頭看剛才齊投我的 " + callouts + "，裡頭肯定藏著走調的狼。";
    }
  }
  if (reg === "poetic") {
    if (kind === "seer") {
      return "茶還沒涼人就先離席了！我是真明心觀察員，昨晚親驗 " + tLbl + " 確定是" + (isWolf ? ("酸民狼，請各位同窗齊票出 " + tLbl + "。") : "清白好人，可別誤傷好夥伴。");
    }
    if (kind === "good_voted" && callouts) {
      return "哈哈，清者自清。我好人一枚先退席了，麻煩各位回頭檢視剛才聯手推我的 " + callouts + "，狼跡就在裡面。";
    }
  }
  if (reg === "debate") {
    if (kind === "seer") {
      return "離場前提交最終鐵證！我是真明心觀察員，查驗報告鎖定 " + tLbl + " 為" + (isWolf ? ("酸民狼，請評審團直接票出 " + tLbl + "！") : "鐵好人，禁止誤傷！");
    }
    if (kind === "good_voted" && callouts) {
      return "這是一場重大誤判！我以好人身分提出最後異議：帶頭投我的 " + callouts + " 裡面絕對藏著狼，請回查票型翻案！";
    }
  }
  if (reg === "pastry") {
    if (kind === "seer") {
      return "嗚哇柚子要提早端盤離席了！我是真明心觀察員啦，昨晚查驗出爐：" + tLbl + " 是" + (isWolf ? ("烤焦的酸民狼，大家快把票投給 " + tLbl + "！") : "甜滋滋的純良鐵好人，絕對別投他喔！");
    }
    if (kind === "good_voted" && callouts) {
      return "嗚嗚柚子真的是好夥伴啦～剛剛衝著我投票的 " + callouts + " 味道酸溜溜的超可疑，大家一定要幫我抓出狼喔！";
    }
  }
  if (reg === "astro") {
    if (kind === "seer") {
      return "緊急星訊廣播！星兒是真明心觀察員啦，昨晚星盤直接顯示 " + tLbl + " 就是" + (isWolf ? ("大黑狼！大家快跟我聯手封印 " + tLbl + "！") : "閃閃發亮的好夥伴，千萬不能投錯他！");
    }
    if (kind === "good_voted" && callouts) {
      return "蛤？！竟然把無辜星兒送下星船了啦！剛剛帶頭推我的 " + callouts + " 氣場超黑，裡面絕對有酸民狼！";
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
