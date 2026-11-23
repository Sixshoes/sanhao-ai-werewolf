/**
 * 席外雙陣營推理系統（「好人猜酸民狼 × 酸民狼猜真神職」）
 * 玩家離席觀戰後，依所屬陣營自動啟動專屬推理盤、鎖定勇氣加分與終局開獎結算
 */
"use strict";

function createEmptySpectatorGuess() {
  return {
    wolfIds: [],
    godRoles: { seer: null, witch: null, hunter: null, guard: null },
    activeRoleSlot: "seer",
    locked: false,
    lockedAtDay: 0,
    evaluated: null,
    godViewUnlocked: false
  };
}

function isSpectatorGodViewActive() {
  return Boolean(isSpectatorGuessActive() && state.match && state.match.spectatorGuess && state.match.spectatorGuess.godViewUnlocked);
}

function enableSpectatorGodView() {
  if (!isSpectatorGuessActive()) return false;
  const g = ensureSpectatorGuessState();
  if (g.godViewUnlocked) return true;
  g.godViewUnlocked = true;
  g.locked = false;
  g.wolfIds = [];
  g.godRoles = { seer: null, witch: null, hunter: null, guard: null };
  if (typeof sound !== "undefined" && typeof sound.playBlessing === "function") sound.playBlessing();
  if (typeof addLog === "function") {
    addLog({ kind: "secret", title: "👁 已開啟「上帝視角觀戰」（放棄席外押注加分，可透視全員底牌與即時懷疑熱度）", text: "" });
  }
  if (typeof showToast === "function") {
    showToast("👁 已啟用上帝視角實況！座位與茶席手札將即時揭曉全員底牌與 AI 懷疑度。", "sky");
  }
  if (typeof updateAllUI === "function") updateAllUI();
  return true;
}

function ensureSpectatorGuessState() {
  if (!state.match) return createEmptySpectatorGuess();
  if (!state.match.spectatorGuess) {
    state.match.spectatorGuess = createEmptySpectatorGuess();
  }
  return state.match.spectatorGuess;
}

function isSpectatorGuessActive() {
  const m = state.match;
  if (!m || !m.started) return false;
  const p = m.phase;
  if (p === "LOBBY" || p === "GAME_OVER" || p === "LAST_WORDS_PLAYER" || p === "HUNTER_TRIGGER") return false;
  const player = getPlayerSeat();
  return Boolean(player && !player.alive);
}

function getSpectatorGuessMode() {
  const player = getPlayerSeat();
  return (player && player.team === "wolf") ? "god_hunt" : "wolf_hunt";
}

function getActiveGodRoleKeys() {
  const seats = (state.match && state.match.seats) || [];
  const base = ["seer", "witch", "hunter", "guard"];
  const present = base.filter(function (rk) {
    return seats.some(function (s) { return s.role === rk; });
  });
  if (present.length > 0) return present;
  return (state.match && state.match.totalSeats >= 8) ? ["seer", "witch", "hunter"] : ["seer", "witch"];
}

function formatSpectatorSeatLabel(seat) {
  if (!seat) return "未知";
  const pid = getPlayerId();
  return fmtSeatNum(seat.id) + "號 " + (seat.id === pid ? "你" : seat.name);
}

