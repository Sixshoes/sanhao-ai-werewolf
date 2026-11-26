/**
 * 多角色配音設定、自然分句停頓（Web Speech）與 Gemini Studio TTS 語音引擎
 */
"use strict";

// ==================== MULTI-ACTOR STUDIO VOICE + NATURAL PROSODY ENGINE ====================
const PERSONA_VOICE_PROFILES = {
  "主持":  { gender: "f", slot: 0, seatHint: 0, studioVoice: "Leda",       pitch: 1.00, basicPitch: 1.00, rateMul: 0.96 },
  "你":    { gender: "f", slot: 1, seatHint: 1, studioVoice: "Kore",       pitch: 1.04, basicPitch: 1.03, rateMul: 1.00 },
  "你_男": { gender: "m", slot: 0, seatHint: 1, studioVoice: "Puck",       pitch: 0.92, basicPitch: 0.90, rateMul: 1.00 },
  "小澄":  { gender: "m", slot: 1, seatHint: 2, studioVoice: "Orus",       pitch: 0.95, basicPitch: 0.94, rateMul: 1.08 },
  "暖暖":  { gender: "f", slot: 2, seatHint: 3, studioVoice: "Aoede",      pitch: 1.08, basicPitch: 1.06, rateMul: 0.92 },
  "阿松":  { gender: "m", slot: 2, seatHint: 4, studioVoice: "Charon",     pitch: 0.80, basicPitch: 0.82, rateMul: 0.88 },
  "星兒":  { gender: "f", slot: 3, seatHint: 5, studioVoice: "Zephyr",     pitch: 1.18, basicPitch: 1.13, rateMul: 1.12 },
  "小雲":  { gender: "f", slot: 4, seatHint: 6, studioVoice: "Callirrhoe", pitch: 0.97, basicPitch: 0.98, rateMul: 1.11 },
  "阿竹":  { gender: "m", slot: 3, seatHint: 7,  studioVoice: "Fenrir",     pitch: 0.88, basicPitch: 0.89, rateMul: 0.90 },
  "晨晨":  { gender: "m", slot: 4, seatHint: 8,  studioVoice: "Puck",       pitch: 1.08, basicPitch: 1.04, rateMul: 1.16 },
  "墨白":  { gender: "m", slot: 5, seatHint: 9,  studioVoice: "Charon",     pitch: 0.74, basicPitch: 0.78, rateMul: 0.83 },
  "晴嵐":  { gender: "f", slot: 5, seatHint: 10, studioVoice: "Leda",       pitch: 0.88, basicPitch: 0.90, rateMul: 0.86 },
  "阿朗":  { gender: "m", slot: 6, seatHint: 11, studioVoice: "Orus",       pitch: 1.01, basicPitch: 0.98, rateMul: 1.14 },
  "柚子":  { gender: "f", slot: 6, seatHint: 12, studioVoice: "Zephyr",     pitch: 1.26, basicPitch: 1.18, rateMul: 1.14 }
};

