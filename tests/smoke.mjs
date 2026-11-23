#!/usr/bin/env node
/**
 * 三好AI狼人殺 — 自動化回歸煙霧測試
 * 涵蓋：全模組語法、資源 1-to-1 檢查、離線化檢查、零 !important、DOM ID 全覆蓋、
 * .innerHTML XSS 安全巡檢、Stage A/B/C/D 全功能與 2D/3D/AI 端到端模擬
 * 執行方式：node tests/smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const html = fs.readFileSync("ai.html", "utf8");
const jsMatches = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(m => m[1])
  .filter(s => !s.startsWith("http") && !s.startsWith("js/vendor/"));
const cssMatches = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)]
  .map(m => m[1])
  .filter(s => !s.startsWith("http"));

// 1. Offline Zero-CDN Script Check (no external JS/Tailwind runtime CDN)
if (html.includes("cdn.tailwindcss.com")) {
  throw new Error("ai.html still references external cdn.tailwindcss.com!");
}
if (!cssMatches.includes("css/tailwind-local.css")) {
  throw new Error("ai.html must load local css/tailwind-local.css!");
}

// 1b. Verify Offline Portrait, 360° Skybox, Poly Haven CC0 PBR Textures & Deployment Docs
const requiredAssets = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "CREDITS.md",
  "assets/portraits/player.jpg",
  "assets/portraits/player_female.jpg",
  "assets/portraits/qingming.jpg",
  "assets/portraits/xiaocheng.jpg",
  "assets/portraits/nuannuan.jpg",
  "assets/portraits/asong.jpg",
  "assets/portraits/xinger.jpg",
  "assets/portraits/xiaoyun.jpg",
  "assets/portraits/azhu.jpg",
  "assets/portraits/chenchen.jpg",
  "assets/portraits/mobai.jpg",
  "assets/portraits/qinglan.jpg",
  "assets/portraits/alang.jpg",
  "assets/portraits/youzi.jpg",
  "assets/sky/sanctuary_day.jpg",
  "assets/sky/sanctuary_dusk.jpg",
  "assets/sky/sanctuary_night.jpg",
  "assets/textures/walnut_diff.jpg",
  "assets/textures/walnut_nor.jpg",
  "assets/textures/walnut_rough.jpg",
  "assets/textures/stone_diff.jpg",
  "assets/textures/stone_nor.jpg",
  "assets/textures/stone_rough.jpg",
  "assets/sky/sanctuary_dusk.jpg",
  "assets/portraits/qingming.jpg",
  "assets/portraits/player_female.jpg",
  "assets/models/manifest.json",
  "assets/models/qingming_sheet.jpg",
  "assets/portraits_vrm/qingming.jpg",
  "assets/portraits_vrm/player.jpg",
  "assets/portraits_vrm/player_male.jpg",
  "assets/portraits_vrm/xiaocheng.jpg",
  "assets/portraits_vrm/nuannuan.jpg",
  "assets/portraits_vrm/asong.jpg",
  "assets/portraits_vrm/xinger.jpg",
  "assets/portraits_vrm/xiaoyun.jpg",
  "assets/portraits_vrm/azhu.jpg",
  "assets/portraits_vrm/chenchen.jpg",
  "assets/models/qingming.vrm",
  "assets/models/player.vrm",
  "assets/models/player_male.vrm",
  "assets/models/xiaocheng.vrm",
  "assets/models/nuannuan.vrm",
  "assets/models/asong.vrm",
  "assets/models/xinger.vrm",
  "assets/models/xiaoyun.vrm",
  "assets/models/azhu.vrm",
  "assets/models/chenchen.vrm",
  "js/vendor/GLTFLoader.js",
  "js/vendor/postfx-r128.js",
];
for (const a of requiredAssets) {
  if (!fs.existsSync(a) || fs.statSync(a).size < 256) {
    throw new Error(`Missing or invalid art/competition asset: ${a}`);
  }
  if (a.startsWith("assets/portraits_vrm/") && fs.statSync(a).size > 102400) {
    throw new Error(`Pre-extracted VRM portrait too large (>100KB): ${a}`);
  }
  if (a.endsWith(".vrm") && fs.readFileSync(a, { length: 4 }).slice(0, 4).toString("utf8") !== "glTF") {
    throw new Error(`Invalid .vrm glTF header in: ${a}`);
  }
}

// 1b-2. Verify all 10 optimized .vrm models (primitive draw-call ceiling + Asong VRM 0.x identity) + real GLTFLoader.parse()
{
  const vrmFiles = fs.readdirSync("assets/models").filter(f => f.endsWith(".vrm")).sort();
  if (vrmFiles.length !== 10) throw new Error("Expected 10 .vrm models, found " + vrmFiles.length);
  let totalPrims = 0;
  for (const vf of vrmFiles) {
    const raw = fs.readFileSync(path.join("assets/models", vf));
    const jlen = raw.readUInt32LE(12);
    const gltf = JSON.parse(raw.subarray(20, 20 + jlen).toString("utf8"));
    const prims = (gltf.meshes || []).reduce((acc, m) => acc + (m.primitives ? m.primitives.length : 0), 0);
    if (prims < 5 || prims > 24) throw new Error(`Optimized VRM primitive count out of range for ${vf}: ${prims}`);
    totalPrims += prims;
    const vrmMeta = gltf.extensions && gltf.extensions.VRM && gltf.extensions.VRM.meta;
    if (!vrmMeta || vrmMeta.licenseName !== "CC0" || vrmMeta.commercialUssageName !== "Allow") {
      throw new Error(`VRM model ${vf} must be 100% CC0 Public Domain with commercial allow! Got: ${JSON.stringify(vrmMeta)}`);
    }
    if (vf === "asong.vrm") {
      if (!gltf.extensions || !gltf.extensions.VRM || gltf.extensions.VRMC_vrm || gltf.extensions.VRMC_node_constraint) {
        throw new Error("asong.vrm must be pure VRM 0.x without VRMC_node_constraint!");
      }
      if (!gltf.extensions.VRM.meta || gltf.extensions.VRM.meta.title !== "Asong_MountainSenior") {
        throw new Error("asong.vrm meta.title mismatch!");
      }
      const rawJsonStr = raw.subarray(20, 20 + jlen).toString("utf8");
      if (rawJsonStr.includes("Seed-san") || rawJsonStr.includes("robo_arm")) {
        throw new Error("asong.vrm still contains legacy Seed-san/robo_arm references!");
      }
    }
  }
  if (totalPrims >= 200) throw new Error("Total primitive count across 10 VRMs too high: " + totalPrims);

  const gltfCheckCtx = vm.createContext({
    window: {}, self: {}, navigator: { userAgent: "node" }, performance, TextDecoder, URL, Blob,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    console, setTimeout, clearTimeout, Math, Uint8Array, Float32Array, Uint16Array, Uint32Array, DataView, ArrayBuffer
  });
  gltfCheckCtx.window = gltfCheckCtx;
  gltfCheckCtx.self = gltfCheckCtx;
  gltfCheckCtx.URL.createObjectURL = () => "blob:mock";
  gltfCheckCtx.URL.revokeObjectURL = () => { };
  gltfCheckCtx.document = {
    createElementNS: (_ns, tag) => gltfCheckCtx.document.createElement(tag),
    createElement: (tag) => {
      if (tag === "img") {
        const im = { listeners: {}, addEventListener(k, fn) { this.listeners[k] = fn; }, removeEventListener() { }, width: 64, height: 64 };
        Object.defineProperty(im, "src", { set() { setTimeout(() => { if (im.listeners.load) im.listeners.load(); if (im.onload) im.onload(); }, 0); } });
        return im;
      }
      return { getContext: () => null };
    }
  };
  vm.runInContext(fs.readFileSync("js/vendor/three.min.js", "utf8"), gltfCheckCtx, { filename: "three.min.js" });
  vm.runInContext(fs.readFileSync("js/vendor/GLTFLoader.js", "utf8"), gltfCheckCtx, { filename: "GLTFLoader.js" });
  vm.runInContext(fs.readFileSync("js/stage3d/anime-shader.js", "utf8") + "\nthis.stage3dAnime = stage3dAnime;", gltfCheckCtx, { filename: "anime-shader.js" });
  vm.runInContext(fs.readFileSync("js/stage3d/vrm-loader.js", "utf8") + "\nthis.stage3dVrm = stage3dVrm;", gltfCheckCtx, { filename: "vrm-loader.js" });
  for (const sampleVrm of vrmFiles) {
    const fbuf = fs.readFileSync(path.join("assets/models", sampleVrm));
    const ab = fbuf.buffer.slice(fbuf.byteOffset, fbuf.byteOffset + fbuf.byteLength);
    const gltfObj = await new Promise((res, rej) => new gltfCheckCtx.THREE.GLTFLoader().parse(ab, "", res, rej));
    const avMode = sampleVrm === "qingming.vrm" ? "standing" : "seated";
    const inst = gltfCheckCtx.stage3dVrm.prepareLoadedAvatar(gltfObj, { url: "assets/models/" + sampleVrm, mode: avMode });
    if (Object.keys(inst.bones || {}).length < 16 || Object.keys(inst.morphs || {}).length < 8) {
      throw new Error(`Real GLTFLoader VRM rig verification failed for ${sampleVrm}`);
    }
    if (!inst.bones.leftEye || !inst.bones.rightEye) {
      throw new Error(`VRM eye bones (leftEye/rightEye) missing for ${sampleVrm}`);
    }
    if (!inst.celMats || inst.celMats.length === 0) {
      throw new Error(`VRM real-time Cel Shading upgrade did not produce celMats for ${sampleVrm}`);
    }
    for (const [bName, bObj] of Object.entries(inst.bones || {})) {
      const vals = [bObj.position.x, bObj.position.y, bObj.position.z, bObj.quaternion.x, bObj.quaternion.y, bObj.quaternion.z, bObj.quaternion.w];
      if (vals.some(Number.isNaN)) {
        throw new Error(`NaN bone transform on ${sampleVrm}:${bName}`);
      }
    }
    gltfCheckCtx.stage3dVrm.updateVrmAvatar(inst, { tSec: 1.4, talking: false, talkLevel: 0, moodKey: "day", emotion: "neutral" });
    if (inst.lastTalkBoost !== false) {
      throw new Error(`Expected lastTalkBoost=false when silent for ${sampleVrm}`);
    }
    gltfCheckCtx.stage3dVrm.updateVrmAvatar(inst, { tSec: 1.7, talking: true, talkLevel: 0.7, moodKey: "day", emotion: "happy" });
    if (inst.lastTalkBoost !== true) {
      throw new Error(`Expected lastTalkBoost=true when talking for ${sampleVrm}`);
    }
    for (const entry of inst.tintMats || []) {
      const c = entry && entry.mat && entry.mat.color;
      if (c && (c.r > 1.0001 || c.g > 1.0001 || c.b > 1.0001 || Number.isNaN(c.r))) {
        throw new Error(`VRM tint color overflow or NaN on ${sampleVrm}: (${c.r}, ${c.g}, ${c.b})`);
      }
    }
  }
}

// 1c. Strict Blind-Review Anonymity, Respectful Role Naming, CSS Var & Theme-Day Parity Checks
const indexHtml = fs.readFileSync("index.html", "utf8");
const creditsMd = fs.readFileSync("CREDITS.md", "utf8");
const themeCss = fs.readFileSync("css/theme.css", "utf8");
const compCss = fs.readFileSync("css/components.css", "utf8");
for (const forbidden of ["fgu.edu.tw", "3goodai", "佛光大學"]) {
  if (html.includes(forbidden) || indexHtml.includes(forbidden) || creditsMd.includes(forbidden) || themeCss.includes(forbidden) || compCss.includes(forbidden)) {
    throw new Error(`Blind-review violation: found "${forbidden}" in public assets!`);
  }
}
for (const darkTerm of ["女巫", "毒藥", "解藥"]) {
  if (html.includes(darkTerm) || indexHtml.includes(darkTerm) || creditsMd.includes(darkTerm) || themeCss.includes(darkTerm) || compCss.includes(darkTerm)) {
    throw new Error(`Unrefactored legacy role term "${darkTerm}" still in public assets!`);
  }
}

{
  const definedCssVars = new Set([...(themeCss + "\n" + compCss).matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]));
  const usedCssVars = [...(themeCss + "\n" + compCss).matchAll(/var\((--[a-z0-9-]+)/gi)].map(m => m[1]);
  const missingCssVars = [...new Set(usedCssVars)].filter(v => !definedCssVars.has(v));
  if (missingCssVars.length) {
    throw new Error("Undefined CSS variables referenced: " + missingCssVars.join(", "));
  }
  for (const requiredRule of [
    "button:focus-visible",
    "body.craft-ui.theme-day .wind-vane-strip",
    "body.craft-ui.theme-day .play-card-btn.card-evidence",
    "body.craft-ui.theme-day .spectator-guess-bar",
    "body.craft-ui.theme-day #seatButtonStrip .seat-pill-btn",
    "body.craft-ui.theme-day #vrmLoadPill"
  ]) {
    if (!themeCss.includes(requiredRule)) {
      throw new Error("Missing accessibility/theme-day rule in css/theme.css: " + requiredRule);
    }
  }

  const postfxSrc = fs.readFileSync("js/stage3d/postfx.js", "utf8");
  const uniformKeys = [...postfxSrc.matchAll(/^\s*(tDiffuse|u[A-Z][A-Za-z0-9]*)\s*:\s*\{/gm)].map(m => m[1]);
  const shaderUniforms = [...postfxSrc.matchAll(/"uniform\s+\S+\s+([A-Za-z0-9_]+);"/g)].map(m => m[1]);
  for (const su of shaderUniforms) {
    if (!uniformKeys.includes(su)) throw new Error("PostFX fragmentShader uniform missing in uniforms map: " + su);
  }
  for (const uk of uniformKeys) {
    if (!shaderUniforms.includes(uk)) throw new Error("PostFX uniform key unused in fragmentShader: " + uk);
  }
}

// 1d. Playability & Pointer-Events Regression Guard (prevents unclickable Title Screen / overlapping overlays)
const titleFocalMatch = compCss.match(/body\.screen-title #focalCenterCard\s*\{[^}]+\}/);
if (!titleFocalMatch || !titleFocalMatch[0].includes("pointer-events: auto")) {
  throw new Error("Playability regression: body.screen-title #focalCenterCard MUST have pointer-events: auto!");
}
if (!html.includes('id="bottomUnifiedRow"') || !html.includes('id="focalCenterCard" class="pointer-events-auto')) {
  throw new Error("Playability regression: unified bottom dock or focalCenterCard pointer-events-auto missing!");
}
// Real Three.js r128 Geometry & Rig Verification (catches real browser Three.js API errors!)
{
  const realThreeCtx = vm.createContext({
    console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Map, Set, Promise,
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array,
    ArrayBuffer, DataView, parseInt, parseFloat, isNaN, isFinite,
    performance: { now: () => 1000 },
    localStorage: { getItem: () => null, setItem() { } },
    location: { protocol: "http:" },
    el: () => ({ value: "8", checked: false, classList: { add() { }, remove() { }, toggle() { }, contains: () => false } }),
    document: {
      createElementNS: () => ({ addEventListener() { }, removeEventListener() { } }),
      createElement: () => ({
        width: 256, height: 256, style: {},
        getContext: () => new Proxy({}, { get: (_, p) => p === "measureText" ? () => ({ width: 48 }): () => ({ addColorStop() { } })
      }),
      addEventListener() { }
    })
}
  });
realThreeCtx.window = realThreeCtx;
realThreeCtx.self = realThreeCtx;
vm.runInContext(fs.readFileSync("js/vendor/three.min.js", "utf8"), realThreeCtx, { filename: "three.min.js" });
vm.runInContext(fs.readFileSync("js/vendor/GLTFLoader.js", "utf8"), realThreeCtx, { filename: "GLTFLoader.js" });
vm.runInContext(fs.readFileSync("js/vendor/postfx-r128.js", "utf8"), realThreeCtx, { filename: "postfx-r128.js" });
for (const rf of ["js/data/constants.js", "js/core/state.js", "js/canvas/portraits.js", "js/stage3d/textures.js", "js/stage3d/anime-shader.js", "js/stage3d/vrm-loader.js", "js/stage3d/environment.js", "js/stage3d/character-mesh.js", "js/stage3d/hero-character.js", "js/stage3d/effects.js", "js/stage3d/postfx.js"]) {
  vm.runInContext(fs.readFileSync(rf, "utf8"), realThreeCtx, { filename: rf });
}
vm.runInContext(`
    if (typeof THREE.GLTFLoader !== "function") throw new Error("THREE.GLTFLoader failed to register!");
    if (typeof THREE.EffectComposer !== "function" || typeof THREE.UnrealBloomPass !== "function") {
      throw new Error("THREE.EffectComposer / UnrealBloomPass failed to register!");
    }
    // Verify Genshin Anime NPR Shader compilation hooks (including SkinnedMesh & MorphTargets for VRM)
    const animeMat = stage3dAnime.createAnimeMaterial({ color: 0x4c7a69, isHair: true, hairRingColor: 0xffe5a8, skinning: true, morphTargets: true, morphNormals: true });
    if (!animeMat.skinning || !animeMat.morphTargets) {
      throw new Error("Anime VRM material failed to preserve skinning/morphTargets flags!");
    }
    const mockShader = { uniforms: {}, fragmentShader: THREE.ShaderLib.toon.fragmentShader };
    animeMat.onBeforeCompile(mockShader);
    if (!mockShader.fragmentShader.includes("uAnimeRimColor") || !mockShader.fragmentShader.includes("animeFresnel")) {
      throw new Error("Genshin NPR Toon shader injection failed against Three.js r128 ShaderLib.toon!");
    }
    const aHeadGeo = stage3dAnime.createAnimeHeadGeometry(0.42);
    const aPos = aHeadGeo.attributes.position;
    if (!aPos || aPos.count < 100 || isNaN(aPos.getY(0))) throw new Error("Anime head deformation invalid!");
    const lockGeo = stage3dAnime.createTaperedHairLockGeo([new THREE.Vector3(0, 0.2, 0.2), new THREE.Vector3(0, 0, 0.3), new THREE.Vector3(0, -0.2, 0.25)], 0.05, 0.005);
    if (!lockGeo.attributes.position || lockGeo.attributes.position.count < 50) throw new Error("Tapered hair lock geo invalid!");

    const rSc = new THREE.Scene();
    const rEnv = build3DEnvironment(rSc, null);
    if (!rEnv || !rEnv.cloudPlanes || rEnv.cloudPlanes.length < 10) {
      throw new Error("Sculpted AA 3D Environment failed to build!");
    }
    if (!rEnv.godRays || rEnv.godRays.length < 4 || !rEnv.petals || rEnv.petals.length < 20) {
      throw new Error("Genshin Liyue God Rays or drifting petals failed to build!");
    }
    if (!rEnv.lotusRingInner || !rEnv.skyPhotoDuskMat || !rEnv.latticeScreenMat) {
      throw new Error("Round 2 art assets (curved glass-jade lotus, dusk skybox dome, backlit lattice transom) failed to build!");
    }
    const rHero = buildHeroCharacter(rSc);
    if (rHero.root.position.x < 2.0) throw new Error("Qingming should stand on right-rear tea dais clear of Seat 5!");
    applyHeroPalette(rHero, "teagold");
    setHeroVisualMode(rHero, "sculpt3d");
    setHeroVisualMode(rHero, "glb"); // safely stays sculpt3d when no .glb loaded
    updateHeroCharacter(rHero, new THREE.PerspectiveCamera(), { tSec: 1.5, nowMs: 1500, p: "LOBBY", w: 1280, h: 720 }, null, true);

    // Build ALL 12 bespoke Genshin-styled AI seated actors + verify double-sided plaque materials
    const allSeatNames = ["你", "小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨", "墨白", "晴嵐", "阿朗", "柚子"];
    allSeatNames.forEach((nm, idx) => {
      const rActor = create3DSeatActor({ id: idx + 1, name: nm, color: "#38bdf8", alive: true, role: "villager" });
      if (!rActor || !rActor.vrmMountGroup || !rActor.sculptBodyRoot) {
        throw new Error("Real Three.js r128 seat character build failed for: " + nm);
      }
      let plaqueFound = false;
      rActor.root.traverse(obj => {
        if (obj.isMesh && obj.geometry === stage3dCharGeos.plaqueBox) {
          plaqueFound = true;
          if (!Array.isArray(obj.material) || obj.material.length !== 6 || !obj.material[4].map || obj.material[4].map !== obj.material[5].map) {
            throw new Error("Double-sided plaque material mismatch for seat " + nm);
          }
        }
      });
      if (!plaqueFound) throw new Error("Plaque mesh missing in seat actor: " + nm);
    });

    // Verify real Three.js HDR PostFX Composer across all 4 moods (day/twilight/vote/night)
    const pfxMockRenderer = {
      capabilities: { isWebGL2: false },
      extensions: { get: () => null },
      getPixelRatio: () => 1,
      getSize: (v) => { v.x = 1280; v.y = 720; return v; }
    };
    const pfx = build3DPostFx(pfxMockRenderer, rSc, new THREE.PerspectiveCamera(44, 16 / 9, 0.2, 130));
    if (!pfx || !pfx.bloomPass || !pfx.gradePass) throw new Error("build3DPostFx failed to construct real r128 composer!");
    pfx.resize(1280, 720, 2.0);
    [
      { p: "LOBBY", daylight: false, night: false },
      { p: "NIGHT_WOLF", daylight: false, night: true },
      { p: "DAY_SPEECH", daylight: true, night: false },
      { p: "DAY_VOTE", daylight: true, night: false }
    ].forEach(moodFrame => {
      for (let i = 0; i < 12; i++) pfx.updateMood(moodFrame, 90);
      const u = pfx.gradePass.uniforms;
      if (pfx.bloomPass.threshold < 1.0 || Number.isNaN(pfx.bloomPass.strength)) {
        throw new Error("PostFX bloom threshold/strength invalid for " + moodFrame.p);
      }
      if (!(u.uExposure.value > 0.9 && u.uContrast.value > 1.0 && u.uVignette.value > 0)) {
        throw new Error("PostFX grading uniforms out of range for " + moodFrame.p);
      }
    });

    // Verify zero-dependency VRM 0.x/1.0 13-expression bindings, Bust-safe SpringBones & updateVrmAvatar
    const synthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.4), new THREE.MeshBasicMaterial());
    synthMesh.name = "Face";
    synthMesh.morphTargetInfluences = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    synthMesh.morphTargetDictionary = { a: 0, i: 1, u: 2, e: 3, o: 4, blink: 5, blink_l: 6, joy: 7, fun: 8, angry: 9, sorrow: 10 };
    const bustBone = new THREE.Group(); bustBone.name = "J_Sec_L_Bust1";
    const hairBone = new THREE.Group(); hairBone.name = "HairJoint_Test";
    const headBone = new THREE.Group(); headBone.name = "Head";
    synthMesh.add(bustBone, hairBone, headBone);
    const synthGltf = {
      scene: synthMesh,
      parser: {
        json: {
          nodes: [{ name: "Face" }, { name: "J_Sec_L_Bust1" }, { name: "HairJoint_Test" }],
          extensions: {
            VRM: {
              humanoid: { humanBones: [] },
              secondaryAnimation: {
                boneGroups: [
                  { comment: "Bust", stiffness: 0.75, bones: [1] },
                  { comment: "HairBack", stiffness: 0.5, bones: [2] }
                ]
              }
            }
          }
        }
      }
    };
    const prepSeated = stage3dVrm.prepareLoadedAvatar(synthGltf, { mode: "seated", targetHeight: 1.98, baseY: 0 });
    if (!prepSeated || !prepSeated.isVrm || !prepSeated.isVrm0) throw new Error("VRM 0.x seated normalization failed!");
    if (!prepSeated.morphs.ih.length || !prepSeated.morphs.angry.length || !prepSeated.morphs.sorrow.length) {
      throw new Error("VRM 13-expression multi-vowel/mood morph bindings failed!");
    }
    if (!prepSeated.springBones || prepSeated.springBones.length !== 1 || prepSeated.springBones[0].obj.name !== "HairJoint_Test") {
      throw new Error("VRM SpringBone filter failed to skip Bust or keep HairJoint!");
    }
    stage3dVrm.updateVrmAvatar(prepSeated, {
      tSec: 1.2, talking: true, mouthAmp: 0.7,
      vowels: { a: 0.5, i: 0.3, u: 0.1, e: 0.2, o: 0.4 },
      emotion: "angry", isPointingAccuse: true, alive: true
    });

    // Verify 3D Anatomical Model-Space Quaternion Solver across BOTH VRM 0.x AND non-identity VRM 1.0 skeletons (Seed-san style!)
    function buildFullRigForGeomCheck(isVrm1Style) {
      const rootNode = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(0.4, 1.7, 0.3);
      bodyGeo.translate(0, 0.85, 0);
      const skinMesh = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial());
      const hips = new THREE.Group(); hips.position.set(0, 0.9, 0);
      const spine = new THREE.Group(); spine.position.set(0, 0.2, 0);
      const head = new THREE.Group(); head.position.set(0, 0.4, 0);
      const lUA = new THREE.Group(); lUA.position.set(isVrm1Style ? 0.15 : -0.15, 0.2, 0);
      const lLA = new THREE.Group(); lLA.position.set(isVrm1Style ? 0 : -0.25, isVrm1Style ? 0.25 : 0, 0);
      const rUA = new THREE.Group(); rUA.position.set(isVrm1Style ? -0.15 : 0.15, 0.2, 0);
      const rLA = new THREE.Group(); rLA.position.set(isVrm1Style ? 0 : 0.25, isVrm1Style ? 0.25 : 0, 0);
      const lUL = new THREE.Group(); lUL.position.set(isVrm1Style ? 0.09 : -0.09, 0, 0);
      const lLL = new THREE.Group(); lLL.position.set(0, isVrm1Style ? 0.35 : -0.35, 0);
      if (isVrm1Style) {
        // Non-identity rest rotations like Seed-san (~170 deg thigh flip, ~90 deg arm orientation)
        lUL.quaternion.setFromEuler(new THREE.Euler(2.94, 0, 0));
        lUA.quaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI * 0.5));
        rUA.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI * 0.5));
      }
      rootNode.add(skinMesh, hips);
      hips.add(spine, lUL);
      lUL.add(lLL);
      spine.add(head, lUA, rUA);
      lUA.add(lLA);
      rUA.add(rLA);
      const boneNames = { hips, spine, head, leftUpperArm: lUA, leftLowerArm: lLA, rightUpperArm: rUA, rightLowerArm: rLA, leftUpperLeg: lUL, leftLowerLeg: lLL };
      Object.entries(boneNames).forEach(([k, v]) => { v.name = k; });
      const parserJson = isVrm1Style
        ? { nodes: [{ name: "hips" }, { name: "spine" }, { name: "head" }, { name: "leftUpperArm" }, { name: "leftLowerArm" }, { name: "rightUpperArm" }, { name: "rightLowerArm" }, { name: "leftUpperLeg" }, { name: "leftLowerLeg" }], extensions: { VRMC_vrm: { humanoid: { humanBones: { hips: { node: 0 }, spine: { node: 1 }, head: { node: 2 }, leftUpperArm: { node: 3 }, leftLowerArm: { node: 4 }, rightUpperArm: { node: 5 }, rightLowerArm: { node: 6 }, leftUpperLeg: { node: 7 }, leftLowerLeg: { node: 8 } } } } } }
        : { nodes: [{ name: "hips" }, { name: "spine" }, { name: "head" }, { name: "leftUpperArm" }, { name: "leftLowerArm" }, { name: "rightUpperArm" }, { name: "rightLowerArm" }, { name: "leftUpperLeg" }, { name: "leftLowerLeg" }], extensions: { VRM: { humanoid: { humanBones: Object.keys(boneNames).map((bn, idx) => ({ bone: bn, node: idx })) } } } };
      return { gltf: { scene: rootNode, parser: { json: parserJson } }, bones: boneNames };
    }

    [false, true].forEach(isVrm1 => {
      const rig = buildFullRigForGeomCheck(isVrm1);
      const av = stage3dVrm.prepareLoadedAvatar(rig.gltf, { mode: "seated", targetHeight: 2.10, baseY: 0 });
      av.root.updateMatrixWorld(true);
      // 1. Seated knee extends FORWARD (+Z), shin hangs DOWN (-Y), hips sit on cushion (y ~ 0.87)
      const qThigh = new THREE.Quaternion(); rig.bones.leftUpperLeg.getWorldQuaternion(qThigh);
      const thighLocalDown = isVrm1 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
      const thighWorld = thighLocalDown.clone().applyQuaternion(qThigh);
      if (thighWorld.z < 0.75) throw new Error("Seated thigh did not point forward (+Z) for vrm1=" + isVrm1 + ": z=" + thighWorld.z.toFixed(2));

      const hipPos = new THREE.Vector3(); rig.bones.hips.getWorldPosition(hipPos);
      if (hipPos.y < 0.78 || hipPos.y > 0.96) throw new Error("Seated hips height out of safe range (0.78..0.96) for vrm1=" + isVrm1 + ": y=" + hipPos.y.toFixed(2));

      // 2. Cheer arms raise OUTWARD & UPWARD (never inward stabbing into torso!) + turn head TOWARD +X when headYaw = +0.5
      for (let step = 0; step < 30; step++) {
        stage3dVrm.updateVrmAvatar(av, { tSec: 2.0, headYaw: 0.5, headPitch: 0, act: "celebrate", alive: true });
      }
      av.root.updateMatrixWorld(true);
      const qHead = new THREE.Quaternion(); rig.bones.head.getWorldQuaternion(qHead);
      const faceLocalFwd = (isVrm1 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1));
      const faceWorld = faceLocalFwd.clone().applyQuaternion(qHead);
      if (faceWorld.x < 0.30 || faceWorld.z < 0.5) throw new Error("Head yaw +0.5 turned wrong side for vrm1=" + isVrm1 + ": (" + faceWorld.x.toFixed(2) + ", " + faceWorld.z.toFixed(2) + ")");

      const qArmR = new THREE.Quaternion(); rig.bones.rightUpperArm.getWorldQuaternion(qArmR);
      const rArmLocalVec = isVrm1 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const rArmWorld = rArmLocalVec.clone().applyQuaternion(qArmR);
      if (rArmWorld.x > -0.25 || rArmWorld.y < 0.1) throw new Error("Right celebrate arm went inside chest or down for vrm1=" + isVrm1 + ": (" + rArmWorld.x.toFixed(2) + ", " + rArmWorld.y.toFixed(2) + ")");
    });

    if (!rHero) throw new Error("Real Three.js r128 character build failed!");

    // ==================== PHASE 3 VERIFICATION (REAL THREE.JS R128) ====================
    // P3-1. Tabletop Academy Life Props, Lantern Halos, Zero-GC Steam & Procedural Pavilion Group
    if (!rEnv.proceduralPavilionGroup || !rEnv.proceduralPavilionGroup.children.length) {
      throw new Error("proceduralPavilionGroup missing or empty!");
    }
    if (!rEnv.incenseEmberMat || !rEnv.lanternHaloMat || !rEnv.teaSteamPoints || (rEnv.teaSteamMeta || []).length < 36) {
      throw new Error("Phase 3 tabletop props, lantern halo, or tea steam points failed to build!");
    }
    update3DEnvironment(rSc, rEnv, { tSec: 2.5, p: "DAY_SPEECH", daylight: true, night: false }, {});
    const steamY0 = rEnv.teaSteamPoints.geometry.attributes.position.getY(0);
    if (typeof steamY0 !== "number" || Number.isNaN(steamY0) || steamY0 < 1.3) {
      throw new Error("Zero-GC tea steam update produced invalid Y coordinate: " + steamY0);
    }

    // P3-2. Per-Persona Idle Variety & Embedded AnimationMixer Support
    const archCheng = stage3dVrm.getIdleArchetype("小澄");
    const archXing = stage3dVrm.getIdleArchetype("星兒");
    if (!archCheng || !archXing || archCheng.rBend === archXing.rBend || archCheng.breathFreq === archXing.breathFreq) {
      throw new Error("Persona idle archetypes failed to differentiate 小澄 vs 星兒!");
    }
    const rigClip = buildFullRigForGeomCheck(false);
    rigClip.gltf.animations = [new THREE.AnimationClip("IdleSway", 1.0, [])];
    const clipAv = stage3dVrm.prepareLoadedAvatar(rigClip.gltf, { mode: "seated", targetHeight: 2.10, baseY: 0 });
    if (!clipAv.mixer || !stage3dVrm.playVrmClip(clipAv, 0)) {
      throw new Error("VRM AnimationMixer initialization or playVrmClip failed!");
    }
    for (let sStep = 0; sStep < 15; sStep++) {
      stage3dVrm.updateVrmAvatar(clipAv, { tSec: 1.0 + sStep * 0.05, personaName: "暖暖", alive: true, moodKey: "day", emotion: "neutral" });
    }
    if (!(clipAv.happyAmt > 0.05)) {
      throw new Error("Warm persona idleHappy blend did not activate for 暖暖! happyAmt=" + clipAv.happyAmt);
    }
    stage3dVrm.stopVrmClip(clipAv);
  `, realThreeCtx);
}

// 2. 1-to-1 Asset Parity, CSS Brace Balance & Zero !important in Custom Styles
const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = `${dir}/${d.name}`;
    if (p === "js/vendor") return [];
    return d.isDirectory() ? walk(p) : [p];
  });

const diskFiles = new Set([...walk("css"), ...walk("js")]);
const htmlFiles = new Set([...cssMatches, ...jsMatches]);
for (const f of diskFiles) {
  if (!htmlFiles.has(f)) throw new Error(`Orphan file not loaded in ai.html: ${f}`);
}
for (const f of htmlFiles) {
  if (!diskFiles.has(f)) throw new Error(`Missing file referenced in ai.html: ${f}`);
}
for (const f of cssMatches) {
  const c = fs.readFileSync(f, "utf8");
  if ((c.match(/\{/g) || []).length !== (c.match(/\}/g) || []).length) {
    throw new Error(`Unbalanced CSS braces in ${f}`);
  }
  if (f !== "css/tailwind-local.css" && c.replace(/\/\*[\s\S]*?\*\//g, "").includes("!important")) {
    throw new Error(`Unexpected !important found in ${f}`);
  }
}

// 3. DOM ID Coverage & innerHTML Safety Audit
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const missingIds = [];
const unsafeInnerHtml = [];
for (const f of jsMatches) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bel\("([A-Za-z0-9_-]+)"\)/g)) {
    const id = m[1];
    if (!htmlIds.has(id)) missingIds.push(`${f}: el("${id}")`);
  }
  // Check dynamic .innerHTML assignments using user/state strings without escapeHtml
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (line.includes(".innerHTML") && (line.includes("item.text") || line.includes("s.name")) && !line.includes("escapeHtml")) {
      unsafeInnerHtml.push(`${f}:${i + 1}: ${line.trim()}`);
    }
  });
}
if (missingIds.length) {
  throw new Error(`Missing DOM IDs referenced in JS:\n  ${missingIds.join("\n  ")}`);
}
if (unsafeInnerHtml.length) {
  throw new Error(`Potentially unescaped .innerHTML sites:\n  ${unsafeInnerHtml.join("\n  ")}`);
}

// 4. Syntax check all local JS modules
for (const f of jsMatches) {
  execFileSync(process.execPath, ["--check", f], { stdio: "inherit" });
}
console.log(`[OK] Syntax, 1-to-1 parity, offline Tailwind, zero-!important, DOM ID & XSS checks passed (${cssMatches.length} CSS + ${jsMatches.length} JS modules)`);

// 5. Shared-Scope Full End-to-End Runtime Simulation (Stage A/B/C/D + 3D + 2D + Voice + Day 1 & Day 2 AI)
function makeVec3(x = 0, y = 0, z = 0) {
  return {
    x, y, z,
    set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; },
    setY(b) { this.y = b; return this; },
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; },
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
    clone() { return makeVec3(this.x, this.y, this.z); },
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; },
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; },
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; },
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; },
    lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; },
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; },
    normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; },
    crossVectors(a, b) { this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; return this; },
    applyQuaternion() { return this; },
    project() { this.x = 0.2; this.y = 0.1; this.z = 0.5; return this; },
  };
}
function makeColor(c = 0) {
  return { c, setHex(h) { this.c = h; return this; }, set(v) { this.c = v; return this; }, lerp() { return this; } };
}
function makeObj3D(geo, mat) {
  return {
    geometry: geo || { attributes: { position: { setXYZ() { }, needsUpdate: false } }, dispose() { } },
    material: mat || { color: makeColor(), emissive: makeColor(), emissiveIntensity: 0, opacity: 1, dispose() { } },
    position: makeVec3(), rotation: makeVec3(), scale: makeVec3(1, 1, 1), quaternion: {},
    children: [], visible: true, castShadow: false, receiveShadow: false, frustumCulled: true, userData: {},
    add(...items) { items.forEach(x => this.children.push(x)); },
    remove(item) { const k = this.children.indexOf(item); if (k >= 0) this.children.splice(k, 1); },
    lookAt() { }, updateMatrixWorld() { }, getWorldPosition(t) { return t.copy(this.position); },
  };
}
function makeGeo() {
  return {
    attributes: { position: { setXYZ() { }, needsUpdate: false } },
    translate() { return this; }, rotateX() { return this; }, rotateY() { return this; },
    setAttribute() { return this; }, setIndex() { return this; }, computeVertexNormals() { return this; }, setFromPoints() { return this; }, dispose() { },
  };
}

const THREE = {
  FrontSide: 0, BackSide: 1, DoubleSide: 2, AdditiveBlending: 2, NearestFilter: 1003, LinearFilter: 1006, RGBAFormat: 1023, RepeatWrapping: 1000,
  PCFSoftShadowMap: 2, sRGBEncoding: 3001, ACESFilmicToneMapping: 4, EquirectangularReflectionMapping: 303,
  Vector2: function (x = 0, y = 0) { this.x = x; this.y = y; },
  Vector3: function (x, y, z) { return makeVec3(x, y, z); },
  Color: function (c) { const col = makeColor(c); col.convertSRGBToLinear = () => col; return col; },
  Plane: function () { return {}; },
  Box3: function () {
    return {
      min: makeVec3(-0.5, 0, -0.5), max: makeVec3(0.5, 1.8, 0.5),
      setFromObject() { return this; },
      getSize(v) { v.set(1, 1.8, 1); return v; },
      getCenter(v) { v.set(0, 0.9, 0); return v; }
    };
  },
  PMREMGenerator: function () {
    return {
      compileEquirectangularShader() { },
      fromScene: () => ({ texture: { dispose() { } } }),
      fromEquirectangular: () => ({ texture: { dispose() { } } }),
    };
  },
  TextureLoader: function () { return { load() { } }; },
  Raycaster: function () {
    return {
      setFromCamera() { }, intersectObjects: () => [], intersectObject: () => [],
      ray: { intersectPlane: (_, t) => { t.set(1, 1.35, -1); return true; } },
    };
  },
  Scene: function () { const o = makeObj3D(); o.fog = null; o.background = null; o.environment = null; return o; },
  Group: function () { return makeObj3D(); },
  Object3D: function () { return makeObj3D(); },
  PerspectiveCamera: function () { const o = makeObj3D(); o.aspect = 1; o.fov = 44; o.updateProjectionMatrix = () => { }; return o; },
  WebGLRenderer: function () { return { shadowMap: {}, outputEncoding: 0, toneMapping: 0, toneMappingExposure: 1, setPixelRatio() { }, setSize() { }, render() { } }; },
  FogExp2: function (c, d) { return { color: makeColor(c), density: d }; },
  DataTexture: function () { return { minFilter: 0, magFilter: 0, generateMipmaps: false, needsUpdate: false, dispose() { } }; },
  CanvasTexture: function (c) { return { image: c || null, wrapS: 0, wrapT: 0, repeat: { set() { } }, offset: { x: 0, y: 0 }, minFilter: 0, encoding: 0, needsUpdate: false, dispose() { } }; },
  HemisphereLight: function (s, g, i) { const o = makeObj3D(); o.color = makeColor(s); o.groundColor = makeColor(g); o.intensity = i; return o; },
  DirectionalLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; o.shadow = { mapSize: {}, camera: {} }; return o; },
  PointLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; return o; },
  SpotLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; o.target = null; return o; },
  SphereGeometry: function () { return makeGeo(); },
  ConeGeometry: function () { return makeGeo(); },
  CylinderGeometry: function () { return makeGeo(); },
  RingGeometry: function () { return makeGeo(); },
  TorusGeometry: function () { return makeGeo(); },
  OctahedronGeometry: function () { return makeGeo(); },
  CircleGeometry: function () { return makeGeo(); },
  PlaneGeometry: function () { return makeGeo(); },
  BoxGeometry: function () { return makeGeo(); },
  BufferGeometry: function () { return makeGeo(); },
  TubeGeometry: function () { return makeGeo(); },
  LatheGeometry: function () { return makeGeo(); },
  BufferAttribute: function () { return { setXYZ() { }, needsUpdate: false }; },
  QuadraticBezierCurve3: function (p0, p1, p2) { return { getPoints: () => [p0, p1, p2], getPoint: () => makeVec3(0, 2, 0) }; },
  MeshBasicMaterial: function (o = {}) { return { color: makeColor(o.color), map: o.map || null, opacity: o.opacity ?? 1, needsUpdate: false, dispose() { } }; },
  MeshStandardMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, opacity: 1, dispose() { } }; },
  MeshPhysicalMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, clearcoat: o.clearcoat ?? 0, opacity: 1, dispose() { } }; },
  MeshToonMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, opacity: 1, userData: {}, dispose() { } }; },
  ShaderMaterial: function () { return { uniforms: {}, dispose() { } }; },
  PointsMaterial: function (o = {}) { return { color: makeColor(o.color), opacity: o.opacity ?? 1, dispose() { } }; },
  LineBasicMaterial: function (o = {}) { return { color: makeColor(o.color), opacity: o.opacity ?? 1, dispose() { } }; },
  Mesh: function (g, m) { return makeObj3D(g, m); },
  Points: function (g, m) { return makeObj3D(g, m); },
  Line: function (g, m) { return makeObj3D(g, m); },
};

const initialHiddenIds = new Set();
for (const tagM of html.matchAll(/<[a-z][^>]*>/gi)) {
  const tagStr = tagM[0];
  const idM = tagStr.match(/\sid="([^"]+)"/);
  const clsM = tagStr.match(/\sclass="([^"]+)"/);
  if (idM && clsM && clsM[1].split(/\s+/).includes("hidden")) {
    initialHiddenIds.add(idM[1]);
  }
}

const memStorage = new Map();
const cache = new Map();
const makeEl = id => {
  if (cache.has(id)) return cache.get(id);
  const cl = new Set(initialHiddenIds.has(id) ? ["hidden"] : []);
  const _listeners = {};
  const _attrs = {};
  const _children = [];
  let _innerHtml = "";
  const guessTag = id === "body" ? "BODY"
    : (id === "playerSpeechInput" ? "TEXTAREA"
      : (id.startsWith("input") || id === "quickFreeInput" || id === "lastWordsFreeInput" ? "INPUT"
        : (id.startsWith("select") ? "SELECT" : "DIV")));
  const obj = {
    id, tagName: guessTag,
    value: id === "selectModeCount" ? "8" : (id === "selectAiDifficulty" ? "pro" : (id === "selectRuleDepth" ? "full" : "seer")),
    checked: id === "chkSheriffMode",
    textContent: "", disabled: false, width: 800, height: 420, style: {},
    _children,
    get children() { return _children; },
    get firstChild() { return _children.length ? _children[0] : null; },
    get innerHTML() { return _innerHtml; },
    set innerHTML(v) {
      _innerHtml = String(v == null ? "" : v);
      if (_innerHtml === "") _children.length = 0;
    },
    get className() { return Array.from(cl).join(" "); },
    set className(v) { cl.clear(); String(v || "").split(/\s+/).filter(Boolean).forEach(x => cl.add(x)); },
    classList: {
      add: (...c) => c.forEach(x => cl.add(x)),
      remove: (...c) => c.forEach(x => cl.delete(x)),
      toggle: (c, f) => f === undefined ? (cl.has(c) ? cl.delete(c) : cl.add(c)) : (f ? cl.add(c) : cl.delete(c)),
      contains: c => cl.has(c),
    },
    getAttribute: k => Object.prototype.hasOwnProperty.call(_attrs, String(k)) ? _attrs[String(k)] : null,
    setAttribute: (k, v) => { _attrs[String(k)] = String(v); },
    removeAttribute: k => { delete _attrs[String(k)]; },
    addEventListener: (type, fn) => { (_listeners[type] = _listeners[type] || []).push(fn); },
    removeEventListener: (type, fn) => { if (_listeners[type]) _listeners[type] = _listeners[type].filter(f => f !== fn); },
    dispatchEvent: ev => {
      const e = Object.assign({ target: obj, currentTarget: obj, preventDefault() { }, stopPropagation() { } }, ev);
      (_listeners[e.type] || []).slice().forEach(fn => fn(e));
    },
    querySelectorAll: sel => {
      if (sel === "button") return _children.filter(c => c && c.tagName === "BUTTON");
      const mEq = String(sel || "").match(/^\[([^=\]]+)="([^"]*)"\]$/);
      if (mEq) return _children.filter(c => c && c.getAttribute && c.getAttribute(mEq[1]) === mEq[2]);
      const mHas = String(sel || "").match(/^\[([^=\]]+)\]$/);
      if (mHas) return _children.filter(c => c && c.getAttribute && c.getAttribute(mHas[1]) !== null);
      return [];
    },
    querySelector: sel => obj.querySelectorAll(sel)[0] || null,
    appendChild: child => { _children.push(child); return child; },
    removeChild: child => { const idx = _children.indexOf(child); if (idx >= 0) _children.splice(idx, 1); return child; },
    focus() { },
    click() { obj.dispatchEvent({ type: "click" }); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 420 }),
    getContext: () => new Proxy({}, { get: (_, p) => p === "measureText" ? () => ({ width: 48 }): () => ({ addColorStop() { } })
  }),
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 420 }) },
};
cache.set(id, obj);
return obj;
};

const winListeners = {};
const sb = {
  THREE, console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Map, Set, Promise, AbortController,
  Uint8Array, Float32Array, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 1, clearTimeout() { }, setInterval: () => 1, clearInterval() { },
  requestAnimationFrame: () => 1, cancelAnimationFrame() { },
  performance: { now: () => 1000 },
  document: {
    hidden: false,
    getElementById: makeEl,
    createElement: t => {
      const n = makeEl("dyn_" + t + "_" + Math.random());
      n.tagName = String(t).toUpperCase();
      return n;
    },
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener() { },
    body: makeEl("body"),
  },
  localStorage: {
    getItem: k => memStorage.has(k) ? memStorage.get(k) : null,
    setItem: (k, v) => memStorage.set(k, String(v)),
  },
  speechSynthesis: { getVoices: () => [], cancel() { }, speak() { }, paused: false, speaking: false, pending: false },
  SpeechSynthesisUtterance: function (t) { this.text = t; },
  devicePixelRatio: 1, location: { protocol: "file:" },
  addEventListener: (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); },
  removeEventListener: (type, fn) => { if (winListeners[type]) winListeners[type] = winListeners[type].filter(f => f !== fn); },
  dispatchEvent: ev => {
    const e = Object.assign({ target: sb.document.body, preventDefault() { }, stopPropagation() { } }, ev);
    (winListeners[e.type] || []).slice().forEach(fn => fn(e));
  },
};
sb.window = sb;

const wolfTacticRowSeed = makeEl("wolfTacticRow");
["fake_seer", "deep_stealth", "pack_push"].forEach(tac => {
  const b = makeEl("dyn_wt_" + tac);
  b.tagName = "BUTTON";
  b.setAttribute("data-wolf-tactic", tac);
  wolfTacticRowSeed.appendChild(b);
});

const ctx = vm.createContext(sb);
for (const f of jsMatches) {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
}

sb.window.onload();
vm.runInContext(`
  // Stage A/B: Verify default anime voice profile + 8-seat Pro Difficulty + Sheriff Mode (1.5 votes) + Voice Accent & Typewriter Sync
  if (voice.accentMode !== "anime") throw new Error("Default voice accentMode should be 'anime'!");
  el("selectModeCount").value = "8";
  el("selectAiDifficulty").value = "pro";
  el("chkSheriffMode").checked = true;
  voice.accentMode = "tw";
  startNewGame();
  if (!state.match.sheriffSeatId) throw new Error("Sheriff seat should be assigned when chkSheriffMode is checked");
  drawSanctuaryFrame(1000);

  // Stage C: Skill FX (Seer Scan, Witch Heal/Poison, Hunter Shot), Close-Up Camera & Candle Easter Egg
  stage3d.triggerSkillFx("seer_scan", 1, 2, true);
  drawSanctuaryFrame(1200);
  stage3d.triggerSkillFx("witch_heal", 1, 3, false);
  drawSanctuaryFrame(1400);
  stage3d.triggerSkillFx("witch_poison", 1, 4, true);
  drawSanctuaryFrame(1600);
  stage3d.triggerSkillFx("hunter_shot", 1, 5, true);
  drawSanctuaryFrame(1800);
  stage3d.focusSeatCloseUp(2);
  drawSanctuaryFrame(1900);
  stage3d.clearCloseUp();
  stage3d.pokeCandle(2);
  drawSanctuaryFrame(2000);

  // Sunrise Dawn Sweep + Day 1 AI Speeches + Typewriter Audio Duration Sync
  startDayDiscussion("昨晚是平安夜");
  syncTypewriterToAudioDuration(3200);
  drawSanctuaryFrame(2200);
  state.match.seats.forEach(s => {
    const res = buildHeuristicAiSpeech(s);
    if (!res || !res.text) throw new Error("Empty speech for seat " + s.id);
    applySpeechInfluence(s, res);
    if (res.targetId && res.relationType) recordRelation(s.id, res.targetId, res.relationType);
    const ev = { day: 1, speakerId: s.id, claimRole: res.claimSeer ? "seer" : (res.claimRole || null), accuseId: res.accuseId || null, vouchId: res.vouchId || null, hasToxicSlip: Boolean(res.hasToxicSlip), text: res.text };
    state.match.daySpeechEvents.push(ev);
    state.match.allSpeechEvents.push(ev);
    state.match.logs.push({ day: 1, kind: "speech", speakerId: s.id, text: res.text });
  });
  state.activeSpeakerId = 2;
  state.match.seats[4].alive = false;
  state.playerMarks[3] = "wolf";
  state.playerMarks[4] = "good";
  stage3d.toggleIdCardPeek();
  stage3d.interactWithCrystal();
  state.dragAction = { active: true, moved: true, fromId: 1, startX: 400, startY: 300, curX: 280, curY: 160, snapId: 3 };
  stage3d.updateDragWorldPoint(280, 160);
  drawSanctuaryFrame(2400);
  state.dragAction.active = false;

  // Cycle all 3 camera presets & quality toggle
  stage3d.setCameraPreset("firstperson"); drawSanctuaryFrame(2600);
  stage3d.setCameraPreset("overview"); drawSanctuaryFrame(2800);
  stage3d.setCameraPreset("cinema"); drawSanctuaryFrame(3000);
  stage3d.toggleQualityMode(); drawSanctuaryFrame(3200);
  stage3d.toggleQualityMode();

  // Voting + Sheriff 1.5 Vote Weight + 3D Pooled Flying Ballots + 2D Switch
  startVotingPhase();
  state.selectedSeatId = 3;
  spawnBeam(2, 3, "#f43f5e", "vote", 500);
  drawSanctuaryFrame(3400);
  drawSanctuaryFrame(4100);
  finalizeVoteRound(3);
  stage3d.toggleViewMode(); drawSanctuaryFrame(4300);
  stage3d.toggleViewMode(); drawSanctuaryFrame(4500);

  // Day 2 multi-round memory deduction
  state.match.day = 2;
  state.match.daySpeechEvents = [];
  state.match.seats.filter(s => s.alive).forEach(s => {
    const res = buildHeuristicAiSpeech(s);
    if (!res || !res.text) throw new Error("Empty Day 2 speech for seat " + s.id);
  });

  // Stage B: Career Stats, Achievements & Replay Report Export + XSS Escape Check
  state.match.winner = "good";
  state.match.winReason = "成功找出所有酸民狼！";
  const badges = recordMatchCareer("good");
  openCareerModal();
  const report = buildMatchReplayReport();
  if (!report.includes("三好AI狼人殺") || !report.includes("凹嗚高手局")) {
    throw new Error("Replay report missing expected header or difficulty");
  }
  state.match.logs.push({ day: 2, kind: "speech", speakerId: 1, title: "01號", text: "<img src=x onerror=alert(1)>" });
  renderTimeline();
  if (el("chatTimeline").innerHTML.includes("<img")) throw new Error("Unescaped HTML in chatTimeline!");

  // Stage B: Wolf Night Partner Tactical Whisper & 3D Eye Contact
  el("selectPreferredRole").value = "wolf";
  startNewGame();
  drawSanctuaryFrame(5000);
  if (state.match.phase !== "NIGHT_WOLF") throw new Error("Expected NIGHT_WOLF phase when player is wolf");

  // v4.5 Competition Edition: Guishan Island Easter Egg + Respectful Roles + Lotus Awakening + Harmony Aura!
  stage3d.raycastGuishan(0.2, 0.1);
  stage3d.interactWithGuishan();
  if (ROLE_DEFS.witch.name !== "滴水奉茶師" || ROLE_DEFS.seer.name !== "明心觀察員" || ROLE_DEFS.hunter.name !== "直心糾察長") {
    throw new Error("Expected respectful Linmei Academy role names in ROLE_DEFS!");
  }
  el("selectPreferredRole").value = "seer";
  startNewGame();
  startDayDiscussion("昨晚是平安夜");
  const firstOther = getAliveSeats().find(s => s.id !== getPlayerId());
  state.selectedSeatId = firstOther.id;
  openSeatIntel(firstOther.id);
  useFourGConfidence();
  useFourGJoy();
  useFourGHope();
  useFourGConvenience();
  if (!state.match.threeGood.resonanceTriggered) throw new Error("Three-Goodness Lotus should awaken after all 3 virtues!");
  if (!state.match.goodwillVoteBonus) throw new Error("Good player should earn Golden Goodwill Vote (+1) on Lotus awakening!");
  state.match.harmonyScore = 38;
  drawSanctuaryFrame(5500);
  state.match.harmonyScore = 92;
  drawSanctuaryFrame(5800);

  // v5.0 Indie UX Flow + Flagship 3D Hero Character ("清茗") + 9-Character Genshin Showcase!
  if (!stage3d.hero) throw new Error("Flagship 3D Hero character '清茗' should be initialized!");
  stage3d.interactWithHeroHost();
  stage3d.setShowcaseMode(true);
  stage3d.setShowcaseTarget(2);
  drawSanctuaryFrame(6050);
  stage3d.setShowcaseTarget("hero");
  stage3d.setHeroVisualMode("sculpt3d");
  stage3d.setHeroPalette("teagold");
  stage3d.setHeroAction("purify_cast", 2500);
  drawSanctuaryFrame(6100);
  stage3d.setHeroPalette("inknight");
  stage3d.setHeroAction("celebrate", 2500);
  drawSanctuaryFrame(6300);
  stage3d.resetShowcaseAvatar();
  stage3d.setShowcaseMode(false);
  indieFlow.openSetupDrawer(true);
  indieFlow.openSetupDrawer(false);
  indieFlow.showRoleDealRitual("seer");
  indieFlow.hideRoleDealRitual();
  indieFlow.openJournal("vote");
  indieFlow.openPauseMenu(true);
  indieFlow.openPauseMenu(false);
  indieFlow.cycleSmartView();
  sound.playCardRustle();

  // Multi-Agent Game & AI Orchestrator E2E Check
  if (typeof orchestrator === "undefined") throw new Error("orchestrator must be defined!");
  const epochBefore = orchestrator.matchEpoch;
  let staleFired = false;
  orchestrator.schedule("stale_test", function () { staleFired = true; }, 10);
  const epochAfter = orchestrator.beginNewEpoch("smoke_verify");
  if (epochAfter !== epochBefore + 1) throw new Error("beginNewEpoch did not increment matchEpoch!");
  const sanRes = orchestrator.sanitizeAgentSpeech("這人白癡，女巫快用毒藥刀他");
  if (!sanRes.filtered || sanRes.text.includes("女巫") || sanRes.text.includes("毒藥") || sanRes.text.includes("白癡")) {
    throw new Error("sanitizeAgentSpeech failed to purify harsh/legacy terms: " + sanRes.text);
  }
  startNewGame();
  let directorEvtSeen = false;
  orchestrator.on("director:event", function () { directorEvtSeen = true; });
  const rolledEv = orchestrator.rollDailyTeaEvent(1);
  if (!rolledEv || !state.match.activeDirectorEvent || !directorEvtSeen) {
    throw new Error("rollDailyTeaEvent failed to activate daily campus event!");
  }
  state.match.activeDirectorEvent = { id: "mountain_mist", shortTitle: "林美山起霧求真", title: "霧", desc: "霧", badge: "80" };
  state.match.directorEventClearedDay = 0;
  state.match.harmonyScore = 82;
  const mistCleared = orchestrator.checkMistChallengeClear();
  if (!mistCleared) throw new Error("mountain_mist challenge should clear when harmonyScore >= 80!");
  orchestrator.recordTrace({ agent: "PersonaAgent", tier: "Smoke", ms: 2, compliance: true, summary: "<img src=x onerror=alert(1)>" });
  switchGuideTab("trace");
  if (el("orchTraceList").innerHTML.includes("<img")) throw new Error("Unescaped HTML in orchTraceList!");
  if (!orchestrator.traces || orchestrator.traces.length === 0) throw new Error("Orchestrator traces should be recorded!");
  resetMatchToLobby();
  if (state.match.activeDirectorEvent !== null || staleFired) throw new Error("resetMatchToLobby should clear activeDirectorEvent & stale timers!");

  // Spectator Dual-Faction Deduction E2E (Good Hunts Wolves + Wolf Hunts God-Roles)
  el("selectModeCount").value = "8";
  el("selectPreferredRole").value = "seer";
  startNewGame();
  const selfGood = getPlayerSeat();
  selfGood.alive = false;
  state.match.day = 2;
  state.match.phase = "DAY_SPEECH";
  if (!isSpectatorGuessActive() || getSpectatorGuessMode() !== "wolf_hunt") {
    throw new Error("Expected wolf_hunt mode for eliminated Good player!");
  }
  const realWolves = state.match.seats.filter(s => s.role === "wolf");
  realWolves.forEach(w => toggleSpectatorWolfGuess(w.id));
  if (!lockSpectatorGuess()) throw new Error("Locking 2 guessed wolves should succeed!");
  finishMatch("good", "測驗席外雙狼全中");
  if (!state.match.spectatorGuess.evaluated || !state.match.spectatorGuess.evaluated.perfect || state.match.spectatorGuess.evaluated.bonusPts !== 38) {
    throw new Error("Good spectator perfect guess score mismatch!");
  }
  const repGoodGuess = buildMatchReplayReport();
  if (!repGoodGuess.includes("席外推理開獎")) throw new Error("Replay report missing spectator guess section!");

  el("selectPreferredRole").value = "wolf";
  startNewGame();
  const selfWolf = getPlayerSeat();
  selfWolf.alive = false;
  state.match.day = 2;
  state.match.phase = "DAY_SPEECH";
  if (!isSpectatorGuessActive() || getSpectatorGuessMode() !== "god_hunt") {
    throw new Error("Expected god_hunt mode for eliminated Wolf player!");
  }
  if (getActiveGodRoleKeys().length !== 3) throw new Error("8-seat match should have 3 God-role slots!");
  const wolfPartner = state.match.seats.find(s => s.id !== selfWolf.id && s.role === "wolf");
  if (wolfPartner && assignSpectatorGodGuess(wolfPartner.id)) {
    throw new Error("Assigning a wolf teammate into god_hunt slot should be rejected!");
  }
  ["seer", "witch", "hunter"].forEach(rk => {
    const targetGod = state.match.seats.find(s => s.role === rk);
    selectSpectatorGodSlot(rk);
    if (!assignSpectatorGodGuess(targetGod.id)) throw new Error("Failed assigning god role: " + rk);
  });
  if (!lockSpectatorGuess()) throw new Error("Locking all 3 God-roles should succeed!");
  finishMatch("wolf", "測驗席外獵神全中");
  const evalWolf = state.match.spectatorGuess.evaluated;
  if (!evalWolf || !evalWolf.perfect || evalWolf.bonusPts !== 40) {
    throw new Error("Wolf spectator perfect god_hunt score mismatch!");
  }
  resetMatchToLobby();

  // Phase 1 + Phase 2 + Anti-Stall Queue Verification: Default Anime Voices, Deduped Avatar Queue, VRM3D Portrait Priority
  voice.accentMode = "anime";
  state.playerGender = "m";
  if (voice.resolvePersonaKey("你") !== "你_男") throw new Error("Player male voice key resolution failed!");
  if (stage3dVrm.getSeatModelSlug({ id: 1, name: "你" }) !== "player_male") throw new Error("Player male VRM slug resolution failed!");
  state.playerGender = "f";
  if (voice.resolvePersonaKey("你") !== "你" || stage3dVrm.getSeatModelSlug({ id: 1, name: "你" }) !== "player") {
    throw new Error("Player female default voice/VRM resolution failed!");
  }
  sound.applyPersonaVoiceChain("阿松", "accuse", 4);
  const vWeights = sound.getVoiceVowelWeights(4, 1500);
  if (!vWeights || typeof vWeights.a !== "number" || typeof vWeights.o !== "number") {
    throw new Error("Voice multi-vowel weight calculation failed!");
  }
  state.portraitStyle = "painted";
  state.playerGender = "f";
  if (getPortraitImageUrl({ id: 1, name: "你" }) !== "assets/portraits/player_female.jpg") {
    throw new Error("Painted female player portrait URL mismatch!");
  }
  state.playerGender = "m";
  if (getPortraitImageUrl({ id: 1, name: "你" }) !== "assets/portraits/player.jpg") {
    throw new Error("Painted male player portrait URL mismatch!");
  }
  state.playerGender = "f";
  if (getHostPortraitImageUrl() !== "assets/portraits/qingming.jpg") {
    throw new Error("Host Qingming painted portrait URL mismatch!");
  }
  if (getPortraitImageUrl({ id: 3, name: "暖暖" }) !== "assets/portraits/nuannuan.jpg") {
    throw new Error("Painted portrait fallback style toggle failed!");
  }
  state.portraitStyle = "vrm3d";
  if (getPortraitImageUrl({ id: 3, name: "暖暖" }) !== "assets/portraits_vrm/nuannuan.jpg") {
    throw new Error("Pre-extracted VRM3D portrait URL mismatch!");
  }
  stage3dTextures.registerVrmPortrait("暖暖", "data:image/png;base64,TEST");
  if (getPortraitImageUrl({ id: 3, name: "暖暖" }) !== "data:image/png;base64,TEST") {
    throw new Error("Custom uploaded VRM3D portrait override failed!");
  }
  state.portraitStyle = "painted";
  // Verify 60fps syncSeatAvatars calls NEVER re-queue already queued seats
  const origGLTFLoader = THREE.GLTFLoader;
  THREE.GLTFLoader = function () { return { load() { /* pending forever to verify deduped queue */ } }; };
  stage3d.avatarManifest = { player: "a", xiaocheng: "b", nuannuan: "c", asong: "d", xinger: "e", xiaoyun: "f", azhu: "g", chenchen: "h" };
  stage3d.avatarQueue = [];
  stage3d.avatarLoadingKeys = {};
  stage3d.avatarQueuedKeys = {};
  stage3d.avatarActiveLoads = 0;
  stage3d.avatarTotalQueued = 0;
  const expectedSeatLen = getStageSeatListFor3D().length;
  for (let call = 0; call < 12; call++) {
    stage3d.syncSeatAvatars(getStageSeatListFor3D());
  }
  if (expectedSeatLen < 6 || stage3d.avatarTotalQueued !== expectedSeatLen) {
    throw new Error("syncSeatAvatars failed queue dedupe across repeated frames: totalQueued=" + stage3d.avatarTotalQueued + " expected=" + expectedSeatLen);
  }
  THREE.GLTFLoader = origGLTFLoader;

  // Regression Guards from Bug Audit (Seer lock, Dead 4G gate, Full-Tie PK skip, Self-Claim regex, Track sync, Voice UI, Dynamic Seat FP Cam)
  el("selectModeCount").value = "6";
  el("selectPreferredRole").value = "seer";
  el("chkSheriffMode").checked = false;
  startNewGame();
  proceedToNightSeer();
  const sPid = getPlayerId();
  const sTargets = getAliveSeats().filter(function (s) { return s.id !== sPid; });
  state.selectedSeatId = sTargets[0].id;
  confirmTargetAction();
  if (!state.seerReveal || getPlayerSeat().checkedHistory.length !== 1) throw new Error("First Seer check should open reveal card!");
  state.selectedSeatId = sTargets[1].id;
  confirmTargetAction();
  if (getPlayerSeat().checkedHistory.length !== 1) throw new Error("Seer double-checked while reveal card was open!");
  state.seerReveal = null;

  state.match.phase = "DAY_SPEECH";
  getPlayerSeat().alive = false;
  if (canUseFourGNow() !== false) throw new Error("Dead player must not be allowed to use Four-Givings!");
  getPlayerSeat().alive = true;

  // Full all-alive tie must NOT trigger PK (empty voter pool)
  state.match.playerSeatId = 1;
  state.match.seats.forEach(function (s, idx) {
    s.id = idx + 1;
    s.publicVoteIntent = null;
    s.claimedRole = null;
    s.alive = idx < 4;
    s.role = idx === 3 ? "wolf" : "villager";
    s.team = idx === 3 ? "wolf" : "good";
    s.suspicionMap = { 1: 10, 2: 10, 3: 10, 4: 10 };
  });
  state.match.seats[1].suspicionMap[1] = 95; // Seat 2 votes Seat 1
  state.match.seats[2].suspicionMap[4] = 95; // Seat 3 votes Seat 4
  state.match.seats[3].suspicionMap[2] = 95; // Seat 4 votes Seat 2
  state.match.phase = "DAY_VOTE";
  state.match.pkCandidates = null;
  state.match.pkUsedToday = false;
  finalizeVoteRound(3); // Seat 1 votes Seat 3 -> 4-way 1-vote tie!
  if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
  if (state.match.pkCandidates || state.match.phase !== "DAY_VOTE_RESULT") {
    throw new Error("All-alive tie should skip PK and settle directly!");
  }

  // Self-claim speech regex accuracy
  state.match.seats.forEach(function (s) { s.alive = true; s.claimedRole = null; });
  state.match.phase = "DAY_PLAYER_TURN";
  el("playerSpeechInput").value = "誰是觀察員？大家覺得誰可疑？";
  submitPlayerSpeech();
  if (getPlayerSeat().claimedRole) throw new Error("Questioning role falsely marked player as claimed Seer!");
  state.match.phase = "DAY_PLAYER_TURN";
  el("playerSpeechInput").value = "我是真正的明心觀察員，昨晚查到2號好人！";
  submitPlayerSpeech();
  if (getPlayerSeat().claimedRole !== "seer") throw new Error("Explicit Seer claim failed to set claimedRole = seer!");

  // DAY_VOTE_RESULT audio track + empty getVoices() status UI refresh
  sound.trackMode = "auto";
  state.match.started = true;
  state.match.phase = "DAY_VOTE_RESULT";
  if (sound.resolveTargetTrack() !== "vote") throw new Error("resolveTargetTrack failed for DAY_VOTE_RESULT!");
  voice.zhVoices = [];
  voice.mode = "hybrid";
  voice.localNeuralAvailable = true;
  el("voiceEngineStatusLabel").textContent = "stale";
  voice.refreshVoices();
  if (!el("voiceEngineStatusLabel").textContent.includes("8 位真人級聲線")) {
    throw new Error("voice.refreshVoices failed to update status label when speechSynthesis list is empty!");
  }

  // Seat-aware First-Person POV camera & hands orientation when playerSeatId = 4
  el("selectModeCount").value = "6";
  startNewGame();
  state.match.playerSeatId = 4;
  stage3d.setCameraPreset("firstperson");
  stage3d.render(1000, el("sanctuaryCanvas"));
  stage3d.render(1016, el("sanctuaryCanvas"));
  if (stage3d.camera.position.z > -4.0) {
    throw new Error("First-person camera stayed near Seat 1 instead of playerSeatId=4! z=" + stage3d.camera.position.z);
  }
  if (Math.abs(Math.abs(stage3d.fpHandsGroup.rotation.y) - Math.PI) > 0.08) {
    throw new Error("fpHandsGroup failed to rotate toward Seat 4! rotY=" + stage3d.fpHandsGroup.rotation.y);
  }
  stage3d.setCameraPreset("cinema");

  // Full Maintenance Upgrades: resetMatchToLobby, syncPrefsToControls icon preservation, hidden portrait skip, roleDeal TDZ fix, showcase seat action, spectator seat click
  state.match.voteHistory = [{ day: 1 }];
  state.match.peaceNights = [1, 2];
  state.match.pkCandidates = [2, 3];
  state.match.witchPotions = { heal: false, purify: false };
  state.match.nightState = { wolfTarget: 2, seerTarget: 3, witchSaved: true, witchPoisonTarget: 4 };
  state.match.activeDirectorEvent = { id: "ev1" };
  state.match.playerKnownRoles = { 2: "wolf" };
  resetMatchToLobby();
  if (state.match.voteHistory.length !== 0 || !Array.isArray(state.match.peaceNights) || state.match.peaceNights.length !== 0 || state.match.pkCandidates !== null || !state.match.witchPotions.heal || !state.match.witchPotions.purify || state.match.nightState.wolfTarget !== null || state.match.nightState.witchSaved !== false || state.match.activeDirectorEvent !== null || Object.keys(state.match.playerKnownRoles).length !== 0) {
    throw new Error("resetMatchToLobby failed to reset all match fields cleanly!");
  }

  sound.muted = true;
  el("muteToggleLabel").textContent = "x";
  syncPrefsToControls();
  if (el("muteToggleLabel").textContent !== "音效:關") {
    throw new Error("syncPrefsToControls failed to update muteToggleLabel!");
  }
  sound.muted = false;
  syncPrefsToControls();

  el("spotlightStageBox").classList.remove("hidden");
  el("speakerPortraitCanvas").classList.add("hidden");
  let portraitDrawCalls = 0;
  el("speakerPortraitCanvas")._ctx2d = { clearRect: () => { portraitDrawCalls += 1; } };
  drawSpotlightPortrait(2000);
  if (portraitDrawCalls !== 0) throw new Error("drawSpotlightPortrait drew while canvas was hidden!");
  el("speakerPortraitCanvas")._ctx2d = null;
  el("speakerPortraitCanvas").classList.remove("hidden");

  indieFlow.showRoleDealRitual({ id: 1, role: "seer" });
  if (indieFlow.cardPeekTimer) clearTimeout(indieFlow.cardPeekTimer);
  indieFlow.hideRoleDealRitual();

  stage3d.showcaseMode = true;
  stage3d.setShowcaseTarget(4);
  stage3d.setHeroAction("celebrate", 1000);
  if (!stage3d.seats.slots[4] || stage3d.seats.slots[4].showcaseAction !== "celebrate") {
    throw new Error("stage3d.setHeroAction failed for showcase seat 4!");
  }
  stage3d.showcaseMode = false;
  stage3d.setShowcaseTarget("hero");

  el("selectModeCount").value = "6";
  startNewGame();
  getPlayerSeat().alive = false;
  state.match.phase = "NIGHT_WOLF";
  state.intelSeatId = null;
  const specTargetSeat = getAliveSeats().find(function (s) { return s.id !== getPlayerId(); });
  selectSeat(specTargetSeat.id);
  if (state.intelSeatId !== specTargetSeat.id) throw new Error("Spectator selectSeat failed to inspect seat during NIGHT_WOLF!");
  resetMatchToLobby();

  // v6.0 6-Pillar Gameplay Upgrade Checks (Contradictions, Logic Break, Wind Vane, Micro-Inspect, Wolf Tactics, Sheriff Transfer & Rally, Role Missions)
  el("selectModeCount").value = "8";
  el("selectPreferredRole").value = "seer";
  el("chkSheriffMode").checked = true;
  startNewGame();
  if (!state.match.roleMission || state.match.roleMission.role !== "seer") {
    throw new Error("Role mission failed to initialize for player Seer!");
  }
  const sOther = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; }) || state.match.seats.find(function (s) { return s.id !== getPlayerId(); });
  const sThird = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.id !== sOther.id; });
  state.match.day = 2;
  state.match.voteHistory = [{ day: 1, ballots: [{ voterId: sOther.id, targetId: sThird.id, weight: 1 }], tallies: {} }];
  const hypoContra = detectSpeechContradictions(sOther, { day: 2, speakerId: sOther.id, vouchId: sThird.id, hasToxicSlip: false });
  if (!hypoContra || hypoContra.code !== "vote_hypocrisy") {
    throw new Error("detectSpeechContradictions failed to catch cross-round vote hypocrisy!");
  }
  state.match.playerKnownRoles[sThird.id] = "good_verified";
  const factContra = detectSpeechContradictions(sOther, { day: 2, speakerId: sOther.id, accuseId: sThird.id, hasToxicSlip: false });
  if (!factContra || factContra.code !== "known_fact_clash") {
    throw new Error("detectSpeechContradictions failed to catch Seer known-good fact clash!");
  }
  state.match.daySpeechEvents = [{ day: 2, speakerId: sThird.id, accuseId: sOther.id, hasToxicSlip: false }];
  state.match.detectedContradictions = [{ day: 2, speakerId: sOther.id, code: factContra.code }];
  const windVane = computeTableWindVane();
  if (windVane.topHeatSeatId !== sOther.id || windVane.contradictionCount !== 1 || !windVane.summaryText.includes("茶席風向")) {
    throw new Error("computeTableWindVane returned invalid wind-vane summary: " + JSON.stringify(windVane));
  }

  // Micro-expression inspect charges (1 normal -> 2 during truth_lantern)
  state.match.phase = "DAY_SPEECH";
  state.match.activeDirectorEvent = null;
  state.match.microInspectCountToday = 0;
  sOther.microPulse = 88;
  if (!inspectSeatMicroExpression(sOther.id) || state.match.stats.microInspectsUsed !== 1) {
    throw new Error("First micro-expression inspect should succeed!");
  }
  if (!sOther.sweatExposed) {
    throw new Error("High-pulse wolf did not get sweatExposed on high reading!");
  }
  if (inspectSeatMicroExpression(sThird.id) !== false) {
    throw new Error("Micro-expression inspect should enforce daily cap 1 normally!");
  }
  state.match.activeDirectorEvent = { id: "truth_lantern" };
  if (!inspectSeatMicroExpression(sThird.id) || state.match.stats.microInspectsUsed !== 2) {
    throw new Error("truth_lantern should raise daily micro-inspect cap to 2!");
  }

  // Evidence Card ("呈堂證供") -> Logic Break spike
  const goodObserver = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.id !== sOther.id && s.team === "good"; });
  goodObserver.suspicionMap[sOther.id] = 45;
  pinClue(sOther.id, "⚡" + factContra.label, factContra.rebuttalText, "contradiction");
  state.match.phase = "DAY_PLAYER_TURN";
  {
    const chipBtns = [];
    const origAppend = el("quickSpeechChips").appendChild;
    el("quickSpeechChips").appendChild = function (n) { chipBtns.push(n); };
    preparePlayerSpeechPanel();
    el("quickSpeechChips").appendChild = origAppend;
    if (!chipBtns.some(function (b) { return String(b.innerHTML).includes("呈堂證供"); })) {
      throw new Error("preparePlayerSpeechPanel failed to upgrade Card 3 into Evidence Card!");
    }
  }
  state.match.pendingEvidenceTargetId = sOther.id;
  state.match.pendingEvidenceClueId = state.match.pinnedClues[0].id;
  el("playerSpeechInput").value = factContra.rebuttalText;
  submitPlayerSpeech();
  if (state.match.stats.logicBreaksLanded !== 1 || goodObserver.suspicionMap[sOther.id] < 65) {
    throw new Error("Logic Break failed to spike good AI suspicion! landed=" + state.match.stats.logicBreaksLanded + " sus=" + goodObserver.suspicionMap[sOther.id]);
  }

  // Wolf Night Tactic -> deep_stealth suppresses fakeSeer
  el("selectPreferredRole").value = "wolf";
  startNewGame();
  {
    const wolfMate = state.match.seats.find(function (s) { return s.id !== getPlayerId() && s.role === "wolf"; });
    if (wolfMate) {
      state.match.wolfTactic = "deep_stealth";
      const stealthRes = buildHeuristicAiSpeech(wolfMate);
      if (stealthRes.claimSeer || stealthRes.hasToxicSlip) {
        throw new Error("deep_stealth wolf tactic failed to suppress fake-Seer / toxic slip!");
      }
    }
  }

  // Sheriff Rally + Sheriff Badge Transfer
  el("selectPreferredRole").value = "seer";
  el("chkSheriffMode").checked = true;
  startNewGame();
  state.match.sheriffSeatId = getPlayerId();
  state.match.phase = "DAY_VOTE";
  const rallyTgt = state.match.seats.find(function (s) { return s.id !== getPlayerId(); });
  state.selectedSeatId = rallyTgt.id;
  if (!useSheriffRallyCall() || state.match.convenienceRallyTargetId !== rallyTgt.id) {
    throw new Error("useSheriffRallyCall failed for player Sheriff!");
  }
  let sheriffTransferCbCalled = false;
  handleSheriffEliminated(getPlayerSeat(), function () { sheriffTransferCbCalled = true; });
  if (state.match.phase !== "SHERIFF_TRANSFER") {
    throw new Error("Player Sheriff elimination must enter SHERIFF_TRANSFER phase!");
  }
  resolvePlayerSheriffTransfer(rallyTgt.id);
  if (!sheriffTransferCbCalled || state.match.sheriffSeatId !== rallyTgt.id) {
    throw new Error("resolvePlayerSheriffTransfer failed to pass badge to " + rallyTgt.id);
  }
  // Role mission completion & achievements
  el("selectPreferredRole").value = "villager";
  startNewGame();
  state.match.stats.cluesCaught = 1;
  state.match.stats.contradictionsFound = 1;
  state.match.stats.logicBreaksLanded = 1;
  state.match.stats.microWolfSpotted = 1;
  state.match.stats.sheriffPassed = 1;
  const misDone = evaluateRoleMission();
  if (!misDone || !misDone.completed) {
    throw new Error("Villager Role Mission failed to evaluate as completed!");
  }
  state.match.phase = "GAME_OVER";
  state.match.winner = "good";
  recordMatchCareer("good");
  const careerNow = loadCareerStats();
  if (careerNow.unlockedBadges.indexOf("logic_breaker") === -1 || careerNow.unlockedBadges.indexOf("mission_ace") === -1) {
    throw new Error("v6.0 achievements failed to unlock: " + JSON.stringify(careerNow.unlockedBadges));
  }
  resetMatchToLobby();

  // v6.1 UI Craft, Ergonomics, Always-On Seat Quick Bar & Keyboard Shortcut E2E Checks
  ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalPauseMenu", "heroSheetLightbox", "setupDrawer", "roleDealOverlay"].forEach(function (mid) {
    el(mid).classList.add("hidden");
  });
  if (!el("seatButtonStrip").classList.contains("hidden")) {
    throw new Error("seatButtonStrip should be hidden in LOBBY!");
  }
  el("selectModeCount").value = "8";
  el("selectPreferredRole").value = "seer";
  el("chkSheriffMode").checked = true;
  startNewGame();
  indieFlow.hideRoleDealRitual();

  // 1. Always-on seatButtonStrip in NIGHT_SEER + disabled Confirm guard
  proceedToNightSeer();
  if (el("seatButtonStrip").classList.contains("hidden")) {
    throw new Error("seatButtonStrip should stay visible during NIGHT_SEER!");
  }
  state.selectedSeatId = null;
  renderNightAndHunterPanel("NIGHT_SEER");
  if (!el("btnConfirmTarget").disabled) {
    throw new Error("btnConfirmTarget must be disabled when no target selected!");
  }
  const seerCheckTgt = getAliveSeats().find(s => s.id !== getPlayerId());
  openSeatIntel(seerCheckTgt.id);
  if (el("btnIntelQuickAct").classList.contains("hidden") || !el("btnIntelQuickAct").textContent.includes("立即查證")) {
    throw new Error("btnIntelQuickAct failed to show quick Seer check action!");
  }
  el("btnIntelQuickAct").click();
  if (!state.seerReveal || state.seerReveal.targetId !== seerCheckTgt.id) {
    throw new Error("btnIntelQuickAct click failed to trigger Seer check!");
  }
  state.seerReveal = null;

  // 2. NIGHT_WOLF teammate disabled styling + Lobby/GameOver/SheriffTransfer hide check
  el("selectPreferredRole").value = "wolf";
  startNewGame();
  indieFlow.hideRoleDealRitual();
  if (el("seatButtonStrip").classList.contains("hidden")) {
    throw new Error("seatButtonStrip should be visible during NIGHT_WOLF!");
  }
  if (!el("seatButtonStrip")._children.some(b => b.classList.contains("is-disabled-target"))) {
    throw new Error("Wolf teammate pill should carry is-disabled-target during NIGHT_WOLF!");
  }

  // 3. Top HUD 1-click Auto-Play toggle sync
  state.autoPlay = false;
  indieFlow.syncBodyScreenState();
  if (el("btnQuickAutoHud").classList.contains("is-active") || el("hudAutoLabel").textContent !== "自動") {
    throw new Error("HUD Auto button initial state mismatch!");
  }
  el("btnQuickAutoHud").click();
  if (!state.autoPlay || !el("btnQuickAutoHud").classList.contains("is-active") || el("hudAutoLabel").textContent !== "自動:開") {
    throw new Error("btnQuickAutoHud click failed to toggle autoPlay and sync HUD label!");
  }
  el("btnQuickAutoHud").click();
  if (state.autoPlay) throw new Error("Second btnQuickAutoHud click failed to turn autoPlay off!");

  // 4. Live Typewriter partial clue highlighting & XSS escape
  renderInteractiveSpotlightText("02號明心觀察員<img src=x onerror=alert(1)>", { id: 3, name: "暖暖" }, true);
  if (el("spotlightText").innerHTML.includes("」") || el("spotlightText").innerHTML.includes("<img")) {
    throw new Error("Partial typewriter spotlight text leaked closing quote or unescaped tag!");
  }
  if (!el("spotlightText").innerHTML.includes("clue-seat") || !el("spotlightText").innerHTML.includes("clue-role")) {
    throw new Error("Live partial typewriter failed to highlight clickable clue tokens!");
  }

  // 5. Cycle speech target + Tab / Q / Input guard / Modal guard / Enter vote
  el("selectPreferredRole").value = "villager";
  startNewGame();
  indieFlow.hideRoleDealRitual();
  state.match.phase = "DAY_PLAYER_TURN";
  state.selectedSeatId = null;
  preparePlayerSpeechPanel();
  if (el("quickSpeechChips").querySelectorAll("button").length !== 3) {
    throw new Error("preparePlayerSpeechPanel should render 3 Q/W/E speech cards!");
  }
  const initialTargetTxt = el("playerSpeechTargetLabel").textContent;
  el("btnCycleSpeechTarget").click();
  if (el("playerSpeechTargetLabel").textContent === initialTargetTxt) {
    throw new Error("First btnCycleSpeechTarget click did not advance to the next target!");
  }
  const beforeTabTarget = state.selectedSeatId;
  window.dispatchEvent({ type: "keydown", key: "Tab", target: document.body });
  if (state.selectedSeatId === beforeTabTarget) {
    throw new Error("Tab shortcut in DAY_PLAYER_TURN did not cycle speech target!");
  }
  // Input focus guard: typing 'a' inside INPUT must not toggle autoPlay
  const autoBeforeInput = state.autoPlay;
  window.dispatchEvent({ type: "keydown", key: "a", target: el("quickFreeInput") });
  if (state.autoPlay !== autoBeforeInput) {
    throw new Error("Shortcut fired while focus was inside an INPUT element!");
  }
  // Normal 'a' key toggles autoPlay, then toggle back; 'j' opens Journal, 'Escape' closes Journal
  window.dispatchEvent({ type: "keydown", key: "a", target: document.body });
  if (state.autoPlay === autoBeforeInput) throw new Error("'a' keyboard shortcut failed to toggle autoPlay!");
  window.dispatchEvent({ type: "keydown", key: "a", target: document.body });
  window.dispatchEvent({ type: "keydown", key: "j", target: document.body });
  if (el("modalJournal").classList.contains("hidden")) throw new Error("'j' shortcut failed to open Journal!");
  window.dispatchEvent({ type: "keydown", key: "Escape", target: document.body });
  if (!el("modalJournal").classList.contains("hidden")) throw new Error("'Escape' failed to close Journal!");

  // Blocking modal guard: 'a' must NOT fire while modalPauseMenu is open
  indieFlow.openPauseMenu(true);
  window.dispatchEvent({ type: "keydown", key: "a", target: document.body });
  if (state.autoPlay !== autoBeforeInput) throw new Error("Shortcut fired behind open modalPauseMenu!");
  window.dispatchEvent({ type: "keydown", key: "Escape", target: document.body });
  if (!el("modalPauseMenu").classList.contains("hidden")) throw new Error("'Escape' failed to close modalPauseMenu!");

  // 'q' plays first speech card during DAY_PLAYER_TURN
  window.dispatchEvent({ type: "keydown", key: "q", target: document.body });
  if (state.match.phase === "DAY_PLAYER_TURN") {
    throw new Error("'q' shortcut failed to play speech card 1 in DAY_PLAYER_TURN!");
  }

  // DAY_VOTE: PK disabled pills, re-click confirm badge, empty selection guard, Enter vote
  const aliveVoters = getAliveSeats().filter(s => s.id !== getPlayerId());
  state.match.phase = "DAY_VOTE";
  state.match.pkCandidates = [aliveVoters[0].id, aliveVoters[1].id];
  state.selectedSeatId = null;
  updateAllUI();
  if (!el("btnCastVote").disabled) throw new Error("btnCastVote must stay disabled before selecting a valid vote target!");
  state.selectedSeatId = aliveVoters[0].id;
  updateAllUI();
  if (el("btnCastVote").disabled) throw new Error("btnCastVote should enable once valid PK candidate is selected!");
  const seatStripHtml = el("seatButtonStrip")._children.map(c => c._children.map(x => x.textContent).join("|")).join(";");
  if (!seatStripHtml.includes("再點")) {
    throw new Error("Selected vote pill failed to render double-click confirm badge!");
  }
  window.dispatchEvent({ type: "keydown", key: "Enter", target: document.body });
  if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
  if (state.match.phase !== "DAY_VOTE_RESULT" && state.match.phase !== "GAME_OVER" && state.match.phase !== "HUNTER_TRIGGER") {
    throw new Error("'Enter' shortcut failed to submit vote in DAY_VOTE! phase=" + state.match.phase);
  }
  resetMatchToLobby();

  // Game Reasonableness & Fairness Regression Suite
  {
    // R1. Tie-Breaker PK defense speeches (AI & Player)
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const aiAliveR = getAliveSeats().filter(s => s.id !== getPlayerId());
    const pkA = aiAliveR[0];
    const pkB = aiAliveR[1];
    state.match.phase = "DAY_SPEECH";
    state.match.pkCandidates = [pkA.id, pkB.id];
    const aiPkSpeech = buildHeuristicAiSpeech(pkA);
    if (!aiPkSpeech || aiPkSpeech.accuseId !== pkB.id || !aiPkSpeech.text.includes("PK")) {
      throw new Error("PK candidate AI failed to deliver PK defense targeting rival! got=" + JSON.stringify(aiPkSpeech));
    }
    state.match.pkCandidates = [getPlayerId(), pkA.id];
    state.match.phase = "DAY_PLAYER_TURN";
    state.selectedSeatId = null;
    {
      const pkCards = [];
      const origApp = el("quickSpeechChips").appendChild;
      el("quickSpeechChips").appendChild = function (n) { pkCards.push(n); };
      preparePlayerSpeechPanel();
      el("quickSpeechChips").appendChild = origApp;
      if (!el("playerTurnHeading").textContent.includes("PK") || !pkCards[0] || !String(pkCards[0].innerHTML).includes("PK 拉票") || !String(pkCards[0].innerHTML).includes("平票 PK")) {
        throw new Error("Player PK turn failed to render PK rebuttal card! got=" + (pkCards[0] ? pkCards[0].innerHTML : "none"));
      }
    }

    // R2. Real Seer Multi-Night Memory & Vote Iron Rule
    resetMatchToLobby();
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const aiSeer = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "seer");
    const liveWolf = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "wolf");
    const liveGood = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "villager");
    state.match.day = 2;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    aiSeer.checkedHistory = [
      { day: 1, targetId: liveWolf.id, isWolf: true },
      { day: 2, targetId: liveGood.id, isWolf: false }
    ];
    const seerDay2 = buildHeuristicAiSpeech(aiSeer);
    if (!seerDay2.claimSeer || seerDay2.accuseId !== liveWolf.id || seerDay2.checkedWolfId !== liveWolf.id) {
      throw new Error("AI Seer forgot earlier alive checked Wolf on Day 2! got=" + JSON.stringify(seerDay2));
    }
    // Vote iron rule: must vote alive checked Wolf even if rally points to verified Good; must NEVER vote verified Good
    aiSeer.publicVoteIntent = null;
    state.match.convenienceRallyTargetId = liveGood.id;
    aiSeer.suspicionMap[liveGood.id] = 98;
    state.match.phase = "DAY_VOTE";
    finalizeVoteRound(liveGood.id);
    if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
    const lastVhR2 = state.match.voteHistory[state.match.voteHistory.length - 1];
    const seerBallot1 = (lastVhR2.ballots || []).find(b => b.voterId === aiSeer.id);
    if (!seerBallot1 || seerBallot1.targetId !== liveWolf.id) {
      throw new Error("AI Seer failed to prioritize alive checked Wolf in voting! ballot=" + JSON.stringify(seerBallot1));
    }
    liveWolf.alive = false;
    aiSeer.publicVoteIntent = null;
    state.match.convenienceRallyTargetId = liveGood.id;
    aiSeer.suspicionMap[liveGood.id] = 99;
    state.match.phase = "DAY_VOTE";
    state.match.pkCandidates = null;
    state.match.pkUsedToday = false;
    finalizeVoteRound(liveGood.id);
    if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
    const lastVhR2b = state.match.voteHistory[state.match.voteHistory.length - 1];
    const seerBallot2 = (lastVhR2b.ballots || []).find(b => b.voterId === aiSeer.id);
    if (seerBallot2 && seerBallot2.targetId === liveGood.id) {
      throw new Error("AI Seer voted their own verified Good check! ballot=" + JSON.stringify(seerBallot2));
    }

    // R3. Witch One-Time Save Reveal, Purified Casualty Silence & Never Voting Saved Seat
    resetMatchToLobby();
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const aiWitch = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "witch");
    const savedGood = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== aiWitch.id && s.role === "villager");
    const purifiedSeat = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== aiWitch.id && s.id !== savedGood.id);
    aiWitch.savedSeatId = savedGood.id;
    aiWitch.purifiedSeatId = purifiedSeat.id;
    purifiedSeat.alive = false;
    state.match.lastNightCasualties = [purifiedSeat.id];
    state.match.day = 2;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    const witchSp1 = buildHeuristicAiSpeech(aiWitch);
    if (witchSp1.claimRole !== "witch" || witchSp1.vouchId !== savedGood.id || !aiWitch.witchAnnouncedSave || witchSp1.text.includes("被酸民狼鎖定離席")) {
      throw new Error("Witch failed one-time save vouch or purified guard! got=" + JSON.stringify(witchSp1));
    }
    state.match.day = 3;
    state.match.lastNightCasualties = [];
    const witchSp2 = buildHeuristicAiSpeech(aiWitch);
    if (witchSp2.claimRole === "witch") {
      throw new Error("Witch repeated save-announcement on Day 3 instead of normal reasoning!");
    }
    aiWitch.publicVoteIntent = null;
    state.match.convenienceRallyTargetId = savedGood.id;
    aiWitch.suspicionMap[savedGood.id] = 99;
    state.match.phase = "DAY_VOTE";
    finalizeVoteRound(null);
    if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
    const lastVhR3 = state.match.voteHistory[state.match.voteHistory.length - 1];
    const witchBallot = (lastVhR3.ballots || []).find(b => b.voterId === aiWitch.id);
    if (witchBallot && witchBallot.targetId === savedGood.id) {
      throw new Error("AI Witch voted her own rescued savedSeatId!");
    }

    // R4 & R5. 4G Zero Role-Leak (Confidence & 2-suspect Joy) + Hope Excludes Player Wolf + Clear Breeze Zero Leak
    resetMatchToLobby();
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    const gPick = getAliveSeats().find(s => s.id !== getPlayerId() && s.team === "good");
    const wPick = getAliveSeats().find(s => s.id !== getPlayerId() && s.role === "wolf");
    state.selectedSeatId = gPick.id;
    useFourGConfidence();
    const confLogGood = state.match.logs[state.match.logs.length - 1].title;
    state.match.fourGivingsUsed.confidence = false;
    state.selectedSeatId = wPick.id;
    useFourGConfidence();
    const confLogWolf = state.match.logs[state.match.logs.length - 1].title;
    if (confLogGood.includes("好人鐵票") || confLogGood.includes("鐵票跟") || confLogWolf.includes("好人鐵票")) {
      throw new Error("useFourGConfidence leaked team identity in public log!");
    }
    useFourGJoy();
    const exposedAfterJoy = getAliveSeats().filter(s => s.id !== getPlayerId() && s.sweatExposed);
    if (exposedAfterJoy.length !== 2) {
      throw new Error("useFourGJoy should expose 2 suspects (1 wolf + 1 flustered good), got " + exposedAfterJoy.length);
    }

    // Clear Breeze must NOT expose a silent Wolf without observable toxic/contradiction/clash
    state.match.harmonyScore = 92;
    state.match.clearBreezeUsedDay = 0;
    state.match.daySpeechEvents = [{ day: 1, speakerId: wPick.id, hasToxicSlip: false, contradiction: null, claimRole: null }];
    state.match.speechQueue = [getPlayerId()];
    state.match.pinnedClues = [];
    advanceSpeechQueue();
    if (state.match.clearBreezeUsedDay === state.match.day || state.match.pinnedClues.length > 0) {
      throw new Error("Clear Breeze leaked a silent hidden Wolf with no observable clue!");
    }

    // Player as Wolf using 4G Hope must NEVER include self
    resetMatchToLobby();
    el("selectPreferredRole").value = "wolf";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    useFourGHope();
    const hopeTitle = state.match.logs[state.match.logs.length - 1].title;
    if (hopeTitle.includes("【" + getPlayerId() + "號】")) {
      throw new Error("useFourGHope included player Wolf in suspect pair! title=" + hopeTitle);
    }

    // R6. Justified Pivot (after Seer Wolf callout) must NOT trigger vote_hypocrisy
    resetMatchToLobby();
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const seatsR6 = state.match.seats.filter(s => s.id !== getPlayerId());
    state.match.day = 2;
    state.match.allSpeechEvents = [
      { day: 1, speakerId: seatsR6[0].id, vouchId: seatsR6[1].id, hasToxicSlip: false },
      { day: 2, speakerId: seatsR6[2].id, claimRole: "seer", checkedWolfId: seatsR6[1].id, accuseId: seatsR6[1].id, hasToxicSlip: false }
    ];
    const pivotContra = detectSpeechContradictions(seatsR6[0], { day: 2, speakerId: seatsR6[0].id, accuseId: seatsR6[1].id, hasToxicSlip: false });
    if (pivotContra) {
      throw new Error("Justified pivot after Seer-wolf callout falsely flagged as contradiction: " + JSON.stringify(pivotContra));
    }
    resetMatchToLobby();

    // Phase 1 Checks: 3x Persona Variants, Multi-Target Player Semantics, Lotus Fair Focus, Structured Gemini Meta, Synced Tutorial
    // P1-1. 3x Variants & fill() rotation
    Object.keys(PERSONA_FLAVORS).forEach(function (pKey) {
      const f = PERSONA_FLAVORS[pKey];
      if (!Array.isArray(f.openFirst) || f.openFirst.length < 3 || !Array.isArray(f.goodSus) || f.goodSus.length < 3) {
        throw new Error("PERSONA_FLAVORS variant array missing or <3 for " + pKey);
      }
    });
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const p1Speaker = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "villager");
    state.match.day = 1;
    const ctxDay1 = buildSpeechContext(p1Speaker);
    const lineDay1 = ctxDay1.fill(ctxDay1.flv.goodSus, { t: "02號測試" });
    state.match.day = 2;
    const ctxDay2 = buildSpeechContext(p1Speaker);
    const lineDay2 = ctxDay2.fill(ctxDay2.flv.goodSus, { t: "02號測試" });
    if (!lineDay1 || !lineDay2 || lineDay1.includes("{t}") || lineDay1 === lineDay2) {
      throw new Error("fill() array rotation failed or left placeholder! d1=" + lineDay1 + " d2=" + lineDay2);
    }

    // P1-2. Multi-Target Player Semantics ("A不像狼是好人，B才可疑是酸民狼") + Expanded Toxic Detection
    const multiTargets = state.match.seats.filter(s => s.id !== getPlayerId() && s.role === "villager");
    const mVouchSeat = multiTargets[0];
    const mAccuseSeat = multiTargets[1];
    const multiText = "我覺得" + mVouchSeat.id + "號不像狼是好人，" + mAccuseSeat.id + "號才可疑是酸民狼！";
    const multiAna = analyzeThreeGoodSpeech(multiText);
    if (multiAna.isToxic || multiAna.primaryVouchId !== mVouchSeat.id || multiAna.primaryAccuseId !== mAccuseSeat.id) {
      throw new Error("Multi-target clause parser failed! got=" + JSON.stringify(multiAna));
    }
    const toxicAna = analyzeThreeGoodSpeech("好了啦別演了，邏輯死亡");
    if (!toxicAna.isToxic) throw new Error("Expanded TOXIC_PATTERNS failed to catch sarcastic toxic phrase!");
    const witnessAi = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== mVouchSeat.id && s.id !== mAccuseSeat.id && s.role === "hunter");
    witnessAi.suspicionMap[mVouchSeat.id] = 55;
    witnessAi.suspicionMap[mAccuseSeat.id] = 50;
    state.match.phase = "DAY_PLAYER_TURN";
    el("playerSpeechInput").value = multiText;
    submitPlayerSpeech();
    const lastPlEv = state.match.allSpeechEvents[state.match.allSpeechEvents.length - 1];
    if (!lastPlEv || lastPlEv.vouchId !== mVouchSeat.id || lastPlEv.accuseId !== mAccuseSeat.id) {
      throw new Error("submitPlayerSpeech failed to record dual vouchId + accuseId! ev=" + JSON.stringify(lastPlEv));
    }
    if (witnessAi.suspicionMap[mVouchSeat.id] >= 55 || witnessAi.suspicionMap[mAccuseSeat.id] <= 50) {
      throw new Error("submitPlayerSpeech failed to move witness AI suspicion inversely for vouch vs accuse!");
    }

    // P1-3 (sync check). Structured Gemini JSON parser + markdown fence + plain-text fallback
    const pJson1 = parseGeminiStructuredSpeech("\\x60\\x60\\x60json\\n" + JSON.stringify({ text: "我仔細聽了前面，建議投 " + mAccuseSeat.id + " 號", accuseId: mAccuseSeat.id, vouchId: mVouchSeat.id, claimRole: null }) + "\\n\\x60\\x60\\x60");
    const pPlain = parseGeminiStructuredSpeech("我覺得還要再聽聽大家講話，先過！");
    if (!pJson1 || !pJson1.parsedJson || pJson1.accuseId !== mAccuseSeat.id || pJson1.vouchId !== mVouchSeat.id || !pPlain || pPlain.parsedJson) {
      throw new Error("parseGeminiStructuredSpeech failed JSON or plain-text fallback!");
    }

    // P1-4. Three-Goodness Lotus Awakening ZERO hidden-wolf leak
    resetMatchToLobby();
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidLotus = getPlayerId();
    const waveringAlly = getAliveSeats().find(s => s.id !== pidLotus && s.team === "good");
    const goodFocus = getAliveSeats().find(s => s.id !== pidLotus && s.id !== waveringAlly.id && s.team === "good");
    const hiddenWolfSeat = getAliveSeats().find(s => s.id !== pidLotus && s.role === "wolf");
    waveringAlly.suspicionMap[hiddenWolfSeat.id] = 48;
    state.selectedSeatId = goodFocus.id;
    state.playerMarks = {};
    state.match.threeGood = { heart: 1, words: 1, deeds: 0, resonanceTriggered: false };
    addThreeGoodPoint("deeds", "測試蓮花公平性");
    if (!state.match.threeGood.resonanceTriggered || !state.match.goodwillVoteBonus) {
      throw new Error("Lotus awakening failed to trigger reward!");
    }
    if (waveringAlly.suspicionMap[hiddenWolfSeat.id] !== 48) {
      throw new Error("Lotus awakening leaked hidden Wolf identity onto wavering ally!");
    }

    // P1-5. Tutorial Slide 3 copy matches fair 4G rules
    const slide3Html = TUTORIAL_SLIDES[2] ? TUTORIAL_SLIDES[2].html : "";
    if (!slide3Html || slide3Html.includes("鐵票跟投") || slide3Html.includes("照出笑僵冷汗狼")) {
      throw new Error("TUTORIAL_SLIDES[2] still contains outdated 4G role-leak copy!");
    }

    // ==================== PHASE 2 VERIFICATION ====================
    // P2-1. Cut-In FIFO Queue + Toast Max-2 Cap
    clearCutInQueue();
    triggerCutIn("首張橫幅", "子標A", "gold");
    triggerCutIn("第二橫幅", "子標B", "emerald");
    triggerCutIn("第二橫幅", "子標B", "emerald"); // consecutive duplicate ignored
    if (el("cutInTitle").textContent !== "首張橫幅" || state.cutInQueue.length !== 1) {
      throw new Error("Cut-In FIFO queue failed on first/queued item! title=" + el("cutInTitle").textContent + " q=" + state.cutInQueue.length);
    }
    advanceCutInQueue();
    if (el("cutInTitle").textContent !== "第二橫幅" || state.cutInQueue.length !== 0) {
      throw new Error("advanceCutInQueue failed to pop second Cut-In! title=" + el("cutInTitle").textContent);
    }
    clearCutInQueue();
    if (state.cutInActive || state.cutInQueue.length !== 0) {
      throw new Error("clearCutInQueue failed to clear active state!");
    }

    const toastHost = el("toastContainer");
    toastHost.innerHTML = "";
    showToast("訊息1", "gold");
    showToast("訊息2", "emerald");
    showToast("訊息3", "warn");
    if (toastHost.children.length !== 2 || toastHost.children[0].textContent !== "訊息2" || toastHost.children[1].textContent !== "訊息3") {
      throw new Error("showToast max-2 cap failed! len=" + toastHost.children.length);
    }

    // P2-2. Spectator 2x Fast-Forward Mode + Reset
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    getPlayerSeat().alive = false;
    state.match.phase = "DAY_SPEECH";
    if (!isSpectatorGuessActive() || isSpectatorFastForward()) {
      throw new Error("Spectator initial fast-forward state invalid!");
    }
    toggleSpectatorFastForward();
    if (!isSpectatorFastForward() || !state.autoPlay) {
      throw new Error("toggleSpectatorFastForward failed to enable fast-forward & autoPlay!");
    }
    renderSpectatorGuessPanel();
    const hasSpecFfBtn = el("spectatorGuessBar")._children.some(function (row) {
      return (row._children || []).some(function (child) {
        return (child._children || []).some(function (b) { return b.getAttribute && b.getAttribute("data-spec-ff") === "1" && b.textContent.includes("2×快進:開"); });
      });
    });
    if (!hasSpecFfBtn) {
      throw new Error("renderSpectatorGuessPanel missing active 2x fast-forward button!");
    }
    resetMatchToLobby();
    if (state.spectatorFastForward) {
      throw new Error("resetMatchToLobby failed to reset spectatorFastForward!");
    }

    // P2-3. Classic Simplified Mode vs Full Academy Mode
    el("selectRuleDepth").value = "classic";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    if (!isClassicSimpleMode() || state.match.roleMission !== null) {
      throw new Error("Classic mode failed to disable roleMission or report isClassicSimpleMode!");
    }
    startDayDiscussion("");
    if (state.match.activeDirectorEvent !== null) {
      throw new Error("Classic mode should skip daily tea director event!");
    }
    const classicOther = getAliveSeats().find(s => s.id !== getPlayerId());
    if (inspectSeatMicroExpression(classicOther.id) !== false) {
      throw new Error("Classic mode should disable micro-expression inspect!");
    }
    state.activeSpeakerId = classicOther.id;
    state.match.phase = "DAY_SPEECH";
    updateAllUI();
    if (!el("btnMicroInspect").classList.contains("hidden") || !el("directorEventPill").classList.contains("hidden") || !el("playerMissionLine").classList.contains("hidden")) {
      throw new Error("Classic mode failed to hide secondary telemetry/micro-inspect controls!");
    }
    el("selectRuleDepth").value = "full";
    state.ruleDepth = "full";
    resetMatchToLobby();
  }
  `, ctx);

// P2-4. Fair 4G Copy Sync in ai.html
if (html.includes("鐵票跟你投") || html.includes("笑僵冒冷汗")) {
  throw new Error("ai.html still contains outdated 4G tooltip text!");
}

// P3-3. Blender Sanctuary Pipeline Script & Custom Pavilion Swap
{
  const guidePath = "tools/blender_sanctuary_guide.py";
  if (!fs.existsSync(guidePath) || fs.statSync(guidePath).size < 1000) {
    throw new Error("Missing or empty Blender sanctuary creator script: " + guidePath);
  }
  const guideSrc = fs.readFileSync(guidePath, "utf8");
  if (!guideSrc.includes("export_sanctuary_glb") || !guideSrc.includes("Sanctuary_Pavilion_Export")) {
    throw new Error("tools/blender_sanctuary_guide.py missing export functions or collection names!");
  }
  for (const forbidden of ["fgu.edu.tw", "3goodai", "佛光大學"]) {
    if (guideSrc.includes(forbidden)) throw new Error("Blind-review violation in tools/blender_sanctuary_guide.py: " + forbidden);
  }
  vm.runInContext(`
    {
      const pvGltf = { scene: new THREE.Group() };
      const attached = stage3d.attachCustomPavilionGlb(pvGltf, "sanctuary_pavilion.glb", true);
      if (!attached || !stage3d.customPavilionRoot || (stage3d.env && stage3d.env.proceduralPavilionGroup && stage3d.env.proceduralPavilionGroup.visible)) {
        throw new Error("stage3d.attachCustomPavilionGlb failed to mount custom pavilion or hide procedural pavilion!");
      }
      stage3d.resetPavilionToProcedural();
      if (stage3d.customPavilionRoot !== null || (stage3d.env && stage3d.env.proceduralPavilionGroup && !stage3d.env.proceduralPavilionGroup.visible)) {
        throw new Error("stage3d.resetPavilionToProcedural failed to restore procedural pavilion!");
      }
    }

    // ==================== FULL RULE AUDIT VERIFICATION (R1..R6) ====================
    // R1. 屠神勝利 (Wolves eliminate all Gods while Villagers remain)
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const wolvesR1 = state.match.seats.filter(s => s.team === "wolf");
      const godsR1 = state.match.seats.filter(s => s.role === "seer" || s.role === "witch" || s.role === "hunter");
      wolvesR1[0].alive = false;
      godsR1.forEach(g => { g.alive = false; });
      const over1 = checkAndHandleGameOver();
      if (!over1 || state.match.winner !== "wolf" || !String(state.match.winReason).includes("屠神")) {
        throw new Error("R1 屠神 rule failed! over=" + over1 + " winner=" + state.match.winner + " reason=" + state.match.winReason);
      }
    }

    // R2. 屠民勝利 (Wolves eliminate all Villagers while Gods remain)
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const wolvesR2 = state.match.seats.filter(s => s.team === "wolf");
      const vilsR2 = state.match.seats.filter(s => s.role === "villager");
      wolvesR2[0].alive = false;
      vilsR2.forEach(v => { v.alive = false; });
      const over2 = checkAndHandleGameOver();
      if (!over2 || state.match.winner !== "wolf" || !String(state.match.winReason).includes("屠民")) {
        throw new Error("R2 屠民 rule failed! over=" + over2 + " winner=" + state.match.winner + " reason=" + state.match.winReason);
      }
    }

    // R3. 2狼 vs 1神1民 (both sides still have alive members) must NOT pre-terminate before 屠邊
    el("selectModeCount").value = "6";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const seer3 = state.match.seats.find(s => s.role === "seer");
      const vils3 = state.match.seats.filter(s => s.role === "villager");
      seer3.alive = false;
      vils3[0].alive = false; // 2 wolves + 1 witch + 1 villager remain
      state.match.phase = "DAY_SPEECH";
      if (checkAndHandleGameOver()) {
        throw new Error("R3 2v2 with both sides alive ended prematurely! reason=" + state.match.winReason);
      }
    }

    // R4. 最後一神帶走最後一狼 simultaneously -> 好人勝 priority over 屠神
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "hunter";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const wolves4 = state.match.seats.filter(s => s.team === "wolf");
      state.match.seats.forEach(s => {
        if (s.role === "seer" || s.role === "witch") s.alive = false;
      });
      const lastHunter = state.match.seats.find(s => s.role === "hunter");
      wolves4[0].alive = false;
      lastHunter.alive = false;
      wolves4[1].alive = false;
      const over4 = checkAndHandleGameOver();
      if (!over4 || state.match.winner !== "good") {
        throw new Error("R4 last Hunter shooting last Wolf must award win to Good! got=" + state.match.winner);
      }
    }

    // R5. Same-night Wolf kill + Witch purify on Hunter -> Poison disables Hunter resonance!
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const hSeat5 = state.match.seats.find(s => s.role === "hunter");
      state.match.day = 2;
      state.match.nightState = { wolfTarget: hSeat5.id, seerTarget: null, witchSaved: false, witchPoisonTarget: hSeat5.id };
      resolveDawn();
      clearStepTimer();
      if (hSeat5.alive || hSeat5.outReason !== "清心茶請離" || state.match.phase === "HUNTER_TRIGGER") {
        throw new Error("R5 Witch purify priority failed on Hunter! outReason=" + hSeat5.outReason + " phase=" + state.match.phase);
      }
    }

    // R6. Dead-game Sheriff transfer suppressed on terminal dawn (last God is Player-Sheriff!)
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const witch6 = state.match.seats.find(s => s.role === "witch");
      witch6.alive = false; // Player Seer is now the last remaining God AND holds Sheriff!
      state.match.sheriffSeatId = getPlayerId();
      state.match.day = 2;
      state.match.nightState = { wolfTarget: getPlayerId(), seerTarget: null, witchSaved: false, witchPoisonTarget: null };
      resolveDawn();
      clearStepTimer();
      if (state.match.phase !== "GAME_OVER" || state.match.winner !== "wolf") {
        throw new Error("R6 Terminal 屠神 dawn must end directly in GAME_OVER without SHERIFF_TRANSFER! phase=" + state.match.phase);
      }
    }

    // R7. PK speaker not skipped by Next button despite earlier same-day speech log
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const pkAi = getAliveSeats().find(s => s.id !== getPlayerId());
      state.match.day = 1;
      state.match.phase = "DAY_SPEECH";
      state.match.logs.push({ id: 99, day: 1, kind: "speech", speakerId: pkAi.id, title: "", text: "首輪發言" });
      state.activeSpeakerId = pkAi.id;
      state.currentTurnSpoken = false;
      state.speakingInFlight = false;
      state.typewriter.active = false;
      el("btnStepNext").click();
      if (!state.currentTurnSpoken) {
        throw new Error("R7 btnStepNext skipped PK AI speaker who had an earlier same-day speech!");
      }
    }

    // ==================== 三好四給趣味深化整合測試 (TG-1..TG-5) ====================
    // TG-1. 茶席「奉暖茶結緣 (做好事)」+ 1次/日上限 + 經典模式停用
    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    {
      const teaTgt = getAliveSeats().find(s => s.id !== getPlayerId());
      teaTgt.suspicionMap[getPlayerId()] = 60;
      state.match.phase = "DAY_SPEECH";
      state.match.day = 1;
      state.intelSeatId = teaTgt.id;
      if (!serveWarmTeaToSeat(teaTgt.id) || teaTgt.suspicionMap[getPlayerId()] !== 46 || state.match.stats.teaServedCount !== 1 || state.match.threeGood.deeds < 1) {
        throw new Error("TG-1 serveWarmTeaToSeat failed to warm up ally or light deeds petal!");
      }
      if (serveWarmTeaToSeat(teaTgt.id) !== false) {
        throw new Error("TG-1 serveWarmTeaToSeat should cap at once per day!");
      }
    }

    // TG-2. 「說好話化解」#btnWarmDeescalate 臨場高情商接招
    {
      const clashSp = getAliveSeats().find(s => s.id !== getPlayerId());
      state.activeClash = { speakerId: clashSp.id, kind: "toxic_slip", resolved: false };
      state.activeSpeakerId = clashSp.id;
      state.match.phase = "DAY_SPEECH";
      updateAllUI();
      if (el("btnWarmDeescalate").classList.contains("hidden")) {
        throw new Error("TG-2 btnWarmDeescalate failed to show on active toxic_slip clash!");
      }
      el("btnWarmDeescalate").click();
      if (!state.activeClash.resolved || state.match.stats.kindDeescalations !== 1 || state.match.threeGood.words < 1) {
        throw new Error("TG-2 btnWarmDeescalate failed to resolve clash or light words petal!");
      }
    }

    // TG-3. 四給喜劇台詞 + 「給歡喜 × 給希望」雙光交會 + 「四給連心・三好充能」
    {
      state.match.phase = "DAY_VOTE";
      useFourGJoy();
      if (!Array.isArray(state.match.fourGJoySuspects) || state.match.fourGJoySuspects.length < 1) {
        throw new Error("TG-3 useFourGJoy failed to record fourGJoySuspects!");
      }
      useFourGHope();
      if (!state.match.fourGSynergyTriggered || state.match.stats.fourGSynergies < 1 || state.match.threeGood.heart < 1) {
        throw new Error("TG-3 double 4G synergy (四給連心) failed to trigger!");
      }
    }

    // TG-4. 「🌶 試轉好話」一鍵體驗神反轉暴擊
    {
      state.match.phase = "DAY_PLAYER_TURN";
      el("quickFreeInput").value = "";
      el("btnQuickSpiceDemo").click();
      if (!el("quickFreeInput").value.trim() || el("btnQuickInlineRewrite").classList.contains("hidden")) {
        throw new Error("TG-4 btnQuickSpiceDemo failed to populate salty sample and show btnQuickInlineRewrite!");
      }
    }

    // TG-5. 新清茗事件與三枚新成就徽章
    {
      if (!TEA_DIRECTOR_EVENTS.some(e => e.id === "kind_word_duel") || !TEA_DIRECTOR_EVENTS.some(e => e.id === "fourg_echo")) {
        throw new Error("TG-5 missing kind_word_duel or fourg_echo in TEA_DIRECTOR_EVENTS!");
      }
      state.match.phase = "GAME_OVER";
      state.match.winner = "good";
      recordMatchCareer("good");
      const car = loadCareerStats();
      ["tea_host", "peacemaker", "fourg_combo"].forEach(bid => {
        if (car.unlockedBadges.indexOf(bid) === -1) {
          throw new Error("TG-5 failed to unlock badge: " + bid);
        }
      });
    }

    el("selectModeCount").value = "8";
    resetMatchToLobby();
  `, ctx);
}

// R6b. Rule Modal Guide & Fair 4G Copy Sync in ai.html
if (!html.includes("書院對弈核心規則（標準屠邊制）") || html.includes("好人鐵票跟投") || html.includes("照出冷汗狼")) {
  throw new Error("ai.html #modalGuide missing 屠邊制 guide or still contains outdated 4G copy!");
}

// P3-3. Blender Sanctuary Pipeline Script & Custom Pavilion Swap
{
  const guidePath = "tools/blender_sanctuary_guide.py";
  if (!fs.existsSync(guidePath) || fs.statSync(guidePath).size < 1000) {
    throw new Error("Missing or empty Blender sanctuary creator script: " + guidePath);
  }
  const guideSrc = fs.readFileSync(guidePath, "utf8");
  if (!guideSrc.includes("export_sanctuary_glb") || !guideSrc.includes("Sanctuary_Pavilion_Export")) {
    throw new Error("tools/blender_sanctuary_guide.py missing export functions or collection names!");
  }
  for (const forbidden of ["fgu.edu.tw", "3goodai", "佛光大學"]) {
    if (guideSrc.includes(forbidden)) throw new Error("Blind-review violation in tools/blender_sanctuary_guide.py: " + forbidden);
  }
  vm.runInContext(`
    {
      const pvGltf = { scene: new THREE.Group() };
      const attached = stage3d.attachCustomPavilionGlb(pvGltf, "sanctuary_pavilion.glb", true);
      if (!attached || !stage3d.customPavilionRoot || (stage3d.env && stage3d.env.proceduralPavilionGroup && stage3d.env.proceduralPavilionGroup.visible)) {
        throw new Error("stage3d.attachCustomPavilionGlb failed to mount custom pavilion or hide procedural pavilion!");
      }
      stage3d.resetPavilionToProcedural();
      if (stage3d.customPavilionRoot !== null || (stage3d.env && stage3d.env.proceduralPavilionGroup && !stage3d.env.proceduralPavilionGroup.visible)) {
        throw new Error("stage3d.resetPavilionToProcedural failed to restore procedural pavilion!");
      }
    }
  `, ctx);
}

// R6b. Rule Modal Guide & Fair 4G Copy Sync in ai.html
if (!html.includes("書院對弈核心規則（標準屠邊制）") || html.includes("好人鐵票跟投") || html.includes("照出冷汗狼")) {
  throw new Error("ai.html #modalGuide missing 屠邊制 guide or still contains outdated 4G copy!");
}

// Verify PersonaAgent Gemini Structured JSON end-to-end sync + voice.localNeuralPending deduplication
{
  vm.runInContext("this.__sound = sound; this.__voice = voice; this.__state = state; this.__orchestrator = orchestrator;", ctx);
  let ttsFetchCount = 0;
  let mockGeminiAccuseTarget = 2;
  ctx.fetch = async (url) => {
    if (String(url) === "/api/tts") {
      ttsFetchCount += 1;
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(256) };
    }
    if (String(url) === "/api/local-llm") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          model: "qwen3:8b",
          text: JSON.stringify({ text: "以本機高階模型盤點，這輪集中檢視 " + mockGeminiAccuseTarget + " 號！", accuseId: mockGeminiAccuseTarget, vouchId: null, claimRole: null })
        })
      };
    }
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ text: "經過詳細對比，我這輪改投 " + mockGeminiAccuseTarget + " 號！", accuseId: mockGeminiAccuseTarget, vouchId: null, claimRole: null }) }] } }]
        })
      };
    }
    return { ok: false };
  };
  if (!html.includes('value="gemini-3.8-flash"') || !html.includes('value="gemini-4-argon"') || !html.includes('value="gemini-3.1-pro-preview"') || !html.includes('id="localOllamaOptGroup"')) {
    throw new Error("ai.html #selectGeminiModel missing latest Gemini 3.8/4 Argon/3.1 Pro or localOllamaOptGroup!");
  }
  vm.runInContext(`
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
  `, ctx);
  const geminiSp = vm.runInContext("state.match.seats.find(s => s.id !== getPlayerId() && s.role === 'villager')", ctx);
  const geminiTgt = vm.runInContext("state.match.seats.find(s => s.id !== getPlayerId() && s.role === 'wolf')", ctx);
  mockGeminiAccuseTarget = geminiTgt.id;
  ctx.__state.geminiApiKey = "TEST_MOCK_KEY";
  const dOut = await ctx.__orchestrator.dispatchAgent("PersonaAgent", {
    speaker: geminiSp,
    fallbackMeta: { targetId: null, relationType: null, accuseId: null, vouchId: null, hasToxicSlip: false, text: "先觀察一下" }
  });
  ctx.__state.geminiApiKey = "";
  if (!dOut || !dOut.generated || dOut.generated.accuseId !== geminiTgt.id || dOut.generated.targetId !== geminiTgt.id || !dOut.tier.includes("JSON同步")) {
    throw new Error("PersonaAgent Gemini JSON stance sync failed! out=" + JSON.stringify(dOut));
  }

  ctx.__state.localLlmModel = "qwen3:8b";
  const lOut = await ctx.__orchestrator.dispatchAgent("PersonaAgent", {
    speaker: geminiSp,
    fallbackMeta: { targetId: null, relationType: null, accuseId: null, vouchId: null, hasToxicSlip: false, text: "先觀察一下" }
  });
  ctx.__state.localLlmModel = "";
  vm.runInContext("resetMatchToLobby();", ctx);
  if (!lOut || !lOut.generated || lOut.generated.accuseId !== geminiTgt.id || !lOut.tier.includes("qwen3:8b") || !lOut.tier.includes("JSON同步")) {
    throw new Error("PersonaAgent Local Ollama JSON stance sync failed! out=" + JSON.stringify(lOut));
  }

  ctx.__sound.ctx = {
    createBufferSource: () => ({ buffer: null, playbackRate: { value: 1 }, connect() { }, start() { }, stop() { }, onended: null }),
    createGain: () => ({ gain: { value: 1 }, connect() { } }),
    destination: {},
    decodeAudioData: async () => ({ duration: 1.0, numberOfChannels: 1, length: 44100, sampleRate: 44100 })
  };
  ctx.__voice.localNeuralAvailable = true;
  ctx.__voice.localNeuralCache = {};
  ctx.__voice.localNeuralPending = {};
  ctx.__voice.prefetchFreeLocalNeural("暖暖", "檢查同句快取去重", "normal");
  const okPlay = await ctx.__voice.playFreeLocalNeuralTts(ctx.__voice.utteranceSeq, "暖暖", "檢查同句快取去重", "normal", () => { }, { seatId: 3 });
  ctx.__voice.stop();
  if (!okPlay || ttsFetchCount !== 1) {
    throw new Error(`Expected 1 /api/tts fetch via localNeuralPending dedupe, got count=${ttsFetchCount}, ok=${okPlay}`);
  }
}

// UI-FOCUS: Phase-aware peripheral convergence & compact Intel Popover order
{
  vm.runInContext(`
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "NIGHT_SEER";
    updateAllUI();
  `, ctx);
  const nightState = vm.runInContext(`({
    fourGHidden: el("cornerFourGDeck").classList.contains("hidden"),
    seatHidden: el("seatButtonStrip").classList.contains("hidden"),
    listening: document.body.classList.contains("phase-listening"),
    fourGActive: document.body.classList.contains("fourg-active")
  })`, ctx);
  if (!nightState.fourGHidden || nightState.seatHidden || nightState.listening || nightState.fourGActive) {
    throw new Error("UI-FOCUS failed in NIGHT_SEER: " + JSON.stringify(nightState));
  }

  vm.runInContext(`
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = 2;
    updateAllUI();
  `, ctx);
  const speechState = vm.runInContext(`({
    fourGHidden: el("cornerFourGDeck").classList.contains("hidden"),
    listening: document.body.classList.contains("phase-listening"),
    fourGActive: document.body.classList.contains("fourg-active")
  })`, ctx);
  if (speechState.fourGHidden || !speechState.listening || !speechState.fourGActive) {
    throw new Error("UI-FOCUS failed in DAY_SPEECH: " + JSON.stringify(speechState));
  }

  vm.runInContext(`
    state.match.phase = "DAY_VOTE_RESULT";
    state.voteResultPayload = { headline: "揭曉", tallies: {}, maxVotes: 1, groupedVoters: {}, outId: null, playerVotedOut: false, lastWord: "" };
    updateAllUI();
    resetMatchToLobby();
  `, ctx);
  const resultState = vm.runInContext(`({
    seatHidden: el("seatButtonStrip").classList.contains("hidden"),
    fourGHidden: el("cornerFourGDeck").classList.contains("hidden")
  })`, ctx);
  if (!resultState.seatHidden || !resultState.fourGHidden) {
    throw new Error("UI-FOCUS failed to hide peripherals in DAY_VOTE_RESULT: " + JSON.stringify(resultState));
  }

  const quickIdx = html.indexOf('id="btnIntelQuickAct"');
  const markIdx = html.indexOf('id="btnIntelMarkGood"');
  if (quickIdx === -1 || markIdx === -1 || quickIdx > markIdx) {
    throw new Error("UI-FOCUS #btnIntelQuickAct must appear before #btnIntelMarkGood in #intelActionGrid!");
  }
  if (/id="btnIntelMicroInspect"[^>]*col-span-2/.test(html) || /id="btnIntelServeTea"[^>]*col-span-2/.test(html)) {
    throw new Error("UI-FOCUS #btnIntelMicroInspect and #btnIntelServeTea must share one compact row without col-span-2!");
  }
}

// HUNTER-VFX: Unmistakable Hunter shot cut-in, crimson/gold beam, victim badge & HUNTER_RESOLVE pacing
{
  const hRes = vm.runInContext(`
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "hunter";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const p1 = getPlayerSeat();
    p1.alive = false;
    p1.outReason = "投票出局";
    const tgt = getAliveSeats().find(s => s.id !== getPlayerId() && s.role === "villager") || getAliveSeats().find(s => s.id !== getPlayerId());
    state.match.phase = "HUNTER_TRIGGER";
    state.match.afterHunterNext = "AFTER_VOTE";
    state.selectedSeatId = tgt.id;
    confirmTargetAction();
    ({
      phase: state.match.phase,
      targetDead: !tgt.alive,
      targetOutReason: tgt.outReason,
      targetId: tgt.id,
      shot: state.match.lastHunterShot,
      cutInTitle: el("cutInTitle").textContent,
      cutInHasCrimson: el("dramaticCutIn").classList.contains("cutin-crimson"),
      cutInHasHold: el("dramaticCutIn").classList.contains("cutin-hold"),
      hasHunterBeam: state.beamFx.some(b => b.kind === "hunter" && b.fromId === getPlayerId() && b.toId === tgt.id),
      seatHasHunterOutBadge: el("seatButtonStrip")._children.some(b => b._children.some(c => c.className && c.className.includes("badge-hunter-out") && c.textContent === "槍")),
      stepperTxt: el("stepperStatusText").textContent
    });
  `, ctx);
  if (hRes.phase !== "HUNTER_RESOLVE" || !hRes.targetDead || hRes.targetOutReason !== "正氣共鳴請離") {
    throw new Error("HUNTER-VFX state transition failed: " + JSON.stringify(hRes));
  }
  if (!hRes.shot || hRes.shot.targetId !== hRes.targetId || !hRes.cutInTitle.includes("正氣共鳴") || !hRes.cutInTitle.includes("0" + hRes.targetId + "號")) {
    throw new Error("HUNTER-VFX Cut-In failed to name victim clearly: " + JSON.stringify(hRes));
  }
  if (!hRes.cutInHasCrimson || !hRes.cutInHasHold || !hRes.hasHunterBeam || !hRes.seatHasHunterOutBadge) {
    throw new Error("HUNTER-VFX missing visual cues (crimson/hold/beam/badge): " + JSON.stringify(hRes));
  }
  if (!hRes.stepperTxt.includes("帶走 0" + hRes.targetId + "號")) {
    throw new Error("HUNTER-VFX stepper text failed to state hunter target: " + JSON.stringify(hRes.stepperTxt));
  }
  const nextPhase = vm.runInContext(`
    el("btnStepNext").click();
    const phAfter = state.match.phase;
    resetMatchToLobby();
    phAfter;
  `, ctx);
  if (nextPhase === "HUNTER_RESOLVE") {
    throw new Error("HUNTER-VFX btnStepNext click failed to advance out of HUNTER_RESOLVE!");
  }
}

// LOGIC-CHRONO: Strict turn chronology + Wolf-pit reaction + Dual-Seer World A vs World B analysis
{
  const logicRes = vm.runInContext(`
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];
    state.match.logs = [];

    const firstSp = state.match.seats.find(s => s.id !== getPlayerId() && s.team === "good");
    const sp1 = buildHeuristicAiSpeech(firstSp);

    // Unspoken target in deep_stealth must never claim the target just spoke!
    const wolfSp = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "wolf");
    const oldTac = state.match.wolfTactic;
    state.match.wolfTactic = "deep_stealth";
    const spDeep = buildHeuristicAiSpeech(wolfSp);
    state.match.wolfTactic = oldTac;

    // 2nd Wolf-Pit placement triggers direct rebuttal even when NOT primary accuseId!
    const caller = state.match.seats.find(s => s.id !== getPlayerId());
    const targetB = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== caller.id && s.team === "good" && s.role !== "seer");
    const thirdC = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== caller.id && s.id !== targetB.id);
    state.match.daySpeechEvents = [{
      day: 1,
      turnOrderIndex: 0,
      speakerId: caller.id,
      speakerName: caller.name,
      claimRole: null,
      accuseId: thirdC.id,
      vouchId: null,
      wolfPits: [thirdC.id, targetB.id],
      goodPits: [],
      hasToxicSlip: false,
      rawText: "先點進狼坑看看"
    }];
    state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
    state.match.logs = [{ day: 1, kind: "speech", speakerId: caller.id, title: "0" + caller.id + "號", text: "先點進狼坑看看" }];
    const pitRebut = buildHeuristicAiSpeech(targetB);

    // Dual-Seer World A vs World B deduction + Wind-Vane summary
    const seerA = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "seer") || state.match.seats[1];
    const seerB = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "wolf") || state.match.seats[2];
    const analyst = state.match.seats.find(s => s.id !== getPlayerId() && s.id !== seerA.id && s.id !== seerB.id && s.team === "good");
    seerA.claimedRole = "seer";
    seerB.claimedRole = "seer";
    state.match.daySpeechEvents = [
      { day: 1, speakerId: seerA.id, claimRole: "seer", accuseId: seerB.id, vouchId: null, checkedWolfId: seerB.id, wolfPits: [seerB.id], goodPits: [] },
      { day: 1, speakerId: seerB.id, claimRole: "seer", accuseId: seerA.id, vouchId: null, checkedWolfId: seerA.id, wolfPits: [seerA.id], goodPits: [] }
    ];
    state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
    state.match.logs = [
      { day: 1, kind: "speech", speakerId: seerA.id, text: "我是觀察員" },
      { day: 1, kind: "speech", speakerId: seerB.id, text: "我才是觀察員" }
    ];
    const dualSp = buildHeuristicAiSpeech(analyst);
    const dwVane = computeTableWindVane();

    // Player speech dual-world card & wolfPits persistence
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const cardLabels = Array.from(el("quickSpeechChips")._children || []).map(c => c.innerHTML).join(" | ");
    const playerPid = getPlayerId();
    const sTarget1 = state.match.seats.find(s => s.id !== playerPid && s.alive);
    const sTarget2 = state.match.seats.find(s => s.id !== playerPid && s.alive && s.id !== sTarget1.id);
    el("playerSpeechInput").value = "我今天點兩個狼坑：重點檢視 " + sTarget1.id + "號 跟 " + sTarget2.id + "號！";
    submitPlayerSpeech();
    const latestPlayerEv = state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1];
    resetMatchToLobby();
    ({
      sp1Text: sp1.text,
      spDeepText: spDeep.text,
      callerId: caller.id,
      pitRebutText: pitRebut.text,
      pitRebutAccuse: pitRebut.accuseId,
      seerAId: seerA.id,
      seerBId: seerB.id,
      dualText: dualSp.text,
      standWithSeerId: dualSp.standWithSeerId,
      dualWolfPits: dualSp.wolfPits,
      dwSummary: dwVane.summaryText,
      cardLabels: cardLabels,
      playerWolfPits: latestPlayerEv ? latestPlayerEv.wolfPits : []
    });
  `, ctx);

  if (logicRes.sp1Text.includes("剛才講得")) {
    throw new Error("LOGIC-CHRONO Day 1 opening speaker hallucinated prior speech: " + logicRes.sp1Text);
  }
  if (logicRes.spDeepText.includes("剛才講得")) {
    throw new Error("LOGIC-CHRONO deep_stealth wolf claimed unspoken target just spoke: " + logicRes.spDeepText);
  }
  if (!logicRes.pitRebutText.includes("點進狼坑") || !logicRes.pitRebutText.includes(String(logicRes.callerId))) {
    throw new Error("LOGIC-CHRONO target placed into wolfPits[1] failed to react to caller: " + JSON.stringify(logicRes));
  }
  if (!logicRes.dualText.includes("站 " + logicRes.seerAId + "號") || !logicRes.dualText.includes("站 " + logicRes.seerBId + "號") || !logicRes.standWithSeerId) {
    throw new Error("LOGIC-CHRONO Dual-Seer speech failed to compare World A and World B: " + JSON.stringify(logicRes));
  }
  if (!logicRes.dwSummary.includes("站0" + logicRes.seerAId + "坑") || !logicRes.dwSummary.includes("站0" + logicRes.seerBId + "坑")) {
    throw new Error("LOGIC-CHRONO Wind Vane summary missing Dual-Seer world preview: " + logicRes.dwSummary);
  }
  if (!logicRes.cardLabels.includes("盤雙邊坑") || !logicRes.cardLabels.includes("兩邊狼坑")) {
    throw new Error("LOGIC-CHRONO Player speech cards missing Dual-Seer pit comparison card: " + logicRes.cardLabels);
  }
  if (!Array.isArray(logicRes.playerWolfPits) || logicRes.playerWolfPits.length < 2) {
    throw new Error("LOGIC-CHRONO submitPlayerSpeech failed to record multi-slot wolfPits: " + JSON.stringify(logicRes.playerWolfPits));
  }
}

// DIALOGUE-FX-UPGRADE: Persona voices, prior callbacks, Gemini meta sync, silent crowd micro-reactions, contradiction proof, vote lead & 3D FX
{
  const dfxRes = vm.runInContext(`
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.playerSeatId = 1;

    const styleKeys = ["lead", "rebutLead", "dualLead", "signoff", "reactGasp", "reactVouch", "reactNod", "reactDoubt"];
    const personasMissingVoice = Object.keys(PERSONA_FLAVORS).filter(name => {
      const vs = PERSONA_FLAVORS[name] && PERSONA_FLAVORS[name].voiceStyle;
      return !vs || styleKeys.some(k => !Array.isArray(vs[k]) || vs[k].length === 0);
    });

    const pXiao = { id: 2, name: "小澄", style: "直率", alive: true, team: "good", role: "villager" };
    const pXing = { id: 3, name: "星兒", style: "直覺敏銳", alive: true, team: "good", role: "villager" };
    const voiceXiao = pickPersonaVoice(pXiao, "lead", 1);
    const voiceXing = pickPersonaVoice(pXing, "lead", 1);

    state.match.day = 1;
    state.match.daySpeechEvents = [];
    const cbEmpty = buildPriorCallbackPhrase(pXing, state.match.daySpeechEvents, s => "0" + s.id + "號");
    state.match.daySpeechEvents.push({
      day: 1,
      speakerId: 2,
      speakerName: "小澄",
      accuseId: 4,
      vouchId: null,
      claimRole: null
    });
    const cbAfter = buildPriorCallbackPhrase(pXing, state.match.daySpeechEvents, s => "0" + s.id + "號");

    const parsedMeta = parseGeminiStructuredSpeech(JSON.stringify({
      text: "04號剛才視角縮得很緊，我先接手這張好人盤面。",
      wolfPits: [4, 7],
      goodPits: [2, 5],
      standWithSeerId: 2,
      emotion: "angry"
    }), getSeat(3));
    const genSynced = syncGeminiSpeechMeta(getSeat(3), {
      text: "佔位",
      targetId: 4,
      relationType: "accuse"
    }, parsedMeta);

    const beforeLogsLen = state.match.logs.length;
    triggerSpeechAudienceReactions(getSeat(3), {
      accuseId: 4,
      vouchId: 2,
      relationType: "accuse"
    });
    const afterLogsLen = state.match.logs.length;
    const accusedEmotion = getSeatEmotion(4);
    const vouchedEmotion = getSeatEmotion(2);

    const lwSeat = getSeat(5);
    lwSeat.role = "villager";
    lwSeat.team = "good";
    getSeat(4).alive = true;
    getSeat(7).alive = true;
    lwSeat.suspicionMap[4] = 88;
    state.match.voteHistory = [{ day: 1, outId: 5, ballots: [{ voterId: 4, targetId: 5 }, { voterId: 7, targetId: 5 }, { voterId: 2, targetId: 4 }] }];
    const lwRes = buildAiLastWords(lwSeat, "vote_out");

    // Inline contradiction highlight + click pins clue & triggers peripheral flash
    state.match.activeSpeechContra = {
      speakerId: 4,
      contra: {
        code: "flip_stance",
        label: "反覆橫跳",
        detail: "曾保 02號 又改口打 02號",
        rebuttalText: "我抓到 04號 反覆橫跳，請檢視 04號！"
      }
    };
    state.match.pinnedClues = [];
    state.screenFlash = null;
    const prevContraFound = (state.match.stats && state.match.stats.contradictionsFound) || 0;
    const spotEl = el("spotlightText");
    renderInteractiveSpotlightText("04號今天先保02號，又改口點02號！", getSeat(4), false);
    const spotHtml = String(spotEl.innerHTML || "");
    const hasContraToken = spotHtml.includes("clue-contradiction");
    const mockContraAttrs = {
      "data-clue-type": "contradiction",
      "data-clue-key": (state.match.day || 0) + ":4:contra:flip_stance",
      "data-clue-word": "02號",
      "data-speaker-id": "4"
    };
    handleSpotlightClueClick({
      getAttribute: function (k) { return mockContraAttrs[k] || null; },
      classList: { add: function () {} },
      textContent: "02號 ⚡"
    });
    const contraPinAdded = state.match.pinnedClues.length > 0 && ((state.match.stats && state.match.stats.contradictionsFound) || 0) > prevContraFound;
    const flashAfterContra = Boolean(state.screenFlash && state.screenFlash.color);

    // Staggered card deal delay on DAY_PLAYER_TURN
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const cardStrip = el("quickSpeechChips");
    const firstCardDelay = cardStrip && cardStrip._children[0] && cardStrip._children[0].style ? cardStrip._children[0].style.animationDelay : "";
    const secondCardDelay = cardStrip && cardStrip._children[1] && cardStrip._children[1].style ? cardStrip._children[1].style.animationDelay : "";

    // Vote bar + out highlight & cameraPunch + 5-bead 3D FX
    state.voteResultPayload = {
      headline: "04號出局",
      playerVotedOut: false,
      tallies: { 4: 4, 2: 2 },
      maxVotes: 4,
      outId: 4,
      groupedVoters: { 4: ["02號", "03號"], 2: ["05號"] }
    };
    renderVoteResultPanel();
    const voteRows = el("voteResultBars")._children;
    const hasVoteOutRowClass = voteRows.some(r => String(r.className || "").includes("vote-row-out"));

    stage3d.triggerCameraPunch(4, { fov: 39, durationMs: 1200 });
    const punchState = {
      seatId: stage3d.cameraPunch.seatId,
      fovTarget: stage3d.cameraPunch.fovTarget,
      until: stage3d.cameraPunch.until
    };

    let fxBeadCount = 0;
    let fxBeadsVisible = 0;
    let fxSkillVisible = false;
    let fxError = "";
    if (typeof THREE !== "undefined" && typeof build3DEffects === "function") {
      try {
        const fxScene = new THREE.Scene();
        const fxSys = build3DEffects(fxScene);
        fxBeadCount = fxSys.beamPool && fxSys.beamPool[0] && Array.isArray(fxSys.beamPool[0].beads)
          ? fxSys.beamPool[0].beads.length
          : 0;
        const nowTest = Date.now();
        state.beamFx.push({ fromId: 1, toId: 4, color: "#fbbf24", kind: "clash", born: nowTest - 300, duration: 700, impacted: false });
        trigger3DSkillAura(fxSys, new THREE.Vector3(0, 0, 0), "#a78bfa", "seer_scan", nowTest - 200);
        const mockAnchors = {
          1: { worldPos: new THREE.Vector3(0, 0, 4), headPos: new THREE.Vector3(0, 2, 4), handPos: new THREE.Vector3(0.4, 1.4, 3.8) },
          4: { worldPos: new THREE.Vector3(0, 0, -4), headPos: new THREE.Vector3(0, 2, -4), handPos: new THREE.Vector3(-0.4, 1.4, -3.8) }
        };
        update3DEffects(fxSys, mockAnchors, { nowMs: nowTest, tSec: nowTest * 0.001, night: false, daylight: true, p: "DAY_SPEECH" });
        fxBeadsVisible = fxSys.beamPool && fxSys.beamPool[0] && Array.isArray(fxSys.beamPool[0].beads)
          ? fxSys.beamPool[0].beads.filter(b => b.visible).length
          : 0;
        fxSkillVisible = Boolean(fxSys.skillCyl && fxSys.skillCyl.visible);
      } catch (e) {
        fxError = e && e.message ? e.message : String(e);
      }
    }

    resetMatchToLobby();
    stage3d.cameraPunch.until = 0;

    ({
      personasMissingVoice,
      voiceXiao,
      voiceXing,
      cbEmpty,
      cbAfter,
      parsedMeta: genSynced,
      logsLenDelta: afterLogsLen - beforeLogsLen,
      accusedEmotion,
      vouchedEmotion,
      lwRes,
      hasContraToken,
      evidenceAfterContra: contraPinAdded,
      flashAfterContra,
      firstCardDelay,
      secondCardDelay,
      hasVoteOutRowClass,
      punchState,
      fxBeadCount,
      fxBeadsVisible,
      fxSkillVisible,
      fxError
    });
  `, ctx);

  if (dfxRes.personasMissingVoice.length > 0) {
    throw new Error("DIALOGUE-FX-UPGRADE Missing voiceStyle slots for personas: " + dfxRes.personasMissingVoice);
  }
  if (!dfxRes.voiceXiao || !dfxRes.voiceXing || dfxRes.voiceXiao === dfxRes.voiceXing) {
    throw new Error("DIALOGUE-FX-UPGRADE Persona voices did not differentiate: " + JSON.stringify(dfxRes));
  }
  if (dfxRes.cbEmpty !== "" || !dfxRes.cbAfter.includes("02號")) {
    throw new Error("DIALOGUE-FX-UPGRADE Chronological callback check failed: " + JSON.stringify(dfxRes));
  }
  if (!dfxRes.parsedMeta || dfxRes.parsedMeta.standWithSeerId !== 2 || dfxRes.parsedMeta.wolfPits.length !== 2) {
    throw new Error("DIALOGUE-FX-UPGRADE Gemini metadata sync failed: " + JSON.stringify(dfxRes.parsedMeta));
  }
  if (dfxRes.logsLenDelta !== 0 || dfxRes.vouchedEmotion !== "happy") {
    throw new Error("DIALOGUE-FX-UPGRADE Audience micro-reactions leaked log or missed mood: " + JSON.stringify(dfxRes));
  }
  if (!dfxRes.lwRes || !dfxRes.lwRes.text.includes("04號") || !dfxRes.lwRes.isWolf || dfxRes.lwRes.targetId !== 4) {
    throw new Error("DIALOGUE-FX-UPGRADE Last words vote-caller callback failed: " + JSON.stringify(dfxRes.lwRes));
  }
  if (!dfxRes.hasContraToken || !dfxRes.evidenceAfterContra || !dfxRes.flashAfterContra) {
    throw new Error("DIALOGUE-FX-UPGRADE Inline contradiction click failed to unlock evidence/flash: " + JSON.stringify(dfxRes));
  }
  if (dfxRes.firstCardDelay !== "0ms" || dfxRes.secondCardDelay !== "65ms" || !dfxRes.hasVoteOutRowClass) {
    throw new Error("DIALOGUE-FX-UPGRADE Staggered card deal or vote result row highlight missing: " + JSON.stringify(dfxRes));
  }
  if (dfxRes.punchState.seatId !== 4 || dfxRes.punchState.fovTarget !== 39 || !(dfxRes.punchState.until > 0)) {
    throw new Error("DIALOGUE-FX-UPGRADE triggerCameraPunch state failed: " + JSON.stringify(dfxRes.punchState));
  }
  if (dfxRes.fxError || dfxRes.fxBeadCount !== 5 || dfxRes.fxBeadsVisible < 1 || !dfxRes.fxSkillVisible) {
    throw new Error("DIALOGUE-FX-UPGRADE 3D FX 5-bead arc failed: " + JSON.stringify(dfxRes));
  }
}

// HUNTER-AOWU-RULES: Strict 《凹嗚狼人殺》「狼刀在先」 & 「刀到最後一神獵人不能開槍」 vs 公投可開槍
{
  const aowuRes = vm.runInContext(`
    // 1. 刀到最後一神獵人（含警長）-> 狼刀在先屠神終局，不可開槍亦不移交警徽
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "hunter";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const h1 = getPlayerSeat();
    const seer1 = state.match.seats.find(s => s.role === "seer");
    const witch1 = state.match.seats.find(s => s.role === "witch");
    const wolves1 = state.match.seats.filter(s => s.team === "wolf");
    seer1.alive = false;
    witch1.alive = false;
    wolves1[0].alive = false;
    state.match.sheriffSeatId = h1.id;
    state.match.day = 2;
    state.match.nightState = { wolfTarget: h1.id, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    clearStepTimer();
    const case1 = {
      phase: state.match.phase,
      winner: state.match.winner,
      winReason: state.match.winReason,
      hunterAlive: h1.alive
    };

    // 2. 狼刀在先：最後一神奉茶師被刀 + 同夜清心茶反殺最後一狼 -> 清心茶生效前已屠神，狼人勝
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const seer2 = state.match.seats.find(s => s.role === "seer");
    const hunter2 = state.match.seats.find(s => s.role === "hunter");
    const witch2 = state.match.seats.find(s => s.role === "witch");
    const wolves2 = state.match.seats.filter(s => s.team === "wolf");
    seer2.alive = false;
    hunter2.alive = false;
    wolves2[0].alive = false;
    const lastWolf2 = wolves2[1];
    state.match.day = 2;
    state.match.nightState = { wolfTarget: witch2.id, seerTarget: null, witchSaved: false, witchPoisonTarget: lastWolf2.id };
    resolveDawn();
    clearStepTimer();
    const case2 = {
      phase: state.match.phase,
      winner: state.match.winner,
      winReason: state.match.winReason,
      lastWolfStillAliveAfterKnifeWin: lastWolf2.alive
    };

    // 3. 非最後一神獵人被狼刀（尚有其他神職存活）-> 正常觸發開槍（HUNTER_TRIGGER）
    el("selectPreferredRole").value = "hunter";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const h3 = getPlayerSeat();
    state.match.day = 2;
    state.match.nightState = { wolfTarget: h3.id, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    clearStepTimer();
    const case3 = { phase: state.match.phase, hunterAlive: h3.alive };

    // 4. 白天公投投出最後一神獵人 -> 仍可開槍帶走最後一狼逆轉好人勝
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "hunter";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const h4 = getPlayerSeat();
    const seer4 = state.match.seats.find(s => s.role === "seer");
    const witch4 = state.match.seats.find(s => s.role === "witch");
    const wolves4 = state.match.seats.filter(s => s.team === "wolf");
    seer4.alive = false;
    witch4.alive = false;
    wolves4[0].alive = false;
    const lastWolf4 = wolves4[1];
    state.match.day = 2;
    state.match.phase = "DAY_VOTE";
    state.match.sheriffSeatId = null;
    state.match.pkCandidates = null;
    state.match.convenienceRallyTargetId = h4.id;
    getAliveSeats().forEach(s => {
      if (s.id !== h4.id) {
        s.publicVoteIntent = h4.id;
        s.suspicionMap[h4.id] = 99;
      }
    });
    finalizeVoteRound(lastWolf4.id);
    if (state.voteFlight && typeof state.voteFlight.finish === "function") {
      state.voteFlight.finish();
    }
    const midPhase4 = state.match.phase;
    if (midPhase4 === "HUNTER_TRIGGER") {
      state.selectedSeatId = lastWolf4.id;
      confirmTargetAction();
      if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
    }
    const case4 = {
      midPhase: midPhase4,
      finalPhase: state.match.phase,
      winner: state.match.winner,
      lastWolfDead: !lastWolf4.alive
    };

    resetMatchToLobby();
    ({ case1, case2, case3, case4 });
  `, ctx);

  if (aowuRes.case1.phase !== "GAME_OVER" || aowuRes.case1.winner !== "wolf" || !String(aowuRes.case1.winReason).includes("屠神") || !String(aowuRes.case1.winReason).includes("無法發動共鳴")) {
    throw new Error("HUNTER-AOWU Case 1 (last-God Hunter night-killed must not shoot) failed: " + JSON.stringify(aowuRes.case1));
  }
  if (aowuRes.case2.phase !== "GAME_OVER" || aowuRes.case2.winner !== "wolf" || !String(aowuRes.case2.winReason).includes("狼刀在先") || !String(aowuRes.case2.winReason).includes("屠神") || !aowuRes.case2.lastWolfStillAliveAfterKnifeWin) {
    throw new Error("HUNTER-AOWU Case 2 (wolf-knife-first over witch poison) failed: " + JSON.stringify(aowuRes.case2));
  }
  if (aowuRes.case3.phase !== "HUNTER_TRIGGER" || aowuRes.case3.hunterAlive) {
    throw new Error("HUNTER-AOWU Case 3 (non-last-God Hunter night-killed must shoot) failed: " + JSON.stringify(aowuRes.case3));
  }
  if (aowuRes.case4.midPhase !== "HUNTER_TRIGGER" || aowuRes.case4.finalPhase !== "GAME_OVER" || aowuRes.case4.winner !== "good" || !aowuRes.case4.lastWolfDead) {
    throw new Error("HUNTER-AOWU Case 4 (voted-out last-God Hunter shoots last Wolf -> Good win) failed: " + JSON.stringify(aowuRes.case4));
  }
}

// FULL-UPGRADE-P0P1P2: Sheriff Election/Order + Voted Hunter Last Words + Guard & Double-Break + Wolf Deck + Prompt + 3D/HUD + Tea Event + MVP + Dead God-View
{
  const upgRes = await (async () => {
    // 1. Guard 8p board, consecutive guard block, self-guard, solo shield peace, and double-break (同守同救破盾)
    const gCase = vm.runInContext(`(() => {
      clearStepTimer();
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "guard";
      el("chkGuardMode").checked = true;
      el("chkSheriffMode").checked = false;
      state.autoPlay = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const pid = getPlayerId();
      const hasGuard = state.match.seats.some(s => s.role === "guard");
      const pIsGuard = getPlayerSeat().role === "guard";
      const guardKeysInclude = getActiveGodRoleKeys().includes("guard");
      const n1Phase = state.match.phase;

      const other2 = state.match.seats.find(s => s.id !== pid && s.role !== "wolf");
      state.selectedSeatId = other2.id;
      confirmTargetAction();
      clearStepTimer();
      state.match.nightState.wolfTarget = other2.id;
      state.match.nightState.witchSaved = false;
      state.match.nightState.witchPoisonTarget = null;
      resolveDawn();
      clearStepTimer();
      const seat2AlivePeace = other2.alive;
      const arch1 = state.match.nightArchive[state.match.nightArchive.length - 1];
      const arch1Peace = state.match.peaceNights.includes(1) && Boolean(arch1 && arch1.casualties.length === 0);

      beginNightPhase();
      state.selectedSeatId = other2.id;
      confirmTargetAction(); // must block consecutive guard
      const blockedStillGuardPhase = state.match.phase === "NIGHT_GUARD" && state.match.nightState.guardTarget === null;

      state.selectedSeatId = pid; // self-guard allowed
      confirmTargetAction();
      clearStepTimer();
      const selfGuardOk = state.match.nightState.guardTarget === pid && state.match.lastGuardTargetId === pid;

      const s3 = state.match.seats.find(s => s.id !== pid && s.id !== other2.id && s.alive && s.role !== "wolf");
      state.match.nightState.guardTarget = s3.id;
      state.match.nightState.wolfTarget = s3.id;
      state.match.nightState.witchSaved = true;
      state.match.nightState.witchPoisonTarget = null;
      state.match.witchPotions.heal = false;
      resolveDawn();
      clearStepTimer();
      const arch2 = state.match.nightArchive[state.match.nightArchive.length - 1];
      const doubleBreakWorked = !s3.alive && s3.outReason === "同守同救破盾" && Boolean(arch2 && arch2.doubleSaveClash);

      return { hasGuard, pIsGuard, guardKeysInclude, n1Phase, seat2AlivePeace, arch1Peace, blockedStillGuardPhase, selfGuardOk, doubleBreakWorked };
    })()`, ctx);

    // 2. Sheriff Election + Order Pick + Sheriff LAST slot in dayOrder + PK Duel Banner + Tea Event + MVP Timeline + Dead God-View
    const shCase = vm.runInContext(`(() => {
      clearStepTimer();
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkGuardMode").checked = true;
      el("chkSheriffMode").checked = true;
      state.autoPlay = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const pid = getPlayerId();
      const pendingInit = state.match.sheriffElectionPending === true;
      let electionDoneFired = false;
      startSheriffElection(function () { electionDoneFired = true; });
      const inElectionPhase = state.match.phase === "SHERIFF_ELECTION";
      const electionPanelVisible = !el("panelSheriffElection").classList.contains("hidden");
      resolveSheriffElectionAction("run");
      const playerJoinedCand = state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.candidateIds.includes(pid);
      resolveSheriffElectionAction("pass");
      const electedSeatAlive = Boolean(state.match.sheriffSeatId && getSeat(state.match.sheriffSeatId).alive);

      state.match.sheriffSeatId = pid;
      startSheriffOrderPick(function (dir) { startDayDiscussion(null, { forcedDir: dir }); });
      const inOrderPhase = state.match.phase === "SHERIFF_ORDER";
      const orderPanelVisible = !el("panelSheriffOrder").classList.contains("hidden");
      resolveSheriffOrderPick(-1);
      clearStepTimer();
      const dayOrderTailIsSheriff = state.match.dayOrder[state.match.dayOrder.length - 1] === pid;
      // Strict consecutive circular ring invariant: zero mid-ring jumps when Sheriff speaks last!
      const nTot = state.match.totalSeats;
      const dOrd = state.match.dayOrder;
      let strictRingConsecutive = dOrd.length === getAliveSeats().length;
      for (let oi = 0; oi < dOrd.length - 1; oi++) {
        const expectedNext = ((dOrd[oi] - 1 - 1 + nTot) % nTot) + 1;
        if (dOrd[oi + 1] !== expectedNext) strictRingConsecutive = false;
      }
      if (!strictRingConsecutive) throw new Error("Sheriff dayOrder broke circular consecutiveness: " + JSON.stringify(dOrd));

      // PK Duel Banner live count test
      const pkPair = state.match.seats.filter(s => s.id !== pid && s.alive).slice(0, 2);
      state.match.pkCandidates = [pkPair[0].id, pkPair[1].id];
      state.match.phase = "DAY_VOTE";
      const liveMap = {};
      liveMap[pkPair[0].id] = 4;
      liveMap[pkPair[1].id] = 3;
      renderPkDuelBanner(liveMap);
      const pkBannerOk = !el("pkDuelBanner").classList.contains("hidden")
        && el("pkLeftVotes").textContent.includes("4")
        && el("pkRightVotes").textContent.includes("3");
      state.match.pkCandidates = null;

      // Dawn casualty presentation + Hero beat
      triggerDawnCasualtyPresentation([{ id: pkPair[0].id, cause: "double_clash" }]);
      if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") {
        stage3d.triggerHeroBeat("gasp_react", 1400);
      }

      // Tea Event interactive bar
      orchestrator.rollDailyTeaEvent(2);
      state.match.phase = "DAY_SPEECH";
      state.match.day = 2;
      state.match.directorEventInteractedDay = 0;
      renderDirectorEventChoiceBar();
      const dirBarShown = !el("directorEventChoiceBar").classList.contains("hidden");
      const dirChoiceDone = orchestrator.triggerDirectorEventChoice("front");
      const dirChoiceSpent = orchestrator.canUseDirectorEventAction() === false && state.match.directorEventInteractedDay === 2;

      // Dead-player God-View FIRST (forfeits guess bonus + reveals real badges)
      const wolfTarget = state.match.seats.find(s => s.id !== pid && s.role === "wolf");
      getSeat(pid).alive = false;
      state.match.spectatorGuess.wolfIds = wolfTarget ? [wolfTarget.id] : [];
      enableSpectatorGodView();
      const godActive = isSpectatorGodViewActive();
      const godEval = evaluateSpectatorGuess();
      renderSeatStrip();
      const stripShowsWolf = (el("seatButtonStrip")._children || []).some(function (b) {
        return (b._children || []).some(function (c) { return String(c.textContent || "").includes("狼"); });
      });

      // MVP + Guard Double-Break Timeline (revealed by Dead-player God-View)
      state.match.nightArchive.push({
        day: 2,
        wolfTarget: pkPair[0].id,
        guardTarget: pkPair[0].id,
        doubleSaveClash: true,
        seerTarget: pkPair[1].id,
        witchSaved: true,
        witchPoisonTarget: null,
        casualties: [{ id: pkPair[0].id, cause: "double_clash" }],
        hunterShot: null
      });
      renderVoteSheetIntoBody();
      const timelineHtml = el("voteSheetBody").innerHTML;
      const mvpAndDoubleInTimeline = timelineHtml.includes("關鍵轉折") && timelineHtml.includes("同守破盾");

      return {
        pendingInit, inElectionPhase, electionPanelVisible, playerJoinedCand,
        electionDoneFired, electedSeatAlive,
        inOrderPhase, orderPanelVisible, dayOrderTailIsSheriff, pkBannerOk,
        dirBarShown, dirChoiceDone, dirChoiceSpent, mvpAndDoubleInTimeline,
        godActive, godBonusZero: Boolean(godEval && godEval.bonusPts === 0), stripShowsWolf
      };
    })()`, ctx);

    // 3. Daytime Voted-Out Hunter delivers Last Words after shooting
    const vhCase = vm.runInContext(`(() => {
      clearStepTimer();
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkGuardMode").checked = true;
      el("chkSheriffMode").checked = false;
      state.autoPlay = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const pid = getPlayerId();
      const hSeat = state.match.seats.find(s => s.id !== pid && s.role === "hunter");
      const vSeat = state.match.seats.find(s => s.id !== pid && s.id !== hSeat.id && s.role === "villager");
      state.match.day = 2;
      state.match.phase = "DAY_VOTE";
      state.match.sheriffSeatId = null;
      state.match.pkCandidates = null;
      getAliveSeats().forEach(s => {
        if (s.id !== hSeat.id) {
          s.publicVoteIntent = hSeat.id;
          s.suspicionMap[hSeat.id] = 98;
        }
      });
      finalizeVoteRound(vSeat.id);
      if (state.voteFlight && typeof state.voteFlight.finish === "function") state.voteFlight.finish();
      if (state.match.phase === "HUNTER_TRIGGER") {
        executeHunterShotPresentation(hSeat, vSeat);
      }
      const afterShotResolvePhase = state.match.phase;
      if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
      const phaseAfterHunterCommit = state.match.phase;
      const lastWordSpeakerId = state.activeSpeakerId;
      clearStepTimer();
      return { afterShotResolvePhase, phaseAfterHunterCommit, expectedHunterId: hSeat.id, lastWordSpeakerId };
    })()`, ctx);

    // 4. Wolf 3-card deck + live Wolf mate bubble reply + Enriched Gemini Prompt & Day 2+ Backstab Context
    const wolfDeckInfo = vm.runInContext(`(() => {
      clearStepTimer();
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "wolf";
      state.autoPlay = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const pid = getPlayerId();
      state.match.phase = "NIGHT_WOLF";
      const tacticBtn = el("wolfTacticRow").querySelector('[data-wolf-tactic="deep_stealth"]');
      tacticBtn.click();
      const mate = state.match.seats.find(s => s.id !== pid && s.role === "wolf");
      const mateBubble = mate && state.seatBubbles[mate.id] ? state.seatBubbles[mate.id].text : "";

      state.match.phase = "DAY_PLAYER_TURN";
      preparePlayerSpeechPanel();
      const cardsHtml = el("quickSpeechChips")._children.map(c => String(c.innerHTML || "")).join("|");

      // Day 2 minority vote split note
      const others = state.match.seats.filter(s => s.id !== pid && s.alive);
      const sA = others[0], sB = others[1], tTop = others[2], tMinor = others[3];
      state.match.day = 2;
      state.match.voteHistory = [{
        day: 1,
        outId: tTop.id,
        tallies: { [tTop.id]: 5, [tMinor.id]: 1 },
        ballots: [
          { voterId: sB.id, targetId: tMinor.id, weight: 1 },
          { voterId: sA.id, targetId: tTop.id, weight: 1 }
        ]
      }];
      const day2Ctx = buildSpeechContext(sA);
      const hasBackstabNote = String(day2Ctx.prevVoteNote || "").includes("分票");

      // Prepare for Gemini prompt inspection
      state.match.sheriffSeatId = sA.id;
      state.match.fourGHopePair = [sA.id, sB.id];
      return { tacticNow: state.match.wolfTactic, mateBubble, cardsHtml, hasBackstabNote, speakerId: sA.id };
    })()`, ctx);

    let capturedPrompt = "";
    const prevFetch = ctx.fetch;
    ctx.fetch = async (url, opts) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        try {
          const parsed = JSON.parse(opts && opts.body ? opts.body : "{}");
          capturedPrompt = (((parsed.contents || [])[0] || {}).parts || [])[0].text || "";
        } catch (e) { }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ text: "根據警長歸票與給希望雙光線索，這輪投 2 號！", accuseId: 2, vouchId: null, claimRole: null }) }] } }]
          })
        };
      }
      return prevFetch(url, opts);
    };
    try {
      const promptSpeaker = vm.runInContext("getSeat(" + wolfDeckInfo.speakerId + ")", ctx);
      ctx.__state.geminiApiKey = "TEST_MOCK_KEY";
      await ctx.__orchestrator.dispatchAgent("PersonaAgent", {
        speaker: promptSpeaker,
        fallbackMeta: { targetId: null, relationType: null, accuseId: null, vouchId: null, hasToxicSlip: false, text: "先觀察一下" }
      });
    } finally {
      ctx.__state.geminiApiKey = "";
      ctx.fetch = prevFetch;
      vm.runInContext("clearStepTimer(); resetMatchToLobby();", ctx);
    }

    return { gCase, shCase, vhCase, wolfDeckInfo, capturedPrompt };
  })();

  if (!upgRes.gCase.hasGuard || !upgRes.gCase.pIsGuard || !upgRes.gCase.guardKeysInclude || upgRes.gCase.n1Phase !== "NIGHT_GUARD" || !upgRes.gCase.seat2AlivePeace || !upgRes.gCase.arch1Peace || !upgRes.gCase.blockedStillGuardPhase || !upgRes.gCase.selfGuardOk || !upgRes.gCase.doubleBreakWorked) {
    throw new Error("FULL-UPGRADE Guard / Double-Break check failed: " + JSON.stringify(upgRes.gCase));
  }
  if (!upgRes.shCase.pendingInit || !upgRes.shCase.inElectionPhase || !upgRes.shCase.electionPanelVisible || !upgRes.shCase.playerJoinedCand || !upgRes.shCase.electionDoneFired || !upgRes.shCase.electedSeatAlive || !upgRes.shCase.inOrderPhase || !upgRes.shCase.orderPanelVisible || !upgRes.shCase.dayOrderTailIsSheriff || !upgRes.shCase.pkBannerOk || !upgRes.shCase.dirBarShown || !upgRes.shCase.dirChoiceDone || !upgRes.shCase.dirChoiceSpent || !upgRes.shCase.mvpAndDoubleInTimeline || !upgRes.shCase.godActive || !upgRes.shCase.godBonusZero || !upgRes.shCase.stripShowsWolf) {
    throw new Error("FULL-UPGRADE Sheriff/PK/Tea/MVP/GodView check failed: " + JSON.stringify(upgRes.shCase));
  }
  if (upgRes.vhCase.afterShotResolvePhase !== "HUNTER_RESOLVE" || upgRes.vhCase.phaseAfterHunterCommit !== "LAST_WORDS_SPEECH" || upgRes.vhCase.lastWordSpeakerId !== upgRes.vhCase.expectedHunterId) {
    throw new Error("FULL-UPGRADE Voted-out Hunter Last Words check failed: " + JSON.stringify(upgRes.vhCase));
  }
  if (upgRes.wolfDeckInfo.tacticNow !== "deep_stealth" || !upgRes.wolfDeckInfo.mateBubble.includes("倒鉤") || (!upgRes.wolfDeckInfo.cardsHtml.includes("悍跳") && !upgRes.wolfDeckInfo.cardsHtml.includes("狼隊")) || !upgRes.wolfDeckInfo.cardsHtml.includes("拉攏") || !upgRes.wolfDeckInfo.hasBackstabNote) {
    throw new Error("FULL-UPGRADE Wolf Deck / Mate Reply / Backstab check failed: " + JSON.stringify(upgRes.wolfDeckInfo));
  }
  if (!upgRes.capturedPrompt.includes("警長") || !upgRes.capturedPrompt.includes("給希望") || !upgRes.capturedPrompt.includes("凹嗚")) {
    throw new Error("FULL-UPGRADE Enriched Gemini prompt missing Sheriff/4G/Aowu clues! prompt=" + upgRes.capturedPrompt.slice(0, 400));
  }
}

// BUG-AUDIT-FIXES: Zero hidden-info leaks on fake-seer check, Night-1 dead player sheriff auto-resolve, running player cannot under-vote, Guard Last Words, God-View game-over summary, & PK banner spacing
{
  const auditRes = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkGuardMode").checked = true;
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const wolfTargetSeat = state.match.seats.find(s => s.id !== pid && s.team === "wolf");
    state.match.phase = "DAY_PLAYER_TURN";
    el("playerSpeechInput").value = "我是明心觀察員！昨晚查驗 0" + wolfTargetSeat.id + "號 是酸民狼查殺，請大家投他！";
    submitPlayerSpeech();
    const wolfBubbleAfterCheck = state.seatBubbles[wolfTargetSeat.id] ? state.seatBubbles[wolfTargetSeat.id].text : "";
    const noTeamLeakOnCheck = !wolfBubbleAfterCheck.includes("偏偏查到我");

    // Guard AI spotting player bluff on guard claim
    const guardAi = state.match.seats.find(s => s.id !== pid && s.role === "guard" && s.alive);
    state.match.phase = "DAY_PLAYER_TURN";
    el("playerSpeechInput").value = "其實我是護心守衛，昨晚守護過自己！";
    submitPlayerSpeech();
    const guardAiAlert = guardAi ? (guardAi.suspicionMap[pid] === 100) : true;

    // Dead Night-1 player auto-resolves sheriff election cleanly with alive Sheriff
    getSeat(pid).alive = false;
    state.match.sheriffElectionPending = true;
    state.match.sheriffSeatId = pid; // dead pre-seed must be replaced by alive seat!
    let deadDone = false;
    const openedForDead = startSheriffElection(function () { deadDone = true; });
    const shAfterDead = state.match.sheriffSeatId ? getSeat(state.match.sheriffSeatId) : null;
    const deadElectionAutoResolved = openedForDead === false && deadDone && Boolean(shAfterDead && shAfterDead.alive);

    // Alive running player cannot cast under-sheriff vote for rival candidate
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pid2 = getPlayerId();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    indieFlow.syncBodyScreenState();
    const stripHiddenInElection = el("seatButtonStrip").classList.contains("hidden");
    resolveSheriffElectionAction("run");
    const otherCand = (state.match.sheriffElectionCtx.candidateIds || []).find(id => id !== pid2);
    const blockedRunningUnderVote = otherCand ? (resolveSheriffElectionAction(otherCand) === false) : true;
    resolveSheriffElectionAction("pass");

    // Guard toggle off resets guard preference cleanly
    el("selectPreferredRole").value = "guard";
    el("chkGuardMode").checked = true;
    state.guardMode = true;
    el("btnSetupGuardToggle").click();
    const resetGuardPrefOk = el("selectPreferredRole").value !== "guard" && !state.guardMode;

    // Guard Last Words + God-View Game Over Summary visibility
    const gLwObj = buildAiLastWords({ id: 4, name: "阿竹", role: "guard", team: "good", suspicionMap: {} }, "vote_out");
    const guardLwOk = Boolean(gLwObj && gLwObj.claimRole === "guard" && gLwObj.text.includes("護心守衛"));

    getSeat(getPlayerId()).alive = false;
    enableSpectatorGodView();
    state.match.phase = "GAME_OVER";
    renderGameOverGuessSummary();
    const godSummaryVisible = !el("gameOverGuessBox").classList.contains("hidden") && el("gameOverGuessBox").innerHTML.includes("上帝視角") || (!el("gameOverGuessBox").classList.contains("hidden") && (el("gameOverGuessBox")._children || []).length > 0);

    clearStepTimer();
    resetMatchToLobby();
    return {
      noTeamLeakOnCheck,
      guardAiAlert,
      deadElectionAutoResolved,
      stripHiddenInElection,
      blockedRunningUnderVote,
      resetGuardPrefOk,
      guardLwOk,
      godSummaryVisible
    };
  })()`, ctx);

  if (!compCss.includes("top: 102px")) {
    throw new Error("BUG-AUDIT .pk-duel-banner missing top: 102px non-overlapping offset!");
  }
  for (const [k, v] of Object.entries(auditRes)) {
    if (!v) {
      throw new Error("BUG-AUDIT check failed for " + k + ": " + JSON.stringify(auditRes));
    }
  }
}

