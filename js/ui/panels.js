/**
 * 中央焦點控制面板切換（依遊戲階段模組化拆解）、終局三好指標與圓桌選座互動
 */
"use strict";

function syncFocalCardChrome(p) {
  const showSpotlight = (p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH");
  el("spotlightStageBox").classList.toggle("hidden", !showSpotlight);
  const waitRow = el("stepperWaitRow");
  if (waitRow) waitRow.classList.toggle("hidden", showSpotlight);

  const isSelfSpeaking = ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === getPlayerId());
  if (el("selfSpeakingRow")) el("selfSpeakingRow").textContent = playerNumTag() + " 你 正在對全場發言…";
  if (el("playerTurnHeading")) {
    el("playerTurnHeading").textContent = (isPkVoteActive() && state.match.pkCandidates.indexOf(getPlayerId()) !== -1)
      ? ("⚔️ 平票 PK 輪到 " + playerNumTag() + " 你搶救拉票！")
      : ("輪到 " + playerNumTag() + " 你發言（請選牌表態）");
  }
  const selfRow = el("selfSpeakingRow");
  if (selfRow) selfRow.classList.toggle("hidden", !isSelfSpeaking);

  const focalCard = el("focalCenterCard");
  if (focalCard) {
    const spNow = (p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH") ? getSeat(state.activeSpeakerId) : null;
    focalCard.style.borderColor = spNow ? spNow.color : "";
  }

  const dragHint = el("dragGestureHint");
  if (dragHint) {
    if (!state.match.started || p === "LOBBY") {
      dragHint.textContent = "拖曳空地 360° 環視山城｜點擊角色、桌心蓮花或遠方龜山島互動";
    } else if (p === "DAY_VOTE") {
      dragHint.textContent = "點選席間座位，或直接從頭像拖線至可疑對象立即投出公投票";
    } else if (p === "NIGHT_GUARD") {
      dragHint.textContent = "護心守衛：點選或拖曳連線（含自己）展開結界，不可連守昨晚對象";
    } else if (p === "NIGHT_SEER" || p === "NIGHT_WOLF" || p === "HUNTER_TRIGGER") {
      dragHint.textContent = "點選席間座位或直接拖曳連線，放開立即執行行動";
    } else if (p === "DAY_PLAYER_TURN") {
      dragHint.textContent = "點擊或拖線至席間座位可即時切換發言點名對象";
    } else if (p === "DAY_SPEECH") {
      dragHint.textContent = "雙擊角色推進特寫｜拖曳頭像連線開啟靜默偵探輪盤";
    } else if (p === "LAST_WORDS_PLAYER" || p === "LAST_WORDS_SPEECH") {
      dragHint.textContent = "遺言階段：首夜與公投離席可留下線索，全場 AI 將納入記憶";
    } else if (typeof isSpectatorGuessActive === "function" && isSpectatorGuessActive()) {
      dragHint.textContent = "席外觀戰推理中：可在下方猜狼／猜神職，點擊圓桌座位仍可檢視發言紀錄";
    } else {
      dragHint.textContent = "點擊席間夥伴可檢視情資卡與即時態度";
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
        ? "你已被請離茶席！留下觀戰即可開啟「🎯 席外獵神挑戰」揪出全場真神職，或直接結束看底牌。"
        : ("你已被請離茶席！留下觀戰即可開啟「🔍 席外猜狼挑戰」找出 " + (typeof getInitialWolfCount === "function" ? getInitialWolfCount() : 2) + " 名酸民狼，或直接結束看底牌。");
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
    lwDiv.className = "rounded-xl p-2 bg-amber-500/15 border border-amber-400/40 text-xs font-bold text-amber-100 leading-snug mb-1.5";
    lwDiv.textContent = "離席遺言：" + vr.lastWord;
    barsBox.appendChild(lwDiv);
  }
  if (entries.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "text-xs text-slate-400 text-center py-2";
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
      '<div class="flex items-center justify-between text-xs font-black">' +
      '<span class="' + (isOut ? "text-rose-200" : "text-slate-200") + '">' + fmtSeatNum(e.id) + "號 " + escapeHtml(sObj ? sObj.name : "") + (isOut ? "（出局）" : "") + "</span>" +
      '<span class="text-amber-300 math-font">' + e.count + " 票 (" + sharePct + "%)</span>" +
      "</div>" +
      '<div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden my-1">' +
      '<div class="h-full vote-bar-fill ' + (isOut ? "bg-rose-400" : "bg-amber-400") + '" style="width:' + pct + '%; animation-delay:' + (idx * 70) + 'ms;"></div>' +
      "</div>" +
      '<div class="text-[10px] text-slate-400">投票者：' + escapeHtml(voters || "無") + "</div>";
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
    rallyBtn.textContent = usedToday ? "👑 本輪已歸票" : "👑 警長歸票";
  }
  const pkActive = isPkVoteActive();
  const pkListLabel = pkActive
    ? state.match.pkCandidates.map(function (id) { return fmtSeatNum(id) + "號"; }).join("、")
    : "";
  if (el("votePromptLabel")) {
    el("votePromptLabel").textContent = pkActive
      ? ("⚔️ 平票 PK 決選：請從【" + pkListLabel + "】擇一投票")
      : "點擊外圍座位投票抓狼";
  }
  const sel = getSeat(state.selectedSeatId);
  const validVote = Boolean(sel && isValidVoteTarget(sel.id));
  el("selectedVoteBadge").textContent = validVote
    ? ("已鎖定：" + fmtSeatNum(sel.id) + "號 " + sel.name)
    : (pkActive ? ("僅可投給 " + pkListLabel + "（或棄票）") : "點上方頭像或圓桌角色（再點一次秒投）");
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
    castBtn.textContent = pkActive ? "請點選 PK 候選人" : "請先選對象";
  }
}

function renderNightAndHunterPanel(p) {
  el("panelTargetAction").classList.remove("hidden");
  const revealCard = el("seerRevealCard");
  const actionBtnsRow = el("targetActionBtnsRow");
  const witchSub = el("witchSubPanel");
  const confirmBtn = el("btnConfirmTarget");
  const sel = getSeat(state.selectedSeatId);

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
    const blockedSelfHeal = Boolean(state.match.witchPotions.heal && victim && victim.id === getPlayerId() && state.match.day >= 2);
    const canHealNow = Boolean(state.match.witchPotions.heal && victim && !blockedSelfHeal);

    healBtn.disabled = !canHealNow;
    healBtn.textContent = canHealNow
      ? ("🍵 暖心茶護回 " + victim.id + "號")
      : (blockedSelfHeal ? "第2夜不可自護" : "暖心茶(已用)");

    purifyBtn.disabled = !state.match.witchPotions.purify;
    purifyBtn.textContent = state.match.witchPotions.purify
      ? ("🍃 清心茶請離" + (sel && sel.alive && sel.id !== getPlayerId() ? (" " + sel.id + "號") : "可疑者"))
      : "清心茶(已用)";

    el("targetPromptBox").textContent = canHealNow
      ? ("今晚 " + victim.id + "號 " + victim.name + " 被迷霧鎖定！要端暖心回甘茶護回他嗎？（同夜限一盞）")
      : (blockedSelfHeal
        ? "今晚你被迷霧鎖定（第2夜起不可自護），可端清心醒神茶請可疑者離席或略過"
        : "暖心茶已用完（不再得知夜間目標），可點上方座位端清心茶請可疑者冷靜或按略過");
    return;
  }

  witchSub.classList.add("hidden");
  confirmBtn.classList.remove("hidden");
  const tacticRow = el("wolfTacticRow");
  if (tacticRow) {
    const showWolfTactic = (p === "NIGHT_WOLF");
    tacticRow.classList.toggle("hidden", !showWolfTactic);
    if (showWolfTactic && typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
      const curTac = state.match.wolfTactic || "fake_seer";
      document.querySelectorAll("[data-wolf-tactic]").forEach(function (tb) {
        tb.classList.toggle("is-active", tb.getAttribute("data-wolf-tactic") === curTac);
      });
    }
  }
  const validT = Boolean(sel && sel.alive && (p === "NIGHT_GUARD"
    ? state.match.lastGuardTargetId !== sel.id
    : (sel.id !== getPlayerId() && !(p === "NIGHT_WOLF" && sel.role === "wolf"))));
  const verb = p === "NIGHT_GUARD" ? "守護 " : (p === "NIGHT_SEER" ? "查證 " : (p === "NIGHT_WOLF" ? "鎖定 " : "共鳴請離 "));
  confirmBtn.disabled = !validT;
  if (validT) {
    confirmBtn.innerHTML = escapeHtml("確認" + verb + sel.id + "號") + ' <kbd class="ui-kbd ml-1">Enter</kbd>';
  } else {
    confirmBtn.textContent = (p === "NIGHT_GUARD" && sel && state.match.lastGuardTargetId === sel.id) ? "不可連續守護" : "請點上方座位";
  }
  const lastG = state.match.lastGuardTargetId;
  el("targetPromptBox").textContent = validT
    ? ("已鎖定 " + fmtSeatNum(sel.id) + "號 " + (sel.id === getPlayerId() ? "你自己" : sel.name) + "（再點頭像或按 Enter 確認）")
    : (p === "NIGHT_GUARD"
      ? (lastG ? ("護心守衛：點上方頭像（含自己）守護；上晚守過 " + fmtSeatNum(lastG) + "號，今晚不可連守或按略過") : "護心守衛：點上方頭像（含自己）展開今夜守護結界")
      : (p === "NIGHT_SEER" ? "明心觀察員：點上方頭像查證身分（再點一次秒查）" : "請直接點上方頭像選擇目標座位"));
}

