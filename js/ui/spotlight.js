/**
 * 聚光燈打字機、發言順序條、互動線索點擊與快速發言提示
 */
"use strict";

function stopTypewriterOnly() {
  if (state.typewriter.timer) {
    clearInterval(state.typewriter.timer);
    state.typewriter.timer = null;
  }
  state.typewriter.active = false;
  const pEl = el("spotlightText");
  if (pEl) pEl.classList.remove("typing-cursor");
}

function clearStepTimer() {
  state.speakingInFlight = false;
  state.activeSpeechAnimUntil = 0;
  stopTypewriterOnly();
  if (typeof orchestrator !== "undefined" && typeof orchestrator.clearTimer === "function") {
    orchestrator.clearTimer("turn_step");
  }
  if (state.stepTimer) {
    clearTimeout(state.stepTimer);
    state.stepTimer = null;
  }
}

function renderSpeakerTurnStrip() {
  const strip = el("speakerTurnStrip");
  if (!strip) return;
  const order = state.match.dayOrder || [];
  if (!order.length || (state.match.phase !== "DAY_SPEECH" && state.match.phase !== "DAY_PLAYER_TURN")) {
    strip.innerHTML = "";
    return;
  }
  const activeId = state.activeSpeakerId;
  const remaining = state.match.speechQueue || [];
  const pid = getPlayerId();
  const isPkOrder = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive());
  const dirTagText = isPkOrder
    ? "PK決選"
    : (state.match.speechDirection === -1 ? "↺逆時針" : "↻順時針");
  const shIdNow = (!state.match.sheriffElectionPending && state.match.sheriffSeatId) ? state.match.sheriffSeatId : null;

  const populateTurnStrip = function (container, onSeatClick) {
    if (!container) return;
    container.innerHTML = "";
    const dirTag = document.createElement("span");
    dirTag.className = "turn-chip opacity-80";
    dirTag.textContent = dirTagText;
    dirTag.title = state.match.speechOrderLabel || dirTagText;
    container.appendChild(dirTag);
    order.forEach(function (sid, idx) {
      const seat = getSeat(sid);
      if (!seat || !seat.alive) return;
      if (idx > 0) {
        const sep = document.createElement("span");
        sep.className = "turn-sep-dot select-none";
        sep.textContent = "·";
        container.appendChild(sep);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      const isCurrent = (sid === activeId);
      const isPending = remaining.indexOf(sid) !== -1;
      const isDone = !isCurrent && !isPending;
      btn.className = "turn-chip cursor-pointer hover:opacity-100" + (isCurrent ? " is-speaking" : (isDone ? " is-done" : ""));
      const shPrefix = (shIdNow === sid) ? "警 " : "";
      const shortName = shPrefix + (sid === pid ? (fmtSeatNum(sid) + " 你") : (fmtSeatNum(sid) + " " + seat.name));
      btn.textContent = isCurrent ? (shortName + " · 言") : shortName;
      btn.title = sid === pid ? "你的座位" : ("點擊查看 " + fmtSeatNum(sid) + "號 情報" + (isDone ? "（今日已發言）" : ""));
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (sid !== pid) onSeatClick(sid);
      });
      container.appendChild(btn);
    });
  };
  populateTurnStrip(strip, openSeatIntel);
  populateTurnStrip(el("playerTurnOrderStrip"), selectSeat);
}

function computeNarrativeHoldMs(speechEv, rawText, voiceMood) {
  const txt = String(rawText || "").trim();
  const isBombshell = Boolean(
    voiceMood === "claim_seer" ||
    voiceMood === "rebut" ||
    voiceMood === "panic" ||
    (speechEv && (speechEv.claimRole || speechEv.checkedWolfId || speechEv.contradiction || speechEv.isInterject)) ||
    /查殺|對跳|我是明心|我是觀察員|我是奉茶|我是守衛|我是糾察|掀席|自爆|起跳|跳明心|拍身分|假觀察員/.test(txt)
  );
  if (isBombshell) return { ms: 950, isBombshell: true };
  const isBriefPass = Boolean(
    txt.length <= 28 &&
    (!speechEv || (!speechEv.claimRole && !speechEv.accuseId && !speechEv.contradiction))
  );
  if (isBriefPass) return { ms: 420, isBombshell: false };
  return { ms: 720, isBombshell: false };
}

function commitPendingSpeechLog(speakerId) {
  if (typeof state === "undefined" || !state.match || !Array.isArray(state.match.logs)) return false;
  let changed = false;
  const def = state.match._deferredSpeechLog;
  if (def && (!speakerId || def.speakerId === speakerId)) {
    state.match._deferredSpeechLog = null;
    if (def.entry && typeof addLog === "function") {
      addLog(def.entry);
      changed = true;
    }
  }
  state.match.logs.forEach(function (item) {
    if (item && item.pendingReveal && (!speakerId || item.speakerId === speakerId)) {
      item.pendingReveal = false;
      changed = true;
    }
  });
  if (state.match._activeSpeechCommit && (!speakerId || state.match._activeSpeechCommit.speakerId === speakerId)) {
    state.match._activeSpeechCommit = null;
  }
  if (changed && typeof renderTimeline === "function") {
    renderTimeline({ deferIfHidden: true });
  }
  return changed;
}

