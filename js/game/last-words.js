/**
 * 首夜與公投出局遺言佇列：AI 遺言生成、遺言推理影響力與玩家遺言介面
 */
"use strict";

function buildAiLastWords(seat, mode) {
  if (
    seat && seat.id === 4 && mode !== "first_night" &&
    typeof state !== "undefined" && state.match && state.match.judgeShowcase &&
    state.match.judgeShowcaseScript && state.match.judgeShowcaseScript.lwAsongText
  ) {
    return {
      text: state.match.judgeShowcaseScript.lwAsongText,
      claimRole: null,
      targetId: null,
      isWolf: true
    };
  }
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(seat, { module: "last_words" })
    : null;
  const self = (snap && snap.self) ? snap.self : seat;
  const readSeat = snap ? snap.getSeat : getSeat;
  const flv = PERSONA_FLAVORS[self.name];
  const isFirstNight = (mode === "first_night");
  const pid = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
  const labelOf = function (s) {
    if (!s) return "";
    return fmtSeatNum(s.id) + "號" + (s.id === pid ? "你" : s.name);
  };
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("last_words", self.id, isFirstNight ? "首夜遺言" : "公投遺言");
  }
  const lwText = typeof buildPersonaLastWordsText === "function" ? buildPersonaLastWordsText : null;
  const dayNowLw = snap ? snap.day : ((typeof state !== "undefined" && state.match) ? state.match.day : 1);
  if (self.role === "seer" && self.checkedHistory && self.checkedHistory.length > 0) {
    const chk = self.checkedHistory[self.checkedHistory.length - 1];
    const tSeat = readSeat(chk.targetId);
    const tLbl = labelOf(tSeat) || (fmtSeatNum(chk.targetId) + "號");
    const customSeer = lwText && lwText(self, "seer", { isFirstNight: isFirstNight, tLbl: tLbl, isWolf: chk.isWolf, day: dayNowLw });
    return {
      text: customSeer || (isFirstNight
        ? ("我茶都還沒喝一口就被請出場喔？好吧攤牌啦！我是明心觀察員，昨晚親查 " + tLbl + " 確定是" + (chk.isWolf ? ("酸民狼！今天拜託直接把 " + tLbl + " 送來陪我喝茶！") : "清白好夥伴，你們要是投錯他我在場邊可是會翻白眼的喔！"))
        : ("驚不驚喜、意不意外，你們剛投出去的是真明心觀察員啦！離席前送最後大禮：我親查過 " + tLbl + " 確定是" + (chk.isWolf ? ("酸民狼，明天再不出 " + tLbl + " 我就在場邊笑看你們翻車喔！") : "鐵好人，千萬別被帶風向誤傷他！"))),
      claimRole: "seer",
      targetId: chk.targetId,
      isWolf: chk.isWolf
    };
  }
  if (self.role === "witch") {
    const sv = self.savedSeatId ? readSeat(self.savedSeatId) : null;
    const customWitch = lwText && lwText(self, "witch", { isFirstNight: isFirstNight, tLbl: sv ? labelOf(sv) : "", day: dayNowLw });
    return {
      text: customWitch || (sv
        ? ("好好好，連滴水奉茶師都送離席，這桌真的太精彩了！攤牌留遺言：前晚是我端暖心回甘茶護回 " + labelOf(sv) + "，他是鐵好人，剩下我端著茶在場邊看你們怎麼把狼揪出來！")
        : (isFirstNight ? "我這杯茶都還沒端上桌，滴水奉茶師就首夜領便當喔？大家睜大眼睛聽今天誰在偷笑帶風向！" : "哇你們居然親手把滴水奉茶師投出去啦！我先去旁邊喝涼茶消消氣，記得回頭抓剛剛帶頭衝我票的那位！")),
      claimRole: "witch",
      targetId: sv ? sv.id : null,
      isWolf: false
    };
  }
  if (self.role === "guard") {
    const gPrev = snap ? snap.lastGuardTargetId : ((typeof state !== "undefined" && state.match) ? state.match.lastGuardTargetId : null);
    const gSeat = gPrev ? readSeat(gPrev) : null;
    const customGuard = lwText && lwText(self, "guard", { isFirstNight: isFirstNight, tLbl: gSeat ? labelOf(gSeat) : "", day: dayNowLw });
    return {
      text: customGuard || (gSeat
        ? ("行喔，辛苦幫大家守夜的護心守衛就這樣被請出場啦！留條重要線索：上一晚我的護心結界剛守過 " + labelOf(gSeat) + "，奉茶師別再撞同守破盾，剩下看你們表現囉！")
        : "哎呀護心守衛先撤退一步！好人們記得盯緊誰一直避談昨晚守護的脈絡，我在場邊替大家加油打氣！"),
      claimRole: "guard",
      targetId: gSeat ? gSeat.id : null,
      isWolf: false
    };
  }
  if (self.role === "hunter") {
    const aliveListH = (snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== self.id; })).slice();
    aliveListH.sort(function (a, b) { return ((self.suspicionMap && self.suspicionMap[b.id]) || 50) - ((self.suspicionMap && self.suspicionMap[a.id]) || 50); });
    const hTop = aliveListH[0] || null;
    const customHunter = lwText && lwText(self, "hunter", { isFirstNight: isFirstNight, tLbl: hTop ? labelOf(hTop) : "", day: dayNowLw });
    return {
      text: customHunter || ("我亮直心糾察長留最後一句狠話！" + (hTop ? ("全場我看最不順眼的就是 " + labelOf(hTop) + "，") : "") + "你們下輪再放跑酸民狼，我在旁邊喝茶都要替大家捏把冷汗啦！"),
      claimRole: "hunter",
      targetId: hTop ? hTop.id : null,
      isWolf: hTop ? true : null
    };
  }
  if (self.team === "wolf") {
    const diffLw = (snap && snap.aiDifficulty) || (typeof state !== "undefined" ? state.aiDifficulty : "normal");
    const dayLw = dayNowLw;
    const hasGuardLw = Boolean(snap ? snap.hasGuardMode : (typeof state !== "undefined" && state.guardMode));
    const alivePoolLw = (snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== self.id; })).slice();
    const aliveMatesLw = alivePoolLw.filter(function (s) { return snap ? s.isWolfMate : (s.role === "wolf"); });
    const fakeChance = !isFirstNight ? (diffLw === "pro" ? 0.78 : (diffLw === "normal" ? 0.48 : 0)) : 0;
    const detRoll = ((self.id * 17 + dayLw * 29 + 11) % 100) / 100;
    if (!isFirstNight && fakeChance > 0 && detRoll < fakeChance && alivePoolLw.length > 0) {
      const fakeTarget = aliveMatesLw[0] || alivePoolLw[0];
      const fakeLbl = labelOf(fakeTarget);
      const fakeAsGuard = Boolean(hasGuardLw && ((self.id + dayLw) % 2 === 1));
      if (fakeAsGuard) {
        return {
          text: "你們這輪真的投大錯了啦，我才是默默幫大家守夜的護心守衛耶！上一晚我的護心結界剛守過 " + fakeLbl + "，他清白得很，明天記得查剛剛帶頭衝我票的人，我就在場邊等你們後悔喔！",
          claimRole: "guard",
          targetId: fakeTarget.id,
          isWolf: false,
          isFakeGodBluff: true
        };
      }
      return {
        text: "真的太冤了啦，你們居然親手把低調藏牌的滴水奉茶師投出場！前晚是我端暖心回甘茶護回 " + fakeLbl + " 的銀水，他鐵定是好人，等著看明天誰在偷笑吧！",
        claimRole: "witch",
        targetId: fakeTarget.id,
        isWolf: false,
        isFakeGodBluff: true
      };
    }
    const customWolf = lwText && lwText(self, "wolf_voted", { isFirstNight: isFirstNight, day: dayNowLw });
    return {
      text: customWolf || (flv ? flv.lastWolf.replace(/^「|」$/g, "") : "好啦好啦算你們眼光毒辣，我先去旁邊泡茶看戲，但桌上還有驚喜等著你們喔！"),
      claimRole: null,
      targetId: null,
      isWolf: null
    };
  }
  const aliveOthers = (snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== self.id; })).slice();
  const vHist = snap ? snap.voteHistory : ((typeof state !== "undefined" && state.match && Array.isArray(state.match.voteHistory)) ? state.match.voteHistory : []);
  const lastVh = vHist.length ? vHist[vHist.length - 1] : null;
  const votersAgainstMe = (!isFirstNight && lastVh && Array.isArray(lastVh.ballots))
    ? lastVh.ballots
      .filter(function (b) { return b.targetId === self.id && b.voterId !== self.id; })
      .map(function (b) { return readSeat(b.voterId); })
      .filter(function (s) { return Boolean(s && s.alive); })
      .sort(function (a, b) { return ((self.suspicionMap && self.suspicionMap[b.id]) || 50) - ((self.suspicionMap && self.suspicionMap[a.id]) || 50); })
    : [];

  if (!isFirstNight && votersAgainstMe.length > 0) {
    const callouts = votersAgainstMe.slice(0, 2).map(labelOf).join(" 跟 ");
    const customVoted = lwText && lwText(self, "good_voted", { callouts: callouts, day: dayNowLw });
    return {
      text: customVoted || ("好喔好喔，清白好人就這樣被你們送去旁邊喝茶啦！剛剛衝著我投的 " + callouts + " 裡絕對藏著酸民狼，我就端著茶杯在場邊看你們明天怎麼翻案！"),
      claimRole: null,
      targetId: votersAgainstMe[0].id,
      isWolf: true
    };
  }

  const wolfTotalLw = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
  aliveOthers.sort(function (a, b) { return ((self.suspicionMap && self.suspicionMap[b.id]) || 50) - ((self.suspicionMap && self.suspicionMap[a.id]) || 50); });
  const topSus = aliveOthers[0] || null;
  const customNight1 = isFirstNight && lwText ? lwText(self, "good_night1", { wolfTotal: wolfTotalLw, day: dayNowLw }) : null;
  return {
    text: isFirstNight
      ? (customNight1 || ("欸不是吧，我茶都還沒端熱就首夜領便當喔？我是清白好人啦，今天大家給我盯緊誰笑得最心虛，把這 " + wolfTotalLw + " 隻酸民狼全部揪出來！"))
      : (flv ? flv.lastGood.replace(/^「|」$/g, "") : ("好人被誤投先去旁邊看戲啦！離席前點名大家盯緊 " + (topSus ? labelOf(topSus) : "帶頭衝票的人") + "，別被他牽著鼻子走喔！")),
    claimRole: null,
    targetId: (!isFirstNight && topSus) ? topSus.id : null,
    isWolf: (!isFirstNight && topSus) ? true : null
  };
}

