/**
 * 邏輯矛盾偵測引擎、茶席公開風向指標與秘密角色任務（Zero Hidden-Info Leaks）
 */
"use strict";

const ROLE_MISSION_DEFS = {
  seer: {
    title: "火眼破迷",
    desc: "查出酸民狼並見證其被請離茶席",
    bonusPts: 15
  },
  witch: {
    title: "暖茶濟世",
    desc: "用暖心茶護回好夥伴或用清心茶請離酸民狼",
    bonusPts: 15
  },
  hunter: {
    title: "正氣壓陣",
    desc: "好人勝時仍在場或正氣共鳴帶走酸民狼",
    bonusPts: 15
  },
  guard: {
    title: "護心屏風",
    desc: "成功擋下酸民狼夜襲或守護好人獲勝",
    bonusPts: 15
  },
  villager: {
    title: "察言清風",
    desc: "全程零酸言且蒐證／抓矛盾達 2 次",
    bonusPts: 15
  },
  elder: {
    title: "泰山定海",
    desc: "發動清心長老豁免護盾，或以零酸言率領好人陣營獲勝",
    bonusPts: 15
  },
  wolf: {
    title: "暗影帶風",
    desc: "帶隊奪勝或成功誘導好人錯投好人 2 票",
    bonusPts: 15
  },
  wolf_king: {
    title: "流言策動",
    desc: "成功發動流言首領臨離反撲，或帶領酸民狼陣營奪勝",
    bonusPts: 15
  }
};

function createRoleMission(role) {
  const r = ROLE_MISSION_DEFS[role] ? role : "villager";
  const def = ROLE_MISSION_DEFS[r];
  return {
    role: r,
    title: def.title,
    desc: def.desc,
    bonusPts: def.bonusPts,
    completed: false,
    progressText: "0/1 進行中"
  };
}

