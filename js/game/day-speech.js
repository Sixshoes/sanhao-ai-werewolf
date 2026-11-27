/**
 * 白天輪流發言（嚴守凹嗚順位）與 AI 回合發言執行
 */
"use strict";

// ==================== v16.0 MATCH POINT (茶涼聽牌) & SPEECH CHAR LIMIT ====================
function evaluateMatchPointState() {
  const m = state.match;
  if (!m || !m.started || m.phase === "GAME_OVER" || m.phase === "LOBBY") {
    if (m) m.isMatchPoint = false;
    if (typeof document !== "undefined" && document.body && document.body.classList) {
      document.body.classList.remove("is-match-point");
    }
    return false;
  }
  const allSeats = m.seats || [];
  const alive = getAliveSeats();
  const aliveWolves = alive.filter(function (s) { return s.team === "wolf"; }).length;
  const aliveGoods = alive.filter(function (s) { return s.team === "good"; }).length;
  const hadGods = allSeats.some(function (s) { return typeof isGodRole === "function" ? isGodRole(s.role) : (s.role === "seer" || s.role === "witch" || s.role === "hunter" || s.role === "guard"); });
  const hadVillagers = allSeats.some(function (s) { return s.role === "villager"; });
  const aliveGods = alive.filter(function (s) { return typeof isGodRole === "function" ? isGodRole(s.role) : (s.role === "seer" || s.role === "witch" || s.role === "hunter" || s.role === "guard"); }).length;
  const aliveVillagers = alive.filter(function (s) { return s.role === "villager"; }).length;

  const oneKillAway = Boolean(
    aliveWolves >= 1 && (
      (hadGods && aliveGods <= 1) ||
      (hadVillagers && aliveVillagers <= 1) ||
      (aliveWolves >= aliveGoods - 1)
    )
  );
  const active = Boolean(alive.length > 0 && (alive.length <= 5 || oneKillAway));
  const wasActive = Boolean(m.isMatchPoint);
  m.isMatchPoint = active;

  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.toggle("is-match-point", active);
  }
  const mpBadge = el("matchPointBadge");
  if (mpBadge) {
    mpBadge.classList.toggle("hidden", !active);
    if (active) {
      mpBadge.textContent = "聽牌";
      mpBadge.title = m.variantMode === "blitz_3m" ? "茶涼聽牌・閃電快棋 22 字上限" : "茶涼聽牌・決勝深度盤坑";
    }
  }
  if (typeof refreshSpeechCharCounter === "function") refreshSpeechCharCounter();
  if (active && !wasActive) {
    const isBlitzMp = m.variantMode === "blitz_3m";
    addLog({
      kind: "dawn",
      title: isBlitzMp
        ? "茶涼聽牌（閃電決勝）：局勢已逼近臨界，全場維持 22 字內短兵相接。"
        : "茶涼聽牌（決勝盤坑）：局勢已逼近臨界，全場進入深度複盤與關鍵歸票。",
      text: ""
    });
    if (typeof triggerCutIn === "function") {
      triggerCutIn(
        isBlitzMp ? "茶涼聽牌・閃電決勝" : "茶涼聽牌・決勝歸票",
        isBlitzMp ? "勝敗僅在一念之間，22 字內一針見血決出勝負" : "勝敗僅在一念之間，全場全面展開深度盤坑與關鍵拉票",
        "crimson",
        1800
      );
    }
    if (typeof sound !== "undefined" && typeof sound.syncAtmosphere === "function") {
      sound.syncAtmosphere();
    }
  }
  return active;
}

function getActiveSpeechCharLimit(matchObj) {
  const m = matchObj || (typeof state !== "undefined" ? state.match : null);
  if (!m) return 0;
  if (m.variantMode === "blitz_3m") return 22;
  return 0;
}

function clampSpeechToCharLimit(rawText, limit) {
  const txt = String(rawText || "").trim();
  const cap = Number(limit) || 0;
  if (!txt || cap <= 0 || txt.length <= cap) return txt;
  const slice = txt.slice(0, cap);
  // Prefer breaking cleanly on natural punctuation if near the end
  let cutIdx = -1;
  for (let i = slice.length - 1; i >= Math.floor(cap * 0.62); i--) {
    if ("。！？；，".indexOf(slice[i]) !== -1) {
      cutIdx = i + 1;
      break;
    }
  }
  let out = cutIdx > 0 ? slice.slice(0, cutIdx) : slice.slice(0, Math.max(1, cap - 1));
  out = out.replace(/[，、；：]+$/, "");
  if (out.length < cap && !/[。！？…]$/.test(out)) {
    out += "。";
  }
  return out.slice(0, cap);
}

