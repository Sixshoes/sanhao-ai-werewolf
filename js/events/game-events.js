/**
 * 對局進行中控制事件：拆分為流程控制、偵探情資、發言輸入與夜間／投票四大領域綁定函式
 */
"use strict";

function resetMatchToLobby() {
  voice.stop();
  clearStepTimer();
  if (typeof clearTransientMatchTimers === "function") clearTransientMatchTimers();
  if (typeof orchestrator !== "undefined") orchestrator.beginNewEpoch("reset_lobby");
  if (state.voteFlight && state.voteFlight.timers) {
    state.voteFlight.timers.forEach(function (t) { clearTimeout(t); });
  }
  state.speakingInFlight = false;
  state.currentTurnSpoken = false;
  if (state.spectatorFastForward && typeof state._preSpectatorAutoPlay === "boolean") {
    state.autoPlay = state._preSpectatorAutoPlay;
    state._preSpectatorAutoPlay = null;
  }
  state.spectatorFastForward = false;
  if (typeof clearCutInQueue === "function") clearCutInQueue();
  state.voteFlight = null;
  state.lastWordsCtx = null;
  if (el("voteFlightBanner")) el("voteFlightBanner").classList.add("hidden");
  if (typeof indieFlow !== "undefined" && typeof indieFlow.hideRoleDealRitual === "function") {
    indieFlow.hideRoleDealRitual({ silent: true });
  }
  state.match.started = false;
  state.match.judgeShowcase = false;
  state.match.judgeGuideDismissed = false;
  state.match.phase = "LOBBY";
  state.match.day = 0;
  state.match.playerSeatId = 1;
  state.match.sheriffSeatId = null;
  state.match.sheriffElectionCtx = null;
  state.match.sheriffVoteRecord = null;
  state.match.sheriffBadgeFlow = null;
  state.match.sheriffBadgeFlowsBySeat = {};
  state.match.badgeFlowSignals = [];
  state.match.pendingSheriffTransfer = null;
  state.match.goodwillVoteBonus = false;
  state.match.convenienceRallyTargetId = null;
  state.match.clearBreezeUsedDay = 0;
  state.match.quickReactedMap = {};
  state.match.harmonyScore = 70;
  state.match.threeGood = { heart: 0, words: 0, deeds: 0, resonanceTriggered: false, milestones: { heart: false, words: false, deeds: false } };
  state.match.combo = 0;
  state.match.maxCombo = 0;
  state.match.comboBoostReady = false;
  state.match.pinnedClues = [];
  state.match.caughtSpeechClues = {};
  state.match.wolfGodMarks = {};
  if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
  state.match.fourGivingsUsed = { confidence: false, joy: false, hope: false, convenience: false };
  state.match.fourGJoySuspects = [];
  state.match.fourGSynergyTriggered = false;
  state.match.teaServedDay = 0;
  state.match.spectatorGuess = (typeof createEmptySpectatorGuess === "function" ? createEmptySpectatorGuess() : { wolfIds: [], godRoles: { seer: null, witch: null, hunter: null }, activeRoleSlot: "seer", locked: false, lockedAtDay: 0, evaluated: null });
  state.match.seats = [];
  state.match.logs = [];
  state.match.relations = [];
  state.match.daySpeechEvents = [];
  state.match.allSpeechEvents = [];
  state.match.nightArchive = [];
  state.match.firstNightIntel = null;
  state.match.playerKnownRoles = {};
  state.match.voteHistory = [];
  state.match.peaceNights = [];
  state.match.detectedContradictions = [];
  state.match.microInspectCountToday = 0;
  state.match.microInspectedSeats = {};
  if (typeof state._preSpectatorFxPacing === "string") {
    state.fxPacing = state._preSpectatorFxPacing;
    state._preSpectatorFxPacing = null;
    if (typeof document !== "undefined" && document.body && document.body.classList) {
      document.body.classList.toggle("fx-pacing-fast", state.fxPacing === "fast");
    }
  }
  state.match.wolfTactic = "mate_fake_seer_gold";
  state.match.variantMode = "standard";
  state.match.isMatchPoint = false;
  state.match.hopeConfrontation = null;
  state.match.wolfExplodedToday = false;
  state.match.interjectBonusCharges = 0;
  state.match.guardAwakenBonusWeightDay = 0;
  state.match.guardAwakenBonusUsed = false;
  state.match.guardBlockedLastNight = false;
  state.match.spiritBet = { active: null, history: [], streak: 0, bestStreak: 0, totalBonusPts: 0 };
  if (typeof clearWolfScreenTacticTimer === "function") clearWolfScreenTacticTimer();
  if (typeof clearBlitzVoteTimer === "function") clearBlitzVoteTimer();
  if (typeof closeHopeConfrontationModal === "function") closeHopeConfrontationModal();
  if (typeof closeSpiritRoundBet === "function") closeSpiritRoundBet(false);
  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.remove("is-match-point");
  }
  if (el("matchPointBadge")) el("matchPointBadge").classList.add("hidden");
  if (el("teaAtmosphereBadge")) el("teaAtmosphereBadge").classList.add("hidden");
  if (el("virtueQuickDeck")) el("virtueQuickDeck").classList.add("hidden");
  state.match.sheriffRallyUsedDay = 0;
  state.match.pendingSheriffTransfer = null;
  state.match.pendingEvidenceTargetId = null;
  state.match.pendingEvidenceClueId = null;
  state.match.playerDraftPits = { wolfIds: [], goodIds: [], claimRole: null, standSeerId: null, evidenceClueId: null, turnKey: "" };
  state.match.roleMission = null;
  state.match.dayOrder = [];
  state.match.speechQueue = [];
  state.match.lastNightCasualties = [];
  state.match.pendingNight1LastWords = [];
  state.match.pkCandidates = null;
  state.match.pkUsedToday = false;
  state.match.afterHunterNext = null;
  state.match.lastHunterShot = null;
  state.match.pendingVotedHunterId = null;
  state.hunterResolveCommit = null;
  state.match.rewriteCritReady = false;
  state.match.witchPotions = { heal: true, purify: true };
  state.match.nightState = { wolfTarget: null, seerTarget: null, guardTarget: null, witchSaved: false, witchPoisonTarget: null };
  state.match.lastGuardTargetId = null;
  state.match.sheriffElectionPending = false;
  state.match.sheriffElectionCtx = null;
  state.match.sheriffVoteRecord = null;
  state.match.sheriffOrderCtx = null;
  state.match.fourGHopePair = null;
  state.match.fourGEchoes = [];
  state.match.threeGoodImpactLog = [];
  state.match.activeDirectorEvent = null;
  state.match.usedDirectorEventIds = [];
  state.match.directorEventClearedDay = 0;
  state.match.directorEventInteractedDay = 0;
  state.match.orchestratorSummary = "";
  state.match.spectatorGuess = (typeof createEmptySpectatorGuess === "function" ? createEmptySpectatorGuess() : {
    wolfIds: [],
    godRoles: { seer: null, witch: null, hunter: null, guard: null },
    activeRoleSlot: "seer",
    locked: false,
    lockedAtDay: 0,
    evaluated: null,
    godViewUnlocked: false
  });
  state.match.stats = {
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
  };
  state.match.microPulseRevealed = false;
  state.match.winner = null;
  state.match.winReason = "";
  state.match.activeSpeechContra = null;
  state.activeBubble = null;
  state.seatBubbles = {};
  state.beamFx = [];
  state.fxPopups = [];
  state.burstParticles = [];
  state.ripples = [];
  state.screenFlash = null;
  state.voteLeaderId = null;
  state.lastSpeakerPortraitId = null;
  state.seatMoods = {};
  state.seatPhysics = {};
  state.dragAction = { active: false, moved: false, fromId: null, startX: 0, startY: 0, curX: 0, curY: 0, snapId: null };
  state.selectedSeatId = null;
  closeSeatIntel();
  closeRadialMenu();
  state.activeSpeakerId = null;
  state.seerReveal = null;
  state.voteResultPayload = null;
  state.activeClash = null;
  state.playerMarks = {};
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  if (el("lastWordsFreeInput")) el("lastWordsFreeInput").value = "";
  if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(el("quickFreeInput"));
  if (el("btnQuickFreeSend")) el("btnQuickFreeSend").textContent = "陳詞送出 ↵";
  if (el("speechThreeGoodBadge")) el("speechThreeGoodBadge").classList.add("hidden");
  if (el("btnQuickInlineRewrite")) el("btnQuickInlineRewrite").classList.add("hidden");
  updateSpotlightBox("主持播報", "準備開局", "選擇下方人數與角色，按下「開始對局」即可進入第一晚！", "");
  renderPinnedCluesTray();
  renderTimeline({ deferIfHidden: true });
  updateAllUI();
}

