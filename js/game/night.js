/**
 * 夜晚行動引擎（狼襲、預言家、女巫）、目標確認、天亮結算與獵人開槍
 */
"use strict";

function scheduleNightStep(fn, ms) {
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const waitMs = ff ? Math.min(ms, 180) : ms;
  return (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function")
    ? orchestrator.schedule("turn_step", fn, waitMs)
    : setTimeout(fn, waitMs);
}

// ==================== NIGHT ENGINE ====================
function beginNightPhase() {
  clearStepTimer();
  closeSeatIntel();
  closeRadialMenu();
  state.dragAction.active = false;
  state.lastWordsCtx = null;
  state.match.day += 1;
  state.match.activeDirectorEvent = null;
  state.match.directorEventClearedDay = 0;
  state.match.rewriteCritReady = false;
  state.match.microInspectCountToday = 0;
  state.match.sheriffRallyUsedDay = 0;
  state.match.pendingEvidenceTargetId = null;
  state.match.pendingEvidenceClueId = null;
  state.match.pendingSheriffTransfer = null;
  state.match.lastHunterShot = null;
  state.hunterResolveCommit = null;
  state.activeSpeakerId = null;
  state.activeBubble = null;
  state.seatBubbles = {};
  state.selectedSeatId = null;

  state.match.seats.forEach(function (s) {
    s.trustShield = false;
    s.emojiMood = "";
    s.microPulse = s.role === "wolf"
      ? clamp(68 + Math.floor(Math.random() * 25), 55, 96)
      : clamp(14 + Math.floor(Math.random() * 24), 10, 46);
  });
  state.match.nightState = { guardTarget: null, wolfTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };

  sound.playNight();
  if (state.match.day > 1) {
    playSkyCurtain("night", "", "第 " + state.match.day + "晚・天黑請閉眼", "夜幕降臨，神秘角色悄悄行動中…");
  }
  addLog({ kind: "night", title: "第 " + state.match.day + "晚・天黑行動", text: "" });

  const guardSeat = state.match.seats.find(function (s) { return s.role === "guard" && s.alive; });
  if (guardSeat) {
    proceedToNightGuard();
    return;
  }
  proceedToNightWolf();
}

function chooseAiGuardTarget(guardSeat, rngVal) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(guardSeat, { module: "night_guard", phase: "NIGHT_GUARD" })
    : null;
  const self = (snap && snap.self) ? snap.self : guardSeat;
  const aliveAll = snap ? snap.aliveSeats : getAliveSeats();
  const bannedId = snap ? snap.lastGuardTargetId : (state.match.lastGuardTargetId || null);
  const validPool = aliveAll.filter(function (s) { return s.id !== bannedId; });
  const r = typeof rngVal === "number" ? rngVal : Math.random();
  const skipFirstNightClash = (snap ? snap.day : state.match.day) === 1 && r < 0.18;
  let pickId = null;
  if (!skipFirstNightClash && validPool.length > 0) {
    const exposedSeer = validPool.find(function (s) { return s.claimedRole === "seer" && ((self.suspicionMap && self.suspicionMap[s.id]) || 50) < 62; });
    const shPending = snap ? snap.sheriffElectionPending : state.match.sheriffElectionPending;
    const shId = snap ? snap.sheriffSeatId : state.match.sheriffSeatId;
    const sheriffTgt = !shPending
      ? validPool.find(function (s) { return s.id === shId && ((self.suspicionMap && self.suspicionMap[s.id]) || 50) < 60; })
      : null;
    const sortedTrusted = validPool.slice().sort(function (a, b) {
      return ((self.suspicionMap && self.suspicionMap[a.id]) || 50) - ((self.suspicionMap && self.suspicionMap[b.id]) || 50);
    });
    const pick = exposedSeer || sheriffTgt || sortedTrusted[0];
    pickId = pick ? pick.id : null;
  }
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("night_guard", self.id, pickId ? ("守護 " + pickId + "號") : "空守防破盾");
  }
  return pickId;
}

function proceedToNightGuard() {
  clearStepTimer();
  state.match.phase = "NIGHT_GUARD";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_GUARD", day: state.match.day });
  state.selectedSeatId = null;
  updateAllUI();

  const guardSeat = state.match.seats.find(function (s) { return s.role === "guard" && s.alive; });
  if (!guardSeat) {
    proceedToNightWolf();
    return;
  }
  if (guardSeat.id === getPlayerId()) {
    voice.speakHost("第" + state.match.day + "晚，天黑請靜心。護心守衛請選擇今晚要守護的座位（不可連守同一人）。", undefined, "host_night");
    updateAllUI();
  } else {
    state.stepTimer = scheduleNightStep(function () {
      const pickId = chooseAiGuardTarget(guardSeat);
      if (pickId) {
        state.match.nightState.guardTarget = pickId;
        state.match.lastGuardTargetId = pickId;
      } else {
        state.match.lastGuardTargetId = null;
      }
      proceedToNightWolf();
    }, 620);
  }
}

function applyWolfNightTactic(tacticKey) {
  const m = state.match;
  if (!m || !m.started || m.phase !== "NIGHT_WOLF") return false;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  if (!pSeat || !pSeat.alive || pSeat.role !== "wolf") return false;
  const mates = m.seats.filter(function (s) { return s.id !== pid && s.alive && s.role === "wolf"; });
  const key = (tacticKey === "deep_stealth" || tacticKey === "pack_push") ? tacticKey : "fake_seer";
  m.wolfTactic = key;
  mates.forEach(function (mt, idx) {
    mt.fakeSeer = (key === "fake_seer" && idx === 0);
  });
  const replyMap = {
    fake_seer: "收到！明天白天我直接悍跳明心觀察員搶警徽帶風向，你在下面幫我衝票！",
    deep_stealth: "明白！我們全員低調深水倒鉤、絕不露破綻，等好人自己內訌！",
    pack_push: "好！明天白天發言跟投票我全力配合你集火同一目標，一口氣沖出去！"
  };
  const labelMap = {
    fake_seer: "🎭 同伴跳觀察員",
    deep_stealth: "🌿 同伴深水倒鉤",
    pack_push: "🔥 聯手集火目標"
  };
  const primaryMate = mates[0];
  if (primaryMate) {
    if (typeof setSeatBubble === "function") setSeatBubble(primaryMate.id, replyMap[key], "wolf", 5200);
    if (typeof setSeatEmotion === "function") setSeatEmotion(primaryMate.id, "proud", 3200);
    if (typeof nudgeSeat === "function") nudgeSeat(primaryMate.id, { scale: 1.08, vy: -4 });
    if (typeof spawnBeam === "function") spawnBeam(pid, primaryMate.id, "#f43f5e", "grill", 700);
  }
  addLog({
    kind: "secret",
    title: "🐺 狼隊密謀拍板【" + labelMap[key] + "】",
    text: primaryMate ? (fmtSeatNum(primaryMate.id) + "號" + primaryMate.name + "：「" + replyMap[key] + "」") : ""
  });
  return true;
}

