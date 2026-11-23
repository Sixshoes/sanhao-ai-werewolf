/**
 * 3D 人物骨架動作、表情繪製與座標投影引擎
 * 支援：雙節手臂拍桌／指認／防禦／舉手投票／三好共鳴歡呼、即時音量驅動口型、
 * 天黑低頭閉眼、3D 秘密底牌翻牌動畫與 2D 畫面投影同步
 */
"use strict";

let _animScratch = null;
function getAnimScratch() {
  if (!_animScratch && typeof THREE !== "undefined" && typeof THREE.Vector3 === "function") {
    _animScratch = {
      projVec: new THREE.Vector3(),
      projEdgeVec: new THREE.Vector3(),
      camRight: new THREE.Vector3(),
      seatWorldMap: {}
    };
  }
  return _animScratch;
}

function draw3DFaceCanvas(ctx, seat, st, opts) {
  const w = 512;
  const h = 512;
  const t = (opts.nowMs || 0) * 0.001;
  const alive = seat.alive !== false;
  const sleeping = Boolean(opts.sleeping) || !alive;
  const talking = Boolean(opts.talking) && alive;
  const sweating = Boolean(opts.sweating) && alive;
  const emotion = opts.emotion || "neutral";
  const gx = clamp(Number(opts.gazeX) || 0, -1, 1);
  const gy = clamp(Number(opts.gazeY) || 0, -1, 1);
  const seed = seat.id * 1.7;

  // Transparent 512x512 Genshin anime face canvas over sculpted V-jaw porcelain head (0% seam!)
  ctx.clearRect(0, 0, w, h);

  if (alive) {
    // Soft diffused anime peach-rose cheek blush + twin subtle highlight slashes
    const blushA = (emotion === "happy" || emotion === "laugh") ? 0.44 : 0.24;
    [138, 374].forEach(function (bx) {
      const bg = ctx.createRadialGradient(bx, 304, 4, bx, 304, 58);
      bg.addColorStop(0, "rgba(242, 126, 124, " + blushA + ")");
      bg.addColorStop(1, "rgba(242, 126, 124, 0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(bx, 304, 58, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 224, 220, " + (blushA * 0.65) + ")";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(bx - 16, 298);
      ctx.lineTo(bx - 8, 308);
      ctx.moveTo(bx + 2, 298);
      ctx.lineTo(bx + 10, 308);
      ctx.stroke();
    });
  }

  const eyeY = 234;
  const leftX = 178;
  const rightX = 334;
  const blinkCycle = (t + seed * 0.7) % 3.6;
  const isBlinking = !sleeping && emotion !== "shock" && emotion !== "nervous" && blinkCycle > 3.46;
  const isCurvedLash = st.lash === "curved";

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (sleeping) {
    ctx.strokeStyle = alive ? "#3b2c26" : "#475569";
    ctx.lineWidth = 8.8;
    [leftX, rightX].forEach(function (ex) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 6, 28, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
    });
  } else if (emotion === "happy" || emotion === "proud" || emotion === "laugh") {
    ctx.strokeStyle = "#2b1b17";
    ctx.lineWidth = emotion === "laugh" ? 10.5 : 9.2;
    [leftX, rightX].forEach(function (ex) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 14, emotion === "laugh" ? 30 : 28, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
  } else if (isBlinking) {
    ctx.strokeStyle = "#2b1b17";
    ctx.lineWidth = 8.4;
    [leftX, rightX].forEach(function (ex) {
      ctx.beginPath();
      ctx.moveTo(ex - 28, eyeY + 5);
      ctx.quadraticCurveTo(ex, eyeY + 14, ex + 28, eyeY + 5);
      ctx.stroke();
    });
  } else {
    const rx = (emotion === "shock" || emotion === "nervous") ? 34 : 31;
    const ry = (emotion === "shock" || emotion === "nervous") ? 38 : (isCurvedLash ? 36 : 31);
    const dartX = emotion === "nervous" ? Math.sin(t * 9 + seed) * 0.85 : gx;
    const eyeTone = st.eye || "#3a251b";
    const eyeGlow = st.hairHi || "#e6b873";

    [leftX, rightX].forEach(function (ex, idx) {
      const sideSign = idx === 0 ? -1 : 1;

      // Upper double-eyelid crease line (hallmark anime eye depth!)
      ctx.strokeStyle = "rgba(128, 78, 66, 0.55)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(ex, eyeY - 4, rx + 6, Math.PI * 1.16, Math.PI * 1.84);
      ctx.stroke();

      // Luminous porcelain sclera with subtle cool upper lid shadow
      ctx.fillStyle = "#fffefa";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180, 190, 215, 0.24)";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - ry * 0.34, rx * 0.96, ry * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clip iris cleanly inside sclera
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, rx - 1, ry - 1, 0, 0, Math.PI * 2);
      ctx.clip();

      const px = ex + dartX * 8.5;
      const py = eyeY + 2 + gy * 6.0;
      const ir = emotion === "shock" ? 15.5 : (isCurvedLash ? 24.0 : 21.5);

      // Multi-stop Genshin gemstone iris gradient
      const irisGrad = ctx.createLinearGradient(px, py - ir, px, py + ir);
      irisGrad.addColorStop(0.0, "#120c0c");
      irisGrad.addColorStop(0.32, eyeTone);
      irisGrad.addColorStop(0.74, eyeTone);
      irisGrad.addColorStop(1.0, eyeGlow);
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, ir * 0.92, ir * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luminous lower gemstone crescent
      ctx.fillStyle = eyeGlow;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(px, py + ir * 0.46, ir * 0.62, ir * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Crisp dark pupil
      ctx.fillStyle = "#100a09";
      ctx.beginPath();
      ctx.arc(px, py - 1, ir * 0.43, 0, Math.PI * 2);
      ctx.fill();

      // Bright anime diamond & twin pearl specular catchlights
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px - ir * 0.36, py - ir * 0.38, ir * 0.31, 0, Math.PI * 2);
      ctx.arc(px + ir * 0.32, py + ir * 0.34, ir * 0.14, 0, Math.PI * 2);
      ctx.arc(px + ir * 0.30, py - ir * 0.44, ir * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bold tapered upper anime lash line + outer wing
      ctx.strokeStyle = "#201311";
      ctx.lineWidth = isCurvedLash ? 9.5 : 8.2;
      ctx.beginPath();
      ctx.arc(ex, eyeY + 2, rx + 1, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      ctx.lineWidth = isCurvedLash ? 6.2 : 5.0;
      ctx.beginPath();
      ctx.moveTo(ex + sideSign * (rx - 2), eyeY - 5);
      ctx.lineTo(ex + sideSign * (rx + 10), eyeY - 14);
      ctx.stroke();

      // Subtle delicate lower lash shadow arc
      ctx.strokeStyle = "rgba(56, 36, 32, 0.42)";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(ex, eyeY + 2, rx - 1, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
    });
  }

  // Expressive clean tapered anime eyebrows
  const browLift = (talking || emotion === "shock" || emotion === "nervous") ? -12 : ((emotion === "happy" || emotion === "laugh") ? -8 : 0);
  const browY = eyeY - 54 + browLift;
  ctx.strokeStyle = st.hair || "#2b1d17";
  ctx.lineWidth = isCurvedLash ? 6.8 : 8.4;
  ctx.beginPath();
  if (emotion === "angry" || emotion === "suspect") {
    ctx.moveTo(leftX - 28, browY - 6);
    ctx.lineTo(leftX + 26, browY + 10);
    ctx.moveTo(rightX - 26, browY + 10);
    ctx.lineTo(rightX + 28, browY - 6);
  } else if (emotion === "nervous") {
    ctx.moveTo(leftX - 26, browY + 8);
    ctx.lineTo(leftX + 26, browY - 8);
    ctx.moveTo(rightX - 26, browY - 8);
    ctx.lineTo(rightX + 26, browY + 8);
  } else {
    ctx.moveTo(leftX - 26, browY + 4);
    ctx.quadraticCurveTo(leftX, browY - 8, leftX + 26, browY + 4);
    ctx.moveTo(rightX - 26, browY + 4);
    ctx.quadraticCurveTo(rightX, browY - 8, rightX + 26, browY + 4);
  }
  ctx.stroke();

  // Warm natural anime mouth + live voice lip-sync with subtle upper highlight
  const mouthY = 354;
  ctx.strokeStyle = "#8a4238";
  ctx.fillStyle = "#b5494c";
  ctx.lineWidth = 6.8;
  if (talking) {
    const liveAmp = (typeof voice !== "undefined" && typeof voice.getLiveMouthLevel === "function")
      ? voice.getLiveMouthLevel(seat.id, opts.nowMs || 0)
      : (0.4 + Math.abs(Math.sin(t * 16 + seed)) * 0.6);
    const openH = 6.5 + liveAmp * 25.0;
    const openW = 19 + liveAmp * 9;
    ctx.beginPath();
    ctx.ellipse(256, mouthY, openW, openH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f28b8d";
    ctx.beginPath();
    ctx.ellipse(256, mouthY + openH * 0.38, openW * 0.65, openH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === "laugh") {
    ctx.beginPath();
    ctx.arc(256, mouthY - 10, 30, 0.10 * Math.PI, 0.90 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (emotion === "nervous") {
    ctx.beginPath();
    ctx.moveTo(222, mouthY + 4);
    ctx.quadraticCurveTo(239, mouthY - 6, 256, mouthY + 4);
    ctx.quadraticCurveTo(273, mouthY + 10, 290, mouthY + 2);
    ctx.stroke();
  } else if (emotion === "shock") {
    ctx.beginPath();
    ctx.ellipse(256, mouthY + 4, 17, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === "happy" || emotion === "proud") {
    ctx.beginPath();
    ctx.arc(256, mouthY - 8, 28, Math.PI * 0.14, Math.PI * 0.86);
    ctx.stroke();
  } else if (!alive || sleeping) {
    ctx.beginPath();
    ctx.moveTo(236, mouthY);
    ctx.lineTo(276, mouthY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(256, mouthY - 10, 22, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }

  // Translucent glossy nervous sweat droplet (gameplay tell!)
  if (sweating || emotion === "nervous") {
    const dropY = 156 + ((t * (emotion === "nervous" ? 84 : 52)) % 46);
    ctx.fillStyle = "rgba(104, 198, 245, 0.92)";
    ctx.beginPath();
    ctx.moveTo(404, dropY - 22);
    ctx.quadraticCurveTo(424, dropY + 8, 404, dropY + 22);
    ctx.quadraticCurveTo(384, dropY + 8, 404, dropY - 22);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.beginPath();
    ctx.arc(398, dropY, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getStageSeatListFor3D() {
  const inLobbyShowcase = Boolean(typeof stage3d !== "undefined" && stage3d.showcaseMode && !(state.match && state.match.started));
  const lobbySeatsN = inLobbyShowcase
    ? 12
    : (typeof getLobbySeatCount === "function" ? getLobbySeatCount() : ((el("selectModeCount") && parseInt(el("selectModeCount").value, 10)) || 8));
  return state.match.started
    ? state.match.seats
    : Array.from({ length: lobbySeatsN }, function (_, idx) {
      const n = idx + 1;
      const pInfo = n === 1 ? null : (AI_PERSONAS[n - 2] || AI_PERSONAS[0]);
      return {
        id: n,
        name: n === 1 ? "你" : pInfo.name,
        color: n === 1 ? "#f5b942" : pInfo.avatarColor,
        alive: true,
        role: "villager",
        microPulse: 22
      };
    });
}

function update3DSeats(pool, camera, f, canvasW, canvasH, fx3d, camPreset) {
  const seats = getStageSeatListFor3D();
  const nSeats = seats.length;
  const tLayout = typeof get3DTableLayout === "function"
    ? get3DTableLayout(nSeats)
    : { ringRadius: nSeats >= 12 ? 5.52 : (nSeats >= 10 ? 4.98 : (nSeats >= 8 ? 4.44 : 4.18)), propZ: nSeats >= 12 ? 1.66 : (nSeats >= 10 ? 1.64 : 1.62) };
  const ringRadius = tLayout.ringRadius;
  const propBaseZ = tLayout.propZ;
  const t = f.tSec;
  const p = f.p;
  const nowMs = f.nowMs;
  const pid = getPlayerId();
  pool.frameCounter += 1;

  Object.keys(pool.slots).forEach(function (k) {
    const id = parseInt(k, 10);
    const exists = seats.some(function (s) { return s.id === id; });
    if (pool.slots[k]) pool.slots[k].root.visible = exists;
  });

  const dayEvs = (state.match && state.match.daySpeechEvents) || [];
  const latestSpEv = (state.activeSpeakerId && dayEvs.length) ? dayEvs[dayEvs.length - 1] : null;
  const activeAccuseTargetId = (latestSpEv && latestSpEv.speakerId === state.activeSpeakerId && latestSpEv.accuseId)
    ? latestSpEv.accuseId
    : null;
  const activeVouchTargetId = (latestSpEv && latestSpEv.speakerId === state.activeSpeakerId && !latestSpEv.accuseId && latestSpEv.vouchId)
    ? latestSpEv.vouchId
    : null;
  const activeClaimRole = (latestSpEv && latestSpEv.speakerId === state.activeSpeakerId && latestSpEv.claimRole)
    ? latestSpEv.claimRole
    : null;
  const activeFocusSeatId = activeAccuseTargetId || activeVouchTargetId || null;
  const glanceAtFocus = Boolean(activeFocusSeatId && (nowMs % 3800) > 1750);
  const isCelebration = (p === "GAME_OVER" && state.match.winner === "good");

  const sc = getAnimScratch();
  const seatWorldMap = sc ? sc.seatWorldMap : {};
  let seatSig = nSeats + "|" + (state.match && state.match.started ? 1 : 0) + "|" + (state.playerGender || "f") + "|" + ((typeof stage3d !== "undefined" && stage3d.avatarManifest) ? Object.keys(stage3d.avatarManifest).length : 0);
  for (let i = 0; i < nSeats; i++) {
    const s = seats[i];
    const angle = Math.PI * 0.5 + (i * Math.PI * 2) / nSeats;
    const vx = Math.cos(angle) * ringRadius;
    const vz = Math.sin(angle) * ringRadius;
    if (seatWorldMap[s.id]) seatWorldMap[s.id].set(vx, 0, vz);
    else seatWorldMap[s.id] = new THREE.Vector3(vx, 0, vz);
    seatSig += "|" + s.id + ":" + s.name;
  }

  const coords = [];
  const nextAnchors = {};
  const hitMeshes = [];
  const candleHitMeshes = [];
  let playerCardHit = null;
  const projVec = sc ? sc.projVec : new THREE.Vector3();
  const projEdgeVec = sc ? sc.projEdgeVec : new THREE.Vector3();
  const camRight = (sc ? sc.camRight.set(1, 0, 0) : new THREE.Vector3(1, 0, 0)).applyQuaternion(camera.quaternion);

  const isVoteMood = (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT");
  const curMoodKey = f.daylight ? (isVoteMood ? "vote" : "day") : (f.night ? "night" : "twilight");
  // Ensure every active seat slot (including newly expanded 9–12 seats in 10p/12p or Showcase) exists BEFORE syncing VRM avatars!
  for (let siEnsure = 0; siEnsure < nSeats; siEnsure++) {
    const se = seats[siEnsure];
    if (!pool.slots[se.id]) {
      pool.slots[se.id] = create3DSeatActor(se);
      pool.root.add(pool.slots[se.id].root);
    }
  }
  if (typeof stage3d !== "undefined" && typeof stage3d.syncSeatAvatars === "function" && pool._lastSyncSig !== seatSig) {
    pool._lastSyncSig = seatSig;
    stage3d.syncSeatAvatars(seats);
  }

  for (let i = 0; i < nSeats; i++) {
    const s = seats[i];
    if (!pool.slots[s.id]) {
      pool.slots[s.id] = create3DSeatActor(s);
      pool.root.add(pool.slots[s.id].root);
    }
    const actor = pool.slots[s.id];
    actor.root.visible = true;

    const pos = seatWorldMap[s.id];
    const isSelf = s.id === pid;
    const hideSelfBodyInFP = isSelf && camPreset === "firstperson";
    actor.figureGroup.visible = !hideSelfBodyInFP;
    actor.chairGroup.visible = !hideSelfBodyInFP;
    if (actor.plaqueMesh) actor.plaqueMesh.visible = !hideSelfBodyInFP;
    if (actor.vrmMountGroup) actor.vrmMountGroup.visible = Boolean(actor.useVrm && actor.vrmAvatar && !hideSelfBodyInFP);

    const isSelected = state.selectedSeatId === s.id;
    const isHovered = state.hoverSeatId === s.id && s.alive;
    const isDragSnap = state.dragAction.active && state.dragAction.snapId === s.id;
    const isSpeaking = (((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "SHERIFF_ELECTION") && s.alive) || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id;
    const isSilentSpeechWindow = Boolean(state.activeSpeechAnimUntil && nowMs < state.activeSpeechAnimUntil);
    const isTalkingNow = isSpeaking && Boolean(state.typewriter.active || voice.speaking || isSilentSpeechWindow);
    const isVotingNow = (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT") && s.alive;
    const isBeingAccusedNow = Boolean(s.alive && activeAccuseTargetId === s.id && state.activeSpeakerId && state.activeSpeakerId !== s.id);
    let liveAmp = isTalkingNow && typeof voice !== "undefined" ? voice.getLiveMouthLevel(s.id, nowMs) : 0;
    if (isTalkingNow && liveAmp < 0.08) {
      liveAmp = clamp(0.32 + Math.abs(Math.sin(t * 11.4 + s.id * 1.9)) * 0.42 + Math.abs(Math.sin(t * 4.7 + s.id)) * 0.18, 0.18, 0.85);
    }

    // Shared spring-damper physics
    const phys = ensureSeatPhys(s.id);
    const targetScale = isDragSnap ? 1.15 : (isHovered ? 1.06 : 1.0);
    phys.vScale = (phys.vScale + (targetScale - phys.scale) * 0.22) * 0.72;
    phys.scale = clamp(phys.scale + phys.vScale, 0.82, 1.32);
    phys.vx = (phys.vx + (0 - phys.ox) * 0.20) * 0.72;
    phys.vy = (phys.vy + (0 - phys.oy) * 0.20) * 0.72;
    phys.ox = clamp(phys.ox + phys.vx, -20, 20);
    phys.oy = clamp(phys.oy + phys.vy, -20, 20);
    phys.vTilt = (phys.vTilt + (0 - phys.tilt) * 0.18) * 0.72;
    phys.tilt = clamp(phys.tilt + phys.vTilt, -0.4, 0.4);

    // Smooth Farewell Out-Slide & Bow Transition when Eliminated
    actor.outFade += ((s.alive ? 0 : 1) - actor.outFade) * 0.08;
    const radialOut = 1.0 + actor.outFade * 0.14;
    actor.root.position.set(pos.x * radialOut, -actor.outFade * 0.12, pos.z * radialOut);
    const baseFacingY = Math.atan2(-pos.x, -pos.z);
    actor.root.rotation.y = baseFacingY;

    // Anchor tabletop props (plaque, candle, teacup, mark crystal, ID card) firmly ON the ergonomic walnut table across 6/8/10/12 seats AND eliminated slide-out!
    if (actor.tablePropGroup) {
      actor.tablePropGroup.position.set(0, 1.07 + actor.outFade * 0.12, propBaseZ + ringRadius * (radialOut - 1.0));
    }

    const breath = s.alive ? Math.sin(t * 2.2 + s.id * 1.1) * 0.025 : 0;
    const leanIn = isSpeaking ? (0.14 + liveAmp * 0.08) : (isBeingAccusedNow ? -0.14 : (isHovered ? 0.07 : (!s.alive ? 0.22 * actor.outFade : 0)));
    actor.figureGroup.position.y = 0.72 + breath + Math.max(0, -phys.oy * 0.015);
    actor.figureGroup.rotation.x = leanIn;
    actor.figureGroup.rotation.z = phys.tilt * 0.45;
    actor.figureGroup.scale.setScalar(phys.scale);

    // Wolf Night Partner Secret Eye-Contact (stays awake & looks directly at player when player is Wolf at Night!)
    const playerSeatObj = getPlayerSeat();
    const isWolfNightMate = Boolean(f.night && p === "NIGHT_WOLF" && s.alive && s.role === "wolf" && !isSelf && playerSeatObj && playerSeatObj.role === "wolf");

    // ===== REAL 3D HEAD TRACKING =====
    let targetHeadYaw = 0;
    let targetHeadPitch = 0;
    if (!s.alive && !isSpeaking) {
      targetHeadPitch = 0.48;
    } else if (isWolfNightMate && seatWorldMap[pid]) {
      const pp = seatWorldMap[pid];
      let diff = Math.atan2(pp.x - pos.x, pp.z - pos.z) - baseFacingY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      targetHeadYaw = clamp(diff, -0.95, 0.95);
      targetHeadPitch = -0.05 + Math.sin(t * 3.5) * 0.06;
    } else if (f.night && !isSelected) {
      targetHeadPitch = 0.46;
    } else if (isHovered || isDragSnap) {
      let diff = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) - baseFacingY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      targetHeadYaw = clamp(diff, -0.85, 0.85);
      targetHeadPitch = -0.10;
    } else if (isSpeaking && activeFocusSeatId && seatWorldMap[activeFocusSeatId]) {
      const tp = seatWorldMap[activeFocusSeatId];
      let diff = Math.atan2(tp.x - pos.x, tp.z - pos.z) - baseFacingY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      targetHeadYaw = clamp(diff, -0.95, 0.95);
      if (activeVouchTargetId) targetHeadPitch = -0.04 + Math.sin(t * 2.8) * 0.03;
    } else if (!isSpeaking && state.activeSpeakerId && seatWorldMap[state.activeSpeakerId]) {
      const lookSeatId = (glanceAtFocus && activeFocusSeatId && activeFocusSeatId !== s.id && seatWorldMap[activeFocusSeatId])
        ? activeFocusSeatId
        : state.activeSpeakerId;
      const sp = seatWorldMap[lookSeatId];
      let diff = Math.atan2(sp.x - pos.x, sp.z - pos.z) - baseFacingY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      targetHeadYaw = clamp(diff * (lookSeatId === activeFocusSeatId ? 0.85 : 1.0), -0.85, 0.85);
    } else {
      targetHeadYaw = Math.sin(t * 0.52 + s.id * 1.9) * 0.30 + Math.cos(t * 0.24 + s.id * 2.7) * 0.14;
      targetHeadPitch = Math.sin(t * 0.68 + s.id * 1.3) * 0.06;
    }
    actor.headYaw += (targetHeadYaw - actor.headYaw) * 0.14;
    actor.headPitch += (targetHeadPitch - actor.headPitch) * 0.14;
    actor.headPivot.rotation.set(
      actor.headPitch + (isTalkingNow ? (liveAmp * 0.08 + Math.sin(t * 9 + s.id) * 0.03) : 0),
      actor.headYaw,
      0
    );

    // ===== DOUBLE-JOINTED 3D ARM & ELBOW GESTURES (sculpt fallback only; VRM uses humanoid bones) =====
    if (!actor.useVrm) {
      let rShX = -0.22, rShZ = -0.14, rElbX = -0.45;
      let lShX = -0.22, lShZ = 0.14, lElbX = -0.45;
      if ((!s.alive && !isSpeaking) || (f.night && !isSelected)) {
        rShX = -0.10; lShX = -0.10; rElbX = -0.25; lElbX = -0.25;
      } else if (isCelebration && s.team === "good") {
        // Victory double-arm cheer!
        rShX = -2.45 + Math.sin(t * 7 + s.id) * 0.2; rShZ = -0.35; rElbX = -0.35;
        lShX = -2.45 + Math.cos(t * 7 + s.id) * 0.2; lShZ = 0.35; lElbX = -0.35;
      } else if (isSpeaking && activeAccuseTargetId && seatWorldMap[activeAccuseTargetId]) {
        // Dramatic straight-arm pointing across the table + left hand table-slam!
        rShX = -1.48 + Math.sin(t * 10) * 0.07;
        rShZ = clamp(-actor.headYaw * 0.65, -0.65, 0.65);
        rElbX = -0.12;
        lShX = -0.68 + Math.sin(t * 12) * (0.14 + liveAmp * 0.22);
        lElbX = -0.78;
      } else if (isSpeaking && activeClaimRole) {
        // Solemn identity oath / declaration hand over chest
        rShX = -1.25 + Math.sin(t * 4.5) * 0.06;
        rShZ = -0.18;
        rElbX = -1.45;
        lShX = -0.45; lShZ = 0.12; lElbX = -0.65;
      } else if (isSpeaking && activeVouchTargetId && seatWorldMap[activeVouchTargetId]) {
        // Open welcoming palm gesture toward vouched ally
        rShX = -1.05 + Math.sin(t * 5) * 0.06;
        rShZ = clamp(-actor.headYaw * 0.55 - 0.15, -0.75, 0.45);
        rElbX = -0.52;
        lShX = -0.55; lShZ = 0.28; lElbX = -0.72;
      } else if (isTalkingNow) {
        // Animated debate forearm gestures driven by voice amplitude!
        rShX = -0.74 + Math.sin(t * 8.2 + s.id) * (0.20 + liveAmp * 0.24);
        rShZ = -0.24 + Math.cos(t * 6.0) * 0.12;
        rElbX = -0.75 - liveAmp * 0.35;
        lShX = -0.62 + Math.cos(t * 7.2 + s.id) * (0.16 + liveAmp * 0.18);
        lShZ = 0.22;
        lElbX = -0.70 - liveAmp * 0.25;
      } else if (isBeingAccusedNow) {
        // Defensive posture: both forearms raised near chest!
        rShX = -0.72; rShZ = 0.25; rElbX = -1.25;
        lShX = -0.72; lShZ = -0.25; lElbX = -1.25;
      } else if (s.alive && activeVouchTargetId === s.id && state.activeSpeakerId && state.activeSpeakerId !== s.id) {
        // Grateful polite clasp when being vouched for
        rShX = -0.48; rShZ = 0.22; rElbX = -1.18;
        lShX = -0.48; lShZ = -0.22; lElbX = -1.18;
      } else if (isVotingNow) {
        // Raise glowing 3D Vote Card high!
        rShX = -1.62 + Math.sin(t * 3.5 + s.id) * 0.06;
        rShZ = -0.10;
        rElbX = -0.35;
      } else if (isHovered || isSelected) {
        // Friendly attentive wave!
        rShX = -1.15; rShZ = -0.32; rElbX = -0.85 + Math.sin(t * 9) * 0.28;
      }

      actor.rightArmPivot.rotation.x += (rShX - actor.rightArmPivot.rotation.x) * 0.16;
      actor.rightArmPivot.rotation.z += (rShZ - actor.rightArmPivot.rotation.z) * 0.16;
      actor.rightElbowPivot.rotation.x += (rElbX - actor.rightElbowPivot.rotation.x) * 0.18;
      actor.leftArmPivot.rotation.x += (lShX - actor.leftArmPivot.rotation.x) * 0.16;
      actor.leftArmPivot.rotation.z += (lShZ - actor.leftArmPivot.rotation.z) * 0.16;
      actor.leftElbowPivot.rotation.x += (lElbX - actor.leftElbowPivot.rotation.x) * 0.18;
    }
    actor.voteCard.visible = isVotingNow && !hideSelfBodyInFP;

    // Sync Colors, Ring Glow, Role Halo & Mark Crystal
    const avStyle = getAvatarStyleForSeat(s);
    const mark = state.playerMarks[s.id];
    if (!actor.useVrm) {
      actor.robeMat.color.set(s.alive ? (avStyle.outfit || s.color || "#38bdf8") : "#334155");
      actor.collarMat.color.set(s.alive ? (avStyle.accent || "#fef3c7") : "#475569");
    }

    const baseHex = !s.alive
      ? "#475569"
      : isSelected ? "#f59e0b"
        : isSpeaking ? "#fde047"
          : (mark === "wolf" ? "#f43f5e" : (mark === "good" ? "#10b981" : (s.color || "#94a3b8")));
    actor.ringMat.color.set(baseHex);
    actor.ringMat.emissive.set(baseHex);
    actor.ringMat.emissiveIntensity = !s.alive ? 0.04 : (isSpeaking || isSelected || isDragSnap ? 1.25 : 0.42);

    const showHalo = s.alive && (isSpeaking || isSelected || isDragSnap || Boolean(s.claimedRole));
    actor.haloMat.opacity += ((showHalo ? (isSpeaking ? (0.85 + liveAmp * 0.15) : 0.55) : 0.0) - actor.haloMat.opacity) * 0.16;
    actor.haloMat.color.set(isSpeaking ? "#fde047" : (isSelected ? "#f59e0b" : (s.claimedRole === "seer" ? "#a78bfa" : "#38bdf8")));
    actor.haloRing.position.y = actor.useVrm ? 0.24 : 0.68;
    actor.haloRing.rotation.z = t * (isSpeaking ? 2.2 : 1.4);
    actor.haloRing.scale.setScalar(isSpeaking ? (1.02 + liveAmp * 0.22 + Math.sin(t * 5.0) * 0.04) : (isSelected ? 1.08 : 0.96));

    // 3D Floating Golden Sheriff Crown
    if (actor.sheriffCrownGroup) {
      const isSheriff = Boolean(s.alive && state.match && !state.match.sheriffElectionPending && state.match.sheriffSeatId === s.id);
      actor.sheriffCrownGroup.visible = isSheriff;
      if (isSheriff) {
        actor.sheriffCrownGroup.rotation.y = t * 1.6;
        actor.sheriffCrownGroup.position.y = (actor.useVrm ? 0.38 : 0.78) + Math.sin(t * 3.0) * 0.05;
      }
    }

    if (mark && s.alive) {
      actor.markCrystal.visible = true;
      actor.markCrystalMat.color.setHex(mark === "wolf" ? 0xf43f5e : 0x10b981);
      actor.markCrystalMat.emissive.setHex(mark === "wolf" ? 0xe11d48 : 0x059669);
      actor.markCrystal.rotation.y = t * 2.2;
      actor.markCrystal.position.y = 0.24 + Math.sin(t * 3.5 + s.id) * 0.04;
    } else {
      actor.markCrystal.visible = false;
    }

    // ===== CLICKABLE 3D FLIPPABLE PLAYER IDENTITY CARD =====
    const showIdCard = isSelf && state.match.started;
    actor.idCardPivot.visible = showIdCard;
    if (showIdCard) {
      playerCardHit = actor.idCardHit;
      const effCardDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(s) : null) || ROLE_DEFS[s.role];
      const rSig = (effCardDef ? effCardDef.key : s.role) + ":" + state.hidePlayerRole;
      if (actor.idCardRoleSig !== rSig) {
        actor.idCardRoleSig = rSig;
        const freshFront = createIdCardFaceCanvas(true, effCardDef, state.hidePlayerRole);
        if (actor.idCardMesh.material[3] && actor.idCardMesh.material[3].map) {
          actor.idCardMesh.material[3].map.dispose();
        }
        actor.idCardMesh.material[3].map = freshFront.tex;
        actor.idCardMesh.material[3].needsUpdate = true;
      }
      const targetFlip = state.cardPeek3D ? 1.0 : 0.0;
      actor.cardFlipProgress += (targetFlip - actor.cardFlipProgress) * 0.14;
      const fp = actor.cardFlipProgress;
      actor.idCardPivot.position.y = 0.04 + fp * 0.72 + (fp > 0.1 ? Math.sin(t * 3.2) * 0.04 : 0);
      actor.idCardPivot.rotation.x = fp * Math.PI * 0.84;
      actor.idCardPivot.rotation.z = Math.sin(fp * Math.PI) * 0.18;
    }

    // Tabletop Candle Flame + Warm Tabletop Reflection Glow + Rising Teacup Steam vs Extinguished Smoke!
    actor.candleSparkBoost *= 0.90;
    actor.candleFlame.visible = s.alive;
    if (actor.candleGlow) actor.candleGlow.visible = s.alive;
    if (s.alive) {
      const boost = actor.candleSparkBoost * 0.85;
      const flk = 0.88 + Math.sin(t * 14 + s.id * 2.7) * 0.18 + boost;
      actor.candleFlame.scale.set(flk, 0.9 + Math.cos(t * 19 + s.id) * 0.22 + boost * 1.2, flk);
      if (actor.candleGlowMat) {
        actor.candleGlowMat.opacity = (f.night ? 0.68 : 0.36) + Math.sin(t * 11 + s.id) * 0.08 + boost * 0.25;
      }
      // Subtle warm tea steam puff rising from celadon teacup!
      if (fx3d && actor.teaGroup && state.quality3D !== "eco" && nowMs - (actor.lastSteamAt || 0) > (1850 + s.id * 170)) {
        actor.lastSteamAt = nowMs;
        actor.teaGroup.getWorldPosition(actor.teaWorldPos);
        spawn3DCandleSmoke(fx3d, actor.teaWorldPos, nowMs);
      }
    } else if (fx3d && nowMs - actor.lastSmokeAt > 440) {
      actor.lastSmokeAt = nowMs;
      actor.candleGroup.getWorldPosition(actor.candleWorldPos);
      spawn3DCandleSmoke(fx3d, actor.candleWorldPos, nowMs);
    }

    // Tabletop Portrait Nameplate Texture Update (Refreshes cleanly on portrait load, style toggle, or player gender!)
    const hasArtImg = Boolean(typeof stage3dTextures !== "undefined" && typeof stage3dTextures.getRawPortraitImage === "function" && stage3dTextures.getRawPortraitImage(s));
    const pStyle = (typeof state !== "undefined" && state.portraitStyle) ? state.portraitStyle : "painted";
    const pGen = (typeof state !== "undefined" && state.playerGender) ? state.playerGender : "f";
    const effVrmKey = (typeof getEffectiveVrmPortraitKey === "function" && typeof getPortraitKey === "function")
      ? getEffectiveVrmPortraitKey(getPortraitKey(s))
      : (s.id === getPlayerId() ? "你" : s.name);
    const hasVrmPt = Boolean(typeof stage3dTextures !== "undefined" && stage3dTextures.vrmPortraitImages && (stage3dTextures.vrmPortraitImages[effVrmKey] || stage3dTextures.vrmPortraitImages[s.name]));
    const pSig = s.id + ":" + s.name + ":" + s.alive + ":" + isSpeaking + ":" + (mark || "") + ":" + (hasArtImg ? "1" : "0") + ":" + pStyle + ":" + pGen + ":" + (hasVrmPt ? "1" : "0");
    if (actor.plaqueSig !== pSig) {
      actor.plaqueSig = pSig;
      stage3dTextures.drawPlaque(actor.plaqueBundle.ctx, s, isSpeaking, mark);
      actor.plaqueBundle.tex.needsUpdate = true;
    }
    if (actor.vrmMountGroup && actor.useVrm) {
      actor.vrmMountGroup.scale.setScalar(phys.scale);
      actor.vrmMountGroup.position.y = Math.max(0, -phys.oy * 0.012);
      actor.vrmMountGroup.rotation.z = phys.tilt * 0.28;
    }

    // Secondary mountain-breeze physics on sculpted anime hair locks & headband ribbons (sculpt fallback only)
    if (!actor.useVrm && actor.swayHairParts && actor.swayHairParts.length) {
      for (let hi = 0; hi < actor.swayHairParts.length; hi++) {
        const hp = actor.swayHairParts[hi];
        if (!hp || !hp.pivot) continue;
        hp.pivot.rotation.z = hp.baseZ + Math.sin(t * 2.1 + hp.phase) * hp.amp;
        hp.pivot.rotation.x = hp.baseX + Math.cos(t * 1.6 + hp.phase) * (hp.amp * 0.65);
      }
    }

    // Drive optional VRoid .VRM / rigged .GLB avatar attached to this AI seat
    const isPrioritySeat = Boolean(isSpeaking || isHovered || isSelected || isDragSnap || isBeingAccusedNow || isVotingNow);
    const vrmStride = isPrioritySeat
      ? 1
      : (state.quality3D === "eco" ? 3 : ((nSeats >= 10 || (typeof stage3d !== "undefined" && stage3d.isIntegratedGpu && state.quality3D === "balanced")) ? 2 : 1));
    const runVrmFrame = vrmStride <= 1 || !actor._vrmUpdatedOnce || ((pool.frameCounter + s.id) % vrmStride === 0);
    if (actor.useVrm && actor.vrmAvatar && typeof stage3dVrm !== "undefined" && runVrmFrame) {
      actor._vrmUpdatedOnce = true;
      if (actor.showcaseActionUntil && nowMs > actor.showcaseActionUntil) {
        actor.showcaseAction = "";
        actor.showcaseActionUntil = 0;
      }
      const inSeatShowcase = Boolean(typeof stage3d !== "undefined" && stage3d.showcaseMode && stage3d.showcaseTarget === s.id);
      const scAct = inSeatShowcase ? (actor.showcaseAction || "") : "";
      const isPointingAcc = Boolean(isSpeaking && activeAccuseTargetId && seatWorldMap[activeAccuseTargetId]);
      const isBeingVouchedNow = Boolean(s.alive && activeVouchTargetId === s.id && state.activeSpeakerId && state.activeSpeakerId !== s.id);
      const speechActNow = isSpeaking ? (activeClaimRole ? "claim_role" : (activeVouchTargetId ? "vouch_warm" : "")) : "";
      let moodNowVrm = isBeingAccusedNow ? "shock" : (!s.alive ? "sorrow" : getSeatEmotion(s.id, nowMs));
      if (scAct === "gasp_react") moodNowVrm = "shock";
      else if (scAct === "celebrate") moodNowVrm = "laugh";
      else if (scAct === "welcome_bow" || scAct === "purify_cast") moodNowVrm = "happy";
      else if (scAct === "speak_gesture") moodNowVrm = "proud";
      else if (isPointingAcc && moodNowVrm === "neutral") moodNowVrm = "angry";
      else if (isBeingVouchedNow && moodNowVrm === "neutral") moodNowVrm = "happy";
      const liveVowels = (isTalkingNow && typeof sound !== "undefined" && typeof sound.getVoiceVowelWeights === "function")
        ? sound.getVoiceVowelWeights(s.id, nowMs)
        : null;
      const scTalking = isTalkingNow || scAct === "speak_gesture";
      const isSweatingVrm = Boolean(state.match && state.match.started && s.alive && (state.match.microPulseRevealed || s.sweatExposed) && s.microPulse >= 60);
      const spSusVal = (s.suspicionMap && state.activeSpeakerId) ? (s.suspicionMap[state.activeSpeakerId] || 50) : 50;
      const isDebateListening = Boolean(p === "DAY_SPEECH" || p === "SHERIFF_ELECTION" || p === "LAST_WORDS_SPEECH");
      const isListeningCurious = Boolean(
        s.alive && !isSpeaking && !isBeingAccusedNow && !isBeingVouchedNow &&
        isDebateListening && state.activeSpeakerId && (spSusVal >= 58 || ((s.id + (state.match ? state.match.day : 1)) % 4 === 0))
      );
      const isListeningAgree = Boolean(
        s.alive && !isSpeaking && !isBeingAccusedNow && !isListeningCurious &&
        isDebateListening && state.activeSpeakerId && spSusVal <= 44
      );
      stage3dVrm.updateVrmAvatar(actor.vrmAvatar, {
        tSec: t,
        seed: s.id * 1.7,
        personaName: s.name,
        moodKey: curMoodKey,
        alive: s.alive || isSpeaking,
        sleeping: f.night && !isSelected && !isWolfNightMate,
        talking: scTalking,
        isFloorHolder: isSpeaking,
        sweating: isSweatingVrm,
        mouthAmp: isTalkingNow ? liveAmp : (scAct === "speak_gesture" ? 0.52 : 0),
        vowels: liveVowels,
        emotion: moodNowVrm,
        headYaw: actor.headYaw,
        headPitch: actor.headPitch,
        isVoting: isVotingNow,
        isPointingAccuse: isPointingAcc,
        isAccusing: isBeingAccusedNow || scAct === "gasp_react",
        isBeingVouched: isBeingVouchedNow,
        isListeningCurious: isListeningCurious,
        isListeningAgree: isListeningAgree,
        speechAct: speechActNow,
        isHovered: isHovered || isSelected,
        isPriority: isSpeaking || isHovered || isSelected || isDragSnap,
        frameCounter: pool.frameCounter,
        seatId: s.id,
        act: scAct || ((isCelebration && s.team === "good") ? "celebrate" : "")
      });
    }

    // Throttled Live 3D Anime Face Update (skipped cleanly when external .VRM avatar is active!)
    const isEco = state.quality3D === "eco";
    const isBal = state.quality3D === "balanced";
    const redrawEvery = (isSpeaking || isHovered || isSelected || isDragSnap)
      ? (isEco ? 3 : 2)
      : (isEco ? 12 : ((nSeats >= 10 || isBal) ? 8 : 5));
    if (!actor.useVrm && (!actor.faceDrawnOnce || (pool.frameCounter + s.id) % redrawEvery === 0)) {
      actor.faceDrawnOnce = true;
      const sweating = Boolean(state.match.started && s.alive && (state.match.microPulseRevealed || s.sweatExposed) && s.microPulse >= 60);
      const moodNow = isBeingAccusedNow ? "shock" : getSeatEmotion(s.id, nowMs);
      draw3DFaceCanvas(actor.faceBundle.ctx, s, avStyle, {
        nowMs: nowMs,
        sleeping: f.night && !isSelected && !isWolfNightMate,
        talking: isTalkingNow,
        sweating: sweating,
        emotion: moodNow,
        gazeX: clamp(actor.headYaw * 0.6, -1, 1),
        gazeY: clamp(actor.headPitch * 0.5, -1, 1)
      });
      actor.faceBundle.tex.needsUpdate = true;
    }

    actor.root.updateMatrixWorld(true);
    actor.worldPos.copy(actor.root.position);
    if (actor.useVrm && actor.vrmAvatar && actor.vrmAvatar.bones && actor.vrmAvatar.bones.head && typeof actor.vrmAvatar.bones.head.getWorldPosition === "function") {
      actor.vrmAvatar.bones.head.getWorldPosition(actor.headWorldPos);
      actor.headWorldPos.y += 0.22;
    } else {
      actor.headPivot.getWorldPosition(actor.headWorldPos);
    }
    actor.rightHand.getWorldPosition(actor.handWorldPos);

    if (!hideSelfBodyInFP) hitMeshes.push(actor.hitMesh);
    if (actor.candleHit) candleHitMeshes.push(actor.candleHit);

    if (!actor._anchorObj) {
      actor._anchorObj = {
        id: s.id,
        seat: s,
        worldPos: actor.worldPos.clone(),
        headPos: actor.headWorldPos.clone(),
        handPos: actor.handWorldPos.clone()
      };
    } else {
      actor._anchorObj.id = s.id;
      actor._anchorObj.seat = s;
      actor._anchorObj.worldPos.copy(actor.worldPos);
      actor._anchorObj.headPos.copy(actor.headWorldPos);
      actor._anchorObj.handPos.copy(actor.handWorldPos);
    }
    nextAnchors[s.id] = actor._anchorObj;

    projVec.copy(actor.headWorldPos).project(camera);
    const inFront = projVec.z >= -1.0 && projVec.z < 1.0;
    const onScreen = inFront && projVec.x >= -1.06 && projVec.x <= 1.06 && projVec.y >= -1.08 && projVec.y <= 1.12;
    const sx = (projVec.x * 0.5 + 0.5) * canvasW;
    const sy = (-projVec.y * 0.5 + 0.5) * canvasH;

    // Accurate left/right off-screen direction for seated POV edge-glance arrows
    let offScreenDir = 0;
    if (!onScreen && !hideSelfBodyInFP && camera && camera.position) {
      const dxC = actor.headWorldPos.x - camera.position.x;
      const dyC = actor.headWorldPos.y - camera.position.y;
      const dzC = actor.headWorldPos.z - camera.position.z;
      const dotR = dxC * camRight.x + dyC * camRight.y + dzC * camRight.z;
      offScreenDir = dotR < 0 ? -1 : 1;
    }

    projEdgeVec.copy(actor.headWorldPos).addScaledVector(camRight, 0.62 * phys.scale).project(camera);
    const edgeX = (projEdgeVec.x * 0.5 + 0.5) * canvasW;
    const projR = clamp(Math.abs(edgeX - sx), 20 * f.dpr, 56 * f.dpr);

    coords.push({
      id: s.id,
      angle: Math.PI * 0.5 + (i * Math.PI * 2) / nSeats,
      deg: Math.round((((Math.PI * 0.5 + (i * Math.PI * 2) / nSeats) * 180) / Math.PI) % 360),
      x: onScreen ? sx : -999,
      y: onScreen ? sy : -999,
      r: projR,
      seat: s,
      zDepth: projVec.z,
      offScreenDir: offScreenDir,
      visibleInView: onScreen && !hideSelfBodyInFP
    });
  }

  pool.anchors = nextAnchors;
  pool.hitMeshes = hitMeshes;
  pool.candleHitMeshes = candleHitMeshes;
  pool.idCardHitMesh = playerCardHit;
  state.seatCoords = coords;
  return coords;
}
