/**
 * v9.0 零洩漏反作弊資訊隔離防火牆（Epistemic Blind-View Firewall）
 *
 * 設計原則：
 * 1. 每位 AI 代理人（發言、公投、夜晚行動、警長競選與移交、獵人開槍、遺言、外部 LLM 提示詞）
 *    僅能讀取經由 createBlindMatchSnapshot(viewerSeat, opts) 投影出的「盲視快照（Blind View）」。
 * 2. 嚴格資訊邊界（Zero Hidden-Info Leaks）：
 *    - 絕不暴露其他人的底牌（role / team / isElder / isWolfKing / fakeSeer）。
 *    - 絕不暴露其他人的私密狀態（checkedHistory / savedSeatId / purifiedSeatId / suspicionMap / ironFollowPlayer）。
 *    - 絕不暴露未揭露的心虛脈搏（microPulse 僅於 microPulseRevealed 或該席 sweatExposed 時可見）。
 *    - 絕不暴露底層上帝資料（nightArchive / nightState / playerKnownRoles / wolfGodMarks / 秘密系統日誌）。
 *    - 絕不透過玩家私密矛盾提示（player_private contradiction）側漏玩家底牌或驗人結果給 AI。
 * 3. 合法有限視野（嚴守狼人殺規則）：
 *    - 酸民狼僅知「誰是狼同伴（isWolfMate / knownTeam）」，但絕對不知道好人陣營中誰是真神職或真書院生。
 *    - 明心觀察員僅知自己親查（checkedHistory）過對象的陣營（wolf / good）。
 *    - 滴水奉茶師僅知自己親救（savedSeatId）對象為銀水，且僅於 NIGHT_WITCH 且尚有暖心茶時得知當夜遇襲席位。
 *    - 護心守衛僅知自己上一晚守護的目標（lastGuardTargetId）。
 * 4. 執行期 Proxy 陷阱與 LLM Prompt 掃描守衛：
 *    - 任何越權存取私有欄位都會被 antiCheatMonitor 攔截並記錄（嚴格測試模式下立即拋錯）。
 */
"use strict";

const BLIND_FORBIDDEN_OTHER_FIELDS = Object.freeze({
  role: true,
  team: true,
  isElder: true,
  isWolfKing: true,
  fakeSeer: true,
  fakeCheckedIds: true,
  checkedHistory: true,
  savedSeatId: true,
  purifiedSeatId: true,
  suspicionMap: true,
  ironFollowPlayer: true,
  witchAnnouncedSave: true,
  hunterAnnounced: true,
  guardAnnounced: true,
  elderAnnounced: true
});

