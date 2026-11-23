/**
 * 視覺特效：彈簧物理、粒子爆裂、光束、連擊系統、釘選線索、氣泡、主題切換與吐司通知
 */
"use strict";

function spawnFx(seatId, text, color, opts) {
  const node = state.seatCoords.find(function (c) { return c.id === seatId; });
  const mul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
  const baseDur = (opts && opts.durationMs) ? Math.max(opts.durationMs, 1750) : 1950;
  const cleanText = typeof shStripCanvasEmoji === "function" ? shStripCanvasEmoji(text) : String(text || "");
  state.fxPopups.push({
    x: node ? node.x : 220,
    y: node ? (node.y - 24) : 140,
    text: cleanText,
    color: color || "#fde68a",
    born: performance.now(),
    duration: Math.round(baseDur * mul),
    scale: (opts && opts.scale) || 1
  });
}

function ensureSeatPhys(seatId) {
  if (!state.seatPhysics[seatId]) {
    state.seatPhysics[seatId] = { scale: 1, vScale: 0, ox: 0, oy: 0, vx: 0, vy: 0, tilt: 0, vTilt: 0 };
  }
  return state.seatPhysics[seatId];
}

// Trigger juicy elastic spring-physics impulse on a character seat!
function nudgeSeat(seatId, opts) {
  if (!seatId) return;
  const p = ensureSeatPhys(seatId);
  const o = opts || {};
  if (typeof o.scale === "number") p.scale = o.scale;
  if (typeof o.vScale === "number") p.vScale += o.vScale;
  if (typeof o.vx === "number") p.vx += o.vx;
  if (typeof o.vy === "number") p.vy += o.vy;
  if (typeof o.vTilt === "number") p.vTilt += o.vTilt;
}

// Trigger transient facial emotion on outer ring & spotlight portraits!
function setSeatEmotion(seatId, mood, durationMs) {
  if (!seatId || !mood) return;
  state.seatMoods[seatId] = { mood: mood, until: performance.now() + (durationMs || 3000) };
}

function getSeatEmotion(seatId, nowMs) {
  const rec = state.seatMoods[seatId];
  if (!rec) return "neutral";
  if ((nowMs || performance.now()) > rec.until) {
    delete state.seatMoods[seatId];
    return "neutral";
  }
  return rec.mood;
}

function spawnRipple(x, y, color, maxR) {
  const mul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
  state.ripples.push({
    x: x,
    y: y,
    color: color || "#fbbf24",
    maxR: maxR || 58,
    born: performance.now(),
    ttl: Math.round(840 * mul)
  });
  if (state.ripples.length > 16) state.ripples.shift();
}

// Physics-driven confetti / petal / spark burst at any seat!
function spawnBurst(seatId, color, count, style) {
  const node = state.seatCoords.find(function (c) { return c.id === seatId; });
  if (!node) return;
  const n = count || 18;
  const mul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
  const palette = Array.isArray(color) ? color : [color || "#fbbf24", "#fde68a", "#ffffff"];
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.45;
    const spd = (style === "spark" ? 2.8 : 1.65) + Math.random() * (style === "spark" ? 3.8 : 2.7);
    state.burstParticles.push({
      x: node.x,
      y: node.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - (style === "petal" ? 1.3 : 0.55),
      size: (style === "petal" ? 4.4 : 3.0) + Math.random() * 2.8,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      color: palette[i % palette.length],
      style: style || "star",
      born: now,
      ttl: Math.round((1080 + Math.random() * 540) * mul)
    });
  }
  if (state.burstParticles.length > 140) {
    state.burstParticles.splice(0, state.burstParticles.length - 140);
  }
}

// Non-blocking anime-style slanted Cut-In banner with FIFO queue so sequential hype banners never clobber!
function showCutInNow(item) {
  const box = el("dramaticCutIn");
  if (!box) return;
  if (state.cutInTimer) {
    clearTimeout(state.cutInTimer);
    state.cutInTimer = null;
  }
  const t = item.title || "";
  const s = item.sub || "";
  const mul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
  const isMajor = Boolean(
    (item.durationMs && item.durationMs >= 2000) ||
    /勝利|正氣共鳴|反撲|對跳|豁免|警長|覺醒/.test(t)
  );
  if (el("cutInTitle")) el("cutInTitle").textContent = t;
  if (el("cutInSub")) el("cutInSub").textContent = s;
  box.className = "cutin-" + (item.theme || "gold") + (isMajor ? " cutin-hold" : "");
  void box.offsetWidth;
  box.classList.add("is-active");
  state.cutInActive = true;
  state.cutInCurrentKey = t + "|" + s;
  const durMs = Math.round((isMajor ? Math.max(item.durationMs || 2850, 2850) : Math.max(item.durationMs || 2150, 2100)) * mul);
  state.cutInTimer = setTimeout(advanceCutInQueue, durMs);
}

