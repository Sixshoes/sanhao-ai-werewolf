/**
 * 白天輪流發言（嚴守凹嗚順位）與 AI 回合發言執行
 */
"use strict";

// ==================== DAY SPEECH (STRICT 凹嗚狼人殺 TURN ORDER) ====================
function startDayDiscussion(dawnVoiceLine, opts) {
  clearStepTimer();
  const optCfg = opts || {};
  state.match.phase = "DAY_SPEECH";
  const total = state.match.totalSeats;
  const lastCas = state.match.lastNightCasualties || [];
  const dir = (optCfg.forcedDir === 1 || optCfg.forcedDir === -1) ? optCfg.forcedDir : (Math.random() < 0.5 ? 1 : -1);
  const shId = state.match.sheriffSeatId;
  const shSeat = shId ? getSeat(shId) : null;
  const hasAliveSheriff = Boolean(shSeat && shSeat.alive);
  let anchorNum = 1;
  let orderReason = "";
  if (hasAliveSheriff) {
    // 凹嗚標準規則：有在席警長時從「警右順時針／警左逆時針」依序連續發言，警長自然落於末置位歸票（絕不從中間抽位造成跳號！）
    anchorNum = ((shSeat.id - 1 + dir + total) % total) + 1;
    orderReason = (dir === 1 ? "警右順時針" : "警左逆時針") + "・警長末置位歸票";
  } else if (lastCas.length === 1) {
    // 凹嗚標準規則：單死夜從倒牌玩家旁開始（死右順時針 / 死左逆時針）連續輪流發言！
    const deadId = lastCas[0];
    anchorNum = ((deadId - 1 + dir + total) % total) + 1;
    orderReason = "離席位" + (dir === 1 ? "右順時針" : "左逆時針");
  } else {
    // 平安夜或雙死夜：隨機順／逆時針連續輪流發言
    anchorNum = (((state.match.startOffset || 0) + state.match.day - 1) % total) + 1;
    orderReason = dir === 1 ? "順時針輪流" : "逆時針輪流";
  }
  const ordered = [];
  for (let step = 0; step < total; step++) {
    const seatNum = ((anchorNum - 1 + step * dir + total * 4) % total) + 1;
    const s = getSeat(seatNum);
    if (s && s.alive) ordered.push(s.id);
  }
  state.match.speechDirection = dir;
  state.match.speechOrderLabel = orderReason;
  state.match.dayOrder = ordered.slice();
  state.match.speechQueue = ordered;
  state.match.todayEvents = { accusedYouId: null, fakeSeerId: null, toxicSlipId: null };
  state.match.daySpeechEvents = [];
  state.match.pkCandidates = null;
  state.match.pkUsedToday = false;
  state.activeSpeakerId = null;
  state.activeClash = null;
  state.match._prefetchedSpeech = null;
  if (typeof orchestrator !== "undefined") {
    if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) {
      state.match.activeDirectorEvent = null;
    } else {
      orchestrator.rollDailyTeaEvent(state.match.day);
    }
    orchestrator.emit("phase:changed", { phase: "DAY_SPEECH", day: state.match.day });
  }
  if (ordered.length > 0) {
    addLog({
      kind: "dawn",
      title: "第 " + state.match.day + " 天輪流發言（" + orderReason + "）：從 " + fmtSeatNum(ordered[0]) + "號 開始依序發言",
      text: ""
    });
  }
  updateAllUI();

  const prog = el("spotlightProgressBar");
  if (prog) prog.style.width = "100%";

  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!ff && typeof prefetchNextAiSpeech === "function") {
    prefetchNextAiSpeech();
  }
  if (dawnVoiceLine && voice.canSpeak() && !ff) {
    syncSpeakerBannerVisuals(null, "主持播報 · 天亮結果", "第 " + state.match.day + " 天", false);
    let kickedOff = false;
    const goFirstSpeaker = function () {
      if (kickedOff || state.match.phase !== "DAY_SPEECH") return;
      kickedOff = true;
      state.stepTimer = setTimeout(advanceSpeechQueue, 360);
    };
    voice.speakHost(dawnVoiceLine, goFirstSpeaker, "host_dawn");
    state.stepTimer = setTimeout(goFirstSpeaker, 12000);
  } else {
    state.stepTimer = setTimeout(advanceSpeechQueue, ff ? 180 : 750);
  }
}