const antiCheatMonitor = {
  enabled: true,
  strictThrow: false,
  stats: {
    blindViewsIssued: 0,
    decisionsAudited: 0,
    promptAuditsPassed: 0,
    promptAuditsBlocked: 0,
    violationsBlocked: 0,
    byModule: {}
  },
  recentEvents: [],
  maxEvents: 24,

  resetMatch: function () {
    this.stats = {
      blindViewsIssued: 0,
      decisionsAudited: 0,
      promptAuditsPassed: 0,
      promptAuditsBlocked: 0,
      violationsBlocked: 0,
      byModule: {}
    };
    this.recentEvents = [];
  },

  _nowTimeStr: function () {
    const d = new Date();
    const pad = function (n) { return n < 10 ? ("0" + n) : String(n); };
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  },

  recordDecision: function (moduleName, viewerId, detail) {
    if (!this.enabled) return;
    const mod = String(moduleName || "unknown");
    this.stats.decisionsAudited += 1;
    this.stats.byModule[mod] = (this.stats.byModule[mod] || 0) + 1;
    this.recentEvents.unshift({
      time: this._nowTimeStr(),
      module: mod,
      viewerId: viewerId || 0,
      ok: true,
      detail: String(detail || "盲視快照隔離通過")
    });
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.length = this.maxEvents;
    }
  },

  recordViolation: function (viewerId, targetId, prop, moduleName) {
    this.stats.violationsBlocked += 1;
    const msg = "ANTI_CHEAT_VIOLATION[" + (moduleName || "blind_view") + "]: viewer #" + viewerId +
      " attempted illegal read of ." + String(prop) + " on seat #" + targetId;
    this.recentEvents.unshift({
      time: this._nowTimeStr(),
      module: String(moduleName || "blind_view"),
      viewerId: viewerId || 0,
      ok: false,
      detail: msg
    });
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.length = this.maxEvents;
    }
    if (typeof orchestrator !== "undefined" && typeof orchestrator.recordTrace === "function") {
      orchestrator.recordTrace({
        agent: "AntiCheatFirewall",
        tier: "ProxyGuard",
        ms: 0,
        compliance: false,
        summary: msg
      });
    }
    if (this.strictThrow) {
      throw new Error(msg);
    }
    return undefined;
  },

  getSummary: function () {
    return {
      enabled: this.enabled,
      strictThrow: this.strictThrow,
      blindViewsIssued: this.stats.blindViewsIssued,
      decisionsAudited: this.stats.decisionsAudited,
      promptAuditsPassed: this.stats.promptAuditsPassed,
      promptAuditsBlocked: this.stats.promptAuditsBlocked,
      violationsBlocked: this.stats.violationsBlocked,
      byModule: Object.assign({}, this.stats.byModule),
      recentEvents: this.recentEvents.slice(0, 10)
    };
  }
};

function _cloneCheckedHistory(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(function (c) {
    return { day: c.day, targetId: c.targetId, isWolf: Boolean(c.isWolf) };
  });
}