function maybeScheduleAutoAdvanceAfterSpeech() {
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!state.autoPlay && !ff) return;
  if (voice && voice.paused) return;
  if (state.interjectOpen) return;
  const pNow = state.match.phase;
  const isSheriffSpeechAuto = Boolean(
    pNow === "SHERIFF_ELECTION" &&
    state.match.sheriffElectionCtx &&
    state.match.sheriffElectionCtx.stage === "speech" &&
    state.match.sheriffElectionCtx.activeReelSeatId &&
    state.match.sheriffElectionCtx.activeReelSeatId !== getPlayerId()
  );
  if (pNow !== "DAY_SPEECH" && pNow !== "LAST_WORDS_SPEECH" && !isSheriffSpeechAuto) return;
  if (state.speakingInFlight || state.typewriter.active || voice.speaking) return;
  if (state.stepTimer) clearTimeout(state.stepTimer);
  const speedMul = (typeof voice !== "undefined" && typeof voice.getSpeedMultiplier === "function")
    ? Math.max(1.0, voice.getSpeedMultiplier())
    : 1.0;
  const basePauseMs = voice.canSpeak() ? (state.typewriter.narrativeHoldMs ?? 720) : (state.typewriter.holdMs ?? 2400);
  const pauseMs = ff
    ? 260
    : Math.max(voice.canSpeak() ? 260 : 850, Math.round(basePauseMs / speedMul));
  if (!ff && state.typewriter.isBombshellHold && typeof sound !== "undefined" && typeof sound.playSeatFoley === "function") {
    sound.playSeatFoley("cup_set", state.typewriter.speakerId || 0);
  }
  state.stepTimer = setTimeout(function () {
    if (voice && voice.paused) return;
    if (state.match.phase === "LAST_WORDS_SPEECH") advanceLastWordsQueue();
    else if (state.match.phase === "SHERIFF_ELECTION" && typeof advanceSheriffSpeechTurn === "function") advanceSheriffSpeechTurn();
    else advanceSpeechQueue();
  }, pauseMs);
}

function renderSpeakerStanceStrip(speaker, speechEv) {
  const strip = el("speakerStanceStrip");
  if (!strip) return;
  strip.innerHTML = "";
  if (!speaker || !speechEv) {
    strip.classList.add("hidden");
    return;
  }
  const pid = getPlayerId();
  const fmtTag = function (id) {
    const s = getSeat(id);
    const num = typeof fmtSeatNum === "function" ? fmtSeatNum(id) : (id < 10 ? ("0" + id) : String(id));
    return num + (s ? (s.id === pid ? " 你" : (" " + s.name)) : "號");
  };
  const chips = [];
  if (speechEv.claimRole && ROLE_DEFS[speechEv.claimRole]) {
    const iconKeyMap = { seer: "seer", witch: "witch", hunter: "scales", guard: "guard", elder: "elder" };
    chips.push({ cls: "is-role", iconKey: iconKeyMap[speechEv.claimRole] || "spark", tone: "gold", label: "亮・" + ROLE_DEFS[speechEv.claimRole].name, seatId: speaker.id });
  }
  if (speechEv.standWithSeerId && speechEv.standWithSeerId !== speaker.id && speechEv.claimRole !== "seer") {
    chips.push({ cls: "is-good", iconKey: "handshake", tone: "jade", label: "站・" + fmtTag(speechEv.standWithSeerId), seatId: speechEv.standWithSeerId });
  }
  if (speechEv.vouchId && speechEv.vouchId !== speechEv.standWithSeerId) {
    chips.push({ cls: "is-good", iconKey: "check", tone: "jade", label: "保・" + fmtTag(speechEv.vouchId), seatId: speechEv.vouchId });
  }
  if (speechEv.accuseId) {
    chips.push({ cls: "is-wolf", iconKey: "target", tone: "cinnabar", label: "指・" + fmtTag(speechEv.accuseId), seatId: speechEv.accuseId });
  }
  const extraWolves = (Array.isArray(speechEv.wolfPits) ? speechEv.wolfPits : []).filter(function (id) { return id !== speechEv.accuseId; });
  if (extraWolves.length > 0) {
    chips.push({ cls: "is-wolf", iconKey: "wolf", tone: "cinnabar", label: "疑・" + extraWolves.map(fmtTag).join("・"), seatId: extraWolves[0] });
  }
  if (speechEv.contradiction) {
    chips.push({ cls: "is-contra", iconKey: "spark", tone: "gold", label: "破綻・" + (speechEv.contradiction.label || "邏輯矛盾"), seatId: speaker.id });
  }
  if (!chips.length) {
    strip.classList.add("hidden");
    return;
  }
  chips.forEach(function (c) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stance-chip " + c.cls;
    btn.textContent = c.label;
    if (typeof shIcon === "function") {
      btn.innerHTML = shIcon(c.iconKey, c.tone) + "<span>" + escapeHtml(c.label) + "</span>";
    }
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (c.seatId && c.seatId !== pid && typeof openSeatIntel === "function") openSeatIntel(c.seatId);
    });
    strip.appendChild(btn);
  });
  strip.classList.remove("hidden");
}

