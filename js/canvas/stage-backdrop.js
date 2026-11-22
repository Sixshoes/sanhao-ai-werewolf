/**
 * 圓桌舞台背景層：漸層天象、日月、傅立葉山景、黃金角粒子場、超公式曼陀羅與圓桌外環
 */
"use strict";

function drawStageBackdrop(ctx, f) {
  const { nowMs, w, h, dpr, night, daylight, cx, cy, rx, ry, tSec } = f;

  // 1. 100% Procedural Atmospheric Sky Gradient (Zero Bitmap Assets)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (daylight) {
    skyGrad.addColorStop(0, "#7dd3fc");
    skyGrad.addColorStop(0.42, "#e0f2fe");
    skyGrad.addColorStop(0.74, "#fef3c7");
    skyGrad.addColorStop(1, "#fde68a");
  } else if (night) {
    skyGrad.addColorStop(0, "#050314");
    skyGrad.addColorStop(0.55, "#110b2e");
    skyGrad.addColorStop(1, "#070418");
  } else {
    skyGrad.addColorStop(0, "#090f24");
    skyGrad.addColorStop(0.55, "#151c3b");
    skyGrad.addColorStop(1, "#0b1022");
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 1.5 Parametric Celestial Body (Sun Petals in Day / Crescent Moon in Night)
  if (daylight) {
    const sunX = w * 0.85, sunY = h * 0.16;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4 * dpr, sunX, sunY, w * 0.48);
    sunGlow.addColorStop(0, "rgba(255, 255, 255, 0.96)");
    sunGlow.addColorStop(0.16, "rgba(253, 224, 71, 0.72)");
    sunGlow.addColorStop(0.52, "rgba(251, 191, 36, 0.18)");
    sunGlow.addColorStop(1, "rgba(254, 243, 199, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, h);

    // Harmonic Sun Corona: r(theta) = R0 + A*sin(12*theta + t)
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const th = (i / 120) * Math.PI * 2;
      const sr = (22 + 5.5 * Math.sin(12 * th + tSec * 1.2)) * dpr;
      const sx = sunX + Math.cos(th) * sr;
      const sy = sunY + Math.sin(th) * sr;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 251, 235, 0.72)";
    ctx.fill();
    ctx.restore();
  } else if (night) {
    const moonX = w * 0.15, moonY = h * 0.16;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 4 * dpr, moonX, moonY, w * 0.34);
    moonGlow.addColorStop(0, "rgba(224, 231, 255, 0.55)");
    moonGlow.addColorStop(0.3, "rgba(139, 92, 246, 0.22)");
    moonGlow.addColorStop(1, "rgba(7, 4, 24, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, w, h);

    // Analytic Crescent Moon (Circle Intersection)
    ctx.save();
    const mr = 18 * dpr;
    ctx.beginPath();
    ctx.arc(moonX, moonY, mr, 0, Math.PI * 2);
    ctx.fillStyle = "#e0e7ff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 7 * dpr, moonY - 4 * dpr, mr * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0720";
    ctx.fill();
    ctx.restore();
  }

  // 2. Multi-Octave Fourier Sine Superposition Mountain Sanctuary Horizon
  ctx.save();
  const ridgeConfigs = daylight
    ? [
        { base: 0.78, amp: 0.075, freq: 2.1, phase: 0.4, color: "rgba(217, 119, 6, 0.13)" },
        { base: 0.85, amp: 0.055, freq: 3.4, phase: 1.9, color: "rgba(180, 83, 9, 0.17)" },
        { base: 0.92, amp: 0.038, freq: 5.0, phase: 3.2, color: "rgba(146, 64, 14, 0.20)" }
      ]
    : night
    ? [
        { base: 0.77, amp: 0.08, freq: 2.0, phase: 0.5, color: "rgba(76, 29, 149, 0.26)" },
        { base: 0.85, amp: 0.055, freq: 3.3, phase: 2.1, color: "rgba(49, 46, 129, 0.38)" },
        { base: 0.92, amp: 0.036, freq: 4.8, phase: 3.4, color: "rgba(15, 10, 40, 0.65)" }
      ]
    : [
        { base: 0.78, amp: 0.075, freq: 2.2, phase: 0.6, color: "rgba(30, 58, 138, 0.25)" },
        { base: 0.86, amp: 0.052, freq: 3.5, phase: 2.0, color: "rgba(30, 41, 59, 0.42)" },
        { base: 0.93, amp: 0.035, freq: 5.1, phase: 3.5, color: "rgba(15, 23, 42, 0.62)" }
      ];
  ridgeConfigs.forEach(function (rc, idx) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const segs = 72;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const yNorm = rc.base
        - rc.amp * Math.sin(u * Math.PI * rc.freq + rc.phase)
        - rc.amp * 0.42 * Math.sin(u * Math.PI * rc.freq * 2.13 + rc.phase * 1.7 + tSec * 0.06 * (idx + 1))
        - rc.amp * 0.18 * Math.cos(u * Math.PI * rc.freq * 3.7);
      ctx.lineTo(u * w, yNorm * h);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = rc.color;
    ctx.fill();
  });
  ctx.restore();

  // 2.5 Vogel Phyllotaxis Golden-Angle Particle Field (Reacts magnetically to cursor!)
  ctx.save();
  const goldenAngle = 2.399963229728653;
  const maxR = Math.hypot(w * 0.5, h * 0.5);
  for (let n = 1; n <= 64; n++) {
    const rFrac = Math.sqrt(n / 64);
    const ang = n * goldenAngle + tSec * (night ? 0.035 : 0.022) * (n % 2 === 0 ? 1 : -1);
    let px = cx + Math.cos(ang) * maxR * rFrac * 0.96;
    let py = cy + Math.sin(ang) * maxR * rFrac * 0.96;
    let boost = 0;
    if (state.pointer.inside) {
      const pdx = px - state.pointer.x;
      const pdy = py - state.pointer.y;
      const pDist = Math.hypot(pdx, pdy);
      const repelR = 95 * dpr;
      if (pDist > 1 && pDist < repelR) {
        const force = (1 - pDist / repelR) * 18 * dpr;
        px += (pdx / pDist) * force;
        py += (pdy / pDist) * force;
        boost = (1 - pDist / repelR) * 0.45;
      }
    }
    const twinkle = Math.min(1, 0.22 + 0.45 * (0.5 + 0.5 * Math.sin(tSec * 2.1 + n * 0.9)) + boost);
    const pr = (1.1 + (n % 3) * 0.7 + boost * 1.4) * dpr;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = daylight
      ? ("rgba(217, 119, 6, " + (twinkle * 0.52).toFixed(2) + ")")
      : night
      ? ("rgba(224, 231, 255, " + (twinkle * 0.80).toFixed(2) + ")")
      : ("rgba(251, 191, 36, " + (twinkle * 0.68).toFixed(2) + ")");
    ctx.fill();
  }
  ctx.restore();

  // 3. Gielis Superformula Sacred Lotus / Star Sanctuary Mandala (Pure Parametric Geometry)
  ctx.save();
  const drawSuperformula = function (m, n1, n2, n3, scaleX, scaleY, rot, strokeCol, fillCol, lw) {
    ctx.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      const a = Math.abs(Math.cos((m * th) / 4));
      const b = Math.abs(Math.sin((m * th) / 4));
      const denom = Math.pow(Math.pow(a, n2) + Math.pow(b, n3), 1 / n1);
      const r = denom > 0.0001 ? (1 / denom) : 1;
      const px = cx + Math.cos(th + rot) * r * scaleX;
      const py = cy + Math.sin(th + rot) * r * scaleY;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fillCol) {
      ctx.fillStyle = fillCol;
      ctx.fill();
    }
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };

  if (daylight) {
    // Blooming 8-Petal Golden Lotus Sanctuary
    drawSuperformula(8, 1.4, 2.2, 2.2, rx * 0.86, ry * 0.86, tSec * 0.05, "rgba(217, 119, 6, 0.24)", "rgba(255, 253, 245, 0.42)", 1.5 * dpr);
    drawSuperformula(8, 2.1, 3.0, 3.0, rx * 0.68, ry * 0.68, -tSec * 0.04, "rgba(245, 158, 11, 0.26)", null, 1.2 * dpr);
  } else if (night) {
    // 12-Point Celestial Star Sanctuary
    drawSuperformula(12, 0.75, 1.5, 1.5, rx * 0.82, ry * 0.82, tSec * 0.04, "rgba(167, 139, 250, 0.28)", "rgba(30, 27, 75, 0.22)", 1.4 * dpr);
    drawSuperformula(6, 1.6, 2.4, 2.4, rx * 0.66, ry * 0.66, -tSec * 0.05, "rgba(129, 140, 248, 0.24)", null, 1.2 * dpr);
  } else {
    // Calm 6-Petal Twilight Lotus Geometry
    drawSuperformula(6, 1.5, 2.3, 2.3, rx * 0.84, ry * 0.84, tSec * 0.045, "rgba(245, 185, 66, 0.26)", "rgba(15, 23, 42, 0.28)", 1.4 * dpr);
    drawSuperformula(12, 1.9, 2.8, 2.8, rx * 0.66, ry * 0.66, -tSec * 0.03, "rgba(56, 189, 248, 0.22)", null, 1.1 * dpr);
  }

  // 3.5 Rotating Hypotrochoid Spirograph Filigree Ring framing the Table
  ctx.beginPath();
  const R_sp = 5, r_sp = 3, d_sp = 2.1;
  const spSteps = 220;
  const spScaleX = (rx * 0.96) / (R_sp - r_sp + d_sp);
  const spScaleY = (ry * 0.96) / (R_sp - r_sp + d_sp);
  for (let i = 0; i <= spSteps; i++) {
    const u = (i / spSteps) * Math.PI * 6;
    const x0 = (R_sp - r_sp) * Math.cos(u) + d_sp * Math.cos(((R_sp - r_sp) / r_sp) * u);
    const y0 = (R_sp - r_sp) * Math.sin(u) - d_sp * Math.sin(((R_sp - r_sp) / r_sp) * u);
    const cRot = Math.cos(tSec * 0.04), sRot = Math.sin(tSec * 0.04);
    const px = cx + (x0 * cRot - y0 * sRot) * spScaleX;
    const py = cy + (x0 * sRot + y0 * cRot) * spScaleY;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = daylight ? "rgba(217, 119, 6, 0.16)" : (night ? "rgba(167, 139, 250, 0.18)" : "rgba(245, 185, 66, 0.16)");
  ctx.lineWidth = 1.1 * dpr;
  ctx.stroke();

  // Main Elliptical Table Rim + Subtle Inner Halo
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = daylight ? "rgba(217, 119, 6, 0.56)" : (night ? "rgba(139, 92, 246, 0.48)" : "rgba(245, 185, 66, 0.42)");
  ctx.lineWidth = 2.4 * dpr;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.70, ry * 0.70, 0, 0, Math.PI * 2);
  ctx.strokeStyle = daylight ? "rgba(217, 119, 6, 0.20)" : "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1.1 * dpr;
  ctx.stroke();
  ctx.restore();
}
