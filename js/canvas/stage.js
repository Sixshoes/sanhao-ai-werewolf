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

function resizeCanvas() {
  const container = el("canvasStageWrap") || el("canvasContainer");
  const canvas = el("sanctuaryCanvas");
  if (!container || !canvas) return;
  const rect = container.getBoundingClientRect();
  const maxOverlayDpr = (typeof stage3d !== "undefined" && stage3d.isIntegratedGpu) ? 1.25 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxOverlayDpr);
  canvas.width = Math.max(300, Math.floor(rect.width * dpr));
  canvas.height = Math.max(220, Math.floor(rect.height * dpr));
  if (typeof closeRadialMenu === "function") closeRadialMenu();
  if (typeof positionSeatIntelPopover === "function") positionSeatIntelPopover();
  if (typeof stage3d !== "undefined" && stage3d.ready) {
    stage3d.resize();
  }
  drawSanctuaryFrame(performance.now());
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
    if (p === "DAY_SPEECH" && state.activeSpeakerId === b.seatId && state.activeBubble && state.activeBubble.born === b.born) {
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

    // Smart positioning: keep inside canvas and clear of center card when possible
    let bx = node.x - bw * 0.5;
    let by = node.y - node.r - bh - 12 * dpr;
    if (by < 8 * dpr) {
      by = node.y + node.r + 14 * dpr;
    }
    bx = clamp(bx, 8 * dpr, w - bw - 8 * dpr);
    by = clamp(by, 8 * dpr, h - bh - 8 * dpr);

    const isWolfMood = b.mood === "wolf" || b.mood === "suspect";
    const isTrustMood = b.mood === "trust";
    drawRoundedRect(ctx, bx, by, bw, bh, 9 * dpr);
    ctx.fillStyle = daylight
      ? (isWolfMood ? "rgba(255, 241, 242, 0.96)" : (isTrustMood ? "rgba(236, 253, 245, 0.96)" : "rgba(255, 253, 246, 0.96)"))
      : (isWolfMood ? "rgba(76, 5, 25, 0.94)" : (isTrustMood ? "rgba(6, 78, 59, 0.94)" : "rgba(15, 23, 42, 0.94)"));
    ctx.fill();
    ctx.lineWidth = 1.6 * dpr;
    ctx.strokeStyle = isWolfMood ? "#fb7185" : (isTrustMood ? "#34d399" : "#f59e0b");
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = daylight
      ? (isWolfMood ? "#9f1239" : (isTrustMood ? "#065f46" : "#78350f"))
      : "#f8fafc";
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

  // 8. Cursor Stardust Trail, Click Shockwaves & Physics Burst Particles!
  state.pointerTrail = state.pointerTrail.filter(function (pt) { return nowMs - pt.born < 420; });
  state.pointerTrail.forEach(function (pt) {
    const pProg = (nowMs - pt.born) / 420;
    ctx.save();
    ctx.globalAlpha = (1 - pProg) * 0.65;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (3.2 * (1 - pProg) + 0.8) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = daylight ? "#f59e0b" : "#fde68a";
    ctx.fill();
    ctx.restore();
  });

  state.ripples = state.ripples.filter(function (rp) { return nowMs - rp.born < rp.ttl; });
  state.ripples.forEach(function (rp) {
    const prog = (nowMs - rp.born) / rp.ttl;
    ctx.save();
    ctx.globalAlpha = (1 - prog) * 0.72;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, (8 + prog * rp.maxR) * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = rp.color;
    ctx.lineWidth = (2.6 * (1 - prog) + 0.6) * dpr;
    ctx.stroke();
    ctx.restore();
  });

  state.burstParticles = state.burstParticles.filter(function (bp) { return nowMs - bp.born < bp.ttl; });
  state.burstParticles.forEach(function (bp) {
    const prog = (nowMs - bp.born) / bp.ttl;
    bp.x += bp.vx * dpr;
    bp.y += bp.vy * dpr;
    bp.vx *= 0.965;
    bp.vy = bp.vy * 0.965 + (bp.style === "petal" ? 0.045 : 0.08);
    bp.rot += bp.vRot;
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
  });

  // 8.5 Floating Action VFX Popups (with elastic overshoot pop & crisp stroke!)
  state.fxPopups = state.fxPopups.filter(function (fx) { return nowMs - fx.born < (fx.duration || 1350); });
  state.fxPopups.forEach(function (fx) {
    const dur = fx.duration || 1350;
    const sc = fx.scale || 1;
    const progress = (nowMs - fx.born) / dur;
    const popEase = progress < 0.10
      ? (0.65 + (progress / 0.10) * 0.52)
      : (progress < 0.22 ? (1.17 - ((progress - 0.10) / 0.12) * 0.17) : 1.0);
    ctx.save();
    ctx.globalAlpha = progress < 0.72 ? 1 : clamp((1 - progress) / 0.28, 0, 1);
    ctx.font = "900 " + Math.round(13.5 * sc * popEase * dpr) + "px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = (3.2 * sc) * dpr;
    ctx.strokeStyle = daylight ? "rgba(255, 255, 255, 0.95)" : "rgba(9, 13, 26, 0.9)";
    const py = fx.y - Math.pow(progress, 0.78) * 38 * dpr;
    ctx.strokeText(fx.text, fx.x, py);
    ctx.fillStyle = daylight && fx.color === "#fde68a" ? "#b45309" : fx.color;
    ctx.fillText(fx.text, fx.x, py);
    ctx.restore();
  });

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
  const maxOverlayDpr = (typeof stage3d !== "undefined" && stage3d.isIntegratedGpu) ? 1.25 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxOverlayDpr);

  // 3D Mode: Render Three.js WebGL Sanctuary + Crisp Transparent 2D HUD Overlay!
  if (typeof stage3d !== "undefined" && stage3d.isActive()) {
    ctx.clearRect(0, 0, w, h);
    const res3d = stage3d.render(nowMs, canvas);
    if (res3d) {
      draw3DOverlayHud(ctx, res3d.f, res3d.coords);
      return;
    }
  }

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
  const f = {
    nowMs: nowMs,
    w: w,
    h: h,
    dpr: dpr,
    p: p,
    night: night,
    daylight: daylight,
    cx: w * 0.5,
    cy: inGame2D ? (h * 0.39) : (h * 0.50),
    rx: inGame2D ? Math.min(w * 0.38, w * 0.45 - 38 * dpr) : Math.min(w * 0.435, w * 0.5 - 36 * dpr),
    ry: inGame2D ? Math.min(h * 0.27, h * 0.34 - 28 * dpr) : Math.min(h * 0.435, h * 0.5 - 36 * dpr),
    tSec: nowMs * 0.001
  };

  drawStageBackdrop(ctx, f);
  const coords = computeStageSeatCoords(f);
  drawStageSeats(ctx, f, coords);
  drawStageOverlays(ctx, f, coords, false);

  ctx.restore();
}

function startAnimationLoop() {
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  let lastDrawMs = 0;
  function frame(now) {
    if (typeof document !== "undefined" && document.hidden) {
      state.animFrame = null;
      return;
    }
    // Smooth 60fps pacing cap so 144Hz/240Hz monitors never saturate single-threaded WebGL/ANGLE!
    if (lastDrawMs && (now - lastDrawMs) < 15.2) {
      state.animFrame = requestAnimationFrame(frame);
      return;
    }
    lastDrawMs = now;
    drawSanctuaryFrame(now);
    drawSpotlightPortrait(now);
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
