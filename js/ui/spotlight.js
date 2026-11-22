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
    ? "⚔️PK"
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
        const arrow = document.createElement("span");
        arrow.className = "text-[9px] opacity-40 select-none";
        arrow.textContent = "→";
        container.appendChild(arrow);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      const isCurrent = (sid === activeId);
      const isPending = remaining.indexOf(sid) !== -1;
      const isDone = !isCurrent && !isPending;
      btn.className = "turn-chip cursor-pointer hover:opacity-100" + (isCurrent ? " is-speaking" : (isDone ? " is-done" : ""));
      const shPrefix = (shIdNow === sid) ? "👑" : "";
      const shortName = shPrefix + (sid === pid ? ("0" + sid + " 你") : ("0" + sid + " " + seat.name));
      btn.textContent = isCurrent ? (shortName + " 發言中") : (isDone ? (shortName + " 已講") : shortName);
      btn.title = sid === pid ? "你的座位" : ("點擊查看 0" + sid + "號 情報");
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

function maybeScheduleAutoAdvanceAfterSpeech() {
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!state.autoPlay && !ff) return;
  if (state.match.phase !== "DAY_SPEECH" && state.match.phase !== "LAST_WORDS_SPEECH") return;
  if (state.typewriter.active || voice.speaking) return;
  if (state.stepTimer) clearTimeout(state.stepTimer);
  const pauseMs = ff ? 260 : (voice.canSpeak() ? 950 : (state.typewriter.holdMs || 2400));
  state.stepTimer = setTimeout(function () {
    if (state.match.phase === "LAST_WORDS_SPEECH") advanceLastWordsQueue();
    else advanceSpeechQueue();
  }, pauseMs);
}

function syncSpeakerBannerVisuals(speaker, badge, trait, isTyping) {
  const med = el("speakerSeatMedallion");
  const wave = el("speakerVoiceWave");
  const pill = el("speakerLiveStatePill");
  const hint = el("typewriterStatusHint");
  const nextBtn = el("btnStepNext");
  const banner = el("speakerActiveBanner");
  const stillTalking = Boolean(isTyping || voice.speaking);
  if (speaker) {
    if (med) {
      med.textContent = "0" + speaker.id;
      med.style.borderColor = speaker.color || "#d4a657";
      med.style.color = speaker.color || "#d4a657";
    }
    if (banner) {
      banner.style.borderLeftColor = speaker.color || "#d4a657";
    }
  } else if (med) {
    med.textContent = "序";
    med.style.borderColor = "#d4a657";
    med.style.color = "#d4a657";
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
      pImg.style.borderColor = (speaker && speaker.color) ? speaker.color : "#d4a657";
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
    wave.style.opacity = speaker ? "1" : "0.35";
  }
  if (pill) {
    pill.textContent = isTyping ? "發言中" : (voice.speaking ? "語音中" : "已講畢");
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
    const lbl = isTyping ? "顯示全文" : (isLw ? "繼續 →" : (isLastOfRound ? "進入公投 →" : "下一位 →"));
    nextBtn.innerHTML = escapeHtml(lbl) + ' <kbd class="ui-kbd ml-1">Space</kbd>';
    nextBtn.className = (!isTyping && !voice.speaking)
      ? "cta-brass py-1.5 px-3.5 text-xs shrink-0 inline-flex items-center"
      : "cta-ink py-1.5 px-3 text-xs shrink-0 inline-flex items-center";
  }
  updateSpotlightBox(badge, trait);
  renderSpeakerTurnStrip();
}

