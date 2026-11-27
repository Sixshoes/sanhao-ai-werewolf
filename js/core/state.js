/**
 * 全域遊戲狀態、localStorage 偏好設定、基礎 DOM / 座位查詢與紀錄工具函式
 */
"use strict";

const state = {
  geminiApiKey: "",
  geminiModel: "gemini-4-hydrogen",
  serverGeminiAvailable: false,
  serverGeminiModel: "gemini-4-hydrogen",
  serverGeminiModelUserChosen: false,
  serverGeminiOptOut: false,
  serverGeminiCooldownUntil: 0,
  localLlmModel: "",
  autoPlay: false,
  coachEnabled: true,
  tutorialIndex: 0,
  tutorialDevice: null, // "phone" | "tablet" | "desktop" (auto-detected on open, switchable anytime)
  hidePlayerRole: false,
  showRelationsOnCanvas: true,
  viewMode: "3d",
  sceneTheme: "academy", // "academy" (青嵐雅致書院風) | "celestial" (空靈青綠山水仙境風)
  quality3D: "high",
  qualityUserChosen: false,
  fxPacing: "cinematic", // "cinematic" (沉穩儀式感) | "fast" (快節奏)
  playerGender: "f", // "f" | "m" (1-click player voice & VRM avatar toggle)
  portraitStyle: "vrm3d", // "vrm3d" (Unified 3D VRM anime portrait) | "painted" (Studio ink cinema art)
  cardPeek3D: false,
  aiDifficulty: "normal", // "easy" | "normal" | "pro"
  ruleDepth: "full", // "full" | "classic"
  activeVariant: "standard", // "standard" | "fog_seal" | "blitz_3m" | "twin_tea" | "lone_wolf_king"
  sheriffMode: false,
  guardMode: false,
  spectatorFastForward: false,
  cutInQueue: [],
  cutInActive: false,
  cutInCurrentKey: "",
  cutInTimer: null,
  selectedSeatId: null,
  hoverSeatId: null,
  intelSeatId: null,
  activeSpeakerId: null,
  seerReveal: null,
  voteResultPayload: null,
  voteFlight: null,
  activeClash: null,
  lastWordsCtx: null,
  playerMarks: {},
  listenPitCollapsed: false,
  speakingInFlight: false,
  currentTurnSpoken: false,
  stepTimer: null,
  hunterResolveCommit: null,
  animFrame: null,
  particles: [],
  fxPopups: [],
  beamFx: [],
  burstParticles: [],
  ripples: [],
  pointer: { x: 0, y: 0, inside: false },
  pointerTrail: [],
  seatPhysics: {},
  seatMoods: {},
  dragAction: { active: false, moved: false, fromId: null, startX: 0, startY: 0, curX: 0, curY: 0, snapId: null },
  radialTargetId: null,
  suppressNextClick: false,
  seatBubbles: {},
  shakeUntil: 0,
  screenFlash: null,
  voteLeaderId: null,
  lastSpeakerPortraitId: null,
  activeBubble: null,
  seatCoords: [],
  fpGlanceButtons: [],
  hoverFpGlanceKey: null,
  typewriter: {
    timer: null,
    fullText: "",
    pos: 0,
    active: false,
    speakerId: null,
    holdMs: 2500,
    onDone: null
  },

  match: {
    started: false,
    phase: "LOBBY",
    day: 0,
    totalSeats: 6,
    harmonyScore: 70,
    threeGood: { heart: 0, words: 0, deeds: 0, resonanceTriggered: false },
    combo: 0,
    maxCombo: 0,
    comboBoostReady: false,
    pinnedClues: [],
    caughtSpeechClues: {},
    activeSpeechContra: null,
    rewriteCritReady: false,
    seats: [],
    playerKnownRoles: {},
    witchPotions: { heal: true, purify: true },
    nightState: { guardTarget: null, wolfTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null },
    lastGuardTargetId: null,
    nightArchive: [],
    firstNightIntel: null,
    peaceNights: [],
    detectedContradictions: [],
    microInspectCountToday: 0,
    microInspectedSeats: {},
    wolfTactic: "mate_fake_seer_gold",
    variantMode: "standard",
    isMatchPoint: false,
    hopeConfrontation: null,
    wolfExplodedToday: false,
    interjectBonusCharges: 0,
    guardAwakenBonusWeightDay: 0,
    guardBlockedLastNight: false,
    spiritBet: { active: null, history: [], streak: 0, bestStreak: 0, totalBonusPts: 0 },
    sheriffRallyUsedDay: 0,
    sheriffElectionPending: false,
    sheriffElectionCtx: null,
    sheriffVoteRecord: null,
    sheriffBadgeFlow: null,
    sheriffBadgeFlowsBySeat: {},
    badgeFlowSignals: [],
    sheriffOrderCtx: null,
    pendingVotedHunterId: null,
    pendingSheriffTransfer: null,
    pendingEvidenceTargetId: null,
    pendingEvidenceTag: "",
    roleMission: null,
    dayOrder: [],
    speechQueue: [],
    relations: [],
    voteHistory: [],
    allSpeechEvents: [],
    microPulseRevealed: false,
    fourGivingsUsed: { confidence: false, joy: false, hope: false, convenience: false },
    fourGJoySuspects: [],
    fourGHopePair: null,
    fourGEchoes: [],
    threeGoodImpactLog: [],
    directorEventInteractedDay: 0,
    fourGSynergyTriggered: false,
    teaServedDay: 0,
    spectatorGuess: { wolfIds: [], godRoles: { seer: null, witch: null, hunter: null, guard: null }, activeRoleSlot: "seer", locked: false, lockedAtDay: 0, evaluated: null, godViewUnlocked: false },
    afterHunterNext: null,
    lastHunterShot: null,
    winner: null,
    winReason: "",
    logs: [],
    stats: {
      goodWordsCount: 0,
      rewritesUsed: 0,
      fourGCount: 0,
      nightSkillUsed: 0,
      toxicSentCount: 0,
      cluesCaught: 0,
      contradictionsFound: 0,
      logicBreaksLanded: 0,
      microInspectsUsed: 0,
      microWolfSpotted: 0,
      sheriffPassed: 0,
      teaServedCount: 0,
      kindDeescalations: 0,
      fourGSynergies: 0,
      confidenceSaves: 0,
      clearWindTurns: 0
    }
  }
};