function createBlindSeatView(viewerSeat, rawSeat, opts) {
  if (!rawSeat) return null;
  const o = opts || {};
  const m = o.match || (typeof state !== "undefined" ? state.match : null) || {};
  const pid = typeof o.playerId === "number"
    ? o.playerId
    : (typeof getPlayerId === "function" ? getPlayerId() : (m.playerSeatId || 1));
  const viewerId = viewerSeat ? viewerSeat.id : 0;
  const isSelf = Boolean(viewerSeat && rawSeat.id === viewerId);
  const viewerIsWolf = Boolean(viewerSeat && viewerSeat.role === "wolf");
  const viewerIsSeer = Boolean(viewerSeat && viewerSeat.role === "seer");
  const viewerIsWitch = Boolean(viewerSeat && viewerSeat.role === "witch");
  const viewerIsGuard = Boolean(viewerSeat && viewerSeat.role === "guard");
  const viewerIsPlayer = Boolean(viewerSeat && viewerId === pid);
  const pulsePublic = Boolean(m.microPulseRevealed || rawSeat.sweatExposed);

  // Strictly public observable fields (identical for every player on the table)
  const view = {
    id: rawSeat.id,
    name: rawSeat.name,
    trait: rawSeat.trait,
    deductionStyle: rawSeat.deductionStyle || "balanced",
    color: rawSeat.color,
    alive: Boolean(rawSeat.alive),
    outReason: rawSeat.outReason || "",
    claimedRole: rawSeat.claimedRole || null,
    voteDisabled: Boolean(rawSeat.voteDisabled),
    trustShield: Boolean(rawSeat.trustShield),
    sweatExposed: Boolean(rawSeat.sweatExposed),
    publicVoteIntent: rawSeat.publicVoteIntent || null,
    isSelf: isSelf,
    isPlayer: rawSeat.id === pid,
    microPulse: pulsePublic ? rawSeat.microPulse : null,
    // Legal relationship fields derived strictly from viewerSeat's authorized knowledge
    isWolfMate: false,
    knownTeam: null,
    verifiedCheck: null,
    isSilverWater: false,
    isPurifiedByMe: false,
    wasLastGuardedByMe: false,
    playerKnownRole: null
  };

  if (isSelf) {
    const effRoleKey = (typeof getSeatEffectiveRoleKey === "function")
      ? getSeatEffectiveRoleKey(rawSeat)
      : (rawSeat.isWolfKing ? "wolf_king" : (rawSeat.isElder ? "elder" : rawSeat.role));
    view.role = rawSeat.role;
    view.team = rawSeat.team;
    view.effectiveRoleKey = effRoleKey;
    view.isElder = Boolean(rawSeat.isElder);
    view.isWolfKing = Boolean(rawSeat.isWolfKing);
    view.elderShieldUsed = Boolean(rawSeat.elderShieldUsed);
    view.fakeSeer = Boolean(rawSeat.fakeSeer);
    view.fakeCheckedIds = Array.isArray(rawSeat.fakeCheckedIds) ? rawSeat.fakeCheckedIds.slice() : [];
    view.checkedHistory = _cloneCheckedHistory(rawSeat.checkedHistory);
    view.savedSeatId = rawSeat.savedSeatId || null;
    view.purifiedSeatId = rawSeat.purifiedSeatId || null;
    view.witchAnnouncedSave = Boolean(rawSeat.witchAnnouncedSave);
    view.hunterAnnounced = Boolean(rawSeat.hunterAnnounced);
    view.guardAnnounced = Boolean(rawSeat.guardAnnounced);
    view.elderAnnounced = Boolean(rawSeat.elderAnnounced);
    view.ironFollowPlayer = Boolean(rawSeat.ironFollowPlayer);
    view.suspicionMap = Object.assign({}, rawSeat.suspicionMap || {});
    view.knownTeam = rawSeat.team;
    view.isWolfMate = false;
    view.microPulse = rawSeat.microPulse;
  } else {
    if (viewerIsWolf) {
      const targetIsWolf = rawSeat.role === "wolf";
      view.isWolfMate = targetIsWolf;
      view.knownTeam = targetIsWolf ? "wolf" : "good";
    }
    if (viewerIsSeer && Array.isArray(viewerSeat.checkedHistory)) {
      const hit = viewerSeat.checkedHistory.slice().reverse().find(function (c) { return c && c.targetId === rawSeat.id; });
      if (hit) {
        view.verifiedCheck = { day: hit.day, targetId: hit.targetId, isWolf: Boolean(hit.isWolf) };
        view.knownTeam = hit.isWolf ? "wolf" : "good";
      }
    }
    if (viewerIsWitch) {
      if (viewerSeat.savedSeatId && viewerSeat.savedSeatId === rawSeat.id) {
        view.isSilverWater = true;
        view.knownTeam = "good";
      }
      if (viewerSeat.purifiedSeatId && viewerSeat.purifiedSeatId === rawSeat.id) {
        view.isPurifiedByMe = true;
      }
    }
    if (viewerIsGuard && m.lastGuardTargetId && m.lastGuardTargetId === rawSeat.id) {
      view.wasLastGuardedByMe = true;
    }
    if (viewerIsPlayer && m.playerKnownRoles && m.playerKnownRoles[rawSeat.id]) {
      view.playerKnownRole = m.playerKnownRoles[rawSeat.id];
      if (view.playerKnownRole === "wolf") view.knownTeam = "wolf";
      else if (view.playerKnownRole === "good_verified") view.knownTeam = "good";
    }
  }

  Object.freeze(view);
  if (typeof Proxy !== "function") return view;

  const moduleTag = o.module || "blind_view";
  return new Proxy(view, {
    get: function (target, prop, receiver) {
      if (typeof prop === "string" && !isSelf) {
        if (BLIND_FORBIDDEN_OTHER_FIELDS[prop]) {
          return antiCheatMonitor.recordViolation(viewerId, rawSeat.id, prop, moduleTag);
        }
        if (prop === "microPulse" && !pulsePublic) {
          return antiCheatMonitor.recordViolation(viewerId, rawSeat.id, "microPulse(unrevealed)", moduleTag);
        }
      }
      return Reflect.get(target, prop, receiver);
    },
    set: function (_target, prop) {
      return antiCheatMonitor.recordViolation(viewerId, rawSeat.id, "WRITE:" + String(prop), moduleTag) || false;
    }
  });
}