// PLAYER-MULTI-PIT-UX: Simplified DAY_PLAYER_TURN layout + 1-click Multi-Pit Composer + Dual-Seer stand autofill
{
  const mpRes = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkGuardMode").checked = true;
    el("chkSheriffMode").checked = false;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const goodListeners = state.match.seats.filter(s => s.id !== pid && s.team === "good");
    const listener = goodListeners[0];
    const targetPool = state.match.seats.filter(s => s.id !== pid && s.id !== listener.id);
    const w1 = targetPool[0], w2 = targetPool[1], g1 = targetPool[2];

    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const stripHiddenInTurn = el("seatButtonStrip").classList.contains("hidden");
    const builderEl = el("playerPitBuilder");
    const seatBtns = builderEl ? (builderEl._children[0] ? builderEl._children[0]._children.filter(c => c.getAttribute && c.getAttribute("data-pit-seat")) : []) : [];
    const pillCount = seatBtns.length;

    const btnW1 = seatBtns.find(b => b.getAttribute("data-pit-seat") === String(w1.id));
    const btnW2 = seatBtns.find(b => b.getAttribute("data-pit-seat") === String(w2.id));
    const btnG1 = seatBtns.find(b => b.getAttribute("data-pit-seat") === String(g1.id));

    const prevSusW1 = listener.suspicionMap[w1.id] || 50;
    const prevSusW2 = listener.suspicionMap[w2.id] || 50;
    const prevSusG1 = listener.suspicionMap[g1.id] || 50;

    // Click w1 once (wolf), w2 once (wolf), g1 twice (wolf -> good)
    btnW1.click();
    btnW2.click();
    const curSeatRow2 = el("playerPitBuilder")._children[0]._children;
    curSeatRow2.find(c => c.getAttribute && c.getAttribute("data-pit-seat") === String(g1.id)).click();
    const curSeatRow3 = el("playerPitBuilder")._children[0]._children;
    curSeatRow3.find(c => c.getAttribute && c.getAttribute("data-pit-seat") === String(g1.id)).click();

    const draftBeforeSend = JSON.parse(JSON.stringify(state.match.playerDraftPits));
    const autoText = el("quickFreeInput").value;
    const sendLabelDuringDraft = el("btnQuickFreeSend").textContent;

    el("btnQuickFreeSend").click();
    clearStepTimer();
    const committedEv = state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1];
    const deltaW1 = (listener.suspicionMap[w1.id] || 50) - prevSusW1;
    const deltaW2 = (listener.suspicionMap[w2.id] || 50) - prevSusW2;
    const deltaG1 = (listener.suspicionMap[g1.id] || 50) - prevSusG1;
    const draftResetAfter = state.match.playerDraftPits.wolfIds.length === 0 && state.match.playerDraftPits.goodIds.length === 0;

    // Dual-Seer scenario: clicking [data-pit-stand] auto-populates goodIds and wolfIds matching that Seer's world
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pid2 = getPlayerId();
    const sA = state.match.seats.find(s => s.id !== pid2 && s.role === "seer");
    const sB = state.match.seats.find(s => s.id !== pid2 && s.role === "wolf");
    const candOther = state.match.seats.find(s => s.id !== pid2 && s.id !== sA.id && s.id !== sB.id);
    sA.claimedRole = "seer";
    sB.claimedRole = "seer";
    state.match.day = 1;
    state.match.daySpeechEvents = [
      { day: 1, speakerId: sA.id, claimRole: "seer", accuseId: sB.id, checkedWolfId: sB.id, wolfPits: [sB.id, candOther.id], goodPits: [] },
      { day: 1, speakerId: sB.id, claimRole: "seer", accuseId: sA.id, checkedWolfId: sA.id, wolfPits: [sA.id], goodPits: [candOther.id] }
    ];
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const extraRow = el("playerPitBuilder")._children[1];
    const standBtnA = extraRow ? extraRow._children.find(c => c.getAttribute && c.getAttribute("data-pit-stand") === String(sA.id)) : null;
    if (standBtnA) standBtnA.click();
    const standDraft = JSON.parse(JSON.stringify(state.match.playerDraftPits));

    clearStepTimer();
    resetMatchToLobby();
    return {
      stripHiddenInTurn,
      pillCount,
      draftBeforeSend,
      autoText,
      sendLabelDuringDraft,
      evWolfPits: committedEv ? committedEv.wolfPits : [],
      evGoodPits: committedEv ? committedEv.goodPits : [],
      deltaW1,
      deltaW2,
      deltaG1,
      draftResetAfter,
      standAutofillOk: Boolean(standBtnA && standDraft.standSeerId === sA.id && standDraft.goodIds.includes(sA.id) && standDraft.wolfIds.includes(sB.id)),
      sAId: sA.id,
      sBId: sB.id,
      w1Id: w1.id,
      w2Id: w2.id,
      g1Id: g1.id
    };
  })()`, ctx);

  if (!mpRes.stripHiddenInTurn || mpRes.pillCount !== 7) {
    throw new Error("PLAYER-MULTI-PIT strip hide or pill count failed: " + JSON.stringify(mpRes));
  }
  if (mpRes.draftBeforeSend.wolfIds.length !== 2 || mpRes.draftBeforeSend.goodIds.length !== 1 || !mpRes.autoText.includes("好人坑") || !mpRes.autoText.includes("狼坑") || !mpRes.sendLabelDuringDraft.includes("2狼·1好")) {
    throw new Error("PLAYER-MULTI-PIT draft auto-compose failed: " + JSON.stringify(mpRes));
  }
  if (!mpRes.evWolfPits.includes(mpRes.w1Id) || !mpRes.evWolfPits.includes(mpRes.w2Id) || !mpRes.evGoodPits.includes(mpRes.g1Id) || !(mpRes.deltaW1 > 0) || !(mpRes.deltaW2 > 0) || !(mpRes.deltaG1 < 0) || !mpRes.draftResetAfter) {
    throw new Error("PLAYER-MULTI-PIT multi-target suspicion or reset failed: " + JSON.stringify(mpRes));
  }
  if (!mpRes.standAutofillOk) {
    throw new Error("PLAYER-MULTI-PIT Dual-Seer stand autofill failed: " + JSON.stringify(mpRes));
  }
}

// PK-BANNER-FIX: Verify zero empty <img src="">, CSS .hidden cascade parity, and renderPkDuelBanner portrait guards
{
  if (/<img\b[^>]*\bsrc\s*=\s*["']\s*["']/i.test(html)) {
    throw new Error("PK-BANNER-FIX: ai.html contains empty <img src=\"\"> which triggers broken-image icons!");
  }
  const combinedCustomCss = fs.readFileSync("css/theme.css", "utf8") + "\n" + fs.readFileSync("css/components.css", "utf8");
  const tagRe = /<[^>]*class="([^"]*\bhidden\b[^"]*)"[^>]*>/g;
  const classesWithHidden = new Set();
  let tm;
  while ((tm = tagRe.exec(html))) {
    for (const c of tm[1].split(/\s+/)) {
      if (c && c !== "hidden") classesWithHidden.add(c);
    }
  }
  for (const cls of classesWithHidden) {
    const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const dispRe = new RegExp("\\." + esc + "\\s*\\{[^}]*display\\s*:\\s*(?:flex|inline-flex|grid|block)");
    if (dispRe.test(combinedCustomCss)) {
      const fixRe = new RegExp("\\." + esc + "\\.hidden\\s*\\{[^}]*display\\s*:\\s*none");
      if (!fixRe.test(combinedCustomCss)) {
        throw new Error(`PK-BANNER-FIX: .${cls} declares display in custom CSS without .${cls}.hidden { display: none; }!`);
      }
    }
  }

  const pkRes = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const other = state.match.seats.find(s => s.id !== pid && s.alive);
    state.match.pkCandidates = null;
    state.match.phase = "DAY_SPEECH";
    renderPkDuelBanner();
    const hiddenWhenInactive = el("pkDuelBanner").classList.contains("hidden") && el("pkDuelBanner").getAttribute("aria-hidden") === "true";

    state.match.pkCandidates = [pid, other.id];
    renderPkDuelBanner();
    const visibleWhenActive = !el("pkDuelBanner").classList.contains("hidden") && el("pkDuelBanner").getAttribute("aria-hidden") === "false";
    const leftSrc = el("pkLeftImg").src || "";
    const rightSrc = el("pkRightImg").src || "";
    const imgsShown = !el("pkLeftImg").classList.contains("hidden") && !el("pkRightImg").classList.contains("hidden");

    if (typeof el("pkLeftImg").onerror === "function") el("pkLeftImg").onerror();
    const onErrorHidesLeft = el("pkLeftImg").classList.contains("hidden") && el("pkLeftImg").getAttribute("data-art") === null;

    clearStepTimer();
    resetMatchToLobby();
    return {
      hiddenWhenInactive,
      visibleWhenActive,
      leftSrcValid: leftSrc.includes("assets/portraits") || leftSrc.startsWith("data:image/"),
      rightSrcValid: rightSrc.includes("assets/portraits") || rightSrc.startsWith("data:image/"),
      imgsShown,
      onErrorHidesLeft
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(pkRes)) {
    if (!v) {
      throw new Error("PK-BANNER-FIX runtime check failed for " + k + ": " + JSON.stringify(pkRes));
    }
  }
}

// VISUAL-UPGRADE-P0-P1-P2: Verify VRM Cel shader, PostFX AA/Single-ACES, Ribbon/Skill VFX, Textures, Anti-Overlap & 3-Tier Quality
{
  const visRes = vm.runInContext(`(() => {
    const ballotTex = stage3dTextures.createBallotCardTexture();
    const runesTex = stage3dTextures.createSkillRunesTexture();
    const roofTex = stage3dTextures.createRoofTileTextures();
    const pineTex = stage3dTextures.createPineNeedleTexture();
    const feltTex = stage3dTextures.createFeltMatTexture();
    const plaqueB = stage3dTextures.createPlaqueCanvas();

    // P2-3: 3-tier quality cycling (high -> balanced -> eco -> high)
    state.quality3D = "high";
    stage3d.toggleQualityMode();
    const q1 = state.quality3D;
    const lbl1 = el("btnToggle3DQuality").textContent;
    stage3d.toggleQualityMode();
    const q2 = state.quality3D;
    const lbl2 = el("btnToggle3DQuality").textContent;
    stage3d.toggleQualityMode();
    const q3 = state.quality3D;
    const lbl3 = el("btnToggle3DQuality").textContent;

    // P0-3: Guard shield 3D dome VFX + ribbon arcs
    let guardDomeOk = false;
    if (stage3d.fx && stage3d.fx.skillDome) {
      trigger3DSkillAura(stage3d.fx, new THREE.Vector3(1, 0, 1), "#fbbf24", "guard_shield", 2000);
      guardDomeOk = Boolean(stage3d.fx.skillDome.visible && stage3d.fx.skillRing && stage3d.fx.skillRing.visible);
    }

    // P2-1: Overlapping 8-seat draw3DOverlayHud anti-overlap run
    const fakeCtx = el("sanctuaryCanvas").getContext("2d");
    const fakeCoords = [1, 2, 3, 4].map(id => ({
      id, x: 300 + id * 4, y: 180, r: 28, zDepth: 0.5, visibleInView: true,
      seat: { id, name: "席" + id, alive: true, role: "villager", microPulse: 20, color: "#fbbf24" }
    }));
    draw3DOverlayHud(fakeCtx, { dpr: 1, p: "DAY_SPEECH", w: 800, h: 450, nowMs: 2500, tSec: 2.5, daylight: true, cx: 400, cy: 225 }, fakeCoords);

    // P2-2: Portrait mood class sync
    const spMock = { id: 2, name: "小澄", color: "#38bdf8", alive: true };
    setSeatEmotion(2, "angry", 4000);
    syncSpeakerBannerVisuals(spMock, "02號 · 小澄", "邏輯", true);
    const moodClassOk = el("speakerPortraitImg").classList.contains("portrait-mood-angry") && el("speakerPortraitImg").classList.contains("portrait-speaking-breathe");

    return {
      newTexturesOk: Boolean(ballotTex && runesTex && roofTex && roofTex.map && roofTex.bump && pineTex),
      hiResTableOk: Boolean(feltTex && feltTex.image && feltTex.image.width === 1024 && plaqueB.canvas && plaqueB.canvas.width === 512),
      qualityCycleOk: q1 === "balanced" && lbl1 === "均衡畫質" && q2 === "eco" && lbl2 === "省電流暢" && q3 === "high" && lbl3 === "極致畫質",
      guardDomeOk,
      ribbonPoolOk: Boolean(stage3d.fx && stage3d.fx.beamPool && stage3d.fx.beamPool[0] && stage3d.fx.beamPool[0].ribbon),
      moodClassOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(visRes)) {
    if (!v) {
      throw new Error("VISUAL-UPGRADE-P0-P1-P2 check failed for " + k + ": " + JSON.stringify(visRes));
    }
  }
}

// STATIC-VRM-FALLBACK & SECURITY CHECK (P0-1 / P0-4 / P1-2)
{
  const manifestPath = path.join(ROOT, "assets/models/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Missing static fallback manifest: assets/models/manifest.json");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.heroModel || !fs.existsSync(path.join(ROOT, manifest.heroModel))) {
    throw new Error("Static manifest heroModel missing on disk: " + manifest.heroModel);
  }
  for (const slug of ["player", "player_male", "xiaocheng", "nuannuan", "asong", "xinger", "xiaoyun", "azhu", "chenchen"]) {
    const rel = manifest.seatModels && manifest.seatModels[slug];
    if (!rel || !fs.existsSync(path.join(ROOT, rel))) {
      throw new Error("Static manifest seat model missing on disk for " + slug + ": " + rel);
    }
  }
  const geminiSrc = fs.readFileSync(path.join(ROOT, "js/ai/gemini.js"), "utf8");
  const voiceSrc = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  if (geminiSrc.includes("?key=") || voiceSrc.includes("?key=")) {
    throw new Error("Gemini API key must be passed via x-goog-api-key header, not URL query string");
  }
  if (!voiceSrc.includes("gemini-3.8-flash-tts")) {
    throw new Error("Voice TTS endpoint should target gemini-3.8-flash-tts");
  }
  const staticManifestOk = vm.runInContext(`(() => {
    const m = stage3d.getDefaultStaticAvatarManifest();
    return Boolean(m && m.ok && m.heroModel === "assets/models/qingming.vrm" && m.seatModels && Object.keys(m.seatModels).length === 9);
  })()`, ctx);
  if (!staticManifestOk) {
    throw new Error("stage3d.getDefaultStaticAvatarManifest() failed validation");
  }
}

