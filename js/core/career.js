/**
 * 個人生涯戰績、8 枚三好成就勳章與賽後上帝視角復盤戰報匯出（純本機 localStorage，零花費）
 */
"use strict";

const CAREER_STORAGE_KEY = "sanhao_ai_werewolf_career_v1";

const ACHIEVEMENT_DEFS = [
  { id: "first_win", icon: "勝", title: "初露鋒芒", desc: "贏得第一場清茗茶席勝利" },
  { id: "zero_toxic", icon: "善", title: "三好典範", desc: "全程平穩有禮並贏得整場對局" },
  { id: "kind_crit", icon: "辭", title: "化戾氣為祥和", desc: "單局透過「婉轉潤飾詞句」陳詞並奪勝" },
  { id: "resonance", icon: "蓮", title: "三好圓滿", desc: "單局點亮存好心、說好話、做好事三瓣修為" },
  { id: "combo_master", icon: "連", title: "連擊神探", desc: "單局達成 3 連擊以上推理互動" },
  { id: "four_g_sage", icon: "茶", title: "四給智囊", desc: "善用四給奉茶並帶領陣營獲勝" },
  { id: "pro_slayer", icon: "弈", title: "高階弈手", desc: "在高階難度下奪得勝利" },
  { id: "wolf_actor", icon: "影", title: "深水影帝", desc: "扮演酸民狼成功騙過全場獲勝" },
  { id: "ghost_detective", icon: "察", title: "席外名偵探", desc: "好人離席觀戰時精準猜中全場所有酸民狼" },
  { id: "shadow_oracle", icon: "獵", title: "暗影獵神手", desc: "酸民狼離席觀戰時全數猜中好人真神職" },
  { id: "logic_breaker", icon: "破", title: "矛盾終結者", desc: "單局打出一張「呈堂證供」成功觸發邏輯破防" },
  { id: "micro_reader", icon: "微", title: "觀微察心", desc: "單局透過靜心觀微識破真正心虛的酸民狼" },
  { id: "crown_heir", icon: "徽", title: "警徽傳承", desc: "完成警長歸票或警徽移交並帶領陣營獲勝" },
  { id: "mission_ace", icon: "令", title: "密令達人", desc: "完成本局專屬角色秘密任務並贏得對局" },
  { id: "tea_host", icon: "暖", title: "奉茶結緣師", desc: "單局曾於茶席間奉上暖茶結緣、拉近夥伴信任" },
  { id: "peacemaker", icon: "和", title: "化戾氣金句王", desc: "面對質疑未帶情緒字眼，平穩回應並化解對立" },
  { id: "fourg_combo", icon: "心", title: "四給連心大師", desc: "同一局內兩度奉茶相助同席茶友，觸發四給連心" },
  { id: "elder_shield", icon: "泰", title: "泰山壓頂", desc: "身為清心長老觸發亮牌豁免並帶領好人陣營獲勝" },
  { id: "wolf_king_strike", icon: "風", title: "臨走翻盤", desc: "身為流言首領在公投離席時成功發動最後帶風向反撲" },
  { id: "sheriff_drama", icon: "警", title: "警上名嘴", desc: "親身上警競選並高票奪下警徽" }
];

const CLOUD_VARIANT_DEFS = [
  {
    id: "fog_seal",
    title: "迷霧封牌局",
    badge: "不翻身分牌",
    desc: "出局者一律暗牌封存，不公布真實陣營、職能與離席死因，全場同處對等盲推。",
    needWins: 1,
    needBadges: 2
  },
  {
    id: "blitz_3m",
    title: "三分鐘閃電快棋",
    badge: "22字＋15秒",
    desc: "全員發言上限壓縮至 22 字短句，公投階段開啟 15 秒決死快投倒數。",
    needWins: 2,
    needBadges: 4
  },
  {
    id: "twin_tea",
    title: "雙刃毒茗局",
    badge: "首夜解禁清心",
    desc: "首夜滴水奉茶師不可自救，但第一晚就能動用清心茶。",
    needWins: 3,
    needBadges: 6
  },
  {
    id: "lone_wolf_king",
    title: "孤狼流言王局",
    badge: "6人無觀察員",
    desc: "6 人無明心觀察員板子：1 名強化流言首領獨戰 5 名書院茶友（含奉茶、守衛、糾察長）。",
    needWins: 4,
    needBadges: 8
  }
];

