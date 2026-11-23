/**
 * 靜默偵探互動：座位放射輪盤選單與浮動角色情資卡
 */
"use strict";

function closeRadialMenu() {
  state.radialTargetId = null;
  const menu = el("radialSeatMenu");
  if (menu) {
    menu.classList.add("hidden");
    menu.classList.remove("radial-ring-pop");
  }
}

function openRadialMenu(seatId) {
  const node = state.seatCoords.find(function (c) { return c.id === seatId; });
  const canvas = el("sanctuaryCanvas");
  const menu = el("radialSeatMenu");
  if (!node || !canvas || !menu) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = canvas.width / Math.max(1, rect.width);
  const cssX = clamp(node.x / dpr, 76, rect.width - 76);
  const cssY = clamp(node.y / dpr, 56, rect.height - 56);
  state.radialTargetId = seatId;
  menu.style.left = cssX + "px";
  menu.style.top = cssY + "px";
  menu.classList.remove("hidden", "radial-ring-pop");
  void menu.offsetWidth;
  menu.classList.add("radial-ring-pop");
  nudgeSeat(seatId, { scale: 0.9, vScale: 0.22 });
  sound.tone(620, 0.08, "triangle", 0.045, 0);
}

function pinSeatSummaryNote(seatId) {
  const s = getSeat(seatId);
  if (!s || !s.alive || s.id === getPlayerId()) return;
  const allEvs = (state.match.allSpeechEvents || []).filter(function (ev) { return ev.speakerId === s.id; });
  const latest = allEvs.length ? allEvs[allEvs.length - 1] : null;
  let tag = "留意 " + fmtSeatNum(s.id) + "號" + s.name;
  let summary = "請大家比對 " + fmtSeatNum(s.id) + "號" + s.name + " 的前後發言與投票站邊！";
  if (latest) {
    if (latest.claimRole && ROLE_DEFS[latest.claimRole]) {
      const rn = ROLE_DEFS[latest.claimRole].name;
      tag = fmtSeatNum(s.id) + "號跳" + rn;
      summary = "剛才 " + fmtSeatNum(s.id) + "號" + s.name + "跳了" + rn + "身分，請大家冷靜比對他的發言真實性！";
    } else if (latest.accuseId) {
      tag = fmtSeatNum(s.id) + "號打" + fmtSeatNum(latest.accuseId) + "號";
      summary = "剛才 " + fmtSeatNum(s.id) + "號" + s.name + "點名懷疑 " + fmtSeatNum(latest.accuseId) + "號，我覺得我們要仔細檢視他的動機與票型！";
    } else if (latest.vouchId) {
      tag = fmtSeatNum(s.id) + "號保" + fmtSeatNum(latest.vouchId) + "號";
      summary = "剛才 " + fmtSeatNum(s.id) + "號" + s.name + "表態力挺 " + fmtSeatNum(latest.vouchId) + "號，大家記一下他們的站邊關係！";
    }
  }
  pinClue(s.id, tag, summary, "note");
  spawnFx(s.id, "📌 已記進筆記!", "#fbbf24");
  spawnBurst(s.id, ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
  nudgeSeat(s.id, { scale: 1.12, vy: -4 });
  sound.tone(620, 0.08, "triangle", 0.045, 0);
  showToast("📌 已靜默記下 " + fmtSeatNum(s.id) + "號重點，輪到你發言時可一鍵帶入！", "emerald");
}

function executeRadialAction(actionKey) {
  const targetId = state.radialTargetId;
  closeRadialMenu();
  if (!targetId) return;
  const target = getSeat(targetId);
  const pid = getPlayerId();
  if (!target || !target.alive || target.id === pid) return;

  if (actionKey === "good") {
    state.playerMarks[target.id] = state.playerMarks[target.id] === "good" ? null : "good";
    spawnBurst(target.id, ["#34d399", "#a7f3d0", "#fde68a"], 14, "petal");
    nudgeSeat(target.id, { scale: 0.92, vScale: 0.22, vy: -5 });
    spawnFx(target.id, state.playerMarks[target.id] ? "✓ 標記好人" : "清除標記", "#34d399");
    sound.tone(660, 0.08, "triangle", 0.05, 0);
    updateAllUI();
  } else if (actionKey === "wolf") {
    state.playerMarks[target.id] = state.playerMarks[target.id] === "wolf" ? null : "wolf";
    spawnBurst(target.id, ["#fb7185", "#fda4af", "#ffffff"], 14, "spark");
    nudgeSeat(target.id, { scale: 0.88, vScale: 0.2, vTilt: 0.2 });
    spawnFx(target.id, state.playerMarks[target.id] ? "⚠ 標記懷疑" : "清除標記", "#fb7185");
    sound.tone(330, 0.09, "triangle", 0.05, 0);
    updateAllUI();
  } else if (actionKey === "pin") {
    pinSeatSummaryNote(target.id);
    updateAllUI();
  } else if (actionKey === "intel") {
    openSeatIntel(target.id);
    sound.tone(540, 0.07, "sine", 0.04, 0);
  }
}

function openSeatIntel(seatId) {
  const s = getSeat(seatId);
  if (!s || seatId === getPlayerId()) {
    closeSeatIntel();
    return;
  }
  state.intelSeatId = seatId;
  state.selectedSeatId = seatId;
  renderSeatIntelPopover();
}

function closeSeatIntel() {
  state.intelSeatId = null;
  const pop = el("seatIntelPopover");
  if (pop) pop.classList.add("hidden");
}

function renderSeatIntelPopover() {
  const pop = el("seatIntelPopover");
  if (!pop) return;
  const sid = state.intelSeatId;
  if (!sid) {
    pop.classList.add("hidden");
    return;
  }
  const pid = getPlayerId();
  let s = null;
  if (state.match.started) {
    s = getSeat(sid);
  } else {
    const pInfo = AI_PERSONAS[sid - 2];
    if (pInfo) {
      s = { id: sid, name: pInfo.name, trait: pInfo.trait, color: pInfo.avatarColor, alive: true, suspicionMap: {}, microPulse: 22 };
    }
  }
  if (!s || s.id === pid) {
    pop.classList.add("hidden");
    return;
  }

  pop.classList.remove("hidden");
  const dot = el("intelSeatDot");
  if (dot) {
    dot.textContent = fmtSeatNum(s.id);
    dot.style.backgroundColor = s.color || "#38bdf8";
  }
  const pImg = el("intelSeatPortrait");
  if (pImg && typeof getPortraitImageUrl === "function") {
    const artUrl = getPortraitImageUrl(s);
    if (artUrl) {
      pImg.src = artUrl;
      pImg.style.borderColor = s.alive ? (s.color || "#fbbf24") : "#64748b";
      pImg.style.filter = s.alive ? "" : "grayscale(0.85) opacity(0.65)";
      pImg.classList.remove("hidden");
    } else {
      pImg.classList.add("hidden");
    }
  }
  const roleTag = (s.claimedRole && ROLE_DEFS[s.claimedRole]) ? ("・跳" + ROLE_DEFS[s.claimedRole].name) : "";
  const sweatTag = (state.match.started && s.alive && (state.match.microPulseRevealed || s.sweatExposed))
    ? ("・心虛" + s.microPulse + "%")
    : "";
  el("intelSeatTitle").textContent = fmtSeatNum(s.id) + "號 " + s.name + (!s.alive ? "（已離席）" : "");
  el("intelSeatSub").textContent = (s.trait || "推理夥伴") + roleTag + sweatTag;

  const attBox = el("intelAttitudeBox");
  if (state.match.started && s.alive) {
    attBox.classList.remove("hidden");
    const susOnYou = Math.round((s.suspicionMap && s.suspicionMap[pid]) || 50);
    const trustPct = clamp(100 - susOnYou, 5, 95);
    const lbl = el("intelAttitudeLabel");
    const bar = el("intelAttitudeBar");
    if (susOnYou >= 62) {
      lbl.textContent = "高度懷疑你 (" + susOnYou + "%)";
      lbl.className = "text-rose-300";
      bar.className = "h-full bg-rose-400 transition-all duration-300";
    } else if (susOnYou <= 38) {
      lbl.textContent = "高度信任你 (" + trustPct + "%)";
      lbl.className = "text-emerald-300";
      bar.className = "h-full bg-emerald-400 transition-all duration-300";
    } else {
      lbl.textContent = "觀望評估中 (" + trustPct + "%)";
      lbl.className = "text-amber-300";
      bar.className = "h-full bg-amber-400 transition-all duration-300";
    }
    bar.style.width = trustPct + "%";
  } else {
    attBox.classList.add("hidden");
  }

  const qBox = el("intelQuoteBox");
  if (!state.match.started) {
    qBox.textContent = "性格風格：「" + (s.trait || "觀察派") + "」—— 點下方「打個招呼」先跟這位夥伴暖身！";
  } else {
    const allEvs = (state.match.allSpeechEvents || []).filter(function (ev) { return ev.speakerId === s.id; });
    const latest = allEvs.length ? allEvs[allEvs.length - 1] : null;
    if (latest) {
      const stance = latest.accuseId
        ? ("【指控 " + fmtSeatNum(latest.accuseId) + "號】")
        : (latest.vouchId ? ("【力挺 " + fmtSeatNum(latest.vouchId) + "號】") : "【發言摘要】");
      qBox.textContent = "第" + latest.day + "天 " + stance + " " + latest.rawText;
    } else {
      qBox.textContent = s.alive ? "本局尚未輪到他發言，點下方可先做靜默標記或看票型。" : ("離席原因：" + (s.outReason || "出局"));
    }
    if (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive()) {
      const rInfo = (typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[s.role]) ? ROLE_DEFS[s.role] : { icon: "👁", name: s.role };
      const tops = state.match.seats
        .filter(function (o) { return o.alive && o.id !== s.id; })
        .map(function (o) { return { id: o.id, score: Math.round((s.suspicionMap && s.suspicionMap[o.id]) || 50) }; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 2)
        .map(function (o) { return fmtSeatNum(o.id) + "號(" + o.score + "%)"; })
        .join("、");
      qBox.textContent = "👁 真實：" + rInfo.icon + rInfo.name + (tops ? ("｜最疑：" + tops) : "") + " ▸ " + qBox.textContent;
    }
  }

  const curMark = state.playerMarks[s.id] || null;
  const bGood = el("btnIntelMarkGood");
  const bWolf = el("btnIntelMarkWolf");
  const bPin = el("btnIntelPinSeat");
  const bPoke = el("btnIntelPokeSeat");
  const bMicro = el("btnIntelMicroInspect");
  if (bGood) {
    bGood.disabled = !state.match.started || !s.alive;
    bGood.textContent = curMark === "good" ? "✓ 已標好人" : "✓ 標記好人";
  }
  if (bWolf) {
    bWolf.disabled = !state.match.started || !s.alive;
    bWolf.textContent = curMark === "wolf" ? "⚠ 已標懷疑" : "⚠ 標記懷疑";
  }
  if (bPin) {
    bPin.disabled = !state.match.started || !s.alive;
    bPin.textContent = state.match.phase === "DAY_PLAYER_TURN" ? "🎯 鎖定點名" : "📌 記進發言";
  }
  if (bPoke) {
    bPoke.disabled = false;
    bPoke.textContent = state.match.started ? "📋 票型小抄" : "👋 打個招呼";
  }
  if (bMicro) {
    const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
    bMicro.classList.toggle("hidden", classicMode);
    if (!classicMode) {
      const pSelf = getPlayerSeat();
      const mMax = getMicroInspectMaxToday();
      const mUsed = (state.match && state.match.microInspectCountToday) || 0;
      const rem = Math.max(0, mMax - mUsed);
      const dayKey = ((state.match && state.match.day) || 0) + ":" + s.id;
      const alreadyDone = Boolean(state.match && state.match.microInspectedSeats && state.match.microInspectedSeats[dayKey]);
      const validPh = state.match.phase === "DAY_SPEECH" || state.match.phase === "DAY_PLAYER_TURN" || state.match.phase === "DAY_VOTE";
      bMicro.disabled = !state.match.started || !s.alive || !(pSelf && pSelf.alive) || !validPh || rem <= 0 || alreadyDone;
      bMicro.textContent = alreadyDone
        ? "🔍 已觀微"
        : ("🔍 觀微 (" + rem + "/" + mMax + ")");
    }
  }
  const bTea = el("btnIntelServeTea");
  if (bTea) {
    const classicModeT = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
    bTea.classList.toggle("hidden", classicModeT);
    if (!classicModeT) {
      const pSelfT = getPlayerSeat();
      const validPhT = state.match.phase === "DAY_SPEECH" || state.match.phase === "DAY_PLAYER_TURN" || state.match.phase === "DAY_VOTE";
      const usedTodayT = (state.match && state.match.teaServedDay === state.match.day);
      bTea.disabled = !state.match.started || !s.alive || !(pSelfT && pSelfT.alive) || !validPhT || usedTodayT;
      bTea.textContent = usedTodayT ? "🍵 已奉茶 (0/1)" : "🍵 奉暖茶 (1/1)";
    }
  }
  const bQuick = el("btnIntelQuickAct");
  if (bQuick) {
    const pSelf = getPlayerSeat();
    const pAliveSelf = Boolean(pSelf && pSelf.alive);
    const ph = state.match.phase;
    let quickLabel = "";
    if (state.match.started && s.alive) {
      if (ph === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active) && (typeof isValidVoteTarget !== "function" || isValidVoteTarget(s.id))) {
        quickLabel = "🗳 確認投給 " + fmtSeatNum(s.id) + "號";
      } else if (ph === "NIGHT_GUARD" && pAliveSelf && pSelf.role === "guard" && state.match.lastGuardTargetId !== s.id) {
        quickLabel = "🛡️ 守護 " + fmtSeatNum(s.id) + "號";
      } else if (ph === "NIGHT_SEER" && !state.seerReveal && pAliveSelf && pSelf.role === "seer") {
        quickLabel = "🔮 立即查證 " + fmtSeatNum(s.id) + "號";
      } else if (ph === "NIGHT_WOLF" && pAliveSelf && pSelf.role === "wolf" && s.role !== "wolf") {
        quickLabel = "🐺 夜間鎖定 " + fmtSeatNum(s.id) + "號";
      } else if (ph === "HUNTER_TRIGGER" && pSelf && !pSelf.alive && pSelf.role === "hunter") {
        quickLabel = "🎯 共鳴請離 " + fmtSeatNum(s.id) + "號";
      } else if (ph === "DAY_PLAYER_TURN") {
        quickLabel = "🎯 設為發言點名對象";
      }
    }
    bQuick.classList.toggle("hidden", !quickLabel);
    if (quickLabel) bQuick.textContent = quickLabel;
  }
}

function getMicroInspectMaxToday() {
  if (!state.match) return 1;
  return (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "truth_lantern") ? 2 : 1;
}

function inspectSeatMicroExpression(seatId) {
  sound.unlock();
  if (!state.match || !state.match.started) return false;
  if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) return false;
  const pSelf = getPlayerSeat();
  const pid = getPlayerId();
  if (!pSelf || !pSelf.alive) {
    showToast("離席觀戰中無法使用在場觀微技能！", "warn");
    return false;
  }
  const ph = state.match.phase;
  if (ph !== "DAY_SPEECH" && ph !== "DAY_PLAYER_TURN" && ph !== "DAY_VOTE") {
    showToast("請於白天發言或公投階段使用「靜心觀微」！", "warn");
    return false;
  }
  const target = getSeat(seatId);
  if (!target || !target.alive || target.id === pid) {
    showToast("請選擇一位存活的茶席夥伴進行觀微！", "warn");
    return false;
  }
  const maxToday = getMicroInspectMaxToday();
  const usedToday = state.match.microInspectCountToday || 0;
  if (usedToday >= maxToday) {
    showToast("今日「靜心觀微」次數已用完（" + usedToday + "/" + maxToday + "）！", "warn");
    return false;
  }
  if (!state.match.microInspectedSeats) state.match.microInspectedSeats = {};
  const dayKey = (state.match.day || 0) + ":" + target.id;
  if (state.match.microInspectedSeats[dayKey]) {
    showToast("今天已經靜心觀微過 " + fmtSeatNum(target.id) + "號 囉！", "amber");
    return false;
  }

  state.match.microInspectCountToday = usedToday + 1;
  state.match.microInspectedSeats[dayKey] = true;
  state.match.stats.microInspectsUsed = (state.match.stats.microInspectsUsed || 0) + 1;

  sound.playBlessing();
  spawnBeam(pid, target.id, "#fbbf24", "emote", 720);
  nudgeSeat(target.id, { scale: 1.12, vScale: 0.14 });
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.focusSeatCloseUp(target.id);
    if (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function") {
      orchestrator.schedule("micro_cam", function () {
        if (typeof stage3d !== "undefined" && stage3d.isActive()) stage3d.clearCloseUp();
      }, 2100);
    }
  }

  const hasLantern = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "truth_lantern");
  const diff = state.aiDifficulty || "normal";
  const maxErr = hasLantern ? 0 : (diff === "easy" ? 4 : (diff === "pro" ? 14 : 8));
  const noise = maxErr > 0 ? (Math.floor(Math.random() * (maxErr * 2 + 1)) - maxErr) : 0;
  const reading = clamp((target.microPulse || 30) + noise, 5, 98);

  if (reading >= 64) {
    target.sweatExposed = true;
    setSeatEmotion(target.id, "nervous", 4200);
    spawnFx(target.id, "💦 神色心虛 " + reading + "%!", "#fb7185");
    spawnBurst(target.id, ["#fb7185", "#fbbf24", "#ffffff"], 18, "spark");
    pinClue(
      target.id,
      "🔍觀微 " + fmtSeatNum(target.id) + "號心虛",
      "剛才我仔細觀察 " + fmtSeatNum(target.id) + "號" + target.name + " 的神情反應，發現他眼角閃躲、神色緊繃（緊張度約 " + reading + "%），建議這輪重點查證 " + fmtSeatNum(target.id) + "號！",
      "micro"
    );
    if (target.team === "wolf") {
      state.match.stats.microWolfSpotted = (state.match.stats.microWolfSpotted || 0) + 1;
    }
    const isFeast = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "harmony_feast");
    bumpCombo("靜心觀微");
    if (isFeast) {
      bumpCombo("茶點連擊");
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 5, 0, 100);
    }
    addLog({
      kind: "blessing",
      title: "🔍 靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 神情明顯緊繃閃躲（緊張讀數 " + reading + "%），已存為「呈堂證供」素材！",
      text: ""
    });
    showToast("🔍 觀微察覺 " + fmtSeatNum(target.id) + "號神色緊張 (" + reading + "%)！已存入呈堂證供素材！", "emerald");
  } else if (reading <= 38) {
    setSeatEmotion(target.id, "happy", 2800);
    spawnFx(target.id, "🌿 氣息沉穩 " + reading + "%", "#34d399");
    spawnBurst(target.id, ["#34d399", "#a7f3d0"], 12, "petal");
    addLog({
      kind: "blessing",
      title: "🔍 靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 目光坦然、呼吸沉穩（緊張讀數 " + reading + "%）。",
      text: ""
    });
    showToast("🔍 觀微顯示 " + fmtSeatNum(target.id) + "號神情沉穩自然 (" + reading + "%)。", "emerald");
  } else {
    spawnFx(target.id, "🔍 尚稱克制 " + reading + "%", "#fde68a");
    addLog({
      kind: "blessing",
      title: "🔍 靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 情緒壓抑尚無明顯波瀾（讀數 " + reading + "%），仍需聽後續言行比對。",
      text: ""
    });
    showToast("🔍 " + fmtSeatNum(target.id) + "號情緒尚稱克制（讀數 " + reading + "%），可再聽其邏輯。", "amber");
  }

  updateAllUI();
  return true;
}

