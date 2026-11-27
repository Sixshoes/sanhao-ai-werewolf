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
  "清茗": { gestureStyle: "graceful",   breathFreq: 1.04, breathAmp: 0.017, spineLean: 0.014,  shoulderSpread: -0.015, headRollAmp: 0.022, headTiltBias: -0.014, gazeSaccadeSpeed: 0.90, idleHappy: 0.16, idleFun: 0.04, rDrop: 0.98, rFwd: 0.36, rBend: 1.08, lDrop: 0.98, lFwd: 0.38, lBend: 1.12, armSwayAmp: 0.018, talkArmAmp: 0.96, legTempo: 0.25, idlePool: ["tea_poise", "sleeve_poise", "hands_clasp", "look_around"] },
  "主持": { gestureStyle: "graceful",   breathFreq: 1.04, breathAmp: 0.017, spineLean: 0.014,  shoulderSpread: -0.015, headRollAmp: 0.022, headTiltBias: -0.014, gazeSaccadeSpeed: 0.90, idleHappy: 0.16, idleFun: 0.04, rDrop: 0.98, rFwd: 0.36, rBend: 1.08, lDrop: 0.98, lFwd: 0.38, lBend: 1.12, armSwayAmp: 0.018, talkArmAmp: 0.96, legTempo: 0.25, idlePool: ["tea_poise", "sleeve_poise", "hands_clasp", "look_around"] },
  "你":   { gestureStyle: "balanced",   breathFreq: 1.14, breathAmp: 0.019, spineLean: 0.022,  shoulderSpread: 0.0,    headRollAmp: 0.026, headTiltBias: 0.0,    gazeSaccadeSpeed: 1.0,  idleHappy: 0.10, idleFun: 0.05, rDrop: 1.11, rFwd: 0.26, rBend: 0.92, lDrop: 1.13, lFwd: 0.24, lBend: 0.88, armSwayAmp: 0.020, talkArmAmp: 1.08, legTempo: 0.44, idlePool: ["sip_tea", "chin_rest", "look_around", "hands_clasp"] },
  "小澄": { gestureStyle: "analytical", breathFreq: 1.12, breathAmp: 0.017, spineLean: 0.056,  shoulderSpread: -0.058, headRollAmp: 0.022, headTiltBias: 0.026,  gazeSaccadeSpeed: 1.30, idleHappy: 0.02, idleFun: 0.0,  rDrop: 1.08, rFwd: 0.31, rBend: 1.06, lDrop: 1.14, lFwd: 0.24, lBend: 0.88, armSwayAmp: 0.017, talkArmAmp: 1.06, legTempo: 0.34, idlePool: ["glasses_adjust", "count_fingers", "chin_rest", "table_tap"] },
  "暖暖": { gestureStyle: "graceful",   breathFreq: 1.20, breathAmp: 0.021, spineLean: 0.030,  shoulderSpread: -0.045, headRollAmp: 0.038, headTiltBias: -0.032, gazeSaccadeSpeed: 0.92, idleHappy: 0.28, idleFun: 0.18, rDrop: 0.96, rFwd: 0.44, rBend: 1.24, lDrop: 0.96, lFwd: 0.44, lBend: 1.24, armSwayAmp: 0.022, talkArmAmp: 1.02, legTempo: 0.38, idlePool: ["cup_cradle", "sip_tea", "hands_clasp", "playful_sway"] },
  "阿松": { gestureStyle: "steady",     breathFreq: 0.96, breathAmp: 0.020, spineLean: -0.054, shoulderSpread: 0.068,  headRollAmp: 0.016, headTiltBias: 0.0,    gazeSaccadeSpeed: 0.78, idleHappy: 0.09, idleFun: 0.0,  rDrop: 1.04, rFwd: 0.36, rBend: 1.16, lDrop: 1.04, lFwd: 0.36, lBend: 1.16, armSwayAmp: 0.015, talkArmAmp: 0.96, legTempo: 0.24, idlePool: ["arms_fold", "lean_back", "sip_tea", "stretch_roll"] },
  "星兒": { gestureStyle: "expressive", breathFreq: 1.36, breathAmp: 0.023, spineLean: 0.026,  shoulderSpread: -0.020, headRollAmp: 0.046, headTiltBias: 0.064,  gazeSaccadeSpeed: 1.20, starGaze: true, idleHappy: 0.22, idleFun: 0.30, rDrop: 1.06, rFwd: 0.31, rBend: 1.08, lDrop: 1.12, lFwd: 0.25, lBend: 0.90, armSwayAmp: 0.028, talkArmAmp: 1.28, legTempo: 0.60, idlePool: ["star_gaze", "playful_sway", "chin_rest", "sip_tea"] },
  "小雲": { gestureStyle: "analytical", breathFreq: 1.10, breathAmp: 0.018, spineLean: 0.050,  shoulderSpread: -0.032, headRollAmp: 0.026, headTiltBias: -0.034, gazeSaccadeSpeed: 1.65, idleHappy: 0.08, idleFun: 0.05, rDrop: 1.04, rFwd: 0.34, rBend: 1.12, lDrop: 1.12, lFwd: 0.26, lBend: 0.96, armSwayAmp: 0.019, talkArmAmp: 1.14, legTempo: 0.36, idlePool: ["note_jot", "chin_rest", "table_tap", "look_around"] },
  "阿竹": { gestureStyle: "poetic",     breathFreq: 1.02, breathAmp: 0.017, spineLean: 0.012,  shoulderSpread: 0.010,  headRollAmp: 0.022, headTiltBias: 0.018,  gazeSaccadeSpeed: 0.85, idleHappy: 0.08, idleFun: 0.03, rDrop: 0.98, rFwd: 0.42, rBend: 1.14, lDrop: 1.08, lFwd: 0.32, lBend: 1.06, armSwayAmp: 0.017, talkArmAmp: 0.94, legTempo: 0.26, idlePool: ["tea_poise", "sip_tea", "sleeve_poise", "look_around"] },
  "晨晨": { gestureStyle: "energetic",  breathFreq: 1.32, breathAmp: 0.022, spineLean: -0.062, shoulderSpread: 0.082,  headRollAmp: 0.036, headTiltBias: 0.0,    gazeSaccadeSpeed: 1.24, idleHappy: 0.20, idleFun: 0.16, rDrop: 1.02, rFwd: 0.30, rBend: 0.82, lDrop: 1.04, lFwd: 0.28, lBend: 0.80, armSwayAmp: 0.028, talkArmAmp: 1.32, legTempo: 0.64, idlePool: ["lean_back", "stretch_roll", "table_tap", "playful_sway"] },
  "墨白": { gestureStyle: "classical",  breathFreq: 0.95, breathAmp: 0.015, spineLean: -0.014, shoulderSpread: 0.012,  headRollAmp: 0.015, headTiltBias: 0.008,  gazeSaccadeSpeed: 0.72, idleHappy: 0.0,  idleFun: 0.0,  rDrop: 1.04, rFwd: 0.36, rBend: 1.12, lDrop: 1.12, lFwd: 0.28, lBend: 1.02, armSwayAmp: 0.014, talkArmAmp: 0.88, legTempo: 0.22, idlePool: ["tea_poise", "sleeve_poise", "sip_tea", "arms_fold"] },
  "晴嵐": { gestureStyle: "graceful",   breathFreq: 1.08, breathAmp: 0.018, spineLean: 0.016,  shoulderSpread: -0.022, headRollAmp: 0.030, headTiltBias: -0.028, gazeSaccadeSpeed: 0.95, idleHappy: 0.22, idleFun: 0.12, rDrop: 1.06, rFwd: 0.32, rBend: 1.06, lDrop: 1.10, lFwd: 0.28, lBend: 1.00, armSwayAmp: 0.020, talkArmAmp: 0.96, legTempo: 0.30, idlePool: ["sleeve_poise", "tea_poise", "sip_tea", "hands_clasp"] },
  "阿朗": { gestureStyle: "energetic",  breathFreq: 1.24, breathAmp: 0.020, spineLean: 0.088,  shoulderSpread: -0.036, headRollAmp: 0.026, headTiltBias: 0.022,  gazeSaccadeSpeed: 1.38, idleHappy: 0.08, idleFun: 0.08, rDrop: 0.82, rFwd: 0.56, rBend: 1.34, lDrop: 1.02, lFwd: 0.38, lBend: 1.16, armSwayAmp: 0.024, talkArmAmp: 1.26, legTempo: 0.48, idlePool: ["chin_rest", "table_tap", "arms_fold", "stretch_roll"] },
  "柚子": { gestureStyle: "expressive", breathFreq: 1.34, breathAmp: 0.022, spineLean: 0.036,  shoulderSpread: -0.038, headRollAmp: 0.044, headTiltBias: -0.036, gazeSaccadeSpeed: 1.16, idleHappy: 0.32, idleFun: 0.26, rDrop: 0.94, rFwd: 0.46, rBend: 1.28, lDrop: 0.94, lFwd: 0.46, lBend: 1.28, armSwayAmp: 0.026, talkArmAmp: 1.24, legTempo: 0.58, idlePool: ["cup_cradle", "playful_sway", "sip_tea", "hands_clasp"] },
  default: { gestureStyle: "balanced",  breathFreq: 1.15, breathAmp: 0.019, spineLean: 0.020,  shoulderSpread: 0.0,    headRollAmp: 0.026, headTiltBias: 0.0,    gazeSaccadeSpeed: 1.0,  idleHappy: 0.06, idleFun: 0.0,  rDrop: 1.11, rFwd: 0.26, rBend: 0.92, lDrop: 1.12, lFwd: 0.24, lBend: 0.88, armSwayAmp: 0.020, talkArmAmp: 1.06, legTempo: 0.40, idlePool: ["sip_tea", "chin_rest", "look_around", "hands_clasp"] }
};

/**
 * v17.0 全 11 位 AI 角色 3D 剪影拆雙胞胎與專屬大型輪廓配件表
 * - 晴嵐改掛獨立閒置女體模型 xiaocheng.vrm（徹底脫離與玩家女主角 player.vrm 撞臉）＋單側長辮＋玉簪披帛
 * - 墨白（頭頂束髮高髻＋深色交領寬袖披肩）、柚子（抹茶軟呢貝雷帽＋雙側蓬鬆耳髮）、阿朗（西裝背心翻領＋耳掛）、小澄（眼鏡＋立領連帽外套）全數以大面積剪影破除撞臉
 * - 補齊阿松（高領登山摺疊圍巾＋傘繩手環）與小雲（採訪證斜背掛繩＋胸袋速寫本＋髮夾）原本為 null 的 3D 配件
 */
const VRM_PERSONA_STYLING = Object.freeze({
  "清茗": Object.freeze({ baseSlug: "qingming", bakedNative: true, hairHex: "#28242C", hairStr: 0.62, topsHex: "#447364", topsStr: 0.90, neckHex: "#D6B066", neckStr: 0.92, bottomsHex: "#2E353B", bottomsStr: 0.90, eyeHex: "#7B5028", vrmAcc: "tea_host" }),
  "主持": Object.freeze({ baseSlug: "qingming", bakedNative: true, hairHex: "#28242C", hairStr: 0.62, topsHex: "#447364", topsStr: 0.90, neckHex: "#D6B066", neckStr: 0.92, bottomsHex: "#2E353B", bottomsStr: 0.90, eyeHex: "#7B5028", vrmAcc: "tea_host" }),
  "你": Object.freeze({ bakedNative: true, hairHex: "#4E3426", hairStr: 0.42, topsHex: "#3E5F56", topsStr: 0.84, neckHex: "#DBC292", neckStr: 0.88, bottomsHex: "#2B313A", bottomsStr: 0.88, eyeHex: "#8C6232", vrmAcc: null }),
  "小澄": Object.freeze({ baseSlug: "xiaocheng", bakedNative: true, hairHex: "#1E2738", hairStr: 0.88, topsHex: "#2E5378", topsStr: 0.84, neckHex: "#F0EBE0", neckStr: 0.82, bottomsHex: "#232A36", bottomsStr: 0.84, eyeHex: "#3E638A", vrmAcc: "glasses" }),
  "暖暖": Object.freeze({ baseSlug: "nuannuan", bakedNative: true, hairHex: "#6E4930", hairStr: 0.48, topsHex: "#C78D42", topsStr: 0.78, neckHex: "#F5EBD6", neckStr: 0.80, bottomsHex: "#382C24", bottomsStr: 0.84, eyeHex: "#4A7562", vrmAcc: "ribbon" }),
  "阿松": Object.freeze({ baseSlug: "asong", bakedNative: true, hairHex: "#2C3136", hairStr: 0.72, topsHex: "#2B5B45", topsStr: 0.78, neckHex: "#6D8E78", neckStr: 0.80, bottomsHex: "#262C28", bottomsStr: 0.84, eyeHex: "#684528", vrmAcc: "hiking_scarf" }),
  "星兒": Object.freeze({ baseSlug: "xinger", bakedNative: true, hairHex: "#6B4A8C", hairStr: 0.90, topsHex: "#7B5894", topsStr: 0.86, neckHex: "#E5C77B", neckStr: 0.84, bottomsHex: "#2B2533", bottomsStr: 0.86, eyeHex: "#6B5BA8", vrmAcc: "star_clip" }),
  "小雲": Object.freeze({ baseSlug: "xiaoyun", bakedNative: true, hairHex: "#2F1D29", hairStr: 0.72, topsHex: "#2B2E36", topsStr: 0.76, neckHex: "#8F3245", neckStr: 0.84, bottomsHex: "#24262E", bottomsStr: 0.88, eyeHex: "#9A662E", vrmAcc: "press_kit" }),
  "阿竹": Object.freeze({ baseSlug: "azhu", bakedNative: true, hairHex: "#23292B", hairStr: 0.86, topsHex: "#36635C", topsStr: 0.80, neckHex: "#20272C", neckStr: 0.82, bottomsHex: "#222929", bottomsStr: 0.86, eyeHex: "#3E665F", vrmAcc: "jade_pendant" }),
  "晨晨": Object.freeze({ baseSlug: "chenchen", bakedNative: true, hairHex: "#5E3B24", hairStr: 0.78, topsHex: "#C95A2B", topsStr: 0.84, neckHex: "#F4EFE6", neckStr: 0.82, bottomsHex: "#2B2623", bottomsStr: 0.84, eyeHex: "#8A5424", vrmAcc: "headband" }),
  "墨白": Object.freeze({ baseSlug: "mobai", bakedNative: true, hairHex: "#171B24", hairStr: 0.88, topsHex: "#2C3A54", topsStr: 0.86, neckHex: "#F0E8D9", neckStr: 0.82, bottomsHex: "#1F2430", bottomsStr: 0.88, eyeHex: "#344668", vrmAcc: "ink_scroll" }),
  "晴嵐": Object.freeze({ baseSlug: "qinglan", bakedNative: true, hairHex: "#4D3124", hairStr: 0.76, topsHex: "#C98C94", topsStr: 0.84, neckHex: "#F4ECE4", neckStr: 0.82, bottomsHex: "#332A2E", bottomsStr: 0.86, eyeHex: "#6A422C", vrmAcc: "jade_hairpin" }),
  "阿朗": Object.freeze({ baseSlug: "alang", bakedNative: true, hairHex: "#3A261B", hairStr: 0.78, topsHex: "#A67B42", topsStr: 0.84, neckHex: "#2D221B", neckStr: 0.84, bottomsHex: "#292520", bottomsStr: 0.86, eyeHex: "#9A6826", vrmAcc: "gavel_brooch" }),
  "柚子": Object.freeze({ baseSlug: "youzi", bakedNative: true, hairHex: "#A46C32", hairStr: 0.78, topsHex: "#7E9B56", topsStr: 0.84, neckHex: "#F7F1E3", neckStr: 0.82, bottomsHex: "#2E3326", bottomsStr: 0.86, eyeHex: "#5E8A32", vrmAcc: "yuzu_clip" })
});