function proceedToNightWolf() {
  clearStepTimer();
  state.selectedSeatId = null;
  state.match.phase = "NIGHT_WOLF";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_WOLF", day: state.match.day });
  updateAllUI();

  const player = getPlayerSeat();
  if (player && player.alive && player.role === "wolf") {
    voice.speakHost("第" + state.match.day + "晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象。", undefined, "host_night");
    const mate = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.alive && s.role === "wolf"; });
    const candidates = getAliveSeats().filter(function (s) { return s.role !== "wolf"; });
    if (mate && candidates.length > 0) {
      const pick = chooseAiWolfTargetBlind(mate);
      if (pick) {
        state.selectedSeatId = pick.id;
        const planLine = mate.fakeSeer
          ? ("噓…今晚我們先鎖定 " + fmtSeatNum(pick.id) + "號" + pick.name + "，明天白天我幫你冒充明心觀察員帶風向！")
          : ("噓…我感覺 " + fmtSeatNum(pick.id) + "號" + pick.name + "很像核心好夥伴，今晚先請他暫離如何？已幫你標起來！");
        setSeatBubble(mate.id, planLine, "wolf", 6800);
        spawnBeam(mate.id, pick.id, "#f43f5e", "grill", 900);
        addLog({ kind: "secret", title: "🐺 酸民狼密談（" + fmtSeatNum(mate.id) + "號" + mate.name + "）：", text: planLine });
      }
    }
    updateAllUI();
  } else {
    if (player && player.alive && player.role === "seer") {
      voice.speakHost("第" + state.match.day + "晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。", undefined, "host_night");
    } else if (!(typeof isSpectatorFastForward === "function" && isSpectatorFastForward())) {
      voice.speakHost("第" + state.match.day + "晚，天黑請靜心。", undefined, "host_night");
    }
    state.stepTimer = scheduleNightStep(function () {
      const wolves = getAliveSeats().filter(function (s) { return s.role === "wolf"; });
      if (wolves.length > 0) {
        const picked = chooseAiWolfTargetBlind(wolves[0]);
        if (picked) state.match.nightState.wolfTarget = picked.id;
      }
      proceedToNightSeer();
    }, voice.canSpeak() ? 1250 : 820);
  }
}

function chooseAiWolfTargetBlind(wolfSeat, rngVal) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(wolfSeat, { module: "night_wolf", phase: "NIGHT_WOLF" })
    : null;
  const goodTargets = snap
    ? snap.aliveOthers.filter(function (s) { return !s.isWolfMate; })
    : getAliveSeats().filter(function (s) { return s.role !== "wolf"; });
  if (!goodTargets.length) return null;
  const picked = chooseAiWolfTarget(goodTargets, { snap: snap, rngVal: rngVal });
  if (typeof antiCheatMonitor !== "undefined" && wolfSeat) {
    antiCheatMonitor.recordDecision("night_wolf", wolfSeat.id, picked ? ("夜襲 " + picked.id + "號") : "無目標");
  }
  return picked;
}

function chooseAiWolfTarget(goodTargets, opts) {
  const o = opts || {};
  const snap = o.snap || null;
  const rand = typeof o.rngVal === "number" ? function () { return o.rngVal; } : Math.random;
  const diff = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const seerChance = diff === "pro" ? 0.96 : (diff === "easy" ? 0.48 : 0.85);
  const witchChance = diff === "pro" ? 0.90 : (diff === "easy" ? 0.42 : 0.78);
  const guardChance = diff === "pro" ? 0.88 : (diff === "easy" ? 0.40 : 0.72);
  const exposedSeer = goodTargets.find(function (s) { return s.claimedRole === "seer"; });
  if (exposedSeer && rand() < seerChance) return exposedSeer;
  const exposedWitch = goodTargets.find(function (s) { return s.claimedRole === "witch"; });
  if (exposedWitch && rand() < witchChance) return exposedWitch;
  const exposedGuard = goodTargets.find(function (s) { return s.claimedRole === "guard"; });
  if (exposedGuard && rand() < guardChance) return exposedGuard;
  if (diff === "pro") {
    // Strictly observable table state via Blind-View: if claimed Seer, Witch & Guard are all dead, exposed Hunter may be last God!
    const allSeats = snap ? snap.seats : ((state.match && state.match.seats) || []);
    const deadClaimedSeer = allSeats.some(function (s) { return !s.alive && s.claimedRole === "seer"; });
    const deadClaimedWitch = allSeats.some(function (s) { return !s.alive && s.claimedRole === "witch"; });
    const guardBoardOn = snap ? snap.hasGuardMode : Boolean(state.guardMode && state.match && state.match.totalSeats >= 8);
    const deadClaimedGuard = !guardBoardOn || allSeats.some(function (s) { return !s.alive && s.claimedRole === "guard"; });
    const exposedHunter = goodTargets.find(function (s) { return s.claimedRole === "hunter"; });
    if (deadClaimedSeer && deadClaimedWitch && deadClaimedGuard && exposedHunter && rand() < 0.92) {
      return exposedHunter;
    }
    const nonHunters = goodTargets.filter(function (s) { return s.claimedRole !== "hunter"; });
    const smartPool = nonHunters.length > 0 ? nonHunters : goodTargets;
    const shId = snap ? snap.sheriffSeatId : state.match.sheriffSeatId;
    const sheriffTarget = smartPool.find(function (s) { return s.id === shId; });
    if (sheriffTarget && rand() < 0.75) return sheriffTarget;
    const shieldTarget = smartPool.find(function (s) { return s.trustShield; });
    if (shieldTarget && rand() < 0.65) return shieldTarget;
    return smartPool[Math.floor(rand() * smartPool.length) % smartPool.length];
  }
  const observableShielded = goodTargets.find(function (s) { return s.trustShield; });
  if (observableShielded && rand() < 0.55) return observableShielded;
  return goodTargets[Math.floor(rand() * goodTargets.length) % goodTargets.length];
}

