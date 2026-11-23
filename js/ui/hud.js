/**
 * 頂部 HUD、階段進度條、新手教學幻燈片、教練提示、角色卡與四給祝福列
 */
"use strict";

// ==================== TUTORIAL ====================
function renderTutorialSlide() {
  const idx = clamp(state.tutorialIndex, 0, TUTORIAL_SLIDES.length - 1);
  state.tutorialIndex = idx;
  const slide = TUTORIAL_SLIDES[idx];

  const counterEl = el("tutorialStepCounter");
  if (counterEl) {
    counterEl.textContent = (idx + 1) + " / " + TUTORIAL_SLIDES.length;
  }

  const tabsEl = el("tutorialStepTabs");
  if (tabsEl) {
    tabsEl.innerHTML = "";
    TUTORIAL_SLIDES.forEach(function (sl, tIdx) {
      const tb = document.createElement("button");
      tb.type = "button";
      tb.className = "tut-step-tab" + (tIdx === idx ? " is-active" : "");
      tb.textContent = sl.icon + " " + (sl.tab || ("第" + (tIdx + 1) + "章"));
      tb.addEventListener("click", function () {
        if (typeof sound !== "undefined" && typeof sound.tone === "function") sound.tone(520, 0.05, "triangle", 0.035, 0);
        state.tutorialIndex = tIdx;
        renderTutorialSlide();
      });
      tabsEl.appendChild(tb);
    });
  }

  const dots = el("tutorialDots");
  dots.innerHTML = "";
  for (let i = 0; i < TUTORIAL_SLIDES.length; i++) {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "h-2 rounded-full transition-all " + (i === idx ? "w-6 bg-amber-400" : "w-2 bg-slate-700");
    d.setAttribute("aria-label", "第" + (i + 1) + "章");
    (function (pIdx) {
      d.addEventListener("click", function () {
        state.tutorialIndex = pIdx;
        renderTutorialSlide();
      });
    })(i);
    dots.appendChild(d);
  }

  const bodyEl = el("tutorialSlideBody");
  bodyEl.innerHTML =
    '<div class="inline-block mx-auto px-3 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold tracking-widest text-amber-300">第 ' + slide.icon + ' 章 · ' + escapeHtml(slide.tab || "") + '</div>' +
    '<h4 class="font-serif-craft text-base sm:text-lg font-bold text-white tracking-wide">' + slide.title + '</h4>' +
    '<div>' + slide.html + '</div>';
  if (bodyEl.parentElement && typeof bodyEl.parentElement.scrollTop === "number") {
    bodyEl.parentElement.scrollTop = 0;
  }

  el("btnTutPrev").disabled = idx === 0;
  el("btnTutPrev").className = "cta-ink px-3 py-1.5 text-xs transition " + (
    idx === 0 ? "opacity-30 pointer-events-none" : ""
  );

  const isLast = idx === TUTORIAL_SLIDES.length - 1;
  el("btnTutNext").classList.toggle("hidden", isLast);
  el("btnLaunchGuidedDemo").classList.toggle("hidden", !isLast);
}

// ==================== UI RENDERING ====================
function updatePhaseTrackUI() {
  const p = state.match.phase;
  const stepMap = {
    NIGHT_GUARD: 1, NIGHT_WOLF: 1, NIGHT_SEER: 1, NIGHT_WITCH: 1,
    SHERIFF_ELECTION: 2, SHERIFF_ORDER: 2, DAY_SPEECH: 2,
    DAY_PLAYER_TURN: 3,
    DAY_VOTE: 4, DAY_VOTE_RESULT: 4, HUNTER_TRIGGER: 4, HUNTER_RESOLVE: 4
  };
  const activeIdx = state.match.started ? (stepMap[p] || 0) : 0;
  for (let i = 1; i <= 4; i++) {
    const pill = el("stepTrack" + i);
    if (pill) pill.classList.toggle("is-current", i === activeIdx);
  }

  const shell = el("mainStageShell");
  if (shell) {
    shell.classList.remove("your-turn-ring", "vote-turn-ring");
    if (p === "DAY_PLAYER_TURN") shell.classList.add("your-turn-ring");
    else if (p === "DAY_VOTE") shell.classList.add("vote-turn-ring");
  }

  const qHint = el("queueOrderHint");
  const cEl = el("spotlightTurnCounter");
  if (p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN") {
    const spObj = getSeat(state.activeSpeakerId);
    const cur = spObj ? ("[" + fmtSeatNum(spObj.id) + (spObj.id === getPlayerId() ? " 你" : (" " + spObj.name)) + " 發言中]") : "";
    const rest = state.match.speechQueue.map(function (id) { return id === getPlayerId() ? (fmtSeatNum(id) + "(你)") : (fmtSeatNum(id) + "號"); }).join(" → ");
    const summary = cur + (rest ? (" → 接著：" + rest) : " → 準備投票");
    if (qHint) qHint.textContent = summary;
    if (cEl) cEl.textContent = rest ? ("下一順位：" + rest) : "本輪最後一位發言";
    renderSpeakerTurnStrip();
    if (p === "DAY_PLAYER_TURN") {
      updateSpotlightBox(playerNumTag() + " 你（你的回合）", "請選擇下方卡牌送出", "輪到你發言了！點選下方卡牌即可對全場表態。", summary);
    }
  } else if (p === "DAY_VOTE") {
    if (qHint) qHint.textContent = "全員同時投票";
    if (cEl) cEl.textContent = "請點上方圓桌座位鎖定選票";
    updateSpotlightBox("公投抓狼階段", "第 " + state.match.day + " 天", "請點擊上方圓桌選一個最可疑的人，再按下方「確認投票」！", "全員同時投票");
  } else {
    if (qHint) qHint.textContent = "";
    if (cEl) cEl.textContent = "";
  }
}

