/**
 * AI 盤面記憶、嚴格發言時序、好人坑／狼坑盤點與雙觀察員視角建構
 */
"use strict";

function pickPersonaVoice(speaker, slotKey, salt) {
  const flv = (typeof PERSONA_FLAVORS !== "undefined" && speaker && PERSONA_FLAVORS[speaker.name])
    ? PERSONA_FLAVORS[speaker.name]
    : (typeof PERSONA_FLAVORS !== "undefined" ? PERSONA_FLAVORS["小澄"] : null);
  const vs = flv && flv.voiceStyle;
  const list = vs && vs[slotKey];
  if (!Array.isArray(list) || list.length === 0) return "";
  const m = (typeof state !== "undefined" && state.match) ? state.match : {};
  const ep = (typeof orchestrator !== "undefined" && orchestrator.matchEpoch) ? orchestrator.matchEpoch : 0;
  const spokenCnt = Array.isArray(m.daySpeechEvents) ? m.daySpeechEvents.length : 0;
  const seed = ((speaker && speaker.id) || 1) * 19 + (m.day || 1) * 13 + ep * 7 + spokenCnt * 5 + (salt || 0) * 11;
  return list[((seed % list.length) + list.length) % list.length] || "";
}

function buildCrossDayMemoryLedger(viewerSeat) {
  const m = (typeof state !== "undefined" && state.match) ? state.match : null;
  if (!m || !m.started || m.day <= 1) return { lines: [], grudgeIds: [], flipIds: [], wolfProtectorIds: [] };
  const allEvs = m.allSpeechEvents || [];
  const priorEvs = allEvs.filter(function (ev) { return ev && ev.day && ev.day < m.day; });
  const grudgeIds = [];
  const flipIds = [];
  const wolfProtectorIds = [];
  const lines = [];
  const nameOf = function (id) {
    const s = typeof getSeat === "function" ? getSeat(id) : null;
    return s ? (fmtSeatNum(s.id) + "號" + s.name) : (id + "號");
  };

  if (viewerSeat) {
    const attackers = priorEvs.filter(function (ev) { return ev.accuseId === viewerSeat.id && ev.speakerId !== viewerSeat.id; });
    attackers.forEach(function (ev) {
      const sp = getSeat(ev.speakerId);
      if (sp && sp.alive && grudgeIds.indexOf(sp.id) === -1) {
        grudgeIds.push(sp.id);
        lines.push("第" + ev.day + "天 " + nameOf(sp.id) + " 曾點名懷疑我");
      }
    });
  }

  // Fair Play: Detect players who vouched for ANY voted-out seat on an earlier day (ZERO hidden team/role leak!)
  const votedOutSeats = (m.seats || []).filter(function (s) { return !s.alive && s.outReason === "投票出局"; });
  votedOutSeats.forEach(function (vo) {
    priorEvs.forEach(function (ev) {
      if (ev.vouchId === vo.id && ev.speakerId !== vo.id) {
        const sp = getSeat(ev.speakerId);
        if (sp && sp.alive && wolfProtectorIds.indexOf(sp.id) === -1) {
          wolfProtectorIds.push(sp.id);
          lines.push("第" + ev.day + "天 " + nameOf(sp.id) + " 曾力保後來被公投離席的 " + nameOf(vo.id));
        }
      }
    });
  });

  // Detect players who flipped from vouching to accusing the same target across days
  const todayEvs = m.daySpeechEvents || [];
  todayEvs.forEach(function (tev) {
    if (!tev || !tev.accuseId) return;
    const prevVouch = priorEvs.find(function (pev) { return pev.speakerId === tev.speakerId && pev.vouchId === tev.accuseId; });
    if (prevVouch && flipIds.indexOf(tev.speakerId) === -1) {
      flipIds.push(tev.speakerId);
      lines.push(nameOf(tev.speakerId) + " 前一天還力保 " + nameOf(tev.accuseId) + "，今天卻突然改口反咬");
    }
  });

  return {
    lines: lines.slice(0, 4),
    grudgeIds: grudgeIds,
    flipIds: flipIds,
    wolfProtectorIds: wolfProtectorIds
  };
}

