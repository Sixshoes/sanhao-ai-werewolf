/**
 * 好人陣營綜合邏輯推理與內建三好 AI 發言生成主管線
 */
"use strict";

function determineSpeechLengthTier(speaker, ctx) {
  if (!speaker || !ctx) return "standard";
  const inPk = Boolean(ctx.snap && ctx.snap.pkActive && Array.isArray(ctx.snap.pkCandidates) && ctx.snap.pkCandidates.indexOf(speaker.id) !== -1);
  const isEndgameMatchPoint = Boolean(ctx.snap && ctx.snap.isMatchPoint && ctx.snap.variantMode !== "blitz_3m");
  const hasInterjOnMe = Boolean(
    Array.isArray(ctx.publicInterjections) &&
    ctx.publicInterjections.some(function (it) { return it && it.targetId === speaker.id; })
  );
  const hunterDeterrence = Boolean(
    speaker.role === "hunter" &&
    ctx.snap &&
    typeof ctx.snap.getObservableHeatOnSeat === "function" &&
    ctx.snap.getObservableHeatOnSeat(speaker.id) >= 54
  );
  if (
    inPk ||
    isEndgameMatchPoint ||
    hunterDeterrence ||
    ctx.seerWolfOnMe ||
    ctx.wolfPitOnMe ||
    ctx.accuseOnMe ||
    ctx.priorSameRoleSteal ||
    ctx.dualSeerWorlds ||
    ctx.playerAnchorOnMe ||
    hasInterjOnMe
  ) {
    return "intense";
  }
  const dayNow = ctx.day || (ctx.snap && ctx.snap.day) || 1;
  const mSeed = (ctx.snap && typeof ctx.snap.matchStyleSeed === "number") ? ctx.snap.matchStyleSeed : 0;
  const cadence = typeof getPersonaTalkCadence === "function" ? getPersonaTalkCadence(speaker) : 1.0;
  const topSusScore = (ctx.spokenOthers || []).reduce(function (mx, s) {
    return Math.max(mx, (speaker.suspicionMap && speaker.suspicionMap[s.id]) || 50);
  }, 50);
  const h = Math.abs(speaker.id * 7 + dayNow * 13 + (ctx.spokenIdsToday ? ctx.spokenIdsToday.length : 0) * 5 + mSeed * 3) % 10;

  if (dayNow >= 3) {
    if ((ctx.isLateSeat && topSusScore >= 58) || topSusScore >= 64) return "intense";
    if (!ctx.isFirstToday && ((h < 3 && cadence <= 1.02) || h === 0)) return "concise";
    return (ctx.prevVoteNote || ctx.isLateSeat) ? "intense" : "standard";
  }
  const hasKeyRoleIntel = Boolean(
    (speaker.role === "seer" && Array.isArray(speaker.checkedHistory) && speaker.checkedHistory.length > 0) ||
    (speaker.role === "witch" && speaker.savedSeatId && !speaker.witchAnnouncedSave) ||
    ctx.priorSeerWolfEv ||
    ctx.vouchOnMe ||
    ctx.isFirstToday
  );
  if (hasKeyRoleIntel) return "standard";
  if (topSusScore >= 64) return (!ctx.isLateSeat && h < 3) ? "concise" : "standard";
  // Early rounds (Day 1-2): talkCadence shifts concise vs brief probability without starving calm speakers
  const briefCutoff = cadence <= 0.85 ? 5 : (cadence >= 1.2 ? 3 : 4);
  if (h < briefCutoff) return "brief";
  return (!ctx.isLateSeat && (h < 7 || cadence <= 0.90)) ? "concise" : "standard";
}