function updateAllUI() {
  const m = state.match;
  syncWorldTheme();
  updatePhaseTrackUI();

  el("harmonyBar").style.width = m.harmonyScore + "%";
  const auraTag = m.started ? (m.harmonyScore >= 85 ? " 🍃" : (m.harmonyScore <= 48 ? " 🌫" : "")) : "";
  el("harmonyText").textContent = String(m.harmonyScore) + auraTag;
  const tg = m.threeGood || { heart: 0, words: 0, deeds: 0 };
  if (el("tgHeartPill")) el("tgHeartPill").textContent = (tg.heart > 0 ? "✦" : "") + "存好心 " + tg.heart;
  if (el("tgWordsPill")) el("tgWordsPill").textContent = (tg.words > 0 ? "✦" : "") + "說好話 " + tg.words;
  if (el("tgDeedsPill")) el("tgDeedsPill").textContent = (tg.deeds > 0 ? "✦" : "") + "做好事 " + tg.deeds + (m.goodwillVoteBonus ? "・🌟+1票" : "");

  const extLlmOn = Boolean(typeof isExternalLlmActive === "function" ? isExternalLlmActive() : (state.geminiApiKey || state.localLlmModel));
  el("aiModeDot").className = state.localLlmModel
    ? "w-2 h-2 rounded-full bg-sky-400"
    : (state.geminiApiKey ? "w-2 h-2 rounded-full bg-indigo-400" : "w-2 h-2 rounded-full bg-emerald-400");
  let modelShort = "內建AI";
  if (state.localLlmModel) {
    modelShort = "本地 " + String(state.localLlmModel).split(":")[0];
  } else if (state.geminiApiKey) {
    const gm = state.geminiModel || "gemini-3.8-flash";
    if (gm === "gemini-4-argon") modelShort = "4 Argon";
    else if (gm === "gemini-3.8-flash") modelShort = "3.8 Flash";
    else if (gm === "gemini-3.1-pro-preview") modelShort = "3.1 Pro";
    else if (gm === "gemini-3.6-flash") modelShort = "3.6 Flash";
    else if (gm === "gemini-2.5-pro") modelShort = "2.5 Pro";
    else if (gm === "gemini-2.5-flash") modelShort = "2.5 Flash";
    else modelShort = "Gemini";
  }
  el("aiModeLabel").textContent = extLlmOn ? modelShort : "內建AI";

  const lobbyWolfN = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
  const pForHead = m.started ? getPlayerSeat() : null;
  const isWolfHead = Boolean(pForHead && pForHead.role === "wolf");
  const phaseMap = {
    LOBBY: { pill: "準備開局", head: "找出 " + lobbyWolfN + " 名說謊的酸民狼" },
    NIGHT_GUARD: { pill: "護心結界", head: "選 1 位夥伴展開守護結界（可守自己、不可連守）" },
    NIGHT_WOLF: { pill: "第" + m.day + "晚", head: isWolfHead ? "酸民狼密議：鎖定好人目標並下達明日戰術" : "天黑請閉眼…" },
    NIGHT_SEER: { pill: "明心查證", head: "選 1 位夥伴靜心查證立場！" },
    NIGHT_WITCH: { pill: "滴水奉茶", head: "要端出暖心回甘茶護回夥伴嗎？" },
    HUNTER_TRIGGER: { pill: (pForHead && pForHead.isWolfKing) ? "流言反撲" : "正氣共鳴", head: (pForHead && pForHead.isWolfKing) ? "選 1 位好人一同離席！" : "選 1 人一同離席冷靜！" },
    HUNTER_RESOLVE: {
      pill: "⚖️ 正氣共鳴",
      head: m.lastHunterShot
        ? (fmtSeatNum(m.lastHunterShot.hunterId) + "號 帶走 " + fmtSeatNum(m.lastHunterShot.targetId) + "號 " + m.lastHunterShot.targetName + "！")
        : "直心糾察長正氣共鳴結算"
    },
    SHERIFF_ELECTION: { pill: "上警競選", head: "第一天警長競選（1.5 票＋末置位歸票權）" },
    SHERIFF_ORDER: { pill: "警長指序", head: "請警長決定今日順時針或逆時針輪流發言" },
    DAY_SPEECH: { pill: "第" + m.day + "天輪流發言", head: "依序輪流發言" + (m.speechOrderLabel ? ("（" + m.speechOrderLabel + "）") : "") },
    LAST_WORDS_PLAYER: { pill: "發表遺言", head: "請發表你的離席遺言！" },
    LAST_WORDS_SPEECH: { pill: "遺言播報", head: "倒牌玩家發表遺言中…" },
    DAY_PLAYER_TURN: { pill: "換你出牌", head: (isPkVoteActive() ? "⚔️ 平票 PK 輪到 " : "輪到 ") + playerNumTag() + " 你發言表態！" },
    DAY_VOTE: { pill: isPkVoteActive() ? "平票 PK 決選" : (isWolfHead ? "投票帶節奏" : "投票抓狼"), head: isPkVoteActive() ? "平票 PK 決選投票！" : (isWolfHead ? "投票推抗推位（避開狼隊同伴）！" : "投票請酸民狼出場！") },
    DAY_VOTE_RESULT: { pill: "開票揭曉", head: "公投開票結果揭曉" },
    SHERIFF_TRANSFER: { pill: "警徽交接", head: "請選擇接棒警長或撕毀警徽" },
    GAME_OVER: { pill: "結束", head: m.winner === "early_end" ? "提前結束・揭曉底牌" : (m.winner === "good" ? "好人勝利！" : "酸民狼勝利！") }
  };

  const info = phaseMap[m.phase] || phaseMap.LOBBY;
  el("phaseBadge").textContent = info.pill;
  el("bannerHeadline").textContent = info.head;

  const nightMode = isNightPhase(m.phase);
  el("skyIcon").textContent = "";
  el("roundTitle").textContent = m.started
    ? ("在場 " + getAliveSeats().length + "/" + m.totalSeats)
    : "圓桌舞台（1號是你）";
  const shellNode = el("mainStageShell");
  if (shellNode) {
    shellNode.classList.toggle("mist-glow", nightMode);
    shellNode.classList.toggle("lantern-glow", !nightMode);
  }
  el("canvasCard").className = "relative overflow-hidden";

  renderComboBadge();
  const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
  const dirPill = el("directorEventPill");
  if (dirPill) {
    const dev = (!classicMode && m.started && m.phase !== "GAME_OVER") ? m.activeDirectorEvent : null;
    dirPill.classList.toggle("hidden", !dev);
    if (dev) {
      dirPill.textContent = "🍵 " + dev.shortTitle;
      dirPill.title = dev.title + "：" + dev.desc;
    }
  }
  renderSeatStrip();
  renderPlayerRoleCard();
  renderFourGBlessings();
  if (typeof renderBeginnerCoachBanner === "function") renderBeginnerCoachBanner();
  if (typeof renderPkDuelBanner === "function") renderPkDuelBanner(null);
  if (typeof renderDirectorEventChoiceBar === "function") renderDirectorEventChoiceBar();
  renderControlPanels();
  renderSeatIntelPopover();
  if (typeof indieFlow !== "undefined") indieFlow.syncBodyScreenState();
}

