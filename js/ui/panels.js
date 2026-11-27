/**
 * 中央焦點控制面板切換（依遊戲階段模組化拆解）、終局三好指標與圓桌選座互動
 */
"use strict";

function syncFocalCardChrome(p) {
  const shCtxSpot = (p === "SHERIFF_ELECTION" && state.match) ? state.match.sheriffElectionCtx : null;
  const showSheriffSpotlight = Boolean(
    shCtxSpot && shCtxSpot.stage === "speech" && shCtxSpot.activeReelSeatId && shCtxSpot.activeReelSeatId !== getPlayerId()
  );
  const showSpotlight = (p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH" || showSheriffSpotlight);
  el("spotlightStageBox").classList.toggle("hidden", !showSpotlight);
  const waitRow = el("stepperWaitRow");
  if (waitRow) waitRow.classList.toggle("hidden", showSpotlight);

  const isSelfSpeaking = ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === getPlayerId());
  if (el("selfSpeakingRow")) el("selfSpeakingRow").textContent = playerNumTag() + " 你 正在對全場發言…";
  if (el("playerTurnHeading")) {
    el("playerTurnHeading").textContent = (isPkVoteActive() && state.match.pkCandidates.indexOf(getPlayerId()) !== -1)
      ? ("平票 PK · 輪到 " + playerNumTag() + " 你拉票")
      : ("輪到 " + playerNumTag() + " 你陳詞");
  }
  const selfRow = el("selfSpeakingRow");
  if (selfRow) selfRow.classList.toggle("hidden", !isSelfSpeaking);

  const focalCard = el("focalCenterCard");
  if (focalCard) {
    // v21.2 Subtractive Art Direction: Keep focal dock in unified antique-gold hairline palette (zero neon per-seat borders!)
    focalCard.style.borderColor = "";
  }
  const explodeBar = el("wolfSelfExplodeBar");
  if (explodeBar) {
    const canExplode = Boolean(typeof canWolfSelfExplodeNow === "function" && canWolfSelfExplodeNow(getPlayerSeat()));
    explodeBar.classList.toggle("hidden", !canExplode);
  }
  if (typeof renderHopeConfrontationModal === "function") {
    const isDayHopePh = (p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "DAY_VOTE");
    if (!isDayHopePh && el("hopeConfrontationModal")) {
      el("hopeConfrontationModal").classList.add("hidden");
    } else {
      renderHopeConfrontationModal();
    }
  }
  if (typeof renderSpiritBetBanner === "function") {
    renderSpiritBetBanner();
  }

  const dragHint = el("dragGestureHint");
  if (dragHint) {
    const devMode = (typeof detectTutorialDeviceMode === "function") ? detectTutorialDeviceMode() : "desktop";
    if (!state.match.started || p === "LOBBY") {
      dragHint.textContent = devMode === "phone"
        ? "單指環視山城 · 雙指縮放 · 輕觸茶友與桌心蓮花"
        : (devMode === "tablet"
          ? "單指環視山城 · 雙指縮放 · 輕觸茶友、蓮花或山海雲島"
          : "拖曳環視山城 · 滾輪縮放 · 輕點茶友、蓮花或山海雲島");
    } else if (p === "SHERIFF_ELECTION") {
      dragHint.textContent = "上警競選 · 依席輪流陳詞，警下票型將入排坑";
    } else if (p === "DAY_VOTE") {
      dragHint.textContent = devMode === "phone"
        ? "擇席落籌 · 連點兩下即定"
        : (devMode === "tablet"
          ? "擇席落籌 · 頭像拖線直投"
          : "擇席或拖線落籌 · 數字鍵選席");
    } else if (p === "NIGHT_GUARD") {
      dragHint.textContent = "護心結界 · 擇一席守護，可守自己、勿連守同席";
    } else if (p === "NIGHT_SEER" || p === "NIGHT_WOLF" || p === "HUNTER_TRIGGER") {
      dragHint.textContent = devMode === "phone"
        ? "擇一席定案 · 連點兩下即行"
        : "擇席或頭像拖線定案";
    } else if (p === "DAY_PLAYER_TURN") {
      dragHint.textContent = devMode === "phone"
        ? "橫滑切換點名 · 輕觸茶牌陳詞"
        : (devMode === "tablet"
          ? "擇席切換點名 · 輕觸茶牌陳詞"
          : "擇席切換點名 · Q / W / E 出牌 · Tab 換人");
    } else if (p === "DAY_SPEECH") {
      dragHint.textContent = devMode === "phone"
        ? "長按茶友開偵探輪盤 · 輕觸席號看情資"
        : (devMode === "tablet"
          ? "雙擊特寫 · 長按或拖線開偵探輪盤"
          : "雙擊特寫 · 拖線開輪盤 · Space 下一位 · J 手札");
    } else if (p === "LAST_WORDS_PLAYER" || p === "LAST_WORDS_SPEECH") {
      dragHint.textContent = "遺言時刻 · 所留線索將映入席間記憶";
    } else if (typeof isSpectatorGuessActive === "function" && isSpectatorGuessActive()) {
      dragHint.textContent = "席外觀戰 · 推演底牌，輕觸茶友仍可回顧陳詞";
    } else {
      dragHint.textContent = "輕觸席間茶友可檢視情資與態度";
    }
  }
}

function renderVoteResultPanel() {
  el("panelVoteResult").classList.remove("hidden");
  const vr = state.voteResultPayload;
  const p1 = getPlayerSeat();
  const showEndChoice = Boolean(vr.playerVotedOut) || Boolean(p1 && !p1.alive);
  if (el("votePlayerOutChoiceNotice")) {
    el("votePlayerOutChoiceNotice").classList.toggle("hidden", !vr.playerVotedOut);
    if (vr.playerVotedOut) {
      el("votePlayerOutChoiceNotice").textContent = (p1 && p1.team === "wolf")
        ? "你已被請離茶席！留下觀戰即可開啟「席外獵神挑戰」揪出全場真神職，或直接結束看底牌。"
        : ("你已被請離茶席！留下觀戰即可開啟「席外猜狼挑戰」找出 " + (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2) + " 名酸民狼，或直接結束看底牌。");
    }
  }
  if (el("btnVoteEndNow")) {
    el("btnVoteEndNow").classList.toggle("hidden", !showEndChoice);
  }
  if (el("btnVoteResultNext")) {
    if (vr.playerVotedOut) {
      el("btnVoteResultNext").textContent = "繼續往下看（觀戰）";
    } else if (!state.match.pkCandidates) {
      el("btnVoteResultNext").textContent = (p1 && !p1.alive) ? "繼續觀戰・進入夜晚" : "進入夜晚";
    }
  }
  el("voteResultHeadline").textContent = vr.headline;
  const barsBox = el("voteResultBars");
  barsBox.innerHTML = "";
  const entries = Object.keys(vr.tallies).map(function (k) {
    return { id: parseInt(k, 10), count: vr.tallies[k] };
  }).filter(function (e) { return e.count > 0; });
  entries.sort(function (a, b) { return b.count - a.count; });

  if (vr.lastWord) {
    const lwDiv = document.createElement("div");
    lwDiv.className = "rounded-xl p-2 bg-amber-500/15 border border-amber-400/40 text-sm font-bold text-amber-100 leading-snug mb-1.5";
    lwDiv.textContent = "離席遺言：" + vr.lastWord;
    barsBox.appendChild(lwDiv);
  }
  if (entries.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "text-sm text-slate-400 text-center py-2";
    emptyMsg.textContent = vr.isHunterOutChoice
      ? "直心糾察長正氣共鳴已結算，你可以直接結束看底牌，或繼續留下來觀戰。"
      : "全員棄票，沒有人得票";
    barsBox.appendChild(emptyMsg);
    return;
  }

  const totalVoteWeight = Math.max(1, entries.reduce(function (acc, it) { return acc + it.count; }, 0));
  entries.forEach(function (e, idx) {
    const sObj = getSeat(e.id);
    const pct = Math.round((e.count / Math.max(1, vr.maxVotes)) * 100);
    const sharePct = Math.min(100, Math.round((e.count / totalVoteWeight) * 100));
    const isOut = vr.outId === e.id;
    const voters = (vr.groupedVoters[e.id] || []).join("、");
    const row = document.createElement("div");
    row.className = "rounded-xl px-2.5 py-1.5 border " + (isOut ? "bg-rose-500/20 border-rose-400/50 vote-row-out" : "bg-slate-950/70 border-slate-800");
    row.innerHTML =
      '<div class="flex items-center justify-between text-sm font-black">' +
      '<span class="' + (isOut ? "text-rose-200" : "text-slate-200") + '">' + fmtSeatNum(e.id) + "號 " + escapeHtml(sObj ? sObj.name : "") + (isOut ? "（出局）" : "") + "</span>" +
      '<span class="text-amber-300 math-font">' + e.count + " 票 (" + sharePct + "%)</span>" +
      "</div>" +
      '<div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden my-1">' +
      '<div class="h-full vote-bar-fill ' + (isOut ? "bg-rose-400" : "bg-amber-400") + '" style="width:' + pct + '%; animation-delay:' + (idx * 70) + 'ms;"></div>' +
      "</div>" +
      '<div class="text-[13px] text-slate-400">投票者：' + escapeHtml(voters || "無") + "</div>";
    barsBox.appendChild(row);
  });
}