function toggleSpectatorWolfGuess(seatId) {
  if (!isSpectatorGuessActive() || getSpectatorGuessMode() !== "wolf_hunt") return false;
  const g = ensureSpectatorGuessState();
  if (g.locked) {
    showToast("席外推理已鎖定押注，終局揭曉即可開獎！", "warn");
    return false;
  }
  const pid = getPlayerId();
  const seat = getSeat(seatId);
  if (!seat || seatId === pid) return false;

  const idx = g.wolfIds.indexOf(seatId);
  let selectedNow = false;
  const wolfCap = (state.match && state.match.seats)
    ? Math.max(2, state.match.seats.filter(function (s) { return s.role === "wolf"; }).length)
    : (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2);
  if (idx !== -1) {
    g.wolfIds.splice(idx, 1);
  } else {
    if (g.wolfIds.length >= wolfCap) g.wolfIds.shift();
    g.wolfIds.push(seatId);
    selectedNow = true;
  }

  sound.tone(selectedNow ? 640 : 420, 0.08, "triangle", 0.05, 0);
  if (typeof nudgeSeat === "function") nudgeSeat(seatId, { scale: selectedNow ? 1.12 : 0.94, vy: -3 });
  if (typeof spawnFx === "function") {
    spawnFx(seatId, selectedNow ? "🔍 猜酸民狼" : "取消猜狼", selectedNow ? "#fb7185" : "#94a3b8");
  }
  renderSpectatorGuessPanel();
  return true;
}

function selectSpectatorGodSlot(roleKey) {
  const g = ensureSpectatorGuessState();
  if (g.locked) {
    showToast("席外神職押注已鎖定，靜候終局揭曉！", "warn");
    return false;
  }
  const keys = getActiveGodRoleKeys();
  if (keys.indexOf(roleKey) === -1) return false;
  g.activeRoleSlot = roleKey;
  sound.tone(540, 0.06, "sine", 0.04, 0);
  renderSpectatorGuessPanel();
  return true;
}

function assignSpectatorGodGuess(seatId) {
  if (!isSpectatorGuessActive() || getSpectatorGuessMode() !== "god_hunt") return false;
  const g = ensureSpectatorGuessState();
  if (g.locked) {
    showToast("席外神職押注已鎖定，終局揭曉即可開獎！", "warn");
    return false;
  }
  const seat = getSeat(seatId);
  if (!seat || seat.role === "wolf") {
    showToast("你知道他是酸民狼同伴，請點選其餘好人席位猜測真神職！", "warn");
    return false;
  }

  const keys = getActiveGodRoleKeys();
  const slot = keys.indexOf(g.activeRoleSlot) !== -1 ? g.activeRoleSlot : keys[0];

  if (g.godRoles[slot] === seatId) {
    g.godRoles[slot] = null;
    sound.tone(420, 0.07, "triangle", 0.045, 0);
    if (typeof spawnFx === "function") spawnFx(seatId, "取消指定", "#94a3b8");
  } else {
    keys.forEach(function (k) {
      if (k !== slot && g.godRoles[k] === seatId) g.godRoles[k] = null;
    });
    g.godRoles[slot] = seatId;
    const roleTagMap = { seer: "🔮 猜明心觀察員", witch: "🍵 猜滴水奉茶師", hunter: "⚖️ 猜直心糾察長", guard: "🛡️ 猜護心守衛" };
    sound.tone(680, 0.08, "triangle", 0.055, 0);
    if (typeof nudgeSeat === "function") nudgeSeat(seatId, { scale: 1.12, vy: -3 });
    if (typeof spawnFx === "function") spawnFx(seatId, roleTagMap[slot] || "🔍 猜神職", "#fbbf24");

    const nextEmpty = keys.find(function (k) { return !g.godRoles[k]; });
    if (nextEmpty) g.activeRoleSlot = nextEmpty;
  }

  renderSpectatorGuessPanel();
  return true;
}