function prewarmSheriffOrderOpeningSpeakers(sheriffId) {
  const m = (typeof state !== "undefined") ? state.match : null;
  if (!m || !m.started || m.phase !== "SHERIFF_ORDER") return false;
  if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return false;
  const extLlmOn = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel);
  const wantNetTts = Boolean(
    typeof voice !== "undefined" &&
    voice.canSpeak() &&
    ((typeof voice.isGeminiTtsPreferred === "function" && voice.isGeminiTtsPreferred()) || voice.localNeuralAvailable)
  );
  if (!extLlmOn && !wantNetTts) return false;

  if (typeof orchestrator !== "undefined") {
    if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) {
      m.activeDirectorEvent = null;
    } else if (typeof orchestrator.rollDailyTeaEvent === "function") {
      orchestrator.rollDailyTeaEvent(m.day);
    }
  }

  const total = m.totalSeats || (m.seats ? m.seats.length : 8);
  const shSeat = getSeat(sheriffId);
  if (!shSeat || !shSeat.alive) return false;
  const pid = getPlayerId();
  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;

  const findFirstAlive = function (dir) {
    const anchorNum = ((shSeat.id - 1 + dir + total) % total) + 1;
    for (let step = 0; step < total; step++) {
      const seatNum = ((anchorNum - 1 + step * dir + total * 4) % total) + 1;
      const s = getSeat(seatNum);
      if (s && s.alive) return s;
    }
    return null;
  };

  const candSeats = [];
  [findFirstAlive(1), findFirstAlive(-1)].forEach(function (cs) {
    if (cs && cs.id !== pid && candSeats.every(function (x) { return x.id !== cs.id; })) {
      candSeats.push(cs);
    }
  });
  if (!candSeats.length) return false;

  m._prefetchedOrderSpeeches = {};
  m._prefetchedOrderSpeechesEpoch = ep;
  candSeats.forEach(function (nextSeat) {
    const key = _buildSpeechPrefetchKey(nextSeat.id);
    const fallbackMeta = _buildDryRunHeuristicSpeech(nextSeat);
    const entry = {
      key: key,
      epoch: ep,
      seatId: nextSeat.id,
      resolvedMeta: null,
      promise: null
    };
    m._prefetchedOrderSpeeches[nextSeat.id] = entry;

    if (!extLlmOn) {
      entry.resolvedMeta = fallbackMeta;
      if (fallbackMeta && fallbackMeta.text && wantNetTts && typeof voice.prefetchBestTts === "function") {
        voice.prefetchBestTts(nextSeat.name, fallbackMeta.text, _computeSpeechVoiceMood(nextSeat, fallbackMeta));
      }
      return;
    }

    const runDispatch = (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function")
      ? orchestrator.dispatchAgent("PersonaAgent", { speaker: nextSeat, fallbackMeta: fallbackMeta, deferSeatMutation: true }).then(function (dispatched) {
        if (!dispatched || !dispatched.epochValid || !orchestrator.isEpochValid(ep)) return null;
        return dispatched.generated || fallbackMeta;
      })
      : tryGenerateGeminiAiSpeech(nextSeat, fallbackMeta).then(function (liveRes) {
        const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
        if (liveTxt) {
          if (typeof syncGeminiSpeechMeta === "function") syncGeminiSpeechMeta(nextSeat, fallbackMeta, liveRes, { deferSeatMutation: true });
          else fallbackMeta.text = liveTxt;
          fallbackMeta.text = (typeof normalizeGeminiSpeechText === "function")
            ? normalizeGeminiSpeechText(fallbackMeta.text)
            : String(fallbackMeta.text || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").trim();
        }
        return fallbackMeta;
      });

    entry.promise = runDispatch.then(function (resMeta) {
      if (resMeta && m._prefetchedOrderSpeeches && m._prefetchedOrderSpeeches[nextSeat.id] === entry) {
        entry.resolvedMeta = resMeta;
        if (resMeta.text && wantNetTts && typeof voice.prefetchBestTts === "function") {
          voice.prefetchBestTts(nextSeat.name, resMeta.text, _computeSpeechVoiceMood(nextSeat, resMeta));
        }
      }
      return resMeta;
    }).catch(function () {
      if (m._prefetchedOrderSpeeches && m._prefetchedOrderSpeeches[nextSeat.id] === entry) {
        delete m._prefetchedOrderSpeeches[nextSeat.id];
      }
      return null;
    });
  });
  return true;
}

// ==================== DAY SPEECH (STRICT 凹嗚狼人殺 TURN ORDER) ====================
function startDayDiscussion(dawnVoiceLine, opts) {
  clearStepTimer();
  evaluateMatchPointState();
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
  state.match.tableReactions = [];
  state.match.publicInterjections = [];
  state.match.candlelitReview = null;
  state.match.pkCandidates = null;
  state.match.pkUsedToday = false;
  state.activeSpeakerId = null;
  state.activeClash = null;
  state.interjectOpen = false;
  const epPreOrder = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const preOrderMap = (state.match._prefetchedOrderSpeechesEpoch === epPreOrder && state.match._prefetchedOrderSpeeches)
    ? state.match._prefetchedOrderSpeeches
    : null;
  state.match._prefetchedOrderSpeeches = null;
  state.match._prefetchedSpeech = null;
  if (typeof orchestrator !== "undefined") {
    if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) {
      state.match.activeDirectorEvent = null;
    } else {
      orchestrator.rollDailyTeaEvent(state.match.day);
    }
    orchestrator.emit("phase:changed", { phase: "DAY_SPEECH", day: state.match.day });
  }
  if (preOrderMap && ordered.length > 0 && typeof _buildSpeechPrefetchKey === "function") {
    const firstPreOrder = preOrderMap[ordered[0]];
    if (firstPreOrder && firstPreOrder.epoch === epPreOrder && firstPreOrder.key === _buildSpeechPrefetchKey(ordered[0])) {
      state.match._prefetchedSpeech = firstPreOrder;
    }
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
    updateSpotlightBox("主持播報 · 天亮結果", "第 " + state.match.day + " 天", dawnVoiceLine);
    let kickedOff = false;
    const epDawn = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
    const goFirstSpeaker = function () {
      if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epDawn)) return;
      if (kickedOff || !state.match || state.match.phase !== "DAY_SPEECH") return;
      kickedOff = true;
      if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
      if (state.stepTimer) {
        clearTimeout(state.stepTimer);
        state.stepTimer = null;
      }
      state.stepTimer = setTimeout(advanceSpeechQueue, 320);
    };
    voice.speakHost(dawnVoiceLine, goFirstSpeaker, "host_dawn");
    state.stepTimer = setTimeout(goFirstSpeaker, 22000);
  } else {
    state.stepTimer = setTimeout(advanceSpeechQueue, ff ? 180 : 750);
  }
}