function advanceSpeechQueue() {
  clearStepTimer();
  if (state.match.phase !== "DAY_SPEECH" && state.match.phase !== "DAY_PLAYER_TURN") return;

  if (state.match.speechQueue.length === 0) {
    startVotingPhase();
    return;
  }

  const nextSpeakerId = state.match.speechQueue.shift();
  const speaker = getSeat(nextSpeakerId);
  if (!speaker || !speaker.alive) {
    advanceSpeechQueue();
    return;
  }

  state.activeSpeakerId = speaker.id;
  state.currentTurnSpoken = false;
  state.activeClash = null;

  if (speaker.id === getPlayerId()) {
    // Harmony >= 85 Automatic Perk: "三好清風" spots the sharpest OBSERVABLE contradiction/slip (zero hidden-info leak!)
    if (state.match.harmonyScore >= 85 && state.match.clearBreezeUsedDay !== state.match.day) {
      const evs = state.match.daySpeechEvents || [];
      const clashRoles = {};
      state.match.seats.forEach(function (s) {
        if (s.alive && s.claimedRole) clashRoles[s.claimedRole] = (clashRoles[s.claimedRole] || 0) + 1;
      });
      const sharpEv = evs.find(function (ev) { return ev.hasToxicSlip; })
        || evs.find(function (ev) { return ev.contradiction && ev.contradiction.severity >= 2; })
        || evs.find(function (ev) { return ev.claimRole && (clashRoles[ev.claimRole] || 0) >= 2; });
      if (sharpEv) {
        state.match.clearBreezeUsedDay = state.match.day;
        const shSeat = getSeat(sharpEv.speakerId);
        if (shSeat && shSeat.alive) {
          pinClue(shSeat.id, "🍃清風圈出 " + fmtSeatNum(shSeat.id) + "號", "剛剛三好清風幫我注意到 " + fmtSeatNum(shSeat.id) + "號" + shSeat.name + " 的語氣與立場有矛盾，建議大家重點檢視 " + fmtSeatNum(shSeat.id) + "號！", "clash");
          spawnFx(shSeat.id, "🍃 清風照破!", "#34d399");
          showToast("🍃 三好清風吹拂（友善度 ≥ 85）：已自動圈出 " + fmtSeatNum(shSeat.id) + "號的發言破綻到你的筆記！", "emerald");
        }
      }
    }
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    voice.speakHost("輪到" + getPlayerId() + "號你發言了，請選擇卡牌表態。", undefined, "normal");
    return;
  }

  state.match.phase = "DAY_SPEECH";
  updateAllUI();

  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const hasReadyPrefetch = Boolean(typeof isPrefetchedAiSpeechReady === "function" && isPrefetchedAiSpeechReady(speaker.id));
  const delayMs = ff ? 85 : (hasReadyPrefetch ? 45 : (state.autoPlay ? 220 : 120));
  state.stepTimer = setTimeout(function () {
    executeAiTurnSpeech(speaker);
  }, delayMs);
}

function _buildSpeechPrefetchKey(seatId) {
  const m = state.match || {};
  const evLen = Array.isArray(m.daySpeechEvents) ? m.daySpeechEvents.length : 0;
  const pkTag = (typeof isPkVoteActive === "function" && isPkVoteActive()) ? "pk" : "reg";
  return (m.day || 0) + ":" + seatId + ":" + evLen + ":" + pkTag;
}

