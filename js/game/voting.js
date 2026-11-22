/**
 * 公投與平票 PK 決選規則、飛票動畫演出、四給（4G）救援大招
 */
"use strict";

// ==================== VOTING (STRICT 凹嗚 PK RULES) ====================
function isPkVoteActive() {
  return Boolean(state.match && state.match.pkCandidates && state.match.pkCandidates.length >= 2);
}

function isValidVoteTarget(seatId) {
  const t = getSeat(seatId);
  if (!t || !t.alive || t.id === getPlayerId()) return false;
  if (isPkVoteActive()) {
    return state.match.pkCandidates.indexOf(t.id) !== -1;
  }
  return true;
}

function isPlayerEligibleToVote() {
  const player = getPlayerSeat();
  if (!player || !player.alive) return false;
  if (isPkVoteActive() && state.match.pkCandidates.indexOf(player.id) !== -1) return false;
  return true;
}

function startVotingPhase() {
  clearStepTimer();
  voice.stop();
  state.activeSpeakerId = null;
  state.selectedSeatId = null;
  state.match.phase = "DAY_VOTE";
  const player = getPlayerSeat();

  if (!isPlayerEligibleToVote()) {
    const inPk = Boolean(player && player.alive && isPkVoteActive());
    const ffVote = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
    updateAllUI();
    if (!ffVote) {
      voice.speakHost(inPk
        ? "平票 PK 拉票結束，依凹嗚規則由非平票玩家進行決選投票！"
        : "全員發言結束，開始計票。");
    }
    state.stepTimer = setTimeout(function () { finalizeVoteRound(null); }, ffVote ? 240 : 1100);
    return;
  }
  updateAllUI();
  if (isPkVoteActive()) {
    const pkStr = state.match.pkCandidates.map(function (id) { return id + "號"; }).join("、");
    voice.speakHost("平票 PK 發言結束，請從" + pkStr + "中投選一人，或選擇棄票。");
  } else {
    voice.speakHost("全員發言結束，請點擊外圍座位投票抓狼。");
  }
}