function buildPriorCallbackPhrase(speaker, dayEvents, seatLabel) {
  if (!speaker || !Array.isArray(dayEvents) || dayEvents.length === 0) return "";
  const prior = dayEvents.filter(function (ev) { return ev && ev.speakerId && ev.speakerId !== speaker.id; });
  if (prior.length === 0) return "";

  const nameOf = function (id) {
    const s = typeof getSeat === "function" ? getSeat(id) : null;
    if (!s) return "";
    return typeof seatLabel === "function" ? seatLabel(s) : (fmtSeatNum(s.id) + "號" + s.name);
  };

  // Cross-day memory callback (Day 2+): cite flips, wolf-protectors, or prior grudges!
  if (typeof state !== "undefined" && state.match && state.match.day >= 2) {
    const ledger = buildCrossDayMemoryLedger(speaker);
    if (ledger.flipIds.length > 0 && ledger.flipIds[0] !== speaker.id) {
      return "翻一下跨日帳本，" + nameOf(ledger.flipIds[0]) + " 昨天還在保人今天卻突然反水改口，這前後反差太大了；";
    }
    if (ledger.wolfProtectorIds.length > 0 && ledger.wolfProtectorIds[0] !== speaker.id) {
      return "回頭複盤前一天的紀錄，" + nameOf(ledger.wolfProtectorIds[0]) + " 曾替已出局的可疑對象護航，今天得重點檢視；";
    }
    if (ledger.grudgeIds.length > 0 && ledger.grudgeIds[0] !== speaker.id && (speaker.id + state.match.day) % 2 === 0) {
      return "我還記得昨天 " + nameOf(ledger.grudgeIds[0]) + " 一直把矛頭指向我，今天換我好好盯著你的邏輯；";
    }
  }

  // Mutual vouch / standing-together pair detection among today's spoken seats
  for (let i = prior.length - 1; i >= 1; i--) {
    const cur = prior[i];
    if (!cur.vouchId) continue;
    const allyEv = prior.find(function (p) { return p.speakerId === cur.vouchId && (p.vouchId === cur.speakerId || (cur.standWithSeerId && p.speakerId === cur.standWithSeerId)); });
    if (allyEv) {
      return "剛才 " + nameOf(allyEv.speakerId) + " 跟 " + nameOf(cur.speakerId) + " 互保站同一邊，這組綁定關係得一起看；";
    }
  }

  const toxicEv = prior.slice().reverse().find(function (ev) { return ev.hasToxicSlip; });
  if (toxicEv) {
    return "剛才 " + nameOf(toxicEv.speakerId) + " 講話火氣稍微衝了點、語氣不太友善，";
  }

  const godEv = prior.slice().reverse().find(function (ev) { return ev.claimRole && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[ev.claimRole]; });
  if (godEv) {
    return "聽完前置位 " + nameOf(godEv.speakerId) + " 公開跳" + ROLE_DEFS[godEv.claimRole].name + "的說法，";
  }

  const accEv = prior.slice().reverse().find(function (ev) { return ev.accuseId && ev.accuseId !== speaker.id; });
  if (accEv) {
    const tName = nameOf(accEv.accuseId);
    if (tName) return "剛才前置位 " + nameOf(accEv.speakerId) + " 直接把火往 " + tName + " 身上點，";
  }

  const last = prior[prior.length - 1];
  return "接續剛剛 " + nameOf(last.speakerId) + " 的發言來對照，";
}