// PLAN1-PLAN2-UPGRADE: Voice streaming/pause/speed, Stance strip, Reaction card, Table matrix, Quote rebuttal, PWA, and 10/12-player expansion
{
  const pwaManifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  if (!pwaManifest.name || !pwaManifest.start_url) {
    throw new Error("Invalid manifest.webmanifest");
  }
  const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  if (!swSrc.includes("/api/") || !swSrc.includes("CACHE_NAME") || !swSrc.includes("IMMUTABLE_RE")) {
    throw new Error("sw.js missing API bypass or static cache strategy");
  }

  const p12Res = vm.runInContext(`(() => {
    // 1. Seat number formatter invariants (01..09, 10..12 — never 010!)
    const fmtOk = fmtSeatNum(1) === "01" && fmtSeatNum(9) === "09" && fmtSeatNum(10) === "10" && fmtSeatNum(12) === "12" && fmtSeatTag(12) === "12號";

    // 2. Voice streaming splitter + Pause/Resume + Quick rate cycle
    const streamParts = voice.splitTwoStageStream("各位書院夥伴早安，我昨晚查驗了 10號 晴嵐，他是好人金水！請大家一起盯緊前置位踩人的對象。");
    const splitOk = Array.isArray(streamParts) && streamParts.length === 2 && streamParts[0].length >= 6 && streamParts[1].length >= 6;
    const prevRate = voice.rate;
    const r1 = voice.cycleQuickRate();
    const r2 = voice.cycleQuickRate();
    const r3 = voice.cycleQuickRate();
    voice.rate = prevRate;
    voice.syncQuickSpeedButtonUi();
    const rateCycleOk = [r1, r2, r3].some(v => Math.abs(v - 1.10) < 0.02) && [r1, r2, r3].some(v => Math.abs(v - 1.22) < 0.02) && [r1, r2, r3].some(v => Math.abs(v - 0.96) < 0.02);

    // 3. 10-player match setup (3 wolves, 10 seats, zero "010號")
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "seer";
    el("chkGuardMode").checked = true;
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const m10Seats = state.match.seats.length;
    const m10Wolves = state.match.seats.filter(s => s.team === "wolf").length;
    const m10Has10 = Boolean(getSeat(10));
    const m10LogsStr = JSON.stringify(state.match.logs || []);
    const m10NoBadZero = !/01[0-2]號/.test(m10LogsStr);

    // 4. 12-player match setup (4 wolves, 4 gods, 4 villagers, 4 new personas present)
    clearStepTimer();
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "villager";
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const m12Seats = state.match.seats.length;
    const m12Wolves = state.match.seats.filter(s => s.team === "wolf").length;
    const m12Gods = state.match.seats.filter(s => isGodRole(s.role)).length;
    const m12Names = state.match.seats.map(s => s.name);
    const has4NewChars = ["墨白", "晴嵐", "阿朗", "柚子"].every(n => m12Names.includes(n));

    // 5. Plan 1 UI components in 12-player context: stance strip, target reaction card, table matrix & quote rebuttal
    const s10 = getSeat(10);
    const s12 = getSeat(12);
    const fakeEv = {
      day: 1, speakerId: 10, speakerName: s10.name,
      claimRole: "seer", accuseId: 12, vouchId: 2,
      wolfPits: [12, 11], goodPits: [2],
      rawText: "我是明心觀察員，昨晚查驗 12號 是酸民狼，02號 是好人金水！"
    };
    state.match.daySpeechEvents = state.match.daySpeechEvents || [];
    state.match.allSpeechEvents = state.match.allSpeechEvents || [];
    state.match.daySpeechEvents.push(fakeEv);
    state.match.allSpeechEvents.push(fakeEv);
    renderSpeakerStanceStrip(s10, fakeEv);
    const stanceText = (el("speakerStanceStrip")._children || []).map(c => c.textContent || "").join(" ");
    const stanceOk = !el("speakerStanceStrip").classList.contains("hidden") && stanceText.includes("12") && !/01[0-2]/.test(stanceText);

    renderTargetReactionCard(s10, fakeEv);
    const reactBadge = el("targetReactBadge").textContent || "";
    const reactOk = !el("spotlightTargetReact").classList.contains("hidden") && reactBadge.includes("12") && !/01[0-2]/.test(reactBadge);

    renderTableMatrixIntoBody();
    const matrixChildren = el("matrixSheetBody")._children || [];
    const matrixHtml = matrixChildren.map(c => c.innerHTML || "").join(" ");
    const matrixOk = matrixChildren.length === 12 && !/01[0-2]/.test(matrixHtml);

    state.match.phase = "DAY_PLAYER_TURN";
    quoteSpeechForRebuttal(10, fakeEv.rawText);
    const quoteOk = el("quickFreeInput").value.includes("10號") && !el("quickFreeInput").value.includes("010號");

    renderSeatStrip();
    const strip12Ok = (el("seatButtonStrip")._children || []).length === 12;

    clearStepTimer();
    resetMatchToLobby();

    // 6. v6.0 Upgrades: Wolf Night Huddle, 12p WolfKing & Elder, Dramatic Sheriff Stage Reel, Cross-Day Memory Ledger & Post-Match AI Coach
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "wolf";
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const hasWolfKing12 = state.match.seats.some(s => s.isWolfKing);
    const hasElder12 = state.match.seats.some(s => s.isElder);
    if (state.match.phase === "NIGHT_GUARD") proceedToNightWolf();
    const wolfHuddleOk = state.match.phase === "NIGHT_WOLF" && applyWolfNightTactic("deep_stealth") && state.match.wolfTactic === "deep_stealth";

    // Test Dramatic Sheriff Election + Stage Reel + Player Run/Withdraw
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    const shStarted = startSheriffElection();
    const shReelOk = shStarted && playSheriffStageReel(0);
    const shRunOk = resolveSheriffElectionAction("run") && state.match.sheriffElectionCtx.playerRunning === true;
    const shWithdrawOk = resolveSheriffElectionAction("withdraw") && state.match.sheriffElectionCtx.playerWithdrew === true;
    const shPassOk = resolveSheriffElectionAction("pass") && Boolean(state.match.sheriffSeatId);

    // Test Cross-Day Memory Ledger & Post-Match Detective Coach
    state.match.day = 2;
    state.match.allSpeechEvents = state.match.allSpeechEvents || [];
    state.match.daySpeechEvents = state.match.daySpeechEvents || [];
    state.match.allSpeechEvents.push({ day: 1, speakerId: 2, accuseId: 3, vouchId: 4, text: "昨天先保4號踩3號" });
    state.match.daySpeechEvents.push({ day: 2, speakerId: 2, accuseId: 4, vouchId: null, text: "今天改口踩4號" });
    const ledgerRes = buildCrossDayMemoryLedger(getSeat(3));
    const ledgerOk = ledgerRes && ledgerRes.flipIds.includes(2) && ledgerRes.grudgeIds.includes(2);
    const coachRes = buildAiPostMatchCoachInsights();
    const coachOk = Array.isArray(coachRes) && coachRes.length === 3 && buildMatchReplayReport().includes("AI 名偵探覆盤教練重點");

    // 7. v6.1 Upgrades: Direct WolfKing/Elder role picks (auto-10p), Matrix cross-day flip alert badge & 20 achievements
    renderTableMatrixIntoBody();
    const matFlipHtml = (el("matrixSheetBody")._children || []).map(c => c.innerHTML || "").join(" ");
    const matrixFlipOk = matFlipHtml.includes("跨日反水");

    clearStepTimer();
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "wolf_king";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const directWkOk = state.match.totalSeats === 10 && Boolean(getPlayerSeat() && getPlayerSeat().isWolfKing && getSeatEffectiveRoleKey(getPlayerSeat()) === "wolf_king");

    clearStepTimer();
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "elder";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const directElderOk = state.match.totalSeats === 10 && Boolean(getPlayerSeat() && getPlayerSeat().isElder && getSeatEffectiveRoleKey(getPlayerSeat()) === "elder");
    const v61AchOk = Array.isArray(ACHIEVEMENT_DEFS) && ACHIEVEMENT_DEFS.length >= 20;
    const prefetchFnOk = typeof prefetchNextAiSpeech === "function" && typeof isPrefetchedAiSpeechReady === "function";

    clearStepTimer();
    resetMatchToLobby();
    return {
      fmtOk, splitOk, rateCycleOk,
      m10Ok: m10Seats === 10 && m10Wolves === 3 && m10Has10 && m10NoBadZero,
      m12Ok: m12Seats === 12 && m12Wolves === 4 && m12Gods === 4 && has4NewChars,
      stanceOk, reactOk, matrixOk, quoteOk, strip12Ok,
      v6RolesOk: hasWolfKing12 && hasElder12,
      wolfHuddleOk,
      v6SheriffOk: shStarted && shReelOk && shRunOk && shWithdrawOk && shPassOk,
      ledgerOk, coachOk,
      v61Ok: matrixFlipOk && directWkOk && directElderOk && v61AchOk && prefetchFnOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(p12Res)) {
    if (!v) {
      throw new Error("PLAN1-PLAN2-UPGRADE check failed for " + k + ": " + JSON.stringify(p12Res));
    }
  }
}

console.log("[OK] Full v6.1 (6/8/10/12p + Direct WolfKing/Elder + Matrix Flip Alerts + 20 Badges + Live FPS + iGPU 3D) E2E smoke test PASSED!");
