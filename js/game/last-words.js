/**
 * 首夜與公投出局遺言佇列：AI 遺言生成、遺言推理影響力與玩家遺言介面
 */
"use strict";

function buildAiLastWords(seat, mode) {
  const flv = PERSONA_FLAVORS[seat.name];
  const isFirstNight = (mode === "first_night");
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const labelOf = function (s) {
    if (!s) return "";
    return "0" + s.id + "號" + (s.id === pid ? "你" : s.name);
  };
  if (seat.role === "seer" && seat.checkedHistory && seat.checkedHistory.length > 0) {
    const chk = seat.checkedHistory[seat.checkedHistory.length - 1];
    const tSeat = getSeat(chk.targetId);
    const tLbl = labelOf(tSeat) || ("0" + chk.targetId + "號");
    return {
      text: (isFirstNight
        ? ("各位好人注意！我是明心觀察員，首夜離席留遺言：昨晚我查證了 " + tLbl + "，確定他是" + (chk.isWolf ? "酸民狼！今天拜託直接集中投 " + tLbl + "！" : "善良的好夥伴，大家別投錯他！"))
        : ("我真的是明心觀察員！離場前提醒大家，我查證過 " + tLbl + " 確定是" + (chk.isWolf ? "酸民狼，明天一定要投他！" : "好夥伴，千萬別被帶風向！"))),
      claimRole: "seer",
      targetId: chk.targetId,
      isWolf: chk.isWolf
    };
  }
  if (seat.role === "witch") {
    const sv = seat.savedSeatId ? getSeat(seat.savedSeatId) : null;
    return {
      text: sv
        ? ("我亮滴水奉茶師留遺言！之前是我用暖心回甘茶護回 " + labelOf(sv) + "，他是鐵好人，剩下靠大家穩住邏輯抓狼！")
        : (isFirstNight ? "好可惜我是滴水奉茶師首夜就暫離！大家務必仔細聽輪流發言、別被酸言帶風向！" : "我是滴水奉茶師竟然被投出去啦！大家記得回頭抓剛剛帶頭衝票的人！"),
      claimRole: "witch",
      targetId: sv ? sv.id : null,
      isWolf: false
    };
  }
  if (seat.role === "guard") {
    const gPrev = (typeof state !== "undefined" && state.match) ? state.match.lastGuardTargetId : null;
    const gSeat = gPrev ? getSeat(gPrev) : null;
    return {
      text: gSeat
        ? ("我亮出護心守衛留遺言！上一晚我的護心結界剛守過 " + labelOf(gSeat) + "，奉茶師千萬別再對同位用藥撞破盾，剩下拜託大家穩住找狼！")
        : "我是護心守衛先一步離席冷靜！好人記得注意誰在避談昨夜守護與救援視角，別被酸民狼混過去！",
      claimRole: "guard",
      targetId: gSeat ? gSeat.id : null,
      isWolf: false
    };
  }
  if (seat.role === "hunter") {
    const aliveListH = getAliveSeats().filter(function (s) { return s.id !== seat.id; });
    aliveListH.sort(function (a, b) { return (seat.suspicionMap[b.id] || 50) - (seat.suspicionMap[a.id] || 50); });
    const hTop = aliveListH[0] || null;
    return {
      text: "我亮直心糾察長留遺言！" + (hTop ? ("我覺得場上最可疑的是 " + labelOf(hTop) + "，") : "") + "大家一定要從這輪票型跟對跳邏輯抓出剩餘酸民狼！",
      claimRole: "hunter",
      targetId: hTop ? hTop.id : null,
      isWolf: hTop ? true : null
    };
  }
  if (seat.team === "wolf") {
    return {
      text: flv ? flv.lastWolf.replace(/^「|」$/g, "") : "可惡竟然被看穿破綻了，大家邏輯好強，我乖乖離席休息！",
      claimRole: null,
      targetId: null,
      isWolf: null
    };
  }
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== seat.id; });
  const vHist = (typeof state !== "undefined" && state.match && Array.isArray(state.match.voteHistory)) ? state.match.voteHistory : [];
  const lastVh = vHist.length ? vHist[vHist.length - 1] : null;
  const votersAgainstMe = (!isFirstNight && lastVh && Array.isArray(lastVh.ballots))
    ? lastVh.ballots
      .filter(function (b) { return b.targetId === seat.id && b.voterId !== seat.id; })
      .map(function (b) { return getSeat(b.voterId); })
      .filter(function (s) { return Boolean(s && s.alive); })
      .sort(function (a, b) { return (seat.suspicionMap[b.id] || 50) - (seat.suspicionMap[a.id] || 50); })
    : [];

  if (!isFirstNight && votersAgainstMe.length > 0) {
    const callouts = votersAgainstMe.slice(0, 2).map(labelOf).join(" 跟 ");
    return {
      text: "我真的是善良的好夥伴，被推上來太冤枉了！最後帶頭投我出去的 " + callouts + " 裡面極可能藏著酸民狼，拜託大家從這輪票型往回對齊狼坑！",
      claimRole: null,
      targetId: votersAgainstMe[0].id,
      isWolf: true
    };
  }

  aliveOthers.sort(function (a, b) { return (seat.suspicionMap[b.id] || 50) - (seat.suspicionMap[a.id] || 50); });
  const topSus = aliveOthers[0] || null;
  return {
    text: isFirstNight
      ? ("首夜倒牌好可惜！我是無辜好人，大家今天輪流發言時仔細聽誰語氣急著帶節奏，把兩隻酸民狼抓出來！")
      : (flv ? flv.lastGood.replace(/^「|」$/g, "") : ("我是清白好人！離席前建議大家重點留意 " + (topSus ? labelOf(topSus) : "帶頭衝票的人") + "！")),
    claimRole: null,
    targetId: (!isFirstNight && topSus) ? topSus.id : null,
    isWolf: (!isFirstNight && topSus) ? true : null
  };
}

