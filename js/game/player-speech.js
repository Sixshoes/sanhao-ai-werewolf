/**
 * 玩家發言卡牌面板、三好語意分析與嘴砲轉好話暴擊
 */
"use strict";

// ==================== PLAYER CARD-SPEECH & SALTY-TO-KIND COMBO ====================
function analyzeThreeGoodSpeech(rawText) {
  const text = (rawText || "").trim();
  if (!text) {
    return {
      kindScore: 82, heartScore: 78, deedScore: 74,
      toxicHits: [], seatMentions: [],
      vouchTargets: [], accuseTargets: [],
      primaryVouchId: null, primaryAccuseId: null,
      badge: "點卡牌直接講", isToxic: false
    };
  }

  let toxicPenalty = 0;
  const toxicHits = [];
  TOXIC_PATTERNS.forEach(function (pat) {
    if (text.indexOf(pat.word) !== -1) {
      toxicPenalty += pat.weight;
      toxicHits.push(pat.word);
    }
  });

  let kindBonus = state.match.rewriteCritReady ? 18 : 0;
  KIND_PATTERNS.forEach(function (kw) {
    if (text.indexOf(kw) !== -1) kindBonus += 7;
  });

  const maxSeats = (state.match && state.match.totalSeats) ? state.match.totalSeats : 12;
  const seatMatches = text.match(/(?:1[0-2]|0?[1-9])\s*號/g) || [];
  const seatNums = [];
  seatMatches.forEach(function (m) {
    const n = parseInt(m, 10);
    if (n >= 1 && n <= maxSeats && seatNums.indexOf(n) === -1) seatNums.push(n);
  });

  // Clause-level Multi-Target Semantics: supports vouching A and accusing B in the same speech!
  const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const vouchMap = {};
  const accuseMap = {};
  const clauses = text.split(/[，。！？；;、\n]+/);
  let lastStance = null;
  clauses.forEach(function (clause) {
    const cRaw = clause.trim();
    if (!cRaw) return;
    const cCleanWolf = cRaw.replace(/(?:不像|不是|非|絕不是|絕非).{0,2}(?:酸民)?狼/g, "好人");
    const cClean = cCleanWolf.replace(/(?:不是|不像|絕非).{0,2}(?:好人|好夥伴|夥伴)/g, "可疑");
    const hasPosWord = /好人|信任|救活|保護|護回|守護|相信|金水|清白|誠懇|沒問題|正氣|善良|放心/.test(cClean);
    const hasNegWord = /懷疑|酸民狼|是狼|查殺|投出去|投他|投給|出他|請離|矛盾|假冒|冒充|誤導|破綻|重點檢視|重點留意|帶風向|可疑|問題|小心|盯緊|別信|栽贓|最像狼/.test(cClean);
    let clauseStance = lastStance;
    if (hasNegWord && !hasPosWord) clauseStance = "accuse";
    else if (hasPosWord && !hasNegWord) clauseStance = "vouch";
    else if (hasNegWord && hasPosWord) {
      clauseStance = /懷疑|酸民狼|是狼|查殺|投出去|投他|投給|破綻|誤導|可疑|假冒|冒充/.test(cClean) ? "accuse" : "vouch";
    }
    if (clauseStance) lastStance = clauseStance;

    const cSeats = cRaw.match(/(?:1[0-2]|0?[1-9])\s*號/g) || [];
    cSeats.forEach(function (m) {
      const n = parseInt(m, 10);
      if (n >= 1 && n <= maxSeats && n !== pidNow) {
        if (clauseStance === "vouch") {
          delete accuseMap[n];
          vouchMap[n] = true;
        } else if (clauseStance === "accuse") {
          delete vouchMap[n];
          accuseMap[n] = true;
        }
      }
    });
  });
  const vouchTargets = Object.keys(vouchMap).map(function (k) { return parseInt(k, 10); });
  const accuseTargets = Object.keys(accuseMap).map(function (k) { return parseInt(k, 10); });

  const kindScore = clamp(78 + kindBonus - toxicPenalty * 1.4, 8, 99);
  const heartScore = clamp(75 + (seatNums.length > 0 ? 12 : 0) + (kindBonus > 0 ? 8 : 0) - toxicPenalty, 10, 99);
  const deedScore = clamp(72 + (seatNums.length > 0 ? 18 : 0) - Math.floor(toxicPenalty * 0.8), 12, 99);

  const isToxic = toxicHits.length > 0;
  let badge = "溫和有理";
  if (isToxic) badge = "酸言警告！快按左下 AI 轉好話！";
  else if (state.match.rewriteCritReady) badge = "好話暴擊 ×1.5 就緒！";
  else if (kindScore >= 86) badge = "高說服力好話！";

  return {
    kindScore: Math.round(kindScore),
    heartScore: Math.round(heartScore),
    deedScore: Math.round(deedScore),
    toxicHits: toxicHits,
    seatMentions: seatNums,
    vouchTargets: vouchTargets,
    accuseTargets: accuseTargets,
    primaryVouchId: vouchTargets[0] || null,
    primaryAccuseId: accuseTargets[0] || null,
    badge: badge,
    isToxic: isToxic
  };
}

async function rewriteToThreeGoodness(rawText) {
  if (typeof orchestrator !== "undefined" && typeof orchestrator.dispatchAgent === "function") {
    const out = await orchestrator.dispatchAgent("ThreeGoodGuardianAgent", { rawText: rawText });
    if (out && out.text) return out.text;
  }
  const text = (rawText || "").trim();
  const analysis = analyzeThreeGoodSpeech(text);
  const targetNum = analysis.seatMentions.find(function (n) { return n !== getPlayerId(); }) || state.selectedSeatId || 2;
  const targetSeat = getSeat(targetNum);
  const targetLabel = targetSeat ? (targetSeat.id + "號" + targetSeat.name) : (targetNum + "號");

  if (state.geminiApiKey && text.length > 0) {
    const prompt = "把這句狼人殺發言保留號碼，改寫成55到80字之間、溫和有禮、具三好精神又有邏輯說服力的繁體中文口語推理（不用專業術語與表情符號，只輸出一段話）：" + text;
    const live = await callGeminiText(prompt);
    if (live) return live;
  }

  if (/信任|好人|保護|相信/.test(text) && !analysis.isToxic) {
    return "我想溫和跟大家分享觀察，剛剛仔細聽完 " + targetLabel + " 的發言，覺得他的邏輯前後一致而且態度很誠懇，建議好人夥伴這輪先相信他，不要投錯人了！";
  }
  return "大家先別急著動氣，我們心平氣和來比對線索：我發現 " + targetLabel + " 剛剛的說法跟場上局勢有些矛盾，想溫和請教他能不能多說明一點，這輪建議先留意 " + targetLabel + "。";
}

function getPlayerWolfPitCap() {
  const baseWolves = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
  return Math.max(3, baseWolves + 1);
}

function getWolfGodMarkDef(markKey) {
  const list = typeof WOLF_GOD_MARK_CYCLE !== "undefined" ? WOLF_GOD_MARK_CYCLE : [{ key: "", label: "", title: "" }];
  return list.find(function (m) { return m.key === (markKey || ""); }) || list[0];
}

function cycleWolfGodMark(seatId) {
  if (!state.match || !state.match.started) return;
  const player = getPlayerSeat();
  const seat = getSeat(seatId);
  if (!player || player.role !== "wolf" || !seat || !seat.alive || seat.role === "wolf") return;
  if (!state.match.wolfGodMarks) state.match.wolfGodMarks = {};
  const list = typeof WOLF_GOD_MARK_CYCLE !== "undefined" ? WOLF_GOD_MARK_CYCLE : [{ key: "", label: "" }];
  const cur = state.match.wolfGodMarks[seatId] || "";
  const idx = list.findIndex(function (m) { return m.key === cur; });
  const next = list[(idx + 1) % list.length];
  if (next.key) state.match.wolfGodMarks[seatId] = next.key;
  else delete state.match.wolfGodMarks[seatId];
  sound.tone(next.key ? 560 : 340, 0.06, "triangle", 0.045, 0);
  if (next.key) {
    spawnFx(seatId, "🔍 " + next.label, "#fbbf24");
  }
  renderPlayerPitBuilder();
  if (typeof renderSeatIntelPopover === "function") renderSeatIntelPopover();
}

function renderRoleTurnDashboard() {
  // Consolidated in v9.3: role abilities, check history & wolf mates already live permanently in bottom-left #cornerRoleTile!
  const dash = el("roleTurnDashboard");
  if (dash) {
    dash.classList.add("hidden");
    dash.innerHTML = "";
  }
}

function syncSpeechAdvancedToggleLabel(player) {
  const btn = el("btnToggleCustomSpeech");
  const drawer = el("speechAdvancedDrawer");
  if (!btn) return;
  const isWolf = Boolean(player && player.role === "wolf");
  const isOpen = Boolean(drawer && !drawer.classList.contains("hidden"));
  const d = (state.match && state.match.playerDraftPits) || { wolfIds: [], goodIds: [] };
  const markCnt = (d.wolfIds ? d.wolfIds.length : 0) + (d.goodIds ? d.goodIds.length : 0);
  const baseLbl = isWolf ? "🎭 佈局／獵神" : "🧩 盤坑／亮牌";
  const countTag = markCnt > 0 ? (" (" + markCnt + ")") : "";
  btn.textContent = baseLbl + countTag + (isOpen ? " ▴" : " ▾");
  btn.classList.toggle("is-active", isOpen);
}

function createEmptyPlayerDraftPits() {
  return { wolfIds: [], goodIds: [], claimRole: null, standSeerId: null, evidenceClueId: null, turnKey: "" };
}