function finalizeVoteRound(playerTargetId) {
  clearStepTimer();
  sound.playVote();

  const alive = getAliveSeats();
  const pkActive = isPkVoteActive();
  const tallies = {};
  const ballots = [];

  // 凹嗚標準規則：平票 PK 決選時，PK 候選人本人不參與投票，僅由非平票存活玩家投給平票候選人！
  const eligibleVoters = pkActive
    ? alive.filter(function (v) { return state.match.pkCandidates.indexOf(v.id) === -1; })
    : alive;

  eligibleVoters.forEach(function (voter) {
    let chosen = null;
    if (voter.id === getPlayerId()) {
      chosen = (playerTargetId && isValidVoteTarget(playerTargetId)) ? playerTargetId : null;
    } else {
      const pkPool = pkActive
        ? alive.filter(function (t) { return state.match.pkCandidates.indexOf(t.id) !== -1 && t.id !== voter.id; })
        : null;
      const others = (pkPool && pkPool.length > 0) ? pkPool : alive.filter(function (t) { return t.id !== voter.id; });
      if (voter.role === "wolf") {
        const nonWolves = others.filter(function (t) { return t.role !== "wolf"; });
        const pool = nonWolves.length > 0 ? nonWolves : others;
        // Coordinate wolf pack vote onto player's pack_push target or fake-Seer wolf partner's pushed target!
        const pidVote = getPlayerId();
        const playerWolfPush = (state.match.wolfTactic === "pack_push")
          ? (state.match.daySpeechEvents || []).find(function (ev) { return ev.speakerId === pidVote && ev.accuseId && ev.accuseId !== voter.id; })
          : null;
        const wolfPushEv = playerWolfPush || (state.match.daySpeechEvents || []).find(function (ev) {
          const sp = getSeat(ev.speakerId);
          return sp && sp.role === "wolf" && ev.accuseId && ev.accuseId !== voter.id;
        });
        const teamTargetId = wolfPushEv ? wolfPushEv.accuseId : null;
        pool.sort(function (a, b) {
          const sA = (a.id === teamTargetId ? 28 : 0) + (a.id === voter.publicVoteIntent ? 18 : 0) + (a.claimedRole === "seer" ? 22 : 0) + (voter.suspicionMap[a.id] || 50);
          const sB = (b.id === teamTargetId ? 28 : 0) + (b.id === voter.publicVoteIntent ? 18 : 0) + (b.claimedRole === "seer" ? 22 : 0) + (voter.suspicionMap[b.id] || 50);
          return sB - sA;
        });
        chosen = pool[0] ? pool[0].id : null;
      } else {
        // AI Good team Fact-Guard + public vote promise + 2-Seer Clash Focus + Harmony Aura
        const rallyId = state.match.convenienceRallyTargetId || null;
        const hazeChaos = (state.match.harmonyScore <= 45) ? 14 : 0;
        const seerClaimants = alive.filter(function (s) { return s.claimedRole === "seer"; });

        let candidatePool = others;
        const verifiedWolfIds = (voter.role === "seer" && voter.checkedHistory)
          ? voter.checkedHistory.filter(function (c) { return c.isWolf; }).map(function (c) { return c.targetId; })
          : [];
        const verifiedGoodIds = (voter.role === "seer" && voter.checkedHistory)
          ? voter.checkedHistory.filter(function (c) { return !c.isWolf; }).map(function (c) { return c.targetId; })
          : [];
        if (voter.role === "seer") {
          const safePool = others.filter(function (t) { return verifiedGoodIds.indexOf(t.id) === -1; });
          if (safePool.length > 0) candidatePool = safePool;
        } else if (voter.role === "witch" && voter.savedSeatId) {
          const safePool = others.filter(function (t) { return t.id !== voter.savedSeatId; });
          if (safePool.length > 0) candidatePool = safePool;
        }

        const ironSafe = Boolean(voter.ironFollowPlayer && playerTargetId && isValidVoteTarget(playerTargetId) && playerTargetId !== voter.id
          && (voter.role !== "seer" || verifiedGoodIds.indexOf(playerTargetId) === -1)
          && (voter.role !== "witch" || voter.savedSeatId !== playerTargetId));
        if (ironSafe) {
          chosen = playerTargetId;
        } else if (voter.role === "seer") {
          const aliveCheckedWolf = candidatePool.find(function (t) { return verifiedWolfIds.indexOf(t.id) !== -1; });
          const aliveFakeSeer = candidatePool.find(function (t) { return t.claimedRole === "seer" && t.id !== voter.id; });
          if (aliveCheckedWolf) {
            chosen = aliveCheckedWolf.id;
          } else if (aliveFakeSeer) {
            chosen = aliveFakeSeer.id;
          } else {
            candidatePool.sort(function (a, b) {
              const pA = (voter.publicVoteIntent === a.id ? 24 : 0) + (rallyId === a.id ? 14 : 0) + (voter.suspicionMap[a.id] || 50);
              const pB = (voter.publicVoteIntent === b.id ? 24 : 0) + (rallyId === b.id ? 14 : 0) + (voter.suspicionMap[b.id] || 50);
              return pB - pA;
            });
            if (candidatePool[0] && ((voter.publicVoteIntent === candidatePool[0].id) || (rallyId === candidatePool[0].id) || (voter.suspicionMap[candidatePool[0].id] || 50) >= 48)) {
              chosen = candidatePool[0].id;
            }
          }
        } else {
          const twoSeerFocus = (seerClaimants.length >= 2 && candidatePool.some(function (t) { return t.claimedRole === "seer"; }));
          candidatePool.sort(function (a, b) {
            const pA = (voter.publicVoteIntent === a.id ? 24 : 0) + (rallyId === a.id ? 18 : 0) + (twoSeerFocus && a.claimedRole === "seer" ? 20 : 0) + (voter.suspicionMap[a.id] || 50) + (hazeChaos && a.team === "good" ? Math.sin(voter.id * 7 + a.id * 3) * hazeChaos : 0);
            const pB = (voter.publicVoteIntent === b.id ? 24 : 0) + (rallyId === b.id ? 18 : 0) + (twoSeerFocus && b.claimedRole === "seer" ? 20 : 0) + (voter.suspicionMap[b.id] || 50) + (hazeChaos && b.team === "good" ? Math.sin(voter.id * 7 + b.id * 3) * hazeChaos : 0);
            return pB - pA;
          });
          if (candidatePool[0] && ((voter.publicVoteIntent === candidatePool[0].id) || (rallyId === candidatePool[0].id) || (voter.suspicionMap[candidatePool[0].id] || 50) >= 48)) {
            chosen = candidatePool[0].id;
          }
        }
      }
    }

    if (chosen) {
      let voteWeight = (state.match.sheriffSeatId === voter.id) ? 1.5 : 1;
      if (voter.id === getPlayerId() && state.match.goodwillVoteBonus) {
        voteWeight += 1;
      }
      tallies[chosen] = Math.round(((tallies[chosen] || 0) + voteWeight) * 10) / 10;
      recordRelation(voter.id, chosen, "vote");
      ballots.push({ voterId: voter.id, targetId: chosen, weight: voteWeight });
    } else {
      ballots.push({ voterId: voter.id, targetId: null, weight: 0 });
    }
  });

  state.match.convenienceRallyTargetId = null;
  state.match.seats.forEach(function (s) { s.ironFollowPlayer = false; });

  let shieldNote = "";
  state.match.seats.forEach(function (s) {
    if (s.trustShield && tallies[s.id]) {
      tallies[s.id] = Math.round(Math.max(0, tallies[s.id] - 1) * 10) / 10;
      shieldNote = " (" + s.id + "號擋1票)";
    }
  });

  state.match.voteHistory.push({ day: state.match.day, ballots: ballots, tallies: Object.assign({}, tallies) });
  const ballotStr = ballots.map(function (b) { return b.voterId + "→" + (b.targetId || "棄"); }).join(" ");

  let maxVotes = 0;
  let topIds = [];
  Object.keys(tallies).forEach(function (k) {
    const v = tallies[k];
    const idNum = parseInt(k, 10);
    if (v > maxVotes) { maxVotes = v; topIds = [idNum]; }
    else if (v === maxVotes && v > 0) topIds.push(idNum);
  });

  const groupedVoters = {};
  ballots.forEach(function (b) {
    if (b.targetId) {
      if (!groupedVoters[b.targetId]) groupedVoters[b.targetId] = [];
      groupedVoters[b.targetId].push("0" + b.voterId);
    }
  });

  function commitVoteResolution() {
    if (maxVotes === 0 || topIds.length !== 1) {
      // Real 凹嗚狼人殺 Tie-Breaker PK! First tie triggers PK speech & re-vote between tied seats!
      if (maxVotes > 0 && topIds.length >= 2 && topIds.length < alive.length && !state.match.pkUsedToday) {
        state.match.pkUsedToday = true;
        state.match.pkCandidates = topIds.slice();
        const pkNames = topIds.map(function (id) {
          const st = getSeat(id);
          return id + "號" + (id === getPlayerId() ? "你" : (st ? st.name : ""));
        }).join(" 與 ");
        addLog({ kind: "dawn", title: "平票進入 PK！" + pkNames + " 進行搶救拉票發言！", text: "" });
        triggerCutIn("⚔️ 平票 PK 決戰！", pkNames + " 最後搶救拉票！", "gold");
        if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") {
          stage3d.triggerHeroBeat("speak_gesture", 2600);
        }
        if (topIds.length >= 2) {
          spawnBeam(topIds[0], topIds[1], "#fbbf24", "clash", 780);
          spawnBurst(topIds[0], ["#fbbf24", "#ffffff"], 18, "slash");
          spawnBurst(topIds[1], ["#fbbf24", "#ffffff"], 18, "slash");
          if (typeof triggerScreenFlash === "function") triggerScreenFlash("#fbbf24", 440, 0.36);
        }
        state.voteResultPayload = {
          headline: "平票進入 PK！" + pkNames + " 最後拉票",
          lastWord: "「平票啦！請平票玩家進行最後一次 PK 拉票發言，隨後決選投票！」",
          tallies: tallies,
          groupedVoters: groupedVoters,
          outId: null,
          isPkTrigger: true,
          maxVotes: Math.max(1, maxVotes),
          onContinue: function () {
            state.match.phase = "DAY_SPEECH";
            state.match.dayOrder = topIds.slice();
            state.match.speechQueue = topIds.slice();
            state.activeSpeakerId = null;
            updateAllUI();
            advanceSpeechQueue();
          }
        };
        state.match.phase = "DAY_VOTE_RESULT";
        updateAllUI();
        if (el("btnVoteResultNext")) el("btnVoteResultNext").textContent = "開始平票 PK 發言 →";
        const ffPk = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
        if (!ffPk) voice.speakHost("開票平票！" + pkNames + "進入 PK 搶救發言！");
        if (state.autoPlay || ffPk) {
          const pkGo = state.voteResultPayload.onContinue;
          state.stepTimer = setTimeout(function () {
            if (state.match.phase === "DAY_VOTE_RESULT" && typeof pkGo === "function") {
              state.voteResultPayload = null;
              pkGo();
            }
          }, ffPk ? 650 : 4200);
        }
        return;
      }

      state.match.pkCandidates = null;
      addLog({ kind: "dawn", title: "平票無人出局（" + ballotStr + shieldNote + "）", text: "" });
      if (checkAndHandleGameOver()) return;
      state.voteResultPayload = {
        headline: "本輪平票・無人離席" + shieldNote,
        tallies: tallies,
        groupedVoters: groupedVoters,
        outId: null,
        maxVotes: Math.max(1, maxVotes),
        onContinue: beginNightPhase
      };
      state.match.phase = "DAY_VOTE_RESULT";
      updateAllUI();
      if (el("btnVoteResultNext")) el("btnVoteResultNext").textContent = "進入夜晚";
      const ffTie = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
      if (!ffTie) voice.speakHost("開票完成，本輪平票沒有人出局，請點擊進入夜晚。");
      if (state.autoPlay || ffTie) {
        state.stepTimer = setTimeout(beginNightPhase, ffTie ? 600 : 4000);
      }
      return;
    }
    state.match.pkCandidates = null;
    if (el("btnVoteResultNext")) el("btnVoteResultNext").textContent = "進入夜晚";

    const outSeat = getSeat(topIds[0]);
    outSeat.alive = false;
    outSeat.outReason = "投票出局";
    triggerShake(320);
    spawnBurst(outSeat.id, ["#fb7185", "#fbbf24", "#ffffff"], 28, "slash");
    if (typeof triggerScreenFlash === "function") triggerScreenFlash("#f43f5e", 460, 0.34);
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.triggerCameraPunch === "function") {
      stage3d.triggerCameraPunch(outSeat.id, { fov: 39, durationMs: 1350 });
    }
    spawnFx(outSeat.id, "最高票休息!", "#fbbf24", { scale: 1.2, durationMs: 1800 });

    addLog({
      kind: "dawn",
      title: " " + outSeat.id + "號 " + outSeat.name + "被投出去休息！（" + ballotStr + shieldNote + "）",
      text: ""
    });

    if (outSeat.team === "wolf" && state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "tea_master_blessing") {
      const playerVotedOutWolf = ballots.some(function (b) { return b.voterId === getPlayerId() && b.targetId === outSeat.id; });
      if (playerVotedOutWolf) {
        state.match.harmonyScore = clamp(state.match.harmonyScore + 12, 0, 100);
        spawnFx(getPlayerId(), "🏮 清茗賞茶 +12!", "#fbbf24");
        addLog({ kind: "blessing", title: "🏮 清茗奉茶公道席：精準請離酸民狼，全場友善度額外 +12！", text: "" });
        if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
      }
    }
    if (typeof orchestrator !== "undefined") orchestrator.emit("vote:resolved", { outId: outSeat.id, isWolf: outSeat.team === "wolf" });

    function continueAfterVoteSheriff() {
      if (outSeat.role === "hunter") {
        state.match.pendingVotedHunterId = outSeat.id;
        voice.speakHost(outSeat.id + "號" + outSeat.name + "最高票離席，觸發直心糾察長正氣共鳴！");
        triggerHunterResonance(outSeat, "AFTER_VOTE");
        return;
      }
      state.match.pendingVotedHunterId = null;
      if (checkAndHandleGameOver()) return;

      const isPlayerVotedOut = outSeat.id === getPlayerId();
      if (isPlayerVotedOut) {
        state.match.spectatorPrompted = true;
        // 凹嗚規則：玩家被公投出局時，先親自發表遺言，再顯示票型與觀戰/結束選項！
        startLastWordsSequence([outSeat.id], "vote_out", function (recordedText) {
          state.voteResultPayload = {
            headline: "0" + outSeat.id + "號 " + outSeat.name + " 最高票離席休息" + shieldNote,
            lastWord: recordedText || "（已發表遺言並離席）",
            tallies: tallies,
            groupedVoters: groupedVoters,
            outId: outSeat.id,
            maxVotes: Math.max(1, maxVotes),
            playerVotedOut: true,
            onContinue: beginNightPhase
          };
          state.match.phase = "DAY_VOTE_RESULT";
          updateAllUI();
          voice.speakHost("遺言結束，你可以選擇直接結束看底牌，或繼續往下看觀戰。");
        });
        return;
      }

      const aiLw = buildAiLastWords(outSeat, "vote_out");
      applyLastWordsInfluence(outSeat, aiLw.text, aiLw);
      const lastWord = "「" + aiLw.text + "」";

      state.voteResultPayload = {
        headline: "0" + outSeat.id + "號 " + outSeat.name + " 最高票離席休息" + shieldNote,
        lastWord: lastWord,
        tallies: tallies,
        groupedVoters: groupedVoters,
        outId: outSeat.id,
        maxVotes: Math.max(1, maxVotes),
        playerVotedOut: false,
        onContinue: beginNightPhase
      };
      state.match.phase = "DAY_VOTE_RESULT";
      updateAllUI();
      const ffOut = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
      if (!ffOut) voice.speakHost("開票完成，" + outSeat.id + "號" + outSeat.name + "獲得最高票離席休息，請點擊進入夜晚。");
      if (state.autoPlay || ffOut) {
        state.stepTimer = setTimeout(beginNightPhase, ffOut ? 650 : 5000);
      }
    }

    if (outSeat.role === "hunter") {
      continueAfterVoteSheriff();
      return;
    }
    if (checkAndHandleGameOver()) return;
    if (outSeat.id === state.match.sheriffSeatId) {
      handleSheriffEliminated(outSeat, continueAfterVoteSheriff);
      return;
    }
    continueAfterVoteSheriff();
  }

  // Suspenseful Sequential Flying-Ballot Reveal (Skippable with 1 click!)
  runVoteFlightSequence(ballots, commitVoteResolution);
}