const PREFS_STORAGE_KEY = "sanhao_ai_werewolf_prefs_v1";

function saveUserPrefs() {
  try {
    const payload = {
      voiceEnabled: Boolean(voice.enabled),
      voiceMode: voice.mode || "hybrid",
      voiceAccent: voice.accentMode === "tw" ? "tw" : "anime",
      voiceEnginePref: (voice.enginePref === "local" || voice.enginePref === "gemini") ? voice.enginePref : "auto",
      voiceLiveBackchannel: Boolean(voice.liveBackchannel),
      voicePrefVersion: 2,
      voiceHumanBreath: Boolean(voice.humanBreath),
      voiceRate: Number(voice.rate) || 0.96,
      voiceVolume: Number(voice.volume),
      voiceUri: voice.selectedVoiceUri || "auto",
      soundMuted: Boolean(sound.muted),
      ambientEnabled: Boolean(sound.ambientEnabled),
      bgmVol: Number(sound.bgmVol),
      sfxVol: Number(sound.sfxVol),
      timbre: sound.timbre || "zen",
      trackMode: sound.trackMode || "auto",
      autoPlay: Boolean(state.autoPlay),
      showRelations: Boolean(state.showRelationsOnCanvas),
      viewMode: state.viewMode === "2d" ? "2d" : "3d",
      sceneTheme: state.sceneTheme === "celestial" ? "celestial" : "academy",
      quality3D: (state.quality3D === "eco" || state.quality3D === "balanced") ? state.quality3D : "high",
      qualityUserChosen: Boolean(state.qualityUserChosen),
      fxPacing: state.fxPacing === "fast" ? "fast" : "cinematic",
      playerGender: state.playerGender === "m" ? "m" : "f",
      portraitStyle: state.portraitStyle === "painted" ? "painted" : "vrm3d",
      portraitPrefVersion: 3,
      aiDifficulty: state.aiDifficulty || "normal",
      ruleDepth: state.ruleDepth === "classic" ? "classic" : "full",
      activeVariant: state.activeVariant || "standard",
      sheriffMode: Boolean(state.sheriffMode),
      guardMode: Boolean(state.guardMode),
      geminiModel: state.geminiModel || "gemini-4-hydrogen",
      serverGeminiModel: state.serverGeminiModel || "gemini-4-hydrogen",
      serverGeminiModelUserChosen: Boolean(state.serverGeminiModelUserChosen),
      localLlmModel: String(state.localLlmModel || "").trim(),
      serverGeminiOptOut: Boolean(state.serverGeminiOptOut),
      subtitleLarge: Boolean(state.subtitleLarge)
    };
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {}
}

const SESSION_GEMINI_KEY = "sanhao_gemini_session_key_v1";

function saveSessionGeminiKey(key) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    const clean = String(key || "").trim();
    if (clean) window.sessionStorage.setItem(SESSION_GEMINI_KEY, clean);
    else window.sessionStorage.removeItem(SESSION_GEMINI_KEY);
  } catch (e) {}
}

function loadSessionGeminiKey() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return "";
    return String(window.sessionStorage.getItem(SESSION_GEMINI_KEY) || "").trim();
  } catch (e) {
    return "";
  }
}