function advanceCutInQueue() {
  if (state.cutInTimer) {
    clearTimeout(state.cutInTimer);
    state.cutInTimer = null;
  }
  if (Array.isArray(state.cutInQueue) && state.cutInQueue.length > 0) {
    const next = state.cutInQueue.shift();
    showCutInNow(next);
    return;
  }
  state.cutInActive = false;
  state.cutInCurrentKey = "";
  const box = el("dramaticCutIn");
  if (box) box.classList.remove("is-active");
}

function clearCutInQueue() {
  if (state.cutInTimer) {
    clearTimeout(state.cutInTimer);
    state.cutInTimer = null;
  }
  state.cutInQueue = [];
  state.cutInActive = false;
  state.cutInCurrentKey = "";
  const box = el("dramaticCutIn");
  if (box) box.classList.remove("is-active");
}

function triggerCutIn(title, sub, theme, durationMs) {
  const box = el("dramaticCutIn");
  if (!box) return;
  const item = { title: title || "", sub: sub || "", theme: theme || "gold", durationMs: durationMs || 0 };
  const key = item.title + "|" + item.sub;
  if (!Array.isArray(state.cutInQueue)) state.cutInQueue = [];

  if (item.title.indexOf("勝利") !== -1 || item.title.indexOf("正氣共鳴") !== -1) {
    clearCutInQueue();
    showCutInNow(item);
    return;
  }
  if (!state.cutInActive) {
    showCutInNow(item);
    return;
  }
  if (key === state.cutInCurrentKey) return;
  const lastQueued = state.cutInQueue[state.cutInQueue.length - 1];
  if (lastQueued && (lastQueued.title + "|" + lastQueued.sub) === key) return;
  if (state.cutInQueue.length >= 4) {
    state.cutInQueue[state.cutInQueue.length - 1] = item;
  } else {
    state.cutInQueue.push(item);
  }
}

function spawnBeam(fromId, toId, color, kind, durationMs) {
  const fromNode = state.seatCoords.find(function (c) { return c.id === fromId; });
  const toNode = state.seatCoords.find(function (c) { return c.id === toId; });
  if ((!fromNode || !toNode) && (!getSeat(fromId) || !getSeat(toId))) return;
  const dur = durationMs || (kind === "vote" ? 520 : 620);
  state.beamFx.push({
    fromId: fromId,
    toId: toId,
    x1: fromNode ? fromNode.x : null,
    y1: fromNode ? fromNode.y : null,
    x2: toNode ? toNode.x : null,
    y2: toNode ? toNode.y : null,
    color: color || "#fbbf24",
    kind: kind || "emote",
    born: performance.now(),
    duration: dur,
    impacted: false
  });
  // Launching recoil on sender seat!
  if (fromNode && toNode) {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    nudgeSeat(fromId, { scale: 1.12, vx: (dx / dist) * 4.5, vy: (dy / dist) * 4.5 });
  } else {
    nudgeSeat(fromId, { scale: 1.12 });
  }
}

function setSeatBubble(seatId, text, mood, ttlMs) {
  if (!seatId || !text) return;
  const clean = String(text).replace(/^「|」$/g, "").trim();
  const shortTxt = clean.length > 26 ? (clean.slice(0, 25) + "…") : clean;
  state.seatBubbles[seatId] = {
    seatId: seatId,
    text: shortTxt,
    mood: mood || "normal",
    born: performance.now(),
    ttl: ttlMs || 4200
  };
}

function bumpCombo(reasonText) {
  if (!state.match.started) return;
  state.match.combo = (state.match.combo || 0) + 1;
  if (state.match.combo > (state.match.maxCombo || 0)) {
    state.match.maxCombo = state.match.combo;
  }
  const c = state.match.combo;
  sound.tone(520 + Math.min(c, 8) * 55, 0.11, "triangle", 0.05, 0);
  if (c >= 3 && !state.match.comboBoostReady) {
    state.match.comboBoostReady = true;
    state.match.harmonyScore = clamp(state.match.harmonyScore + 3, 0, 100);
    spawnFx(getPlayerId(), "🔥 " + c + "連擊・發言強化!", "#fbbf24");
    spawnBurst(getPlayerId(), ["#fbbf24", "#fde68a", "#34d399"], 24, "star");
    setSeatEmotion(getPlayerId(), "proud", 3200);
    triggerCutIn("🔥 推理連擊 ×" + c + "！", "全場聚焦・下一次發言說服力強化！", "gold");
    showToast("🔥 達成 " + c + " 連擊偵探專注！下一次發言說服力額外提升！", "emerald");
  }
  renderComboBadge();
}