function buildTableSlotAndWorldAnalysis(viewerSeat) {
  const m = (typeof state !== "undefined" && state.match) ? state.match : null;
  if (!m || !m.started) {
    return { aliveWolfSlots: 2, goodPits: [], wolfPits: [], dualSeerWorlds: null };
  }
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const aliveSeats = getAliveSeats();
  const aliveIds = aliveSeats.map(function (s) { return s.id; });
  const allEvs = (m.allSpeechEvents && m.allSpeechEvents.length) ? m.allSpeechEvents : (m.daySpeechEvents || []);
  const dayEvs = m.daySpeechEvents || [];
  const voteHist = m.voteHistory || [];

  // Identify alive Seer claimants in strict chronological order of claiming
  const seerClaimants = [];
  const pushSeer = function (seat) {
    if (seat && seat.alive && seerClaimants.every(function (x) { return x.id !== seat.id; })) {
      seerClaimants.push(seat);
    }
  };
  allEvs.forEach(function (ev) {
    if (ev && (ev.claimRole === "seer" || ev.checkedWolfId || ev.checkedGoodId)) {
      pushSeer(getSeat(ev.speakerId));
    }
  });
  aliveSeats.forEach(function (s) {
    if (s.claimedRole === "seer") pushSeer(s);
  });

  // Public signals per seat
  const toxicMap = {};
  const contraMap = {};
  const wolfTeamMap = {};
  if (viewerSeat && viewerSeat.role === "wolf") {
    (m.seats || []).forEach(function (s) {
      if (s.role === "wolf") wolfTeamMap[s.id] = true;
    });
  }
  allEvs.forEach(function (ev) {
    if (!ev || !ev.speakerId) return;
    if (ev.hasToxicSlip) toxicMap[ev.speakerId] = true;
    if (ev.contradiction) contraMap[ev.speakerId] = true;
  });
  (m.detectedContradictions || []).forEach(function (c) {
    if (c && c.speakerId) contraMap[c.speakerId] = true;
  });

  const witchClaimants = aliveSeats.filter(function (s) { return s.claimedRole === "witch"; });
  const hunterClaimants = aliveSeats.filter(function (s) { return s.claimedRole === "hunter"; });
  const soleWitch = witchClaimants.length === 1 ? witchClaimants[0] : null;
  const soleHunter = hunterClaimants.length === 1 ? hunterClaimants[0] : null;

  const silverWaterIds = [];
  if (soleWitch) {
    allEvs.forEach(function (ev) {
      if (ev.speakerId === soleWitch.id && ev.claimRole === "witch" && ev.vouchId && aliveIds.indexOf(ev.vouchId) !== -1 && silverWaterIds.indexOf(ev.vouchId) === -1) {
        silverWaterIds.push(ev.vouchId);
      }
    });
  }

  // Legal personal knowledge (strictly no cheating!)
  const legalKnownGood = {};
  const legalKnownWolf = {};
  if (viewerSeat) {
    if (viewerSeat.team === "good") legalKnownGood[viewerSeat.id] = true;
    if (viewerSeat.role === "seer") {
      (viewerSeat.checkedHistory || []).forEach(function (c) {
        if (c.isWolf) legalKnownWolf[c.targetId] = true;
        else legalKnownGood[c.targetId] = true;
      });
    }
    if (viewerSeat.role === "witch" && viewerSeat.savedSeatId) {
      legalKnownGood[viewerSeat.savedSeatId] = true;
    }
    if (viewerSeat.id === pid && m.playerKnownRoles) {
      Object.keys(m.playerKnownRoles).forEach(function (k) {
        const sid = parseInt(k, 10);
        if (m.playerKnownRoles[k] === "wolf") legalKnownWolf[sid] = true;
        else if (m.playerKnownRoles[k] === "good_verified") legalKnownGood[sid] = true;
      });
    }
  }

  // Estimate remaining alive wolf slots fairly from public check losses & role clashes
  let confirmedDeadWolves = 0;
  const uncontestedSeer = seerClaimants.length === 1 ? seerClaimants[0] : null;
  (m.seats || []).forEach(function (s) {
    if (s.alive) return;
    const lostClash = Boolean(s.claimedRole && aliveSeats.some(function (a) { return a.claimedRole === s.claimedRole; }));
    const verifiedDeadWolf = Boolean(uncontestedSeer && allEvs.some(function (ev) {
      return ev.speakerId === uncontestedSeer.id && ev.checkedWolfId === s.id;
    }));
    const viewerKnownDeadWolf = Boolean(legalKnownWolf[s.id]);
    if (lostClash || verifiedDeadWolf || viewerKnownDeadWolf) confirmedDeadWolves += 1;
  });
  const baseWolfTotal = typeof getInitialWolfCount === "function"
    ? getInitialWolfCount(m.totalSeats)
    : (m.totalSeats >= 12 ? 4 : (m.totalSeats >= 10 ? 3 : (m.totalSeats >= 6 ? 2 : 1)));
  const aliveWolfSlots = Math.max(1, Math.min(baseWolfTotal, baseWolfTotal - confirmedDeadWolves));

  let dualSeerWorlds = null;
  if (seerClaimants.length >= 2) {
    const seerA = seerClaimants[0];
    const seerB = seerClaimants[1];

    const buildWorld = function (trusted, fake) {
      const checkedGoodIds = [];
      const checkedWolfIds = [];
      allEvs.forEach(function (ev) {
        if (!ev || ev.speakerId !== trusted.id) return;
        if (ev.checkedGoodId && aliveIds.indexOf(ev.checkedGoodId) !== -1 && ev.checkedGoodId !== fake.id && checkedGoodIds.indexOf(ev.checkedGoodId) === -1) {
          checkedGoodIds.push(ev.checkedGoodId);
        }
        if (ev.checkedWolfId && aliveIds.indexOf(ev.checkedWolfId) !== -1 && ev.checkedWolfId !== fake.id && checkedWolfIds.indexOf(ev.checkedWolfId) === -1) {
          checkedWolfIds.push(ev.checkedWolfId);
        }
      });
      if (viewerSeat && viewerSeat.id === trusted.id && viewerSeat.role === "seer") {
        (viewerSeat.checkedHistory || []).forEach(function (c) {
          if (aliveIds.indexOf(c.targetId) === -1 || c.targetId === fake.id) return;
          if (c.isWolf && checkedWolfIds.indexOf(c.targetId) === -1) checkedWolfIds.push(c.targetId);
          if (!c.isWolf && checkedGoodIds.indexOf(c.targetId) === -1) checkedGoodIds.push(c.targetId);
        });
      }

      const goodPits = [trusted];
      const pushGood = function (seatObj) {
        if (seatObj && seatObj.alive && seatObj.id !== fake.id && goodPits.every(function (x) { return x.id !== seatObj.id; })) {
          goodPits.push(seatObj);
        }
      };
      checkedGoodIds.forEach(function (id) { pushGood(getSeat(id)); });
      silverWaterIds.forEach(function (id) {
        if (checkedWolfIds.indexOf(id) === -1) pushGood(getSeat(id));
      });
      if (soleWitch && checkedWolfIds.indexOf(soleWitch.id) === -1) pushGood(soleWitch);
      if (soleHunter && checkedWolfIds.indexOf(soleHunter.id) === -1) pushGood(soleHunter);
      if (viewerSeat && viewerSeat.team === "good" && viewerSeat.id !== trusted.id && viewerSeat.id !== fake.id) {
        pushGood(viewerSeat);
      }

      const candPool = aliveSeats.filter(function (c) {
        if (c.id === trusted.id || c.id === fake.id) return false;
        if (viewerSeat && c.id === viewerSeat.id) return false;
        if (checkedGoodIds.indexOf(c.id) !== -1) return false;
        return true;
      });

      const scoredCands = candPool.map(function (c) {
        let pitScore = 0;
        const reasons = [];
        if (checkedWolfIds.indexOf(c.id) !== -1) {
          pitScore += 52;
          reasons.push("觀察員指為狼");
        }
        const backedFake = allEvs.some(function (ev) {
          return ev.speakerId === c.id && (
            ev.vouchId === fake.id ||
            ev.standWithSeerId === fake.id ||
            ev.accuseId === trusted.id ||
            (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(trusted.id) !== -1)
          );
        });
        if (backedFake) {
          pitScore += 32;
          reasons.push("站邊對跳位");
        }
        if (toxicMap[c.id] || contraMap[c.id]) {
          pitScore += 20;
          reasons.push("語氣與邏輯有破綻");
        }
        const votedTrusted = voteHist.some(function (vh) {
          return (vh.ballots || []).some(function (b) { return b.voterId === c.id && b.targetId === trusted.id; });
        });
        if (votedTrusted) {
          pitScore += 14;
          reasons.push("前輪投票針對觀察員");
        }
        if (viewerSeat && viewerSeat.suspicionMap) {
          pitScore += Math.round(((viewerSeat.suspicionMap[c.id] || 50) - 44) * 0.45);
        }
        if (legalKnownGood[c.id]) {
          pitScore -= 55;
        }
        if (viewerSeat && viewerSeat.role === "wolf" && wolfTeamMap[c.id]) {
          pitScore -= 85;
        }
        return { seat: c, score: pitScore, reason: reasons[0] || "立場曖昧待檢視" };
      }).sort(function (a, b) { return b.score - a.score; });

      const secondWolf = (aliveWolfSlots >= 2 && scoredCands.length > 0) ? scoredCands[0].seat : null;
      const secondReason = (aliveWolfSlots >= 2 && scoredCands.length > 0) ? scoredCands[0].reason : "";
      const wolfPits = [fake];
      if (secondWolf) wolfPits.push(secondWolf);

      let conflictReason = "";
      let worldScore = 50;
      if (viewerSeat && viewerSeat.suspicionMap) {
        worldScore += Math.round((50 - (viewerSeat.suspicionMap[trusted.id] || 50)) * 0.7);
        worldScore += Math.round(((viewerSeat.suspicionMap[fake.id] || 50) - 50) * 0.55);
      }
      if (toxicMap[trusted.id]) worldScore -= 18;
      if (contraMap[trusted.id]) worldScore -= 22;
      if (toxicMap[fake.id]) worldScore += 14;
      if (contraMap[fake.id]) worldScore += 18;

      if (viewerSeat && viewerSeat.role === "seer") {
        if (trusted.id === viewerSeat.id) {
          worldScore += 140;
        } else {
          worldScore -= 140;
          conflictReason = "跟真正的我對跳身分";
        }
      } else if (viewerSeat && viewerSeat.team === "good") {
        if (checkedWolfIds.indexOf(viewerSeat.id) !== -1) {
          worldScore -= 95;
          conflictReason = "他直接把我查進狼坑，邏輯爆掉";
        } else if (viewerSeat.role === "witch" && viewerSeat.savedSeatId && checkedWolfIds.indexOf(viewerSeat.savedSeatId) !== -1) {
          worldScore -= 75;
          conflictReason = "他把護回的好人打進狼坑，直接撞牆";
        } else if (checkedGoodIds.indexOf(viewerSeat.id) !== -1) {
          worldScore += 20;
        }
      }
      if (secondWolf && legalKnownGood[secondWolf.id]) {
        worldScore -= 28;
        if (!conflictReason) conflictReason = "第二狼坑撞到已確認清白的夥伴";
      }

      return {
        trustedSeer: trusted,
        fakeSeer: fake,
        checkedGoodIds: checkedGoodIds,
        checkedWolfIds: checkedWolfIds,
        goodPits: goodPits.slice(0, 3),
        secondWolf: secondWolf,
        secondReason: secondReason,
        wolfPits: wolfPits,
        conflictReason: conflictReason,
        score: worldScore
      };
    };

    const worldA = buildWorld(seerA, seerB);
    const worldB = buildWorld(seerB, seerA);

    let preferredSide = worldA.score >= worldB.score ? "A" : "B";
    const pSelf = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    const wTactic = (pSelf && pSelf.role === "wolf" && m.wolfTactic) ? m.wolfTactic : "auto";
    if (viewerSeat && viewerSeat.role === "wolf" && wTactic !== "deep_stealth") {
      if (seerA.role === "wolf" && seerB.role !== "wolf") preferredSide = "A";
      else if (seerB.role === "wolf" && seerA.role !== "wolf") preferredSide = "B";
    }

    dualSeerWorlds = {
      seerA: seerA,
      seerB: seerB,
      worldA: worldA,
      worldB: worldB,
      preferredSide: preferredSide,
      chosenWorld: preferredSide === "A" ? worldA : worldB,
      rivalWorld: preferredSide === "A" ? worldB : worldA
    };
  }

  // General slot synthesis (goodPits & wolfPits)
  const spokenSet = {};
  dayEvs.forEach(function (ev) { if (ev && ev.speakerId) spokenSet[ev.speakerId] = true; });

  const goodPits = [];
  const pushGenGood = function (seatObj) {
    if (!seatObj || !seatObj.alive) return;
    if (viewerSeat && seatObj.id === viewerSeat.id) return;
    if (goodPits.every(function (x) { return x.id !== seatObj.id; })) goodPits.push(seatObj);
  };

  if (dualSeerWorlds) {
    dualSeerWorlds.chosenWorld.goodPits.forEach(function (s) { pushGenGood(s); });
  } else {
    Object.keys(legalKnownGood).forEach(function (k) { pushGenGood(getSeat(parseInt(k, 10))); });
    silverWaterIds.forEach(function (id) { pushGenGood(getSeat(id)); });
    if (soleWitch) pushGenGood(soleWitch);
    if (soleHunter) pushGenGood(soleHunter);
    const lowestSus = aliveSeats.filter(function (s) {
      if (viewerSeat && s.id === viewerSeat.id) return false;
      if (legalKnownWolf[s.id]) return false;
      if (viewerSeat && viewerSeat.role === "wolf" && wolfTeamMap[s.id]) return false;
      return spokenSet[s.id] && viewerSeat && (viewerSeat.suspicionMap[s.id] || 50) <= 44;
    }).sort(function (a, b) {
      return (viewerSeat.suspicionMap[a.id] || 50) - (viewerSeat.suspicionMap[b.id] || 50);
    });
    lowestSus.slice(0, 2).forEach(pushGenGood);
  }

  const wolfPits = [];
  const pushGenWolf = function (seatObj) {
    if (!seatObj || !seatObj.alive) return;
    if (viewerSeat && seatObj.id === viewerSeat.id) return;
    if (viewerSeat && viewerSeat.role === "wolf" && wolfTeamMap[seatObj.id]) return;
    if (legalKnownGood[seatObj.id]) return;
    if (goodPits.some(function (g) { return g.id === seatObj.id; })) return;
    if (wolfPits.every(function (x) { return x.id !== seatObj.id; })) wolfPits.push(seatObj);
  };

  if (dualSeerWorlds) {
    dualSeerWorlds.chosenWorld.wolfPits.forEach(pushGenWolf);
  } else {
    Object.keys(legalKnownWolf).forEach(function (k) { pushGenWolf(getSeat(parseInt(k, 10))); });
    // Ranked spoken + known suspicious candidates
    const susCands = aliveSeats.filter(function (s) {
      if (viewerSeat && s.id === viewerSeat.id) return false;
      if (viewerSeat && viewerSeat.role === "wolf" && wolfTeamMap[s.id]) return false;
      if (legalKnownGood[s.id]) return false;
      return true;
    }).sort(function (a, b) {
      const aBoost = (toxicMap[a.id] ? 14 : 0) + (contraMap[a.id] ? 18 : 0) + (spokenSet[a.id] ? 6 : 0);
      const bBoost = (toxicMap[b.id] ? 14 : 0) + (contraMap[b.id] ? 18 : 0) + (spokenSet[b.id] ? 6 : 0);
      const aVal = (viewerSeat && viewerSeat.suspicionMap ? (viewerSeat.suspicionMap[a.id] || 50) : 50) + aBoost;
      const bVal = (viewerSeat && viewerSeat.suspicionMap ? (viewerSeat.suspicionMap[b.id] || 50) : 50) + bBoost;
      return bVal - aVal;
    });
    susCands.slice(0, aliveWolfSlots).forEach(pushGenWolf);
  }

  return {
    aliveWolfSlots: aliveWolfSlots,
    goodPits: goodPits.slice(0, 3),
    wolfPits: wolfPits.slice(0, aliveWolfSlots),
    dualSeerWorlds: dualSeerWorlds
  };
}