function renderVotePickPanel() {
  if (state.voteFlight && state.voteFlight.active) return;
  const player = getPlayerSeat();
  if (!isPlayerEligibleToVote()) {
    el("panelStepper").classList.remove("hidden");
    if (el("turnWatchNotice")) el("turnWatchNotice").classList.add("hidden");
    el("stepperStatusText").textContent = (player && player.alive && isPkVoteActive())
      ? "你正在 PK 台上，等待非平票玩家決選投票…"
      : "計票中…";
    return;
  }

  el("panelVote").classList.remove("hidden");
  const isWolfVoter = Boolean(player && player.role === "wolf");
  const gwBadge = el("voteGoodwillBadge");
  if (gwBadge) {
    const tgObj = (state.match && state.match.threeGood) || { heart: 0, words: 0, deeds: 0, resonanceTriggered: false };
    const litCnt = (tgObj.heart > 0 ? 1 : 0) + (tgObj.words > 0 ? 1 : 0) + (tgObj.deeds > 0 ? 1 : 0);
    if (!isWolfVoter && state.match.goodwillVoteBonus) {
      gwBadge.textContent = "三好蓮花覺醒 · 黃金善意票 +1 生效";
      gwBadge.className = "vote-goodwill-badge is-gold";
    } else if (isWolfVoter && tgObj.resonanceTriggered) {
      gwBadge.textContent = "深水三好光環生效 · 席間戒心已降";
      gwBadge.className = "vote-goodwill-badge is-wolf";
    } else if (!isWolfVoter && litCnt === 2) {
      gwBadge.textContent = "三好蓮花尚差一瓣 · 奉出一盞四給茶禮即啟「黃金善意票 +1」";
      gwBadge.className = "vote-goodwill-badge is-hint";
    } else {
      gwBadge.className = "hidden vote-goodwill-badge";
    }
  }
  const vaneVoteEl = el("tableWindVaneVote");
  if (vaneVoteEl) {
    const vw = typeof computeTableWindVane === "function" ? computeTableWindVane() : null;
    if (vw && vw.summaryText && state.match.started) {
      vaneVoteEl.textContent = vw.summaryText;
      vaneVoteEl.classList.remove("hidden");
    } else {
      vaneVoteEl.classList.add("hidden");
    }
  }
  const rallyBtn = el("btnSheriffRally");
  if (rallyBtn) {
    const isPlayerSheriff = Boolean(state.match.sheriffSeatId === getPlayerId());
    rallyBtn.classList.toggle("hidden", !isPlayerSheriff);
    const usedToday = state.match.sheriffRallyUsedDay === state.match.day;
    rallyBtn.disabled = !isPlayerSheriff || usedToday;
    rallyBtn.textContent = usedToday ? "本輪已歸票" : "警長歸票";
  }
  const pkActive = isPkVoteActive();
  const pkListLabel = pkActive
    ? state.match.pkCandidates.map(function (id) { return fmtSeatNum(id) + "號"; }).join("、")
    : "";
  if (el("votePromptLabel")) {
    el("votePromptLabel").textContent = pkActive
      ? ("平票 PK 決選 · 請從 " + pkListLabel + " 擇一")
      : (isWolfVoter ? "酸民狼歸票 · 擇一好人席帶節奏" : "公投落籌 · 擇席請離");
  }
  const sel = getSeat(state.selectedSeatId);
  const validVote = Boolean(sel && isValidVoteTarget(sel.id));
  el("selectedVoteBadge").textContent = validVote
    ? ("已鎖定 · " + fmtSeatNum(sel.id) + "號 " + sel.name)
    : (pkActive ? ("僅限 " + pkListLabel + " 或棄票") : "請擇定茶席座位");
  const vIntel = el("voteTargetIntelLine");
  if (vIntel) {
    if (validVote) {
      const mk = state.playerMarks[sel.id] === "wolf" ? "標記：懷疑" : (state.playerMarks[sel.id] === "good" ? "標記：好人" : "未標記");
      const sw = (state.match.microPulseRevealed || sel.sweatExposed) ? ("・心虛 " + sel.microPulse + "%") : "";
      const cl = (sel.claimedRole && ROLE_DEFS[sel.claimedRole]) ? ("・跳" + ROLE_DEFS[sel.claimedRole].name) : "";
      const lastEv = (state.match.daySpeechEvents || []).find(function (ev) { return ev.speakerId === sel.id; });
      const st = lastEv ? (lastEv.accuseId ? ("・今日指控" + fmtSeatNum(lastEv.accuseId) + "號") : (lastEv.vouchId ? ("・今日力挺" + fmtSeatNum(lastEv.vouchId) + "號") : "")) : "";
      vIntel.textContent = mk + cl + sw + st;
      vIntel.classList.remove("hidden");
    } else {
      vIntel.classList.add("hidden");
    }
  }
  const castBtn = el("btnCastVote");
  castBtn.disabled = !validVote;
  if (validVote) {
    castBtn.innerHTML = escapeHtml("確認投給 " + fmtSeatNum(sel.id) + "號") + ' <kbd class="ui-kbd ml-1">Enter</kbd>';
  } else {
    castBtn.textContent = pkActive ? "擇 PK 席位" : "擇席落籌";
  }
}

function renderNightRoleTipStrip(p, pSelf) {
  const tipEl = el("nightRoleTipStrip");
  if (!tipEl) return;
  if (!pSelf || !state.match || !state.match.started) {
    tipEl.classList.add("hidden");
    return;
  }
  let text = "";
  let tone = "is-good";
  if (p === "NIGHT_SEER") {
    const hist = pSelf.checkedHistory || [];
    const pidNow = getPlayerId();
    const myFlow = (state.match.sheriffBadgeFlow && state.match.sheriffBadgeFlow.ownerId === pidNow)
      ? state.match.sheriffBadgeFlow
      : ((state.match.sheriffBadgeFlowsBySeat && state.match.sheriffBadgeFlowsBySeat[pidNow]) || null);
    const flowTip = (myFlow && myFlow.firstTargetId && typeof formatBadgeFlowSummary === "function")
      ? ("你的警徽流：" + formatBadgeFlowSummary(myFlow))
      : "";
    const histTip = hist.length > 0
      ? ("已驗（勿重驗）：" + hist.map(function (c) {
        const cs = getSeat(c.targetId);
        return fmtSeatNum(c.targetId) + (cs ? cs.name : "") + "=" + (c.isWolf ? "酸民狼" : "好人");
      }).join(" ｜ "))
      : "";
    text = [flowTip, histTip].filter(Boolean).join(" ∥ ");
  } else if (p === "NIGHT_WITCH") {
    const healOk = Boolean(state.match.witchPotions && state.match.witchPotions.heal);
    const purOk = Boolean(state.match.witchPotions && state.match.witchPotions.purify);
    text = "滴水奉茶師庫存：暖心茶(" + (healOk ? "可用" : "已用") + ")・清心茶(" + (purOk ? "可用" : "已用") + ")｜同夜限一盞";
  } else if (p === "NIGHT_GUARD") {
    const lg = state.match.lastGuardTargetId ? getSeat(state.match.lastGuardTargetId) : null;
    text = lg
      ? ("上晚已守 " + fmtSeatNum(lg.id) + "號" + lg.name + "（今晚禁連守）")
      : "";
  } else if (p === "NIGHT_WOLF") {
    tone = "is-wolf";
    const mates = state.match.seats.filter(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; });
    const mateLbl = mates.length > 0
      ? ("狼同伴：" + mates.map(function (m) { return fmtSeatNum(m.id) + m.name + (m.alive ? "" : "(離)"); }).join("、"))
      : "獨狼作戰";
    const marks = state.match.wolfGodMarks || {};
    const markList = Object.keys(marks).map(function (k) {
      const sid = parseInt(k, 10);
      const ms = getSeat(sid);
      const md = typeof getWolfGodMarkDef === "function" ? getWolfGodMarkDef(marks[k]) : { label: marks[k] };
      return (ms && ms.alive && md.label) ? (fmtSeatNum(sid) + ms.name + "(" + md.label + ")") : "";
    }).filter(Boolean);
    text = mateLbl + (markList.length > 0 ? (" ｜ 獵神筆記：" + markList.join("、")) : " ｜ 可指定明日同伴戰術");
  } else if (p === "HUNTER_TRIGGER") {
    text = "";
  }
  if (text) {
    tipEl.textContent = text;
    tipEl.className = "night-role-tip-strip " + tone;
  } else {
    tipEl.classList.add("hidden");
  }
}