function loadUserPrefs() {
  try {
    const sessKey = loadSessionGeminiKey();
    if (sessKey && !state.geminiApiKey) state.geminiApiKey = sessKey;
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return;
    if (typeof p.voiceEnabled === "boolean") voice.enabled = p.voiceEnabled;
    if (p.voiceMode === "hybrid" || p.voiceMode === "tts" || p.voiceMode === "cozy") voice.mode = p.voiceMode;
    if (p.voiceAccent === "tw") voice.accentMode = "tw";
    else if (p.voiceAccent === "anime" || p.voiceAccent === "multi") voice.accentMode = "anime";
    if (p.voiceEnginePref === "local" || p.voiceEnginePref === "gemini" || p.voiceEnginePref === "auto") voice.enginePref = p.voiceEnginePref;
    if ((p.voicePrefVersion >= 2) && typeof p.voiceLiveBackchannel === "boolean") voice.liveBackchannel = p.voiceLiveBackchannel;
    if (typeof p.voiceHumanBreath === "boolean") voice.humanBreath = p.voiceHumanBreath;
    if (typeof p.voiceRate === "number" && p.voiceRate >= 0.7 && p.voiceRate <= 1.8) voice.rate = p.voiceRate;
    if (typeof p.voiceVolume === "number" && p.voiceVolume >= 0 && p.voiceVolume <= 1) voice.volume = p.voiceVolume;
    if (typeof p.voiceUri === "string" && p.voiceUri) voice.selectedVoiceUri = p.voiceUri;
    if (typeof p.soundMuted === "boolean") sound.muted = p.soundMuted;
    if (typeof p.ambientEnabled === "boolean") sound.ambientEnabled = p.ambientEnabled;
    if (typeof p.bgmVol === "number" && p.bgmVol >= 0 && p.bgmVol <= 1) sound.bgmVol = p.bgmVol;
    if (typeof p.sfxVol === "number" && p.sfxVol >= 0 && p.sfxVol <= 1) sound.sfxVol = p.sfxVol;
    if (p.timbre === "zen" || p.timbre === "guqin" || p.timbre === "folk" || p.timbre === "cinema") sound.timbre = p.timbre;
    if (["auto", "twilight", "night", "day", "sheriff", "vote", "matchpoint", "finale"].indexOf(p.trackMode) !== -1) sound.trackMode = p.trackMode;
    if (typeof p.autoPlay === "boolean") state.autoPlay = p.autoPlay;
    if (typeof p.showRelations === "boolean") state.showRelationsOnCanvas = p.showRelations;
    if (p.viewMode === "2d" || p.viewMode === "3d") state.viewMode = p.viewMode;
    if (p.sceneTheme === "celestial") state.sceneTheme = "celestial";
    else if (typeof p.sceneTheme === "string" && p.sceneTheme) state.sceneTheme = "academy";
    if (p.quality3D === "high" || p.quality3D === "balanced" || p.quality3D === "eco") state.quality3D = p.quality3D;
    if (typeof p.qualityUserChosen === "boolean") state.qualityUserChosen = p.qualityUserChosen;
    if (p.fxPacing === "fast" || p.fxPacing === "cinematic") state.fxPacing = p.fxPacing;
    if (p.playerGender === "m" || p.playerGender === "f") state.playerGender = p.playerGender;
    if ((p.portraitPrefVersion >= 3) && (p.portraitStyle === "vrm3d" || p.portraitStyle === "painted")) state.portraitStyle = p.portraitStyle;
    if (p.aiDifficulty === "easy" || p.aiDifficulty === "normal" || p.aiDifficulty === "pro") state.aiDifficulty = p.aiDifficulty;
    if (p.ruleDepth === "classic" || p.ruleDepth === "full") state.ruleDepth = p.ruleDepth;
    if (["standard", "fog_seal", "blitz_3m", "twin_tea", "lone_wolf_king"].indexOf(p.activeVariant) !== -1) state.activeVariant = p.activeVariant;
    if (typeof p.sheriffMode === "boolean") state.sheriffMode = p.sheriffMode;
    if (typeof p.guardMode === "boolean") state.guardMode = p.guardMode;
    if (typeof p.geminiModel === "string" && p.geminiModel) {
      const mNorm = p.geminiModel.trim();
      if (mNorm === "gemini-4-hydrogen" || mNorm === "gemini-3.1-flash-lite" || mNorm === "gemini-2.5-pro" || mNorm === "gemini-2.5-flash" || mNorm === "gemini-2.5-flash-lite") {
        state.geminiModel = mNorm;
      } else if (mNorm.indexOf("lite") !== -1) {
        state.geminiModel = "gemini-3.1-flash-lite";
      } else {
        state.geminiModel = "gemini-4-hydrogen";
      }
    }
    if (typeof p.serverGeminiModel === "string" && p.serverGeminiModel) {
      const smNorm = p.serverGeminiModel.trim();
      if (smNorm === "gemini-2.5-pro" || smNorm === "gemini-4-hydrogen" || smNorm === "gemini-3.1-flash-lite" || smNorm === "gemini-2.5-flash" || smNorm === "gemini-2.5-flash-lite") {
        state.serverGeminiModel = smNorm;
      } else {
        state.serverGeminiModel = "gemini-4-hydrogen";
      }
    }
    if (typeof p.serverGeminiModelUserChosen === "boolean") {
      state.serverGeminiModelUserChosen = p.serverGeminiModelUserChosen;
    }
    if (typeof p.localLlmModel === "string") {
      const trimmedLocal = p.localLlmModel.trim();
      state.localLlmModel = (trimmedLocal && /^[A-Za-z0-9._:/-]{1,96}$/.test(trimmedLocal)) ? trimmedLocal : "";
    }
    if (typeof p.serverGeminiOptOut === "boolean") state.serverGeminiOptOut = p.serverGeminiOptOut;
    if (typeof p.subtitleLarge === "boolean") state.subtitleLarge = p.subtitleLarge;
  } catch (e) {}
}