function runVoteFlightSequence(ballots, onDone) {
  if (state.voteFlight && state.voteFlight.timers) {
    state.voteFlight.timers.forEach(function (t) { clearTimeout(t); });
  }
  closeSeatIntel();
  state.voteLeaderId = null;
  if (!ballots || ballots.length === 0) {
    onDone();
    return;
  }
  const banner = el("voteFlightBanner");
  const fTxt = el("voteFlightText");
  if (el("panelVote")) el("panelVote").classList.add("hidden");
  if (banner) banner.classList.remove("hidden");
  if (fTxt) fTxt.textContent = "開始逐票飛票開票…";

  const timers = [];
  const liveCounts = {};
  let bestCount = 0;
  let finished = false;
  function finishNow() {
    if (finished) return;
    finished = true;
    timers.forEach(function (t) { clearTimeout(t); });
    state.voteFlight = null;
    state.voteLeaderId = null;
    if (banner) banner.classList.add("hidden");
    if (!state.match.started) return;
    onDone();
  }
  state.voteFlight = { active: true, timers: timers, finish: finishNow };

  const ff = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  const stepMs = ff ? 45 : 195;
  ballots.forEach(function (b, idx) {
    const tm = setTimeout(function () {
      if (finished || !state.match.started) return;
      const vSeat = getSeat(b.voterId);
      const vName = b.voterId === getPlayerId() ? "你" : (vSeat ? vSeat.name : "");
      if (b.targetId) {
        const tSeat = getSeat(b.targetId);
        const tName = b.targetId === getPlayerId() ? "你" : (tSeat ? tSeat.name : "");
        const wAmt = b.weight || 1;
        liveCounts[b.targetId] = Math.round(((liveCounts[b.targetId] || 0) + wAmt) * 10) / 10;
        const cnt = liveCounts[b.targetId];
        if (cnt > bestCount) {
          bestCount = cnt;
          state.voteLeaderId = b.targetId;
        }
        if (typeof renderPkDuelBanner === "function") renderPkDuelBanner(liveCounts);
        spawnBeam(b.voterId, b.targetId, cnt >= 2 ? "#f43f5e" : "#fbbf24", "vote", 460);
        const labelPop = cnt >= 3 ? ("🔥 " + cnt + "票領先!") : (cnt >= 2 ? ("⚠ 累計 " + cnt + "票!") : "+1 票!");
        spawnFx(b.targetId, labelPop, cnt >= 2 ? "#f43f5e" : "#fb7185", { scale: cnt >= 2 ? 1.18 : 1.0, durationMs: 1450 });
        sound.tone(440 + idx * 38 + Math.min(cnt, 4) * 32, 0.08, "triangle", 0.055, 0);
        if (fTxt) fTxt.textContent = "開票 (" + (idx + 1) + "/" + ballots.length + ")：0" + b.voterId + " " + vName + " → 投給 0" + b.targetId + " " + tName + "（累計 " + cnt + " 票）";
      } else {
        spawnFx(b.voterId, "棄票", "#94a3b8");
        sound.tone(320, 0.06, "sine", 0.035, 0);
        if (fTxt) fTxt.textContent = "開票 (" + (idx + 1) + "/" + ballots.length + ")：0" + b.voterId + " " + vName + " 棄票";
      }
    }, idx * stepMs);
    timers.push(tm);
  });

  timers.push(setTimeout(finishNow, ballots.length * stepMs + (ff ? 140 : 420)));
}