function buildBriefPassSpeech(speaker, ctx) {
  const { snap, day, spokenOthers, unspokenOthers, seatLabel, recentTableReactionNote, recentInterjectionNote } = ctx;
  const reg = typeof getPersonaRegister === "function" ? getPersonaRegister(speaker) : "balanced";
  const nextOne = unspokenOthers && unspokenOthers[0] ? seatLabel(unspokenOthers[0]) : "";
  const ally = (spokenOthers || []).slice().sort(function (a, b) {
    return ((speaker.suspicionMap && speaker.suspicionMap[a.id]) || 50) - ((speaker.suspicionMap && speaker.suspicionMap[b.id]) || 50);
  })[0] || null;
  if (recentInterjectionNote) {
    return {
      targetId: null, relationType: null, accuseId: null, vouchId: null, wolfPits: [], goodPits: [],
      hasToxicSlip: false, lengthTier: "brief",
      text: recentInterjectionNote
    };
  }
  if (recentTableReactionNote) {
    return {
      targetId: null, relationType: null, accuseId: null, vouchId: null, wolfPits: [], goodPits: [],
      hasToxicSlip: false, lengthTier: "brief",
      text: recentTableReactionNote
    };
  }
  const mSeed = (snap && typeof snap.matchStyleSeed === "number") ? snap.matchStyleSeed : 0;
  const bIdx = Math.abs(speaker.id * 11 + (day || 1) * 7 + (spokenOthers ? spokenOthers.length : 0) * 5 + mSeed * 3);
  const pickB = function (arr) { return arr[bIdx % arr.length]; };
  const allyLbl = ally ? seatLabel(ally) : "";
  let text = "";
  if (reg === "classical") {
    text = nextOne
      ? pickB(["前面幾位言之成理，暫無破綻，先聽 " + nextOne + "。", "線索猶淺，點到為止，換 " + nextOne + " 續聊。"])
      : pickB(["目前線索未明，點到為止，再看後續票型。", "席間尚稱清正，這輪暫且留白。"]);
  } else if (reg === "guzheng") {
    text = nextOne
      ? pickB(["剛才聽下來都算清正，晴嵐先聽 " + nextOne + "。", "前排節奏平穩，再靜聽 " + nextOne + " 開口。"])
      : pickB(["目前聽起來平和自然，我先記下再對。", "這段聽感還不錯，晴嵐先看後面票型。"]);
  } else if (reg === "poetic") {
    text = nextOne
      ? pickB(["前面聊得頗順，我喝口茶先聽 " + nextOne + "。", "這幾杯茶尚稱清冽，看 " + nextOne + " 怎麼接。"])
      : pickB(["這輪茶味清正，沒抓到明顯毛病，先留白。", "尚無顯著破綻，喝口茶看大家怎麼定。"]);
  } else if (reg === "data") {
    text = allyLbl
      ? pickB(["目前時間點都對得上，" + allyLbl + " 還行，先聽後面。", "前面資訊太少，" + allyLbl + " 先放邊上，再看下位。"])
      : (nextOne ? ("目前還沒顯著矛盾，先聽 " + nextOne + " 順看看。") : "資訊量還太少，我先記個底看投票。");
  } else if (reg === "warm") {
    text = allyLbl
      ? pickB([allyLbl + " 聽起來好溫和喔，暖暖先聽大家聊。", "前面氣氛還不錯呀，先站 " + allyLbl + " 這邊看看。"])
      : (nextOne ? ("先喝口茶不急喔，聽聽 " + nextOne + " 怎麼說～") : "大家都滿客氣的，我先跟著感受一下。");
  } else if (reg === "mountain") {
    text = allyLbl
      ? pickB(["老松看 " + allyLbl + " 講得挺實在，其餘後位再聽。", "前面風還算靜，這輪先記 " + allyLbl + " 一個順眼。"])
      : (nextOne ? ("目前還沒摸出鬼，先聽 " + nextOne + " 亮句話。") : "路況還看不清，老松先保留觀望。");
  } else if (reg === "astro") {
    text = allyLbl
      ? pickB(["直覺 " + allyLbl + " 滿自然的，我先聽後面怎麼說喔！", "目前警鈴還沒響，" + allyLbl + " 先過關，換下一位。"])
      : (nextOne ? ("還沒抓到怪感覺耶，快換 " + nextOne + " 講兩句。") : "暫時還感應不出狼氣，等投票看細節囉。");
  } else if (reg === "press") {
    text = allyLbl
      ? pickB(["前面紀錄暫無矛盾，" + allyLbl + " 先排好，繼續聽。", "筆記還沒畫紅字，暫信 " + allyLbl + " 看後排。"])
      : (nextOne ? ("前位細節還夠實在，先聽 " + nextOne + " 補資料。") : "這輪還沒抓到顯著漏拍，再對後續。");
  } else if (reg === "sport") {
    text = allyLbl
      ? pickB([allyLbl + " 講話乾脆！我先站這側，後面繼續接。", "前面防守都算穩，" + allyLbl + " 先放好人位。"])
      : (nextOne ? ("前排都沒失誤，快把球交給 " + nextOne + "！") : "這拍節奏還挺順，先等這輪全盤完。");
  } else if (reg === "debate") {
    text = allyLbl
      ? pickB(["目前還沒有硬傷，" + allyLbl + " 立論可信，聽下位。", "前段暫未見明顯漏洞，" + allyLbl + " 先列安全區。"])
      : (nextOne ? ("爭點還沒浮出來，先聽 " + nextOne + " 怎麼立論。") : "證據尚不足以定論，我先觀望票型。");
  } else if (reg === "pastry") {
    text = allyLbl
      ? pickB(["覺得 " + allyLbl + " 好安心喔～柚子先記一筆聽後面。", "大家都講得好認真，" + allyLbl + " 聽起來最軟萌啦～"])
      : (nextOne ? ("柚子還在等線索發酵中，換 " + nextOne + " 分享！") : "目前還沒聞到烤焦味耶，先乖乖聽大家說。");
  } else if (ally) {
    text = "前面聊得滿乾淨的，" + allyLbl + " 聽著還行，我這輪先聽後位。";
  } else {
    text = nextOne
      ? ("前面這幾位還沒抓到明顯破綻，先聽 " + nextOne + " 怎麼說。")
      : "我這輪沒特別抓到漏洞，先聽完一圈再看票型。";
  }
  return {
    targetId: ally ? ally.id : null,
    relationType: ally ? "trust" : null,
    accuseId: null,
    vouchId: ally ? ally.id : null,
    wolfPits: [],
    goodPits: ally ? [ally.id] : [],
    hasToxicSlip: false,
    lengthTier: "brief",
    text: text
  };
}