function renderNightAndHunterPanel(p) {
  el("panelTargetAction").classList.remove("hidden");
  const revealCard = el("seerRevealCard");
  const actionBtnsRow = el("targetActionBtnsRow");
  const witchSub = el("witchSubPanel");
  const tacticRowEarly = el("wolfTacticRow");
  if (tacticRowEarly && p !== "NIGHT_WOLF") tacticRowEarly.classList.add("hidden");
  const confirmBtn = el("btnConfirmTarget");
  const sel = getSeat(state.selectedSeatId);
  renderNightRoleTipStrip(p, getPlayerSeat());

  if (p === "NIGHT_SEER" && state.seerReveal) {
    const rv = state.seerReveal;
    el("targetPromptBox").textContent = "明心觀察員查證情報（僅你可見）";
    witchSub.classList.add("hidden");
    actionBtnsRow.classList.add("hidden");
    revealCard.classList.remove("hidden");
    revealCard.className = "rounded-xl p-3 border text-center space-y-1.5 msg-enter " + (
      rv.isWolf
        ? "bg-rose-500/20 border-rose-400/60 text-rose-100"
        : "bg-emerald-500/20 border-emerald-400/60 text-emerald-100"
    );
    el("seerRevealTitle").textContent = fmtSeatNum(rv.targetId) + "號 " + rv.targetName + (rv.isWolf ? " 是【鍵盤酸民狼】！" : " 是【書院好夥伴】！");
    el("seerRevealSub").textContent = rv.isWolf
      ? "白天發言時可直接亮牌號召大家投他！"
      : "白天可放心信任並保護這位好夥伴！";
    return;
  }

  revealCard.classList.add("hidden");
  actionBtnsRow.classList.remove("hidden");

  if (p === "NIGHT_WITCH") {
    witchSub.classList.remove("hidden");
    confirmBtn.classList.add("hidden");
    const victim = getSeat(state.match.nightState.wolfTarget);
    const healBtn = el("btnWitchHeal");
    const purifyBtn = el("btnWitchPurify");
    const twinTeaUi = state.match.variantMode === "twin_tea";
    const blockedSelfHeal = Boolean(state.match.witchPotions.heal && victim && victim.id === getPlayerId() && (state.match.day >= 2 || twinTeaUi));
    const canHealNow = Boolean(state.match.witchPotions.heal && victim && !blockedSelfHeal);
    const canPurifyDay = Boolean(state.match.witchPotions.purify && (state.match.day >= 2 || twinTeaUi));

    healBtn.disabled = !canHealNow;
    healBtn.textContent = canHealNow
      ? ("暖心茶護回 " + victim.id + "號")
      : (blockedSelfHeal ? (twinTeaUi && state.match.day === 1 ? "雙刃毒茗首夜禁自救" : "第2夜不可自護") : "暖心茶(已用)");

    purifyBtn.disabled = !canPurifyDay;
    purifyBtn.textContent = canPurifyDay
      ? ("清心茶請離" + (sel && sel.alive && sel.id !== getPlayerId() ? (" " + sel.id + "號") : "可疑者"))
      : (state.match.witchPotions.purify ? "清心茶(第2夜開放)" : "清心茶(已用)");

    el("targetPromptBox").textContent = canHealNow
      ? ("今晚 " + victim.id + "號 " + victim.name + " 遭迷霧鎖定，是否奉暖心回甘茶護回？")
      : (blockedSelfHeal
        ? (twinTeaUi && state.match.day === 1
          ? "雙刃毒茗首夜禁自護，今夜已解禁清心茶，可擇席請離或略過"
          : "今夜遭鎖定且次夜起不可自護，可擇席奉清心茶或略過")
        : "暖心茶已用盡，可擇席奉清心茶請離或略過");
    return;
  }

  witchSub.classList.add("hidden");
  confirmBtn.classList.remove("hidden");
  const tacticRow = el("wolfTacticRow");
  if (tacticRow) {
    const showWolfTactic = (p === "NIGHT_WOLF");
    tacticRow.classList.toggle("hidden", !showWolfTactic);
    if (showWolfTactic && typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
      const curTac = typeof normalizeWolfTacticKey === "function"
        ? normalizeWolfTacticKey(state.match.wolfTactic)
        : (state.match.wolfTactic || "mate_fake_seer_gold");
      document.querySelectorAll("[data-wolf-tactic]").forEach(function (tb) {
        tb.classList.toggle("is-active", tb.getAttribute("data-wolf-tactic") === curTac);
      });
    }
  }
  const pSelfTarget = getPlayerSeat();
  const isPlayerWK = Boolean(p === "HUNTER_TRIGGER" && pSelfTarget && pSelfTarget.isWolfKing);
  const aliveWolvesUi = getAliveSeats().filter(function (s) { return s.role === "wolf"; }).length;
  const allowSelfKnifeUi = Boolean(p === "NIGHT_WOLF" && state.match.day === 1 && aliveWolvesUi >= 2);
  const validT = Boolean(sel && sel.alive && (p === "NIGHT_GUARD"
    ? state.match.lastGuardTargetId !== sel.id
    : (allowSelfKnifeUi
      ? true
      : (sel.id !== getPlayerId() && !((p === "NIGHT_WOLF" || isPlayerWK) && sel.role === "wolf")))));
  const verb = p === "NIGHT_GUARD" ? "守護 " : (p === "NIGHT_SEER" ? "查證 " : (p === "NIGHT_WOLF" ? "鎖定 " : (isPlayerWK ? "反撲帶走 " : "共鳴請離 ")));
  confirmBtn.disabled = !validT;
  if (validT) {
    confirmBtn.innerHTML = escapeHtml("確認" + verb + sel.id + "號") + ' <kbd class="ui-kbd ml-1">Enter</kbd>';
  } else {
    confirmBtn.textContent = (p === "NIGHT_GUARD" && sel && state.match.lastGuardTargetId === sel.id) ? "不可連守" : "擇定席位";
  }
  const lastG = state.match.lastGuardTargetId;
  el("targetPromptBox").textContent = validT
    ? ("已鎖定 " + fmtSeatNum(sel.id) + "號 " + (sel.id === getPlayerId() ? "自己" : sel.name))
    : (p === "NIGHT_GUARD"
      ? (lastG ? ("護心結界 · 擇一席守護，昨夜已守 " + fmtSeatNum(lastG) + "號不可連守") : "護心結界 · 擇一席守護，可護自己")
      : (p === "NIGHT_SEER"
        ? "明心靜察 · 擇一席查證立場"
        : (isPlayerWK ? "流言反撲 · 擇一好人席同行（開槍反撲無遺言直接入夜）" : "請擇定席位")));
}

