/**
 * 開局初始化、新手帶玩局、勝負條件判定與提早觀戰結算
 */
"use strict";

function clearTransientMatchTimers() {
  if (typeof clearSkyCurtainTimer === "function") clearSkyCurtainTimer(true);
  if (typeof clearDeferredSpeechPrefetchTimer === "function") clearDeferredSpeechPrefetchTimer();
  if (state._lwCueTimer) {
    clearTimeout(state._lwCueTimer);
    state._lwCueTimer = null;
  }
  state._dawnLwFlush = null;
  if (typeof indieFlow !== "undefined" && indieFlow) {
    indieFlow.onRoleDealClosed = null;
  }
  if (state.voteFlight && Array.isArray(state.voteFlight.timers)) {
    state.voteFlight.timers.forEach(function (t) { clearTimeout(t); });
  }
  state.voteFlight = null;
  state.voteLeaderId = null;
  if (el("voteFlightBanner")) el("voteFlightBanner").classList.add("hidden");
  if (typeof clearWolfScreenTacticTimer === "function") clearWolfScreenTacticTimer();
  if (typeof clearBlitzVoteTimer === "function") clearBlitzVoteTimer();
  if (typeof closeHopeConfrontationModal === "function") closeHopeConfrontationModal();
  if (typeof closeSpiritRoundBet === "function") closeSpiritRoundBet(false);
  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.remove("is-match-point", "is-seat-focus-vignette");
  }
  if (el("matchPointBadge")) el("matchPointBadge").classList.add("hidden");
  if (state._lanternVeilTimer) {
    clearTimeout(state._lanternVeilTimer);
    state._lanternVeilTimer = null;
  }
  if (el("lanternOutVeil")) el("lanternOutVeil").classList.remove("is-active");
  if (typeof stage3d !== "undefined") {
    if (stage3d.env) stage3d.env.lanternBlackoutUntil = 0;
    if (stage3d.seats && typeof reset3DSeatGazeState === "function") {
      reset3DSeatGazeState(stage3d.seats);
    }
  }
  if (state._wolfExplodeTimer) {
    clearTimeout(state._wolfExplodeTimer);
    state._wolfExplodeTimer = null;
  }
  if (state._wolfExplodeCapTimer) {
    clearTimeout(state._wolfExplodeCapTimer);
    state._wolfExplodeCapTimer = null;
  }
  if (state.match) {
    state.match.isMatchPoint = false;
    state.match._wolfExplodePendingNight = false;
  }
}

function startGuidedBeginnerMatch() {
  if (el("modalTutorial")) el("modalTutorial").classList.add("hidden");
  state.activeVariant = "standard";
  el("selectModeCount").value = "6";
  el("selectPreferredRole").value = "seer";
  if (el("selectAiDifficulty")) el("selectAiDifficulty").value = "easy";
  if (el("chkSheriffMode")) el("chkSheriffMode").checked = false;
  if (el("chkGuardMode")) el("chkGuardMode").checked = false;
  state.coachEnabled = true;
  state.autoPlay = false;
  startNewGame();
  if (state.match) state.match.guidedBeginner = true;
  if (typeof renderBeginnerCoachBanner === "function") renderBeginnerCoachBanner();
}

/**
 * v20.0 評審 150 秒全亮點導覽局（第 2 日五人聽牌高潮盤：雙觀察員對跳＋第 1 日言票背離＋舉杯追問＋四給奉茶護席／明燈對質＋一輪直達終局真相覆盤）
 * 嚴格遵守零洩漏盲視結構：所有欄位與一般正規對局完全一致，僅將開局推進至第 2 日末段五人聽牌焦點回合。
 */