function renderComboBadge() {
  const b = el("comboBadge");
  if (!b) return;
  const c = (state.match && state.match.combo) || 0;
  if (!state.match.started || c < 2) {
    b.classList.add("hidden");
    return;
  }
  b.classList.remove("hidden");
  b.textContent = state.match.comboBoostReady ? ("🔥 連擊 x" + c + " (說服UP)") : ("⚡ 連擊 x" + c);
  b.classList.remove("combo-pop");
  void b.offsetWidth;
  b.classList.add("combo-pop");
}

function pinClue(seatId, tag, summary, kind) {
  if (!state.match.started) return;
  if (!state.match.pinnedClues) state.match.pinnedClues = [];
  const dup = state.match.pinnedClues.find(function (c) { return c.seatId === seatId && c.tag === tag; });
  if (dup) return;
  state.match.pinnedClues.unshift({
    id: Date.now() + Math.floor(Math.random() * 999),
    seatId: seatId,
    tag: tag,
    summary: summary,
    kind: kind || "note"
  });
  if (state.match.pinnedClues.length > 4) state.match.pinnedClues.length = 4;
  renderPinnedCluesTray();
}

function renderPinnedCluesTray() {
  const tray = el("pinnedCluesTray");
  if (!tray) return;
  const list = (state.match && state.match.pinnedClues) || [];
  if (list.length === 0) {
    tray.classList.add("hidden");
    tray.innerHTML = "";
    return;
  }
  tray.classList.remove("hidden");
  tray.innerHTML = '<span class="text-[10px] font-black text-amber-300 shrink-0">📌 蒐證：</span>';
  list.forEach(function (clue) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "pinned-clue-chip text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 transition flex items-center gap-1";
    chip.innerHTML = '<span>' + escapeHtml(clue.tag) + '</span><span class="opacity-65">→填入</span>';
    chip.title = "點擊將這條線索直接填入下方發言欄";
    chip.addEventListener("click", function () {
      const qIn = el("quickFreeInput");
      if (qIn) {
        qIn.value = clue.summary;
        qIn.focus();
        refreshQuickFreeInputHint();
      }
      if (el("playerSpeechInput")) {
        el("playerSpeechInput").value = clue.summary;
        refreshLiveNlpUI();
      }
      if (clue.seatId && clue.seatId !== getPlayerId()) {
        state.selectedSeatId = clue.seatId;
        updateAllUI();
      }
      sound.tone(620, 0.08, "triangle", 0.045, 0);
      showToast("已將蒐證內容填入發言框，可修改或直接按發言！", "emerald");
    });
    tray.appendChild(chip);
  });
}

function triggerScreenFlash(color, durationMs, intensity) {
  if (typeof state === "undefined") return;
  state.screenFlash = {
    color: color || "#fbbf24",
    born: performance.now(),
    duration: durationMs || 420,
    intensity: intensity !== undefined ? intensity : 0.36
  };
}