function applyLastWordsInfluence(seat, rawText, meta) {
  let clean = String(rawText || "").replace(/^「|」$/g, "").trim();
  if (clean && typeof normalizeSeatRefsInText === "function") {
    clean = normalizeSeatRefsInText(clean);
  }
  if (!clean || !seat) return;
  const m = meta || {};
  const strippedClaimLw = clean
    .replace(/(?:不是|非|絕不是|沒有|別信|別投|保護?|相信|力挺).{0,5}(?:預言家|明心觀察員|觀察員|女巫|滴水奉茶師|奉茶師|直心糾察長|糾察長|獵人|護心守衛|守衛|清心長老)/g, " ");
  const selfClaimLwPrefix = "(?:我(?:才|就)?是|我這(?:真|張)|我(?:跳|拍|亮)|吾(?:乃|實為)|妾身(?:乃|實為)|小生(?:乃|實為)|^)";
  const claimedSeer = m.claimRole === "seer" || new RegExp(selfClaimLwPrefix + "[^，。！？；;]{0,5}(?:預言家|明心觀察員|觀察員)").test(strippedClaimLw);
  const claimedWitch = m.claimRole === "witch" || new RegExp(selfClaimLwPrefix + "[^，。！？；;]{0,5}(?:女巫|滴水奉茶師|奉茶師)").test(strippedClaimLw);
  const claimedHunter = m.claimRole === "hunter" || new RegExp(selfClaimLwPrefix + "[^，。！？；;]{0,5}(?:直心糾察長|糾察長|獵人)").test(strippedClaimLw);
  const claimedGuard = m.claimRole === "guard" || new RegExp(selfClaimLwPrefix + "[^，。！？；;]{0,5}(?:護心守衛|守衛)").test(strippedClaimLw);
  const claimedElder = m.claimRole === "elder" || new RegExp(selfClaimLwPrefix + "[^，。！？；;]{0,5}清心長老").test(strippedClaimLw);
  if (claimedSeer) seat.claimedRole = "seer";
  else if (claimedWitch) seat.claimedRole = "witch";
  else if (claimedHunter) seat.claimedRole = "hunter";
  else if (claimedGuard) seat.claimedRole = "guard";
  else if (claimedElder) seat.claimedRole = "elder";

  let targetId = m.targetId || null;
  let isWolfClaim = (typeof m.isWolf === "boolean") ? m.isWolf : null;
  if (!targetId) {
    const ids = typeof extractSeatIdsFromText === "function"
      ? extractSeatIdsFromText(clean, state.match.totalSeats, { includeNames: true })
      : (clean.match(/(?:1[0-2]|0?[1-9])\s*號/g) || []).map(function (m) { return parseInt(m, 10); });
    for (let i = 0; i < ids.length; i++) {
      const num = ids[i];
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
        const styleMul = typeof getPersonaProfile === "function"
          ? getPersonaProfile(ai).credulity
          : (ai.deductionStyle === "gullible" ? 1.25 : (ai.deductionStyle === "skeptical" ? 0.7 : 1.0));
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

  const lwModeNow = m.mode || (state.lastWordsCtx ? state.lastWordsCtx.mode : null);
  if (state.match.day === 1 && lwModeNow === "first_night") {
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
  const normMode = mode || "first_night";
  const curDay = (typeof state !== "undefined" && state.match) ? (state.match.day || 1) : 1;
  // v16.0 High-Intensity Rule: ONLY Day-1 night casualties & daytime voted-out seats get Last Words!
  // Night 2+ wolf-kills or purify-kills are strictly silent (cover cup, zero last words).
  if ((normMode === "first_night" || normMode === "night") && curDay >= 2) {
    if (typeof onDone === "function") onDone("");
    return;
  }
  const list = (seatIds || []).filter(function (id) { return Boolean(getSeat(id)); });
  if (!list.length) {
    if (typeof onDone === "function") onDone("");
    return;
  }
  state.lastWordsCtx = {
    queue: list.slice(),
    mode: normMode,
    onDone: onDone || null,
    lastRecordedText: ""
  };
  advanceLastWordsQueue();
}

function advanceLastWordsQueue() {
  clearStepTimer();
  stopTypewriterOnly();
  voice.stop();
  state.speakingInFlight = false;
  state._lastWordsTurnSeq = (state._lastWordsTurnSeq || 0) + 1;
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
  if (typeof closeSeatIntel === "function") closeSeatIntel();
  if (typeof stage3d !== "undefined") {
    if (typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
    if (stage3d.orbit) stage3d.orbit.userOverrideUntil = 0;
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
  const commitAiLastWords = function (liveTextOverride) {
    if (liveTextOverride) lwObj.text = liveTextOverride;
    applyLastWordsInfluence(seat, lwObj.text, lwObj);
    ctx.lastRecordedText = "「" + lwObj.text + "」";
    state.match.phase = "LAST_WORDS_SPEECH";
    setSeatBubble(seat.id, lwObj.text, lwObj.isWolf ? "suspect" : "trust", 4800);
    if (lwObj.claimRole === "seer") {
      triggerCutIn("明心觀察員" + lwLabel + "！", fmtSeatNum(seat.id) + "號 " + seat.name + " 臨走前公開查驗真相！", "gold");
    }
    addLog({
      kind: "speech",
      useTypewriter: true,
      speakerId: seat.id,
      title: fmtSeatNum(seat.id) + "號 · " + seat.name + "（" + lwLabel + "）",
      subBadge: lwLabel,
      text: lwObj.text
    });
    updateAllUI();
    startSpotlightTypewriter({
      speaker: seat,
      badge: fmtSeatNum(seat.id) + "號 " + seat.name + "（遺言）",
      trait: lwLabel,
      rawText: lwObj.text,
      voiceMood: "last_words",
      charDelay: 32,
      holdMs: 2600
    });
    if (ctx.queue && ctx.queue.length > 0 && typeof voice !== "undefined" && typeof voice.prefetchBestTts === "function") {
      if (ctx.queue[0] === getPlayerId()) {
        voice.prefetchBestTts(
          "主持",
          ctx.mode === "first_night"
            ? "昨晚你首夜離席，請發表首夜遺言留下線索給好人夥伴。"
            : "你已高票離席，請發表最後遺言，場上玩家會記住你的線索。",
          "last_words"
        );
      }
    }
  };

  const ffLw = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const useLiveLw = Boolean(
    !ffLw &&
    typeof isExternalLlmActive === "function" && isExternalLlmActive() &&
    typeof tryGenerateGeminiLastWords === "function"
  );
  if (!useLiveLw) {
    commitAiLastWords(null);
    return;
  }

  state.match.phase = "LAST_WORDS_SPEECH";
  state.speakingInFlight = true;
  const epLw = (typeof orchestrator !== "undefined") ? orchestrator.matchEpoch : 0;
  const lwSeq = (state._lastWordsTurnSeq = (state._lastWordsTurnSeq || 0) + 1);
  updateAllUI();
  let lwCueTimer = setTimeout(function () {
    if (state._lastWordsTurnSeq === lwSeq && state.lastWordsCtx === ctx && state.activeSpeakerId === seat.id && state.speakingInFlight) {
      if (typeof syncSpeakerBannerVisuals === "function") {
        syncSpeakerBannerVisuals(seat, fmtSeatNum(seat.id) + "號 " + seat.name + "（遺言）", lwLabel, false);
      }
      if (typeof updateSpotlightBox === "function") {
        updateSpotlightBox(fmtSeatNum(seat.id) + "號 " + seat.name + "（遺言）", lwLabel, "整理離席前的最後線索…");
      }
    }
  }, 350);

  tryGenerateGeminiLastWords(seat, ctx.mode, lwObj)
    .then(function (liveText) {
      if (lwCueTimer) clearTimeout(lwCueTimer);
      if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epLw)) return;
      if (state._lastWordsTurnSeq === lwSeq) state.speakingInFlight = false;
      if (state.lastWordsCtx !== ctx || state.activeSpeakerId !== seat.id) return;
      commitAiLastWords(liveText);
    })
    .catch(function () {
      if (lwCueTimer) clearTimeout(lwCueTimer);
      if (typeof orchestrator !== "undefined" && !orchestrator.isEpochValid(epLw)) return;
      if (state._lastWordsTurnSeq === lwSeq) state.speakingInFlight = false;
      if (state.lastWordsCtx !== ctx || state.activeSpeakerId !== seat.id) return;
      commitAiLastWords(null);
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
      ? ("首夜遺言・" + playerNumTag() + " 你（離席前交接線索）")
      : ("公投遺言・" + playerNumTag() + " 你（發表最後推理）");
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
    const cLbl = fmtSeatNum(last.targetId) + "號" + (cSeat ? cSeat.name : "");
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
      label: "【滴水奉茶師遺言】證明 " + fmtSeatNum(player.savedSeatId) + "號 是我用回甘茶護回的好人",
      text: "我是這局的滴水奉茶師！之前晚上是我端暖心回甘茶護回了 " + fmtSeatNum(player.savedSeatId) + "號" + (sv ? sv.name : "") + "，他是鐵好人大家別投錯，剩下靠你們找出酸民狼！"
    });
  } else if (player.role === "guard") {
    const gPrevP = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
    cards.push({
      tag: "守衛交接",
      accent: "bg-sky-500/20 hover:bg-sky-500/35 border-sky-400/60 text-sky-100",
      label: gPrevP
        ? ("【護心守衛遺言】公開昨晚守護 " + fmtSeatNum(gPrevP.id) + "號 " + gPrevP.name + "・提醒防破盾")
        : "【護心守衛遺言】亮明護心守衛身分・呼籲穩住神職防線",
      text: gPrevP
        ? ("我亮出護心守衛留遺言！上一晚我的護心結界守過 " + fmtSeatNum(gPrevP.id) + "號" + gPrevP.name + "，請奉茶師留意交錯救援防破盾，大家照好人邏輯抓狼！")
        : ("我是這局的護心守衛，離席前提醒大家留意是誰避談昨夜保護視角、把 " + (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2) + " 隻酸民狼找出來！")
    });
  } else if (player.role === "hunter") {
    cards.push({
      tag: "糾察長表態",
      accent: "bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/60 text-amber-100",
      label: "【直心糾察長遺言】亮明正氣身分・點出剩餘狼坑焦點",
      text: "我是本局直心糾察長！希望大家接續把" + (pickSus ? (" " + fmtSeatNum(pickSus.id) + "號" + pickSus.name + " 等") : "") + "可疑發言對齊，穩穩拿下好人勝利！"
    });
  } else if (player.isElder) {
    cards.push({
      tag: "長老囑託",
      accent: "bg-teal-500/20 hover:bg-teal-500/35 border-teal-400/60 text-teal-100",
      label: "【清心長老遺言】亮明長老視野・囑託好夥伴集中抓狼",
      text: "我是這局的清心長老！雖要離席了但我站穩好人視角，請大家重點比對" + (pickSus ? (" " + fmtSeatNum(pickSus.id) + "號" + pickSus.name + " 的") : "") + "發言與票型，別被酸言帶偏！"
    });
  } else if (player.role === "wolf") {
    const targetGood = aliveOthers.find(function (s) { return s.team === "good"; }) || pickSus;
    cards.push({
      tag: player.isWolfKing ? "狼王攪局" : "干擾視角",
      accent: "bg-rose-500/20 hover:bg-rose-500/35 border-rose-400/60 text-rose-100",
      label: (player.isWolfKing ? "【流言首領遺言】臨走再攪一池春水，咬向 " : "【狼人偽裝】假裝好人將焦點導向 ") + (targetGood ? (fmtSeatNum(targetGood.id) + "號") : "場上"),
      text: "哎呀你們真的投錯好人了！我真心覺得 " + (targetGood ? (fmtSeatNum(targetGood.id) + "號" + targetGood.name) : "剛才帶節奏的人") + " 講話破綻超大，大家下一輪務必盯緊他！"
    });
  }
  if (pickSus) {
    cards.push({
      tag: "提醒抓狼",
      accent: "bg-rose-500/18 hover:bg-rose-500/30 border-rose-400/50 text-rose-100",
      label: "【點名提醒】請隊友重點留意 " + fmtSeatNum(pickSus.id) + "號 " + pickSus.name,
      text: "我是清白好人！離席前提醒大家重點檢視 " + fmtSeatNum(pickSus.id) + "號" + pickSus.name + " 的邏輯與票型，我覺得他非常可疑，祝好人夥伴順利抓出酸民狼！"
    });
  }
  if (pickGood) {
    cards.push({
      tag: "守護夥伴",
      accent: "bg-sky-500/18 hover:bg-sky-500/30 border-sky-400/50 text-sky-100",
      label: "【三好叮嚀】信任 " + fmtSeatNum(pickGood.id) + "號 " + pickGood.name + "・保持理性抓狼",
      text: "大家千萬別被酸言挑撥弄亂節奏！目前我覺得 " + fmtSeatNum(pickGood.id) + "號" + pickGood.name + " 態度很誠懇像好人，好人團結說好話、穩住票型一定會贏！"
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
  let clean = String(rawText || "").replace(/^「|」$/g, "").trim();
  if (clean && typeof normalizeSeatRefsInText === "function") {
    clean = normalizeSeatRefsInText(clean);
  }
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