function renderSeatStrip() {
  const strip = el("seatButtonStrip");
  if (!strip) return;
  strip.innerHTML = "";
  const lobbyCount = typeof getLobbySeatCount === "function" ? getLobbySeatCount() : ((el("selectModeCount") && parseInt(el("selectModeCount").value, 10)) || 8);
  const seats = state.match.started ? state.match.seats : Array.from({ length: lobbyCount }, function (_, idx) {
    const n = idx + 1;
    const pInfo = n === 1 ? null : (AI_PERSONAS[n - 2] || AI_PERSONAS[0]);
    return { id: n, name: n === 1 ? "你" : pInfo.name, alive: true, color: n === 1 ? "#d4a657" : pInfo.avatarColor };
  });
  const wasHidden = strip.classList.contains("hidden");
  const gridCols = seats.length >= 10
    ? "grid-cols-4 sm:grid-cols-6"
    : (seats.length === 8 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-3 sm:grid-cols-6");
  strip.className = (wasHidden ? "hidden " : "") + "grid gap-1.5 " + gridCols;
  const pid = getPlayerId();
  const p = state.match.phase;
  const pSelf = state.match.started ? getPlayerSeat() : null;
  const canDoubleClickConfirm = Boolean(
    state.match.started && (
      (p === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active)) ||
      (p === "NIGHT_GUARD" && pSelf && pSelf.alive && pSelf.role === "guard") ||
      (p === "NIGHT_SEER" && !state.seerReveal && pSelf && pSelf.alive && pSelf.role === "seer") ||
      (p === "NIGHT_WOLF" && pSelf && pSelf.alive && pSelf.role === "wolf") ||
      (p === "HUNTER_TRIGGER" && pSelf && canSeatTriggerShot(pSelf) && !pSelf.alive)
    )
  );
  const isSpecGodView = Boolean(typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());
  const ROLE_SHORT_GOD = { seer: "觀", witch: "茶", hunter: "槍", guard: "守", villager: "民", elder: "長", wolf: "狼", wolf_king: "王" };

  seats.forEach(function (s) {
    const isSelected = state.selectedSeatId === s.id;
    const shSpeechActive = Boolean(p === "SHERIFF_ELECTION" && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech" && state.match.sheriffElectionCtx.activeReelSeatId === s.id);
    const isSpeaking = state.match.started && ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id || shSpeechActive);
    const isSheriff = Boolean(state.match.started && !state.match.sheriffElectionPending && s.alive && state.match.sheriffSeatId === s.id);
    const bfActiveHud = (state.match.started && state.match.sheriffBadgeFlow) ? state.match.sheriffBadgeFlow : ((p === "NIGHT_SEER" && pSelf && pSelf.role === "seer" && state.match.sheriffBadgeFlowsBySeat) ? state.match.sheriffBadgeFlowsBySeat[pid] : null);
    const bfSlotTag = (bfActiveHud && s.alive) ? (bfActiveHud.firstTargetId === s.id ? "警1" : (bfActiveHud.secondTargetId === s.id ? "警2" : "")) : "";
    const mark = state.playerMarks[s.id] || null;
    const isWolfPlayerStrip = Boolean(state.match.started && pSelf && pSelf.role === "wolf" && !state.hidePlayerRole);
    const isWolfMateSeat = Boolean(isWolfPlayerStrip && s.role === "wolf" && s.id !== pid);
    const isWolfMateDisabled = Boolean(state.match.started && ((p === "NIGHT_WOLF" && pSelf && pSelf.role === "wolf") || (p === "HUNTER_TRIGGER" && pSelf && pSelf.isWolfKing)) && s.role === "wolf" && s.id !== pid);
    const wolfGodMarkTag = (isWolfPlayerStrip && !isWolfMateSeat && state.match.wolfGodMarks && state.match.wolfGodMarks[s.id] && typeof getWolfGodMarkDef === "function")
      ? getWolfGodMarkDef(state.match.wolfGodMarks[s.id]).label
      : "";
    const isLastGuardedDisabled = Boolean(state.match.started && p === "NIGHT_GUARD" && pSelf && pSelf.role === "guard" && state.match.lastGuardTargetId === s.id);
    const isPkOutDisabled = Boolean(state.match.started && p === "DAY_VOTE" && typeof isValidVoteTarget === "function" && !isValidVoteTarget(s.id));

    const btn = document.createElement("button");
    btn.type = "button";
    const cls = ["seat-pill-btn"];
    if (!s.alive) cls.push("is-dead");
    else if (isSelected) cls.push("seat-is-selected");
    else if (isSpeaking) cls.push("is-speaking");
    else if (mark === "wolf") cls.push("is-mark-wolf");
    else if (mark === "good") cls.push("is-mark-good");
    if (s.alive && (isWolfMateDisabled || isLastGuardedDisabled || isPkOutDisabled || (canDoubleClickConfirm && s.id === pid && p !== "DAY_PLAYER_TURN" && p !== "NIGHT_GUARD"))) {
      cls.push("is-disabled-target");
    }
    btn.className = cls.join(" ");
    if (s.alive && s.color && !isSelected) {
      btn.style.borderLeftColor = s.color;
    }

    const artUrl = (typeof getPortraitImageUrl === "function") ? getPortraitImageUrl(s) : null;
    if (artUrl) {
      const av = document.createElement("img");
      av.src = artUrl;
      av.alt = "";
      av.className = "seat-pill-avatar";
      if (s.color) av.style.borderColor = s.color;
      av.onerror = function () { av.style.display = "none"; };
      btn.appendChild(av);
    } else {
      const numDot = document.createElement("span");
      numDot.className = "seat-pill-num";
      numDot.textContent = String(s.id);
      if (s.color) numDot.style.borderColor = s.color;
      btn.appendChild(numDot);
    }

    const shortTagSeat = (s.id !== pid && typeof getPersonaShortTag === "function") ? getPersonaShortTag(s) : "";
    const nameSpan = document.createElement("span");
    nameSpan.className = "seat-pill-name";
    nameSpan.textContent = (isSheriff ? "👑" : "") + s.id + (s.id === pid ? "你" : s.name);
    btn.appendChild(nameSpan);

    const canConfirmThisSeat = Boolean(canDoubleClickConfirm && isSelected && s.alive && (s.id !== pid || p === "NIGHT_GUARD") && !isWolfMateDisabled && !isLastGuardedDisabled && !isPkOutDisabled);
    let badgeText = "";
    let badgeKind = "";
    const effRoleGod = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(s) : s.role;
    if (!s.alive) {
      if (isSpecGodView && effRoleGod && ROLE_SHORT_GOD[effRoleGod]) {
        badgeText = ROLE_SHORT_GOD[effRoleGod];
        badgeKind = s.role === "wolf" ? "wolf" : "dead";
      } else if (s.outReason === "同守同救破盾") {
        badgeText = "破";
        badgeKind = "hunter-out";
      } else if (s.outReason === "正氣共鳴請離") {
        badgeText = "槍";
        badgeKind = "hunter-out";
      } else if (s.outReason === "流言反撲請離") {
        badgeText = "反";
        badgeKind = "hunter-out";
      } else {
        badgeText = "離";
        badgeKind = "dead";
      }
    } else if (canConfirmThisSeat) {
      badgeText = "再點";
      badgeKind = "confirm";
    } else if (isLastGuardedDisabled) {
      badgeText = "禁守";
      badgeKind = "wolf";
    } else if (s.isElder && s.voteDisabled) {
      badgeText = "免票";
      badgeKind = "good";
    } else if (isSpecGodView && effRoleGod && ROLE_SHORT_GOD[effRoleGod]) {
      badgeText = ROLE_SHORT_GOD[effRoleGod];
      badgeKind = s.role === "wolf" ? "wolf" : "good";
    } else if (isWolfMateDisabled || isWolfMateSeat) {
      badgeText = "伴";
      badgeKind = "wolf";
    } else if (isSpeaking) {
      badgeText = "語";
      badgeKind = "speak";
    } else if (bfSlotTag && (p === "NIGHT_SEER" || (!mark && !isWolfMateSeat))) {
      badgeText = bfSlotTag;
      badgeKind = "flow";
    } else if (mark === "wolf") {
      badgeText = isWolfPlayerStrip ? "甩" : "疑";
      badgeKind = "wolf";
    } else if (mark === "good") {
      badgeText = isWolfPlayerStrip ? "保" : "信";
      badgeKind = "good";
    }
    if (badgeText) {
      const bdg = document.createElement("span");
      bdg.className = "seat-pill-badge badge-" + badgeKind;
      bdg.textContent = badgeText;
      btn.appendChild(bdg);
    }

    btn.title = s.id + "號 " + (s.id === pid ? "你" : s.name) +
      (isWolfMateSeat ? "（🐺 狼隊同伴）" : (wolfGodMarkTag ? ("（🔍 獵神：" + wolfGodMarkTag + "）") : "")) +
      (canConfirmThisSeat
        ? "（再點一下立即確認）"
        : (s.alive
          ? ((s.isElder && s.voteDisabled) ? "（已亮牌清心長老・無投票權）" : ("（點擊跳到他面前檢視／鎖定，快捷鍵 " + s.id + "）"))
          : (s.outReason === "正氣共鳴請離"
            ? "（遭直心糾察長正氣共鳴帶走・點擊查看）"
            : (s.outReason === "流言反撲請離" ? "（遭流言首領最後帶風向帶走・點擊查看）" : "（已離席・點擊查看）"))));
    btn.addEventListener("click", function () { selectSeat(s.id); });
    strip.appendChild(btn);
  });
}