// Turn-respecting silent micro-reactions (expressions, spring nudges, particles & ultra-short silent bubbles only!)
function triggerAiCrowdReactions(mode, focusSeatId) {
  if (typeof state === "undefined" || !state.match || !state.match.started) return;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const pickShort = function (seat, key, fallback) {
    if (typeof pickPersonaVoice === "function") {
      const s = pickPersonaVoice(seat, key, seat.id);
      if (s) return s;
    }
    return fallback;
  };
  const aliveAis = getAliveSeats().filter(function (s) { return s.id !== pid; });
  if (!aliveAis.length) return;

  if (mode === "crit" || mode === "cheer") {
    // Zero-Leak Audience Reaction: NEVER filter by hidden s.team === "good" (would leak hidden team to players!)
    const friendlyPool = aliveAis.filter(function (s) {
      return s.id !== focusSeatId && s.publicVoteIntent !== pid && (!s.suspicionMap || (s.suspicionMap[pid] || 50) <= 58);
    });
    const allies = (friendlyPool.length > 0 ? friendlyPool : aliveAis.filter(function (s) { return s.id !== focusSeatId; }))
      .slice(0, mode === "crit" ? 2 : 1);
    allies.forEach(function (ai) {
      setSeatEmotion(ai.id, "happy", 2400);
      nudgeSeat(ai.id, { scale: 1.07, vy: -4 });
      spawnBurst(ai.id, ["#34d399", "#fde68a", "#ffffff"], mode === "crit" ? 10 : 6, "petal");
      if (mode === "crit") {
        setSeatBubble(ai.id, pickShort(ai, "reactNod", "這段邏輯很順！"), "trust", 1900);
      }
    });
    if (mode === "crit" && focusSeatId && focusSeatId !== pid) {
      const tgt = getSeat(focusSeatId);
      if (tgt && tgt.alive) {
        setSeatEmotion(tgt.id, "shock", 2800);
        nudgeSeat(tgt.id, { scale: 0.9, vTilt: 0.22 });
      }
    }
  } else if (mode === "doubt") {
    const doubters = aliveAis.slice(0, 2);
    doubters.forEach(function (ai) {
      setSeatEmotion(ai.id, "nervous", 2400);
      nudgeSeat(ai.id, { scale: 0.94, vTilt: -0.16 });
      setSeatBubble(ai.id, pickShort(ai, "reactDoubt", "這語氣怪怪的…"), "suspect", 1900);
    });
  }
}

function triggerSpeechAudienceReactions(speaker, generated) {
  if (!speaker || !generated || typeof state === "undefined" || !state.match || !state.match.started) return;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const pickShort = function (seat, key, fallback) {
    if (typeof pickPersonaVoice === "function") {
      const s = pickPersonaVoice(seat, key, speaker.id);
      if (s) return s;
    }
    return fallback;
  };

  const pitTargets = [];
  if (generated.accuseId && generated.accuseId !== pid && generated.accuseId !== speaker.id) {
    pitTargets.push(generated.accuseId);
  }
  (Array.isArray(generated.wolfPits) ? generated.wolfPits : []).forEach(function (id) {
    if (id && id !== pid && id !== speaker.id && pitTargets.indexOf(id) === -1) pitTargets.push(id);
  });
  pitTargets.slice(0, 2).forEach(function (tid, idx) {
    const tSeat = getSeat(tid);
    if (!tSeat || !tSeat.alive) return;
    setSeatEmotion(tid, idx === 0 ? "shock" : "nervous", 2600);
    nudgeSeat(tid, { scale: 0.91, vy: 4, vTilt: 0.2 });
    if (idx === 0) {
      setSeatBubble(tid, pickShort(tSeat, "reactGasp", "這跟我無關吧！"), "suspect", 1900);
      if (typeof voice !== "undefined" && typeof voice.triggerSeatBackchannel === "function") {
        voice.triggerSeatBackchannel(tid, "accuse", 740);
      }
    }
  });

  if (generated.vouchId && generated.vouchId !== pid && generated.vouchId !== speaker.id) {
    const vSeat = getSeat(generated.vouchId);
    if (vSeat && vSeat.alive) {
      setSeatEmotion(vSeat.id, "happy", 2400);
      nudgeSeat(vSeat.id, { scale: 1.07, vy: -3.5 });
      spawnBurst(vSeat.id, ["#34d399", "#fde68a"], 8, "petal");
      setSeatBubble(vSeat.id, pickShort(vSeat, "reactVouch", "謝謝信任！"), "trust", 1800);
      if (pitTargets.length === 0 && typeof voice !== "undefined" && typeof voice.triggerSeatBackchannel === "function") {
        voice.triggerSeatBackchannel(vSeat.id, "vouch", 780);
      }
    }
  }
}