function applyLastWordsInfluence(seat, rawText, meta) {
  const clean = String(rawText || "").replace(/^「|」$/g, "").trim();
  if (!clean || !seat) return;
  const m = meta || {};
  const claimedSeer = m.claimRole === "seer" || /預言家|明心觀察員|觀察員/.test(clean);
  const claimedWitch = m.claimRole === "witch" || /女巫|滴水奉茶師|奉茶師/.test(clean);
  const claimedHunter = m.claimRole === "hunter" || /直心糾察長|糾察長|獵人/.test(clean);
  const claimedGuard = m.claimRole === "guard" || /護心守衛|守衛/.test(clean);
  if (claimedSeer) seat.claimedRole = "seer";
  else if (claimedWitch) seat.claimedRole = "witch";
  else if (claimedHunter) seat.claimedRole = "hunter";
  else if (claimedGuard) seat.claimedRole = "guard";

  let targetId = m.targetId || null;
  let isWolfClaim = (typeof m.isWolf === "boolean") ? m.isWolf : null;
  if (!targetId) {
    const matches = clean.match(/0?([1-8])\s*號/g) || [];
    for (let i = 0; i < matches.length; i++) {
      const num = parseInt(matches[i], 10);
      if (num >= 1 && num <= state.match.totalSeats && num !== seat.id) {
        targetId = num;
        break;
      }
    }
  }
  if (targetId && isWolfClaim === null) {
    if (/好人|金水|救活|相信|別投|清白|夥伴/.test(clean) && !/酸民狼|是狼|查殺|投他|投給|懷疑|可疑/.test(clean)) {
      isWolfClaim = false;
    } else if (/酸民狼|是狼|查殺|投他|投給|懷疑|可疑|帶風向|假預言家/.test(clean)) {
      isWolfClaim = true;
    }
  }

  // Update alive AI suspicion maps based on the Last Words (respecting verified Seer/Witch facts!)
  if (targetId && isWolfClaim !== null) {
    const delta = claimedSeer ? (isWolfClaim ? 26 : -24) : (isWolfClaim ? 14 : -12);
    state.match.seats.forEach(function (ai) {
      if (ai.id !== seat.id && ai.id !== targetId && ai.alive && ai.team === "good") {
        if (ai.role === "seer" && claimedSeer) return;
        const seerVerifiedLock = (ai.role === "seer" && (ai.checkedHistory || []).some(function (c) { return c.targetId === targetId; }));
        const witchSavedLock = (ai.role === "witch" && ai.savedSeatId === targetId && isWolfClaim);
        if (seerVerifiedLock || witchSavedLock) return;
        const styleMul = ai.deductionStyle === "gullible" ? 1.25 : (ai.deductionStyle === "skeptical" ? 0.7 : 1.0);
        ai.suspicionMap[targetId] = clamp((ai.suspicionMap[targetId] || 50) + Math.round(delta * styleMul), 5, 98);
      }
    });
    recordRelation(seat.id, targetId, isWolfClaim ? "suspect" : "trust");
  }

  if (!state.match.allSpeechEvents) state.match.allSpeechEvents = [];
  state.match.allSpeechEvents.push({
    day: state.match.day,
    speakerId: seat.id,
    speakerName: seat.id === getPlayerId() ? "你" : seat.name,
    claimRole: seat.claimedRole || null,
    accuseId: (targetId && isWolfClaim === true) ? targetId : null,
    vouchId: (targetId && isWolfClaim === false) ? targetId : null,
    checkedWolfId: (claimedSeer && targetId && isWolfClaim === true) ? targetId : null,
    checkedGoodId: (claimedSeer && targetId && isWolfClaim === false) ? targetId : null,
    hasToxicSlip: false,
    isLastWord: true,
    rawText: clean
  });

  if (state.match.day === 1 && (!state.lastWordsCtx || state.lastWordsCtx.mode === "first_night")) {
    state.match.firstNightIntel = {
      speakerId: seat.id,
      speakerName: seat.id === getPlayerId() ? "你" : seat.name,
      claimRole: seat.claimedRole || null,
      targetId: targetId,
      isWolf: isWolfClaim,
      text: clean
    };
  }
}