function evaluateRoleMission() {
  if (typeof state === "undefined" || !state.match || !state.match.roleMission) return null;
  const m = state.match;
  const mis = m.roleMission;
  const p = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  if (!p) return mis;

  let ok = false;
  let prog = "進行中";

  if (mis.role === "seer") {
    const chks = p.checkedHistory || [];
    const caughtWolves = chks.filter(function (c) { return c.isWolf; });
    const outCaught = caughtWolves.filter(function (c) {
      const s = typeof getSeat === "function" ? getSeat(c.targetId) : null;
      return Boolean(s && !s.alive);
    });
    ok = outCaught.length > 0;
    prog = ok ? "已完成：查獲酸民狼已離席" : ("已查到 " + caughtWolves.length + " 狼・待請離");
  } else if (mis.role === "witch") {
    const savedSeat = p.savedSeatId && typeof getSeat === "function" ? getSeat(p.savedSeatId) : null;
    const purifiedSeat = p.purifiedSeatId && typeof getSeat === "function" ? getSeat(p.purifiedSeatId) : null;
    const goodHeal = Boolean(savedSeat && savedSeat.team === "good" && savedSeat.alive);
    const wolfPurify = Boolean(purifiedSeat && purifiedSeat.team === "wolf");
    ok = goodHeal || wolfPurify;
    prog = ok ? "已完成：茶席救援／請離奏效" : "待暖心護友或清心請離酸民狼";
  } else if (mis.role === "hunter") {
    const shotWolf = (m.nightArchive || []).some(function (rec) {
      if (!rec.hunterShot || rec.hunterShot.hunterId !== p.id) return false;
      const t = typeof getSeat === "function" ? getSeat(rec.hunterShot.targetId) : null;
      return Boolean(t && t.team === "wolf");
    });
    const outShotWolf = (m.seats || []).some(function (s) {
      return !s.alive && s.team === "wolf" && s.outReason === "正氣共鳴請離";
    });
    const aliveWin = Boolean(m.phase === "GAME_OVER" && m.winner === "good" && p.alive);
    ok = aliveWin || shotWolf || outShotWolf;
    prog = ok ? "已完成：正氣鎮守全場" : "保持活躍或準備正氣共鳴";
  } else if (mis.role === "guard") {
    const blockedNight = (m.nightArchive || []).some(function (rec) {
      return rec && rec.guardTarget && rec.wolfTarget && rec.guardTarget === rec.wolfTarget && !rec.doubleSaveClash;
    });
    const aliveWinG = Boolean(m.phase === "GAME_OVER" && m.winner === "good" && p.alive);
    ok = blockedNight || aliveWinG;
    prog = ok ? "已完成：護心結界立大功" : "謹慎守護核心、嚴防同守破盾";
  } else if (mis.role === "villager") {
    const st = m.stats || {};
    const cluesTotal = (st.cluesCaught || 0) + (st.contradictionsFound || 0);
    const cleanSpeech = (st.toxicSentCount || 0) === 0;
    ok = cleanSpeech && cluesTotal >= 2;
    prog = cleanSpeech
      ? (Math.min(2, cluesTotal) + "/2 線索蒐證")
      : "已發送過酸言（密令未成）";
  } else if (mis.role === "elder") {
    const stE = m.stats || {};
    const shielded = Boolean(p.elderShieldUsed || (stE.elderExempted || 0) >= 1);
    const cleanWin = Boolean(m.phase === "GAME_OVER" && m.winner === "good" && (stE.toxicSentCount || 0) === 0);
    ok = shielded || cleanWin;
    prog = shielded ? "已完成：豁免護盾穩住好人局勢" : (cleanWin ? "已完成：清心零酸言率隊奪勝" : "護盾未觸發・保持理性帶隊");
  } else if (mis.role === "wolf_king") {
    const stWk = m.stats || {};
    const struck = (stWk.wolfKingStrikes || 0) >= 1;
    const wkWin = Boolean(m.phase === "GAME_OVER" && m.winner === "wolf");
    ok = struck || wkWin;
    prog = struck ? "已完成：臨離反撲精準命中" : (wkWin ? "已完成：帶領酸民狼奪勝" : "佈局獵神・伺機奪勝或臨離反撲");
  } else if (mis.role === "wolf") {
    let misdirectedGoodVotes = 0;
    (m.voteHistory || []).forEach(function (vh) {
      (vh.ballots || []).forEach(function (b) {
        if (!b.targetId || typeof getSeat !== "function") return;
        const vs = getSeat(b.voterId);
        const ts = getSeat(b.targetId);
        if (vs && ts && vs.team === "good" && ts.team === "good") {
          misdirectedGoodVotes += 1;
        }
      });
    });
    const wolfVictory = Boolean(m.phase === "GAME_OVER" && m.winner === "wolf");
    ok = wolfVictory || misdirectedGoodVotes >= 2;
    prog = ok ? "已完成：成功擾亂好人節奏" : ("好人誤投 " + misdirectedGoodVotes + "/2 票");
  }

  mis.completed = ok;
  mis.progressText = prog;
  return mis;
}