function getLiveRoleActionHint(p, effKey, phase) {
  if (!p) return "";
  if (!p.alive) {
    if (phase === "HUNTER_TRIGGER" && typeof canSeatTriggerShot === "function" && canSeatTriggerShot(p)) {
      return p.isWolfKing ? "點選 1 位好人發動最後反撲" : "點選 1 位可疑者發動正氣共鳴";
    }
    if (phase === "LAST_WORDS_PLAYER") return "發表離席遺言，留下關鍵線索";
    return p.role === "wolf" ? "席外觀戰・下方可猜全場神職" : "席外觀戰・下方可猜酸民狼";
  }
  if (phase === "NIGHT_SEER" && effKey === "seer") return "今夜點 1 席靜心查證真偽";
  if (phase === "NIGHT_WITCH" && effKey === "witch") return "決定端暖心茶護回，或清心茶請離";
  if (phase === "NIGHT_GUARD" && effKey === "guard") return "選 1 席展開結界（勿連守同人）";
  if (phase === "NIGHT_WOLF" && p.role === "wolf") return "鎖定目標並下達明日狼隊戰術";
  if (phase === "SHERIFF_ELECTION") {
    return effKey === "seer"
      ? "建議上警競選，搶 1.5 票與歸票權"
      : (p.role === "wolf" ? "可上警悍跳搶警徽，或警下觀察" : "聆聽候選人發言，決定上警或投票");
  }
  if (phase === "DAY_PLAYER_TURN") {
    if (effKey === "seer") return "可點「亮觀察員報驗」公開查證紀錄";
    if (effKey === "witch") return "低調聽盤，或適時亮奉茶師作證";
    if (effKey === "guard") return "建議低調防刀，危急時再報守衛線";
    if (effKey === "hunter") return "穩健歸票；遭針對可亮糾察長威懾";
    if (effKey === "elder") return p.elderShieldUsed ? "雖無投票權但公信最高，帶領歸票" : "善用豁免盾替神職扛壓、多保好人";
    if (effKey === "wolf_king") return "用佈局板甩鍋／獵神，被投可反撲";
    if (effKey === "wolf") return "用佈局板甩鍋並記獵神（勿點同伴）";
    return "好人坑不限人數，多保好夥伴並鎖狼";
  }
  if (phase === "DAY_VOTE") {
    if (effKey === "elder" && p.voteDisabled) return "長老豁免已觸發（本局靜候開票）";
    if (p.role === "wolf") return p.isWolfKing ? "帶節奏避開同伴；被投出可反撲" : "配合狼隊投好人，切勿投同伴";
    return state.match.goodwillVoteBonus ? "黃金善意票 +1 生效，投出關鍵票" : "點選最可疑座位公投（可用四給卡）";
  }
  if (phase === "DAY_SPEECH") {
    if (p.role === "wolf") return "聽發言找真神職，點頭像記假保／甩鍋";
    return "聽發言按認同／存疑，適時觀微或奉茶";
  }
  return "靜心觀察局勢，準備下一階段";
}

function getThreeGoodGuidanceSummary(isWolfPlayer) {
  const tg = (state.match && state.match.threeGood) || { heart: 0, words: 0, deeds: 0, resonanceTriggered: false };
  if (tg.resonanceTriggered) {
    return {
      text: isWolfPlayer ? "三好偽裝圓滿・戒心已降" : "三好圓滿・黃金善意票 +1",
      litCount: 3,
      awakened: true
    };
  }
  const missing = [];
  if (tg.heart < 1) missing.push("存好心");
  if (tg.words < 1) missing.push("說好話");
  if (tg.deeds < 1) missing.push("做好事");
  const litCount = 3 - missing.length;
  return {
    text: "三好 " + litCount + "/3 · 缺" + missing[0],
    litCount: litCount,
    awakened: false
  };
}