function advanceSpeechQueue() {
  clearStepTimer();
  if (typeof commitPendingSpeechLog === "function") commitPendingSpeechLog();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
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
  state.interjectOpen = false;
  if (el("interjectPopover")) el("interjectPopover").classList.add("hidden");
  if (typeof closeSeatIntel === "function") closeSeatIntel();
  if (typeof stage3d !== "undefined") {
    if (typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
    if (stage3d.orbit) stage3d.orbit.userOverrideUntil = 0;
  }

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
          pinClue(shSeat.id, "清風圈出 " + fmtSeatNum(shSeat.id) + "號", "剛剛三好清風幫我注意到 " + fmtSeatNum(shSeat.id) + "號" + shSeat.name + " 的語氣與立場有矛盾，建議大家重點檢視 " + fmtSeatNum(shSeat.id) + "號！", "clash");
          spawnFx(shSeat.id, "清風照破", "#34d399");
          showToast("三好清風吹拂（友善度 ≥ 85）：已自動圈出 " + fmtSeatNum(shSeat.id) + "號的發言破綻到你的筆記！", "emerald");
        }
      }
    }
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    voice.speakHost("輪到" + getPlayerId() + "號你發言了，可點選詞卡組裝陳詞後送出。", undefined, "normal");
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

function bumpTableStateRev(rePrefetch) {
  if (typeof state === "undefined" || !state.match) return;
  state.match.tableStateRev = (state.match.tableStateRev || 0) + 1;
  state.match._prefetchedSpeech = null;
  if (rePrefetch && state.match.phase === "DAY_SPEECH" && typeof prefetchNextAiSpeech === "function") {
    prefetchNextAiSpeech();
  }
}

// ==================== v15.0 ONCE-PER-DAY TEA-CUP INTERJECTION (舉杯當場追問) ====================
function canUseTeaInterjectNow() {
  if (!state.match || !state.match.started || state.match.phase !== "DAY_SPEECH") return false;
  const p = getPlayerSeat();
  const sp = getSeat(state.activeSpeakerId);
  if (!p || !p.alive || !sp || !sp.alive || sp.id === p.id) return false;
  if (state.match.interjectUsedDay !== state.match.day) return true;
  return (state.match.interjectBonusCharges || 0) > 0;
}

function buildTeaInterjectQuickPrompts(targetSeat) {
  const m = state.match || {};
  const evs = Array.isArray(m.daySpeechEvents) ? m.daySpeechEvents : [];
  const latestSpEv = targetSeat
    ? evs.slice().reverse().find(function (ev) { return ev && ev.speakerId === targetSeat.id; })
    : null;
  const prompts = [];
  if (latestSpEv && latestSpEv.vouchId) {
    prompts.push("你剛才為何急著替 " + fmtSeatNum(latestSpEv.vouchId) + "號 緩頰？");
  } else {
    prompts.push("你這輪保人的依據是什麼？");
  }
  if (latestSpEv && latestSpEv.accuseId) {
    prompts.push("踩 " + fmtSeatNum(latestSpEv.accuseId) + "號 的實證在哪裡？");
  } else {
    prompts.push("前後態度怎麼不太一樣？");
  }
  prompts.push("請再說清楚你的排坑理由？");
  return prompts.slice(0, 3);
}

function openTeaInterjectPopover() {
  if (!canUseTeaInterjectNow()) {
    showToast("今日舉杯追問已用完，待明日茶席再啟。", "warn");
    return false;
  }
  const sp = getSeat(state.activeSpeakerId);
  const pop = el("interjectPopover");
  const list = el("interjectQuickPrompts");
  const titleEl = el("interjectTargetTitle");
  if (!sp || !pop || !list) return false;
  state.interjectOpen = true;
  if (state.stepTimer) {
    clearTimeout(state.stepTimer);
    state.stepTimer = null;
  }
  if (titleEl) {
    titleEl.textContent = "舉杯追問 · " + fmtSeatNum(sp.id) + "號 " + sp.name + "（每日限 1 次）";
  }
  const prompts = buildTeaInterjectQuickPrompts(sp);
  list.innerHTML = "";
  prompts.forEach(function (qText) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "interject-chip-btn";
    btn.textContent = qText;
    btn.addEventListener("click", function () {
      executeTeaInterjection(qText);
    });
    list.appendChild(btn);
  });
  if (el("interjectCustomInput")) el("interjectCustomInput").value = "";
  pop.classList.remove("hidden");
  return true;
}

function closeTeaInterjectPopover(resumeAuto) {
  state.interjectOpen = false;
  if (el("interjectPopover")) el("interjectPopover").classList.add("hidden");
  if (resumeAuto && typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
    maybeScheduleAutoAdvanceAfterSpeech();
  }
}