function buildSpeechContext(speaker) {
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== speaker.id; });
  const day = state.match.day;
  const dayEvents = state.match.daySpeechEvents || [];
  const todaySpeeches = state.match.logs.filter(function (l) { return l.day === day && l.kind === "speech"; });
  const spokenIdsToday = [];
  dayEvents.forEach(function (ev) {
    if (ev && ev.speakerId && ev.speakerId !== speaker.id && spokenIdsToday.indexOf(ev.speakerId) === -1) {
      spokenIdsToday.push(ev.speakerId);
    }
  });
  todaySpeeches.forEach(function (l) {
    if (l.speakerId && l.speakerId !== speaker.id && spokenIdsToday.indexOf(l.speakerId) === -1) {
      spokenIdsToday.push(l.speakerId);
    }
  });
  const spokeToday = function (seatOrId) {
    const id = typeof seatOrId === "number" ? seatOrId : (seatOrId && seatOrId.id);
    return Boolean(id && spokenIdsToday.indexOf(id) !== -1);
  };
  const spokenOthers = spokenIdsToday.map(function (id) { return getSeat(id); }).filter(function (s) {
    return Boolean(s && s.alive && s.id !== speaker.id);
  });
  const queueIds = (state.match.speechQueue || []).slice();
  const unspokenOthers = aliveOthers.filter(function (s) {
    return spokenIdsToday.indexOf(s.id) === -1;
  }).sort(function (a, b) {
    const ia = queueIds.indexOf(a.id);
    const ib = queueIds.indexOf(b.id);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.id - b.id;
  });
  const isFirstToday = spokenIdsToday.length === 0;
  const isEarlySeat = spokenIdsToday.length <= 1;
  const isLateSeat = unspokenOthers.length <= 1 && spokenOthers.length >= 2;
  const positionTag = isFirstToday ? "首位起手" : (isEarlySeat ? "前置位" : (isLateSeat ? "末置位歸票" : "中置位"));
  const flv = PERSONA_FLAVORS[speaker.name] || PERSONA_FLAVORS["小澄"];

  const seatLabel = function (s) {
    if (!s) return "後面夥伴";
    return s.id + "號" + (s.id === getPlayerId() ? "" : s.name);
  };
  const fill = function (tpl, map) {
    let out = tpl;
    if (Array.isArray(tpl)) {
      const ep = (typeof orchestrator !== "undefined" && orchestrator.matchEpoch) ? orchestrator.matchEpoch : 0;
      const seed = speaker.id * 17 + day * 13 + ep * 7 + todaySpeeches.length * 3 + Object.keys(map || {}).length;
      out = tpl[((seed % tpl.length) + tpl.length) % tpl.length] || "";
    }
    out = String(out || "");
    Object.keys(map || {}).forEach(function (k) {
      out = out.split("{" + k + "}").join(map[k] || "");
    });
    return out;
  };

  // Cumulative Multi-Round Analysis across ALL prior rounds (Day 1 .. Day N-1 speeches + vote tallies!)
  const priorVotesAll = (day >= 2 && state.match.voteHistory) ? state.match.voteHistory : [];
  const priorSpeechesAll = (day >= 2 && state.match.allSpeechEvents)
    ? state.match.allSpeechEvents.filter(function (ev) { return ev.day < day; })
    : [];

  let prevVoteNote = "";
  let prevVoteSuspect = null;
  if (day >= 2 && (priorVotesAll.length > 0 || priorSpeechesAll.length > 0)) {
    const aliveIds = getAliveSeats().map(function (s) { return s.id; });
    const lastVh = priorVotesAll.length > 0 ? priorVotesAll[priorVotesAll.length - 1] : null;

    // Priority 1: Catch cross-round speech-vs-vote hypocrisy (only when no new intervening evidence surfaced!)
    let hypocriteEv = null;
    const allEvsForHypo = state.match.allSpeechEvents || [];
    for (let ei = priorSpeechesAll.length - 1; ei >= 0; ei--) {
      const ev = priorSpeechesAll[ei];
      if (ev.speakerId === speaker.id || aliveIds.indexOf(ev.speakerId) === -1 || !ev.vouchId) continue;
      const flipBallot = priorVotesAll.some(function (vh) {
        return (vh.ballots || []).some(function (b) { return b.voterId === ev.speakerId && b.targetId === ev.vouchId; });
      });
      if (!flipBallot) continue;
      const evIdx = allEvsForHypo.indexOf(ev);
      const hasNewEvidence = allEvsForHypo.some(function (laterEv, idx) {
        if ((laterEv.day || 1) < (ev.day || 1)) return false;
        if (laterEv.day === ev.day && evIdx !== -1 && idx <= evIdx) return false;
        return laterEv.checkedWolfId === ev.vouchId || (laterEv.speakerId === ev.vouchId && laterEv.hasToxicSlip);
      });
      if (!hasNewEvidence) { hypocriteEv = ev; break; }
    }

    // Priority 2: Someone who accused or voted against ME in prior rounds
    const votedMeEntry = lastVh && (lastVh.ballots || []).find(function (b) {
      return b.targetId === speaker.id && b.voterId !== speaker.id && aliveIds.indexOf(b.voterId) !== -1;
    });
    const accusedMePast = priorSpeechesAll.slice().reverse().find(function (ev) {
      return ev.accuseId === speaker.id && ev.speakerId !== speaker.id && aliveIds.indexOf(ev.speakerId) !== -1;
    });

    // Priority 3: Repeated or recent abstainers across prior rounds
    const abstainerCounts = {};
    priorVotesAll.forEach(function (vh) {
      (vh.ballots || []).forEach(function (b) {
        if (!b.targetId && b.voterId !== speaker.id && aliveIds.indexOf(b.voterId) !== -1) {
          abstainerCounts[b.voterId] = (abstainerCounts[b.voterId] || 0) + 1;
        }
      });
    });
    const topAbstainerId = Object.keys(abstainerCounts).sort(function (a, b) { return abstainerCounts[b] - abstainerCounts[a]; })[0];

    const topTargetKey = lastVh ? Object.keys(lastVh.tallies || {}).sort(function (a, b) { return (lastVh.tallies[b] || 0) - (lastVh.tallies[a] || 0); })[0] : null;
    const topTargetId = topTargetKey ? parseInt(topTargetKey, 10) : null;
    const speakerVotedTop = Boolean(lastVh && topTargetId && (lastVh.ballots || []).some(function (b) { return b.voterId === speaker.id && b.targetId === topTargetId; }));
    const blocVoters = (lastVh && topTargetId && !speakerVotedTop)
      ? (lastVh.ballots || []).filter(function (b) { return b.targetId === topTargetId && b.voterId !== speaker.id && aliveIds.indexOf(b.voterId) !== -1; })
      : [];

    if (hypocriteEv) {
      const hSeat = getSeat(hypocriteEv.speakerId);
      prevVoteSuspect = hSeat;
      prevVoteNote = "我先抓上一輪 " + seatLabel(hSeat) + " 的前後矛盾：昨天嘴上才保 " + seatLabel(getSeat(hypocriteEv.vouchId)) + "，公投卻轉頭砸票，根本自打嘴巴！";
    } else if (votedMeEntry) {
      const vSeat = getSeat(votedMeEntry.voterId);
      prevVoteSuspect = vSeat;
      prevVoteNote = "我先點出上一輪 " + seatLabel(vSeat) + " 居然把票投給我，明顯想亂找好人抗推！";
    } else if (accusedMePast) {
      const aSeat = getSeat(accusedMePast.speakerId);
      prevVoteSuspect = aSeat;
      prevVoteNote = seatLabel(aSeat) + " 上一輪就急著把火往我身上引，動機非常可疑，今天重點盯著他！";
    } else if (topAbstainerId) {
      const abSeat = getSeat(parseInt(topAbstainerId, 10));
      const abCnt = abstainerCounts[topAbstainerId];
      prevVoteSuspect = abSeat;
      prevVoteNote = seatLabel(abSeat) + (abCnt >= 2 ? (" 已經連 " + abCnt + " 輪棄票划水，") : " 上一輪棄票不沾鍋，") + "躲在後面最像狼坑位！";
    } else if (!speakerVotedTop && blocVoters.length > 0 && topTargetId) {
      const bNames = blocVoters.slice(0, 2).map(function (b) { return seatLabel(getSeat(b.voterId)); }).join("跟");
      const tSeat = getSeat(topTargetId);
      prevVoteSuspect = getSeat(blocVoters[0].voterId);
      prevVoteNote = bNames + " 上一輪很有默契一起衝票投 " + seatLabel(tSeat) + "，裡面大機率藏著狼坑！";
    }

    // Backstab / Saved-Out-Target Minority Check (when previous day voted out a seat later revealed or pushed off-consensus)
    if (!prevVoteNote && lastVh && Array.isArray(lastVh.ballots)) {
      const splitVote = lastVh.ballots.find(function (b) {
        if (!b.targetId || b.voterId === speaker.id || aliveIds.indexOf(b.voterId) === -1) return false;
        const tCount = (lastVh.tallies && lastVh.tallies[b.targetId]) || 0;
        const maxT = topTargetId && lastVh.tallies ? (lastVh.tallies[topTargetId] || 0) : 0;
        return maxT >= 3 && tCount <= 1;
      });
      if (splitVote) {
        const spSeat = getSeat(splitVote.voterId);
        if (spSeat) {
          prevVoteSuspect = spSeat;
          prevVoteNote = seatLabel(spSeat) + " 上一輪在眾人集火時刻意分票到無人問津的邊緣席，很像幫同伴墊票洗白！";
        }
      }
    }
  }

  const seerWolfOnMe = dayEvents.find(function (ev) { return ev.checkedWolfId === speaker.id && ev.speakerId !== speaker.id; });
  const wolfPitCallersOnMe = dayEvents.filter(function (ev) {
    if (!ev || ev.speakerId === speaker.id) return false;
    return ev.accuseId === speaker.id || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(speaker.id) !== -1);
  });
  const wolfPitOnMe = wolfPitCallersOnMe.length > 0 ? wolfPitCallersOnMe[wolfPitCallersOnMe.length - 1] : null;
  const accuseOnMe = dayEvents.find(function (ev) { return ev.accuseId === speaker.id && ev.speakerId !== speaker.id; }) || wolfPitOnMe;
  const goodPitOnMe = dayEvents.slice().reverse().find(function (ev) {
    if (!ev || ev.speakerId === speaker.id) return false;
    return ev.vouchId === speaker.id || (Array.isArray(ev.goodPits) && ev.goodPits.indexOf(speaker.id) !== -1);
  }) || null;
  const vouchOnMe = goodPitOnMe;
  const priorFakeSeerEv = dayEvents.find(function (ev) { return ev.claimRole === "seer" && ev.speakerId !== speaker.id; });
  const priorSeerWolfEv = dayEvents.find(function (ev) { return ev.checkedWolfId && ev.speakerId !== speaker.id; });
  const latestEv = dayEvents.length > 0 ? dayEvents[dayEvents.length - 1] : null;

  // Natural reaction to last night's casualty (Witch never pretends her own purified target was wolf-attacked!)
  const lastOutIds = state.match.lastNightCasualties || [];
  let nightDeathNote = "";
  if (lastOutIds.length > 0 && day >= 2) {
    const deadSeat = getSeat(lastOutIds[0]);
    const selfPurifiedDead = Boolean(deadSeat && speaker.role === "witch" && speaker.purifiedSeatId === deadSeat.id);
    if (deadSeat && !selfPurifiedDead) {
      const deadPastAccuse = priorSpeechesAll.slice().reverse().find(function (ev) { return ev.speakerId === deadSeat.id && ev.accuseId; });
      const deadSusSeat = deadPastAccuse ? getSeat(deadPastAccuse.accuseId) : null;
      if (deadSusSeat && deadSusSeat.alive && deadSusSeat.id !== speaker.id) {
        nightDeathNote = "昨晚 " + seatLabel(deadSeat) + " 離席，他上一輪剛好點名進狼坑的是 " + seatLabel(deadSusSeat) + "，這波刀口線索不能放過！";
        if (!prevVoteSuspect) prevVoteSuspect = deadSusSeat;
      } else {
        nightDeathNote = "昨晚 " + seatLabel(deadSeat) + " 夜間離席，代表他前一天點到的狼坑很可能切中要害！";
      }
    }
  }
  if (nightDeathNote && !prevVoteNote) prevVoteNote = nightDeathNote;

  const priorGodClaims = dayEvents.filter(function (ev) {
    return ev.speakerId !== speaker.id && (ev.claimRole === "seer" || ev.claimRole === "witch" || ev.claimRole === "hunter" || ev.claimRole === "guard");
  });
  const priorSameRoleSteal = (speaker.role === "seer" || speaker.role === "witch" || speaker.role === "hunter" || speaker.role === "guard")
    ? priorGodClaims.find(function (ev) { return ev.claimRole === speaker.role; })
    : null;

  const slotPlan = buildTableSlotAndWorldAnalysis(speaker);
  const callbackPhrase = buildPriorCallbackPhrase(speaker, dayEvents, seatLabel);
  const pickVoice = function (slotKey, salt) {
    return pickPersonaVoice(speaker, slotKey, salt);
  };

  return {
    aliveOthers: aliveOthers,
    day: day,
    todaySpeeches: todaySpeeches,
    spokenIdsToday: spokenIdsToday,
    spokenOthers: spokenOthers,
    unspokenOthers: unspokenOthers,
    spokeToday: spokeToday,
    isFirstToday: isFirstToday,
    isEarlySeat: isEarlySeat,
    isLateSeat: isLateSeat,
    positionTag: positionTag,
    flv: flv,
    seatLabel: seatLabel,
    fill: fill,
    pickVoice: pickVoice,
    callbackPhrase: callbackPhrase,
    dayEvents: dayEvents,
    priorVotesAll: priorVotesAll,
    priorSpeechesAll: priorSpeechesAll,
    prevVoteNote: prevVoteNote,
    prevVoteSuspect: prevVoteSuspect,
    seerWolfOnMe: seerWolfOnMe,
    accuseOnMe: accuseOnMe,
    wolfPitCallersOnMe: wolfPitCallersOnMe,
    wolfPitOnMe: wolfPitOnMe,
    vouchOnMe: vouchOnMe,
    goodPitOnMe: goodPitOnMe,
    priorFakeSeerEv: priorFakeSeerEv,
    priorSeerWolfEv: priorSeerWolfEv,
    latestEv: latestEv,
    priorGodClaims: priorGodClaims,
    priorSameRoleSteal: priorSameRoleSteal,
    slotPlan: slotPlan,
    dualSeerWorlds: slotPlan.dualSeerWorlds
  };
}

