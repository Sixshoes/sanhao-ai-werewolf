/**
 * 夜晚行動引擎（狼襲、預言家、女巫）、目標確認、天亮結算與獵人開槍
 */
"use strict";

function playerHasActiveNightSkillNow() {
  const p = getPlayerSeat();
  if (!p || !p.alive || !state.match) return false;
  if (p.role === "wolf" || p.role === "seer" || p.role === "guard") return true;
  if (p.role === "witch" && state.match.witchPotions && (state.match.witchPotions.heal || state.match.witchPotions.purify)) {
    return true;
  }
  return false;
}

function extractCompleteSlipQuote(rawText, maxLen) {
  const cap = Number(maxLen) || 96;
  const cleaned = String(rawText || "")
    .replace(/\s+/g, " ")
    .replace(/^[「『]+|[」』]+$/g, "")
    .trim();
  if (!cleaned || cleaned.length <= cap) return cleaned;

  const sentences = [];
  const sentRe = /[^。！？]+[。！？]+|[^。！？]+$/g;
  let m;
  while ((m = sentRe.exec(cleaned)) !== null) {
    sentences.push(m[0]);
  }
  let acc = "";
  for (let i = 0; i < sentences.length; i++) {
    if ((acc + sentences[i]).length <= cap) {
      acc += sentences[i];
    } else {
      break;
    }
  }
  if (acc.length >= 24) return acc;

  const first = sentences[0] || cleaned;
  const slice = first.slice(0, cap);
  let cutIdx = -1;
  for (let i = slice.length - 1; i >= Math.min(45, slice.length - 1); i--) {
    if ("，、；：—".indexOf(slice[i]) !== -1) {
      cutIdx = i;
      break;
    }
  }
  if (cutIdx > 0) {
    return slice.slice(0, cutIdx).replace(/[，、；：—]+$/, "") + "…";
  }
  return slice.trim() + "…";
}

function syncCandlelitWatchCluePin(seat, slip, add) {
  if (!state.match || !seat) return;
  if (!Array.isArray(state.match.pinnedClues)) state.match.pinnedClues = [];
  const watchPrefix = "燭下圈防 " + fmtSeatNum(seat.id) + "號";
  state.match.pinnedClues = state.match.pinnedClues.filter(function (c) {
    return !(c && c.kind === "watch" && c.seatId === seat.id && String(c.tag || "").indexOf(watchPrefix) !== -1);
  });
  if (add && typeof pinClue === "function") {
    const tagTxt = slip ? slip.tag : "關鍵發言";
    const quoteTxt = slip ? (slip.quote || slip.excerpt || "今日重點盯防") : "今日重點盯防";
    pinClue(
      seat.id,
      watchPrefix,
      "昨夜燭下覆茶鎖定 " + fmtSeatNum(seat.id) + "號" + seat.name + "（" + tagTxt + "）：「" + quoteTxt + "」",
      "watch"
    );
  }
}

function buildCandlelitNightSlips() {
  if (!state.match || !state.match.started || state.match.day < 2) return [];
  const prevDay = state.match.day - 1;
  const pid = getPlayerId();
  const evs = (state.match.allSpeechEvents || []).filter(function (ev) {
    if (!ev || ev.day !== prevDay || ev.speakerId === pid) return false;
    const s = getSeat(ev.speakerId);
    return Boolean(s && s.alive && ev.rawText);
  });
  if (!evs.length) return [];
  const scored = evs.map(function (ev) {
    let pri = 10;
    let tag = "關鍵表態";
    let stanceNote = "值得明日回看前後邏輯是否一致";
    if (ev.hasToxicSlip) {
      pri += 35;
      tag = "語氣激進";
      stanceNote = "措辭偏急，留意是否轉移焦點";
    } else if (ev.contradiction && ev.contradiction.severity >= 2) {
      pri += 45;
      tag = "言票分裂";
      stanceNote = "發言立場與票型出現落差";
    } else if (ev.contradiction) {
      pri += 32;
      tag = "言詞落差";
      stanceNote = "前後表態微幅擺盪，建議追蹤";
    } else if (ev.claimRole && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[ev.claimRole]) {
      pri += 30;
      tag = "起跳" + ROLE_DEFS[ev.claimRole].name;
      stanceNote = "公開表態身分，明日核對行為";
    } else if (ev.accuseId) {
      pri += 22;
      tag = "點打" + fmtSeatNum(ev.accuseId) + "號";
      stanceNote = "今日主動帶節奏施壓他席";
    } else if (ev.vouchId) {
      pri += 16;
      tag = "力保" + fmtSeatNum(ev.vouchId) + "號";
      stanceNote = "今日主動替他席背書緩頰";
    }
    const s = getSeat(ev.speakerId);
    const raw = String(ev.rawText || "").replace(/\s+/g, " ").trim();
    const quote = extractCompleteSlipQuote(raw, 96);
    return {
      seatId: ev.speakerId,
      name: s ? s.name : (ev.speakerName || ""),
      tag: tag,
      stanceNote: stanceNote,
      quote: quote,
      fullQuote: raw,
      excerpt: quote,
      score: pri,
      pri: pri
    };
  });
  scored.sort(function (a, b) { return b.pri - a.pri; });
  const picked = [];
  const seen = {};
  scored.forEach(function (it) {
    if (!seen[it.seatId] && picked.length < 3) {
      seen[it.seatId] = true;
      picked.push(it);
    }
  });
  return picked;
}

function toggleCandlelitWatchSeat(seatId) {
  if (!state.match || !state.match.candlelitReview || !state.match.candlelitReview.active) return;
  const rev = state.match.candlelitReview;
  if (!Array.isArray(rev.watchIds)) rev.watchIds = [];
  const idx = rev.watchIds.indexOf(seatId);
  const s = getSeat(seatId);
  const slip = (rev.slips || []).find(function (it) { return it && it.seatId === seatId; }) || null;
  if (idx !== -1) {
    rev.watchIds.splice(idx, 1);
    syncCandlelitWatchCluePin(s, slip, false);
  } else {
    if (rev.watchIds.length >= 2) {
      const droppedId = rev.watchIds.shift();
      const droppedSeat = getSeat(droppedId);
      const droppedSlip = (rev.slips || []).find(function (it) { return it && it.seatId === droppedId; }) || null;
      syncCandlelitWatchCluePin(droppedSeat, droppedSlip, false);
    }
    rev.watchIds.push(seatId);
    syncCandlelitWatchCluePin(s, slip, true);
  }
  state.match.candlelitWatchIds = rev.watchIds.slice();
  if (typeof sound !== "undefined" && typeof sound.tone === "function") {
    sound.tone(idx !== -1 ? 420 : 620, 0.06, "triangle", 0.04, 0);
  }
  renderCandlelitNightSlips();
}

function renderCandlelitNightSlips() {
  const list = el("candlelitSlipsList");
  const rev = state.match && state.match.candlelitReview;
  if (!list || !rev || !rev.active) return;
  const watchIds = Array.isArray(rev.watchIds) ? rev.watchIds : [];
  list.innerHTML = "";
  (rev.slips || []).forEach(function (slip) {
    const circled = watchIds.indexOf(slip.seatId) !== -1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "candlelit-slip-btn" + (circled ? " is-circled" : "");
    btn.title = slip.fullQuote || slip.quote || "";
    btn.setAttribute("data-candlelit-seat", String(slip.seatId));
    const displayQuote = slip.quote || slip.excerpt || "";
    btn.innerHTML =
      '<div class="candlelit-slip-head">' +
      '<div class="candlelit-slip-who">' +
      '<span class="candlelit-seat-num">' + escapeHtml(fmtSeatNum(slip.seatId) + "號") + '</span>' +
      '<span class="candlelit-seat-name">' + escapeHtml(slip.name) + '</span>' +
      '<span class="candlelit-slip-tag">' + escapeHtml(slip.tag) + '</span>' +
      '</div>' +
      '<span class="candlelit-slip-mark">' + (circled ? "已圈盯防" : "點卡圈防") + '</span>' +
      '</div>' +
      '<div class="candlelit-slip-quote">「' + escapeHtml(displayQuote) + '」</div>' +
      '<div class="candlelit-slip-foot">' +
      '<span>' + escapeHtml(slip.stanceNote || "留意前後立場一致度") + '</span>' +
      '<span class="candlelit-slip-perk">' + (circled ? "明日亮標 · 贈免費觀微" : "點擊加入明日盯防") + '</span>' +
      '</div>';
    btn.addEventListener("click", function () {
      toggleCandlelitWatchSeat(slip.seatId);
    });
    list.appendChild(btn);
  });
}

