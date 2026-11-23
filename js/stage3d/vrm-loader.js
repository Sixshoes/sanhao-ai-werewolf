/**
 * 通用零相依二次元 .VRM（0.x / 1.0）與 .GLB 角色驅動引擎（Three.js r128）
 * 功能：
 * - 支援 9 位全角色（清茗＋1~8號書院夥伴）免外掛直接放入 assets/models/*.vrm 或 *.glb
 * - 自動解析 VRM Humanoid 骨骼與臉部表情 BlendShape / MorphTarget
 * - 自動擺出站姿或端坐茶椅姿、對嘴同步語音振幅、自然眨眼、眼神與情緒驅動
 */
"use strict";

const SEAT_MODEL_SLUGS = {
  "主持": "qingming",
  "清茗": "qingming",
  "你": "player",
  "小澄": "xiaocheng",
  "暖暖": "nuannuan",
  "阿松": "asong",
  "星兒": "xinger",
  "小雲": "xiaoyun",
  "阿竹": "azhu",
  "晨晨": "chenchen",
  "墨白": "mobai",
  "晴嵐": "qinglan",
  "阿朗": "alang",
  "柚子": "youzi"
};

const VRM_IDLE_ARCHETYPES = {
  "你": { gestureStyle: "balanced", breathFreq: 1.95, breathAmp: 0.016, spineLean: 0.01, headRollAmp: 0.020, headTiltBias: 0.0, idleHappy: 0.08, idleFun: 0.04, rDrop: 1.18, rFwd: 0.20, rBend: 0.72, lDrop: 1.18, lFwd: 0.20, lBend: 0.72, armSwayAmp: 0.018, talkArmAmp: 1.00 },
  "小澄": { gestureStyle: "analytical", breathFreq: 1.85, breathAmp: 0.014, spineLean: 0.03, headRollAmp: 0.016, headTiltBias: 0.025, idleHappy: 0.0, idleFun: 0.0, rDrop: 1.16, rFwd: 0.24, rBend: 0.80, lDrop: 1.20, lFwd: 0.16, lBend: 0.66, armSwayAmp: 0.010, talkArmAmp: 0.94 },
  "暖暖": { gestureStyle: "graceful", breathFreq: 2.15, breathAmp: 0.020, spineLean: 0.01, headRollAmp: 0.040, headTiltBias: -0.02, idleHappy: 0.26, idleFun: 0.16, rDrop: 1.17, rFwd: 0.22, rBend: 0.78, lDrop: 1.17, lFwd: 0.22, lBend: 0.78, armSwayAmp: 0.024, talkArmAmp: 0.92 },
  "阿松": { gestureStyle: "steady", breathFreq: 1.35, breathAmp: 0.018, spineLean: -0.02, headRollAmp: 0.012, headTiltBias: 0.0, idleHappy: 0.08, idleFun: 0.0, rDrop: 1.21, rFwd: 0.15, rBend: 0.62, lDrop: 1.21, lFwd: 0.15, lBend: 0.62, armSwayAmp: 0.010, talkArmAmp: 0.88 },
  "星兒": { gestureStyle: "expressive", breathFreq: 2.85, breathAmp: 0.024, spineLean: 0.02, headRollAmp: 0.055, headTiltBias: 0.03, idleHappy: 0.18, idleFun: 0.28, rDrop: 1.15, rFwd: 0.24, rBend: 0.82, lDrop: 1.18, lFwd: 0.18, lBend: 0.70, armSwayAmp: 0.034, talkArmAmp: 1.35 },
  "小雲": { gestureStyle: "analytical", breathFreq: 1.75, breathAmp: 0.016, spineLean: 0.02, headRollAmp: 0.024, headTiltBias: -0.030, idleHappy: 0.06, idleFun: 0.04, rDrop: 1.17, rFwd: 0.22, rBend: 0.78, lDrop: 1.20, lFwd: 0.17, lBend: 0.70, armSwayAmp: 0.016, talkArmAmp: 1.08 },
  "阿竹": { gestureStyle: "poetic", breathFreq: 1.55, breathAmp: 0.014, spineLean: 0.015, headRollAmp: 0.018, headTiltBias: 0.015, idleHappy: 0.06, idleFun: 0.02, rDrop: 1.19, rFwd: 0.20, rBend: 0.76, lDrop: 1.19, lFwd: 0.18, lBend: 0.72, armSwayAmp: 0.014, talkArmAmp: 0.78 },
  "晨晨": { gestureStyle: "energetic", breathFreq: 2.45, breathAmp: 0.022, spineLean: 0.025, headRollAmp: 0.034, headTiltBias: 0.0, idleHappy: 0.18, idleFun: 0.14, rDrop: 1.15, rFwd: 0.22, rBend: 0.72, lDrop: 1.15, lFwd: 0.22, lBend: 0.72, armSwayAmp: 0.028, talkArmAmp: 1.38 },
  "墨白": { gestureStyle: "classical", breathFreq: 1.32, breathAmp: 0.011, spineLean: 0.005, headRollAmp: 0.009, headTiltBias: 0.008, idleHappy: 0.0, idleFun: 0.0, rDrop: 1.20, rFwd: 0.18, rBend: 0.72, lDrop: 1.20, lFwd: 0.18, lBend: 0.72, armSwayAmp: 0.008, talkArmAmp: 0.72 },
  "晴嵐": { gestureStyle: "graceful", breathFreq: 1.65, breathAmp: 0.016, spineLean: 0.01, headRollAmp: 0.026, headTiltBias: -0.022, idleHappy: 0.20, idleFun: 0.10, rDrop: 1.17, rFwd: 0.21, rBend: 0.78, lDrop: 1.18, lFwd: 0.19, lBend: 0.74, armSwayAmp: 0.016, talkArmAmp: 0.78 },
  "阿朗": { gestureStyle: "energetic", breathFreq: 2.15, breathAmp: 0.018, spineLean: 0.03, headRollAmp: 0.022, headTiltBias: 0.015, idleHappy: 0.06, idleFun: 0.06, rDrop: 1.15, rFwd: 0.24, rBend: 0.76, lDrop: 1.18, lFwd: 0.18, lBend: 0.68, armSwayAmp: 0.022, talkArmAmp: 1.28 },
  "柚子": { gestureStyle: "expressive", breathFreq: 2.70, breathAmp: 0.023, spineLean: 0.015, headRollAmp: 0.050, headTiltBias: -0.02, idleHappy: 0.30, idleFun: 0.24, rDrop: 1.15, rFwd: 0.24, rBend: 0.80, lDrop: 1.17, lFwd: 0.21, lBend: 0.76, armSwayAmp: 0.032, talkArmAmp: 1.32 },
  default: { gestureStyle: "balanced", breathFreq: 2.05, breathAmp: 0.016, spineLean: 0.01, headRollAmp: 0.025, headTiltBias: 0.0, idleHappy: 0.05, idleFun: 0.0, rDrop: 1.18, rFwd: 0.20, rBend: 0.72, lDrop: 1.18, lFwd: 0.20, lBend: 0.72, armSwayAmp: 0.016, talkArmAmp: 1.00 }
};

/**
 * v10.0 全 11 位 AI 角色 VRM 外型對齊立繪配置表
 * - 修正小澄性別穿幫（改用男體 VRM 骨架＋深藍髮衣＋頭骨掛載 3D 細框眼鏡）
 * - 補齊 10/12 人局 4 位角色（墨白、晴嵐、阿朗、柚子）全 VRM 骨架＋材質重繪＋專屬 3D 頭飾／胸章
 * - 校正既有角色髮色／衣色與專屬配件（星兒紫髮星夾、阿松銀鬢綠衣、阿竹墨黑青衫玉佩、晨晨橘頭帶等）
 */
const VRM_PERSONA_STYLING = Object.freeze({
  "小澄": Object.freeze({ baseSlug: "azhu",        hairHex: "#1c283d", hairStr: 0.88, topsHex: "#31587d", topsStr: 0.82, neckHex: "#e8decb", eyeHex: "#24354d", vrmAcc: "glasses" }),
  "暖暖": Object.freeze({ baseSlug: "nuannuan",    hairHex: "#623d26", hairStr: 0.45, topsHex: "#c2893b", topsStr: 0.76, neckHex: "#f3e6cc", eyeHex: "#523220", vrmAcc: "ribbon" }),
  "阿松": Object.freeze({ baseSlug: "asong",       hairHex: "#5f6872", hairStr: 0.72, topsHex: "#2a5c46", topsStr: 0.76, neckHex: "#82ab95", eyeHex: "#30261d", vrmAcc: null }),
  "星兒": Object.freeze({ baseSlug: "xinger",      hairHex: "#54366e", hairStr: 0.90, topsHex: "#876094", topsStr: 0.84, neckHex: "#e0be72", eyeHex: "#553b75", vrmAcc: "star_clip" }),
  "小雲": Object.freeze({ baseSlug: "xiaoyun",     hairHex: "#3a1e2b", hairStr: 0.68, topsHex: "#2d303a", topsStr: 0.72, neckHex: "#943548", eyeHex: "#422130", vrmAcc: null }),
  "阿竹": Object.freeze({ baseSlug: "azhu",        hairHex: "#1f242b", hairStr: 0.88, topsHex: "#35615b", topsStr: 0.78, neckHex: "#232a30", eyeHex: "#283635", vrmAcc: "jade_pendant" }),
  "晨晨": Object.freeze({ baseSlug: "chenchen",    hairHex: "#573724", hairStr: 0.78, topsHex: "#b8552a", topsStr: 0.84, neckHex: "#e39c3e", eyeHex: "#42281a", vrmAcc: "headband" }),
  "墨白": Object.freeze({ baseSlug: "chenchen",    hairHex: "#151923", hairStr: 0.88, topsHex: "#31405c", topsStr: 0.86, neckHex: "#ece2d0", eyeHex: "#242c47", vrmAcc: "ink_scroll" }),
  "晴嵐": Object.freeze({ baseSlug: "player",      hairHex: "#523325", hairStr: 0.65, topsHex: "#c98f96", topsStr: 0.82, neckHex: "#f2e8dc", eyeHex: "#593524", vrmAcc: "jade_hairpin" }),
  "阿朗": Object.freeze({ baseSlug: "player_male", hairHex: "#3a251b", hairStr: 0.76, topsHex: "#a37944", topsStr: 0.84, neckHex: "#f0eee8", eyeHex: "#7a511e", vrmAcc: "gavel_brooch" }),
  "柚子": Object.freeze({ baseSlug: "nuannuan",    hairHex: "#a36c33", hairStr: 0.78, topsHex: "#829e5a", topsStr: 0.84, neckHex: "#f6efe0", eyeHex: "#4f642c", vrmAcc: "yuzu_clip" })
});