function chooseAiSeerTarget(seerSeat) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(seerSeat, { module: "night_seer", phase: "NIGHT_SEER" })
    : null;
  const self = (snap && snap.self) ? snap.self : seerSeat;
  const checkedIds = (self.checkedHistory || []).map(function (c) { return c.targetId; });
  const aliveOthers = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== seerSeat.id; });
  const pool = aliveOthers.filter(function (s) { return checkedIds.indexOf(s.id) === -1; });
  const candidates = (pool.length > 0 ? pool : aliveOthers).slice();
  if (!candidates.length) return null;
  candidates.sort(function (a, b) {
    return ((self.suspicionMap && self.suspicionMap[b.id]) || 50) - ((self.suspicionMap && self.suspicionMap[a.id]) || 50);
  });
  const targetId = candidates[0] ? candidates[0].id : null;
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("night_seer", self.id, targetId ? ("查驗 " + targetId + "號") : "無目標");
  }
  return targetId;
}

function proceedToNightSeer() {
  clearStepTimer();
  state.match.phase = "NIGHT_SEER";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_SEER", day: state.match.day });
  state.selectedSeatId = null;
  updateAllUI();

  const seer = state.match.seats.find(function (s) { return s.role === "seer"; });
  if (!seer || !seer.alive) {
    state.stepTimer = scheduleNightStep(proceedToNightWitch, 550);
    return;
  }
  if (seer.id === getPlayerId()) {
    updateAllUI();
  } else {
    state.stepTimer = scheduleNightStep(function () {
      const targetId = chooseAiSeerTarget(seer);
      const target = targetId ? getSeat(targetId) : null;
      if (target) {
        // Official rule engine resolves Seer check truth ONLY AFTER AI has chosen target blindly!
        const isWolf = target.team === "wolf";
        seer.checkedHistory.push({ day: state.match.day, targetId: target.id, isWolf: isWolf });
        seer.suspicionMap[target.id] = isWolf ? 100 : 0;
        state.match.nightState.seerTarget = target.id;
      }
      proceedToNightWitch();
    }, 650);
  }
}

function chooseAiWitchNightAction(witchSeat) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(witchSeat, { module: "night_witch", phase: "NIGHT_WITCH" })
    : null;
  const self = (snap && snap.self) ? snap.self : witchSeat;
  const pots = (snap && snap.witchPotions) ? snap.witchPotions : state.match.witchPotions;
  const day = snap ? snap.day : state.match.day;
  // Blind-View ONLY exposes nightWolfVictimId if heal potion is still available!
  const victimId = snap ? snap.nightWolfVictimId : (pots && pots.heal ? state.match.nightState.wolfTarget : null);
  let heal = false;
  let poisonTargetId = null;

  const aiCanHeal = Boolean(pots && pots.heal && victimId && (victimId !== self.id || day === 1));
  if (aiCanHeal) {
    const susp = (self.suspicionMap && self.suspicionMap[victimId]) || 50;
    if (day === 1 || susp < 62) {
      heal = true;
    }
  }
  if (!heal && pots && pots.purify && day >= 2) {
    const aliveOthers = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== witchSeat.id; });
    const suspects = aliveOthers.filter(function (s) {
      return s.id !== self.savedSeatId && ((self.suspicionMap && self.suspicionMap[s.id]) || 0) >= 72;
    });
    if (suspects.length > 0) {
      suspects.sort(function (a, b) {
        return ((self.suspicionMap && self.suspicionMap[b.id]) || 0) - ((self.suspicionMap && self.suspicionMap[a.id]) || 0);
      });
      poisonTargetId = suspects[0].id;
    }
  }
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("night_witch", self.id, heal ? ("護回 " + victimId + "號") : (poisonTargetId ? ("清心 " + poisonTargetId + "號") : "保留茶盞"));
  }
  return { heal: heal, victimId: heal ? victimId : null, poisonTargetId: poisonTargetId };
}

function proceedToNightWitch() {
  clearStepTimer();
  state.match.phase = "NIGHT_WITCH";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_WITCH", day: state.match.day });
  state.selectedSeatId = null;
  updateAllUI();

  const witch = state.match.seats.find(function (s) { return s.role === "witch"; });
  if (!witch || !witch.alive || (!state.match.witchPotions.heal && !state.match.witchPotions.purify)) {
    state.stepTimer = scheduleNightStep(resolveDawn, 580);
    return;
  }
  if (witch.id === getPlayerId()) {
    const vic = getSeat(state.match.nightState.wolfTarget);
    const canSelfOrOtherHeal = Boolean(state.match.witchPotions.heal && vic && (vic.id !== witch.id || state.match.day === 1));
    if (state.match.witchPotions.heal && vic) {
      voice.speakHost(canSelfOrOtherHeal
        ? ("滴水奉茶師請睜眼，今晚" + vic.id + "號" + vic.name + "被迷霧鎖定了，要端出暖心回甘茶護回他嗎？")
        : ("滴水奉茶師請睜眼，今晚你被迷霧鎖定了，第2夜起不可自護，可選擇是否使用清心醒神茶。"), undefined, "host_night");
    } else {
      voice.speakHost("滴水奉茶師請睜眼，要端出清心醒神茶請可疑者離席冷靜嗎？", undefined, "host_night");
    }
    updateAllUI();
  } else {
    state.stepTimer = scheduleNightStep(function () {
      const act = chooseAiWitchNightAction(witch);
      if (act.heal && act.victimId) {
        const susp = witch.suspicionMap[act.victimId] || 50;
        state.match.nightState.witchSaved = true;
        state.match.witchPotions.heal = false;
        witch.savedSeatId = act.victimId;
        witch.suspicionMap[act.victimId] = Math.max(5, susp - 35);
      } else if (act.poisonTargetId) {
        state.match.nightState.witchPoisonTarget = act.poisonTargetId;
        state.match.witchPotions.purify = false;
        witch.purifiedSeatId = act.poisonTargetId;
      }
      resolveDawn();
    }, 650);
  }
}