function openCandlelitNightReview(onProceed) {
  const slips = buildCandlelitNightSlips();
  if (!slips.length) {
    if (typeof onProceed === "function") onProceed();
    return false;
  }
  // Transition cleanly into night phase BEFORE rendering so LAST_WORDS_SPEECH / DAY_VOTE_RESULT never stays stuck!
  if (!isNightPhase(state.match.phase)) {
    state.match.phase = "NIGHT_WOLF";
    if (typeof orchestrator !== "undefined") {
      orchestrator.emit("phase:changed", { phase: "NIGHT_WOLF", day: state.match.day });
    }
  }
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") {
    stage3d.clearCloseUp();
  }
  state.match.candlelitWatchIds = [];
  state.match.candlelitReview = {
    active: true,
    slips: slips,
    watchIds: [],
    onProceed: onProceed || null,
    finished: false
  };
  updateAllUI();
  renderCandlelitNightSlips();
  const isBrowserUi = typeof window !== "undefined" && typeof window.matchMedia === "function";
  if (isBrowserUi && state.autoPlay) {
    const autoDone = function () {
      if (!state.match || !state.match.started || state.match.phase === "LOBBY" || state.match.phase === "GAME_OVER") return;
      finishCandlelitNightReview();
    };
    state.stepTimer = (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function")
      ? orchestrator.schedule("turn_step", autoDone, 6500)
      : setTimeout(autoDone, 6500);
  }
  return true;
}

function finishCandlelitNightReview() {
  const rev = state.match && state.match.candlelitReview;
  if (!rev || rev.finished) return;
  clearStepTimer();
  rev.finished = true;
  rev.active = false;
  const watchIds = Array.isArray(rev.watchIds) ? rev.watchIds.slice() : [];
  state.match.candlelitWatchIds = watchIds.slice();
  if (watchIds.length > 0 && typeof showToast === "function") {
    showToast("燭下覆茶完成，明日盯防：" + watchIds.map(function (id) { return fmtSeatNum(id) + "號"; }).join("、") + "（明日發言將亮標並贈免費觀微 1 次）", "gold");
  }
  const cb = rev.onProceed;
  rev.onProceed = null;
  if (el("candlelitReviewCard")) el("candlelitReviewCard").classList.add("hidden");
  updateAllUI();
  if (typeof cb === "function") cb();
}

function scheduleNightStep(fn, ms) {
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const noPlayerNight = !playerHasActiveNightSkillNow();
  // Compress idle AI night-resolution delays for non-acting civilians (~1.8s total across 3 roles!)
  const tunedMs = noPlayerNight ? Math.min(ms, 560) : ms;
  const waitMs = ff ? Math.min(ms, 180) : tunedMs;
  const wrapped = function () {
    if (!state.match || !state.match.started || state.match.phase === "LOBBY" || state.match.phase === "GAME_OVER") return;
    const dealOv = el("roleDealOverlay");
    if (dealOv && !dealOv.classList.contains("hidden") && typeof indieFlow !== "undefined") {
      indieFlow.onRoleDealClosed = function () {
        if (!state.match || !state.match.started || state.match.phase === "LOBBY" || state.match.phase === "GAME_OVER") return;
        fn();
      };
      return;
    }
    fn();
  };
  return (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function")
    ? orchestrator.schedule("turn_step", wrapped, waitMs)
    : setTimeout(wrapped, waitMs);
}

function formatNightOrdinalZh(n) {
  const nums = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖", "拾"];
  const v = Math.max(1, Number(n) || 1);
  if (v <= 10) return "第" + nums[v] + "夜";
  return "第 " + v + " 夜";
}

function formatDayOrdinalZh(n) {
  const nums = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖", "拾"];
  const v = Math.max(1, Number(n) || 1);
  if (v <= 10) return "第" + nums[v] + "天";
  return "第 " + v + " 天";
}

// ==================== NIGHT ENGINE ====================
function beginNightPhase() {
  clearStepTimer();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  closeSeatIntel();
  closeRadialMenu();
  state.dragAction.active = false;
  state.lastWordsCtx = null;
  state.voteResultPayload = null;
  state.match.day += 1;
  state.match.activeDirectorEvent = null;
  state.match.directorEventClearedDay = 0;
  state.match.rewriteCritReady = false;
  state.match.microInspectCountToday = 0;
  state.match.candlelitReview = null;
  state.match.candlelitWatchIds = [];
  state.match.candlelitFreeInspectUsedDay = 0;
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

  const isLoneWolfKing = Boolean(state.match && state.match.variantMode === "lone_wolf_king");
  const curAiDiff = (state.match && state.match.aiDifficulty) || state.aiDifficulty;
  state.match.seats.forEach(function (s) {
    s.trustShield = false;
    s.publicVouchId = null;
    s.emojiMood = "";
    if (s.role === "wolf") {
      let pulse = clamp(68 + Math.floor(Math.random() * 25), 55, 96);
      if (isLoneWolfKing) {
        pulse = Math.max(48, pulse - 16);
      }
      if (curAiDiff === "pro") {
        pulse = Math.max(isLoneWolfKing ? 44 : 58, pulse - 12);
      } else if (curAiDiff === "easy") {
        pulse = Math.min(96, pulse + 8);
      }
      s.microPulse = pulse;
    } else {
      s.microPulse = clamp(14 + Math.floor(Math.random() * 24), 10, 46);
    }
  });
  state.match.nightState = { guardTarget: null, wolfTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };

  sound.playNight();
  if (state.match.day > 1) {
    playSkyCurtain("night", "", formatNightOrdinalZh(state.match.day), "");
  }
  addLog({ kind: "night", title: "第 " + state.match.day + "晚・天黑行動", text: "" });

  const runNightRoles = function () {
    const guardSeat = state.match.seats.find(function (s) { return s.role === "guard" && s.alive; });
    if (guardSeat) {
      proceedToNightGuard();
      return;
    }
    proceedToNightWolf();
  };

  const isBrowserUi = typeof window !== "undefined" && typeof window.matchMedia === "function";
  const ffNow = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();

  // v16.0 Eliminated spectator gets a 5s Spirit Intuition Bet before Night resolution!
  if (isBrowserUi && !ffNow && typeof openSpiritRoundBet === "function" && state.match.day >= 2) {
    const canOpenNightBet = (typeof isSpectatorGuessActive !== "function" || isSpectatorGuessActive())
      && !(typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive())
      && getAliveSeats().length >= 2;
    if (canOpenNightBet) {
      if (!isNightPhase(state.match.phase)) {
        state.match.phase = "NIGHT_WOLF";
        if (typeof orchestrator !== "undefined") {
          orchestrator.emit("phase:changed", { phase: "NIGHT_WOLF", day: state.match.day });
        }
      }
      if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") {
        stage3d.clearCloseUp();
      }
      updateAllUI();
      const openedNightBet = openSpiritRoundBet("night_kill", runNightRoles);
      if (openedNightBet) return;
    }
  }
  // Post-vote -> next-day pacing: skip automatic Candlelit Night Review so non-acting roles proceed swiftly to dawn
  runNightRoles();
}

