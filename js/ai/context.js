/**
 * AI 盤面記憶、嚴格發言時序、好人坑／狼坑盤點與雙觀察員視角建構
 */
"use strict";

function resolveActiveJargonDifficulty(snapArg) {
  const isShowcase = Boolean(
    (snapArg && snapArg.judgeShowcase) ||
    (typeof state !== "undefined" && state.match && state.match.judgeShowcase)
  );
  if (isShowcase) return "easy";
  return (snapArg && snapArg.aiDifficulty) ||
    (typeof state !== "undefined" && state.aiDifficulty) ||
    (typeof state !== "undefined" && state.match && state.match.aiDifficulty) ||
    "normal";
}

const EASY_JARGON_REPLACEMENTS = Object.freeze([
  ["深水倒鉤", "躲在暗處假裝站好人邊"],
  ["反水立警", "中途改口搶警長"],
  ["外置位抗推", "拿其他還沒表態的人當替罪羊"],
  ["抿刀口", "猜測夜晚目標"],
  ["雙警徽流", "雙人觀察名單順序"],
  ["第一警徽流", "第一位觀察名單"],
  ["警徽流", "觀察名單順序"],
  ["前置位", "前面發言的人"],
  ["後置位", "後面發言的人"],
  ["搶查殺", "搶先指控別人"],
  ["假金水", "假裝查過是好人"],
  ["鐵金水好人坑", "確定查過是好人的名單"],
  ["鐵金水好人", "確定查過是好人"],
  ["金水好人坑", "查過是好人的名單"],
  ["金水好人", "查過是好人"],
  ["鐵金水", "確定查過是好人"],
  ["金水", "查過是好人"],
  ["查殺狼坑", "查出是說謊的人"],
  ["查殺狼", "查出是說謊的人"],
  ["報查殺", "指出是說謊的人"],
  ["查殺", "查出是說謊的人"],
  ["銀水好人", "昨晚被救回來的人"],
  ["銀水", "昨晚被救回來的人"],
  ["坐實", "確定身分"],
  ["悍跳狼", "假冒身分帶風向的人"],
  ["悍跳位", "假冒身分的人"],
  ["悍跳", "假冒身分"],
  ["對跳了", "同時爭搶"],
  ["開對跳", "出現兩個人搶同一個身分"],
  ["對跳觀察員", "兩個人都說自己是觀察員"],
  ["對跳位", "搶同一個身分的人"],
  ["對跳", "兩個人搶同一個身分"],
  ["倒鉤", "假裝站對邊"],
  ["衝票", "集中投票"],
  ["墊飛", "故意送隊友當掩護"],
  ["衝鋒", "幫忙帶風向"],
  ["深水", "躲在暗處不表態"],
  ["定進狼坑", "列入可疑名單"],
  ["打進狼坑", "列進可疑名單"],
  ["放進狼坑", "放進可疑名單"],
  ["畫進狼坑", "畫進可疑名單"],
  ["進狼坑", "列入可疑名單"],
  ["盤狼坑", "找出可疑名單"],
  ["放進好人坑", "放進好人名單"],
  ["放好人坑", "放進好人名單"],
  ["好人坑", "好人名單"],
  ["狼坑位", "可疑名單"],
  ["狼坑", "可疑名單"],
  ["排坑", "排查可疑名單"],
  ["盤坑", "梳理可疑名單"],
  ["點坑", "點出可疑名單"],
  ["外置位", "其他還沒表態的人"],
  ["表水", "說明立場"],
  ["過水", "簡單講兩句"],
  ["過麥", "結束發言"],
  ["抗推位", "被誤會投出局的人"],
  ["抗推", "被誤會投出局"],
  ["歸票權", "建議大家集中投誰的權力"],
  ["歸票", "建議大家集中投誰"],
  ["屠邊制", "把神職或平民全數淘汰的規則"],
  ["屠邊", "把神職或平民全數淘汰"],
  ["屠神", "把神職全數淘汰"],
  ["站邊", "支持"],
  ["退水", "退出競選"],
  ["警上", "競選警長發言"],
  ["警下", "台下投票"],
  ["刀口線索", "昨晚線索"]
]);

const NORMAL_JARGON_REPLACEMENTS = Object.freeze([
  ["深水倒鉤", "躲在暗處假裝站好人邊"],
  ["反水立警", "中途改口搶警長"],
  ["外置位抗推", "拿旁邊還沒表態的人當替罪羊"],
  ["抿刀口", "猜測夜晚目標"],
  ["倒鉤", "假裝站對邊"],
  ["墊飛", "故意送隊友當掩護"]
]);

function applyDifficultyTerminology(rawText, diffArg, snapArg) {
  if (!rawText || typeof rawText !== "string") return rawText;
  const diff = diffArg || resolveActiveJargonDifficulty(snapArg);
  if (diff === "pro") return rawText;
  let out = rawText;
  if (diff === "easy") {
    out = out
      .replace(/給\s*(\d+\s*號)\s*(?:假)?(?:鐵)?金水/g, "向大家報 $1 是查過的好人")
      .replace(/發\s*(\d+\s*號)\s*(?:假)?(?:鐵)?金水/g, "查驗 $1 是好人")
      .replace(/(?:假)?發(?:過)?(?:好人)?\s*(?:鐵)?金水/g, "報出查驗過的好人")
      .replace(/(?:報|發|給)?\s*查殺\s*(\d+\s*號)/g, "查出 $1 在說謊")
      .replace(/(\d+\s*號)\s*(?:是|為)\s*(?:鐵)?金水/g, "$1 是確定查過的好人")
      .replace(/(\d+\s*號)\s*(?:是|為)\s*查殺/g, "$1 被查出在說謊")
      .replace(/(\d+\s*號)\s*(?:是|為)\s*銀水/g, "$1 是昨晚被救回來的人")
      .replace(/歸票(?:請)?(?:出)?\s*(\d+\s*號)/g, "建議大家集中投 $1")
      .replace(/直接(?:標|進)定進?狼坑/g, "直接列進可疑名單")
      .replace(/(?:進|標進)定狼坑/g, "列進可疑名單")
      .replace(/定進狼坑/g, "列入可疑名單")
      .replace(/(?:悍跳|跳假)\s*(明心觀察員|觀察員)/g, "假冒$1")
      .replace(/被\s*外置位抗推/g, "被其他還沒表態的人誤會投出局")
      .replace(/被\s*抗推/g, "被誤會投出局")
      .replace(/互相\s*抗推/g, "互相誤會投錯人")
      .replace(/把\s*(\d+\s*號)\s*抗推/g, "誤把 $1 投出局")
      .replace(/站邊\s*(\d+\s*號)/g, "支持 $1");
  } else {
    out = out.replace(/被\s*外置位抗推/g, "在旁邊被當成替罪羊投出局");
  }
  const pairs = diff === "easy" ? EASY_JARGON_REPLACEMENTS : NORMAL_JARGON_REPLACEMENTS;
  for (let i = 0; i < pairs.length; i++) {
    const term = pairs[i][0];
    const repl = pairs[i][1];
    if (out.indexOf(term) !== -1) {
      out = out.split(term).join(repl);
    }
  }
  if (diff === "easy") {
    out = out
      .replace(/被\s*被誤會/g, "被誤會")
      .replace(/建議大家集中投誰\s*(?:出|投)?\s*(\d+\s*號)/g, "建議大家集中投 $1")
      .replace(/假冒\s*身分\s*(明心觀察員|觀察員)/g, "假冒$1")
      .replace(/是\s*是/g, "是")
      .replace(/查過是好人\s*好人/g, "查過是好人")
      .replace(/名單\s*名單/g, "名單")
      .replace(/兩個人搶同一個身分了/g, "同時爭搶了");
  }
  return out;
}

function stripDialogueParentheses(rawText) {
  if (!rawText || typeof rawText !== "string") return rawText;
  let out = rawText;
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = out
      .replace(/（[^（）]*）/g, "")
      .replace(/\([^()]*\)/g, "");
  }
  return out
    .replace(/[（）()]/g, "")
    .replace(/([，,、；;])\s*\1+/g, "$1")
    .replace(/([。！？!?])\s*([，,、；;])+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
  const mSeed = (typeof m.matchStyleSeed === "number" ? m.matchStyleSeed : 0);
  const seed = ((speaker && speaker.id) || 1) * 19 + (m.day || 1) * 13 + ep * 7 + spokenCnt * 5 + mSeed * 3 + (salt || 0) * 11;
  return list[((seed % list.length) + list.length) % list.length] || "";
}