function detectSpeechContradictions(speaker, speechEv) {
  if (!speaker || !speechEv || typeof state === "undefined" || !state.match || !state.match.started) return null;
  const m = state.match;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  if (speaker.id === pid) return null;

  const day = m.day || 1;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const spTag = fmtSeatNum(speaker.id) + "號" + speaker.name;
  const labelSeat = function (id) {
    const s = typeof getSeat === "function" ? getSeat(id) : null;
    return s ? (fmtSeatNum(s.id) + "號" + (s.id === pid ? "你" : s.name)) : (fmtSeatNum(id) + "號");
  };

  // 1. Role counter-claim clash (against another alive claimant OR player's own real role)
  if (speechEv.claimRole && ROLE_DEFS[speechEv.claimRole]) {
    const rName = ROLE_DEFS[speechEv.claimRole].name;
    const otherClaimant = (m.seats || []).find(function (s) {
      return s.id !== speaker.id && s.alive && s.claimedRole === speechEv.claimRole;
    });
    const playerEffKey = player && typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(player) : (player ? player.role : null);
    const stealsPlayerRealRole = Boolean(player && player.alive && playerEffKey === speechEv.claimRole);
    if (otherClaimant || stealsPlayerRealRole) {
      const clashWho = otherClaimant ? labelSeat(otherClaimant.id) : "已現身的同職角色";
      return {
        code: "role_clash",
        severity: 3,
        isPublic: Boolean(otherClaimant),
        targetId: speaker.id,
        label: "身分對跳衝突",
        detail: spTag + " 搶跳「" + rName + "」，與 " + clashWho + " 直接衝突",
        rebuttalText: "請全場注意邏輯衝突！剛才 " + spTag + " 竟然搶跳「" + rName + "」身分，但場上同一神職絕不可能同時出現兩位，建議大家優先檢視 " + spTag + " 的真實動機！"
      };
    }
  }

  // 2. Direct clash against player's night-verified intel (Seer check or Witch heal) — strictly player-private!
  const known = m.playerKnownRoles || {};
  if (speechEv.accuseId) {
    const accKnownGood = known[speechEv.accuseId] === "good_verified" || (player && player.role === "witch" && player.savedSeatId === speechEv.accuseId);
    if (accKnownGood) {
      const tLbl = labelSeat(speechEv.accuseId);
      return {
        code: "known_fact_clash",
        severity: 3,
        isPublic: false,
        targetId: speaker.id,
        label: "硬打已驗好人",
        detail: spTag + " 強打已確認清白的 " + tLbl,
        rebuttalText: "我握有關鍵查證資訊！剛才 " + spTag + " 硬把矛頭指向已經確認過身分的 " + tLbl + "，刻意誤導全場好人投錯人，請大家這輪重點檢視 " + spTag + "！"
      };
    }
  }
  if (speechEv.vouchId && known[speechEv.vouchId] === "wolf" && (!player || player.role !== "wolf")) {
    const wLbl = labelSeat(speechEv.vouchId);
    return {
      code: "known_fact_clash",
      severity: 3,
      isPublic: false,
      targetId: speaker.id,
      label: "替查殺狼洗白",
      detail: spTag + " 力挺已知酸民狼 " + wLbl,
      rebuttalText: "請看這裡的站邊破綻！" + spTag + " 剛才大力替 " + wLbl + " 洗白護航，但我掌握的確切資訊顯示 " + wLbl + " 立場有極大問題，建議大家一起把票集中檢視 " + spTag + "！"
    };
  }

  // 3. Cross-round Speech-vs-Vote Hypocrisy (Day 2+, excluding justified pivots backed by new evidence)
  if (day >= 2) {
    const voteHist = m.voteHistory || [];
    const allEvs = m.allSpeechEvents || [];
    const pastSpeeches = allEvs.filter(function (ev) { return ev.day < day && ev.speakerId === speaker.id; });
    if (speechEv.vouchId) {
      const votedBefore = voteHist.find(function (vh) {
        return (vh.ballots || []).some(function (b) { return b.voterId === speaker.id && b.targetId === speechEv.vouchId; });
      });
      if (votedBefore) {
        const clearedAfter = allEvs.some(function (ev) {
          return (ev.day || 1) >= (votedBefore.day || 1)
            && (ev.checkedGoodId === speechEv.vouchId || ((ev.claimRole === "witch" || ev.claimRole === "guard") && ev.vouchId === speechEv.vouchId));
        });
        if (!clearedAfter) {
          const vLbl = labelSeat(speechEv.vouchId);
          return {
            code: "vote_hypocrisy",
            severity: 2,
            isPublic: true,
            targetId: speaker.id,
            label: "前後投票自打臉",
            detail: spTag + " 第" + (votedBefore.day || (day - 1)) + "輪才投 " + vLbl + "，今日突改口力挺",
            rebuttalText: "比對前幾輪紀錄就能看出破綻！" + spTag + " 在前幾輪公投明明就把票投給 " + vLbl + "，今天沒新線索卻突然改口大力護航，前後矛盾太明顯了吧！"
          };
        }
      }
    }
    if (speechEv.accuseId) {
      const vouchedBefore = pastSpeeches.find(function (ev) { return ev.vouchId === speechEv.accuseId; });
      if (vouchedBefore) {
        const vIdx = allEvs.indexOf(vouchedBefore);
        const newEvidenceOnTarget = allEvs.some(function (ev, idx) {
          if (ev.day === vouchedBefore.day && vIdx !== -1 && idx <= vIdx) return false;
          if ((ev.day || 1) < (vouchedBefore.day || 1)) return false;
          const evClash = Boolean(ev.claimRole && allEvs.some(function (o) {
            return o.speakerId !== ev.speakerId && o.claimRole === ev.claimRole;
          }));
          return ev.checkedWolfId === speechEv.accuseId
            || (ev.speakerId === speechEv.accuseId && ev.hasToxicSlip)
            || (ev.speakerId === speechEv.accuseId && evClash);
        });
        if (!newEvidenceOnTarget) {
          const aLbl = labelSeat(speechEv.accuseId);
          return {
            code: "vote_hypocrisy",
            severity: 2,
            isPublic: true,
            targetId: speaker.id,
            label: "昨挺今打反覆",
            detail: spTag + " 昨日才挺 " + aLbl + "，今日毫無徵兆突然改口懷疑",
            rebuttalText: "我對照昨天發言紀錄發現嚴重矛盾：" + spTag + " 上一輪才說信任 " + aLbl + "，今天毫無新依據就突然翻臉指認他，建議大家小心這種看風向亂咬人的說法！"
          };
        }
      }
    }
  }

  // 4. Wolf-pack echo: vouching for someone who already emitted a toxic slip
  if (speechEv.vouchId) {
    const vouchedToxic = (m.allSpeechEvents || []).some(function (ev) {
      return ev.speakerId === speechEv.vouchId && ev.hasToxicSlip;
    });
    if (vouchedToxic) {
      const tLbl = labelSeat(speechEv.vouchId);
      return {
        code: "wolf_pack_echo",
        severity: 2,
        isPublic: true,
        targetId: speaker.id,
        label: "護航酸言對象",
        detail: spTag + " 主動替曾出酸言的 " + tLbl + " 護航",
        rebuttalText: "大家留意剛才的抱團站邊：" + tLbl + " 先前發言已經帶刺挑撥，結果 " + spTag + " 緊接著跳出來替他講話洗白，建議兩位一起列入重點檢視！"
      };
    }
  }

  // 5. Toxic bait accusation
  if (speechEv.hasToxicSlip && speechEv.accuseId) {
    return {
      code: "toxic_bait",
      severity: 1,
      isPublic: true,
      targetId: speaker.id,
      label: "情緒挑撥帶風向",
      detail: spTag + " 夾帶酸言強推 " + labelSeat(speechEv.accuseId),
      rebuttalText: "我們要警惕用情緒帶風向的說法：剛才 " + spTag + " 沒提出實質票型線索，反而急著用不友善語氣指控 " + labelSeat(speechEv.accuseId) + "，建議這輪把注意力放回 " + spTag + "！"
    };
  }

  return null;
}

