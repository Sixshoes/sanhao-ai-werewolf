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
  if (!player || !player.alive || player.voteDisabled) return false;
  if (isPkVoteActive() && state.match.pkCandidates.indexOf(player.id) !== -1) return false;
  return true;
}

function startVotingPhase() {
  clearStepTimer();
  voice.stop();
  state.activeSpeakerId = null;
  state.selectedSeatId = null;
  if (typeof stage3d !== "undefined") {
    if (typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
    if (stage3d.orbit) stage3d.orbit.userOverrideUntil = 0;
  }
  state.match.phase = "DAY_VOTE";
  const player = getPlayerSeat();

  if (!isPlayerEligibleToVote()) {
    const inPk = Boolean(player && player.alive && isPkVoteActive());
    const elderNoVote = Boolean(player && player.alive && player.voteDisabled);
    const ffVote = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
    updateAllUI();
    if (elderNoVote && typeof showToast === "function") {
      showToast("🛡️ 你身為已亮牌的清心長老，本輪不具投票權，由其餘夥伴計票！", "emerald");
    }
    if (!ffVote) {
      voice.speakHost(inPk
        ? "平票 PK 拉票結束，依凹嗚規則由非平票玩家進行決選投票！"
        : (elderNoVote
          ? "你身為已亮牌的清心長老失去投票權，本輪由其餘夥伴計票。"
          : "全員發言結束，開始計票。"));
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

function chooseAiVoteTarget(voter, opts) {
  const o = opts || {};
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(voter, { module: "day_vote" })
    : null;
  const self = (snap && snap.self) ? snap.self : voter;
  const pkActive = typeof o.pkActive === "boolean" ? o.pkActive : (snap ? snap.pkActive : isPkVoteActive());
  const pkCands = snap ? snap.pkCandidates : (state.match && state.match.pkCandidates);
  const alive = snap ? snap.aliveSeats : getAliveSeats();
  const pkPool = (pkActive && Array.isArray(pkCands))
    ? alive.filter(function (t) { return pkCands.indexOf(t.id) !== -1 && t.id !== self.id; })
    : null;
  const others = (pkPool && pkPool.length > 0) ? pkPool : alive.filter(function (t) { return t.id !== self.id; });
  const playerTargetId = o.playerTargetId || null;
  const pidVote = snap ? snap.playerSeatId : getPlayerId();
  let chosen = null;

  if (self.role === "wolf") {
    const nonWolves = others.filter(function (t) { return snap ? !t.isWolfMate : (t.role !== "wolf"); });
    const pool = nonWolves.length > 0 ? nonWolves : others;
    const dayEvs = snap ? snap.daySpeechEvents : (state.match.daySpeechEvents || []);
    const readSeat = snap ? snap.getSeat : getSeat;
    const playerWolfPush = (snap && snap.wolfTactic === "pack_push")
      ? dayEvs.find(function (ev) { return ev.speakerId === pidVote && ev.accuseId && ev.accuseId !== self.id; })
      : null;
    const wolfPushEv = playerWolfPush || dayEvs.find(function (ev) {
      const sp = readSeat(ev.speakerId);
      const spIsPack = sp && (sp.id === self.id || (snap ? sp.isWolfMate : sp.role === "wolf"));
      return spIsPack && ev.accuseId && ev.accuseId !== self.id;
    });
    const teamTargetId = wolfPushEv ? wolfPushEv.accuseId : null;
    pool.sort(function (a, b) {
      const sA = (a.id === teamTargetId ? 28 : 0) + (a.id === self.publicVoteIntent ? 30 : 0) + (a.id === self.publicVouchId ? -18 : 0) + (a.claimedRole === "seer" ? 22 : 0) + ((self.suspicionMap && self.suspicionMap[a.id]) || 50);
      const sB = (b.id === teamTargetId ? 28 : 0) + (b.id === self.publicVoteIntent ? 30 : 0) + (b.id === self.publicVouchId ? -18 : 0) + (b.claimedRole === "seer" ? 22 : 0) + ((self.suspicionMap && self.suspicionMap[b.id]) || 50);
      return sB - sA;
    });
    chosen = pool[0] ? pool[0].id : null;
  } else {
    // Zero-Leak Good Team Vote: Fact-Guard + Proven-Elder Guard + Speech-Vote Alignment + 4G Clues + 2-Seer Clash Focus (NEVER peeks a.team!)
    const rallyId = snap ? snap.convenienceRallyTargetId : (state.match.convenienceRallyTargetId || null);
    const joyIds = (snap && Array.isArray(snap.fourGJoySuspects)) ? snap.fourGJoySuspects : [];
    const hopePair = (snap && Array.isArray(snap.fourGHopePair) && snap.fourGHopePair.length === 2) ? snap.fourGHopePair : [];
    const selfInHopePair = hopePair.indexOf(self.id) !== -1;
    const harmonyNow = snap ? snap.harmonyScore : state.match.harmonyScore;
    const hazeChaos = (harmonyNow <= 45) ? 14 : 0;
    const seerClaimants = alive.filter(function (s) { return s.claimedRole === "seer"; });

    let candidatePool = others.slice();
    // Exclude publicly proven Good Elder (voteDisabled after elderShieldUsed) when other targets exist!
    const nonElderPool = candidatePool.filter(function (t) { return !t.voteDisabled; });
    if (nonElderPool.length > 0) candidatePool = nonElderPool;

    const verifiedWolfIds = (self.role === "seer" && self.checkedHistory)
      ? self.checkedHistory.filter(function (c) { return c.isWolf; }).map(function (c) { return c.targetId; })
      : [];
    const verifiedGoodIds = (self.role === "seer" && self.checkedHistory)
      ? self.checkedHistory.filter(function (c) { return !c.isWolf; }).map(function (c) { return c.targetId; })
      : [];
    if (self.role === "seer") {
      const safePool = candidatePool.filter(function (t) { return verifiedGoodIds.indexOf(t.id) === -1; });
      if (safePool.length > 0) candidatePool = safePool;
    } else if (self.role === "witch" && self.savedSeatId) {
      const safePool = candidatePool.filter(function (t) { return t.id !== self.savedSeatId; });
      if (safePool.length > 0) candidatePool = safePool;
    }

    const computeFourGClueDelta = function (t) {
      let d = 0;
      const inJoy = joyIds.indexOf(t.id) !== -1;
      const inHope = hopePair.indexOf(t.id) !== -1;
      if (inJoy) d += (typeof t.microPulse === "number" && t.microPulse >= 72) ? 10 : 5;
      if (inHope) {
        if (selfInHopePair && t.id !== self.id) d += 32;
        else d += 6;
      }
      if (inJoy && inHope) d += 14;
      return d;
    };

    const validPlayerTgt = Boolean(playerTargetId && candidatePool.some(function (t) { return t.id === playerTargetId; }));
    const ironSafe = Boolean(self.ironFollowPlayer && validPlayerTgt && playerTargetId !== self.id
      && (self.role !== "seer" || verifiedGoodIds.indexOf(playerTargetId) === -1)
      && (self.role !== "witch" || self.savedSeatId !== playerTargetId));
    if (ironSafe) {
      chosen = playerTargetId;
    } else if (self.role === "seer") {
      const aliveCheckedWolf = candidatePool.find(function (t) { return verifiedWolfIds.indexOf(t.id) !== -1; });
      const aliveFakeSeer = candidatePool.find(function (t) { return t.claimedRole === "seer" && t.id !== self.id; });
      if (aliveCheckedWolf) {
        chosen = aliveCheckedWolf.id;
      } else if (aliveFakeSeer) {
        chosen = aliveFakeSeer.id;
      } else {
        candidatePool.sort(function (a, b) {
          const pA = (self.publicVoteIntent === a.id ? 34 : 0) + (self.publicVouchId === a.id ? -22 : 0) + (rallyId === a.id ? 14 : 0) + computeFourGClueDelta(a) + ((self.suspicionMap && self.suspicionMap[a.id]) || 50);
          const pB = (self.publicVoteIntent === b.id ? 34 : 0) + (self.publicVouchId === b.id ? -22 : 0) + (rallyId === b.id ? 14 : 0) + computeFourGClueDelta(b) + ((self.suspicionMap && self.suspicionMap[b.id]) || 50);
          return pB - pA;
        });
        if (candidatePool[0] && ((self.publicVoteIntent === candidatePool[0].id) || (rallyId === candidatePool[0].id) || ((self.suspicionMap && self.suspicionMap[candidatePool[0].id]) || 50) >= 48)) {
          chosen = candidatePool[0].id;
        }
      }
    } else {
      const twoSeerFocus = (seerClaimants.length >= 2 && candidatePool.some(function (t) { return t.claimedRole === "seer"; }));
      const dayEvsVote = snap ? snap.daySpeechEvents : (state.match.daySpeechEvents || []);
      const voteProf = typeof getPersonaProfile === "function" ? getPersonaProfile(self) : null;
      const rallyWeight = voteProf ? Math.round(20 * (1 + voteProf.bandwagonBias * 0.45)) : 20;
      candidatePool.sort(function (a, b) {
        // Uniform low-harmony confusion jitter across ALL candidates (zero hidden team peeking!)
        const jA = hazeChaos ? Math.sin(self.id * 7 + a.id * 3) * hazeChaos : 0;
        const jB = hazeChaos ? Math.sin(self.id * 7 + b.id * 3) * hazeChaos : 0;
        const persA = typeof getPersonaVotePersonalityDelta === "function" ? getPersonaVotePersonalityDelta(self, a, { daySpeechEvents: dayEvsVote }) : 0;
        const persB = typeof getPersonaVotePersonalityDelta === "function" ? getPersonaVotePersonalityDelta(self, b, { daySpeechEvents: dayEvsVote }) : 0;
        const pA = (self.publicVoteIntent === a.id ? 38 : 0) + (self.publicVouchId === a.id ? -26 : 0) + (rallyId === a.id ? rallyWeight : 0) + computeFourGClueDelta(a) + (twoSeerFocus && a.claimedRole === "seer" ? 20 : 0) + ((self.suspicionMap && self.suspicionMap[a.id]) || 50) + persA + jA;
        const pB = (self.publicVoteIntent === b.id ? 38 : 0) + (self.publicVouchId === b.id ? -26 : 0) + (rallyId === b.id ? rallyWeight : 0) + computeFourGClueDelta(b) + (twoSeerFocus && b.claimedRole === "seer" ? 20 : 0) + ((self.suspicionMap && self.suspicionMap[b.id]) || 50) + persB + jB;
        return pB - pA;
      });
      if (candidatePool[0] && ((self.publicVoteIntent === candidatePool[0].id) || (rallyId === candidatePool[0].id) || ((self.suspicionMap && self.suspicionMap[candidatePool[0].id]) || 50) >= 48)) {
        chosen = candidatePool[0].id;
      }
    }
  }

  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("day_vote", self.id, chosen ? ("投 " + chosen + "號") : "棄票");
  }
  return chosen;
}

function finalizeVoteRound(playerTargetId) {
  clearStepTimer();
  sound.playVote();
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") {
    stage3d.clearCloseUp();
  }

  const alive = getAliveSeats();
  const pkActive = isPkVoteActive();
  const tallies = {};
  const ballots = [];

  // 凹嗚標準規則：平票 PK 決選時，PK 候選人本人不參與投票；清心長老發動過豁免後不參與投票
  const eligibleVoters = (pkActive
    ? alive.filter(function (v) { return state.match.pkCandidates.indexOf(v.id) === -1; })
    : alive).filter(function (v) { return !v.voteDisabled; });

  eligibleVoters.forEach(function (voter) {
    let chosen = null;
    if (voter.id === getPlayerId()) {
      chosen = (playerTargetId && isValidVoteTarget(playerTargetId)) ? playerTargetId : null;
    } else {
      chosen = chooseAiVoteTarget(voter, { pkActive: pkActive, playerTargetId: playerTargetId });
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

  const voteRecord = { day: state.match.day, ballots: ballots, tallies: Object.assign({}, tallies), outId: null };
  state.match.voteHistory.push(voteRecord);
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
      groupedVoters[b.targetId].push(fmtSeatNum(b.voterId));
    }
  });

  function commitVoteResolution() {
    if (maxVotes === 0 || topIds.length !== 1) {
      // Real 凹嗚狼人殺 Tie-Breaker PK! First tie triggers PK speech & re-vote ONLY if at least 1 non-PK voter can still vote!
      const nonPkEligibleCount = alive.filter(function (v) { return topIds.indexOf(v.id) === -1 && !v.voteDisabled; }).length;
      if (maxVotes > 0 && topIds.length >= 2 && nonPkEligibleCount > 0 && !state.match.pkUsedToday) {
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

    // 10/12人進階身分【清心長老】：首次被公投誤投時亮牌豁免離席，保留發言權但失去後續投票權！
    if (outSeat.isElder && !outSeat.elderShieldUsed) {
      outSeat.elderShieldUsed = true;
      outSeat.voteDisabled = true;
      outSeat.claimedRole = "elder";
      // Publicly proven Good Elder: immediately clear alive Good AIs' suspicion so they don't re-vote the Elder tomorrow!
      getAliveSeats().forEach(function (ai) {
        if (ai.id !== outSeat.id && ai.team === "good" && ai.suspicionMap) {
          ai.suspicionMap[outSeat.id] = 5;
        }
      });
      if (outSeat.id === getPlayerId() && state.match.stats) {
        state.match.stats.elderExempted = (state.match.stats.elderExempted || 0) + 1;
      }
      sound.playBlessing();
      spawnBurst(outSeat.id, ["#2dd4bf", "#fbbf24", "#ffffff"], 26, "star");
      spawnFx(outSeat.id, "🛡️ 清心長老豁免!", "#2dd4bf", { scale: 1.25, durationMs: 1800 });
      if (typeof setSeatEmotion === "function") setSeatEmotion(outSeat.id, "proud", 4200);
      if (typeof setSeatBubble === "function") setSeatBubble(outSeat.id, "慢著！我是清心長老，本輪免於離席！", "trust", 4200);
      triggerCutIn("🛡️ 清心長老亮牌豁免！", fmtSeatNum(outSeat.id) + "號 " + outSeat.name + " 亮出【清心長老】免於離席（保留發言權，失去投票權）！", "gold", 1800);
      addLog({
        kind: "blessing",
        title: "🛡️ 清心長老豁免：" + fmtSeatNum(outSeat.id) + "號 " + outSeat.name + " 亮牌免於離席！（" + ballotStr + shieldNote + "）",
        text: "自本輪起，清心長老失去公投投票權，但仍可留席發言協助好夥伴辨明是非。"
      });
      state.voteResultPayload = {
        headline: "🛡️ " + fmtSeatNum(outSeat.id) + "號 " + outSeat.name + " 亮牌【清心長老】免於離席！" + shieldNote,
        tallies: tallies,
        groupedVoters: groupedVoters,
        outId: null,
        maxVotes: Math.max(1, maxVotes),
        onContinue: beginNightPhase
      };
      state.match.phase = "DAY_VOTE_RESULT";
      updateAllUI();
      const ffEld = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
      if (!ffEld) voice.speakHost(outSeat.id + "號" + outSeat.name + "亮出清心長老身分免於離席！請點擊進入夜晚。");
      if (state.autoPlay || ffEld) {
        state.stepTimer = setTimeout(beginNightPhase, ffEld ? 600 : 4000);
      }
      return;
    }

    outSeat.alive = false;
    outSeat.outReason = "投票出局";
    voteRecord.outId = outSeat.id;
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
      const aliveWolvesAfterOut = getAliveSeats().filter(function (s) { return s.team === "wolf"; }).length;
      const canWkShot = Boolean(outSeat.isWolfKing && aliveWolvesAfterOut > 0);
      if (outSeat.role === "hunter" || canWkShot) {
        state.match.pendingVotedHunterId = outSeat.id;
        voice.speakHost(canWkShot
          ? (outSeat.id + "號" + outSeat.name + "身為流言首領，臨走前發動最後帶風向反撲！")
          : (outSeat.id + "號" + outSeat.name + "最高票離席，觸發直心糾察長正氣共鳴！"));
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
            headline: fmtSeatNum(outSeat.id) + "號 " + outSeat.name + " 最高票離席休息" + shieldNote,
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
      applyLastWordsInfluence(outSeat, aiLw.text, Object.assign({}, aiLw, { mode: "vote_out" }));
      addLog({
        kind: "system",
        title: "💬 " + fmtSeatNum(outSeat.id) + "號 " + outSeat.name + "（公投遺言）",
        text: aiLw.text
      });
      const lastWord = "「" + aiLw.text + "」";

      state.voteResultPayload = {
        headline: fmtSeatNum(outSeat.id) + "號 " + outSeat.name + " 最高票離席休息" + shieldNote,
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
        if (fTxt) fTxt.textContent = "開票 (" + (idx + 1) + "/" + ballots.length + ")：" + fmtSeatNum(b.voterId) + " " + vName + " → 投給 " + fmtSeatNum(b.targetId) + " " + tName + "（累計 " + cnt + " 票）";
      } else {
        spawnFx(b.voterId, "棄票", "#94a3b8");
        sound.tone(320, 0.06, "sine", 0.035, 0);
        if (fTxt) fTxt.textContent = "開票 (" + (idx + 1) + "/" + ballots.length + ")：" + fmtSeatNum(b.voterId) + " " + vName + " 棄票";
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
  "晨晨": "夠義氣！收到你的給信心護盾，這輪一定陪你把可疑人選查個水落石出！",
  "墨白": "承你一分信，還你十分明。這輪我會替你看緊 {t} 的每句破綻。",
  "晴嵐": "這盞信任護盾收下了，風再急我也不會亂了立場，會特別留意 {t}。",
  "阿朗": "多謝相挺！邏輯站得住腳就不怕風向，這輪我們盯緊 {t} 吧！",
  "柚子": "哇謝謝你給我信心護盾！我一定鼓起勇氣把 {t} 的破綻看清楚！"
};

const PERSONA_LAUGH_LINES = {
  "小澄": "哈哈，連數據控都忍不住笑出來，氣氛輕鬆多囉！",
  "暖暖": "哈哈哈這杯歡喜茶我乾了！大家開心推理別傷和氣～",
  "阿松": "呵呵，難得茶席上這麼有朝氣，比爬林美山還舒暢！",
  "星兒": "噗哈哈太鬧了吧！誰剛剛邊笑邊偷瞄旁邊啊？",
  "小雲": "哼笑一下也是好的，心理防線鬆動才好辨別真假～",
  "阿竹": "呵呵…笑聲裡自見真性情，這一局越來越有趣了。",
  "晨晨": "哈哈哈哈超讚！氣氛熱起來就對了！",
  "墨白": "呵呵，一笑解千愁，倒也看清了幾張不自在的臉。",
  "晴嵐": "噗嗤，茶席有笑聲才像書院嘛，大家輕鬆聊！",
  "阿朗": "哈哈好梗！剛才緊繃的辯論氣氛瞬間化開了！",
  "柚子": "哈哈哈好好笑喔～可是我怎麼覺得旁邊有人笑得很僵呀？"
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
    showToast("四給雙倍共鳴：清茗輕敲茶盤，全場額外恢復 +10 友善度。", "emerald");
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
    triggerCutIn("茶席連心・三好充能", "連續施展四給茶禮，友善度提升並點亮一瓣三好蓮心", "tea");
    addLog({ kind: "blessing", title: "四給連心：善用雙重四給茶禮，友善度 +8 並額外點亮 1 瓣三好蓮花。", text: "" });
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

function animateFourGCardCast(btnId) {
  const isBrowser = typeof window !== "undefined" && typeof window.matchMedia === "function";
  if (!isBrowser) return;
  const btn = el(btnId);
  if (!btn || !btn.classList) return;
  btn.classList.add("is-fourg-casting");
  setTimeout(function () {
    if (btn && btn.classList) btn.classList.remove("is-fourg-casting");
  }, 520);
}

function useFourGConfidence() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.confidence) return;
  const target = getSeat(state.selectedSeatId);
  if (!target || !target.alive || target.id === getPlayerId()) {
    showToast("先點圓桌選 1 位夥伴，再按【給信心】！", "warn");
    return;
  }
  animateFourGCardCast("btn4GConfidence");
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
  triggerCutIn("奉茶護席・給信心", "推盞予 " + fmtSeatNum(target.id) + "號 " + target.name + "，本輪公投少計 1 票", "tea");
  spawnFx(target.id, "奉茶護席", "#34d399");
  bumpCombo("四給・給信心");

  const others = getAliveSeats().filter(function (s) { return s.id !== target.id; });
  others.sort(function (a, b) { return (target.suspicionMap[b.id] || 50) - (target.suspicionMap[a.id] || 50); });
  const topSus = others[0];
  const topLbl = topSus ? (fmtSeatNum(topSus.id) + "號") : "可疑者";
  const replyTpl = PERSONA_CONFIDENCE_LINES[target.name] || ("謝謝你的信任！這輪我也會特別留意 " + topLbl + "！");
  setCanvasBubble(target.id, replyTpl.replace(/\{t\}/g, topLbl), "trust");

  addLog({
    kind: "blessing",
    title: "奉茶護席（給信心）：推盞予 " + fmtSeatNum(target.id) + "號本輪少計 1 票，對方回應目前留意 " + (topSus ? (fmtSeatNum(topSus.id) + "號") : "未知"),
    text: ""
  });
  triggerFourGSynergyCheck("confidence");
  if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
  updateAllUI();
}

function useFourGJoy() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.joy) return;
  animateFourGCardCast("btn4GJoy");
  state.match.fourGivingsUsed.joy = true;
  state.match.stats.fourGCount += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 16, 0, 100);
  if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  addThreeGoodPoint("words", "說好話・給歡喜");
  sound.playBlessing();
  const joyJoke = FOURG_JOY_JOKES[((state.match.day || 1) + (state.match.stats.fourGCount || 0)) % FOURG_JOY_JOKES.length];
  setSeatBubble(getPlayerId(), "「" + joyJoke + "」", "trust", 4200);
  triggerCutIn("溫言破冰・給歡喜", joyJoke, "tea");

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
      spawnFx(s.id, "神色微僵", "#fb7185");
      spawnBurst(s.id, ["#fb7185", "#fbbf24"], 14, "spark");
      setSeatBubble(s.id, awkwardLines[nervousIds.indexOf(s.id) % awkwardLines.length], "suspect", 4600);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", getPlayerId(), s.id, false);
      }
    } else {
      setSeatEmotion(s.id, "laugh", 4200);
      spawnFx(s.id, "莞爾一笑", "#6ee7b7");
      spawnBurst(s.id, ["#6ee7b7", "#fde68a"], 10, "petal");
      setSeatBubble(s.id, PERSONA_LAUGH_LINES[s.name] || "哈哈氣氛輕鬆多了，大家開心推理！", "trust", 3400);
    }
  });

  const sortedNervous = nervousIds.slice().sort(function (a, b) { return a - b; });
  state.match.fourGJoySuspects = sortedNervous.slice();
  const pairLabels = sortedNervous.map(function (id) {
    const st = getSeat(id);
    return fmtSeatNum(id) + "號" + (st ? (" " + st.name) : "");
  });
  const clueMsg = pairLabels.length >= 2
    ? ("溫言破冰（給歡喜）：" + pairLabels.join(" 與 ") + " 神色略顯僵硬，其中必藏酸民狼（點擊可細看脈搏）")
    : (pairLabels.length === 1
      ? ("溫言破冰（給歡喜）：唯有 " + pairLabels[0] + " 神色微僵（緊張度 " + getSeat(sortedNervous[0]).microPulse + "%）")
      : "溫言破冰（給歡喜）：茶席笑語讓氣氛大幅回溫");
  addLog({ kind: "blessing", title: clueMsg, text: "" });
  showToast(pairLabels.length >= 2
    ? ("溫言試探：" + sortedNervous.map(function (id) { return fmtSeatNum(id) + "號"; }).join(" 與 ") + " 同時神色僵硬，可搭配「給希望」交會比對。")
    : (pairLabels.length === 1 ? ("留意茶席：" + pairLabels[0] + " 笑意僵硬，似有心虛。") : "茶席笑聲驅散了緊繃氣氛。"), "emerald");
  triggerFourGSynergyCheck("joy");
  if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
  updateAllUI();
}