function renderStepperPanel(p) {
  el("panelStepper").classList.remove("hidden");
  const activeSpeaker = getSeat(state.activeSpeakerId);
  const pSeatLive = getPlayerSeat();
  const lastSp = (state.match.speechQueue || []).length === 0;
  const isLwSpeech = (p === "LAST_WORDS_SPEECH");
  const isHunterResolve = (p === "HUNTER_RESOLVE");
  const nextLabel = isHunterResolve ? "繼續 →" : (state.typewriter.active ? "顯示全文" : (isLwSpeech ? "繼續 →" : (lastSp ? "進入公投 →" : "下一位 →")));
  el("btnStepNext").innerHTML = escapeHtml(nextLabel) + ' <kbd class="ui-kbd ml-1">Space</kbd>';

  const specEndBtn = el("btnSpectatorEndNow");
  if (specEndBtn) {
    specEndBtn.classList.toggle("hidden", !(state.match.started && pSeatLive && !pSeatLive.alive && p !== "GAME_OVER"));
  }

  const showMarkTools = (p === "DAY_SPEECH" && activeSpeaker && activeSpeaker.id !== getPlayerId());
  const markRow = el("detectiveMarkRow");
  if (markRow) markRow.classList.toggle("hidden", !showMarkTools);
  if (showMarkTools) {
    const curMark = state.playerMarks[activeSpeaker.id] || null;
    el("btnMarkGood").textContent = curMark === "good" ? "✓ 已認同" : "👍 認同";
    el("btnMarkWolf").textContent = curMark === "wolf" ? "⚠ 已存疑" : "🤨 存疑";
    if (el("btnPinCurrentSpeaker")) el("btnPinCurrentSpeaker").textContent = "📌 記筆記";
    el("btnMarkGood").className = "py-1 px-2 text-[11px] shrink-0 " + (
      curMark === "good" ? "cta-celadon font-bold" : "cta-ink"
    );
    el("btnMarkWolf").className = "py-1 px-2 text-[11px] shrink-0 " + (
      curMark === "wolf" ? "cta-cinnabar" : "cta-ink"
    );
    const mTxt = el("tableMomentumText");
    if (mTxt) {
      const pSus = Math.round(activeSpeaker.suspicionMap[getPlayerId()] || 50);
      if (pSus >= 62) {
        mTxt.textContent = "⚠ 他正存疑你";
        mTxt.className = "text-[10.5px] text-rose-300 font-semibold truncate hidden sm:inline pl-1";
      } else if (pSus <= 38) {
        mTxt.textContent = "✦ 他傾向信任你";
        mTxt.className = "text-[10.5px] text-emerald-300 font-semibold truncate hidden sm:inline pl-1";
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
        microBtn.textContent = doneAlready ? "🔍 已觀微" : ("🔍 觀微(" + mRem + ")");
      }
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
    }
    if (showWatch) {
      const cSp = getSeat(state.activeClash.speakerId);
      const wTxt = el("turnWatchText");
      if (wTxt && cSp) {
        if (state.activeClash.kind === "fake_seer") {
          wTxt.textContent = "🔮 " + fmtSeatNum(cSp.id) + "號 " + cSp.name + " 冒充明心觀察員！已備好反駁牌，輪到你的順位再拆穿。";
        } else if (state.activeClash.kind === "contradiction" && state.activeClash.contradiction) {
          wTxt.textContent = "⚡ 抓到矛盾（" + state.activeClash.contradiction.label + "）：" + state.activeClash.contradiction.detail + "｜按「記進筆記」解鎖呈堂證供卡！";
        } else if (state.activeClash.kind === "toxic_slip") {
          wTxt.textContent = "⚠ " + fmtSeatNum(cSp.id) + "號 " + cSp.name + " 語氣帶刺！可靜默記進筆記，輪到你再點出破綻。";
        } else {
          wTxt.textContent = state.activeClash.inWolfPit
            ? ("📌 前置位 " + fmtSeatNum(cSp.id) + "號 " + cSp.name + " 把你點進狼坑！輪到你的順位即可正面回應並反盤狼坑。")
            : ("📌 " + fmtSeatNum(cSp.id) + "號 " + cSp.name + " 點名懷疑你！嚴守輪流發言，輪到你時即可回擊。");
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
      ? ("⚖️ 直心糾察長 " + fmtSeatNum(hunterShot.hunterId) + "號 " + hunterShot.hunterName + " 帶走 " + fmtSeatNum(hunterShot.targetId) + "號 " + hunterShot.targetName + " 一同離席！")
      : "⚖️ 直心糾察長壓下正氣共鳴，未帶走任何人。")
    : (activeSpeaker
      ? (activeSpeaker.id + "號 " + activeSpeaker.name + "發言中…")
      : "天黑行動中…");
}

function renderSheriffTransferPanel() {
  const panel = el("panelSheriffTransfer");
  if (!panel) return;
  panel.classList.remove("hidden");
  const box = el("sheriffTransferButtons");
  if (!box) return;
  box.innerHTML = "";
  const pid = getPlayerId();
  getAliveSeats().filter(function (s) { return s.id !== pid; }).forEach(function (s) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cta-brass py-1.5 px-2.5 text-xs";
    btn.textContent = "👑 交給 " + fmtSeatNum(s.id) + "號 " + s.name;
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
  const cBox = el("sheriffElectionCandidates");
  if (cBox) {
    cBox.innerHTML = "";
    if (Array.isArray(ctx.dramaEvents) && ctx.dramaEvents.length) {
      const dramaBanner = document.createElement("div");
      dramaBanner.className = "rounded px-2.5 py-1.5 text-[11px] font-bold bg-rose-950/65 border border-rose-400/45 text-amber-200 mb-1";
      dramaBanner.textContent = ctx.dramaEvents[0];
      cBox.appendChild(dramaBanner);
    }
    ctx.speeches.forEach(function (sp) {
      const row = document.createElement("div");
      const isClash = sp.tone === "clash";
      const isSeer = sp.tone === "seer";
      const isActiveReel = ctx.activeReelSeatId === sp.id;
      row.className = "rounded px-2 py-1.5 text-[11px] transition " + (isActiveReel
        ? "bg-amber-500/25 border border-amber-300 text-amber-50"
        : (isClash
          ? "bg-rose-950/55 border border-rose-400/45 text-rose-50"
          : (isSeer
            ? "bg-indigo-950/55 border border-violet-400/40 text-slate-100"
            : "bg-slate-900/55 border border-amber-400/25 text-slate-200")));
      const badgeHtml = sp.tag
        ? ('<span class="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold ' + (isClash ? "bg-rose-500/30 text-rose-200" : (isSeer ? "bg-violet-500/30 text-violet-200" : "bg-amber-500/25 text-amber-200")) + '">' + escapeHtml(sp.tag) + "</span>")
        : "";
      row.innerHTML = badgeHtml + '<span class="font-bold text-amber-300">' + (sp.id === pid ? ("👑 " + playerNumTag() + " 你") : (fmtSeatNum(sp.id) + "號 " + escapeHtml(sp.name))) + "：</span>" + escapeHtml(sp.text);
      cBox.appendChild(row);
    });
    if (ctx.speeches.length >= 2) {
      const reelBtn = document.createElement("button");
      reelBtn.type = "button";
      reelBtn.className = "cta-ink py-1 px-2.5 text-[11px] mt-1";
      reelBtn.textContent = ctx.activeReelSeatId ? "🎙 正在輪播候選人語音喊話…" : "🎙 播放警上候選人輪流語音喊話";
      reelBtn.disabled = Boolean(ctx.activeReelSeatId);
      reelBtn.addEventListener("click", function () {
        if (typeof playSheriffStageReel === "function") playSheriffStageReel(0);
      });
      cBox.appendChild(reelBtn);
    }
  }
  const vBox = el("sheriffElectionVoteRow");
  if (vBox) {
    vBox.innerHTML = "";
    const canVoteUnder = pAlive && !ctx.playerRunning;
    vBox.classList.toggle("hidden", !canVoteUnder);
    if (canVoteUnder) {
      ctx.candidateIds.forEach(function (cid) {
        if (cid === pid) return;
        const cs = getSeat(cid);
        if (!cs || !cs.alive) return;
        const vb = document.createElement("button");
        vb.type = "button";
        vb.className = "cta-celadon py-1 px-2.5 text-[11px]";
        vb.textContent = "👑 投給 " + fmtSeatNum(cid) + "號 " + cs.name;
        vb.addEventListener("click", function () {
          if (typeof resolveSheriffElectionAction === "function") resolveSheriffElectionAction(cid);
        });
        vBox.appendChild(vb);
      });
    }
  }
  if (el("btnSheriffRun")) {
    el("btnSheriffRun").classList.toggle("hidden", !pAlive || Boolean(ctx.playerRunning || ctx.playerWithdrew));
  }
  if (el("btnSheriffWithdraw")) {
    el("btnSheriffWithdraw").classList.toggle("hidden", !pAlive || !ctx.playerRunning);
  }
  if (el("btnSheriffPass")) {
    el("btnSheriffPass").textContent = ctx.playerRunning ? "📣 維持上警・開始決選" : "🪑 警下開票／自動決選";
  }
}

function renderControlPanels() {
  const p = state.match.phase;
  ["panelLobby", "panelStepper", "panelTargetAction", "panelPlayerSpeech", "panelVote", "panelVoteResult", "panelLastWords", "panelSheriffTransfer", "panelSheriffElection", "panelSheriffOrder", "panelGameOver"].forEach(function (id) {
    if (el(id)) el(id).classList.add("hidden");
  });

  syncFocalCardChrome(p);
  if (typeof renderSpectatorGuessPanel === "function") renderSpectatorGuessPanel();

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
      misEl.textContent = (misEval.completed ? "🏅 秘密角色任務達成「" : "📜 秘密角色任務「") + misEval.title + "」：" + misEval.progressText + (misEval.completed ? " (+15分)" : "");
      misEl.className = misEval.completed
        ? "text-[11px] font-bold text-emerald-300 text-left mt-1.5"
        : "text-[11px] font-medium text-slate-300 text-left mt-1.5";
    } else {
      misEl.classList.add("hidden");
    }
  }
  if (typeof renderGameOverGuessSummary === "function") renderGameOverGuessSummary();

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
    d.innerHTML = '<div class="text-[10px] text-slate-400">' + escapeHtml(item.label) + '</div><div class="text-xs font-black text-amber-200">' + escapeHtml(item.val) + "</div>";
    box.appendChild(d);
  });

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
      card.className = "rounded-lg px-2 py-1 bg-slate-950/75 border border-amber-400/25 text-[10.5px] text-slate-200 leading-snug";
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
      (seatId !== pid && p === "HUNTER_TRIGGER" && player && player.role === "hunter" && !player.alive)) {
      confirmTargetAction();
      return;
    }
  }

  const isSpecMode = (typeof isSpectatorGuessActive === "function" && isSpectatorGuessActive());
  if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "DAY_VOTE_RESULT" || isSpecMode) && target && seatId !== pid) {
    if (state.intelSeatId === seatId && target.alive && p === "DAY_SPEECH" && !isSpecMode) {
      const cur = state.playerMarks[seatId] || null;
      const next = cur === null ? "wolf" : (cur === "wolf" ? "good" : null);
      state.playerMarks[seatId] = next;
      spawnFx(seatId, next === "wolf" ? "標記：懷疑" : (next === "good" ? "標記：好人" : "清除標記"), next === "wolf" ? "#fb7185" : "#34d399");
    } else {
      state.intelSeatId = seatId;
    }
  } else if (seatId === pid) {
    closeSeatIntel();
  }

  if (p === "DAY_PLAYER_TURN") preparePlayerSpeechPanel();
  updateAllUI();
}