function buildLiveAvailableTools(p, phase) {
  const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
  const isAlive = Boolean(p && p.alive);
  const isDayToolPhase = (phase === "DAY_SPEECH" || phase === "DAY_PLAYER_TURN" || phase === "DAY_VOTE");
  const mMax = typeof getMicroInspectMaxToday === "function" ? getMicroInspectMaxToday() : 1;
  const mUsed = (state.match && state.match.microInspectCountToday) || 0;
  const mRem = classicMode ? 0 : Math.max(0, mMax - mUsed);
  const teaRem = classicMode ? 0 : ((state.match && state.match.teaServedDay === state.match.day) ? 0 : 1);
  const used4G = (state.match && state.match.fourGivingsUsed) || {};
  const fgRem = ["confidence", "joy", "hope", "convenience"].filter(function (k) { return !used4G[k]; }).length;
  const fgReadyNow = Boolean(typeof canUseFourGNow === "function" ? canUseFourGNow() : false);
  const isWolf = Boolean(p && p.role === "wolf");

  const items = [];
  if (!classicMode) {
    items.push({
      key: "micro",
      shortPill: "🔍 心虛" + mRem,
      name: "🔍 看心虛（觀微察色）",
      remain: mRem,
      canUseNow: Boolean(isAlive && isDayToolPhase && mRem > 0),
      statusText: !isAlive ? "觀戰停用" : (mRem <= 0 ? "今日已用完" : (isDayToolPhase ? ("可用 " + mRem + " 次") : "白天可用")),
      desc: "點發言列「🔍 看心虛」或點任意座位，揭露對方此刻緊張值判斷真假。"
    });
    items.push({
      key: "tea",
      shortPill: "🍵 暖茶" + teaRem,
      name: "🍵 奉暖茶拉好感（做好事）",
      remain: teaRem,
      canUseNow: Boolean(isAlive && isDayToolPhase && teaRem > 0),
      statusText: !isAlive ? "觀戰停用" : (teaRem <= 0 ? "今日已奉茶" : (isDayToolPhase ? "可用 1 次" : "白天可用")),
      desc: "點任意角色頭像→按「🍵 奉暖茶」，降低對方對你的懷疑並點亮「做好事」瓣。"
    });
  }
  const unused4GNames = [];
  if (!used4G.confidence) unused4GNames.push("給信心(擋1票)");
  if (!used4G.joy) unused4GNames.push("給歡喜(查2人緊張)");
  if (!used4G.hope) unused4GNames.push("給希望(2選1藏狼)");
  if (!used4G.convenience) unused4GNames.push("給方便(連線歸票)");
  items.push({
    key: "fourg",
    shortPill: "✨ 四給" + fgRem,
    name: "✨ 四給錦囊（右下角 4 張主動卡）",
    remain: fgRem,
    canUseNow: Boolean(isAlive && fgReadyNow && fgRem > 0),
    statusText: !isAlive ? "觀戰可看票型" : (fgRem <= 0 ? "本局已全用" : (fgReadyNow ? ("此刻可用 " + fgRem + " 張") : "白天發言/投票可用")),
    desc: unused4GNames.length > 0
      ? ("尚未出牌：" + unused4GNames.join("、") + "。" + (isWolf ? "（狼人也可打牌偽裝累積信任！）" : ""))
      : "四張錦囊已全部圓滿施展！"
  });
  return { classicMode: classicMode, isAlive: isAlive, isDayToolPhase: isDayToolPhase, mRem: mRem, teaRem: teaRem, fgRem: fgRem, fgReadyNow: fgReadyNow, items: items };
}

function renderBeginnerCoachBanner() {
  const box = el("beginnerCoachBanner");
  const txt = el("beginnerCoachText");
  if (!box || !txt) return;
  const m = state.match;
  if (!m || !m.started || !m.guidedBeginner || m.phase === "GAME_OVER" || m.day > 2) {
    box.classList.add("hidden");
    return;
  }
  const p = m.phase;
  let guideText = "";
  if (p === "NIGHT_SEER") {
    guideText = state.seerReveal
      ? "🧭 新手小老師 (1/4 記住結果)：太棒了！記住你剛查到的身分（左下角也會幫你記），按「記住了・繼續」等天亮！"
      : "🧭 新手小老師 (1/4 晚上查驗)：天黑囉！點上方任意 1 位同學頭像，再按「確認查證」，就能偷偷知道他是不是酸民狼！";
  } else if (p === "DAY_SPEECH") {
    guideText = "🧭 新手小老師 (2/4 白天聽話)：大家會輪流發言！覺得像好人按「👍 認同」、覺得怪怪的按「🤨 存疑」，按「下一位 →」或空白鍵繼續聽！";
  } else if (p === "DAY_PLAYER_TURN") {
    guideText = "🧭 新手小老師 (3/4 輪到你講)：不用自己打字！直接點下方「🔮 亮觀察員報驗」或任一張「預設發言卡」，就會自動幫你講出來！";
  } else if (p === "DAY_VOTE") {
    guideText = "🧭 新手小老師 (4/4 公投抓狼)：大家講完要投票囉！點上方最可疑的頭像，再按「確認投票」，票數最多的人會離席！";
  } else if (p === "DAY_VOTE_RESULT") {
    guideText = "🧭 新手小老師（完成第一輪！）：看懂怎麼玩了吧！按「進入夜晚」開始第 2 輪，隨時點左下「❓ 能做什麼」都能看提示！";
  } else if (p === "NIGHT_WOLF" || p === "NIGHT_WITCH" || p === "NIGHT_GUARD") {
    guideText = "🧭 新手小老師：天黑了，其他角色正在悄悄行動，馬上就輪到你！";
  }
  if (!guideText) {
    box.classList.add("hidden");
    return;
  }
  txt.textContent = guideText;
  box.classList.remove("hidden");
}

function renderLiveToolkitStrip(p) {
  const strip = el("liveToolkitStrip");
  if (!strip) return;
  if (!state.match || !state.match.started || state.match.phase === "GAME_OVER" || !p || !p.alive || state.hidePlayerRole) {
    strip.classList.add("hidden");
    strip.innerHTML = "";
    return;
  }
  const tk = buildLiveAvailableTools(p, state.match.phase);
  const icoSearch = typeof shIcon === "function" ? shIcon("search", "gold") : "";
  const icoTea = typeof shIcon === "function" ? shIcon("witch", "jade") : "";
  const icoSpark = typeof shIcon === "function" ? shIcon("spark", "gold") : "";
  const pills = [];
  if (!tk.classicMode) {
    pills.push('<span class="toolkit-pill ' + (tk.mRem > 0 && tk.isDayToolPhase ? "is-ready" : (tk.mRem > 0 ? "is-standby" : "is-spent")) + '">' + icoSearch + "心虛" + tk.mRem + "</span>");
    pills.push('<span class="toolkit-pill ' + (tk.teaRem > 0 && tk.isDayToolPhase ? "is-ready" : (tk.teaRem > 0 ? "is-standby" : "is-spent")) + '">' + icoTea + "暖茶" + tk.teaRem + "</span>");
  }
  pills.push('<span class="toolkit-pill ' + (tk.fgRem > 0 && tk.fgReadyNow ? "is-ready" : (tk.fgRem > 0 ? "is-standby" : "is-spent")) + '">' + icoSpark + "四給" + tk.fgRem + "</span>");
  strip.innerHTML = pills.join("");
  strip.classList.remove("hidden");
}