function buildBlindInterjectionReply(targetSeat, questionText) {
  // Strictly Blind-View Safe: reads ONLY snap.self & public observable state!
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(targetSeat, { module: "tea_interject", phase: "DAY_SPEECH" })
    : null;
  const self = (snap && snap.self) ? snap.self : targetSeat;
  const q = String(questionText || "").trim();
  const reg = typeof getPersonaRegister === "function" ? getPersonaRegister(self) : "balanced";
  const isWolfSelf = Boolean(self && self.team === "wolf");
  const isVouchQ = /保|緩頰|站邊|替/.test(q);
  const isFlipQ = /前後|態度|棄票|改票|矛盾/.test(q);
  let reply = "";

  if (isWolfSelf) {
    if (reg === "classical") {
      reply = isFlipQ ? "局勢隨發言而變，哪算前後矛盾。" : "我只是照檯面線索判斷，別急著扣帽子。";
    } else if (reg === "guzheng") {
      reply = isVouchQ ? "晴嵐只是聽他語氣較穩，沒別的意思呀。" : "我只是想穩妥一點，怎麼反倒先問起我了？";
    } else if (reg === "poetic") {
      reply = isVouchQ ? "我只是覺得他聊得順耳，沒刻意偏袒誰。" : "茶都還沒涼呢，急著逼問我可問不出狼。";
    } else {
      reply = isFlipQ ? "盤面剛變了嘛，我照新線索調整很正常啊。" : "欸別這麼急著盯我啦，我只是講我看到的而已。";
    }
  } else {
    if (reg === "classical") {
      reply = isVouchQ ? "他陳詞前後貫通，我自然先列好人席。" : "我句句對照公開票型，經得起檢驗。";
    } else if (reg === "guzheng") {
      reply = isVouchQ ? "他剛才語氣清正誠懇，晴嵐才先保一手。" : "我的疑問都來自剛才發言，絕無私心。";
    } else if (reg === "poetic") {
      reply = isFlipQ ? "聽其言觀其行，新線索出來自然該修正。" : "我心裡坦蕩，這輪看票型自然見真章。";
    } else {
      reply = isVouchQ ? "他剛剛邏輯滿順的我才先保，後面有錯我會改票。" : "我全程照前面發言在盤，沒什麼好心虛的。";
    }
  }

  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("tea_interject", self.id, "舉杯追問即時回防完成");
  }
  return {
    text: reply.slice(0, 24),
    tense: Boolean(isWolfSelf && (self.microPulse || 60) >= 72)
  };
}

function executeTeaInterjection(questionText) {
  if (!canUseTeaInterjectNow()) return null;
  const sp = getSeat(state.activeSpeakerId);
  const pid = getPlayerId();
  if (!sp || !sp.alive || sp.id === pid) return null;
  const cleanQ = String(questionText || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").trim().slice(0, 18);
  if (!cleanQ) return null;

  if (state.match.interjectUsedDay === state.match.day && (state.match.interjectBonusCharges || 0) > 0) {
    state.match.interjectBonusCharges -= 1;
  } else {
    state.match.interjectUsedDay = state.match.day;
  }
  state.interjectOpen = false;
  if (el("interjectPopover")) el("interjectPopover").classList.add("hidden");

  const replyObj = buildBlindInterjectionReply(sp, cleanQ);
  if (!Array.isArray(state.match.publicInterjections)) state.match.publicInterjections = [];
  const entry = {
    day: state.match.day,
    targetId: sp.id,
    targetName: sp.name,
    question: cleanQ,
    reply: replyObj.text,
    ts: Date.now()
  };
  state.match.publicInterjections.push(entry);

  if (replyObj.tense) {
    sp.sweatExposed = true;
    setSeatEmotion(sp.id, "nervous", 3600);
  } else {
    setSeatEmotion(sp.id, "shock", 2600);
  }
  state.lastInterjectAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  setSeatBubble(sp.id, replyObj.text, replyObj.tense ? "wolf" : "suspect", 4200);
  spawnBeam(pid, sp.id, "#d4af37", "grill", 540);
  spawnFx(sp.id, "當場回防", "#fbbf24");
  nudgeSeat(sp.id, { scale: 1.06, vy: 3, vTilt: -0.08 });
  const spNodeInt = (state.seatCoords || []).find(function (c) { return c.id === sp.id; });
  if (spNodeInt && spNodeInt.visibleInView !== false && typeof spawnRipple === "function") {
    spawnRipple(spNodeInt.x, spNodeInt.y, "#d4a657", 58);
  }
  if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && stage3d.fx && stage3d.seats && stage3d.seats.anchors && stage3d.seats.anchors[sp.id] && typeof spawn3DShockwave === "function") {
    const tPos = stage3d.seats.anchors[sp.id].teaPos || stage3d.seats.anchors[sp.id].worldPos;
    spawn3DShockwave(stage3d.fx, tPos, "#d4a657", performance.now(), 1.22, 2.5);
  }
  if (typeof sound !== "undefined") {
    if (typeof sound.duckBgmBrief === "function") sound.duckBgmBrief(350);
    if (typeof sound.tone === "function") {
      sound.tone(1180, 0.055, "sine", 0.045, 0);
      sound.tone(740, 0.07, "sine", 0.05, 0.03);
      sound.tone(520, 0.09, "triangle", 0.04, 0.09);
    }
  }
  const ffInt = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const wantLiveInt = Boolean(
    !ffInt &&
    typeof isExternalLlmActive === "function" && isExternalLlmActive() &&
    typeof tryGenerateGeminiInterjectionReply === "function"
  );
  if (typeof renderTargetReactionCard === "function") {
    renderTargetReactionCard(null, null, {
      seat: sp,
      kind: "accuse",
      badge: sp.name + (wantLiveInt ? " · 臨場回應中" : " · 臨場回防"),
      quote: wantLiveInt ? "微微一頓，正準備回應你的追問…" : ("「" + replyObj.text + "」")
    });
  }
  if (typeof addThreeGoodPoint === "function") addThreeGoodPoint("heart", "舉杯追問求真");
  addLog({
    kind: "system",
    title: "舉杯追問 · " + fmtSeatNum(sp.id) + "號 " + sp.name,
    text: "你問：「" + cleanQ + "」｜" + fmtSeatNum(sp.id) + "號回防：「" + replyObj.text + "」"
  });
  const intLogRef = state.match.logs[state.match.logs.length - 1] || null;
  if (!wantLiveInt) {
    showToast(fmtSeatNum(sp.id) + "號 " + sp.name + " 即時回防：「" + replyObj.text + "」", "gold");
  }

  // CRITICAL GUARDRAIL: immediately invalidate & refresh upcoming AI background prefetch cache!
  bumpTableStateRev(true);
  updateAllUI();
  if (wantLiveInt) {
    const epInt = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
    tryGenerateGeminiInterjectionReply(sp, cleanQ, replyObj)
      .then(function (liveReply) {
        if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epInt)) return;
        if (!state.match || state.match.phase !== "DAY_SPEECH") return;
        const finalIntText = liveReply || replyObj.text;
        entry.reply = finalIntText;
        if (intLogRef) {
          intLogRef.text = "你問：「" + cleanQ + "」｜" + fmtSeatNum(sp.id) + "號回防：「" + finalIntText + "」";
          if (typeof renderTimeline === "function") renderTimeline({ deferIfHidden: true });
        }
        setSeatBubble(sp.id, finalIntText, replyObj.tense ? "wolf" : "suspect", 4600);
        if (typeof renderTargetReactionCard === "function") {
          renderTargetReactionCard(null, null, {
            seat: sp,
            kind: "accuse",
            badge: sp.name + " · 臨場回防",
            quote: "「" + finalIntText + "」"
          });
        }
        showToast(fmtSeatNum(sp.id) + "號 " + sp.name + " 即時回防：「" + finalIntText + "」", "gold");
        if (liveReply && typeof bumpTableStateRev === "function") bumpTableStateRev(true);
        if (typeof voice !== "undefined" && voice.canSpeak() && state.activeSpeakerId === sp.id) {
          if (typeof commitPendingSpeechLog === "function") commitPendingSpeechLog(sp.id);
          voice.speakCharacter(sp, finalIntText, replyObj.tense ? "panic" : "rebut", function () {
            if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epInt)) return;
            if (!state.match || state.match.phase !== "DAY_SPEECH") return;
            if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") maybeScheduleAutoAdvanceAfterSpeech();
          });
        } else if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
          maybeScheduleAutoAdvanceAfterSpeech();
        }
      })
      .catch(function () {
        if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epInt)) return;
        if (!state.match || state.match.phase !== "DAY_SPEECH") return;
        if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") maybeScheduleAutoAdvanceAfterSpeech();
      });
  } else if (!ffInt && typeof voice !== "undefined" && voice.canSpeak() && state.activeSpeakerId === sp.id) {
    if (typeof commitPendingSpeechLog === "function") commitPendingSpeechLog(sp.id);
    const epIntLocal = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
    voice.speakCharacter(sp, replyObj.text, replyObj.tense ? "panic" : "rebut", function () {
      if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epIntLocal)) return;
      if (!state.match || state.match.phase !== "DAY_SPEECH") return;
      if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") maybeScheduleAutoAdvanceAfterSpeech();
    });
  } else if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
    maybeScheduleAutoAdvanceAfterSpeech();
  }
  return entry;
}