// ==================== DAWN & HUNTER ====================
function resolveDawn() {
  clearStepTimer();
  state.activeBubble = null;
  sound.playDawn();
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "DAWN_RESOLVE", day: state.match.day });

  const ns = state.match.nightState;
  const casualties = [];
  const names = [];
  const fallenIds = [];
  const poisonedId = ns.witchPoisonTarget || null;
  const guardedId = ns.guardTarget || null;
  const isGuardedWolfTarget = Boolean(ns.wolfTarget && guardedId && ns.wolfTarget === guardedId);
  const isDoubleSaveClash = Boolean(isGuardedWolfTarget && ns.witchSaved);
  const wolfKillBlocked = Boolean((ns.witchSaved && !isGuardedWolfTarget) || (isGuardedWolfTarget && !ns.witchSaved));
  let wolfKillSeat = null;

  // 凹嗚《狼刀在先》＆《同守同救奶穿》原則：先結算夜晚未擋下的狼刀；若已達屠神／屠民終局，毒茶／獵人共鳴／警徽移交皆不再觸發！
  if (ns.wolfTarget && !wolfKillBlocked) {
    const wk = getSeat(ns.wolfTarget);
    if (wk && wk.alive) {
      wk.alive = false;
      wk.outReason = (poisonedId && poisonedId === wk.id) ? "清心茶請離" : (isDoubleSaveClash ? "同守同救破盾" : "夜間迷霧暫離");
      wolfKillSeat = wk;
      const wCause = (poisonedId && poisonedId === wk.id) ? "purify" : (isDoubleSaveClash ? "double_clash" : "wolf");
      casualties.push({ id: wk.id, cause: wCause });
      names.push(wk.id + "號" + wk.name);
      fallenIds.push(wk.id);
      spawnFx(wk.id, isDoubleSaveClash ? "🛡🍵 同守破盾!" : "暫離冷靜", isDoubleSaveClash ? "#f59e0b" : "#e11d48");
    }
  }

  const seerSeatObj = state.match.seats.find(function (s) { return s.role === "seer"; });
  const witchSeatObj = state.match.seats.find(function (s) { return s.role === "witch"; });
  const guardSeatObj = state.match.seats.find(function (s) { return s.role === "guard"; });
  const seerChkSeat = ns.seerTarget ? getSeat(ns.seerTarget) : null;
  if (!state.match.nightArchive) state.match.nightArchive = [];

  const wolfKnifeWinReason = (wolfKillSeat && typeof evaluateNightWolfKnifeWin === "function")
    ? evaluateNightWolfKnifeWin(wolfKillSeat, poisonedId)
    : null;
  if (wolfKnifeWinReason) {
    state.match.nightArchive.push({
      day: state.match.day,
      wolfTarget: ns.wolfTarget || null,
      guardId: guardSeatObj ? guardSeatObj.id : null,
      guardTarget: guardedId,
      doubleSaveClash: isDoubleSaveClash,
      seerId: seerSeatObj ? seerSeatObj.id : null,
      seerTarget: ns.seerTarget || null,
      seerIsWolf: seerChkSeat ? (seerChkSeat.team === "wolf") : null,
      witchId: witchSeatObj ? witchSeatObj.id : null,
      witchSaved: Boolean(ns.witchSaved),
      witchPoisonTarget: ns.witchPoisonTarget || null,
      casualties: casualties.map(function (c) { return { id: c.id, cause: c.cause }; }),
      hunterShot: null
    });
    state.match.lastNightCasualties = casualties.map(function (c) { return c.id; });
    state.match.seats.forEach(function (s) { s.publicVoteIntent = null; });
    triggerShake(260);
    state.match.harmonyScore = clamp(state.match.harmonyScore - 6 * casualties.length, 0, 100);
    if (typeof triggerDawnCasualtyPresentation === "function") triggerDawnCasualtyPresentation(casualties);
    addLog({ kind: "dawn", title: "天亮了：" + names.join("、") + " 昨夜離席冷靜（狼刀在先達成終局）", text: "" });
    finishMatch("wolf", wolfKnifeWinReason);
    return;
  }

  if (poisonedId && (!wolfKillSeat || poisonedId !== wolfKillSeat.id)) {
    const ps = getSeat(poisonedId);
    if (ps && ps.alive) {
      ps.alive = false;
      ps.outReason = "清心茶請離";
      casualties.push({ id: ps.id, cause: "purify" });
      names.push(ps.id + "號" + ps.name);
      fallenIds.push(ps.id);
      spawnFx(ps.id, "暫離冷靜", "#e11d48");
    }
  }

  // Record full night secret actions for God-View post-game replay!
  state.match.nightArchive.push({
    day: state.match.day,
    wolfTarget: ns.wolfTarget || null,
    guardId: guardSeatObj ? guardSeatObj.id : null,
    guardTarget: guardedId,
    doubleSaveClash: isDoubleSaveClash,
    seerId: seerSeatObj ? seerSeatObj.id : null,
    seerTarget: ns.seerTarget || null,
    seerIsWolf: seerChkSeat ? (seerChkSeat.team === "wolf") : null,
    witchId: witchSeatObj ? witchSeatObj.id : null,
    witchSaved: Boolean(ns.witchSaved),
    witchPoisonTarget: ns.witchPoisonTarget || null,
    casualties: casualties.map(function (c) { return { id: c.id, cause: c.cause }; }),
    hunterShot: null
  });

  let hunterTriggeredSeat = null;
  let dawnVoiceLine = "";
  state.match.lastNightCasualties = casualties.map(function (c) { return c.id; });
  state.match.seats.forEach(function (s) { s.publicVoteIntent = null; });
  if (casualties.length === 0) {
    state.match.peaceNights.push(state.match.day);
    state.match.harmonyScore = clamp(state.match.harmonyScore + 4, 0, 100);
    playSkyCurtain("day", "", "第 " + state.match.day + "天・天亮請睜眼！", "陽光普照！昨晚是平安夜，全員在場！");
    addLog({ kind: "dawn", title: "天亮了：昨晚平安夜！沒人出局", text: "" });
    dawnVoiceLine = "第" + state.match.day + "天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。";
    if (typeof triggerDawnCasualtyPresentation === "function") triggerDawnCasualtyPresentation([]);
  } else {
    casualties.forEach(function (c) {
      const seat = getSeat(c.id);
      if (seat && seat.role === "hunter" && (c.cause === "wolf" || c.cause === "double_clash") && c.id !== poisonedId) {
        hunterTriggeredSeat = seat;
      }
    });
    triggerShake(260);
    state.match.harmonyScore = clamp(state.match.harmonyScore - 6 * casualties.length, 0, 100);
    if (typeof triggerDawnCasualtyPresentation === "function") triggerDawnCasualtyPresentation(casualties);
    const noLwTag = state.match.day >= 2 ? "（第2夜起夜間離席無遺言）" : "（首夜離席保留遺言）";
    playSkyCurtain("day", "", "第 " + state.match.day + "天・晨曦雲開！", "昨晚 " + names.join("、") + "離席冷靜！" + noLwTag);
    addLog({ kind: "dawn", title: "天亮了：" + names.join("、") + " 昨夜離席冷靜" + noLwTag, text: "" });
    dawnVoiceLine = "第" + state.match.day + "天，天亮請睜眼！昨晚" + names.join("、") + "離席冷靜了。" + (state.match.day >= 2 ? "第2夜起夜間離席沒有遺言。" : "請發表首夜遺言。");
  }

  if (fallenIds.indexOf(getPlayerId()) !== -1) {
    const fallenPlayer = getPlayerSeat();
    if (fallenPlayer && typeof showToast === "function") {
      showToast(
        fallenPlayer.team === "wolf"
          ? "🎯 你昨夜離席了！留在茶席觀戰即可挑戰「猜神職」拿額外加分！"
          : "🔍 你昨夜離席了！留在茶席觀戰即可挑戰「猜狼」拿額外加分！",
        "emerald"
      );
    }
  }

  // Remember Day-1 fallen seats for official Spotlight First-Night Last Words!
  state.match.pendingNight1LastWords = (state.match.day === 1 && fallenIds.length > 0) ? fallenIds.slice() : [];

  function enterDayDiscussionWithSheriffHooks(voiceLineArg) {
    if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof startSheriffElection === "function") {
      startSheriffElection(function () {
        if (!state.match.started || state.match.phase === "GAME_OVER") return;
        const shSeat = state.match.sheriffSeatId ? getSeat(state.match.sheriffSeatId) : null;
        if (shSeat && shSeat.alive && shSeat.id === getPlayerId() && !state.autoPlay && typeof startSheriffOrderPick === "function") {
          startSheriffOrderPick(voiceLineArg);
          return;
        }
        startDayDiscussion(voiceLineArg);
      });
      return;
    }
    const curSh = state.match.sheriffSeatId ? getSeat(state.match.sheriffSeatId) : null;
    if (curSh && curSh.alive && curSh.id === getPlayerId() && !state.autoPlay && !(typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) && typeof startSheriffOrderPick === "function") {
      startSheriffOrderPick(voiceLineArg);
      return;
    }
    startDayDiscussion(voiceLineArg);
  }

  function continueAfterDawnSheriff() {
    if (checkAndHandleGameOver()) return;
    if (hunterTriggeredSeat) {
      voice.speakHost(dawnVoiceLine + "直心糾察長發動正氣共鳴，請選擇一人一同離席冷靜。", undefined, "host_dawn");
      triggerHunterResonance(hunterTriggeredSeat, "AFTER_DAWN");
      return;
    }
    if (state.match.pendingNight1LastWords.length > 0) {
      const lwIds = state.match.pendingNight1LastWords.slice();
      state.match.pendingNight1LastWords = [];
      startLastWordsSequence(lwIds, "first_night", function () {
        enterDayDiscussionWithSheriffHooks("");
      });
      return;
    }
    enterDayDiscussionWithSheriffHooks(dawnVoiceLine);
  }

  if (checkAndHandleGameOver()) return;
  const skipPreElectionSheriffPass = Boolean(state.match.day === 1 && state.match.sheriffElectionPending);
  const deadShSeat = (!skipPreElectionSheriffPass && state.match.sheriffSeatId && fallenIds.indexOf(state.match.sheriffSeatId) !== -1)
    ? getSeat(state.match.sheriffSeatId)
    : null;
  if (deadShSeat && typeof handleSheriffEliminated === "function") {
    handleSheriffEliminated(deadShSeat, continueAfterDawnSheriff);
    return;
  }
  continueAfterDawnSheriff();
}

