/**
 * 向量角色立繪繪製引擎（眼神追蹤、眨眼、表情、嘴型同步與聚光燈肖像）
 */
"use strict";

// ==================== PROCEDURAL VECTOR CHARACTER PORTRAIT ENGINE ====================
// Harmonized Mountain Academy ceramic & linen color palette matching assets/portraits/*.jpg
const CHAR_AVATAR_STYLES = {
  "你":   { hair: "#32241d", hairHi: "#c99a4e", style: "layered",  outfit: "#574133", accent: "#c99a4e", acc: "scarf",    skin: "#f6d8bd", eye: "#3a251b", lash: "soft" },
  "小澄": { hair: "#1d2638", hairHi: "#6d94ba", style: "sleek",    outfit: "#33587a", accent: "#e8decb", acc: "glasses",  skin: "#f5d7bd", eye: "#243044", lash: "clean" },
  "暖暖": { hair: "#5a3825", hairHi: "#d4a657", style: "bob",      outfit: "#b8823c", accent: "#f3e6cc", acc: "ribbon",   skin: "#f8ddc6", eye: "#4c2f1f", lash: "curved" },
  "阿松": { hair: "#3c4248", hairHi: "#9aa3ad", style: "tousled",  outfit: "#2d5a46", accent: "#88b39c", acc: "collar",   skin: "#edc8a8", eye: "#2c241d", lash: "clean" },
  "星兒": { hair: "#3b2749", hairHi: "#b497c9", style: "twintail", outfit: "#7d5b86", accent: "#dfbe76", acc: "clip",     skin: "#f7dcc5", eye: "#46315e", lash: "curved" },
  "小雲": { hair: "#331e28", hairHi: "#b5697a", style: "long",     outfit: "#363842", accent: "#8e3b49", acc: "turtle",   skin: "#f7dfd0", eye: "#3c212c", lash: "curved" },
  "阿竹": { hair: "#202328", hairHi: "#5e938a", style: "sidepart", outfit: "#3b6660", accent: "#29343b", acc: "tie",      skin: "#f1d0b5", eye: "#25302f", lash: "clean" },
  "晨晨": { hair: "#422b1f", hairHi: "#d6943c", style: "spiky",    outfit: "#9e4f2e", accent: "#d6943c", acc: "headband", skin: "#eec9a9", eye: "#3c2519", lash: "clean" },
  "墨白": { hair: "#171a24", hairHi: "#6d7ba8", style: "sidepart", outfit: "#2c3852", accent: "#e8decb", acc: "collar",   skin: "#f3d7c0", eye: "#222940", lash: "clean" },
  "晴嵐": { hair: "#4b2e23", hairHi: "#c99a6b", style: "long",     outfit: "#c0898e", accent: "#6eb59b", acc: "clip",     skin: "#f8dfd0", eye: "#543222", lash: "curved" },
  "阿朗": { hair: "#36241b", hairHi: "#c89552", style: "sleek",    outfit: "#9d7443", accent: "#2d323b", acc: "tie",      skin: "#efccb0", eye: "#6b471f", lash: "clean" },
  "柚子": { hair: "#8a5a2b", hairHi: "#e0b565", style: "bob",      outfit: "#7d9b58", accent: "#f6ecd2", acc: "clip",     skin: "#f8dfc8", eye: "#4b5e2b", lash: "curved" },
  "主持": { hair: "#2b1f1a", hairHi: "#d4a657", style: "sleek",    outfit: "#4c7a69", accent: "#d4a657", acc: "halo",     skin: "#f8ddc4", eye: "#38261c", lash: "soft" }
};

function getAvatarStyleForSeat(seat) {
  if (!seat) return CHAR_AVATAR_STYLES["主持"];
  const key = seat.id === getPlayerId() ? "你" : seat.name;
  return CHAR_AVATAR_STYLES[key] || CHAR_AVATAR_STYLES["你"];
}