function _computeSpeechVoiceMood(speaker, generated) {
  if (!speaker || !generated) return "normal";
  const isHighStress = Boolean(speaker.microPulse >= 76 && (state.match && (state.match.microPulseRevealed || speaker.sweatExposed)));
  return (generated.claimSeer || generated.claimRole === "seer")
    ? "claim_seer"
    : (generated.hasToxicSlip || generated.accuseId
      ? (isHighStress ? "panic" : (generated.emotion === "defensive" ? "rebut" : "accuse"))
      : (generated.relationType === "trust"
        ? ((speaker.name === "星兒" || speaker.name === "晨晨" || speaker.name === "柚子") ? "happy" : "trust")
        : "normal"));
}

function _buildSpeechPrefetchKey(seatId) {
  const m = state.match || {};
  const evLen = Array.isArray(m.daySpeechEvents) ? m.daySpeechEvents.length : 0;
  const pkTag = (typeof isPkVoteActive === "function" && isPkVoteActive()) ? "pk" : "reg";
  const rev = m.tableStateRev || 0;
  const llmTag = typeof getActiveLlmLabel === "function" ? getActiveLlmLabel() : "";
  return (m.day || 0) + ":" + seatId + ":" + evLen + ":" + pkTag + ":r" + rev + ":" + llmTag;
}

function isPrefetchedAiSpeechReady(seatId) {
  const pf = state.match && state.match._prefetchedSpeech;
  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  return Boolean(pf && pf.epoch === ep && pf.seatId === seatId && pf.key === _buildSpeechPrefetchKey(seatId) && pf.resolvedMeta);
}

function _buildDryRunHeuristicSpeech(seat) {
  const m = state.match || {};
  const prevBf = m.sheriffBadgeFlow;
  const prevBfBySeat = m.sheriffBadgeFlowsBySeat ? Object.assign({}, m.sheriffBadgeFlowsBySeat) : null;
  const drySeat = Object.assign({}, seat, {
    fakeCheckedIds: Array.isArray(seat.fakeCheckedIds) ? seat.fakeCheckedIds.slice() : [],
    suspicionMap: Object.assign({}, seat.suspicionMap || {})
  });
  const res = buildHeuristicAiSpeech(drySeat);
  const newBf = (m.sheriffBadgeFlowsBySeat && m.sheriffBadgeFlowsBySeat[seat.id]) || null;
  const oldBf = prevBfBySeat ? prevBfBySeat[seat.id] : null;
  // Restore live match Badge Flow state so prefetch NEVER mutates table UI prematurely!
  m.sheriffBadgeFlow = prevBf;
  if (prevBfBySeat) m.sheriffBadgeFlowsBySeat = prevBfBySeat;
  const patch = {
    claimedRole: drySeat.claimedRole !== seat.claimedRole ? drySeat.claimedRole : undefined,
    witchAnnouncedSave: drySeat.witchAnnouncedSave && !seat.witchAnnouncedSave,
    hunterAnnounced: drySeat.hunterAnnounced && !seat.hunterAnnounced,
    guardAnnounced: drySeat.guardAnnounced && !seat.guardAnnounced,
    elderAnnounced: drySeat.elderAnnounced && !seat.elderAnnounced,
    fakeSeer: drySeat.fakeSeer && !seat.fakeSeer,
    fakeCheckedIdsAdded: drySeat.fakeCheckedIds.filter(function (id) {
      return !Array.isArray(seat.fakeCheckedIds) || seat.fakeCheckedIds.indexOf(id) === -1;
    }),
    deferredBadgeFlow: (newBf && newBf !== oldBf) ? newBf : null
  };
  if (res) res._deferredSeatPatch = patch;
  return res;
}