function chooseAiGuardTarget(guardSeat, rngVal) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(guardSeat, { module: "night_guard", phase: "NIGHT_GUARD" })
    : null;
  const self = (snap && snap.self) ? snap.self : guardSeat;
  const diff = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const dayNow = snap ? snap.day : state.match.day;
  const aliveAll = snap ? snap.aliveSeats : getAliveSeats();
  const bannedId = snap ? snap.lastGuardTargetId : (state.match.lastGuardTargetId || null);
  const validPool = aliveAll.filter(function (s) { return s.id !== bannedId; });
  const r = typeof rngVal === "number" ? rngVal : Math.random();
  const gProf = typeof getPersonaProfile === "function" ? getPersonaProfile(self) : null;
  const emptyGuardChance = dayNow === 1
    ? (diff === "pro" ? 0.84 : (diff === "normal" ? 0.68 : (gProf ? clamp(0.16 + gProf.godHideBias * 0.14, 0.16, 0.30) : 0.25)))
    : 0;
  const skipFirstNightClash = dayNow === 1 && r < emptyGuardChance;
  let pickId = null;
  if (!skipFirstNightClash && validPool.length > 0) {
    const exposedSeer = validPool.find(function (s) { return s.claimedRole === "seer" && ((self.suspicionMap && self.suspicionMap[s.id]) || 50) < 60; });
    const witchCount = aliveAll.filter(function (s) { return s.claimedRole === "witch"; }).length;
    const exposedSoloWitch = (diff !== "easy" && witchCount === 1)
      ? validPool.find(function (s) { return s.claimedRole === "witch" && ((self.suspicionMap && self.suspicionMap[s.id]) || 50) < 58; })
      : null;
    const shPending = snap ? snap.sheriffElectionPending : state.match.sheriffElectionPending;
    const shId = snap ? snap.sheriffSeatId : state.match.sheriffSeatId;
    const sheriffTgt = !shPending
      ? validPool.find(function (s) { return s.id === shId && ((self.suspicionMap && self.suspicionMap[s.id]) || 50) < 58; })
      : null;
    const selfGuardExposed = (diff !== "easy" && self.claimedRole === "guard")
      ? validPool.find(function (s) { return s.id === self.id; })
      : null;
    const sortedTrusted = validPool.slice().sort(function (a, b) {
      return ((self.suspicionMap && self.suspicionMap[a.id]) || 50) - ((self.suspicionMap && self.suspicionMap[b.id]) || 50);
    });
    const pick = exposedSeer || exposedSoloWitch || sheriffTgt || selfGuardExposed || sortedTrusted[0];
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

function normalizeWolfTacticKey(tacticKey) {
  if (tacticKey === "mate_fake_seer_gold" || tacticKey === "fake_seer") return "mate_fake_seer_gold";
  if (tacticKey === "player_fake_seer_push" || tacticKey === "pack_push") return "player_fake_seer_push";
  if (tacticKey === "deep_stealth_bus" || tacticKey === "deep_stealth") return "deep_stealth_bus";
  return "mate_fake_seer_gold";
}

function clearWolfScreenTacticTimer() {
  if (state.wolfScreenInterval) {
    clearInterval(state.wolfScreenInterval);
    state.wolfScreenInterval = null;
  }
  state.wolfScreenSecondsLeft = 0;
  const lbl = el("wolfTacticTimerLabel");
  if (lbl) lbl.textContent = "";
}

function startWolfScreenTacticTimer() {
  clearWolfScreenTacticTimer();
  const isBrowserUi = typeof window !== "undefined" && typeof window.matchMedia === "function";
  if (!isBrowserUi || !state.match || !state.match.started || state.match.phase !== "NIGHT_WOLF") return;
  state.wolfScreenSecondsLeft = 10;
  const syncLbl = function () {
    const lbl = el("wolfTacticTimerLabel");
    if (!lbl) return;
    lbl.textContent = state.wolfScreenSecondsLeft > 0
      ? ("屏風密謀倒數 " + state.wolfScreenSecondsLeft + " 秒")
      : "屏風劇本已鎖定";
  };
  syncLbl();
  state.wolfScreenInterval = setInterval(function () {
    if (!state.match || !state.match.started || state.match.phase !== "NIGHT_WOLF") {
      clearWolfScreenTacticTimer();
      return;
    }
    const dealOv = el("roleDealOverlay");
    if (dealOv && !dealOv.classList.contains("hidden")) {
      return;
    }
    state.wolfScreenSecondsLeft = Math.max(0, (state.wolfScreenSecondsLeft || 0) - 1);
    syncLbl();
    if (state.wolfScreenSecondsLeft <= 0) {
      clearWolfScreenTacticTimer();
      const lbl = el("wolfTacticTimerLabel");
      if (lbl) lbl.textContent = "屏風劇本已拍板";
    }
  }, 1000);
}

function applyWolfNightTactic(tacticKey) {
  const m = state.match;
  if (!m || !m.started || m.phase !== "NIGHT_WOLF") return false;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  if (!pSeat || !pSeat.alive || pSeat.role !== "wolf") return false;
  const mates = m.seats.filter(function (s) { return s.id !== pid && s.alive && s.role === "wolf"; });
  const key = normalizeWolfTacticKey(tacticKey);
  const validRawKeys = ["fake_seer", "deep_stealth", "pack_push", "mate_fake_seer_gold", "player_fake_seer_push", "deep_stealth_bus"];
  m.wolfTactic = validRawKeys.indexOf(tacticKey) !== -1 ? tacticKey : key;
  clearWolfScreenTacticTimer();
  mates.forEach(function (mt, idx) {
    mt.fakeSeer = (key === "mate_fake_seer_gold" && idx === 0);
  });
  const replyMap = {
    mate_fake_seer_gold: "收到！明天白天我親自悍跳明心觀察員，直接發你一張金水保你做高身分！",
    player_fake_seer_push: "明白！明天白天讓你悍跳定調，我們全員幫你衝票抬轎，一口氣壓垮好人！",
    deep_stealth_bus: "了解！明天全員深水倒鉤、適度互踩拉開距離做身分，讓好人完全摸不清狼坑！"
  };
  const labelMap = {
    mate_fake_seer_gold: "同伴悍跳發我金水",
    player_fake_seer_push: "我親自悍跳同伴衝票",
    deep_stealth_bus: "全員深水倒鉤互踩做身分"
  };
  const primaryMate = mates[0];
  const wolfNightLine = replyMap[key];
  if (primaryMate) {
    if (typeof setSeatBubble === "function") setSeatBubble(primaryMate.id, wolfNightLine, "wolf", 5200);
    if (typeof setSeatEmotion === "function") setSeatEmotion(primaryMate.id, "proud", 3200);
    if (typeof nudgeSeat === "function") nudgeSeat(primaryMate.id, { scale: 1.08, vy: -4 });
    if (typeof spawnBeam === "function") spawnBeam(pid, primaryMate.id, "#f43f5e", "grill", 700);
  }
  addLog({
    kind: "secret",
    title: "屏風密謀拍板【" + labelMap[key] + "】",
    text: primaryMate ? (fmtSeatNum(primaryMate.id) + "號" + primaryMate.name + "：「" + wolfNightLine + "」") : "獨狼定計，明早按劇本行事。"
  });
  if (typeof updateAllUI === "function") updateAllUI();
  return true;
}

function proceedToNightWolf() {
  clearStepTimer();
  clearWolfScreenTacticTimer();
  state.selectedSeatId = null;
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
  state.match.phase = "NIGHT_WOLF";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_WOLF", day: state.match.day });
  updateAllUI();

  const player = getPlayerSeat();
  if (player && player.alive && player.role === "wolf") {
    voice.speakHost("第" + state.match.day + "晚，天黑請靜心。鍵盤酸民狼請選擇今晚散播迷霧的對象，並可於屏風密謀指定明日戰術。", undefined, "host_night");
    const mate = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.alive && s.role === "wolf"; });
    const candidates = getAliveSeats().filter(function (s) { return s.role !== "wolf"; });
    if (mate && candidates.length > 0) {
      const pick = chooseAiWolfTargetBlind(mate);
      if (pick) {
        state.selectedSeatId = pick.id;
        const pickLbl = fmtSeatNum(pick.id) + "號" + pick.name;
        const planLine = typeof buildPersonaWolfNightLine === "function"
          ? buildPersonaWolfNightLine(mate, pickLbl, mate.fakeSeer ? "fake_seer_plan" : "stealth_plan")
          : (mate.fakeSeer
            ? ("噓…今晚我們先鎖定 " + pickLbl + "，明天白天我幫你冒充明心觀察員帶風向！")
            : ("噓…我感覺 " + pickLbl + "很像核心好夥伴，今晚先請他暫離如何？已幫你標起來！"));
        setSeatBubble(mate.id, planLine, "wolf", 6800);
        spawnBeam(mate.id, pick.id, "#f43f5e", "grill", 900);
        addLog({ kind: "secret", title: "酸民狼屏風密談（" + fmtSeatNum(mate.id) + "號" + mate.name + "）：", text: planLine });
      }
    }
    startWolfScreenTacticTimer();
    updateAllUI();
  } else {
    if (player && player.alive && player.role === "seer") {
      voice.speakHost("第" + state.match.day + "晚，天黑請靜心。明心觀察員請點擊外圍座位查證身分。", undefined, "host_night");
    } else if (!(typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) && !(player && player.alive && player.role === "guard")) {
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
  const self = (snap && snap.self) ? snap.self : wolfSeat;
  const goodTargets = snap
    ? snap.aliveOthers.filter(function (s) { return !s.isWolfMate; })
    : getAliveSeats().filter(function (s) { return s.role !== "wolf"; });
  if (!goodTargets.length) return null;

  // v16.0 Night-1 Self-Knife Bait (自刀騙藥／博銀水) in normal (~22%) & pro (~28%) when >= 2 alive wolves exist (strictly Blind-View legal!)
  const dayNow = snap ? snap.day : (state.match ? state.match.day : 1);
  const diffNow = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const aliveMates = snap
    ? (snap.knownWolfMates || []).filter(function (m) { return m && m.alive; })
    : getAliveSeats().filter(function (s) { return s.role === "wolf" && s.id !== wolfSeat.id; });
  const wolfPackCount = (self && self.alive ? 1 : 0) + aliveMates.length;
  const selfKnifeProb = (dayNow === 1 && wolfPackCount >= 2)
    ? (diffNow === "pro" ? 0.28 : (diffNow === "normal" ? 0.22 : 0))
    : 0;
  if (selfKnifeProb > 0) {
    const roll = typeof rngVal === "number" ? rngVal : Math.random();
    if (roll < selfKnifeProb) {
      // Pick self (or fake-seer wolf mate if self is not fakeSeer) — strictly using Blind-View self/knownWolfMates!
      const baitSeat = (self && self.alive) ? self : aliveMates[0];
      if (baitSeat) {
        if (typeof antiCheatMonitor !== "undefined" && wolfSeat) {
          antiCheatMonitor.recordDecision("night_wolf", wolfSeat.id, "首夜自刀騙藥 " + baitSeat.id + "號");
        }
        return baitSeat;
      }
    }
  }

  const picked = chooseAiWolfTarget(goodTargets, { snap: snap, rngVal: rngVal, wolfSeat: self });
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
  const dayNow = snap ? (snap.day || 1) : ((state.match && state.match.day) || 1);
  const seerChance = diff === "pro" ? 0.96 : (diff === "easy" ? 0.45 : 0.85);
  const witchChance = diff === "pro" ? 0.90 : (diff === "easy" ? 0.38 : 0.78);
  const guardChance = diff === "pro" ? 0.88 : (diff === "easy" ? 0.35 : 0.72);
  const exposedSeer = goodTargets.find(function (s) { return s.claimedRole === "seer"; });
  const exposedWitch = goodTargets.find(function (s) { return s.claimedRole === "witch"; });
  const exposedGuard = goodTargets.find(function (s) { return s.claimedRole === "guard"; });
  const allSeats = snap ? snap.seats : ((state.match && state.match.seats) || []);
  const guardBoardOn = snap ? snap.hasGuardMode : Boolean(state.guardMode && state.match && state.match.totalSeats >= 8);
  const deadClaimedGuard = !guardBoardOn || allSeats.some(function (s) { return !s.alive && s.claimedRole === "guard"; });

  // Pro Day 2+ Guard Cross-Knife (穿刀): if Guard may still be alive protecting exposed Seer, occasionally pivot to secondary core Good seat!
  if (diff === "pro" && dayNow >= 2 && snap && exposedSeer && !deadClaimedGuard) {
    const shPendingCross = snap.sheriffElectionPending;
    const shIdCross = shPendingCross ? null : snap.sheriffSeatId;
    const shCross = shIdCross ? goodTargets.find(function (s) { return s.id === shIdCross && s.id !== exposedSeer.id && s.claimedRole !== "hunter"; }) : null;
    const calmCross = goodTargets.filter(function (s) {
      return s.id !== exposedSeer.id && s.claimedRole !== "hunter" && !s.voteDisabled;
    }).sort(function (a, b) {
      return snap.getObservableHeatOnSeat(a.id) - snap.getObservableHeatOnSeat(b.id);
    })[0] || null;
    const secondaryGood = (exposedWitch && exposedWitch.id !== exposedSeer.id ? exposedWitch : null) || shCross || calmCross;
    if (secondaryGood && rand() < 0.35) return secondaryGood;
  }

  if (exposedSeer && rand() < seerChance) return exposedSeer;
  if (exposedWitch && rand() < witchChance) return exposedWitch;
  if (exposedGuard && rand() < guardChance) return exposedGuard;

  if (diff === "pro" || diff === "normal") {
    // Strictly observable table state via Blind-View: if claimed Seer, Witch & Guard are all dead, exposed Hunter may be last God!
    const deadClaimedSeer = allSeats.some(function (s) { return !s.alive && s.claimedRole === "seer"; });
    const deadClaimedWitch = allSeats.some(function (s) { return !s.alive && s.claimedRole === "witch"; });
    const exposedHunter = goodTargets.find(function (s) { return s.claimedRole === "hunter"; });
    if (deadClaimedSeer && deadClaimedWitch && deadClaimedGuard && exposedHunter && rand() < (diff === "pro" ? 0.92 : 0.78)) {
      return exposedHunter;
    }
    const nonHunters = goodTargets.filter(function (s) { return s.claimedRole !== "hunter"; });
    const smartPool = nonHunters.length > 0 ? nonHunters : goodTargets;
    const shPending = snap ? snap.sheriffElectionPending : state.match.sheriffElectionPending;
    const shId = shPending ? null : (snap ? snap.sheriffSeatId : state.match.sheriffSeatId);
    const sheriffTarget = shId ? smartPool.find(function (s) { return s.id === shId; }) : null;
    if (sheriffTarget && rand() < (diff === "pro" ? 0.75 : 0.60)) return sheriffTarget;
    const shieldTarget = smartPool.find(function (s) { return s.trustShield; });
    if (shieldTarget && rand() < (diff === "pro" ? 0.65 : 0.55)) return shieldTarget;
    if (snap && dayNow >= 2 && smartPool.length > 1) {
      // Keep high-heat daytime mislynch baits alive; knife calm low-heat non-Elder Good seats!
      const nonElderSmart = smartPool.filter(function (s) { return !s.voteDisabled; });
      const calmBase = nonElderSmart.length > 0 ? nonElderSmart : smartPool;
      const calmPool = calmBase.filter(function (s) { return snap.getObservableHeatOnSeat(s.id) < 58; });
      const sortedPool = (calmPool.length > 0 ? calmPool : calmBase).slice().sort(function (a, b) {
        return snap.getObservableHeatOnSeat(a.id) - snap.getObservableHeatOnSeat(b.id);
      });
      if (sortedPool[0] && rand() < (diff === "pro" ? 0.78 : 0.62)) return sortedPool[0];
    }
    return smartPool[Math.floor(rand() * smartPool.length) % smartPool.length];
  }
  const observableShielded = goodTargets.find(function (s) { return s.trustShield; });
  if (observableShielded && rand() < 0.55) return observableShielded;
  // v17.0 阿松當狼習慣：夜間配刀精準鎖定低熱度安靜藏神位（僅依公開可觀測熱度與跳牌，100% 盲視合法）
  if (o.wolfSeat && o.wolfSeat.name === "阿松" && snap && dayNow >= 2 && goodTargets.length > 1) {
    const quietPool = goodTargets.filter(function (s) { return s.claimedRole !== "hunter"; });
    const src = quietPool.length > 0 ? quietPool : goodTargets;
    const sortedQuiet = src.slice().sort(function (a, b) {
      return snap.getObservableHeatOnSeat(a.id) - snap.getObservableHeatOnSeat(b.id);
    });
    if (sortedQuiet[0] && rand() < 0.72) return sortedQuiet[0];
  }
  return goodTargets[Math.floor(rand() * goodTargets.length) % goodTargets.length];
}

function chooseAiSeerTarget(seerSeat) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(seerSeat, { module: "night_seer", phase: "NIGHT_SEER" })
    : null;
  const self = (snap && snap.self) ? snap.self : seerSeat;
  const diff = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const checkedIds = (self.checkedHistory || []).map(function (c) { return c.targetId; });
  const aliveOthers = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== seerSeat.id; });
  const pool = aliveOthers.filter(function (s) { return checkedIds.indexOf(s.id) === -1; });
  const rawCandidates = (pool.length > 0 ? pool : aliveOthers).slice();
  const nonRivalPool = rawCandidates.filter(function (s) { return s.claimedRole !== "seer"; });
  const candidates = (nonRivalPool.length > 0 ? nonRivalPool : rawCandidates).slice();
  if (!candidates.length) return null;

  // Authentic Badge Flow Execution: True AI Seer prioritizes their own declared 1st -> 2nd Badge Flow target!
  const ownFlow = (snap && snap.sheriffBadgeFlow && snap.sheriffBadgeFlow.ownerId === self.id)
    ? snap.sheriffBadgeFlow
    : ((snap && snap.sheriffBadgeFlowsBySeat && snap.sheriffBadgeFlowsBySeat[self.id]) || null);
  if (ownFlow) {
    const flowIds = [ownFlow.firstTargetId, ownFlow.secondTargetId].filter(Boolean);
    for (let fi = 0; fi < flowIds.length; fi++) {
      const fHit = pool.find(function (s) { return s.id === flowIds[fi] && s.claimedRole !== "seer"; });
      if (fHit) {
        if (typeof antiCheatMonitor !== "undefined" && self) {
          antiCheatMonitor.recordDecision("night_seer", self.id, "依警徽流查驗 " + fHit.id + "號");
        }
        return fHit.id;
      }
    }
  }
  const sProf = typeof getPersonaProfile === "function" ? getPersonaProfile(self) : null;
  const pubEvsS = snap ? snap.allSpeechEvents : [];
  const shRecSeer = snap ? snap.sheriffVoteRecord : null;
  const voteHistSeer = snap ? (snap.voteHistory || []) : [];
  const claimedCountByRole = {};
  aliveOthers.forEach(function (s) {
    if (s && s.claimedRole) claimedCountByRole[s.claimedRole] = (claimedCountByRole[s.claimedRole] || 0) + 1;
  });
  const rivalSeersOnStand = (shRecSeer && Array.isArray(shRecSeer.seerClaimIds))
    ? shRecSeer.seerClaimIds.filter(function (cid) { return cid !== self.id; })
    : [];
  const scoreSeerCheck = function (s) {
    let sc = (self.suspicionMap && self.suspicionMap[s.id]) || 50;
    if (diff === "easy") return sc;
    if (s.voteDisabled) sc -= 35;
    if ((s.claimedRole === "witch" || s.claimedRole === "guard" || s.claimedRole === "hunter") && claimedCountByRole[s.claimedRole] === 1) {
      sc -= 20;
    }
    if (shRecSeer && Array.isArray(shRecSeer.ballots) && rivalSeersOnStand.length > 0) {
      const votedRival = shRecSeer.ballots.some(function (b) {
        return b && b.voterId === s.id && rivalSeersOnStand.indexOf(b.targetId) !== -1;
      });
      if (votedRival) sc += (diff === "pro" ? 24 : 18);
    }
    const votedSelf = voteHistSeer.some(function (vh) {
      return (vh.ballots || []).some(function (b) { return b && b.voterId === s.id && b.targetId === self.id; });
    });
    if (votedSelf) sc += (diff === "pro" ? 20 : 14);
    const accusedSelf = pubEvsS.some(function (ev) { return ev && ev.speakerId === s.id && ev.accuseId === self.id; });
    if (accusedSelf) sc += 12;
    return sc;
  };
  candidates.sort(function (a, b) {
    const susDiff = scoreSeerCheck(b) - scoreSeerCheck(a);
    if (Math.abs(susDiff) >= 4) return susDiff;
    // Blind-View tie-breaker: analytical personas check outspoken/high-activity seats; intuitive personas check quieter seats
    const actA = pubEvsS.filter(function (ev) { return ev.speakerId === a.id && ev.accuseId; }).length;
    const actB = pubEvsS.filter(function (ev) { return ev.speakerId === b.id && ev.accuseId; }).length;
    const dir = (sProf && sProf.credulity <= 0.65) ? 1 : -1;
    return (actB - actA) * dir;
  });
  const targetId = candidates[0] ? candidates[0].id : null;
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("night_seer", self.id, targetId ? ("查驗 " + targetId + "號") : "無目標");
  }
  return targetId;
}