function lockSpectatorGuess() {
  if (!isSpectatorGuessActive()) return false;
  const g = ensureSpectatorGuessState();
  if (g.locked) return false;

  const mode = getSpectatorGuessMode();
  const wolfNeed = (state.match && state.match.seats)
    ? Math.max(2, state.match.seats.filter(function (s) { return s.role === "wolf"; }).length)
    : (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2);
  if (mode === "wolf_hunt") {
    if (g.wolfIds.length < wolfNeed) {
      showToast("請先選出 " + wolfNeed + " 名你懷疑的酸民狼再鎖定押注！", "warn");
      return false;
    }
  } else {
    const keys = getActiveGodRoleKeys();
    const missing = keys.some(function (k) { return !g.godRoles[k]; });
    if (missing) {
      showToast("請先將所有神職席位都指定完成再鎖定押注！", "warn");
      return false;
    }
  }

  g.locked = true;
  g.lockedAtDay = (state.match && state.match.day) || 1;
  if (typeof sound !== "undefined" && typeof sound.playBlessing === "function") sound.playBlessing();
  if (typeof spawnBurst === "function") spawnBurst(getPlayerId(), ["#fbbf24", "#34d399", "#ffffff"], 20, "star");
  if (typeof spawnFx === "function") spawnFx(getPlayerId(), "🔒 押注已鎖定!", "#fbbf24");
  if (typeof addLog === "function") {
    addLog({
      kind: "blessing",
      title: mode === "wolf_hunt" ? "🔒 席外猜狼押注已鎖定（終局全中另享 +8 勇氣加分）" : "🔒 席外獵神押注已鎖定（終局揭曉享 +8 勇氣加分）",
      text: ""
    });
  }
  showToast("🔒 席外推理已鎖定！終局揭曉命中即享 +8 勇氣加分！", "emerald");
  renderSpectatorGuessPanel();
  return true;
}

function evaluateSpectatorGuess() {
  const m = state.match;
  if (!m || !m.seats || !m.seats.length) return null;
  const g = ensureSpectatorGuessState();
  const mode = getSpectatorGuessMode();
  const player = getPlayerSeat();
  if (g.godViewUnlocked) {
    g.evaluated = { mode: mode, hasGuess: false, godViewUnlocked: true, hits: 0, total: 0, perfect: false, lockedEarly: false, bonusPts: 0, title: "👁 已切換上帝視角觀戰（無押注加分）", details: [], summaryLine: "" };
    return g.evaluated;
  }
  if (player && player.alive && !g.wolfIds.length && !g.godRoles.seer && !g.godRoles.witch && !g.godRoles.hunter && !g.godRoles.guard) {
    g.evaluated = { mode: mode, hasGuess: false, hits: 0, total: 0, perfect: false, lockedEarly: false, bonusPts: 0, title: "", details: [], summaryLine: "" };
    return g.evaluated;
  }

  if (mode === "wolf_hunt") {
    const actualWolves = m.seats.filter(function (s) { return s.role === "wolf"; });
    const actualIds = actualWolves.map(function (s) { return s.id; });
    const total = actualWolves.length;
    const picks = (g.wolfIds || []).slice();
    const hasGuess = picks.length > 0;
    let hits = 0;
    const details = picks.map(function (pid) {
      const s = getSeat(pid);
      const hit = actualIds.indexOf(pid) !== -1;
      if (hit) hits += 1;
      const actualRoleName = (s && ROLE_DEFS[s.role]) ? ROLE_DEFS[s.role].name : "好人";
      return {
        label: "猜酸民狼",
        seatId: pid,
        seatLabel: formatSpectatorSeatLabel(s),
        hit: hit,
        statusText: hit ? "✓ 命中酸民狼" : ("✗ 實為" + actualRoleName)
      };
    });
    const perfect = hasGuess && total > 0 && hits === total;
    const lockedEarly = Boolean(g.locked && hasGuess);
    const bonusPts = hasGuess ? ((perfect ? 30 : hits * 12) + (lockedEarly && hits > 0 ? 8 : 0)) : 0;
    const title = perfect
      ? (total === 2 ? "🏆 席外神探・全中雙狼" : ("🏆 席外神探・全中 " + total + " 狼"))
      : (hits > 0 ? ("🔎 席外觀察家・命中 " + hits + "/" + total + " 狼") : "🍵 席外品茗客・差一點就猜中");
    const wolfSummary = actualWolves.map(formatSpectatorSeatLabel).join("、");
    const res = {
      mode: "wolf_hunt",
      hasGuess: hasGuess,
      hits: hits,
      total: total,
      perfect: perfect,
      lockedEarly: lockedEarly,
      bonusPts: bonusPts,
      title: title,
      details: details,
      summaryLine: "實際酸民狼：" + wolfSummary
    };
    g.evaluated = res;
    return res;
  }

  // god_hunt (Eliminated Wolf hunts remaining Good God-Roles!)
  const keys = getActiveGodRoleKeys();
  const total = keys.length;
  let hits = 0;
  let assignedCount = 0;
  const details = [];
  keys.forEach(function (rk) {
    const pickedId = g.godRoles ? g.godRoles[rk] : null;
    const actualSeat = m.seats.find(function (s) { return s.role === rk; }) || null;
    const rName = ROLE_DEFS[rk] ? ROLE_DEFS[rk].name : rk;
    if (pickedId) assignedCount += 1;
    const hit = Boolean(pickedId && actualSeat && pickedId === actualSeat.id);
    if (hit) hits += 1;
    const pickedSeat = pickedId ? getSeat(pickedId) : null;
    details.push({
      label: rName,
      roleKey: rk,
      seatId: pickedId || null,
      seatLabel: pickedSeat ? formatSpectatorSeatLabel(pickedSeat) : "未指派",
      hit: hit,
      statusText: !pickedId
        ? ("未猜（實為 " + formatSpectatorSeatLabel(actualSeat) + "）")
        : (hit ? "✓ 神職命中" : ("✗ 實為 " + formatSpectatorSeatLabel(actualSeat)))
    });
  });

  const hasGuess = assignedCount > 0;
  const perfect = hasGuess && total > 0 && hits === total;
  const lockedEarly = Boolean(g.locked && hasGuess);
  const bonusPts = hasGuess ? ((perfect ? 32 : hits * 12) + (lockedEarly && hits > 0 ? 8 : 0)) : 0;
  const title = perfect
    ? "🎯 暗影洞悉者・神職全中"
    : (hits > 0 ? ("🕵️ 席外獵神手・命中 " + hits + "/" + total + " 神職") : "🌙 迷霧旁觀者・好人藏太深");
  const res = {
    mode: "god_hunt",
    hasGuess: hasGuess,
    hits: hits,
    total: total,
    perfect: perfect,
    lockedEarly: lockedEarly,
    bonusPts: bonusPts,
    title: title,
    details: details,
    summaryLine: ""
  };
  g.evaluated = res;
  return res;
}