function triggerDawnCasualtyPresentation(casualties) {
  if (!Array.isArray(casualties) || casualties.length === 0) {
    if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") {
      stage3d.triggerHeroBeat("purify_cast", 2200);
    }
    return;
  }
  const first = casualties[0];
  const isPurifyFirst = first && first.cause === "purify";
  const isClashFirst = first && first.cause === "double_clash";
  if (typeof triggerScreenFlash === "function") {
    triggerScreenFlash(isClashFirst ? "#f59e0b" : (isPurifyFirst ? "#a78bfa" : "#f43f5e"), 420, 0.30);
  }
  if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
    if (first && typeof stage3d.triggerCameraPunch === "function") {
      stage3d.triggerCameraPunch(first.id, { fov: 40.5, durationMs: 1450 });
    }
    if (typeof stage3d.triggerHeroBeat === "function") {
      stage3d.triggerHeroBeat("gasp_react", 2400);
    }
  }
  casualties.forEach(function (c) {
    if (!c || !c.id) return;
    const isPur = c.cause === "purify";
    const isDc = c.cause === "double_clash";
    setSeatEmotion(c.id, "sorrow", 3600);
    spawnBurst(c.id, isPur ? ["#a78bfa", "#e2e8f0", "#ffffff"] : (isDc ? ["#f59e0b", "#fb7185", "#ffffff"] : ["#94a3b8", "#f43f5e", "#ffffff"]), 20, "ring");
    spawnFx(c.id, isDc ? "印・同守破盾!" : (isPur ? "印・清心請離" : "印・夜間暫離"), isDc ? "#f59e0b" : (isPur ? "#a78bfa" : "#e11d48"), { scale: 1.24, durationMs: 2100 });
    if (typeof stage3d !== "undefined" && typeof stage3d.extinguishSeatCandleFx === "function") {
      stage3d.extinguishSeatCandleFx(c.id);
    }
  });
}

// Pre-game Lobby greeting only (strictly silent during in-game turn-based speeches!)
function pokeSeatWithReaction(seatId) {
  sound.unlock();
  const pid = getPlayerId();
  if (!seatId || seatId === pid || state.match.started) return;
  spawnBeam(pid, seatId, "#38bdf8", "emote");
  sound.tone(600 + seatId * 28, 0.1, "triangle", 0.05, 0);

  const pInfo = AI_PERSONAS[seatId - 2];
  const line = (pInfo && typeof getPersonaLobbyGreeting === "function")
    ? getPersonaLobbyGreeting(pInfo.name, seatId)
    : "嗨！選好角色就按「開始對局」，我在圓桌等你一起抓酸民狼！";
  setSeatBubble(seatId, line, "trust", 4200);
  setSeatEmotion(seatId, "happy", 3200);
  spawnBurst(seatId, ["#fbbf24", "#34d399", "#fde68a"], 14, "petal");
  spawnFx(seatId, "嗨！(揮手)", "#fde68a");
  if (pInfo) showToast(fmtSeatNum(seatId) + "號 " + pInfo.name + " 回應了你！", "emerald");
}

function triggerShake(ms) {
  state.shakeUntil = performance.now() + (ms || 280);
}

function playSkyCurtain(mode, icon, title, sub) {
  const c = el("dayNightCurtain");
  if (!c) return;
  el("curtainIcon").textContent = "";
  el("curtainTitle").textContent = title;
  el("curtainSub").textContent = sub || "";
  c.className = "mode-" + mode;
  void c.offsetWidth;
  c.classList.add("active");
}

function syncWorldTheme() {
  sound.syncWithPhase();
  const p = state.match.phase;
  const b = document.body;
  b.classList.remove("theme-twilight", "theme-night", "theme-day");
  if (!state.match.started || p === "LOBBY") {
    b.classList.add("theme-twilight");
  } else if (isNightPhase(p)) {
    b.classList.add("theme-night");
  } else if (p === "GAME_OVER" && state.match.winner === "wolf") {
    b.classList.add("theme-night");
  } else {
    b.classList.add("theme-day");
  }
}

function setCanvasBubble(seatId, text, mood) {
  state.activeBubble = {
    seatId: seatId,
    text: text,
    mood: mood || "normal",
    born: performance.now()
  };
  setSeatBubble(seatId, text, mood || "normal", 4600);
}

function showToast(message, tone) {
  const container = el("toastContainer");
  if (!container) return;
  if (container.children && typeof container.removeChild === "function") {
    while (container.children.length >= 2 && container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
  const div = document.createElement("div");
  const toneCls = tone === "warn" ? "toast-warn" : (tone === "emerald" ? "toast-jade" : "toast-gold");
  div.className = "craft-toast pointer-events-auto cursor-pointer px-3.5 py-2.5 text-xs font-medium msg-enter " + toneCls;
  div.textContent = message;
  div.title = "點擊可立即關閉";
  const removeSelf = function () {
    if (div.parentNode) div.parentNode.removeChild(div);
  };
  if (typeof div.addEventListener === "function") {
    div.addEventListener("click", removeSelf);
  }
  container.appendChild(div);
  const mul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
  const readMs = Math.round(clamp(2800 + String(message || "").length * 55, 3400, 5000) * mul);
  setTimeout(removeSelf, readMs);
}