function bindMatchFlowEvents() {
  el("btnSeerRevealContinue").addEventListener("click", function () {
    sound.unlock();
    if (state.match.phase !== "NIGHT_SEER" || !state.seerReveal) return;
    clearStepTimer();
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    state.seerReveal = null;
    proceedToNightWitch();
  });

  el("btnVoteResultNext").addEventListener("click", function () {
    sound.unlock();
    if (state.match.phase !== "DAY_VOTE_RESULT") return;
    clearStepTimer();
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    const cb = state.voteResultPayload && state.voteResultPayload.onContinue;
    state.voteResultPayload = null;
    if (typeof cb === "function") cb();
    else beginNightPhase();
  });

  if (el("btnVoteEndNow")) {
    el("btnVoteEndNow").addEventListener("click", function () {
      sound.unlock();
      if (!state.match.started || state.match.phase === "GAME_OVER") return;
      finishEarlyAsSpectator("你已被投票出局，選擇直接結束並揭曉全員底牌。");
    });
  }

  if (el("btnSpectatorEndNow")) {
    el("btnSpectatorEndNow").addEventListener("click", function () {
      sound.unlock();
      if (!state.match.started || state.match.phase === "GAME_OVER") return;
      finishEarlyAsSpectator("你已提前結束觀戰，全員底牌揭曉！");
    });
  }

  el("btnRestartTop").addEventListener("click", resetMatchToLobby);
  el("btnStartMatch").addEventListener("click", startNewGame);
  el("btnPlayAgain").addEventListener("click", startNewGame);
  if (el("directorEventPill")) {
    el("directorEventPill").addEventListener("click", function () {
      const ev = state.match && state.match.activeDirectorEvent;
      if (ev) showToast(ev.title + " — " + ev.desc, "emerald");
    });
  }

  if (el("selectModeCount")) {
    el("selectModeCount").addEventListener("change", function () {
      if (!state.match.started) {
        closeSeatIntel();
        renderSeatStrip();
      }
    });
  }

  el("btnToggleGraphOverlay").addEventListener("click", function () {
    state.showRelationsOnCanvas = !state.showRelationsOnCanvas;
    el("btnToggleGraphOverlay").textContent = "連線：" + (state.showRelationsOnCanvas ? "開" : "關");
    saveUserPrefs();
  });

  el("btnToggleRoleMask").addEventListener("click", function () {
    state.hidePlayerRole = !state.hidePlayerRole;
    el("btnToggleRoleMask").textContent = state.hidePlayerRole ? "顯示" : "遮蔽";
    if (state.hidePlayerRole && typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
    updateAllUI();
  });

  if (el("btnToggleFxPacing")) {
    el("btnToggleFxPacing").addEventListener("click", function () {
      sound.unlock();
      state.fxPacing = state.fxPacing === "fast" ? "cinematic" : "fast";
      if (typeof syncPrefsToControls === "function") syncPrefsToControls();
      if (typeof saveUserPrefs === "function") saveUserPrefs();
      showToast(state.fxPacing === "fast" ? "已切換為「快節奏」演出模式" : "已切換為「沉穩儀式感」演出模式（卡片與特效停留更從容）", "emerald");
    });
  }

  el("btnAutoPlayToggle").addEventListener("click", function () {
    state.autoPlay = !state.autoPlay;
    if (!state.autoPlay && state.spectatorFastForward) {
      state.spectatorFastForward = false;
      state._preSpectatorAutoPlay = null;
    }
    el("btnAutoPlayToggle").textContent = "自動:" + (state.autoPlay ? "開" : "關");
    saveUserPrefs();
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncBodyScreenState === "function") {
      indieFlow.syncBodyScreenState();
    }
    const voiceBusyNow = Boolean(typeof voice !== "undefined" && (voice.speaking || voice.paused));
    if (state.autoPlay && !state.stepTimer && !state.speakingInFlight && !voiceBusyNow) {
      if (state.match.phase === "DAY_SPEECH" && !state.typewriter.active) {
        advanceSpeechQueue();
      } else if (state.match.phase === "LAST_WORDS_SPEECH" && !state.typewriter.active) {
        advanceLastWordsQueue();
      } else if (state.match.phase === "SHERIFF_ELECTION" && typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
        maybeScheduleAutoAdvanceAfterSpeech();
      } else if (state.match.phase === "NIGHT_SEER" && state.seerReveal) {
        state.stepTimer = setTimeout(function () {
          if (state.match.phase === "NIGHT_SEER" && state.seerReveal) {
            state.seerReveal = null;
            proceedToNightWitch();
          }
        }, 1800);
      } else if (state.match.phase === "DAY_VOTE_RESULT" && state.voteResultPayload && !state.voteResultPayload.playerVotedOut) {
        const nextCb = state.voteResultPayload.onContinue;
        state.stepTimer = setTimeout(function () {
          if (state.match.phase === "DAY_VOTE_RESULT") {
            state.voteResultPayload = null;
            if (typeof nextCb === "function") nextCb();
            else beginNightPhase();
          }
        }, 2200);
      }
    }
  });
}