function loadCareerStats() {
  const fallback = {
    gamesPlayed: 0,
    wins: 0,
    goodWins: 0,
    wolfWins: 0,
    totalGoodWords: 0,
    totalRewrites: 0,
    bestCombo: 0,
    zeroToxicWins: 0,
    spiritBetScore: 0,
    bestSpiritStreak: 0,
    unlockedBadges: []
  };
  try {
    const raw = window.localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const toNonNegInt = function (v) {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    };
    const validBadgeIds = {};
    ACHIEVEMENT_DEFS.forEach(function (def) { validBadgeIds[def.id] = true; });
    const seenBadges = {};
    const cleanBadges = [];
    if (Array.isArray(parsed.unlockedBadges)) {
      parsed.unlockedBadges.forEach(function (id) {
        if (typeof id === "string" && validBadgeIds[id] && !seenBadges[id]) {
          seenBadges[id] = true;
          cleanBadges.push(id);
        }
      });
    }
    return {
      gamesPlayed: toNonNegInt(parsed.gamesPlayed),
      wins: toNonNegInt(parsed.wins),
      goodWins: toNonNegInt(parsed.goodWins),
      wolfWins: toNonNegInt(parsed.wolfWins),
      totalGoodWords: toNonNegInt(parsed.totalGoodWords),
      totalRewrites: toNonNegInt(parsed.totalRewrites),
      bestCombo: toNonNegInt(parsed.bestCombo),
      zeroToxicWins: toNonNegInt(parsed.zeroToxicWins),
      spiritBetScore: toNonNegInt(parsed.spiritBetScore),
      bestSpiritStreak: toNonNegInt(parsed.bestSpiritStreak),
      unlockedBadges: cleanBadges
    };
  } catch (e) {
    return fallback;
  }
}

function isVariantUnlocked(variantId, careerOpt) {
  if (!variantId || variantId === "standard") return true;
  const def = CLOUD_VARIANT_DEFS.find(function (v) { return v.id === variantId; });
  if (!def) return false;
  const c = careerOpt || loadCareerStats();
  const wins = c.wins || 0;
  const badges = Array.isArray(c.unlockedBadges) ? c.unlockedBadges.length : 0;
  return wins >= def.needWins || badges >= def.needBadges;
}

function getUnlockedVariants(careerOpt) {
  const c = careerOpt || loadCareerStats();
  return CLOUD_VARIANT_DEFS.filter(function (v) { return isVariantUnlocked(v.id, c); }).map(function (v) { return v.id; });
}

function getPersonaDossierUnlockState(personaName, careerOpt) {
  const dossier = typeof getPersonaDossier === "function"
    ? getPersonaDossier(personaName)
    : (typeof PERSONA_SIGNATURE_DOSSIERS !== "undefined" ? PERSONA_SIGNATURE_DOSSIERS[personaName] : null);
  if (!dossier) return null;
  const c = careerOpt || loadCareerStats();
  const gamesPlayed = Math.max(0, Number(c && c.gamesPlayed) || 0);
  const needGood = typeof dossier.unlockGoodGames === "number" ? dossier.unlockGoodGames : 1;
  const needWolf = typeof dossier.unlockWolfGames === "number" ? dossier.unlockWolfGames : 3;
  return {
    personaName: String(personaName || ""),
    dossier: dossier,
    gamesPlayed: gamesPlayed,
    needGood: needGood,
    needWolf: needWolf,
    goodUnlocked: gamesPlayed >= needGood,
    wolfUnlocked: gamesPlayed >= needWolf,
    remainGood: Math.max(0, needGood - gamesPlayed),
    remainWolf: Math.max(0, needWolf - gamesPlayed)
  };
}

function recordSpiritBetCareerBonus(pts, streak) {
  const addPts = Math.max(0, Math.round(Number(pts) || 0));
  const st = Math.max(0, Math.round(Number(streak) || 0));
  if (addPts <= 0 && st <= 0) return null;
  const c = loadCareerStats();
  c.spiritBetScore = (c.spiritBetScore || 0) + addPts;
  c.bestSpiritStreak = Math.max(c.bestSpiritStreak || 0, st);
  saveCareerStats(c);
  return c;
}

function saveCareerStats(career) {
  try {
    window.localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(career));
  } catch (e) { }
}