// ==================== FOUR GIVINGS (4G) POWER CARDS & SYNERGIES ====================
const FOURG_JOY_JOKES = [
  "喝茶配冬瓜青，酸言瞬間消火氣——請問誰剛剛微笑突然凝固了？",
  "林美山頭吹過一陣笑聲清風，全場嘴角同時上揚，唯有心虛者在數心跳！",
  "茶席暖場笑話：酸民狼最怕兩種水，一是查證冷水，二是大家笑看他的茶水！",
  "笑一笑十年少！我們端起三好歡喜茶敬全場，看看誰笑得比桂花糕還僵硬！"
];

const PERSONA_CONFIDENCE_LINES = {
  "小澄": "謝謝你的信任護盾！我會把每一票的邏輯都盤給你看，這輪一起抓狼！",
  "暖暖": "哇收到暖心護盾超感動！這輪我們站穩好夥伴視角互相照應～",
  "阿松": "多謝這份信任！山城老將不會辜負你的信心，這輪替你重點釘緊 {t}！",
  "星兒": "欸嘿我的第六感剛剛也在亮燈！謝謝你的信心護盾，這輪鎖定留意 {t}！",
  "小雲": "感謝這張護盾替我分擔火力，查核組會用實際投票回報你的信任！",
  "阿竹": "得此誠心相託，如飲甘露；這輪我也會特別留神觀察 {t} 的動靜。",
  "晨晨": "夠義氣！收到你的給信心護盾，這輪一定陪你把可疑人選查個水落石出！"
};

const PERSONA_LAUGH_LINES = {
  "小澄": "哈哈，連數據控都忍不住笑出來，氣氛輕鬆多囉！",
  "暖暖": "哈哈哈這杯歡喜茶我乾了！大家開心推理別傷和氣～",
  "阿松": "呵呵，難得茶席上這麼有朝氣，比爬林美山還舒暢！",
  "星兒": "噗哈哈太鬧了吧！誰剛剛邊笑邊偷瞄旁邊啊？",
  "小雲": "哼笑一下也是好的，心理防線鬆動才好辨別真假～",
  "阿竹": "呵呵…笑聲裡自見真性情，這一局越來越有趣了。",
  "晨晨": "哈哈哈哈超讚！氣氛熱起來就對了！"
};

function triggerFourGSynergyCheck(cardKey) {
  if (!state.match || !state.match.started) return;
  if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") {
    stage3d.triggerHeroBeat("celebrate", 2200);
  }
  if (state.match.activeDirectorEvent && state.match.activeDirectorEvent.id === "fourg_echo") {
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 10, 0, 100);
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.hero && typeof triggerHeroAction === "function") {
      triggerHeroAction(stage3d.hero, "purify_cast", 2400);
    }
    showToast("🎴 四給雙倍共鳴祭：清茗喝采，全場額外恢復 +10 友善度！", "emerald");
  }
  if ((state.match.stats.fourGCount || 0) >= 2 && !state.match.fourGSynergyTriggered) {
    state.match.fourGSynergyTriggered = true;
    state.match.stats.fourGSynergies = (state.match.stats.fourGSynergies || 0) + 1;
    state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 8, 0, 100);
    const tg = state.match.threeGood || { heart: 0, words: 0, deeds: 0 };
    const bonusKind = tg.words === 0 ? "words" : (tg.heart === 0 ? "heart" : (tg.deeds === 0 ? "deeds" : "deeds"));
    if (typeof addThreeGoodPoint === "function") {
      addThreeGoodPoint(bonusKind, "四給連心充能");
    }
    bumpCombo("四給連心共鳴");
    triggerCutIn("🌸 四給連心・三好充能！", "連續運用「四給錦囊」帶動茶席正能量，友善度 +8 並點亮 1 瓣三好蓮花！", "emerald");
    addLog({ kind: "blessing", title: "🌸 四給連心：善用雙重四給錦囊，友善度 +8 並額外點亮 1 瓣三好蓮花！", text: "" });
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  }
}

function canUseFourGNow() {
  if (!state.match.started) return false;
  const pl = getPlayerSeat();
  if (!pl || !pl.alive) return false;
  const p = state.match.phase;
  return p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "DAY_VOTE";
}

function useFourGConfidence() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.confidence) return;
  const target = getSeat(state.selectedSeatId);
  if (!target || !target.alive || target.id === getPlayerId()) {
    showToast("先點圓桌選 1 位夥伴，再按【給信心】！", "warn");
    return;
  }
  state.match.fourGivingsUsed.confidence = true;
  state.match.stats.fourGCount += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 8, 0, 100);
  if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  target.trustShield = true;
  if (target.team === "good") {
    target.ironFollowPlayer = true;
    target.suspicionMap[getPlayerId()] = clamp((target.suspicionMap[getPlayerId()] || 50) - 24, 5, 95);
  }
  recordRelation(getPlayerId(), target.id, "trust");
  addThreeGoodPoint("deeds", "做好事・給信心");
  sound.playBlessing();
  spawnBeam(getPlayerId(), target.id, "#34d399", "trust");
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.triggerSkillFx("witch_heal", getPlayerId(), target.id, false);
  }
  setSeatEmotion(target.id, "happy", 3400);
  spawnBurst(target.id, ["#34d399", "#fbbf24", "#ffffff"], 22, "petal");
  // Fair Play: Unified public copy prevents leaking whether target is Good or Wolf before tally!
  triggerCutIn("🛡 四給・給信心！", "0" + target.id + "號 " + target.name + " 獲得信任護盾・本輪少計 1 票！", "emerald");
  spawnFx(target.id, "🛡 擋1票護盾!", "#34d399");
  bumpCombo("四給・給信心");

  const others = getAliveSeats().filter(function (s) { return s.id !== target.id; });
  others.sort(function (a, b) { return (target.suspicionMap[b.id] || 50) - (target.suspicionMap[a.id] || 50); });
  const topSus = others[0];
  const topLbl = topSus ? ("0" + topSus.id + "號") : "可疑者";
  const replyTpl = PERSONA_CONFIDENCE_LINES[target.name] || ("謝謝你的信任！這輪我也會特別留意 " + topLbl + "！");
  setCanvasBubble(target.id, replyTpl.replace(/\{t\}/g, topLbl), "trust");

  addLog({
    kind: "blessing",
    title: "🛡 給信心：0" + target.id + "號 本輪擋1票護盾，並回應目前留意 " + (topSus ? ("0" + topSus.id + "號") : "未知"),
    text: ""
  });
  triggerFourGSynergyCheck("confidence");
  updateAllUI();
}