function chooseAiHunterTarget(hunterSeat) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(hunterSeat, { module: "hunter_shot", phase: "HUNTER_TRIGGER" })
    : null;
  const self = (snap && snap.self) ? snap.self : hunterSeat;
  const isWK = Boolean(self && self.isWolfKing);
  const aliveOthers = (snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== hunterSeat.id; }))
    .filter(function (s) { return !isWK || (snap ? !s.isWolfMate : s.team !== "wolf"); });
  if (!aliveOthers.length) return null;

  let chosenId = null;
  if (isWK) {
    // AI Wolf King legally knows non-Wolf seats via Blind-View, prioritizing ONLY observable claimedRole / sheriff!
    const godPick = aliveOthers.find(function (s) { return s.claimedRole === "seer" || s.claimedRole === "witch" || s.claimedRole === "guard"; });
    const shId = snap ? snap.sheriffSeatId : state.match.sheriffSeatId;
    const shPick = aliveOthers.find(function (s) { return s.id === shId; });
    const wkTarget = godPick || shPick || aliveOthers[0];
    chosenId = wkTarget ? wkTarget.id : null;
  } else {
    const sorted = aliveOthers.slice().sort(function (a, b) {
      return ((self.suspicionMap && self.suspicionMap[b.id]) || 50) - ((self.suspicionMap && self.suspicionMap[a.id]) || 50);
    });
    const best = sorted[0];
    if (best && ((self.suspicionMap && self.suspicionMap[best.id]) || 50) >= 52) {
      chosenId = best.id;
    }
  }
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("hunter_shot", self.id, chosenId ? ("帶走 " + chosenId + "號") : "壓槍不開");
  }
  return chosenId;
}