function isSpectatorFastForward() {
  return Boolean(state.spectatorFastForward && isSpectatorGuessActive());
}

function toggleSpectatorFastForward() {
  if (!isSpectatorGuessActive()) {
    state.spectatorFastForward = false;
    return false;
  }
  state.spectatorFastForward = !state.spectatorFastForward;
  if (state.spectatorFastForward) {
    if (typeof state._preSpectatorAutoPlay !== "boolean") {
      state._preSpectatorAutoPlay = Boolean(state.autoPlay);
    }
    state.autoPlay = true;
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    showToast("⚡ 已開啟 2× 觀戰快進，自動加速推進至結局！", "emerald");
    if (state.match && state.match.phase === "DAY_SPEECH") {
      if (state.typewriter && state.typewriter.active && typeof completeCurrentTypewriter === "function") {
        completeCurrentTypewriter(true);
      } else if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") {
        maybeScheduleAutoAdvanceAfterSpeech();
      }
    } else if (state.match && state.match.phase === "DAY_VOTE_RESULT" && state.voteResultPayload && typeof state.voteResultPayload.onContinue === "function") {
      const go = state.voteResultPayload.onContinue;
      state.voteResultPayload = null;
      go();
      return true;
    }
  } else {
    if (typeof state._preSpectatorAutoPlay === "boolean") {
      state.autoPlay = state._preSpectatorAutoPlay;
      state._preSpectatorAutoPlay = null;
    }
    showToast("已關閉 2× 觀戰快進，恢復正常語速。", "gold");
  }
  updateAllUI();
  return state.spectatorFastForward;
}