function ensurePlayerDraftPits(seedIfNewTurn) {
  if (!state.match) return createEmptyPlayerDraftPits();
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  const wolfCap = getPlayerWolfPitCap();
  const pkTag = (typeof isPkVoteActive === "function" && isPkVoteActive()) ? "pk" : "reg";
  const spokenCount = (state.match.daySpeechEvents || []).filter(function (e) { return e.speakerId === pid; }).length;
  const turnKey = (state.match.day || 1) + ":" + pkTag + ":" + spokenCount;
  if (!state.match.playerDraftPits || state.match.playerDraftPits.turnKey !== turnKey) {
    const fresh = createEmptyPlayerDraftPits();
    fresh.turnKey = turnKey;
    if (seedIfNewTurn) {
      getAliveSeats().forEach(function (s) {
        if (s.id === pid) return;
        if (isWolfPlayer && s.role === "wolf") return;
        const mk = state.playerMarks ? state.playerMarks[s.id] : null;
        if (mk === "wolf" && fresh.wolfIds.length < wolfCap) fresh.wolfIds.push(s.id);
        else if (mk === "good") fresh.goodIds.push(s.id);
      });
    }
    state.match.playerDraftPits = fresh;
  } else {
    const d = state.match.playerDraftPits;
    d.wolfIds = (d.wolfIds || []).filter(function (id) {
      const s = getSeat(id);
      return Boolean(s && s.alive && id !== pid && !(isWolfPlayer && s.role === "wolf"));
    });
    d.goodIds = (d.goodIds || []).filter(function (id) {
      const s = getSeat(id);
      return Boolean(s && s.alive && id !== pid && d.wolfIds.indexOf(id) === -1 && !(isWolfPlayer && s.role === "wolf"));
    });
  }
  return state.match.playerDraftPits;
}

function composePlayerPitSpeechText() {
  if (!state.match) return "";
  const d = ensurePlayerDraftPits(false);
  const player = getPlayerSeat();
  const pid = getPlayerId();
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  const fmtList = function (ids) {
    return ids.map(function (id) {
      const s = getSeat(id);
      return fmtSeatNum(id) + "號" + (s ? s.name : "");
    }).join("、");
  };

  const parts = [];
  if (typeof isPkVoteActive === "function" && isPkVoteActive() && state.match.pkCandidates.indexOf(pid) !== -1) {
    parts.push("平票 PK 我再表水一次：");
  }

  if (d.claimRole && player) {
    if (d.claimRole === "seer") {
      if (player.role === "seer" && player.checkedHistory && player.checkedHistory.length > 0) {
        const histSummary = player.checkedHistory.map(function (c) {
          const cs = getSeat(c.targetId);
          return fmtSeatNum(c.targetId) + "號" + (cs ? cs.name : "") + "是" + (c.isWolf ? "酸民狼" : "好夥伴");
        }).join("、");
        parts.push("我是真正的明心觀察員！查驗紀錄：" + histSummary + "。");
      } else if (d.wolfIds.length > 0) {
        const w0 = getSeat(d.wolfIds[0]);
        parts.push("我才是這局真正的明心觀察員！昨晚查驗 " + fmtSeatNum(d.wolfIds[0]) + "號" + (w0 ? w0.name : "") + " 確定是酸民狼！");
      } else {
        parts.push("我才是這局真正的明心觀察員！");
      }
    } else if (d.claimRole === "witch") {
      const sv = player.savedSeatId ? getSeat(player.savedSeatId) : null;
      parts.push(sv && sv.alive
        ? ("我是滴水奉茶師，先前用暖心回甘茶護回了 " + fmtSeatNum(sv.id) + "號" + sv.name + "，他是鐵好人。")
        : "我是這局的滴水奉茶師，請大家配合好人邏輯穩穩出狼。");
    } else if (d.claimRole === "guard") {
      const lg = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
      parts.push(lg
        ? ("我是護心守衛！昨晚剛守護過 " + fmtSeatNum(lg.id) + "號" + lg.name + "，請奉茶師留意別撞車破盾。")
        : "我是護心守衛！每晚都會錯開位置防破盾。");
    } else if (d.claimRole === "hunter") {
      parts.push("我是直心糾察長！正氣共鳴在手，若遭誤投離席必帶走最可疑狼坑。");
    } else if (d.claimRole === "elder") {
      parts.push(player.elderShieldUsed
        ? "我是已亮牌的清心長老，雖無投票權但我全場視角最清澈，請好夥伴跟我一起理性歸票！"
        : "我是這局的清心長老，身上有首次免離席護盾替神職扛壓，請好夥伴放心對齊邏輯！");
    } else if (d.claimRole === "villager") {
      parts.push("我是認真聽發言的三好書院生，我本著存好心說好話幫大家理清好人坑與可疑位：");
    } else if (d.claimRole === "wolf_stealth") {
      parts.push("大家先別急著動氣，我是低調理性聽盤的好夥伴，我們心平氣和比對一下線索：");
    }
  }

  if (d.standSeerId) {
    const ss = getSeat(d.standSeerId);
    parts.push("雙觀察員對跳我站邊 " + fmtSeatNum(d.standSeerId) + "號" + (ss ? ss.name : "") + " 的視角！");
  }

  if (d.evidenceClueId) {
    const clue = (state.match.pinnedClues || []).find(function (c) { return c && c.id === d.evidenceClueId; });
    if (clue && clue.summary) {
      parts.push(clue.summary + " ");
    } else if (clue && clue.seatId) {
      parts.push("我直接點出 " + fmtSeatNum(clue.seatId) + "號 的前後矛盾破綻！");
    }
  }

  if (isWolfPlayer) {
    if (d.goodIds.length > 0) {
      parts.push("聽下來我覺得 " + fmtList(d.goodIds) + " 發言挺誠懇的，這輪我先放進好人視角力挺；");
    }
    if (d.wolfIds.length > 0) {
      parts.push("反觀 " + fmtList(d.wolfIds) + " 的說法矛盾很多，我認為最值得懷疑，建議大家今天集中檢視並優先投票給 " + fmtSeatNum(d.wolfIds[0]) + "號！");
    }
  } else {
    if (d.goodIds.length > 0) {
      parts.push("好人坑我先放 " + fmtList(d.goodIds) + (d.goodIds.length >= 3 ? (" 等 " + d.goodIds.length + " 位（立場較真誠）；") : "（立場較真誠）；"));
    }
    if (d.wolfIds.length > 0) {
      parts.push("狼坑目前點進 " + fmtList(d.wolfIds) + "，邏輯最讓人起疑，建議今天集中檢視並優先公投 " + fmtSeatNum(d.wolfIds[0]) + "號！");
    }
  }

  return parts.join("").trim();
}

function syncDraftSpeechToInput() {
  const composed = composePlayerPitSpeechText();
  const qIn = el("quickFreeInput");
  const pIn = el("playerSpeechInput");
  if (qIn) qIn.value = composed;
  if (pIn) pIn.value = composed;
  state.match.rewriteCritReady = false;
  const d = (state.match && state.match.playerDraftPits) || createEmptyPlayerDraftPits();
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  const btnSend = el("btnQuickFreeSend");
  if (btnSend) {
    const wLen = (d.wolfIds || []).length;
    const gLen = (d.goodIds || []).length;
    if (wLen || gLen) {
      const wTag = isWolfPlayer ? "甩" : "狼";
      const gTag = isWolfPlayer ? "保" : "好";
      btnSend.textContent = "陳詞 (" + (wLen ? (wLen + wTag) : "") + (wLen && gLen ? "·" : "") + (gLen ? (gLen + gTag) : "") + ")";
    } else {
      btnSend.textContent = "陳詞";
    }
  }
  if (typeof refreshQuickFreeInputHint === "function") refreshQuickFreeInputHint();
  if (typeof refreshLiveNlpUI === "function") refreshLiveNlpUI();
}

function togglePlayerDraftSeatPit(seatId) {
  if (!state.match || !state.match.started) return;
  const pid = getPlayerId();
  const player = getPlayerSeat();
  const seat = getSeat(seatId);
  if (!seat || !seat.alive || seatId === pid) return;
  if (player && player.role === "wolf" && seat.role === "wolf") {
    showToast("🐺 這是你的狼隊同伴，不需要點進甩鍋目標！", "warn");
    return;
  }
  const d = ensurePlayerDraftPits(false);
  const wolfCap = getPlayerWolfPitCap();
  const wIdx = d.wolfIds.indexOf(seatId);
  const gIdx = d.goodIds.indexOf(seatId);
  if (wIdx === -1 && gIdx === -1) {
    d.wolfIds.push(seatId);
    if (d.wolfIds.length > wolfCap) d.wolfIds.shift();
    sound.tone(420, 0.06, "triangle", 0.045, 0);
  } else if (wIdx !== -1) {
    d.wolfIds.splice(wIdx, 1);
    d.goodIds.push(seatId);
    // Good-pit is UNLIMITED — good players can vouch for as many good seats as needed!
    sound.tone(660, 0.06, "sine", 0.045, 0);
  } else {
    d.goodIds.splice(gIdx, 1);
    sound.tone(330, 0.05, "sine", 0.03, 0);
  }
  state.selectedSeatId = seatId;
  syncDraftSpeechToInput();
  renderPlayerPitBuilder();
}

function markRemainingSeatsGoodPit() {
  if (!state.match || !state.match.started) return;
  const pid = getPlayerId();
  const player = getPlayerSeat();
  if (!player || player.role === "wolf") return;
  const d = ensurePlayerDraftPits(false);
  getAliveSeats().forEach(function (s) {
    if (s.id === pid) return;
    if (d.wolfIds.indexOf(s.id) === -1 && d.goodIds.indexOf(s.id) === -1) {
      d.goodIds.push(s.id);
    }
  });
  sound.tone(720, 0.08, "sine", 0.05, 0);
  syncDraftSpeechToInput();
  renderPlayerPitBuilder();
}