function useFourGJoy() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.joy) return;
  state.match.fourGivingsUsed.joy = true;
  state.match.stats.fourGCount += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 16, 0, 100);
  if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  addThreeGoodPoint("words", "說好話・給歡喜");
  sound.playBlessing();
  const joyJoke = FOURG_JOY_JOKES[((state.match.day || 1) + (state.match.stats.fourGCount || 0)) % FOURG_JOY_JOKES.length];
  setSeatBubble(getPlayerId(), "「" + joyJoke + "」", "trust", 4200);
  triggerCutIn("☀️ 四給・給歡喜破冰！", joyJoke, "gold");

  // Fair Play: Trigger nervous sweat on 1 Wolf + 1 flustered Good partner so 4G-Joy creates real deduction rather than a 100% auto-reveal!
  const aliveAiWolves = getAliveSeats().filter(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; });
  const aliveAiGoods = getAliveSeats().filter(function (s) { return s.id !== getPlayerId() && s.role !== "wolf"; });
  const nervousWolf = aliveAiWolves.length > 0 ? aliveAiWolves[Math.floor(Math.random() * aliveAiWolves.length)] : null;
  const flusteredGood = (nervousWolf && aliveAiGoods.length > 0)
    ? aliveAiGoods[Math.floor(Math.random() * aliveAiGoods.length)]
    : null;
  const nervousIds = [];
  if (nervousWolf) nervousIds.push(nervousWolf.id);
  if (flusteredGood) nervousIds.push(flusteredGood.id);
  const awkwardLines = [
    "呃…哈哈這茶好香啊…我沒在流汗啦！（端茶杯手抖）",
    "哈哈、哈哈哈哈…咦大家怎麼突然看我這桌？"
  ];

  getAliveSeats().forEach(function (s, idx) {
    if (s.id === getPlayerId()) return;
    if (nervousIds.indexOf(s.id) !== -1) {
      s.sweatExposed = true;
      if (nervousWolf && s.id === nervousWolf.id) {
        s.microPulse = Math.max(76, s.microPulse || 78);
      } else {
        s.microPulse = clamp(54 + ((s.id * 7 + state.match.day * 5) % 15), 52, 68);
      }
      setSeatEmotion(s.id, "nervous", 5200);
      spawnFx(s.id, "💦 笑僵緊張!", "#fb7185");
      spawnBurst(s.id, ["#fb7185", "#fbbf24"], 16, "spark");
      setSeatBubble(s.id, awkwardLines[nervousIds.indexOf(s.id) % awkwardLines.length], "suspect", 4600);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", getPlayerId(), s.id, false);
      }
    } else {
      setSeatEmotion(s.id, "laugh", 4200);
      spawnFx(s.id, "😄 開懷大笑!", "#6ee7b7");
      spawnBurst(s.id, ["#6ee7b7", "#fde68a"], 12, "petal");
      setSeatBubble(s.id, PERSONA_LAUGH_LINES[s.name] || "哈哈氣氛輕鬆多了，大家開心推理！", "trust", 3400);
    }
  });

  const sortedNervous = nervousIds.slice().sort(function (a, b) { return a - b; });
  state.match.fourGJoySuspects = sortedNervous.slice();
  const pairLabels = sortedNervous.map(function (id) {
    const st = getSeat(id);
    return "0" + id + "號" + (st ? (" " + st.name) : "");
  });
  const clueMsg = pairLabels.length >= 2
    ? ("☀️ 給歡喜破冰成功！" + pairLabels.join(" 與 ") + " 笑容略顯僵硬，其中必藏酸民狼（點擊可細看心虛脈搏）！")
    : (pairLabels.length === 1
      ? ("☀️ 給歡喜破冰成功！唯有 " + pairLabels[0] + " 笑僵冒冷汗（心虛 " + getSeat(sortedNervous[0]).microPulse + "%）！")
      : "☀️ 給歡喜破冰成功！全場氣氛大大回溫！");
  addLog({ kind: "blessing", title: clueMsg, text: "" });
  showToast(pairLabels.length >= 2
    ? ("👀 給歡喜試探：" + sortedNervous.map(function (id) { return "0" + id + "號"; }).join(" 與 ") + " 同時笑僵！可搭配【給希望】雙光交會鎖定！")
    : (pairLabels.length === 1 ? ("👀 快看圓桌！" + pairLabels[0] + " 笑不出來正在冒冷汗！") : "全場笑聲驅散了酸言霧霾！"), "emerald");
  triggerFourGSynergyCheck("joy");
  updateAllUI();
}

function useFourGHope() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.hope) return;
  state.match.fourGivingsUsed.hope = true;
  state.match.stats.fourGCount += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 10, 0, 100);
  if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  addThreeGoodPoint("heart", "存好心・給希望");
  sound.playBlessing();

  const aliveWolves = getAliveSeats().filter(function (s) { return s.role === "wolf" && s.id !== getPlayerId(); });
  const aliveGood = getAliveSeats().filter(function (s) { return s.role !== "wolf" && s.id !== getPlayerId(); });

  let msg = "給希望線索：酸民狼已快現形！";
  if (aliveWolves.length > 0 && aliveGood.length > 0) {
    const pair = Math.random() < 0.5 ? [aliveWolves[0], aliveGood[0]] : [aliveGood[0], aliveWolves[0]];
    state.match.fourGHopePair = [pair[0].id, pair[1].id];
    spawnBeam(getPlayerId(), pair[0].id, "#38bdf8", "emote");
    spawnBeam(getPlayerId(), pair[1].id, "#38bdf8", "emote");
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      stage3d.triggerSkillFx("seer_scan", getPlayerId(), pair[0].id, false);
      setTimeout(function () {
        if (stage3d.isActive()) stage3d.triggerSkillFx("seer_scan", getPlayerId(), pair[1].id, false);
      }, 260);
    }
    spawnBurst(pair[0].id, ["#38bdf8", "#fde68a", "#ffffff"], 16, "star");
    spawnBurst(pair[1].id, ["#38bdf8", "#fde68a", "#ffffff"], 16, "star");
    setSeatEmotion(pair[0].id, "shock", 2600);
    setSeatEmotion(pair[1].id, "shock", 2600);
    spawnFx(pair[0].id, "二選一!", "#38bdf8");
    spawnFx(pair[1].id, "二選一!", "#38bdf8");
    triggerCutIn("🌟 四給・給希望！", "金色雙光鎖定：0" + pair[0].id + "號 與 0" + pair[1].id + "號 必有一狼！", "gold");
    msg = "AI 二選一鎖定：【" + pair[0].id + "號】與【" + pair[1].id + "號】其中必有酸民狼！";

    const joyList = Array.isArray(state.match.fourGJoySuspects) ? state.match.fourGJoySuspects : [];
    const overlapSeats = pair.filter(function (ps) { return joyList.indexOf(ps.id) !== -1; });
    if (overlapSeats.length === 1) {
      const ov = overlapSeats[0];
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 6, 0, 100);
      bumpCombo("四給雙光交會");
      spawnFx(ov.id, "✨ 雙光交會焦點!", "#fbbf24");
      triggerCutIn("✨ 歡喜 × 希望・雙光交會！", "0" + ov.id + "號 " + ov.name + " 同時落在破冰緊張與雙光鎖定中，建議重點查證！", "gold");
      addLog({ kind: "blessing", title: "✨ 歡喜×希望雙光交會：0" + ov.id + "號 " + ov.name + " 同時重疊兩張四給線索！", text: "" });
    }
  }
  addLog({ kind: "blessing", title: msg, text: "" });
  showToast(msg, "emerald");
  triggerFourGSynergyCheck("hope");
  updateAllUI();
}

