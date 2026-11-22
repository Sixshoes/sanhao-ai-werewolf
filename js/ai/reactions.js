/**
 * AI 高優先級反駁、神職身分對跳與各專屬角色（預言家/女巫/獵人/狼隊）發言決策
 */
"use strict";

function shouldWolfEmitToxicSlip(speaker, day, salt, panicBoost) {
  const diff = (typeof state !== "undefined" && state.aiDifficulty) ? state.aiDifficulty : "normal";
  let rate = diff === "easy" ? 0.65 : (diff === "pro" ? 0.18 : 0.38);
  if (panicBoost) {
    rate = diff === "easy" ? 0.85 : (diff === "pro" ? 0.35 : 0.58);
  }
  const roll = (((speaker.id * 41 + (day || 1) * 29 + (salt || 0) * 17) % 100) + 100) % 100;
  return (roll / 100) < rate;
}

function tryDefendOrCounterClaim(speaker, ctx) {
  const {
    aliveOthers, day, seatLabel, pickVoice, seerWolfOnMe, accuseOnMe, wolfPitOnMe,
    priorGodClaims, priorSameRoleSteal, slotPlan, dualSeerWorlds,
    spokenOthers, unspokenOthers, spokeToday
  } = ctx;

  const pVoice = typeof pickVoice === "function" ? pickVoice : function () { return ""; };
  const rebutLead = pVoice("rebutLead", 1);
  const stdLead = pVoice("lead", 2);
  const signoff = pVoice("signoff", 3) || "先這樣，過！";

  const baseGoodIds = (slotPlan && Array.isArray(slotPlan.goodPits))
    ? slotPlan.goodPits.map(function (s) { return s.id; })
    : [];
  const baseWolfIds = (slotPlan && Array.isArray(slotPlan.wolfPits))
    ? slotPlan.wolfPits.map(function (s) { return s.id; })
    : [];
  const mergePits = function (primaryId, pool, maxLen, banId) {
    const out = [];
    if (primaryId && primaryId !== speaker.id && primaryId !== banId) out.push(primaryId);
    (pool || []).forEach(function (id) {
      if (id && id !== speaker.id && id !== banId && out.indexOf(id) === -1 && out.length < (maxLen || 2)) {
        out.push(id);
      }
    });
    return out;
  };

  const playerSelf = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const playerIsWolf = Boolean(playerSelf && playerSelf.role === "wolf");
  const wolfTactic = (playerIsWolf && state.match && state.match.wolfTactic) ? state.match.wolfTactic : "auto";

  // 0PK. HIGHEST PRIORITY DURING TIE-BREAKER PK: Defend self & directly challenge PK rival!
  const isInPk = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive() && state.match.pkCandidates.indexOf(speaker.id) !== -1);
  if (isInPk) {
    const rivalId = state.match.pkCandidates.find(function (id) {
      if (id === speaker.id) return false;
      const rs = getSeat(id);
      return Boolean(rs && rs.alive);
    });
    const rival = rivalId ? getSeat(rivalId) : aliveOthers[0];
    const rName = rival ? seatLabel(rival) : "另一位平票對手";
    const rid = rival ? rival.id : null;
    const pkWolfPits = mergePits(rid, baseWolfIds, 2, null);

    if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
      speaker.claimedRole = "seer";
      const aliveChecks = speaker.checkedHistory.filter(function (c) {
        const ts = getSeat(c.targetId);
        return Boolean(ts && ts.alive);
      });
      const focusChk = aliveChecks.slice().reverse().find(function (c) { return c.isWolf; })
        || aliveChecks[aliveChecks.length - 1]
        || speaker.checkedHistory[speaker.checkedHistory.length - 1];
      const chkSeat = getSeat(focusChk.targetId);
      const chkLbl = chkSeat ? seatLabel(chkSeat) : ("0" + focusChk.targetId + "號");
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimSeer: true,
        claimRole: "seer",
        accuseId: rid,
        vouchId: (!focusChk.isWolf && chkSeat && chkSeat.alive && chkSeat.id !== speaker.id) ? focusChk.targetId : null,
        wolfPits: pkWolfPits,
        goodPits: mergePits((!focusChk.isWolf && chkSeat && chkSeat.alive) ? focusChk.targetId : null, baseGoodIds, 2, rid),
        checkedWolfId: focusChk.isWolf ? focusChk.targetId : null,
        checkedGoodId: focusChk.isWolf ? null : focusChk.targetId,
        hasToxicSlip: false,
        text: rebutLead + "平票 PK 我必須搶救清白！我是真正的明心觀察員，查證過 " + chkLbl + " 是" + (focusChk.isWolf ? "酸民狼" : "好夥伴") + "！把我投離席好人會失去查證視野，請非平票夥伴務必轉投 " + rName + "！" + signoff
      };
    }
    if (speaker.role === "witch") {
      speaker.claimedRole = "witch";
      speaker.witchAnnouncedSave = true;
      const svSeat = speaker.savedSeatId ? getSeat(speaker.savedSeatId) : null;
      const saveProof = svSeat ? ("之前晚上是我用暖心回甘茶護回 " + seatLabel(svSeat) + "，") : "";
      const vId = (svSeat && svSeat.alive && svSeat.id !== speaker.id) ? svSeat.id : null;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "witch",
        accuseId: rid,
        vouchId: vId,
        wolfPits: pkWolfPits,
        goodPits: mergePits(vId, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: rebutLead + "進入平票 PK 我直接亮出滴水奉茶師底牌！" + saveProof + "好人千萬別在 PK 把核心神職投出去，對比兩邊發言誠懇度，請大家這輪集中把票投給 " + rName + "！" + signoff
      };
    }
    if (speaker.role === "hunter") {
      speaker.claimedRole = "hunter";
      speaker.hunterAnnounced = true;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "hunter",
        accuseId: rid,
        vouchId: null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(null, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: rebutLead + "平票 PK 直接亮底牌提醒全場：我是直心糾察長！把我投出局不只少一張正氣票，我離席還會發動共鳴帶走 " + rName + "；反過來若大家把票集中在 " + rName + " 就能穩住局勢！" + signoff
      };
    }
    if (speaker.role === "guard") {
      speaker.claimedRole = "guard";
      const gLast = state.match.lastGuardTargetId;
      const gSeat = gLast ? getSeat(gLast) : null;
      const gNote = gSeat ? ("昨晚我展開結界守護過 " + seatLabel(gSeat) + "，") : "每晚我都謹慎交錯守護避免同守破盾，";
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "guard",
        accuseId: rid,
        vouchId: gSeat && gSeat.alive && gSeat.id !== rid ? gSeat.id : null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(gSeat && gSeat.alive && gSeat.id !== rid ? gSeat.id : null, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: rebutLead + "平票 PK 我直接拍出護心守衛底牌！" + gNote + "好人千萬別在 PK 把守衛投走讓神職裸奔，請大家這輪集中把票投給 " + rName + "！" + signoff
      };
    }
    if (speaker.team === "wolf") {
      const slipPk = wolfTactic === "deep_stealth" ? false : shouldWolfEmitToxicSlip(speaker, day, 9);
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimSeer: speaker.claimedRole === "seer",
        claimRole: speaker.claimedRole || null,
        accuseId: rid,
        vouchId: null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(null, baseGoodIds, 2, rid),
        hasToxicSlip: slipPk,
        text: rebutLead + "進到平票 PK 我跟大家把話說清楚：我一直認真配合好人對齊視角，完全沒理由亂帶風向；反觀 " + rName + " 前面立場模糊又挑動對立，請還沒投票的好人夥伴看清差距、改投 " + rName + "！" + signoff
      };
    }
    return {
      targetId: rid,
      relationType: rid ? "suspect" : null,
      accuseId: rid,
      vouchId: null,
      wolfPits: pkWolfPits,
      goodPits: mergePits(null, baseGoodIds, 2, rid),
      hasToxicSlip: false,
      text: rebutLead + "進到平票 PK 我再懇切申辯一次：我只是個始終講理、零挑撥的好夥伴，如果出局太冤枉了！比起我，" + rName + " 的發言破綻和站邊更讓人不放心，拜託好人把這輪關鍵票集中投給 " + rName + "！" + signoff
    };
  }

  // 0A. HIGHEST PRIORITY: Someone earlier today claimed Seer and called ME a Wolf!!
  if (seerWolfOnMe) {
    const accSeat = getSeat(seerWolfOnMe.speakerId);
    const accName = seatLabel(accSeat);
    speaker.suspicionMap[seerWolfOnMe.speakerId] = 100;
    const wPits0A = mergePits(seerWolfOnMe.speakerId, baseWolfIds, 2, null);

    if (speaker.team === "good") {
      if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
        speaker.claimedRole = "seer";
        const aliveChks = speaker.checkedHistory.filter(function (c) {
          const cs = getSeat(c.targetId);
          return Boolean(cs && cs.alive);
        });
        const myBest = aliveChks.slice().reverse().find(function (c) { return c.isWolf; })
          || speaker.checkedHistory[speaker.checkedHistory.length - 1];
        const myBestSeat = getSeat(myBest.targetId);
        const myTarget = seatLabel(myBestSeat);
        const v0A = (!myBest.isWolf && myBestSeat && myBestSeat.alive) ? myBest.targetId : null;
        return {
          targetId: seerWolfOnMe.speakerId,
          relationType: "suspect",
          claimSeer: true,
          accuseId: seerWolfOnMe.speakerId,
          vouchId: v0A,
          wolfPits: mergePits(seerWolfOnMe.speakerId, myBest.isWolf ? [myBest.targetId].concat(wPits0A) : wPits0A, 2, v0A),
          goodPits: mergePits(v0A, baseGoodIds, 2, seerWolfOnMe.speakerId),
          standWithSeerId: speaker.id,
          checkedWolfId: myBest.isWolf ? myBest.targetId : null,
          checkedGoodId: myBest.isWolf ? null : myBest.targetId,
          hasToxicSlip: false,
          text: rebutLead + "前置位 " + accName + " 竟然冒充明心觀察員硬把我查進狼坑？！我才是真觀察員，查證過 " + myTarget + "（" + (myBest.isWolf ? "酸民狼" : "好人") + "）！他敢直接污衊我，百分百證明 " + accName + " 才是冒牌狼坑位，大家直接集中投他！" + signoff
        };
      }
      if (speaker.role === "witch") {
        speaker.claimedRole = "witch";
        speaker.witchAnnouncedSave = true;
        const saveNote = speaker.savedSeatId ? ("我之前還用暖心回甘茶護回過 0" + speaker.savedSeatId + "號，") : "";
        return {
          targetId: seerWolfOnMe.speakerId,
          relationType: "suspect",
          claimRole: "witch",
          accuseId: seerWolfOnMe.speakerId,
          vouchId: speaker.savedSeatId || null,
          wolfPits: wPits0A,
          goodPits: mergePits(speaker.savedSeatId || null, baseGoodIds, 2, seerWolfOnMe.speakerId),
          hasToxicSlip: false,
          text: rebutLead + "前置位 " + accName + " 居然假冒明心觀察員硬把我點進狼坑？！我直接亮出滴水奉茶師底牌給大家看，" + saveNote + "我百分之百是好夥伴，這直接鐵證 " + accName + " 就是冒牌酸民狼，這輪一起投 " + accName + "！" + signoff
        };
      }
      if (speaker.role === "hunter") {
        speaker.claimedRole = "hunter";
        speaker.hunterAnnounced = true;
        return {
          targetId: seerWolfOnMe.speakerId,
          relationType: "suspect",
          claimRole: "hunter",
          accuseId: seerWolfOnMe.speakerId,
          vouchId: null,
          wolfPits: wPits0A,
          goodPits: mergePits(null, baseGoodIds, 2, seerWolfOnMe.speakerId),
          hasToxicSlip: false,
          text: rebutLead + "前置位 " + accName + " 居然敢假扮觀察員把我點進狼坑？我直接亮出直心糾察長底牌提醒全場：我是正氣好夥伴，這證明 " + accName + " 鐵定在狼坑裡！大家這輪投他，不然我離席一定發動共鳴帶他一起冷靜！"
        };
      }
      return {
        targetId: seerWolfOnMe.speakerId,
        relationType: "suspect",
        accuseId: seerWolfOnMe.speakerId,
        vouchId: null,
        wolfPits: wPits0A,
        goodPits: mergePits(null, baseGoodIds, 2, seerWolfOnMe.speakerId),
        hasToxicSlip: false,
        text: rebutLead + "剛剛前置位 " + accName + " 突然跳觀察員硬把我查進狼坑，這完全是睜眼說瞎話！我只是個存好心的好夥伴，他連查驗都能編造，直接證明 " + accName + " 就是冒牌狼！這輪我堅決反投 " + accName + "！" + signoff
      };
    } else {
      return {
        targetId: seerWolfOnMe.speakerId,
        relationType: "suspect",
        accuseId: seerWolfOnMe.speakerId,
        vouchId: null,
        wolfPits: wPits0A,
        goodPits: mergePits(null, baseGoodIds, 2, seerWolfOnMe.speakerId),
        hasToxicSlip: wolfTactic === "deep_stealth" ? false : shouldWolfEmitToxicSlip(speaker, day, 1, true),
        text: rebutLead + "別亂栽贓好不好！剛剛前置位 " + accName + " 自稱觀察員就硬把我打進狼坑，根本想搶話語權把好人推出去吧？我明明是清白好人，請大家別信 " + accName + " 一面之詞，這輪我堅持反投 " + accName + "！"
      };
    }
  }

  // 0B. DIRECT REACTION WHEN PUT IN SOMEONE'S WOLF PIT TODAY (accuseId OR wolfPits)!
  const pitCallerEv = wolfPitOnMe || accuseOnMe;
  if (pitCallerEv && speaker.role !== "seer") {
    const accSeat = getSeat(pitCallerEv.speakerId);
    const accName = seatLabel(accSeat);
    const inPitOnly = pitCallerEv.accuseId !== speaker.id && Array.isArray(pitCallerEv.wolfPits) && pitCallerEv.wolfPits.indexOf(speaker.id) !== -1;
    const pitPhrase = inPitOnly ? ("前置位 " + accName + " 剛才把我點進狼坑") : ("前置位 " + accName + " 剛才點名把我打進狼坑");
    const goodAllySpoken = spokenOthers.find(function (s) {
      return s.id !== pitCallerEv.speakerId && (speaker.suspicionMap[s.id] || 50) <= 46;
    });
    const unspokenTail = unspokenOthers.length > 0
      ? ("後置位 " + seatLabel(unspokenOthers[0]) + " 還沒發言，暫時留著待聽表水。")
      : "";

    if (speaker.team === "good") {
      if (speaker.role === "hunter" && !speaker.hunterAnnounced) {
        const secondSus = baseWolfIds.find(function (id) { return id !== pitCallerEv.speakerId; });
        const secondSeat = secondSus ? getSeat(secondSus) : null;
        speaker.claimedRole = "hunter";
        speaker.hunterAnnounced = true;
        return {
          targetId: pitCallerEv.speakerId,
          relationType: "suspect",
          claimRole: "hunter",
          accuseId: pitCallerEv.speakerId,
          vouchId: goodAllySpoken ? goodAllySpoken.id : null,
          wolfPits: mergePits(pitCallerEv.speakerId, baseWolfIds, 2, goodAllySpoken ? goodAllySpoken.id : null),
          goodPits: mergePits(goodAllySpoken ? goodAllySpoken.id : null, baseGoodIds, 2, pitCallerEv.speakerId),
          hasToxicSlip: false,
          text: rebutLead + pitPhrase + "真是踩進鐵板了！我先亮明直心糾察長把自己摘出狼坑：如果有人硬推我離席，我一定直接共鳴帶走 " + accName + "！目前我看狼坑至少要檢視 " + accName + (secondSeat ? (" 跟 " + seatLabel(secondSeat)) : "") + "，" + signoff
        };
      }

      const accIsSavedAlly = (speaker.role === "witch" && speaker.savedSeatId === pitCallerEv.speakerId);
      const accCalmTrusted = !pitCallerEv.hasToxicSlip && (speaker.suspicionMap[pitCallerEv.speakerId] || 50) < 52 && !inPitOnly;
      if (accIsSavedAlly || accCalmTrusted) {
        const realSus = aliveOthers
          .filter(function (s) {
            if (s.id === pitCallerEv.speakerId) return false;
            if (speaker.role === "witch" && s.id === speaker.savedSeatId) return false;
            return (speaker.suspicionMap[s.id] || 50) >= 54;
          })
          .sort(function (a, b) { return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50); })[0] || null;
        const wPitsCalm = mergePits(realSus ? realSus.id : null, baseWolfIds, 2, pitCallerEv.speakerId);
        return {
          targetId: realSus ? realSus.id : null,
          relationType: realSus ? "suspect" : null,
          accuseId: realSus ? realSus.id : null,
          vouchId: accIsSavedAlly ? pitCallerEv.speakerId : (goodAllySpoken ? goodAllySpoken.id : null),
          wolfPits: wPitsCalm,
          goodPits: mergePits(accIsSavedAlly ? pitCallerEv.speakerId : (goodAllySpoken ? goodAllySpoken.id : null), baseGoodIds, 2, realSus ? realSus.id : null),
          hasToxicSlip: false,
          text: rebutLead + "先正面回應 " + pitPhrase + "：我自己知道我的底牌，我絕對不在狼坑裡，別因為誤解互相抗推！" +
            (goodAllySpoken ? (seatLabel(goodAllySpoken) + " 比較像好人坑，") : "") +
            (realSus ? ("真正該盯的狼坑反而是 " + seatLabel(realSus) + "。") : "大家聽完後置位表水再對齊狼坑。") + unspokenTail + signoff
        };
      }

      // If Dual Seers active while being placed in a wolf pit, tie defense cleanly to World A vs B!
      if (dualSeerWorlds && dualSeerWorlds.chosenWorld && dualSeerWorlds.rivalWorld) {
        const dw = dualSeerWorlds;
        const cw = dw.chosenWorld;
        const rw = dw.rivalWorld;
        const standLbl = seatLabel(cw.trustedSeer);
        const rivalLbl = seatLabel(rw.trustedSeer);
        const cw2Lbl = cw.secondWolf ? ("＋" + seatLabel(cw.secondWolf)) : "";
        const rw2Lbl = rw.secondWolf ? ("＋" + seatLabel(rw.secondWolf)) : "";
        const wPitsDw = mergePits(pitCallerEv.speakerId, cw.wolfPits.map(function (s) { return s.id; }), 2, cw.trustedSeer.id);
        return {
          targetId: pitCallerEv.speakerId,
          relationType: "suspect",
          accuseId: pitCallerEv.speakerId,
          vouchId: cw.trustedSeer.id,
          standWithSeerId: cw.trustedSeer.id,
          wolfPits: wPitsDw,
          goodPits: mergePits(cw.trustedSeer.id, baseGoodIds, 2, pitCallerEv.speakerId),
          hasToxicSlip: false,
          text: rebutLead + pitPhrase + "，這我必須接招！我百分之百不在狼坑裡，剛好把雙觀察員盤清楚：站 " + standLbl + " 狼坑是 " + seatLabel(cw.fakeSeer) + cw2Lbl + "，站 " + rivalLbl + " 狼坑才變成 " + seatLabel(rw.fakeSeer) + rw2Lbl + "！你硬把我擠進狼坑反而像幫假牌墊坑，我先站邊 " + standLbl + "，反把 " + accName + " 打進狼坑！"
        };
      }

      const wPitsDef = mergePits(pitCallerEv.speakerId, baseWolfIds, 2, goodAllySpoken ? goodAllySpoken.id : null);
      const pitNamesStr = wPitsDef.map(function (id) { return seatLabel(getSeat(id)); }).join(" 跟 ");
      return {
        targetId: pitCallerEv.speakerId,
        relationType: "suspect",
        accuseId: pitCallerEv.speakerId,
        vouchId: goodAllySpoken ? goodAllySpoken.id : null,
        wolfPits: wPitsDef,
        goodPits: mergePits(goodAllySpoken ? goodAllySpoken.id : null, baseGoodIds, 2, pitCallerEv.speakerId),
        hasToxicSlip: false,
        text: rebutLead + pitPhrase + "，這裡我一定要講清楚：我全程理性找線索，根本不在狼坑裡！反而是 " + accName + " 沒實錘就急著把我劃進狼坑帶風向；若要我點坑，" +
          (goodAllySpoken ? (seatLabel(goodAllySpoken) + " 先放好人坑，") : "") +
          "我懷疑的狼坑是 " + pitNamesStr + "！" + unspokenTail + signoff
      };
    } else {
      const spokenNonWolf = spokenOthers.filter(function (s) { return s.role !== "wolf" && s.id !== pitCallerEv.speakerId; });
      const secondFakePit = spokenNonWolf[0] || aliveOthers.find(function (s) { return s.role !== "wolf" && s.id !== pitCallerEv.speakerId; });
      const wolfFakePits = mergePits(pitCallerEv.speakerId, secondFakePit ? [secondFakePit.id] : [], 2, null);
      const secClause = secondFakePit
        ? (spokeToday(secondFakePit.id)
          ? ("另外剛才發言過的 " + seatLabel(secondFakePit) + " 我也覺得待檢視")
          : ("至於後置位 " + seatLabel(secondFakePit) + " 還沒發言，待會我也會重點聽他表水"))
        : "";
      return {
        targetId: pitCallerEv.speakerId,
        relationType: "suspect",
        accuseId: pitCallerEv.speakerId,
        vouchId: null,
        wolfPits: wolfFakePits,
        goodPits: [],
        hasToxicSlip: wolfTactic === "deep_stealth" ? false : shouldWolfEmitToxicSlip(speaker, day, 3),
        text: rebutLead + pitPhrase + "實在太草率了吧？我被 " + accName + " 硬塞進狼坑當替罪羊！依我看想混淆視聽的狼坑就是 " + accName + (secClause ? ("，" + secClause) : "") + "，這輪我先反點 " + accName + "！" + signoff
      };
    }
  }

  // 0C. REAL GOD ROLE STOLEN! If someone earlier stole MY exact Witch or Hunter role, IMMEDIATELY counter-claim!
  if (priorSameRoleSteal && (speaker.role === "witch" || speaker.role === "hunter")) {
    const thief = getSeat(priorSameRoleSteal.speakerId);
    const thiefName = seatLabel(thief);
    const myRoleName = ROLE_DEFS[speaker.role].name;
    speaker.claimedRole = speaker.role;
    if (speaker.role === "witch") speaker.witchAnnouncedSave = true;
    if (speaker.role === "hunter") speaker.hunterAnnounced = true;
    speaker.suspicionMap[priorSameRoleSteal.speakerId] = 100;
    const v0C = (speaker.role === "witch" && speaker.savedSeatId) ? speaker.savedSeatId : null;
    const extraProof = v0C
      ? ("之前晚上是我端暖心回甘茶護回了 0" + v0C + "號，")
      : (speaker.role === "hunter" ? "如果大家誤投我，我離席一定發動共鳴帶他一起冷靜，" : "");
    return {
      targetId: priorSameRoleSteal.speakerId,
      relationType: "suspect",
      claimRole: speaker.role,
      accuseId: priorSameRoleSteal.speakerId,
      vouchId: v0C,
      wolfPits: mergePits(priorSameRoleSteal.speakerId, baseWolfIds, 2, v0C),
      goodPits: mergePits(v0C, baseGoodIds, 2, priorSameRoleSteal.speakerId),
      hasToxicSlip: false,
      text: rebutLead + "前置位 " + thiefName + " 竟然敢冒充我的" + myRoleName + "身分？！我才是真正的" + myRoleName + "，" + extraProof + "全場聽清楚了，敢冒充身分的 " + thiefName + " 百分百佔一狼坑，這輪直接把 " + thiefName + " 請離茶席！" + signoff
    };
  }

  // 0D. DYNAMIC WOLF COUNTER-CLAIM DECISION! When a God role claimed earlier, Wolves actively decide whether to counter-claim (對跳) or cast doubt!
  if (speaker.role === "wolf" && wolfTactic !== "deep_stealth" && priorGodClaims.length > 0 && !speaker.claimedRole) {
    const latestGodEv = priorGodClaims[priorGodClaims.length - 1];
    const godSeat = getSeat(latestGodEv.speakerId);
    const godName = seatLabel(godSeat);
    const claimedR = latestGodEv.claimRole;
    const wolfTeamAlreadyCountered = state.match.seats.some(function (s) {
      return s.role === "wolf" && s.claimedRole === claimedR;
    });

    if (!wolfTeamAlreadyCountered && godSeat && godSeat.team === "good") {
      const counterProb = claimedR === "seer" ? 0.78 : (claimedR === "witch" ? 0.45 : 0.35);
      const deterministicRoll = ((speaker.id * 37 + day * 19 + latestGodEv.speakerId * 13) % 100) / 100;
      if (speaker.fakeSeer && claimedR === "seer" || deterministicRoll < counterProb) {
        speaker.claimedRole = claimedR;
        if (claimedR === "seer") {
          speaker.fakeSeer = true;
          return {
            targetId: godSeat.id,
            relationType: "suspect",
            claimSeer: true,
            claimRole: "seer",
            accuseId: godSeat.id,
            vouchId: null,
            checkedWolfId: godSeat.id,
            checkedGoodId: null,
            hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 4),
            text: rebutLead + "剛才 " + godName + " 居然敢搶先冒充明心觀察員騙大家！我才是這局真正的觀察員，昨晚我查驗的就是 " + godName + "，他根本是想帶亂風向的酸民狼！好人別被先開口的人唬住，這輪直接投 " + godName + "！" + signoff
          };
        } else if (claimedR === "witch") {
          return {
            targetId: godSeat.id,
            relationType: "suspect",
            claimRole: "witch",
            accuseId: godSeat.id,
            vouchId: null,
            hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 4),
            text: rebutLead + "剛才 " + godName + " 憑什麼自稱滴水奉茶師啊？我才是真正握著暖心茶的奉茶師！他剛剛講的根本是在編故事替同伴洗白，敢亂冒充身分的 " + godName + " 鐵定是酸民狼，大家這輪直接投 " + godName + "！"
          };
        } else if (claimedR === "hunter") {
          return {
            targetId: godSeat.id,
            relationType: "suspect",
            claimRole: "hunter",
            accuseId: godSeat.id,
            vouchId: null,
            hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 4),
            text: rebutLead + "剛才 " + godName + " 竟然敢冒充我的直心糾察長身分嚇唬大家？！我才是真正的糾察長，他就是怕被投才亂穿衣服，這輪請大家把冒牌貨 " + godName + " 投出去！"
          };
        }
      } else {
        const rName = ROLE_DEFS[claimedR].name;
        const otherGood = aliveOthers.find(function (s) { return s.role !== "wolf" && s.id !== godSeat.id; }) || godSeat;
        return {
          targetId: otherGood.id,
          relationType: "suspect",
          accuseId: otherGood.id,
          vouchId: null,
          hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 5),
          text: stdLead + "聽到 " + godName + " 跳出來自稱" + rName + "，老實說大家先別急著百分百相信耶，萬一是酸民狼演戲博同情怎麼辦？目前看下來 " + seatLabel(otherGood) + " 反應也很可疑，建議這輪先把票集中在 " + seatLabel(otherGood) + "！" + signoff
        };
      }
    }
  }
  return null;
}