function recordMatchCareer(winnerTeam) {
  if (!state.match || !state.match.started || winnerTeam === "early_end") return [];
  const career = loadCareerStats();
  const player = getPlayerSeat();
  const playerWon = Boolean(player && player.team === winnerTeam);
  const st = state.match.stats || {};

  career.gamesPlayed += 1;
  if (playerWon) {
    career.wins += 1;
    if (winnerTeam === "good") career.goodWins += 1;
    if (winnerTeam === "wolf") career.wolfWins += 1;
    if ((st.toxicSentCount || 0) === 0) career.zeroToxicWins += 1;
  }
  career.totalGoodWords += (st.goodWordsCount || 0);
  career.totalRewrites += (st.rewritesUsed || 0);
  career.bestCombo = Math.max(career.bestCombo, state.match.maxCombo || 0);

  const newlyUnlocked = [];
  const tryUnlock = function (id, cond) {
    if (cond && career.unlockedBadges.indexOf(id) === -1) {
      career.unlockedBadges.push(id);
      const def = ACHIEVEMENT_DEFS.find(function (a) { return a.id === id; });
      if (def) newlyUnlocked.push(def);
    }
  };

  tryUnlock("first_win", playerWon);
  tryUnlock("zero_toxic", playerWon && (st.toxicSentCount || 0) === 0);
  tryUnlock("kind_crit", playerWon && (st.rewritesUsed || 0) >= 1);
  tryUnlock("resonance", Boolean(state.match.threeGood && state.match.threeGood.resonanceTriggered));
  tryUnlock("combo_master", (state.match.maxCombo || 0) >= 3);
  tryUnlock("four_g_sage", playerWon && (st.fourGCount || 0) >= 1);
  tryUnlock("pro_slayer", playerWon && state.aiDifficulty === "pro");
  tryUnlock("wolf_actor", playerWon && player && player.team === "wolf");
  const gEval = state.match.spectatorGuess && state.match.spectatorGuess.evaluated;
  tryUnlock("ghost_detective", Boolean(gEval && gEval.mode === "wolf_hunt" && gEval.perfect));
  tryUnlock("shadow_oracle", Boolean(gEval && gEval.mode === "god_hunt" && gEval.perfect));
  tryUnlock("logic_breaker", (st.logicBreaksLanded || 0) >= 1);
  tryUnlock("micro_reader", (st.microWolfSpotted || 0) >= 1);
  tryUnlock("crown_heir", playerWon && (st.sheriffPassed || 0) >= 1);
  const mis = typeof evaluateRoleMission === "function" ? evaluateRoleMission() : state.match.roleMission;
  tryUnlock("mission_ace", Boolean(playerWon && mis && mis.completed));
  tryUnlock("tea_host", (st.teaServedCount || 0) >= 1);
  tryUnlock("peacemaker", (st.kindDeescalations || 0) >= 1);
  tryUnlock("fourg_combo", (st.fourGSynergies || 0) >= 1);
  tryUnlock("elder_shield", playerWon && (st.elderExempted || 0) >= 1);
  tryUnlock("wolf_king_strike", (st.wolfKingStrikes || 0) >= 1);
  tryUnlock("sheriff_drama", (st.sheriffDramaWins || 0) >= 1);

  saveCareerStats(career);

  if (newlyUnlocked.length > 0) {
    const names = newlyUnlocked.map(function (b) { return "【" + b.title + "】"; }).join("、");
    showToast("解鎖新印記：" + names, "emerald");
  }
  return newlyUnlocked;
}

function openCareerModal() {
  const modal = el("modalCareer");
  const body = el("careerModalBody");
  if (!modal || !body) return;
  const c = loadCareerStats();
  const esc = typeof escapeHtml === "function" ? escapeHtml : function (s) { return String(s); };
  const winRate = c.gamesPlayed > 0 ? Math.max(0, Math.min(100, Math.round((c.wins / c.gamesPlayed) * 100))) : 0;
  const unlockPct = ACHIEVEMENT_DEFS.length > 0 ? Math.max(0, Math.min(100, Math.round((c.unlockedBadges.length / ACHIEVEMENT_DEFS.length) * 100))) : 0;

  let html =
    '<div class="career-kpi-grid">' +
      '<div class="career-kpi-cell"><div class="career-kpi-label">總對局</div><div class="career-kpi-val is-gold tabular-nums">' + esc(String(c.gamesPlayed)) + '</div></div>' +
      '<div class="career-kpi-cell"><div class="career-kpi-label">勝率</div><div class="career-kpi-val is-jade tabular-nums">' + esc(String(winRate)) + '%</div></div>' +
      '<div class="career-kpi-cell"><div class="career-kpi-label">說好話</div><div class="career-kpi-val is-indigo tabular-nums">' + esc(String(c.totalGoodWords)) + '</div></div>' +
      '<div class="career-kpi-cell"><div class="career-kpi-label">最高連擊</div><div class="career-kpi-val is-cinnabar tabular-nums">' + esc(String(c.bestCombo)) + '</div></div>' +
    '</div>' +
    '<div class="career-progress-wrap">' +
      '<div class="career-progress-head">' +
        '<span class="font-serif-craft font-bold text-amber-300">三好書院印記</span>' +
        '<span class="tabular-nums text-[13px] text-slate-300">已解鎖 ' + esc(String(c.unlockedBadges.length)) + ' / ' + esc(String(ACHIEVEMENT_DEFS.length)) + '</span>' +
      '</div>' +
      '<div class="career-progress-track"><div class="career-progress-fill" style="width:' + esc(String(unlockPct)) + '%"></div></div>' +
    '</div>' +
    '<div class="career-seal-grid">';

  ACHIEVEMENT_DEFS.forEach(function (a) {
    const unlocked = c.unlockedBadges.indexOf(a.id) !== -1;
    html +=
      '<div class="career-seal-card ' + (unlocked ? "is-unlocked" : "is-locked") + '">' +
        '<div class="career-seal-head">' +
          '<span class="career-seal-chop ' + (unlocked ? "is-unlocked" : "") + '">' + (unlocked ? escapeHtml(a.icon) : "封") + '</span>' +
          '<span class="career-seal-title">' + escapeHtml(a.title) + '</span>' +
        '</div>' +
        '<div class="career-seal-desc">' + escapeHtml(a.desc) + '</div>' +
      '</div>';
  });
  html += '</div>';

  body.innerHTML = html;
  modal.classList.remove("hidden");
}