function renderStepperPanel(p) {
  el("panelStepper").classList.remove("hidden");
  const activeSpeaker = getSeat(state.activeSpeakerId);
  const pSeatLive = getPlayerSeat();
  const lastSp = (state.match.speechQueue || []).length === 0;
  const isLwSpeech = (p === "LAST_WORDS_SPEECH");
  const isHunterResolve = (p === "HUNTER_RESOLVE");
  const isNightWait = typeof isNightPhase === "function" && isNightPhase(p);
  const showStepNext = Boolean(
    p === "DAY_SPEECH" ||
    isLwSpeech ||
    isHunterResolve ||
    (p === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && !isPlayerEligibleToVote())
  );
  const stepNextBtn = el("btnStepNext");
  if (stepNextBtn) {
    stepNextBtn.classList.toggle("hidden", !showStepNext);
    if (showStepNext) {
      const nextLabel = isHunterResolve
        ? "繼續 →"
        : (state.typewriter.active
          ? "顯示全文"
          : (isLwSpeech
            ? "繼續 →"
            : (p === "DAY_VOTE" ? "直接開票 →" : (lastSp ? "進入公投 →" : "下一位 →"))));
      stepNextBtn.innerHTML = escapeHtml(nextLabel) + ' <kbd class="ui-kbd ml-1">Space</kbd>';
    }
  }
  const stepRow = stepNextBtn ? stepNextBtn.parentElement : null;
  if (stepRow && stepRow.classList && stepRow.classList.contains("stepper-action-row")) {
    const hasSpecEnd = Boolean(state.match.started && pSeatLive && !pSeatLive.alive && p !== "GAME_OVER");
    const hasMarkTools = (p === "DAY_SPEECH" && activeSpeaker && activeSpeaker.id !== getPlayerId());
    const isSelfSp = ((p === "DAY_SPEECH" || isLwSpeech) && state.activeSpeakerId === getPlayerId());
    stepRow.classList.toggle("hidden", isNightWait && !hasSpecEnd && !showStepNext && !hasMarkTools && !isSelfSp);
  }

  const specEndBtn = el("btnSpectatorEndNow");
  if (specEndBtn) {
    specEndBtn.classList.toggle("hidden", !(state.match.started && pSeatLive && !pSeatLive.alive && p !== "GAME_OVER"));
  }

  const showMarkTools = (p === "DAY_SPEECH" && activeSpeaker && activeSpeaker.id !== getPlayerId());
  const markRow = el("detectiveMarkRow");
  if (markRow) markRow.classList.toggle("hidden", !showMarkTools);
  if (showMarkTools) {
    const curMark = state.playerMarks[activeSpeaker.id] || null;
    const isWolfListener = Boolean(pSeatLive && pSeatLive.role === "wolf");
    const isWolfMateSpeaking = Boolean(isWolfListener && activeSpeaker.role === "wolf");
    if (isWolfMateSpeaking) {
      el("btnMarkGood").disabled = true;
      el("btnMarkWolf").disabled = true;
      el("btnMarkGood").textContent = "同伴發言中";
      el("btnMarkWolf").textContent = "狼隊配合";
      el("btnMarkGood").className = "py-1 px-2 text-[13px] shrink-0 cta-ink opacity-80";
      el("btnMarkWolf").className = "py-1 px-2 text-[13px] shrink-0 cta-ink opacity-80";
    } else if (isWolfListener) {
      el("btnMarkGood").disabled = false;
      el("btnMarkWolf").disabled = false;
      el("btnMarkGood").textContent = curMark === "good" ? "已標假保" : "標記假保";
      el("btnMarkWolf").textContent = curMark === "wolf" ? "已標甩鍋" : "標記甩鍋";
      el("btnMarkGood").className = "py-1 px-2 text-[13px] shrink-0 " + (
        curMark === "good" ? "cta-celadon font-bold" : "cta-ink"
      );
      el("btnMarkWolf").className = "py-1 px-2 text-[13px] shrink-0 " + (
        curMark === "wolf" ? "cta-cinnabar" : "cta-ink"
      );
    } else {
      el("btnMarkGood").disabled = false;
      el("btnMarkWolf").disabled = false;
      el("btnMarkGood").textContent = curMark === "good" ? "已點頭" : "點頭認同";
      el("btnMarkWolf").textContent = curMark === "wolf" ? "已皺眉" : "皺眉存疑";
      el("btnMarkGood").className = "py-1 px-2 text-[13px] shrink-0 " + (
        curMark === "good" ? "cta-celadon font-bold" : "cta-ink"
      );
      el("btnMarkWolf").className = "py-1 px-2 text-[13px] shrink-0 " + (
        curMark === "wolf" ? "cta-cinnabar" : "cta-ink"
      );
    }
    if (el("btnPinCurrentSpeaker")) el("btnPinCurrentSpeaker").textContent = "記重點";
    const interjBtn = el("btnTeaInterject");
    if (interjBtn) {
      const canInterj = typeof canUseTeaInterjectNow === "function" ? canUseTeaInterjectNow() : false;
      const usedToday = Boolean(state.match && state.match.interjectUsedDay === state.match.day);
      const pAliveHere = Boolean(pSeatLive && pSeatLive.alive);
      interjBtn.classList.toggle("hidden", !pAliveHere);
      interjBtn.disabled = !canInterj;
      interjBtn.textContent = usedToday ? "今日已追問" : "舉杯追問 (1)";
      interjBtn.title = usedToday
        ? "今日舉杯追問次數已用完，明日刷新"
        : "每日限 1 次：當場舉杯拋出短問，逼發言者即時回防";
    }
    const mTxt = el("tableMomentumText");
    if (mTxt) {
      const pSus = Math.round(activeSpeaker.suspicionMap[getPlayerId()] || 50);
      if (pSus >= 62) {
        mTxt.textContent = "他正存疑你";
        mTxt.className = "text-[13px] text-rose-300 font-semibold truncate hidden sm:inline pl-1";
      } else if (pSus <= 38) {
        mTxt.textContent = "他傾向信任你";
        mTxt.className = "text-[13px] text-emerald-300 font-semibold truncate hidden sm:inline pl-1";
      } else {
        mTxt.textContent = "";
        mTxt.className = "hidden";
      }
    }
    const microBtn = el("btnMicroInspect");
    if (microBtn) {
      const classicMode = typeof isClassicSimpleMode === "function" && isClassicSimpleMode();
      microBtn.classList.toggle("hidden", classicMode);
      if (!classicMode) {
        const pSelf = getPlayerSeat();
        const mMax = typeof getMicroInspectMaxToday === "function" ? getMicroInspectMaxToday() : 1;
        const mRem = Math.max(0, mMax - ((state.match && state.match.microInspectCountToday) || 0));
        const dKey = ((state.match && state.match.day) || 0) + ":" + activeSpeaker.id;
        const doneAlready = Boolean(state.match && state.match.microInspectedSeats && state.match.microInspectedSeats[dKey]);
        const canInspect = Boolean(pSelf && pSelf.alive && activeSpeaker.alive && mRem > 0 && !doneAlready);
        microBtn.disabled = !canInspect;
        microBtn.textContent = doneAlready ? "已看心虛" : ("看心虛(" + mRem + ")");
        microBtn.title = doneAlready
          ? "今天已查看過這位發言者的心虛緊張度"
          : (mRem > 0 ? "查看這位發言者此刻的心虛緊張值（每日限用 " + mMax + " 次）" : "今日看心虛次數已用完，明天刷新");
      }
    }
  } else {
    if (el("interjectPopover")) el("interjectPopover").classList.add("hidden");
    state.interjectOpen = false;
  }

  const candleBox = el("candlelitReviewCard");
  const showCandle = Boolean(isNightWait && state.match && state.match.candlelitReview && state.match.candlelitReview.active);
  if (candleBox) {
    candleBox.classList.toggle("hidden", !showCandle);
    if (showCandle && typeof renderCandlelitNightSlips === "function") {
      renderCandlelitNightSlips();
    }
  }

  const watchBox = el("turnWatchNotice");
  if (watchBox) {
    const showWatch = Boolean(p === "DAY_SPEECH" && state.activeClash && !state.activeClash.resolved && pSeatLive && pSeatLive.alive);
    watchBox.classList.toggle("hidden", !showWatch);
    const warmBtn = el("btnWarmDeescalate");
    if (warmBtn) {
      const canWarm = Boolean(showWatch && (state.activeClash.kind === "toxic_slip" || state.activeClash.kind === "accuse_you"));
      warmBtn.classList.toggle("hidden", !canWarm);
      if (canWarm) warmBtn.textContent = "溫言化解";
    }
    if (showWatch) {
      const cSp = getSeat(state.activeClash.speakerId);
      const wTxt = el("turnWatchText");
      if (wTxt && cSp) {
        if (state.activeClash.kind === "fake_seer") {
          wTxt.textContent = fmtSeatNum(cSp.id) + "號 " + cSp.name + " 冒充明心觀察員，已備好反駁牌，輪到你的順位即可拆穿。";
        } else if (state.activeClash.kind === "contradiction" && state.activeClash.contradiction) {
          wTxt.textContent = "抓到矛盾（" + state.activeClash.contradiction.label + "）：" + state.activeClash.contradiction.detail + "｜按「記進筆記」可於發言時直接引用。";
        } else if (state.activeClash.kind === "toxic_slip") {
          wTxt.textContent = fmtSeatNum(cSp.id) + "號 " + cSp.name + " 語氣帶刺，可先記進筆記，輪到你再點出破綻。";
        } else {
          wTxt.textContent = state.activeClash.inWolfPit
            ? ("前置位 " + fmtSeatNum(cSp.id) + "號 " + cSp.name + " 把你點進狼坑，輪到你的順位即可正面回應。")
            : (fmtSeatNum(cSp.id) + "號 " + cSp.name + " 點名懷疑你，輪到你的順位即可正面回應。");
        }
      }
    }
  }

  const moodBadge = el("speakerMoodBadge");
  if (moodBadge) {
    if (!activeSpeaker) {
      moodBadge.textContent = "主持播報";
    } else if ((state.match.microPulseRevealed || activeSpeaker.sweatExposed) && activeSpeaker.microPulse >= 60) {
      moodBadge.textContent = "神色緊張";
    } else if (state.typewriter.active || voice.speaking) {
      moodBadge.textContent = "發言中";
    } else {
      moodBadge.textContent = activeSpeaker.trait || "在場";
    }
  }
  const hunterShot = state.match.lastHunterShot;
  el("stepperStatusText").textContent = isHunterResolve
    ? (hunterShot
      ? ("直心糾察長 " + fmtSeatNum(hunterShot.hunterId) + "號 " + hunterShot.hunterName + " 帶走 " + fmtSeatNum(hunterShot.targetId) + "號 " + hunterShot.targetName + " 一同離席。")
      : "直心糾察長壓下正氣共鳴，未帶走任何人。")
    : (showCandle
      ? "燭下覆茶 · 圈選明日盯防席位"
      : (activeSpeaker
        ? (activeSpeaker.id + "號 " + activeSpeaker.name + "發言中…")
        : "天黑行動中…"));
}