const HERO_VRM_PALETTES = Object.freeze({
  celadon: Object.freeze({ topsHex: "#447364", topsStr: 0.90, neckHex: "#d6b066", neckStr: 0.92, bottomsHex: "#2e353b", bottomsStr: 0.90, shawlHex: 0x3b6658, jadeHex: 0x6ec7a5 }),
  teagold: Object.freeze({ topsHex: "#8c6134", topsStr: 0.90, neckHex: "#e6c67e", neckStr: 0.92, bottomsHex: "#2d251e", bottomsStr: 0.90, shawlHex: 0x7a542d, jadeHex: 0xe2bc6b }),
  inknight: Object.freeze({ topsHex: "#31415c", topsStr: 0.90, neckHex: "#d4b478", neckStr: 0.92, bottomsHex: "#1d222c", bottomsStr: 0.90, shawlHex: 0x293750, jadeHex: 0x89aed4 })
});

const VRM_FINGER_PRESETS = Object.freeze({
  relaxed: [0.24, 0.32, 0.40, 0.48, 0.18],
  open_palm: [0.06, 0.08, 0.12, 0.16, 0.06],
  point_index: [0.04, 0.96, 1.04, 1.08, 0.56],
  fist_cheer: [1.02, 1.08, 1.12, 1.14, 0.65],
  tea_poise: [0.14, 0.26, 0.40, 0.20, 0.14]
});

// Zero-allocation conversational gesture phrases cross-faded with smoothstep during natural speech
const VRM_TALK_PHRASES = Object.freeze([
  Object.freeze({ rDrop: 0.64, rFwd: 0.68, rBend: 0.78, rTwist: 0.26, lDrop: 0.92, lFwd: 0.44, lBend: 1.02, lTwist: 0.16, shLiftR: 0.055, shFwdR: 0.045, shLiftL: 0.02, shFwdL: 0.01, rWX: -0.18, rWY: 0.16, rWZ: -0.08, lWX: -0.10, lWY: 0.06, lWZ: 0.0, rPose: "open_palm", lPose: "relaxed" }),
  Object.freeze({ rDrop: 0.72, rFwd: 0.80, rBend: 1.10, rTwist: 0.14, lDrop: 0.86, lFwd: 0.52, lBend: 0.94, lTwist: 0.20, shLiftR: 0.065, shFwdR: 0.060, shLiftL: 0.03, shFwdL: 0.02, rWX: -0.14, rWY: 0.08, rWZ: -0.05, lWX: -0.12, lWY: 0.08, lWZ: -0.04, rPose: "point_index", lPose: "open_palm" }),
  Object.freeze({ rDrop: 0.78, rFwd: 0.56, rBend: 1.40, rTwist: 0.30, lDrop: 0.70, lFwd: 0.66, lBend: 0.74, lTwist: 0.26, shLiftR: 0.040, shFwdR: 0.030, shLiftL: 0.055, shFwdL: 0.045, rWX: -0.12, rWY: 0.16, rWZ: 0.0, lWX: -0.18, lWY: 0.14, lWZ: -0.06, rPose: "tea_poise", lPose: "open_palm" }),
  Object.freeze({ rDrop: 0.62, rFwd: 0.66, rBend: 0.82, rTwist: 0.28, lDrop: 0.74, lFwd: 0.60, lBend: 0.84, lTwist: 0.24, shLiftR: 0.060, shFwdR: 0.040, shLiftL: 0.050, shFwdL: 0.035, rWX: -0.20, rWY: 0.14, rWZ: -0.10, lWX: -0.16, lWY: 0.12, lWZ: -0.08, rPose: "open_palm", lPose: "open_palm" })
]);