function isPrefetchedAiSpeechReady(seatId) {
  const pf = state.match && state.match._prefetchedSpeech;
  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  return Boolean(pf && pf.epoch === ep && pf.seatId === seatId && pf.key === _buildSpeechPrefetchKey(seatId) && pf.resolvedMeta);
}

function prefetchNextAiSpeech() {
  const m = state.match;
  if (!m || !m.started) return false;
  const extLlmOn = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel);
  if (!extLlmOn) return false;
  if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return false;
  const q = m.speechQueue || [];
  if (!q.length) return false;
  const nextId = q[0];
  if (nextId === getPlayerId()) return false;
  const nextSeat = getSeat(nextId);
  if (!nextSeat || !nextSeat.alive) return false;

  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const key = _buildSpeechPrefetchKey(nextId);
  const existing = m._prefetchedSpeech;
  if (existing && existing.epoch === ep && existing.key === key) return true;

  const fallbackMeta = buildHeuristicAiSpeech(nextSeat);
  const entry = {
    key: key,
    epoch: ep,
    seatId: nextId,
    resolvedMeta: null,
    promise: null
  };
  m._prefetchedSpeech = entry;

  const runDispatch = (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function")
    ? orchestrator.dispatchAgent("PersonaAgent", { speaker: nextSeat, fallbackMeta: fallbackMeta }).then(function (dispatched) {
        if (!dispatched || !dispatched.epochValid || !orchestrator.isEpochValid(ep)) return null;
        return dispatched.generated || fallbackMeta;
      })
    : tryGenerateGeminiAiSpeech(nextSeat, fallbackMeta).then(function (liveRes) {
        const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
        if (liveTxt) {
          if (typeof syncGeminiSpeechMeta === "function") syncGeminiSpeechMeta(nextSeat, fallbackMeta, liveRes);
          else fallbackMeta.text = liveTxt;
          fallbackMeta.text = String(fallbackMeta.text || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").trim();
        }
        return fallbackMeta;
      });

  entry.promise = runDispatch.then(function (resMeta) {
    if (resMeta && m._prefetchedSpeech === entry) {
      entry.resolvedMeta = resMeta;
    }
    return resMeta;
  }).catch(function () {
    if (m._prefetchedSpeech === entry) m._prefetchedSpeech = null;
    return null;
  });
  return true;
}

const THINKING_MICROCUES = [
  "輕抿一口茶，整理剛才的發言脈絡…",
  "翻看手邊筆記，思索場上邏輯破綻…",
  "微微頷首消化前幾位夥伴的說法…",
  "沉吟片刻，準備接過話頭表態…"
];

async function executeAiTurnSpeech(speaker) {
  if (state.speakingInFlight) return;
  state.speakingInFlight = true;
  state.currentTurnSpoken = true;
  stopTypewriterOnly();
  if (state.stepTimer) {
    clearTimeout(state.stepTimer);
    state.stepTimer = null;
  }
  let generated = null;
  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const extLlmOn = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel);
  const pf = state.match && state.match._prefetchedSpeech;
  const curKey = _buildSpeechPrefetchKey(speaker.id);
  const pfMatch = Boolean(pf && pf.epoch === ep && pf.seatId === speaker.id && pf.key === curKey);
  if (pfMatch) state.match._prefetchedSpeech = null;

  let cueTimer = null;
  try {
    if (pfMatch && pf.resolvedMeta) {
      // Zero-wait instant handoff from background prefetch!
      generated = pf.resolvedMeta;
    } else {
      if (extLlmOn) {
        // Only show a gentle in-character cue if the LLM takes longer than 350ms (eliminates jarring flashing!)
        const cueLine = typeof getPersonaThinkingCue === "function"
          ? getPersonaThinkingCue(speaker, state.match.day)
          : THINKING_MICROCUES[(speaker.id + (state.match.day || 1)) % THINKING_MICROCUES.length];
        cueTimer = setTimeout(function () {
          if (state.match.phase === "DAY_SPEECH" && state.activeSpeakerId === speaker.id && state.speakingInFlight) {
            syncSpeakerBannerVisuals(speaker, fmtSeatNum(speaker.id) + "號 · " + speaker.name, speaker.trait, false);
            updateSpotlightBox(fmtSeatNum(speaker.id) + "號 · " + speaker.name, speaker.trait, cueLine);
          }
        }, 350);
      }
      if (pfMatch && pf.promise) {
        const awaited = await pf.promise;
        if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(ep)) return;
        generated = awaited || buildHeuristicAiSpeech(speaker);
      } else {
        generated = buildHeuristicAiSpeech(speaker);
        if (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function") {
          const dispatched = await orchestrator.dispatchAgent("PersonaAgent", { speaker: speaker, fallbackMeta: generated });
          if (!dispatched || !dispatched.epochValid || !orchestrator.isEpochValid(ep)) {
            return;
          }
          generated = dispatched.generated || generated;
        } else if (extLlmOn) {
          const liveRes = await tryGenerateGeminiAiSpeech(speaker, generated);
          const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
          if (liveTxt) {
            if (typeof syncGeminiSpeechMeta === "function") {
              syncGeminiSpeechMeta(speaker, generated, liveRes);
            } else {
              generated.text = liveTxt;
            }
            generated.text = String(generated.text || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").trim();
          }
        }
      }
    }
  } finally {
    if (cueTimer) clearTimeout(cueTimer);
    state.speakingInFlight = false;
  }
  if (state.match.phase !== "DAY_SPEECH" || state.activeSpeakerId !== speaker.id || !speaker.alive) return;

  sound.playSpeak();

  if (generated.targetId && generated.relationType) {
    recordRelation(speaker.id, generated.targetId, generated.relationType);
  }
  if (!state.match.daySpeechEvents) state.match.daySpeechEvents = [];
  if (!state.match.allSpeechEvents) state.match.allSpeechEvents = [];
  const aiEvObj = {
    day: state.match.day,
    turnOrderIndex: state.match.daySpeechEvents.length,
    speakerId: speaker.id,
    speakerName: speaker.name,
    claimRole: generated.claimSeer ? "seer" : (generated.claimRole || null),
    accuseId: generated.accuseId || null,
    vouchId: generated.vouchId || null,
    wolfPits: Array.isArray(generated.wolfPits) ? generated.wolfPits.slice() : (generated.accuseId ? [generated.accuseId] : []),
    goodPits: Array.isArray(generated.goodPits) ? generated.goodPits.slice() : (generated.vouchId ? [generated.vouchId] : []),
    standWithSeerId: generated.standWithSeerId || null,
    checkedWolfId: generated.checkedWolfId !== undefined ? generated.checkedWolfId : ((generated.claimSeer && generated.accuseId) ? generated.accuseId : null),
    checkedGoodId: generated.checkedGoodId !== undefined ? generated.checkedGoodId : ((generated.claimSeer && generated.vouchId) ? generated.vouchId : null),
    hasToxicSlip: Boolean(generated.hasToxicSlip),
    rawText: generated.text
  };
  speaker.publicVoteIntent = generated.accuseId || null;
  state.match.daySpeechEvents.push(aiEvObj);
  state.match.allSpeechEvents.push(aiEvObj);

  const contra = typeof detectSpeechContradictions === "function" ? detectSpeechContradictions(speaker, aiEvObj) : null;
  state.match.activeSpeechContra = contra ? { speakerId: speaker.id, contra: contra } : null;
  if (contra) {
    aiEvObj.contradiction = contra;
    if (!state.match.detectedContradictions) state.match.detectedContradictions = [];
    state.match.detectedContradictions.push({
      day: state.match.day,
      speakerId: speaker.id,
      code: contra.code,
      severity: contra.severity,
      isPublic: contra.isPublic !== false,
      label: contra.label,
      detail: contra.detail,
      rebuttalText: contra.rebuttalText
    });
  }

  applySpeechInfluence(speaker, generated);
  if (generated.emotion && typeof setSeatEmotion === "function") {
    const emoMap = { sharp: "angry", urgent: "angry", warm: "happy", defensive: "nervous" };
    if (emoMap[generated.emotion]) setSeatEmotion(speaker.id, emoMap[generated.emotion], 3200);
  }
  if (typeof triggerSpeechAudienceReactions === "function") {
    triggerSpeechAudienceReactions(speaker, generated);
  }

  setCanvasBubble(speaker.id, generated.text, generated.relationType === "trust" ? "trust" : "suspect");

  // Dramatic clash FX whenever 2 people counter-claim the same God role (Seer / Witch / Hunter)!
  if (speaker.claimedRole && ROLE_DEFS[speaker.claimedRole]) {
    const sameClaimants = state.match.seats.filter(function (s) { return s.alive && s.claimedRole === speaker.claimedRole; });
    const rTitle = ROLE_DEFS[speaker.claimedRole].name;
    if (sameClaimants.length >= 2) {
      triggerShake(340);
      if (typeof sound !== "undefined" && typeof sound.playTableReactionSfx === "function") {
        sound.playTableReactionSfx("clash");
      }
      spawnFx(speaker.id, "真假" + rTitle + "對跳!", "#fbbf24");
      spawnBurst(speaker.id, ["#fbbf24", "#f43f5e", "#ffffff"], 22, "slash");
      if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 440, 0.34);
      if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
        if (typeof stage3d.triggerCameraPunch === "function") stage3d.triggerCameraPunch(speaker.id, { fov: 39, durationMs: 1300 });
        if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("speak_gesture", 2500);
      }
      const rivalClaimant = sameClaimants.find(function (c) { return c.id !== speaker.id; });
      if (rivalClaimant) {
        spawnBeam(speaker.id, rivalClaimant.id, "#fbbf24", "clash", 760);
      }
    } else if (generated.claimSeer || generated.claimRole) {
      spawnFx(speaker.id, "亮出" + rTitle + "身分!", "#fde68a");
      spawnBurst(speaker.id, ["#fde68a", "#fbbf24", "#ffffff"], 14, "ring");
    }
  }

  const badgeTitle = fmtSeatNum(speaker.id) + "號 · " + speaker.name;
  const subTag = (state.match.microPulseRevealed || speaker.sweatExposed)
    ? ("心虛 " + speaker.microPulse + "%")
    : speaker.trait;

  addLog({
    kind: "speech",
    useTypewriter: true,
    speakerId: speaker.id,
    title: badgeTitle,
    subBadge: subTag,
    text: generated.text
  });

  // Launch a subtle visual stance beam on Canvas when an AI targets or vouches for someone!
  if (generated.targetId && generated.targetId !== speaker.id) {
    spawnBeam(speaker.id, generated.targetId, generated.relationType === "trust" ? "#34d399" : "#fb7185", generated.relationType === "trust" ? "trust" : "grill", 780);
  }

  // Non-interrupting Turn-Watch Alert (Respects strict turn order: note it now, rebut when it's YOUR turn!)
  const playerSeat = getPlayerSeat();
  const pid = getPlayerId();
  state.activeClash = null;
  if (!state.match.todayEvents) state.match.todayEvents = { accusedYouId: null, fakeSeerId: null, toxicSlipId: null };
  const putPlayerInWolfPit = Boolean(generated.accuseId === pid || (Array.isArray(generated.wolfPits) && generated.wolfPits.indexOf(pid) !== -1));
  if (playerSeat && playerSeat.alive) {
    if (generated.claimSeer && playerSeat.role === "seer") {
      state.match.todayEvents.fakeSeerId = speaker.id;
      state.activeClash = { speakerId: speaker.id, kind: "fake_seer", resolved: false };
      triggerShake(260);
      spawnFx(speaker.id, "⚠ 冒充觀察員!", "#fbbf24");
      triggerCutIn("🔮 有人冒充明心觀察員！", fmtSeatNum(speaker.id) + "號 " + speaker.name + " 搶跳觀察員・輪到你的順位再拆穿！", "gold");
      if (typeof orchestrator !== "undefined") orchestrator.emit("clash:detected", { kind: "fake_seer", speakerId: speaker.id });
    } else if (putPlayerInWolfPit) {
      state.match.todayEvents.accusedYouId = speaker.id;
      const inPitOnly = generated.accuseId !== pid;
      state.activeClash = { speakerId: speaker.id, kind: "accuse_you", inWolfPit: true, resolved: false };
      triggerShake(220);
      spawnFx(speaker.id, inPitOnly ? "把你點進狼坑!" : "點名懷疑你!", "#fb7185");
      if (typeof orchestrator !== "undefined") orchestrator.emit("clash:detected", { kind: "accuse_you", speakerId: speaker.id });
    } else if (generated.hasToxicSlip) {
      state.match.todayEvents.toxicSlipId = speaker.id;
      state.activeClash = { speakerId: speaker.id, kind: "toxic_slip", contradiction: contra || null, resolved: false };
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) - 7, 0, 100);
      spawnFx(speaker.id, "🌫 酸言霧霾 -7!", "#fb7185");
      if (typeof orchestrator !== "undefined") {
        orchestrator.emit("clash:detected", { kind: "toxic_slip", speakerId: speaker.id });
        orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
      }
    } else if (contra) {
      state.activeClash = { speakerId: speaker.id, kind: "contradiction", contradiction: contra, resolved: false };
      if (contra.severity >= 2) {
        spawnFx(speaker.id, "⚡ " + contra.label, "#fbbf24");
      }
      if (typeof orchestrator !== "undefined") {
        orchestrator.emit("clash:detected", { kind: "contradiction", speakerId: speaker.id, code: contra.code });
      }
    }
  }

  const isHighStress = Boolean(speaker.microPulse >= 76 && (state.match.microPulseRevealed || speaker.sweatExposed));
  const moodTag = (generated.claimSeer || generated.claimRole === "seer")
    ? "claim_seer"
    : (generated.hasToxicSlip || generated.accuseId
      ? (isHighStress ? "panic" : (generated.emotion === "defensive" ? "rebut" : "accuse"))
      : (generated.relationType === "trust"
        ? ((speaker.name === "星兒" || speaker.name === "晨晨" || speaker.name === "柚子") ? "happy" : "trust")
        : "normal"));
  updateAllUI();
  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("speech:committed", { speakerId: speaker.id, accuseId: generated.accuseId || null, isToxic: Boolean(generated.hasToxicSlip) });
  }
  startSpotlightTypewriter({
    speaker: speaker,
    badge: badgeTitle,
    trait: subTag,
    rawText: generated.text,
    voiceMood: moodTag,
    speechEv: aiEvObj,
    charDelay: 34,
    holdMs: 2400
  });

  // Prefetch next AI speaker's LLM + TTS in parallel while this character is speaking (zero-wait conversational flow!)
  prefetchNextAiSpeech();

  // Prefetch next predictable host prompt so transitions feel zero-latency!
  if (typeof voice !== "undefined" && typeof voice.prefetchFreeLocalNeural === "function") {
    const q = state.match.speechQueue || [];
    if (q.length === 0) {
      voice.prefetchFreeLocalNeural("主持", "全員發言結束，請點擊外圍座位投票抓狼。", "normal");
    } else if (q[0] === getPlayerId()) {
      voice.prefetchFreeLocalNeural("主持", "輪到" + getPlayerId() + "號你發言了，請選擇卡牌表態。", "normal");
    }
  }
}
