/**
 * 頂部 HUD、階段進度條、新手教學幻燈片、教練提示、角色卡與四給祝福列
 */
"use strict";

// ==================== TUTORIAL ====================
function renderTutorialSlide() {
  const idx = clamp(state.tutorialIndex, 0, TUTORIAL_SLIDES.length - 1);
  state.tutorialIndex = idx;
  const slide = TUTORIAL_SLIDES[idx];

  const dots = el("tutorialDots");
  dots.innerHTML = "";
  for (let i = 0; i < TUTORIAL_SLIDES.length; i++) {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "h-2 rounded-full transition-all " + (i === idx ? "w-7 bg-amber-400" : "w-2 bg-slate-700");
    d.setAttribute("aria-label", "第" + (i + 1) + "頁");
    (function (pIdx) {
      d.addEventListener("click", function () {
        state.tutorialIndex = pIdx;
        renderTutorialSlide();
      });
    })(i);
    dots.appendChild(d);
  }

  el("tutorialSlideBody").innerHTML =
    '<div class="inline-block mx-auto px-3 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold tracking-widest text-amber-300">第 ' + slide.icon + ' 步</div>' +
    '<h4 class="font-serif-craft text-base sm:text-lg font-bold text-white tracking-wide">' + slide.title + '</h4>' +
    '<div>' + slide.html + '</div>';

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
    const cur = spObj ? ("[0" + spObj.id + (spObj.id === getPlayerId() ? " 你" : (" " + spObj.name)) + " 發言中]") : "";
    const rest = state.match.speechQueue.map(function (id) { return id === getPlayerId() ? ("0" + id + "(你)") : ("0" + id + "號"); }).join(" → ");
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

  const phaseMap = {
    LOBBY: { pill: "準備開局", head: "找出 2 名說謊的酸民狼" },
    NIGHT_GUARD: { pill: "護心結界", head: "選 1 位夥伴展開守護結界（可守自己、不可連守）" },
    NIGHT_WOLF: { pill: "第" + m.day + "晚", head: "天黑請閉眼…" },
    NIGHT_SEER: { pill: "明心查證", head: "選 1 位夥伴靜心查證立場！" },
    NIGHT_WITCH: { pill: "滴水奉茶", head: "要端出暖心回甘茶護回夥伴嗎？" },
    HUNTER_TRIGGER: { pill: "正氣共鳴", head: "選 1 人一同離席冷靜！" },
    HUNTER_RESOLVE: {
      pill: "⚖️ 正氣共鳴",
      head: m.lastHunterShot
        ? ("0" + m.lastHunterShot.hunterId + "號 帶走 0" + m.lastHunterShot.targetId + "號 " + m.lastHunterShot.targetName + "！")
        : "直心糾察長正氣共鳴結算"
    },
    SHERIFF_ELECTION: { pill: "上警競選", head: "第一天警長競選（1.5 票＋末置位歸票權）" },
    SHERIFF_ORDER: { pill: "警長指序", head: "請警長決定今日順時針或逆時針輪流發言" },
    DAY_SPEECH: { pill: "第" + m.day + "天輪流發言", head: "依序輪流發言" + (m.speechOrderLabel ? ("（" + m.speechOrderLabel + "）") : "") },
    LAST_WORDS_PLAYER: { pill: "發表遺言", head: "請發表你的離席遺言！" },
    LAST_WORDS_SPEECH: { pill: "遺言播報", head: "倒牌玩家發表遺言中…" },
    DAY_PLAYER_TURN: { pill: "換你出牌", head: (isPkVoteActive() ? "⚔️ 平票 PK 輪到 " : "輪到 ") + playerNumTag() + " 你發言表態！" },
    DAY_VOTE: { pill: isPkVoteActive() ? "平票 PK 決選" : "投票抓狼", head: isPkVoteActive() ? "平票 PK 決選投票！" : "投票請酸民狼出場！" },
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
  const lobbyCount = (el("selectModeCount") && parseInt(el("selectModeCount").value, 10) === 8) ? 8 : 6;
  const seats = state.match.started ? state.match.seats : Array.from({ length: lobbyCount }, function (_, idx) {
    const n = idx + 1;
    return { id: n, name: n === 1 ? "你" : AI_PERSONAS[n - 2].name, alive: true, color: n === 1 ? "#d4a657" : AI_PERSONAS[n - 2].avatarColor };
  });
  const wasHidden = strip.classList.contains("hidden");
  strip.className = (wasHidden ? "hidden " : "") + "grid gap-1.5 " + (seats.length === 8 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-3 sm:grid-cols-6");
  const pid = getPlayerId();
  const p = state.match.phase;
  const pSelf = state.match.started ? getPlayerSeat() : null;
  const canDoubleClickConfirm = Boolean(
    state.match.started && (
      (p === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active)) ||
      (p === "NIGHT_GUARD" && pSelf && pSelf.alive && pSelf.role === "guard") ||
      (p === "NIGHT_SEER" && !state.seerReveal && pSelf && pSelf.alive && pSelf.role === "seer") ||
      (p === "NIGHT_WOLF" && pSelf && pSelf.alive && pSelf.role === "wolf") ||
      (p === "HUNTER_TRIGGER" && pSelf && pSelf.role === "hunter" && !pSelf.alive)
    )
  );
  const isSpecGodView = Boolean(typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());
  const ROLE_SHORT_GOD = { seer: "觀", witch: "茶", hunter: "槍", guard: "守", villager: "民", wolf: "狼" };

  seats.forEach(function (s) {
    const isSelected = state.selectedSeatId === s.id;
    const isSpeaking = state.match.started && (p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id;
    const isSheriff = Boolean(state.match.started && !state.match.sheriffElectionPending && s.alive && state.match.sheriffSeatId === s.id);
    const mark = state.playerMarks[s.id] || null;
    const isWolfMateDisabled = Boolean(state.match.started && p === "NIGHT_WOLF" && pSelf && pSelf.role === "wolf" && s.role === "wolf" && s.id !== pid);
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

    const nameSpan = document.createElement("span");
    nameSpan.className = "seat-pill-name";
    nameSpan.textContent = (isSheriff ? "👑" : "") + s.id + (s.id === pid ? "你" : s.name);
    btn.appendChild(nameSpan);

    const canConfirmThisSeat = Boolean(canDoubleClickConfirm && isSelected && s.alive && (s.id !== pid || p === "NIGHT_GUARD") && !isWolfMateDisabled && !isLastGuardedDisabled && !isPkOutDisabled);
    let badgeText = "";
    let badgeKind = "";
    if (!s.alive) {
      if (isSpecGodView && s.role && ROLE_SHORT_GOD[s.role]) {
        badgeText = ROLE_SHORT_GOD[s.role];
        badgeKind = s.role === "wolf" ? "wolf" : "dead";
      } else if (s.outReason === "同守同救破盾") {
        badgeText = "破";
        badgeKind = "hunter-out";
      } else if (s.outReason === "正氣共鳴請離") {
        badgeText = "槍";
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
    } else if (isSpecGodView && s.role && ROLE_SHORT_GOD[s.role]) {
      badgeText = ROLE_SHORT_GOD[s.role];
      badgeKind = s.role === "wolf" ? "wolf" : "good";
    } else if (isWolfMateDisabled) {
      badgeText = "伴";
      badgeKind = "wolf";
    } else if (isSpeaking) {
      badgeText = "語";
      badgeKind = "speak";
    } else if (mark === "wolf") {
      badgeText = "疑";
      badgeKind = "wolf";
    } else if (mark === "good") {
      badgeText = "信";
      badgeKind = "good";
    }
    if (badgeText) {
      const bdg = document.createElement("span");
      bdg.className = "seat-pill-badge badge-" + badgeKind;
      bdg.textContent = badgeText;
      btn.appendChild(bdg);
    }

    btn.title = s.id + "號 " + (s.id === pid ? "你" : s.name) +
      (canConfirmThisSeat
        ? "（再點一下立即確認）"
        : (s.alive
          ? "（點擊鎖定／檢視情資，快捷鍵 " + s.id + "）"
          : (s.outReason === "正氣共鳴請離" ? "（遭直心糾察長正氣共鳴帶走）" : "（已離席）")));
    btn.addEventListener("click", function () { selectSeat(s.id); });
    strip.appendChild(btn);
  });
}

function renderPlayerRoleCard() {
  const pill = el("playerTeamPill");
  const box = el("playerRoleContent");
  const misLine = el("playerMissionLine");
  if (!state.match.started) {
    pill.textContent = "待抽牌";
    pill.className = "inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold";
    box.textContent = "推薦選「明心觀察員（預言家）」，每晚靜心查證 1 位夥伴！";
    if (misLine) misLine.classList.add("hidden");
    return;
  }

  const p = getPlayerSeat();
  const rDef = ROLE_DEFS[p.role];

  if (state.hidePlayerRole && state.match.phase !== "GAME_OVER") {
    pill.textContent = "已遮蔽";
    pill.className = "inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold";
    box.textContent = "再點「遮蔽」即可顯示底牌";
    if (misLine) misLine.classList.add("hidden");
    return;
  }

  pill.textContent = rDef.icon + " " + rDef.name + (!p.alive ? " (休息)" : "");
  pill.className = "inline-block text-xs px-2.5 py-0.5 rounded-full border font-bold " + rDef.badgeBg;

  let info = rDef.desc;
  if (p.role === "guard") {
    info = state.match.lastGuardTargetId ? ("上晚守：0" + state.match.lastGuardTargetId + "號（今晚不可連守，可守自己）") : rDef.desc;
  } else if (p.role === "seer" && p.checkedHistory.length > 0) {
    info = "已查：" + p.checkedHistory.map(function (c) {
      return c.targetId + "號=" + (c.isWolf ? "狼" : "好人");
    }).join("｜");
  } else if (p.role === "witch") {
    info = "暖心茶:" + (state.match.witchPotions.heal ? "有" : "已奉") + " ｜ 清心茶:" + (state.match.witchPotions.purify ? "有" : "已奉");
  } else if (p.role === "wolf") {
    const mates = state.match.seats.filter(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; });
    if (mates.length > 0) info = "同伴：" + mates.map(function (m) { return m.id + "號" + m.name; }).join("、");
  }
  box.textContent = info;
  if (misLine) {
    const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
    const mis = !classicMode ? (typeof evaluateRoleMission === "function" ? evaluateRoleMission() : state.match.roleMission) : null;
    if (mis) {
      misLine.classList.remove("hidden");
      misLine.textContent = (mis.completed ? "🏅 密令完成：" : "📜 密令「" + mis.title + "」：") + (mis.completed ? (mis.title + " +15") : mis.progressText);
      misLine.className = mis.completed
        ? "text-[9.5px] font-bold text-emerald-300 mt-1 pt-1 border-t border-slate-700/60 truncate"
        : "text-[9.5px] text-amber-300/90 mt-1 pt-1 border-t border-slate-700/60 truncate";
    } else {
      misLine.classList.add("hidden");
    }
  }
}

function renderFourGBlessings() {
  const used = state.match.fourGivingsUsed;
  const pSeat = getPlayerSeat();
  const pAlive = Boolean(pSeat && pSeat.alive);
  const allow = canUseFourGNow();
  const remain = ["confidence", "joy", "hope", "convenience"].filter(function (k) { return !used[k]; }).length;
  el("fourGRemainBadge").textContent = remain + "/4";

  [
    { key: "confidence", btn: "btn4GConfidence", tag: "tag4GConfidence" },
    { key: "joy", btn: "btn4GJoy", tag: "tag4GJoy" },
    { key: "hope", btn: "btn4GHope", tag: "tag4GHope" },
    { key: "convenience", btn: "btn4GConvenience", tag: "tag4GConvenience" }
  ].forEach(function (it) {
    const isUsed = used[it.key];
    el(it.btn).disabled = it.key === "convenience" ? !state.match.started : (isUsed || !allow);
    const defSub = { confidence: "隱密擋1票", joy: "破冰查緊張", hope: "金光二選一", convenience: "理清歸票" };
    if (!pAlive && state.match.started) {
      el(it.tag).textContent = it.key === "convenience" ? "看票型" : "觀戰中";
    } else {
      el(it.tag).textContent = isUsed ? "已用完" : (allow ? defSub[it.key] : "待白天");
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
  if (el("pkLeftName")) el("pkLeftName").textContent = "0" + left.id + "號 " + (left.id === pid ? "你" : left.name);
  if (el("pkRightName")) el("pkRightName").textContent = "0" + right.id + "號 " + (right.id === pid ? "你" : right.name);
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