function bindIntelAndDetectiveEvents() {
  el("spotlightStageBox").addEventListener("click", function (ev) {
    sound.unlock();
    const clueEl = ev.target && ev.target.closest ? ev.target.closest(".clue-token") : null;
    if (clueEl) {
      ev.stopPropagation();
      handleSpotlightClueClick(clueEl);
      return;
    }
    if (state.typewriter.active) {
      completeCurrentTypewriter(true);
    }
  });

  if (el("btnCycleSpeechTarget")) {
    el("btnCycleSpeechTarget").addEventListener("click", function () {
      sound.unlock();
      if (!state.match.started) return;
      const pid = getPlayerId();
      const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
      if (!aliveOthers.length) return;
      const curIdx = aliveOthers.findIndex(function (s) { return s.id === state.selectedSeatId; });
      const nextIdx = (curIdx === -1 ? 0 : curIdx) + 1;
      const nextSeat = aliveOthers[nextIdx % aliveOthers.length];
      if (nextSeat) {
        state.selectedSeatId = nextSeat.id;
        sound.tone(520 + nextSeat.id * 22, 0.06, "triangle", 0.04, 0);
        nudgeSeat(nextSeat.id, { scale: 1.08, vy: -3 });
        if (state.match.phase === "DAY_PLAYER_TURN" && typeof preparePlayerSpeechPanel === "function") {
          preparePlayerSpeechPanel();
        }
        updateAllUI();
      }
    });
  }

  if (el("btnIntelQuickAct")) {
    el("btnIntelQuickAct").addEventListener("click", function () {
      sound.unlock();
      const sid = state.intelSeatId;
      const s = getSeat(sid);
      const pSelf = getPlayerSeat();
      if (!sid || !s || !s.alive || !state.match.started) return;
      const ph = state.match.phase;
      state.selectedSeatId = sid;
      if (ph === "DAY_VOTE" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active) && isValidVoteTarget(sid)) {
        closeSeatIntel();
        finalizeVoteRound(sid);
      } else if ((ph === "NIGHT_GUARD" && pSelf && pSelf.alive && pSelf.role === "guard" && state.match.lastGuardTargetId !== sid) ||
                 (ph === "NIGHT_SEER" && !state.seerReveal && pSelf && pSelf.alive && pSelf.role === "seer") ||
                 (ph === "NIGHT_WOLF" && pSelf && pSelf.alive && pSelf.role === "wolf" && s.role !== "wolf") ||
                 (ph === "HUNTER_TRIGGER" && pSelf && !pSelf.alive && canSeatTriggerShot(pSelf) && !(pSelf.isWolfKing && s.role === "wolf"))) {
        closeSeatIntel();
        confirmTargetAction();
      } else if (ph === "DAY_PLAYER_TURN") {
        closeSeatIntel();
        if (typeof preparePlayerSpeechPanel === "function") preparePlayerSpeechPanel();
        updateAllUI();
        showToast("已鎖定 " + fmtSeatNum(sid) + "號 " + s.name + " 為發言點名對象！", "emerald");
      }
    });
  }

  if (el("btnCloseIntel")) {
    el("btnCloseIntel").addEventListener("click", closeSeatIntel);
  }
  if (el("btnIntelMarkGood")) {
    el("btnIntelMarkGood").addEventListener("click", function () {
      const sid = state.intelSeatId;
      if (!sid || !state.match.started) return;
      const pSelf = getPlayerSeat();
      const targetS = getSeat(sid);
      if (pSelf && pSelf.role === "wolf" && targetS && targetS.role === "wolf") return;
      state.playerMarks[sid] = state.playerMarks[sid] === "good" ? null : "good";
      sound.tone(660, 0.08, "triangle", 0.05, 0);
      const isWolfM = Boolean(pSelf && pSelf.role === "wolf");
      spawnFx(sid, state.playerMarks[sid] ? (isWolfM ? "標記：假保" : "標記：信任") : "清除標記", "#34d399");
      updateAllUI();
    });
  }
  if (el("btnIntelMarkWolf")) {
    el("btnIntelMarkWolf").addEventListener("click", function () {
      const sid = state.intelSeatId;
      if (!sid || !state.match.started) return;
      const pSelf = getPlayerSeat();
      const targetS = getSeat(sid);
      if (pSelf && pSelf.role === "wolf" && targetS && targetS.role === "wolf") return;
      state.playerMarks[sid] = state.playerMarks[sid] === "wolf" ? null : "wolf";
      sound.tone(330, 0.09, "triangle", 0.05, 0);
      const isWolfM = Boolean(pSelf && pSelf.role === "wolf");
      spawnFx(sid, state.playerMarks[sid] ? (isWolfM ? "標記：甩鍋" : "標記：懷疑") : "清除標記", "#fb7185");
      updateAllUI();
    });
  }
  if (el("btnIntelPinSeat")) {
    el("btnIntelPinSeat").addEventListener("click", function () {
      const sid = state.intelSeatId;
      const s = getSeat(sid);
      if (!s || !s.alive) return;
      if (state.match.phase === "DAY_PLAYER_TURN") {
        state.selectedSeatId = sid;
        preparePlayerSpeechPanel();
        updateAllUI();
        showToast("已鎖定 " + fmtSeatNum(sid) + "號 " + s.name + " 為發言點名對象！", "emerald");
      } else {
        pinClue(sid, "點名 " + fmtSeatNum(sid) + "號" + s.name, "大家待會多留意 " + fmtSeatNum(sid) + "號" + s.name + " 的邏輯與票型，我覺得他的立場很關鍵！", "seat");
        bumpCombo("鎖定目標");
        showToast("已將 " + fmtSeatNum(sid) + "號 加入你的發言筆記！", "emerald");
      }
    });
  }
  if (el("btnIntelPokeSeat")) {
    el("btnIntelPokeSeat").addEventListener("click", function () {
      if (!state.match.started) {
        if (state.intelSeatId) pokeSeatWithReaction(state.intelSeatId);
      } else {
        openVoteSheetModal();
      }
    });
  }

  if (el("voteFlightBanner")) {
    el("voteFlightBanner").addEventListener("click", function () {
      if (state.voteFlight && typeof state.voteFlight.finish === "function") {
        state.voteFlight.finish();
      }
    });
  }

  function triggerQuickReactionToSpeaker(sp, kind) {
    if (!sp || !sp.alive || sp.id === getPlayerId()) return;
    const selfPlayerChk = getPlayerSeat();
    const isWolfSelf = Boolean(selfPlayerChk && selfPlayerChk.role === "wolf");
    if (isWolfSelf && sp.role === "wolf") {
      spawnFx(sp.id, "狼隊同伴", "#fb7185");
      return;
    }
    const key = (state.match.day || 0) + ":" + sp.id;
    if (!state.match.quickReactedMap) state.match.quickReactedMap = {};
    const firstTime = !state.match.quickReactedMap[key];
    state.match.quickReactedMap[key] = kind;
    const isGoodReaction = (kind === "good");
    state.playerMarks[sp.id] = state.playerMarks[sp.id] === kind ? null : kind;
    if (typeof sound.playTableReactionSfx === "function") {
      sound.playTableReactionSfx(isGoodReaction ? "agree" : "doubt");
    } else {
      sound.tone(isGoodReaction ? 660 : 330, 0.09, "triangle", 0.055, 0);
    }

    if (state.playerMarks[sp.id] === kind) {
      const fxLbl = isWolfSelf
        ? (isGoodReaction ? "標記假保" : "標記甩鍋")
        : (isGoodReaction ? "點頭認同" : "皺眉存疑");
      spawnFx(sp.id, fxLbl, isGoodReaction ? "#34d399" : "#fb7185");
      nudgeSeat(sp.id, { scale: isGoodReaction ? 1.12 : 0.90, vy: isGoodReaction ? -5 : 4, vTilt: isGoodReaction ? 0.06 : -0.14 });
      const selfPlayer = getPlayerSeat();
      const selfAlive = Boolean(selfPlayer && selfPlayer.alive);
      // v15.0 Record strictly public table micro-reaction (nod/frown) & sync downstream AI prefetch cache!
      if (state.match && state.match.phase === "DAY_SPEECH" && selfAlive) {
        if (!Array.isArray(state.match.tableReactions)) state.match.tableReactions = [];
        const reactKind = isGoodReaction ? "nod" : "frown";
        state.match.tableReactions = state.match.tableReactions.filter(function (r) {
          return !(r && r.day === state.match.day && r.targetId === sp.id);
        });
        state.match.tableReactions.push({
          day: state.match.day,
          targetId: sp.id,
          targetName: sp.name,
          kind: reactKind,
          ts: Date.now()
        });
        if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
      }
      if (firstTime && selfAlive) {
        if (isGoodReaction) {
          addThreeGoodPoint("words", "說好話鼓勵");
          setSeatEmotion(sp.id, "happy", 2800);
          const goodReply = sp.team === "wolf"
            ? "謝謝你的信任，我也會一起幫大家理清楚。"
            : "謝謝你點頭認同，我們好人這輪把線對齊。";
          setSeatBubble(sp.id, goodReply, "trust", 3000);
          if (typeof renderTargetReactionCard === "function") {
            renderTargetReactionCard(null, null, { seat: sp, kind: "trust", badge: sp.name + " · 回眸致謝", quote: "「" + goodReply + "」" });
          }
          if (sp.team === "good") {
            sp.suspicionMap[getPlayerId()] = clamp((sp.suspicionMap[getPlayerId()] || 50) - 8, 5, 95);
          }
        } else {
          addThreeGoodPoint("heart", "存好心質疑");
          let doubtReply = "";
          if (sp.team === "wolf") {
            setSeatEmotion(sp.id, "nervous", 3000);
            sp.sweatExposed = (sp.microPulse >= 72);
            doubtReply = "欸、你剛剛皺眉看我是覺得哪裡怪嗎？我真的沒帶風向…";
            setSeatBubble(sp.id, doubtReply, "wolf", 3200);
          } else {
            setSeatEmotion(sp.id, "shock", 2600);
            doubtReply = "看你皺眉頭了，真不是我啦，等下看我的票型就知道。";
            setSeatBubble(sp.id, doubtReply, "suspect", 3000);
          }
          if (typeof renderTargetReactionCard === "function") {
            renderTargetReactionCard(null, null, { seat: sp, kind: "accuse", badge: sp.name + " · 回頭回應", quote: "「" + doubtReply + "」" });
          }
          pinSeatSummaryNote(sp.id);
        }
      }
    } else {
      spawnFx(sp.id, "清除標記", "#94a3b8");
      if (state.match && Array.isArray(state.match.tableReactions)) {
        state.match.tableReactions = state.match.tableReactions.filter(function (r) {
          return !(r && r.day === state.match.day && r.targetId === sp.id);
        });
        if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
      }
    }
    updateAllUI();
  }

  el("btnMarkGood").addEventListener("click", function () {
    sound.unlock();
    const sp = getSeat(state.activeSpeakerId);
    triggerQuickReactionToSpeaker(sp, "good");
  });

  el("btnMarkWolf").addEventListener("click", function () {
    sound.unlock();
    const sp = getSeat(state.activeSpeakerId);
    triggerQuickReactionToSpeaker(sp, "wolf");
  });

  if (el("btnToggleListenTools")) {
    el("btnToggleListenTools").addEventListener("click", function () {
      sound.unlock();
      const wrap = el("listenExtraToolsWrap");
      if (!wrap) return;
      const openNow = wrap.classList.toggle("is-open");
      el("btnToggleListenTools").setAttribute("aria-expanded", openNow ? "true" : "false");
      el("btnToggleListenTools").textContent = openNow ? "收合工具 ▴" : "偵探工具 ▾";
      if (typeof sound.tone === "function") sound.tone(openNow ? 540 : 440, 0.04, "triangle", 0.03, 0);
    });
  }

  if (el("btnPinCurrentSpeaker")) {
    el("btnPinCurrentSpeaker").addEventListener("click", function () {
      sound.unlock();
      const sp = getSeat(state.activeSpeakerId);
      if (!sp || sp.id === getPlayerId()) return;
      pinSeatSummaryNote(sp.id);
      updateAllUI();
    });
  }

  // Native Web Speech Recognition (zh-TW) for hands-free spoken player speeches!
  if (el("btnMicVoiceSpeech")) {
    let activeRec = null;
    let isListening = false;
    const stopMicUi = function () {
      isListening = false;
      const b = el("btnMicVoiceSpeech");
      if (b) {
        b.classList.remove("is-listening");
        b.innerHTML = typeof shIcon === "function" ? shIcon("mic", "jade") : "語音";
      }
    };
    el("btnMicVoiceSpeech").addEventListener("click", function () {
      sound.unlock();
      const SpeechRec = (typeof window !== "undefined") && (window.SpeechRecognition || window.webkitSpeechRecognition);
      if (!SpeechRec) {
        showToast("目前瀏覽器不支援原生語音辨識（建議使用 Chrome / Edge / Safari），請直接輸入或點卡發言！", "warn");
        return;
      }
      if (isListening && activeRec) {
        try { activeRec.stop(); } catch (e) {}
        if (typeof sound.playTableReactionSfx === "function") sound.playTableReactionSfx("mic_off");
        stopMicUi();
        return;
      }
      try {
        voice.stop();
        const rec = new SpeechRec();
        rec.lang = "zh-TW";
        rec.interimResults = true;
        rec.continuous = true;
        activeRec = rec;
        isListening = true;
        const btn = el("btnMicVoiceSpeech");
        btn.classList.add("is-listening");
        btn.textContent = "";
        if (typeof sound.playTableReactionSfx === "function") sound.playTableReactionSfx("mic_on");
        showToast("正在聆聽長段推理發言（支援多句停頓，說完再按一次結束）…", "emerald");
        const basePrefix = (el("quickFreeInput") && el("quickFreeInput").value.trim()) ? (el("quickFreeInput").value.trim() + " ") : "";
        let committedText = "";
        rec.onresult = function (ev) {
          let finalChunk = "";
          let interimChunk = "";
          for (let i = 0; i < ev.results.length; i++) {
            const seg = ev.results[i][0] ? ev.results[i][0].transcript : "";
            if (ev.results[i].isFinal) finalChunk += seg;
            else interimChunk += seg;
          }
          committedText = typeof normalizeSeatRefsInText === "function" ? normalizeSeatRefsInText(finalChunk) : finalChunk;
          if (el("quickFreeInput")) {
            const mergedMic = (basePrefix + committedText + interimChunk).trim();
            el("quickFreeInput").value = typeof normalizeSeatRefsInText === "function" ? normalizeSeatRefsInText(mergedMic) : mergedMic;
            if (el("playerSpeechInput")) el("playerSpeechInput").value = el("quickFreeInput").value;
            if (typeof refreshLiveNlpUI === "function") refreshLiveNlpUI();
            if (typeof refreshQuickFreeInputHint === "function") refreshQuickFreeInputHint();
          }
        };
        rec.onerror = function (err) {
          stopMicUi();
          const code = err && err.error ? err.error : "error";
          if (code === "not-allowed" || code === "service-not-allowed") {
            showToast("未取得麥克風權限，請在瀏覽器網址列允許麥克風後再試！", "warn");
          } else if (code !== "aborted" && code !== "no-speech") {
            showToast("語音辨識暫時中斷，請再試一次或直接打字發言。", "warn");
          }
        };
        rec.onend = function () {
          if (isListening && typeof sound.playTableReactionSfx === "function") {
            sound.playTableReactionSfx("mic_off");
          }
          stopMicUi();
          if (el("quickFreeInput") && el("quickFreeInput").value.trim()) {
            showToast("語音已轉入陳詞欄，確認後按「送出」即可，也可點「潤飾詞句」調整語氣。", "emerald");
          }
        };
        rec.start();
      } catch (e) {
        stopMicUi();
        showToast("無法啟動麥克風語音輸入，請直接輸入文字發言。", "warn");
      }
    });
  }

  if (el("btnMicroInspect")) {
    el("btnMicroInspect").addEventListener("click", function () {
      if (state.activeSpeakerId && typeof inspectSeatMicroExpression === "function") {
        inspectSeatMicroExpression(state.activeSpeakerId);
      }
    });
  }
  if (el("btnOpenPitSheet")) {
    el("btnOpenPitSheet").addEventListener("click", function () {
      sound.unlock();
      if (typeof openVoteSheetModal === "function") {
        openVoteSheetModal();
      } else if (typeof indieFlow !== "undefined" && typeof indieFlow.openJournal === "function") {
        indieFlow.openJournal("vote");
      }
    });
  }
  if (el("btnIntelMicroInspect")) {
    el("btnIntelMicroInspect").addEventListener("click", function () {
      if (state.intelSeatId && typeof inspectSeatMicroExpression === "function") {
        inspectSeatMicroExpression(state.intelSeatId);
      }
    });
  }
  if (el("btnIntelServeTea")) {
    el("btnIntelServeTea").addEventListener("click", function () {
      if (state.intelSeatId && typeof serveWarmTeaToSeat === "function") {
        serveWarmTeaToSeat(state.intelSeatId);
      }
    });
  }

  const WARM_DEESCALATE_QUIPS = [
    "先喝口冬瓜青消消火啦！有疑慮我們一條條慢慢對照，別讓酸言傷了茶席和氣！",
    "這話火藥味有點重喔～來來來，把證據擺茶桌上笑著講，誰也別嚇誰！",
    "欸別急著貼標籤嘛！我是講道理的好夥伴，不如你先聽我等一下怎麼盤票型？",
    "深呼吸喝一口暖茶！真金不怕火煉，等下輪到我自然用邏輯跟大家說明清楚！"
  ];
  const WARM_COUNTER_REACTIONS = [
    "哇…被你這麼有風度一回，我剛剛語氣好像真有點急了…",
    "咳、好啦你有理！等下看你怎麼說服全場囉～",
    "哈哈怎麼反而被你逗笑了，好啦大家先冷靜繼續聽前面講！",
    "行行行，茶席和氣最重要，剛才那句我先收半句回去！"
  ];

  function warmResolveActiveClash() {
    sound.unlock();
    if (!state.match || !state.match.started || !state.activeClash || state.activeClash.resolved) return false;
    const pSelf = getPlayerSeat();
    const pid = getPlayerId();
    if (!pSelf || !pSelf.alive) return false;
    const sp = getSeat(state.activeClash.speakerId);
    const clashKind = state.activeClash.kind;
    state.activeClash.resolved = true;

    const quipIdx = ((state.match.day || 1) + (sp ? sp.id : 1)) % WARM_DEESCALATE_QUIPS.length;
    const myQuip = WARM_DEESCALATE_QUIPS[quipIdx];
    const spReply = WARM_COUNTER_REACTIONS[quipIdx];

    state.match.stats.kindDeescalations = (state.match.stats.kindDeescalations || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 9, 0, 100);
    setSeatBubble(pid, myQuip, "trust", 4200);
    setSeatEmotion(pid, "proud", 2800);
    sound.playBlessing();

    if (sp && sp.alive) {
      sp.suspicionMap[pid] = clamp((sp.suspicionMap[pid] || 50) - 8, 5, 95);
      setSeatBubble(sp.id, spReply, "trust", 3800);
      setSeatEmotion(sp.id, "shock", 2600);
      spawnBeam(pid, sp.id, "#34d399", "trust", 760);
      spawnBurst(sp.id, ["#34d399", "#fbbf24", "#fde68a"], 18, "petal");
      spawnFx(sp.id, "戾氣化解 +9!", "#34d399");
      const noteTxt = clashKind === "toxic_slip"
        ? ("剛才 " + fmtSeatNum(sp.id) + "號" + sp.name + " 語氣帶著挑撥，我先以說好話降溫，請大家仍保持理性留意 " + fmtSeatNum(sp.id) + "號 的真實立場！")
        : ("剛才 " + fmtSeatNum(sp.id) + "號" + sp.name + " 把懷疑指向我，我心平氣和澄清並存進筆記，大家可對比我們雙方的邏輯！");
      pinClue(sp.id, "化解 " + fmtSeatNum(sp.id) + "號", noteTxt, "clash");
    }

    bumpCombo("說好話化解");
    addThreeGoodPoint("words", "說好話・化戾氣");
    triggerCutIn("說好話・化戾氣為祥和！", sp ? ("你用幽默與善意接住 " + fmtSeatNum(sp.id) + "號的尖銳發言，全場友善度 +9！") : "溫柔堅定的風度贏得全場肯定！", "emerald");
    if (typeof orchestrator !== "undefined") {
      orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    }
    addLog({
      kind: "blessing",
      title: "說好話化解：「" + myQuip + "」（全場友善度 +9，已同步記錄重點筆記）",
      text: ""
    });
    showToast("沉穩回應成功！全場友善度 +9，已點亮「說好話」蓮花進度。", "emerald");
    updateAllUI();
    return true;
  }

  if (el("btnWarmDeescalate")) {
    el("btnWarmDeescalate").addEventListener("click", function () {
      warmResolveActiveClash();
    });
  }

  if (el("btnQuickPinWatch")) {
    el("btnQuickPinWatch").addEventListener("click", function () {
      sound.unlock();
      if (!state.activeClash || state.activeClash.resolved) return;
      const sp = getSeat(state.activeClash.speakerId);
      const clashKind = state.activeClash.kind;
      const contraObj = state.activeClash.contradiction;
      state.activeClash.resolved = true;
      if (sp) {
        if (clashKind === "contradiction" && contraObj) {
          pinClue(sp.id, "" + contraObj.label, contraObj.rebuttalText, "contradiction");
          state.match.stats.contradictionsFound = (state.match.stats.contradictionsFound || 0) + 1;
          state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
          if (typeof evaluateRoleMission === "function") evaluateRoleMission();
          const isFeast = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "harmony_feast");
          state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + (isFeast ? 10 : 5), 0, 100);
          bumpCombo("抓包邏輯矛盾");
          if (isFeast) bumpCombo("茶點連擊");
          addThreeGoodPoint("heart", "存好心抓包矛盾");
          spawnFx(getPlayerId(), "解鎖呈堂證供!", "#fbbf24");
          showToast("已抓下 " + fmtSeatNum(sp.id) + "號矛盾！輪到你時將出現「呈堂證供」金色卡牌！", "emerald");
        } else {
          const noteTxt = clashKind === "fake_seer"
            ? ("剛才 " + fmtSeatNum(sp.id) + "號" + sp.name + " 假冒明心觀察員，我才是真觀察員，今天建議大家集中投 " + fmtSeatNum(sp.id) + "號！")
            : clashKind === "toxic_slip"
            ? (fmtSeatNum(sp.id) + "號" + sp.name + " 剛才講話帶有明顯酸言挑撥，我們保持理性，這輪重點檢視 " + fmtSeatNum(sp.id) + "號！")
            : (fmtSeatNum(sp.id) + "號" + sp.name + " 剛才突然把矛頭指向我，我是清白好人，請大家比對我們兩邊的邏輯！");
          pinClue(sp.id, "反駁 " + fmtSeatNum(sp.id) + "號", noteTxt, "clash");
          bumpCombo("靜默記下反駁點");
          spawnFx(getPlayerId(), "已存進筆記!", "#38bdf8");
          showToast("已靜默存進筆記，輪到你的順位即可打出一鍵反駁！", "emerald");
        }
      }
      updateAllUI();
    });
  }
}