function startJudgeShowcaseMatch() {
  sound.unlock();
  clearStepTimer();
  clearTransientMatchTimers();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  if (el("modalTutorial")) el("modalTutorial").classList.add("hidden");
  if (el("setupDrawer")) el("setupDrawer").classList.add("hidden");
  if (typeof indieFlow !== "undefined" && typeof indieFlow.hideRoleDealRitual === "function") {
    indieFlow.hideRoleDealRitual({ silent: true });
  }
  if (typeof stage3d !== "undefined" && stage3d.showcaseMode && typeof stage3d.setShowcaseMode === "function") {
    stage3d.setShowcaseMode(false);
  }
  if (typeof state._preSpectatorAutoPlay === "boolean") {
    state._preSpectatorAutoPlay = null;
  }
  if (typeof state._preSpectatorFxPacing === "string") {
    state.fxPacing = state._preSpectatorFxPacing;
    state._preSpectatorFxPacing = null;
    if (typeof document !== "undefined" && document.body && document.body.classList) {
      document.body.classList.toggle("fx-pacing-fast", state.fxPacing === "fast");
    }
  }
  state.spectatorFastForward = false;
  state.autoPlay = false;
  state.speakingInFlight = false;
  state.selectedSeatId = null;
  state.intelSeatId = null;
  state.seerReveal = null;
  state.voteResultPayload = null;
  state.activeSpeakerId = null;
  state.activeClash = null;
  state.lastWordsCtx = null;
  state.voteFlight = null;
  closeSeatIntel();
  closeRadialMenu();
  if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
  if (typeof clearCutInQueue === "function") clearCutInQueue();
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  if (el("lastWordsFreeInput")) el("lastWordsFreeInput").value = "";
  if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  if (el("btnQuickFreeSend")) el("btnQuickFreeSend").textContent = "陳詞送出 ↵";
  if (el("speechThreeGoodBadge")) el("speechThreeGoodBadge").classList.add("hidden");
  if (el("btnQuickInlineRewrite")) el("btnQuickInlineRewrite").classList.add("hidden");
  state.aiDifficulty = "normal";
  state.ruleDepth = "full";
  state.sheriffMode = true;
  state.guardMode = true;
  if (el("selectModeCount")) el("selectModeCount").value = "8";
  if (el("selectPreferredRole")) el("selectPreferredRole").value = "seer";
  if (el("selectAiDifficulty")) el("selectAiDifficulty").value = "normal";
  if (el("selectRuleDepth")) el("selectRuleDepth").value = "full";
  if (el("chkSheriffMode")) el("chkSheriffMode").checked = true;
  if (el("chkGuardMode")) el("chkGuardMode").checked = true;
  if (typeof orchestrator !== "undefined") orchestrator.beginNewEpoch("judge_showcase");

  const fixedSpecs = [
    { id: 1, name: "你", trait: "玩家", deductionStyle: "balanced", color: "#f5b942", role: "seer", alive: true, claimedRole: "seer", microPulse: 18 },
    { id: 2, pIdx: 0, role: "villager", alive: true, claimedRole: null, microPulse: 21 },
    { id: 3, pIdx: 1, role: "witch", alive: true, claimedRole: "witch", microPulse: 24 },
    { id: 4, pIdx: 2, role: "wolf", alive: true, claimedRole: "seer", fakeSeer: true, microPulse: 88 },
    { id: 5, pIdx: 3, role: "hunter", alive: true, claimedRole: null, microPulse: 26 },
    { id: 6, pIdx: 4, role: "villager", alive: false, outReason: "投票出局", claimedRole: null, microPulse: 28 },
    { id: 7, pIdx: 5, role: "wolf", alive: false, outReason: "清心醒神茶請離", claimedRole: null, microPulse: 79 },
    { id: 8, pIdx: 6, role: "guard", alive: false, outReason: "夜襲離席", claimedRole: null, microPulse: 22 }
  ];

  const seats = fixedSpecs.map(function (sp) {
    const pInfo = typeof sp.pIdx === "number" ? (AI_PERSONAS[sp.pIdx] || AI_PERSONAS[0]) : sp;
    const sus = {};
    for (let k = 1; k <= 8; k++) sus[k] = k === sp.id ? 0 : 46;
    if (sp.role !== "wolf") {
      sus[4] = 74;
      sus[7] = 68;
      sus[1] = 28;
      sus[2] = 24;
      sus[3] = 26;
    } else {
      sus[1] = 78;
      sus[2] = 72;
      sus[4] = 10;
      sus[7] = 10;
    }
    return {
      id: sp.id,
      name: sp.id === 1 ? "你" : pInfo.name,
      trait: sp.id === 1 ? "玩家" : pInfo.trait,
      deductionStyle: pInfo.deductionStyle || "balanced",
      color: sp.id === 1 ? "#f5b942" : pInfo.avatarColor,
      role: sp.role,
      team: ROLE_DEFS[sp.role].team,
      alive: sp.alive,
      outReason: sp.outReason || "",
      emojiMood: "",
      sweatExposed: false,
      suspicionMap: sus,
      trustShield: false,
      microPulse: sp.microPulse,
      fakeSeer: Boolean(sp.fakeSeer),
      fakeCheckedIds: sp.id === 4 ? [7] : [],
      isWolfKing: false,
      isElder: false,
      elderShieldUsed: false,
      voteDisabled: false,
      claimedRole: sp.claimedRole || null,
      checkedHistory: sp.id === 1
        ? [{ day: 1, targetId: 2, isWolf: false }, { day: 2, targetId: 4, isWolf: true }]
        : [],
      savedSeatId: null,
      witchAnnouncedSave: false,
      purifiedSeatId: sp.id === 3 ? 7 : null
    };
  });

  const bf1 = {
    ownerId: 1,
    dayDeclared: 1,
    firstTargetId: 4,
    secondTargetId: 7,
    mode: "dual",
    claimedRole: "seer",
    updatedFrom: "election"
  };

  const day1Speeches = [
    { day: 1, speakerId: 1, claimRole: "seer", checkedGoodId: 2, vouchId: 2, accuseId: 4, wolfPits: [4], goodPits: [2], rawText: "我是真明心觀察員，昨夜靜心查驗 2號小澄是好人金水，警徽流先驗 4號阿松再看 7號阿竹，請大家理性聽盤。" },
    { day: 1, speakerId: 4, claimRole: "seer", checkedGoodId: 7, vouchId: 7, accuseId: 1, wolfPits: [1, 6], goodPits: [7], hasToxicSlip: true, rawText: "別演了，1號根本亂跳！我才是觀察員，昨夜驗了 7號阿竹是好人，今天先把起鬨的 6號小雲請離！" },
    { day: 1, speakerId: 7, claimRole: null, vouchId: 4, accuseId: 5, standWithSeerId: 4, wolfPits: [5], goodPits: [4], rawText: "我聽起來 4號阿松比較像真觀察員，前置位 5號星兒發言太滑水，我這輪準備把票點向 5號星兒。" },
    { day: 1, speakerId: 2, claimRole: null, vouchId: 1, accuseId: 4, standWithSeerId: 1, wolfPits: [4], goodPits: [1], rawText: "我接了 1號的金水，對照警上邏輯 4號語氣太衝，我堅定站邊 1號觀察員。" }
  ];

  const day2PriorSpeeches = [
    { day: 2, speakerId: 2, claimRole: null, vouchId: 1, accuseId: 4, standWithSeerId: 1, wolfPits: [4], goodPits: [1, 3], rawText: "場上只剩五人聽牌，回看第 1 天票型，7號嘴上說打 5號卻跟 4號同票衝走 6號，現在 7號已經被奉茶師清心請離，4號幾乎沒退路了。" },
    { day: 2, speakerId: 3, claimRole: "witch", vouchId: 1, accuseId: 4, standWithSeerId: 1, wolfPits: [4], goodPits: [1, 2], rawText: "我亮滴水奉茶師身分，第 1 夜平安是守衛擋下，昨晚見 7號言票背離太重已端清心醒神茶請他離席，今天跟著 1號警長歸票收尾。" },
    { day: 2, speakerId: 5, claimRole: null, vouchId: 1, accuseId: 4, standWithSeerId: 1, wolfPits: [4], goodPits: [1, 2, 3], rawText: "我是直心糾察長，昨天 7號喊打我卻改票衝 6號，跟 4號完全綁在一起。先聽 4號怎麼圓，等下看 1號警長壓軸定調。" }
  ];

  const day1Votes = {
    day: 1,
    outId: 6,
    tallies: { 6: 5, 4: 3.5 },
    ballots: [
      { voterId: 1, targetId: 4, weight: 1.5 },
      { voterId: 2, targetId: 4, weight: 1 },
      { voterId: 3, targetId: 6, weight: 1 },
      { voterId: 4, targetId: 6, weight: 1 },
      { voterId: 5, targetId: 6, weight: 1 },
      { voterId: 6, targetId: 4, weight: 1 },
      { voterId: 7, targetId: 6, weight: 1 },
      { voterId: 8, targetId: 6, weight: 1 }
    ]
  };

  state.selectedSeatId = 4;
  state.cardPeek3D = false;
  state.intelSeatId = null;
  closeSeatIntel();
  closeRadialMenu();
  if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
  state.speakingInFlight = false;
  if (typeof clearCutInQueue === "function") clearCutInQueue();
  state.seerReveal = null;
  state.voteResultPayload = null;
  state.activeSpeakerId = null;
  state.activeClash = null;
  state.lastWordsCtx = null;
  state.voteFlight = null;
  state.playerMarks = { 2: "good", 3: "good", 4: "wolf", 7: "wolf" };
  state.listenPitCollapsed = false;
  state.activeBubble = null;
  state.seatBubbles = {};
  state.beamFx = [];
  state.fxPopups = [];
  state.burstParticles = [];
  state.ripples = [];
  state.seatMoods = {};
  state.seatPhysics = {};
  state.dragAction = { active: false, moved: false, fromId: null, startX: 0, startY: 0, curX: 0, curY: 0, snapId: null };

  state.match = {
    started: true,
    judgeShowcase: true,
    judgeShowcaseScript: {
      day2AsongUsed: false,
      day2AsongText: "各位別急著一面倒啊，昨天 7號怎麼投票是他的事，跟我無關！我才是一路扛壓的真明心觀察員，昨夜查了 1號，他才是穿我衣服的假觀察員，這輪聽我一次，先出 5號或 1號，過。",
      lwAsongText: "唉，算你們票型對得夠細，昨晚 7號被請離後我本來想再硬扛一輪的。這局輸得心服口服，茶席推論確實精彩！"
    },
    judgeGuideDismissed: false,
    phase: "DAY_SPEECH",
    day: 2,
    totalSeats: 8,
    playerSeatId: 1,
    sheriffSeatId: 1,
    goodwillVoteBonus: false,
    convenienceRallyTargetId: null,
    clearBreezeUsedDay: 0,
    activeDirectorEvent: (typeof TEA_DIRECTOR_EVENTS !== "undefined")
      ? (TEA_DIRECTOR_EVENTS.find(function (e) { return e.id === "fourg_echo"; }) || TEA_DIRECTOR_EVENTS[0])
      : null,
    usedDirectorEventIds: ["fourg_echo"],
    directorEventClearedDay: 0,
    orchestratorSummary: null,
    quickReactedMap: {},
    aiDifficulty: "normal",
    ruleDepth: "full",
    startOffset: 0,
    spectatorPrompted: false,
    harmonyScore: 78,
    threeGood: { heart: 1, words: 1, deeds: 0, resonanceTriggered: false, milestones: { heart: true, words: true, deeds: false } },
    combo: 2,
    maxCombo: 2,
    comboBoostReady: true,
    pinnedClues: [
      { id: "judge_clue_1", seatId: 7, tag: "7號言票背離", summary: "第 1 天 7號阿竹口頭點名 5號星兒，實際公投卻改投 6號小雲並與 4號阿松同票。", kind: "contradiction" }
    ],
    tableReactions: [],
    publicInterjections: [],
    interjectUsedDay: 0,
    candlelitReview: null,
    candlelitWatchIds: [],
    candlelitFreeInspectUsedDay: 0,
    caughtSpeechClues: {},
    wolfGodMarks: {},
    rewriteCritReady: false,
    seats: seats,
    playerKnownRoles: { 1: "seer", 2: "good_verified", 4: "wolf" },
    witchPotions: { heal: true, purify: false },
    nightState: { guardTarget: 1, wolfTarget: 8, seerTarget: 4, witchSaved: false, witchPoisonTarget: 7 },
    lastGuardTargetId: 1,
    nightArchive: [
      { day: 1, guardId: 8, guardTarget: 3, wolfTarget: 3, seerId: 1, seerTarget: 2, seerIsWolf: false, witchId: 3, witchSaved: false, witchPoisonTarget: null, casualties: [] },
      { day: 2, guardId: 8, guardTarget: 1, wolfTarget: 8, seerId: 1, seerTarget: 4, seerIsWolf: true, witchId: 3, witchSaved: false, witchPoisonTarget: 7, casualties: [{ id: 8, cause: "wolf" }, { id: 7, cause: "purify" }] }
    ],
    firstNightIntel: { seerTarget: 2, isWolf: false },
    peaceNights: [1],
    detectedContradictions: [],
    microInspectCountToday: 0,
    microInspectedSeats: {},
    wolfTactic: "mate_fake_seer_gold",
    variantMode: "standard",
    isMatchPoint: true,
    _voteFinalizing: false,
    hopeConfrontation: null,
    wolfExplodedToday: false,
    wolfExplodedDay: 0,
    aiWolfExplosions: 0,
    _wolfExplodePendingNight: false,
    interjectBonusCharges: 0,
    guardAwakenBonusWeightDay: 0,
    guardBlockedLastNight: false,
    spiritBet: { active: null, history: [], streak: 0, bestStreak: 0, totalBonusPts: 0 },
    sheriffRallyUsedDay: 0,
    sheriffElectionPending: false,
    pendingDawnAfterSheriff: false,
    dawnAfterSheriffRan: false,
    sheriffElectionCtx: null,
    sheriffVoteRecord: {
      day: 1,
      winnerId: 1,
      candidateIds: [1, 4],
      seerClaimIds: [1, 4],
      withdrawnIds: [],
      ballots: [
        { voterId: 2, targetId: 1 },
        { voterId: 3, targetId: 1 },
        { voterId: 5, targetId: 1 },
        { voterId: 6, targetId: 4 },
        { voterId: 7, targetId: 4 },
        { voterId: 8, targetId: 1 }
      ]
    },
    sheriffBadgeFlow: bf1,
    sheriffBadgeFlowsBySeat: { 1: bf1 },
    badgeFlowSignals: [],
    sheriffOrderCtx: null,
    pendingVotedHunterId: null,
    pendingSheriffTransfer: null,
    pendingEvidenceTargetId: null,
    pendingEvidenceTag: "",
    playerDraftPits: { wolfIds: [4], goodIds: [2, 3, 5], claimRole: "seer", standSeerId: null, evidenceClueId: null, turnKey: "" },
    _preparedSpeechTurnKey: "",
    roleMission: typeof createRoleMission === "function" ? createRoleMission("seer") : null,
    ruleDepth: "full",
    matchStyleSeed: 2026,
    speechDirection: 1,
    speechOrderLabel: "五人聽牌",
    dayOrder: [2, 3, 5, 4, 1],
    speechQueue: [4, 1],
    daySpeechEvents: day2PriorSpeeches.slice(),
    todayEvents: { accusedYouId: 4, fakeSeerId: 4, toxicSlipId: 4 },
    relations: [
      { from: 1, to: 2, type: "trust" },
      { from: 3, to: 1, type: "trust" },
      { from: 4, to: 1, type: "accuse" },
      { from: 7, to: 4, type: "trust" }
    ],
    voteHistory: [day1Votes],
    allSpeechEvents: day1Speeches.concat(day2PriorSpeeches),
    lastNightCasualties: [8, 7],
    microPulseRevealed: false,
    fourGivingsUsed: { confidence: false, joy: true, hope: false, convenience: true },
    fourGJoySuspects: [],
    fourGHopePair: null,
    fourGEchoes: [],
    threeGoodImpactLog: [
      { day: 1, key: "heart_clue", title: "存好心・查證言票背離", detail: "記下 7號口頭點打 5號卻跟票 6號的矛盾，避免席間誤傷好人", tone: "jade" }
    ],
    directorEventInteractedDay: 0,
    fourGSynergyTriggered: false,
    teaServedDay: 0,
    spectatorGuess: typeof createEmptySpectatorGuess === "function" ? createEmptySpectatorGuess() : { wolfIds: [], godRoles: { seer: null, witch: null, hunter: null, guard: null }, activeRoleSlot: "seer", locked: false, lockedAtDay: 0, evaluated: null, godViewUnlocked: false },
    afterHunterNext: null,
    lastHunterShot: null,
    winner: null,
    winReason: "",
    logs: [
      { kind: "banner", title: "評審 150 秒導覽局｜第 2 日五人聽牌決選", text: "你是 1號明心觀察員（警長）。首夜驗 2號金水、昨夜驗 4號查殺；第 1 夜 8號守衛擋下狼刀，昨夜 8號離席、3號奉茶師以清心茶請離言票背離的 7號，場上剩最後 1 名酸民狼。" },
      { kind: "dawn", title: "五人聽牌（1・2・3・4・5號在席）", text: "緊接著由對跳假觀察員 4號阿松發言，可先試「舉杯追問」，下一棒輪到你體驗「三選一婉轉潤飾籤」，投票後直達終局真相覆盤。" }
    ],
    stats: {
      goodWordsCount: 1,
      rewritesUsed: 0,
      fourGCount: 2,
      nightSkillUsed: 2,
      toxicSentCount: 0,
      cluesCaught: 1,
      contradictionsFound: 0,
      logicBreaksLanded: 0,
      microInspectsUsed: 0,
      microWolfSpotted: 0,
      sheriffPassed: 0,
      teaServedCount: 0,
      kindDeescalations: 0,
      fourGSynergies: 0,
      elderExempted: 0,
      wolfKingStrikes: 0,
      sheriffDramaWins: 1,
      hypocrisyFlags: 0,
      confidenceSaves: 0,
      clearWindTurns: 0
    }
  };

  if (typeof evaluateMatchPointState === "function") evaluateMatchPointState();
  if (typeof trackAnalyticsEvent === "function") {
    trackAnalyticsEvent("judge_showcase_start", { seats: 8 });
  }
  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("match:started", { totalSeats: 8, playerRole: "seer", judgeShowcase: true });
    orchestrator.emit("phase:changed", { phase: "DAY_SPEECH", day: 2 });
  }
  updateAllUI();
  if (typeof voice !== "undefined" && typeof voice.prefetchBundledVoicePackUrl === "function") {
    voice.prefetchBundledVoicePackUrl("assets/voice_pack/showcase/showcase_asong_day2.mp3");
    voice.prefetchBundledVoicePackUrl("assets/voice_pack/showcase/showcase_asong_grill_defend.mp3");
    voice.prefetchBundledVoicePackUrl("assets/voice_pack/showcase/showcase_asong_grill_flip.mp3");
    voice.prefetchBundledVoicePackUrl("assets/voice_pack/showcase/showcase_asong_lw.mp3");
    voice.prefetchBundledVoicePackUrl("assets/voice_pack/showcase/showcase_host_good_win.mp3");
  }
  showToast("評審導覽局已就位：依上方三步提示體驗追問、潤飾籤與五人聽牌覆盤。", "emerald");
  if (typeof advanceSpeechQueue === "function") {
    if (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function") {
      orchestrator.schedule("showcase_boot", advanceSpeechQueue, 380);
    } else {
      state.stepTimer = setTimeout(advanceSpeechQueue, 380);
    }
  }
}