function useFourGConvenience() {
  sound.unlock();
  if (!state.match.started) return;
  if (!state.match.fourGivingsUsed.convenience && canUseFourGNow()) {
    state.match.fourGivingsUsed.convenience = true;
    state.match.stats.fourGCount += 1;
    state.match.harmonyScore = clamp(state.match.harmonyScore + 8, 0, 100);
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    state.showRelationsOnCanvas = true;
    addThreeGoodPoint("deeds", "做好事・給方便歸票");
    sound.playBlessing();

    const claims = state.match.seats.filter(function (s) { return s.alive && s.claimedRole && ROLE_DEFS[s.claimedRole]; })
      .map(function (s) { return "0" + s.id + "號跳" + ROLE_DEFS[s.claimedRole].name; });
    const vw = typeof computeTableWindVane === "function" ? computeTableWindVane() : null;
    const digestText = "跳牌：" + (claims.length ? claims.join("、") : "尚無") + (vw && vw.summaryText ? ("｜" + vw.summaryText) : "");

    // Rally undecided Good AIs toward your selected target OR highlight the sharpest contradiction!
    const sel = getSeat(state.selectedSeatId);
    const hasRallyTarget = Boolean(sel && sel.alive && sel.id !== getPlayerId());
    if (hasRallyTarget) {
      state.match.convenienceRallyTargetId = sel.id;
      getAliveSeats().forEach(function (ai) {
        if (ai.id !== getPlayerId() && ai.id !== sel.id && ai.team === "good") {
          ai.suspicionMap[sel.id] = clamp((ai.suspicionMap[sel.id] || 50) + 16, 5, 96);
        }
      });
      spawnBeam(getPlayerId(), sel.id, "#c084fc", "vote", 720);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", getPlayerId(), sel.id, false);
      }
      triggerCutIn("🧭 四給・給方便歸票！", "理清全場關係線，號召搖擺好人集中檢視 0" + sel.id + "號 " + sel.name + "！", "gold");
      addLog({
        kind: "blessing",
        title: "🧭 給方便歸票：已點亮連線並號召集中檢視 0" + sel.id + "號 " + sel.name + "！（" + digestText + "）",
        text: ""
      });
      showToast("🧭 已理清關係線並號召好人歸票 0" + sel.id + "號！（" + digestText + "）", "emerald");
    } else {
      // Find the seat with a real observable contradiction, toxic slip, or early claim
      const evs = state.match.daySpeechEvents || [];
      const susEv = evs.find(function (ev) { return ev.speakerId !== getPlayerId() && ev.contradiction; })
        || evs.find(function (ev) { return ev.speakerId !== getPlayerId() && ev.hasToxicSlip; })
        || evs.find(function (ev) { return ev.speakerId !== getPlayerId() && ev.claimRole === "seer"; })
        || evs.find(function (ev) { return ev.speakerId !== getPlayerId(); })
        || evs[0];
      const highlightId = susEv ? susEv.speakerId : null;
      const hs = highlightId ? getSeat(highlightId) : null;
      if (hs && hs.alive) {
        state.selectedSeatId = hs.id;
        state.match.convenienceRallyTargetId = hs.id;
        spawnFx(hs.id, "🧭 焦點整理!", "#c084fc");
        if (typeof stage3d !== "undefined" && stage3d.isActive()) {
          stage3d.triggerSkillFx("seer_scan", getPlayerId(), hs.id, false);
        }
      }
      triggerCutIn("🧭 四給・給方便理清混亂！", hs ? ("已標記全場焦點 0" + hs.id + "號 " + hs.name + " 並點亮關係連線！") : "已點亮全場 3D 關係連線與戰情懶人包！", "gold");
      addLog({
        kind: "blessing",
        title: "🧭 給方便戰情懶人包：" + (hs ? ("焦點 0" + hs.id + "號" + hs.name + "｜") : "") + digestText,
        text: ""
      });
      showToast("🧭 " + digestText + "（下次先點目標再按「給方便」還能直接歸票！）", "emerald");
    }
    triggerFourGSynergyCheck("convenience");
    updateAllUI();
    return;
  }
  state.showRelationsOnCanvas = true;
  openVoteSheetModal();
  updateAllUI();
}

// ==================== SHERIFF BADGE TRANSFER & RALLY CALL ====================
function handleSheriffEliminated(deadSheriff, onDone) {
  const doneCb = typeof onDone === "function" ? onDone : function () {};
  if (!deadSheriff || !state.match || state.match.sheriffSeatId !== deadSheriff.id) {
    doneCb();
    return;
  }
  const alivePool = getAliveSeats().filter(function (s) { return s.id !== deadSheriff.id; });
  if (alivePool.length === 0) {
    state.match.sheriffSeatId = null;
    doneCb();
    return;
  }

  if (deadSheriff.id !== getPlayerId()) {
    let pick = null;
    if (deadSheriff.role === "wolf") {
      pick = alivePool.find(function (s) { return s.role === "wolf"; }) || null;
    }
    if (!pick) {
      const trusted = alivePool.slice().sort(function (a, b) {
        return (deadSheriff.suspicionMap[a.id] || 50) - (deadSheriff.suspicionMap[b.id] || 50);
      });
      if (trusted[0] && (deadSheriff.suspicionMap[trusted[0].id] || 50) < 58) {
        pick = trusted[0];
      }
    }
    state.match.sheriffSeatId = pick ? pick.id : null;
    if (pick) {
      spawnBeam(deadSheriff.id, pick.id, "#fbbf24", "trust", 900);
      spawnFx(pick.id, "👑 接棒警徽!", "#fbbf24");
      triggerCutIn("👑 警徽移交！", "0" + deadSheriff.id + "號警長將 1.5 票警徽交予 0" + pick.id + "號 " + (pick.id === getPlayerId() ? "你" : pick.name) + "！", "gold");
      addLog({ kind: "blessing", title: "👑 警徽傳承：0" + deadSheriff.id + "號將警徽移交給 0" + pick.id + "號 " + (pick.id === getPlayerId() ? "你" : pick.name) + "（擁有 1.5 票歸票權）！", text: "" });
    } else {
      triggerCutIn("💥 警徽撕毀！", "0" + deadSheriff.id + "號警長選擇當場撕毀警徽，本局不設警長。", "crimson");
      addLog({ kind: "dawn", title: "💥 警徽作廢：0" + deadSheriff.id + "號離席並撕毀警徽！", text: "" });
    }
    updateAllUI();
    doneCb();
    return;
  }

  // Player is the outgoing Sheriff: pause cleanly on SHERIFF_TRANSFER panel!
  state.match.pendingSheriffTransfer = { deadId: deadSheriff.id, onDone: doneCb };
  state.match.phase = "SHERIFF_TRANSFER";
  updateAllUI();
  voice.speakHost("你是本局警長，離席前請選擇將警徽移交給哪一位存活夥伴，或直接撕毀警徽。");
}