function syncPrefsToControls() {
  if (el("voiceToggleLabel")) el("voiceToggleLabel").textContent = voice.getModeLabel();
  if (el("muteToggleLabel")) el("muteToggleLabel").textContent = sound.muted ? "音效:關" : "音效:開";
  else if (el("btnToggleMute")) el("btnToggleMute").textContent = sound.muted ? "音效:關" : "音效:開";
  if (el("btnAutoPlayToggle")) el("btnAutoPlayToggle").textContent = "自動:" + (state.autoPlay ? "開" : "關");
  if (el("btnToggleFxPacing")) el("btnToggleFxPacing").textContent = state.fxPacing === "fast" ? "演出:快節奏" : "演出:沉穩";
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("fx-pacing-fast", state.fxPacing === "fast");
  }
  if (el("btnToggleGraphOverlay")) el("btnToggleGraphOverlay").textContent = "連線：" + (state.showRelationsOnCanvas ? "開" : "關");
  const bgmPct = Math.round(clamp(sound.bgmVol, 0, 1) * 100);
  const sfxPct = Math.round(clamp(sound.sfxVol, 0, 1) * 100);
  const vPct = Math.round(clamp(voice.volume, 0, 1) * 100);
  if (el("sliderBgmVol")) el("sliderBgmVol").value = String(bgmPct);
  if (el("bgmVolLabel")) el("bgmVolLabel").textContent = bgmPct + "%";
  if (el("sliderSfxVol")) el("sliderSfxVol").value = String(sfxPct);
  if (el("sfxVolLabel")) el("sfxVolLabel").textContent = sfxPct + "%";
  if (el("sliderVoiceVol")) el("sliderVoiceVol").value = String(vPct);
  if (el("voiceVolLabel")) el("voiceVolLabel").textContent = vPct + "%";
  const timbreSyncMap = { btnTimbreZen: "zen", btnTimbreGuqin: "guqin", btnTimbreFolk: "folk", btnTimbreCinema: "cinema" };
  ["btnTimbreZen", "btnTimbreGuqin", "btnTimbreFolk", "btnTimbreCinema"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", (el(id).getAttribute("data-timbre") || timbreSyncMap[id]) === sound.timbre);
  });
  const trackSyncMap = { btnTrackAuto: "auto", btnTrackTwilight: "twilight", btnTrackNight: "night", btnTrackDay: "day", btnTrackSheriff: "sheriff", btnTrackVote: "vote", btnTrackMatchpoint: "matchpoint", btnTrackFinale: "finale" };
  ["btnTrackAuto", "btnTrackTwilight", "btnTrackNight", "btnTrackDay", "btnTrackSheriff", "btnTrackVote", "btnTrackMatchpoint", "btnTrackFinale"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", (el(id).getAttribute("data-track") || trackSyncMap[id]) === sound.trackMode);
  });
  ["btnVoiceModeHybrid", "btnVoiceModeNatural", "btnVoiceModeCozy"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", el(id).getAttribute("data-vmode") === voice.mode);
  });
  ["btnAccentTw", "btnAccentMulti"].forEach(function (id) {
    if (el(id)) {
      const ac = el(id).getAttribute("data-accent") || "anime";
      el(id).classList.toggle("is-active", ac === voice.accentMode);
    }
  });
  ["btnEngineAuto", "btnEngineLocal", "btnEngineGemini"].forEach(function (id) {
    if (el(id)) {
      const fallbackEg = id === "btnEngineGemini" ? "gemini" : (id === "btnEngineLocal" ? "local" : "auto");
      const eg = el(id).getAttribute("data-vengine") || fallbackEg;
      el(id).classList.toggle("is-active", eg === (voice.enginePref || "auto"));
    }
  });
  if (el("btnToggleLiveBackchannel")) {
    el("btnToggleLiveBackchannel").classList.toggle("is-active", Boolean(voice.liveBackchannel));
    el("btnToggleLiveBackchannel").textContent = "圓桌座位插話反應：" + (voice.liveBackchannel ? "開" : "關");
  }
  if (el("btnToggleHumanBreath")) {
    el("btnToggleHumanBreath").classList.toggle("is-active", Boolean(voice.humanBreath));
    el("btnToggleHumanBreath").textContent = "真人換氣＋木亭音場：" + (voice.humanBreath ? "開" : "關");
  }
  if (el("btnToggleAmbience")) {
    el("btnToggleAmbience").classList.toggle("is-active", Boolean(sound.ambientEnabled));
    el("btnToggleAmbience").textContent = "山城茶席環境音景：" + (sound.ambientEnabled ? "開（松風・茶沸・清鈴）" : "關");
  }
  ["btnVoiceRateSlow", "btnVoiceRateDefault", "btnVoiceRateFast"].forEach(function (id) {
    if (el(id)) {
      const rv = parseFloat(el(id).getAttribute("data-vrate")) || 0.96;
      el(id).classList.toggle("is-active", Math.abs(rv - voice.rate) < 0.03);
    }
  });
  ["btnPlayerGenderF", "btnPlayerGenderM"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", el(id).getAttribute("data-pgender") === state.playerGender);
  });
  ["btnPortraitStyleVrm", "btnPortraitStylePainted"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", el(id).getAttribute("data-pstyle") === state.portraitStyle);
  });
  if (el("selectDeviceVoice") && voice.selectedVoiceUri) {
    el("selectDeviceVoice").value = voice.selectedVoiceUri;
  }
  if (typeof voice.syncQuickSpeedButtonUi === "function") voice.syncQuickSpeedButtonUi();
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("subtitle-large", Boolean(state.subtitleLarge));
  }
  if (el("btnToggleSubtitleSize")) {
    el("btnToggleSubtitleSize").textContent = state.subtitleLarge ? "大字" : "字級";
    el("btnToggleSubtitleSize").classList.toggle("is-active", Boolean(state.subtitleLarge));
  }
  if (typeof stage3d !== "undefined" && typeof stage3d.syncSceneThemeUi === "function") {
    stage3d.syncSceneThemeUi();
  }
  if (el("selectAiDifficulty")) el("selectAiDifficulty").value = state.aiDifficulty || "normal";
  if (el("selectRuleDepth")) el("selectRuleDepth").value = state.ruleDepth || "full";
  if (el("chkSheriffMode")) el("chkSheriffMode").checked = Boolean(state.sheriffMode);
  if (el("chkGuardMode")) el("chkGuardMode").checked = Boolean(state.guardMode);
  const selGm = el("selectGeminiModel");
  if (selGm) {
    const desired = state.geminiModel || "gemini-4-hydrogen";
    const hasOpt = Array.prototype.some.call(selGm.options || [], function (o) { return o.value === desired; });
    if (hasOpt) selGm.value = desired;
  }
  const selOl = el("selectOllamaModel");
  if (selOl && state.localLlmModel) {
    const hasOl = Array.prototype.some.call(selOl.options || [], function (o) { return o.value === state.localLlmModel; });
    if (hasOl) selOl.value = state.localLlmModel;
  }
}