function togglePlayerDraftRoleClaim(roleKey) {
  if (!state.match || !state.match.started) return;
  const d = ensurePlayerDraftPits(false);
  const pid = getPlayerId();
  const wolfCap = getPlayerWolfPitCap();
  d.claimRole = (d.claimRole === roleKey) ? null : roleKey;
  if (d.claimRole === "seer") {
    const p = getPlayerSeat();
    if (p && p.role === "seer" && p.checkedHistory && p.checkedHistory.length > 0) {
      p.checkedHistory.forEach(function (chk) {
        const cs = getSeat(chk.targetId);
        if (cs && cs.alive && cs.id !== pid) {
          if (chk.isWolf && d.wolfIds.indexOf(cs.id) === -1) {
            d.goodIds = d.goodIds.filter(function (id) { return id !== cs.id; });
            d.wolfIds.unshift(cs.id);
            if (d.wolfIds.length > wolfCap) d.wolfIds.pop();
          } else if (!chk.isWolf && d.goodIds.indexOf(cs.id) === -1) {
            d.wolfIds = d.wolfIds.filter(function (id) { return id !== cs.id; });
            d.goodIds.unshift(cs.id);
          }
        }
      });
    }
  } else if (d.claimRole === "witch") {
    const p = getPlayerSeat();
    if (p && p.role === "witch" && p.savedSeatId && p.savedSeatId !== pid) {
      const sv = getSeat(p.savedSeatId);
      if (sv && sv.alive && d.goodIds.indexOf(sv.id) === -1) {
        d.wolfIds = d.wolfIds.filter(function (id) { return id !== sv.id; });
        d.goodIds.unshift(sv.id);
      }
    }
  }
  sound.tone(620, 0.07, "triangle", 0.045, 0);
  syncDraftSpeechToInput();
  renderPlayerPitBuilder();
}

function togglePlayerDraftStandSeer(seerId, dualWorlds) {
  if (!state.match || !state.match.started) return;
  const d = ensurePlayerDraftPits(false);
  const pid = getPlayerId();
  const wolfCap = getPlayerWolfPitCap();
  d.standSeerId = (d.standSeerId === seerId) ? null : seerId;
  if (d.standSeerId && dualWorlds) {
    const w = (dualWorlds.worldA && dualWorlds.worldA.trustedSeer && dualWorlds.worldA.trustedSeer.id === seerId)
      ? dualWorlds.worldA
      : ((dualWorlds.worldB && dualWorlds.worldB.trustedSeer && dualWorlds.worldB.trustedSeer.id === seerId) ? dualWorlds.worldB : null);
    if (w) {
      const newGood = [];
      if (w.trustedSeer && w.trustedSeer.alive && w.trustedSeer.id !== pid) newGood.push(w.trustedSeer.id);
      d.goodIds = newGood;
      d.wolfIds = (w.wolfPits || [])
        .map(function (s) { return s && s.id; })
        .filter(function (id) { const s = getSeat(id); return Boolean(s && s.alive && id !== pid && newGood.indexOf(id) === -1); })
        .slice(0, wolfCap);
    }
  }
  sound.tone(580, 0.07, "triangle", 0.045, 0);
  syncDraftSpeechToInput();
  renderPlayerPitBuilder(null, dualWorlds);
}

function togglePlayerDraftEvidence(clue) {
  if (!state.match || !clue) return;
  const d = ensurePlayerDraftPits(false);
  const pid = getPlayerId();
  const wolfCap = getPlayerWolfPitCap();
  if (d.evidenceClueId === clue.id) {
    d.evidenceClueId = null;
    state.match.pendingEvidenceTargetId = null;
    state.match.pendingEvidenceClueId = null;
  } else {
    d.evidenceClueId = clue.id;
    state.match.pendingEvidenceTargetId = clue.seatId;
    state.match.pendingEvidenceClueId = clue.id;
    if (clue.seatId && clue.seatId !== pid && getSeat(clue.seatId) && getSeat(clue.seatId).alive) {
      d.goodIds = d.goodIds.filter(function (id) { return id !== clue.seatId; });
      if (d.wolfIds.indexOf(clue.seatId) === -1) {
        d.wolfIds.unshift(clue.seatId);
        if (d.wolfIds.length > wolfCap) d.wolfIds.pop();
      }
    }
  }
  sound.tone(680, 0.07, "triangle", 0.05, 0);
  syncDraftSpeechToInput();
  renderPlayerPitBuilder();
}

function clearPlayerDraftPits() {
  if (!state.match) return;
  const oldKey = state.match.playerDraftPits ? state.match.playerDraftPits.turnKey : "";
  const fresh = createEmptyPlayerDraftPits();
  fresh.turnKey = oldKey;
  state.match.playerDraftPits = fresh;
  state.match.pendingEvidenceTargetId = null;
  state.match.pendingEvidenceClueId = null;
  syncDraftSpeechToInput();
  renderPlayerPitBuilder();
}

function renderPlayerPitBuilder(slotViewArg, dualWorldsArg) {
  const box = el("playerPitBuilder");
  if (!box) return;
  box.innerHTML = "";
  const player = getPlayerSeat();
  if (!state.match || !state.match.started || !player) return;

  const pid = getPlayerId();
  const isWolfPlayer = player.role === "wolf";
  const d = ensurePlayerDraftPits(false);
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const targetSeats = isWolfPlayer
    ? aliveOthers.filter(function (s) { return s.role !== "wolf"; })
    : aliveOthers;

  box.classList.toggle("is-wolf-board", isWolfPlayer);
  box.classList.toggle("is-good-board", !isWolfPlayer);

  // _children[0]: Primary seat targeting row (Wolf: Framing/Fake-Vouch on good seats ONLY; Good: Unlimited Good-Pit + Wolf-Pit)
  const seatRow = document.createElement("div");
  seatRow.className = "pit-seat-row";
  const lbl = document.createElement("span");
  lbl.className = "text-[10.5px] font-bold shrink-0 " + (isWolfPlayer ? "text-rose-300" : "text-amber-300/90");
  if (isWolfPlayer) {
    lbl.textContent = "🎭 甩鍋／假保：";
  } else {
    const wolfTotal = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
    lbl.textContent = "好人盤坑 (" + d.goodIds.length + "好·" + d.wolfIds.length + "/" + wolfTotal + "狼)：";
  }
  seatRow.appendChild(lbl);

  targetSeats.forEach(function (s) {
    const isWolf = d.wolfIds.indexOf(s.id) !== -1;
    const isGood = d.goodIds.indexOf(s.id) !== -1;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.setAttribute("data-pit-seat", String(s.id));
    chip.className = "pit-seat-chip" + (isWolf ? " is-wolf" : (isGood ? " is-good" : ""));
    chip.title = isWolfPlayer
      ? "點1下設為甩鍋目標・點2下假保拉票・點3下清除（狼同伴已自動排除）"
      : "點1下標狼坑・點2下標好人坑（好人坑不限人數！）・點3下清除";
    chip.textContent = fmtSeatNum(s.id) + s.name;
    if (isWolf || isGood) {
      const bdg = document.createElement("span");
      bdg.className = "pit-chip-badge";
      bdg.textContent = isWolfPlayer ? (isWolf ? "甩" : "保") : (isWolf ? "狼" : "好");
      chip.appendChild(bdg);
    }
    chip.addEventListener("click", function () {
      sound.unlock();
      togglePlayerDraftSeatPit(s.id);
    });
    seatRow.appendChild(chip);
  });

  if (d.wolfIds.length > 0 || d.goodIds.length > 0 || d.claimRole || d.standSeerId || d.evidenceClueId) {
    const clrBtn = document.createElement("button");
    clrBtn.type = "button";
    clrBtn.className = "cta-link-quiet text-[10px] px-1.5 py-0.5 ml-auto";
    clrBtn.textContent = "↺ 清空";
    clrBtn.addEventListener("click", function () {
      sound.unlock();
      clearPlayerDraftPits();
    });
    seatRow.appendChild(clrBtn);
  }
  box.appendChild(seatRow);

  // _children[1]: Contextual Extra Row (Per-Role 1-Click Actions / Dual-Seer Stand / Evidence Proof / Quick Good-Fill)
  let slotView = slotViewArg;
  let dualWorlds = dualWorldsArg;
  if (!slotView && typeof buildTableSlotAndWorldAnalysis === "function") {
    slotView = buildTableSlotAndWorldAnalysis(player);
  }
  if (!dualWorlds && slotView && slotView.dualSeerWorlds) {
    dualWorlds = slotView.dualSeerWorlds;
  }

  const extras = [];
  if (player.role === "seer") {
    extras.push({ label: "🔮 亮觀察員報驗", active: d.claimRole === "seer", onClick: function () { togglePlayerDraftRoleClaim("seer"); } });
  } else if (player.role === "witch") {
    extras.push({ label: "🍵 亮奉茶師報銀水", active: d.claimRole === "witch", onClick: function () { togglePlayerDraftRoleClaim("witch"); } });
  } else if (player.role === "guard") {
    extras.push({ label: "🛡️ 亮守衛報路線", active: d.claimRole === "guard", onClick: function () { togglePlayerDraftRoleClaim("guard"); } });
  } else if (player.role === "hunter") {
    extras.push({ label: "⚖️ 亮糾察長威懾", active: d.claimRole === "hunter", onClick: function () { togglePlayerDraftRoleClaim("hunter"); } });
  } else if (player.isElder) {
    extras.push({ label: "🌿 亮清心長老穩局", active: d.claimRole === "elder", onClick: function () { togglePlayerDraftRoleClaim("elder"); } });
  } else if (player.role === "villager") {
    extras.push({ label: "📖 書院生理性歸票", active: d.claimRole === "villager", onClick: function () { togglePlayerDraftRoleClaim("villager"); } });
  } else if (player.role === "wolf") {
    extras.push({ label: "🎭 悍跳觀察員", active: d.claimRole === "seer", onClick: function () { togglePlayerDraftRoleClaim("seer"); } });
    extras.push({ label: "🌿 低調裝好人", active: d.claimRole === "wolf_stealth", onClick: function () { togglePlayerDraftRoleClaim("wolf_stealth"); } });
  }

  // Good team convenience button: 1-click mark remaining unmarked seats as Good-Pit!
  if (!isWolfPlayer && d.wolfIds.length > 0) {
    const unmarkedCount = aliveOthers.filter(function (s) {
      return d.wolfIds.indexOf(s.id) === -1 && d.goodIds.indexOf(s.id) === -1;
    }).length;
    if (unmarkedCount > 0) {
      extras.push({
        label: "✨ 其餘 " + unmarkedCount + " 位全保好人",
        active: false,
        onClick: markRemainingSeatsGoodPit
      });
    }
  }

  if (dualWorlds && dualWorlds.seerA && dualWorlds.seerB) {
    [dualWorlds.seerA, dualWorlds.seerB].forEach(function (sr) {
      if (sr.id === pid) return;
      extras.push({
        standId: sr.id,
        label: "站 " + fmtSeatNum(sr.id) + "號視角",
        active: d.standSeerId === sr.id,
        onClick: function () { togglePlayerDraftStandSeer(sr.id, dualWorlds); }
      });
    });
  }

  const pinnedList = (state.match && state.match.pinnedClues) || [];
  const contraClue = pinnedList.find(function (c) {
    return c && c.kind === "contradiction" && c.seatId && c.seatId !== pid && getSeat(c.seatId) && getSeat(c.seatId).alive;
  });
  if (contraClue) {
    extras.push({
      label: "⚡ 呈堂證供 " + fmtSeatNum(contraClue.seatId) + "號",
      active: d.evidenceClueId === contraClue.id,
      onClick: function () { togglePlayerDraftEvidence(contraClue); }
    });
  }

  if (extras.length > 0) {
    const exRow = document.createElement("div");
    exRow.className = "pit-extra-row";
    extras.forEach(function (ex) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pit-extra-chip" + (ex.active ? " is-active" : "");
      if (ex.standId) btn.setAttribute("data-pit-stand", String(ex.standId));
      btn.textContent = ex.label;
      btn.addEventListener("click", function () {
        sound.unlock();
        ex.onClick();
      });
      exRow.appendChild(btn);
    });
    box.appendChild(exRow);
  }

  // _children[2] (Wolf-Only): Secret God-Hunt Notebook Row — track suspected Seer/Witch/Hunter/Guard/Elder for night hunting!
  if (isWolfPlayer && targetSeats.length > 0) {
    const huntRow = document.createElement("div");
    huntRow.className = "pit-extra-row wolf-god-hunt-row";
    const hLbl = document.createElement("span");
    hLbl.className = "text-[10px] font-bold text-amber-300/90 shrink-0";
    hLbl.textContent = "🔍 獵神筆記：";
    huntRow.appendChild(hLbl);
    const marks = state.match.wolfGodMarks || {};
    targetSeats.forEach(function (s) {
      const mDef = getWolfGodMarkDef(marks[s.id] || "");
      const hBtn = document.createElement("button");
      hBtn.type = "button";
      hBtn.setAttribute("data-wolf-god-seat", String(s.id));
      hBtn.className = "wolf-god-chip" + (mDef.key ? " is-marked" : "");
      hBtn.title = "點擊標記你推測的真神職（僅狼隊自己可見，入夜時自動提醒）";
      hBtn.textContent = fmtSeatNum(s.id) + (mDef.label ? (" " + mDef.label) : " 標神");
      hBtn.addEventListener("click", function () {
        sound.unlock();
        cycleWolfGodMark(s.id);
      });
      huntRow.appendChild(hBtn);
    });
    box.appendChild(huntRow);
  }
  syncSpeechAdvancedToggleLabel(player);
}