function buildAiPostMatchCoachInsights() {
  const m = state.match;
  if (!m || !m.started) return [];
  const pid = getPlayerId();
  const st = m.stats || {};
  const insights = [];
  const nameOf = function (id) {
    const s = getSeat(id);
    if (!s) return id + "號";
    return fmtSeatNum(s.id) + "號" + (s.id === pid ? "你" : s.name);
  };

  // 1. Key Turning Vote
  const vHist = m.voteHistory || [];
  const wolfOutRound = vHist.find(function (vh) {
    const s = vh.outId ? getSeat(vh.outId) : null;
    return s && s.team === "wolf";
  });
  const goodMisvote = vHist.find(function (vh) {
    const s = vh.outId ? getSeat(vh.outId) : null;
    return s && s.team === "good";
  });
  if (wolfOutRound) {
    insights.push({
      icon: "勝",
      title: "關鍵轉折票",
      text: "第 " + (wolfOutRound.day || 1) + " 天成功公投請離酸民狼 " + nameOf(wolfOutRound.outId) + "，是全場局勢翻轉的分水嶺。"
    });
  } else if (goodMisvote) {
    insights.push({
      icon: "衡",
      title: "關鍵轉折票",
      text: "第 " + (goodMisvote.day || 1) + " 天誤投了好夥伴 " + nameOf(goodMisvote.outId) + "，讓酸民狼趁勢掌控節奏；下次可多比對警上與票型交叉驗證。"
    });
  } else {
    insights.push({
      icon: "衡",
      title: "節奏觀察",
      text: "本局共歷經 " + (m.day || 1) + " 天茶席博弈，關鍵勝負取決於夜間技能配合與白天站邊速度。"
    });
  }

  // 2. Biggest Logic Break / Tell
  const contras = m.detectedContradictions || [];
  const toxicEv = (m.allSpeechEvents || []).find(function (ev) { return ev && ev.hasToxicSlip; });
  if (contras.length > 0) {
    insights.push({
      icon: "察",
      title: "最大邏輯破綻",
      text: "全場共抓出 " + contras.length + " 處發言矛盾，其中 " + nameOf(contras[0].speakerId) + " 的前後說法不一致成為重要突破口。"
    });
  } else if (toxicEv) {
    insights.push({
      icon: "察",
      title: "語氣破綻偵測",
      text: nameOf(toxicEv.speakerId) + " 曾在發言中露出急躁酸言破綻，留意「急著貼標籤催票」往往是酸民狼的特徵。"
    });
  } else {
    insights.push({
      icon: "察",
      title: "推理精準度",
      text: "本局偵探互動達 " + (m.maxCombo || 0) + " 連擊、觀微察心 " + (st.microInspectsUsed || 0) + " 次，善用「呈堂證供」可直接破防狼人話術。"
    });
  }

  // 3. Three-Goodness Communication & Speech-Action Consistency Radar (Anti-Hypocrisy Check at GAME_OVER)
  const vmPost = typeof buildVoteSpeechMatrix === "function" ? buildVoteSpeechMatrix(null) : null;
  const selfDivPost = (vmPost && vmPost.divergenceBySeat && vmPost.divergenceBySeat[pid]) || 0;
  let votesOnWolfPost = 0;
  let votesOnGoodPost = 0;
  vHist.forEach(function (vh) {
    const myB = (vh && Array.isArray(vh.ballots)) ? vh.ballots.find(function (b) { return b && b.voterId === pid && b.targetId; }) : null;
    if (!myB) return;
    const tObj = getSeat(myB.targetId);
    if (tObj && tObj.team === "wolf") votesOnWolfPost += 1;
    else if (tObj && tObj.team === "good") votesOnGoodPost += 1;
  });
  const pSeatPost = getPlayerSeat();
  const isPlayerGoodPost = Boolean(!pSeatPost || pSeatPost.team === "good");
  const fgUsedPost = st.fourGCount || 0;

  if (selfDivPost >= 1 && (st.goodWordsCount || 0) >= 1) {
    insights.push({
      icon: "言",
      title: "言語溫度 × 言行一致度",
      text: "你本局語氣溫和友善，但曾出現 " + selfDivPost + " 次「口頭指控與實際投票不一致」的言票落差；真正的推理不只口氣好，更要讓查證與公投票表裡如一。"
    });
  } else if (isPlayerGoodPost && votesOnWolfPost >= 1 && selfDivPost === 0) {
    insights.push({
      icon: "善",
      title: "言語溫度 × 言行一致度",
      text: "表裡如一滿分！你以零言票背離、友善度 " + m.harmonyScore + " 精準把 " + votesOnWolfPost + " 票投向酸民狼" + (fgUsedPost > 0 ? ("，並善用 " + fgUsedPost + " 次四給奉茶化解對立") : "") + "，展現理性說好話與公道護友。"
    });
  } else if ((st.rewritesUsed || 0) > 0) {
    insights.push({
      icon: "善",
      title: "三好溝通亮點",
      text: "你本局運用「婉轉潤飾詞句」" + st.rewritesUsed + " 次並維持友善度 " + m.harmonyScore + "，以沉穩理性的口吻化解對立，讓席間更願意傾聽。"
    });
  } else if (m.harmonyScore >= 85) {
    insights.push({
      icon: "善",
      title: "三好氣場圓融",
      text: "茶席友善度達 " + m.harmonyScore + "，正向發言讓同席夥伴更容易凝聚共識、識破酸民挑撥。"
    });
  } else {
    insights.push({
      icon: "善",
      title: "茶席陳詞建議",
      text: "本局友善度 " + m.harmonyScore + "；下次遇見火藥味發言，可試著以「說好話化解」或四給奉茶緩議，更能凝聚好人票源。"
    });
  }

  return insights;
}