// ==================== START GAME ====================
function startNewGame() {
  sound.unlock();
  clearStepTimer();
  clearTransientMatchTimers();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  if (typeof indieFlow !== "undefined" && typeof indieFlow.hideRoleDealRitual === "function") {
    indieFlow.hideRoleDealRitual({ silent: true });
  }
  if (state.spectatorFastForward && typeof state._preSpectatorAutoPlay === "boolean") {
    state.autoPlay = state._preSpectatorAutoPlay;
    state._preSpectatorAutoPlay = null;
  }
  if (typeof state._preSpectatorFxPacing === "string") {
    state.fxPacing = state._preSpectatorFxPacing;
    state._preSpectatorFxPacing = null;
    if (typeof document !== "undefined" && document.body && document.body.classList) {
      document.body.classList.toggle("fx-pacing-fast", state.fxPacing === "fast");
    }
  }
  state.spectatorFastForward = false;
  if (typeof orchestrator !== "undefined") orchestrator.beginNewEpoch("start_match");

  let count = parseInt(el("selectModeCount").value, 10) || 6;
  const pref = el("selectPreferredRole").value || "random";
  if (el("selectAiDifficulty")) state.aiDifficulty = el("selectAiDifficulty").value || "normal";
  if (el("selectRuleDepth")) {
    const rd = el("selectRuleDepth").value;
    state.ruleDepth = rd === "classic" ? "classic" : "full";
  }
  if (el("chkSheriffMode")) state.sheriffMode = Boolean(el("chkSheriffMode").checked);
  if (el("chkGuardMode")) state.guardMode = Boolean(el("chkGuardMode").checked);
  let variantMode = state.activeVariant || "standard";
  if (["standard", "fog_seal", "blitz_3m", "twin_tea", "lone_wolf_king"].indexOf(variantMode) === -1) {
    variantMode = "standard";
  }
  if (variantMode !== "standard" && typeof isVariantUnlocked === "function" && !isVariantUnlocked(variantMode)) {
    variantMode = "standard";
    state.activeVariant = "standard";
  }
  saveUserPrefs();

  if (variantMode === "lone_wolf_king") {
    count = 6;
    state.guardMode = true;
    if (el("selectModeCount")) el("selectModeCount").value = "6";
    if (el("chkGuardMode")) el("chkGuardMode").checked = true;
    showToast("青嵐奇局【孤狼流言王局】啟動：6人無觀察員，1名強化流言首領對決5名茶友。", "emerald");
  } else {
    if ((pref === "wolf_king" || pref === "elder") && count < 10) {
      count = 10;
      if (el("selectModeCount")) el("selectModeCount").value = "10";
      showToast(pref === "wolf_king" ? "流言首領已自動切換至 10人局。" : "清心長老已自動切換至 10人局。", "emerald");
    }
    if (pref === "hunter" && count < 8) {
      count = 8;
      el("selectModeCount").value = "8";
      showToast("直心糾察長已自動切換至 8人局。", "emerald");
    }
    if (pref === "guard" && count < 8) {
      count = 8;
      state.guardMode = true;
      if (el("selectModeCount")) el("selectModeCount").value = "8";
      if (el("chkGuardMode")) el("chkGuardMode").checked = true;
      showToast("已切換至 8 人「預女獵守」護心守衛模式。", "emerald");
    } else if (pref === "guard") {
      state.guardMode = true;
      if (el("chkGuardMode")) el("chkGuardMode").checked = true;
    }
  }

  const useGuardBoard = Boolean(variantMode === "lone_wolf_king" || count >= 12 || (count >= 8 && state.guardMode));
  let rolePool;
  if (variantMode === "lone_wolf_king") {
    count = 6;
    rolePool = ["wolf", "witch", "guard", "hunter", "villager", "villager"];
  } else if (count >= 12) {
    count = 12;
    rolePool = ["wolf", "wolf", "wolf", "wolf", "seer", "witch", "hunter", "guard", "villager", "villager", "villager", "villager"];
  } else if (count >= 10) {
    count = 10;
    rolePool = useGuardBoard
      ? ["wolf", "wolf", "wolf", "seer", "witch", "hunter", "guard", "villager", "villager", "villager"]
      : ["wolf", "wolf", "wolf", "seer", "witch", "hunter", "villager", "villager", "villager", "villager"];
  } else if (count === 8) {
    rolePool = useGuardBoard
      ? ["wolf", "wolf", "seer", "witch", "hunter", "guard", "villager", "villager"]
      : ["wolf", "wolf", "seer", "witch", "hunter", "villager", "villager", "villager"];
  } else {
    count = 6;
    rolePool = ["wolf", "wolf", "seer", "witch", "villager", "villager"];
  }

  let playerRole = pref === "wolf_king" ? "wolf" : (pref === "elder" ? "villager" : pref);
  if (playerRole === "random" || rolePool.indexOf(playerRole) === -1) {
    playerRole = shuffle(rolePool)[0];
  }

  const remainingRoles = rolePool.slice();
  const rIdx = remainingRoles.indexOf(playerRole);
  if (rIdx !== -1) remainingRoles.splice(rIdx, 1);
  const aiRoles = shuffle(remainingRoles);
  const personas = shuffle(AI_PERSONAS);

  const playerSeatId = 1 + Math.floor(Math.random() * count);
  const startOffset = Math.floor(Math.random() * count);
  const seats = [];
  let aiIdx = 0;
  for (let i = 1; i <= count; i++) {
    const isPlayer = (i === playerSeatId);
    const rKey = isPlayer ? playerRole : aiRoles[aiIdx];
    const pInfo = isPlayer
      ? { name: "你", trait: "玩家", avatarColor: "#f5b942" }
      : personas[aiIdx];
    if (!isPlayer) aiIdx += 1;

    const suspicionMap = {};
    for (let k = 1; k <= count; k++) {
      suspicionMap[k] = k === i ? 0 : 45 + Math.floor(Math.random() * 10);
    }

    seats.push({
      id: i,
      name: pInfo.name,
      trait: pInfo.trait,
      deductionStyle: pInfo.deductionStyle || "balanced",
      color: pInfo.avatarColor,
      role: rKey,
      team: ROLE_DEFS[rKey].team,
      alive: true,
      outReason: "",
      emojiMood: "",
      sweatExposed: false,
      suspicionMap: suspicionMap,
      trustShield: false,
      microPulse: rKey === "wolf" ? (72 + Math.floor(Math.random() * 22)) : (16 + Math.floor(Math.random() * 22)),
      fakeSeer: false,
      isWolfKing: false,
      isElder: false,
      elderShieldUsed: false,
      voteDisabled: false,
      claimedRole: null,
      checkedHistory: [],
      savedSeatId: null,
      purifiedSeatId: null
    });
  }

  // 10/12-player advanced roles: 1 流言首領 (Wolf King) + 1 清心長老 (Elder)
  // Also in "lone_wolf_king" variant, the sole Wolf is ALWAYS an enhanced 流言首領 (Wolf King)!
  if (variantMode === "lone_wolf_king") {
    const soleWolf = seats.find(function (s) { return s.role === "wolf"; });
    if (soleWolf) {
      soleWolf.isWolfKing = true;
      soleWolf.microPulse = Math.max(48, (soleWolf.microPulse || 72) - 16);
    }
  } else if (count >= 10) {
    const wolfSeatsAll = seats.filter(function (s) { return s.role === "wolf"; });
    const villagerSeatsAll = seats.filter(function (s) { return s.role === "villager"; });
    const pSeatInit = seats.find(function (s) { return s.id === playerSeatId; });
    if (pref === "wolf_king" && pSeatInit && pSeatInit.role === "wolf") {
      pSeatInit.isWolfKing = true;
    } else if (wolfSeatsAll.length > 0) {
      const wkPool = (pref === "wolf") ? wolfSeatsAll.filter(function (s) { return s.id !== playerSeatId; }) : wolfSeatsAll;
      const wkCands = wkPool.length > 0 ? wkPool : wolfSeatsAll;
      const wk = wkCands[Math.floor(Math.random() * wkCands.length)];
      wk.isWolfKing = true;
    }
    if (pref === "elder" && pSeatInit && pSeatInit.role === "villager") {
      pSeatInit.isElder = true;
    } else if (villagerSeatsAll.length > 0) {
      const eldPool = (pref === "villager") ? villagerSeatsAll.filter(function (s) { return s.id !== playerSeatId; }) : villagerSeatsAll;
      const eldCands = eldPool.length > 0 ? eldPool : villagerSeatsAll;
      const eld = eldCands[Math.floor(Math.random() * eldCands.length)];
      eld.isElder = true;
    }
  }

  const aiWolves = seats.filter(function (s) { return s.id !== playerSeatId && s.role === "wolf"; });
  const hasSeerInMatch = seats.some(function (s) { return s.role === "seer"; });
  const fakeSeerProb = state.aiDifficulty === "pro" ? 0.94 : (state.aiDifficulty === "easy" ? 0.45 : 0.72);
  if (hasSeerInMatch && variantMode !== "lone_wolf_king" && aiWolves.length > 0 && Math.random() < fakeSeerProb) {
    const wolfWeights = aiWolves.map(function (w) {
      const prof = typeof getPersonaProfile === "function" ? getPersonaProfile(w) : null;
      const bold = (prof && typeof prof.boldness === "number")
        ? prof.boldness
        : (w.deductionStyle === "bold" ? 1.35 : (w.deductionStyle === "cautious" ? 0.72 : 1.0));
      return Math.max(0.35, bold * (w.isWolfKing ? 1.2 : 1.0));
    });
    const totalWeight = wolfWeights.reduce(function (a, b) { return a + b; }, 0);
    let pickRoll = Math.random() * totalWeight;
    let fakeSeerPick = aiWolves[aiWolves.length - 1];
    for (let wi = 0; wi < aiWolves.length; wi++) {
      pickRoll -= wolfWeights[wi];
      if (pickRoll <= 0) {
        fakeSeerPick = aiWolves[wi];
        break;
      }
    }
    fakeSeerPick.fakeSeer = true;
  }
  // Pro difficulty: wolves keep calmer microPulse (preserving lone_wolf_king calm buff); Easy difficulty: wolves sweat more noticeably
  if (state.aiDifficulty === "pro") {
    const minWolfPulse = variantMode === "lone_wolf_king" ? 44 : 58;
    seats.forEach(function (s) { if (s.role === "wolf") s.microPulse = Math.max(minWolfPulse, s.microPulse - 12); });
  } else if (state.aiDifficulty === "easy") {
    seats.forEach(function (s) { if (s.role === "wolf") s.microPulse = Math.min(96, s.microPulse + 8); });
  }

  // Optional Sheriff Election (Fair pick across all seats — zero role-leak!)
  let sheriffSeatId = null;
  if (state.sheriffMode) {
    const picked = seats[Math.floor(Math.random() * seats.length)] || seats[0];
    sheriffSeatId = picked.id;
  }

  const known = {};
  known[playerSeatId] = playerRole;
  if (playerRole === "wolf") {
    seats.forEach(function (s) { if (s.role === "wolf") known[s.id] = "wolf"; });
  }

  state.selectedSeatId = null;
  state.cardPeek3D = false;
  state.intelSeatId = null;
  closeSeatIntel();
  closeRadialMenu();
  if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
  state.speakingInFlight = false;
  state.spectatorFastForward = false;
  if (typeof clearCutInQueue === "function") clearCutInQueue();
  state.seerReveal = null;
  state.voteResultPayload = null;
  state.activeSpeakerId = null;
  state.activeClash = null;
  state.lastWordsCtx = null;
  state.voteFlight = null;
  state.playerMarks = {};
  state.listenPitCollapsed = false;
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  if (el("lastWordsFreeInput")) el("lastWordsFreeInput").value = "";
  if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  if (el("btnQuickFreeSend")) el("btnQuickFreeSend").textContent = "陳詞送出 ↵";
  if (el("speechThreeGoodBadge")) el("speechThreeGoodBadge").classList.add("hidden");
  if (el("btnQuickInlineRewrite")) el("btnQuickInlineRewrite").classList.add("hidden");
  state.activeBubble = null;
  state.seatBubbles = {};
  state.beamFx = [];
  state.fxPopups = [];
  state.burstParticles = [];
  state.ripples = [];
  state.seatMoods = {};
  state.seatPhysics = {};
  state.dragAction = { active: false, moved: false, fromId: null, startX: 0, startY: 0, curX: 0, curY: 0, snapId: null };
  state.match = {
    started: true,
    phase: "LOBBY",
    day: 0,
    totalSeats: count,
    playerSeatId: playerSeatId,
    sheriffSeatId: sheriffSeatId,
    goodwillVoteBonus: false,
    convenienceRallyTargetId: null,
    clearBreezeUsedDay: 0,
    activeDirectorEvent: null,
    usedDirectorEventIds: [],
    directorEventClearedDay: 0,
    orchestratorSummary: null,
    quickReactedMap: {},
    aiDifficulty: state.aiDifficulty,
    ruleDepth: state.ruleDepth || "full",
    matchStyleSeed: Math.floor(Math.random() * 100000),
    startOffset: startOffset,
    spectatorPrompted: false,
    harmonyScore: 72,
    threeGood: { heart: 0, words: 0, deeds: 0, resonanceTriggered: false, milestones: { heart: false, words: false, deeds: false } },
    combo: 0,
    maxCombo: 0,
    comboBoostReady: false,
    pinnedClues: [],
    tableReactions: [],
    publicInterjections: [],
    interjectUsedDay: 0,
    candlelitReview: null,
    candlelitWatchIds: [],
    candlelitFreeInspectUsedDay: 0,
    caughtSpeechClues: {},
    wolfGodMarks: {},
    rewriteCritReady: false,
    seats: seats,
    playerKnownRoles: known,
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
    variantMode: variantMode,
    isMatchPoint: false,
    _voteFinalizing: false,
    hopeConfrontation: null,
    wolfExplodedToday: false,
    wolfExplodedDay: 0,
    aiWolfExplosions: 0,
    _wolfExplodePendingNight: false,
    interjectBonusCharges: 0,
    guardAwakenBonusWeightDay: 0,
    guardBlockedLastNight: false,
    spiritBet: { active: null, history: [], streak: 0, bestStreak: 0, totalBonusPts: 0 },
    sheriffRallyUsedDay: 0,
    sheriffElectionPending: Boolean(sheriffSeatId),
    pendingDawnAfterSheriff: false,
    dawnAfterSheriffRan: false,
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
    playerDraftPits: { wolfIds: [], goodIds: [], claimRole: null, standSeerId: null, evidenceClueId: null, turnKey: "" },
    _preparedSpeechTurnKey: "",
    roleMission: (!isClassicSimpleMode() && typeof createRoleMission === "function")
      ? createRoleMission(typeof getSeatEffectiveRoleKey === "function"
        ? getSeatEffectiveRoleKey(seats.find(function (s) { return s.id === playerSeatId; }))
        : playerRole)
      : null,
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
    spectatorGuess: (typeof createEmptySpectatorGuess === "function" ? createEmptySpectatorGuess() : { wolfIds: [], godRoles: { seer: null, witch: null, hunter: null, guard: null }, activeRoleSlot: "seer", locked: false, lockedAtDay: 0, evaluated: null, godViewUnlocked: false }),
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
      elderExempted: 0,
      wolfKingStrikes: 0,
      sheriffDramaWins: 0,
      guardBlocks: 0,
      wolfExplosions: 0,
      spiritBetsWon: 0,
      confidenceSaves: 0,
      clearWindTurns: 0
    }
  };

  const variantLabels = {
    fog_seal: "迷霧封牌局（離席者不揭露真實陣營與職能）",
    blitz_3m: "三分鐘閃電快棋（全員限 22 字短句＋15 秒快投）",
    twin_tea: "雙刃毒茗局（首夜奉茶師不可自救、首夜解禁清心茶）",
    lone_wolf_king: "孤狼流言王局（6 人無觀察員，1 名強化流言首領對決 5 名茶友）"
  };
  if (variantMode !== "standard" && variantLabels[variantMode]) {
    addLog({
      kind: "blessing",
      title: "青嵐奇局生效：" + variantLabels[variantMode],
      text: ""
    });
  }

  const pSeatObj = getPlayerSeat();
  const effRoleKey = (pSeatObj && pSeatObj.isWolfKing) ? "wolf_king" : ((pSeatObj && pSeatObj.isElder) ? "elder" : playerRole);
  const rDef = ROLE_DEFS[effRoleKey] || ROLE_DEFS[playerRole];
  addLog({
    kind: "banner",
    title: "開局！你是【" + rDef.icon + rDef.name + "】",
    text: rDef.desc
  });
  if (typeof trackAnalyticsEvent === "function") {
    trackAnalyticsEvent("match_start", {
      seats: (state.match && state.match.totalSeats) || seats.length,
      difficulty: (state.match && state.match.aiDifficulty) || state.aiDifficulty || "normal",
      mode: variantMode || "standard",
      classic: Boolean(typeof isClassicSimpleMode === "function" && isClassicSimpleMode())
    });
  }

  if (playerRole === "wolf") {
    const mates = seats.filter(function (s) { return s.id !== playerSeatId && s.role === "wolf"; });
    if (mates.length > 0) {
      addLog({
        kind: "secret",
        title: "狼同伴：" + mates.map(function (m) { return m.id + "號" + m.name; }).join("、"),
        text: "白天輪流發言時小心別露出邏輯破綻！"
      });
    }
  }

  if (sheriffSeatId) {
    if (state.match.sheriffElectionPending) {
      addLog({
        kind: "blessing",
        title: "本局已啟用警長制度：第 1 天天亮將先上警競選，競選結束後再公布首夜倒牌（1.5 票＆末置位歸票權）",
        text: ""
      });
    } else {
      const shSeat = getSeat(sheriffSeatId);
      addLog({
        kind: "blessing",
        title: "警長誕生：" + fmtSeatNum(sheriffSeatId) + "號 " + (shSeat ? shSeat.name : "") + "（公投擁有 1.5 票歸票權！）",
        text: ""
      });
    }
  }

  updateAllUI();
  showToast("抽牌完成！本局你是 " + playerNumTag() + "（" + rDef.name + "）", "emerald");
  if (typeof orchestrator !== "undefined") orchestrator.emit("match:started", { totalSeats: count, playerRole: playerRole });
  let night1Launched = false;
  const epNight1 = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const launchFirstNightOnce = function () {
    if (night1Launched) return;
    if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epNight1)) return;
    if (!state.match || !state.match.started || state.match.day !== 0 || state.match.phase !== "LOBBY") return;
    night1Launched = true;
    beginNightPhase();
  };
  const shouldGateOnRoleDeal = Boolean(
    (typeof window !== "undefined" && typeof window.HTMLElement === "function") ||
    (typeof state !== "undefined" && state._forceRoleDealGate)
  );
  if (typeof indieFlow !== "undefined" && typeof indieFlow.showRoleDealRitual === "function") {
    const ritualShown = indieFlow.showRoleDealRitual(effRoleKey, launchFirstNightOnce);
    if (!shouldGateOnRoleDeal || !ritualShown) {
      indieFlow.onRoleDealClosed = null;
      launchFirstNightOnce();
    }
  } else {
    launchFirstNightOnce();
  }
}