function renderSpectatorGuessPanel() {
  const host = el("spectatorGuessBar");
  if (!host) return;
  if (!isSpectatorGuessActive()) {
    host.classList.add("hidden");
    return;
  }

  host.classList.remove("hidden");
  host.innerHTML = "";
  const g = ensureSpectatorGuessState();
  const mode = getSpectatorGuessMode();
  const pid = getPlayerId();
  const seats = (state.match && state.match.seats) || [];

  // 1. Header Row: Mode Title + Progress + 2× Fast-Forward + Lock Button
  const head = document.createElement("div");
  head.className = "flex items-center justify-between gap-2";

  const titleWrap = document.createElement("div");
  titleWrap.className = "flex items-center gap-1.5 min-w-0";
  const badge = document.createElement("span");
  badge.className = "text-[11px] font-bold tracking-wider truncate " + (mode === "god_hunt" ? "text-amber-300" : "text-emerald-300");
  const wNeed = (state.match && state.match.seats)
    ? Math.max(2, state.match.seats.filter(function (s) { return s.role === "wolf"; }).length)
    : (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2);
  badge.textContent = mode === "god_hunt" ? "🎯 席外獵神挑戰・揪出真神職" : ("🔍 席外猜狼挑戰・鎖定 " + wNeed + " 名酸民狼");
  const progress = document.createElement("span");
  progress.className = "text-[10px] text-slate-400 shrink-0";
  if (mode === "wolf_hunt") {
    progress.textContent = "已選 " + g.wolfIds.length + "/" + wNeed;
  } else {
    const keys = getActiveGodRoleKeys();
    const filled = keys.filter(function (k) { return Boolean(g.godRoles[k]); }).length;
    progress.textContent = "已猜 " + filled + "/" + keys.length;
  }
  titleWrap.appendChild(badge);
  titleWrap.appendChild(progress);
  head.appendChild(titleWrap);

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "flex items-center gap-1.5 shrink-0";

  const ffActive = isSpectatorFastForward();
  const ffBtn = document.createElement("button");
  ffBtn.type = "button";
  ffBtn.setAttribute("data-spec-ff", "1");
  ffBtn.className = (ffActive ? "cta-celadon" : "cta-ink") + " text-[10px] px-2 py-0.5 shrink-0";
  ffBtn.textContent = ffActive ? "⚡ 2×快進:開" : "⚡ 2×快進";
  ffBtn.title = "觀戰時加速推進 AI 發言與開票節奏";
  ffBtn.addEventListener("click", function () { toggleSpectatorFastForward(); });
  actionsWrap.appendChild(ffBtn);

  const gvBtn = document.createElement("button");
  gvBtn.id = "btnEnableSpectatorGodView";
  gvBtn.type = "button";
  gvBtn.className = (g.godViewUnlocked ? "cta-celadon" : "cta-ink") + " text-[10px] px-2 py-0.5 shrink-0";
  gvBtn.textContent = g.godViewUnlocked ? "👁 上帝視角:開" : "👁 開上帝視角";
  gvBtn.title = "放棄押注加分，直接觀看全員底牌與即時 AI 懷疑熱度";
  gvBtn.addEventListener("click", function () { enableSpectatorGodView(); });
  actionsWrap.appendChild(gvBtn);

  if (g.godViewUnlocked) {
    const gvPill = document.createElement("span");
    gvPill.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-400/45 shrink-0";
    gvPill.textContent = "已棄押注透視中";
    actionsWrap.appendChild(gvPill);
  } else if (g.locked) {
    const lockedPill = document.createElement("span");
    lockedPill.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shrink-0";
    lockedPill.textContent = "✓ 第" + (g.lockedAtDay || 1) + "輪已鎖定 (+8分)";
    actionsWrap.appendChild(lockedPill);
  } else {
    const lockBtn = document.createElement("button");
    lockBtn.id = "btnLockSpectatorGuess";
    lockBtn.type = "button";
    lockBtn.className = "cta-brass text-[10px] px-2.5 py-0.5 shrink-0";
    lockBtn.textContent = "🔒 鎖定押注 (+8分)";
    lockBtn.addEventListener("click", function () { lockSpectatorGuess(); });
    actionsWrap.appendChild(lockBtn);
  }
  head.appendChild(actionsWrap);
  host.appendChild(head);

  if (g.godViewUnlocked) {
    const godRow = document.createElement("div");
    godRow.className = "flex items-center gap-1 flex-wrap";
    seats.forEach(function (st) {
      if (st.id === pid) return;
      const rName = ROLE_DEFS[st.role] ? ROLE_DEFS[st.role].name : st.role;
      const pill = document.createElement("span");
      const topTarget = Object.keys(st.suspicionMap || {}).filter(function (k) {
        const ts = getSeat(parseInt(k, 10));
        return ts && ts.alive && ts.id !== st.id;
      }).sort(function (a, b) { return (st.suspicionMap[b] || 0) - (st.suspicionMap[a] || 0); })[0];
      pill.className = "text-[10px] px-2 py-0.5 rounded border font-bold " +
        (st.role === "wolf" ? "bg-rose-500/20 border-rose-400/50 text-rose-100" : "bg-emerald-500/15 border-emerald-400/40 text-emerald-100") +
        (st.alive ? "" : " opacity-55");
      pill.textContent = fmtSeatNum(st.id) + st.name + "〔" + rName + "〕" + (st.alive && topTarget ? ("→疑" + fmtSeatNum(topTarget)) : (!st.alive ? "(離)" : ""));
      godRow.appendChild(pill);
    });
    host.appendChild(godRow);
    return;
  }

  // 2. Role Slots (Only in god_hunt mode)
  const roleShortLabels = { seer: "🔮 觀察員", witch: "🍵 奉茶師", hunter: "⚖️ 糾察長", guard: "🛡️ 守衛" };
  if (mode === "god_hunt") {
    const keys = getActiveGodRoleKeys();
    if (keys.indexOf(g.activeRoleSlot) === -1) g.activeRoleSlot = keys[0];
    const slotRow = document.createElement("div");
    slotRow.className = "flex items-center gap-1.5 flex-wrap";
    keys.forEach(function (rk) {
      const assignedId = g.godRoles[rk];
      const assignedSeat = assignedId ? getSeat(assignedId) : null;
      const isCur = g.activeRoleSlot === rk && !g.locked;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spec-role-slot" + (isCur ? " is-active-slot" : "") + (assignedId ? " is-filled" : "");
      btn.textContent = roleShortLabels[rk] + (assignedSeat ? (" → " + fmtSeatNum(assignedSeat.id) + assignedSeat.name) : " → 未選");
      btn.disabled = g.locked;
      btn.addEventListener("click", function () { selectSpectatorGodSlot(rk); });
      slotRow.appendChild(btn);
    });
    host.appendChild(slotRow);
  }

  // 3. Candidate Seat Chips
  const chipRow = document.createElement("div");
  chipRow.className = "flex items-center gap-1 flex-wrap";
  const selfSeat = getPlayerSeat();
  const checkedMap = {};
  if (selfSeat && selfSeat.role === "seer" && Array.isArray(selfSeat.checkedHistory)) {
    selfSeat.checkedHistory.forEach(function (chk) {
      checkedMap[chk.targetId] = chk.isWolf ? "查狼" : "查好";
    });
  }

  const candidates = seats.filter(function (s) {
    if (s.id === pid) return false;
    if (mode === "god_hunt" && s.role === "wolf") return false;
    return true;
  });

  candidates.forEach(function (s) {
    const chip = document.createElement("button");
    chip.type = "button";
    let cls = "spec-seat-chip";
    let suffix = "";
    if (mode === "wolf_hunt") {
      if (g.wolfIds.indexOf(s.id) !== -1) {
        cls += " is-picked-wolf";
        suffix = " [疑狼]";
      } else if (checkedMap[s.id]) {
        suffix = " (" + checkedMap[s.id] + ")";
      }
    } else {
      const matchedKey = getActiveGodRoleKeys().find(function (k) { return g.godRoles[k] === s.id; });
      if (matchedKey) {
        cls += " is-picked-god";
        const tagShort = matchedKey === "seer" ? "觀察" : (matchedKey === "witch" ? "奉茶" : (matchedKey === "guard" ? "守衛" : "糾察"));
        suffix = " [" + tagShort + "]";
      }
    }
    if (!s.alive) suffix += " (離)";
    if (g.locked) cls += " is-locked";
    chip.className = cls;
    chip.disabled = g.locked;
    chip.textContent = fmtSeatNum(s.id) + " " + s.name + suffix;
    chip.addEventListener("click", function () {
      if (mode === "wolf_hunt") toggleSpectatorWolfGuess(s.id);
      else assignSpectatorGodGuess(s.id);
    });
    chipRow.appendChild(chip);
  });

  host.appendChild(chipRow);
}