function openRoleGuidePopover(mode) {
  const pop = el("roleGuidePopover");
  const titleEl = el("roleGuideTitle");
  const badgeEl = el("roleGuideBadge");
  const bodyEl = el("roleGuideBody");
  if (!pop || !bodyEl || !state.match || !state.match.started) return;

  const p = getPlayerSeat();
  if (!p) return;
  const viewMode = mode === "threegood" ? "threegood" : "role";
  const isRoleMasked = Boolean(state.hidePlayerRole && state.match.phase !== "GAME_OVER");
  if (viewMode === "role" && isRoleMasked) {
    pop.classList.add("hidden");
    showToast("底牌已遮蔽！先點「顯示」再開啟本職能玩法指南。", "warn");
    return;
  }
  if (!pop.classList.contains("hidden") && pop.getAttribute("data-guide-mode") === viewMode) {
    pop.classList.add("hidden");
    return;
  }
  pop.setAttribute("data-guide-mode", viewMode);

  const effKey = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(p) : p.role;
  const rDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(p) : null) || ROLE_DEFS[p.role];
  const guide = (typeof ROLE_GUIDES !== "undefined" && ROLE_GUIDES[effKey]) ? ROLE_GUIDES[effKey] : ROLE_GUIDES.villager;
  const isWolf = p.role === "wolf";

  if (viewMode === "threegood") {
    const tg = state.match.threeGood || { heart: 0, words: 0, deeds: 0, resonanceTriggered: false };
    const fgUsed = state.match.fourGivingsUsed || {};
    const fgUsedCount = ["confidence", "joy", "hope", "convenience"].filter(function (k) { return fgUsed[k]; }).length;
    if (titleEl) titleEl.textContent = "🪷 三好蓮花 × 四給修為手札";
    if (badgeEl) {
      badgeEl.textContent = tg.resonanceTriggered ? "三瓣全亮・已覺醒" : ("進度 " + ((tg.heart > 0 ? 1 : 0) + (tg.words > 0 ? 1 : 0) + (tg.deeds > 0 ? 1 : 0)) + "/3");
      badgeEl.className = "text-[10px] px-1.5 py-0.5 rounded shrink-0 border " + (tg.resonanceTriggered ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/50" : "bg-amber-500/20 text-amber-200 border-amber-400/35");
    }
    const rowHtml = function (ok, icon, name, count, how) {
      return '<div class="role-guide-row ' + (ok ? "is-lit" : "") + '">' +
        '<div class="font-bold ' + (ok ? "text-emerald-300" : "text-amber-200") + '">' + escapeHtml((ok ? "✅ " : "○ ") + icon + " " + name + "（已修 " + count + " 次）") + "</div>" +
        '<div class="text-[10.5px] opacity-90">' + escapeHtml(how) + "</div>" +
        "</div>";
    };
    const rewardText = isRoleMasked
      ? "三瓣全亮獎勵：解鎖本陣營三好蓮花覺醒加成（取消底牌遮蔽即可檢視詳細效果）！"
      : (isWolf
        ? "三瓣全亮獎勵：觸發「深水三好光環」，全場好人對你的懷疑度大幅下降且心虛值平息！"
        : "三瓣全亮獎勵：獲得「🌟 黃金善意票（公投 +1 票權重）」，並感化 1 位好夥伴與你同步聚焦！");
    const synText = state.match.fourGSynergyTriggered
      ? "✅ 「雙四給連心」已觸發（友善度 +8 並自動點亮 1 瓣蓮花）！"
      : ("🌸 雙四給連心：已用 " + fgUsedCount + "/2 張四給手牌（累積 2 張額外友善 +8 並自動點亮 1 瓣！）");
    bodyEl.innerHTML =
      rowHtml(tg.heart > 0, "💛", "存好心", tg.heart, "夜間查證、理性點出邏輯矛盾、打「存好心」卡牌或「給希望」。") +
      rowHtml(tg.words > 0, "💚", "說好話", tg.words, "溫和陳詞、用「AI 轉好話 ×1.5 暴擊」、按「說好話化解」或打「給歡喜」。") +
      rowHtml(tg.deeds > 0, "💙", "做好事", tg.deeds, "白天「奉暖茶」、奉茶師救人、守衛守護、或打「給信心／給方便」。") +
      '<div class="role-guide-reward">' + escapeHtml(rewardText) + "</div>" +
      '<div class="text-[10.5px] text-amber-200/90 pt-0.5">' + escapeHtml(synText) + "</div>";
  } else {
    if (titleEl) titleEl.textContent = guide.icon + " " + rDef.name + "・指南";
    if (badgeEl) {
      badgeEl.textContent = guide.shortRole;
      badgeEl.className = "text-[10px] px-1.5 py-0.5 rounded shrink-0 border " + (isWolf ? "bg-rose-500/25 text-rose-200 border-rose-400/45" : "bg-emerald-500/20 text-emerald-200 border-emerald-400/40");
    }
    const nowHint = getLiveRoleActionHint(p, effKey, state.match.phase);
    const tk = buildLiveAvailableTools(p, state.match.phase);
    const toolsHtml = tk.items.map(function (it) {
      const stCls = it.canUseNow ? "is-ready" : "is-muted";
      return '<div class="guide-tool-item ' + stCls + '">' +
        '<div class="flex items-center justify-between gap-1.5">' +
          '<span class="font-bold text-amber-100">' + escapeHtml(it.name) + "</span>" +
          '<span class="guide-tool-status ' + stCls + '">' + escapeHtml(it.statusText) + "</span>" +
        "</div>" +
        '<div class="text-[10px] opacity-85 mt-0.5">' + escapeHtml(it.desc) + "</div>" +
      "</div>";
    }).join("");
    const classicModeGuide = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
    const misGuide = !classicModeGuide ? (typeof evaluateRoleMission === "function" ? evaluateRoleMission() : state.match.roleMission) : null;
    const misGuideHtml = misGuide
      ? ('<div class="role-guide-row ' + (misGuide.completed ? "is-lit" : "") + '"><span class="font-bold text-amber-200">' + (misGuide.completed ? "✅ 密令達成：" : "🎋 本局密令：") + '</span>' + escapeHtml(misGuide.title + "（" + misGuide.progressText + "）") + "</div>")
      : "";
    bodyEl.innerHTML =
      '<div class="guide-now-box"><div class="text-[10px] font-bold text-amber-300/90">⚡ 現在這一步</div><div class="font-bold text-amber-50 mt-0.5">' + escapeHtml(nowHint) + "</div></div>" +
      misGuideHtml +
      '<div class="space-y-1"><div class="text-[10px] font-bold text-slate-300">🎒 你目前手上的道具與按鈕</div>' + toolsHtml + "</div>" +
      '<div class="pt-1 border-t border-slate-700/60 space-y-1">' +
        '<div class="role-guide-row"><span class="font-bold text-amber-200">🎯 勝利目標：</span>' + escapeHtml(guide.winCond) + "</div>" +
        '<div class="role-guide-row"><span class="font-bold text-indigo-300">🌙 夜晚職能：</span>' + escapeHtml(guide.nightAction) + "</div>" +
        '<div class="role-guide-row"><span class="font-bold text-emerald-300">☀️ 白天職能：</span>' + escapeHtml(guide.dayAction) + "</div>" +
        '<div class="role-guide-reward"><span class="font-bold">🌸 三好心法：</span>' + escapeHtml(guide.threeGoodTip) + "</div>" +
      "</div>";
  }
  pop.classList.remove("hidden");
}

function closeRoleGuidePopover() {
  const pop = el("roleGuidePopover");
  if (pop) pop.classList.add("hidden");
}