const PERSONA_TEA_REACTIONS = {
  "小澄": "謝謝這杯烏龍，回甘度 98%！我會把你的善意納入今日信任權重。",
  "暖暖": "哇茶湯暖進心坎裡了～大家喝杯好茶心平氣和推理最棒！",
  "阿松": "好茶！像極了林美山晨霧裡的那口甘泉，謝謝你的關照。",
  "星兒": "哇茶香裡面有好人緣的味道耶～這輪我有在認真幫你看局勢喔！",
  "小雲": "收下這盞暖茶了。別擔心，我看重真憑實據，不會輕易誤傷無辜。",
  "阿竹": "清茗一盞，如沐春風；席間紛擾雖多，仍信君子坦蕩。",
  "晨晨": "夠意思！喝完這杯整個人都精神起來，等一下跟緊你的節奏看票！"
};

function serveWarmTeaToSeat(seatId) {
  sound.unlock();
  if (!state.match || !state.match.started) return false;
  if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) return false;
  const pSelf = getPlayerSeat();
  const pid = getPlayerId();
  if (!pSelf || !pSelf.alive) {
    showToast("離席觀戰中無法進行在場奉茶結緣！", "warn");
    return false;
  }
  const ph = state.match.phase;
  if (ph !== "DAY_SPEECH" && ph !== "DAY_PLAYER_TURN" && ph !== "DAY_VOTE") {
    showToast("請於白天發言或公投階段進行「奉暖茶結緣」！", "warn");
    return false;
  }
  if (state.match.teaServedDay === state.match.day) {
    showToast("今天已經奉過暖茶結緣囉，明日可再邀夥伴共飲！", "amber");
    return false;
  }
  const target = getSeat(seatId);
  if (!target || !target.alive || target.id === pid) {
    showToast("請點選一位存活的茶席夥伴奉茶結緣！", "warn");
    return false;
  }

  state.match.teaServedDay = state.match.day;
  state.match.stats.teaServedCount = (state.match.stats.teaServedCount || 0) + 1;
  state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 6, 0, 100);
  target.suspicionMap[pid] = clamp((target.suspicionMap[pid] || 50) - 14, 5, 95);
  recordRelation(pid, target.id, "trust");

  sound.playBlessing();
  spawnBeam(pid, target.id, "#34d399", "trust", 820);
  spawnBurst(target.id, ["#34d399", "#fbbf24", "#fde68a"], 20, "petal");
  nudgeSeat(target.id, { scale: 1.12, vy: -5 });
  setSeatEmotion(target.id, "happy", 3400);
  spawnFx(target.id, "🍵 暖茶結緣 +6!", "#34d399");
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.triggerSkillFx("witch_heal", pid, target.id, false);
  }
  const reply = PERSONA_TEA_REACTIONS[target.name] || "謝謝你的好茶，心裡暖暖的！";
  setSeatBubble(target.id, reply, "trust", 4200);
  bumpCombo("奉茶結緣");
  addThreeGoodPoint("deeds", "做好事・奉茶結緣");
  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  }
  addLog({
    kind: "blessing",
    title: "🍵 奉茶結緣：你親自端了一盞暖茶給 " + fmtSeatNum(target.id) + "號 " + target.name + "（全場友善度 +6、好感拉近）！",
    text: ""
  });
  showToast("🍵 已奉暖茶給 " + fmtSeatNum(target.id) + "號 " + target.name + "！夥伴暖心回禮，點亮做好事進度！", "emerald");
  updateAllUI();
  return true;
}