function _commitDeferredSeatPatch(speaker, generated) {
  if (!speaker || !generated) return;
  const patch = generated._deferredSeatPatch;
  if (patch) {
    if (patch.witchAnnouncedSave) speaker.witchAnnouncedSave = true;
    if (patch.hunterAnnounced) speaker.hunterAnnounced = true;
    if (patch.guardAnnounced) speaker.guardAnnounced = true;
    if (patch.elderAnnounced) speaker.elderAnnounced = true;
    if (patch.fakeSeer) speaker.fakeSeer = true;
    if (Array.isArray(patch.fakeCheckedIdsAdded) && patch.fakeCheckedIdsAdded.length) {
      if (!Array.isArray(speaker.fakeCheckedIds)) speaker.fakeCheckedIds = [];
      patch.fakeCheckedIdsAdded.forEach(function (id) {
        if (speaker.fakeCheckedIds.indexOf(id) === -1) speaker.fakeCheckedIds.push(id);
      });
    }
    if (patch.deferredBadgeFlow && typeof setSheriffBadgeFlow === "function") {
      setSheriffBadgeFlow(speaker.id, patch.deferredBadgeFlow.firstTargetId, patch.deferredBadgeFlow.secondTargetId, "speech");
    }
    delete generated._deferredSeatPatch;
  }
}

