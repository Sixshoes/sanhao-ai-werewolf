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
  const hudEl = el("inGameTopHud");
  let minTopY = 72;
  if (hudEl && !hudEl.classList.contains("hidden")) {
    const hudRect = hudEl.getBoundingClientRect();
    if (hudRect.height > 0) {
      minTopY = Math.max(72, Math.ceil(hudRect.bottom - rect.top) + 56);
    }
  }
  const maxX = Math.max(96, rect.width - 96);
  const maxY = Math.max(minTopY, rect.height - 72);
  const cssX = clamp(node.x / dpr, Math.min(96, maxX), maxX);
  const cssY = clamp(node.y / dpr, minTopY, maxY);
  state.radialTargetId = seatId;
  const pSelfRad = (state.match && state.match.started) ? getPlayerSeat() : null;
  const tSeatRad = (state.match && state.match.started) ? getSeat(seatId) : null;
  const isWolfRad = Boolean(pSelfRad && pSelfRad.role === "wolf");
  const isMateRad = Boolean(isWolfRad && tSeatRad && tSeatRad.role === "wolf");
  if (typeof menu.querySelector === "function") {
    const rbGood = menu.querySelector('[data-radial="good"]');
    const rbWolf = menu.querySelector('[data-radial="wolf"]');
    if (rbGood) {
      rbGood.textContent = isMateRad ? "狼同伴" : (isWolfRad ? "標假保" : "標好人");
      rbGood.disabled = isMateRad;
    }
    if (rbWolf) {
      rbWolf.textContent = isMateRad ? "勿刀伴" : (isWolfRad ? "標甩鍋" : "標懷疑");
      rbWolf.disabled = isMateRad;
    }
  }
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
  spawnFx(s.id, "已記進筆記!", "#fbbf24");
  spawnBurst(s.id, ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
  nudgeSeat(s.id, { scale: 1.12, vy: -4 });
  sound.tone(620, 0.08, "triangle", 0.045, 0);
  showToast("已靜默記下 " + fmtSeatNum(s.id) + "號重點，輪到你發言時可一鍵帶入！", "emerald");
}

function executeRadialAction(actionKey) {
  const targetId = state.radialTargetId;
  closeRadialMenu();
  if (!targetId) return;
  const target = getSeat(targetId);
  const pid = getPlayerId();
  if (!target || !target.alive || target.id === pid) return;

  const pSelfEx = (state.match && state.match.started) ? getPlayerSeat() : null;
  const isWolfEx = Boolean(pSelfEx && pSelfEx.role === "wolf");
  if (actionKey === "good") {
    if (isWolfEx && target.role === "wolf") {
      spawnFx(target.id, "狼隊同伴", "#fb7185");
      return;
    }
    state.playerMarks[target.id] = state.playerMarks[target.id] === "good" ? null : "good";
    if (typeof syncDraftPitFromPlayerMark === "function") syncDraftPitFromPlayerMark(target.id, state.playerMarks[target.id]);
    spawnBurst(target.id, ["#34d399", "#a7f3d0", "#fde68a"], 14, "petal");
    nudgeSeat(target.id, { scale: 0.92, vScale: 0.22, vy: -5 });
    spawnFx(target.id, state.playerMarks[target.id] ? (isWolfEx ? "標記假保" : "標記好人") : "清除標記", "#34d399");
    sound.tone(660, 0.08, "triangle", 0.05, 0);
    updateAllUI();
  } else if (actionKey === "wolf") {
    if (isWolfEx && target.role === "wolf") {
      spawnFx(target.id, "勿標同伴", "#fb7185");
      return;
    }
    state.playerMarks[target.id] = state.playerMarks[target.id] === "wolf" ? null : "wolf";
    if (typeof syncDraftPitFromPlayerMark === "function") syncDraftPitFromPlayerMark(target.id, state.playerMarks[target.id]);
    spawnBurst(target.id, ["#fb7185", "#fda4af", "#ffffff"], 14, "spark");
    nudgeSeat(target.id, { scale: 0.88, vScale: 0.2, vTilt: 0.2 });
    spawnFx(target.id, state.playerMarks[target.id] ? (isWolfEx ? "標記甩鍋" : "標記懷疑") : "清除標記", "#fb7185");
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
  if (typeof stage3d !== "undefined" && typeof stage3d.jumpToSeatFront === "function") {
    stage3d.jumpToSeatFront(seatId);
  }
  renderSeatIntelPopover();
}

function closeSeatIntel() {
  state.intelSeatId = null;
  const pop = el("seatIntelPopover");
  if (pop) pop.classList.add("hidden");
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") {
    stage3d.clearCloseUp();
  }
}

