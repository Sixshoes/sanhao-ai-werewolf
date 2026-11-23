/**
 * 本局對話時間軸抽屜與票型小抄推理彈窗
 */
"use strict";

function renderTimeline() {
  const container = el("chatTimeline");
  container.innerHTML = "";

  if (state.match.logs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-300 space-y-2";
    empty.innerHTML =
      '<div class="font-black text-amber-300 text-sm">3 秒鐘規則速看</div>' +
      '<div class="grid grid-cols-1 gap-1.5">' +
      '<div class="p-2 rounded-lg bg-slate-950/70"> <strong>晚上</strong>：迷霧鎖定、明心觀察員查證、滴水奉茶師護場</div>' +
      '<div class="p-2 rounded-lg bg-slate-950/70"> <strong>白天</strong>：嚴守凹嗚輪流發言，靜默標記與記筆記！</div>' +
      '<div class="p-2 rounded-lg bg-slate-950/70"> <strong>投票</strong>：公投／平票 PK，把全場酸民狼送出場！</div>' +
      '</div>';
    container.appendChild(empty);
    return;
  }

  state.match.logs.slice(-24).forEach(function (item) {
    const card = document.createElement("div");
    let cls = "border-slate-800/90 bg-slate-900/75 text-slate-200";
    if (item.kind === "banner") cls = "border-amber-400/40 bg-amber-500/15 text-amber-100 font-bold";
    else if (item.kind === "night") cls = "border-indigo-500/30 bg-indigo-950/40 text-indigo-200";
    else if (item.kind === "dawn") cls = "border-amber-500/30 bg-slate-900 text-amber-200 font-semibold";
    else if (item.kind === "secret") cls = "border-purple-400/40 bg-purple-950/50 text-purple-100 font-bold";
    else if (item.kind === "blessing") cls = "border-emerald-400/40 bg-emerald-950/50 text-emerald-100 font-bold";
    else if (item.kind === "speech" && item.speakerId === getPlayerId()) cls = "border-amber-400/40 bg-amber-950/30 text-white";

    card.className = "rounded-xl border px-3 py-1.5 text-xs msg-enter " + cls;

    if (item.kind === "speech") {
      const canQuote = Boolean(item.speakerId && item.speakerId !== getPlayerId() && state.match.started);
      card.innerHTML =
        '<div class="flex items-center justify-between gap-1">' +
        '<span class="font-black text-amber-200">' + escapeHtml(item.title) + '</span>' +
        '<div class="flex items-center gap-1">' +
        (item.subBadge ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/80 text-slate-300">' + escapeHtml(item.subBadge) + '</span>' : '') +
        (canQuote ? '<button type="button" data-quote-seat="' + item.speakerId + '" class="cta-ink text-[9.5px] px-1.5 py-0.5">📌 引用反駁</button>' : '') +
        '</div>' +
        '</div>' +
        '<div class="text-slate-100 mt-0.5">' + escapeHtml(item.text) + '</div>';
      if (canQuote) {
        const qBtn = card.querySelector("[data-quote-seat]");
        if (qBtn) {
          qBtn.addEventListener("click", function () {
            quoteSpeechForRebuttal(item.speakerId, item.text);
          });
        }
      }
    } else {
      card.textContent = item.title + (item.text ? (" — " + item.text) : "");
    }
    container.appendChild(card);
  });

  container.scrollTop = container.scrollHeight;
}

function quoteSpeechForRebuttal(seatId, rawSnippet) {
  const s = getSeat(seatId);
  if (!s || seatId === getPlayerId()) return;
  const num = typeof fmtSeatNum === "function" ? fmtSeatNum(s.id) : (s.id < 10 ? ("0" + s.id) : String(s.id));
  const cleanClip = String(rawSnippet || "").replace(/^「|」$/g, "").trim().slice(0, 26);
  const rebLine = "針對剛剛 " + num + "號" + s.name + " 提到「" + cleanClip + "…」，我比對了全場邏輯發現有矛盾點，建議大家這輪重點檢視 " + num + "號！";
  if (typeof pinClue === "function") {
    pinClue(s.id, "📌引用反駁 " + num + "號", rebLine, "contradiction");
  }
  const qIn = el("quickFreeInput");
  if (qIn && state.match.phase === "DAY_PLAYER_TURN") {
    qIn.value = rebLine;
    if (typeof refreshQuickFreeInputHint === "function") refreshQuickFreeInputHint();
    if (el("modalJournal")) el("modalJournal").classList.add("hidden");
    qIn.focus();
    showToast("📌 已帶入引用反駁台詞到你的陳詞欄！", "emerald");
  } else {
    showToast("📌 已收藏「引用 " + num + "號原話」進筆記，輪到你發言時可一鍵帶出！", "emerald");
  }
}

function renderTableMatrixIntoBody() {
  const body = el("matrixSheetBody");
  if (!body) return;
  body.innerHTML = "";
  if (!state.match || !state.match.started || !Array.isArray(state.match.seats)) {
    body.innerHTML = '<div class="col-span-full rounded-xl p-5 text-center bg-slate-950/70 border border-slate-800 text-slate-400">開局後這裡會以矩陣方式整理每位茶客的宣稱身分、今日打／保對象與昨日票型。</div>';
    return;
  }
  const pid = getPlayerId();
  const day = state.match.day || 1;
  const dayEvs = state.match.daySpeechEvents || [];
  const allEvs = state.match.allSpeechEvents || [];
  const prevVote = (state.match.voteHistory || []).length ? state.match.voteHistory[state.match.voteHistory.length - 1] : null;
  const ledgerNow = (typeof buildCrossDayMemoryLedger === "function") ? buildCrossDayMemoryLedger(getPlayerSeat()) : null;
  const flipSet = ledgerNow && Array.isArray(ledgerNow.flipIds) ? ledgerNow.flipIds : [];
  const wolfProtSet = ledgerNow && Array.isArray(ledgerNow.wolfProtectorIds) ? ledgerNow.wolfProtectorIds : [];
  const fmtTag = function (id) {
    if (!id) return "—";
    const st = getSeat(id);
    const num = typeof fmtSeatNum === "function" ? fmtSeatNum(id) : (id < 10 ? ("0" + id) : String(id));
    return num + (st ? (st.id === pid ? "你" : st.name) : "號");
  };

  const pSelfMat = getPlayerSeat();
  const isWolfMat = Boolean(pSelfMat && pSelfMat.role === "wolf" && !state.hidePlayerRole);
  state.match.seats.forEach(function (s) {
    const todayEv = dayEvs.slice().reverse().find(function (e) { return e.speakerId === s.id; });
    const latestEv = todayEv || allEvs.slice().reverse().find(function (e) { return e.speakerId === s.id; });
    const lastBallot = prevVote && prevVote.ballots ? prevVote.ballots.find(function (b) { return b.voterId === s.id; }) : null;
    const mark = state.playerMarks ? state.playerMarks[s.id] : null;
    const isSh = Boolean(!state.match.sheriffElectionPending && state.match.sheriffSeatId === s.id);
    const roleClaim = (s.claimedRole && ROLE_DEFS[s.claimedRole]) ? ROLE_DEFS[s.claimedRole].name : "未亮牌";
    const num = typeof fmtSeatNum === "function" ? fmtSeatNum(s.id) : (s.id < 10 ? ("0" + s.id) : String(s.id));

    const card = document.createElement("div");
    card.className = "matrix-seat-card" + (!s.alive ? " is-dead" : "");
    const isWolfMateCard = Boolean(isWolfMat && s.role === "wolf" && s.id !== pid);
    const godNoteKey = (isWolfMat && !isWolfMateCard && state.match.wolfGodMarks) ? (state.match.wolfGodMarks[s.id] || "") : "";
    const godNoteLbl = (godNoteKey && typeof getWolfGodMarkDef === "function") ? getWolfGodMarkDef(godNoteKey).label : "";
    const markBadge = isWolfMateCard
      ? '<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-600/35 text-rose-100">🐺 同伴</span>'
      : (godNoteLbl
        ? ('<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/30 text-amber-100">🔍 ' + escapeHtml(godNoteLbl) + '</span>')
        : (mark === "wolf"
          ? ('<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/25 text-rose-200">' + (isWolfMat ? "你標:甩鍋" : "你標:懷疑") + '</span>')
          : (mark === "good"
            ? ('<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/25 text-emerald-200">' + (isWolfMat ? "你標:假保" : "你標:認同") + '</span>')
            : "")));
    const alertBadge = (s.isElder && s.voteDisabled)
      ? '<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-teal-500/25 text-teal-200">🛡️ 免票</span>'
      : (flipSet.indexOf(s.id) !== -1
        ? '<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-600/35 text-rose-100">⚡ 跨日反水</span>'
        : (wolfProtSet.indexOf(s.id) !== -1
          ? '<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-600/30 text-amber-200">⚠ 曾保公投離席者</span>'
          : ""));
    const accStr = latestEv && latestEv.accuseId ? ('<span class="text-rose-300 font-bold">🎯 打 ' + escapeHtml(fmtTag(latestEv.accuseId)) + '</span>') : '<span class="text-slate-400">🎯 打 —</span>';
    const vchStr = latestEv && latestEv.vouchId ? ('<span class="text-emerald-300 font-bold">✅ 保 ' + escapeHtml(fmtTag(latestEv.vouchId)) + '</span>') : '<span class="text-slate-400">✅ 保 —</span>';
    const voteStr = lastBallot ? (lastBallot.targetId ? ("🗳 投 " + fmtTag(lastBallot.targetId)) : "🗳 棄票") : "🗳 尚無票型";

    card.innerHTML =
      '<div class="flex items-center justify-between gap-1.5">' +
        '<div class="flex items-center gap-1.5 min-w-0">' +
          '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black shrink-0" style="background:' + escapeHtml(s.color || "#64748b") + ';color:#0f172a;">' + num + '</span>' +
          '<span class="font-black text-amber-100 truncate">' + (isSh ? "👑 " : "") + escapeHtml(s.id === pid ? "你" : s.name) + (!s.alive ? "（離席）" : "") + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-1 shrink-0">' +
          alertBadge +
          '<span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-200">' + escapeHtml(roleClaim) + '</span>' +
          markBadge +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-between gap-2 text-[10.5px]">' +
        '<div class="flex items-center gap-2 flex-wrap">' + accStr + vchStr + '</div>' +
        '<span class="text-[10px] text-slate-400 shrink-0">' + escapeHtml(voteStr) + '</span>' +
      '</div>' +
      (latestEv && latestEv.rawText
        ? ('<div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70">' +
            '<span class="text-[10px] text-slate-300 truncate">「' + escapeHtml(latestEv.rawText.slice(0, 32)) + '…」</span>' +
            (s.id !== pid ? '<button type="button" data-mat-quote="' + s.id + '" class="cta-ink text-[9.5px] px-1.5 py-0.5 shrink-0">📌 引用</button>' : '') +
          '</div>')
        : '<div class="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">第 ' + day + ' 天尚未發言</div>');

    const mBtn = card.querySelector("[data-mat-quote]");
    if (mBtn && latestEv) {
      mBtn.addEventListener("click", function () {
        quoteSpeechForRebuttal(s.id, latestEv.rawText);
      });
    }
    body.appendChild(card);
  });
}

function openVoteSheetModal() {
  renderVoteSheetIntoBody();
  if (typeof indieFlow !== "undefined") {
    indieFlow.openJournal("vote");
  } else if (el("modalVoteSheet")) {
    el("modalVoteSheet").classList.remove("hidden");
  }
}

function renderVoteSheetIntoBody() {
  const body = el("voteSheetBody");
  const subEl = el("voteSheetSubtitle");
  if (!body) return;
  body.innerHTML = "";

  if (!state.match.started) {
    if (subEl) subEl.textContent = "開局後將自動記錄每輪歸票與身分情報";
    body.innerHTML = '<div class="rounded-xl p-6 text-center bg-slate-950/70 border border-slate-800 text-slate-400">開局後這裡會自動整理每輪誰投誰、誰棄票，以及你的場上推理筆記。</div>';
    return;
  }

  const isOver = state.match.phase === "GAME_OVER";
  const isSpecGodView = typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive();
  const canSeeTruth = isOver || isSpecGodView;
  const aliveCount = getAliveSeats().length;
  const outCount = state.match.seats.length - aliveCount;
  if (subEl) {
    subEl.textContent = "第 " + state.match.day + " 天・在場 " + aliveCount + " 人・已離席 " + outCount + " 人" + (canSeeTruth ? "・全員底牌已揭曉" : "");
  }

  let html = "";

  // SECTION 0 (GAME OVER OR GOD-VIEW SPECTATE): MVP INSIGHT + FULL GOD-VIEW NIGHT & DAY STORY TIMELINE!
  if (canSeeTruth) {
    const m = state.match;
    const st = m.stats || {};
    const mvpParts = [];
    if (m.winner === "wolf" && String(m.winReason || "").indexOf("狼刀在先") !== -1) {
      mvpParts.push("🐺 關鍵勝負手：酸民狼精準掌握「狼刀在先」完成屠邊終局");
    } else if (m.winner === "good" && (m.nightArchive || []).some(function (n) { return n.hunterShot; })) {
      mvpParts.push("⚖️ 關鍵轉折：直心糾察長正氣共鳴精準帶走酸民狼，鎖定好人勝局");
    } else if ((m.nightArchive || []).some(function (n) { return n.guardTarget && n.wolfTarget && n.guardTarget === n.wolfTarget && !n.doubleSaveClash; })) {
      mvpParts.push("🛡️ 關鍵守護：護心守衛結界成功擋下夜間迷霧，替好人爭取重要輪次");
    } else if ((st.logicBreaksLanded || 0) >= 1) {
      mvpParts.push("⚡ 推理 MVP：玩家親手擊出 " + st.logicBreaksLanded + " 次呈堂證供邏輯破防，引領全場看清偽裝");
    } else {
      mvpParts.push(m.winner === "good"
        ? "🌟 團隊勝利：三好推理穩定投票、成功請離所有酸民狼"
        : (m.winner === "wolf" ? "🌑 酸民狼奇襲得手，成功製造視角混亂" : "👁 即時上帝視角觀戰中"));
    }
    html += '<div class="rounded-2xl p-3 bg-amber-500/10 border border-amber-400/40 text-xs space-y-1">' +
      '<div class="font-black text-amber-300">🏆 本局關鍵轉折與勝負複盤</div>' +
      '<div class="text-slate-100 leading-relaxed">' + escapeHtml(mvpParts.join("；")) + '（友善度 ' + m.harmonyScore + ' · 好話 ' + (st.goodWordsCount || 0) + ' · 矛盾抓包 ' + (st.contradictionsFound || 0) + '）</div>' +
    '</div>';
  }

  if (canSeeTruth && state.match.nightArchive && state.match.nightArchive.length > 0) {
    const seatPlain = function (id) {
      if (!id) return "無";
      const st = getSeat(id);
      return fmtSeatNum(id) + "號" + (id === getPlayerId() ? "你" : (st ? st.name : ""));
    };
    const seatTag = function (id) {
      if (!id) return "無";
      const st = getSeat(id);
      const effDef = (st && typeof getSeatRoleDef === "function") ? getSeatRoleDef(st) : (st && ROLE_DEFS[st.role]);
      const rName = effDef ? ("(" + effDef.name + ")") : "";
      return seatPlain(id) + rName;
    };
    html += '<div class="space-y-2.5">';
    html += '<div class="flex items-center justify-between">' +
      '<h4 class="text-xs font-black tracking-wide text-emerald-300">📜 上帝視角逐日故事軸（夜間秘密行動 → 白天結果）</h4>' +
      '<span class="text-[11px] text-slate-400">共 ' + state.match.nightArchive.length + ' 輪</span>' +
      '</div>';
    state.match.nightArchive.forEach(function (nr) {
      const guardLine = nr.guardTarget
        ? ('<div class="text-cyan-200">🛡️ 護心守衛' + (nr.guardId ? ("(" + escapeHtml(seatPlain(nr.guardId)) + ")") : "") + '守護：' + escapeHtml(seatTag(nr.guardTarget)) + (nr.doubleSaveClash ? ' <span class="text-amber-300 font-black">［⚠ 同守同救破盾］</span>' : (nr.wolfTarget === nr.guardTarget ? ' <span class="text-emerald-300 font-black">［✓ 成功擋霧］</span>' : '')) + '</div>')
        : "";
      const wolfLine = nr.wolfTarget ? ("🐺 酸民狼散播迷霧：" + escapeHtml(seatTag(nr.wolfTarget))) : "🐺 酸民狼：未鎖定目標";
      const seerLine = nr.seerTarget
        ? ("🔮 明心觀察員" + (nr.seerId ? ("(" + escapeHtml(seatPlain(nr.seerId)) + ")") : "") + "查證：" + escapeHtml(seatTag(nr.seerTarget)) + " → " + (nr.seerIsWolf ? '<span class="text-rose-300 font-black">酸民狼</span>' : '<span class="text-emerald-300 font-black">好夥伴</span>'))
        : "🔮 明心觀察員：未查證／已離席";
      const witchActs = [];
      if (nr.witchSaved && nr.wolfTarget) witchActs.push("暖心回甘茶護回 " + escapeHtml(seatTag(nr.wolfTarget)));
      if (nr.witchPoisonTarget) witchActs.push("清心醒神茶請離 " + escapeHtml(seatTag(nr.witchPoisonTarget)));
      const witchLine = "🍵 滴水奉茶師" + (nr.witchId ? ("(" + escapeHtml(seatPlain(nr.witchId)) + ")") : "") + "：" + (witchActs.length ? witchActs.join("、") : "未奉茶");
      const dawnLine = (nr.casualties && nr.casualties.length > 0)
        ? ("☀️ 天亮離席：" + nr.casualties.map(function (c) { return escapeHtml(seatTag(c.id)) + (c.cause === "purify" ? "［清心茶請離］" : (c.cause === "double_clash" ? "［同守破盾］" : "［夜間迷霧］")); }).join("、"))
        : "☀️ 天亮結果：平安夜（全員在場）";
      const hunterShooter = (nr.hunterShot && nr.hunterShot.hunterId) ? getSeat(nr.hunterShot.hunterId) : null;
      const isWkShot = Boolean(hunterShooter && hunterShooter.isWolfKing);
      const hunterLine = nr.hunterShot
        ? ('<div class="text-amber-300 font-bold">' + (isWkShot ? "🐺 流言首領反撲：" : "⚡ 直心糾察長共鳴：") + escapeHtml(seatTag(nr.hunterShot.hunterId)) + ' 請離 ' + escapeHtml(seatTag(nr.hunterShot.targetId)) + '</div>')
        : "";
      const dayVoteRec = (state.match.voteHistory || []).filter(function (vh) { return vh.day === nr.day; });
      let dayVoteLine = "";
      if (dayVoteRec.length > 0) {
        const lastRound = dayVoteRec[dayVoteRec.length - 1];
        const maxV = Math.max.apply(null, Object.values(lastRound.tallies || { _: 0 }));
        const topK = Object.keys(lastRound.tallies || {}).filter(function (k) { return lastRound.tallies[k] === maxV && maxV > 0; });
        if (lastRound.outId) {
          dayVoteLine = '<div class="text-amber-200">🗳 第 ' + nr.day + ' 天公投請離：' + escapeHtml(seatTag(lastRound.outId)) + '（' + maxV + ' 票）</div>';
        } else if (topK.length === 1) {
          dayVoteLine = '<div class="text-teal-300">🛡️ 第 ' + nr.day + ' 天公投豁免：' + escapeHtml(seatTag(parseInt(topK[0], 10))) + ' 亮清心長老免離席（' + maxV + ' 票）</div>';
        } else {
          dayVoteLine = '<div class="text-slate-300">🗳 第 ' + nr.day + ' 天公投：平票／棄票無人離席</div>';
        }
      }
      html += '<div class="rounded-2xl p-3 bg-slate-950/85 border border-emerald-500/30 space-y-1 text-[11.5px]">' +
        '<div class="text-xs font-black text-amber-300 pb-1 border-b border-slate-800/80">第 ' + nr.day + ' 輪・日夜時間軸</div>' +
        guardLine +
        '<div class="text-rose-200">' + wolfLine + '</div>' +
        '<div class="text-sky-200">' + seerLine + '</div>' +
        '<div class="text-emerald-200">' + witchLine + '</div>' +
        '<div class="text-amber-100 font-bold">' + dawnLine + '</div>' +
        hunterLine +
        dayVoteLine +
        '</div>';
    });
    html += '</div>';
  }

  // SECTION 1: SHERIFF ELECTION BALLOTS + GROUPED VOTE HISTORY CARDS (Easy 1-second scan!)
  const shVoteRec = state.match.sheriffVoteRecord || null;
  if (shVoteRec) {
    const shWinnerSeat = shVoteRec.winnerId ? getSeat(shVoteRec.winnerId) : null;
    const shWinnerLbl = shWinnerSeat
      ? (fmtSeatNum(shWinnerSeat.id) + "號 " + (shWinnerSeat.id === getPlayerId() ? "你" : shWinnerSeat.name))
      : "未產生";
    const shCandHtml = (shVoteRec.candidateIds || []).map(function (cid) {
      const cs = getSeat(cid);
      const isWin = cid === shVoteRec.winnerId;
      const isSeerStand = (shVoteRec.seerClaimIds || []).indexOf(cid) !== -1;
      return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold border ' +
        (isWin ? 'bg-amber-500/25 text-amber-200 border-amber-400/60' : 'bg-slate-800/90 text-slate-200 border-slate-700') +
        '">' + (isWin ? '👑 ' : '') + fmtSeatNum(cid) + ' ' + escapeHtml(cs ? (cid === getPlayerId() ? "你" : cs.name) : '') + (isSeerStand ? '・跳明心' : '') + '</span>';
    }).join("");
    const shWithHtml = (shVoteRec.withdrawnIds || []).length > 0
      ? ('<div class="flex items-center flex-wrap gap-1.5 text-[10.5px]"><span class="font-bold text-slate-400">警上退水：</span>' +
          shVoteRec.withdrawnIds.map(function (wid) {
            const ws = getSeat(wid);
            return '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">' + fmtSeatNum(wid) + ' ' + escapeHtml(ws ? (wid === getPlayerId() ? "你" : ws.name) : '') + '</span>';
          }).join("") + '</div>')
      : "";
    const shGrouped = {};
    const shAbstainers = [];
    (shVoteRec.ballots || []).forEach(function (b) {
      if (!b || !b.voterId) return;
      if (!b.targetId) {
        shAbstainers.push(b.voterId);
      } else {
        if (!shGrouped[b.targetId]) shGrouped[b.targetId] = [];
        shGrouped[b.targetId].push(b.voterId);
      }
    });
    const shTargetRows = Object.keys(shGrouped).map(function (tid) {
      const idNum = parseInt(tid, 10);
      const countVal = (shVoteRec.tallies && typeof shVoteRec.tallies[idNum] === "number") ? Math.round(shVoteRec.tallies[idNum] * 10) / 10 : shGrouped[tid].length;
      return { targetId: idNum, voters: shGrouped[tid], count: countVal };
    }).sort(function (a, b) { return b.count - a.count; });

    let shBallotRowsHtml = "";
    if (shTargetRows.length === 0) {
      shBallotRowsHtml = '<div class="rounded-xl px-2.5 py-2 bg-slate-900/80 border border-amber-400/20 text-[11px] text-slate-300">本局警長由單一候選或快速開票直接誕生，無警下分票紀錄。</div>';
    } else {
      const shVoterTotal = Math.max(1, (shVoteRec.ballots || []).length);
      shTargetRows.forEach(function (item) {
        const ts = getSeat(item.targetId);
        const isWin = item.targetId === shVoteRec.winnerId;
        const barPct = Math.max(14, Math.round((item.voters.length / shVoterTotal) * 100));
        const vChips = item.voters.map(function (vid) {
          const vs = getSeat(vid);
          const isMe = vid === getPlayerId();
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ' +
            (isMe ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/45' : 'bg-slate-800/90 text-slate-200 border-slate-700') +
            '">' + fmtSeatNum(vid) + ' ' + escapeHtml(vs ? (isMe ? "你" : vs.name) : '') + '</span>';
        }).join("");
        shBallotRowsHtml += '<div class="rounded-xl p-2.5 border ' + (isWin ? 'bg-amber-500/12 border-amber-400/45' : 'bg-slate-900/90 border-slate-800') + '">' +
          '<div class="flex items-center justify-between gap-2 mb-1">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ' + (isWin ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-200 border border-slate-700') + '">' + fmtSeatNum(item.targetId) + '</span>' +
              '<span class="text-xs font-black ' + (isWin ? 'text-amber-100' : 'text-slate-100') + '">' + escapeHtml(ts ? (item.targetId === getPlayerId() ? "你" : ts.name) : '') + '</span>' +
              (isWin ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200">當選警長</span>' : '') +
            '</div>' +
            '<span class="text-xs font-black text-amber-300 shrink-0">' + item.count + ' 票</span>' +
          '</div>' +
          '<div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1.5">' +
            '<div class="h-full rounded-full ' + (isWin ? 'bg-amber-400' : 'bg-sky-400/75') + '" style="width:' + barPct + '%"></div>' +
          '</div>' +
          '<div class="flex items-center flex-wrap gap-1.5"><span class="text-[10px] font-bold text-slate-400 mr-0.5">警下投給他：</span>' + vChips + '</div>' +
        '</div>';
      });
    }
    if (shAbstainers.length > 0) {
      const shAbsChips = shAbstainers.map(function (vid) {
        const vs = getSeat(vid);
        return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-slate-400 border border-slate-800">' + fmtSeatNum(vid) + ' ' + escapeHtml(vs ? (vid === getPlayerId() ? "你" : vs.name) : '') + '</span>';
      }).join("");
      shBallotRowsHtml += '<div class="rounded-xl px-2.5 py-1.5 bg-slate-950/60 border border-slate-800/80 flex items-center flex-wrap gap-1.5">' +
        '<span class="text-[10px] font-bold text-slate-400 mr-1">警下棄票：</span>' + shAbsChips +
      '</div>';
    }

    html += '<div class="rounded-2xl p-3 bg-amber-500/10 border border-amber-400/45 space-y-2">' +
      '<div class="flex items-center justify-between flex-wrap gap-1.5 pb-1.5 border-b border-amber-400/25">' +
        '<span class="text-xs font-black text-amber-200">👑 第 ' + (shVoteRec.day || 1) + ' 天・警長競選票型（排坑重點依據）</span>' +
        '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/25 text-amber-100 border border-amber-400/50">警長：' + escapeHtml(shWinnerLbl) + '</span>' +
      '</div>' +
      '<div class="flex items-center flex-wrap gap-1.5 text-[10.5px]"><span class="font-bold text-amber-200/80">警上候選：</span>' + shCandHtml + '</div>' +
      shWithHtml +
      '<div class="space-y-1.5">' + shBallotRowsHtml + '</div>' +
    '</div>';
  }

  const activeBfModal = state.match.sheriffBadgeFlow || null;
  const bfSigsModal = Array.isArray(state.match.badgeFlowSignals) ? state.match.badgeFlowSignals : [];
  if (activeBfModal || bfSigsModal.length > 0) {
    let bfBodyHtml = "";
    if (activeBfModal && activeBfModal.firstTargetId && typeof formatBadgeFlowSummary === "function") {
      const owLblM = typeof getSeatFlowLabel === "function" ? getSeatFlowLabel(activeBfModal.ownerId) : (fmtSeatNum(activeBfModal.ownerId) + "號");
      bfBodyHtml += '<div class="bf-modal-active">' +
        '<div><span class="font-black">目前生效警徽流（' + escapeHtml(owLblM) + '）：</span>' +
        escapeHtml(formatBadgeFlowSummary(activeBfModal)) + '</div>' +
        '<div class="text-[10.5px] opacity-80 mt-0.5">規則暗號：倒牌後徽飛第一順位＝金水｜跳飛第二順位或外飛＝第一順位疑查殺｜撕毀警徽＝報查殺！</div>' +
      '</div>';
    }
    bfSigsModal.forEach(function (sig) {
      const isAlert = Array.isArray(sig.suspectedWolfIds) && sig.suspectedWolfIds.length > 0;
      bfBodyHtml += '<div class="' + (isAlert ? 'bf-modal-sig-wolf' : 'bf-modal-sig-good') + '">' +
        '<div class="font-black">' + escapeHtml(sig.headline || "警徽流暗號解讀") + ' <span class="text-[10px] font-normal opacity-80">（第 ' + (sig.day || 1) + ' 天）</span></div>' +
        '<div class="text-[10.5px] opacity-90 mt-0.5">' + escapeHtml(sig.detail || "") + '</div>' +
      '</div>';
    });
    html += '<div class="bf-modal-card space-y-2">' +
      '<div class="bf-modal-head">' +
        '<span class="text-xs font-black">🧭 警徽流追蹤 ＆ 暗號解讀</span>' +
        '<span class="text-[10px] font-bold opacity-80">' + (bfSigsModal.length ? ("已解讀 " + bfSigsModal.length + " 條暗號") : "進行中") + '</span>' +
      '</div>' +
      bfBodyHtml +
    '</div>';
  }

  html += '<div class="space-y-2.5">';
  html += '<div class="flex items-center justify-between">' +
    '<h4 class="text-xs font-black tracking-wide text-amber-300">歷輪公投票型（依被投對象歸類）</h4>' +
    '<span class="text-[11px] text-slate-400">' + (state.match.voteHistory.length ? ("共 " + state.match.voteHistory.length + " 次開票") : "尚未公投開票") + '</span>' +
    '</div>';

  if (state.match.voteHistory.length === 0) {
    html += '<div class="rounded-xl px-3.5 py-3 bg-slate-950/70 border border-slate-800 text-slate-400 text-xs">目前還沒有公投紀錄，進入公投開票後會自動按被投對象分組整理。</div>';
  } else {
    const dayCounts = {};
    state.match.voteHistory.forEach(function (vh, idx) {
      dayCounts[vh.day] = (dayCounts[vh.day] || 0) + 1;
      const roundLabel = dayCounts[vh.day] > 1 ? ("第 " + vh.day + " 天・平票決選") : ("第 " + vh.day + " 天・公投");

      const grouped = {};
      const abstainers = [];
      (vh.ballots || []).forEach(function (b) {
        if (!b.targetId) {
          abstainers.push(b.voterId);
        } else {
          if (!grouped[b.targetId]) grouped[b.targetId] = [];
          grouped[b.targetId].push(b.voterId);
        }
      });

      const targetList = Object.keys(grouped).map(function (tid) {
        const idNum = parseInt(tid, 10);
        const countVal = (vh.tallies && typeof vh.tallies[idNum] === "number") ? vh.tallies[idNum] : grouped[tid].length;
        return { targetId: idNum, voters: grouped[tid], count: countVal };
      });
      targetList.sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return b.voters.length - a.voters.length;
      });

      const maxCount = targetList.length ? targetList[0].count : 0;
      const topTargets = targetList.filter(function (t) { return t.count === maxCount && maxCount > 0; });
      let summaryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">全員棄票</span>';
      if (topTargets.length === 1) {
        const ts = getSeat(topTargets[0].targetId);
        summaryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-200 border border-rose-400/45">最高票：' + fmtSeatNum(topTargets[0].targetId) + '號 ' + escapeHtml(ts ? ts.name : '') + '（' + maxCount + ' 票）</span>';
      } else if (topTargets.length > 1) {
        const tieNames = topTargets.map(function (t) { return fmtSeatNum(t.targetId) + '號'; }).join('、');
        summaryBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-200 border border-amber-400/45">平票：' + escapeHtml(tieNames) + '（各 ' + maxCount + ' 票）</span>';
      }

      const totalVoters = Math.max(1, (vh.ballots || []).length);
      let rowsHtml = "";
      targetList.forEach(function (item) {
        const tSeat = getSeat(item.targetId);
        const isTop = maxCount > 0 && item.count === maxCount;
        const barPct = Math.max(12, Math.round((item.voters.length / totalVoters) * 100));
        const voterChips = item.voters.map(function (vid) {
          const vs = getSeat(vid);
          const isMe = vid === getPlayerId();
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ' +
            (isMe
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/45'
              : 'bg-slate-800/90 text-slate-200 border-slate-700') +
            '">' + fmtSeatNum(vid) + ' ' + escapeHtml(vs ? vs.name : '') + '</span>';
        }).join("");

        rowsHtml += '<div class="rounded-xl p-2.5 border ' + (isTop ? 'bg-rose-500/10 border-rose-400/35' : 'bg-slate-900/90 border-slate-800') + '">' +
          '<div class="flex items-center justify-between gap-2 mb-1.5">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ' + (isTop ? 'bg-rose-500 text-white' : 'bg-slate-800 text-amber-200 border border-slate-700') + '">' + fmtSeatNum(item.targetId) + '</span>' +
              '<span class="text-xs font-black ' + (isTop ? 'text-rose-100' : 'text-slate-100') + '">' + escapeHtml(tSeat ? tSeat.name : '') + '</span>' +
              (isTop && topTargets.length === 1 ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-200">最高票</span>' : '') +
            '</div>' +
            '<span class="text-xs font-black text-amber-300 shrink-0">' + item.count + ' 票</span>' +
          '</div>' +
          '<div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">' +
            '<div class="h-full rounded-full ' + (isTop ? 'bg-rose-400' : 'bg-amber-400/80') + '" style="width:' + barPct + '%"></div>' +
          '</div>' +
          '<div class="flex items-center flex-wrap gap-1.5">' +
            '<span class="text-[10px] font-bold text-slate-400 mr-0.5">投給他：</span>' + voterChips +
          '</div>' +
        '</div>';
      });

      if (abstainers.length > 0) {
        const absChips = abstainers.map(function (vid) {
          const vs = getSeat(vid);
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-slate-400 border border-slate-800">' + fmtSeatNum(vid) + ' ' + escapeHtml(vs ? vs.name : '') + '</span>';
        }).join("");
        rowsHtml += '<div class="rounded-xl px-2.5 py-2 bg-slate-950/60 border border-slate-800/80 flex items-center flex-wrap gap-1.5">' +
          '<span class="text-[10px] font-bold text-slate-400 mr-1">本輪棄票（' + abstainers.length + ' 人）：</span>' + absChips +
        '</div>';
      }

      html += '<div class="rounded-2xl p-3 bg-slate-950/80 border border-slate-800 space-y-2">' +
        '<div class="flex items-center justify-between flex-wrap gap-1.5 pb-1.5 border-b border-slate-800/80">' +
          '<span class="text-xs font-black text-amber-200">' + roundLabel + '</span>' +
          summaryBadge +
        '</div>' +
        '<div class="space-y-2">' + rowsHtml + '</div>' +
      '</div>';
    });
  }
  html += '</div>';

  // SECTION 2: SEAT STATUS & ROLE NOTES TABLE
  let rows = "";
  state.match.seats.forEach(function (s) {
    const effKey = typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(s) : s.role;
    const knownKey = canSeeTruth ? effKey : state.match.playerKnownRoles[s.id];
    const rDefRow = (knownKey && ROLE_DEFS[knownKey]) ? ROLE_DEFS[knownKey] : (canSeeTruth && typeof getSeatRoleDef === "function" ? getSeatRoleDef(s) : null);
    let roleBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 text-slate-400">未知</span>';
    if (knownKey === "good_verified") {
      roleBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">已驗好人</span>';
    } else if (rDefRow) {
      const isWolfRole = knownKey === "wolf" || knownKey === "wolf_king" || (canSeeTruth && s.team === "wolf");
      const isGodRole = knownKey === "seer" || knownKey === "witch" || knownKey === "hunter" || knownKey === "guard" || knownKey === "elder";
      const rCls = isWolfRole
        ? "bg-rose-500/20 text-rose-200 border border-rose-400/45"
        : (isGodRole ? "bg-sky-500/20 text-sky-200 border border-sky-400/45" : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40");
      roleBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-black ' + rCls + '">' + rDefRow.name + '</span>';
    }

    let noteBadge = '<span class="text-slate-500">-</span>';
    if (!canSeeTruth && s.id !== getPlayerId()) {
      const mk = state.playerMarks[s.id];
      if (mk === "good") noteBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/35">標記好人</span>';
      else if (mk === "wolf") noteBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-400/35">標記懷疑</span>';
    } else if (s.id === getPlayerId()) {
      noteBadge = '<span class="text-[11px] font-bold text-emerald-300">本人</span>';
    }

    let claimBadge = '<span class="text-slate-500">未跳身分</span>';
    if (s.claimedRole && ROLE_DEFS[s.claimedRole]) {
      claimBadge = '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">跳' + ROLE_DEFS[s.claimedRole].name + '</span>';
    }

    const stBadge = s.alive
      ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/35">在場</span>'
      : ('<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-400/35">' + escapeHtml(s.outReason || "離席") + '</span>');

    rows += '<tr class="border-b border-slate-800/80 hover:bg-slate-800/35 transition ' + (!s.alive ? 'opacity-75' : '') + '">' +
      '<td class="py-2 px-2.5 font-black text-slate-100 whitespace-nowrap">' +
        '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-amber-200 text-[10px] mr-1.5 border border-slate-700">' + fmtSeatNum(s.id) + '</span>' +
        escapeHtml(s.name) +
      '</td>' +
      '<td class="py-2 px-2 whitespace-nowrap">' + stBadge + '</td>' +
      '<td class="py-2 px-2 whitespace-nowrap">' + claimBadge + '</td>' +
      (!canSeeTruth ? ('<td class="py-2 px-2 whitespace-nowrap">' + noteBadge + '</td>') : '') +
      '<td class="py-2 px-2 whitespace-nowrap">' + roleBadge + '</td>' +
    '</tr>';
  });

  html += '<div class="space-y-2">' +
    '<h4 class="text-xs font-black tracking-wide text-amber-300">全場座位與' + (canSeeTruth ? '真實底牌' : '情報筆記') + '</h4>' +
    '<div class="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/75">' +
      '<table class="w-full text-left border-collapse">' +
        '<thead><tr class="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">' +
          '<th class="py-2 px-2.5 font-bold">座位</th>' +
          '<th class="py-2 px-2 font-bold">狀態</th>' +
          '<th class="py-2 px-2 font-bold">場上表態</th>' +
          (!canSeeTruth ? '<th class="py-2 px-2 font-bold">我的標記</th>' : '') +
          '<th class="py-2 px-2 font-bold">' + (canSeeTruth ? '真實底牌' : '已知情報') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  body.innerHTML = html;
}

function switchGuideTab(tabKey) {
  const isTrace = tabKey === "trace";
  const tOv = el("tabGuideOverview");
  const tTr = el("tabGuideTrace");
  const pOv = el("guidePaneOverview");
  const pTr = el("guidePaneTrace");
  if (tOv) tOv.classList.toggle("is-active", !isTrace);
  if (tTr) tTr.classList.toggle("is-active", isTrace);
  if (pOv) pOv.classList.toggle("hidden", isTrace);
  if (pTr) pTr.classList.toggle("hidden", !isTrace);
  if (isTrace) renderOrchestratorTracePanel();
}

function renderOrchestratorTracePanel() {
  const sumBar = el("orchSummaryBar");
  const listEl = el("orchTraceList");
  if (!sumBar || !listEl) return;

  const hasOrch = typeof orchestrator !== "undefined";
  const epochNum = hasOrch ? orchestrator.matchEpoch : 0;
  const st = hasOrch && orchestrator.stats ? orchestrator.stats : { dispatches: 0, geminiHits: 0, heuristicHits: 0, complianceFiltered: 0 };
  const extActive = typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel);
  const extLabel = typeof getActiveLlmLabel === "function" ? getActiveLlmLabel() : (state.geminiModel || "Gemini");
  const routeText = (extActive ? ("雙核 " + extLabel) : "離線本地多代理") + " (" + st.geminiHits + "/" + st.heuristicHits + ")";
  const curEv = (state.match && state.match.activeDirectorEvent) ? state.match.activeDirectorEvent.shortTitle : "待開局指派";

  sumBar.innerHTML =
    '<div class="p-2 rounded-lg bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">世代 Epoch</div><div class="text-sm font-black text-amber-300 tabular-nums">#' + epochNum + '</div></div>' +
    '<div class="p-2 rounded-lg bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">代理總調度</div><div class="text-sm font-black text-emerald-300 tabular-nums">' + (st.dispatches || 0) + ' 次</div></div>' +
    '<div class="p-2 rounded-lg bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">推理路由</div><div class="text-[11px] font-bold text-sky-300 truncate mt-0.5">' + escapeHtml(routeText) + '</div></div>' +
    '<div class="p-2 rounded-lg bg-slate-950 border border-slate-800"><div class="text-[10px] text-slate-400">合規淨化／事件</div><div class="text-[11px] font-bold text-rose-200 truncate mt-0.5">' + (st.complianceFiltered || 0) + ' 次・' + escapeHtml(curEv) + '</div></div>';

  const acBox = el("antiCheatAuditBox");
  if (acBox) {
    const ac = (typeof antiCheatMonitor !== "undefined" && typeof antiCheatMonitor.getSummary === "function")
      ? antiCheatMonitor.getSummary()
      : { enabled: false, blindViewsIssued: 0, decisionsAudited: 0, promptAuditsPassed: 0, promptAuditsBlocked: 0, violationsBlocked: 0, byModule: {} };
    const isClean = ac.violationsBlocked === 0;
    const statusBadge = isClean
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/45">✓ 隔離運行中・0 偷看違規</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-200 border border-rose-400/50">⚠ 已攔截 ' + ac.violationsBlocked + ' 次越權</span>';
    const modEntries = Object.keys(ac.byModule || {}).map(function (k) {
      const lblMap = { day_speech: "發言", day_vote: "公投", night_guard: "守衛", night_wolf: "狼襲", night_seer: "查驗", night_witch: "奉茶", hunter_shot: "共鳴", sheriff_speech: "上警", sheriff_vote: "投警", sheriff_transfer: "移徽", last_words: "遺言", llm_prompt: "LLM掃描" };
      return escapeHtml((lblMap[k] || k) + "×" + ac.byModule[k]);
    }).join(" · ");
    acBox.innerHTML =
      '<div class="flex items-center justify-between gap-2 flex-wrap">' +
        '<span class="font-serif-craft text-xs font-bold text-emerald-300">🛡️ v9.0 反作弊盲視隔離防火牆（即時稽核）</span>' +
        statusBadge +
      '</div>' +
      '<div class="grid grid-cols-3 gap-1.5 text-center text-[10.5px]">' +
        '<div class="p-1.5 rounded bg-slate-900/90 border border-slate-800"><div class="text-[9.5px] text-slate-400">盲視快照簽發</div><div class="font-black text-amber-200 tabular-nums">' + ac.blindViewsIssued + ' 次</div></div>' +
        '<div class="p-1.5 rounded bg-slate-900/90 border border-slate-800"><div class="text-[9.5px] text-slate-400">受保護 AI 決策</div><div class="font-black text-emerald-300 tabular-nums">' + ac.decisionsAudited + ' 次</div></div>' +
        '<div class="p-1.5 rounded bg-slate-900/90 border border-slate-800"><div class="text-[9.5px] text-slate-400">LLM 零洩漏檢核</div><div class="font-black text-sky-300 tabular-nums">' + ac.promptAuditsPassed + ' 通過</div></div>' +
      '</div>' +
      '<div class="text-[10.5px] text-slate-300 leading-relaxed">' +
        '封鎖項目：他席底牌（role/team/isElder/fakeSeer）、他人私密懷疑值（suspicionMap）、未揭露心虛脈搏、<code>nightArchive</code> 與玩家私密驗證。' +
        (modEntries ? ('<div class="text-[10px] text-emerald-200/90 mt-1">本局已稽核：' + modEntries + '</div>') : '') +
      '</div>';
  }

  const traces = (hasOrch && Array.isArray(orchestrator.traces)) ? orchestrator.traces : [];
  if (traces.length === 0) {
    listEl.innerHTML = '<div class="rounded-xl p-5 text-center bg-slate-950/70 border border-slate-800 text-slate-400 text-xs">開局或試玩後，這裡將即時顯示四大 AI 代理的調度延遲、降級路線與文化合規檢核紀錄。</div>';
    return;
  }

  let rowsHtml = "";
  traces.forEach(function (tr) {
    const tone = tr.agent === "ThreeGoodGuardianAgent"
      ? "border-emerald-500/35 bg-emerald-950/25"
      : (tr.agent === "QingmingDirectorAgent"
        ? "border-amber-500/35 bg-amber-950/25"
        : (tr.agent === "GodViewAnalystAgent" ? "border-purple-500/35 bg-purple-950/25" : "border-slate-800 bg-slate-950/80"));
    const tagTone = tr.compliance ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/35" : "bg-amber-500/20 text-amber-200 border-amber-400/45";
    rowsHtml +=
      '<div class="rounded-lg px-2.5 py-2 border text-[11px] space-y-0.5 ' + tone + '">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div class="flex items-center gap-1.5 min-w-0">' +
            '<span class="font-black text-amber-200 shrink-0">' + escapeHtml(tr.agent) + '</span>' +
            '<span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] text-sky-200 truncate">' + escapeHtml(tr.tier) + '</span>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0 text-[10px]">' +
            '<span class="px-1.5 py-0.2 rounded border ' + tagTone + '">' + (tr.compliance ? "合規通過" : "已淨化") + '</span>' +
            '<span class="text-slate-400 tabular-nums">' + tr.ms + 'ms · D' + tr.day + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="text-slate-200 leading-snug">' + escapeHtml(tr.summary) + '</div>' +
      '</div>';
  });
  listEl.innerHTML = rowsHtml;
}
