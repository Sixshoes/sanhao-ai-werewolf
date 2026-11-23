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
  "主持":  "沉穩溫雅的台灣書院說書女聲，語氣端莊有韻味",
  "你":    "自然親切的台灣女大學生口語，清晰從容",
  "你_男": "自然沉穩的台灣男大學生口語，條理清晰",
  "小澄":  "冷靜銳利、節奏俐落像數據工程師分析報告的台灣理工男大生口語",
  "暖暖":  "溫柔軟萌、帶甜美笑意與泡茶暖場感的台灣女大學生口語",
  "阿松":  "沉穩厚實、豪爽帶台味山林老江湖氣息的登山社學長男聲",
  "星兒":  "活潑靈動、帶中二占星驚嘆與綜藝感的台灣少女口語",
  "小雲":  "俐落果斷、像新聞台事實查核主播的台灣知性女聲",
  "阿竹":  "溫潤斯文、帶江南書院詩茶半文言韻味與從容停頓的男聲",
  "晨晨":  "熱血爽朗、元氣十足像運動漫畫主角的陽光男大生口語",
  "墨白":  "低沉冷峻、不疾不徐、如魏晉名士宣讀文言判詞般端重有威嚴的古風男聲",
  "晴嵐":  "溫婉清雅、抑揚頓挫帶宋詞古箏雅韻、柔中帶剛的台灣學姊女聲",
  "阿朗":  "俐落鏗鏘、字字清晰具法庭交叉質詢張力的台灣辯論社主辯男聲",
  "柚子":  "甜美元氣、輕快活潑像烘焙點心社學妹的可愛台灣女聲"
};