function useFourGHope() {
  sound.unlock();
  if (!canUseFourGNow() || state.match.fourGivingsUsed.hope) return;
  animateFourGCardCast("btn4GHope");
  state.match.fourGivingsUsed.hope = true;
  state.match.stats.fourGCount += 1;
  state.match.harmonyScore = clamp(state.match.harmonyScore + 10, 0, 100);
  if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
  addThreeGoodPoint("heart", "存好心・給希望");
  sound.playBlessing();

  const aliveWolves = getAliveSeats().filter(function (s) { return s.role === "wolf" && s.id !== getPlayerId(); });
  const aliveGood = getAliveSeats().filter(function (s) { return s.role !== "wolf" && s.id !== getPlayerId(); });
  const pHope = getPlayerSeat();

  let msg = "給希望線索：酸民狼已快現形！";
  if (pHope && pHope.role === "wolf" && aliveWolves.length === 0) {
    // Solo surviving Wolf: meaningful stealth benefit instead of wasting the card!
    pHope.microPulse = Math.max(20, (pHope.microPulse || 70) - 18);
    aliveGood.forEach(function (g) {
      g.suspicionMap[getPlayerId()] = clamp((g.suspicionMap[getPlayerId()] || 50) - 10, 5, 95);
    });
    spawnBurst(getPlayerId(), ["#38bdf8", "#fde68a", "#ffffff"], 18, "petal");
    spawnFx(getPlayerId(), "定神穩心", "#38bdf8");
    triggerCutIn("明燈定心・給希望", "以沉穩氣度化解席間緊繃，眾人對你的戒心隨之平息", "tea");
    msg = "明燈定心（獨狼偽裝）：以善意穩住茶席氣氛，心虛值降低且眾人戒心下降。";
  } else if (aliveWolves.length > 0 && aliveGood.length > 0) {
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
    spawnBurst(pair[0].id, ["#38bdf8", "#fde68a", "#ffffff"], 14, "star");
    spawnBurst(pair[1].id, ["#38bdf8", "#fde68a", "#ffffff"], 14, "star");
    setSeatEmotion(pair[0].id, "shock", 2600);
    setSeatEmotion(pair[1].id, "shock", 2600);
    spawnFx(pair[0].id, "明燈映照", "#38bdf8");
    spawnFx(pair[1].id, "明燈映照", "#38bdf8");
    triggerCutIn("明燈指津・給希望", "微光映照：" + fmtSeatNum(pair[0].id) + "號 與 " + fmtSeatNum(pair[1].id) + "號 必藏一狼", "tea");
    msg = "茶席雙光鎖定：【" + pair[0].id + "號】與【" + pair[1].id + "號】其中必藏酸民狼。";

    const joyList = Array.isArray(state.match.fourGJoySuspects) ? state.match.fourGJoySuspects : [];
    const overlapSeats = pair.filter(function (ps) { return joyList.indexOf(ps.id) !== -1; });
    if (overlapSeats.length === 1) {
      const ov = overlapSeats[0];
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 6, 0, 100);
      if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
      bumpCombo("四給雙光交會");
      spawnFx(ov.id, "雙光交會", "#fbbf24");
      triggerCutIn("歡喜 × 希望・雙光交會", fmtSeatNum(ov.id) + "號 " + ov.name + " 同時落在破冰僵硬與明燈映照之中", "tea");
      addLog({ kind: "blessing", title: "歡喜×希望雙光交會：" + fmtSeatNum(ov.id) + "號 " + ov.name + " 同時重疊兩項茶席線索。", text: "" });
    }
  }
  addLog({ kind: "blessing", title: msg, text: "" });
  showToast(msg, "emerald");
  triggerFourGSynergyCheck("hope");
  if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
  updateAllUI();
}

