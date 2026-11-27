/**
 * 圓桌舞台主協調器與前景特效層（能量光束、飛票、氣泡、拖曳線、爆裂粒子與動畫主迴圈）
 */
"use strict";

// ==================== INTERACTIVE STAGE CANVAS (WITH SPEECH BUBBLES & VFX!) ====================
function initParticles() {
  state.particles = [];
  for (let i = 0; i < 32; i++) {
    state.particles.push({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: -0.0004 - Math.random() * 0.0007,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function resizeCanvas(skipDraw) {
  const container = el("canvasStageWrap") || el("canvasContainer");
  const canvas = el("sanctuaryCanvas");
  if (!container || !canvas) return;
  const rect = container.getBoundingClientRect();
  const maxVw = (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 1920;
  const maxVh = (typeof window !== "undefined" && window.innerHeight) ? window.innerHeight : 1080;
  const effW = Math.min(rect.width || maxVw, maxVw);
  const effH = Math.min(rect.height || maxVh, maxVh);
  if (typeof stage3d !== "undefined" && typeof stage3d.invalidateLayoutCache === "function") {
    stage3d.invalidateLayoutCache();
  }
  const dpr = (typeof stage3d !== "undefined" && typeof stage3d.getOverlayDpr === "function")
    ? stage3d.getOverlayDpr()
    : Math.min(window.devicePixelRatio || 1, (typeof stage3d !== "undefined" && stage3d.isIntegratedGpu) ? 1.25 : 1.5);
  const nextW = Math.max(300, Math.round(effW * dpr));
  const nextH = Math.max(220, Math.round(effH * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  invalidate3DOverlayCache();
  if (typeof closeRadialMenu === "function") closeRadialMenu();
  if (typeof positionSeatIntelPopover === "function") positionSeatIntelPopover();
  if (typeof stage3d !== "undefined" && stage3d.ready) {
    stage3d.resize();
  }
  if (!skipDraw) drawSanctuaryFrame(performance.now());
}

function shouldCapFrameRate60() {
  if (typeof stage3d === "undefined" || !stage3d.isActive()) return true;
  if (stage3d.isSoftwareRenderer || stage3d.isIntegratedGpu) return true;
  if (typeof state !== "undefined" && state.quality3D === "eco") return true;
  return false;
}

function invalidate3DOverlayCache() {
  drawSanctuaryFrame._lastOverlaySig = "";
  if (typeof draw3DOverlayHud === "function" && draw3DOverlayHud._safeCache) {
    draw3DOverlayHud._safeCache.at = 0;
  }
}

function compute3DOverlaySignature(f, coords) {
  if (!f || !Array.isArray(coords)) return null;
  const isLite3d = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer || (typeof state !== "undefined" && state.quality3D === "eco")));
  const hasPointerTrail = !isLite3d && Boolean(state.pointerTrail && state.pointerTrail.length > 0);
  // Prune expired bubbles & ignore redundant active-speaker bubble during DAY_SPEECH so Listening doesn't redraw at 60Hz!
  let hasActiveBubble = false;
  if (state.seatBubbles) {
    const bKeys = Object.keys(state.seatBubbles);
    for (let bi = 0; bi < bKeys.length; bi++) {
      const k = bKeys[bi];
      const b = state.seatBubbles[k];
      if (!b || (f.nowMs - b.born) > (b.ttl || 4200)) {
        delete state.seatBubbles[k];
        continue;
      }
      if (f.p === "DAY_SPEECH" && state.activeSpeakerId === b.seatId) continue;
      hasActiveBubble = true;
    }
  }
  if (
    hasActiveBubble ||
    (state.dragAction && state.dragAction.active && state.dragAction.moved) ||
    hasPointerTrail ||
    (state.ripples && state.ripples.length > 0) ||
    (state.burstParticles && state.burstParticles.length > 0) ||
    (state.fxPopups && state.fxPopups.length > 0) ||
    state.screenFlash ||
    (state.shakeUntil && f.nowMs < state.shakeUntil)
  ) {
    return null;
  }

  const m = state.match || {};
  const dpr = Math.max(1, f.dpr || 1);
  const dragging = Boolean(typeof stage3d !== "undefined" && stage3d.orbit && stage3d.orbit.dragging);
  // Coarser steady-state quantization on iGPU (5.5px) and settled Game Over (16px) stops speaker head-bob & victory hops from forcing 60-88% 2D redraws!
  const qStep = dragging
    ? dpr
    : (f.p === "GAME_OVER" ? (16 * dpr) : ((isLite3d ? 5.5 : 2.5) * dpr));
  const activelyVoicing = Boolean((state.typewriter && state.typewriter.active) || (typeof voice !== "undefined" && voice.speaking));
  const showTruth = f.p === "GAME_OVER" || (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());
  const camPreset = (typeof stage3d !== "undefined" && stage3d.camPreset) ? stage3d.camPreset : "cinema";
  const showcase = Boolean(typeof stage3d !== "undefined" && stage3d.showcaseMode);
  const roleDealEl = typeof el === "function" ? el("roleDealOverlay") : null;
  const roleDealOpen = Boolean(roleDealEl && !roleDealEl.classList.contains("hidden"));
  if (roleDealOpen) {
    return f.w + "x" + f.h + "|ROLE_DEAL_OPEN";
  }
  const isLobbyTitle = Boolean(!m.started && f.p === "LOBBY" && !showcase);
  const fpOffCenter = (camPreset === "firstperson" && typeof stage3d !== "undefined" && stage3d.orbit)
    ? ((Math.abs(stage3d.orbit.fpYaw || 0) > 0.34 || Math.abs(stage3d.orbit.fpFovOffset || 0) > 3) ? 1 : 0)
    : 0;
  const safeCache = (typeof draw3DOverlayHud === "function" && draw3DOverlayHud._safeCache) ? draw3DOverlayHud._safeCache : null;
  const safeStr = safeCache ? (Math.round(safeCache.top) + ":" + Math.round(safeCache.bottom)) : "";
  const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;

  let sig = f.w + "x" + f.h + "@" + dpr.toFixed(2) + "|" + f.p + "|" + (f.daylight ? 1 : 0)
    + "|" + (m.started ? 1 : 0) + "|" + (m.sheriffSeatId || 0) + "|" + (m.sheriffElectionPending ? 1 : 0)
    + "|" + (m.microPulseRevealed ? 1 : 0) + "|" + (state.activeSpeakerId || 0) + "|" + (state.selectedSeatId || 0)
    + "|" + (state.hoverSeatId || 0) + "|" + (state.hoverFpGlanceKey || "") + "|" + (state.hidePlayerRole ? 1 : 0)
    + "|" + (activelyVoicing ? 1 : 0) + "|" + (showTruth ? 1 : 0) + "|" + camPreset + "|" + (showcase ? 1 : 0)
    + "|" + fpOffCenter + "|" + safeStr;

  if (typeof stage3d !== "undefined" && stage3d.hero && stage3d.hero.root && stage3d.hero.root.visible && !showcase && stage3d.camera && typeof THREE !== "undefined") {
    const hv = compute3DOverlaySignature._hostVec || (compute3DOverlaySignature._hostVec = new THREE.Vector3());
    const hp = stage3d.hero.root.position;
    const hostQ = isLobbyTitle ? (8 * dpr) : qStep;
    hv.set(hp.x, hp.y + 2.28, hp.z).project(stage3d.camera);
    if (hv.z > -1 && hv.z < 1) {
      sig += "|H:" + Math.round(((hv.x * 0.5 + 0.5) * f.w) / hostQ) + "," + Math.round(((-hv.y * 0.5 + 0.5) * f.h) / hostQ);
    } else {
      sig += "|H:off";
    }
  }

  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const s = c.seat || {};
    const mark = (state.playerMarks && state.playerMarks[c.id]) || "";
    // On Title Screen (LOBBY), draw3DOverlayHud draws ZERO plates for unhovered/unmarked seats — skipping them cuts Title 2D redraws from 100% -> <5%!
    if (isLobbyTitle && state.hoverSeatId !== c.id && !mark && !s.claimedRole) continue;
    const wMark = (m.wolfGodMarks && m.wolfGodMarks[c.id]) || "";
    const hoverSus = (state.hoverSeatId === c.id && m.started && s.suspicionMap)
      ? ((s.suspicionMap[pid] || 50) >= 62 ? 2 : ((s.suspicionMap[pid] || 50) <= 38 ? 0 : 1))
      : -1;
    if (c.visibleInView === false) {
      sig += "|" + c.id + ":0:" + (c.offScreenDir || 0);
      continue;
    }
    sig += "|" + c.id + ":1:" + (c.offScreenDir || 0)
      + ":" + Math.round(c.x / qStep) + "," + Math.round(c.y / qStep) + "," + Math.round(c.r / qStep)
      + ":" + (s.alive === false ? 0 : 1) + ":" + (s.claimedRole || "") + ":" + (s.sweatExposed ? 1 : 0)
      + ":" + (s.microPulse || 0) + ":" + mark + ":" + wMark + ":" + hoverSus;
  }
  return sig;
}

function drawStageOverlays(ctx, f, coords, skipBeams) {
  const { nowMs, w, h, dpr, p, daylight, cx, cy, tSec } = f;

  // 7. Animated Energy Beams, Interrogation Bolts & Flying Ballot Orbs (with arrival recoil & bursts!)
  if (!skipBeams) {
    state.beamFx = state.beamFx.filter(function (bm) { return nowMs - bm.born < (bm.duration + 260); });
    state.beamFx.forEach(function (bm) {
      if (bm.x1 === null || bm.x2 === null) {
        const fn = coords.find(function (c) { return c.id === bm.fromId; });
        const tn = coords.find(function (c) { return c.id === bm.toId; });
        if (!fn || !tn) return;
        bm.x1 = fn.x;
        bm.y1 = fn.y;
        bm.x2 = tn.x;
        bm.y2 = tn.y;
      }
      const tRaw = (nowMs - bm.born) / bm.duration;
      const t = clamp(tRaw, 0, 1);
      const midX = (bm.x1 + bm.x2) * 0.5 + (cy - (bm.y1 + bm.y2) * 0.5) * 0.22;
      const midY = (bm.y1 + bm.y2) * 0.5 - (cx - (bm.x1 + bm.x2) * 0.5) * 0.22;

      if (tRaw >= 1 && !bm.impacted) {
        bm.impacted = true;
        const dx = bm.x2 - bm.x1;
        const dy = bm.y2 - bm.y1;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const isHunter = bm.kind === "hunter";
        const isHostile = bm.kind === "grill" || bm.kind === "clash" || bm.kind === "vote" || isHunter;
        nudgeSeat(bm.toId, {
          scale: isHunter ? 0.78 : (isHostile ? 0.86 : 1.15),
          vScale: isHunter ? 0.28 : (isHostile ? 0.22 : -0.08),
          vx: (dx / dist) * (isHunter ? 11.5 : (isHostile ? 8.5 : 3.0)),
          vy: (dy / dist) * (isHunter ? 11.5 : (isHostile ? 8.5 : -5.5)),
          vTilt: isHostile ? (dx >= 0 ? (isHunter ? 0.38 : 0.28) : (isHunter ? -0.38 : -0.28)) : 0.08
        });
        spawnBurst(bm.toId, [bm.color, "#ffffff", "#fde68a"], isHunter ? 28 : (isHostile ? 12 : 10), isHostile ? "spark" : "petal");
      }

      ctx.save();
      // Glowing curved trail
      const isHunterBeam = bm.kind === "hunter";
      const trailAlpha = tRaw <= 1 ? (isHunterBeam ? 0.9 : 0.65) : clamp(1 - (nowMs - bm.born - bm.duration) / 260, 0, 1) * (isHunterBeam ? 0.9 : 0.65);
      ctx.beginPath();
      const segs = 20;
      const endSeg = Math.max(1, Math.floor(segs * t));
      for (let si = 0; si <= endSeg; si++) {
        const u = (si / segs);
        const inv = 1 - u;
        const px = inv * inv * bm.x1 + 2 * inv * u * midX + u * u * bm.x2;
        const py = inv * inv * bm.y1 + 2 * inv * u * midY + u * u * bm.y2;
        if (si === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = bm.color;
      ctx.globalAlpha = isHunterBeam ? (trailAlpha * 0.55) : trailAlpha;
      ctx.lineWidth = (isHunterBeam ? 7.5 : (bm.kind === "vote" ? 3.2 : 2.6)) * dpr;
      ctx.stroke();
      if (isHunterBeam) {
        ctx.globalAlpha = trailAlpha;
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3.2 * dpr;
        ctx.stroke();
      }

      if (tRaw < 1) {
        // Comet head orb
        const inv = 1 - t;
        const hx = inv * inv * bm.x1 + 2 * inv * t * midX + t * t * bm.x2;
        const hy = inv * inv * bm.y1 + 2 * inv * t * midY + t * t * bm.y2;
        ctx.globalAlpha = 0.98;
        ctx.beginPath();
        ctx.arc(hx, hy, (isHunterBeam ? 10.5 : (bm.kind === "vote" ? 6.5 : 5.2)) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = bm.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy, (isHunterBeam ? 5.0 : 2.8) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // Arrival ripple burst ring!
        const burstP = clamp((nowMs - bm.born - bm.duration) / 260, 0, 1);
        ctx.globalAlpha = (1 - burstP) * 0.9;
        ctx.beginPath();
        ctx.arc(bm.x2, bm.y2, ((isHunterBeam ? 18 : 16) + burstP * (isHunterBeam ? 48 : 28)) * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = (isHunterBeam ? 4.4 : 3) * dpr;
        ctx.stroke();
        if (isHunterBeam) {
          ctx.beginPath();
          ctx.arc(bm.x2, bm.y2, (10 + burstP * 34) * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2.8 * dpr;
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  // 7.5 Live Multi-Seat Canvas Speech Bubbles (Wolf whispers, 4G secrets, Lobby greetings & AI reactions!)
  Object.keys(state.seatBubbles).forEach(function (k) {
    const b = state.seatBubbles[k];
    if (!b) return;
    const age = nowMs - b.born;
    if (age > (b.ttl || 4200)) {
      delete state.seatBubbles[k];
      return;
    }
    // Skip redundant full-speech bubble on active speaker during DAY_SPEECH (already shown in center Spotlight!)
    if (p === "DAY_SPEECH" && state.activeSpeakerId === b.seatId) {
      return;
    }
    const node = coords.find(function (c) { return c.id === b.seatId; });
    if (!node) return;

    const fadeIn = clamp(age / 180, 0, 1);
    const fadeOut = age > (b.ttl - 420) ? clamp((b.ttl - age) / 420, 0, 1) : 1;
    const alpha = fadeIn * fadeOut;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "800 " + Math.round(10.5 * dpr) + "px 'Noto Sans TC', sans-serif";
    const txt = b.text;
    const textW = ctx.measureText(txt).width;
    const padX = 10 * dpr;
    const bh = 24 * dpr;
    const bw = Math.min(w * 0.44, textW + padX * 2);

    // Track 1: Anchor micro-reaction badges cleanly below-left of avatar (clear of overhead nameplate & center speech card!)
    const is3dOverlay = Boolean(skipBeams);
    let bx = is3dOverlay ? (node.x - bw * 0.68) : (node.x - bw * 0.5);
    let by = is3dOverlay ? (node.y + node.r * 0.34) : (node.y - node.r - bh - 12 * dpr);
    if (is3dOverlay && by + bh > h - 96 * dpr) {
      by = node.y - node.r * 0.25 - bh;
    } else if (!is3dOverlay && by < 8 * dpr) {
      by = node.y + node.r + 14 * dpr;
    }
    bx = clamp(bx, 8 * dpr, w - bw - 8 * dpr);
    by = clamp(by, 8 * dpr, h - bh - 8 * dpr);

    const isWolfMood = b.mood === "wolf" || b.mood === "suspect";
    const isTrustMood = b.mood === "trust";
    drawRoundedRect(ctx, bx, by, bw, bh, 5 * dpr);
    ctx.fillStyle = isWolfMood ? "rgba(24, 13, 13, 0.88)" : (isTrustMood ? "rgba(13, 24, 20, 0.88)" : "rgba(14, 12, 10, 0.88)");
    ctx.fill();
    ctx.lineWidth = 1.0 * dpr;
    ctx.strokeStyle = isWolfMood ? "rgba(208, 92, 80, 0.55)" : (isTrustMood ? "rgba(92, 169, 141, 0.55)" : "rgba(216, 185, 124, 0.48)");
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f2eadb";
    ctx.fillText(txt, bx + bw * 0.5, by + bh * 0.52, bw - 10 * dpr);
    ctx.restore();
  });

  // 7.8 Hover Attitude Tooltip on Outer Ring Seats!
  if (state.hoverSeatId && state.hoverSeatId !== getPlayerId()) {
    const hNode = coords.find(function (c) { return c.id === state.hoverSeatId; });
    if (hNode && hNode.seat && hNode.seat.alive && !state.seatBubbles[hNode.id]) {
      let tip = "點擊打招呼 / 看簡介";
      if (state.match.started) {
        const sus = Math.round((hNode.seat.suspicionMap && hNode.seat.suspicionMap[getPlayerId()]) || 50);
        const att = sus >= 62 ? "懷疑你" : (sus <= 38 ? "信任你" : "觀望中");
        tip = (p === "DAY_VOTE") ? ("對你:" + att + " · 點兩下秒投") : ("對你:" + att + " · 點擊看情報");
      }
      ctx.save();
      ctx.font = "800 " + Math.round(9.5 * dpr) + "px 'Noto Sans TC', sans-serif";
      const tw = ctx.measureText(tip).width + 14 * dpr;
      const th = 18 * dpr;
      const tx = clamp(hNode.x - tw * 0.5, 6 * dpr, w - tw - 6 * dpr);
      const ty = (hNode.y - hNode.r - th - 24 * dpr) > 6 * dpr
        ? (hNode.y - hNode.r - th - 10 * dpr)
        : (hNode.y + hNode.r + 14 * dpr);
      drawRoundedRect(ctx, tx, ty, tw, th, 7 * dpr);
      ctx.fillStyle = daylight ? "rgba(15, 23, 42, 0.88)" : "rgba(248, 250, 252, 0.92)";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = daylight ? "#fef3c7" : "#0f172a";
      ctx.fillText(tip, tx + tw * 0.5, ty + th * 0.53);
      ctx.restore();
    }
  }

  // 7.9 Elastic Glowing Drag-to-Interact Tether!
  if (state.dragAction.active && state.dragAction.moved) {
    const fromN = coords.find(function (c) { return c.id === state.dragAction.fromId; });
    const snapN = state.dragAction.snapId ? coords.find(function (c) { return c.id === state.dragAction.snapId; }) : null;
    if (fromN) {
      const tx = snapN ? snapN.x : state.dragAction.curX;
      const ty = snapN ? snapN.y : state.dragAction.curY;
      const mx = (fromN.x + tx) * 0.5 + (cy - (fromN.y + ty) * 0.5) * 0.16;
      const my = (fromN.y + ty) * 0.5 - (cx - (fromN.x + tx) * 0.5) * 0.16;
      const tetherCol = snapN ? (p === "DAY_VOTE" ? "#f43f5e" : "#fbbf24") : "#38bdf8";

      ctx.save();
      if (!skipBeams) {
        ctx.beginPath();
        ctx.moveTo(fromN.x, fromN.y);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.strokeStyle = tetherCol;
        ctx.lineWidth = (snapN ? 4.2 : 3.0) * dpr;
        ctx.setLineDash([7 * dpr, 5 * dpr]);
        ctx.lineDashOffset = -nowMs * 0.04;
        ctx.stroke();
        ctx.setLineDash([]);

        // Flowing luminous beads along the drag tether
        for (let bi = 0; bi < 3; bi++) {
          const u = ((nowMs * 0.0018) + bi / 3) % 1;
          const inv = 1 - u;
          const bx = inv * inv * fromN.x + 2 * inv * u * mx + u * u * tx;
          const by = inv * inv * fromN.y + 2 * inv * u * my + u * u * ty;
          ctx.beginPath();
          ctx.arc(bx, by, 4 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
      }

      // Floating live action label near pointer / snapped seat!
      let dragLabel = "拖曳到任一角色頭像放開互動";
      if (snapN) {
        const snName = fmtSeatNum(snapN.id) + "號" + snapN.seat.name;
        if (!state.match.started || p === "LOBBY") dragLabel = "放開與 " + snName + " 打招呼";
        else if (p === "DAY_VOTE") dragLabel = "放開投票給 " + snName;
        else if (p === "NIGHT_SEER") dragLabel = "放開查驗 " + snName;
        else if (p === "NIGHT_WOLF") dragLabel = "放開夜間鎖定 " + snName;
        else if (p === "HUNTER_TRIGGER") dragLabel = "放開帶走 " + snName;
        else if (p === "DAY_PLAYER_TURN") dragLabel = "放開點名 " + snName;
        else dragLabel = "放開開啟 " + snName + " 靜默輪盤";
      }
      ctx.font = "900 " + Math.round(10.5 * dpr) + "px 'Noto Sans TC', sans-serif";
      const lw = ctx.measureText(dragLabel).width + 18 * dpr;
      const lh = 22 * dpr;
      const lx = clamp(tx - lw * 0.5, 8 * dpr, w - lw - 8 * dpr);
      const ly = clamp(ty - 42 * dpr, 8 * dpr, h - lh - 8 * dpr);
      drawRoundedRect(ctx, lx, ly, lw, lh, 10 * dpr);
      ctx.fillStyle = snapN ? "#f59e0b" : "rgba(15, 23, 42, 0.92)";
      ctx.fill();
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = "#fde68a";
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = snapN ? "#0f172a" : "#f8fafc";
      ctx.fillText(dragLabel, lx + lw * 0.5, ly + lh * 0.53);
      ctx.restore();
    }
  }

  // 8. Cursor Stardust Trail, Click Shockwaves & Physics Burst Particles (in-place compaction -> zero per-frame array GC!)
  const skipTrail3d = Boolean(skipBeams && typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer || state.quality3D === "eco"));
  if (state.pointerTrail.length > 0) {
    if (skipTrail3d) {
      state.pointerTrail.length = 0;
    } else {
      let pw = 0;
      for (let pi = 0; pi < state.pointerTrail.length; pi++) {
        const pt = state.pointerTrail[pi];
        if (pt && (nowMs - pt.born) < 420) state.pointerTrail[pw++] = pt;
      }
      state.pointerTrail.length = pw;
      for (let pi = 0; pi < state.pointerTrail.length; pi++) {
        const pt = state.pointerTrail[pi];
        const pProg = (nowMs - pt.born) / 420;
        ctx.save();
        ctx.globalAlpha = (1 - pProg) * 0.65;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (3.2 * (1 - pProg) + 0.8) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = daylight ? "#f59e0b" : "#fde68a";
        ctx.fill();
        ctx.restore();
      }
    }
  }

  if (state.ripples.length > 0) {
    let rw = 0;
    for (let ri = 0; ri < state.ripples.length; ri++) {
      const rp = state.ripples[ri];
      if (rp && (nowMs - rp.born) < rp.ttl) state.ripples[rw++] = rp;
    }
    state.ripples.length = rw;
    for (let ri = 0; ri < state.ripples.length; ri++) {
      const rp = state.ripples[ri];
      const prog = (nowMs - rp.born) / rp.ttl;
      ctx.save();
      ctx.globalAlpha = (1 - prog) * 0.72;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, (8 + prog * rp.maxR) * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = (2.6 * (1 - prog) + 0.6) * dpr;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (state.burstParticles.length > 0) {
    const dt60 = clamp(Number(f.dt60) || 1, 0.05, 3.0);
    const bpDrag = Math.pow(0.965, dt60);
    let bpw = 0;
    for (let bi = 0; bi < state.burstParticles.length; bi++) {
      const bp = state.burstParticles[bi];
      if (bp && (nowMs - bp.born) < bp.ttl) state.burstParticles[bpw++] = bp;
    }
    state.burstParticles.length = bpw;
    for (let bi = 0; bi < state.burstParticles.length; bi++) {
      const bp = state.burstParticles[bi];
      const prog = (nowMs - bp.born) / bp.ttl;
      bp.x += bp.vx * dpr * dt60;
      bp.y += bp.vy * dpr * dt60;
      bp.vx *= bpDrag;
      bp.vy = bp.vy * bpDrag + (bp.style === "petal" ? 0.045 : 0.08) * dt60;
      bp.rot += bp.vRot * dt60;
      ctx.save();
      ctx.translate(bp.x, bp.y);
      ctx.rotate(bp.rot);
      ctx.globalAlpha = 1 - prog;
      ctx.fillStyle = bp.color;
      const sz = bp.size * dpr * (1 - prog * 0.35);
      if (bp.style === "petal") {
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.25, sz * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (bp.style === "slash") {
        const slAng = Math.atan2(bp.vy, bp.vx);
        ctx.rotate(slAng - bp.rot);
        ctx.beginPath();
        ctx.moveTo(-sz * 2.4, 0);
        ctx.quadraticCurveTo(0, -sz * 0.48, sz * 2.4, 0);
        ctx.quadraticCurveTo(0, sz * 0.48, -sz * 2.4, 0);
        ctx.closePath();
        ctx.fill();
      } else if (bp.style === "ring") {
        ctx.beginPath();
        ctx.arc(0, 0, sz * (1.2 + prog * 2.4), 0, Math.PI * 2);
        ctx.strokeStyle = bp.color;
        ctx.lineWidth = Math.max(0.8, 2.2 * (1 - prog)) * dpr;
        ctx.stroke();
      } else if (bp.style === "star") {
        ctx.beginPath();
        ctx.moveTo(0, -sz * 1.4);
        ctx.lineTo(sz * 0.45, -sz * 0.45);
        ctx.lineTo(sz * 1.4, 0);
        ctx.lineTo(sz * 0.45, sz * 0.45);
        ctx.lineTo(0, sz * 1.4);
        ctx.lineTo(-sz * 0.45, sz * 0.45);
        ctx.lineTo(-sz * 1.4, 0);
        ctx.lineTo(-sz * 0.45, -sz * 0.45);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-sz, -sz * 0.35, sz * 2, sz * 0.7);
      }
      ctx.restore();
    }
  }

  // 8.5 Floating Action VFX Popups (in-place compaction + elastic overshoot pop & crisp stroke!)
  if (state.fxPopups.length > 0) {
    let fw = 0;
    for (let fi = 0; fi < state.fxPopups.length; fi++) {
      const fx = state.fxPopups[fi];
      if (fx && (nowMs - fx.born) < (fx.duration || 1350)) state.fxPopups[fw++] = fx;
    }
    state.fxPopups.length = fw;
    for (let fi = 0; fi < state.fxPopups.length; fi++) {
      const fx = state.fxPopups[fi];
      const dur = fx.duration || 1350;
      const sc = fx.scale || 1;
      const progress = (nowMs - fx.born) / dur;
      const popEase = progress < 0.10
        ? (0.65 + (progress / 0.10) * 0.52)
        : (progress < 0.22 ? (1.17 - ((progress - 0.10) / 0.12) * 0.17) : 1.0);
      ctx.save();
      ctx.globalAlpha = progress < 0.72 ? 1 : clamp((1 - progress) / 0.28, 0, 1);
      ctx.font = "600 " + Math.round(13 * sc * popEase * dpr) + "px 'Noto Serif TC', 'Noto Sans TC', serif";
      ctx.textAlign = "center";
      ctx.lineWidth = (2.6 * sc) * dpr;
      ctx.strokeStyle = "rgba(10, 9, 8, 0.84)";
      const py = fx.y - Math.pow(progress, 0.78) * 34 * dpr;
      ctx.strokeText(fx.text, fx.x, py);
      ctx.fillStyle = (fx.color === "#fde68a" || fx.color === "#fbbf24") ? "#eed49b" : fx.color;
      ctx.fillText(fx.text, fx.x, py);
      ctx.restore();
    }
  }

  // 9. Peripheral Ambient Edge Screen Flash (Center stays clear for unobstructed reading!)
  if (state.screenFlash) {
    const sf = state.screenFlash;
    const sProg = (nowMs - sf.born) / Math.max(1, sf.duration || 420);
    if (sProg >= 1) {
      state.screenFlash = null;
    } else if (typeof ctx.createRadialGradient === "function") {
      const fade = sProg < 0.18 ? (sProg / 0.18) : (1 - (sProg - 0.18) / 0.82);
      const alpha = clamp(fade * (sf.intensity || 0.34), 0, 0.55);
      const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.26, cx, cy, Math.hypot(cx, cy));
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.55, "rgba(0,0,0,0)");
      grad.addColorStop(1, sf.color || "#fbbf24");
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}

function drawSanctuaryFrame(nowMs) {
  const canvas = el("sanctuaryCanvas");
  if (!canvas) return;
  const ctx = canvas._ctx2d || (canvas._ctx2d = canvas.getContext("2d"));
  const w = canvas.width;
  const h = canvas.height;
  const dpr = (typeof stage3d !== "undefined" && typeof stage3d.getCachedOverlayDpr === "function")
    ? stage3d.getCachedOverlayDpr()
    : ((typeof stage3d !== "undefined" && typeof stage3d.getOverlayDpr === "function")
      ? stage3d.getOverlayDpr()
      : Math.min(window.devicePixelRatio || 1, (typeof stage3d !== "undefined" && stage3d.isIntegratedGpu) ? 1.25 : 1.5));

  // 3D Mode: Render Three.js WebGL Sanctuary + Dirty-Flag Cached 4K Transparent 2D HUD Overlay!
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    const res3d = stage3d.render(nowMs, canvas);
    if (res3d) {
      const stats = drawSanctuaryFrame._overlayCacheStats || (drawSanctuaryFrame._overlayCacheStats = { hits: 0, draws: 0 });
      const sig = compute3DOverlaySignature(res3d.f, res3d.coords);
      if (sig !== null && !drawSanctuaryFrame._hadTransientFx && sig === drawSanctuaryFrame._lastOverlaySig) {
        stats.hits += 1;
        return;
      }
      // Pace passive transient-only 2D redraws (e.g. seat bubbles on iGPU/eco) to ~10.5Hz and Game Over sway to ~6.5Hz!
      const isSoftTransient = Boolean(
        sig === null &&
        drawSanctuaryFrame._hadTransientFx &&
        (stage3d.isIntegratedGpu || state.quality3D === "eco") &&
        !(state.dragAction && state.dragAction.active && state.dragAction.moved) &&
        !state.screenFlash &&
        !(state.shakeUntil && nowMs < state.shakeUntil) &&
        !(state.burstParticles && state.burstParticles.length > 0) &&
        !(state.fxPopups && state.fxPopups.length > 0)
      );
      const minSoftMs = res3d.f.p === "GAME_OVER" ? 150 : 95;
      if (isSoftTransient && drawSanctuaryFrame._lastOverlayDrawMs && (nowMs - drawSanctuaryFrame._lastOverlayDrawMs) < minSoftMs) {
        stats.hits += 1;
        return;
      }
      drawSanctuaryFrame._lastOverlayDrawMs = nowMs;
      ctx.clearRect(0, 0, w, h);
      draw3DOverlayHud(ctx, res3d.f, res3d.coords);
      stats.draws += 1;
      if (sig === null) {
        drawSanctuaryFrame._hadTransientFx = true;
        drawSanctuaryFrame._lastOverlaySig = "";
      } else {
        drawSanctuaryFrame._hadTransientFx = false;
        drawSanctuaryFrame._lastOverlaySig = sig;
      }
      return;
    }
  }

  drawSanctuaryFrame._lastOverlaySig = "";
  drawSanctuaryFrame._hadTransientFx = false;

  const p = state.match.phase;
  const night = isNightPhase(p) || (p === "GAME_OVER" && state.match.winner === "wolf");
  const daylight = state.match.started && !night && p !== "LOBBY";

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (nowMs < state.shakeUntil) {
    const mag = 4 * dpr;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  const inGame2D = Boolean(state.match && state.match.started && p !== "GAME_OVER");
  const isWideLobby2D = !inGame2D && p !== "GAME_OVER" && (w / Math.max(1, h)) >= 1.15;
  const rawDt2D = drawSanctuaryFrame._last2DMs ? (nowMs - drawSanctuaryFrame._last2DMs) : 16.6667;
  drawSanctuaryFrame._last2DMs = nowMs;
  const dt2D = clamp(rawDt2D * 0.001, 0.001, 0.05);
  const f = {
    nowMs: nowMs,
    dt: dt2D,
    dt60: dt2D * 60,
    w: w,
    h: h,
    dpr: dpr,
    p: p,
    night: night,
    daylight: daylight,
    cx: isWideLobby2D ? (w * 0.585) : (w * 0.5),
    cy: inGame2D ? (h * 0.345) : (h * 0.50),
    rx: inGame2D ? Math.min(w * 0.35, w * 0.415 - 36 * dpr) : (isWideLobby2D ? Math.min(w * 0.36, w * 0.42 - 36 * dpr) : Math.min(w * 0.435, w * 0.5 - 36 * dpr)),
    ry: inGame2D ? Math.min(h * 0.245, h * 0.31 - 26 * dpr) : Math.min(h * 0.435, h * 0.5 - 36 * dpr),
    tSec: nowMs * 0.001
  };

  drawStageBackdrop(ctx, f);
  const coords = computeStageSeatCoords(f);
  drawStageSeats(ctx, f, coords);
  drawStageOverlays(ctx, f, coords, false);

  ctx.restore();
}

const _MODAL_PAUSE_IDS = [
  "modalPauseMenu", "modalJournal", "modalTutorial", "modalGuide",
  "modalAiConfig", "modalMusic", "modalCareer", "modalFeedback", "roleDealOverlay"
];
function getAdaptiveFrameCapMs() {
  const CAP_60_MS = 1000 / 60;
  const CAP_120_MS = 1000 / 120;
  if (typeof document !== "undefined" && typeof el === "function") {
    const bootOv = el("bootPreloadOverlay");
    if (bootOv && !bootOv.classList.contains("hidden") && startAnimationLoop._firstFrameDrawn) {
      return 100; // 10 FPS while opaque boot preloader covers canvas
    }
    for (let i = 0; i < _MODAL_PAUSE_IDS.length; i++) {
      const mEl = el(_MODAL_PAUSE_IDS[i]);
      if (mEl && !mEl.classList.contains("hidden")) {
        return 1000 / 15; // 15 FPS when full-screen modal covers the 3D scene
      }
    }
  }
  if (typeof state !== "undefined" && state.match && state.match.phase === "GAME_OVER" && typeof document !== "undefined" && document.body && document.body.classList && document.body.classList.contains("screen-gameover")) {
    return 1000 / 20; // 20 FPS on settled Game Over ledger
  }
  if (typeof stage3d !== "undefined" && typeof stage3d.shouldPace30Fps === "function" && stage3d.shouldPace30Fps()) {
    return 1000 / 30;
  }
  return shouldCapFrameRate60() ? CAP_60_MS : CAP_120_MS;
}

function startAnimationLoop() {
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  let lastDrawMs = 0;
  let lastModalCheckMs = 0;
  let cachedCapMs = shouldCapFrameRate60() ? (1000 / 60) : (1000 / 120);
  function frame(now) {
    if (typeof document !== "undefined" && document.hidden) {
      state.animFrame = null;
      return;
    }
    if (!lastModalCheckMs || (now - lastModalCheckMs) > 220) {
      lastModalCheckMs = now;
      cachedCapMs = getAdaptiveFrameCapMs();
    }
    const capMs = cachedCapMs;
    const elapsed = lastDrawMs ? (now - lastDrawMs) : capMs;
    if (lastDrawMs && elapsed < (capMs - 0.8)) {
      state.animFrame = requestAnimationFrame(frame);
      return;
    }
    lastDrawMs = lastDrawMs ? (now - Math.min(capMs, elapsed % capMs)) : now;
    drawSanctuaryFrame(now);
    startAnimationLoop._firstFrameDrawn = true;
    const spPortrait = typeof el === "function" ? el("speakerPortraitCanvas") : null;
    if (!spPortrait || (!spPortrait.classList.contains("hidden") && spPortrait.offsetParent !== null)) {
      drawSpotlightPortrait(now);
    }
    state.animFrame = requestAnimationFrame(frame);
  }
  state.animFrame = requestAnimationFrame(frame);
}

if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !state.animFrame) {
      startAnimationLoop();
    }
  });
}
