/**
 * 開局初始化、新手帶玩局、勝負條件判定與提早觀戰結算
 */
"use strict";

function startGuidedBeginnerMatch() {
  el("modalTutorial").classList.add("hidden");
  el("selectModeCount").value = "6";
  el("selectPreferredRole").value = "seer";
  state.coachEnabled = true;
  startNewGame();
}

// ==================== START GAME ====================
function startNewGame() {
  sound.unlock();
  clearStepTimer();
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
  saveUserPrefs();

  if ((pref === "wolf_king" || pref === "elder") && count < 10) {
    count = 10;
    if (el("selectModeCount")) el("selectModeCount").value = "10";
    showToast(pref === "wolf_king" ? "🐺 流言首領已自動切換至 10人局！" : "🛡️ 清心長老已自動切換至 10人局！", "emerald");
  }
  if (pref === "hunter" && count < 8) {
    count = 8;
    el("selectModeCount").value = "8";
    showToast("直心糾察長已自動切換至 8人局！", "emerald");
  }
  if (pref === "guard" && count < 8) {
    count = 8;
    state.guardMode = true;
    if (el("selectModeCount")) el("selectModeCount").value = "8";
    if (el("chkGuardMode")) el("chkGuardMode").checked = true;
    showToast("🛡️ 已切換至 8 人「預女獵守」護心守衛模式！", "emerald");
  } else if (pref === "guard") {
    state.guardMode = true;
    if (el("chkGuardMode")) el("chkGuardMode").checked = true;
  }

  const useGuardBoard = Boolean(count >= 12 || (count >= 8 && state.guardMode));
  let rolePool;
  if (count >= 12) {
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
  if (count >= 10) {
    const wolfSeatsAll = seats.filter(function (s) { return s.role === "wolf"; });
    const villagerSeatsAll = seats.filter(function (s) { return s.role === "villager"; });
    const pSeatInit = seats.find(function (s) { return s.id === playerSeatId; });
    if (pref === "wolf_king" && pSeatInit && pSeatInit.role === "wolf") {
      pSeatInit.isWolfKing = true;
    } else if (wolfSeatsAll.length > 0) {
      const wk = wolfSeatsAll[Math.floor(Math.random() * wolfSeatsAll.length)];
      wk.isWolfKing = true;
    }
    if (pref === "elder" && pSeatInit && pSeatInit.role === "villager") {
      pSeatInit.isElder = true;
    } else if (villagerSeatsAll.length > 0) {
      const eld = villagerSeatsAll[Math.floor(Math.random() * villagerSeatsAll.length)];
      eld.isElder = true;
    }
  }

  const aiWolves = seats.filter(function (s) { return s.id !== playerSeatId && s.role === "wolf"; });
  const fakeSeerProb = state.aiDifficulty === "pro" ? 0.94 : (state.aiDifficulty === "easy" ? 0.45 : 0.72);
  if (aiWolves.length > 0 && Math.random() < fakeSeerProb) {
    aiWolves[0].fakeSeer = true;
  }
  // Pro difficulty: wolves keep calmer microPulse; Easy difficulty: wolves sweat more noticeably
  if (state.aiDifficulty === "pro") {
    seats.forEach(function (s) { if (s.role === "wolf") s.microPulse = Math.max(58, s.microPulse - 12); });
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
    startOffset: startOffset,
    spectatorPrompted: false,
    harmonyScore: 72,
    threeGood: { heart: 0, words: 0, deeds: 0, resonanceTriggered: false },
    combo: 0,
    maxCombo: 0,
    comboBoostReady: false,
    pinnedClues: [],
    caughtSpeechClues: {},
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
    wolfTactic: "fake_seer",
    sheriffRallyUsedDay: 0,
    sheriffElectionPending: Boolean(sheriffSeatId),
    sheriffElectionCtx: null,
    sheriffOrderCtx: null,
    pendingVotedHunterId: null,
    pendingSheriffTransfer: null,
    pendingEvidenceTargetId: null,
    pendingEvidenceTag: "",
    playerDraftPits: { wolfIds: [], goodIds: [], claimRole: null, standSeerId: null, evidenceClueId: null, turnKey: "" },
    roleMission: (!isClassicSimpleMode() && typeof createRoleMission === "function") ? createRoleMission(playerRole) : null,
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
      sheriffDramaWins: 0
    }
  };

  const pSeatObj = getPlayerSeat();
  const effRoleKey = (pSeatObj && pSeatObj.isWolfKing) ? "wolf_king" : ((pSeatObj && pSeatObj.isElder) ? "elder" : playerRole);
  const rDef = ROLE_DEFS[effRoleKey] || ROLE_DEFS[playerRole];
  addLog({
    kind: "banner",
    title: "開局！你是【" + rDef.icon + rDef.name + "】",
    text: rDef.desc
  });

  if (playerRole === "wolf") {
    const mates = seats.filter(function (s) { return s.id !== playerSeatId && s.role === "wolf"; });
    if (mates.length >0) {
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
        title: "👑 本局已啟用警長制度：第 1 天天亮後將進行上警競選（1.5 票＆末置位歸票權）",
        text: ""
      });
    } else {
      const shSeat = getSeat(sheriffSeatId);
      addLog({
        kind: "blessing",
        title: "👑 警長誕生：" + fmtSeatNum(sheriffSeatId) + "號 " + (shSeat ? shSeat.name : "") + "（公投擁有 1.5 票歸票權！）",
        text: ""
      });
    }
  }

  updateAllUI();
  showToast("抽牌完成！本局你是 " + playerNumTag() + "（" + rDef.name + "）", "emerald");
  if (typeof orchestrator !== "undefined") orchestrator.emit("match:started", { totalSeats: count, playerRole: playerRole });
  beginNightPhase();
  if (typeof indieFlow !== "undefined") indieFlow.showRoleDealRitual(effRoleKey);
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
    winnerTeam === "good" ? "🎉 好人陣營勝利！" : "🐺 酸民狼陣營勝利！",
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
  voice.speakHost((winnerTeam === "good" ? "對局結束，好人陣營獲勝！" : "對局結束，酸民狼陣營獲勝！") + reason);

  addLog({
    kind: "banner",
    title: (winnerTeam === "good" ? "好人獲勝！" : "酸民狼獲勝！") + " " + reason,
    text: ""
  });
  if (typeof evaluateSpectatorGuess === "function") evaluateSpectatorGuess();
  if (typeof orchestrator !== "undefined") {
    orchestrator.dispatchAgent("GodViewAnalystAgent", { winnerTeam: winnerTeam, reason: reason });
    orchestrator.emit("match:ended", { winner: winnerTeam, reason: reason });
  }
  if (typeof recordMatchCareer === "function") {
    recordMatchCareer(winnerTeam);
  }
  updateAllUI();
}

function finishEarlyAsSpectator(reason) {
  clearStepTimer();
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