function triggerHunterResonance(hunterSeat, nextStage) {
  const isWK = Boolean(hunterSeat && hunterSeat.isWolfKing);
  state.match.phase = "HUNTER_TRIGGER";
  state.match.afterHunterNext = nextStage;
  state.match.lastHunterShot = null;
  state.hunterResolveCommit = null;
  state.selectedSeatId = null;
  hunterSeat.claimedRole = isWK ? "wolf_king" : "hunter";

  if (hunterSeat.id === getPlayerId()) {
    addLog({
      kind: "secret",
      title: isWK ? "🐺 流言首領最後帶風向！選 1 位好夥伴一同離席冷靜" : "直心糾察長正氣共鳴！選 1 人一同離席冷靜",
      text: ""
    });
    updateAllUI();
  } else {
    updateAllUI();
    state.stepTimer = scheduleNightStep(function () {
      if (state.match.phase !== "HUNTER_TRIGGER") return;
      const pickId = chooseAiHunterTarget(hunterSeat);
      const best = pickId ? getSeat(pickId) : null;
      if (best && best.alive) {
        executeHunterShotPresentation(hunterSeat, best);
      } else {
        const hName = hunterSeat.name || "";
        state.match.lastHunterShot = null;
        state.match.phase = "HUNTER_RESOLVE";
        setCanvasBubble(hunterSeat.id, "局勢還不明朗，我先壓下共鳴不亂帶人！", "normal");
        addLog({ kind: "dawn", title: "直心糾察長 " + hunterSeat.id + "號選擇壓下共鳴，未帶走任何人。", text: "" });
        if (typeof triggerCutIn === "function") {
          triggerCutIn("⚖️ 直心糾察長壓下共鳴", fmtSeatNum(hunterSeat.id) + "號 " + hName + " 局勢未明，未帶走任何人", "gold", 1500);
        }
        if (typeof showToast === "function") {
          showToast("⚖️ 直心糾察長 " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 選擇壓下共鳴，未帶走任何人。", "gold");
        }
        updateAllUI();
        let holdCommitted = false;
        function finishHold() {
          if (holdCommitted || state.match.phase !== "HUNTER_RESOLVE") return;
          holdCommitted = true;
          clearStepTimer();
          state.hunterResolveCommit = null;
          resumeAfterHunter();
        }
        state.hunterResolveCommit = finishHold;
        state.stepTimer = scheduleNightStep(finishHold, 1050);
      }
    }, 850);
  }
}

function executeHunterShotPresentation(hunterSeat, targetSeat) {
  if (!hunterSeat || !targetSeat || state.match.phase === "HUNTER_RESOLVE") return;
  const isWK = Boolean(hunterSeat.isWolfKing);
  const roleLabel = isWK ? "流言首領" : "直心糾察長";
  const actLabel = isWK ? "最後帶風向反撲" : "正氣共鳴";
  const iconLabel = isWK ? "🐺" : "⚖️";
  clearStepTimer();
  targetSeat.alive = false;
  targetSeat.outReason = isWK ? "流言反撲請離" : "正氣共鳴請離";
  recordRelation(hunterSeat.id, targetSeat.id, "suspect");
  const lastNightRec = state.match.nightArchive && state.match.nightArchive[state.match.nightArchive.length - 1];
  if (lastNightRec) lastNightRec.hunterShot = { hunterId: hunterSeat.id, targetId: targetSeat.id };

  const hName = hunterSeat.id === getPlayerId() ? "你" : hunterSeat.name;
  const tName = targetSeat.id === getPlayerId() ? "你" : targetSeat.name;
  state.match.lastHunterShot = {
    hunterId: hunterSeat.id,
    hunterName: hName,
    targetId: targetSeat.id,
    targetName: tName,
    isWolfKing: isWK,
    day: state.match.day
  };
  state.match.phase = "HUNTER_RESOLVE";

  if (typeof sound !== "undefined" && typeof sound.playHunterShot === "function") {
    sound.playHunterShot();
  }
  triggerShake(520);
  spawnBeam(hunterSeat.id, targetSeat.id, "#f43f5e", "hunter", 820);
  setTimeout(function () {
    spawnBeam(hunterSeat.id, targetSeat.id, "#fbbf24", "hunter", 760);
  }, 90);
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.triggerSkillFx("hunter_shot", hunterSeat.id, targetSeat.id, true);
    if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("gasp_react", 2800);
  }
  spawnBurst(targetSeat.id, ["#f43f5e", "#fbbf24", "#ffffff"], 40, "spark");
  setSeatEmotion(targetSeat.id, "shock", 4000);
  nudgeSeat(targetSeat.id, { scale: 0.8, vScale: 0.28, vy: 10, vTilt: 0.36 });
  spawnFx(hunterSeat.id, iconLabel + " " + (isWK ? "流言反撲！" : "糾察開槍！"), "#fbbf24", { durationMs: 2200, scale: 1.2 });
  spawnFx(targetSeat.id, iconLabel + " 被 " + fmtSeatNum(hunterSeat.id) + "號帶走！", "#f43f5e", { durationMs: 2600, scale: 1.35 });
  setCanvasBubble(hunterSeat.id, "我是" + roleLabel + "！帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + "！", "suspect");
  setSeatBubble(targetSeat.id, "遭 " + fmtSeatNum(hunterSeat.id) + "號 " + actLabel + "帶走！", "suspect", 4800);
  if (typeof triggerCutIn === "function") {
    triggerCutIn(
      iconLabel + " " + actLabel + "・帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + "！",
      roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 臨離前鎖定目標一同離席！",
      "crimson",
      2350
    );
  }
  if (typeof showToast === "function") {
    showToast(iconLabel + " " + roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + " 一同離席！", "warn");
  }
  addLog({
    kind: "dawn",
    title: iconLabel + " " + roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 發動" + actLabel + "，帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + " 一同離席！",
    text: ""
  });
  const ffHunter = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!ffHunter && typeof voice !== "undefined" && voice.canSpeak()) {
    voice.speakHost(roleLabel + " " + hunterSeat.id + "號" + hName + " 發動" + actLabel + "，帶走 " + targetSeat.id + "號" + tName + " 一同離席冷靜！");
  }
  updateAllUI();

  let committed = false;
  function commitAfterHunterShot() {
    if (committed || state.match.phase !== "HUNTER_RESOLVE" || !state.match.started) return;
    committed = true;
    clearStepTimer();
    state.hunterResolveCommit = null;
    if (checkAndHandleGameOver()) return;
    if (!state.match.sheriffElectionPending && targetSeat.id === state.match.sheriffSeatId && typeof handleSheriffEliminated === "function") {
      handleSheriffEliminated(targetSeat, resumeAfterHunter);
      return;
    }
    resumeAfterHunter();
  }
  state.hunterResolveCommit = commitAfterHunterShot;
  state.stepTimer = scheduleNightStep(commitAfterHunterShot, 2250);
}