function proceedToNightSeer() {
  clearStepTimer();
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
  state.match.phase = "NIGHT_SEER";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_SEER", day: state.match.day });
  state.selectedSeatId = null;
  updateAllUI();

  const seer = state.match.seats.find(function (s) { return s.role === "seer"; });
  if (!seer || !seer.alive) {
    if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
      prewarmSheriffElectionPipeline({ skipPendingWitch: true });
    }
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
      if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
        prewarmSheriffElectionPipeline({ skipPendingWitch: true });
      }
      proceedToNightWitch();
    }, 650);
  }
}

function chooseAiWitchNightAction(witchSeat, rngVal) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(witchSeat, { module: "night_witch", phase: "NIGHT_WITCH" })
    : null;
  const self = (snap && snap.self) ? snap.self : witchSeat;
  const pots = (snap && snap.witchPotions) ? snap.witchPotions : state.match.witchPotions;
  const day = snap ? snap.day : state.match.day;
  const diff = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const twinTea = Boolean(snap ? snap.witchCanPurifyNight1 : (state.match && state.match.variantMode === "twin_tea"));
  const canSelfHealN1 = snap ? (snap.witchCanSelfHealNight1 !== false) : !twinTea;
  // Blind-View ONLY exposes nightWolfVictimId if heal potion is still available!
  const victimId = snap ? snap.nightWolfVictimId : (pots && pots.heal ? state.match.nightState.wolfTarget : null);
  let heal = false;
  let poisonTargetId = null;

  const aiCanHeal = Boolean(pots && pots.heal && victimId && (victimId !== self.id || (day === 1 && canSelfHealN1)));
  if (aiCanHeal) {
    const susp = (self.suspicionMap && self.suspicionMap[victimId]) || 50;
    const vicSeat = snap ? snap.getSeat(victimId) : (typeof getSeat === "function" ? getSeat(victimId) : null);
    if (day === 1) {
      // v16.0 Dynamic Night-1 Heal Probability (breaks 100% auto-save iron rule! normal ~70%, pro ~55%, easy ~85%)
      const baseProb = diff === "pro" ? 0.55 : (diff === "easy" ? 0.85 : 0.70);
      const prof = typeof getPersonaProfile === "function" ? getPersonaProfile(self) : null;
      const personaAdj = prof ? ((prof.credulity - 0.75) * 0.16) : 0;
      const selfSaveAdj = (victimId === self.id) ? 0.12 : 0;
      const minP = diff === "pro" ? 0.45 : (diff === "easy" ? 0.76 : 0.60);
      const maxP = diff === "pro" ? 0.68 : (diff === "easy" ? 0.94 : 0.82);
      const finalProb = clamp(baseProb + personaAdj + selfSaveAdj, minP, maxP);
      const roll = typeof rngVal === "number" ? rngVal : Math.random();
      if (roll < finalProb) {
        heal = true;
      }
    } else {
      const vicFakeWitch = Boolean(diff !== "easy" && vicSeat && vicSeat.claimedRole === "witch");
      const vicIsSeer = Boolean(vicSeat && vicSeat.claimedRole === "seer");
      if (!vicFakeWitch && ((vicIsSeer && susp < 66) || susp < (diff === "pro" ? 58 : 62))) {
        heal = true;
      }
    }
  }
  const canPurifyTonight = Boolean(!heal && pots && pots.purify && (day >= 2 || twinTea));
  if (canPurifyTonight) {
    const aliveOthers = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== witchSeat.id; });
    const fakeWitch = diff !== "easy"
      ? aliveOthers.find(function (s) { return s.claimedRole === "witch"; })
      : null;
    if (fakeWitch) {
      poisonTargetId = fakeWitch.id;
    } else {
      const purifyThreshold = diff === "easy"
        ? ((day === 1 && twinTea) ? 62 : 78)
        : (diff === "pro"
          ? ((day === 1 && twinTea) ? 56 : (aliveOthers.length <= 4 ? 58 : 66))
          : ((day === 1 && twinTea) ? 58 : 70));
      const suspects = aliveOthers.filter(function (s) {
        if (s.id === self.savedSeatId) return false;
        if (diff !== "easy" && s.voteDisabled) return false;
        return ((self.suspicionMap && self.suspicionMap[s.id]) || 0) >= purifyThreshold;
      });
      if (suspects.length > 0) {
        const slotViewW = (diff !== "easy" && snap && typeof buildTableSlotAndWorldAnalysis === "function")
          ? buildTableSlotAndWorldAnalysis(self, snap)
          : null;
        const fakeSeerIdW = (slotViewW && slotViewW.dualSeerWorlds && slotViewW.dualSeerWorlds.chosenWorld && slotViewW.dualSeerWorlds.chosenWorld.fakeSeer)
          ? slotViewW.dualSeerWorlds.chosenWorld.fakeSeer.id
          : null;
        const hunterClaimCount = aliveOthers.filter(function (s) { return s.claimedRole === "hunter"; }).length;
        const scorePurify = function (s) {
          let sc = (self.suspicionMap && self.suspicionMap[s.id]) || 0;
          if (diff !== "easy") {
            if (fakeSeerIdW && s.id === fakeSeerIdW) sc += 14;
            if (s.claimedRole === "hunter" && hunterClaimCount === 1) sc -= 15;
          }
          return sc;
        };
        suspects.sort(function (a, b) {
          return scorePurify(b) - scorePurify(a);
        });
        poisonTargetId = suspects[0].id;
      }
    }
  }
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("night_witch", self.id, heal ? ("護回 " + victimId + "號") : (poisonTargetId ? ("清心 " + poisonTargetId + "號") : "保留茶盞"));
  }
  return { heal: heal, victimId: heal ? victimId : null, poisonTargetId: poisonTargetId };
}