function useFourGConvenience() {
  sound.unlock();
  if (!state.match.started) return;
  if (!state.match.fourGivingsUsed.convenience && canUseFourGNow()) {
    animateFourGCardCast("btn4GConvenience");
    state.match.fourGivingsUsed.convenience = true;
    state.match.stats.fourGCount += 1;
    state.match.harmonyScore = clamp(state.match.harmonyScore + 8, 0, 100);
    if (typeof orchestrator !== "undefined") orchestrator.emit("harmony:changed", { score: state.match.harmonyScore });
    state.showRelationsOnCanvas = true;
    addThreeGoodPoint("deeds", "做好事・給方便歸票");
    sound.playBlessing();

    const claims = state.match.seats.filter(function (s) { return s.alive && s.claimedRole && ROLE_DEFS[s.claimedRole]; })
      .map(function (s) { return fmtSeatNum(s.id) + "號跳" + ROLE_DEFS[s.claimedRole].name; });
    const vw = typeof computeTableWindVane === "function" ? computeTableWindVane() : null;
    const digestText = "跳牌：" + (claims.length ? claims.join("、") : "尚無") + (vw && vw.summaryText ? ("｜" + vw.summaryText) : "");

    // Rally undecided Good AIs toward your selected target OR highlight the sharpest contradiction!
    const sel = getSeat(state.selectedSeatId);
    const hasRallyTarget = Boolean(sel && sel.alive && sel.id !== getPlayerId());
    if (hasRallyTarget) {
      state.match.convenienceRallyTargetId = sel.id;
      getAliveSeats().forEach(function (ai) {
        if (ai.id !== getPlayerId() && ai.id !== sel.id && ai.team === "good") {
          const seerKnownGood = ai.role === "seer" && (ai.checkedHistory || []).some(function (c) { return c.targetId === sel.id && !c.isWolf; });
          const witchKnownGood = ai.role === "witch" && ai.savedSeatId === sel.id;
          if (!seerKnownGood && !witchKnownGood && !sel.voteDisabled) {
            ai.suspicionMap[sel.id] = clamp((ai.suspicionMap[sel.id] || 50) + 16, 5, 96);
          }
        }
      });
      spawnBeam(getPlayerId(), sel.id, "#c084fc", "vote", 720);
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.triggerSkillFx("seer_scan", getPlayerId(), sel.id, false);
      }
      triggerCutIn("溫言緩議・給方便", "理清席間關係線，請搖擺茶友集中覆議 " + fmtSeatNum(sel.id) + "號 " + sel.name, "tea");
      addLog({
        kind: "blessing",
        title: "溫言緩議（給方便）：已理清關係線並號召集中覆議 " + fmtSeatNum(sel.id) + "號 " + sel.name + "（" + digestText + "）",
        text: ""
      });
      showToast("已理清關係線並號召好人集中覆議 " + fmtSeatNum(sel.id) + "號（" + digestText + "）", "emerald");
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
        spawnFx(hs.id, "焦點覆議", "#c084fc");
        if (typeof stage3d !== "undefined" && stage3d.isActive()) {
          stage3d.triggerSkillFx("seer_scan", getPlayerId(), hs.id, false);
        }
      }
      triggerCutIn("溫言緩議・給方便", hs ? ("已標記全場焦點 " + fmtSeatNum(hs.id) + "號 " + hs.name + " 並展開關係線") : "已展開全場關係連線與局勢摘要", "tea");
      addLog({
        kind: "blessing",
        title: "溫言緩議（給方便）：" + (hs ? ("焦點 " + fmtSeatNum(hs.id) + "號" + hs.name + "｜") : "") + digestText,
        text: ""
      });
      showToast(digestText + "（下次先點選目標再施展「給方便」即可直接歸票覆議）", "emerald");
    }
    triggerFourGSynergyCheck("convenience");
    if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
    updateAllUI();
    return;
  }
  state.showRelationsOnCanvas = true;
  openVoteSheetModal();
  updateAllUI();
}

// ==================== AUTHENTIC BADGE FLOW ENGINE (警徽流核心引擎) ====================
function getSeatFlowLabel(seatId) {
  if (!seatId) return "";
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
  const s = getSeat(seatId);
  if (!s) return fmtSeatNum(seatId) + "號";
  return fmtSeatNum(s.id) + "號" + (s.id === pid ? "你" : s.name);
}

function formatBadgeFlowSummary(flow) {
  if (!flow || !flow.firstTargetId) return "";
  const fLbl = getSeatFlowLabel(flow.firstTargetId);
  if (flow.secondTargetId && flow.secondTargetId !== flow.firstTargetId) {
    return "先 " + fLbl + " → 後 " + getSeatFlowLabel(flow.secondTargetId);
  }
  return "鎖定 " + fLbl;
}

function setSheriffBadgeFlow(ownerId, firstTargetId, secondTargetId, sourceTag) {
  const m = state.match;
  if (!m || !ownerId) return null;
  if (!m.sheriffBadgeFlowsBySeat || typeof m.sheriffBadgeFlowsBySeat !== "object") {
    m.sheriffBadgeFlowsBySeat = {};
  }
  const fId = parseInt(firstTargetId, 10) || null;
  let sId = parseInt(secondTargetId, 10) || null;
  const fSeat = fId ? getSeat(fId) : null;
  const sSeat = sId ? getSeat(sId) : null;
  const validFirst = (fSeat && fSeat.alive && fSeat.id !== ownerId) ? fSeat.id : null;
  const validSecond = (sSeat && sSeat.alive && sSeat.id !== ownerId && sSeat.id !== validFirst) ? sSeat.id : null;
  if (!validFirst) {
    if (sourceTag === "clear") {
      delete m.sheriffBadgeFlowsBySeat[ownerId];
      if (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === ownerId) {
        m.sheriffBadgeFlow = null;
      }
    }
    return null;
  }
  const ownerSeat = getSeat(ownerId);
  const flow = {
    ownerId: ownerId,
    dayDeclared: m.day || 1,
    firstTargetId: validFirst,
    secondTargetId: validSecond,
    mode: validSecond ? "dual" : "single",
    claimedRole: ownerSeat ? (ownerSeat.claimedRole || null) : null,
    updatedFrom: sourceTag || "speech"
  };
  m.sheriffBadgeFlowsBySeat[ownerId] = flow;
  if (m.sheriffSeatId === ownerId && !m.sheriffElectionPending) {
    m.sheriffBadgeFlow = flow;
  }
  if ((sourceTag === "speech" || sourceTag === "panel" || sourceTag === "clear") && typeof bumpTableStateRev === "function") {
    bumpTableStateRev(false);
  }
  return flow;
}

function parseBadgeFlowFromText(rawText, ownerId) {
  const text = String(rawText || "");
  if (!text) return null;
  const maxSeats = (state.match && state.match.totalSeats) ? state.match.totalSeats : 12;
  // Prefer substring after explicit badge-flow / next-check cue so night-1 check target isn't mistaken as flow!
  const cueIdx = text.search(/警徽流|警徽先|先驗|今晚驗|今晚先驗|今晚查|今晚優先|優先查|優先驗|改留/);
  if (cueIdx === -1) return null;
  const tail = text.slice(cueIdx);
  const seatIds = typeof extractSeatIdsFromText === "function"
    ? extractSeatIdsFromText(tail, maxSeats)
    : (tail.match(/(?:1[0-2]|0?[1-9])\s*號/g) || []).map(function (tok) { return parseInt(tok, 10); });
  const picked = [];
  seatIds.forEach(function (n) {
    if (n >= 1 && n <= maxSeats && n !== ownerId && picked.indexOf(n) === -1) {
      const s = getSeat(n);
      if (s && s.alive) picked.push(n);
    }
  });
  if (picked.length === 0) return null;
  return { firstTargetId: picked[0], secondTargetId: picked[1] || null };
}

function decodeSheriffBadgeFlowSignal(deadSheriff, transferTargetId, flow) {
  if (!deadSheriff || !flow || !flow.firstTargetId) return null;
  const m = state.match || {};
  const ownerLbl = getSeatFlowLabel(deadSheriff.id);
  const firstId = flow.firstTargetId;
  const secondId = (flow.secondTargetId && flow.secondTargetId !== firstId) ? flow.secondTargetId : null;
  const firstSeat = getSeat(firstId);
  const secondSeat = secondId ? getSeat(secondId) : null;
  const firstAlive = Boolean(firstSeat && firstSeat.alive);
  const secondAlive = Boolean(secondSeat && secondSeat.alive);
  const firstLbl = getSeatFlowLabel(firstId);
  const secondLbl = secondId ? getSeatFlowLabel(secondId) : "";
  const flowBracket = "【" + formatBadgeFlowSummary(flow) + "】";

  let kind = "external_transfer";
  const verifiedGoodIds = [];
  const suspectedWolfIds = [];
  let headline = "";
  let detail = "";

  if (transferTargetId && transferTargetId === firstId) {
    kind = "first_good";
    if (firstAlive) verifiedGoodIds.push(firstId);
    headline = "👑 警徽流解讀：" + firstLbl + " 獲金水認證！";
    detail = ownerLbl + " 離席前留警徽流" + flowBracket + "，倒牌後直接將警徽飛給 " + firstLbl + " ⇒ 全場解讀：" + firstLbl + " 驗出偏金水好人！";
  } else if (transferTargetId && secondId && transferTargetId === secondId) {
    if (firstAlive) {
      kind = "first_wolf_second_good";
      if (secondAlive) verifiedGoodIds.push(secondId);
      suspectedWolfIds.push(firstId);
      headline = "⚡ 雙警徽流暗號：" + firstLbl + " 疑查殺、" + secondLbl + " 獲金水！";
      detail = ownerLbl + " 留雙警徽流" + flowBracket + "，倒牌後跳過 " + firstLbl + " 將警徽飛給 " + secondLbl + " ⇒ 全場解讀：" + firstLbl + " 查殺嫌疑大增、" + secondLbl + " 偏金水接棒！";
    } else {
      kind = "first_good";
      if (secondAlive) verifiedGoodIds.push(secondId);
      headline = "👑 警徽流備案：" + secondLbl + " 獲金水接棒！";
      detail = ownerLbl + " 原第一警徽流 " + firstLbl + " 已離席，倒牌後依序將警徽飛給第二警徽流 " + secondLbl + " ⇒ 全場解讀：" + secondLbl + " 偏金水好人！";
    }
  } else if (!transferTargetId) {
    kind = "torn_wolf";
    if (firstAlive) suspectedWolfIds.push(firstId);
    else if (secondAlive) suspectedWolfIds.push(secondId);
    const focusLbl = firstAlive ? firstLbl : (secondAlive ? secondLbl : firstLbl);
    headline = "💥 撕警徽流暗號：" + focusLbl + " 高度疑為查殺狼坑！";
    detail = ownerLbl + " 留警徽流" + flowBracket + "後當場撕毀警徽 ⇒ 全場解讀：昨夜查驗 " + focusLbl + " 踩到酸民狼，寧願撕徽也不讓 1.5 票落入狼手！";
  } else {
    kind = "external_transfer";
    const heirLbl = getSeatFlowLabel(transferTargetId);
    const heirSeat = getSeat(transferTargetId);
    if (heirSeat && heirSeat.alive) verifiedGoodIds.push(transferTargetId);
    if (firstAlive) suspectedWolfIds.push(firstId);
    headline = "🧭 警徽外飛暗號：" + heirLbl + " 託付接棒、" + (firstAlive ? (firstLbl + " 疑踩查殺！") : "延續好人視角！");
    detail = ownerLbl + " 原留警徽流" + flowBracket + "，離席時改飛外置位 " + heirLbl + " ⇒ 全場解讀：" + heirLbl + " 較獲信任" + (firstAlive ? ("，原警徽流首選 " + firstLbl + " 未獲徽疑為查殺！") : "！");
  }

  return {
    day: m.day || 1,
    ownerId: deadSheriff.id,
    transferTargetId: transferTargetId || null,
    firstTargetId: firstId,
    secondTargetId: secondId,
    kind: kind,
    verifiedGoodIds: verifiedGoodIds,
    suspectedWolfIds: suspectedWolfIds,
    headline: headline,
    detail: detail
  };
}