function renderInteractiveSpotlightText(rawText, speaker, isPartial) {
  const pEl = el("spotlightText");
  if (!pEl) return;
  const rawStr = String(rawText || "").replace(/^「|」$/g, "");
  const clean = isPartial ? rawStr : rawStr.trim();
  if (!clean) {
    pEl.textContent = isPartial ? "「" : "";
    return;
  }
  const toxicWords = TOXIC_PATTERNS.map(function (t) { return t.word; })
    .concat(["亂帶風向", "裝無辜", "別演了", "少裝了", "隨便投", "講廢話", "別吵", "根本在騙", "挑撥"]);
  const uniqueToxic = [];
  toxicWords.forEach(function (w) { if (w && uniqueToxic.indexOf(w) === -1) uniqueToxic.push(w); });
  uniqueToxic.sort(function (a, b) { return b.length - a.length; });
  const roleWords = ["明心觀察員", "觀察員", "滴水奉茶師", "奉茶師", "直心糾察長", "糾察長", "暖心回甘茶", "清心醒神茶", "預言家", "查殺", "金水", "酸民狼", "平安夜"];
  const activeContraRec = (state.match && state.match.activeSpeechContra && speaker && state.match.activeSpeechContra.speakerId === speaker.id)
    ? state.match.activeSpeechContra.contra
    : null;
  const contraTriggers = activeContraRec
    ? ["硬打", "自稱", "假冒", "冒充", "力挺", "洗白", "投出去", "站邊", "護航", "點進狼坑", "明心觀察員", "滴水奉茶師", "直心糾察長", "狼坑"]
    : [];
  const combinedPattern = new RegExp(
    "(0?[1-8]號(?:[\\u4e00-\\u9fff]{1,2})?|" +
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

  while ((match = combinedPattern.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      html += escapeHtml(clean.slice(lastIdx, match.index));
    }
    const tok = match[0];
    const seatMatch = tok.match(/^0?([1-8])號/);
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
      html += '<span class="clue-token clue-contradiction' + (contraCaught ? ' clue-caught' : '') + '" data-clue-type="contradiction" data-clue-key="' + escapeHtml(contraKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="⚡ 發現邏輯破綻：「' + escapeHtml(activeContraRec.label) + '」！點擊立即收入呈堂證供！">' + escapeHtml(tok) + (contraCaught ? ' ✓' : ' ⚡') + '</span>';
    } else if (seatMatch) {
      const sid = parseInt(seatMatch[1], 10);
      html += '<span class="clue-token clue-seat" data-clue-type="seat" data-seat-id="' + sid + '" title="點擊查看 0' + sid + '號情報並鎖定">' + escapeHtml(tok) + '</span>';
    } else if (isToxic && speaker && speaker.id !== getPlayerId()) {
      html += '<span class="clue-token clue-toxic' + (isCaught ? ' clue-caught' : '') + '" data-clue-type="toxic" data-clue-key="' + escapeHtml(clueKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="點擊抓包這句酸言破綻！">' + escapeHtml(tok) + (isCaught ? ' ✓' : '') + '</span>';
    } else if (isRole) {
      html += '<span class="clue-token clue-role' + (isCaught ? ' clue-caught' : '') + '" data-clue-type="role" data-clue-key="' + escapeHtml(clueKey) + '" data-clue-word="' + escapeHtml(tok) + '" data-speaker-id="' + spId + '" title="點擊記錄這項身分線索">' + escapeHtml(tok) + (isCaught ? ' ✓' : '') + '</span>';
    } else {
      html += escapeHtml(tok);
    }
    lastIdx = combinedPattern.lastIndex;
  }
  if (lastIdx < clean.length) {
    const tailSlice = clean.slice(lastIdx);
    html += escapeHtml(tailSlice);
  }
  if (activeContraRec && !contraEmitted && !isPartial && speaker && speaker.id !== getPlayerId()) {
    html += ' <span class="clue-token clue-contradiction' + (contraCaught ? ' clue-caught' : '') + '" data-clue-type="contradiction" data-clue-key="' + escapeHtml(contraKey) + '" data-clue-word="⚡破綻" data-speaker-id="' + spId + '" title="⚡ 點擊收入「' + escapeHtml(activeContraRec.label) + '」呈堂證供">⚡' + escapeHtml(activeContraRec.label) + (contraCaught ? ' ✓' : '') + '</span>';
  }
  html += isPartial ? "" : "」";
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
  if (targetEl.textContent.indexOf("✓") === -1) targetEl.textContent = targetEl.textContent.replace(/\s*⚡$/, "") + " ✓";

  if (type === "contradiction") {
    const contraRec = (state.match.activeSpeechContra && state.match.activeSpeechContra.speakerId === sp.id)
      ? state.match.activeSpeechContra.contra
      : ((state.match.detectedContradictions || []).slice().reverse().find(function (c) { return c.day === state.match.day && c.speakerId === sp.id; }));
    const labelStr = (contraRec && contraRec.label) || "邏輯矛盾";
    const rebText = (contraRec && contraRec.rebuttalText) || ("我整理了 0" + sp.id + "號" + sp.name + " 前後的邏輯破綻，請大家重點檢視 0" + sp.id + "號！");
    const extraFeast = (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "harmony_feast");
    state.match.stats.contradictionsFound = (state.match.stats.contradictionsFound || 0) + 1;
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + (extraFeast ? 10 : 5), 0, 100);
    state.playerMarks[sp.id] = "wolf";
    spawnFx(sp.id, "⚡ 抓包" + labelStr + "!", "#fbbf24", { scale: 1.15, durationMs: 1800 });
    spawnBurst(sp.id, ["#fbbf24", "#fde68a", "#ffffff"], 22, "slash");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 380, 0.3);
    nudgeSeat(sp.id, { scale: 0.9, vTilt: 0.24 });
    sound.tone(720, 0.12, "triangle", 0.06, 0);
    pinClue(sp.id, "⚡" + labelStr, rebText, "contradiction");
    addThreeGoodPoint("heart", "存好心抓破矛盾");
    bumpCombo("抓破矛盾" + (extraFeast ? "（茶點×2）" : ""));
    if (extraFeast) bumpCombo("茶點加碼連擊");
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    showToast("⚡ 已抓破 0" + sp.id + "號「" + labelStr + "」！解鎖你的「⚡ 呈堂證供」邏輯破防卡！", "emerald");
    updateAllUI();
    return true;
  }

  if (type === "toxic") {
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 6, 0, 100);
    state.playerMarks[sp.id] = "wolf";
    spawnFx(sp.id, "📌 淨化酸言 +6!", "#fb7185");
    spawnBurst(sp.id, ["#fb7185", "#fbbf24", "#ffffff"], 14, "spark");
    nudgeSeat(sp.id, { scale: 1.1 });
    sound.tone(580, 0.08, "triangle", 0.05, 0);
    pinClue(sp.id, "記下酸言「" + word + "」", "剛才 0" + sp.id + "號" + sp.name + "發言用了挑撥字眼「" + word + "」，大家留意他的動機與立場！", "toxic");
    addThreeGoodPoint("heart", "存好心蒐證");
    bumpCombo("靜默筆記蒐證");
    if (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "anonymous_wall") {
      bumpCombo("匿名牆破綻連擊");
    }
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    showToast("📌 已揪出 0" + sp.id + "號的酸言「" + word + "」並淨化場上友善度！", "emerald");
    updateAllUI();
  } else if (type === "role") {
    state.match.stats.cluesCaught = (state.match.stats.cluesCaught || 0) + 1;
    spawnFx(sp.id, "📌 紀錄線索：" + word, "#fde68a");
    spawnBurst(sp.id, ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
    nudgeSeat(sp.id, { scale: 1.1 });
    sound.tone(660, 0.09, "triangle", 0.055, 0);
    pinClue(sp.id, "0" + sp.id + "號提到「" + word + "」", "剛才 0" + sp.id + "號" + sp.name + "提到「" + word + "」，請大家比對真偽與邏輯！", "role");
    bumpCombo("線索歸檔");
    if (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "anonymous_wall") {
      bumpCombo("匿名牆線索連擊");
    }
    showToast("📌 已將 0" + sp.id + "號提到的「" + word + "」存入發言筆記！", "amber");
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
  const cleanText = String(opts.rawText || "").replace(/^「|」$/g, "").trim();
  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const useRealVoice = ff ? false : voice.canSpeak();
  const syncedDelay = ff
    ? 12
    : (useRealVoice
      ? Math.round(clamp(138 / voice.rate, 85, 165))
      : (voice.mode === "cozy" ? 44 : (opts.charDelay || 36)));

  state.typewriter.fullText = cleanText;
  state.typewriter.pos = 0;
  state.typewriter.active = true;
  state.typewriter.speakerId = speaker ? speaker.id : null;
  state.typewriter.holdMs = ff ? 280 : (opts.holdMs || 2450);
  state.typewriter.onDone = opts.onDone || null;

  if (useRealVoice) {
    voice.speakCharacter(speaker, cleanText, opts.voiceMood || "normal", function () {
      const curSp = getSeat(state.typewriter.speakerId);
      const bTxt = el("spotlightSpeakerBadge") ? el("spotlightSpeakerBadge").textContent : "";
      const tTxt = el("spotlightTraitTag") ? el("spotlightTraitTag").textContent : "";
      syncSpeakerBannerVisuals(curSp, bTxt, tTxt, state.typewriter.active);
      maybeScheduleAutoAdvanceAfterSpeech();
    });
  }

  const pEl = el("spotlightText");
  if (pEl) {
    pEl.textContent = "「";
    pEl.classList.add("typing-cursor");
  }
  const prog = el("spotlightProgressBar");
  if (prog) prog.style.width = "2%";
  syncSpeakerBannerVisuals(speaker, opts.badge, opts.trait, true);

  runTypewriterInterval(syncedDelay, speaker, useRealVoice);
}

function refreshQuickFreeInputHint() {
  const qIn = el("quickFreeInput");
  const rwBtn = el("btnQuickInlineRewrite");
  if (!qIn || !rwBtn) return;
  const val = qIn.value.trim();
  if (!val) {
    rwBtn.classList.add("hidden");
    return;
  }
  const res = analyzeThreeGoodSpeech(val);
  rwBtn.classList.toggle("hidden", !res.isToxic);
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