function isClassicSimpleMode() {
  if (state.match && state.match.started && state.match.ruleDepth) {
    return state.match.ruleDepth === "classic";
  }
  return state.ruleDepth === "classic";
}

function el(id) { return document.getElementById(id); }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function escapeHtml(str) {
  return (str === null || str === undefined ? "" : String(str))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTeaAtmosphereState(scoreArg) {
  const score = typeof scoreArg === "number"
    ? scoreArg
    : ((typeof state !== "undefined" && state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72);
  if (score >= 80) {
    return {
      id: "clear",
      label: "清朗茶風",
      shortTag: "清朗",
      tone: "jade",
      desc: "席間理性清明：說理說服力 +15%，急躁酸言將遭更強反噬"
    };
  }
  if (score <= 45) {
    return {
      id: "fog",
      label: "流言起霧",
      shortTag: "起霧",
      tone: "rose",
      desc: "情緒帶風向升溫：席間盲從效應放大，需以說好話或四給奉茶破霧"
    };
  }
  return {
    id: "calm",
    label: "茶席平瀾",
    shortTag: "",
    tone: "gold",
    desc: "理性推理中，累積三好與四給可將茶風拉入清朗"
  };
}

function recordThreeGoodImpact(key, title, detail, tone) {
  if (typeof state === "undefined" || !state.match || !state.match.started) return false;
  if (!Array.isArray(state.match.threeGoodImpactLog)) state.match.threeGoodImpactLog = [];
  const dayNum = state.match.day || 1;
  const normKey = String(key || "virtue");
  const normDetail = String(detail || "");
  const dup = state.match.threeGoodImpactLog.some(function (it) {
    return it && it.day === dayNum && it.key === normKey && it.detail === normDetail;
  });
  if (dup) return false;
  state.match.threeGoodImpactLog.push({
    day: dayNum,
    key: normKey,
    title: String(title || ""),
    detail: normDetail,
    tone: tone || "jade"
  });
  if (state.match.threeGoodImpactLog.length > 12) {
    state.match.threeGoodImpactLog = state.match.threeGoodImpactLog.slice(-12);
  }
  return true;
}

function addThreeGoodPoint(kind, reasonText) {
  if (!state.match.started || !state.match.threeGood) return;
  const tg = state.match.threeGood;
  if (!tg.milestones) tg.milestones = { heart: tg.heart > 0, words: tg.words > 0, deeds: tg.deeds > 0 };
  const wasUnlit = (kind === "heart" && !tg.milestones.heart) ||
    (kind === "words" && !tg.milestones.words) ||
    (kind === "deeds" && !tg.milestones.deeds);
  if (kind === "heart") { tg.heart += 1; tg.milestones.heart = true; }
  else if (kind === "words") { tg.words += 1; tg.milestones.words = true; }
  else if (kind === "deeds") { tg.deeds += 1; tg.milestones.deeds = true; }
  state.match.harmonyScore = clamp(state.match.harmonyScore + 5, 0, 100);
  if (reasonText) {
    spawnFx(getPlayerId(), reasonText + " +1", kind === "words" ? "#34d399" : (kind === "deeds" ? "#38bdf8" : "#fbbf24"));
  }
  const willAwakenNow = !tg.resonanceTriggered && tg.heart >= 1 && tg.words >= 1 && tg.deeds >= 1;
  // Individual Petal Lighting Celebration with Authentic Three-Goodness Wisdom Quote!
  if (wasUnlit && !willAwakenNow) {
    const qPool = (typeof THREE_GOOD_QUOTES !== "undefined" && THREE_GOOD_QUOTES[kind]) ? THREE_GOOD_QUOTES[kind] : null;
    const litTotal = (tg.heart > 0 ? 1 : 0) + (tg.words > 0 ? 1 : 0) + (tg.deeds > 0 ? 1 : 0);
    const virtueName = kind === "heart" ? "存好心" : (kind === "words" ? "說好話" : "做好事");
    const quote = qPool ? qPool[((state.match.day || 1) + litTotal) % qPool.length] : (virtueName + "已點亮！");
    if (typeof spawnBurst === "function") {
      spawnBurst(getPlayerId(), kind === "words" ? ["#34d399", "#fde68a"] : (kind === "deeds" ? ["#38bdf8", "#fde68a"] : ["#fbbf24", "#ffffff"]), 16, "petal");
    }
    if (typeof sound !== "undefined" && typeof sound.tone === "function") {
      sound.tone(528, 0.11, "sine", 0.055, 0);
      sound.tone(792, 0.14, "triangle", 0.045, 0.08);
    }
    addLog({
      kind: "blessing",
      title: "點亮三好蓮花瓣（" + litTotal + "/3）・" + virtueName + "！",
      text: quote
    });
    showToast("點亮「" + virtueName + "」(" + litTotal + "/3)｜" + quote, "emerald");
  }
  // Trigger Golden Three-Goodness Lotus Full Awakening when all 3 virtues are practiced!
  if (willAwakenNow) {
    tg.resonanceTriggered = true;
    state.match.harmonyScore = clamp(state.match.harmonyScore + 15, 0, 100);
    sound.playBlessing();
    setSeatEmotion(getPlayerId(), "proud", 3800);
    spawnBurst(getPlayerId(), ["#34d399", "#fbbf24", "#38bdf8", "#ffffff"], 36, "petal");
    const player = getPlayerSeat();
    const isWolfPlayer = Boolean(player && player.team === "wolf");
    if (isWolfPlayer) {
      // Deep-cover Three-Goodness Wolf: sweet charm reduces everyone's suspicion & cools microPulse!
      player.microPulse = Math.max(22, (player.microPulse || 70) - 22);
      state.match.seats.forEach(function (ai) {
        if (ai.id !== getPlayerId() && ai.alive && ai.team === "good") {
          ai.suspicionMap[getPlayerId()] = clamp((ai.suspicionMap[getPlayerId()] || 50) - 24, 5, 95);
        }
      });
      triggerCutIn("蓮花覺醒・深水三好光環！", "你的禮貌言行讓全場放下戒心，懷疑度大幅下降！", "gold");
      addLog({
        kind: "blessing",
        isPrivate: true,
        title: "三好蓮花覺醒（反派演技）：全場好人對你的懷疑度大幅下降，心虛值平息！",
        text: ""
      });
      recordThreeGoodImpact("lotus_awaken", "深水三好光環", "三瓣齊亮讓全席放下戒心，以溫雅風度掩護深水身分", "gold");
      showToast("蓮花三瓣全亮！你以極高風度獲得深水信任光環！", "emerald");
    } else {
      // Good Team Awakening: +1 Golden Goodwill Vote weight + enlighten 1 wavering Good AI on observable focus (ZERO hidden-wolf leak!)
      state.match.goodwillVoteBonus = true;
      const pidNow = getPlayerId();
      state.match.seats.forEach(function (ai) {
        if (ai.id !== pidNow && ai.alive && ai.team === "good") {
          ai.suspicionMap[pidNow] = clamp((ai.suspicionMap[pidNow] || 50) - 22, 5, 95);
        }
      });
      const waveringGood = getAliveSeats().find(function (s) { return s.id !== pidNow && s.team === "good"; });
      let enlightenNote = "";
      if (waveringGood) {
        const isValidFocus = function (id) {
          if (!id || id === pidNow || id === waveringGood.id) return false;
          const fs = getSeat(id);
          if (!fs || !fs.alive) return false;
          if (waveringGood.role === "seer" && (waveringGood.checkedHistory || []).some(function (c) { return c.targetId === id && !c.isWolf; })) return false;
          if (waveringGood.role === "witch" && waveringGood.savedSeatId === id) return false;
          return true;
        };
        let focusId = isValidFocus(state.selectedSeatId) ? state.selectedSeatId : null;
        if (!focusId && state.playerMarks) {
          const markedWolfKey = Object.keys(state.playerMarks).find(function (k) {
            return state.playerMarks[k] === "wolf" && isValidFocus(parseInt(k, 10));
          });
          if (markedWolfKey) focusId = parseInt(markedWolfKey, 10);
        }
        if (!focusId && typeof computeTableWindVane === "function") {
          const wv = computeTableWindVane();
          if (wv && isValidFocus(wv.topHeatSeatId)) focusId = wv.topHeatSeatId;
        }
        if (!focusId) {
          const cands = getAliveSeats().filter(function (s) { return isValidFocus(s.id); });
          cands.sort(function (a, b) { return (waveringGood.suspicionMap[b.id] || 50) - (waveringGood.suspicionMap[a.id] || 50); });
          if (cands[0]) focusId = cands[0].id;
        }
        const targetFocus = focusId ? getSeat(focusId) : null;
        if (targetFocus) {
          waveringGood.suspicionMap[targetFocus.id] = clamp((waveringGood.suspicionMap[targetFocus.id] || 50) + 18, 5, 98);
          setSeatBubble(waveringGood.id, "剛才被你的善意點醒了！這輪我跟你一起重點留意 " + fmtSeatNum(targetFocus.id) + "號！", "trust", 4200);
          enlightenNote = "，並感化 " + fmtSeatNum(waveringGood.id) + "號" + waveringGood.name + "共商聚焦 " + fmtSeatNum(targetFocus.id) + "號";
        }
      }
      triggerCutIn("三好蓮花三瓣覺醒！", "獲得「黃金善意票（公投 +1 票）」" + enlightenNote + "！", "emerald");
      addLog({
        kind: "blessing",
        isPrivate: true,
        title: "三好蓮花覺醒！你獲得「黃金善意票（公投權重 +1）」" + enlightenNote + "！",
        text: ""
      });
      recordThreeGoodImpact("lotus_awaken", "三好蓮花圓滿", "集齊存好心、說好話、做好事，開啟黃金善意票 +1" + enlightenNote, "jade");
      showToast("蓮花三瓣全亮！獲得公投「黃金善意票 +1」" + enlightenNote + "！", "emerald");
    }
    if (typeof stage3d !== "undefined" && stage3d.isActive() && typeof stage3d.triggerSkillFx === "function") {
      stage3d.triggerSkillFx("three_good_resonance", getPlayerId(), getPlayerId(), false);
    }
    if (typeof orchestrator !== "undefined") {
      orchestrator.emit("three_good:awakened", { team: isWolfPlayer ? "wolf" : "good" });
    }
  }
  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  }
}

function addLog(entry) {
  state.match.logs.push({
    id: state.match.logs.length + 1,
    day: state.match.day,
    kind: entry.kind || "system",
    isPrivate: Boolean(entry.isPrivate),
    speakerId: entry.speakerId || null,
    pendingReveal: Boolean(entry.pendingReveal),
    title: entry.title || "",
    text: entry.text || "",
    subBadge: entry.subBadge || ""
  });
  if (entry.kind === "speech") {
    if (!entry.useTypewriter) {
      updateSpotlightBox(entry.title, entry.subBadge || "發言中", "「" + entry.text + "」");
    }
  } else if (entry.kind === "dawn" || entry.kind === "secret" || entry.kind === "blessing" || entry.kind === "banner") {
    updateSpotlightBox(
      entry.kind === "secret" ? "秘密情報" : (entry.kind === "blessing" ? "四給戰術" : "主持播報"),
      state.match.day > 0 ? ("第 " + state.match.day + " 回合") : "開局",
      entry.title + (entry.text ? (" — " + entry.text) : "")
    );
  }
  renderTimeline({ deferIfHidden: true });
}

function isNightPhase(phase) {
  return phase === "NIGHT_GUARD" || phase === "NIGHT_WOLF" || phase === "NIGHT_SEER" || phase === "NIGHT_WITCH";
}

function getSeat(id) {
  return state.match.seats.find(function (s) { return s.id === id; }) || null;
}

function getPlayerId() {
  return (state.match && state.match.playerSeatId) ? state.match.playerSeatId : 1;
}

function getPlayerSeat() {
  return getSeat(getPlayerId());
}

function getSeatEffectiveRoleKey(seat) {
  if (!seat) return "villager";
  if (seat.isWolfKing) return "wolf_king";
  if (seat.isElder) return "elder";
  return seat.role || "villager";
}

function getSeatRoleDef(seat) {
  if (typeof ROLE_DEFS === "undefined" || !seat) return null;
  const effKey = getSeatEffectiveRoleKey(seat);
  return ROLE_DEFS[effKey] || ROLE_DEFS[seat.role] || null;
}

function canSeatTriggerShot(seat) {
  return Boolean(seat && (seat.role === "hunter" || seat.isWolfKing));
}

function getFxPacingMul() {
  return (typeof state !== "undefined" && state.fxPacing === "fast") ? 0.65 : 1.0;
}

function fmtSeatNum(id) {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return String(id || "");
  return n >= 0 && n < 10 ? ("0" + n) : String(n);
}

function fmtSeatTag(id) {
  return fmtSeatNum(id) + "號";
}

const _CN_SEAT_MAP = {
  "十二": 12, "十一": 11, "十": 10,
  "九": 9, "八": 8, "七": 7, "六": 6, "五": 5, "四": 4, "三": 3, "二": 2, "一": 1
};

function normalizeSeatRefsInText(rawText, maxSeats) {
  let s = String(rawText || "");
  if (!s) return "";
  const cap = Number.isFinite(maxSeats) && maxSeats > 0
    ? maxSeats
    : ((typeof state !== "undefined" && state.match && state.match.totalSeats) ? state.match.totalSeats : 12);

  // 1. Explicit Chinese numerals + 號 (e.g. 三號 -> 3號, 十一號 -> 11號, 十二號 -> 12號)
  s = s.replace(/(?<![一二三四五六七八九十零百千萬\d])(十二|十一|十|九|八|七|六|五|四|三|二|一)\s*號/g, function (full, cn) {
    const n = _CN_SEAT_MAP[cn];
    return (n && n <= cap) ? (n + "號") : full;
  });

  // 2. Zero-padded Arabic seat numbers with or without 號 (e.g. 06 -> 6號, 03號 -> 3號, 01 -> 1號)
  s = s.replace(/(?<![\d.:])0([1-9])(?:\s*號)?(?!\d)/g, function (full, d) {
    const n = parseInt(d, 10);
    return (n >= 1 && n <= cap) ? (n + "號") : full;
  });

  // 3. Paired bare Arabic seat numbers (e.g. "3跟5", "3和5", "3、5", "3+5")
  s = s.replace(/(?<![\d.:第每近前前後剩共這那全])(1[0-2]|[1-9])(?=\s*(?:跟|和|與|及|或|、|＋|\+)\s*(?:1[0-2]|0?[1-9])(?![\d.%％~～天晚輪夜票神民人個位名張次句段秒分時倍Gｇ]))/g, function (full, d) {
    const n = parseInt(d, 10);
    return (n >= 1 && n <= cap) ? (n + "號") : full;
  });

  // 4. Bare Arabic seat numbers after Werewolf action / relation cues (2 passes for chains like "狼坑在3跟5")
  const arabicCueRe = /(站邊|站了|站|信|相信|力挺|挺|保了|保|投給|投了|投|歸票|歸|點了|點|硬打|打了|打|踩了|踩|回頭抓|抓了|抓|親驗|必驗|先驗|再驗|去驗|驗了|驗過|驗|查殺是|查殺|查了|查|護回|護|救了|救|守護|守了|守|毒了|毒|刀了|刀|殺|票|衝票的|跟票的|分票的|對跳的|退水的|警下的|上警的|衝|沖|徽給|給|飛|移交|帶走|懷疑|排|鎖定|鎖|盯緊|盯|狼坑就是|狼坑在|狼坑是|坑在|金水是|就是|是|在|把|對|跟|和|與|及|或|、|＋|\+|\/)\s*(1[0-2]|[1-9])(?![\d.%％~～號天晚輪夜票神民人個位名張次句段秒分時倍Gｇ點下步層組對刀毒藥盾邊茶座場局款種條招手星級萬千百十起定直樣半隻筆件口杯碗])(?!狼(?![坑隊]))(?!好(?!人))/g;
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(arabicCueRe, function (full, cue, d) {
      const n = parseInt(d, 10);
      return (n >= 1 && n <= cap) ? (cue + n + "號") : full;
    });
  }

  // 5. Bare Arabic seat numbers at clause start or before persona name / Werewolf predicate (e.g. "但 5 直接硬打", "6晴嵐", "3發言很怪")
  const predBareRe = /(^|[，。！？、；：,\.!?;:\s但可而像讓叫看聽覺得認為])(1[0-2]|[1-9])(?=\s*(?:晴嵐|小澄|暖暖|阿松|星兒|小雲|阿竹|晨晨|墨白|阿朗|柚子|直接|剛才|剛剛|破綻|邏輯|是狼|是好人|不像狼|很怪|很可疑|很像|跳|自稱|點|硬打|歸票|站邊|查殺|金水|銀水|發言|表水|退水|上警|警下|離席|帶風向|沒問題|太明顯))/g;
  s = s.replace(predBareRe, function (full, lead, d) {
    const n = parseInt(d, 10);
    return (n >= 1 && n <= cap) ? (lead + n + "號") : full;
  });

  // 6. Bare Chinese numerals after strong Werewolf cues (e.g. "站三", "抓六", "投六", "狼坑在三跟五", "先驗四再驗十一")
  const cnCueRe = /(站邊|站了|站|投給|投了|投|歸票|硬打|打了|踩了|踩|回頭抓|抓了|抓|親驗|必驗|先驗|再驗|去驗|驗了|驗過|驗|查殺是|查殺|護回|救了|救|守護|守了|守|毒了|毒|刀了|刀|徽給|狼坑就是|狼坑在|狼坑是|坑在|保了|保|力挺|挺|懷疑|盯緊|帶走|飛|點了|點)\s*(十二|十一|十|九|八|七|六|五|四|三|二|一)(?![一二三四五六七八九十零百千萬號票入降下個位名張次句段秒分時倍邊手眼步點些直定起樣半天晚輪夜神民人刀毒盾好心話事隻筆件口杯碗])(?=[，。！？、；：,\.!?;:\s跟和與及或回直接是破很這那我你他她不就也又再才都沒狼坑]|$)/g;
  s = s.replace(cnCueRe, function (full, cue, cn) {
    const n = _CN_SEAT_MAP[cn];
    return (n && n <= cap) ? (cue + n + "號") : full;
  });
  const cnChainRe = /(\d+號\s*(?:跟|和|與|及|或|、|＋|\+))\s*(十二|十一|十|九|八|七|六|五|四|三|二|一)(?![一二三四五六七八九十零百千萬號票入降下個位名張次句段秒分時倍邊手眼步點些直定起樣半天晚輪夜神民人刀毒盾好心話事隻筆件口杯碗])(?=[，。！？、；：,\.!?;:\s跟和與及或回直接是破很這那我你他她不就也又再才都沒狼坑]|$)/g;
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(cnChainRe, function (full, lead, cn) {
      const n = _CN_SEAT_MAP[cn];
      return (n && n <= cap) ? (lead + n + "號") : full;
    });
  }
  return s;
}