function _sanitizeSpeechEventForViewer(ev, viewerIsPlayer) {
  if (!ev) return null;
  const keepContra = Boolean(ev.contradiction && (viewerIsPlayer || ev.contradiction.isPublic !== false));
  return Object.freeze({
    day: ev.day,
    turnOrderIndex: ev.turnOrderIndex,
    speakerId: ev.speakerId,
    speakerName: ev.speakerName,
    claimRole: ev.claimRole || null,
    accuseId: ev.accuseId || null,
    vouchId: ev.vouchId || null,
    wolfPits: Array.isArray(ev.wolfPits) ? ev.wolfPits.slice() : [],
    goodPits: Array.isArray(ev.goodPits) ? ev.goodPits.slice() : [],
    standWithSeerId: ev.standWithSeerId || null,
    checkedWolfId: ev.checkedWolfId || null,
    checkedGoodId: ev.checkedGoodId || null,
    hasToxicSlip: Boolean(ev.hasToxicSlip),
    isLastWord: Boolean(ev.isLastWord),
    contradiction: keepContra ? Object.assign({}, ev.contradiction) : null,
    rawText: ev.rawText || ""
  });
}

function createBlindMatchSnapshot(viewerSeat, opts) {
  const o = opts || {};
  const m = o.match || (typeof state !== "undefined" ? state.match : null);
  const moduleTag = o.module || "blind_snapshot";
  antiCheatMonitor.stats.blindViewsIssued += 1;

  if (!m || !m.started) {
    return {
      started: false,
      self: null,
      seats: [],
      aliveSeats: [],
      aliveOthers: [],
      getSeat: function () { return null; },
      daySpeechEvents: [],
      allSpeechEvents: [],
      detectedContradictions: [],
      publicLogs: [],
      voteHistory: [],
      sheriffVoteRecord: null,
      getObservableHeatOnSeat: function () { return 40; }
    };
  }

  const pid = typeof o.playerId === "number"
    ? o.playerId
    : (typeof getPlayerId === "function" ? getPlayerId() : (m.playerSeatId || 1));
  const viewerId = viewerSeat ? viewerSeat.id : 0;
  const viewerIsPlayer = Boolean(viewerSeat && viewerId === pid);
  const viewerIsWolf = Boolean(viewerSeat && viewerSeat.role === "wolf");
  const viewerIsWitch = Boolean(viewerSeat && viewerSeat.role === "witch");
  const viewerIsGuard = Boolean(viewerSeat && viewerSeat.role === "guard");

  const seatMap = {};
  const seats = (m.seats || []).map(function (raw) {
    const bv = createBlindSeatView(viewerSeat, raw, { match: m, playerId: pid, module: moduleTag });
    seatMap[raw.id] = bv;
    return bv;
  });
  const selfView = viewerSeat
    ? createBlindSeatView(viewerSeat, viewerSeat, { match: m, playerId: pid, module: moduleTag })
    : null;
  if (selfView && viewerId) seatMap[viewerId] = selfView;
  const aliveSeats = seats.filter(function (s) { return s && s.alive; });
  const aliveOthers = aliveSeats.filter(function (s) { return !viewerId || s.id !== viewerId; });
  const knownWolfMates = viewerIsWolf
    ? seats.filter(function (s) { return s.id !== viewerId && s.isWolfMate; })
    : [];

  const daySpeechEvents = (m.daySpeechEvents || []).map(function (ev) {
    return _sanitizeSpeechEventForViewer(ev, viewerIsPlayer);
  }).filter(Boolean);

  const allSpeechEvents = (m.allSpeechEvents || []).map(function (ev) {
    return _sanitizeSpeechEventForViewer(ev, viewerIsPlayer);
  }).filter(Boolean);

  const detectedContradictions = (m.detectedContradictions || []).filter(function (c) {
    return c && (viewerIsPlayer || c.isPublic !== false);
  }).map(function (c) { return Object.assign({}, c); });

  const publicLogs = (m.logs || []).filter(function (l) {
    return l && l.kind !== "secret";
  }).map(function (l) {
    return {
      day: l.day,
      kind: l.kind,
      speakerId: l.speakerId || null,
      title: l.title || "",
      subBadge: l.subBadge || "",
      text: l.text || ""
    };
  });

  const voteHistory = (m.voteHistory || []).map(function (vh) {
    return {
      day: vh.day,
      ballots: (vh.ballots || []).map(function (b) {
        return { voterId: b.voterId, targetId: b.targetId || null, weight: b.weight || 0 };
      }),
      tallies: Object.assign({}, vh.tallies || {}),
      outId: vh.outId || null
    };
  });

  const sheriffVoteRecord = m.sheriffVoteRecord
    ? Object.freeze({
        day: m.sheriffVoteRecord.day || 1,
        kind: "sheriff",
        candidateIds: Array.isArray(m.sheriffVoteRecord.candidateIds) ? m.sheriffVoteRecord.candidateIds.slice() : [],
        withdrawnIds: Array.isArray(m.sheriffVoteRecord.withdrawnIds) ? m.sheriffVoteRecord.withdrawnIds.slice() : [],
        seerClaimIds: Array.isArray(m.sheriffVoteRecord.seerClaimIds) ? m.sheriffVoteRecord.seerClaimIds.slice() : [],
        winnerId: m.sheriffVoteRecord.winnerId || null,
        ballots: Array.isArray(m.sheriffVoteRecord.ballots)
          ? m.sheriffVoteRecord.ballots.map(function (b) {
              return { voterId: b.voterId, targetId: b.targetId || null, weight: b.weight || 0 };
            })
          : [],
        tallies: Object.assign({}, m.sheriffVoteRecord.tallies || {})
      })
    : null;

  const _freezeBadgeFlow = function (bf) {
    if (!bf || !bf.ownerId) return null;
    return Object.freeze({
      ownerId: bf.ownerId,
      dayDeclared: bf.dayDeclared || 1,
      firstTargetId: bf.firstTargetId || null,
      secondTargetId: bf.secondTargetId || null,
      mode: bf.secondTargetId ? "dual" : "single",
      claimedRole: bf.claimedRole || null,
      updatedFrom: bf.updatedFrom || "election"
    });
  };
  const sheriffBadgeFlow = _freezeBadgeFlow(m.sheriffBadgeFlow);
  const sheriffBadgeFlowsBySeat = {};
  if (m.sheriffBadgeFlowsBySeat && typeof m.sheriffBadgeFlowsBySeat === "object") {
    Object.keys(m.sheriffBadgeFlowsBySeat).forEach(function (k) {
      const fz = _freezeBadgeFlow(m.sheriffBadgeFlowsBySeat[k]);
      if (fz) sheriffBadgeFlowsBySeat[k] = fz;
    });
  }
  const badgeFlowSignals = Array.isArray(m.badgeFlowSignals)
    ? m.badgeFlowSignals.map(function (sig) {
        return Object.freeze({
          day: sig.day || 1,
          ownerId: sig.ownerId || null,
          transferTargetId: sig.transferTargetId || null,
          firstTargetId: sig.firstTargetId || null,
          secondTargetId: sig.secondTargetId || null,
          kind: sig.kind || "external_transfer",
          verifiedGoodIds: Array.isArray(sig.verifiedGoodIds) ? sig.verifiedGoodIds.slice() : [],
          suspectedWolfIds: Array.isArray(sig.suspectedWolfIds) ? sig.suspectedWolfIds.slice() : [],
          headline: sig.headline || "",
          detail: sig.detail || ""
        });
      })
    : [];

  // Legal role-gated private match fields
  const rawPlayerSeat = (m.seats || []).find(function (s) { return s.id === pid; }) || null;
  const wolfPackHasPlayer = Boolean(viewerIsWolf && rawPlayerSeat && rawPlayerSeat.role === "wolf");
  const legalWolfTactic = wolfPackHasPlayer ? (m.wolfTactic || "auto") : null;
  const legalLastGuardTargetId = viewerIsGuard ? (m.lastGuardTargetId || null) : null;
  const phaseNow = o.phase || m.phase || "LOBBY";
  const legalWitchPotions = viewerIsWitch && m.witchPotions
    ? { heal: Boolean(m.witchPotions.heal), purify: Boolean(m.witchPotions.purify) }
    : null;
  const legalNightWolfVictimId = (viewerIsWitch && phaseNow === "NIGHT_WITCH" && m.witchPotions && m.witchPotions.heal && m.nightState)
    ? (m.nightState.wolfTarget || null)
    : null;

  const hasGuardMode = Boolean(
    m.totalSeats >= 12 ||
    (m.totalSeats >= 8 && typeof state !== "undefined" && state.guardMode)
  );

  // Publicly observable table heat on any seat (ZERO mind-reading of other seats' suspicionMap!)
  const getObservableHeatOnSeat = function (targetSeatId) {
    if (!targetSeatId) return 40;
    let heat = 40;
    daySpeechEvents.forEach(function (ev) {
      if (!ev || ev.speakerId === targetSeatId) return;
      if (ev.checkedWolfId === targetSeatId) heat += 24;
      else if (ev.accuseId === targetSeatId) heat += 14;
      else if (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(targetSeatId) !== -1) heat += 10;
      else if (ev.vouchId === targetSeatId) heat -= 6;
    });
    const lastVh = voteHistory.length > 0 ? voteHistory[voteHistory.length - 1] : null;
    if (lastVh && lastVh.tallies && lastVh.tallies[targetSeatId]) {
      heat += Math.round(lastVh.tallies[targetSeatId] * 10);
    }
    const selfPublicContra = detectedContradictions.some(function (c) {
      return c.day === m.day && c.speakerId === targetSeatId;
    });
    if (selfPublicContra) heat += 12;
    return typeof clamp === "function" ? clamp(heat, 20, 98) : Math.max(20, Math.min(98, heat));
  };

  return Object.freeze({
    started: true,
    module: moduleTag,
    day: m.day || 1,
    phase: phaseNow,
    totalSeats: m.totalSeats || seats.length,
    playerSeatId: pid,
    aiDifficulty: (typeof state !== "undefined" && state.aiDifficulty) ? state.aiDifficulty : (m.aiDifficulty || "normal"),
    harmonyScore: typeof m.harmonyScore === "number" ? m.harmonyScore : 72,
    sheriffSeatId: m.sheriffSeatId || null,
    sheriffElectionPending: Boolean(m.sheriffElectionPending),
    hasGuardMode: hasGuardMode,
    pkCandidates: Array.isArray(m.pkCandidates) ? m.pkCandidates.slice() : null,
    pkActive: Boolean(Array.isArray(m.pkCandidates) && m.pkCandidates.length >= 2),
    convenienceRallyTargetId: m.convenienceRallyTargetId || null,
    lastNightCasualties: Array.isArray(m.lastNightCasualties) ? m.lastNightCasualties.slice() : [],
    peaceNights: Array.isArray(m.peaceNights) ? m.peaceNights.slice() : [],
    speechQueue: Array.isArray(m.speechQueue) ? m.speechQueue.slice() : [],
    firstNightIntel: m.firstNightIntel ? Object.assign({}, m.firstNightIntel) : null,
    fourGJoySuspects: Array.isArray(m.fourGJoySuspects) ? m.fourGJoySuspects.slice() : [],
    fourGHopePair: Array.isArray(m.fourGHopePair) ? m.fourGHopePair.slice() : null,
    activeDirectorEvent: m.activeDirectorEvent ? Object.assign({}, m.activeDirectorEvent) : null,
    microPulseRevealed: Boolean(m.microPulseRevealed),
    // Viewer-authorized private match state ONLY
    wolfTactic: legalWolfTactic,
    lastGuardTargetId: legalLastGuardTargetId,
    witchPotions: legalWitchPotions,
    nightWolfVictimId: legalNightWolfVictimId,
    // Blind-projected seat collections
    self: selfView,
    seats: seats,
    aliveSeats: aliveSeats,
    aliveOthers: aliveOthers,
    knownWolfMates: knownWolfMates,
    getSeat: function (id) { return seatMap[id] || null; },
    // Sanitized public logs & events
    daySpeechEvents: daySpeechEvents,
    allSpeechEvents: allSpeechEvents,
    detectedContradictions: detectedContradictions,
    publicLogs: publicLogs,
    voteHistory: voteHistory,
    sheriffVoteRecord: sheriffVoteRecord,
    sheriffBadgeFlow: sheriffBadgeFlow,
    sheriffBadgeFlowsBySeat: Object.freeze(sheriffBadgeFlowsBySeat),
    badgeFlowSignals: badgeFlowSignals,
    getObservableHeatOnSeat: getObservableHeatOnSeat
  });
}