function renderPlayerRoleCard() {
  const tile = el("cornerRoleTile");
  const pill = el("playerTeamPill");
  const box = el("playerRoleContent");
  const actHint = el("playerRoleActionHint");
  const tgLine = el("threeGoodGuidanceLine");
  const misLine = el("playerMissionLine");
  const roleThemeClasses = ["role-theme-seer", "role-theme-witch", "role-theme-hunter", "role-theme-guard", "role-theme-elder", "role-theme-villager", "role-theme-wolf", "role-theme-wolf_king"];
  if (tile) {
    roleThemeClasses.forEach(function (c) { tile.classList.remove(c); });
  }
  if (!state.match.started) {
    pill.textContent = "待抽牌";
    pill.className = "role-nameplate";
    box.textContent = "推薦選「明心觀察員」，每晚靜心查證 1 位夥伴";
    if (actHint) actHint.textContent = "";
    if (tgLine) tgLine.textContent = "";
    if (misLine) misLine.classList.add("hidden");
    renderLiveToolkitStrip(null);
    return;
  }

  const p = getPlayerSeat();
  const effKey = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(p) : p.role;
  const rDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(p) : null) || ROLE_DEFS[p.role];
  const guide = (typeof ROLE_GUIDES !== "undefined" && ROLE_GUIDES[effKey]) ? ROLE_GUIDES[effKey] : { icon: "", themeClass: "role-theme-villager" };

  if (state.hidePlayerRole && state.match.phase !== "GAME_OVER") {
    pill.textContent = "底牌已遮蔽";
    pill.className = "role-nameplate is-masked";
    box.textContent = "再點「遮蔽」即可顯示底牌";
    if (actHint) actHint.textContent = "";
    if (tgLine) tgLine.textContent = "";
    if (misLine) misLine.classList.add("hidden");
    renderLiveToolkitStrip(null);
    return;
  }

  if (tile && guide.themeClass) tile.classList.add(guide.themeClass);
  pill.textContent = rDef.name + (!p.alive ? " (離席)" : "");
  pill.className = "role-nameplate " + (p.role === "wolf" ? "is-wolf" : "is-good");
  if (typeof shPrependIcon === "function") {
    const rkMap = { seer: "seer", witch: "witch", hunter: "scales", guard: "guard", elder: "elder", villager: "villager", wolf: "wolf", wolf_king: "crown" };
    shPrependIcon(pill, rkMap[effKey] || "spark", p.role === "wolf" ? "cinnabar" : "gold");
  }

  let info = rDef.desc;
  if (effKey === "guard") {
    info = state.match.lastGuardTargetId
      ? ("上晚守 " + fmtSeatNum(state.match.lastGuardTargetId) + "號・今晚禁連守")
      : "護心結界就緒・可守 1 席（防破盾）";
  } else if (effKey === "seer") {
    info = p.checkedHistory.length > 0
      ? ("查驗：" + p.checkedHistory.map(function (c) { return c.targetId + "號=" + (c.isWolf ? "狼" : "好"); }).join("｜"))
      : "尚未查驗・每晚靜心查證 1 位夥伴";
  } else if (effKey === "witch") {
    const sv = p.savedSeatId ? ("｜銀水:" + p.savedSeatId + "號") : "";
    info = "暖心茶:" + (state.match.witchPotions.heal ? "有" : "已奉") + "｜清心茶:" + (state.match.witchPotions.purify ? "有" : "已奉") + sv;
  } else if (effKey === "hunter") {
    info = "正氣共鳴就緒・離席可帶走 1 席";
  } else if (effKey === "elder") {
    info = p.elderShieldUsed
      ? "豁免已觸發（無投票權・保留發言）"
      : "護盾未觸發・首次公投誤投免離席";
  } else if (p.role === "wolf") {
    const mates = state.match.seats.filter(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; });
    const mateTxt = mates.length > 0 ? ("同伴：" + mates.map(function (m) { return m.id + "號" + m.name + (m.alive ? "" : "(離)"); }).join("、")) : "獨狼作戰";
    info = p.isWolfKing ? ("狼王反撲就緒｜" + mateTxt) : mateTxt;
  } else {
    const gCnt = Object.keys(state.playerMarks || {}).filter(function (k) { return state.playerMarks[k] === "good"; }).length;
    const wCnt = Object.keys(state.playerMarks || {}).filter(function (k) { return state.playerMarks[k] === "wolf"; }).length;
    info = "好人推理位・已標 " + gCnt + " 好人 / " + wCnt + " 存疑";
  }
  box.textContent = info;

  if (actHint) {
    actHint.textContent = getLiveRoleActionHint(p, effKey, state.match.phase);
  }
  renderLiveToolkitStrip(p);
  if (tgLine) {
    const tgSum = getThreeGoodGuidanceSummary(p.role === "wolf");
    tgLine.textContent = tgSum.text;
    tgLine.className = "three-good-guide-line truncate" + (tgSum.awakened ? " is-awakened" : "");
  }
  if (misLine) {
    const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
    const mis = !classicMode ? (typeof evaluateRoleMission === "function" ? evaluateRoleMission() : state.match.roleMission) : null;
    if (mis) {
      misLine.classList.remove("hidden");
      misLine.textContent = (mis.completed ? "密令達成・" : "密令・") + mis.title + (mis.completed ? " (+15)" : ("（" + mis.progressText + "）"));
      misLine.className = "role-mission-line truncate" + (mis.completed ? " is-done" : "");
      if (typeof shPrependIcon === "function") {
        shPrependIcon(misLine, mis.completed ? "trophy" : "bamboo", mis.completed ? "jade" : "gold");
      }
    } else {
      misLine.classList.add("hidden");
    }
  }
}