function renderGameOverGuessSummary() {
  const box = el("gameOverGuessBox");
  if (!box) return;
  const g = state.match && state.match.spectatorGuess;
  const ev = (g && g.evaluated) ? g.evaluated : evaluateSpectatorGuess();
  if (!ev || (!ev.hasGuess && !ev.godViewUnlocked)) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = "";

  if (ev.godViewUnlocked) {
    const headerGv = document.createElement("div");
    headerGv.className = "flex items-center justify-between gap-2";
    const tGv = document.createElement("span");
    tGv.className = "font-serif-craft text-xs font-bold text-sky-300";
    tGv.textContent = "👁 本局已切換上帝視角觀戰（放棄席外押注加分）";
    const sGv = document.createElement("span");
    sGv.className = "text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300";
    sGv.textContent = "評級 +0 分";
    headerGv.appendChild(tGv);
    headerGv.appendChild(sGv);
    box.appendChild(headerGv);
    return;
  }

  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-2";

  const titleEl = document.createElement("span");
  titleEl.className = "font-serif-craft text-xs font-bold " + (ev.perfect ? "text-amber-300" : (ev.hits > 0 ? "text-emerald-300" : "text-slate-300"));
  titleEl.textContent = ev.title;

  const scoreBadge = document.createElement("span");
  scoreBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded " + (ev.bonusPts > 0 ? "bg-amber-500/20 text-amber-200 border border-amber-400/40" : "bg-slate-800 text-slate-400");
  scoreBadge.textContent = "評級 +" + ev.bonusPts + " 分" + (ev.lockedEarly ? " (含早期鎖定)" : "");

  header.appendChild(titleEl);
  header.appendChild(scoreBadge);
  box.appendChild(header);

  const list = document.createElement("div");
  list.className = "grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-left";
  ev.details.forEach(function (d) {
    const item = document.createElement("div");
    item.className = "rounded px-2 py-1 text-[11px] border flex items-center justify-between gap-1.5 " + (
      d.hit
        ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100"
        : "bg-slate-950/85 border-slate-800 text-slate-300"
    );
    const left = document.createElement("span");
    left.className = "truncate font-bold";
    left.textContent = (d.label ? (d.label + "：") : "") + d.seatLabel;
    const right = document.createElement("span");
    right.className = "text-[10px] shrink-0 " + (d.hit ? "text-emerald-300 font-bold" : "text-rose-200");
    right.textContent = d.statusText;
    item.appendChild(left);
    item.appendChild(right);
    list.appendChild(item);
  });
  box.appendChild(list);

  if (ev.summaryLine && !ev.perfect) {
    const foot = document.createElement("div");
    foot.className = "text-[10.5px] text-amber-200 text-left";
    foot.textContent = ev.summaryLine;
    box.appendChild(foot);
  }
}