function recordAndBroadcastBadgeFlowSignal(deadSheriff, heirSeat) {
  const m = state.match;
  if (!m || !deadSheriff) return null;
  const activeFlow = (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === deadSheriff.id)
    ? m.sheriffBadgeFlow
    : ((m.sheriffBadgeFlowsBySeat && m.sheriffBadgeFlowsBySeat[deadSheriff.id]) || null);

  // Outgoing Sheriff's flow has now resolved — clear active flow until new Sheriff declares one
  if (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === deadSheriff.id) {
    m.sheriffBadgeFlow = null;
  }
  if (!activeFlow || !activeFlow.firstTargetId) return null;

  // Temporal & Role authenticity: only decode as a night-check Badge Flow signal if deadSheriff publicly claimed Seer
  // AND at least 1 night passed since declaration (or deadSheriff actually checked firstTargetId). Never leak an unclaimed Seer!
  const isSeerClaimOrRole = Boolean(deadSheriff.claimedRole === "seer");
  if (!isSeerClaimOrRole) return null;
  const hasElapsedNight = (m.day || 1) > (activeFlow.dayDeclared || 1);
  const deadCheckedFirst = Boolean(
    Array.isArray(deadSheriff.checkedHistory) &&
    deadSheriff.checkedHistory.some(function (c) { return c && c.targetId === activeFlow.firstTargetId; })
  );
  if (!hasElapsedNight && !deadCheckedFirst) return null;

  const sig = decodeSheriffBadgeFlowSignal(deadSheriff, heirSeat ? heirSeat.id : null, activeFlow);
  if (!sig) return null;
  if (!Array.isArray(m.badgeFlowSignals)) m.badgeFlowSignals = [];
  m.badgeFlowSignals.push(sig);

  // Strictly Blind-View-Safe AI suspicion update: each Good AI weighs the signal ONLY by its own trust in deadSheriff!
  const pid = getPlayerId();
  getAliveSeats().forEach(function (ai) {
    if (ai.id === pid || ai.team !== "good" || !ai.suspicionMap) return;
    const ownerSus = ai.suspicionMap[deadSheriff.id] || 50;
    if (ownerSus >= 68) return; // AI already doubted deadSheriff (e.g. suspected fake Seer) — does not blindly obey!
    const trustScale = ownerSus <= 40 ? 1.15 : (ai.deductionStyle === "skeptical" ? 0.72 : 1.0);
    sig.verifiedGoodIds.forEach(function (gid) {
      if (gid === ai.id) return;
      const checkedWolf = (ai.role === "seer") && (ai.checkedHistory || []).some(function (c) { return c.targetId === gid && c.isWolf; });
      if (!checkedWolf) {
        ai.suspicionMap[gid] = clamp((ai.suspicionMap[gid] || 50) - Math.round(15 * trustScale), 5, 96);
      }
    });
    sig.suspectedWolfIds.forEach(function (wid) {
      if (wid === ai.id) return;
      const checkedGood = (ai.role === "seer") && (ai.checkedHistory || []).some(function (c) { return c.targetId === wid && !c.isWolf; });
      const witchSaved = (ai.role === "witch" && ai.savedSeatId === wid);
      if (!checkedGood && !witchSaved) {
        ai.suspicionMap[wid] = clamp((ai.suspicionMap[wid] || 50) + Math.round(18 * trustScale), 5, 96);
      }
    });
  });

  sig.verifiedGoodIds.forEach(function (gid) {
    if (typeof spawnFx === "function") spawnFx(gid, "👑 警徽流金水!", "#34d399", { durationMs: 1850 });
  });
  sig.suspectedWolfIds.forEach(function (wid) {
    if (typeof spawnFx === "function") spawnFx(wid, "⚡ 警徽流查殺疑雲!", "#f43f5e", { durationMs: 1850 });
    if (typeof spawnBeam === "function") spawnBeam(deadSheriff.id, wid, "#f43f5e", "clash", 900);
  });

  triggerCutIn(sig.headline, sig.detail, sig.suspectedWolfIds.length > 0 ? "crimson" : "gold", 2100);
  addLog({
    kind: "blessing",
    title: sig.headline,
    text: sig.detail
  });
  return sig;
}

function chooseAiSheriffTransferTarget(deadSheriff) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(deadSheriff, { module: "sheriff_transfer" })
    : null;
  const self = (snap && snap.self) ? snap.self : deadSheriff;
  const alivePool = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== deadSheriff.id; });
  if (!alivePool.length) return null;

  const findAlive = function (id) {
    return id ? (alivePool.find(function (s) { return s.id === id; }) || null) : null;
  };
  const flow = (snap && snap.sheriffBadgeFlow && snap.sheriffBadgeFlow.ownerId === self.id)
    ? snap.sheriffBadgeFlow
    : ((snap && snap.sheriffBadgeFlowsBySeat && snap.sheriffBadgeFlowsBySeat[self.id]) || null);

  let pick = null;
  let decisionReason = "";

  // 1. True Seer Sheriff: authentically execute declared single/dual Badge Flow code!
  if (self.role === "seer") {
    const chks = Array.isArray(self.checkedHistory) ? self.checkedHistory : [];
    const getChk = function (tid) {
      return chks.slice().reverse().find(function (c) { return c && c.targetId === tid; }) || null;
    };
    const aliveVerifiedGood = chks.slice().reverse()
      .filter(function (c) { return c && !c.isWolf; })
      .map(function (c) { return findAlive(c.targetId); })
      .find(Boolean) || null;

    if (flow && flow.firstTargetId) {
      const fSeat = findAlive(flow.firstTargetId);
      const sSeat = findAlive(flow.secondTargetId);
      const fChk = getChk(flow.firstTargetId);
      const sChk = flow.secondTargetId ? getChk(flow.secondTargetId) : null;
      if (fSeat && fChk && !fChk.isWolf) {
        pick = fSeat;
        decisionReason = "警徽流金水飛徽 " + fSeat.id + "號";
      } else if (fChk && fChk.isWolf) {
        // First badge-flow target was checked WOLF! Fly to verified 2nd gold, external gold, or TEAR!
        if (sSeat && sChk && !sChk.isWolf) {
          pick = sSeat;
          decisionReason = "雙警徽流跳飛金水 " + sSeat.id + "號";
        } else if (aliveVerifiedGood && aliveVerifiedGood.id !== flow.firstTargetId) {
          pick = aliveVerifiedGood;
          decisionReason = "警徽外飛金水 " + aliveVerifiedGood.id + "號（首選查殺）";
        } else {
          pick = null;
          decisionReason = "撕毀警徽報 " + flow.firstTargetId + "號查殺";
        }
      } else if (sSeat && sChk && !sChk.isWolf) {
        pick = sSeat;
        decisionReason = "備案警徽流飛徽 " + sSeat.id + "號";
      } else if (aliveVerifiedGood) {
        pick = aliveVerifiedGood;
        decisionReason = "移交已驗金水 " + aliveVerifiedGood.id + "號";
      }
    } else if (aliveVerifiedGood) {
      pick = aliveVerifiedGood;
      decisionReason = "移交已驗金水 " + aliveVerifiedGood.id + "號";
    }
    if (decisionReason) {
      if (typeof antiCheatMonitor !== "undefined" && self) {
        antiCheatMonitor.recordDecision("sheriff_transfer", self.id, decisionReason);
      }
      return pick ? pick.id : null;
    }
  }

  // 2. Wolf Sheriff: keep 1.5 votes in Wolf hands (preferring Wolf mate in badge flow for fake-gold cover!), or tear if last wolf!
  if (self.role === "wolf") {
    const wolfMates = alivePool.filter(function (s) { return snap ? s.isWolfMate : (s.role === "wolf"); });
    if (flow && flow.firstTargetId) {
      pick = wolfMates.find(function (s) { return s.id === flow.firstTargetId; }) || null;
    }
    if (!pick && flow && flow.secondTargetId) {
      pick = wolfMates.find(function (s) { return s.id === flow.secondTargetId; }) || null;
    }
    if (!pick && wolfMates.length > 0) {
      pick = wolfMates[0];
    }
    if (typeof antiCheatMonitor !== "undefined" && self) {
      antiCheatMonitor.recordDecision("sheriff_transfer", self.id, pick ? ("移交同伴 " + pick.id + "號") : "撕毀警徽");
    }
    return pick ? pick.id : null;
  }

  // 3. Good non-Seer Sheriff: prefer Witch's silver water, then lowest-suspicion seat (< 58), else tear
  if (self.role === "witch" && self.savedSeatId) {
    pick = findAlive(self.savedSeatId);
  }
  if (!pick) {
    const trusted = alivePool.slice().sort(function (a, b) {
      return ((self.suspicionMap && self.suspicionMap[a.id]) || 50) - ((self.suspicionMap && self.suspicionMap[b.id]) || 50);
    });
    if (trusted[0] && ((self.suspicionMap && self.suspicionMap[trusted[0].id]) || 50) < 58) {
      pick = trusted[0];
    }
  }
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("sheriff_transfer", self.id, pick ? ("移交 " + pick.id + "號") : "撕毀警徽");
  }
  return pick ? pick.id : null;
}

// ==================== SHERIFF BADGE TRANSFER & RALLY CALL ====================
function handleSheriffEliminated(deadSheriff, onDone) {
  const doneCb = typeof onDone === "function" ? onDone : function () { };
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
    const pickId = chooseAiSheriffTransferTarget(deadSheriff);
    const pick = pickId ? getSeat(pickId) : null;
    state.match.sheriffSeatId = pick ? pick.id : null;
    if (pick) {
      spawnBeam(deadSheriff.id, pick.id, "#fbbf24", "trust", 900);
      spawnFx(pick.id, "👑 接棒警徽!", "#fbbf24");
      triggerCutIn("👑 警徽移交！", fmtSeatNum(deadSheriff.id) + "號警長將 1.5 票警徽交予 " + fmtSeatNum(pick.id) + "號 " + (pick.id === getPlayerId() ? "你" : pick.name) + "！", "gold");
      addLog({ kind: "blessing", title: "👑 警徽傳承：" + fmtSeatNum(deadSheriff.id) + "號將警徽移交給 " + fmtSeatNum(pick.id) + "號 " + (pick.id === getPlayerId() ? "你" : pick.name) + "（擁有 1.5 票歸票權）！", text: "" });
    } else {
      triggerCutIn("💥 警徽撕毀！", fmtSeatNum(deadSheriff.id) + "號警長選擇當場撕毀警徽，本局不設警長。", "crimson");
      addLog({ kind: "dawn", title: "💥 警徽作廢：" + fmtSeatNum(deadSheriff.id) + "號離席並撕毀警徽！", text: "" });
    }
    recordAndBroadcastBadgeFlowSignal(deadSheriff, pick);
    updateAllUI();
    doneCb();
    return;
  }

  // Player is the outgoing Sheriff: pause cleanly on SHERIFF_TRANSFER panel!
  state.match.pendingSheriffTransfer = { deadId: deadSheriff.id, onDone: doneCb };
  state.match.phase = "SHERIFF_TRANSFER";
  updateAllUI();
  voice.speakHost("你是本局警長，離席前請依你的警徽流決定將警徽移交給哪一位存活夥伴，或當場撕毀警徽傳遞查殺訊號。");
}