function buildCrossDayMemoryLedger(viewerSeat, snapArg) {
  const snap = snapArg || (typeof createBlindMatchSnapshot === "function" ? createBlindMatchSnapshot(viewerSeat, { module: "memory_ledger" }) : null);
  if (!snap || !snap.started || snap.day <= 1) return { lines: [], grudgeIds: [], flipIds: [], wolfProtectorIds: [] };
  const allEvs = snap.allSpeechEvents || [];
  const priorEvs = allEvs.filter(function (ev) { return ev && ev.day && ev.day < snap.day; });
  const grudgeIds = [];
  const flipIds = [];
  const wolfProtectorIds = [];
  const lines = [];
  const nameOf = function (id) {
    const s = snap.getSeat(id);
    return s ? (fmtSeatNum(s.id) + "號" + s.name) : (id + "號");
  };

  if (snap.self) {
    const attackers = priorEvs.filter(function (ev) { return ev.accuseId === snap.self.id && ev.speakerId !== snap.self.id; });
    attackers.forEach(function (ev) {
      const sp = snap.getSeat(ev.speakerId);
      if (sp && sp.alive && grudgeIds.indexOf(sp.id) === -1) {
        grudgeIds.push(sp.id);
        lines.push("第" + ev.day + "天 " + nameOf(sp.id) + " 曾點名懷疑我");
      }
    });
  }

  // Fair Play: Detect players who vouched for ANY voted-out seat on an earlier day (ZERO hidden team/role leak!)
  const votedOutSeats = (snap.seats || []).filter(function (s) { return !s.alive && s.outReason === "投票出局"; });
  votedOutSeats.forEach(function (vo) {
    priorEvs.forEach(function (ev) {
      if (ev.vouchId === vo.id && ev.speakerId !== vo.id) {
        const sp = snap.getSeat(ev.speakerId);
        if (sp && sp.alive && wolfProtectorIds.indexOf(sp.id) === -1) {
          wolfProtectorIds.push(sp.id);
          lines.push("第" + ev.day + "天 " + nameOf(sp.id) + " 曾力保後來被公投離席的 " + nameOf(vo.id));
        }
      }
    });
  });

  // Detect players who flipped from vouching to accusing the same target across days
  const todayEvs = snap.daySpeechEvents || [];
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

function buildPriorCallbackPhrase(speaker, dayEvents, seatLabel, snapArg) {
  if (!speaker) return "";
  const snap = snapArg || (typeof createBlindMatchSnapshot === "function" ? createBlindMatchSnapshot(speaker, { module: "prior_callback" }) : null);
  const dayList = Array.isArray(dayEvents) ? dayEvents : [];
  const prior = dayList.filter(function (ev) { return ev && ev.speakerId && ev.speakerId !== speaker.id; });
  const pidPub = (snap && snap.playerSeatId) ? snap.playerSeatId : 1;
  const echoes = (snap && Array.isArray(snap.fourGEchoes)) ? snap.fourGEchoes : [];
  const savedEcho = echoes.find(function (e) {
    return e && e.kind === "confidence" && e.targetId === speaker.id && e.savedFromVoteOut && e.day >= ((snap && snap.day ? snap.day : 1) - 1);
  });
  if (savedEcho) {
    const allMine = (snap && Array.isArray(snap.allSpeechEvents)) ? snap.allSpeechEvents : [];
    const thankedAlready = allMine.some(function (ev) {
      return ev && ev.speakerId === speaker.id && ev.day === (snap ? snap.day : 1) && /奉茶護席|給我信心/.test(ev.rawText || "");
    });
    if (!thankedAlready) {
      return "先跟 " + pidPub + "號道個謝，上一輪被集火時多虧你給我信心奉茶護席才免於直接離席；";
    }
  }
  const convEcho = echoes.find(function (e) {
    return e && e.kind === "convenience" && e.day === (snap ? snap.day : 1) && e.targetId !== speaker.id;
  });
  if (convEcho && ((speaker.id + (snap ? snap.day : 1)) % 3 === 0)) {
    return "剛才 " + pidPub + "號給大家方便把關係線都理出來，聽起來清楚多了；";
  }
  if (prior.length === 0) return "";

  const nameOf = function (id) {
    const s = snap ? snap.getSeat(id) : (typeof getSeat === "function" ? getSeat(id) : null);
    if (!s) return "";
    return typeof seatLabel === "function" ? seatLabel(s) : (fmtSeatNum(s.id) + "號" + s.name);
  };

  // Cross-day memory callback (Day 2+): cite flips, wolf-protectors, or prior grudges!
  if (snap && snap.day >= 2) {
    const ledger = buildCrossDayMemoryLedger(speaker, snap);
    if (ledger.flipIds.length > 0 && ledger.flipIds[0] !== speaker.id) {
      return "翻一下跨日帳本，" + nameOf(ledger.flipIds[0]) + " 昨天還在保人今天卻突然反水改口，這前後反差太大了；";
    }
    if (ledger.wolfProtectorIds.length > 0 && ledger.wolfProtectorIds[0] !== speaker.id) {
      return "回頭複盤前一天的紀錄，" + nameOf(ledger.wolfProtectorIds[0]) + " 曾替已出局的可疑對象護航，今天得重點檢視；";
    }
    if (ledger.grudgeIds.length > 0 && ledger.grudgeIds[0] !== speaker.id && (speaker.id + snap.day) % 2 === 0) {
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
    if (snap && snap.harmonyScore <= 45) {
      return "現在茶席流言起霧氣氛太躁，剛才 " + nameOf(toxicEv.speakerId) + " 語氣太衝容易把大家帶偏，";
    }
    return "剛才 " + nameOf(toxicEv.speakerId) + " 講話火氣稍微衝了點、語氣不太友善，";
  }

  const mSeed = (snap && typeof snap.matchStyleSeed === "number") ? snap.matchStyleSeed : 0;
  const cbSeed = (speaker.id || 1) * 31 + ((snap && snap.day) || 1) * 17 + prior.length * 11 + mSeed * 7;
  const cbIdx = ((cbSeed % 3) + 3) % 3;

  const godEv = prior.slice().reverse().find(function (ev) { return ev.claimRole && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[ev.claimRole]; });
  if (godEv) {
    const gName = nameOf(godEv.speakerId);
    const gRole = ROLE_DEFS[godEv.claimRole].name;
    return [
      "聽完前置位 " + gName + " 公開跳" + gRole + "的說法，",
      gName + " 剛才亮出" + gRole + "身分，",
      "關於 " + gName + " 剛剛起跳" + gRole + "這點，"
    ][cbIdx];
  }

  const accEv = prior.slice().reverse().find(function (ev) { return ev.accuseId && ev.accuseId !== speaker.id; });
  if (accEv) {
    const aName = nameOf(accEv.speakerId);
    const tName = nameOf(accEv.accuseId);
    if (tName) {
      return [
        "剛才前置位 " + aName + " 直接把火往 " + tName + " 身上點，",
        aName + " 剛才直接點出 " + tName + " 的問題，",
        "聽 " + aName + " 把焦點落在 " + tName + " 身上，"
      ][cbIdx];
    }
  }

  const last = prior[prior.length - 1];
  const lName = nameOf(last.speakerId);
  return [
    "接續剛剛 " + lName + " 的發言來對照，",
    "順著前面 " + lName + " 剛才講的脈絡來看，",
    "剛聽完 " + lName + " 那段說法，"
  ][cbIdx];
}

function buildTableSlotAndWorldAnalysis(viewerSeat, snapArg) {
  const snap = snapArg || (typeof createBlindMatchSnapshot === "function" ? createBlindMatchSnapshot(viewerSeat, { module: "slot_world" }) : null);
  if (!snap || !snap.started) {
    return { aliveWolfSlots: 2, goodPits: [], wolfPits: [], dualSeerWorlds: null };
  }
  const self = snap.self;
  const aliveSeats = snap.aliveSeats;
  const aliveIds = aliveSeats.map(function (s) { return s.id; });
  const allEvs = (snap.allSpeechEvents && snap.allSpeechEvents.length) ? snap.allSpeechEvents : (snap.daySpeechEvents || []);
  const dayEvs = snap.daySpeechEvents || [];
  const voteHist = snap.voteHistory || [];
  const shRec = snap.sheriffVoteRecord || null;
  const shVotedForMap = {};
  const shSeerClaimIds = (shRec && Array.isArray(shRec.seerClaimIds)) ? shRec.seerClaimIds : [];
  const shWithdrawnIds = (shRec && Array.isArray(shRec.withdrawnIds)) ? shRec.withdrawnIds : [];
  if (shRec && Array.isArray(shRec.ballots)) {
    shRec.ballots.forEach(function (b) {
      if (b && b.voterId && b.targetId) shVotedForMap[b.voterId] = b.targetId;
    });
  }
  const bfSignals = Array.isArray(snap.badgeFlowSignals) ? snap.badgeFlowSignals : [];
  const bfGoodMap = {};
  const bfWolfMap = {};
  bfSignals.forEach(function (sig) {
    if (!sig || !sig.ownerId) return;
    const ownerSus = (self && self.suspicionMap && typeof self.suspicionMap[sig.ownerId] === "number")
      ? self.suspicionMap[sig.ownerId]
      : 50;
    if (ownerSus >= 68) return; // Only weigh badge-flow signals from Sheriffs this AI did not already brand as fake!
    (sig.verifiedGoodIds || []).forEach(function (gid) { bfGoodMap[gid] = sig; });
    (sig.suspectedWolfIds || []).forEach(function (wid) { bfWolfMap[wid] = sig; });
  });

  // Identify alive Seer claimants in strict chronological order of claiming
  const seerClaimants = [];
  const seerFirstClaimDay = {};
  const pushSeer = function (seat) {
    if (seat && seat.alive && seerClaimants.every(function (x) { return x.id !== seat.id; })) {
      seerClaimants.push(seat);
    }
  };
  allEvs.forEach(function (ev) {
    if (ev && (ev.claimRole === "seer" || ev.checkedWolfId || ev.checkedGoodId)) {
      if (ev.speakerId && !seerFirstClaimDay[ev.speakerId]) {
        seerFirstClaimDay[ev.speakerId] = ev.day || 1;
      }
      pushSeer(snap.getSeat(ev.speakerId));
    }
  });
  aliveSeats.forEach(function (s) {
    if (s.claimedRole === "seer") {
      if (!seerFirstClaimDay[s.id]) seerFirstClaimDay[s.id] = 1;
      pushSeer(s);
    }
  });

  // Strictly public signals per seat (player-private contradictions already stripped for AI by Blind-View!)
  const toxicMap = {};
  const contraMap = {};
  const contraCountMap = {};
  const seenContraKeys = {};
  const wolfTeamMap = {};
  if (self && self.role === "wolf") {
    wolfTeamMap[self.id] = true;
    (snap.knownWolfMates || []).forEach(function (mt) {
      wolfTeamMap[mt.id] = true;
    });
  }
  allEvs.forEach(function (ev, idx) {
    if (!ev || !ev.speakerId) return;
    if (ev.hasToxicSlip) toxicMap[ev.speakerId] = true;
    if (ev.contradiction) {
      contraMap[ev.speakerId] = true;
      const ck = ev.speakerId + ":" + (ev.day || 1) + ":" + (ev.contradiction.code || idx);
      if (!seenContraKeys[ck]) {
        seenContraKeys[ck] = true;
        contraCountMap[ev.speakerId] = (contraCountMap[ev.speakerId] || 0) + 1;
      }
    }
  });
  (snap.detectedContradictions || []).forEach(function (c, idx) {
    if (!c || !c.speakerId) return;
    contraMap[c.speakerId] = true;
    const ck = c.speakerId + ":" + (c.day || 1) + ":" + (c.code || ("d" + idx));
    if (!seenContraKeys[ck]) {
      seenContraKeys[ck] = true;
      contraCountMap[c.speakerId] = (contraCountMap[c.speakerId] || 0) + 1;
    }
  });

  const diffSlot = (snap && snap.aiDifficulty) || "normal";
  const isFogSeal = Boolean(snap.fogSealMode || snap.variantMode === "fog_seal");
  const publicLogsSlot = snap.publicLogs || [];
  const votedOutIdSet = {};
  const votedOutDayMap = {};
  voteHist.forEach(function (vh) {
    const outSeatId = vh && (vh.outId || vh.eliminatedId);
    if (outSeatId) {
      votedOutIdSet[outSeatId] = true;
      votedOutDayMap[outSeatId] = Math.max(votedOutDayMap[outSeatId] || 0, vh.day || 1);
    }
  });
  (snap.seats || []).forEach(function (s) {
    if (s && !s.alive && !s.fogSealed && s.outReason === "投票出局") votedOutIdSet[s.id] = true;
  });

  const UNIQUE_GOD_ROLES = ["seer", "witch", "hunter", "guard", "elder"];
  const hasPublicHunterShotSlot = function (seatId) {
    if (isFogSeal) return false;
    const sObj = snap.getSeat(seatId);
    if (sObj && !sObj.alive && !sObj.fogSealed && String(sObj.outReason || "").indexOf("正氣共鳴") !== -1) return true;
    const reId = new RegExp("(?<!\\d)0?" + seatId + "號");
    return publicLogsSlot.some(function (l) {
      return l && /直心糾察長正氣共鳴|發動正氣共鳴/.test(l.title || "") && reId.test((l.title || "") + " " + (l.text || ""));
    });
  };
  const roleClaimHistoryMap = { seer: [], witch: [], hunter: [], guard: [], elder: [] };
  const roleHardProvenDead = { seer: [], witch: [], hunter: [], guard: [], elder: [] };
  const pushRoleHist = function (rKey, seatObj) {
    if (!rKey || !roleClaimHistoryMap[rKey] || !seatObj) return;
    if (roleClaimHistoryMap[rKey].every(function (x) { return x.id !== seatObj.id; })) {
      roleClaimHistoryMap[rKey].push(seatObj);
    }
  };
  allEvs.forEach(function (ev) {
    if (ev && ev.speakerId && ev.claimRole && roleClaimHistoryMap[ev.claimRole]) {
      pushRoleHist(ev.claimRole, snap.getSeat(ev.speakerId));
    }
  });
  (snap.seats || []).forEach(function (s) {
    if (!s) return;
    if (s.claimedRole && roleClaimHistoryMap[s.claimedRole]) {
      pushRoleHist(s.claimedRole, s);
    }
    if (!isFogSeal && !s.alive && !s.fogSealed) {
      if (s.voteDisabled) {
        pushRoleHist("elder", s);
        if (roleHardProvenDead.elder.indexOf(s.id) === -1) roleHardProvenDead.elder.push(s.id);
      }
      if (hasPublicHunterShotSlot(s.id)) {
        pushRoleHist("hunter", s);
        if (roleHardProvenDead.hunter.indexOf(s.id) === -1) roleHardProvenDead.hunter.push(s.id);
      }
      if (s.publicRevealedRole && roleHardProvenDead[s.publicRevealedRole]) {
        pushRoleHist(s.publicRevealedRole, s);
        if (roleHardProvenDead[s.publicRevealedRole].indexOf(s.id) === -1) roleHardProvenDead[s.publicRevealedRole].push(s.id);
      }
    }
    if (s.alive && s.voteDisabled) pushRoleHist("elder", s);
  });

  // Detect post-death god-role impersonation only against hard-proven dead god seats
  const deadGodImpersonators = {};
  UNIQUE_GOD_ROLES.forEach(function (rKey) {
    const hist = roleClaimHistoryMap[rKey] || [];
    const hardDead = roleHardProvenDead[rKey] || [];
    if (hardDead.length === 0) return;
    hist.forEach(function (seatObj) {
      if (!seatObj || !seatObj.alive) return;
      if (rKey === "elder" && seatObj.voteDisabled) return;
      deadGodImpersonators[seatObj.id] = rKey;
      contraMap[seatObj.id] = true;
      contraCountMap[seatObj.id] = Math.max(1, contraCountMap[seatObj.id] || 0);
    });
  });

  const deadNightSeers = (snap.seats || []).filter(function (s) {
    const everSeer = s && (s.claimedRole === "seer" || allEvs.some(function (ev) { return ev && ev.speakerId === s.id && ev.claimRole === "seer"; }));
    return Boolean(everSeer && !s.alive && !votedOutIdSet[s.id]);
  });
  const deadNightSeerIds = deadNightSeers.map(function (s) { return s.id; });
  const votedOutDeadSeers = (snap.seats || []).filter(function (s) {
    const everSeer = s && (s.claimedRole === "seer" || allEvs.some(function (ev) { return ev && ev.speakerId === s.id && ev.claimRole === "seer"; }));
    return Boolean(everSeer && !s.alive && votedOutIdSet[s.id]);
  });

  const pickSoleAliveGod = function (rKey) {
    const hist = roleClaimHistoryMap[rKey] || [];
    const aliveList = hist.filter(function (s) { return s.alive; });
    if (rKey === "elder") {
      const provenElders = aliveList.filter(function (s) { return Boolean(s.voteDisabled); });
      if (provenElders.length === 1 && !contraMap[provenElders[0].id]) return provenElders[0];
    }
    if (hist.length === 1 && aliveList.length === 1 && !contraMap[aliveList[0].id]) {
      return aliveList[0];
    }
    return null;
  };
  const soleWitch = pickSoleAliveGod("witch");
  const soleHunter = pickSoleAliveGod("hunter");
  const soleGuard = pickSoleAliveGod("guard");
  const soleElder = pickSoleAliveGod("elder");
  const soleGodMap = {};
  const soleGodIds = [];
  [soleWitch, soleHunter, soleGuard, soleElder].forEach(function (gSeat) {
    if (gSeat && !soleGodMap[gSeat.id]) {
      soleGodMap[gSeat.id] = true;
      soleGodIds.push(gSeat.id);
    }
  });

  const silverWaterIds = [];
  if (soleWitch) {
    allEvs.forEach(function (ev) {
      if (ev.speakerId === soleWitch.id && ev.claimRole === "witch" && ev.vouchId && aliveIds.indexOf(ev.vouchId) !== -1 && silverWaterIds.indexOf(ev.vouchId) === -1) {
        silverWaterIds.push(ev.vouchId);
      }
    });
  }

  const publicProtectedSeerIds = {};
  silverWaterIds.forEach(function (id) { publicProtectedSeerIds[id] = true; });
  const guardHist = roleClaimHistoryMap.guard || [];
  if (guardHist.length === 1 && !contraMap[guardHist[0].id]) {
    allEvs.forEach(function (ev) {
      if (ev && ev.speakerId === guardHist[0].id && ev.claimRole === "guard" && ev.vouchId) {
        publicProtectedSeerIds[ev.vouchId] = true;
      }
    });
  }

  const seerWolfChecksOn = {};
  allEvs.forEach(function (ev) {
    if (ev && ev.speakerId && ev.checkedWolfId) {
      if (!seerWolfChecksOn[ev.checkedWolfId]) seerWolfChecksOn[ev.checkedWolfId] = [];
      if (seerWolfChecksOn[ev.checkedWolfId].indexOf(ev.speakerId) === -1) {
        seerWolfChecksOn[ev.checkedWolfId].push(ev.speakerId);
      }
    }
  });
  const silverWaterCheckedWolfByTrusted = Boolean(
    self && self.role === "witch" && self.savedSeatId && seerWolfChecksOn[self.savedSeatId] &&
    seerWolfChecksOn[self.savedSeatId].some(function (sid) {
      return !self.suspicionMap || (self.suspicionMap[sid] || 50) < 62;
    })
  );
  const silverWaterUnlocked = Boolean(
    diffSlot !== "easy" && self && self.role === "witch" && self.savedSeatId && (
      snap.day >= 3 ||
      (contraCountMap[self.savedSeatId] || 0) >= 2 ||
      silverWaterCheckedWolfByTrusted
    )
  );

  // Legal personal knowledge (strictly from Blind-View!)
  const legalKnownGood = {};
  const legalKnownWolf = {};
  if (self) {
    if (self.team === "good") legalKnownGood[self.id] = true;
    if (self.role === "seer") {
      (self.checkedHistory || []).forEach(function (c) {
        if (c.isWolf) legalKnownWolf[c.targetId] = true;
        else legalKnownGood[c.targetId] = true;
      });
    }
    if (self.role === "witch" && self.savedSeatId && !silverWaterUnlocked) {
      legalKnownGood[self.savedSeatId] = true;
    }
    if (self.isPlayer) {
      snap.seats.forEach(function (sv) {
        if (sv.playerKnownRole === "wolf") legalKnownWolf[sv.id] = true;
        else if (sv.playerKnownRole === "good_verified") legalKnownGood[sv.id] = true;
      });
    }
  }

  const matrixView = (snap.day >= 2 && typeof buildVoteSpeechMatrix === "function")
    ? buildVoteSpeechMatrix(viewerSeat, snap)
    : null;
  const divMap = (matrixView && matrixView.divergenceBySeat) || {};
  const coVoteMap = (matrixView && matrixView.coVoteOutBySeat) || {};

  // Estimate remaining alive wolf slots strictly from public verified outcomes & self-role proof (zero naive dead-clash inversion!)
  let confirmedDeadWolves = 0;
  const uncontestedSeer = (seerClaimants.length === 1 && deadNightSeerIds.length === 0) ? seerClaimants[0] : null;
  const deadNightSeerGoodIds = [];
  const deadNightSeerWolfBoost = {};
  if (deadNightSeers.length >= 1 && seerClaimants.length === 1) {
    deadNightSeers.forEach(function (ds) {
      const dsSus = (self && self.suspicionMap && typeof self.suspicionMap[ds.id] === "number")
        ? self.suspicionMap[ds.id]
        : 50;
      if (dsSus >= 68) return;
      allEvs.forEach(function (ev) {
        if (!ev || ev.speakerId !== ds.id) return;
        if (ev.checkedGoodId && aliveIds.indexOf(ev.checkedGoodId) !== -1 && !legalKnownWolf[ev.checkedGoodId] && deadNightSeerGoodIds.indexOf(ev.checkedGoodId) === -1) {
          deadNightSeerGoodIds.push(ev.checkedGoodId);
        }
        if (ev.checkedWolfId && aliveIds.indexOf(ev.checkedWolfId) !== -1) {
          deadNightSeerWolfBoost[ev.checkedWolfId] = diffSlot === "pro" ? 22 : (diffSlot === "easy" ? 6 : 14);
        }
      });
    });
  }
  const isPublicSelfExplodedSeat = function (s) {
    if (!s || s.alive) return false;
    if (s.claimedRole === "wolf") return true;
    if (!isFogSeal && !s.fogSealed && /自爆|掀席/.test(String(s.outReason || ""))) return true;
    const idPat = new RegExp("(?<!\\d)0?" + s.id + "號");
    return publicLogsSlot.some(function (l) {
      return l && /拂袖掀席|白天自爆/.test(l.title || "") && idPat.test((l.title || "") + " " + (l.text || ""));
    });
  };
  const selfEffRoleSlot = self ? (self.effectiveRoleKey || self.role) : null;
  (snap.seats || []).forEach(function (s) {
    if (s.alive) return;
    const sClaim = s.claimedRole;
    const selfIsTrueHolder = Boolean(
      sClaim &&
      UNIQUE_GOD_ROLES.indexOf(sClaim) !== -1 &&
      self &&
      selfEffRoleSlot === sClaim &&
      s.id !== self.id
    );
    const aliveHasHardMechanicProof = Boolean(sClaim && aliveSeats.some(function (a) {
      if (a.id === s.id || a.claimedRole !== sClaim) return false;
      return Boolean(sClaim === "elder" && a.voteDisabled);
    }));
    const confirmedClashDeadWolf = Boolean(selfIsTrueHolder || aliveHasHardMechanicProof);
    const verifiedDeadWolf = Boolean(uncontestedSeer && allEvs.some(function (ev) {
      return ev.speakerId === uncontestedSeer.id && ev.checkedWolfId === s.id;
    }));
    const viewerKnownDeadWolf = Boolean(legalKnownWolf[s.id]);
    const publicSelfExploded = isPublicSelfExplodedSeat(s);
    if (confirmedClashDeadWolf || verifiedDeadWolf || viewerKnownDeadWolf || publicSelfExploded) {
      confirmedDeadWolves += 1;
    }
  });
  const baseWolfTotal = typeof getInitialWolfCount === "function"
    ? getInitialWolfCount(snap.totalSeats)
    : (snap.totalSeats >= 12 ? 4 : (snap.totalSeats >= 10 ? 3 : (snap.totalSeats >= 6 ? 2 : 1)));
  const aliveWolfSlots = Math.max(1, Math.min(baseWolfTotal, baseWolfTotal - confirmedDeadWolves));

  // Public "Long-Surviving Seer" anomalies across all 3 public survival scenarios
  const survivingSeerAnomalies = [];
  const survivingSeerSuspicionBoost = {};
  const survivingSeerNotes = [];
  const addSeerSurvBoost = function (id, pts) {
    if (!id || (self && self.id === id) || legalKnownGood[id]) return;
    if (!survivingSeerSuspicionBoost[id] || survivingSeerSuspicionBoost[id] < pts) {
      survivingSeerSuspicionBoost[id] = pts;
    }
  };
  if (deadNightSeerIds.length >= 1 && seerClaimants.length === 1) {
    survivingSeerAnomalies.push({ kind: "dead_night_seer_clash", seatIds: [seerClaimants[0].id] });
    addSeerSurvBoost(seerClaimants[0].id, diffSlot === "pro" ? 22 : (diffSlot === "easy" ? 6 : 15));
    survivingSeerNotes.push("已有一位觀察員在夜間倒牌，留場的 " + seerClaimants[0].id + "號須重新盤點真偽。");
  }
  if (votedOutDeadSeers.length >= 1 && seerClaimants.length === 1) {
    const loneS = seerClaimants[0];
    let latestVotedOutSeerDay = null;
    votedOutDeadSeers.forEach(function (ds) {
      if (votedOutDayMap[ds.id] && (latestVotedOutSeerDay === null || votedOutDayMap[ds.id] > latestVotedOutSeerDay)) {
        latestVotedOutSeerDay = votedOutDayMap[ds.id];
      }
    });
    const nightsSurvivedAfterOut = latestVotedOutSeerDay !== null ? ((snap.day || 1) - latestVotedOutSeerDay) : 0;
    if (nightsSurvivedAfterOut >= 2 && !publicProtectedSeerIds[loneS.id]) {
      survivingSeerAnomalies.push({ kind: "post_voteout_lone_survivor", seatIds: [loneS.id] });
      addSeerSurvBoost(loneS.id, diffSlot === "pro" ? 20 : (diffSlot === "easy" ? 6 : 14));
      survivingSeerNotes.push("對跳方公投離席後，" + loneS.id + "號連活兩晚仍未倒牌且無公開護航，必須高度懷疑其觀察員真實性。");
    }
  }
  if (seerClaimants.length >= 2 && (snap.day || 1) >= 3 && deadNightSeerIds.length === 0) {
    survivingSeerAnomalies.push({
      kind: "dual_seer_long_coexist",
      seatIds: seerClaimants.map(function (s) { return s.id; })
    });
    seerClaimants.forEach(function (sc) {
      if (!publicProtectedSeerIds[sc.id]) {
        addSeerSurvBoost(sc.id, diffSlot === "pro" ? 12 : (diffSlot === "easy" ? 4 : 8));
      }
    });
    survivingSeerNotes.push("雙觀察員並存至第" + snap.day + "天皆未中刀，可能存在長期抗推或狼隊故意留盤誤導。");
  }
  if (seerClaimants.length === 1 && deadNightSeerIds.length === 0 && votedOutDeadSeers.length === 0) {
    const soloS = seerClaimants[0];
    const claimDay = seerFirstClaimDay[soloS.id] || 1;
    const thresholdDay = snap.hasGuardMode ? 4 : 3;
    if ((snap.day || 1) >= thresholdDay && claimDay < (snap.day || 1) && !publicProtectedSeerIds[soloS.id]) {
      survivingSeerAnomalies.push({ kind: "uncontested_long_survivor", seatIds: [soloS.id] });
      addSeerSurvBoost(soloS.id, diffSlot === "pro" ? 18 : (diffSlot === "easy" ? 5 : 12));
      survivingSeerNotes.push("單邊觀察員 " + soloS.id + "號久活超過保護上限仍未倒牌且無公開銀水或守護紀錄，須防單邊自導自演。");
    }
  }
  const survivingSeerSummary = survivingSeerNotes.join(" ");

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
      if (self && self.id === trusted.id && self.role === "seer") {
        (self.checkedHistory || []).forEach(function (c) {
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
      checkedGoodIds.forEach(function (id) { pushGood(snap.getSeat(id)); });
      silverWaterIds.forEach(function (id) {
        if (checkedWolfIds.indexOf(id) === -1) pushGood(snap.getSeat(id));
      });
      if (soleWitch && checkedWolfIds.indexOf(soleWitch.id) === -1) pushGood(soleWitch);
      if (soleHunter && checkedWolfIds.indexOf(soleHunter.id) === -1) pushGood(soleHunter);
      if (soleGuard && checkedWolfIds.indexOf(soleGuard.id) === -1) pushGood(soleGuard);
      if (soleElder && checkedWolfIds.indexOf(soleElder.id) === -1) pushGood(soleElder);
      if (self && self.team === "good" && self.id !== trusted.id && self.id !== fake.id) {
        pushGood(self);
      }

      const worldGoodSet = {};
      goodPits.forEach(function (gp) { if (gp) worldGoodSet[gp.id] = true; });
      const basePool = aliveSeats.filter(function (c) {
        if (c.id === trusted.id || c.id === fake.id) return false;
        if (self && c.id === self.id) return false;
        if (checkedGoodIds.indexOf(c.id) !== -1) return false;
        return true;
      });
      const nonGoodPool = basePool.filter(function (c) { return !worldGoodSet[c.id]; });
      const candPool = nonGoodPool.length > 0 ? nonGoodPool : basePool;

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
        if ((divMap[c.id] || 0) >= 1) {
          pitScore += 10 * Math.min(2, divMap[c.id]);
          reasons.push("言票背離（說一套投一套）");
        }
        if ((coVoteMap[c.id] || 0) >= 2) {
          pitScore += 8;
          reasons.push("多輪與離席位同票綁定");
        }
        const votedTrusted = voteHist.some(function (vh) {
          return (vh.ballots || []).some(function (b) { return b.voterId === c.id && b.targetId === trusted.id; });
        });
        if (votedTrusted) {
          pitScore += 14;
          reasons.push("前輪投票針對觀察員");
        }
        if (shRec && shVotedForMap[c.id]) {
          if (shVotedForMap[c.id] === fake.id) {
            pitScore += 24;
            reasons.push("警長投票衝票給對跳位");
          } else if (shVotedForMap[c.id] === trusted.id) {
            pitScore -= 12;
          }
        }
        if (shRec && shWithdrawnIds.indexOf(c.id) !== -1) {
          pitScore += 6;
        }
        if (bfWolfMap[c.id]) {
          pitScore += 22;
          reasons.push("警徽流暗號直指查殺");
        } else if (bfGoodMap[c.id]) {
          pitScore -= 16;
        }
        if (self && self.suspicionMap) {
          pitScore += Math.round(((self.suspicionMap[c.id] || 50) - 44) * 0.45);
        }
        if (legalKnownGood[c.id]) {
          pitScore -= 55;
        }
        if (self && self.role === "wolf" && wolfTeamMap[c.id]) {
          pitScore -= 85;
        }
        return { seat: c, score: pitScore, reason: reasons[0] || "立場曖昧待檢視" };
      }).sort(function (a, b) { return b.score - a.score; });

      const wolfPits = (fake && fake.alive) ? [fake] : [];
      for (let wi = 0; wi < scoredCands.length && wolfPits.length < aliveWolfSlots; wi++) {
        const wCand = scoredCands[wi] && scoredCands[wi].seat;
        if (wCand && wolfPits.every(function (x) { return x.id !== wCand.id; })) {
          wolfPits.push(wCand);
        }
      }
      const secondWolf = wolfPits.length > 1 ? wolfPits[1] : null;
      const secondReason = (secondWolf && scoredCands.length > 0) ? scoredCands[0].reason : "";

      let conflictReason = "";
      let worldScore = 50;
      if (self && self.suspicionMap) {
        worldScore += Math.round((50 - (self.suspicionMap[trusted.id] || 50)) * 0.7);
        worldScore += Math.round(((self.suspicionMap[fake.id] || 50) - 50) * 0.55);
      }
      if (toxicMap[trusted.id]) worldScore -= 18;
      if (contraMap[trusted.id]) worldScore -= 22;
      if (toxicMap[fake.id]) worldScore += 14;
      if (contraMap[fake.id]) worldScore += 18;
      if (snap.sheriffBadgeFlowsBySeat && snap.sheriffBadgeFlowsBySeat[trusted.id]) {
        worldScore += (diffSlot === "pro" ? 10 : (diffSlot === "easy" ? 2 : 6));
      }
      const checkedSlipHit = checkedWolfIds.some(function (wid) { return Boolean(toxicMap[wid] || contraMap[wid]); });
      if (checkedSlipHit) {
        worldScore += (diffSlot === "pro" ? 18 : (diffSlot === "easy" ? 6 : 12));
      }
      const checkedProvenGoodConflict = checkedWolfIds.some(function (wid) {
        const wSeat = snap.getSeat(wid);
        return Boolean((wSeat && wSeat.voteDisabled) || (soleGodMap[wid] && !(self && self.id === wid)));
      });
      if (checkedProvenGoodConflict) {
        worldScore -= (diffSlot === "pro" ? 50 : (diffSlot === "easy" ? 20 : 42));
        if (!conflictReason) conflictReason = "他竟然把公開自證的關鍵好人打進狼坑";
      }

      if (self && self.role === "seer") {
        if (trusted.id === self.id) {
          worldScore += 140;
        } else {
          worldScore -= 140;
          conflictReason = "跟真正的我對跳身分";
        }
      } else if (self && self.team === "good") {
        if (checkedWolfIds.indexOf(self.id) !== -1) {
          worldScore -= 95;
          conflictReason = "他直接把我查進狼坑，邏輯爆掉";
        } else if (self.role === "witch" && self.savedSeatId && checkedWolfIds.indexOf(self.savedSeatId) !== -1) {
          worldScore -= 25;
          conflictReason = "他把我救過的人打進狼坑，須交叉查證";
        } else if (checkedGoodIds.indexOf(self.id) !== -1) {
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
        goodPits: goodPits.slice(0, 5),
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
    if (self && self.role === "wolf" && snap.wolfTactic !== "deep_stealth" && snap.wolfTactic !== "deep_stealth_bus") {
      const aIsWolfTeam = Boolean(wolfTeamMap[seerA.id]);
      const bIsWolfTeam = Boolean(wolfTeamMap[seerB.id]);
      if (aIsWolfTeam && !bIsWolfTeam) preferredSide = "A";
      else if (bIsWolfTeam && !aIsWolfTeam) preferredSide = "B";
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
    if (self && seatObj.id === self.id) return;
    if (goodPits.every(function (x) { return x.id !== seatObj.id; })) goodPits.push(seatObj);
  };

  if (dualSeerWorlds) {
    dualSeerWorlds.chosenWorld.goodPits.forEach(function (s) { pushGenGood(s); });
  } else {
    Object.keys(legalKnownGood).forEach(function (k) { pushGenGood(snap.getSeat(parseInt(k, 10))); });
    deadNightSeerGoodIds.forEach(function (id) { pushGenGood(snap.getSeat(id)); });
    silverWaterIds.forEach(function (id) { pushGenGood(snap.getSeat(id)); });
    if (soleWitch) pushGenGood(soleWitch);
    if (soleHunter) pushGenGood(soleHunter);
    if (soleGuard) pushGenGood(soleGuard);
    if (soleElder) pushGenGood(soleElder);
    const lowestSus = aliveSeats.filter(function (s) {
      if (self && s.id === self.id) return false;
      if (legalKnownWolf[s.id]) return false;
      if (self && self.role === "wolf" && wolfTeamMap[s.id]) return false;
      return spokenSet[s.id] && self && (self.suspicionMap[s.id] || 50) <= 44;
    }).sort(function (a, b) {
      return (self.suspicionMap[a.id] || 50) - (self.suspicionMap[b.id] || 50);
    });
    lowestSus.slice(0, 2).forEach(pushGenGood);
  }

  const wolfPits = [];
  const pushGenWolf = function (seatObj) {
    if (!seatObj || !seatObj.alive) return;
    if (self && seatObj.id === self.id) return;
    if (self && self.role === "wolf" && wolfTeamMap[seatObj.id]) return;
    if (legalKnownGood[seatObj.id]) return;
    if (goodPits.some(function (g) { return g.id === seatObj.id; })) return;
    if (wolfPits.every(function (x) { return x.id !== seatObj.id; })) wolfPits.push(seatObj);
  };

  if (dualSeerWorlds) {
    dualSeerWorlds.chosenWorld.wolfPits.forEach(pushGenWolf);
  } else {
    Object.keys(legalKnownWolf).forEach(function (k) { pushGenWolf(snap.getSeat(parseInt(k, 10))); });
    // Ranked spoken + known suspicious candidates
    const sheriffPitDelta = function (seatId) {
      if (!shRec) return 0;
      let delta = 0;
      const shTgtId = shVotedForMap[seatId];
      if (shTgtId) {
        const shTgtObj = snap.getSeat(shTgtId);
        if (legalKnownWolf[shTgtId] || contraMap[shTgtId] || toxicMap[shTgtId] || (shTgtObj && !shTgtObj.alive && !shTgtObj.fogSealed && shTgtObj.outReason === "投票出局")) {
          delta += 18;
        } else if (shRec.winnerId && shTgtId !== shRec.winnerId && shSeerClaimIds.length >= 2 && shSeerClaimIds.indexOf(shTgtId) !== -1) {
          delta += 10;
        } else if (legalKnownGood[shTgtId] || (uncontestedSeer && shTgtId === uncontestedSeer.id)) {
          delta -= 10;
        }
      }
      if (shWithdrawnIds.indexOf(seatId) !== -1) delta += 6;
      if (bfWolfMap[seatId]) delta += 22;
      else if (bfGoodMap[seatId]) delta -= 16;
      return delta;
    };
    const susCands = aliveSeats.filter(function (s) {
      if (self && s.id === self.id) return false;
      if (self && self.role === "wolf" && wolfTeamMap[s.id]) return false;
      if (legalKnownGood[s.id]) return false;
      return true;
    }).sort(function (a, b) {
      const aDeadSeerBoost = (deadNightSeerWolfBoost[a.id] || 0) + (survivingSeerSuspicionBoost[a.id] || 0);
      const bDeadSeerBoost = (deadNightSeerWolfBoost[b.id] || 0) + (survivingSeerSuspicionBoost[b.id] || 0);
      const aBoost = (toxicMap[a.id] ? 14 : 0) + (contraMap[a.id] ? 18 : 0) + (spokenSet[a.id] ? 6 : 0) + sheriffPitDelta(a.id) + aDeadSeerBoost;
      const bBoost = (toxicMap[b.id] ? 14 : 0) + (contraMap[b.id] ? 18 : 0) + (spokenSet[b.id] ? 6 : 0) + sheriffPitDelta(b.id) + bDeadSeerBoost;
      const aVal = (self && self.suspicionMap ? (self.suspicionMap[a.id] || 50) : 50) + aBoost;
      const bVal = (self && self.suspicionMap ? (self.suspicionMap[b.id] || 50) : 50) + bBoost;
      return bVal - aVal;
    });
    susCands.slice(0, aliveWolfSlots).forEach(pushGenWolf);
  }

  // Sole-god rally lead when there is no settled trusted Seer on the table
  let soleGodLead = null;
  const hasTrustedUncontestedSeer = Boolean(uncontestedSeer && !(survivingSeerSuspicionBoost[uncontestedSeer.id] >= 12));
  const hasClearDualSeerLead = Boolean(
    dualSeerWorlds &&
    Math.abs((dualSeerWorlds.worldA ? dualSeerWorlds.worldA.score : 0) - (dualSeerWorlds.worldB ? dualSeerWorlds.worldB.score : 0)) >= 18
  );
  if (!hasTrustedUncontestedSeer && !hasClearDualSeerLead && soleGodIds.length > 0) {
    for (let ei = dayEvs.length - 1; ei >= 0; ei--) {
      const evG = dayEvs[ei];
      if (!evG || !evG.speakerId || !soleGodMap[evG.speakerId] || !evG.accuseId) continue;
      const tLead = snap.getSeat(evG.accuseId);
      if (tLead && tLead.alive && !soleGodMap[tLead.id] && !legalKnownGood[tLead.id]) {
        const gObj = snap.getSeat(evG.speakerId);
        soleGodLead = {
          godSeatId: evG.speakerId,
          godRole: (gObj && gObj.claimedRole) || evG.claimRole || "god",
          targetId: tLead.id
        };
        break;
      }
    }
  }

  // Non-fog-seal low-god warning: public total god count minus publicly dead/revealed god count <= 1
  const publicTotalGods = snap.variantMode === "lone_wolf_king"
    ? 3
    : (snap.totalSeats >= 12 ? 4 : (snap.totalSeats >= 8 ? (snap.hasGuardMode ? 4 : 3) : 2));
  let publicDeadGodCount = 0;
  if (!isFogSeal) {
    UNIQUE_GOD_ROLES.forEach(function (rKey) {
      const hist = roleClaimHistoryMap[rKey] || [];
      const hasDeadClaim = hist.some(function (s) { return !s.alive; });
      const hasHardAlive = hist.some(function (s) { return s.alive && rKey === "elder" && s.voteDisabled; });
      if (hasDeadClaim && !hasHardAlive && !(self && selfEffRoleSlot === rKey && self.alive)) {
        publicDeadGodCount += 1;
      }
    });
  }
  const remainingPublicGods = Math.max(0, publicTotalGods - publicDeadGodCount);
  const lowGodCountWarning = Boolean(!isFogSeal && remainingPublicGods <= 1);
  const lowGodCountSummary = lowGodCountWarning
    ? "場上已公開倒牌神職偏多，推算至多僅剩 1 名在場神職，未公開身分之暗神應低調藏身分，好人宜避免盲推零矛盾安靜位。"
    : "";

  const trustedGoldIds = [];
  const pushTrustedGold = function (gid) {
    if (gid && trustedGoldIds.indexOf(gid) === -1) trustedGoldIds.push(gid);
  };
  if (dualSeerWorlds && dualSeerWorlds.chosenWorld && Array.isArray(dualSeerWorlds.chosenWorld.checkedGoodIds)) {
    dualSeerWorlds.chosenWorld.checkedGoodIds.forEach(pushTrustedGold);
  } else if (hasTrustedUncontestedSeer) {
    allEvs.forEach(function (ev) {
      if (ev && ev.speakerId === uncontestedSeer.id && ev.checkedGoodId && aliveIds.indexOf(ev.checkedGoodId) !== -1) {
        pushTrustedGold(ev.checkedGoodId);
      }
    });
  }
  deadNightSeerGoodIds.forEach(pushTrustedGold);
  if (self && self.role === "seer") {
    (self.checkedHistory || []).forEach(function (c) {
      if (c && !c.isWolf && aliveIds.indexOf(c.targetId) !== -1) pushTrustedGold(c.targetId);
    });
  }

  return {
    aliveWolfSlots: aliveWolfSlots,
    goodPits: goodPits.slice(0, 5),
    wolfPits: wolfPits.slice(0, aliveWolfSlots),
    dualSeerWorlds: dualSeerWorlds,
    deadNightSeers: deadNightSeerIds,
    soleGodIds: soleGodIds,
    soleGodMap: soleGodMap,
    soleGodLead: soleGodLead,
    deadGodImpersonators: deadGodImpersonators,
    survivingSeerAnomalies: survivingSeerAnomalies,
    survivingSeerSuspicionBoost: survivingSeerSuspicionBoost,
    survivingSeerSummary: survivingSeerSummary,
    lowGodCountWarning: lowGodCountWarning,
    lowGodCountSummary: lowGodCountSummary,
    contraCountMap: contraCountMap,
    silverWaterUnlocked: silverWaterUnlocked,
    trustedGoldIds: trustedGoldIds
  };
}

function classifySpeechGameState(speaker, snap, opts) {
  const o = opts || {};
  const s = snap || {};
  const phase = String(o.phase || s.phase || "");
  const day = Math.max(1, Number(o.day || s.day || 1));
  const aliveCount = Array.isArray(s.aliveSeats) ? s.aliveSeats.length : 0;
  const isLastWords = Boolean(
    o.isLastWords ||
    phase === "LAST_WORDS_SPEECH" ||
    phase === "LAST_WORDS_PLAYER"
  );
  const isSheriff = Boolean(
    !isLastWords && (
      o.isSheriff ||
      phase === "SHERIFF_ELECTION" ||
      (s.publicSheriffCtx && phase === "SHERIFF_ELECTION")
    )
  );
  const isPk = Boolean(
    !isLastWords && !isSheriff && (
      o.isPk ||
      s.pkActive ||
      (Array.isArray(s.pkCandidates) && s.pkCandidates.length >= 2)
    )
  );

  const dayEvs = Array.isArray(s.daySpeechEvents) ? s.daySpeechEvents : [];
  const pubLogsToday = Array.isArray(s.publicLogs)
    ? s.publicLogs.filter(function (l) { return l && l.day === day && l.kind === "speech"; })
    : [];
  const shSpoken = (s.publicSheriffCtx && Array.isArray(s.publicSheriffCtx.spokenSpeeches))
    ? s.publicSheriffCtx.spokenSpeeches
    : [];
  const shOrder = (s.publicSheriffCtx && Array.isArray(s.publicSheriffCtx.speechOrderIds))
    ? s.publicSheriffCtx.speechOrderIds
    : ((s.publicSheriffCtx && Array.isArray(s.publicSheriffCtx.candidateIds)) ? s.publicSheriffCtx.candidateIds : []);

  let spokenCount = 0;
  let remainingCount = 0;
  if (isSheriff) {
    spokenCount = (typeof o.spokenCount === "number")
      ? o.spokenCount
      : shSpoken.filter(function (sp) { return sp && sp.seatId !== (speaker && speaker.id); }).length;
    remainingCount = Math.max(0, shOrder.length - spokenCount - 1);
  } else {
    const seen = {};
    dayEvs.forEach(function (ev) {
      if (ev && ev.speakerId && (!speaker || ev.speakerId !== speaker.id)) seen[ev.speakerId] = true;
    });
    pubLogsToday.forEach(function (l) {
      if (l && l.speakerId && (!speaker || l.speakerId !== speaker.id)) seen[l.speakerId] = true;
    });
    spokenCount = Object.keys(seen).length;
    remainingCount = Math.max(0, aliveCount - spokenCount - 1);
  }

  const seerClaimers = {};
  (Array.isArray(s.allSpeechEvents) ? s.allSpeechEvents : []).forEach(function (ev) {
    if (ev && ev.claimRole === "seer" && ev.speakerId) seerClaimers[ev.speakerId] = true;
  });
  shSpoken.forEach(function (sp) {
    if (sp && sp.claimedSeer && sp.seatId) seerClaimers[sp.seatId] = true;
  });
  if (s.sheriffVoteRecord && Array.isArray(s.sheriffVoteRecord.seerClaimIds)) {
    s.sheriffVoteRecord.seerClaimIds.forEach(function (cid) { if (cid) seerClaimers[cid] = true; });
  }
  (Array.isArray(s.seats) ? s.seats : []).forEach(function (st) {
    if (st && st.claimedRole === "seer" && st.id) seerClaimers[st.id] = true;
  });
  const seerClaimCount = Object.keys(seerClaimers).length;

  let stateTag = "DAY1_SINGLE";
  let stateLabel = "第1天白天 單邊觀察員或無人起跳";
  if (isLastWords) {
    stateTag = "LAST_WORDS";
    stateLabel = "出局遺言";
  } else if (isPk) {
    stateTag = "PK_DEFENSE";
    stateLabel = "平票 PK 生死辯護";
  } else if (isSheriff) {
    if (spokenCount <= 1) {
      stateTag = "SHERIFF_EARLY";
      stateLabel = "警上競選 首置位";
    } else {
      stateTag = "SHERIFF_LATE";
      stateLabel = "警上競選 中後置位";
    }
  } else if (aliveCount > 0 && ((day >= 2 && aliveCount <= 7) || aliveCount <= 6)) {
    stateTag = "ENDGAME";
    stateLabel = "殘局決勝階段";
  } else if (day >= 2) {
    stateTag = "DAY2_PLUS";
    stateLabel = "第" + day + "天白天 票型複盤與生存驗證";
  } else if (seerClaimCount >= 2) {
    stateTag = "DAY1_CLASH";
    stateLabel = "第1天白天 雙觀察員對跳局";
  } else {
    stateTag = "DAY1_SINGLE";
    stateLabel = "第1天白天 單邊或無人起跳局";
  }

  let positionRole = "中間位";
  if (spokenCount === 0 || (isSheriff && spokenCount <= 1) || (!isSheriff && spokenCount <= 1 && aliveCount >= 10)) {
    positionRole = "首置位";
  } else if (remainingCount <= 1 || (s.sheriffSeatId && speaker && s.sheriffSeatId === speaker.id && !isSheriff)) {
    positionRole = "末置歸票位";
  }

  return Object.freeze({
    stateTag: stateTag,
    stateLabel: stateLabel,
    positionRole: positionRole,
    spokenCount: spokenCount,
    remainingCount: remainingCount,
    day: day,
    aliveCount: aliveCount,
    seerClaimCount: seerClaimCount,
    isSheriff: isSheriff,
    isPk: isPk,
    isLastWords: isLastWords
  });
}

function buildRecentSpeakersSummary(snap, speakerId, opts) {
  const s = snap || {};
  const o = opts || {};
  const phase = String(o.phase || s.phase || "");
  const getBlindSeat = typeof s.getSeat === "function" ? s.getSeat : function () { return null; };
  const labelOf = function (id) {
    const st = getBlindSeat(id);
    if (!st) return id + "號";
    return st.id + "號" + (st.isHuman || st.isPlayer ? "玩家" : st.name);
  };
  const compactOpener = function (txt) {
    const cleaned = String(txt || "").replace(/\s+/g, "").replace(/[（()）]/g, "");
    return cleaned.slice(0, 10);
  };

  if (phase === "SHERIFF_ELECTION" && s.publicSheriffCtx && Array.isArray(s.publicSheriffCtx.spokenSpeeches)) {
    return s.publicSheriffCtx.spokenSpeeches
      .filter(function (sp) { return sp && sp.seatId && sp.seatId !== speakerId; })
      .slice(-3)
      .map(function (sp) {
        const st = getBlindSeat(sp.seatId);
        let stance = sp.withdrawn ? "選擇退水" : "表態競選警長";
        if (sp.claimedSeer && sp.checkedTargetId) {
          stance = "起跳觀察員報驗 " + labelOf(sp.checkedTargetId) + (sp.checkedIsWolf ? " 為酸民狼" : " 為好人");
        }
        return {
          seatId: sp.seatId,
          name: st ? st.name : (sp.name || ""),
          gender: st ? (st.gender || "neutral") : "neutral",
          opener10: compactOpener(sp.text),
          stanceSummary: stance
        };
      });
  }

  const dayEvs = Array.isArray(s.daySpeechEvents) ? s.daySpeechEvents : [];
  return dayEvs
    .filter(function (ev) { return ev && ev.speakerId && ev.speakerId !== speakerId && !ev.isLastWord; })
    .slice(-3)
    .map(function (ev) {
      const st = getBlindSeat(ev.speakerId);
      const parts = [];
      if (ev.claimRole === "seer") parts.push("跳觀察員");
      else if (ev.claimRole === "witch") parts.push("跳奉茶師");
      else if (ev.claimRole === "guard") parts.push("跳守衛");
      else if (ev.claimRole === "hunter") parts.push("跳糾察長");
      if (ev.checkedWolfId) parts.push("查殺 " + labelOf(ev.checkedWolfId));
      else if (ev.checkedGoodId) parts.push("驗出好人 " + labelOf(ev.checkedGoodId));
      if (ev.standWithSeerId) parts.push("站邊 " + labelOf(ev.standWithSeerId));
      if (ev.accuseId) parts.push("懷疑並預定投 " + labelOf(ev.accuseId));
      if (ev.vouchId) parts.push("保護 " + labelOf(ev.vouchId));
      return {
        seatId: ev.speakerId,
        name: st ? st.name : (ev.speakerName || ""),
        gender: st ? (st.gender || "neutral") : "neutral",
        opener10: compactOpener(ev.rawText),
        stanceSummary: parts.length ? parts.join("，") : "正常表態理邏輯"
      };
    });
}

function buildPriorDayVotesSummary(snap) {
  const s = snap || {};
  const vhList = Array.isArray(s.voteHistory) ? s.voteHistory : [];
  if (!vhList.length) return "";
  const getBlindSeat = typeof s.getSeat === "function" ? s.getSeat : function () { return null; };
  const labelOf = function (id) {
    const st = getBlindSeat(id);
    if (!st) return id + "號";
    return st.id + "號" + (st.isHuman || st.isPlayer ? "玩家" : st.name);
  };
  const recentVh = vhList.slice(-2);
  return recentVh.map(function (vh) {
    const byTarget = {};
    const abstainers = [];
    (vh.ballots || []).forEach(function (b) {
      if (!b || !b.voterId) return;
      if (!b.targetId) {
        abstainers.push(labelOf(b.voterId));
      } else {
        if (!byTarget[b.targetId]) byTarget[b.targetId] = [];
        byTarget[b.targetId].push(labelOf(b.voterId));
      }
    });
    const segments = Object.keys(byTarget)
      .sort(function (a, b) { return byTarget[b].length - byTarget[a].length; })
      .map(function (tid) {
        return "投給 " + labelOf(Number(tid)) + "：" + byTarget[tid].join("、");
      });
    if (abstainers.length) segments.push("棄票：" + abstainers.join("、"));
    const outStr = vh.outId ? ("結果 " + labelOf(vh.outId) + " 離席") : "平票未出人";
    return "第" + (vh.day || 1) + "天公投 " + outStr + "，票型為 " + segments.join("；");
  }).join(" | ");
}

function buildSpeechContext(speaker, opts) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(speaker, { module: "speech_context" })
    : null;
  const aliveOthers = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== speaker.id; });
  const day = snap ? snap.day : state.match.day;
  const dayEvents = snap ? snap.daySpeechEvents : (state.match.daySpeechEvents || []);
  const todaySpeeches = snap
    ? snap.publicLogs.filter(function (l) { return l.day === day && l.kind === "speech"; })
    : state.match.logs.filter(function (l) { return l.day === day && l.kind === "speech"; });
  const getBlindSeat = snap ? snap.getSeat : getSeat;
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
  const spokenOthers = spokenIdsToday.map(function (id) { return getBlindSeat(id); }).filter(function (s) {
    return Boolean(s && s.alive && s.id !== speaker.id);
  });
  const queueIds = snap ? snap.speechQueue.slice() : (state.match.speechQueue || []).slice();
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
  const pidNow = snap ? snap.playerSeatId : getPlayerId();

  const seatLabel = function (s) {
    if (!s) return "後面夥伴";
    return s.id + "號" + (s.id === pidNow ? "" : s.name);
  };
  const fill = function (tpl, map) {
    let out = tpl;
    if (Array.isArray(tpl)) {
      const ep = (typeof orchestrator !== "undefined" && orchestrator.matchEpoch) ? orchestrator.matchEpoch : 0;
      const mSeed = (snap && typeof snap.matchStyleSeed === "number") ? snap.matchStyleSeed : 0;
      const seed = speaker.id * 17 + day * 13 + ep * 7 + todaySpeeches.length * 3 + mSeed * 5 + Object.keys(map || {}).length;
      out = tpl[((seed % tpl.length) + tpl.length) % tpl.length] || "";
    }
    out = String(out || "");
    Object.keys(map || {}).forEach(function (k) {
      out = out.split("{" + k + "}").join(map[k] || "");
    });
    return out;
  };

  // Cumulative Multi-Round Analysis across ALL prior rounds (Day 1 .. Day N-1 speeches + vote tallies!)
  const priorVotesAll = (day >= 2 && snap) ? snap.voteHistory : [];
  const allEvsBlind = snap ? snap.allSpeechEvents : [];
  const priorSpeechesAll = (day >= 2)
    ? allEvsBlind.filter(function (ev) { return ev.day < day; })
    : [];

  let prevVoteNote = "";
  let prevVoteSuspect = null;
  if (day >= 2 && (priorVotesAll.length > 0 || priorSpeechesAll.length > 0)) {
    const aliveIds = (snap ? snap.aliveSeats : getAliveSeats()).map(function (s) { return s.id; });
    const lastVh = priorVotesAll.length > 0 ? priorVotesAll[priorVotesAll.length - 1] : null;

    // Priority 1: Catch cross-round speech-vs-vote hypocrisy (only when no new intervening evidence surfaced!)
    let hypocriteEv = null;
    for (let ei = priorSpeechesAll.length - 1; ei >= 0; ei--) {
      const ev = priorSpeechesAll[ei];
      if (ev.speakerId === speaker.id || aliveIds.indexOf(ev.speakerId) === -1 || !ev.vouchId) continue;
      const flipBallot = priorVotesAll.some(function (vh) {
        return (vh.ballots || []).some(function (b) { return b.voterId === ev.speakerId && b.targetId === ev.vouchId; });
      });
      if (!flipBallot) continue;
      const evIdx = allEvsBlind.indexOf(ev);
      const hasNewEvidence = allEvsBlind.some(function (laterEv, idx) {
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
      const hSeat = getBlindSeat(hypocriteEv.speakerId);
      prevVoteSuspect = hSeat;
      prevVoteNote = "我先抓上一輪 " + seatLabel(hSeat) + " 的前後矛盾：昨天嘴上才保 " + seatLabel(getBlindSeat(hypocriteEv.vouchId)) + "，公投卻轉頭砸票，根本自打嘴巴！";
    } else if (votedMeEntry) {
      const vSeat = getBlindSeat(votedMeEntry.voterId);
      prevVoteSuspect = vSeat;
      prevVoteNote = "我先點出上一輪 " + seatLabel(vSeat) + " 居然把票投給我，明顯想亂找好人抗推！";
    } else if (accusedMePast) {
      const aSeat = getBlindSeat(accusedMePast.speakerId);
      prevVoteSuspect = aSeat;
      prevVoteNote = seatLabel(aSeat) + " 上一輪就急著把火往我身上引，動機非常可疑，今天重點盯著他！";
    } else if (topAbstainerId) {
      const abSeat = getBlindSeat(parseInt(topAbstainerId, 10));
      const abCnt = abstainerCounts[topAbstainerId];
      prevVoteSuspect = abSeat;
      prevVoteNote = seatLabel(abSeat) + (abCnt >= 2 ? (" 已經連 " + abCnt + " 輪棄票划水，") : " 上一輪棄票不沾鍋，") + "躲在後面最像狼坑位！";
    } else if (!speakerVotedTop && blocVoters.length > 0 && topTargetId) {
      const bNames = blocVoters.slice(0, 2).map(function (b) { return seatLabel(getBlindSeat(b.voterId)); }).join("跟");
      const tSeat = getBlindSeat(topTargetId);
      prevVoteSuspect = getBlindSeat(blocVoters[0].voterId);
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
        const spSeat = getBlindSeat(splitVote.voterId);
        if (spSeat) {
          prevVoteSuspect = spSeat;
          prevVoteNote = seatLabel(spSeat) + " 上一輪在眾人集火時刻意分票到無人問津的邊緣席，很像幫同伴墊票洗白！";
        }
      }
    }
  }

  const shRecCtx = snap ? snap.sheriffVoteRecord : null;
  let sheriffVoteNote = "";
  let sheriffVoteSuspect = null;
  if (shRecCtx && Array.isArray(shRecCtx.ballots) && shRecCtx.ballots.length > 0) {
    const aliveIdsNow = (snap ? snap.aliveSeats : getAliveSeats()).map(function (s) { return s.id; });
    const shBallotsLive = shRecCtx.ballots.filter(function (b) {
      return b && b.voterId && b.targetId && b.voterId !== speaker.id && aliveIdsNow.indexOf(b.voterId) !== -1;
    });
    const shSeers = Array.isArray(shRecCtx.seerClaimIds) ? shRecCtx.seerClaimIds : [];
    const shRivalTarget = shSeers.find(function (cid) { return cid !== speaker.id && cid !== shRecCtx.winnerId; })
      || (shRecCtx.candidateIds || []).find(function (cid) { return cid !== speaker.id && cid !== shRecCtx.winnerId; })
      || shRecCtx.winnerId;
    const pickBallot = function (matchRival) {
      return shBallotsLive.find(function (b) {
        if (speaker.role === "wolf") {
          const bs = getBlindSeat(b.voterId);
          if (bs && bs.isWolfMate) return false;
        }
        return matchRival ? (shRivalTarget && b.targetId === shRivalTarget) : true;
      });
    };
    const shPicked = pickBallot(true) || pickBallot(false);
    if (shPicked) {
      const svSeat = getBlindSeat(shPicked.voterId);
      const stSeat = getBlindSeat(shPicked.targetId);
      if (svSeat && stSeat) {
        sheriffVoteSuspect = svSeat;
        const isClashVote = shSeers.length >= 2 && shSeers.indexOf(stSeat.id) !== -1;
        sheriffVoteNote = isClashVote
          ? ("比對剛才警長票型，" + seatLabel(svSeat) + " 在雙明心對跳下把警徽投給 " + seatLabel(stSeat) + "，這張警下衝票得先納入排坑考量！")
          : ("參考剛才警長競選票型，" + seatLabel(svSeat) + " 在警下把票投給 " + seatLabel(stSeat) + "，等下排坑會把這張票型一併納入比對！");
      }
    }
  }
  const bfSignalsCtx = (snap && Array.isArray(snap.badgeFlowSignals)) ? snap.badgeFlowSignals : [];
  const latestBfSig = bfSignalsCtx.length > 0 ? bfSignalsCtx[bfSignalsCtx.length - 1] : null;
  let badgeFlowNote = "";
  let badgeFlowSuspect = null;
  if (latestBfSig && latestBfSig.day >= Math.max(1, day - 1)) {
    const ownerSeatBf = getBlindSeat(latestBfSig.ownerId);
    const ownerTrusted = !speaker.suspicionMap || (speaker.suspicionMap[latestBfSig.ownerId] || 50) < 68;
    const susIdBf = (latestBfSig.suspectedWolfIds || []).find(function (id) {
      const s = getBlindSeat(id);
      return Boolean(s && s.alive && s.id !== speaker.id && !(speaker.role === "wolf" && s.isWolfMate));
    });
    const goodIdBf = (latestBfSig.verifiedGoodIds || []).find(function (id) {
      const s = getBlindSeat(id);
      return Boolean(s && s.alive && s.id !== speaker.id);
    });
    if (ownerSeatBf && ownerTrusted) {
      if (susIdBf) {
        badgeFlowSuspect = getBlindSeat(susIdBf);
        badgeFlowNote = latestBfSig.kind === "torn_wolf"
          ? ("看昨夜警徽流暗號：" + seatLabel(ownerSeatBf) + " 留了先驗 " + seatLabel(badgeFlowSuspect) + " 卻選擇當場撕毀警徽，這等於直接報 " + seatLabel(badgeFlowSuspect) + " 查殺狼坑！")
          : ("看昨夜警徽流暗號：" + seatLabel(ownerSeatBf) + " 跳過第一警徽流 " + seatLabel(badgeFlowSuspect) + (goodIdBf ? (" 改把警徽飛給 " + seatLabel(getBlindSeat(goodIdBf))) : "") + "，這訊號直指 " + seatLabel(badgeFlowSuspect) + " 嫌疑最大！");
      } else if (goodIdBf) {
        const gSeatBf = getBlindSeat(goodIdBf);
        badgeFlowNote = "看昨夜警徽流暗號：" + seatLabel(ownerSeatBf) + " 離席後把警徽飛給第一警徽流 " + seatLabel(gSeatBf) + "，若認他真明心，" + seatLabel(gSeatBf) + " 就是警徽流金水好人坑！";
      }
    } else if (ownerSeatBf && !ownerTrusted && (goodIdBf || susIdBf)) {
      const refSeat = getBlindSeat(goodIdBf || susIdBf);
      badgeFlowNote = "雖然 " + seatLabel(ownerSeatBf) + " 透過警徽流放了訊號給 " + seatLabel(refSeat) + "，但我原本就懷疑他可能是悍跳位，警徽流要搭配全場票型反推！";
    }
  }
  if (badgeFlowNote && latestBfSig && latestBfSig.day === day) {
    prevVoteNote = badgeFlowNote;
    if (badgeFlowSuspect) prevVoteSuspect = badgeFlowSuspect;
  } else if (!prevVoteNote && badgeFlowNote) {
    prevVoteNote = badgeFlowNote;
    if (!prevVoteSuspect && badgeFlowSuspect) prevVoteSuspect = badgeFlowSuspect;
  }
  if (!prevVoteNote && sheriffVoteNote) prevVoteNote = sheriffVoteNote;
  if (!prevVoteSuspect && sheriffVoteSuspect) prevVoteSuspect = sheriffVoteSuspect;

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
  const lastOutIds = snap ? snap.lastNightCasualties : (state.match.lastNightCasualties || []);
  let nightDeathNote = "";
  if (lastOutIds.length > 0 && day >= 2) {
    const deadSeat = getBlindSeat(lastOutIds[0]);
    const selfPurifiedDead = Boolean(deadSeat && speaker.role === "witch" && speaker.purifiedSeatId === deadSeat.id);
    if (deadSeat && !selfPurifiedDead) {
      const deadPastAccuse = priorSpeechesAll.slice().reverse().find(function (ev) { return ev.speakerId === deadSeat.id && ev.accuseId; });
      const deadSusSeat = deadPastAccuse ? getBlindSeat(deadPastAccuse.accuseId) : null;
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
    return ev.speakerId !== speaker.id && (ev.claimRole === "seer" || ev.claimRole === "witch" || ev.claimRole === "hunter" || ev.claimRole === "guard" || ev.claimRole === "elder");
  });
  const speakerEffKey = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(speaker) : speaker.role;
  const priorSameRoleSteal = (speakerEffKey === "seer" || speakerEffKey === "witch" || speakerEffKey === "hunter" || speakerEffKey === "guard" || speakerEffKey === "elder")
    ? priorGodClaims.find(function (ev) { return ev.claimRole === speakerEffKey; })
    : null;

  const slotPlan = buildTableSlotAndWorldAnalysis(speaker, snap);
  const callbackPhrase = buildPriorCallbackPhrase(speaker, dayEvents, seatLabel, snap);
  const pickVoice = function (slotKey, salt) {
    return pickPersonaVoice(speaker, slotKey, salt);
  };

  // v15.0 Strictly Public Verbatim Anchor, Live Table Micro-Reactions & Tea-Cup Interjections (Zero-Leak!)
  const pidSnap = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
  let playerAnchorOnMe = "";
  const playerChallengeEv = dayEvents.slice().reverse().find(function (ev) {
    if (!ev || ev.speakerId !== pidSnap || speaker.id === pidSnap) return false;
    const hitMe = ev.accuseId === speaker.id
      || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(speaker.id) !== -1)
      || (ev.verbatimAnchorsByTarget && ev.verbatimAnchorsByTarget[speaker.id]);
    return Boolean(hitMe);
  });
  if (playerChallengeEv) {
    playerAnchorOnMe = (playerChallengeEv.verbatimAnchorsByTarget && playerChallengeEv.verbatimAnchorsByTarget[speaker.id])
      || playerChallengeEv.verbatimAnchor
      || "";
  }

  const pubReactions = (snap && Array.isArray(snap.tableReactions)) ? snap.tableReactions : [];
  const pubInterjects = (snap && Array.isArray(snap.publicInterjections)) ? snap.publicInterjections : [];
  const latestReact = pubReactions.length > 0 ? pubReactions[pubReactions.length - 1] : null;
  let recentTableReactionNote = "";
  if (latestReact && latestReact.targetId && latestReact.targetId !== speaker.id) {
    const rSeat = getBlindSeat(latestReact.targetId);
    if (rSeat && rSeat.alive) {
      recentTableReactionNote = latestReact.kind === "frown"
        ? ("我看你剛才聽 " + seatLabel(rSeat) + " 發言時皺了眉頭，你也覺得他那段不太對勁吧？")
        : ("剛才看你對 " + seatLabel(rSeat) + " 點了頭，不過我還是想再對一下他前後的說法。");
    }
  }
  const latestInterj = pubInterjects.length > 0 ? pubInterjects[pubInterjects.length - 1] : null;
  let recentInterjectionNote = "";
  if (latestInterj && latestInterj.targetId && latestInterj.targetId !== speaker.id) {
    const iSeat = getBlindSeat(latestInterj.targetId);
    if (iSeat && iSeat.alive) {
      recentInterjectionNote = "剛才你當場舉杯追問 " + seatLabel(iSeat) + "「" + latestInterj.question + "」，聽他那句回防我反倒多留了個心眼。";
    }
  }

  const recentSpeakersSummary = snap ? buildRecentSpeakersSummary(snap, speaker.id, opts) : [];
  const priorDayVotesSummary = snap ? buildPriorDayVotesSummary(snap) : "";
  const speechStateInfo = snap ? classifySpeechGameState(speaker, snap, opts) : {
    stateTag: (day >= 2 ? "DAY2_PLUS" : "DAY1_SINGLE"),
    stateLabel: (day >= 2 ? "第" + day + "天白天" : "第1天白天"),
    positionRole: isFirstToday ? "首置位" : (isLateSeat ? "末置歸票位" : "中間位"),
    spokenCount: spokenIdsToday.length,
    remainingCount: Math.max(0, unspokenOthers.length - 1),
    day: day,
    aliveCount: aliveOthers.length + (speaker.alive ? 1 : 0),
    seerClaimCount: 0,
    isSheriff: false,
    isPk: false,
    isLastWords: false
  };

  return {
    snap: snap,
    getBlindSeat: getBlindSeat,
    aliveOthers: aliveOthers,
    day: day,
    stateTag: speechStateInfo.stateTag,
    stateLabel: speechStateInfo.stateLabel,
    positionRole: speechStateInfo.positionRole,
    speechStateInfo: speechStateInfo,
    recentSpeakersSummary: recentSpeakersSummary,
    priorDayVotesSummary: priorDayVotesSummary,
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
    sheriffVoteNote: sheriffVoteNote,
    sheriffVoteSuspect: sheriffVoteSuspect,
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
    dualSeerWorlds: slotPlan.dualSeerWorlds,
    playerAnchorOnMe: playerAnchorOnMe,
    recentTableReactionNote: recentTableReactionNote,
    recentInterjectionNote: recentInterjectionNote,
    tableReactions: pubReactions,
    publicInterjections: pubInterjects
  };
}

// Strict 凹嗚狼人殺 turn order: no mid-speech grilling or interrupting allowed!

function applySpeechInfluence(speaker, speechMeta) {
  const diff = state.aiDifficulty || "normal";
  const harmony = (state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72;
  const toxicPenalty = (diff === "easy" ? 15 : (diff === "pro" ? 9 : 11)) + (harmony >= 80 ? 6 : 0);
  // Zero-Leak Fair Play: Low-harmony haze increases susceptibility uniformly to assertive claims, while clear tea wind strengthens reasoned persuasion (NEVER peeks at hidden speaker.team!)
  const hazeFogBoost = (harmony <= 45 && (speechMeta.claimSeer || speechMeta.accuseId)) ? 1.22 : 1.0;
  const clearMindMul = (harmony >= 80 && !speechMeta.hasToxicSlip) ? 1.15 : 1.0;
  const diffCredMul = (diff === "easy" ? 1.18 : (diff === "pro" ? 0.88 : 1.0)) * hazeFogBoost * clearMindMul;
  const extraWolfPits = Array.isArray(speechMeta.wolfPits) ? speechMeta.wolfPits : [];

  state.match.seats.forEach(function (listener) {
    if (!listener.alive || listener.id === speaker.id || listener.id === getPlayerId()) return;
    const lSnap = typeof createBlindMatchSnapshot === "function"
      ? createBlindMatchSnapshot(listener, { module: "speech_influence" })
      : null;
    const listenerEffRole = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(listener) : listener.role;
    const claimedKeyNow = speechMeta.claimRole || (speechMeta.claimSeer ? "seer" : null);
    // Each God/Elder role is unique (1 per match): if listener holds it & listener.id !== speaker.id, speaker is provably lying without peeking at speaker.role!
    if (claimedKeyNow && (claimedKeyNow === "seer" || claimedKeyNow === "witch" || claimedKeyNow === "hunter" || claimedKeyNow === "guard" || claimedKeyNow === "elder") && listenerEffRole === claimedKeyNow) {
      listener.suspicionMap[speaker.id] = 100;
    }
    // v10.0 7-Dimension Persona Cognitive Modifiers (strictly Blind-View zero-leak!)
    const pMods = typeof getPersonaSuspicionModifiers === "function"
      ? getPersonaSuspicionModifiers(listener)
      : {
          credulity: listener.deductionStyle === "gullible" ? 1.45 : (listener.deductionStyle === "skeptical" ? 0.55 : 1.0),
          grudgeBonus: 7,
          toxicScale: 1.0,
          skepticalSlipBonus: listener.deductionStyle === "skeptical" ? 14 : 0
        };
    // Good AIs detect divisive/toxic wolf slips and raise suspicion scaled by persona harmonySensitivity!
    if (listener.team === "good" && speechMeta.hasToxicSlip) {
      const scaledToxic = Math.round(toxicPenalty * pMods.toxicScale);
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + scaledToxic, 5, 96);
    }
    // Seats explicitly placed into the speaker's wolf pit raise caution scaled by persona grudgeMemory!
    if (listener.team === "good" && !speechMeta.claimSeer && (speechMeta.accuseId === listener.id || extraWolfPits.indexOf(listener.id) !== -1)) {
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + pMods.grudgeBonus, 5, 96);
    }
    // Cognitive archetype weighting: high-credulity personas trust claims easily; analytical personas verify critically!
    const styleMul = pMods.credulity * diffCredMul;
    if (listener.team === "good" && pMods.skepticalSlipBonus > 0 && speechMeta.claimSeer && speechMeta.hasToxicSlip) {
      listener.suspicionMap[speaker.id] = clamp((listener.suspicionMap[speaker.id] || 50) + pMods.skepticalSlipBonus, 5, 96);
    }
    if ((listener.suspicionMap[speaker.id] || 50) >= 95) return;

    const accBlindObj = (speechMeta.accuseId && lSnap) ? lSnap.getSeat(speechMeta.accuseId) : null;
    const isWitchSaved = (listener.role === "witch" && listener.savedSeatId === speechMeta.accuseId);
    const wolfProtectsMate = Boolean(listener.role === "wolf" && accBlindObj && accBlindObj.isWolfMate);
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
      const wpObj = lSnap ? lSnap.getSeat(wpId) : getSeat(wpId);
      if (!wpObj || !wpObj.alive) return;
      if (listener.role === "witch" && listener.savedSeatId === wpId) return;
      if (listener.role === "wolf" && wpObj.isWolfMate) return;
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