function buildMatchTurningPoints() {
  const m = state.match;
  if (!m || !m.started) return [];
  const pid = getPlayerId();
  const nameOf = function (id) {
    const s = getSeat(id);
    if (!s) return id + "號";
    return fmtSeatNum(s.id) + "號" + (s.id === pid ? "你" : s.name);
  };
  const points = [];
  const usedKeys = {};
  const pushPoint = function (key, stage, title, detail, tone) {
    if (!key || usedKeys[key] || points.length >= 3) return;
    usedKeys[key] = true;
    points.push({ stage: stage, title: title, detail: detail, tone: tone || "gold" });
  };

  // 1. Pivotal Night Events (Purify Wolf / Self-Knife / Guard Block / Witch Save / First Casualty)
  const nightArc = Array.isArray(m.nightArchive) ? m.nightArchive : [];
  nightArc.forEach(function (na) {
    if (!na || points.length >= 2) return;
    const dayNum = na.day || 1;
    const poisonSeat = na.witchPoisonTarget ? getSeat(na.witchPoisonTarget) : null;
    const wolfTargetSeat = na.wolfTarget ? getSeat(na.wolfTarget) : null;
    if (poisonSeat && poisonSeat.team === "wolf") {
      pushPoint(
        "night_purify_" + dayNum,
        "第 " + dayNum + " 夜",
        "清心茶命中酸民狼",
        "滴水奉茶師以清心醒神茶請離酸民狼 " + nameOf(poisonSeat.id) + "，直接改寫陣營人數。",
        "jade"
      );
    } else if (wolfTargetSeat && wolfTargetSeat.team === "wolf") {
      pushPoint(
        "night_selfknife_" + dayNum,
        "第 " + dayNum + " 夜",
        "酸民狼夜裡自刀",
        nameOf(wolfTargetSeat.id) + " 採自刀策略博取奉茶師信任，干擾好人判斷。",
        "cinnabar"
      );
    } else if (na.guardTarget && na.wolfTarget && na.guardTarget === na.wolfTarget && !na.witchSaved) {
      pushPoint(
        "night_guard_" + dayNum,
        "第 " + dayNum + " 夜",
        "護心結界擋下夜襲",
        "護心守衛提前護住 " + nameOf(na.wolfTarget) + "，成功攔下夜襲造就平安夜。",
        "jade"
      );
    } else if (na.witchSaved && na.wolfTarget) {
      pushPoint(
        "night_save_" + dayNum,
        "第 " + dayNum + " 夜",
        "暖心茶護回夥伴",
        "滴水奉茶師於夜裡端出暖心回甘茶，護回遭襲的 " + nameOf(na.wolfTarget) + "。",
        "jade"
      );
    }
  });
  if (points.length === 0 && nightArc.length > 0) {
    const firstCas = nightArc.find(function (na) { return na && Array.isArray(na.casualties) && na.casualties.length > 0; });
    if (firstCas) {
      pushPoint(
        "night_cas_" + (firstCas.day || 1),
        "第 " + (firstCas.day || 1) + " 夜",
        "暗夜首起離席",
        firstCas.casualties.map(function (c) { return nameOf(c && typeof c === "object" ? c.id : c); }).join("、") + " 於夜裡離席，全場資訊開始收束。",
        "gold"
      );
    }
  }

  // 2. Day Reasoning / Interjection / Contradiction / Sheriff Dual-Seer / Self-Explode
  const interjs = Array.isArray(m.publicInterjections) ? m.publicInterjections : [];
  const contras = Array.isArray(m.detectedContradictions) ? m.detectedContradictions : [];
  const pinContra = (m.pinnedClues || []).find(function (c) { return c && c.kind === "contradiction"; });
  if (interjs.length > 0) {
    const it = interjs[interjs.length - 1];
    pushPoint(
      "day_interject",
      "第 " + (it.day || m.day || 1) + " 日",
      "舉杯追問咬死立場",
      "當場舉杯追問 " + nameOf(it.targetId) + "，逼出即時回防並留存公開對照紀錄。",
      "gold"
    );
  } else if (contras.length > 0) {
    const c0 = contras[0];
    pushPoint(
      "day_contra",
      "第 " + (c0.day || m.day || 1) + " 日",
      "抓出前後發言矛盾",
      nameOf(c0.speakerId) + " 出現邏輯前後不一，成為全席集火查核的突破口。",
      "gold"
    );
  } else if (pinContra) {
    pushPoint(
      "day_pin_contra",
      "第 1 日",
      "言票背離留痕",
      pinContra.summary || (nameOf(pinContra.seatId) + " 出現口頭點名與實際投票不一致。"),
      "gold"
    );
  } else if (m.sheriffVoteRecord && Array.isArray(m.sheriffVoteRecord.seerClaimIds) && m.sheriffVoteRecord.seerClaimIds.length >= 2) {
    pushPoint(
      "day_dual_seer",
      "第 1 日上警",
      "雙明心觀察員對跳",
      m.sheriffVoteRecord.seerClaimIds.map(nameOf).join(" 與 ") + " 同台競選警徽，由 " + nameOf(m.sheriffVoteRecord.winnerId) + " 掌歸票權。",
      "gold"
    );
  } else if (m.wolfExplodedToday) {
    pushPoint(
      "day_explode",
      "第 " + (m.day || 1) + " 日",
      "酸民狼自爆搶節奏",
      "酸民狼亮牌離席沒收當日剩餘流程，強行切入黑夜打斷好人歸票。",
      "cinnabar"
    );
  }

  // 3. Decisive Vote / Four-G Protection / Hunter Shot
  const vHist = Array.isArray(m.voteHistory) ? m.voteHistory : [];
  const wolfOutRounds = vHist.filter(function (vh) {
    const s = vh && vh.outId ? getSeat(vh.outId) : null;
    return Boolean(s && s.team === "wolf");
  });
  const goodOutRounds = vHist.filter(function (vh) {
    const s = vh && vh.outId ? getSeat(vh.outId) : null;
    return Boolean(s && s.team === "good");
  });
  if (wolfOutRounds.length > 0) {
    const lastW = wolfOutRounds[wolfOutRounds.length - 1];
    const withShield = Boolean(m.fourGivingsUsed && m.fourGivingsUsed.confidence);
    pushPoint(
      "vote_wolf_" + (lastW.day || 1),
      "第 " + (lastW.day || 1) + " 日公投",
      "公投請離酸民狼",
      "全席票型鎖定酸民狼 " + nameOf(lastW.outId) + (withShield ? "，搭配「奉茶護席」穩住票數" : "") + "，決定勝負走向。",
      "jade"
    );
  } else if (m.lastHunterShot && m.lastHunterShot.hunterId && m.lastHunterShot.targetId) {
    pushPoint(
      "hunter_shot",
      "第 " + (m.day || 1) + " 日共鳴",
      "離席反擊改寫比例",
      nameOf(m.lastHunterShot.hunterId) + " 帶走 " + nameOf(m.lastHunterShot.targetId) + "，直接牽動終局人數。",
      "cinnabar"
    );
  } else if (m.fourGivingsUsed && m.fourGivingsUsed.confidence) {
    pushPoint(
      "fourg_conf",
      "第 " + (m.day || 1) + " 日四給",
      "奉茶護席擋下關鍵票",
      "施展「給信心・奉茶護席」替被質疑夥伴擋下 1 票，避免好人陣營錯投。",
      "jade"
    );
  } else if (goodOutRounds.length > 0) {
    const lastG = goodOutRounds[goodOutRounds.length - 1];
    pushPoint(
      "vote_good_" + (lastG.day || 1),
      "第 " + (lastG.day || 1) + " 日公投",
      "錯投好夥伴逼近聽牌",
      "公投誤將好人 " + nameOf(lastG.outId) + " 請離，使酸民狼趁勢縮短勝場距離。",
      "cinnabar"
    );
  } else if (m.stats && (m.stats.elderExempted || 0) > 0) {
    pushPoint(
      "elder_exempt",
      "第 " + (m.day || 1) + " 日公投",
      "清心長老亮牌豁免",
      "清心長老觸發豁免擋下公投出局，替好人多爭取一輪查證空間。",
      "jade"
    );
  }

  // Ensure at least 1–3 meaningful cards even on early finish
  if (points.length < 3 && m.winReason) {
    pushPoint(
      "finale_summary",
      "終局結算",
      m.winner === "good" ? "好人收束勝局" : (m.winner === "wolf" ? "酸民狼鎖定勝局" : "提前揭曉底牌"),
      m.winReason,
      m.winner === "good" ? "jade" : (m.winner === "wolf" ? "cinnabar" : "gold")
    );
  }

  return points.slice(0, 3);
}