function renderTargetReactionCard(speaker, speechEv, customOverride) {
  const card = el("spotlightTargetReact");
  const img = el("targetReactImg");
  const badge = el("targetReactBadge");
  const quote = el("targetReactQuote");
  if (!card || !img || !badge || !quote) return;

  let targetSeat = null;
  let kind = null;
  let badgeTxt = "";
  let quoteTxt = "";

  if (customOverride && customOverride.seat) {
    targetSeat = customOverride.seat;
    kind = customOverride.kind || "trust";
    badgeTxt = customOverride.badge || "";
    quoteTxt = customOverride.quote || "";
  } else if (speaker && speechEv) {
    const tid = speechEv.accuseId || speechEv.vouchId || null;
    if (tid && tid !== speaker.id) {
      targetSeat = getSeat(tid);
      if (targetSeat && targetSeat.alive) {
        kind = speechEv.accuseId ? "accuse" : "trust";
        const num = typeof fmtSeatNum === "function" ? fmtSeatNum(targetSeat.id) : (targetSeat.id < 10 ? ("0" + targetSeat.id) : String(targetSeat.id));
        const who = targetSeat.id === getPlayerId() ? (num + " 你") : (num + " " + targetSeat.name);
        if (kind === "accuse") {
          badgeTxt = who + " · 被點名";
          const gaspPool = (typeof PERSONA_VOICE_STYLES !== "undefined" && PERSONA_VOICE_STYLES[targetSeat.name] && PERSONA_VOICE_STYLES[targetSeat.name].reactGasp) || ["等輪到我再把話說清楚！", "先聽完整邏輯再定調吧！"];
          quoteTxt = targetSeat.id === getPlayerId()
            ? "被點進狼坑！記下來等會反駁"
            : ("「" + gaspPool[(targetSeat.id + (state.match ? state.match.day : 1)) % gaspPool.length] + "」");
        } else {
          badgeTxt = who + " · 被力挺";
          const vouchPool = (typeof PERSONA_VOICE_STYLES !== "undefined" && PERSONA_VOICE_STYLES[targetSeat.name] && PERSONA_VOICE_STYLES[targetSeat.name].reactVouch) || ["謝啦！好人一起穩穩盤！"];
          quoteTxt = targetSeat.id === getPlayerId()
            ? "對方把你放進好人坑了！"
            : ("「" + vouchPool[(targetSeat.id + (state.match ? state.match.day : 1)) % vouchPool.length] + "」");
        }
      }
    }
  }

  if (!targetSeat) {
    card.classList.add("hidden");
    card.classList.remove("is-accuse", "is-trust");
    card.onclick = null;
    return;
  }

  const art = typeof getPortraitImageUrl === "function" ? getPortraitImageUrl(targetSeat) : null;
  if (art) {
    img.src = art;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }
  badge.textContent = badgeTxt;
  quote.textContent = quoteTxt;
  card.classList.remove("hidden", "is-accuse", "is-trust");
  card.classList.add(kind === "accuse" ? "is-accuse" : "is-trust");
  card.onclick = function (ev) {
    ev.stopPropagation();
    if (targetSeat.id !== getPlayerId() && typeof openSeatIntel === "function") {
      openSeatIntel(targetSeat.id);
    }
  };
}