function resolvePlayerSheriffTransfer(targetSeatId) {
  sound.unlock();
  const pending = state.match && state.match.pendingSheriffTransfer;
  const pid = getPlayerId();
  const deadPlayer = getSeat(pid);
  let heir = null;
  if (targetSeatId) {
    heir = getSeat(targetSeatId);
    if (!heir || !heir.alive || heir.id === pid) return;
    state.match.sheriffSeatId = heir.id;
    state.match.stats.sheriffPassed = (state.match.stats.sheriffPassed || 0) + 1;
    sound.playBlessing();
    spawnBeam(pid, heir.id, "#fbbf24", "trust", 900);
    spawnFx(heir.id, "👑 接下警徽!", "#fbbf24");
    triggerCutIn("👑 警徽交棒！", "你將 1.5 票警徽移交給 " + fmtSeatNum(heir.id) + "號 " + heir.name + "！", "gold");
    addLog({ kind: "blessing", title: "👑 警徽傳承：你將警徽移交給 " + fmtSeatNum(heir.id) + "號 " + heir.name + "！", text: "" });
  } else {
    state.match.sheriffSeatId = null;
    state.match.stats.sheriffPassed = (state.match.stats.sheriffPassed || 0) + 1;
    triggerCutIn("💥 警徽已撕毀！", "你決定當場撕毀警徽，本局不留 1.5 票權。", "crimson");
    addLog({ kind: "dawn", title: "💥 警徽作廢：你已當場撕毀警徽！", text: "" });
  }
  if (deadPlayer) {
    recordAndBroadcastBadgeFlowSignal(deadPlayer, heir);
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
  triggerCutIn("👑 警長歸票號召！", "號召好人夥伴集中檢視 " + fmtSeatNum(sel.id) + "號 " + sel.name + "（1.5票威望+14懷疑）！", "gold");
  addLog({ kind: "blessing", title: "👑 警長歸票：你以警長身分號召好人陣營集中考量 " + fmtSeatNum(sel.id) + "號 " + sel.name + "！", text: "" });
  showToast("👑 警長歸票號召成功！接下來點「確認投票」送出你的 1.5 票！", "emerald");
  updateAllUI();
  return true;
}

function shouldAiRunForSheriff(seat) {
  if (!seat || !seat.alive || seat.id === getPlayerId()) return false;
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(seat, { module: "sheriff_signup" })
    : null;
  const self = (snap && snap.self) ? snap.self : seat;
  // Each AI decides independently using ONLY its own role & persona (zero cross-seat peeking!)
  if (self.role === "seer") return true;
  if (self.role === "wolf" && self.fakeSeer) return true;
  if (self.role === "guard" && (self.id % 2 === 0)) return true;
  return false;
}

function buildSheriffElectionCandidates() {
  const alive = getAliveSeats();
  const pid = getPlayerId();
  const maxCands = alive.length <= 6 ? 2 : 3;
  const cands = alive.filter(function (s) { return s.id !== pid && shouldAiRunForSheriff(s); });
  // Ensure an engaging 2–3 seat election using strictly public seat order (never peeking at s.team!)
  alive.forEach(function (s) {
    if (s.id !== pid && cands.length < maxCands && !cands.some(function (c) { return c.id === s.id; })) {
      if (cands.length < 2 || (s.id % 3 === 0)) {
        cands.push(s);
      }
    }
  });
  return cands.slice(0, maxCands);
}

function buildSheriffCandidateLine(cand, priorSpeechesArg) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(cand, { module: "sheriff_speech" })
    : null;
  const self = (snap && snap.self) ? snap.self : cand;
  const others = snap ? snap.aliveOthers : getAliveSeats().filter(function (s) { return s.id !== cand.id; });
  // Zero-Leak: Candidate ONLY observes prior speeches already spoken on the stand — NEVER peeks at future candidates' hidden role or fakeSeer!
  const priorList = Array.isArray(priorSpeechesArg) ? priorSpeechesArg : [];
  const priorSeerSpeech = priorList.find(function (sp) {
    return sp && sp.id !== self.id && (sp.tone === "seer" || sp.tone === "clash");
  });
  const focusSeat = others.find(function (s) { return !priorSeerSpeech || s.id !== priorSeerSpeech.id; }) || others[0] || null;
  const focus = focusSeat ? (focusSeat.id + "號" + focusSeat.name) : "前排席位";
  const isSeerClaim = Boolean(self.role === "seer" || (self.role === "wolf" && self.fakeSeer));
  const lastChk = (self.role === "seer" && Array.isArray(self.checkedHistory) && self.checkedHistory.length > 0)
    ? self.checkedHistory[self.checkedHistory.length - 1]
    : null;
  const readSeat = snap ? snap.getSeat : getSeat;
  const seerCheckTarget = lastChk ? readSeat(lastChk.targetId) : focusSeat;
  const checkLbl = seerCheckTarget ? (seerCheckTarget.id + "號" + seerCheckTarget.name) : focus;
  const checkVerdict = lastChk ? (lastChk.isWolf ? "偏狼坑" : "偏金水") : "偏金水";

  // Select two distinct unchecked alive seats for authentic Dual Badge Flow (第一警徽流 → 第二警徽流)!
  const checkedIdSet = {};
  if (self.role === "seer" && Array.isArray(self.checkedHistory)) {
    self.checkedHistory.forEach(function (c) { if (c && c.targetId) checkedIdSet[c.targetId] = true; });
  } else if (seerCheckTarget) {
    checkedIdSet[seerCheckTarget.id] = true;
  }
  const flowPool = others.filter(function (s) {
    if (!s || !s.alive || s.id === self.id || checkedIdSet[s.id]) return false;
    if (priorSeerSpeech && s.id === priorSeerSpeech.id) return false;
    return true;
  });
  const flowFirst = flowPool[0] || others.find(function (s) { return s && s.id !== (seerCheckTarget ? seerCheckTarget.id : -1); }) || others[0] || null;
  const flowSecond = flowPool.find(function (s) { return flowFirst && s.id !== flowFirst.id; })
    || others.find(function (s) { return flowFirst && s.id !== flowFirst.id && s.id !== (seerCheckTarget ? seerCheckTarget.id : -1); })
    || null;
  const flowFirstLbl = flowFirst ? (fmtSeatNum(flowFirst.id) + "號" + flowFirst.name) : "前排未驗位";
  const flowSecondLbl = flowSecond ? (fmtSeatNum(flowSecond.id) + "號" + flowSecond.name) : "";
  const flowPhrase = flowSecond
    ? ("雙警徽流先驗 " + flowFirstLbl + "、再驗 " + flowSecondLbl + "（我若倒牌，徽給" + fmtSeatNum(flowFirst.id) + "號即金水、飛" + fmtSeatNum(flowSecond.id) + "號或撕徽即查殺）")
    : ("警徽流鎖定 " + flowFirstLbl + "（倒牌徽給他即金水、撕徽即查殺）");
  const badgeFlowObj = (isSeerClaim && flowFirst)
    ? { firstTargetId: flowFirst.id, secondTargetId: flowSecond ? flowSecond.id : null }
    : null;

  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("sheriff_speech", self.id, isSeerClaim ? "警上報觀察員＋留警徽流" : "警上競選表態");
  }

  if (isSeerClaim) {
    if (priorSeerSpeech) {
      const rLbl = fmtSeatNum(priorSeerSpeech.id) + "號" + priorSeerSpeech.name;
      return {
        tag: "⚡ 對跳明心",
        tone: "clash",
        rivalId: priorSeerSpeech.id,
        badgeFlow: badgeFlowObj,
        text: "「等等！" + rLbl + " 你居然敢跟我對跳明心？！全場聽好，我才是真明心！昨晚查了 " + checkLbl + "（" + checkVerdict + "），" + flowPhrase + "，敢跟我拍到底我就直接出你！」"
      };
    }
    return {
      tag: "🔮 強拍明心",
      tone: "seer",
      rivalId: null,
      badgeFlow: badgeFlowObj,
      text: "「我先拍明心身分拿警徽！昨晚查了 " + checkLbl + "（" + checkVerdict + "），" + flowPhrase + "！等等誰敢對跳直接標記悍跳狼！」"
    };
  }

  const personaLines = {
    "小澄": "「警徽不是喊大聲就拿得到！給我 1.5 票，我把每個人的發言漏洞跟票型全算出來，誰在演戲一目了然！」",
    "暖暖": "「大家別一上來就吵架嘛～警徽交給我，我會幫真明心穩住節奏、不讓狼人帶歪風向！」",
    "阿松": "「這局水很深，警徽落到狼手就完了！交給我坐鎮末置位，我盯死每個退水跟跟票的人！」",
    "星兒": "「我的直覺告訴我警上一定藏著狼！警徽給我，我要在末置位把心虛的那個人直接揪出來！」",
    "小雲": "「先說好，我上警是來查核真假預言家的！誰發言前後矛盾，我末置位直接拍桌歸票！」",
    "阿竹": "「上警如棋局，先手必爭。若願託付警徽於我，我必在末置位拆穿所有偽裝！」",
    "晨晨": "「衝啦！第一天就要打出氣勢！給我警徽，誰敢悍跳我就帶全場一起衝他！」",
    "墨白": "「多說無益，看人看骨。警徽給我，末置位一筆定江山，絕不手軟。」",
    "晴嵐": "「茶未涼、局已動。若諸位信我，願執警徽居中調度，不讓混淆視聽之徒得逞。」",
    "阿朗": "「辯論看邏輯、投票看證據！警徽給我，我保證把對跳兩邊的破綻攤在陽光下！」",
    "柚子": "「哇～警上氣氛好緊張！可是我也想當警長保護大家呀，選我選我，我會很認真聽大家發言的！」"
  };

  if (self.role === "guard") {
    return {
      tag: "🛡️ 穩健控場",
      tone: "bold",
      rivalId: null,
      badgeFlow: null,
      text: personaLines[self.name] || "「我是理性帶隊派，警徽交給我能幫忙鎖定焦點與節奏、末置位穩穩歸票！」"
    };
  }
  return {
    tag: "🔥 強勢上警",
    tone: "bold",
    rivalId: priorSeerSpeech ? priorSeerSpeech.id : null,
    badgeFlow: null,
    text: personaLines[self.name] || "「我說話講邏輯不情緒化，給我警徽我會在末置位整理正反兩邊坑位，公平歸票！」"
  };
}

function buildPlayerSheriffQuickOptions(player, draftFlowArg) {
  const pid = getPlayerId();
  const others = getAliveSeats().filter(function (s) { return s.id !== pid; });
  const focus = others[0] ? (fmtSeatNum(others[0].id) + "號" + others[0].name) : "前置位";
  const chk = (player && player.role === "seer" && player.checkedHistory && player.checkedHistory.length > 0)
    ? player.checkedHistory[player.checkedHistory.length - 1]
    : null;
  const uncheckedPool = others.filter(function (s) { return !chk || s.id !== chk.targetId; });
  const defaultFirst = (draftFlowArg && draftFlowArg.firstTargetId && getSeat(draftFlowArg.firstTargetId))
    ? getSeat(draftFlowArg.firstTargetId)
    : (uncheckedPool[0] || others[0] || null);
  const defaultSecond = (draftFlowArg && draftFlowArg.secondTargetId && draftFlowArg.secondTargetId !== (defaultFirst ? defaultFirst.id : -1) && getSeat(draftFlowArg.secondTargetId))
    ? getSeat(draftFlowArg.secondTargetId)
    : (draftFlowArg && draftFlowArg.explicit ? null : (uncheckedPool.find(function (s) { return defaultFirst && s.id !== defaultFirst.id; }) || others[1] || null));
  const f1Lbl = defaultFirst ? (fmtSeatNum(defaultFirst.id) + "號" + defaultFirst.name) : "前排席位";
  const f2Lbl = defaultSecond ? (fmtSeatNum(defaultSecond.id) + "號" + defaultSecond.name) : "";
  const flowDualText = defaultSecond
    ? ("雙警徽流先驗 " + f1Lbl + "、再驗 " + f2Lbl + "（倒牌徽給" + fmtSeatNum(defaultFirst.id) + "號即金水、飛" + fmtSeatNum(defaultSecond.id) + "號或撕徽即查殺）")
    : ("警徽流先看 " + f1Lbl + "（倒牌徽給他即金水、撕徽即查殺）");
  const flowObj = defaultFirst ? { firstTargetId: defaultFirst.id, secondTargetId: defaultSecond ? defaultSecond.id : null } : null;

  if (player && player.role === "seer") {
    const cs = chk ? getSeat(chk.targetId) : null;
    const chkStr = (chk && cs)
      ? ("昨晚查驗 " + fmtSeatNum(cs.id) + "號" + cs.name + " 是" + (chk.isWolf ? "酸民狼（查殺）" : "書院好夥伴（金水）"))
      : ("我手握昨晚查驗真相");
    return [
      {
        title: "🔮 強拍明心＋雙警徽流",
        tag: "明心直拍",
        claimsSeer: true,
        badgeFlow: flowObj,
        text: "我是真正的明心觀察員！" + chkStr + "，今晚" + flowDualText + "，請警下好夥伴把警徽投給我帶隊！"
      },
      {
        title: "👑 穩健報警徽流＋看票型",
        tag: "警徽流",
        claimsSeer: true,
        badgeFlow: flowObj,
        text: "我起跳明心觀察員拿警徽，" + chkStr + "；警徽流鎖定 " + f1Lbl + (f2Lbl ? (" 接續 " + f2Lbl) : "") + "。若警上有人對跳，待會看警下衝票就能排坑！"
      },
      {
        title: "🌿 先隱藏身分聽局",
        tag: "觀察風向",
        claimsSeer: false,
        badgeFlow: null,
        text: "我先上警聽一圈大家的態度與警下票型，暫時不急著亮底牌，警徽交給我我會在末置位客觀歸票！"
      }
    ];
  }
  if (player && player.role === "wolf") {
    const goodPick = others.find(function (s) { return s.role !== "wolf"; }) || others[0];
    const goodLbl = goodPick ? (fmtSeatNum(goodPick.id) + "號" + goodPick.name) : focus;
    return [
      {
        title: "🎭 悍跳明心＋假警徽流",
        tag: "悍跳施壓",
        claimsSeer: true,
        badgeFlow: flowObj,
        text: "全場聽好，我才是這局真正的明心觀察員！昨晚查了 " + goodLbl + " 偏金水，" + flowDualText + "，誰敢對跳直接標記狼坑！"
      },
      {
        title: "👑 穩健帶隊拉票",
        tag: "節奏掌控",
        claimsSeer: false,
        badgeFlow: null,
        text: "我上警是想幫好人穩住第一天節奏，待會誰在警下衝票、誰發言前後矛盾，我會在末置位一條條整理清楚！"
      },
      {
        title: "🔥 試探壓場詐身分",
        tag: "詐身分",
        claimsSeer: false,
        badgeFlow: null,
        text: "我先上警給警上施壓看看誰會心虛，如果真有強明心我待會再決定退不退水，大家先仔細聽後置位表水！"
      }
    ];
  }
  return [
    {
      title: "👑 理性帶隊爭警徽",
      tag: "邏輯控場",
      claimsSeer: false,
      badgeFlow: null,
      text: "我是好人視角上警，警徽給我我會在末置位幫大家整理發言與票型；若不慎離席，警徽會優先託付給 " + f1Lbl + (f2Lbl ? (" 或 " + f2Lbl) : "") + "！"
    },
    {
      title: "🛡️ 壓場查核對跳位",
      tag: "查核真偽",
      claimsSeer: false,
      badgeFlow: null,
      text: "我上警是為了近距離檢視警上每個人的說法，若出現雙明心對跳，我會把兩邊的警下票型與警徽流攤開來對照，請支持我！"
    },
    {
      title: "🌿 詐後置位看反應",
      tag: "試探後置",
      claimsSeer: false,
      badgeFlow: null,
      text: "我先舉手上警聽聽大家怎麼站邊、看後置位誰最慌張，等會再決定要競選到底還是退水回警下投票！"
    }
  ];
}

function triggerSheriffDoubleSeerClashDrama(sA, sB, ctx) {
  if (!sA || !sB || !ctx || ctx.hasDoubleSeerClash) return;
  ctx.hasDoubleSeerClash = true;
  if (!Array.isArray(ctx.dramaEvents)) ctx.dramaEvents = [];
  const aName = sA.id === getPlayerId() ? "你" : sA.name;
  const bName = sB.id === getPlayerId() ? "你" : sB.name;
  ctx.dramaEvents.unshift("⚡ 警上爆出「雙明心對跳」！ " + fmtSeatNum(sA.id) + "號" + aName + " 與 " + fmtSeatNum(sB.id) + "號" + bName + " 正面交鋒、火藥味十足！");
  if (typeof spawnBeam === "function") {
    spawnBeam(sA.id, sB.id, "#f43f5e", "clash");
    spawnBeam(sB.id, sA.id, "#fbbf24", "clash");
  }
  if (typeof setSeatEmotion === "function") {
    setSeatEmotion(sA.id, "proud", 4500);
    setSeatEmotion(sB.id, "angry", 4500);
  }
  if (typeof setSeatBubble === "function") {
    setSeatBubble(sA.id, "誰敢跟我對跳明心？！", "trust", 4200);
    setSeatBubble(sB.id, "少裝了，我才是真明心！", "wolf", 4200);
  }
  if (typeof triggerCutIn === "function") {
    triggerCutIn("⚡ 警上雙明心對跳！", fmtSeatNum(sA.id) + "號" + aName + " vs " + fmtSeatNum(sB.id) + "號" + bName + " 互拍警徽，全場屏息！", "crimson", 1600);
  }
  if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.triggerCameraPunch === "function") {
    stage3d.triggerCameraPunch(sB.id, { fov: 38, durationMs: 1400 });
  }
  sound.tone(330, 0.14, "sawtooth", 0.06, 0);
  sound.tone(440, 0.18, "triangle", 0.07, 0.09);
}