function buildFullSeatTruthRows() {
  const m = state.match;
  if (!m || !Array.isArray(m.seats)) return [];
  const pid = getPlayerId();
  const allSpeeches = Array.isArray(m.allSpeechEvents) ? m.allSpeechEvents : [];
  const nightArc = Array.isArray(m.nightArchive) ? m.nightArchive : [];
  const vHist = Array.isArray(m.voteHistory) ? m.voteHistory : [];

  const roleNameOfKey = function (rKey) {
    if (rKey && typeof ROLE_DEFS !== "undefined" && ROLE_DEFS[rKey]) return ROLE_DEFS[rKey].name;
    return rKey || "茶客";
  };

  return m.seats.map(function (s) {
    const trueRoleKey = s.isWolfKing ? "wolf_king" : (s.isElder ? "elder" : s.role);
    const trueRoleName = roleNameOfKey(trueRoleKey);

    // Public claim / stance
    const seatSpeeches = allSpeeches.filter(function (ev) { return ev && ev.speakerId === s.id; });
    const latestSp = seatSpeeches.length > 0 ? seatSpeeches[seatSpeeches.length - 1] : null;
    const stanceParts = [];
    if (s.claimedRole) {
      const claimNm = roleNameOfKey(s.claimedRole);
      const isBluff = s.team === "wolf" && s.claimedRole !== "wolf" && s.claimedRole !== "wolf_king";
      stanceParts.push("亮「" + claimNm + "」" + (isBluff ? "（假跳）" : ""));
    }
    if (latestSp) {
      if (latestSp.standWithSeerId && latestSp.standWithSeerId !== s.id) {
        stanceParts.push("站邊 " + latestSp.standWithSeerId + "號");
      }
      if (latestSp.accuseId && latestSp.accuseId !== s.id) {
        stanceParts.push("點疑 " + latestSp.accuseId + "號");
      } else if (latestSp.vouchId && latestSp.vouchId !== s.id && !s.claimedRole) {
        stanceParts.push("保 " + latestSp.vouchId + "號");
      }
    }
    const publicStance = stanceParts.length > 0 ? stanceParts.join("・") : "低調聽盤";

    // Key night action + vote accuracy
    const actParts = [];
    if (s.role === "seer" && Array.isArray(s.checkedHistory) && s.checkedHistory.length > 0) {
      const chkTxt = s.checkedHistory.slice(-2).map(function (c) {
        return c.targetId + "號(" + (c.isWolf ? "狼" : "好") + ")";
      }).join("、");
      actParts.push("查驗 " + chkTxt);
    }
    if (s.role === "witch") {
      if (s.savedSeatId) actParts.push("暖茶救 " + s.savedSeatId + "號");
      if (s.purifiedSeatId) actParts.push("清心請離 " + s.purifiedSeatId + "號");
    }
    if (s.role === "guard") {
      const blocks = nightArc.filter(function (na) { return na && na.guardTarget && na.guardTarget === na.wolfTarget && !na.witchSaved; });
      if (blocks.length > 0) {
        actParts.push("守 " + blocks[0].guardTarget + "號擋襲");
      } else {
        const guarded = nightArc.map(function (na) { return na && na.guardTarget; }).filter(Boolean);
        if (guarded.length > 0) actParts.push("結界守 " + guarded[guarded.length - 1] + "號");
      }
    }
    if (m.lastHunterShot && m.lastHunterShot.hunterId === s.id && m.lastHunterShot.targetId) {
      actParts.push("帶走 " + m.lastHunterShot.targetId + "號");
    }

    let totalVotes = 0;
    let wolfHits = 0;
    let abstains = 0;
    const votedTargets = [];
    vHist.forEach(function (vh) {
      if (!vh || !Array.isArray(vh.ballots)) return;
      const myB = vh.ballots.find(function (b) { return b && b.voterId === s.id; });
      if (!myB) return;
      if (!myB.targetId) {
        abstains += 1;
        return;
      }
      totalVotes += 1;
      votedTargets.push(myB.targetId + "號");
      const tSeat = getSeat(myB.targetId);
      if (tSeat && tSeat.team === "wolf") wolfHits += 1;
    });
    if (totalVotes > 0) {
      if (s.team === "good") {
        actParts.push("公投中狼 " + wolfHits + "/" + totalVotes + "（投 " + votedTargets.join("→") + "）");
      } else {
        actParts.push("公投推 " + votedTargets.join("→"));
      }
    } else if (abstains > 0) {
      actParts.push("公投棄票 " + abstains + " 次");
    }

    return {
      id: s.id,
      seatLabel: fmtSeatNum(s.id) + "號 " + (s.id === pid ? "你" : s.name),
      isPlayer: s.id === pid,
      isSheriff: m.sheriffSeatId === s.id,
      team: s.team,
      roleName: trueRoleName,
      publicStance: publicStance,
      actionRecord: actParts.length > 0 ? actParts.join("｜") : "無特殊行動紀錄",
      alive: Boolean(s.alive),
      statusText: s.alive ? "存活" : (s.outReason || "已離席")
    };
  });
}

