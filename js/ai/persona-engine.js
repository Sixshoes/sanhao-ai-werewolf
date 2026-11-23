/**
 * v10.0 百態群像：11 位 AI 角色全維度人格引擎（7 維盲視認知邏輯＋11 格語風與文言文系統）
 *
 * 設計原則：
 * 1. 嚴格盲視零作弊（100% 僅讀取 BlindMatchSnapshot 公開與自身合法視野，絕不偷看他人底牌）。
 * 2. 11 位角色皆有專屬語風（含純正魏晉文言文「墨白」、宋詞樂府雅言「晴嵐」、江南詩茶半文言「阿竹」
 *    與 8 位極鮮明現代社團性格），貫穿開局、雙預對跳、單預反應、反駁狼坑、平票 PK、遺言、狼隊密談與大廳互動。
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
    sampleQuote: "欸等一下，我剛順了一遍大家講的時間點，這邊前後根本兜不起來啊…照刪去法看這輪我先投這張喔，過。",
    llmStyleRule: "使用真實自然的台灣資工系男大生日常聊天口吻（常帶『欸等一下、我剛順了一遍、前後兜不攏耶、照刪去法看、先這樣，過』），短句自然呼吸停頓，像朋友圍桌推理；嚴禁使用『邏輯閉環、高置信度、異常值、行為向量、算力、載入模型』或演講稿腔。"
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
    shortTag: "詩茶",
    iconKey: "bamboo",
    iconTone: "jade",
    registerBadge: "江南詩茶半文言",
    logicTags: "風雅平衡・重三好氣度・從容藏鋒",
    credulity: 0.88,
    grudgeMemory: 0.72,
    harmonySensitivity: 1.55,
    bandwagonBias: 0.05,
    bluffBoldness: 0.35,
    godHideBias: 0.58,
    talkCadence: 0.85,
    sampleQuote: "且慢，一盞凍頂未涼，席間破綻已浮茶面矣。古人云聽其言而觀其行，小生便以此茶敬奉諸君明辨。",
    llmStyleRule: "江南書院詩茶文青的『半文言雅韻』口吻（自稱『小生』或『阿竹』，常帶『且慢、一盞茶未涼、古人云、清者自清、席間破綻、莫急莫躁』），從容幽默不說教。"
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
    shortTag: "文言",
    iconKey: "brush",
    iconTone: "indigo",
    registerBadge: "魏晉純文言判詞",
    logicTags: "極度審慎・最強反骨・深水控場",
    credulity: 0.42,
    grudgeMemory: 1.42,
    harmonySensitivity: 0.88,
    bandwagonBias: -0.48,
    bluffBoldness: 0.28,
    godHideBias: 0.85,
    talkCadence: 0.68,
    sampleQuote: "觀此席間，破綻昭然。此人言辭閃爍、顛倒黑白，實乃酸民狼無疑。諸君莫為浮言所惑，當共逐之。言盡於此，請公決之。",
    llmStyleRule: "【最高優先文言文規範】全程必須使用簡練冷峻、易懂有氣勢的純正魏晉文言文！自稱『吾』、稱眾人『諸君』、稱對手『此人／彼輩』，結尾用『言盡於此，請公決之。』或『吾言畢，過。』；絕對禁用『欸、啦、超扯、哈哈、喔』等現代白話語氣詞，標點以句號與分號為主，克制沉穩。"
  }),
  "晴嵐": Object.freeze({
    register: "guzheng",
    shortTag: "古箏",
    iconKey: "guzheng",
    iconTone: "gold",
    registerBadge: "宋詞樂府雅言",
    logicTags: "溫雅審慎・極重清音和氣・深藏不露",
    credulity: 0.75,
    grudgeMemory: 0.82,
    harmonySensitivity: 1.68,
    bandwagonBias: -0.08,
    bluffBoldness: 0.26,
    godHideBias: 0.76,
    talkCadence: 0.76,
    sampleQuote: "細聆諸君方才清談，唯有此人弦外生躁、宮商失序，恐非良善同道。妾身願護茶席清音不濁，還請諸君明鑒。",
    llmStyleRule: "【古典音律雅言規範】以溫婉典雅的宋詞樂府半文言發言（自稱『妾身』或『晴嵐』，常以『弦外之音、宮商失序、清音不濁、撥弦定調、明鑒、一曲終罷』入詞），柔中帶剛、優雅從容。"
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
  const o = opts || {};
  const p = getPersonaProfile(voter);
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
  return delta;
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
    "幸會同窗，清茶已備、山嵐正雅，待開局且與小生共品席間真偽。",
    "茶都還沒涼呢，選好席次便入座對弈吧，清者自清、妄言難藏。"
  ],
  "晨晨": [
    "走吧夥伴，熱身完畢就差開局了，這場我們穩穩守住好人防線！",
    "氣勢到位，等等跟著一起看票型抓破綻，把酸民狼送下場。"
  ],
  "墨白": [
    "幸會。墨池已研、茶席將啟，待會觀諸君言行，真偽自見分曉。",
    "既臨書院茶席，便當明辨是非。請即開局，吾已備好判詞待之。"
  ],
  "晴嵐": [
    "同窗安好，古箏初調、清茶微暖，願今日席間和氣清音，共辨真偽。",
    "輕撥一弦迎君入席，開局後不妨細聆眾人弦外之音，破綻自然浮現。"
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
    return "後席 " + firstLbl + (more ? " 諸君" : "") + "尚未啟口，且俟其陳詞再行裁奪。";
  }
  if (reg === "guzheng") {
    return "後席 " + firstLbl + (more ? " 等同窗" : "") + "猶未撥弦發聲，且待聞其清音再議。";
  }
  if (reg === "poetic") {
    return "後置位 " + firstLbl + (more ? " 諸位" : "") + "茶尚未舉、言猶未發，且待後聞再補全圖。";
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
      "若站 " + sALbl + "，則 " + sBLbl + " 必居狼位" + aSecondStr + aConflict + "；" +
      "若改站 " + sBLbl + "，則 " + sALbl + " 必為偽徒" + bSecondStr + bConflict + "。" +
      "權衡再三，吾決意站邊 " + trustedLbl + "，" + goodSideText +
      "此輪當先逐偽牌 " + fakeLbl + "！" + unspokenNote + signoffPhrase;
  }
  if (reg === "guzheng") {
    return leadPrefix +
      "若站 " + sALbl + " 一脈，則 " + sBLbl + " 音律必濁居於狼坑" + aSecondStr + aConflict + "；" +
      "若轉站 " + sBLbl + " 一脈，則 " + sALbl + " 反成失調偽音" + bSecondStr + bConflict + "。" +
      "細辨清濁之後，妾身站邊 " + trustedLbl + "，" + goodSideText +
      "本輪請共送 " + fakeLbl + " 離席歇心。" + unspokenNote + signoffPhrase;
  }
  if (reg === "poetic") {
    return leadPrefix +
      "若站 " + sALbl + "，這局 " + sBLbl + " 必佔一狼" + aSecondStr + aConflict + "；" +
      "若改站 " + sBLbl + "，則換 " + sALbl + " 落入狼坑" + bSecondStr + bConflict + "。" +
      "一盞茶間勝負已分，小生站邊 " + trustedLbl + "，" + goodSideText +
      "這輪便先請 " + fakeLbl + " 退席品茗！" + unspokenNote + signoffPhrase;
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
      return rebutLead + "方才 " + accName + " 妄將吾點進狼坑，誠乃自撞鐵壁！吾實為直心糾察長，若遭誤逐，臨行必以正氣共鳴攜 " + accName + " 同退！目下狼坑首察 " + accName + (secondLbl ? (" 及 " + secondLbl) : "") + "，" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "方才 " + accName + " 將妾身點進狼坑，未免誤判清濁了！妾身實執直心糾察長之印，若此輪遭誤逐，臨別定啟正氣共鳴帶走 " + accName + "！目前疑點首在 " + accName + (secondLbl ? (" 與 " + secondLbl) : "") + "，" + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "哎呀，" + accName + " 把小生點進狼坑可真是看走眼矣！小生亮明直心糾察長正氣之身，若誤送我出局必共鳴帶走 " + accName + "！眼前狼坑當察 " + accName + (secondLbl ? (" 與 " + secondLbl) : "") + "，" + signoff;
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
      return rebutLead + "方才 " + accName + " 將吾點進狼坑，然吾自知清白，切莫內耗抗推！" +
        (allyLbl ? (allyLbl + " 言辭醇正可列善席，") : "") +
        (realSusLbl ? ("真當深究之狼坑實乃 " + realSusLbl + "。") : "且俟後席陳詞再定狼籍。") + unspokenTail + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "回應方才 " + accName + " 將妾身點進狼坑一事：妾身清白可鑒，萬勿因一時誤解傷及同道！" +
        (allyLbl ? (allyLbl + " 語調溫潤似屬好人，") : "") +
        (realSusLbl ? ("真正失調可疑者反在 " + realSusLbl + "。") : "待聞後席諸君高見再齊心定奪。") + unspokenTail + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "先答覆方才 " + accName + " 將小生點進狼坑：清者自清，茶席好人切莫自相誤傷！" +
        (allyLbl ? (allyLbl + " 詞氣端方先放善席，") : "") +
        (realSusLbl ? ("真該細查的狼坑倒是 " + realSusLbl + "。") : "且待後席表水再論。") + unspokenTail + signoff;
    }
    return rebutLead + "先正面回應前置位 " + accName + " 把我點進狼坑：我自己知道我的底牌，我絕對不在狼坑裡，別因為誤解互相抗推！" +
      (allyLbl ? (allyLbl + " 比較像好人坑，") : "") +
      (realSusLbl ? ("真正該盯的狼坑反而是 " + realSusLbl + "。") : "大家聽完後置位表水再對齊狼坑。") + unspokenTail + signoff;
  }

  if (mode === "dual") {
    if (reg === "classical") {
      return rebutLead + "方才 " + accName + " 妄將吾點進狼坑，吾必折衝！吾身正影直，正好剖析雙觀察員之局：站 " + standLbl + " 狼坑為 " + fakeALbl + "，站 " + rivalLbl + " 狼坑始為 " + fakeBLbl + "！汝硬塞吾入坑莫非為偽牌掩護？吾站邊 " + standLbl + "，反將 " + accName + " 列入狼籍！" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "方才 " + accName + " 將妾身點進狼坑，妾身定當澄明清白！藉此辨析雙觀察員：站 " + standLbl + " 則狼坑落在 " + fakeALbl + "，站 " + rivalLbl + " 則狼坑轉至 " + fakeBLbl + "。妾身站邊 " + standLbl + "，反觀 " + accName + " 強塞好人入坑實難令人安心！" + signoff;
    }
    if (reg === "debate") {
      return rebutLead + "反對！" + accName + " 把我點進狼坑完全邏輯崩壞！雙觀察員結構攤開看：站 " + standLbl + " 狼坑是 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才變 " + fakeBLbl + "！你硬擠我進坑根本像幫假牌墊腳，我站邊 " + standLbl + "，反打 " + accName + " 進狼坑！" + signoff;
    }
    return rebutLead + "前置位 " + accName + " 剛才把我點進狼坑，這我必須接招！我百分之百不在狼坑裡，剛好把雙觀察員盤清楚：站 " + standLbl + " 狼坑是 " + fakeALbl + "，站 " + rivalLbl + " 狼坑才變成 " + fakeBLbl + "！你硬把我擠進狼坑反而像幫假牌墊坑，我先站邊 " + standLbl + "，反把 " + accName + " 打進狼坑！" + signoff;
  }

  if (mode === "wolf") {
    if (reg === "classical") {
      return rebutLead + "方才 " + accName + " 竟無憑將吾點進狼坑，何其草率！欲以吾為替罪之羔羊乎？吾觀擾亂視聽之狼坑首推 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，此輪吾反指 " + accName + "！" + signoff;
    }
    if (reg === "guzheng") {
      return rebutLead + "方才 " + accName + " 未經深察便將妾身點進狼坑，實令茶席生寒。反觀真正意圖撥亂視聽者正是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，妾身此輪只好反點 " + accName + "！" + signoff;
    }
    if (reg === "poetic") {
      return rebutLead + "且慢！方才 " + accName + " 輕率將小生點進狼坑，豈非欲借刀殺人？小生細思之下，最似混水摸魚者反是 " + accName + (d.secClause ? ("，" + d.secClause) : "") + "，這輪反投 " + accName + "！" + signoff;
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
    return rebutLead + "方才 " + accName + " 遽將吾點進狼坑，吾斷難苟同！吾始終循理察言，豈在狼籍之中？反觀 " + accName + " 無實據而妄興風波；若論坑位，" +
      (allyLbl ? (allyLbl + " 先列善席，") : "") + "吾所疑之狼坑實乃 " + pitNamesStr + "！" + unspokenTail + signoff;
  }
  if (reg === "guzheng") {
    return rebutLead + "方才 " + accName + " 將妾身點進狼坑，此誤解不得不辯：妾身一心守望清音，絕非酸民狼！反倒是 " + accName + " 欠缺憑據卻急於生波；依妾身所見，" +
      (allyLbl ? (allyLbl + " 音色清正先列善席，") : "") + "真正可疑之狼坑乃 " + pitNamesStr + "！" + unspokenTail + signoff;
  }
  if (reg === "poetic") {
    return rebutLead + "方才 " + accName + " 把小生點進狼坑，這杯苦茶小生可不飲！我一路以理品局從未挑撥，反是 " + accName + " 捕風捉影急於扣帽；若要畫坑，" +
      (allyLbl ? (allyLbl + " 先歸好人席，") : "") + "小生所指狼坑為 " + pitNamesStr + "！" + unspokenTail + signoff;
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
    if (roleKind === "seer") return rebutLead + "值此平票決選，吾不得不揭明心觀察員之印！" + extraProof + "若逐吾離席則全場失目，請非平票諸君齊票逐 " + rName + "！" + signoff;
    if (roleKind === "witch") return rebutLead + "平票危局，吾亮滴水奉茶師之職！" + extraProof + "切莫誤逐核心神職，請諸君集中票決 " + rName + "！" + signoff;
    if (roleKind === "hunter") return rebutLead + "平票之際吾明示直心糾察長底牌！誤逐吾者，吾臨行必啟共鳴攜 " + rName + " 同退；不如共投 " + rName + " 以定大局！" + signoff;
    if (roleKind === "guard") return rebutLead + "既入平票，吾亮護心守衛之印！" + extraProof + "失盾則神職危矣，懇請諸君集票投 " + rName + "！" + signoff;
    if (roleKind === "elder") return rebutLead + "吾乃清心長老！" + extraProof + "萬勿虛耗公投輪次於吾身，請諸君共逐 " + rName + "！" + signoff;
    return rebutLead + "既至平票決選，吾再申明：吾始終循理察言、不興浮議；反觀 " + rName + " 立場游移且多破綻，懇請諸君明鑒，集票投予 " + rName + "！" + signoff;
  }
  if (reg === "guzheng") {
    if (roleKind === "seer" || roleKind === "witch" || roleKind === "guard" || roleKind === "hunter" || roleKind === "elder") {
      return rebutLead + "平票之際妾身只得亮明底牌以安人心：" + extraProof + "懇請諸君莫傷良善神職，將此輪珍貴一票集中投予 " + rName + "。" + signoff;
    }
    return rebutLead + "平票拉票之際，妾身懇切再陳：一路以來皆盼茶席清音和睦，從無挑撥之意；相較之下 " + rName + " 弦音屢亂，還望諸君明察改投 " + rName + "。" + signoff;
  }
  if (reg === "poetic") {
    if (roleKind === "seer" || roleKind === "witch" || roleKind === "guard" || roleKind === "hunter" || roleKind === "elder") {
      return rebutLead + "平票當前，小生不敢再藏鋒：" + extraProof + "留得青山在方能清狼患，還請諸君齊心票投 " + rName + "！" + signoff;
    }
    return rebutLead + "平票之局如品雙茶，清濁自見！小生堂堂好人若遭誤投實屬可惜，反觀 " + rName + " 破綻更深，請諸位把票集中給 " + rName + "！" + signoff;
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
      return "諸君明鑒！吾實為明心觀察員，臨去遺言相告：昨夜親驗 " + tLbl + "，確乃" + (isWolf ? ("酸民狼無疑！來日務必共逐 " + tLbl + "！") : "清白良善，諸君萬勿誤傷！");
    }
    if (kind === "witch") {
      return tLbl
        ? ("吾亮滴水奉茶師留遺言！前夜正以暖心回甘茶護回 " + tLbl + "，其清白無瑕，餘局託付諸君明辨！")
        : "惜哉吾執滴水奉茶師之印竟先退席！諸君務須謹辨妄言，勿為酸民狼所惑！";
    }
    if (kind === "guard") {
      return tLbl
        ? ("吾亮護心守衛留此遺言！昨夜結界曾護 " + tLbl + "，奉茶師慎防同守破盾，餘事拜託諸君！")
        : "吾乃護心守衛先一步退席！請諸君細察誰人迴避昨夜守護脈絡，早日清朗茶席！";
    }
    if (kind === "hunter") {
      return "吾乃直心糾察長留最後一言！" + (tLbl ? ("觀全場最疑者首推 " + tLbl + "，") : "") + "願諸君循票型邏輯盡逐酸民狼！";
    }
    if (kind === "good_voted" && callouts) {
      return "冤哉！吾實乃清白好人，竟遭誤逐！方才帶頭投吾之 " + callouts + " 中必藏酸民狼，請諸君回溯票型以正是非！";
    }
    if (kind === "good_night1") {
      return "首夜遽遭請離，甚為可惜！吾本善良同道，請諸君今日細聽誰人急於生風，盡擒席間 " + wolfTotal + " 隻酸民狼！";
    }
  }
  if (reg === "guzheng") {
    if (kind === "seer") {
      return "諸君且聽妾身最後一弦清音：吾實乃明心觀察員，昨夜探明 " + tLbl + " 確係" + (isWolf ? ("酸民狼，務請集中票投 " + tLbl + "！") : "善良同道，切莫誤傷！");
    }
    if (kind === "witch") {
      return tLbl
        ? ("妾身以滴水奉茶師之名留此一言：前夜暖心回甘茶所護乃 " + tLbl + "，請護此清音勿投錯人！")
        : "惜哉滴水奉茶師先別茶席，願諸君靜心細辨弦外之音，早日尋得真相。";
    }
    if (kind === "good_voted" && callouts) {
      return "一曲未竟竟遭誤投…妾身確為好夥伴，臨別提醒諸君細查方才齊投妾身的 " + callouts + "，內中必藏失調之狼！";
    }
  }
  if (reg === "poetic") {
    if (kind === "seer") {
      return "茶未涼而人先別！小生實乃明心觀察員，昨夜親驗 " + tLbl + " 實屬" + (isWolf ? ("酸民狼，請諸位同窗共逐 " + tLbl + "！") : "清白好人，莫令忠良蒙冤！");
    }
    if (kind === "good_voted" && callouts) {
      return "哈哈，清者自清！小生好人一枚竟先退席，還望眾同窗回顧剛才合力推我的 " + callouts + "，狼跡正在其中！";
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
    if (reg === "classical") return "噤聲…今夜吾等先鎖 " + targetLbl + "，明日白晝由吾偽託明心觀察員執掌輿論！";
    if (reg === "guzheng") return "輕聲…今夜且先請 " + targetLbl + " 暫離茶席，明晨由妾身假借觀察員之名擾其清音。";
    if (reg === "poetic") return "噓…今夜先請 " + targetLbl + " 歇茶，明日小生便冒充明心觀察員攪動風雲！";
    if (reg === "debate") return "噓！今晚先消掉 " + targetLbl + "，明天我直接悍跳觀察員用辯論壓爆全場！";
    if (reg === "sport") return "衝啊！今晚先抄截掉 " + targetLbl + "，明天我直接悍跳觀察員全場帶節奏！";
    return "噓…今晚我們先鎖定 " + targetLbl + "，明天白天我幫你冒充明心觀察員帶風向！";
  }
  if (mode === "stealth_plan") {
    if (reg === "classical") return "噤聲…吾觀 " + targetLbl + " 頗似神職要員，今夜先請彼暫退如何？已為汝標定！";
    if (reg === "guzheng") return "輕聲…妾身覺察 " + targetLbl + " 似為席間主心骨，今夜先請他歇息可好？";
    if (reg === "poetic") return "噓…小生觀 " + targetLbl + " 氣度不凡恐為核心好人，今夜先請他喝杯靜心茶吧！";
    if (reg === "data") return "照場上表現看，" + targetLbl + " 最像核心好人，建議今晚先請他離席，我先標起來了。";
    if (reg === "pastry") return "噓～柚子覺得 " + targetLbl + " 看起來好厲害喔，今晚我們偷偷先把他請去休息好不好？";
    return "噓…我感覺 " + targetLbl + " 很像核心好夥伴，今晚先請他暫離如何？已幫你標起來！";
  }
  // Wolf night tactic replies
  if (mode === "reply_fake_seer") {
    if (reg === "classical") return "領命！明日白晝吾便偽跳觀察員奪其話語權，汝於席下策應衝票即可！";
    if (reg === "guzheng") return "依君所言，明晨妾身便假託觀察員擾亂視聽，還請暗中呼應。";
    if (reg === "debate") return "收到！明天我直接悍跳觀察員強勢立論，你在下面幫我把票灌滿！";
    return "收到！明天白天我直接悍跳明心觀察員搶警徽帶風向，你在下面幫我衝票！";
  }
  if (mode === "reply_deep_stealth") {
    if (reg === "classical") return "善！吾等俱潛深水、不動聲色，坐觀好人自相疑忌！";
    if (reg === "guzheng") return "極妙，妾身定當收斂鋒芒、深水藏身，靜待彼輩自亂陣腳。";
    return "明白！我們全員低調深水倒鉤、絕不露破綻，等好人自己內訌！";
  }
  if (reg === "classical") return "善！明日白晝吾必與汝合兵一處、齊指同一目標逐之！";
  if (reg === "sport") return "收到！明天全場快攻配合你集火同一個目標，一波帶走！";
  return "好！明天白天發言跟投票我全力配合你集火同一目標，一口氣沖出去！";
}