function buildGoodTeamDeductionSpeech(speaker, ctx) {
  const {
    snap, getBlindSeat, aliveOthers, day, spokenIdsToday, spokenOthers, unspokenOthers, spokeToday,
    isFirstToday, isLateSeat, flv, seatLabel, fill, pickVoice, callbackPhrase,
    prevVoteNote, prevVoteSuspect, vouchOnMe, priorSeerWolfEv, priorGodClaims,
    slotPlan, dualSeerWorlds, recentTableReactionNote, recentInterjectionNote
  } = ctx;
  const readSeat = typeof getBlindSeat === "function" ? getBlindSeat : (snap ? snap.getSeat : getSeat);

  const lengthTier = determineSpeechLengthTier(speaker, ctx);
  if (
    lengthTier === "brief" &&
    !ctx.priorSeerWolfEv &&
    (!dualSeerWorlds || !dualSeerWorlds.hasDualSeer) &&
    !ctx.accuseOnMe &&
    !ctx.wolfPitOnMe &&
    !ctx.seerWolfOnMe
  ) {
    return buildBriefPassSpeech(speaker, ctx);
  }

  const pVoice = typeof pickVoice === "function" ? pickVoice : function () { return ""; };
  const mSeedSkip = (snap && typeof snap.matchStyleSeed === "number") ? snap.matchStyleSeed : 0;
  const skipRoll = Math.abs(speaker.id * 31 + day * 17 + spokenIdsToday.length * 11 + mSeedSkip * 7);
  const leadPhrase = (isFirstToday || (skipRoll % 5) >= 2) ? pVoice("lead", 1) : "";
  const dualLeadPhrase = pVoice("dualLead", 2);
  const signoffPhrase = pVoice("signoff", 3) || "";
  const liveTableBeat = recentInterjectionNote || recentTableReactionNote || "";
  const useCallback = liveTableBeat || ((skipRoll % 5) >= 2 && callbackPhrase);
  const cbNote = (!isFirstToday && useCallback) ? (liveTableBeat || callbackPhrase) : "";

  const baseGoodIds = (slotPlan && Array.isArray(slotPlan.goodPits)) ? slotPlan.goodPits.map(function (s) { return s.id; }) : [];
  const baseWolfIds = (slotPlan && Array.isArray(slotPlan.wolfPits)) ? slotPlan.wolfPits.map(function (s) { return s.id; }) : [];
  const aliveWolfCap = Math.max(2, Math.min(4, (slotPlan && slotPlan.aliveWolfSlots) || 2));
  const seerBoostMap = (slotPlan && slotPlan.survivingSeerSuspicionBoost) || {};
  const isSelfSeerAnomalyTarget = Boolean((seerBoostMap[speaker.id] || 0) >= 12);
  const tableAnomalyNote = (speaker.team === "good" && !isSelfSeerAnomalyTarget && slotPlan && slotPlan.survivingSeerSummary)
    ? (slotPlan.survivingSeerSummary + " ")
    : "";
  const lowGodNote = (speaker.team === "good" && slotPlan && slotPlan.lowGodCountSummary && (!dualSeerWorlds || !dualSeerWorlds.hasDualSeer))
    ? (slotPlan.lowGodCountSummary + " ")
    : "";
  const formatSeatList = function (ids) {
    return ids.map(function (id) { return seatLabel(readSeat(id)); }).filter(Boolean);
  };
  const unspokenNote = typeof formatUnspokenNoteByPersona === "function"
    ? formatUnspokenNoteByPersona(speaker, unspokenOthers, seatLabel)
    : (unspokenOthers.length > 0
      ? ("後置位 " + seatLabel(unspokenOthers[0]) + (unspokenOthers.length > 1 ? " 等人" : "") + "今天還沒發言，先聽表水再補齊。")
      : "");
  const spReg = typeof getPersonaRegister === "function" ? getPersonaRegister(speaker) : "balanced";

  // 1. First Speaker Today (Strict Chronology: Day 1 opens clean; Day 2+ dissects yesterday's vote/night clues!)
  if (isFirstToday) {
    const nextWatch = unspokenOthers[0] || aliveOthers[0];
    if (prevVoteNote) {
      const focusTarget = prevVoteSuspect || nextWatch;
      const trustPick = aliveOthers.find(function (s) {
        return s.id !== (focusTarget ? focusTarget.id : -1) && (speaker.suspicionMap[s.id] || 50) < 52;
      });
      const focusDidNotSpeak = Boolean(focusTarget && !spokeToday(focusTarget.id));
      const initialWolfPits = [];
      if (focusTarget) initialWolfPits.push(focusTarget.id);
      baseWolfIds.forEach(function (id) {
        if (id !== (trustPick ? trustPick.id : -1) && initialWolfPits.indexOf(id) === -1 && initialWolfPits.length < aliveWolfCap) {
          initialWolfPits.push(id);
        }
      });
      const tailPrompt = focusDidNotSpeak
        ? ("今天還沒輪到 " + seatLabel(focusTarget) + " 開口，我暫時先放一格狼坑看等下你怎麼解釋，" + (nextWatch && nextWatch.id !== focusTarget.id ? ("後置位 " + seatLabel(nextWatch) + " 也請接力盤坑，") : "") + signoffPhrase)
        : ("這輪我暫先把狼坑畫在 " + formatSeatList(initialWolfPits).join(" 跟 ") + "，先聽後面大家怎麼接力，" + signoffPhrase);
      const leadIntro = day === 1
        ? "我先起手整理剛才警長競選的線索："
        : "我先起手整理昨天的線索：";
      const trustIntro = trustPick
        ? (seatLabel(trustPick) + (day === 1 ? " 剛才態度比較乾淨我暫放好人坑；" : " 昨輪態度比較乾淨我暫放好人坑；"))
        : "";
      return {
        targetId: focusTarget ? focusTarget.id : null,
        relationType: prevVoteSuspect ? "suspect" : null,
        accuseId: prevVoteSuspect ? prevVoteSuspect.id : null,
        vouchId: trustPick ? trustPick.id : null,
        wolfPits: initialWolfPits,
        goodPits: trustPick ? [trustPick.id] : [],
        hasToxicSlip: false,
        text: leadPhrase + leadIntro + tableAnomalyNote + trustIntro + prevVoteNote + lowGodNote + tailPrompt
      };
    }
    // v17.0 星兒招牌習慣：第一天無任何線索時也敢直接憑直覺點名試水溫！
    if (speaker.name === "星兒" && day === 1 && nextWatch) {
      return {
        targetId: nextWatch.id,
        relationType: "suspect",
        accuseId: nextWatch.id,
        vouchId: null,
        wolfPits: [nextWatch.id],
        goodPits: [],
        hasToxicSlip: false,
        text: "欸雖然是第一輪還沒線索啦，但我第六感直覺先點一下 " + seatLabel(nextWatch) + " 試試水溫喔，等等大家仔細聽他怎麼表水！"
      };
    }
    return {
      targetId: null,
      relationType: null,
      accuseId: null,
      vouchId: null,
      wolfPits: [],
      goodPits: [],
      hasToxicSlip: false,
      text: fill(flv.openFirst, { next: seatLabel(nextWatch) })
    };
  }

  // 2. Dual-Seer Clash: EXPLICITLY analyze World A vs World B (站 A 預言家的坑在哪 vs 站 B 預言家的坑在哪)!
  if (dualSeerWorlds && dualSeerWorlds.chosenWorld && dualSeerWorlds.rivalWorld) {
    const dw = dualSeerWorlds;
    const wA = dw.worldA;
    const wB = dw.worldB;
    const chosen = dw.chosenWorld;
    const sALbl = seatLabel(dw.seerA);
    const sBLbl = seatLabel(dw.seerB);

    const aSecondStr = wA.secondWolf
      ? ("、第二狼坑在 " + seatLabel(wA.secondWolf) + (wA.secondReason ? ("（" + wA.secondReason + "）") : ""))
      : (spReg === "classical" ? "（餘位待後席補明）" : "（餘坑待後置位補充）");
    const bSecondStr = wB.secondWolf
      ? ("、第二狼坑就變成 " + seatLabel(wB.secondWolf) + (wB.secondReason ? ("（" + wB.secondReason + "）") : ""))
      : (spReg === "classical" ? "（餘位待後席補明）" : "（餘坑待後置位補充）");
    const aConflict = wA.conflictReason ? ("——但這條線「" + wA.conflictReason + "」") : "";
    const bConflict = wB.conflictReason ? ("——但這條線「" + wB.conflictReason + "」") : "";

    const goodSidePits = chosen.goodPits
      .filter(function (s) { return s.id !== speaker.id && s.id !== chosen.fakeSeer.id; })
      .slice(0, 2);
    const goodSideText = goodSidePits.length > 0
      ? (spReg === "classical"
        ? ("善席可先認 " + goodSidePits.map(seatLabel).join("、") + "。")
        : ("好人坑可以先認 " + goodSidePits.map(seatLabel).join("、") + "。"))
      : "";
    const leadPrefix = isLateSeat
      ? (leadPhrase + (spReg === "classical" ? "我居末席總覽兩邊狼坑：" : (spReg === "guzheng" ? "晴嵐在末位幫大家理清兩邊脈絡：" : "我在末置位幫全場盤清兩邊狼坑：")))
      : (dualLeadPhrase || ("場上 " + sALbl + " 跟 " + sBLbl + " 對跳明心觀察員，我直接對比兩邊的坑位："));

    const dualText = typeof buildPersonaDualSeerText === "function"
      ? buildPersonaDualSeerText(speaker, {
          day: day,
          leadPrefix: leadPrefix,
          sALbl: sALbl,
          sBLbl: sBLbl,
          aSecondStr: aSecondStr,
          bSecondStr: bSecondStr,
          aConflict: aConflict,
          bConflict: bConflict,
          trustedLbl: seatLabel(chosen.trustedSeer),
          fakeLbl: seatLabel(chosen.fakeSeer),
          goodSideText: goodSideText,
          unspokenNote: unspokenNote,
          signoffPhrase: signoffPhrase
        })
      : (leadPrefix +
          "如果站 " + sALbl + "，" + sBLbl + " 必佔一狼" + aSecondStr + aConflict + "；" +
          "如果改站 " + sBLbl + "，" + sALbl + " 必一狼" + bSecondStr + bConflict + "。" +
          "兩邊盤完我站邊 " + seatLabel(chosen.trustedSeer) + "，" + goodSideText +
          "這輪先把 " + seatLabel(chosen.fakeSeer) + " 請離！" + unspokenNote + signoffPhrase);

    return {
      targetId: chosen.fakeSeer.id,
      relationType: "suspect",
      accuseId: chosen.fakeSeer.id,
      vouchId: chosen.trustedSeer.id,
      standWithSeerId: chosen.trustedSeer.id,
      wolfPits: chosen.wolfPits.map(function (s) { return s.id; }).slice(0, aliveWolfCap),
      goodPits: goodSidePits.map(function (s) { return s.id; }),
      hasToxicSlip: false,
      text: dualText + (tableAnomalyNote ? (" " + tableAnomalyNote.trim()) : "")
    };
  }

  const spokenSorted = spokenOthers.filter(function (s) {
    if (speaker.role === "witch" && speaker.savedSeatId === s.id) return false;
    if (speaker.role === "seer" && (speaker.checkedHistory || []).some(function (c) { return c.targetId === s.id && !c.isWolf; })) return false;
    return true;
  }).sort(function (a, b) {
    return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50);
  });
  const topSpokenSus = spokenSorted[0];
  const allAllySorted = spokenOthers.slice().sort(function (a, b) {
    return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50);
  });
  const bestSpokenAlly = allAllySorted[allAllySorted.length - 1];

  // If someone earlier vouched for ME, thank them & map slots cleanly!
  if (vouchOnMe && !priorSeerWolfEv) {
    const vSeat = readSeat(vouchOnMe.speakerId);
    const susCandidate = topSpokenSus && topSpokenSus.id !== vSeat.id ? topSpokenSus : null;
    const susPits = [];
    if (susCandidate) susPits.push(susCandidate.id);
    baseWolfIds.forEach(function (id) {
      if (id !== vSeat.id && susPits.indexOf(id) === -1 && susPits.length < aliveWolfCap) susPits.push(id);
    });
    const spokenPits = susPits.filter(spokeToday);
    const unspokenPitHint = (!spokenPits.length && unspokenOthers.length > 0)
      ? ("目前後置位 " + seatLabel(unspokenOthers[0]) + " 還沒講話，先等後面表水再開狼坑。")
      : (spokenPits.length > 0 ? ("目前前面發言較可疑的狼坑位是 " + formatSeatList(spokenPits).join(" 跟 ") + "。") : "");
    const vouchText = spReg === "classical"
      ? (leadPhrase + "多謝前席 " + seatLabel(vSeat) + " 明察把我放在好人席，觀其推論條理分明，我也先互保 " + seatLabel(vSeat) + "；" + unspokenPitHint + signoffPhrase)
      : (spReg === "guzheng"
        ? (leadPhrase + "謝謝剛才 " + seatLabel(vSeat) + " 願意信任晴嵐，聽你語氣清正誠懇，我也先保 " + seatLabel(vSeat) + "；" + unspokenPitHint + signoffPhrase)
        : (spReg === "poetic"
          ? (leadPhrase + "多謝同窗 " + seatLabel(vSeat) + " 仗義相保，聊得滿投緣的，我這邊也先互保 " + seatLabel(vSeat) + " 站好人坑；" + unspokenPitHint + signoffPhrase)
          : (leadPhrase + "謝謝剛剛前置位 " + seatLabel(vSeat) + " 把我放進好人坑！聽完他剛才的盤法我覺得邏輯順暢，我這邊也先互保 " + seatLabel(vSeat) + " 站好人坑；" + unspokenPitHint + signoffPhrase)));
    return {
      targetId: susCandidate ? susCandidate.id : vouchOnMe.speakerId,
      relationType: susCandidate ? "suspect" : "trust",
      accuseId: susCandidate ? susCandidate.id : null,
      vouchId: vouchOnMe.speakerId,
      wolfPits: susPits,
      goodPits: [vouchOnMe.speakerId],
      hasToxicSlip: false,
      text: vouchText
    };
  }

  // If someone left a Night-1 Last Word pointing out a Wolf or Good ally, react naturally on Day 1!
  const fnIntel = (day === 1) ? (snap ? snap.firstNightIntel : state.match.firstNightIntel) : null;
  if (fnIntel && fnIntel.targetId && fnIntel.targetId !== speaker.id && !priorSeerWolfEv && speaker.team === "good") {
    const fnSp = readSeat(fnIntel.speakerId);
    const fnTgt = readSeat(fnIntel.targetId);
    if (fnTgt && fnTgt.alive) {
      if (fnIntel.isWolf === true) {
        const fnTalked = spokeToday(fnTgt.id);
        return {
          targetId: fnTgt.id,
          relationType: "suspect",
          accuseId: fnTgt.id,
          vouchId: null,
          wolfPits: [fnTgt.id],
          goodPits: baseGoodIds.slice(0, 2),
          hasToxicSlip: false,
          text: leadPhrase + (fnIntel.claimRole === "seer"
            ? ("首夜離席的 " + seatLabel(fnSp) + " 遺言跳明心觀察員指認 " + seatLabel(fnTgt) + " 是狼，" + (fnTalked ? "剛才他講話也沒完全拍清，" : "他今天還沒發言待會聽怎麼接招，") + "我先幫 " + seatLabel(fnTgt) + " 佔定一個狼坑！")
            : ("參考首夜離席的 " + seatLabel(fnSp) + " 遺言提醒，" + cbNote + "我覺得 " + seatLabel(fnTgt) + " 先進檢視狼坑蠻合理的，先聽後面表水，" + signoffPhrase))
        };
      } else if (fnIntel.isWolf === false) {
        return {
          targetId: fnTgt.id,
          relationType: "trust",
          accuseId: null,
          vouchId: fnTgt.id,
          wolfPits: baseWolfIds.slice(0, 2),
          goodPits: [fnTgt.id],
          hasToxicSlip: false,
          text: leadPhrase + "首夜倒牌的 " + seatLabel(fnSp) + " 臨走遺言保過 " + seatLabel(fnTgt) + "，我這輪先把 " + seatLabel(fnTgt) + " 放進偏像好人的坑，待會從後置位找狼坑，" + signoffPhrase
        };
      }
    }
  }

  // Single Seer Wolf-Check reaction (react according to cognitive archetype & slot plausibility!)
  if (priorSeerWolfEv && (!dualSeerWorlds) && readSeat(priorSeerWolfEv.speakerId) && readSeat(priorSeerWolfEv.checkedWolfId)) {
    const sClaimer = readSeat(priorSeerWolfEv.speakerId);
    const sTarget = readSeat(priorSeerWolfEv.checkedWolfId);
    const targetAlreadyAnswered = spokenIdsToday.indexOf(priorSeerWolfEv.checkedWolfId) !== -1;

    if (speaker.deductionStyle === "gullible") {
      return {
        targetId: priorSeerWolfEv.checkedWolfId,
        relationType: "suspect",
        accuseId: priorSeerWolfEv.checkedWolfId,
        vouchId: priorSeerWolfEv.speakerId,
        standWithSeerId: priorSeerWolfEv.speakerId,
        wolfPits: [priorSeerWolfEv.checkedWolfId],
        goodPits: [priorSeerWolfEv.speakerId],
        hasToxicSlip: false,
        text: leadPhrase + "前置位 " + seatLabel(sClaimer) + " 直接跳明心觀察員把 " + seatLabel(sTarget) + " 指進狼坑了，" +
          (targetAlreadyAnswered ? "剛才反駁聽起來也有點慌，" : "待會看後置位有沒有人對跳再確認，") +
          "我先站邊 " + seatLabel(sClaimer) + " 好人坑、把 " + seatLabel(sTarget) + " 放進狼坑！"
      };
    } else if (speaker.deductionStyle === "skeptical") {
      const claimerSeemsPushy = priorSeerWolfEv.hasToxicSlip || (speaker.suspicionMap[sClaimer.id] || 50) >= 54;
      const pickSusId = claimerSeemsPushy ? sClaimer.id : sTarget.id;
      return {
        targetId: pickSusId,
        relationType: "suspect",
        accuseId: pickSusId,
        vouchId: null,
        wolfPits: [sTarget.id, sClaimer.id],
        goodPits: bestSpokenAlly && bestSpokenAlly.id !== sTarget.id && bestSpokenAlly.id !== sClaimer.id ? [bestSpokenAlly.id] : [],
        hasToxicSlip: false,
        text: leadPhrase + "大家先別因為前置位 " + seatLabel(sClaimer) + " 單邊跳觀察員就馬上全信！盤兩種可能：" +
          (claimerSeemsPushy
            ? ("如果他是假觀察員，那他自己跟護航位才在狼坑；我看他剛才語氣偏急，先留疑 " + seatLabel(sClaimer) + "。" + signoffPhrase)
            : (targetAlreadyAnswered
              ? ("如果他真，狼坑就在 " + seatLabel(sTarget) + " 身上，剛才反駁確實還有點疑點；但我也會看後置位有沒有另一張觀察員對跳。" + signoffPhrase)
              : ("目前 " + seatLabel(sTarget) + " 還沒講話，後置位也還沒開對跳，先保留態度聽完表水再定狼坑！" + signoffPhrase)))
      };
    } else {
      return {
        targetId: priorSeerWolfEv.checkedWolfId,
        relationType: "suspect",
        accuseId: priorSeerWolfEv.checkedWolfId,
        vouchId: null,
        wolfPits: [priorSeerWolfEv.checkedWolfId],
        goodPits: bestSpokenAlly && bestSpokenAlly.id !== priorSeerWolfEv.checkedWolfId ? [bestSpokenAlly.id] : [],
        hasToxicSlip: false,
        text: leadPhrase + "剛才前置位 " + seatLabel(sClaimer) + " 跳觀察員指認 " + seatLabel(sTarget) + " 是狼。" +
          (targetAlreadyAnswered
            ? ("對比兩邊已經講完的內容，目前先記 " + seatLabel(sTarget) + " 進暫定狼坑，同時看後面有沒有觀察員起跳。" + signoffPhrase)
            : ("因為 " + seatLabel(sTarget) + " 還沒輪到發言，我先記他待驗狼坑，等聽完後面所有人表水再定邊，" + signoffPhrase))
      };
    }
  }

  // Witch / Hunter / Guard / Elder counter-claim clash on the table!
  const alivePoolBlind = snap ? snap.aliveSeats : state.match.seats.filter(function (s) { return s.alive; });
  const witchClaimants = alivePoolBlind.filter(function (s) { return s.claimedRole === "witch"; });
  const hunterClaimants = alivePoolBlind.filter(function (s) { return s.claimedRole === "hunter"; });
  const guardClaimants = alivePoolBlind.filter(function (s) { return s.claimedRole === "guard"; });
  const elderClaimants = alivePoolBlind.filter(function (s) { return s.claimedRole === "elder"; });
  if (witchClaimants.length >= 2 || hunterClaimants.length >= 2 || guardClaimants.length >= 2 || elderClaimants.length >= 2) {
    const pair = witchClaimants.length >= 2 ? witchClaimants : (hunterClaimants.length >= 2 ? hunterClaimants : (guardClaimants.length >= 2 ? guardClaimants : elderClaimants));
    const clashRoleName = witchClaimants.length >= 2 ? "滴水奉茶師" : (hunterClaimants.length >= 2 ? "直心糾察長" : (guardClaimants.length >= 2 ? "護心守衛" : "清心長老"));
    const sortedPair = pair.slice().sort(function (a, b) {
      return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50);
    });
    const susOne = sortedPair[0];
    const trustOne = sortedPair[1];
    const extraPit = spokenSorted.find(function (s) { return s.id !== susOne.id && s.id !== trustOne.id; });
    return {
      targetId: susOne.id,
      relationType: "suspect",
      accuseId: susOne.id,
      vouchId: trustOne.id,
      wolfPits: extraPit ? [susOne.id, extraPit.id] : [susOne.id],
      goodPits: [trustOne.id],
      hasToxicSlip: false,
      text: leadPhrase + "全場注意！剛才 " + seatLabel(pair[0]) + " 跟 " + seatLabel(pair[1]) + " 對跳了" + clashRoleName + "，這兩位必一好一狼！對比前面發言的誠懇度，我先把 " + seatLabel(trustOne) + " 放好人坑、把 " + seatLabel(susOne) + (extraPit ? (" 跟較可疑的 " + seatLabel(extraPit)) : "") + " 畫進狼坑，這輪先出 " + seatLabel(susOne) + "！" + signoffPhrase
    };
  }

  // Sole uncontested God rallying without a settled Seer line
  const soleLead = (slotPlan && slotPlan.soleGodLead) ? slotPlan.soleGodLead : null;
  if (
    soleLead &&
    speaker.team === "good" &&
    !dualSeerWorlds &&
    !priorSeerWolfEv &&
    soleLead.targetId &&
    soleLead.godSeatId &&
    soleLead.targetId !== speaker.id &&
    soleLead.godSeatId !== speaker.id
  ) {
    const gLeadSeat = readSeat(soleLead.godSeatId);
    const tLeadSeat = readSeat(soleLead.targetId);
    const isSelfProtectedTgt = Boolean(
      (speaker.role === "seer" && (speaker.checkedHistory || []).some(function (c) { return c.targetId === soleLead.targetId && !c.isWolf; })) ||
      (speaker.role === "witch" && speaker.savedSeatId === soleLead.targetId && !(slotPlan && slotPlan.silverWaterUnlocked))
    );
    if (gLeadSeat && gLeadSeat.alive && tLeadSeat && tLeadSeat.alive && !isSelfProtectedTgt) {
      const godRoleTitle = (soleLead.godRole && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[soleLead.godRole])
        ? ROLE_DEFS[soleLead.godRole].name
        : "明確神職";
      const rallyWolfPits = [tLeadSeat.id];
      baseWolfIds.forEach(function (id) {
        if (id !== gLeadSeat.id && rallyWolfPits.indexOf(id) === -1 && rallyWolfPits.length < aliveWolfCap) {
          rallyWolfPits.push(id);
        }
      });
      const rallyGoodPits = [gLeadSeat.id];
      baseGoodIds.forEach(function (id) {
        if (id !== tLeadSeat.id && rallyGoodPits.indexOf(id) === -1 && rallyGoodPits.length < 3) {
          rallyGoodPits.push(id);
        }
      });
      return {
        targetId: tLeadSeat.id,
        relationType: "suspect",
        accuseId: tLeadSeat.id,
        vouchId: gLeadSeat.id,
        wolfPits: rallyWolfPits,
        goodPits: rallyGoodPits,
        hasToxicSlip: false,
        text: leadPhrase + tableAnomalyNote + "目前場上還沒有定案的觀察員線，前置位站出來的唯一" + godRoleTitle + " " + seatLabel(gLeadSeat) + " 明確點推 " + seatLabel(tLeadSeat) + "，我先接手這面號令旗！這輪好人先把 " + seatLabel(gLeadSeat) + " 放好人坑、跟票檢視 " + seatLabel(tLeadSeat) + "。" + lowGodNote + unspokenNote + signoffPhrase
      };
    }
  }

  // Acknowledge earlier God claim (when uncontested)
  const latestGodEv = priorGodClaims.length > 0 ? priorGodClaims[priorGodClaims.length - 1] : null;
  const latestGodSeat = latestGodEv ? readSeat(latestGodEv.speakerId) : null;
  if (latestGodEv && latestGodSeat && ROLE_DEFS[latestGodEv.claimRole]) {
    const gEv = latestGodEv;
    const gSeat = latestGodSeat;
    const gRoleName = ROLE_DEFS[gEv.claimRole].name;
    const otherTarget = topSpokenSus && topSpokenSus.id !== gSeat.id
      ? topSpokenSus
      : (spokenOthers.find(function (s) { return s.id !== gSeat.id; }) || null);
    if (speaker.deductionStyle === "gullible") {
      return {
        targetId: gSeat.id,
        relationType: "trust",
        accuseId: (otherTarget && (speaker.suspicionMap[otherTarget.id] || 50) >= 56) ? otherTarget.id : null,
        vouchId: gSeat.id,
        wolfPits: otherTarget ? [otherTarget.id] : [],
        goodPits: [gSeat.id],
        hasToxicSlip: false,
        text: leadPhrase + "前置位 " + seatLabel(gSeat) + " 都直接亮出" + gRoleName + "還沒人對跳，我先把 " + seatLabel(gSeat) + " 放好人坑喔！" +
          (otherTarget ? ("目前狼坑我會多看剛剛講過的 " + seatLabel(otherTarget) + "，") : "") + unspokenNote + signoffPhrase
      };
    } else {
      const susG = gEv.hasToxicSlip;
      const pickSusId = susG ? gSeat.id : ((otherTarget && (speaker.suspicionMap[otherTarget.id] || 50) >= 56) ? otherTarget.id : null);
      return {
        targetId: susG ? gSeat.id : (pickSusId || gSeat.id),
        relationType: susG ? "suspect" : "trust",
        accuseId: pickSusId,
        vouchId: susG ? null : gSeat.id,
        wolfPits: pickSusId ? [pickSusId] : [],
        goodPits: susG ? [] : [gSeat.id],
        hasToxicSlip: false,
        text: leadPhrase + "雖然前置位 " + seatLabel(gSeat) + " 跳了" + gRoleName + "，我先不盲信也不排斥，要聽完後置位沒反對才算坐實好人坑。" +
          (otherTarget ? ("目前比較在意已經講過的 " + seatLabel(otherTarget) + "，暫留觀察狼坑。") : unspokenNote) + signoffPhrase
      };
    }
  }

  // COMPREHENSIVE SPOKEN-ONLY SLOT SYNTHESIS (strictly never criticizes unspoken players!)
  if (spokenOthers.length >= 2) {
    const goodSlots = [];
    if (bestSpokenAlly && (speaker.suspicionMap[bestSpokenAlly.id] || 50) <= 52) goodSlots.push(bestSpokenAlly);
    baseGoodIds.forEach(function (id) {
      const s = readSeat(id);
      if (s && s.alive && s.id !== speaker.id && spokeToday(id) && goodSlots.every(function (x) { return x.id !== id; })) {
        goodSlots.push(s);
      }
    });
    const spokenWolfCands = spokenSorted.filter(function (s) {
      return goodSlots.every(function (g) { return g.id !== s.id; });
    });
    const wolfSlots = spokenWolfCands.slice(0, aliveWolfCap);
    const topSus = wolfSlots[0] || topSpokenSus;
    const secSus = wolfSlots[1] || null;
    const goodText = goodSlots.length > 0
      ? (spReg === "classical"
        ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 剛才陳詞穩重，我先列在好人席；")
        : (spReg === "guzheng"
          ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 語氣清朗真誠，晴嵐先放好人席；")
          : (spReg === "poetic"
            ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 說法坦蕩，我先放進好人坑；")
            : (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 前面講話比較誠懇，我先放進好人坑；"))))
      : "";
    const wolfText = wolfSlots.length > 0
      ? (spReg === "classical"
        ? ("對照前面已發言的幾位，狼坑首推 " + wolfSlots.map(seatLabel).join(" 與 ") + "。")
        : (spReg === "guzheng"
          ? ("細聽前面幾位的語氣，比較失調的狼坑落在 " + wolfSlots.map(seatLabel).join(" 與 ") + "。")
          : (spReg === "poetic"
            ? ("細品前面幾番對答，阿竹重點圈定的狼坑是 " + wolfSlots.map(seatLabel).join(" 跟 ") + "。")
            : ("目前前面講過的人裡，狼坑我重點圈 " + wolfSlots.map(seatLabel).join(" 跟 ") + "。"))))
      : "";
    const openPrefix = isLateSeat
      ? (leadPhrase + (spReg === "classical" ? "我在末席幫大家總覽全場是非：" : (spReg === "guzheng" ? "晴嵐在末位收束一下前面的脈絡：" : "我在末置位幫大家總結前面坑位：")))
      : (leadPhrase + cbNote);

    if (!isLateSeat && lengthTier === "concise" && typeof buildPersonaConciseTurnText === "function" && (!dualSeerWorlds || !dualSeerWorlds.hasDualSeer)) {
      const mSeedC = (snap && typeof snap.matchStyleSeed === "number") ? snap.matchStyleSeed : 0;
      const cSeed = Math.abs(speaker.id * 23 + day * 17 + spokenOthers.length * 11 + mSeedC * 7);
      const nextLblC = unspokenOthers && unspokenOthers[0] ? seatLabel(unspokenOthers[0]) : "";
      if (topSus && (speaker.suspicionMap[topSus.id] || 50) >= 54) {
        const archPool = goodSlots[0] ? ["snipe", "contrast", "probe"] : ["snipe", "probe"];
        const chosenArch = archPool[cSeed % archPool.length];
        const conciseTxt = buildPersonaConciseTurnText(speaker, {
          archetype: chosenArch,
          susLabel: seatLabel(topSus),
          secLabel: secSus ? seatLabel(secSus) : "",
          allyLabel: goodSlots[0] ? seatLabel(goodSlots[0]) : "",
          nextLabel: nextLblC,
          seed: cSeed
        });
        if (conciseTxt) {
          return {
            targetId: topSus.id,
            relationType: "suspect",
            accuseId: topSus.id,
            vouchId: (chosenArch === "contrast" && goodSlots[0]) ? goodSlots[0].id : null,
            wolfPits: wolfSlots.map(function (s) { return s.id; }),
            goodPits: goodSlots.map(function (s) { return s.id; }).slice(0, 2),
            hasToxicSlip: false,
            lengthTier: "concise",
            text: conciseTxt
          };
        }
      } else if (goodSlots.length > 0) {
        const secondWatch = spokenSorted.find(function (s) { return s.id !== goodSlots[0].id; });
        const archG = (cSeed % 3 === 0 && secondWatch) ? "probe" : "cosign";
        const conciseG = buildPersonaConciseTurnText(speaker, {
          archetype: archG,
          susLabel: secondWatch ? seatLabel(secondWatch) : "",
          allyLabel: seatLabel(goodSlots[0]),
          nextLabel: nextLblC,
          seed: cSeed
        });
        if (conciseG) {
          return {
            targetId: goodSlots[0].id,
            relationType: "trust",
            accuseId: null,
            vouchId: goodSlots[0].id,
            wolfPits: secondWatch ? [secondWatch.id] : [],
            goodPits: [goodSlots[0].id],
            hasToxicSlip: false,
            lengthTier: "concise",
            text: conciseG
          };
        }
      }
    }

    if (topSus && (speaker.suspicionMap[topSus.id] || 50) >= 54) {
      const focusTail = spReg === "classical"
        ? ("這輪我這票先指 " + seatLabel(topSus) + (secSus ? ("，並留意 " + seatLabel(secSus)) : "") + "。")
        : (spReg === "guzheng"
          ? ("這輪晴嵐的焦點先落在 " + seatLabel(topSus) + (secSus ? ("，同時留意 " + seatLabel(secSus)) : "") + "。")
          : ("這輪我的焦點先掛在 " + seatLabel(topSus) + (secSus ? ("，順便緊盯 " + seatLabel(secSus)) : "") + "。"));
      return {
        targetId: topSus.id,
        relationType: "suspect",
        accuseId: topSus.id,
        vouchId: goodSlots[0] ? goodSlots[0].id : null,
        wolfPits: wolfSlots.map(function (s) { return s.id; }),
        goodPits: goodSlots.map(function (s) { return s.id; }).slice(0, 2),
        hasToxicSlip: false,
        text: openPrefix + goodText + (prevVoteNote ? prevVoteNote : "") + tableAnomalyNote + wolfText + focusTail + lowGodNote + unspokenNote + signoffPhrase
      };
    }
    if (goodSlots.length > 0) {
      const secondWatch = spokenSorted.find(function (s) { return s.id !== goodSlots[0].id; });
      return {
        targetId: goodSlots[0].id,
        relationType: "trust",
        accuseId: null,
        vouchId: goodSlots[0].id,
        wolfPits: secondWatch ? [secondWatch.id] : [],
        goodPits: [goodSlots[0].id],
        hasToxicSlip: false,
        text: openPrefix + goodText + tableAnomalyNote +
          (secondWatch ? (seatLabel(secondWatch) + " 的立場還不夠明朗我先保留一半疑點，") : "") +
          lowGodNote + unspokenNote + signoffPhrase
      };
    }
  }

  // v17.0 阿朗招牌習慣：「逢跳必詰」——好人見前置位亮神職必先壓力測試挑毛病（但避開零矛盾唯一明神）
  if (speaker.name === "阿朗" && speaker.role !== "seer" && Array.isArray(priorGodClaims) && priorGodClaims.length > 0 && !dualSeerWorlds) {
    const soleGodMapH = (slotPlan && slotPlan.soleGodMap) || {};
    const claimedEv = priorGodClaims.find(function (ev) {
      return ev && !(soleGodMapH[ev.speakerId] && !ev.hasToxicSlip && !ev.contradiction);
    });
    const claimedSeat = claimedEv ? readSeat(claimedEv.speakerId) : null;
    if (claimedSeat && claimedSeat.alive && claimedSeat.id !== speaker.id) {
      const clubBanter = typeof buildPersonaClubAndHabitInsert === "function"
        ? buildPersonaClubAndHabitInsert(speaker, ctx, claimedSeat, "suspect")
        : "";
      return {
        targetId: claimedSeat.id,
        relationType: "suspect",
        accuseId: claimedSeat.id,
        vouchId: null,
        wolfPits: [claimedSeat.id],
        goodPits: [],
        hasToxicSlip: false,
        text: leadPhrase + clubBanter + "先別急著全信跳牌，我慣例先對 " + seatLabel(claimedSeat) + " 做個壓力測試：你亮身分這條線還缺佐證，待會交代清楚我才放行！" + unspokenNote
      };
    }
  }

  if (topSpokenSus && (speaker.suspicionMap[topSpokenSus.id] || 50) >= 56) {
    const clubHabitNote = typeof buildPersonaClubAndHabitInsert === "function"
      ? buildPersonaClubAndHabitInsert(speaker, ctx, topSpokenSus, "suspect")
      : "";
    return {
      targetId: topSpokenSus.id,
      relationType: "suspect",
      accuseId: topSpokenSus.id,
      vouchId: null,
      wolfPits: [topSpokenSus.id],
      goodPits: bestSpokenAlly && bestSpokenAlly.id !== topSpokenSus.id ? [bestSpokenAlly.id] : [],
      hasToxicSlip: false,
      text: (prevVoteNote ? (prevVoteNote + "而且") : (leadPhrase + cbNote)) +
        clubHabitNote + fill(flv.goodSus, { t: seatLabel(topSpokenSus) }) + unspokenNote
    };
  }

  if (bestSpokenAlly) {
    const clubAllyNote = typeof buildPersonaClubAndHabitInsert === "function"
      ? buildPersonaClubAndHabitInsert(speaker, ctx, bestSpokenAlly, "trust")
      : "";
    return {
      targetId: bestSpokenAlly.id,
      relationType: "trust",
      accuseId: null,
      vouchId: bestSpokenAlly.id,
      wolfPits: [],
      goodPits: [bestSpokenAlly.id],
      hasToxicSlip: false,
      text: leadPhrase + clubAllyNote + fill(flv.goodAlly, {
        t: seatLabel(bestSpokenAlly),
        tail: (unspokenNote || ("目前後置位還沒發言完，我先把 " + seatLabel(bestSpokenAlly) + " 放好人坑，" + signoffPhrase))
      })
    };
  }

  return {
    targetId: null,
    relationType: null,
    accuseId: null,
    vouchId: null,
    wolfPits: [],
    goodPits: [],
    hasToxicSlip: false,
    text: fill(flv.openFirst, { next: seatLabel(unspokenOthers[0] || aliveOthers[0]) })
  };
}

// Strictly Causal, Vividly In-Character Three-Goodness Deduction Speeches (Blind-View Enforced)!
function sanitizeSpeechMeta(speaker, out, snapArg) {
  if (!out || !speaker) return out;
  const readSeat = (snapArg && typeof snapArg.getSeat === "function") ? snapArg.getSeat : getSeat;
  const isAliveOther = function (id) {
    if (!id || id === speaker.id) return false;
    const s = readSeat(id);
    return Boolean(s && s.alive);
  };
  if (out.accuseId && !isAliveOther(out.accuseId)) {
    if (out.targetId === out.accuseId) out.targetId = null;
    out.accuseId = null;
  }
  if (out.vouchId && (!isAliveOther(out.vouchId) || out.vouchId === out.accuseId)) {
    if (out.targetId === out.vouchId) out.targetId = out.accuseId || null;
    out.vouchId = null;
  }
  if (out.standWithSeerId && (out.standWithSeerId === speaker.id || out.standWithSeerId === out.accuseId || out.claimSeer || out.claimRole === "seer" || !isAliveOther(out.standWithSeerId))) {
    out.standWithSeerId = null;
  }
  if (out.targetId && !isAliveOther(out.targetId)) {
    out.targetId = out.accuseId || out.vouchId || null;
  }
  if (!out.accuseId && !out.vouchId && !out.targetId) {
    out.relationType = null;
  }

  const seatTotalMeta = (snapArg && typeof snapArg.totalSeats === "number" && snapArg.totalSeats > 0)
    ? snapArg.totalSeats
    : ((typeof state !== "undefined" && state.match && Array.isArray(state.match.seats) && state.match.seats.length > 0) ? state.match.seats.length : 8);
  const wolfTotalCap = Math.max(2, Math.min(4, typeof getInitialWolfCount === "function" ? getInitialWolfCount(seatTotalMeta) : 2));
  const cleanWolves = [];
  if (out.accuseId && isAliveOther(out.accuseId)) cleanWolves.push(out.accuseId);
  (Array.isArray(out.wolfPits) ? out.wolfPits : []).forEach(function (id) {
    if (isAliveOther(id) && id !== out.vouchId && cleanWolves.indexOf(id) === -1 && cleanWolves.length < wolfTotalCap) {
      cleanWolves.push(id);
    }
  });
  out.wolfPits = cleanWolves;

  const cleanGoods = [];
  if (out.vouchId && isAliveOther(out.vouchId) && cleanWolves.indexOf(out.vouchId) === -1) cleanGoods.push(out.vouchId);
  (Array.isArray(out.goodPits) ? out.goodPits : []).forEach(function (id) {
    if (isAliveOther(id) && cleanWolves.indexOf(id) === -1 && cleanGoods.indexOf(id) === -1 && cleanGoods.length < 3) {
      cleanGoods.push(id);
    }
  });
  out.goodPits = cleanGoods;

  if (out.text && typeof applyDifficultyTerminology === "function") {
    out.text = applyDifficultyTerminology(out.text, null, snapArg || null);
  }

  // v16.0 Match Point (<= 28 chars) & Blitz (<= 22 chars) speech length enforcement
  const capLimit = (snapArg && typeof snapArg.speechCharCap === "number" && snapArg.speechCharCap > 0)
    ? snapArg.speechCharCap
    : (typeof getActiveSpeechCharLimit === "function" ? getActiveSpeechCharLimit() : 0);
  if (capLimit > 0 && out.text && out.text.length > capLimit) {
    out.text = typeof clampSpeechToCharLimit === "function"
      ? clampSpeechToCharLimit(out.text, capLimit)
      : (out.text.slice(0, Math.max(1, capLimit - 1)) + "。");
  }

  return out;
}

function buildHeuristicAiSpeech(speaker) {
  const ctx = buildSpeechContext(speaker);
  const lengthTier = typeof determineSpeechLengthTier === "function" ? determineSpeechLengthTier(speaker, ctx) : "standard";
  const res = tryDefendOrCounterClaim(speaker, ctx)
    || tryRoleSpecificSpeech(speaker, ctx)
    || buildGoodTeamDeductionSpeech(speaker, ctx);
  if (res && !res.lengthTier) res.lengthTier = lengthTier;
  if (typeof antiCheatMonitor !== "undefined" && speaker) {
    antiCheatMonitor.recordDecision("day_speech", speaker.id, "盲視發言推理完成");
  }
  return sanitizeSpeechMeta(speaker, res, ctx && ctx.snap);
}