function proceedToNightWitch() {
  clearStepTimer();
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
  state.match.phase = "NIGHT_WITCH";
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "NIGHT_WITCH", day: state.match.day });
  state.selectedSeatId = null;
  updateAllUI();

  const witch = state.match.seats.find(function (s) { return s.role === "witch"; });
  if (!witch || !witch.alive || (!state.match.witchPotions.heal && !state.match.witchPotions.purify)) {
    if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
      prewarmSheriffElectionPipeline({ skipPendingWitch: false });
    }
    state.stepTimer = scheduleNightStep(resolveDawn, 580);
    return;
  }
  if (witch.id === getPlayerId()) {
    const vic = getSeat(state.match.nightState.wolfTarget);
    const twinTeaNow = state.match.variantMode === "twin_tea";
    const canSelfOrOtherHeal = Boolean(state.match.witchPotions.heal && vic && (vic.id !== witch.id || (state.match.day === 1 && !twinTeaNow)));
    if (state.match.witchPotions.heal && vic) {
      voice.speakHost(canSelfOrOtherHeal
        ? ("滴水奉茶師請睜眼，今晚" + vic.id + "號" + vic.name + "被迷霧鎖定了，要端出暖心回甘茶護回他嗎？")
        : (twinTeaNow
          ? "滴水奉茶師請睜眼，雙刃毒茗局首夜不可自救，但已解禁清心醒神茶，請決定是否出手。"
          : "滴水奉茶師請睜眼，今晚你被迷霧鎖定了，第2夜起不可自護，可選擇是否使用清心醒神茶。"), undefined, "host_night");
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
      if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
        prewarmSheriffElectionPipeline({ skipPendingWitch: false });
      }
      resolveDawn();
    }, 650);
  }
}

