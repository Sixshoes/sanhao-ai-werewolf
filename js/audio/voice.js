/**
 * 多角色配音設定、自然分句停頓（Web Speech）與 Gemini Studio TTS 語音引擎
 */
"use strict";

// ==================== MULTI-ACTOR STUDIO VOICE + NATURAL PROSODY ENGINE ====================
const PERSONA_VOICE_PROFILES = {
  "主持":  { gender: "f", slot: 0, seatHint: 0, studioVoice: "Sulafat",      pitch: 1.05, basicPitch: 1.04, rateMul: 0.99 },
  "你":    { gender: "f", slot: 1, seatHint: 1, studioVoice: "Aoede",        pitch: 1.08, basicPitch: 1.05, rateMul: 1.02 },
  "你_男": { gender: "m", slot: 0, seatHint: 1, studioVoice: "Achird",       pitch: 0.94, basicPitch: 0.98, rateMul: 1.00 },
  "小澄":  { gender: "m", slot: 1, seatHint: 2, studioVoice: "Orus",         pitch: 0.96, basicPitch: 1.00, rateMul: 1.04 },
  "暖暖":  { gender: "f", slot: 2, seatHint: 3, studioVoice: "Leda",         pitch: 1.12, basicPitch: 1.08, rateMul: 0.99 },
  "阿松":  { gender: "m", slot: 2, seatHint: 4, studioVoice: "Charon",       pitch: 0.85, basicPitch: 0.94, rateMul: 0.94 },
  "星兒":  { gender: "f", slot: 3, seatHint: 5, studioVoice: "Zephyr",       pitch: 1.18, basicPitch: 1.13, rateMul: 1.11 },
  "小雲":  { gender: "f", slot: 4, seatHint: 6, studioVoice: "Autonoe",      pitch: 1.06, basicPitch: 1.04, rateMul: 1.07 },
  "阿竹":  { gender: "m", slot: 3, seatHint: 7,  studioVoice: "Enceladus",   pitch: 0.90, basicPitch: 0.96, rateMul: 0.95 },
  "晨晨":  { gender: "m", slot: 4, seatHint: 8,  studioVoice: "Puck",        pitch: 1.04, basicPitch: 1.03, rateMul: 1.08 },
  "墨白":  { gender: "m", slot: 5, seatHint: 9,  studioVoice: "Iapetus",     pitch: 0.80, basicPitch: 0.93, rateMul: 0.92 },
  "晴嵐":  { gender: "f", slot: 5, seatHint: 10, studioVoice: "Vindemiatrix", pitch: 1.04, basicPitch: 1.03, rateMul: 0.98 },
  "阿朗":  { gender: "m", slot: 6, seatHint: 11, studioVoice: "Fenrir",      pitch: 0.99, basicPitch: 1.01, rateMul: 1.06 },
  "柚子":  { gender: "f", slot: 6, seatHint: 12, studioVoice: "Laomedeia",   pitch: 1.26, basicPitch: 1.18, rateMul: 1.13 }
};

const PERSONA_TTS_DIRECTIONS = {
  "主持":  "二十三歲氣質清朗的台灣年輕女主持人，聲線輕亮溫潤、自然親切，像茶席裡年輕的大姊姊從容引導，絕不老成播音",
  "你":    "二十歲出頭自然開朗的台灣女大學生日常對話口吻，音色清脆有青春感、呼吸自然不唸稿",
  "你_男": "二十多歲自然放鬆的台灣男大學生日常口語，像坐在茶桌旁跟朋友輕鬆聊天，語調有起伏、不唸稿",
  "小澄":  "二十多歲冷靜斯文的台灣理科男大生，聲線清晰俐落、不急不躁，像戴眼鏡的理智學長在茶桌旁條理分析",
  "暖暖":  "二十歲出頭溫柔甜美、音色清亮的台灣女大生日常聊天聲線，笑意柔和自然、年輕有親和力，絕不顯老",
  "阿松":  "年約四十多歲、聲音低沉渾厚有磁性的台灣成熟大叔，像茶館裡見多識廣的老大哥親切泡茶聊天，語速沉穩帶點幽默人情味",
  "星兒":  "十八九歲活潑機靈的台灣元氣少女口語，聲線清亮輕快、帶點古靈精怪的直覺反應",
  "小雲":  "二十二歲俐落聰明的台灣校園新聞社女大生聲線，音色清亮明快、咬字爽朗有青春朝氣，像年輕學姊拿著筆記俐落追問，絕不低沉老氣",
  "阿竹":  "二十多歲溫潤斯文的台灣青年男聲，聲音輕柔誠懇、語速從容柔和，像愛泡茶的溫和文青學長自然交談",
  "晨晨":  "二十出頭陽光熱血的台灣運動系大男孩，聲音明亮爽朗、語速輕快有朝氣，像球社好友直接開心表態",
  "墨白":  "二十五六歲清冷克制的台灣青年低沉男聲，聲線沉靜乾淨、說話簡短篤定，帶點書卷氣但自然不朗誦",
  "晴嵐":  "二十二歲清雅柔美的台灣國樂社年輕女大生聲線，音色輕柔清甜、語氣文雅從容但充滿少女清靈感，絕不低沉老成",
  "阿朗":  "二十多歲自信俐落的台灣男大生辯手聲線，吐字清脆有力、抑揚頓挫鮮明、節奏明快",
  "柚子":  "十八九歲甜美可愛的台灣女大生學妹口語，語調輕盈清甜、笑意自然元氣滿滿"
};

// 圓桌聽眾臨場微插話台詞庫（純依公開發言點名／對跳／保人觸發，零底牌洩漏，固定短句 100% 命中快取）
const PERSONA_BACKCHANNEL_CLIPS = {
  "小澄": { accuse: ["等一下，這對不上吧…", "先看證據好嗎。"], vouch: ["嗯，時間線對了。"], clash: ["等一下，雙邊邏輯要重盤！"] },
  "暖暖": { accuse: ["咦？怎麼會懷疑我…", "先別急著誤會嘛…"], vouch: ["嗯嗯，謝謝相信我～"], clash: ["哇…兩邊都跳出來了耶…"] },
  "阿松": { accuse: ["喂喂，這帽子扣太快了吧…", "老松可沒問題啊。"], vouch: ["哈哈，算你內行。"], clash: ["喔？這下有好戲看囉。"] },
  "星兒": { accuse: ["蛤？才不是我咧！", "咦？這直覺歪掉了吧！"], vouch: ["耶！你懂我！"], clash: ["哇塞，真假對跳耶！"] },
  "小雲": { accuse: ["等一下，這指控沒根據。", "我記的時間不是這樣。"], vouch: ["嗯，查核無誤。"], clash: ["慢著，兩邊說詞先記下來。"] },
  "阿竹": { accuse: ["且慢，此言差矣…", "莫急著定罪呀。"], vouch: ["承蒙信重。"], clash: ["且看兩邊如何分說。"] },
  "晨晨": { accuse: ["欸不是吧，打錯人了啦！", "喂！看清楚再投啊！"], vouch: ["謝啦好兄弟！"], clash: ["正面對決了是不是！"] },
  "墨白": { accuse: ["荒謬。", "無稽之談。"], vouch: ["善。"], clash: ["真偽立判。"] },
  "晴嵐": { accuse: ["且慢定論呀…", "此話未免太急了…"], vouch: ["多謝明鑒。"], clash: ["弦音相衝，且細聽之。"] },
  "阿朗": { accuse: ["我方提出異議！", "請問證據在哪？"], vouch: ["論點成立。"], clash: ["進入交叉對質！"] },
  "柚子": { accuse: ["咦～冤枉柚子了啦！", "蛤？不是我呀！"], vouch: ["嘿嘿謝謝你！"], clash: ["哇！兩個人撞身分了！"] }
};

// 內建「清茗主持人」高品質預生成神經語音包（0ms 零等待秒播，純靜態 GitHub Pages／Vercel／離線皆可直接發聲！）
const HOST_VOICE_PACK_MAP = {
  "天黑請閉眼，山城入夜，請各位靜待神秘行動。": "assets/voice_pack/host_night_intro.mp3",
  "第1晚，天黑請靜心。": "assets/voice_pack/host_n1_quiet.mp3",
  "第2晚，天黑請靜心。": "assets/voice_pack/host_n2_quiet.mp3",
  "第3晚，天黑請靜心。": "assets/voice_pack/host_n3_quiet.mp3",
  "第4晚，天黑請靜心。": "assets/voice_pack/host_n4_quiet.mp3",
  "第1晚，天黑請靜心。護心守衛請選擇今晚要守護的座位。": "assets/voice_pack/host_n1_guard.mp3",
  "第2晚，天黑請靜心。護心守衛請選擇今晚要守護的座位。": "assets/voice_pack/host_n2_guard.mp3",
  "第1晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象。": "assets/voice_pack/host_n1_wolf.mp3",
  "第1晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象，並可於屏風密謀指定明日戰術。": "assets/voice_pack/host_n1_wolf.mp3",
  "第2晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象。": "assets/voice_pack/host_n2_wolf.mp3",
  "第2晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象，並可於屏風密謀指定明日戰術。": "assets/voice_pack/host_n2_wolf.mp3",
  "第1晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。": "assets/voice_pack/host_n1_seer.mp3",
  "第2晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。": "assets/voice_pack/host_n2_seer.mp3",
  "滴水奉茶師請睜眼，要端出清心醒神茶請可疑者離席冷靜嗎？": "assets/voice_pack/host_witch_ask.mp3",
  "第1天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。": "assets/voice_pack/host_d1_peace.mp3",
  "第2天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。": "assets/voice_pack/host_d2_peace.mp3",
  "輪到1號你發言了，請選擇卡牌表態。": "assets/voice_pack/host_turn_p1.mp3",
  "輪到1號你發言了，可點選詞卡組裝陳詞後送出。": "assets/voice_pack/host_turn_p1.mp3",
  "全員發言結束，請點擊外圍座位投票抓狼。": "assets/voice_pack/host_vote_open.mp3",
  "全員發言結束，開始計票。": "assets/voice_pack/host_vote_count.mp3",
  "開票完成，本輪平票沒有人出局，請點擊進入夜晚。": "assets/voice_pack/host_vote_tie_none.mp3",
  "平票對決拉票結束，依凹嗚規則由非平票玩家進行決選投票！": "assets/voice_pack/host_pk_vote.mp3",
  "警上輪流發言結束！請警下夥伴投票選出本局警長！": "assets/voice_pack/host_sheriff_vote.mp3",
  "警上輪流發言結束！你是警上候選人，請點擊開始警下開票決選！": "assets/voice_pack/host_sheriff_cand.mp3",
  "請警長指定今日發言順序，順時針或逆時針！": "assets/voice_pack/host_sheriff_order.mp3",
  "你是本局警長，離席前請依你的警徽流決定將警徽移交給哪一位存活夥伴，或當場撕毀警徽傳遞查殺訊號。": "assets/voice_pack/host_sheriff_pass.mp3",
  "昨晚你首夜離席，請發表首夜遺言留下線索給好人夥伴。": "assets/voice_pack/host_lw_night1.mp3",
  "你已高票離席，請發表最後遺言，場上玩家會記住你的線索。": "assets/voice_pack/host_lw_vote.mp3",
  "遺言結束，你可以選擇直接結束看底牌，或繼續往下看觀戰。": "assets/voice_pack/host_lw_done.mp3",
  "對局提前結束，全員底牌揭曉！": "assets/voice_pack/host_gameover_early.mp3"
};

// v24.1 「評審三分鐘精華導覽局」預錄真人級多角色神經語音包（8 支 1 對 1 唯一鍵，Vercel 靜態零金鑰 0.02s 秒播＋真實 FFT 對嘴）
const SHOWCASE_VOICE_PACK_MAP = {
  "阿松|各位別急著一面倒啊，昨天7號怎麼投票是他的事，跟我無關！我才是一路扛壓的真明心觀察員，昨夜查了1號，他才是穿我衣服的假觀察員，這輪聽我一次，先出5號或1號，過。": "assets/voice_pack/showcase/showcase_asong_day2.mp3",
  "阿松|盤面剛變了嘛，我照新線索調整很正常啊。": "assets/voice_pack/showcase/showcase_asong_grill_flip.mp3",
  "阿松|欸別這麼急著盯我啦，我只是講我看到的而已。": "assets/voice_pack/showcase/showcase_asong_grill_defend.mp3",
  "阿松|唉，算你們票型對得夠細，昨晚7號被請離後我本來想再硬扛一輪的。這局輸得心服口服，茶席推論確實精彩！": "assets/voice_pack/showcase/showcase_asong_lw.mp3",
  "小澄|場上只剩五人聽牌，回看第1天票型，7號嘴上說打5號卻跟4號同票衝走6號，現在7號已經被奉茶師清心請離，4號幾乎沒退路了。": "assets/voice_pack/showcase/showcase_xiaocheng_d2.mp3",
  "暖暖|我亮滴水奉茶師身分，第1夜平安是守衛擋下，昨晚見7號言票背離太重已端清心醒神茶請他離席，今天跟著1號警長歸票收尾。": "assets/voice_pack/showcase/showcase_nuannuan_d2.mp3",
  "星兒|我是直心糾察長，昨天7號喊打我卻改票衝6號，跟4號完全綁在一起。先聽4號怎麼圓，等下看1號警長壓軸定調。": "assets/voice_pack/showcase/showcase_xinger_d2.mp3",
  "主持|全場酸民狼已清出茶席，好人陣營大獲全勝，恭喜各位守住清茗茶席！": "assets/voice_pack/showcase/showcase_host_good_win.mp3"
};