// ==================== WIN CHECK ====================
function isGodRole(role) {
  return role === "seer" || role === "witch" || role === "hunter" || role === "guard";
}

function evaluateNightWolfKnifeWin(wolfKillSeat, poisonedId) {
  const allSeats = (state.match && state.match.seats) || [];
  const alive = getAliveSeats();
  const wolves = alive.filter(function (s) { return s.team === "wolf"; }).length;
  const goods = alive.filter(function (s) { return s.team === "good"; }).length;
  const hadGods = allSeats.some(function (s) { return isGodRole(s.role); });
  const hadVillagers = allSeats.some(function (s) { return s.role === "villager"; });
  const aliveGods = alive.filter(function (s) { return isGodRole(s.role); }).length;
  const aliveVillagers = alive.filter(function (s) { return s.role === "villager"; }).length;

  if (wolves === 0) return null;
  const poisonSeat = poisonedId ? getSeat(poisonedId) : null;
  const poisonHitWolf = Boolean(poisonSeat && poisonSeat.alive && poisonSeat.team === "wolf" && (!wolfKillSeat || poisonSeat.id !== wolfKillSeat.id));

  if (hadGods && aliveGods === 0) {
    if (wolfKillSeat && wolfKillSeat.role === "hunter") {
      return "狼刀在先！酸民狼夜襲最後一神（直心糾察長無法發動共鳴），達成「屠神」勝利！";
    }
    if (poisonHitWolf) {
      return "狼刀在先！酸民狼夜襲最後一神，在清心茶生效前即達成「屠神」勝利！";
    }
    return "所有神職夥伴皆已離席，酸民狼達「屠神」勝利！";
  }
  if (hadVillagers && aliveVillagers === 0) {
    if (poisonHitWolf) {
      return "狼刀在先！酸民狼夜襲最後一位三好書院生，在清心茶生效前即達成「屠民」勝利！";
    }
    return "所有三好書院生皆已離席，酸民狼達「屠民」勝利！";
  }
  if (goods === 0 || wolves > goods) {
    return "酸民狼人數壓制好人（" + wolves + ":" + goods + "）！";
  }
  return null;
}