function drawCharacterPortrait(ctx, cx, cy, r, seat, opts) {
  const o = opts || {};
  const t = (o.nowMs || 0) * 0.001;
  const st = getAvatarStyleForSeat(seat);
  const alive = seat ? (seat.alive !== false) : true;
  const sleeping = Boolean(o.sleeping) || !alive;
  const talking = Boolean(o.talking) && alive;
  const sweating = Boolean(o.sweating) && alive;
  const daylight = Boolean(o.daylight);
  const seed = seat ? (seat.id * 1.7) : 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const bgGrad = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
  if (!alive) {
    bgGrad.addColorStop(0, daylight ? "#e2e8f0" : "#334155");
    bgGrad.addColorStop(1, daylight ? "#cbd5e1" : "#1e293b");
  } else {
    bgGrad.addColorStop(0, daylight ? "#fffbeb" : "#1e293b");
    bgGrad.addColorStop(1, daylight ? "#fef3c7" : "#0b1120");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (alive) {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.05, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = (seat && seat.color ? seat.color : "#f59e0b") + (daylight ? "28" : "26");
    ctx.fill();
  }

  if (!alive) ctx.globalAlpha = 0.52;

  const bobY = talking
    ? (Math.sin(t * 9.5 + seed) * r * 0.036)
    : (Math.sin(t * 1.8 + seed) * r * 0.015);
  const headY = cy - r * 0.06 + bobY;
  const headR = r * 0.42;

  // Back hair layer
  ctx.fillStyle = alive ? st.hair : "#475569";
  if (st.style === "long" || st.style === "bob") {
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.35, headR * 1.24, headR * (st.style === "long" ? 1.45 : 1.12), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.style === "twintail") {
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.ellipse(cx + side * headR * 1.05, headY + headR * 0.45, headR * 0.44, headR * 0.92, side * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Shoulders & Outfit
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.86, r * 0.78, r * 0.52, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + r * 0.78, cy + r * 1.1);
  ctx.lineTo(cx - r * 0.78, cy + r * 1.1);
  ctx.closePath();
  ctx.fillStyle = alive ? st.outfit : "#64748b";
  ctx.fill();

  // Collar / Scarf / Ribbon
  ctx.fillStyle = alive ? st.accent : "#94a3b8";
  if (st.acc === "scarf") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.50, r * 0.42, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.acc === "ribbon") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.52);
    ctx.lineTo(cx - r * 0.22, cy + r * 0.44);
    ctx.lineTo(cx - r * 0.16, cy + r * 0.62);
    ctx.closePath();
    ctx.moveTo(cx, cy + r * 0.52);
    ctx.lineTo(cx + r * 0.22, cy + r * 0.44);
    ctx.lineTo(cx + r * 0.16, cy + r * 0.62);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.22, cy + r * 0.44);
    ctx.lineTo(cx, cy + r * 0.62);
    ctx.lineTo(cx + r * 0.22, cy + r * 0.44);
    ctx.closePath();
    ctx.fill();
  }

  // Neck & Face
  ctx.fillStyle = alive ? "#ecc5a3" : "#94a3b8";
  ctx.fillRect(cx - headR * 0.26, headY + headR * 0.62, headR * 0.52, headR * 0.45);

  ctx.beginPath();
  ctx.ellipse(cx, headY, headR * 0.94, headR * 1.02, 0, 0, Math.PI * 2);
  ctx.fillStyle = alive ? st.skin : "#cbd5e1";
  ctx.fill();

  const emotion = o.emotion || "neutral";
  const gazeX = clamp(Number(o.gazeX) || 0, -1, 1);
  const gazeY = clamp(Number(o.gazeY) || 0, -1, 1);

  if (alive) {
    ctx.fillStyle = emotion === "happy" ? "rgba(251, 113, 133, 0.42)" : "rgba(251, 113, 133, 0.24)";
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.48, headY + headR * 0.22, headR * 0.19, headR * 0.11, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + headR * 0.48, headY + headR * 0.22, headR * 0.19, headR * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (Live Eye-Tracking + Happy ^ ^ + Shock O O + Periodic Blinking / Sleeping at Night!)
  const eyeY = headY + headR * 0.04;
  const eyeDx = headR * 0.36;
  const blinkCycle = (t + seed * 0.7) % 3.6;
  const isBlinking = !sleeping && emotion !== "shock" && blinkCycle > 3.46;

  if (sleeping || isBlinking) {
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    ctx.lineCap = "round";
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(cx + side * eyeDx, eyeY - headR * 0.02, headR * 0.15, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
    });
  } else if (emotion === "happy") {
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = Math.max(1.5, r * 0.068);
    ctx.lineCap = "round";
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(cx + side * eyeDx, eyeY + headR * 0.06, headR * 0.16, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    });
  } else if (emotion === "shock") {
    const jitter = Math.sin(t * 48) * headR * 0.025;
    [-1, 1].forEach(function (side) {
      const ex = cx + side * eyeDx;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, headR * 0.175, headR * 0.20, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = Math.max(1.0, r * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex + gazeX * headR * 0.05 + jitter, eyeY + gazeY * headR * 0.04, headR * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
    });
  } else {
    const gx = gazeX * headR * 0.065;
    const gy = gazeY * headR * 0.045;
    [-1, 1].forEach(function (side) {
      const ex = cx + side * eyeDx + gx;
      const ey = eyeY + gy;
      ctx.beginPath();
      ctx.ellipse(ex, ey, headR * 0.135, headR * 0.165, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex - headR * 0.035 + gx * 0.25, ey - headR * 0.055 + gy * 0.25, emotion === "proud" ? headR * 0.068 : headR * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = emotion === "proud" ? "#fef08a" : "#ffffff";
      ctx.fill();
    });
  }

  // Eyebrows
  ctx.strokeStyle = alive ? st.hair : "#475569";
  ctx.lineWidth = Math.max(1.1, r * 0.045);
  ctx.lineCap = "round";
  const browLift = (talking || emotion === "shock") ? (-headR * 0.09) : (emotion === "happy" ? -headR * 0.06 : 0);
  [-1, 1].forEach(function (side) {
    const bx = cx + side * eyeDx;
    const by = eyeY - headR * 0.28 + browLift;
    ctx.beginPath();
    if (sweating || emotion === "shock") {
      ctx.moveTo(bx - side * headR * 0.16, by - headR * 0.06);
      ctx.lineTo(bx + side * headR * 0.14, by + headR * 0.07);
    } else {
      ctx.moveTo(bx - headR * 0.15, by + headR * 0.03);
      ctx.quadraticCurveTo(bx, by - headR * 0.05, bx + headR * 0.15, by + headR * 0.03);
    }
    ctx.stroke();
  });

  // Live Talking Lip-Sync & Expressive Emotion Mouth
  const mouthY = headY + headR * 0.46;
  if (talking) {
    const openAmt = 0.24 + 0.46 * Math.abs(Math.sin(t * 14.5 + seed)) + 0.28 * Math.abs(Math.sin(t * 21.0));
    const mw = headR * (0.20 + 0.08 * Math.sin(t * 11));
    const mh = headR * (0.08 + 0.19 * Math.min(1, openAmt));
    ctx.beginPath();
    ctx.ellipse(cx, mouthY, mw, mh, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9f1239";
    ctx.fill();
    if (mh > headR * 0.12) {
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + mh * 0.35, mw * 0.65, mh * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fb7185";
      ctx.fill();
    }
  } else if (emotion === "shock") {
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + headR * 0.02, headR * 0.11, headR * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9f1239";
    ctx.fill();
  } else if (emotion === "happy" || emotion === "proud") {
    ctx.beginPath();
    ctx.arc(cx, mouthY - headR * 0.04, headR * 0.21, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.fillStyle = "#e11d48";
    ctx.fill();
  } else if (sweating) {
    ctx.strokeStyle = "#9f1239";
    ctx.lineWidth = Math.max(1.2, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.18, mouthY + headR * 0.04);
    ctx.quadraticCurveTo(cx - headR * 0.06, mouthY - headR * 0.05, cx, mouthY + headR * 0.02);
    ctx.quadraticCurveTo(cx + headR * 0.06, mouthY + headR * 0.09, cx + headR * 0.18, mouthY);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#9a3412";
    ctx.lineWidth = Math.max(1.2, r * 0.045);
    ctx.beginPath();
    ctx.arc(cx, mouthY - headR * 0.08, headR * 0.16, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  }

  // Front Hair & Bangs
  ctx.fillStyle = alive ? st.hair : "#475569";
  ctx.beginPath();
  ctx.arc(cx, headY - headR * 0.16, headR * 1.03, Math.PI * 1.02, Math.PI * 1.98);
  if (st.style === "spiky") {
    ctx.lineTo(cx + headR * 0.85, headY - headR * 0.15);
    ctx.lineTo(cx + headR * 0.45, headY - headR * 0.48);
    ctx.lineTo(cx + headR * 0.15, headY - headR * 0.16);
    ctx.lineTo(cx - headR * 0.15, headY - headR * 0.52);
    ctx.lineTo(cx - headR * 0.55, headY - headR * 0.18);
    ctx.lineTo(cx - headR * 0.92, headY - headR * 0.30);
  } else if (st.style === "sidepart" || st.style === "sleek") {
    ctx.quadraticCurveTo(cx + headR * 0.35, headY - headR * 0.25, cx - headR * 0.28, headY - headR * 0.46);
    ctx.quadraticCurveTo(cx - headR * 0.75, headY - headR * 0.30, cx - headR * 1.02, headY - headR * 0.10);
  } else {
    ctx.quadraticCurveTo(cx + headR * 0.55, headY - headR * 0.18, cx + headR * 0.15, headY - headR * 0.40);
    ctx.quadraticCurveTo(cx - headR * 0.15, headY - headR * 0.16, cx - headR * 0.55, headY - headR * 0.38);
    ctx.quadraticCurveTo(cx - headR * 0.88, headY - headR * 0.22, cx - headR * 1.02, headY - headR * 0.08);
  }
  ctx.closePath();
  ctx.fill();

  if (alive) {
    ctx.strokeStyle = st.hairHi;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.22, headR * 0.78, Math.PI * 1.25, Math.PI * 1.72);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Accessories
  if (st.acc === "glasses" && alive) {
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = Math.max(1.1, r * 0.042);
    ctx.beginPath();
    ctx.arc(cx - eyeDx, eyeY, headR * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + eyeDx, eyeY, headR * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - eyeDx + headR * 0.22, eyeY);
    ctx.lineTo(cx + eyeDx - headR * 0.22, eyeY);
    ctx.stroke();
  } else if (st.acc === "clip" && alive) {
    ctx.fillStyle = "#fde047";
    ctx.fillRect(cx + headR * 0.42, headY - headR * 0.42, headR * 0.32, headR * 0.10);
  } else if (st.acc === "headband" && alive) {
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.12, headR * 0.96, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  if (sweating) {
    const dropY = headY - headR * 0.25 + ((t * 18) % (headR * 0.35));
    const dropX = cx + headR * 0.68;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(dropX, dropY - headR * 0.16);
    ctx.quadraticCurveTo(dropX + headR * 0.13, dropY + headR * 0.06, dropX, dropY + headR * 0.14);
    ctx.quadraticCurveTo(dropX - headR * 0.13, dropY + headR * 0.06, dropX, dropY - headR * 0.16);
    ctx.fill();
  }

  ctx.restore();
}

function drawSpotlightPortrait(nowMs) {
  const pc = el("speakerPortraitCanvas");
  if (!pc || (pc.classList && pc.classList.contains("hidden"))) return;
  const box = el("spotlightStageBox");
  if (!box || box.classList.contains("hidden")) return;
  const pCtx = pc._ctx2d || (pc._ctx2d = pc.getContext("2d"));
  const w = pc.width, h = pc.height;
  pCtx.clearRect(0, 0, w, h);

  const sp = getSeat(state.activeSpeakerId);
  const daylight = document.body.classList.contains("theme-day");
  const talking = Boolean(state.typewriter.active || voice.speaking);
  const sweating = Boolean(sp && (state.match.microPulseRevealed || sp.sweatExposed) && sp.microPulse >= 60);

  const spEmotion = sp ? getSeatEmotion(sp.id, nowMs) : "neutral";
  drawCharacterPortrait(pCtx, w * 0.5, h * 0.5, w * 0.48, sp, {
    nowMs: nowMs,
    talking: talking,
    sleeping: false,
    sweating: sweating || spEmotion === "shock",
    emotion: spEmotion,
    gazeX: Math.sin(nowMs * 0.0014) * 0.35,
    gazeY: 0,
    daylight: daylight
  });

  pc.style.borderColor = sp ? sp.color : "#f59e0b";
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
