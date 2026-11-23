/**
 * 全域遊戲狀態、localStorage 偏好設定、基礎 DOM / 座位查詢與紀錄工具函式
 */
"use strict";

const state = {
  geminiApiKey: "",
  geminiModel: "gemini-3.8-flash",
  localLlmModel: "",
  autoPlay: false,
  coachEnabled: true,
  tutorialIndex: 0,
  hidePlayerRole: false,
  showRelationsOnCanvas: true,
  viewMode: "3d",
  quality3D: "high",
  qualityUserChosen: false,
  playerGender: "f", // "f" | "m" (1-click player voice & VRM avatar toggle)
  portraitStyle: "painted", // "painted" (Studio ink cinema art) | "vrm3d" (3D VRM portrait)
  cardPeek3D: false,
  aiDifficulty: "normal", // "easy" | "normal" | "pro"
  ruleDepth: "full", // "full" | "classic"
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
    wolfTactic: "fake_seer",
    sheriffRallyUsedDay: 0,
    sheriffElectionPending: false,
    sheriffElectionCtx: null,
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
      fourGSynergies: 0
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
      voiceRate: Number(voice.rate) || 0.96,
      voiceVolume: Number(voice.volume),
      voiceUri: voice.selectedVoiceUri || "auto",
      soundMuted: Boolean(sound.muted),
      bgmVol: Number(sound.bgmVol),
      sfxVol: Number(sound.sfxVol),
      timbre: sound.timbre || "zen",
      trackMode: sound.trackMode || "auto",
      autoPlay: Boolean(state.autoPlay),
      showRelations: Boolean(state.showRelationsOnCanvas),
      viewMode: state.viewMode === "2d" ? "2d" : "3d",
      quality3D: (state.quality3D === "eco" || state.quality3D === "balanced") ? state.quality3D : "high",
      qualityUserChosen: Boolean(state.qualityUserChosen),
      playerGender: state.playerGender === "m" ? "m" : "f",
      portraitStyle: state.portraitStyle === "vrm3d" ? "vrm3d" : "painted",
      portraitPrefVersion: 2,
      aiDifficulty: state.aiDifficulty || "normal",
      ruleDepth: state.ruleDepth === "classic" ? "classic" : "full",
      sheriffMode: Boolean(state.sheriffMode),
      guardMode: Boolean(state.guardMode),
      geminiModel: state.geminiModel || "gemini-3.8-flash",
      localLlmModel: state.localLlmModel || "",
      subtitleLarge: Boolean(state.subtitleLarge)
    };
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {}
}

function loadUserPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return;
    if (typeof p.voiceEnabled === "boolean") voice.enabled = p.voiceEnabled;
    if (p.voiceMode === "hybrid" || p.voiceMode === "tts" || p.voiceMode === "cozy") voice.mode = p.voiceMode;
    if (p.voiceAccent === "tw") voice.accentMode = "tw";
    else if (p.voiceAccent === "anime" || p.voiceAccent === "multi") voice.accentMode = "anime";
    if (typeof p.voiceRate === "number" && p.voiceRate >= 0.7 && p.voiceRate <= 1.35) voice.rate = p.voiceRate;
    if (typeof p.voiceVolume === "number" && p.voiceVolume >= 0 && p.voiceVolume <= 1) voice.volume = p.voiceVolume;
    if (typeof p.voiceUri === "string" && p.voiceUri) voice.selectedVoiceUri = p.voiceUri;
    if (typeof p.soundMuted === "boolean") sound.muted = p.soundMuted;
    if (typeof p.bgmVol === "number" && p.bgmVol >= 0 && p.bgmVol <= 1) sound.bgmVol = p.bgmVol;
    if (typeof p.sfxVol === "number" && p.sfxVol >= 0 && p.sfxVol <= 1) sound.sfxVol = p.sfxVol;
    if (p.timbre === "zen" || p.timbre === "folk" || p.timbre === "cinema") sound.timbre = p.timbre;
    if (["auto", "twilight", "night", "day", "vote", "finale"].indexOf(p.trackMode) !== -1) sound.trackMode = p.trackMode;
    if (typeof p.autoPlay === "boolean") state.autoPlay = p.autoPlay;
    if (typeof p.showRelations === "boolean") state.showRelationsOnCanvas = p.showRelations;
    if (p.viewMode === "2d" || p.viewMode === "3d") state.viewMode = p.viewMode;
    if (p.quality3D === "high" || p.quality3D === "balanced" || p.quality3D === "eco") state.quality3D = p.quality3D;
    if (typeof p.qualityUserChosen === "boolean") state.qualityUserChosen = p.qualityUserChosen;
    if (p.playerGender === "m" || p.playerGender === "f") state.playerGender = p.playerGender;
    if ((p.portraitPrefVersion >= 2) && (p.portraitStyle === "vrm3d" || p.portraitStyle === "painted")) state.portraitStyle = p.portraitStyle;
    if (p.aiDifficulty === "easy" || p.aiDifficulty === "normal" || p.aiDifficulty === "pro") state.aiDifficulty = p.aiDifficulty;
    if (p.ruleDepth === "classic" || p.ruleDepth === "full") state.ruleDepth = p.ruleDepth;
    if (typeof p.sheriffMode === "boolean") state.sheriffMode = p.sheriffMode;
    if (typeof p.guardMode === "boolean") state.guardMode = p.guardMode;
    if (typeof p.geminiModel === "string" && p.geminiModel) state.geminiModel = p.geminiModel;
    if (typeof p.localLlmModel === "string") state.localLlmModel = p.localLlmModel;
    if (typeof p.subtitleLarge === "boolean") state.subtitleLarge = p.subtitleLarge;
  } catch (e) {}
}