function syncSpeakerBannerVisuals(speaker, badge, trait, isTyping) {
  const med = el("speakerSeatMedallion");
  const wave = el("speakerVoiceWave");
  const pill = el("speakerLiveStatePill");
  const hint = el("typewriterStatusHint");
  const nextBtn = el("btnStepNext");
  const banner = el("speakerActiveBanner");
  const stageBox = el("spotlightStageBox");
  const stillTalking = Boolean(isTyping || voice.speaking);
  if (stageBox) {
    const reg = (speaker && typeof getPersonaRegister === "function") ? getPersonaRegister(speaker) : "";
    const isClassical = (reg === "classical" || reg === "guzheng" || reg === "poetic");
    stageBox.classList.toggle("is-classical-speech", isClassical);
    stageBox.style.borderLeftColor = "";
  }
  if (speaker) {
    if (med) {
      med.textContent = fmtSeatNum(speaker.id);
      med.style.borderColor = "";
      med.style.color = "";
    }
    if (banner) {
      banner.style.borderLeftColor = "";
    }
  } else if (med) {
    med.textContent = "序";
    med.style.borderColor = "";
    med.style.color = "";
  }
  const pImg = el("speakerPortraitImg");
  const pCan = el("speakerPortraitCanvas");
  const artUrl = (speaker && typeof getPortraitImageUrl === "function")
    ? getPortraitImageUrl(speaker)
    : ((!speaker && typeof getHostPortraitImageUrl === "function") ? getHostPortraitImageUrl() : null);
  if (pImg && pCan) {
    if (artUrl) {
      const spKeyId = speaker ? speaker.id : "host";
      const switchedSpeaker = Boolean(spKeyId !== state.lastSpeakerPortraitId);
      state.lastSpeakerPortraitId = spKeyId;
      if (pImg.getAttribute("data-art") !== artUrl) {
        pImg.setAttribute("data-art", artUrl);
        pImg.src = artUrl;
      }
      pImg.style.borderColor = "";
      pImg.classList.remove("hidden", "portrait-mood-angry", "portrait-mood-happy", "portrait-mood-shock");
      pImg.classList.toggle("portrait-speaking-glow", stillTalking);
      pImg.classList.toggle("portrait-speaking-breathe", Boolean(speaker && stillTalking));
      if (speaker) {
        const spMood = typeof getSeatEmotion === "function" ? getSeatEmotion(speaker.id) : "neutral";
        const dayEvs = (state.match && state.match.daySpeechEvents) || [];
        const latestSp = dayEvs.length ? dayEvs[dayEvs.length - 1] : null;
        const isSharpAcc = Boolean(latestSp && latestSp.speakerId === speaker.id && latestSp.accuseId);
        const isWarmVch = Boolean(latestSp && latestSp.speakerId === speaker.id && !latestSp.accuseId && latestSp.vouchId);
        if (spMood === "angry" || spMood === "suspect" || isSharpAcc) pImg.classList.add("portrait-mood-angry");
        else if (spMood === "happy" || spMood === "laugh" || isWarmVch) pImg.classList.add("portrait-mood-happy");
        else if (spMood === "shock" || spMood === "nervous") pImg.classList.add("portrait-mood-shock");
      }
      if (switchedSpeaker && pImg.classList) {
        pImg.classList.remove("vn-portrait-enter");
        if (typeof pImg.offsetWidth === "number") void pImg.offsetWidth;
        pImg.classList.add("vn-portrait-enter");
      }
      pCan.classList.add("hidden");
    } else {
      pImg.classList.add("hidden");
      pImg.classList.remove("portrait-speaking-glow");
      pCan.classList.remove("hidden");
    }
  }
  if (wave) {
    wave.classList.toggle("playing", stillTalking);
    wave.classList.toggle("hidden", !stillTalking);
    wave.style.opacity = speaker ? "1" : "0.35";
  }
  if (pill) {
    pill.textContent = (typeof voice !== "undefined" && voice.paused) ? "已暫停" : (isTyping ? "發言中" : (voice.speaking ? "語音中" : "已講畢"));
  }
  if (hint) {
    hint.textContent = isTyping
      ? "點擊對話框看全文，或直接點擊亮色詞蒐證"
      : (voice.speaking
        ? "點擊亮色詞可靜默筆記｜空白鍵或「下一位」推進"
        : "點擊亮色詞可筆記｜空白鍵／Enter 繼續");
  }
  if (nextBtn && (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH")) {
    const isLw = state.match.phase === "LAST_WORDS_SPEECH";
    const isLastOfRound = isLw ? true : ((state.match.speechQueue || []).length === 0);
    const lbl = isTyping ? "顯示全文" : (isLw ? "繼續" : (isLastOfRound ? "進入公投" : "下一位"));
    nextBtn.textContent = lbl;
    nextBtn.className = (!isTyping && !voice.speaking)
      ? "cta-cinnabar py-1.5 px-4 text-[15px] shrink-0 inline-flex items-center"
      : "cta-ink py-1.5 px-3 text-[15px] shrink-0 inline-flex items-center";
  }
  const spProf = (speaker && typeof getPersonaProfile === "function") ? getPersonaProfile(speaker) : null;
  const enrichedTrait = (spProf && speaker && speaker.id !== getPlayerId() && spProf.shortTag)
    ? (spProf.shortTag + "・" + (spProf.registerBadge || trait || ""))
    : trait;
  const cleanBadge = speaker
    ? (String(badge || "").replace(/^\s*0?\d+號\s*[·・]?\s*/, "").trim() || speaker.name)
    : badge;
  updateSpotlightBox(cleanBadge, enrichedTrait);
  const tTagEl = el("spotlightTraitTag");
  if (tTagEl && spProf && speaker && speaker.id !== getPlayerId() && typeof shPrependIcon === "function" && spProf.iconKey) {
    shPrependIcon(tTagEl, spProf.iconKey, spProf.iconTone || "gold");
  }
  renderSpeakerTurnStrip();
  if (typeof indieFlow !== "undefined" && typeof indieFlow.syncAnimatedGuideCues === "function") {
    indieFlow.syncAnimatedGuideCues();
  }
}

function renderInteractiveSpotlightText(rawText, speaker, isPartial) {
  const pEl = el("spotlightText");
  if (!pEl) return;
  const rawStr = String(rawText || "").replace(/^「|」$/g, "");
  const trimmed = isPartial ? rawStr : rawStr.trim();
  const clean = (typeof normalizeSeatRefsInText === "function" && (!isPartial || !/[01十]$/.test(trimmed)))
    ? normalizeSeatRefsInText(trimmed)
    : trimmed;
  if (!clean) {
    pEl.textContent = isPartial ? "「" : "";
    return;
  }
  const toxicWords = TOXIC_PATTERNS.map(function (t) { return t.word; })
    .concat(["亂帶風向", "裝無辜", "別演了", "少裝了", "隨便投", "講廢話", "別吵", "根本在騙", "挑撥"]);
  const uniqueToxic = [];
  toxicWords.forEach(function (w) { if (w && uniqueToxic.indexOf(w) === -1) uniqueToxic.push(w); });
  uniqueToxic.sort(function (a, b) { return b.length - a.length; });
  const roleWords = ["明心觀察員", "觀察員", "滴水奉茶師", "奉茶師", "直心糾察長", "糾察長", "護心守衛", "護心結界", "清心長老", "流言首領", "暖心回甘茶", "清心醒神茶", "預言家", "查殺", "金水", "銀水", "酸民狼", "平安夜"];
  const activeContraRec = (state.match && state.match.activeSpeechContra && speaker && state.match.activeSpeechContra.speakerId === speaker.id)
    ? state.match.activeSpeechContra.contra
    : null;
  const contraTriggers = activeContraRec
    ? ["硬打", "自稱", "假冒", "冒充", "力挺", "洗白", "投出去", "站邊", "護航", "點進狼坑", "明心觀察員", "滴水奉茶師", "直心糾察長", "狼坑"]
    : [];
  const seatNameAlt = ((state.match && Array.isArray(state.match.seats) ? state.match.seats.map(function (s) { return String(s && s.name || "").replace(/[\r\n\t<>]/g, "").trim(); }) : [])
    .concat(["晨晨", "小雲", "阿竹", "柚子", "晴嵐", "阿松", "小澄", "墨白", "暖暖", "星兒", "阿朗", "玩家你", "玩家", "你"]))
    .filter(function (nm, idx, arr) { return nm && arr.indexOf(nm) === idx; })
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); })
    .join("|");
  const combinedPattern = new RegExp(
    "((?:1[0-2]|0?[1-9])號(?:\\s?(?:" + seatNameAlt + "))?|" +
    uniqueToxic.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + "|" +
    roleWords.join("|") + ")",
    "g"
  );

  let html = "「";
  let lastIdx = 0;
  let match;
  const spId = speaker ? speaker.id : 0;
  const caughtMap = (state.match && state.match.caughtSpeechClues) || {};
  let contraEmitted = false;
  const contraKey = activeContraRec ? ((state.match.day || 0) + ":" + spId + ":contra:" + activeContraRec.code) : "";
  const contraCaught = Boolean(contraKey && caughtMap[contraKey]);

  const renderPlainChunk = function (chunk) {
    if (!chunk) return "";
    if (!isPartial && typeof annotateJargonPlainText === "function") {
      return annotateJargonPlainText(chunk);
    }
    return escapeHtml(chunk);
  };

  while ((match = combinedPattern.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      html += renderPlainChunk(clean.slice(lastIdx, match.index));
    }
    const tok = match[0];
    const seatMatch = tok.match(/^(1[0-2]|0?[1-9])號/);
    const isRole = roleWords.indexOf(tok) !== -1;
    const isToxic = uniqueToxic.indexOf(tok) !== -1;
    const clueKey = (state.match.day || 0) + ":" + spId + ":" + tok;
    const isCaught = Boolean(caughtMap[clueKey]);
    const isContraHit = Boolean(
      activeContraRec && !contraEmitted && speaker && speaker.id !== getPlayerId() &&
      ((isRole && activeContraRec.code === "role_clash") || contraTriggers.some(function (w) { return tok.indexOf(w) !== -1; }))
    );

    if (isContraHit) {
      contraEmitted = true;
      html += '<span class="clue-token clue-contradiction' + (contraCaught ? ' clue-caught' : '') + '" data-clue-type="contradiction" data-clue-key="' + escapeHtml(contraKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="發現邏輯破綻：「' + escapeHtml(activeContraRec.label) + '」，點擊收入呈堂證供">' + escapeHtml(tok) + (contraCaught ? ' ·已證' : ' ·破綻') + '</span>';
    } else if (seatMatch) {
      const sid = parseInt(seatMatch[1], 10);
      html += '<span class="clue-token clue-seat" data-clue-type="seat" data-seat-id="' + sid + '" title="點擊查看 ' + fmtSeatNum(sid) + '號情報並鎖定">' + escapeHtml(tok) + '</span>';
    } else if (isToxic && speaker && speaker.id !== getPlayerId()) {
      html += '<span class="clue-token clue-toxic' + (isCaught ? ' clue-caught' : '') + '" data-clue-type="toxic" data-clue-key="' + escapeHtml(clueKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="點擊抓包這句酸言破綻！">' + escapeHtml(tok) + (isCaught ? ' ·已記' : '') + '</span>';
    } else if (isRole) {
      const jRole = (typeof lookupWerewolfJargon === "function") ? lookupWerewolfJargon(tok) : null;
      const jAttr = jRole ? (' data-jargon="' + escapeHtml(jRole.term) + '"') : "";
      html += '<span class="clue-token clue-role' + (isCaught ? ' clue-caught' : '') + '"' + jAttr + ' data-clue-type="role" data-clue-key="' + escapeHtml(clueKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="點擊記錄這項身分線索">' + escapeHtml(tok) + (isCaught ? ' ·已記' : '') + '</span>';
    } else {
      html += renderPlainChunk(tok);
    }
    lastIdx = combinedPattern.lastIndex;
  }
  if (lastIdx < clean.length) {
    const tailSlice = clean.slice(lastIdx);
    html += renderPlainChunk(tailSlice);
  }
  html += isPartial ? "" : "」";
  if (activeContraRec && !contraEmitted && !isPartial && speaker && speaker.id !== getPlayerId()) {
    html += ' <span class="clue-token clue-contradiction ml-1' + (contraCaught ? ' clue-caught' : '') + '" data-clue-type="contradiction" data-clue-key="' + escapeHtml(contraKey) + '" data-clue-word="破綻" data-speaker-id="' + spId + '" title="點擊收入「' + escapeHtml(activeContraRec.label) + '」呈堂證供">收證：' + escapeHtml(activeContraRec.label) + (contraCaught ? ' ·已證' : '') + '</span>';
  }
  pEl.innerHTML = html;
}

function handleSpotlightClueClick(targetEl) {
  sound.unlock();
  const type = targetEl.getAttribute("data-clue-type");
  if (!type) return false;

  if (type === "seat") {
    const sid = parseInt(targetEl.getAttribute("data-seat-id"), 10);
    if (sid && sid !== getPlayerId()) {
      state.selectedSeatId = sid;
      spawnBeam(getPlayerId(), sid, "#38bdf8", "emote");
      openSeatIntel(sid);
      sound.tone(540 + sid * 25, 0.08, "triangle", 0.05, 0);
      return true;
    }
    return true;
  }

  const key = targetEl.getAttribute("data-clue-key");
  const word = targetEl.getAttribute("data-clue-word") || "";
  const spId = parseInt(targetEl.getAttribute("data-speaker-id"), 10);
  const sp = getSeat(spId);
  if (!sp || !state.match.started) return true;

  if (state.match.caughtSpeechClues[key]) {
    showToast("這條線索已經記進你的偵探筆記囉！", "amber");
    return true;
  }
  state.match.caughtSpeechClues[key] = true;
  targetEl.classList.add("clue-caught");
  if (targetEl.textContent.indexOf("·已記") === -1 && targetEl.textContent.indexOf("·已證") === -1) {
    targetEl.textContent = targetEl.textContent.replace(/\s*·破綻$/, "") + (type === "contradiction" ? " ·已證" : " ·已記");
  }

  if (type === "contradiction") {
    const contraRec = (state.match.activeSpeechContra && state.match.activeSpeechContra.speakerId === sp.id)
      ? state.match.activeSpeechContra.contra
      : ((state.match.detectedContradictions || []).slice().reverse().find(function (c) { return c.day === state.match.day && c.speakerId === sp.id; }));
    const labelStr = (contraRec && contraRec.label) || "邏輯矛盾";
    const rebText = (contraRec && contraRec.rebuttalText) || ("我整理了 " + fmtSeatNum(sp.id) + "號" + sp.name + " 前後的邏輯破綻，請大家重點檢視 " + fmtSeatNum(sp.id) + "號！");
    const extraFeast = (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "harmony_feast");
    state.match.stats.contradictionsFound = (state.match.stats.contradictionsFound || 0) + 1;
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + (extraFeast ? 10 : 5), 0, 100);
    const pSelfClue = getPlayerSeat();
    if (!(pSelfClue && pSelfClue.role === "wolf" && sp.role === "wolf")) {
      state.playerMarks[sp.id] = "wolf";
      if (typeof syncDraftPitFromPlayerMark === "function") syncDraftPitFromPlayerMark(sp.id, "wolf");
    }
    spawnFx(sp.id, "抓破" + labelStr, "#fbbf24", { scale: 1.15, durationMs: 1800 });
    spawnBurst(sp.id, ["#fbbf24", "#fde68a", "#ffffff"], 22, "slash");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 380, 0.3);
    nudgeSeat(sp.id, { scale: 0.9, vTilt: 0.24 });
    sound.tone(720, 0.12, "triangle", 0.06, 0);
    pinClue(sp.id, labelStr, rebText, "contradiction");
    addThreeGoodPoint("heart", "存好心抓破矛盾");
    if (typeof recordThreeGoodImpact === "function") {
      recordThreeGoodImpact("heart_clue", "存好心・理性查證", "抓破 " + fmtSeatNum(sp.id) + "號前後「" + labelStr + "」，累積具體事證而非隨意貼標籤", "jade");
    }
    bumpCombo("抓破矛盾" + (extraFeast ? "（茶點×2）" : ""));
    if (extraFeast) bumpCombo("茶點加碼連擊");
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    showToast("已抓破 " + fmtSeatNum(sp.id) + "號「" + labelStr + "」，解鎖「呈堂證供」邏輯反駁卡。", "emerald");
    updateAllUI();
    return true;
  }

  if (type === "toxic") {
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 6, 0, 100);
    const pSelfTox = getPlayerSeat();
    if (!(pSelfTox && pSelfTox.role === "wolf" && sp.role === "wolf")) {
      state.playerMarks[sp.id] = "wolf";
      if (typeof syncDraftPitFromPlayerMark === "function") syncDraftPitFromPlayerMark(sp.id, "wolf");
    }
    spawnFx(sp.id, "淨化酸言 +6", "#fb7185");
    spawnBurst(sp.id, ["#fb7185", "#fbbf24", "#ffffff"], 14, "spark");
    nudgeSeat(sp.id, { scale: 1.1 });
    sound.tone(580, 0.08, "triangle", 0.05, 0);
    pinClue(sp.id, "記下酸言「" + word + "」", "剛才 " + fmtSeatNum(sp.id) + "號" + sp.name + "發言用了挑撥字眼「" + word + "」，大家留意他的動機與立場。", "toxic");
    addThreeGoodPoint("heart", "存好心蒐證");
    if (typeof recordThreeGoodImpact === "function") {
      recordThreeGoodImpact("heart_clue", "存好心・識別酸言", "敏銳記下 " + fmtSeatNum(sp.id) + "號帶風向字眼「" + word + "」，讓席間提升 +6 友善度", "jade");
    }
    bumpCombo("靜默筆記蒐證");
    if (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "anonymous_wall") {
      bumpCombo("匿名牆破綻連擊");
    }
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    showToast("已記下 " + fmtSeatNum(sp.id) + "號的挑撥字眼「" + word + "」，場上友善度提升。", "emerald");
    updateAllUI();
  } else if (type === "role") {
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    spawnFx(sp.id, "紀錄線索：" + word, "#fde68a");
    spawnBurst(sp.id, ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
    nudgeSeat(sp.id, { scale: 1.1 });
    sound.tone(660, 0.09, "triangle", 0.055, 0);
    pinClue(sp.id, fmtSeatNum(sp.id) + "號提到「" + word + "」", "剛才 " + fmtSeatNum(sp.id) + "號" + sp.name + "提到「" + word + "」，請大家比對真偽與邏輯。", "role");
    bumpCombo("線索歸檔");
    if (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "anonymous_wall") {
      bumpCombo("匿名牆線索連擊");
    }
    showToast("已將 " + fmtSeatNum(sp.id) + "號提到的「" + word + "」存入發言筆記。", "amber");
    updateAllUI();
  }
  return true;
}