function startLastWordsSequence(seatIds, mode, onDone) {
  const list = (seatIds || []).filter(function (id) { return Boolean(getSeat(id)); });
  if (!list.length) {
    if (typeof onDone === "function") onDone("");
    return;
  }
  state.lastWordsCtx = {
    queue: list.slice(),
    mode: mode || "first_night",
    onDone: onDone || null,
    lastRecordedText: ""
  };
  advanceLastWordsQueue();
}

function advanceLastWordsQueue() {
  clearStepTimer();
  stopTypewriterOnly();
  voice.stop();
  const ctx = state.lastWordsCtx;
  if (!ctx) return;
  if (!ctx.queue || ctx.queue.length === 0) {
    const doneCb = ctx.onDone;
    const lastTxt = ctx.lastRecordedText || "";
    state.lastWordsCtx = null;
    if (typeof doneCb === "function") doneCb(lastTxt);
    return;
  }
  const sid = ctx.queue.shift();
  const seat = getSeat(sid);
  if (!seat) {
    advanceLastWordsQueue();
    return;
  }
  state.activeSpeakerId = seat.id;
  const lwLabel = ctx.mode === "first_night" ? "首夜遺言" : "離席遺言";

  if (seat.id === getPlayerId()) {
    state.match.phase = "LAST_WORDS_PLAYER";
    preparePlayerLastWordsPanel(ctx.mode);
    updateAllUI();
    voice.speakHost(ctx.mode === "first_night"
      ? "昨晚你首夜離席，請發表首夜遺言留下線索給好人夥伴。"
      : "你已高票離席，請發表最後遺言，場上玩家會記住你的線索。", undefined, "last_words");
    return;
  }

  const lwObj = buildAiLastWords(seat, ctx.mode);
  applyLastWordsInfluence(seat, lwObj.text, lwObj);
  ctx.lastRecordedText = "「" + lwObj.text + "」";
  state.match.phase = "LAST_WORDS_SPEECH";
  setSeatBubble(seat.id, lwObj.text, lwObj.isWolf ? "suspect" : "trust", 4800);
  if (lwObj.claimRole === "seer") {
    triggerCutIn("🕯️ 明心觀察員" + lwLabel + "！", "0" + seat.id + "號 " + seat.name + " 臨走前公開查驗真相！", "gold");
  }
  addLog({
    kind: "speech",
    useTypewriter: true,
    speakerId: seat.id,
    title: "0" + seat.id + "號 · " + seat.name + "（" + lwLabel + "）",
    subBadge: lwLabel,
    text: lwObj.text
  });
  updateAllUI();
  startSpotlightTypewriter({
    speaker: seat,
    badge: "0" + seat.id + "號 " + seat.name + "（遺言）",
    trait: lwLabel,
    rawText: lwObj.text,
    voiceMood: "last_words",
    charDelay: 32,
    holdMs: 2600
  });
}

