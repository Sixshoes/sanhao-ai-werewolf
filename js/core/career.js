/**
 * 個人生涯戰績、8 枚三好成就勳章與賽後上帝視角復盤戰報匯出（純本機 localStorage，零花費）
 */
"use strict";

const CAREER_STORAGE_KEY = "sanhao_ai_werewolf_career_v1";

const ACHIEVEMENT_DEFS = [
  { id: "first_win",    icon: "🏆", title: "初露鋒芒",     desc: "贏得第一場三好AI狼人殺勝利" },
  { id: "zero_toxic",   icon: "🌿", title: "三好典範",     desc: "全程零嘴砲並贏得整場對局" },
  { id: "kind_crit",    icon: "✨", title: "化戾氣為祥和", desc: "單局使用「AI 轉好話暴擊」並奪勝" },
  { id: "resonance",    icon: "🌟", title: "三好圓滿",     desc: "單局觸發存好心・說好話・做好事共鳴" },
  { id: "combo_master", icon: "🔥", title: "連擊神探",     desc: "單局達成 3 連擊以上偵探互動" },
  { id: "four_g_sage",  icon: "🎴", title: "四給智囊",     desc: "善用四給錦囊並帶領陣營獲勝" },
  { id: "pro_slayer",      icon: "🧠", title: "凹嗚高手",   desc: "在「凹嗚高手局」難度下奪得勝利" },
  { id: "wolf_actor",      icon: "🎭", title: "深水影帝",   desc: "扮演酸民狼成功騙過全場獲勝" },
  { id: "ghost_detective", icon: "🔍", title: "席外名偵探", desc: "好人離席觀戰時精準猜中全場所有酸民狼" },
  { id: "shadow_oracle",   icon: "🎯", title: "暗影獵神手", desc: "酸民狼離席觀戰時全數猜中好人真神職" },
  { id: "logic_breaker",   icon: "⚡", title: "矛盾終結者", desc: "單局打出一張「呈堂證供」成功觸發邏輯破防" },
  { id: "micro_reader",    icon: "🔮", title: "觀微察心",   desc: "單局透過靜心觀微識破真正心虛的酸民狼" },
  { id: "crown_heir",      icon: "👑", title: "警徽傳承",   desc: "完成警長歸票或警徽移交並帶領陣營獲勝" },
  { id: "mission_ace",     icon: "🎖️", title: "密令達人",   desc: "完成本局專屬角色秘密任務並贏得對局" },
  { id: "tea_host",        icon: "🍵", title: "奉茶結緣師", desc: "單局曾於茶席間奉上暖茶結緣、拉近夥伴信任" },
  { id: "peacemaker",      icon: "🕊️", title: "化戾氣金句王", desc: "現場用「說好話化解」高情商接招尖銳發言" },
  { id: "fourg_combo",     icon: "🌸", title: "四給連心大師", desc: "單局打出雙四給錦囊觸發「四給連心・三好充能」" }
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
    unlockedBadges: []
  };
  try {
    const raw = window.localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return Object.assign(fallback, parsed, {
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : []
    });
  } catch (e) {
    return fallback;
  }
}

function saveCareerStats(career) {
  try {
    window.localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(career));
  } catch (e) {}
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

  saveCareerStats(career);

  if (newlyUnlocked.length > 0) {
    const names = newlyUnlocked.map(function (b) { return b.icon + b.title; }).join("、");
    showToast("🏅 解鎖新成就：" + names + "！", "emerald");
  }
  return newlyUnlocked;
}