function resolvePlayerSheriffTransfer(targetSeatId) {
  sound.unlock();
  const pending = state.match && state.match.pendingSheriffTransfer;
  const pid = getPlayerId();
  if (targetSeatId) {
    const heir = getSeat(targetSeatId);
    if (!heir || !heir.alive || heir.id === pid) return;
    state.match.sheriffSeatId = heir.id;
    state.match.stats.sheriffPassed = (state.match.stats.sheriffPassed || 0) + 1;
    sound.playBlessing();
    spawnBeam(pid, heir.id, "#fbbf24", "trust", 900);
    spawnFx(heir.id, "👑 接下警徽!", "#fbbf24");
    triggerCutIn("👑 警徽交棒！", "你將 1.5 票警徽移交給 0" + heir.id + "號 " + heir.name + "！", "gold");
    addLog({ kind: "blessing", title: "👑 警徽傳承：你將警徽移交給 0" + heir.id + "號 " + heir.name + "！", text: "" });
  } else {
    state.match.sheriffSeatId = null;
    state.match.stats.sheriffPassed = (state.match.stats.sheriffPassed || 0) + 1;
    triggerCutIn("💥 警徽已撕毀！", "你決定當場撕毀警徽，本局不留 1.5 票權。", "crimson");
    addLog({ kind: "dawn", title: "💥 警徽作廢：你已當場撕毀警徽！", text: "" });
  }
  state.match.pendingSheriffTransfer = null;
  if (pending && typeof pending.onDone === "function") {
    pending.onDone();
  }
}

function useSheriffRallyCall() {
  sound.unlock();
  if (!state.match || !state.match.started || state.match.phase !== "DAY_VOTE") return false;
  const pid = getPlayerId();
  if (state.match.sheriffSeatId !== pid) return false;
  if (state.match.sheriffRallyUsedDay === state.match.day) {
    showToast("今天已經發動過警長歸票號召囉！", "amber");
    return false;
  }
  const sel = getSeat(state.selectedSeatId);
  if (!sel || !isValidVoteTarget(sel.id)) {
    showToast("請先點選一位可投票的目標，再按「👑 警長歸票」！", "warn");
    return false;
  }
  state.match.sheriffRallyUsedDay = state.match.day;
  state.match.convenienceRallyTargetId = sel.id;
  state.match.stats.sheriffPassed = (state.match.stats.sheriffPassed || 0) + 1;
  getAliveSeats().forEach(function (ai) {
    if (ai.id !== pid && ai.id !== sel.id && ai.team === "good") {
      ai.suspicionMap[sel.id] = clamp((ai.suspicionMap[sel.id] || 50) + 14, 5, 96);
    }
  });
  sound.playBlessing();
  spawnBeam(pid, sel.id, "#fbbf24", "vote", 760);
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    stage3d.triggerSkillFx("seer_scan", pid, sel.id, false);
  }
  triggerCutIn("👑 警長歸票號召！", "號召好人夥伴集中檢視 0" + sel.id + "號 " + sel.name + "（1.5票威望+14懷疑）！", "gold");
  addLog({ kind: "blessing", title: "👑 警長歸票：你以警長身分號召好人陣營集中考量 0" + sel.id + "號 " + sel.name + "！", text: "" });
  showToast("👑 警長歸票號召成功！接下來點「確認投票」送出你的 1.5 票！", "emerald");
  updateAllUI();
  return true;
}

function buildSheriffElectionCandidates() {
  const alive = getAliveSeats();
  const pid = getPlayerId();
  const cands = [];
  const seerLike = alive.find(function (s) { return s.id !== pid && s.role === "seer"; });
  const wolfBluff = alive.find(function (s) { return s.id !== pid && s.role === "wolf" && s.fakeSeer; });
  const extraAi = alive.find(function (s) { return s.id !== pid && s !== seerLike && s !== wolfBluff && s.team === "good"; });
  [seerLike, wolfBluff, extraAi].forEach(function (s) {
    if (s && !cands.some(function (c) { return c.id === s.id; })) cands.push(s);
  });
  if (cands.length < 2) {
    alive.forEach(function (s) {
      if (s.id !== pid && cands.length < 2 && !cands.some(function (c) { return c.id === s.id; })) {
        cands.push(s);
      }
    });
  }
  return cands;
}

function buildSheriffCandidateLine(cand) {
  const others = getAliveSeats().filter(function (s) { return s.id !== cand.id; });
  const focus = others[0] ? ("0" + others[0].id + "號" + others[0].name) : "前排席位";
  const next = others[1] ? ("0" + others[1].id + "號" + others[1].name) : "後置位";
  if (cand.role === "seer" || cand.fakeSeer) {
    return "「昨晚先查了 " + focus + "（視角偏正），若拿警徽今晚先驗 " + next + "，雙邊警徽流透明帶隊！」";
  }
  if (cand.role === "guard") {
    return "「我是理性帶隊派，警徽交給我能幫忙鎖定焦點與節奏、末置位穩穩歸票！」";
  }
  return "「我說話講邏輯不情緒化，給我警徽我會在末置位整理正反兩邊坑位，公平歸票！」";
}

function startSheriffElection(onDone) {
  const m = state.match;
  if (!m || !m.started || !state.sheriffMode || !m.sheriffElectionPending || m.day !== 1) {
    if (m) m.sheriffElectionPending = false;
    if (typeof onDone === "function") onDone();
    return false;
  }
  m.sheriffElectionPending = false;
  const cands = buildSheriffElectionCandidates();
  const pSeat = getPlayerSeat();
  const ffSpec = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (state.autoPlay || ffSpec || !pSeat || !pSeat.alive || cands.length === 0) {
    const existingSh = m.sheriffSeatId ? getSeat(m.sheriffSeatId) : null;
    const fallbackWinner = (existingSh && existingSh.alive) ? existingSh : (cands[0] || getAliveSeats()[0] || null);
    if (fallbackWinner) {
      m.sheriffSeatId = fallbackWinner.id;
      const pidAuto = getPlayerId();
      addLog({
        kind: "blessing",
        title: "👑 警長誕生：0" + fallbackWinner.id + "號 " + (fallbackWinner.id === pidAuto ? "你" : fallbackWinner.name) + " 當選本局警長（1.5票＆末置位歸票權）！",
        text: ""
      });
    } else {
      m.sheriffSeatId = null;
    }
    if (typeof onDone === "function") onDone();
    return false;
  }
  m.sheriffElectionCtx = {
    candidateIds: cands.map(function (c) { return c.id; }),
    speeches: cands.map(function (c) {
      return { id: c.id, name: c.name, text: buildSheriffCandidateLine(c) };
    }),
    playerRunning: false,
    playerWithdrew: false,
    onDone: typeof onDone === "function" ? onDone : null
  };
  m.phase = "SHERIFF_ELECTION";
  addLog({ kind: "system", title: "👑 第一天「上警競選」開始！想爭取 1.5 票與末置位歸票權請點擊上警，或直接在警下聽選。", text: "" });
  if (typeof voice !== "undefined" && voice.canSpeak()) {
    voice.speakHost("第一天警長競選開始，想爭取末置位歸票權請上警，否則可在警下投票！");
  }
  updateAllUI();
  return true;
}