function preparePlayerLastWordsPanel(mode) {
  const player = getPlayerSeat();
  const box = el("lastWordsChips");
  if (!player || !box) return;
  box.innerHTML = "";
  const isFirst = (mode === "first_night");
  if (el("lastWordsHeading")) {
    el("lastWordsHeading").textContent = isFirst
      ? ("🕯️ 首夜遺言・" + playerNumTag() + " 你（離席前交接線索）")
      : ("🕯️ 公投遺言・" + playerNumTag() + " 你（發表最後推理）");
  }
  if (el("lastWordsSubHint")) {
    el("lastWordsSubHint").textContent = "依《凹嗚狼人殺》規則，你的遺言會被全場 AI 記住並影響後續站邊！";
  }
  if (el("lastWordsFreeInput")) el("lastWordsFreeInput").value = "";

  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== player.id; });
  const pickSus = aliveOthers.find(function (s) { return state.playerMarks[s.id] === "wolf"; }) || aliveOthers[0] || null;
  const pickGood = aliveOthers.find(function (s) { return state.playerMarks[s.id] === "good"; }) || aliveOthers[1] || aliveOthers[0] || null;

  const cards = [];
  if (player.role === "seer" && player.checkedHistory && player.checkedHistory.length > 0) {
    const last = player.checkedHistory[player.checkedHistory.length - 1];
    const cSeat = getSeat(last.targetId);
    const cLbl = "0" + last.targetId + "號" + (cSeat ? cSeat.name : "");
    cards.push({
      tag: "觀察員交接",
      accent: "bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/60 text-amber-100",
      label: "【明心觀察員遺言】報出查證：" + cLbl + " 是" + (last.isWolf ? "酸民狼" : "好人"),
      text: "各位好夥伴注意，我是真明心觀察員！離席前交接昨晚查證：" + cLbl + " 確定是" + (last.isWolf ? "酸民狼，拜託大家直接集中票投 " + last.targetId + "號！" : "善良的好夥伴，千萬別投錯 " + last.targetId + "號！")
    });
  } else if (player.role === "witch" && player.savedSeatId) {
    const sv = getSeat(player.savedSeatId);
    cards.push({
      tag: "奉茶師作證",
      accent: "bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/60 text-emerald-100",
      label: "【滴水奉茶師遺言】證明 0" + player.savedSeatId + "號 是我用回甘茶護回的好人",
      text: "我是這局的滴水奉茶師！之前晚上是我端暖心回甘茶護回了 0" + player.savedSeatId + "號" + (sv ? sv.name : "") + "，他是鐵好人大家別投錯，剩下靠你們找出酸民狼！"
    });
  } else if (player.role === "guard") {
    const gPrevP = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
    cards.push({
      tag: "守衛交接",
      accent: "bg-sky-500/20 hover:bg-sky-500/35 border-sky-400/60 text-sky-100",
      label: gPrevP
        ? ("【護心守衛遺言】公開昨晚守護 0" + gPrevP.id + "號 " + gPrevP.name + "・提醒防破盾")
        : "【護心守衛遺言】亮明護心守衛身分・呼籲穩住神職防線",
      text: gPrevP
        ? ("我亮出護心守衛留遺言！上一晚我的護心結界守過 0" + gPrevP.id + "號" + gPrevP.name + "，請奉茶師留意交錯救援防破盾，大家照好人邏輯抓狼！")
        : "我是這局的護心守衛，離席前提醒大家留意是誰避談昨夜保護視角、把兩隻酸民狼找出來！"
    });
  } else if (player.role === "hunter") {
    cards.push({
      tag: "糾察長表態",
      accent: "bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/60 text-amber-100",
      label: "【直心糾察長遺言】亮明正氣身分・點出剩餘狼坑焦點",
      text: "我是本局直心糾察長！希望大家接續把" + (pickSus ? (" 0" + pickSus.id + "號" + pickSus.name + " 等") : "") + "可疑發言對齊，穩穩拿下好人勝利！"
    });
  } else if (player.role === "wolf") {
    const targetGood = aliveOthers.find(function (s) { return s.team === "good"; }) || pickSus;
    cards.push({
      tag: "干擾視角",
      accent: "bg-rose-500/20 hover:bg-rose-500/35 border-rose-400/60 text-rose-100",
      label: "【狼人偽裝】假裝好人將焦點導向 " + (targetGood ? ("0" + targetGood.id + "號") : "場上"),
      text: "哎呀你們真的投錯好人了！我真心覺得 " + (targetGood ? ("0" + targetGood.id + "號" + targetGood.name) : "剛才帶節奏的人") + " 講話破綻超大，大家下一輪務必盯緊他！"
    });
  }
  if (pickSus) {
    cards.push({
      tag: "提醒抓狼",
      accent: "bg-rose-500/18 hover:bg-rose-500/30 border-rose-400/50 text-rose-100",
      label: "【點名提醒】請隊友重點留意 0" + pickSus.id + "號 " + pickSus.name,
      text: "我是清白好人！離席前提醒大家重點檢視 0" + pickSus.id + "號" + pickSus.name + " 的邏輯與票型，我覺得他非常可疑，祝好人夥伴順利抓出酸民狼！"
    });
  }
  if (pickGood) {
    cards.push({
      tag: "守護夥伴",
      accent: "bg-sky-500/18 hover:bg-sky-500/30 border-sky-400/50 text-sky-100",
      label: "【三好叮嚀】信任 0" + pickGood.id + "號 " + pickGood.name + "・保持理性抓狼",
      text: "大家千萬別被酸言挑撥弄亂節奏！目前我覺得 0" + pickGood.id + "號" + pickGood.name + " 態度很誠懇像好人，好人團結說好話、穩住票型一定會贏！"
    });
  }

  cards.slice(0, 3).forEach(function (item, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    const toneCls = idx === 0 ? "card-heart" : (idx === 1 ? "card-words" : "card-deeds");
    const stampCls = idx === 0 ? "stamp-heart" : (idx === 1 ? "stamp-words" : "stamp-deeds");
    btn.className = "play-card-btn w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 " + toneCls;
    btn.innerHTML =
      '<div class="min-w-0"><div class="text-xs font-bold truncate">' + escapeHtml(item.label) + '</div>' +
      '<div class="text-[11px] opacity-75 truncate mt-0.5">' + escapeHtml(item.text) + '</div></div>' +
      '<span class="play-card-stamp ' + stampCls + '">' + escapeHtml(item.tag) + '</span>';
    btn.addEventListener("click", function () {
      submitPlayerLastWords(item.text);
    });
    box.appendChild(btn);
  });
}