function completeCurrentTypewriter(scheduleHold) {
  if (!state.typewriter.active && !state.typewriter.fullText) return;
  if (state.typewriter.timer) {
    clearInterval(state.typewriter.timer);
    state.typewriter.timer = null;
  }
  state.typewriter.active = false;
  const sp = getSeat(state.typewriter.speakerId);
  commitPendingSpeechLog(sp ? sp.id : null);
  const pEl = el("spotlightText");
  if (pEl) {
    pEl.classList.remove("typing-cursor");
    renderInteractiveSpotlightText(state.typewriter.fullText, sp);
  }
  const prog = el("spotlightProgressBar");
  if (prog) prog.style.width = "100%";
  const curBadge = el("spotlightSpeakerBadge") ? el("spotlightSpeakerBadge").textContent : "";
  const curTrait = el("spotlightTraitTag") ? el("spotlightTraitTag").textContent : "";
  syncSpeakerBannerVisuals(sp, curBadge, curTrait, false);

  const doneCb = state.typewriter.onDone;
  state.typewriter.onDone = null;
  if (typeof doneCb === "function") doneCb();

  if (scheduleHold) {
    maybeScheduleAutoAdvanceAfterSpeech();
  }
}

function runTypewriterInterval(delayMs, speaker, useRealVoice) {
  const pEl = el("spotlightText");
  const prog = el("spotlightProgressBar");
  if (state.typewriter.timer) {
    clearInterval(state.typewriter.timer);
    state.typewriter.timer = null;
  }
  let spokenCharTick = 0;
  state.typewriter.timer = setInterval(function () {
    if (!state.typewriter.active) return;
    if (typeof voice !== "undefined" && voice.paused) return;
    state.typewriter.pos += 1;
    const slice = state.typewriter.fullText.slice(0, state.typewriter.pos);
    if (pEl) renderInteractiveSpotlightText(slice, speaker, true);
    if (prog && state.typewriter.fullText.length > 0) {
      prog.style.width = Math.min(100, Math.round((state.typewriter.pos / state.typewriter.fullText.length) * 100)) + "%";
    }
    if (!useRealVoice && voice.enabled && speaker) {
      const curCh = slice.charAt(slice.length - 1) || "";
      const nextCh = state.typewriter.fullText.charAt(state.typewriter.pos) || "";
      if (!/^[\s，。！？、；：「」『』（）()—…·・\-~]$/.test(curCh)) {
        spokenCharTick += 1;
        if (spokenCharTick % 2 === 1) {
          const chCode = curCh.charCodeAt(0) || state.typewriter.pos;
          sound.playCozySyllable(speaker.id, chCode, curCh, nextCh);
        }
      }
    }
    if (state.typewriter.pos >= state.typewriter.fullText.length) {
      completeCurrentTypewriter(true);
    }
  }, delayMs);
}