// ==================== DAWN & HUNTER ====================
function resolveDawn() {
  clearStepTimer();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
  state.activeBubble = null;

  // 標準狼人殺規則：第 1 天若啟用警長制度，天亮先「上警競選」，全員在席完成競選後才公布首夜倒牌／平安夜！
  if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof startSheriffElection === "function") {
    sound.playDawn();
    state.match.pendingDawnAfterSheriff = true;
    state.match.dawnAfterSheriffRan = true;
    playSkyCurtain("day", "", formatDayOrdinalZh(1), "天亮請睜眼・先進行上警競選");
    startSheriffElection(function () {
      if (!state.match.started || state.match.phase === "GAME_OVER") return;
      state.match.pendingDawnAfterSheriff = false;
      resolveDawn();
    });
    return;
  }

  const afterPreDawnSheriff = Boolean(state.match.day === 1 && state.match.dawnAfterSheriffRan);
  state.match.pendingDawnAfterSheriff = false;
  state.match.dawnAfterSheriffRan = false;
  if (!afterPreDawnSheriff) {
    sound.playDawn();
  }
  if (typeof orchestrator !== "undefined") orchestrator.emit("phase:changed", { phase: "DAWN_RESOLVE", day: state.match.day });

  const ns = state.match.nightState;
  if (typeof resolveSpiritRoundBet === "function") {
    resolveSpiritRoundBet("night_kill", ns.wolfTarget || null);
  }
  const casualties = [];
  const names = [];
  const fallenIds = [];
  const poisonedId = ns.witchPoisonTarget || null;
  const guardedId = ns.guardTarget || null;
  const isGuardedWolfTarget = Boolean(ns.wolfTarget && guardedId && ns.wolfTarget === guardedId);
  const isDoubleSaveClash = Boolean(isGuardedWolfTarget && ns.witchSaved);
  const wolfKillBlocked = Boolean((ns.witchSaved && !isGuardedWolfTarget) || (isGuardedWolfTarget && !ns.witchSaved));
  const fogSealOn = state.match.variantMode === "fog_seal";
  state.match.guardBlockedLastNight = Boolean(isGuardedWolfTarget && !ns.witchSaved);
  if (state.match.guardBlockedLastNight) {
    if (state.match.stats) state.match.stats.guardBlocks = (state.match.stats.guardBlocks || 0) + 1;
    const gSeatChk = state.match.seats.find(function (s) { return s.role === "guard" && s.alive; });
    if (gSeatChk && gSeatChk.id === getPlayerId()) {
      state.match.guardAwakenBonusWeightDay = state.match.day;
    }
  }
  let wolfKillSeat = null;

  // 凹嗚《狼刀在先》＆《同守同救奶穿》原則：先結算夜晚未擋下的狼刀；若已達屠神／屠民終局，毒茶／獵人共鳴／警徽移交皆不再觸發！
  if (ns.wolfTarget && !wolfKillBlocked) {
    const wk = getSeat(ns.wolfTarget);
    if (wk && wk.alive) {
      wk.alive = false;
      wk.outReason = fogSealOn
        ? "已離席（迷霧封牌）"
        : ((poisonedId && poisonedId === wk.id) ? "清心茶請離" : (isDoubleSaveClash ? "同守同救破盾" : "夜間迷霧暫離"));
      wolfKillSeat = wk;
      const wCause = (poisonedId && poisonedId === wk.id) ? "purify" : (isDoubleSaveClash ? "double_clash" : "wolf");
      casualties.push({ id: wk.id, cause: wCause });
      names.push(wk.id + "號" + wk.name);
      fallenIds.push(wk.id);
      spawnFx(wk.id, (!fogSealOn && isDoubleSaveClash) ? "同守破盾" : "暫離冷靜", (!fogSealOn && isDoubleSaveClash) ? "#f59e0b" : "#e11d48");
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
      ps.outReason = fogSealOn ? "已離席（迷霧封牌）" : "清心茶請離";
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
    if (afterPreDawnSheriff) {
      addLog({ kind: "dawn", title: "警長競選結束，公布昨夜結果：昨晚平安夜！沒人出局", text: "" });
      dawnVoiceLine = "警長競選結束！現在公布昨夜結果，昨晚是平安夜，沒有人出局，準備開始輪流發言。";
    } else {
      playSkyCurtain("day", "", formatDayOrdinalZh(state.match.day), "昨夜平安，全員在場");
      addLog({ kind: "dawn", title: "天亮了：昨晚平安夜！沒人出局", text: "" });
      dawnVoiceLine = "第" + state.match.day + "天，天亮請睜眼！昨晚是平安夜，沒有人出局，現在開始輪流發言。";
    }
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
    const noLwTag = state.match.day >= 2 ? "（第2夜起夜間離席一律覆杯閉麥、無遺言）" : "（首夜離席保留遺言）";
    if (afterPreDawnSheriff) {
      addLog({ kind: "dawn", title: "警長競選結束，公布首夜倒牌：" + names.join("、") + " 昨夜離席冷靜" + noLwTag, text: "" });
      dawnVoiceLine = "警長競選結束！現在公布昨夜結果，昨晚" + names.join("、") + "首夜倒牌離席，請發表首夜遺言。";
    } else {
      playSkyCurtain("day", "", formatDayOrdinalZh(state.match.day), "昨夜 " + names.join("、") + " 離席" + (state.match.day >= 2 ? "・覆杯無遺言" : ""));
      addLog({ kind: "dawn", title: "天亮了：" + names.join("、") + " 昨夜離席冷靜" + noLwTag, text: "" });
      dawnVoiceLine = "第" + state.match.day + "天，天亮請睜眼！昨晚" + names.join("、") + "離席冷靜了。" + (state.match.day >= 2 ? "第2夜起夜間離席一律無遺言，直接覆杯閉麥。" : "請發表首夜遺言。");
    }
  }
  if (typeof evaluateRoleMission === "function") evaluateRoleMission();
  if (typeof evaluateMatchPointState === "function") evaluateMatchPointState();

  if (fallenIds.indexOf(getPlayerId()) !== -1) {
    if (typeof autoEnableSpectatorCompactPace === "function") autoEnableSpectatorCompactPace();
    const fallenPlayer = getPlayerSeat();
    if (fallenPlayer && typeof showToast === "function") {
      showToast(
        fallenPlayer.team === "wolf"
          ? "你昨夜已離席，已切為觀戰緊湊節奏，可參與席外茶靈押注與猜神職。"
          : "你昨夜已離席，已切為觀戰緊湊節奏，可參與席外茶靈押注與猜狼。",
        "emerald"
      );
    }
  }

  // Remember Day-1 fallen seats for official Spotlight First-Night Last Words!
  state.match.pendingNight1LastWords = (state.match.day === 1 && fallenIds.length > 0) ? fallenIds.slice() : [];
  if (state.match.pendingNight1LastWords.length > 0 && typeof prefetchAiLastWords === "function") {
    prefetchAiLastWords(state.match.pendingNight1LastWords, "first_night");
  }

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
      const ffHunterDawn = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
      if (!ffHunterDawn) {
        voice.speakHost(dawnVoiceLine + "直心糾察長發動正氣共鳴，請選擇一人一同離席冷靜。", undefined, "host_dawn");
      }
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

function settleNightCasualtiesOnElectionExplode() {
  const m = state.match;
  if (!m || !m.started) return false;
  const ns = m.nightState || {};
  if (typeof resolveSpiritRoundBet === "function") {
    resolveSpiritRoundBet("night_kill", ns.wolfTarget || null);
  }
  const casualties = [];
  const names = [];
  const poisonedId = ns.witchPoisonTarget || null;
  const guardedId = ns.guardTarget || null;
  const isGuardedWolfTarget = Boolean(ns.wolfTarget && guardedId && ns.wolfTarget === guardedId);
  const isDoubleSaveClash = Boolean(isGuardedWolfTarget && ns.witchSaved);
  const wolfKillBlocked = Boolean((ns.witchSaved && !isGuardedWolfTarget) || (isGuardedWolfTarget && !ns.witchSaved));
  const fogSealOn = m.variantMode === "fog_seal";
  m.guardBlockedLastNight = Boolean(isGuardedWolfTarget && !ns.witchSaved);
  if (m.guardBlockedLastNight) {
    if (m.stats) m.stats.guardBlocks = (m.stats.guardBlocks || 0) + 1;
    const gSeatChk = m.seats.find(function (s) { return s.role === "guard" && s.alive; });
    if (gSeatChk && gSeatChk.id === getPlayerId()) {
      m.guardAwakenBonusWeightDay = m.day;
    }
  }
  let wolfKillSeat = null;
  if (ns.wolfTarget && !wolfKillBlocked) {
    const wk = getSeat(ns.wolfTarget);
    if (wk && wk.alive) {
      wk.alive = false;
      wk.outReason = fogSealOn
        ? "已離席（迷霧封牌）"
        : ((poisonedId && poisonedId === wk.id) ? "清心茶請離" : (isDoubleSaveClash ? "同守同救破盾" : "夜間迷霧暫離"));
      wolfKillSeat = wk;
      const wCause = (poisonedId && poisonedId === wk.id) ? "purify" : (isDoubleSaveClash ? "double_clash" : "wolf");
      casualties.push({ id: wk.id, cause: wCause });
      names.push(wk.id + "號" + wk.name);
    }
  }
  const seerSeatObj = m.seats.find(function (s) { return s.role === "seer"; });
  const witchSeatObj = m.seats.find(function (s) { return s.role === "witch"; });
  const guardSeatObj = m.seats.find(function (s) { return s.role === "guard"; });
  const seerChkSeat = ns.seerTarget ? getSeat(ns.seerTarget) : null;
  if (!m.nightArchive) m.nightArchive = [];

  // 凹嗚《狼刀在先》原則：先判定狼刀是否已達成屠神／屠民終局，再結算清心茶毒殺！
  const wolfKnifeWinReason = (wolfKillSeat && typeof evaluateNightWolfKnifeWin === "function")
    ? evaluateNightWolfKnifeWin(wolfKillSeat, poisonedId)
    : null;
  if (wolfKnifeWinReason) {
    m.nightArchive.push({
      day: m.day,
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
    m.lastNightCasualties = casualties.map(function (c) { return c.id; });
    m.dawnAfterSheriffRan = false;
    if (typeof triggerDawnCasualtyPresentation === "function") triggerDawnCasualtyPresentation(casualties);
    addLog({ kind: "dawn", title: "警上自爆吞警徽・公布昨夜死訊：" + names.join("、") + " 首夜倒牌離席（狼刀在先達成終局）", text: "" });
    if (casualties.some(function (c) { return c.id === getPlayerId(); }) && typeof autoEnableSpectatorCompactPace === "function") {
      autoEnableSpectatorCompactPace();
    }
    if (typeof evaluateRoleMission === "function") evaluateRoleMission();
    if (typeof evaluateMatchPointState === "function") evaluateMatchPointState();
    finishMatch("wolf", wolfKnifeWinReason);
    return true;
  }

  if (poisonedId && (!wolfKillSeat || poisonedId !== wolfKillSeat.id)) {
    const ps = getSeat(poisonedId);
    if (ps && ps.alive) {
      ps.alive = false;
      ps.outReason = fogSealOn ? "已離席（迷霧封牌）" : "清心茶請離";
      casualties.push({ id: ps.id, cause: "purify" });
      names.push(ps.id + "號" + ps.name);
    }
  }
  m.nightArchive.push({
    day: m.day,
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
  m.lastNightCasualties = casualties.map(function (c) { return c.id; });
  m.dawnAfterSheriffRan = false;
  if (casualties.length === 0) {
    m.peaceNights.push(m.day);
    addLog({ kind: "dawn", title: "警上自爆吞警徽・公布昨夜結果：昨晚平安夜，即刻黑燈入夜", text: "" });
  } else {
    if (typeof triggerDawnCasualtyPresentation === "function") triggerDawnCasualtyPresentation(casualties);
    addLog({ kind: "dawn", title: "警上自爆吞警徽・公布昨夜死訊：" + names.join("、") + " 首夜倒牌離席", text: "" });
    if (casualties.some(function (c) { return c.id === getPlayerId(); }) && typeof autoEnableSpectatorCompactPace === "function") {
      autoEnableSpectatorCompactPace();
    }
  }
  if (typeof evaluateRoleMission === "function") evaluateRoleMission();
  if (typeof evaluateMatchPointState === "function") evaluateMatchPointState();
  if (checkAndHandleGameOver()) return true;

  // v18.0 標準規則：警上狼自爆雖吞警徽與遺言，但首夜遭狼刀（非清心茶毒殺）倒牌的直心糾察長仍可翻牌開槍帶人再入夜！
  let explodeHunterSeat = null;
  casualties.forEach(function (c) {
    const seat = getSeat(c.id);
    if (seat && seat.role === "hunter" && (c.cause === "wolf" || c.cause === "double_clash") && c.id !== poisonedId) {
      explodeHunterSeat = seat;
    }
  });
  if (explodeHunterSeat) {
    const ffExpH = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
    if (!ffExpH && typeof voice !== "undefined" && voice.canSpeak()) {
      voice.speakHost("雖有酸民狼警上自爆，但首夜倒牌的直心糾察長仍可發動正氣共鳴，請選擇一人一同離席後再進入黑夜。", undefined, "host_dawn");
    }
    triggerHunterResonance(explodeHunterSeat, "AFTER_ELECTION_EXPLODE");
    return true;
  }
  return false;
}

function chooseAiHunterTarget(hunterSeat) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(hunterSeat, { module: "hunter_shot", phase: "HUNTER_TRIGGER" })
    : null;
  const self = (snap && snap.self) ? snap.self : hunterSeat;
  const diff = (snap && snap.aiDifficulty) || state.aiDifficulty || "normal";
  const isWK = Boolean(self && self.isWolfKing);
  const aliveOthers = (snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== hunterSeat.id; }))
    .filter(function (s) { return !isWK || (snap ? !s.isWolfMate : s.team !== "wolf"); });
  if (!aliveOthers.length) return null;

  let chosenId = null;
  if (isWK) {
    // AI Wolf King legally knows non-Wolf seats via Blind-View, prioritizing ONLY observable claimedRole / sheriff!
    const godPick = aliveOthers.find(function (s) { return s.claimedRole === "seer" || s.claimedRole === "witch" || s.claimedRole === "guard"; });
    const shPending = snap ? snap.sheriffElectionPending : Boolean(state.match && state.match.sheriffElectionPending);
    const shId = shPending ? null : (snap ? snap.sheriffSeatId : state.match.sheriffSeatId);
    const shPick = aliveOthers.find(function (s) { return s.id === shId; });
    let wkFallback = aliveOthers[0];
    if (diff !== "easy" && snap) {
      const nonElderGood = aliveOthers.filter(function (s) { return !s.voteDisabled; });
      const wkPool = nonElderGood.length > 0 ? nonElderGood : aliveOthers;
      wkFallback = wkPool.slice().sort(function (a, b) {
        return snap.getObservableHeatOnSeat(a.id) - snap.getObservableHeatOnSeat(b.id);
      })[0] || wkFallback;
    }
    const wkTarget = godPick || (diff !== "easy" ? shPick : null) || wkFallback;
    chosenId = wkTarget ? wkTarget.id : null;
  } else {
    const fakeHunter = aliveOthers.find(function (s) { return s.claimedRole === "hunter"; });
    if (fakeHunter) {
      chosenId = fakeHunter.id;
    } else {
      const nonElderPool = aliveOthers.filter(function (s) { return !s.voteDisabled; });
      const shootPool = (nonElderPool.length > 0 ? nonElderPool : aliveOthers).slice();
      const slotViewH = (diff !== "easy" && snap && typeof buildTableSlotAndWorldAnalysis === "function")
        ? buildTableSlotAndWorldAnalysis(self, snap)
        : null;
      const worldH = (slotViewH && slotViewH.dualSeerWorlds && slotViewH.dualSeerWorlds.chosenWorld) ? slotViewH.dualSeerWorlds.chosenWorld : null;
      const scoreHunterShot = function (s) {
        let sc = (self.suspicionMap && self.suspicionMap[s.id]) || 50;
        if (worldH && worldH.fakeSeer && worldH.trustedSeer) {
          if (s.id === worldH.fakeSeer.id) sc += 22;
          else if (s.id === worldH.trustedSeer.id) sc -= 20;
        }
        return sc;
      };
      shootPool.sort(function (a, b) {
        return scoreHunterShot(b) - scoreHunterShot(a);
      });
      const best = shootPool[0];
      const shotMin = diff === "easy" ? 58 : (diff === "pro" ? 56 : 52);
      if (best && scoreHunterShot(best) >= shotMin) {
        chosenId = best.id;
      }
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
      title: isWK ? "流言首領最後帶風向！選 1 位好夥伴一同離席冷靜（開槍反撲無遺言）" : "直心糾察長正氣共鳴！選 1 人一同離席冷靜",
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
        const holdRoleLabel = isWK ? "流言首領" : "直心糾察長";
        const holdActLabel = isWK ? "壓下反撲" : "壓下共鳴";
        state.match.lastHunterShot = null;
        state.match.phase = "HUNTER_RESOLVE";
        setCanvasBubble(hunterSeat.id, isWK ? "這波先收手不帶人了，留口氣講完遺言再走！" : "局勢還不明朗，我先壓下共鳴不亂帶人！", "normal");
        addLog({ kind: "dawn", title: holdRoleLabel + " " + hunterSeat.id + "號選擇" + holdActLabel + "，未帶走任何人。", text: "" });
        if (typeof triggerCutIn === "function") {
          triggerCutIn(holdRoleLabel + holdActLabel, fmtSeatNum(hunterSeat.id) + "號 " + hName + " 未帶走任何人", "gold", 1500);
        }
        if (typeof showToast === "function") {
          showToast(holdRoleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 選擇" + holdActLabel + "，未帶走任何人。", "gold");
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
  clearStepTimer();
  targetSeat.alive = false;
  targetSeat.outReason = state.match.variantMode === "fog_seal"
    ? "已離席（迷霧封牌）"
    : (isWK ? "流言反撲請離" : "正氣共鳴請離");
  recordRelation(hunterSeat.id, targetSeat.id, "suspect");
  const lastNightRec = state.match.nightArchive && state.match.nightArchive[state.match.nightArchive.length - 1];
  if (lastNightRec) lastNightRec.hunterShot = { hunterId: hunterSeat.id, targetId: targetSeat.id };

  const hName = hunterSeat.id === getPlayerId() ? "你" : hunterSeat.name;
  const tName = targetSeat.id === getPlayerId() ? "你" : targetSeat.name;
  // 標準狼王規則：狼王開槍帶人後不再發表遺言（被帶走者亦無遺言），直接結算並入夜；直心糾察長公投離席開槍後仍保留遺言。
  if (isWK) {
    state.match.pendingVotedHunterId = null;
  }
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
  spawnFx(hunterSeat.id, isWK ? "流言反撲・無遺言" : "糾察開槍", "#fbbf24", { durationMs: 2200, scale: 1.2 });
  spawnFx(targetSeat.id, "被 " + fmtSeatNum(hunterSeat.id) + "號帶走", "#f43f5e", { durationMs: 2600, scale: 1.35 });
  setCanvasBubble(hunterSeat.id, "我是" + roleLabel + "！帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + "！", "suspect");
  setSeatBubble(targetSeat.id, "遭 " + fmtSeatNum(hunterSeat.id) + "號 " + actLabel + "帶走！", "suspect", 4800);
  if (typeof triggerCutIn === "function") {
    triggerCutIn(
      actLabel + "・帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName,
      isWK
        ? (roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 開槍反撲不留遺言，帶走目標直接離席")
        : (roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 臨離前鎖定目標一同離席"),
      "crimson",
      2350
    );
  }
  if (typeof showToast === "function") {
    showToast(roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + (isWK ? " 一同離席（開槍反撲無遺言）。" : " 一同離席。"), "warn");
  }
  addLog({
    kind: "dawn",
    title: roleLabel + " " + fmtSeatNum(hunterSeat.id) + "號 " + hName + " 發動" + actLabel + "，帶走 " + fmtSeatNum(targetSeat.id) + "號 " + tName + (isWK ? " 一同離席（開槍反撲無遺言）。" : " 一同離席。"),
    text: ""
  });
  const ffHunter = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!ffHunter && typeof voice !== "undefined" && voice.canSpeak()) {
    voice.speakHost(roleLabel + " " + hunterSeat.id + "號" + hName + " 發動" + actLabel + "，帶走 " + targetSeat.id + "號" + tName + (isWK ? " 一同離席冷靜，開槍反撲不留遺言！" : " 一同離席冷靜！"));
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
    const shotInfo = state.match.lastHunterShot;
    const wkFiredNoLastWords = Boolean(
      vHunter && vHunter.isWolfKing && shotInfo && shotInfo.isWolfKing && shotInfo.hunterId === vHunter.id
    );
    if (vHunter && !wkFiredNoLastWords) {
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
    const ico = isSelfWK ? "[首領]" : "[共鳴]";
    const shotHeadline = (shot && shot.hunterId === getPlayerId())
      ? (ico + " 你已發動" + actText + "，帶走 " + fmtSeatNum(shot.targetId) + "號 " + shot.targetName + "！")
      : ((shot && shot.hunterId)
        ? (ico + " 你已遭 " + fmtSeatNum(shot.hunterId) + "號 " + shot.hunterName + " " + actText + "帶走離席！")
        : (playerNumTag() + " 你已發動" + actText + "並離席"));
    const noLwNote = (shot && shot.isWolfKing)
      ? (shot.hunterId === getPlayerId()
        ? "（流言首領開槍反撲不留遺言，直接進入夜晚）"
        : "（遭流言首領開槍反撲帶走，無遺言直接進入夜晚）")
      : "";
    state.voteResultPayload = {
      headline: shotHeadline,
      lastWord: noLwNote,
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
    voice.speakHost((shot && shot.isWolfKing ? "流言首領開槍反撲不留遺言，" : (actText + "已結算，")) + "你可以選擇直接結束看底牌，或繼續往下看觀戰。");
    return;
  }
  if (state.match.afterHunterNext === "AFTER_ELECTION_EXPLODE") {
    beginNightPhase();
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
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
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
    spawnFx(target.id, "守護結界", "#38bdf8", { scale: 1.12, durationMs: 1450 });
    const guardLabel = target.id === getPlayerId() ? "你自己" : (fmtSeatNum(target.id) + "號 " + target.name);
    addLog({
      kind: "secret",
      title: "雲水結界：今晚守護了 " + guardLabel + "！",
      text: ""
    });
    addThreeGoodPoint("deeds", "做好事・護心結界");
    triggerCutIn("護心結界！", guardLabel + " 獲得今夜守護盾！", "celadon", 1300);
    state.selectedSeatId = null;
    proceedToNightWolf();
    return;
  }

  if (phase === "NIGHT_WOLF") {
    const aliveWolvesNow = getAliveSeats().filter(function (s) { return s.role === "wolf"; });
    const allowSelfKnifeN1 = Boolean(state.match.day === 1 && aliveWolvesNow.length >= 2);
    if (!target || !target.alive || (target.role === "wolf" && !allowSelfKnifeN1)) {
      showToast(allowSelfKnifeN1 ? "請點選 1 位在席目標（首夜可點己方執行自刀騙藥）" : "點選 1 位好人當目標！", "warn");
      return;
    }
    clearWolfScreenTacticTimer();
    state.match.nightState.wolfTarget = target.id;
    state.match.stats.nightSkillUsed += 1;
    if (target.role === "wolf") {
      addLog({ kind: "secret", title: "首夜自刀騙藥戰術啟動：鎖定 " + fmtSeatNum(target.id) + "號" + (target.id === getPlayerId() ? "你" : target.name), text: "伺機博取滴水奉茶師暖心回甘茶信任。" });
    }
    spawnBeam(getPlayerId(), target.id, "#f43f5e", "grill", 680);
    spawnBurst(target.id, ["#f43f5e", "#fb7185", "#ffffff"], 18, "slash");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#f43f5e", 340, 0.26);
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
      stage3d.triggerSkillFx("witch_poison", getPlayerId(), target.id, true);
    }
    spawnFx(target.id, target.role === "wolf" ? "自刀博藥" : "鎖定!", "#f43f5e");
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
      isWolf ? "明心查獲酸民狼！" : "明心查證好夥伴！",
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
    if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
      prewarmSheriffElectionPipeline({ skipPendingWitch: true });
    }
    if (state.autoPlay) {
      state.stepTimer = setTimeout(function () {
        state.seerReveal = null;
        proceedToNightWitch();
      }, 2800);
    }
    return;
  }

  if (phase === "NIGHT_WITCH") {
    if (state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
      prewarmSheriffElectionPipeline({ skipPendingWitch: false });
    }
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
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  const p = state.match.phase;
  if (p === "NIGHT_GUARD") {
    state.match.lastGuardTargetId = null;
    proceedToNightWolf();
  }
  else if (p === "NIGHT_WOLF") proceedToNightSeer();
  else if (p === "NIGHT_SEER") proceedToNightWitch();
  else if (p === "NIGHT_WITCH") {
    if (state.match && state.match.day === 1 && state.sheriffMode && state.match.sheriffElectionPending && typeof prewarmSheriffElectionPipeline === "function") {
      prewarmSheriffElectionPipeline({ skipPendingWitch: false });
    }
    resolveDawn();
  }
  else if (p === "HUNTER_TRIGGER") resumeAfterHunter();
}