const stage3dVrm = {
  _scratch: null,
  ensureScratch: function () {
    if (!this._scratch && typeof THREE !== "undefined" && typeof THREE.Quaternion === "function" && typeof THREE.Euler === "function") {
      this._scratch = {
        qDelta: new THREE.Quaternion(),
        qTarget: new THREE.Quaternion(),
        euler: new THREE.Euler(0, 0, 0, "YXZ")
      };
    }
    return this._scratch;
  },

  getIdleArchetype: function (personaName, seed) {
    if (personaName && VRM_IDLE_ARCHETYPES[personaName]) return VRM_IDLE_ARCHETYPES[personaName];
    const keys = ["小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨"];
    if (seed && keys.length) {
      const idx = Math.abs(Math.round(seed * 1.7)) % keys.length;
      return VRM_IDLE_ARCHETYPES[keys[idx]] || VRM_IDLE_ARCHETYPES.default;
    }
    return VRM_IDLE_ARCHETYPES.default;
  },

  playVrmClip: function (inst, clipNameOrIdx) {
    if (!inst || !inst.mixer || !Array.isArray(inst.clips) || inst.clips.length === 0) return false;
    let clip = null;
    if (typeof clipNameOrIdx === "number") {
      clip = inst.clips[clipNameOrIdx] || null;
    } else if (typeof clipNameOrIdx === "string") {
      clip = inst.clips.find(function (c) { return c && c.name === clipNameOrIdx; }) || inst.clips[0];
    } else {
      clip = inst.clips[0];
    }
    if (!clip) return false;
    if (inst.activeAction && typeof inst.activeAction.stop === "function") {
      inst.activeAction.stop();
    }
    inst.activeAction = inst.mixer.clipAction(clip);
    if (inst.activeAction && typeof inst.activeAction.play === "function") {
      inst.activeAction.play();
      inst.lastClipTime = null;
      return true;
    }
    return false;
  },

  stopVrmClip: function (inst) {
    if (!inst) return;
    if (inst.activeAction && typeof inst.activeAction.stop === "function") {
      inst.activeAction.stop();
    }
    inst.activeAction = null;
    inst.lastClipTime = null;
  },

  getPersonaStyling: function (personaName) {
    if (!personaName) return null;
    return VRM_PERSONA_STYLING[personaName] || null;
  },

  resolveVrmRigSlug: function (seatOrName) {
    const slug = this.getSeatModelSlug(seatOrName);
    const name = typeof seatOrName === "string"
      ? seatOrName
      : (seatOrName && seatOrName.name ? seatOrName.name : "");
    if (name && VRM_PERSONA_STYLING[name] && VRM_PERSONA_STYLING[name].baseSlug) {
      return VRM_PERSONA_STYLING[name].baseSlug;
    }
    return slug;
  },

  _recolorCache: {},

  recolorVrmTextureMap: function (srcTex, targetHex, strength) {
    if (!srcTex || !srcTex.image || !targetHex || typeof document === "undefined" || typeof THREE.CanvasTexture !== "function") {
      return srcTex;
    }
    const img = srcTex.image;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (iw < 4 || ih < 4) return srcTex;
    const cacheKey = (srcTex.uuid || "tex") + "|" + targetHex + "|" + (strength || 0.8);
    if (this._recolorCache[cacheKey]) return this._recolorCache[cacheKey];
    try {
      const hex = String(targetHex).replace("#", "");
      const tr = parseInt(hex.slice(0, 2), 16) || 0;
      const tg = parseInt(hex.slice(2, 4), 16) || 0;
      const tb = parseInt(hex.slice(4, 6), 16) || 0;
      const maxDim = 512;
      const sc = Math.min(1, maxDim / Math.max(iw, ih));
      const w = Math.max(16, Math.round(iw * sc));
      const h = Math.max(16, Math.round(ih * sc));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const idata = ctx.getImageData(0, 0, w, h);
      const d = idata.data;
      const blend = clamp(Number(strength) || 0.8, 0.15, 0.96);
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Preserve anime highlights & strand shading while shifting hue cleanly into targetHex!
        const lift = lum > 0.78 ? (0.85 + (lum - 0.78) * 2.1) : (0.36 + lum * 1.18);
        const specBoost = lum > 0.84 ? ((lum - 0.84) * 260) : 0;
        const nr = Math.min(255, tr * lift + specBoost);
        const ng = Math.min(255, tg * lift + specBoost);
        const nb = Math.min(255, tb * lift + specBoost);
        d[i]     = Math.round(r * (1 - blend) + nr * blend);
        d[i + 1] = Math.round(g * (1 - blend) + ng * blend);
        d[i + 2] = Math.round(b * (1 - blend) + nb * blend);
      }
      ctx.putImageData(idata, 0, 0);
      const outTex = new THREE.CanvasTexture(c);
      outTex.flipY = srcTex.flipY;
      outTex.wrapS = srcTex.wrapS;
      outTex.wrapT = srcTex.wrapT;
      if (THREE.sRGBEncoding !== undefined) outTex.encoding = THREE.sRGBEncoding;
      outTex.needsUpdate = true;
      this._recolorCache[cacheKey] = outTex;
      return outTex;
    } catch (e) {
      return srcTex;
    }
  },

  attachVrmPersonaAccessories: function (bones, personaName, isVrm0) {
    const styling = this.getPersonaStyling(personaName);
    if (!styling || !styling.vrmAcc || !bones || typeof THREE === "undefined") return null;
    const acc = styling.vrmAcc;
    const headBone = bones.head;
    const chestBone = bones.upperChest || bones.chest || bones.spine;
    const mounted = [];

    // Auto-calibrate exact face/eye plane in headBone local space (millimeter-accurate on every VRM!)
    let eyeY = 0.068;
    let eyeZ = isVrm0 ? -0.048 : 0.048;
    let fwdSign = isVrm0 ? -1 : 1;
    let eyeHalf = 0.028;
    if (headBone && bones.leftEye && bones.rightEye && typeof headBone.worldToLocal === "function" && typeof bones.leftEye.getWorldPosition === "function") {
      const wL = new THREE.Vector3();
      const wR = new THREE.Vector3();
      bones.leftEye.getWorldPosition(wL);
      bones.rightEye.getWorldPosition(wR);
      const lLoc = headBone.worldToLocal(wL.clone());
      const rLoc = headBone.worldToLocal(wR.clone());
      eyeY = (lLoc.y + rLoc.y) * 0.5;
      eyeZ = (lLoc.z + rLoc.z) * 0.5;
      const dx = Math.abs(lLoc.x - rLoc.x);
      if (dx > 0.012 && dx < 0.14) eyeHalf = dx * 0.5;
      if (Math.abs(eyeZ) > 0.005) fwdSign = eyeZ < 0 ? -1 : 1;
    }

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xebc167, roughness: 0.24, metalness: 0.82 });
    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x6ec7a5, roughness: 0.28, metalness: 0.18 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1c2536, roughness: 0.26, metalness: 0.78 });

    if (acc === "glasses" && headBone) {
      const gGrp = new THREE.Group();
      const lensZ = eyeZ + fwdSign * 0.056;
      const lensR = Math.max(0.019, eyeHalf * 0.76);
      const rimGeo = new THREE.TorusGeometry(lensR, 0.0024, 8, 20);
      const lensGeo = new THREE.CircleGeometry(lensR * 0.92, 16);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0xdcf7ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
      [-1, 1].forEach(function (side) {
        const rim = new THREE.Mesh(rimGeo, darkMetal);
        rim.position.set(side * (eyeHalf * 1.10), eyeY, lensZ);
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(side * (eyeHalf * 1.10), eyeY, lensZ);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0028, 0.095), darkMetal);
        arm.position.set(side * (eyeHalf * 1.10 + lensR * 0.96), eyeY + 0.002, lensZ - fwdSign * 0.048);
        gGrp.add(rim, lens, arm);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(eyeHalf * 0.72, 0.0032, 0.0032), darkMetal);
      bridge.position.set(0, eyeY + 0.003, lensZ + fwdSign * 0.002);
      gGrp.add(bridge);
      headBone.add(gGrp);
      mounted.push(gGrp);
    } else if (acc === "headband" && headBone) {
      const bGrp = new THREE.Group();
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xe6912e, roughness: 0.55, metalness: 0.05 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.013, 8, 28), bandMat);
      band.rotation.x = Math.PI * 0.5;
      band.position.set(0, eyeY + 0.048, eyeZ * 0.12);
      band.scale.set(0.96, 1.06, 1.0);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), bandMat);
      knot.position.set(0, eyeY + 0.045, -fwdSign * 0.112);
      bGrp.add(band, knot);
      headBone.add(bGrp);
      mounted.push(bGrp);
    } else if (acc === "star_clip" && headBone) {
      const sGrp = new THREE.Group();
      sGrp.position.set(0.072, eyeY + 0.055, eyeZ + fwdSign * 0.036);
      sGrp.rotation.set(0.15, fwdSign < 0 ? 0.5 : -0.5, -0.35);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 4), goldMat);
        spike.position.set(Math.cos(ang) * 0.009, Math.sin(ang) * 0.009, 0);
        spike.rotation.z = ang - Math.PI * 0.5;
        sGrp.add(spike);
      }
      headBone.add(sGrp);
      mounted.push(sGrp);
    } else if (acc === "ribbon" && headBone) {
      const rGrp = new THREE.Group();
      const ribMat = new THREE.MeshStandardMaterial({ color: 0xe8c468, roughness: 0.45, metalness: 0.08 });
      rGrp.position.set(0.082, eyeY + 0.048, eyeZ + fwdSign * 0.022);
      rGrp.rotation.set(0.1, fwdSign < 0 ? 0.65 : -0.65, -0.3);
      const wL = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.038, 6), ribMat);
      wL.position.x = -0.016; wL.rotation.z = -Math.PI * 0.5;
      const wR = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.038, 6), ribMat);
      wR.position.x = 0.016; wR.rotation.z = Math.PI * 0.5;
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 6), goldMat);
      rGrp.add(wL, wR, knot);
      headBone.add(rGrp);
      mounted.push(rGrp);
    } else if (acc === "jade_hairpin" && headBone) {
      // 晴嵐：青玉流蘇古風髮簪
      const pGrp = new THREE.Group();
      pGrp.position.set(0.082, eyeY + 0.056, eyeZ + fwdSign * 0.015);
      pGrp.rotation.set(0.08, 0.25, -0.55);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0022, 0.115, 8), goldMat);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), jadeMat);
      bead.position.y = 0.052;
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.0085, 0.056, 8), jadeMat);
      tassel.position.set(0.016, 0.008, 0);
      tassel.rotation.z = 0.55;
      pGrp.add(stem, bead, tassel);
      headBone.add(pGrp);
      mounted.push(pGrp);
    } else if (acc === "yuzu_clip" && headBone) {
      // 柚子：金柚果實＋雙翠綠葉髮夾
      const yGrp = new THREE.Group();
      yGrp.position.set(0.076, eyeY + 0.048, eyeZ + fwdSign * 0.035);
      yGrp.rotation.set(0.12, fwdSign < 0 ? 0.52 : -0.52, -0.25);
      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xf4b938, roughness: 0.38, metalness: 0.08 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x4ca64c, roughness: 0.45 });
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), fruitMat);
      const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.024, 5), leafMat);
      leaf1.position.set(-0.012, 0.011, 0); leaf1.rotation.z = 0.75;
      const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.020, 5), leafMat);
      leaf2.position.set(-0.004, 0.016, 0); leaf2.rotation.z = 0.25;
      yGrp.add(fruit, leaf1, leaf2);
      headBone.add(yGrp);
      mounted.push(yGrp);
    } else if (acc === "gavel_brooch" && chestBone) {
      // 阿朗：辯論社金色法槌桂冠胸章
      const gbGrp = new THREE.Group();
      gbGrp.position.set(-0.058 * fwdSign, 0.045, fwdSign * 0.098);
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0032, 6, 16), goldMat);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.028, 6), goldMat);
      handle.rotation.z = -0.45;
      const headG = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.018, 8), goldMat);
      headG.position.set(0.006, 0.010, 0); headG.rotation.z = 1.1;
      gbGrp.add(wreath, handle, headG);
      chestBone.add(gbGrp);
      mounted.push(gbGrp);
    } else if (acc === "ink_scroll" && chestBone) {
      // 墨白：青竹書法玉扣盤飾
      const isGrp = new THREE.Group();
      isGrp.position.set(0, 0.036, fwdSign * 0.104);
      const cinnabar = new THREE.MeshStandardMaterial({ color: 0xa63529, roughness: 0.42 });
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.028, 0.008), cinnabar);
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 14), goldMat);
      cord.position.y = 0.016;
      isGrp.add(seal, cord);
      chestBone.add(isGrp);
      mounted.push(isGrp);
    } else if (acc === "jade_pendant" && chestBone) {
      // 阿竹：書院青玉佩
      const jpGrp = new THREE.Group();
      jpGrp.position.set(0, 0.022, fwdSign * 0.106);
      const disc = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 8, 16), jadeMat);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), goldMat);
      knot.position.y = 0.018;
      jpGrp.add(disc, knot);
      chestBone.add(jpGrp);
      mounted.push(jpGrp);
    }
    return mounted.length ? mounted : null;
  },

  getSeatModelSlug: function (seatOrName) {
    const isMalePlayer = typeof state !== "undefined" && state.playerGender === "m";
    if (!seatOrName) return isMalePlayer ? "player_male" : "player";
    if (typeof seatOrName === "string") {
      if (seatOrName === "你") return isMalePlayer ? "player_male" : "player";
      return SEAT_MODEL_SLUGS[seatOrName] || "player";
    }
    if (typeof getPlayerId === "function" && seatOrName.id === getPlayerId()) {
      return isMalePlayer ? "player_male" : "player";
    }
    if (seatOrName.name === "你") return isMalePlayer ? "player_male" : "player";
    return SEAT_MODEL_SLUGS[seatOrName.name] || ("seat" + seatOrName.id);
  },

  resolveHumanoidBones: function (gltf, scene) {
    const bones = {};
    const wanted = [
      "hips", "spine", "chest", "upperChest", "neck", "head",
      "leftEye", "rightEye",
      "leftShoulder", "rightShoulder",
      "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand",
      "leftThumbProximal", "leftIndexProximal", "leftMiddleProximal", "leftRingProximal", "leftLittleProximal",
      "rightThumbProximal", "rightIndexProximal", "rightMiddleProximal", "rightRingProximal", "rightLittleProximal",
      "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg"
    ];
    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const assocs = gltf && gltf.parser && gltf.parser.associations ? gltf.parser.associations : null;

    // Build reverse nodeIndex -> Object3D map when GLTFLoader associations exist
    const nodeIdxToObj = {};
    if (assocs && typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        const meta = assocs.get ? assocs.get(obj) : null;
        if (meta && typeof meta.nodes === "number" && !nodeIdxToObj[meta.nodes]) {
          nodeIdxToObj[meta.nodes] = obj;
        }
      });
    }

    const pickByIdxOrName = function (nodeIdx) {
      if (typeof nodeIdx !== "number") return null;
      if (nodeIdxToObj[nodeIdx]) return nodeIdxToObj[nodeIdx];
      if (json && json.nodes && json.nodes[nodeIdx] && json.nodes[nodeIdx].name && typeof scene.getObjectByName === "function") {
        return scene.getObjectByName(json.nodes[nodeIdx].name) || null;
      }
      return null;
    };

    const ext = json && json.extensions ? json.extensions : null;
    if (ext && ext.VRM && ext.VRM.humanoid && Array.isArray(ext.VRM.humanoid.humanBones)) {
      ext.VRM.humanoid.humanBones.forEach(function (hb) {
        if (hb && hb.bone && wanted.indexOf(hb.bone) >= 0) {
          const obj = pickByIdxOrName(hb.node);
          if (obj) bones[hb.bone] = obj;
        }
      });
    } else if (ext && ext.VRMC_vrm && ext.VRMC_vrm.humanoid && ext.VRMC_vrm.humanoid.humanBones) {
      const map1 = ext.VRMC_vrm.humanoid.humanBones;
      wanted.forEach(function (bName) {
        const entry = map1[bName];
        if (entry && typeof entry.node === "number") {
          const obj = pickByIdxOrName(entry.node);
          if (obj) bones[bName] = obj;
        }
      });
    }

    // Regex bone name fallback for generic Mixamo / Rigged GLB or partial skeletons
    const fallbackRules = {
      hips: /hips|pelvis|bip.*pelvis/i,
      spine: /^spine$|spine1|mixamorig.*spine$/i,
      chest: /chest|spine2|upper_chest/i,
      neck: /neck/i,
      head: /^head$|mixamorig.*head|j_bip_c_head/i,
      leftEye: /left.*eye|j_adj_l_faceeye|eye_l/i,
      rightEye: /right.*eye|j_adj_r_faceeye|eye_r/i,
      leftShoulder: /left.*shoulder|j_bip_l_shoulder|l_shoulder/i,
      rightShoulder: /right.*shoulder|j_bip_r_shoulder|r_shoulder/i,
      leftUpperArm: /left.*upper.*arm|j_bip_l_upperarm|l_upperarm|leftarm/i,
      rightUpperArm: /right.*upper.*arm|j_bip_r_upperarm|r_upperarm|rightarm/i,
      leftLowerArm: /left.*lower.*arm|left.*forearm|j_bip_l_lowerarm/i,
      rightLowerArm: /right.*lower.*arm|right.*forearm|j_bip_r_lowerarm/i,
      leftHand: /left.*hand|j_bip_l_hand|l_hand/i,
      rightHand: /right.*hand|j_bip_r_hand|r_hand/i,
      leftThumbProximal: /j_bip_l_thumb1|left.*thumb.*prox|l_thumb1/i,
      leftIndexProximal: /j_bip_l_index1|left.*index.*prox|l_index1/i,
      leftMiddleProximal: /j_bip_l_middle1|left.*middle.*prox|l_middle1/i,
      leftRingProximal: /j_bip_l_ring1|left.*ring.*prox|l_ring1/i,
      leftLittleProximal: /j_bip_l_little1|left.*little.*prox|left.*pinky.*1|l_little1/i,
      rightThumbProximal: /j_bip_r_thumb1|right.*thumb.*prox|r_thumb1/i,
      rightIndexProximal: /j_bip_r_index1|right.*index.*prox|r_index1/i,
      rightMiddleProximal: /j_bip_r_middle1|right.*middle.*prox|r_middle1/i,
      rightRingProximal: /j_bip_r_ring1|right.*ring.*prox|r_ring1/i,
      rightLittleProximal: /j_bip_r_little1|right.*little.*prox|right.*pinky.*1|r_little1/i,
      leftUpperLeg: /left.*upper.*leg|left.*thigh|j_bip_l_upperleg|leftupleg/i,
      rightUpperLeg: /right.*upper.*leg|right.*thigh|j_bip_r_upperleg|rightupleg/i,
      leftLowerLeg: /left.*lower.*leg|left.*calf|left.*shin|j_bip_l_lowerleg|leftleg/i,
      rightLowerLeg: /right.*lower.*leg|right.*calf|right.*shin|j_bip_r_lowerleg|rightleg/i
    };
    if (typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        if (!obj || !obj.name) return;
        wanted.forEach(function (key) {
          if (!bones[key] && fallbackRules[key] && fallbackRules[key].test(obj.name)) {
            bones[key] = obj;
          }
        });
      });
    }
    return { bones: bones, pickByIdxOrName: pickByIdxOrName };
  },

  resolveMorphBindings: function (gltf, scene) {
    const bindings = {
      blink: [], blink_l: [], blink_r: [],
      aa: [], ih: [], ou: [], ee: [], oh: [],
      happy: [], fun: [], angry: [], sorrow: [], surprised: []
    };
    const meshByIdx = {};
    const meshes = [];
    if (typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        if (obj && obj.isMesh && obj.morphTargetInfluences) {
          meshes.push(obj);
          if (gltf && gltf.parser && gltf.parser.associations && gltf.parser.associations.get) {
            const meta = gltf.parser.associations.get(obj);
            if (meta && typeof meta.meshes === "number") meshByIdx[meta.meshes] = obj;
          }
        }
      });
    }

    const pushBinding = function (bucket, mesh, idx, weight) {
      if (!bindings[bucket] || !mesh || !mesh.morphTargetInfluences || typeof idx !== "number" || idx < 0) return;
      if (idx >= mesh.morphTargetInfluences.length) return;
      if (!bindings[bucket].some(function (b) { return b.mesh === mesh && b.idx === idx; })) {
        bindings[bucket].push({ mesh: mesh, idx: idx, weight: weight !== undefined ? weight : 1.0 });
      }
    };

    const pushFromObj = function (bucket, obj, idx, weight) {
      if (!obj) return;
      if (obj.isMesh && obj.morphTargetInfluences) {
        pushBinding(bucket, obj, idx, weight);
      } else if (typeof obj.traverse === "function") {
        obj.traverse(function (sub) {
          if (sub && sub.isMesh && sub.morphTargetInfluences) {
            pushBinding(bucket, sub, idx, weight);
          }
        });
      }
    };

    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;

    // 1. VRM 0.x BlendShapeMaster (13 preset buckets including 5 vowels + full emotions!)
    if (ext && ext.VRM && ext.VRM.blendShapeMaster && Array.isArray(ext.VRM.blendShapeMaster.blendShapeGroups)) {
      const map0 = {
        blink: "blink", blink_l: "blink_l", blink_r: "blink_r",
        a: "aa", aa: "aa", i: "ih", ih: "ih", u: "ou", ou: "ou", e: "ee", ee: "ee", o: "oh", oh: "oh",
        joy: "happy", happy: "happy", fun: "fun", angry: "angry", sorrow: "sorrow", surprised: "surprised"
      };
      ext.VRM.blendShapeMaster.blendShapeGroups.forEach(function (grp) {
        if (!grp) return;
        const pKey = String(grp.presetName || grp.name || "").toLowerCase();
        const bucket = map0[pKey];
        if (!bucket || !Array.isArray(grp.binds)) return;
        grp.binds.forEach(function (b) {
          const targetMesh = meshByIdx[b.mesh];
          if (targetMesh) pushBinding(bucket, targetMesh, b.index, (b.weight !== undefined ? b.weight : 100) / 100);
        });
      });
    }

    // 2. VRM 1.0 VRMC_vrm.expressions.preset
    if (ext && ext.VRMC_vrm && ext.VRMC_vrm.expressions && ext.VRMC_vrm.expressions.preset) {
      const preset = ext.VRMC_vrm.expressions.preset;
      const nodeByName = {};
      if (scene && typeof scene.traverse === "function") {
        scene.traverse(function (o) {
          if (o && o.name && !nodeByName[o.name]) nodeByName[o.name] = o;
        });
      }
      const map1 = {
        blink: "blink", blinkLeft: "blink_l", blinkRight: "blink_r",
        aa: "aa", ih: "ih", ou: "ou", ee: "ee", oh: "oh",
        happy: "happy", relaxed: "fun", angry: "angry", sad: "sorrow", surprised: "surprised"
      };
      Object.keys(map1).forEach(function (pName) {
        const exp = preset[pName];
        if (!exp || !Array.isArray(exp.morphTargetBinds)) return;
        exp.morphTargetBinds.forEach(function (b) {
          const nName = (typeof b.node === "number" && json && json.nodes && json.nodes[b.node]) ? json.nodes[b.node].name : null;
          const nodeObj = nName
            ? (nodeByName[nName] || (typeof scene.getObjectByName === "function" ? scene.getObjectByName(nName) : null))
            : null;
          if (nodeObj) pushFromObj(map1[pName], nodeObj, b.index, b.weight !== undefined ? b.weight : 1.0);
        });
      });
    }

    // 3. Direct morphTargetDictionary name fallback
    const dictRules = {
      blink: /^(blink|eye_close|eyes_closed|fcl_eye_close)$/i,
      blink_l: /^(blink_l|blinkleft|fcl_eye_close_l)$/i,
      blink_r: /^(blink_r|blinkright|fcl_eye_close_r)$/i,
      aa: /^(a|aa|mouth_a|vrc\.v_aa|fcl_mth_a)$/i,
      ih: /^(i|ih|mouth_i|vrc\.v_ih|fcl_mth_i)$/i,
      ou: /^(u|ou|mouth_u|vrc\.v_ou|fcl_mth_u)$/i,
      ee: /^(e|ee|mouth_e|vrc\.v_ee|fcl_mth_e)$/i,
      oh: /^(o|oh|mouth_o|vrc\.v_oh|fcl_mth_o)$/i,
      happy: /^(joy|happy|smile|fcl_all_joy|fcl_eye_joy)$/i,
      fun: /^(fun|relaxed|smirk|fcl_all_fun)$/i,
      angry: /^(angry|mad|fcl_all_angry)$/i,
      sorrow: /^(sorrow|sad|fcl_all_sorrow)$/i,
      surprised: /^(surprised|oh_face|shock|fcl_all_surprised)$/i
    };
    meshes.forEach(function (m) {
      if (!m.morphTargetDictionary) return;
      Object.keys(m.morphTargetDictionary).forEach(function (k) {
        Object.keys(dictRules).forEach(function (bucket) {
          if (dictRules[bucket].test(k)) pushBinding(bucket, m, m.morphTargetDictionary[k], 1.0);
        });
      });
    });

    return bindings;
  },

  resolveSpringBones: function (gltf, pickByIdxOrName) {
    const springBones = [];
    const seen = new Set();
    const skipRe = /bust|breast|boob|chest|mune/i;
    const skirtRe = /skirt|dress|hakama|apron/i;
    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;

    const hasLegAncestor = function (node) {
      let cur = node ? node.parent : null;
      let steps = 0;
      while (cur && steps < 8) {
        if (/upper.*leg|thigh|upleg/i.test(String(cur.name || ""))) return true;
        if (/hips|pelvis/i.test(String(cur.name || ""))) return false;
        cur = cur.parent;
        steps += 1;
      }
      return false;
    };

    const classifySkirtMeta = function (obj, tagStr) {
      const isSkirt = skirtRe.test(tagStr);
      if (!isSkirt) return { isSkirt: false, skirtZone: null, skirtSideSign: 0, skirtInheritsLeg: false };
      const nm = String((obj && obj.name) || tagStr || "");
      let zone = "front";
      if (/back|rear/i.test(nm)) zone = "back";
      else if (/side/i.test(nm)) zone = "side";
      const sideSign = /(?:^|_)L(?:_|$)|left/i.test(nm) ? 1 : (/(?:^|_)R(?:_|$)|right/i.test(nm) ? -1 : 0);
      return {
        isSkirt: true,
        skirtZone: zone,
        skirtSideSign: sideSign,
        skirtInheritsLeg: hasLegAncestor(obj)
      };
    };

    const addChainBone = function (obj, comment, depth, stiff) {
      if (!obj || !obj.rotation || seen.has(obj)) return;
      const nm = String(obj.name || "");
      const tag = String(comment || "") + " " + nm;
      if (skipRe.test(tag)) return;
      seen.add(obj);
      const skMeta = classifySkirtMeta(obj, tag);
      const boneInfo = {
        obj: obj,
        restX: obj.rotation.x || 0,
        restY: obj.rotation.y || 0,
        restZ: obj.rotation.z || 0,
        depth: Math.min(depth || 0, 3),
        isSkirt: skMeta.isSkirt,
        skirtZone: skMeta.skirtZone,
        skirtSideSign: skMeta.skirtSideSign,
        skirtInheritsLeg: skMeta.skirtInheritsLeg,
        stiffness: clamp(Number(stiff) || 0.7, 0.2, 2.5),
        phase: (springBones.length * 0.73) % (Math.PI * 2)
      };
      springBones.push(boneInfo);
      // VRM 0.x lists root bones and animates their child hierarchy; include up to 2 direct child segments!
      if (depth < 2 && Array.isArray(obj.children) && obj.children.length > 0 && obj.children[0]) {
        const ch = obj.children[0];
        if (!ch.isMesh && !skipRe.test(ch.name || "")) {
          addChainBone(ch, comment, depth + 1, stiff);
        }
      }
    };

    if (ext && ext.VRM && ext.VRM.secondaryAnimation && Array.isArray(ext.VRM.secondaryAnimation.boneGroups)) {
      ext.VRM.secondaryAnimation.boneGroups.forEach(function (grp) {
        if (!grp || !Array.isArray(grp.bones)) return;
        const cmt = String(grp.comment || "");
        if (skipRe.test(cmt)) return;
        grp.bones.forEach(function (nodeIdx) {
          const obj = pickByIdxOrName ? pickByIdxOrName(nodeIdx) : null;
          addChainBone(obj, cmt, 0, grp.stiffiness || grp.stiffness || 0.7);
        });
      });
    } else if (ext && ext.VRMC_springBone && Array.isArray(ext.VRMC_springBone.springs)) {
      ext.VRMC_springBone.springs.forEach(function (spr) {
        if (!spr || !Array.isArray(spr.joints)) return;
        const cmt = String(spr.name || "");
        if (skipRe.test(cmt)) return;
        spr.joints.slice(0, 3).forEach(function (jt, jIdx) {
          const obj = (jt && typeof jt.node === "number" && pickByIdxOrName) ? pickByIdxOrName(jt.node) : null;
          if (obj && !skipRe.test(obj.name || "") && !seen.has(obj)) {
            seen.add(obj);
            const skMeta1 = classifySkirtMeta(obj, cmt + " " + (obj.name || ""));
            springBones.push({
              obj: obj,
              restX: obj.rotation.x || 0,
              restY: obj.rotation.y || 0,
              restZ: obj.rotation.z || 0,
              depth: Math.min(jIdx, 3),
              isSkirt: skMeta1.isSkirt,
              skirtZone: skMeta1.skirtZone,
              skirtSideSign: skMeta1.skirtSideSign,
              skirtInheritsLeg: skMeta1.skirtInheritsLeg,
              stiffness: clamp(Number(jt.stiffness) || 1.0, 0.2, 3.0),
              phase: (springBones.length * 0.73) % (Math.PI * 2)
            });
          }
        });
      });
    }
    return springBones;
  },

  initBoneQuatData: function (obj) {
    if (!obj || typeof THREE.Quaternion !== "function" || !obj.quaternion) return null;
    const restLocalQuat = obj.quaternion.clone();
    const pWorld = new THREE.Quaternion();
    if (obj.parent && typeof obj.parent.getWorldQuaternion === "function") {
      obj.parent.getWorldQuaternion(pWorld);
    }
    const pWorldInv = pWorld.clone();
    if (typeof pWorldInv.invert === "function") pWorldInv.invert();
    else if (typeof pWorldInv.inverse === "function") pWorldInv.inverse();
    return {
      obj: obj,
      restLocalQuat: restLocalQuat,
      parentRestWorldQuat: pWorld,
      parentRestWorldQuatInv: pWorldInv
    };
  },

  computeModelSpaceBoneQuat: function (meta, qDeltaModel, outQuat) {
    if (!meta || !qDeltaModel || typeof THREE.Quaternion !== "function") return null;
    const out = outQuat || new THREE.Quaternion();
    return out.copy(meta.parentRestWorldQuatInv)
      .multiply(qDeltaModel)
      .multiply(meta.parentRestWorldQuat)
      .multiply(meta.restLocalQuat);
  },

  makeModelEulerDelta: function (rx, ry, rz, order, outQuat) {
    if (typeof THREE.Quaternion !== "function") return null;
    const q = outQuat || new THREE.Quaternion();
    const sc = this.ensureScratch();
    if (sc && sc.euler) {
      sc.euler.set(rx || 0, ry || 0, rz || 0, order || "YXZ");
      q.setFromEuler(sc.euler);
    } else if (typeof THREE.Euler === "function") {
      q.setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, order || "YXZ"));
    }
    return q;
  },

  setBoneModelDeltaImmediate: function (meta, rx, ry, rz, order) {
    if (!meta || !meta.obj) return;
    if (typeof THREE.Quaternion === "function" && meta.obj.quaternion) {
      const sc = this.ensureScratch();
      const qDelta = this.makeModelEulerDelta(rx, ry, rz, order || "YXZ", sc ? sc.qDelta : null);
      const qTarget = this.computeModelSpaceBoneQuat(meta, qDelta, sc ? sc.qTarget : null);
      if (qTarget) meta.obj.quaternion.copy(qTarget);
    } else if (meta.obj.rotation) {
      meta.obj.rotation.set(rx || 0, ry || 0, rz || 0);
    }
  },

  slerpBoneModelDelta: function (meta, rx, ry, rz, alpha, order) {
    if (!meta || !meta.obj) return;
    if (typeof THREE.Quaternion === "function" && meta.obj.quaternion && typeof meta.obj.quaternion.slerp === "function") {
      const sc = this.ensureScratch();
      const qDelta = this.makeModelEulerDelta(rx, ry, rz, order || "YXZ", sc ? sc.qDelta : null);
      const qTarget = this.computeModelSpaceBoneQuat(meta, qDelta, sc ? sc.qTarget : null);
      if (qTarget) meta.obj.quaternion.slerp(qTarget, alpha !== undefined ? alpha : 0.16);
    } else if (meta.obj.rotation) {
      const a = alpha !== undefined ? alpha : 0.16;
      meta.obj.rotation.x += ((rx || 0) - meta.obj.rotation.x) * a;
      meta.obj.rotation.y += ((ry || 0) - meta.obj.rotation.y) * a;
      meta.obj.rotation.z += ((rz || 0) - meta.obj.rotation.z) * a;
    }
  },

  /**
   * Compute anatomically grounded seated skirt drape deltas so VRoid skirt panels
   * NEVER inherit UpperLeg (-1.40 rad) + compound negative tilts that flip the skirt upward!
   * Positive rx relaxes the hem DOWNWARD (gravity toward knees/cushion); ±rz splays sides gently outward.
   */
  getSeatedSkirtTargetAngles: function (sb, sway) {
    if (!sb) return { rx: 0, ry: 0, rz: 0 };
    const d = Math.min(sb.depth || 0, 2);
    const zone = sb.skirtZone || "front";
    const sgn = sb.skirtSideSign || 0;
    const sw = (typeof sway === "number" ? sway : 0) * (d === 0 ? 0.5 : 1.0);
    if (sb.skirtInheritsLeg) {
      // Parent UpperLeg is already bent -1.40 rad (-80 deg) forward along thigh; relax DOWNWARD (+rx)!
      if (zone === "front") {
        const rx = d === 0 ? 0.14 : (d === 1 ? 0.38 : 0.22);
        return { rx: rx + sw, ry: 0, rz: 0 };
      }
      if (zone === "back") {
        const rx = d === 0 ? 0.52 : (d === 1 ? 0.36 : 0.20);
        return { rx: rx + sw * 0.4, ry: 0, rz: 0 };
      }
      // side panel parented to UpperLeg (Gen-A VRMs: player, xiaoyun, qingming)
      const rx = d === 0 ? 0.66 : (d === 1 ? 0.38 : 0.20);
      const rz = d === 0 ? (sgn * 0.14) : (d === 1 ? (sgn * 0.06) : 0);
      return { rx: rx + sw * 0.6, ry: 0, rz: rz };
    }
    // Hips-parented skirt panels (Gen-B VRMs: nuannuan/xinger Side panels) start hanging straight down (0 rad)
    if (zone === "side") {
      const rx = d === 0 ? -0.16 : (d === 1 ? 0.10 : 0.06);
      const rz = d === 0 ? (sgn * 0.18) : (d === 1 ? (sgn * 0.06) : 0);
      return { rx: rx + sw * 0.6, ry: 0, rz: rz };
    }
    if (zone === "back") {
      const rx = d === 0 ? 0.12 : (d === 1 ? 0.08 : 0.04);
      return { rx: rx + sw * 0.4, ry: 0, rz: 0 };
    }
    // Hips-parented front panel fallback
    const rxF = d === 0 ? -0.58 : (d === 1 ? 0.34 : 0.22);
    return { rx: rxF + sw, ry: 0, rz: 0 };
  },

  prepareLoadedAvatar: function (gltf, opts) {
    if (!gltf || !gltf.scene) return null;
    const o = opts || {};
    const mode = o.mode === "seated" ? "seated" : "standing";
    const targetHeight = o.targetHeight || (mode === "seated" ? 2.10 : 2.40);
    const baseY = o.baseY !== undefined ? o.baseY : (mode === "seated" ? 0.0 : 0.18);

    const json = gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;
    const isVrm0 = Boolean(ext && ext.VRM);
    const isVrm1 = Boolean(ext && ext.VRMC_vrm);

    const root = new THREE.Group();
    const modelWrap = new THREE.Group();
    const rawScene = gltf.scene;
    modelWrap.add(rawScene);
    // VRM 0.x models face -Z natively; flip 180 deg so ALL avatars share unified Model Space (+Z forward, +Y up, +X char-left, -X char-right)!
    if (isVrm0) modelWrap.rotation.y = Math.PI;
    root.add(modelWrap);

    const boneRes = this.resolveHumanoidBones(gltf, rawScene);
    const bones = boneRes.bones || {};
    const morphs = this.resolveMorphBindings(gltf, rawScene);
    const springBones = this.resolveSpringBones(gltf, boneRes.pickByIdxOrName);

    // CRITICAL STEP 1: Scale model in STANDING T-Pose BEFORE bending legs so seated pose never inflates avatar into a 2.9m giant!
    root.updateMatrixWorld(true);
    if (typeof THREE.Box3 === "function") {
      const box = new THREE.Box3().setFromObject(modelWrap);
      if (typeof box.getSize === "function" && typeof box.getCenter === "function") {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const h = Math.max(0.01, size.y);
        const sc = targetHeight / h;
        modelWrap.scale.setScalar(sc);
        modelWrap.position.set(
          -center.x * sc,
          baseY - box.min.y * sc,
          -center.z * sc
        );
      }
    }

    // CRITICAL STEP 2: Capture true T-Pose Model-Space quaternion bases BEFORE posing any limb!
    root.updateMatrixWorld(true);
    const boneMeta = {};
    Object.keys(bones).forEach((k) => {
      if (bones[k]) boneMeta[k] = this.initBoneQuatData(bones[k]);
    });
    for (let si = 0; si < springBones.length; si++) {
      springBones[si].quatMeta = this.initBoneQuatData(springBones[si].obj);
    }
    // v10.0 Mount precision persona 3D accessories (glasses, headband, star/yuzu clips, jade hairpin, gavel brooch) in T-pose!
    if (o.personaName && typeof this.attachVrmPersonaAccessories === "function") {
      this.attachVrmPersonaAccessories(bones, o.personaName, isVrm0);
    }

    // CRITICAL STEP 3: Pose legs & arms using exact anatomical Model-Space quaternions (zero gimbal flip or VRM 1.0 twist!)
    if (mode === "seated") {
      // Thighs extend cleanly FORWARD (+Z) with slight outward splay; knees hang STRAIGHT DOWN (-Y)
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperLeg, -1.40, 0.08, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperLeg, -1.40, -0.08, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerLeg, 1.42, 0, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerLeg, 1.42, 0, 0, "YXZ");

      // Arms drop DOWN & OUT from T-pose (left: Z = -drop, right: Z = +drop) and angle slightly FORWARD (X = -fwd), elbows bend FORWARD around Y (left: Y = -bend, right: Y = +bend)
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperArm, -0.26, 0, -1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperArm, -0.26, 0, 1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerArm, 0, -1.02, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerArm, 0, 1.02, 0, "YXZ");

      // Anatomically drape skirt spring-bones DOWN over seated thighs & knees (compensating for UpperLeg -1.40 rad!)
      for (let si = 0; si < springBones.length; si++) {
        if (springBones[si].isSkirt && springBones[si].quatMeta) {
          const skAng = this.getSeatedSkirtTargetAngles(springBones[si], 0);
          this.setBoneModelDeltaImmediate(springBones[si].quatMeta, skAng.rx, skAng.ry, skAng.rz, "YXZ");
        }
      }

      // Align seated hips cleanly ON TOP of wooden cushion (y = 0.87 -> bottoms rest at y ~ 0.75, ahead of backrest at z = -0.48, clear of table at z = 1.30!)
      if (bones.hips && typeof bones.hips.getWorldPosition === "function") {
        root.updateMatrixWorld(true);
        const hipW = new THREE.Vector3();
        bones.hips.getWorldPosition(hipW);
        modelWrap.position.x += (0 - hipW.x);
        modelWrap.position.y += (0.87 - hipW.y);
        modelWrap.position.z += (0.10 - hipW.z);
      }
    } else {
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperArm, -0.14, 0, -1.14, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperArm, -0.14, 0, 1.14, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerArm, 0, -0.35, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerArm, 0, 0.35, 0, "YXZ");
    }

    // Store initial rest rotations as fallback metadata
    const restRot = {};
    Object.keys(bones).forEach(function (k) {
      if (bones[k] && bones[k].rotation) {
        restRot[k] = {
          x: bones[k].rotation.x || 0,
          y: bones[k].rotation.y || 0,
          z: bones[k].rotation.z || 0
        };
      }
    });

    // Upgrade VRM KHR_materials_unlit meshes to real-time Lit Cel Shading + v10.0 Persona Palette Recolor!
    const personaStyling = o.personaName ? this.getPersonaStyling(o.personaName) : null;
    const tintMats = [];
    const celMats = [];
    const canCelUpgrade = Boolean(
      typeof stage3dAnime !== "undefined" &&
      typeof stage3dAnime.upgradeVrmMaterialToCel === "function" &&
      (typeof state === "undefined" || state.quality3D !== "eco")
    );
    const selfLoader = this;
    if (typeof rawScene.traverse === "function") {
      rawScene.traverse(function (child) {
        if (!child || !child.isMesh) return;
        const isArr = Array.isArray(child.material);
        const origMats = isArr ? child.material : [child.material];
        const nextMats = [];
        let allUnlitBasic = origMats.length > 0;
        let hasOutlineOnly = origMats.length > 0;
        const childName = String(child.name || "");
        let isFaceMesh = /face/i.test(childName);
        const hasSkin = Boolean(child.isSkinnedMesh);
        const hasMorph = Boolean(child.morphTargetInfluences && child.morphTargetInfluences.length);

        origMats.forEach(function (m) {
          if (!m) {
            nextMats.push(m);
            return;
          }
          const mName = String(m.name || "");
          const tagStr = mName + " " + childName;
          const isOutline = (mName && /outline/i.test(mName)) || m.side === THREE.BackSide;
          const keepUnlitEye = /eyewhite|eyehighlight|eyeextra/i.test(tagStr);
          const isFaceMat = /face|skin|brow|mouth|eyeline|eyelash|iris/i.test(tagStr);
          const isHairMat = /hair/i.test(tagStr);
          const isTopsMat = /tops|cloth/i.test(tagStr) && !/bottoms|shoes|accessoryneck/i.test(tagStr);
          const isNeckMat = /accessoryneck/i.test(tagStr);
          const isIrisMat = /eyeiris|iris/i.test(tagStr);
          if (isFaceMat) isFaceMesh = true;
          if (!isOutline) hasOutlineOnly = false;
          if (m.transparent && !m.alphaTest) m.alphaTest = 0.35;
          if (m.map && THREE.sRGBEncoding !== undefined) m.map.encoding = THREE.sRGBEncoding;

          // v10.0 Luminance-preserving texture recolor so ALL 11 AI characters match their 2D portraits!
          if (personaStyling && !isOutline && m.map) {
            if (isHairMat && personaStyling.hairHex) {
              m = m.clone ? m.clone() : m;
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.hairHex, personaStyling.hairStr || 0.82);
            } else if (isTopsMat && personaStyling.topsHex) {
              m = m.clone ? m.clone() : m;
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.topsHex, personaStyling.topsStr || 0.80);
            } else if (isNeckMat && personaStyling.neckHex) {
              m = m.clone ? m.clone() : m;
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.neckHex, 0.78);
            } else if (isIrisMat && personaStyling.eyeHex) {
              m = m.clone ? m.clone() : m;
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.eyeHex, 0.65);
            }
          }

          let finalMat = m;
          const isBasic = Boolean(m.isMeshBasicMaterial || m.type === "MeshBasicMaterial");
          if (canCelUpgrade && isBasic && !isOutline && !keepUnlitEye) {
            finalMat = stage3dAnime.upgradeVrmMaterialToCel(m, {
              isFace: isFaceMat,
              isHair: isHairMat,
              skinning: hasSkin,
              morphTargets: hasMorph,
              morphNormals: Boolean(child.geometry && child.geometry.morphAttributes && child.geometry.morphAttributes.normal)
            });
            if (finalMat !== m) {
              allUnlitBasic = false;
              if (finalMat.userData && finalMat.userData.vrmCelUniforms) {
                celMats.push({
                  mat: finalMat,
                  uniforms: finalMat.userData.vrmCelUniforms,
                  isFace: isFaceMat,
                  isHair: isHairMat
                });
              }
            }
          } else if (!isBasic) {
            allUnlitBasic = false;
          }

          if (!isOutline && finalMat.color && typeof finalMat.color.clone === "function") {
            tintMats.push({ mat: finalMat, baseColor: finalMat.color.clone(), isCel: Boolean(finalMat.userData && finalMat.userData.isVrmCel) });
          }
          nextMats.push(finalMat);
        });

        child.material = isArr ? nextMats : nextMats[0];
        child.castShadow = !hasOutlineOnly;
        child.receiveShadow = !isFaceMesh && !allUnlitBasic;
        child.frustumCulled = false;
      });
    }

    const mixer = (Array.isArray(gltf.animations) && gltf.animations.length > 0 && typeof THREE.AnimationMixer === "function")
      ? new THREE.AnimationMixer(rawScene)
      : null;

    return {
      root: root,
      modelWrap: modelWrap,
      rawScene: rawScene,
      isVrm: isVrm0 || isVrm1,
      isVrm0: isVrm0,
      mode: mode,
      baseY: modelWrap.position.y,
      bones: bones,
      boneMeta: boneMeta,
      restRot: restRot,
      morphs: morphs,
      springBones: springBones,
      tintMats: tintMats,
      celMats: celMats,
      mixer: mixer,
      clips: mixer ? gltf.animations : [],
      activeAction: null,
      lastClipTime: null,
      lastMoodKey: "",
      lastAlive: null,
      lastTalkBoost: false,
      blinkAmt: 0,
      winkLAmt: 0,
      mouthAmt: 0,
      vowelAmts: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 },
      happyAmt: 0,
      funAmt: 0,
      angryAmt: 0,
      sorrowAmt: 0,
      surprisedAmt: 0,
      prevHeadYaw: 0,
      headInertia: 0
    };
  },

  applyMorphWeight: function (list, val) {
    if (!list || !list.length) return;
    const v = clamp(val, 0, 1);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.mesh && b.mesh.morphTargetInfluences && b.idx < b.mesh.morphTargetInfluences.length) {
        b.mesh.morphTargetInfluences[b.idx] = v * (b.weight || 1.0);
      }
    }
  },

  updateVrmAvatar: function (inst, opts) {
    if (!inst) return;
    const o = opts || {};
    const t = o.tSec || 0;
    const seed = o.seed || 0;
    const sleeping = Boolean(o.sleeping) || o.alive === false;
    const talking = Boolean(o.talking) && o.alive !== false;
    const sweating = Boolean(o.sweating) && !sleeping && o.alive !== false;
    const emotion = o.emotion || "neutral";
    const arch = this.getIdleArchetype(o.personaName, seed);

    if (inst.mixer && inst.activeAction) {
      const dt = (typeof inst.lastClipTime === "number") ? clamp(t - inst.lastClipTime, 0, 0.1) : 0.016;
      inst.lastClipTime = t;
      inst.mixer.update(dt);
    }

    // 0. Mood-responsive VRM color tint + Real-Time Cel Rim / Candle Bounce Sync!
    const aliveFlag = o.alive !== false;
    const talkBoostFlag = Boolean(talking && aliveFlag);
    if (inst.tintMats && inst.tintMats.length && o.moodKey && (inst.lastMoodKey !== o.moodKey || inst.lastAlive !== aliveFlag || inst.lastTalkBoost !== talkBoostFlag)) {
      inst.lastMoodKey = o.moodKey;
      inst.lastAlive = aliveFlag;
      inst.lastTalkBoost = talkBoostFlag;
      const moodTint = o.moodKey === "night"
        ? { r: 0.72, g: 0.76, b: 0.92 }
        : (o.moodKey === "vote"
          ? { r: 0.91, g: 0.85, b: 0.83 }
          : (o.moodKey === "day" ? { r: 0.90, g: 0.90, b: 0.88 } : { r: 0.87, g: 0.86, b: 0.90 }));
      const deadDim = aliveFlag ? (talkBoostFlag ? 1.07 : 1.0) : 0.55;
      for (let mi = 0; mi < inst.tintMats.length; mi++) {
        const entry = inst.tintMats[mi];
        if (entry.mat && entry.mat.color && entry.baseColor) {
          const mulR = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.06 : 1.0) : 0.56) : (moodTint.r * deadDim);
          const mulG = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.05 : 1.0) : 0.58) : (moodTint.g * deadDim);
          const mulB = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.04 : 1.0) : 0.64) : (moodTint.b * deadDim);
          entry.mat.color.r = Math.min(1.0, entry.baseColor.r * mulR);
          entry.mat.color.g = Math.min(1.0, entry.baseColor.g * mulG);
          entry.mat.color.b = Math.min(1.0, entry.baseColor.b * mulB);
        }
      }
      if (inst.celMats && inst.celMats.length) {
        const rimHex = o.moodKey === "night"
          ? (talkBoostFlag ? 0xfde68a : 0x93c5fd)
          : (o.moodKey === "vote" ? 0xfdba74 : (o.moodKey === "day" ? 0xfff7d6 : 0xffe2a8));
        const shadowHex = o.moodKey === "night"
          ? 0x7c86bd
          : (o.moodKey === "vote" ? 0xd9a8a0 : (o.moodKey === "day" ? 0xe8dff0 : 0xc8c2e0));
        const warmB = o.moodKey === "night" ? 0.18 : (o.moodKey === "day" ? 0.06 : 0.14);
        for (let ci = 0; ci < inst.celMats.length; ci++) {
          const cm = inst.celMats[ci];
          const u = cm.uniforms;
          if (!u) continue;
          if (u.uVrmRimColor && u.uVrmRimColor.value && typeof u.uVrmRimColor.value.setHex === "function") {
            u.uVrmRimColor.value.setHex(rimHex);
            if (typeof u.uVrmRimColor.value.convertSRGBToLinear === "function") u.uVrmRimColor.value.convertSRGBToLinear();
          }
          if (u.uVrmShadowTint && u.uVrmShadowTint.value && typeof u.uVrmShadowTint.value.setHex === "function") {
            u.uVrmShadowTint.value.setHex(shadowHex);
            if (typeof u.uVrmShadowTint.value.convertSRGBToLinear === "function") u.uVrmShadowTint.value.convertSRGBToLinear();
          }
          const baseRim = cm.isFace ? 0.14 : (cm.isHair ? 0.28 : 0.22);
          u.uVrmRimStrength.value = aliveFlag ? (talkBoostFlag ? baseRim * 1.55 : baseRim) : 0.04;
          u.uVrmShadowLift.value = aliveFlag ? (cm.isFace ? 0.64 : 0.44) : 0.30;
          u.uVrmWarmBounce.value = aliveFlag ? warmB : 0.02;
        }
      }
    }

    // 1. Multi-Vowel Lip-Sync (a/i/u/e/o) + 12 Full Facial Expressions + Organic Asynchronous Blinking & Double-Blink
    const blinkPeriod = 3.25 + ((Math.abs(Math.sin(seed * 4.71 + 0.3)) * 2.15));
    const blinkPhase = (t + seed * 1.37) % blinkPeriod;
    const isPrimaryBlink = blinkPhase > (blinkPeriod - 0.14);
    const hasDoubleBlink = Math.sin(Math.floor((t + seed * 1.37) / blinkPeriod) * 3.1 + seed) > 0.62;
    const isSecondBlink = hasDoubleBlink && blinkPhase > 0.14 && blinkPhase < 0.26;
    const isBlinking = !sleeping && emotion !== "shock" && emotion !== "nervous" && (isPrimaryBlink || isSecondBlink);
    const isPlayfulWink = !sleeping && (emotion === "happy" || emotion === "laugh") && ((t + seed * 1.9) % 5.2 > 4.92);
    const targetBlink = sleeping ? 1.0 : (isBlinking ? 1.0 : 0.0);
    const targetWinkL = isPlayfulWink ? 0.88 : 0.0;

    let tA = 0, tI = 0, tU = 0, tE = 0, tO = 0;
    if (talking) {
      if (o.vowels) {
        tA = clamp(o.vowels.a || 0, 0, 0.85);
        tI = clamp(o.vowels.i || 0, 0, 0.65);
        tU = clamp(o.vowels.u || 0, 0, 0.60);
        tE = clamp(o.vowels.e || 0, 0, 0.65);
        tO = clamp(o.vowels.o || 0, 0, 0.72);
      } else {
        const amp = clamp(o.mouthAmp || 0.55, 0.1, 1.0);
        tA = amp * 0.78;
        tI = Math.max(0, Math.sin(t * 9.5 + seed)) * amp * 0.36;
        tO = Math.max(0, Math.cos(t * 7.2 + seed)) * amp * 0.38;
      }
      const vSum = tA + tI + tU + tE + tO;
      if (vSum > 1.15) {
        const vSc = 1.15 / vSum;
        tA *= vSc; tI *= vSc; tU *= vSc; tE *= vSc; tO *= vSc;
      }
    } else if (emotion === "shock") {
      tO = 0.62;
    }

    const isNeutralIdle = (!sleeping && !talking && emotion === "neutral" && o.act !== "celebrate" && o.act !== "gasp_react");
    const targetHappy = (emotion === "happy" || emotion === "laugh" || emotion === "proud" || o.act === "celebrate" || o.isBeingVouched || o.speechAct === "vouch_warm")
      ? 0.82
      : (isNeutralIdle ? (arch.idleHappy || 0.0) : 0.0);
    const targetFun = (emotion === "laugh" || emotion === "proud" || o.act === "celebrate" || o.speechAct === "claim_role")
      ? 0.52
      : (emotion === "happy" ? 0.32 : (isNeutralIdle ? (arch.idleFun || 0.0) : 0.0));
    const targetAngry = (emotion === "angry" || emotion === "suspect" || o.isPointingAccuse) ? 0.78 : 0.0;
    const targetSorrow = o.alive === false ? 0.55 : ((emotion === "sorrow" || emotion === "sad") ? 0.72 : (emotion === "nervous" ? 0.25 : 0.0));
    const targetSurprised = (emotion === "shock" || emotion === "nervous" || o.act === "gasp_react") ? 0.80 : 0.0;

    inst.blinkAmt += (targetBlink - inst.blinkAmt) * 0.45;
    inst.winkLAmt += (targetWinkL - inst.winkLAmt) * 0.45;
    inst.mouthAmt += (tA - inst.mouthAmt) * 0.42;
    if (!inst.vowelAmts) inst.vowelAmts = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    inst.vowelAmts.aa += (tA - inst.vowelAmts.aa) * 0.45;
    inst.vowelAmts.ih += (tI - inst.vowelAmts.ih) * 0.45;
    inst.vowelAmts.ou += (tU - inst.vowelAmts.ou) * 0.45;
    inst.vowelAmts.ee += (tE - inst.vowelAmts.ee) * 0.45;
    inst.vowelAmts.oh += (tO - inst.vowelAmts.oh) * 0.45;

    inst.happyAmt += (targetHappy - inst.happyAmt) * 0.18;
    inst.funAmt = (inst.funAmt || 0) + (targetFun - (inst.funAmt || 0)) * 0.18;
    inst.angryAmt = (inst.angryAmt || 0) + (targetAngry - (inst.angryAmt || 0)) * 0.20;
    inst.sorrowAmt = (inst.sorrowAmt || 0) + (targetSorrow - (inst.sorrowAmt || 0)) * 0.18;
    inst.surprisedAmt += (targetSurprised - inst.surprisedAmt) * 0.22;

    this.applyMorphWeight(inst.morphs.blink, inst.blinkAmt);
    if (inst.winkLAmt > 0.02) this.applyMorphWeight(inst.morphs.blink_l, inst.winkLAmt);
    this.applyMorphWeight(inst.morphs.aa, inst.vowelAmts.aa);
    this.applyMorphWeight(inst.morphs.ih, inst.vowelAmts.ih);
    this.applyMorphWeight(inst.morphs.ou, inst.vowelAmts.ou);
    this.applyMorphWeight(inst.morphs.ee, inst.vowelAmts.ee);
    this.applyMorphWeight(inst.morphs.oh, inst.vowelAmts.oh);
    this.applyMorphWeight(inst.morphs.happy, inst.happyAmt);
    this.applyMorphWeight(inst.morphs.fun, inst.funAmt);
    this.applyMorphWeight(inst.morphs.angry, inst.angryAmt);
    this.applyMorphWeight(inst.morphs.sorrow, inst.sorrowAmt);
    this.applyMorphWeight(inst.morphs.surprised, inst.surprisedAmt);

    // 2. Unified Multi-Joint Model-Space Quaternion Rig Animation (Spine -> Chest -> Neck -> Head -> Eyes + Clavicles + Twist + Wrists + Fingers!)
    const bm = inst.boneMeta || {};
    const gStyle = arch.gestureStyle || "balanced";
    const yawNow = clamp(o.headYaw || 0, -0.82, 0.82);
    const pitchNow = clamp(o.headPitch || 0, -0.42, 0.48);
    const listenNod = (!sleeping && !talking && o.isListeningAgree)
      ? Math.max(0, Math.sin(t * 2.8 + seed)) * 0.055
      : 0;
    const talkHeadBob = talking ? (Math.sin(t * 5.2 + seed) * 0.032 + clamp(o.mouthAmp || 0.35, 0, 1) * 0.025) : 0;
    const nodOffset = (emotion === "happy" || o.isBeingVouched)
      ? Math.sin(t * 6.8 + seed) * 0.072
      : (listenNod + talkHeadBob);
    const shakeOffset = (emotion === "nervous" || sweating) ? Math.sin(t * 13.5 + seed) * 0.060 : 0;
    const curiousRoll = (!sleeping && !talking && o.isListeningCurious) ? ((seed % 2 > 1 ? 1 : -1) * 0.055) : 0;
    const talkRoll = talking ? Math.sin(t * 2.6 + seed * 1.3) * (gStyle === "expressive" ? 0.065 : (gStyle === "classical" ? 0.018 : 0.038)) : 0;
    const idleRoll = sleeping ? 0 : (arch.headTiltBias + curiousRoll + talkRoll + Math.sin(t * 1.15 + seed) * arch.headRollAmp);

    // Organic Gaze Chain: Eyes lead -> Head (56%) -> Neck (28%) -> Chest (11%) -> Spine (5%)
    const hasNeck = Boolean(bm.neck);
    const hasChest = Boolean(bm.chest);
    const headYawFrac = hasNeck ? 0.56 : 0.78;
    const neckYawFrac = hasNeck ? 0.28 : 0;
    const chestYawFrac = hasChest ? 0.11 : 0;
    const spineYawFrac = hasChest ? 0.05 : 0.10;
    const headPitchFrac = hasNeck ? 0.70 : 1.0;
    const neckPitchFrac = hasNeck ? 0.30 : 0;

    const baseLean = o.isPointingAccuse
      ? 0.095
      : (o.isAccusing
        ? -0.065
        : (o.act === "welcome_bow"
          ? 0.095
          : (o.speechAct === "claim_role"
            ? -0.025
            : (talking
              ? (gStyle === "energetic" ? 0.075 : (gStyle === "classical" ? 0.025 : 0.052))
              : (sleeping ? 0.045 : arch.spineLean)))));
    const breathWave = Math.sin(t * arch.breathFreq + seed) * arch.breathAmp;
    const weightShiftRoll = sleeping ? 0 : Math.sin(t * 0.58 + seed * 1.9) * (inst.mode === "standing" ? 0.022 : 0.014);

    if (bm.spine) {
      this.slerpBoneModelDelta(
        bm.spine,
        clamp(baseLean + breathWave, -0.08, 0.13),
        sleeping ? 0 : yawNow * spineYawFrac,
        weightShiftRoll,
        0.13,
        "YXZ"
      );
    }
    if (bm.chest) {
      const chestBreath = Math.sin(t * arch.breathFreq + seed - 0.55) * (arch.breathAmp * 0.9);
      const chestPitch = (o.act === "welcome_bow" ? 0.055 : 0) + (talking ? 0.015 : 0) + chestBreath;
      this.slerpBoneModelDelta(
        bm.chest,
        clamp(chestPitch, -0.06, 0.10),
        sleeping ? 0 : yawNow * chestYawFrac,
        -weightShiftRoll * 0.45,
        0.14,
        "YXZ"
      );
    }
    if (bm.neck) {
      this.slerpBoneModelDelta(
        bm.neck,
        pitchNow * neckPitchFrac + nodOffset * 0.32,
        yawNow * neckYawFrac + shakeOffset * 0.25,
        idleRoll * 0.32,
        0.16,
        "YXZ"
      );
    }
    if (bm.head) {
      this.slerpBoneModelDelta(
        bm.head,
        pitchNow * headPitchFrac + nodOffset * 0.68,
        yawNow * headYawFrac + shakeOffset * 0.75,
        idleRoll * 0.68,
        0.19,
        "YXZ"
      );
    }
    // Expressive Eye-Bone Micro-Saccades (eyes lead head gaze; nervous wolves show subtle sideways dart!)
    if (bm.leftEye || bm.rightEye) {
      const dartEye = (!sleeping && (sweating || emotion === "nervous"))
        ? Math.sin(t * 6.8 + seed * 1.3) * 0.14
        : (!sleeping ? Math.sin(t * 1.4 + seed * 2.1) * 0.042 : 0);
      const eyeYaw = sleeping ? 0 : clamp(yawNow * 0.30 + dartEye, -0.24, 0.24);
      const eyePitch = sleeping ? 0.12 : clamp(pitchNow * 0.24, -0.15, 0.15);
      if (bm.leftEye) this.slerpBoneModelDelta(bm.leftEye, eyePitch, eyeYaw, 0, 0.36, "YXZ");
      if (bm.rightEye) this.slerpBoneModelDelta(bm.rightEye, eyePitch, eyeYaw, 0, 0.36, "YXZ");
    }

    // Anatomical Upper-Limb Choreography: Drop + Forward + Humeral Twist + Elbow Flex + Wrist + Clavicle + Fingers!
    let rDrop = arch.rDrop, rFwd = arch.rFwd, rBend = arch.rBend, rTwist = 0.08;
    let lDrop = arch.lDrop, lFwd = arch.lFwd, lBend = arch.lBend, lTwist = 0.08;
    let rWristX = 0.04, rWristY = 0.0, rWristZ = 0.02;
    let lWristX = 0.04, lWristY = 0.0, lWristZ = 0.02;
    let shLiftR = breathWave * 1.2, shLiftL = breathWave * 1.2;
    let shFwdR = 0.0, shFwdL = 0.0;
    let rHandPose = "relaxed";
    let lHandPose = "relaxed";

    if (sleeping) {
      rDrop = 1.14; rFwd = 0.18; rBend = 0.86; rTwist = 0.06;
      lDrop = 1.14; lFwd = 0.18; lBend = 0.86; lTwist = 0.06;
    } else if (o.act === "celebrate") {
      rDrop = -0.28 + Math.sin(t * 5.2 + seed) * 0.14; rFwd = 0.38; rBend = 0.48; rTwist = -0.18;
      lDrop = -0.28 + Math.cos(t * 5.2 + seed) * 0.14; lFwd = 0.38; lBend = 0.48; lTwist = -0.18;
      shLiftR = 0.12; shLiftL = 0.12;
      rWristZ = -0.18; lWristZ = -0.18;
      rHandPose = "fist_cheer"; lHandPose = "fist_cheer";
    } else if (o.act === "welcome_bow") {
      // Graceful Eastern tea-host greeting (elbow tucked naturally near waist, open welcoming palm — zero stiff T-pose!)
      rDrop = 0.94; rFwd = 0.46 + Math.sin(t * 2.2) * 0.04; rBend = 0.98 + Math.sin(t * 2.4) * 0.06; rTwist = 0.24;
      lDrop = 1.08; lFwd = 0.26; lBend = 0.92; lTwist = 0.16;
      rWristX = -0.14; rWristY = 0.18; rWristZ = -0.12;
      lWristX = -0.06; lWristY = 0.12;
      rHandPose = "tea_poise"; lHandPose = "relaxed";
    } else if (o.isHovered) {
      // Warm attentive acknowledgment gesture
      rDrop = 0.88; rFwd = 0.44; rBend = 1.04 + Math.sin(t * 4.8 + seed) * 0.14; rTwist = 0.22;
      lDrop = 1.12; lFwd = 0.20; lBend = 0.82; lTwist = 0.08;
      rWristX = -0.14; rWristZ = -0.10 + Math.sin(t * 5.5 + seed) * 0.10;
      rHandPose = "open_palm";
    } else if (o.isVoting || o.act === "purify_cast") {
      rDrop = 0.34 + Math.sin(t * 4.4 + seed) * 0.07; rFwd = 0.50; rBend = 0.44; rTwist = 0.14;
      lDrop = 1.12; lFwd = 0.22; lBend = 0.88;
      shLiftR = 0.10;
      rWristX = -0.10;
      rHandPose = o.act === "purify_cast" ? "tea_poise" : "open_palm";
    } else if (o.speechAct === "claim_role") {
      // Solemn chest-oath declaration with dignified right hand over heart & steady left palm
      rDrop = 0.82; rFwd = 0.56 + Math.sin(t * 3.8 + seed) * 0.05; rBend = 1.38; rTwist = 0.28;
      lDrop = 0.96; lFwd = 0.44 + Math.cos(t * 3.6 + seed) * 0.05; lBend = 0.88; lTwist = 0.14;
      shLiftR = 0.05; shFwdR = 0.05;
      rWristX = -0.12; rWristY = 0.16;
      rHandPose = "open_palm"; lHandPose = "open_palm";
    } else if (o.isPointingAccuse) {
      // Crisp across-the-table accusation point with index finger extended!
      rDrop = 0.84; rFwd = 1.08 + Math.sin(t * 6.8 + seed) * 0.05; rBend = 0.22; rTwist = clamp(yawNow * 0.35, -0.22, 0.22);
      lDrop = 1.06; lFwd = 0.32; lBend = 1.02; lTwist = 0.12;
      shLiftR = 0.06; shFwdR = 0.09;
      rWristX = -0.06; rWristZ = -0.05;
      rHandPose = "point_index"; lHandPose = "relaxed";
    } else if (o.speechAct === "vouch_warm") {
      // Open warm vouching gesture extending an inviting palm toward trusted ally
      rDrop = 0.84; rFwd = 0.74 + Math.sin(t * 4.2 + seed) * 0.05; rBend = 0.58; rTwist = 0.24;
      lDrop = 1.04; lFwd = 0.34; lBend = 0.94; lTwist = 0.14;
      rWristX = -0.16; rWristY = 0.16; rWristZ = -0.10;
      rHandPose = "open_palm"; lHandPose = "open_palm";
    } else if (o.isAccusing) {
      // Defensive startled posture: shoulders tense, forearms protective
      rDrop = 0.90; rFwd = 0.46; rBend = 1.30; rTwist = -0.10;
      lDrop = 0.90; lFwd = 0.46; lBend = 1.30; lTwist = -0.10;
      shLiftR = 0.09; shLiftL = 0.09; shFwdR = 0.06; shFwdL = 0.06;
      rWristX = -0.22; lWristX = -0.22;
      rHandPose = "open_palm"; lHandPose = "open_palm";
    } else if (talking) {
      // 11-Persona Signature Debate Choreography driven by archetype gestureStyle + live voice amplitude!
      const talkAmp = clamp(o.mouthAmp || 0.42, 0.2, 1.0);
      const tEnergy = arch.talkArmAmp !== undefined ? arch.talkArmAmp : 1.0;
      const cad = t * (4.8 + tEnergy * 1.1) + seed;
      if (gStyle === "classical") {
        // 墨白：寬袖慢拍、從容儒雅的起承轉合手勢
        rDrop = 0.96 - talkAmp * 0.05;
        rFwd = 0.42 + Math.sin(cad * 0.72) * (0.10 + talkAmp * 0.08);
        rBend = 0.96 + Math.cos(cad * 0.72) * 0.12;
        rTwist = 0.26 + Math.sin(cad * 0.5) * 0.08;
        lDrop = 1.10; lFwd = 0.26; lBend = 1.02; lTwist = 0.16;
        rWristX = -0.14 + Math.sin(cad * 0.72) * 0.14; rWristY = 0.16;
        rHandPose = "tea_poise"; lHandPose = "relaxed";
      } else if (gStyle === "graceful" || gStyle === "poetic") {
        // 晴嵐／暖暖／阿竹：溫潤收斂、輕柔挽腕點題
        rDrop = 0.94 - talkAmp * 0.06;
        rFwd = 0.40 + Math.sin(cad * 0.85) * (0.09 + talkAmp * 0.07);
        rBend = 1.04 + Math.cos(cad * 0.85) * 0.11;
        rTwist = 0.22;
        lDrop = 1.02; lFwd = 0.32 + Math.cos(cad * 0.75) * 0.06; lBend = 1.02; lTwist = 0.16;
        rWristX = -0.14 + Math.cos(cad * 0.9) * 0.12; rWristY = 0.12;
        lWristX = -0.08;
        rHandPose = "tea_poise"; lHandPose = "tea_poise";
      } else if (gStyle === "energetic") {
        // 晨晨／阿朗：熱血節奏雙手強調、切掌盤點
        rDrop = 0.84 - talkAmp * 0.10;
        rFwd = 0.48 + Math.sin(cad * 1.15) * (0.14 + talkAmp * 0.10);
        rBend = 0.94 + Math.cos(cad * 1.15) * 0.16;
        rTwist = 0.16 + Math.sin(cad) * 0.10;
        lDrop = 0.88 - talkAmp * 0.07;
        lFwd = 0.42 + Math.cos(cad * 1.05) * (0.12 + talkAmp * 0.08);
        lBend = 0.96 + Math.sin(cad * 1.05) * 0.14;
        lTwist = 0.14;
        shLiftR = 0.05; shLiftL = 0.04; shFwdR = 0.05;
        rWristX = -0.12 + Math.sin(cad * 1.3) * 0.16;
        lWristX = -0.10 + Math.cos(cad * 1.2) * 0.14;
        rHandPose = "open_palm"; lHandPose = "open_palm";
      } else if (gStyle === "expressive") {
        // 星兒／柚子：靈動活潑、雙手輕揚表現力十足
        rDrop = 0.86 - talkAmp * 0.09;
        rFwd = 0.46 + Math.sin(cad * 1.1) * (0.13 + talkAmp * 0.09);
        rBend = 1.08 + Math.cos(cad * 1.1) * 0.16;
        rTwist = 0.24;
        lDrop = 0.90 - talkAmp * 0.06;
        lFwd = 0.40 + Math.cos(cad * 1.1) * (0.11 + talkAmp * 0.07);
        lBend = 1.06 + Math.sin(cad * 1.1) * 0.14;
        lTwist = 0.22;
        rWristX = -0.16 + Math.sin(cad * 1.4) * 0.18; rWristZ = -0.10;
        lWristX = -0.14 + Math.cos(cad * 1.3) * 0.16; lWristZ = -0.08;
        rHandPose = "open_palm"; lHandPose = "open_palm";
      } else if (gStyle === "analytical") {
        // 小澄／小雲：條理分明、單手點數條列推論
        rDrop = 0.90 - talkAmp * 0.06;
        rFwd = 0.46 + Math.sin(cad * 0.95) * (0.10 + talkAmp * 0.07);
        rBend = 1.08 + Math.cos(cad * 0.95) * 0.12;
        rTwist = 0.18;
        lDrop = 1.08; lFwd = 0.24; lBend = 0.94; lTwist = 0.10;
        rWristX = -0.10 + Math.sin(cad * 1.2) * 0.14;
        rHandPose = (Math.sin(cad * 0.45) > 0.2) ? "point_index" : "open_palm";
        lHandPose = "relaxed";
      } else {
        // 阿松／玩家／預設：穩重自然圓桌對話
        rDrop = 0.94 - talkAmp * 0.07 * tEnergy;
        rFwd = 0.38 + Math.sin(cad) * (0.11 + talkAmp * 0.08) * tEnergy;
        rBend = 1.02 + Math.cos(cad) * 0.13 * tEnergy;
        rTwist = 0.16;
        lDrop = 1.02;
        lFwd = 0.30 + Math.cos(cad) * 0.08 * tEnergy;
        lBend = 0.96;
        lTwist = 0.12;
        rWristX = -0.10 + Math.sin(cad) * 0.12;
        rHandPose = "open_palm"; lHandPose = "relaxed";
      }
    } else if (sweating) {
      // Observable nervous fidget: subtly tense raised shoulders & restless clasped hands
      rDrop = 0.92; rFwd = 0.44 + Math.sin(t * 9.5 + seed) * 0.035; rBend = 1.24; rTwist = -0.06;
      lDrop = 0.94; lFwd = 0.40 + Math.cos(t * 8.5 + seed) * 0.035; lBend = 1.20; lTwist = -0.06;
      shLiftR = 0.075; shLiftL = 0.075; shFwdR = 0.05; shFwdL = 0.05;
      rWristX = 0.14; lWristX = 0.14;
    } else if (o.isListeningCurious && inst.mode === "seated") {
      // Thoughtful deduction posture: right hand gently raised near chin while listening intently
      rDrop = 0.76; rFwd = 0.56 + Math.sin(t * 1.6 + seed) * 0.022; rBend = 1.40; rTwist = 0.20;
      lDrop = 1.08; lFwd = 0.24; lBend = 0.94; lTwist = 0.10;
      rWristX = -0.12;
      rHandPose = "tea_poise";
    } else if (inst.mode === "standing") {
      // Graceful poised tea-host standing stance (subtle natural arm drape & breathing sway)
      const swaySt = Math.sin(t * 1.45 + seed) * 0.025;
      rDrop = 1.12; rFwd = 0.20 + swaySt; rBend = 0.62; rTwist = 0.14;
      lDrop = 1.12; lFwd = 0.22 - swaySt * 0.6; lBend = 0.66; lTwist = 0.14;
      rWristX = -0.06; lWristX = -0.06;
      rHandPose = "tea_poise"; lHandPose = "relaxed";
    } else {
      const sway = Math.sin(t * (arch.breathFreq * 0.72) + seed) * arch.armSwayAmp;
      rFwd += sway;
      lFwd -= sway * 0.7;
      rTwist = 0.12; lTwist = 0.12;
    }

    rDrop = clamp(rDrop, -0.55, 1.24);
    lDrop = clamp(lDrop, -0.55, 1.24);
    rFwd = clamp(rFwd, 0.05, 1.25);
    lFwd = clamp(lFwd, 0.05, 1.25);
    rBend = clamp(rBend, 0.10, 1.55);
    lBend = clamp(lBend, 0.10, 1.55);
    rTwist = clamp(rTwist, -0.45, 0.45);
    lTwist = clamp(lTwist, -0.45, 0.45);

    if (bm.rightShoulder) this.slerpBoneModelDelta(bm.rightShoulder, 0, clamp(shFwdR, -0.12, 0.14), -clamp(shLiftR, -0.12, 0.16), 0.15, "YXZ");
    if (bm.leftShoulder) this.slerpBoneModelDelta(bm.leftShoulder, 0, -clamp(shFwdL, -0.12, 0.14), clamp(shLiftL, -0.12, 0.16), 0.15, "YXZ");
    if (bm.rightUpperArm) this.slerpBoneModelDelta(bm.rightUpperArm, -rFwd, rTwist, rDrop, 0.16, "YXZ");
    if (bm.leftUpperArm) this.slerpBoneModelDelta(bm.leftUpperArm, -lFwd, -lTwist, -lDrop, 0.16, "YXZ");
    if (bm.rightLowerArm) this.slerpBoneModelDelta(bm.rightLowerArm, 0, rBend, 0, 0.17, "YXZ");
    if (bm.leftLowerArm) this.slerpBoneModelDelta(bm.leftLowerArm, 0, -lBend, 0, 0.17, "YXZ");
    if (bm.rightHand) this.slerpBoneModelDelta(bm.rightHand, clamp(rWristX, -0.38, 0.38), clamp(rWristY, -0.35, 0.35), clamp(rWristZ, -0.32, 0.32), 0.20, "YXZ");
    if (bm.leftHand) this.slerpBoneModelDelta(bm.leftHand, clamp(lWristX, -0.38, 0.38), -clamp(lWristY, -0.35, 0.35), -clamp(lWristZ, -0.32, 0.32), 0.20, "YXZ");

    // Expressive Finger Pose Articulation (optional proximal finger bones — graceful natural curl/point/open palm!)
    const FINGER_PRESETS = {
      relaxed:     [0.24, 0.32, 0.40, 0.48, 0.18],
      open_palm:   [0.06, 0.08, 0.12, 0.16, 0.06],
      point_index: [0.04, 0.96, 1.04, 1.08, 0.56],
      fist_cheer:  [1.02, 1.08, 1.12, 1.14, 0.65],
      tea_poise:   [0.14, 0.26, 0.40, 0.20, 0.14]
    };
    const rCurls = FINGER_PRESETS[rHandPose] || FINGER_PRESETS.relaxed;
    const lCurls = FINGER_PRESETS[lHandPose] || FINGER_PRESETS.relaxed;
    if (bm.rightIndexProximal) this.slerpBoneModelDelta(bm.rightIndexProximal, 0, 0, rCurls[0], 0.22, "YXZ");
    if (bm.rightMiddleProximal) this.slerpBoneModelDelta(bm.rightMiddleProximal, 0, 0, rCurls[1], 0.22, "YXZ");
    if (bm.rightRingProximal) this.slerpBoneModelDelta(bm.rightRingProximal, 0, 0, rCurls[2], 0.22, "YXZ");
    if (bm.rightLittleProximal) this.slerpBoneModelDelta(bm.rightLittleProximal, 0, 0, rCurls[3], 0.22, "YXZ");
    if (bm.rightThumbProximal) this.slerpBoneModelDelta(bm.rightThumbProximal, 0, rCurls[4] * 0.45, rCurls[4] * 0.32, 0.22, "YXZ");
    if (bm.leftIndexProximal) this.slerpBoneModelDelta(bm.leftIndexProximal, 0, 0, -lCurls[0], 0.22, "YXZ");
    if (bm.leftMiddleProximal) this.slerpBoneModelDelta(bm.leftMiddleProximal, 0, 0, -lCurls[1], 0.22, "YXZ");
    if (bm.leftRingProximal) this.slerpBoneModelDelta(bm.leftRingProximal, 0, 0, -lCurls[2], 0.22, "YXZ");
    if (bm.leftLittleProximal) this.slerpBoneModelDelta(bm.leftLittleProximal, 0, 0, -lCurls[3], 0.22, "YXZ");
    if (bm.leftThumbProximal) this.slerpBoneModelDelta(bm.leftThumbProximal, 0, -lCurls[4] * 0.45, -lCurls[4] * 0.32, 0.22, "YXZ");

    // 3. SpringBone Hair, Ribbons & Skirt Model-Space Physics (gentle non-clipping mountain breeze!)
    const dYaw = clamp(yawNow - (inst.prevHeadYaw || 0), -0.25, 0.25);
    inst.prevHeadYaw = yawNow;
    inst.headInertia = (inst.headInertia || 0) * 0.84 + dYaw * 1.4;

    const qMode = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const springStride = o.isPriority ? 1 : (qMode === "eco" ? 3 : (qMode === "balanced" ? 2 : 1));
    const runSprings = springStride <= 1 || typeof o.frameCounter !== "number" || ((o.frameCounter + (o.seatId || 0)) % springStride === 0);
    if (runSprings && inst.springBones && inst.springBones.length) {
      for (let si = 0; si < inst.springBones.length; si++) {
        const sb = inst.springBones[si];
        if (!sb || !sb.quatMeta) continue;
        if (sb.isSkirt && inst.mode === "seated") {
          const skSway = Math.sin(t * 1.5 + sb.phase) * 0.014;
          const skAng = this.getSeatedSkirtTargetAngles(sb, skSway);
          this.slerpBoneModelDelta(sb.quatMeta, skAng.rx, skAng.ry, skAng.rz, 0.16, "YXZ");
        } else {
          const baseAmp = clamp(0.045 / Math.sqrt(sb.stiffness || 0.7), 0.02, 0.065);
          const breezeZ = clamp(Math.sin(t * 2.1 + sb.phase) * baseAmp + inst.headInertia * 0.18, -0.08, 0.08);
          const breezeX = clamp(Math.cos(t * 1.7 + sb.phase) * (baseAmp * 0.65), -0.06, 0.06);
          this.slerpBoneModelDelta(sb.quatMeta, breezeX, 0, breezeZ, 0.16, "YXZ");
        }
      }
    }
  }
};