const voice = {
  enabled: true,
  mode: "hybrid", // "hybrid" (自然人聲＋角色樂音簽名), "tts" (純淨自然人聲), "cozy" (療癒原音樂音)
  accentMode: "anime", // "anime" (12角色聲線差異最大化) | "tw" (純台灣腔＋共振峰拉開)
  enginePref: "auto", // "auto" (有金鑰優先 Gemini 3.8 氣口演技，無金鑰免費神經) | "local" ($0 免費神經) | "gemini" (Gemini 3.8 TTS)
  liveBackchannel: false, // 圓桌被點名／對跳臨場立體聲微插話（預設關閉，確保純淨單人發聲零背景重疊）
  humanBreath: true, // 真人開口微換氣與無縫呼吸銜接
  selectedVoiceUri: "auto",
  primed: false,
  speaking: false,
  paused: false,
  pauseMeta: null,
  localNeuralAvailable: false,
  localNeuralChecked: false,
  _localTtsEndpointUnavailable: false,
  cloudGeminiTtsAvailable: false,
  cloudGeminiTtsChecked: false,
  cloudGeminiTtsCooldownUntil: 0,
  _cloudTtsFailStreak: 0,
  volume: 0.86,
  rate: 0.96,
  zhVoices: [],
  maleVoices: [],
  femaleVoices: [],
  allVoices: [],
  activeUtterance: null,
  activeAudioNode: null,
  activeAudioGain: null,
  activePersonaName: null,
  utteranceSeq: 0,
  watchdogTimer: null,
  keepAliveTimer: null,
  clauseTimer: null,
  studioCache: {},
  studioPending: {},
  cloudTtsAudioCache: new Map(),
  cloudTtsInflightMap: new Map(),
  _studioCacheRef: null,
  _studioPendingRef: null,
  _activeLiveTtsController: null,
  _cloudTtsHardFailSpeakers: [],
  hostPackCache: {},
  localNeuralCache: {},
  localNeuralPending: {},
  _liveTargetPbRate: 1.0,
  _liveBufferState: null,
  _liveBrowserRestart: null,
  lastSpokenPayload: null,
  _lastBackchannelAt: 0,
  _lastBackchannelTurnKey: "",

  resolvePersonaKey: function (personaName) {
    if (personaName === "你" && typeof state !== "undefined" && state.playerGender === "m") {
      return "你_男";
    }
    return personaName || "暖暖";
  },

  warmupCommonHostLines: function () {
    if (!this.localNeuralAvailable || this.warmedUpCommon) return;
    this.warmedUpCommon = true;
    const self = this;
    setTimeout(function () {
      self.prefetchFreeLocalNeural("主持", "第1晚，天黑請靜心。", "host_night");
      self.prefetchFreeLocalNeural("主持", "輪到1號你發言了，可點選詞卡組裝陳詞後送出。", "normal");
    }, 1200);
  },

  isStaticCloudHost: function () {
    try {
      const host = (typeof window !== "undefined" && window.location && window.location.hostname)
        ? String(window.location.hostname).toLowerCase()
        : "";
      return Boolean(host && /(?:^|\.)(?:vercel\.app|netlify\.app|github\.io|pages\.dev)$/.test(host));
    } catch (e) {
      return false;
    }
  },

  probeCloudGeminiTts: async function () {
    if (this.cloudGeminiTtsChecked) return this.cloudGeminiTtsAvailable;
    this.cloudGeminiTtsChecked = true;
    try {
      if (typeof window === "undefined" || !window.location || !/^https?:$/.test(window.location.protocol) || typeof fetch !== "function") {
        return false;
      }
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const t = controller ? setTimeout(function () { controller.abort(); }, 2600) : null;
      const res = await fetch("/api/tts", controller ? { method: "GET", cache: "no-store", signal: controller.signal } : { method: "GET", cache: "no-store" });
      if (t) clearTimeout(t);
      if (res && res.ok) {
        const data = await res.json().catch(function () { return null; });
        this.cloudGeminiTtsAvailable = Boolean(data && data.ok && data.available && data.mode === "vercel-gemini-tts");
      } else {
        this.cloudGeminiTtsAvailable = false;
      }
    } catch (e) {
      this.cloudGeminiTtsAvailable = false;
    }
    this.updateEngineStatusUi();
    return this.cloudGeminiTtsAvailable;
  },

  isCloudGeminiTtsActive: function () {
    if (!this.cloudGeminiTtsAvailable) return false;
    if (this.cloudGeminiTtsCooldownUntil && Date.now() < this.cloudGeminiTtsCooldownUntil) return false;
    if (typeof state !== "undefined" && state.serverGeminiOptOut) return false;
    return true;
  },

  isMobileTtsNetworkEnv: function () {
    if (typeof state !== "undefined" && typeof state._forceMobileTtsBudget === "boolean") {
      return state._forceMobileTtsBudget;
    }
    if (typeof detectTutorialDeviceMode === "function") {
      if (detectTutorialDeviceMode() === "phone") return true;
    }
    try {
      const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? String(navigator.userAgent) : "";
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
      const conn = (typeof navigator !== "undefined") && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
      const effType = conn && conn.effectiveType ? String(conn.effectiveType).toLowerCase() : "";
      if (effType === "slow-2g" || effType === "2g" || effType === "3g") return true;
    } catch (e) {}
    return false;
  },

  probeLocalNeuralServer: async function () {
    if (this.localNeuralChecked) return this.localNeuralAvailable;
    this.localNeuralChecked = true;
    try {
      if (typeof window === "undefined" || !window.location || !/^https?:$/.test(window.location.protocol)) {
        return false;
      }
      if (this.isStaticCloudHost()) {
        this._localTtsEndpointUnavailable = true;
        this.localNeuralAvailable = false;
        await this.probeCloudGeminiTts();
        this.updateEngineStatusUi();
        this.refreshVoices();
        return false;
      }
      const controller = new AbortController();
      const t = setTimeout(function () { controller.abort(); }, 1800);
      const res = await fetch("/api/tts/status", { signal: controller.signal, cache: "no-store" });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        this.localNeuralAvailable = Boolean(data && data.freeNeural);
        if (!this.localNeuralAvailable) {
          await this.probeCloudGeminiTts();
        }
      } else if (res.status === 404 || res.status === 405 || res.status === 501) {
        this._localTtsEndpointUnavailable = true;
        this.localNeuralAvailable = false;
        await this.probeCloudGeminiTts();
      }
    } catch (e) {
      this.localNeuralAvailable = false;
    }
    this.updateEngineStatusUi();
    this.refreshVoices();
    if (this.localNeuralAvailable) this.warmupCommonHostLines();
    return this.localNeuralAvailable;
  },

  getLiveMouthLevel: function (seatId, nowMs) {
    if (typeof sound !== "undefined") {
      const live = sound.getVoiceMouthLevel();
      if (live > 0.02) return live;
    }
    if (this.speaking || (state.typewriter && state.typewriter.active)) {
      const t = (nowMs || 0) * 0.001;
      // Organic non-repetitive speech cadence fallback when browser SpeechSynthesis is active
      const s1 = Math.abs(Math.sin(t * 14.5 + (seatId || 1) * 1.9));
      const s2 = Math.abs(Math.sin(t * 6.3 + (seatId || 1) * 0.7));
      return clamp(s1 * 0.68 + s2 * 0.25, 0.12, 0.92);
    }
    return 0;
  },

  isSupported: function () {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  },

  canSpeak: function () {
    return this.enabled && (this.mode === "tts" || this.mode === "hybrid") && this.volume > 0.02 && (this.isSupported() || this.localNeuralAvailable || this.cloudGeminiTtsAvailable || Boolean(typeof sound !== "undefined" && sound.ctx) || Boolean(typeof state !== "undefined" && state.geminiApiKey));
  },

  getModeLabel: function () {
    if (!this.enabled) return "語音:關";
    if (this.mode === "cozy") return "語音:樂音";
    if (this.mode === "tts") return "語音:人聲";
    return "語音:柔聲";
  },

  isNoveltyOrRoboticVoice: function (v) {
    const name = String(v.name || "");
    return /\b(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph)\b/i.test(name);
  },

  scoreVoiceQuality: function (v) {
    const lang = String(v.lang || "");
    const name = String(v.name || "");
    if (this.isNoveltyOrRoboticVoice(v)) return -200;
    let score = 0;
    const isTw = /zh[-_]?tw/i.test(lang) || /Taiwan|臺灣|台灣|HsiaoChen|HsiaoYu|YunJhe|Meijia|Mei-Jia|美佳/i.test(name);
    if (isTw) score += 72;
    else if (/^zh|^cmn/i.test(lang)) score += 25;

    if (/Online.*Natural|Natural.*Online|Natural|Neural/i.test(name)) score += 145;
    else if (/Siri|Premium|優質|Enhanced|進階/i.test(name)) score += 115;
    else if (/Google\s*國語|Google.*Taiwan/i.test(name)) score += 90;
    else if (/Google.*Chinese|Google\s*普通话/i.test(name)) score += 72;
    else if (/Meijia|Mei-Jia|美佳/i.test(name)) score += 45;
    else if (/Tingting|婷婷/i.test(name)) score += 35;

    if (/Desktop|Hanhan|Yating|Zhiwei|Kangkang|Huihui|Yaoyao|Compact/i.test(name) && !/Natural|Online|Enhanced|Premium/i.test(name)) score -= 60;
    return score;
  },

  isMaleVoice: function (v) {
    const name = String(v.name || "");
    return /YunJhe|Yunxi|Yunjian|Yunyang|Yunjie|Yunze|Yunfeng|Yunhao|Zhiwei|Kangkang|Yu-?shu|Li-?mu|Male|男/i.test(name);
  },

  updateEngineStatusUi: function () {
    try {
      const zh = this.zhVoices || [];
      const bestScore = zh.length ? this.scoreVoiceQuality(zh[0]) : 0;
      const lbl = document.getElementById("voiceEngineStatusLabel");
      const hintBox = document.getElementById("voiceQualityHintBox");
      if (lbl) {
        const hasGemKey = Boolean(typeof state !== "undefined" && state.geminiApiKey);
        const hasCloudTts = this.isCloudGeminiTtsActive();
        const useGemFirst = (hasGemKey || hasCloudTts) && this.enginePref !== "local";
        if (this.mode === "cozy") {
          lbl.textContent = "目前：12角色療癒原音樂音（零機械感・3D定位）";
        } else if (useGemFirst && hasCloudTts && !hasGemKey) {
          lbl.textContent = "雲端 Gemini 真人語音已連線（12 位自然角色聲線）";
        } else if (useGemFirst) {
          lbl.textContent = "Gemini 3.8 真人氣口演技（12 位真人級聲線" + (this.localNeuralAvailable ? "・含硬碟快取）" : "）");
        } else if (this.localNeuralAvailable) {
          lbl.textContent = "v13 擬真多角色神經配音已連線（12 位真人級聲線・逐句韻律・$0）";
        } else if (bestScore >= 150) {
          lbl.textContent = "免費神經聲線：" + zh[0].name.split(" ")[0];
        } else if (bestScore >= 130) {
          lbl.textContent = "高清晰聲線：" + zh[0].name.split(" ")[0] + "（已啟用自然句流柔化）";
        } else if (zh.length > 0) {
          lbl.textContent = "系統基本聲線（已啟用自然句流柔化）";
        } else {
          lbl.textContent = "未偵測到華語人聲（推薦切療癒樂音）";
        }
      }
      if (hintBox) {
        hintBox.classList.toggle("hidden", Boolean(this.localNeuralAvailable || this.isCloudGeminiTtsActive() || (typeof state !== "undefined" && state.geminiApiKey) || bestScore >= 145 || this.mode === "cozy"));
      }
    } catch (e) {}
  },

  refreshVoices: function () {
    if (!this.isSupported()) {
      this.updateEngineStatusUi();
      return;
    }
    try {
      const list = window.speechSynthesis.getVoices() || [];
      if (!list.length) {
        this.updateEngineStatusUi();
        return;
      }
      this.allVoices = list;
      const self = this;
      const isCantonese = function (v) {
        const s = String(v.lang || "") + " " + String(v.name || "");
        return /zh[-_]?hk|yue|cantonese|hong\s*kong|香港|粵|廣東|Tracy|Danny|HiuMaan|HiuGaai|WanLung|Sin[-_]?ji/i.test(s);
      };
      const zh = list.filter(function (v) {
        if (isCantonese(v) || self.isNoveltyOrRoboticVoice(v)) return false;
        const lang = String(v.lang || "");
        const name = String(v.name || "");
        return /^zh|^cmn|Chinese|Taiwan|臺灣|台灣|國語|普通话|Meijia|美佳|HsiaoChen|HsiaoYu|YunJhe/i.test(lang + " " + name);
      });
      zh.sort(function (a, b) { return self.scoreVoiceQuality(b) - self.scoreVoiceQuality(a); });
      this.zhVoices = zh;

      // Only rotate among top-tier natural Taiwan/Mandarin voices so robotic SAPI5 or mismatched accents never leak in
      const topScore = zh.length ? self.scoreVoiceQuality(zh[0]) : 0;
      const highTier = zh.filter(function (v) {
        const sc = self.scoreVoiceQuality(v);
        return topScore >= 135 ? sc >= 135 : sc >= Math.max(60, topScore - 20);
      });
      const pool = highTier.length ? highTier : zh.slice(0, 1);
      // Tiered male voice selection:
      // 1) High-tier natural/neural male voices (Edge YunJhe Online / macOS Enhanced) -> exclusively used, banishing legacy SAPI5!
      // 2) Taiwanese local male voice (e.g. Zhiwei on Windows Chrome) -> keeps gender 100% matched to male 3D models (never puts a female voice on male models!) while excluding Mainland Kangkang!
      // 3) Any remaining Mandarin male voice.
      const highTierMale = pool.filter(function (v) { return self.isMaleVoice(v); });
      const decentMale = zh.filter(function (v) { return self.isMaleVoice(v) && self.scoreVoiceQuality(v) >= 85; });
      const twMale = zh.filter(function (v) {
        return self.isMaleVoice(v) && (/zh[-_]?tw/i.test(String(v.lang || "")) || /Taiwan|臺灣|台灣|YunJhe|Zhiwei/i.test(String(v.name || "")));
      });
      this.maleVoices = highTierMale.length > 0
        ? highTierMale
        : (decentMale.length > 0
          ? decentMale
          : (twMale.length > 0 ? twMale : zh.filter(function (v) { return self.isMaleVoice(v); })));
      this.femaleVoices = pool.filter(function (v) { return !self.isMaleVoice(v); });
      this.bestPool = pool;

      const sel = document.getElementById("selectDeviceVoice");
      if (sel) {
        const prevVal = this.selectedVoiceUri || "auto";
        sel.innerHTML = '<option value="auto">自動挑選最佳自然聲線（推薦・自動排除機械音）</option>';
        zh.forEach(function (v) {
          const opt = document.createElement("option");
          opt.value = v.voiceURI || v.name;
          const sc = self.scoreVoiceQuality(v);
          const tag = sc >= 150 ? " [自然神經音質]" : (sc >= 130 ? " [推薦清晰]" : "");
          opt.textContent = v.name + " (" + v.lang + ")" + tag;
          sel.appendChild(opt);
        });
        sel.value = prevVal;
        if (sel.value !== prevVal) {
          sel.value = "auto";
          this.selectedVoiceUri = "auto";
        }
      }

      this.updateEngineStatusUi();
    } catch (e) {}
  },

  unlock: function () {
    if (!this.isSupported()) return;
    this.refreshVoices();
    if (this.primed) return;
    this.primed = true;
    try {
      const primer = new window.SpeechSynthesisUtterance("");
      primer.volume = 0;
      primer.lang = "zh-TW";
      window.speechSynthesis.speak(primer);
    } catch (e) {}
  },

  normalizeTtsPolyphones: function (text) {
    return String(text || "")
      .replace(/直心糾察長/g, "直心糾察掌")
      .replace(/糾察長/g, "糾察掌");
  },

  toCanonicalTtsText: function (rawText) {
    let s = this.stripGeminiVocalTags(rawText);
    s = s.replace(/\[[^\]]*\]/g, " ");
    s = s.replace(/（[^）]*）/g, " ").replace(/\([^)]*\)/g, " ");
    s = this.normalizeTtsPolyphones(s);
    return s.replace(/\s+/g, " ").trim();
  },

  formatMandarinText: function (raw) {
    if (!raw) return "";
    let out = String(raw)
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, "")
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "");
    if (typeof normalizeSeatRefsInText === "function") {
      out = normalizeSeatRefsInText(out);
    } else {
      out = out
        .replace(/(?<!\d)0([1-9])\s*號/g, "$1號")
        .replace(/(?<!\d)0([1-9])(?=[\u4e00-\u9fff，。！？、；：,\.!?;:\s]|$)/g, "$1號");
    }
    out = out
      .replace(/\b4G\b/gi, "四給")
      .replace(/3好/g, "三好")
      .replace(/[×xX]\s*1\.5/g, "一點五倍")
      .replace(/平票\s*PK/gi, "平票對決")
      .replace(/\bPK\b/gi, "平票對決")
      .replace(/\bVS\.?\b/gi, "對決")
      .replace(/\bAI\b/g, "A I")
      .replace(/(\d+)\s*%/g, "$1趴")
      .replace(/~/g, "到")
      .replace(/→/g, "投給")
      .replace(/[「」『』【】]/g, "")
      .replace(/[｜|·・—]/g, "，")
      .replace(/：(?=\S)/g, "，")
      .replace(/(?<![，。！？\s])(我是明心觀察員|我是滴水奉茶師|我是護心守衛|我是直心糾察長)/g, "，$1");
    out = this.normalizeTtsPolyphones(out);
    return out
      .replace(/…+/g, "…")
      .replace(/，{2,}/g, "，")
      .replace(/^，+/, "")
      .replace(/\s+/g, " ")
      .replace(/([\u4e00-\u9fff，。！？])\s+(?=[\u4e00-\u9fff])/g, "$1")
      .trim();
  },

  normalizeAudioBufferLoudness: function (audioBuf, opts) {
    // Active-speech RMS broadcast loudness normalizer + soft peak limiter (eliminates -6dB male vs female TTS loudness gaps!)
    if (!audioBuf || typeof audioBuf.getChannelData !== "function") return audioBuf;
    try {
      const nCh = Math.max(1, audioBuf.numberOfChannels || 1);
      const len = audioBuf.length || 0;
      if (len < 128) return audioBuf;
      const targetRms = (opts && typeof opts.targetRms === "number") ? opts.targetRms : 0.185;
      const gate = 0.015;
      let activeSq = 0;
      let activeCount = 0;
      let totalSq = 0;
      let peak = 0;
      for (let c = 0; c < nCh; c++) {
        const ch = audioBuf.getChannelData(c);
        if (!ch) continue;
        for (let i = 0; i < len; i++) {
          const v = ch[i];
          const av = v < 0 ? -v : v;
          if (av > peak) peak = av;
          const sq = v * v;
          totalSq += sq;
          if (av > gate) {
            activeSq += sq;
            activeCount += 1;
          }
        }
      }
      if (peak < 0.005) return audioBuf;
      const activeRms = activeCount >= 64
        ? Math.sqrt(activeSq / activeCount)
        : Math.sqrt(totalSq / Math.max(1, len * nCh));
      if (!activeRms || activeRms < 0.004) return audioBuf;
      const gain = clamp(targetRms / activeRms, 0.58, 2.85);
      if (Math.abs(gain - 1.0) < 0.04 && peak <= 0.94) return audioBuf;

      // Apply gain with smooth soft-knee ceiling above 0.88 (max 0.96) so quiet male voices lift cleanly with zero clipping
      const knee = 0.88;
      const headroom = 0.08;
      for (let c = 0; c < nCh; c++) {
        const ch = audioBuf.getChannelData(c);
        if (!ch) continue;
        for (let i = 0; i < len; i++) {
          let s = ch[i] * gain;
          const av = s < 0 ? -s : s;
          if (av > knee) {
            const over = (av - knee) / headroom;
            const shaped = knee + headroom * (over / (1 + over));
            s = s < 0 ? -shaped : shaped;
          }
          ch[i] = s;
        }
      }
      return audioBuf;
    } catch (e) {
      return audioBuf;
    }
  },

  trimAudioBufferSilence: function (audioBuf) {
    if (!audioBuf || !sound || !sound.ctx || typeof audioBuf.getChannelData !== "function" || typeof sound.ctx.createBuffer !== "function") {
      return this.normalizeAudioBufferLoudness(audioBuf);
    }
    try {
      const ch0 = audioBuf.getChannelData(0);
      const total = ch0 ? ch0.length : 0;
      const sr = audioBuf.sampleRate || 24000;
      if (!total || total < sr * 0.16) return this.normalizeAudioBufferLoudness(audioBuf);
      const thresh = 0.0038;
      let start = 0;
      while (start < total && Math.abs(ch0[start]) < thresh) start++;
      let end = total - 1;
      while (end > start && Math.abs(ch0[end]) < thresh) end--;
      if (start >= end) return this.normalizeAudioBufferLoudness(audioBuf);

      // Keep a natural 11ms acoustic margin & apply a 5ms cosine micro-fade so splices never click or pop
      const pad = Math.floor(sr * 0.011);
      const cutStart = Math.max(0, start - pad);
      const cutEnd = Math.min(total, end + pad + 1);
      const newLen = cutEnd - cutStart;
      if (newLen >= total - Math.floor(sr * 0.018) || newLen < Math.floor(sr * 0.08)) {
        return this.normalizeAudioBufferLoudness(audioBuf);
      }
      const nCh = audioBuf.numberOfChannels || 1;
      const trimmed = sound.ctx.createBuffer(nCh, newLen, sr);
      const fadeSamples = Math.min(Math.floor(sr * 0.005), Math.floor(newLen * 0.12));
      for (let c = 0; c < nCh; c++) {
        const srcData = audioBuf.getChannelData(c);
        const dstData = trimmed.getChannelData(c);
        for (let i = 0; i < newLen; i++) {
          dstData[i] = srcData[cutStart + i];
        }
        for (let f = 0; f < fadeSamples; f++) {
          const w = 0.5 - 0.5 * Math.cos((Math.PI * f) / fadeSamples);
          dstData[f] *= w;
          dstData[newLen - 1 - f] *= w;
        }
      }
      return this.normalizeAudioBufferLoudness(trimmed);
    } catch (e) {
      return this.normalizeAudioBufferLoudness(audioBuf);
    }
  },

  splitTwoStageStream: function (cleanText) {
    if (!cleanText || cleanText.length <= 42) return [cleanText];
    const punctRe = /[，。！？；…]/g;
    let bestSplit = -1;
    let m;
    while ((m = punctRe.exec(cleanText)) !== null) {
      const idx = m.index + 1;
      if (idx >= 16 && idx <= 38) {
        bestSplit = idx;
        if (idx >= 22) break;
      }
    }
    if (bestSplit === -1 || cleanText.length - bestSplit < 14) return [cleanText];
    const first = cleanText.slice(0, bestSplit).trim();
    const rest = cleanText.slice(bestSplit).trim();
    return (first && rest) ? [first, rest] : [cleanText];
  },

  // Build a 1~3 beat human prosody arc: unhurried opening -> energized core/question -> grounded signoff!
  splitExpressiveSpeechArc: function (cleanText, mood) {
    if (!cleanText) return [];
    if (cleanText.length <= 26 || mood === "host_night" || mood === "host_dawn") {
      return [{ text: cleanText, role: "", pauseAfterMs: 0, rateNudge: 1.0, detuneNudge: 0 }];
    }
    const rawClauses = cleanText.match(/[^，。！？；…]+[，。！？；…]?/g) || [cleanText];
    if (rawClauses.length <= 1) {
      return [{ text: cleanText, role: "", pauseAfterMs: 0, rateNudge: 1.0, detuneNudge: 0 }];
    }
    // Group clauses into up to 3 natural dramatic beats (open / core / close)
    const groups = [];
    let cur = "";
    for (let i = 0; i < rawClauses.length; i++) {
      const piece = rawClauses[i].trim();
      if (!piece) continue;
      if (!cur) {
        cur = piece;
      } else if (groups.length === 0 && (cur.length + piece.length) <= 26 && !/[。！？]$/.test(cur)) {
        cur += piece;
      } else if (groups.length === 1 && i < rawClauses.length - 1 && (cur.length + piece.length) <= 36 && !/[。！？]$/.test(cur)) {
        cur += piece;
      } else if (groups.length >= 2) {
        cur += piece;
      } else {
        groups.push(cur);
        cur = piece;
      }
    }
    if (cur) {
      if (groups.length > 0 && cur.length <= 5) {
        groups[groups.length - 1] += cur;
      } else {
        groups.push(cur);
      }
    }
    if (groups.length === 1) {
      return [{ text: groups[0], role: "", pauseAfterMs: 0, rateNudge: 1.0, detuneNudge: 0 }];
    }
    return groups.map(function (seg, idx) {
      const isFirst = idx === 0;
      const isLast = idx === groups.length - 1;
      const hasQuestion = /[？?]/.test(seg);
      const hasCallout = /([1-9]|1[0-2]|一|二|三|四|五|六|七|八|九|十|十一|十二)號|酸民狼|觀察員|奉茶師|守衛|糾察長|異議/.test(seg);
      const hasSignoff = /(過[。！？]?$|公決之|明鑒|裁決)/.test(seg);
      let role = "pivot";
      let rateNudge = 1.0;
      let detuneNudge = 0;
      if (isFirst) {
        role = (mood === "rebut" || mood === "panic") ? "climax" : "open";
        rateNudge = role === "open" ? 0.97 : 1.03;
        detuneNudge = role === "open" ? -10 : 12;
      } else if (isLast && hasSignoff && seg.length <= 24) {
        role = "close";
        rateNudge = 0.95;
        detuneNudge = -16;
      } else if (hasQuestion) {
        role = "question";
        rateNudge = 1.02;
        detuneNudge = 16;
      } else if (hasCallout || mood === "accuse" || mood === "claim_seer") {
        role = "climax";
        rateNudge = 1.035;
        detuneNudge = 14;
      }
      const endsMajor = /[。！？…]$/.test(seg);
      const pauseAfterMs = isLast ? 0 : (endsMajor ? 128 : 88);
      return {
        text: seg,
        role: role,
        pauseAfterMs: pauseAfterMs,
        rateNudge: rateNudge,
        detuneNudge: detuneNudge
      };
    });
  },

  // Split long Mandarin text into safe breathing clauses (22-char default defeats Chrome Web Speech ~14s cutoff; 48-char for buffered studio TTS!)
  splitMandarinClauses: function (cleanText, opts) {
    const maxLen = (opts && typeof opts.maxLen === "number" && opts.maxLen >= 16) ? opts.maxLen : 22;
    const rawPieces = String(cleanText || "").match(/[^，。！？；：…,\.!?;:\n]+[，。！？；：…,\.!?;:\n]?/g) || [String(cleanText || "")];
    const pieces = [];
    rawPieces.forEach(function (part) {
      let s = part.trim();
      if (!s) return;
      while (s.length > maxLen) {
        let cut = Math.max(12, maxLen - 2);
        const spIdx = s.lastIndexOf(" ", maxLen - 1);
        if (spIdx >= Math.floor(maxLen * 0.45)) cut = spIdx + 1;
        pieces.push(s.slice(0, cut).trim());
        s = s.slice(cut).trim();
      }
      if (s) pieces.push(s);
    });
    const chunks = [];
    let buf = "";
    pieces.forEach(function (p) {
      if (!p) return;
      const isTinyTail = p.length <= 4 && /^(過|先過|好了|對吧|喔|耶|吧|呢)[。！？]?$/.test(p);
      if (!buf) {
        buf = p;
      } else if (isTinyTail && (buf.length + p.length) <= (maxLen + 4)) {
        buf += p;
      } else if ((buf.length + p.length) <= maxLen && !/[。！？…!?]$/.test(buf)) {
        buf += p;
      } else {
        chunks.push(buf);
        buf = p;
      }
    });
    if (buf) chunks.push(buf);
    return chunks.length ? chunks : [cleanText];
  },

  // v18.0 Four-State Situational Vocal Modulation (standard / under_fire / wolf_nervous / last_words)
  resolveSituationalVoiceState: function (speaker, mood, opts) {
    const m = mood || "normal";
    const ph = (typeof state !== "undefined" && state.match) ? state.match.phase : "";
    if (m === "last_words" || ph === "LAST_WORDS_SPEECH") {
      return { key: "last_words", rateMul: 0.88, commaPauseMs: 145, periodPauseMs: 240, hesitateBeforeAccuseMs: 0, tailFadeSec: 0.45, tailVolMul: 0.94 };
    }
    const isPkNow = Boolean(typeof state !== "undefined" && state.match && Array.isArray(state.match.pkCandidates) && speaker && state.match.pkCandidates.indexOf(speaker.id) !== -1);
    const isSheriffPkNow = Boolean(typeof state !== "undefined" && state.match && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.isPkRound && speaker && Array.isArray(state.match.sheriffElectionCtx.candidateIds) && state.match.sheriffElectionCtx.candidateIds.indexOf(speaker.id) !== -1);
    const isCheckedWolfToday = Boolean(typeof state !== "undefined" && state.match && Array.isArray(state.match.daySpeechEvents) && speaker && state.match.daySpeechEvents.some(function (ev) { return ev && ev.checkedWolfId === speaker.id && ev.speakerId !== speaker.id; }));
    const isInterjectNow = Boolean(typeof state !== "undefined" && state.lastInterjectAt && (performance.now() - state.lastInterjectAt) < 4200);
    if (m === "panic" || m === "rebut" || isPkNow || isSheriffPkNow || isCheckedWolfToday || isInterjectNow || (opts && opts.underFire)) {
      return { key: "under_fire", rateMul: 1.10, commaPauseMs: 45, periodPauseMs: 75, hesitateBeforeAccuseMs: 0, tailFadeSec: 0, tailVolMul: 1.0 };
    }
    if (speaker && speaker.role === "wolf" && (speaker.microPulse || 0) >= 72 && m !== "host_night" && m !== "host_dawn") {
      return { key: "wolf_nervous", rateMul: 0.97, commaPauseMs: 120, periodPauseMs: 195, hesitateBeforeAccuseMs: 240, tailFadeSec: 0.30, tailVolMul: 0.88 };
    }
    return { key: "standard", rateMul: 1.0, commaPauseMs: 110, periodPauseMs: 180, hesitateBeforeAccuseMs: 0, tailFadeSec: 0, tailVolMul: 1.0 };
  },

  // v18.0 Pure-JS AudioBuffer -> WAV Blob URL encoder so HTMLAudioElement (preservesPitch = true) can speed up 1.5x with ZERO chipmunk pitch shift!
  audioBufferToWavBlobUrl: function (audioBuf) {
    if (!audioBuf || typeof Blob !== "function" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
    try {
      const numCh = Math.min(2, audioBuf.numberOfChannels || 1);
      const sampleRate = audioBuf.sampleRate || 24000;
      const len = audioBuf.length || 0;
      if (len < 32) return null;
      const bytesPerSample = 2;
      const blockAlign = numCh * bytesPerSample;
      const dataSize = len * blockAlign;
      const buf = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buf);
      const writeStr = function (off, s) {
        for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
      };
      writeStr(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numCh, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeStr(36, "data");
      view.setUint32(40, dataSize, true);
      const channels = [];
      for (let c = 0; c < numCh; c++) channels.push(audioBuf.getChannelData(c));
      let offset = 44;
      for (let i = 0; i < len; i++) {
        for (let c = 0; c < numCh; c++) {
          const s = clamp(channels[c][i] || 0, -1, 1);
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }
      }
      const blob = new Blob([buf], { type: "audio/wav" });
      return URL.createObjectURL(blob);
    } catch (e) {
      return null;
    }
  },

  _extractMentionBeatPositions: function (text, speakerId) {
    const out = [];
    const str = String(text || "");
    const re = /(1[0-2]|0?[1-9])號/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      const sid = parseInt(m[1], 10);
      if (sid && sid !== speakerId) {
        out.push({ charIdx: m.index, targetId: sid, fired: false });
      }
    }
    return out;
  },

  _notifyCharProgress: function (charIdx, speakerId, sitKey) {
    this.liveCharIndex = charIdx;
    if (!this._liveMentionBeats || !this._liveMentionBeats.length || !speakerId) return;
    const nowT = performance.now();
    for (let i = 0; i < this._liveMentionBeats.length; i++) {
      const b = this._liveMentionBeats[i];
      if (!b.fired && charIdx >= b.charIdx) {
        b.fired = true;
        if (typeof state !== "undefined") {
          state.activeMentionBeat = {
            speakerId: speakerId,
            targetId: b.targetId,
            sitState: sitKey || "standard",
            until: nowT + 1300,
            eyeDartUntil: sitKey === "wolf_nervous" ? (nowT + 180) : 0
          };
        }
      }
    }
  },

  pickVoiceForProfile: function (profile) {
    if (!this.zhVoices.length) this.refreshVoices();
    if (this.selectedVoiceUri && this.selectedVoiceUri !== "auto") {
      const manual = this.zhVoices.find(function (v) { return (v.voiceURI || v.name) === voice.selectedVoiceUri; });
      if (manual) return manual;
    }
    const slot = (profile && typeof profile.slot === "number") ? profile.slot : 0;
    if (profile && profile.gender === "m" && this.maleVoices.length > 0) {
      return this.maleVoices[slot % this.maleVoices.length];
    }
    if (profile && profile.gender === "f" && this.femaleVoices.length > 0) {
      return this.femaleVoices[slot % this.femaleVoices.length];
    }
    const fallbackPool = (this.bestPool && this.bestPool.length) ? this.bestPool : this.zhVoices;
    if (fallbackPool.length > 0) {
      return fallbackPool[slot % fallbackPool.length];
    }
    return null;
  },

  setVisualSpeaking: function (active) {
    this.speaking = active;
    sound.voiceDucking = active;
    sound.applyVolumes();
    const hBars = document.getElementById("headerVoiceBars");
    if (hBars) hBars.classList.toggle("playing", active && this.enabled);
    const sWave = document.getElementById("speakerVoiceWave");
    const phNow = (typeof state !== "undefined" && state.match) ? state.match.phase : "";
    const inSheriffSpeech = Boolean(phNow === "SHERIFF_ELECTION" && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech");
    const isSpeechStage = (phNow === "DAY_SPEECH" || phNow === "LAST_WORDS_SPEECH" || inSheriffSpeech);
    const isTypingNow = Boolean(typeof state !== "undefined" && state.typewriter && state.typewriter.active);
    const stillActive = Boolean((active || isTypingNow) && !this.paused);
    if (sWave && isSpeechStage) {
      sWave.classList.toggle("playing", stillActive);
      sWave.classList.toggle("hidden", !stillActive);
    }
    const pImg = document.getElementById("speakerPortraitImg");
    if (pImg && isSpeechStage && !pImg.classList.contains("hidden")) {
      const hasSeatSpeaker = Boolean(typeof state !== "undefined" && state.activeSpeakerId);
      pImg.classList.toggle("portrait-speaking-glow", stillActive);
      pImg.classList.toggle("portrait-speaking-breathe", Boolean(hasSeatSpeaker && stillActive));
    }
    if (isSpeechStage) {
      const livePill = document.getElementById("speakerLiveStatePill");
      if (livePill) {
        livePill.textContent = this.paused ? "已暫停" : (isTypingNow ? "發言中" : (active ? "語音中" : "已講畢"));
      }
      const nextBtn = document.getElementById("btnStepNext");
      if (nextBtn && (phNow === "DAY_SPEECH" || phNow === "LAST_WORDS_SPEECH") && !nextBtn.classList.contains("hidden")) {
        nextBtn.className = (!isTypingNow && !active && !this.paused)
          ? "cta-cinnabar py-1.5 px-4 text-[15px] shrink-0 inline-flex items-center"
          : "cta-ink py-1.5 px-3 text-xs shrink-0 inline-flex items-center";
      }
    }
  },

  clearTimers: function () {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.clauseTimer) {
      clearTimeout(this.clauseTimer);
      this.clauseTimer = null;
    }
    if (this.clauseWatchdogTimer) {
      clearTimeout(this.clauseWatchdogTimer);
      this.clauseWatchdogTimer = null;
    }
    if (this.backchannelTimer) {
      clearTimeout(this.backchannelTimer);
      this.backchannelTimer = null;
    }
    if (this.prepTimer) {
      clearTimeout(this.prepTimer);
      this.prepTimer = null;
    }
    if (this.charProgressTimer) {
      clearInterval(this.charProgressTimer);
      this.charProgressTimer = null;
    }
  },

  _cleanupActiveAudioEl: function () {
    if (this.activeAudioEl) {
      try {
        this.activeAudioEl.onended = null;
        this.activeAudioEl.onerror = null;
        this.activeAudioEl.pause();
        this.activeAudioEl.src = "";
      } catch (e) {}
      this.activeAudioEl = null;
    }
    if (this.activeMediaElSrc) {
      try { this.activeMediaElSrc.disconnect(); } catch (e) {}
      this.activeMediaElSrc = null;
    }
    if (this.activeAudioBlobUrl) {
      try { if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(this.activeAudioBlobUrl); } catch (e) {}
      this.activeAudioBlobUrl = null;
    }
  },

  stop: function () {
    this.utteranceSeq += 1;
    this.clearTimers();
    if (this._activeLiveTtsController) {
      try { this._activeLiveTtsController.abort(); } catch (e) {}
      this._activeLiveTtsController = null;
    }
    this.paused = false;
    this.pauseMeta = null;
    this._liveBufferState = null;
    this._liveBrowserRestart = null;
    this._resumePendingClause = null;
    this._resumePendingChunk = null;
    this._resumeWatchdogFinish = null;
    this._activeOnDone = null;
    this.activeUtterance = null;
    this.liveSpokenText = "";
    this.liveCharIndex = -1;
    this.liveInPause = false;
    this._liveMentionBeats = [];
    this.activeSituationalState = "standard";
    if (typeof state !== "undefined") {
      state.speechPrepUntil = 0;
      state.speechPrepSeatId = null;
    }
    if (typeof sound !== "undefined" && typeof sound.stopBackchannels === "function") {
      sound.stopBackchannels();
    }
    this._cleanupActiveAudioEl();
    if (this.activeAudioNode) {
      try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); this.activeAudioNode.disconnect(); } catch (e) {}
      this.activeAudioNode = null;
    }
    if (this.activeAudioGain) {
      try { this.activeAudioGain.disconnect(); } catch (e) {}
      this.activeAudioGain = null;
    }
    if (this.isSupported()) {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (this.speaking) {
      this.setVisualSpeaking(false);
    }
    this.syncPauseButtonUi();
  },

  syncPauseButtonUi: function () {
    const btn = typeof document !== "undefined" ? document.getElementById("btnPauseVoice") : null;
    if (btn) {
      btn.textContent = this.paused ? "▶ 繼續" : "暫停";
      btn.classList.toggle("is-paused", Boolean(this.paused));
    }
  },

  getSpeedMultiplier: function () {
    const r = Number(this.rate) || 0.96;
    if (r >= 1.34) return 1.50;
    if (r >= 1.18) return 1.30;
    if (r >= 1.08 && r <= 1.12) return 1.15;
    if (Math.abs(r - 0.96) < 0.02) return 1.00;
    return clamp(r / 0.96, 0.78, 1.65);
  },

  computeBufferedPlaybackRate: function (opts) {
    const pKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const sitCfg = (opts && opts.sitCfg) || { rateMul: 1.0 };
    const eqCfg = (typeof PERSONA_AUDIO_EQ !== "undefined" && PERSONA_AUDIO_EQ[pKey]) ? PERSONA_AUDIO_EQ[pKey] : null;
    const twTrim = eqCfg ? (this.accentMode === "tw" ? (eqCfg.twRateMul || 1.0) : (eqCfg.animeRateMul || 1.0)) : 1.0;
    const rateNudge = ((opts && typeof opts.rateNudge === "number") ? opts.rateNudge : 1.0) * (sitCfg.rateMul || 1.0);
    const speedMul = this.getSpeedMultiplier();
    return clamp(twTrim * rateNudge * speedMul, 0.80, 1.68);
  },

  syncQuickSpeedButtonUi: function () {
    const btn = typeof document !== "undefined" ? document.getElementById("btnQuickVoiceSpeed") : null;
    if (!btn) return;
    const label = this.rate >= 1.34 ? "1.5×" : (this.rate >= 1.18 ? "1.3×" : (this.rate >= 1.05 ? "1.15×" : "1.0×"));
    btn.textContent = label;
    btn.classList.toggle("is-active", this.rate >= 1.05);
  },

  applyLiveRateChange: function () {
    if (this.paused || !this.speaking) return;
    // 1. Live pitch-preserving HTMLAudioElement: instant zero-glitch playbackRate update
    if (this.activeAudioEl && this.pauseMeta && this._liveBufferState) {
      const st = this._liveBufferState;
      const newPbRate = this.computeBufferedPlaybackRate(st.opts);
      this._liveTargetPbRate = newPbRate;
      try {
        this.activeAudioEl.preservesPitch = true;
        this.activeAudioEl.mozPreservesPitch = true;
        this.activeAudioEl.webkitPreservesPitch = true;
        this.activeAudioEl.defaultPlaybackRate = newPbRate;
        this.activeAudioEl.playbackRate = newPbRate;
      } catch (e) {}
      const curTime = this.activeAudioEl.currentTime || 0;
      const totalDur = (this.pauseMeta.audioBuf && this.pauseMeta.audioBuf.duration) ? this.pauseMeta.audioBuf.duration : 2.5;
      this.pauseMeta.offset = Math.min(Math.max(0, totalDur - 0.05), curTime);
      this.pauseMeta.startedAt = sound.ctx ? sound.ctx.currentTime : 0;
      this.pauseMeta.playbackRate = newPbRate;
      const remainPlayMs = Math.max(120, ((totalDur - curTime) / newPbRate) * 1000);
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(st.finishOnce, Math.max(2200, Math.round(remainPlayMs) + 3200));
      }
      if (typeof syncTypewriterToAudioDuration === "function") {
        syncTypewriterToAudioDuration(remainPlayMs);
      }
      return;
    }
    // 2. Live Web Audio BufferSourceNode: seamlessly transition to pitch-preserved HTMLAudioElement when speeding up!
    if (this.activeAudioNode && this.pauseMeta && this.pauseMeta.audioBuf && sound.ctx) {
      const pm = this.pauseMeta;
      const elapsed = Math.max(0, (sound.ctx.currentTime - pm.startedAt) * (pm.playbackRate || 1));
      const nextOffset = Math.min(Math.max(0, pm.audioBuf.duration - 0.08), (pm.offset || 0) + elapsed);
      const newPbRate = this.computeBufferedPlaybackRate(pm.opts);
      const canUsePitchEl = Boolean(
        Math.abs(newPbRate - 1.0) > 0.03 &&
        typeof Audio === "function" &&
        typeof sound.ctx.createMediaElementSource === "function" &&
        typeof pm.audioBuf.getChannelData === "function"
      );
      if (canUsePitchEl) {
        this.clearTimers();
        try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); this.activeAudioNode.disconnect(); } catch (e) {}
        this.activeAudioNode = null;
        this.playBufferedStudioAudio(pm.seq, pm.audioBuf, pm.onDone, Object.assign({}, pm.opts, {
          startOffset: nextOffset,
          skipPreBreath: true,
          skipPrepBeat: true
        }));
      } else {
        try { this.activeAudioNode.playbackRate.value = newPbRate; } catch (e) {}
        pm.offset = nextOffset;
        pm.startedAt = sound.ctx.currentTime;
        pm.playbackRate = newPbRate;
      }
      return;
    }
    // 3. Live Browser Web Speech API: immediately re-speak active clause at new rate!
    if (typeof this._liveBrowserRestart === "function") {
      try { this._liveBrowserRestart(); } catch (e) {}
    }
  },

  setRate: function (nextRate) {
    const clamped = clamp(Number(nextRate) || 0.96, 0.75, 1.65);
    this.rate = clamped;
    this.syncQuickSpeedButtonUi();
    this.applyLiveRateChange();
    if (typeof syncPrefsToControls === "function") syncPrefsToControls();
    if (typeof saveUserPrefs === "function") saveUserPrefs();
    return clamped;
  },

  cycleQuickRate: function () {
    const next = this.rate < 1.05 ? 1.10 : (this.rate < 1.18 ? 1.22 : (this.rate < 1.34 ? 1.42 : 0.96));
    return this.setRate(next);
  },

  togglePause: function () {
    if (!this.speaking && !(typeof state !== "undefined" && state.typewriter && state.typewriter.active) && !this.paused) {
      return false;
    }
    if (!this.paused) {
      this.paused = true;
      if (this.backchannelTimer) { clearTimeout(this.backchannelTimer); this.backchannelTimer = null; }
      if (typeof sound !== "undefined" && typeof sound.stopBackchannels === "function") {
        sound.stopBackchannels();
      }
      if (this.activeAudioEl && this.pauseMeta) {
        this.pauseMeta.offset = Math.min((this.pauseMeta.audioBuf ? this.pauseMeta.audioBuf.duration : 99) - 0.05, this.activeAudioEl.currentTime || 0);
        this.clearTimers();
        this._cleanupActiveAudioEl();
      } else if (this.activeAudioNode && this.pauseMeta && sound.ctx) {
        const elapsed = Math.max(0, (sound.ctx.currentTime - this.pauseMeta.startedAt) * (this.pauseMeta.playbackRate || 1));
        this.pauseMeta.offset = Math.min(this.pauseMeta.audioBuf.duration - 0.05, (this.pauseMeta.offset || 0) + elapsed);
        this.clearTimers();
        try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); this.activeAudioNode.disconnect(); } catch (e) {}
        this.activeAudioNode = null;
      } else if (this.isSupported()) {
        if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = null; }
        if (this.clauseWatchdogTimer) { clearTimeout(this.clauseWatchdogTimer); this.clauseWatchdogTimer = null; }
        if (this.clauseTimer) { clearTimeout(this.clauseTimer); this.clauseTimer = null; }
        try { window.speechSynthesis.pause(); } catch (e) {}
      }
      if (typeof state !== "undefined" && state.stepTimer) {
        const phPause = state.match ? state.match.phase : "";
        if (phPause === "DAY_SPEECH" || phPause === "LAST_WORDS_SPEECH" || phPause === "SHERIFF_ELECTION") {
          clearTimeout(state.stepTimer);
          state.stepTimer = null;
        }
      }
      this.setVisualSpeaking(false);
      this.syncPauseButtonUi();
      return true;
    } else {
      this.paused = false;
      this.syncPauseButtonUi();
      if (this.pauseMeta && this.pauseMeta.audioBuf && sound.ctx) {
        const pm = this.pauseMeta;
        this.playBufferedStudioAudio(pm.seq, pm.audioBuf, pm.onDone, Object.assign({}, pm.opts, { startOffset: pm.offset || 0 }));
      } else if (typeof this._resumePendingChunk === "function") {
        const fnChunk = this._resumePendingChunk;
        this._resumePendingChunk = null;
        fnChunk();
      } else if (this.isSupported() && (this.activeUtterance || typeof this._resumePendingClause === "function")) {
        try { window.speechSynthesis.resume(); } catch (e) {}
        this.setVisualSpeaking(true);
        if (typeof this._resumeWatchdogFinish === "function") {
          const fnFinish = this._resumeWatchdogFinish;
          const selfResume = this;
          const resumeMs = Math.max(12000, this._resumeWatchdogMs || 22000);
          this.watchdogTimer = setTimeout(function () {
            if (!selfResume.paused) fnFinish();
          }, resumeMs);
        }
        if (typeof this._resumePendingClause === "function") {
          const fnResume = this._resumePendingClause;
          this._resumePendingClause = null;
          fnResume();
        }
      } else if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
        maybeScheduleAutoAdvanceAfterSpeech();
      }
      return false;
    }
  },

  playBufferedStudioAudio: function (seq, audioBuf, onDone, opts) {
    if (seq !== this.utteranceSeq || !sound.ctx) return false;
    let vGain = null;
    try {
    if (sound.ctx.state === "suspended" && typeof sound.ctx.resume === "function") {
      sound.ctx.resume().catch(function () {});
    }
    vGain = sound.ctx.createGain();
    const skipRateAdjust = Boolean(opts && opts.skipRateAdjust);
    const pKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const sitCfg = (opts && opts.sitCfg) || { key: "standard", rateMul: 1.0, tailFadeSec: 0, tailVolMul: 1.0 };
    const sitKey = sitCfg.key || "standard";
    this.activeSituationalState = sitKey;
    if (typeof sound.applyPersonaVoiceChain === "function") {
      sound.applyPersonaVoiceChain(pKey, (opts && opts.mood) || "normal", opts && opts.seatId, sitKey);
    }

    let baseDetune = 0;
    const eqCfg = (typeof PERSONA_AUDIO_EQ !== "undefined" && PERSONA_AUDIO_EQ[pKey]) ? PERSONA_AUDIO_EQ[pKey] : null;
    if (eqCfg && !(opts && opts.skipDetune)) {
      const rawDetune = this.accentMode === "tw" ? (eqCfg.twDetuneCents || 0) : (eqCfg.detuneCents || 0);
      // Keep audible PCM pitch shift within a subtle, artifact-free ±20 cents envelope so neural male voices never turn metallic
      baseDetune = clamp(Math.round(rawDetune * 0.35), -20, 20);
    }
    const detuneNudge = (opts && typeof opts.detuneNudge === "number" && !(opts && opts.skipDetune)) ? opts.detuneNudge : 0;
    // Allow true 1.0x / 1.15x / 1.3x / 1.5x speed without chipmunk pitch via HTMLAudioElement(preservesPitch=true)!
    const pbRate = this.computeBufferedPlaybackRate(opts);
    this._liveTargetPbRate = pbRate;

    const effGain = clamp(this.volume * (sitCfg.tailVolMul || 1.0), 0, 1);
    vGain.gain.value = effGain;
    if (sound.voiceBus) {
      vGain.connect(sound.voiceBus);
    } else {
      vGain.connect(sound.comp || sound.ctx.destination);
    }

    const startOffset = Math.max(0, Number(opts && opts.startOffset) || 0);
    const remainDur = Math.max(0.1, (audioBuf ? audioBuf.duration : 2.5) - startOffset);
    this.pauseMeta = {
      seq: seq,
      audioBuf: audioBuf,
      onDone: onDone,
      opts: opts || {},
      offset: startOffset,
      startedAt: sound.ctx.currentTime,
      playbackRate: pbRate
    };
    if (this.paused) {
      try { vGain.disconnect(); } catch (e) {}
      this.activeAudioNode = null;
      this.activeAudioGain = null;
      this.setVisualSpeaking(false);
      this.syncPauseButtonUi();
      return true;
    }

    this._cleanupActiveAudioEl();
    if (this.activeAudioNode) {
      try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); this.activeAudioNode.disconnect(); } catch (e) {}
      this.activeAudioNode = null;
    }
    if (this.activeAudioGain) {
      try { this.activeAudioGain.disconnect(); } catch (e) {}
      this.activeAudioGain = null;
    }
    this.activeAudioGain = vGain;
    this.setVisualSpeaking(true);
    this.syncPauseButtonUi();

    const estPlayMs = (remainDur / pbRate) * 1000;
    const self = this;
    const seatIdNow = (opts && opts.seatId) || 0;
    const needPrepBeat = Boolean(
      startOffset === 0 &&
      !(opts && opts.skipPrepBeat) &&
      seatIdNow > 0 &&
      pKey !== "主持" &&
      !(typeof isSpectatorFastForward === "function" && isSpectatorFastForward())
    );
    const prepDelayMs = needPrepBeat ? 220 : 0;

    if (opts && typeof opts.onAudioReady === "function" && startOffset === 0) {
      try { opts.onAudioReady((opts.totalDurationHintMs || estPlayMs) + prepDelayMs); } catch (e) {}
    }
    if (audioBuf && audioBuf.duration && startOffset === 0 && !(opts && opts.skipTypewriterSync) && typeof syncTypewriterToAudioDuration === "function") {
      syncTypewriterToAudioDuration((opts && opts.totalDurationHintMs ? opts.totalDurationHintMs : estPlayMs) + prepDelayMs);
    }

    const launchActualPlayback = function () {
      if (seq !== self.utteranceSeq || self.paused || !sound.ctx) return;
      if (typeof state !== "undefined") {
        state.speechPrepUntil = 0;
        state.speechPrepSeatId = null;
      }
      const playStartAt = performance.now();
      // Track live spoken char index & fire exact seat-mention gesture beats in sync with playback!
      if (self.liveSpokenText && self.liveSpokenText.length > 0 && estPlayMs > 80) {
        const rangeStart = (opts && typeof opts.charRangeStart === "number") ? opts.charRangeStart : 0;
        const rangeEnd = (opts && typeof opts.charRangeEnd === "number") ? opts.charRangeEnd : self.liveSpokenText.length;
        const rangeSpan = Math.max(1, rangeEnd - rangeStart);
        if (self.charProgressTimer) clearInterval(self.charProgressTimer);
        self.charProgressTimer = setInterval(function () {
          if (seq !== self.utteranceSeq || self.paused) return;
          const frac = clamp((performance.now() - playStartAt) / estPlayMs, 0, 1);
          const ci = Math.min(rangeEnd - 1, rangeStart + Math.floor(frac * rangeSpan));
          self._notifyCharProgress(ci, seatIdNow, sitKey);
        }, 55);
      }

      const finishOnce = function () {
        if (seq !== self.utteranceSeq || self.paused) return;
        if (!(opts && opts.keepSeqOpen)) self.utteranceSeq += 1;
        self.clearTimers();
        self._cleanupActiveAudioEl();
        if (self.activeAudioNode) {
          try { self.activeAudioNode.onended = null; self.activeAudioNode.stop(); self.activeAudioNode.disconnect(); } catch (e) {}
          self.activeAudioNode = null;
        }
        try { vGain.disconnect(); } catch (e) {}
        if (self.activeAudioGain === vGain) self.activeAudioGain = null;
        self.pauseMeta = null;
        self._liveBufferState = null;
        if (!(opts && opts.keepSeqOpen)) self.setVisualSpeaking(false);
        self.syncPauseButtonUi();
        if (typeof onDone === "function") onDone();
      };
      self._liveBufferState = { opts: opts || {}, finishOnce: finishOnce };

      const estMs = Math.max(3000, Math.round(estPlayMs) + 3500);
      self.watchdogTimer = setTimeout(finishOnce, estMs);

      // Smooth tail volume fade for Last Words & Nervous Wolf trailing cadence
      if (sitCfg.tailFadeSec && sitCfg.tailFadeSec > 0 && estPlayMs > 900) {
        try {
          const endCtxT = sound.ctx.currentTime + (estPlayMs / 1000);
          const fadeStart = Math.max(sound.ctx.currentTime + 0.1, endCtxT - sitCfg.tailFadeSec);
          vGain.gain.setValueAtTime(effGain, fadeStart);
          vGain.gain.linearRampToValueAtTime(Math.max(0.01, effGain * 0.28), endCtxT);
        } catch (e) {}
      }

      let audioStartFired = false;
      const fireAudioStartOnce = function () {
        if (audioStartFired) return;
        audioStartFired = true;
        if (opts && typeof opts.onAudioStart === "function" && startOffset === 0 && !(opts && opts.skipAudioStartCallback)) {
          try { opts.onAudioStart((opts.totalDurationHintMs || estPlayMs)); } catch (e) {}
        }
      };

      const startBufferSourceNode = function () {
        if (seq !== self.utteranceSeq || self.paused || !sound.ctx) return false;
        try {
          const src = sound.ctx.createBufferSource();
          src.buffer = audioBuf;
          src.playbackRate.value = pbRate;
          if (src.detune && (baseDetune || detuneNudge)) {
            try { src.detune.value = clamp(baseDetune + detuneNudge, -135, 135); } catch (e) {}
          }
          src.connect(vGain);
          self.activeAudioNode = src;
          src.onended = finishOnce;
          src.start(0, startOffset);
          fireAudioStartOnce();
          return true;
        } catch (errBuf) {
          finishOnce();
          return false;
        }
      };

      // v18.0 True Pitch-Preserving Speed Playback via HTMLAudioElement (preservesPitch = true) + MediaElementAudioSourceNode!
      // Always set defaultPlaybackRate + enforce on loadedmetadata/playing so browsers NEVER reset playbackRate back to 1.0 during Blob load!
      const wantPitchPreserveEl = Boolean(
        Math.abs(pbRate - 1.0) > 0.03 &&
        typeof Audio === "function" &&
        typeof sound.ctx.createMediaElementSource === "function" &&
        audioBuf && typeof audioBuf.getChannelData === "function"
      );
      let usedPitchEl = false;
      if (wantPitchPreserveEl) {
        const blobUrl = self.audioBufferToWavBlobUrl(audioBuf);
        if (blobUrl) {
          try {
            const aEl = new Audio(blobUrl);
            const enforceRate = function () {
              const targetR = self._liveTargetPbRate || pbRate;
              try {
                aEl.preservesPitch = true;
                aEl.mozPreservesPitch = true;
                aEl.webkitPreservesPitch = true;
                aEl.defaultPlaybackRate = targetR;
                if (Math.abs(aEl.playbackRate - targetR) > 0.005) aEl.playbackRate = targetR;
              } catch (err) {}
            };
            enforceRate();
            aEl.volume = 1.0;
            aEl.addEventListener("loadedmetadata", enforceRate);
            aEl.addEventListener("playing", enforceRate);
            if (startOffset > 0) {
              const applySeek = function () {
                try {
                  const maxSeek = (Number.isFinite(aEl.duration) && aEl.duration > 0.1)
                    ? Math.max(0, aEl.duration - 0.08)
                    : startOffset;
                  aEl.currentTime = Math.min(startOffset, maxSeek);
                } catch (e) {}
              };
              if (aEl.readyState >= 1) {
                applySeek();
              } else {
                aEl.addEventListener("loadedmetadata", applySeek, { once: true });
              }
            }
            const mediaSrc = sound.ctx.createMediaElementSource(aEl);
            mediaSrc.connect(vGain);
            self.activeAudioEl = aEl;
            self.activeMediaElSrc = mediaSrc;
            self.activeAudioBlobUrl = blobUrl;
            aEl.onended = finishOnce;
            aEl.onerror = function () {
              self._cleanupActiveAudioEl();
              startBufferSourceNode();
            };
            const playP = aEl.play();
            enforceRate();
            if (playP && typeof playP.then === "function") {
              playP.then(function () {
                fireAudioStartOnce();
              }, function (playErr) {
                // Safari/iOS NotAllowedError fallback: keep playing via unlocked WebAudio AudioContext instead of dropping to browser speech!
                self._cleanupActiveAudioEl();
                if (playErr && playErr.name === "AbortError" && seq !== self.utteranceSeq) {
                  return;
                }
                startBufferSourceNode();
              });
            } else {
              fireAudioStartOnce();
            }
            usedPitchEl = true;
          } catch (e) {
            self._cleanupActiveAudioEl();
            try { URL.revokeObjectURL(blobUrl); } catch (err) {}
          }
        }
      }

      if (!usedPitchEl) {
        startBufferSourceNode();
      }
    };

    if (needPrepBeat) {
      if (typeof state !== "undefined") {
        state.speechPrepUntil = performance.now() + prepDelayMs;
        state.speechPrepSeatId = seatIdNow;
      }
      if (this.humanBreath && !(opts && opts.skipPreBreath) && typeof sound.playPreSpeechBreath === "function") {
        sound.playPreSpeechBreath(pKey, (opts && opts.mood) || "normal", seatIdNow, sitKey);
      }
      if (typeof sound.playSeatFoley === "function") {
        sound.playSeatFoley(sitKey === "under_fire" ? "cloth_rustle" : "cup_lift", seatIdNow);
      }
      this.prepTimer = setTimeout(function () {
        self.prepTimer = null;
        launchActualPlayback();
      }, prepDelayMs);
    } else {
      if (this.humanBreath && startOffset === 0 && !(opts && opts.skipPreBreath) && pKey !== "主持" && typeof sound.playPreSpeechBreath === "function") {
        sound.playPreSpeechBreath(pKey, (opts && opts.mood) || "normal", seatIdNow, sitKey);
      }
      launchActualPlayback();
    }
    return true;
    } catch (err) {
      this.clearTimers();
      this._cleanupActiveAudioEl();
      if (this.activeAudioNode) {
        try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); this.activeAudioNode.disconnect(); } catch (e) {}
        this.activeAudioNode = null;
      }
      if (vGain) {
        try { vGain.disconnect(); } catch (e) {}
        if (this.activeAudioGain === vGain) this.activeAudioGain = null;
      }
      this.pauseMeta = null;
      this._liveBufferState = null;
      this.setVisualSpeaking(false);
      this.syncPauseButtonUi();
      return false;
    }
  },

  _fetchLocalNeuralAudio: function (cacheKey, effKey, cleanText, mood, signal, clauseRole) {
    if (this._localTtsEndpointUnavailable || this.isStaticCloudHost()) {
      this._localTtsEndpointUnavailable = true;
      this.localNeuralAvailable = false;
      return Promise.resolve(null);
    }
    if (this.localNeuralCache[cacheKey]) return Promise.resolve(this.localNeuralCache[cacheKey]);
    if (this.localNeuralPending[cacheKey]) return this.localNeuralPending[cacheKey];
    const self = this;
    const reqOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: effKey,
        text: cleanText,
        rate: 0.96,
        mood: mood || "normal",
        accent: this.accentMode || "anime",
        clauseRole: clauseRole || "",
        naturalize: true
      })
    };
    if (signal) reqOpts.signal = signal;
    const pendingPromise = fetch("/api/tts", reqOpts)
      .then(function (res) {
        if (res && (res.status === 404 || res.status === 405 || res.status === 501)) {
          self._localTtsEndpointUnavailable = true;
          self.localNeuralAvailable = false;
          return null;
        }
        return res && res.ok ? res.arrayBuffer() : null;
      })
      .then(function (arrBuf) {
        return (arrBuf && arrBuf.byteLength >= 128 && sound.ctx)
          ? sound.ctx.decodeAudioData(arrBuf.slice(0))
          : null;
      })
      .then(function (rawBuf) {
        delete self.localNeuralPending[cacheKey];
        if (!rawBuf) return null;
        const audioBuf = self.trimAudioBufferSilence(rawBuf);
        const keys = Object.keys(self.localNeuralCache);
        if (keys.length > 72) delete self.localNeuralCache[keys[0]];
        self.localNeuralCache[cacheKey] = audioBuf;
        return audioBuf;
      })
      .catch(function () {
        delete self.localNeuralPending[cacheKey];
        return null;
      });
    const pKeys = Object.keys(this.localNeuralPending);
    if (pKeys.length > 36) delete this.localNeuralPending[pKeys[0]];
    this.localNeuralPending[cacheKey] = pendingPromise;
    return pendingPromise;
  },

  lookupBundledVoicePackUrl: function (effKey, cleanText) {
    if (!cleanText) return null;
    const normalizedPackText = String(cleanText)
      .replace(/直心糾察掌/g, "直心糾察長")
      .replace(/糾察掌/g, "糾察長")
      .replace(/警掌/g, "警長")
      .replace(/清心掌老/g, "清心長老")
      .replace(/掌老/g, "長老")
      .replace(/社掌/g, "社長")
      .replace(/學掌/g, "學長");
    if (effKey === "主持" && HOST_VOICE_PACK_MAP[normalizedPackText]) {
      return HOST_VOICE_PACK_MAP[normalizedPackText];
    }
    const zhSeatMap = { "十二": "12", "十一": "11", "十": "10", "九": "9", "八": "8", "七": "7", "六": "6", "五": "5", "四": "4", "三": "3", "二": "2", "一": "1" };
    const compact = normalizedPackText
      .replace(/\s+/g, "")
      .replace(/^，+/, "")
      .replace(/(十二|十一|[一二三四五六七八九十])號/g, function (_m, g1) { return (zhSeatMap[g1] || g1) + "號"; });
    const directKey = effKey + "|" + compact;
    if (SHOWCASE_VOICE_PACK_MAP[directKey]) return SHOWCASE_VOICE_PACK_MAP[directKey];
    return null;
  },

  prefetchBundledVoicePackUrl: function (packUrl) {
    if (!packUrl || this.hostPackCache[packUrl] || typeof fetch !== "function") return;
    if (typeof window !== "undefined" && window.location && !/^https?:$/.test(window.location.protocol)) return;
    const self = this;
    fetch(packUrl)
      .then(function (r) { return r && r.ok ? r.arrayBuffer() : null; })
      .then(function (ab) { return (ab && ab.byteLength >= 256 && sound && sound.ctx) ? sound.ctx.decodeAudioData(ab.slice(0)) : null; })
      .then(function (dec) { if (dec) self.hostPackCache[packUrl] = self.trimAudioBufferSilence(dec); })
      .catch(function () {});
  },

  playBundledVoiceClip: async function (seq, effKey, cleanText, mood, onDone, opts) {
    const packUrl = this.lookupBundledVoicePackUrl(effKey, cleanText);
    if (!packUrl || !sound || !sound.ctx || typeof fetch !== "function") return false;
    if (typeof window !== "undefined" && window.location && !/^https?:$/.test(window.location.protocol)) return false;
    try {
      let audioBuf = this.hostPackCache[packUrl] || null;
      if (!audioBuf) {
        const ctrl = typeof AbortController === "function" ? new AbortController() : null;
        const fetchTimer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4500) : null;
        const res = await fetch(packUrl, ctrl ? { signal: ctrl.signal } : undefined);
        if (fetchTimer) clearTimeout(fetchTimer);
        if (!res || !res.ok) return false;
        const arrBuf = await res.arrayBuffer();
        if (!arrBuf || arrBuf.byteLength < 256 || !sound.ctx) return false;
        const rawDecoded = await sound.ctx.decodeAudioData(arrBuf.slice(0));
        if (!rawDecoded) return false;
        audioBuf = this.trimAudioBufferSilence(rawDecoded);
        const hKeys = Object.keys(this.hostPackCache);
        if (hKeys.length > 48) delete this.hostPackCache[hKeys[0]];
        this.hostPackCache[packUrl] = audioBuf;
      }
      if (!audioBuf || seq !== this.utteranceSeq) return false;
      const playOpts = {
        skipRateAdjust: true,
        personaKey: effKey || "主持",
        mood: mood || "normal",
        seatId: (opts && typeof opts.seatId === "number") ? opts.seatId : (effKey === "主持" ? 0 : undefined),
        sitCfg: opts && opts.sitCfg,
        onAudioReady: opts && opts.onAudioReady,
        onAudioStart: opts && opts.onAudioStart,
        skipPreBreath: effKey === "主持",
        totalDurationHintMs: Math.round(audioBuf.duration * 1000)
      };
      return this.playBufferedStudioAudio(seq, audioBuf, onDone, playOpts);
    } catch (e) {
      return false;
    }
  },

  playBundledHostClip: async function (seq, cleanText, mood, onDone, opts) {
    return this.playBundledVoiceClip(seq, "主持", cleanText, mood, onDone, opts);
  },

  prefetchFreeLocalNeural: function (personaName, rawText, mood) {
    if (!this.localNeuralAvailable || !sound.ctx) return;
    const effKey = this.resolvePersonaKey(personaName);
    const cleanText = this.formatMandarinText(rawText);
    if (!cleanText) return;
    const hostPackUrl = this.lookupBundledVoicePackUrl(effKey, cleanText);
    if (effKey === "主持" && hostPackUrl) {
      // Preload bundled host MP3 into RAM for 0ms playback!
      const url = hostPackUrl;
      if (!this.hostPackCache[url] && typeof fetch === "function") {
        const self = this;
        fetch(url)
          .then(function (r) { return r && r.ok ? r.arrayBuffer() : null; })
          .then(function (ab) { return (ab && ab.byteLength >= 256 && sound.ctx) ? sound.ctx.decodeAudioData(ab.slice(0)) : null; })
          .then(function (dec) { if (dec) self.hostPackCache[url] = self.trimAudioBufferSilence(dec); })
          .catch(function () {});
      }
      return;
    }
    // Single-pass seamless cache key at baseline rate (speed is applied live via pitch-preserved HTMLAudioElement -> 100% cache hit!)
    const cacheKey = effKey + "|" + this.accentMode + "|base|" + (mood || "normal") + "||" + cleanText;
    if (this.localNeuralCache[cacheKey] || this.localNeuralPending[cacheKey]) return;
    this._fetchLocalNeuralAudio(cacheKey, effKey, cleanText, mood || "normal", null, "");
  },

  playFreeLocalNeuralTts: async function (seq, personaName, cleanText, mood, onDone, opts) {
    if (!this.localNeuralAvailable || !sound.ctx) return false;
    const effKey = this.resolvePersonaKey(personaName);
    if (!cleanText) return false;

    // Single-pass seamless neural synthesis: preserves natural cross-clause co-articulation with zero pitch/speed seam jumps!
    const ck = effKey + "|" + this.accentMode + "|base|" + (mood || "normal") + "||" + cleanText;
    let audioBuf = this.localNeuralCache[ck] || null;
    if (!audioBuf) {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timer = null;
      try {
        const fetchPromise = this._fetchLocalNeuralAudio(
          ck, effKey, cleanText, mood || "normal",
          (!this.localNeuralPending[ck] && controller) ? controller.signal : null,
          ""
        );
        const neuralTimeoutMs = clamp(11500 + cleanText.length * 60, 12000, 24000);
        const timeoutPromise = new Promise(function (resolve) {
          timer = setTimeout(function () {
            if (controller) controller.abort();
            resolve(null);
          }, neuralTimeoutMs);
        });
        audioBuf = await Promise.race([fetchPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);
      } catch (e) {
        if (timer) clearTimeout(timer);
        return false;
      }
    }
    if (!audioBuf || seq !== this.utteranceSeq) return false;

    const playOpts = {
      skipRateAdjust: true,
      personaKey: effKey,
      mood: mood || "normal",
      seatId: opts && opts.seatId,
      sitCfg: opts && opts.sitCfg,
      onAudioReady: opts && opts.onAudioReady,
      onAudioStart: opts && opts.onAudioStart,
      charRangeStart: (opts && typeof opts.charRangeStart === "number") ? opts.charRangeStart : undefined,
      charRangeEnd: (opts && typeof opts.charRangeEnd === "number") ? opts.charRangeEnd : undefined,
      totalDurationHintMs: Math.round(audioBuf.duration * 1000)
    };
    return this.playBufferedStudioAudio(seq, audioBuf, onDone, playOpts);
  },

  stripGeminiVocalTags: function (rawText) {
    return String(rawText || "")
      .replace(/<\s*(?:breath|heavy breath|exhales|chuckle|chuckles|cough|gasp|sigh|sighs|throat-clearing|pff|phew|tsk|short pause|long pause|whispers|whispering)\s*>/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  injectGeminiVocalTags: function (cleanText, effKey, mood) {
    // Official Gemini 3.8 TTS inline angle-bracket vocal cues (stripped cleanly before 2.5 or 400 retry)
    let s = String(cleanText || "").trim();
    if (!s) return s;
    if (mood === "panic") {
      s = "<breath> " + s;
    } else if (mood === "rebut") {
      s = "<gasp> " + s;
    } else if (mood === "last_words") {
      s = "<sigh> <short pause> " + s;
    } else if (mood === "claim_seer") {
      s = "<breath> " + s;
    } else if ((mood === "happy" || mood === "trust") && (effKey === "暖暖" || effKey === "星兒" || effKey === "柚子")) {
      s = "<chuckle> " + s;
    } else if (effKey === "墨白" || effKey === "晴嵐") {
      s = "<breath> " + s;
    }
    if (s.length >= 26) {
      s = s.replace(/(這輪|因此|所以|結論是|請諸君|請全場|建議大家|拜託大家)/, "<short pause> $1");
    }
    return s;
  },

  _wrapPcmBytesToWav: function (pcmBytes, sampleRate, channels) {
    const sr = Math.max(8000, parseInt(sampleRate || 24000, 10) || 24000);
    const ch = Math.max(1, Math.min(2, parseInt(channels || 1, 10) || 1));
    const dataSize = pcmBytes.byteLength;
    const byteRate = sr * ch * 2;
    const blockAlign = ch * 2;
    const out = new Uint8Array(44 + dataSize);
    const dv = new DataView(out.buffer);
    const writeStr = function (off, str) {
      for (let i = 0; i < str.length; i++) out[off + i] = str.charCodeAt(i);
    };
    writeStr(0, "RIFF");
    dv.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, ch, true);
    dv.setUint32(24, sr, true);
    dv.setUint32(28, byteRate, true);
    dv.setUint16(32, blockAlign, true);
    dv.setUint16(34, 16, true);
    writeStr(36, "data");
    dv.setUint32(40, dataSize, true);
    out.set(pcmBytes, 44);
    return out;
  },

  parseAndValidateTtsAudioBytes: function (input, defaultSampleRate) {
    let bytes = null;
    if (typeof input === "string") {
      const bin = atob(input);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else if (input instanceof Uint8Array) {
      bytes = input;
    } else if (input && input.buffer && typeof input.byteLength === "number") {
      bytes = new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength);
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    }
    if (!bytes || bytes.byteLength < 128) {
      throw new Error("TTS audio payload too short");
    }
    const isRiffWav = bytes.byteLength >= 44 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;

    let sampleRate = Math.max(8000, parseInt(defaultSampleRate || 24000, 10) || 24000);
    let numChannels = 1;
    let pcmOffset = 0;
    let pcmLength = bytes.byteLength;

    if (isRiffWav) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let off = 12;
      let foundData = false;
      while (off + 8 <= bytes.byteLength) {
        const cid = String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
        const cSize = dv.getUint32(off + 4, true);
        if (cid === "fmt " && off + 8 + Math.min(cSize, 16) <= bytes.byteLength) {
          const fmtChannels = dv.getUint16(off + 10, true);
          const fmtSr = dv.getUint32(off + 12, true);
          if (fmtChannels >= 1 && fmtChannels <= 2) numChannels = fmtChannels;
          if (fmtSr >= 8000 && fmtSr <= 96000) sampleRate = fmtSr;
        } else if (cid === "data") {
          pcmOffset = off + 8;
          pcmLength = Math.max(0, Math.min(cSize, bytes.byteLength - pcmOffset));
          foundData = true;
          break;
        }
        off += 8 + cSize + (cSize & 1);
      }
      if (!foundData || pcmLength < 64) {
        throw new Error("TTS RIFF WAV missing data chunk");
      }
    }

    const pcmView = new DataView(bytes.buffer, bytes.byteOffset + pcmOffset, pcmLength);
    const totalSamples = Math.floor(pcmLength / 2);
    const frameCount = Math.floor(totalSamples / numChannels);
    const duration = frameCount / sampleRate;
    let peakAbs = 0;
    for (let i = 0; i < totalSamples; i++) {
      const a = Math.abs(pcmView.getInt16(i * 2, true));
      if (a > peakAbs) peakAbs = a;
    }
    if (duration < 0.12 || peakAbs < 96) {
      throw new Error("TTS audio is silent or too short (dur=" + duration.toFixed(3) + "s, peak=" + peakAbs + ")");
    }
    const wavBytes = isRiffWav ? bytes : this._wrapPcmBytesToWav(bytes, sampleRate, numChannels);
    return {
      isWav: isRiffWav,
      bytes: wavBytes,
      sampleRate: sampleRate,
      numChannels: numChannels,
      pcmOffset: pcmOffset,
      pcmLength: pcmLength,
      duration: duration,
      peakAbs: peakAbs
    };
  },

  decodeGeminiAudioBytes: async function (bytes) {
    if (!bytes || bytes.byteLength < 128 || !sound.ctx) return null;
    let parsed = null;
    try {
      parsed = this.parseAndValidateTtsAudioBytes(bytes, 24000);
    } catch (e) {
      return null;
    }
    const wavBytes = parsed.bytes;
    if (typeof sound.ctx.decodeAudioData === "function") {
      try {
        const decoded = await sound.ctx.decodeAudioData(wavBytes.buffer.slice(wavBytes.byteOffset, wavBytes.byteOffset + wavBytes.byteLength));
        if (decoded) return this.trimAudioBufferSilence(decoded);
      } catch (e) {}
    }
    const view = new DataView(wavBytes.buffer, wavBytes.byteOffset + (parsed.isWav ? parsed.pcmOffset : 44), parsed.pcmLength);
    const chCount = parsed.numChannels || 1;
    const frames = Math.floor(view.byteLength / (2 * chCount));
    if (frames <= 0) return null;
    const audioBuf = sound.ctx.createBuffer(chCount, frames, parsed.sampleRate || 24000);
    for (let c = 0; c < chCount; c++) {
      const ch = audioBuf.getChannelData(c);
      for (let i = 0; i < frames; i++) {
        ch[i] = view.getInt16((i * chCount + c) * 2, true) / 32768;
      }
    }
    return this.trimAudioBufferSilence(audioBuf);
  },

  _syncCloudTtsStores: function () {
    if (this._studioCacheRef !== this.studioCache) {
      this.cloudTtsAudioCache.clear();
      if (this.studioCache && typeof this.studioCache === "object") {
        const ks = Object.keys(this.studioCache);
        for (let i = 0; i < ks.length; i++) this.cloudTtsAudioCache.set(ks[i], this.studioCache[ks[i]]);
      }
      this._studioCacheRef = this.studioCache;
    }
    if (this._studioPendingRef !== this.studioPending) {
      this.cloudTtsInflightMap.clear();
      if (this.studioPending && typeof this.studioPending === "object") {
        const pk = Object.keys(this.studioPending);
        for (let i = 0; i < pk.length; i++) this.cloudTtsInflightMap.set(pk[i], this.studioPending[pk[i]]);
      }
      this._studioPendingRef = this.studioPending;
    }
  },

  _getCachedCloudAudio: function (cacheKey) {
    this._syncCloudTtsStores();
    return (this.studioCache && this.studioCache[cacheKey]) || this.cloudTtsAudioCache.get(cacheKey) || null;
  },

  _setCachedCloudAudio: function (cacheKey, audioBuf) {
    this._syncCloudTtsStores();
    if (!audioBuf) return;
    if (this.cloudTtsAudioCache.has(cacheKey)) this.cloudTtsAudioCache.delete(cacheKey);
    while (this.cloudTtsAudioCache.size >= 48) {
      const oldest = this.cloudTtsAudioCache.keys().next().value;
      if (!oldest) break;
      this.cloudTtsAudioCache.delete(oldest);
      if (this.studioCache) delete this.studioCache[oldest];
    }
    this.cloudTtsAudioCache.set(cacheKey, audioBuf);
    if (this.studioCache) this.studioCache[cacheKey] = audioBuf;
  },

  _getInflightCloudAudio: function (cacheKey) {
    this._syncCloudTtsStores();
    return (this.studioPending && this.studioPending[cacheKey]) || this.cloudTtsInflightMap.get(cacheKey) || null;
  },

  _setInflightCloudAudio: function (cacheKey, promise) {
    this._syncCloudTtsStores();
    this.cloudTtsInflightMap.set(cacheKey, promise);
    if (this.studioPending) {
      const pKeys = Object.keys(this.studioPending);
      if (pKeys.length > 24) delete this.studioPending[pKeys[0]];
      this.studioPending[cacheKey] = promise;
    }
  },

  _deleteInflightCloudAudio: function (cacheKey) {
    this.cloudTtsInflightMap.delete(cacheKey);
    if (this.studioPending) delete this.studioPending[cacheKey];
  },

  _recordCloudTtsHardFail: function (speakerKey) {
    const sp = String(speakerKey || "default");
    if (!Array.isArray(this._cloudTtsHardFailSpeakers)) this._cloudTtsHardFailSpeakers = [];
    if (this._cloudTtsHardFailSpeakers.indexOf(sp) === -1) {
      this._cloudTtsHardFailSpeakers.push(sp);
    }
    this._cloudTtsFailStreak = this._cloudTtsHardFailSpeakers.length;
    if (this._cloudTtsHardFailSpeakers.length >= 3) {
      this.cloudGeminiTtsCooldownUntil = Date.now() + 5000;
      this._cloudTtsHardFailSpeakers = [];
      this._cloudTtsFailStreak = 0;
    }
  },

  _clearCloudTtsFailState: function () {
    this._cloudTtsHardFailSpeakers = [];
    this._cloudTtsFailStreak = 0;
    this._cloudTtsCooldownIs429 = false;
    this.cloudGeminiTtsCooldownUntil = 0;
  },

  _buildGeminiTtsPayload: function (profile, effKey, cleanText, mood) {
    const voiceName = (profile && profile.studioVoice) || "Kore";
    const canonicalText = this.toCanonicalTtsText(cleanText) || String(cleanText || "").trim();
    const cacheKey = voiceName + "|" + canonicalText;
    return {
      voiceName: voiceName,
      stylePrompt: "",
      canonicalText: canonicalText,
      taggedTranscript: canonicalText,
      cacheKey: cacheKey
    };
  },

  _fetchGeminiStudioAudio: function (profile, effKey, cleanText, mood, fetchOptsArg) {
    const hasPersonalKey = Boolean(typeof state !== "undefined" && state.geminiApiKey);
    const hasCloudProxy = this.isCloudGeminiTtsActive();
    if ((!hasPersonalKey && !hasCloudProxy) || !sound || !sound.ctx) return Promise.resolve(null);
    const payload = this._buildGeminiTtsPayload(profile, effKey, cleanText, mood || "normal");
    const cacheKey = payload.cacheKey;
    const cached = this._getCachedCloudAudio(cacheKey);
    if (cached) return Promise.resolve(cached);
    const inflight = this._getInflightCloudAudio(cacheKey);
    if (inflight) return inflight;

    const isPrefetch = Boolean(fetchOptsArg && fetchOptsArg.isPrefetch);
    const speakerTag = (fetchOptsArg && fetchOptsArg.speakerKey) || effKey || payload.voiceName;
    const liveCtrl = (!isPrefetch && typeof AbortController === "function") ? new AbortController() : null;
    if (liveCtrl) this._activeLiveTtsController = liveCtrl;

    const self = this;
    const p = (async function () {
      const isMobileNet = self.isMobileTtsNetworkEnv();
      const personalKeyTimeoutMs = isMobileNet ? 6200 : 8200;
      const timer = (hasPersonalKey && liveCtrl) ? setTimeout(function () { liveCtrl.abort(); }, personalKeyTimeoutMs) : null;
      const callCloudTtsTrackA = async function () {
        const hdrs = { "Content-Type": "application/json" };
        if (typeof getOrCreateProxySessionId === "function") {
          hdrs["X-Tea-Session"] = getOrCreateProxySessionId();
        }
        const singleTimeoutMs = 10500;
        const reqCtrl = typeof AbortController === "function" ? new AbortController() : null;
        const reqTimer = reqCtrl ? setTimeout(function () { reqCtrl.abort(); }, singleTimeoutMs) : null;
        const onLiveAbort = function () {
          if (reqCtrl) {
            try { reqCtrl.abort(); } catch (e) {}
          }
        };
        if (liveCtrl && liveCtrl.signal && typeof liveCtrl.signal.addEventListener === "function") {
          if (liveCtrl.signal.aborted) onLiveAbort();
          else liveCtrl.signal.addEventListener("abort", onLiveAbort, { once: true });
        }
        let cloudRes = null;
        let cloudErr = null;
        try {
          cloudRes = await fetch("/api/tts", {
            method: "POST",
            headers: hdrs,
            signal: reqCtrl ? reqCtrl.signal : undefined,
            body: JSON.stringify({
              voice: payload.voiceName,
              style: "",
              text: payload.canonicalText
            })
          });
        } catch (err1) {
          cloudErr = err1;
        } finally {
          if (reqTimer) clearTimeout(reqTimer);
          if (liveCtrl && liveCtrl.signal && typeof liveCtrl.signal.removeEventListener === "function") {
            liveCtrl.signal.removeEventListener("abort", onLiveAbort);
          }
        }
        if (cloudRes && cloudRes.ok) {
          self._clearCloudTtsFailState();
          const arrBuf = await cloudRes.arrayBuffer();
          if (arrBuf && arrBuf.byteLength >= 128) return new Uint8Array(arrBuf);
          self._recordCloudTtsHardFail(speakerTag);
          return null;
        }
        if (cloudErr && (cloudErr.name === "AbortError" || (liveCtrl && liveCtrl.signal && liveCtrl.signal.aborted))) {
          // Aborted by turn switch / skip: NEVER increment failure streak or trigger cooldown!
          return null;
        }
        const st = cloudRes ? cloudRes.status : 0;
        if (st === 401 || st === 403) {
          self._cloudTtsCooldownIs429 = false;
          self.cloudGeminiTtsCooldownUntil = Date.now() + 180000;
        } else if (st === 503) {
          self._cloudTtsCooldownIs429 = false;
          self.cloudGeminiTtsCooldownUntil = Date.now() + 6000;
        } else if (st === 429) {
          self._cloudTtsCooldownIs429 = true;
          self._recordCloudTtsHardFail(speakerTag);
        } else if (cloudErr || st >= 500 || st === 0 || st >= 400) {
          self._cloudTtsCooldownIs429 = false;
          self._recordCloudTtsHardFail(speakerTag);
        }
        return null;
      };
      try {
        let audioBytes = null;
        // Track A (primary when no personal key): Vercel Serverless Cloud Proxy (/api/tts)
        if (!hasPersonalKey && hasCloudProxy) {
          audioBytes = await callCloudTtsTrackA();
        }
        // Track B: Local server.py disk-caching proxy (/api/tts/gemini) when personal key + local server active
        if (!audioBytes && hasPersonalKey && self.localNeuralAvailable) {
          const proxyRes = await fetch("/api/tts/gemini", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": state.geminiApiKey
            },
            signal: liveCtrl ? liveCtrl.signal : undefined,
            body: JSON.stringify({
              voice: payload.voiceName,
              style: "",
              text: payload.canonicalText
            })
          });
          if (proxyRes && proxyRes.ok) {
            const arrBuf = await proxyRes.arrayBuffer();
            if (arrBuf && arrBuf.byteLength >= 128) audioBytes = new Uint8Array(arrBuf);
          }
        }
        // Track C: Direct browser Gemini TTS (3.8 Flash-Lite -> 3.8 Flash -> 2.5 Flash Preview; NO temperature)
        if (!audioBytes && hasPersonalKey) {
          const fallbackVoiceMap = { Orus: "Puck", Enceladus: "Puck", Achird: "Charon", Iapetus: "Puck", Fenrir: "Puck", Leda: "Zephyr", Aoede: "Zephyr", Callirrhoe: "Zephyr", Autonoe: "Zephyr", Laomedeia: "Zephyr", Vindemiatrix: "Zephyr", Sulafat: "Zephyr" };
          const fbVoice = fallbackVoiceMap[payload.voiceName] || "";
          const directModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"];
          for (let mi = 0; mi < directModels.length && !audioBytes; mi++) {
            const directModelId = directModels[mi];
            const isLegacy25 = directModelId.indexOf("gemini-2.5-") === 0;
            const spokenDirectText = isLegacy25 ? ("Say: " + payload.canonicalText) : payload.canonicalText;
            const attempts = fbVoice
              ? [{ voice: payload.voiceName }, { voice: fbVoice }]
              : [{ voice: payload.voiceName }];
            for (let vi = 0; vi < attempts.length && !audioBytes; vi++) {
              const att = attempts[vi];
              let res = null;
              try {
                res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(directModelId) + ":generateContent", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": state.geminiApiKey
                  },
                  signal: liveCtrl ? liveCtrl.signal : undefined,
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [{ text: spokenDirectText }]
                    }],
                    generationConfig: {
                      responseModalities: ["AUDIO"],
                      speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: att.voice }
                        }
                      }
                    }
                  })
                });
              } catch (fe) {
                if (fe && fe.name === "AbortError") throw fe;
                break;
              }
              if (res && res.ok) {
                const data = await res.json();
                let b64 = null;
                if (data && data.candidates && data.candidates[0] && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)) {
                  const audioPart = data.candidates[0].content.parts.find(function (pt) {
                    return pt && pt.inlineData && typeof pt.inlineData.data === "string" && pt.inlineData.data.length >= 1600;
                  });
                  if (audioPart) b64 = audioPart.inlineData.data;
                }
                if (b64) {
                  const rawBin = atob(b64);
                  audioBytes = new Uint8Array(rawBin.length);
                  for (let i = 0; i < rawBin.length; i++) audioBytes[i] = rawBin.charCodeAt(i);
                }
              } else if (res && (res.status === 401 || res.status === 403)) {
                mi = directModels.length;
                break;
              } else if (!res || res.status !== 400) {
                break;
              }
            }
          }
        }
        // Track A backup for personal-key users if Track B & Track C failed while cloud proxy is active
        if (!audioBytes && hasPersonalKey && self.isCloudGeminiTtsActive()) {
          audioBytes = await callCloudTtsTrackA();
        }
        if (timer) clearTimeout(timer);
        if (!audioBytes) return null;
        const audioBuf = await self.decodeGeminiAudioBytes(audioBytes);
        if (!audioBuf) return null;
        if (payload.canonicalText.length <= 320) {
          self._setCachedCloudAudio(cacheKey, audioBuf);
        }
        return audioBuf;
      } catch (e) {
        if (timer) clearTimeout(timer);
        return null;
      } finally {
        if (self._activeLiveTtsController === liveCtrl) self._activeLiveTtsController = null;
        self._deleteInflightCloudAudio(cacheKey);
      }
    })();
    this._setInflightCloudAudio(cacheKey, p);
    return p;
  },

  isGeminiTtsPreferred: function () {
    return Boolean(((typeof state !== "undefined" && state.geminiApiKey) || this.isCloudGeminiTtsActive()) && this.enginePref !== "local");
  },

  _splitFirstSentenceForFastStart: function (cleanText, minLen) {
    const s = String(cleanText || "").trim();
    const threshold = (typeof minLen === "number" && minLen > 0) ? minLen : 39;
    if (s.length < threshold) return null;
    const termMax = threshold >= 60 ? 58 : 36;
    const commaMax = threshold >= 60 ? 52 : 28;
    for (let i = 10; i <= Math.min(termMax, s.length - 4); i++) {
      const ch = s.charAt(i);
      if (ch === "。" || ch === "！" || ch === "？" || ch === "；") {
        let cut = i + 1;
        while (cut < s.length && (s.charAt(cut) === "」" || s.charAt(cut) === "』" || s.charAt(cut) === "）")) cut += 1;
        const head = s.slice(0, cut).trim();
        const tail = s.slice(cut).trim();
        if (head.length >= 10 && tail.length >= 2) return [head, tail];
      }
    }
    for (let i = 14; i <= Math.min(commaMax, s.length - 4); i++) {
      const ch = s.charAt(i);
      if (ch === "，" || ch === "、") {
        const head = s.slice(0, i + 1).trim();
        const tail = s.slice(i + 1).trim();
        if (head.length >= 14 && tail.length >= 2) return [head, tail];
      }
    }
    return null;
  },

  _splitTextForCloudTts: function (cleanText, maxChunkLen) {
    const s = String(cleanText || "").trim();
    const maxLen = (typeof maxChunkLen === "number" && maxChunkLen >= 24) ? maxChunkLen : 130;
    if (!s || s.length <= maxLen) return s ? [s] : [];
    const chunks = [];
    let rest = s;
    while (rest.length > maxLen) {
      let cut = -1;
      const hi = Math.min(maxLen, rest.length - 12);
      // Prefer terminal sentence punctuation within [16, hi]
      for (let i = hi; i >= 16; i--) {
        const ch = rest.charAt(i);
        if (ch === "。" || ch === "！" || ch === "？" || ch === "；") {
          cut = i + 1;
          while (cut < rest.length && (rest.charAt(cut) === "」" || rest.charAt(cut) === "』" || rest.charAt(cut) === "）")) cut += 1;
          break;
        }
      }
      // Otherwise split cleanly on a comma/pause punctuation within [20, hi]
      if (cut === -1) {
        for (let i = hi; i >= 20; i--) {
          const ch = rest.charAt(i);
          if (ch === "，" || ch === "、") {
            cut = i + 1;
            break;
          }
        }
      }
      if (cut === -1 || rest.length - cut < 10) {
        cut = Math.min(maxLen, Math.ceil(rest.length / 2));
      }
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks.filter(Boolean);
  },

  prefetchCloudGeminiTts: function (personaName, rawText, mood) {
    if (!this.canSpeak() || this.enginePref === "local") return Promise.resolve(null);
    if (!(typeof state !== "undefined" && state.geminiApiKey) && !this.isCloudGeminiTtsActive()) return Promise.resolve(null);
    if (typeof sound !== "undefined" && sound && !sound.ctx && typeof sound.unlock === "function") {
      try { sound.unlock(); } catch (e) {}
    }
    if (!sound || !sound.ctx) return Promise.resolve(null);
    const effKey = this.resolvePersonaKey(personaName);
    const cleanText = this.formatMandarinText(rawText);
    const canonicalText = this.toCanonicalTtsText(cleanText) || cleanText;
    if (!canonicalText || this.lookupBundledVoicePackUrl(effKey, canonicalText)) return Promise.resolve(null);
    const profile = PERSONA_VOICE_PROFILES[effKey] || PERSONA_VOICE_PROFILES["你"];
    // Background prefetch: never split <=130-char lines so prosody stays continuous and request count halves
    const chunks = this._splitTextForCloudTts(canonicalText, 130);
    if (chunks.length > 1) {
      return Promise.all([
        this._fetchGeminiStudioAudio(profile, effKey, chunks[0], mood || "normal", { isPrefetch: true, speakerKey: effKey }),
        this._fetchGeminiStudioAudio(profile, effKey, chunks[1], mood || "normal", { isPrefetch: true, speakerKey: effKey })
      ]);
    }
    return this._fetchGeminiStudioAudio(profile, effKey, canonicalText, mood || "normal", { isPrefetch: true, speakerKey: effKey });
  },

  prefetchBestTts: function (personaName, rawText, mood) {
    this._lastPrefetchPromise = null;
    if (!this.canSpeak()) return false;
    const effKey = this.resolvePersonaKey(personaName);
    const clean = this.formatMandarinText(rawText);
    if (!clean) return false;
    const bundledUrl = this.lookupBundledVoicePackUrl(effKey, clean);
    const forceCustomGemini = Boolean(typeof state !== "undefined" && state.geminiApiKey && this.enginePref === "gemini");
    if (bundledUrl && !forceCustomGemini) {
      if (typeof sound !== "undefined" && sound && !sound.ctx && typeof sound.unlock === "function") {
        try { sound.unlock(); } catch (e) {}
      }
      this.prefetchBundledVoicePackUrl(bundledUrl);
      return true;
    }
    if (this.isGeminiTtsPreferred()) {
      const pfPromise = this.prefetchCloudGeminiTts(effKey, clean, mood || "normal");
      this._lastPrefetchPromise = (pfPromise && typeof pfPromise.then === "function") ? pfPromise : null;
      return true;
    }
    if (this.localNeuralAvailable) {
      this.prefetchFreeLocalNeural(effKey, clean, mood || "normal");
      return true;
    }
    return false;
  },

  playGeminiStudioTts: async function (seq, profile, cleanText, mood, onDone, opts) {
    const hasPersonalKey = Boolean(typeof state !== "undefined" && state.geminiApiKey);
    const hasCloudProxy = this.isCloudGeminiTtsActive();
    if ((!hasPersonalKey && !hasCloudProxy) || !sound.ctx) return false;
    const effKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const moodNow = mood || "normal";
    const fullPayload = this._buildGeminiTtsPayload(profile, effKey, cleanText, moodNow);
    const canonicalText = fullPayload.canonicalText;
    const fullKey = fullPayload.cacheKey;
    const hasWarmFull = Boolean(this._getCachedCloudAudio(fullKey) || this._getInflightCloudAudio(fullKey));
    let chunks = [canonicalText];
    if (!hasWarmFull && canonicalText.length > 38) {
      const fastPair = this._splitFirstSentenceForFastStart(canonicalText, 39);
      if (fastPair && fastPair.length === 2) {
        const tailParts = this._splitTextForCloudTts(fastPair[1], 130);
        chunks = [fastPair[0]].concat(tailParts.length ? tailParts : [fastPair[1]]);
      } else {
        chunks = this._splitTextForCloudTts(canonicalText, 130);
      }
    }
    if (chunks.length > 1) {
      const self = this;
      const chunkPromises = new Array(chunks.length);
      const chunkOffsets = new Array(chunks.length);
      let cursor = 0;
      for (let ci = 0; ci < chunks.length; ci++) {
        chunkOffsets[ci] = cursor;
        cursor = Math.min(canonicalText.length, cursor + chunks[ci].length);
      }
      const ensureChunkFetch = function (idx) {
        if (idx < 0 || idx >= chunks.length) return null;
        if (!chunkPromises[idx]) {
          chunkPromises[idx] = self._fetchGeminiStudioAudio(profile, effKey, chunks[idx], moodNow, { isPrefetch: false, speakerKey: effKey });
        }
        return chunkPromises[idx];
      };
      // Cold-start parallel dispatch at t=0: head chunk starts fast while rest chunk prepares in parallel!
      const headP = ensureChunkFetch(0);
      ensureChunkFetch(1);
      const headBuf = await headP;
      if (!headBuf || seq !== this.utteranceSeq) return false;

      const finishRemainingFallback = function (fromIdx) {
        if (seq !== self.utteranceSeq) return;
        const remainText = chunks.slice(fromIdx).join("");
        if (!remainText) {
          self.utteranceSeq += 1;
          self.setVisualSpeaking(false);
          self.syncPauseButtonUi();
          if (typeof onDone === "function") onDone();
          return;
        }
        if (self.paused) {
          self.pauseMeta = null;
          self._resumePendingChunk = function () { finishRemainingFallback(fromIdx); };
          return;
        }
        const tailOpts = Object.assign({}, opts, {
          personaKey: effKey,
          onAudioReady: null,
          onAudioStart: null,
          charRangeStart: chunkOffsets[fromIdx] || 0,
          charRangeEnd: canonicalText.length
        });
        const effProfile = (typeof PERSONA_VOICE_PROFILES !== "undefined" && PERSONA_VOICE_PROFILES[effKey]) || profile;
        if (self.localNeuralAvailable && typeof self.playFreeLocalNeuralTts === "function") {
          self.playFreeLocalNeuralTts(seq, effKey, remainText, moodNow, onDone, tailOpts).then(function (okNeural) {
            if (!okNeural && seq === self.utteranceSeq) {
              self.speakLocalBrowserTts(seq, effProfile, remainText, moodNow, false, onDone, tailOpts);
            }
          }).catch(function () {
            if (seq === self.utteranceSeq) {
              self.speakLocalBrowserTts(seq, effProfile, remainText, moodNow, false, onDone, tailOpts);
            }
          });
          return;
        }
        self.speakLocalBrowserTts(seq, effProfile, remainText, moodNow, false, onDone, tailOpts);
      };

      const playChunkAt = function (idx, buf) {
        if (seq !== self.utteranceSeq) return false;
        if (self.paused) {
          self.pauseMeta = null;
          self._resumePendingChunk = function () {
            if (seq !== self.utteranceSeq || self.paused) return;
            const okResumed = playChunkAt(idx, buf);
            if (!okResumed) finishRemainingFallback(idx);
          };
          return true;
        }
        const isLast = idx === chunks.length - 1;
        const startC = chunkOffsets[idx] || 0;
        const endC = isLast ? canonicalText.length : (chunkOffsets[idx + 1] || canonicalText.length);
        // Rolling prefetch: kick off chunk idx+1 right as chunk idx begins playing
        if (!isLast) ensureChunkFetch(idx + 1);
        const onChunkDone = isLast ? onDone : async function () {
          if (seq !== self.utteranceSeq) return;
          const nextIdx = idx + 1;
          try {
            let nextBuf = await ensureChunkFetch(nextIdx);
            if (!nextBuf && seq === self.utteranceSeq && !self.paused) {
              const cdRemain = (self.cloudGeminiTtsCooldownUntil || 0) - Date.now();
              if (!self._cloudTtsCooldownIs429 && cdRemain < 25000) {
                self.cloudGeminiTtsCooldownUntil = 0;
                await new Promise(function (resolve) { setTimeout(resolve, 260); });
                if (seq === self.utteranceSeq && !self.paused) {
                  nextBuf = await self._fetchGeminiStudioAudio(profile, effKey, chunks[nextIdx], moodNow, { isPrefetch: false, speakerKey: effKey });
                }
              }
            }
            if (seq !== self.utteranceSeq) return;
            if (!nextBuf) {
              finishRemainingFallback(nextIdx);
              return;
            }
            const prevTxt = chunks[idx].trim();
            const bridgeMs = /[。！？；]$/.test(prevTxt) ? 75 : 38;
            await new Promise(function (resolve) { setTimeout(resolve, bridgeMs); });
            if (seq !== self.utteranceSeq) return;
            if (self.paused) {
              self.pauseMeta = null;
              self._resumePendingChunk = function () {
                if (seq !== self.utteranceSeq || self.paused) return;
                const okResumed = playChunkAt(nextIdx, nextBuf);
                if (!okResumed) finishRemainingFallback(nextIdx);
              };
              return;
            }
            const okStarted = playChunkAt(nextIdx, nextBuf);
            if (!okStarted) finishRemainingFallback(nextIdx);
          } catch (e) {
            finishRemainingFallback(nextIdx);
          }
        };
        return self.playBufferedStudioAudio(seq, buf, onChunkDone, Object.assign({}, opts, {
          keepSeqOpen: !isLast,
          skipPreBreath: true,
          skipPrepBeat: idx > 0,
          skipRateAdjust: true,
          skipTypewriterSync: idx > 0,
          skipAudioStartCallback: idx > 0,
          onAudioReady: idx === 0 ? (opts && opts.onAudioReady) : null,
          onAudioStart: idx === 0 ? (opts && opts.onAudioStart) : null,
          charRangeStart: startC,
          charRangeEnd: endC,
          totalDurationHintMs: Math.round(buf.duration * 1000)
        }));
      };
      return playChunkAt(0, headBuf);
    }
    const audioBuf = await this._fetchGeminiStudioAudio(profile, effKey, canonicalText, moodNow, { isPrefetch: false, speakerKey: effKey });
    if (!audioBuf || seq !== this.utteranceSeq) return false;
    // Gemini Studio TTS renders native vocal timbre; skip synthetic pre-breath while retaining Web Audio subtle detune/rate
    return this.playBufferedStudioAudio(seq, audioBuf, onDone, Object.assign({}, opts, {
      skipPreBreath: true,
      skipRateAdjust: true
    }));
  },

  triggerSeatBackchannel: function (seatId, kind, delayMs) {
    // Non-interrupting spatialized roundtable vocal interjection (100% public-event driven, zero hidden-role leak!)
    if (!this.enabled || !this.liveBackchannel || this.paused || this.mode === "cozy") return false;
    const canUseGeminiBc = Boolean((this.isCloudGeminiTtsActive() || (typeof state !== "undefined" && state.geminiApiKey)) && this.enginePref !== "local");
    if ((!this.localNeuralAvailable && !canUseGeminiBc) || !sound || !sound.ctx || sound.muted || this.volume < 0.08) return false;
    if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return false;
    if (typeof state === "undefined" || !state.match || !state.match.started) return false;
    const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
    if (!seatId || seatId === pid || seatId === state.activeSpeakerId) return false;
    const seat = typeof getSeat === "function" ? getSeat(seatId) : null;
    if (!seat || !seat.alive) return false;

    const turnKey = (state.match.day || 0) + ":" + (state.activeSpeakerId || 0) + ":" + (state.match.daySpeechEvents ? state.match.daySpeechEvents.length : 0);
    const now = Date.now();
    if (this._lastBackchannelTurnKey === turnKey || (now - this._lastBackchannelAt) < 2600) return false;
    const bank = PERSONA_BACKCHANNEL_CLIPS[seat.name];
    const list = bank && (bank[kind] || bank.accuse);
    if (!list || !list.length) return false;

    this._lastBackchannelTurnKey = turnKey;
    this._lastBackchannelAt = now;
    const pickIdx = ((seat.id * 7 + (state.match.day || 1) * 3 + (state.activeSpeakerId || 1)) % list.length + list.length) % list.length;
    const phrase = list[pickIdx];
    const effKey = seat.name;
    const mood = kind === "vouch" ? "trust" : (kind === "clash" ? "rebut" : "panic");
    const ck = effKey + "|" + this.accentMode + "|" + Math.round(this.rate * 100) + "|" + mood + "|backchannel|" + phrase;
    const self = this;

    // Fetch in background and bind strictly to active speaker + match phase + tracked timer (zero stale bleed-through!)
    const capturedSpeakerId = state.activeSpeakerId;
    const capturedDay = state.match.day || 0;
    const profileBc = PERSONA_VOICE_PROFILES[effKey] || PERSONA_VOICE_PROFILES["暖暖"];
    const audioPromise = canUseGeminiBc
      ? this._fetchGeminiStudioAudio(profileBc, effKey, phrase, mood)
      : this._fetchLocalNeuralAudio(ck, effKey, phrase, mood, null, "backchannel");
    const waitMs = clamp(typeof delayMs === "number" ? delayMs : 980, 480, 1800);
    if (this.backchannelTimer) clearTimeout(this.backchannelTimer);
    this.backchannelTimer = setTimeout(function () {
      self.backchannelTimer = null;
      if (!self.enabled || !self.liveBackchannel || self.paused || !self.speaking) return;
      if (!state.match || state.match.phase !== "DAY_SPEECH" || state.activeSpeakerId !== capturedSpeakerId || (state.match.day || 0) !== capturedDay) return;
      const playSeq = self.utteranceSeq;
      audioPromise.then(function (buf) {
        if (!buf || !self.enabled || !self.liveBackchannel || self.paused || !self.speaking) return;
        if (playSeq !== self.utteranceSeq) return;
        if (!state.match || state.match.phase !== "DAY_SPEECH" || state.activeSpeakerId !== capturedSpeakerId || (state.match.day || 0) !== capturedDay) return;
        const eq = (typeof PERSONA_AUDIO_EQ !== "undefined" && PERSONA_AUDIO_EQ[effKey]) ? PERSONA_AUDIO_EQ[effKey] : null;
        const pbRate = self.accentMode === "tw" && eq ? (eq.twRateMul || 1.0) : 1.02;
        const rawBcDetune = eq ? (self.accentMode === "tw" ? (eq.twDetuneCents || 0) : (eq.detuneCents || 0)) : 0;
        const detune = clamp(Math.round(rawBcDetune * 0.35), -20, 20);
        sound.playBackchannelBuffer(buf, seat.id, effKey, pbRate, detune);
      });
    }, waitMs);
    return true;
  },

  speak: function (personaName, rawText, mood, onDone, opts) {
    const clean = this.formatMandarinText(rawText);
    const isAudition = Boolean(opts && opts.isAudition);
    const savedOnDone = isAudition ? this._activeOnDone : null;
    const auditionOrigin = (isAudition && typeof savedOnDone === "function") ? {
      phase: (typeof state !== "undefined" && state.match) ? state.match.phase : null,
      day: (typeof state !== "undefined" && state.match) ? state.match.day : 0,
      speakerId: (typeof state !== "undefined") ? state.activeSpeakerId : null,
      speechTurnSeq: (typeof state !== "undefined") ? state._speechTurnSeq : 0,
      lastWordsTurnSeq: (typeof state !== "undefined") ? state._lastWordsTurnSeq : 0,
      sheriffTurnSeq: (typeof state !== "undefined") ? state._sheriffTurnSeq : 0,
      epoch: (typeof orchestrator !== "undefined") ? (typeof orchestrator.getEpoch === "function" ? orchestrator.getEpoch() : orchestrator.matchEpoch) : 0
    } : null;
    const wasBusy = Boolean(this.speaking || (this.isSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)));
    this.stop();
    const self = this;
    const effectiveOnDone = (typeof onDone === "function" || typeof savedOnDone === "function")
      ? function () {
        if (self._activeOnDone === effectiveOnDone) self._activeOnDone = null;
        if (typeof onDone === "function") onDone();
        if (typeof savedOnDone === "function") {
          const epochValidNow = (typeof orchestrator === "undefined") ||
            (typeof orchestrator.isEpochValid === "function" ? orchestrator.isEpochValid(auditionOrigin.epoch) : orchestrator.matchEpoch === auditionOrigin.epoch);
          const stillSameTurn = !auditionOrigin || (
            epochValidNow &&
            (typeof state === "undefined" || (
              (!state.match || (state.match.phase === auditionOrigin.phase && state.match.day === auditionOrigin.day)) &&
              state.activeSpeakerId === auditionOrigin.speakerId &&
              state._speechTurnSeq === auditionOrigin.speechTurnSeq &&
              state._lastWordsTurnSeq === auditionOrigin.lastWordsTurnSeq &&
              state._sheriffTurnSeq === auditionOrigin.sheriffTurnSeq
            ))
          );
          if (stillSameTurn) savedOnDone();
        }
      }
      : null;
    if (!clean || !this.canSpeak()) {
      if (opts && typeof opts.onAudioReady === "function") opts.onAudioReady(0);
      if (opts && typeof opts.onAudioStart === "function") opts.onAudioStart(0);
      if (typeof effectiveOnDone === "function") setTimeout(effectiveOnDone, 0);
      return;
    }
    this._activeOnDone = effectiveOnDone;
    const seq = ++this.utteranceSeq;
    const effKey = this.resolvePersonaKey(personaName);
    const profile = PERSONA_VOICE_PROFILES[effKey] || PERSONA_VOICE_PROFILES["你"];
    const seatId = (opts && opts.seatId) ? opts.seatId : profile.seatHint;
    const speakerObj = (opts && opts.speaker) || (seatId && typeof getSeat === "function" ? getSeat(seatId) : null);
    const sitCfg = this.resolveSituationalVoiceState(speakerObj, mood || "normal", opts);
    this.activePersonaName = effKey;
    this.activeSituationalState = sitCfg.key;
    this.liveSpokenText = clean;
    this.liveCharIndex = 0;
    this.liveInPause = false;
    this._liveMentionBeats = this._extractMentionBeatPositions(clean, seatId || 0);
    this.lastSpokenPayload = { personaName: personaName, rawText: rawText, mood: mood || "normal", seatId: seatId };
    if (typeof sound.applyPersonaVoiceChain === "function") {
      sound.applyPersonaVoiceChain(effKey, mood || "normal", seatId, sitCfg.key);
    }

    // Proactively ensure Web Audio Context is initialized before neural/cloud TTS check so we never accidentally leak robotic browser TTS!
    if ((this.localNeuralAvailable || this.isCloudGeminiTtsActive() || Boolean(typeof state !== "undefined" && state.geminiApiKey)) && !sound.ctx && typeof sound.unlock === "function") {
      sound.unlock();
    }

    // In "hybrid" mode, play a delicate 2-note character acoustic signature right as they start speaking!
    if (this.mode === "hybrid" && effKey !== "主持") {
      sound.playVoiceSignature(effKey, mood || "normal");
    }

    const forwardOpts = {
      seatId: seatId,
      personaKey: effKey,
      mood: mood || "normal",
      sitCfg: sitCfg,
      speaker: speakerObj,
      onAudioReady: opts && opts.onAudioReady,
      onAudioStart: opts && opts.onAudioStart
    };

    const fallbackToBrowser = function () {
      if (seq !== self.utteranceSeq) return;
      if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
      if (forwardOpts.onAudioStart) forwardOpts.onAudioStart(0);
      self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, effectiveOnDone, forwardOpts);
    };

    // Priority 0: Pre-generated Qingming Host + Judge Showcase Neural Voice Pack (0.02s studio playback + real FFT lip-sync even on static Vercel with zero API key!)
    const bundledUrl = this.lookupBundledVoicePackUrl(effKey, clean);
    if (bundledUrl && !sound.ctx && typeof sound.unlock === "function") {
      sound.unlock();
    }
    const useBundledPack = Boolean(bundledUrl && sound && sound.ctx && !(state.geminiApiKey && this.enginePref === "gemini"));
    if (useBundledPack) {
      this.setVisualSpeaking(true);
      this.playBundledVoiceClip(seq, effKey, clean, mood || "normal", effectiveOnDone, forwardOpts).then(function (okPack) {
        if (okPack || seq !== self.utteranceSeq) return;
        if (self.localNeuralAvailable && sound.ctx) {
          self.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", effectiveOnDone, forwardOpts).then(function (ok2) {
            if (ok2 || seq !== self.utteranceSeq) return;
            fallbackToBrowser();
          }).catch(fallbackToBrowser);
          return;
        }
        fallbackToBrowser();
      }).catch(fallbackToBrowser);
      return;
    }

    // Dual-Track Priority Router:
    // - If user connected Gemini API key OR Vercel cloud Gemini TTS proxy is available AND enginePref !== "local": run Gemini Studio TTS -> seamless fallback to $0 Local Neural -> Upgraded Browser TTS!
    // - Otherwise: run $0 Free Local Neural -> Upgraded Browser TTS!
    const wantGeminiFirst = Boolean((state.geminiApiKey || this.isCloudGeminiTtsActive()) && sound.ctx && this.enginePref !== "local");
    if (wantGeminiFirst) {
      this.setVisualSpeaking(true);
      this.playGeminiStudioTts(seq, profile, clean, mood || "normal", effectiveOnDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        if (self.localNeuralAvailable && sound.ctx) {
          self.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", effectiveOnDone, forwardOpts).then(function (ok2) {
            if (ok2 || seq !== self.utteranceSeq) return;
            fallbackToBrowser();
          }).catch(fallbackToBrowser);
          return;
        }
        fallbackToBrowser();
      }).catch(fallbackToBrowser);
      return;
    }

    if (this.localNeuralAvailable && sound.ctx) {
      this.setVisualSpeaking(true);
      this.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", effectiveOnDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        fallbackToBrowser();
      }).catch(fallbackToBrowser);
      return;
    }

    // Priority 3 (100% Free $0 Offline): Upgraded Browser Neural/OS TTS with Natural Clause Cadence
    fallbackToBrowser();
  },

  speakLocalBrowserTts: function (seq, profile, clean, mood, wasBusy, onDone, opts) {
    const self = this;
    try {
      const chosenVoice = this.pickVoiceForProfile(profile);
      const vScore = chosenVoice ? this.scoreVoiceQuality(chosenVoice) : 0;
      const isBasicVoice = vScore < 135;
      const missingMaleFallback = (profile && profile.gender === "m" && (!chosenVoice || !this.isMaleVoice(chosenVoice)));
      const sitCfg = (opts && opts.sitCfg) || { key: "standard", rateMul: 1.0, commaPauseMs: 55, periodPauseMs: 115, hesitateBeforeAccuseMs: 0, tailVolMul: 1.0 };
      const seatIdNow = (opts && opts.seatId) || 0;
      const pKey = (opts && opts.personaKey) || this.activePersonaName;

      // Natural human pitch sweet spot avoids metallic phase-vocoder artifacts in Chrome/macOS/Windows SpeechSynthesis!
      const isMalePersona = Boolean(profile && profile.gender === "m");
      const rawPitch = isBasicVoice ? (profile.basicPitch || 1.0) : (profile.pitch || 1.0);
      const pitchScale = (isMalePersona && isBasicVoice) ? 0.25 : (isMalePersona ? 0.34 : 0.46);
      const gentlePitch = 1.0 + (rawPitch - 1.0) * pitchScale;
      const basePitch = missingMaleFallback
        ? clamp(0.74 + (((profile && profile.pitch) || 0.90) - 0.80) * 0.42, 0.72, 0.84)
        : clamp(gentlePitch, (isMalePersona && isBasicVoice) ? 0.96 : (isMalePersona ? 0.91 : (isBasicVoice ? 0.90 : 0.88)), (isMalePersona && isBasicVoice) ? 1.03 : (isBasicVoice ? 1.08 : 1.11));
      const isLowPitchVoice = basePitch < 0.94 || missingMaleFallback;
      const genderVolMul = isMalePersona
        ? (isLowPitchVoice ? 1.22 : 1.16)
        : (basePitch >= 1.06 ? 0.84 : 0.88);
      const effVol = clamp(this.volume * genderVolMul * (sitCfg.tailVolMul || 1.0), 0, 1);

      const computeLiveBaseRate = function () {
        const speedMul = self.getSpeedMultiplier();
        return clamp(speedMul * (profile.rateMul || 1.0) * (sitCfg.rateMul || 1.0), 0.78, 1.85);
      };

      // Group into natural sentence-length units (~46 chars, safely under Chrome ~14s cutoff) so browser TTS intonation flows continuously!
      const clauses = this.splitMandarinClauses(clean, { maxLen: 46 });
      const clauseOffsets = [];
      let scanPos = 0;
      clauses.forEach(function (cl) {
        const found = clean.indexOf(cl, scanPos);
        const startPos = found !== -1 ? found : scanPos;
        clauseOffsets.push(startPos);
        scanPos = startPos + cl.length;
      });
      if (!this.paused) this.setVisualSpeaking(true);

      const finishOnce = function () {
        if (seq !== self.utteranceSeq) return;
        self.utteranceSeq += 1;
        self.clearTimers();
        self.activeUtterance = null;
        self._liveBrowserRestart = null;
        self.liveInPause = false;
        if (self.isSupported()) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        self.setVisualSpeaking(false);
        if (typeof onDone === "function") onDone();
      };

      // Prevent desktop Chrome from pausing utterances (NEVER forcibly unpause when user explicitly paused!)
      this.keepAliveTimer = setInterval(function () {
        if (seq !== self.utteranceSeq || self.paused) return;
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        } catch (e) {}
      }, 8500);

      // Scale global ceiling generously up to 95s + per-clause watchdog so long AI speeches NEVER cut off mid-sentence!
      const totalEstMs = Math.min(95000, Math.max(8000, Math.round((clean.length * 460) / Math.max(0.75, computeLiveBaseRate())) + clauses.length * 360 + 4000));
      this._resumeWatchdogMs = totalEstMs;
      this._resumeWatchdogFinish = finishOnce;
      this.watchdogTimer = setTimeout(function () {
        if (!self.paused) finishOnce();
      }, totalEstMs);

      let idx = 0;
      let activeClauseIdx = 0;
      let activeClauseGen = 0;

      // Enable instant live speed switching mid-sentence for browser SpeechSynthesis!
      self._liveBrowserRestart = function () {
        if (seq !== self.utteranceSeq || self.paused) return;
        activeClauseGen += 1;
        if (self.clauseTimer) { clearTimeout(self.clauseTimer); self.clauseTimer = null; }
        if (self.clauseWatchdogTimer) { clearTimeout(self.clauseWatchdogTimer); self.clauseWatchdogTimer = null; }
        if (self.charProgressTimer) { clearInterval(self.charProgressTimer); self.charProgressTimer = null; }
        idx = Math.min(clauses.length - 1, Math.max(0, activeClauseIdx));
        const remClauses = clauses.slice(idx);
        const remChars = remClauses.reduce(function (acc, cl) { return acc + cl.length; }, 0);
        const newEstMs = Math.min(95000, Math.max(8000, Math.round((remChars * 460) / Math.max(0.75, computeLiveBaseRate())) + remClauses.length * 360 + 4000));
        self._resumeWatchdogMs = newEstMs;
        if (self.watchdogTimer) { clearTimeout(self.watchdogTimer); self.watchdogTimer = null; }
        self.watchdogTimer = setTimeout(function () {
          if (!self.paused) finishOnce();
        }, newEstMs);
        try { window.speechSynthesis.cancel(); } catch (e) {}
        self.clauseTimer = setTimeout(function () {
          self.clauseTimer = null;
          speakNextClause();
        }, 45);
      };

      function speakNextClause() {
        if (seq !== self.utteranceSeq) return;
        if (self.clauseWatchdogTimer) {
          clearTimeout(self.clauseWatchdogTimer);
          self.clauseWatchdogTimer = null;
        }
        if (self.charProgressTimer) {
          clearInterval(self.charProgressTimer);
          self.charProgressTimer = null;
        }
        if (self.paused) {
          self._resumePendingClause = speakNextClause;
          return;
        }
        self._resumePendingClause = null;
        if (idx >= clauses.length) {
          finishOnce();
          return;
        }
        const curClauseIdx = idx;
        activeClauseIdx = curClauseIdx;
        const myGen = ++activeClauseGen;
        if (typeof state !== "undefined" && curClauseIdx === 0) {
          state.speechPrepUntil = 0;
          state.speechPrepSeatId = null;
        }
        const clause = clauses[curClauseIdx];
        const clauseStartChar = clauseOffsets[curClauseIdx] || 0;
        idx += 1;
        const isQuestion = /[？?]$/.test(clause);
        const isExclaim = /[！!]$/.test(clause);
        const isEllipsis = /…$/.test(clause);
        const isMajorStop = /[。！？!?…]$/.test(clause);

        const utter = new window.SpeechSynthesisUtterance(clause.replace(/…/g, ""));
        if (chosenVoice) utter.voice = chosenVoice;
        utter.lang = (chosenVoice && chosenVoice.lang) ? chosenVoice.lang : "zh-TW";

        let cRate = computeLiveBaseRate();
        let cPitch = basePitch;
        if (sitCfg.key === "under_fire") {
          cRate = clamp(cRate * 1.03, 0.94, 1.88);
          cPitch = clamp(cPitch + 0.015, 0.86, 1.12);
        } else if (sitCfg.key === "last_words" && idx === clauses.length) {
          cRate = clamp(cRate * 0.94, 0.76, 1.65);
        }
        if (isQuestion) {
          cPitch = clamp(cPitch + 0.018, 0.86, 1.13);
          cRate = clamp(cRate * 0.98, 0.78, 1.82);
        } else if (isExclaim) {
          cRate = clamp(cRate * 1.03, 0.80, 1.88);
        }

        utter.rate = cRate;
        utter.pitch = cPitch;
        utter.volume = (sitCfg.key === "wolf_nervous" && idx === clauses.length) ? clamp(effVol * 0.84, 0.1, 1) : effVol;
        self.activeUtterance = utter;
        self.liveInPause = false;
        self._notifyCharProgress(clauseStartChar, seatIdNow, sitCfg.key);

        const clauseStartAt = performance.now();
        const estClauseMs = Math.max(320, Math.round((clause.length * 215) / Math.max(0.7, cRate)));
        let boundaryActive = false;
        self.charProgressTimer = setInterval(function () {
          if (boundaryActive || seq !== self.utteranceSeq || myGen !== activeClauseGen || self.paused || self.liveInPause) return;
          const frac = clamp((performance.now() - clauseStartAt) / estClauseMs, 0, 0.99);
          const curCi = clauseStartChar + Math.floor(frac * clause.length);
          self._notifyCharProgress(curCi, seatIdNow, sitCfg.key);
        }, 55);

        utter.onboundary = function (ev) {
          if (seq !== self.utteranceSeq || myGen !== activeClauseGen) return;
          if (!boundaryActive) {
            boundaryActive = true;
            if (self.charProgressTimer) {
              clearInterval(self.charProgressTimer);
              self.charProgressTimer = null;
            }
          }
          if (ev && typeof ev.charIndex === "number") {
            self._notifyCharProgress(clauseStartChar + ev.charIndex, seatIdNow, sitCfg.key);
          }
        };

        let clauseDone = false;
        const onClauseDone = function () {
          if (clauseDone || seq !== self.utteranceSeq || myGen !== activeClauseGen) return;
          clauseDone = true;
          self.liveInPause = true;
          if (self.charProgressTimer) {
            clearInterval(self.charProgressTimer);
            self.charProgressTimer = null;
          }
          if (self.clauseWatchdogTimer) {
            clearTimeout(self.clauseWatchdogTimer);
            self.clauseWatchdogTimer = null;
          }
          if (idx >= clauses.length) {
            finishOnce();
            return;
          }
          const nextClause = clauses[idx] || "";
          // v18.0 Nervous Wolf Micro-Hesitation: pause + light throat-clear right before accusing a seat!
          const nextMentionsSeat = /(?:1[0-2]|0?[1-9])號/.test(nextClause);
          const wolfHesitateAdd = (sitCfg.key === "wolf_nervous" && nextMentionsSeat && sitCfg.hesitateBeforeAccuseMs) ? sitCfg.hesitateBeforeAccuseMs : 0;
          if (wolfHesitateAdd > 0 && typeof sound.playPreSpeechBreath === "function") {
            sound.playPreSpeechBreath(pKey, mood || "normal", seatIdNow, "wolf_nervous");
          }
          const speedScale = Math.max(1.0, self.getSpeedMultiplier());
          const basePause = isEllipsis
            ? 145
            : (isMajorStop ? Math.round((sitCfg.periodPauseMs || 180) * 0.62) : Math.round((sitCfg.commaPauseMs || 110) * 0.55));
          const rawPause = basePause + wolfHesitateAdd;
          const pauseMs = Math.max(24, Math.round(rawPause / speedScale));
          self._resumePendingClause = speakNextClause;
          self.clauseTimer = setTimeout(speakNextClause, pauseMs);
        };
        utter.onend = onClauseDone;
        utter.onerror = onClauseDone;
        const clauseMaxMs = Math.max(4800, Math.round((clause.length * 460) / cRate) + 3400);
        self.clauseWatchdogTimer = setTimeout(function () {
          if (!self.paused && !clauseDone && seq === self.utteranceSeq && myGen === activeClauseGen) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            onClauseDone();
          }
        }, clauseMaxMs);
        try {
          window.speechSynthesis.speak(utter);
        } catch (e) {
          onClauseDone();
        }
      }

      const needPrepBrowser = Boolean(seatIdNow > 0 && pKey !== "主持" && !(typeof isSpectatorFastForward === "function" && isSpectatorFastForward()));
      if (needPrepBrowser) {
        if (typeof state !== "undefined") {
          state.speechPrepUntil = performance.now() + 220;
          state.speechPrepSeatId = seatIdNow;
        }
        if (this.humanBreath && typeof sound.playPreSpeechBreath === "function") {
          sound.playPreSpeechBreath(pKey, mood || "normal", seatIdNow, sitCfg.key);
        }
        if (typeof sound.playSeatFoley === "function") {
          sound.playSeatFoley(sitCfg.key === "under_fire" ? "cloth_rustle" : "cup_lift", seatIdNow);
        }
      }
      const leadDelay = needPrepBrowser ? 220 : (wasBusy ? 55 : (this.mode === "hybrid" ? 90 : 0));
      if (leadDelay > 0) {
        this._resumePendingClause = speakNextClause;
        this.clauseTimer = setTimeout(speakNextClause, leadDelay);
      } else {
        speakNextClause();
      }
    } catch (e) {
      this.utteranceSeq += 1;
      this.clearTimers();
      this.activeUtterance = null;
      this.setVisualSpeaking(false);
      if (typeof onDone === "function") setTimeout(onDone, 0);
    }
  },

  speakHost: function (text, onDone, mood) {
    this.speak("主持", text, mood || "normal", onDone, { seatId: 0 });
  },

  speakCharacter: function (speaker, text, mood, onDone, opts) {
    const nameKey = (!speaker || speaker.id === getPlayerId()) ? "你" : speaker.name;
    this.speak(nameKey, text, mood || "normal", onDone, Object.assign({ seatId: speaker ? speaker.id : null, speaker: speaker || null }, opts || {}));
  },

  replayLast: function () {
    if (!this.lastSpokenPayload) return;
    if (!this.enabled) {
      this.enabled = true;
      const lbl = document.getElementById("voiceToggleLabel");
      if (lbl) lbl.textContent = this.getModeLabel();
    }
    this.speak(this.lastSpokenPayload.personaName, this.lastSpokenPayload.rawText, this.lastSpokenPayload.mood, undefined, { seatId: this.lastSpokenPayload.seatId });
  }
};

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.onvoiceschanged = function () { voice.refreshVoices(); };
  } catch (e) {}
}