function preparePlayerSpeechPanel() {
  const player = getPlayerSeat();
  const chipsBox = el("quickSpeechChips");
  chipsBox.innerHTML = "";
  if (!player) return;

  const pid = getPlayerId();
  const inPk = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive() && state.match.pkCandidates.indexOf(pid) !== -1);
  const pkRivalId = inPk ? state.match.pkCandidates.find(function (id) { return id !== pid; }) : null;
  const pkRivalSeat = pkRivalId ? getSeat(pkRivalId) : null;

  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const pickedSeat = getSeat(state.selectedSeatId);
  const sampleTarget = (pickedSeat && pickedSeat.id !== pid && pickedSeat.alive)
    ? pickedSeat
    : (inPk && pkRivalSeat && pkRivalSeat.alive ? pkRivalSeat : (aliveOthers[0] || { id: pid === 1 ? 2 : 1, name: "夥伴" }));
  if (el("playerTurnHeading")) {
    el("playerTurnHeading").textContent = inPk ? "⚔️ 平票 PK 發言" : "輪到你發言";
  }
  const tHintEl = el("playerSpeechTargetLabel");
  if (tHintEl) {
    tHintEl.textContent = "🎯 對象：" + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name;
  }
  const cHintEl = el("playerComboBonusHint");
  if (cHintEl) {
    if (state.match.comboBoostReady) {
      cHintEl.textContent = "🔥 連擊 +15%";
      cHintEl.classList.remove("hidden");
    } else {
      cHintEl.textContent = "";
      cHintEl.classList.add("hidden");
    }
  }
  renderPinnedCluesTray();
  refreshQuickFreeInputHint();

  const cards = [];
  const slotView = (typeof buildTableSlotAndWorldAnalysis === "function") ? buildTableSlotAndWorldAnalysis(player) : null;
  const dualWorlds = (slotView && slotView.dualSeerWorlds) ? slotView.dualSeerWorlds : null;

  const prevTurnKey = state.match.playerDraftPits ? state.match.playerDraftPits.turnKey : "";
  const draftNow = ensurePlayerDraftPits(true);
  renderRoleTurnDashboard(player);
  renderPlayerPitBuilder(slotView, dualWorlds);
  const isFreshTurn = prevTurnKey !== draftNow.turnKey;
  if (isFreshTurn) {
    if (el("speechAdvancedDrawer")) el("speechAdvancedDrawer").classList.add("hidden");
  }
  syncSpeechAdvancedToggleLabel(player);
  if (isFreshTurn && prevTurnKey) {
    if (el("quickFreeInput")) el("quickFreeInput").value = "";
    if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  }
  if (isFreshTurn && (draftNow.wolfIds.length > 0 || draftNow.goodIds.length > 0)) {
    const qInNow = el("quickFreeInput");
    if (qInNow && !qInNow.value.trim()) syncDraftSpeechToInput();
  }

  const vaneEl = el("tableWindVaneSpeech");
  if (vaneEl) {
    const vw = typeof computeTableWindVane === "function" ? computeTableWindVane() : null;
    const urgentCaller = (state.match.daySpeechEvents || []).some(function (ev) {
      return ev && ev.speakerId !== pid && (ev.accuseId === pid || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(pid) !== -1));
    });
    if (vw && vw.summaryText && state.match.started && (dualWorlds || urgentCaller)) {
      vaneEl.textContent = vw.summaryText;
      vaneEl.classList.remove("hidden");
    } else {
      vaneEl.classList.add("hidden");
    }
  }

  const todaySpokenIds = state.match.logs
    .filter(function (l) { return l.day === state.match.day && l.kind === "speech" && l.speakerId && l.speakerId !== getPlayerId(); })
    .map(function (l) { return l.speakerId; });
  const targetAlreadySpoke = todaySpokenIds.indexOf(sampleTarget.id) !== -1;

  // Card 1: PK Rebuttal OR Dual-Seer World A vs B OR 存好心 (Truth & Evidence / Role Claim)
  if (inPk && pkRivalSeat && pkRivalSeat.alive) {
    const pkRoleProof = (player.role === "seer" && player.checkedHistory.length > 0)
      ? ("我是真正的明心觀察員，已查證 " + fmtSeatNum(player.checkedHistory[player.checkedHistory.length - 1].targetId) + "號，絕不能在 PK 斷了查驗線！")
      : (player.role === "witch" && player.savedSeatId
        ? ("我是滴水奉茶師，曾用暖心回甘茶護回 " + fmtSeatNum(player.savedSeatId) + "號，留我在場好人更穩！")
        : "我全程理性講話無任何邏輯矛盾，留我在場才能繼續幫好人對齊票型！");
    cards.push({
      tgKind: "heart",
      tgTag: "PK 拉票",
      label: "【PK 搶救陳詞】平票 PK 自證清白，呼籲好人轉投 " + fmtSeatNum(pkRivalSeat.id) + "號 " + pkRivalSeat.name,
      text: "平票 PK 我誠懇向全場搶救這一票！" + pkRoleProof + "對比之下，" + fmtSeatNum(pkRivalSeat.id) + "號" + pkRivalSeat.name + " 的立場破綻更大，拜託非平票的好人夥伴這輪集中投給 " + pkRivalSeat.id + "號！"
    });
  } else if (player.role === "seer" && player.checkedHistory.length > 0) {
    const last = player.checkedHistory[player.checkedHistory.length - 1];
    const cSeat = getSeat(last.targetId);
    const cLabel = fmtSeatNum(last.targetId) + "號" + (cSeat ? cSeat.name : "");
    if (last.isWolf) {
      cards.push({
        tgKind: "heart",
        tgTag: "存好心",
        label: "【存好心】亮明心觀察員底牌：公開查獲 " + cLabel + " 是酸民狼",
        text: "各位好夥伴，我存好心向全場公開查證結果：我是真正的明心觀察員！昨晚我查驗了 " + cLabel + "，確定他就是躲在茶席裡的酸民狼，請大家團結集中選票請 " + last.targetId + "號 離席冷靜！"
      });
    } else {
      cards.push({
        tgKind: "heart",
        tgTag: "存好心",
        label: "【存好心】亮明心觀察員底牌：證實 " + cLabel + " 是好夥伴",
        text: "我本著存好心原則公開明心觀察員查證：昨晚我查驗過 " + cLabel + "，確定他是善良的好夥伴！請大家放心相信 " + last.targetId + "號，把注意力集中在其他可疑對象身上。"
      });
    }
  } else if (player.role === "witch" && player.savedSeatId) {
    cards.push({
      tgKind: "deeds",
      tgTag: "做好事",
      label: "【做好事】亮滴水奉茶師底牌：證明用回甘茶護回 " + fmtSeatNum(player.savedSeatId) + "號",
      text: "我是這局的滴水奉茶師，想本著做好事的精神向大家報告：之前晚上被迷霧鎖定的人正是 " + player.savedSeatId + "號，是我用暖心回甘茶把他護回來的，所以他確定是好夥伴，千萬別投錯人！"
    });
  } else if (player.role === "guard") {
    const guarded = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
    cards.push({
      tgKind: "deeds",
      tgTag: "守衛表態",
      label: guarded
        ? ("【做好事】公開護心結界：昨晚守護了 " + fmtSeatNum(guarded.id) + "號 " + guarded.name)
        : ("【做好事】低調表態好人立場・點評 " + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name),
      text: guarded
        ? ("我先穩住全場視角：我是這局的護心守衛！昨晚我的護心結界剛守過 " + fmtSeatNum(guarded.id) + "號" + guarded.name + "，希望滴水奉茶師留意別跟我撞車造成破盾，今晚請大家齊心檢視 " + sampleTarget.id + "號！")
        : ("我是認真盤邏輯的好人，目前場上資訊有限，我先重點檢視 " + fmtSeatNum(sampleTarget.id) + "號" + sampleTarget.name + " 的立場與發言細節！")
    });
  } else if (player.role === "hunter") {
    cards.push({
      tgKind: "heart",
      tgTag: "糾察表態",
      label: "【存好心】直心糾察穩局：點評 " + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name + "（必要時正氣威懾）",
      text: "我先替全場穩住節奏，我手上握有正氣共鳴絕對是硬好人一張！聽完目前發言，我覺得 " + fmtSeatNum(sampleTarget.id) + "號" + sampleTarget.name + " 的邏輯需要大家重點檢視，若酸民狼想推我上台就得承擔被我帶走的代價！"
    });
  } else if (player.isElder) {
    cards.push({
      tgKind: "heart",
      tgTag: "長老穩局",
      label: player.elderShieldUsed
        ? ("【存好心】清心長老帶隊：點評 " + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name)
        : ("【存好心】清心長老護航：替神職扛壓，重點檢視 " + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name),
      text: player.elderShieldUsed
        ? ("我是已經亮牌的清心長老，雖然沒有投票權，但我的視野最純粹！這輪拜託所有好夥伴幫我集中檢視 " + fmtSeatNum(sampleTarget.id) + "號" + sampleTarget.name + "，別讓酸民狼帶偏節奏！")
        : ("我是這局的清心長老，首次被誤投有豁免護盾可以替神職分擔壓力！我先理性點出 " + fmtSeatNum(sampleTarget.id) + "號" + sampleTarget.name + " 的破綻，好人夥伴們穩穩盤坑！")
    });
  } else if (player.role === "wolf") {
    const wolfMateSeer = aliveOthers.find(function (s) { return s.role === "wolf" && s.claimedRole === "seer"; });
    const wolfGoodPicks = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    const wolfScapegoat = (sampleTarget.role !== "wolf" ? sampleTarget : wolfGoodPicks[0]) || sampleTarget;
    if (wolfMateSeer) {
      cards.push({
        tgKind: "heart",
        tgTag: "狼隊配合",
        label: "【狼隊配合・站邊同伴】聲援 " + fmtSeatNum(wolfMateSeer.id) + "號 觀察員，打擊 " + fmtSeatNum(wolfScapegoat.id) + "號",
        text: "聽下來我覺得 " + fmtSeatNum(wolfMateSeer.id) + "號" + wolfMateSeer.name + " 的觀察員視野與時間線真實多了！反觀 " + fmtSeatNum(wolfScapegoat.id) + "號" + wolfScapegoat.name + " 一直躲在後面攪混水，我堅定站邊 " + fmtSeatNum(wolfMateSeer.id) + "號，這輪直接把票集中給 " + wolfScapegoat.id + "號！"
      });
    } else {
      cards.push({
        tgKind: "heart",
        tgTag: "悍跳查殺",
        label: "【狼隊悍跳】冒充明心觀察員・查殺 " + fmtSeatNum(wolfScapegoat.id) + "號 " + wolfScapegoat.name,
        text: "請全場注意我的視野！我才是這局真正的明心觀察員！昨晚我查驗了 " + fmtSeatNum(wolfScapegoat.id) + "號" + wolfScapegoat.name + "，確定他是躲在茶席裡的酸民狼！我警徽與公投票全部押在 " + wolfScapegoat.id + "號，請好人跟我一起出他！"
      });
    }
  } else {
    const pitBuddy = (slotView && slotView.goodPits && slotView.goodPits[0] && slotView.goodPits[0].id !== sampleTarget.id)
      ? slotView.goodPits[0]
      : null;
    const buddyNote = (pitBuddy && todaySpokenIds.indexOf(pitBuddy.id) !== -1)
      ? ("目前好人坑我先放 " + pitBuddy.id + "號" + pitBuddy.name + "；")
      : "";
    cards.push({
      tgKind: "heart",
      tgTag: "存好心",
      label: "【存好心】盤好人坑與狼坑：重點檢視 " + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name,
      text: targetAlreadySpoke
        ? ("我存好心幫大家梳理一下坑位：" + buddyNote + "剛才講過的 " + sampleTarget.id + "號" + sampleTarget.name + " 立場比較模糊，暫時進我今天的檢視狼坑，請大家也聽完還沒發言的人表水再對齊！")
        : ("目前好人坑與狼坑都還在成形中，因為 " + sampleTarget.id + "號" + sampleTarget.name + " 今天還沒發言，我先留著待聽他等一下怎麼盤坑！")
    });
  }

  // Card 2: 說好話 (Kindness & Persuasive De-escalation — or Wolf false-gold-water pull!)
  const friendTarget = (player.role === "wolf" ? aliveOthers.find(function (s) { return s.id !== sampleTarget.id && s.role !== "wolf"; }) : null)
    || aliveOthers.find(function (s) { return s.id !== sampleTarget.id; })
    || sampleTarget;
  const friendSpoke = todaySpokenIds.indexOf(friendTarget.id) !== -1;
  if (player.role === "wolf") {
    cards.push({
      tgKind: "words",
      tgTag: "拉攏票倉",
      label: "【假發金水・拉攏好人】力挺 " + fmtSeatNum(friendTarget.id) + "號 " + friendTarget.name + " 帶動信任",
      text: "這輪我特別想幫 " + fmtSeatNum(friendTarget.id) + "號" + friendTarget.name + " 說話！我覺得他的發言邏輯比全場很多人都誠懇真摯，明顯是站在好人視角替大家著想的好夥伴，大家可以放心先把 " + friendTarget.id + "號 放進好人坑跟我一起抓狼！"
    });
  } else {
    cards.push({
      tgKind: "words",
      tgTag: "說好話",
      label: "【說好話】放進好人坑：溫和力挺 " + fmtSeatNum(friendTarget.id) + "號 " + friendTarget.name,
      text: friendSpoke
        ? ("我想把 " + friendTarget.id + "號" + friendTarget.name + " 放進好人坑！剛剛聽他發言態度溫和、邏輯真誠，只要好人彼此互信不亂踩，這輪一定能把真正狼坑抓出來！")
        : ("目前 " + friendTarget.id + "號" + friendTarget.name + " 還沒發言，不過他前面幾輪的配合態度還算穩定，我期待聽完他的表水，大家先別急著把他打進狼坑！")
    });
  }

  // Card 3: Evidence Card / Dual-Seer World Comparison / Wolf-Pit Rebuttal / Wolf Tactic / Standard Support
  const pinnedList = (state.match && state.match.pinnedClues) || [];
  const evClue = pinnedList.find(function (c) {
    if (!c || !c.seatId || c.seatId === pid) return false;
    const cs = getSeat(c.seatId);
    return Boolean(cs && cs.alive && (c.kind === "contradiction" || c.kind === "clash" || c.kind === "micro" || c.kind === "toxic"));
  });
  const evToday = state.match.todayEvents || {};
  if (evClue) {
    const evSeat = getSeat(evClue.seatId);
    cards.push({
      tgKind: "evidence",
      tgTag: "⚡呈堂證供",
      isEvidenceCard: true,
      evidenceClueId: evClue.id,
      evidenceTargetId: evSeat.id,
      label: "【⚡呈堂證供・邏輯破防】對 " + fmtSeatNum(evSeat.id) + "號 " + evSeat.name + " 打出關鍵線索！",
      text: evClue.summary
    });
  } else if (player.role === "wolf") {
    const goodPushPool = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    const pushSeat = goodPushPool.find(function (s) { return s.id === sampleTarget.id; }) || goodPushPool[0] || sampleTarget;
    if (state.match.wolfTactic === "deep_stealth") {
      cards.push({
        tgKind: "deeds",
        tgTag: "深水倒鉤",
        label: "【狼隊偽裝・穿衣自保】保持理性和氣，點檢視 " + fmtSeatNum(pushSeat.id) + "號",
        text: "大家先別急著火氣上來，我是個低調守規矩、有分寸的茶席好夥伴，這輪先把視角對準立場比較模糊的 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + "，我們理性聽清楚後面表水再定票！"
      });
    } else {
      cards.push({
        tgKind: "deeds",
        tgTag: "帶風推坑",
        label: "【狼隊戰術・抗推抗辯】假穿護航・點進狼坑 " + fmtSeatNum(pushSeat.id) + "號 " + pushSeat.name,
        text: "昨晚其實是我用關鍵職能幫忙穩住局勢，所以我自己絕對是鐵好人一張！反觀 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + " 的反應一直閃躲對立，我直接先把 " + pushSeat.id + "號 點進第一狼坑！"
      });
    }
  } else if (evToday.fakeSeerId && getSeat(evToday.fakeSeerId) && getSeat(evToday.fakeSeerId).alive) {
    const fs = getSeat(evToday.fakeSeerId);
    cards.push({
      tgKind: "deeds",
      tgTag: "拆穿假牌",
      label: "【存好心・正面回應】拆穿 " + fmtSeatNum(fs.id) + "號 " + fs.name + " 剛剛假冒明心觀察員！",
      text: "終於輪到我發言了！剛才前置位 " + fmtSeatNum(fs.id) + "號" + fs.name + " 竟然冒充明心觀察員誤導全場，我才是真正的明心觀察員，他鐵定佔一個狼坑，請好人今天務必先把 " + fs.id + "號 請離茶席！"
    });
  } else if (dualWorlds && dualWorlds.chosenWorld && dualWorlds.rivalWorld) {
    const wA = dualWorlds.worldA;
    const wB = dualWorlds.worldB;
    const cw = dualWorlds.chosenWorld;
    const wAPits = wA.wolfPits.map(function (s) { return s.id + "號" + s.name; }).join("＋");
    const wBPits = wB.wolfPits.map(function (s) { return s.id + "號" + s.name; }).join("＋");
    cards.push({
      tgKind: "deeds",
      tgTag: "盤雙邊坑",
      label: "【盤雙邊狼坑】對比站 " + dualWorlds.seerA.id + "號 vs 站 " + dualWorlds.seerB.id + "號 的兩邊狼坑！",
      text: "場上有兩張明心觀察員對跳，我幫全場盤清兩邊狼坑：如果站 " + dualWorlds.seerA.id + "號，狼坑落在 " + wAPits + "；如果站 " + dualWorlds.seerB.id + "號，狼坑落在 " + wBPits + "！對比下來我目前站邊 " + cw.trustedSeer.id + "號，建議把 " + cw.fakeSeer.id + "號 放進首出狼坑！"
    });
  } else if (evToday.accusedYouId && getSeat(evToday.accusedYouId) && getSeat(evToday.accusedYouId).alive) {
    const ac = getSeat(evToday.accusedYouId);
    const extraWp = (slotView && slotView.wolfPits || []).find(function (s) { return s.id !== ac.id; });
    cards.push({
      tgKind: "words",
      tgTag: "回應狼坑",
      label: "【正面回應】反駁前置位 " + fmtSeatNum(ac.id) + "號 " + ac.name + " 把你點進狼坑",
      text: "前置位 " + fmtSeatNum(ac.id) + "號" + ac.name + " 剛才把我點進狼坑我必須回應：我全程認真找線索，絕對不在狼坑裡！你急著把我往狼坑推反而讓人懷疑，這輪我先把你跟 " + (extraWp ? (extraWp.id + "號") : "立場曖昧的位置") + " 畫進檢視狼坑！"
    });
  } else if (evToday.toxicSlipId && getSeat(evToday.toxicSlipId) && getSeat(evToday.toxicSlipId).alive) {
    const tx = getSeat(evToday.toxicSlipId);
    cards.push({
      tgKind: "deeds",
      tgTag: "做好事",
      label: "【做好事・化解酸言】點出 " + fmtSeatNum(tx.id) + "號 " + tx.name + " 剛剛的挑撥語氣",
      text: "輪到我發言想提醒大家，剛才前置位 " + fmtSeatNum(tx.id) + "號" + tx.name + " 的語氣帶著挑撥對立，很符合酸民狼的特徵，暫時先放一格狼坑；我們保持說好話風度，大家多檢視 " + tx.id + "號。"
    });
  } else {
    cards.push({
      tgKind: "deeds",
      tgTag: "做好事",
      label: "【做好事】點出完整坑位・守護好人坑 " + fmtSeatNum(friendTarget.id) + "號",
      text: "我提醒大家按發言時序把坑位理清：目前好人坑先看 " + friendTarget.id + "號" + friendTarget.name + "，其餘未發言席位待聽表水後再從中點齊剩餘狼坑，避免好人被帶風向誤投！"
    });
  }

  el("customSpeechDrawer").classList.add("hidden");
  const cardKeys = ["Q", "W", "E"];
  cards.slice(0, 3).forEach(function (item, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    const cardTone = item.tgKind === "evidence" ? "card-evidence" : (item.tgKind === "heart" ? "card-heart" : (item.tgKind === "words" ? "card-words" : "card-deeds"));
    const stampTone = item.tgKind === "evidence" ? "stamp-evidence" : (item.tgKind === "heart" ? "stamp-heart" : (item.tgKind === "words" ? "stamp-words" : "stamp-deeds"));
    btn.className = "play-card-btn is-compact-card card-deal-in w-full text-left flex flex-col justify-between gap-1 " + cardTone;
    if (btn.style) btn.style.animationDelay = (idx * 65) + "ms";
    btn.title = item.text;
    btn.innerHTML =
      '<div class="flex items-center justify-between gap-1.5">' +
      '<span class="play-card-stamp ' + stampTone + '">' + escapeHtml(item.tgTag) + '</span>' +
      '<span class="flex items-center gap-1"><kbd class="ui-kbd">' + cardKeys[idx] + '</kbd><span class="play-card-arrow text-[10px] opacity-60">→</span></span>' +
      '</div>' +
      '<div class="text-[11px] font-bold leading-snug line-clamp-2">' + escapeHtml(item.label.replace(/^【[^】]+】/, "")) + '</div>';
    btn.addEventListener("click", function () {
      if (chipsBox._cardCasting) return;
      chipsBox._cardCasting = true;
      state.match.rewriteCritReady = false;
      state.match.pendingEvidenceTargetId = item.isEvidenceCard ? item.evidenceTargetId : null;
      state.match.pendingEvidenceClueId = item.isEvidenceCard ? item.evidenceClueId : null;
      if (typeof createEmptyPlayerDraftPits === "function") state.match.playerDraftPits = createEmptyPlayerDraftPits();
      el("playerSpeechInput").value = item.text;
      addThreeGoodPoint(item.isEvidenceCard ? "heart" : item.tgKind, item.tgTag);

      // Ceremonial card-play anticipation beat so cards lift & shimmer before launching!
      if (btn.classList) btn.classList.add("is-card-casting");
      if (typeof chipsBox.querySelectorAll === "function") {
        chipsBox.querySelectorAll(".play-card-btn").forEach(function (sib) {
          if (sib !== btn && sib.classList) sib.classList.add("is-card-dimmed");
        });
      }
      if (typeof sound !== "undefined" && typeof sound.tone === "function") {
        sound.tone(587, 0.08, "triangle", 0.06, 0);
        sound.tone(880, 0.14, "triangle", 0.05, 0.07);
      }
      if (typeof spawnBurst === "function") {
        spawnBurst(getPlayerId(), ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
      }
      const isRealBrowserUi = typeof window !== "undefined" && typeof window.matchMedia === "function";
      const castDelay = !isRealBrowserUi ? 0 : ((typeof state !== "undefined" && (state.autoPlay || state.fxPacing === "fast")) ? 160 : 420);
      if (castDelay <= 0) {
        chipsBox._cardCasting = false;
        submitPlayerSpeech();
      } else {
        setTimeout(function () {
          chipsBox._cardCasting = false;
          if (state.match && state.match.phase === "DAY_PLAYER_TURN") {
            submitPlayerSpeech();
          }
        }, castDelay);
      }
    });
    chipsBox.appendChild(btn);
  });

  if (!el("playerSpeechInput").value.trim()) {
    el("playerSpeechInput").value = cards[0].text;
  }
  refreshLiveNlpUI();
}