function computeTableWindVane() {
  if (typeof state === "undefined" || !state.match || !state.match.started) {
    return { heatMap: {}, topHeatSeatId: null, topHeatCount: 0, claimGroups: {}, contradictionCount: 0, summaryText: "" };
  }
  const m = state.match;
  const evs = m.daySpeechEvents || [];
  const heatMap = {};
  evs.forEach(function (ev) {
    if (!ev.accuseId || typeof getSeat !== "function") return;
    const ts = getSeat(ev.accuseId);
    if (ts && ts.alive) {
      heatMap[ev.accuseId] = (heatMap[ev.accuseId] || 0) + 1;
    }
  });

  let topHeatSeatId = null;
  let topHeatCount = 0;
  Object.keys(heatMap).forEach(function (k) {
    if (heatMap[k] > topHeatCount) {
      topHeatCount = heatMap[k];
      topHeatSeatId = parseInt(k, 10);
    }
  });

  const claimGroups = {};
  (m.seats || []).forEach(function (s) {
    if (s.alive && s.claimedRole && ROLE_DEFS[s.claimedRole]) {
      if (!claimGroups[s.claimedRole]) claimGroups[s.claimedRole] = [];
      claimGroups[s.claimedRole].push(s.id);
    }
  });

  const todayContra = (m.detectedContradictions || []).filter(function (c) { return c.day === m.day; });
  const parts = [];
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  if (topHeatSeatId) {
    const hs = typeof getSeat === "function" ? getSeat(topHeatSeatId) : null;
    parts.push("今日集火：" + fmtSeatNum(topHeatSeatId) + "號" + (topHeatSeatId === pid ? "你" : (hs ? hs.name : "")) + "(" + topHeatCount + "指認)");
  }
  const slotView = typeof buildTableSlotAndWorldAnalysis === "function"
    ? buildTableSlotAndWorldAnalysis(typeof getPlayerSeat === "function" ? getPlayerSeat() : null)
    : null;
  if (slotView && slotView.dualSeerWorlds) {
    const dw = slotView.dualSeerWorlds;
    const wA2 = dw.worldA.secondWolf ? ("+" + fmtSeatNum(dw.worldA.secondWolf.id)) : "";
    const wB2 = dw.worldB.secondWolf ? ("+" + fmtSeatNum(dw.worldB.secondWolf.id)) : "";
    parts.push("站" + fmtSeatNum(dw.seerA.id) + "坑:" + fmtSeatNum(dw.seerB.id) + wA2 + "｜站" + fmtSeatNum(dw.seerB.id) + "坑:" + fmtSeatNum(dw.seerA.id) + wB2);
  } else {
    Object.keys(claimGroups).forEach(function (rk) {
      const ids = claimGroups[rk];
      if (ids.length > 0) {
        const rName = ROLE_DEFS[rk].name;
        parts.push((ids.length >= 2 ? "對跳" : "亮牌") + rName + "：" + ids.map(function (id) { return fmtSeatNum(id); }).join("/"));
      }
    });
  }
  const pitCaller = evs.find(function (ev) {
    return ev && ev.speakerId !== pid && (ev.accuseId === pid || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(pid) !== -1));
  });
  if (pitCaller) {
    parts.push("⚠ " + fmtSeatNum(pitCaller.speakerId) + "號點你進狼坑");
  }
  if (todayContra.length > 0) {
    parts.push("偵測矛盾 " + todayContra.length + " 處");
  }
  const markedWolves = Object.keys(state.playerMarks || {}).filter(function (k) {
    const s = typeof getSeat === "function" ? getSeat(parseInt(k, 10)) : null;
    return s && s.alive && state.playerMarks[k] === "wolf";
  });
  if (markedWolves.length > 0) {
    const pSelfVane = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    const isWolfVane = Boolean(pSelfVane && pSelfVane.role === "wolf");
    parts.push((isWolfVane ? "你標甩鍋：" : "你標疑：") + markedWolves.map(function (id) { return fmtSeatNum(id); }).join("、"));
  }

  return {
    heatMap: heatMap,
    topHeatSeatId: topHeatSeatId,
    topHeatCount: topHeatCount,
    claimGroups: claimGroups,
    contradictionCount: todayContra.length,
    summaryText: parts.length ? ("📊 茶席風向｜" + parts.join(" · ")) : "📊 茶席風向｜目前尚無公開集火目標"
  };
}

