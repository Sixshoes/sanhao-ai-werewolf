/**
 * 圓桌舞台座位層：動態 6/8 座位座標計算、關係連線、發言者聚光燈錐與角色頭像物理繪製
 */
"use strict";

function computeStageSeatCoords(f) {
  const { dpr, cx, cy, rx, ry } = f;

  // 4. Seat Positions (Dynamic 6 / 8 / 10 / 12 seats even in Lobby!)
  const lobbySeatsN = typeof getLobbySeatCount === "function" ? getLobbySeatCount() : ((el("selectModeCount") && parseInt(el("selectModeCount").value, 10)) || 8);
  const seats = state.match.started
    ? state.match.seats
    : Array.from({ length: lobbySeatsN }, function (_, idx) {
        const n = idx + 1;
        const pInfo = n === 1 ? null : (AI_PERSONAS[n - 2] || AI_PERSONAS[0]);
        return { id: n, name: n === 1 ? "你" : pInfo.name, color: n === 1 ? "#f5b942" : pInfo.avatarColor, alive: true, role: "villager", microPulse: 22 };
      });

  const coords = [];
  const nSeats = seats.length;
  const seatR = (nSeats >= 12 ? 20 : (nSeats >= 10 ? 22.5 : 26)) * dpr;
  for (let i = 0; i < nSeats; i++) {
    const angle = Math.PI * 0.5 + (i * Math.PI * 2) / nSeats;
    const deg = Math.round(((angle * 180) / Math.PI) % 360);
    coords.push({
      id: seats[i].id,
      angle: angle,
      deg: deg,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      r: seatR,
      seat: seats[i]
    });
  }
  state.seatCoords = coords;
  return coords;
}