function refreshLiveNlpUI() {
  const val = el("playerSpeechInput").value;
  const res = analyzeThreeGoodSpeech(val);
  el("scoreKindWords").textContent = res.kindScore + "%";
  el("scoreGoodHeart").textContent = res.heartScore + "%";
  el("scoreGoodDeed").textContent = res.deedScore + "%";
  el("barKindWords").style.width = res.kindScore + "%";
  el("barGoodHeart").style.width = res.heartScore + "%";
  el("barGoodDeed").style.width = res.deedScore + "%";

  const badge = el("nlpFeedbackBadge");
  badge.textContent = res.badge;
  badge.className = res.isToxic ? "text-rose-400 font-black" : "text-emerald-300 font-bold";

  const inlineTg = el("speechThreeGoodBadge");
  if (inlineTg) {
    const hasText = Boolean(val && val.trim().length > 0);
    if (!hasText) {
      inlineTg.classList.add("hidden");
    } else if (res.isToxic) {
      inlineTg.textContent = "🌶 轉好話 ×1.5";
      inlineTg.className = "speech-tg-badge is-warn shrink-0";
    } else if (state.match && state.match.rewriteCritReady) {
      inlineTg.textContent = "✨ 說好話暴擊 ×1.5";
      inlineTg.className = "speech-tg-badge is-crit shrink-0";
    } else if (res.kindScore >= 84) {
      inlineTg.textContent = "🌸 說好話加持";
      inlineTg.className = "speech-tg-badge is-kind shrink-0";
    } else {
      inlineTg.classList.add("hidden");
    }
  }
}