function buildMatchReplayReport() {
  const m = state.match;
  const diffLabel = state.aiDifficulty === "pro" ? "凹嗚高手局" : (state.aiDifficulty === "easy" ? "新手友善" : "標準推理");
  const winnerLabel = m.winner === "good" ? "好人陣營獲勝" : (m.winner === "wolf" ? "酸民狼陣營獲勝" : "提早揭曉底牌");
  const lines = [
    "【三好AI狼人殺｜賽後上帝視角復盤戰報】",
    "局制：" + m.totalSeats + "人局｜難度：" + diffLabel + (m.sheriffSeatId ? ("｜警長：" + fmtSeatNum(m.sheriffSeatId) + "號") : ""),
    "結果：" + winnerLabel + (m.winReason ? ("（" + m.winReason + "）") : ""),
    "友善度：" + m.harmonyScore + "｜說好話：" + (m.stats.goodWordsCount || 0) + "次｜潤飾詞句：" + (m.stats.rewritesUsed || 0) + "次｜最高連擊：" + (m.maxCombo || 0),
    "",
    "■ 全員底牌揭曉："
  ];
  (m.seats || []).forEach(function (s) {
    const rKey = s.isWolfKing ? "wolf_king" : (s.isElder ? "elder" : s.role);
    const rName = ROLE_DEFS[rKey] ? ROLE_DEFS[rKey].name : (ROLE_DEFS[s.role] ? ROLE_DEFS[s.role].name : s.role);
    const tag = s.id === getPlayerId() ? "（你）" : "";
    const status = s.alive ? "存活" : ("離席：" + (s.outReason || "出局"));
    const sh = m.sheriffSeatId === s.id ? " [警長]" : "";
    lines.push("  " + fmtSeatNum(s.id) + "號 " + s.name + tag + sh + " — " + rName + "｜" + status);
  });

  if (m.voteHistory && m.voteHistory.length > 0) {
    lines.push("", "■ 各回合投票紀錄：");
    m.voteHistory.forEach(function (vh, idx) {
      const bStr = (vh.ballots || []).map(function (b) {
        return fmtSeatNum(b.voterId) + "→" + (b.targetId ? (fmtSeatNum(b.targetId)) : "棄");
      }).join(" ");
      lines.push("  第 " + (vh.day || idx + 1) + " 輪：" + bStr);
    });
  }
  const gEval = m.spectatorGuess && m.spectatorGuess.evaluated;
  if (gEval && gEval.hasGuess) {
    lines.push(
      "",
      "■ 席外推理開獎：" + gEval.title,
      "  命中 " + gEval.hits + "/" + gEval.total + "｜評級獎勵 +" + gEval.bonusPts + " 分" + (gEval.lockedEarly ? "（含早期鎖定勇氣加分）" : "")
    );
  }
  if (m.orchestratorSummary || (typeof orchestrator !== "undefined" && orchestrator.stats)) {
    const os = m.orchestratorSummary || orchestrator.stats;
    const evCount = (m.usedDirectorEventIds || []).length;
    lines.push(
      "",
      "■ AI 編排器（Multi-Agent Orchestrator）運行摘要：",
      "  總代理調度：" + (os.totalDispatches || os.dispatches || 0) + " 次（Gemini 雲端：" + (os.geminiHits || 0) + "｜本地多代理：" + (os.heuristicHits || 0) + "｜三好合規淨化：" + (os.complianceFiltered || 0) + " 次）｜清茗茶席事件：" + evCount + " 場"
    );
  }
  const misReport = typeof evaluateRoleMission === "function" ? evaluateRoleMission() : m.roleMission;
  const st = m.stats || {};
  lines.push(
    "",
    "■ 偵探推理與秘密任務結算：",
    "  角色密令：" + (misReport ? (misReport.title + "（" + (misReport.completed ? "已完成 +15分" : misReport.progressText) + "）") : "無"),
    "  邏輯破防：" + (st.logicBreaksLanded || 0) + " 次｜靜心觀微：" + (st.microInspectsUsed || 0) + " 次｜矛盾抓包：" + (st.contradictionsFound || 0) + " 次"
  );
  const turningPts = typeof buildMatchTurningPoints === "function" ? buildMatchTurningPoints() : [];
  if (turningPts.length > 0) {
    lines.push("", "■ 本局三大勝負轉折軸：");
    turningPts.forEach(function (tp, idx) {
      lines.push("  " + (idx + 1) + ". [" + tp.stage + "] " + tp.title + "：" + tp.detail);
    });
  }
  const coachList = buildAiPostMatchCoachInsights();
  if (coachList.length > 0) {
    lines.push("", "■ 本局茶席覆盤重點：");
    coachList.forEach(function (ci) {
      lines.push("  [" + ci.icon + "] " + ci.title + "：" + ci.text);
    });
  }
  return lines.join("\n");
}

function copyMatchReplayReport() {
  const report = buildMatchReplayReport();
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(report).then(function () {
      showToast("已複製本局上帝視角復盤戰報到剪貼簿。", "emerald");
    }).catch(function () {
      downloadMatchReplayReport(report);
    });
  } else {
    downloadMatchReplayReport(report);
  }
}

function downloadMatchReplayReport(reportText) {
  try {
    const text = reportText || buildMatchReplayReport();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "三好清茗茶席_復盤戰報.txt";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("已下載本局復盤戰報。", "emerald");
  } catch (e) {
    showToast("目前環境無法匯出檔案", "warn");
  }
}