/**
 * Outbound LLM Prompt Leak Auditor
 * Verifies BEFORE calling Gemini / Ollama that:
 * 1. The prompt's secretIntel section NEVER reveals any seat ID outside the viewer's legally authorized set.
 * 2. The prompt NEVER leaks raw internal god-view tokens (nightArchive, playerKnownRoles, wolfGodMarks, suspicionMap).
 */
function auditLlmPromptLeak(blindSnap, secretIntelText, fullPromptText) {
  if (!blindSnap || !blindSnap.self) {
    return { ok: true, blockedReasons: [] };
  }
  const self = blindSnap.self;
  const allowedSecretSeatIds = {};
  allowedSecretSeatIds[self.id] = true;

  if (self.role === "wolf") {
    (blindSnap.knownWolfMates || []).forEach(function (mt) { allowedSecretSeatIds[mt.id] = true; });
  } else if (self.role === "seer") {
    (self.checkedHistory || []).forEach(function (c) { allowedSecretSeatIds[c.targetId] = true; });
  } else if (self.role === "witch") {
    if (self.savedSeatId) allowedSecretSeatIds[self.savedSeatId] = true;
    if (self.purifiedSeatId) allowedSecretSeatIds[self.purifiedSeatId] = true;
    if (blindSnap.nightWolfVictimId) allowedSecretSeatIds[blindSnap.nightWolfVictimId] = true;
  } else if (self.role === "guard") {
    if (blindSnap.lastGuardTargetId) allowedSecretSeatIds[blindSnap.lastGuardTargetId] = true;
  }

  const reasons = [];
  const secStr = String(secretIntelText || "");
  const mentionedInSecret = secStr.match(/(?:1[0-2]|0?[1-9])\s*號/g) || [];
  mentionedInSecret.forEach(function (tok) {
    const sid = parseInt(tok, 10);
    if (sid && !allowedSecretSeatIds[sid]) {
      reasons.push("secretIntel_unauthorized_seat:#" + sid);
    }
  });

  // Ensure Wolf secretIntel never leaks exact Good God roles (e.g. "03號明心觀察員" or "04號滴水奉茶師")
  if (self.role === "wolf" && /明心觀察員|滴水奉茶師|直心糾察長|護心守衛|清心長老/.test(secStr)) {
    reasons.push("wolf_secretIntel_leaked_good_god_role");
  }

  const fullStr = String(fullPromptText || "");
  if (/nightArchive|playerKnownRoles|wolfGodMarks|suspicionMap|上帝視角逐日故事軸/.test(fullStr)) {
    reasons.push("fullPrompt_contains_internal_godview_key");
  }

  if (reasons.length > 0) {
    antiCheatMonitor.stats.promptAuditsBlocked += 1;
    antiCheatMonitor.recordViolation(self.id, 0, reasons.join(","), "llm_prompt_audit");
    return { ok: false, blockedReasons: reasons };
  }

  antiCheatMonitor.stats.promptAuditsPassed += 1;
  antiCheatMonitor.recordDecision("llm_prompt", self.id, "Prompt 零洩漏稽核通過");
  return { ok: true, blockedReasons: [] };
}