function prefetchNextAiSpeech() {
  const m = state.match;
  if (!m || !m.started) return false;
  if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return false;
  const extLlmOn = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel);
  const wantNetTts = Boolean(
    typeof voice !== "undefined" &&
    voice.canSpeak() &&
    ((typeof voice.isGeminiTtsPreferred === "function" && voice.isGeminiTtsPreferred()) || voice.localNeuralAvailable)
  );
  if (!extLlmOn && !wantNetTts) return false;
  const q = m.speechQueue || [];
  if (!q.length) return false;
  const nextId = q[0];
  if (nextId === getPlayerId()) {
    if (typeof voice !== "undefined" && typeof voice.prefetchBestTts === "function") {
      voice.prefetchBestTts("主持", "輪到" + nextId + "號你發言了，可點選詞卡組裝陳詞後送出。", "normal");
    }
    return false;
  }
  const nextSeat = getSeat(nextId);
  if (!nextSeat || !nextSeat.alive) return false;

  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const key = _buildSpeechPrefetchKey(nextId);
  const existing = m._prefetchedSpeech;
  if (existing && existing.epoch === ep && existing.key === key) return true;

  // Dry-run heuristic so nextSeat.claimedRole / announced flags / badge flow are NEVER leaked before their turn!
  const fallbackMeta = _buildDryRunHeuristicSpeech(nextSeat);
  const entry = {
    key: key,
    epoch: ep,
    seatId: nextId,
    resolvedMeta: null,
    promise: null
  };
  m._prefetchedSpeech = entry;

  if (!extLlmOn) {
    entry.resolvedMeta = fallbackMeta;
    if (fallbackMeta && fallbackMeta.text && typeof voice !== "undefined" && voice.canSpeak()) {
      const nextMoodLocal = _computeSpeechVoiceMood(nextSeat, fallbackMeta);
      if (typeof voice.prefetchBestTts === "function") {
        voice.prefetchBestTts(nextSeat.name, fallbackMeta.text, nextMoodLocal);
      }
    }
    return true;
  }

  const runDispatch = (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function")
    ? orchestrator.dispatchAgent("PersonaAgent", { speaker: nextSeat, fallbackMeta: fallbackMeta, deferSeatMutation: true }).then(function (dispatched) {
      if (!dispatched || !dispatched.epochValid || !orchestrator.isEpochValid(ep)) return null;
      return dispatched.generated || fallbackMeta;
    })
    : tryGenerateGeminiAiSpeech(nextSeat, fallbackMeta).then(function (liveRes) {
      const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
      if (liveTxt) {
        if (typeof syncGeminiSpeechMeta === "function") syncGeminiSpeechMeta(nextSeat, fallbackMeta, liveRes, { deferSeatMutation: true });
        else fallbackMeta.text = liveTxt;
        fallbackMeta.text = (typeof normalizeGeminiSpeechText === "function")
          ? normalizeGeminiSpeechText(fallbackMeta.text)
          : String(fallbackMeta.text || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").trim();
      }
      return fallbackMeta;
    });

  entry.promise = runDispatch.then(function (resMeta) {
    if (resMeta && m._prefetchedSpeech === entry) {
      entry.resolvedMeta = resMeta;
      if (resMeta.text && typeof voice !== "undefined" && voice.canSpeak()) {
        const nextMood = _computeSpeechVoiceMood(nextSeat, resMeta);
        if (typeof voice.prefetchBestTts === "function") {
          voice.prefetchBestTts(nextSeat.name, resMeta.text, nextMood);
        } else if (voice.localNeuralAvailable && typeof voice.prefetchFreeLocalNeural === "function") {
          voice.prefetchFreeLocalNeural(nextSeat.name, resMeta.text, nextMood);
        } else if (typeof voice.prefetchCloudGeminiTts === "function") {
          voice.prefetchCloudGeminiTts(nextSeat.name, resMeta.text, nextMood);
        }
      }
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
  if (typeof maybeTriggerAiWolfSelfExplode === "function" && maybeTriggerAiWolfSelfExplode(speaker)) {
    return;
  }
  const turnSeq = (state._speechTurnSeq = (state._speechTurnSeq || 0) + 1);
  state.speakingInFlight = true;
  state.currentTurnSpoken = true;
  stopTypewriterOnly();
  if (state.stepTimer) {
    clearTimeout(state.stepTimer);
    state.stepTimer = null;
  }
  let generated = null;
  const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const ffNow = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const extLlmOn = !ffNow && (typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel));
  const pf = state.match && state.match._prefetchedSpeech;
  const curKey = _buildSpeechPrefetchKey(speaker.id);
  const pfMatch = !ffNow && Boolean(pf && pf.epoch === ep && pf.seatId === speaker.id && pf.key === curKey);
  if (pfMatch) state.match._prefetchedSpeech = null;

  let cueTimer = null;
  const useShowcaseCuratedAsong = Boolean(
    !ffNow &&
    state.match &&
    state.match.judgeShowcase &&
    state.match.day === 2 &&
    speaker.id === 4 &&
    state.match.judgeShowcaseScript &&
    !state.match.judgeShowcaseScript.day2AsongUsed &&
    !(state.geminiApiKey && typeof voice !== "undefined" && voice.enginePref === "gemini")
  );
  try {
    if (useShowcaseCuratedAsong) {
      state.match.judgeShowcaseScript.day2AsongUsed = true;
      generated = {
        text: state.match.judgeShowcaseScript.day2AsongText,
        claimRole: "seer",
        claimSeer: true,
        accuseId: 1,
        targetId: 1,
        vouchId: null,
        standWithSeerId: null,
        checkedWolfId: 1,
        checkedGoodId: null,
        wolfPits: [1, 5],
        goodPits: [2, 3],
        relationType: "suspect",
        emotion: "sharp",
        hasToxicSlip: false
      };
    } else if (ffNow) {
      generated = buildHeuristicAiSpeech(speaker);
    } else if (pfMatch && pf.resolvedMeta) {
      // Zero-wait instant handoff from background prefetch!
      generated = pf.resolvedMeta;
    } else {
      if (extLlmOn) {
        // Only show a gentle in-character cue if the LLM takes longer than 350ms (eliminates jarring flashing!)
        const cueLine = typeof getPersonaThinkingCue === "function"
          ? getPersonaThinkingCue(speaker, state.match.day)
          : THINKING_MICROCUES[(speaker.id + (state.match.day || 1)) % THINKING_MICROCUES.length];
        cueTimer = setTimeout(function () {
          if (state._speechTurnSeq === turnSeq && state.match.phase === "DAY_SPEECH" && state.activeSpeakerId === speaker.id && state.speakingInFlight) {
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
        generated = _buildDryRunHeuristicSpeech(speaker);
        if (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function") {
          const dispatched = await orchestrator.dispatchAgent("PersonaAgent", { speaker: speaker, fallbackMeta: generated, deferSeatMutation: true });
          if (!dispatched || !dispatched.epochValid || !orchestrator.isEpochValid(ep)) {
            return;
          }
          generated = dispatched.generated || generated;
        } else if (extLlmOn) {
          const liveRes = await tryGenerateGeminiAiSpeech(speaker, generated);
          const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
          if (liveTxt) {
            if (typeof syncGeminiSpeechMeta === "function") {
              syncGeminiSpeechMeta(speaker, generated, liveRes, { deferSeatMutation: true });
            } else {
              generated.text = liveTxt;
            }
            generated.text = (typeof normalizeGeminiSpeechText === "function")
              ? normalizeGeminiSpeechText(generated.text)
              : String(generated.text || "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").trim();
          }
        }
      }
    }
  } finally {
    if (cueTimer) clearTimeout(cueTimer);
    if (state._speechTurnSeq === turnSeq && (typeof orchestrator === "undefined" || orchestrator.isEpochValid(ep))) {
      state.speakingInFlight = false;
    }
  }
  if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(ep)) return;
  if (state._speechTurnSeq !== turnSeq || state.match.phase !== "DAY_SPEECH" || state.activeSpeakerId !== speaker.id || !speaker.alive) return;

  // Commit deferred seat flags & role claim right on this seat's actual speaking turn!
  const wasAlreadyClaimed = Boolean(speaker.claimedRole);
  _commitDeferredSeatPatch(speaker, generated);
  const committedClaim = generated.claimSeer ? "seer" : (generated.claimRole || null);
  if (committedClaim) {
    if (committedClaim === "seer" || !speaker.claimedRole || speaker.claimedRole === committedClaim) {
      speaker.claimedRole = committedClaim;
    }
  }
  // Sync Gemini-spoken Badge Flow if speaker is Seer Sheriff
  if (speaker.claimedRole === "seer" && state.match.sheriffSeatId === speaker.id && typeof parseBadgeFlowFromText === "function" && typeof setSheriffBadgeFlow === "function") {
    const parsedBf = parseBadgeFlowFromText(generated.text, speaker.id);
    if (parsedBf && parsedBf.firstTargetId) {
      setSheriffBadgeFlow(speaker.id, parsedBf.firstTargetId, parsedBf.secondTargetId, "speech");
    }
  }

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
  speaker.publicVouchId = generated.vouchId || generated.standWithSeerId || null;
  // Keep speaker's OWN suspicionMap aligned with what Gemini just publicly argued (respecting Seer/Witch verified truths & wolf teammates!)
  if (speaker.suspicionMap) {
    const isVerifiedGoodSelf = function (tid) {
      if (speaker.role === "seer" && (speaker.checkedHistory || []).some(function (c) { return c.targetId === tid && !c.isWolf; })) return true;
      if (speaker.role === "witch" && speaker.savedSeatId === tid) return true;
      return false;
    };
    const isVerifiedWolfSelf = function (tid) {
      return speaker.role === "seer" && (speaker.checkedHistory || []).some(function (c) { return c.targetId === tid && c.isWolf; });
    };
    if (generated.accuseId && generated.accuseId !== speaker.id && !isVerifiedGoodSelf(generated.accuseId)) {
      const aSeat = getSeat(generated.accuseId);
      if (aSeat && aSeat.alive && !(speaker.role === "wolf" && aSeat.role === "wolf")) {
        speaker.suspicionMap[generated.accuseId] = clamp(Math.max((speaker.suspicionMap[generated.accuseId] || 50) + 14, 68), 5, 98);
      }
    }
    if (Array.isArray(generated.wolfPits)) {
      generated.wolfPits.forEach(function (wid) {
        if (!wid || wid === speaker.id || wid === generated.accuseId || isVerifiedGoodSelf(wid)) return;
        const ws = getSeat(wid);
        if (ws && ws.alive && !(speaker.role === "wolf" && ws.role === "wolf")) {
          speaker.suspicionMap[wid] = clamp((speaker.suspicionMap[wid] || 50) + 8, 5, 96);
        }
      });
    }
    [generated.vouchId, generated.standWithSeerId].forEach(function (vid) {
      if (!vid || vid === speaker.id || vid === generated.accuseId || isVerifiedWolfSelf(vid)) return;
      const vs = getSeat(vid);
      if (vs && vs.alive) {
        speaker.suspicionMap[vid] = clamp(Math.min((speaker.suspicionMap[vid] || 50) - 14, 34), 5, 95);
      }
    });
  }
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
        if (typeof voice !== "undefined" && typeof voice.triggerSeatBackchannel === "function") {
          voice.triggerSeatBackchannel(rivalClaimant.id, "clash", 620);
        }
      }
    } else if (!wasAlreadyClaimed && (generated.claimSeer || generated.claimRole)) {
      spawnFx(speaker.id, "亮出" + rTitle + "身分!", "#fde68a");
      spawnBurst(speaker.id, ["#fde68a", "#fbbf24", "#ffffff"], 14, "ring");
    }
  }

  const badgeTitle = fmtSeatNum(speaker.id) + "號 · " + speaker.name;
  const subTag = (state.match.microPulseRevealed || speaker.sweatExposed)
    ? ("心虛 " + speaker.microPulse + "%")
    : speaker.trait;

  const ffLog = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const deferLogDisplay = Boolean(!ffLog && typeof voice !== "undefined" && typeof voice.canSpeak === "function" && voice.canSpeak());
  if (state.match._deferredSpeechLog && typeof commitPendingSpeechLog === "function") {
    commitPendingSpeechLog(state.match._deferredSpeechLog.speakerId);
  }
  const speechLogPayload = {
    kind: "speech",
    useTypewriter: true,
    pendingReveal: false,
    speakerId: speaker.id,
    title: badgeTitle,
    subBadge: subTag,
    text: generated.text
  };
  let committedLogRef = null;
  if (deferLogDisplay) {
    // v24.0 True Deferred Speech Log: hold outside state.match.logs until audio finishes or skips
    state.match._deferredSpeechLog = {
      speakerId: speaker.id,
      day: state.match.day,
      entry: speechLogPayload
    };
  } else {
    addLog(speechLogPayload);
    committedLogRef = state.match.logs[state.match.logs.length - 1] || null;
  }
  state.match._activeSpeechCommit = {
    speakerId: speaker.id,
    day: state.match.day,
    logEntry: committedLogRef,
    evObj: aiEvObj,
    hadContra: Boolean(contra),
    wasAlreadyClaimed: wasAlreadyClaimed,
    prevClaimedRole: wasAlreadyClaimed ? speaker.claimedRole : null
  };

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
      spawnFx(speaker.id, "冒充觀察員!", "#fbbf24");
      triggerCutIn("有人冒充明心觀察員！", fmtSeatNum(speaker.id) + "號 " + speaker.name + " 搶跳觀察員・輪到你的順位再拆穿！", "gold");
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
      spawnFx(speaker.id, "酸言霧霾 -7!", "#fb7185");
      if (typeof orchestrator !== "undefined") {
        orchestrator.emit("clash:detected", { kind: "toxic_slip", speakerId: speaker.id });
        orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
      }
    } else if (contra) {
      state.activeClash = { speakerId: speaker.id, kind: "contradiction", contradiction: contra, resolved: false };
      if (contra.severity >= 2) {
        spawnFx(speaker.id, "" + contra.label, "#fbbf24");
      }
      if (typeof orchestrator !== "undefined") {
        orchestrator.emit("clash:detected", { kind: "contradiction", speakerId: speaker.id, code: contra.code });
      }
    }
  }

  const moodTag = _computeSpeechVoiceMood(speaker, generated);
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
  if (typeof voice !== "undefined") {
    const pfHost = typeof voice.prefetchBestTts === "function" ? voice.prefetchBestTts.bind(voice) : (typeof voice.prefetchFreeLocalNeural === "function" ? voice.prefetchFreeLocalNeural.bind(voice) : null);
    if (pfHost) {
      const q = state.match.speechQueue || [];
      if (q.length === 0) {
        pfHost("主持", "全員發言結束，請點擊外圍座位投票抓狼。", "normal");
      } else if (q[0] === getPlayerId()) {
        pfHost("主持", "輪到" + getPlayerId() + "號你發言了，請選擇卡牌表態。", "normal");
      }
    }
  }
}
