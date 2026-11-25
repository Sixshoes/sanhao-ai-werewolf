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
  if (typeof getPersonaToxicSlipScale === "function") {
    rate = clamp(rate * getPersonaToxicSlipScale(speaker), 0.08, 0.92);
  }
  const roll = (((speaker.id * 41 + (day || 1) * 29 + (salt || 0) * 17) % 100) + 100) % 100;
  return (roll / 100) < rate;
}

function tryDefendOrCounterClaim(speaker, ctx) {
  const {
    snap, getBlindSeat, aliveOthers, day, seatLabel, pickVoice, seerWolfOnMe, accuseOnMe, wolfPitOnMe,
    priorGodClaims, priorSameRoleSteal, slotPlan, dualSeerWorlds,
    spokenOthers, unspokenOthers, spokeToday, playerAnchorOnMe
  } = ctx;
  const readSeat = typeof getBlindSeat === "function" ? getBlindSeat : (snap ? snap.getSeat : getSeat);

  const pVoice = typeof pickVoice === "function" ? pickVoice : function () { return ""; };
  const rawRebutLead = pVoice("rebutLead", 1);
  const anchorPrefix = playerAnchorOnMe
    ? ("你剛才問「" + playerAnchorOnMe + "」，我正面回答你：")
    : "";
  const rebutLead = anchorPrefix ? (anchorPrefix + rawRebutLead) : rawRebutLead;
  const stdLead = pVoice("lead", 2);
  const signoff = pVoice("signoff", 3) || "";

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

  // Zero-Leak: Only Wolves receive legal pack-chat wolfTactic from Blind-View (Good AIs get null)
  const wolfTactic = (snap && snap.wolfTactic) ? snap.wolfTactic : "auto";

  // 0PK. HIGHEST PRIORITY DURING TIE-BREAKER PK: Defend self & directly challenge PK rival!
  const pkCands = snap ? snap.pkCandidates : (state.match && state.match.pkCandidates);
  const isInPk = Boolean(snap ? (snap.pkActive && pkCands.indexOf(speaker.id) !== -1) : (typeof isPkVoteActive === "function" && isPkVoteActive() && state.match.pkCandidates.indexOf(speaker.id) !== -1));
  if (isInPk) {
    const rivalId = pkCands.find(function (id) {
      if (id === speaker.id) return false;
      const rs = readSeat(id);
      return Boolean(rs && rs.alive);
    });
    const rival = rivalId ? readSeat(rivalId) : aliveOthers[0];
    const rName = rival ? seatLabel(rival) : "另一位平票對手";
    const rid = rival ? rival.id : null;
    const pkWolfPits = mergePits(rid, baseWolfIds, 2, null);

    if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
      speaker.claimedRole = "seer";
      const aliveChecks = speaker.checkedHistory.filter(function (c) {
        const ts = readSeat(c.targetId);
        return Boolean(ts && ts.alive);
      });
      const focusChk = aliveChecks.slice().reverse().find(function (c) { return c.isWolf; })
        || aliveChecks[aliveChecks.length - 1]
        || speaker.checkedHistory[speaker.checkedHistory.length - 1];
      const chkSeat = readSeat(focusChk.targetId);
      const chkLbl = chkSeat ? seatLabel(chkSeat) : (fmtSeatNum(focusChk.targetId) + "號");
      const pkSeerTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "seer", {
            rebutLead: rebutLead,
            rName: rName,
            extraProof: "昨夜親驗 " + chkLbl + " 係" + (focusChk.isWolf ? "酸民狼" : "清白好人") + "，",
            signoff: signoff
          })
        : null;
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
        text: pkSeerTxt || (rebutLead + "平票 PK 我必須搶救清白！我是真正的明心觀察員，查證過 " + chkLbl + " 是" + (focusChk.isWolf ? "酸民狼" : "好夥伴") + "！把我投離席好人會失去查證視野，請非平票夥伴務必轉投 " + rName + "！" + signoff)
      };
    }
    if (speaker.role === "witch") {
      speaker.claimedRole = "witch";
      speaker.witchAnnouncedSave = true;
      const svSeat = speaker.savedSeatId ? readSeat(speaker.savedSeatId) : null;
      const saveProof = svSeat ? ("之前晚上是我用暖心回甘茶護回 " + seatLabel(svSeat) + "，") : "";
      const vId = (svSeat && svSeat.alive && svSeat.id !== speaker.id) ? svSeat.id : null;
      const pkWitchTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "witch", { rebutLead: rebutLead, rName: rName, extraProof: saveProof, signoff: signoff })
        : null;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "witch",
        accuseId: rid,
        vouchId: vId,
        wolfPits: pkWolfPits,
        goodPits: mergePits(vId, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: pkWitchTxt || (rebutLead + "進入平票 PK 我直接亮出滴水奉茶師底牌！" + saveProof + "好人千萬別在 PK 把核心神職投出去，對比兩邊發言誠懇度，請大家這輪集中把票投給 " + rName + "！" + signoff)
      };
    }
    if (speaker.role === "hunter") {
      speaker.claimedRole = "hunter";
      speaker.hunterAnnounced = true;
      const pkHunterTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "hunter", { rebutLead: rebutLead, rName: rName, extraProof: "我是直心糾察長，離席必共鳴帶走 " + rName + "，", signoff: signoff })
        : null;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "hunter",
        accuseId: rid,
        vouchId: null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(null, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: pkHunterTxt || (rebutLead + "平票 PK 直接亮底牌提醒全場：我是直心糾察長！把我投出局不只少一張正氣票，我離席還會發動共鳴帶走 " + rName + "；反過來若大家把票集中在 " + rName + " 就能穩住局勢！" + signoff)
      };
    }
    if (speaker.role === "guard") {
      speaker.claimedRole = "guard";
      const gLast = snap ? snap.lastGuardTargetId : state.match.lastGuardTargetId;
      const gSeat = gLast ? readSeat(gLast) : null;
      const gNote = gSeat ? ("昨晚我展開結界守護過 " + seatLabel(gSeat) + "，") : "每晚我都謹慎交錯守護避免同守破盾，";
      const pkGuardTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "guard", { rebutLead: rebutLead, rName: rName, extraProof: gNote, signoff: signoff })
        : null;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "guard",
        accuseId: rid,
        vouchId: gSeat && gSeat.alive && gSeat.id !== rid ? gSeat.id : null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(gSeat && gSeat.alive && gSeat.id !== rid ? gSeat.id : null, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: pkGuardTxt || (rebutLead + "平票 PK 我直接拍出護心守衛底牌！" + gNote + "好人千萬別在 PK 把守衛投走讓神職裸奔，請大家這輪集中把票投給 " + rName + "！" + signoff)
      };
    }
    if (speaker.isElder) {
      speaker.claimedRole = "elder";
      speaker.elderAnnounced = true;
      const elderProof = speaker.elderShieldUsed ? "我已發動豁免盾確屬鐵好人，" : "我握有首次公投豁免盾，";
      const pkElderTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "elder", { rebutLead: rebutLead, rName: rName, extraProof: elderProof, signoff: signoff })
        : null;
      return {
        targetId: rid,
        relationType: rid ? "suspect" : null,
        claimRole: "elder",
        accuseId: rid,
        vouchId: null,
        wolfPits: pkWolfPits,
        goodPits: mergePits(null, baseGoodIds, 2, rid),
        hasToxicSlip: false,
        text: pkElderTxt || (rebutLead + "平票 PK 我先亮清心長老底牌提醒全場：" + (speaker.elderShieldUsed ? "我已經發動過豁免盾是鐵好人一張，" : "我是擁有首次公投豁免護盾的清心長老，浪費這輪公投推我只會白耗一輪還害我失票！") + "請大家集中把票投給 " + rName + "！" + signoff)
      };
    }
    if (speaker.team === "wolf") {
      const slipPk = wolfTactic === "deep_stealth" ? false : shouldWolfEmitToxicSlip(speaker, day, 9);
      const pkWolfTxt = typeof buildPersonaPkText === "function"
        ? buildPersonaPkText(speaker, "wolf", { rebutLead: rebutLead, rName: rName, extraProof: "", signoff: signoff })
        : null;
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
        text: pkWolfTxt || (rebutLead + "進到平票 PK 我跟大家把話說清楚：我一直認真配合好人對齊視角，完全沒理由亂帶風向；反觀 " + rName + " 前面立場模糊又挑動對立，請還沒投票的好人夥伴看清差距、改投 " + rName + "！" + signoff)
      };
    }
    const pkGoodTxt = typeof buildPersonaPkText === "function"
      ? buildPersonaPkText(speaker, "good", { rebutLead: rebutLead, rName: rName, extraProof: "", signoff: signoff })
      : null;
    return {
      targetId: rid,
      relationType: rid ? "suspect" : null,
      accuseId: rid,
      vouchId: null,
      wolfPits: pkWolfPits,
      goodPits: mergePits(null, baseGoodIds, 2, rid),
      hasToxicSlip: false,
      text: pkGoodTxt || (rebutLead + "進到平票 PK 我再懇切申辯一次：我只是個始終講理、零挑撥的好夥伴，如果出局太冤枉了！比起我，" + rName + " 的發言破綻和站邊更讓人不放心，拜託好人把這輪關鍵票集中投給 " + rName + "！" + signoff)
    };
  }

  // 0A. HIGHEST PRIORITY: Someone earlier today claimed Seer and called ME a Wolf!
  if (seerWolfOnMe) {
    const accSeat = readSeat(seerWolfOnMe.speakerId);
    const accName = seatLabel(accSeat);
    speaker.suspicionMap[seerWolfOnMe.speakerId] = 100;
    const wPits0A = mergePits(seerWolfOnMe.speakerId, baseWolfIds, 2, null);

    if (speaker.team === "good") {
      if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
        speaker.claimedRole = "seer";
        const aliveChks = speaker.checkedHistory.filter(function (c) {
          const cs = readSeat(c.targetId);
          return Boolean(cs && cs.alive);
        });
        const myBest = aliveChks.slice().reverse().find(function (c) { return c.isWolf; })
          || speaker.checkedHistory[speaker.checkedHistory.length - 1];
        const myBestSeat = readSeat(myBest.targetId);
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
        const saveNote = speaker.savedSeatId ? ("我之前還用暖心回甘茶護回過 " + fmtSeatNum(speaker.savedSeatId) + "號，") : "";
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
      if (speaker.role === "guard") {
        speaker.claimedRole = "guard";
        speaker.guardAnnounced = true;
        const gLastId0A = snap ? snap.lastGuardTargetId : state.match.lastGuardTargetId;
        const gLast0A = gLastId0A ? readSeat(gLastId0A) : null;
        const gNote0A = gLast0A ? ("昨晚我才展開護心結界守過 " + seatLabel(gLast0A) + "，") : "";
        const gVouch0A = (gLast0A && gLast0A.alive && gLast0A.id !== speaker.id && gLast0A.id !== seerWolfOnMe.speakerId) ? gLast0A.id : null;
        return {
          targetId: seerWolfOnMe.speakerId,
          relationType: "suspect",
          claimRole: "guard",
          accuseId: seerWolfOnMe.speakerId,
          vouchId: gVouch0A,
          wolfPits: wPits0A,
          goodPits: mergePits(gVouch0A, baseGoodIds, 2, seerWolfOnMe.speakerId),
          hasToxicSlip: false,
          text: rebutLead + "前置位 " + accName + " 竟然冒充觀察員硬把我查進狼坑？！我直接拍出護心守衛底牌，" + gNote0A + "敢亂查殺守衛直接坐實 " + accName + " 是冒牌酸民狼，這輪全場集中投 " + accName + "！" + signoff
        };
      }
      if (speaker.isElder) {
        speaker.claimedRole = "elder";
        speaker.elderAnnounced = true;
        return {
          targetId: seerWolfOnMe.speakerId,
          relationType: "suspect",
          claimRole: "elder",
          accuseId: seerWolfOnMe.speakerId,
          vouchId: null,
          wolfPits: wPits0A,
          goodPits: mergePits(null, baseGoodIds, 2, seerWolfOnMe.speakerId),
          hasToxicSlip: false,
          text: rebutLead + "前置位 " + accName + " 居然假跳觀察員硬把我查進狼坑？我直接亮出清心長老底牌自證好人，他敢亂潑髒水直接鐵證 " + accName + " 是冒牌狼，這輪一起反投 " + accName + "！" + signoff
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
    const accSeat = readSeat(pitCallerEv.speakerId);
    const accName = seatLabel(accSeat);
    const inPitOnly = pitCallerEv.accuseId !== speaker.id && Array.isArray(pitCallerEv.wolfPits) && pitCallerEv.wolfPits.indexOf(speaker.id) !== -1;
    const pitPhrase = inPitOnly ? ("前置位 " + accName + " 剛才把我點進狼坑") : ("前置位 " + accName + " 剛才點名把我打進狼坑");
    const goodAllySpoken = spokenOthers.find(function (s) {
      return s.id !== pitCallerEv.speakerId && (speaker.suspicionMap[s.id] || 50) <= 46;
    });
    const unspokenTail = typeof formatUnspokenNoteByPersona === "function"
      ? formatUnspokenNoteByPersona(speaker, unspokenOthers, seatLabel)
      : (unspokenOthers.length > 0
        ? ("後置位 " + seatLabel(unspokenOthers[0]) + " 還沒發言，暫時留著待聽表水。")
        : "");
    const makePitTxt = typeof buildPersonaPitRebutText === "function" ? buildPersonaPitRebutText : null;

    if (speaker.team === "good") {
      if (speaker.role === "hunter" && !speaker.hunterAnnounced) {
        const secondSus = baseWolfIds.find(function (id) { return id !== pitCallerEv.speakerId; });
        const secondSeat = secondSus ? readSeat(secondSus) : null;
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
          text: makePitTxt
            ? makePitTxt(speaker, "hunter", { rebutLead: rebutLead, accName: accName, secondLbl: secondSeat ? seatLabel(secondSeat) : "", signoff: signoff })
            : (rebutLead + pitPhrase + "真是踩進鐵板了！我先亮明直心糾察長把自己摘出狼坑：如果有人硬推我離席，我一定直接共鳴帶走 " + accName + "！目前我看狼坑至少要檢視 " + accName + (secondSeat ? (" 跟 " + seatLabel(secondSeat)) : "") + "，" + signoff)
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
          text: makePitTxt
            ? makePitTxt(speaker, "calm", { rebutLead: rebutLead, accName: accName, allyLbl: goodAllySpoken ? seatLabel(goodAllySpoken) : "", realSusLbl: realSus ? seatLabel(realSus) : "", unspokenTail: unspokenTail, signoff: signoff })
            : (rebutLead + "先正面回應 " + pitPhrase + "：我自己知道我的底牌，我絕對不在狼坑裡，別因為誤解互相抗推！" +
              (goodAllySpoken ? (seatLabel(goodAllySpoken) + " 比較像好人坑，") : "") +
              (realSus ? ("真正該盯的狼坑反而是 " + seatLabel(realSus) + "。") : "大家聽完後置位表水再對齊狼坑。") + unspokenTail + signoff)
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
          text: makePitTxt
            ? makePitTxt(speaker, "dual", { rebutLead: rebutLead, accName: accName, standLbl: standLbl, rivalLbl: rivalLbl, fakeALbl: seatLabel(cw.fakeSeer) + cw2Lbl, fakeBLbl: seatLabel(rw.fakeSeer) + rw2Lbl, signoff: signoff })
            : (rebutLead + pitPhrase + "，這我必須接招！我百分之百不在狼坑裡，剛好把雙觀察員盤清楚：站 " + standLbl + " 狼坑是 " + seatLabel(cw.fakeSeer) + cw2Lbl + "，站 " + rivalLbl + " 狼坑才變成 " + seatLabel(rw.fakeSeer) + rw2Lbl + "！你硬把我擠進狼坑反而像幫假牌墊坑，我先站邊 " + standLbl + "，反把 " + accName + " 打進狼坑！")
        };
      }

      const wPitsDef = mergePits(pitCallerEv.speakerId, baseWolfIds, 2, goodAllySpoken ? goodAllySpoken.id : null);
      const pitNamesStr = wPitsDef.map(function (id) { return seatLabel(readSeat(id)); }).join(" 跟 ");
      return {
        targetId: pitCallerEv.speakerId,
        relationType: "suspect",
        accuseId: pitCallerEv.speakerId,
        vouchId: goodAllySpoken ? goodAllySpoken.id : null,
        wolfPits: wPitsDef,
        goodPits: mergePits(goodAllySpoken ? goodAllySpoken.id : null, baseGoodIds, 2, pitCallerEv.speakerId),
        hasToxicSlip: false,
        text: makePitTxt
          ? makePitTxt(speaker, "good", { rebutLead: rebutLead, accName: accName, allyLbl: goodAllySpoken ? seatLabel(goodAllySpoken) : "", pitNamesStr: pitNamesStr, unspokenTail: unspokenTail, signoff: signoff })
          : (rebutLead + pitPhrase + "，這裡我一定要講清楚：我全程理性找線索，根本不在狼坑裡！反而是 " + accName + " 沒實錘就急著把我劃進狼坑帶風向；若要我點坑，" +
            (goodAllySpoken ? (seatLabel(goodAllySpoken) + " 先放好人坑，") : "") +
            "我懷疑的狼坑是 " + pitNamesStr + "！" + unspokenTail + signoff)
      };
    } else {
      const spokenNonWolf = spokenOthers.filter(function (s) { return !s.isWolfMate && s.id !== pitCallerEv.speakerId; });
      const secondFakePit = spokenNonWolf[0] || aliveOthers.find(function (s) { return !s.isWolfMate && s.id !== pitCallerEv.speakerId; });
      const wolfFakePits = mergePits(pitCallerEv.speakerId, secondFakePit ? [secondFakePit.id] : [], 2, null);
      const secClause = secondFakePit
        ? (spokeToday(secondFakePit.id)
          ? ("另外剛才發言過的 " + seatLabel(secondFakePit) + " 我也覺得待檢視")
          : ("至於後置位 " + seatLabel(secondFakePit) + " 還沒發言，待會我也會重點聽他表水"))
        : "";
      // v17.0 小雲狼破綻：被踩時為了自證清白，解釋篇幅會明顯飆升！
      const xiaoyunOverExplain = speaker.name === "小雲"
        ? "我剛剛每一句時間軸跟前後邏輯都對得清清楚楚，從第一輪到現在我的筆記本完全沒有任何矛盾，這點大家翻紀錄就能逐字驗證！"
        : "";
      const baseWolfRebutText = makePitTxt
        ? makePitTxt(speaker, "wolf", { rebutLead: rebutLead, accName: accName, secClause: secClause, signoff: signoff })
        : (rebutLead + pitPhrase + "實在太草率了吧？我被 " + accName + " 硬塞進狼坑當替罪羊！依我看想混淆視聽的狼坑就是 " + accName + (secClause ? ("，" + secClause) : "") + "，這輪我先反點 " + accName + "！" + signoff);
      return {
        targetId: pitCallerEv.speakerId,
        relationType: "suspect",
        accuseId: pitCallerEv.speakerId,
        vouchId: null,
        wolfPits: wolfFakePits,
        goodPits: [],
        hasToxicSlip: wolfTactic === "deep_stealth" ? false : shouldWolfEmitToxicSlip(speaker, day, 3),
        text: xiaoyunOverExplain ? (baseWolfRebutText + xiaoyunOverExplain) : baseWolfRebutText
      };
    }
  }

  // 0C. REAL GOD / ELDER ROLE STOLEN! If someone earlier stole MY exact Witch/Hunter/Guard/Elder role, IMMEDIATELY counter-claim!
  const myEffKey0C = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(speaker) : speaker.role;
  if (priorSameRoleSteal && (myEffKey0C === "witch" || myEffKey0C === "hunter" || myEffKey0C === "guard" || myEffKey0C === "elder")) {
    const thief = readSeat(priorSameRoleSteal.speakerId);
    const thiefName = seatLabel(thief);
    const myRoleDef0C = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(speaker) : null) || ROLE_DEFS[myEffKey0C];
    const myRoleName = myRoleDef0C ? myRoleDef0C.name : "神職";
    speaker.claimedRole = myEffKey0C;
    if (myEffKey0C === "witch") speaker.witchAnnouncedSave = true;
    if (myEffKey0C === "hunter") speaker.hunterAnnounced = true;
    if (myEffKey0C === "guard") speaker.guardAnnounced = true;
    if (myEffKey0C === "elder") speaker.elderAnnounced = true;
    speaker.suspicionMap[priorSameRoleSteal.speakerId] = 100;
    const gLastId0C = (myEffKey0C === "guard" && snap) ? snap.lastGuardTargetId : null;
    const gLast0C = gLastId0C ? readSeat(gLastId0C) : null;
    const v0C = (myEffKey0C === "witch" && speaker.savedSeatId && speaker.savedSeatId !== priorSameRoleSteal.speakerId)
      ? speaker.savedSeatId
      : ((gLast0C && gLast0C.alive && gLast0C.id !== speaker.id && gLast0C.id !== priorSameRoleSteal.speakerId) ? gLast0C.id : null);
    const extraProof = (myEffKey0C === "witch" && speaker.savedSeatId)
      ? ("之前晚上是我端暖心回甘茶護回了 " + fmtSeatNum(speaker.savedSeatId) + "號，")
      : (myEffKey0C === "hunter"
        ? "如果大家誤投我，我離席一定發動共鳴帶他一起冷靜，"
        : (myEffKey0C === "guard"
          ? (gLast0C ? ("昨晚就是我展開護心結界守護了 " + fmtSeatNum(gLast0C.id) + "號，") : "每晚都是我謹慎巡防護盾，")
          : "我擁有首次公投豁免護盾隨時可驗證，"));
    return {
      targetId: priorSameRoleSteal.speakerId,
      relationType: "suspect",
      claimRole: myEffKey0C,
      accuseId: priorSameRoleSteal.speakerId,
      vouchId: v0C,
      wolfPits: mergePits(priorSameRoleSteal.speakerId, baseWolfIds, 2, v0C),
      goodPits: mergePits(v0C, baseGoodIds, 2, priorSameRoleSteal.speakerId),
      hasToxicSlip: false,
      text: rebutLead + "前置位 " + thiefName + " 竟然敢冒充我的" + myRoleName + "身分？！我才是真正的" + myRoleName + "，" + extraProof + "全場聽清楚了，敢冒充身分的 " + thiefName + " 百分百佔一狼坑，這輪直接把 " + thiefName + " 請離茶席！" + signoff
    };
  }

  // 0D. DYNAMIC WOLF COUNTER-CLAIM DECISION! When a non-wolf claimed a God/Elder role earlier, Wolves decide via Blind-View whether to counter-claim!
  const isDeepStealth0D = (wolfTactic === "deep_stealth" || wolfTactic === "deep_stealth_bus");
  const isPlayerFakeSeerPush0D = (wolfTactic === "player_fake_seer_push" || wolfTactic === "pack_push");
  if (speaker.role === "wolf" && !isDeepStealth0D && priorGodClaims.length > 0 && !speaker.claimedRole) {
    const latestGodEv = priorGodClaims[priorGodClaims.length - 1];
    const godSeat = readSeat(latestGodEv.speakerId);
    const godName = seatLabel(godSeat);
    const claimedR = latestGodEv.claimRole;
    if (isPlayerFakeSeerPush0D && claimedR === "seer") {
      // Player wolf owns the Seer claim in player_fake_seer_push script; AI mate does not steal Seer!
    } else {
      const wolfTeamAlreadyCountered = (snap ? snap.seats : []).some(function (s) {
        return (s.id === speaker.id || s.isWolfMate) && s.claimedRole === claimedR;
      });
      if (!wolfTeamAlreadyCountered && godSeat && !godSeat.isWolfMate && ROLE_DEFS[claimedR]) {
      const counterProb = typeof getPersonaWolfCounterChance === "function"
        ? getPersonaWolfCounterChance(speaker, claimedR)
        : (claimedR === "seer" ? 0.78 : (claimedR === "witch" ? 0.45 : 0.35));
      const deterministicRoll = ((speaker.id * 37 + day * 19 + latestGodEv.speakerId * 13) % 100) / 100;
      if ((speaker.fakeSeer && claimedR === "seer") || deterministicRoll < counterProb) {
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
        } else if (claimedR === "guard") {
          return {
            targetId: godSeat.id,
            relationType: "suspect",
            claimRole: "guard",
            accuseId: godSeat.id,
            vouchId: null,
            hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 4),
            text: rebutLead + "剛才 " + godName + " 竟然冒充我的護心守衛身分編守護路線？！我才是這局真正的守衛，一直低調防狼刀就是等著抓他這種亂穿衣服的狼，這輪直接把冒牌貨 " + godName + " 請離！" + signoff
          };
        } else if (claimedR === "elder") {
          return {
            targetId: godSeat.id,
            relationType: "suspect",
            claimRole: "elder",
            accuseId: godSeat.id,
            vouchId: null,
            hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 4),
            text: rebutLead + "剛才 " + godName + " 居然敢假跳清心長老想騙大家不敢投他？！我才是這局真正的清心長老，敢冒充長老的 " + godName + " 百分百是酸民狼，這輪全場直接投 " + godName + "！" + signoff
          };
        }
        speaker.claimedRole = null;
      } else {
        const rName = ROLE_DEFS[claimedR].name;
        const otherGood = aliveOthers.find(function (s) { return !s.isWolfMate && s.id !== godSeat.id; }) || godSeat;
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
  }
  return null;
}