function finalizeSheriffElectionWinner(chosenCandId) {
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx) return null;
  const pid = getPlayerId();
  const cands = ctx.candidateIds.map(getSeat).filter(function (s) { return s && s.alive; });
  let winner = null;
  if (cands.length === 0) {
    winner = getAliveSeats()[0] || null;
  } else if (chosenCandId && cands.some(function (c) { return c.id === chosenCandId; })) {
    if (cands.length === 1) {
      winner = cands[0];
    } else {
      const counts = {};
      cands.forEach(function (c) { counts[c.id] = 0; });
      counts[chosenCandId] = (counts[chosenCandId] || 0) + 1.2;
      getAliveSeats().forEach(function (s) {
        if (s.id === pid || ctx.candidateIds.indexOf(s.id) !== -1) return;
        const ranked = cands.slice().sort(function (a, b) {
          const sa = (s.team === a.team ? 18 : 0) - ((s.suspicionMap && s.suspicionMap[a.id]) || 50) + (a.role === "seer" ? 12 : 0);
          const sb = (s.team === b.team ? 18 : 0) - ((s.suspicionMap && s.suspicionMap[b.id]) || 50) + (b.role === "seer" ? 12 : 0);
          return sb - sa;
        });
        if (ranked[0]) counts[ranked[0].id] = (counts[ranked[0].id] || 0) + 1;
      });
      winner = cands.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); })[0];
    }
  } else {
    const counts = {};
    cands.forEach(function (c) { counts[c.id] = 0; });
    getAliveSeats().forEach(function (s) {
      if (ctx.candidateIds.indexOf(s.id) !== -1) return;
      const ranked = cands.slice().sort(function (a, b) {
        const biasA = a.id === pid ? 16 : (a.role === "seer" ? 10 : 0);
        const biasB = b.id === pid ? 16 : (b.role === "seer" ? 10 : 0);
        const sa = biasA - ((s.suspicionMap && s.suspicionMap[a.id]) || 50);
        const sb = biasB - ((s.suspicionMap && s.suspicionMap[b.id]) || 50);
        return sb - sa;
      });
      if (ranked[0]) counts[ranked[0].id] = (counts[ranked[0].id] || 0) + 1;
    });
    winner = cands.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); })[0];
  }
  const doneCb = ctx.onDone;
  m.sheriffElectionCtx = null;
  if (winner) {
    m.sheriffSeatId = winner.id;
    m.stats.sheriffPassed = (m.stats.sheriffPassed || 0) + 1;
    const wLbl = winner.id === pid ? (playerNumTag() + " 你") : ("0" + winner.id + "號 " + winner.name);
    sound.playBlessing();
    if (typeof spawnBurst === "function") spawnBurst(winner.id, ["#fbbf24", "#fde68a", "#ffffff"], 22, "star");
    if (typeof spawnFx === "function") spawnFx(winner.id, "👑 當選警長!", "#fbbf24", { scale: 1.15, durationMs: 1600 });
    triggerCutIn("👑 警長誕生！", wLbl + " 當選本局警長（1.5票歸票＋末置位發言權）！", "gold", 1500);
    addLog({ kind: "blessing", title: "👑 競選揭曉：" + wLbl + " 高票當選本局警長！", text: "" });
  }
  if (typeof doneCb === "function") doneCb();
  else updateAllUI();
  return winner;
}

function resolveSheriffElectionAction(actionOrVoteId) {
  sound.unlock();
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return false;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();

  if (actionOrVoteId === "run") {
    if (!pSeat || !pSeat.alive || ctx.playerWithdrew || ctx.playerRunning) return false;
    ctx.playerRunning = true;
    if (ctx.candidateIds.indexOf(pid) === -1) ctx.candidateIds.unshift(pid);
    if (!ctx.speeches.some(function (sp) { return sp.id === pid; })) {
      ctx.speeches.unshift({
        id: pid,
        name: "你",
        text: (pSeat && pSeat.role === "seer")
          ? "「我上警爭取警徽！我會報出每夜查驗與清晰警徽流，帶好人穩穩出狼！」"
          : "「我上警參與競選！會在末置位整理全場坑位對立與票型，帶隊投出破綻！」"
      });
    }
    sound.tone(640, 0.08, "triangle", 0.05, 0);
    addLog({ kind: "system", title: "🙋 你已舉手上警競選警長！若想棄權可按「退水」，或按「決選」直接開票。", text: "" });
    updateAllUI();
    return true;
  }

  if (actionOrVoteId === "withdraw") {
    if (!ctx.playerRunning) return false;
    ctx.playerRunning = false;
    ctx.playerWithdrew = true;
    ctx.candidateIds = ctx.candidateIds.filter(function (id) { return id !== pid; });
    ctx.speeches = ctx.speeches.filter(function (sp) { return sp.id !== pid; });
    addLog({ kind: "system", title: "🏳 你已退水回到警下，待會將由警下夥伴投票決選。", text: "" });
    updateAllUI();
    return true;
  }

  if (actionOrVoteId === "pass") {
    finalizeSheriffElectionWinner(ctx.playerRunning ? pid : null);
    return true;
  }

  const voteId = typeof actionOrVoteId === "number" ? actionOrVoteId : parseInt(actionOrVoteId, 10);
  if (!pSeat || !pSeat.alive) return false;
  if (ctx.playerRunning && voteId && voteId !== pid) return false;
  if (voteId && ctx.candidateIds.indexOf(voteId) !== -1) {
    finalizeSheriffElectionWinner(voteId);
    return true;
  }
  return false;
}

function startSheriffOrderPick(arg) {
  const m = state.match;
  const sh = (m && m.sheriffSeatId) ? getSeat(m.sheriffSeatId) : null;
  const onPicked = typeof arg === "function"
    ? arg
    : function (dir) {
        startDayDiscussion(typeof arg === "string" ? arg : "", dir ? { forcedDir: dir } : undefined);
      };
  if (!m || !m.started || !state.sheriffMode || !sh || !sh.alive || sh.id !== getPlayerId() || state.autoPlay) {
    onPicked(null);
    return false;
  }
  m.sheriffOrderCtx = {
    onPicked: onPicked
  };
  m.phase = "SHERIFF_ORDER";
  addLog({ kind: "system", title: "👑 請你以警長身分指定今日發言順序：順時針或逆時針（你將壓軸末置位歸票）。", text: "" });
  if (typeof voice !== "undefined" && voice.canSpeak()) {
    voice.speakHost("請警長指定今日發言順序：順時針或逆時針！");
  }
  updateAllUI();
  return true;
}

function resolveSheriffOrderPick(dir) {
  sound.unlock();
  const m = state.match;
  const ctx = m ? m.sheriffOrderCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ORDER") return false;
  const normDir = dir === -1 ? -1 : 1;
  m.sheriffOrderCtx = null;
  addLog({
    kind: "system",
    title: "👑 警長指序：今日採「" + (normDir === 1 ? "順時針" : "逆時針") + "」輪流發言，由警長壓軸末置位歸票！",
    text: ""
  });
  sound.tone(normDir === 1 ? 620 : 520, 0.08, "triangle", 0.05, 0);
  if (typeof ctx.onPicked === "function") {
    ctx.onPicked(normDir);
  } else {
    startDayDiscussion(null, { forcedDir: normDir });
  }
  return true;
}