function bindSpeechInputEvents() {
  if (el("btnSendLastWords")) {
    el("btnSendLastWords").addEventListener("click", function () {
      const inp = el("lastWordsFreeInput");
      const txt = inp ? inp.value.trim() : "";
      if (!txt) {
        showToast("請擇一張遺言茶牌，或寫下你想留下的線索。", "warn");
        return;
      }
      submitPlayerLastWords(txt);
    });
  }
  if (el("lastWordsFreeInput")) {
    el("lastWordsFreeInput").addEventListener("input", function () {
      if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(el("lastWordsFreeInput"));
    });
    el("lastWordsFreeInput").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        if (el("btnSendLastWords")) el("btnSendLastWords").click();
      }
    });
  }
  if (el("btnSkipLastWords")) {
    el("btnSkipLastWords").addEventListener("click", function () {
      submitPlayerLastWords("");
    });
  }

  el("btnStepNext").addEventListener("click", function (ev) {
    sound.unlock();
    if (state.match && state.match.candlelitReview && state.match.candlelitReview.active) {
      if (typeof finishCandlelitNightReview === "function") finishCandlelitNightReview();
      return;
    }
    if (state.match.phase === "HUNTER_RESOLVE") {
      if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
      return;
    }
    if (state.speakingInFlight && !state.typewriter.active) return;
    if (ev && ev.isTrusted && !state.typewriter.active && typeof ev.timeStamp === "number" && ev.timeStamp > 0) {
      if (state._lastTrustedStepTs && (ev.timeStamp - state._lastTrustedStepTs) < 260) return;
      state._lastTrustedStepTs = ev.timeStamp;
    }
    if (state.match.phase === "LAST_WORDS_SPEECH") {
      if (state.typewriter.active) {
        completeCurrentTypewriter(true);
        return;
      }
      voice.stop();
      if (!state.lastWordsCtx) {
        if (typeof beginNightPhase === "function") beginNightPhase();
        return;
      }
      advanceLastWordsQueue();
      return;
    }
    if (state.match.phase === "DAY_SPEECH") {
      if (state.typewriter.active) {
        completeCurrentTypewriter(true);
        return;
      }
      voice.stop();
      if (state.activeSpeakerId && state.activeSpeakerId !== getPlayerId()) {
        const sp = getSeat(state.activeSpeakerId);
        if (sp && !state.currentTurnSpoken) { executeAiTurnSpeech(sp); return; }
      }
      advanceSpeechQueue();
    } else if (state.match.phase === "DAY_VOTE") {
      if (!isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active)) finalizeVoteRound(null);
    }
  });

  el("playerSpeechInput").addEventListener("input", function () {
    state.match.rewriteCritReady = false;
    refreshLiveNlpUI();
  });

  el("btnToggleCustomSpeech").addEventListener("click", function () {
    sound.unlock();
    const adv = el("speechAdvancedDrawer");
    if (adv) adv.classList.toggle("hidden");
    if (typeof syncSpeechAdvancedToggleLabel === "function") {
      syncSpeechAdvancedToggleLabel(typeof getPlayerSeat === "function" ? getPlayerSeat() : null);
    }
  });

  el("btnDemoToxicSample").addEventListener("click", function () {
    el("customSpeechDrawer").classList.remove("hidden");
    const pid = getPlayerId();
    const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
    const t = getSeat(state.selectedSeatId) && state.selectedSeatId !== pid ? getSeat(state.selectedSeatId) : (aliveOthers[0] || { id: pid === 1 ? 2 : 1 });
    state.match.rewriteCritReady = false;
    el("playerSpeechInput").value = t.id + "號白癡亂玩喔！快滾啦";
    refreshLiveNlpUI();
    showToast("已填入語氣較衝的說法，不妨點選「潤飾詞句」換個更婉轉的切角。", "warn");
  });

  el("btnRewriteKindness").addEventListener("click", async function () {
    sound.unlock();
    const btn = el("btnRewriteKindness");
    const raw = (el("playerSpeechInput").value || "").trim();
    if (!raw) {
      showToast("先輸入或點選一句發言，再按「潤飾詞句」換個更溫潤的說法。", "warn");
      return;
    }
    const ep = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
    const alreadyCritThisTurn = Boolean(state.match && state.match.rewriteCritReady);
    btn.disabled = true;
    btn.textContent = "潤飾中…";
    let niceText = "";
    try {
      niceText = await rewriteToThreeGoodness(raw);
    } finally {
      btn.disabled = false;
      btn.textContent = "潤飾詞句";
    }
    if (!niceText || (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(ep))) return;
    el("playerSpeechInput").value = niceText;
    if (el("quickFreeInput")) el("quickFreeInput").value = niceText;
    if (!alreadyCritThisTurn) {
      state.match.stats.rewritesUsed += 1;
      state.match.rewriteCritReady = true;
      addThreeGoodPoint("words", "溫潤潤飾詞句");
      bumpCombo("以理服人");
    }
    sound.playBlessing();
    spawnFx(getPlayerId(), "辭溫理正", "#34d399");
    refreshQuickFreeInputHint();
    refreshLiveNlpUI();
  });

  if (el("btnCloseRephraseTray")) {
    el("btnCloseRephraseTray").addEventListener("click", function () {
      state.rephraseTrayPinned = false;
      if (el("rephraseChoicesTray")) el("rephraseChoicesTray").classList.add("hidden");
      if (typeof indieFlow !== "undefined" && typeof indieFlow.syncAnimatedGuideCues === "function") {
        indieFlow.syncAnimatedGuideCues();
      }
    });
  }

  if (el("btnTeaInterject")) {
    el("btnTeaInterject").addEventListener("click", function () {
      sound.unlock();
      if (typeof openTeaInterjectPopover === "function") openTeaInterjectPopover();
    });
  }
  if (el("btnInterjectCancel")) {
    el("btnInterjectCancel").addEventListener("click", function () {
      if (typeof closeTeaInterjectPopover === "function") closeTeaInterjectPopover(true);
    });
  }
  if (el("btnInterjectSend")) {
    el("btnInterjectSend").addEventListener("click", function () {
      sound.unlock();
      const inp = el("interjectCustomInput");
      const q = inp ? inp.value.trim() : "";
      if (!q) {
        showToast("請點選一張追問短籤，或輸入 18 字內短問。", "warn");
        return;
      }
      if (typeof executeTeaInterjection === "function") executeTeaInterjection(q);
    });
  }
  if (el("interjectCustomInput")) {
    el("interjectCustomInput").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.isComposing) {
        ev.preventDefault();
        const q = el("interjectCustomInput").value.trim();
        if (q && typeof executeTeaInterjection === "function") executeTeaInterjection(q);
      }
    });
  }
  if (el("btnCandlelitDone")) {
    el("btnCandlelitDone").addEventListener("click", function () {
      sound.unlock();
      if (typeof finishCandlelitNightReview === "function") finishCandlelitNightReview();
    });
  }

  el("btnSubmitSpeech").addEventListener("click", submitPlayerSpeech);

  function sendQuickFreeSpeech() {
    const qIn = el("quickFreeInput");
    if (!qIn) return;
    let val = qIn.value.trim();
    if (!val && typeof composePlayerPitSpeechText === "function") {
      val = composePlayerPitSpeechText().trim();
    }
    if (!val) {
      showToast("請擇一張茶牌發聲，或先寫下你的陳詞。", "warn");
      return;
    }
    el("playerSpeechInput").value = val;
    qIn.value = "";
    refreshQuickFreeInputHint();
    submitPlayerSpeech();
  }
  el("btnQuickFreeSend").addEventListener("click", sendQuickFreeSpeech);
  el("quickFreeInput").addEventListener("input", function () {
    state.match.rewriteCritReady = false;
    if (el("playerSpeechInput")) el("playerSpeechInput").value = el("quickFreeInput").value;
    if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(el("quickFreeInput"));
    refreshQuickFreeInputHint();
    refreshLiveNlpUI();
  });
  el("quickFreeInput").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      sendQuickFreeSpeech();
    }
  });
  // v24.2 Mobile virtual-keyboard viewport guard: keep input & send CTA visible when soft keyboard opens
  ["quickFreeInput", "lastWordsFreeInput", "sheriffPlayerInput"].forEach(function (inId) {
    const inp = el(inId);
    if (!inp) return;
    inp.addEventListener("focus", function () {
      if (typeof window !== "undefined" && window.innerWidth <= 767) {
        setTimeout(function () {
          try { inp.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
        }, 260);
      }
    });
  });
  if (typeof window !== "undefined" && window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
    window.visualViewport.addEventListener("resize", function () {
      if (window.innerWidth > 767) return;
      const active = document.activeElement;
      if (active && (active.id === "quickFreeInput" || active.id === "lastWordsFreeInput" || active.id === "sheriffPlayerInput")) {
        try { active.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
      }
    });
  }

  if (el("btnQuickSpiceDemo")) {
    el("btnQuickSpiceDemo").addEventListener("click", function () {
      sound.unlock();
      const qIn = el("quickFreeInput");
      if (!qIn) return;
      const pid = getPlayerId();
      const pSelfSpice = getPlayerSeat();
      const isWolfSpice = Boolean(pSelfSpice && pSelfSpice.role === "wolf");
      const aliveOthers = getAliveSeats().filter(function (s) {
        return s.id !== pid && (!isWolfSpice || s.role !== "wolf");
      });
      const selSpice = getSeat(state.selectedSeatId);
      const t = (selSpice && selSpice.id !== pid && selSpice.alive && (!isWolfSpice || selSpice.role !== "wolf"))
        ? selSpice
        : (aliveOthers[0] || { id: pid === 1 ? 2 : 1, name: "夥伴" });
      const roasts = [
        fmtSeatNum(t.id) + "號好了啦別演了，講那什麼胡說八道的風向！",
        "笑死，" + fmtSeatNum(t.id) + "號剛那段簡直邏輯死亡，少裝了好不好！",
        fmtSeatNum(t.id) + "號講完可以下去吧，根本在演給好人看！",
        fmtSeatNum(t.id) + "號閉嘴啦，亂玩一通還在硬拗帶節奏！"
      ];
      state.match.rewriteCritReady = false;
      const pickedRoast = roasts[((state.match.day || 1) + t.id) % roasts.length];
      qIn.value = pickedRoast;
      if (el("playerSpeechInput")) el("playerSpeechInput").value = pickedRoast;
      if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(qIn);
      refreshQuickFreeInputHint();
      refreshLiveNlpUI();
      sound.tone(420, 0.07, "triangle", 0.045, 0);
      showToast("語氣稍急，不妨從上方三張靈感籤挑一句更婉轉的說法。", "warn");
    });
  }

  if (el("btnQuickInlineRewrite")) {
    el("btnQuickInlineRewrite").addEventListener("click", function () {
      sound.unlock();
      const qIn = el("quickFreeInput");
      if (!qIn || !qIn.value.trim()) return;
      state.rephraseTrayPinned = true;
      if (typeof renderRephraseChoicesTray === "function") {
        renderRephraseChoicesTray(qIn.value);
        showToast("已展開三張換句話說靈感籤，請挑選最合心意的切角。", "emerald");
      }
    });
  }

  if (el("btnRebuildFromPits")) {
    el("btnRebuildFromPits").addEventListener("click", function () {
      sound.unlock();
      if (typeof syncDraftSpeechToInput === "function") syncDraftSpeechToInput();
      const qIn = el("quickFreeInput");
      if (qIn && typeof qIn.focus === "function") qIn.focus();
      sound.tone(600, 0.06, "triangle", 0.04, 0);
      showToast("已依進階排坑與亮牌選項重新組句。", "emerald");
    });
  }

  if (el("btnClearSpeechDraft")) {
    el("btnClearSpeechDraft").addEventListener("click", function () {
      sound.unlock();
      if (typeof clearPlayerDraftPits === "function") clearPlayerDraftPits();
      if (el("rephraseChoicesTray")) el("rephraseChoicesTray").classList.add("hidden");
      const qIn = el("quickFreeInput");
      if (qIn && typeof qIn.focus === "function") qIn.focus();
      sound.tone(360, 0.05, "sine", 0.03, 0);
    });
  }

  if (el("quickStancePills")) {
    el("quickStancePills").querySelectorAll("[data-stance]").forEach(function (pill) {
      pill.addEventListener("click", function () {
        sound.unlock();
        const stance = pill.getAttribute("data-stance");
        const pid = getPlayerId();
        const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
        const target = getSeat(state.selectedSeatId) && state.selectedSeatId !== pid && getSeat(state.selectedSeatId).alive
          ? getSeat(state.selectedSeatId)
          : (aliveOthers[0] || { id: pid === 1 ? 2 : 1, name: "夥伴" });
        const tTag = fmtSeatNum(target.id) + "號" + target.name;
        const templates = {
          accuse: "我心平氣和比對了一下，覺得 " + tTag + " 剛才的說法有些矛盾，建議這輪優先檢視 " + target.id + "號！",
          vouch: "聽完 " + tTag + " 的分析我覺得真誠有條理，這輪我選擇相信 " + target.id + "號 是好人夥伴！",
          peace: "請大家保持三好風度、別被酸言帶風向，我們冷靜把選票集中投給邏輯最不合的人！"
        };
        const snippet = templates[stance] || "";
        const qIn = el("quickFreeInput");
        if (qIn && snippet) {
          const cur = qIn.value.trim();
          const nextVal = (!cur || cur.indexOf(snippet) !== -1)
            ? snippet
            : (cur + (/[。！？\n]$/.test(cur) ? " " : "，") + snippet);
          qIn.value = nextVal;
          if (el("playerSpeechInput")) el("playerSpeechInput").value = nextVal;
          state.match.rewriteCritReady = false;
          if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(qIn);
          if (typeof qIn.focus === "function") qIn.focus();
          refreshQuickFreeInputHint();
          refreshLiveNlpUI();
        }
        sound.tone(580, 0.07, "triangle", 0.04, 0);
      });
    });
  }
}

function bindNightVoteAndFourGEvents() {
  el("btnConfirmTarget").addEventListener("click", confirmTargetAction);
  el("btnSkipAction").addEventListener("click", skipTargetAction);

  el("btnWitchHeal").addEventListener("click", function () {
    sound.unlock();
    if (state.match.phase !== "NIGHT_WITCH" || !state.match.witchPotions.heal) return;
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    const victim = getSeat(state.match.nightState.wolfTarget);
    if (!victim) return;
    const twinTeaHeal = state.match.variantMode === "twin_tea";
    if (victim.id === getPlayerId() && (state.match.day >= 2 || twinTeaHeal)) {
      showToast(twinTeaHeal && state.match.day === 1
        ? "雙刃毒茗局規則：首夜滴水奉茶師不可自救！"
        : "依茶席規則，第 2 夜起滴水奉茶師不可自護！", "warn");
      return;
    }
    state.match.nightState.witchSaved = true;
    state.match.witchPotions.heal = false;
    state.match.stats.nightSkillUsed += 1;
    getPlayerSeat().savedSeatId = victim.id;
    sound.playBlessing();
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      stage3d.triggerSkillFx("witch_heal", getPlayerId(), victim.id);
      if (typeof stage3d.triggerCameraPunch === "function") stage3d.triggerCameraPunch(victim.id, { fov: 40, durationMs: 1200 });
    }
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#34d399", 400, 0.3);
    spawnBeam(getPlayerId(), victim.id, "#34d399", "trust", 640);
    spawnBurst(victim.id, ["#34d399", "#a7f3d0", "#fde68a"], 20, "ring");
    setSeatEmotion(victim.id, "happy", 2800);
    spawnFx(victim.id, "回甘茶護回", "#34d399", { scale: 1.15, durationMs: 1600 });
    addThreeGoodPoint("deeds", "做好事奉茶護回夥伴");
    addLog({ kind: "secret", title: "端出暖心回甘茶護回 " + victim.id + "號。", text: "" });
    resolveDawn();
  });

  el("btnWitchPurify").addEventListener("click", function () {
    sound.unlock();
    if (state.match.phase !== "NIGHT_WITCH" || !state.match.witchPotions.purify) return;
    const twinTeaPurify = state.match.variantMode === "twin_tea";
    if (state.match.day === 1 && !twinTeaPurify) {
      showToast("常規茶席第 2 夜起才開放端出清心醒神茶。", "warn");
      return;
    }
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    const target = getSeat(state.selectedSeatId);
    if (!target || !target.alive || target.id === getPlayerId()) {
      showToast("先點圓桌選要端清心茶請離誰！", "warn");
      return;
    }
    state.match.nightState.witchPoisonTarget = target.id;
    state.match.witchPotions.purify = false;
    state.match.stats.nightSkillUsed += 1;
    getPlayerSeat().purifiedSeatId = target.id;
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      stage3d.triggerSkillFx("witch_poison", getPlayerId(), target.id);
      if (typeof stage3d.triggerCameraPunch === "function") stage3d.triggerCameraPunch(target.id, { fov: 39.5, durationMs: 1250 });
    }
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#a78bfa", 420, 0.32);
    spawnBeam(getPlayerId(), target.id, "#a78bfa", "grill", 680);
    spawnBurst(target.id, ["#c084fc", "#f43f5e", "#ffffff"], 22, "slash");
    spawnFx(target.id, "清心醒神請離", "#c084fc", { scale: 1.15, durationMs: 1650 });
    addLog({ kind: "secret", title: "已端清心醒神茶請 " + target.id + "號天亮離席冷靜。", text: "" });
    resolveDawn();
  });

  if (el("btnWolfSelfExplode")) {
    el("btnWolfSelfExplode").addEventListener("click", function () {
      sound.unlock();
      if (typeof triggerWolfSelfExplode === "function") {
        triggerWolfSelfExplode(getPlayerId());
      }
    });
  }

  if (el("btnHopeConfrontClose")) {
    el("btnHopeConfrontClose").addEventListener("click", function () {
      if (typeof closeHopeConfrontationModal === "function") closeHopeConfrontationModal();
    });
  }

  if (el("btnHopeConfrontStart")) {
    el("btnHopeConfrontStart").addEventListener("click", function () {
      sound.unlock();
      const hc = state.match && state.match.hopeConfrontation;
      if (!hc || !Array.isArray(hc.draftIds) || hc.draftIds.length !== 2) return;
      if (typeof executeHopeConfrontation === "function") {
        executeHopeConfrontation(hc.draftIds[0], hc.draftIds[1]);
      }
    });
  }

  if (el("btnSpiritBetSkip")) {
    el("btnSpiritBetSkip").addEventListener("click", function () {
      if (typeof closeSpiritRoundBet === "function") closeSpiritRoundBet(true);
    });
  }

  el("btnCastVote").addEventListener("click", function () {
    if (state.match.phase !== "DAY_VOTE" || !isPlayerEligibleToVote() || (state.voteFlight && state.voteFlight.active)) return;
    const target = getSeat(state.selectedSeatId);
    if (!target || !isValidVoteTarget(target.id)) {
      showToast(isPkVoteActive()
        ? "平票 PK 決選請點選 PK 台上的候選人（或棄票）！"
        : ("先點圓桌 1~" + state.match.totalSeats + "號 選要投誰！"), "warn");
      return;
    }
    finalizeVoteRound(target.id);
  });

  el("btnAbstainVote").addEventListener("click", function () {
    if (state.match.phase !== "DAY_VOTE" || !isPlayerEligibleToVote() || (state.voteFlight && state.voteFlight.active)) return;
    finalizeVoteRound(null);
  });

  el("btn4GConfidence").addEventListener("click", useFourGConfidence);
  el("btn4GJoy").addEventListener("click", useFourGJoy);
  el("btn4GHope").addEventListener("click", useFourGHope);
  el("btn4GConvenience").addEventListener("click", useFourGConvenience);
  if (el("btnQuick4GConfidence")) el("btnQuick4GConfidence").addEventListener("click", useFourGConfidence);
  if (el("btnQuick4GJoy")) el("btnQuick4GJoy").addEventListener("click", useFourGJoy);
  if (el("btnQuick4GHope")) el("btnQuick4GHope").addEventListener("click", useFourGHope);
  if (el("btnQuick4GConvenience")) el("btnQuick4GConvenience").addEventListener("click", useFourGConvenience);
  if (el("btnQuickLotus")) {
    el("btnQuickLotus").addEventListener("click", function () {
      sound.unlock();
      if (typeof openRoleGuidePopover === "function") openRoleGuidePopover("threegood");
    });
  }
  const showAtmToast = function () {
    sound.unlock();
    const score = (typeof state !== "undefined" && state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72;
    const atm = typeof getTeaAtmosphereState === "function" ? getTeaAtmosphereState(score) : { id: "calm", label: "茶席平瀾", desc: "理性推理中" };
    if (typeof showToast === "function") {
      showToast(atm.label + "（友善度 " + score + "）：" + atm.desc, atm.id === "fog" ? "warn" : "emerald");
    }
  };
  if (el("btnQuickTeaAtmosphere")) el("btnQuickTeaAtmosphere").addEventListener("click", showAtmToast);
  if (el("teaAtmosphereBadge")) el("teaAtmosphereBadge").addEventListener("click", showAtmToast);

  // v10.3 Collapsible Four-Givings Pouch: click header pill to toggle open/close cleanly on both touch and desktop
  if (el("fourGDeckHeader") && el("cornerFourGDeck")) {
    el("fourGDeckHeader").addEventListener("click", function (ev) {
      ev.stopPropagation();
      sound.unlock();
      el("cornerFourGDeck").classList.toggle("is-fan-open");
    });
    ["btn4GConfidence", "btn4GJoy", "btn4GHope", "btn4GConvenience"].forEach(function (bid) {
      const b = el(bid);
      if (b) {
        b.addEventListener("click", function () {
          el("cornerFourGDeck").classList.remove("is-fan-open");
        });
      }
    });
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("click", function (ev) {
        const deck = el("cornerFourGDeck");
        if (!deck || !deck.classList.contains("is-fan-open")) return;
        const tgt = ev && ev.target;
        if (tgt && typeof deck.contains === "function" && deck.contains(tgt)) return;
        deck.classList.remove("is-fan-open");
      });
    }
  }

  // Live plain-language hover/focus preview on Four-Givings cards so players never have to guess what a card does!
  ["btn4GConfidence", "btn4GJoy", "btn4GHope", "btn4GConvenience"].forEach(function (bid) {
    const b = el(bid);
    if (!b) return;
    const showPreview = function () {
      const head = el("fourGDeckHeader");
      if (!head) return;
      const exp = b.getAttribute("data-fg-explain") || b.title || "";
      if (exp) {
        head.textContent = exp;
        head.classList.add("is-previewing");
      }
    };
    const clearPreview = function () {
      const head = el("fourGDeckHeader");
      if (!head) return;
      head.classList.remove("is-previewing");
      head.textContent = head.getAttribute("data-default-text") || "四給奉茶 · 點盞施禮";
    };
    b.addEventListener("pointerenter", showPreview);
    b.addEventListener("focus", showPreview);
    b.addEventListener("pointerleave", clearPreview);
    b.addEventListener("blur", clearPreview);
  });

  if (el("btnRoleGuide")) {
    el("btnRoleGuide").addEventListener("click", function () {
      sound.unlock();
      if (typeof openRoleGuidePopover === "function") openRoleGuidePopover("role");
    });
  }
  if (el("liveToolkitStrip")) {
    el("liveToolkitStrip").addEventListener("click", function () {
      sound.unlock();
      if (typeof openRoleGuidePopover === "function") openRoleGuidePopover("role");
    });
  }
  if (el("threeGoodMeters")) {
    el("threeGoodMeters").addEventListener("click", function () {
      sound.unlock();
      if (typeof openRoleGuidePopover === "function") openRoleGuidePopover("threegood");
    });
  }
  if (el("btnCloseRoleGuide")) {
    el("btnCloseRoleGuide").addEventListener("click", function () {
      if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
    });
  }

  if (el("btnSheriffRally")) {
    el("btnSheriffRally").addEventListener("click", function () {
      if (typeof useSheriffRallyCall === "function") useSheriffRallyCall();
    });
  }
  if (el("btnShatterSheriffBadge")) {
    el("btnShatterSheriffBadge").addEventListener("click", function () {
      if (typeof resolvePlayerSheriffTransfer === "function") resolvePlayerSheriffTransfer(null);
    });
  }
  if (el("btnSheriffRun")) {
    el("btnSheriffRun").addEventListener("click", function () {
      if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction("run");
    });
  }
  if (el("btnSheriffStartSpeech")) {
    el("btnSheriffStartSpeech").addEventListener("click", function () {
      if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction("listen");
    });
  }
  if (el("btnSheriffNextSpeech")) {
    let lastSheriffNextAt = 0;
    el("btnSheriffNextSpeech").addEventListener("click", function (ev) {
      const now = Date.now();
      if (ev && ev.isTrusted && (now - lastSheriffNextAt) < 260) return;
      lastSheriffNextAt = now;
      if (typeof advanceSheriffSpeechTurn === "function") advanceSheriffSpeechTurn();
    });
  }
  const sendEditedSheriffSpeech = function () {
    const inp = el("sheriffPlayerInput");
    const rawVal = inp ? inp.value : "";
    const shCtx = state.match && state.match.sheriffElectionCtx;
    const meta = shCtx && shCtx._draftCardMeta ? shCtx._draftCardMeta : null;
    const opts = meta && meta.withdrawAfter && /退水|讓出警徽|禮讓/.test(rawVal)
      ? { withdrawAfter: true }
      : undefined;
    if (shCtx) shCtx._draftCardMeta = null;
    if (typeof submitPlayerSheriffSpeech === "function") submitPlayerSheriffSpeech(rawVal, null, opts);
  };
  if (el("btnSheriffPlayerSend")) {
    el("btnSheriffPlayerSend").addEventListener("click", sendEditedSheriffSpeech);
  }
  if (el("sheriffPlayerInput")) {
    el("sheriffPlayerInput").addEventListener("input", function () {
      if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(el("sheriffPlayerInput"));
    });
    el("sheriffPlayerInput").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        sendEditedSheriffSpeech();
      }
    });
  }
  if (el("btnSheriffWithdraw")) {
    el("btnSheriffWithdraw").addEventListener("click", function () {
      if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction("withdraw");
    });
  }
  if (el("btnSheriffPass")) {
    el("btnSheriffPass").addEventListener("click", function () {
      if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction("pass");
    });
  }
  if (el("btnSheriffOrderCW")) {
    el("btnSheriffOrderCW").addEventListener("click", function () {
      if (typeof resolveSheriffOrderPick === "function") resolveSheriffOrderPick(1);
    });
  }
  if (el("btnSheriffOrderCCW")) {
    el("btnSheriffOrderCCW").addEventListener("click", function () {
      if (typeof resolveSheriffOrderPick === "function") resolveSheriffOrderPick(-1);
    });
  }
  if (el("wolfTacticRow")) {
    el("wolfTacticRow").querySelectorAll("[data-wolf-tactic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const tac = btn.getAttribute("data-wolf-tactic") || "fake_seer";
        if (typeof applyWolfNightTactic === "function") {
          applyWolfNightTactic(tac);
        } else {
          state.match.wolfTactic = tac;
        }
        el("wolfTacticRow").querySelectorAll("[data-wolf-tactic]").forEach(function (o) {
          o.classList.toggle("is-active", o === btn);
        });
        const tacLabels = {
          fake_seer: "夜間指令：狼同伴明日將跳明心觀察員帶風向！",
          deep_stealth: "夜間指令：狼同伴明日將低調倒鉤絕不露綻！",
          pack_push: "夜間指令：狼同伴明日發言與投票將全力配合你的目標！"
        };
        sound.tone(560, 0.08, "triangle", 0.05, 0);
        showToast(tacLabels[tac] || "已更新狼隊戰術指令", "emerald");
      });
    });
  }
}

function bindGameEvents() {
  bindMatchFlowEvents();
  bindIntelAndDetectiveEvents();
  bindSpeechInputEvents();
  bindNightVoteAndFourGEvents();
}
