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
  const seatNums = typeof extractSeatIdsFromText === "function"
    ? extractSeatIdsFromText(text, maxSeats, { includeNames: true })
    : (text.match(/(?:1[0-2]|0?[1-9])\s*號/g) || []).reduce(function (acc, m) {
      const n = parseInt(m, 10);
      if (n >= 1 && n <= maxSeats && acc.indexOf(n) === -1) acc.push(n);
      return acc;
    }, []);

  // Strip parenthetical explanations & Badge Flow declarations before stance extraction so
  // unchecked Badge Flow notes like "（徽給03號即金水、飛05號或撕徽即查殺）" NEVER fabricate Seer checks or wolfPits!
  const stanceTextRaw = text
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/(?:今晚)?(?:雙)?警徽流[^。！？\n]*/g, " ");
  const stanceText = typeof normalizeSeatRefsInText === "function"
    ? normalizeSeatRefsInText(stanceTextRaw, maxSeats)
    : stanceTextRaw;

  // Clause-level Multi-Target Semantics: supports vouching A and accusing B in the same speech!
  const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const vouchMap = {};
  const accuseMap = {};
  const clauses = stanceText.split(/[，。！？；;、\n]+/);
  let lastStance = null;
  clauses.forEach(function (clause) {
    const cRaw = clause.trim();
    if (!cRaw) return;
    const cCleanWolf = cRaw.replace(/(?:不像|不是|非|絕不是|絕非).{0,2}(?:酸民)?狼/g, "好人");
    const cClean = cCleanWolf.replace(/(?:不是|不像|絕非).{0,2}(?:好人|好夥伴|夥伴)/g, "可疑");
    const hasPosWord = /好人|信任|救活|保護|護回|守護|相信|金水|清白|誠懇|沒問題|正氣|善良|放心|不錯|有理|合理|認同|贊同|乾淨|很穩/.test(cClean);
    const hasNegWord = /懷疑|酸民狼|是狼|查殺|投出去|投他|投給|出他|請離|矛盾|假冒|冒充|誤導|破綻|重點檢視|重點留意|帶風向|可疑|問題|小心|盯緊|別信|栽贓|最像狼|硬打|抓|投\d+號/.test(cClean);
    let clauseStance = lastStance;
    if (hasNegWord && !hasPosWord) clauseStance = "accuse";
    else if (hasPosWord && !hasNegWord) clauseStance = "vouch";
    else if (hasNegWord && hasPosWord) {
      clauseStance = /懷疑|酸民狼|是狼|查殺|投出去|投他|投給|破綻|誤導|可疑|假冒|冒充|硬打|抓|投\d+號/.test(cClean) ? "accuse" : "vouch";
    }
    if (clauseStance) lastStance = clauseStance;

    const cSeatIds = typeof extractSeatIdsFromText === "function"
      ? extractSeatIdsFromText(cRaw, maxSeats, { includeNames: true })
      : (cRaw.match(/(?:1[0-2]|0?[1-9])\s*號/g) || []).map(function (m) { return parseInt(m, 10); });
    cSeatIds.forEach(function (n) {
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
  if (isToxic) badge = "語氣稍急，不妨添一分婉轉";
  else if (state.match.rewriteCritReady) badge = "溫潤修辭 · 以理服人";
  else if (kindScore >= 86) badge = "言辭溫潤有理";

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

function buildRephraseChoiceSlips(rawText) {
  const text = (rawText || "").trim();
  const analysis = analyzeThreeGoodSpeech(text);
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const targetNum = analysis.primaryAccuseId
    || analysis.seatMentions.find(function (n) { return n !== pid; })
    || (state.selectedSeatId && state.selectedSeatId !== pid ? state.selectedSeatId : null)
    || (pid === 1 ? 2 : 1);
  const targetSeat = typeof getSeat === "function" ? getSeat(targetNum) : null;
  const targetLabel = targetSeat ? (fmtSeatNum(targetSeat.id) + "號" + targetSeat.name) : (fmtSeatNum(targetNum) + "號");
  const shortTag = targetNum + "號" + (targetSeat ? targetSeat.name : "");
  const activeCap = typeof getActiveSpeechCharLimit === "function" ? getActiveSpeechCharLimit() : 0;
  const isVouchIntent = Boolean(analysis.primaryVouchId && !analysis.primaryAccuseId && !analysis.isToxic);

  if (activeCap > 0 && activeCap <= 28) {
    if (isVouchIntent) {
      return activeCap <= 22 ? [
        { angle: "肯定條理", desc: "點出邏輯順暢處", text: shortTag + "條理清楚，這輪先信他。" },
        { angle: "溫言互保", desc: "呼籲好人莫內耗", text: "先別錯怪" + shortTag + "，查矛盾位。" },
        { angle: "留白觀察", desc: "暫信但保留複驗", text: "暫信" + shortTag + "，聽完後位再對。" }
      ] : [
        { angle: "肯定條理", desc: "點出邏輯順暢處", text: shortTag + "邏輯清楚又誠懇，這輪我先站他。" },
        { angle: "溫言互保", desc: "呼籲好人莫內耗", text: "先別內耗誤會" + shortTag + "，一起查矛盾位。" },
        { angle: "留白觀察", desc: "暫信但保留複驗", text: "暫把" + shortTag + "放偏可信，聽完後位再對票。" }
      ];
    }
    return activeCap <= 22 ? [
      { angle: "直指矛盾", desc: "點破票型或邏輯落差", text: shortTag + "言票有落差，建議先查他。" },
      { angle: "溫言請教", desc: "請對方補充理由", text: "請教" + shortTag + "站邊理由，再決定票。" },
      { angle: "留白觀望", desc: "先保留態度聽後位", text: "對" + shortTag + "先存疑，聽後位對照。" }
    ] : [
      { angle: "直指矛盾", desc: "點破票型或邏輯落差", text: "理性對線索，" + shortTag + "言票有落差，建議查他。" },
      { angle: "溫言請教", desc: "請對方補充理由", text: "想溫和請教" + shortTag + "為何站邊？講不清先查他。" },
      { angle: "留白觀望", desc: "先保留態度聽後位", text: "聽完" + shortTag + "這段仍存疑，先留記等後位對照。" }
    ];
  }

  if (isVouchIntent) {
    return [
      {
        angle: "肯定條理",
        desc: "點出邏輯順暢處",
        text: "剛剛細聽 " + targetLabel + " 的陳詞，前後脈絡很清楚也沒有亂扣帽子，這輪我先站在他這邊。"
      },
      {
        angle: "溫言互保",
        desc: "呼籲好人莫內耗",
        text: "大家先別急著懷疑 " + targetLabel + "，他剛剛的說法滿誠懇的，我們不妨把焦點轉去查前後對不上的座位。"
      },
      {
        angle: "留白觀察",
        desc: "暫信但保留複驗",
        text: "目前我暫時把 " + targetLabel + " 放偏可信的位置，等後置位全部講完再一起對票型確認。"
      }
    ];
  }

  return [
    {
      angle: "直指矛盾",
      desc: "點破票型或邏輯落差",
      text: "我們心平氣和對一下線索，" + targetLabel + " 剛才的立場跟前面票型有點對不上，這輪我建議重點檢視 " + fmtSeatNum(targetNum) + "號。"
    },
    {
      angle: "溫言請教",
      desc: "請對方補充理由",
      text: "先別急著定調，我想溫和請教 " + targetLabel + " 剛才為何這樣站邊？如果理由講不清楚，這輪我會先留意 " + fmtSeatNum(targetNum) + "號。"
    },
    {
      angle: "留白觀望",
      desc: "先保留態度聽後位",
      text: "聽完 " + targetLabel + " 這段我心裡還是有點存疑，先記一筆，等後置位全部說完我們再一起比對。"
    }
  ];
}

function applyRephraseSlip(choice) {
  if (!choice || !choice.text) return;
  const alreadyCritThisTurn = Boolean(state.match && state.match.rewriteCritReady);
  const qIn = el("quickFreeInput");
  if (qIn) qIn.value = choice.text;
  if (el("playerSpeechInput")) el("playerSpeechInput").value = choice.text;
  if (!alreadyCritThisTurn && state.match) {
    state.match.stats.rewritesUsed = (state.match.stats.rewritesUsed || 0) + 1;
    state.match.rewriteCritReady = true;
    if (typeof addThreeGoodPoint === "function") addThreeGoodPoint("words", "溫潤潤飾詞句");
    if (typeof bumpCombo === "function") bumpCombo("以理服人");
  }
  state.rephraseTrayPinned = false;
  const tray = el("rephraseChoicesTray");
  if (tray) tray.classList.add("hidden");
  const rwBtn = el("btnQuickInlineRewrite");
  if (rwBtn) rwBtn.classList.add("hidden");
  if (typeof sound !== "undefined" && typeof sound.playBlessing === "function") sound.playBlessing();
  if (typeof spawnFx === "function") spawnFx(getPlayerId(), "辭溫理正", "#34d399");
  if (typeof refreshLiveNlpUI === "function") refreshLiveNlpUI();
  if (typeof indieFlow !== "undefined" && typeof indieFlow.syncAnimatedGuideCues === "function") {
    indieFlow.syncAnimatedGuideCues();
  }
  if (typeof showToast === "function") {
    showToast("已換成「" + choice.angle + "」說法，可直接按「送出」或再微調字句。", "emerald");
  }
}

function renderRephraseChoicesTray(rawText) {
  const tray = el("rephraseChoicesTray");
  const grid = el("rephraseSlipsGrid");
  if (!tray || !grid) return [];
  const slips = buildRephraseChoiceSlips(rawText);
  grid.innerHTML = "";
  slips.forEach(function (item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rephrase-slip-btn text-left";
    btn.title = item.text;
    btn.innerHTML =
      '<div class="flex items-center justify-between gap-1">' +
      '<span class="rephrase-slip-angle">' + escapeHtml(item.angle) + '</span>' +
      '<span class="rephrase-slip-desc">' + escapeHtml(item.desc) + '</span>' +
      '</div>' +
      '<div class="rephrase-slip-quote">' + escapeHtml(item.text) + '</div>';
    btn.addEventListener("click", function () {
      applyRephraseSlip(item);
    });
    grid.appendChild(btn);
  });
  tray.classList.remove("hidden");
  if (typeof indieFlow !== "undefined" && typeof indieFlow.syncAnimatedGuideCues === "function") {
    indieFlow.syncAnimatedGuideCues();
  }
  return slips;
}

function extractPlayerVerbatimAnchor(rawText, targetSeat) {
  const clean = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const tId = targetSeat && typeof targetSeat === "object" ? targetSeat.id : Number(targetSeat || 0);
  const tSeatObj = (targetSeat && typeof targetSeat === "object") ? targetSeat : (tId && typeof getSeat === "function" ? getSeat(tId) : null);
  const tName = tSeatObj ? String(tSeatObj.name || "") : "";
  const clauses = clean.split(/[，。！？；;\n]+/).map(function (c) {
    return c.replace(/^[欸喂哈喔嗯那其實我覺得老實說先說一下]+/, "").trim();
  }).filter(function (c) { return c.length >= 4; });
  if (!clauses.length) return clean.slice(0, 16);

  const mentionsTarget = function (c) {
    if (!tId) return false;
    const reNum = new RegExp("(?:^|\\D)0?" + tId + "\\s*號");
    return reNum.test(c) || (tName && c.indexOf(tName) !== -1);
  };
  const isQuestionOrChallenge = function (c) {
    return /[？?]|為何|為什麼|怎麼|哪裡|根據|解釋|棄票|改票|保他|護航|矛盾|對不上|破綻|帶風向|狼坑|可疑|漏洞|理由/.test(c);
  };

  let picked = clauses.find(function (c) { return mentionsTarget(c) && isQuestionOrChallenge(c); })
    || clauses.find(function (c) { return mentionsTarget(c); })
    || clauses.find(function (c) { return isQuestionOrChallenge(c); })
    || clauses[0];

  if (picked.length > 18) {
    picked = picked.slice(0, 18);
  }
  return picked;
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

  const canRewriteLlm = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey);
  if (canRewriteLlm && text.length > 0) {
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
    spawnFx(seatId, next.label, "#fbbf24");
  }
  renderPlayerPitBuilder();
  if (typeof renderListenPitBar === "function") renderListenPitBar();
  if (typeof renderSeatStrip === "function") renderSeatStrip();
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
  const wLen = d.wolfIds ? d.wolfIds.length : 0;
  const gLen = d.goodIds ? d.goodIds.length : 0;
  const baseLbl = isWolf ? "佈局／獵神" : "排坑／亮牌";
  let countTag = "";
  if (wLen > 0 || gLen > 0) {
    countTag = isWolf
      ? (" (" + (wLen ? (wLen + "甩") : "") + (wLen && gLen ? "·" : "") + (gLen ? (gLen + "保") : "") + ")")
      : (" (" + (gLen ? (gLen + "好") : "") + (gLen && wLen ? "·" : "") + (wLen ? (wLen + "狼") : "") + ")");
  }
  const textLabel = baseLbl + countTag + (isOpen ? " ▴" : " ▾");
  if (typeof shIcon === "function") {
    btn.innerHTML = shIcon(isWolf ? "mask" : "puzzle", "gold") + escapeHtml(textLabel);
  } else {
    btn.textContent = textLabel;
  }
  btn.classList.toggle("is-active", isOpen);
}

function createEmptyPlayerDraftPits() {
  return {
    wolfIds: [],
    goodIds: [],
    claimRole: null,
    standSeerId: null,
    evidenceClueId: null,
    badgeFlowFirstId: null,
    badgeFlowSecondId: null,
    composedModules: [],
    _lastAutoPitText: "",
    turnKey: "",
    _stagedWhileListening: false
  };
}

function joinSpeechClauses(existingText, additionText) {
  const cur = String(existingText || "").trim();
  const add = String(additionText || "").trim();
  if (!add) return cur;
  if (!cur) return add;
  if (cur.indexOf(add) !== -1) return cur;
  const sep = /[。！？\n]$/.test(cur) ? " " : "，";
  return cur + sep + add;
}

function removeSpeechClause(fullText, clauseText) {
  const full = String(fullText || "");
  const clause = String(clauseText || "").trim();
  if (!full || !clause) return full.trim();
  const idx = full.indexOf(clause);
  if (idx === -1) return full.trim();
  const before = full.slice(0, idx).replace(/[，、；：\s]+$/, "");
  const after = full.slice(idx + clause.length).replace(/^[，、；：\s]+/, "");
  if (!before) return after.trim();
  if (!after) return before.trim();
  const sep = /[。！？\n]$/.test(before) ? " " : "，";
  return (before + sep + after).trim();
}

function syncPlayerMarksFromDraftPits(dArg) {
  if (!state.match || !state.match.started) return;
  const d = dArg || state.match.playerDraftPits;
  if (!d) return;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  if (!state.playerMarks) state.playerMarks = {};
  getAliveSeats().forEach(function (s) {
    if (s.id === pid) return;
    if (isWolfPlayer && s.role === "wolf") return;
    if (Array.isArray(d.wolfIds) && d.wolfIds.indexOf(s.id) !== -1) {
      state.playerMarks[s.id] = "wolf";
    } else if (Array.isArray(d.goodIds) && d.goodIds.indexOf(s.id) !== -1) {
      state.playerMarks[s.id] = "good";
    } else {
      delete state.playerMarks[s.id];
    }
  });
}

function getActiveListenSpeakerId() {
  if (!state.match) return null;
  const p = state.match.phase;
  const shCtx = state.match.sheriffElectionCtx;
  if (p === "SHERIFF_ELECTION" && shCtx && shCtx.stage === "speech") {
    return shCtx.activeReelSeatId || null;
  }
  if (p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") {
    return state.activeSpeakerId || null;
  }
  return null;
}

function isListenPitPhaseActive() {
  if (!state.match || !state.match.started) return false;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  if (!player || !player.alive) return false;
  if (typeof isSpectatorGuessActive === "function" && isSpectatorGuessActive()) return false;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const p = state.match.phase;
  if (p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") {
    return Boolean(state.activeSpeakerId && state.activeSpeakerId !== pid);
  }
  if (p === "SHERIFF_ELECTION") {
    const shCtx = state.match.sheriffElectionCtx;
    return Boolean(shCtx && shCtx.stage === "speech" && shCtx.activeReelSeatId && shCtx.activeReelSeatId !== pid);
  }
  return false;
}

function syncDraftPitFromPlayerMark(seatId, markVal) {
  if (!state.match || !state.match.started) return;
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  const seat = typeof getSeat === "function" ? getSeat(seatId) : null;
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  if (!seat || !seat.alive || seatId === pid) return;
  if (isWolfPlayer && seat.role === "wolf") return;
  const d = ensurePlayerDraftPits(true);
  const wolfCap = getPlayerWolfPitCap();
  d.wolfIds = (d.wolfIds || []).filter(function (id) { return id !== seatId; });
  d.goodIds = (d.goodIds || []).filter(function (id) { return id !== seatId; });
  if (markVal === "wolf") {
    d.wolfIds.push(seatId);
    while (d.wolfIds.length > wolfCap) {
      const droppedId = d.wolfIds.shift();
      if (droppedId && state.playerMarks) delete state.playerMarks[droppedId];
    }
  } else if (markVal === "good") {
    d.goodIds.push(seatId);
  }
  if (state.match.phase !== "DAY_PLAYER_TURN") {
    d._stagedWhileListening = true;
  }
  if (state.match.phase === "DAY_PLAYER_TURN") {
    syncDraftSpeechToInput();
    renderPlayerPitBuilder();
  } else if (isListenPitPhaseActive()) {
    renderListenPitBar();
  }
}

function refreshPitAllSurfaces(slotView, dualWorlds) {
  renderPlayerPitBuilder(slotView, dualWorlds);
  if (typeof renderListenPitBar === "function") renderListenPitBar();
  if (typeof invalidate3DOverlayCache === "function") invalidate3DOverlayCache();
  if (typeof renderSeatStrip === "function") renderSeatStrip();
  if (typeof renderPlayerRoleCard === "function") renderPlayerRoleCard();
  if (state.match && state.match.phase === "DAY_SPEECH" && typeof renderStepperPanel === "function") {
    renderStepperPanel("DAY_SPEECH");
  }
  if (typeof renderSeatIntelPopover === "function") renderSeatIntelPopover();
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
    const prev = state.match.playerDraftPits;
    const fresh = createEmptyPlayerDraftPits();
    fresh.turnKey = turnKey;
    const isValidKeepSeat = function (id) {
      if (!id || id === pid) return false;
      const s = getSeat(id);
      return Boolean(s && s.alive && !(isWolfPlayer && s.role === "wolf"));
    };
    if (prev && prev.turnKey === "") {
      (Array.isArray(prev.wolfIds) ? prev.wolfIds : []).forEach(function (id) {
        if (isValidKeepSeat(id) && fresh.wolfIds.indexOf(id) === -1 && fresh.wolfIds.length < wolfCap) {
          fresh.wolfIds.push(id);
        }
      });
      (Array.isArray(prev.goodIds) ? prev.goodIds : []).forEach(function (id) {
        if (isValidKeepSeat(id) && fresh.wolfIds.indexOf(id) === -1 && fresh.goodIds.indexOf(id) === -1) {
          fresh.goodIds.push(id);
        }
      });
      if (prev.claimRole) fresh.claimRole = prev.claimRole;
      if (prev.standSeerId) {
        const ss = getSeat(prev.standSeerId);
        if (ss && ss.alive && prev.standSeerId !== pid) fresh.standSeerId = prev.standSeerId;
      }
      if (prev.evidenceClueId) fresh.evidenceClueId = prev.evidenceClueId;
      if (prev.badgeFlowFirstId) {
        const bf1 = getSeat(prev.badgeFlowFirstId);
        if (bf1 && bf1.alive && prev.badgeFlowFirstId !== pid) {
          fresh.badgeFlowFirstId = prev.badgeFlowFirstId;
          if (prev.badgeFlowSecondId && prev.badgeFlowSecondId !== prev.badgeFlowFirstId) {
            const bf2 = getSeat(prev.badgeFlowSecondId);
            if (bf2 && bf2.alive && prev.badgeFlowSecondId !== pid) fresh.badgeFlowSecondId = prev.badgeFlowSecondId;
          }
        }
      }
      if (prev.loadedTag) fresh.loadedTag = prev.loadedTag;
      if (prev._stagedWhileListening) fresh._stagedWhileListening = true;
    }
    if (seedIfNewTurn) {
      getAliveSeats().forEach(function (s) {
        if (s.id === pid) return;
        if (isWolfPlayer && s.role === "wolf") return;
        if (fresh.wolfIds.indexOf(s.id) !== -1 || fresh.goodIds.indexOf(s.id) !== -1) return;
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

  const m = state.match;
  const nightOut = Array.isArray(m.lastNightCasualties) ? m.lastNightCasualties : [];
  if (parts.length === 0 && m.day >= 2) {
    if (nightOut.length === 0) {
      parts.push("昨晚是平安夜（大機率奉茶師護人或守衛守中），我幫大家對齊一下今天盤面：");
    } else {
      const deadLbl = nightOut.map(function (id) {
        const ds = getSeat(id);
        return fmtSeatNum(id) + "號" + (ds ? ds.name : "");
      }).join("、");
      parts.push("昨夜 " + deadLbl + " 倒牌，結合前面的發言與票型我直接點坑：");
    }
  }

  if (d.standSeerId) {
    const ss = getSeat(d.standSeerId);
    parts.push("雙觀察員對跳我站邊 " + fmtSeatNum(d.standSeerId) + "號" + (ss ? ss.name : "") + " 的視角！");
  }

  if (d.evidenceClueId) {
    const clue = (m.pinnedClues || []).find(function (c) { return c && c.id === d.evidenceClueId; });
    if (clue && clue.summary) {
      parts.push(clue.summary + " ");
    } else if (clue && clue.seatId) {
      parts.push("我直接點出 " + fmtSeatNum(clue.seatId) + "號 的前後矛盾破綻！");
    }
  }

  const pubMatrix = (m.day >= 2 && typeof buildVoteSpeechMatrix === "function") ? buildVoteSpeechMatrix(null) : null;
  if (isWolfPlayer) {
    if (d.goodIds.length > 0) {
      parts.push("聽下來我覺得 " + fmtList(d.goodIds) + " 發言挺誠懇、立場也乾淨，這輪我先放進好人視角力挺；");
    }
    if (d.wolfIds.length > 0) {
      const w0 = d.wolfIds[0];
      const hasDiv = Boolean(pubMatrix && pubMatrix.divergenceBySeat && pubMatrix.divergenceBySeat[w0]);
      const extraTag = hasDiv ? "（前後發言跟昨天落票明顯對不上）" : "";
      parts.push("反觀 " + fmtList(d.wolfIds) + extraTag + " 的邏輯漏洞最多，我認為最值得懷疑，建議大家今天集中檢視並優先投票給 " + fmtSeatNum(w0) + "號！");
    }
  } else {
    if (d.goodIds.length > 0) {
      parts.push("好人坑我先保 " + fmtList(d.goodIds) + (d.goodIds.length >= 3 ? (" 等 " + d.goodIds.length + " 位（視角乾淨、立場真誠）；") : "（視角乾淨、立場真誠）；"));
    }
    if (d.wolfIds.length > 0) {
      const reasons = [];
      const w0 = d.wolfIds[0];
      if (pubMatrix && pubMatrix.divergenceBySeat && pubMatrix.divergenceBySeat[w0]) {
        reasons.push("昨天言票嚴重分裂");
      }
      const shRec = m.sheriffVoteRecord || null;
      if (shRec) {
        const w0Ballot = (shRec.ballots || []).find(function (b) { return b && b.voterId === w0 && b.targetId; });
        if (w0Ballot) {
          const bt = getSeat(w0Ballot.targetId);
          reasons.push("警長競選時警下投給 " + fmtSeatNum(w0Ballot.targetId) + "號" + (bt ? bt.name : ""));
        } else if (Array.isArray(shRec.withdrawnIds) && shRec.withdrawnIds.indexOf(w0) !== -1) {
          reasons.push("警上突然退水動機可疑");
        }
      }
      const shReason = reasons.length ? ("（" + reasons.join("，且") + "）") : "";
      parts.push("狼坑目前鎖定 " + fmtList(d.wolfIds) + shReason + "，破綻最明顯，建議好人齊心歸票優先請 " + fmtSeatNum(w0) + "號 離席！");
    }
  }

  if (d.badgeFlowFirstId && getSeat(d.badgeFlowFirstId) && getSeat(d.badgeFlowFirstId).alive) {
    const f1s = getSeat(d.badgeFlowFirstId);
    const f2s = (d.badgeFlowSecondId && d.badgeFlowSecondId !== d.badgeFlowFirstId) ? getSeat(d.badgeFlowSecondId) : null;
    const f1Str = fmtSeatNum(f1s.id) + "號" + f1s.name;
    const f2Str = (f2s && f2s.alive) ? (fmtSeatNum(f2s.id) + "號" + f2s.name) : "";
    parts.push(
      f2Str
        ? (" 今晚警徽流改留先驗 " + f1Str + "、再驗 " + f2Str + "（我若倒牌，徽給" + fmtSeatNum(f1s.id) + "號即金水、飛" + fmtSeatNum(f2s.id) + "號或撕徽即查殺）！")
        : (" 今晚警徽流鎖定 " + f1Str + "（我若倒牌，徽給他即金水、撕徽即查殺）！")
    );
  }

  return parts.join("").trim();
}

function autoResizeSpeechTextarea(elNode) {
  if (elNode && elNode.style && typeof elNode.scrollHeight === "number") {
    elNode.style.height = "auto";
    const h = Math.max(58, Math.min(132, elNode.scrollHeight || 58));
    elNode.style.height = h + "px";
  }
  if (elNode && elNode.id === "quickFreeInput" && el("btnClearSpeechDraft")) {
    const hasTxt = Boolean((elNode.value || "").trim());
    const dNow = (state.match && state.match.playerDraftPits) || null;
    const hasPit = Boolean(dNow && (
      (dNow.wolfIds && dNow.wolfIds.length > 0) ||
      (dNow.goodIds && dNow.goodIds.length > 0) ||
      dNow.claimRole || dNow.standSeerId || dNow.evidenceClueId || dNow.badgeFlowFirstId
    ));
    el("btnClearSpeechDraft").classList.toggle("hidden", !hasTxt && !hasPit);
  }
}

function updateQuickFreeSendLabel(dArg, playerArg) {
  const btnSend = el("btnQuickFreeSend");
  if (!btnSend) return;
  const d = dArg || (state.match && state.match.playerDraftPits) || createEmptyPlayerDraftPits();
  const player = playerArg || (typeof getPlayerSeat === "function" ? getPlayerSeat() : null);
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  const wLen = (d.wolfIds || []).length;
  const gLen = (d.goodIds || []).length;
  if (wLen || gLen) {
    const wTag = isWolfPlayer ? "甩" : "狼";
    const gTag = isWolfPlayer ? "保" : "好";
    btnSend.textContent = "送出陳詞 · " + (wLen ? (wLen + wTag) : "") + (wLen && gLen ? "·" : "") + (gLen ? (gLen + gTag) : "");
  } else {
    btnSend.textContent = "送出陳詞";
  }
}

function syncDraftSpeechToInput() {
  const d = (state.match && state.match.playerDraftPits) || createEmptyPlayerDraftPits();
  const composed = composePlayerPitSpeechText();
  const qIn = el("quickFreeInput");
  const pIn = el("playerSpeechInput");
  const hasComposedMods = Boolean(Array.isArray(d.composedModules) && d.composedModules.length > 0);
  const curVal = qIn ? String(qIn.value || "").trim() : "";
  let nextText = composed;
  if (hasComposedMods && curVal) {
    let base = curVal;
    if (d._lastAutoPitText && base.indexOf(d._lastAutoPitText) !== -1) {
      base = removeSpeechClause(base, d._lastAutoPitText);
    }
    if (composed && base.indexOf(composed) === -1) {
      // Only append pit delta if composed introduces new seat refs or role info not already in base
      const missingPitNote = (d.wolfIds || []).some(function (id) { return base.indexOf(id + "號") === -1; })
        || (d.goodIds || []).some(function (id) { return base.indexOf(id + "號") === -1; })
        || (d.claimRole && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[d.claimRole] && base.indexOf(ROLE_DEFS[d.claimRole].name) === -1);
      if (missingPitNote) {
        nextText = joinSpeechClauses(base, composed);
        d._lastAutoPitText = composed;
      } else {
        nextText = base;
        d._lastAutoPitText = "";
      }
    } else {
      nextText = base;
    }
  } else {
    d._lastAutoPitText = composed;
  }
  if (qIn) qIn.value = nextText;
  if (pIn) pIn.value = nextText;
  state.match.rewriteCritReady = false;
  const player = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
  updateQuickFreeSendLabel(d, player);
  autoResizeSpeechTextarea(qIn);
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
    showToast("這是你的狼隊同伴，不需要點進甩鍋目標！", "warn");
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
  syncPlayerMarksFromDraftPits(d);
  if (state.match.phase !== "DAY_PLAYER_TURN") d._stagedWhileListening = true;
  syncDraftSpeechToInput();
  refreshPitAllSurfaces();
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
  syncPlayerMarksFromDraftPits(d);
  if (state.match.phase !== "DAY_PLAYER_TURN") d._stagedWhileListening = true;
  syncDraftSpeechToInput();
  refreshPitAllSurfaces();
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
  syncPlayerMarksFromDraftPits(d);
  if (state.match.phase !== "DAY_PLAYER_TURN") d._stagedWhileListening = true;
  syncDraftSpeechToInput();
  refreshPitAllSurfaces();
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
  syncPlayerMarksFromDraftPits(d);
  if (state.match.phase !== "DAY_PLAYER_TURN") d._stagedWhileListening = true;
  syncDraftSpeechToInput();
  refreshPitAllSurfaces(null, dualWorlds);
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
  syncPlayerMarksFromDraftPits(d);
  if (state.match.phase !== "DAY_PLAYER_TURN") d._stagedWhileListening = true;
  syncDraftSpeechToInput();
  refreshPitAllSurfaces();
}

function clearPlayerDraftPits() {
  if (!state.match) return;
  const oldKey = state.match.playerDraftPits ? state.match.playerDraftPits.turnKey : "";
  const fresh = createEmptyPlayerDraftPits();
  fresh.turnKey = oldKey;
  fresh._stagedWhileListening = false;
  state.match.playerDraftPits = fresh;
  state.match.pendingEvidenceTargetId = null;
  state.match.pendingEvidenceClueId = null;
  state.match.rewriteCritReady = false;
  syncPlayerMarksFromDraftPits(fresh);
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  syncQuickSpeechCardLoadStates(fresh);
  updateQuickFreeSendLabel(fresh, getPlayerSeat());
  autoResizeSpeechTextarea(el("quickFreeInput"));
  if (typeof refreshQuickFreeInputHint === "function") refreshQuickFreeInputHint();
  if (typeof refreshLiveNlpUI === "function") refreshLiveNlpUI();
  refreshPitAllSurfaces();
}

function syncQuickSpeechCardLoadStates(dArg) {
  const chipsBox = el("quickSpeechChips");
  if (!chipsBox) return;
  const d = dArg || (state.match && state.match.playerDraftPits) || createEmptyPlayerDraftPits();
  const mods = Array.isArray(d.composedModules) ? d.composedModules : [];
  const modKeys = {};
  mods.forEach(function (m) { if (m && m.key) modKeys[m.key] = true; });
  const cardNodes = Array.from(chipsBox.children || chipsBox._children || []);
  cardNodes.forEach(function (cardNode) {
    const key = cardNode.getAttribute ? cardNode.getAttribute("data-card-key") : "";
    const active = Boolean(key && modKeys[key]);
    if (cardNode.classList) cardNode.classList.toggle("is-draft-loaded", active);
    const loadBadge = typeof cardNode.querySelector === "function" ? cardNode.querySelector("[data-card-load]") : null;
    if (loadBadge) loadBadge.textContent = active ? "已加入" : "加入";
  });
}

function loadQuickCardIntoAdvancedEditor(item, cardBtn, slotView, dualWorlds) {
  if (!state.match || !state.match.started || !item) return { added: false };
  const player = getPlayerSeat();
  if (!player) return { added: false };
  const pid = getPlayerId();
  const isWolfPlayer = Boolean(!state.hidePlayerRole && player.role === "wolf");
  const wolfCap = getPlayerWolfPitCap();
  const d = ensurePlayerDraftPits(false);
  if (!Array.isArray(d.composedModules)) d.composedModules = [];

  const isValidTarget = function (id) {
    if (!id || id === pid) return false;
    const s = getSeat(id);
    return Boolean(s && s.alive && !(isWolfPlayer && s.role === "wolf"));
  };
  const modKey = (item.tgTag || "") + "::" + (item.label || "");
  const existingIdx = d.composedModules.findIndex(function (m) { return m && m.key === modKey; });
  const qIn = el("quickFreeInput");
  const curInputText = qIn ? String(qIn.value || "") : "";
  const clause = String(item.text || "").trim();

  let added = true;
  if (existingIdx !== -1 && (!clause || curInputText.indexOf(clause) !== -1)) {
    // Untoggle this module cleanly while keeping all other assembled modules intact!
    added = false;
    const removedMod = d.composedModules.splice(existingIdx, 1)[0];
    const nextText = removeSpeechClause(curInputText, clause);
    if (qIn) qIn.value = nextText;
    if (el("playerSpeechInput")) el("playerSpeechInput").value = nextText;

    const stillNeedWolf = {};
    const stillNeedGood = {};
    let stillClaimRole = null;
    let stillStandSeer = null;
    let stillEvMod = null;
    d.composedModules.forEach(function (m) {
      (m.addedWolfIds || []).forEach(function (id) { stillNeedWolf[id] = true; });
      (m.addedGoodIds || []).forEach(function (id) { stillNeedGood[id] = true; });
      if (m.setClaimRole) stillClaimRole = m.setClaimRole;
      if (m.setStandSeerId) stillStandSeer = m.setStandSeerId;
      if (m.evidenceClueId) stillEvMod = m;
    });
    if (removedMod) {
      d.wolfIds = (d.wolfIds || []).filter(function (id) {
        return (removedMod.addedWolfIds || []).indexOf(id) === -1 || stillNeedWolf[id];
      });
      d.goodIds = (d.goodIds || []).filter(function (id) {
        return (removedMod.addedGoodIds || []).indexOf(id) === -1 || stillNeedGood[id];
      });
      if (removedMod.setClaimRole && d.claimRole === removedMod.setClaimRole && !stillClaimRole) {
        d.claimRole = null;
      }
      if (removedMod.setStandSeerId && d.standSeerId === removedMod.setStandSeerId && !stillStandSeer) {
        d.standSeerId = null;
      }
      if (removedMod.evidenceClueId && d.evidenceClueId === removedMod.evidenceClueId) {
        d.evidenceClueId = stillEvMod ? stillEvMod.evidenceClueId : null;
      }
    }
    state.match.pendingEvidenceTargetId = stillEvMod ? (stillEvMod.evidenceTargetId || null) : null;
    state.match.pendingEvidenceClueId = stillEvMod ? (stillEvMod.evidenceClueId || null) : null;
  } else {
    // Compose & merge this module onto the existing draft (never wipe prior cards!)
    if (existingIdx !== -1) d.composedModules.splice(existingIdx, 1);
    const patch = item.draftPatch || {};
    const addedWolfIds = [];
    const addedGoodIds = [];

    (Array.isArray(patch.wolfIds) ? patch.wolfIds : []).forEach(function (id) {
      if (!isValidTarget(id)) return;
      d.goodIds = (d.goodIds || []).filter(function (g) { return g !== id; });
      if (d.wolfIds.indexOf(id) === -1 && d.wolfIds.length < wolfCap) {
        d.wolfIds.push(id);
      }
      if (addedWolfIds.indexOf(id) === -1) addedWolfIds.push(id);
    });
    (Array.isArray(patch.goodIds) ? patch.goodIds : []).forEach(function (id) {
      if (!isValidTarget(id) || d.wolfIds.indexOf(id) !== -1) return;
      if (d.goodIds.indexOf(id) === -1) d.goodIds.push(id);
      if (addedGoodIds.indexOf(id) === -1) addedGoodIds.push(id);
    });

    if (addedWolfIds.length === 0 && addedGoodIds.length === 0 && clause) {
      const inferred = analyzeThreeGoodSpeech(clause);
      (inferred.accuseTargets || []).forEach(function (id) {
        if (isValidTarget(id) && d.wolfIds.indexOf(id) === -1 && d.wolfIds.length < wolfCap) {
          d.goodIds = (d.goodIds || []).filter(function (g) { return g !== id; });
          d.wolfIds.push(id);
          addedWolfIds.push(id);
        }
      });
      (inferred.vouchTargets || []).forEach(function (id) {
        if (isValidTarget(id) && d.wolfIds.indexOf(id) === -1 && d.goodIds.indexOf(id) === -1) {
          d.goodIds.push(id);
          addedGoodIds.push(id);
        }
      });
    }

    let setClaimRole = null;
    if (patch.claimRole) {
      d.claimRole = patch.claimRole;
      setClaimRole = patch.claimRole;
    }
    let setStandSeerId = null;
    if (patch.standSeerId && getSeat(patch.standSeerId) && getSeat(patch.standSeerId).alive) {
      d.standSeerId = patch.standSeerId;
      setStandSeerId = patch.standSeerId;
    }
    const evId = patch.evidenceClueId || (item.isEvidenceCard ? item.evidenceClueId : null);
    if (evId) d.evidenceClueId = evId;

    const bf1Id = parseInt(patch.badgeFlowFirstId, 10) || null;
    const bf2Id = parseInt(patch.badgeFlowSecondId, 10) || null;
    if (bf1Id && bf1Id !== pid && getSeat(bf1Id) && getSeat(bf1Id).alive) {
      d.badgeFlowFirstId = bf1Id;
      if (bf2Id && bf2Id !== pid && bf2Id !== bf1Id && getSeat(bf2Id) && getSeat(bf2Id).alive) {
        d.badgeFlowSecondId = bf2Id;
      }
    }

    const evTgtId = item.isEvidenceCard ? item.evidenceTargetId : (evId ? (patch.evidenceTargetId || d.wolfIds[0] || null) : null);
    d.composedModules.push({
      key: modKey,
      tgKind: item.tgKind || "words",
      tgTag: item.tgTag || "模組",
      text: clause,
      isEvidenceCard: Boolean(item.isEvidenceCard),
      evidenceClueId: evId || null,
      evidenceTargetId: evTgtId,
      addedWolfIds: addedWolfIds,
      addedGoodIds: addedGoodIds,
      setClaimRole: setClaimRole,
      setStandSeerId: setStandSeerId
    });
    if (evId) {
      state.match.pendingEvidenceTargetId = evTgtId;
      state.match.pendingEvidenceClueId = evId;
    }

    // If user hasn't picked cards yet and textarea holds old raw auto-pit line, compose seamlessly
    let baseForJoin = curInputText;
    if (d._lastAutoPitText && baseForJoin.trim() === d._lastAutoPitText.trim() && d.composedModules.length === 1) {
      d._lastAutoPitText = "";
    }
    const nextText = joinSpeechClauses(baseForJoin, clause);
    if (qIn) qIn.value = nextText;
    if (el("playerSpeechInput")) el("playerSpeechInput").value = nextText;

    const adv = el("speechAdvancedDrawer");
    if (adv) adv.classList.remove("hidden");
  }

  d.loadedTag = d.composedModules.map(function (m) { return m.tgTag; }).join("＋") || "";
  syncPlayerMarksFromDraftPits(d);
  state.match.rewriteCritReady = false;

  refreshPitAllSurfaces(slotView, dualWorlds);
  syncSpeechAdvancedToggleLabel(player);

  const syncBar = el("pitTemplateSyncBar");
  const syncTxt = el("pitTemplateSyncText");
  if (syncBar) syncBar.classList.toggle("hidden", d.composedModules.length === 0);
  if (syncTxt && d.composedModules.length > 0) {
    syncTxt.textContent = "已組裝 " + d.composedModules.length + " 組（" + d.loadedTag + "）· 再點其他詞卡可疊加，點已選詞卡可移除，看完再按「陳詞送出」";
  }

  syncQuickSpeechCardLoadStates(d);

  if (qIn) {
    autoResizeSpeechTextarea(qIn);
    if (typeof qIn.focus === "function") qIn.focus();
    try {
      if (typeof qIn.setSelectionRange === "function") {
        qIn.setSelectionRange(qIn.value.length, qIn.value.length);
      }
    } catch (e) { }
  }
  updateQuickFreeSendLabel(d, player);
  refreshQuickFreeInputHint();
  refreshLiveNlpUI();
  return { added: added, count: d.composedModules.length };
}

function buildSeatSheriffBallotMap(shRec) {
  const shVotedMap = {};
  if (shRec && Array.isArray(shRec.ballots)) {
    shRec.ballots.forEach(function (b) {
      if (b && b.voterId && b.targetId) shVotedMap[b.voterId] = b.targetId;
    });
  }
  return shVotedMap;
}

function getSeatSheriffMicroTag(seatId, shRec, shVotedMap) {
  if (!shRec) return "";
  if (shRec.winnerId === seatId) return "警長";
  if (shVotedMap && shVotedMap[seatId]) return "投" + fmtSeatNum(shVotedMap[seatId]) + "警";
  if (Array.isArray(shRec.withdrawnIds) && shRec.withdrawnIds.indexOf(seatId) !== -1) return "退水";
  if (Array.isArray(shRec.candidateIds) && shRec.candidateIds.indexOf(seatId) !== -1) return "警上";
  return "";
}

function collectPitExtraActions(player, d, aliveOthers, slotViewArg, dualWorldsArg) {
  let slotView = slotViewArg;
  let dualWorlds = dualWorldsArg;
  if (!dualWorlds && slotView && slotView.dualSeerWorlds) {
    dualWorlds = slotView.dualSeerWorlds;
  }
  if (!dualWorlds && !slotView && typeof buildTableSlotAndWorldAnalysis === "function") {
    const aliveAll = getAliveSeats();
    const seenSeerIds = [];
    const seenSeerMap = {};
    aliveAll.forEach(function (s) {
      if (s.claimedRole === "seer" && !seenSeerMap[s.id]) {
        seenSeerMap[s.id] = true;
        seenSeerIds.push(s.id);
      }
    });
    const evSrc = state.match
      ? ((state.match.allSpeechEvents && state.match.allSpeechEvents.length) ? state.match.allSpeechEvents : (state.match.daySpeechEvents || []))
      : [];
    for (let ei = 0; ei < evSrc.length; ei++) {
      const ev = evSrc[ei];
      if (ev && (ev.claimRole === "seer" || ev.checkedWolfId || ev.checkedGoodId)) {
        const cs = getSeat(ev.speakerId);
        if (cs && cs.alive && !seenSeerMap[cs.id]) {
          seenSeerMap[cs.id] = true;
          seenSeerIds.push(cs.id);
        }
      }
    }
    if (seenSeerIds.length >= 2) {
      const bfLen = (state.match && Array.isArray(state.match.badgeFlowSignals)) ? state.match.badgeFlowSignals.length : 0;
      const dayEvLen = (state.match && Array.isArray(state.match.daySpeechEvents)) ? state.match.daySpeechEvents.length : 0;
      const cacheKey = [
        state.match ? state.match.day : 0,
        aliveAll.length,
        evSrc.length,
        dayEvLen,
        bfLen,
        state.match && state.match.sheriffVoteRecord ? 1 : 0,
        state.match && state.match.voteHistory ? state.match.voteHistory.length : 0,
        player ? player.id : 0,
        player && player.checkedHistory ? player.checkedHistory.length : 0,
        seenSeerIds.join(",")
      ].join("|");
      const cObj = state.match ? state.match._dualWorldsFastCache : null;
      if (cObj && cObj.key === cacheKey) {
        dualWorlds = cObj.dualWorlds;
      } else {
        slotView = buildTableSlotAndWorldAnalysis(player);
        dualWorlds = (slotView && slotView.dualSeerWorlds) ? slotView.dualSeerWorlds : null;
        if (state.match) {
          state.match._dualWorldsFastCache = { key: cacheKey, dualWorlds: dualWorlds };
        }
      }
    }
  }
  const pid = getPlayerId();
  const isWolfPlayer = Boolean(player && player.role === "wolf");
  const extras = [];
  if (player.role === "seer") {
    extras.push({ roleKey: "seer", label: "亮觀察員報驗", active: d.claimRole === "seer", onClick: function () { togglePlayerDraftRoleClaim("seer"); } });
  } else if (player.role === "witch") {
    extras.push({ roleKey: "witch", label: "亮奉茶師報銀水", active: d.claimRole === "witch", onClick: function () { togglePlayerDraftRoleClaim("witch"); } });
  } else if (player.role === "guard") {
    extras.push({ roleKey: "guard", label: "亮守衛報路線", active: d.claimRole === "guard", onClick: function () { togglePlayerDraftRoleClaim("guard"); } });
  } else if (player.role === "hunter") {
    extras.push({ roleKey: "hunter", label: "亮糾察長威懾", active: d.claimRole === "hunter", onClick: function () { togglePlayerDraftRoleClaim("hunter"); } });
  } else if (player.isElder) {
    extras.push({ roleKey: "elder", label: "亮清心長老穩局", active: d.claimRole === "elder", onClick: function () { togglePlayerDraftRoleClaim("elder"); } });
  } else if (player.role === "villager") {
    extras.push({ roleKey: "villager", label: "書院生理性歸票", active: d.claimRole === "villager", onClick: function () { togglePlayerDraftRoleClaim("villager"); } });
  } else if (player.role === "wolf") {
    extras.push({ roleKey: "seer", label: "悍跳觀察員", active: d.claimRole === "seer", onClick: function () { togglePlayerDraftRoleClaim("seer"); } });
    extras.push({ roleKey: "wolf_stealth", label: "低調裝好人", active: d.claimRole === "wolf_stealth", onClick: function () { togglePlayerDraftRoleClaim("wolf_stealth"); } });
  }

  if (!isWolfPlayer && d.wolfIds.length > 0) {
    const unmarkedCount = aliveOthers.filter(function (s) {
      return d.wolfIds.indexOf(s.id) === -1 && d.goodIds.indexOf(s.id) === -1;
    }).length;
    if (unmarkedCount > 0) {
      extras.push({
        label: "其餘 " + unmarkedCount + " 位全保好人",
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
      label: "呈堂證供 " + fmtSeatNum(contraClue.seatId) + "號",
      active: d.evidenceClueId === contraClue.id,
      onClick: function () { togglePlayerDraftEvidence(contraClue); }
    });
  }

  return { extras: extras, slotView: slotView, dualWorlds: dualWorlds };
}

function createWolfGodHuntRow(targetSeats, attrName, compactCss) {
  const huntRow = document.createElement("div");
  huntRow.className = "pit-extra-row wolf-god-hunt-row";
  const hLbl = document.createElement("span");
  hLbl.className = "text-[13px] font-bold text-amber-300/90 shrink-0";
  hLbl.textContent = "獵神筆記：";
  huntRow.appendChild(hLbl);
  const marks = (state.match && state.match.wolfGodMarks) || {};
  targetSeats.forEach(function (s) {
    const mDef = getWolfGodMarkDef(marks[s.id] || "");
    const hBtn = document.createElement("button");
    hBtn.type = "button";
    hBtn.setAttribute(attrName, String(s.id));
    hBtn.className = "wolf-god-chip" + (mDef.key ? " is-marked" : "");
    hBtn.title = "點擊標記你推測的真神職（僅狼隊自己可見，入夜時自動提醒）";
    hBtn.textContent = fmtSeatNum(s.id) + (mDef.label ? (" " + mDef.label) : " 標神");
    hBtn.addEventListener("click", function () {
      sound.unlock();
      cycleWolfGodMark(s.id);
    });
    huntRow.appendChild(hBtn);
  });
  return huntRow;
}

function renderPlayerPitBuilder(slotViewArg, dualWorldsArg) {
  const box = el("playerPitBuilder");
  if (!box) return;
  box.innerHTML = "";
  const player = getPlayerSeat();
  if (!state.match || !state.match.started || !player) return;

  const pid = getPlayerId();
  const isWolfPlayer = Boolean(!state.hidePlayerRole && player.role === "wolf");
  const d = ensurePlayerDraftPits(false);
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const targetSeats = isWolfPlayer
    ? aliveOthers.filter(function (s) { return s.role !== "wolf"; })
    : aliveOthers;

  box.classList.toggle("is-wolf-board", isWolfPlayer);
  box.classList.toggle("is-good-board", !isWolfPlayer);

  // Sheriff election ballot quick-reference strip (rendered in sibling #pitSheriffRefStrip so _children[0]/[1] stay invariant!)
  const shRec = state.match.sheriffVoteRecord || null;
  const shVotedMap = buildSeatSheriffBallotMap(shRec);
  const shRefStrip = el("pitSheriffRefStrip");
  if (shRefStrip) {
    shRefStrip.innerHTML = "";
    const activeBf = state.match.sheriffBadgeFlow || null;
    const bfSigs = Array.isArray(state.match.badgeFlowSignals) ? state.match.badgeFlowSignals : [];
    const latestSig = bfSigs.length > 0 ? bfSigs[bfSigs.length - 1] : null;
    if (shRec || activeBf || latestSig) {
      shRefStrip.classList.remove("hidden");
      const pieces = [];
      if (shRec) {
        const shGroups = {};
        (shRec.ballots || []).forEach(function (b) {
          if (b && b.voterId && b.targetId) {
            if (!shGroups[b.targetId]) shGroups[b.targetId] = [];
            shGroups[b.targetId].push(fmtSeatNum(b.voterId));
          }
        });
        const shParts = (shRec.candidateIds || []).map(function (cid) {
          const cs = getSeat(cid);
          const voters = shGroups[cid] || [];
          const cTag = (cid === shRec.winnerId ? "[警] " : "") + fmtSeatNum(cid) + (cs ? (cid === pid ? "你" : cs.name) : "號");
          return cTag + (voters.length ? ("←" + voters.join(",")) : "(無警下票)");
        });
        const withPart = (shRec.withdrawnIds || []).length
          ? ("｜退水：" + shRec.withdrawnIds.map(function (wid) { return fmtSeatNum(wid) + "號"; }).join("、"))
          : "";
        pieces.push("警長票型參考：" + (shParts.join(" ｜ ") || "直接推舉") + withPart);
      }
      const txtSpan = document.createElement("span");
      txtSpan.className = "pit-sheriff-text";
      txtSpan.textContent = pieces.join(" ∥ ") || "警徽流資訊";
      shRefStrip.appendChild(txtSpan);
      if (activeBf && activeBf.firstTargetId && typeof formatBadgeFlowSummary === "function") {
        const owLbl = typeof getSeatFlowLabel === "function" ? getSeatFlowLabel(activeBf.ownerId) : (fmtSeatNum(activeBf.ownerId) + "號");
        const bfPill = document.createElement("span");
        bfPill.className = "pit-bf-pill shrink-0";
        bfPill.textContent = "警徽流(" + owLbl + ")：" + formatBadgeFlowSummary(activeBf);
        shRefStrip.appendChild(bfPill);
      }
      if (latestSig && latestSig.headline) {
        const sigPill = document.createElement("span");
        sigPill.className = "pit-bf-pill shrink-0";
        sigPill.textContent = latestSig.headline;
        shRefStrip.appendChild(sigPill);
      }
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "cta-ink text-[13px] px-2 py-0.5 shrink-0";
      openBtn.textContent = "完整票型 ↗";
      openBtn.addEventListener("click", function () {
        sound.unlock();
        if (typeof openVoteSheetModal === "function") openVoteSheetModal();
      });
      shRefStrip.appendChild(openBtn);
    } else {
      shRefStrip.classList.add("hidden");
    }
  }

  // Interactive Daytime Badge-Flow Updater Bar (for alive Sheriff or Seer claimants!)
  const bfBar = el("pitBadgeFlowBar");
  if (bfBar) {
    bfBar.innerHTML = "";
    const isPlayerSheriffNow = Boolean(state.match.sheriffSeatId === pid);
    const showDayBf = Boolean(
      (state.sheriffMode || state.match.sheriffSeatId) &&
      (isPlayerSheriffNow || player.role === "seer" || d.claimRole === "seer")
    );
    if (showDayBf) {
      bfBar.classList.remove("hidden");
      const bfLbl = document.createElement("span");
      bfLbl.className = "font-bold shrink-0";
      bfLbl.textContent = isPlayerSheriffNow ? "留／改今晚警徽流：" : "預告警徽流：";
      bfBar.appendChild(bfLbl);

      const mkDayBfSel = function (selName, ph, curVal, exclId, onChg) {
        const sel = document.createElement("select");
        sel.className = "badge-flow-select";
        sel.name = selName;
        sel.setAttribute("aria-label", ph);
        const op0 = document.createElement("option");
        op0.value = "";
        op0.textContent = ph;
        sel.appendChild(op0);
        aliveOthers.forEach(function (s) {
          if (exclId && s.id === exclId) return;
          const op = document.createElement("option");
          op.value = String(s.id);
          op.textContent = fmtSeatNum(s.id) + "號 " + s.name;
          if (curVal === s.id) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener("change", function () {
          sound.unlock();
          onChg(parseInt(sel.value, 10) || null);
        });
        return sel;
      };
      const s1 = mkDayBfSel("dayBadgeFlow1", "第一警徽流（不改）", d.badgeFlowFirstId, null, function (v1) {
        d.badgeFlowFirstId = v1;
        if (!v1 || d.badgeFlowSecondId === v1) d.badgeFlowSecondId = null;
        syncDraftSpeechToInput();
        renderPlayerPitBuilder();
      });
      const arr = document.createElement("span");
      arr.textContent = "→";
      arr.className = "opacity-75 font-bold";
      const s2 = mkDayBfSel("dayBadgeFlow2", "第二警徽流（選填）", d.badgeFlowSecondId, d.badgeFlowFirstId, function (v2) {
        d.badgeFlowSecondId = v2;
        syncDraftSpeechToInput();
        renderPlayerPitBuilder();
      });
      bfBar.appendChild(s1);
      bfBar.appendChild(arr);
      bfBar.appendChild(s2);
    } else {
      bfBar.classList.add("hidden");
    }
  }

  // _children[0]: Primary seat targeting row (Wolf: Framing/Fake-Vouch on good seats ONLY; Good: Unlimited Good-Pit + Wolf-Pit)
  const seatRow = document.createElement("div");
  seatRow.className = "pit-seat-row";
  const lbl = document.createElement("span");
  lbl.className = "text-[13px] font-bold shrink-0 " + (isWolfPlayer ? "text-rose-300" : "text-amber-300/90");
  if (isWolfPlayer) {
    lbl.textContent = "甩鍋／假保：";
  } else {
    const wolfTotal = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
    lbl.textContent = "好人排坑 (" + d.goodIds.length + "好·" + d.wolfIds.length + "/" + wolfTotal + "狼)：";
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
    const shMicro = getSeatSheriffMicroTag(s.id, shRec, shVotedMap);
    if (shMicro) {
      const shTag = document.createElement("span");
      shTag.className = "pit-chip-sh-tag";
      shTag.textContent = shMicro;
      chip.appendChild(shTag);
    }
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

  if (d.wolfIds.length > 0 || d.goodIds.length > 0 || d.claimRole || d.standSeerId || d.evidenceClueId || d.badgeFlowFirstId) {
    const clrBtn = document.createElement("button");
    clrBtn.type = "button";
    clrBtn.className = "cta-link-quiet text-[13px] px-1.5 py-0.5 ml-auto";
    clrBtn.textContent = "↺ 清空";
    clrBtn.addEventListener("click", function () {
      sound.unlock();
      clearPlayerDraftPits();
    });
    seatRow.appendChild(clrBtn);
  }
  box.appendChild(seatRow);

  // _children[1]: Contextual Extra Row (Per-Role 1-Click Actions / Dual-Seer Stand / Evidence Proof / Quick Good-Fill)
  const extraCtx = collectPitExtraActions(player, d, aliveOthers, slotViewArg, dualWorldsArg);
  const extras = extraCtx.extras;

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
    box.appendChild(createWolfGodHuntRow(targetSeats, "data-wolf-god-seat", false));
  }
  syncSpeechAdvancedToggleLabel(player);
}

function getPlayerKnownMicroTag(player, seatId, shRec, shVotedMap) {
  if (!state.hidePlayerRole && player && player.role === "seer" && Array.isArray(player.checkedHistory)) {
    const hit = player.checkedHistory.slice().reverse().find(function (c) { return c && c.targetId === seatId; });
    if (hit) return hit.isWolf ? "查殺" : "金水";
  }
  if (!state.hidePlayerRole && player && player.role === "witch" && player.savedSeatId === seatId) {
    return "銀水";
  }
  return getSeatSheriffMicroTag(seatId, shRec, shVotedMap);
}

function formatListenDraftSummary(d, isWolfPlayer) {
  const parts = [];
  if (d.wolfIds && d.wolfIds.length > 0) {
    parts.push((isWolfPlayer ? "甩：" : "狼：") + d.wolfIds.map(function (id) { return fmtSeatNum(id); }).join("、"));
  }
  if (d.goodIds && d.goodIds.length > 0) {
    parts.push((isWolfPlayer ? "保：" : "好：") + d.goodIds.map(function (id) { return fmtSeatNum(id); }).join("、"));
  }
  if (d.claimRole) {
    const rLbl = d.claimRole === "wolf_stealth"
      ? "低調裝好人"
      : ((typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[d.claimRole]) ? ROLE_DEFS[d.claimRole].name : "");
    if (rLbl) parts.push("亮：" + rLbl);
  }
  return parts.length ? parts.join(" ｜ ") : "展開即可邊聽發言邊點選席位排坑";
}

function renderListenPitBar() {
  const host = el("listenPitBar");
  if (!host) return;
  if (!isListenPitPhaseActive()) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  const player = getPlayerSeat();
  if (!player) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }

  host.classList.remove("hidden");
  host.innerHTML = "";

  const pid = getPlayerId();
  const isWolfPlayer = Boolean(!state.hidePlayerRole && player.role === "wolf");
  const p = state.match.phase;
  const d = ensurePlayerDraftPits(true);
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const targetSeats = isWolfPlayer
    ? aliveOthers.filter(function (s) { return s.role !== "wolf"; })
    : aliveOthers;
  const activeListenId = getActiveListenSpeakerId();
  const shRec = state.match.sheriffVoteRecord || null;
  const shVotedMap = buildSeatSheriffBallotMap(shRec);
  const spokenTodayCount = (state.match.daySpeechEvents || []).filter(function (e) { return e && e.speakerId === pid; }).length;
  const hasWolfGodMarks = Boolean(isWolfPlayer && state.match.wolfGodMarks && Object.keys(state.match.wolfGodMarks).length > 0);
  const hasAnyDraft = Boolean(
    (d.wolfIds && d.wolfIds.length > 0) ||
    (d.goodIds && d.goodIds.length > 0) ||
    d.claimRole || d.standSeerId || d.evidenceClueId || d.badgeFlowFirstId
  );

  if (state.match && !state.match._listenPitDefaultApplied) {
    state.match._listenPitDefaultApplied = true;
    state.listenPitCollapsed = true;
  }

  host.classList.toggle("is-wolf-board", isWolfPlayer);
  host.classList.toggle("is-collapsed", Boolean(state.listenPitCollapsed));

  // Header strip
  const head = document.createElement("div");
  head.className = "listen-pit-head";

  const titleWrap = document.createElement("div");
  titleWrap.className = "listen-pit-title-wrap";
  const titleEl = document.createElement("span");
  titleEl.className = "listen-pit-title";
  if (isWolfPlayer) {
    titleEl.textContent = "狼隊密記 · " + d.wolfIds.length + "甩 " + d.goodIds.length + "保";
  } else {
    const wolfTotal = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
    titleEl.textContent = "邊聽邊記 · " + d.goodIds.length + "好 " + d.wolfIds.length + "/" + wolfTotal + "狼";
  }
  const subEl = document.createElement("span");
  subEl.className = "listen-pit-sub";
  if (state.listenPitCollapsed) {
    subEl.textContent = formatListenDraftSummary(d, isWolfPlayer);
  } else {
    subEl.textContent = "";
  }
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subEl);
  head.appendChild(titleWrap);

  const actions = document.createElement("div");
  actions.className = "listen-pit-actions";

  if (hasAnyDraft) {
    const clrBtn = document.createElement("button");
    clrBtn.type = "button";
    clrBtn.className = "cta-link-quiet listen-pit-tool-btn shrink-0";
    clrBtn.textContent = "清空";
    clrBtn.title = "清空目前好人／狼人標記與立場草稿";
    clrBtn.addEventListener("click", function () {
      sound.unlock();
      clearPlayerDraftPits();
    });
    actions.appendChild(clrBtn);
  }

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.setAttribute("data-listen-pit-toggle", "1");
  toggleBtn.setAttribute("aria-expanded", state.listenPitCollapsed ? "false" : "true");
  toggleBtn.className = "listen-pit-toggle-btn shrink-0";
  toggleBtn.textContent = state.listenPitCollapsed ? "展開" : "收合";
  toggleBtn.addEventListener("click", function () {
    sound.unlock();
    state.listenPitCollapsed = !state.listenPitCollapsed;
    if (typeof sound.tone === "function") sound.tone(state.listenPitCollapsed ? 440 : 540, 0.04, "triangle", 0.03, 0);
    renderListenPitBar();
  });
  actions.appendChild(toggleBtn);
  head.appendChild(actions);
  host.appendChild(head);

  // Mount body inside .listen-pit-body so collapsed bar stays 1 sleek line visually while keeping interactive DOM mounted
  const pitBody = document.createElement("div");
  pitBody.className = "listen-pit-body";

  // Row 1: Seat chips row
  const seatRow = document.createElement("div");
  seatRow.className = "pit-seat-row";
  targetSeats.forEach(function (s) {
    const isWolf = d.wolfIds.indexOf(s.id) !== -1;
    const isGood = d.goodIds.indexOf(s.id) !== -1;
    const isSpeakingNow = s.id === activeListenId;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.setAttribute("data-listen-pit-seat", String(s.id));
    chip.className = "pit-seat-chip"
      + (isWolf ? " is-wolf" : (isGood ? " is-good" : ""))
      + (isSpeakingNow ? " is-speaking-now" : "");
    chip.title = isWolfPlayer
      ? "點1下設為甩鍋目標・點2下假保拉票・點3下清除（狼同伴已自動排除）"
      : "點1下標狼坑・點2下標好人坑（好人坑不限人數！）・點3下清除";
    chip.textContent = fmtSeatNum(s.id) + s.name;

    const isWatchedNight = Boolean(Array.isArray(state.match.candlelitWatchIds) && state.match.candlelitWatchIds.indexOf(s.id) !== -1);
    const microTag = getPlayerKnownMicroTag(player, s.id, shRec, shVotedMap);
    if (isSpeakingNow) {
      const spTag = document.createElement("span");
      spTag.className = "pit-chip-live-tag";
      spTag.textContent = "發言中";
      chip.appendChild(spTag);
    } else if (isWatchedNight) {
      const wtTag = document.createElement("span");
      wtTag.className = "pit-chip-watch-tag";
      wtTag.textContent = "燭防";
      chip.appendChild(wtTag);
    } else if (microTag) {
      const mTagEl = document.createElement("span");
      mTagEl.className = "pit-chip-sh-tag";
      mTagEl.textContent = microTag;
      chip.appendChild(mTagEl);
    }
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
  pitBody.appendChild(seatRow);

  // Row 2: Role claim / fill remaining / dual-seer stand / contradiction evidence
  const extraCtx = collectPitExtraActions(player, d, aliveOthers, null, null);
  if (extraCtx.extras.length > 0) {
    const exRow = document.createElement("div");
    exRow.className = "pit-extra-row";
    extraCtx.extras.forEach(function (ex) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pit-extra-chip" + (ex.active ? " is-active" : "");
      if (ex.standId) btn.setAttribute("data-listen-pit-stand", String(ex.standId));
      if (ex.roleKey) btn.setAttribute("data-listen-pit-role", String(ex.roleKey));
      btn.textContent = ex.label;
      btn.addEventListener("click", function () {
        sound.unlock();
        ex.onClick();
      });
      exRow.appendChild(btn);
    });
    pitBody.appendChild(exRow);
  }

  // Row 3 (Wolf-only): Secret God-Hunt Notebook
  if (isWolfPlayer && targetSeats.length > 0) {
    pitBody.appendChild(createWolfGodHuntRow(targetSeats, "data-listen-wolf-god", true));
  }

  // Row 4: Single-line live draft speech preview before player's turn
  if (spokenTodayCount === 0 && p !== "LAST_WORDS_SPEECH" && hasAnyDraft) {
    const previewTxt = composePlayerPitSpeechText();
    if (previewTxt) {
      const prevEl = document.createElement("div");
      prevEl.className = "listen-pit-preview";
      prevEl.title = previewTxt;
      prevEl.textContent = "待發陳詞預覽：" + previewTxt;
      pitBody.appendChild(prevEl);
    }
  } else if (hasWolfGodMarks && !hasAnyDraft && isWolfPlayer) {
    const tipEl = document.createElement("div");
    tipEl.className = "listen-pit-preview";
    tipEl.textContent = "獵神筆記僅狼隊自己可見，入夜鎖定時將自動提醒";
    pitBody.appendChild(tipEl);
  }
  host.appendChild(pitBody);
}

function buildPlayerSmartBoardContext(player, sampleTarget, slotView, dualWorlds) {
  const m = state.match || {};
  const pid = getPlayerId();
  const aliveOthers = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const dayEvs = Array.isArray(m.daySpeechEvents) ? m.daySpeechEvents : [];
  const todayEvBySeat = {};
  dayEvs.forEach(function (ev) {
    if (ev && ev.speakerId && ev.speakerId !== pid) todayEvBySeat[ev.speakerId] = ev;
  });

  const pubMatrix = (m.day >= 2 && typeof buildVoteSpeechMatrix === "function") ? buildVoteSpeechMatrix(null) : null;
  const divMap = (pubMatrix && pubMatrix.divergenceBySeat) ? pubMatrix.divergenceBySeat : {};
  let contraSeat = null;
  aliveOthers.forEach(function (s) {
    if (player && player.role === "wolf" && s.role === "wolf") return;
    if (divMap[s.id] && (!contraSeat || divMap[s.id] > (divMap[contraSeat.id] || 0))) {
      contraSeat = s;
    }
  });

  const shRec = m.sheriffVoteRecord || null;
  const getSheriffClue = function (seatId) {
    if (!shRec || !seatId) return "";
    if (shRec.winnerId === seatId) return "身戴警徽";
    const b = (shRec.ballots || []).find(function (x) { return x && x.voterId === seatId && x.targetId; });
    if (b) {
      const bt = getSeat(b.targetId);
      const btName = bt ? (fmtSeatNum(bt.id) + "號" + bt.name) : (fmtSeatNum(b.targetId) + "號");
      if (dualWorlds && dualWorlds.chosenWorld && dualWorlds.chosenWorld.fakeSeer && dualWorlds.chosenWorld.fakeSeer.id === b.targetId) {
        return "警下衝票給假觀察員 " + btName;
      }
      return "警下投給 " + btName;
    }
    if (Array.isArray(shRec.withdrawnIds) && shRec.withdrawnIds.indexOf(seatId) !== -1) {
      return "警上臨時退水";
    }
    return "";
  };

  const getTodayStanceDesc = function (seatId) {
    const ev = todayEvBySeat[seatId];
    if (!ev) return "";
    if (ev.claimRole && ROLE_DEFS[ev.claimRole]) {
      return "剛才起跳 " + ROLE_DEFS[ev.claimRole].name;
    }
    if (ev.accuseId) {
      const ac = getSeat(ev.accuseId);
      return "剛才點打 " + (ev.accuseId === pid ? "我" : (fmtSeatNum(ev.accuseId) + "號" + (ac ? ac.name : "")));
    }
    if (ev.vouchId) {
      const vc = getSeat(ev.vouchId);
      return "剛才力挺 " + (ev.vouchId === pid ? "我" : (fmtSeatNum(ev.vouchId) + "號" + (vc ? vc.name : "")));
    }
    return "";
  };

  let accuserOfMe = null;
  for (let i = dayEvs.length - 1; i >= 0; i--) {
    const ev = dayEvs[i];
    if (!ev || ev.speakerId === pid) continue;
    const hitMe = ev.accuseId === pid || (Array.isArray(ev.wolfPits) && ev.wolfPits.indexOf(pid) !== -1);
    if (hitMe) {
      const sp = getSeat(ev.speakerId);
      if (sp && sp.alive) { accuserOfMe = { seat: sp, ev: ev }; break; }
    }
  }

  const rivalSeerSeat = aliveOthers.find(function (s) { return s.claimedRole === "seer"; }) || null;
  const nightDeaths = Array.isArray(m.lastNightCasualties) ? m.lastNightCasualties.filter(Boolean) : [];
  const nightNote = m.day >= 2
    ? (nightDeaths.length === 0
      ? "昨晚平安夜（奉茶師救人或守衛守中）"
      : ("昨夜 " + nightDeaths.map(function (id) { const s = getSeat(id); return fmtSeatNum(id) + "號" + (s ? s.name : ""); }).join("、") + " 倒牌"))
    : (nightDeaths.length === 0
      ? "首夜平安夜"
      : ("首夜 " + nightDeaths.map(function (id) { const s = getSeat(id); return fmtSeatNum(id) + "號" + (s ? s.name : ""); }).join("、") + " 倒牌"));

  const checkedIds = (player && Array.isArray(player.checkedHistory)) ? player.checkedHistory.map(function (c) { return c.targetId; }) : [];
  const bfPool = aliveOthers.filter(function (s) {
    return checkedIds.indexOf(s.id) === -1 && (!rivalSeerSeat || s.id !== rivalSeerSeat.id);
  });
  const bf1 = bfPool[0] || aliveOthers[0] || null;
  const bf2 = bfPool[1] || aliveOthers.find(function (s) { return bf1 && s.id !== bf1.id; }) || null;
  const bfText = bf1
    ? (bf2
      ? ("今晚警徽流先驗 " + fmtSeatNum(bf1.id) + "號" + bf1.name + "、再驗 " + fmtSeatNum(bf2.id) + "號" + bf2.name + "（飛徽即金水、撕徽即查殺）")
      : ("今晚警徽流鎖定 " + fmtSeatNum(bf1.id) + "號" + bf1.name))
    : "";

  const totalWolves = typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2;
  const briefParts = [];
  if (dualWorlds && dualWorlds.seerA && dualWorlds.seerB) {
    briefParts.push("雙觀察員對跳（" + fmtSeatNum(dualWorlds.seerA.id) + "號 vs " + fmtSeatNum(dualWorlds.seerB.id) + "號）");
  }
  if (accuserOfMe) {
    briefParts.push(fmtSeatNum(accuserOfMe.seat.id) + "號" + accuserOfMe.seat.name + " 剛把你點進狼坑");
  }
  if (contraSeat) {
    briefParts.push(fmtSeatNum(contraSeat.id) + "號" + contraSeat.name + " 昨日言票分裂");
  }
  if (!briefParts.length && m.sheriffSeatId) {
    const shS = getSeat(m.sheriffSeatId);
    if (shS && shS.alive) briefParts.push("警長：" + fmtSeatNum(shS.id) + "號" + (shS.id === pid ? "你" : shS.name));
  }
  if (nightNote && m.day >= 2) briefParts.push(nightNote);

  return {
    aliveOthers: aliveOthers,
    todayEvBySeat: todayEvBySeat,
    contraSeat: contraSeat,
    accuserOfMe: accuserOfMe,
    rivalSeerSeat: rivalSeerSeat,
    nightNote: nightNote,
    nightDeaths: nightDeaths,
    totalWolves: totalWolves,
    bf1Id: bf1 ? bf1.id : null,
    bf2Id: bf2 ? bf2.id : null,
    bfText: bfText,
    getSheriffClue: getSheriffClue,
    getTodayStanceDesc: getTodayStanceDesc,
    briefLine: briefParts.length ? ("盤面焦點：" + briefParts.slice(0, 3).join(" ｜ ")) : ""
  };
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
    el("playerTurnHeading").textContent = inPk ? "平票 PK 陳詞" : "輪到你陳詞";
  }
  const tHintEl = el("playerSpeechTargetLabel");
  if (tHintEl) {
    tHintEl.textContent = "對象：" + fmtSeatNum(sampleTarget.id) + "號 " + sampleTarget.name;
  }
  const cHintEl = el("playerComboBonusHint");
  if (cHintEl) {
    if (state.match.comboBoostReady) {
      cHintEl.textContent = "連擊 +15%";
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
  const smart = buildPlayerSmartBoardContext(player, sampleTarget, slotView, dualWorlds);

  const prevPreparedKey = state.match._preparedSpeechTurnKey || "";
  const draftNow = ensurePlayerDraftPits(true);
  state.match._preparedSpeechTurnKey = draftNow.turnKey;
  renderRoleTurnDashboard(player);
  renderPlayerPitBuilder(slotView, dualWorlds);
  const isFreshTurn = prevPreparedKey !== draftNow.turnKey;
  if (isFreshTurn) {
    if (el("speechAdvancedDrawer")) el("speechAdvancedDrawer").classList.add("hidden");
    if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  }
  if (isFreshTurn && prevPreparedKey) {
    if (el("quickFreeInput")) el("quickFreeInput").value = "";
    if (el("playerSpeechInput")) el("playerSpeechInput").value = "";
  }
  const hasStagedDraft = Boolean(
    (draftNow.wolfIds && draftNow.wolfIds.length > 0) ||
    (draftNow.goodIds && draftNow.goodIds.length > 0) ||
    draftNow.claimRole ||
    draftNow.standSeerId ||
    draftNow.evidenceClueId ||
    draftNow.badgeFlowFirstId
  );
  if (isFreshTurn && state.match && state.match.judgeShowcase && !state.match.rewriteCritReady) {
    const qInJudge = el("quickFreeInput");
    const sampleHarsh = sampleTarget.id + "號別硬拗了，言票早露餡快投他！";
    if (qInJudge) qInJudge.value = sampleHarsh;
    if (el("playerSpeechInput")) el("playerSpeechInput").value = sampleHarsh;
    state.rephraseTrayPinned = false;
    if (el("rephraseChoicesTray")) el("rephraseChoicesTray").classList.add("hidden");
    if (el("btnQuickInlineRewrite")) el("btnQuickInlineRewrite").classList.remove("hidden");
    refreshLiveNlpUI();
  } else if (isFreshTurn && hasStagedDraft) {
    syncDraftSpeechToInput();
    if (draftNow._stagedWhileListening && el("pitTemplateSyncBar")) {
      el("pitTemplateSyncBar").classList.remove("hidden");
      if (el("pitTemplateSyncText")) {
        el("pitTemplateSyncText").textContent = "已同步聆聽階段排坑與立場草稿 · 點擊下方席位或身分可繼續調整";
      }
    }
  }
  syncSpeechAdvancedToggleLabel(player);
  updateQuickFreeSendLabel(draftNow, player);
  autoResizeSpeechTextarea(el("quickFreeInput"));

  const vaneEl = el("tableWindVaneSpeech");
  if (vaneEl) {
    const vw = typeof computeTableWindVane === "function" ? computeTableWindVane() : null;
    const summaryShow = (dualWorlds && vw && vw.summaryText)
      ? vw.summaryText
      : (smart.briefLine || (vw && vw.summaryText && smart.accuserOfMe ? vw.summaryText : ""));
    if (summaryShow && state.match.started) {
      vaneEl.textContent = summaryShow;
      vaneEl.classList.remove("hidden");
    } else {
      vaneEl.classList.add("hidden");
    }
  }

  const todaySpokenIds = state.match.logs
    .filter(function (l) { return l.day === state.match.day && l.kind === "speech" && l.speakerId && l.speakerId !== pid; })
    .map(function (l) { return l.speakerId; });
  const targetAlreadySpoke = todaySpokenIds.indexOf(sampleTarget.id) !== -1;
  const targetLabel = fmtSeatNum(sampleTarget.id) + "號" + sampleTarget.name;
  const targetSheriffClue = smart.getSheriffClue(sampleTarget.id);
  const targetStanceDesc = smart.getTodayStanceDesc(sampleTarget.id);
  const targetReasonBits = [];
  if (targetStanceDesc) targetReasonBits.push(targetStanceDesc);
  if (targetSheriffClue) targetReasonBits.push(targetSheriffClue);
  const targetEvidenceNote = targetReasonBits.length ? ("（" + targetReasonBits.join("，又") + "）") : "";

  // Card 1: Role Core Intel / PK Defense / Sharpest Board-Aware Opening
  if (inPk && pkRivalSeat && pkRivalSeat.alive) {
    const pkRivalClue = smart.getSheriffClue(pkRivalSeat.id);
    const pkRivalStance = smart.getTodayStanceDesc(pkRivalSeat.id);
    const pkRivalProof = (pkRivalStance || pkRivalClue)
      ? ("反觀 " + fmtSeatNum(pkRivalSeat.id) + "號" + pkRivalSeat.name + " " + [pkRivalStance, pkRivalClue].filter(Boolean).join("、") + "，邏輯站不住腳，")
      : ("對比之下，" + fmtSeatNum(pkRivalSeat.id) + "號" + pkRivalSeat.name + " 的立場破綻明顯大得多，");
    const pkRoleProof = (player.role === "seer" && player.checkedHistory.length > 0)
      ? ("我是真正的明心觀察員，手握 " + player.checkedHistory.map(function (c) { return fmtSeatNum(c.targetId) + "號" + (c.isWolf ? "查殺" : "金水"); }).join("、") + "，絕不能在 PK 斷了真預言線！")
      : (player.role === "witch" && player.savedSeatId
        ? ("我是滴水奉茶師，先前用暖心回甘茶護回 " + fmtSeatNum(player.savedSeatId) + "號 銀水，留我在場好人陣線才穩！")
        : (player.role === "hunter"
          ? "我是直心糾察長，若遭誤投出局必帶走頭號狼坑，請好人別浪費神職！"
          : "我每一輪都盤清正反坑位、言票完全一致，留我在場才能繼續幫好人歸票！"));
    const pkDraftClaim = (player.role === "seer" && player.checkedHistory.length > 0)
      ? "seer"
      : ((player.role === "witch" && player.savedSeatId) ? "witch" : (player.role === "hunter" ? "hunter" : null));
    cards.push({
      tgKind: "heart",
      tgTag: "PK 拉票",
      label: "PK 搶救自證・直指 " + fmtSeatNum(pkRivalSeat.id) + "號 破綻",
      draftPatch: {
        claimRole: pkDraftClaim,
        wolfIds: [pkRivalSeat.id],
        goodIds: (player.role === "witch" && player.savedSeatId && player.savedSeatId !== pkRivalSeat.id) ? [player.savedSeatId] : []
      },
      text: "平票 PK 我誠懇向全場搶救這一票！" + pkRoleProof + pkRivalProof + "拜託台下好夥伴集中把票投給 " + pkRivalSeat.id + "號！"
    });
  } else if (player.role === "seer" && player.checkedHistory.length > 0) {
    const allHist = player.checkedHistory.map(function (c) {
      const cs = getSeat(c.targetId);
      return fmtSeatNum(c.targetId) + "號" + (cs ? cs.name : "") + (c.isWolf ? "查殺" : "金水");
    }).join("、");
    const last = player.checkedHistory[player.checkedHistory.length - 1];
    const cSeat = getSeat(last.targetId);
    const cLabel = fmtSeatNum(last.targetId) + "號" + (cSeat ? cSeat.name : "");
    const rivalCut = smart.rivalSeerSeat
      ? ("前置位 " + fmtSeatNum(smart.rivalSeerSeat.id) + "號" + smart.rivalSeerSeat.name + " 跳假觀察員直接進定狼坑！")
      : "";
    const bfClause = smart.bfText ? (smart.bfText + "。") : "";
    const checkedGoodIds = player.checkedHistory.filter(function (c) { return !c.isWolf; }).map(function (c) { return c.targetId; });
    const checkedWolfIds = player.checkedHistory.filter(function (c) { return c.isWolf; }).map(function (c) { return c.targetId; });
    if (last.isWolf) {
      cards.push({
        tgKind: "heart",
        tgTag: "真明心報查殺",
        label: "報查殺 " + cLabel + (smart.rivalSeerSeat ? "・打假觀" : "・警徽流"),
        draftPatch: {
          claimRole: "seer",
          wolfIds: [last.targetId].concat(smart.rivalSeerSeat ? [smart.rivalSeerSeat.id] : []).concat(checkedWolfIds),
          goodIds: checkedGoodIds,
          badgeFlowFirstId: smart.bf1Id,
          badgeFlowSecondId: smart.bf2Id
        },
        text: "各位好夥伴，我是真正的明心觀察員！累計查驗：" + allHist + "，昨晚剛查出 " + cLabel + " 就是酸民狼！" + rivalCut + bfClause + "今天請全場好人團結歸票出 " + last.targetId + "號！"
      });
    } else {
      const pushId = smart.rivalSeerSeat ? smart.rivalSeerSeat.id : (smart.contraSeat ? smart.contraSeat.id : sampleTarget.id);
      const pushS = getSeat(pushId);
      const pushLbl = pushS ? (fmtSeatNum(pushS.id) + "號" + pushS.name) : (fmtSeatNum(pushId) + "號");
      cards.push({
        tgKind: "heart",
        tgTag: "真明心報金水",
        label: "報金水 " + cLabel + "・歸 " + fmtSeatNum(pushId) + "號",
        draftPatch: {
          claimRole: "seer",
          wolfIds: [pushId].concat(smart.rivalSeerSeat && smart.rivalSeerSeat.id !== pushId ? [smart.rivalSeerSeat.id] : []).concat(checkedWolfIds),
          goodIds: [last.targetId].concat(checkedGoodIds),
          badgeFlowFirstId: smart.bf1Id,
          badgeFlowSecondId: smart.bf2Id
        },
        text: "我是真正的明心觀察員，報完整查驗線：" + allHist + "，" + cLabel + " 是鐵好人金水！" + rivalCut + bfClause + "今天好人坑先把 " + last.targetId + "號 保住，焦點集中檢視 " + pushLbl + "！"
      });
    }
  } else if (player.role === "witch" && player.savedSeatId) {
    const svSeat = getSeat(player.savedSeatId);
    const svLbl = fmtSeatNum(player.savedSeatId) + "號" + (svSeat ? svSeat.name : "");
    const pushSeat = smart.contraSeat || sampleTarget;
    const poisonUsed = Boolean((state.match && state.match.witchPotions && !state.match.witchPotions.purify) || player.purifiedSeatId);
    const poisonNote = poisonUsed ? "清心醒神茶已交出" : "手上仍握有清心醒神茶威懾";
    cards.push({
      tgKind: "deeds",
      tgTag: "奉茶師報銀水",
      label: "亮奉茶師保 " + svLbl + "・歸票 " + fmtSeatNum(pushSeat.id) + "號",
      draftPatch: {
        claimRole: "witch",
        goodIds: [player.savedSeatId],
        wolfIds: pushSeat.id !== player.savedSeatId ? [pushSeat.id] : []
      },
      text: "我亮滴水奉茶師底牌穩住好人視角！先前是我用暖心回甘茶護回 " + svLbl + "，他是鐵銀水好夥伴，誰硬打 " + player.savedSeatId + "號 誰就進狼坑！" + poisonNote + "，今天請大家跟好人邏輯集中檢視 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + "！"
    });
  } else if (player.role === "guard") {
    const guarded = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
    const pushSeat = smart.contraSeat || sampleTarget;
    cards.push({
      tgKind: "deeds",
      tgTag: "守衛控場",
      label: guarded
        ? ("亮守衛報盾 " + fmtSeatNum(guarded.id) + "號・防同守同救")
        : ("藏守衛理性盤坑・點檢視 " + fmtSeatNum(pushSeat.id) + "號"),
      draftPatch: {
        claimRole: guarded ? "guard" : null,
        goodIds: (guarded && guarded.id !== pushSeat.id) ? [guarded.id] : [],
        wolfIds: [pushSeat.id]
      },
      text: guarded
        ? ("我先報護心守衛路線防撞車：昨晚我的護心結界守的是 " + fmtSeatNum(guarded.id) + "號" + guarded.name + "（" + smart.nightNote + "），請奉茶師務必錯開別同守同救！今天狼坑我先點 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + targetEvidenceNote + "。")
        : ("我是認真盤邏輯的好人，目前場上資訊漸明，結合" + smart.nightNote + "，我先重點檢視 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + targetEvidenceNote + "，看他後面怎麼自證！")
    });
  } else if (player.role === "hunter") {
    const pushSeat = smart.contraSeat || sampleTarget;
    cards.push({
      tgKind: "heart",
      tgTag: "糾察威懾",
      label: "直心糾察表態・鎖定 " + fmtSeatNum(pushSeat.id) + "號 狼坑",
      draftPatch: { claimRole: "hunter", wolfIds: [pushSeat.id] },
      text: "我先替好人陣營定調：我手握正氣共鳴絕對是鐵好人一張！結合" + smart.nightNote + "與發言對照，" + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + targetEvidenceNote + " 最像在帶風向，狼隊要是想推我上台，離席前我一定直接帶走頭號狼坑！"
    });
  } else if (player.isElder) {
    const pushSeat = smart.contraSeat || sampleTarget;
    cards.push({
      tgKind: "heart",
      tgTag: "長老歸票",
      label: player.elderShieldUsed
        ? ("清心長老定調・齊心檢視 " + fmtSeatNum(pushSeat.id) + "號")
        : ("清心長老扛推・點破 " + fmtSeatNum(pushSeat.id) + "號 邏輯"),
      draftPatch: { claimRole: "elder", wolfIds: [pushSeat.id] },
      text: player.elderShieldUsed
        ? ("我是已亮牌的清心長老，雖無投票權但視角最純粹！結合" + smart.nightNote + "，拜託好夥伴這輪集中檢視 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + targetEvidenceNote + "，別讓酸民狼分票得逞！")
        : ("我是清心長老，身上有免離席護盾可替神職扛壓！我先點出 " + fmtSeatNum(pushSeat.id) + "號" + pushSeat.name + targetEvidenceNote + " 的破綻，好人陣營穩穩對齊票型！")
    });
  } else if (player.role === "wolf") {
    const wolfMateSeer = aliveOthers.find(function (s) { return s.role === "wolf" && s.claimedRole === "seer"; });
    const wolfGoodPicks = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    const wolfScapegoat = (sampleTarget.role !== "wolf" ? sampleTarget : wolfGoodPicks[0]) || sampleTarget;
    const scClue = smart.getSheriffClue(wolfScapegoat.id) || smart.getTodayStanceDesc(wolfScapegoat.id);
    const scNote = scClue ? ("（" + scClue + "，節奏很可疑）") : "（前後態度閃躲、沒給真邏輯）";
    if (wolfMateSeer) {
      cards.push({
        tgKind: "heart",
        tgTag: "狼隊配合",
        label: "力挺隊友 " + fmtSeatNum(wolfMateSeer.id) + "號 觀察員・推 " + fmtSeatNum(wolfScapegoat.id) + "號",
        draftPatch: { standSeerId: wolfMateSeer.id, wolfIds: [wolfScapegoat.id] },
        text: "盤完正反視角，我覺得 " + fmtSeatNum(wolfMateSeer.id) + "號" + wolfMateSeer.name + " 的觀察員查驗線與警徽流清楚多了！反觀 " + fmtSeatNum(wolfScapegoat.id) + "號" + wolfScapegoat.name + scNote + " 一直在攪渾水，我堅定站邊 " + fmtSeatNum(wolfMateSeer.id) + "號，這輪把票集中出 " + wolfScapegoat.id + "號！"
      });
    } else {
      cards.push({
        tgKind: "heart",
        tgTag: "悍跳查殺",
        label: "悍跳觀察員查殺 " + fmtSeatNum(wolfScapegoat.id) + "號・佈假警徽流",
        draftPatch: { claimRole: "seer", wolfIds: [wolfScapegoat.id], badgeFlowFirstId: smart.bf1Id, badgeFlowSecondId: smart.bf2Id },
        text: "全場冷靜聽真預言線！我才是這局真正的明心觀察員！昨晚我查驗了 " + fmtSeatNum(wolfScapegoat.id) + "號" + wolfScapegoat.name + " 確定是酸民狼！" + (smart.bfText ? (smart.bfText + "，") : "") + "今天所有好人跟我集中出 " + wolfScapegoat.id + "號，別被後置位假牌帶偏！"
      });
    }
  } else {
    const focusTarget = (smart.contraSeat && sampleTarget.id !== smart.contraSeat.id && !pickedSeat)
      ? smart.contraSeat
      : sampleTarget;
    const focusLbl = fmtSeatNum(focusTarget.id) + "號" + focusTarget.name;
    const fSh = smart.getSheriffClue(focusTarget.id);
    const fSt = smart.getTodayStanceDesc(focusTarget.id);
    const fNote = [fSt, fSh].filter(Boolean).join("、");
    const pitBuddy = (slotView && slotView.goodPits && slotView.goodPits[0] && slotView.goodPits[0].id !== focusTarget.id)
      ? slotView.goodPits[0]
      : null;
    const buddyNote = pitBuddy ? ("好人坑我先保 " + fmtSeatNum(pitBuddy.id) + "號" + pitBuddy.name + "；") : "";
    const focusSpoke = todaySpokenIds.indexOf(focusTarget.id) !== -1;
    cards.push({
      tgKind: "heart",
      tgTag: "精準排坑",
      label: "梳理" + smart.nightNote.slice(0, 6) + "・點檢視 " + focusLbl,
      draftPatch: {
        claimRole: player.role === "villager" ? "villager" : null,
        goodIds: pitBuddy ? [pitBuddy.id] : [],
        wolfIds: [focusTarget.id]
      },
      text: focusSpoke
        ? ("結合" + smart.nightNote + "我幫大家精算一下坑位：" + buddyNote + focusLbl + (fNote ? ("（" + fNote + "）") : "") + " 的邏輯前後扣不太上，先放進今天的第一檢視狼坑，後置位也請表態對齊票型！")
        : ("結合" + smart.nightNote + "，" + buddyNote + "目前 " + focusLbl + (fSh ? ("（" + fSh + "）") : "") + " 今天還沒發言，我先點他起來重點聽表水，如果講不出正反狼坑這輪就優先檢視他！")
    });
  }

  // Card 2: High-IQ Relational Move (Dual-Seer World Split OR Direct Rebuttal OR Good-Pit Alliance / Wolf Pull)
  const friendTarget = (player.role === "wolf" ? aliveOthers.find(function (s) { return s.id !== sampleTarget.id && s.role !== "wolf"; }) : null)
    || (slotView && slotView.goodPits && slotView.goodPits.find(function (s) { return s.id !== sampleTarget.id && s.id !== pid; }))
    || aliveOthers.find(function (s) { return s.id !== sampleTarget.id; })
    || sampleTarget;
  const friendLbl = fmtSeatNum(friendTarget.id) + "號" + friendTarget.name;
  const friendSpoke = todaySpokenIds.indexOf(friendTarget.id) !== -1;
  const friendClue = smart.getSheriffClue(friendTarget.id);

  if (player.role === "wolf") {
    cards.push({
      tgKind: "words",
      tgTag: "假保拉票",
      label: "拉攏好人 " + friendLbl + "・建共識",
      draftPatch: { claimRole: "wolf_stealth", goodIds: [friendTarget.id] },
      text: "這輪我特別想把 " + friendLbl + " 放進鐵好人坑！" + (friendSpoke ? "剛才聽他盤邏輯非常客觀、沒有亂扣帽子，" : "從前面整體表態來看他態度一直很穩，") + (friendClue ? ("加上他" + friendClue + "的視角也合理，") : "") + "好人千萬別內耗誤投 " + friendTarget.id + "號，跟著我一起把焦點鎖去真正矛盾的位置！"
    });
  } else if (smart.accuserOfMe) {
    const ac = smart.accuserOfMe.seat;
    const acLbl = fmtSeatNum(ac.id) + "號" + ac.name;
    const acClue = smart.getSheriffClue(ac.id);
    const extraWp = (slotView && slotView.wolfPits || []).find(function (s) { return s.id !== ac.id && s.id !== pid; });
    cards.push({
      tgKind: "words",
      tgTag: "硬氣反駁",
      label: "反打 " + acLbl + "・點狼坑",
      draftPatch: { wolfIds: [ac.id].concat(extraWp ? [extraWp.id] : []) },
      text: "前置位 " + acLbl + " 剛才硬把我點進狼坑我直接回應：我全程認真盤邏輯、沒跟誰搞小動作，絕對不在狼坑！" + (acClue ? ("反倒是你" + acClue + "還沒解釋清楚，") : "你急著往我頭上扣帽子更像找抗推位，") + "這輪我先把 " + ac.id + "號" + (extraWp ? (" 跟 " + fmtSeatNum(extraWp.id) + "號" + extraWp.name) : "") + " 一起畫進重點狼坑！"
    });
  } else {
    cards.push({
      tgKind: "words",
      tgTag: "好人聯防",
      label: "力保 " + friendLbl + "・穩票型",
      draftPatch: { goodIds: [friendTarget.id] },
      text: friendSpoke
        ? ("我先幫好人把 " + friendLbl + " 認下來！剛剛聽他的發言條理分明、立場前後對得上" + (friendClue ? ("（且" + friendClue + "）") : "") + "，好人陣營先互保 " + friendTarget.id + "號，把票集中去檢視真正閃躲的位置！")
        : ("目前 " + friendLbl + " 還沒發言，但看他" + (friendClue ? (friendClue + "的票型脈絡") : ((state.match && state.match.day === 1) ? "開場至今的態度" : "前幾輪的配合度")) + "都偏乾淨，我先暫保 " + friendTarget.id + "號，等聽完後置位表水再一起鎖狼坑！")
    });
  }

  // Card 3: Killer Move — Pinned Evidence / Dual-Seer World Comparison / Vote-Speech Contradiction / Wolf Tactic / Endgame Math
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
      tgTag: "呈堂證供",
      isEvidenceCard: true,
      evidenceClueId: evClue.id,
      evidenceTargetId: evSeat.id,
      label: "打證破防 " + fmtSeatNum(evSeat.id) + "號 " + evSeat.name + "（全場警覺 +24）",
      draftPatch: { evidenceClueId: evClue.id, evidenceTargetId: evSeat.id, wolfIds: [evSeat.id] },
      text: evClue.summary
    });
  } else if (player.role === "wolf") {
    const goodPushPool = aliveOthers.filter(function (s) { return s.role !== "wolf"; });
    const pushSeat = goodPushPool.find(function (s) { return s.id === sampleTarget.id; }) || goodPushPool[0] || sampleTarget;
    const pushLbl = fmtSeatNum(pushSeat.id) + "號" + pushSeat.name;
    const pushClue = smart.getSheriffClue(pushSeat.id) || smart.getTodayStanceDesc(pushSeat.id);
    if (state.match.wolfTactic === "deep_stealth" || state.match.wolfTactic === "deep_stealth_bus") {
      cards.push({
        tgKind: "deeds",
        tgTag: "深水倒鉤",
        label: "深水隱身理性盤坑・順勢推 " + pushLbl,
        draftPatch: { claimRole: "wolf_stealth", wolfIds: [pushSeat.id] },
        text: "大家先深呼吸別被情緒帶走，我站純好人視角對一下票型：" + smart.nightNote + "，加上 " + pushLbl + (pushClue ? ("（" + pushClue + "）") : "") + " 的說詞最模糊，這輪我先記 " + pushSeat.id + "號 一格，聽完後置位再一起理性歸票！"
      });
    } else {
      cards.push({
        tgKind: "deeds",
        tgTag: "帶風推坑",
        label: "強勢抗辯穿衣・鎖定推 " + pushLbl,
        draftPatch: { wolfIds: [pushSeat.id] },
        text: "先把話講明，我一路替好人整理節奏、絕對不在狼坑裡！反觀 " + pushLbl + (pushClue ? ("（" + pushClue + "）") : "") + " 一直避重就輕不敢正面表態，我今天票就掛在 " + pushSeat.id + "號，好人跟我一起把這個破綻位出掉！"
      });
    }
  } else if (evToday.fakeSeerId && getSeat(evToday.fakeSeerId) && getSeat(evToday.fakeSeerId).alive) {
    const fs = getSeat(evToday.fakeSeerId);
    cards.push({
      tgKind: "deeds",
      tgTag: "拆穿假牌",
      label: "打飛假觀 " + fmtSeatNum(fs.id) + "號" + fs.name,
      draftPatch: { claimRole: "seer", wolfIds: [fs.id], badgeFlowFirstId: smart.bf1Id, badgeFlowSecondId: smart.bf2Id },
      text: "終於輪到我發言了！剛才前置位 " + fmtSeatNum(fs.id) + "號" + fs.name + " 竟然冒充明心觀察員誤導全場，我才是真正的明心觀察員，他鐵定佔一個定狼坑！" + (smart.bfText ? (smart.bfText + "，") : "") + "請好人今天務必先把 " + fs.id + "號 請離茶席！"
    });
  } else if (dualWorlds && dualWorlds.chosenWorld && dualWorlds.rivalWorld) {
    const wA = dualWorlds.worldA;
    const wB = dualWorlds.worldB;
    const cw = dualWorlds.chosenWorld;
    const wAPits = wA.wolfPits.map(function (s) { return fmtSeatNum(s.id) + "號" + s.name; }).join("＋");
    const wBPits = wB.wolfPits.map(function (s) { return fmtSeatNum(s.id) + "號" + s.name; }).join("＋");
    cards.push({
      tgKind: "deeds",
      tgTag: "盤雙邊坑",
      label: "對比兩邊狼坑：站 " + fmtSeatNum(dualWorlds.seerA.id) + "號 vs " + fmtSeatNum(dualWorlds.seerB.id) + "號",
      draftPatch: {
        standSeerId: cw.trustedSeer.id,
        goodIds: [cw.trustedSeer.id],
        wolfIds: cw.wolfPits.map(function (s) { return s.id; })
      },
      text: "場上雙明心對跳，我直接盤清雙邊世界線：站 " + fmtSeatNum(dualWorlds.seerA.id) + "號 的狼坑在 " + wAPits + "；站 " + fmtSeatNum(dualWorlds.seerB.id) + "號 的狼坑在 " + wBPits + "！對比發言與票型我目前站邊 " + fmtSeatNum(cw.trustedSeer.id) + "號，建議今天先把假牌 " + cw.fakeSeer.id + "號 請離茶席！"
    });
  } else if (smart.contraSeat) {
    const cs = smart.contraSeat;
    const csSh = smart.getSheriffClue(cs.id);
    cards.push({
      tgKind: "deeds",
      tgTag: "抓言票矛盾",
      label: "點破 " + fmtSeatNum(cs.id) + "號 " + cs.name + " 昨日言票分裂",
      draftPatch: { wolfIds: [cs.id] },
      text: "大家把昨天票型調出來對照！" + fmtSeatNum(cs.id) + "號" + cs.name + " 嘴上說一套、開票又投另一邊，言票嚴重分裂" + (csSh ? ("，加上他先前" + csSh) : "") + "，這完全符合酸民狼偷分票的軌跡，我今天建議集中檢視並優先公投 " + cs.id + "號！"
    });
  } else if (evToday.toxicSlipId && getSeat(evToday.toxicSlipId) && getSeat(evToday.toxicSlipId).alive) {
    const tx = getSeat(evToday.toxicSlipId);
    cards.push({
      tgKind: "deeds",
      tgTag: "化解挑撥",
      label: "抓出 " + fmtSeatNum(tx.id) + "號 " + tx.name + " 帶情緒節奏",
      draftPatch: { wolfIds: [tx.id] },
      text: "想溫和提醒全場，剛才 " + fmtSeatNum(tx.id) + "號" + tx.name + " 刻意用語氣製造對立、想帶偏好人焦點，這很符合酸民狼的打法；我們保持說好話風度、不被節奏牽走，這輪重點檢視 " + tx.id + "號！"
    });
  } else {
    const aliveCnt = aliveOthers.length + 1;
    const wpIds = (slotView && slotView.wolfPits && slotView.wolfPits.length > 0)
      ? slotView.wolfPits.slice(0, 2).map(function (s) { return s.id; })
      : [sampleTarget.id];
    const wpNames = (slotView && slotView.wolfPits && slotView.wolfPits.length > 0)
      ? slotView.wolfPits.slice(0, 2).map(function (s) { return fmtSeatNum(s.id) + "號" + s.name; }).join("、")
      : targetLabel;
    cards.push({
      tgKind: "deeds",
      tgTag: "全盤歸票",
      label: "盤點剩餘狼坑（" + aliveCnt + "人局）・鎖定 " + wpNames,
      draftPatch: { goodIds: friendTarget.id !== wpIds[0] ? [friendTarget.id] : [], wolfIds: wpIds },
      text: "目前場上還有 " + aliveCnt + " 位在席（" + smart.nightNote + "），好人坑我先認 " + friendLbl + "；其餘還沒自證清白的席位裡，我優先點 " + wpNames + " 進檢視狼坑，請大家聽完末置位後集中歸票、千萬別分票！"
    });
  }

  el("customSpeechDrawer").classList.add("hidden");
  const cardKeys = ["Q", "W", "E"];
  const curMods = Array.isArray(draftNow.composedModules) ? draftNow.composedModules : [];
  const activeModKeys = {};
  curMods.forEach(function (m) { if (m && m.key) activeModKeys[m.key] = true; });
  cards.slice(0, 3).forEach(function (item, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    const cardKey = (item.tgTag || "") + "::" + (item.label || "");
    const isLoaded = Boolean(activeModKeys[cardKey]);
    const cardTone = item.tgKind === "evidence" ? "card-evidence" : (item.tgKind === "heart" ? "card-heart" : (item.tgKind === "words" ? "card-words" : "card-deeds"));
    const stampTone = item.tgKind === "evidence" ? "stamp-evidence" : (item.tgKind === "heart" ? "stamp-heart" : (item.tgKind === "words" ? "stamp-words" : "stamp-deeds"));
    btn.className = "play-card-btn is-compact-card card-deal-in w-full text-left flex flex-col justify-between gap-1 " + cardTone + (isLoaded ? " is-draft-loaded" : "");
    btn.setAttribute("data-card-key", cardKey);
    if (btn.style) btn.style.animationDelay = (idx * 65) + "ms";
    btn.title = item.text;
    const cleanTitle = item.label.replace(/^【[^】]+】/, "");
    const previewSnippet = String(item.text || "").slice(0, 46) + (String(item.text || "").length > 46 ? "…" : "");
    btn.innerHTML =
      '<div class="flex items-center justify-between gap-1.5">' +
      '<span class="play-card-stamp ' + stampTone + '">' + escapeHtml(item.tgTag) + '</span>' +
      '<span class="flex items-center gap-1.5">' +
      '<span class="play-card-load-btn" data-card-load="1" title="加入或移除此段到下方陳詞欄">' + (isLoaded ? "已加入" : "加入") + '</span>' +
      '<kbd class="ui-kbd">' + cardKeys[idx] + '</kbd>' +
      '</span>' +
      '</div>' +
      '<div class="play-card-title text-[13px] font-bold leading-snug">' + escapeHtml(cleanTitle) + '</div>' +
      '<div class="play-card-preview text-[13px] leading-snug line-clamp-2 opacity-80">' + escapeHtml(previewSnippet) + '</div>';
    const composeToggleFn = function (ev) {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      sound.unlock();
      const resToggle = loadQuickCardIntoAdvancedEditor(item, btn, slotView, dualWorlds);
      if (typeof sound !== "undefined" && typeof sound.tone === "function") {
        sound.tone(resToggle && resToggle.added ? 587 : 420, 0.06, "triangle", 0.045, 0);
      }
      if (typeof showToast === "function") {
        if (resToggle && resToggle.added) {
          showToast("已加入「" + item.tgTag + "」（目前組裝 " + resToggle.count + " 組）到下方陳詞欄，看完即可按「陳詞送出」。", "emerald");
        } else {
          showToast("已從陳詞欄移除「" + item.tgTag + "」模組。", "gold");
        }
      }
    };
    const loadEl = typeof btn.querySelector === "function" ? btn.querySelector("[data-card-load]") : null;
    if (loadEl && typeof loadEl.addEventListener === "function") {
      loadEl.addEventListener("click", composeToggleFn);
    }
    btn.addEventListener("click", composeToggleFn);
    chipsBox.appendChild(btn);
  });

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
  if (typeof refreshSpeechCharCounter === "function") refreshSpeechCharCounter();
  if (inlineTg) {
    const hasText = Boolean(val && val.trim().length > 0);
    if (!hasText) {
      inlineTg.classList.add("hidden");
    } else if (res.isToxic) {
      inlineTg.textContent = "語氣稍急";
      inlineTg.className = "speech-tg-badge is-warn shrink-0";
    } else if (state.match && state.match.rewriteCritReady) {
      inlineTg.textContent = "溫潤修辭";
      inlineTg.className = "speech-tg-badge is-crit shrink-0";
    } else if (res.kindScore >= 84) {
      inlineTg.textContent = "溫和有理";
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
  if (typeof normalizeSeatRefsInText === "function") {
    text = normalizeSeatRefsInText(text);
  }
  const speechCapNow = typeof getActiveSpeechCharLimit === "function" ? getActiveSpeechCharLimit() : 0;
  if (speechCapNow > 0 && text.length > speechCapNow) {
    text = typeof clampSpeechToCharLimit === "function"
      ? clampSpeechToCharLimit(text, speechCapNow)
      : text.slice(0, speechCapNow);
    if (typeof showToast === "function") {
      showToast("已依當前聽牌／閃電局規壓縮至 " + speechCapNow + " 字短兵相接。", "gold");
    }
  }
  const res = analyzeThreeGoodSpeech(text);
  const player = getPlayerSeat();
  const strippedPlClaim = text
    .replace(/(?:不是|非|絕不是|沒有|不信|懷疑).{0,5}(?:預言家|明心觀察員|觀察員|女巫|滴水奉茶師|奉茶師|獵人|直心糾察長|糾察長|護心守衛|守衛|清心長老|長老)/g, " ")
    .replace(/(?:若|如果|萬一|假設)[^，。！？；;]*(?:預言家|明心觀察員|觀察員|女巫|滴水奉茶師|奉茶師|獵人|直心糾察長|糾察長|護心守衛|守衛|清心長老)[^，。！？；;]*/g, " ");
  const claimedSeerNow = /(?:我是|我才是|我亮|我跳|其實我是|本著[^，。！？；;]{0,6}公開)[^，。！？；;]{0,6}(?:預言家|明心觀察員|觀察員)|^(?:真)?(?:預言家|明心觀察員)/.test(strippedPlClaim);
  const claimedWitchNow = /(?:我是|我才是|我亮|我跳|其實我是)[^，。！？；;]{0,6}(?:女巫|滴水奉茶師|奉茶師)|^(?:真)?(?:滴水奉茶師|奉茶師)/.test(strippedPlClaim);
  const claimedHunterNow = /(?:我是|我才是|我亮|我跳|其實我是)[^，。！？；;]{0,6}(?:獵人|直心糾察長|糾察長)|^(?:真)?(?:直心糾察長|糾察長)/.test(strippedPlClaim);
  const claimedGuardNow = /(?:我是|我才是|我亮|我跳|其實我是)[^，。！？；;]{0,6}(?:護心守衛|守衛)|^(?:真)?(?:護心守衛|守衛)/.test(strippedPlClaim);
  const claimedElderNow = /(?:我是|我才是|我亮|我跳|其實我是)[^，。！？；;]{0,6}(?:清心長老|長老)|^(?:真)?清心長老/.test(strippedPlClaim);
  if (claimedSeerNow) {
    player.claimedRole = "seer";
    const otherSeer = state.match.seats.some(function (s) { return s.id !== getPlayerId() && s.alive && s.claimedRole === "seer"; });
    spawnFx(getPlayerId(), otherSeer ? "對跳觀察員!" : "亮明心觀察員!", "#fbbf24");
    if (otherSeer) {
      triggerShake(300);
      triggerCutIn("真假明心觀察員對跳", "全場焦點鎖定，誰才是真正的明心觀察員？", "gold");
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
  if (Array.isArray(draft.composedModules) && draft.composedModules.length > 0) {
    const firstMod = draft.composedModules[0];
    addThreeGoodPoint(firstMod.isEvidenceCard ? "heart" : firstMod.tgKind, firstMod.tgTag);
  }
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

  const stanceTextClean = text
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/(?:今晚)?(?:雙)?警徽流[^。！？\n]*/g, " ");
  const draftBfIds = {};
  if (draft.badgeFlowFirstId) draftBfIds[draft.badgeFlowFirstId] = true;
  if (draft.badgeFlowSecondId) draftBfIds[draft.badgeFlowSecondId] = true;
  if (plWolfPits.length === 0 && plGoodPits.length === 0) {
    (res.seatMentions || []).forEach(function (sid) {
      if (draftBfIds[sid] && (draft.wolfIds || []).indexOf(sid) === -1) return;
      if (plGoodPits.indexOf(sid) === -1 && /(狼坑|檢視|懷疑|請離|投)/.test(stanceTextClean)) pushWolfPit(sid);
    });
  }

  const fallbackTarget = evForceId || res.seatMentions.find(function (n) { return n !== pid && !draftBfIds[n]; }) || null;
  let accuseId = evForceId || plWolfPits[0] || null;
  let vouchId = evForceId ? null : (plGoodPits[0] || null);
  if (!accuseId && !vouchId && fallbackTarget) {
    const legacyVouch = /好人|信任|救活|保護|相信|金水/.test(stanceTextClean) && !/懷疑|酸民狼|查殺|投出去|矛盾|假冒|誤導|破綻|重點檢視|帶風向|問題|小心/.test(stanceTextClean);
    if (legacyVouch) { vouchId = fallbackTarget; pushGoodPit(fallbackTarget); }
    else { accuseId = fallbackTarget; pushWolfPit(fallbackTarget); }
  }
  const targetNum = accuseId || vouchId || fallbackTarget;
  const isWolfCheckClaim = Boolean(claimedSeerNow && accuseId && /查殺|酸民狼|是狼|查到.*狼|查驗.*狼|投出去|投他|請離/.test(stanceTextClean));

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
  const verbatimAnchorsByTarget = {};
  const anchorTargetIds = [];
  if (accuseId) anchorTargetIds.push(accuseId);
  plWolfPits.forEach(function (id) { if (anchorTargetIds.indexOf(id) === -1) anchorTargetIds.push(id); });
  (res.seatMentions || []).forEach(function (id) { if (id !== pid && anchorTargetIds.indexOf(id) === -1) anchorTargetIds.push(id); });
  anchorTargetIds.forEach(function (tid) {
    const anc = extractPlayerVerbatimAnchor(text, tid);
    if (anc) verbatimAnchorsByTarget[tid] = anc;
  });
  const primaryAnchor = (accuseId && verbatimAnchorsByTarget[accuseId])
    || (targetNum && verbatimAnchorsByTarget[targetNum])
    || extractPlayerVerbatimAnchor(text, targetNum);

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
    verbatimAnchor: primaryAnchor || "",
    verbatimAnchorsByTarget: verbatimAnchorsByTarget,
    rawText: text
  };
  state.match.daySpeechEvents.push(plEvObj);
  state.match.allSpeechEvents.push(plEvObj);

  // Commit player's daytime Badge Flow declaration (explicit picker OR parsed from speech text!)
  if (typeof setSheriffBadgeFlow === "function") {
    let dayFlow = null;
    if (draft.badgeFlowFirstId) {
      dayFlow = setSheriffBadgeFlow(pid, draft.badgeFlowFirstId, draft.badgeFlowSecondId, "day_speech");
    } else if (typeof parseBadgeFlowFromText === "function") {
      const parsedDayFlow = parseBadgeFlowFromText(text, pid);
      if (parsedDayFlow && parsedDayFlow.firstTargetId) {
        dayFlow = setSheriffBadgeFlow(pid, parsedDayFlow.firstTargetId, parsedDayFlow.secondTargetId, "day_speech");
      }
    }
    if (dayFlow && typeof formatBadgeFlowSummary === "function") {
      showToast("已更新公開警徽流：" + formatBadgeFlowSummary(dayFlow), "gold");
    }
  }
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

  const harmBefore = state.match.harmonyScore || 70;
  const atmBefore = typeof getTeaAtmosphereState === "function" ? getTeaAtmosphereState(harmBefore) : { id: "calm" };
  const critMult = state.match.rewriteCritReady ? 1.5 : 1;
  const comboMult = state.match.comboBoostReady ? 1.15 : 1;
  const bobaActive = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "boba_truce");
  const directorMult = (!res.isToxic && bobaActive) ? 1.25 : 1;
  const atmosphereMult = (!res.isToxic && atmBefore.id === "clear") ? 1.15 : 1.0;

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
    if (typeof recordThreeGoodImpact === "function") {
      recordThreeGoodImpact("toxic_backfire", "酸言反噬警示", "急躁標籤語氣使友善度 -10、全席對你戒心 +20，論點難以被採信", "cinnabar");
    }
    triggerAiCrowdReactions("doubt", pid);
    if (typeof orchestrator !== "undefined") orchestrator.emit("clash:detected", { kind: "player_toxic", speakerId: pid });
    showToast("語氣帶刺引發反感：友善度 -10、全場對你戒心 +20，論點難以服眾！", "warn");
  } else {
    state.match.stats.goodWordsCount += 1;
    if (atmBefore.id === "clear" && state.match.stats) {
      state.match.stats.clearWindTurns = (state.match.stats.clearWindTurns || 0) + 1;
    }
    const isKindDuel = Boolean(state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "kind_word_duel");
    const harmGain = (critMult > 1 ? 8 : 5) * (bobaActive ? 2 : 1);
    state.match.harmonyScore = clamp(state.match.harmonyScore + harmGain, 0, 100);
    const brokeFogByWords = Boolean(atmBefore.id === "fog" && state.match.harmonyScore > 45);
    const persuasion = Math.round((res.kindScore >= 82 ? 16 : 10) * critMult * comboMult * directorMult * atmosphereMult) + (isKindDuel ? 10 : 0);
    if (isKindDuel && state.match.directorEventClearedDay !== state.match.day && typeof addThreeGoodPoint === "function") {
      state.match.directorEventClearedDay = state.match.day;
      const tgNow = state.match.threeGood || { heart: 0, words: 0, deeds: 0 };
      const bonusKind = tgNow.words === 0 ? "words" : (tgNow.deeds === 0 ? "deeds" : "heart");
      addThreeGoodPoint(bonusKind, "好話接龍賞蓮");
    }
    spawnFx(pid, critMult > 1 ? "溫潤服眾" : (bobaActive ? "暖飲加溫" : (isKindDuel ? "善語相承" : (comboMult > 1 ? "言行共振" : "以理服人"))), "#fde68a");
    if (critMult > 1) {
      setSeatEmotion(pid, "proud", 3200);
      spawnBurst(pid, ["#34d399", "#fbbf24", "#fde68a"], 24, "petal");
      spawnBurst(pid, ["#34d399", "#fbbf24", "#ffffff"], 12, "ring");
      if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
        if (typeof stage3d.triggerCameraPunch === "function") {
          stage3d.triggerCameraPunch(accuseId || vouchId || pid, { fov: 40, durationMs: 1100 });
        }
        if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("celebrate", 1900);
      }
      triggerCutIn("溫潤服眾・以理服人", "從容懇切的陳詞讓席間茶友紛紛頷首", "tea");
    } else {
      setSeatEmotion(pid, "happy", 2400);
    }
    const shiftedAiIds = {};
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
            const prevSus = ai.suspicionMap[tgtId] || 50;
            const nextSus = clamp(prevSus + delta, 5, 96);
            ai.suspicionMap[tgtId] = nextSus;
            if (nextSus !== prevSus) shiftedAiIds[ai.id] = true;
          }
        }
      });
    };
    // v14.2 Anti-Hypocrisy ("口蜜腹劍") Guard: strictly public speech-vs-vote check (Zero-Leak!)
    const pubMatrixSelf = (state.match.day >= 2 && typeof buildVoteSpeechMatrix === "function")
      ? buildVoteSpeechMatrix(null)
      : null;
    const playerDivCount = (pubMatrixSelf && pubMatrixSelf.divergenceBySeat && pubMatrixSelf.divergenceBySeat[pid]) || 0;
    const hypocrisyPenalty = playerDivCount >= 1 ? 0.45 : 1.0;
    if (playerDivCount >= 1) {
      state.match.stats.hypocrisyFlags = (state.match.stats.hypocrisyFlags || 0) + 1;
    }
    state.match.seats.forEach(function (ai) {
      const aiEffRole = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(ai) : ai.role;
      if (ai.id !== pid && ai.alive && (ai.suspicionMap[pid] || 0) < 100 && !(plClaimedGod && aiEffRole === plClaimedGod)) {
        const rawBoost = Math.round((comboMult > 1 ? 11 : 8) * critMult);
        const trustBoost = Math.max(2, Math.round(rawBoost * hypocrisyPenalty));
        const prevSelfSus = ai.suspicionMap[pid] || 50;
        const nextSelfSus = clamp(prevSelfSus - trustBoost, 5, 95);
        ai.suspicionMap[pid] = nextSelfSus;
        if (nextSelfSus < prevSelfSus) shiftedAiIds[ai.id] = true;
      }
    });
    plWolfPits.forEach(function (wId, idx) {
      applyTargetDelta(wId, false, idx === 0 ? 1 : 0.65);
    });
    plGoodPits.forEach(function (gId, idx) {
      applyTargetDelta(gId, true, idx === 0 ? 1 : 0.65);
    });
    const persuadedAiCount = Object.keys(shiftedAiIds).length;
    if (critMult > 1) {
      if (typeof recordThreeGoodImpact === "function") {
        recordThreeGoodImpact("words_rewrite", "說好話・轉鋒為理", "婉轉潤飾讓說服力提升 50%，使 " + persuadedAiCount + " 位席間夥伴放下戒心傾聽論點", "jade");
      }
      showToast("辭溫理正：婉轉潤飾讓說服力 +50%，" + persuadedAiCount + " 位茶友放下戒心採納你的論點！", "emerald");
    } else if (brokeFogByWords) {
      if (typeof recordThreeGoodImpact === "function") {
        recordThreeGoodImpact("words_clear_fog", "說好話・破霧回溫", "於流言起霧時以理性陳詞穩住場域，讓茶席重歸平瀾", "jade");
      }
      showToast("以溫潤陳詞驅散流言起霧，茶席重歸平瀾！", "emerald");
    } else if (playerDivCount >= 1) {
      showToast("席間察覺先前言票略有落差，本輪說服力折半——言行一致最能服眾。", "gold");
    } else if (atmBefore.id === "clear" && persuadedAiCount > 0) {
      showToast("清朗茶風加持：理性陳詞說服力 +15%，" + persuadedAiCount + " 位茶友點頭採信。", "emerald");
    }
    triggerAiCrowdReactions(critMult > 1 ? "crit" : "cheer", accuseId || vouchId || targetNum || pid);
    if (typeof triggerSpeechAudienceReactions === "function") {
      triggerSpeechAudienceReactions(player, { accuseId: accuseId, vouchId: vouchId, wolfPits: plWolfPits, goodPits: plGoodPits });
    }
  }

  // Trigger logic-break when an Evidence Card was played cleanly without toxic slips!
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
      if (typeof recordThreeGoodImpact === "function") {
        recordThreeGoodImpact("heart_logic_break", "存好心・實證破防", "不貼標籤、以公開事證呈堂指證 " + fmtSeatNum(evTarget.id) + "號破綻，贏得全席信任", "jade");
      }
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
      spawnFx(evTarget.id, "邏輯破防 +24", "#fbbf24", { scale: 1.25, durationMs: 1900 });
      spawnBeam(pid, evTarget.id, "#fbbf24", "logic_break", 680);
      spawnBurst(evTarget.id, ["#fbbf24", "#f43f5e", "#ffffff"], 28, "slash");
      if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 480, 0.42);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", pid, evTarget.id, true);
        if (typeof stage3d.triggerCameraPunch === "function") stage3d.triggerCameraPunch(evTarget.id, { fov: 38.5, durationMs: 1450 });
        if (typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("celebrate", 2200);
      }
      triggerShake(280);
      triggerCutIn("呈堂證供・邏輯破防", "鐵證命中 " + fmtSeatNum(evTarget.id) + "號 " + evTarget.name + " 破綻，全場好人高度警覺！", "gold");
      triggerAiCrowdReactions("crit", evTarget.id);
      bumpCombo("邏輯破防");
      addThreeGoodPoint("heart", "存好心照破矛盾");
      addLog({
        kind: "blessing",
        title: "邏輯破防！你出示蒐證鐵證直指 " + fmtSeatNum(evTarget.id) + "號 " + evTarget.name + " 矛盾，好人陣營大幅提高警戒。",
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
  const subTag = res.isToxic ? "語氣稍急" : (critMult > 1 ? "溫潤潤飾" : (comboMult > 1 ? "言行共振" : "三好好話"));
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
  state.rephraseTrayPinned = false;
  if (el("rephraseChoicesTray")) el("rephraseChoicesTray").classList.add("hidden");
  state.match.playerDraftPits = createEmptyPlayerDraftPits();
  el("playerSpeechInput").value = "";
  if (el("quickFreeInput")) el("quickFreeInput").value = "";
  if (el("pitTemplateSyncBar")) el("pitTemplateSyncBar").classList.add("hidden");
  updateQuickFreeSendLabel(state.match.playerDraftPits, player);
  autoResizeSpeechTextarea(el("quickFreeInput"));
  refreshQuickFreeInputHint();
  if (typeof closeSeatIntel === "function") closeSeatIntel();
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
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