function resumeAfterHunter() {
  if (checkAndHandleGameOver()) return;
  const curSh = state.match.sheriffSeatId ? getSeat(state.match.sheriffSeatId) : null;
  if (!state.match.sheriffElectionPending && curSh && !curSh.alive && typeof handleSheriffEliminated === "function") {
    handleSheriffEliminated(curSh, resumeAfterHunter);
    return;
  }
  if (state.match.afterHunterNext === "AFTER_VOTE" && state.match.pendingVotedHunterId) {
    const votedHid = state.match.pendingVotedHunterId;
    state.match.pendingVotedHunterId = null;
    const vHunter = getSeat(votedHid);
    if (vHunter) {
      startLastWordsSequence([votedHid], "vote_out", function () {
        resumeAfterHunter();
      });
      return;
    }
  }
  const p1 = getPlayerSeat();
  if (state.match.afterHunterNext === "AFTER_VOTE" && p1 && !p1.alive && !state.match.spectatorPrompted) {
    state.match.spectatorPrompted = true;
    const shot = state.match.lastHunterShot;
    const isSelfWK = Boolean((shot && shot.isWolfKing) || p1.isWolfKing);
    const actText = isSelfWK ? "最後帶風向" : "正氣共鳴";
    const ico = isSelfWK ? "🐺" : "⚖️";
    const shotHeadline = (shot && shot.hunterId === getPlayerId())
      ? (ico + " 你已發動" + actText + "，帶走 " + fmtSeatNum(shot.targetId) + "號 " + shot.targetName + "！")
      : (playerNumTag() + " 你已發動" + actText + "並離席");
    state.voteResultPayload = {
      headline: shotHeadline,
      lastWord: "",
      tallies: {},
      groupedVoters: {},
      outId: getPlayerId(),
      maxVotes: 1,
      playerVotedOut: true,
      isHunterOutChoice: true,
      onContinue: beginNightPhase
    };
    state.match.phase = "DAY_VOTE_RESULT";
    updateAllUI();
    voice.speakHost(actText + "已結算，你可以選擇直接結束看底牌，或繼續往下看觀戰。");
    return;
  }
  if (state.match.afterHunterNext === "AFTER_DAWN") {
    const afterDawnProceed = function () {
      if (state.sheriffMode && state.match.day === 1 && state.match.sheriffElectionPending && typeof startSheriffElection === "function") {
        startSheriffElection(function () {
          if (typeof startSheriffOrderPick === "function") {
            startSheriffOrderPick(function (dir) { startDayDiscussion(null, { forcedDir: dir }); });
          } else {
            startDayDiscussion();
          }
        });
        return;
      }
      if (typeof startSheriffOrderPick === "function") {
        startSheriffOrderPick(function (dir) { startDayDiscussion(null, { forcedDir: dir }); });
      } else {
        startDayDiscussion();
      }
    };
    if (state.match.pendingNight1LastWords && state.match.pendingNight1LastWords.length > 0) {
      const lwIds = state.match.pendingNight1LastWords.slice();
      state.match.pendingNight1LastWords = [];
      startLastWordsSequence(lwIds, "first_night", afterDawnProceed);
      return;
    }
    afterDawnProceed();
  } else {
    beginNightPhase();
  }
}