function checkAndHandleGameOver() {
  const allSeats = (state.match && state.match.seats) || [];
  const alive = getAliveSeats();
  const wolves = alive.filter(function (s) { return s.team === "wolf"; }).length;
  const goods = alive.filter(function (s) { return s.team === "good"; }).length;
  const hadGods = allSeats.some(function (s) { return isGodRole(s.role); });
  const hadVillagers = allSeats.some(function (s) { return s.role === "villager"; });
  const aliveGods = alive.filter(function (s) { return isGodRole(s.role); }).length;
  const aliveVillagers = alive.filter(function (s) { return s.role === "villager"; }).length;

  // 標準《凹嗚狼人殺》屠邊規則：
  // 1. 好人勝利優先判定（例如最後一神直心糾察長帶走最後一狼，好人獲勝）
  if (wolves === 0) {
    const initialWolves = allSeats.filter(function (s) { return s.team === "wolf"; }).length || getInitialWolfCount();
    finishMatch("good", initialWolves + " 隻酸民狼全數離席！");
    return true;
  }
  // 2. 屠神勝利：所有神職皆已離席
  if (hadGods && aliveGods === 0) {
    finishMatch("wolf", "所有神職夥伴皆已離席，酸民狼達「屠神」勝利！");
    return true;
  }
  // 3. 屠民勝利：所有三好書院生皆已離席
  if (hadVillagers && aliveVillagers === 0) {
    finishMatch("wolf", "所有三好書院生皆已離席，酸民狼達「屠民」勝利！");
    return true;
  }
  // 4. 人數壓制兜底
  if (goods === 0 || wolves > goods) {
    finishMatch("wolf", "酸民狼人數壓制好人（" + wolves + ":" + goods + "）！");
    return true;
  }
  return false;
}