function openCareerModal() {
  const modal = el("modalCareer");
  const body = el("careerModalBody");
  if (!modal || !body) return;
  const c = loadCareerStats();
  const winRate = c.gamesPlayed > 0 ? Math.round((c.wins / c.gamesPlayed) * 100) : 0;

  let html =
    '<div class="grid grid-cols-4 gap-2 text-center mb-3">' +
    '<div class="p-2 rounded-xl bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">總對局</div><div class="text-base font-black text-amber-300 tabular-nums">' + c.gamesPlayed + '</div></div>' +
    '<div class="p-2 rounded-xl bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">勝率</div><div class="text-base font-black text-emerald-300 tabular-nums">' + winRate + '%</div></div>' +
    '<div class="p-2 rounded-xl bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">說好話</div><div class="text-base font-black text-sky-300 tabular-nums">' + c.totalGoodWords + '</div></div>' +
    '<div class="p-2 rounded-xl bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">最高連擊</div><div class="text-base font-black text-rose-300 tabular-nums">' + c.bestCombo + '</div></div>' +
    '</div>' +
    '<div class="text-[11px] font-bold text-amber-300 mb-1.5">三好成就勳章（已解鎖 ' + c.unlockedBadges.length + ' / ' + ACHIEVEMENT_DEFS.length + '）</div>' +
    '<div class="grid grid-cols-2 gap-2">';

  ACHIEVEMENT_DEFS.forEach(function (a) {
    const unlocked = c.unlockedBadges.indexOf(a.id) !== -1;
    html +=
      '<div class="p-2.5 rounded-xl border ' + (unlocked
        ? "bg-emerald-950/40 border-emerald-400/50"
        : "bg-slate-950/60 border-slate-800 opacity-55") + '">' +
      '<div class="flex items-center gap-1.5">' +
      '<span class="text-base">' + (unlocked ? a.icon : "🔒") + '</span>' +
      '<span class="text-xs font-black ' + (unlocked ? "text-amber-200" : "text-slate-400") + '">' + escapeHtml(a.title) + '</span>' +
      '</div>' +
      '<div class="text-[10.5px] text-slate-300 mt-1 leading-snug">' + escapeHtml(a.desc) + '</div>' +
      '</div>';
  });
  html += '</div>';

  body.innerHTML = html;
  modal.classList.remove("hidden");
}

function buildMatchReplayReport() {
  const m = state.match;
  const diffLabel = state.aiDifficulty === "pro" ? "凹嗚高手局" : (state.aiDifficulty === "easy" ? "新手友善" : "標準推理");
  const winnerLabel = m.winner === "good" ? "好人陣營獲勝" : (m.winner === "wolf" ? "酸民狼陣營獲勝" : "提早揭曉底牌");
  const lines = [
    "【三好AI狼人殺｜賽後上帝視角復盤戰報】",
    "局制：" + m.totalSeats + "人局｜難度：" + diffLabel + (m.sheriffSeatId ? ("｜警長：" + fmtSeatNum(m.sheriffSeatId) + "號") : ""),
    "結果：" + winnerLabel + (m.winReason ? ("（" + m.winReason + "）") : ""),
    "友善度：" + m.harmonyScore + "｜說好話：" + (m.stats.goodWordsCount || 0) + "次｜轉好話暴擊：" + (m.stats.rewritesUsed || 0) + "次｜最高連擊：" + (m.maxCombo || 0),
    "",
    "■ 全員底牌揭曉："
  ];
  (m.seats || []).forEach(function (s) {
    const rName = ROLE_DEFS[s.role] ? ROLE_DEFS[s.role].name : s.role;
    const tag = s.id === getPlayerId() ? "（你）" : "";
    const status = s.alive ? "存活" : ("離席：" + (s.outReason || "出局"));
    const sh = m.sheriffSeatId === s.id ? " [👑警長]" : "";
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
  return lines.join("\n");
}

function copyMatchReplayReport() {
  const report = buildMatchReplayReport();
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(report).then(function () {
      showToast("📋 已複製本局上帝視角復盤戰報到剪貼簿！", "emerald");
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
    a.download = "三好AI狼人殺_復盤戰報.txt";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("📄 已下載本局復盤戰報！", "emerald");
  } catch (e) {
    showToast("目前環境無法匯出檔案", "warn");
  }
}