function renderFourGBlessings() {
  const used = state.match.fourGivingsUsed;
  const pSeat = getPlayerSeat();
  const pAlive = Boolean(pSeat && pSeat.alive);
  const isWolf = Boolean(pSeat && pSeat.role === "wolf");
  const allow = canUseFourGNow();
  const usedCount = ["confidence", "joy", "hope", "convenience"].filter(function (k) { return used[k]; }).length;
  const remain = 4 - usedCount;
  el("fourGRemainBadge").textContent = remain + "/4";

  const deck = el("cornerFourGDeck");
  const synHint = el("fourGSynergyHint");
  const deckHead = el("fourGDeckHeader");
  const synReady = Boolean(allow && !state.match.fourGSynergyTriggered && usedCount === 1 && remain > 0);
  if (deck) deck.classList.toggle("is-synergy-ready", synReady);
  if (synHint) synHint.classList.toggle("hidden", !synReady);
  const defaultHeadText = remain > 0
    ? ("✨ 四給錦囊 · " + remain + "/4 ▴")
    : "✨ 四給錦囊 · 已全用";
  if (deckHead) {
    deckHead.setAttribute("data-default-text", defaultHeadText);
    if (!deckHead.classList.contains("is-previewing")) {
      deckHead.textContent = defaultHeadText;
    }
  }

  const shortExplain = {
    confidence: isWolf ? "給信心：幫好人隱密擋 1 票來博取好感！" : "給信心：替選定夥伴隱密擋 1 票（不洩漏陣營）！",
    joy: "給歡喜：全場笑場破冰，點出 2 位最緊張的人！",
    hope: "給希望：金色雙光柱鎖定 2 人，其中必藏 1 狼！",
    convenience: "給方便：點亮全場關係線，號召搖擺票集中檢視！"
  };

  const goodTips = {
    confidence: "【給信心・做好事】替選定夥伴隱密擋 1 票，好夥伴還會暗中信任並跟投（開票前不洩漏陣營）！",
    joy: "【給歡喜・說好話】幽默破冰帶動全場笑容，同時揭露 2 位神色僵硬的緊張對象比對脈搏！",
    hope: "【給希望・存好心】金色雙光柱鎖定 2 人其中必藏 1 狼，與給歡喜重疊可觸發雙光交會！",
    convenience: "【給方便・做好事】展開全場關係連線，並號召搖擺好人集中檢視你鎖定的對象！"
  };
  const wolfTips = {
    confidence: "【給信心・深水演技】幫好人擋 1 票拉攏信任與三好修為，讓好人對你放下戒心！",
    joy: "【給歡喜・破冰洗白】用幽默笑話帶動氣氛，累積「說好話」瓣邁向深水信任光環！",
    hope: "【給希望・帶偏節奏】雙光柱鎖定場上另 1 狼與 1 好人，可借機順勢推坑好人！",
    convenience: "【給方便・引導歸票】點亮關係連線，引導搖擺好人集中檢視你指定的甩鍋對象！"
  };

  [
    { key: "confidence", btn: "btn4GConfidence", tag: "tag4GConfidence" },
    { key: "joy", btn: "btn4GJoy", tag: "tag4GJoy" },
    { key: "hope", btn: "btn4GHope", tag: "tag4GHope" },
    { key: "convenience", btn: "btn4GConvenience", tag: "tag4GConvenience" }
  ].forEach(function (it) {
    const isUsed = used[it.key];
    const btnEl = el(it.btn);
    btnEl.disabled = it.key === "convenience" ? !state.match.started : (isUsed || !allow);
    btnEl.title = isWolf ? wolfTips[it.key] : goodTips[it.key];
    btnEl.setAttribute("data-fg-explain", isUsed ? ("已使用（本局每張限 1 次）") : shortExplain[it.key]);
    btnEl.classList.toggle("is-spent", Boolean(isUsed));
    const defSub = {
      confidence: isWolf ? "假保擋1票" : "替人擋1票",
      joy: "查2人緊張",
      hope: "2選1必藏狼",
      convenience: "連線助歸票"
    };
    if (!pAlive && state.match.started) {
      el(it.tag).textContent = it.key === "convenience" ? "看票型" : "觀戰中";
    } else {
      el(it.tag).textContent = isUsed ? "已使用" : (allow ? defSub[it.key] : "待白天");
    }
  });
}

function syncPkPortrait(imgEl, seat) {
  if (!imgEl) return;
  const url = (seat && typeof getPortraitImageUrl === "function") ? getPortraitImageUrl(seat) : "";
  if (url) {
    imgEl.onerror = function () {
      imgEl.classList.add("hidden");
      if (typeof imgEl.removeAttribute === "function") {
        imgEl.removeAttribute("data-art");
        imgEl.removeAttribute("src");
      }
    };
    if (imgEl.getAttribute("data-art") !== url) {
      imgEl.setAttribute("data-art", url);
      imgEl.src = url;
    }
    imgEl.style.borderColor = (seat && seat.color) ? seat.color : "";
    imgEl.classList.remove("hidden");
  } else {
    imgEl.classList.add("hidden");
    if (typeof imgEl.removeAttribute === "function") {
      imgEl.removeAttribute("data-art");
      imgEl.removeAttribute("src");
    } else {
      imgEl.src = "";
    }
  }
}

function renderPkDuelBanner(liveCounts) {
  const banner = el("pkDuelBanner");
  if (!banner) return;
  const m = state.match;
  const cands = (m && m.started && Array.isArray(m.pkCandidates))
    ? m.pkCandidates.map(getSeat).filter(function (s) { return s && s.alive; })
    : [];
  const activePh = m && (
    m.phase === "DAY_SPEECH" ||
    m.phase === "DAY_PLAYER_TURN" ||
    m.phase === "DAY_VOTE" ||
    (state.voteFlight && state.voteFlight.active)
  );
  if (cands.length < 2 || !activePh) {
    banner.classList.add("hidden");
    banner.setAttribute("aria-hidden", "true");
    return;
  }
  const left = cands[0];
  const right = cands[1];
  const pid = getPlayerId();
  syncPkPortrait(el("pkLeftImg"), left);
  syncPkPortrait(el("pkRightImg"), right);
  if (el("pkLeftName")) el("pkLeftName").textContent = fmtSeatNum(left.id) + "號 " + (left.id === pid ? "你" : left.name);
  if (el("pkRightName")) el("pkRightName").textContent = fmtSeatNum(right.id) + "號 " + (right.id === pid ? "你" : right.name);
  const lv = liveCounts ? (liveCounts[left.id] || 0) : null;
  const rv = liveCounts ? (liveCounts[right.id] || 0) : null;
  if (el("pkLeftVotes")) el("pkLeftVotes").textContent = lv !== null ? ("即時 " + lv + " 票") : (state.activeSpeakerId === left.id ? "🎙 正在拉票" : "PK 對決台");
  if (el("pkRightVotes")) el("pkRightVotes").textContent = rv !== null ? ("即時 " + rv + " 票") : (state.activeSpeakerId === right.id ? "🎙 正在拉票" : "PK 對決台");
  if (el("pkDuelMidLabel")) el("pkDuelMidLabel").textContent = cands.length > 2 ? ("VS (" + cands.length + "席)") : "VS";
  banner.classList.remove("hidden");
  banner.setAttribute("aria-hidden", "false");
}

function renderDirectorEventChoiceBar() {
  const bar = el("directorEventChoiceBar");
  if (!bar) return;
  if (typeof orchestrator === "undefined" || typeof orchestrator.canUseDirectorEventAction !== "function" || !orchestrator.canUseDirectorEventAction()) {
    bar.classList.add("hidden");
    bar.innerHTML = "";
    return;
  }
  const ev = state.match.activeDirectorEvent;
  bar.innerHTML = "";
  bar.classList.remove("hidden");

  const label = document.createElement("span");
  label.className = "text-[11px] font-bold text-emerald-200 truncate";
  label.textContent = "🍵 " + ev.shortTitle + "：" + ev.badge;
  bar.appendChild(label);

  const btnGroup = document.createElement("div");
  btnGroup.className = "flex items-center gap-1.5 shrink-0";
  const choices = ev.id === "truth_lantern"
    ? [{ key: "front", text: "🏮 照前半席" }, { key: "back", text: "🏮 照後半席" }]
    : (ev.id === "boba_truce"
      ? [{ key: "boba", text: "🍵 請選中者喝冬瓜青 (+8)" }]
      : [{ key: "cheer", text: "🔔 響應茶會 (+10)" }]);

  choices.forEach(function (ch) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cta-celadon py-1 px-2.5 text-[10px]";
    btn.textContent = ch.text;
    btn.addEventListener("click", function () {
      orchestrator.triggerDirectorEventChoice(ch.key);
    });
    btnGroup.appendChild(btn);
  });
  bar.appendChild(btnGroup);
}