// Strict 凹嗚狼人殺 turn order: no mid-speech grilling or interrupting allowed!

function applySpeechInfluence(speaker, speechMeta) {
  const diff = state.aiDifficulty || "normal";
  const harmony = (state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72;
  const toxicPenalty = (diff === "easy" ? 15 : (diff === "pro" ? 9 : 11)) + (harmony >= 85 ? 5 : 0);
  const hazeWolfBoost = (harmony <= 45 && speaker.team === "wolf") ? 1.35 : 1.0;
  const diffCredMul = (diff === "easy" ? 1.18 : (diff === "pro" ? 0.88 : 1.0)) * hazeWolfBoost;
  const extraWolfPits = Array.isArray(speechMeta.wolfPits) ? speechMeta.wolfPits : [];

  state.match.seats.forEach(function (listener) {
    if (!listener.alive || listener.id === speaker.id || listener.id === getPlayerId()) return;
    if (listener.role === "seer" && speechMeta.claimSeer && speaker.role !== "seer") {
      listener.suspicionMap[speaker.id] = 100;
    }
    // Good AIs detect divisive/toxic wolf slips and raise suspicion on the speaker!
    if (listener.team === "good" && speechMeta.hasToxicSlip) {
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + toxicPenalty, 5, 96);
    }
    // Seats explicitly placed into the speaker's wolf pit raise caution toward that speaker!
    if (listener.team === "good" && !speechMeta.claimSeer && (speechMeta.accuseId === listener.id || extraWolfPits.indexOf(listener.id) !== -1)) {
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + 7, 5, 96);
    }
    // Cognitive archetype weighting: Gullible AIs easily believe claims, Skeptical AIs verify critically!
    const styleMul = (listener.deductionStyle === "gullible" ? 1.45 : (listener.deductionStyle === "skeptical" ? 0.55 : 1.0)) * diffCredMul;
    if (listener.team === "good" && listener.deductionStyle === "skeptical" && speechMeta.claimSeer && speechMeta.hasToxicSlip) {
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + 14, 5, 96);
    }
    if ((listener.suspicionMap[speaker.id] || 50) >= 95) return;

    const accSeatObj = speechMeta.accuseId ? getSeat(speechMeta.accuseId) : null;
    const isWitchSaved = (listener.role === "witch" && listener.savedSeatId === speechMeta.accuseId);
    const wolfProtectsMate = (listener.role === "wolf" && accSeatObj && accSeatObj.role === "wolf");
    if (speechMeta.accuseId && speechMeta.accuseId !== listener.id && !isWitchSaved && !wolfProtectsMate) {
      const baseCred = speechMeta.claimSeer ? (speechMeta.hasToxicSlip ? 8 : 15) : 8;
      const credibility = Math.round(baseCred * styleMul);
      const checkedZero = (listener.checkedHistory || []).some(function (c) { return c.targetId === speechMeta.accuseId && !c.isWolf; });
      if (!checkedZero) {
        listener.suspicionMap[speechMeta.accuseId] = clamp((listener.suspicionMap[speechMeta.accuseId] || 50) + credibility, 5, 96);
      }
    }
    // Gentle persuasion on any secondary wolfPit mentioned beyond primary accuseId
    extraWolfPits.forEach(function (wpId) {
      if (!wpId || wpId === speechMeta.accuseId || wpId === listener.id) return;
      const wpObj = getSeat(wpId);
      if (!wpObj || !wpObj.alive) return;
      if (listener.role === "witch" && listener.savedSeatId === wpId) return;
      if (listener.role === "wolf" && wpObj.role === "wolf") return;
      const checkedZero = (listener.checkedHistory || []).some(function (c) { return c.targetId === wpId && !c.isWolf; });
      if (!checkedZero) {
        listener.suspicionMap[wpId] = clamp((listener.suspicionMap[wpId] || 50) + Math.round(5 * styleMul), 5, 96);
      }
    });
    if (speechMeta.vouchId && speechMeta.vouchId !== listener.id) {
      const checkedWolf = (listener.checkedHistory || []).some(function (c) { return c.targetId === speechMeta.vouchId && c.isWolf; });
      if (!checkedWolf) {
        const vouchDelta = Math.round(11 * styleMul);
        listener.suspicionMap[speechMeta.vouchId] = clamp((listener.suspicionMap[speechMeta.vouchId] || 50) - vouchDelta, 5, 96);
      }
    }
  });
}

function recordRelation(fromId, toId, type) {
  if (!fromId || !toId || fromId === toId) return;
  state.match.relations = state.match.relations.filter(function (r) {
    return !(r.fromId === fromId && r.toId === toId);
  });
  state.match.relations.push({ fromId: fromId, toId: toId, type: type, day: state.match.day });
}