function renderSheriffTransferPanel() {
  const panel = el("panelSheriffTransfer");
  if (!panel) return;
  panel.classList.remove("hidden");
  const box = el("sheriffTransferButtons");
  if (!box) return;
  box.innerHTML = "";
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  const m = state.match || {};
  const myFlow = (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === pid)
    ? m.sheriffBadgeFlow
    : ((m.sheriffBadgeFlowsBySeat && m.sheriffBadgeFlowsBySeat[pid]) || null);
  const f1 = myFlow ? myFlow.firstTargetId : null;
  const f2 = myFlow ? myFlow.secondTargetId : null;
  const isSeerP = Boolean(pSeat && pSeat.role === "seer");
  const getMyChk = function (sid) {
    if (!isSeerP || !Array.isArray(pSeat.checkedHistory)) return null;
    return pSeat.checkedHistory.slice().reverse().find(function (c) { return c && c.targetId === sid; }) || null;
  };
  const f1Chk = f1 ? getMyChk(f1) : null;
  const f2Chk = f2 ? getMyChk(f2) : null;

  const hasNightElapsedP = Boolean(myFlow && ((m.day || 1) > (myFlow.dayDeclared || 1)));
  const isSeerClaimOrRoleP = Boolean(isSeerP || (pSeat && pSeat.claimedRole === "seer"));
  const canSignalFlow = Boolean(myFlow && f1 && isSeerClaimOrRoleP && (hasNightElapsedP || Boolean(f1Chk)));

  const guideEl = el("sheriffTransferFlowGuide");
  if (guideEl) {
    if (myFlow && f1 && typeof formatBadgeFlowSummary === "function") {
      const f1Lbl = typeof getSeatFlowLabel === "function" ? getSeatFlowLabel(f1) : (fmtSeatNum(f1) + "號");
      const f2Lbl = f2 ? (typeof getSeatFlowLabel === "function" ? getSeatFlowLabel(f2) : (fmtSeatNum(f2) + "號")) : "";
      let guideText = canSignalFlow
        ? ("警徽流傳訊指南【" + formatBadgeFlowSummary(myFlow) + "】：飛給警1（" + f1Lbl + "）⇒ 全場解讀為金水；" +
          (f2Lbl ? ("跳飛警2（" + f2Lbl + "）⇒ 報 " + f1Lbl + " 疑查殺、" + f2Lbl + " 金水；") : "") +
          "直接撕徽 ⇒ 報 " + f1Lbl + " 高度疑為查殺！")
        : (!isSeerClaimOrRoleP
          ? ("你尚未公開亮明觀察員身分，本次交棒將作為一般信任傳承（請移交給你信任的存活夥伴或撕毀警徽）。")
          : ("你今日才剛宣告警徽流【" + formatBadgeFlowSummary(myFlow) + "】、尚未經過夜晚查驗，請直接將警徽移交給你信任的存活夥伴或當場撕毀。"));
      let guideTone = "";
      if (isSeerP && f1Chk) {
        if (f1Chk.isWolf) {
          guideTone = " is-wolf-alert";
          guideText = "你昨夜查驗第一警徽流 " + f1Lbl + " 為【鍵盤酸民狼】！建議按下方「撕毀警徽」或改飛 " + (f2Lbl && f2Chk && !f2Chk.isWolf ? f2Lbl : "已驗好人") + "，將查殺暗號傳給全場！";
        } else {
          guideTone = " is-good-alert";
          guideText = "你昨夜查驗第一警徽流 " + f1Lbl + " 為【書院好夥伴（金水）】！直接將警徽飛給 " + f1Lbl + "，即可向全場亮出警徽流金水認證！";
        }
      }
      guideEl.textContent = guideText;
      guideEl.className = "badge-flow-guide text-left" + guideTone;
    } else {
      guideEl.classList.add("hidden");
    }
  }

  const shatterBtn = el("btnShatterSheriffBadge");
  if (shatterBtn) {
    if (canSignalFlow) {
      const f1LblS = typeof getSeatFlowLabel === "function" ? getSeatFlowLabel(f1) : (fmtSeatNum(f1) + "號");
      shatterBtn.textContent = "撕毀警徽 · 報 " + f1LblS + " 疑查殺";
    } else {
      shatterBtn.textContent = "撕毀警徽 · 本局無警";
    }
  }

  getAliveSeats().filter(function (s) { return s.id !== pid; }).forEach(function (s) {
    const btn = document.createElement("button");
    btn.type = "button";
    const chk = getMyChk(s.id);
    let tagSuffix = "";
    let cls = "cta-brass py-1.5 px-2.5 text-[15px]";
    if (s.id === f1) {
      if (chk && !chk.isWolf) { tagSuffix = "〔警1・金水〕"; cls = "cta-celadon py-1.5 px-2.5 text-[15px]"; }
      else if (chk && chk.isWolf) { tagSuffix = "〔警1・查殺〕"; cls = "cta-ink py-1.5 px-2.5 text-[15px]"; }
      else if (canSignalFlow) { tagSuffix = "〔警1・報金水〕"; }
      else { tagSuffix = "〔警1〕"; }
    } else if (s.id === f2) {
      if (chk && !chk.isWolf) { tagSuffix = "〔警2・金水〕"; cls = "cta-celadon py-1.5 px-2.5 text-[15px]"; }
      else if (canSignalFlow) { tagSuffix = "〔警2・跳飛〕"; }
      else { tagSuffix = "〔警2〕"; }
    } else if (chk && !chk.isWolf) {
      tagSuffix = "〔已驗金水〕";
      cls = "cta-celadon py-1.5 px-2.5 text-[15px]";
    }
    btn.className = cls;
    btn.textContent = "交給 " + fmtSeatNum(s.id) + "號 " + s.name + tagSuffix;
    btn.addEventListener("click", function () {
      if (typeof resolvePlayerSheriffTransfer === "function") resolvePlayerSheriffTransfer(s.id);
    });
    box.appendChild(btn);
  });
}

