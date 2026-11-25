/**
 * 圓桌舞台背景層（v21.0 離屏靜態快取＋松煙山水漆木茶席美學）：
 * 將天空漸層、日月光暈、多層水墨遠山與胡桃漆木鎏金茶桌烘焙至離屏畫布快取，
 * 每幀僅 1 次 drawImage 疊加輕量浮光微粒，將 2D 模式繪製 CPU 耗時降低約 80%。
 */
"use strict";

const _stageBackdropCache = {
  key: "",
  canvas: null
};

function renderStaticStageBackdrop(ctx, w, h, dpr, mood, cx, cy, rx, ry) {
  const daylight = mood === "day";
  const night = mood === "night";

  // 1. Atmospheric Ink-Wash Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (daylight) {
    skyGrad.addColorStop(0, "#1c3138");
    skyGrad.addColorStop(0.38, "#2d4c50");
    skyGrad.addColorStop(0.72, "#59726c");
    skyGrad.addColorStop(1, "#9a9480");
  } else if (night) {
    skyGrad.addColorStop(0, "#060811");
    skyGrad.addColorStop(0.52, "#10172b");
    skyGrad.addColorStop(1, "#090c18");
  } else {
    skyGrad.addColorStop(0, "#0b101b");
    skyGrad.addColorStop(0.48, "#192233");
    skyGrad.addColorStop(0.82, "#2a2320");
    skyGrad.addColorStop(1, "#120f0d");
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Soft Celestial Halo (Warm Mist Sun / Silver Crescent Moon / Dusk Glow)
  if (daylight) {
    const sunX = w * 0.82, sunY = h * 0.16;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4 * dpr, sunX, sunY, w * 0.46);
    sunGlow.addColorStop(0, "rgba(255, 248, 224, 0.72)");
    sunGlow.addColorStop(0.18, "rgba(240, 206, 134, 0.34)");
    sunGlow.addColorStop(0.52, "rgba(218, 178, 108, 0.10)");
    sunGlow.addColorStop(1, "rgba(218, 178, 108, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(sunX, sunY, 20 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 250, 232, 0.86)";
    ctx.fill();
  } else if (night) {
    const moonX = w * 0.16, moonY = h * 0.16;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 4 * dpr, moonX, moonY, w * 0.32);
    moonGlow.addColorStop(0, "rgba(224, 232, 255, 0.44)");
    moonGlow.addColorStop(0.32, "rgba(148, 163, 214, 0.16)");
    moonGlow.addColorStop(1, "rgba(10, 14, 28, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const mr = 16 * dpr;
    ctx.beginPath();
    ctx.arc(moonX, moonY, mr, 0, Math.PI * 2);
    ctx.fillStyle = "#e6ecff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 6.5 * dpr, moonY - 3.5 * dpr, mr * 0.90, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1020";
    ctx.fill();
    ctx.restore();
  } else {
    const duskGlow = ctx.createRadialGradient(w * 0.56, h * 0.52, 10 * dpr, w * 0.56, h * 0.52, w * 0.55);
    duskGlow.addColorStop(0, "rgba(218, 164, 88, 0.14)");
    duskGlow.addColorStop(0.55, "rgba(168, 92, 54, 0.06)");
    duskGlow.addColorStop(1, "rgba(12, 10, 8, 0)");
    ctx.fillStyle = duskGlow;
    ctx.fillRect(0, 0, w, h);
  }

  // 3. Layered Ink-Wash Mountain Silhouettes (Baked Once!)
  const ridgeConfigs = daylight
    ? [
        { base: 0.72, amp: 0.068, freq: 2.0, phase: 0.4, color: "rgba(28, 49, 52, 0.36)" },
        { base: 0.81, amp: 0.052, freq: 3.1, phase: 1.9, color: "rgba(20, 36, 39, 0.56)" },
        { base: 0.90, amp: 0.036, freq: 4.5, phase: 3.2, color: "rgba(13, 22, 24, 0.78)" }
      ]
    : night
    ? [
        { base: 0.74, amp: 0.072, freq: 2.0, phase: 0.5, color: "rgba(24, 34, 62, 0.42)" },
        { base: 0.83, amp: 0.050, freq: 3.3, phase: 2.1, color: "rgba(15, 22, 42, 0.64)" },
        { base: 0.91, amp: 0.034, freq: 4.6, phase: 3.4, color: "rgba(9, 12, 24, 0.84)" }
      ]
    : [
        { base: 0.74, amp: 0.070, freq: 2.1, phase: 0.6, color: "rgba(26, 32, 46, 0.40)" },
        { base: 0.83, amp: 0.050, freq: 3.4, phase: 2.0, color: "rgba(18, 20, 28, 0.62)" },
        { base: 0.91, amp: 0.034, freq: 4.8, phase: 3.5, color: "rgba(12, 11, 12, 0.82)" }
      ];
  ridgeConfigs.forEach(function (rc) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const segs = 64;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const yNorm = rc.base
        - rc.amp * Math.sin(u * Math.PI * rc.freq + rc.phase)
        - rc.amp * 0.38 * Math.sin(u * Math.PI * rc.freq * 2.1 + rc.phase * 1.6)
        - rc.amp * 0.16 * Math.cos(u * Math.PI * rc.freq * 3.5);
      ctx.lineTo(u * w, yNorm * h);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = rc.color;
    ctx.fill();
  });

  // 4. Sculpted Carved-Walnut & Deep Celadon-Obsidian Tea Table Centerpiece
  ctx.save();
  // Soft floor drop shadow under tea table
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8 * dpr, rx * 1.03, ry * 1.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.44)";
  ctx.fill();

  // Outer carved walnut table rim
  const rimGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  rimGrad.addColorStop(0, "#4c3220");
  rimGrad.addColorStop(0.5, "#332014");
  rimGrad.addColorStop(1, "#22140c");
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 1.01, ry * 1.01, 0, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Inner celadon-obsidian silk brocade mat
  const feltR = Math.max(rx, ry) * 0.94;
  const feltGrad = ctx.createRadialGradient(cx, cy, 8 * dpr, cx, cy, feltR);
  if (daylight) {
    feltGrad.addColorStop(0, "#1f3538");
    feltGrad.addColorStop(0.62, "#142427");
    feltGrad.addColorStop(1, "#0c1618");
  } else if (night) {
    feltGrad.addColorStop(0, "#182138");
    feltGrad.addColorStop(0.62, "#101628");
    feltGrad.addColorStop(1, "#090d19");
  } else {
    feltGrad.addColorStop(0, "#1b2b2e");
    feltGrad.addColorStop(0.62, "#121d21");
    feltGrad.addColorStop(1, "#0a1114");
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = feltGrad;
  ctx.fill();

  // Fine inlaid antique-gold concentric table rings
  ctx.strokeStyle = daylight ? "rgba(232, 194, 118, 0.56)" : (night ? "rgba(184, 196, 238, 0.42)" : "rgba(224, 184, 110, 0.48)");
  ctx.lineWidth = 2.0 * dpr;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = daylight ? "rgba(224, 184, 110, 0.24)" : "rgba(214, 176, 106, 0.20)";
  ctx.lineWidth = 1.0 * dpr;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.66, ry * 0.66, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Delicate 8-Petal Inlaid Lotus Medallion in Table Center
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, Math.max(0.4, ry / Math.max(1, rx)));
  const lotusR = rx * 0.62;
  ctx.strokeStyle = daylight ? "rgba(228, 190, 114, 0.22)" : (night ? "rgba(176, 188, 232, 0.20)" : "rgba(224, 184, 110, 0.20)");
  ctx.lineWidth = 1.2 * dpr;
  for (let pIdx = 0; pIdx < 8; pIdx++) {
    ctx.save();
    ctx.rotate((pIdx * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, -lotusR * 0.24);
    ctx.quadraticCurveTo(lotusR * 0.22, -lotusR * 0.62, 0, -lotusR);
    ctx.quadraticCurveTo(-lotusR * 0.22, -lotusR * 0.62, 0, -lotusR * 0.24);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

function drawStageBackdrop(ctx, f) {
  const { w, h, dpr, night, daylight, cx, cy, rx, ry, tSec } = f;
  const mood = daylight ? "day" : (night ? "night" : "twilight");
  const cacheKey = mood + ":" + w + "x" + h + ":" + Math.round(cx) + "," + Math.round(cy) + "," + Math.round(rx) + "," + Math.round(ry);

  let usedCache = false;
  if (typeof document !== "undefined" && typeof document.createElement === "function" && typeof ctx.drawImage === "function") {
    if (_stageBackdropCache.key !== cacheKey || !_stageBackdropCache.canvas) {
      const off = _stageBackdropCache.canvas || document.createElement("canvas");
      if (off && typeof off.getContext === "function") {
        off.width = Math.max(1, Math.round(w));
        off.height = Math.max(1, Math.round(h));
        const offCtx = off.getContext("2d");
        if (offCtx && typeof offCtx.createLinearGradient === "function") {
          renderStaticStageBackdrop(offCtx, w, h, dpr, mood, cx, cy, rx, ry);
          _stageBackdropCache.canvas = off;
          _stageBackdropCache.key = cacheKey;
        }
      }
    }
    if (_stageBackdropCache.canvas && _stageBackdropCache.key === cacheKey) {
      try {
        ctx.drawImage(_stageBackdropCache.canvas, 0, 0);
        usedCache = true;
      } catch (e) {
        usedCache = false;
      }
    }
  }
  if (!usedCache) {
    renderStaticStageBackdrop(ctx, w, h, dpr, mood, cx, cy, rx, ry);
  }

  // Lightweight Ambient Golden-Mist Motes (24 particles only — zero heavy math!)
  ctx.save();
  const goldenAngle = 2.399963229728653;
  const maxR = Math.hypot(w * 0.48, h * 0.48);
  for (let n = 1; n <= 24; n++) {
    const rFrac = Math.sqrt(n / 24);
    const ang = n * goldenAngle + tSec * (night ? 0.028 : 0.018) * (n % 2 === 0 ? 1 : -1);
    const px = cx + Math.cos(ang) * maxR * rFrac * 0.94;
    const py = cy + Math.sin(ang) * maxR * rFrac * 0.94;
    const twinkle = 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(tSec * 1.6 + n * 1.1));
    const pr = (1.0 + (n % 3) * 0.55) * dpr;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = night
      ? ("rgba(216, 226, 255, " + (twinkle * 0.72).toFixed(2) + ")")
      : ("rgba(238, 200, 124, " + (twinkle * 0.62).toFixed(2) + ")");
    ctx.fill();
  }
  ctx.restore();
}