function submitPlayerSpeech() {
  sound.unlock();
  if (state.match.phase !== "DAY_PLAYER_TURN") return;
  state.currentTurnSpoken = true;

  let text = el("playerSpeechInput").value.trim() || "大家冷靜聽線索，一起抓出酸民狼！";
  const res = analyzeThreeGoodSpeech(text);
  const player = getPlayerSeat();
  const claimedSeerNow = /(我是|我才是|我亮|我跳|其實我|本著.{0,6}公開).{0,10}(預言家|明心觀察員|觀察員)|^(真)?(預言家|明心觀察員)/.test(text);
  const claimedWitchNow = /(我是|我才是|我亮|我跳|其實我).{0,10}(女巫|滴水奉茶師|奉茶師)|^(真)?(滴水奉茶師|奉茶師)/.test(text);
  const claimedHunterNow = /(我是|我才是|我亮|我跳|其實我).{0,10}(獵人|直心糾察長|糾察長)|^(真)?(直心糾察長|糾察長)/.test(text);
  const claimedGuardNow = /(我是|我才是|我亮|我跳|其實我).{0,10}(護心守衛|守衛)|^(真)?(護心守衛|守衛)/.test(text);
  const claimedElderNow = /(我是|我才是|我亮|我跳|其實我).{0,10}(清心長老|長老)|^(真)?清心長老/.test(text);
  if (claimedSeerNow) {
    player.claimedRole = "seer";
    const otherSeer = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "seer"; });
    spawnFx(getPlayerId(), otherSeer ? "對跳觀察員!" : "亮明心觀察員!", "#fbbf24");
    if (otherSeer) {
      triggerShake(300);
      triggerCutIn("🔮 真假明心觀察員對跳！", "全場焦點鎖定，誰才是真正的明心觀察員？", "gold");
    }
  } else if (claimedWitchNow) {
    player.claimedRole = "witch";
    const otherWitch = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "witch"; });
    spawnFx(getPlayerId(), otherWitch ? "對跳奉茶師!" : "亮滴水奉茶師!", "#34d399");
    if (otherWitch) triggerShake(300);
  } else if (claimedHunterNow) {
    player.claimedRole = "hunter";
    const otherHunter = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "hunter"; });
    spawnFx(getPlayerId(), otherHunter ? "對跳糾察長!" : "亮直心糾察長!", "#38bdf8");
    if (otherHunter) triggerShake(300);
  } else if (claimedGuardNow) {
    player.claimedRole = "guard";
    const otherGuard = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "guard"; });
    spawnFx(getPlayerId(), otherGuard ? "對跳守衛!" : "亮護心守衛!", "#22d3ee");
    if (otherGuard) triggerShake(300);
  } else if (claimedElderNow) {
    player.claimedRole = "elder";
    const otherElder = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "elder"; });
    spawnFx(getPlayerId(), otherElder ? "對跳長老!" : "亮清心長老!", "#2dd4bf");
    if (otherElder) triggerShake(300);
  }

  const pid = getPlayerId();
  const draft = (state.match && state.match.playerDraftPits) ? state.match.playerDraftPits : createEmptyPlayerDraftPits();
  const evForceId = state.match.pendingEvidenceTargetId || null;

  const plWolfCap = Math.max(4, getPlayerWolfPitCap());
  const plWolfPits = [];
  const pushWolfPit = function (id) {
    if (!id || id === pid || plWolfPits.indexOf(id) !== -1 || plWolfPits.length >= plWolfCap) return;
    const s = getSeat(id);
    if (s && s.alive) plWolfPits.push(id);
  };
  (draft.wolfIds || []).forEach(pushWolfPit);
  if (evForceId) pushWolfPit(evForceId);
  pushWolfPit(res.primaryAccuseId);
  (res.accuseTargets || []).forEach(pushWolfPit);

  const plGoodPits = [];
  const pushGoodPit = function (id) {
    if (!id || id === pid || id === evForceId || plWolfPits.indexOf(id) !== -1 || plGoodPits.indexOf(id) !== -1) return;
    const s = getSeat(id);
    if (s && s.alive) plGoodPits.push(id);
  };
  (draft.goodIds || []).forEach(pushGoodPit);
  if (!evForceId) {
    pushGoodPit(res.primaryVouchId);
    (res.vouchTargets || []).forEach(pushGoodPit);
  }

  (res.seatMentions || []).forEach(function (sid) {
    if (plGoodPits.indexOf(sid) === -1 && /(狼坑|檢視|懷疑|請離|投)/.test(text)) pushWolfPit(sid);
  });

  const fallbackTarget = evForceId || res.seatMentions.find(function (n) { return n !== pid; }) || null;
  let accuseId = evForceId || plWolfPits[0] || null;
  let vouchId = evForceId ? null : (plGoodPits[0] || null);
  if (!accuseId && !vouchId && fallbackTarget) {
    const legacyVouch = /好人|信任|救活|保護|相信|金水/.test(text) && !/懷疑|酸民狼|查殺|投出去|矛盾|假冒|誤導|破綻|重點檢視|帶風向|問題|小心/.test(text);
    if (legacyVouch) { vouchId = fallbackTarget; pushGoodPit(fallbackTarget); }
    else { accuseId = fallbackTarget; pushWolfPit(fallbackTarget); }
  }
  const targetNum = accuseId || vouchId || fallbackTarget;
  const isWolfCheckClaim = Boolean(claimedSeerNow && accuseId && /查殺|酸民狼|是狼|查到.*狼|查驗.*狼|投出去|投他|請離/.test(text));

  plGoodPits.forEach(function (gId, gIdx) {
    recordRelation(pid, gId, "trust");
    if (gIdx < 3) spawnBeam(pid, gId, "#34d399", "trust");
  });
  plWolfPits.forEach(function (wId, wIdx) {
    recordRelation(pid, wId, "suspect");
    if (wIdx < 3) spawnBeam(pid, wId, "#fb7185", "grill");
  });

  if (!state.match.daySpeechEvents) state.match.daySpeechEvents = [];
  if (!state.match.allSpeechEvents) state.match.allSpeechEvents = [];
  const standSeerSeat = vouchId ? getSeat(vouchId) : null;
  const standSeerId = draft.standSeerId || ((standSeerSeat && standSeerSeat.claimedRole === "seer") ? standSeerSeat.id : null);
  const plEvObj = {
    day: state.match.day,
    turnOrderIndex: state.match.daySpeechEvents.length,
    speakerId: pid,
    speakerName: "你",
    claimRole: claimedSeerNow ? "seer" : (claimedWitchNow ? "witch" : (claimedHunterNow ? "hunter" : (claimedGuardNow ? "guard" : (claimedElderNow ? "elder" : null)))),
    accuseId: accuseId,
    vouchId: vouchId,
    wolfPits: plWolfPits,
    goodPits: plGoodPits,
    standWithSeerId: standSeerId,
    checkedWolfId: isWolfCheckClaim ? accuseId : null,
    checkedGoodId: (claimedSeerNow && vouchId) ? vouchId : null,
    hasToxicSlip: res.isToxic,
    rawText: text
  };
  state.match.daySpeechEvents.push(plEvObj);
  state.match.allSpeechEvents.push(plEvObj);
  plWolfPits.forEach(function (wpId) {
    if (wpId && wpId !== pid && wpId !== accuseId) {
      const wpSeat = getSeat(wpId);
      if (wpSeat && wpSeat.alive && wpSeat.team === "good") {
        wpSeat.suspicionMap[pid] = clamp((wpSeat.suspicionMap[pid] || 50) + 7, 5, 96);
      }
    }
  });

  // Immediately alert the targeted AI seat if the player just Seer-checked them as a Wolf!
  if (isWolfCheckClaim && accuseId) {
    const hitSeat = getSeat(accuseId);
    if (hitSeat && hitSeat.alive) {
      hitSeat.suspicionMap[pid] = 100;
      setSeatEmotion(accuseId, "shock", 3400);
      spawnBurst(accuseId, ["#fb7185", "#fbbf24", "#ffffff"], 20, "spark");
      spawnFx(accuseId, "遭指認是狼!", "#f43f5e");
      setSeatBubble(
        accuseId,
        hitSeat.id % 2 === 0
          ? "等一下！你確定你才是真的明心觀察員嗎？先聽我表水！"
          : "冤枉啊！我真的是好夥伴，別急著扣帽子！",
        "wolf",
        3800
      );
    }
  }
  // If player claimed any God/Elder role, the real alive AI holding that role immediately spots the bluff!
  const plClaimedGod = claimedSeerNow ? "seer" : (claimedWitchNow ? "witch" : (claimedHunterNow ? "hunter" : (claimedGuardNow ? "guard" : (claimedElderNow ? "elder" : null))));
  if (plClaimedGod) {
    state.match.seats.forEach(function (ai) {
      if (ai.id !== pid && ai.alive && (ai.role === plClaimedGod || (plClaimedGod === "elder" && ai.isElder))) {
        ai.suspicionMap[pid] = 100;
      }
    });
  }

  const critMult = state.match.rewriteCritReady ? 1.5 : 1;
  const comboMult = state.match.comboBoostReady ? 1.15 : 1;
  const bobaActive = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "boba_truce");
  const directorMult = (!res.isToxic && bobaActive) ? 1.25 : 1;

  if (res.isToxic) {
    state.match.stats.toxicSentCount += 1;
    state.match.combo = 0;
    state.match.comboBoostReady = false;
    state.match.harmonyScore = clamp(state.match.harmonyScore - 10, 0, 100);
    triggerShake(260);
    spawnFx(pid, "全場反感!", "#f43f5e");
    state.match.seats.forEach(function (ai) {
      if (ai.id !== pid && ai.alive) ai.suspicionMap[pid] = clamp((ai.suspicionMap[pid] || 50) + 20, 10, 96);
    });
    triggerAiCrowdReactions("doubt", pid);
    if (typeof orchestrator !== "undefined") orchestrator.emit("clash:detected", { kind: "player_toxic", speakerId: pid });
    showToast("講話太衝！AI 夥伴開始懷疑你是酸民狼了！", "warn");
  } else {
    state.match.stats.goodWordsCount += 1;
    const isKindDuel = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "kind_word_duel");
    const harmGain = (critMult > 1 ? 8 : 5) * (bobaActive ? 2 : 1);
    state.match.harmonyScore = clamp(state.match.harmonyScore + harmGain, 0, 100);
    const persuasion = Math.round((res.kindScore >= 82 ? 16 : 10) * critMult * comboMult * directorMult) + (isKindDuel ? 10 : 0);
    if (isKindDuel && state.match.directorEventClearedDay !== state.match.day && typeof addThreeGoodPoint === "function") {
      state.match.directorEventClearedDay = state.match.day;
      const tgNow = state.match.threeGood || { heart: 0, words: 0, deeds: 0 };
      const bonusKind = tgNow.words === 0 ? "words" : (tgNow.deeds === 0 ? "deeds" : "heart");
      addThreeGoodPoint(bonusKind, "好話接龍賞蓮");
    }
    spawnFx(pid, critMult > 1 ? "✨ 好話暴擊×1.5!" : (bobaActive ? "🍵 冬瓜青說服+25%!" : (isKindDuel ? "🌸 好話接龍+10!" : (comboMult > 1 ? "🔥 連擊說服UP!" : "說服力UP!"))), "#fde68a");
    if (critMult > 1) {
      setSeatEmotion(pid, "proud", 3200);
      spawnBurst(pid, ["#34d399", "#fbbf24", "#fde68a"], 28, "petal");
      spawnBurst(pid, ["#34d399", "#fbbf24", "#ffffff"], 16, "ring");
      if (typeof triggerScreenFlash === "function") triggerScreenFlash("#34d399", 440, 0.34);
      if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
        if (typeof stage3d.triggerCameraPunch === "function") {
          stage3d.triggerCameraPunch(accuseId || vouchId || pid, { fov: 40, durationMs: 1200 });
        }
        if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("celebrate", 2200);
      }
      triggerCutIn("✨ 三好好話暴擊 ×1.5！", "理性溫和的說服力席捲全場！", "emerald");
    } else {
      setSeatEmotion(pid, "happy", 2400);
    }
    const applyTargetDelta = function (tgtId, asVouch, mult) {
      if (!tgtId) return;
      const tgtSeatObj = getSeat(tgtId);
      const effPersuasion = Math.round(persuasion * (mult || 1));
      state.match.seats.forEach(function (ai) {
        if (ai.id !== pid && ai.alive && ai.id !== tgtId) {
          const wolfMateProtected = (ai.role === "wolf" && tgtSeatObj && tgtSeatObj.role === "wolf" && !asVouch);
          const seerTruthProtected = (ai.role === "seer" && (ai.checkedHistory || []).some(function (c) {
            return c.targetId === tgtId && ((c.isWolf && asVouch) || (!c.isWolf && !asVouch));
          }));
          const witchSaveProtected = (ai.role === "witch" && ai.savedSeatId === tgtId && !asVouch);
          if (!wolfMateProtected && !seerTruthProtected && !witchSaveProtected) {
            const delta = asVouch ? -effPersuasion : effPersuasion;
            ai.suspicionMap[tgtId] = clamp((ai.suspicionMap[tgtId] || 50) + delta, 5, 96);
          }
        }
      });
    };
    state.match.seats.forEach(function (ai) {
      const aiEffRole = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(ai) : ai.role;
      if (ai.id !== pid && ai.alive && (ai.suspicionMap[pid] || 0) < 100 && !(plClaimedGod && aiEffRole === plClaimedGod)) {
        ai.suspicionMap[pid] = clamp((ai.suspicionMap[pid] || 50) - (comboMult > 1 ? 11 : 8), 5, 95);
      }
    });
    plWolfPits.forEach(function (wId, idx) {
      applyTargetDelta(wId, false, idx === 0 ? 1 : 0.65);
    });
    plGoodPits.forEach(function (gId, idx) {
      applyTargetDelta(gId, true, idx === 0 ? 1 : 0.65);
    });
    triggerAiCrowdReactions(critMult > 1 ? "crit" : "cheer", accuseId || vouchId || targetNum || pid);
    if (typeof triggerSpeechAudienceReactions === "function") {
      triggerSpeechAudienceReactions(player, { accuseId: accuseId, vouchId: vouchId, wolfPits: plWolfPits, goodPits: plGoodPits });
    }
  }

  // Trigger "⚡ 邏輯破防" when an Evidence Card was played cleanly without toxic slips!
  const evTgtId = state.match.pendingEvidenceTargetId;
  const evClueId = state.match.pendingEvidenceClueId;
  state.match.pendingEvidenceTargetId = null;
  state.match.pendingEvidenceClueId = null;
  if (evTgtId && !res.isToxic) {
    if (evClueId && state.match.pinnedClues) {
      state.match.pinnedClues = state.match.pinnedClues.filter(function (c) { return c.id !== evClueId; });
    }
    const evTarget = getSeat(evTgtId);
    if (evTarget && evTarget.alive) {
      state.match.stats.logicBreaksLanded = (state.match.stats.logicBreaksLanded || 0) + 1;
      evTarget.sweatExposed = true;
      state.match.seats.forEach(function (ai) {
        if (ai.id !== pid && ai.alive && ai.team === "good") {
          const seerCleared = (ai.role === "seer" && (ai.checkedHistory || []).some(function (c) { return c.targetId === evTarget.id && !c.isWolf; }));
          const witchCleared = (ai.role === "witch" && ai.savedSeatId === evTarget.id);
          if (!seerCleared && !witchCleared) {
            ai.suspicionMap[evTarget.id] = clamp((ai.suspicionMap[evTarget.id] || 50) + 24, 5, 98);
          }
          ai.suspicionMap[pid] = clamp((ai.suspicionMap[pid] || 50) - 10, 5, 95);
        }
      });
      setSeatEmotion(evTarget.id, "shock", 4200);
      spawnFx(evTarget.id, "⚡ 邏輯破防 +24!", "#fbbf24", { scale: 1.25, durationMs: 1900 });
      spawnBeam(pid, evTarget.id, "#fbbf24", "logic_break", 680);
      spawnBurst(evTarget.id, ["#fbbf24", "#f43f5e", "#ffffff"], 28, "slash");
      if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 480, 0.42);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", pid, evTarget.id, true);
        if (typeof stage3d.triggerCameraPunch === "function") stage3d.triggerCameraPunch(evTarget.id, { fov: 38.5, durationMs: 1450 });
        if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("celebrate", 2200);
      }
      triggerShake(280);
      triggerCutIn("⚡ 呈堂證供・邏輯破防！", "鐵證命中 " + fmtSeatNum(evTarget.id) + "號 " + evTarget.name + " 破綻，全場好人高度警覺！", "gold");
      triggerAiCrowdReactions("crit", evTarget.id);
      bumpCombo("邏輯破防");
      addThreeGoodPoint("heart", "存好心照破矛盾");
      addLog({
        kind: "blessing",
        title: "⚡ 邏輯破防！你出示蒐證鐵證直指 " + fmtSeatNum(evTarget.id) + "號 " + evTarget.name + " 矛盾，好人陣營大幅提高警戒！",
        text: ""
      });
    }
  }

  if (typeof orchestrator !== "undefined") {
    orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    orchestrator.emit("speech:committed", { speakerId: pid, isToxic: res.isToxic });
  }

  sound.playSpeak();
  setCanvasBubble(pid, text, res.isToxic ? "wolf" : "trust");
  const subTag = res.isToxic ? "酸言警告" : (critMult > 1 ? "好話暴擊×1.5" : (comboMult > 1 ? "連擊說服強化" : "三好好話"));
  addLog({
    kind: "speech",
    useTypewriter: true,
    speakerId: pid,
    title: playerNumTag() + " · 你",
    subBadge: subTag,
    text: text
  });

  state.match.rewriteCritReady = false;
  state.match.comboBoostReady = false;
  state.match.playerDraftPits = createEmptyPlayerDraftPits();
  el("playerSpeechInput").value = "";
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("btnQuickFreeSend")) el("btnQuickFreeSend").textContent = "陳詞";
  refreshQuickFreeInputHint();
  state.match.phase = "DAY_SPEECH";
  state.activeSpeakerId = pid;
  updateAllUI();
  startSpotlightTypewriter({
    speaker: player,
    badge: playerNumTag() + " · 你（玩家發言）",
    trait: subTag,
    rawText: text,
    charDelay: 30,
    holdMs: 1850
  });
  if (typeof prefetchNextAiSpeech === "function") {
    prefetchNextAiSpeech();
  }
}