function finishMatch(winnerTeam, reason) {
  clearStepTimer();
  clearTransientMatchTimers();
  if (typeof commitPendingSpeechLog === "function") commitPendingSpeechLog();
  if (typeof orchestrator !== "undefined") orchestrator.clearAllTimers();
  state.match.phase = "GAME_OVER";
  state.match.winner = winnerTeam;
  state.match.winReason = reason;
  state.activeSpeakerId = null;

  const player = getPlayerSeat();
  const playerWon = player && player.team === winnerTeam;
  closeRadialMenu();
  sound.playWin(playerWon);
  if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") {
    stage3d.triggerHeroBeat(winnerTeam === "good" ? "celebrate" : "gasp_react", 3000);
  }
  triggerCutIn(
    winnerTeam === "good" ? "好人陣營勝利！" : "酸民狼陣營勝利！",
    reason || "",
    winnerTeam === "good" ? "emerald" : "crimson"
  );
  state.match.seats.forEach(function (s, idx) {
    if (s.team === winnerTeam) {
      const fxFn = function () {
        setSeatEmotion(s.id, "happy", 5000);
        spawnBurst(s.id, winnerTeam === "good" ? ["#34d399", "#fbbf24", "#38bdf8", "#ffffff"] : ["#fb7185", "#a78bfa", "#fbbf24"], 22, "petal");
      };
      if (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function") {
        orchestrator.schedule("win_fx_" + idx, fxFn, idx * 140);
      } else {
        setTimeout(fxFn, idx * 140);
      }
    }
  });
  const endHostLine = (state.match && state.match.judgeShowcase && winnerTeam === "good")
    ? "全場酸民狼已清出茶席，好人陣營大獲全勝，恭喜各位守住清茗茶席！"
    : ((winnerTeam === "good" ? "對局結束，好人陣營獲勝！" : "對局結束，酸民狼陣營獲勝！") + reason);
  voice.speakHost(endHostLine);

  addLog({
    kind: "banner",
    title: (winnerTeam === "good" ? "好人獲勝！" : "酸民狼獲勝！") + " " + reason,
    text: ""
  });
  if (typeof evaluateSpectatorGuess === "function") evaluateSpectatorGuess();
  if (typeof trackAnalyticsEvent === "function") {
    trackAnalyticsEvent("match_finish", {
      seats: (state.match && state.match.totalSeats) || 8,
      winner: String(winnerTeam || "unknown"),
      days: (state.match && state.match.day) || 1,
      showcase: Boolean(state.match && state.match.judgeShowcase)
    });
  }
  if (typeof orchestrator !== "undefined") {
    orchestrator.dispatchAgent("GodViewAnalystAgent", { winnerTeam: winnerTeam, reason: reason });
    orchestrator.emit("match:ended", { winner: winnerTeam, reason: reason });
  }
  if (!state.match.judgeShowcase && !state.match._careerRecorded && typeof recordMatchCareer === "function") {
    state.match._careerRecorded = true;
    recordMatchCareer(winnerTeam);
  }
  updateAllUI();
}

function finishEarlyAsSpectator(reason) {
  clearStepTimer();
  clearTransientMatchTimers();
  if (typeof commitPendingSpeechLog === "function") commitPendingSpeechLog();
  if (typeof orchestrator !== "undefined") orchestrator.clearAllTimers();
  voice.stop();
  state.voteResultPayload = null;
  state.match.phase = "GAME_OVER";
  state.match.winner = "early_end";
  state.match.winReason = reason || "你已離席並選擇直接結束本局，全員底牌揭曉！";
  state.activeSpeakerId = null;
  if (typeof evaluateSpectatorGuess === "function") evaluateSpectatorGuess();
  sound.playBlessing();
  voice.speakHost("對局提前結束，全員底牌揭曉！");
  addLog({
    kind: "banner",
    title: "已提前結束觀戰・全員底牌揭曉",
    text: ""
  });
  if (typeof orchestrator !== "undefined") {
    orchestrator.dispatchAgent("GodViewAnalystAgent", { winnerTeam: "early_end", reason: state.match.winReason });
    orchestrator.emit("match:ended", { winner: "early_end", reason: state.match.winReason });
  }
  updateAllUI();
}