// ==================== NIGHT / HUNTER CONFIRM ====================
function confirmTargetAction() {
  sound.unlock();
  const phase = state.match.phase;
  const target = getSeat(state.selectedSeatId);

  if (phase === "NIGHT_GUARD") {
    if (!target || !target.alive) {
      showToast("請點選 1 位在席夥伴守護！", "warn");
      return;
    }
    if (state.match.lastGuardTargetId === target.id) {
      showToast("《凹嗚》規則：同一位夥伴不可連續兩晚守護！", "warn");
      sound.tone(180, 0.1, "sawtooth", 0.04, 0);
      return;
    }
    state.match.nightState.guardTarget = target.id;
    state.match.lastGuardTargetId = target.id;
    state.match.stats.nightSkillUsed += 1;
    sound.playBlessing();
    sound.tone(620, 0.09, "triangle", 0.05, 0);
    spawnBeam(getPlayerId(), target.id, "#38bdf8", "trust", 760);
    spawnBurst(target.id, ["#38bdf8", "#a5f3fc", "#ffffff"], 18, "ring");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#38bdf8", 340, 0.24);
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
      stage3d.triggerSkillFx("guard_shield", getPlayerId(), target.id, false);
    }
    spawnFx(target.id, "🛡️ 守護結界", "#38bdf8", { scale: 1.12, durationMs: 1450 });
    const guardLabel = target.id === getPlayerId() ? "你自己" : (fmtSeatNum(target.id) + "號 " + target.name);
    addLog({
      kind: "secret",
      title: "🛡️ 雲水結界：今晚守護了 " + guardLabel + "！",
      text: ""
    });
    triggerCutIn("🛡️ 護心結界！", guardLabel + " 獲得今夜守護盾！", "celadon", 1300);
    state.selectedSeatId = null;
    proceedToNightWolf();
    return;
  }

  if (phase === "NIGHT_WOLF") {
    if (!target || !target.alive || target.role === "wolf") {
      showToast("點選 1 位好人當目標！", "warn");
      return;
    }
    state.match.nightState.wolfTarget = target.id;
    state.match.stats.nightSkillUsed += 1;
    spawnBeam(getPlayerId(), target.id, "#f43f5e", "grill", 680);
    spawnBurst(target.id, ["#f43f5e", "#fb7185", "#ffffff"], 18, "slash");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#f43f5e", 340, 0.26);
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
      stage3d.triggerSkillFx("witch_poison", getPlayerId(), target.id, true);
    }
    spawnFx(target.id, "鎖定!", "#f43f5e");
    proceedToNightSeer();
    return;
  }

  if (phase === "NIGHT_SEER") {
    if (state.seerReveal) return;
    if (!target || !target.alive || target.id === getPlayerId()) {
      showToast("先點圓桌 2~" + state.match.totalSeats + "號 頭像！", "warn");
      return;
    }
    const seer = getPlayerSeat();
    const isWolf = target.team === "wolf";
    seer.checkedHistory.push({ day: state.match.day, targetId: target.id, isWolf: isWolf });
    state.match.nightState.seerTarget = target.id;
    state.match.playerKnownRoles[target.id] = isWolf ? "wolf" : "good_verified";
    state.match.stats.nightSkillUsed += 1;
    sound.playBlessing();
    if (isWolf) triggerShake(320);
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
      stage3d.triggerSkillFx("seer_scan", getPlayerId(), target.id, isWolf);
      if (typeof stage3d.triggerCameraPunch === "function") {
        stage3d.triggerCameraPunch(target.id, { fov: 39.5, durationMs: 1300 });
      }
    }
    if (typeof triggerScreenFlash === "function") {
      triggerScreenFlash(isWolf ? "#f43f5e" : "#a78bfa", 420, 0.32);
    }
    spawnBeam(getPlayerId(), target.id, isWolf ? "#f43f5e" : "#a78bfa", isWolf ? "grill" : "trust");
    spawnBurst(target.id, isWolf ? ["#fb7185", "#fbbf24", "#ffffff"] : ["#a78bfa", "#34d399", "#fde68a"], 24, isWolf ? "slash" : "ring");
    setSeatEmotion(target.id, isWolf ? "shock" : "happy", 3200);
    spawnFx(target.id, isWolf ? "抓到了是狼!" : "是好人!", isWolf ? "#f43f5e" : "#34d399", { scale: 1.15, durationMs: 1650 });
    triggerCutIn(
      isWolf ? "🔮 明心查獲酸民狼！" : "🔮 明心查證好夥伴！",
      fmtSeatNum(target.id) + "號 " + target.name + (isWolf ? " 露出心虛破綻！" : " 心懷正氣・確定清白！"),
      isWolf ? "crimson" : "violet",
      1500
    );

    addLog({
      kind: "secret",
      title: isWolf
        ? ("抓到了！" + target.id + "號 " + target.name + "是【 酸民狼】！")
        : ("查過了！" + target.id + "號 " + target.name + "是【 好人】！"),
      text: ""
    });
    state.seerReveal = {
      targetId: target.id,
      targetName: target.name,
      isWolf: isWolf
    };
    updateAllUI();
    if (voice.canSpeak()) {
      voice.speakHost(isWolf
        ? ("查驗結果，" + target.id + "號" + target.name + "是酸民狼！")
        : ("查驗結果，" + target.id + "號" + target.name + "是好人夥伴！"));
    }
    addThreeGoodPoint("heart", "存好心查證身分");
    if (state.autoPlay) {
      state.stepTimer = setTimeout(function () {
        state.seerReveal = null;
        proceedToNightWitch();
      }, 2800);
    }
    return;
  }

  if (phase === "NIGHT_WITCH") {
    resolveDawn();
    return;
  }

  if (phase === "HUNTER_TRIGGER") {
    const selfSeat = getPlayerSeat();
    if (!target || !target.alive || target.id === getPlayerId()) {
      showToast("點選 1 人帶走，或按略過！", "warn");
      return;
    }
    if (selfSeat && selfSeat.isWolfKing && target.role === "wolf") {
      showToast("他是你的酸民狼同伴，請改選好夥伴帶走！", "warn");
      return;
    }
    if (selfSeat && selfSeat.isWolfKing && state.match.stats) {
      state.match.stats.wolfKingStrikes = (state.match.stats.wolfKingStrikes || 0) + 1;
    }
    state.match.stats.nightSkillUsed += 1;
    executeHunterShotPresentation(selfSeat, target);
  }
}

function skipTargetAction() {
  sound.unlock();
  const p = state.match.phase;
  if (p === "NIGHT_GUARD") {
    state.match.lastGuardTargetId = null;
    proceedToNightWolf();
  }
  else if (p === "NIGHT_WOLF") proceedToNightSeer();
  else if (p === "NIGHT_SEER") proceedToNightWitch();
  else if (p === "NIGHT_WITCH") resolveDawn();
  else if (p === "HUNTER_TRIGGER") resumeAfterHunter();
}