function extractSeatIdsFromText(rawText, maxSeats, opts) {
  const cap = Number.isFinite(maxSeats) && maxSeats > 0
    ? maxSeats
    : ((typeof state !== "undefined" && state.match && state.match.totalSeats) ? state.match.totalSeats : 12);
  const norm = normalizeSeatRefsInText(rawText, cap);
  const out = [];
  const matches = norm.match(/(?:1[0-2]|0?[1-9])\s*號/g) || [];
  for (let i = 0; i < matches.length; i++) {
    const n = parseInt(matches[i], 10);
    if (n >= 1 && n <= cap && out.indexOf(n) === -1) out.push(n);
  }
  if (opts && opts.includeNames && typeof state !== "undefined" && state.match && Array.isArray(state.match.seats)) {
    const rawStr = String(rawText || "");
    for (let i = 0; i < state.match.seats.length; i++) {
      const st = state.match.seats[i];
      if (!st || !st.name || st.name === "你" || st.name.length < 2) continue;
      if (st.id >= 1 && st.id <= cap && out.indexOf(st.id) === -1 && rawStr.indexOf(st.name) !== -1) {
        out.push(st.id);
      }
    }
  }
  return out;
}

function getLobbySeatCount() {
  const raw = el("selectModeCount") ? parseInt(el("selectModeCount").value, 10) : 8;
  if (raw === 12 || raw === 10 || raw === 8 || raw === 6) return raw;
  return 8;
}