function renderSheriffElectionPanel() {
  const ctx = state.match && state.match.sheriffElectionCtx;
  if (!el("panelSheriffElection")) return;
  el("panelSheriffElection").classList.remove("hidden");
  if (!ctx) return;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  const pAlive = Boolean(pSeat && pSeat.alive);
  const stage = ctx.stage || "signup";
  const orderIds = (Array.isArray(ctx.speechOrderIds) && ctx.speechOrderIds.length > 0)
    ? ctx.speechOrderIds
    : (ctx.candidateIds || []);
  const spokenList = Array.isArray(ctx.spokenSpeeches) ? ctx.spokenSpeeches : (ctx.speeches || []);
  const spokenMap = {};
  spokenList.forEach(function (sp) { if (sp && sp.id) spokenMap[sp.id] = sp; });
  const withdrawnIds = Array.isArray(ctx.withdrawnIds) ? ctx.withdrawnIds : [];

  const headEl = el("sheriffElectionHeadline");
  if (headEl) {
    const aliveCandN = (ctx.candidateIds || []).length;
    if (stage === "signup") {
      headEl.textContent = aliveCandN === 1
        ? "第一天上警競選（目前 1 人單邊舉手）・可上警搶麥或警下聽選"
        : ("第一天上警競選（目前 " + aliveCandN + " 人舉手）・可上警或警下聽選");
    } else if (stage === "speech") {
      const idxHuman = Math.min(orderIds.length, Math.max(1, (ctx.speechIndex || 0) + 1));
      headEl.textContent = "警上輪流發言（第 " + idxHuman + " / " + Math.max(1, orderIds.length) + " 位）";
    } else {
      headEl.textContent = aliveCandN <= 1
        ? "警上僅餘 1 位留場・確認頒發警徽"
        : ("警上發言完畢（共 " + aliveCandN + " 人角逐）・請警下投票");
    }
  }

  const stripEl = el("sheriffOrderStrip");
  if (stripEl) {
    stripEl.innerHTML = "";
    orderIds.forEach(function (cid) {
      if (withdrawnIds.indexOf(cid) !== -1) return;
      const cs = getSeat(cid);
      if (!cs) return;
      const isSp = stage === "speech" && ctx.activeReelSeatId === cid;
      const isDone = Boolean(spokenMap[cid]) && !isSp;
      const pill = document.createElement("span");
      pill.className = "sheriff-order-pill" + (isSp ? " is-speaking" : (isDone ? " is-done" : ""));
      const nm = cid === pid ? (fmtSeatNum(cid) + "你") : (fmtSeatNum(cid) + cs.name);
      pill.textContent = (isSp ? "[發言] " : (isDone ? "[已講] " : "")) + nm;
      stripEl.appendChild(pill);
    });
    withdrawnIds.forEach(function (wid) {
      const ws = getSeat(wid);
      if (!ws) return;
      const pill = document.createElement("span");
      pill.className = "sheriff-order-pill is-withdrawn";
      pill.textContent = fmtSeatNum(wid) + (wid === pid ? "你" : ws.name) + "(退水)";
      stripEl.appendChild(pill);
    });
  }

  const moodBadgeSh = el("speakerMoodBadge");
  if (moodBadgeSh) {
    moodBadgeSh.textContent = stage === "speech"
      ? (ctx.activeReelSeatId === pid ? "輪到你警上" : "警上發言")
      : (stage === "vote" ? "警下投票" : "上警競選");
  }

  const cBox = el("sheriffElectionCandidates");
  if (cBox) {
    cBox.innerHTML = "";
    if (Array.isArray(ctx.dramaEvents) && ctx.dramaEvents.length) {
      const dramaBanner = document.createElement("div");
      dramaBanner.className = "rounded px-2.5 py-1.5 text-[13px] font-bold bg-amber-500/15 border border-amber-400/45 text-amber-100 mb-1";
      dramaBanner.textContent = ctx.dramaEvents[0];
      cBox.appendChild(dramaBanner);
    }
    if (stage === "signup") {
      const rosterRow = document.createElement("div");
      rosterRow.className = "flex items-center flex-wrap gap-1.5 px-1 py-1";
      (ctx.candidateIds || []).forEach(function (cid) {
        const cs = getSeat(cid);
        if (!cs || !cs.alive) return;
        const badge = document.createElement("span");
        badge.className = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-bold bg-amber-500/15 border border-amber-400/45 text-amber-100";
        badge.textContent = "" + fmtSeatNum(cid) + "號 " + (cid === pid ? "你" : cs.name) + "（待發言）";
        rosterRow.appendChild(badge);
      });
      cBox.appendChild(rosterRow);
    } else {
      const visibleRecap = (stage === "speech" && ctx.activeReelSeatId && ctx.activeReelSeatId !== pid)
        ? spokenList.filter(function (sp) { return sp.id !== ctx.activeReelSeatId; })
        : spokenList;
      visibleRecap.forEach(function (sp) {
        const row = document.createElement("div");
        const isClash = sp.tone === "clash";
        const isSeer = sp.tone === "seer";
        const isPlayful = sp.tone === "playful" || sp.tone === "bluff";
        const isWithdrew = Boolean(sp.withdrewAfterSpeech);
        const isActiveNow = stage === "speech" && ctx.activeReelSeatId === sp.id;
        row.className = "rounded px-2.5 py-1.5 text-[13px] transition " + (isActiveNow
          ? "bg-amber-500/20 border border-amber-300/70 text-amber-50"
          : (isClash
            ? "bg-rose-950/50 border border-rose-400/40 text-rose-50"
            : (isSeer
              ? "bg-amber-950/45 border border-amber-400/45 text-amber-50"
              : (isWithdrew
                ? "bg-stone-900/50 border border-stone-600/35 text-stone-300 opacity-85"
                : "bg-stone-950/65 border border-amber-400/20 text-stone-200"))));
        const badgeHtml = sp.tag
          ? ('<span class="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[13px] font-semibold ' + (isClash ? "bg-rose-500/25 text-rose-200" : (isSeer ? "bg-amber-500/25 text-amber-200" : (isPlayful ? "bg-emerald-500/20 text-emerald-200" : "bg-stone-700/60 text-amber-100"))) + '">' + escapeHtml(sp.tag) + "</span>")
          : "";
        const bfChipHtml = (sp.badgeFlow && sp.badgeFlow.firstTargetId && typeof formatBadgeFlowSummary === "function")
          ? ('<span class="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[13px] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-200">警徽流：' + escapeHtml(formatBadgeFlowSummary(sp.badgeFlow)) + "</span>")
          : "";
        row.innerHTML = badgeHtml + bfChipHtml + '<span class="font-bold text-amber-300">' + (sp.id === pid ? ("[警] " + playerNumTag() + " 你") : (fmtSeatNum(sp.id) + "號 " + escapeHtml(sp.name))) + "：</span>" + escapeHtml(sp.text);
        cBox.appendChild(row);
      });
    }
  }

  const isPlayerSpeechNow = Boolean(stage === "speech" && ctx.activeReelSeatId === pid && pAlive);
  const pTurnBox = el("sheriffPlayerTurnBox");
  if (pTurnBox) {
    pTurnBox.classList.toggle("hidden", !isPlayerSpeechNow);
    const bfBar = el("sheriffPlayerBadgeFlowBar");
    if (bfBar && isPlayerSpeechNow) {
      bfBar.innerHTML = "";
      const draftBf = ctx.playerBadgeFlowDraft || { firstTargetId: null, secondTargetId: null };
      const aliveOtherSeats = getAliveSeats().filter(function (s) { return s.id !== pid; });
      const lblBf = document.createElement("span");
      lblBf.className = "font-bold shrink-0";
      lblBf.textContent = "雙警徽流設定：";
      bfBar.appendChild(lblBf);

      const mkSel = function (selName, placeholder, curVal, excludeId, onChangeFn) {
        const sel = document.createElement("select");
        sel.className = "badge-flow-select";
        sel.name = selName;
        sel.setAttribute("aria-label", placeholder);
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = placeholder;
        sel.appendChild(emptyOpt);
        aliveOtherSeats.forEach(function (s) {
          if (excludeId && s.id === excludeId) return;
          const op = document.createElement("option");
          op.value = String(s.id);
          op.textContent = fmtSeatNum(s.id) + "號 " + s.name;
          if (curVal === s.id) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener("change", function () {
          sound.unlock();
          onChangeFn(parseInt(sel.value, 10) || null);
        });
        return sel;
      };
      const sel1 = mkSel("electionBadgeFlow1", "第一警徽流（不留）", draftBf.firstTargetId, null, function (v1) {
        const next2 = (draftBf.secondTargetId && draftBf.secondTargetId !== v1) ? draftBf.secondTargetId : null;
        if (typeof setPlayerSheriffDraftBadgeFlow === "function") setPlayerSheriffDraftBadgeFlow(v1, next2);
      });
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      arrow.className = "opacity-75 font-bold";
      const sel2 = mkSel("electionBadgeFlow2", "第二警徽流（選填）", draftBf.secondTargetId, draftBf.firstTargetId, function (v2) {
        if (typeof setPlayerSheriffDraftBadgeFlow === "function") setPlayerSheriffDraftBadgeFlow(draftBf.firstTargetId, v2);
      });
      const hintBf = document.createElement("span");
      hintBf.className = "text-[13px] opacity-80";
      hintBf.textContent = "（倒牌：徽給先位＝金水｜跳飛／撕徽＝查殺）";
      bfBar.appendChild(sel1);
      bfBar.appendChild(arrow);
      bfBar.appendChild(sel2);
      bfBar.appendChild(hintBf);
    }

    const chipsBox = el("sheriffPlayerQuickChips");
    if (isPlayerSpeechNow && chipsBox) {
      chipsBox.innerHTML = "";
      const qOpts = (Array.isArray(ctx.playerQuickOptions) && ctx.playerQuickOptions.length)
        ? ctx.playerQuickOptions
        : (typeof buildPlayerSheriffQuickOptions === "function" ? buildPlayerSheriffQuickOptions(pSeat, ctx.playerBadgeFlowDraft) : []);
      qOpts.forEach(function (opt) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "play-card-btn is-compact-card text-left flex flex-col justify-between gap-1";
        card.innerHTML =
          '<div class="flex items-center justify-between gap-1.5 w-full">' +
          '<span class="text-[13px] font-bold text-amber-200 truncate">' + escapeHtml(opt.title) + '</span>' +
          '<span role="button" tabindex="0" class="play-card-load-btn shrink-0" data-card-load="1" title="帶入下方陳詞欄並同步警徽流微調">帶入改詞</span>' +
          '</div>' +
          '<div class="text-[13px] text-slate-300 line-clamp-2">' + escapeHtml(opt.text) + '</div>';
        const loadEl = typeof card.querySelector === "function" ? card.querySelector("[data-card-load]") : null;
        if (loadEl && typeof loadEl.addEventListener === "function") {
          const loadShDraft = function (ev) {
            if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
            if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
            sound.unlock();
            ctx._draftCardMeta = {
              claimsSeer: typeof opt.claimsSeer === "boolean" ? opt.claimsSeer : null,
              withdrawAfter: Boolean(opt.withdrawAfter)
            };
            if (opt.badgeFlow && opt.badgeFlow.firstTargetId) {
              ctx.playerBadgeFlowDraft = {
                firstTargetId: opt.badgeFlow.firstTargetId || null,
                secondTargetId: opt.badgeFlow.secondTargetId || null,
                explicit: true
              };
              if (typeof buildPlayerSheriffQuickOptions === "function") {
                ctx.playerQuickOptions = buildPlayerSheriffQuickOptions(pSeat, ctx.playerBadgeFlowDraft);
              }
              renderSheriffElectionPanel();
            }
            const shInp = el("sheriffPlayerInput");
            if (shInp) {
              shInp.value = opt.text || "";
              if (typeof autoResizeSpeechTextarea === "function") autoResizeSpeechTextarea(shInp);
              if (typeof shInp.focus === "function") shInp.focus();
              try {
                if (typeof shInp.setSelectionRange === "function") {
                  shInp.setSelectionRange(shInp.value.length, shInp.value.length);
                }
              } catch (e) { }
            }
            if (typeof sound !== "undefined" && typeof sound.tone === "function") sound.tone(540, 0.05, "triangle", 0.04, 0);
            if (typeof showToast === "function") showToast("已將上警宣言帶入下方輸入框" + (opt.badgeFlow ? "（同步警徽流）" : "") + "，可自由改詞後送出。", "emerald");
          };
          loadEl.addEventListener("click", loadShDraft);
          loadEl.addEventListener("keydown", function (ev) {
            if (ev && (ev.key === "Enter" || ev.key === " ")) loadShDraft(ev);
          });
        }
        card.addEventListener("click", function () {
          if (typeof submitPlayerSheriffSpeech === "function") {
            submitPlayerSheriffSpeech(opt.text, opt.badgeFlow || null, {
              claimsSeer: opt.claimsSeer,
              withdrawAfter: Boolean(opt.withdrawAfter)
            });
          }
        });
        chipsBox.appendChild(card);
      });
    }
    if (isPlayerSpeechNow && typeof autoResizeSpeechTextarea === "function") {
      autoResizeSpeechTextarea(el("sheriffPlayerInput"));
    }
  }

  const vBox = el("sheriffElectionVoteRow");
  if (vBox) {
    vBox.innerHTML = "";
    const canVoteUnder = Boolean(stage === "vote" && pAlive && !ctx.playerRunning);
    vBox.classList.toggle("hidden", !canVoteUnder);
    if (canVoteUnder) {
      ctx.candidateIds.forEach(function (cid) {
        if (cid === pid) return;
        const cs = getSeat(cid);
        if (!cs || !cs.alive) return;
        const vb = document.createElement("button");
        vb.type = "button";
        vb.className = "cta-celadon py-1.5 px-3 text-[15px]";
        vb.textContent = "投給 " + fmtSeatNum(cid) + "號 " + cs.name;
        vb.addEventListener("click", function () {
          if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction(cid);
        });
        vBox.appendChild(vb);
      });
    }
  }

  if (el("btnSheriffRun")) {
    el("btnSheriffRun").classList.toggle("hidden", stage !== "signup" || !pAlive || Boolean(ctx.playerRunning || ctx.playerWithdrew));
  }
  if (el("btnSheriffStartSpeech")) {
    el("btnSheriffStartSpeech").classList.toggle("hidden", stage !== "signup");
  }
  const nextSpBtn = el("btnSheriffNextSpeech");
  if (nextSpBtn) {
    const showNextSp = Boolean(stage === "speech" && !isPlayerSpeechNow);
    nextSpBtn.classList.toggle("hidden", !showNextSp);
    if (showNextSp) {
      const remainingAfter = orderIds.slice((ctx.speechIndex || 0) + 1).filter(function (cid) {
        const cs = getSeat(cid);
        return Boolean(cs && cs.alive && ctx.candidateIds.indexOf(cid) !== -1);
      }).length;
      const lbl = remainingAfter === 0 ? "進入警下投票 →" : "下一位候選人 →";
      nextSpBtn.innerHTML = escapeHtml(lbl) + ' <kbd class="ui-kbd ml-1">Space</kbd>';
    }
  }
  if (el("btnSheriffWithdraw")) {
    el("btnSheriffWithdraw").classList.toggle("hidden", !pAlive || !ctx.playerRunning);
  }
  if (el("btnSheriffPass")) {
    if (stage === "vote") {
      el("btnSheriffPass").textContent = ctx.playerRunning ? "維持上警・開始開票" : "棄票／自動開票";
    } else if (stage === "speech") {
      el("btnSheriffPass").textContent = "略過剩餘發言・直接開票";
    } else {
      el("btnSheriffPass").textContent = "略過發言・直接決選";
    }
  }
}

function renderControlPanels() {
  const p = state.match.phase;
  ["panelLobby", "panelStepper", "panelTargetAction", "panelPlayerSpeech", "panelVote", "panelVoteResult", "panelLastWords", "panelSheriffTransfer", "panelSheriffElection", "panelSheriffOrder", "panelGameOver"].forEach(function (id) {
    if (el(id)) el(id).classList.add("hidden");
  });

  syncFocalCardChrome(p);
  if (typeof renderSpectatorGuessPanel === "function") renderSpectatorGuessPanel();
  if (typeof renderListenPitBar === "function") renderListenPitBar();

  if (p === "LOBBY") { el("panelLobby").classList.remove("hidden"); return; }
  if (p === "DAY_PLAYER_TURN") { el("panelPlayerSpeech").classList.remove("hidden"); return; }
  if (p === "LAST_WORDS_PLAYER") { if (el("panelLastWords")) el("panelLastWords").classList.remove("hidden"); return; }
  if (p === "SHERIFF_TRANSFER") { renderSheriffTransferPanel(); return; }
  if (p === "SHERIFF_ELECTION") { renderSheriffElectionPanel(); return; }
  if (p === "SHERIFF_ORDER") { if (el("panelSheriffOrder")) el("panelSheriffOrder").classList.remove("hidden"); return; }
  if (p === "DAY_VOTE_RESULT" && state.voteResultPayload) { renderVoteResultPanel(); return; }
  if (p === "DAY_VOTE") { renderVotePickPanel(); return; }
  if (p === "GAME_OVER") { el("panelGameOver").classList.remove("hidden"); renderGameOverMetrics(); return; }

  const player = getPlayerSeat();
  const playerNeedsNightInput = player && player.alive && (
    (p === "NIGHT_GUARD" && player.role === "guard") ||
    (p === "NIGHT_WOLF" && player.role === "wolf") ||
    (p === "NIGHT_SEER" && player.role === "seer") ||
    (p === "NIGHT_WITCH" && player.role === "witch" && (state.match.witchPotions.heal || state.match.witchPotions.purify))
  );
  const playerNeedsHunterInput = p === "HUNTER_TRIGGER" && player && (player.role === "hunter" || player.isWolfKing) && !player.alive;
  if (playerNeedsNightInput || playerNeedsHunterInput) {
    renderNightAndHunterPanel(p);
    return;
  }

  renderStepperPanel(p);
}

function renderGameOverMetrics() {
  const m = state.match;
  const player = getPlayerSeat();
  const playerWon = player && player.team === m.winner;
  el("gameOverHeadline").textContent = m.winner === "early_end"
    ? "已提前結束・揭曉底牌"
    : ((m.winner === "good" ? "好人贏了！" : "酸民狼贏了！") + (playerWon ? " (勝利)" : ""));
  el("gameOverReason").textContent = m.winReason;
  const truthEl = el("gameOverTruthLine");
  if (truthEl) {
    const wolfList = m.seats.filter(function (s) { return s.role === "wolf"; }).map(function (s) { return s.id + "號" + (s.id === getPlayerId() ? "你" : s.name) + (s.isWolfKing ? "(流言首領)" : ""); }).join("、");
    const seerObj = m.seats.find(function (s) { return s.role === "seer"; });
    const witchObj = m.seats.find(function (s) { return s.role === "witch"; });
    const hunterObj = m.seats.find(function (s) { return s.role === "hunter"; });
    const guardObj = m.seats.find(function (s) { return s.role === "guard"; });
    const elderObj = m.seats.find(function (s) { return s.isElder; });
    truthEl.textContent = "本局真相：酸民狼【" + wolfList + "】" +
      (seerObj ? ("｜明心觀察員【" + seerObj.id + "號" + (seerObj.id === getPlayerId() ? "你" : seerObj.name) + "】") : "") +
      (witchObj ? ("｜滴水奉茶師【" + witchObj.id + "號" + (witchObj.id === getPlayerId() ? "你" : witchObj.name) + "】") : "") +
      (hunterObj ? ("｜直心糾察長【" + hunterObj.id + "號" + (hunterObj.id === getPlayerId() ? "你" : hunterObj.name) + "】") : "") +
      (guardObj ? ("｜護心守衛【" + guardObj.id + "號" + (guardObj.id === getPlayerId() ? "你" : guardObj.name) + "】") : "") +
      (elderObj ? ("｜清心長老【" + elderObj.id + "號" + (elderObj.id === getPlayerId() ? "你" : elderObj.name) + "】") : "");
  }

  const gEval = (m.spectatorGuess && m.spectatorGuess.evaluated) ? m.spectatorGuess.evaluated : (typeof evaluateSpectatorGuess === "function" ? evaluateSpectatorGuess() : null);
  const guessBonus = (gEval && gEval.bonusPts) ? gEval.bonusPts : 0;
  const misEval = typeof evaluateRoleMission === "function" ? evaluateRoleMission() : m.roleMission;
  const missionBonus = (misEval && misEval.completed) ? (misEval.bonusPts || 15) : 0;
  const scorePts = m.harmonyScore + m.stats.goodWordsCount * 8 + m.stats.fourGCount * 7 + m.stats.rewritesUsed * 8 + (m.stats.cluesCaught || 0) * 8 + (m.stats.logicBreaksLanded || 0) * 12 - m.stats.toxicSentCount * 15 + (playerWon ? 15 : 0) + guessBonus + missionBonus;
  el("playerGradeBadge").textContent = scorePts >= 100 ? "S級" : scorePts >= 80 ? "A級" : "B級";
  const misEl = el("gameOverMissionLine");
  if (misEl) {
    if (misEval) {
      misEl.classList.remove("hidden");
      misEl.textContent = (misEval.completed ? "秘密角色任務達成「" : "秘密角色任務「") + misEval.title + "」：" + misEval.progressText + (misEval.completed ? " (+15分)" : "");
      misEl.className = misEval.completed
        ? "text-[13px] font-bold text-emerald-300 text-left mt-1.5"
        : "text-[13px] font-medium text-slate-300 text-left mt-1.5";
    } else {
      misEl.classList.add("hidden");
    }
  }
  if (typeof renderGameOverGuessSummary === "function") renderGameOverGuessSummary();

  // v20.0 1) Three Key Turning Points Axis
  const tpWrap = el("gameOverTurningPoints");
  if (tpWrap) {
    const turningPoints = typeof buildMatchTurningPoints === "function" ? buildMatchTurningPoints() : [];
    if (turningPoints.length > 0) {
      let tpHtml = '<div class="gameover-section-head">本局三大勝負轉折軸</div><div class="turning-axis-grid">';
      turningPoints.forEach(function (tp, idx) {
        const toneCls = tp.tone === "jade" ? "is-jade" : (tp.tone === "cinnabar" ? "is-cinnabar" : "is-gold");
        tpHtml +=
          '<div class="turning-axis-card ' + toneCls + '">' +
            '<div class="turning-axis-meta">' +
              '<span class="turning-axis-step">0' + (idx + 1) + '</span>' +
              '<span class="turning-axis-stage">' + escapeHtml(tp.stage) + '</span>' +
            '</div>' +
            '<div class="turning-axis-title">' + escapeHtml(tp.title) + '</div>' +
            '<div class="turning-axis-detail">' + escapeHtml(tp.detail) + '</div>' +
          '</div>';
      });
      tpHtml += '</div>';
      tpWrap.innerHTML = tpHtml;
      tpWrap.classList.remove("hidden");
    } else {
      tpWrap.innerHTML = "";
      tpWrap.classList.add("hidden");
    }
  }

  const metrics = [
    { label: "好話", val: m.stats.goodWordsCount },
    { label: "邏輯破防", val: m.stats.logicBreaksLanded || 0 },
    { label: "最高連擊", val: "x" + (m.maxCombo || 0) },
    { label: "四給卡", val: m.stats.fourGCount + "/4" }
  ];
  const box = el("gameOverMetrics");
  box.innerHTML = "";
  metrics.forEach(function (item) {
    const d = document.createElement("div");
    d.className = "p-1.5 rounded-xl bg-slate-950 border border-slate-800";
    d.innerHTML = '<div class="text-[13px] text-slate-400">' + escapeHtml(item.label) + '</div><div class="text-sm font-black text-amber-200">' + escapeHtml(item.val) + "</div>";
    box.appendChild(d);
  });

  // v24.3 Three-Good & Four-Givings Causal Ledger
  const virtueWrap = el("gameOverVirtueLedger");
  if (virtueWrap) {
    const ledger = typeof buildThreeGoodFourGLedger === "function" ? buildThreeGoodFourGLedger() : null;
    if (ledger) {
      let vHtml =
        '<div class="virtue-ledger-head">' +
          '<div class="gameover-section-head">本局三好四給因果錄</div>' +
          '<span class="virtue-title-seal">' + escapeHtml(ledger.virtueTitle) + '</span>' +
        '</div>' +
        '<div class="virtue-ledger-sub">' + escapeHtml(ledger.virtueSubtitle) +
          '（終局茶風：' + escapeHtml(ledger.atmosphere.label) + ' · 友善度 ' + escapeHtml(ledger.harmonyScore) + '）</div>' +
        '<div class="virtue-petal-grid">';
      ledger.petals.forEach(function (pt) {
        vHtml +=
          '<div class="virtue-petal-item' + (pt.lit ? ' is-lit' : '') + '">' +
            '<div class="virtue-petal-name">' + escapeHtml(pt.name) + (pt.lit ? ' · 已修' : ' · 未修') + '</div>' +
            '<div class="virtue-petal-note">' + escapeHtml(pt.note) + '</div>' +
          '</div>';
      });
      vHtml += '</div><div class="virtue-fourg-row">';
      ledger.fourG.forEach(function (fg) {
        vHtml +=
          '<span class="virtue-fourg-chip' + (fg.used ? ' is-used' : '') + '">' +
            escapeHtml(fg.name) + ' · ' + escapeHtml(fg.tag) +
          '</span>';
      });
      vHtml += '</div>';
      if (ledger.impacts && ledger.impacts.length > 0) {
        vHtml += '<div class="virtue-impact-list">';
        ledger.impacts.forEach(function (imp) {
          const impCls = imp.tone === "cinnabar" ? " is-cinnabar" : (imp.tone === "gold" ? " is-gold" : " is-jade");
          vHtml +=
            '<div class="virtue-impact-row' + impCls + '">' +
              '<span class="virtue-impact-day">D' + escapeHtml(imp.day) + '</span>' +
              '<span class="virtue-impact-title">' + escapeHtml(imp.title) + '：</span>' +
              '<span class="virtue-impact-detail">' + escapeHtml(imp.detail) + '</span>' +
            '</div>';
        });
        vHtml += '</div>';
      }
      virtueWrap.innerHTML = vHtml;
      virtueWrap.classList.remove("hidden");
    } else {
      virtueWrap.innerHTML = "";
      virtueWrap.classList.add("hidden");
    }
  }

  // v20.0 2) Full Seat Truth & Speech-Action Comparison Table
  const truthWrap = el("gameOverSeatTruthBox");
  if (truthWrap) {
    const rows = typeof buildFullSeatTruthRows === "function" ? buildFullSeatTruthRows() : [];
    if (rows.length > 0) {
      let tblHtml =
        '<div class="gameover-section-head">全席底牌與言行對照表</div>' +
        '<div class="gameover-truth-scroll">' +
        '<table class="gameover-truth-table">' +
          '<thead><tr>' +
            '<th>席位</th><th>真實底牌</th><th>公開立場</th><th>關鍵行動／投票紀錄</th><th>狀態</th>' +
          '</tr></thead><tbody>';
      rows.forEach(function (r) {
        const rowCls = (r.team === "wolf" ? "is-wolf-row" : "is-good-row") + (r.isPlayer ? " is-player-row" : "");
        const shTag = r.isSheriff ? '<span class="truth-badge-sheriff">警長</span>' : "";
        const roleCls = r.team === "wolf" ? "truth-role-wolf" : "truth-role-good";
        const stCls = r.alive ? "truth-status-alive" : "truth-status-out";
        tblHtml +=
          '<tr class="' + rowCls + '">' +
            '<td class="truth-cell-seat">' + escapeHtml(r.seatLabel) + shTag + '</td>' +
            '<td><span class="' + roleCls + '">' + escapeHtml(r.roleName) + '</span></td>' +
            '<td class="truth-cell-stance">' + escapeHtml(r.publicStance) + '</td>' +
            '<td class="truth-cell-act">' + escapeHtml(r.actionRecord) + '</td>' +
            '<td><span class="' + stCls + '">' + escapeHtml(r.statusText) + '</span></td>' +
          '</tr>';
      });
      tblHtml += '</tbody></table></div>';
      truthWrap.innerHTML = tblHtml;
      truthWrap.classList.remove("hidden");
    } else {
      truthWrap.innerHTML = "";
      truthWrap.classList.add("hidden");
    }
  }

  // AI Post-Match Detective Coach Insights (3 crisp turning-point cards)
  if (typeof buildAiPostMatchCoachInsights === "function" && box && box.parentNode) {
    let coachBox = el("gameOverCoachBox");
    if (!coachBox) {
      coachBox = document.createElement("div");
      coachBox.id = "gameOverCoachBox";
      coachBox.className = "space-y-1 text-left mt-2";
      box.parentNode.insertBefore(coachBox, box.nextSibling);
    }
    coachBox.innerHTML = "";
    const insights = buildAiPostMatchCoachInsights();
    insights.forEach(function (ci) {
      const card = document.createElement("div");
      card.className = "rounded-lg px-2 py-1 bg-slate-950/75 border border-amber-400/25 text-[13px] text-slate-200 leading-snug";
      card.innerHTML = '<span class="font-bold text-amber-300">' + escapeHtml(ci.icon + " " + ci.title + "：") + "</span>" + escapeHtml(ci.text);
      coachBox.appendChild(card);
    });
  }
}

function selectSeat(seatId) {
  sound.unlock();
  const maxSeats = state.match.started ? state.match.totalSeats : (parseInt(el("selectModeCount").value, 10) || 6);
  if (seatId < 1 || seatId > maxSeats) return;
  const pid = getPlayerId();
  const alreadySelected = (state.selectedSeatId === seatId);
  state.selectedSeatId = seatId;
  nudgeSeat(seatId, { scale: 0.9, vScale: 0.2, vy: -3 });
  sound.tone(460 + seatId * 30, 0.07, "sine", 0.04, 0);

  const p = state.match.phase;
  const target = getSeat(seatId);
  const player = getPlayerSeat();

  if (!state.match.started || p === "LOBBY") {
    if (seatId !== pid) {
      state.intelSeatId = seatId;
      pokeSeatWithReaction(seatId);
    } else {
      closeSeatIntel();
      setSeatEmotion(seatId, "happy", 2400);
      spawnBurst(seatId, ["#fbbf24", "#fde68a", "#ffffff"], 12, "star");
      spawnFx(seatId, "這就是你!", "#fbbf24");
    }
    updateAllUI();
    return;
  }

  if (alreadySelected && target && target.alive && (seatId !== pid || p === "NIGHT_GUARD")) {
    if (p === "DAY_VOTE" && seatId !== pid && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active)) {
      if (!isValidVoteTarget(seatId)) {
        showToast("平票 PK 決選僅能投給 PK 台上的候選人（或棄票）！", "warn");
        return;
      }
      finalizeVoteRound(seatId);
      return;
    }
    if ((p === "NIGHT_GUARD" && player && player.alive && player.role === "guard" && state.match.lastGuardTargetId !== seatId) ||
      (seatId !== pid && p === "NIGHT_SEER" && !state.seerReveal && player && player.alive && player.role === "seer") ||
      (seatId !== pid && p === "NIGHT_WOLF" && player && player.alive && player.role === "wolf" && target.role !== "wolf") ||
      (seatId !== pid && p === "HUNTER_TRIGGER" && player && canSeatTriggerShot(player) && !player.alive && !(player.isWolfKing && target.role === "wolf"))) {
      confirmTargetAction();
      return;
    }
  }

  const isSpecMode = (typeof isSpectatorGuessActive === "function" && isSpectatorGuessActive());
  if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "DAY_VOTE_RESULT" || isSpecMode) && target && seatId !== pid) {
    if (state.intelSeatId === seatId && target.alive && p === "DAY_SPEECH" && !isSpecMode) {
      const isWolfSelf = Boolean(player && player.role === "wolf");
      if (isWolfSelf && target.role === "wolf") {
        spawnFx(seatId, "狼隊同伴", "#fb7185");
      } else {
        const cur = state.playerMarks[seatId] || null;
        const next = cur === null ? "wolf" : (cur === "wolf" ? "good" : null);
        state.playerMarks[seatId] = next;
        if (typeof syncDraftPitFromPlayerMark === "function") syncDraftPitFromPlayerMark(seatId, next);
        const wLabel = isWolfSelf ? "標記：甩鍋" : "標記：懷疑";
        const gLabel = isWolfSelf ? "標記：假保" : "標記：好人";
        spawnFx(seatId, next === "wolf" ? wLabel : (next === "good" ? gLabel : "清除標記"), next === "wolf" ? "#fb7185" : "#34d399");
      }
    } else {
      state.intelSeatId = seatId;
    }
  } else if (seatId === pid) {
    closeSeatIntel();
  }

  // v11.3 Clicking any seat in the bottom strip or on the table smoothly jumps the 3D camera right in front of that character!
  if (typeof stage3d !== "undefined" && typeof stage3d.jumpToSeatFront === "function") {
    if (seatId === pid && stage3d.closeUpSeatId === pid) {
      stage3d.clearCloseUp();
    } else if (seatId !== pid || p === "NIGHT_GUARD" || stage3d.camPreset !== "firstperson") {
      stage3d.jumpToSeatFront(seatId);
    }
  }

  if (p === "DAY_PLAYER_TURN") preparePlayerSpeechPanel();
  updateAllUI();
}