const PERSONA_TTS_DIRECTIONS = {
  "主持":  "沉穩溫雅的台灣書院說書女聲，語氣端莊自然，像真實茶席主持人近距離引導，避免機械播音腔",
  "你":    "自然親切的台灣女大學生日常對話口吻，呼吸自然、不字正腔圓唸稿",
  "你_男": "自然沉穩的台灣男大學生日常口語，吐字輕鬆真實、條理分明",
  "小澄":  "冷靜銳利的台灣資工系男大生自然口語，先沉思半拍再俐落切入重點，不帶播音腔",
  "暖暖":  "溫柔親切、帶淺淺笑意與呼吸氣音的台灣女大生日常聊天語氣",
  "阿松":  "渾厚接地氣、帶台灣山林老學長江湖人情味與鬆弛幽默感的成熟男聲",
  "星兒":  "靈動直覺、像綜藝圓桌現場突然眼睛一亮的台灣少女真實口語",
  "小雲":  "俐落清晰、在茶桌上翻看筆記冷靜追問細節的台灣知性學姊口吻",
  "阿竹":  "溫潤從容、帶江南書院茶人雅韻與舒緩呼吸停頓的青年男聲",
  "晨晨":  "爽朗直率、像球社隊長在圓桌直接表態的陽光台灣男大生口吻",
  "墨白":  "低沉冷峻、胸腔共鳴渾厚、如魏晉名士從容落筆判詞般古雅端重的男聲",
  "晴嵐":  "溫婉清雅、帶宋詞古箏柔韻與輕柔氣息、柔中帶剛的古典學姊女聲",
  "阿朗":  "節奏明快、重音鮮明、像辯論社主辯現場反問質詢的台灣男大生聲線",
  "柚子":  "甜美元氣、輕快自然像點心社學妹在圓桌分享直覺的台灣少女口語"
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
  "第2晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象。": "assets/voice_pack/host_n2_wolf.mp3",
  "第1晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。": "assets/voice_pack/host_n1_seer.mp3",
  "第2晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。": "assets/voice_pack/host_n2_seer.mp3",
  "滴水奉茶師請睜眼，要端出清心醒神茶請可疑者離席冷靜嗎？": "assets/voice_pack/host_witch_ask.mp3",
  "第1天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。": "assets/voice_pack/host_d1_peace.mp3",
  "第2天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。": "assets/voice_pack/host_d2_peace.mp3",
  "輪到1號你發言了，請選擇卡牌表態。": "assets/voice_pack/host_turn_p1.mp3",
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
  hostPackCache: {},
  localNeuralCache: {},
  localNeuralPending: {},
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
      self.prefetchFreeLocalNeural("主持", "輪到1號你發言了，請選擇卡牌表態。", "normal");
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
      } else if (res.status === 404 || res.status === 405 || res.status === 501) {
        this._localTtsEndpointUnavailable = true;
        this.localNeuralAvailable = false;
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
    return this.enabled && (this.mode === "tts" || this.mode === "hybrid") && this.volume > 0.02 && (this.isSupported() || this.localNeuralAvailable || Boolean(typeof sound !== "undefined" && sound.ctx) || Boolean(typeof state !== "undefined" && state.geminiApiKey));
  },

  getModeLabel: function () {
    if (!this.enabled) return "語音:關";
    if (this.mode === "cozy") return "語音:樂音";
    if (this.mode === "tts") return "語音:人聲";
    return "語音:柔聲";
  },

  isNoveltyOrRoboticVoice: function (v) {
    const name = String(v.name || "");
    return /\b(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph|Kathy)\b/i.test(name);
  },

  scoreVoiceQuality: function (v) {
    const lang = String(v.lang || "");
    const name = String(v.name || "");
    if (this.isNoveltyOrRoboticVoice(v)) return -200;
    let score = 0;
    const isTw = /zh[-_]?tw/i.test(lang) || /Taiwan|臺灣|台灣|HsiaoChen|HsiaoYu|YunJhe|Meijia|美佳/i.test(name);
    if (isTw) score += 70;
    else if (/^zh|^cmn/i.test(lang)) score += 25;

    if (/Online.*Natural|Natural|Neural/i.test(name)) score += 130;
    else if (/Siri|Premium|優質|Enhanced|進階/i.test(name)) score += 105;
    else if (/Google\s*國語|Google.*Taiwan/i.test(name)) score += 90;
    else if (/Google.*Chinese|Google\s*普通话/i.test(name)) score += 72;
    else if (/Meijia|美佳/i.test(name)) score += 45;
    else if (/Tingting|婷婷/i.test(name)) score += 35;

    if (/Desktop|Hanhan|Yating|Zhiwei|Compact/i.test(name) && !/Natural|Online|Enhanced|Premium/i.test(name)) score -= 30;
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
        const useGemFirst = hasGemKey && this.enginePref !== "local";
        if (this.mode === "cozy") {
          lbl.textContent = "目前：12角色療癒原音樂音（零機械感・3D定位）";
        } else if (useGemFirst) {
          lbl.textContent = "Gemini 3.8 真人氣口演技（12 位真人級聲線" + (this.localNeuralAvailable ? "・含硬碟快取）" : "）");
        } else if (this.localNeuralAvailable) {
          lbl.textContent = "v13 擬真多角色神經配音已連線（12 位真人級聲線・逐句韻律・$0）";
        } else if (bestScore >= 150) {
          lbl.textContent = "免費神經聲線：" + zh[0].name.split(" ")[0];
        } else if (bestScore >= 130) {
          lbl.textContent = "高清晰聲線：" + zh[0].name.split(" ")[0] + "（已啟用分句柔化）";
        } else if (zh.length > 0) {
          lbl.textContent = "系統基本聲線（已啟用台灣韻律柔化）";
        } else {
          lbl.textContent = "未偵測到華語人聲（推薦切療癒樂音）";
        }
      }
      if (hintBox) {
        hintBox.classList.toggle("hidden", Boolean(this.localNeuralAvailable || (typeof state !== "undefined" && state.geminiApiKey) || bestScore >= 145 || this.mode === "cozy"));
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
      // Scan ALL zh voices for genuine male voices so Chrome OS Google female voice is not forced onto male characters when a local male voice exists!
      this.maleVoices = zh.filter(function (v) { return self.isMaleVoice(v); });
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
    return out
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
      .replace(/(?<!，)(我是明心觀察員|我是滴水奉茶師|我是護心守衛|我是直心糾察長)/g, "，$1")
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
    if (sWave && isSpeechStage) {
      sWave.classList.toggle("playing", active || isTypingNow);
    }
    if (isSpeechStage) {
      const livePill = document.getElementById("speakerLiveStatePill");
      if (livePill) {
        livePill.textContent = isTypingNow ? "發言中" : (active ? "語音中" : "已講畢");
      }
      const nextBtn = document.getElementById("btnStepNext");
      if (nextBtn && (phNow === "DAY_SPEECH" || phNow === "LAST_WORDS_SPEECH") && !nextBtn.classList.contains("hidden")) {
        nextBtn.className = (!isTypingNow && !active)
          ? "cta-brass py-1.5 px-3.5 text-xs shrink-0 inline-flex items-center"
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
    this.paused = false;
    this.pauseMeta = null;
    this._resumePendingClause = null;
    this._resumeWatchdogFinish = null;
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

  syncQuickSpeedButtonUi: function () {
    const btn = typeof document !== "undefined" ? document.getElementById("btnQuickVoiceSpeed") : null;
    if (!btn) return;
    const label = this.rate >= 1.34 ? "1.5×" : (this.rate >= 1.18 ? "1.3×" : (this.rate >= 1.05 ? "1.15×" : "1.0×"));
    btn.textContent = label;
  },

  cycleQuickRate: function () {
    const next = this.rate < 1.05 ? 1.10 : (this.rate < 1.18 ? 1.22 : (this.rate < 1.34 ? 1.42 : 0.96));
    this.rate = next;
    this.syncQuickSpeedButtonUi();
    if (typeof syncPrefsToControls === "function") syncPrefsToControls();
    if (typeof saveUserPrefs === "function") saveUserPrefs();
    return next;
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
    if (sound.ctx.state === "suspended" && typeof sound.ctx.resume === "function") {
      sound.ctx.resume().catch(function () {});
    }
    const vGain = sound.ctx.createGain();
    const skipRateAdjust = Boolean(opts && opts.skipRateAdjust);
    const pKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const sitCfg = (opts && opts.sitCfg) || { key: "standard", rateMul: 1.0, tailFadeSec: 0, tailVolMul: 1.0 };
    const sitKey = sitCfg.key || "standard";
    this.activeSituationalState = sitKey;
    if (typeof sound.applyPersonaVoiceChain === "function") {
      sound.applyPersonaVoiceChain(pKey, (opts && opts.mood) || "normal", opts && opts.seatId, sitKey);
    }

    let twTrim = 1.0;
    let baseDetune = 0;
    const eqCfg = (typeof PERSONA_AUDIO_EQ !== "undefined" && PERSONA_AUDIO_EQ[pKey]) ? PERSONA_AUDIO_EQ[pKey] : null;
    if (eqCfg) {
      if (this.accentMode === "tw") {
        twTrim = eqCfg.twRateMul || 1.0;
        baseDetune = eqCfg.twDetuneCents || 0;
      } else {
        twTrim = eqCfg.animeRateMul || 1.0;
        baseDetune = eqCfg.detuneCents || 0;
      }
    }
    const isYunJheFixed = Boolean(pKey === "阿松" || (this.accentMode === "tw" && (pKey === "你_男" || pKey === "小澄" || pKey === "阿竹" || pKey === "晨晨" || pKey === "墨白" || pKey === "阿朗")));
    const userRateBlend = isYunJheFixed ? clamp(1.0 + (this.rate - 0.96) * 0.72, 0.92, 1.48) : clamp(this.rate / 0.96, 0.92, 1.48);
    const rateNudge = ((opts && typeof opts.rateNudge === "number") ? opts.rateNudge : 1.0) * (sitCfg.rateMul || 1.0);
    const detuneNudge = (opts && typeof opts.detuneNudge === "number") ? opts.detuneNudge : 0;
    // Allow true 1.5x speed without chipmunk pitch via HTMLAudioElement(preservesPitch=true)!
    const pbRate = skipRateAdjust
      ? clamp(twTrim * rateNudge * userRateBlend, 0.84, 1.52)
      : clamp(this.rate * twTrim * rateNudge, 0.84, 1.52);

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
    } else if (audioBuf && audioBuf.duration && startOffset === 0 && !(opts && opts.skipTypewriterSync) && typeof syncTypewriterToAudioDuration === "function") {
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
        if (self.charProgressTimer) clearInterval(self.charProgressTimer);
        self.charProgressTimer = setInterval(function () {
          if (seq !== self.utteranceSeq || self.paused) return;
          const frac = clamp((performance.now() - playStartAt) / estPlayMs, 0, 1);
          const ci = Math.min(self.liveSpokenText.length - 1, Math.floor(frac * self.liveSpokenText.length));
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
        if (!(opts && opts.keepSeqOpen)) self.setVisualSpeaking(false);
        self.syncPauseButtonUi();
        if (typeof onDone === "function") onDone();
      };

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

      // v18.0 True Pitch-Preserving Speed Playback via HTMLAudioElement (preservesPitch = true) + MediaElementAudioSourceNode!
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
            aEl.preservesPitch = true;
            aEl.mozPreservesPitch = true;
            aEl.webkitPreservesPitch = true;
            aEl.playbackRate = pbRate;
            aEl.volume = 1.0;
            if (startOffset > 0) {
              try { aEl.currentTime = startOffset; } catch (e) {}
            }
            const mediaSrc = sound.ctx.createMediaElementSource(aEl);
            mediaSrc.connect(vGain);
            self.activeAudioEl = aEl;
            self.activeMediaElSrc = mediaSrc;
            self.activeAudioBlobUrl = blobUrl;
            aEl.onended = finishOnce;
            aEl.onerror = finishOnce;
            const playP = aEl.play();
            if (playP && typeof playP.catch === "function") {
              playP.catch(function () { finishOnce(); });
            }
            usedPitchEl = true;
          } catch (e) {
            self._cleanupActiveAudioEl();
            try { URL.revokeObjectURL(blobUrl); } catch (err) {}
          }
        }
      }

      if (!usedPitchEl) {
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
        rate: this.rate,
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
    if (effKey === "主持" && HOST_VOICE_PACK_MAP[cleanText]) {
      return HOST_VOICE_PACK_MAP[cleanText];
    }
    const zhSeatMap = { "十二": "12", "十一": "11", "十": "10", "九": "9", "八": "8", "七": "7", "六": "6", "五": "5", "四": "4", "三": "3", "二": "2", "一": "1" };
    const compact = String(cleanText)
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
    if (effKey === "主持" && HOST_VOICE_PACK_MAP[cleanText]) {
      // Preload bundled host MP3 into RAM for 0ms playback!
      const url = HOST_VOICE_PACK_MAP[cleanText];
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
    // Single-pass seamless cache key (matches playFreeLocalNeuralTts 1-to-1 for zero splice hiccups & 100% prefetch hit!)
    const cacheKey = effKey + "|" + this.accentMode + "|" + Math.round(this.rate * 100) + "|" + (mood || "normal") + "||" + cleanText;
    if (this.localNeuralCache[cacheKey] || this.localNeuralPending[cacheKey]) return;
    this._fetchLocalNeuralAudio(cacheKey, effKey, cleanText, mood || "normal", null, "");
  },

  playFreeLocalNeuralTts: async function (seq, personaName, cleanText, mood, onDone, opts) {
    if (!this.localNeuralAvailable || !sound.ctx) return false;
    const effKey = this.resolvePersonaKey(personaName);
    if (!cleanText) return false;

    // Single-pass seamless neural synthesis: preserves natural cross-clause co-articulation with zero pitch/speed seam jumps!
    const ck = effKey + "|" + this.accentMode + "|" + Math.round(this.rate * 100) + "|" + (mood || "normal") + "||" + cleanText;
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
      totalDurationHintMs: Math.round(audioBuf.duration * 1000)
    };
    return this.playBufferedStudioAudio(seq, audioBuf, onDone, playOpts);
  },

  injectGeminiVocalTags: function (cleanText, effKey, mood) {
    // Official Gemini 3.8 TTS inline angle-bracket human vocal bursts (<breath>, <sigh>, <chuckle>, <gasp>, <short pause>)
    let s = String(cleanText || "").trim();
    if (!s) return s;
    if (mood === "panic") {
      s = "<breath> " + s;
    } else if (mood === "rebut") {
      s = "<gasp> " + s;
    } else if (mood === "last_words") {
      s = "<sigh> <short pause> " + s;
    } else if ((mood === "happy" || mood === "trust") && (effKey === "暖暖" || effKey === "柚子")) {
      s = "<chuckle> " + s;
    } else if (effKey === "墨白" || effKey === "阿松") {
      s = "<breath> " + s;
    }
    // Insert a subtle <short pause> right before dramatic verdict / vote callout if long enough
    if (s.length >= 28) {
      s = s.replace(/(這輪|因此|所以|結論是|請諸君|請全場)/, "<short pause> $1");
    }
    return s;
  },

  decodeGeminiAudioBytes: async function (bytes) {
    if (!bytes || bytes.byteLength < 128 || !sound.ctx) return null;
    const isRiffWav = bytes.byteLength > 44 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (isRiffWav && typeof sound.ctx.decodeAudioData === "function") {
      try {
        const decoded = await sound.ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        if (decoded) return this.trimAudioBufferSilence(decoded);
      } catch (e) {}
    }
    // Fallback for headerless 24kHz 16-bit little-endian linear PCM (audio/l16)
    const pcmOffset = isRiffWav ? 44 : 0;
    const view = new DataView(bytes.buffer, bytes.byteOffset + pcmOffset, bytes.byteLength - pcmOffset);
    const samples = Math.floor(view.byteLength / 2);
    if (samples <= 0) return null;
    const audioBuf = sound.ctx.createBuffer(1, samples, 24000);
    const ch = audioBuf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      ch[i] = view.getInt16(i * 2, true) / 32768;
    }
    return this.trimAudioBufferSilence(audioBuf);
  },

  playGeminiStudioTts: async function (seq, profile, cleanText, mood, onDone, opts) {
    if (!state.geminiApiKey || !sound.ctx) return false;
    const voiceName = profile.studioVoice || "Kore";
    const effKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const cacheKey = voiceName + ":" + effKey + ":" + (mood || "normal") + ":" + (this.rate >= 1.18 ? "f2" : (this.rate >= 1.06 ? "f1" : "n")) + ":" + cleanText;
    if (this.studioCache[cacheKey]) {
      return this.playBufferedStudioAudio(seq, this.studioCache[cacheKey], onDone, Object.assign({}, opts, { skipPreBreath: true, skipRateAdjust: true }));
    }
    const baseDir = PERSONA_TTS_DIRECTIONS[effKey] || "自然親切的台灣年輕人日常口語";
    const moodDirMap = {
      panic: "略帶緊張急促與真實換氣感，急著替自己澄清",
      accuse: "語氣堅定有張力、重音落在關鍵疑點上，像真人圓桌推理對質",
      claim_seer: "語氣鄭重篤定、亮出底牌號召全場信任",
      rebut: "語氣果決反擊、直接點破對方矛盾",
      trust: "語氣溫和真誠、像對夥伴點頭肯定",
      happy: "語氣輕快自然、帶著淺淺笑意",
      last_words: "語氣沉靜略帶感慨、像離席前的真心叮嚀",
      host_night: "語氣低沉溫潤、營造靜謐山城夜色",
      host_dawn: "語氣清朗明快、揭曉天亮結果"
    };
    const paceDir = this.rate >= 1.18 ? "；整體語速明顯輕快緊湊" : (this.rate >= 1.06 ? "；語速略快自然" : "");
    const stylePrompt = baseDir + "；" + (moodDirMap[mood] || "自然流暢像圍坐木桌泡茶聊天，有真實抑揚頓挫與呼吸感") + paceDir;
    const taggedTranscript = this.injectGeminiVocalTags(cleanText, effKey, mood || "normal");

    const controller = new AbortController();
    const geminiTtsTimeoutMs = clamp(10000 + cleanText.length * 75, 11000, 24000);
    const timer = setTimeout(function () { controller.abort(); }, geminiTtsTimeoutMs);
    try {
      let audioBytes = null;
      // Route through local disk-caching proxy (/api/tts/gemini -> .tts_cache/gem_*.wav) when server.py is active!
      if (this.localNeuralAvailable) {
        const proxyRes = await fetch("/api/tts/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": state.geminiApiKey
          },
          signal: controller.signal,
          body: JSON.stringify({
            voice: voiceName,
            style: stylePrompt,
            text: taggedTranscript
          })
        });
        if (proxyRes && proxyRes.ok) {
          const arrBuf = await proxyRes.arrayBuffer();
          if (arrBuf && arrBuf.byteLength >= 128) audioBytes = new Uint8Array(arrBuf);
        }
      }
      // Pure-static cloud fallback: call official Gemini 2.5 Flash Preview TTS generateContent API directly
      if (!audioBytes) {
        const ttsPromptText = stylePrompt ? (stylePrompt + "：\n" + taggedTranscript) : taggedTranscript;
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": state.geminiApiKey
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{ text: ttsPromptText }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName }
                }
              }
            }
          })
        });
        if (res && res.ok) {
          const data = await res.json();
          let b64 = null;
          if (data && data.candidates && data.candidates[0] && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)) {
            const audioPart = data.candidates[0].content.parts.find(function (pt) { return pt && pt.inlineData && pt.inlineData.data; });
            if (audioPart) b64 = audioPart.inlineData.data;
          }
          if (b64) {
            const rawBin = atob(b64);
            audioBytes = new Uint8Array(rawBin.length);
            for (let i = 0; i < rawBin.length; i++) audioBytes[i] = rawBin.charCodeAt(i);
          }
        }
      }
      clearTimeout(timer);
      if (!audioBytes || seq !== this.utteranceSeq) return false;
      const audioBuf = await this.decodeGeminiAudioBytes(audioBytes);
      if (!audioBuf || seq !== this.utteranceSeq) return false;
      if (cleanText.length <= 96) {
        const keys = Object.keys(this.studioCache);
        if (keys.length > 32) delete this.studioCache[keys[0]];
        this.studioCache[cacheKey] = audioBuf;
      }
      // Gemini 3.8 TTS already renders natural <breath> inline, so skip synthetic pre-breath!
      return this.playBufferedStudioAudio(seq, audioBuf, onDone, Object.assign({}, opts, { skipPreBreath: true, skipRateAdjust: true }));
    } catch (e) {
      clearTimeout(timer);
      return false;
    }
  },

  triggerSeatBackchannel: function (seatId, kind, delayMs) {
    // Non-interrupting spatialized roundtable vocal interjection (100% public-event driven, zero hidden-role leak!)
    if (!this.enabled || !this.liveBackchannel || this.paused || this.mode === "cozy") return false;
    if (!this.localNeuralAvailable || !sound || !sound.ctx || sound.muted || this.volume < 0.08) return false;
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
    const audioPromise = this._fetchLocalNeuralAudio(ck, effKey, phrase, mood, null, "backchannel");
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
        const detune = eq ? (self.accentMode === "tw" ? (eq.twDetuneCents || 0) : (eq.detuneCents || 0)) : 0;
        sound.playBackchannelBuffer(buf, seat.id, effKey, pbRate, detune);
      });
    }, waitMs);
    return true;
  },

  speak: function (personaName, rawText, mood, onDone, opts) {
    const clean = this.formatMandarinText(rawText);
    const wasBusy = Boolean(this.speaking || (this.isSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)));
    this.stop();
    if (!clean || !this.canSpeak()) {
      if (opts && typeof opts.onAudioReady === "function") opts.onAudioReady(0);
      if (typeof onDone === "function") setTimeout(onDone, 0);
      return;
    }
    const seq = ++this.utteranceSeq;
    const self = this;
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

    // Proactively ensure Web Audio Context is initialized before neural TTS check so we never accidentally leak browser Google TTS!
    if (this.localNeuralAvailable && !sound.ctx && typeof sound.unlock === "function") {
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
      onAudioReady: opts && opts.onAudioReady
    };

    // Priority 0: Pre-generated Qingming Host + Judge Showcase Neural Voice Pack (0.02s studio playback + real FFT lip-sync even on static Vercel with zero API key!)
    const bundledUrl = this.lookupBundledVoicePackUrl(effKey, clean);
    if (bundledUrl && !sound.ctx && typeof sound.unlock === "function") {
      sound.unlock();
    }
    const useBundledPack = Boolean(bundledUrl && sound && sound.ctx && !(state.geminiApiKey && this.enginePref === "gemini"));
    if (useBundledPack) {
      this.setVisualSpeaking(true);
      this.playBundledVoiceClip(seq, effKey, clean, mood || "normal", onDone, forwardOpts).then(function (okPack) {
        if (okPack || seq !== self.utteranceSeq) return;
        if (self.localNeuralAvailable && sound.ctx) {
          self.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", onDone, forwardOpts).then(function (ok2) {
            if (ok2 || seq !== self.utteranceSeq) return;
            if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
            self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
          });
          return;
        }
        if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
        self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
      });
      return;
    }

    // Dual-Track Priority Router (v13.1):
    // - If user connected Gemini API key AND enginePref !== "local": run Gemini 3.8 Flash TTS (with .tts_cache disk caching!) -> seamless fallback to $0 Local Neural -> Browser TTS!
    // - Otherwise: run $0 Free Local Neural (multi-clause prosody arc + silence trim) -> Gemini fallback -> Browser TTS!
    const wantGeminiFirst = Boolean(state.geminiApiKey && sound.ctx && this.enginePref !== "local");
    if (wantGeminiFirst) {
      this.setVisualSpeaking(true);
      this.playGeminiStudioTts(seq, profile, clean, mood || "normal", onDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        if (self.localNeuralAvailable && sound.ctx) {
          self.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", onDone, forwardOpts).then(function (ok2) {
            if (ok2 || seq !== self.utteranceSeq) return;
            if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
            self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
          });
          return;
        }
        if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
        self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
      });
      return;
    }

    if (this.localNeuralAvailable && sound.ctx) {
      this.setVisualSpeaking(true);
      this.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", onDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
        self.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
      });
      return;
    }

    // Priority 3 (100% Free $0 Offline): Upgraded Browser Neural/OS TTS with Natural Clause Cadence
    if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
    this.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone, forwardOpts);
  },

  speakLocalBrowserTts: function (seq, profile, clean, mood, wasBusy, onDone, opts) {
    const self = this;
    try {
      const chosenVoice = this.pickVoiceForProfile(profile);
      const vScore = chosenVoice ? this.scoreVoiceQuality(chosenVoice) : 0;
      const isBasicVoice = vScore < 135;
      const missingMaleFallback = (profile && profile.gender === "m" && (!chosenVoice || !this.isMaleVoice(chosenVoice)));
      const sitCfg = (opts && opts.sitCfg) || { key: "standard", rateMul: 1.0, commaPauseMs: 110, periodPauseMs: 180, hesitateBeforeAccuseMs: 0, tailVolMul: 1.0 };
      const seatIdNow = (opts && opts.seatId) || 0;
      const pKey = (opts && opts.personaKey) || this.activePersonaName;

      // Expressive Per-Persona Vocal Range + 4-State Situational Speed Modulation
      const baseRate = clamp(this.rate * (profile.rateMul || 1.0) * (sitCfg.rateMul || 1.0), 0.76, 1.44);
      const basePitch = missingMaleFallback
        ? clamp((profile.pitch || 0.94) - 0.14, 0.68, 0.94)
        : (isBasicVoice
          ? clamp(profile.basicPitch || 1.0, 0.76, 1.20)
          : clamp(profile.pitch || 1.0, 0.70, 1.30));
      const isMalePersona = Boolean(profile && profile.gender === "m");
      const isLowPitchVoice = basePitch < 0.90 || missingMaleFallback;
      const genderVolMul = isMalePersona
        ? (isLowPitchVoice ? 1.22 : 1.16)
        : (basePitch >= 1.12 ? 0.83 : 0.87);
      const effVol = clamp(this.volume * genderVolMul * (sitCfg.tailVolMul || 1.0), 0, 1);

      const clauses = this.splitMandarinClauses(clean);
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
      const totalEstMs = Math.min(95000, Math.max(8000, Math.round((clean.length * 460) / baseRate) + clauses.length * 420 + 4000));
      this._resumeWatchdogMs = totalEstMs;
      this._resumeWatchdogFinish = finishOnce;
      this.watchdogTimer = setTimeout(function () {
        if (!self.paused) finishOnce();
      }, totalEstMs);

      let idx = 0;
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

        let cRate = baseRate;
        let cPitch = basePitch;
        if (sitCfg.key === "under_fire") {
          cRate = clamp(cRate * 1.03, 0.94, 1.46);
          cPitch = clamp(cPitch + (isBasicVoice ? 0.01 : 0.025), 0.72, 1.28);
        } else if (sitCfg.key === "last_words" && idx === clauses.length) {
          cRate = clamp(cRate * 0.94, 0.72, 1.12);
        }
        if (isQuestion) {
          cPitch = clamp(cPitch + (isBasicVoice ? 0.012 : 0.028), 0.72, 1.28);
          cRate = clamp(cRate * 0.98, 0.76, 1.42);
        } else if (isExclaim) {
          cRate = clamp(cRate * 1.03, 0.78, 1.46);
        }

        utter.rate = cRate;
        utter.pitch = cPitch;
        utter.volume = (sitCfg.key === "wolf_nervous" && idx === clauses.length) ? clamp(effVol * 0.84, 0.1, 1) : effVol;
        self.activeUtterance = utter;
        self.liveInPause = false;
        self._notifyCharProgress(clauseStartChar, seatIdNow, sitCfg.key);

        const clauseStartAt = performance.now();
        const estClauseMs = Math.max(380, Math.round((clause.length * 225) / Math.max(0.7, cRate)));
        self.charProgressTimer = setInterval(function () {
          if (seq !== self.utteranceSeq || self.paused || self.liveInPause) return;
          const frac = clamp((performance.now() - clauseStartAt) / estClauseMs, 0, 0.99);
          const curCi = clauseStartChar + Math.floor(frac * clause.length);
          self._notifyCharProgress(curCi, seatIdNow, sitCfg.key);
        }, 55);

        utter.onboundary = function (ev) {
          if (seq !== self.utteranceSeq) return;
          if (ev && typeof ev.charIndex === "number") {
            self._notifyCharProgress(clauseStartChar + ev.charIndex, seatIdNow, sitCfg.key);
          }
        };

        let clauseDone = false;
        const onClauseDone = function () {
          if (clauseDone || seq !== self.utteranceSeq) return;
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
          // v18.0 Nervous Wolf Micro-Hesitation: 240ms pause + light throat-clear right before accusing a seat!
          const nextMentionsSeat = /(?:1[0-2]|0?[1-9])號/.test(nextClause);
          const wolfHesitateAdd = (sitCfg.key === "wolf_nervous" && nextMentionsSeat && sitCfg.hesitateBeforeAccuseMs) ? sitCfg.hesitateBeforeAccuseMs : 0;
          if (wolfHesitateAdd > 0 && typeof sound.playPreSpeechBreath === "function") {
            sound.playPreSpeechBreath(pKey, mood || "normal", seatIdNow, "wolf_nervous");
          }
          const pauseMs = (isEllipsis ? 210 : (isMajorStop ? (sitCfg.periodPauseMs || 180) : (sitCfg.commaPauseMs || 110))) + wolfHesitateAdd;
          self._resumePendingClause = speakNextClause;
          self.clauseTimer = setTimeout(speakNextClause, pauseMs);
        };
        utter.onend = onClauseDone;
        utter.onerror = onClauseDone;
        const clauseMaxMs = Math.max(4800, Math.round((clause.length * 460) / cRate) + 3400);
        self.clauseWatchdogTimer = setTimeout(function () {
          if (!self.paused && !clauseDone && seq === self.utteranceSeq) {
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