function syncTypewriterToAudioDuration(durationMs) {
  if (!state.typewriter.active || !state.typewriter.fullText) return;
  const remaining = Math.max(1, state.typewriter.fullText.length - state.typewriter.pos);
  const exactDelay = Math.round(clamp((durationMs * 0.94) / remaining, 26, 210));
  const sp = getSeat(state.typewriter.speakerId);
  runTypewriterInterval(exactDelay, sp, true);
}

function startSpotlightTypewriter(opts) {
  stopTypewriterOnly();
  if (state.stepTimer) {
    clearTimeout(state.stepTimer);
    state.stepTimer = null;
  }
  const speaker = opts.speaker || null;
  // Reveal any prior speaker's deferred timeline entry when advancing to a new speaker
  if (state.match && state.match._deferredSpeechLog && (!speaker || state.match._deferredSpeechLog.speakerId !== speaker.id)) {
    commitPendingSpeechLog(state.match._deferredSpeechLog.speakerId);
  }
  if (state.match && Array.isArray(state.match.logs)) {
    let revealedPrior = false;
    state.match.logs.forEach(function (it) {
      if (it && it.pendingReveal && (!speaker || it.speakerId !== speaker.id)) {
        it.pendingReveal = false;
        revealedPrior = true;
      }
    });
    if (revealedPrior && typeof renderTimeline === "function") renderTimeline({ deferIfHidden: true });
  }
  const cleanText = String(opts.rawText || "").replace(/^「|」$/g, "").trim();
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const useRealVoice = ff ? false : voice.canSpeak();

  // v10.3 Instant Calm Reading + v11.0 Silent-Mode Speech Animation Window so 3D lip-sync & persona gestures stay alive even when muted!
  state.typewriter.fullText = cleanText;
  state.typewriter.pos = cleanText.length;
  state.typewriter.active = false;
  state.typewriter.speakerId = speaker ? speaker.id : null;
  state.activeSpeechAnimUntil = (speaker && cleanText.length > 0)
    ? (performance.now() + clamp(cleanText.length * 68, 2400, 6400))
    : 0;
  const narHold = computeNarrativeHoldMs(opts.speechEv || null, cleanText, opts.voiceMood || "normal");
  state.typewriter.holdMs = ff ? 280 : (opts.holdMs ?? 2450);
  state.typewriter.narrativeHoldMs = narHold.ms;
  state.typewriter.isBombshellHold = narHold.isBombshell;
  state.typewriter.onDone = null;

  if (typeof renderSpeakerStanceStrip === "function") {
    renderSpeakerStanceStrip(speaker, opts.speechEv || null);
  }
  if (typeof renderTargetReactionCard === "function") {
    renderTargetReactionCard(speaker, opts.speechEv || null);
  }

  const pEl = el("spotlightText");
  if (pEl) {
    pEl.classList.remove("typing-cursor", "spotlight-fade-in");
    renderInteractiveSpotlightText(cleanText, speaker, false);
    pEl.scrollTop = 0;
    if (typeof pEl.offsetWidth === "number") void pEl.offsetWidth;
    pEl.classList.add("spotlight-fade-in");
  }
  const prog = el("spotlightProgressBar");
  if (prog) prog.style.width = "100%";
  const spotBox = el("spotlightStageBox");
  if (spotBox) {
    spotBox.classList.toggle("is-last-words-spotlight", Boolean(state.match && state.match.phase === "LAST_WORDS_SPEECH"));
  }
  syncSpeakerBannerVisuals(speaker, opts.badge, opts.trait, false);

  if (typeof opts.onDone === "function") {
    opts.onDone();
  }

  if (useRealVoice) {
    voice.speakCharacter(speaker, cleanText, opts.voiceMood || "normal", function () {
      const curSp = getSeat(state.typewriter.speakerId);
      commitPendingSpeechLog(curSp ? curSp.id : null);
      const bTxt = el("spotlightSpeakerBadge") ? el("spotlightSpeakerBadge").textContent : "";
      const tTxt = el("spotlightTraitTag") ? el("spotlightTraitTag").textContent : "";
      syncSpeakerBannerVisuals(curSp, bTxt, tTxt, false);
      maybeScheduleAutoAdvanceAfterSpeech();
    }, { onAudioReady: opts.onAudioReady });
  } else {
    if (typeof opts.onAudioReady === "function") opts.onAudioReady(0);
    commitPendingSpeechLog(speaker ? speaker.id : null);
    maybeScheduleAutoAdvanceAfterSpeech();
  }
}