const stage3dVrm = {
  _scratch: null,
  _idleActScratch: { name: "", weight: 0, phase: 0 },
  _skirtAngScratch: { rx: 0, ry: 0, rz: 0 },
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
  _recolorCacheKeys: [],

  disposeTextureResource: function (tex) {
    if (!tex) return;
    if (typeof stage3dAnime !== "undefined" && stage3dAnime.cache && tex === stage3dAnime.cache.gradientMap) return;
    if (typeof stage3dTextures !== "undefined" && stage3dTextures.cache) {
      const vals = Object.values(stage3dTextures.cache);
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i];
        if (v === tex || (v && (v.map === tex || v.bump === tex || v.roughness === tex))) return;
      }
    }
    try {
      if (typeof tex.dispose === "function") tex.dispose();
    } catch (e) { }
    try {
      const img = tex.image;
      if (img) {
        if (typeof img.close === "function") {
          img.close();
        } else if (typeof HTMLCanvasElement !== "undefined" && img instanceof HTMLCanvasElement) {
          img.width = 0;
          img.height = 0;
        }
        tex.image = null;
      }
    } catch (e) { }
  },

  getAdaptiveVrmTexSettings: function () {
    const isSoft = Boolean(typeof stage3d !== "undefined" && stage3d.isSoftwareRenderer);
    const isIgpu = Boolean(typeof stage3d !== "undefined" && stage3d.isIntegratedGpu);
    const q = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(String(navigator.userAgent || ""));
    let maxDim = 2048;
    let anisotropy = 6;
    if (isSoft || isMobile || q === "eco") {
      maxDim = 512;
      anisotropy = 1;
    } else if (isIgpu || q === "balanced") {
      maxDim = 1024;
      anisotropy = 3;
    }
    if (
      typeof stage3d !== "undefined" &&
      stage3d.renderer &&
      stage3d.renderer.capabilities &&
      typeof stage3d.renderer.capabilities.getMaxAnisotropy === "function"
    ) {
      anisotropy = Math.min(anisotropy, Math.max(1, stage3d.renderer.capabilities.getMaxAnisotropy() || 1));
    }
    return { maxDim: maxDim, anisotropy: anisotropy };
  },

  downscaleVrmTextureIfNeeded: function (srcTex, maxDim, localCache, anisotropy) {
    if (!srcTex || !srcTex.image) return srcTex;
    const img = srcTex.image;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (iw <= 0 || ih <= 0) return srcTex;
    // Skip mipmap pyramid allocation on tiny 8x8 / 16x16 VRM placeholder textures
    if (Math.max(iw, ih) <= 16) {
      srcTex.generateMipmaps = false;
      if (typeof THREE !== "undefined" && THREE.LinearFilter !== undefined) srcTex.minFilter = THREE.LinearFilter;
      return srcTex;
    }
    if (anisotropy && anisotropy > 1 && typeof srcTex.anisotropy === "number") {
      srcTex.anisotropy = anisotropy;
    }
    const lim = maxDim || 1024;
    if (Math.max(iw, ih) <= lim || typeof document === "undefined" || typeof THREE === "undefined" || typeof THREE.CanvasTexture !== "function") {
      return srcTex;
    }
    const cacheKey = (srcTex.uuid || "tex") + "|downscale|" + lim;
    if (localCache && localCache[cacheKey]) return localCache[cacheKey];
    try {
      const sc = lim / Math.max(iw, ih);
      const w = Math.max(16, Math.round(iw * sc));
      const h = Math.max(16, Math.round(ih * sc));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const outTex = new THREE.CanvasTexture(c);
      outTex.flipY = srcTex.flipY;
      outTex.wrapS = srcTex.wrapS;
      outTex.wrapT = srcTex.wrapT;
      if (anisotropy && anisotropy > 1) outTex.anisotropy = anisotropy;
      if (THREE.sRGBEncoding !== undefined) outTex.encoding = srcTex.encoding || THREE.sRGBEncoding;
      outTex.needsUpdate = true;
      if (localCache) localCache[cacheKey] = outTex;
      return outTex;
    } catch (e) {
      return srcTex;
    }
  },

  compactUnusedMorphTargets: function (rawScene, morphs) {
    if (!rawScene || typeof rawScene.traverse !== "function") return;
    const usedByMesh = new Map();
    if (morphs) {
      Object.keys(morphs).forEach(function (bucket) {
        const list = morphs[bucket];
        if (!Array.isArray(list)) return;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (!b || !b.mesh || typeof b.idx !== "number") continue;
          let set = usedByMesh.get(b.mesh);
          if (!set) {
            set = new Set();
            usedByMesh.set(b.mesh, set);
          }
          set.add(b.idx);
        }
      });
    }
    const remapByMesh = new Map();
    rawScene.traverse(function (obj) {
      if (!obj || !obj.isMesh || !obj.geometry || !obj.geometry.morphAttributes) return;
      const ma = obj.geometry.morphAttributes;
      // Anime cel faces do not need per-morph vertex normals (cuts morph VRAM in half & avoids USE_MORPHNORMALS shaders)
      if (ma.normal) delete ma.normal;
      if (ma.tangent) delete ma.tangent;
      const posArr = ma.position;
      if (!Array.isArray(posArr) || posArr.length === 0) return;
      const usedSet = usedByMesh.get(obj);
      if (!usedSet || usedSet.size === 0) {
        delete ma.position;
        obj.morphTargetInfluences = undefined;
        obj.morphTargetDictionary = undefined;
        return;
      }
      if (usedSet.size >= posArr.length) return;
      const sortedIdx = Array.from(usedSet).filter(function (idx) { return idx >= 0 && idx < posArr.length; }).sort(function (a, b) { return a - b; });
      const newPos = [];
      const newInf = [];
      const oldToNew = {};
      for (let i = 0; i < sortedIdx.length; i++) {
        const oldIdx = sortedIdx[i];
        oldToNew[oldIdx] = i;
        newPos.push(posArr[oldIdx]);
        newInf.push((obj.morphTargetInfluences && obj.morphTargetInfluences[oldIdx]) || 0);
      }
      ma.position = newPos;
      obj.morphTargetInfluences = newInf;
      if (obj.morphTargetDictionary) {
        const nextDict = {};
        Object.keys(obj.morphTargetDictionary).forEach(function (k) {
          const oi = obj.morphTargetDictionary[k];
          if (oldToNew[oi] !== undefined) nextDict[k] = oldToNew[oi];
        });
        obj.morphTargetDictionary = nextDict;
      }
      remapByMesh.set(obj, oldToNew);
    });
    if (remapByMesh.size > 0 && morphs) {
      Object.keys(morphs).forEach(function (bucket) {
        const list = morphs[bucket];
        if (!Array.isArray(list)) return;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (!b || !b.mesh) continue;
          const map = remapByMesh.get(b.mesh);
          if (map && map[b.idx] !== undefined) b.idx = map[b.idx];
        }
      });
    }
  },

  clearRecolorCache: function () {
    const self = this;
    Object.keys(this._recolorCache || {}).forEach(function (k) {
      const tex = self._recolorCache[k];
      self.disposeTextureResource(tex);
    });
    this._recolorCache = {};
    this._recolorCacheKeys = [];
  },

  recolorVrmTextureMap: function (srcTex, targetHex, strength, localCache, opts) {
    if (!srcTex || !srcTex.image || !targetHex || typeof document === "undefined" || typeof THREE.CanvasTexture !== "function") {
      return srcTex;
    }
    const img = srcTex.image;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (iw < 4 || ih < 4) return srcTex;
    const o = opts || {};
    const texCfg = this.getAdaptiveVrmTexSettings();
    const isIgpuRecolor = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
    const maxDim = Math.min(o.maxDim || texCfg.maxDim, isIgpuRecolor ? 512 : 1024);
    const aniso = o.anisotropy || texCfg.anisotropy;
    const isHair = Boolean(o.isHair);
    const cacheKey = (srcTex.uuid || "tex") + "|" + targetHex + "|" + (strength || 0.6) + "|" + maxDim + "|" + (isHair ? "h" : "c");
    if (localCache && localCache[cacheKey]) return localCache[cacheKey];
    if (!localCache && this._recolorCache[cacheKey]) return this._recolorCache[cacheKey];
    try {
      const hex = String(targetHex).replace("#", "");
      const tr = parseInt(hex.slice(0, 2), 16) || 0;
      const tg = parseInt(hex.slice(2, 4), 16) || 0;
      const tb = parseInt(hex.slice(4, 6), 16) || 0;
      const sc = Math.min(1, maxDim / Math.max(iw, ih));
      const w = Math.max(16, Math.round(iw * sc));
      const h = Math.max(16, Math.round(ih * sc));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const idata = ctx.getImageData(0, 0, w, h);
      const d = idata.data;
      const rawBlend = Number(strength) || 0.72;
      const blend = isHair ? clamp(rawBlend * 0.86, 0.34, 0.76) : clamp(rawBlend * 0.90, 0.38, 0.82);
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Preserve dark ink lines & hand-painted fold/highlight contrast without blowing pale/white base textures to #FFFFFF!
        const darkGuard = lum < 0.14 ? clamp((0.14 - lum) / 0.14, 0, 1) : 0;
        const effBlend = blend * (1 - darkGuard * 0.55);
        const effInv = 1 - effBlend;
        const shadeMul = lum > 0.86 ? (0.96 + (lum - 0.86) * 1.10) : (0.40 + lum * 0.66);
        const specLift = lum > 0.90 ? ((lum - 0.90) * 135) : 0;
        const nr = Math.min(255, tr * shadeMul + specLift);
        const ng = Math.min(255, tg * shadeMul + specLift);
        const nb = Math.min(255, tb * shadeMul + specLift);
        d[i] = Math.round(r * effInv + nr * effBlend);
        d[i + 1] = Math.round(g * effInv + ng * effBlend);
        d[i + 2] = Math.round(b * effInv + nb * effBlend);
      }
      ctx.putImageData(idata, 0, 0);
      const outTex = new THREE.CanvasTexture(c);
      outTex.flipY = srcTex.flipY;
      outTex.wrapS = srcTex.wrapS;
      outTex.wrapT = srcTex.wrapT;
      if (aniso && aniso > 1) outTex.anisotropy = aniso;
      if (THREE.sRGBEncoding !== undefined) outTex.encoding = THREE.sRGBEncoding;
      outTex.needsUpdate = true;
      if (localCache) {
        localCache[cacheKey] = outTex;
      } else {
        this._recolorCache[cacheKey] = outTex;
        if (!Array.isArray(this._recolorCacheKeys)) this._recolorCacheKeys = [];
        this._recolorCacheKeys.push(cacheKey);
        while (this._recolorCacheKeys.length > 128) {
          const oldestKey = this._recolorCacheKeys.shift();
          if (oldestKey && oldestKey !== cacheKey && this._recolorCache[oldestKey]) {
            const oldTex = this._recolorCache[oldestKey];
            if (oldTex) {
              if (typeof this.disposeTextureResource === "function") {
                this.disposeTextureResource(oldTex);
              } else if (typeof oldTex.dispose === "function") {
                try { oldTex.dispose(); } catch (e) { }
              }
            }
            delete this._recolorCache[oldestKey];
          }
        }
      }
      return outTex;
    } catch (e) {
      return srcTex;
    }
  },

  /**
   * Paints opaque matte charcoal-navy modesty safety shorts (安全褲) directly onto VRoid standard
   * female Body_00_SKIN UV maps, completely eliminating default white underwear & skin gaps
   * across pelvis, crotch, and upper thighs while leaving feet/hands/torso untouched.
   */
  applyHeroVrmPalette: function (vrmInst, palKey) {
    if (!vrmInst || !HERO_VRM_PALETTES[palKey]) return false;
    const pal = HERO_VRM_PALETTES[palKey];
    let updated = false;
    const slots = Array.isArray(vrmInst.recolorSlots) ? vrmInst.recolorSlots : [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s || !s.mat || !s.origMap) continue;
      let hex = null;
      let str = 0.88;
      if (s.slot === "tops") { hex = pal.topsHex; str = pal.topsStr; }
      else if (s.slot === "neck") { hex = pal.neckHex; str = pal.neckStr; }
      else if (s.slot === "bottoms") { hex = pal.bottomsHex; str = pal.bottomsStr; }
      if (!hex) continue;
      const newTex = this.recolorVrmTextureMap(s.origMap, hex, str);
      if (newTex) {
        const hadMap = Boolean(s.mat.map);
        s.mat.map = newTex;
        if (!hadMap) s.mat.needsUpdate = true;
        updated = true;
      }
    }
    if (vrmInst.accMats) {
      if (vrmInst.accMats.shawlMat && vrmInst.accMats.shawlMat.color) {
        vrmInst.accMats.shawlMat.color.setHex(pal.shawlHex);
        updated = true;
      }
      if (vrmInst.accMats.jadeMat && vrmInst.accMats.jadeMat.color) {
        vrmInst.accMats.jadeMat.color.setHex(pal.jadeHex);
        updated = true;
      }
    }
    return updated;
  },

  paintVrmModestyShortsMap: function (srcTex, shortHex, localCache) {
    if (!srcTex || !srcTex.image || typeof document === "undefined" || typeof THREE.CanvasTexture !== "function") {
      return srcTex;
    }
    const img = srcTex.image;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (iw < 4 || ih < 4) return srcTex;
    const hexCol = shortHex || "#1e2330";
    const cacheKey = (srcTex.uuid || "tex") + "|modesty_shorts|" + hexCol;
    if (localCache && localCache[cacheKey]) return localCache[cacheKey];
    if (!localCache && this._recolorCache[cacheKey]) return this._recolorCache[cacheKey];
    try {
      const maxDim = 512;
      const sc = Math.min(1, maxDim / Math.max(iw, ih));
      const w = Math.max(32, Math.round(iw * sc));
      const h = Math.max(32, Math.round(ih * sc));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);

      // Subtle matte woven fabric vertical gradient for realistic anime safety shorts (安全褲)
      const pelvisGrad = ctx.createLinearGradient(0, h * 0.44, 0, h * 0.65);
      pelvisGrad.addColorStop(0.0, "#262c3b");
      pelvisGrad.addColorStop(0.45, hexCol);
      pelvisGrad.addColorStop(1.0, "#151923");

      // 1. Center pelvis / hips / buttocks / crotch UV polygon (strictly inside u∈[0.239, 0.761] & above feet so forearms/wrists/feet stay 100% untouched!)
      ctx.save();
      ctx.fillStyle = pelvisGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.239, h * 0.448);
      ctx.lineTo(w * 0.761, h * 0.448);
      ctx.lineTo(w * 0.761, h * 0.608);
      ctx.lineTo(w * 0.720, h * 0.584);
      ctx.lineTo(w * 0.635, h * 0.576);
      ctx.lineTo(w * 0.542, h * 0.584);
      ctx.lineTo(w * 0.520, h * 0.646);
      ctx.lineTo(w * 0.480, h * 0.646);
      ctx.lineTo(w * 0.458, h * 0.584);
      ctx.lineTo(w * 0.365, h * 0.576);
      ctx.lineTo(w * 0.280, h * 0.584);
      ctx.lineTo(w * 0.239, h * 0.608);
      ctx.closePath();
      ctx.fill();

      // Subtle waistband trim line
      ctx.strokeStyle = "#12151e";
      ctx.lineWidth = Math.max(1.5, h * 0.004);
      ctx.beginPath();
      ctx.moveTo(w * 0.239, h * 0.452);
      ctx.lineTo(w * 0.761, h * 0.452);
      ctx.stroke();

      // 2. Left & Right upper-thigh modesty short legs (starts at v=0.491, clearing wrists at v<=0.4858 while fully covering thighs from v=0.496!)
      const thighGrad = ctx.createLinearGradient(0, h * 0.491, 0, h * 0.594);
      thighGrad.addColorStop(0.0, "#252b3a");
      thighGrad.addColorStop(0.75, hexCol);
      thighGrad.addColorStop(1.0, "#171b26");
      ctx.fillStyle = thighGrad;
      ctx.fillRect(0, h * 0.491, w * 0.238, h * 0.103);
      ctx.fillRect(w * 0.762, h * 0.491, w * 0.238, h * 0.103);

      // Clean safety-short lower hem stitch on both upper thighs
      ctx.strokeStyle = "#2f374a";
      ctx.lineWidth = Math.max(1.2, h * 0.003);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.590);
      ctx.lineTo(w * 0.238, h * 0.590);
      ctx.moveTo(w * 0.762, h * 0.590);
      ctx.lineTo(w, h * 0.590);
      ctx.stroke();
      ctx.restore();

      const outTex = new THREE.CanvasTexture(c);
      outTex.flipY = srcTex.flipY;
      outTex.wrapS = srcTex.wrapS;
      outTex.wrapT = srcTex.wrapT;
      if (THREE.sRGBEncoding !== undefined) outTex.encoding = THREE.sRGBEncoding;
      outTex.needsUpdate = true;
      if (localCache) {
        localCache[cacheKey] = outTex;
      } else {
        this._recolorCache[cacheKey] = outTex;
        if (!Array.isArray(this._recolorCacheKeys)) this._recolorCacheKeys = [];
        this._recolorCacheKeys.push(cacheKey);
        while (this._recolorCacheKeys.length > 128) {
          const oldestKey = this._recolorCacheKeys.shift();
          if (oldestKey && oldestKey !== cacheKey && this._recolorCache[oldestKey]) {
            const oldTex = this._recolorCache[oldestKey];
            if (oldTex) {
              if (typeof this.disposeTextureResource === "function") {
                this.disposeTextureResource(oldTex);
              } else if (typeof oldTex.dispose === "function") {
                try { oldTex.dispose(); } catch (e) { }
              }
            }
            delete this._recolorCache[oldestKey];
          }
        }
      }
      return outTex;
    } catch (e) {
      return srcTex;
    }
  },

  attachVrmPersonaAccessories: function (bones, personaName, isVrm0) {
    // Slim cel-shaded anime signature accents ONLY (sleek metallic silver glasses for 小澄,
    // contoured sunset-orange cloth headband for 晨晨) — ZERO blobby spheres or plastic boxes!
    if (!bones || !bones.head || !personaName || typeof THREE === "undefined" || typeof THREE.Group !== "function") {
      return null;
    }
    const style = VRM_PERSONA_STYLING[personaName];
    if (!style || !style.vrmAcc) return null;
    const zSign = isVrm0 ? -1 : 1;
    const gradMap = (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.getToonGradientMap === "function")
      ? stage3dAnime.getToonGradientMap()
      : null;
    const makeToon = function (hex, opts) {
      const o = opts || {};
      if (typeof THREE.MeshToonMaterial === "function") {
        const m = new THREE.MeshToonMaterial({
          color: hex,
          gradientMap: gradMap,
          transparent: Boolean(o.transparent),
          opacity: o.opacity !== undefined ? o.opacity : 1.0,
          side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide
        });
        return m;
      }
      return new THREE.MeshBasicMaterial({
        color: hex,
        transparent: Boolean(o.transparent),
        opacity: o.opacity !== undefined ? o.opacity : 1.0
      });
    };

    if (style.vrmAcc === "glasses") {
      const g = new THREE.Group();
      g.name = "vrm_acc_glasses";
      const frameMat = makeToon(0x475569);
      const lensMat = makeToon(0xdcebf7, { transparent: true, opacity: 0.18, doubleSide: true });
      const ey = 0.092;
      const ez = 0.118 * zSign;
      const t = 0.0042;
      const rw = 0.044;
      const rh = 0.024;
      const makeRectRim = function (cx) {
        const rim = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(rw, t, t), frameMat);
        top.position.set(cx, ey + rh * 0.5, ez);
        const bot = new THREE.Mesh(new THREE.BoxGeometry(rw, t, t), frameMat);
        bot.position.set(cx, ey - rh * 0.5, ez);
        const inn = new THREE.Mesh(new THREE.BoxGeometry(t, rh + t, t), frameMat);
        inn.position.set(cx - (cx > 0 ? rw * 0.5 : -rw * 0.5), ey, ez);
        const out = new THREE.Mesh(new THREE.BoxGeometry(t, rh + t, t), frameMat);
        out.position.set(cx + (cx > 0 ? rw * 0.5 : -rw * 0.5), ey, ez);
        const lens = new THREE.Mesh(new THREE.PlaneGeometry(rw - t, rh - t), lensMat);
        lens.position.set(cx, ey, ez);
        if (isVrm0) lens.rotation.y = Math.PI;
        rim.add(top, bot, inn, out, lens);
        return rim;
      };
      g.add(makeRectRim(-0.032), makeRectRim(0.032));
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, t, t), frameMat);
      bridge.position.set(0, ey + 0.004, ez);
      g.add(bridge);
      // Slim temple arms tucking cleanly to the sides of the head
      [-1, 1].forEach(function (side) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(t, t, 0.105), frameMat);
        arm.position.set(side * 0.056, ey + 0.004, ez - 0.052 * zSign);
        arm.rotation.y = side * 0.08 * zSign;
        g.add(arm);
      });
      bones.head.add(g);
      return { group: g, accMats: { frameMat: frameMat, lensMat: lensMat } };
    }

    if (style.vrmAcc === "headband") {
      const g = new THREE.Group();
      g.name = "vrm_acc_headband";
      const bandMat = makeToon(0xe66a24, { doubleSide: true });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.112, 0.026, 28, 1, true), bandMat);
      band.position.set(0, 0.142, 0.004 * zSign);
      band.scale.set(0.96, 1.0, 1.04);
      band.rotation.x = -0.18 * zSign;
      g.add(band);
      bones.head.add(g);
      return { group: g, accMats: { bandMat: bandMat } };
    }

    return null;
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
          const assoc = (gltf && gltf.parser && gltf.parser.associations && typeof gltf.parser.associations.get === "function")
            ? (gltf.parser.associations.get(obj) || (obj.parent ? gltf.parser.associations.get(obj.parent) : null))
            : null;
          let mIdx = null;
          if (assoc && typeof assoc.meshes === "number") mIdx = assoc.meshes;
          else if (assoc && assoc.type === "meshes" && typeof assoc.index === "number") mIdx = assoc.index;
          if (mIdx !== null) {
            if (!meshByIdx[mIdx]) meshByIdx[mIdx] = [];
            meshByIdx[mIdx].push(obj);
          }
        }
      });
    }
    // Fallback for Three.js r128 GLTFLoader multi-primitive VRM 0.x groups where associations only track nodes: map mesh index by glTF mesh name or node.mesh!
    const jsonForMap = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    if (jsonForMap && Array.isArray(jsonForMap.meshes) && meshes.length) {
      const nodeMeshByName = {};
      if (Array.isArray(jsonForMap.nodes)) {
        jsonForMap.nodes.forEach(function (nd) {
          if (nd && nd.name && typeof nd.mesh === "number") nodeMeshByName[nd.name] = nd.mesh;
        });
      }
      jsonForMap.meshes.forEach(function (gm, gi) {
        if (gm && gm.name && nodeMeshByName[gm.name] === undefined) nodeMeshByName[gm.name] = gi;
      });
      meshes.forEach(function (obj) {
        const ownName = String(obj.name || "");
        const parName = String((obj.parent && obj.parent.name) || "");
        const baseOwn = ownName.replace(/_\d+$/, "");
        let gi = null;
        if (nodeMeshByName[parName] !== undefined) gi = nodeMeshByName[parName];
        else if (nodeMeshByName[ownName] !== undefined) gi = nodeMeshByName[ownName];
        else if (nodeMeshByName[baseOwn] !== undefined) gi = nodeMeshByName[baseOwn];
        if (gi !== null) {
          if (!meshByIdx[gi]) meshByIdx[gi] = [];
          if (meshByIdx[gi].indexOf(obj) === -1) meshByIdx[gi].push(obj);
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
        const pKey = String(grp.presetName || "").toLowerCase();
        const nKey = String(grp.name || "").toLowerCase();
        const bucket = map0[pKey] || map0[nKey];
        if (!bucket || !Array.isArray(grp.binds)) return;
        grp.binds.forEach(function (b) {
          const targets = meshByIdx[b.mesh];
          const wVal = (b.weight !== undefined ? b.weight : 100) / 100;
          if (Array.isArray(targets)) {
            targets.forEach(function (tm) { pushBinding(bucket, tm, b.index, wVal); });
          } else if (targets) {
            pushBinding(bucket, targets, b.index, wVal);
          }
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

    // 3. Direct morphTargetDictionary name fallback (supports VRoid prefixed names like Face.M_F00_000_00_Fcl_MTH_A!)
    const dictRules = {
      blink: /(?:^|_)(blink|eye_close|eyes_closed|fcl_eye_close)$/i,
      blink_l: /(?:^|_)(blink_l|blinkleft|fcl_eye_close_l)$/i,
      blink_r: /(?:^|_)(blink_r|blinkright|fcl_eye_close_r)$/i,
      aa: /(?:^|_)(a|aa|mouth_a|vrc\.v_aa|fcl_mth_a)$/i,
      ih: /(?:^|_)(i|ih|mouth_i|vrc\.v_ih|fcl_mth_i)$/i,
      ou: /(?:^|_)(u|ou|mouth_u|vrc\.v_ou|fcl_mth_u)$/i,
      ee: /(?:^|_)(e|ee|mouth_e|vrc\.v_ee|fcl_mth_e)$/i,
      oh: /(?:^|_)(o|oh|mouth_o|vrc\.v_oh|fcl_mth_o)$/i,
      happy: /(?:^|_)(joy|happy|smile|fcl_all_joy|fcl_eye_joy)$/i,
      fun: /(?:^|_)(fun|relaxed|smirk|fcl_all_fun)$/i,
      angry: /(?:^|_)(angry|mad|fcl_all_angry)$/i,
      sorrow: /(?:^|_)(sorrow|sad|fcl_all_sorrow)$/i,
      surprised: /(?:^|_)(surprised|oh_face|shock|fcl_all_surprised)$/i
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
    const baseA = alpha !== undefined ? alpha : 0.16;
    const dt60 = clamp(Number(this._curDt60) || 1, 0.05, 3.0);
    const a = typeof dampFactor3D === "function" ? dampFactor3D(baseA, dt60) : baseA;
    if (typeof THREE.Quaternion === "function" && meta.obj.quaternion && typeof meta.obj.quaternion.slerp === "function") {
      const sc = this.ensureScratch();
      const qDelta = this.makeModelEulerDelta(rx, ry, rz, order || "YXZ", sc ? sc.qDelta : null);
      const qTarget = this.computeModelSpaceBoneQuat(meta, qDelta, sc ? sc.qTarget : null);
      if (qTarget) meta.obj.quaternion.slerp(qTarget, a);
    } else if (meta.obj.rotation) {
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
  getSeatedSkirtTargetAngles: function (sb, sway, outObj) {
    const out = outObj || { rx: 0, ry: 0, rz: 0 };
    out.rx = 0; out.ry = 0; out.rz = 0;
    if (!sb) return out;
    const d = Math.min(sb.depth || 0, 2);
    const zone = sb.skirtZone || "front";
    const sgn = sb.skirtSideSign || 0;
    const sw = (typeof sway === "number" ? sway : 0) * (d === 0 ? 0.5 : 1.0);
    if (sb.skirtInheritsLeg) {
      // Parent UpperLeg is already bent -1.42 rad (-81 deg) forward along thigh; relax DOWNWARD (+rx) & tuck center inward!
      if (zone === "front") {
        out.rx = (d === 0 ? 0.24 : (d === 1 ? 0.42 : 0.26)) + sw;
        out.rz = d === 0 ? (-sgn * 0.05) : 0;
        return out;
      }
      if (zone === "back") {
        out.rx = (d === 0 ? 0.58 : (d === 1 ? 0.38 : 0.22)) + sw * 0.35;
        return out;
      }
      // side panel parented to UpperLeg (Gen-A VRMs: player, xiaoyun, qingming)
      out.rx = (d === 0 ? 0.72 : (d === 1 ? 0.40 : 0.22)) + sw * 0.5;
      out.rz = d === 0 ? (sgn * 0.09) : (d === 1 ? (sgn * 0.04) : 0);
      return out;
    }
    // Hips-parented skirt panels (Gen-B VRMs: nuannuan/xinger Side panels) start hanging straight down (0 rad)
    if (zone === "side") {
      out.rx = (d === 0 ? -0.16 : (d === 1 ? 0.10 : 0.06)) + sw * 0.6;
      out.rz = d === 0 ? (sgn * 0.18) : (d === 1 ? (sgn * 0.06) : 0);
      return out;
    }
    if (zone === "back") {
      out.rx = (d === 0 ? 0.12 : (d === 1 ? 0.08 : 0.04)) + sw * 0.4;
      return out;
    }
    // Hips-parented front panel fallback
    out.rx = (d === 0 ? -0.58 : (d === 1 ? 0.34 : 0.22)) + sw;
    return out;
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
    this.compactUnusedMorphTargets(rawScene, morphs);
    const springBones = this.resolveSpringBones(gltf, boneRes.pickByIdxOrName);

    // CRITICAL STEP 1: Scale model in STANDING T-Pose BEFORE bending legs so seated pose never inflates avatar into a 2.9m giant!
    let modelScale = 1.0;
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
        modelScale = sc;
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
    // v10.0 Mount precision persona 3D accessories (glasses, headband, star/yuzu clips, jade hairpin, gavel brooch, tea_host) in T-pose!
    let accMats = null;
    if (o.personaName && typeof this.attachVrmPersonaAccessories === "function") {
      const accResult = this.attachVrmPersonaAccessories(bones, o.personaName, isVrm0);
      if (accResult && accResult.accMats) accMats = accResult.accMats;
    }

    // CRITICAL STEP 3: Pose legs & arms using exact anatomical Model-Space quaternions (zero gimbal flip or VRM 1.0 twist!)
    const hasSkirt = springBones.some(function (sb) { return Boolean(sb && sb.isSkirt); });
    if (mode === "seated") {
      // Skirted avatars sit gracefully with knees CLOSED TOGETHER so skirts stay draped & modest; trousered avatars sit relaxed
      if (hasSkirt) {
        this.setBoneModelDeltaImmediate(boneMeta.leftUpperLeg, -1.42, -0.02, 0.026, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.rightUpperLeg, -1.42, 0.02, -0.026, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.leftLowerLeg, 1.44, 0, 0, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.rightLowerLeg, 1.44, 0, 0, "YXZ");
      } else {
        this.setBoneModelDeltaImmediate(boneMeta.leftUpperLeg, -1.40, 0.06, 0, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.rightUpperLeg, -1.40, -0.06, 0, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.leftLowerLeg, 1.42, 0, 0, "YXZ");
        this.setBoneModelDeltaImmediate(boneMeta.rightLowerLeg, 1.42, 0, 0, "YXZ");
      }

      // Arms drop DOWN & OUT from T-pose (left: Z = -drop, right: Z = +drop) and angle slightly FORWARD (X = -fwd), elbows bend FORWARD around Y (left: Y = -bend, right: Y = +bend)
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperArm, -0.26, 0, -1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperArm, -0.26, 0, 1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerArm, 0, -1.02, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerArm, 0, 1.02, 0, "YXZ");

      // Anatomically drape skirt spring-bones DOWN over seated thighs & knees (compensating for UpperLeg -1.40 rad!)
      for (let si = 0; si < springBones.length; si++) {
        if (springBones[si].isSkirt && springBones[si].quatMeta) {
          const skAng = this.getSeatedSkirtTargetAngles(springBones[si], 0, this._skirtAngScratch);
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
    const keepRecolorSlots = Boolean(o.keepRecolorSlots);
    const tintMats = [];
    const celMats = [];
    const recolorSlots = [];
    const canCelUpgrade = Boolean(
      typeof stage3dAnime !== "undefined" &&
      typeof stage3dAnime.upgradeVrmMaterialToCel === "function" &&
      !(typeof stage3d !== "undefined" && stage3d.isSoftwareRenderer)
    );
    const selfLoader = this;
    const texCfg = this.getAdaptiveVrmTexSettings();
    const isLiteShadowGpu = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
    const avatarTexCache = {};
    const origTexturesSeen = new Set();
    const finalTexturesUsed = new Set();
    const pinnedRecolorTexs = new Set();
    const disposableMats = new Set();
    const finalMatsUsed = new Set();
    if (typeof rawScene.traverse === "function") {
      rawScene.traverse(function (child) {
        if (!child || !child.isMesh) return;
        const isArr = Array.isArray(child.material);
        const origMats = isArr ? child.material : [child.material];
        const nextMats = [];
        let allUnlitBasic = origMats.length > 0;
        let hasOutlineOnly = origMats.length > 0;
        let allTransparentOverlay = origMats.length > 0;
        const childName = String(child.name || "");
        let isFaceMesh = /face/i.test(childName);
        const isMinorOverlayMesh = /eye|brow|lash|mouth|blush|tooth|tongue|tear/i.test(childName);
        const hasSkin = Boolean(child.isSkinnedMesh);
        const hasMorph = Boolean(child.morphTargetInfluences && child.morphTargetInfluences.length);

        origMats.forEach(function (origM) {
          let m = origM;
          if (!m) {
            nextMats.push(m);
            return;
          }
          if (m.map) origTexturesSeen.add(m.map);
          if (m.normalMap) origTexturesSeen.add(m.normalMap);
          const mName = String(m.name || "");
          const tagStr = mName + " " + childName;
          const isOutline = (mName && /outline/i.test(mName)) || m.side === THREE.BackSide;
          const keepUnlitEye = /eyewhite|eyehighlight|eyeextra/i.test(tagStr);
          const isFaceMat = /face|skin|brow|mouth|eyeline|eyelash|iris/i.test(tagStr);
          const isHairMat = /hair/i.test(tagStr);
          const isBottomsMat = /bottoms/i.test(tagStr);
          const isTopsMat = /tops|cloth/i.test(tagStr) && !/bottoms|shoes|accessoryneck/i.test(tagStr);
          const isNeckMat = /accessoryneck/i.test(tagStr);
          const isIrisMat = /eyeiris|iris/i.test(tagStr);
          if (isFaceMat) isFaceMesh = true;
          if (!isOutline) hasOutlineOnly = false;
          if (!m.transparent && !isOutline && !keepUnlitEye) allTransparentOverlay = false;
          if (m.transparent && !m.alphaTest) m.alphaTest = 0.35;
          if (m.map && THREE.sRGBEncoding !== undefined) m.map.encoding = THREE.sRGBEncoding;

          const origMapBeforeRecolor = m.map || null;
          let recolorSlotKey = null;
          if (!isOutline && origMapBeforeRecolor) {
            if (isHairMat) recolorSlotKey = "hair";
            else if (isTopsMat) recolorSlotKey = "tops";
            else if (isNeckMat) recolorSlotKey = "neck";
            else if (isBottomsMat) recolorSlotKey = "bottoms";
            else if (isIrisMat) recolorSlotKey = "iris";
          }

          let wasCloned = false;
          let mapRecolored = false;
          const ensureClonedMat = function () {
            if (!wasCloned && m.clone) {
              disposableMats.add(m);
              m = m.clone();
              wasCloned = true;
            }
          };

          // Modesty Safety Shorts (安全褲): erase VRoid default white panties on ALL female/skirted Body_00_SKIN textures!
          const isFemaleBodySkin = /body.*skin/i.test(mName) && (/^f\d{2}/i.test(mName) || hasSkirt);
          if (isFemaleBodySkin && !isOutline && m.map) {
            ensureClonedMat();
            m.map = selfLoader.paintVrmModestyShortsMap(m.map, "#1e2330", avatarTexCache);
            mapRecolored = true;
          }

          // Baked native VRMs already carry custom-painted multi-tone UV textures (Face, Iris, Hair, Outfit);
          // only run runtime pixel recolor for non-baked fallback models!
          if (personaStyling && !personaStyling.bakedNative && !isOutline && m.map && !isIrisMat && !isFaceMat) {
            if (isHairMat && personaStyling.hairHex) {
              ensureClonedMat();
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.hairHex, personaStyling.hairStr || 0.72, avatarTexCache, { isHair: true, maxDim: texCfg.maxDim, anisotropy: texCfg.anisotropy });
              mapRecolored = true;
            } else if (isTopsMat && personaStyling.topsHex) {
              ensureClonedMat();
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.topsHex, personaStyling.topsStr || 0.78, avatarTexCache, { maxDim: texCfg.maxDim, anisotropy: texCfg.anisotropy });
              mapRecolored = true;
            } else if (isNeckMat && personaStyling.neckHex) {
              ensureClonedMat();
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.neckHex, personaStyling.neckStr || 0.78, avatarTexCache, { maxDim: texCfg.maxDim, anisotropy: texCfg.anisotropy });
              mapRecolored = true;
            } else if (isBottomsMat && personaStyling.bottomsHex) {
              ensureClonedMat();
              m.map = selfLoader.recolorVrmTextureMap(m.map, personaStyling.bottomsHex, personaStyling.bottomsStr || 0.80, avatarTexCache, { maxDim: texCfg.maxDim, anisotropy: texCfg.anisotropy });
              mapRecolored = true;
            }
          }

          // Adaptive VRM texture resolution (2048 dGPU / 1024 iGPU / 512 eco) + anisotropy + skip mipmaps on tiny placeholders
          if (!mapRecolored && m.map) {
            const shrunk = selfLoader.downscaleVrmTextureIfNeeded(m.map, texCfg.maxDim, avatarTexCache, texCfg.anisotropy);
            if (shrunk && shrunk !== m.map) {
              ensureClonedMat();
              m.map = shrunk;
            }
          }
          if (m.normalMap) {
            const shrunkNor = selfLoader.downscaleVrmTextureIfNeeded(m.normalMap, Math.min(512, texCfg.maxDim), avatarTexCache, 1);
            if (shrunkNor && shrunkNor !== m.normalMap) {
              ensureClonedMat();
              m.normalMap = shrunkNor;
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
              morphNormals: false
            });
            if (finalMat !== m) {
              disposableMats.add(m);
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

          if (keepRecolorSlots && recolorSlotKey && origMapBeforeRecolor) {
            recolorSlots.push({ slot: recolorSlotKey, origMap: origMapBeforeRecolor, mat: finalMat });
            pinnedRecolorTexs.add(origMapBeforeRecolor);
          }
          if (!isOutline && finalMat.color && typeof finalMat.color.clone === "function") {
            tintMats.push({ mat: finalMat, baseColor: finalMat.color.clone(), isCel: Boolean(finalMat.userData && finalMat.userData.isVrmCel) });
          }
          finalMatsUsed.add(finalMat);
          if (finalMat.map) finalTexturesUsed.add(finalMat.map);
          if (finalMat.normalMap) finalTexturesUsed.add(finalMat.normalMap);
          nextMats.push(finalMat);
        });

        child.material = isArr ? nextMats : nextMats[0];
        // Cast shadow ONLY from primary opaque meshes on discrete GPUs (iGPU relies on crisp contact shadows + static pavilion shadows -> saves ~186K shadow tris!)
        child.castShadow = !isLiteShadowGpu && !hasOutlineOnly && !isFaceMesh && !isMinorOverlayMesh && !allTransparentOverlay;
        child.receiveShadow = !isFaceMesh && !allUnlitBasic;
        // True safe frustum culling for SkinnedMeshes: inflate bounding sphere to cover seated/gesturing limbs so off-screen VRMs cull cleanly in close-ups!
        if (child.geometry && typeof child.geometry.computeBoundingSphere === "function") {
          try {
            if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
            if (child.geometry.boundingSphere && typeof child.geometry.boundingSphere.radius === "number") {
              const minLocalR = 2.15 / Math.max(0.05, modelScale);
              child.geometry.boundingSphere.radius = Math.max(child.geometry.boundingSphere.radius * 2.1, minLocalR);
              child.frustumCulled = true;
            } else {
              child.frustumCulled = false;
            }
          } catch (e) {
            child.frustumCulled = false;
          }
        } else {
          child.frustumCulled = false;
        }
      });
    }
    // Immediately free replaced original materials & unreferenced ImageBitmap textures so zero GPU/RAM leaks accumulate!
    disposableMats.forEach(function (dm) {
      if (dm && !finalMatsUsed.has(dm) && typeof dm.dispose === "function") {
        try { dm.dispose(); } catch (e) { }
      }
    });
    origTexturesSeen.forEach(function (ot) {
      if (ot && !finalTexturesUsed.has(ot) && !pinnedRecolorTexs.has(ot)) {
        selfLoader.disposeTextureResource(ot);
      }
    });

    const mixer = (Array.isArray(gltf.animations) && gltf.animations.length > 0 && typeof THREE.AnimationMixer === "function")
      ? new THREE.AnimationMixer(rawScene)
      : null;

    // Parse VRM lookAt anatomical eye-bone bounds (VRoid models typically specify 7.7°–12°; cap safely inside socket!)
    let maxEyeYawRad = 0.095;
    let maxEyePitchUpRad = 0.058;
    let maxEyePitchDownRad = 0.072;
    try {
      const deg2rad = Math.PI / 180;
      if (isVrm0 && ext && ext.VRM && ext.VRM.firstPerson) {
        const fp = ext.VRM.firstPerson;
        const hIn = Number(fp.lookAtHorizontalInner && fp.lookAtHorizontalInner.yRange) || 8;
        const hOut = Number(fp.lookAtHorizontalOuter && fp.lookAtHorizontalOuter.yRange) || 10;
        const vUp = Number(fp.lookAtVerticalUp && fp.lookAtVerticalUp.yRange) || 10;
        const vDn = Number(fp.lookAtVerticalDown && fp.lookAtVerticalDown.yRange) || 10;
        maxEyeYawRad = clamp(Math.min(hIn, hOut) * deg2rad * 0.72, 0.065, 0.105);
        maxEyePitchUpRad = clamp(vUp * deg2rad * 0.45, 0.042, 0.064);
        maxEyePitchDownRad = clamp(vDn * deg2rad * 0.52, 0.050, 0.078);
      } else if (isVrm1 && ext && ext.VRMC_vrm && ext.VRMC_vrm.lookAt) {
        const la = ext.VRMC_vrm.lookAt;
        const hIn = Number(la.rangeMapHorizontalInner && la.rangeMapHorizontalInner.outputScale) || 8;
        const hOut = Number(la.rangeMapHorizontalOuter && la.rangeMapHorizontalOuter.outputScale) || 10;
        const vUp = Number(la.rangeMapVerticalUp && la.rangeMapVerticalUp.outputScale) || 10;
        const vDn = Number(la.rangeMapVerticalDown && la.rangeMapVerticalDown.outputScale) || 10;
        maxEyeYawRad = clamp(Math.min(hIn, hOut) * deg2rad * 0.72, 0.065, 0.105);
        maxEyePitchUpRad = clamp(vUp * deg2rad * 0.45, 0.042, 0.064);
        maxEyePitchDownRad = clamp(vDn * deg2rad * 0.52, 0.050, 0.078);
      }
    } catch (e) {}

    return {
      root: root,
      modelWrap: modelWrap,
      rawScene: rawScene,
      isVrm: isVrm0 || isVrm1,
      isVrm0: isVrm0,
      hasSkirt: hasSkirt,
      mode: mode,
      baseY: modelWrap.position.y,
      bones: bones,
      boneMeta: boneMeta,
      eyeLimits: {
        maxYaw: maxEyeYawRad,
        maxPitchUp: maxEyePitchUpRad,
        maxPitchDown: maxEyePitchDownRad
      },
      restRot: restRot,
      morphs: morphs,
      springBones: springBones,
      tintMats: tintMats,
      celMats: celMats,
      recolorSlots: recolorSlots,
      accMats: accMats,
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
      headInertia: 0,
      speechEnergy: 0,
      hoverStartedAt: -1,
      accuseStartedAt: -1,
      lastWordsStartedAt: -1
    };
  },

  applyMorphWeight: function (list, val) {
    if (!list || !list.length) return;
    const v = clamp(val, 0, 1);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.mesh && b.mesh.morphTargetInfluences && b.idx < b.mesh.morphTargetInfluences.length) {
        const nextV = v * (b.weight || 1.0);
        if (Math.abs((b.mesh.morphTargetInfluences[b.idx] || 0) - nextV) > 0.0005) {
          b.mesh.morphTargetInfluences[b.idx] = nextV;
        }
      }
    }
  },

  computeLivingIdleAction: function (t, seed, arch, outObj) {
    const out = outObj || { name: "", weight: 0, phase: 0 };
    const pool = (arch && Array.isArray(arch.idlePool) && arch.idlePool.length)
      ? arch.idlePool
      : ["sip_tea", "chin_rest", "look_around", "hands_clasp"];
    const slotDur = 6.2 + ((Math.abs(Math.sin(seed * 3.17)) * 2.4));
    const shifted = Math.max(0, t + seed * 4.35);
    const slotIdx = Math.floor(shifted / slotDur);
    const u = (shifted % slotDur) / slotDur;
    // Active window sits cleanly across u in [0.10, 0.82] with smooth cubic ramp-in & ramp-out!
    let w = 0;
    if (u > 0.10 && u < 0.82) {
      if (u < 0.24) {
        const k = (u - 0.10) / 0.14;
        w = k * k * (3 - 2 * k);
      } else if (u > 0.66) {
        const k = (0.82 - u) / 0.16;
        w = k * k * (3 - 2 * k);
      } else {
        w = 1.0;
      }
    }
    const pick = Math.abs(slotIdx * 3 + Math.round(seed * 5)) % pool.length;
    out.name = pool[pick];
    out.weight = w;
    out.phase = u;
    return out;
  },

  updateVrmAvatar: function (inst, opts) {
    if (!inst) return;
    const o = opts || {};
    const t = o.tSec || 0;
    const dt60 = clamp(Number(o.dt60) || 1, 0.05, 3.0);
    this._curDt60 = dt60;
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
      const deadDim = aliveFlag ? (talkBoostFlag ? 1.08 : 1.0) : 0.34;
      for (let mi = 0; mi < inst.tintMats.length; mi++) {
        const entry = inst.tintMats[mi];
        if (entry.mat && entry.mat.color && entry.baseColor) {
          const mulR = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.08 : 1.0) : 0.35) : (moodTint.r * deadDim);
          const mulG = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.06 : 1.0) : 0.36) : (moodTint.g * deadDim);
          const mulB = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.04 : 1.0) : 0.39) : (moodTint.b * deadDim);
          entry.mat.color.r = Math.min(1.0, entry.baseColor.r * mulR);
          entry.mat.color.g = Math.min(1.0, entry.baseColor.g * mulG);
          entry.mat.color.b = Math.min(1.0, entry.baseColor.b * mulB);
        }
      }
      if (inst.celMats && inst.celMats.length) {
        const rimHex = o.moodKey === "night"
          ? (talkBoostFlag ? 0xfde68a : 0x93c5fd)
          : (o.moodKey === "vote" ? 0xfdba74 : (o.moodKey === "day" ? 0xfff8dc : 0xffe6b3));
        const shadowHexBody = o.moodKey === "night"
          ? 0x8c96cc
          : (o.moodKey === "vote" ? 0xdab8b4 : (o.moodKey === "day" ? 0xc8ccf0 : 0xc0c4e6));
        const shadowHexFace = o.moodKey === "night"
          ? 0xc8b4c4
          : (o.moodKey === "vote" ? 0xf4cec2 : (o.moodKey === "day" ? 0xf6d8cc : 0xf2d0c4));
        const warmB = o.moodKey === "night" ? 0.11 : (o.moodKey === "day" ? 0.04 : 0.08);
        for (let ci = 0; ci < inst.celMats.length; ci++) {
          const cm = inst.celMats[ci];
          const u = cm.uniforms;
          if (!u) continue;
          if (u.uVrmRimColor && u.uVrmRimColor.value && typeof u.uVrmRimColor.value.setHex === "function") {
            u.uVrmRimColor.value.setHex(rimHex);
            if (typeof u.uVrmRimColor.value.convertSRGBToLinear === "function") u.uVrmRimColor.value.convertSRGBToLinear();
          }
          if (u.uVrmShadowTint && u.uVrmShadowTint.value && typeof u.uVrmShadowTint.value.setHex === "function") {
            u.uVrmShadowTint.value.setHex(cm.isFace ? shadowHexFace : shadowHexBody);
            if (typeof u.uVrmShadowTint.value.convertSRGBToLinear === "function") u.uVrmShadowTint.value.convertSRGBToLinear();
          }
          const baseRim = cm.isFace ? 0.08 : (cm.isHair ? 0.18 : 0.14);
          u.uVrmRimStrength.value = aliveFlag ? (talkBoostFlag ? baseRim * 1.32 : baseRim) : 0.03;
          u.uVrmShadowLift.value = aliveFlag ? (cm.isFace ? 0.44 : 0.40) : 0.28;
          u.uVrmWarmBounce.value = aliveFlag ? warmB : 0.02;
        }
      }
    }

    // 1. Multi-Vowel Lip-Sync (a/i/u/e/o) + 12 Full Facial Expressions + Organic Asynchronous Blinking & Situational Modulation
    const sitState = o.sitState || "standard";
    const isUnderFire = sitState === "under_fire";
    const isLastWordsMode = sitState === "last_words";
    const blinkBasePeriod = 3.25 + ((Math.abs(Math.sin(seed * 4.71 + 0.3)) * 2.15));
    const blinkPeriod = isUnderFire ? (blinkBasePeriod * 0.62) : blinkBasePeriod;
    const blinkPhase = (t + seed * 1.37) % blinkPeriod;
    const isPrimaryBlink = blinkPhase > (blinkPeriod - 0.14);
    const hasDoubleBlink = Math.sin(Math.floor((t + seed * 1.37) / blinkPeriod) * 3.1 + seed) > 0.62;
    const isSecondBlink = hasDoubleBlink && blinkPhase > 0.14 && blinkPhase < 0.26;
    const isBlinking = !sleeping && !o.isLastWordsEnd && emotion !== "shock" && emotion !== "nervous" && (isPrimaryBlink || isSecondBlink);
    const isPlayfulWink = !sleeping && !isLastWordsMode && (emotion === "happy" || emotion === "laugh") && ((t + seed * 1.9) % 5.2 > 4.92);
    const happyLidGuard = clamp(1.0 - (inst.happyAmt || 0) * 0.72, 0.22, 1.0);
    const targetBlink = (sleeping || o.isLastWordsEnd) ? 1.0 : (isBlinking ? happyLidGuard : 0.0);
    const targetWinkL = isPlayfulWink ? (0.82 * happyLidGuard) : 0.0;

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
    const targetAngry = (emotion === "angry" || emotion === "suspect" || o.isPointingAccuse) ? 0.78 : (isUnderFire ? 0.48 : 0.0);
    const targetSorrow = (o.alive === false || o.isLastWordsEnd) ? 0.55 : ((emotion === "sorrow" || emotion === "sad" || isLastWordsMode) ? 0.62 : (emotion === "nervous" ? 0.25 : 0.0));
    const targetSurprised = (emotion === "shock" || emotion === "nervous" || o.act === "gasp_react") ? 0.80 : 0.0;

    const d45 = typeof dampFactor3D === "function" ? dampFactor3D(0.45, dt60) : 0.45;
    const d42 = typeof dampFactor3D === "function" ? dampFactor3D(0.42, dt60) : 0.42;
    const d18 = typeof dampFactor3D === "function" ? dampFactor3D(0.18, dt60) : 0.18;
    const d20 = typeof dampFactor3D === "function" ? dampFactor3D(0.20, dt60) : 0.20;
    const d22 = typeof dampFactor3D === "function" ? dampFactor3D(0.22, dt60) : 0.22;

    inst.blinkAmt += (targetBlink - inst.blinkAmt) * d45;
    inst.winkLAmt += (targetWinkL - inst.winkLAmt) * d45;
    inst.mouthAmt += (tA - inst.mouthAmt) * d42;
    if (!inst.vowelAmts) inst.vowelAmts = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    inst.vowelAmts.aa += (tA - inst.vowelAmts.aa) * d45;
    inst.vowelAmts.ih += (tI - inst.vowelAmts.ih) * d45;
    inst.vowelAmts.ou += (tU - inst.vowelAmts.ou) * d45;
    inst.vowelAmts.ee += (tE - inst.vowelAmts.ee) * d45;
    inst.vowelAmts.oh += (tO - inst.vowelAmts.oh) * d45;

    inst.happyAmt += (targetHappy - inst.happyAmt) * d18;
    inst.funAmt = (inst.funAmt || 0) + (targetFun - (inst.funAmt || 0)) * d18;
    inst.angryAmt = (inst.angryAmt || 0) + (targetAngry - (inst.angryAmt || 0)) * d20;
    inst.sorrowAmt = (inst.sorrowAmt || 0) + (targetSorrow - (inst.sorrowAmt || 0)) * d18;
    inst.surprisedAmt += (targetSurprised - inst.surprisedAmt) * d22;

    this.applyMorphWeight(inst.morphs.blink, inst.blinkAmt);
    if (inst.winkLAmt > 0.005) {
      this.applyMorphWeight(inst.morphs.blink_l, inst.winkLAmt);
    } else if (inst.morphs.blink_l && inst.morphs.blink_l.length) {
      this.applyMorphWeight(inst.morphs.blink_l, 0);
    }
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

    // 2. Unified Living Full-Body Model-Space Quaternion Rig Animation
    //    (Asymmetric Human Breathing + Smooth Speech-Energy Phrase Choreography + Hierarchical Follow-Through Damping!)
    const bm = inst.boneMeta || {};
    const gStyle = arch.gestureStyle || "balanced";
    const isFloorHolder = Boolean(o.isFloorHolder) && !sleeping && o.alive !== false;
    const isActiveSpeaker = Boolean(talking || isFloorHolder);

    // Track smoothed speech energy envelope (rises organically on speech, relaxes gracefully during punctuation pauses!)
    const rawSpeechDrive = talking
      ? clamp(0.34 + clamp(o.mouthAmp || 0.42, 0, 1) * 0.82, 0.28, 1.0)
      : (isFloorHolder ? 0.18 : 0.0);
    const speechRate = rawSpeechDrive > (inst.speechEnergy || 0) ? 0.14 : 0.055;
    const speechEnvAlpha = typeof dampFactor3D === "function" ? dampFactor3D(speechRate, dt60) : speechRate;
    inst.speechEnergy = (inst.speechEnergy || 0) + (rawSpeechDrive - (inst.speechEnergy || 0)) * speechEnvAlpha;
    const speechEnv = clamp(inst.speechEnergy, 0, 1);

    // Track one-shot gesture onset timestamps so hover wave & accusation thrust execute naturally instead of looping robotically
    if (o.isHovered && !sleeping) {
      if (typeof inst.hoverStartedAt !== "number" || inst.hoverStartedAt < 0) inst.hoverStartedAt = t;
    } else {
      inst.hoverStartedAt = -1;
    }
    if (o.isPointingAccuse && !sleeping) {
      if (typeof inst.accuseStartedAt !== "number" || inst.accuseStartedAt < 0) inst.accuseStartedAt = t;
    } else {
      inst.accuseStartedAt = -1;
    }
    if (isLastWordsMode && !sleeping) {
      if (typeof inst.lastWordsStartedAt !== "number" || inst.lastWordsStartedAt < 0) inst.lastWordsStartedAt = t;
    } else {
      inst.lastWordsStartedAt = -1;
    }

    const useLivingIdle = Boolean(
      !sleeping && !isActiveSpeaker && !o.isHovered && !o.isVoting && !o.isAccusing &&
      !o.isPointingAccuse && !o.isBeingVouched && !sweating && !o.act && inst.mode === "seated"
    );
    const idleAct = useLivingIdle
      ? this.computeLivingIdleAction(t, seed, arch, this._idleActScratch)
      : (this._idleActScratch.name = "", this._idleActScratch.weight = 0, this._idleActScratch.phase = 0, this._idleActScratch);
    const iw = idleAct.weight;
    const iname = idleAct.name;

    // Smoothly cross-faded 3.8–5.2s conversational gesture phrases (zero 2s hard pose snapping, zero metronome!)
    const tEnergy = arch.talkArmAmp !== undefined ? arch.talkArmAmp : 1.06;
    const phraseDur = clamp(4.55 - (tEnergy - 1.0) * 1.1 + ((Math.abs(Math.sin(seed * 2.13)) - 0.5) * 0.65), 3.8, 5.2);
    const phraseRaw = Math.max(0, (t + seed * 1.17) / phraseDur);
    const phraseIdx = Math.floor(phraseRaw) % 4;
    const nextPhraseIdx = (phraseIdx + 1) % 4;
    const phraseU = phraseRaw - Math.floor(phraseRaw);
    const xfadeK = phraseU > 0.62 ? ((phraseU - 0.62) / 0.38) : 0;
    const phraseXfade = xfadeK * xfadeK * (3 - 2 * xfadeK);
    const phraseAccent = Math.sin(clamp(phraseU / 0.72, 0, 1) * Math.PI) * speechEnv;
    const talkAmp = clamp(o.mouthAmp || 0.42, 0.16, 1.0);

    const lookAroundYaw = (iname === "look_around" && iw > 0.01)
      ? Math.sin(idleAct.phase * Math.PI * 1.8 + seed) * 0.34 * iw
      : 0;
    const stretchYaw = (iname === "stretch_roll" && iw > 0.01)
      ? Math.sin(idleAct.phase * Math.PI * 1.6) * 0.22 * iw
      : 0;
    const lwSweepYaw = (isLastWordsMode && !o.isLastWordsEnd) ? Math.sin(t * 0.42 + seed) * 0.28 : 0;
    const lwPitch = isLastWordsMode ? (o.isLastWordsEnd ? 0.25 : 0.045) : 0;
    const yawNow = clamp((o.headYaw || 0) + lookAroundYaw + stretchYaw + lwSweepYaw, -0.86, 0.86);
    const sipPitch = (iname === "sip_tea" && iw > 0.01) ? (-0.08 * iw) : 0;
    const glassesPitch = (iname === "glasses_adjust" && iw > 0.01) ? (-0.05 * iw) : 0;
    const pitchNow = clamp((o.headPitch || 0) + sipPitch + glassesPitch + lwPitch, -0.42, 0.54);

    // Organic speech-accented head motion (replaces metronome 5.6 rad/s bobblehead!)
    const listenNod = (!sleeping && !isActiveSpeaker && o.isListeningAgree)
      ? Math.max(0, Math.sin(t * 1.85 + seed)) * 0.075
      : 0;
    const talkHeadAccent = (talking && !isLastWordsMode)
      ? (phraseAccent * 0.042 + Math.sin(t * 1.95 + seed) * 0.016 * speechEnv)
      : (isLastWordsMode && !o.isLastWordsEnd
        ? (Math.sin(t * 0.95 + seed) * 0.018 * speechEnv)
        : (isFloorHolder ? Math.sin(t * 1.15 + seed) * 0.016 : 0));
    const nodOffset = (emotion === "happy" || o.isBeingVouched)
      ? Math.sin(t * 2.4 + seed) * 0.055
      : (listenNod + talkHeadAccent);
    const accusedShake = (!sleeping && o.isAccusing) ? Math.sin(t * 3.6 + seed) * 0.055 : 0;
    const shakeOffset = accusedShake || ((emotion === "nervous" || sweating) ? Math.sin(t * 1.55 + seed) * 0.022 : 0);
    const curiousRoll = (!sleeping && !isActiveSpeaker && o.isListeningCurious) ? ((seed % 2 > 1 ? 1 : -1) * 0.078) : 0;
    const idleActRoll = (iname === "chin_rest")
      ? (((seed % 2 > 1 ? 1 : -1) * 0.085) * iw)
      : (iname === "playful_sway" ? Math.sin(t * 1.9 + seed) * 0.065 * iw : (iname === "stretch_roll" ? Math.cos(idleAct.phase * Math.PI * 2) * 0.065 * iw : 0));
    const talkRoll = (isActiveSpeaker && !isLastWordsMode)
      ? Math.sin(t * 1.15 + seed * 1.3) * (gStyle === "expressive" ? 0.062 : (gStyle === "energetic" ? 0.050 : (gStyle === "classical" ? 0.024 : 0.040))) * (0.35 + speechEnv * 0.65)
      : (isLastWordsMode ? Math.sin(t * 0.55 + seed) * 0.022 : 0);
    const idleRoll = sleeping ? 0 : (arch.headTiltBias + curiousRoll + idleActRoll + talkRoll + Math.sin(t * 0.72 + seed) * arch.headRollAmp);

    // Organic Gaze Chain: Eyes lead -> Head (52%) -> Neck (26%) -> Chest (14%) -> Spine (8%)
    const hasNeck = Boolean(bm.neck);
    const hasChest = Boolean(bm.chest);
    const headYawFrac = hasNeck ? 0.52 : 0.74;
    const neckYawFrac = hasNeck ? 0.26 : 0;
    const chestYawFrac = hasChest ? 0.14 : 0;
    const spineYawFrac = hasChest ? 0.08 : 0.12;
    const headPitchFrac = hasNeck ? 0.68 : 1.0;
    const neckPitchFrac = hasNeck ? 0.32 : 0;

    // Asymmetric natural human breathing (42% smooth inhale rise, 58% relaxed exhale settle!)
    const twoPi = Math.PI * 2;
    const bPhase = ((t * arch.breathFreq + seed) % twoPi + twoPi) % twoPi;
    const bNorm = bPhase / twoPi;
    const bCurve = bNorm < 0.42
      ? (0.5 - 0.5 * Math.cos((bNorm / 0.42) * Math.PI))
      : (0.5 + 0.5 * Math.cos(((bNorm - 0.42) / 0.58) * Math.PI));
    const cPhase = ((t * arch.breathFreq + seed - 0.72) % twoPi + twoPi) % twoPi;
    const cNorm = cPhase / twoPi;
    const cCurve = cNorm < 0.42
      ? (0.5 - 0.5 * Math.cos((cNorm / 0.42) * Math.PI))
      : (0.5 + 0.5 * Math.cos(((cNorm - 0.42) / 0.58) * Math.PI));

    const idleLeanDelta = (iname === "sip_tea" || iname === "table_tap" || iname === "chin_rest" || iname === "note_jot" || iname === "cup_cradle")
      ? (0.058 * iw)
      : ((iname === "arms_fold" || iname === "stretch_roll" || iname === "lean_back") ? (-0.062 * iw) : 0);
    const starLookPitch = (!sleeping && !isActiveSpeaker && (iname === "star_gaze" || (arch.starGaze && Math.sin(t * 0.35 + seed) > 0.74)))
      ? (-0.15 * (iname === "star_gaze" ? iw : 0.60))
      : 0;
    const prepBreathLift = o.isPrepping ? 0.036 : 0;
    const underFireLeanAdd = isUnderFire ? 0.072 : 0;
    const talkTorsoLean = isLastWordsMode
      ? (o.isLastWordsEnd ? 0.165 : (0.042 + speechEnv * 0.025))
      : (talking
        ? ((gStyle === "energetic" ? 0.098 : (gStyle === "classical" ? 0.045 : 0.076)) + phraseAccent * 0.032 * tEnergy + underFireLeanAdd)
        : (isFloorHolder ? (0.056 + underFireLeanAdd * 0.5) : 0));
    const baseLean = o.isLastWordsEnd
      ? 0.165
      : (o.isPointingAccuse
        ? (0.118 + underFireLeanAdd * 0.35)
        : (o.isAccusing
          ? -0.088
          : (o.act === "welcome_bow"
            ? 0.125
            : (o.speechAct === "claim_role"
              ? -0.016
              : (isActiveSpeaker
                ? talkTorsoLean
                : (sleeping ? 0.062 : (arch.spineLean + idleLeanDelta + (o.isListeningAgree ? 0.035 : 0))))))));
    const breathWave = (bCurve * 2 - 1) * arch.breathAmp + prepBreathLift;
    const chestBreath = (cCurve * 2 - 1) * (arch.breathAmp * 1.15);
    // Eliminate rotating-fan talkTorsoYaw; keep only gentle conversational weight shift!
    const talkTorsoYaw = (talking && !isLastWordsMode) ? Math.sin(t * 0.62 + seed) * 0.026 * speechEnv : 0;
    const weightShiftRoll = sleeping
      ? 0
      : (Math.sin(t * 0.44 + seed * 1.9) * (inst.mode === "standing" ? 0.026 : 0.016) +
        (iname === "playful_sway" ? Math.sin(t * 1.85 + seed) * 0.042 * iw : 0) +
        (talking && !isLastWordsMode ? Math.cos(t * 0.88 + seed) * 0.022 * speechEnv : 0));

    // Hierarchical Anatomical Follow-Through Cascade (slerpBoneModelDelta applies dampFactor3D(k, dt60)!):
    // Eyes (0.22) -> Head (0.14) -> Neck (0.11) -> Chest (0.08) -> Spine (0.065) -> Hips (0.06)
    if (bm.hips && !sleeping) {
      const hipRoll = inst.mode === "standing"
        ? Math.sin(t * 0.44 + seed * 1.9) * 0.024
        : (Math.sin(t * 0.38 + seed * 1.5) * 0.010 + (iname === "playful_sway" ? Math.sin(t * 1.85 + seed) * 0.016 * iw : 0));
      const hipYaw = inst.mode === "standing"
        ? clamp(yawNow * 0.09 + Math.sin(t * 0.36 + seed) * 0.024, -0.11, 0.11)
        : clamp(yawNow * 0.04 + talkTorsoYaw * 0.4, -0.07, 0.07);
      this.slerpBoneModelDelta(bm.hips, 0, hipYaw, hipRoll, 0.06, "YXZ");
    }

    if (bm.spine) {
      this.slerpBoneModelDelta(
        bm.spine,
        clamp(baseLean + breathWave, -0.13, 0.18),
        sleeping ? 0 : clamp(yawNow * spineYawFrac + talkTorsoYaw * 0.55, -0.22, 0.22),
        clamp(weightShiftRoll, -0.09, 0.09),
        0.065,
        "YXZ"
      );
    }
    if (bm.chest) {
      const chestPitch = (o.isLastWordsEnd ? 0.095 : (o.act === "welcome_bow" ? 0.072 : 0)) +
        (talking && !isLastWordsMode ? (0.024 * speechEnv + phraseAccent * 0.022) : 0) +
        (o.isAccusing ? -0.042 : 0) + chestBreath;
      this.slerpBoneModelDelta(
        bm.chest,
        clamp(chestPitch, -0.08, 0.15),
        sleeping ? 0 : clamp(yawNow * chestYawFrac + talkTorsoYaw * 0.75, -0.24, 0.24),
        clamp(-weightShiftRoll * 0.40, -0.07, 0.07),
        0.08,
        "YXZ"
      );
    }
    if (bm.neck) {
      this.slerpBoneModelDelta(
        bm.neck,
        pitchNow * neckPitchFrac + nodOffset * 0.34,
        yawNow * neckYawFrac + shakeOffset * 0.28,
        idleRoll * 0.34,
        0.11,
        "YXZ"
      );
    }
    if (bm.head) {
      this.slerpBoneModelDelta(
        bm.head,
        pitchNow * headPitchFrac + nodOffset * 0.66 + starLookPitch,
        yawNow * headYawFrac + shakeOffset * 0.72,
        idleRoll * 0.66,
        0.14,
        "YXZ"
      );
    }
    // Calm Stepped Eye-Bone Fixation (leads head fastest at k=0.22 inside anatomical socket limits!)
    if (bm.leftEye || bm.rightEye) {
      const lim = inst.eyeLimits || { maxYaw: 0.095, maxPitchUp: 0.058, maxPitchDown: 0.072 };
      const sacSpd = clamp(arch.gazeSaccadeSpeed || 1.0, 0.7, 1.85);
      const nowFrameMs = o.nowMs || (t * 1000);
      const isWolfLieDart = Boolean(o.mentionBeat && o.mentionBeat.eyeDartUntil && nowFrameMs < o.mentionBeat.eyeDartUntil);

      let fixYaw = 0;
      let fixPitch = 0;
      if (isWolfLieDart) {
        fixYaw = (seed % 2 > 1 ? 1 : -1) * Math.min(0.078, lim.maxYaw * 0.85);
        fixPitch = Math.min(0.050, lim.maxPitchDown * 0.78);
      } else if (!sleeping && !o.isLastWordsEnd) {
        if (sweating || emotion === "nervous") {
          // Realistic uneasy stepped glances (~1.55s hold) instead of high-frequency eye vibration
          const nervBucket = Math.floor((t + seed * 1.13) / 1.55);
          const nHash = Math.sin(nervBucket * 19.31 + seed * 5.71);
          fixYaw = (Math.abs(nHash) > 0.28) ? ((nHash > 0 ? 1 : -1) * Math.min(0.052, lim.maxYaw * 0.58)) : 0;
          fixPitch = Math.cos(nervBucket * 11.17 + seed * 3.19) * 0.014;
        } else {
          // Steady human-like gaze fixation (3.4s–5.4s calm hold between subtle micro-shifts)
          const fixPeriod = clamp(4.6 / Math.sqrt(sacSpd), 3.4, 5.4);
          const fixBucket = Math.floor((t + seed * 1.37) / fixPeriod);
          const hYaw = Math.sin(fixBucket * 12.9898 + seed * 4.1414);
          const hPitch = Math.cos(fixBucket * 7.233 + seed * 2.71);
          fixYaw = (Math.abs(hYaw) > 0.48) ? (hYaw * Math.min(0.032, lim.maxYaw * 0.36)) : 0;
          fixPitch = (Math.abs(hPitch) > 0.62) ? (hPitch * 0.012) : 0;
        }
      }

      const eyeYaw = sleeping ? 0 : clamp(yawNow * 0.085 + fixYaw, -lim.maxYaw, lim.maxYaw);
      const eyePitch = (sleeping || o.isLastWordsEnd)
        ? Math.min(0.068, lim.maxPitchDown)
        : clamp(pitchNow * 0.060 + starLookPitch * 0.22 + fixPitch, -lim.maxPitchUp, lim.maxPitchDown);
      const eyeAlpha = isWolfLieDart ? 0.30 : 0.22;
      if (bm.leftEye) this.slerpBoneModelDelta(bm.leftEye, eyePitch, eyeYaw, 0, eyeAlpha, "YXZ");
      if (bm.rightEye) this.slerpBoneModelDelta(bm.rightEye, eyePitch, eyeYaw, 0, eyeAlpha, "YXZ");
    }

    // Calm Grounded Seated Lower-Body Poise (cuts restless shin/leg swinging by ~65%, keeps thighWorld.z > 0.85!)
    if (inst.mode === "seated" && !sleeping) {
      const lTempo = arch.legTempo !== undefined ? arch.legTempo : 0.40;
      if (inst.hasSkirt) {
        const gentleSway = Math.sin(t * 0.36 + seed * 2.1) * 0.007 * lTempo;
        const gentleBob = talking ? (Math.sin(t * 1.15 + seed) * 0.004 * speechEnv) : 0;
        const shinGentle = Math.sin(t * 0.52 + seed) * 0.010 + (o.isAccusing ? -0.04 : 0);
        if (bm.leftUpperLeg) this.slerpBoneModelDelta(bm.leftUpperLeg, clamp(-1.42 + gentleBob, -1.45, -1.39), clamp(-0.02 + gentleSway, -0.04, 0.01), 0.026, 0.065, "YXZ");
        if (bm.rightUpperLeg) this.slerpBoneModelDelta(bm.rightUpperLeg, clamp(-1.42 + gentleBob, -1.45, -1.39), clamp(0.02 + gentleSway, -0.01, 0.04), -0.026, 0.065, "YXZ");
        if (bm.leftLowerLeg) this.slerpBoneModelDelta(bm.leftLowerLeg, clamp(1.44 + shinGentle, 1.34, 1.52), 0, 0, 0.070, "YXZ");
        if (bm.rightLowerLeg) this.slerpBoneModelDelta(bm.rightLowerLeg, clamp(1.44 + shinGentle, 1.34, 1.52), 0, 0, 0.070, "YXZ");
      } else {
        const kneeShift = Math.sin(t * 0.34 + seed * 2.1) * 0.014 * lTempo;
        const thighBob = (talking ? Math.sin(t * 1.1 + seed) * 0.006 * speechEnv : 0) + (iname === "playful_sway" ? Math.sin(t * 1.85 + seed) * 0.010 * iw : 0);
        const shinSwingR = (o.isAccusing ? -0.07 : 0) + Math.sin(t * 0.62 + seed) * (0.014 + lTempo * 0.016) + (iname === "playful_sway" ? Math.sin(t * 1.85 + seed) * 0.028 * iw : 0);
        const shinSwingL = (o.isAccusing ? -0.06 : 0) + Math.cos(t * 0.56 + seed) * (0.012 + lTempo * 0.014) - (iname === "playful_sway" ? Math.sin(t * 1.85 + seed) * 0.024 * iw : 0);
        if (bm.leftUpperLeg) this.slerpBoneModelDelta(bm.leftUpperLeg, clamp(-1.40 + thighBob, -1.45, -1.34), clamp(0.06 + kneeShift, 0.02, 0.11), 0, 0.065, "YXZ");
        if (bm.rightUpperLeg) this.slerpBoneModelDelta(bm.rightUpperLeg, clamp(-1.40 - thighBob, -1.45, -1.34), clamp(-0.06 + kneeShift, -0.11, -0.02), 0, 0.065, "YXZ");
        if (bm.leftLowerLeg) this.slerpBoneModelDelta(bm.leftLowerLeg, clamp(1.42 + shinSwingL, 1.28, 1.56), 0, 0, 0.070, "YXZ");
        if (bm.rightLowerLeg) this.slerpBoneModelDelta(bm.rightLowerLeg, clamp(1.42 + shinSwingR, 1.28, 1.56), 0, 0, 0.070, "YXZ");
      }
    }

    // Anatomical Upper-Limb Choreography: Clavicles (0.09) -> UpperArm (0.10) -> Forearm (0.085) -> Wrist/Fingers (0.075)
    let rDrop = arch.rDrop, rFwd = arch.rFwd, rBend = arch.rBend, rTwist = 0.14;
    let lDrop = arch.lDrop, lFwd = arch.lFwd, lBend = arch.lBend, lTwist = 0.12;
    let rWristX = -0.04, rWristY = 0.04, rWristZ = 0.0;
    let lWristX = -0.04, lWristY = 0.04, lWristZ = 0.0;
    let shLiftR = breathWave * 1.4, shLiftL = breathWave * 1.4;
    let shFwdR = 0.0, shFwdL = 0.0;
    let rHandPose = "relaxed";
    let lHandPose = "relaxed";

    if (sleeping) {
      rDrop = 1.14; rFwd = 0.18; rBend = 0.86; rTwist = 0.06;
      lDrop = 1.14; lFwd = 0.18; lBend = 0.86; lTwist = 0.06;
    } else if (o.act === "celebrate") {
      rDrop = -0.30 + Math.sin(t * 3.6 + seed) * 0.12; rFwd = 0.42; rBend = 0.44 + Math.cos(t * 3.6 + seed) * 0.10; rTwist = -0.16;
      lDrop = -0.30 + Math.cos(t * 3.6 + seed) * 0.12; lFwd = 0.42; lBend = 0.44 + Math.sin(t * 3.6 + seed) * 0.10; lTwist = -0.16;
      shLiftR = 0.12; shLiftL = 0.12;
      rWristZ = -0.18; lWristZ = -0.18;
      rHandPose = "fist_cheer"; lHandPose = "fist_cheer";
    } else if (o.act === "welcome_bow") {
      // Poised, graceful Eastern tea-host welcoming open-palm gesture (zero repetitive waving!)
      const welBreath = (bCurve * 2 - 1) * 0.032;
      rDrop = 0.72 + welBreath; rFwd = 0.56 + welBreath * 0.9; rBend = 1.06 + (cCurve * 2 - 1) * 0.045; rTwist = 0.28;
      lDrop = 0.98; lFwd = 0.38; lBend = 1.14; lTwist = 0.22;
      shLiftR = 0.04;
      rWristX = -0.16; rWristY = 0.22; rWristZ = -0.10;
      lWristX = -0.10; lWristY = 0.16;
      rHandPose = "open_palm"; lHandPose = "tea_poise";
    } else if (o.isHovered) {
      // Warm gentle single greeting wave that settles smoothly into attentive poise (zero frantic 6.4 rad/s waving!)
      const hovElapsed = Math.max(0, t - (inst.hoverStartedAt >= 0 ? inst.hoverStartedAt : t));
      const waveEnv = hovElapsed < 1.55 ? Math.sin((hovElapsed / 1.55) * Math.PI) : 0;
      const waveArc = Math.sin(hovElapsed * 3.4) * waveEnv;
      rDrop = 0.86 - waveEnv * 0.20;
      rFwd = 0.46 + waveEnv * 0.12;
      rBend = 1.04 + waveArc * 0.14;
      rTwist = 0.24;
      lDrop = 1.02; lFwd = 0.30; lBend = 0.96; lTwist = 0.12;
      shLiftR = 0.035 + waveEnv * 0.03;
      rWristX = -0.14; rWristZ = -0.10 + waveArc * 0.14;
      rHandPose = waveEnv > 0.1 ? "open_palm" : "tea_poise";
    } else if (o.isVoting || o.act === "purify_cast") {
      const voteFloat = Math.sin(t * 1.7 + seed) * 0.028;
      rDrop = 0.22 + voteFloat; rFwd = 0.58; rBend = 0.38; rTwist = 0.16;
      lDrop = 1.04; lFwd = 0.32; lBend = 0.96;
      shLiftR = 0.10; shFwdR = 0.05;
      rWristX = -0.12;
      rHandPose = o.act === "purify_cast" ? "tea_poise" : "open_palm";
    } else if (o.isPrepping) {
      rDrop = Math.max(0.58, arch.rDrop - 0.14);
      rFwd = Math.min(0.84, arch.rFwd + 0.14);
      rBend = Math.max(0.78, arch.rBend - 0.10);
      rTwist = 0.22;
      shLiftR = 0.055; shLiftL = 0.04;
      rWristX = -0.12;
      rHandPose = "tea_poise"; lHandPose = "relaxed";
    } else if (isLastWordsMode) {
      // Solemn Farewell Cadence: dignified hand-to-chest during monologue -> respectful closing bow!
      if (o.isLastWordsEnd) {
        rDrop = 0.96; rFwd = 0.46; rBend = 1.24; rTwist = 0.26;
        lDrop = 0.96; lFwd = 0.46; lBend = 1.24; lTwist = 0.26;
        shLiftR = 0.02; shLiftL = 0.02;
        rWristX = -0.10; lWristX = -0.10;
        rHandPose = "tea_poise"; lHandPose = "tea_poise";
      } else {
        const lwSweep = Math.sin(t * 0.85 + seed) * 0.07 * speechEnv;
        rDrop = 0.78; rFwd = 0.58 + speechEnv * 0.04; rBend = 1.44; rTwist = 0.30;
        lDrop = 0.90 - speechEnv * 0.14; lFwd = 0.46 + speechEnv * 0.16 + lwSweep; lBend = 1.08 - speechEnv * 0.14; lTwist = 0.22;
        shLiftR = 0.04; shLiftL = 0.03 * speechEnv;
        rWristX = -0.12; rWristY = 0.16;
        lWristX = -0.14 * speechEnv; lWristY = 0.12 * speechEnv;
        rHandPose = "tea_poise"; lHandPose = speechEnv > 0.35 ? "open_palm" : "tea_poise";
      }
    } else if (o.isAccusing) {
      // Composed startled defensive recoil (replaces 8.5 rad/s vibrating flinch!)
      const recoilBreath = Math.sin(t * 1.9 + seed) * 0.018;
      rDrop = 0.66 + recoilBreath; rFwd = 0.64; rBend = 1.22; rTwist = -0.12;
      lDrop = 0.66 - recoilBreath; lFwd = 0.64; lBend = 1.22; lTwist = -0.12;
      shLiftR = 0.095; shLiftL = 0.095; shFwdR = 0.07; shFwdL = 0.07;
      rWristX = -0.24; lWristX = -0.24;
      rHandPose = "open_palm"; lHandPose = "open_palm";
    } else if (o.isBeingVouched) {
      rDrop = 0.80; rFwd = 0.58; rBend = 1.40; rTwist = 0.28;
      lDrop = 0.88; lFwd = 0.50; lBend = 1.30; lTwist = 0.24;
      shLiftR = 0.035; shLiftL = 0.035;
      rWristX = -0.12; lWristX = -0.10;
      rHandPose = "tea_poise"; lHandPose = "tea_poise";
    } else if (talking || isFloorHolder) {
      // Smoothly cross-faded 3.8–5.2s conversational phrases modulated by speechEnv (zero 2s snapping, zero metronome waving!)
      const pA = VRM_TALK_PHRASES[phraseIdx];
      const pB = VRM_TALK_PHRASES[nextPhraseIdx];
      const invX = 1 - phraseXfade;
      const microA = (Math.sin(t * 1.65 + seed) * 0.6 + Math.sin(t * 2.55 + seed * 1.7) * 0.4) * (0.045 + talkAmp * 0.045) * speechEnv * Math.min(1.25, tEnergy);
      const microB = (Math.cos(t * 1.45 + seed) * 0.6 + Math.sin(t * 2.25 + seed * 1.3) * 0.4) * (0.038 + talkAmp * 0.035) * speechEnv * Math.min(1.25, tEnergy);

      let tRD = pA.rDrop * invX + pB.rDrop * phraseXfade - phraseAccent * 0.045 * Math.min(1.25, tEnergy);
      let tRF = pA.rFwd * invX + pB.rFwd * phraseXfade + microA;
      let tRB = pA.rBend * invX + pB.rBend * phraseXfade + microB;
      let tRT = pA.rTwist * invX + pB.rTwist * phraseXfade;
      let tLD = pA.lDrop * invX + pB.lDrop * phraseXfade - phraseAccent * 0.025;
      let tLF = pA.lFwd * invX + pB.lFwd * phraseXfade - microB * 0.65;
      let tLB = pA.lBend * invX + pB.lBend * phraseXfade + microA * 0.5;
      let tLT = pA.lTwist * invX + pB.lTwist * phraseXfade;

      let tShLR = pA.shLiftR * invX + pB.shLiftR * phraseXfade;
      let tShFR = pA.shFwdR * invX + pB.shFwdR * phraseXfade;
      let tShLL = pA.shLiftL * invX + pB.shLiftL * phraseXfade;
      let tShFL = pA.shFwdL * invX + pB.shFwdL * phraseXfade;
      let tRWX = pA.rWX * invX + pB.rWX * phraseXfade + microA * 0.55;
      let tRWY = pA.rWY * invX + pB.rWY * phraseXfade;
      let tRWZ = pA.rWZ * invX + pB.rWZ * phraseXfade;
      let tLWX = pA.lWX * invX + pB.lWX * phraseXfade - microB * 0.4;
      let tLWY = pA.lWY * invX + pB.lWY * phraseXfade;
      let tLWZ = pA.lWZ * invX + pB.lWZ * phraseXfade;

      const domPhrase = phraseXfade > 0.5 ? pB : pA;
      rHandPose = domPhrase.rPose;
      lHandPose = domPhrase.lPose;
      if (gStyle === "classical" || gStyle === "graceful" || gStyle === "poetic") {
        tRD += 0.09; tLD += 0.08;
        tRF *= 0.90; tLF *= 0.90;
        if (rHandPose === "point_index") rHandPose = "tea_poise";
      } else if (gStyle === "energetic" || gStyle === "expressive") {
        tRD -= 0.04; tLD -= 0.04;
        tRF = Math.min(1.02, tRF * 1.06);
      }

      // Smoothly overlay decisive speech-act gestures (accuse point / role oath / warm vouch) without abrupt beat snapping!
      if (o.isPointingAccuse) {
        // Decisive single point + firm steady hold (zero 7.2 rad/s jackhammer jab!)
        const accElapsed = Math.max(0, t - (inst.accuseStartedAt >= 0 ? inst.accuseStartedAt : t));
        const reachK = clamp(accElapsed / 0.32, 0, 1);
        const reachW = reachK * reachK * (3 - 2 * reachK);
        const holdBreath = Math.sin(t * 1.7 + seed) * 0.018;
        const accW = talking ? clamp(0.45 + 0.55 * reachW * (0.45 + 0.55 * phraseAccent), 0.35, 1.0) : reachW;
        const invA = 1 - accW;
        tRD = tRD * invA + (0.72 + holdBreath) * accW;
        tRF = tRF * invA + (1.06 + holdBreath * 0.8) * accW;
        tRB = tRB * invA + 0.30 * accW;
        tRT = tRT * invA + clamp(yawNow * 0.42, -0.32, 0.32) * accW;
        tShLR = Math.max(tShLR, 0.075 * accW);
        tShFR = Math.max(tShFR, 0.095 * accW);
        tRWX = tRWX * invA + (-0.08) * accW;
        tRWZ = tRWZ * invA + (-0.06) * accW;
        if (accW > 0.45) rHandPose = "point_index";
      } else if (o.speechAct === "claim_role") {
        const oathW = talking ? clamp(0.42 + phraseAccent * 0.58, 0.35, 1.0) : 0.85;
        const invO = 1 - oathW;
        tRD = tRD * invO + 0.74 * oathW;
        tRF = tRF * invO + (0.62 + Math.sin(t * 1.6 + seed) * 0.025) * oathW;
        tRB = tRB * invO + 1.44 * oathW;
        tRT = tRT * invO + 0.32 * oathW;
        tShLR = Math.max(tShLR, 0.065 * oathW);
        tShFR = Math.max(tShFR, 0.055 * oathW);
        if (oathW > 0.45) rHandPose = "open_palm";
      } else if (o.speechAct === "vouch_warm") {
        const vw = talking ? clamp(0.42 + phraseAccent * 0.58, 0.35, 1.0) : 0.82;
        const invV = 1 - vw;
        tRD = tRD * invV + 0.74 * vw;
        tRF = tRF * invV + (0.82 + Math.sin(t * 1.7 + seed) * 0.035) * vw;
        tRB = tRB * invV + 0.56 * vw;
        tRT = tRT * invV + 0.28 * vw;
        tRWX = tRWX * invV + (-0.18) * vw;
        tRWY = tRWY * invV + 0.20 * vw;
        if (vw > 0.45) rHandPose = "open_palm";
      }

      // Blend speaking pose with resting tea-table posture via speechEnv so hands relax smoothly during pauses!
      const poseW = clamp(0.32 + speechEnv * 0.68, 0.28, 1.0);
      const invP = 1 - poseW;
      rDrop = arch.rDrop * invP + tRD * poseW;
      rFwd = arch.rFwd * invP + tRF * poseW;
      rBend = arch.rBend * invP + tRB * poseW;
      rTwist = 0.16 * invP + tRT * poseW;
      lDrop = arch.lDrop * invP + tLD * poseW;
      lFwd = arch.lFwd * invP + tLF * poseW;
      lBend = arch.lBend * invP + tLB * poseW;
      lTwist = 0.14 * invP + tLT * poseW;
      shLiftR += tShLR * poseW;
      shFwdR += tShFR * poseW;
      shLiftL += tShLL * poseW;
      shFwdL += tShFL * poseW;
      rWristX = -0.04 * invP + tRWX * poseW;
      rWristY = 0.04 * invP + tRWY * poseW;
      rWristZ = tRWZ * poseW;
      lWristX = -0.04 * invP + tLWX * poseW;
      lWristY = 0.04 * invP + tLWY * poseW;
      lWristZ = tLWZ * poseW;
    } else if (sweating) {
      // Subtle tense shoulder hunch + slow uneasy posture shift (replaces 9.5 rad/s vibrator jitter!)
      const uneasyShift = Math.sin(t * 1.45 + seed) * 0.016;
      rDrop = 0.84; rFwd = 0.50 + uneasyShift; rBend = 1.30; rTwist = -0.06;
      lDrop = 0.86; lFwd = 0.46 - uneasyShift * 0.8; lBend = 1.26; lTwist = -0.06;
      shLiftR = 0.085; shLiftL = 0.085; shFwdR = 0.06; shFwdL = 0.06;
      rWristX = 0.12; lWristX = 0.12;
    } else if (o.isListeningCurious && inst.mode === "seated") {
      rDrop = 0.68; rFwd = 0.64 + Math.sin(t * 1.1 + seed) * 0.018; rBend = 1.46; rTwist = 0.24;
      lDrop = 0.96; lFwd = 0.40; lBend = 1.18; lTwist = 0.16;
      shLiftR = 0.035;
      rWristX = -0.14;
      rHandPose = "tea_poise";
    } else if (inst.mode === "standing") {
      // Poised Eastern Tea-House Host Choreography for Qingming (smoothstep envelopes, zero repetitive waving!)
      const swaySt = (bCurve * 2 - 1) * 0.026;
      const hostSlot = Math.floor(((t + 1.5) % 19.5) / 6.5);
      const hostU = (((t + 1.5) % 19.5) % 6.5) / 6.5;
      let hostEnv = 0;
      if (hostU > 0.12 && hostU < 0.86) {
        if (hostU < 0.30) {
          const hk = (hostU - 0.12) / 0.18;
          hostEnv = hk * hk * (3 - 2 * hk);
        } else if (hostU > 0.68) {
          const hk = (0.86 - hostU) / 0.18;
          hostEnv = hk * hk * (3 - 2 * hk);
        } else {
          hostEnv = 1.0;
        }
      }
      if (o.hasActiveSpeaker) {
        const guideW = 0.38 + hostEnv * 0.48;
        rDrop = 1.00 - guideW * 0.26;
        rFwd = 0.34 + guideW * 0.28 + swaySt * 0.45;
        rBend = 0.98 - guideW * 0.20;
        rTwist = 0.26;
        lDrop = 0.98; lFwd = 0.38 - swaySt * 0.35; lBend = 1.14; lTwist = 0.22;
        shLiftR = 0.032 * guideW;
        rWristX = -0.15 * guideW; rWristY = 0.18 * guideW; rWristZ = -0.08 * guideW;
        lWristX = -0.08;
        rHandPose = "open_palm"; lHandPose = "tea_poise";
      } else if (hostSlot === 1) {
        // Gentle poised welcoming open-palm curve (replaces repetitive waving!)
        rDrop = 1.00 - hostEnv * 0.28;
        rFwd = 0.34 + hostEnv * 0.24 + swaySt * 0.35;
        rBend = 1.02 + hostEnv * 0.10;
        rTwist = 0.26;
        lDrop = 0.98; lFwd = 0.38; lBend = 1.12; lTwist = 0.20;
        shLiftR = 0.035 * hostEnv;
        rWristX = -0.16 * hostEnv; rWristY = 0.18 * hostEnv; rWristZ = -0.08 * hostEnv;
        rHandPose = "open_palm"; lHandPose = "tea_poise";
      } else if (hostSlot === 2) {
        rDrop = 0.98; rFwd = 0.38 + swaySt * 0.4; rBend = 1.12; rTwist = 0.22;
        lDrop = 1.00 - hostEnv * 0.24;
        lFwd = 0.36 + hostEnv * 0.26;
        lBend = 1.08 + hostEnv * 0.10;
        lTwist = 0.26;
        lWristX = -0.15 * hostEnv; lWristY = 0.14 * hostEnv;
        rHandPose = "tea_poise"; lHandPose = "tea_poise";
      } else {
        rDrop = 0.96; rFwd = 0.36 + swaySt; rBend = 1.06 + swaySt * 0.45; rTwist = 0.20;
        lDrop = 0.98; lFwd = 0.36 - swaySt * 0.6; lBend = 1.08; lTwist = 0.20;
        rWristX = -0.10; lWristX = -0.10;
        rHandPose = "tea_poise"; lHandPose = "tea_poise";
      }
    } else {
      // Base seated idle breathing + Smoothly Blended Autonomous Tea-Table Micro-Actions!
      const sway = (bCurve * 2 - 1) * arch.armSwayAmp;
      rFwd += sway;
      lFwd -= sway * 0.7;
      rBend += (cCurve * 2 - 1) * (arch.armSwayAmp * 0.9);
      lBend -= (bCurve * 2 - 1) * (arch.armSwayAmp * 0.75);
      rTwist = 0.16; lTwist = 0.14;

      if (iw > 0.005) {
        let tRD = rDrop, tRF = rFwd, tRB = rBend, tRT = rTwist;
        let tLD = lDrop, tLF = lFwd, tLB = lBend, tLT = lTwist;
        if (iname === "sip_tea") {
          tRD = 0.64; tRF = 0.72; tRB = 1.46; tRT = 0.30;
          tLD = 1.02; tLF = 0.36; tLB = 1.08; tLT = 0.16;
          rWristX = -0.20 * iw; rWristY = 0.16 * iw;
          rHandPose = "tea_poise";
        } else if (iname === "chin_rest") {
          tRD = 0.66; tRF = 0.66; tRB = 1.50; tRT = 0.24;
          tLD = 0.98; tLF = 0.42; tLB = 1.24; tLT = 0.22;
          shLiftR = 0.045 * iw;
          rWristX = -0.15 * iw;
          rHandPose = "tea_poise";
        } else if (iname === "arms_fold") {
          tRD = 0.90; tRF = 0.56; tRB = 1.44; tRT = 0.34;
          tLD = 0.94; tLF = 0.52; tLB = 1.40; tLT = 0.32;
          shFwdR = 0.045 * iw; shFwdL = 0.045 * iw;
          rHandPose = "relaxed"; lHandPose = "relaxed";
        } else if (iname === "table_tap") {
          const tap = Math.sin(t * 3.2 + seed) * 0.028;
          tRD = 0.78; tRF = 0.76; tRB = 0.72 + tap; tRT = 0.05;
          tLD = 1.04; tLF = 0.34; tLB = 1.04; tLT = 0.14;
          rWristX = -0.10 * iw + tap * 1.4 * iw;
          rHandPose = "point_index";
        } else if (iname === "glasses_adjust") {
          tRD = 0.56; tRF = 0.66; tRB = 1.52; tRT = 0.26;
          tLD = 1.04; tLF = 0.32; tLB = 1.02; tLT = 0.14;
          shLiftR = 0.055 * iw;
          rWristX = -0.14 * iw;
          rHandPose = "point_index";
        } else if (iname === "hands_clasp") {
          tRD = 0.90; tRF = 0.56; tRB = 1.34; tRT = 0.28;
          tLD = 0.90; tLF = 0.56; tLB = 1.34; tLT = 0.28;
          rHandPose = "tea_poise"; lHandPose = "tea_poise";
        } else if (iname === "sleeve_poise") {
          tRD = 0.82; tRF = 0.58; tRB = 1.24; tRT = 0.28;
          tLD = 0.94; tLF = 0.50; tLB = 1.30; tLT = 0.26;
          rWristX = -0.15 * iw; rWristY = 0.14 * iw;
          rHandPose = "tea_poise"; lHandPose = "tea_poise";
        } else if (iname === "stretch_roll") {
          tRD = 0.80; tRF = 0.28; tRB = 0.84; tRT = -0.10;
          tLD = 0.80; tLF = 0.28; tLB = 0.84; tLT = -0.10;
          shLiftR = 0.085 * iw; shLiftL = 0.085 * iw;
          rHandPose = "open_palm"; lHandPose = "open_palm";
        } else if (iname === "cup_cradle") {
          tRD = 0.86; tRF = 0.60; tRB = 1.40; tRT = 0.32;
          tLD = 0.86; tLF = 0.60; tLB = 1.40; tLT = 0.32;
          rWristX = -0.16 * iw; lWristX = -0.16 * iw;
          rHandPose = "tea_poise"; lHandPose = "tea_poise";
        } else if (iname === "tea_poise") {
          tRD = 0.78; tRF = 0.64; tRB = 1.28; tRT = 0.28;
          tLD = 1.02; tLF = 0.38; tLB = 1.16; tLT = 0.20;
          rWristX = -0.18 * iw; rWristY = 0.14 * iw;
          rHandPose = "tea_poise"; lHandPose = "tea_poise";
        } else if (iname === "lean_back") {
          tRD = 0.96; tRF = 0.22; tRB = 0.76; tRT = -0.14;
          tLD = 0.98; tLF = 0.20; tLB = 0.74; tLT = -0.14;
          shFwdR = -0.05 * iw; shFwdL = -0.05 * iw;
          rHandPose = "relaxed"; lHandPose = "relaxed";
        } else if (iname === "note_jot") {
          const jot = Math.sin(t * 3.6 + seed) * 0.022;
          tRD = 0.80; tRF = 0.62 + jot; tRB = 1.38; tRT = 0.28;
          tLD = 0.86; tLF = 0.58; tLB = 1.36; tLT = 0.32;
          rHandPose = "point_index"; lHandPose = "open_palm";
        } else if (iname === "count_fingers") {
          tRD = 0.72; tRF = 0.66; tRB = 1.34; tRT = 0.22;
          tLD = 1.04; tLF = 0.32; tLB = 1.06; tLT = 0.16;
          rWristX = -0.15 * iw;
          rHandPose = "point_index";
        } else if (iname === "star_gaze") {
          tRD = 0.68; tRF = 0.62; tRB = 1.46; tRT = 0.22;
          tLD = 1.02; tLF = 0.36; tLB = 1.12; tLT = 0.16;
          rHandPose = "tea_poise";
        } else if (iname === "playful_sway") {
          const bounceA = Math.sin(t * 1.9 + seed) * 0.048;
          tRD = 0.82 + bounceA; tRF = 0.50; tRB = 1.24 - bounceA; tRT = 0.22;
          tLD = 0.86 - bounceA; tLF = 0.48; tLB = 1.20 + bounceA; tLT = 0.22;
          rWristZ = -0.08 * iw; lWristZ = -0.08 * iw;
          rHandPose = "open_palm"; lHandPose = "open_palm";
        }
        rDrop = rDrop + (tRD - rDrop) * iw;
        rFwd = rFwd + (tRF - rFwd) * iw;
        rBend = rBend + (tRB - rBend) * iw;
        rTwist = rTwist + (tRT - rTwist) * iw;
        lDrop = lDrop + (tLD - lDrop) * iw;
        lFwd = lFwd + (tLF - lFwd) * iw;
        lBend = lBend + (tLB - lBend) * iw;
        lTwist = lTwist + (tLT - lTwist) * iw;
      }
    }

    // Apply per-persona baseline shoulderSpread (晨晨/阿松 open shoulders vs 小澄/暖暖 tucked shoulders)
    const baseShSpread = arch.shoulderSpread || 0;
    shFwdR -= baseShSpread * 0.75;
    shFwdL -= baseShSpread * 0.75;
    rDrop -= baseShSpread * 0.45;
    lDrop -= baseShSpread * 0.45;

    rDrop = clamp(rDrop, -0.55, 1.24);
    lDrop = clamp(lDrop, -0.55, 1.24);
    rFwd = clamp(rFwd, 0.05, 1.25);
    lFwd = clamp(lFwd, 0.05, 1.25);
    rBend = clamp(rBend, 0.10, 1.56);
    lBend = clamp(lBend, 0.10, 1.56);
    rTwist = clamp(rTwist, -0.45, 0.45);
    lTwist = clamp(lTwist, -0.45, 0.45);

    // Hierarchical arm follow-through: Clavicles (0.09) -> UpperArm (0.10) -> Forearm (0.085) -> Wrist/Fingers (0.075)
    if (bm.rightShoulder) this.slerpBoneModelDelta(bm.rightShoulder, 0, clamp(shFwdR, -0.12, 0.15), -clamp(shLiftR, -0.12, 0.17), 0.09, "YXZ");
    if (bm.leftShoulder) this.slerpBoneModelDelta(bm.leftShoulder, 0, -clamp(shFwdL, -0.12, 0.15), clamp(shLiftL, -0.12, 0.17), 0.09, "YXZ");
    if (bm.rightUpperArm) this.slerpBoneModelDelta(bm.rightUpperArm, -rFwd, rTwist, rDrop, 0.10, "YXZ");
    if (bm.leftUpperArm) this.slerpBoneModelDelta(bm.leftUpperArm, -lFwd, -lTwist, -lDrop, 0.10, "YXZ");
    if (bm.rightLowerArm) this.slerpBoneModelDelta(bm.rightLowerArm, 0, rBend, 0, 0.085, "YXZ");
    if (bm.leftLowerArm) this.slerpBoneModelDelta(bm.leftLowerArm, 0, -lBend, 0, 0.085, "YXZ");
    if (bm.rightHand) this.slerpBoneModelDelta(bm.rightHand, clamp(rWristX, -0.42, 0.42), clamp(rWristY, -0.38, 0.38), clamp(rWristZ, -0.36, 0.36), 0.075, "YXZ");
    if (bm.leftHand) this.slerpBoneModelDelta(bm.leftHand, clamp(lWristX, -0.42, 0.42), -clamp(lWristY, -0.38, 0.38), -clamp(lWristZ, -0.36, 0.36), 0.075, "YXZ");

    // Expressive Finger Pose Articulation (v23.3: run once for resting seats, animate every frame for active speakers/priority/acting seats!)
    const runFingerPose = Boolean(!inst._fingersInitialized || o.isPriority || talking || Boolean(o.act));
    if (runFingerPose) {
      inst._fingersInitialized = true;
      const rCurls = VRM_FINGER_PRESETS[rHandPose] || VRM_FINGER_PRESETS.relaxed;
      const lCurls = VRM_FINGER_PRESETS[lHandPose] || VRM_FINGER_PRESETS.relaxed;
      if (bm.rightIndexProximal) this.slerpBoneModelDelta(bm.rightIndexProximal, 0, 0, rCurls[0], 0.075, "YXZ");
      if (bm.rightMiddleProximal) this.slerpBoneModelDelta(bm.rightMiddleProximal, 0, 0, rCurls[1], 0.075, "YXZ");
      if (bm.rightRingProximal) this.slerpBoneModelDelta(bm.rightRingProximal, 0, 0, rCurls[2], 0.075, "YXZ");
      if (bm.rightLittleProximal) this.slerpBoneModelDelta(bm.rightLittleProximal, 0, 0, rCurls[3], 0.075, "YXZ");
      if (bm.rightThumbProximal) this.slerpBoneModelDelta(bm.rightThumbProximal, 0, rCurls[4] * 0.45, rCurls[4] * 0.32, 0.075, "YXZ");
      if (bm.leftIndexProximal) this.slerpBoneModelDelta(bm.leftIndexProximal, 0, 0, -lCurls[0], 0.075, "YXZ");
      if (bm.leftMiddleProximal) this.slerpBoneModelDelta(bm.leftMiddleProximal, 0, 0, -lCurls[1], 0.075, "YXZ");
      if (bm.leftRingProximal) this.slerpBoneModelDelta(bm.leftRingProximal, 0, 0, -lCurls[2], 0.075, "YXZ");
      if (bm.leftLittleProximal) this.slerpBoneModelDelta(bm.leftLittleProximal, 0, 0, -lCurls[3], 0.075, "YXZ");
      if (bm.leftThumbProximal) this.slerpBoneModelDelta(bm.leftThumbProximal, 0, -lCurls[4] * 0.45, -lCurls[4] * 0.32, 0.075, "YXZ");
    }

    // 3. SpringBone Hair, Ribbons & Skirt Model-Space Physics (lively follow-through hair sway, flip-free seated skirt!)
    const dYaw = clamp(yawNow - (inst.prevHeadYaw || 0), -0.32, 0.32);
    inst.prevHeadYaw = yawNow;
    inst.headInertia = (inst.headInertia || 0) * Math.pow(0.85, dt60) + dYaw * 1.85;

    const qMode = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const isIgpuVrm = Boolean(typeof stage3d !== "undefined" && stage3d.isIntegratedGpu);
    const skipHairSpringsNow = Boolean(sleeping || (!o.isPriority && !talking && (qMode === "eco" || isIgpuVrm || (qMode === "balanced" && (o.seatCount || 8) >= 10))));
    const springStride = o.isPriority ? 1 : (sleeping ? 6 : (qMode === "eco" ? 4 : ((isIgpuVrm || qMode === "balanced") ? 3 : 2)));
    const runSprings = springStride <= 1 || typeof o.frameCounter !== "number" || ((o.frameCounter + (o.seatId || 0)) % springStride === 0);
    if (runSprings && inst.springBones && inst.springBones.length) {
      for (let si = 0; si < inst.springBones.length; si++) {
        const sb = inst.springBones[si];
        if (!sb || !sb.quatMeta) continue;
        if (sb.isSkirt && inst.mode === "seated") {
          const skSway = Math.sin(t * 1.6 + sb.phase) * 0.014;
          const skAng = this.getSeatedSkirtTargetAngles(sb, skSway, this._skirtAngScratch);
          this.slerpBoneModelDelta(sb.quatMeta, skAng.rx, skAng.ry, skAng.rz, 0.16, "YXZ");
        } else if (sb.isSkirt) {
          // Standing skirt: ultra-gentle hem flutter strictly biased downward so breeze NEVER lifts skirt!
          const hemZ = clamp(Math.sin(t * 1.8 + sb.phase) * 0.028, -0.035, 0.035);
          const hemX = clamp(Math.cos(t * 1.5 + sb.phase) * 0.018, -0.022, 0.022);
          this.slerpBoneModelDelta(sb.quatMeta, hemX, 0, hemZ, 0.16, "YXZ");
        } else if (!skipHairSpringsNow) {
          const baseAmp = clamp(0.072 / Math.sqrt(sb.stiffness || 0.7), 0.038, 0.115);
          const breezeZ = clamp(Math.sin(t * 2.25 + sb.phase) * baseAmp + inst.headInertia * 0.32, -0.16, 0.16);
          const breezeX = clamp(Math.cos(t * 1.85 + sb.phase) * (baseAmp * 0.72), -0.11, 0.11);
          this.slerpBoneModelDelta(sb.quatMeta, breezeX, 0, breezeZ, 0.18, "YXZ");
        }
      }
    }
  }
};
