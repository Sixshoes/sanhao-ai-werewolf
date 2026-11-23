/**
 * 好人陣營綜合邏輯推理與內建三好 AI 發言生成主管線
 */
"use strict";

function buildGoodTeamDeductionSpeech(speaker, ctx) {
  const {
    snap, getBlindSeat, aliveOthers, day, spokenIdsToday, spokenOthers, unspokenOthers, spokeToday,
    isFirstToday, isLateSeat, flv, seatLabel, fill, pickVoice, callbackPhrase,
    prevVoteNote, prevVoteSuspect, vouchOnMe, priorSeerWolfEv, priorGodClaims,
    slotPlan, dualSeerWorlds
  } = ctx;
  const readSeat = typeof getBlindSeat === "function" ? getBlindSeat : (snap ? snap.getSeat : getSeat);

  const pVoice = typeof pickVoice === "function" ? pickVoice : function () { return ""; };
  const leadPhrase = pVoice("lead", 1);
  const dualLeadPhrase = pVoice("dualLead", 2);
  const signoffPhrase = pVoice("signoff", 3) || "先這樣，過！";
  const cbNote = (!isFirstToday && callbackPhrase) ? callbackPhrase : "";

  const baseGoodIds = (slotPlan && Array.isArray(slotPlan.goodPits)) ? slotPlan.goodPits.map(function (s) { return s.id; }) : [];
  const baseWolfIds = (slotPlan && Array.isArray(slotPlan.wolfPits)) ? slotPlan.wolfPits.map(function (s) { return s.id; }) : [];
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
        if (id !== (trustPick ? trustPick.id : -1) && initialWolfPits.indexOf(id) === -1 && initialWolfPits.length < 2) {
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
        text: leadPhrase + leadIntro + trustIntro + prevVoteNote + tailPrompt
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
      ? (leadPhrase + (spReg === "classical" ? "吾居末席總攬雙邊狼籍：" : (spReg === "guzheng" ? "妾身居末席為諸君理清雙音脈絡：" : "我在末置位幫全場盤清兩邊狼坑：")))
      : (dualLeadPhrase || ("場上 " + sALbl + " 跟 " + sBLbl + " 對跳明心觀察員，我直接對比兩邊的坑位："));

    const dualText = typeof buildPersonaDualSeerText === "function"
      ? buildPersonaDualSeerText(speaker, {
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
      wolfPits: chosen.wolfPits.map(function (s) { return s.id; }).slice(0, 2),
      goodPits: goodSidePits.map(function (s) { return s.id; }),
      hasToxicSlip: false,
      text: dualText
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
      if (id !== vSeat.id && susPits.indexOf(id) === -1 && susPits.length < 2) susPits.push(id);
    });
    const spokenPits = susPits.filter(spokeToday);
    const unspokenPitHint = (!spokenPits.length && unspokenOthers.length > 0)
      ? ("目前後置位 " + seatLabel(unspokenOthers[0]) + " 還沒講話，先等後面表水再開狼坑。")
      : (spokenPits.length > 0 ? ("目前前面發言較可疑的狼坑位是 " + formatSeatList(spokenPits).join(" 跟 ") + "。") : "");
    const vouchText = spReg === "classical"
      ? (leadPhrase + "多謝前席 " + seatLabel(vSeat) + " 明察秋毫列吾於善席！觀其論述章法秩然，吾亦先互保 " + seatLabel(vSeat) + " 居好人坑；" + unspokenPitHint + signoffPhrase)
      : (spReg === "guzheng"
        ? (leadPhrase + "謝過方才 " + seatLabel(vSeat) + " 知音相護、將妾身列入善席！聽其音色清正，晴嵐亦願先保 " + seatLabel(vSeat) + "；" + unspokenPitHint + signoffPhrase)
        : (spReg === "poetic"
          ? (leadPhrase + "多謝同窗 " + seatLabel(vSeat) + " 仗義相保！一席清談投緣，小生這廂也先互保 " + seatLabel(vSeat) + " 站好人坑；" + unspokenPitHint + signoffPhrase)
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
    const wolfSlots = spokenWolfCands.slice(0, 2);
    const topSus = wolfSlots[0] || topSpokenSus;
    const secSus = wolfSlots[1] || null;
    const goodText = goodSlots.length > 0
      ? (spReg === "classical"
        ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 方才陳詞醇正，吾先列之於善席；")
        : (spReg === "guzheng"
          ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 音色清朗真誠，妾身先列善席；")
          : (spReg === "poetic"
            ? (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 言辭坦蕩茶味清正，小生先置好人坑；")
            : (goodSlots.slice(0, 2).map(seatLabel).join("、") + " 前面講話比較誠懇，我先放進好人坑；"))))
      : "";
    const wolfText = wolfSlots.length > 0
      ? (spReg === "classical"
        ? ("綜觀前席已言諸人，狼籍首當深究 " + wolfSlots.map(seatLabel).join(" 及 ") + "！")
        : (spReg === "guzheng"
          ? ("細辨前席餘韻，失調可疑之狼坑首在 " + wolfSlots.map(seatLabel).join(" 與 ") + "！")
          : (spReg === "poetic"
            ? ("細品前面幾番對答，小生重點圈定的狼坑是 " + wolfSlots.map(seatLabel).join(" 跟 ") + "！")
            : ("目前前面講過的人裡，狼坑我重點圈 " + wolfSlots.map(seatLabel).join(" 跟 ") + "！"))))
      : "";
    const openPrefix = isLateSeat
      ? (leadPhrase + (spReg === "classical" ? "吾居末席總覽全場是非：" : (spReg === "guzheng" ? "晴嵐居末席為諸君收束餘韻：" : "我在末置位幫大家總結前面坑位：")))
      : (leadPhrase + cbNote);

    if (topSus && (speaker.suspicionMap[topSus.id] || 50) >= 54) {
      const focusTail = spReg === "classical"
        ? ("此輪吾票先指 " + seatLabel(topSus) + (secSus ? ("，並嚴察 " + seatLabel(secSus)) : "") + "！")
        : (spReg === "guzheng"
          ? ("本輪妾身焦點先落於 " + seatLabel(topSus) + (secSus ? ("，兼察 " + seatLabel(secSus)) : "") + "！")
          : ("這輪我的焦點先掛在 " + seatLabel(topSus) + (secSus ? ("，順便緊盯 " + seatLabel(secSus)) : "") + "！"));
      return {
        targetId: topSus.id,
        relationType: "suspect",
        accuseId: topSus.id,
        vouchId: goodSlots[0] ? goodSlots[0].id : null,
        wolfPits: wolfSlots.map(function (s) { return s.id; }),
        goodPits: goodSlots.map(function (s) { return s.id; }).slice(0, 2),
        hasToxicSlip: false,
        text: openPrefix + goodText + (prevVoteNote ? prevVoteNote : "") + wolfText + focusTail + unspokenNote + signoffPhrase
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
        text: openPrefix + goodText +
          (secondWatch ? (seatLabel(secondWatch) + " 的立場還不夠明朗我先保留一半疑點，") : "") +
          unspokenNote + signoffPhrase
      };
    }
  }

  if (topSpokenSus && (speaker.suspicionMap[topSpokenSus.id] || 50) >= 56) {
    return {
      targetId: topSpokenSus.id,
      relationType: "suspect",
      accuseId: topSpokenSus.id,
      vouchId: null,
      wolfPits: [topSpokenSus.id],
      goodPits: bestSpokenAlly && bestSpokenAlly.id !== topSpokenSus.id ? [bestSpokenAlly.id] : [],
      hasToxicSlip: false,
      text: (prevVoteNote ? (prevVoteNote + "而且") : (leadPhrase + cbNote)) +
        fill(flv.goodSus, { t: seatLabel(topSpokenSus) }) + unspokenNote
    };
  }

  if (bestSpokenAlly) {
    return {
      targetId: bestSpokenAlly.id,
      relationType: "trust",
      accuseId: null,
      vouchId: bestSpokenAlly.id,
      wolfPits: [],
      goodPits: [bestSpokenAlly.id],
      hasToxicSlip: false,
      text: leadPhrase + fill(flv.goodAlly, {
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
  if (out.vouchId && !isAliveOther(out.vouchId)) {
    if (out.targetId === out.vouchId) out.targetId = null;
    out.vouchId = null;
  }
  if (out.targetId && !isAliveOther(out.targetId)) {
    out.targetId = out.accuseId || out.vouchId || null;
  }
  if (!out.accuseId && !out.vouchId && !out.targetId) {
    out.relationType = null;
  }

  const cleanWolves = [];
  if (out.accuseId && isAliveOther(out.accuseId)) cleanWolves.push(out.accuseId);
  (Array.isArray(out.wolfPits) ? out.wolfPits : []).forEach(function (id) {
    if (isAliveOther(id) && id !== out.vouchId && cleanWolves.indexOf(id) === -1 && cleanWolves.length < 2) {
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

  return out;
}

function buildHeuristicAiSpeech(speaker) {
  const ctx = buildSpeechContext(speaker);
  const res = tryDefendOrCounterClaim(speaker, ctx)
    || tryRoleSpecificSpeech(speaker, ctx)
    || buildGoodTeamDeductionSpeech(speaker, ctx);
  if (typeof antiCheatMonitor !== "undefined" && speaker) {
    antiCheatMonitor.recordDecision("day_speech", speaker.id, "盲視發言推理完成");
  }
  return sanitizeSpeechMeta(speaker, res, ctx && ctx.snap);
}