function tryRoleSpecificSpeech(speaker, ctx) {
  const {
    snap, getBlindSeat, aliveOthers, day, spokenIdsToday, spokenOthers, unspokenOthers, spokeToday,
    isFirstToday, flv, seatLabel, fill, prevVoteNote, prevVoteSuspect,
    priorFakeSeerEv, wolfPitOnMe, slotPlan, dualSeerWorlds
  } = ctx;
  const readSeat = typeof getBlindSeat === "function" ? getBlindSeat : (snap ? snap.getSeat : getSeat);

  const baseGoodIds = (slotPlan && Array.isArray(slotPlan.goodPits)) ? slotPlan.goodPits.map(function (s) { return s.id; }) : [];
  const baseWolfIds = (slotPlan && Array.isArray(slotPlan.wolfPits)) ? slotPlan.wolfPits.map(function (s) { return s.id; }) : [];

  // 1. Real Seer: Multi-night memory (prioritize alive checked Wolf -> alive fake-Seer -> latest check)
  if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
    const aliveChecks = speaker.checkedHistory.filter(function (c) {
      const cs = readSeat(c.targetId);
      return Boolean(cs && cs.alive);
    });
    const aliveWolfCheck = aliveChecks.slice().reverse().find(function (c) { return c.isWolf; });
    const latest = aliveWolfCheck || aliveChecks[aliveChecks.length - 1] || speaker.checkedHistory[speaker.checkedHistory.length - 1];
    const targetObj = readSeat(latest.targetId);
    const latestAlive = Boolean(targetObj && targetObj.alive);
    const tName = seatLabel(targetObj);
    const targetSpoke = spokenIdsToday.indexOf(latest.targetId) !== -1;
    const pitRebut = wolfPitOnMe
      ? ("先回應前置位 " + seatLabel(readSeat(wolfPitOnMe.speakerId)) + " 把我點進狼坑——你可把真正明心觀察員打進狼坑了！")
      : "";

    // Strategic Hide Rule: driven by persona godHideBias (e.g., 墨白/晴嵐/小澄 prefer low-profile Day 1; 晨晨/星兒/柚子 reveal!)
    const godHideScore = typeof getPersonaGodHideChance === "function"
      ? getPersonaGodHideChance(speaker)
      : (speaker.deductionStyle === "skeptical" ? 0.7 : 0.3);
    const shouldHideSeer = (day === 1 && !latest.isWolf && !priorFakeSeerEv && !wolfPitOnMe && speaker.claimedRole !== "seer" && godHideScore >= 0.65);
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
    const uncheckedAlive = aliveOthers.filter(function (s) { return checkedIdsAll.indexOf(s.id) === -1 && s.id !== latest.targetId; });
    const nextPlan = uncheckedAlive[0] || aliveOthers.find(function (s) { return s.id !== latest.targetId; }) || null;
    const nextPlan2 = uncheckedAlive.find(function (s) { return nextPlan && s.id !== nextPlan.id; }) || null;
    const isSpeakerSheriff = Boolean(snap && snap.sheriffSeatId === speaker.id);
    if (isSpeakerSheriff && nextPlan && typeof setSheriffBadgeFlow === "function") {
      setSheriffBadgeFlow(speaker.id, nextPlan.id, nextPlan2 ? nextPlan2.id : null, "day_speech");
    }
    const fakeSeerSeat = priorFakeSeerEv ? readSeat(priorFakeSeerEv.speakerId) : null;
    const fakeSeerAlive = Boolean(fakeSeerSeat && fakeSeerSeat.alive && fakeSeerSeat.id !== speaker.id);
    const fakeCallout = priorFakeSeerEv ? ("剛才前置位 " + seatLabel(fakeSeerSeat) + " 根本是在冒充明心觀察員騙人，") : "";
    const planNote = nextPlan
      ? (isSpeakerSheriff
        ? (nextPlan2
          ? ("今晚更新雙警徽流：先驗 " + seatLabel(nextPlan) + "、再驗 " + seatLabel(nextPlan2) + "（我若倒牌，徽給" + fmtSeatNum(nextPlan.id) + "號即金水、飛" + fmtSeatNum(nextPlan2.id) + "號或撕徽即查殺）！")
          : ("今晚警徽流鎖定 " + seatLabel(nextPlan) + "（我若倒牌，徽給他即金水、撕徽即查殺）！"))
        : ("今晚我計畫再去查驗 " + seatLabel(nextPlan) + " 幫大家把關！"))
      : "";
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
          "站我這邊第一個狼坑就是冒充觀察員的 " + seatLabel(fakeSeerSeat) + (secondPit ? ("，第二狼坑先盯 " + seatLabel(readSeat(secondPit)) + "！") : "！") + planNote
      };
    } else {
      const watchSeat = nextPlan || unspokenOthers.find(function (s) { return s.id !== latest.targetId; }) || aliveOthers.find(function (s) { return s.id !== latest.targetId; });
      const susWatch = (wolfPitOnMe ? readSeat(wolfPitOnMe.speakerId) : null) || ((watchSeat && (speaker.suspicionMap[watchSeat.id] || 50) >= 56) ? watchSeat : null);
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

  // 2. Fake-Seer Wolf weaving an in-character deceptive counter-claim (ZERO hidden Good-role peeking!)
  const curWolfTactic = (snap && snap.wolfTactic) ? snap.wolfTactic : "auto";
  const isMateGoldScript = (curWolfTactic === "mate_fake_seer_gold" || curWolfTactic === "fake_seer");
  const isPlayerPushScript = (curWolfTactic === "player_fake_seer_push" || curWolfTactic === "pack_push");
  const isDeepBusScript = (curWolfTactic === "deep_stealth_bus" || curWolfTactic === "deep_stealth");
  const wolfTeamHasSeerClaim = (snap ? snap.seats : []).some(function (s) {
    return (s.id === speaker.id || s.isWolfMate) && s.claimedRole === "seer";
  });
  const wantFakeSeer = (speaker.fakeSeer || (isMateGoldScript && !wolfTeamHasSeerClaim))
    && !isDeepBusScript && !isPlayerPushScript;
  if (speaker.role === "wolf" && wantFakeSeer) {
    speaker.claimedRole = "seer";
    if (!speaker.fakeCheckedIds) speaker.fakeCheckedIds = [];
    const nonWolves = aliveOthers.filter(function (s) { return !s.isWolfMate; });
    const pidWolfNow = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
    const playerWolfMate = isMateGoldScript
      ? aliveOthers.find(function (s) { return s.id === pidWolfNow && s.isWolfMate; })
      : null;

    if (playerWolfMate && nonWolves.length > 0) {
      // v16.0 Wolf Screen Script 1: "同伴悍跳發我金水" — AI wolf fake-claims Seer & gives Human Wolf Gold Water!
      const frameForGold = spokenOthers.find(function (s) { return !s.isWolfMate && s.claimedRole === "seer"; }) || nonWolves[0];
      if (speaker.fakeCheckedIds.indexOf(playerWolfMate.id) === -1) {
        speaker.fakeCheckedIds.push(playerWolfMate.id);
      }
      return {
        targetId: playerWolfMate.id,
        relationType: "trust",
        claimSeer: true,
        claimRole: "seer",
        accuseId: frameForGold ? frameForGold.id : null,
        vouchId: playerWolfMate.id,
        standWithSeerId: speaker.id,
        wolfPits: frameForGold ? [frameForGold.id] : [],
        goodPits: [playerWolfMate.id],
        checkedWolfId: null,
        checkedGoodId: playerWolfMate.id,
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 2),
        text: "我起跳明心觀察員先報昨晚驗人：我查驗了 " + seatLabel(playerWolfMate) + " 是鐵金水好人，大家放心保他！至於 " + seatLabel(frameForGold) + " 立場最可疑，這輪先盯住他。"
      };
    }

    if (nonWolves.length > 0) {
      // Zero-Leak: Wolf only sees observable claimedRole === "seer" on non-wolves (NEVER peeks s.role === "seer"!)
      const rivalSeerSpoke = spokenOthers.find(function (s) { return !s.isWolfMate && s.claimedRole === "seer"; });
      const freshTarget = nonWolves.find(function (s) { return speaker.fakeCheckedIds.indexOf(s.id) === -1; });
      const frameTarget = (rivalSeerSpoke && speaker.fakeCheckedIds.indexOf(rivalSeerSpoke.id) === -1)
        ? rivalSeerSpoke
        : (freshTarget || rivalSeerSpoke || nonWolves[0]);
      if (speaker.fakeCheckedIds.indexOf(frameTarget.id) === -1) {
        speaker.fakeCheckedIds.push(frameTarget.id);
      }
      const secondFrame = nonWolves.find(function (s) { return s.id !== frameTarget.id; });
      const isFakeWolfSheriff = Boolean(snap && snap.sheriffSeatId === speaker.id);
      let fakeFlowTail = "";
      if (isFakeWolfSheriff && secondFrame && typeof setSheriffBadgeFlow === "function") {
        const fakeFlow2 = aliveOthers.find(function (s) { return s.id !== frameTarget.id && s.id !== secondFrame.id; }) || null;
        setSheriffBadgeFlow(speaker.id, secondFrame.id, fakeFlow2 ? fakeFlow2.id : null, "day_speech");
        fakeFlowTail = fakeFlow2
          ? ("今晚我的警徽流改留先驗 " + seatLabel(secondFrame) + "、再驗 " + seatLabel(fakeFlow2) + "，大家放心看我手勢！")
          : ("今晚我的警徽流鎖定 " + seatLabel(secondFrame) + "！");
      }
      // v17.0 Wolf Fake-Seer Signature Tells: 星兒假跳過於死板講邏輯 / 墨白假跳顯得過於工整拘謹
      const fakeSeerTellPrefix = speaker.name === "星兒"
        ? "照嚴格排除法加上三點推論交叉核對，"
        : (speaker.name === "墨白" ? "按序查核、條分縷析，昨夜依例檢視完畢：" : "");
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
        text: fakeSeerTellPrefix + fill(flv.fakeSeer, { t: seatLabel(frameTarget) }) + fakeFlowTail
      };
    }
  }

  // 3. Witch stepping forward ONCE to vouch for rescued player (做好事!)
  if (speaker.role === "witch" && speaker.savedSeatId && day >= 2 && !speaker.witchAnnouncedSave) {
    const saved = readSeat(speaker.savedSeatId);
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

  // 3.5 Hunter Deterrence: uses strictly PUBLIC observable table heat (ZERO mind-reading of others' suspicionMap!)
  if (speaker.role === "hunter" && day >= 1 && !speaker.hunterAnnounced) {
    const observableHeatH = snap ? snap.getObservableHeatOnSeat(speaker.id) : 40;
    if (observableHeatH >= 54 || speaker.claimedRole === "hunter") {
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

  // 3.6 Guard Clarification: strictly PUBLIC observable heat + own lastGuardTargetId (ZERO mind-reading!)
  if (speaker.role === "guard" && day >= 2 && !speaker.guardAnnounced) {
    const gPrevId = snap ? snap.lastGuardTargetId : state.match.lastGuardTargetId;
    const gTargetSeat = gPrevId ? readSeat(gPrevId) : null;
    const hadRecentPeace = (snap ? snap.peaceNights : (state.match.peaceNights || [])).length > 0;
    const observableHeatG = snap ? snap.getObservableHeatOnSeat(speaker.id) : 40;
    if (observableHeatG >= 54 || hadRecentPeace || speaker.claimedRole === "guard") {
      speaker.claimedRole = "guard";
      speaker.guardAnnounced = true;
      const vouchTarget = (gTargetSeat && gTargetSeat.alive && gTargetSeat.id !== speaker.id) ? gTargetSeat : null;
      const watchG = (baseWolfIds[0] && readSeat(baseWolfIds[0])) || aliveOthers[0] || null;
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

  // 3.7 Elder Clarification: strictly PUBLIC observable heat + own elderShieldUsed (ZERO mind-reading!)
  if (speaker.isElder && day >= 1 && !speaker.elderAnnounced) {
    const observableHeatE = snap ? snap.getObservableHeatOnSeat(speaker.id) : 40;
    if (observableHeatE >= 54 || speaker.elderShieldUsed || speaker.claimedRole === "elder") {
      speaker.claimedRole = "elder";
      speaker.elderAnnounced = true;
      const topThreatE = (spokenOthers.length ? spokenOthers : aliveOthers).slice().sort(function (a, b) {
        return (speaker.suspicionMap[b.id] || 50) - (speaker.suspicionMap[a.id] || 50);
      })[0];
      return {
        targetId: topThreatE ? topThreatE.id : null,
        relationType: topThreatE ? "suspect" : null,
        claimRole: "elder",
        accuseId: topThreatE ? topThreatE.id : null,
        vouchId: null,
        wolfPits: topThreatE ? [topThreatE.id] : baseWolfIds.slice(0, 2),
        goodPits: baseGoodIds.slice(0, 2),
        hasToxicSlip: false,
        text: speaker.elderShieldUsed
          ? ("我是已經亮牌的清心長老，雖然沒有投票權但絕對站好人視角！請大家把火力集中在 " + seatLabel(topThreatE) + " 身上，別讓酸民狼混水摸魚！")
          : ("先亮一下清心長老幫神職扛壓：我首次被誤投會發動豁免盾，大家千萬別浪費公投在我身上！這輪我重點檢視 " + seatLabel(topThreatE) + "！")
      };
    }
  }

  // 4. Stealth Wolf (Coordinates with Fake-Seer partner via Blind-View — NEVER peeks hidden Good roles!)
  if (speaker.role === "wolf") {
    const pVoiceRole = typeof ctx.pickVoice === "function" ? ctx.pickVoice : function () { return ""; };
    const wolfLead = pVoiceRole("lead", 4);
    const wolfDualLead = pVoiceRole("dualLead", 5);
    const wolfSignoff = pVoiceRole("signoff", 6) || "先這樣，過！";
    const goodSpoken = spokenOthers.filter(function (s) { return !s.isWolfMate; });
    const goodAll = aliveOthers.filter(function (s) { return !s.isWolfMate; });
    const wolfPartnerSeer = spokenOthers.find(function (s) { return s.isWolfMate && s.claimedRole === "seer"; });
    // Zero-Leak: Wolf only sees observable Seer claim by a non-wolf (NEVER reads s.role === "seer"!)
    const rivalSeerExposed = spokenOthers.find(function (s) { return !s.isWolfMate && s.claimedRole === "seer"; });

    const pidNow = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
    const playerSeatView = readSeat(pidNow);
    if (isPlayerPushScript && playerSeatView && playerSeatView.alive) {
      const playerClaimedSeer = Boolean(playerSeatView.claimedRole === "seer");
      const playerAccEv = (snap ? snap.daySpeechEvents : []).find(function (ev) { return ev.speakerId === pidNow && ev.accuseId; });
      const playerTarget = playerAccEv ? readSeat(playerAccEv.accuseId) : (rivalSeerExposed || goodSpoken[0] || goodAll[0]);
      if (playerTarget && playerTarget.alive && !playerTarget.isWolfMate && playerTarget.id !== speaker.id) {
        const ptSpoke = spokeToday(playerTarget.id);
        return {
          targetId: playerTarget.id,
          relationType: "suspect",
          accuseId: playerTarget.id,
          vouchId: pidNow,
          standWithSeerId: playerClaimedSeer ? pidNow : null,
          wolfPits: [playerTarget.id],
          goodPits: [pidNow],
          hasToxicSlip: false,
          text: wolfLead + (playerClaimedSeer
            ? ("我聽下來堅定站邊 " + seatLabel(playerSeatView) + " 這張觀察員，")
            : ("聽完前面分析，我也跟 " + seatLabel(playerSeatView) + " 有同感，")) +
            (ptSpoke ? (seatLabel(playerTarget) + " 剛才的發言破綻最多，") : (seatLabel(playerTarget) + " 的立場很讓人起疑，")) +
            "這輪我全力把票衝在 " + seatLabel(playerTarget) + " 身上。" + wolfSignoff
        };
      }
    }

    if (isDeepBusScript) {
      const hotMate = spokenOthers.find(function (s) {
        return s.isWolfMate && snap && snap.getObservableHeatOnSeat(s.id) >= 64;
      });
      if (hotMate) {
        // v16.0 Wolf Screen Script 3: "全員深水倒鉤互踩做身分" — lightly distance/bus hot wolf mate!
        return {
          targetId: hotMate.id,
          relationType: "suspect",
          accuseId: hotMate.id,
          vouchId: null,
          wolfPits: [hotMate.id],
          goodPits: [],
          hasToxicSlip: false,
          text: wolfLead + "老實說前面聽下來，我覺得 " + seatLabel(hotMate) + " 的說法確實有點勉強，我先不盲保，這輪先記他一格觀察，大家再細盤。"
        };
      }
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
          ? (wolfLead + "大家心平氣和把前面幾位盤一盤，我自己聽下來覺得前置位 " + seatLabel(stealthTarget) + " 講得有點保留，暫時記半格狼坑再檢視。")
          : ("目前我順位比較靠前，" + seatLabel(stealthTarget) + (secGood ? (" 跟 " + seatLabel(secGood)) : "") + " 都還沒發言，先不急著點死狼坑，聽完後面表水再定。")
      };
    }

    // Dual-Seer Stealth Wolf: explicitly analyze BOTH worlds to make backing wolf partner sound credible!
    if (wolfPartnerSeer && rivalSeerExposed && dualSeerWorlds && dualSeerWorlds.chosenWorld && dualSeerWorlds.rivalWorld) {
      const partnerWorld = dualSeerWorlds.chosenWorld.trustedSeer.id === wolfPartnerSeer.id ? dualSeerWorlds.chosenWorld : dualSeerWorlds.rivalWorld;
      const realWorld = dualSeerWorlds.chosenWorld.trustedSeer.id === rivalSeerExposed.id ? dualSeerWorlds.chosenWorld : dualSeerWorlds.rivalWorld;
      const p2 = partnerWorld.secondWolf ? ("＋" + seatLabel(partnerWorld.secondWolf)) : "";
      const r2 = realWorld.secondWolf ? ("＋" + seatLabel(realWorld.secondWolf)) : "";
      return {
        targetId: rivalSeerExposed.id,
        relationType: "suspect",
        accuseId: rivalSeerExposed.id,
        vouchId: wolfPartnerSeer.id,
        standWithSeerId: wolfPartnerSeer.id,
        wolfPits: partnerWorld.wolfPits.map(function (s) { return s.id; }).slice(0, 2),
        goodPits: [wolfPartnerSeer.id],
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 6),
        text: (wolfDualLead || "兩位明心觀察員對跳我也盤一下雙邊狼坑：") + "如果站 " + seatLabel(rivalSeerExposed) + "，狼坑變 " + seatLabel(wolfPartnerSeer) + r2 + " 邏輯其實很勉強；反而站 " + seatLabel(wolfPartnerSeer) + "，狼坑就落在 " + seatLabel(rivalSeerExposed) + p2 + " 合理多了！我這輪站邊 " + seatLabel(wolfPartnerSeer) + "，出 " + seatLabel(rivalSeerExposed) + "！" + wolfSignoff
      };
    }

    if (wolfPartnerSeer && rivalSeerExposed) {
      return {
        targetId: rivalSeerExposed.id,
        relationType: "suspect",
        accuseId: rivalSeerExposed.id,
        vouchId: wolfPartnerSeer.id,
        standWithSeerId: wolfPartnerSeer.id,
        wolfPits: [rivalSeerExposed.id],
        goodPits: [wolfPartnerSeer.id],
        hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 6),
        text: wolfLead + "比較剛剛兩位自稱明心觀察員的人，我覺得 " + seatLabel(wolfPartnerSeer) + " 講得清楚多了，反倒是 " + seatLabel(rivalSeerExposed) + " 聽起來超像在硬掰演戲！我站邊 " + seatLabel(wolfPartnerSeer) + "，這輪先把 " + seatLabel(rivalSeerExposed) + " 打進首出狼坑！" + wolfSignoff
      };
    }

    if (isFirstToday) {
      const target = (prevVoteSuspect && !prevVoteSuspect.isWolfMate && prevVoteSuspect.id !== speaker.id) ? prevVoteSuspect : (goodAll[0] || aliveOthers[0]);
      if (!target) return null;
      const secTarget = goodAll.find(function (s) { return s.id !== target.id; });
      if (prevVoteNote && prevVoteSuspect && !prevVoteSuspect.isWolfMate && prevVoteSuspect.id !== speaker.id) {
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
        text: fill(flv.wolfFirst, { t: seatLabel(target) })
      };
    }

    // v17.0 Signature Wolf Tells (100% ZERO-LEAK: reads only own speaker.name/role & legal wolf-pack/public heat!)
    // 1. 晨晨當狼破綻：隊友遭高熱度圍攻時沉不住氣衝動跳出來硬保
    if (speaker.name === "晨晨" && !isDeepBusScript && !isPlayerPushScript && snap) {
      const hotMateChen = spokenOthers.find(function (s) {
        return s.isWolfMate && snap.getObservableHeatOnSeat(s.id) >= 60;
      });
      if (hotMateChen) {
        const scapegoatC = goodSpoken[0] || goodAll[0] || aliveOthers[0];
        return {
          targetId: hotMateChen.id,
          relationType: "trust",
          accuseId: scapegoatC ? scapegoatC.id : null,
          vouchId: hotMateChen.id,
          wolfPits: scapegoatC ? [scapegoatC.id] : [],
          goodPits: [hotMateChen.id],
          hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 5, true),
          text: "欸等等兄弟們別一窩蜂打 " + seatLabel(hotMateChen) + " 啦！他剛剛講得很坦白啊，我敢拿信譽力挺 " + seatLabel(hotMateChen) + (scapegoatC ? ("，真正該查的是 " + seatLabel(scapegoatC) + " 吧！") : "，先別急著投他！")
        };
      }
    }
    // 2. 暖暖當狼破綻：因心虛比平時更不敢得罪人，整段話誰都不踩
    if (speaker.name === "暖暖" && !isPlayerPushScript && !wolfPartnerSeer && !isFirstToday) {
      const mildAlly = goodSpoken[0] || spokenOthers[0] || null;
      return {
        targetId: mildAlly ? mildAlly.id : null,
        relationType: mildAlly ? "trust" : null,
        accuseId: null,
        vouchId: mildAlly ? mildAlly.id : null,
        wolfPits: [],
        goodPits: mildAlly ? [mildAlly.id] : [],
        hasToxicSlip: false,
        text: "欸大家剛剛講得好像都滿有道理的耶…暖暖不太敢隨便踩誰啦，氣氛和和氣氣就好，這輪我先聽後面大家怎麼決定囉…"
      };
    }

    const scapegoat = goodSpoken[0] || goodAll[0] || aliveOthers[0];
    if (!scapegoat) return null;
    const scSpoke = spokenIdsToday.indexOf(scapegoat.id) !== -1;
    const secScapegoat = goodSpoken.find(function (s) { return s.id !== scapegoat.id; }) || goodAll.find(function (s) { return s.id !== scapegoat.id; });
    const wolfClubPrefix = typeof buildPersonaClubAndHabitInsert === "function"
      ? buildPersonaClubAndHabitInsert(speaker, ctx, scapegoat, "wolf")
      : "";
    // 3. 柚子當狼破綻：緊張時特別愛附和前一位發言者
    const prevGoodSp = spokenOthers.length ? spokenOthers[spokenOthers.length - 1] : null;
    const youziEcho = (speaker.name === "柚子" && prevGoodSp && prevGoodSp.id !== scapegoat.id)
      ? ("我也覺得剛剛 " + seatLabel(prevGoodSp) + " 講得好有道理喔，")
      : "";
    // 4. 小澄當狼破綻：過度執著解釋票數合理性
    const xiaoChengWolfTell = speaker.name === "小澄"
      ? "先單純從票數分佈算一遍合理性，不看情緒動機的話，"
      : "";
    return {
      targetId: scapegoat.id,
      relationType: "suspect",
      accuseId: scapegoat.id,
      vouchId: null,
      wolfPits: (scSpoke && secScapegoat && spokeToday(secScapegoat.id)) ? [scapegoat.id, secScapegoat.id] : (scSpoke ? [scapegoat.id] : []),
      goodPits: [],
      hasToxicSlip: shouldWolfEmitToxicSlip(speaker, day, 8),
      text: wolfClubPrefix + youziEcho + xiaoChengWolfTell + fill(scSpoke ? flv.wolfSpoken : flv.wolfWait, { t: seatLabel(scapegoat) })
    };
  }
  return null;
}