/**
 * v14.2 嚴格零洩漏跨輪「言票相關性與言行一致度矩陣」
 * 僅讀取 createBlindMatchSnapshot 投影之公開發言、公投票軌、警長票軌與警徽流，絕不讀取他人隱藏底牌！
 */
function buildVoteSpeechMatrix(viewerSeat, snapArg) {
  const snap = snapArg || (typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(viewerSeat || null, { module: "vote_speech_matrix" })
    : null);
  const empty = {
    divergenceBySeat: {},
    divergenceDetails: {},
    coVoteOutBySeat: {},
    badgeFlowLines: [],
    summaryLines: []
  };
  if (!snap || !snap.started) return empty;

  const allEvs = Array.isArray(snap.allSpeechEvents) ? snap.allSpeechEvents : [];
  const voteHist = Array.isArray(snap.voteHistory) ? snap.voteHistory : [];
  const bfSignals = Array.isArray(snap.badgeFlowSignals) ? snap.badgeFlowSignals : [];
  const seats = Array.isArray(snap.seats) ? snap.seats : [];
  const pid = snap.playerSeatId || (typeof getPlayerId === "function" ? getPlayerId() : 1);

  const labelSeat = function (id) {
    const s = snap.getSeat ? snap.getSeat(id) : seats.find(function (x) { return x.id === id; });
    if (!s) return id + "號";
    return s.id + "號" + (s.id === pid ? "你" : s.name);
  };

  const divergenceBySeat = {};
  const divergenceDetails = {};
  const coVoteOutBySeat = {};

  // 1. Speech-vs-Vote Divergence: accused seat A on day D yet voted for seat B when A was an eligible target!
  voteHist.forEach(function (vh) {
    if (!vh || !Array.isArray(vh.ballots) || !vh.ballots.length) return;
    const d = vh.day || 1;
    const daySpeeches = allEvs.filter(function (ev) { return ev && (ev.day || 1) === d; });
    const latestAccuseBySpeaker = {};
    daySpeeches.forEach(function (ev) {
      if (ev.speakerId && ev.accuseId) latestAccuseBySpeaker[ev.speakerId] = ev.accuseId;
    });
    const pkSet = (Array.isArray(vh.pkCandidates) && vh.pkCandidates.length > 0) ? vh.pkCandidates : null;
    const eligibleTargets = {};
    vh.ballots.forEach(function (b) {
      if (b && b.voterId) eligibleTargets[b.voterId] = true;
      if (b && b.targetId) eligibleTargets[b.targetId] = true;
    });

    vh.ballots.forEach(function (b) {
      if (!b || !b.voterId || !b.targetId) return;
      const vid = b.voterId;
      const accused = latestAccuseBySpeaker[vid];
      if (!accused || accused === b.targetId || accused === vid) return;
      if (pkSet && pkSet.indexOf(accused) === -1) return;
      if (!eligibleTargets[accused]) return;
      divergenceBySeat[vid] = (divergenceBySeat[vid] || 0) + 1;
      if (!divergenceDetails[vid]) divergenceDetails[vid] = [];
      divergenceDetails[vid].push({ day: d, accused: accused, voted: b.targetId });
    });

    // 2. Public Co-Voting with Voted-Out Seats (strictly public outReason / ballots — zero hidden role reads!)
    if (vh.outId) {
      const outBallot = vh.ballots.find(function (b) { return b && b.voterId === vh.outId && b.targetId; });
      if (outBallot && outBallot.targetId) {
        vh.ballots.forEach(function (b) {
          if (!b || !b.voterId || b.voterId === vh.outId || !b.targetId) return;
          if (b.targetId === outBallot.targetId) {
            coVoteOutBySeat[b.voterId] = (coVoteOutBySeat[b.voterId] || 0) + 1;
          }
        });
      }
    }
  });

  // 3. Public Badge Flow Signal Summary
  const badgeFlowLines = [];
  bfSignals.slice(-3).forEach(function (sig) {
    if (!sig || !sig.ownerId) return;
    if (sig.headline) {
      badgeFlowLines.push(labelSeat(sig.ownerId) + " 警徽暗號：" + String(sig.headline).slice(0, 48));
    }
  });

  const summaryLines = [];
  Object.keys(divergenceDetails).forEach(function (k) {
    const sid = parseInt(k, 10);
    const sObj = snap.getSeat ? snap.getSeat(sid) : null;
    if (!sObj || !sObj.alive) return;
    const dets = divergenceDetails[sid];
    const last = dets[dets.length - 1];
    summaryLines.push(
      labelSeat(sid) + " 第" + last.day + "天口頭點名 " + labelSeat(last.accused) +
      " 卻在公投改投 " + labelSeat(last.voted) + "（言票背離 " + dets.length + " 次）"
    );
  });

  Object.keys(coVoteOutBySeat).forEach(function (k) {
    const sid = parseInt(k, 10);
    const cnt = coVoteOutBySeat[sid];
    const sObj = snap.getSeat ? snap.getSeat(sid) : null;
    if (!sObj || !sObj.alive || cnt < 2) return;
    summaryLines.push(labelSeat(sid) + " 連續 " + cnt + " 輪與已被公投離席者同票綁定，需檢視站邊動機");
  });

  badgeFlowLines.forEach(function (line) {
    summaryLines.push(line);
  });

  return {
    divergenceBySeat: divergenceBySeat,
    divergenceDetails: divergenceDetails,
    coVoteOutBySeat: coVoteOutBySeat,
    badgeFlowLines: badgeFlowLines,
    summaryLines: summaryLines.slice(0, 4)
  };
}