const voice = {
  enabled: true,
  mode: "hybrid", // "hybrid" (自然人聲＋角色樂音簽名), "tts" (純淨自然人聲), "cozy" (療癒原音樂音)
  accentMode: "anime", // "anime" (動漫角色專屬聲線) | "tw" (純台灣腔)
  selectedVoiceUri: "auto",
  primed: false,
  speaking: false,
  paused: false,
  pauseMeta: null,
  localNeuralAvailable: false,
  localNeuralChecked: false,
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
  localNeuralCache: {},
  localNeuralPending: {},
  lastSpokenPayload: null,

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

  probeLocalNeuralServer: async function () {
    if (this.localNeuralChecked) return this.localNeuralAvailable;
    this.localNeuralChecked = true;
    try {
      if (typeof window === "undefined" || !window.location || !/^https?:$/.test(window.location.protocol)) {
        return false;
      }
      const controller = new AbortController();
      const t = setTimeout(function () { controller.abort(); }, 1800);
      const res = await fetch("/api/tts/status", { signal: controller.signal, cache: "no-store" });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        this.localNeuralAvailable = Boolean(data && data.freeNeural);
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
    return this.enabled && (this.mode === "tts" || this.mode === "hybrid") && this.volume > 0.02 && (this.isSupported() || this.localNeuralAvailable || Boolean(typeof state !== "undefined" && state.geminiApiKey));
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
        if (this.mode === "cozy") {
          lbl.textContent = "目前：12角色療癒原音樂音（零機械感・3D定位）";
        } else if (this.localNeuralAvailable) {
          lbl.textContent = "✨ 免費動漫多角色神經配音已連線（12 位真人級聲線・$0）";
        } else if (typeof state !== "undefined" && state.geminiApiKey) {
          lbl.textContent = "已連線 Gemini Studio 12 位真人級配音";
        } else if (bestScore >= 150) {
          lbl.textContent = "✨ 免費神經聲線：" + zh[0].name.split(" ")[0];
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
    return String(raw)
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, "")
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/0([1-9])\s*號/g, "$1號")
      .replace(/0([1-9])(?=[\u4e00-\u9fff])/g, "$1號")
      .replace(/\b4G\b/gi, "四給")
      .replace(/3好/g, "三好")
      .replace(/[×xX]\s*1\.5/g, "一點五倍")
      .replace(/\bPK\b/gi, "平票對決")
      .replace(/\bVS\.?\b/gi, "對決")
      .replace(/\bAI\b/g, "A I")
      .replace(/(\d+)\s*%/g, "$1趴")
      .replace(/~/g, "到")
      .replace(/→/g, "投給")
      .replace(/[「」『』【】]/g, "")
      .replace(/[｜|·・—]/g, "，")
      .replace(/(?<!，)(我是明心觀察員|我是滴水奉茶師|我是護心守衛|我是直心糾察長)/g, "，$1")
      .replace(/…+/g, "…")
      .replace(/，{2,}/g, "，")
      .replace(/^，+/, "")
      .replace(/\s+/g, " ")
      .trim();
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

  // Split long Mandarin text into natural breathing clauses (protecting seat numbers + names & short endings!)
  splitMandarinClauses: function (cleanText) {
    const pieces = cleanText.match(/[^，。！？；：…]+[，。！？；：…]?/g) || [cleanText];
    const chunks = [];
    let buf = "";
    pieces.forEach(function (part) {
      const p = part.trim();
      if (!p) return;
      const isTinyTail = p.length <= 4 && /^(過|先過|好了|對吧|喔|耶|吧|呢)[。！？]?$/.test(p);
      if (!buf) {
        buf = p;
      } else if (isTinyTail && buf.length <= 28) {
        buf += p;
      } else if ((buf.length + p.length) <= 24 && !/[。！？…]$/.test(buf)) {
        buf += p;
      } else {
        chunks.push(buf);
        buf = p;
      }
    });
    if (buf) chunks.push(buf);
    return chunks.length ? chunks : [cleanText];
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
    if (sWave && (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH")) {
      sWave.classList.toggle("playing", active || state.typewriter.active);
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
  },

  stop: function () {
    this.utteranceSeq += 1;
    this.clearTimers();
    this.paused = false;
    this.pauseMeta = null;
    this.activeUtterance = null;
    if (this.activeAudioNode) {
      try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); } catch (e) {}
      this.activeAudioNode = null;
    }
    this.activeAudioGain = null;
    if (this.isSupported()) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (this.speaking) {
      this.setVisualSpeaking(false);
    }
    this.syncPauseButtonUi();
  },

  syncPauseButtonUi: function () {
    const btn = typeof document !== "undefined" ? document.getElementById("btnPauseVoice") : null;
    if (btn) {
      btn.textContent = this.paused ? "▶ 繼續" : "⏸ 暫停";
      btn.classList.toggle("is-paused", Boolean(this.paused));
    }
  },

  syncQuickSpeedButtonUi: function () {
    const btn = typeof document !== "undefined" ? document.getElementById("btnQuickVoiceSpeed") : null;
    if (!btn) return;
    const label = this.rate >= 1.18 ? "1.3×" : (this.rate >= 1.05 ? "1.15×" : "1.0×");
    btn.textContent = label;
  },

  cycleQuickRate: function () {
    const next = this.rate < 1.05 ? 1.10 : (this.rate < 1.18 ? 1.22 : 0.96);
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
      if (this.activeAudioNode && this.pauseMeta && sound.ctx) {
        const elapsed = Math.max(0, (sound.ctx.currentTime - this.pauseMeta.startedAt) * (this.pauseMeta.playbackRate || 1));
        this.pauseMeta.offset = Math.min(this.pauseMeta.audioBuf.duration - 0.05, (this.pauseMeta.offset || 0) + elapsed);
        this.clearTimers();
        try { this.activeAudioNode.onended = null; this.activeAudioNode.stop(); } catch (e) {}
        this.activeAudioNode = null;
      } else if (this.isSupported()) {
        try { window.speechSynthesis.pause(); } catch (e) {}
      }
      if (typeof state !== "undefined" && state.stepTimer) {
        clearTimeout(state.stepTimer);
        state.stepTimer = null;
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
      } else if (this.isSupported()) {
        try { window.speechSynthesis.resume(); } catch (e) {}
        this.setVisualSpeaking(true);
      }
      return false;
    }
  },

  playBufferedStudioAudio: function (seq, audioBuf, onDone, opts) {
    if (seq !== this.utteranceSeq || !sound.ctx) return false;
    if (sound.ctx.state === "suspended" && typeof sound.ctx.resume === "function") {
      sound.ctx.resume().catch(function () {});
    }
    const src = sound.ctx.createBufferSource();
    const vGain = sound.ctx.createGain();
    const skipRateAdjust = Boolean(opts && opts.skipRateAdjust);
    const pKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    if (typeof sound.applyPersonaVoiceChain === "function") {
      sound.applyPersonaVoiceChain(pKey, (opts && opts.mood) || "normal", opts && opts.seatId);
    }

    // Differentiate Taiwan-accent YunJheNeural male voices subtly via Web Audio playbackRate!
    let twTrim = 1.0;
    if (this.accentMode === "tw" && typeof PERSONA_AUDIO_EQ !== "undefined" && PERSONA_AUDIO_EQ[pKey] && PERSONA_AUDIO_EQ[pKey].twRateMul) {
      twTrim = PERSONA_AUDIO_EQ[pKey].twRateMul;
    }
    const pbRate = skipRateAdjust
      ? clamp(twTrim * (this.rate >= 1.15 ? 1.06 : 1.0), 0.90, 1.24)
      : clamp(this.rate * twTrim, 0.90, 1.26);

    src.buffer = audioBuf;
    src.playbackRate.value = pbRate;
    vGain.gain.value = clamp(this.volume, 0, 1);

    // Route through Broadcast Vocal Chain (Per-Persona EQ + Presence + De-Ess + Compressor + 3D Spatial Panner + Live Lip-Sync Analyser!)
    src.connect(vGain);
    if (sound.voiceBus) {
      vGain.connect(sound.voiceBus);
    } else {
      vGain.connect(sound.comp || sound.ctx.destination);
    }

    const startOffset = Math.max(0, Number(opts && opts.startOffset) || 0);
    const remainDur = Math.max(0.1, (audioBuf ? audioBuf.duration : 2.5) - startOffset);
    this.activeAudioNode = src;
    this.activeAudioGain = vGain;
    this.pauseMeta = {
      seq: seq,
      audioBuf: audioBuf,
      onDone: onDone,
      opts: opts || {},
      offset: startOffset,
      startedAt: sound.ctx.currentTime,
      playbackRate: pbRate
    };
    this.setVisualSpeaking(true);
    this.syncPauseButtonUi();

    const estPlayMs = (remainDur / pbRate) * 1000;
    if (opts && typeof opts.onAudioReady === "function" && startOffset === 0) {
      try { opts.onAudioReady(opts.totalDurationHintMs || estPlayMs); } catch (e) {}
    } else if (audioBuf && audioBuf.duration && startOffset === 0 && !(opts && opts.skipTypewriterSync) && typeof syncTypewriterToAudioDuration === "function") {
      syncTypewriterToAudioDuration(opts && opts.totalDurationHintMs ? opts.totalDurationHintMs : estPlayMs);
    }
    const self = this;
    const finishOnce = function () {
      if (seq !== self.utteranceSeq || self.paused) return;
      if (!(opts && opts.keepSeqOpen)) self.utteranceSeq += 1;
      self.clearTimers();
      self.activeAudioNode = null;
      self.activeAudioGain = null;
      self.pauseMeta = null;
      if (!(opts && opts.keepSeqOpen)) self.setVisualSpeaking(false);
      self.syncPauseButtonUi();
      if (typeof onDone === "function") onDone();
    };
    const estMs = Math.max(3000, Math.round(estPlayMs) + 3500);
    this.watchdogTimer = setTimeout(finishOnce, estMs);
    src.onended = finishOnce;
    src.start(0, startOffset);
    return true;
  },

  _fetchLocalNeuralAudio: function (cacheKey, effKey, cleanText, mood, signal) {
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
        accent: this.accentMode || "anime"
      })
    };
    if (signal) reqOpts.signal = signal;
    const pendingPromise = fetch("/api/tts", reqOpts)
      .then(function (res) { return res && res.ok ? res.arrayBuffer() : null; })
      .then(function (arrBuf) {
        return (arrBuf && arrBuf.byteLength >= 128 && sound.ctx)
          ? sound.ctx.decodeAudioData(arrBuf.slice(0))
          : null;
      })
      .then(function (audioBuf) {
        delete self.localNeuralPending[cacheKey];
        if (!audioBuf) return null;
        const keys = Object.keys(self.localNeuralCache);
        if (keys.length > 56) delete self.localNeuralCache[keys[0]];
        self.localNeuralCache[cacheKey] = audioBuf;
        return audioBuf;
      })
      .catch(function () {
        delete self.localNeuralPending[cacheKey];
        return null;
      });
    const pKeys = Object.keys(this.localNeuralPending);
    if (pKeys.length > 32) delete this.localNeuralPending[pKeys[0]];
    this.localNeuralPending[cacheKey] = pendingPromise;
    return pendingPromise;
  },

  prefetchFreeLocalNeural: function (personaName, rawText, mood) {
    if (!this.localNeuralAvailable || !sound.ctx) return;
    const effKey = this.resolvePersonaKey(personaName);
    const cleanText = this.formatMandarinText(rawText);
    if (!cleanText) return;
    const cacheKey = effKey + "|" + this.accentMode + "|" + Math.round(this.rate * 100) + "|" + (mood || "normal") + "|" + cleanText;
    if (this.localNeuralCache[cacheKey] || this.localNeuralPending[cacheKey]) return;
    this._fetchLocalNeuralAudio(cacheKey, effKey, cleanText, mood, null);
  },

  playFreeLocalNeuralTts: async function (seq, personaName, cleanText, mood, onDone, opts) {
    if (!this.localNeuralAvailable || !sound.ctx) return false;
    const effKey = this.resolvePersonaKey(personaName);
    const segments = this.splitTwoStageStream(cleanText);
    const makeKey = function (segText) {
      return effKey + "|" + voice.accentMode + "|" + Math.round(voice.rate * 100) + "|" + (mood || "normal") + "|" + segText;
    };

    const fetchWithTimeout = async function (segText, timeoutMs) {
      const ck = makeKey(segText);
      if (voice.localNeuralCache[ck]) return voice.localNeuralCache[ck];
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timer = null;
      try {
        const fetchPromise = voice._fetchLocalNeuralAudio(
          ck, effKey, segText, mood,
          (!voice.localNeuralPending[ck] && controller) ? controller.signal : null
        );
        const timeoutPromise = new Promise(function (resolve) {
          timer = setTimeout(function () {
            if (controller) controller.abort();
            resolve(null);
          }, timeoutMs || 11000);
        });
        const buf = await Promise.race([fetchPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);
        return buf;
      } catch (e) {
        if (timer) clearTimeout(timer);
        return null;
      }
    };

    // Fast two-stage streaming: synthesize & play opening clause immediately while prefetching rest in parallel!
    const seg1 = segments[0];
    const seg2 = segments.length > 1 ? segments[1] : null;
    if (seg2) {
      const ck2 = makeKey(seg2);
      if (!this.localNeuralCache[ck2] && !this.localNeuralPending[ck2]) {
        this._fetchLocalNeuralAudio(ck2, effKey, seg2, mood, null);
      }
    }

    const buf1 = await fetchWithTimeout(seg1, 10000);
    if (!buf1 || seq !== this.utteranceSeq) return false;

    const estTotalMs = seg2
      ? Math.round((buf1.duration * (cleanText.length / Math.max(1, seg1.length))) * 1000)
      : Math.round(buf1.duration * 1000);
    const playOpts1 = {
      skipRateAdjust: true,
      personaKey: effKey,
      mood: mood || "normal",
      seatId: opts && opts.seatId,
      onAudioReady: opts && opts.onAudioReady,
      totalDurationHintMs: estTotalMs,
      keepSeqOpen: Boolean(seg2)
    };

    if (!seg2) {
      return this.playBufferedStudioAudio(seq, buf1, onDone, playOpts1);
    }

    const self = this;
    return this.playBufferedStudioAudio(seq, buf1, function () {
      if (seq !== self.utteranceSeq) return;
      fetchWithTimeout(seg2, 10000).then(function (buf2) {
        if (!buf2 || seq !== self.utteranceSeq) {
          self.utteranceSeq += 1;
          self.setVisualSpeaking(false);
          if (typeof onDone === "function") onDone();
          return;
        }
        const playOpts2 = {
          skipRateAdjust: true,
          personaKey: effKey,
          mood: mood || "normal",
          seatId: opts && opts.seatId,
          skipTypewriterSync: true
        };
        if (typeof syncTypewriterToAudioDuration === "function") {
          syncTypewriterToAudioDuration(buf2.duration * 1000);
        }
        self.playBufferedStudioAudio(seq, buf2, onDone, playOpts2);
      });
    }, playOpts1);
  },

  playGeminiStudioTts: async function (seq, profile, cleanText, mood, onDone, opts) {
    if (!state.geminiApiKey || !sound.ctx) return false;
    const voiceName = profile.studioVoice || "Kore";
    const effKey = (opts && opts.personaKey) ? opts.personaKey : this.activePersonaName;
    const cacheKey = voiceName + ":" + (mood || "normal") + ":" + cleanText;
    if (this.studioCache[cacheKey]) {
      return this.playBufferedStudioAudio(seq, this.studioCache[cacheKey], onDone, opts);
    }
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent";
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 8500);
    try {
      const baseDir = PERSONA_TTS_DIRECTIONS[effKey] || "自然親切的台灣年輕人口語";
      const moodDirMap = {
        panic: "語氣略帶緊張急促、防守心虛",
        accuse: "語氣堅定犀利、帶有質詢與說服力",
        claim_seer: "語氣鄭重果決、亮明身分號召全場",
        rebut: "語氣急轉反駁、直指對方邏輯漏洞",
        trust: "語氣溫和真誠、展現信任與善意",
        happy: "語氣輕快開朗、帶著微笑",
        last_words: "語氣略微不捨沉靜、像臨走前的誠懇叮嚀",
        host_night: "語氣低沉神祕、營造夜晚靜謐氛圍",
        host_dawn: "語氣清朗明快、揭曉天亮結果"
      };
      const moodDir = moodDirMap[mood] || "語氣自然流暢、像圍坐喝茶聊天";
      const styledText = "（請以「" + baseDir + "，" + moodDir + "」演繹以下繁體中文台詞，直接唸出內容不要唸括號指令）：" + cleanText;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": state.geminiApiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: styledText }] }],
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
      clearTimeout(timer);
      if (!res.ok || seq !== this.utteranceSeq) return false;
      const data = await res.json();
      const inlineData = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].inlineData;
      if (!inlineData || !inlineData.data || seq !== this.utteranceSeq) return false;

      // Decode 24kHz 16-bit PCM into Web Audio Buffer for crystal-clear playback!
      const rawBin = atob(inlineData.data);
      const len = rawBin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = rawBin.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      const samples = Math.floor(len / 2);
      const audioBuf = sound.ctx.createBuffer(1, samples, 24000);
      const ch = audioBuf.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        ch[i] = view.getInt16(i * 2, true) / 32768;
      }
      if (cleanText.length <= 40) {
        const keys = Object.keys(this.studioCache);
        if (keys.length > 24) delete this.studioCache[keys[0]];
        this.studioCache[cacheKey] = audioBuf;
      }
      return this.playBufferedStudioAudio(seq, audioBuf, onDone, opts);
    } catch (e) {
      clearTimeout(timer);
      return false;
    }
  },

  speak: function (personaName, rawText, mood, onDone, opts) {
    const clean = this.formatMandarinText(rawText);
    if (!clean || !this.canSpeak()) {
      if (opts && typeof opts.onAudioReady === "function") opts.onAudioReady(0);
      if (typeof onDone === "function") setTimeout(onDone, 0);
      return;
    }
    const wasBusy = Boolean(this.speaking || (this.isSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)));
    this.stop();
    const seq = ++this.utteranceSeq;
    const self = this;
    const effKey = this.resolvePersonaKey(personaName);
    const profile = PERSONA_VOICE_PROFILES[effKey] || PERSONA_VOICE_PROFILES["你"];
    const seatId = (opts && opts.seatId) ? opts.seatId : profile.seatHint;
    this.activePersonaName = effKey;
    this.lastSpokenPayload = { personaName: personaName, rawText: rawText, mood: mood || "normal", seatId: seatId };
    if (typeof sound.applyPersonaVoiceChain === "function") {
      sound.applyPersonaVoiceChain(effKey, mood || "normal", seatId);
    }

    // Proactively ensure Web Audio Context is initialized before neural TTS check so we never accidentally leak browser Google TTS!
    if (this.localNeuralAvailable && !sound.ctx && typeof sound.unlock === "function") {
      sound.unlock();
    }

    // In "hybrid" mode, play a delicate 2-note character acoustic signature right as they start speaking!
    if (this.mode === "hybrid" && effKey !== "主持") {
      sound.playVoiceSignature(personaName, mood || "normal");
    }

    const forwardOpts = {
      seatId: seatId,
      personaKey: effKey,
      mood: mood || "normal",
      onAudioReady: opts && opts.onAudioReady
    };

    // Priority 1 (100% Free $0): Local Neural Voice Server (server.py + Microsoft Edge Neural voices!)
    if (this.localNeuralAvailable && sound.ctx) {
      this.setVisualSpeaking(true);
      this.playFreeLocalNeuralTts(seq, effKey, clean, mood || "normal", onDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
        self.speakLocalBrowserTts(seq, profile, clean, mood, false, onDone);
      });
      return;
    }

    // Priority 2 (Optional): If user voluntarily connected their own Gemini API Key
    if (state.geminiApiKey && sound.ctx) {
      this.setVisualSpeaking(true);
      this.playGeminiStudioTts(seq, profile, clean, mood || "normal", onDone, forwardOpts).then(function (ok) {
        if (ok || seq !== self.utteranceSeq) return;
        if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
        self.speakLocalBrowserTts(seq, profile, clean, mood, false, onDone);
      });
      return;
    }

    // Priority 3 (100% Free $0 Offline): Upgraded Browser Neural/OS TTS with Natural Clause Cadence
    if (forwardOpts.onAudioReady) forwardOpts.onAudioReady(0);
    this.speakLocalBrowserTts(seq, profile, clean, mood, wasBusy, onDone);
  },

  speakLocalBrowserTts: function (seq, profile, clean, mood, wasBusy, onDone) {
    const self = this;
    try {
      const chosenVoice = this.pickVoiceForProfile(profile);
      const vScore = chosenVoice ? this.scoreVoiceQuality(chosenVoice) : 0;
      const isBasicVoice = vScore < 135;
      const missingMaleFallback = (profile && profile.gender === "m" && (!chosenVoice || !this.isMaleVoice(chosenVoice)));

      // Expressive Per-Persona Vocal Range: clearly separate all 11 characters in pitch & cadence even on static Web Speech API!
      const baseRate = clamp(this.rate * (profile.rateMul || 1.0), 0.80, 1.24);
      const basePitch = missingMaleFallback
        ? clamp((profile.pitch || 0.94) - 0.14, 0.68, 0.94)
        : (isBasicVoice
          ? clamp(profile.basicPitch || 1.0, 0.76, 1.20)
          : clamp(profile.pitch || 1.0, 0.70, 1.30));
      const effVol = clamp(this.volume * (isBasicVoice ? 0.92 : 1.0), 0, 1);

      const clauses = this.splitMandarinClauses(clean);
      this.setVisualSpeaking(true);

      const finishOnce = function () {
        if (seq !== self.utteranceSeq) return;
        self.utteranceSeq += 1;
        self.clearTimers();
        self.activeUtterance = null;
        self.setVisualSpeaking(false);
        if (typeof onDone === "function") onDone();
      };

      // Prevent desktop Chrome from pausing utterances
      this.keepAliveTimer = setInterval(function () {
        if (seq !== self.utteranceSeq) return;
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        } catch (e) {}
      }, 8500);

      const totalEstMs = Math.min(28000, Math.max(3600, Math.round((clean.length * 360) / baseRate) + clauses.length * 240 + 1400));
      this.watchdogTimer = setTimeout(finishOnce, totalEstMs);

      let idx = 0;
      function speakNextClause() {
        if (seq !== self.utteranceSeq) return;
        if (idx >= clauses.length) {
          finishOnce();
          return;
        }
        const clause = clauses[idx];
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
        if (mood === "panic") {
          cRate = clamp(cRate * 1.04, 0.95, 1.16);
          cPitch = clamp(cPitch + (isBasicVoice ? 0.01 : 0.025), 0.96, 1.06);
        }
        if (isQuestion) {
          cPitch = clamp(cPitch + (isBasicVoice ? 0.012 : 0.028), 0.96, 1.07);
          cRate = clamp(cRate * 0.98, 0.90, 1.14);
        } else if (isExclaim) {
          cRate = clamp(cRate * 1.03, 0.92, 1.16);
        }

        utter.rate = cRate;
        utter.pitch = cPitch;
        utter.volume = effVol;
        self.activeUtterance = utter;

        const onClauseDone = function () {
          if (seq !== self.utteranceSeq) return;
          if (idx >= clauses.length) {
            finishOnce();
            return;
          }
          const pauseMs = isEllipsis ? 195 : (isMajorStop ? 155 : 85);
          self.clauseTimer = setTimeout(speakNextClause, pauseMs);
        };
        utter.onend = onClauseDone;
        utter.onerror = onClauseDone;
        try {
          window.speechSynthesis.speak(utter);
        } catch (e) {
          finishOnce();
        }
      }

      const leadDelay = wasBusy ? 55 : (this.mode === "hybrid" ? 90 : 0);
      if (leadDelay > 0) {
        this.clauseTimer = setTimeout(speakNextClause, leadDelay);
      } else {
        speakNextClause();
      }
    } catch (e) {
      this.setVisualSpeaking(false);
      if (typeof onDone === "function") setTimeout(onDone, 0);
    }
  },

  speakHost: function (text, onDone, mood) {
    this.speak("主持", text, mood || "normal", onDone, { seatId: 0 });
  },

  speakCharacter: function (speaker, text, mood, onDone, opts) {
    const nameKey = (!speaker || speaker.id === getPlayerId()) ? "你" : speaker.name;
    this.speak(nameKey, text, mood || "normal", onDone, Object.assign({ seatId: speaker ? speaker.id : null }, opts || {}));
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