function syncPrefsToControls() {
  if (el("voiceToggleLabel")) el("voiceToggleLabel").textContent = voice.getModeLabel();
  if (el("muteToggleLabel")) el("muteToggleLabel").textContent = sound.muted ? "音效:關" : "音效:開";
  else if (el("btnToggleMute")) el("btnToggleMute").textContent = sound.muted ? "音效:關" : "音效:開";
  if (el("btnAutoPlayToggle")) el("btnAutoPlayToggle").textContent = "自動:" + (state.autoPlay ? "開" : "關");
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
  ["btnTimbreZen", "btnTimbreFolk", "btnTimbreCinema"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", el(id).getAttribute("data-timbre") === sound.timbre);
  });
  ["btnTrackAuto", "btnTrackTwilight", "btnTrackNight", "btnTrackDay", "btnTrackVote", "btnTrackFinale"].forEach(function (id) {
    if (el(id)) el(id).classList.toggle("is-active", el(id).getAttribute("data-track") === sound.trackMode);
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
  if (el("selectAiDifficulty")) el("selectAiDifficulty").value = state.aiDifficulty || "normal";
  if (el("selectRuleDepth")) el("selectRuleDepth").value = state.ruleDepth || "full";
  if (el("chkSheriffMode")) el("chkSheriffMode").checked = Boolean(state.sheriffMode);
  const selGm = el("selectGeminiModel");
  if (selGm) {
    const desired = state.localLlmModel ? ("ollama:" + state.localLlmModel) : (state.geminiModel || "gemini-3.8-flash");
    const hasOpt = Array.prototype.some.call(selGm.options || [], function (o) { return o.value === desired; });
    if (hasOpt) selGm.value = desired;
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
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addThreeGoodPoint(kind, reasonText) {
  if (!state.match.started || !state.match.threeGood) return;
  const tg = state.match.threeGood;
  if (kind === "heart") tg.heart += 1;
  else if (kind === "words") tg.words += 1;
  else if (kind === "deeds") tg.deeds += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 5, 0, 100);
  if (reasonText) {
    spawnFx(getPlayerId(), reasonText + " +1", kind === "words" ? "#34d399" : (kind === "deeds" ? "#38bdf8" : "#fbbf24"));
  }
  // Trigger Golden Three-Goodness Lotus Full Awakening when all 3 virtues are practiced!
  if (!tg.resonanceTriggered && tg.heart >= 1 && tg.words >= 1 && tg.deeds >= 1) {
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
      triggerCutIn("🌟 蓮花覺醒・深水三好光環！", "你的禮貌言行讓全場放下戒心，懷疑度大幅下降！", "gold");
      addLog({
        kind: "blessing",
        title: "🌟 三好蓮花覺醒（反派演技）：全場好人對你的懷疑度大幅下降，心虛值平息！",
        text: ""
      });
      showToast("🌟 蓮花三瓣全亮！你以極高風度獲得深水信任光環！", "emerald");
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
      triggerCutIn("🌟 三好蓮花三瓣覺醒！", "獲得「黃金善意票（公投 +1 票）」" + enlightenNote + "！", "emerald");
      addLog({
        kind: "blessing",
        title: "🌟 三好蓮花覺醒！你獲得「黃金善意票（公投權重 +1）」" + enlightenNote + "！",
        text: ""
      });
      showToast("🌟 蓮花三瓣全亮！獲得公投「黃金善意票 +1」" + enlightenNote + "！", "emerald");
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
    speakerId: entry.speakerId || null,
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
  renderTimeline();
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

function fmtSeatNum(id) {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return String(id || "");
  return n >= 0 && n < 10 ? ("0" + n) : String(n);
}

function fmtSeatTag(id) {
  return fmtSeatNum(id) + "號";
}

function getLobbySeatCount() {
  const raw = el("selectModeCount") ? parseInt(el("selectModeCount").value, 10) : 8;
  if (raw === 12 || raw === 10 || raw === 8 || raw === 6) return raw;
  return 8;
}

function getInitialWolfCount(totalSeats) {
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