function submitPlayerLastWords(rawText) {
  sound.unlock();
  if (state.match.phase !== "LAST_WORDS_PLAYER" || !state.lastWordsCtx) return;
  const clean = String(rawText || "").replace(/^「|」$/g, "").trim();
  const player = getPlayerSeat();
  const ctx = state.lastWordsCtx;
  if (!clean) {
    ctx.lastRecordedText = "（選擇略過遺言，靜靜離席）";
    advanceLastWordsQueue();
    return;
  }
  const lwLabel = ctx.mode === "first_night" ? "首夜遺言" : "離席遺言";
  applyLastWordsInfluence(player, clean);
  ctx.lastRecordedText = "「" + clean + "」";
  sound.playSpeak();
  setSeatBubble(player.id, clean, "trust", 4600);
  addLog({
    kind: "speech",
    useTypewriter: true,
    speakerId: player.id,
    title: playerNumTag() + " · 你（" + lwLabel + "）",
    subBadge: lwLabel,
    text: clean
  });
  state.match.phase = "LAST_WORDS_SPEECH";
  state.activeSpeakerId = player.id;
  updateAllUI();
  startSpotlightTypewriter({
    speaker: player,
    badge: playerNumTag() + " · 你（" + lwLabel + "）",
    trait: lwLabel,
    rawText: clean,
    voiceMood: "last_words",
    charDelay: 28,
    holdMs: 2200
  });
}