function startSheriffElection(onDone) {
  const m = state.match;
  if (typeof stage3d !== "undefined" && typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
  if (!m || !m.started || !state.sheriffMode || !m.sheriffElectionPending || m.day !== 1) {
    if (m) m.sheriffElectionPending = false;
    if (typeof onDone === "function") onDone();
    return false;
  }
  m.sheriffElectionPending = false;
  const cands = buildSheriffElectionCandidates().sort(function (a, b) { return a.id - b.id; });
  const pSeat = getPlayerSeat();
  const ffSpec = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (ffSpec || !pSeat || !pSeat.alive || cands.length === 0) {
    const existingSh = m.sheriffSeatId ? getSeat(m.sheriffSeatId) : null;
    let fallbackWinner = (existingSh && existingSh.alive) ? existingSh : (cands[0] || getAliveSeats()[0] || null);
    if (cands.length >= 1) {
      const autoSpeeches = [];
      cands.forEach(function (c) {
        const built = buildSheriffCandidateLine(c, autoSpeeches);
        autoSpeeches.push({ id: c.id, name: c.name, tag: built.tag, tone: built.tone, rivalId: built.rivalId, badgeFlow: built.badgeFlow || null, text: built.text });
        if (built.tone === "seer" || built.tone === "clash") c.claimedRole = "seer";
        if (built.badgeFlow && built.badgeFlow.firstTargetId) {
          setSheriffBadgeFlow(c.id, built.badgeFlow.firstTargetId, built.badgeFlow.secondTargetId, "election");
        }
      });
      const candIds = cands.map(function (c) { return c.id; });
      const counts = {};
      const ballots = [];
      candIds.forEach(function (id) { counts[id] = 0; });
      if (cands.length >= 2) {
        getAliveSeats().forEach(function (s) {
          if (candIds.indexOf(s.id) !== -1) return;
          const pickId = chooseAiSheriffElectionVote(s, candIds, autoSpeeches, true);
          if (pickId) {
            counts[pickId] = (counts[pickId] || 0) + 1;
            ballots.push({ voterId: s.id, targetId: pickId, weight: 1 });
          }
        });
        fallbackWinner = cands.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); })[0] || fallbackWinner;
      } else {
        fallbackWinner = cands[0];
        counts[cands[0].id] = 1;
      }
      const seerIdsAuto = autoSpeeches.filter(function (sp) { return sp.tone === "seer" || sp.tone === "clash"; }).map(function (sp) { return sp.id; });
      m.sheriffVoteRecord = {
        day: m.day || 1,
        kind: "sheriff",
        candidateIds: candIds,
        withdrawnIds: [],
        seerClaimIds: seerIdsAuto,
        winnerId: fallbackWinner ? fallbackWinner.id : null,
        ballots: ballots,
        tallies: Object.assign({}, counts)
      };
    }
    if (fallbackWinner) {
      m.sheriffSeatId = fallbackWinner.id;
      const winAutoFlow = (m.sheriffBadgeFlowsBySeat && m.sheriffBadgeFlowsBySeat[fallbackWinner.id]) || null;
      m.sheriffBadgeFlowsBySeat = {};
      if (winAutoFlow) {
        m.sheriffBadgeFlowsBySeat[fallbackWinner.id] = winAutoFlow;
        m.sheriffBadgeFlow = winAutoFlow;
      } else {
        m.sheriffBadgeFlow = null;
      }
      const pidAuto = getPlayerId();
      const autoFlowStr = (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === fallbackWinner.id)
        ? ("｜警徽流：" + formatBadgeFlowSummary(m.sheriffBadgeFlow))
        : "";
      addLog({
        kind: "blessing",
        title: "👑 警長誕生：" + fmtSeatNum(fallbackWinner.id) + "號 " + (fallbackWinner.id === pidAuto ? "你" : fallbackWinner.name) + " 當選本局警長（1.5票＆末置位歸票權" + autoFlowStr + "）！",
        text: ""
      });
    } else {
      m.sheriffSeatId = null;
    }
    if (typeof onDone === "function") onDone();
    return false;
  }

  // Clear pre-seeded phantom crown during live interactive Sheriff Election!
  m.sheriffSeatId = null;
  const candNamesStr = cands.map(function (c) { return fmtSeatNum(c.id) + "號" + c.name; }).join("、");
  const dramaEvents = [
    "👑 舉手上警名單：" + candNamesStr + "！請先決定要「上警競選」或「警下聽選」，隨即依序輪流發言拉票！"
  ];
  if (cands.length >= 2 && typeof spawnBeam === "function") {
    spawnBeam(cands[0].id, cands[1].id, "#fbbf24", "grill");
  }
  sound.tone(523, 0.10, "triangle", 0.06, 0);

  m.sheriffElectionCtx = {
    stage: "signup",
    candidateIds: cands.map(function (c) { return c.id; }),
    speechOrderIds: [],
    speechIndex: -1,
    speeches: [],
    spokenSpeeches: [],
    playerQuickOptions: [],
    playerBadgeFlowDraft: { firstTargetId: null, secondTargetId: null, explicit: false },
    dramaEvents: dramaEvents,
    withdrawnIds: [],
    hasDoubleSeerClash: false,
    activeReelSeatId: null,
    playerRunning: false,
    playerWithdrew: false,
    onDone: typeof onDone === "function" ? onDone : null
  };
  m.phase = "SHERIFF_ELECTION";
  addLog({
    kind: "system",
    title: "👑 第一天「上警競選」開始！目前 " + candNamesStr + " 舉手上警；請決定是否上警，隨即進入警上輪流發言與警下投票！",
    text: ""
  });
  if (typeof voice !== "undefined" && voice.canSpeak()) {
    voice.speakHost("第一天警長競選開始！目前共有" + cands.length + "位夥伴舉手上警，請決定是否上警，或直接開始候選人輪流發言！");
  }
  updateAllUI();
  return true;
}

function startSheriffCampaignSpeeches() {
  clearStepTimer();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return false;
  const order = ctx.candidateIds.filter(function (id) {
    const s = getSeat(id);
    return Boolean(s && s.alive);
  }).sort(function (a, b) { return a - b; });
  ctx.stage = "speech";
  ctx.speechOrderIds = order;
  ctx.speechIndex = -1;
  ctx.spokenSpeeches = [];
  ctx.speeches = [];
  ctx.dramaEvents = (ctx.dramaEvents || []).filter(function (ev) {
    return String(ev || "").indexOf("請先決定要「上警競選」") === -1;
  });
  ctx.hasDoubleSeerClash = false;
  ctx.activeReelSeatId = null;
  state.activeSpeakerId = null;
  if (order.length === 0) {
    ctx.stage = "vote";
    updateAllUI();
    return true;
  }
  return advanceSheriffSpeechTurn();
}

function advanceSheriffSpeechTurn() {
  clearStepTimer();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return false;
  if (ctx.stage === "signup") {
    return startSheriffCampaignSpeeches();
  }
  const pid = getPlayerId();
  const order = Array.isArray(ctx.speechOrderIds) ? ctx.speechOrderIds : [];
  let nextIdx = (typeof ctx.speechIndex === "number" ? ctx.speechIndex : -1) + 1;
  while (nextIdx < order.length) {
    const cid = order[nextIdx];
    const cs = getSeat(cid);
    if (cs && cs.alive && ctx.candidateIds.indexOf(cid) !== -1) break;
    nextIdx += 1;
  }
  ctx.speechIndex = nextIdx;

  if (nextIdx >= order.length) {
    ctx.stage = "vote";
    ctx.activeReelSeatId = null;
    state.activeSpeakerId = null;
    sound.tone(587, 0.09, "triangle", 0.05, 0);
    sound.tone(784, 0.12, "triangle", 0.055, 0.08);
    addLog({
      kind: "system",
      title: "🗳 警上候選人輪流發言完畢！請警下夥伴投票選出本局警長（票型將自動納入排坑紀錄）。",
      text: ""
    });
    if (typeof voice !== "undefined" && voice.canSpeak()) {
      voice.speakHost(ctx.playerRunning
        ? "警上輪流發言結束！你是警上候選人，請點擊開始警下開票決選！"
        : "警上輪流發言結束！請警下夥伴投票選出本局警長！");
    }
    updateAllUI();
    return true;
  }

  const candId = order[nextIdx];
  const cand = getSeat(candId);
  if (!cand) return advanceSheriffSpeechTurn();
  ctx.activeReelSeatId = candId;
  state.activeSpeakerId = candId;
  if (typeof closeSeatIntel === "function") closeSeatIntel();
  if (typeof stage3d !== "undefined") {
    if (typeof stage3d.clearCloseUp === "function") stage3d.clearCloseUp();
    if (stage3d.orbit) stage3d.orbit.userOverrideUntil = 0;
  }

  if (candId === pid) {
    // Initialize smart default badge-flow draft (2 unchecked alive seats) for player's stand speech picker
    const othersP = getAliveSeats().filter(function (s) { return s.id !== pid; });
    const chkP = (cand.role === "seer" && Array.isArray(cand.checkedHistory) && cand.checkedHistory.length > 0)
      ? cand.checkedHistory[cand.checkedHistory.length - 1]
      : null;
    const unchkP = othersP.filter(function (s) { return !chkP || s.id !== chkP.targetId; });
    const d1 = unchkP[0] || othersP[0] || null;
    const d2 = unchkP.find(function (s) { return d1 && s.id !== d1.id; }) || othersP.find(function (s) { return d1 && s.id !== d1.id; }) || null;
    if (!ctx.playerBadgeFlowDraft || !ctx.playerBadgeFlowDraft.explicit) {
      ctx.playerBadgeFlowDraft = { firstTargetId: d1 ? d1.id : null, secondTargetId: d2 ? d2.id : null, explicit: false };
    }
    ctx.playerQuickOptions = buildPlayerSheriffQuickOptions(cand, ctx.playerBadgeFlowDraft);
    const inp = el("sheriffPlayerInput");
    if (inp) inp.value = "";
    sound.tone(660, 0.09, "triangle", 0.05, 0);
    updateAllUI();
    if (typeof voice !== "undefined" && voice.canSpeak()) {
      voice.speakHost("輪到" + pid + "號你進行警上發言，可選擇警徽流並發表競選宣言！");
    }
    return true;
  }

  const built = buildSheriffCandidateLine(cand, ctx.spokenSpeeches);
  const spObj = {
    id: cand.id,
    name: cand.name,
    tag: built.tag,
    tone: built.tone,
    rivalId: built.rivalId,
    badgeFlow: built.badgeFlow || null,
    text: built.text
  };
  ctx.spokenSpeeches.push(spObj);
  ctx.speeches.push(spObj);

  if (built.tone === "seer" || built.tone === "clash") {
    cand.claimedRole = "seer";
    if (built.badgeFlow && built.badgeFlow.firstTargetId) {
      setSheriffBadgeFlow(cand.id, built.badgeFlow.firstTargetId, built.badgeFlow.secondTargetId, "election");
    }
    if (built.tone === "clash") {
      const firstSeer = ctx.spokenSpeeches.find(function (sp) {
        return sp.id !== cand.id && (sp.tone === "seer" || sp.tone === "clash");
      });
      if (firstSeer) triggerSheriffDoubleSeerClashDrama(firstSeer, spObj, ctx);
    }
  }

  addLog({
    kind: "system",
    speakerId: cand.id,
    title: "👑 警上發言・" + fmtSeatNum(cand.id) + "號 " + cand.name + "（" + built.tag + "）",
    text: built.text.replace(/^「|」$/g, "")
  });
  if (typeof setSeatEmotion === "function") setSeatEmotion(cand.id, built.tone === "clash" ? "angry" : "proud", 4200);
  if (typeof setSeatBubble === "function") setSeatBubble(cand.id, built.text.replace(/^「|」$/g, "").slice(0, 26) + (built.text.length > 28 ? "…" : ""), built.tone === "clash" ? "wolf" : "trust", 4400);
  if (built.rivalId && typeof spawnBeam === "function") {
    spawnBeam(cand.id, built.rivalId, built.tone === "clash" ? "#f43f5e" : "#fbbf24", "clash");
  }
  if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.triggerCameraPunch === "function") {
    stage3d.triggerCameraPunch(cand.id, { fov: 38, durationMs: 1400 });
  }

  updateAllUI();
  if (typeof startSpotlightTypewriter === "function") {
    startSpotlightTypewriter({
      speaker: cand,
      badge: fmtSeatNum(cand.id) + "號 " + cand.name + "・警上發言",
      trait: built.tag,
      rawText: built.text,
      voiceMood: built.tone === "clash" ? "accuse" : (built.tone === "seer" ? "claim_seer" : "normal"),
      holdMs: 2400
    });
  }
  return true;
}

function setPlayerSheriffDraftBadgeFlow(firstTargetId, secondTargetId) {
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  const pSeat = getPlayerSeat();
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return null;
  const pid = getPlayerId();
  const fId = parseInt(firstTargetId, 10) || null;
  let sId = parseInt(secondTargetId, 10) || null;
  if (fId === pid) return null;
  if (sId === pid || sId === fId) sId = null;
  ctx.playerBadgeFlowDraft = { firstTargetId: fId, secondTargetId: sId, explicit: true };
  if (pSeat) {
    ctx.playerQuickOptions = buildPlayerSheriffQuickOptions(pSeat, ctx.playerBadgeFlowDraft);
  }
  updateAllUI();
  return ctx.playerBadgeFlowDraft;
}