function refreshSpeechCharCounter() {
  const counterEl = el("speechCharCounter");
  if (!counterEl) return;
  const limit = typeof getActiveSpeechCharLimit === "function" ? getActiveSpeechCharLimit() : 0;
  if (!limit || limit <= 0) {
    counterEl.classList.add("hidden");
    counterEl.classList.remove("is-over");
    return;
  }
  const qIn = el("quickFreeInput");
  const curLen = qIn ? String(qIn.value || "").trim().length : 0;
  counterEl.textContent = curLen + " / " + limit;
  counterEl.title = "當前模式發言上限 " + limit + " 字（超出送出時將自動精簡）";
  counterEl.classList.remove("hidden");
  counterEl.classList.toggle("is-over", curLen > limit);
}

function refreshQuickFreeInputHint() {
  const qIn = el("quickFreeInput");
  const rwBtn = el("btnQuickInlineRewrite");
  refreshSpeechCharCounter();
  if (!qIn || !rwBtn) return;
  const val = qIn.value.trim();
  const tray = el("rephraseChoicesTray");
  if (!val) {
    rwBtn.classList.add("hidden");
    if (tray) tray.classList.add("hidden");
    return;
  }
  const res = analyzeThreeGoodSpeech(val);
  rwBtn.classList.toggle("hidden", !res.isToxic);
  if (res.isToxic && typeof renderRephraseChoicesTray === "function") {
    renderRephraseChoicesTray(val);
  } else if (tray && !state.rephraseTrayPinned) {
    tray.classList.add("hidden");
  }
  if (typeof indieFlow !== "undefined" && typeof indieFlow.syncAnimatedGuideCues === "function") {
    indieFlow.syncAnimatedGuideCues();
  }
}

function updateSpotlightBox(badge, trait, text, counterText) {
  const bEl = el("spotlightSpeakerBadge");
  const tEl = el("spotlightTraitTag");
  const pEl = el("spotlightText");
  const cEl = el("spotlightTurnCounter");
  if (bEl && badge !== undefined) bEl.textContent = badge || "系統播報";
  if (tEl && trait !== undefined) tEl.textContent = trait || "";
  if (pEl && text !== undefined) pEl.textContent = text || "";
  if (cEl && counterText !== undefined) cEl.textContent = counterText;
}