function positionSeatIntelPopover() {
  const pop = el("seatIntelPopover");
  if (!pop || pop.classList.contains("hidden")) return;
  const hud = el("inGameTopHud");
  const seatStrip = el("seatButtonStrip");
  const dock = el("controlDeck");
  const stageWrap = el("gameViewport");
  const baseRect = (stageWrap && typeof stageWrap.getBoundingClientRect === "function") ? stageWrap.getBoundingClientRect() : { top: 0, height: (typeof window !== "undefined" ? window.innerHeight : 900) };
  const baseTop = baseRect.top || 0;
  const viewH = Math.max(400, baseRect.height || (typeof window !== "undefined" ? window.innerHeight : 900));
  let safeTop = 58;
  if (hud && !hud.classList.contains("hidden") && typeof hud.getBoundingClientRect === "function") {
    const hudRect = hud.getBoundingClientRect();
    if (hudRect.height > 0) {
      safeTop = Math.max(safeTop, Math.ceil(hudRect.bottom - baseTop) + 8);
    }
  }
  if (seatStrip && !seatStrip.classList.contains("hidden") && typeof seatStrip.getBoundingClientRect === "function") {
    const stripRect = seatStrip.getBoundingClientRect();
    // Only avoid top-docked seat rail (when seatStrip sits near top edge)
    if (stripRect.height > 0 && (stripRect.top - baseTop) < viewH * 0.35) {
      safeTop = Math.max(safeTop, Math.ceil(stripRect.bottom - baseTop) + 8);
    }
  }
  let safeBottomGap = 16;
  if (dock && typeof dock.getBoundingClientRect === "function" && typeof window !== "undefined" && window.innerWidth < 1360) {
    const dockRect = dock.getBoundingClientRect();
    if (dockRect.height > 0 && dockRect.top > baseTop + safeTop + 140) {
      const dockBottomOffset = Math.ceil((baseTop + viewH) - dockRect.top) + 8;
      if (dockBottomOffset > 16 && dockBottomOffset < viewH * 0.55) {
        safeBottomGap = dockBottomOffset;
      }
    }
  }
  pop.style.top = safeTop + "px";
  pop.style.maxHeight = "calc(100dvh - " + (safeTop + safeBottomGap) + "px)";
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
  positionSeatIntelPopover();
  const dot = el("intelSeatDot");
  if (dot) {
    dot.textContent = fmtSeatNum(s.id);
    dot.style.borderColor = s.color || "#d4a657";
  }
  const pImg = el("intelSeatPortrait");
  if (pImg && typeof getPortraitImageUrl === "function") {
    const artUrl = getPortraitImageUrl(s);
    if (artUrl) {
      pImg.src = artUrl;
      pImg.style.borderColor = s.alive ? (s.color || "#d4a657") : "#64748b";
      pImg.style.filter = s.alive ? "" : "grayscale(0.85) opacity(0.65)";
      pImg.classList.remove("hidden");
    } else {
      pImg.classList.add("hidden");
    }
  }
  const pSelfNow = state.match.started ? getPlayerSeat() : null;
  const isWolfView = Boolean(pSelfNow && pSelfNow.role === "wolf");
  const isWolfMateSeat = Boolean(isWolfView && s.role === "wolf");
  const wolfGodTag = (isWolfView && !isWolfMateSeat && state.match.wolfGodMarks && state.match.wolfGodMarks[s.id] && typeof getWolfGodMarkDef === "function")
    ? ("・" + getWolfGodMarkDef(state.match.wolfGodMarks[s.id]).label)
    : "";
  const mateTag = isWolfMateSeat ? "・狼同伴" : "";
  const roleTag = (s.claimedRole && ROLE_DEFS[s.claimedRole]) ? ("・亮" + ROLE_DEFS[s.claimedRole].name) : "";
  const sweatTag = (state.match.started && s.alive && (state.match.microPulseRevealed || s.sweatExposed))
    ? ("・心虛 " + s.microPulse + "%")
    : "";
  el("intelSeatTitle").textContent = fmtSeatNum(s.id) + "號 " + s.name + (!s.alive ? "（已離席）" : "");
  el("intelSeatSub").textContent = (s.trait || "推理夥伴") + mateTag + roleTag + wolfGodTag + sweatTag;
  const pBadgeEl = el("intelPersonaBadge");
  const pProfIntel = typeof getPersonaProfile === "function" ? getPersonaProfile(s) : null;
  if (pBadgeEl) {
    if (pProfIntel && pProfIntel.registerBadge) {
      pBadgeEl.textContent = pProfIntel.registerBadge;
      pBadgeEl.title = pProfIntel.registerBadge + (pProfIntel.logicTags ? ("｜" + pProfIntel.logicTags) : "");
      if (typeof shPrependIcon === "function" && pProfIntel.iconKey) {
        shPrependIcon(pBadgeEl, pProfIntel.iconKey, pProfIntel.iconTone || "gold");
      }
      pBadgeEl.classList.remove("hidden");
    } else {
      pBadgeEl.classList.add("hidden");
    }
  }

  const attBox = el("intelAttitudeBox");
  if (state.match.started && s.alive) {
    attBox.classList.remove("hidden");
    const susOnYou = Math.round((s.suspicionMap && s.suspicionMap[pid]) || 50);
    const trustPct = clamp(100 - susOnYou, 5, 95);
    const lbl = el("intelAttitudeLabel");
    const bar = el("intelAttitudeBar");
    if (susOnYou >= 62) {
      lbl.textContent = "高度懷疑你 · " + susOnYou + "%";
      lbl.className = "font-bold text-rose-300";
      bar.className = "intel-att-fill is-cinnabar";
    } else if (susOnYou <= 38) {
      lbl.textContent = "傾向信任你 · " + trustPct + "%";
      lbl.className = "font-bold text-emerald-300";
      bar.className = "intel-att-fill is-jade";
    } else {
      lbl.textContent = "觀望評估中 · " + trustPct + "%";
      lbl.className = "font-bold text-amber-300";
      bar.className = "intel-att-fill is-gold";
    }
    bar.style.width = trustPct + "%";
  } else {
    attBox.classList.add("hidden");
  }

  const qBox = el("intelQuoteBox");
  if (!state.match.started) {
    const sampleLine = (pProfIntel && pProfIntel.sampleQuote)
      ? ("「" + pProfIntel.sampleQuote + "」")
      : ("性格風格：「" + (s.trait || "觀察派") + "」—— 點下方與這位夥伴打聲招呼。");
    qBox.textContent = sampleLine;
    qBox.innerHTML = '<div class="intel-quote-meta is-neutral">角色代表語氣</div><div class="intel-quote-body">' + escapeHtml(sampleLine) + "</div>";
  } else {
    const allEvs = (state.match.allSpeechEvents || []).filter(function (ev) { return ev.speakerId === s.id; });
    const latest = allEvs.length ? allEvs[allEvs.length - 1] : null;
    let metaTone = "is-neutral";
    let metaText = "尚未發言";
    let bodyText = s.alive ? "本局尚未輪到他發言，點下方可先靜默標記或查看票型。" : ("離席原因：" + (s.outReason || "出局"));
    if (latest) {
      if (latest.accuseId) {
        metaTone = "is-wolf";
        metaText = "第 " + latest.day + " 天 · 指控 " + fmtSeatNum(latest.accuseId) + "號";
      } else if (latest.vouchId) {
        metaTone = "is-good";
        metaText = "第 " + latest.day + " 天 · 力挺 " + fmtSeatNum(latest.vouchId) + "號";
      } else {
        metaText = "第 " + latest.day + " 天 · 發言摘要";
      }
      bodyText = "「" + String(latest.rawText || "").replace(/^「|」$/g, "").trim() + "」";
    }
    let godPrefix = "";
    if (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive()) {
      const rInfo = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(s) : null) || ((typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[s.role]) ? ROLE_DEFS[s.role] : { name: s.role });
      const tops = state.match.seats
        .filter(function (o) { return o.alive && o.id !== s.id; })
        .map(function (o) { return { id: o.id, score: Math.round((s.suspicionMap && s.suspicionMap[o.id]) || 50) }; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 2)
        .map(function (o) { return fmtSeatNum(o.id) + "號(" + o.score + "%)"; })
        .join("、");
      godPrefix = "真實：" + rInfo.name + (tops ? ("｜最疑：" + tops) : "");
    }
    qBox.textContent = (godPrefix ? (godPrefix + " ▸ ") : "") + metaText + " " + bodyText;
    qBox.innerHTML =
      (godPrefix ? ('<div class="intel-quote-meta is-god">' + escapeHtml(godPrefix) + "</div>") : "") +
      '<div class="intel-quote-meta ' + metaTone + '">' + escapeHtml(metaText) + "</div>" +
      '<div class="intel-quote-body">' + escapeHtml(bodyText) + "</div>";
  }

  const curMark = state.playerMarks[s.id] || null;
  const bGood = el("btnIntelMarkGood");
  const bWolf = el("btnIntelMarkWolf");
  const bPin = el("btnIntelPinSeat");
  const bPoke = el("btnIntelPokeSeat");
  const bMicro = el("btnIntelMicroInspect");
  if (bGood) {
    if (isWolfMateSeat) {
      bGood.disabled = true;
      bGood.className = "intel-seg-btn";
      bGood.textContent = "狼同伴";
    } else if (isWolfView) {
      bGood.disabled = !state.match.started || !s.alive;
      bGood.className = "intel-seg-btn" + (curMark === "good" ? " is-active-good" : "");
      bGood.textContent = curMark === "good" ? "已假保" : "標假保";
    } else {
      bGood.disabled = !state.match.started || !s.alive;
      bGood.className = "intel-seg-btn" + (curMark === "good" ? " is-active-good" : "");
      bGood.textContent = curMark === "good" ? "已標好人" : "好人";
    }
  }
  if (bWolf) {
    if (isWolfMateSeat) {
      bWolf.disabled = true;
      bWolf.className = "intel-seg-btn";
      bWolf.textContent = "勿刀伴";
    } else if (isWolfView) {
      bWolf.disabled = !state.match.started || !s.alive;
      bWolf.className = "intel-seg-btn" + (curMark === "wolf" ? " is-active-wolf" : "");
      bWolf.textContent = curMark === "wolf" ? "已甩鍋" : "標甩鍋";
    } else {
      bWolf.disabled = !state.match.started || !s.alive;
      bWolf.className = "intel-seg-btn" + (curMark === "wolf" ? " is-active-wolf" : "");
      bWolf.textContent = curMark === "wolf" ? "已懷疑" : "懷疑";
    }
  }
  if (bPin) {
    bPin.disabled = !state.match.started || !s.alive;
    bPin.className = "intel-seg-btn";
    bPin.textContent = state.match.phase === "DAY_PLAYER_TURN" ? "點名他" : "記筆記";
    if (typeof shPrependIcon === "function") shPrependIcon(bPin, state.match.phase === "DAY_PLAYER_TURN" ? "target" : "pin", "gold");
  }
  if (bPoke) {
    bPoke.disabled = false;
    bPoke.textContent = state.match.started ? "查看全場票型紀錄 →" : "與這位夥伴打個招呼 →";
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
      const isWatchedFree = Boolean(
        state.match &&
        Array.isArray(state.match.candlelitWatchIds) &&
        state.match.candlelitWatchIds.indexOf(s.id) !== -1 &&
        state.match.candlelitFreeInspectUsedDay !== state.match.day
      );
      const validPh = state.match.phase === "DAY_SPEECH" || state.match.phase === "DAY_PLAYER_TURN" || state.match.phase === "DAY_VOTE";
      bMicro.disabled = !state.match.started || !s.alive || !(pSelf && pSelf.alive) || !validPh || (rem <= 0 && !isWatchedFree) || alreadyDone;
      bMicro.textContent = alreadyDone
        ? "已看心虛"
        : (isWatchedFree ? "免費觀微 (燭防)" : ("觀微 " + rem + "/" + mMax));
      if (typeof shPrependIcon === "function") shPrependIcon(bMicro, "search", "gold");
      bMicro.title = isWatchedFree
        ? "昨夜燭下圈防對象：贈送 1 次免費「靜心觀微」（不扣今日額度）"
        : ("偵測對方此刻心虛緊張度，判斷發言是否說謊（每日限用 " + mMax + " 次）");
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
      bTea.textContent = usedTodayT ? "已奉茶 0/1" : "奉暖茶 1/1";
      if (typeof shPrependIcon === "function") shPrependIcon(bTea, "witch", "jade");
      bTea.title = "請對方喝暖茶：大幅降低他對你的懷疑度，並點亮三好「做好事」蓮花瓣（每日 1 次）";
    }
  }
  const bQuick = el("btnIntelQuickAct");
  if (bQuick) {
    const pSelf = getPlayerSeat();
    const pAliveSelf = Boolean(pSelf && pSelf.alive);
    const ph = state.match.phase;
    let quickLabel = "";
    let quickIco = "target";
    if (state.match.started && s.alive) {
      if (ph === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active) && (typeof isValidVoteTarget !== "function" || isValidVoteTarget(s.id))) {
        quickLabel = "確認投給 " + fmtSeatNum(s.id) + "號";
        quickIco = "ballot";
      } else if (ph === "NIGHT_GUARD" && pAliveSelf && pSelf.role === "guard" && state.match.lastGuardTargetId !== s.id) {
        quickLabel = "守護 " + fmtSeatNum(s.id) + "號";
        quickIco = "guard";
      } else if (ph === "NIGHT_SEER" && !state.seerReveal && pAliveSelf && pSelf.role === "seer") {
        quickLabel = "立即查證 " + fmtSeatNum(s.id) + "號";
        quickIco = "seer";
      } else if (ph === "NIGHT_WOLF" && pAliveSelf && pSelf.role === "wolf" && s.role !== "wolf") {
        quickLabel = "夜間鎖定 " + fmtSeatNum(s.id) + "號";
        quickIco = "wolf";
      } else if (ph === "HUNTER_TRIGGER" && pSelf && !pSelf.alive && typeof canSeatTriggerShot === "function" && canSeatTriggerShot(pSelf) && !(pSelf.isWolfKing && s.role === "wolf")) {
        quickLabel = pSelf.isWolfKing ? ("反撲帶走 " + fmtSeatNum(s.id) + "號") : ("共鳴請離 " + fmtSeatNum(s.id) + "號");
        quickIco = pSelf.isWolfKing ? "crown" : "scales";
      } else if (ph === "DAY_PLAYER_TURN") {
        quickLabel = "設為發言點名對象";
        quickIco = "target";
      }
    }
    bQuick.classList.toggle("hidden", !quickLabel);
    if (quickLabel) {
      bQuick.textContent = quickLabel;
      if (typeof shPrependIcon === "function") shPrependIcon(bQuick, quickIco, "gold");
    }

    // v19.0 Phase-Aware Popover Subtraction: show ONLY 1–3 relevant large buttons per phase (zero 7-button overload!)
    const stanceRow = el("intelStanceRow");
    const skillRow = el("intelSkillRow");
    const isVoteFocus = Boolean(state.match.started && ph === "DAY_VOTE" && quickLabel);
    const isNightActionFocus = Boolean(state.match.started && (ph === "NIGHT_SEER" || ph === "NIGHT_WOLF" || ph === "NIGHT_GUARD" || ph === "HUNTER_TRIGGER") && quickLabel);
    const isLobbyIntel = !state.match.started;
    if (stanceRow) {
      stanceRow.classList.toggle("hidden", isLobbyIntel || isVoteFocus || isNightActionFocus || !s.alive);
    }
    if (skillRow) {
      const microUsable = Boolean(bMicro && !bMicro.classList.contains("hidden") && !bMicro.disabled);
      const teaUsable = Boolean(bTea && !bTea.classList.contains("hidden") && !bTea.disabled);
      skillRow.classList.toggle("hidden", isLobbyIntel || isVoteFocus || isNightActionFocus || !s.alive || (!microUsable && !teaUsable));
    }
    if (bPoke) {
      bPoke.classList.toggle("hidden", isVoteFocus || isNightActionFocus || (state.match.started && s.alive));
    }
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
  const isCandlelitFreeTarget = Boolean(
    Array.isArray(state.match.candlelitWatchIds) &&
    state.match.candlelitWatchIds.indexOf(target.id) !== -1 &&
    state.match.candlelitFreeInspectUsedDay !== state.match.day
  );
  if (usedToday >= maxToday && !isCandlelitFreeTarget) {
    showToast("今日「靜心觀微」次數已用完（" + usedToday + "/" + maxToday + "）！", "warn");
    return false;
  }
  if (!state.match.microInspectedSeats) state.match.microInspectedSeats = {};
  const dayKey = (state.match.day || 0) + ":" + target.id;
  if (state.match.microInspectedSeats[dayKey]) {
    showToast("今天已經靜心觀微過 " + fmtSeatNum(target.id) + "號 囉！", "amber");
    return false;
  }

  if (isCandlelitFreeTarget) {
    state.match.candlelitFreeInspectUsedDay = state.match.day;
    showToast("燭下盯防生效：免費觀微 " + fmtSeatNum(target.id) + "號（不扣今日額度）", "emerald");
  } else {
    state.match.microInspectCountToday = usedToday + 1;
  }
  state.match.microInspectedSeats[dayKey] = true;
  state.match.stats.microInspectsUsed = (state.match.stats.microInspectsUsed || 0) + 1;

  sound.playBlessing();
  spawnBeam(pid, target.id, "#fbbf24", "emote", 720);
  nudgeSeat(target.id, { scale: 1.12, vScale: 0.14 });
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    if (typeof stage3d.jumpToSeatFront === "function") stage3d.jumpToSeatFront(target.id);
    else stage3d.focusSeatCloseUp(target.id);
    if (typeof orchestrator !== "undefined" && typeof orchestrator.schedule === "function") {
      orchestrator.schedule("micro_cam", function () {
        if (typeof stage3d !== "undefined" && stage3d.isActive() && !state.intelSeatId) stage3d.clearCloseUp();
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
    spawnFx(target.id, "神色心虛 " + reading + "%!", "#fb7185");
    spawnBurst(target.id, ["#fb7185", "#fbbf24", "#ffffff"], 18, "spark");
    pinClue(
      target.id,
      "觀微 " + fmtSeatNum(target.id) + "號心虛",
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
      if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    }
    addLog({
      kind: "blessing",
      isPrivate: true,
      title: "靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 神情明顯緊繃閃躲（緊張讀數 " + reading + "%），已存為「呈堂證供」素材！",
      text: ""
    });
    showToast("觀微察覺 " + fmtSeatNum(target.id) + "號神色緊張 (" + reading + "%)！已存入呈堂證供素材！", "emerald");
  } else if (reading <= 38) {
    setSeatEmotion(target.id, "happy", 2800);
    spawnFx(target.id, "氣息沉穩 " + reading + "%", "#34d399");
    spawnBurst(target.id, ["#34d399", "#a7f3d0"], 12, "petal");
    addLog({
      kind: "blessing",
      isPrivate: true,
      title: "靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 目光坦然、呼吸沉穩（緊張讀數 " + reading + "%）。",
      text: ""
    });
    showToast("觀微顯示 " + fmtSeatNum(target.id) + "號神情沉穩自然 (" + reading + "%)。", "emerald");
  } else {
    spawnFx(target.id, "尚稱克制 " + reading + "%", "#fde68a");
    addLog({
      kind: "blessing",
      isPrivate: true,
      title: "靜心觀微：" + fmtSeatNum(target.id) + "號 " + target.name + " 情緒壓抑尚無明顯波瀾（讀數 " + reading + "%），仍需聽後續言行比對。",
      text: ""
    });
    showToast("" + fmtSeatNum(target.id) + "號情緒尚稱克制（讀數 " + reading + "%），可再聽其邏輯。", "amber");
  }

  updateAllUI();
  return true;
}

const PERSONA_TEA_REACTIONS = {
  "小澄": "這杯烏龍焙火剛剛好，謝謝。你的善意我記下了。",
  "暖暖": "哇，茶湯暖進心坎裡了～喝杯好茶、心平氣和推理最舒服了。",
  "阿松": "好茶！像極了山嵐晨霧裡的那口甘泉，多謝關照。",
  "星兒": "哇，茶香裡有好人緣的味道耶～這輪我有認真幫你看局勢喔。",
  "小雲": "收下這盞暖茶了。放心，我看重實據，不會輕易誤傷無辜。",
  "阿竹": "清茗一盞，如沐春風；席間紛擾雖多，仍信君子坦蕩。",
  "晨晨": "夠意思！喝完這杯整個人都精神起來，等等跟緊你的節奏看票。",
  "墨白": "茶色清冽，足見誠意。此情吾記下了，論票時定當公允以待。",
  "晴嵐": "這盞熱茶送得真巧，茶暖心安，待會兒我們細細比對席間線索。",
  "阿朗": "多謝這杯好茶，頭腦更清醒了，等等一起把矛盾點拆開看。",
  "柚子": "好香的暖茶呀～謝謝你請我喝茶，你人真好喔。"
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
  spawnFx(target.id, "暖茶結緣 +6!", "#34d399");
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.triggerSkillFx("witch_heal", pid, target.id, false);
  }
  const reply = PERSONA_TEA_REACTIONS[target.name] || "謝謝你的好茶，心裡暖暖的！";
  setSeatBubble(target.id, reply, "trust", 4200);
  bumpCombo("奉茶結緣");
  addThreeGoodPoint("deeds", "做好事・奉茶結緣");
  if (typeof recordThreeGoodImpact === "function") {
    recordThreeGoodImpact("deeds_tea", "做好事・奉暖茶結緣", "向 " + fmtSeatNum(target.id) + "號" + target.name + "奉上暖茶化解隔閡，增進席間互信", "jade");
  }
  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  }
  addLog({
    kind: "blessing",
    title: "奉茶結緣：你親自端了一盞暖茶給 " + fmtSeatNum(target.id) + "號 " + target.name + "（全場友善度 +6、好感拉近）！",
    text: ""
  });
  showToast("已奉暖茶給 " + fmtSeatNum(target.id) + "號 " + target.name + "！夥伴暖心回禮，點亮做好事進度！", "emerald");
  if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
  updateAllUI();
  return true;
}