function submitPlayerSheriffSpeech(rawText, explicitFlowArg, optsArg) {
  sound.unlock();
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION" || ctx.stage !== "speech" || ctx.activeReelSeatId !== pid || !pSeat) {
    return false;
  }
  let cleanText = String(rawText || "").trim();
  if (cleanText && typeof normalizeSeatRefsInText === "function") {
    cleanText = normalizeSeatRefsInText(cleanText);
  }
  let autoCardClaimsSeer = null;
  if (!cleanText) {
    const opts = Array.isArray(ctx.playerQuickOptions) ? ctx.playerQuickOptions : [];
    if (opts[0] && opts[0].text) {
      cleanText = opts[0].text;
      if (typeof opts[0].claimsSeer === "boolean") autoCardClaimsSeer = opts[0].claimsSeer;
    } else {
      cleanText = "我上警爭取警徽，會在末置位幫大家整理發言邏輯與警下票型，理性排坑歸票！";
    }
  }
  let claimsSeer = false;
  if (optsArg && typeof optsArg.claimsSeer === "boolean") {
    claimsSeer = optsArg.claimsSeer;
  } else if (autoCardClaimsSeer !== null) {
    claimsSeer = autoCardClaimsSeer;
  } else {
    // Require affirmative Seer-claim phrasing and ignore conditional/negated mentions (e.g. "不是明心", "若出現雙明心", "真有強明心")!
    const strippedSeerCheck = cleanText
      .replace(/(?:不是|非|絕不是|沒有).{0,4}(?:明心|觀察員|預言家)/g, " ")
      .replace(/(?:若|如果|萬一|假設)[^，。！？；;]*(?:明心|觀察員|預言家)[^，。！？；;]*/g, " ");
    claimsSeer = /(?:我(?:才)?是|起跳|亮牌|強拍|拍|跳|身為).{0,8}(?:明心|觀察員|預言家)|昨晚(?:查驗?|驗)了|報(?:金水|查殺)/.test(strippedSeerCheck);
  }
  const priorSeer = (ctx.spokenSpeeches || []).find(function (sp) {
    return sp && sp.id !== pid && (sp.tone === "seer" || sp.tone === "clash");
  });
  let tone = "player";
  let tag = "👑 警上發言";
  let rivalId = null;
  if (claimsSeer) {
    pSeat.claimedRole = "seer";
    if (priorSeer) {
      tone = "clash";
      tag = "⚡ 對跳明心";
      rivalId = priorSeer.id;
    } else {
      tone = "seer";
      tag = "🔮 強拍明心";
    }
  }
  // Extract or adopt declared Badge Flow (explicit card/picker flow OR parsed from free-text!)
  let flowUsed = null;
  if (explicitFlowArg && explicitFlowArg.firstTargetId) {
    flowUsed = setSheriffBadgeFlow(pid, explicitFlowArg.firstTargetId, explicitFlowArg.secondTargetId, "election");
  } else {
    const parsedFlow = parseBadgeFlowFromText(cleanText, pid);
    if (parsedFlow && parsedFlow.firstTargetId) {
      flowUsed = setSheriffBadgeFlow(pid, parsedFlow.firstTargetId, parsedFlow.secondTargetId, "election");
    } else if (ctx.playerBadgeFlowDraft && ctx.playerBadgeFlowDraft.explicit && ctx.playerBadgeFlowDraft.firstTargetId) {
      flowUsed = setSheriffBadgeFlow(pid, ctx.playerBadgeFlowDraft.firstTargetId, ctx.playerBadgeFlowDraft.secondTargetId, "election");
      const summary = formatBadgeFlowSummary(flowUsed);
      if (summary && cleanText.indexOf("警徽流") === -1) {
        cleanText = cleanText.replace(/[。！!]+$/, "") + "，警徽流留" + summary + "！";
      }
    }
  }
  const spObj = {
    id: pid,
    name: "你",
    tag: tag,
    tone: tone,
    rivalId: rivalId,
    badgeFlow: flowUsed ? { firstTargetId: flowUsed.firstTargetId, secondTargetId: flowUsed.secondTargetId } : null,
    text: "「" + cleanText.replace(/^「|」$/g, "") + "」"
  };
  ctx.spokenSpeeches.push(spObj);
  ctx.speeches.push(spObj);
  if (tone === "clash" && priorSeer) {
    triggerSheriffDoubleSeerClashDrama(priorSeer, spObj, ctx);
  }
  addLog({
    kind: "system",
    speakerId: pid,
    title: "👑 警上發言・" + playerNumTag() + " 你（" + tag + (flowUsed ? ("｜警徽流：" + formatBadgeFlowSummary(flowUsed)) : "") + "）",
    text: cleanText.replace(/^「|」$/g, "")
  });
  if (typeof setSeatBubble === "function") setSeatBubble(pid, cleanText.slice(0, 26) + (cleanText.length > 26 ? "…" : ""), "trust", 3800);
  if (typeof spawnBurst === "function") spawnBurst(pid, ["#fbbf24", "#ffffff"], 12, "star");
  sound.tone(660, 0.08, "triangle", 0.05, 0);
  return advanceSheriffSpeechTurn();
}

function chooseAiSheriffElectionVote(voter, candidateIds, speeches, isAutoPass) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(voter, { module: "sheriff_vote" })
    : null;
  const self = (snap && snap.self) ? snap.self : voter;
  const pid = snap ? snap.playerSeatId : getPlayerId();
  const claimedSeerOnStand = {};
  (speeches || []).forEach(function (sp) {
    if (sp && (sp.tone === "seer" || sp.tone === "clash")) claimedSeerOnStand[sp.id] = true;
  });
  const cands = (candidateIds || []).map(function (id) {
    return snap ? snap.getSeat(id) : getSeat(id);
  }).filter(function (s) { return s && s.alive; });
  if (!cands.length) return null;

  const scoreCand = function (cand) {
    // Zero-Leak Fair Play: Good AIs NEVER peek hidden roles/teams; Wolves legally know their Wolf mates via isWolfMate!
    const wolfKnowsMate = (self.role === "wolf" && (snap ? cand.isWolfMate : cand.role === "wolf")) ? 20 : 0;
    const observableSeerClaim = claimedSeerOnStand[cand.id] ? 12 : 0;
    const playerRunBonus = (isAutoPass && cand.id === pid) ? 14 : 0;
    const seatJitter = ((self.id * 11 + cand.id * 7) % 9) - 4;
    return wolfKnowsMate + observableSeerClaim + playerRunBonus + seatJitter - ((self.suspicionMap && self.suspicionMap[cand.id]) || 50);
  };
  const ranked = cands.slice().sort(function (a, b) { return scoreCand(b) - scoreCand(a); });
  const chosenId = ranked[0] ? ranked[0].id : null;
  if (typeof antiCheatMonitor !== "undefined" && self) {
    antiCheatMonitor.recordDecision("sheriff_vote", self.id, chosenId ? ("投警 " + chosenId + "號") : "棄票");
  }
  return chosenId;
}

function finalizeSheriffElectionWinner(chosenCandId) {
  clearStepTimer();
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
  state.activeSpeakerId = null;
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx) return null;
  ctx.activeReelSeatId = null;
  const pid = getPlayerId();
  const cands = ctx.candidateIds.map(getSeat).filter(function (s) { return s && s.alive; });

  // Ensure every alive candidate has a chronological stand speech recorded even if player fast-skipped speeches
  if (!Array.isArray(ctx.spokenSpeeches)) ctx.spokenSpeeches = [];
  if (!Array.isArray(ctx.speeches)) ctx.speeches = [];
  cands.forEach(function (c) {
    const already = ctx.spokenSpeeches.some(function (sp) { return sp && sp.id === c.id; });
    if (!already) {
      if (c.id === pid) {
        // NEVER auto-out a hiding Player Seer when fast-skipping ("pass") speeches!
        const pLine = {
          id: pid,
          name: "你",
          tag: "👑 強勢上警",
          tone: "player",
          rivalId: null,
          text: "「我上警爭取警徽，末置位帶大家理性歸票！」"
        };
        ctx.spokenSpeeches.push(pLine);
        ctx.speeches.push(pLine);
      } else {
        const built = buildSheriffCandidateLine(c, ctx.spokenSpeeches);
        const spObj = { id: c.id, name: c.name, tag: built.tag, tone: built.tone, rivalId: built.rivalId, badgeFlow: built.badgeFlow || null, text: built.text };
        ctx.spokenSpeeches.push(spObj);
        ctx.speeches.push(spObj);
        if (built.tone === "seer" || built.tone === "clash") {
          c.claimedRole = "seer";
          if (built.badgeFlow && built.badgeFlow.firstTargetId) {
            setSheriffBadgeFlow(c.id, built.badgeFlow.firstTargetId, built.badgeFlow.secondTargetId, "election");
          }
        }
      }
    }
  });

  const standSpeeches = ctx.spokenSpeeches.length ? ctx.spokenSpeeches : ctx.speeches;
  let winner = null;
  const counts = {};
  const voteRecords = {};
  const ballots = [];
  cands.forEach(function (c) {
    counts[c.id] = 0;
    voteRecords[c.id] = [];
  });

  const isPlayerUnderVoter = Boolean(getPlayerSeat() && getPlayerSeat().alive && !ctx.playerRunning && ctx.candidateIds.indexOf(pid) === -1);
  const playerVotedCand = (chosenCandId && chosenCandId !== pid && isPlayerUnderVoter && cands.some(function (c) { return c.id === chosenCandId; }))
    ? chosenCandId
    : null;
  const tiePreferId = (chosenCandId && cands.some(function (c) { return c.id === chosenCandId; })) ? chosenCandId : null;
  const sortByTally = function (a, b) {
    const diff = (counts[b.id] || 0) - (counts[a.id] || 0);
    if (diff !== 0) return diff;
    if (tiePreferId) {
      if (a.id === tiePreferId) return -1;
      if (b.id === tiePreferId) return 1;
    }
    return a.id - b.id;
  };

  if (cands.length === 0) {
    winner = getAliveSeats()[0] || null;
  } else if (cands.length === 1) {
    winner = cands[0];
    if (playerVotedCand) {
      counts[playerVotedCand] = 1;
      ballots.push({ voterId: pid, targetId: playerVotedCand, weight: 1 });
      voteRecords[playerVotedCand].push(playerNumTag() + "你");
    }
  } else {
    if (playerVotedCand) {
      counts[playerVotedCand] = (counts[playerVotedCand] || 0) + 1;
      ballots.push({ voterId: pid, targetId: playerVotedCand, weight: 1 });
      voteRecords[playerVotedCand].push(playerNumTag() + "你");
      if (typeof spawnBeam === "function") spawnBeam(pid, playerVotedCand, "#fbbf24", "vote");
    } else if (isPlayerUnderVoter) {
      ballots.push({ voterId: pid, targetId: null, weight: 0 });
    }
    const aiUsePlayerBonus = Boolean(!ctx.playerRunning && !playerVotedCand);
    getAliveSeats().forEach(function (s) {
      if (s.id === pid || ctx.candidateIds.indexOf(s.id) !== -1) return;
      const pickId = chooseAiSheriffElectionVote(s, ctx.candidateIds, standSpeeches, aiUsePlayerBonus);
      if (pickId) {
        counts[pickId] = (counts[pickId] || 0) + 1;
        ballots.push({ voterId: s.id, targetId: pickId, weight: 1 });
        voteRecords[pickId].push(fmtSeatNum(s.id) + s.name);
        if (typeof spawnBeam === "function") spawnBeam(s.id, pickId, "#fbbf24", "vote");
      } else {
        ballots.push({ voterId: s.id, targetId: null, weight: 0 });
      }
    });
    winner = cands.slice().sort(sortByTally)[0];
  }

  const seerClaimIds = standSpeeches
    .filter(function (sp) { return sp && (sp.tone === "seer" || sp.tone === "clash"); })
    .map(function (sp) { return sp.id; });

  m.sheriffVoteRecord = {
    day: m.day || 1,
    kind: "sheriff",
    candidateIds: cands.map(function (c) { return c.id; }),
    withdrawnIds: Array.isArray(ctx.withdrawnIds) ? ctx.withdrawnIds.slice() : [],
    seerClaimIds: seerClaimIds,
    winnerId: winner ? winner.id : null,
    ballots: ballots,
    tallies: Object.assign({}, counts)
  };

  // Public Sheriff-ballot suspicion awareness (strictly public votes on dual-Seer clash, zero hidden peeking!)
  if (seerClaimIds.length >= 2 && ballots.length > 0) {
    seerClaimIds.forEach(function (sId) {
      const seerSeat = getSeat(sId);
      if (!seerSeat || !seerSeat.alive || seerSeat.id === pid || !seerSeat.suspicionMap) return;
      ballots.forEach(function (b) {
        if (!b || !b.voterId || !b.targetId || b.voterId === seerSeat.id) return;
        if (b.targetId !== seerSeat.id && seerClaimIds.indexOf(b.targetId) !== -1) {
          seerSeat.suspicionMap[b.voterId] = clamp((seerSeat.suspicionMap[b.voterId] || 50) + 8, 5, 96);
        } else if (b.targetId === seerSeat.id) {
          seerSeat.suspicionMap[b.voterId] = clamp((seerSeat.suspicionMap[b.voterId] || 50) - 6, 5, 96);
        }
      });
    });
  }

  const sortedCands = cands.slice().sort(sortByTally);
  const runnerUp = sortedCands.find(function (c) { return !winner || c.id !== winner.id; }) || null;
  const margin = (winner && runnerUp) ? ((counts[winner.id] || 0) - (counts[runnerUp.id] || 0)) : 2;
  const isCloseCall = Boolean(runnerUp && margin <= 1.2);
  const tallySummary = sortedCands.map(function (c) {
    const voters = voteRecords[c.id] || [];
    const cName = c.id === pid ? (playerNumTag() + "你") : (fmtSeatNum(c.id) + c.name);
    if (sortedCands.length === 1 && (counts[c.id] || 0) === 0) {
      return cName + "（無對手直接當選）";
    }
    return cName + "(" + Math.round((counts[c.id] || 0) * 10) / 10 + "票" + (voters.length ? ("：" + voters.join("、")) : "") + ")";
  }).join(" ｜ ");

  const doneCb = ctx.onDone;
  m.sheriffElectionCtx = null;
  if (winner) {
    m.sheriffSeatId = winner.id;
    const winFlow = (m.sheriffBadgeFlowsBySeat && m.sheriffBadgeFlowsBySeat[winner.id]) || null;
    m.sheriffBadgeFlowsBySeat = {};
    if (winFlow) {
      m.sheriffBadgeFlowsBySeat[winner.id] = winFlow;
      m.sheriffBadgeFlow = winFlow;
    } else {
      m.sheriffBadgeFlow = null;
    }
    m.stats.sheriffPassed = (m.stats.sheriffPassed || 0) + 1;
    if (winner.id === pid && ctx.playerRunning) {
      m.stats.sheriffDramaWins = (m.stats.sheriffDramaWins || 0) + 1;
    }
    const wLbl = winner.id === pid ? (playerNumTag() + " 你") : (fmtSeatNum(winner.id) + "號 " + winner.name);
    const activeFlowNote = (m.sheriffBadgeFlow && m.sheriffBadgeFlow.ownerId === winner.id)
      ? ("｜警徽流：" + formatBadgeFlowSummary(m.sheriffBadgeFlow))
      : "";
    sound.playBlessing();
    if (typeof spawnBurst === "function") spawnBurst(winner.id, ["#fbbf24", "#fde68a", "#ffffff"], 26, "star");
    if (typeof spawnFx === "function") spawnFx(winner.id, isCloseCall ? "👑 險勝奪徽!" : "👑 當選警長!", "#fbbf24", { scale: 1.2, durationMs: 1700 });
    if (typeof setSeatEmotion === "function") {
      setSeatEmotion(winner.id, "laugh", 3600);
      if (runnerUp) setSeatEmotion(runnerUp.id, "nervous", 3200);
    }
    if (typeof setSeatBubble === "function") {
      setSeatBubble(winner.id, isCloseCall ? "呼～險勝接下警徽，絕不辜負！" : "感謝大家信任，看我帶隊！", "trust", 3800);
      if (runnerUp) setSeatBubble(runnerUp.id, "可惡只差一點…大家等等睜大眼！", "suspect", 3600);
    }
    if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.triggerCameraPunch === "function") {
      stage3d.triggerCameraPunch(winner.id, { fov: 37, durationMs: 1300 });
    }
    const shortTallyCutIn = sortedCands.slice(0, 3).map(function (c) {
      const nm = c.id === pid ? (playerNumTag() + "你") : (fmtSeatNum(c.id) + c.name);
      if (sortedCands.length === 1 && (counts[c.id] || 0) === 0) return nm + " 直接當選";
      return nm + " " + (Math.round((counts[c.id] || 0) * 10) / 10) + "票";
    }).join(" · ");
    const cutInBase = wLbl + (isCloseCall ? " 險勝當選警長（1.5票＋末置位歸票）" : " 當選本局警長（1.5票＋末置位歸票）");
    const cutInSubText = [cutInBase, shortTallyCutIn ? ("開票：" + shortTallyCutIn) : "", activeFlowNote.replace(/^｜/, "")].filter(Boolean).join(" ｜ ");
    triggerCutIn(
      isCloseCall ? "👑 驚險奪下警徽" : "👑 警長誕生",
      cutInSubText,
      "gold",
      2200
    );
    addLog({
      kind: "blessing",
      title: "👑 競選開票：" + wLbl + (isCloseCall ? " 驚險當選本局警長！" : " 高票當選本局警長！") + activeFlowNote,
      text: tallySummary ? ("【警下票型・已納入排坑】" + tallySummary) : ""
    });
  }
  if (typeof doneCb === "function") doneCb();
  else updateAllUI();
  return winner;
}