function tryRoleSpecificSpeech(speaker, ctx) {
  const {
    aliveOthers, day, spokenIdsToday, spokenOthers, unspokenOthers, spokeToday,
    isFirstToday, flv, seatLabel, fill, prevVoteNote, prevVoteSuspect,
    priorFakeSeerEv, wolfPitOnMe, slotPlan, dualSeerWorlds
  } = ctx;

  const baseGoodIds = (slotPlan && Array.isArray(slotPlan.goodPits)) ? slotPlan.goodPits.map(function (s) { return s.id; }) : [];
  const baseWolfIds = (slotPlan && Array.isArray(slotPlan.wolfPits)) ? slotPlan.wolfPits.map(function (s) { return s.id; }) : [];

  // 1. Real Seer: Multi-night memory (prioritize alive checked Wolf -> alive fake-Seer -> latest check)
  if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
    const aliveChecks = speaker.checkedHistory.filter(function (c) {
      const cs = getSeat(c.targetId);
      return Boolean(cs && cs.alive);
    });
    const aliveWolfCheck = aliveChecks.slice().reverse().find(function (c) { return c.isWolf; });
    const latest = aliveWolfCheck || aliveChecks[aliveChecks.length - 1] || speaker.checkedHistory[speaker.checkedHistory.length - 1];
    const targetObj = getSeat(latest.targetId);
    const latestAlive = Boolean(targetObj && targetObj.alive);
    const tName = seatLabel(targetObj);
    const targetSpoke = spokenIdsToday.indexOf(latest.targetId) !== -1;
    const pitRebut = wolfPitOnMe
      ? ("先回應前置位 " + seatLabel(getSeat(wolfPitOnMe.speakerId)) + " 把我點進狼坑——你可把真正明心觀察員打進狼坑了！")
      : "";

    // Strategic Hide Rule: If Day 1, only checked a Good seat, nobody claimed Seer yet, and nobody put me in a wolf pit -> hide role!
    const shouldHideSeer = (day === 1 && !latest.isWolf && !priorFakeSeerEv && !wolfPitOnMe && speaker.claimedRole !== "seer" && speaker.deductionStyle === "skeptical");
    if (shouldHideSeer) {
      const watchSeat = unspokenOthers.find(function (s) { return s.id !== latest.targetId; }) || aliveOthers.find(function (s) { return s.id !== latest.targetId; });
      return {
        targetId: latestAlive ? latest.targetId : null,
        relationType: latestAlive ? "trust" : null,
        claimSeer: false,
        accuseId: null,
        vouchId: latestAlive ? latest.targetId : null,
        wolfPits: [],
        goodPits: latestAlive ? [latest.targetId] : [],
        hasToxicSlip: false,
        text: (isFirstToday ? "我排在起手位先保守一點，現在場上發言還不多不想太早暴露立場。" : "綜合前置位幾個人的發言，我覺得局勢還不明朗。") +
          "我目前直覺 " + tName + " 比較像好人坑先暫時放進去；接下來我們多觀察後置位 " + seatLabel(watchSeat) + " 表水後的邏輯！"
      };
    }

    speaker.claimedRole = "seer";
    const checkedIdsAll = speaker.checkedHistory.map(function (c) { return c.targetId; });
    const nextPlan = aliveOthers.find(function (s) { return checkedIdsAll.indexOf(s.id) === -1 && s.id !== latest.targetId; });
    const fakeSeerSeat = priorFakeSeerEv ? getSeat(priorFakeSeerEv.speakerId) : null;
    const fakeSeerAlive = Boolean(fakeSeerSeat && fakeSeerSeat.alive && fakeSeerSeat.id !== speaker.id);
    const fakeCallout = priorFakeSeerEv ? ("剛才前置位 " + seatLabel(fakeSeerSeat) + " 根本是在冒充明心觀察員騙人，") : "";
    const planNote = nextPlan ? ("今晚我計畫再去查驗 " + seatLabel(nextPlan) + " 幫大家把關！") : "";
    const checkedGoods = aliveChecks.filter(function (c) { return !c.isWolf; }).map(function (c) { return c.targetId; });
    const checkedWolves = aliveChecks.filter(function (c) { return c.isWolf; }).map(function (c) { return c.targetId; });

    if (latest.isWolf && latestAlive) {
      const wPits = [latest.targetId];
      if (fakeSeerAlive && wPits.indexOf(fakeSeerSeat.id) === -1) wPits.push(fakeSeerSeat.id);
      if (wolfPitOnMe && wPits.length < 2 && wPits.indexOf(wolfPitOnMe.speakerId) === -1) wPits.push(wolfPitOnMe.speakerId);
      return {
        targetId: latest.targetId,
        relationType: "suspect",
        claimSeer: true,
        accuseId: latest.targetId,
        vouchId: checkedGoods[0] || null,
        standWithSeerId: speaker.id,
        wolfPits: wPits,
        goodPits: checkedGoods,
        checkedWolfId: latest.targetId,
        checkedGoodId: null,
        hasToxicSlip: false,
        text: pitRebut + fakeCallout + fill(flv.seerWolf, {
          t: tName,
          ctx: targetSpoke ? "剛剛前置位他講話根本在混淆視聽，" : "他今天還沒輪到發言，待會一定會找理由狡辯，"
        }) + planNote
      };
    } else if (fakeSeerAlive) {
      const secondPit = wolfPitOnMe && wolfPitOnMe.speakerId !== fakeSeerSeat.id ? wolfPitOnMe.speakerId : checkedWolves[0];
      const wPitsFake = secondPit ? [fakeSeerSeat.id, secondPit] : [fakeSeerSeat.id];
      return {
        targetId: fakeSeerSeat.id,
        relationType: "suspect",
        claimSeer: true,
        accuseId: fakeSeerSeat.id,
        vouchId: (!latest.isWolf && latestAlive) ? latest.targetId : null,
        standWithSeerId: speaker.id,
        wolfPits: wPitsFake,
        goodPits: (!latest.isWolf && latestAlive) ? [latest.targetId] : checkedGoods,
        checkedWolfId: null,
        checkedGoodId: (!latest.isWolf && latestAlive) ? latest.targetId : null,
        hasToxicSlip: false,
        text: pitRebut + fakeCallout +
          (!latest.isWolf
            ? ("另外我查證過 " + tName + (latestAlive ? " 是金水好人坑，大家別投錯他；" : "（雖已離席）確定是好人；"))
            : ("先前查過的 " + tName + " 已離席；")) +
          "站我這邊第一個狼坑就是冒充觀察員的 " + seatLabel(fakeSeerSeat) + (secondPit ? ("，第二狼坑先盯 " + seatLabel(getSeat(secondPit)) + "！") : "！") + planNote
      };
    } else {
      const watchSeat = nextPlan || unspokenOthers.find(function (s) { return s.id !== latest.targetId; }) || aliveOthers.find(function (s) { return s.id !== latest.targetId; });
      const susWatch = (wolfPitOnMe ? getSeat(wolfPitOnMe.speakerId) : null) || ((watchSeat && (speaker.suspicionMap[watchSeat.id] || 50) >= 56) ? watchSeat : null);
      return {
        targetId: (!latest.isWolf && latestAlive) ? latest.targetId : (watchSeat ? watchSeat.id : null),
        relationType: (!latest.isWolf && latestAlive) ? "trust" : (susWatch ? "suspect" : null),
        claimSeer: true,
        accuseId: susWatch ? susWatch.id : null,
        vouchId: (!latest.isWolf && latestAlive) ? latest.targetId : null,
        standWithSeerId: speaker.id,
        wolfPits: susWatch ? [susWatch.id] : [],
        goodPits: (!latest.isWolf && latestAlive) ? [latest.targetId] : checkedGoods,
        checkedWolfId: null,
        checkedGoodId: (!latest.isWolf && latestAlive) ? latest.targetId : null,
        hasToxicSlip: false,
        text: pitRebut + (latestAlive
          ? (fill(flv.seerGood, { t: tName, next: seatLabel(watchSeat) }) + (nextPlan ? ("今晚我也會優先查驗 " + seatLabel(nextPlan) + "。") : ""))
          : ("我是明心觀察員，先前查驗過的 " + tName + " 已經離席了，接下來我們重點檢視 " + seatLabel(watchSeat) + (nextPlan ? ("，今晚我優先查驗 " + seatLabel(nextPlan) + "！") : "！")))
      };
    }
  }

  // 2. Fake-Seer Wolf weaving an in-character deceptive counter-claim with fresh check history
  const pSeatRef = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const pIsWolfTeam = Boolean(pSeatRef && pSeatRef.role === "wolf");
  const curWolfTactic = (pIsWolfTeam && state.match && state.match.wolfTactic) ? state.match.wolfTactic : "auto";
  const wantFakeSeer = (speaker.fakeSeer || (curWolfTactic === "fake_seer" && !state.match.seats.some(function (s) { return s.role === "wolf" && s.claimedRole === "seer"; })))
    && curWolfTactic !== "deep_stealth";
  if (speaker.role === "wolf" && wantFakeSeer) {
    speaker.claimedRole = "seer";
    if (!speaker.fakeCheckedIds) speaker.fakeCheckedIds = [];
    const nonWolves = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    if (nonWolves.length > 0) {
      const realSeerSpoke = spokenOthers.find(function (s) { return s.role === "seer" && s.claimedRole === "seer"; });
      const freshTarget = nonWolves.find(function (s) { return speaker.fakeCheckedIds.indexOf(s.id) === -1; });
      const frameTarget = (realSeerSpoke && speaker.fakeCheckedIds.indexOf(realSeerSpoke.id) === -1)
        ? realSeerSpoke
        : (freshTarget || realSeerSpoke || nonWolves[0]);
      if (speaker.fakeCheckedIds.indexOf(frameTarget.id) === -1) {
        speaker.fakeCheckedIds.push(frameTarget.id);
      }
      const secondFrame = nonWolves.find(function (s) { return s.id !== frameTarget.id; });
      return {
        targetId: frameTarget.id,
        relationType: "suspect",
        claimSeer: true,
        claimRole: "seer",
        accuseId: frameTarget.id,
        vouchId: null,
        standWithSeerId: speaker.id,
        wolfPits: secondFrame ? [frameTarget.id, secondFrame.id] : [frameTarget.id],
        goodPits: [],
        checkedWolfId: frameTarget.id,
        checkedGoodId: null,
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 2),
        text: fill(flv.fakeSeer, { t: seatLabel(frameTarget) })
      };
    }
  }

  // 3. Witch stepping forward ONCE to vouch for rescued player (做好事!)
  if (speaker.role === "witch" && speaker.savedSeatId && day >= 2 && !speaker.witchAnnouncedSave) {
    const saved = getSeat(speaker.savedSeatId);
    if (saved && saved.alive) {
      speaker.claimedRole = "witch";
      speaker.witchAnnouncedSave = true;
      return {
        targetId: saved.id,
        relationType: "trust",
        claimRole: "witch",
        accuseId: null,
        vouchId: saved.id,
        wolfPits: baseWolfIds.slice(0, 2),
        goodPits: [saved.id],
        hasToxicSlip: false,
        text: fill(flv.witchSave, { t: seatLabel(saved) })
      };
    }
  }

  // 3.5 Hunter Deterrence: if Hunter is under heavy suspicion, reveal identity ONCE to stop wolves from pushing them out!
  if (speaker.role === "hunter" && day >= 1 && !speaker.hunterAnnounced) {
    const othersHeat = aliveOthers.reduce(function (sum, o) { return sum + (o.suspicionMap[speaker.id] || 50); }, 0) / Math.max(1, aliveOthers.length);
    if (othersHeat >= 58 || speaker.claimedRole === "hunter") {
      speaker.claimedRole = "hunter";
      speaker.hunterAnnounced = true;
      const topThreat = (spokenOthers.length ? spokenOthers : aliveOthers).slice().sort(function (a, b) {
        return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50);
      })[0];
      return {
        targetId: topThreat ? topThreat.id : null,
        relationType: topThreat ? "suspect" : null,
        claimRole: "hunter",
        accuseId: topThreat ? topThreat.id : null,
        vouchId: null,
        wolfPits: topThreat ? [topThreat.id] : [],
        goodPits: baseGoodIds.slice(0, 2),
        hasToxicSlip: false,
        text: "先跟全場亮明身分免得好人誤投：我是直心糾察長！如果今天有人想把票推到我頭上，我離席時會直接發動正氣共鳴帶走目前最像狼坑的 " + seatLabel(topThreat) + "，請好人跟我一起看清局勢！"
      };
    }
  }

  // 3.6 Guard Clarification: share night-shield info once if peaceful night happened or heat rises
  if (speaker.role === "guard" && day >= 2 && !speaker.guardAnnounced) {
    const gPrevId = state.match.lastGuardTargetId;
    const gTargetSeat = gPrevId ? getSeat(gPrevId) : null;
    const hadRecentPeace = (state.match.peaceNights || []).length > 0;
    const othersHeatG = aliveOthers.reduce(function (sum, o) { return sum + (o.suspicionMap[speaker.id] || 50); }, 0) / Math.max(1, aliveOthers.length);
    if (othersHeatG >= 56 || hadRecentPeace || speaker.claimedRole === "guard") {
      speaker.claimedRole = "guard";
      speaker.guardAnnounced = true;
      const vouchTarget = (gTargetSeat && gTargetSeat.alive && gTargetSeat.id !== speaker.id) ? gTargetSeat : null;
      const watchG = (baseWolfIds[0] && getSeat(baseWolfIds[0])) || aliveOthers[0] || null;
      return {
        targetId: vouchTarget ? vouchTarget.id : (watchG ? watchG.id : null),
        relationType: vouchTarget ? "trust" : (watchG ? "suspect" : null),
        claimRole: "guard",
        accuseId: watchG && (!vouchTarget || watchG.id !== vouchTarget.id) ? watchG.id : null,
        vouchId: vouchTarget ? vouchTarget.id : null,
        wolfPits: baseWolfIds.slice(0, 2),
        goodPits: vouchTarget ? [vouchTarget.id] : baseGoodIds.slice(0, 2),
        hasToxicSlip: false,
        text: vouchTarget
          ? ("我是護心守衛，交代守護資訊幫全場對齊：" + (hadRecentPeace ? "昨晚平安夜我正好看守了 " : "上一輪我守過 ") + seatLabel(vouchTarget) + "（避免與奉茶師同守破盾），接下來請大家留意 " + seatLabel(watchG || vouchTarget) + " 的漏洞！")
          : ("我是護心守衛，目前都錯開可能救援位謹慎巡防！建議大家先重點檢視 " + seatLabel(watchG || aliveOthers[0]) + " 的站邊與邏輯！")
      };
    }
  }

  // 4. Stealth Wolf (Coordinates with Fake-Seer partner, compares World A vs B plausibly & strictly obeys chronology!)
  if (speaker.role === "wolf") {
    const pVoiceRole = typeof ctx.pickVoice === "function" ? ctx.pickVoice : function () { return ""; };
    const wolfLead = pVoiceRole("lead", 4);
    const wolfDualLead = pVoiceRole("dualLead", 5);
    const wolfSignoff = pVoiceRole("signoff", 6) || "先這樣，過！";
    const goodSpoken = spokenOthers.filter(function (s) { return s.role !== "wolf"; });
    const goodAll = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    const wolfPartnerSeer = spokenOthers.find(function (s) { return s.role === "wolf" && s.claimedRole === "seer"; });
    const realSeerExposed = spokenOthers.find(function (s) { return s.role === "seer" && s.claimedRole === "seer"; });

    if (curWolfTactic === "pack_push") {
      const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
      const playerAccEv = (state.match.daySpeechEvents || []).find(function (ev) { return ev.speakerId === pidNow && ev.accuseId; });
      const playerTarget = playerAccEv ? getSeat(playerAccEv.accuseId) : null;
      if (playerTarget && playerTarget.alive && playerTarget.role !== "wolf") {
        const ptSpoke = spokeToday(playerTarget.id);
        return {
          targetId: playerTarget.id,
          relationType: "suspect",
          accuseId: playerTarget.id,
          vouchId: null,
          wolfPits: [playerTarget.id],
          goodPits: [],
          hasToxicSlip: false,
          text: wolfLead + "聽完前面分析，我也跟 " + seatLabel(getPlayerSeat()) + " 有同感，" +
            (ptSpoke ? (seatLabel(playerTarget) + " 剛才的發言確實破綻最多，") : (seatLabel(playerTarget) + " 雖然今天還沒開口，但前面立場很讓人懷疑，")) +
            "這輪我們先放一格狼坑在 " + seatLabel(playerTarget) + "！" + wolfSignoff
        };
      }
    }

    if (curWolfTactic === "deep_stealth") {
      const stealthTarget = goodSpoken[0] || goodAll[0] || aliveOthers[0];
      if (!stealthTarget) return null;
      const stSpoke = spokeToday(stealthTarget.id);
      const secGood = goodSpoken[1] || goodAll.find(function (s) { return s.id !== stealthTarget.id; });
      return {
        targetId: stealthTarget.id,
        relationType: "suspect",
        accuseId: stealthTarget.id,
        vouchId: null,
        wolfPits: secGood ? [stealthTarget.id, secGood.id] : [stealthTarget.id],
        goodPits: [],
        hasToxicSlip: false,
        text: stSpoke
          ? (wolfLead + "大家心平氣和把前面幾位盤一盤，我自己聽下來覺得前置位 " + seatLabel(stealthTarget) + " 講得有點保留，暫時記半格狼坑再檢視，" + wolfSignoff)
          : ("因為目前我順位比較靠前，" + seatLabel(stealthTarget) + (secGood ? (" 跟 " + seatLabel(secGood)) : "") + " 都還沒輪到發言，我就不亂點實狼坑了，先留著聽後面表水，" + wolfSignoff)
      };
    }

    // Dual-Seer Stealth Wolf: explicitly analyze BOTH worlds to make backing wolf partner sound credible!
    if (wolfPartnerSeer && realSeerExposed && dualSeerWorlds && dualSeerWorlds.chosenWorld && dualSeerWorlds.rivalWorld) {
      const partnerWorld = dualSeerWorlds.chosenWorld.trustedSeer.id === wolfPartnerSeer.id ? dualSeerWorlds.chosenWorld : dualSeerWorlds.rivalWorld;
      const realWorld = dualSeerWorlds.chosenWorld.trustedSeer.id === realSeerExposed.id ? dualSeerWorlds.chosenWorld : dualSeerWorlds.rivalWorld;
      const p2 = partnerWorld.secondWolf ? ("＋" + seatLabel(partnerWorld.secondWolf)) : "";
      const r2 = realWorld.secondWolf ? ("＋" + seatLabel(realWorld.secondWolf)) : "";
      return {
        targetId: realSeerExposed.id,
        relationType: "suspect",
        accuseId: realSeerExposed.id,
        vouchId: wolfPartnerSeer.id,
        standWithSeerId: wolfPartnerSeer.id,
        wolfPits: partnerWorld.wolfPits.map(function (s) { return s.id; }).slice(0, 2),
        goodPits: [wolfPartnerSeer.id],
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 6),
        text: (wolfDualLead || "兩位明心觀察員對跳我也盤一下雙邊狼坑：") + "如果站 " + seatLabel(realSeerExposed) + "，狼坑變 " + seatLabel(wolfPartnerSeer) + r2 + " 邏輯其實很勉強；反而站 " + seatLabel(wolfPartnerSeer) + "，狼坑就落在 " + seatLabel(realSeerExposed) + p2 + " 合理多了！我這輪站邊 " + seatLabel(wolfPartnerSeer) + "，出 " + seatLabel(realSeerExposed) + "！" + wolfSignoff
      };
    }

    if (wolfPartnerSeer && realSeerExposed) {
      return {
        targetId: realSeerExposed.id,
        relationType: "suspect",
        accuseId: realSeerExposed.id,
        vouchId: wolfPartnerSeer.id,
        standWithSeerId: wolfPartnerSeer.id,
        wolfPits: [realSeerExposed.id],
        goodPits: [wolfPartnerSeer.id],
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 6),
        text: wolfLead + "比較剛剛兩位自稱明心觀察員的人，我覺得 " + seatLabel(wolfPartnerSeer) + " 講得清楚多了，反倒是 " + seatLabel(realSeerExposed) + " 聽起來超像在硬掰演戲！我站邊 " + seatLabel(wolfPartnerSeer) + "，這輪先把 " + seatLabel(realSeerExposed) + " 打進首出狼坑！" + wolfSignoff
      };
    }

    if (isFirstToday) {
      const target = (prevVoteSuspect && prevVoteSuspect.role !== "wolf") ? prevVoteSuspect : (goodAll[0] || aliveOthers[0]);
      if (!target) return null;
      const secTarget = goodAll.find(function (s) { return s.id !== target.id; });
      if (prevVoteNote && prevVoteSuspect && prevVoteSuspect.role !== "wolf") {
        return {
          targetId: target.id,
          relationType: "suspect",
          accuseId: target.id,
          vouchId: null,
          wolfPits: secTarget ? [target.id, secTarget.id] : [target.id],
          goodPits: [],
          hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 7),
          text: wolfLead + prevVoteNote + (secTarget ? ("今天還排在後面的 " + seatLabel(secTarget) + " 待會也說清楚，") : "") + "目前我看 " + seatLabel(target) + " 嫌疑最大暫放第一狼坑，大家別浪費時間先出 " + seatLabel(target) + "！"
        };
      }
      return {
        targetId: target.id,
        relationType: "suspect",
        accuseId: target.id,
        vouchId: null,
        wolfPits: [],
        goodPits: [],
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 7),
        text: "我在起手位先起個頭，" + fill(flv.wolfFirst, { t: seatLabel(target) })
      };
    }

    const scapegoat = goodSpoken[0] || goodAll[0] || aliveOthers[0];
    if (!scapegoat) return null;
    const scSpoke = spokenIdsToday.indexOf(scapegoat.id) !== -1;
    const secScapegoat = goodSpoken.find(function (s) { return s.id !== scapegoat.id; }) || goodAll.find(function (s) { return s.id !== scapegoat.id; });
    return {
      targetId: scapegoat.id,
      relationType: "suspect",
      accuseId: scapegoat.id,
      vouchId: null,
      wolfPits: (scSpoke && secScapegoat && spokeToday(secScapegoat.id)) ? [scapegoat.id, secScapegoat.id] : (scSpoke ? [scapegoat.id] : []),
      goodPits: [],
      hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 8),
      text: fill(scSpoke ? flv.wolfSpoken : flv.wolfWait, { t: seatLabel(scapegoat) })
    };
  }
  return null;
}