function drawStageSeats(ctx, f, coords) {
  const { nowMs, w, h, dpr, p, night, daylight, cx, cy, tSec } = f;

  // Subtle polar radial vectors from O(0,0) to each P_k
  ctx.save();
  ctx.strokeStyle = daylight ? "rgba(180, 83, 9, 0.14)" : (night ? "rgba(167, 139, 250, 0.14)" : "rgba(56, 189, 248, 0.13)");
  ctx.lineWidth = 1 * dpr;
  ctx.setLineDash([3 * dpr, 4 * dpr]);
  coords.forEach(function (c) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  });
  ctx.restore();

  // Night Spotlight Beam on Selected Seat!
  if (night && state.selectedSeatId) {
    const selNode = coords.find(function (c) { return c.id === state.selectedSeatId; });
    if (selNode) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(selNode.x - 18 * dpr, selNode.y);
      ctx.lineTo(selNode.x + 18 * dpr, selNode.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(196, 181, 253, 0.18)";
      ctx.fill();
      ctx.restore();
    }
  }

  // 5. Relationship Lines
  if (state.showRelationsOnCanvas && state.match.relations.length >0) {
    state.match.relations.slice(-9).forEach(function (rel) {
      const fromC = coords.find(function (c) { return c.id === rel.fromId; });
      const toC = coords.find(function (c) { return c.id === rel.toId; });
      if (!fromC || !toC) return;
      ctx.save();
      ctx.beginPath();
      const midX = (fromC.x + toC.x) * 0.5 + (cy - (fromC.y + toC.y) * 0.5) * 0.14;
      const midY = (fromC.y + toC.y) * 0.5 - (cx - (fromC.x + toC.x) * 0.5) * 0.14;
      ctx.moveTo(fromC.x, fromC.y);
      ctx.quadraticCurveTo(midX, midY, toC.x, toC.y);
      ctx.strokeStyle = rel.type === "trust"
        ? (daylight ? "rgba(5, 150, 105, 0.78)" : "rgba(52, 211, 153, 0.75)")
        : rel.type === "vote"
        ? (daylight ? "rgba(217, 119, 6, 0.8)" : "rgba(251, 191, 36, 0.68)")
        : (daylight ? "rgba(225, 29, 72, 0.78)" : "rgba(244, 63, 94, 0.75)");
      if (rel.type === "vote") ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.lineWidth = 2.4 * dpr;
      ctx.stroke();
      ctx.restore();
    });
  }

  // 5.5 Focused Stage Spotlight Cone & Directional Tether UNDER Active Speaker Seat!
  if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH" || p === "SHERIFF_ELECTION") && state.activeSpeakerId) {
    const spNode = coords.find(function (c) { return c.id === state.activeSpeakerId; });
    if (spNode && (spNode.seat.alive || p === "LAST_WORDS_SPEECH")) {
      ctx.save();
      const dx = spNode.x - cx;
      const dy = spNode.y - cy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const px = (-dy / len) * 26 * dpr;
      const py = (dx / len) * 26 * dpr;

      const beam = ctx.createLinearGradient(cx, cy, spNode.x, spNode.y);
      beam.addColorStop(0, daylight ? "rgba(245, 158, 11, 0.06)" : "rgba(251, 191, 36, 0.06)");
      beam.addColorStop(1, daylight ? "rgba(245, 158, 11, 0.38)" : "rgba(251, 191, 36, 0.36)");
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(spNode.x + px, spNode.y + py);
      ctx.lineTo(spNode.x - px, spNode.y - py);
      ctx.closePath();
      ctx.fillStyle = beam;
      ctx.fill();

      // Oscillating Fourier Sine-Wave Carrier: y(s) = A·sin(k·s - ωt) connecting speaker to center!
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const startFrac = 0.28;
      const waveSteps = 36;
      const amp = (state.typewriter.active || voice.speaking) ? (6.5 * dpr) : (2.2 * dpr);
      ctx.beginPath();
      for (let wi = 0; wi <= waveSteps; wi++) {
        const s = startFrac + (wi / waveSteps) * (1 - startFrac);
        const env = Math.sin((wi / waveSteps) * Math.PI);
        const osc = Math.sin((wi / waveSteps) * Math.PI * 6 - nowMs * 0.014) * amp * env;
        const wx = cx + dx * s + nx * osc;
        const wy = cy + dy * s + ny * osc;
        if (wi === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = spNode.seat.color || (daylight ? "#d97706" : "#fbbf24");
      ctx.lineWidth = 2.8 * dpr;
      ctx.stroke();

      // Traveling voice signal dot from speaker toward center stage
      const travel = 1 - ((nowMs * 0.0016) % 1);
      const dotX = cx + dx * (0.32 + travel * 0.58);
      const dotY = cy + dy * (0.32 + travel * 0.58);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.2 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = daylight ? "#d97706" : "#fde047";
      ctx.fill();
      ctx.restore();
    }
  }

  // 6. Seat Avatars (Spring-Damper Physics + Live Eye Tracking + Expressive Emotions + Targeting Reticle!)
  const isOver = p === "GAME_OVER";
  const activeSpNode = state.activeSpeakerId ? coords.find(function (c) { return c.id === state.activeSpeakerId; }) : null;
  coords.forEach(function (node) {
    const s = node.seat;
    const isSelected = state.selectedSeatId === s.id;
    const isHovered = state.hoverSeatId === s.id && s.alive;
    const isDragSnap = state.dragAction.active && state.dragAction.snapId === s.id;
    const isSpeaking = (((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "SHERIFF_ELECTION") && s.alive) || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id;

    // Update elastic spring-damper physics for this seat!
    const phys = ensureSeatPhys(s.id);
    const targetScale = isDragSnap ? 1.22 : (isHovered ? 1.09 : 1.0);
    phys.vScale = (phys.vScale + (targetScale - phys.scale) * 0.22) * 0.72;
    phys.scale = clamp(phys.scale + phys.vScale, 0.75, 1.38);
    phys.vx = (phys.vx + (0 - phys.ox) * 0.20) * 0.72;
    phys.vy = (phys.vy + (0 - phys.oy) * 0.20) * 0.72;
    phys.ox += phys.vx;
    phys.oy += phys.vy;
    phys.vTilt = (phys.vTilt + (0 - phys.tilt) * 0.18) * 0.74;
    phys.tilt = clamp(phys.tilt + phys.vTilt, -0.35, 0.35);

    const sx = node.x + phys.ox * dpr;
    const sy = node.y + phys.oy * dpr;
    const baseR = isSpeaking ? node.r * 1.26 : node.r;
    const drawR = baseR * phys.scale;

    // Live Eye Gaze Target: track cursor when inside canvas, or glance at active speaker!
    let lookX = cx, lookY = cy;
    if (state.pointer.inside) {
      lookX = state.pointer.x;
      lookY = state.pointer.y;
    } else if (activeSpNode && activeSpNode.id !== s.id) {
      lookX = activeSpNode.x;
      lookY = activeSpNode.y;
    }
    const ldx = lookX - sx;
    const ldy = lookY - sy;
    const lDist = Math.max(1, Math.hypot(ldx, ldy));
    const gazeStrength = clamp(lDist / (110 * dpr), 0, 1);
    const gazeX = (ldx / lDist) * gazeStrength;
    const gazeY = (ldy / lDist) * gazeStrength;

    ctx.save();
    const latestEvForAlpha = (p === "DAY_SPEECH" && state.match.daySpeechEvents && state.match.daySpeechEvents.length > 0)
      ? state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1]
      : null;
    const isReactingTarget = Boolean(latestEvForAlpha && latestEvForAlpha.speakerId === state.activeSpeakerId && (latestEvForAlpha.accuseId === s.id || latestEvForAlpha.vouchId === s.id));
    if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN") && state.activeSpeakerId && !isSpeaking && !isSelected && !isHovered && !isDragSnap && !isReactingTarget && !state.dragAction.active) {
      ctx.globalAlpha = 0.34;
    }
    if (isSpeaking) {
      const pulseA = (nowMs * 0.0022) % 1;
      const pulseB = (nowMs * 0.0022 + 0.5) % 1;
      [pulseA, pulseB].forEach(function (pr) {
        ctx.beginPath();
        ctx.arc(sx, sy, drawR + pr * 18 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = daylight
          ? ("rgba(217, 119, 6, " + ((1 - pr) * 0.85).toFixed(2) + ")")
          : ("rgba(251, 191, 36, " + ((1 - pr) * 0.85).toFixed(2) + ")");
        ctx.lineWidth = 2.6 * dpr;
        ctx.stroke();
      });
    }

    const needsSeatPick = (
      (p === "NIGHT_SEER" && getPlayerSeat() && getPlayerSeat().alive && getPlayerSeat().role === "seer") ||
      (p === "NIGHT_WOLF" && getPlayerSeat() && getPlayerSeat().alive && getPlayerSeat().role === "wolf") ||
      (p === "DAY_VOTE" && isPlayerEligibleToVote()) ||
      (p === "HUNTER_TRIGGER" && getPlayerSeat() && getPlayerSeat().role === "hunter" && !getPlayerSeat().alive)
    );
    const seatPickAllowed = p === "DAY_VOTE" ? isValidVoteTarget(s.id) : (s.alive && s.id !== getPlayerId());
    if (needsSeatPick && seatPickAllowed && !isSelected) {
      const hintPulse = 3 + 2.5 * (0.5 + 0.5 * Math.sin(nowMs * 0.007));
      ctx.beginPath();
      ctx.arc(sx, sy, drawR + hintPulse * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = p === "DAY_VOTE" ? "rgba(244, 63, 94, 0.65)" : "rgba(56, 189, 248, 0.65)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    }
    if (isHovered && !isSelected && !isDragSnap) {
      ctx.beginPath();
      ctx.arc(sx, sy, drawR + 5 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = daylight ? "rgba(217, 119, 6, 0.65)" : "rgba(251, 191, 36, 0.65)";
      ctx.lineWidth = 2.5 * dpr;
      ctx.stroke();
    }
    // Rotating Tactical Targeting Reticle when selected or drag-snapped!
    if ((isSelected && s.alive) || isDragSnap) {
      const retR = drawR + (isDragSnap ? 9 : 6.5) * dpr;
      const retCol = isDragSnap ? "#fbbf24" : (p === "DAY_VOTE" ? "#f43f5e" : (daylight ? "#0284c7" : "#38bdf8"));
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(tSec * (isDragSnap ? 2.4 : 1.15));
      ctx.strokeStyle = retCol;
      ctx.lineWidth = (isDragSnap ? 3.2 : 2.6) * dpr;
      for (let qi = 0; qi < 4; qi++) {
        const a0 = qi * (Math.PI * 0.5) + 0.2;
        const a1 = a0 + 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, retR, a0, a1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Live Animated Character Portrait inside Seat Medallion (with spring tilt + eye gaze + emotion!)
    const seatTalking = isSpeaking && (state.typewriter.active || voice.speaking);
    const seatSleeping = !s.alive || (night && s.id !== getPlayerId());
    const latestSpEv = (p === "DAY_SPEECH" && state.match.daySpeechEvents && state.match.daySpeechEvents.length > 0)
      ? state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1]
      : null;
    const isAccusedNow = Boolean(latestSpEv && latestSpEv.speakerId === state.activeSpeakerId && latestSpEv.accuseId === s.id && s.alive);
    const isVouchedNow = Boolean(latestSpEv && latestSpEv.speakerId === state.activeSpeakerId && latestSpEv.vouchId === s.id && s.alive);
    const seatEmotion = getSeatEmotion(s.id, nowMs);
    const finalEmotion = seatEmotion !== "neutral"
      ? seatEmotion
      : (isVouchedNow ? "happy" : (isAccusedNow ? "shock" : "neutral"));
    const seatSweating = Boolean((state.match.started && s.alive && s.id !== getPlayerId() && (state.match.microPulseRevealed || s.sweatExposed) && s.microPulse >= 60) || isAccusedNow || finalEmotion === "shock");

    ctx.save();
    ctx.translate(sx, sy);
    if (Math.abs(phys.tilt) > 0.002) ctx.rotate(phys.tilt);
    drawCharacterPortrait(ctx, 0, 0, drawR, s, {
      nowMs: nowMs,
      talking: seatTalking,
      sleeping: seatSleeping,
      sweating: seatSweating,
      emotion: finalEmotion,
      gazeX: gazeX,
      gazeY: gazeY,
      daylight: daylight
    });

    // Rim color reflects Detective Mark or Role Color
    const pMark = state.playerMarks[s.id] || null;
    ctx.beginPath();
    ctx.arc(0, 0, drawR, 0, Math.PI * 2);
    ctx.lineWidth = isSpeaking ? (4.0 * dpr) : (pMark ? (3.4 * dpr) : (2.6 * dpr));
    ctx.strokeStyle = !s.alive
      ? "#94a3b8"
      : (pMark === "wolf" ? "#f43f5e" : (pMark === "good" ? "#10b981" : (s.trustShield ? "#10b981" : s.color)));
    ctx.stroke();
    ctx.restore();

    // Crisp Nameplate Pill below Portrait
    const showTruth = isOver || (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());
    const known = state.match.started && !state.hidePlayerRole
      ? (showTruth ? s.role : state.match.playerKnownRoles[s.id])
      : null;
    const pSelfCanvas = state.match.started ? getPlayerSeat() : null;
    const isWolfViewCanvas = Boolean(pSelfCanvas && pSelfCanvas.role === "wolf" && !state.hidePlayerRole);
    let plateText = fmtSeatNum(s.id) + " " + (s.id === getPlayerId() ? "你" : s.name);
    if (!s.alive) plateText = (showTruth && ROLE_DEFS[s.role]) ? (fmtSeatNum(s.id) + " " + ROLE_DEFS[s.role].name) : (fmtSeatNum(s.id) + " 休息");
    else if (known === "wolf") plateText = fmtSeatNum(s.id) + (isWolfViewCanvas && s.id !== getPlayerId() ? " 狼同伴" : " 酸民狼");
    else if (known === "good_verified") plateText = fmtSeatNum(s.id) + " 好人";
    else if (known && ROLE_DEFS[known] && showTruth) plateText = fmtSeatNum(s.id) + " " + ROLE_DEFS[known].name;
    else if (pMark === "wolf") plateText = fmtSeatNum(s.id) + (isWolfViewCanvas ? " 甩鍋" : " 懷疑");
    else if (pMark === "good") plateText = fmtSeatNum(s.id) + (isWolfViewCanvas ? " 假保" : " 信任");

    const plateW = Math.max(48 * dpr, (plateText.length * 8.2 + 12) * dpr);
    const plateH = 16 * dpr;
    const plateY = sy + drawR - 6 * dpr;
    drawRoundedRect(ctx, sx - plateW * 0.5, plateY, plateW, plateH, 7 * dpr);
    ctx.fillStyle = !s.alive
      ? (daylight ? "rgba(226, 232, 240, 0.92)" : "rgba(15, 23, 42, 0.85)")
      : (known === "wolf" || pMark === "wolf"
        ? "#e11d48"
        : (known === "good_verified" || pMark === "good"
          ? "#059669"
          : (daylight ? "rgba(255, 253, 245, 0.95)" : "rgba(15, 23, 42, 0.92)")));
    ctx.fill();
    ctx.lineWidth = 1.2 * dpr;
    ctx.strokeStyle = !s.alive ? "#94a3b8" : (isSpeaking ? "#f59e0b" : s.color);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 " + Math.round(9.5 * dpr) + "px 'Inter', 'Noto Sans TC', sans-serif";
    ctx.fillStyle = (!s.alive)
      ? "#64748b"
      : ((known === "wolf" || known === "good_verified" || pMark) ? "#ffffff" : (daylight ? "#0f172a" : "#f8fafc"));
    ctx.fillText(plateText, sx, plateY + plateH * 0.53);

    // High-contrast solid pill badge right on the active speaker's seat!
    if (isSpeaking) {
      const activelyTalking = (state.typewriter.active || voice.speaking);
      const pillText = activelyTalking ? "發言中..." : "剛講完";
      const pillW = 56 * dpr;
      const pillH = 17 * dpr;
      const placeBelow = (sy - drawR - pillH - 8 * dpr) < (6 * dpr);
      const pillY = placeBelow ? (sy + drawR + 6 * dpr) : (sy - drawR - pillH - 6 * dpr);
      drawRoundedRect(ctx, sx - pillW * 0.5, pillY, pillW, pillH, 8 * dpr);
      ctx.fillStyle = activelyTalking ? "#f59e0b" : "#10b981";
      ctx.fill();
      ctx.font = "900 " + Math.round(10 * dpr) + "px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(pillText, sx, pillY + pillH * 0.53);
    } else if (isAccusedNow || isVouchedNow) {
      const rPillText = isAccusedNow ? "被點名!" : "被力挺";
      const rPillW = 48 * dpr;
      const rPillH = 15 * dpr;
      const rPillY = sy - drawR - rPillH - 5 * dpr;
      drawRoundedRect(ctx, sx - rPillW * 0.5, rPillY, rPillW, rPillH, 7 * dpr);
      ctx.fillStyle = isAccusedNow ? "#f43f5e" : "#10b981";
      ctx.fill();
      ctx.font = "900 " + Math.round(9.5 * dpr) + "px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(rPillText, sx, rPillY + rPillH * 0.53);
    } else if (state.match.started && s.alive && s.id !== getPlayerId() && (state.match.microPulseRevealed || s.sweatExposed)) {
      ctx.font = "900 " + Math.round(10 * dpr) + "px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = s.microPulse >= 60 ? (daylight ? "#be123c" : "#fda4af") : (daylight ? "#047857" : "#6ee7b7");
      ctx.fillText("心虛 " + s.microPulse + "%", sx, sy - drawR - 9 * dpr);
    } else if (s.claimedRole && ROLE_DEFS[s.claimedRole] && s.alive) {
      ctx.font = "900 " + Math.round(10 * dpr) + "px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = daylight ? "#b45309" : "#fde68a";
      ctx.fillText("跳" + ROLE_DEFS[s.claimedRole].name, sx, sy - drawR - 9 * dpr);
    }
    ctx.restore();
  });
}