function playSheriffStageReel(startIdx) {
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return false;
  if (ctx.stage === "signup" || !Array.isArray(ctx.speechOrderIds) || ctx.speechOrderIds.length === 0) {
    return startSheriffCampaignSpeeches();
  }
  const idx = typeof startIdx === "number" ? startIdx : 0;
  ctx.stage = "speech";
  ctx.speechIndex = idx - 1;
  return advanceSheriffSpeechTurn();
}

function resolveSheriffElectionAction(actionOrVoteId) {
  sound.unlock();
  const m = state.match;
  const ctx = m ? m.sheriffElectionCtx : null;
  if (!m || !ctx || m.phase !== "SHERIFF_ELECTION") return false;
  const pid = getPlayerId();
  const pSeat = getPlayerSeat();
  const withdrawingDuringAiSpeech = Boolean(
    actionOrVoteId === "withdraw" && ctx.stage === "speech" && ctx.activeReelSeatId && ctx.activeReelSeatId !== pid
  );
  if (!withdrawingDuringAiSpeech) {
    clearStepTimer();
    if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
    state.activeSpeakerId = null;
  }

  if (actionOrVoteId === "listen") {
    if (ctx.stage !== "signup") return false;
    return startSheriffCampaignSpeeches();
  }

  if (actionOrVoteId === "run") {
    if (!pSeat || !pSeat.alive || ctx.playerWithdrew || ctx.playerRunning) return false;
    ctx.playerRunning = true;
    if (ctx.candidateIds.indexOf(pid) === -1) {
      ctx.candidateIds.push(pid);
      ctx.candidateIds.sort(function (a, b) { return a - b; });
    }
    if (!Array.isArray(ctx.dramaEvents)) ctx.dramaEvents = [];
    if (!Array.isArray(ctx.withdrawnIds)) ctx.withdrawnIds = [];

    // Self-driven AI withdrawal check: never forcibly boot a Real Seer or Fake Seer off the stand before speeches!
    const aiCands = ctx.candidateIds.filter(function (id) { return id !== pid; }).map(getSeat).filter(Boolean);
    const seerStandMap = {};
    (ctx.spokenSpeeches || []).forEach(function (sp) {
      if (sp && (sp.tone === "seer" || sp.tone === "clash")) seerStandMap[sp.id] = true;
    });
    const aiWillingToWithdraw = function (seat) {
      if (!seat || seerStandMap[seat.id]) return false;
      const bSnap = typeof createBlindMatchSnapshot === "function" ? createBlindMatchSnapshot(seat, { module: "sheriff_withdraw" }) : null;
      const bSelf = (bSnap && bSnap.self) ? bSnap.self : seat;
      return bSelf.role !== "seer" && !(bSelf.role === "wolf" && bSelf.fakeSeer);
    };
    const nonSeerAi = aiCands.slice().reverse().find(aiWillingToWithdraw);
    const seerClaimRival = aiCands.find(function (c) { return Boolean(seerStandMap[c.id]); });
    if (nonSeerAi && aiCands.length >= 3) {
      ctx.candidateIds = ctx.candidateIds.filter(function (id) { return id !== nonSeerAi.id; });
      ctx.withdrawnIds.push(nonSeerAi.id);
      const wLine = "🏳 戲劇退水！" + fmtSeatNum(nonSeerAi.id) + "號" + nonSeerAi.name + " 見你氣勢逼人，當場舉手退水：「好傢伙，你上警氣場這麼強，我先退水去警下聽你表現！」";
      ctx.dramaEvents.unshift(wLine);
      if (typeof setSeatEmotion === "function") setSeatEmotion(nonSeerAi.id, "shock", 3400);
      if (typeof setSeatBubble === "function") setSeatBubble(nonSeerAi.id, "氣勢好強！我先退水觀戰～", "trust", 3800);
      addLog({ kind: "system", title: wLine, text: "" });
    } else if (seerClaimRival) {
      const rLine = "⚡ 警上交鋒！" + fmtSeatNum(seerClaimRival.id) + "號" + seerClaimRival.name + " 立刻皺眉回擊：「你突然跳上警想搶警徽？大家先聽清楚再決定！」";
      ctx.dramaEvents.unshift(rLine);
      if (typeof setSeatEmotion === "function") setSeatEmotion(seerClaimRival.id, "proud", 3400);
      if (typeof setSeatBubble === "function") setSeatBubble(seerClaimRival.id, "你也上警搶徽？來正面對決！", "suspect", 3800);
      if (typeof spawnBeam === "function") spawnBeam(seerClaimRival.id, pid, "#f43f5e", "clash");
    } else if (aiCands[0]) {
      const rival = aiCands[0];
      const rLine = "🔥 " + fmtSeatNum(rival.id) + "號" + rival.name + " 迎戰回話：「歡迎上警正面較量！等等依序發言見真章！」";
      ctx.dramaEvents.unshift(rLine);
      if (typeof setSeatEmotion === "function") setSeatEmotion(rival.id, "proud", 3200);
      if (typeof setSeatBubble === "function") setSeatBubble(rival.id, "來啊，依序發言比一場！", "suspect", 3600);
    }

    sound.tone(640, 0.10, "triangle", 0.06, 0);
    sound.tone(820, 0.12, "triangle", 0.05, 0.07);
    if (typeof spawnBurst === "function") spawnBurst(pid, ["#fbbf24", "#ffffff"], 14, "star");
    if (typeof spawnFx === "function") spawnFx(pid, "🙋 強勢上警!", "#fbbf24", { scale: 1.1, durationMs: 1200 });
    addLog({ kind: "system", title: "🙋 你已舉手上警競選警長！現依座號順序開始警上輪流發言。", text: "" });
    startSheriffCampaignSpeeches();
    return true;
  }

  if (actionOrVoteId === "withdraw") {
    if (!ctx.playerRunning) return false;
    const wasPlayerTurn = Boolean(ctx.stage === "speech" && ctx.activeReelSeatId === pid);
    const oldOrder = Array.isArray(ctx.speechOrderIds) ? ctx.speechOrderIds : [];
    const oldPidIdx = oldOrder.indexOf(pid);
    ctx.playerRunning = false;
    ctx.playerWithdrew = true;
    if (wasPlayerTurn) {
      ctx.activeReelSeatId = null;
    }
    ctx.candidateIds = ctx.candidateIds.filter(function (id) { return id !== pid; });
    ctx.speechOrderIds = oldOrder.filter(function (id) { return id !== pid; });
    if (oldPidIdx !== -1 && typeof ctx.speechIndex === "number" && oldPidIdx <= ctx.speechIndex) {
      ctx.speechIndex = Math.max(-1, ctx.speechIndex - 1);
    }
    ctx.speeches = (ctx.speeches || []).filter(function (sp) { return sp.id !== pid; });
    ctx.spokenSpeeches = (ctx.spokenSpeeches || []).filter(function (sp) { return sp.id !== pid; });
    if (m.sheriffBadgeFlowsBySeat) delete m.sheriffBadgeFlowsBySeat[pid];
    if (!Array.isArray(ctx.withdrawnIds)) ctx.withdrawnIds = [];
    if (ctx.withdrawnIds.indexOf(pid) === -1) ctx.withdrawnIds.push(pid);
    if (!Array.isArray(ctx.dramaEvents)) ctx.dramaEvents = [];
    const topAi = ctx.candidateIds.map(getSeat).filter(Boolean)[0];
    if (topAi) {
      const smirkLine = "😏 " + fmtSeatNum(topAi.id) + "號" + topAi.name + " 笑道：「哈哈，詐完身分退水了嗎？那這枚警徽我就笑納囉！」";
      ctx.dramaEvents.unshift(smirkLine);
      if (typeof setSeatEmotion === "function") setSeatEmotion(topAi.id, "proud", 3200);
      if (typeof setSeatBubble === "function") setSeatBubble(topAi.id, "退水了？警徽我收下囉！", "suspect", 3600);
    }
    sound.tone(420, 0.12, "sine", 0.05, 0);
    addLog({ kind: "system", title: "🏳 你華麗退水回到警下，稍後可參與警下投票決選。", text: "" });
    if (wasPlayerTurn) {
      advanceSheriffSpeechTurn();
    } else {
      updateAllUI();
    }
    return true;
  }

  if (actionOrVoteId === "pass") {
    ctx.activeReelSeatId = null;
    finalizeSheriffElectionWinner(ctx.playerRunning ? pid : null);
    return true;
  }

  const voteId = typeof actionOrVoteId === "number" ? actionOrVoteId : parseInt(actionOrVoteId, 10);
  if (!pSeat || !pSeat.alive) return false;
  if (ctx.playerRunning && voteId && voteId !== pid) return false;
  if (voteId && ctx.candidateIds.indexOf(voteId) !== -1) {
    ctx.activeReelSeatId = null;
    finalizeSheriffElectionWinner(voteId);
    return true;
  }
  return false;
}

function startSheriffOrderPick(arg) {
  const m = state.match;
  if (!m || !m.started || m.phase === "GAME_OVER") return false;
  const sh = (m && m.sheriffSeatId) ? getSeat(m.sheriffSeatId) : null;
  const onPicked = typeof arg === "function"
    ? arg
    : function (dir) {
      startDayDiscussion(typeof arg === "string" ? arg : "", dir ? { forcedDir: dir } : undefined);
    };
  const ffOrd = typeof isSpectatorFastForward === "function" && isSpectatorFastForward();
  if (!state.sheriffMode || !sh || !sh.alive || sh.id !== getPlayerId() || ffOrd) {
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
  if (typeof voice !== "undefined" && typeof voice.stop === "function") voice.stop();
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