function getInitialWolfCount(totalSeats) {
  const varMode = (state.match && state.match.started)
    ? state.match.variantMode
    : ((state.match && state.match.variantMode && state.match.variantMode !== "standard") ? state.match.variantMode : state.activeVariant);
  if (varMode === "lone_wolf_king") return 1;
  const n = parseInt(totalSeats, 10) || (state.match && state.match.started ? state.match.totalSeats : getLobbySeatCount());
  if (n >= 12) return 4;
  if (n >= 10) return 3;
  return 2;
}

function playerNumTag() {
  return fmtSeatTag(getPlayerId());
}

function getAliveSeats() {
  return state.match.seats.filter(function (s) { return s.alive; });
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i >0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  }
  return copy;
}

/**
 * 偵測目前使用的裝置形態（手機 / 平板 / 電腦），供操作提示與三裝置獨立教學自動切換。
 */
function detectTutorialDeviceMode() {
  if (typeof window === "undefined") return "desktop";
  const w = Math.max(0, Number(window.innerWidth) || 0);
  const hasCoarse = Boolean(
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches
  );
  const hasTouch = Boolean(
    (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0) || hasCoarse
  );
  if (w > 0 && w <= 767) return "phone";
  if (w >= 768 && w <= 1199) return "tablet";
  if (hasCoarse && hasTouch && w <= 1366) return "tablet";
  return "desktop";
}
