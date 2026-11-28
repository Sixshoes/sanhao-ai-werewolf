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
  "assets/portraits_vrm/mobai.jpg",
  "assets/portraits_vrm/qinglan.jpg",
  "assets/portraits_vrm/alang.jpg",
  "assets/portraits_vrm/youzi.jpg",
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
  "assets/models/mobai.vrm",
  "assets/models/qinglan.vrm",
  "assets/models/alang.vrm",
  "assets/models/youzi.vrm",
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

// 1b-2. Verify all 14 optimized standalone .vrm models (primitive draw-call ceiling + Asong VRM 0.x identity) + real GLTFLoader.parse()
{
  const vrmFiles = fs.readdirSync("assets/models").filter(f => f.endsWith(".vrm")).sort();
  if (vrmFiles.length !== 14) throw new Error("Expected 14 .vrm models, found " + vrmFiles.length);
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
  if (totalPrims >= 280) throw new Error("Total primitive count across 14 VRMs too high: " + totalPrims);

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
    if (!inst.morphs.aa || !inst.morphs.aa.length || !inst.morphs.blink || !inst.morphs.blink.length) {
      throw new Error(`Real VRM multi-primitive morph bindings (aa/blink) missing for ${sampleVrm}`);
    }
    let compactedMorphMeshes = 0;
    inst.rawScene.traverse((obj) => {
      if (obj && obj.isMesh && obj.geometry && obj.geometry.morphAttributes && Array.isArray(obj.geometry.morphAttributes.position)) {
        compactedMorphMeshes += 1;
        if (obj.geometry.morphAttributes.normal) {
          throw new Error(`VRM morph normal attribute was not stripped for ${sampleVrm}:${obj.name}`);
        }
        if (obj.geometry.morphAttributes.position.length > 24) {
          throw new Error(`VRM morph targets were not compacted (<=24) for ${sampleVrm}:${obj.name}: ${obj.geometry.morphAttributes.position.length}`);
        }
      }
    });
    if (compactedMorphMeshes === 0) {
      throw new Error(`Real VRM lost all morph meshes during compaction for ${sampleVrm}`);
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
      getElementById: () => ({ value: "8", checked: false, classList: { add() { }, remove() { }, toggle() { }, contains: () => false } }),
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
    if (!rEnv.academyGardenGroup || !rEnv.celestialGardenGroup || !rEnv.skyPhotoCelestialMat) {
      throw new Error("v12.0 Dual 3D Scene themes (academyGardenGroup / celestialGardenGroup / skyPhotoCelestialMat) failed to build!");
    }
    if (!rEnv.bambooGroves || rEnv.bambooGroves.length < 6 || !rEnv.blossomTrees || rEnv.blossomTrees.length < 4) {
      throw new Error("v12.0 Qinglan Academy garden flora (bambooGroves / blossomTrees) failed to build!");
    }
    if (!rEnv.celestialSpires || rEnv.celestialSpires.length < 8 || !rEnv.celestialSteppingStones || rEnv.celestialSteppingStones.length < 4 || !rEnv.celestialWisps) {
      throw new Error("v12.0 Celestial Qinglü garden assets (celestialSpires / steppingStones / wisps) failed to build!");
    }
    apply3DSceneTheme(rSc, rEnv, "celestial");
    if (rEnv.academyGardenGroup.visible !== false || rEnv.celestialGardenGroup.visible !== true) {
      throw new Error("v12.0 apply3DSceneTheme('celestial') failed to toggle garden visibility!");
    }
    update3DEnvironment(rSc, rEnv, { tSec: 2.0, nowMs: 2000, p: "DAY_SPEECH", daylight: true, night: false }, {});
    apply3DSceneTheme(rSc, rEnv, "academy");
    if (rEnv.academyGardenGroup.visible !== true || rEnv.celestialGardenGroup.visible !== false) {
      throw new Error("v12.0 apply3DSceneTheme('academy') failed to restore Academy garden visibility!");
    }
    update3DEnvironment(rSc, rEnv, { tSec: 2.5, nowMs: 2500, p: "LOBBY", daylight: false, night: false }, {});
    const rHero = buildHeroCharacter(rSc);
    if (rHero.root.position.x < 2.0) throw new Error("Qingming should stand on right-rear tea dais clear of Seat 5!");
    applyHeroPalette(rHero, "teagold");
    setHeroVisualMode(rHero, "sculpt3d");
    setHeroVisualMode(rHero, "glb"); // safely stays sculpt3d when no .glb loaded
    if (!rHero.facePatchMat || rHero.facePatchMat.map !== rHero.heroFaceBundle.tex) {
      throw new Error("Hero facePatchMat initial texture binding missing!");
    }
    rHero.customGlbRoot = new THREE.Group();
    setHeroVisualMode(rHero, "glb");
    if (rHero.heroFaceBundle !== null || rHero.facePatchMat.map !== null) {
      throw new Error("setHeroVisualMode('glb') failed to clear hero.facePatchMat.map!");
    }
    setHeroVisualMode(rHero, "sculpt3d");
    if (!rHero.heroFaceBundle || !rHero.heroFaceBundle.tex || rHero.facePatchMat.map !== rHero.heroFaceBundle.tex) {
      throw new Error("setHeroVisualMode('sculpt3d') failed to rebind rebuilt heroFaceBundle.tex to hero.facePatchMat.map!");
    }
    rHero.customGlbRoot = null;
    updateHeroCharacter(rHero, new THREE.PerspectiveCamera(), { tSec: 1.5, nowMs: 1500, p: "LOBBY", w: 1280, h: 720 }, null, true);

    // Build ALL 12 bespoke Genshin-styled AI seated actors + verify double-sided plaque materials
    const allSeatNames = ["你", "小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨", "墨白", "晴嵐", "阿朗", "柚子"];
    allSeatNames.forEach((nm, idx) => {
      const rActor = create3DSeatActor({ id: idx + 1, name: nm, color: "#38bdf8", alive: true, role: "villager" });
      if (!rActor || !rActor.vrmMountGroup || !rActor.sculptBodyRoot) {
        throw new Error("Real Three.js r128 seat character build failed for: " + nm);
      }
      if (!rActor.candleFlame || !rActor.candleFlame.children || rActor.candleFlame.children.length < 3) {
        throw new Error("v12.0 sculpted multi-layer teardrop beeswax candle failed for: " + nm);
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

    // P3-1b. 6/8/10/12-Seat Dynamic 3D Table Geometry Parity (ZERO floating candles/cups/plaques/cards, ZERO host collision!)
    if (!rEnv.tableScaleGroup || !rEnv.tableAO || !rEnv.terraceMesh || !rEnv.terraceTrim) {
      throw new Error("Dynamic 3D table scaling containers missing on environment!");
    }
    [6, 8, 10, 12].forEach(n => {
      const ly = get3DTableLayout(n);
      const tableR = 3.25 * ly.tableScale;
      const propR = ly.ringRadius - ly.propZ;
      const candleOuter = Math.hypot(0.765, propR + 0.06);
      const cupOuter = Math.hypot(0.715, propR - 0.16);
      const idCardOuter = propR + 0.58;
      const chordSpacing = 2 * propR * Math.sin(Math.PI / n);
      const hostDist = Math.hypot(HERO_STAGE_ANCHOR.x, HERO_STAGE_ANCHOR.z) * ly.heroMul;
      if (candleOuter >= tableR - 0.05 || cupOuter >= tableR - 0.05 || idCardOuter >= tableR - 0.02) {
        throw new Error("3D tabletop prop overhangs/floats outside rim for " + n + " seats! tableR=" + tableR.toFixed(2) + " candle=" + candleOuter.toFixed(2) + " card=" + idCardOuter.toFixed(2));
      }
      if (chordSpacing < 1.75) {
        throw new Error("Adjacent 3D tabletop props collide for " + n + " seats! chord=" + chordSpacing.toFixed(2));
      }
      if (hostDist <= ly.ringRadius + 1.1) {
        throw new Error("3D host Qingming collides with seat ring for " + n + " seats! hostDist=" + hostDist.toFixed(2) + " ring=" + ly.ringRadius);
      }
    });
    const prevStartedGeom = state.match.started;
    const prevTotalGeom = state.match.totalSeats;
    state.match.started = true;
    state.match.totalSeats = 12;
    rEnv.tableScaleCurrent = 0;
    rEnv.pavilionScaleCurrent = 0;
    update3DEnvironment(rSc, rEnv, { tSec: 3.0, p: "DAY_SPEECH", daylight: true, night: false }, {});
    if (Math.abs(rEnv.tableScaleGroup.scale.x - 1.40) > 0.01 || Math.abs(rEnv.proceduralPavilionGroup.scale.x - 1.15) > 0.01) {
      throw new Error("12-seat dynamic 3D table/pavilion scale did not apply! tableScale=" + rEnv.tableScaleGroup.scale.x + " pavScale=" + rEnv.proceduralPavilionGroup.scale.x);
    }
    state.match.started = prevStartedGeom;
    state.match.totalSeats = prevTotalGeom;

    // P3-1c. Seated First-Person (坐席) Camera Geometry, Eye Clearance, Frustum Culling & Edge-Glance Verification
    [6, 8, 10, 12].forEach(n => {
      const ly = get3DTableLayout(n);
      const backOffset = n >= 12 ? 1.15 : (n >= 10 ? 1.02 : (n >= 8 ? 0.90 : 0.82));
      const eyeR = ly.ringRadius + backOffset;
      const eyeY = n >= 12 ? 2.62 : (n >= 10 ? 2.56 : 2.48);
      const pillarR = 7.85 * ly.pavilionScale;
      if (eyeR >= pillarR - 1.5) {
        throw new Error("First-person eye collides with pavilion pillars for " + n + " seats! eyeR=" + eyeR.toFixed(2) + " pillarR=" + pillarR.toFixed(2));
      }
      // Sightline from player's eye to opposite seat head (y=2.15) must clear central lotus (y=1.85) at center z=0!
      const oppY = 2.15;
      const tCenter = eyeR / (eyeR + ly.ringRadius);
      const sightYAtLotus = eyeY + (oppY - eyeY) * tCenter;
      if (sightYAtLotus <= 2.05) {
        throw new Error("First-person sightline blocked by central lotus for " + n + " seats! sightY=" + sightYAtLotus.toFixed(2));
      }
    });

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

    // P3-3 (v11.2): Living Full-Body VRM Choreography (Staggered Tea-Table Idle Fidgets, 4-Beat Debate Arms, Seated Leg Micro-Rhythm & Host Guiding)
    const livingRig = buildFullRigForGeomCheck(false);
    const livingAv = stage3dVrm.prepareLoadedAvatar(livingRig.gltf, { mode: "seated", targetHeight: 2.10, baseY: 0, personaName: "星兒" });
    const archXingLive = stage3dVrm.getIdleArchetype("星兒", 3.4);
    const seenIdleNames = new Set();
    let sawActiveWeight = false;
    for (let ts = 0; ts < 40; ts += 0.5) {
      const actInfo = stage3dVrm.computeLivingIdleAction(ts, 3.4, archXingLive);
      if (actInfo && actInfo.name) seenIdleNames.add(actInfo.name);
      if (actInfo && actInfo.weight > 0.85) sawActiveWeight = true;
    }
    if (seenIdleNames.size < 3 || !sawActiveWeight) {
      throw new Error("v11.2 Living idle scheduler failed to cycle >=3 distinct actions with full blend weight!");
    }
    // Verify multi-beat speaking produces real visible arm & spine motion across beats AND stays anatomically grounded!
    const armQuatBeat0 = new THREE.Quaternion();
    const armQuatBeat2 = new THREE.Quaternion();
    for (let st = 0; st < 20; st++) {
      stage3dVrm.updateVrmAvatar(livingAv, { tSec: 0.4 + st * 0.03, seed: 1.7, personaName: "星兒", alive: true, talking: true, isFloorHolder: true, mouthAmp: 0.72, headYaw: 0.25, headPitch: 0 });
    }
    armQuatBeat0.copy(livingRig.bones.rightUpperArm.quaternion);
    for (let st = 0; st < 25; st++) {
      stage3dVrm.updateVrmAvatar(livingAv, { tSec: 4.1 + st * 0.03, seed: 1.7, personaName: "星兒", alive: true, talking: true, isFloorHolder: true, mouthAmp: 0.72, headYaw: -0.20, headPitch: 0 });
    }
    armQuatBeat2.copy(livingRig.bones.rightUpperArm.quaternion);
    if (armQuatBeat0.angleTo(armQuatBeat2) < 0.12) {
      throw new Error("v11.2 Multi-beat speaking choreography did not produce distinct arm poses across phrases! angle=" + armQuatBeat0.angleTo(armQuatBeat2).toFixed(3));
    }
    // Verify seated legs stay strictly forward & chair-safe even during lively lower-leg rhythm!
    livingAv.root.updateMatrixWorld(true);
    const qThighLive = new THREE.Quaternion();
    livingRig.bones.leftUpperLeg.getWorldQuaternion(qThighLive);
    const thighLiveWorld = new THREE.Vector3(0, -1, 0).applyQuaternion(qThighLive);
    if (thighLiveWorld.z < 0.78) {
      throw new Error("v11.2 Seated leg micro-rhythm broke forward thigh safety bound! z=" + thighLiveWorld.z.toFixed(2));
    }
    // Verify standing host Qingming actively gestures when guiding an active speaker
    const hostRig = buildFullRigForGeomCheck(false);
    const hostAv = stage3dVrm.prepareLoadedAvatar(hostRig.gltf, { mode: "standing", targetHeight: 2.14, baseY: 0.08 });
    const hostRestArm = hostRig.bones.rightUpperArm.quaternion.clone();
    for (let st = 0; st < 25; st++) {
      stage3dVrm.updateVrmAvatar(hostAv, { tSec: 2.2 + st * 0.04, seed: 0.5, alive: true, talking: false, hasActiveSpeaker: true, headYaw: 0.35, headPitch: 0.06 });
    }
    if (hostRestArm.angleTo(hostRig.bones.rightUpperArm.quaternion) < 0.18) {
      throw new Error("v11.2 Standing host Qingming guiding gesture too static! angle=" + hostRestArm.angleTo(hostRig.bones.rightUpperArm.quaternion).toFixed(3));
    }
  `, realThreeCtx);
}

// 2. 1-to-1 Asset Parity, CSS Brace Balance & Zero !important in Custom Styles
const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    if (d.name === ".DS_Store") return [];
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
    matrix: { elements: new Float32Array(16), clone() { return { elements: new Float32Array(this.elements), copy() { return this; }, multiplyMatrices() { return this; } }; }, copy() { return this; }, multiplyMatrices() { return this; } },
    parent: null, children: [], visible: true, castShadow: false, receiveShadow: false, frustumCulled: true, userData: {},
    add(...items) { items.forEach(x => { if (x) { x.parent = this; this.children.push(x); } }); },
    remove(item) { const k = this.children.indexOf(item); if (k >= 0) { this.children.splice(k, 1); if (item) item.parent = null; } },
    lookAt() { }, updateMatrix() { }, updateMatrixWorld() { },
    getWorldPosition(t) {
      let wx = 0, wy = 0, wz = 0, cur = this;
      while (cur) {
        if (cur.position) { wx += cur.position.x || 0; wy += cur.position.y || 0; wz += cur.position.z || 0; }
        cur = cur.parent;
      }
      return t.set(wx, wy, wz);
    },
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
      dispose() { },
    };
  },
  Matrix4: function () {
    return {
      elements: new Float32Array(16),
      clone() { return THREE.Matrix4(); },
      copy() { return this; },
      multiplyMatrices() { return this; }
    };
  },
  InstancedMesh: function (g, m, count) {
    const o = makeObj3D(g, m);
    o.isInstancedMesh = true;
    o.count = count || 0;
    o.instanceMatrix = { needsUpdate: false };
    o._matrices = [];
    o.setMatrixAt = function (idx, mat4) { o._matrices[idx] = mat4; };
    return o;
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
  MeshBasicMaterial: function (o = {}) { return { color: makeColor(o.color), map: o.map || null, transparent: Boolean(o.transparent), opacity: o.opacity ?? 1, depthWrite: o.depthWrite !== undefined ? Boolean(o.depthWrite) : true, needsUpdate: false, dispose() { } }; },
  MeshStandardMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, opacity: 1, dispose() { } }; },
  MeshPhysicalMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, clearcoat: o.clearcoat ?? 0, opacity: 1, dispose() { } }; },
  MeshToonMaterial: function (o = {}) { return { color: makeColor(o.color), emissive: makeColor(o.emissive), emissiveIntensity: o.emissiveIntensity ?? 0, transparent: Boolean(o.transparent), opacity: o.opacity ?? 1, depthWrite: o.depthWrite !== undefined ? Boolean(o.depthWrite) : true, userData: {}, dispose() { } }; },
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
    : (id === "playerSpeechInput" || id === "quickFreeInput" || id === "lastWordsFreeInput" || id === "sheriffPlayerInput" ? "TEXTAREA"
      : (id.startsWith("input") ? "INPUT"
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
      if (_innerHtml === "") {
        _children.length = 0;
      } else if (_innerHtml.includes('data-card-load="1"') && !_children.some(c => c && c.getAttribute && c.getAttribute("data-card-load") === "1")) {
        const sp = makeEl("dyn_span_" + Math.random());
        sp.tagName = "SPAN";
        sp.setAttribute("data-card-load", "1");
        _children.push(sp);
      }
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

const quickStancePillsSeed = makeEl("quickStancePills");
["accuse", "vouch", "peace"].forEach(st => {
  const b = makeEl("dyn_qs_" + st);
  b.tagName = "BUTTON";
  b.setAttribute("data-stance", st);
  quickStancePillsSeed.appendChild(b);
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

  // v4.5 Competition Edition: Cloud Isle Easter Egg + Respectful Roles + Lotus Awakening + Harmony Aura!
  stage3d.raycastCloudIsle(0.2, 0.1);
  stage3d.interactWithCloudIsle();
  if (ROLE_DEFS.witch.name !== "滴水奉茶師" || ROLE_DEFS.seer.name !== "明心觀察員" || ROLE_DEFS.hunter.name !== "直心糾察長") {
    throw new Error("Expected respectful Qinglan Academy role names in ROLE_DEFS!");
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
  state.match.activeDirectorEvent = { id: "mountain_mist", shortTitle: "山嵐起霧求真", title: "霧", desc: "霧", badge: "80" };
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
  if (!el("voiceEngineStatusLabel").textContent.includes("12 位真人級聲線")) {
    throw new Error("voice.refreshVoices failed to update status label when speechSynthesis list is empty!");
  }

  // Seat-aware First-Person (坐席) POV: seated eye-level, responsive FOV, unobstructed own plaque, accurate lookAt, edge-glance & recenter pills!
  el("selectModeCount").value = "8";
  startNewGame();
  indieFlow.hideRoleDealRitual();
  state.match.playerSeatId = 5;
  stage3d.camera.aspect = 16 / 9;
  const fpDesktopFov = stage3d.getFirstPersonBaseFov();
  stage3d.camera.aspect = 9 / 16;
  const fpMobileFov = stage3d.getFirstPersonBaseFov();
  stage3d.camera.aspect = 16 / 9;
  if (fpDesktopFov < 56 || fpMobileFov < 70) {
    throw new Error("First-person responsive FOV too narrow! desktop=" + fpDesktopFov + " mobile=" + fpMobileFov);
  }
  stage3d.setCameraPreset("firstperson");
  stage3d.render(1000, el("sanctuaryCanvas"));
  stage3d.render(1016, el("sanctuaryCanvas"));
  if (stage3d.camera.position.z > -4.5) {
    throw new Error("First-person camera stayed near Seat 1 instead of playerSeatId=5! z=" + stage3d.camera.position.z);
  }
  if (stage3d.camera.position.y < 2.35 || stage3d.camera.position.y > 2.75) {
    throw new Error("First-person camera eye height out of natural seated range [2.35, 2.75]! y=" + stage3d.camera.position.y);
  }
  const fpSelfSlot = stage3d.seats && stage3d.seats.slots ? stage3d.seats.slots[5] : null;
  if (!fpSelfSlot || fpSelfSlot.figureGroup.visible || fpSelfSlot.chairGroup.visible || (fpSelfSlot.plaqueMesh && fpSelfSlot.plaqueMesh.visible) || !fpSelfSlot.tablePropGroup.visible) {
    throw new Error("First-person self foreground visibility invalid (own plaque/body must hide while teacup/candle/card stay visible)!");
  }
  // Test glanceAtSeatInFirstPerson & Recenter pill + Edge-Glance buttons in draw3DOverlayHud
  if (!stage3d.glanceAtSeatInFirstPerson(4)) {
    throw new Error("glanceAtSeatInFirstPerson(4) failed!");
  }
  const glanceYawMag = Math.abs(stage3d.orbit.fpTargetYaw);
  if (!(glanceYawMag > 0.35 && glanceYawMag <= 1.45)) {
    throw new Error("glanceAtSeatInFirstPerson(4) computed invalid yaw: " + stage3d.orbit.fpTargetYaw);
  }
  stage3d.orbit.fpYaw = stage3d.orbit.fpTargetYaw;
  const fakeFpCoords = [
    { id: 4, x: 400, y: 210, r: 28, zDepth: 0.4, offScreenDir: 0, visibleInView: true, seat: getSeat(4) },
    { id: 6, x: -999, y: -999, r: 26, zDepth: 0.6, offScreenDir: 1, visibleInView: false, seat: getSeat(6) },
    { id: 3, x: -999, y: -999, r: 26, zDepth: 0.6, offScreenDir: -1, visibleInView: false, seat: getSeat(3) }
  ];
  draw3DOverlayHud(el("sanctuaryCanvas").getContext("2d"), { dpr: 1, p: "DAY_SPEECH", w: 800, h: 450, nowMs: 2500, tSec: 2.5, daylight: true, cx: 400, cy: 225 }, fakeFpCoords);
  const hasLeftEdge = state.fpGlanceButtons.some(b => b.seatId === 3 && !b.isRecenter);
  const hasRightEdge = state.fpGlanceButtons.some(b => b.seatId === 6 && !b.isRecenter);
  const hasRecenterPill = state.fpGlanceButtons.some(b => b.isRecenter === true);
  if (!hasLeftEdge || !hasRightEdge || !hasRecenterPill) {
    throw new Error("First-person Edge-Glance / Recenter pills missing! buttons=" + JSON.stringify(state.fpGlanceButtons));
  }
  stage3d.glanceAtSeatInFirstPerson(5);
  if (stage3d.orbit.fpTargetYaw !== 0 || stage3d.orbit.fpFovOffset !== 0) {
    throw new Error("glanceAtSeatInFirstPerson(self) failed to recenter!");
  }
  if (Math.abs(Math.abs(stage3d.fpHandsGroup.rotation.y) - Math.PI) > 0.08) {
    throw new Error("fpHandsGroup failed to rotate toward Seat 5! rotY=" + stage3d.fpHandsGroup.rotation.y);
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
  ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalPauseMenu", "setupDrawer", "roleDealOverlay"].forEach(function (mid) {
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

  // 2. NIGHT_WOLF Night-1 self-knife unlock + Night-2 teammate anti-friendly-fire disabled styling check (B8)
  el("selectPreferredRole").value = "wolf";
  startNewGame();
  indieFlow.hideRoleDealRitual();
  if (el("seatButtonStrip").classList.contains("hidden")) {
    throw new Error("seatButtonStrip should be visible during NIGHT_WOLF!");
  }
  if (el("seatButtonStrip")._children.some(b => b.classList.contains("is-disabled-target"))) {
    throw new Error("Night-1 (day 1, 2+ wolves) should unlock self-knife pills during NIGHT_WOLF!");
  }
  state.match.day = 2;
  updateAllUI();
  if (!el("seatButtonStrip")._children.some(b => b.classList.contains("is-disabled-target"))) {
    throw new Error("Wolf teammate/self pill should carry is-disabled-target from Night 2 onward during NIGHT_WOLF!");
  }
  state.match.day = 1;
  updateAllUI();

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

  // 'q' composes first speech card into input without auto-sending; #btnQuickFreeSend sends it cleanly
  window.dispatchEvent({ type: "keydown", key: "q", target: document.body });
  if (state.match.phase !== "DAY_PLAYER_TURN" || !el("quickFreeInput").value.trim()) {
    throw new Error("'q' shortcut should compose speech card 1 into quickFreeInput without prematurely sending! phase=" + state.match.phase);
  }
  el("btnQuickFreeSend").click();
  if (state.match.phase === "DAY_PLAYER_TURN") {
    throw new Error("btnQuickFreeSend failed to submit composed speech card 1 in DAY_PLAYER_TURN!");
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
  if (state.match.phase !== "DAY_VOTE_RESULT" && state.match.phase !== "LAST_WORDS_SPEECH" && state.match.phase !== "GAME_OVER" && state.match.phase !== "HUNTER_TRIGGER") {
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
    if (!aiPkSpeech || aiPkSpeech.accuseId !== pkB.id || !/PK|平票/.test(aiPkSpeech.text)) {
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
    state.match.day = 2;
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
  if (!html.includes('value="gemini-3.5-flash-lite"') || !html.includes('value="gemini-3.8-flash"') || !html.includes('value="gemini-3.6-flash"') || !html.includes('value="gemini-2.5-flash-lite"') || !html.includes('id="localOllamaOptGroup"') || html.includes('gemini-4-hydrogen') || html.includes('gemini-4-argon') || html.includes('gemini-3.1-pro-preview') || html.includes('gemini-2.5-pro')) {
    throw new Error("ai.html #modalAiConfig must expose Gemini 3.5/3.6/3.8/2.5 Lite models plus localOllamaOptGroup!");
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

    getSeat(2).claimedRole = "seer";
    getSeat(3).role = "villager";
    getSeat(3).team = "good";
    getSeat(4).alive = true;
    getSeat(7).alive = true;
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
      if (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.isPkRound) {
        const pkPick = state.match.sheriffElectionCtx.candidateIds[0];
        resolveSheriffElectionAction(pkPick || "pass");
      }
      const electedSeatAlive = Boolean(
        (state.match.sheriffSeatId && getSeat(state.match.sheriffSeatId).alive) ||
        (state.match.sheriffVoteRecord && state.match.sheriffVoteRecord.badgeLost)
      );

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
  if (upgRes.wolfDeckInfo.tacticNow !== "deep_stealth" || !/深水|倒鉤/.test(upgRes.wolfDeckInfo.mateBubble) || (!upgRes.wolfDeckInfo.cardsHtml.includes("悍跳") && !upgRes.wolfDeckInfo.cardsHtml.includes("狼隊")) || !upgRes.wolfDeckInfo.cardsHtml.includes("拉攏") || !upgRes.wolfDeckInfo.hasBackstabNote) {
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
  for (const slug of ["player", "player_male", "xiaocheng", "nuannuan", "asong", "xinger", "xiaoyun", "azhu", "chenchen", "mobai", "qinglan", "alang", "youzi"]) {
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
  if (!voiceSrc.includes("gemini-2.5-flash-preview-tts")) {
    throw new Error("Voice TTS endpoint should target gemini-2.5-flash-preview-tts");
  }
  const staticManifestOk = vm.runInContext(`(() => {
    const m = stage3d.getDefaultStaticAvatarManifest();
    return Boolean(m && m.ok && m.heroModel === "assets/models/qingming.vrm" && m.seatModels && Object.keys(m.seatModels).length === 13);
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
  if (!swSrc.includes("/api/") || !(swSrc.includes("SHELL_CACHE") && swSrc.includes("ASSET_CACHE")) || !swSrc.includes("IMMUTABLE_RE")) {
    throw new Error("sw.js missing API bypass or dual-pool static cache strategy");
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
    const r4 = voice.cycleQuickRate();
    voice.rate = prevRate;
    voice.syncQuickSpeedButtonUi();
    const rateCycleOk = [r1, r2, r3, r4].some(v => Math.abs(v - 1.10) < 0.02)
      && [r1, r2, r3, r4].some(v => Math.abs(v - 1.22) < 0.02)
      && [r1, r2, r3, r4].some(v => Math.abs(v - 1.42) < 0.02)
      && [r1, r2, r3, r4].some(v => Math.abs(v - 0.96) < 0.02);

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
    const highAlive = [10, 11, 12].filter(id => id !== getPlayerId() && getSeat(id) && getSeat(id).alive);
    const qId = highAlive[0] || (getPlayerId() === 10 ? 11 : 10);
    const tId = highAlive[1] || (getPlayerId() === 12 ? 10 : 12);
    const s10 = getSeat(qId);
    const s12 = getSeat(tId);
    if (s10) s10.alive = true;
    if (s12) s12.alive = true;
    const fakeEv = {
      day: 1, speakerId: qId, speakerName: s10.name,
      claimRole: "seer", accuseId: tId, vouchId: 2,
      wolfPits: [tId, qId === 11 ? 10 : 11], goodPits: [2],
      rawText: "我是明心觀察員，昨晚查驗 " + tId + "號 是酸民狼，02號 是好人金水！"
    };
    state.match.daySpeechEvents = state.match.daySpeechEvents || [];
    state.match.allSpeechEvents = state.match.allSpeechEvents || [];
    state.match.daySpeechEvents.push(fakeEv);
    state.match.allSpeechEvents.push(fakeEv);
    renderSpeakerStanceStrip(s10, fakeEv);
    const stanceText = (el("speakerStanceStrip")._children || []).map(c => c.textContent || "").join(" ");
    const stanceOk = !el("speakerStanceStrip").classList.contains("hidden") && stanceText.includes(String(tId)) && !/01[0-2]/.test(stanceText);

    renderTargetReactionCard(s10, fakeEv);
    const reactBadge = el("targetReactBadge").textContent || "";
    const reactOk = !el("spotlightTargetReact").classList.contains("hidden") && reactBadge.includes(String(tId)) && !/01[0-2]/.test(reactBadge);

    renderTableMatrixIntoBody();
    const matrixChildren = el("matrixSheetBody")._children || [];
    const matrixHtml = matrixChildren.map(c => c.innerHTML || "").join(" ");
    const matrixOk = matrixChildren.length === 12 && !/01[0-2]/.test(matrixHtml);

    state.match.phase = "DAY_PLAYER_TURN";
    quoteSpeechForRebuttal(qId, fakeEv.rawText);
    const quoteOk = el("quickFreeInput").value.includes(qId + "號") && !el("quickFreeInput").value.includes("0" + qId + "號");

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
    const shPassStep1 = resolveSheriffElectionAction("pass");
    if (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.isPkRound) {
      const pkPick36 = state.match.sheriffElectionCtx.candidateIds[0];
      resolveSheriffElectionAction(pkPick36 || "pass");
    }
    const shPassOk = shPassStep1 && Boolean(state.match.sheriffSeatId || (state.match.sheriffVoteRecord && state.match.sheriffVoteRecord.badgeLost));

    // Test Cross-Day Memory Ledger & Post-Match Detective Coach
    state.match.day = 2;
    state.match.allSpeechEvents = state.match.allSpeechEvents || [];
    state.match.daySpeechEvents = state.match.daySpeechEvents || [];
    state.match.allSpeechEvents.push({ day: 1, speakerId: 2, accuseId: 3, vouchId: 4, text: "昨天先保4號踩3號" });
    state.match.daySpeechEvents.push({ day: 2, speakerId: 2, accuseId: 4, vouchId: null, text: "今天改口踩4號" });
    const ledgerRes = buildCrossDayMemoryLedger(getSeat(3));
    const ledgerOk = ledgerRes && ledgerRes.flipIds.includes(2) && ledgerRes.grudgeIds.includes(2);
    const coachRes = buildAiPostMatchCoachInsights();
    const coachOk = Array.isArray(coachRes) && coachRes.length === 3 && buildMatchReplayReport().includes("本局茶席覆盤重點");

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
    const fxPacingOk = typeof getFxPacingMul === "function" && getFxPacingMul() === 1.0 && Boolean(el("btnToggleFxPacing"));
    state.fxPacing = "fast";
    const fxPacingFastOk = getFxPacingMul() < 0.8;
    state.fxPacing = "cinematic";

    // 8. v8.0 Upgrades: Wolf vs Good UX Separation, Unlimited Good-Pits, Wolf God-Hunt Board, All 8 Per-Role Dashboards/Guides & Triple-Strengthened Three-Good/Four-Givings
    // 8A: Good team (10p Villager) can mark 5+ seats in goodIds (NO 3-seat cap!) + markRemainingSeatsGoodPit works!
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const pidV8Good = getPlayerId();
    const goodPoolV8 = getAliveSeats().filter(s => s.id !== pidV8Good);
    // Mark 1 wolf pit, then click markRemainingSeatsGoodPit -> should put ALL 8 remaining seats into goodIds!
    togglePlayerDraftSeatPit(goodPoolV8[0].id);
    markRemainingSeatsGoodPit();
    const unlimitedGoodOk = state.match.playerDraftPits.goodIds.length === 8 &&
      el("quickFreeInput").value.includes("好人坑") &&
      el("btnQuickFreeSend").textContent.includes("8好") &&
      el("playerRoleActionHint").textContent.includes("好人坑不限人數");

    // 8B: Wolf team (10p Wolf King) has NO wolf-pit & excludes wolf mates from pit chips, provides God-Hunt notebook & shows wolf mates in Night tip!
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "wolf_king";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidV8Wolf = getPlayerId();
    const wolfMateV8 = state.match.seats.find(s => s.id !== pidV8Wolf && s.role === "wolf");
    const goodTargetV8 = state.match.seats.find(s => s.id !== pidV8Wolf && s.role !== "wolf");
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const wolfPitRowBtns = el("playerPitBuilder")._children[0]._children.filter(c => c.getAttribute && c.getAttribute("data-pit-seat"));
    const wolfExcludesMates = !wolfPitRowBtns.some(b => b.getAttribute("data-pit-seat") === String(wolfMateV8.id)) && wolfPitRowBtns.length === 7;
    const wolfBoardClassOk = el("playerPitBuilder").classList.contains("is-wolf-board");
    cycleWolfGodMark(goodTargetV8.id);
    const wolfGodMarkOk = state.match.wolfGodMarks[goodTargetV8.id] === "seer";
    // Night Wolf tip shows wolf teammates + God-Hunt notes!
    state.match.phase = "NIGHT_WOLF";
    updateAllUI();
    const wolfNightTipOk = el("nightRoleTipStrip").textContent.includes("獵神筆記") && el("nightRoleTipStrip").textContent.includes("疑觀");

    // 8C: Per-role Guide Popover + Mask Guard + Three-Good Petal Wisdom Quote + Seer PK Crash Fix + Witch wolfTacticRow Hide + Elder Claim
    openRoleGuidePopover("role");
    const roleGuideOk = !el("roleGuidePopover").classList.contains("hidden") && el("roleGuideTitle").textContent.includes("流言首領");
    openRoleGuidePopover("threegood");
    const tgGuideOk = !el("roleGuidePopover").classList.contains("hidden") && el("roleGuideTitle").textContent.includes("三好蓮花");
    closeRoleGuidePopover();
    state.hidePlayerRole = true;
    openRoleGuidePopover("role");
    const maskBlocksGuideOk = el("roleGuidePopover").classList.contains("hidden");
    state.hidePlayerRole = false;
    const prevLogLenV8 = state.match.logs.length;
    addThreeGoodPoint("heart", "存好心測試");
    const tgPetalQuoteOk = state.match.logs.slice(prevLogLenV8).some(l => l.title && l.title.includes("點亮三好蓮花瓣"));

    // Verify NIGHT_WITCH hides wolfTacticRow even right after NIGHT_WOLF showed it!
    state.match.phase = "NIGHT_WOLF";
    renderNightAndHunterPanel("NIGHT_WOLF");
    renderNightAndHunterPanel("NIGHT_WITCH");
    const witchHidesWolfTacticOk = el("wolfTacticRow").classList.contains("hidden");

    // Verify Seer PK speech with 4+ checkedHistory entries does NOT crash or produce "undefined號"!
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const seerPkP = getPlayerSeat();
    const seerPkOthers = getAliveSeats().filter(s => s.id !== seerPkP.id);
    seerPkP.checkedHistory = seerPkOthers.slice(0, 4).map((s, idx) => ({ day: idx + 1, targetId: s.id, isWolf: s.role === "wolf" }));
    state.match.pkCandidates = [seerPkP.id, seerPkOthers[0].id];
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const seerPkCardNode = el("quickSpeechChips").querySelectorAll("button")[0];
    const seerPkCardText = (seerPkCardNode && seerPkCardNode.title) || "";
    const seerPkNoCrashOk = seerPkCardText.includes(fmtSeatNum(seerPkOthers[3].id) + "號") && !seerPkCardText.includes("undefined");

    // Verify Elder claim recognition + dedicated Elder role mission
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "elder";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const elderMissionOk = state.match.roleMission && state.match.roleMission.role === "elder";
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    togglePlayerDraftRoleClaim("elder");
    submitPlayerSpeech();
    const elderClaimOk = getPlayerSeat().claimedRole === "elder";

    // Verify Solo-Wolf useFourGHope grants microPulse reduction + Matrix shows Wolf mates & God-Hunt tags
    clearStepTimer();
    el("selectModeCount").value = "10";
    el("selectPreferredRole").value = "wolf_king";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const wkMissionOk = state.match.roleMission && state.match.roleMission.role === "wolf_king";
    const wkSelf = getPlayerSeat();
    const wkGood = getAliveSeats().find(s => s.role !== "wolf");
    cycleWolfGodMark(wkGood.id);
    renderTableMatrixIntoBody();
    const wolfMatHtml = (el("matrixSheetBody")._children || []).map(c => c.innerHTML || "").join(" ");
    const wolfMatrixOk = wolfMatHtml.includes("同伴") && wolfMatHtml.includes("疑觀");
    state.match.seats.forEach(s => { if (s.role === "wolf" && s.id !== wkSelf.id) s.alive = false; });
    wkSelf.microPulse = 82;
    state.match.phase = "DAY_SPEECH";
    useFourGHope();
    const soloWolfHopeOk = wkSelf.microPulse < 82;

    // Verify cross-day memory ledger NEVER leaks hidden dead-seat team (treats voted-out Good identically to voted-out Wolf)
    const fairGoodDead = getAliveSeats().find(s => s.id !== wkSelf.id && s.team === "good");
    const fairVoucher = getAliveSeats().find(s => s.id !== wkSelf.id && s.id !== fairGoodDead.id && s.team === "good");
    fairGoodDead.alive = false;
    fairGoodDead.outReason = "投票出局";
    state.match.day = 2;
    state.match.allSpeechEvents = [{ day: 1, speakerId: fairVoucher.id, vouchId: fairGoodDead.id, accuseId: null }];
    const fairLedger = buildCrossDayMemoryLedger(fairVoucher);
    const noDeadWolfLeakOk = fairLedger.wolfProtectorIds.includes(fairVoucher.id);

    // Verify Escape closes roleGuidePopover cleanly, and quickFreeInput typing updates live speechThreeGoodBadge!
    openRoleGuidePopover("threegood");
    window.dispatchEvent({ type: "keydown", key: "Escape", target: { tagName: "BODY" }, preventDefault() {} });
    const escClosesGuideOk = el("roleGuidePopover").classList.contains("hidden");
    el("quickFreeInput").value = "好了啦別演了，邏輯死亡";
    el("quickFreeInput").dispatchEvent({ type: "input" });
    const inlineBadgeWarnOk = !el("speechThreeGoodBadge").classList.contains("hidden") && el("speechThreeGoodBadge").textContent.includes("語氣稍急");

    // Verify Wolf player NEVER gets false "替查殺狼洗白" contradiction when AI vouches for a Wolf teammate,
    // Wolf 0D counter-claim against Guard/Elder NEVER mutates claimedRole while returning null,
    // and parseGeminiStructuredSpeech accepts claimRole: "elder"!
    const wkMateCheck = state.match.seats.find(s => s.id !== wkSelf.id && s.role === "wolf");
    if (wkMateCheck) wkMateCheck.alive = true;
    const wolfNoSelfContraOk = !wkMateCheck || !detectSpeechContradictions(wkGood, { speakerId: wkGood.id, vouchId: wkMateCheck.id, accuseId: null });
    let wolfGuardCounterOk = true;
    if (wkMateCheck) {
      wkMateCheck.claimedRole = null;
      const gClaimer = getAliveSeats().find(s => s.team === "good");
      state.match.day = 1;
      state.match.wolfTactic = "fake_seer";
      state.match.daySpeechEvents = [{ day: 1, speakerId: gClaimer.id, claimRole: "guard", accuseId: null, vouchId: null }];
      const ctx0D = buildSpeechContext(wkMateCheck);
      const res0D = tryDefendOrCounterClaim(wkMateCheck, ctx0D);
      wolfGuardCounterOk = Boolean(res0D && res0D.text) && (!wkMateCheck.claimedRole || res0D.claimRole === wkMateCheck.claimedRole);
    }
    const geminiElderParseOk = parseGeminiStructuredSpeech('{"text":"我是清心長老","claimRole":"elder","accuseId":null,"vouchId":null,"wolfPits":[],"goodPits":[]}').claimRole === "elder";

    // Verify 6-chapter clear interactive Game Tutorial + Pause & Guide Popover entry points + ArrowRight navigation
    el("btnOpenTutorialPause").click();
    const tutOpenedOk = !el("modalTutorial").classList.contains("hidden") &&
      TUTORIAL_SLIDES.length === 6 &&
      el("tutorialStepTabs")._children.length === 6 &&
      el("tutorialStepCounter").textContent === "1 / 6";
    window.dispatchEvent({ type: "keydown", key: "ArrowRight", target: { tagName: "BODY" }, preventDefault() {} });
    const tutArrowOk = el("tutorialStepCounter").textContent === "2 / 6" && el("tutorialSlideBody").innerHTML.includes("清心長老");
    el("tutorialStepTabs")._children[5].click();
    const tutLastOk = el("tutorialStepCounter").textContent === "6 / 6" && !el("btnLaunchGuidedDemo").classList.contains("hidden");
    el("btnCloseTutorial").click();
    openRoleGuidePopover("role");
    el("btnOpenTutorialFromGuide").click();
    const tutFromGuideOk = el("roleGuidePopover").classList.contains("hidden") && !el("modalTutorial").classList.contains("hidden") && el("tutorialStepCounter").textContent === "2 / 6";
    el("btnCloseTutorial").click();
    const tutorialV81Ok = tutOpenedOk && tutArrowOk && tutLastOk && tutFromGuideOk;

    // v9.0 Anti-Cheat Blind-View Firewall HUD & Runtime Telemetry Smoke Check
    const acBefore = antiCheatMonitor.getSummary();
    const anyAiSeat = state.match.seats.find(s => s.id !== getPlayerId() && s.alive);
    if (anyAiSeat) {
      buildHeuristicAiSpeech(anyAiSeat);
      chooseAiVoteTarget(anyAiSeat, { pkActive: false, playerTargetId: null });
    }
    const acAfter = antiCheatMonitor.getSummary();
    switchGuideTab("trace");
    const acBoxHtml = el("antiCheatAuditBox") ? el("antiCheatAuditBox").innerHTML : "";
    const v9AntiCheatOk = Boolean(
      acAfter.enabled &&
      acAfter.violationsBlocked === 0 &&
      acAfter.decisionsAudited >= acBefore.decisionsAudited + 2 &&
      acAfter.blindViewsIssued > acBefore.blindViewsIssued &&
      acBoxHtml.includes("反作弊盲視隔離防火牆") &&
      acBoxHtml.includes("0 偷看違規")
    );

    // Check Role Deal Action List & all 8 role guides exist
    const all8GuidesOk = ["seer", "witch", "hunter", "guard", "elder", "villager", "wolf", "wolf_king"].every(k => ROLE_GUIDES[k] && ROLE_GUIDES[k].nightAction && ROLE_GUIDES[k].dayAction && ROLE_GUIDES[k].threeGoodTip);
    const v8Ok = unlimitedGoodOk && wolfExcludesMates && wolfBoardClassOk && wolfGodMarkOk && wolfNightTipOk && roleGuideOk && tgGuideOk && maskBlocksGuideOk && tgPetalQuoteOk && witchHidesWolfTacticOk && seerPkNoCrashOk && elderClaimOk && elderMissionOk && wkMissionOk && wolfMatrixOk && soloWolfHopeOk && noDeadWolfLeakOk && escClosesGuideOk && inlineBadgeWarnOk && wolfNoSelfContraOk && wolfGuardCounterOk && geminiElderParseOk && tutorialV81Ok && all8GuidesOk;

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
      v61Ok: matrixFlipOk && directWkOk && directElderOk && v61AchOk && prefetchFnOk && fxPacingOk && fxPacingFastOk,
      v8Ok,
      v9AntiCheatOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(p12Res)) {
    if (!v) {
      throw new Error("PLAN1-PLAN2-UPGRADE check failed for " + k + ": " + JSON.stringify(p12Res));
    }
  }
}

// TOP-RIGHT USER FEEDBACK SYSTEM: Title + In-Game buttons, modal, rating/category, XSS safety, localStorage & GitHub Issue builder
{
  const fbRes = await vm.runInContext(`(async () => {
    window.localStorage.setItem(FEEDBACK_CONFIG.storageKey, "[]");
    el("btnTitleFeedback").click();
    const openedFromTitle = !el("modalFeedback").classList.contains("hidden") && hasBlockingModalOpen();
    window.dispatchEvent({ type: "keydown", key: "Escape", target: { tagName: "BODY" }, preventDefault() {} });
    const escClosed = el("modalFeedback").classList.contains("hidden");

    el("btnOpenFeedback").click();
    const openedInGame = !el("modalFeedback").classList.contains("hidden");

    // Verify diagnostic snapshot NEVER leaks Gemini API key
    const prevKey = state.geminiApiKey;
    state.geminiApiKey = "SECRET_SHOULD_NOT_LEAK_XYZ";
    const diag = collectFeedbackDiagnostics();
    state.geminiApiKey = prevKey;
    const noKeyLeak = !JSON.stringify(diag).includes("SECRET_SHOULD_NOT_LEAK_XYZ");

    feedbackUiState.rating = 4;
    feedbackUiState.category = "ui";
    syncFeedbackStarUi();
    syncFeedbackCategoryUi();
    el("inputFeedbackName").value = "試玩同學A";
    el("inputFeedbackBody").value = "<img src=x onerror=alert(1)>坐席視角很棒，建議投票按鈕加大！";
    const savedEntry = await submitUserFeedback();
    const histList = loadFeedbackHistory();
    const histHtml = (el("feedbackHistoryList")._children || []).map(c => c.innerHTML || "").join(" ");
    const xssEscaped = histHtml.includes("&lt;img") && !histHtml.includes("<img src=x");
    const resultShown = !el("feedbackResultCard").classList.contains("hidden");
    const ghUrl = savedEntry ? buildGitHubIssueUrl(savedEntry) : "";
    const ghUrlOk = FEEDBACK_CONFIG.githubOwner === "" && ghUrl === "";

    closeFeedbackModal();
    return {
      openedFromTitle,
      escClosed,
      openedInGame,
      noKeyLeak,
      savedOk: Boolean(savedEntry && histList.length === 1 && histList[0].rating === 4 && histList[0].category === "ui"),
      xssEscaped,
      resultShown,
      ghUrlOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(fbRes)) {
    if (!v) {
      throw new Error("USER-FEEDBACK check failed for " + k + ": " + JSON.stringify(fbRes));
    }
  }
}

// v9.1 UI CONVERGENCE & LIVE "WHAT CAN I DO" TOOLKIT CHECK
{
  const convRes = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();

    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = state.match.seats.find(s => s.id !== getPlayerId() && s.alive).id;
    updateAllUI();
    const stripShown = !el("liveToolkitStrip").classList.contains("hidden") && el("liveToolkitStrip").innerHTML.includes("心虛1") && el("liveToolkitStrip").innerHTML.includes("四給4");
    const microLabelClear = el("btnMicroInspect").textContent.includes("看心虛");
    const fourGHeadInit = el("fourGDeckHeader").textContent.includes("四給奉茶") && el("fourGDeckHeader").textContent.includes("4/4");

    // Hovering a Four-Givings card shows plain-language explanation in #fourGDeckHeader
    el("btn4GConfidence").dispatchEvent({ type: "pointerenter" });
    const fourGHoverExplains = el("fourGDeckHeader").classList.contains("is-previewing") && el("fourGDeckHeader").textContent.includes("擋 1 票");
    el("btn4GConfidence").dispatchEvent({ type: "pointerleave" });
    const fourGHoverRestores = !el("fourGDeckHeader").classList.contains("is-previewing") && el("fourGDeckHeader").textContent.includes("4/4");

    // Opening "❓ 能做什麼" shows live "現在這一步" + "你目前手上的道具與按鈕"
    openRoleGuidePopover("role");
    const guideHasLiveTools = !el("roleGuidePopover").classList.contains("hidden") &&
      el("roleGuideBody").innerHTML.includes("現在這一步") &&
      el("roleGuideBody").innerHTML.includes("看心虛") &&
      el("roleGuideBody").innerHTML.includes("奉暖茶") &&
      el("roleGuideBody").innerHTML.includes("四給錦囊");
    closeRoleGuidePopover();

    // DAY_PLAYER_TURN uses v9.3 streamlined 3-layer deck: roleTurnDashboard retired, speechAdvancedDrawer collapsed by default & toggles cleanly!
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const advCollapsedByDefault = el("speechAdvancedDrawer").classList.contains("hidden") && el("roleTurnDashboard").classList.contains("hidden") && el("customSpeechDrawer").classList.contains("hidden");
    el("btnToggleCustomSpeech").click();
    const advExpandedOnClick = !el("speechAdvancedDrawer").classList.contains("hidden") && el("btnToggleCustomSpeech").classList.contains("is-active");
    el("btnToggleCustomSpeech").click();
    const advCollapsedAgain = el("speechAdvancedDrawer").classList.contains("hidden");
    const stepHintOk = advCollapsedByDefault && advExpandedOnClick && advCollapsedAgain;
    const compactFanOk = el("cornerFourGDeck").classList.contains("is-compact-fan");

    clearStepTimer();
    resetMatchToLobby();
    return {
      stripShown,
      microLabelClear,
      fourGHeadInit,
      fourGHoverExplains,
      fourGHoverRestores,
      guideHasLiveTools,
      stepHintOk,
      compactFanOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(convRes)) {
    if (!v) {
      throw new Error("v9.1 UI-CONVERGENCE check failed for " + k + ": " + JSON.stringify(convRes));
    }
  }
}

// v9.2 ZERO-EXPERIENCE TUTORIAL, USER-PACED ROLE DEAL CARD & GUIDED BEGINNER COACH CHECK
{
  const begRes = vm.runInContext(`(() => {
    clearStepTimer();
    const tut1ZeroExpOk = Boolean(TUTORIAL_SLIDES[0] && TUTORIAL_SLIDES[0].title === "基本規則" && TUTORIAL_SLIDES[0].html.includes("投票請他離席") && !TUTORIAL_SLIDES[0].html.includes("一句話秒懂"));

    // startGuidedBeginnerMatch sets 6p Seer + easy + no sheriff + guidedBeginner=true and does NOT auto-dismiss role card!
    startGuidedBeginnerMatch();
    const cardStaysOpen = !el("roleDealOverlay").classList.contains("hidden") && indieFlow.dealTimer === null;
    const cardSimpleOk = el("roleDealDesc").textContent.includes("偷看 1 個人") && el("roleDealActionList").innerHTML.includes("晚上") && el("roleDealActionList").innerHTML.includes("投票");
    const guidedSetupOk = state.match.totalSeats === 6 && state.match.guidedBeginner === true && state.aiDifficulty === "easy" && !state.match.sheriffSeatId;

    // Opening tutorial from inside roleDealOverlay keeps roleDealOverlay open underneath!
    el("btnRoleDealOpenTut").click();
    const tutOverCardOk = !el("modalTutorial").classList.contains("hidden") && !el("roleDealOverlay").classList.contains("hidden");
    window.dispatchEvent({ type: "keydown", key: "Escape", target: { tagName: "BODY" }, preventDefault() {} });
    const escClosedTutFirst = el("modalTutorial").classList.contains("hidden") && !el("roleDealOverlay").classList.contains("hidden");

    // Confirm button closes role card cleanly
    el("btnRoleDealConfirm").click();
    const confirmClosedCard = el("roleDealOverlay").classList.contains("hidden");

    // Step-by-step Beginner Coach updates cleanly across phases and dismisses on click
    state.match.phase = "NIGHT_SEER";
    state.seerReveal = null;
    updateAllUI();
    const coachNightOk = !el("beginnerCoachBanner").classList.contains("hidden") && el("beginnerCoachText").textContent.includes("1/4");

    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const coachTurnOk = !el("beginnerCoachBanner").classList.contains("hidden") && el("beginnerCoachText").textContent.includes("3/4");

    el("btnDismissBeginnerCoach").click();
    const coachDismissed = el("beginnerCoachBanner").classList.contains("hidden") && state.match.guidedBeginner === false;

    clearStepTimer();
    resetMatchToLobby();
    return {
      tut1ZeroExpOk,
      cardStaysOpen,
      cardSimpleOk,
      guidedSetupOk,
      tutOverCardOk,
      escClosedTutFirst,
      confirmClosedCard,
      coachNightOk,
      coachTurnOk,
      coachDismissed
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(begRes)) {
    if (!v) {
      throw new Error("v9.2 BEGINNER-EXPERIENCE check failed for " + k + ": " + JSON.stringify(begRes));
    }
  }
}

// v9.3.1 SKIRT-DRAPE-FIX: Ensure seated VRM skirt panels NEVER flip upward above horizontal & sculpted lapSkirt flares downward
{
  const skirtRes = vm.runInContext(`(() => {
    const legRx = -1.40;
    const zones = ["front", "side", "back"];
    let legParentNoFlip = true;
    let hipsParentNoFlip = true;
    let sideSplayOk = true;
    for (const z of zones) {
      let accLeg = legRx;
      let accHips = 0;
      for (let d = 0; d <= 2; d++) {
        const aLeg = stage3dVrm.getSeatedSkirtTargetAngles({ isSkirt: true, skirtZone: z, skirtSideSign: 1, skirtInheritsLeg: true, depth: d }, 0);
        const aHips = stage3dVrm.getSeatedSkirtTargetAngles({ isSkirt: true, skirtZone: z, skirtSideSign: -1, skirtInheritsLeg: false, depth: d }, 0);
        accLeg += aLeg.rx;
        accHips += aHips.rx;
        // Must NEVER cross -PI/2 (-1.5708 rad, horizontal) into upward flip!
        if (accLeg <= -1.45) legParentNoFlip = false;
        if (accHips <= -1.45) hipsParentNoFlip = false;
        if (z === "side" && d === 0) {
          if (!(aLeg.rz > 0 && aHips.rz < 0)) sideSplayOk = false;
        }
      }
      // Final hem must relax substantially downward (world angle > -0.80 rad for all zones!)
      if (accLeg < -0.80) legParentNoFlip = false;
    }
    const charSrcOk = true;
    return { legParentNoFlip, hipsParentNoFlip, sideSplayOk, charSrcOk };
  })()`, ctx);
  const meshSrc = fs.readFileSync(path.join(ROOT, "js/stage3d/character-mesh.js"), "utf8");
  if (!meshSrc.includes("new THREE.Vector2(0.46, -0.14)") || !meshSrc.includes("new THREE.Vector2(0.24, 0.24)")) {
    throw new Error("v9.3.1 SKIRT-DRAPE-FIX: sculpted lapSkirt must flare downward with ascending Y outward normals");
  }
  for (const [k, v] of Object.entries(skirtRes)) {
    if (!v) {
      throw new Error("v9.3.1 SKIRT-DRAPE-FIX check failed for " + k + ": " + JSON.stringify(skirtRes));
    }
  }
}

// v10.0 PERSONA-OVERHAUL: All 11 AI Personas Complete (2D Portraits, 3D VRM Styling & Accessories, Literary/文言文 Registers, 7-Dim Blind Cognitive Divergence, Voice & Showcase)
{
  const v10Res = vm.runInContext(`(() => {
    const names = AI_PERSONAS.map(p => p.name);
    const all11 = names.length === 11;
    const allProfilesOk = names.every(n => {
      const p = PERSONA_COGNITIVE_PROFILES[n];
      return Boolean(p && p.register && p.registerBadge && p.logicTags && p.sampleQuote && p.llmStyleRule &&
        typeof p.credulity === "number" && typeof p.grudgeMemory === "number" &&
        typeof p.harmonySensitivity === "number" && typeof p.bandwagonBias === "number" &&
        typeof p.bluffBoldness === "number" && typeof p.godHideBias === "number");
    });
    const all3DStylingOk = names.every(n => {
      const st = VRM_PERSONA_STYLING[n];
      const av = CHAR_AVATAR_STYLES[n];
      const idl = VRM_IDLE_ARCHETYPES[n];
      const rigSlug = stage3dVrm.resolveVrmRigSlug({ name: n, id: 2 });
      const manifest = stage3d.getDefaultStaticAvatarManifest().seatModels;
      return Boolean(st && st.baseSlug && manifest[rigSlug] && av && av.acc && idl && typeof idl.talkArmAmp === "number");
    });
    // Original-lore VRM rig re-pairing & full 14-character unified portraits_vrm map
    const expectedVrmPortraits14 = [
      "主持", "你", "你_男", "小澄", "暖暖", "阿松", "星兒",
      "小雲", "阿竹", "晨晨", "墨白", "晴嵐", "阿朗", "柚子"
    ];
    const all14VrmPortraitsOk = expectedVrmPortraits14.every(k => {
      const pUrl = VRM_PORTRAIT_ART_MAP[k];
      return typeof pUrl === "string" && pUrl.startsWith("assets/portraits_vrm/") && pUrl.endsWith(".jpg");
    });
    const xiaochengFixed = stage3dVrm.resolveVrmRigSlug({ name: "小澄", id: 2 }) === "xiaocheng" &&
      stage3dVrm.resolveVrmRigSlug({ name: "晨晨", id: 8 }) === "chenchen" &&
      stage3dVrm.resolveVrmRigSlug({ name: "柚子", id: 12 }) === "youzi" &&
      VRM_PERSONA_STYLING["小澄"].bakedNative === true &&
      VRM_PERSONA_STYLING["小澄"].vrmAcc === "glasses" &&
      VRM_PORTRAIT_ART_MAP["小澄"] === "assets/portraits_vrm/xiaocheng.jpg" &&
      all14VrmPortraitsOk;
    // Expanded 10/12p characters all have valid VRM base rigs + signature accessories
    const expandedVrmOk = ["墨白", "晴嵐", "阿朗", "柚子"].every(n => {
      const rig = stage3dVrm.resolveVrmRigSlug({ name: n, id: 9 });
      return Boolean(stage3d.getDefaultStaticAvatarManifest().seatModels[rig] && VRM_PERSONA_STYLING[n].vrmAcc);
    });
    const allVoiceOk = names.every(n => Boolean(PERSONA_VOICE_PROFILES[n] && PERSONA_TTS_DIRECTIONS[n]));

    // Behavioral / Cognitive Divergence Checks (Zero-Leak Blind-View compliant)
    const cognitiveDivergenceOk =
      getPersonaSuspicionModifiers("暖暖").toxicScale > getPersonaSuspicionModifiers("墨白").toxicScale &&
      getPersonaSuspicionModifiers("阿朗").grudgeBonus > getPersonaSuspicionModifiers("暖暖").grudgeBonus &&
      getPersonaGodHideChance("墨白") > 0.7 && getPersonaGodHideChance("晨晨") < 0.2 &&
      getPersonaWolfCounterChance("晨晨", "seer") > getPersonaWolfCounterChance("墨白", "seer") &&
      getPersonaProfile("柚子").bandwagonBias > 0.5 && getPersonaProfile("墨白").bandwagonBias < -0.3;

    // 11-Character Speech Uniqueness & Literary Register (文言文 / 樂府 / 詩茶 / 辯論) Verification
    clearStepTimer();
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];
    state.match.logs = [];

    const openTexts = new Set();
    let mobaiClassicalOk = false;
    let qinglanGuzhengOk = false;
    let azhuPoeticOk = false;
    let alangDebateOk = false;
    let mobaiLlmPromptOk = false;
    state.match.seats.forEach(s => {
      if (s.id === getPlayerId()) return;
      s.role = "villager";
      s.team = "good";
      const sp = buildHeuristicAiSpeech(s);
      openTexts.add(sp.text);
      if (s.name === "墨白") {
        mobaiClassicalOk = /素箋|是非|條理|脈絡|妄下|斷言|對照|破綻|明辨|點到為止|清白/.test(sp.text) && !/[吾汝妾身]|諸君|小生|超扯|哈哈|嗚哇/.test(sp.text);
        const built = buildBlindGeminiSpeechPrompt(s, sp);
        mobaiLlmPromptOk = Boolean(built && built.audit && built.audit.ok && built.prompt.includes("國學社清冷思辨") && !built.prompt.includes("魏晉純文言判詞"));
      }
      if (s.name === "晴嵐") qinglanGuzhengOk = /晴嵐|清音|琴弦|弦外|茶煙|清茶|溫雅|清濁|平和/.test(sp.text) && !/妾身|諸君|吾/.test(sp.text);
      if (s.name === "阿竹") azhuPoeticOk = /阿竹|茶|凍頂|清風|同窗|留白|清正/.test(sp.text) && !/小生|諸君|矣/.test(sp.text);
      if (s.name === "阿朗") alangDebateOk = /辯|立論|質詢|證據|申論|漏洞|邏輯|線索|先聽/.test(sp.text);
    });
    const all11UniqueSpeeches = openTexts.size === 11;

    // Intel popover badge & Showcase persona dossier + audition UI
    const mobaiSeat = state.match.seats.find(s => s.name === "墨白");
    openSeatIntel(mobaiSeat.id);
    const intelBadgeOk = el("intelPersonaBadge").textContent.includes("國學社清冷思辨");
    closeSeatIntel();

    stage3d.showcaseTarget = "9";
    indieFlow.syncShowcaseTargetUi();
    const showcaseBioOk = el("showcasePersonaBio").textContent.length > 10;
    el("btnShowcaseAuditionVoice").click();

    clearStepTimer();
    resetMatchToLobby();
    return {
      all11, allProfilesOk, all3DStylingOk, xiaochengFixed, expandedVrmOk, allVoiceOk,
      cognitiveDivergenceOk, all11UniqueSpeeches, mobaiClassicalOk, qinglanGuzhengOk,
      azhuPoeticOk, alangDebateOk, mobaiLlmPromptOk, intelBadgeOk, showcaseBioOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v10Res)) {
    if (!v) {
      throw new Error("v10.0 PERSONA-OVERHAUL check failed for " + k + ": " + JSON.stringify(v10Res));
    }
  }
}

// v10.1 CRAFT-ICONS & ANTI-AI-TEXT POLISH: Eastern Fine-Line SVG Icon Library, Zero Cartoon Emojis in ai.html, Classical Speech Typography & Zero AI Cliché Buzzwords
{
  // 1. Verify zero OS cartoon emojis remain in visible ai.html markup (excluding <script> and HTML comments)
  const visibleHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const htmlEmojiHits = visibleHtml.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{23F0}-\u{23FF}\u{2B50}\u{2B55}\u{FE0F}]/gu) || [];
  const disallowedHtmlEmojis = htmlEmojiHits.filter(ch => !["✓", "✕", "✦", "○", "▶", "▸", "▾", "★", "☆", "↺", "↻", "→", "←"].includes(ch));
  if (disallowedHtmlEmojis.length > 0) {
    throw new Error("v10.1 CRAFT-ICONS: cartoon emojis still present in visible ai.html: " + [...new Set(disallowedHtmlEmojis)].join(" "));
  }
  if (!compCss.includes(".sh-ico") || !compCss.includes("is-classical-speech")) {
    throw new Error("v10.1 CRAFT-ICONS: missing .sh-ico or .is-classical-speech styles in css/components.css");
  }

  // 2. Runtime icon library, XSS safety, classical typography toggle, carved stance stamps & zero AI cliché buzzwords
  const v101Res = vm.runInContext(`(() => {
    const allIconKeysOk = AI_PERSONAS.every(p => {
      const prof = PERSONA_COGNITIVE_PROFILES[p.name];
      return Boolean(prof && prof.iconKey && SANHAO_SVG_PATHS[prof.iconKey]);
    }) && ["seer", "witch", "guard", "wolf", "crown", "target", "check", "leaf", "lotus", "chat", "scales", "brush", "guzheng", "bamboo", "abacus", "mountain", "star", "press", "flame", "pastry"].every(k => Boolean(SANHAO_SVG_PATHS[k]));

    const richOut = shRichHtml('<script>alert(1)</script> 🔮 墨白');
    const richXssSafe = richOut.includes("&lt;script&gt;") && !richOut.includes("<script>") && richOut.includes('<svg class="sh-ico sh-ico-gold"');
    const strippedCanvas = shStripCanvasEmoji("⚡ 抓包邏輯矛盾! 🐺");
    const canvasStripOk = !strippedCanvas.includes("⚡") && !strippedCanvas.includes("🐺") && strippedCanvas.includes("抓包邏輯矛盾");

    // Zero robotic AI-cliché buzzwords in spoken persona flavors, voice styles & showcase sample quotes
    const bannedBuzz = ["邏輯閉環率", "行為向量", "高置信度報告", "逆向工程", "異常值警報", "載入時間軸比對完畢"];
    const quotesDump = Object.values(PERSONA_COGNITIVE_PROFILES).map(p => p.registerBadge + " " + p.sampleQuote).join(" ");
    const flavorsDump = JSON.stringify(PERSONA_FLAVORS) + " " + quotesDump;
    const noAiBuzzwords = bannedBuzz.every(w => !flavorsDump.includes(w));

    // Classical speech typography class toggle on #spotlightStageBox & carved SVG stance chips
    clearStepTimer();
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const mobai = state.match.seats.find(s => s.name === "墨白");
    const cheng = state.match.seats.find(s => s.name === "小澄");
    syncSpeakerBannerVisuals(mobai, "09 墨白", mobai.trait, false);
    const mobaiHasClassicalClass = el("spotlightStageBox").classList.contains("is-classical-speech");
    syncSpeakerBannerVisuals(cheng, "02 小澄", cheng.trait, false);
    const chengDropsClassicalClass = !el("spotlightStageBox").classList.contains("is-classical-speech");

    renderSpeakerStanceStrip(mobai, { claimRole: "seer", accuseId: cheng.id, vouchId: 3, wolfPits: [cheng.id] });
    const stanceHtml = el("speakerStanceStrip").children.map(c => c.innerHTML || c.textContent).join(" ");
    const stanceSvgOk = stanceHtml.includes('<svg class="sh-ico') && stanceHtml.includes("亮・明心觀察員") && !stanceHtml.includes("🔮") && !stanceHtml.includes("🎯");

    clearStepTimer();
    resetMatchToLobby();
    return { allIconKeysOk, richXssSafe, canvasStripOk, noAiBuzzwords, mobaiHasClassicalClass, chengDropsClassicalClass, stanceSvgOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v101Res)) {
    if (!v) {
      throw new Error("v10.1 CRAFT-ICONS & ANTI-AI check failed for " + k + ": " + JSON.stringify(v101Res));
    }
  }
}

// v10.2 THREE-CARD CRAFT REDESIGN: Ceremonial Role Deal Scroll, Legible Daylight Role Plaque & Editorial Seat Intel Dossier
{
  const themeCss = fs.readFileSync(path.join(ROOT, "css/theme.css"), "utf8");
  const dayAmberFixOk = themeCss.includes("text-amber-300\\/90") && compCss.includes(".intel-dossier-card") || (themeCss.includes("text-amber-300\\/90") && compCss.includes(".intel-seat-seal") && compCss.includes(".role-nameplate") && compCss.includes(".deal-crest-medallion"));
  if (!dayAmberFixOk) {
    throw new Error("v10.2 THREE-CARD REDESIGN: missing daylight amber-opacity override or craft card CSS classes");
  }
  const dealScrollOk = html.includes('id="roleDealCardBox"') && html.includes('custom-scroll') && html.includes('id="roleDealCrest"');
  if (!dealScrollOk) {
    throw new Error("v10.2 THREE-CARD REDESIGN: missing #roleDealCrest or .custom-scroll on #roleDealCardBox");
  }

  const v102Res = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();

    // 1. Ceremonial Role Deal Card
    const dealCrestSvg = el("roleDealCrest").innerHTML.includes('<svg class="sh-ico');
    const dealSeatSeal = el("roleDealSeat").textContent.includes("號席");
    const dealStepLedger = el("roleDealActionList").innerHTML.includes("deal-step-text") && el("roleDealActionList").innerHTML.includes('<svg class="sh-ico');
    indieFlow.hideRoleDealRitual();

    // 2. Bottom-left Secret Role Plaque (no truncation, crisp SVG nameplate & mission line)
    renderPlayerRoleCard();
    const rolePlaqueOk = String(el("playerTeamPill").className).includes("role-nameplate") && el("playerTeamPill").textContent.includes("明心觀察員");
    const missionPlaqueOk = String(el("playerMissionLine").className).includes("role-mission-line") && el("playerMissionLine").textContent.includes("密令");
    const toolkitSingleRowOk = el("liveToolkitStrip").innerHTML.includes("心虛1") && el("liveToolkitStrip").innerHTML.includes("暖茶1") && el("liveToolkitStrip").innerHTML.includes("四給4");

    // 3. Top-right Seat Intel Dossier (lacquer seal without neon bg, editorial quote header/body, segmented stance toggle)
    const targetAi = state.match.seats.find(s => s.id !== getPlayerId() && s.alive);
    targetAi.lastSpeech = { day: 1, stance: "accuse", text: "一號稍早話未說清，我先留一分查證空間。", targetId: 1 };
    openSeatIntel(targetAi.id);
    const sealNoNeonBg = !el("intelSeatDot").style.backgroundColor;
    const editorialQuoteOk = el("intelQuoteBox").innerHTML.includes("intel-quote-meta") && el("intelQuoteBox").innerHTML.includes("intel-quote-body") && !el("intelQuoteBox").innerHTML.includes("【指控");
    el("btnIntelMarkGood").click();
    const segGoodActive = String(el("btnIntelMarkGood").className).includes("is-active-good");
    closeSeatIntel();

    clearStepTimer();
    resetMatchToLobby();
    return {
      dealCrestSvg, dealSeatSeal, dealStepLedger,
      rolePlaqueOk, missionPlaqueOk, toolkitSingleRowOk,
      sealNoNeonBg, editorialQuoteOk, segGoodActive
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v102Res)) {
    if (!v) {
      throw new Error("v10.2 THREE-CARD REDESIGN check failed for " + k + ": " + JSON.stringify(v102Res));
    }
  }
}

// v10.3 SINGLE-FOCUS CALM HUD & INSTANT TEXT REVEAL: Zero Typewriter Crawl, Slim 2-Line Role Plaque, Collapsible Four-Givings Pouch & 100% Viewport Lock
{
  const themeCss103 = fs.readFileSync(path.join(ROOT, "css/theme.css"), "utf8");
  const viewportFixOk = compCss.includes("width: 100%;") && !compCss.includes("width: 100vw;\r\n  height: 100vh") && !compCss.includes("width: 100vw;\n  height: 100vh") && themeCss103.includes("html {");
  const calmHudCssOk = compCss.includes("spotlightCalmFade") && compCss.includes(".role-tile-details") && compCss.includes(".fourg-fan-tray") && compCss.includes("#inGameTopHud #bannerHeadline");
  if (!viewportFixOk || !calmHudCssOk) {
    throw new Error("v10.3 CALM-HUD CSS check failed! viewportFixOk=" + viewportFixOk + ", calmHudCssOk=" + calmHudCssOk);
  }

  const v103Res = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();

    // 1. Night 1 Seer no longer duplicates instruction in #nightRoleTipStrip
    state.match.phase = "NIGHT_SEER";
    updateAllUI();
    const nightNoDuplicateTip = el("nightRoleTipStrip").classList.contains("hidden");

    // 2. Instant calm speech reveal (no running typewriter interval, complete text immediately readable!)
    state.match.phase = "DAY_SPEECH";
    const sp = state.match.seats.find(s => s.id !== getPlayerId() && s.alive);
    state.activeSpeakerId = sp.id;
    startSpotlightTypewriter({ speaker: sp, badge: "02號・" + sp.name, trait: sp.trait, rawText: "昨晚風平浪靜，我先聽聽後置位意見。" });
    const instantFullTextOk = !state.typewriter.active && el("spotlightText").innerHTML.includes("昨晚風平浪靜") && el("spotlightText").innerHTML.includes("」");

    // 3. Collapsible Four-Givings pouch toggles cleanly via #fourGDeckHeader
    updateAllUI();
    const pouchClosedInit = !el("cornerFourGDeck").classList.contains("is-fan-open");
    el("fourGDeckHeader").click();
    const pouchOpensOnClick = el("cornerFourGDeck").classList.contains("is-fan-open");
    el("fourGDeckHeader").click();
    const pouchClosesOnClick = !el("cornerFourGDeck").classList.contains("is-fan-open");

    // 4. Role guide popover now includes active mission alongside live tools
    openRoleGuidePopover("role");
    const guideHasMission = el("roleGuideBody").innerHTML.includes("密令");
    closeRoleGuidePopover();

    // 5. Distinct 11-persona voice pitch spread & 2-char shortTag recognizability
    const voicePitches = AI_PERSONAS.map(p => PERSONA_VOICE_PROFILES[p.name] && PERSONA_VOICE_PROFILES[p.name].pitch).filter(Boolean);
    const voiceSpreadOk = voicePitches.length === 11 && (Math.max(...voicePitches) - Math.min(...voicePitches)) >= 0.45;
    const shortTagsOk = AI_PERSONAS.every(p => typeof getPersonaShortTag === "function" && getPersonaShortTag(p.name).length === 2);

    clearStepTimer();
    resetMatchToLobby();
    return { nightNoDuplicateTip, instantFullTextOk, pouchClosedInit, pouchOpensOnClick, pouchClosesOnClick, guideHasMission, voiceSpreadOk, shortTagsOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v103Res)) {
    if (!v) {
      throw new Error("v10.3 CALM-HUD check failed for " + k + ": " + JSON.stringify(v103Res));
    }
  }
}

// v11.0 PUBLIC RELEASE 1.0: Ergonomic 3D Proportions, Multi-Joint VRM Rig + Fingers, 3D Wax-Seal Card Flip Ritual, Silent-Mode Anim & Vercel Blind-Review Config
{
  const vercelCfgOk = fs.existsSync(path.join(ROOT, "vercel.json")) && fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8").includes("/ai.html");
  const vercelIgnOk = fs.existsSync(path.join(ROOT, ".vercelignore")) && fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8").includes("tests/");
  const cardRitualHtmlOk = html.includes('id="roleDealFlipper"') && html.includes('id="roleDealCardBack"') && html.includes("deal-back-wax-seal") && /公測\s*[2-9]\.[0-9]+/.test(html);
  const cardRitualCssOk = compCss.includes("dealFlipReveal") && compCss.includes(".deal-card-back") && compCss.includes(".deal-burst-ring") && compCss.includes(".title-release-badge");
  const vrmSource11 = fs.readFileSync(path.join(ROOT, "js/stage3d/vrm-loader.js"), "utf8");
  const multiJointSrcOk = vrmSource11.includes("bm.neck") && vrmSource11.includes("bm.rightShoulder") && vrmSource11.includes("bm.rightHand") && vrmSource11.includes("rightIndexProximal") && vrmSource11.includes("FINGER_PRESETS");
  if (!vercelCfgOk || !vercelIgnOk || !cardRitualHtmlOk || !cardRitualCssOk || !multiJointSrcOk) {
    throw new Error("v11.0 STATIC CHECK FAILED: " + JSON.stringify({ vercelCfgOk, vercelIgnOk, cardRitualHtmlOk, cardRitualCssOk, multiJointSrcOk }));
  }

  const v110Res = vm.runInContext(`(() => {
    clearStepTimer();
    // 1. Ergonomic 3D chair-to-table gap across 6/8/10/12 seats (<= 1.0 unit gap!)
    const layoutChecks = [6, 8, 10, 12].map(n => get3DTableLayout(n));
    const ergonomicGapOk = layoutChecks.every(l => (l.ringRadius - l.tableR) >= 0.85 && (l.ringRadius - l.tableR) <= 1.02 && l.propZ >= 1.55 && l.propZ <= 1.72);

    // 2. All 11 personas have gestureStyle defined in VRM_IDLE_ARCHETYPES
    const allGestureStylesOk = AI_PERSONAS.every(p => VRM_IDLE_ARCHETYPES[p.name] && typeof VRM_IDLE_ARCHETYPES[p.name].gestureStyle === "string");

    // 3. 3D Wax-Seal Card Flip Ritual states: sealed on open -> unsealRoleDealCard -> unsealing/revealed -> hide resets!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    const ritualStartsSealed = !el("roleDealOverlay").classList.contains("hidden") && el("roleDealOverlay").classList.contains("is-sealed") && indieFlow.dealRevealed === false && indieFlow.dealTimer === null;
    const backSeatOk = el("roleDealBackSeat").textContent.includes("席");
    indieFlow.unsealRoleDealCard();
    const unsealTriggeredOk = indieFlow.dealRevealed === true && !el("roleDealOverlay").classList.contains("is-sealed") && (el("roleDealOverlay").classList.contains("is-unsealing") || el("roleDealOverlay").classList.contains("is-revealed"));
    const fanfareFnOk = typeof sound.playRoleRevealFanfare === "function";
    indieFlow.hideRoleDealRitual();
    const ritualCleanReset = el("roleDealOverlay").classList.contains("hidden") && indieFlow.dealRevealed === false;

    // 4. Silent-mode speech animation window stays active after instant text display
    state.match.phase = "DAY_SPEECH";
    const sp11 = state.match.seats.find(s => s.id !== getPlayerId() && s.alive);
    state.activeSpeakerId = sp11.id;
    startSpotlightTypewriter({ speaker: sp11, badge: "02號・" + sp11.name, trait: sp11.trait, rawText: "請各位細察昨日票型與前後發言的邏輯脈絡。" });
    const silentAnimWindowOk = typeof state.activeSpeechAnimUntil === "number" && state.activeSpeechAnimUntil > performance.now() + 1500;

    // 5. Public Release 2.0 diagnostics & anonymous host helper
    const diag11 = collectFeedbackDiagnostics();
    const version11Ok = /^v\\d+\\.\\d+/.test(String(diag11.version || "")) && typeof isAnonymousReviewHost === "function";

    clearStepTimer();
    resetMatchToLobby();
    return { ergonomicGapOk, allGestureStylesOk, ritualStartsSealed, backSeatOk, unsealTriggeredOk, fanfareFnOk, ritualCleanReset, silentAnimWindowOk, version11Ok };
  })()`, ctx);

  for (const [k, v] of Object.entries(v110Res)) {
    if (!v) {
      throw new Error("v11.0 PUBLIC RELEASE check failed for " + k + ": " + JSON.stringify(v110Res));
    }
  }
}

// v11.1 SHERIFF TURN-BY-TURN SPEECH + SHERIFF BALLOT PIT DEDUCTION + PROMINENT PIT CTA
{
  const pitCtaHtmlOk = html.includes('id="btnOpenPitSheet"') && html.includes('id="pitSheriffRefStrip"') && html.includes('class="speech-adv-toggle speech-pit-cta shrink-0"') && html.includes('id="btnSheriffNextSpeech"');
  const pitCtaCssOk = compCss.includes("pitCtaGlow") && compCss.includes(".pit-quick-btn") && compCss.includes(".pit-sheriff-strip") && compCss.includes(".sheriff-order-pill");
  if (!pitCtaHtmlOk || !pitCtaCssOk) {
    throw new Error("v11.1 STATIC CHECK FAILED: " + JSON.stringify({ pitCtaHtmlOk, pitCtaCssOk }));
  }

  const v111Res = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    const signupStageOk = state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "signup"
      && !el("btnSheriffStartSpeech").classList.contains("hidden")
      && el("sheriffElectionVoteRow").classList.contains("hidden")
      && el("spotlightStageBox").classList.contains("hidden");

    // Player runs on stand -> clockwise turn-by-turn speeches (AI spotlight + player campaign box) -> vote stage
    resolveSheriffElectionAction("run");
    const ctxRun = state.match.sheriffElectionCtx;
    const orderSortedOk = Boolean(ctxRun && ctxRun.stage === "speech" && ctxRun.speechOrderIds.includes(pid)
      && ctxRun.speechOrderIds.every((id, i, arr) => i === 0 || arr[i - 1] < id));

    let sawAiSpotlight = false;
    let sawPlayerBox = false;
    let safety = 0;
    while (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech" && safety < 12) {
      safety += 1;
      if (state.match.sheriffElectionCtx.activeReelSeatId === pid) {
        if (!el("sheriffPlayerTurnBox").classList.contains("hidden")) sawPlayerBox = true;
        submitPlayerSheriffSpeech("我上警理性帶隊，待會一起看警下票型排坑！");
      } else {
        if (!el("spotlightStageBox").classList.contains("hidden")) sawAiSpotlight = true;
        advanceSheriffSpeechTurn();
      }
    }
    const reachedVoteStageOk = Boolean(state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "vote");
    resolveSheriffElectionAction("pass");

    // Under-stand listening & voting path -> persists structured sheriffVoteRecord
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pid2 = getPlayerId();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("listen");
    let safety2 = 0;
    while (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech" && safety2 < 10) {
      safety2 += 1;
      advanceSheriffSpeechTurn();
    }
    const voteRowVisibleAfterSpeeches = !el("sheriffElectionVoteRow").classList.contains("hidden");
    let votedCandId = state.match.sheriffElectionCtx.candidateIds[0];
    resolveSheriffElectionAction(votedCandId);
    // Handle valid Round-1 Sheriff tie -> PK Round-2 re-vote cleanly
    if (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.isPkRound) {
      votedCandId = state.match.sheriffElectionCtx.candidateIds[0];
      resolveSheriffElectionAction(votedCandId);
    }
    const shRec = state.match.sheriffVoteRecord;
    const recordSavedOk = Boolean(shRec && shRec.kind === "sheriff" && (shRec.winnerId || shRec.badgeLost) && Array.isArray(shRec.ballots)
      && shRec.ballots.some(b => b.voterId === pid2 && b.targetId === votedCandId));

    // Blind-view zero-leak exposure + AI pit deduction scoring + Day 1 speech context + Gemini prompt + Vote Sheet
    const aiOther = getAliveSeats().find(s => s.id !== pid2);
    const violBefore = antiCheatMonitor.stats.violationsBlocked;
    const snapSh = createBlindMatchSnapshot(aiOther, { module: "v111_test" });
    const blindHasRecOk = Boolean(snapSh && snapSh.sheriffVoteRecord && snapSh.sheriffVoteRecord.winnerId === shRec.winnerId)
      && antiCheatMonitor.stats.violationsBlocked === violBefore;

    const speechCtxDay1 = buildSpeechContext(aiOther);
    const day1SheriffNoteOk = Boolean(speechCtxDay1 && speechCtxDay1.sheriffVoteNote && speechCtxDay1.sheriffVoteNote.includes("警長"));

    const builtPrompt = buildBlindGeminiSpeechPrompt(aiOther, { text: "先聽發言" });
    const geminiHasSheriffBallotsOk = Boolean(builtPrompt && builtPrompt.audit && builtPrompt.audit.ok
      && builtPrompt.prompt.includes("【第1天警長競選與警下票型（排坑必考）】"));

    renderVoteSheetIntoBody();
    const voteSheetHasSheriffOk = el("voteSheetBody").innerHTML.includes("警長競選票型");

    // Dual-Seer Sheriff ballot pit scoring test: voter who backed rival Seer gets prioritized into wolfPits (deterministic setup!)
    state.match.seats.forEach(s => { s.claimedRole = null; });
    const seatsAlive = getAliveSeats().filter(s => s.id !== pid2);
    const sA = seatsAlive.find(s => s.role !== "wolf" && s.role !== "seer" && s.role !== "witch") || seatsAlive[0];
    const restDual = seatsAlive.filter(s => s.id !== sA.id);
    const sB = restDual[0], sVoter = restDual[1];
    sA.claimedRole = "seer";
    sB.claimedRole = "seer";
    sA.suspicionMap = {};
    state.match.seats.forEach(s => { sA.suspicionMap[s.id] = 50; });
    state.match.sheriffVoteRecord = {
      day: 1,
      kind: "sheriff",
      candidateIds: [sA.id, sB.id],
      withdrawnIds: [],
      seerClaimIds: [sA.id, sB.id],
      winnerId: sA.id,
      ballots: [{ voterId: sVoter.id, targetId: sB.id, weight: 1 }],
      tallies: { [sA.id]: 3, [sB.id]: 1 }
    };
    const slotDual = buildTableSlotAndWorldAnalysis(sA);
    const dwRes = slotDual && slotDual.dualSeerWorlds;
    const wTrustedA = dwRes && (dwRes.worldA.trustedSeer.id === sA.id ? dwRes.worldA : dwRes.worldB);
    const dualWorldSheriffPitOk = Boolean(wTrustedA
      && wTrustedA.secondWolf && wTrustedA.secondWolf.id === sVoter.id
      && wTrustedA.secondReason.includes("警長投票"));

    // Prominent pit CTA + Pit Builder sheriff strip & composed speech integration
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const pitBtnProminentOk = el("btnToggleCustomSpeech").innerHTML.includes("排坑／亮牌");
    const sheriffStripVisibleOk = !el("pitSheriffRefStrip").classList.contains("hidden")
      && el("pitSheriffRefStrip")._children.some(c => c.textContent && c.textContent.includes("警長票型參考"));
    togglePlayerDraftSeatPit(sVoter.id);
    const composedPitHasSheriffOk = composePlayerPitSpeechText().includes("警長競選");

    clearStepTimer();
    resetMatchToLobby();
    return {
      signupStageOk,
      orderSortedOk,
      sawAiSpotlight,
      sawPlayerBox,
      reachedVoteStageOk,
      voteRowVisibleAfterSpeeches,
      recordSavedOk,
      blindHasRecOk,
      day1SheriffNoteOk,
      geminiHasSheriffBallotsOk,
      voteSheetHasSheriffOk,
      dualWorldSheriffPitOk,
      pitBtnProminentOk,
      sheriffStripVisibleOk,
      composedPitHasSheriffOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v111Res)) {
    if (!v) {
      throw new Error("v11.1 SHERIFF-TURN & PIT-DEDUCTION check failed for " + k + ": " + JSON.stringify(v111Res));
    }
  }
}

// v11.3 FRONT-FACING MEDIUM/HALF-BODY SPEAKER CAMERA & BOTTOM SEAT-BAR JUMP-TO-FRONT
{
  const v113Res = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();

    // Synthesize 8-seat circular anchors for exact 3D camera geometry proof
    const ringR = get3DTableLayout(8).ringRadius;
    const mockAnchors = {};
    for (let i = 0; i < 8; i++) {
      const id = i + 1;
      const ang = Math.PI * 0.5 + (i * Math.PI * 2) / 8;
      const wx = Math.cos(ang) * ringR;
      const wz = Math.sin(ang) * ringR;
      mockAnchors[id] = {
        id,
        seat: getSeat(id),
        worldPos: { x: wx, y: 0, z: wz },
        headPos: { x: wx, y: 2.12, z: wz }
      };
    }
    const prevReady = stage3d.ready;
    const prevFailed = stage3d.failed;
    const prevView = state.viewMode;
    const prevSeats = stage3d.seats;
    const prevPreset = stage3d.camPreset;
    stage3d.ready = true;
    stage3d.failed = false;
    state.viewMode = "3d";
    stage3d.camPreset = "cinema";
    stage3d.seats = { anchors: mockAnchors };

    // 1. Every seat's front framing places camera IN FRONT OF the character (facing them) and clears the central lotus (distFromCenter >= 0.90)
    let allSeatsFrontAndLotusClear = true;
    for (let id = 1; id <= 8; id++) {
      const wp = mockAnchors[id].worldPos;
      const fr = stage3d.computeSeatFrontFraming(id, "speaker");
      if (!fr) { allSeatsFrontAndLotusClear = false; break; }
      const horiz = Math.cos(fr.pitch) * fr.radius;
      const camX = fr.lookX + Math.sin(fr.yaw) * horiz;
      const camY = fr.lookY + Math.sin(fr.pitch) * fr.radius;
      const camZ = fr.lookZ + Math.cos(fr.yaw) * horiz;
      const camDistCenter = Math.hypot(camX, camZ);
      // Unit front vector pointing out of seat toward table center
      const fLen = Math.hypot(wp.x, wp.z);
      const fx = -wp.x / fLen, fz = -wp.z / fLen;
      // Vector from seat to camera
      const sx = camX - wp.x, sz = camZ - wp.z;
      const sLen = Math.hypot(sx, sz);
      const frontDot = (sx * fx + sz * fz) / Math.max(0.01, sLen);
      if (frontDot < 0.92 || camDistCenter < 0.90 || camY < 1.55 || camY > 2.20 || fr.radius > 3.55) {
        allSeatsFrontAndLotusClear = false;
      }
    }

    // 2. Clicking a seat in the bottom strip (selectSeat) jumps camera right in front of that seat; closeSeatIntel clears it!
    state.match.phase = "DAY_SPEECH";
    const pid = getPlayerId();
    const otherSeat = state.match.seats.find(s => s.id !== pid && s.alive);
    state.activeSpeakerId = otherSeat.id;
    const anotherSeat = state.match.seats.find(s => s.id !== pid && s.id !== otherSeat.id && s.alive);
    selectSeat(anotherSeat.id);
    const clickJumpedToFrontOk = stage3d.closeUpSeatId === anotherSeat.id;
    closeSeatIntel();
    const closeIntelClearsOk = stage3d.closeUpSeatId === null;

    // 3. openSeatIntel also jumps camera to that seat, and advanceSpeechQueue clears closeUp for the next speaker
    openSeatIntel(anotherSeat.id);
    const intelJumpedOk = stage3d.closeUpSeatId === anotherSeat.id;
    state.match.speechQueue = [otherSeat.id];
    advanceSpeechQueue();
    const nextSpeakerClearsCloseUpOk = stage3d.closeUpSeatId === null;

    // Restore stage3d mock state cleanly
    stage3d.ready = prevReady;
    stage3d.failed = prevFailed;
    state.viewMode = prevView;
    stage3d.seats = prevSeats;
    stage3d.camPreset = prevPreset;
    stage3d.clearCloseUp();
    clearStepTimer();
    resetMatchToLobby();
    return { allSeatsFrontAndLotusClear, clickJumpedToFrontOk, closeIntelClearsOk, intelJumpedOk, nextSpeakerClearsCloseUpOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v113Res)) {
    if (!v) {
      throw new Error("v11.3 FRONT-CAMERA & SEAT-JUMP check failed for " + k + ": " + JSON.stringify(v113Res));
    }
  }
}

// v11.4 AUTHENTIC BADGE FLOW (雙警徽流＋夜間依序驗人＋倒牌暗號解讀＋排坑連動＋警長修復)
{
  const v114Res = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    if (el("chkSheriffMode")) el("chkSheriffMode").checked = true;
    state.sheriffMode = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const seerSeat = state.match.seats.find(s => s.role === "seer" && s.id !== pid) || state.match.seats.find(s => s.id !== pid);
    const others = state.match.seats.filter(s => s.id !== seerSeat.id && s.id !== pid);
    const t1 = others[0];
    const t2 = others[1];
    state.match.day = 2;
    state.match.sheriffElectionPending = false;
    state.match.sheriffSeatId = seerSeat.id;
    seerSeat.role = "seer";
    seerSeat.team = "good";
    seerSeat.claimedRole = "seer";
    seerSeat.checkedHistory = [];

    // 1. Structured Dual Badge Flow + Free-Text Parser
    const flowSet = setSheriffBadgeFlow(seerSeat.id, t1.id, t2.id, "election");
    const flowSetOk = Boolean(flowSet && state.match.sheriffBadgeFlow && state.match.sheriffBadgeFlow.firstTargetId === t1.id && state.match.sheriffBadgeFlow.secondTargetId === t2.id && flowSet.mode === "dual");
    const parsedFlow = parseBadgeFlowFromText("我是明心觀察員！昨晚查2號好人，警徽流先驗 " + t1.id + "號、再驗 " + t2.id + "號！", seerSeat.id);
    const parseOk = Boolean(parsedFlow && parsedFlow.firstTargetId === t1.id && parsedFlow.secondTargetId === t2.id);

    // 2. AI True Seer ACTUALLY checks 1st Badge Flow target at night, then 2nd target next night!
    const nightPick1 = chooseAiSeerTarget(seerSeat);
    const seerFollowedFirstOk = nightPick1 === t1.id;
    seerSeat.checkedHistory.push({ day: 2, targetId: t1.id, isWolf: true });
    const nightPick2 = chooseAiSeerTarget(seerSeat);
    const seerFollowedSecondOk = nightPick2 === t2.id;

    // 3. AI Seer Sheriff Badge Flow Transfer Execution:
    // 3a) t1 checked WOLF & t2 unchecked -> TEARS BADGE (returns null!)
    const tearDecision = chooseAiSheriffTransferTarget(seerSeat);
    const tearOnWolfOk = tearDecision === null;
    // 3b) t1 checked WOLF & t2 checked GOOD -> FLIES TO t2 (dual badge flow skip!)
    seerSeat.checkedHistory.push({ day: 3, targetId: t2.id, isWolf: false });
    const dualSkipDecision = chooseAiSheriffTransferTarget(seerSeat);
    const dualSkipToSecondGoodOk = dualSkipDecision === t2.id;
    // 3c) t1 checked GOOD -> FLIES TO t1!
    seerSeat.checkedHistory = [{ day: 2, targetId: t1.id, isWolf: false }];
    const goldFlyDecision = chooseAiSheriffTransferTarget(seerSeat);
    const flyToFirstGoldOk = goldFlyDecision === t1.id;

    // 4. Elimination Signal Decoding + Blind-View Projection + AI Deduction & Pit Weighting!
    seerSeat.checkedHistory = [{ day: 2, targetId: t1.id, isWolf: true }];
    const goodListener = state.match.seats.find(s => s.id !== pid && s.id !== seerSeat.id && s.id !== t1.id && s.id !== t2.id && s.team === "good");
    if (goodListener) {
      goodListener.suspicionMap[seerSeat.id] = 35;
      goodListener.suspicionMap[t1.id] = 50;
    }
    const beforeSus = goodListener ? goodListener.suspicionMap[t1.id] : 50;
    seerSeat.alive = false;
    handleSheriffEliminated(seerSeat, function () {});
    const latestSig = (state.match.badgeFlowSignals || [])[state.match.badgeFlowSignals.length - 1];
    const decodedTearSignalOk = Boolean(latestSig && latestSig.kind === "torn_wolf" && latestSig.suspectedWolfIds.indexOf(t1.id) !== -1);
    const aiSusRaisedOk = !goodListener || (goodListener.suspicionMap[t1.id] >= beforeSus + 12);
    const blindSnap = goodListener ? createBlindMatchSnapshot(goodListener, { module: "test_badge_flow" }) : null;
    const blindProjectsSignalsOk = Boolean(blindSnap && Array.isArray(blindSnap.badgeFlowSignals) && blindSnap.badgeFlowSignals.length >= 1);
    const ctxListener = goodListener ? buildSpeechContext(goodListener) : null;
    const aiSpeechCitesBadgeFlowOk = Boolean(ctxListener && String(ctxListener.prevVoteNote || "").indexOf("警徽流") !== -1);

    // 5. Sheriff Election Regression Fixes:
    // 5a) No phantom +1 self-vote when player runs & triggers pass/tally!
    // 5b) Mid-speech withdraw during AI turn preserves activeReelSeatId & does NOT skip remaining candidates!
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("run");
    const ctxRun = state.match.sheriffElectionCtx;
    const runOrderLen = ctxRun ? ctxRun.speechOrderIds.length : 0;
    // Advance past player if player is seat 1 so an AI candidate is speaking
    if (ctxRun && ctxRun.activeReelSeatId === getPlayerId()) {
      submitPlayerSheriffSpeech("我是好人上警，警徽流先驗 03號、再驗 04號！");
    }
    const aiSpeakingBeforeWithdraw = ctxRun ? ctxRun.activeReelSeatId : null;
    const pidRun = getPlayerId();
    const remainingAiBeforeWithdraw = ctxRun ? ctxRun.speechOrderIds.slice(ctxRun.speechIndex + 1).filter(id => id !== pidRun).length : 0;
    let withdrawPreservesAiOk = true;
    if (ctxRun && aiSpeakingBeforeWithdraw && aiSpeakingBeforeWithdraw !== pidRun && ctxRun.playerRunning) {
      resolveSheriffElectionAction("withdraw");
      const remainingAiAfterWithdraw = ctxRun.speechOrderIds.slice(ctxRun.speechIndex + 1).filter(id => id !== pidRun).length;
      withdrawPreservesAiOk = Boolean(ctxRun.activeReelSeatId === aiSpeakingBeforeWithdraw && remainingAiAfterWithdraw === remainingAiBeforeWithdraw);
    }

    // Fresh run to test zero phantom self-vote on running player
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("run");
    const pid2 = getPlayerId();
    resolveSheriffElectionAction("pass");
    if (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.isPkRound) {
      resolveSheriffElectionAction("pass");
    }
    const shRec2 = state.match.sheriffVoteRecord;
    const ballotSum = (shRec2 && Array.isArray(shRec2.ballots))
      ? shRec2.ballots.filter(b => b && b.targetId).length
      : 0;
    const tallySum = (shRec2 && shRec2.tallies)
      ? Object.values(shRec2.tallies).reduce((a, b) => a + b, 0)
      : 0;
    const noPhantomSelfVoteOk = Boolean(shRec2 && tallySum === ballotSum);

    // 6. Player Transfer Panel smart guide renders cleanly when player Sheriff has a badge flow
    state.match.sheriffSeatId = pid2;
    const p2 = getSeat(pid2);
    const otherAlive = state.match.seats.filter(s => s.id !== pid2 && s.alive);
    p2.role = "seer";
    p2.checkedHistory = [{ day: 1, targetId: otherAlive[0].id, isWolf: true }];
    setSheriffBadgeFlow(pid2, otherAlive[0].id, otherAlive[1].id, "day_speech");
    state.match.phase = "SHERIFF_TRANSFER";
    renderSheriffTransferPanel();
    const transferGuideOk = Boolean(el("sheriffTransferFlowGuide") && String(el("sheriffTransferFlowGuide").textContent || "").indexOf("酸民狼") !== -1);

    clearStepTimer();
    resetMatchToLobby();
    return {
      flowSetOk, parseOk, seerFollowedFirstOk, seerFollowedSecondOk,
      tearOnWolfOk, dualSkipToSecondGoodOk, flyToFirstGoldOk,
      decodedTearSignalOk, aiSusRaisedOk, blindProjectsSignalsOk, aiSpeechCitesBadgeFlowOk,
      withdrawPreservesAiOk, noPhantomSelfVoteOk, transferGuideOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v114Res)) {
    if (!v) {
      throw new Error("v11.4 BADGE-FLOW check failed for " + k + ": " + JSON.stringify(v114Res));
    }
  }

  // Verify sw.js IMMUTABLE_RE actually matches .vrm models & excludes manifest.json + offline safety guards!
  const swSrc = fs.readFileSync("sw.js", "utf8");
  const swReMatch = swSrc.match(/const IMMUTABLE_RE = (\/.*\/[a-z]*);/);
  if (!swReMatch) throw new Error("sw.js IMMUTABLE_RE not found!");
  const swRe = vm.runInNewContext(swReMatch[1]);
  if (!swRe.test("/assets/models/qingming.vrm") || !swRe.test("/assets/sky/sanctuary_day.jpg") || !swRe.test("/js/vendor/three.min.js")) {
    throw new Error("sw.js IMMUTABLE_RE failed to match .vrm / sky / vendor paths!");
  }
  if (swRe.test("/assets/models/manifest.json")) {
    throw new Error("sw.js IMMUTABLE_RE must exclude /assets/models/manifest.json!");
  }
  if (!swSrc.includes("resp.status === 200") || !swSrc.includes("ignoreSearch: true") || !swSrc.includes("status: 503")) {
    throw new Error("sw.js missing status===200 gate, ignoreSearch matching, or 503 offline fallback!");
  }
}

// v12.0 DUAL-THEME 3D SCENE SWITCHER + 29 BUGFIX REGRESSION PROOFS
{
  if (!fs.existsSync("assets/sky/sanctuary_celestial_day.jpg") || !fs.existsSync("assets/sky/sanctuary_dusk.jpg")) {
    throw new Error("v12.0 skybox assets missing on disk!");
  }
  const v12Res = vm.runInContext(`(() => {
    clearStepTimer();
    // 1. Silent hideRoleDealRitual never fires stale onRoleDealClosed callback (P0 1.1)
    let staleFired = false;
    indieFlow.showRoleDealRitual(function () { staleFired = true; });
    indieFlow.hideRoleDealRitual({ silent: true });
    const silentHideBlocksStaleOk = !staleFired && indieFlow.onRoleDealClosed === null;

    // 2. Setup Drawer Guard toggle preserves 12p seat count instead of downgrading to 8p (P1 1.6)
    el("selectModeCount").value = "12";
    state.guardMode = false;
    if (el("chkGuardMode")) el("chkGuardMode").checked = false;
    if (el("btnSetupGuardToggle")) el("btnSetupGuardToggle").click();
    const guardKeeps12pOk = state.guardMode === true && el("selectModeCount").value === "12";
    state.guardMode = false;
    if (el("chkGuardMode")) el("chkGuardMode").checked = false;
    el("selectModeCount").value = "8";

    // 3. Same-day vote-out of Sheriff who JUST declared badge flow today does NOT emit impossible night-check signal
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    const pid = getPlayerId();
    const shSeat = state.match.seats.find(s => s.id !== pid);
    const tgtSeat = state.match.seats.find(s => s.id !== pid && s.id !== shSeat.id);
    state.match.day = 1;
    state.match.sheriffElectionPending = false;
    state.match.sheriffSeatId = shSeat.id;
    shSeat.checkedHistory = [];
    setSheriffBadgeFlow(shSeat.id, tgtSeat.id, null, "election");
    const sigBefore = (state.match.badgeFlowSignals || []).length;
    recordAndBroadcastBadgeFlowSignal(shSeat, null);
    const noSameDayPhantomSignalOk = (state.match.badgeFlowSignals || []).length === sigBefore;

    // 4. Dual 3D Scene Theme live toggle + HUD/Title/Pause label sync + persistence
    stage3d.setSceneTheme("academy", { silent: true });
    const academyUiOk = state.sceneTheme === "academy"
      && el("hudSceneLabel").textContent === "書院"
      && el("titleSceneThemeLabel").textContent === "青嵐書院"
      && el("btnToggleSceneThemePause").textContent === "造景:青嵐書院";
    stage3d.toggleSceneTheme();
    const celestialUiOk = state.sceneTheme === "celestial"
      && el("hudSceneLabel").textContent === "仙境"
      && el("titleSceneThemeLabel").textContent === "絕雲仙境"
      && el("btnToggleSceneThemePause").textContent === "造景:絕雲仙境";
    stage3d.setSceneTheme("academy", { silent: true });

    // 5. Camera reset & setShowcaseMode(false) invariants (P1 3.1, 3.5)
    stage3d.closeUpSeatId = 3;
    const prevCam = stage3d.camera;
    const prevLook = stage3d.orbit.targetLookAt;
    if (!stage3d.camera) stage3d.camera = { fov: 44, updateProjectionMatrix: function () {} };
    if (!stage3d.orbit.targetLookAt) stage3d.orbit.targetLookAt = { set: function () {} };
    stage3d.resetCamera();
    const resetClearsCloseUpOk = stage3d.closeUpSeatId === null;
    stage3d.camera = prevCam;
    stage3d.orbit.targetLookAt = prevLook;

    stage3d.showcaseTarget = 4;
    stage3d.setShowcaseMode(false);
    const showcaseResetsTargetOk = stage3d.showcaseTarget === "hero";

    // 6. Modesty & Anti-Upskirt Guards: showcase/orbit pitch never goes below safe floor + safety-shorts painter available
    stage3d.showcaseMode = true;
    stage3d.orbit.dragging = true;
    stage3d.orbit.lastX = 100;
    stage3d.orbit.lastY = 500;
    stage3d.orbit.targetPitch = 0.18;
    stage3d.moveOrbit(100, -2500);
    const showcasePitchSafeOk = stage3d.orbit.targetPitch >= 0.06;
    stage3d.showcaseMode = false;
    stage3d.camPreset = "cinema";
    stage3d.orbit.lastY = 500;
    stage3d.orbit.targetPitch = 0.40;
    stage3d.moveOrbit(100, -2500);
    const orbitPitchSafeOk = stage3d.orbit.targetPitch >= 0.16;
    stage3d.orbit.dragging = false;
    const modestyPainterReadyOk = typeof stage3dVrm.paintVrmModestyShortsMap === "function";

    // 7. v12.2 Post-Audit Regression Proofs (P0/P1/P2)
    // 7a) Daytime auto-composed Badge Flow note NEVER poisons analyzeThreeGoodSpeech with fake gold/wolf checks
    const bfAnalysis = analyzeThreeGoodSpeech("我先觀察局勢，昨晚平安夜。 今晚警徽流改留先驗 03號暖暖、再驗 05號星兒（我若倒牌，徽給03號即金水、飛05號或撕徽即查殺）！");
    const bfNoFalseStanceOk = bfAnalysis.vouchTargets.length === 0 && bfAnalysis.accuseTargets.length === 0;

    // 7b) Non-Seer Sheriff quick card mentioning "若出現雙明心對跳" does NOT falsely claim Seer; pass does NOT out hiding Seer!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("run");
    const pidV = getPlayerId();
    const pV = getSeat(pidV);
    const ctxV = state.match.sheriffElectionCtx;
    ctxV.activeReelSeatId = pidV;
    const nonSeerOpts = buildPlayerSheriffQuickOptions(pV, null);
    const nonSeerCard2 = nonSeerOpts[1];
    submitPlayerSheriffSpeech(nonSeerCard2.text, nonSeerCard2.badgeFlow || null, { claimsSeer: nonSeerCard2.claimsSeer });
    const nonSeerCardNoFalseClaimOk = pV.claimedRole !== "seer" && nonSeerOpts[0].badgeFlow === null;

    // Hiding Player Seer fast-skipping ("pass") must NOT be outed
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("run");
    const pidSeerPass = getPlayerId();
    resolveSheriffElectionAction("pass");
    const passNoAutoOutSeerOk = getSeat(pidSeerPass).claimedRole !== "seer";

    // 7c) Same-day Sheriff transfer panel hides premature "報金水 / 疑為查殺" suffixes
    state.match.sheriffSeatId = pidSeerPass;
    const pS2 = getSeat(pidSeerPass);
    pS2.checkedHistory = [];
    const aliveO = state.match.seats.filter(s => s.id !== pidSeerPass && s.alive);
    setSheriffBadgeFlow(pidSeerPass, aliveO[0].id, aliveO[1].id, "election");
    state.match.phase = "SHERIFF_TRANSFER";
    renderSheriffTransferPanel();
    const sameDayTransferUiCleanOk = el("btnShatterSheriffBadge").textContent.indexOf("疑為查殺") === -1;

    // 7d) WebGL-failed device safely ignores setShowcaseMode(true) & resetCamera() without TypeError
    const prevFailed2 = stage3d.failed;
    const prevCam2 = stage3d.camera;
    const prevLook2 = stage3d.orbit.targetLookAt;
    stage3d.failed = true;
    stage3d.camera = null;
    stage3d.orbit.targetLookAt = null;
    stage3d.setShowcaseMode(true);
    stage3d.resetCamera();
    const webglFailSafeOk = stage3d.showcaseMode === false;
    stage3d.failed = prevFailed2;
    stage3d.camera = prevCam2;
    stage3d.orbit.targetLookAt = prevLook2;

    // 7e) Lobby Showcase exposes all 12 seats even when default lobby count is 8
    clearStepTimer();
    resetMatchToLobby();
    el("selectModeCount").value = "8";
    stage3d.showcaseMode = true;
    const lobbyShowcase12Ok = getStageSeatListFor3D().length === 12;
    stage3d.showcaseMode = false;

    // 7f) v12.3 syncPrefsToControls persists state.guardMode into #chkGuardMode
    state.guardMode = true;
    el("chkGuardMode").checked = false;
    syncPrefsToControls();
    const guardPrefSyncOk = el("chkGuardMode").checked === true;
    state.guardMode = false;
    syncPrefsToControls();

    clearStepTimer();
    resetMatchToLobby();
    return {
      silentHideBlocksStaleOk,
      guardKeeps12pOk,
      noSameDayPhantomSignalOk,
      academyUiOk,
      celestialUiOk,
      resetClearsCloseUpOk,
      showcaseResetsTargetOk,
      showcasePitchSafeOk,
      orbitPitchSafeOk,
      modestyPainterReadyOk,
      bfNoFalseStanceOk,
      nonSeerCardNoFalseClaimOk,
      passNoAutoOutSeerOk,
      sameDayTransferUiCleanOk,
      webglFailSafeOk,
      lobbyShowcase12Ok,
      guardPrefSyncOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v12Res)) {
    if (!v) {
      throw new Error("v12.0 DUAL-SCENE & BUGFIX REGRESSION check failed for " + k + ": " + JSON.stringify(v12Res));
    }
  }

  // v12.3 Multi-Device RWD, Stacking & Contrast Static Guardrails
  const twLocal = fs.readFileSync("css/tailwind-local.css", "utf8");
  const v123Static = {
    twHasColSpan2: twLocal.includes(".col-span-2{grid-column:span 2 / span 2}"),
    twHasSmInlineFlex: twLocal.includes(".sm\\:inline-flex{display:inline-flex}"),
    twHasBgAmber500: twLocal.includes(".bg-amber-500{"),
    twHasMaxH128: twLocal.includes(".max-h-\\[128px\\]{max-height:128px}"),
    roleGuideOutsideDeck: html.indexOf('id="roleGuidePopover"') > html.indexOf('</main>'),
    showcaseFullDvhRule: compCss.includes("body.craft-ui.hero-showcase-active #canvasStageWrap"),
    toastAboveModals: compCss.includes("#toastContainer {\r\n  z-index: 80;") || compCss.includes("#toastContainer {\n  z-index: 80;"),
    fourGNotClipped: !compCss.includes("overflow-x: auto;\r\n    padding-bottom: 2px;") && !compCss.includes("overflow-x: auto;\n    padding-bottom: 2px;"),
    setupSheetScoped: !compCss.includes("#setupDrawer,\r\n  #journalDrawer") && !compCss.includes("#setupDrawer,\n  #journalDrawer"),
    dayBadgeSpeakContrast: themeCss.includes("body.craft-ui.theme-day #seatButtonStrip .seat-pill-badge.badge-speak")
  };
  for (const [k, v] of Object.entries(v123Static)) {
    if (!v) {
      throw new Error("v12.3 MULTI-DEVICE RWD GUARDRAIL failed for " + k + ": " + JSON.stringify(v123Static));
    }
  }
}

// v13.0 REALISTIC VOICE ENGINE OVERHAUL: Multi-Clause Prosody Arc, MP3 Silence Trim, Wooden Pavilion Acoustics, Formant EQ, Gemini 3.8 Vocal Tags & Seat Backchannels
{
  const v13Res = vm.runInContext(`(() => {
    // 1. 3-beat human prosody arc (open -> climax/question -> close)
    const arc = voice.splitExpressiveSpeechArc("我先把前面幾位的時間線對了一遍，可是 6號 那段說詞前後兜不攏吧？這輪我先把票投給 6號，過。", "accuse");
    const arcOk = Array.isArray(arc) && arc.length >= 2 && arc[0].role === "open" && arc[arc.length - 1].role === "close" && arc[0].rateNudge < 1.0 && arc[arc.length - 1].rateNudge < 1.0;

    // 2. MP3 leading/trailing dead-silence trimmer with click-free cosine fade
    let silenceTrimOk = false;
    const prevCtx = sound.ctx;
    sound.ctx = {
      sampleRate: 24000,
      createBuffer(nCh, len, sr) {
        const arr = new Float32Array(len);
        return { numberOfChannels: nCh, length: len, sampleRate: sr, duration: len / sr, getChannelData: () => arr };
      }
    };
    try {
      const rawLen = 24000; // 1.0s
      const mockBuf = sound.ctx.createBuffer(1, rawLen, 24000);
      const d = mockBuf.getChannelData(0);
      // 120ms leading silence + 600ms speech + 280ms trailing silence
      for (let i = Math.floor(24000 * 0.12); i < Math.floor(24000 * 0.72); i++) {
        d[i] = Math.sin(i * 0.12) * 0.35;
      }
      const trimmed = voice.trimAudioBufferSilence(mockBuf);
      silenceTrimOk = Boolean(trimmed && trimmed.length < rawLen * 0.72 && trimmed.length > rawLen * 0.58 && Math.abs(trimmed.getChannelData(0)[0]) < 0.001);
    } finally {
      sound.ctx = prevCtx;
    }

    // 3. Official Gemini 3.8 TTS inline vocal burst tags (<breath>, <sigh>, <chuckle>, <gasp>, <short pause>)
    const tagPanic = voice.injectGeminiVocalTags("等一下，我真的是清白好人，這輪請聽我解釋！", "小澄", "panic");
    const tagWarm = voice.injectGeminiVocalTags("先喝口熱茶放輕鬆，這輪我們溫柔找線索吧！", "暖暖", "happy");
    const tagLast = voice.injectGeminiVocalTags("可惜被誤投了，請諸君回頭檢視票型。", "墨白", "last_words");
    const geminiTagsOk = tagPanic.includes("<breath>") && tagPanic.includes("<short pause>") && tagWarm.includes("<chuckle>") && tagLast.includes("<sigh>");

    // 4. Formant EQ & Wooden Pavilion Acoustic methods + 11-persona backchannel bank
    const eqInk = PERSONA_AUDIO_EQ["墨白"];
    const eqCheng = PERSONA_AUDIO_EQ["小澄"];
    const formantDistinctOk = Boolean(eqInk && eqCheng && eqInk.twDetuneCents < -50 && eqCheng.twDetuneCents > 30 && eqInk.midFreq < eqCheng.midFreq);
    const acousticMethodsOk = typeof sound.buildWoodenPavilionImpulse === "function" && typeof sound.playPreSpeechBreath === "function" && typeof sound.playBackchannelBuffer === "function" && typeof voice.triggerSeatBackchannel === "function";
    const backchannelBankOk = ["小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨", "墨白", "晴嵐", "阿朗", "柚子"].every(n => Boolean(PERSONA_BACKCHANNEL_CLIPS[n] && PERSONA_BACKCHANNEL_CLIPS[n].accuse && PERSONA_BACKCHANNEL_CLIPS[n].clash));

    // 5. Mixer UI buttons & preference persistence
    el("btnEngineGemini").click();
    const engGemOk = voice.enginePref === "gemini" && el("btnEngineGemini").classList.contains("is-active");
    el("btnEngineAuto").click();
    const engAutoOk = voice.enginePref === "auto" && el("btnEngineAuto").classList.contains("is-active");
    const prevBc = voice.liveBackchannel;
    el("btnToggleLiveBackchannel").click();
    const bcToggleOk = voice.liveBackchannel === !prevBc;
    el("btnToggleLiveBackchannel").click();

    // 6. v13.1 Bundled Qingming Host Voice Pack + Natural Taiwanese Colloquial Rewrite (zero cartoon announcer slogans)
    const hostPackEntries = Object.entries(HOST_VOICE_PACK_MAP || {});
    const hostPackCountOk = hostPackEntries.length >= 25 && typeof voice.playBundledHostClip === "function";
    const flavorsStr = JSON.stringify(PERSONA_FLAVORS);
    const noCartoonSlogansOk = !/叮咚烤箱計時器大響|事實查核報告出爐|正方一辯登場|絕殺灌籃來啦|超級緊急星象公告/.test(flavorsStr);

    return {
      arcOk,
      silenceTrimOk,
      geminiTagsOk,
      formantDistinctOk,
      acousticMethodsOk,
      backchannelBankOk,
      engGemOk,
      engAutoOk,
      bcToggleOk,
      hostPackCountOk,
      noCartoonSlogansOk,
      hostPackFiles: hostPackEntries.map(e => e[1])
    };
  })()`, ctx);

  for (const relMp3 of (v13Res.hostPackFiles || [])) {
    const fullMp3 = path.join(ROOT, relMp3);
    if (!fs.existsSync(fullMp3) || fs.statSync(fullMp3).size < 512) {
      throw new Error("v13.1 Missing or invalid bundled host voice pack file: " + relMp3);
    }
  }
  delete v13Res.hostPackFiles;
  for (const [k, v] of Object.entries(v13Res)) {
    if (!v) {
      throw new Error("v13.1 REALISTIC VOICE ENGINE check failed for " + k + ": " + JSON.stringify(v13Res));
    }
  }

  // ===== v13.2 LIVE QA BUGFIX & VISUAL/VOICE POLISH REGRESSION SUITE =====
  const v132Res = vm.runInContext(`(() => {
    // 1. Night phase hides btnStepNext (zero stray "進入公投" button during Night!)
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    state.match.phase = "NIGHT_WOLF";
    renderControlPanels();
    const nightHidesStepNextOk = el("btnStepNext").classList.contains("hidden");

    // 2. Dynamic lobby seat summary reflects 12-seat selection + shortcut tooltip uses 0/-/= for seats 10/11/12
    const lobby12Ok = el("lobbySeatSummary").textContent.includes("十二位書院夥伴");
    const stripBtns = el("seatButtonStrip").children || [];
    const btn10 = stripBtns[9], btn11 = stripBtns[10], btn12 = stripBtns[11];
    const shortcutTooltipOk = Boolean(
      btn10 && btn10.title.includes("快捷鍵 0") &&
      btn11 && btn11.title.includes("快捷鍵 -") &&
      btn12 && btn12.title.includes("快捷鍵 =")
    );

    // 3. Pausing voice during Night NEVER clears Night AI stepTimer
    state.stepTimer = 777;
    voice.speaking = true;
    voice.paused = false;
    voice.togglePause();
    const nightPauseKeepsTimerOk = state.stepTimer === 777;
    voice.togglePause();
    voice.stop();
    state.stepTimer = null;

    // 4. Day-1 first speaker with sheriffVoteRecord NEVER says "昨天" or "昨輪"
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    state.match.sheriffElectionPending = false;
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];
    const s2 = getSeat(2), s3 = getSeat(3), s4 = getSeat(4);
    state.match.sheriffVoteRecord = {
      day: 1, kind: "sheriff", candidateIds: [3, 4], withdrawnIds: [], seerClaimIds: [], winnerId: 3,
      ballots: [{ voterId: 2, targetId: 3, weight: 1 }], tallies: { 3: 1, 4: 0 }
    };
    const d1Sp = buildHeuristicAiSpeech(s4);
    const day1NoYesterdayOk = Boolean(d1Sp && d1Sp.text && !/昨天|昨輪/.test(d1Sp.text));

    // 5. Dead UNCLAIMED Seer never leaks hidden Seer role via badge flow signal
    const realSeer = state.match.seats.find(s => s.role === "seer");
    const otherSeat = state.match.seats.find(s => s.id !== realSeer.id);
    state.match.day = 2;
    realSeer.claimedRole = null;
    realSeer.checkedHistory = [{ day: 1, targetId: otherSeat.id, isWolf: false }];
    setSheriffBadgeFlow(realSeer.id, otherSeat.id, null, "election");
    const sigCountBefore = (state.match.badgeFlowSignals || []).length;
    recordAndBroadcastBadgeFlowSignal(realSeer, otherSeat);
    const unclaimedSeerNoLeakOk = (state.match.badgeFlowSignals || []).length === sigCountBefore;

    // 6. Night-1 Pro wolf targeting ignores pending phantom sheriffSeatId
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    const goodT = state.match.seats.filter(s => s.role !== "wolf");
    state.match.sheriffSeatId = goodT[0].id;
    state.aiDifficulty = "pro";
    const pickAtHighRng = chooseAiWolfTarget(goodT, { rngVal: 0.72 });
    const night1NoPhantomSheriffOk = Boolean(pickAtHighRng && pickAtHighRng.id !== goodT[0].id);

    // 7. formatMandarinText matches HOST_VOICE_PACK_MAP for PK & colon host prompts
    const pkHit = Boolean(HOST_VOICE_PACK_MAP[voice.formatMandarinText("平票 PK 拉票結束，依凹嗚規則由非平票玩家進行決選投票！")]);
    const colonHit = Boolean(voice.lookupBundledVoicePackUrl("主持", voice.formatMandarinText("請警長指定今日發言順序：順時針或逆時針！")));
    const hostPackFormatOk = pkHit && colonHit;

    // 8. Non-Taiwan voice casting sanity: 柚子 not using regional Dongbei accent, 阿松 distinct animeRateMul
    const personaEqDistinctOk = Boolean(PERSONA_AUDIO_EQ["阿松"].animeRateMul < 0.96 && PERSONA_AUDIO_EQ["小澄"].animeRateMul > 1.02);

    // 9. v13.3 Beta 2.0 Live QA final fixes: live pill sync on async TTS + Day 1 quick card wording
    state.match.phase = "DAY_SPEECH";
    state.typewriter.active = false;
    voice.setVisualSpeaking(true);
    const livePillOnOk = el("speakerLiveStatePill").textContent === "語音中";
    voice.setVisualSpeaking(false);
    const livePillOffOk = el("speakerLiveStatePill").textContent === "已講畢";
    state.match.day = 1;
    state.match.phase = "DAY_PLAYER_TURN";
    state.match.daySpeechEvents = [];
    preparePlayerSpeechPanel();
    const chipNodes = (el("quickSpeechChips") && el("quickSpeechChips").children) || [];
    const day1CardNoPrevRoundOk = chipNodes.length > 0 && chipNodes.every(c => !String(c.innerHTML || c.textContent || "").includes("前面幾輪"));

    // 10. v13.4 Windows WebGL / ANGLE / SwiftShader perf hardening checks
    const pSoft = stage3d.detectGpuProfile(null, "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))");
    const pRtx5080 = stage3d.detectGpuProfile(null, "ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)");
    const pIntel = stage3d.detectGpuProfile(null, "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0)");
    const gpuDetectSwiftShaderOk = Boolean(pSoft.isSoftwareRenderer && pSoft.isIntegratedGpu);
    const gpuDetectRtx5080AngleOk = Boolean(!pRtx5080.isSoftwareRenderer && !pRtx5080.isIntegratedGpu && pRtx5080.isWindowsAngle && pRtx5080.shortLabel === "RTX 5080");
    const gpuDetectIntelIgpuOk = Boolean(!pIntel.isSoftwareRenderer && pIntel.isIntegratedGpu && pIntel.isWindowsAngle);
    const overlayDprCapOk = typeof stage3d.getOverlayDpr === "function" && stage3d.getOverlayDpr() <= 1.5;

    // 11. v13.5 Vercel /api/gemini cloud proxy frontend state & priority checks
    const prevKey135 = state.geminiApiKey;
    const prevLoc135 = state.localLlmModel;
    state.geminiApiKey = "";
    state.localLlmModel = "";
    state.serverGeminiAvailable = true;
    state.serverGeminiOptOut = false;
    state.serverGeminiCooldownUntil = 0;
    state.serverGeminiModel = "gemini-3.5-flash-lite";
    const cloudProxyOnOk = isServerGeminiProxyActive() && isExternalLlmActive() && getActiveLlmLabel() === "雲端 3.5 Lite" && normalizeCloudGeminiModel("gemini-2.5-flash") === "gemini-3.5-flash-lite";
    state.serverGeminiCooldownUntil = Date.now() + 60000;
    const cloudProxyCooldownOk = !isServerGeminiProxyActive() && !isExternalLlmActive() && getActiveLlmLabel() === "離線規則";
    state.serverGeminiCooldownUntil = 0;
    state.serverGeminiOptOut = true;
    const cloudProxyOptOutOk = !isServerGeminiProxyActive();
    state.serverGeminiOptOut = false;
    state.serverGeminiAvailable = false;
    state.geminiApiKey = prevKey135;
    state.localLlmModel = prevLoc135;

    // 12. v13.6 Gemini truncated JSON salvage, exact persona pill match, long TTS clause split, & prefetch non-mutation
    const truncParsed = parseGeminiStructuredSpeech('{"text":"欸等一下，3號剛才講的話超怪，我先點3號！","accuseId":3');
    const brokenJsonNull = parseGeminiStructuredSpeech('{"accuseId": 3, "wolfPits": [3');
    const jsonSalvageOk = Boolean(truncParsed && truncParsed.parsedJson && truncParsed.text.includes("3號剛才") && !truncParsed.text.includes("{") && brokenJsonNull === null);
    renderInteractiveSpotlightText("我覺得3號剛才講了5號阿松很怪", state.match.seats[0], false);
    const spotHtml136 = String((el("spotlightText") && el("spotlightText").innerHTML) || "");
    const seatPillExactOk = spotHtml136.includes(">3號</span>剛才") && spotHtml136.includes(">5號阿松</span>");
    const longUnpunct = "這是一段故意完全沒有標點符號用來測試瀏覽器語音長句子會不會在十四秒被卡斷的超長繁體中文狼人殺推理測試發言內容確認每個切片都不超過二十二個字元而且一個字都不會漏掉";
    const split136 = voice.splitMandarinClauses(longUnpunct);
    const longTtsClauseOk = split136.length >= 4 && split136.every(c => c.length <= 22) && split136.join("") === longUnpunct;
    const spPrefTest = state.match.seats.find(s => s.role === "villager" && s.id !== getPlayerId() && s.id !== 3 && s.id !== 8) || state.match.seats.find(s => s.id !== getPlayerId() && s.id !== 3 && s.id !== 8) || state.match.seats[1];
    const nonSeerOther = state.match.seats.find(s => s.id !== spPrefTest.id && s.claimedRole !== "seer") || state.match.seats[3];
    const origClaimPref = spPrefTest.claimedRole;
    spPrefTest.claimedRole = null;
    const prefSynced = syncGeminiSpeechMeta(spPrefTest, { text: "fallback", claimSeer: true, claimRole: "seer" }, { parsedJson: true, text: "信 03號 狼坑是01跟04，今晚必驗03", claimRole: "seer", standWithSeerId: spPrefTest.id, accuseId: null, vouchId: null }, { deferSeatMutation: true });
    const prefetchNoMutateOk = spPrefTest.claimedRole === null && prefSynced.standWithSeerId === null && prefSynced.text.includes("1號跟4號") && prefSynced.text.includes("必驗3號");
    // v13.8 Guardrail checks: unauthorized role claim, non-seer standWith, checking rival Seer, hallucinated votes, wolf self-outing, & unspoken fabrication
    const unauthSynced = syncGeminiSpeechMeta(spPrefTest, { text: "fallback" }, { parsedJson: true, text: "大家好", claimRole: "seer", standWithSeerId: nonSeerOther.id, accuseId: null, vouchId: null }, { deferSeatMutation: true });
    const blockUnauthClaimMetaOk = unauthSynced.claimRole === null && !unauthSynced.claimSeer && unauthSynced.standWithSeerId === null;
    const blockUnauthTextOk = !validateGeminiSpeechReality(spPrefTest, { text: "fallback" }, { text: "其實我是明心觀察員，我昨晚驗了3號是好人！" }, { seats: [], voteHistory: [] }).ok;
    const blockRivalCheckOk = !validateGeminiSpeechReality(spPrefTest, { text: "fallback", claimSeer: true, claimRole: "seer" }, { text: "今晚我必驗3號確認身份" }, { seats: [{ id: 3, alive: true, claimedRole: "seer" }], voteHistory: [{ day: 1 }] }).ok;
    const blockFakeVoteOk = !validateGeminiSpeechReality(spPrefTest, { text: "fallback" }, { text: "剛剛4號衝票太明顯了" }, { seats: [], voteHistory: [], sheriffVoteRecord: null }).ok;
    const blockWolfSelfOutOk = !validateGeminiSpeechReality({ id: 2, role: "wolf", claimedRole: null }, { text: "fallback" }, { text: "其實我是酸民狼，我的狼同伴是4號" }, { seats: [], voteHistory: [{ day: 1 }] }).ok;
    const blockUnspokenFabOk = !validateGeminiSpeechReality(spPrefTest, { text: "fallback" }, { text: "剛才8號講得超怪，我覺得他很可疑" }, { day: 1, seats: [{ id: 8, alive: true }], publicLogs: [], voteHistory: [{ day: 1 }] }).ok;
    const ttsZeroPadOk = voice.formatMandarinText("今晚必驗03，狼坑01跟04。") === "今晚必驗3號，狼坑1號跟4號。";
    // v13.9 Universal seat number normalization & detection (bare digits, zero-padded, Chinese numerals, false-positive guard, spotlight pills, NLP, badge flow)
    const shotLine = "站06狼坑在03跟05，站03狼坑就是06跟衝票的01。雖然我警下投給06，但 5 直接硬打01破綻很大耶，我這輪傾向站03回頭抓06";
    const normShot = normalizeSeatRefsInText(shotLine, 12);
    const normShotOk = normShot.includes("站6號狼坑在3號跟5號") && normShot.includes("就是6號跟衝票的1號") && normShot.includes("投給6號") && normShot.includes("5號 直接硬打1號") && normShot.includes("站3號回頭抓6號");
    const normCnOk = normalizeSeatRefsInText("三號跟十一號很可疑，我這輪傾向站三回頭抓六，今晚先驗四再驗十", 12) === "3號跟11號很可疑，我這輪傾向站3號回頭抓6號，今晚先驗4號再驗10號";
    const normBareOk = normalizeSeatRefsInText("3跟5很怪，我投6，昨晚驗了4，保2好人", 12) === "3號跟5號很怪，我投6號，昨晚驗了4號，保2號好人";
    const normSafeStr = "第1天我講兩句，站一邊投一票打一下，還有1.5票跟3好精神與4G及100%";
    const normFalsePosSafeOk = normalizeSeatRefsInText(normSafeStr, 12) === normSafeStr;
    renderInteractiveSpotlightText(shotLine, state.match.seats[0], false);
    const spotHtml139 = String((el("spotlightText") && el("spotlightText").innerHTML) || "");
    const spotAllPills139Ok = spotHtml139.includes('data-seat-id="6"') && spotHtml139.includes('>6號</span>') && spotHtml139.includes('data-seat-id="3"') && spotHtml139.includes('>3號</span>') && spotHtml139.includes('data-seat-id="5"') && spotHtml139.includes('>5號</span>') && spotHtml139.includes('data-seat-id="1"') && spotHtml139.includes('>1號</span>') && !spotHtml139.includes("站06") && !spotHtml139.includes("打01");
    const prevTotal139 = state.match.totalSeats;
    const prevPid139 = state.match.playerSeatId;
    state.match.totalSeats = 12;
    state.match.playerSeatId = 1;
    const nlpCnBare = analyzeThreeGoodSpeech("我覺得三號跟五很可疑，這輪投六，但十一號像好人");
    const nlpCnBareOk = nlpCnBare.seatMentions.includes(3) && nlpCnBare.seatMentions.includes(5) && nlpCnBare.seatMentions.includes(6) && nlpCnBare.seatMentions.includes(11) && nlpCnBare.accuseTargets.includes(3) && nlpCnBare.accuseTargets.includes(6) && nlpCnBare.vouchTargets.includes(11);
    const v14PosNlp = analyzeThreeGoodSpeech("2號講得不錯，這輪懷疑4號");
    const v14PosNlpOk = v14PosNlp.vouchTargets.includes(2) && v14PosNlp.accuseTargets.includes(4);
    state.match.totalSeats = prevTotal139;
    state.match.playerSeatId = prevPid139;
    const bfCnBare = parseBadgeFlowFromText("今晚先驗三號再驗五", 1);
    const bfCnBareOk = Boolean(bfCnBare && bfCnBare.firstTargetId === 3 && bfCnBare.secondTargetId === 5);
    // v14.0 Major Release regressions: zero-overlap audio, multi-digit/4G guardrails, smart parens, dry-run prefetch, proven-Elder vote guard, Sheriff transfer spectator lock, 3Good/4G prompt
    const v14AudioStopOk = typeof sound.stopBackchannels === "function" && typeof bumpTableStateRev === "function";
    const v14MultiDigitGuardOk = validateGeminiSpeechReality(spPrefTest, { text: "fallback" }, { text: "聽完11號剛才的發言，我覺得他很有道理，剛才6號笑僵了，這輪大家別分票。" }, { day: 1, seats: [{ id: 1, alive: true }, { id: 6, alive: true }, { id: 11, alive: true }], publicLogs: [{ day: 1, kind: "speech", speakerId: 11 }], voteHistory: [], sheriffVoteRecord: null }).ok;
    const v14SmartParenOut = normalizeGeminiSpeechText("（冷笑）我昨晚查過3號（酸民狼），建議今天先投3號！");
    const v14SmartParenOk = !v14SmartParenOut.includes("冷笑") && v14SmartParenOut.includes("（酸民狼）");
    const v14StaleClear = syncGeminiSpeechMeta(spPrefTest, { text: "fb", accuseId: 4, vouchId: 4, standWithSeerId: 3 }, { parsedJson: true, text: "先聽後面表水再說。", accuseId: null, vouchId: null, standWithSeerId: null, claimRole: null }, { deferSeatMutation: true });
    const v14StaleClearOk = v14StaleClear.accuseId === null && v14StaleClear.vouchId === null && v14StaleClear.standWithSeerId === null;
    const v14PrevPhase = state.match.phase;
    const v14PlayerAlive = getPlayerSeat().alive;
    getPlayerSeat().alive = false;
    state.match.phase = "SHERIFF_TRANSFER";
    const v14SpectatorTransferLockOk = isSpectatorGuessActive() === false;
    state.match.phase = v14PrevPhase;
    getPlayerSeat().alive = v14PlayerAlive;
    const v14PromptBuilt = buildBlindGeminiSpeechPrompt(spPrefTest, { text: "先聽發言" });
    const v14ThreeGoodPromptOk = Boolean(v14PromptBuilt && v14PromptBuilt.audit && v14PromptBuilt.audit.ok && v14PromptBuilt.prompt.includes("【茶席三好與四給公開局勢】"));
    // v14.1 Returning-user voiceLiveBackchannel pref migration check (pre-v14 legacy localStorage must NOT re-enable overlapping backchannel!)
    const prevPrefsRaw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    voice.liveBackchannel = false;
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ voiceLiveBackchannel: true }));
    loadUserPrefs();
    const v141LegacyBackchannelIgnoredOk = voice.liveBackchannel === false;
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ voiceLiveBackchannel: true, voicePrefVersion: 2 }));
    loadUserPrefs();
    const v141OptInBackchannelHonoredOk = voice.liveBackchannel === true;
    voice.liveBackchannel = false;
    if (prevPrefsRaw !== null) window.localStorage.setItem(PREFS_STORAGE_KEY, prevPrefsRaw);
    else window.localStorage.removeItem(PREFS_STORAGE_KEY);
    spPrefTest.claimedRole = origClaimPref;

    return {
      nightHidesStepNextOk,
      lobby12Ok,
      shortcutTooltipOk,
      nightPauseKeepsTimerOk,
      day1NoYesterdayOk,
      unclaimedSeerNoLeakOk,
      night1NoPhantomSheriffOk,
      hostPackFormatOk,
      personaEqDistinctOk,
      livePillOnOk,
      livePillOffOk,
      day1CardNoPrevRoundOk,
      gpuDetectSwiftShaderOk,
      gpuDetectRtx5080AngleOk,
      gpuDetectIntelIgpuOk,
      overlayDprCapOk,
      cloudProxyOnOk,
      cloudProxyCooldownOk,
      cloudProxyOptOutOk,
      jsonSalvageOk,
      seatPillExactOk,
      longTtsClauseOk,
      prefetchNoMutateOk,
      blockUnauthClaimMetaOk,
      blockUnauthTextOk,
      blockRivalCheckOk,
      blockFakeVoteOk,
      blockWolfSelfOutOk,
      blockUnspokenFabOk,
      ttsZeroPadOk,
      normShotOk,
      normCnOk,
      normBareOk,
      normFalsePosSafeOk,
      spotAllPills139Ok,
      nlpCnBareOk,
      bfCnBareOk,
      v14AudioStopOk,
      v14MultiDigitGuardOk,
      v14SmartParenOk,
      v14StaleClearOk,
      v14PosNlpOk,
      v14SpectatorTransferLockOk,
      v14ThreeGoodPromptOk,
      v141LegacyBackchannelIgnoredOk,
      v141OptInBackchannelHonoredOk
    };
  })()`, ctx);
  for (const [k, v] of Object.entries(v132Res)) {
    if (!v) {
      throw new Error("v13.2 QA BUGFIX check failed for " + k + ": " + JSON.stringify(v132Res));
    }
  }
  const themeCssRaw = fs.readFileSync(path.join(ROOT, "css/theme.css"), "utf8");
  const compCssRaw = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  if (/backdrop-filter\s*:\s*blur\(/i.test(themeCssRaw) || /backdrop-filter\s*:\s*blur\(/i.test(compCssRaw)) {
    throw new Error("Windows WebGL perf guard failed: backdrop-filter: blur(...) found in css/theme.css or css/components.css!");
  }
  // Verify Vercel api/gemini.js security guardrails (origin check, Flash-only model cap, rate limiter, GET status, 403/503)
  const apiGeminiSrc = fs.readFileSync(path.join(ROOT, "api/gemini.js"), "utf8");
  if (apiGeminiSrc.includes("?key=")) {
    throw new Error("api/gemini.js must pass API key via x-goog-api-key header, never ?key=");
  }
  const apiGeminiHandler = (await import("../api/gemini.js")).default;
  if (apiGeminiHandler._resolveSafeModel("gemini-4-argon") !== "gemini-3.5-flash-lite") {
    throw new Error("api/gemini.js must cap unapproved models to default public model (gemini-3.5-flash-lite)");
  }
  if (apiGeminiHandler._resolveSafeModel("gemini-2.5-pro") !== "gemini-3.8-flash") {
    throw new Error("api/gemini.js must auto-upgrade legacy gemini-2.5-pro to gemini-3.8-flash");
  }
  if (apiGeminiHandler._resolveSafeModel("gemini-2.5-pro", "lite") !== "gemini-3.8-flash") {
    throw new Error("api/gemini.js must not silently downgrade explicit 2.5-pro->3.8-flash requests on lite hint");
  }
  if (apiGeminiHandler._resolveSafeModel("gemini-3.5-flash-lite", "lite") !== "gemini-3.5-flash-lite") {
    throw new Error("api/gemini.js must route lite tier hint to gemini-3.5-flash-lite");
  }
  const g35Cfg = apiGeminiHandler._buildGenerationConfig("gemini-3.5-flash-lite", true, 0.72);
  if ("temperature" in g35Cfg || !g35Cfg.thinkingConfig || g35Cfg.thinkingConfig.thinkingLevel !== "minimal") {
    throw new Error("api/gemini.js must omit temperature and set minimal thinkingLevel for gemini-3.5-flash-lite");
  }
  const g38Cfg = apiGeminiHandler._buildGenerationConfig("gemini-3.8-flash", true, 0.65);
  if ("temperature" in g38Cfg || !g38Cfg.thinkingConfig || g38Cfg.thinkingConfig.thinkingLevel !== "low" || apiGeminiHandler._resolvePrimaryTimeoutMs("gemini-3.8-flash") < 8000) {
    throw new Error("api/gemini.js must set thinkingLevel=low on gemini-3.8-flash and allow extended timeout");
  }
  apiGeminiHandler._resetRateLimit();
  apiGeminiHandler._markBadModel("gemini-2.5-flash-lite", 2000000);
  if (apiGeminiHandler._resolveSafeModel("gemini-2.5-flash-lite", "lite", 2000500) !== "gemini-3.5-flash-lite") {
    throw new Error("api/gemini.js bad-model circuit breaker failed to skip cooling-down model");
  }
  apiGeminiHandler._resetRateLimit();
  // Verify Campus NAT Dual-Track Session Rate Limiter: 3 judges behind SAME IP each get 24 RPM without blocking each other!
  for (let judgeIdx = 1; judgeIdx <= 3; judgeIdx++) {
    const sid = "tea_judge_session_0" + judgeIdx;
    for (let k = 0; k < 20; k++) {
      const rNat = apiGeminiHandler._checkRateLimit("198.51.100.7", 3000000 + judgeIdx * 1000 + k * 10, sid);
      if (!rNat.allowed) {
        throw new Error("api/gemini.js campus NAT multi-judge session blocked prematurely: " + JSON.stringify({ judgeIdx, k, rNat }));
      }
    }
  }
  apiGeminiHandler._resetRateLimit();
  if (apiGeminiHandler._isAllowedOrigin({ headers: { host: "sanhao.vercel.app", origin: "https://evil.example" } })) {
    throw new Error("api/gemini.js must reject cross-origin requests");
  }
  if (!apiGeminiHandler._isAllowedOrigin({ headers: { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app" } })) {
    throw new Error("api/gemini.js must allow same-host origin");
  }
  apiGeminiHandler._resetRateLimit();
  let rlTriggered = false;
  for (let ri = 0; ri < 250; ri++) {
    const r = apiGeminiHandler._checkRateLimit("203.0.113.9", 1000000 + ri * 100);
    if (!r.allowed) { rlTriggered = true; break; }
  }
  apiGeminiHandler._resetRateLimit();
  if (!rlTriggered) {
    throw new Error("api/gemini.js per-IP rate limiter failed to trigger");
  }
  const mockRunProxy = async (method, headers, body) => {
    let outStatus = 0;
    let outBody = "";
    const mockRes = {
      statusCode: 200,
      setHeader() { },
      end(chunk) { outStatus = this.statusCode; outBody = String(chunk || ""); }
    };
    await apiGeminiHandler({ method, headers: headers || {}, body, socket: { remoteAddress: "127.0.0.1" } }, mockRes);
    return { status: outStatus, json: JSON.parse(outBody || "{}") };
  };
  const savedGemEnv = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const gProbe = await mockRunProxy("GET", { host: "sanhao.vercel.app" });
  const pCross = await mockRunProxy("POST", { host: "sanhao.vercel.app", origin: "https://evil.example" }, { prompt: "hi" });
  const pNoKey = await mockRunProxy("POST", { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app" }, { prompt: "hi" });
  if (savedGemEnv !== undefined) process.env.GEMINI_API_KEY = savedGemEnv;
  if (gProbe.status !== 200 || gProbe.json.available !== false || pCross.status !== 403 || pNoKey.status !== 503) {
    throw new Error("api/gemini.js handler status check failed: " + JSON.stringify({ gProbe, pCross, pNoKey }));
  }

  // v14.2 Judge Showcase + Zero-Leak Vote-Speech Correlation Matrix + Anti-Hypocrisy + CI checks
  if (!fs.existsSync(path.join(ROOT, ".github/workflows/ci.yml"))) {
    throw new Error("v14.2 CI workflow .github/workflows/ci.yml missing!");
  }
  const v142Res = vm.runInContext(`(() => {
    clearStepTimer();
    startJudgeShowcaseMatch();
    const judgeOk = Boolean(state.match && state.match.started && state.match.judgeShowcase && state.match.day === 2 && state.match.seats.length === 8 && state.match.sheriffSeatId === 1 && state.match.speechQueue.join(",") === "4,1");
    // Verify Zero-Leak Vote-Speech Correlation Matrix catches Seat 7's Day-1 speech-vs-vote divergence (accused 5, voted 6) under strict Proxy trap!
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;
    const seat2 = getSeat(2);
    const snap2 = createBlindMatchSnapshot(seat2, { module: "smoke_v142_matrix" });
    const vm2 = buildVoteSpeechMatrix(seat2, snap2);
    const promptBuilt = buildBlindGeminiSpeechPrompt(seat2, { text: "對照第1天票型，7號言票背離。", accuseId: 4, vouchId: 1 });
    antiCheatMonitor.strictThrow = prevStrict;
    const matrixDetectsDivOk = Boolean(vm2 && vm2.divergenceBySeat && vm2.divergenceBySeat[7] === 1 && vm2.divergenceBySeat[4] === 1 && vm2.summaryLines.some(l => l.includes("4號") && l.includes("言票背離")));
    const promptIncludesMatrixOk = Boolean(promptBuilt && promptBuilt.audit && promptBuilt.audit.ok && promptBuilt.prompt.includes("跨輪言票一致性與同票關聯矩陣") && promptBuilt.prompt.includes("言票背離"));
    const postInsights = buildAiPostMatchCoachInsights();
    const radarOk = Array.isArray(postInsights) && postInsights.length >= 3;
    clearStepTimer();
    resetMatchToLobby();
    return { judgeOk, matrixDetectsDivOk, promptIncludesMatrixOk, radarOk };
  })()`, ctx);
  for (const [k, v] of Object.entries(v142Res)) {
    if (!v) {
      throw new Error("v14.2 UPGRADE check failed for " + k + ": " + JSON.stringify(v142Res));
    }
  }

  // v15.0 DE-AI TEA-ACADEMY EXPERIENCE VERIFICATION:
  // 1. De-AI visible HTML copy & zero-emoji check
  const v15VisibleHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  if (
    v15VisibleHtml.includes("AI 轉好話") ||
    v15VisibleHtml.includes("好話暴擊") ||
    v15VisibleHtml.includes("×1.5") ||
    v15VisibleHtml.includes("局勢矩陣")
  ) {
    throw new Error("v15.0 DE-AI: ai.html still contains arcade/AI tool wording (AI 轉好話 / 好話暴擊 / ×1.5 / 局勢矩陣)!");
  }
  for (const mustHave of ["茶席言行錄", "潤飾詞句", "舉杯追問", "燭下覆茶", "四給奉茶"]) {
    if (!v15VisibleHtml.includes(mustHave)) {
      throw new Error("v15.0 DE-AI: ai.html missing expected diegetic element text: " + mustHave);
    }
  }

  // 2. Runtime verification: 3-option rephrase slips, 3-tier dynamic length, Scheme A literary tone,
  //    Verbatim Anchor, live Nod/Frown + Tea-Cup Interjection + prefetch cache invalidation, and Candlelit Night Review
  const v150Res = vm.runInContext(`(() => {
    const noEmojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
    const noStiffClassicalRe = /吾|汝|諸君|妾身|小生/;

    // A. Scheme A (溫和書卷化) & zero repetitive "先這樣，過！" signoffs
    const noRobotSignoffOk = Object.values(PERSONA_VOICE_STYLES).every(v =>
      Array.isArray(v.signoff) && v.signoff.every(s => !s.includes("先這樣，過"))
    );
    const schemeACleanOk = ["墨白", "晴嵐", "阿竹"].every(nm => {
      const p = PERSONA_COGNITIVE_PROFILES[nm];
      const f = PERSONA_FLAVORS[nm];
      const vs = PERSONA_VOICE_STYLES[nm];
      const blob = JSON.stringify({ sampleQuote: p.sampleQuote, registerBadge: p.registerBadge, f, vs });
      return !noStiffClassicalRe.test(blob);
    });

    // B. 3-Option Rephrase Choice Slips (player keeps agency, zero emoji/AI jargon)
    clearStepTimer();
    startJudgeShowcaseMatch();
    state.match.phase = "DAY_PLAYER_TURN";
    state.selectedSeatId = 4;
    el("quickFreeInput").value = "";
    el("btnQuickSpiceDemo").click();
    const trayEl = el("rephraseChoicesTray");
    const gridEl = el("rephraseSlipsGrid");
    const slips = buildRephraseChoiceSlips(el("quickFreeInput").value);
    const rephraseTrayOk = Boolean(
      trayEl && !trayEl.classList.contains("hidden") &&
      slips.length === 3 &&
      slips[0].angle === "直指矛盾" && slips[1].angle === "溫言請教" && slips[2].angle === "留白觀望" &&
      slips.every(s => !noEmojiRe.test(s.text))
    );
    applyRephraseSlip(slips[0]);
    const applySlipOk = Boolean(
      state.match.rewriteCritReady === true &&
      el("quickFreeInput").value === slips[0].text &&
      trayEl.classList.contains("hidden") &&
      !noEmojiRe.test(el("speechThreeGoodBadge").textContent)
    );

    // C. Verbatim Anchor (真人原話咬合) under strict Blind-View Proxy trap
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;
    state.match.phase = "DAY_PLAYER_TURN";
    el("playerSpeechInput").value = "我心平氣和問一句，4號阿松你昨天為何棄票不投可疑的人？這輪我懷疑4號。";
    submitPlayerSpeech();
    const lastPlEv = state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1];
    const anchorExtracted = lastPlEv && lastPlEv.verbatimAnchorsByTarget && lastPlEv.verbatimAnchorsByTarget[4];
    const seat4 = getSeat(4);
    const defSp4 = buildHeuristicAiSpeech(seat4);
    const defPrompt4 = buildBlindGeminiSpeechPrompt(seat4, defSp4);
    const verbatimAnchorOk = Boolean(
      anchorExtracted && anchorExtracted.includes("為何棄票") &&
      defSp4 && defSp4.text.includes(anchorExtracted) &&
      defPrompt4 && defPrompt4.audit && defPrompt4.audit.ok &&
      defPrompt4.prompt.includes("玩家原話必答錨點") &&
      defPrompt4.prompt.includes(anchorExtracted)
    );

    // D. 3-Tier Dynamic Speech Length Quota
    const briefTierHits = [];
    const intenseTierHits = [];
    const calmCtxMock = {
      snap: Object.assign({}, createBlindMatchSnapshot(getSeat(3), { module: "smoke_v150_len" }), { isMatchPoint: false }),
      day: 2, spokenIdsToday: [2, 3], spokenOthers: [getSeat(2)], unspokenOthers: [getSeat(5)],
      seatLabel: s => s ? (s.id + "號" + s.name) : "",
      isFirstToday: false, seerWolfOnMe: null, wolfPitOnMe: null, accuseOnMe: null,
      priorSameRoleSteal: null, dualSeerWorlds: null, playerAnchorOnMe: "",
      priorSeerWolfEv: null, vouchOnMe: null, publicInterjections: []
    };
    for (let sid = 2; sid <= 8; sid++) {
      const st = Object.assign({}, getSeat(sid), { role: "villager", suspicionMap: {} });
      const t = determineSpeechLengthTier(st, calmCtxMock);
      if (t === "brief") briefTierHits.push(sid);
    }
    if (defSp4.lengthTier === "intense") intenseTierHits.push(4);
    const briefSample = buildBriefPassSpeech(getSeat(briefTierHits[0] || 3), calmCtxMock);
    const dynamicLenOk = Boolean(
      briefTierHits.length >= 2 &&
      intenseTierHits.length >= 1 &&
      briefSample && briefSample.lengthTier === "brief" &&
      briefSample.text.length >= 12 && briefSample.text.length <= 36 &&
      !briefSample.text.includes("先這樣，過")
    );

    // E. Listening Nod/Frown Micro-Reaction + Once-Per-Day Tea-Cup Interjection + Prefetch Cache Sync
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = 4;
    delete state.playerMarks[4];
    state.match.speechQueue = [5, 1];
    state.match.interjectUsedDay = 0;
    state.match.tableReactions = [];
    state.match.publicInterjections = [];
    state.match._prefetchedSpeech = { key: "stale_before_frown", seatId: 5, resolvedMeta: { text: "stale" } };
    const revBeforeFrown = state.match.tableStateRev || 0;
    el("btnMarkWolf").click();
    const seat5 = getSeat(5);
    const frownPrompt5 = buildBlindGeminiSpeechPrompt(seat5, buildHeuristicAiSpeech(seat5));
    const frownSyncOk = Boolean(
      (state.match.tableStateRev || 0) > revBeforeFrown &&
      (!state.match._prefetchedSpeech || (state.match._prefetchedSpeech.key !== "stale_before_frown" && state.match._prefetchedSpeech.key === _buildSpeechPrefetchKey(5))) &&
      state.match.tableReactions.some(r => r.targetId === 4 && r.kind === "frown") &&
      frownPrompt5 && frownPrompt5.audit && frownPrompt5.audit.ok &&
      frownPrompt5.prompt.includes("皺了眉頭")
    );

    state.match._prefetchedSpeech = { key: "stale_before_interject", seatId: 5, resolvedMeta: { text: "stale" } };
    const revBeforeInterj = state.match.tableStateRev || 0;
    const openedInterj = openTeaInterjectPopover();
    const interjEntry = executeTeaInterjection("你剛才為何急著替他緩頰？");
    const downstreamPrompt5 = buildBlindGeminiSpeechPrompt(seat5, buildHeuristicAiSpeech(seat5));
    const interjectSyncOk = Boolean(
      openedInterj &&
      interjEntry &&
      interjEntry.reply &&
      interjEntry.reply.length <= 24 &&
      !noEmojiRe.test(interjEntry.reply) &&
      state.match.interjectUsedDay === state.match.day &&
      !canUseTeaInterjectNow() &&
      (state.match.tableStateRev || 0) > revBeforeInterj &&
      (!state.match._prefetchedSpeech || (state.match._prefetchedSpeech.key !== "stale_before_interject" && state.match._prefetchedSpeech.key === _buildSpeechPrefetchKey(5))) &&
      downstreamPrompt5 && downstreamPrompt5.audit && downstreamPrompt5.audit.ok &&
      downstreamPrompt5.prompt.includes("方才席間神情與舉杯交鋒紀錄") &&
      downstreamPrompt5.prompt.includes("為何急著替他緩頰")
    );

    // F. Civilian Candlelit Night Review (燭下覆茶) — including LAST_WORDS_SPEECH -> Night 2 phase transition guard!
    state.match.phase = "LAST_WORDS_SPEECH";
    const slipsNight = buildCandlelitNightSlips();
    let proceededNight = false;
    const openedCandle = openCandlelitNightReview(() => { proceededNight = true; });
    const phaseLeftLastWordsOk = isNightPhase(state.match.phase) && !el("candlelitReviewCard").classList.contains("hidden");
    if (slipsNight[0]) toggleCandlelitWatchSeat(slipsNight[0].seatId);
    const watchCount = (state.match.candlelitReview && state.match.candlelitReview.watchIds) ? state.match.candlelitReview.watchIds.length : 0;
    // Verify Space key / btnCandlelitDone advances cleanly out of Candlelit Night Review
    window.dispatchEvent({ type: "keydown", key: " ", code: "Space", target: { tagName: "BODY" }, preventDefault() {} });
    const candlelitOk = Boolean(
      slipsNight.length >= 2 &&
      openedCandle &&
      phaseLeftLastWordsOk &&
      watchCount === 1 &&
      proceededNight &&
      el("candlelitReviewCard").classList.contains("hidden") &&
      state.match.pinnedClues.some(c => c.tag.includes("燭下圈防") && !noEmojiRe.test(c.tag))
    );

    antiCheatMonitor.strictThrow = prevStrict;
    clearStepTimer();
    resetMatchToLobby();
    return {
      noRobotSignoffOk, schemeACleanOk, rephraseTrayOk, applySlipOk,
      verbatimAnchorOk, dynamicLenOk, frownSyncOk, interjectSyncOk, candlelitOk
    };
  })()`, ctx);
  for (const [k, v] of Object.entries(v150Res)) {
    if (!v) {
      throw new Error("v15.0 DE-AI EXPERIENCE check failed for " + k + ": " + JSON.stringify(v150Res));
    }
  }

  // ==================== v15.2 ZERO-COMPROMISE 144Hz+ VSYNC, 4K DIRTY-FLAG CACHE & DUAL-GPU DIAGNOSTICS ====================
  const v152Res = vm.runInContext(`(() => {
    const prevReady = stage3d.ready;
    const prevFailed = stage3d.failed;
    const prevIgpu = stage3d.isIntegratedGpu;
    const prevSoft = stage3d.isSoftwareRenderer;
    const prevGpuStr = stage3d.gpuRendererStr;
    const prevGpuLbl = stage3d.gpuShortLabel;
    const prevView = state.viewMode;
    const prevQ = state.quality3D;
    const prevEma = stage3d._perfEmaMs;

    // 1. Native VSync unlock on discrete GPU (high/balanced) vs smooth 60fps cap on iGPU/eco/software
    stage3d.ready = true;
    stage3d.failed = false;
    state.viewMode = "3d";
    stage3d.isIntegratedGpu = false;
    stage3d.isSoftwareRenderer = false;
    state.quality3D = "high";
    const dgpuHighUnlockOk = !shouldCapFrameRate60() && stage3d.getShadowUpdateStride() === 1;
    state.quality3D = "balanced";
    const dgpuBalUnlockOk = !shouldCapFrameRate60() && stage3d.getShadowUpdateStride() === 2;
    state.quality3D = "eco";
    const dgpuEcoCapOk = shouldCapFrameRate60() && stage3d.getShadowUpdateStride() === 3;
    stage3d.isIntegratedGpu = true;
    state.quality3D = "high";
    const igpuCapOk = shouldCapFrameRate60() && stage3d.getShadowUpdateStride() === 3;
    stage3d.isSoftwareRenderer = true;
    const softCapOk = shouldCapFrameRate60() && stage3d.getShadowUpdateStride() === 4;

    // 2. Framerate-independent exponential damping invariance (60Hz vs 144Hz vs 240Hz)
    const rem60 = 1 - dampFactor3D(0.14, 1);
    const rem144 = Math.pow(1 - dampFactor3D(0.14, 60 / 144), 144 / 60);
    const rem240 = Math.pow(1 - dampFactor3D(0.14, 60 / 240), 240 / 60);
    const dtInvarianceOk = Math.abs(rem60 - rem144) < 1e-6 && Math.abs(rem60 - rem240) < 1e-6;

    // 3. 4K 2D Overlay Dirty-Flag signature caching & transient FX bypass
    const mockF = { nowMs: 10000, w: 3840, h: 2160, dpr: 1.5, p: "DAY_SPEECH", daylight: true };
    const mockCoords = [
      { id: 1, x: 1000, y: 800, r: 42, visibleInView: true, offScreenDir: 0, seat: { id: 1, alive: true, claimedRole: null, sweatExposed: false, microPulse: 20 } },
      { id: 2, x: 1400, y: 720, r: 40, visibleInView: true, offScreenDir: 0, seat: { id: 2, alive: true, claimedRole: "seer", sweatExposed: false, microPulse: 35 } }
    ];
    state.seatBubbles = {};
    state.fxPopups = [];
    state.burstParticles = [];
    state.ripples = [];
    state.pointerTrail = [];
    state.screenFlash = null;
    state.shakeUntil = 0;
    state.selectedSeatId = null;
    const sigA = compute3DOverlaySignature(mockF, mockCoords);
    // Tiny 0.4px breathing micro-drift stays cached
    const mockCoordsTinyBob = [
      Object.assign({}, mockCoords[0], { y: 800.4 }),
      mockCoords[1]
    ];
    const sigB = compute3DOverlaySignature(mockF, mockCoordsTinyBob);
    // Selection change or meaningful camera movement invalidates immediately
    state.selectedSeatId = 2;
    const sigSel = compute3DOverlaySignature(mockF, mockCoords);
    state.selectedSeatId = null;
    const mockCoordsMoved = [
      Object.assign({}, mockCoords[0], { x: 1025 }),
      mockCoords[1]
    ];
    const sigMove = compute3DOverlaySignature(mockF, mockCoordsMoved);
    // Transient FX returns null so dynamic animations are never cached
    state.fxPopups = [{ born: 9900, duration: 1200, x: 100, y: 100, text: "清風照破", color: "#34d399" }];
    const sigDyn = compute3DOverlaySignature(mockF, mockCoords);
    state.fxPopups = [];
    const overlayCacheSigOk = Boolean(
      typeof sigA === "string" && sigA.length > 10 &&
      sigA === sigB &&
      sigA !== sigSel &&
      sigA !== sigMove &&
      sigDyn === null
    );

    // 4. Desktop Dual-GPU (12700K Intel UHD 770) detection, cleaned GPU name & true 144Hz+ FPS readout (zero emoji!)
    const noEmojiRe152 = /[\u{1F300}-\u{1FAFF}\u26A1]/u;
    stage3d.gpuRendererStr = "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0)";
    stage3d.gpuShortLabel = "Intel(R) UHD Graphics 770";
    stage3d.isIntegratedGpu = true;
    stage3d.isSoftwareRenderer = false;
    const cleanUhdOk = stage3d.getCleanGpuName() === "Intel(R) UHD Graphics 770";
    const warnDesktopUhdOk = stage3d.shouldWarnDesktopIntegratedGpu(2560, false) === true;
    const noWarnMobileUhdOk = stage3d.shouldWarnDesktopIntegratedGpu(2560, true) === false;
    const noWarnSmallLaptopOk = stage3d.shouldWarnDesktopIntegratedGpu(1440, false) === false;
    stage3d.updateGpuStatusUi();
    const hintShownOnUhdOk = el("gpuDualCardHint") && !noEmojiRe152.test(el("gpuPerfStatusLine").textContent);

    stage3d.gpuRendererStr = "ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)";
    stage3d.gpuShortLabel = "RTX 5080";
    stage3d.isIntegratedGpu = false;
    stage3d.isSoftwareRenderer = false;
    state.quality3D = "high";
    stage3d._perfEmaMs = 1000 / 144;
    stage3d.updateGpuStatusUi();
    const perfLineTxt = String((el("gpuPerfStatusLine") && el("gpuPerfStatusLine").textContent) || "");
    const cleanRtx5080Ok = stage3d.getCleanGpuName() === "NVIDIA GeForce RTX 5080"
      && stage3d.shouldWarnDesktopIntegratedGpu(2560, false) === false
      && perfLineTxt.includes("NVIDIA GeForce RTX 5080")
      && perfLineTxt.includes("144 FPS")
      && !noEmojiRe152.test(perfLineTxt);

    // 5. Rounded dimension resize cache prevents 125%/150% DPI micro-jitter thrashing
    //    AND applyQualityMode() followed by resize() ALWAYS executes renderer.setSize() (never leaves 300x150 default canvas!)
    const prevRenderer = stage3d.renderer;
    const prevCam = stage3d.camera;
    const prevPostfx = stage3d.postfx;
    let setSizeCalls = 0;
    let lastSizeArgs = null;
    stage3d.renderer = {
      shadowMap: { enabled: true, autoUpdate: false, needsUpdate: false },
      setPixelRatio() {},
      setSize(w, h) { setSizeCalls += 1; lastSizeArgs = [w, h]; }
    };
    stage3d.camera = { aspect: 1, updateProjectionMatrix() {} };
    stage3d.postfx = { resize() {} };
    stage3d._lastResizeW = 0;
    stage3d._lastResizeH = 0;
    stage3d._lastResizeDpr = 0;
    const stageWrap = el("canvasStageWrap") || el("canvasContainer");
    const prevGetRect = stageWrap.getBoundingClientRect;
    stageWrap.getBoundingClientRect = () => ({ width: 1280.2, height: 720.3 });
    stage3d.applyQualityMode();
    const initApplySizedOk = setSizeCalls === 1 && lastSizeArgs && lastSizeArgs[0] === 1280 && lastSizeArgs[1] === 720;
    const r1AfterApply = stage3d.resize();
    stageWrap.getBoundingClientRect = () => ({ width: 1280.4, height: 719.8 });
    const r2 = stage3d.resize();
    stageWrap.getBoundingClientRect = () => ({ width: 1920.0, height: 1080.0 });
    const r3 = stage3d.resize();
    stageWrap.getBoundingClientRect = prevGetRect;
    stage3d.renderer = prevRenderer;
    stage3d.camera = prevCam;
    stage3d.postfx = prevPostfx;
    const resizeCacheOk = initApplySizedOk && r1AfterApply === false && r2 === false && r3 === true && setSizeCalls === 2 && lastSizeArgs[0] === 1920 && lastSizeArgs[1] === 1080;

    // 6. High-DPI 4K/1440p Pixel-Budget Cap + VRM Morph Compaction + Cross-Game Avatar Pool Reuse
    const prevStageWrapRect = stageWrap.getBoundingClientRect;
    const prevWinDpr = window.devicePixelRatio;
    window.devicePixelRatio = 1.5;
    stageWrap.getBoundingClientRect = () => ({ width: 2560, height: 1440 });
    stage3d.isIntegratedGpu = false;
    stage3d.isSoftwareRenderer = false;
    const hiDpr1440 = stage3d.getTargetDpr("high");
    const ovDpr1440 = stage3d.getOverlayDpr();
    const pixelBudgetCapOk = Boolean(
      (2560 * hiDpr1440) * (1440 * hiDpr1440) <= 2900000 &&
      (2560 * ovDpr1440) * (1440 * ovDpr1440) <= 2500000
    );
    stageWrap.getBoundingClientRect = prevStageWrapRect;
    window.devicePixelRatio = prevWinDpr;

    const compMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial());
    compMesh.name = "Face.baked_0";
    compMesh.isMesh = true;
    compMesh.traverse = function (fn) { fn(this); };
    compMesh.geometry.morphAttributes = {
      position: Array.from({ length: 40 }, (_, idx) => ({ id: idx })),
      normal: Array.from({ length: 40 }, (_, idx) => ({ id: idx }))
    };
    compMesh.morphTargetInfluences = new Array(40).fill(0);
    compMesh.morphTargetDictionary = { "Face.M_F00_000_00_Fcl_MTH_A": 9, "Face.M_F00_000_00_Fcl_EYE_Close": 5, "Unused_Extra": 33 };
    const compPrep = stage3dVrm.prepareLoadedAvatar({ scene: compMesh, parser: { json: { meshes: [{ name: "Face.baked" }], extensions: { VRM: { humanoid: { humanBones: [] }, blendShapeMaster: { blendShapeGroups: [{ presetName: "a", binds: [{ mesh: 0, index: 9, weight: 100 }] }, { presetName: "blink", binds: [{ mesh: 0, index: 5, weight: 100 }] }] } } } } } }, { mode: "seated", keepRecolorSlots: false });
    const morphCompactionOk = Boolean(
      compPrep &&
      !compMesh.geometry.morphAttributes.normal &&
      compMesh.geometry.morphAttributes.position.length === 2 &&
      compMesh.morphTargetInfluences.length === 2 &&
      compPrep.morphs.aa.length === 1 && compPrep.morphs.blink.length === 1 &&
      compPrep.morphs.aa[0].idx < 2 && compPrep.morphs.blink[0].idx < 2
    );

    // 7. v24.3 Custom VRM boundAvatarKey parity & eco shadow rebake on async/pooled mount
    const prevSeats3d = stage3d.seats;
    const prevShadowBaked = stage3d._shadowBakedOnce;
    const testMountGrp = new THREE.Group();
    const testActor = { vrmMountGroup: testMountGrp, vrmAvatar: null, boundModelSlug: "", boundAvatarKey: "", _vrmUpdatedOnce: false };
    stage3d.seats = { slots: { 99: testActor }, root: new THREE.Group() };
    stage3d._shadowBakedOnce = true;
    const customGltf = { scene: new THREE.Group(), parser: { json: {} } };
    stage3d.attachSeatAvatar(99, customGltf, "custom_test.vrm", true, "custom:test", { id: 99, name: "小澄" });
    const expectedCustomKey = "custom:test|" + "小澄";
    const customAvatarKeyOk = Boolean(
      testActor.boundModelSlug === "custom:test" &&
      testActor.boundAvatarKey === expectedCustomKey
    );
    const shadowResetOnAttachOk = stage3d._shadowBakedOnce === false;
    stage3d._shadowBakedOnce = true;
    const pooledMounted = stage3d.mountPooledSeatAvatar(testActor, {
      slug: "xiaocheng",
      key: "xiaocheng|小澄",
      avatar: { root: new THREE.Group(), lastMoodKey: "day", lastAlive: true, lastTalkBoost: true }
    });
    const shadowResetOnPoolOk = Boolean(pooledMounted && stage3d._shadowBakedOnce === false);
    stage3d.seats = prevSeats3d;
    stage3d._shadowBakedOnce = prevShadowBaked;
    const ecoShadowRebakeOk = shadowResetOnAttachOk && shadowResetOnPoolOk;

    // 8. v24.3 Software Renderer (SwiftShader) failsafe: skips heavy VRM queue so CPU-only browsers never exhaust RAM
    const subzeroProf = stage3d.detectGpuProfile(null, "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)");
    const prevAvQueueSoft = stage3d.avatarQueue;
    const prevAvManifestSoft = stage3d.avatarManifest;
    stage3d.isSoftwareRenderer = true;
    stage3d.avatarQueue = [];
    stage3d.avatarManifest = { xiaocheng: "assets/models/xiaocheng.vrm" };
    stage3d.seats = { slots: { 2: { vrmMountGroup: new THREE.Group(), vrmAvatar: null, boundModelSlug: "", boundAvatarKey: "" } }, root: new THREE.Group() };
    stage3d.syncSeatAvatars([{ id: 2, name: "小澄" }]);
    const softwareSkipsVrmOk = Boolean(subzeroProf.isSoftwareRenderer && stage3d.avatarQueue.length === 0);
    stage3d.seats = prevSeats3d;
    stage3d.avatarQueue = prevAvQueueSoft;
    stage3d.avatarManifest = prevAvManifestSoft;

    // Restore state
    stage3d.ready = prevReady;
    stage3d.failed = prevFailed;
    stage3d.isIntegratedGpu = prevIgpu;
    stage3d.isSoftwareRenderer = prevSoft;
    stage3d.gpuRendererStr = prevGpuStr;
    stage3d.gpuShortLabel = prevGpuLbl;
    state.viewMode = prevView;
    state.quality3D = prevQ;
    stage3d._perfEmaMs = prevEma;

    return {
      dgpuHighUnlockOk, dgpuBalUnlockOk, dgpuEcoCapOk, igpuCapOk, softCapOk,
      dtInvarianceOk, overlayCacheSigOk,
      cleanUhdOk, warnDesktopUhdOk, noWarnMobileUhdOk, noWarnSmallLaptopOk, hintShownOnUhdOk, cleanRtx5080Ok,
      resizeCacheOk, pixelBudgetCapOk, morphCompactionOk, customAvatarKeyOk, ecoShadowRebakeOk, softwareSkipsVrmOk
    };
  })()`, ctx);
  for (const [k, v] of Object.entries(v152Res)) {
    if (!v) {
      throw new Error("v15.2 144Hz+ & 4K PERF check failed for " + k + ": " + JSON.stringify(v152Res));
    }
  }

  // Verify zero leftover leaf emoji in js/game/day-speech.js & pre-aligned toneMapping + smart antialias in engine.js
  const daySpeechSrc = fs.readFileSync(path.join(ROOT, "js/game/day-speech.js"), "utf8");
  const engineSrc = fs.readFileSync(path.join(ROOT, "js/stage3d/engine.js"), "utf8");
  const votingSrc243 = fs.readFileSync(path.join(ROOT, "js/game/voting.js"), "utf8");
  if (daySpeechSrc.includes("\u{1F343}")) {
    throw new Error("v15.2 check failed: leftover leaf emoji found in js/game/day-speech.js");
  }
  if (!engineSrc.includes("antialias: useMainAa") || !engineSrc.includes("willUsePostFxInit")) {
    throw new Error("v15.2 check failed: engine.js missing postfx-aware antialias or init toneMapping pre-alignment");
  }
  if ((engineSrc.match(/this\._shadowBakedOnce = false;/g) || []).length < 3) {
    throw new Error("v24.3 check failed: engine.js must reset _shadowBakedOnce = false across hero/pooled/seat VRM mounts");
  }
  if (!votingSrc243.includes("if (state.match) state.match._voteFinalizing = false;")) {
    throw new Error("v24.3 check failed: voting.js missing catch-path _voteFinalizing unlock guard");
  }
}

// 29. v16.0 High-Tension Gameplay, Zero-Leak Hope Duel, Self-Explode, Night-2+ No Last Words, Match Point, Wolf Screen, Spirit Bets, Mission Awakening & Cloud Variants
{
  const v16Res = vm.runInContext(`(() => {
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;
    const prevCareerRaw = localStorage.getItem(CAREER_STORAGE_KEY);
    // Unlock all variants for variant tests
    saveCareerStats({ gamesPlayed: 10, wins: 5, goodWins: 3, wolfWins: 2, totalGoodWords: 20, totalRewrites: 5, bestCombo: 4, zeroToxicWins: 2, spiritBetScore: 0, bestSpiritStreak: 0, unlockedBadges: ["first_win","zero_toxic","kind_crit","resonance","combo_master","four_g_sage","pro_slayer","wolf_actor"] });

    // (1) Dynamic Night-1 AI Witch Heal + Night-1 AI Wolf Self-Knife Bait
    state.activeVariant = "standard";
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("selectAiDifficulty").value = "pro";
    el("chkSheriffMode").checked = true;
    el("chkGuardMode").checked = true;
    startNewGame();
    state.match.day = 1;
    state.match.phase = "NIGHT_WITCH";
    const witchS = state.match.seats.find(s => s.role === "witch");
    const goodVictim = state.match.seats.find(s => s.team === "good" && s.id !== witchS.id);
    state.match.nightState.wolfTarget = goodVictim.id;
    const healLowRoll = chooseAiWitchNightAction(witchS, 0.15);
    const healHighRoll = chooseAiWitchNightAction(witchS, 0.92);
    const dynamicWitchHealOk = Boolean(healLowRoll.heal === true && healHighRoll.heal === false);

    state.match.phase = "NIGHT_WOLF";
    const wolfA = state.match.seats.find(s => s.role === "wolf");
    const selfKnifePick = chooseAiWolfTargetBlind(wolfA, 0.05);
    const normalKnifePick = chooseAiWolfTargetBlind(wolfA, 0.65);
    const wolfSelfKnifeOk = Boolean(selfKnifePick && selfKnifePick.id === wolfA.id && normalKnifePick && normalKnifePick.id !== wolfA.id && getSeat(normalKnifePick.id).role !== "wolf");

    // (2) High-Intensity Night-2+ ZERO Last Words + High-Diff Voted-Out Wolf Fake God Last Words
    state.match.day = 2;
    state.match.phase = "DAWN_RESOLVE";
    let lwDoneCalled = false;
    startLastWordsSequence([goodVictim.id], "first_night", () => { lwDoneCalled = true; });
    const night2NoLastWordsOk = Boolean(lwDoneCalled && state.lastWordsCtx === null && state.match.phase !== "LAST_WORDS_SPEECH");
    let fakeGodFound = false;
    for (let d = 1; d <= 6; d++) {
      state.match.day = d;
      const lwWolf = buildAiLastWords(wolfA, "vote_out");
      if (lwWolf && lwWolf.isFakeGodBluff && (lwWolf.claimRole === "witch" || lwWolf.claimRole === "guard")) {
        fakeGodFound = true;
        break;
      }
    }
    const wolfFakeGodLwOk = fakeGodFound;

    // (3) De-Cheated Four-G Hope ("15s 明燈雙向對質") — Zero God-View Leak under strictThrow!
    state.match.day = 2;
    state.match.phase = "DAY_SPEECH";
    state.match.fourGivingsUsed.hope = false;
    const violBeforeHope = antiCheatMonitor.stats.violationsBlocked;
    const aliveNonP = getAliveSeats().filter(s => s.id !== getPlayerId());
    const hopeRes = useFourGHope(aliveNonP[0].id, aliveNonP[1].id);
    const hopeDuelOk = Boolean(
      hopeRes && hopeRes.active && hopeRes.lines.length === 2 &&
      state.match.fourGivingsUsed.hope === true &&
      antiCheatMonitor.stats.violationsBlocked === violBeforeHope &&
      !hopeRes.lines.some(l => /必藏一狼|上帝視角/.test(l.text))
    );
    closeHopeConfrontationModal();

    // (4) Wolf Self-Explode ("拂袖掀席") during SHERIFF_ELECTION & DAY_SPEECH -> interrupts & jumps straight to NIGHT!
    el("selectPreferredRole").value = "wolf";
    el("chkSheriffMode").checked = true;
    startNewGame();
    state.match.day = 1;
    state.match.phase = "SHERIFF_ELECTION";
    state.match.sheriffElectionCtx = { stage: "speech", candidateIds: [getPlayerId(), 2], speechOrderIds: [getPlayerId(), 2], speechIndex: 0, speeches: [], spokenSpeeches: [], withdrawnIds: [] };
    state.match.sheriffBadgeFlow = { ownerId: 2, firstTargetId: 3, secondTargetId: 4 };
    state.match._prefetchedSpeech = { key: "stale", seatId: 2 };
    const epBeforeExp = orchestrator.matchEpoch;
    const expOk1 = triggerWolfSelfExplode(getPlayerId());
    const explodeElectionOk = Boolean(
      expOk1 && !getPlayerSeat().alive && getPlayerSeat().outReason === "拂袖掀席自爆" &&
      state.match.sheriffElectionCtx === null && state.match.sheriffBadgeFlow === null &&
      state.match._prefetchedSpeech === null && orchestrator.matchEpoch > epBeforeExp &&
      isNightPhase(state.match.phase) && state.match.day === 2
    );

    // Also test AI Wolf Self-Explode during DAY_SPEECH forfeiting remaining speechQueue
    el("selectPreferredRole").value = "seer";
    startNewGame();
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    const wExpAi = state.match.seats.find(s => s.role === "wolf" && s.alive);
    state.match.speechQueue = [1, 2, 3, 4];
    const expOk2 = triggerWolfSelfExplode(wExpAi.id);
    const explodeDaySpeechOk = Boolean(
      expOk2 && !wExpAi.alive && state.match.speechQueue.length === 0 && isNightPhase(state.match.phase) && state.match.day === 2
    );

    // (5) Sheriff "拱手退水" + Match Point ("茶涼聽牌") <= 28-char cap + matchpoint track
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = true;
    startNewGame();
    state.match.day = 1;
    state.match.phase = "SHERIFF_ELECTION";
    const pidSh = getPlayerId();
    const otherCandId = state.match.seats.find(s => s.id !== pidSh).id;
    state.match.sheriffElectionCtx = { stage: "speech", candidateIds: [pidSh, otherCandId], speechOrderIds: [pidSh, otherCandId], speechIndex: 0, activeReelSeatId: pidSh, playerRunning: true, playerWithdrew: false, speeches: [], spokenSpeeches: [], withdrawnIds: [], dramaEvents: [] };
    const epBeforeWd = orchestrator.matchEpoch;
    const wdRes = resolveSheriffElectionAction("withdraw");
    const sheriffWithdrawOk = Boolean(
      wdRes && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.withdrawnIds.indexOf(pidSh) !== -1 &&
      orchestrator.matchEpoch > epBeforeWd
    );

    // Trigger Match Point by leaving 5 alive seats (endgame keeps matchpoint track & intense deep speeches, no 28-char choke!)
    state.match.phase = "DAY_SPEECH";
    state.match.sheriffElectionCtx = null;
    const aliveListMp = getAliveSeats();
    for (let i = 5; i < aliveListMp.length; i++) aliveListMp[i].alive = false;
    const mpOn = evaluateMatchPointState();
    const mpTrackOk = sound.resolveTargetTrack() === "matchpoint";
    const mpSpeaker = getAliveSeats().find(s => s.id !== getPlayerId());
    const mpSpeech = buildHeuristicAiSpeech(mpSpeaker);
    const mpCapOk = Boolean(mpOn && mpTrackOk && getActiveSpeechCharLimit() === 0 && mpSpeech && mpSpeech.lengthTier === "intense" && mpSpeech.text && mpSpeech.text.length >= 28);

    // (6) Human Wolf Screen 3 Tactics ("mate_fake_seer_gold", "player_fake_seer_push", "deep_stealth_bus")
    el("selectPreferredRole").value = "wolf";
    el("selectModeCount").value = "8";
    startNewGame();
    state.match.day = 1;
    state.match.phase = "NIGHT_WOLF";
    const wMate = state.match.seats.find(s => s.id !== getPlayerId() && s.role === "wolf");
    applyWolfNightTactic("mate_fake_seer_gold");
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    const goldSp = buildHeuristicAiSpeech(wMate);
    const tactic1GoldOk = Boolean(goldSp && goldSp.claimSeer && goldSp.checkedGoodId === getPlayerId());

    state.match.phase = "NIGHT_WOLF";
    wMate.claimedRole = null;
    applyWolfNightTactic("player_fake_seer_push");
    state.match.phase = "DAY_SPEECH";
    const goodTgtP = state.match.seats.find(s => s.team === "good");
    getPlayerSeat().claimedRole = "seer";
    state.match.daySpeechEvents = [{ day: 1, speakerId: getPlayerId(), claimRole: "seer", accuseId: goodTgtP.id, wolfPits: [goodTgtP.id], rawText: "我是觀察員驗出他是狼" }];
    const pushSp = buildHeuristicAiSpeech(wMate);
    const tactic2PushOk = Boolean(pushSp && pushSp.accuseId === goodTgtP.id && pushSp.standWithSeerId === getPlayerId());

    state.match.phase = "NIGHT_WOLF";
    wMate.claimedRole = null;
    applyWolfNightTactic("deep_stealth_bus");
    state.match.phase = "DAY_SPEECH";
    const deepSp = buildHeuristicAiSpeech(wMate);
    const tactic3DeepOk = Boolean(deepSp && !deepSp.claimSeer && !deepSp.hasToxicSlip);

    // (7) Spectator Spirit Intuition Bet Streak & Career Persistence
    el("selectPreferredRole").value = "villager";
    startNewGame();
    getPlayerSeat().alive = false;
    state.match.phase = "DAY_VOTE";
    const betTargetA = getAliveSeats()[0];
    const betTargetB = getAliveSeats()[1];
    ensureSpiritBetState().active = { open: false, kind: "vote_out", day: 1, targetId: null, secondsLeft: 5, onDone: null };
    placeSpiritRoundBet(betTargetA.id);
    const sb1 = resolveSpiritRoundBet("vote_out", betTargetA.id);
    ensureSpiritBetState().active = { open: false, kind: "night_kill", day: 2, targetId: null, secondsLeft: 5, onDone: null };
    placeSpiritRoundBet(betTargetB.id);
    const sb2 = resolveSpiritRoundBet("night_kill", betTargetB.id);
    const careerAfterBet = loadCareerStats();
    const spiritBetOk = Boolean(sb1 && sb1.hit && sb1.earned === 10 && sb2 && sb2.hit && sb2.earned === 15 && careerAfterBet.spiritBetScore >= 25 && careerAfterBet.bestSpiritStreak >= 2);

    // (8) Role Mission Live Awakening (Villager extra interject + Guard +0.5 ballot weight)
    el("selectPreferredRole").value = "villager";
    el("selectRuleDepth").value = "full";
    startNewGame();
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    state.match.interjectUsedDay = 1;
    state.match.stats.cluesCaught = 2;
    state.match.stats.toxicSentCount = 0;
    const vilMis = evaluateRoleMission();
    const activeAiSp = getAliveSeats().find(s => s.id !== getPlayerId());
    state.activeSpeakerId = activeAiSp.id;
    const canBonusInterject = canUseTeaInterjectNow();
    const villAwakenOk = Boolean(vilMis && vilMis.awakened && state.match.interjectBonusCharges === 1 && canBonusInterject);

    el("selectPreferredRole").value = "guard";
    el("selectModeCount").value = "8";
    el("chkGuardMode").checked = true;
    el("chkSheriffMode").checked = false;
    startNewGame();
    state.match.day = 1;
    const gTarget = getAliveSeats().find(s => s.team === "good" && s.id !== getPlayerId());
    state.match.nightState = { guardTarget: gTarget.id, wolfTarget: gTarget.id, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    const guardAwakenOk = Boolean(state.match.roleMission && state.match.roleMission.awakened && state.match.guardAwakenBonusWeightDay >= 1);

    // (9) Four Cloud Variants ("fog_seal", "blitz_3m", "twin_tea", "lone_wolf_king")
    state.activeVariant = "lone_wolf_king";
    el("selectPreferredRole").value = "random";
    startNewGame();
    const lwkSeers = state.match.seats.filter(s => s.role === "seer").length;
    const lwkWolves = state.match.seats.filter(s => s.role === "wolf");
    const lwkOk = Boolean(state.match.totalSeats === 6 && lwkSeers === 0 && lwkWolves.length === 1 && lwkWolves[0].isWolfKing === true);

    state.activeVariant = "twin_tea";
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "witch";
    startNewGame();
    state.match.day = 1;
    state.match.phase = "NIGHT_WITCH";
    state.match.nightState.wolfTarget = getPlayerId();
    const twinSelfCheck = chooseAiWitchNightAction(getPlayerSeat(), 0.05);
    const twinTeaOk = Boolean(twinSelfCheck.heal === false && state.match.variantMode === "twin_tea");

    state.activeVariant = "blitz_3m";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    state.match.phase = "DAY_SPEECH";
    const blitzSp = buildHeuristicAiSpeech(getAliveSeats().find(s => s.id !== getPlayerId()));
    const blitzOk = Boolean(getActiveSpeechCharLimit() === 22 && blitzSp && blitzSp.text.length <= 22);

    state.activeVariant = "fog_seal";
    startNewGame();
    const deadSeatFog = state.match.seats.find(s => s.id !== getPlayerId());
    deadSeatFog.alive = false;
    deadSeatFog.outReason = "清心茶請離";
    const fogSnap = createBlindMatchSnapshot(getPlayerSeat(), { module: "fog_seal_smoke" });
    const fogViewDead = fogSnap.getSeat(deadSeatFog.id);
    const fogSealOk = Boolean(fogSnap.fogSealMode === true && fogViewDead && fogViewDead.fogSealed === true && fogViewDead.outReason === "已離席（迷霧封牌）");

    // Restore clean state
    state.activeVariant = "standard";
    antiCheatMonitor.strictThrow = prevAntiStrict;
    if (prevCareerRaw === null) localStorage.removeItem(CAREER_STORAGE_KEY);
    else localStorage.setItem(CAREER_STORAGE_KEY, prevCareerRaw);
    resetMatchToLobby();

    return {
      dynamicWitchHealOk, wolfSelfKnifeOk, night2NoLastWordsOk, wolfFakeGodLwOk,
      hopeDuelOk, explodeElectionOk, explodeDaySpeechOk, sheriffWithdrawOk, mpCapOk,
      tactic1GoldOk, tactic2PushOk, tactic3DeepOk, spiritBetOk,
      villAwakenOk, guardAwakenOk, lwkOk, twinTeaOk, blitzOk, fogSealOk
    };
  })()`, ctx);
  for (const [k, v] of Object.entries(v16Res)) {
    if (!v) {
      throw new Error("v16.0 High-Tension Gameplay check failed for " + k + ": " + JSON.stringify(v16Res));
    }
  }
  // Zero-Emoji check on all newly added v16.0 HTML blocks
  const htmlV16 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const v16HtmlSnippets = [
    htmlV16.match(/<span id="matchPointBadge"[\s\S]*?<\/span>/)?.[0] || "",
    htmlV16.match(/<div id="wolfSelfExplodeBar"[\s\S]*?<\/div>/)?.[0] || "",
    htmlV16.match(/<div id="hopeConfrontationModal"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || "",
    htmlV16.match(/<div id="spiritBetBanner"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || ""
  ];
  const emojiReV16 = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
  for (const snip of v16HtmlSnippets) {
    if (emojiReV16.test(snip)) {
      throw new Error("v16.0 Zero-Emoji violation found in ai.html block: " + snip);
    }
  }
}

// v16.1 VISUAL / TACTILE PHYSICAL FX, FRAMELESS UI SUBTRACTION, DE-AI COPY & 8-BUGFIX SUITE
{
  const v161Res = vm.runInContext(`(() => {
    clearStepTimer();
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    // 1. Collective Gaze pure logic (~50% split to mentioned target, speaker looks at mentioned target)
    let splitSpeaker = 0;
    let splitMention = 0;
    for (let sid = 2; sid <= 11; sid++) {
      if (sid === 3 || sid === 6) continue;
      const g = computeCollectiveGazeTarget(sid, 3, 6, 1);
      if (g === 3) splitSpeaker++;
      else if (g === 6) splitMention++;
    }
    const speakerSelfNull = computeCollectiveGazeTarget(3, 3, 6, 1) === null;
    const mentionLooksSpeaker = computeCollectiveGazeTarget(6, 3, 6, 1) === 3;
    const gazeOk = Boolean(speakerSelfNull && mentionLooksSpeaker && splitSpeaker >= 2 && splitMention >= 2);

    // 2. Dramatic Focus trigger logic
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("selectAiDifficulty").value = "normal";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = 2;
    state.match.daySpeechEvents = [{ speakerId: 2, claimRole: "seer", accuseId: 4 }];
    const focusOnGodClaim = isDramaticFocusActive(performance.now());
    state.match.daySpeechEvents = [];
    state.match.phase = "LAST_WORDS_SPEECH";
    const focusOnLastWords = isDramaticFocusActive(performance.now());
    state.match.phase = "DAY_SPEECH";
    state.lastInterjectAt = performance.now();
    const focusOnInterject = isDramaticFocusActive(performance.now());
    state.lastInterjectAt = 0;
    state.match.phase = "GAME_OVER";
    const focusOffGameOver = !isDramaticFocusActive(performance.now());
    const dramaticFocusOk = Boolean(focusOnGodClaim && focusOnLastWords && focusOnInterject && focusOffGameOver);

    // 3. Bug #4: stage3d.clearCloseUp() clears cameraPunch.until & pending
    stage3d.cameraPunch.pending = true;
    stage3d.cameraPunch.until = performance.now() + 5000;
    stage3d.cameraPunch.seatId = 1;
    stage3d.clearCloseUp();
    const cameraPunchResetOk = Boolean(!stage3d.cameraPunch.pending && stage3d.cameraPunch.until === 0 && stage3d.closeUpSeatId === null);

    // 4. Bug #7 + 70ms Hit-Stop + BGM Brief Duck + Wood Token Drop + Lantern-Out Silhouette
    const t0 = performance.now();
    triggerScreenFlash("#fbbf24", 350, 0.3);
    const flashUntilOk = Boolean(state.screenFlash && state.screenFlash.until >= t0 + 300);
    triggerHitStop(70);
    const hitStopOk = Boolean(state.fxHitStopUntil >= t0 + 50);
    sound.duckBgmBrief(350);
    const bgmDuckOk = Boolean(sound._briefDuckActive === true);
    let woodDropOk = false;
    try { sound.playWoodTokenDrop(); woodDropOk = true; } catch (e) { woodDropOk = false; }
    triggerLanternOutSilhouette(2);
    const lanternVeilOk = Boolean(el("lanternOutVeil") && el("lanternOutVeil").classList.contains("is-active"));

    // 5. Bug #1: triggerWolfSelfExplode clears voteFlight timers & hides voteFlightBanner
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "wolf";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_VOTE";
    let phantomTimerFired = false;
    state.voteFlight = {
      timers: [setTimeout(function () { phantomTimerFired = true; }, 5000)],
      liveTallies: { 2: 3 },
      total: 3,
      done: 1
    };
    state.voteLeaderId = 2;
    el("voteFlightBanner").classList.remove("hidden");
    const wolfSelf = getPlayerSeat();
    triggerWolfSelfExplode(wolfSelf.id);
    const explodeTimerCleanOk = Boolean(
      state.voteFlight === null &&
      state.voteLeaderId === null &&
      el("voteFlightBanner").classList.contains("hidden") &&
      !phantomTimerFired
    );

    // 6. Bug #2: fog_seal suppresses tea_master_blessing wolf reveal & masks hunter outReason
    state.activeVariant = "fog_seal";
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const deadWolfFog = state.match.seats.find(function (s) { return s.role === "wolf"; });
    deadWolfFog.alive = false;
    state.match.activeDirectorEvent = { id: "tea_master_blessing" };
    const beforeLogLen = state.match.logs.length;
    // Simulate resolveVotes path guard check directly via source contract & hunter presentation
    const hSeatFog = state.match.seats.find(function (s) { return s.role === "hunter"; }) || state.match.seats[1];
    const tSeatFog = state.match.seats.find(function (s) { return s.id !== hSeatFog.id && s.alive; });
    executeHunterShotPresentation(hSeatFog, tSeatFog);
    const fogHunterMaskOk = Boolean(tSeatFog.outReason === "已離席（迷霧封牌）" && state.match.logs.length >= beforeLogLen);
    state.activeVariant = "standard";

    // 7. Bug #3: clearTransientMatchTimers / finishMatch cleans match-point & vignette classes
    document.body.classList.add("is-match-point", "is-seat-focus-vignette");
    el("matchPointBadge").classList.remove("hidden");
    finishMatch("good", "測試收尾");
    const cleanFinishOk = Boolean(
      !document.body.classList.contains("is-match-point") &&
      !document.body.classList.contains("is-seat-focus-vignette") &&
      el("matchPointBadge").classList.contains("hidden") &&
      !el("lanternOutVeil").classList.contains("is-active")
    );

    // 8. Minimalist Match Point Badge ("聽牌") + Live Speech Char Counter (0 / 28 & 0 / 22 over-limit)
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.seats.forEach(function (s, i) { if (i >= 5) s.alive = false; });
    evaluateMatchPointState();
    const mpConciseBadgeOk = Boolean(el("matchPointBadge").textContent === "聽牌" && !el("matchPointBadge").classList.contains("hidden"));
    el("quickFreeInput").value = "";
    refreshSpeechCharCounter();
    const counterMp28Ok = Boolean(el("speechCharCounter").classList.contains("hidden") && !el("speechCharCounter").classList.contains("is-over"));
    state.match.variantMode = "blitz_3m";
    el("quickFreeInput").value = "這是一段超過二十二個字的閃電局測試台詞看看字數計數器有沒有紅字";
    refreshSpeechCharCounter();
    const counterBlitz22OverOk = Boolean(!el("speechCharCounter").classList.contains("hidden") && el("speechCharCounter").textContent.endsWith("/ 22") && el("speechCharCounter").classList.contains("is-over"));
    el("quickFreeInput").value = "";

    // 9. Auto-dismiss #dragGestureHint + Ordinal Sky Curtains
    state.dragHintDismissed = false;
    el("dragGestureHint").classList.remove("is-dismissed");
    dismissDragGestureHint();
    const dragHintDismissOk = Boolean(state.dragHintDismissed === true && el("dragGestureHint").classList.contains("is-dismissed"));
    const ordinalOk = Boolean(formatNightOrdinalZh(1) === "第壹夜" && formatDayOrdinalZh(2) === "第貳天");

    // 10. Full-Site De-AI Copy & Zero-Emoji Check across constants, feedback, career, modals
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u;
    const fbCleanOk = Object.values(FEEDBACK_CATEGORIES).every(function (c) { return !emojiRe.test(c.label); }) &&
      FEEDBACK_CATEGORIES.gameplay.label === "角色與規則";
    const tutCleanOk = TUTORIAL_SLIDES.length === 6 && TUTORIAL_SLIDES.every(function (sl) {
      return !emojiRe.test(sl.tab) && !emojiRe.test(sl.title) && !emojiRe.test(sl.html) &&
        !sl.title.includes("30秒看懂") && !sl.html.includes("一句話秒懂");
    });
    const achCleanOk = ACHIEVEMENT_DEFS.every(function (a) { return !emojiRe.test(a.icon) && !emojiRe.test(a.title) && !emojiRe.test(a.desc) && !a.desc.includes("高情商"); });
    const varCleanOk = CLOUD_VARIANT_DEFS.every(function (v) { return !emojiRe.test(v.badge) && !emojiRe.test(v.desc) && !v.desc.includes("瞬間白熱化"); }) &&
      CLOUD_VARIANT_DEFS.find(function (v) { return v.id === "fog_seal"; }).badge === "不翻身分牌";
    state.match.logs = [];
    renderTimeline();
    const tlTxt = ((el("chatTimeline")._children || []).map(function (c) { return c.textContent || c.innerHTML || ""; }).join(" ")) || el("chatTimeline").textContent || "";
    const timelineEmptyCleanOk = Boolean(tlTxt.includes("入夜查探線索") && !tlTxt.includes("3 秒鐘規則速看"));

    antiCheatMonitor.strictThrow = prevAntiStrict;
    resetMatchToLobby();

    return {
      gazeOk, dramaticFocusOk, cameraPunchResetOk, flashUntilOk, hitStopOk,
      bgmDuckOk, woodDropOk, lanternVeilOk, explodeTimerCleanOk, fogHunterMaskOk,
      cleanFinishOk, mpConciseBadgeOk, counterMp28Ok, counterBlitz22OverOk,
      dragHintDismissOk, ordinalOk, fbCleanOk, tutCleanOk, achCleanOk, varCleanOk, timelineEmptyCleanOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v161Res)) {
    if (!v) {
      throw new Error("v16.1 Visual/FX/Subtraction/Bugfix check failed for " + k + ": " + JSON.stringify(v161Res));
    }
  }
  // Verify fog_seal guard exists on tea_master_blessing in voting.js & zero !important / blur in CSS
  const votingSrc = fs.readFileSync(path.join(ROOT, "js/game/voting.js"), "utf8");
  if (!votingSrc.includes('state.match.variantMode !== "fog_seal"')) {
    throw new Error("Bug #2 guard missing: tea_master_blessing must check fog_seal in js/game/voting.js!");
  }
  const compCssV161 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  if (compCssV161.includes("!important") || compCssV161.includes("backdrop-filter: blur(")) {
    throw new Error("CSS invariant violated in css/components.css (!important or backdrop-filter: blur found)!");
  }
}

// v17.0 CHARACTER IDENTITY, 3D SILHOUETTE TWIN-BREAKING, 11 SIGNATURE HABITS, CLUB NETWORKS & 4-BUGFIX SUITE
{
  const v170Res = vm.runInContext(`(() => {
    clearStepTimer();
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u;

    // 1. v16.1 4 Edge-Case Bugfixes: gaze/lid reset + lanternBlackoutUntil reset + zero emoji in ROLE_GUIDES + persona IDs
    const mockPool = {
      _lastGazeSpeakerId: 5,
      _prevGazeSpeakerId: 3,
      _lastGazeMentionId: 7,
      _gazeSpeakerChangedAt: 12345,
      _gazeMentionChangedAt: 12346,
      slots: {
        2: { extinguishedAt: 999, lidProgress: 0.8, _wasAlive: false, teaLidGroup: { visible: true }, fogSealStrip: { visible: true } }
      }
    };
    reset3DSeatGazeState(mockPool);
    const gazeResetOk = Boolean(
      mockPool._lastGazeSpeakerId === null &&
      mockPool._prevGazeSpeakerId === null &&
      mockPool._lastGazeMentionId === null &&
      mockPool._gazeSpeakerChangedAt === 0 &&
      mockPool._gazeMentionChangedAt === 0 &&
      mockPool.slots[2].extinguishedAt === 0 &&
      mockPool.slots[2].lidProgress === 0 &&
      mockPool.slots[2]._wasAlive === true &&
      mockPool.slots[2].teaLidGroup.visible === false &&
      mockPool.slots[2].fogSealStrip.visible === false
    );
    if (stage3d && stage3d.env) stage3d.env.lanternBlackoutUntil = performance.now() + 5000;
    state._lanternVeilTimer = setTimeout(function () {}, 5000);
    clearTransientMatchTimers();
    const lanternResetOk = Boolean(
      (!stage3d || !stage3d.env || stage3d.env.lanternBlackoutUntil === 0) &&
      state._lanternVeilTimer === null
    );
    const roleGuidesCleanOk = Object.keys(ROLE_GUIDES).length >= 8 && Object.values(ROLE_GUIDES).every(function (g) {
      return g.icon === "" && Boolean(g.iconKey) && !emojiRe.test(g.title || "") && !emojiRe.test(g.oneLiner || "");
    });
    const personaIdsOk = AI_PERSONAS.length === 11 && AI_PERSONAS.every(function (p) {
      return typeof p.id === "string" && /^[a-z]+$/.test(p.id);
    });
    const mobai = AI_PERSONAS.find(function (p) { return p.name === "墨白"; });
    const mobaiTitleOk = Boolean(mobai && mobai.trait === "書法社社長" && !mobai.trait.includes("文言"));

    // 2. 3D Silhouette Twin-Breaking & 11 Distinct Seated Idle Archetypes
    const stylingAll11Ok = AI_PERSONAS.every(function (p) {
      const st = VRM_PERSONA_STYLING[p.name];
      return Boolean(st && typeof st.vrmAcc === "string" && st.vrmAcc.length > 0);
    }) &&
      VRM_PERSONA_STYLING["阿松"].vrmAcc === "hiking_scarf" &&
      VRM_PERSONA_STYLING["小雲"].vrmAcc === "press_kit" &&
      VRM_PERSONA_STYLING["晴嵐"].baseSlug === "qinglan";

    const idleArchetypes11Ok = AI_PERSONAS.every(function (p) {
      const ar = VRM_IDLE_ARCHETYPES[p.name];
      return Boolean(
        ar &&
        typeof ar.spineLean === "number" &&
        typeof ar.shoulderSpread === "number" &&
        typeof ar.headTiltBias === "number" &&
        typeof ar.gazeSaccadeSpeed === "number" &&
        Array.isArray(ar.idlePool) && ar.idlePool.length >= 2
      );
    });

    let accAttachAll11Ok = true;
    try {
      AI_PERSONAS.forEach(function (p) {
        const mockBones = {
          head: new THREE.Group(),
          neck: new THREE.Group(),
          chest: new THREE.Group(),
          upperChest: new THREE.Group(),
          leftHand: new THREE.Group(),
          rightHand: new THREE.Group()
        };
        stage3dVrm.attachVrmPersonaAccessories(mockBones, p.name, true);
      });
    } catch (e) {
      accAttachAll11Ok = false;
    }

    // 3. 11 Signature Dossiers & 3 Club Acquaintance Networks (100% Zero-Leak)
    const dossiersAll11Ok = AI_PERSONAS.every(function (p) {
      const d = getPersonaDossier(p.name);
      return Boolean(d && d.id === p.id && d.clubLabel && d.goodHabit && d.wolfTell && d.silhouetteTag);
    });
    const clubNetOk = Boolean(
      Object.keys(CLUB_ACQUAINTANCE_GROUPS).length === 3 &&
      getClubAcquaintanceRelation("墨白", "阿竹").groupKey === "academy_arts" &&
      getClubAcquaintanceRelation("小澄", "阿朗").groupKey === "debate_trio" &&
      getClubAcquaintanceRelation("阿松", "柚子").groupKey === "mountain_circle" &&
      getClubAcquaintanceRelation("墨白", "阿朗") === null
    );

    // 4. Signature Decision Habits (Zero-Leak Public Signals Only)
    const dXiaochengDiv = getPersonaVotePersonalityDelta({ id: 2, name: "小澄" }, { id: 4, name: "阿松" }, { day: 2, daySpeechEvents: [], divergenceBySeat: { 4: 1 } });
    const dXiaochengClean = getPersonaVotePersonalityDelta({ id: 2, name: "小澄" }, { id: 4, name: "阿松" }, { day: 2, daySpeechEvents: [], divergenceBySeat: {} });
    const dAlangClaim = getPersonaVotePersonalityDelta({ id: 11, name: "阿朗" }, { id: 3, name: "暖暖", claimedRole: "seer" }, { day: 1, daySpeechEvents: [] });
    const dAlangPlain = getPersonaVotePersonalityDelta({ id: 11, name: "阿朗" }, { id: 3, name: "暖暖", claimedRole: null }, { day: 1, daySpeechEvents: [] });
    const dXiaoyunFlip = getPersonaVotePersonalityDelta({ id: 6, name: "小雲" }, { id: 8, name: "晨晨" }, { day: 2, daySpeechEvents: [], flipIds: [8] });
    const dNuannuanPk = getPersonaVotePersonalityDelta({ id: 3, name: "暖暖" }, { id: 4, name: "阿松" }, { day: 1, isPk: true, daySpeechEvents: [] });
    // Academy Arts zero-leak: clean fellow gets 0 anomaly boost; publicly toxic fellow gets amplified boost!
    const dMobaiCleanAzhu = getPersonaVotePersonalityDelta({ id: 9, name: "墨白" }, { id: 7, name: "阿竹" }, { day: 1, daySpeechEvents: [] });
    const dMobaiToxicAzhu = getPersonaVotePersonalityDelta({ id: 9, name: "墨白" }, { id: 7, name: "阿竹" }, { day: 1, daySpeechEvents: [{ speakerId: 7, hasToxicSlip: true }] });
    const dMobaiToxicOther = getPersonaVotePersonalityDelta({ id: 9, name: "墨白" }, { id: 4, name: "阿松" }, { day: 1, daySpeechEvents: [{ speakerId: 4, hasToxicSlip: true }] });
    const goodHabitsOk = Boolean(
      (dXiaochengDiv - dXiaochengClean) >= 20 &&
      (dAlangClaim - dAlangPlain) >= 12 &&
      dXiaoyunFlip >= 16 &&
      dNuannuanPk <= -10 &&
      dMobaiCleanAzhu === 0 &&
      dMobaiToxicAzhu > dMobaiToxicOther
    );

    // Wolf habits: Alang runs for sheriff as wolf; Mobai skips wolf sheriff when not fakeSeer; Chenchen hesitates targeting Youzi; Azhu buses hot wolf mate
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const sAlang = state.match.seats.find(function (s) { return s.name === "阿朗"; });
    const sMobai = state.match.seats.find(function (s) { return s.name === "墨白"; });
    const sChen = state.match.seats.find(function (s) { return s.name === "晨晨"; });
    const sYouzi = state.match.seats.find(function (s) { return s.name === "柚子"; });
    const sAzhu = state.match.seats.find(function (s) { return s.name === "阿竹"; });
    sAlang.role = "wolf"; sAlang.team = "wolf"; sAlang.fakeSeer = false;
    sMobai.role = "wolf"; sMobai.team = "wolf"; sMobai.fakeSeer = false;
    const alangWolfSheriffOk = shouldAiRunForSheriff(sAlang) === true && shouldAiRunForSheriff(sMobai) === false;
    sChen.role = "wolf"; sChen.team = "wolf";
    const chenHesitateTxt = buildPersonaClubAndHabitInsert(sChen, { day: 1, spokenOthers: [], aliveOthers: state.match.seats }, sYouzi, "wolf");
    const sXiaocheng = state.match.seats.find(function (s) { return s.name === "小澄"; });
    const debateBanterTxt = buildPersonaClubAndHabitInsert(sAlang, { day: 1, spokenOthers: [sXiaocheng], aliveOthers: state.match.seats }, sXiaocheng, "suspect");
    const academyArtsTxt = buildPersonaClubAndHabitInsert(sMobai, { day: 1, spokenOthers: [sAzhu], aliveOthers: state.match.seats }, sAzhu, "suspect");
    const clubInsertOk = Boolean(chenHesitateTxt.includes("不好意思") && debateBanterTxt.includes("小澄") && academyArtsTxt.includes("書院雅集"));

    // Azhu wolf bus vote when wolf mate has observable heat >= 62
    state.match.seats.forEach(function (s) { s.role = "villager"; s.team = "good"; s.suspicionMap = {}; });
    sAzhu.role = "wolf"; sAzhu.team = "wolf";
    sChen.role = "wolf"; sChen.team = "wolf";
    state.match.wolfTactic = "standard";
    state.match.daySpeechEvents = [
      { speakerId: 2, accuseId: sChen.id },
      { speakerId: 3, accuseId: sChen.id },
      { speakerId: 4, accuseId: sChen.id },
      { speakerId: 5, accuseId: sChen.id },
      { speakerId: sChen.id, hasToxicSlip: true }
    ];
    sAzhu.suspicionMap[sChen.id] = 85;
    const azhuVotePick = chooseAiVoteTarget(sAzhu, {});
    const azhuWolfBusOk = azhuVotePick === sChen.id;

    // 5. 360 Showcase Unlockable Profile Dossier Card & v17.0 Version
    const u0 = getPersonaDossierUnlockState("墨白", { gamesPlayed: 0 });
    const u1 = getPersonaDossierUnlockState("墨白", { gamesPlayed: 1 });
    const u3 = getPersonaDossierUnlockState("墨白", { gamesPlayed: 3 });
    const dossierUnlockOk = Boolean(
      u0 && !u0.goodUnlocked && !u0.wolfUnlocked &&
      u1 && u1.goodUnlocked && !u1.wolfUnlocked &&
      u3 && u3.goodUnlocked && u3.wolfUnlocked
    );
    stage3d.showcaseTarget = "hero";
    indieFlow.syncShowcaseTargetUi();
    const cardHiddenHero = el("showcaseProfileCard").classList.contains("hidden");
    stage3d.showcaseTarget = String(sMobai.id);
    indieFlow.syncShowcaseTargetUi();
    const cardShownMobai = !el("showcaseProfileCard").classList.contains("hidden") &&
      el("showcaseProfileCard").innerHTML.includes("好人癖好");
    const showcaseCardOk = Boolean(cardHiddenHero && cardShownMobai);
    const diag17 = collectFeedbackDiagnostics();
    const version17Ok = Boolean(diag17 && diag17.version === "v25.9.0");

    // 6. Standard Day-1 Werewolf Order: Sheriff Election FIRST, THEN Night-1 Death Reveal (+ Dead-Sheriff Transfer + Election Explode Settlement)
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = true;
    el("chkGuardMode").checked = false;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidOrd = getPlayerId();
    const pSeatOrd = getPlayerSeat();
    // Night 1: Wolves kill Player Seer (unhealed)
    state.match.day = 1;
    state.match.nightState = { wolfTarget: pidOrd, guardTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    clearStepTimer();
    // MUST enter SHERIFF_ELECTION BEFORE revealing Night-1 death — player is still alive and can run for Sheriff!
    const sheriffBeforeDeathOk = Boolean(
      state.match.phase === "SHERIFF_ELECTION" &&
      state.match.pendingDawnAfterSheriff === true &&
      pSeatOrd.alive === true &&
      (!state.match.nightArchive || state.match.nightArchive.length === 0) &&
      (!state.match.lastNightCasualties || state.match.lastNightCasualties.length === 0)
    );
    // Player runs for Sheriff and wins -> IMMEDIATELY after Sheriff Election ends, Night-1 death triggers -> SHERIFF_TRANSFER -> LAST_WORDS_PLAYER!
    resolveSheriffElectionAction("run");
    const shCtxOrd = state.match.sheriffElectionCtx;
    // Force only player as remaining candidate so player definitely wins Sheriff to test dead-Sheriff transfer!
    shCtxOrd.candidateIds = [pidOrd];
    finalizeSheriffElectionWinner(pidOrd);
    clearStepTimer();
    const postSheriffDeathTransferOk = Boolean(
      pSeatOrd.alive === false &&
      state.match.pendingDawnAfterSheriff === false &&
      state.match.nightArchive.length === 1 &&
      state.match.lastNightCasualties.includes(pidOrd) &&
      state.match.phase === "SHERIFF_TRANSFER"
    );
    const heirOrd = getAliveSeats().find(function (s) { return s.id !== pidOrd; });
    resolvePlayerSheriffTransfer(heirOrd.id);
    clearStepTimer();
    const transferThenLastWordsOk = Boolean(
      state.match.sheriffSeatId === heirOrd.id &&
      state.match.phase === "LAST_WORDS_PLAYER"
    );

    // Wolf self-explodes DURING Day-1 pre-dawn Sheriff Election -> settles pending Night-1 death + forfeits badge + enters Night 2!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "wolf";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidExp = getPlayerId();
    const n1VicExp = getAliveSeats().find(function (s) { return s.team === "good" && s.role === "villager"; });
    state.match.day = 1;
    state.match.nightState = { wolfTarget: n1VicExp.id, guardTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    clearStepTimer();
    const expInElection = state.match.phase === "SHERIFF_ELECTION" && n1VicExp.alive === true && state.match.pendingDawnAfterSheriff === true;
    triggerWolfSelfExplode(pidExp);
    clearStepTimer();
    const explodeSettlesN1Ok = Boolean(
      expInElection &&
      n1VicExp.alive === false &&
      state.match.sheriffSeatId === null &&
      state.match.pendingDawnAfterSheriff === false &&
      state.match.nightArchive.length === 1 &&
      state.match.day === 2
    );

    antiCheatMonitor.strictThrow = prevAntiStrict;
    resetMatchToLobby();

    return {
      gazeResetOk, lanternResetOk, roleGuidesCleanOk, personaIdsOk, mobaiTitleOk,
      stylingAll11Ok, idleArchetypes11Ok, accAttachAll11Ok, dossiersAll11Ok, clubNetOk,
      goodHabitsOk, alangWolfSheriffOk, clubInsertOk, azhuWolfBusOk, dossierUnlockOk,
      showcaseCardOk, version17Ok,
      sheriffBeforeDeathOk, postSheriffDeathTransferOk, transferThenLastWordsOk, explodeSettlesN1Ok
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v170Res)) {
    if (!v) {
      throw new Error("v17.0 Character Identity / 3D Silhouette / Habits check failed for " + k + ": " + JSON.stringify(v170Res));
    }
  }
  const nightSrcV17 = fs.readFileSync(path.join(ROOT, "js/game/night.js"), "utf8");
  const hunterBlockV17 = nightSrcV17.slice(nightSrcV17.indexOf("function executeHunterShotPresentation"), nightSrcV17.indexOf("function executeHunterShotPresentation") + 1500);
  if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(hunterBlockV17)) {
    throw new Error("v17.0 residual emoji detected in executeHunterShotPresentation in js/game/night.js!");
  }
}

// v18.0 SHERIFF 5-BUGFIX SUITE + PITCH-PRESERVED VOICE + 4-STATE MODULATION + 1.25kHz VOCAL CARVE + NARRATIVE SYNC
{
  const v180Res = vm.runInContext(`(() => {
    clearStepTimer();
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    // 1. Bug #5: getPersonaVotePersonalityDelta null safety
    const nullDeltaOk = (getPersonaVotePersonalityDelta(null, null) === 0) &&
      (getPersonaVotePersonalityDelta({ id: 2, name: "小澄" }, null) === 0);

    // 2. Bug #1: 0 candidates / all withdrew -> badgeLost (NEVER awards Seat 1!)
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    state.match.sheriffElectionCtx.candidateIds = [];
    state.match.sheriffElectionCtx.playerRunning = false;
    finalizeSheriffElectionWinner(null);
    const zeroCandLostOk = Boolean(
      state.match.sheriffSeatId === null &&
      state.match.sheriffVoteRecord &&
      state.match.sheriffVoteRecord.badgeLost === true
    );

    // 3. Bug #2: ALL alive seats run for Sheriff (0 under-sheriff voters) -> badgeLost!
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    state.match.sheriffElectionCtx.candidateIds = getAliveSeats().map(function (s) { return s.id; });
    state.match.sheriffElectionCtx.playerRunning = true;
    finalizeSheriffElectionWinner(null);
    const allRunLostOk = Boolean(
      state.match.sheriffSeatId === null &&
      state.match.sheriffVoteRecord &&
      state.match.sheriffVoteRecord.badgeLost === true
    );

    // 4. Bug #3: Wolf self-explodes DURING Day-1 pre-dawn Sheriff Election when Night-1 wolf-killed Hunter -> Hunter STILL gets to shoot before Night 2!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "wolf";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const wSelf18 = getPlayerSeat();
    const hVictim18 = state.match.seats.find(function (s) { return s.role === "hunter" && s.alive; });
    state.match.day = 1;
    state.match.nightState = { wolfTarget: hVictim18.id, guardTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
    resolveDawn();
    clearStepTimer();
    const explodeTriggeredHunter = triggerWolfSelfExplode(wSelf18.id);
    clearStepTimer();
    const explodeHunterCanShootOk = Boolean(
      explodeTriggeredHunter &&
      !hVictim18.alive &&
      state.match.phase === "HUNTER_TRIGGER" &&
      state.match.afterHunterNext === "AFTER_ELECTION_EXPLODE"
    );
    // Finish hunter turn cleanly -> enters Night 2!
    resumeAfterHunter();
    clearStepTimer();
    const explodeHunterThenNight2Ok = state.match.day === 2;

    // 5. Bug #4A: Voted-out Hunter who is ALSO Sheriff shoots -> STILL triggers SHERIFF_TRANSFER before Last Words!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "hunter";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const hShP = getPlayerSeat();
    state.match.day = 2;
    state.match.sheriffElectionPending = false;
    state.match.sheriffSeatId = hShP.id;
    state.match.phase = "DAY_VOTE";
    const shootTgt18 = getAliveSeats().find(function (s) { return s.id !== hShP.id && s.team === "good"; });
    getAliveSeats().forEach(function (s) {
      if (s.id !== hShP.id) { s.publicVoteIntent = hShP.id; s.suspicionMap[hShP.id] = 99; }
    });
    finalizeVoteRound(shootTgt18.id);
    if (state.voteFlight && typeof state.voteFlight.finish === "function") state.voteFlight.finish();
    const votedHunterTrigOk = state.match.phase === "HUNTER_TRIGGER";
    state.selectedSeatId = shootTgt18.id;
    confirmTargetAction();
    if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
    const votedHunterSheriffTransferOk = Boolean(votedHunterTrigOk && state.match.phase === "SHERIFF_TRANSFER");

    // 6. Bug #4B: Sheriff Election Tie -> PK Round -> 2nd Tie = Badge Lost!
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidTie = getPlayerId();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    const aiAliveTie = getAliveSeats().filter(function (s) { return s.id !== pidTie; });
    const candA = aiAliveTie[0];
    const candB = aiAliveTie[1];
    // Set exactly 2 candidates & 2 under-voters (player + 1 AI who prefers candB via suspicion) -> exact 1-1 tie!
    aiAliveTie.slice(3).forEach(function (s) { s.alive = false; });
    const soleAiVoter = aiAliveTie[2];
    soleAiVoter.suspicionMap[candA.id] = 95;
    soleAiVoter.suspicionMap[candB.id] = 5;
    state.match.sheriffElectionCtx.candidateIds = [candA.id, candB.id];
    state.match.sheriffElectionCtx.playerRunning = false;
    state.match.sheriffElectionCtx.stage = "vote";
    const tie1Res = finalizeSheriffElectionWinner(candA.id);
    const firstTieEntersPkOk = Boolean(
      tie1Res === null &&
      state.match.phase === "SHERIFF_ELECTION" &&
      state.match.sheriffElectionCtx &&
      state.match.sheriffElectionCtx.isPkRound === true
    );
    // Second tie on PK round -> Badge Lost!
    finalizeSheriffElectionWinner(candA.id);
    const secondTieLostBadgeOk = Boolean(
      state.match.sheriffSeatId === null &&
      state.match.sheriffVoteRecord &&
      state.match.sheriffVoteRecord.badgeLost === true
    );

    // 7. Voice 4-State Situational Modulation + 48-char buffered clause split + Punctuation-closed Mandarin Lip-Sync
    const longBufText = "各位好夥伴先冷靜一下，我剛才把第一輪到現在所有人的發言跟警下票型全部對照過一輪，覺得三號邏輯最可疑。";
    const split48 = voice.splitMandarinClauses(longBufText, { maxLen: 48 });
    const split48Ok = split48.length <= 2 && split48.every(function (c) { return c.length <= 52; });
    const sitStd = voice.resolveSituationalVoiceState({ id: 2, role: "villager", microPulse: 35 }, "normal");
    const sitFire = voice.resolveSituationalVoiceState({ id: 2, role: "villager", microPulse: 40 }, "panic");
    const prevDayEvents = state.match.daySpeechEvents;
    const prevShCtx = state.match.sheriffElectionCtx;
    state.match.daySpeechEvents = [{ speakerId: 5, checkedWolfId: 2 }];
    const sitCheckedWolf = voice.resolveSituationalVoiceState({ id: 2, role: "villager", microPulse: 35 }, "normal");
    state.match.daySpeechEvents = prevDayEvents;
    state.match.sheriffElectionCtx = { isPkRound: true, candidateIds: [2, 5] };
    const sitSheriffPk = voice.resolveSituationalVoiceState({ id: 2, role: "villager", microPulse: 35 }, "normal");
    state.match.sheriffElectionCtx = prevShCtx;
    const sitWolf = voice.resolveSituationalVoiceState({ id: 3, role: "wolf", microPulse: 78 }, "accuse");
    const sitLw = voice.resolveSituationalVoiceState({ id: 4, role: "seer", microPulse: 20 }, "last_words");
    const sitStatesOk = Boolean(
      sitStd.key === "standard" && sitStd.commaPauseMs === 110 &&
      sitFire.key === "under_fire" && sitFire.rateMul === 1.10 && sitFire.commaPauseMs === 45 &&
      sitCheckedWolf.key === "under_fire" && sitCheckedWolf.rateMul === 1.10 &&
      sitSheriffPk.key === "under_fire" && sitSheriffPk.commaPauseMs === 45 &&
      sitWolf.key === "wolf_nervous" && sitWolf.hesitateBeforeAccuseMs === 240 &&
      sitLw.key === "last_words" && sitLw.rateMul === 0.88 && sitLw.tailFadeSec >= 0.4
    );
    const vComma = sound.computeMandarinCharVowels("，", 100);
    const vPeriod = sound.computeMandarinCharVowels("。", 100);
    const vOpen = sound.computeMandarinCharVowels("好", 100);
    const syllableLipSyncOk = Boolean(vComma.amp === 0 && vPeriod.amp === 0 && vOpen.amp > 0.5 && vOpen.a > 0.5);

    // 8. 1.25kHz Vocal-Carve Mixing + Casualty-Driven BPM Scaling + Dynamic 420ms/950ms Narrative Hold + Anti-Spoiler Timeline
    let lastCarveDb = null;
    let lastBgmGainVal = null;
    const prevBgmG = sound.bgmGain;
    const prevSfxG = sound.sfxGain;
    const prevCarve = sound.bgmVocalCarve;
    const prevDuck = sound.voiceDucking;
    const prevBrief = sound._briefDuckActive;
    sound._briefDuckActive = false;
    sound.bgmGain = { gain: { setTargetAtTime: function (v) { lastBgmGainVal = v; } } };
    sound.sfxGain = { gain: { setTargetAtTime: function () {} } };
    sound.bgmVocalCarve = { type: "peaking", frequency: { value: 1250 }, Q: { value: 0.85 }, gain: { setTargetAtTime: function (v) { lastCarveDb = v; } } };
    sound.voiceDucking = true;
    sound.muted = false;
    sound.bgmVol = 0.6;
    sound.applyVolumes();
    const carveDuckOk = lastCarveDb === -9.0 && Math.abs(lastBgmGainVal - (0.6 * 0.52 * 0.58)) < 0.002;
    sound.voiceDucking = false;
    sound.applyVolumes();
    const carveRestoreOk = lastCarveDb === 0.0;
    sound._briefDuckActive = prevBrief;
    sound.bgmGain = prevBgmG;
    sound.sfxGain = prevSfxG;
    sound.bgmVocalCarve = prevCarve;
    sound.voiceDucking = prevDuck;
    const carveNodeOk = Boolean(carveDuckOk && carveRestoreOk);
    el("selectModeCount").value = "8";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    const bpmAlive8 = sound.getEffectiveBpm("day");
    state.match.seats[1].alive = false;
    state.match.seats[2].alive = false;
    const bpmDead2 = sound.getEffectiveBpm("day");
    const bpmEscalateOk = (bpmDead2 - bpmAlive8) === 8;

    const holdBrief = computeNarrativeHoldMs({ claimRole: null, accuseId: null }, "我目前還沒太多線索，先聽後置位發言。", "normal");
    const holdBomb = computeNarrativeHoldMs({ claimRole: "seer", checkedWolfId: 4 }, "我是明心觀察員，昨晚查殺4號酸民狼！", "claim_seer");
    const narrativeHoldOk = Boolean(holdBrief.ms === 420 && !holdBrief.isBombshell && holdBomb.ms === 950 && holdBomb.isBombshell);

    state.match.logs = [{ kind: "speech", speakerId: 2, pendingReveal: true, title: "02號 · 小澄", subBadge: "", text: "秘密推理台詞全文" }];
    state.activeSpeakerId = 2;
    const prevSpk = voice.speaking;
    voice.speaking = true;
    el("modalJournal").classList.remove("hidden");
    el("journalPaneLog").classList.remove("hidden");
    renderTimeline();
    const maskedHtml = (el("chatTimeline")._children || []).map(function (c) { return c.innerHTML || c.textContent || ""; }).join(" ");
    commitPendingSpeechLog(2);
    const unmaskedHtml = (el("chatTimeline")._children || []).map(function (c) { return c.innerHTML || c.textContent || ""; }).join(" ");
    el("modalJournal").classList.add("hidden");
    voice.speaking = prevSpk;
    const antiSpoilerTimelineOk = Boolean(
      maskedHtml.includes("正在發言中") &&
      !maskedHtml.includes("秘密推理台詞全文") &&
      unmaskedHtml.includes("秘密推理台詞全文")
    );

    antiCheatMonitor.strictThrow = prevAntiStrict;
    resetMatchToLobby();

    return {
      nullDeltaOk, zeroCandLostOk, allRunLostOk, explodeHunterCanShootOk, explodeHunterThenNight2Ok,
      votedHunterSheriffTransferOk, firstTieEntersPkOk, secondTieLostBadgeOk,
      split48Ok, sitStatesOk, syllableLipSyncOk, carveNodeOk, bpmEscalateOk, narrativeHoldOk, antiSpoilerTimelineOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(v180Res)) {
    if (!v) {
      throw new Error("v18.0 Sheriff Bugfix / Audio-Narrative Sync check failed for " + k + ": " + JSON.stringify(v180Res));
    }
  }
  const voiceSrcV18 = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  const serverSrcV18 = fs.readFileSync(path.join(ROOT, "server.py"), "utf8");
  if (!voiceSrcV18.includes("preservesPitch = true") || !serverSrcV18.includes("gemini-2.5-flash-preview-tts")) {
    throw new Error("v18.0 Pitch-preserving preservesPitch or server.py gemini-2.5-flash-preview-tts alignment missing!");
  }
}

// ==================== v19.0 UI CLARITY, QINGMING TEA-ROBE VRM RECOLOR, 3-TIER TYPOGRAPHY & BUGFIX REGRESSION ====================
{
  const v19Html = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const v19Css = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const v19SpotlightSrc = fs.readFileSync(path.join(ROOT, "js/ui/spotlight.js"), "utf8");

  const noLegacySheetOk = Boolean(
    !v19Html.includes("btnToggleHeroSheet") &&
    !v19Html.includes("heroSheetLightbox") &&
    !fs.existsSync(path.join(ROOT, "assets/models/qingming_sheet.jpg"))
  );
  const noSub13HtmlOk = !/\btext-(?:xs|\[(?:[0-9]|1[0-2])(?:\.[0-9]+)?px\])/.test(v19Html);
  const noSub13CssOk = [...v19Css.matchAll(/font-size:\s*([0-9.]+)px/g)].every(m => parseFloat(m[1]) >= 13);
  const nullishHoldOk = v19SpotlightSrc.includes("narrativeHoldMs ?? 720") && v19SpotlightSrc.includes("holdMs ?? 2400") && v19SpotlightSrc.includes("opts.holdMs ?? 2450");

  // Top HUD must contain ONLY 3 visible right-side buttons (Journal, Speed, Menu) & Harmony moved to modalJournal
  const hudMatch = v19Html.match(/id="inGameTopHud"[\s\S]*?id="seatIntelPopover"/);
  const hudSlice = hudMatch ? hudMatch[0] : "";
  const topHud3BtnOk = Boolean(
    hudSlice.includes('id="btnOpenJournal"') &&
    hudSlice.includes('id="btnQuickVoiceSpeed"') &&
    hudSlice.includes('id="btnOpenPauseMenu"') &&
    !hudSlice.includes('id="harmonyBar"') &&
    !hudSlice.includes('id="btnCycleViewHud"') &&
    !hudSlice.includes('id="btnOpenFeedback"')
  );

  const v19Res = vm.runInContext(`(function () {
    const qmStyle = stage3dVrm.getPersonaStyling("清茗");
    const plStyle = stage3dVrm.getPersonaStyling("你");
    const stylingOk = Boolean(
      qmStyle && qmStyle.topsHex && qmStyle.neckHex && qmStyle.bottomsHex && qmStyle.vrmAcc === "tea_host" &&
      plStyle && plStyle.topsHex && plStyle.bottomsHex && !plStyle.baseSlug
    );

    // applyHeroPalette propagates live to VRM recolorSlots + accMats
    let shawlHexSet = null;
    let jadeHexSet = null;
    const fakeHero = {
      paletteKey: "celadon",
      mats: {
        vest: { color: { setHex: function () {} } },
        trim: { color: { setHex: function () {} } },
        tunic: { color: { setHex: function () {} } },
        sleeves: { color: { setHex: function () {} } },
        sash: { color: { setHex: function () {} } },
        trousers: { color: { setHex: function () {} } },
        shoes: { color: { setHex: function () {} } },
        hair: { color: { setHex: function () {} } },
        ribbon: { color: { setHex: function () {} } },
        jade: { color: { setHex: function () {} } }
      },
      vrmAvatar: {
        recolorSlots: [],
        accMats: {
          shawlMat: { color: { setHex: function (h) { shawlHexSet = h; } } },
          jadeMat: { color: { setHex: function (h) { jadeHexSet = h; } } }
        }
      }
    };
    applyHeroPalette(fakeHero, "teagold");
    const heroVrmPalOk = Boolean(fakeHero.paletteKey === "teagold" && shawlHexSet === HERO_VRM_PALETTES.teagold.shawlHex && jadeHexSet === HERO_VRM_PALETTES.teagold.jadeHex);

    // Quick-pass Sheriff Election tie pauses when player is eligible under-voter in PK round
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidQp = getPlayerId();
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    const aiAliveQp = getAliveSeats().filter(function (s) { return s.id !== pidQp; });
    aiAliveQp.slice(4).forEach(function (s) { s.alive = false; });
    const c1 = aiAliveQp[0], c2 = aiAliveQp[1], v1 = aiAliveQp[2], v2 = aiAliveQp[3];
    v1.suspicionMap[c1.id] = 5; v1.suspicionMap[c2.id] = 95;
    v2.suspicionMap[c1.id] = 95; v2.suspicionMap[c2.id] = 5;
    state.match.sheriffElectionCtx.candidateIds = [c1.id, c2.id];
    state.match.sheriffElectionCtx.playerRunning = false;
    state.match.sheriffElectionCtx.stage = "vote";
    const qpTieRes = finalizeSheriffElectionWinner(null, { isQuickPass: true });
    const quickPassPkPauseOk = Boolean(
      qpTieRes === null &&
      state.match.phase === "SHERIFF_ELECTION" &&
      state.match.sheriffElectionCtx &&
      state.match.sheriffElectionCtx.isPkRound === true
    );

    // Voting-phase Seat Intel Popover focuses cleanly on single Confirm Vote CTA
    state.match.phase = "DAY_VOTE";
    const voteTgt = getAliveSeats().find(function (s) { return s.id !== pidQp; });
    openSeatIntel(voteTgt.id);
    const votePopoverSingleCtaOk = Boolean(
      !el("btnIntelQuickAct").classList.contains("hidden") &&
      el("btnIntelQuickAct").textContent.includes("確認投給") &&
      el("intelStanceRow").classList.contains("hidden") &&
      el("intelSkillRow").classList.contains("hidden") &&
      el("btnIntelPokeSeat").classList.contains("hidden")
    );
    closeSeatIntel();

    // Showcase carousel Prev/Next arrows cycle cleanly & hide palette group on non-hero targets
    stage3d.showcaseTarget = "hero";
    indieFlow.syncShowcaseTargetUi();
    const palShownOnHero = !el("showcasePaletteGroup").classList.contains("hidden");
    el("btnShowcaseNext").click();
    const nextMovedToSeat1 = String(stage3d.showcaseTarget) === "1" && el("showcasePaletteGroup").classList.contains("hidden");
    el("btnShowcasePrev").click();
    const prevReturnedHero = String(stage3d.showcaseTarget) === "hero";
    const showcaseCarouselOk = Boolean(palShownOnHero && nextMovedToSeat1 && prevReturnedHero);

    // Feedback modal hides external GitHub handle button
    openFeedbackModal();
    const ghHiddenOk = el("btnOpenGithubFeedback").classList.contains("hidden");
    closeFeedbackModal();

    resetMatchToLobby();
    return {
      stylingOk, heroVrmPalOk, quickPassPkPauseOk, votePopoverSingleCtaOk, showcaseCarouselOk, ghHiddenOk
    };
  })()`, ctx);

  const v19Static = { noLegacySheetOk, noSub13HtmlOk, noSub13CssOk, nullishHoldOk, topHud3BtnOk };
  for (const [k, v] of Object.entries(Object.assign({}, v19Static, v19Res))) {
    if (!v) {
      throw new Error("v19.0 UI CLARITY & RECOLOR REGRESSION failed for " + k + ": " + JSON.stringify(Object.assign({}, v19Static, v19Res)));
    }
  }
}

// v19.1 FULL-STACK QUALITY, ANONYMITY & WEBGL/NETWORK PERFORMANCE AUDIT CHECK
{
  const fbSrc = fs.readFileSync(path.join(ROOT, "js/ui/feedback.js"), "utf8");
  const noAuthorLeakOk = !fbSrc.includes("Sixshoes") && fbSrc.includes('githubOwner: ""');

  const engSrc = fs.readFileSync(path.join(ROOT, "js/stage3d/engine.js"), "utf8");
  const noEngineEmojiOk = !engSrc.includes("🔍");
  const zeroGcCamOk = engSrc.includes("_camRivalAnchors") && !engSrc.includes('seats.filter(function (s) { return s.alive && s.claimedRole === "seer"; })');

  const scriptTags = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)];
  const allScriptsDeferredOk = scriptTags.length >= 52 && scriptTags.every(m => /\bdefer\b/.test(m[0]));
  const nonBlockingFontsOk = html.includes('rel="preload"') && html.includes('as="style"') && html.includes("display=swap");

  const envSrc = fs.readFileSync(path.join(ROOT, "js/stage3d/environment.js"), "utf8");
  const instancedEnvOk = envSrc.includes("THREE.InstancedMesh") && envSrc.includes("buildCourtyardStoneLanternsInstanced") && envSrc.includes("pmrem.dispose");

  const animSrc = fs.readFileSync(path.join(ROOT, "js/stage3d/character-anim.js"), "utf8");
  const faceSigCacheOk = animSrc.includes("_lastFaceSig") && animSrc.includes("faceSig");

  const swSrcPerf = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const swPerfOk = swSrcPerf.includes("sanhao-shell-v25.9.0") && swSrcPerf.includes("sanhao-assets-v25.9.0") && swSrcPerf.includes("MAX_ASSET_ENTRIES") && swSrcPerf.includes("CORE_SHELL_URLS") && swSrcPerf.includes("trimCacheIfNeeded");

  const vercelCfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const vercelFnCfg = vercelCfg && vercelCfg.functions && (vercelCfg.functions["api/*.js"] || vercelCfg.functions["api/gemini.js"]);
  const vercelTimeoutOk = Boolean(vercelFnCfg && vercelFnCfg.maxDuration >= 20);

  const lazyModalOk = vm.runInContext(`(() => {
    el("modalJournal").classList.add("hidden");
    state._timelineDirty = false;
    state._matrixDirty = false;
    renderTimeline({ deferIfHidden: true });
    renderTableMatrixIntoBody({ deferIfHidden: true });
    const skippedWhileHidden = Boolean(state._timelineDirty && state._matrixDirty);
    indieFlow.openJournal("log");
    const flushedOnOpen = Boolean(!state._timelineDirty && !el("modalJournal").classList.contains("hidden"));
    indieFlow.switchJournalTab("matrix");
    const flushedMatrixOnTab = Boolean(!state._matrixDirty);
    el("modalJournal").classList.add("hidden");
    return skippedWhileHidden && flushedOnOpen && flushedMatrixOnTab;
  })()`, ctx);

  const perfRes = {
    noAuthorLeakOk,
    noEngineEmojiOk,
    zeroGcCamOk,
    allScriptsDeferredOk,
    nonBlockingFontsOk,
    instancedEnvOk,
    faceSigCacheOk,
    swPerfOk,
    vercelTimeoutOk,
    lazyModalOk
  };
  for (const [k, v] of Object.entries(perfRes)) {
    if (!v) {
      throw new Error("v19.1 PERFORMANCE & ANONYMITY check failed for " + k + ": " + JSON.stringify(perfRes));
    }
  }
}

// v19.2 INSTANCEDMESH CULLING, EXPLODE PREP ROLLBACK / MID-SPEECH REVEAL, VOICE.STOP & HUNTER-SHERIFF EDGE CASES
{
  const envSrc192 = fs.readFileSync(path.join(ROOT, "js/stage3d/environment.js"), "utf8");
  const frustumCodeOk = envSrc192.includes("im.frustumCulled = false;");

  const v192Res = vm.runInContext(`(() => {
    clearStepTimer();
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = false;

    // 1. InstancedMesh frustumCulled = false
    const testIm = buildInstancedOrGroup(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), [{ px: 0 }, { px: 8 }]);
    const instancedFrustumOk = Boolean(testIm && testIm.isInstancedMesh && testIm.frustumCulled === false);

    // 2. voice.stop() clears prepTimer + speechPrep state
    let prepFired = false;
    voice.prepTimer = setTimeout(function () { prepFired = true; }, 5000);
    state.speechPrepUntil = performance.now() + 5000;
    state.speechPrepSeatId = 3;
    voice.stop();
    const voiceStopPrepOk = Boolean(voice.prepTimer === null && state.speechPrepUntil === 0 && state.speechPrepSeatId === null && !prepFired);

    // 3. addLog preserves pendingReveal & wolf self-explode in 220ms prep beat rolls back unspoken log + speech events + claim
    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    state.match.day = 1;
    state.match.sheriffElectionPending = false;
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];
    const spPrep = state.match.seats.find(function (s) { return s.alive && s.team === "good" && s.id !== getPlayerId(); });
    const wolfExp1 = state.match.seats.find(function (s) { return s.alive && s.role === "wolf"; });
    spPrep.claimedRole = "seer";
    const evPrep = { day: 1, speakerId: spPrep.id, speakerName: spPrep.name, claimRole: "seer", rawText: "未講出口的秘密台詞" };
    state.match.daySpeechEvents.push(evPrep);
    state.match.allSpeechEvents.push(evPrep);
    addLog({ kind: "speech", speakerId: spPrep.id, pendingReveal: true, title: spPrep.id + "號", text: "未講出口的秘密台詞" });
    const logPrepObj = state.match.logs[state.match.logs.length - 1];
    const addLogPendingRevealOk = Boolean(logPrepObj && logPrepObj.pendingReveal === true);
    state.match._activeSpeechCommit = {
      speakerId: spPrep.id,
      day: 1,
      logEntry: logPrepObj,
      evObj: evPrep,
      hadContra: false,
      wasAlreadyClaimed: false,
      prevClaimedRole: null
    };
    state.activeSpeakerId = spPrep.id;
    state.speechPrepSeatId = spPrep.id;
    state.speechPrepUntil = performance.now() + 220;
    const exploded1 = triggerWolfSelfExplode(wolfExp1.id);
    const explodePrepRollbackOk = Boolean(
      exploded1 &&
      state.match.logs.indexOf(logPrepObj) === -1 &&
      state.match.daySpeechEvents.indexOf(evPrep) === -1 &&
      state.match.allSpeechEvents.indexOf(evPrep) === -1 &&
      spPrep.claimedRole === null
    );

    // 4. Wolf self-explode AFTER prep beat (mid-speech) keeps log/events and flips pendingReveal -> false
    el("selectModeCount").value = "8";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.phase = "DAY_SPEECH";
    state.match.day = 1;
    state.match.sheriffElectionPending = false;
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];
    const spMid = state.match.seats.find(function (s) { return s.alive && s.team === "good" && s.id !== getPlayerId(); });
    const wolfExp2 = state.match.seats.find(function (s) { return s.alive && s.role === "wolf"; });
    const evMid = { day: 1, speakerId: spMid.id, speakerName: spMid.name, rawText: "講到一半被掀席的台詞" };
    state.match.daySpeechEvents.push(evMid);
    state.match.allSpeechEvents.push(evMid);
    addLog({ kind: "speech", speakerId: spMid.id, pendingReveal: true, title: spMid.id + "號", text: "講到一半被掀席的台詞" });
    const logMidObj = state.match.logs[state.match.logs.length - 1];
    state.match._activeSpeechCommit = {
      speakerId: spMid.id,
      day: 1,
      logEntry: logMidObj,
      evObj: evMid,
      hadContra: false,
      wasAlreadyClaimed: false,
      prevClaimedRole: null
    };
    state.activeSpeakerId = spMid.id;
    state.speechPrepSeatId = null;
    state.speechPrepUntil = 0;
    voice.prepTimer = null;
    const exploded2 = triggerWolfSelfExplode(wolfExp2.id);
    const explodeMidSpeechRevealOk = Boolean(
      exploded2 &&
      state.match.logs.indexOf(logMidObj) !== -1 &&
      logMidObj.pendingReveal === false &&
      state.match.allSpeechEvents.indexOf(evMid) !== -1
    );

    // 5A. Voted-out AI Hunter who is ALSO Sheriff: shoots first, transfers/tears badge after, NEVER gives badge to shot victim
    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.sheriffElectionPending = false;
    state.match.phase = "DAY_VOTE";
    const aiHunterSh = state.match.seats.find(function (s) { return s.role === "hunter" && s.id !== getPlayerId(); });
    const shotVictimA = state.match.seats.find(function (s) { return s.alive && s.role === "villager" && s.id !== getPlayerId() && s.id !== aiHunterSh.id; });
    state.match.sheriffSeatId = aiHunterSh.id;
    // Make AI hunter strongly trust shotVictimA before shooting so if dead-check were broken it would have picked shotVictimA!
    aiHunterSh.suspicionMap = {};
    state.match.seats.forEach(function (s) { aiHunterSh.suspicionMap[s.id] = s.id === shotVictimA.id ? 5 : 40; });
    aiHunterSh.alive = false;
    state.match.pendingVotedHunterId = aiHunterSh.id;
    triggerHunterResonance(aiHunterSh, "AFTER_VOTE");
    executeHunterShotPresentation(aiHunterSh, shotVictimA);
    if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
    const newShSeatA = state.match.sheriffSeatId ? getSeat(state.match.sheriffSeatId) : null;
    const aiHunterSheriffOk = Boolean(
      !shotVictimA.alive &&
      state.match.sheriffSeatId !== aiHunterSh.id &&
      state.match.sheriffSeatId !== shotVictimA.id &&
      (!newShSeatA || newShSeatA.alive)
    );

    // 5B. Voted-out Player Hunter who is ALSO Sheriff: shoots first -> enters SHERIFF_TRANSFER -> rejects dead victim -> accepts alive heir
    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "hunter";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.sheriffElectionPending = false;
    const pidH = getPlayerId();
    const pHunterSh = getSeat(pidH);
    const shotVictimB = state.match.seats.find(function (s) { return s.alive && s.role === "villager" && s.id !== pidH; });
    const aliveHeirB = state.match.seats.find(function (s) { return s.alive && s.id !== pidH && s.id !== shotVictimB.id; });
    state.match.sheriffSeatId = pidH;
    pHunterSh.alive = false;
    state.match.pendingVotedHunterId = pidH;
    triggerHunterResonance(pHunterSh, "AFTER_VOTE");
    executeHunterShotPresentation(pHunterSh, shotVictimB);
    if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
    const enteredTransferAfterShot = state.match.phase === "SHERIFF_TRANSFER" && state.match.sheriffSeatId === pidH;
    resolvePlayerSheriffTransfer(shotVictimB.id);
    const rejectedDeadVictim = state.match.phase === "SHERIFF_TRANSFER" && state.match.sheriffSeatId === pidH;
    resolvePlayerSheriffTransfer(aliveHeirB.id);
    const passedToAliveHeir = state.match.sheriffSeatId === aliveHeirB.id;
    const playerHunterSheriffOk = Boolean(enteredTransferAfterShot && rejectedDeadVictim && passedToAliveHeir);

    clearStepTimer();
    antiCheatMonitor.strictThrow = prevAntiStrict;
    resetMatchToLobby();

    return {
      instancedFrustumOk,
      voiceStopPrepOk,
      addLogPendingRevealOk,
      explodePrepRollbackOk,
      explodeMidSpeechRevealOk,
      aiHunterSheriffOk,
      playerHunterSheriffOk
    };
  })()`, ctx);

  const v192All = Object.assign({ frustumCodeOk }, v192Res);
  for (const [k, v] of Object.entries(v192All)) {
    if (!v) {
      throw new Error("v19.2 HOTFIX REGRESSION failed for " + k + ": " + JSON.stringify(v192All));
    }
  }
}

// v19.3 FULL-STAGE LIVE GEMINI (SHERIFF / PK / LAST WORDS / INTERJECT / CONFRONTATION / DE-TEMPLATED DAYTIME PROMPT)
{
  const apiGemSrc = fs.readFileSync(path.join(ROOT, "api/gemini.js"), "utf8");
  const clientGemSrc = fs.readFileSync(path.join(ROOT, "js/ai/gemini.js"), "utf8");
  const temp078Ok = apiGemSrc.includes("clampTemperature") && clientGemSrc.includes("GEMINI_TEMP_TIERS") && clientGemSrc.includes("resolveGeminiSpeechTemperature");
  const noFallbackDumpInPromptOk = !clientGemSrc.includes("【本輪基礎戰術參考】");

  const v193Res = await vm.runInContext(`(async () => {
    clearStepTimer();
    const prevAntiStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    el("selectModeCount").value = "8";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [];
    state.match.allSpeechEvents = [];

    const pid193 = getPlayerId();
    const seerSeat = state.match.seats.find(function (s) { return s.role === "seer" && s.id !== pid193; }) || state.match.seats[1];
    const wolfSeat = state.match.seats.find(function (s) { return s.role === "wolf" && s.id !== pid193; });
    const vilSeat = state.match.seats.find(function (s) { return s.role === "villager" && s.id !== pid193; });
    const otherTarget = state.match.seats.find(function (s) { return s.alive && s.id !== seerSeat.id && s.id !== wolfSeat.id && s.id !== vilSeat.id; });

    // 1. Daytime prompt does NOT paste fallbackText verbatim & passes strict Blind-View audit
    const sentinelTemplate = "SENTINEL_TEMPLATE_DO_NOT_COPY_999";
    const dayBuilt = buildBlindGeminiSpeechPrompt(vilSeat, { text: sentinelTemplate, accuseId: wolfSeat.id, vouchId: seerSeat.id });
    const dayDeTemplatedOk = Boolean(dayBuilt && dayBuilt.audit && dayBuilt.audit.ok && !dayBuilt.prompt.includes(sentinelTemplate));

    // 2. All 4 new Blind-View prompt builders pass strict antiCheatMonitor + auditLlmPromptLeak (including Wolf fake-seer!)
    const shPromptSeer = buildBlindGeminiSheriffPrompt(seerSeat, [], { tone: "seer", checkTargetId: vilSeat.id, badgeFlow: { firstTargetId: otherTarget.id, secondTargetId: wolfSeat.id } }, {});
    const shPromptWolf = buildBlindGeminiSheriffPrompt(wolfSeat, [{ id: seerSeat.id, name: seerSeat.name, tag: "強拍明心", text: "昨晚驗了2號金水" }], { tone: "clash", rivalId: seerSeat.id, checkTargetId: vilSeat.id, badgeFlow: { firstTargetId: otherTarget.id, secondTargetId: null } }, {});
    const lwPromptWolf = buildBlindGeminiLastWordsPrompt(wolfSeat, "vote_out", { claimRole: "witch", targetId: otherTarget.id, isWolf: false, isFakeGodBluff: true });
    const intPrompt = buildBlindGeminiInterjectionPrompt(wolfSeat, "你剛剛為什麼幫3號講話？", { tense: true });
    const hcPrompt = buildBlindGeminiConfrontationPrompt(vilSeat, wolfSeat, { wolfPits: [wolfSeat.id, otherTarget.id] });
    const all4AuditsOk = Boolean(
      shPromptSeer && shPromptSeer.audit && shPromptSeer.audit.ok &&
      shPromptWolf && shPromptWolf.audit && shPromptWolf.audit.ok &&
      lwPromptWolf && lwPromptWolf.audit && lwPromptWolf.audit.ok &&
      intPrompt && intPrompt.audit && intPrompt.audit.ok &&
      hcPrompt && hcPrompt.audit && hcPrompt.audit.ok
    );

    // 3. End-to-end live mocked callGeminiText for Sheriff, Last Words, Interjection, Confrontation + guardrails!
    const origCallGemini = callGeminiText;
    const prevHits = orchestrator.stats.geminiHits;
    let mockResponse = "";
    callGeminiText = async function () { return mockResponse; };

    // 3a. Sheriff Seer valid response
    mockResponse = "我這輪直接拍明心觀察員拿警徽，昨晚驗過 " + vilSeat.id + "號是好人，警徽流先看 " + otherTarget.id + "號，大家安心把票交給我。";
    const shLive = await tryGenerateGeminiSheriffSpeech(seerSeat, [], { tone: "seer", checkTargetId: vilSeat.id, badgeFlow: { firstTargetId: otherTarget.id, secondTargetId: null } }, {});
    // 3b. Guardrail blocks wolf self-outing on Sheriff stand
    mockResponse = "其實我是酸民狼，警徽流先看 " + otherTarget.id + "號，拜託投我。";
    const shWolfOutBlocked = (await tryGenerateGeminiSheriffSpeech(wolfSeat, [], { tone: "bold" }, {})) === null;
    // 3c. Guardrail blocks unauthorized God-role claim on non-Seer stand
    mockResponse = "我才是這局真正的滴水奉茶師，警徽請直接交給我來控場。";
    const shUnauthClaimBlocked = (await tryGenerateGeminiSheriffSpeech(vilSeat, [], { tone: "bold" }, {})) === null;
    // 3d. Last words live response
    mockResponse = "我只是清白茶客被誤投離席，大家回頭好好重聽 " + wolfSeat.id + "號剛才帶節奏的話，別再被他騙票了。";
    const lwLive = await tryGenerateGeminiLastWords(vilSeat, "vote_out", { claimRole: null, targetId: wolfSeat.id });
    // 3e. Interjection live reply
    mockResponse = "我只是聽他前段邏輯順口才順帶提一句，後面有矛盾我照樣改票。";
    const intLive = await tryGenerateGeminiInterjectionReply(wolfSeat, "你剛剛為什麼幫他緩頰？", { tense: true });
    // 3f. Hope confrontation live line
    mockResponse = wolfSeat.id + "號你剛才發言避重就輕，照我目前盤下來狼坑就是 " + wolfSeat.id + "號跟 " + otherTarget.id + "號。";
    const hcLive = await tryGenerateGeminiConfrontationLine(vilSeat, wolfSeat, { wolfPits: [wolfSeat.id, otherTarget.id] });

    callGeminiText = origCallGemini;
    const hitsIncreasedOk = (orchestrator.stats.geminiHits - prevHits) >= 4;
    antiCheatMonitor.strictThrow = prevAntiStrict;
    resetMatchToLobby();

    return {
      dayDeTemplatedOk,
      all4AuditsOk,
      shLiveOk: Boolean(shLive && shLive.startsWith("「") && shLive.includes(otherTarget.id + "號")),
      shWolfOutBlocked,
      shUnauthClaimBlocked,
      lwLiveOk: Boolean(lwLive && lwLive.includes(wolfSeat.id + "號")),
      intLiveOk: Boolean(intLive && intLive.length >= 10),
      hcLiveOk: Boolean(hcLive && hcLive.includes(wolfSeat.id + "號")),
      hitsIncreasedOk
    };
  })()`, ctx);

  const v193All = Object.assign({ temp078Ok, noFallbackDumpInPromptOk }, v193Res);
  for (const [k, v] of Object.entries(v193All)) {
    if (!v) {
      throw new Error("v19.3 FULL-STAGE LIVE GEMINI check failed for " + k + ": " + JSON.stringify(v193All));
    }
  }
}

// v20.0 FINAL POLISH & EXPERIENCE UPGRADE VERIFICATION (P0-1..4 + TIERED TEMP + 150s JUDGE SHOWCASE + TURNING AXIS & TRUTH TABLE + ZERO-EMOJI + DOCS)
{
  const emojiGuardRe = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const collectJsFiles = (dir) => {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "vendor") continue;
        out.push(...collectJsFiles(full));
      } else if (ent.name.endsWith(".js")) {
        out.push(full);
      }
    }
    return out;
  };
  const scanTargets = [
    path.join(ROOT, "ai.html"),
    path.join(ROOT, "index.html"),
    path.join(ROOT, "manifest.webmanifest"),
    path.join(ROOT, "sw.js"),
    path.join(ROOT, "server.py"),
    path.join(ROOT, "api/gemini.js"),
    path.join(ROOT, "api/tts.js"),
    path.join(ROOT, "css/theme.css"),
    path.join(ROOT, "css/components.css"),
    path.join(ROOT, "CREDITS.md"),
    path.join(ROOT, "README.md"),
    path.join(ROOT, "docs/作品說明書.md"),
    path.join(ROOT, "docs/三分鐘Demo影片腳本.md"),
    ...collectJsFiles(path.join(ROOT, "js"))
  ];
  const emojiHits = [];
  for (const fp of scanTargets) {
    const raw = fs.readFileSync(fp, "utf8");
    const m = raw.match(emojiGuardRe);
    if (m) emojiHits.push(path.relative(ROOT, fp) + ":" + m[0]);
  }
  const globalZeroEmojiOk = emojiHits.length === 0;

  // Anonymity & Plain Non-AI Copy check across UI + docs + README + CREDITS + manifest + APIs + SW + CSS + server + all JS
  const anonTargets = [
    path.join(ROOT, "ai.html"),
    path.join(ROOT, "index.html"),
    path.join(ROOT, "manifest.webmanifest"),
    path.join(ROOT, "sw.js"),
    path.join(ROOT, "server.py"),
    path.join(ROOT, "api/gemini.js"),
    path.join(ROOT, "api/tts.js"),
    path.join(ROOT, "css/theme.css"),
    path.join(ROOT, "css/components.css"),
    path.join(ROOT, "CREDITS.md"),
    path.join(ROOT, "README.md"),
    path.join(ROOT, "docs/作品說明書.md"),
    path.join(ROOT, "docs/三分鐘Demo影片腳本.md"),
    ...collectJsFiles(path.join(ROOT, "js"))
  ];
  const bannedCopyRe = /Sixshoes|高情商|一句話秒懂|幾秒看懂|瞬間白熱化|史詩級|佛光大學|台灣大學|林美|雲起|linmei|yilan|guishan|龜山島|fgu\.edu\.tw|\bfgu\b|3goodai|chenyiting/i;
  const copyHits = [];
  for (const fp of anonTargets) {
    const raw = fs.readFileSync(fp, "utf8");
    const m = raw.match(bannedCopyRe);
    if (m) copyHits.push(path.relative(ROOT, fp) + ":" + m[0]);
  }
  const anonAndPlainCopyOk = copyHits.length === 0;

  // P0-1: gemini.js must read snap.selfSecretSummary / snap.selfLastCheck instead of direct regulated secret fields
  const gemSrc20 = fs.readFileSync(path.join(ROOT, "js/ai/gemini.js"), "utf8");
  const blindSrc20 = fs.readFileSync(path.join(ROOT, "js/ai/blind-view.js"), "utf8");
  const p01SelfSecretIsolatedOk =
    blindSrc20.includes("selfSecretSummary") &&
    blindSrc20.includes("selfLastCheck") &&
    gemSrc20.includes("snap.selfSecretSummary") &&
    !gemSrc20.includes("self.checkedHistory") &&
    !gemSrc20.includes("self.savedSeatId") &&
    !gemSrc20.includes("self.purifiedSeatId") &&
    !gemSrc20.includes("snap.lastGuardTargetId");

  // P0-2: day-speech.js interjection .then and .catch both guard orchestrator.isEpochValid(epInt) and DAY_SPEECH phase
  const dsSrc20 = fs.readFileSync(path.join(ROOT, "js/game/day-speech.js"), "utf8");
  const interjCallIdx = dsSrc20.lastIndexOf("tryGenerateGeminiInterjectionReply(");
  const interjSlice = interjCallIdx !== -1 ? dsSrc20.slice(interjCallIdx, interjCallIdx + 2800) : "";
  const epochGuardCount = (interjSlice.match(/isEpochValid\(epInt\)/g) || []).length;
  const phaseGuardCount = (interjSlice.match(/phase !== "DAY_SPEECH"/g) || []).length;
  const p02InterjectRaceGuardOk = epochGuardCount >= 3 && phaseGuardCount >= 3;

  // P0-3: Dual-pool sw.js check
  const swSrc20 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const p03DualPoolSwOk =
    swSrc20.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    swSrc20.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    swSrc20.includes("const MAX_ASSET_ENTRIES = 200") &&
    swSrc20.includes("ACTIVE_CACHES.indexOf(k) === -1");

  // v20.0-8: Competition docs 9 sections & <= 5,000 chars + 4-scene 180s storyboard
  const docSpec = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const docScript = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const doc9SectionsOk =
    ["一、作品名稱", "二、AI 工具使用揭露", "三、創作動機", "四、作品內容及主要特色", "五、AI 技術整合方式", "六、開發與五層自動驗證歷程", "七、三好與四給精神", "八、實際教育應用效益", "九、操作與"].every(s => docSpec.includes(s)) &&
    docSpec.length <= 5200 &&
    ["0:00", "0:20", "1:15", "2:15", "舉杯追問", "潤飾籤", "盲視"].every(s => docScript.includes(s));

  // API handler temperature clamping check
  const apiModRes = vm.runInNewContext(`(() => {
    const module = { exports: {} };
    const exports = module.exports;
    ${fs.readFileSync(path.join(ROOT, "api/gemini.js"), "utf8")}
    const fn = module.exports && module.exports._clampTemperature;
    return typeof fn === "function" && fn(0.58) === 0.58 && fn(0.78) === 0.78 && fn(0.2) === 0.45 && fn(1.5) === 0.85 && fn(undefined) === 0.65;
  })()`, { process: { env: {} }, fetch: () => { }, AbortController, setTimeout, clearTimeout, URL });

  // Runtime verification: tiered temp, feedback github button hidden, 150s judge showcase 3-step guide -> instant win -> turning axis + full truth table
  const v20RuntimeRes = await vm.runInContext(`(async () => {
    clearStepTimer();
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    // 1. Tiered temperature resolution + clamping + escapeHtml(0) + Match-Point compact rephrase slips
    const escapeZeroOk = escapeHtml(0) === "0" && escapeHtml("") === "" && escapeHtml(null) === "";
    const tempTierOk =
      escapeZeroOk &&
      resolveGeminiSpeechTemperature("sheriff") === 0.58 &&
      resolveGeminiSpeechTemperature("sheriff_tally") === 0.58 &&
      resolveGeminiSpeechTemperature("dual_seer") === 0.58 &&
      resolveGeminiSpeechTemperature("day_standard") === 0.65 &&
      resolveGeminiSpeechTemperature("interject") === 0.74 &&
      resolveGeminiSpeechTemperature("confrontation") === 0.74 &&
      resolveGeminiSpeechTemperature("pk") === 0.78 &&
      resolveGeminiSpeechTemperature("last_words") === 0.78 &&
      clampGeminiTemperature(0.1) === 0.45 &&
      clampGeminiTemperature(1.2) === 0.85 &&
      clampGeminiTemperature(NaN) === 0.65;

    // 2. Feedback anonymous GitHub button hidden on open AND after submit
    window.localStorage.setItem(FEEDBACK_CONFIG.storageKey, "[]");
    openFeedbackModal();
    const ghHiddenOpen = !canShowFeedbackGithubButton() && el("btnOpenGithubFeedback").classList.contains("hidden");
    el("inputFeedbackBody").value = "v20 測試匿名送出不會露出 GitHub 按鈕";
    await submitUserFeedback();
    const ghHiddenAfterSubmit = el("btnOpenGithubFeedback").classList.contains("hidden");
    closeFeedbackModal();
    const feedbackAnonOk = ghHiddenOpen && ghHiddenAfterSubmit;

    // 3. 150s Judge Showcase Guide: 5 alive match-point, 1x interject, confidence+hope available, 3-step banner transitions & instant game-over
    startJudgeShowcaseMatch();
    clearStepTimer();
    const aliveInit = getAliveSeats().length;
    const snapSelf1 = createBlindMatchSnapshot(getSeat(1), { module: "smoke_v20_self" });
    const selfSecretSnapOk = Boolean(snapSelf1 && typeof snapSelf1.selfSecretSummary === "string" && snapSelf1.selfSecretSummary.includes("4號") && snapSelf1.selfLastCheck && snapSelf1.selfLastCheck.targetId === 4);
    const guideVisibleStep1 = Boolean(
      !el("judgeShowcaseGuideBanner").classList.contains("hidden") &&
      el("judgeGuideStep1").classList.contains("is-active") &&
      aliveInit === 5 &&
      state.match.isMatchPoint === true &&
      state.match.interjectUsedDay === 0 &&
      state.match.fourGivingsUsed.confidence === false &&
      state.match.fourGivingsUsed.hope === false
    );

    // Step 2 transition (DAY_PLAYER_TURN): Match-Point rephrase slips preserve full natural depth (no 28-char choke)
    state.match.phase = "DAY_PLAYER_TURN";
    renderJudgeShowcaseGuideBanner();
    const mpSlips = buildRephraseChoiceSlips("4號別硬拗了快投他！");
    const guideStep2Ok = Boolean(
      el("judgeGuideStep2").classList.contains("is-active") &&
      mpSlips.length === 3 &&
      mpSlips.every(s => s.text && s.text.length >= 16)
    );

    // Step 3 transition (DAY_VOTE) -> cast vote on Seat 4 (last wolf) -> immediate GOOD victory!
    state.match.phase = "DAY_VOTE";
    renderJudgeShowcaseGuideBanner();
    const guideStep3Ok = el("judgeGuideStep3").classList.contains("is-active");

    // Execute instant game-over resolution (eliminate last wolf Seat 4)
    getSeat(4).alive = false;
    getSeat(4).outReason = "投票出局";
    state.match.voteHistory.push({
      day: 2,
      outId: 4,
      ballots: [
        { voterId: 1, targetId: 4, weight: 1.5 },
        { voterId: 2, targetId: 4, weight: 1 },
        { voterId: 3, targetId: 4, weight: 1 },
        { voterId: 4, targetId: 1, weight: 1 },
        { voterId: 5, targetId: 4, weight: 1 }
      ]
    });
    const endedNow = checkAndHandleGameOver();
    clearStepTimer();
    const guideHiddenOnEnd = el("judgeShowcaseGuideBanner").classList.contains("hidden");

    // 4. Upgraded Game-Over panel: Turning Points Axis (up to 3) + Full 8-seat Truth Table + Replay Report
    const tpData = buildMatchTurningPoints();
    const truthRows = buildFullSeatTruthRows();
    const tpHtml = el("gameOverTurningPoints").innerHTML || "";
    const truthHtml = el("gameOverSeatTruthBox").innerHTML || "";
    const replayTxt = buildMatchReplayReport();
    const gameOverReviewOk = Boolean(
      endedNow &&
      state.match.phase === "GAME_OVER" &&
      state.match.winner === "good" &&
      guideHiddenOnEnd &&
      tpData.length >= 2 && tpData.length <= 3 &&
      !el("gameOverTurningPoints").classList.contains("hidden") &&
      tpHtml.includes("本局三大勝負轉折軸") &&
      truthRows.length === 8 &&
      !el("gameOverSeatTruthBox").classList.contains("hidden") &&
      truthHtml.includes("全席底牌與言行對照表") &&
      truthHtml.includes("明心觀察員") &&
      truthHtml.includes("酸民狼") &&
      replayTxt.includes("本局三大勝負轉折軸")
    );

    antiCheatMonitor.strictThrow = prevStrict;
    resetMatchToLobby();
    return { tempTierOk, feedbackAnonOk, selfSecretSnapOk, guideVisibleStep1, guideStep2Ok, guideStep3Ok, gameOverReviewOk };
  })()`, ctx);

  const v20All = Object.assign({
    globalZeroEmojiOk,
    anonAndPlainCopyOk,
    p01SelfSecretIsolatedOk,
    p02InterjectRaceGuardOk,
    p03DualPoolSwOk,
    doc9SectionsOk,
    apiTempClampOk: apiModRes
  }, v20RuntimeRes);
  for (const [k, v] of Object.entries(v20All)) {
    if (!v) {
      throw new Error("v20.0 FINAL VERIFICATION failed for " + k + " | emojiHits=" + JSON.stringify(emojiHits) + " | copyHits=" + JSON.stringify(copyHits) + " | all=" + JSON.stringify(v20All));
    }
  }
}

// ==================== v21.3 MULTI-DEVICE ERGONOMICS & 3-DEVICE INDEPENDENT TUTORIAL CHECK ====================
{
  const v21MultiRes = vm.runInContext(`(() => {
    const prevW = window.innerWidth;
    window.innerWidth = 390;
    const devPhone = detectTutorialDeviceMode();
    window.innerWidth = 820;
    const devTablet = detectTutorialDeviceMode();
    window.innerWidth = 1280;
    const devDesktop = detectTutorialDeviceMode();
    window.innerWidth = prevW;
    const deviceDetectOk = (devPhone === "phone" && devTablet === "tablet" && devDesktop === "desktop");

    const decksOk = Boolean(
      typeof DEVICE_TUTORIAL_DECKS === "object" &&
      Array.isArray(DEVICE_TUTORIAL_DECKS.phone) && DEVICE_TUTORIAL_DECKS.phone.length === 6 &&
      Array.isArray(DEVICE_TUTORIAL_DECKS.tablet) && DEVICE_TUTORIAL_DECKS.tablet.length === 6 &&
      Array.isArray(DEVICE_TUTORIAL_DECKS.desktop) && DEVICE_TUTORIAL_DECKS.desktop.length === 6 &&
      DEVICE_TUTORIAL_DECKS.phone[1].html.includes("清心長老") &&
      DEVICE_TUTORIAL_DECKS.tablet[1].html.includes("清心長老") &&
      DEVICE_TUTORIAL_DECKS.desktop[1].html.includes("清心長老")
    );

    const distinctContentOk = Boolean(
      DEVICE_TUTORIAL_DECKS.phone[2].html.includes("長按") &&
      DEVICE_TUTORIAL_DECKS.phone[2].html.includes("橫滑座位條") &&
      DEVICE_TUTORIAL_DECKS.tablet[2].html.includes("雙手") &&
      DEVICE_TUTORIAL_DECKS.tablet[2].html.includes("頭像拖曳連線") &&
      DEVICE_TUTORIAL_DECKS.desktop[2].html.includes("滑鼠") &&
      DEVICE_TUTORIAL_DECKS.desktop[4].html.includes("Space") &&
      DEVICE_TUTORIAL_DECKS.phone[2].title !== DEVICE_TUTORIAL_DECKS.tablet[2].title &&
      DEVICE_TUTORIAL_DECKS.tablet[2].title !== DEVICE_TUTORIAL_DECKS.desktop[2].title
    );

    // Open tutorial at chapter 3 (idx=2) and switch across all 3 device tabs preserving chapter index
    el("btnOpenTutorial").click();
    el("tutorialStepTabs")._children[2].click();
    const switchChildren = el("tutorialDeviceSwitch")._children;
    const has3SwitchBtns = switchChildren.length === 3;
    switchChildren[0].click(); // phone
    const phoneBodyOk = state.tutorialDevice === "phone" && state.tutorialIndex === 2 && el("tutorialSlideBody").innerHTML.includes("長按");
    switchChildren[1].click(); // tablet
    const tabletBodyOk = state.tutorialDevice === "tablet" && state.tutorialIndex === 2 && el("tutorialSlideBody").innerHTML.includes("頭像拖曳連線");
    switchChildren[2].click(); // desktop
    const desktopBodyOk = state.tutorialDevice === "desktop" && state.tutorialIndex === 2 && el("tutorialSlideBody").innerHTML.includes("滑鼠核心互動");
    el("btnCloseTutorial").click();

    return { deviceDetectOk, decksOk, distinctContentOk, has3SwitchBtns, phoneBodyOk, tabletBodyOk, desktopBodyOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v21MultiRes)) {
    if (!v) {
      throw new Error("v21.3 MULTI-DEVICE TUTORIAL check failed for " + k + ": " + JSON.stringify(v21MultiRes));
    }
  }
}

// ==================== v22.0 ONE-FOCUS VISUAL HIERARCHY & COLLAPSIBLE LISTEN TOOLS CHECK ====================
{
  const v22Res = vm.runInContext(`(() => {
    startGuidedBeginnerMatch();
    el("btnRoleDealConfirm").click();
    state.match.phase = "NIGHT_SEER";
    indieFlow.syncBodyScreenState();
    const nightClassOk = document.body.classList.contains("phase-mode-night") && !document.body.classList.contains("phase-mode-listen");

    state.match.phase = "DAY_SPEECH";
    indieFlow.syncBodyScreenState();
    const listenClassOk = document.body.classList.contains("phase-mode-listen") && !el("listenExtraToolsWrap").classList.contains("is-open");
    el("btnToggleListenTools").click();
    const listenDrawerOpenOk = el("listenExtraToolsWrap").classList.contains("is-open") && el("btnToggleListenTools").getAttribute("aria-expanded") === "true";

    state.match.phase = "DAY_PLAYER_TURN";
    indieFlow.syncBodyScreenState();
    const speakAutoCollapseOk = document.body.classList.contains("phase-mode-speak") && !el("listenExtraToolsWrap").classList.contains("is-open");

    state.match.phase = "DAY_VOTE";
    indieFlow.syncBodyScreenState();
    const voteClassOk = document.body.classList.contains("phase-mode-vote") && !document.body.classList.contains("phase-mode-speak");

    clearStepTimer();
    resetMatchToLobby();
    return { nightClassOk, listenClassOk, listenDrawerOpenOk, speakAutoCollapseOk, voteClassOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v22Res)) {
    if (!v) {
      throw new Error("v22.0 VISUAL HIERARCHY check failed for " + k + ": " + JSON.stringify(v22Res));
    }
  }
}

// ==================== v22.1 DYNAMIC SHERIFF CANDIDATE COUNT & PLAYFUL BLUFF / WITHDRAW CHECK ====================
{
  const v221Res = vm.runInContext(`(() => {
    el("chkSheriffMode").checked = true;
    state.sheriffMode = true;
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();

    // Sample 30 distinct election seeds to confirm candidate count is genuinely variable (NOT fixed to 3!)
    const seenCounts = new Set();
    const seenTones = new Set();
    let alwaysSafeBounds = true;
    for (let s = 1; s <= 30; s++) {
      state.match.sheriffElectionSeed = s * 137 + 19;
      const cands = buildSheriffElectionCandidates();
      seenCounts.add(cands.length);
      if (cands.length < 1 || cands.length > 5) alwaysSafeBounds = false;
      const sampleSpeeches = [];
      cands.forEach(c => {
        const line = buildSheriffCandidateLine(c, sampleSpeeches);
        if (line && line.tone) seenTones.add(line.tone);
        sampleSpeeches.push({ id: c.id, name: c.name, tag: line.tag, tone: line.tone, text: line.text });
      });
    }
    const dynamicCountOk = seenCounts.size >= 3 && alwaysSafeBounds;
    const playfulBluffOk = seenTones.has("bluff") && seenTones.has("playful");

    // Verify player non-seer quick options include playful/bluff withdrawAfter card & clean auto-withdrawal
    const pid = getPlayerId();
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    resolveSheriffElectionAction("run");
    let playerWithdrawCardOk = false;
    let safety = 0;
    while (state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech" && safety < 10) {
      safety += 1;
      const ctxNow = state.match.sheriffElectionCtx;
      if (ctxNow.activeReelSeatId === pid) {
        const wdOpt = (ctxNow.playerQuickOptions || []).find(o => o && o.withdrawAfter);
        if (wdOpt) {
          submitPlayerSheriffSpeech(wdOpt.text, null, { claimsSeer: false, withdrawAfter: true });
          playerWithdrawCardOk = Boolean(
            state.match.sheriffElectionCtx &&
            state.match.sheriffElectionCtx.playerWithdrew === true &&
            !state.match.sheriffElectionCtx.playerRunning &&
            state.match.sheriffElectionCtx.candidateIds.indexOf(pid) === -1
          );
        } else {
          submitPlayerSheriffSpeech("上警隨便聊聊看大家反應！");
        }
      } else {
        advanceSheriffSpeechTurn();
      }
    }
    if (state.match.sheriffElectionCtx) resolveSheriffElectionAction("pass");
    clearStepTimer();
    resetMatchToLobby();
    return {
      dynamicCountOk,
      playfulBluffOk,
      playerWithdrawCardOk,
      countsSeen: Array.from(seenCounts).sort((a, b) => a - b)
    };
  })()`, ctx);

  if (!v221Res.dynamicCountOk || !v221Res.playfulBluffOk || !v221Res.playerWithdrawCardOk) {
    throw new Error("v22.1 DYNAMIC SHERIFF check failed: " + JSON.stringify(v221Res));
  }
}

// ==================== v23.1 ANIMATED DIEGETIC GUIDANCE (以動代文・光影引導) CHECK ====================
{
  const v231Res = vm.runInContext(`(() => {
    resetMatchToLobby();
    updateAllUI();
    const lobbyStartBeckon = el("btnStartMatch").classList.contains("is-guide-beckon");

    // 1. Night Seer: unselected beckons seat strip, selecting valid seat shifts glow to confirm CTA
    el("selectModeCount").value = "6";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = false;
    state.sheriffMode = false;
    startNewGame({ guidedBeginner: true });
    if (typeof indieFlow !== "undefined" && typeof indieFlow.hideRoleDealRitual === "function") {
      indieFlow.hideRoleDealRitual();
    }
    clearStepTimer();
    state.match.phase = "NIGHT_SEER";
    state.seerReveal = null;
    state.selectedSeatId = null;
    updateAllUI();
    const nightUnselectedBeckon = el("seatButtonStrip").classList.contains("is-guide-beckon")
      && !el("btnConfirmTarget").classList.contains("is-guide-ready");
    const targetAlive = getAliveSeats().find(s => s.id !== getPlayerId());
    state.selectedSeatId = targetAlive ? targetAlive.id : 2;
    updateAllUI();
    const nightSelectedReady = !el("seatButtonStrip").classList.contains("is-guide-beckon")
      && el("btnConfirmTarget").classList.contains("is-guide-ready");

    // 2. Day Speak: quick cards beckon, toxic input shifts focus to rephrase tray; zero clunky brackets
    state.match.phase = "DAY_PLAYER_TURN";
    state.rephraseTrayPinned = false;
    if (el("rephraseChoicesTray")) el("rephraseChoicesTray").classList.add("hidden");
    preparePlayerSpeechPanel();
    updateAllUI();
    const speakCardBeckon = el("quickSpeechChips").classList.contains("is-guide-beckon");
    const cleanHeadingOk = !el("playerTurnHeading").textContent.includes("請選牌表態");
    renderRephraseChoicesTray("2號白癡亂玩快滾");
    const rephraseFocusOk = el("rephraseChoicesTray").classList.contains("is-guide-focus")
      && !el("quickSpeechChips").classList.contains("is-guide-beckon");

    // 3. Day Vote + 2-Petal Lotus Synergy -> Four-Givings pouch beckons automatically!
    state.match.phase = "DAY_VOTE";
    state.match.threeGood = { heart: 1, words: 1, deeds: 0, resonanceTriggered: false };
    state.match.goodwillVoteBonus = false;
    state.selectedSeatId = null;
    updateAllUI();
    const voteUnselectedOk = el("seatButtonStrip").classList.contains("is-guide-beckon")
      && !el("btnCastVote").classList.contains("is-guide-ready");
    const fourGBeckonOk = el("cornerFourGDeck").classList.contains("is-guide-beckon");
    const cleanVoteBadgeOk = !el("voteGoodwillBadge").textContent.includes("右側四給卡即可");
    state.selectedSeatId = targetAlive ? targetAlive.id : 2;
    updateAllUI();
    const voteSelectedReady = !el("seatButtonStrip").classList.contains("is-guide-beckon")
      && el("btnCastVote").classList.contains("is-guide-ready");

    // 4. Tutorial animated gesture visualizers across all 3 devices
    const phoneAnimOk = DEVICE_TUTORIAL_DECKS.phone[2].html.includes("tut-anim-stage");
    const tabletAnimOk = DEVICE_TUTORIAL_DECKS.tablet[2].html.includes("tut-anim-stage");
    const desktopAnimOk = DEVICE_TUTORIAL_DECKS.desktop[2].html.includes("tut-anim-stage")
      && DEVICE_TUTORIAL_DECKS.desktop[4].html.includes("tut-anim-key");

    resetMatchToLobby();
    return {
      lobbyStartBeckon,
      nightUnselectedBeckon,
      nightSelectedReady,
      speakCardBeckon,
      cleanHeadingOk,
      rephraseFocusOk,
      voteUnselectedOk,
      fourGBeckonOk,
      cleanVoteBadgeOk,
      voteSelectedReady,
      phoneAnimOk,
      tabletAnimOk,
      desktopAnimOk
    };
  })()`, ctx);

  const failedV231 = Object.entries(v231Res).filter(([, v]) => !v);
  if (failedV231.length > 0) {
    throw new Error("v23.1 ANIMATED DIEGETIC GUIDANCE check failed: " + JSON.stringify(v231Res));
  }
}

// ==================== v23.2 WEREWOLF JARGON DOTTED UNDERLINE & POPOVER CHECK ====================
{
  const v232Res = vm.runInContext(`(() => {
    const countOk = Array.isArray(WEREWOLF_JARGON_GLOSSARY) && WEREWOLF_JARGON_GLOSSARY.length >= 40;
    const mustTerms = ["查殺", "金水", "銀水", "悍跳", "對跳", "警徽流", "退水", "歸票", "狼坑", "好人坑", "站邊", "倒鉤", "深水", "抗推", "同守同救", "破盾", "PK", "自爆"];
    const lookupAllOk = mustTerms.every(t => {
      const e = lookupWerewolfJargon(t);
      return Boolean(e && e.term && e.plain && e.plain.length >= 10);
    });

    // XSS safety + dotted underline wrapping
    const xssAnnotated = annotateJargonPlainText('<img src=x onerror=alert(1)>這人悍跳還留警徽流想歸票');
    const xssSafeOk = !xssAnnotated.includes("<img")
      && xssAnnotated.includes('data-jargon="悍跳"')
      && xssAnnotated.includes('data-jargon="警徽流"')
      && xssAnnotated.includes('data-jargon="歸票"');

    // Spotlight integrates both role-clue tokens (查殺) and jargon-term spans (警徽流 / 悍跳)
    state.match.started = true;
    state.match.day = 1;
    renderInteractiveSpotlightText("這輪我報 3號 查殺，昨晚留了警徽流，別信對面悍跳！", { id: 2, name: "小澄" }, false);
    const spotHtml = String(el("spotlightText").innerHTML || "");
    const spotlightIntegratedOk = spotHtml.includes('clue-role')
      && spotHtml.includes('data-jargon="查殺"')
      && spotHtml.includes('class="jargon-term" data-jargon="警徽流"')
      && spotHtml.includes('class="jargon-term" data-jargon="悍跳"');

    // Popover open/close flow
    const opened = showJargonPopover(null, "警徽流", { pin: true });
    const popVisibleOk = opened
      && !el("jargonTooltipPopover").classList.contains("hidden")
      && el("jargonTipTerm").textContent === "警徽流"
      && el("jargonTipPlain").textContent.includes("暗號");
    hideJargonPopover();
    const popClosedOk = el("jargonTooltipPopover").classList.contains("hidden");

    resetMatchToLobby();
    return {
      countOk,
      lookupAllOk,
      xssSafeOk,
      spotlightIntegratedOk,
      popVisibleOk,
      popClosedOk
    };
  })()`, ctx);

  const failedV232 = Object.entries(v232Res).filter(([, v]) => !v);
  if (failedV232.length > 0) {
    throw new Error("v23.2 WEREWOLF JARGON check failed: " + JSON.stringify(v232Res));
  }
}

// ==================== v23.3 FULL XUAN-PAPER CONTRAST & DESKTOP PC PERFORMANCE CHECK ====================
{
  const compCss233 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const envJs233 = fs.readFileSync(path.join(ROOT, "js/stage3d/environment.js"), "utf8");
  const v233CssChecks = {
    classicalDaylightInkOk: compCss233.includes("body.craft-ui.theme-daylight #spotlightStageBox.is-classical-speech #spotlightText"),
    sheriffPillDaylightOk: compCss233.includes("body.craft-ui.theme-daylight .sheriff-order-pill.is-speaking"),
    wolfBarDaylightOk: compCss233.includes("body.craft-ui.theme-daylight .wolf-explode-bar"),
    clueRoleDaylightOk: compCss233.includes("body.craft-ui.theme-daylight .clue-role"),
    gpuOnlySeatWaveOk: compCss233.includes("@keyframes teaSeatWaveFloat") && !compCss233.includes("@keyframes teaSeatWaveDay"),
    gpuOnlyReadyPulseOk: compCss233.includes("@keyframes teaReadyRingRipple") && !compCss233.includes("@keyframes teaReadyPulseCinnabar"),
    skyOverdrawCullOk: envJs233.includes("env.skyPhotoDayMesh.visible = dayOp > 0.005") && envJs233.includes("env.skyMesh.visible = Math.max")
  };
  const failedV233Css = Object.entries(v233CssChecks).filter(([, v]) => !v);
  if (failedV233Css.length > 0) {
    throw new Error("v23.3 CSS/SKY check failed: " + JSON.stringify(v233CssChecks));
  }

  const v233Runtime = vm.runInContext(`(() => {
    const pCoreUltra = stage3d.detectGpuProfile(null, "ANGLE (Intel, Intel(R) Graphics Direct3D11 vs_5_0 ps_5_0)");
    const pArcIgpu = stage3d.detectGpuProfile(null, "ANGLE (Intel, Intel(R) Arc(TM) Graphics Direct3D11 vs_5_0 ps_5_0)");
    const pRyzen780m = stage3d.detectGpuProfile(null, "ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11 vs_5_0 ps_5_0)");
    const pArcDgpu = stage3d.detectGpuProfile(null, "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0)");
    const pRxDgpu = stage3d.detectGpuProfile(null, "ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0)");
    const pRtxDgpu = stage3d.detectGpuProfile(null, "ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 Direct3D11 vs_5_0 ps_5_0)");
    return {
      coreUltraIgpuOk: pCoreUltra.isIntegratedGpu === true,
      arcIgpuOk: pArcIgpu.isIntegratedGpu === true,
      ryzen780mIgpuOk: pRyzen780m.isIntegratedGpu === true,
      arcDiscreteOk: pArcDgpu.isIntegratedGpu === false,
      rxDiscreteOk: pRxDgpu.isIntegratedGpu === false,
      rtxDiscreteOk: pRtxDgpu.isIntegratedGpu === false,
      jargonMutationGuardOk: typeof jargonTooltipState === "object" && "isMutating" in jargonTooltipState && "scanTimer" in jargonTooltipState
    };
  })()`, ctx);
  const failedV233Run = Object.entries(v233Runtime).filter(([, v]) => !v);
  if (failedV233Run.length > 0) {
    throw new Error("v23.3 RUNTIME check failed: " + JSON.stringify(v233Runtime));
  }
}

// ==================== v24.0 CONSOLIDATED FINAL AUDIT & POLISH CHECK ====================
{
  const showcaseDir = path.join(ROOT, "assets/voice_pack/showcase");
  const expectedMp3s = [
    "showcase_asong_day2.mp3",
    "showcase_asong_grill_flip.mp3",
    "showcase_asong_grill_defend.mp3",
    "showcase_asong_lw.mp3",
    "showcase_xiaocheng_d2.mp3",
    "showcase_nuannuan_d2.mp3",
    "showcase_xinger_d2.mp3",
    "showcase_host_good_win.mp3"
  ];
  const mp3Ok = expectedMp3s.every((fn) => {
    const fp = path.join(showcaseDir, fn);
    return fs.existsSync(fp) && fs.statSync(fp).size >= 10000;
  });

  const compCss240 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const envJs240 = fs.readFileSync(path.join(ROOT, "js/stage3d/environment.js"), "utf8");
  const reactJs240 = fs.readFileSync(path.join(ROOT, "js/ai/reactions.js"), "utf8");

  const v240Static = {
    mp3PackPresentOk: mp3Ok,
    desktopGridCenterOk: compCss240.includes("grid-template-columns: 240px minmax(0, 1fr) 240px"),
    daylightSpectatorBarOk: compCss240.includes("body.craft-ui.theme-daylight .spectator-guess-bar"),
    daytimeFocusDimOk: envJs240.includes("activeSpeakingNow") && envJs240.includes("targetFocusDim"),
    zeroDoubleBangCommentOk: !reactJs240.includes("Wolf!!")
  };
  const failedV240Static = Object.entries(v240Static).filter(([, v]) => !v);
  if (failedV240Static.length > 0) {
    throw new Error("v24.0 STATIC check failed: " + JSON.stringify(v240Static));
  }

  const v240Runtime = vm.runInContext(`(() => {
    // 1. Showcase voice pack lookup
    const uDay2 = voice.lookupBundledVoicePackUrl("阿松", "各位別急著一面倒啊，昨天 7號怎麼投票是他的事，跟我無關！我才是一路扛壓的真明心觀察員，昨夜查了 1號，他才是穿我衣服的假觀察員，這輪聽我一次，先出 5號或 1號，過。");
    const uGrill = voice.lookupBundledVoicePackUrl("阿松", "盤面剛變了嘛，我照新線索調整很正常啊。");
    const uLw = voice.lookupBundledVoicePackUrl("阿松", "唉，算你們票型對得夠細，昨晚 7號被請離後我本來想再硬扛一輪的。這局輸得心服口服，茶席推論確實精彩！");
    const uHost = voice.lookupBundledVoicePackUrl("主持", "全場酸民狼已清出茶席，好人陣營大獲全勝，恭喜各位守住清茗茶席！");
    const showcaseLookupOk = uDay2 === "assets/voice_pack/showcase/showcase_asong_day2.mp3"
      && uGrill === "assets/voice_pack/showcase/showcase_asong_grill_flip.mp3"
      && uLw === "assets/voice_pack/showcase/showcase_asong_lw.mp3"
      && uHost === "assets/voice_pack/showcase/showcase_host_good_win.mp3";

    // 2. Bug #1: Static cloud host detector & 404 latch
    const origHost = window.location.hostname;
    window.location.hostname = "sanhao-ai-werewolf.vercel.app";
    const vercelDetected = voice.isStaticCloudHost() === true;
    window.location.hostname = "127.0.0.1";
    const localhostNotStatic = voice.isStaticCloudHost() === false;
    window.location.hostname = origHost;
    voice._localTtsEndpointUnavailable = true;
    voice.localNeuralAvailable = true;
    const prevFetch = globalThis.fetch;
    let fetchHits = 0;
    globalThis.fetch = function () { fetchHits++; return Promise.resolve({ ok: false, status: 404 }); };
    voice._fetchLocalNeuralAudio("阿松", "測試", "normal");
    const latchSkippedFetch = fetchHits === 0;
    globalThis.fetch = prevFetch;
    voice._localTtsEndpointUnavailable = false;
    voice.localNeuralAvailable = false;

    // 3. Bug #3 & #5b: Sheriff election candidate cap preserves Seer + fakeSeer & skips when alive <= 3
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    startNewGame();
    state.match.seats.forEach((s, i) => { s.alive = i < 3; });
    const skipLowAliveOk = buildSheriffElectionCandidates().length === 0;
    const pid3 = getPlayerId();
    state.match.seats.forEach((s) => { s.alive = true; s.role = "villager"; s.team = "good"; s.fakeSeer = false; });
    const ai3 = state.match.seats.filter((s) => s.id !== pid3);
    ai3[0].role = "seer";
    ai3[1].role = "wolf"; ai3[1].team = "wolf"; ai3[1].fakeSeer = true;
    ai3[2].role = "wolf"; ai3[2].team = "wolf";
    const origShouldRun = shouldAiRunForSheriff;
    shouldAiRunForSheriff = () => true; // Force 7 AI candidates > hardMax(5)
    const cands8 = buildSheriffElectionCandidates();
    shouldAiRunForSheriff = origShouldRun;
    const cand8Ids = cands8.map((c) => c.id);
    const preservesSeerAndFake = cands8.length === 5 && cand8Ids.includes(ai3[0].id) && cand8Ids.includes(ai3[1].id);

    // 4. Bug #4: Fast Sheriff election persistent tie results in badge loss (winnerId === null)
    state.sheriffMode = true;
    state.match.sheriffElectionPending = true;
    state.match.day = 1;
    const pSeat4 = getPlayerSeat();
    pSeat4.alive = false; // Player dead -> fast auto branch
    ai3.forEach((s, idx) => {
      s.alive = idx < 6; // 6 alive AI seats (2 candidates + 4 voters)
      s.role = idx === 0 ? "seer" : (idx === 1 ? "wolf" : "villager");
      s.team = idx === 1 ? "wolf" : "good";
      s.fakeSeer = idx === 1;
      s.claimedRole = (idx === 0 || idx === 1) ? "seer" : null;
    });
    const candA4 = ai3[0];
    const candB4 = ai3[1];
    const voterOrder4 = [ai3[2].id, ai3[3].id, ai3[4].id, ai3[5].id];
    const oldBuildCands = buildSheriffElectionCandidates;
    const oldChooseVote = chooseAiSheriffElectionVote;
    buildSheriffElectionCandidates = () => [candA4, candB4];
    chooseAiSheriffElectionVote = (voter) => (voterOrder4.indexOf(voter.id) % 2 === 0 ? candA4.id : candB4.id); // Exact 2-2 tie twice!
    startSheriffElection();
    buildSheriffElectionCandidates = oldBuildCands;
    chooseAiSheriffElectionVote = oldChooseVote;
    const sheriffTieResolvedOk = Boolean(
      state.match.sheriffVoteRecord &&
      state.match.sheriffVoteRecord.winnerId === null &&
      state.match.sheriffVoteRecord.badgeLost === true &&
      state.match.sheriffVoteRecord.badgeLostReason === "警上二次平票"
    );

    // 4B. Bug #2: Hope Confrontation does not steal 15s countdown while hydrating Gemini lines
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    state.match.phase = "DAY_SPEECH";
    state.match.fourGivingsUsed.hope = false;
    const aiHope = state.match.seats.filter((s) => s.alive && s.id !== getPlayerId());
    const origExtLlm = isExternalLlmActive;
    const origGenHope = tryGenerateGeminiConfrontationLine;
    isExternalLlmActive = () => true;
    tryGenerateGeminiConfrontationLine = () => new Promise(() => {}); // Stays pending during check
    executeHopeConfrontation(aiHope[0].id, aiHope[1].id);
    const hopeHydrateOk = Boolean(
      state.match.hopeConfrontation &&
      state.match.hopeConfrontation.hydrating === true &&
      state.match.hopeConfrontation.secondsLeft === 15 &&
      !state.hopeConfrontInterval
    );
    closeHopeConfrontationModal();
    isExternalLlmActive = origExtLlm;
    tryGenerateGeminiConfrontationLine = origGenHope;

    // 5. Bug #5a: Custom name HTML escaping in Spotlight
    const evilSeat = state.match.seats[0];
    const prevName = evilSeat.name;
    evilSeat.name = "<img src=x onerror=alert(1)>";
    renderInteractiveSpotlightText("我看 1號 <img src=x onerror=alert(1)> 很可疑！", state.match.seats[1], false);
    const evilHtml = String(el("spotlightText").innerHTML || "");
    const xssSpotSafeOk = !evilHtml.includes("<img") && evilHtml.includes("&lt;img");
    evilSeat.name = prevName;

    // 6. True Deferred Speech Log + Bombshell 950ms / Brief Pass 420ms
    const logsBeforeDef = state.match.logs.length;
    state.match._deferredSpeechLog = {
      speakerId: 4,
      day: 2,
      entry: { kind: "speech", useTypewriter: true, pendingReveal: false, speakerId: 4, title: "04號 · 阿松", subBadge: "老練", text: "延遲寫入測試" }
    };
    const heldBeforeCommit = state.match.logs.length === logsBeforeDef;
    commitPendingSpeechLog(4);
    const flushedAfterCommit = state.match.logs.length === logsBeforeDef + 1
      && state.match._deferredSpeechLog === null
      && state.match.logs[state.match.logs.length - 1].text === "延遲寫入測試";
    const bombHold = computeNarrativeHoldMs(null, "我現在直接拍身分，昨天查殺4號！", "normal");
    const briefHold = computeNarrativeHoldMs(null, "我好人，先聽後置位，過。", "normal");
    const narrativeBeatsOk = bombHold.ms === 950 && bombHold.isBombshell === true && briefHold.ms === 420;

    // 7. Phoneme-aware Mandarin vowel aperture lip-sync
    const vA = sound.computeMandarinCharVowels("查", 100);
    const vO = sound.computeMandarinCharVowels("我", 100);
    const vU = sound.computeMandarinCharVowels("出", 100);
    const vI = sound.computeMandarinCharVowels("你", 100);
    const vE = sound.computeMandarinCharVowels("這", 100);
    const vSil = sound.computeMandarinCharVowels("。", 100);
    const vowelLipSyncOk = vA.a > vA.u && vO.o > vO.i && vU.u > vU.a && vI.i > vI.o && vE.e > vE.u && vSil.amp === 0;

    // 8. Dead human wolf does NOT trigger broken isPlayerPushScript
    el("selectModeCount").value = "12";
    el("selectPreferredRole").value = "wolf";
    startNewGame();
    const pWolf = getPlayerSeat();
    pWolf.alive = false;
    const aliveMate = state.match.seats.find((s) => s.alive && s.team === "wolf" && s.id !== pWolf.id);
    const aliveGood = state.match.seats.find((s) => s.alive && s.team === "good");
    state.match.day = 4;
    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [
      { day: 4, speakerId: pWolf.id, accuseId: aliveGood.id, rawText: "投他" }
    ];
    const mateSpeech = buildHeuristicAiSpeech(aliveMate);
    const deadWolfNoEchoOk = !String(mateSpeech && mateSpeech.text || "").includes("我也跟 " + pWolf.id + "號你 有同感");

    resetMatchToLobby();
    return {
      showcaseLookupOk,
      vercelDetected,
      localhostNotStatic,
      latchSkippedFetch,
      skipLowAliveOk,
      preservesSeerAndFake,
      sheriffTieResolvedOk,
      hopeHydrateOk,
      xssSpotSafeOk,
      heldBeforeCommit,
      flushedAfterCommit,
      narrativeBeatsOk,
      vowelLipSyncOk,
      deadWolfNoEchoOk
    };
  })()`, ctx);

  const failedV240Run = Object.entries(v240Runtime).filter(([, v]) => !v);
  if (failedV240Run.length > 0) {
    throw new Error("v24.0 RUNTIME check failed: " + JSON.stringify(v240Runtime));
  }

  // ==================== v24.1 + v24.2 RELEASE-FREEZE CHECK ====================
  const voiceSrc241 = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  const dsSrc241 = fs.readFileSync(path.join(ROOT, "js/game/day-speech.js"), "utf8");
  const docSpec241 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const docScript241 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const apiGem242 = fs.readFileSync(path.join(ROOT, "api/gemini.js"), "utf8");
  const eng242 = fs.readFileSync(path.join(ROOT, "js/stage3d/engine.js"), "utf8");
  const setup242 = fs.readFileSync(path.join(ROOT, "js/game/setup.js"), "utf8");
  const srv242 = fs.readFileSync(path.join(ROOT, "server.py"), "utf8");
  const snd242 = fs.readFileSync(path.join(ROOT, "js/audio/soundtrack.js"), "utf8");
  const ev242 = fs.readFileSync(path.join(ROOT, "js/events/game-events.js"), "utf8");

  const v242Res = vm.runInContext(`(() => {
    const mapKeys = Object.keys(SHOWCASE_VOICE_PACK_MAP);
    const mapVals = Object.values(SHOWCASE_VOICE_PACK_MAP);
    const unique1to1Ok = mapKeys.length === 8 && new Set(mapVals).size === 8;
    const zhNumLookupOk = voice.lookupBundledVoicePackUrl("阿松", "各位別急著一面倒啊，昨天七號怎麼投票是他的事，跟我無關！我才是一路扛壓的真明心觀察員，昨夜查了一號，他才是穿我衣服的假觀察員，這輪聽我一次，先出五號或一號，過。") === "assets/voice_pack/showcase/showcase_asong_day2.mp3"
      && voice.lookupBundledVoicePackUrl("阿松", "唉，算你們票型對得夠細，昨晚七號被請離後我本來想再硬扛一輪的。這局輸得心服口服，茶席推論確實精彩！") === "assets/voice_pack/showcase/showcase_asong_lw.mp3";

    // v24.2 P0: Blitz / Double-click finalizeVoteRound race test — calling twice MUST only add 1 voteHistory record!
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    startNewGame();
    state.match.variantMode = "blitz_3m";
    startVotingPhase();
    const validTgt = state.match.seats.find((s) => s.alive && s.id !== getPlayerId());
    const histBefore = state.match.voteHistory.length;
    finalizeVoteRound(validTgt.id);
    finalizeVoteRound(validTgt.id); // Simulated simultaneous blitz-timer + manual double click
    if (state.voteFlight && typeof state.voteFlight.finish === "function") state.voteFlight.finish();
    const doubleVoteBlockedOk = state.match.voteHistory.length === histBefore + 1;
    resetMatchToLobby();

    return { unique1to1Ok, zhNumLookupOk, doubleVoteBlockedOk };
  })()`, ctx);

  const v242Checks = {
    unique1to1Ok: v242Res.unique1to1Ok,
    zhNumLookupOk: v242Res.zhNumLookupOk,
    doubleVoteBlockedOk: v242Res.doubleVoteBlockedOk,
    sameSeatFlushUnconditionalOk: dsSrc241.includes('if (state.match._deferredSpeechLog && typeof commitPendingSpeechLog === "function")')
      && !dsSrc241.includes("state.match._deferredSpeechLog.speakerId !== speaker.id"),
    docCleanNoBannerOk: !fs.existsSync(path.join(ROOT, "docs/作品說明書_初稿.md")) && !docSpec241.includes("轉 PDF 前請刪除本區塊") && docSpec241.includes("sanhao-assets-v25.9.0") && docSpec241.includes("茶席術語箋") && docSpec241.includes("神經語音包") && docSpec241.includes("50 支前端 JS") && docSpec241.length <= 5000,
    scriptV242Ok: docScript241.includes("v25.9.0") && docScript241.includes("茶席術語箋") && docScript241.includes("預錄台灣神經語音包") && !docScript241.includes("林美"),
    voiceNoDupKeyLiteralOk: (voiceSrc241.match(/showcase_asong_day2\.mp3/g) || []).length === 1 && (voiceSrc241.match(/showcase_asong_lw\.mp3/g) || []).length === 1,
    apiTimeout8400AndLruOk: apiGem242.includes("resolvePrimaryTimeoutMs(primaryModel)") && apiGem242.includes("21500 - elapsed") && apiGem242.includes("if (++evicted >= 200) break;") && apiGem242.includes("if (timer) clearTimeout(timer);"),
    webglContextLostOk: eng242.includes('canvas3d.addEventListener("webglcontextlost"'),
    showcaseOrchestratorBootOk: setup242.includes('orchestrator.schedule("showcase_boot"'),
    serverSafeLockPruneOk: srv242.includes("if not v.locked()") && srv242.includes("with _TTS_LOCKS_GUARD:"),
    audioDisconnectAndMobileVpOk: snd242.includes("osc.disconnect(); gain.disconnect();") && ev242.includes("window.visualViewport")
  };
  const failedV242 = Object.entries(v242Checks).filter(([, v]) => !v);
  if (failedV242.length > 0) {
    throw new Error("v24.2 RELEASE-FREEZE check failed: " + JSON.stringify(v242Checks));
  }

  // ==================== v24.2.2 AI ENGINE MODAL 4-MODE CARDS, CLOUD MODEL SWITCH & LIVE PROBE CHECK ====================
  const prevFetch2422 = ctx.fetch;
  const prevProto2422 = ctx.location.protocol;
  ctx.location.protocol = "https:";
  let capturedProxyModel = "";
  let mockProxyAvailable = true;
  ctx.fetch = async (url, opts) => {
    const u = String(url || "");
    const method = (opts && opts.method) ? String(opts.method).toUpperCase() : "GET";
    if (u === "/api/gemini" && method === "GET") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, available: mockProxyAvailable, model: "gemini-3.5-flash-lite", supportedModels: ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash-lite"], mode: "local-server-proxy" })
      };
    }
    if (u === "/api/gemini" && method === "POST") {
      const parsed = JSON.parse(String((opts && opts.body) || "{}"));
      capturedProxyModel = parsed.model || "";
      if (!mockProxyAvailable) {
        return { ok: false, status: 503, json: async () => ({ ok: false, error: "Server Gemini proxy not configured" }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, model: parsed.model || "gemini-3.5-flash-lite", text: "連線成功" }) };
    }
    if (u === "/api/local-llm/status") {
      return { ok: true, status: 200, json: async () => ({ ok: true, running: false, models: [] }) };
    }
    return prevFetch2422 ? prevFetch2422(url, opts) : { ok: false, status: 404, json: async () => ({}) };
  };
  const flushAsync2422 = () => new Promise(r => setTimeout(r, 30));
  const keyPaneOpenOk = vm.runInContext(`(() => {
    el("btnOpenAiModal").click();
    el("btnAiModeKey").click();
    return el("btnAiModeKey").classList.contains("is-active")
      && !el("aiPaneKey").classList.contains("hidden")
      && el("aiPaneCloud").classList.contains("hidden")
      && el("aiPaneOllama").classList.contains("hidden")
      && el("aiPaneOffline").classList.contains("hidden");
  })()`, ctx);

  const revBefore2422 = vm.runInContext(`(() => {
    el("btnAiModeCloud").click();
    el("btnCloudModelLite").click();
    const rev = state.match.tableStateRev || 0;
    el("btnSaveApiKey").click();
    return rev;
  })()`, ctx);
  await flushAsync2422();
  const cloudLiteAppliedOk = vm.runInContext(`(() => {
    const readTree = n => !n ? "" : (n.textContent || "") + " " + (n._children || []).map(readTree).join(" ");
    const boxTxt = readTree(el("aiTestResultBox"));
    return state.serverGeminiModel === "gemini-2.5-flash-lite"
      && getActiveLlmLabel() === "雲端 2.5 Lite"
      && el("aiModeLabel").textContent === "雲端 2.5 Lite"
      && boxTxt.includes("連線正常")
      && boxTxt.includes("ms")
      && (state.match.tableStateRev || 0) > ${revBefore2422};
  })()`, ctx);

  const proLabelOk = vm.runInContext(`(() => {
    state.geminiApiKey = "TEST_KEY_PRO";
    state.geminiModel = "gemini-3.8-flash";
    updateAllUI();
    return getActiveLlmLabel() === "自備 3.8 Flash" && el("aiModeLabel").textContent === "自備 3.8 Flash";
  })()`, ctx);

  vm.runInContext(`
    el("btnAiModeOffline").click();
    el("btnSaveApiKey").click();
  `, ctx);
  await flushAsync2422();
  const offlineAppliedOk = vm.runInContext(`(() => {
    return getActiveLlmLabel() === "離線規則"
      && el("aiModeLabel").textContent === "離線規則"
      && state.serverGeminiOptOut === true;
  })()`, ctx);

  // Verify localhost without cloud proxy shows explicit guidance (never silently claims success)
  mockProxyAvailable = false;
  vm.runInContext(`
    el("btnAiModeCloud").click();
    el("btnSaveApiKey").click();
  `, ctx);
  await flushAsync2422();
  const v2422NoProxyOk = vm.runInContext(`(() => {
    const readTree = n => !n ? "" : (n.textContent || "") + " " + (n._children || []).map(readTree).join(" ");
    const msg = readTree(el("aiTestResultBox"));
    el("modalAiConfig").classList.add("hidden");
    return msg.includes("本機環境未啟用雲端代理，請改填金鑰或切換離線引擎") && el("aiTestResultBox").classList.contains("is-error");
  })()`, ctx);
  ctx.fetch = prevFetch2422;
  ctx.location.protocol = prevProto2422;

  const v2422Checks = {
    keyPaneOpenOk,
    cloudLiteAppliedOk: cloudLiteAppliedOk && capturedProxyModel === "gemini-2.5-flash-lite",
    proLabelOk,
    offlineAppliedOk,
    noProxyExplicitMsgOk: v2422NoProxyOk
  };
  const failedV2422 = Object.entries(v2422Checks).filter(([, v]) => !v);
  if (failedV2422.length > 0) {
    throw new Error("v24.2.4 AI CONFIG MODAL check failed: " + JSON.stringify(v2422Checks));
  }
}

// v24.2.9 WOLF KING SHOT NO-LAST-WORDS RULE & ALL-11 PERSONA DRAMATIC LAST WORDS CHECK
{
  const v2429Res = vm.runInContext(`(() => {
    clearStepTimer();
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    // 1. 10-seat match: AI Wolf King voted out & fires -> ZERO LAST_WORDS_SPEECH (transitions directly to Night!)
    el("selectModeCount").value = "10";
    el("selectRuleDepth").value = "full";
    el("selectPreferredRole").value = "villager";
    state.sheriffMode = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.phase = "DAY_VOTE";
    const pid = getPlayerId();
    const wkSeat = state.match.seats.find(function (s) { return s.alive && s.isWolfKing && s.id !== pid; });
    const goodVictim = state.match.seats.find(function (s) { return s.alive && s.team === "good" && s.id !== pid && s.role === "villager"; });
    wkSeat.alive = false;
    wkSeat.outReason = "公投離席";
    state.match.pendingVotedHunterId = wkSeat.id;
    triggerHunterResonance(wkSeat, "AFTER_VOTE");
    executeHunterShotPresentation(wkSeat, goodVictim);
    const pendingClearedOnWkShot = state.match.pendingVotedHunterId === null;
    if (typeof state.hunterResolveCommit === "function") state.hunterResolveCommit();
    const wkNoLastWordsOk = Boolean(
      pendingClearedOnWkShot &&
      !goodVictim.alive &&
      state.match.phase !== "LAST_WORDS_SPEECH" &&
      state.match.phase !== "LAST_WORDS_PLAYER" &&
      state.match.lastWordSpeakerId !== wkSeat.id &&
      state.match.lastWordSpeakerId !== goodVictim.id
    );

    // 2. All 11 personas produce non-empty dramatic last words across all 7 kinds with zero archaic pronouns & zero toxic slurs
    const allNames = Object.keys(PERSONA_COGNITIVE_PROFILES);
    const kinds = ["seer", "witch", "guard", "hunter", "good_voted", "good_night1", "wolf_voted"];
    const archaicRe = /吾|汝|諸君|妾身|小生/;
    const toxicRe = /白癡|笨蛋|智障|閉嘴|去死|廢物|垃圾|腦殘|亂玩|瞎子|好了啦|下去吧|笑死|邏輯死亡|少裝了|別演了|根本在演|胡說八道/;
    let personaLwAllOk = allNames.length === 11;
    allNames.forEach(function (nm, idx) {
      const dummySeat = { id: idx + 1, name: nm };
      kinds.forEach(function (k) {
        const txt = buildPersonaLastWordsText(dummySeat, k, {
          isFirstNight: k === "good_night1",
          tLbl: "03號小澄",
          isWolf: true,
          callouts: "04號阿松 跟 05號星兒",
          wolfTotal: 3,
          day: 2
        });
        if (!txt || txt.length < 20 || archaicRe.test(txt) || toxicRe.test(txt)) {
          personaLwAllOk = false;
        }
      });
      const flv = PERSONA_FLAVORS[nm];
      if (!flv || !flv.lastGood || !flv.lastWolf || archaicRe.test(flv.lastGood) || toxicRe.test(flv.lastGood) || archaicRe.test(flv.lastWolf) || toxicRe.test(flv.lastWolf)) {
        personaLwAllOk = false;
      }
    });

    clearStepTimer();
    antiCheatMonitor.strictThrow = prevStrict;
    resetMatchToLobby();
    return { wkNoLastWordsOk, personaLwAllOk, phaseAfterWkCommit: state.match.phase };
  })()`, ctx);

  if (!v2429Res.wkNoLastWordsOk || !v2429Res.personaLwAllOk) {
    throw new Error("v24.2.9 WOLF KING / DRAMATIC LAST WORDS check failed: " + JSON.stringify(v2429Res));
  }
}

// v24.2.10 NATURAL MALE VOICE ENGINE: Banish legacy SAPI5 robotic male voices (Zhiwei/Kangkang) from male pool, smooth male EQ & natural male pitch floor
{
  const v24210Res = vm.runInContext(`(() => {
    const prevSynth = window.speechSynthesis;
    const prevAll = voice.allVoices;
    const prevZh = voice.zhVoices;
    const prevMale = voice.maleVoices;
    const prevFemale = voice.femaleVoices;
    const prevBest = voice.bestPool;

    // 1. Windows Edge scenario: Natural YunJhe + legacy robotic Zhiwei/Kangkang -> maleVoices MUST exclude Zhiwei & Kangkang
    window.speechSynthesis = {
      getVoices: () => [
        { name: "Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)", lang: "zh-TW", voiceURI: "ms-hc" },
        { name: "Microsoft YunJhe Online (Natural) - Chinese (Taiwan)", lang: "zh-TW", voiceURI: "ms-yj" },
        { name: "Microsoft Zhiwei - Chinese (Traditional, Taiwan)", lang: "zh-TW", voiceURI: "ms-zw" },
        { name: "Microsoft Kangkang - Chinese (Simplified, PRC)", lang: "zh-CN", voiceURI: "ms-kk" }
      ],
      cancel: () => {},
      speak: () => {}
    };
    voice.refreshVoices();
    const edgeNaturalOnlyOk = voice.maleVoices.length === 1 && /YunJhe/i.test(voice.maleVoices[0].name);

    // 2. Windows Chrome scenario: Google 國語（臺灣）(female) + Taiwanese Zhiwei + Mainland Kangkang -> male models MUST keep Taiwanese male Zhiwei (never female Google voice, never Mainland Kangkang!)
    window.speechSynthesis = {
      getVoices: () => [
        { name: "Google 國語（臺灣）", lang: "zh-TW", voiceURI: "g-tw" },
        { name: "Microsoft Zhiwei - Chinese (Traditional, Taiwan)", lang: "zh-TW", voiceURI: "ms-zw" },
        { name: "Microsoft Kangkang - Chinese (Simplified, PRC)", lang: "zh-CN", voiceURI: "ms-kk" }
      ],
      cancel: () => {},
      speak: () => {}
    };
    voice.refreshVoices();
    const chromeTwMaleMatchedOk = voice.maleVoices.length === 1 && /Zhiwei/i.test(voice.maleVoices[0].name) && /Zhiwei/i.test(voice.pickVoiceForProfile(PERSONA_VOICE_PROFILES["阿松"]).name);

    // 3. Male EQ presence/mid curves stay warm & smooth (no harsh > 1.0 dB presence/mid spikes)
    const maleNames = ["你_男", "小澄", "阿松", "阿竹", "晨晨", "墨白", "阿朗"];
    const maleEqSmoothOk = maleNames.every(n => {
      const eq = PERSONA_AUDIO_EQ[n];
      return Boolean(eq && eq.midGain <= 0.7 && eq.presGain <= 1.0 && eq.gainTrim >= 1.06);
    });

    // 4. Male voice profiles match 3D character casting (阿松 mature Charon, 晨晨 upbeat Puck, 阿竹 warm Enceladus) & natural rateMul >= 0.90
    const maleProfileSmoothOk = maleNames.every(n => {
      const p = PERSONA_VOICE_PROFILES[n];
      return Boolean(p && p.rateMul >= 0.90 && p.basicPitch >= 0.92 && PERSONA_TTS_DIRECTIONS[n]);
    }) && PERSONA_VOICE_PROFILES["阿松"].studioVoice === "Charon" && PERSONA_VOICE_PROFILES["晨晨"].studioVoice === "Puck" && PERSONA_VOICE_PROFILES["阿竹"].studioVoice === "Enceladus";

    window.speechSynthesis = prevSynth;
    voice.allVoices = prevAll;
    voice.zhVoices = prevZh;
    voice.maleVoices = prevMale;
    voice.femaleVoices = prevFemale;
    voice.bestPool = prevBest;
    return { edgeNaturalOnlyOk, chromeTwMaleMatchedOk, maleEqSmoothOk, maleProfileSmoothOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(v24210Res)) {
    if (!v) {
      throw new Error("v24.2.11 NATURAL MALE VOICE check failed for " + k + ": " + JSON.stringify(v24210Res));
    }
  }

  // v24.2.12 Regression: Youthful female voices + smart consolidated player speech cards + stale sheriff signup cleanup + mobile zero-jump & 3-device layout polish
  const ttsApiSrc2412 = fs.readFileSync(path.join(ROOT, "api/tts.js"), "utf8");
  const serverPySrc2412 = fs.readFileSync(path.join(ROOT, "server.py"), "utf8");
  const cssCompSrc2412 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const canvasEvSrc2412 = fs.readFileSync(path.join(ROOT, "js/events/canvas-events.js"), "utf8");
  const hudSrc2412 = fs.readFileSync(path.join(ROOT, "js/ui/hud.js"), "utf8");

  const v24212Res = vm.runInContext(`(() => {
    // 1. Youthful female voice profiles & EQ (no mature/elderly pitch or sluggish rate)
    const femaleNames = ["主持", "你", "暖暖", "星兒", "小雲", "晴嵐", "柚子"];
    const femaleProfileYouthfulOk = femaleNames.every(n => {
      const p = PERSONA_VOICE_PROFILES[n];
      return Boolean(p && p.pitch >= 1.04 && p.basicPitch >= 1.03 && p.rateMul >= 0.98 && PERSONA_TTS_DIRECTIONS[n]);
    }) && PERSONA_VOICE_PROFILES["晴嵐"].studioVoice === "Vindemiatrix" && PERSONA_VOICE_PROFILES["柚子"].studioVoice === "Laomedeia";

    const femaleEqYouthfulOk = femaleNames.every(n => {
      const eq = PERSONA_AUDIO_EQ[n];
      return Boolean(eq && eq.detuneCents >= 0 && eq.twDetuneCents >= 0 && (!eq.animeRateMul || eq.animeRateMul >= 0.98));
    });

    // 2. Smart consolidated player speech cards (3 <button>s + 改詞 span loader + live board focus)
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const chipBtns = Array.from(el("quickSpeechChips") ? (el("quickSpeechChips")._children || []) : []);
    const chipHtml = chipBtns.map(c => String(c.innerHTML || "")).join(" | ");
    const windHtml = el("tableWindVaneSpeech") ? String(el("tableWindVaneSpeech").textContent || "") : "";
    const smartSpeechCardsOk = chipBtns.length === 3 && chipHtml.includes('data-card-load="1"') && chipHtml.includes("play-card-preview") && windHtml.includes("盤面焦點");

    // 3. Stale sheriff signup banner cleared when entering sheriff campaign speech
    state.match.sheriffElectionPending = true;
    startSheriffElection(function () {});
    if (state.match.sheriffElectionCtx) {
      state.match.sheriffElectionCtx.stage = "signup";
      state.match.sheriffElectionCtx.candidateIds = [2, 3];
      state.match.sheriffElectionCtx.dramaEvents = [
        "舉手上警名單（共2人）：03號阿朗、09號阿竹！請決定「上警競選（可認真拉票或詐身分亂聊）」或「警下聽選」！",
        "警上資訊觀察中。"
      ];
    }
    if (typeof startSheriffCampaignSpeeches === "function") {
      startSheriffCampaignSpeeches();
    }
    const staleSignupClearedOk = !((state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.dramaEvents) || []).some(d => String(d).includes("上警競選") || String(d).includes("舉手上警名單"));

    clearStepTimer();
    resetMatchToLobby();

    return { femaleProfileYouthfulOk, femaleEqYouthfulOk, smartSpeechCardsOk, staleSignupClearedOk };
  })()`, ctx);

  v24212Res.ttsVoicesAllowedOk =
    ["Autonoe", "Laomedeia", "Vindemiatrix", "Sulafat"].every(v => ttsApiSrc2412.includes('"' + v + '"') && serverPySrc2412.includes('"' + v + '"'));
  const cssCompNoComments2412 = cssCompSrc2412.replace(/\/\*[\s\S]*?\*\//g, "");
  v24212Res.mobileAndDeviceCssOk =
    !/!important/.test(cssCompNoComments2412) &&
    !/backdrop-filter\s*:\s*blur/i.test(cssCompNoComments2412) &&
    cssCompSrc2412.includes("box-decoration-break: clone") &&
    cssCompSrc2412.includes("clamp(192px, 31svh, 256px)") &&
    cssCompSrc2412.includes("grid-template-columns: 248px minmax(0, 780px) 248px") &&
    cssCompSrc2412.includes("@media (min-width: 768px) and (max-width: 1023px)") &&
    cssCompSrc2412.includes("@media (min-width: 1024px) and (max-width: 1199px)") &&
    canvasEvSrc2412.includes("orientationchange") &&
    hudSrc2412.includes("tut-device-ico");

  for (const [k, v] of Object.entries(v24212Res)) {
    if (!v) {
      throw new Error("v24.2.12 YOUTHFUL FEMALE VOICE / SMART SPEECH / MOBILE & 3-DEVICE POLISH check failed for " + k + ": " + JSON.stringify(v24212Res));
    }
  }

  // v24.2.13 Regression: Unified Song-dynasty editorial aesthetics, concise text-heavy surfaces, collapsible technical accordion, >= 13px career ledger
  const aiHtmlSrc2413 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const careerSrc2413 = fs.readFileSync(path.join(ROOT, "js/core/career.js"), "utf8");
  const cssCompSrc2413 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const hudSrc2413 = fs.readFileSync(path.join(ROOT, "js/ui/hud.js"), "utf8");
  const modalsSrc2413 = fs.readFileSync(path.join(ROOT, "js/ui/modals.js"), "utf8");
  const cssCompNoComments2413 = cssCompSrc2413.replace(/\/\*[\s\S]*?\*\//g, "");

  const v24213Res = {
    guideEditorialAndAccordionOk:
      aiHtmlSrc2413.includes('class="ed-lead"') &&
      aiHtmlSrc2413.includes('class="ed-rule-grid"') &&
      aiHtmlSrc2413.includes('<details class="ed-accordion">') &&
      aiHtmlSrc2413.includes("書院對弈核心規則（標準屠邊制）") &&
      !aiHtmlSrc2413.includes("MATCH LEDGER"),
    careerReadableAndUnifiedOk:
      careerSrc2413.includes("career-kpi-grid") &&
      careerSrc2413.includes("career-seal-card") &&
      !careerSrc2413.includes("text-[10px]") &&
      !careerSrc2413.includes("text-[10.5px]") &&
      !careerSrc2413.includes("text-[11px]"),
    tutorialMastheadAndModalsUnifiedOk:
      hudSrc2413.includes("tut-masthead") &&
      modalsSrc2413.includes("ed-vote-item") &&
      modalsSrc2413.includes("ed-trace-item"),
    editorialCssCleanOk:
      cssCompSrc2413.includes("v24.2.13 UNIFIED SONG-DYNASTY EDITORIAL") &&
      cssCompSrc2413.includes(".career-seal-chop.is-unlocked") &&
      !/!important/.test(cssCompNoComments2413) &&
      !/backdrop-filter\s*:\s*blur/i.test(cssCompNoComments2413)
  };

  for (const [k, v] of Object.entries(v24213Res)) {
    if (!v) {
      throw new Error("v24.2.13 UNIFIED EDITORIAL ART DIRECTION check failed for " + k + ": " + JSON.stringify(v24213Res));
    }
  }

  // v24.2.14 Regression: api/tts.js handler + blind-view blessing/wolf-tactic + lone_wolf_king + showcase + soundtrack/career hardening
  const apiTtsHandler = (await import("../api/tts.js")).default;
  const docSpec2414 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const readme2414 = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const ttsBodyPrimary = apiTtsHandler._buildTtsRequestBody("gemini-3.8-flash-lite-tts", "測試語音", "Vindemiatrix", false);
  const ttsBodyFallback = apiTtsHandler._buildTtsRequestBody("gemini-3.8-flash-lite-tts", "測試語音", "Vindemiatrix", true);
  const ttsBodyLedaFb = apiTtsHandler._buildTtsRequestBody("gemini-3.8-flash-lite-tts", "測試語音", "Leda", true);

  // api/tts.js handler security checks (origin, prod localhost, 415, 413, IP-first session-flood rate limit)
  const runTtsHandler = async (method, headers, body) => {
    let status = 0;
    let raw = "";
    const mockRes = {
      statusCode: 200,
      setHeader() { },
      end(chunk) { status = this.statusCode; raw = String(chunk || ""); }
    };
    await apiTtsHandler({ method, headers: headers || {}, body, socket: { remoteAddress: "198.51.100.42" } }, mockRes);
    return { status, body: raw };
  };
  const savedTtsKey = process.env.GEMINI_API_KEY;
  const savedVercelEnv = process.env.VERCEL_ENV;
  process.env.GEMINI_API_KEY = "dummy-test-key";
  process.env.VERCEL_ENV = "production";
  apiTtsHandler._resetRateLimit();
  const ttsCrossRes = await runTtsHandler("POST", { host: "sanhao.vercel.app", origin: "https://evil.example", "content-type": "application/json" }, { text: "測試" });
  const ttsProdLocalRes = await runTtsHandler("POST", { host: "sanhao.vercel.app", origin: "http://localhost:8788", "content-type": "application/json" }, { text: "測試" });
  const ttsBadCtRes = await runTtsHandler("POST", { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app", "content-type": "text/plain" }, { text: "測試" });
  const ttsTooBigRes = await runTtsHandler("POST", { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app", "content-type": "application/json" }, { text: "a".repeat(9000) });
  // Rotating random sessionIds behind one IP MUST hit the IP NAT bucket cap (360 RPM) before allocating unbounded sessions
  apiTtsHandler._resetRateLimit();
  let ttsIpFirstBlocked = false;
  for (let ri = 0; ri < 370; ri++) {
    const r = apiTtsHandler._checkRateLimit("198.51.100.99", 5000000 + ri * 10, "flood_sess_" + String(ri).padStart(4, "0"));
    if (!r.allowed && r.reason === "ip_rpm") { ttsIpFirstBlocked = true; break; }
  }
  apiTtsHandler._resetRateLimit();
  if (savedTtsKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = savedTtsKey;
  if (savedVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = savedVercelEnv;

  const v24214Runtime = vm.runInContext(`(() => {
    clearStepTimer();
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;

    // 1. Default mate_fake_seer_gold wolf-mate prompt passes auditLlmPromptLeak with 0 violations
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "wolf";
    state.activeVariant = "standard";
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    state.match.wolfTactic = "mate_fake_seer_gold";
    state.match.phase = "DAY_SPEECH";
    const aiWolfMate = state.match.seats.find(s => s.alive && s.team === "wolf" && s.id !== getPlayerId());
    const wolfFb = buildHeuristicAiSpeech(aiWolfMate);
    const wolfBuilt = buildBlindGeminiSpeechPrompt(aiWolfMate, wolfFb);
    const mateFakeSeerPromptOk = Boolean(wolfBuilt && wolfBuilt.audit && wolfBuilt.audit.ok);

    // 2. isPrivate: true blessing logs stay out of AI publicLogs, auditLlmPromptLeak blocks private markers & allows public truth_lantern
    addLog({ kind: "blessing", isPrivate: true, title: "靜心觀微", text: "靜心觀微：02號脈搏偏快" });
    addLog({ kind: "blessing", isPrivate: true, title: "三好蓮花覺醒（反派演技）", text: "暗影帶風已啟動" });
    addLog({ kind: "blessing", title: "清茗事件", text: "今日「靜心觀微」可用次數加一，大家可自由觀察。" });
    const goodViewer = state.match.seats.find(s => s.alive && s.team === "good");
    const privSnap = createBlindMatchSnapshot(goodViewer, { module: "v24214_priv_check" });
    const pubLogText = (privSnap.publicLogs || []).map(l => (l.title || "") + " " + (l.text || "")).join(" ");
    const privateBlessingIsolatedOk = !pubLogText.includes("反派演技") && !pubLogText.includes("靜心觀微：") && pubLogText.includes("可用次數加一");
    antiCheatMonitor.strictThrow = false;
    const leakBlockedOk = !auditLlmPromptLeak(privSnap, "底牌：書院生", "靜心觀微：02號脈搏偏快").ok
      && !auditLlmPromptLeak(privSnap, "底牌：書院生", "三好蓮花覺醒（反派演技）").ok
      && auditLlmPromptLeak(privSnap, "底牌：書院生", "今日「靜心觀微」可用次數加一").ok;
    antiCheatMonitor.strictThrow = true;

    // 3. lone_wolf_king: getInitialWolfCount()===1, lowered microPulse persists across beginNightPhase(), sole Wolf King vote-out triggers shot
    const prevCareerRaw = localStorage.getItem(CAREER_STORAGE_KEY);
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify({
      gamesPlayed: 10, wins: 8, unlockedBadges: ["first_win", "zero_toxic", "kind_crit", "resonance", "combo_master", "four_g_sage", "pro_slayer", "wolf_actor"]
    }));
    state.activeVariant = "lone_wolf_king";
    el("selectPreferredRole").value = "villager";
    el("selectAiDifficulty").value = "normal";
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    const lwkSeat = state.match.seats.find(s => s.team === "wolf");
    const lwkCountOk = state.match.variantMode === "lone_wolf_king" && getInitialWolfCount() === 1 && Boolean(lwkSeat && lwkSeat.isWolfKing);
    state.match.phase = "DAY_VOTE_RESULT";
    const origRandLwk = Math.random;
    Math.random = () => 0.99; // standard wolf = 92; lone_wolf_king (-16) = 76
    beginNightPhase();
    Math.random = origRandLwk;
    const lwkPulseLowOk = Boolean(lwkSeat && lwkSeat.microPulse === 76);
    clearStepTimer();
    state.match.phase = "DAY_VOTE";
    state.match.day = 1;
    state.match.seats.forEach(s => { s.alive = true; });
    const origChooseVoteLwk = chooseAiVoteTarget;
    chooseAiVoteTarget = () => lwkSeat.id;
    finalizeVoteRound(lwkSeat.id);
    chooseAiVoteTarget = origChooseVoteLwk;
    if (state.voteFlight && typeof state.voteFlight.finish === "function") state.voteFlight.finish();
    const lwkShotTriggeredOk = Boolean(!lwkSeat.alive && (state.match.phase === "HUNTER_TRIGGER" || state.match.pendingVotedHunterId === lwkSeat.id));
    state.activeVariant = "standard";
    clearStepTimer();

    // 4. Judge Showcase: Day-2 quick cards reference lastNightCasualties (not 平安夜) & finishMatch() does NOT write to CAREER_STORAGE_KEY
    const careerBeforeShowcase = JSON.stringify({ gamesPlayed: 3, wins: 2, unlockedBadges: ["first_win"] });
    localStorage.setItem(CAREER_STORAGE_KEY, careerBeforeShowcase);
    startJudgeShowcaseMatch();
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    const scCardText = Array.from(el("quickSpeechChips") ? (el("quickSpeechChips")._children || []) : []).map(c => String(c.innerHTML || "") + String(c.textContent || "")).join(" ");
    const showcaseCardsUseCasualtiesOk = !scCardText.includes("昨晚平安夜") && Array.isArray(state.match.lastNightCasualties) && state.match.lastNightCasualties.length > 0;
    finishMatch("good", "評審導覽測試結束");
    const showcaseNoCareerWriteOk = localStorage.getItem(CAREER_STORAGE_KEY) === careerBeforeShowcase;

    // 5. soundtrack.js: getVoiceVowelWeights() returns all zeros when voice.paused === true
    const prevPaused = voice.paused;
    voice.paused = true;
    const vwPaused = sound.getVoiceVowelWeights();
    const pausedZeroVowelsOk = vwPaused && vwPaused.a === 0 && vwPaused.i === 0 && vwPaused.u === 0 && vwPaused.e === 0 && vwPaused.o === 0;
    voice.paused = prevPaused;

    // 6. career.js: corrupted localStorage payload sanitizes cleanly & openCareerModal() escapes markup and clamps widths <= 100%
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify({
      gamesPlayed: -5,
      wins: 999,
      goodWins: "NaN",
      wolfWins: -1,
      unlockedBadges: ["first_win", "first_win", "<img src=x onerror=alert(1)>", "nonexistent_badge"]
    }));
    const cleanCareer = loadCareerStats();
    openCareerModal();
    const careerModalHtml = String(el("careerBadgesGrid") ? el("careerBadgesGrid").innerHTML : "") + String(el("careerStatsGrid") ? el("careerStatsGrid").innerHTML : "");
    el("modalCareer").classList.add("hidden");
    const careerSanitizedOk = cleanCareer.gamesPlayed === 0
      && cleanCareer.wins === 999
      && cleanCareer.goodWins === 0
      && cleanCareer.unlockedBadges.length === 1
      && cleanCareer.unlockedBadges[0] === "first_win"
      && !careerModalHtml.includes("<img")
      && !/width:\\s*(?:1[0-9]{2}|[2-9][0-9]{2})%/.test(careerModalHtml);

    if (prevCareerRaw === null) localStorage.removeItem ? localStorage.removeItem(CAREER_STORAGE_KEY) : localStorage.setItem(CAREER_STORAGE_KEY, "");
    else localStorage.setItem(CAREER_STORAGE_KEY, prevCareerRaw);
    antiCheatMonitor.strictThrow = prevStrict;
    clearStepTimer();
    resetMatchToLobby();
    return {
      mateFakeSeerPromptOk,
      privateBlessingIsolatedOk,
      leakBlockedOk,
      lwkCountOk,
      lwkPulseLowOk,
      lwkShotTriggeredOk,
      showcaseCardsUseCasualtiesOk,
      showcaseNoCareerWriteOk,
      pausedZeroVowelsOk,
      careerSanitizedOk
    };
  })()`, ctx);

  const v24214Res = {
    ttsVoiceFallbackMappingOk:
      ttsBodyPrimary.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Vindemiatrix" &&
      ttsBodyFallback.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Zephyr" &&
      ttsBodyLedaFb.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Zephyr" &&
      !ttsApiSrc2412.includes("? voiceName\n    : voiceName"),
    ttsTimeoutBudgetHeadroomOk:
      ttsApiSrc2412.includes("TOTAL_BUDGET_MS = 9600") &&
      ttsApiSrc2412.includes("RETRY_400_TIMEOUT_MS = 2800") &&
      ttsApiSrc2412.includes("Math.min(4200, remaining - 200)"),
    ttsHandlerSecurityOk:
      ttsCrossRes.status === 403 &&
      ttsProdLocalRes.status === 403 &&
      ttsBadCtRes.status === 415 &&
      ttsTooBigRes.status === 413 &&
      ttsIpFirstBlocked,
    specSyncedModelsAndCacheOk:
      docSpec2414.includes("gemini-3.5-flash-lite") &&
      docSpec2414.includes("api/tts.js") &&
      docSpec2414.includes("sanhao-shell-v25.9.0") &&
      docSpec2414.length <= 5000,
    readmeSyncedOk:
      readme2414.includes("sanhao-shell-v25.9.0") &&
      readme2414.includes("api/tts.js"),
    ...v24214Runtime
  };
  for (const [k, v] of Object.entries(v24214Res)) {
    if (!v) {
      throw new Error("v24.2.14 REGRESSION check failed for " + k + ": " + JSON.stringify(v24214Res));
    }
  }
}

// --- v24.2.15: Voice zero-stall prefetch & first-sentence fast-start regression checks ---
{
  const splitShort = ctx.__voice._splitFirstSentenceForFastStart("這句話比較短，不需要切分。");
  const splitTerminalText = "我昨晚驗了三號確實是查殺牌，請大家今天把票集中歸在三號身上！如果還有疑慮可以聽聽看後置位的看法。";
  const splitTerminal = ctx.__voice._splitFirstSentenceForFastStart(splitTerminalText);
  const splitCommaText = "我這輪先整理場上目前的對話邏輯與警徽歸屬方向，大家注意二號跟五號的視角其實有點衝突先記錄下來";
  const splitComma = ctx.__voice._splitFirstSentenceForFastStart(splitCommaText);
  const splitFastStartOk =
    splitShort === null &&
    Array.isArray(splitTerminal) &&
    splitTerminal.length === 2 &&
    splitTerminal[0].endsWith("！") &&
    (splitTerminal[0] + splitTerminal[1]) === splitTerminalText &&
    Array.isArray(splitComma) &&
    splitComma.length === 2 &&
    splitComma[0].endsWith("，") &&
    splitComma[0].length >= 20 &&
    splitComma[1].length >= 18;

  const prevSoundCtx = ctx.__sound.ctx;
  const prevCanSpeak = ctx.__voice.canSpeak;
  const prevLookupBundled = ctx.__voice.lookupBundledVoicePackUrl;
  const prevPrefetchCloud = ctx.__voice.prefetchCloudGeminiTts;
  const prevPrefetchLocal = ctx.__voice.prefetchFreeLocalNeural;
  const prevDecode = ctx.__voice.decodeGeminiAudioBytes;
  const prevFetch = ctx.fetch;
  const prevEnginePref = ctx.__voice.enginePref;
  const prevCloudAvail = ctx.__voice.cloudGeminiTtsAvailable;
  const prevCloudCooldown = ctx.__voice.cloudGeminiTtsCooldownUntil;
  const prevLocalAvail = ctx.__voice.localNeuralAvailable;
  const prevApiKey = ctx.__state.geminiApiKey;
  const prevOptOut = ctx.__state.serverGeminiOptOut;
  const prevStudioCache = ctx.__voice.studioCache;

  let cloudCalls = 0;
  let localCalls = 0;
  let studio216Cached = false;
  let studio342Skipped = false;
  let sheriffPrefetchOk = false;

  try {
    ctx.__sound.ctx = {
      createBufferSource: () => ({ buffer: null, playbackRate: { value: 1 }, connect() { }, start() { }, stop() { }, onended: null }),
      createGain: () => ({ gain: { value: 1 }, connect() { } }),
      destination: {},
      decodeAudioData: async () => ({ duration: 1.4, numberOfChannels: 1, length: 44100, sampleRate: 44100 })
    };
    ctx.__voice.canSpeak = () => true;
    ctx.__voice.lookupBundledVoicePackUrl = () => "";
    ctx.__voice.prefetchCloudGeminiTts = () => { cloudCalls += 1; };
    ctx.__voice.prefetchFreeLocalNeural = () => { localCalls += 1; };

    ctx.__state.geminiApiKey = "TEST_KEY_V24215";
    ctx.__state.serverGeminiOptOut = false;
    ctx.__voice.enginePref = "auto";
    ctx.__voice.localNeuralAvailable = true;
    const pCloudFirst = ctx.__voice.prefetchBestTts("暖暖", "測試雲端語音優先權高於本機。", "normal");

    ctx.__voice.enginePref = "local";
    const pLocalFallback = ctx.__voice.prefetchBestTts("暖暖", "強制本機時才走本地神經語音。", "normal");

    const prefetchPriorityOk =
      pCloudFirst === true &&
      pLocalFallback === true &&
      cloudCalls === 1 &&
      localCalls === 1;

    ctx.__voice.prefetchCloudGeminiTts = prevPrefetchCloud;
    ctx.__voice.prefetchFreeLocalNeural = prevPrefetchLocal;
    ctx.__voice.decodeGeminiAudioBytes = async () => ({ duration: 1.2, numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    ctx.fetch = async (url) => {
      if (String(url) === "/api/tts") {
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(256) };
      }
      return prevFetch ? prevFetch(url) : { ok: false };
    };
    ctx.__state.geminiApiKey = "";
    ctx.__voice.cloudGeminiTtsAvailable = true;
    ctx.__voice.cloudGeminiTtsCooldownUntil = 0;
    ctx.__voice.enginePref = "auto";
    ctx.__voice.studioCache = {};

    const text216 = "測試語音快取上限。".repeat(24);
    const text342 = "測試語音快取上限。".repeat(38);
    const profileNuannuan = vm.runInContext("PERSONA_VOICE_PROFILES['暖暖']", ctx);
    await ctx.__voice._fetchGeminiStudioAudio(profileNuannuan, "暖暖", text216, "normal");
    const keysAfter216 = Object.keys(ctx.__voice.studioCache).length;
    await ctx.__voice._fetchGeminiStudioAudio(profileNuannuan, "暖暖", text342, "normal");
    const keysAfter342 = Object.keys(ctx.__voice.studioCache).length;
    studio216Cached = text216.length > 160 && text216.length <= 320 && keysAfter216 === 1;
    studio342Skipped = text342.length > 320 && keysAfter342 === 1;

    sheriffPrefetchOk = vm.runInContext(`(() => {
      resetMatchToLobby();
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = true;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      const m = state.match;
      m.phase = "SHERIFF_ELECTION";
      const aiCands = m.seats.filter(s => s.id !== getPlayerId() && s.alive).slice(0, 2);
      if (aiCands.length < 2) return false;
      const shCtx = {
        stage: "speech",
        epoch: orchestrator.matchEpoch,
        activeReelSeatId: aiCands[0].id,
        candidateIds: [aiCands[0].id, aiCands[1].id],
        speechOrderIds: [aiCands[0].id, aiCands[1].id],
        speechIndex: 0,
        playerRunning: false,
        withdrawnIds: [],
        spokenSpeeches: [],
        doneCb: null
      };
      m.sheriffElectionCtx = shCtx;
      const triggered = prefetchNextSheriffSpeech(shCtx);
      const entry = shCtx._prefetchedSheriff;
      const populatedOk = Boolean(
        triggered &&
        entry &&
        entry.seatId === aiCands[1].id &&
        typeof entry.resolvedText === "string" &&
        entry.resolvedText.length > 0
      );
      shCtx.playerRunning = true;
      shCtx.candidateIds.push(getPlayerId());
      shCtx.speechOrderIds.push(getPlayerId());
      resolveSheriffElectionAction("withdraw");
      const clearedOnWithdraw = shCtx._prefetchedSheriff === null;
      resetMatchToLobby();
      return populatedOk && clearedOnWithdraw;
    })()`, ctx);

    const v24215Res = {
      splitFastStartOk,
      prefetchPriorityOk,
      studio216Cached,
      studio342Skipped,
      sheriffPrefetchOk
    };
    for (const [k, v] of Object.entries(v24215Res)) {
      if (!v) {
        throw new Error("v24.2.15 REGRESSION check failed for " + k + ": " + JSON.stringify(v24215Res));
      }
    }
  } finally {
    ctx.__sound.ctx = prevSoundCtx;
    ctx.__voice.canSpeak = prevCanSpeak;
    ctx.__voice.lookupBundledVoicePackUrl = prevLookupBundled;
    ctx.__voice.prefetchCloudGeminiTts = prevPrefetchCloud;
    ctx.__voice.prefetchFreeLocalNeural = prevPrefetchLocal;
    ctx.__voice.decodeGeminiAudioBytes = prevDecode;
    ctx.fetch = prevFetch;
    ctx.__voice.enginePref = prevEnginePref;
    ctx.__voice.cloudGeminiTtsAvailable = prevCloudAvail;
    ctx.__voice.cloudGeminiTtsCooldownUntil = prevCloudCooldown;
    ctx.__voice.localNeuralAvailable = prevLocalAvail;
    ctx.__state.geminiApiKey = prevApiKey;
    ctx.__state.serverGeminiOptOut = prevOptOut;
    ctx.__voice.studioCache = prevStudioCache;
  }
}

// --- v24.3.0: Deepened Three-Good & Four-Givings causal ecology, echoes & virtue ledger ---
{
  const v243Res = vm.runInContext(`(() => {
    const clearAtm = getTeaAtmosphereState(80);
    const calmAtm = getTeaAtmosphereState(72);
    const fogAtm = getTeaAtmosphereState(45);
    const atmThresholdsOk = Boolean(
      clearAtm && clearAtm.id === "clear" && clearAtm.label === "清朗茶風" &&
      calmAtm && calmAtm.id === "calm" &&
      fogAtm && fogAtm.id === "fog" && fogAtm.label === "流言起霧"
    );

    const prevVoteFn = chooseAiVoteTarget;
    let badgeToggleOk = false;
    let speechInfluenceAtmOk = false;
    let fourGConfidenceSaveEchoOk = false;
    let speechCausalLogOk = false;
    let virtueLedgerOk = false;

    try {
      resetMatchToLobby();
      el("selectModeCount").value = "6";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      el("chkGuardMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const m = state.match;
      const pid = getPlayerId();
      m.sheriffSeatId = null;
      m.sheriffElectionPending = false;

      // 1. HUD teaAtmosphereBadge toggle across clear / calm / fog
      m.harmonyScore = 82;
      updateAllUI();
      const clearShow = !el("teaAtmosphereBadge").classList.contains("hidden") &&
        el("teaAtmosphereBadge").classList.contains("is-clear") &&
        el("teaAtmosphereBadge").textContent === "清朗茶風";
      m.harmonyScore = 60;
      updateAllUI();
      const calmHide = el("teaAtmosphereBadge").classList.contains("hidden");
      m.harmonyScore = 40;
      updateAllUI();
      const fogShow = !el("teaAtmosphereBadge").classList.contains("hidden") &&
        el("teaAtmosphereBadge").classList.contains("is-fog") &&
        el("teaAtmosphereBadge").textContent === "流言起霧";
      badgeToggleOk = clearShow && calmHide && fogShow;

      // 2. applySpeechInfluence: clear wind boosts reasoned persuasion & toxic penalty
      const pSeat = getPlayerSeat();
      const prevDiffV243 = state.aiDifficulty;
      state.aiDifficulty = "normal";
      const goodTgt = m.seats.find(s => s.id !== pid && s.alive && s.team === "good");
      const goodListener = m.seats.find(s => s.id !== pid && s.id !== goodTgt.id && s.alive && s.team === "good" && s.role !== "seer");
      goodListener.suspicionMap[goodTgt.id] = 50;
      m.harmonyScore = 60;
      applySpeechInfluence(pSeat, { claimSeer: true, accuseId: goodTgt.id, hasToxicSlip: false });
      const susCalm = goodListener.suspicionMap[goodTgt.id];

      goodListener.suspicionMap[goodTgt.id] = 50;
      m.harmonyScore = 85;
      applySpeechInfluence(pSeat, { claimSeer: true, accuseId: goodTgt.id, hasToxicSlip: false });
      const susClear = goodListener.suspicionMap[goodTgt.id];

      goodListener.suspicionMap[pid] = 50;
      m.harmonyScore = 60;
      applySpeechInfluence(pSeat, { accuseId: goodTgt.id, hasToxicSlip: true });
      const toxCalm = goodListener.suspicionMap[pid];

      goodListener.suspicionMap[pid] = 50;
      m.harmonyScore = 85;
      applySpeechInfluence(pSeat, { accuseId: goodTgt.id, hasToxicSlip: true });
      const toxClear = goodListener.suspicionMap[pid];
      state.aiDifficulty = prevDiffV243;
      speechInfluenceAtmOk = susClear > susCalm && toxClear > toxCalm;

      // 3. useFourGConfidence -> finalizeVoteRound detects save, updates fourGEchoes, freezes safely & echoes Day 2 gratitude
      m.phase = "DAY_SPEECH";
      m.day = 1;
      const shieldTarget = m.seats.find(s => s.id !== pid && s.alive);
      const runnerUp = m.seats.find(s => s.id !== pid && s.id !== shieldTarget.id && s.alive);
      state.selectedSeatId = shieldTarget.id;
      useFourGConfidence();
      const echoAddedOnUse = m.fourGEchoes.some(e => e.kind === "confidence" && e.targetId === shieldTarget.id);

      m.phase = "DAY_VOTE";
      m._voteFinalizing = false;
      m.pkCandidates = null;
      m.pkUsedToday = false;
      const votePool = m.seats.filter(s => s.alive && s.id !== pid);
      const threeVoters = votePool.slice(0, 3).map(s => s.id);
      chooseAiVoteTarget = function (voter) {
        return threeVoters.indexOf(voter.id) !== -1 ? shieldTarget.id : runnerUp.id;
      };
      finalizeVoteRound(null);
      const savedCountOk = m.stats.confidenceSaves === 1;
      const echoMarkedSaved = m.fourGEchoes.some(e => e.kind === "confidence" && e.targetId === shieldTarget.id && e.savedFromVoteOut === true);

      m.day = 2;
      const blindSnap = createBlindMatchSnapshot(shieldTarget, { module: "smoke_v243_echo" });
      const snapEchoFrozen = Boolean(
        blindSnap &&
        Array.isArray(blindSnap.fourGEchoes) &&
        Object.isFrozen(blindSnap.fourGEchoes) &&
        blindSnap.fourGEchoes.some(e => e.kind === "confidence" && e.targetId === shieldTarget.id && e.savedFromVoteOut) &&
        blindSnap.fourGEchoes.every(e => !("team" in e) && !("role" in e))
      );
      const echoClause = buildPriorCallbackPhrase(shieldTarget, [], null, blindSnap);
      fourGConfidenceSaveEchoOk = echoAddedOnUse && savedCountOk && echoMarkedSaved && snapEchoFrozen &&
        echoClause.includes("奉茶護席") && echoClause.includes("給我信心");

      // 4. submitPlayerSpeech rewrite vs toxic causal logging into threeGoodImpactLog
      m.phase = "DAY_PLAYER_TURN";
      m.harmonyScore = 72;
      m.rewriteCritReady = true;
      el("playerSpeechInput").value = "請大家冷靜比對線索，我們可以先留意 " + runnerUp.id + "號的立場。";
      submitPlayerSpeech();
      const hasRewriteLog = m.threeGoodImpactLog.some(it => it && it.key === "words_rewrite");

      m.phase = "DAY_PLAYER_TURN";
      m.rewriteCritReady = false;
      const toxWord = (typeof TOXIC_PATTERNS !== "undefined" && TOXIC_PATTERNS[0]) ? TOXIC_PATTERNS[0].word : "別演了";
      el("playerSpeechInput").value = runnerUp.id + "號" + toxWord + "！";
      submitPlayerSpeech();
      const hasToxicLog = m.threeGoodImpactLog.some(it => it && it.key === "toxic_backfire");
      speechCausalLogOk = hasRewriteLog && hasToxicLog;

      // 5. buildThreeGoodFourGLedger() renders #gameOverVirtueLedger & exports in buildMatchReplayReport() without emojis
      finishMatch("good", "測試三好四給因果錄結算");
      const ledger = buildThreeGoodFourGLedger();
      const ledgerHtml = el("gameOverVirtueLedger").innerHTML || "";
      const replayTxt = buildMatchReplayReport();
      const emojiReV243 = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\uFE0F]/u;
      virtueLedgerOk = Boolean(
        ledger &&
        typeof ledger.virtueTitle === "string" &&
        ledger.virtueTitle.length > 0 &&
        !el("gameOverVirtueLedger").classList.contains("hidden") &&
        ledgerHtml.includes("本局三好四給因果錄") &&
        ledgerHtml.includes(ledger.virtueTitle) &&
        replayTxt.includes("■ 三好四給因果錄：") &&
        !emojiReV243.test(ledgerHtml) &&
        !emojiReV243.test(replayTxt)
      );

      return {
        atmThresholdsOk,
        badgeToggleOk,
        speechInfluenceAtmOk,
        fourGConfidenceSaveEchoOk,
        speechCausalLogOk,
        virtueLedgerOk
      };
    } finally {
      chooseAiVoteTarget = prevVoteFn;
      resetMatchToLobby();
    }
  })()`, ctx);
  for (const [k, v] of Object.entries(v243Res)) {
    if (!v) {
      throw new Error("v24.3.0 REGRESSION check failed for " + k + ": " + JSON.stringify(v243Res));
    }
  }
}

// --- v24.3.1: Prominent #virtueQuickDeck & Pre-Game bootPreloader tests ---
{
  const v2431Res = vm.runInContext(`(() => {
    const prevIsHttp = bootPreloader.isBrowserHttp;
    let quickDeckHiddenInLobbyOk = false;
    let quickDeckHiddenInNightOk = false;
    let quickDeckDaySyncOk = false;
    let quickDeckClickSyncOk = false;
    let preloaderHeadlessOk = false;
    let preloaderProgressSkipOk = false;
    let preloaderCompleteOk = false;

    try {
      // 1. Prominent #virtueQuickDeck visibility & click sync with #cornerFourGDeck
      resetMatchToLobby();
      quickDeckHiddenInLobbyOk = el("virtueQuickDeck").classList.contains("hidden");

      el("selectModeCount").value = "6";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      el("chkGuardMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      state.match.phase = "NIGHT_WOLF";
      updateAllUI();
      quickDeckHiddenInNightOk = el("virtueQuickDeck").classList.contains("hidden");

      state.match.phase = "DAY_SPEECH";
      state.match.harmonyScore = 84;
      updateAllUI();
      quickDeckDaySyncOk = Boolean(
        !el("virtueQuickDeck").classList.contains("hidden") &&
        el("vqLotusLabel").textContent.includes("三好") &&
        el("btnQuickTeaAtmosphere").textContent.includes("清朗茶風") &&
        !el("btnQuick4GJoy").disabled &&
        el("btnQuick4GJoy").classList.contains("is-ready")
      );

      el("btnQuick4GJoy").click();
      quickDeckClickSyncOk = Boolean(
        state.match.fourGivingsUsed.joy === true &&
        el("btnQuick4GJoy").disabled === true &&
        el("btnQuick4GJoy").classList.contains("is-spent") &&
        el("btn4GJoy").disabled === true &&
        el("btn4GJoy").classList.contains("is-spent")
      );

      // 2. bootPreloader headless fast-dismiss, HTTP progress buckets, skip button, and completion transition
      bootPreloader.isBrowserHttp = function () { return false; };
      bootPreloader.start();
      preloaderHeadlessOk = Boolean(
        bootPreloader.finished === true &&
        el("bootPreloadOverlay").classList.contains("hidden")
      );

      bootPreloader.isBrowserHttp = function () { return true; };
      bootPreloader.start();
      let readyFiredSkip = false;
      bootPreloader.whenReady(function () { readyFiredSkip = true; });
      const startedOpenOk = !bootPreloader.finished && bootPreloader.active === true && !el("bootPreloadOverlay").classList.contains("hidden");
      bootPreloader.reportBucket("sky", 4, 4);
      bootPreloader.reportBucket("portraits", 5, 10);
      const midPct = parseInt(el("bootPreloadPct").textContent, 10);
      const midOk = midPct > 6 && midPct < 100 && !readyFiredSkip;
      el("btnSkipBootPreload").click();
      preloaderProgressSkipOk = Boolean(
        startedOpenOk &&
        midOk &&
        bootPreloader.finished === true &&
        readyFiredSkip === true &&
        el("bootPreloadOverlay").classList.contains("hidden")
      );

      bootPreloader.start();
      let readyFiredComplete = false;
      bootPreloader.whenReady(function () { readyFiredComplete = true; });
      bootPreloader.reportBucket("sky", 4, 4);
      bootPreloader.reportBucket("portraits", 1, 1);
      bootPreloader.reportBucket("hero", 1, 1);
      bootPreloader.reportBucket("avatars", 1, 1);
      const bar100Ok = el("bootPreloadPct").textContent === "100%" && el("bootPreloadBarFill").style.width === "100%";
      bootPreloader.dismiss("complete");
      preloaderCompleteOk = Boolean(
        bar100Ok &&
        bootPreloader.finished === true &&
        readyFiredComplete === true &&
        el("bootPreloadOverlay").classList.contains("is-fading")
      );

      return {
        quickDeckHiddenInLobbyOk,
        quickDeckHiddenInNightOk,
        quickDeckDaySyncOk,
        quickDeckClickSyncOk,
        preloaderHeadlessOk,
        preloaderProgressSkipOk,
        preloaderCompleteOk
      };
    } finally {
      bootPreloader.isBrowserHttp = prevIsHttp;
      bootPreloader.finished = false;
      bootPreloader.start();
      if (el("bootPreloadOverlay")) {
        el("bootPreloadOverlay").classList.add("hidden");
        el("bootPreloadOverlay").classList.remove("is-fading");
      }
      resetMatchToLobby();
    }
  })()`, ctx);
  const docScriptV2431 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const demoScriptVirtueSyncOk = [
    "v25.9.0",
    "啟席預載遮罩",
    "三好四給主動茶禮列",
    "茶席風氣",
    "給信心",
    "給歡喜",
    "給希望",
    "給方便",
    "三好四給因果錄"
  ].every((k) => docScriptV2431.includes(k));
  if (!demoScriptVirtueSyncOk) {
    throw new Error("v24.3.1 DEMO SCRIPT sync check failed!");
  }

  for (const [k, v] of Object.entries(v2431Res)) {
    if (!v) {
      throw new Error("v24.3.1 REGRESSION check failed for " + k + ": " + JSON.stringify(v2431Res));
    }
  }
}

// --- v24.3.2: Unified Wide Speech Composer & Quick Template -> Advanced Panel Sync ---
{
  const html2432 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const css2432 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const htmlComposerOk =
    html2432.includes('<textarea id="quickFreeInput"') &&
    html2432.includes('<textarea id="lastWordsFreeInput"') &&
    html2432.includes('<textarea id="sheriffPlayerInput"') &&
    html2432.includes('id="pitTemplateSyncBar"') &&
    html2432.includes('id="btnRebuildFromPits"') &&
    html2432.includes('id="btnClearSpeechDraft"') &&
    html2432.includes('id="quickStancePills" class="flex items-center');
  const cssWideSpeakOk =
    css2432.includes("body.screen-ingame.phase-mode-speak #focalCenterCard") &&
    css2432.includes("grid-template-columns: 236px minmax(0, 940px) 236px") &&
    css2432.includes("max-width: 940px;") &&
    css2432.includes(".speech-composer-box") &&
    css2432.includes(".speech-composer-textarea");

  const v2432Runtime = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const others = getAliveSeats().filter(s => s.id !== pid);
    const pSeat = getPlayerSeat();
    pSeat.checkedHistory = [{ day: 1, targetId: others[0].id, isWolf: true }];
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();

    const cardCountEq3 = el("quickSpeechChips").querySelectorAll("button").length === 3;
    const advDefaultCollapsed = el("speechAdvancedDrawer").classList.contains("hidden");
    const firstCard = el("quickSpeechChips").querySelectorAll("button")[0];
    const firstLoadSpan = firstCard && firstCard.querySelector ? firstCard.querySelector("[data-card-load]") : null;
    if (firstLoadSpan) firstLoadSpan.click();

    const advOpenedOnCardLoad = !el("speechAdvancedDrawer").classList.contains("hidden") && el("btnToggleCustomSpeech").classList.contains("is-active");
    const syncBarShown = !el("pitTemplateSyncBar").classList.contains("hidden");
    const draftHydrated = Boolean(
      state.match.playerDraftPits.claimRole === "seer" &&
      state.match.playerDraftPits.wolfIds.includes(others[0].id) &&
      el("quickFreeInput").value.includes("觀察員") &&
      el("playerSpeechInput").value === el("quickFreeInput").value
    );

    // Toggling an extra seat in #playerPitBuilder keeps the loaded Seer claim + previous wolf pit!
    togglePlayerDraftSeatPit(others[1].id);
    const stackedEditPreservedRole = Boolean(
      state.match.playerDraftPits.claimRole === "seer" &&
      state.match.playerDraftPits.wolfIds.includes(others[0].id) &&
      state.match.playerDraftPits.wolfIds.includes(others[1].id) &&
      el("quickFreeInput").value.includes("觀察員") &&
      el("quickFreeInput").value.includes(fmtSeatNum(others[1].id) + "號")
    );

    // Stance pill & Clear button test
    const stanceBtn = el("quickStancePills").querySelectorAll("[data-stance]")[2];
    if (stanceBtn) stanceBtn.click();
    const stanceAppended = el("quickFreeInput").value.includes("三好風度");
    el("btnClearSpeechDraft").click();
    const clearedDraftOk = Boolean(
      el("quickFreeInput").value === "" &&
      el("playerSpeechInput").value === "" &&
      el("pitTemplateSyncBar").classList.contains("hidden") &&
      state.match.playerDraftPits.wolfIds.length === 0 &&
      !state.match.playerDraftPits.claimRole
    );

    // Shift+Enter & IME isComposing guard must NOT submit speech; plain Enter submits cleanly
    el("quickFreeInput").value = "這段我想先換行繼續補完整一點的邏輯";
    el("quickFreeInput").dispatchEvent({ type: "input" });
    el("quickFreeInput").dispatchEvent({ type: "keydown", key: "Enter", shiftKey: true, isComposing: false, preventDefault() {} });
    const shiftEnterDidNotSend = state.match.phase === "DAY_PLAYER_TURN";
    el("quickFreeInput").dispatchEvent({ type: "keydown", key: "Enter", shiftKey: false, isComposing: true, preventDefault() {} });
    const composingDidNotSend = state.match.phase === "DAY_PLAYER_TURN";
    el("quickFreeInput").dispatchEvent({ type: "keydown", key: "Enter", shiftKey: false, isComposing: false, preventDefault() {} });
    const plainEnterSent = state.match.phase === "DAY_SPEECH";

    // Sheriff player speech wide mode + [data-card-load] sync
    clearStepTimer();
    el("chkSheriffMode").checked = true;
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidSh = getPlayerId();
    const pSh = getPlayerSeat();
    const shOthers = getAliveSeats().filter(s => s.id !== pidSh);
    pSh.checkedHistory = [{ day: 1, targetId: shOthers[0].id, isWolf: false }];
    state.match.phase = "SHERIFF_ELECTION";
    state.match.sheriffElectionCtx = {
      stage: "speech",
      candidateIds: [pidSh, shOthers[0].id],
      speechOrderIds: [pidSh, shOthers[0].id],
      speechIndex: 0,
      activeReelSeatId: pidSh,
      spokenSpeeches: [],
      withdrawnIds: [],
      playerRunning: true,
      playerBadgeFlowDraft: { firstTargetId: null, secondTargetId: null, explicit: false }
    };
    el("sheriffPlayerInput").value = "";
    updateAllUI();
    const sheriffWideModeOn = document.body.classList.contains("phase-mode-speak");
    const shCard = el("sheriffPlayerQuickChips").querySelectorAll("button")[0];
    const shLoadBtn = shCard && shCard.querySelector ? shCard.querySelector("[data-card-load]") : null;
    if (shLoadBtn) shLoadBtn.click();
    const sheriffCardLoadedOk = Boolean(
      state.match.phase === "SHERIFF_ELECTION" &&
      el("sheriffPlayerInput").value.includes("觀察員") &&
      state.match.sheriffElectionCtx.playerBadgeFlowDraft.firstTargetId !== null
    );

    // Last words [data-card-load] populates input without skipping phase
    state.match.phase = "LAST_WORDS_PLAYER";
    state.lastWordsCtx = { mode: "vote", queue: [pidSh], idx: 0 };
    preparePlayerLastWordsPanel("vote");
    updateAllUI();
    const lwCard = el("lastWordsChips").querySelectorAll("button")[0];
    const lwLoadBtn = lwCard && lwCard.querySelector ? lwCard.querySelector("[data-card-load]") : null;
    if (lwLoadBtn) lwLoadBtn.click();
    const lastWordsLoadedOk = Boolean(
      state.match.phase === "LAST_WORDS_PLAYER" &&
      el("lastWordsFreeInput").value.trim().length > 10
    );

    clearStepTimer();
    resetMatchToLobby();
    return {
      cardCountEq3,
      advDefaultCollapsed,
      advOpenedOnCardLoad,
      syncBarShown,
      draftHydrated,
      stackedEditPreservedRole,
      stanceAppended,
      clearedDraftOk,
      shiftEnterDidNotSend,
      composingDidNotSend,
      plainEnterSent,
      sheriffWideModeOn,
      sheriffCardLoadedOk,
      lastWordsLoadedOk
    };
  })()`, ctx);

  const v2432Res = { htmlComposerOk, cssWideSpeakOk, ...v2432Runtime };
  for (const [k, v] of Object.entries(v2432Res)) {
    if (!v) {
      throw new Error("v24.3.2 REGRESSION check failed for " + k + ": " + JSON.stringify(v2432Res));
    }
  }
}

{
  // v24.4.0 Regression: 7 movements w/ 8-bar melody + guqin timbre + mountain ambience + 14 unique TTS voices + vocal tag stripping
  const apiTtsHandler244 = (await import("../api/tts.js")).default;
  const apiGeminiHandler244 = (await import("../api/gemini.js")).default;
  const gem4Cfg244 = apiGeminiHandler244._buildGenerationConfig("gemini-3.5-flash-lite", true, 0.65);
  const geminiThinkingBudgetOk = Boolean(gem4Cfg244 && gem4Cfg244.maxOutputTokens >= 3072);
  const aiHtml244 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const cssComp244 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const htmlMusicModalOk =
    aiHtml244.includes('id="btnTimbreGuqin"') &&
    aiHtml244.includes('id="btnTrackSheriff"') &&
    aiHtml244.includes('id="btnTrackMatchpoint"') &&
    aiHtml244.includes('id="btnToggleAmbience"') &&
    aiHtml244.includes("七段式場景樂章") &&
    aiHtml244.includes("track-grid") &&
    !aiHtml244.includes("sm:grid-cols-7") &&
    cssComp244.includes(".track-grid");

  const bodyPrimary38 = apiTtsHandler244._buildTtsRequestBody(
    "gemini-3.8-flash-lite-tts",
    "早安，<breath> 請喝茶。<short pause> 慢慢說。",
    "Aoede",
    false
  );
  const body25 = apiTtsHandler244._buildTtsRequestBody(
    "gemini-2.5-flash-preview-tts",
    "早安，<breath> 請喝茶。<short pause> 慢慢說。",
    "Aoede",
    false
  );
  const tts38KeepsTagsOk = Boolean(
    bodyPrimary38 &&
    bodyPrimary38.contents[0].parts[0].text === "早安， 請喝茶。 慢慢說。" &&
    !bodyPrimary38.contents[0].parts[0].text.includes("Say:") &&
    !bodyPrimary38.contents[0].parts[0].speechMetadata
  );
  const tts25StripsTagsOk = Boolean(
    body25 &&
    !body25.contents[0].parts[0].text.includes("<breath>") &&
    !body25.contents[0].parts[0].text.includes("<short pause>") &&
    body25.contents[0].parts[0].text.startsWith("Say: ") &&
    !body25.contents[0].parts[0].speechMetadata
  );
  const bodyFallback38 = apiTtsHandler244._buildTtsRequestBody(
    "gemini-3.8-flash-tts",
    "早安，<breath> 請投五號。",
    "Fenrir",
    true
  );
  const ttsFallbackOrderOk =
    Array.isArray(apiTtsHandler244._TTS_FALLBACK_ORDER) &&
    apiTtsHandler244._TTS_FALLBACK_ORDER[0] === "gemini-3.8-flash-lite-tts" &&
    apiTtsHandler244._TTS_FALLBACK_ORDER[1] === "gemini-3.8-flash-tts" &&
    apiTtsHandler244._TTS_FALLBACK_ORDER[2] === "gemini-2.5-flash-preview-tts" &&
    apiTtsHandler244._TTS_FALLBACK_ORDER.length === 3 &&
    bodyFallback38.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Puck" &&
    !bodyFallback38.contents[0].parts[0].text.includes("<breath>");

  let tts400NoCooldownOk = false;
  const origFetch244 = globalThis.fetch;
  const prevApiKey244 = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "AIzaTestDummyKeyForSmokeCheckOnly00";
  apiTtsHandler244._resetRateLimit();
  try {
    const fakeWavB64 = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(1300, 1)]).toString("base64");
    globalThis.fetch = async function (url) {
      if (String(url).includes("gemini-3.8-flash-lite-tts")) {
        return { ok: false, status: 400, json: async () => ({ error: "bad request" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/wav", data: fakeWavB64 } }] } }]
        })
      };
    };
    const fakeHeaders = {};
    const fakeRes = {
      statusCode: 0,
      headers: fakeHeaders,
      body: null,
      setHeader(k, v) { fakeHeaders[k] = v; },
      end(b) { fakeRes.body = b; }
    };
    const fakeReq = {
      method: "POST",
      headers: { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app", "content-type": "application/json" },
      socket: { remoteAddress: "198.51.100.77" },
      body: { voice: "Fenrir", style: "冷靜", text: "<breath> 這輪投三號" }
    };
    await apiTtsHandler244(fakeReq, fakeRes);
    tts400NoCooldownOk = Boolean(
      fakeRes.statusCode === 200 &&
      fakeHeaders["X-TTS-Model"] === "gemini-3.8-flash-tts" &&
      !apiTtsHandler244._isModelCoolingDown("gemini-3.8-flash-lite-tts", Date.now())
    );
  } finally {
    globalThis.fetch = origFetch244;
    if (prevApiKey244 === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevApiKey244;
    apiTtsHandler244._resetRateLimit();
  }

  const stripped244Sample = apiTtsHandler244._stripGeminiVocalTags("<sigh> 好吧，<gasp> 竟然這樣！");
  const ttsStripFnOk = !stripped244Sample.includes("<sigh>") && !stripped244Sample.includes("<gasp>") && stripped244Sample.replace(/\s+/g, "") === "好吧，竟然這樣！";

  const v244Runtime = vm.runInContext(`(() => {
    clearStepTimer();
    const profileValues = Object.values(PERSONA_VOICE_PROFILES);
    const studioVoices = profileValues.map(p => p && p.studioVoice).filter(Boolean);

    const trackKeys = ["twilight", "night", "day", "sheriff", "vote", "matchpoint", "finale"];
    const movements7Ok = trackKeys.every(k =>
      MOVEMENTS[k] &&
      Array.isArray(MOVEMENTS[k].melody) &&
      MOVEMENTS[k].melody.length === 8 &&
      MOVEMENTS[k].melody.every(bar => Array.isArray(bar) && bar.length === 8)
    );

    el("selectModeCount").value = "8";
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    const seedNewOk = typeof state.match.matchStyleSeed === "number";
    sound.trackMode = "auto";
    state.match.started = true;
    state.match.isMatchPoint = false;
    state.match.phase = "SHERIFF_ELECTION";
    const trackSheriffOk = sound.resolveTargetTrack() === "sheriff";
    state.match.phase = "DAY_VOTE_RESULT";
    const trackVoteOk = sound.resolveTargetTrack() === "vote";
    state.match.phase = "DAY_SPEECH";
    state.match.isMatchPoint = true;
    const trackMatchPointOk = sound.resolveTargetTrack() === "matchpoint";

    const prevTimbre = sound.timbre;
    const prevMode = sound.trackMode;
    const prevAmb = sound.ambientEnabled;
    el("btnTimbreGuqin").click();
    const guqinClickOk = sound.timbre === "guqin";
    el("btnTrackSheriff").click();
    const sheriffClickOk = sound.trackMode === "sheriff";
    el("btnTrackMatchpoint").click();
    const matchpointClickOk = sound.trackMode === "matchpoint";
    el("btnToggleAmbience").click();
    const ambienceToggleOk = sound.ambientEnabled === !prevAmb;
    saveUserPrefs();

    sound.timbre = "zen";
    sound.trackMode = "auto";
    sound.ambientEnabled = prevAmb;
    loadUserPrefs();
    const prefsRoundTripOk = sound.timbre === "guqin" && sound.trackMode === "matchpoint" && sound.ambientEnabled === !prevAmb;

    sound.timbre = prevTimbre || "zen";
    sound.trackMode = prevMode || "auto";
    sound.ambientEnabled = prevAmb;
    saveUserPrefs();
    if (typeof syncPrefsToControls === "function") syncPrefsToControls();

    const strippedVoice = typeof voice.stripGeminiVocalTags === "function"
      ? voice.stripGeminiVocalTags("<breath> 測試 <short pause> 語音")
      : "";
    const tagAsong = voice.injectGeminiVocalTags("這輪投三號！", "阿松", "accuse");
    const tagXiaocheng = voice.injectGeminiVocalTags("時間點兜不攏。", "小澄", "doubt");
    const tagAlang = voice.injectGeminiVocalTags("拿出證據吧！", "阿朗", "accuse");
    const noThroatClearingOk =
      !tagAsong.includes("<throat-clearing>") &&
      !tagXiaocheng.includes("<throat-clearing>") &&
      !tagAlang.includes("<throat-clearing>");
    const shortMidLine = "前面幾位講得都滿順的，我覺得今天這輪可以先從二號開始觀察。";
    const longMultiLine = "第一段話先順完前面所有人的立場與時間線對照，我覺得三號前後說詞明顯兜不起來需要重點檢視！接下來第二段也要提醒還沒發言的幾位好夥伴務必把自己的站邊、投票對象與真實線索講清楚，並且回頭比對昨天公投誰跟著起鬨催票，這樣好人陣營才不會投錯人造成遺憾。";
    const splitThresholdOk =
      voice._splitFirstSentenceForFastStart(shortMidLine, 118) === null &&
      Array.isArray(voice._splitFirstSentenceForFastStart(longMultiLine, 118));
    const audioHelpersOk = Boolean(
      typeof sound.voiceLead === "function" &&
      typeof sound.triggerAmbientPulse === "function" &&
      typeof voice.stripGeminiVocalTags === "function" &&
      !strippedVoice.includes("<breath>") &&
      !strippedVoice.includes("<short pause>") &&
      strippedVoice.includes("測試") &&
      strippedVoice.includes("語音") &&
      noThroatClearingOk &&
      splitThresholdOk
    );

    const tempCasualOk =
      resolveGeminiSpeechTemperature("day", { isCasualVariety: true }) === 0.75 &&
      resolveGeminiSpeechTemperature("day") === 0.65 &&
      resolveGeminiSpeechTemperature("sheriff") === 0.58;

    // Speech variety + matchStyleSeed determinism check
    state.match.isMatchPoint = false;
    state.match.phase = "DAY_SPEECH";
    state.match.day = 1;
    state.match.playerSeatId = 1;
    state.match.seats.forEach(s => {
      s.alive = true;
      s.claimedRole = null;
      s.isPlayer = (s.id === 1);
    });
    state.match.dayOrder = state.match.seats.map(s => s.id);
    state.match.speechQueue = [5, 6, 7, 8, 1];
    state.match.daySpeechEvents = [
      { speakerId: 2, day: 1, accuseId: 4, text: "二號先報個身分，覺得四號有點急。" },
      { speakerId: 3, day: 1, vouchId: 2, text: "我也站二號這邊，看四號後面怎麼說。" }
    ];
    state.match.matchStyleSeed = 111;
    const seat5 = getSeat(5);
    seat5.role = "villager";
    seat5.team = "good";
    seat5.isPlayer = false;
    seat5.fakeSeer = false;
    seat5.claimedRole = null;
    seat5.name = "晨晨";
    seat5.suspicionMap = {};
    const outSeed1A = buildHeuristicAiSpeech(seat5);
    const outSeed1B = buildHeuristicAiSpeech(seat5);
    const deterministicSameSeedOk = Boolean(outSeed1A && outSeed1B && outSeed1A.text === outSeed1B.text);
    const collectedTexts = [];
    [11, 22, 33, 44, 55, 66, 77].forEach(sd => {
      state.match.matchStyleSeed = sd;
      const sp = buildHeuristicAiSpeech(seat5);
      if (sp && sp.text) collectedTexts.push(sp.text);
    });
    const speechVarietyOk = Boolean(
      seedNewOk &&
      deterministicSameSeedOk &&
      new Set(collectedTexts).size >= 2 &&
      collectedTexts.every(t => !t.includes("先這樣，過")) &&
      collectedTexts.some(t => t.length <= 60)
    );

    const midCutRejected = parseGeminiStructuredSpeech('{"text":"咦，怎麼話題突然轉到我身上了——5號星兒，妳第一天口頭點我，公投卻改') === null;
    const midCutSalvaged = parseGeminiStructuredSpeech('{"text":"5號星兒昨天口頭點我卻改票，這點很可疑。至於後面8號阿松我覺得他剛');
    const speechTruncationGuardOk = Boolean(
      midCutRejected &&
      midCutSalvaged &&
      midCutSalvaged.text === "5號星兒昨天口頭點我卻改票，這點很可疑。"
    );

    const prevVoiceSpeaking244 = voice.speaking;
    voice.speaking = false;
    syncSpeakerBannerVisuals(seat5, "05號 · " + seat5.name, "直覺衝刺", false);
    const waveEl244 = el("speakerVoiceWave");
    const badgeEl244 = el("spotlightSpeakerBadge");
    const speakerBannerPolishOk = Boolean(
      waveEl244 && waveEl244.classList.contains("hidden") &&
      badgeEl244 && badgeEl244.textContent === seat5.name
    );
    voice.speaking = prevVoiceSpeaking244;

    el("selectModeCount").value = "8";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    state.match.day = 1;
    state.match.sheriffElectionPending = true;
    const prewarmOk = prewarmSheriffElectionPipeline({ forceLocalPrewarm: true });
    const prewObj = state.match._sheriffPrewarm;
    const sheriffPrewarmZeroLeakOk = Boolean(
      prewarmOk &&
      prewObj &&
      Object.keys(prewObj.cacheByKey || {}).length >= 1 &&
      Array.isArray(prewObj.baseCandidateIds) &&
      prewObj.baseCandidateIds.every(cid => {
        const s = getSeat(cid);
        return s && s.claimedRole === null;
      })
    );

    clearStepTimer();
    resetMatchToLobby();
    return {
      studioVoices,
      movements7Ok,
      resolveTrackOk: trackSheriffOk && trackVoteOk && trackMatchPointOk,
      mixerUiOk: guqinClickOk && sheriffClickOk && matchpointClickOk && ambienceToggleOk,
      prefsRoundTripOk,
      audioHelpersOk,
      tempCasualOk,
      speechVarietyOk,
      speechTruncationGuardOk,
      speakerBannerPolishOk,
      sheriffPrewarmZeroLeakOk
    };
  })()`, ctx);

  const uniqueStudioVoicesOk =
    Array.isArray(v244Runtime.studioVoices) &&
    v244Runtime.studioVoices.length === 14 &&
    new Set(v244Runtime.studioVoices).size === 14 &&
    v244Runtime.studioVoices.every(v => apiTtsHandler244._ALLOWED_VOICES instanceof Set && apiTtsHandler244._ALLOWED_VOICES.has(v));

  const v244Res = {
    htmlMusicModalOk,
    geminiThinkingBudgetOk,
    tts38KeepsTagsOk,
    tts25StripsTagsOk,
    ttsFallbackOrderOk,
    tts400NoCooldownOk,
    ttsStripFnOk,
    uniqueStudioVoicesOk,
    movements7Ok: v244Runtime.movements7Ok,
    resolveTrackOk: v244Runtime.resolveTrackOk,
    mixerUiOk: v244Runtime.mixerUiOk,
    prefsRoundTripOk: v244Runtime.prefsRoundTripOk,
    audioHelpersOk: v244Runtime.audioHelpersOk,
    tempCasualOk: v244Runtime.tempCasualOk,
    speechVarietyOk: v244Runtime.speechVarietyOk,
    speechTruncationGuardOk: v244Runtime.speechTruncationGuardOk,
    speakerBannerPolishOk: v244Runtime.speakerBannerPolishOk,
    sheriffPrewarmZeroLeakOk: v244Runtime.sheriffPrewarmZeroLeakOk
  };
  for (const [k, v] of Object.entries(v244Res)) {
    if (!v) {
      throw new Error("v24.4.0 REGRESSION check failed for " + k + ": " + JSON.stringify(v244Res));
    }
  }
}

// ==================== LISTEN-PHASE LIVE PIT BAR (邊聽邊排雙向同步 + 零洩漏 + 跨階段無縫銜接) ====================
{
  const listenPitRes = vm.runInContext(`(() => {
    const findTree = (root, pred) => {
      const out = [];
      const visit = node => {
        if (!node) return;
        if (pred(node)) out.push(node);
        if (Array.isArray(node._children)) node._children.forEach(visit);
      };
      visit(root);
      return out;
    };

    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = true;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });

    const pid = getPlayerId();
    const pSeat = getPlayerSeat();
    const others = getAliveSeats().filter(s => s.id !== pid);
    const shCand = others[0];
    const shOther = others[1];
    pSeat.checkedHistory = [{ day: 1, targetId: shCand.id, isWolf: true }];

    // 1. Sheriff election speech listening: #listenPitBar visible, clicks sync draft + marks without tableReactions leak
    const violBefore = antiCheatMonitor.stats.violationsBlocked;
    state.match.sheriffElectionPending = true;
    state.match.sheriffElectionCtx = {
      stage: "speech",
      candidateIds: [shCand.id, shOther.id],
      speechOrderIds: [shCand.id, shOther.id],
      speechIndex: 0,
      activeReelSeatId: shCand.id,
      withdrawnIds: [],
      spokenSpeeches: [],
      speeches: [],
      playerRunning: false
    };
    state.match.phase = "SHERIFF_ELECTION";
    state.activeSpeakerId = shCand.id;
    updateAllUI();

    const shBarShown = !el("listenPitBar").classList.contains("hidden");
    const reactLenBefore = Array.isArray(state.match.tableReactions) ? state.match.tableReactions.length : 0;
    const shCandBtn = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(shCand.id))[0];
    if (shCandBtn) shCandBtn.click();
    const shWolfSyncedOk = Boolean(
      state.match.playerDraftPits.wolfIds.includes(shCand.id) &&
      state.playerMarks[shCand.id] === "wolf" &&
      (Array.isArray(state.match.tableReactions) ? state.match.tableReactions.length : 0) === reactLenBefore
    );
    const shOtherBtn1 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(shOther.id))[0];
    if (shOtherBtn1) shOtherBtn1.click();
    const shOtherBtn2 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(shOther.id))[0];
    if (shOtherBtn2) shOtherBtn2.click();
    const shGoodSyncedOk = Boolean(
      state.match.playerDraftPits.goodIds.includes(shOther.id) &&
      state.playerMarks[shOther.id] === "good"
    );
    const zeroLeakDuringSheriff = antiCheatMonitor.stats.violationsBlocked === violBefore;

    // 2. Day speech listening -> toggle Seer claim + preview -> seamless handoff into DAY_PLAYER_TURN
    state.match.sheriffElectionPending = false;
    state.match.sheriffElectionCtx = null;
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = shCand.id;
    updateAllUI();
    const dayListenShown = !el("listenPitBar").classList.contains("hidden");
    const seerRoleChip = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-role") === "seer")[0];
    if (seerRoleChip) seerRoleChip.click();
    const previewShownOk = findTree(el("listenPitBar"), n => n.classList && n.classList.contains("listen-pit-preview"))
      .some(n => String(n.textContent || "").includes("待發陳詞預覽") && String(n.textContent || "").includes("觀察員"));

    // Last words listening vs self-speaking hide guard
    state.match.phase = "LAST_WORDS_SPEECH";
    state.activeSpeakerId = shOther.id;
    updateAllUI();
    const lwListenShown = !el("listenPitBar").classList.contains("hidden");
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = pid;
    updateAllUI();
    const selfSpeakingHidden = el("listenPitBar").classList.contains("hidden");

    // Reverse sync from #btnMarkWolf in DAY_SPEECH + collapse toggle
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = others[2].id;
    updateAllUI();
    el("btnMarkWolf").click();
    const reverseSyncOk = Boolean(
      state.playerMarks[others[2].id] === "wolf" &&
      state.match.playerDraftPits.wolfIds.includes(others[2].id) &&
      findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others[2].id))
        .some(btn => btn.classList && btn.classList.contains("is-wolf"))
    );
    // Default-collapsed for 70%+ open 3D stage -> click 1 expands -> click 2 collapses
    const defaultCollapsedOk = Boolean(
      state.listenPitCollapsed === true &&
      findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-toggle") === "1")
        .some(b => b.getAttribute("aria-expanded") === "false")
    );
    const tBtn1 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-toggle") === "1")[0];
    if (tBtn1) tBtn1.click();
    const expandedOk = Boolean(
      state.listenPitCollapsed === false &&
      findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-toggle") === "1")
        .some(b => b.getAttribute("aria-expanded") === "true")
    );
    const tBtn2 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-toggle") === "1")[0];
    if (tBtn2) tBtn2.click();
    const collapsedOk = Boolean(
      defaultCollapsedOk &&
      state.listenPitCollapsed === true &&
      findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-toggle") === "1")
        .some(b => b.getAttribute("aria-expanded") === "false")
    );

    // Transition to DAY_PLAYER_TURN: #listenPitBar hides, #speechAdvancedDrawer stays default-collapsed, composer auto-hydrates!
    state.match.phase = "DAY_PLAYER_TURN";
    preparePlayerSpeechPanel();
    updateAllUI();
    const turnHidesListenBar = el("listenPitBar").classList.contains("hidden");
    const advStaysCollapsed = el("speechAdvancedDrawer").classList.contains("hidden");
    const draftCarriedOverOk = Boolean(
      state.match.playerDraftPits.claimRole === "seer" &&
      state.match.playerDraftPits.wolfIds.includes(shCand.id) &&
      state.match.playerDraftPits.goodIds.includes(shOther.id) &&
      el("quickFreeInput").value.includes("觀察員") &&
      el("quickFreeInput").value.includes(fmtSeatNum(others[2].id) + "號") &&
      el("playerSpeechInput").value === el("quickFreeInput").value &&
      el("btnToggleCustomSpeech").innerHTML.includes("好") &&
      el("btnQuickFreeSend").textContent.includes("狼")
    );

    // 3. Wolf player listening: excludes wolf mate + God-Hunt notebook cycles cleanly
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "wolf";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });
    const wPid = getPlayerId();
    const wolfMate = getAliveSeats().find(s => s.id !== wPid && s.role === "wolf");
    const goodVictim = getAliveSeats().find(s => s.id !== wPid && s.role !== "wolf");
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = goodVictim.id;
    updateAllUI();
    const wolfSeatChips = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat"));
    const wolfExcludesMateOk = Boolean(
      el("listenPitBar").classList.contains("is-wolf-board") &&
      wolfMate &&
      !wolfSeatChips.some(b => b.getAttribute("data-listen-pit-seat") === String(wolfMate.id))
    );
    const wolfGodBtn = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-wolf-god") === String(goodVictim.id))[0];
    if (wolfGodBtn) wolfGodBtn.click();
    const wolfGodNoteOk = state.match.wolfGodMarks[goodVictim.id] === "seer";

    clearStepTimer();
    resetMatchToLobby();
    return {
      shBarShown,
      shWolfSyncedOk,
      shGoodSyncedOk,
      zeroLeakDuringSheriff,
      dayListenShown,
      previewShownOk,
      lwListenShown,
      selfSpeakingHidden,
      reverseSyncOk,
      collapsedOk,
      expandedOk,
      turnHidesListenBar,
      advStaysCollapsed,
      draftCarriedOverOk,
      wolfExcludesMateOk,
      wolfGodNoteOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(listenPitRes)) {
    if (!v) {
      throw new Error("LISTEN-PIT-BAR check failed for " + k + ": " + JSON.stringify(listenPitRes));
    }
  }
}

// ==================== SOUNDTRACK ACOUSTIC ENGINE REGRESSION ====================
{
  const audioUpgradeRes = vm.runInContext(`(() => {
    const trackKeys = ["twilight", "night", "day", "sheriff", "vote", "matchpoint", "finale"];
    const scoreRangeOk = trackKeys.every(k => {
      const mv = MOVEMENTS[k];
      if (!mv || mv.bpm < 54 || mv.bpm > 145) return false;
      if (!Array.isArray(mv.pads) || mv.pads.length !== 4) return false;
      if (!mv.pads.every(bar => Array.isArray(bar) && bar.length === 4 && bar.every(m => m >= 24))) return false;
      if (!Array.isArray(mv.arps) || mv.arps.length !== 4 || !mv.arps.every(bar => Array.isArray(bar) && bar.length === 8)) return false;
      if (!Array.isArray(mv.bells) || mv.bells.length !== 4 || !mv.bells.every(bar => Array.isArray(bar) && bar.length === 8)) return false;
      if (!Array.isArray(mv.melody) || mv.melody.length !== 8) return false;
      return mv.melody.every(bar => Array.isArray(bar) && bar.length === 8);
    });

    const mkParam = (v) => ({ value: v || 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(){} });
    const mockCtx = {
      sampleRate: 44100,
      currentTime: 2.0,
      destination: {},
      createBuffer: (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
      createOscillator: () => ({ type: "sine", frequency: mkParam(440), detune: mkParam(0), connect(){}, disconnect(){}, start(){}, stop(){}, onended: null }),
      createGain: () => ({ gain: mkParam(1), connect(){}, disconnect(){} }),
      createBiquadFilter: () => ({ type: "lowpass", frequency: mkParam(1000), Q: mkParam(1), gain: mkParam(0), connect(){}, disconnect(){} }),
      createBufferSource: () => ({ buffer: null, loop: false, connect(){}, disconnect(){}, start(){}, stop(){}, onended: null }),
      createStereoPanner: () => ({ pan: mkParam(0), connect(){}, disconnect(){} }),
      createConvolver: () => ({ buffer: null, connect(){}, disconnect(){} }),
      createDynamicsCompressor: () => ({ threshold: mkParam(-14), knee: mkParam(18), ratio: mkParam(4), connect(){}, disconnect(){} })
    };

    const snap = {
      ctx: sound.ctx,
      bgmGain: sound.bgmGain,
      sfxGain: sound.sfxGain,
      ambientGain: sound.ambientGain,
      reverb: sound.reverb,
      comp: sound.comp,
      muted: sound.muted,
      bgmVol: sound.bgmVol,
      sfxVol: sound.sfxVol,
      timbre: sound.timbre,
      currentTrack: sound.currentTrack,
      barIdx: sound.barIdx,
      stepIdx: sound.stepIdx,
      ambientEnabled: sound.ambientEnabled,
      pluckBuf: sound._pluckNoiseBuf,
      breathBuf: sound._breathNoiseBuf
    };

    let renderOk = false;
    try {
      sound.ctx = mockCtx;
      sound.bgmGain = mockCtx.createGain();
      sound.sfxGain = mockCtx.createGain();
      sound.ambientGain = mockCtx.createGain();
      sound.comp = mockCtx.createDynamicsCompressor();
      sound.muted = false;
      sound.bgmVol = 0.6;
      sound.sfxVol = 0.75;
      sound.ambientEnabled = true;
      sound._pluckNoiseBuf = null;
      sound._breathNoiseBuf = null;
      sound.ensureNoiseBuffers();
      sound.reverb = sound.buildHallReverb(2.5);

      const noiseBuffersOk = Boolean(sound._pluckNoiseBuf && sound._breathNoiseBuf && sound.reverb && sound.reverb.buffer);

      ["zen", "guqin", "folk", "cinema"].forEach(tMode => {
        sound.timbre = tMode;
        sound.voicePluck(440, 2.0, 0.8, 0.14, 1);
        sound.voiceLead(523.25, 587.33, 2.0, 0.9, 0.08);
        sound.voicePad([47, 54, 59, 62], 2.0, 2.4, 0.07);
        sound.voiceBell(880, 2.0, 1.5, 0.05);
      });

      ["deep", "wood", "rim", "brush"].forEach(dk => sound.voiceDrum(dk, 2.0, 0.12));

      trackKeys.forEach(tk => {
        sound.currentTrack = tk;
        sound.barIdx = 1;
        sound.stepIdx = 0;
        sound.tickStep(2.0);
        sound.triggerAmbientPulse(tk, 2.0, 3.0);
      });

      sound.playNight();
      sound.playDawn();
      sound.playBlessing();
      sound.playVote();
      sound.playHunterShot();
      sound.playWin(true);
      sound.playWin(false);
      sound.playRoleRevealFanfare(true);
      sound.playRoleRevealFanfare(false);

      renderOk = noiseBuffersOk;
    } finally {
      sound.ctx = snap.ctx;
      sound.bgmGain = snap.bgmGain;
      sound.sfxGain = snap.sfxGain;
      sound.ambientGain = snap.ambientGain;
      sound.reverb = snap.reverb;
      sound.comp = snap.comp;
      sound.muted = snap.muted;
      sound.bgmVol = snap.bgmVol;
      sound.sfxVol = snap.sfxVol;
      sound.timbre = snap.timbre;
      sound.currentTrack = snap.currentTrack;
      sound.barIdx = snap.barIdx;
      sound.stepIdx = snap.stepIdx;
      sound.ambientEnabled = snap.ambientEnabled;
      sound._pluckNoiseBuf = snap.pluckBuf;
      sound._breathNoiseBuf = snap.breathBuf;
    }

    return { scoreRangeOk, renderOk };
  })()`, ctx);

  for (const [k, v] of Object.entries(audioUpgradeRes)) {
    if (!v) {
      throw new Error("SOUNDTRACK ACOUSTIC UPGRADE check failed for " + k + ": " + JSON.stringify(audioUpgradeRes));
    }
  }
}

// ==================== AI WEREWOLF TACTICS & DIFFICULTY SCALING REGRESSION ====================
{
  const aiTacticsRes = vm.runInContext(`(() => {
    clearStepTimer();
    const prevDiff = state.aiDifficulty;
    state.activeVariant = "standard";
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("selectAiDifficulty").value = "pro";
    el("chkSheriffMode").checked = true;
    el("chkGuardMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });

    const seats = state.match.seats;
    const seerSeat = seats.find(s => s.role === "seer");
    const guardSeat = seats.find(s => s.role === "guard");
    const witchSeat = seats.find(s => s.role === "witch");
    const wolfSeat = seats.find(s => s.role === "wolf");
    const villagerSeat = seats.find(s => s.id !== 1 && s.team === "good" && s.role === "villager");

    // 1. Seer never checks a rival counter-claiming Seer when unchecked seats exist
    state.match.day = 2;
    state.match.phase = "NIGHT_SEER";
    seerSeat.checkedHistory = [];
    seerSeat.suspicionMap = {};
    wolfSeat.claimedRole = "seer";
    seerSeat.suspicionMap[wolfSeat.id] = 98;
    const seerPickId = chooseAiSeerTarget(seerSeat);
    const seerSkipsRivalOk = Boolean(seerPickId && seerPickId !== wolfSeat.id);

    // 2. Guard Night-1 empty-guard scaling (pro empty-guards at rng=0.5, easy guards at rng=0.5) + Night 2+ protects sole Witch
    wolfSeat.claimedRole = null;
    state.match.day = 1;
    state.match.phase = "NIGHT_GUARD";
    state.match.lastGuardTargetId = null;
    state.aiDifficulty = "pro";
    state.match.aiDifficulty = "pro";
    const guardProN1 = chooseAiGuardTarget(guardSeat, 0.5);
    state.aiDifficulty = "easy";
    state.match.aiDifficulty = "easy";
    const guardEasyN1 = chooseAiGuardTarget(guardSeat, 0.5);
    state.aiDifficulty = "pro";
    state.match.aiDifficulty = "pro";
    state.match.day = 2;
    witchSeat.claimedRole = "witch";
    guardSeat.suspicionMap[witchSeat.id] = 40;
    const guardProN2 = chooseAiGuardTarget(guardSeat, 0.5);
    const guardScalingOk = Boolean(guardProN1 === null && guardEasyN1 !== null && guardProN2 === witchSeat.id);

    // 3. Witch immediately purifies a counter-claiming fake Witch in pro/normal; gentle threshold in easy
    state.match.day = 2;
    state.match.phase = "NIGHT_WITCH";
    state.match.witchPotions.heal = false;
    state.match.witchPotions.purify = true;
    const fakeWitchWolf = seats.find(s => s.role === "wolf" && s.id !== wolfSeat.id) || wolfSeat;
    fakeWitchWolf.claimedRole = "witch";
    witchSeat.suspicionMap[fakeWitchWolf.id] = 52;
    state.aiDifficulty = "pro";
    state.match.aiDifficulty = "pro";
    const witchProPurify = chooseAiWitchNightAction(witchSeat, 0.5);
    fakeWitchWolf.claimedRole = null;
    witchSeat.suspicionMap[fakeWitchWolf.id] = 74;
    state.aiDifficulty = "easy";
    state.match.aiDifficulty = "easy";
    const witchEasyHold = chooseAiWitchNightAction(witchSeat, 0.5);
    const witchScalingOk = Boolean(witchProPurify.poisonTargetId === fakeWitchWolf.id && witchEasyHold.poisonTargetId === null);

    // 4. Dead night-killed Seer strips surviving rival Fake-Seer of uncontested status & elevates clash penalty
    state.aiDifficulty = "pro";
    state.match.aiDifficulty = "pro";
    state.match.day = 2;
    state.match.voteHistory = [];
    seerSeat.claimedRole = "seer";
    seerSeat.alive = false;
    seerSeat.outReason = "夜間離席";
    wolfSeat.claimedRole = "seer";
    wolfSeat.alive = true;
    const deadSeerSlot = buildTableSlotAndWorldAnalysis(villagerSeat);
    const deadSeerClashOk = Boolean(
      deadSeerSlot &&
      Array.isArray(deadSeerSlot.deadNightSeers) &&
      deadSeerSlot.deadNightSeers.includes(seerSeat.id) &&
      deadSeerSlot.wolfPits.some(w => w.id === wolfSeat.id)
    );

    // 5. Real Seer never votes for rival Fake-Seer in chooseAiSheriffElectionVote; Good voters align with chosenWorld & spare sole Witch
    seerSeat.alive = true;
    const shVoteBySeer = chooseAiSheriffElectionVote(seerSeat, [wolfSeat.id, villagerSeat.id], [
      { id: wolfSeat.id, tone: "seer", badgeFlow: { firstTargetId: villagerSeat.id }, text: "我是明心" },
      { id: villagerSeat.id, tone: "bold", text: "我是好人" }
    ], false);
    const seerSheriffNoRivalOk = shVoteBySeer === villagerSeat.id;

    wolfSeat.claimedRole = "seer";
    villagerSeat.claimedRole = "seer";
    seerSeat.claimedRole = null;
    state.match.daySpeechEvents = [
      { day: 2, speakerId: villagerSeat.id, claimRole: "seer", checkedGoodId: guardSeat.id, hasToxicSlip: false },
      { day: 2, speakerId: wolfSeat.id, claimRole: "seer", checkedWolfId: witchSeat.id, hasToxicSlip: true }
    ];
    state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
    const otherGoodVoter = seats.find(s => s.id !== 1 && s.team === "good" && s.id !== villagerSeat.id && s.id !== witchSeat.id && s.id !== seerSeat.id) || guardSeat;
    otherGoodVoter.suspicionMap = {};
    const voteWorldPick = chooseAiVoteTarget(otherGoodVoter, { pkActive: false });
    const worldAlignedVoteOk = Boolean(voteWorldPick === wolfSeat.id);

    // 6. Pro Fake-Seer avoids framing voteDisabled proven Elder & prompt contains difficulty directive
    villagerSeat.claimedRole = null;
    state.match.daySpeechEvents = [];
    const elderGood = seats.find(s => s.team === "good" && s.id !== wolfSeat.id && s.id !== witchSeat.id);
    if (elderGood) elderGood.voteDisabled = true;
    state.match.day = 1;
    wolfSeat.fakeSeer = true;
    wolfSeat.claimedRole = "seer";
    wolfSeat.fakeCheckedIds = [];
    wolfSeat.suspicionMap = {};
    const ctxFakePro = buildSpeechContext(wolfSeat);
    const fakeSpeechPro = tryRoleSpecificSpeech(wolfSeat, ctxFakePro);
    const fakeSeerAvoidsElderOk = Boolean(fakeSpeechPro && fakeSpeechPro.claimSeer && (!elderGood || fakeSpeechPro.checkedWolfId !== elderGood.id));

    state.aiDifficulty = "easy";
    state.match.aiDifficulty = "easy";
    const promptEasy = buildBlindGeminiSpeechPrompt(villagerSeat, {});
    state.aiDifficulty = "pro";
    state.match.aiDifficulty = "pro";
    const promptPro = buildBlindGeminiSpeechPrompt(villagerSeat, {});
    const diffPromptOk = Boolean(
      promptEasy && promptEasy.prompt && promptEasy.prompt.includes("新手友善局") && promptEasy.audit && promptEasy.audit.ok &&
      promptPro && promptPro.prompt && promptPro.prompt.includes("凹嗚高手局") && promptPro.audit && promptPro.audit.ok
    );

    state.aiDifficulty = prevDiff || "normal";
    clearStepTimer();
    resetMatchToLobby();
    return {
      seerSkipsRivalOk,
      guardScalingOk,
      witchScalingOk,
      deadSeerClashOk,
      seerSheriffNoRivalOk,
      worldAlignedVoteOk,
      fakeSeerAvoidsElderOk,
      diffPromptOk
    };
  })()`, ctx);

  for (const [k, v] of Object.entries(aiTacticsRes)) {
    if (!v) {
      throw new Error("AI WEREWOLF TACTICS regression failed for " + k + ": " + JSON.stringify(aiTacticsRes));
    }
  }
}

// --- v24.4 UX Consolidation: Single 4G Deck, Vote Notes Deck, Candlelit Word-Cards & Composable Speech Builder ---
{
  const cssCompSrc = fs.readFileSync("css/components.css", "utf8");
  const cornerConsolidatedHtml = html.includes('id="cornerFourGDeck" class="corner-hand-fan is-consolidated-into-deck');
  const uxRes = vm.runInContext(`(() => {
    const findTree = function (root, pred) {
      const out = [];
      const visit = function (node) {
        if (!node) return;
        if (pred(node)) out.push(node);
        if (Array.isArray(node._children)) node._children.forEach(visit);
      };
      visit(root);
      return out;
    };
    const allTreeText = function (root) {
      return findTree(root, n => Boolean(n)).map(n => String(n.textContent || "") + String(n.innerHTML || "")).join(" ");
    };
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "seer";
    el("chkSheriffMode").checked = false;
    el("chkGuardMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();

    const pid = getPlayerId();
    const others = getAliveSeats().filter(s => s.id !== pid);

    // A. Consolidated Four-Givings deck (default-folded for 70%+ open stage; click 1 unfolds, click 2 folds)
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = others[0].id;
    updateAllUI();
    el("btnQuick4GJoy").click();
    const synPillShown = !el("vqSynergyPill").classList.contains("hidden");
    const defaultFoldedOk = el("virtueQuickDeck").classList.contains("is-folded") && el("btnToggleVirtueDeck").getAttribute("aria-expanded") === "false";
    el("btnToggleVirtueDeck").click();
    const unfoldedDeckOk = !el("virtueQuickDeck").classList.contains("is-folded") && el("btnToggleVirtueDeck").getAttribute("aria-expanded") === "true";
    el("btnToggleVirtueDeck").click();
    const foldedDeckOk = defaultFoldedOk && el("virtueQuickDeck").classList.contains("is-folded") && el("btnToggleVirtueDeck").getAttribute("aria-expanded") === "false";

    // B. Listening Good/Wolf mark -> Vote Notes Deck display & 1-click lock
    state.playerMarks = {};
    if (state.match.playerDraftPits) state.match.playerDraftPits = createEmptyPlayerDraftPits();
    state.match.daySpeechEvents = [
      { day: 1, speakerId: others[0].id, accuseId: others[1].id, rawText: "前置位討論先聽完一輪，我覺得 " + fmtSeatNum(others[1].id) + "號 發言有點急著帶節奏。" },
      { day: 1, speakerId: others[2].id, vouchId: others[3].id, rawText: "整體節奏還好，不過我暫時相信 " + fmtSeatNum(others[3].id) + "號。" }
    ];
    state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = others[0].id;
    updateAllUI();
    const listenMarkWolfChip = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others[0].id))[0];
    if (listenMarkWolfChip) listenMarkWolfChip.click();
    const listenMarkGoodChip1 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others[2].id))[0];
    if (listenMarkGoodChip1) listenMarkGoodChip1.click();
    const listenMarkGoodChip2 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others[2].id))[0];
    if (listenMarkGoodChip2) listenMarkGoodChip2.click();

    // C. Night 2+ pacing: non-acting villager skips auto Candlelit Night Review cleanly into night roles
    const prevMatchMedia = window.matchMedia;
    window.matchMedia = function () { return { matches: false }; };
    el("selectPreferredRole").value = "villager";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pidVil = getPlayerId();
    const othersVil = getAliveSeats().filter(s => s.id !== pidVil);
    state.match.day = 1;
    state.match.allSpeechEvents = [
      { day: 1, speakerId: othersVil[0].id, accuseId: othersVil[1].id, rawText: "前置位發言先聽完再決定這輪公投方向。" },
      { day: 1, speakerId: othersVil[1].id, vouchId: othersVil[2].id, rawText: "我覺得這輪節奏穩穩盤就好。" }
    ];
    beginNightPhase();
    clearStepTimer();
    const autoCandlelitSkippedOk = Boolean(
      (!state.match.candlelitReview || !state.match.candlelitReview.active) &&
      el("candlelitReviewCard").classList.contains("hidden") &&
      isNightPhase(state.match.phase)
    );
    window.matchMedia = prevMatchMedia;

    // Re-setup Seer match for manual helper + vote notes verification
    el("selectPreferredRole").value = "seer";
    startNewGame();
    indieFlow.hideRoleDealRitual();
    const pid2 = getPlayerId();
    const others2 = getAliveSeats().filter(s => s.id !== pid2);
    state.playerMarks = {};
    state.match.playerDraftPits = createEmptyPlayerDraftPits();
    state.match.phase = "DAY_SPEECH";
    state.activeSpeakerId = others2[0].id;
    updateAllUI();
    const lmW = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others2[0].id))[0];
    if (lmW) lmW.click();
    const lmG1 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others2[2].id))[0];
    if (lmG1) lmG1.click();
    const lmG2 = findTree(el("listenPitBar"), n => n.getAttribute && n.getAttribute("data-listen-pit-seat") === String(others2[2].id))[0];
    if (lmG2) lmG2.click();

    // Verify manual Candlelit helper preserves full quote & free watch inspect if invoked directly
    state.match.day = 2;
    const sampleLongQuote = "前置位討論先聽完一輪，我覺得 " + fmtSeatNum(others2[1].id) + "號 發言有點急著帶節奏，完全沒有比對昨天警下誰跟風分票。";
    state.match.allSpeechEvents = [
      { day: 1, speakerId: others2[0].id, accuseId: others2[1].id, rawText: sampleLongQuote },
      { day: 1, speakerId: others2[2].id, vouchId: others2[3].id, rawText: "聽下來我暫時保 " + fmtSeatNum(others2[3].id) + "號，這輪先聽完大家結論再穩穩落票。" }
    ];
    const slipsNight = buildCandlelitNightSlips();
    const fullQuoteKeptOk = Boolean(slipsNight[0] && slipsNight[0].quote === sampleLongQuote && slipsNight[0].quote.length > 35);
    const openedCandle = openCandlelitNightReview(() => {});
    toggleCandlelitWatchSeat(slipsNight[0].seatId);
    finishCandlelitNightReview();
    const watchedId = slipsNight[0].seatId;
    const watchPersistedNight = Array.isArray(state.match.candlelitWatchIds) && state.match.candlelitWatchIds.includes(watchedId);

    // Exhaust normal daily micro-inspect quota first, then confirm watched seat gets 1 free inspect without failing!
    state.match.phase = "DAY_SPEECH";
    state.match.microInspectCountToday = getMicroInspectMaxToday();
    state.activeSpeakerId = watchedId;
    updateAllUI();
    const freeWatchNoticeShown = !el("turnWatchNotice").classList.contains("hidden") && el("turnWatchText").textContent.includes("燭下圈防");
    const freeWatchBtnEnabled = !el("btnMicroInspect").disabled && el("btnMicroInspect").textContent.includes("免費看心虛");
    const freeInspectRes = inspectSeatMicroExpression(watchedId);
    const freeInspectDidNotConsumeDailyQuota = Boolean(
      freeInspectRes &&
      state.match.microInspectCountToday === getMicroInspectMaxToday() &&
      state.match.candlelitFreeInspectUsedDay === state.match.day
    );

    // Verify Vote Notes Deck surfaces wolf, good, watch & locks vote target
    state.match.phase = "DAY_VOTE";
    state.selectedSeatId = null;
    updateAllUI();
    const voteDeckVisible = !el("voteNotesDeck").classList.contains("hidden");
    const voteWolfNoteChip = findTree(el("voteNotesDeck"), n => n.getAttribute && n.getAttribute("data-vote-note-seat") === String(others2[0].id))[0];
    if (voteWolfNoteChip) voteWolfNoteChip.click();
    const voteDeckAllTxt = allTreeText(el("voteNotesDeck"));
    const voteNoteLocksTargetOk = Boolean(
      state.selectedSeatId === others2[0].id &&
      !el("btnCastVote").disabled &&
      voteDeckAllTxt.includes("狼坑") &&
      voteDeckAllTxt.includes("好人")
    );

    // D. Composable Speech Builder: card click NEVER sends, 2 cards assemble instead of overwriting, re-click toggles OFF
    clearStepTimer();
    const pSelf = getPlayerSeat();
    pSelf.checkedHistory = [{ day: 1, targetId: others2[0].id, isWolf: true }];
    state.playerMarks = {};
    state.match.playerDraftPits = createEmptyPlayerDraftPits();
    state.match.phase = "DAY_PLAYER_TURN";
    el("quickFreeInput").value = "";
    el("playerSpeechInput").value = "";
    preparePlayerSpeechPanel();
    updateAllUI();

    const qCards = el("quickSpeechChips").querySelectorAll("button");
    if (qCards[0]) qCards[0].click();
    const textAfterCard1 = el("quickFreeInput").value;
    const stayOnTurnAfterCard1 = state.match.phase === "DAY_PLAYER_TURN" && qCards[0].classList.contains("is-draft-loaded") && textAfterCard1.length > 10;

    if (qCards[1]) qCards[1].click();
    const textAfterCard2 = el("quickFreeInput").value;
    const composedBothCardsOk = Boolean(
      state.match.phase === "DAY_PLAYER_TURN" &&
      textAfterCard2.includes(textAfterCard1.trim()) &&
      textAfterCard2.length > textAfterCard1.length + 10 &&
      state.match.playerDraftPits.composedModules.length === 2
    );

    if (qCards[0]) qCards[0].click();
    const textAfterUntoggle = el("quickFreeInput").value;
    const untoggledCard1Cleanly = Boolean(
      !qCards[0].classList.contains("is-draft-loaded") &&
      qCards[1].classList.contains("is-draft-loaded") &&
      !textAfterUntoggle.includes(textAfterCard1.trim()) &&
      textAfterUntoggle.length > 10 &&
      state.match.playerDraftPits.composedModules.length === 1
    );

    el("btnQuickFreeSend").click();
    const sentAfterReviewOk = state.match.phase === "DAY_SPEECH";

    // Also verify Last Words & Sheriff cards compose on card click without auto-sending
    state.match.phase = "LAST_WORDS_PLAYER";
    state.lastWordsCtx = { mode: "vote", queue: [pid2], idx: 0 };
    el("lastWordsFreeInput").value = "";
    preparePlayerLastWordsPanel("vote");
    const lwBtn0 = el("lastWordsChips").querySelectorAll("button")[0];
    if (lwBtn0) lwBtn0.click();
    const lwSafeComposeOk = state.match.phase === "LAST_WORDS_PLAYER" && el("lastWordsFreeInput").value.trim().length > 10;

    state.match.phase = "SHERIFF_ELECTION";
    state.match.sheriffElectionCtx = {
      stage: "speech",
      candidateIds: [pid2, others2[0].id],
      speechOrderIds: [pid2, others2[0].id],
      speechIndex: 0,
      activeReelSeatId: pid2,
      spokenSpeeches: [],
      withdrawnIds: [],
      playerRunning: true,
      playerBadgeFlowDraft: { firstTargetId: null, secondTargetId: null, explicit: false }
    };
    el("sheriffPlayerInput").value = "";
    updateAllUI();
    const shBtn0 = el("sheriffPlayerQuickChips").querySelectorAll("button")[0];
    if (shBtn0) shBtn0.click();
    const shSafeComposeOk = state.match.phase === "SHERIFF_ELECTION" && el("sheriffPlayerInput").value.trim().length > 10;

    clearStepTimer();
    resetMatchToLobby();
    return {
      synPillShown,
      foldedDeckOk,
      unfoldedDeckOk,
      autoCandlelitSkippedOk,
      fullQuoteKeptOk,
      openedCandle,
      watchPersistedNight,
      freeWatchNoticeShown,
      freeWatchBtnEnabled,
      freeInspectDidNotConsumeDailyQuota,
      voteDeckVisible,
      voteNoteLocksTargetOk,
      stayOnTurnAfterCard1,
      composedBothCardsOk,
      untoggledCard1Cleanly,
      sentAfterReviewOk,
      lwSafeComposeOk,
      shSafeComposeOk
    };
  })()`, ctx);

  const cssNoComments = cssCompSrc.replace(/\/\*[\s\S]*?\*\//g, "");
  if (!cornerConsolidatedHtml || !cssNoComments.includes("#cornerFourGDeck.corner-hand-fan.is-consolidated-into-deck") || cssNoComments.includes("!important")) {
    throw new Error("CSS check failed: missing consolidated deck rule or forbidden !important detected!");
  }
  for (const [k, v] of Object.entries(uxRes)) {
    if (!v) {
      throw new Error("v24.4 UX Consolidation regression failed for " + k + ": " + JSON.stringify(uxRes));
    }
  }
}

// ==================== v24.4.1 TRAFFIC ANALYTICS + SMART API ROUTING & 429 COOLDOWN ====================
{
  const swSrc2441 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const swSkipsVercelOk = swSrc2441.includes('"/_vercel/"') || swSrc2441.includes("'/_vercel/'");

  // 1. Vercel Web Analytics safe guard & event queue
  const analyticsRes = vm.runInContext(`(() => {
    const prevLoc = window.location;
    const prevVa = window.va;
    const prevVaq = window.vaq;
    let localSkipped = false;
    let ghPagesSkipped = false;
    let eventQueuedOk = false;
    try {
      delete window.va;
      delete window.vaq;
      window.location = { protocol: "http:", hostname: "localhost" };
      localSkipped = (initVercelAnalytics() === false) && (typeof window.va === "function");

      window.location = { protocol: "https:", hostname: "demo-user.github.io" };
      ghPagesSkipped = (initVercelAnalytics() === false);

      trackAnalyticsEvent("match_start", { seats: 8, difficulty: "normal", secretObj: { hidden: true } });
      const q = Array.isArray(window.vaq) ? window.vaq : [];
      const last = q[q.length - 1];
      eventQueuedOk = Boolean(
        last &&
        last[0] === "event" &&
        last[1] &&
        last[1].name === "match_start" &&
        last[1].data &&
        last[1].data.seats === 8 &&
        last[1].data.difficulty === "normal" &&
        !("secretObj" in last[1].data)
      );
    } finally {
      window.location = prevLoc;
      window.va = prevVa;
      window.vaq = prevVaq;
    }
    return { localSkipped, ghPagesSkipped, eventQueuedOk };
  })()`, ctx);

  // 2. Smart Lite vs Hydrogen Speech Routing (Blind-View Strict Zero Violations)
  const smartTierRes = vm.runInContext(`(() => {
    clearStepTimer();
    el("selectModeCount").value = "8";
    el("selectAiDifficulty").value = "normal";
    state.aiDifficulty = "normal";
    startNewGame();
    indieFlow.hideRoleDealRitual({ silent: true });

    const villager = state.match.seats.find(s => !s.isPlayer && s.role === "villager");
    const wolf = state.match.seats.find(s => !s.isPlayer && s.role === "wolf");
    const other = state.match.seats.find(s => s.id !== villager.id && s.id !== wolf.id);

    antiCheatMonitor.resetMatch();
    const prevStrict = antiCheatMonitor.strictThrow;
    antiCheatMonitor.strictThrow = true;
    let easyVillagerLite = false;
    let normalVillagerBriefLite = false;
    let normalVillagerAccuseFull = false;
    let normalWolfBriefFull = false;
    let seerClaimFull = false;
    let pkTurnFull = false;
    let endgameFull = false;
    let tenSeatVillagerStandardLite = false;
    let violations = -1;
    try {
      const vSnap = createBlindMatchSnapshot(villager, { module: "gemini_speech", phase: "DAY_SPEECH" });
      const wSnap = createBlindMatchSnapshot(wolf, { module: "gemini_speech", phase: "DAY_SPEECH" });

      normalVillagerBriefLite = shouldUseLiteSpeechTier(villager, { lengthTier: "brief" }, vSnap) === true;
      normalVillagerAccuseFull = shouldUseLiteSpeechTier(villager, { lengthTier: "standard", accuseId: other.id }, vSnap) === false;
      normalWolfBriefFull = shouldUseLiteSpeechTier(wolf, { lengthTier: "brief" }, wSnap) === false;

      const easySnap = Object.assign({}, vSnap, { aiDifficulty: "easy" });
      easyVillagerLite = shouldUseLiteSpeechTier(villager, { lengthTier: "standard", accuseId: other.id }, easySnap) === true;
      seerClaimFull = shouldUseLiteSpeechTier(villager, { lengthTier: "brief", claimSeer: true }, easySnap) === false;

      const pkSnap = Object.assign({}, easySnap, { pkActive: true });
      pkTurnFull = shouldUseLiteSpeechTier(villager, { lengthTier: "brief" }, pkSnap) === false;

      const endSnap = Object.assign({}, easySnap, { seats: vSnap.seats.slice(0, 5) });
      endgameFull = shouldUseLiteSpeechTier(villager, { lengthTier: "brief" }, endSnap) === false;

      const tenSnap = Object.assign({}, vSnap, { totalSeats: 10 });
      tenSeatVillagerStandardLite = shouldUseLiteSpeechTier(villager, { lengthTier: "standard" }, tenSnap) === true;

      violations = antiCheatMonitor.stats.violationsBlocked;
    } finally {
      antiCheatMonitor.strictThrow = prevStrict;
      clearStepTimer();
      resetMatchToLobby();
    }
    return {
      easyVillagerLite,
      normalVillagerBriefLite,
      normalVillagerAccuseFull,
      normalWolfBriefFull,
      seerClaimFull,
      pkTurnFull,
      endgameFull,
      tenSeatVillagerStandardLite,
      zeroAntiCheatViolations: violations === 0
    };
  })()`, ctx);

  // 3. api/gemini.js expanded fallback order + 429 cooldown
  const apiGem2441 = (await import("../api/gemini.js")).default;
  const gemOrderOk = Array.isArray(apiGem2441._PUBLIC_FALLBACK_ORDER) &&
    apiGem2441._PUBLIC_FALLBACK_ORDER.includes("gemini-3.8-flash") &&
    apiGem2441._PUBLIC_FALLBACK_ORDER.includes("gemini-2.5-flash-lite");

  let gem429CooldownOk = false;
  const origFetchGem = globalThis.fetch;
  const prevKeyGem = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "AIzaTestDummyKeyForSmokeCheckOnly00";
  apiGem2441._resetRateLimit();
  try {
    globalThis.fetch = async function (url) {
      if (String(url).includes("gemini-3.5-flash-lite")) {
        return { ok: false, status: 429, json: async () => ({ error: { message: "quota exceeded" } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"text":"這輪先聽大家說完再穩穩投票。"}' }] } }]
        })
      };
    };
    const gHeaders = {};
    const gRes = {
      statusCode: 0,
      body: "",
      setHeader(k, v) { gHeaders[k] = v; },
      end(b) { gRes.body = String(b || ""); }
    };
    const gReq = {
      method: "POST",
      headers: { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app", "content-type": "application/json" },
      socket: { remoteAddress: "198.51.100.88" },
      body: { model: "gemini-3.5-flash-lite", prompt: "請簡短表態", jsonMode: true }
    };
    await apiGem2441(gReq, gRes);
    const parsedG = gRes.body ? JSON.parse(gRes.body) : {};
    gem429CooldownOk = Boolean(
      gRes.statusCode === 200 &&
      parsedG.ok === true &&
      parsedG.model === "gemini-2.5-flash-lite" &&
      parsedG.fallbackFrom === "gemini-3.5-flash-lite" &&
      apiGem2441._isModelCoolingDown("gemini-3.5-flash-lite", Date.now())
    );
  } finally {
    globalThis.fetch = origFetchGem;
    if (prevKeyGem === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKeyGem;
    apiGem2441._resetRateLimit();
  }

  // 4. api/tts.js 3-tier chain (3.8-flash-lite-tts -> 3.8-flash-tts -> 2.5-flash-preview-tts) + 429 cooldown
  const apiTts2441 = (await import("../api/tts.js")).default;
  const tts4SlotOrderOk = Array.isArray(apiTts2441._TTS_FALLBACK_ORDER) &&
    apiTts2441._TTS_FALLBACK_ORDER[0] === "gemini-3.8-flash-lite-tts" &&
    apiTts2441._TTS_FALLBACK_ORDER[1] === "gemini-3.8-flash-tts" &&
    apiTts2441._TTS_FALLBACK_ORDER[2] === "gemini-2.5-flash-preview-tts" &&
    apiTts2441._TTS_FALLBACK_ORDER.length === 3;

  let tts429CooldownOk = false;
  const origFetchTts = globalThis.fetch;
  const prevKeyTts = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "AIzaTestDummyKeyForSmokeCheckOnly00";
  apiTts2441._resetRateLimit();
  try {
    const fakeWavB64 = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(1300, 2)]).toString("base64");
    globalThis.fetch = async function (url) {
      if (String(url).includes("gemini-3.8-flash-lite-tts")) {
        return { ok: false, status: 429, json: async () => ({ error: "rate limit" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/wav", data: fakeWavB64 } }] } }]
        })
      };
    };
    const tHeaders = {};
    const tRes = {
      statusCode: 0,
      body: null,
      setHeader(k, v) { tHeaders[k] = v; },
      end(b) { tRes.body = b; }
    };
    const tReq = {
      method: "POST",
      headers: { host: "sanhao.vercel.app", origin: "https://sanhao.vercel.app", "content-type": "application/json" },
      socket: { remoteAddress: "198.51.100.89" },
      body: { voice: "Kore", style: "平穩", text: "這輪我們先聽完整局再投票。" }
    };
    await apiTts2441(tReq, tRes);
    tts429CooldownOk = Boolean(
      tRes.statusCode === 200 &&
      tHeaders["X-TTS-Model"] === "gemini-3.8-flash-tts" &&
      apiTts2441._isModelCoolingDown("gemini-3.8-flash-lite-tts", Date.now())
    );
  } finally {
    globalThis.fetch = origFetchTts;
    if (prevKeyTts === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKeyTts;
    apiTts2441._resetRateLimit();
  }

  const all2441 = Object.assign(
    { swSkipsVercelOk, gemOrderOk, gem429CooldownOk, tts4SlotOrderOk, tts429CooldownOk },
    analyticsRes,
    smartTierRes
  );
  for (const [k, v] of Object.entries(all2441)) {
    if (!v) {
      throw new Error("v24.4.1 Analytics & Smart API Routing regression failed for " + k + ": " + JSON.stringify(all2441));
    }
  }
}

// ==================== v25.0 UNIFIED LACQUER-VESSEL & FRAMELESS INK-WASH UI ====================
{
  const css25 = fs.readFileSync(path.join(ROOT, "css", "components.css"), "utf8");
  const html25 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const v25BlockStart = css25.indexOf("v25.0 UNIFIED LACQUER-VESSEL");
  const v25Css = v25BlockStart >= 0 ? css25.slice(v25BlockStart) : "";
  const v25Checks = {
    hasChamferTokens: v25Css.includes("--v25-cut-sm:") && v25Css.includes("--v25-cut-md:") && v25Css.includes("--v25-cut-lg:"),
    hasVesselEase: v25Css.includes("cubic-bezier(0.22, 1, 0.36, 1)"),
    hasFramelessScrims: v25Css.includes("--v25-scrim-bottom:") && v25Css.includes("--v25-scrim-top:") && v25Css.includes("--v25-scrim-left:"),
    hasZeroCapsuleOverride: v25Css.includes("body.craft-ui #inGameTopHud > div:last-child") && v25Css.includes("border-radius: 0;"),
    hasGameOverMonumental: v25Css.includes("body.craft-ui .go-metric-val") && v25Css.includes("body.craft-ui .go-coach-item"),
    hasLightThemeParity: v25Css.includes("body.craft-ui.theme-day .go-metric-val") && v25Css.includes("body.craft-ui.theme-twilight.screen-title .title-menu-item"),
    zeroImportantOrBlur: !v25Css.includes("!important") && !v25Css.includes("backdrop-filter: blur("),
    conciseHtmlButtons: html25.includes(">掀席自爆<") && html25.includes(">靜候天明<") && html25.includes(">順時針<") && html25.includes(">送出陳詞<") && html25.includes(">確認開局<")
  };
  for (const [k, v] of Object.entries(v25Checks)) {
    if (!v) {
      throw new Error("v25.0 Lacquer-Vessel UI regression failed for " + k + ": " + JSON.stringify(v25Checks));
    }
  }

  // v25.2 Structural Stage-Opening (>=70% Open 3D), Contrast & CSS Rendering Performance Checks
  const theme25 = fs.readFileSync(path.join(ROOT, "css", "theme.css"), "utf8");
  const v252Start = css25.indexOf("v25.2 STRUCTURAL STAGE-OPENING");
  const v252Css = v252Start >= 0 ? css25.slice(v252Start) : "";
  const v252Checks = {
    hasV252Block: v252Start >= 0,
    noFeTurbulenceNoise: !theme25.includes("feTurbulence"),
    curtainRuleMin13px: !theme25.includes("font-size: 11px;"),
    noPingPulseInHtml: !html25.includes("animate-ping") && !html25.includes("animate-pulse"),
    noRepeatingGradInV25: !v25Css.includes("repeating-linear-gradient"),
    noClipPathOnBigVessels: v252Css.includes("body.craft-ui .craft-modal-box") && v252Css.includes("clip-path: none;"),
    hasBottomFlowSeatStrip: v252Css.includes("#seatButtonStrip:not(.hidden)") && v252Css.includes("position: relative;") && !/body\.craft-ui[^}]*#seatButtonStrip:not\(\.hidden\)\s*\{[^}]*position:\s*fixed/i.test(css25),
    hasStickyGameOverCtas: html25.includes("gameover-sticky-actions") && v252Css.includes("position: sticky;"),
    hasGameOverCutInSuppress: v252Css.includes("body.craft-ui.screen-gameover #dramaticCutIn"),
    hasRoleDealBodyLock: fs.readFileSync(path.join(ROOT, "js", "ui", "flow.js"), "utf8").includes("role-deal-open"),
    hasSpeechSlipWrap: v252Css.includes("white-space: normal;") && v252Css.includes("text-overflow: clip;"),
    hasNightHudHighContrast: v252Css.includes("body.craft-ui.theme-night #inGameTopHud #bannerHeadline"),
    hasTitleDarkVignette: v252Css.includes("body.craft-ui.theme-twilight.screen-title #focalCenterCard") && v252Css.includes("max-width: 368px;"),
    zeroImportantOrBlurV252: !v252Css.includes("!important") && !v252Css.includes("backdrop-filter: blur(")
  };
  for (const [k, v] of Object.entries(v252Checks)) {
    if (!v) {
      throw new Error("v25.2 Stage-Opening & CSS Perf regression failed for " + k + ": " + JSON.stringify(v252Checks));
    }
  }

  // v25.3 Round-2 Live-Audit UI/CSS Fixes + Vote-Flight Prefetch / Theatrical Reveal / AI Spotlight Last Words
  const v253Start = css25.indexOf("v25.3 ROUND-2 LIVE-AUDIT FIXES");
  const v253Css = v253Start >= 0 ? css25.slice(v253Start) : "";
  const v253CssChecks = {
    hasV253Block: v253Start >= 0,
    titleControlDeckNoFog: v253Css.includes("body.craft-ui.theme-twilight.screen-title #controlDeck") && v253Css.includes("background: none;"),
    titleTopBtnsTransparent: v253Css.includes("body.craft-ui.theme-twilight.screen-title .title-top-actions .title-scene-btn") && v253Css.includes("background: transparent;"),
    titleCreedHighContrast: v253Css.includes(".tea-creed-good") && v253Css.includes("#a9e6cb") && v253Css.includes("#f4d699"),
    topLeftGuideNoClash: v253Css.includes("left: 16px;") && v253Css.includes("transform: none;") && v253Css.includes(".judge-guide-step:not(.is-active)"),
    seatRailNoHudOverlap: v253Css.includes("#seatButtonStrip:not(.hidden)") && v253Css.includes("min-height: 26px;"),
    voteFlightTopZNoAnim: v253Css.includes("body.craft-ui #voteFlightBanner") && v253Css.includes("z-index: 36;"),
    directorChoiceRightDocked: v253Css.includes("#directorEventChoiceBar:not(.hidden)") && v253Css.includes("bottom: 44px;"),
    spotlightTextUnclipped: v253Css.includes("max-height: 112px;") && v253Css.includes("max-height: 96px;"),
    solemnLastWordsSpotlightCss: v253Css.includes("#spotlightStageBox.is-last-words-spotlight"),
    fullSpecInfiniteAnimKill: v253Css.includes("#seatButtonStrip.is-guide-beckon .seat-pill-btn:not(.is-dead):not(.is-disabled-target):not(.seat-is-selected)") && v253Css.includes("#judgeShowcaseGuideBanner .judge-guide-step.is-active::after"),
    zeroImportantOrBlurV253: !v253Css.includes("!important") && !v253Css.includes("backdrop-filter: blur(") && !v253Css.includes("repeating-linear-gradient")
  };
  for (const [k, v] of Object.entries(v253CssChecks)) {
    if (!v) {
      throw new Error("v25.3 CSS Live-Audit regression failed for " + k + ": " + JSON.stringify(v253CssChecks));
    }
  }

  const v253Runtime = vm.runInContext(`(() => {
    clearStepTimer();
    const pfCalls = [];
    const origPrefetch = prefetchAiLastWords;
    prefetchAiLastWords = function (ids, mode) {
      pfCalls.push({ ids: (ids || []).slice(), mode: mode });
      return origPrefetch.apply(this, arguments);
    };
    const origIsFf = isSpectatorFastForward;
    let fakeFf = false;
    isSpectatorFastForward = function () { return fakeFf; };

    let aiVotePrefetchOk = false;
    let stretchedFlightTimingsOk = false;
    let aiVoteEntersSpotlightOk = false;
    let spotlightSolemnClassOk = false;
    let aiVoteThenVoteResultOk = false;
    let gameOverVoteSkipsPrefetchAndLwOk = false;
    let ffVoteSkipsSpotlightOk = false;
    let dawnPrefetchOk = false;
    let dawnStepTimerOk = false;
    let dawnPhaseOk = false;
    let dawnInFlightOk = false;
    let dawnSpotlightClassOk = false;

    try {
      // 1. Normal AI vote-out (!ff, non-game-ending): prefetches before flight, stretched 360ms/1500ms, enters LAST_WORDS_SPEECH -> DAY_VOTE_RESULT
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      state.autoPlay = false;
      startNewGame();
      indieFlow.hideRoleDealRitual({ silent: true });
      state.match.day = 1;
      state.match.phase = "DAY_VOTE";
      const targetVill = state.match.seats.find(s => s.alive && s.id !== getPlayerId() && s.role === "villager");
      state.match.seats.forEach(s => {
        s.trustShield = false;
        if (s.suspicionMap) {
          Object.keys(s.suspicionMap).forEach(k => { s.suspicionMap[k] = 5; });
          s.suspicionMap[targetVill.id] = 99;
        }
      });
      pfCalls.length = 0;
      finalizeVoteRound(targetVill.id);
      aiVotePrefetchOk = pfCalls.some(c => c.mode === "vote_out" && c.ids.includes(targetVill.id));
      stretchedFlightTimingsOk = Boolean(state.voteFlight && state.voteFlight.stepMs === 360 && state.voteFlight.verdictHoldMs === 1500);
      if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
      aiVoteEntersSpotlightOk = Boolean(
        state.match.phase === "LAST_WORDS_SPEECH" &&
        state.activeSpeakerId === targetVill.id &&
        state.lastWordsCtx &&
        state.lastWordsCtx.mode === "vote_out"
      );
      spotlightSolemnClassOk = el("spotlightStageBox").classList.contains("is-last-words-spotlight");
      // Advance out of LAST_WORDS_SPEECH -> DAY_VOTE_RESULT with lastWord populated
      advanceLastWordsQueue();
      aiVoteThenVoteResultOk = Boolean(
        state.match.phase === "DAY_VOTE_RESULT" &&
        state.voteResultPayload &&
        state.voteResultPayload.outId === targetVill.id &&
        String(state.voteResultPayload.lastWord || "").length > 4 &&
        !el("spotlightStageBox").classList.contains("is-last-words-spotlight")
      );
      clearStepTimer();

      // 2. Game-ending vote-out (last wolf voted out): MUST NOT prefetch & MUST go straight to GAME_OVER
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual({ silent: true });
      const wolvesEnd = state.match.seats.filter(s => s.team === "wolf");
      wolvesEnd.slice(1).forEach(w => { w.alive = false; });
      const lastWolf = wolvesEnd[0];
      lastWolf.isWolfKing = false;
      state.match.phase = "DAY_VOTE";
      state.match.seats.forEach(s => {
        s.trustShield = false;
        if (s.suspicionMap) {
          Object.keys(s.suspicionMap).forEach(k => { s.suspicionMap[k] = 5; });
          s.suspicionMap[lastWolf.id] = 99;
        }
      });
      pfCalls.length = 0;
      finalizeVoteRound(lastWolf.id);
      const prefetchedOnGameEnd = pfCalls.length > 0;
      if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
      gameOverVoteSkipsPrefetchAndLwOk = Boolean(!prefetchedOnGameEnd && state.match.phase === "GAME_OVER");
      clearStepTimer();

      // 3. Spectator fast-forward (ff): fast 45ms vote flight, zero prefetch, direct DAY_VOTE_RESULT
      fakeFf = true;
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual({ silent: true });
      const targetFf = state.match.seats.find(s => s.alive && s.id !== getPlayerId() && s.role === "villager");
      state.match.phase = "DAY_VOTE";
      state.match.seats.forEach(s => {
        s.trustShield = false;
        if (s.suspicionMap) {
          Object.keys(s.suspicionMap).forEach(k => { s.suspicionMap[k] = 5; });
          s.suspicionMap[targetFf.id] = 99;
        }
      });
      pfCalls.length = 0;
      finalizeVoteRound(targetFf.id);
      const ffStepFast = Boolean(state.voteFlight && state.voteFlight.stepMs === 45 && pfCalls.length === 0);
      if (state.voteFlight && state.voteFlight.finish) state.voteFlight.finish();
      ffVoteSkipsSpotlightOk = Boolean(ffStepFast && state.match.phase === "DAY_VOTE_RESULT");
      clearStepTimer();

      // 4. Day-1 dawn AI casualty (!ff): prefetches first_night & arms 900ms stepTimer lead-in before LAST_WORDS_SPEECH
      fakeFf = false;
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual({ silent: true });
      const n1Ai = state.match.seats.find(s => s.alive && s.id !== getPlayerId() && s.role === "villager");
      state.match.day = 1;
      state.match.nightState = { wolfTarget: n1Ai.id, guardTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
      pfCalls.length = 0;
      resolveDawn();
      dawnPrefetchOk = pfCalls.some(c => c.mode === "first_night" && c.ids.includes(n1Ai.id));
      dawnStepTimerOk = state.stepTimer !== null;
      dawnPhaseOk = state.match.phase === "LAST_WORDS_SPEECH";
      dawnInFlightOk = state.speakingInFlight === true;
      dawnSpotlightClassOk = el("spotlightStageBox").classList.contains("is-last-words-spotlight");
    } finally {
      prefetchAiLastWords = origPrefetch;
      isSpectatorFastForward = origIsFf;
      state.speakingInFlight = false;
      clearStepTimer();
      resetMatchToLobby();
    }

    return {
      aiVotePrefetchOk,
      stretchedFlightTimingsOk,
      aiVoteEntersSpotlightOk,
      spotlightSolemnClassOk,
      aiVoteThenVoteResultOk,
      gameOverVoteSkipsPrefetchAndLwOk,
      ffVoteSkipsSpotlightOk,
      dawnPrefetchOk,
      dawnStepTimerOk,
      dawnPhaseOk,
      dawnInFlightOk,
      dawnSpotlightClassOk
    };
  })()`, ctx);
  for (const [k, v] of Object.entries(v253Runtime)) {
    if (!v) {
      throw new Error("v25.3 Vote-Flight & AI Last-Words runtime regression failed for " + k + ": " + JSON.stringify(v253Runtime));
    }
  }
}

// ==================== v25.5.2 NIGHT/DAWN CURTAIN SYNC, ROLE-DEAL GATE & MOBILE LATENCY FIXES ====================
{
  const votingSrc2552 = fs.readFileSync(path.join(ROOT, "js/game/voting.js"), "utf8");
  const voiceSrc2552 = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  const ttsSrc2552 = fs.readFileSync(path.join(ROOT, "api/tts.js"), "utf8");
  const apiGem2552 = (await import("../api/gemini.js")).default;
  const apiTts2552 = (await import("../api/tts.js")).default;

  // 1. Gemini 2.5 Flash & Flash-Lite thinkingBudget === 0
  const gem25FlashCfg = apiGem2552._buildGenerationConfig("gemini-2.5-flash", true, 0.65);
  const gem25LiteCfg = apiGem2552._buildGenerationConfig("gemini-2.5-flash-lite", false, 0.72);
  const apiThinkingZeroOk = Boolean(
    gem25FlashCfg && gem25FlashCfg.thinkingConfig && gem25FlashCfg.thinkingConfig.thinkingBudget === 0 &&
    gem25LiteCfg && gem25LiteCfg.thinkingConfig && gem25LiteCfg.thinkingConfig.thinkingBudget === 0
  );

  // 2. Official 3.8 TTS chain active in api/tts.js & js/audio/voice.js (3 tiers)
  const no38TtsModelsOk = Boolean(
    ttsSrc2552.includes("gemini-3.8-flash-lite-tts") &&
    ttsSrc2552.includes("gemini-3.8-flash-tts") &&
    voiceSrc2552.includes("gemini-3.8-flash-lite-tts") &&
    voiceSrc2552.includes("gemini-3.8-flash-tts") &&
    Array.isArray(apiTts2552._TTS_FALLBACK_ORDER) &&
    apiTts2552._TTS_FALLBACK_ORDER.length === 3
  );

  // 3. Post-vote -> night timeout reduced to 1800ms (zero 4000/4200/5000ms delays left on beginNightPhase)
  const shortVoteNightOk = Boolean(
    !/setTimeout\([^;]{0,180}beginNightPhase[^;]{0,80}(?:4000|4200|5000)\)/.test(votingSrc2552) &&
    (votingSrc2552.match(/ff(?:Tie|Eld|AfterLw|Out)\s*\?\s*6(?:00|50)\s*:\s*1800/g) || []).length === 4
  );

  // 4. Frontend direct callGeminiModelOnce upgrades 2.5-flash -> 3.5-lite minimal & keeps thinkingBudget: 0 on 2.5-flash-lite
  const prevFetch2552 = globalThis.fetch;
  const gemDirectPayloads = [];
  ctx.fetch = async function (_url, init) {
    gemDirectPayloads.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "測試回應。" }] } }] })
    };
  };
  await vm.runInContext(`(async () => {
    await callGeminiModelOnce("gemini-2.5-flash", "你好", 5000, { apiKey: "dummy-key", jsonMode: true });
    await callGeminiModelOnce("gemini-2.5-flash-lite", "你好", 5000, { apiKey: "dummy-key", jsonMode: false });
  })()`, ctx);
  const frontendThinkingZeroOk = Boolean(
    gemDirectPayloads.length === 2 &&
    gemDirectPayloads[0] && gemDirectPayloads[0].generationConfig &&
    gemDirectPayloads[0].generationConfig.thinkingConfig && gemDirectPayloads[0].generationConfig.thinkingConfig.thinkingLevel === "minimal" &&
    !("temperature" in gemDirectPayloads[0].generationConfig) &&
    gemDirectPayloads[1] && gemDirectPayloads[1].generationConfig &&
    gemDirectPayloads[1].generationConfig.thinkingConfig && gemDirectPayloads[1].generationConfig.thinkingConfig.thinkingBudget === 0
  );

  // 5. Mobile Track A TTS timeout (~4000ms mobile / ~5500ms desktop) with at most 1 retry
  let ttsAttemptUrls = [];
  ctx.fetch = async function (url) {
    ttsAttemptUrls.push(String(url));
    return { ok: false, status: 502, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const mobileTtsBudgetOk = await vm.runInContext(`(async () => {
    const prevMobileFlag = state._forceMobileTtsBudget;
    const prevStatic = voice.isStaticCloudHost;
    const prevAvail = voice.cloudGeminiTtsAvailable;
    const prevOptOut = state.serverGeminiOptOut;
    const prevCooldown = voice.cloudGeminiTtsCooldownUntil;
    const prevKey = state.geminiApiKey;
    const prevSetTimeout = setTimeout;
    const prevCtx = sound.ctx;
    try {
      state.geminiApiKey = "";
      state.serverGeminiOptOut = false;
      voice.cloudGeminiTtsCooldownUntil = 0;
      voice.cloudGeminiTtsAvailable = true;
      voice.isStaticCloudHost = () => true;
      sound.ctx = { sampleRate: 24000, currentTime: 0 };
      setTimeout = function (fn, ms) {
        if (ms <= 200) { fn(); }
        return 1;
      };
      state._forceMobileTtsBudget = true;
      await voice._fetchGeminiStudioAudio(PERSONA_VOICE_PROFILES["暖暖"], "暖暖", "測試短句。", "normal");
      const mobileCapsOk = voice.isMobileTtsNetworkEnv() === true;
      state._forceMobileTtsBudget = false;
      const desktopCapsOk = voice.isMobileTtsNetworkEnv() === false;
      return mobileCapsOk && desktopCapsOk;
    } finally {
      state._forceMobileTtsBudget = prevMobileFlag;
      voice.isStaticCloudHost = prevStatic;
      voice.cloudGeminiTtsAvailable = prevAvail;
      state.serverGeminiOptOut = prevOptOut;
      voice.cloudGeminiTtsCooldownUntil = prevCooldown;
      state.geminiApiKey = prevKey;
      setTimeout = prevSetTimeout;
      sound.ctx = prevCtx;
    }
  })()`, ctx);
  ctx.fetch = prevFetch2552;
  const ttsMaxOneRetryOk = ttsAttemptUrls.length === 1 && ttsAttemptUrls.every(u => u === "/api/tts");

  // 6. Role-deal card gate, async curtain occlusion peak, no duplicate Day-1 Sheriff Dawn curtain, staggered prefetch & post-player instant prefetch
  const v2552Runtime = await vm.runInContext(`(async () => {
    const origSetTimeout = setTimeout;
    const origClearTimeout = clearTimeout;
    const queue = [];
    let tidSeq = 100;
    const flushTimers = function (minDelayFilter) {
      let ran = 0;
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (!item.active) continue;
        if (typeof minDelayFilter === "number" && item.ms !== minDelayFilter) continue;
        item.active = false;
        ran += 1;
        item.fn();
      }
      return ran;
    };
    setTimeout = function (fn, ms) {
      const id = ++tidSeq;
      queue.push({ id: id, fn: fn, ms: Number(ms) || 0, active: true });
      return id;
    };
    clearTimeout = function (id) {
      queue.forEach(item => { if (item.id === id) item.active = false; });
    };

    const origPlayCurtain = playSkyCurtain;
    const curtainLog = [];
    playSkyCurtain = function (mode, icon, title, sub, opts) {
      curtainLog.push({ mode: mode, title: title, sub: sub });
      return origPlayCurtain(mode, icon, title, sub, opts);
    };

    let roleDealGatesNight1Ok = false;
    let roleDealEpochGuardOk = false;
    let curtainPeakPromiseAndCancelOk = false;
    let sheriffDawnNoDuplicateCurtainOk = false;
    let staggeredPrefetchOk = false;
    let postPlayerPrefetchInstantOk = false;

    try {
      state._forceRoleDealGate = true;
      state._forceAsyncSkyCurtain = true;
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "seer";
      el("chkSheriffMode").checked = true;

      // A. Role deal card must gate Night 1 until confirmed
      startNewGame();
      const stayedInLobbyOnDeal = Boolean(
        state.match.day === 0 &&
        state.match.phase === "LOBBY" &&
        !el("roleDealOverlay").classList.contains("hidden") &&
        curtainLog.length === 0
      );
      el("btnRoleDealConfirm").click();
      const enteredNight1AfterClose = Boolean(state.match.day === 1 && curtainLog.length === 1 && curtainLog[0].mode === "night");
      // Before curtain peak fires, Night action panel / NIGHT_SEER is not open yet; after peak fires, Night roles start
      const waitingCurtainPeakBeforeNight = !isNightPhase(state.match.phase) && el("panelTargetAction").classList.contains("hidden");
      flushTimers();
      roleDealGatesNight1Ok = Boolean(stayedInLobbyOnDeal && enteredNight1AfterClose && waitingCurtainPeakBeforeNight && isNightPhase(state.match.phase));

      // B. Stale matchEpoch & clearTransientMatchTimers block stale role-deal & curtain callbacks
      startNewGame();
      orchestrator.beginNewEpoch("stale_deal_check");
      el("btnRoleDealConfirm").click();
      const blockedByEpoch = state.match.day === 0 && state.match.phase === "LOBBY";
      let stalePeakFired = false;
      const cancelPromise = origPlayCurtain("day", "", "測試天亮", "", function () { stalePeakFired = true; });
      clearTransientMatchTimers();
      flushTimers();
      const cancelResolvedFalse = (await cancelPromise) === false && !stalePeakFired;
      roleDealEpochGuardOk = blockedByEpoch && cancelResolvedFalse;

      // C. playSkyCurtain Promise resolves true at occlusion peak & Day-1 Sheriff -> Dawn plays ONLY 1 Dawn curtain
      startNewGame();
      indieFlow.hideRoleDealRitual();
      flushTimers();
      let promisePeakDone = false;
      const okCurtainP = origPlayCurtain("night", "", "峰值測試", "", function () { promisePeakDone = true; });
      flushTimers();
      curtainPeakPromiseAndCancelOk = Boolean((await okCurtainP) === true && promisePeakDone);

      curtainLog.length = 0;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      flushTimers(); // enters Night 1 (1 night curtain)
      getPlayerSeat().alive = false; // auto-completes Day-1 Sheriff election and transitions cleanly into resolveDawn announcement
      state.match.nightState = { wolfTarget: 2, guardTarget: null, seerTarget: null, witchSaved: false, witchPoisonTarget: null };
      curtainLog.length = 0;
      resolveDawn();
      const waitedBeforeSheriff = Boolean(curtainLog.length === 1 && curtainLog[0].mode === "day" && state.match.sheriffElectionPending === true);
      flushTimers(); // peaks Dawn 1 -> runs startSheriffElection -> auto-finishes -> calls resolveDawn() post-Sheriff directly!
      const day1DawnCurtains = curtainLog.filter(c => c.mode === "day");
      sheriffDawnNoDuplicateCurtainOk = Boolean(waitedBeforeSheriff && day1DawnCurtains.length === 1);

      // D. Staggered next-AI prefetch & instant post-player AI prefetch
      startNewGame();
      indieFlow.hideRoleDealRitual();
      flushTimers();
      state.match.phase = "DAY_SPEECH";
      state.match.day = 1;
      state.match.speechQueue = [3, 4];
      state.activeSpeakerId = 2;
      state.speakingInFlight = false;
      state.match._prefetchedSpeech = null;
      const sp2 = getSeat(2);
      const origSpeakChar = voice.speakCharacter;
      const origCanSpeak = voice.canSpeak;
      const origPfAi = prefetchNextAiSpeech;
      const origIsFree = isSpectatorFastForward;
      let capturedSpeakOpts = null;
      const pfTriggers = [];
      try {
        isSpectatorFastForward = () => false;
        voice.canSpeak = () => true;
        voice.speakCharacter = function (_sp, _txt, _mood, _onDone, opts) {
          capturedSpeakOpts = opts || null;
        };
        prefetchNextAiSpeech = function (opts) {
          pfTriggers.push(opts || {});
          return origPfAi(opts);
        };
        await executeAiTurnSpeech(sp2);
        const notFiredSameMs = pfTriggers.length === 0;
        if (capturedSpeakOpts && typeof capturedSpeakOpts.onAudioStart === "function") {
          capturedSpeakOpts.onAudioStart();
        }
        const firedOnAudioStartOnce = pfTriggers.length === 1 && state._deferredPrefetchTimer === null;
        pfTriggers.length = 0;
        const cbHook = scheduleStaggeredNextSpeechPrefetch(orchestrator.matchEpoch, state._speechTurnSeq);
        const returnedHookOk = Boolean(typeof cbHook === "function" && state._deferredPrefetchTimer === null);
        clearTransientMatchTimers();
        const clearedCleanly = pfTriggers.length === 0 && state._deferredPrefetchTimer === null;
        staggeredPrefetchOk = Boolean(notFiredSameMs && firedOnAudioStartOnce && returnedHookOk && clearedCleanly);

        // E. submitPlayerSpeech immediately bumps rev, purges stale cache & triggers highPriority next-AI prefetch
        pfTriggers.length = 0;
        state.match.phase = "DAY_PLAYER_TURN";
        state.activeSpeakerId = getPlayerId();
        state.match.speechQueue = [5, 6];
        const staleObj = { key: "stale_before_player_send", seatId: 5, epoch: orchestrator.matchEpoch, resolvedMeta: { text: "old" } };
        state.match._prefetchedSpeech = staleObj;
        const revPreSubmit = state.match.tableStateRev || 0;
        el("quickFreeInput").value = "我懷疑 4號 剛剛說話有點急，大家多留意 4號。";
        submitPlayerSpeech();
        postPlayerPrefetchInstantOk = Boolean(
          (state.match.tableStateRev || 0) > revPreSubmit &&
          state.match._prefetchedSpeech !== staleObj &&
          pfTriggers.some(o => o && o.highPriority === true)
        );
      } finally {
        voice.speakCharacter = origSpeakChar;
        voice.canSpeak = origCanSpeak;
        prefetchNextAiSpeech = origPfAi;
        isSpectatorFastForward = origIsFree;
      }
    } finally {
      state._forceRoleDealGate = false;
      state._forceAsyncSkyCurtain = false;
      playSkyCurtain = origPlayCurtain;
      setTimeout = origSetTimeout;
      clearTimeout = origClearTimeout;
      clearStepTimer();
      clearTransientMatchTimers();
      resetMatchToLobby();
    }

    return {
      roleDealGatesNight1Ok,
      roleDealEpochGuardOk,
      curtainPeakPromiseAndCancelOk,
      sheriffDawnNoDuplicateCurtainOk,
      staggeredPrefetchOk,
      postPlayerPrefetchInstantOk
    };
  })()`, ctx);

  const docScriptV2552 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const scriptHeaderSyncOk = docScriptV2552.split(/\r?\n/)[0].includes("v25.9.0") && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(docScriptV2552);

  const v2552AudioRes = await vm.runInContext(`(async () => {
    const classicMovementsRestoredOk = Boolean(
      MOVEMENTS.twilight && MOVEMENTS.twilight.bpm === 76 && MOVEMENTS.twilight.arps[0][0] === 62 && MOVEMENTS.twilight.bells[0][0] === 81 && MOVEMENTS.twilight.chordsLabel === "Dadd9 — Bm11 — Gmaj9 — Asus4" &&
      MOVEMENTS.night && MOVEMENTS.night.bpm === 62 && MOVEMENTS.night.pads[0][0] === 35 && MOVEMENTS.night.bells[3][6] === 70 &&
      MOVEMENTS.day && MOVEMENTS.day.bpm === 96 && MOVEMENTS.day.arps[0][0] === 55 &&
      MOVEMENTS.sheriff && MOVEMENTS.sheriff.bpm === 104 && MOVEMENTS.sheriff.drums[0] === 1 && MOVEMENTS.sheriff.drums[2] === 3 &&
      MOVEMENTS.vote && MOVEMENTS.vote.bpm === 116 && MOVEMENTS.vote.bells[3][3] === 70 &&
      MOVEMENTS.matchpoint && MOVEMENTS.matchpoint.bpm === 138 && MOVEMENTS.matchpoint.drums[0] === 1 && MOVEMENTS.matchpoint.drums[1] === 3 &&
      MOVEMENTS.finale && MOVEMENTS.finale.bpm === 80 && MOVEMENTS.finale.chordsLabel === "Dmaj9 — Gmaj9 — Em9 — Asus4"
    );

    const origAudioCtx = window.AudioContext;
    const origWebkitCtx = window.webkitAudioContext;
    const origSetTo = setTimeout;
    const origClrTo = clearTimeout;
    const origSetInt = setInterval;
    const origClrInt = clearInterval;
    const origVoiceUnlock = voice.unlock;
    const snap = {
      ctx: sound.ctx,
      comp: sound.comp,
      analyser: sound.analyser,
      bgmGain: sound.bgmGain,
      bgmWarmLow: sound.bgmWarmLow,
      bgmAirTame: sound.bgmAirTame,
      bgmVocalCarve: sound.bgmVocalCarve,
      bgmConsonantCarve: sound.bgmConsonantCarve,
      ambientGain: sound.ambientGain,
      ambientEnabled: sound.ambientEnabled,
      sfxGain: sound.sfxGain,
      reverb: sound.reverb,
      _bgmRevSend: sound._bgmRevSend,
      _revReturn: sound._revReturn,
      _reverbInitTimer: sound._reverbInitTimer,
      _bgmInitialRampDone: sound._bgmInitialRampDone,
      _briefDuckActive: sound._briefDuckActive,
      voiceDucking: sound.voiceDucking,
      voiceBus: sound.voiceBus,
      voiceHighPass: sound.voiceHighPass,
      voiceLowShelf: sound.voiceLowShelf,
      voiceMidPeak: sound.voiceMidPeak,
      voicePresence: sound.voicePresence,
      voiceDeEss: sound.voiceDeEss,
      voiceAnalyser: sound.voiceAnalyser,
      voiceAnalyserData: sound.voiceAnalyserData,
      voiceFreqData: sound.voiceFreqData,
      voicePanner: sound.voicePanner,
      voiceOutGain: sound.voiceOutGain,
      voiceRevSend: sound.voiceRevSend,
      voiceRoomConv: sound.voiceRoomConv,
      seqTimer: sound.seqTimer,
      stepIdx: sound.stepIdx,
      barIdx: sound.barIdx,
      _activeSeqBpm: sound._activeSeqBpm,
      _nextStepTime: sound._nextStepTime,
      muted: sound.muted,
      bgmVol: sound.bgmVol,
      sfxVol: sound.sfxVol,
      timbre: sound.timbre,
      currentTrack: sound.currentTrack,
      _pluckNoiseBuf: sound._pluckNoiseBuf,
      _breathNoiseBuf: sound._breathNoiseBuf
    };

    const origVoiceLead = sound.voiceLead;
    const origVoicePluck = sound.voicePluck;
    const origVoicePad = sound.voicePad;
    const origVoiceBell = sound.voiceBell;

    let deferredUnlockOk = false;
    let classicFirstVerPlaybackOk = false;

    try {
      const timers = [];
      let nextTid = 4000;
      setTimeout = function (fn, ms) {
        const id = nextTid++;
        timers.push({ id, fn, ms });
        return id;
      };
      clearTimeout = function (id) {
        const idx = timers.findIndex((t) => t.id === id);
        if (idx >= 0) timers.splice(idx, 1);
      };
      setInterval = function () { return 777; };
      clearInterval = function () {};
      voice.unlock = function () {};

      const bgmRampSecs = [];
      let resolveResume = null;
      const gainList = [];

      const mkAudioParam = (initVal, onTarget) => ({
        value: initVal || 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        setTargetAtTime(val, t, tc) {
          if (onTarget) onTarget(tc, val);
        }
      });

      const mockAudioCtxInstance = {
        state: "suspended",
        sampleRate: 44100,
        currentTime: 2.0,
        destination: {},
        resume() {
          mockAudioCtxInstance.state = "running";
          return new Promise((res) => { resolveResume = res; });
        },
        createBuffer: (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
        createAnalyser: () => ({ fftSize: 64, frequencyBinCount: 32, smoothingTimeConstant: 0.8, connect() {}, disconnect() {}, getByteFrequencyData() {} }),
        createDynamicsCompressor: () => ({ threshold: mkAudioParam(-14), knee: mkAudioParam(18), ratio: mkAudioParam(4), connect() {}, disconnect() {} }),
        createGain: () => {
          const idx = gainList.length;
          const g = {
            gain: mkAudioParam(1, (tc) => {
              if (idx === 0 && typeof tc === "number") bgmRampSecs.push(tc);
            }),
            connect() {},
            disconnect() {}
          };
          gainList.push(g);
          return g;
        },
        createBiquadFilter: () => ({ type: "lowpass", frequency: mkAudioParam(1000), Q: mkAudioParam(1), gain: mkAudioParam(0), connect() {}, disconnect() {} }),
        createOscillator: () => ({ type: "sine", frequency: mkAudioParam(440), detune: mkAudioParam(0), connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }),
        createBufferSource: () => ({ buffer: null, loop: false, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }),
        createStereoPanner: () => ({ pan: mkAudioParam(0), connect() {}, disconnect() {} }),
        createConvolver: () => ({ buffer: null, connect() {}, disconnect() {} })
      };

      const MockCtor = function () { return mockAudioCtxInstance; };
      window.AudioContext = MockCtor;
      window.webkitAudioContext = MockCtor;

      const leadCalls = [];
      const padCalls = [];
      const pluckCalls = [];
      const bellCalls = [];
      sound.voiceLead = function () {
        leadCalls.push(arguments);
        return origVoiceLead.apply(this, arguments);
      };
      sound.voicePad = function (midis, t, dur, vel) {
        padCalls.push({ midis, t, dur, vel });
        return origVoicePad.apply(this, arguments);
      };
      sound.voicePluck = function (freq, t, dur, vel, stepOpt, destNode) {
        pluckCalls.push({ freq, t, vel, stepOpt });
        return origVoicePluck.apply(this, arguments);
      };
      sound.voiceBell = function (freq, t, dur, vel, destNode) {
        bellCalls.push({ freq, t, vel });
        return origVoiceBell.apply(this, arguments);
      };

      sound.ctx = null;
      sound.reverb = null;
      sound.seqTimer = null;
      sound._reverbInitTimer = null;
      sound._bgmInitialRampDone = false;
      sound._briefDuckActive = false;
      sound.voiceDucking = false;
      sound._pluckNoiseBuf = null;
      sound._breathNoiseBuf = null;
      sound.muted = false;
      sound.bgmVol = 0.6;
      sound.sfxVol = 0.75;
      sound.timbre = "zen";
      sound.currentTrack = "twilight";
      sound.barIdx = 0;
      sound.stepIdx = 0;

      const defaultAmbientOffOk = snap.ambientEnabled === false;
      sound.unlock();
      const waitedBeforeResume = sound.seqTimer === null;
      const deferredReverbInitiallyNull = sound.reverb === null && timers.some((t) => t.ms === 120);
      const noMuffleFiltersOk = sound.bgmWarmLow === null && sound.bgmAirTame === null;
      const breathBufShortOk = Boolean(sound._breathNoiseBuf && sound._breathNoiseBuf.length === Math.max(256, Math.floor(44100 * 0.8)));

      resolveResume();
      await Promise.resolve();
      await Promise.resolve();

      const resumedStartedSeqOk = sound.seqTimer !== null && bgmRampSecs.includes(0.06);

      // Flush deferred 120ms Hall Reverb initialization timer (original lush 2.1s hall)
      const revTimer = timers.find((t) => t.ms === 120);
      if (revTimer) revTimer.fn();
      const reverbLoadedAfterDelayOk = Boolean(
        sound.reverb && sound.reverb.buffer && sound.reverb.buffer.length === Math.max(512, Math.floor(44100 * 2.1))
      );

      deferredUnlockOk = Boolean(
        defaultAmbientOffOk &&
        waitedBeforeResume &&
        deferredReverbInitiallyNull &&
        noMuffleFiltersOk &&
        breathBufShortOk &&
        resumedStartedSeqOk &&
        reverbLoadedAfterDelayOk
      );

      // Verify step 0 playback AND B-section barIdx = 4 both play original pad+pluck+bell with ZERO voiceLead solo
      const bar0ClassicOk = padCalls.length === 1 &&
        pluckCalls.some((p) => Math.abs(p.freq - 440 * Math.pow(2, (62 - 69) / 12)) < 0.5 && Math.abs(p.vel - 0.16) < 0.005) &&
        bellCalls.some((b) => Math.abs(b.freq - 880) < 0.5 && Math.abs(b.vel - 0.065) < 0.005);

      sound.barIdx = 4;
      sound.stepIdx = 0;
      sound.tickStep(4.0);
      ["zen", "guqin", "folk", "cinema"].forEach((tMode) => {
        sound.timbre = tMode;
        sound.voicePad([50, 57, 64, 66], 4.0, 2.0, 0.09);
        sound.voicePluck(293.66, 4.0, 0.9, 0.16, 0);
        sound.voiceBell(880, 4.0, 1.4, 0.065);
        sound.voiceDrum("deep", 4.0, 0.16);
        sound.voiceDrum("wood", 4.0, 0.06);
      });
      classicFirstVerPlaybackOk = Boolean(bar0ClassicOk && padCalls.length >= 2 && leadCalls.length === 0);
    } finally {
      if (sound._reverbInitTimer) clearTimeout(sound._reverbInitTimer);
      if (sound.seqTimer) clearInterval(sound.seqTimer);
      window.AudioContext = origAudioCtx;
      window.webkitAudioContext = origWebkitCtx;
      setTimeout = origSetTo;
      clearTimeout = origClrTo;
      setInterval = origSetInt;
      clearInterval = origClrInt;
      voice.unlock = origVoiceUnlock;
      sound.voiceLead = origVoiceLead;
      sound.voicePluck = origVoicePluck;
      sound.voicePad = origVoicePad;
      sound.voiceBell = origVoiceBell;
      Object.assign(sound, snap);
    }

    return { classicMovementsRestoredOk, deferredUnlockOk, classicFirstVerPlaybackOk };
  })()`, ctx);

  const all2552 = Object.assign(
    { apiThinkingZeroOk, frontendThinkingZeroOk, no38TtsModelsOk, shortVoteNightOk, mobileTtsBudgetOk, ttsMaxOneRetryOk, scriptHeaderSyncOk },
    v2552Runtime,
    v2552AudioRes
  );
  for (const [k, v] of Object.entries(all2552)) {
    if (!v) {
      throw new Error("v25.5.2 Night/Dawn Curtain & Mobile Latency regression failed for " + k + ": " + JSON.stringify(all2552));
    }
  }
}

// ==================== v25.5.3 FULL AUDIT PATCHES & BLINDSPOT HARDENING ====================
{
  const apiGem2553 = (await import("../api/gemini.js")).default;
  const apiTts2553 = (await import("../api/tts.js")).default;

  // BUG-04: IPv6 loopback and bracketed host normalization in api/gemini.js & api/tts.js
  const prevVercelEnv = process.env.VERCEL_ENV;
  let ipv6OriginOk = false;
  try {
    process.env.VERCEL_ENV = "preview";
    const checksHost = [apiGem2553, apiTts2553].every((mod) => {
      return (
        typeof mod._getHostname === "function" &&
        mod._getHostname("[::1]:8000") === "::1" &&
        mod._getHostname("[::1]") === "::1" &&
        mod._getHostname("http://[::1]:8000") === "::1" &&
        mod._getHostname("[2001:db8::1]:443") === "2001:db8::1" &&
        mod._getHostname("[") === "" &&
        mod._isAllowedOrigin({ headers: { host: "[::1]:3000", origin: "http://[::1]:3000" } }) === true &&
        mod._isAllowedOrigin({ headers: { host: "[::1]:3000" } }) === true &&
        mod._isAllowedOrigin({ headers: { host: "[2001:db8::1]:443", origin: "https://[2001:db8::1]:443" } }) === true &&
        mod._isAllowedOrigin({ headers: { host: "[2001:db8::1]:443", origin: "https://evil.example" } }) === false
      );
    });
    ipv6OriginOk = checksHost;
  } finally {
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
  }

  // BUG-01, BUG-02, BUG-03, BUG-05, BUG-06, BUG-07 timer hardening runtime verification
  const prevFetch2553 = ctx.fetch;
  const v2553Runtime = await vm.runInContext(`(async () => {
    const hasBadgeBan = function (btn) {
      return Array.from(btn.children || []).some((ch) => String(ch.textContent || "").trim() === "伴");
    };
    const hasWolfLeak = function (stripEl) {
      return Array.from(stripEl.children || []).some((btn) =>
        hasBadgeBan(btn) ||
        String(btn.title || "").includes("（狼隊同伴）") ||
        String(btn.title || "").includes("（獵神：")
      );
    };

    // 1. BUG-01: state.hidePlayerRole hides wolf-mate & god-mark badges for ordinary wolf AND wolf_king
    let hideWolfStripMaskOk = false;
    const prevHide = state.hidePlayerRole;
    try {
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "wolf";
      el("chkSheriffMode").checked = false;
      el("chkGuardMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      const pid = getPlayerId();
      const pSelf = getPlayerSeat();
      const goodTarget = state.match.seats.find((s) => s.team === "good");
      const wolfMate = state.match.seats.find((s) => s.id !== pid && s.role === "wolf");
      if (pSelf && goodTarget && wolfMate) {
        pSelf.role = "wolf";
        pSelf.isWolfKing = false;
        state.match.wolfGodMarks = {};
        state.match.wolfGodMarks[goodTarget.id] = "seer";
        state.match.phase = "DAY_SPEECH";
        state.hidePlayerRole = false;
        renderSeatStrip();
        const unmaskedHasWolfInfo = hasWolfLeak(el("seatButtonStrip"));

        state.hidePlayerRole = true;
        renderSeatStrip();
        const maskedOrdWolfClean = !hasWolfLeak(el("seatButtonStrip"));

        pSelf.isWolfKing = true;
        state.match.phase = "NIGHT_WOLF";
        renderSeatStrip();
        const maskedKingWolfClean = !hasWolfLeak(el("seatButtonStrip")) &&
          !Array.from(el("seatButtonStrip").children || []).some((b) => String(b.className || "").includes("is-disabled-target") && String(b.title || "").includes(wolfMate.name));

        hideWolfStripMaskOk = Boolean(unmaskedHasWolfInfo && maskedOrdWolfClean && maskedKingWolfClean);
      }
    } finally {
      state.hidePlayerRole = prevHide;
      resetMatchToLobby();
    }

    // 2. BUG-02: Track A firstAttemptTimeoutMs < trackATotalBudgetMs & stripped retry within budget
    let trackATimeoutAndRetryOk = false;
    const origSetTo = setTimeout;
    const origFetch = fetch;
    const origDecode = voice.decodeGeminiAudioBytes;
    const origIsStatic = voice.isStaticCloudHost;
    const prevVoiceState = {
      cloudAvail: voice.cloudGeminiTtsAvailable,
      cooldown: voice.cloudGeminiTtsCooldownUntil,
      key: state.geminiApiKey,
      optOut: state.serverGeminiOptOut,
      forceMob: state._forceMobileTtsBudget,
      ctx: sound.ctx
    };
    try {
      const timeoutArgs = [];
      const sentTexts = [];
      state.geminiApiKey = "";
      state.serverGeminiOptOut = false;
      voice.cloudGeminiTtsAvailable = true;
      voice.cloudGeminiTtsCooldownUntil = 0;
      voice.isStaticCloudHost = () => true;
      voice.studioCache = {};
      voice.studioPending = {};
      sound.ctx = { sampleRate: 24000, currentTime: 0 };
      voice.decodeGeminiAudioBytes = async () => ({ duration: 0.8 });
      setTimeout = function (fn, ms) {
        if (ms >= 1000) timeoutArgs.push(ms);
        else if (ms <= 200) fn();
        return timeoutArgs.length + 100;
      };
      fetch = async function (_u, init) {
        sentTexts.push(JSON.parse(init.body).text);
        return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(256).buffer };
      };
      voice._cloudTtsFailStreak = 0;
      voice._cloudTtsCooldownIs429 = false;
      state._forceMobileTtsBudget = true;
      const mobRes = await voice._fetchGeminiStudioAudio(PERSONA_VOICE_PROFILES["暖暖"], "暖暖", "這句話這輪測試第一次逾時與單次雲端預算請求。", "panic");
      const mobOk = Boolean(mobRes) && timeoutArgs[0] === 10500 && sentTexts.length === 1 &&
        !sentTexts[0].includes("<breath>");

      timeoutArgs.length = 0;
      sentTexts.length = 0;
      voice.studioCache = {};
      voice.studioPending = {};
      voice.cloudTtsAudioCache.clear();
      voice.cloudTtsInflightMap.clear();
      voice._cloudTtsFailStreak = 0;
      voice._cloudTtsFailSpeakers = [];
      voice._cloudTtsCooldownIs429 = false;
      voice.cloudGeminiTtsCooldownUntil = 0;
      fetch = async function (_u, init) {
        sentTexts.push(JSON.parse(init.body).text);
        return { ok: false, status: 502, arrayBuffer: async () => new ArrayBuffer(0) };
      };
      state._forceMobileTtsBudget = false;
      await voice._fetchGeminiStudioAudio(PERSONA_VOICE_PROFILES["暖暖"], "暖暖", "桌機模式單次總預算請求不連環重試。", "panic");
      const deskOk = timeoutArgs[0] === 10500 && sentTexts.length === 1;
      trackATimeoutAndRetryOk = Boolean(mobOk && deskOk);
    } finally {
      setTimeout = origSetTo;
      fetch = origFetch;
      voice.decodeGeminiAudioBytes = origDecode;
      voice.isStaticCloudHost = origIsStatic;
      voice.cloudGeminiTtsAvailable = prevVoiceState.cloudAvail;
      voice.cloudGeminiTtsCooldownUntil = prevVoiceState.cooldown;
      voice._cloudTtsFailStreak = 0;
      voice._cloudTtsCooldownIs429 = false;
      state.geminiApiKey = prevVoiceState.key;
      state.serverGeminiOptOut = prevVoiceState.optOut;
      state._forceMobileTtsBudget = prevVoiceState.forceMob;
      sound.ctx = prevVoiceState.ctx;
      voice.studioCache = {};
      voice.studioPending = {};
    }

    // 3. BUG-03: prefetchNextAiSpeech(opts) forwards highPriority and skips player seat
    let highPriorityPrefetchOk = false;
    const prevKeyPf = state.geminiApiKey;
    const origDispatchPf = orchestrator.dispatchAgent;
    const origPfTts = voice.prefetchBestTts;
    try {
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.geminiApiKey = "dummy-key";
      state.match.phase = "DAY_SPEECH";
      const pid = getPlayerId();
      const nextAiSeat = state.match.seats.find((s) => s.id !== pid && s.alive);
      state.match.speechQueue = [pid, nextAiSeat.id];
      state.match._prefetchedSpeech = null;
      orchestrator.dispatchAgent = () => Promise.resolve(null);
      voice.prefetchBestTts = () => false;

      const blockedWhenPlayerHead = prefetchNextAiSpeech() === false && state.match._prefetchedSpeech === null;
      const startedHighPri = triggerImmediatePostPlayerPrefetch() === true &&
        state.match._prefetchedSpeech &&
        state.match._prefetchedSpeech.seatId === nextAiSeat.id &&
        state.match._prefetchedSpeech.highPriority === true;
      highPriorityPrefetchOk = Boolean(blockedWhenPlayerHead && startedHighPri);
    } finally {
      state.geminiApiKey = prevKeyPf;
      orchestrator.dispatchAgent = origDispatchPf;
      voice.prefetchBestTts = origPfTts;
      resetMatchToLobby();
    }

    // 4. BUG-05: Chunked fallback resolves normalized effProfile object + opts.personaKey = effKey
    let normalizedFallbackProfileOk = false;
    const origFetchGem = voice._fetchGeminiStudioAudio;
    const origPlayBuf = voice.playBufferedStudioAudio;
    const origLocalTts = voice.speakLocalBrowserTts;
    const origSetTo5 = setTimeout;
    const origIsStatic5 = voice.isStaticCloudHost;
    const prevCtx5 = sound.ctx;
    const prevKey5 = state.geminiApiKey;
    const prevOptOut5 = state.serverGeminiOptOut;
    const prevLocalAvail5 = voice.localNeuralAvailable;
    const prevCloudAvail5 = voice.cloudGeminiTtsAvailable;
    const prevPaused5 = voice.paused;
    try {
      setTimeout = (fn) => { fn(); return 1; };
      sound.ctx = { sampleRate: 24000, currentTime: 0 };
      state.geminiApiKey = "";
      state.serverGeminiOptOut = false;
      voice.isStaticCloudHost = () => true;
      voice.localNeuralAvailable = false;
      voice.cloudGeminiTtsAvailable = true;
      voice.cloudGeminiTtsCooldownUntil = 0;
      voice._cloudTtsCooldownIs429 = false;
      voice.paused = false;
      voice.studioCache = {};
      voice.studioPending = {};
      let chunkCall = 0;
      voice._fetchGeminiStudioAudio = async () => {
        chunkCall += 1;
        return chunkCall === 1 ? { duration: 0.4 } : null;
      };
      let chunkDonePromise = null;
      voice.playBufferedStudioAudio = (_seq, _buf, onChunkDone) => {
        chunkDonePromise = Promise.resolve().then(() => (typeof onChunkDone === "function" ? onChunkDone() : null));
        return true;
      };
      let capturedProf = null;
      let capturedOpts = null;
      voice.speakLocalBrowserTts = (_seq, prof, _txt, _mood, _busy, _done, tailOpts) => {
        capturedProf = prof;
        capturedOpts = tailOpts;
      };
      const fakeWrongProfile = { gender: "m", pitch: 0.77, rateMul: 1.0 };
      const longText = "我覺得三號剛剛那段發言非常有道理，先保一下三號並且觀察前置位表情與語氣。不過二號位突然跳出來帶風向的節奏讓我有點懷疑，而且後置位五號與六號到現在都還沒正式表明立場，大家公投前一定要把昨晚的金水與查殺順序全部核對清楚，再來做最終決定才比較穩妥。";
      const okStart = await voice.playGeminiStudioTts(voice.utteranceSeq, fakeWrongProfile, longText, "normal", () => {}, { personaKey: "晴嵐" });
      if (chunkDonePromise) await chunkDonePromise;
      normalizedFallbackProfileOk = Boolean(
        okStart &&
        capturedProf && typeof capturedProf === "object" &&
        capturedProf === PERSONA_VOICE_PROFILES["晴嵐"] &&
        capturedOpts && capturedOpts.personaKey === "晴嵐"
      );
    } finally {
      setTimeout = origSetTo5;
      voice._fetchGeminiStudioAudio = origFetchGem;
      voice.playBufferedStudioAudio = origPlayBuf;
      voice.speakLocalBrowserTts = origLocalTts;
      voice.isStaticCloudHost = origIsStatic5;
      sound.ctx = prevCtx5;
      state.geminiApiKey = prevKey5;
      state.serverGeminiOptOut = prevOptOut5;
      voice.localNeuralAvailable = prevLocalAvail5;
      voice.cloudGeminiTtsAvailable = prevCloudAvail5;
      voice.paused = prevPaused5;
      voice._cloudTtsCooldownIs429 = false;
      voice.studioCache = {};
      voice.studioPending = {};
    }

    // 5. BUG-06 + Last-Words Blindspot: orchestrator.getEpoch()/isEpochValid() & clearTransientMatchTimers()
    let epochApiVoiceOk = false;
    let lwTimerCleanupOk = false;
    const origLocalTts6 = voice.speakLocalBrowserTts;
    const origCanSpeak6 = voice.canSpeak;
    const prevPref6 = voice.enginePref;
    const prevEnabled6 = voice.enabled;
    const prevSpeaking6 = voice.speaking;
    try {
      const ep0 = orchestrator.getEpoch();
      const getEpochMatchesOk = ep0 === orchestrator.matchEpoch && orchestrator.isEpochValid(ep0);
      let capturedDone6 = null;
      let origTurnFired = 0;
      let audDoneFired = 0;
      voice.canSpeak = () => true;
      voice.enginePref = "local";
      voice.enabled = true;
      voice.speakLocalBrowserTts = (_s, _p, _t, _m, _b, onDone) => {
        capturedDone6 = onDone;
      };
      voice.speak("暖暖", "第一段主線語音。", "normal", () => { origTurnFired += 1; }, {});
      voice.speaking = true;
      voice.speak("小澄", "第二段試聽語音。", "normal", () => { audDoneFired += 1; }, { isAudition: true });
      orchestrator.bumpInterruptEpoch("test_bug06_audition");
      if (typeof capturedDone6 === "function") capturedDone6();
      epochApiVoiceOk = Boolean(getEpochMatchesOk && audDoneFired === 1 && origTurnFired === 0);

      state._lwCueTimer = origSetTo ? setTimeout(() => {}, 1000) : 999;
      state._dawnLwFlush = () => {};
      clearTransientMatchTimers();
      lwTimerCleanupOk = Boolean(state._lwCueTimer === null && state._dawnLwFlush === null);
    } finally {
      voice.speakLocalBrowserTts = origLocalTts6;
      voice.canSpeak = origCanSpeak6;
      voice.enginePref = prevPref6;
      voice.enabled = prevEnabled6;
      voice.speaking = prevSpeaking6;
      voice.stop();
      resetMatchToLobby();
    }

    return {
      hideWolfStripMaskOk,
      trackATimeoutAndRetryOk,
      highPriorityPrefetchOk,
      normalizedFallbackProfileOk,
      epochApiVoiceOk,
      lwTimerCleanupOk
    };
  })()`, ctx);
  ctx.fetch = prevFetch2553;

  // BUG-07 & Blindspot static source checks
  const canvasEv2553 = fs.readFileSync(path.join(ROOT, "js/events/canvas-events.js"), "utf8");
  const compCss2553 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const compCssNoComments2553 = compCss2553.replace(/\/\*[\s\S]*?\*\//g, "");
  const sw2553 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const fb2553 = fs.readFileSync(path.join(ROOT, "js/ui/feedback.js"), "utf8");
  const spec2553 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const script2553 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const readme2553 = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const lwSrc2553 = fs.readFileSync(path.join(ROOT, "js/game/last-words.js"), "utf8");
  const touchedTexts2553 = [
    canvasEv2553, compCss2553, sw2553, fb2553, spec2553, script2553, readme2553, lwSrc2553,
    fs.readFileSync(path.join(ROOT, "js/ui/hud.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "js/core/orchestrator.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "js/game/day-speech.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "api/gemini.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "api/tts.js"), "utf8")
  ];
  const zeroEmoji2553Ok = touchedTexts2553.every((txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt));
  const uiCacheAndLwTimerOk = Boolean(
    canvasEv2553.includes("依當前局規本夜不可自刀，請選擇其他目標") &&
    canvasEv2553.includes("他是你的酸民狼同伴，請改鎖定好人！") &&
    compCss2553.includes("body.craft-ui.theme-daylight #heroShowcaseOverlay #heroShowcaseSub") &&
    compCss2553.includes("body.craft-ui.theme-night #heroShowcaseOverlay #heroShowcaseSub") &&
    !compCssNoComments2553.includes("!important") &&
    !compCssNoComments2553.includes("backdrop-filter") &&
    sw2553.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    fb2553.includes('version: "v25.9.0"') &&
    spec2553.includes("v25.9.0") && spec2553.length <= 5000 &&
    script2553.includes("v25.9.0") &&
    readme2553.includes("v25.9.0") &&
    lwSrc2553.includes("state._lwCueTimer") &&
    lwSrc2553.includes("orchestrator.isEpochValid(epLw)") &&
    zeroEmoji2553Ok
  );

  const all2553 = Object.assign({ ipv6OriginOk, uiCacheAndLwTimerOk }, v2553Runtime);
  for (const [k, v] of Object.entries(all2553)) {
    if (!v) {
      throw new Error("v25.5.3 Audit & Blindspot regression failed for " + k + ": " + JSON.stringify(all2553));
    }
  }
}

// ==================== v25.6.0 RELEASE-FREEZE REGRESSION SUITE (FILE 01 - FILE 10) ====================
{
  const css256 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const css256NoCom = css256.replace(/\/\*[\s\S]*?\*\//g, "");
  const html256 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const canvasEv256 = fs.readFileSync(path.join(ROOT, "js/events/canvas-events.js"), "utf8");
  const voting256 = fs.readFileSync(path.join(ROOT, "js/game/voting.js"), "utf8");
  const night256 = fs.readFileSync(path.join(ROOT, "js/game/night.js"), "utf8");
  const hud256 = fs.readFileSync(path.join(ROOT, "js/ui/hud.js"), "utf8");
  const panels256 = fs.readFileSync(path.join(ROOT, "js/ui/panels.js"), "utf8");
  const voice256 = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  const tts256 = fs.readFileSync(path.join(ROOT, "api/tts.js"), "utf8");
  const soundtrack256 = fs.readFileSync(path.join(ROOT, "js/audio/soundtrack.js"), "utf8");
  const spotlight256 = fs.readFileSync(path.join(ROOT, "js/ui/spotlight.js"), "utf8");
  const flow256 = fs.readFileSync(path.join(ROOT, "js/ui/flow.js"), "utf8");
  const main256 = fs.readFileSync(path.join(ROOT, "js/main.js"), "utf8");
  const sw256 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const fb256 = fs.readFileSync(path.join(ROOT, "js/ui/feedback.js"), "utf8");
  const spec256 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const script256 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const readme256 = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

  const idxDeck = html256.indexOf('id="controlDeck"');
  const idxStrip = html256.indexOf('id="seatButtonStrip"');
  const idxPanelVote = html256.indexOf('id="panelVote"');

  const file01CssOk = Boolean(
    idxDeck >= 0 && idxStrip > idxDeck && idxPanelVote > idxStrip &&
    !/#seatButtonStrip[^}]*\{[^}]*position:\s*fixed/i.test(css256NoCom) &&
    css256NoCom.includes(".seat-pill-btn.is-vote-eligible") &&
    css256NoCom.includes(".seat-pill-btn.is-vote-disabled") &&
    css256NoCom.includes("pointer-events: none") &&
    css256NoCom.includes("#panelVote #voteNotesDeck") &&
    css256NoCom.includes("#heroShowcaseSub") &&
    css256NoCom.includes("bottom: 54px;") &&
    !css256NoCom.includes("!important") &&
    !css256NoCom.includes("backdrop-filter")
  );

  const file03CanvasClickOk = Boolean(
    canvasEv256.includes("getSeatTargetingState") &&
    canvasEv256.includes("getSeatTargetRejectReasonMessage") &&
    canvasEv256.includes("依當前局規本夜不可自刀，請選擇其他目標")
  );

  const file08SpotlightSourceOk = Boolean(
    !(/voice\.speaking\b/.test(spotlight256.replace(/typeof\s+voice\s*!==\s*"undefined"\s*&&\s*!!voice\.speaking/g, ""))) &&
    flow256.includes("seatId: s.id") &&
    flow256.includes("personaKey: s.name")
  );

  const file09MainSwProtectionsOk = Boolean(
    main256.includes('state.match.phase !== "LOBBY"') &&
    !main256.includes('state.match.phase !== "GAME_OVER"') &&
    main256.includes('":static"') &&
    !main256.includes("Date.now() / 60000")
  );

  const file10SwCacheAndZeroEmojiOk = Boolean(
    sw256.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw256.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb256.includes('version: "v25.9.0"') &&
    readme256.includes("v25.9.0") &&
    readme256.includes("sanhao-assets-v25.9.0") &&
    spec256.includes("v25.9.0") &&
    spec256.includes("sanhao-shell-v25.9.0") &&
    spec256.length <= 5000 &&
    script256.includes("v25.9.0") &&
    [css256, hud256, panels256, canvasEv256, voting256, night256, voice256, tts256, soundtrack256, spotlight256, flow256, main256, sw256, fb256, spec256, script256, readme256].every(
      (txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
    )
  );

  const v256Runtime = await vm.runInContext(`(async () => {
    // 1. FILE 02: Seat strip .is-vote-eligible / .is-vote-disabled & Sheriff vote/transfer double-click confirm
    let file02HudAndDoubleClickOk = false;
    try {
      clearStepTimer();
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = true;
      el("chkGuardMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const pid = getPlayerId();
      const others = getAliveSeats().filter((s) => s.id !== pid);
      state.match.phase = "DAY_VOTE";
      state.match.pkCandidates = [others[0].id, others[1].id];
      state.match.pkUsedToday = true;
      state.selectedSeatId = null;
      updateAllUI();

      const pkBtns = Array.from(el("seatButtonStrip").children || []);
      const pkEligibleOk = pkBtns.length === 8 &&
        pkBtns[others[0].id - 1].classList.contains("is-vote-eligible") &&
        pkBtns[others[2].id - 1].classList.contains("is-vote-disabled") &&
        pkBtns[pid - 1].classList.contains("is-vote-disabled");

      selectSeat(others[2].id);
      const pkRejectBlockedOk = state.selectedSeatId === null && state.match.phase === "DAY_VOTE";

      state.match.phase = "SHERIFF_ELECTION";
      state.match.pkCandidates = null;
      state.match.sheriffElectionCtx = {
        stage: "vote",
        candidateIds: [others[0].id, others[1].id],
        speechOrderIds: [others[0].id, others[1].id],
        speechIndex: 1,
        activeReelSeatId: null,
        playerRunning: false,
        withdrawnIds: [],
        spokenSpeeches: [],
        doneCb: () => {}
      };
      state.selectedSeatId = null;
      updateAllUI();
      const shBtns = Array.from(el("seatButtonStrip").children || []);
      const shStripVisibleAndEligibleOk =
        !el("seatButtonStrip").classList.contains("hidden") &&
        shBtns[others[0].id - 1].classList.contains("is-vote-eligible") &&
        shBtns[others[2].id - 1].classList.contains("is-vote-disabled");

      const origResolveSh = resolveSheriffElectionAction;
      let shVoteConfirmedId = null;
      resolveSheriffElectionAction = function (arg) {
        shVoteConfirmedId = arg;
        return true;
      };
      try {
        selectSeat(others[0].id);
        const shFirstClickOk = state.selectedSeatId === others[0].id && shVoteConfirmedId === null;
        selectSeat(others[0].id);
        const shSecondClickOk = shVoteConfirmedId === others[0].id;

        state.match.phase = "SHERIFF_TRANSFER";
        state.match.pendingSheriffTransfer = { deadId: pid, onDone: () => {} };
        state.selectedSeatId = null;
        updateAllUI();
        const tfBtns = Array.from(el("seatButtonStrip").children || []);
        const tfEligibleOk = !el("seatButtonStrip").classList.contains("hidden") &&
          tfBtns[others[1].id - 1].classList.contains("is-vote-eligible") &&
          tfBtns[pid - 1].classList.contains("is-vote-disabled");

        let transferredToId = null;
        const origTransfer = resolvePlayerSheriffTransfer;
        resolvePlayerSheriffTransfer = function (tid) { transferredToId = tid; };
        try {
          selectSeat(others[1].id);
          selectSeat(others[1].id);
        } finally {
          resolvePlayerSheriffTransfer = origTransfer;
        }
        file02HudAndDoubleClickOk = Boolean(
          pkEligibleOk && pkRejectBlockedOk && shStripVisibleAndEligibleOk &&
          shFirstClickOk && shSecondClickOk && tfEligibleOk && transferredToId === others[1].id
        );
      } finally {
        resolveSheriffElectionAction = origResolveSh;
      }
    } finally {
      clearStepTimer();
      resetMatchToLobby();
    }

    // 2. FILE 04: _voteFinalizing catch reset & paused vote-flight deferral
    let file04VotingLockAndPauseOk = false;
    try {
      el("selectModeCount").value = "6";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const freshResetOk = state.match._voteFinalizing === false;
      state.match.phase = "DAY_VOTE";
      const origChooseVote = chooseAiVoteTarget;
      let throwClearedOk = false;
      try {
        chooseAiVoteTarget = function () { throw new Error("injected_vote_boom"); };
        try { finalizeVoteRound(null); } catch (e) {}
        throwClearedOk = state.match.phase === "DAY_VOTE" && state.match._voteFinalizing === false;
      } finally {
        chooseAiVoteTarget = origChooseVote;
      }

      const origSetToV = setTimeout;
      const prevPausedV = voice.paused;
      const scheduledFns = [];
      let flightDoneCount = 0;
      try {
        setTimeout = function (fn, ms) {
          scheduledFns.push({ fn, ms });
          return scheduledFns.length;
        };
        const othersV = getAliveSeats().filter((s) => s.id !== getPlayerId());
        runVoteFlightSequence([{ voterId: getPlayerId(), targetId: othersV[0].id, weight: 1 }], () => { flightDoneCount += 1; }, { isTie: false });
        voice.paused = true;
        const safetyEntry = scheduledFns.filter((x) => x.ms >= 1500).pop();
        const countBefore = scheduledFns.length;
        if (safetyEntry && typeof safetyEntry.fn === "function") safetyEntry.fn();
        const deferredWhilePausedOk = Boolean(safetyEntry) && flightDoneCount === 0 && scheduledFns.length > countBefore;
        voice.paused = false;
        const rearmedEntry = scheduledFns[scheduledFns.length - 1];
        if (rearmedEntry && typeof rearmedEntry.fn === "function") rearmedEntry.fn();
        const completedOnResumeOk = flightDoneCount === 1;
        file04VotingLockAndPauseOk = Boolean(freshResetOk && throwClearedOk && deferredWhilePausedOk && completedOnResumeOk);
      } finally {
        setTimeout = origSetToV;
        voice.paused = prevPausedV;
      }
    } finally {
      clearStepTimer();
      resetMatchToLobby();
    }

    // 3. FILE 05: Seer night host voice sync + no orphan timer + self-knife toast
    let file05NightSeerAndDawnTimersOk = false;
    const origSpeakHost5 = voice.speakHost;
    const origCanSpeak5 = voice.canSpeak;
    const origSetTo5 = setTimeout;
    const origClearTo5 = clearTimeout;
    const origShowToast5 = showToast;
    try {
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "seer";
      el("chkSheriffMode").checked = false;
      el("chkGuardMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const scheduledMap = new Map();
      let tidSeq = 1;
      setTimeout = function (fn, ms) {
        const id = tidSeq++;
        scheduledMap.set(id, { fn, ms });
        return id;
      };
      clearTimeout = function (id) {
        scheduledMap.delete(id);
      };
      voice.canSpeak = () => true;
      let seerHostSpoken = "";
      voice.speakHost = function (txt, cb) {
        seerHostSpoken = String(txt || "");
        if (typeof cb === "function") cb();
      };
      state.match.phase = "LOBBY";
      state.match.day = 1;
      proceedToNightWolf();
      const pendingSafety5200 = Array.from(scheduledMap.values()).filter((x) => x.ms >= 5000);
      const stepEntry = state.stepTimer ? scheduledMap.get(state.stepTimer) : null;
      const seerSyncNoOrphanOk = Boolean(
        seerHostSpoken.includes("明心觀察員") &&
        pendingSafety5200.length === 0 &&
        Boolean(stepEntry && stepEntry.ms === 220)
      );

      scheduledMap.clear();
      const capturedToasts = [];
      showToast = function (msg) { capturedToasts.push(String(msg || "")); };
      el("selectPreferredRole").value = "wolf";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.day = 2;
      state.match.phase = "NIGHT_WOLF";
      state.selectedSeatId = getPlayerId();
      confirmTargetAction();
      const selfKnifeToastOk = capturedToasts.some((t) => t.includes("不可自刀"));

      file05NightSeerAndDawnTimersOk = Boolean(seerSyncNoOrphanOk && selfKnifeToastOk);
    } finally {
      showToast = origShowToast5;
      voice.speakHost = origSpeakHost5;
      voice.canSpeak = origCanSpeak5;
      setTimeout = origSetTo5;
      clearTimeout = origClearTo5;
      clearStepTimer();
      resetMatchToLobby();
    }

    // 4. FILE 06: playChunkAt pause sets _resumePendingChunk + keeps onDone (no browser TTS fallback)
    let file06VoicePauseChunkAndTimeoutsOk = false;
    const origSetTo6 = setTimeout;
    const origFetch6 = voice._fetchGeminiStudioAudio;
    const origPlayBuf6 = voice.playBufferedStudioAudio;
    const origLocal6 = voice.speakLocalBrowserTts;
    const origIsStatic6 = voice.isStaticCloudHost;
    const prevCtx6 = sound.ctx;
    const prevKey6 = state.geminiApiKey;
    const prevOptOut6 = state.serverGeminiOptOut;
    const prevLocalAvail6 = voice.localNeuralAvailable;
    const prevCloudAvail6 = voice.cloudGeminiTtsAvailable;
    const prevPaused6 = voice.paused;
    const prevSpeaking6 = voice.speaking;
    try {
      setTimeout = (fn) => { if (typeof fn === "function") fn(); return 1; };
      sound.ctx = { sampleRate: 24000, currentTime: 0 };
      state.geminiApiKey = "";
      state.serverGeminiOptOut = false;
      voice.isStaticCloudHost = () => true;
      voice.localNeuralAvailable = false;
      voice.cloudGeminiTtsAvailable = true;
      voice.cloudGeminiTtsCooldownUntil = 0;
      voice.studioCache = {};
      voice.studioPending = {};
      voice.pauseMeta = null;
      voice._resumePendingChunk = null;
      voice.paused = true;
      voice.speaking = true;
      let browserTtsCalled = 0;
      let chunkPlayedAfterResume = 0;
      let chunkOnDoneCalled = 0;
      let doneResolve = null;
      const donePromise = new Promise((res) => { doneResolve = res; });
      voice._fetchGeminiStudioAudio = async () => ({ duration: 0.5 });
      voice.speakLocalBrowserTts = () => { browserTtsCalled += 1; };
      voice.playBufferedStudioAudio = (_seq, _buf, onChunkDone) => {
        chunkPlayedAfterResume += 1;
        Promise.resolve().then(() => (typeof onChunkDone === "function" ? onChunkDone() : null));
        return true;
      };
      const longStr = "今天這輪討論先把警徽流和首夜查驗資訊攤開來比對，請還沒報身分的夥伴依序補充關鍵細節，不要遺漏任何公投票型矛盾。此外昨天投票給五號與六號的兩位同窗今天也請解釋立場轉折，而且尚未發言的後置位夥伴也記得完整說清楚站邊理由，核對完整時間線再安心落籌。";
      const okQueued = await voice.playGeminiStudioTts(voice.utteranceSeq, PERSONA_VOICE_PROFILES["晴嵐"], longStr, "normal", () => {
        chunkOnDoneCalled += 1;
        if (typeof doneResolve === "function") doneResolve();
      }, { personaKey: "晴嵐" });
      const mountedResumeOk = Boolean(okQueued && browserTtsCalled === 0 && typeof voice._resumePendingChunk === "function" && voice.pauseMeta === null);
      if (mountedResumeOk) {
        voice.togglePause();
        await Promise.race([donePromise, new Promise((res) => origSetTo6(res, 1500))]);
      }
      file06VoicePauseChunkAndTimeoutsOk = Boolean(mountedResumeOk && browserTtsCalled === 0 && chunkPlayedAfterResume >= 2 && chunkOnDoneCalled === 1);
    } finally {
      setTimeout = origSetTo6;
      voice._fetchGeminiStudioAudio = origFetch6;
      voice.playBufferedStudioAudio = origPlayBuf6;
      voice.speakLocalBrowserTts = origLocal6;
      voice.isStaticCloudHost = origIsStatic6;
      sound.ctx = prevCtx6;
      state.geminiApiKey = prevKey6;
      state.serverGeminiOptOut = prevOptOut6;
      voice.localNeuralAvailable = prevLocalAvail6;
      voice.cloudGeminiTtsAvailable = prevCloudAvail6;
      voice.paused = prevPaused6;
      voice.speaking = prevSpeaking6;
      voice.studioCache = {};
      voice.studioPending = {};
      voice.stop();
    }

    // 5. FILE 07 & FILE 08: soundtrack _unlockingPromise dedup + showcase audition seatId/personaKey
    let file07SoundtrackUnlockDedupOk = false;
    let file08AuditionOptsOk = false;
    const prevSndCtx = sound.ctx;
    const prevUnlockPromise = sound._unlockingPromise;
    const prevSeqTimer = sound.seqTimer;
    const origApplyVol = sound.applyVolumes;
    try {
      let resumeCalls = 0;
      let applyCalls = 0;
      let resolveResume = null;
      sound.ctx = {
        state: "suspended",
        currentTime: 0,
        resume: () => {
          resumeCalls += 1;
          return new Promise((res) => { resolveResume = res; });
        }
      };
      sound.applyVolumes = () => { applyCalls += 1; };
      sound._unlockingPromise = null;
      sound.seqTimer = 999;
      sound.muted = false;
      sound.unlock();
      sound.unlock();
      const singleCallWhilePending = resumeCalls === 1 && applyCalls === 0 && Boolean(sound._unlockingPromise);
      if (typeof resolveResume === "function") resolveResume();
      await Promise.resolve();
      await Promise.resolve();
      file07SoundtrackUnlockDedupOk = Boolean(singleCallWhilePending && applyCalls === 1 && sound._unlockingPromise === null);
    } finally {
      sound.applyVolumes = origApplyVol;
      sound.ctx = prevSndCtx;
      sound._unlockingPromise = prevUnlockPromise;
      sound.seqTimer = prevSeqTimer;
    }

    const origSpeak8 = voice.speak;
    const prevTarget3d = stage3d.showcaseTarget;
    try {
      let capturedAudOpts = null;
      voice.speak = function (_p, _t, _m, _cb, opts) { capturedAudOpts = opts; };
      stage3d.showcaseTarget = "2";
      el("btnShowcaseAuditionVoice").click();
      file08AuditionOptsOk = Boolean(capturedAudOpts && capturedAudOpts.seatId === 2 && typeof capturedAudOpts.personaKey === "string" && capturedAudOpts.isAudition === true);
    } finally {
      voice.speak = origSpeak8;
      stage3d.showcaseTarget = prevTarget3d;
    }

    syncSpeakerBannerVisuals(null, "主持", "", false);

    return {
      file02HudAndDoubleClickOk,
      file04VotingLockAndPauseOk,
      file05NightSeerAndDawnTimersOk,
      file06VoicePauseChunkAndTimeoutsOk,
      file07SoundtrackUnlockDedupOk,
      file08AuditionOptsOk
    };
  })()`, ctx);

  const all256 = Object.assign({
    file01CssOk,
    file03CanvasClickOk,
    file08SpotlightSourceOk,
    file09MainSwProtectionsOk,
    file10SwCacheAndZeroEmojiOk
  }, v256Runtime);
  for (const [k, v] of Object.entries(all256)) {
    if (!v) {
      throw new Error("v25.6.0 Release-Freeze regression failed for " + k + ": " + JSON.stringify(all256));
    }
  }
}

// ==================== v25.6.1 REAL-DEVICE 4-FIX REGRESSION SUITE ====================
{
  const audioEv2561 = fs.readFileSync(path.join(ROOT, "js/events/audio-events.js"), "utf8");
  const main2561 = fs.readFileSync(path.join(ROOT, "js/main.js"), "utf8");
  const html2561 = fs.readFileSync(path.join(ROOT, "ai.html"), "utf8");
  const vrm2561 = fs.readFileSync(path.join(ROOT, "js/stage3d/vrm-loader.js"), "utf8");
  const css2561 = fs.readFileSync(path.join(ROOT, "css/components.css"), "utf8");
  const css2561NoCom = css2561.replace(/\/\*[\s\S]*?\*\//g, "");
  const spot2561 = fs.readFileSync(path.join(ROOT, "js/ui/spotlight.js"), "utf8");
  const hud2561 = fs.readFileSync(path.join(ROOT, "js/ui/hud.js"), "utf8");
  const tts2561 = fs.readFileSync(path.join(ROOT, "api/tts.js"), "utf8");
  const voice2561 = fs.readFileSync(path.join(ROOT, "js/audio/voice.js"), "utf8");
  const sw2561 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const spec2561 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");

  const stripBlockMatches = Array.from(css2561NoCom.matchAll(/([^{}@;]*(?:#seatButtonStrip|#speakerTurnStrip|#playerTurnOrderStrip|\.turn-strip-row)[^{}]*)\{([^{}]*)\}/g));
  const noStripCenterJustifyOk = stripBlockMatches.every((m) => {
    const sel = m[1];
    if (/\.seat-pill-btn|\.turn-chip/.test(sel)) return true;
    return !/justify-content\s*:\s*center/i.test(m[2]);
  });

  const fix1SourceOk = Boolean(
    audioEv2561.includes('["pointerdown", "pointerup", "click", "touchend", "keydown"]') &&
    audioEv2561.includes('sound.ctx.state === "running"') &&
    html2561.includes('id="bootPreloadEnterCue"') &&
    html2561.includes("點擊入席") &&
    main2561.includes("enterGestureGate") &&
    main2561.includes("sound.unlock()")
  );

  const fix3CssAndSourceOk = Boolean(
    noStripCenterJustifyOk &&
    css2561NoCom.includes("display: grid") &&
    css2561NoCom.includes("--seat-count") &&
    css2561NoCom.includes(".turn-dir-chip") &&
    !css2561NoCom.includes("!important") &&
    !css2561NoCom.includes("backdrop-filter") &&
    !spot2561.includes("scrollIntoView") &&
    !hud2561.includes("scrollIntoView") &&
    !hud2561.includes("scrollHorizontalStripToTarget(") &&
    !/scrollHorizontalStripToTarget\([^)]*container/.test(spot2561)
  );

  const fix4SourceOk = Boolean(
    tts2561.includes("const DEFAULT_UPSTREAM_TIMEOUT_MS = 4200;") &&
    tts2561.includes("const TOTAL_BUDGET_MS = 9600;") &&
    tts2561.includes("Math.min(4200, remaining - 200)") &&
    voice2561.includes("const singleTimeoutMs = 10500;") &&
    voice2561.includes("else if (st === 503)") &&
    voice2561.includes("Date.now() + 6000") &&
    voice2561.includes("this._splitTextForCloudTts(canonicalText, 130)") &&
    sw2561.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2561.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    spec2561.length <= 5000 &&
    [audioEv2561, main2561, html2561, vrm2561, css2561, spot2561, hud2561, tts2561, voice2561, sw2561, spec2561].every(
      (txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
    )
  );

  const v2561Runtime = await vm.runInContext(`(async () => {
    // 1. Fix 1: bootPreloader auto-dismisses when AudioContext is running, else switches to tap-to-enter gate
    let fix1BootAudioGateOk = false;
    const prevIsHttp1 = bootPreloader.isBrowserHttp;
    const prevUnlock1 = sound.unlock;
    const prevCtx1 = sound.ctx;
    const prevMuted1 = sound.muted;
    const origSetTo1 = setTimeout;
    const origClearTo1 = clearTimeout;
    try {
      const timers1 = new Map();
      let seq1 = 1;
      setTimeout = function (fn, ms) {
        const id = seq1++;
        timers1.set(id, { fn, ms });
        return id;
      };
      clearTimeout = function (id) { timers1.delete(id); };

      bootPreloader.isBrowserHttp = () => true;
      sound.muted = false;

      // Case A: AudioContext already running -> auto-dismisses after 220ms
      let unlockCallsA = 0;
      sound.ctx = { state: "running" };
      sound.unlock = () => { unlockCallsA += 1; return Promise.resolve(true); };
      bootPreloader.start();
      bootPreloader.reportBucket("sky", 4, 4);
      bootPreloader.reportBucket("portraits", 1, 1);
      bootPreloader.reportBucket("hero", 1, 1);
      bootPreloader.reportBucket("avatars", 1, 1);
      const t220 = Array.from(timers1.values()).find((x) => x.ms === 220);
      if (t220) t220.fn();
      const autoDismissRunningOk = Boolean(
        unlockCallsA === 1 &&
        bootPreloader.finished === true &&
        bootPreloader.awaitingGesture === false &&
        el("bootPreloadOverlay").classList.contains("is-fading")
      );

      // Case B: AudioContext suspended (cold-start blocked) -> enters clickable gesture gate
      timers1.clear();
      let unlockCallsB = 0;
      sound.ctx = { state: "suspended" };
      sound.unlock = () => { unlockCallsB += 1; return new Promise(() => {}); };
      bootPreloader.start();
      bootPreloader.reportBucket("sky", 4, 4);
      bootPreloader.reportBucket("portraits", 1, 1);
      bootPreloader.reportBucket("hero", 1, 1);
      bootPreloader.reportBucket("avatars", 1, 1);
      const t240 = Array.from(timers1.values()).find((x) => x.ms === 240);
      if (t240) t240.fn();
      const gateEnteredOk = Boolean(
        unlockCallsB === 1 &&
        bootPreloader.finished === false &&
        bootPreloader.awaitingGesture === true &&
        el("bootPreloadOverlay").classList.contains("is-awaiting-gesture") &&
        !el("bootPreloadEnterCue").classList.contains("hidden") &&
        el("bootPreloadEnterCue").textContent === "點擊入席"
      );
      el("bootPreloadOverlay").click();
      const gateDismissOnClickOk = Boolean(
        unlockCallsB === 2 &&
        bootPreloader.finished === true &&
        bootPreloader.awaitingGesture === false &&
        el("bootPreloadEnterCue").classList.contains("hidden") &&
        el("bootPreloadOverlay").classList.contains("is-fading")
      );
      fix1BootAudioGateOk = Boolean(autoDismissRunningOk && gateEnteredOk && gateDismissOnClickOk);
    } finally {
      setTimeout = origSetTo1;
      clearTimeout = origClearTo1;
      sound.unlock = prevUnlock1;
      sound.ctx = prevCtx1;
      sound.muted = prevMuted1;
      bootPreloader.isBrowserHttp = prevIsHttp1;
      bootPreloader.finished = false;
      bootPreloader.start();
      if (el("bootPreloadOverlay")) {
        el("bootPreloadOverlay").classList.add("hidden");
        el("bootPreloadOverlay").classList.remove("is-fading");
        el("bootPreloadOverlay").classList.remove("is-awaiting-gesture");
      }
      if (el("bootPreloadEnterCue")) el("bootPreloadEnterCue").classList.add("hidden");
    }

    // 2. Fix 2: Xiaocheng 3D glasses align to leftEye/rightEye bones & fallback 0.064
    let fix2GlassesOk = false;
    {
      const head = new THREE.Group();
      const leftEye = new THREE.Group();
      const rightEye = new THREE.Group();
      let headUpdated = false;
      head.updateWorldMatrix = () => { headUpdated = true; };
      head.worldToLocal = (v) => v;
      leftEye.updateWorldMatrix = () => {};
      rightEye.updateWorldMatrix = () => {};
      leftEye.position.set(0.031, 0.066, -0.078);
      rightEye.position.set(-0.031, 0.066, -0.078);
      head.add(leftEye, rightEye);
      const resEye = stage3dVrm.attachVrmPersonaAccessories({ head, leftEye, rightEye }, "小澄", true);
      const ud = resEye && resEye.group && resEye.group.userData ? resEye.group.userData : null;
      const eyeAlignOk = Boolean(
        headUpdated && ud && ud.usedEyeBones === true &&
        Math.abs(ud.ey - 0.066) < 0.0001 &&
        Math.abs(ud.ipd - 0.062) < 0.0001 &&
        Math.abs(ud.cx - 0.031) < 0.0001 &&
        Math.abs(ud.ez - (-0.078 - 0.024)) < 0.0001 &&
        resEye.accMats.frameMat.color.c === 0x1c222b &&
        Math.abs(resEye.accMats.lensMat.opacity - 0.10) < 0.0001 &&
        resEye.accMats.lensMat.depthWrite === false &&
        Math.abs(ud.rh - 0.022) < 0.0001 &&
        Math.abs(ud.t - 0.0028) < 0.0001 &&
        Math.abs(ud.tTop - 0.0032) < 0.0001 &&
        Math.abs(ud.tBot - 0.0018) < 0.0001
      );

      // IPD clamp test + no-eye fallback test
      const headWide = new THREE.Group();
      headWide.updateWorldMatrix = () => {};
      headWide.worldToLocal = (v) => v;
      const leW = new THREE.Group();
      const reW = new THREE.Group();
      leW.position.set(0.05, 0.068, -0.076);
      reW.position.set(-0.05, 0.068, -0.076);
      headWide.add(leW, reW);
      const resWide = stage3dVrm.attachVrmPersonaAccessories({ head: headWide, leftEye: leW, rightEye: reW }, "小澄", true);
      const headFallback = new THREE.Group();
      const resFb = stage3dVrm.attachVrmPersonaAccessories({ head: headFallback }, "小澄", true);
      fix2GlassesOk = Boolean(
        eyeAlignOk &&
        resWide && Math.abs(resWide.group.userData.ipd - 0.068) < 0.0001 &&
        resFb && resFb.group.userData.usedEyeBones === false && Math.abs(resFb.group.userData.ey - 0.064) < 0.0001
      );
    }

    // 3. Fix 3: Responsive full-width CSS Grid seat strip & turn strip (zero horizontal scroll!)
    let fix3ScrollCenterOk = false;
    try {
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      state.match.phase = "DAY_SPEECH";
      state.match.dayOrder = [1, 2, 3, 4, 5, 6, 7, 8];
      state.match.speechQueue = [7, 8];
      state.activeSpeakerId = 6;
      const spStrip = el("speakerTurnStrip");
      const seatStrip = el("seatButtonStrip");
      seatStrip.classList.remove("hidden");
      state.selectedSeatId = 5;
      renderSpeakerTurnStrip();
      renderSeatStrip();
      const seatCssCount = seatStrip.style && typeof seatStrip.style.getPropertyValue === "function"
        ? seatStrip.style.getPropertyValue("--seat-count")
        : (seatStrip.style ? seatStrip.style["--seat-count"] : "");
      fix3ScrollCenterOk = Boolean(
        Array.from(spStrip.children || []).length >= 8 &&
        !spStrip.innerHTML.includes("turn-sep-dot") &&
        Array.from(seatStrip.children || []).length === 8 &&
        String(seatCssCount) === "8"
      );
    } finally {
      clearStepTimer();
      resetMatchToLobby();
    }

    // 4. Fix 4: HTTP 503 uses 6s short cooldown (403 keeps 180s) & 42-char sequential prefetch (only chunks[0])
    let fix4TtsRuntimeOk = false;
    const origFetch4 = fetch;
    const origFetchStudio4 = voice._fetchGeminiStudioAudio;
    const origIsStatic4 = voice.isStaticCloudHost;
    const origCanSpeak4 = voice.canSpeak;
    const origLookupBundled4 = voice.lookupBundledVoicePackUrl;
    const prevState4 = {
      ctx: sound.ctx,
      key: state.geminiApiKey,
      optOut: state.serverGeminiOptOut,
      cloudAvail: voice.cloudGeminiTtsAvailable,
      cooldown: voice.cloudGeminiTtsCooldownUntil,
      enginePref: voice.enginePref
    };
    try {
      sound.ctx = { sampleRate: 24000, currentTime: 0, state: "running" };
      state.geminiApiKey = "";
      state.serverGeminiOptOut = false;
      voice.enginePref = "auto";
      voice.cloudGeminiTtsAvailable = true;
      voice.isStaticCloudHost = () => true;
      voice.canSpeak = () => true;
      voice.lookupBundledVoicePackUrl = () => null;
      voice.studioCache = {};
      voice.studioPending = {};
      voice.cloudGeminiTtsCooldownUntil = 0;

      fetch = async () => ({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) });
      const before503 = Date.now();
      await voice._fetchGeminiStudioAudio(PERSONA_VOICE_PROFILES["小澄"], "小澄", "測試五零三短冷卻恢復。", "normal");
      const cd503Ms = voice.cloudGeminiTtsCooldownUntil - before503;
      const cooldown503ShortOk = cd503Ms >= 4500 && cd503Ms <= 8500;

      voice.studioCache = {};
      voice.studioPending = {};
      voice.cloudGeminiTtsCooldownUntil = 0;
      fetch = async () => ({ ok: false, status: 403, arrayBuffer: async () => new ArrayBuffer(0) });
      const before403 = Date.now();
      await voice._fetchGeminiStudioAudio(PERSONA_VOICE_PROFILES["小澄"], "小澄", "測試四零三長冷卻保護。", "normal");
      const cd403Ms = voice.cloudGeminiTtsCooldownUntil - before403;
      const cooldown403LongOk = cd403Ms >= 170000;

      voice.cloudGeminiTtsCooldownUntil = 0;
      const singleShortStr = "今天這輪討論先把警徽流和首夜查驗資訊攤開來比對，請還沒報身分的夥伴依序補充細節，不要遺漏任何公投票型矛盾。";
      const singleChunks = voice._splitTextForCloudTts(singleShortStr, 130);
      const longDualStr = "今天這輪討論先把警徽流和首夜查驗資訊攤開來比對，請還沒報身分的夥伴依序補充細節，不要遺漏任何公投票型矛盾；另外剛剛前置位7號一直把焦點往安靜座位帶，建議大家這輪聽完後置位所有人的表水與站邊方向之後，再把每一位發言者的言票紀錄跟可疑名單一個一個仔細核對清楚，最後確認立場才安心投票。";
      const chunks130 = voice._splitTextForCloudTts(longDualStr, 130);
      const prefetchedTexts = [];
      voice._fetchGeminiStudioAudio = (_prof, _k, txt) => {
        prefetchedTexts.push(txt);
        return Promise.resolve(null);
      };
      voice.prefetchCloudGeminiTts("小澄", singleShortStr, "normal");
      const singleOk = singleChunks.length === 1 && prefetchedTexts.length === 1;
      prefetchedTexts.length = 0;
      voice.prefetchCloudGeminiTts("小澄", longDualStr, "normal");
      const seqPrefetchOk = Boolean(
        singleOk &&
        chunks130.length >= 2 &&
        chunks130[0].length <= 130 &&
        prefetchedTexts.length === 2 &&
        prefetchedTexts[0] === chunks130[0] &&
        prefetchedTexts[1] === chunks130[1]
      );
      fix4TtsRuntimeOk = Boolean(cooldown503ShortOk && cooldown403LongOk && seqPrefetchOk);
    } finally {
      fetch = origFetch4;
      voice._fetchGeminiStudioAudio = origFetchStudio4;
      voice.isStaticCloudHost = origIsStatic4;
      voice.canSpeak = origCanSpeak4;
      voice.lookupBundledVoicePackUrl = origLookupBundled4;
      sound.ctx = prevState4.ctx;
      state.geminiApiKey = prevState4.key;
      state.serverGeminiOptOut = prevState4.optOut;
      voice.cloudGeminiTtsAvailable = prevState4.cloudAvail;
      voice.cloudGeminiTtsCooldownUntil = prevState4.cooldown;
      voice.enginePref = prevState4.enginePref;
      voice.studioCache = {};
      voice.studioPending = {};
    }

    return {
      fix1BootAudioGateOk,
      fix2GlassesOk,
      fix3ScrollCenterOk,
      fix4TtsRuntimeOk
    };
  })()`, ctx);

  const all2561 = Object.assign({
    fix1SourceOk,
    fix3CssAndSourceOk,
    fix4SourceOk
  }, v2561Runtime);
  for (const [k, v] of Object.entries(all2561)) {
    if (!v) {
      throw new Error("v25.6.1 Real-Device regression failed for " + k + ": " + JSON.stringify(all2561));
    }
  }
}

// ==================== v25.7.0 RELEASE REGRESSION SUITE (PART A + B + C1..C5 + D) ====================
{
  const readV2570 = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
  const main2570 = readV2570("js/main.js");
  const soundtrack2570 = readV2570("js/audio/soundtrack.js");
  const voice2570 = readV2570("js/audio/voice.js");
  const vrm2570 = readV2570("js/stage3d/vrm-loader.js");
  const css2570 = readV2570("css/components.css");
  const css2570NoCom = css2570.replace(/\/\*[\s\S]*?\*\//g, "");
  const sw2570 = readV2570("sw.js");
  const fb2570 = readV2570("js/ui/feedback.js");
  const spec2570 = readV2570("docs/作品說明書.md");
  const script2570 = readV2570("docs/三分鐘Demo影片腳本.md");
  const readme2570 = readV2570("README.md");
  const aiFiles2570 = [
    readV2570("js/ai/blind-view.js"),
    readV2570("js/ai/context.js"),
    readV2570("js/ai/deduction.js"),
    readV2570("js/ai/heuristics.js"),
    readV2570("js/ai/reactions.js"),
    readV2570("js/ai/gemini.js"),
    readV2570("js/game/voting.js"),
    readV2570("js/game/night.js")
  ];

  const partDAndSourceOk = Boolean(
    main2570.includes("safeUnlockAudio") &&
    main2570.includes("finally") &&
    soundtrack2570.includes("catch (_e)") &&
    voice2570.includes("const singleTimeoutMs = 10500;") &&
    vrm2570.includes("Math.max(0.040, Math.min(0.110") &&
    vrm2570.includes("Math.max(0.068, Math.min(0.135") &&
    css2570NoCom.includes("display: grid") &&
    css2570NoCom.includes(".turn-dir-chip") &&
    sw2570.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2570.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb2570.includes('version: "v25.9.0"') &&
    spec2570.includes("v25.9.0") &&
    spec2570.includes("10.5 秒") &&
    spec2570.includes("130 字整段預抓") &&
    spec2570.includes("sanhao-shell-v25.9.0") &&
    spec2570.includes("sanhao-assets-v25.9.0") &&
    spec2570.length <= 5000 &&
    script2570.includes("v25.9.0") &&
    readme2570.includes("v25.9.0") &&
    [main2570, soundtrack2570, voice2570, vrm2570, css2570, sw2570, fb2570, spec2570, script2570, readme2570].concat(aiFiles2570).every(
      (txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
    )
  );

  const v2570Runtime = vm.runInContext(`(() => {
    // --- PART A Runtime: throw-safe audio unlock during boot gate & extreme glasses bounds ---
    let partABootThrowSafeOk = false;
    const prevUnlockA = sound.unlock;
    const prevIsHttpA = bootPreloader.isBrowserHttp;
    try {
      bootPreloader.isBrowserHttp = () => true;
      sound.unlock = () => { throw new Error("audio blocked"); };
      bootPreloader.start();
      bootPreloader.enterGestureGate();
      el("bootPreloadOverlay").click();
      const afterOverlay = bootPreloader.finished === true && el("bootPreloadOverlay").classList.contains("is-fading");

      bootPreloader.finished = false;
      bootPreloader.awaitingGesture = false;
      bootPreloader.start();
      bootPreloader.enterGestureGate();
      if (bootPreloader._enterKeyHandler) bootPreloader._enterKeyHandler({ key: "Enter" });
      const afterKey = bootPreloader.finished === true;

      bootPreloader.finished = false;
      bootPreloader.awaitingGesture = false;
      bootPreloader.start();
      if (el("btnSkipBootPreload")) el("btnSkipBootPreload").click();
      const afterSkip = bootPreloader.finished === true;
      partABootThrowSafeOk = Boolean(afterOverlay && afterKey && afterSkip);
    } finally {
      sound.unlock = prevUnlockA;
      bootPreloader.isBrowserHttp = prevIsHttpA;
      bootPreloader.finished = false;
      bootPreloader.awaitingGesture = false;
      if (el("bootPreloadOverlay")) {
        el("bootPreloadOverlay").classList.add("hidden");
        el("bootPreloadOverlay").classList.remove("is-fading");
        el("bootPreloadOverlay").classList.remove("is-awaiting-gesture");
      }
      if (el("bootPreloadEnterCue")) el("bootPreloadEnterCue").classList.add("hidden");
    }

    let partAGlassesClampOk = false;
    {
      const mkHead = (lx, ly, lz) => {
        const h = new THREE.Group();
        const le = new THREE.Group();
        const re = new THREE.Group();
        h.updateWorldMatrix = () => {};
        h.worldToLocal = (v) => v;
        le.updateWorldMatrix = () => {};
        re.updateWorldMatrix = () => {};
        le.position.set(lx, ly, lz);
        re.position.set(-lx, ly, lz);
        h.add(le, re);
        return stage3dVrm.attachVrmPersonaAccessories({ head: h, leftEye: le, rightEye: re }, "小澄", true);
      };
      const highRes = mkHead(0.05, 0.25, -0.25);
      const lowRes = mkHead(0.01, -0.05, -0.01);
      const hiUd = highRes && highRes.group && highRes.group.userData;
      const loUd = lowRes && lowRes.group && lowRes.group.userData;
      partAGlassesClampOk = Boolean(
        hiUd && Math.abs(hiUd.ey - 0.110) < 0.0001 && Math.abs(Math.abs(hiUd.ez) - 0.135) < 0.0001 &&
        loUd && Math.abs(loUd.ey - 0.040) < 0.0001 && Math.abs(Math.abs(loUd.ez) - 0.068) < 0.0001
      );
    }

    // --- PART B Runtime: difficulty-tiered jargon control & judgeShowcase override ---
    let partBJargonOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      const sampleTxt = "我在警上聽到 3號 報查殺又給 4號 鐵金水，感覺他在深水倒鉤墊飛反水立警外置位抗推想抿刀口。";
      state.aiDifficulty = "pro";
      state.match.aiDifficulty = "pro";
      state.match.judgeShowcase = true;
      const showcaseSnap = createBlindMatchSnapshot(state.match.seats[0], { module: "test" });
      const resolvedShowcase = resolveActiveJargonDifficulty(showcaseSnap);
      const showcaseOut = applyDifficultyTerminology(sampleTxt, null, showcaseSnap);

      state.match.judgeShowcase = false;
      state.aiDifficulty = "easy";
      state.match.aiDifficulty = "easy";
      const easySnap = createBlindMatchSnapshot(state.match.seats[0], { module: "test" });
      const easyOut = applyDifficultyTerminology(sampleTxt, null, easySnap);

      state.aiDifficulty = "normal";
      state.match.aiDifficulty = "normal";
      const normalOut = applyDifficultyTerminology(sampleTxt, null, createBlindMatchSnapshot(state.match.seats[0], { module: "test" }));

      state.aiDifficulty = "pro";
      state.match.aiDifficulty = "pro";
      const proSnap = createBlindMatchSnapshot(state.match.seats[0], { module: "test" });
      const proOut = applyDifficultyTerminology(sampleTxt, null, proSnap);

      const bannedHardcore = /(?:倒鉤|墊飛|反水立警|外置位抗推|抿刀口)/;
      const bannedEasy = /(?:倒鉤|墊飛|反水立警|外置位抗推|抿刀口|查殺|金水|銀水|狼坑|警徽流|警上|退水|抗推|站邊)/;
      state.aiDifficulty = "easy";
      state.match.aiDifficulty = "easy";
      state.match.judgeShowcase = false;
      const promptEasy = buildBlindGeminiSpeechPrompt(state.match.seats[1], { text: "測試", wolfPits: [], goodPits: [] });
      state.aiDifficulty = "pro";
      state.match.aiDifficulty = "pro";
      state.match.judgeShowcase = true;
      const promptShowcase = buildBlindGeminiSpeechPrompt(state.match.seats[1], { text: "測試", wolfPits: [], goodPits: [] });
      const miniShowcase = _validateMiniLiveText("這輪我站隊友邊反對他深水倒鉤墊飛的打法，一定要守住好人節奏別被帶跑。", showcaseSnap.self, { snap: showcaseSnap, minLen: 10, maxLen: 120 });

      partBJargonOk = Boolean(
        resolvedShowcase === "easy" &&
        !bannedEasy.test(easyOut) &&
        !bannedHardcore.test(normalOut) && normalOut.includes("金水") &&
        !bannedEasy.test(showcaseOut) &&
        proOut.includes("深水倒鉤") && proOut.includes("抿刀口") &&
        promptEasy && promptEasy.prompt && promptEasy.prompt.includes("新手友善局") && promptEasy.prompt.includes("全面禁止使用金水") &&
        promptShowcase && promptShowcase.prompt && promptShowcase.prompt.includes("新手友善局") && !promptShowcase.prompt.includes("凹嗚高手局") &&
        miniShowcase && !bannedEasy.test(miniShowcase)
      );
      state.match.judgeShowcase = false;
      state.aiDifficulty = "normal";
    }

    // --- PART C Runtime (C1..C5): Full Zero-Leak Deduction Loop ---
    const resetSeatsForUnit = () => {
      state.match.playerSeatId = 1;
      state.match.matchStyleSeed = 2026;
      state.match.isMatchPoint = false;
      state.match.pkActive = false;
      state.match.pkCandidates = [];
      state.match.lastNightDeaths = [];
      state.match.publicVoteHistory = [];
      state.match.seats.forEach((s, idx) => {
        s.isPlayer = (s.id === 1);
        s.name = s.id === 1
          ? "你"
          : (typeof AI_PERSONAS !== "undefined" && AI_PERSONAS[(idx - 1) % AI_PERSONAS.length]
            ? AI_PERSONAS[(idx - 1) % AI_PERSONAS.length].name
            : ("席" + s.id));
        s.isElder = false;
        s.isWolfKing = false;
        s.fakeSeer = false;
        s.fakeCheckedIds = [];
        s.hadToxicSlip = false;
        s.contradictions = [];
        s.trustMap = {};
        s.fogSealed = false;
        s.suspicionMap = {};
        s.publicVoteIntent = null;
        s.publicVouchId = null;
        s.checkedHistory = [];
        s.savedSeatId = null;
        s.witchAnnouncedSave = false;
        s.hunterAnnounced = false;
        s.guardAnnounced = false;
        s.elderAnnounced = false;
        s.claimedRole = null;
        s.voteDisabled = false;
        s.alive = true;
        s.role = "villager";
        s.team = "good";
      });
      state.match.sheriffSeatId = null;
      state.match.convenienceRallyTargetId = null;
      state.match.fourGJoySuspects = [];
      state.match.fourGHopePair = [];
    };

    let partC1DeadWolvesOk = false;
    {
      // C1a: alive witch clash WITHOUT hard proof must NOT subtract dead wolves!
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      resetSeatsForUnit();
      state.aiDifficulty = "pro";
      state.match.day = 2;
      state.match.phase = "DAY_SPEECH";
      state.match.seats[1].claimedRole = "witch";
      state.match.seats[2].claimedRole = "witch";
      state.match.daySpeechEvents = [
        { speakerId: 2, claimRole: "witch", text: "我是奉茶師", accuseId: 3, vouchId: null },
        { speakerId: 3, claimRole: "witch", text: "我才是奉茶師", accuseId: 2, vouchId: null }
      ];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const vSeat = state.match.seats[3];
      vSeat.role = "villager";
      vSeat.team = "good";
      const snapNoKill = createBlindMatchSnapshot(vSeat, { module: "test" });
      const slotNoKill = buildTableSlotAndWorldAnalysis(vSeat, snapNoKill);

      // C1b: public self-exploded wolf counts even in fog_seal, hidden dead wolf does NOT leak in fog_seal
      state.match.variantMode = "fog_seal";
      state.match.seats[4].alive = false;
      state.match.seats[4].claimedRole = "wolf";
      state.match.seats[4].fogSealed = true;
      state.match.seats[5].alive = false;
      state.match.seats[5].role = "wolf";
      state.match.seats[5].team = "wolf";
      state.match.seats[5].claimedRole = null;
      state.match.seats[5].fogSealed = true;
      const snapFog = createBlindMatchSnapshot(vSeat, { module: "test" });
      const slotFog = buildTableSlotAndWorldAnalysis(vSeat, snapFog);
      partC1DeadWolvesOk = Boolean(
        slotNoKill && slotNoKill.aliveWolfSlots === 2 &&
        slotFog && slotFog.aliveWolfSlots === 1
      );
      state.match.variantMode = "standard";
    }

    let partC2ExpandPitsOk = false;
    {
      resetMatchToLobby();
      el("selectModeCount").value = "12";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      resetSeatsForUnit();
      state.aiDifficulty = "pro";
      state.match.day = 2;
      state.match.phase = "DAY_SPEECH";
      state.match.seats.forEach((s) => { s.role = "villager"; s.team = "good"; s.alive = true; });
      const s2 = state.match.seats[1]; // 2号 seer A
      const s3 = state.match.seats[2]; // 3号 seer B (fake)
      s2.claimedRole = "seer";
      s3.claimedRole = "seer";
      state.match.dayOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1];
      state.match.daySpeechEvents = [
        { speakerId: 2, claimRole: "seer", checkedWolfId: 4, text: "2號跳觀察員查殺 4號" },
        { speakerId: 3, claimRole: "seer", checkedWolfId: 5, text: "3號也跳觀察員查殺 5號", hasToxicSlip: true },
        { speakerId: 6, text: "我胡亂說兩句", accuseId: 2, hasToxicSlip: true },
        { speakerId: 7, text: "我也跟著起鬨", accuseId: 2, hasToxicSlip: true }
      ];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const sp8 = state.match.seats[7];
      sp8.role = "villager";
      sp8.team = "good";
      sp8.suspicionMap[3] = 85;
      sp8.suspicionMap[5] = 75;
      sp8.suspicionMap[6] = 72;
      sp8.suspicionMap[7] = 70;
      const snap12 = createBlindMatchSnapshot(sp8, { module: "test" });
      const slot12 = buildTableSlotAndWorldAnalysis(sp8, snap12);
      state.match.speechQueue = [9, 10, 11, 12, 1];
      const sp12Res = buildHeuristicAiSpeech(sp8);
      partC2ExpandPitsOk = Boolean(
        slot12 && slot12.aliveWolfSlots === 4 &&
        slot12.dualSeerWorlds && slot12.dualSeerWorlds.chosenWorld &&
        slot12.dualSeerWorlds.chosenWorld.wolfPits.length >= 3 &&
        sp12Res && Array.isArray(sp12Res.wolfPits) && sp12Res.wolfPits.length >= 3
      );
    }

    let partC3SurvivingSeerOk = false;
    {
      // Scenario (b): both Seers still alive at Day 3+ -> anomalies & boost
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      resetSeatsForUnit();
      state.aiDifficulty = "pro";
      state.match.day = 3;
      state.match.phase = "DAY_SPEECH";
      state.match.seats.forEach((s) => { s.role = "villager"; s.team = "good"; s.alive = true; s.claimedRole = null; });
      state.match.seats[1].claimedRole = "seer";
      state.match.seats[2].claimedRole = "seer";
      state.match.allSpeechEvents = [
        { speakerId: 2, claimRole: "seer", day: 1, text: "2號觀察員" },
        { speakerId: 3, claimRole: "seer", day: 1, text: "3號觀察員" }
      ];
      const observerC3 = state.match.seats[3];
      const slotB = buildTableSlotAndWorldAnalysis(observerC3, createBlindMatchSnapshot(observerC3, { module: "test" }));
      // Scenario (c): solo uncontested Seer alive past protection limit at Day 4 with no save/guard evidence
      state.match.seats[2].claimedRole = null;
      state.match.day = 4;
      state.match.allSpeechEvents = [
        { speakerId: 2, claimRole: "seer", day: 1, text: "2號觀察員" }
      ];
      const slotC = buildTableSlotAndWorldAnalysis(observerC3, createBlindMatchSnapshot(observerC3, { module: "test" }));
      partC3SurvivingSeerOk = Boolean(
        slotB && slotB.survivingSeerAnomalies.length >= 1 && slotB.survivingSeerSummary &&
        slotC && slotC.survivingSeerAnomalies.some((a) => a.kind === "uncontested_long_survivor") &&
        (slotC.survivingSeerSuspicionBoost[2] || 0) > 0
      );
    }

    let partC4SoleGodAndAlangOk = false;
    {
      resetMatchToLobby();
      el("selectModeCount").value = "10";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      resetSeatsForUnit();
      state.aiDifficulty = "pro";
      state.match.day = 2;
      state.match.phase = "DAY_SPEECH";
      state.match.seats.forEach((s) => { s.role = "villager"; s.team = "good"; s.alive = true; s.claimedRole = null; s.voteDisabled = false; });
      // Sole Elder (3) & Sole Witch (4) calling out 7; Alang (5) must NOT throw 4 into wolfPits!
      state.match.seats[2].role = "elder"; state.match.seats[2].claimedRole = "elder";
      state.match.seats[3].role = "witch"; state.match.seats[3].claimedRole = "witch";
      const alangSeat = state.match.seats[4];
      state.match.seats.forEach((s) => { if (s.id !== alangSeat.id && s.name === "阿朗") s.name = "晨晨"; });
      alangSeat.name = "阿朗";
      alangSeat.role = "villager"; alangSeat.team = "good";
      const sus7 = state.match.seats[6];
      sus7.id = 7;
      alangSeat.suspicionMap[4] = 35;
      alangSeat.suspicionMap[7] = 75;
      state.match.dayOrder = state.match.seats.map((s) => s.id);
      state.match.daySpeechEvents = [
        { speakerId: 3, claimRole: "elder", text: "3號長老過" },
        { speakerId: 4, claimRole: "witch", accuseId: 7, text: "4號奉茶師點推 7號" },
        { speakerId: 7, text: "7號表水普通", accuseId: 1 }
      ];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      state.match.speechQueue = [alangSeat.id, 8, 9, 10];

      const snapAlang = createBlindMatchSnapshot(alangSeat, { module: "test" });
      const slotAlang = buildTableSlotAndWorldAnalysis(alangSeat, snapAlang);
      const alangSpeech = buildHeuristicAiSpeech(alangSeat);

      // Post-death impersonation check (v25.8.0 Bug 4): hard-proven dead elder flags alive elder jumper; unflipped dead witch does NOT!
      state.match.seats[1].alive = false;
      state.match.seats[1].role = "witch";
      state.match.seats[1].claimedRole = "witch";
      state.match.seats[7].claimedRole = "witch";
      state.match.allSpeechEvents.push({ speakerId: 2, claimRole: "witch", day: 1, text: "2號真奉茶師" });
      state.match.daySpeechEvents.push({ speakerId: 8, claimRole: "witch", text: "8號接任奉茶師" });
      state.match.seats[3].claimedRole = null;
      const contraRes = detectSpeechContradictions(state.match.seats[7], { speakerId: 8, claimRole: "witch", text: "8號接任奉茶師" });
      state.match.seats[4].alive = false;
      state.match.seats[4].voteDisabled = true;
      state.match.seats[4].claimedRole = "elder";
      state.match.seats[6].alive = true;
      state.match.seats[6].voteDisabled = false;
      state.match.seats[6].claimedRole = "elder";
      state.match.allSpeechEvents.push({ speakerId: 5, claimRole: "elder", day: 1, text: "5號清心長老" });
      state.match.daySpeechEvents.push({ speakerId: 7, claimRole: "elder", text: "7號清心長老" });
      const slotImpersonate = buildTableSlotAndWorldAnalysis(alangSeat, createBlindMatchSnapshot(alangSeat, { module: "test" }));

      // Sole-god vote rally (+34) + lowGodCountWarning quiet seat protection (-12)
      state.match.hasGuardMode = false;
      state.match.seats[1].alive = true;
      state.match.seats[1].claimedRole = "seer"; state.match.seats[1].alive = false;
      state.match.seats[2].claimedRole = "hunter"; state.match.seats[2].alive = false;
      state.match.seats[3].claimedRole = "witch"; state.match.seats[3].alive = true;
      state.match.seats[7].claimedRole = null;
      state.match.allSpeechEvents = [
        { speakerId: 2, claimRole: "seer", day: 1, text: "2號觀察員" },
        { speakerId: 3, claimRole: "hunter", day: 1, text: "3號糾察長" },
        { speakerId: 4, claimRole: "witch", accuseId: 7, day: 2, text: "4號奉茶師推 7號" }
      ];
      state.match.daySpeechEvents = [state.match.allSpeechEvents[2]];
      const quiet9 = state.match.seats[8];
      quiet9.publicVoteIntent = null;
      const alangVoteTgt = chooseAiVoteTarget(alangSeat, { pkActive: false });
      const slotLowGod = buildTableSlotAndWorldAnalysis(alangSeat, createBlindMatchSnapshot(alangSeat, { module: "test" }));

      // Hunter deterrence heat >= 54 skips "brief"
      const hSeat = state.match.seats[5];
      hSeat.role = "hunter"; hSeat.team = "good"; hSeat.alive = true;
      state.match.daySpeechEvents.push({ speakerId: 9, accuseId: hSeat.id, text: "9號推6號" });
      state.match.daySpeechEvents.push({ speakerId: 10, accuseId: hSeat.id, text: "10號也推6號" });
      const ctxH = buildSpeechContext(hSeat);
      const tierH = determineSpeechLengthTier(hSeat, ctxH);

      partC4SoleGodAndAlangOk = Boolean(
        slotAlang && slotAlang.soleGodMap[3] && slotAlang.soleGodMap[4] &&
        alangSpeech && alangSpeech.wolfPits.indexOf(4) === -1 && alangSpeech.vouchId === 4 && alangSpeech.accuseId === 7 &&
        contraRes && contraRes.code === "role_clash" && contraRes.detail.includes("已離席") &&
        slotImpersonate && !slotImpersonate.deadGodImpersonators[8] && slotImpersonate.deadGodImpersonators[7] === "elder" &&
        slotLowGod && slotLowGod.lowGodCountWarning === true &&
        alangVoteTgt === 7 &&
        tierH !== "brief"
      );
    }

    let partC5ActionsOk = false;
    {
      // C5a: Day 3+ Witch savedSeatId unlock + Poison & Hunter shot guard against soleGod/trustedGold
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      resetSeatsForUnit();
      state.aiDifficulty = "pro";
      state.match.seats.forEach((s) => { s.role = "villager"; s.team = "good"; s.alive = true; s.claimedRole = null; s.voteDisabled = false; });
      const aiW = state.match.seats[1];
      aiW.role = "witch"; aiW.team = "good"; aiW.savedSeatId = 4; aiW.potions = { heal: false, purify: true };
      const soleG5 = state.match.seats[4]; soleG5.role = "guard"; soleG5.claimedRole = "guard";
      const bad8 = state.match.seats[7];
      aiW.suspicionMap[4] = 95;
      aiW.suspicionMap[5] = 88; // high suspicion, but protected as soleGuard (-65 => 23!)
      aiW.suspicionMap[8] = 74; // above threshold & uncontested
      state.match.day = 3;
      state.match.phase = "DAY_VOTE";
      state.match.daySpeechEvents = [{ speakerId: 5, claimRole: "guard", text: "5號護心守衛" }];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const voteUnlockDay3 = chooseAiVoteTarget(aiW, { pkActive: false });
      aiW.suspicionMap[4] = 30;
      state.match.phase = "NIGHT_WITCH";
      const wAct = chooseAiWitchNightAction(aiW, null, 0.9);
      const hunterShooter = state.match.seats[6];
      hunterShooter.role = "hunter"; hunterShooter.team = "good";
      hunterShooter.suspicionMap[5] = 88; // protected soleGuard (-65)
      hunterShooter.suspicionMap[8] = 74;
      const hunterAvoidSoleGod = chooseAiHunterTarget(hunterShooter);

      // C5b: Guard protects exposedSoloHunter
      const aiG = state.match.seats[2];
      aiG.role = "guard"; aiG.team = "good";
      state.match.seats[5].role = "hunter"; state.match.seats[5].claimedRole = "hunter";
      aiG.suspicionMap[6] = 42;
      state.match.phase = "NIGHT_GUARD";
      const gTgt = chooseAiGuardTarget(aiG, 0.9);

      // C5c: Front-seat publicVoteIntent weight 54 vs 34 on late pivot
      state.match.seats[4].claimedRole = null;
      state.match.seats[5].claimedRole = null;
      const aiV4 = state.match.seats[3];
      aiV4.role = "villager"; aiV4.team = "good";
      aiV4.suspicionMap = {};
      aiV4.publicVoteIntent = 6;
      aiV4.suspicionMap[6] = 52;
      aiV4.suspicionMap[8] = 74; // 52+54=106 > 74 => sticks to 6!
      state.match.phase = "DAY_VOTE";
      state.match.daySpeechEvents = [{ speakerId: 4, accuseId: 6, text: "4號推6號" }];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const frontStick = chooseAiVoteTarget(aiV4, { pkActive: false });
      aiV4.suspicionMap[8] = 92; // late pivot drops intent weight to 34 (52+34=86 < 92) => switches!
      state.match.daySpeechEvents.push({ speakerId: 8, text: "別吵亂帶風向", hasToxicSlip: true });
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const frontPivot = chooseAiVoteTarget(aiV4, { pkActive: false });

      // C5d: True Seer Sheriff transfer: soleGod when no gold; tear when only checked wolf
      state.match.seats[4].role = "guard"; state.match.seats[4].claimedRole = "guard";
      const aiS = state.match.seats[6];
      aiS.role = "seer"; aiS.team = "good"; aiS.alive = false;
      aiS.checkedHistory = [{ targetId: 8, isWolf: true, day: 1 }];
      state.match.sheriffSeatId = aiS.id;
      state.match.sheriffBadgeFlowsBySeat = {};
      state.match.daySpeechEvents = [{ speakerId: 5, claimRole: "guard", text: "5號護心守衛" }];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const xferSoleGod = chooseAiSheriffTransferTarget(aiS);
      state.match.seats[4].claimedRole = null;
      state.match.seats[5].claimedRole = null;
      state.match.daySpeechEvents = [];
      state.match.allSpeechEvents = [];
      const xferTearWolfCheck = chooseAiSheriffTransferTarget(aiS);

      partC5ActionsOk = Boolean(
        voteUnlockDay3 === 4 &&
        wAct && wAct.poisonTargetId === 8 &&
        hunterAvoidSoleGod === 8 &&
        gTgt === 6 &&
        frontStick === 6 && frontPivot === 8 &&
        xferSoleGod === 5 && xferTearWolfCheck === null
      );
    }

    return {
      partABootThrowSafeOk,
      partAGlassesClampOk,
      partBJargonOk,
      partC1DeadWolvesOk,
      partC2ExpandPitsOk,
      partC3SurvivingSeerOk,
      partC4SoleGodAndAlangOk,
      partC5ActionsOk
    };
  })()`, ctx);

  const all2570 = Object.assign({ partDAndSourceOk }, v2570Runtime);
  for (const [k, v] of Object.entries(all2570)) {
    if (!v) {
      throw new Error("v25.7.0 Release regression failed for " + k + ": " + JSON.stringify(all2570));
    }
  }
}

// ==================== v25.7.1 RELEASE REGRESSION SUITE (TTS PURE/120/POLYPHONE + +2 PREFETCH + SEER GUARD + CI HARDENING) ====================
{
  const readV2571 = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
  const apiTts2571 = (await import("../api/tts.js")).default;
  const ttsFile2571 = readV2571("api/tts.js");
  const srvFile2571 = readV2571("server.py");
  const voiceFile2571 = readV2571("js/audio/voice.js");
  const daySpeech2571 = readV2571("js/game/day-speech.js");
  const pSpeech2571 = readV2571("js/game/player-speech.js");
  const votingFile2571 = readV2571("js/game/voting.js");
  const sw2571 = readV2571("sw.js");
  const fb2571 = readV2571("js/ui/feedback.js");
  const spec2571 = readV2571("docs/作品說明書.md");
  const script2571 = readV2571("docs/三分鐘Demo影片腳本.md");
  const readme2571 = readV2571("README.md");

  const ttsBody2571 = apiTts2571._buildTtsRequestBody(
    "gemini-3.8-flash-lite-tts",
    "各位好夥伴，請看三號。<breath> 慢慢想。",
    "Aoede",
    false
  );
  const v2571PureApiAndFilesOk = Boolean(
    ttsBody2571 &&
    ttsBody2571.contents && ttsBody2571.contents[0] &&
    ttsBody2571.contents[0].parts && ttsBody2571.contents[0].parts[0] &&
    ttsBody2571.contents[0].parts[0].text === "各位好夥伴，請看三號。 慢慢想。" &&
    !ttsBody2571.contents[0].parts[0].speechMetadata &&
    !ttsFile2571.includes("請用以下口吻自然唸出") &&
    !srvFile2571.includes("請用以下口吻自然朗讀") &&
    !voiceFile2571.includes("請用以下口吻自然唸出") &&
    !pSpeech2571.includes("進定狼坑") &&
    !votingFile2571.includes("標進定狼坑") &&
    !daySpeech2571.includes("setTimeout(runStaggeredPrefetch, 60)") &&
    sw2571.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2571.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb2571.includes('version: "v25.9.0"') &&
    readme2571.includes("v25.9.0") &&
    spec2571.includes("v25.9.0") &&
    spec2571.includes("130 字整段預抓") &&
    spec2571.length <= 5000 &&
    script2571.includes("v25.9.0") &&
    [ttsFile2571, srvFile2571, voiceFile2571, daySpeech2571, pSpeech2571, votingFile2571, sw2571, fb2571, spec2571, script2571, readme2571].every(
      (txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
    )
  );

  const v2571Runtime = vm.runInContext(`(async () => {
    // 1. Pure TTS payload (empty style, zero PERSONA_TTS_DIRECTIONS leak), 120-char single chunk, >120-char parallel split & detune kept
    let v2571PureTtsAnd120Ok = false;
    {
      const pl = voice._buildGeminiTtsPayload(PERSONA_VOICE_PROFILES["你"], "你", "今晚我們先整理昨天的線索。", "panic");
      const origFetch1 = fetch;
      const origIsStatic1 = voice.isStaticCloudHost;
      const origDecode1 = voice.decodeGeminiAudioBytes;
      const origPlayBuf1 = voice.playBufferedStudioAudio;
      const prevKey1 = state.geminiApiKey;
      const prevOptOut1 = state.serverGeminiOptOut;
      const prevEnginePref1 = voice.enginePref;
      const prevCloud1 = voice.cloudGeminiTtsAvailable;
      const prevCd429_1 = voice._cloudTtsCooldownIs429;
      const prevCtx1 = sound.ctx;
      const sentBodies = [];
      let playDetuneSkipped = null;
      try {
        sound.ctx = { sampleRate: 24000, currentTime: 0 };
        state.geminiApiKey = "";
        state.serverGeminiOptOut = false;
        voice.enginePref = "auto";
        voice.isStaticCloudHost = () => true;
        voice.cloudGeminiTtsAvailable = true;
        voice.cloudGeminiTtsCooldownUntil = 0;
        voice._cloudTtsCooldownIs429 = false;
        voice.studioCache = {};
        voice.studioPending = {};
        voice.decodeGeminiAudioBytes = async () => ({ duration: 1.2 });
        voice.playBufferedStudioAudio = (_seq, _buf, _done, opts) => {
          playDetuneSkipped = Boolean(opts && opts.skipDetune);
          return true;
        };
        fetch = async (_u, init) => {
          sentBodies.push(JSON.parse(init.body));
          return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(256).buffer };
        };
        const text95 = "今天討論先聽前排幾位同學各自發言，再逐一對比昨晚的關鍵行動與前日投票紀錄，如果兩邊都還沒有出現明顯矛盾，我們先把資源留給關鍵位置再表態決定投給誰，避免第一天就盲目錯殺關鍵好人。";
        await voice.playGeminiStudioTts(voice.utteranceSeq, PERSONA_VOICE_PROFILES["你"], text95, "normal", () => {}, { personaKey: "你" });
        const text145 = "這輪大家先把前排所有人的立場順序對清楚，如果對跳雙方都還沒拿出足夠具體的時間線與投票根據，我們可以先保留票型並把資源留到後面關鍵回合再做最後定奪；同時也要回頭核對昨晚誰有避重就輕或刻意模糊焦點的情況，千萬別在資訊不足的時候急著把重要身分送出場，請後面幾位務必把理由講明白。";
        voice.prefetchCloudGeminiTts("你", text145, "normal");
        await Promise.all(Object.values(voice.studioPending));
        await Promise.resolve();
        v2571PureTtsAnd120Ok = Boolean(
          pl && pl.stylePrompt === "" &&
          text95.length > 42 && text95.length <= 130 &&
          text145.length > 130 &&
          sentBodies.length >= 2 &&
          sentBodies.every((b) => b && b.style === "" && !b.text.includes("二十歲出頭") && !b.text.includes("請用以下口吻")) &&
          playDetuneSkipped === false
        );
      } finally {
        fetch = origFetch1;
        voice.isStaticCloudHost = origIsStatic1;
        voice.decodeGeminiAudioBytes = origDecode1;
        voice.playBufferedStudioAudio = origPlayBuf1;
        state.geminiApiKey = prevKey1;
        state.serverGeminiOptOut = prevOptOut1;
        voice.enginePref = prevEnginePref1;
        voice.cloudGeminiTtsAvailable = prevCloud1;
        voice._cloudTtsCooldownIs429 = prevCd429_1;
        sound.ctx = prevCtx1;
        voice.studioCache = {};
        voice.studioPending = {};
      }
    }

    // 2. Polyphone pronunciation mapping + bundled voice pack cache hit retention (v25.8.0 keeps 警長/社長 intact)
    let v2571PolyphoneAndPackOk = false;
    {
      const polyOut = voice.formatMandarinText("直心糾察長、糾察長、警長、清心長老、長老、社長、學長");
      const hostFmt = voice.formatMandarinText("警上輪流發言結束！請警下夥伴投票選出本局警長！");
      const xingFmt = voice.formatMandarinText("我是直心糾察長，昨天7號喊打我卻改票衝6號，跟4號完全綁在一起。先聽4號怎麼圓，等下看1號警長壓軸定調。");
      v2571PolyphoneAndPackOk = Boolean(
        polyOut === "直心糾察掌、糾察掌、警長、清心長老、長老、社長、學長" &&
        voice.lookupBundledVoicePackUrl("主持", hostFmt) === "assets/voice_pack/host_sheriff_vote.mp3" &&
        voice.lookupBundledVoicePackUrl("星兒", xingFmt) === "assets/voice_pack/showcase/showcase_xinger_d2.mp3"
      );
    }

    // 3. onAudioStart-driven +1 -> chained +2 prefetch & bumpTableStateRev invalidation
    let v2571DualPrefetchOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.playerSeatId = 1;
      state.match.matchStyleSeed = 2026;
      state.match.dayOrder = [5, 2, 3, 4, 6, 7, 8, 1];
      state.match.seats.forEach((s) => {
        s.isElder = false; s.isWolfKing = false; s.fakeSeer = false; s.role = "villager"; s.team = "good";
        s.isPlayer = (s.id === 1);
        s.alive = true; s.claimedRole = null; s.suspicionMap = {};
      });
      state.match.phase = "DAY_SPEECH";
      state.match.day = 2;
      state.match.daySpeechEvents = [];
      state.match.allSpeechEvents = [];
      state.match.speechQueue = [2, 3, 4];
      state.activeSpeakerId = 5;
      const origLocalAvailP = voice.localNeuralAvailable;
      const origCanSpeakP = voice.canSpeak;
      const origPfTtsP = voice.prefetchBestTts;
      const prevKeyP = state.geminiApiKey;
      const prevOptOutP = state.serverGeminiOptOut;
      const prevLocalLlmP = state.localLlmModel;
      const pfTtsCalls = [];
      try {
        state.geminiApiKey = "";
        state.serverGeminiOptOut = true;
        state.localLlmModel = "";
        voice.localNeuralAvailable = true;
        voice.canSpeak = () => true;
        voice.prefetchBestTts = (nm, txt) => { pfTtsCalls.push({ nm, txt }); return true; };
        const onAudioStartHook = scheduleStaggeredNextSpeechPrefetch(orchestrator.matchEpoch, state._speechTurnSeq);
        const beforeHookEmpty = !state.match._prefetchedSpeeches || Object.keys(state.match._prefetchedSpeeches).length === 0;
        if (typeof onAudioStartHook === "function") onAudioStartHook();
        await Promise.resolve();
        await Promise.resolve();
        const pf1 = state.match._prefetchedSpeeches && state.match._prefetchedSpeeches[2];
        const pf2 = state.match._prefetchedSpeeches && state.match._prefetchedSpeeches[3];
        const bothCachedOk = Boolean(
          beforeHookEmpty &&
          typeof onAudioStartHook === "function" &&
          pf1 && pf1.resolvedMeta && pf1.resolvedMeta.text &&
          pf2 && pf2.resolvedMeta && pf2.resolvedMeta.text &&
          pf2.key === _buildSpeechPrefetchKey(3, { evLen: state.match.daySpeechEvents.length + 1 }) &&
          pfTtsCalls.length >= 2
        );
        bumpTableStateRev(false);
        const purgedBothOk = state.match._prefetchedSpeech === null &&
          (!state.match._prefetchedSpeeches || Object.keys(state.match._prefetchedSpeeches).length === 0);
        v2571DualPrefetchOk = Boolean(bothCachedOk && purgedBothOk);
      } finally {
        voice.localNeuralAvailable = origLocalAvailP;
        voice.canSpeak = origCanSpeakP;
        voice.prefetchBestTts = origPfTtsP;
        state.geminiApiKey = prevKeyP;
        state.serverGeminiOptOut = prevOptOutP;
        state.localLlmModel = prevLocalLlmP;
      }
    }

    // 4. Seer single-sided clash guards, unbroken capsule tokenization, and phrase-level terminology
    let v2571SeerCapsuleRegexOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.seats.forEach((s) => {
        s.isElder = false; s.isWolfKing = false; s.fakeSeer = false; s.role = "villager"; s.team = "good";
        s.alive = true; s.claimedRole = null; s.suspicionMap = {};
      });
      state.aiDifficulty = "pro";
      state.match.day = 2;
      state.match.phase = "DAY_SPEECH";
      const trueSeer = state.match.seats[1]; // id 2
      const fakeWolf = state.match.seats[2]; // id 3
      const allyWolf = state.match.seats[3]; // id 4
      trueSeer.role = "seer"; trueSeer.team = "good"; trueSeer.claimedRole = "seer";
      trueSeer.checkedHistory = [{ targetId: 5, isWolf: false, day: 1 }];
      fakeWolf.role = "wolf"; fakeWolf.team = "wolf"; fakeWolf.fakeSeer = true; fakeWolf.claimedRole = "seer";
      allyWolf.role = "wolf"; allyWolf.team = "wolf";
      state.match.dayOrder = [2, 3, 5, 6, 7, 8, 1, 4];
      state.match.speechQueue = [5, 6, 7, 8, 1, 4];
      state.match.daySpeechEvents = [
        { speakerId: 2, claimRole: "seer", checkedWolfId: 3, checkedGoodId: 5, text: "2號真觀察員查殺 3號" }
      ];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();
      const fakeRebut = buildHeuristicAiSpeech(fakeWolf);
      const trueSeerSpeech = buildHeuristicAiSpeech(trueSeer);
      const fakeSeerPrompt = buildBlindGeminiSpeechPrompt(fakeWolf, fakeRebut);
      const rejectTwoSided = validateGeminiSpeechReality(
        trueSeer,
        { claimSeer: true, checkedWolfId: 3 },
        { text: "如果站你那邊狼坑是我，站我這邊才是你，兩邊盤完我站邊自己並請離 3號。", accuseId: 3, vouchId: 5, wolfPits: [3], goodPits: [5] },
        createBlindMatchSnapshot(trueSeer, { module: "test" })
      );
      const rejectPackPit = validateGeminiSpeechReality(
        fakeWolf,
        { claimSeer: true, claimRole: "seer", checkedWolfId: 2 },
        { text: "我才是觀察員，昨晚查出 2號 就是冒牌酸民狼，大家直接投 2號！", accuseId: 2, vouchId: null, wolfPits: [2, 4], goodPits: [] },
        createBlindMatchSnapshot(fakeWolf, { module: "test" })
      );

      // Unbroken capsule check
      renderInteractiveSpotlightText("前置位 4號 跳假觀察員，直接定進狼坑！", fakeWolf, false);
      const spotHtml = el("spotlightText") ? el("spotlightText").innerHTML : "";
      const unbrokenCapsuleOk = spotHtml.includes("跳假觀察員") && !spotHtml.includes("跳假 <span");

      // Phrase-level easy terminology check
      const easyRaw = "2號 發 3號 金水，還 給 4號 鐵金水，順便 查殺 5號 並 歸票 6號，7號 悍跳明心觀察員，結果 8號 被抗推 直接進定狼坑。";
      const easyConv = applyDifficultyTerminology(easyRaw, "easy", null);
      const phraseOk = Boolean(
        !easyConv.includes("發 3號 查過是好人") &&
        !easyConv.includes("建議大家集中投誰 6號") &&
        !easyConv.includes("被被誤會") &&
        easyConv.includes("查驗 3號 是好人") &&
        easyConv.includes("查出 5號 在說謊") &&
        easyConv.includes("建議大家集中投 6號") &&
        easyConv.includes("假冒明心觀察員") &&
        easyConv.includes("被誤會投出局") &&
        easyConv.includes("直接列進可疑名單")
      );

      const twoSidedRe = /如果站|站你那邊|兩邊盤完我站邊/;
      v2571SeerCapsuleRegexOk = Boolean(
        fakeRebut && fakeRebut.claimSeer === true && !twoSidedRe.test(fakeRebut.text) &&
        fakeRebut.wolfPits.indexOf(fakeWolf.id) === -1 && fakeRebut.wolfPits.indexOf(allyWolf.id) === -1 &&
        trueSeerSpeech && !twoSidedRe.test(trueSeerSpeech.text) && !trueSeerSpeech.text.includes("站我這邊第一個狼坑") &&
        fakeSeerPrompt && fakeSeerPrompt.prompt && fakeSeerPrompt.prompt.includes("本尊對跳立場鎖定") && !fakeSeerPrompt.prompt.includes("雙明心觀察員盤坑參考") &&
        rejectTwoSided && rejectTwoSided.ok === false && rejectTwoSided.reason === "seer_balanced_two_sides" &&
        rejectPackPit && rejectPackPit.ok === false && rejectPackPit.reason === "fake_seer_outed_pack_pit" &&
        unbrokenCapsuleOk &&
        phraseOk
      );
      state.aiDifficulty = "normal";
    }

    return {
      v2571PureTtsAnd120Ok,
      v2571PolyphoneAndPackOk,
      v2571DualPrefetchOk,
      v2571SeerCapsuleRegexOk
    };
  })()`, ctx);

  const v2571RuntimeRes = await v2571Runtime;
  const all2571 = Object.assign({ v2571PureApiAndFilesOk }, v2571RuntimeRes);
  for (const [k, v] of Object.entries(all2571)) {
    if (!v) {
      throw new Error("v25.7.1 Release regression failed for " + k + ": " + JSON.stringify(all2571));
    }
  }
}

// ==================== v25.7.2 RELEASE REGRESSION SUITE (CHUNK-0 PREFETCH + SEER DEDUP/LEAD + WOLF EXPLODE STAGING + SUBMIT GUARDS) ====================
{
  const readV2572 = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
  const voice2572 = readV2572("js/audio/voice.js");
  const playerSpeech2572 = readV2572("js/game/player-speech.js");
  const voting2572 = readV2572("js/game/voting.js");
  const daySpeech2572 = readV2572("js/game/day-speech.js");
  const sw2572 = readV2572("sw.js");
  const fb2572 = readV2572("js/ui/feedback.js");
  const readme2572 = readV2572("README.md");
  const spec2572 = readV2572("docs/作品說明書.md");
  const script2572 = readV2572("docs/三分鐘Demo影片腳本.md");

  const v2572FilesAndVersionOk = Boolean(
    sw2572.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2572.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb2572.includes('version: "v25.9.0"') &&
    readme2572.includes("v25.9.0") &&
    spec2572.includes("v25.9.0") &&
    spec2572.length <= 5000 &&
    script2572.includes("v25.9.0") &&
    [voice2572, playerSpeech2572, voting2572, daySpeech2572, sw2572, fb2572, readme2572, spec2572, script2572].every(
      (txt) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
    )
  );

  const v2572Runtime = vm.runInContext(`(async () => {
    // 1. Long-text (>120 chars) cloud TTS prefetch dispatches BOTH chunks[0] and chunks[1]
    let v2572Chunk0PrefetchOk = false;
    {
      const origFetch = fetch;
      const origIsStatic = voice.isStaticCloudHost;
      const origDecode = voice.decodeGeminiAudioBytes;
      const prevKey = state.geminiApiKey;
      const prevOptOut = state.serverGeminiOptOut;
      const prevEngine = voice.enginePref;
      const prevAvail = voice.cloudGeminiTtsAvailable;
      const prevCd = voice.cloudGeminiTtsCooldownUntil;
      const prevCd429 = voice._cloudTtsCooldownIs429;
      const prevCtx = sound.ctx;
      const sentTexts = [];
      try {
        sound.ctx = { sampleRate: 24000, currentTime: 0 };
        state.geminiApiKey = "";
        state.serverGeminiOptOut = false;
        voice.enginePref = "auto";
        voice.isStaticCloudHost = () => true;
        voice.cloudGeminiTtsAvailable = true;
        voice.cloudGeminiTtsCooldownUntil = 0;
        voice._cloudTtsCooldownIs429 = false;
        voice.studioCache = {};
        voice.studioPending = {};
        voice.decodeGeminiAudioBytes = async () => ({ duration: 1.0 });
        fetch = async (_u, init) => {
          sentTexts.push(JSON.parse(init.body).text);
          return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(256).buffer };
        };
        const longStr = "這輪大家先把前排所有人的立場順序對清楚，如果對跳雙方都還沒拿出足夠具體的時間線與投票根據，我們可以先保留票型並把資源留到後面關鍵回合再做最後定奪；同時也要回頭核對昨晚誰有避重就輕或刻意模糊焦點的情況，千萬別在資訊不足的時候急著把重要身分送出場，請後面幾位務必把理由講明白並公開比對細節！";
        const expectedChunks = voice._splitTextForCloudTts(voice.formatMandarinText(longStr), 130);
        voice.prefetchCloudGeminiTts("你", longStr, "normal");
        await Promise.all(Object.values(voice.studioPending));
        await Promise.resolve();
        const strippedSent = sentTexts.map((t) => voice.stripGeminiVocalTags(t));
        v2572Chunk0PrefetchOk = Boolean(
          expectedChunks.length >= 2 &&
          strippedSent.length === 2 &&
          strippedSent.includes(expectedChunks[0]) &&
          strippedSent.includes(expectedChunks[1])
        );
      } finally {
        fetch = origFetch;
        voice.isStaticCloudHost = origIsStatic;
        voice.decodeGeminiAudioBytes = origDecode;
        state.geminiApiKey = prevKey;
        state.serverGeminiOptOut = prevOptOut;
        voice.enginePref = prevEngine;
        voice.cloudGeminiTtsAvailable = prevAvail;
        voice.cloudGeminiTtsCooldownUntil = prevCd;
        voice._cloudTtsCooldownIs429 = prevCd429;
        sound.ctx = prevCtx;
        voice.studioCache = {};
        voice.studioPending = {};
      }
    }

    // 2. Player Seer template deduplication + Seer-lead ordering + structured field preservation
    let v2572SeerDedupAndLeadOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "seer";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.playerSeatId = 1;
      state.match.seats.forEach((s) => {
        s.isPlayer = (s.id === 1);
        s.alive = true;
        s.claimedRole = null;
        s.role = s.id === 1 ? "seer" : (s.id === 5 || s.id === 7 ? "wolf" : "villager");
        s.team = s.role === "wolf" ? "wolf" : "good";
      });
      state.match.day = 2;
      state.match.phase = "DAY_PLAYER_TURN";
      state.match.daySpeechEvents = [];
      state.match.allSpeechEvents = [];
      const pSeat = getPlayerSeat();
      pSeat.checkedHistory = [{ targetId: 5, isWolf: true, day: 1 }];

      const d1 = ensurePlayerDraftPits(false);
      d1.claimRole = "seer";
      d1.wolfIds = [5];
      d1.goodIds = [];
      const txtOnly5 = composePlayerPitSpeechText();
      const count5Only = (txtOnly5.match(/0?5號/g) || []).length;

      state.match.playerDraftPits.wolfIds = [5, 6];
      const txt5And6 = composePlayerPitSpeechText();
      const count5With6 = (txt5And6.match(/0?5號/g) || []).length;

      pSeat.checkedHistory.push({ targetId: 3, isWolf: false, day: 2 });
      state.match.playerDraftPits.goodIds = [3];
      const txtWithGood3 = composePlayerPitSpeechText();
      const count3WithGood = (txtWithGood3.match(/0?3號/g) || []).length;

      const dLead = ensurePlayerDraftPits(false);
      dLead.wolfIds = [5];
      dLead.goodIds = [];
      dLead.claimRole = null;
      dLead.composedModules = [{ key: "m1", tgTag: "條理分析", text: "這點矛盾值得再對一次。", tgKind: "words", addedWolfIds: [], addedGoodIds: [] }];
      dLead._lastAutoPitText = "";
      const qIn = el("quickFreeInput");
      if (qIn) qIn.value = "狼坑目前鎖定 05號" + getSeat(5).name + "，破綻最明顯，建議好人齊心歸票優先請 05號 離席！，這點矛盾值得再對一次。";
      pSeat.checkedHistory = [{ targetId: 5, isWolf: true, day: 1 }];
      dLead.claimRole = "seer";
      syncDraftSpeechToInput();
      const syncedLeadTxt = qIn ? qIn.value : "";

      const dCard = ensurePlayerDraftPits(false);
      dCard.wolfIds = [5];
      dCard.goodIds = [];
      dCard.claimRole = null;
      dCard.composedModules = [];
      if (qIn) qIn.value = "狼坑目前鎖定 05號" + getSeat(5).name + "，建議優先請 05號 離席！";
      loadQuickCardIntoAdvancedEditor({
        label: "明心查殺",
        tgTag: "觀察員",
        tgKind: "heart",
        text: "我是真正的明心觀察員！昨晚查驗 05號" + getSeat(5).name + " 是酸民狼！",
        draftPatch: { claimRole: "seer", wolfIds: [5] }
      }, null, null, null);
      const cardLeadTxt = qIn ? qIn.value : "";

      const dSubmit = ensurePlayerDraftPits(false);
      dSubmit.wolfIds = [5];
      dSubmit.goodIds = [];
      dSubmit.claimRole = "seer";
      dSubmit.composedModules = [];
      state.match.phase = "DAY_PLAYER_TURN";
      el("playerSpeechInput").value = txtOnly5;
      const subOk = submitPlayerSpeech();
      const lastEv = state.match.daySpeechEvents[state.match.daySpeechEvents.length - 1];

      v2572SeerDedupAndLeadOk = Boolean(
        txtOnly5.startsWith("我是真正的明心觀察員") &&
        count5Only === 1 &&
        !txtOnly5.includes("狼坑目前鎖定") &&
        count5With6 === 1 &&
        txt5And6.includes("狼坑目前鎖定") &&
        txt5And6.includes("6號") &&
        count3WithGood === 1 &&
        !txtWithGood3.includes("好人坑我先保") &&
        state.match.playerDraftPits &&
        syncedLeadTxt.startsWith("我是真正的明心觀察員") &&
        (syncedLeadTxt.match(/0?5號/g) || []).length === 1 &&
        syncedLeadTxt.includes("這點矛盾值得再對一次。") &&
        !syncedLeadTxt.includes("狼坑目前鎖定") &&
        cardLeadTxt.startsWith("我是真正的明心觀察員") &&
        !cardLeadTxt.includes("狼坑目前鎖定") &&
        subOk === true &&
        lastEv && lastEv.checkedWolfId === 5 && lastEv.accuseId === 5 &&
        Array.isArray(lastEv.wolfPits) && lastEv.wolfPits.includes(5)
      );
    }

    // 3. AI Wolf Self-Explode: forbidden on easy; >= 2.8s staging + max 1/match on normal/pro + clearTransientMatchTimers cleanup
    let v2572WolfExplodeStagingAndGuardsOk = false;
    {
      resetMatchToLobby();
      el("selectModeCount").value = "10";
      el("selectPreferredRole").value = "seer";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.playerSeatId = 1;
      state.match.seats.forEach((s) => {
        s.isPlayer = (s.id === 1);
        s.alive = true;
        s.claimedRole = null;
        if (s.id === 1) { s.role = "seer"; s.team = "good"; }
        else if (s.id === 2 || s.id === 3 || s.id === 4) { s.role = "wolf"; s.team = "wolf"; }
        else { s.role = "villager"; s.team = "good"; }
      });
      state.match.phase = "DAY_SPEECH";
      state.match.day = 2;
      state.match.aiWolfExplosions = 0;
      state.match._wolfExplodePendingNight = false;
      state.match.daySpeechEvents = [
        { speakerId: 1, claimRole: "seer", checkedWolfId: 2, text: "1號觀察員查殺 2號" }
      ];
      state.match.allSpeechEvents = state.match.daySpeechEvents.slice();

      const w1 = getSeat(2);
      const w2 = getSeat(3);
      state.aiDifficulty = "easy";
      const easyForbidOk = maybeTriggerAiWolfSelfExplode(w1, { rngVal: 0.01 }) === false;

      const origSetTo = setTimeout;
      const origClearTo = clearTimeout;
      const origCanSpeak = voice.canSpeak;
      const timers = [];
      const clearedIds = [];
      try {
        voice.canSpeak = () => false;
        setTimeout = (fn, ms) => {
          const id = timers.length + 101;
          timers.push({ id, fn, ms });
          return id;
        };
        clearTimeout = (id) => {
          if (id) clearedIds.push(id);
        };

        state.aiDifficulty = "normal";
        state.spectatorFastForward = false;
        const firedNormal = maybeTriggerAiWolfSelfExplode(w1, { rngVal: 0.01 });
        const holdTimerEntry = timers.find((t) => t.id === state._wolfExplodeTimer && t.ms >= 2800);
        const spotTxtDuringHold = el("spotlightText") ? el("spotlightText").textContent : "";
        const pendingStateOk = Boolean(
          firedNormal === true &&
          !w1.alive &&
          w1.claimedRole === "wolf" &&
          state.match._wolfExplodePendingNight === true &&
          !isNightPhase(state.match.phase) &&
          state.match.phase === "DAY_SPEECH" &&
          holdTimerEntry &&
          spotTxtDuringHold.includes("當場拂袖掀席！本輪剩餘發言與公投強制中止，即將入夜")
        );

        if (holdTimerEntry) holdTimerEntry.fn();
        const enteredNightAfterHoldOk = Boolean(
          isNightPhase(state.match.phase) &&
          state.match.day === 3 &&
          state.match._wolfExplodePendingNight === false
        );

        state.match.phase = "DAY_SPEECH";
        state.match.daySpeechEvents = [
          { speakerId: 1, claimRole: "seer", checkedWolfId: w2.id, text: "1號觀察員查殺 3號" }
        ];
        const secondBlockedOk = maybeTriggerAiWolfSelfExplode(w2, { rngVal: 0.01 }) === false;

        state.match.aiWolfExplosions = 0;
        timers.length = 0;
        clearedIds.length = 0;
        const firedCleanupTest = maybeTriggerAiWolfSelfExplode(w2, { rngVal: 0.01 });
        const pendingHoldId = state._wolfExplodeTimer;
        clearTransientMatchTimers();
        const cleanupTimerOk = Boolean(
          firedCleanupTest &&
          pendingHoldId &&
          clearedIds.includes(pendingHoldId) &&
          state._wolfExplodeTimer === null &&
          state._wolfExplodeCapTimer === null &&
          state.match._wolfExplodePendingNight === false
        );

        v2572WolfExplodeStagingAndGuardsOk = Boolean(
          easyForbidOk &&
          pendingStateOk &&
          enteredNightAfterHoldOk &&
          secondBlockedOk &&
          cleanupTimerOk
        );
      } finally {
        setTimeout = origSetTo;
        clearTimeout = origClearTo;
        voice.canSpeak = origCanSpeak;
        state.aiDifficulty = "normal";
      }
    }

    // 4. submitPlayerSpeech phase & re-entrancy guards + non-explode empty speechQueue -> DAY_VOTE
    let v2572SubmitGuardsAndVoteFlowOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      state.match.playerSeatId = 1;
      state.match.seats.forEach((s) => { s.alive = true; s.isPlayer = (s.id === 1); });

      state.match.phase = "SHERIFF_ELECTION";
      el("playerSpeechInput").value = "不該在警選誤送出";
      const blockedInSheriff = submitPlayerSpeech() === false;
      const sheriffPhaseIntact = state.match.phase === "SHERIFF_ELECTION";

      state.match.phase = "DAY_PLAYER_TURN";
      state.match.daySpeechEvents = [];
      state._submittingPlayerSpeech = true;
      el("playerSpeechInput").value = "防重入阻擋";
      const blockedReentry = submitPlayerSpeech() === false && state.match.daySpeechEvents.length === 0;
      state._submittingPlayerSpeech = false;

      el("playerSpeechInput").value = "第一拍正常發言送出，先保 2號、疑 5號。";
      const firstSubmitOk = submitPlayerSpeech() === true;
      const secondClickBlocked = submitPlayerSpeech() === false && state.match.daySpeechEvents.length === 1;

      state.match.phase = "DAY_SPEECH";
      state.match._wolfExplodePendingNight = false;
      state.match.speechQueue = [];
      advanceSpeechQueue();
      const nonExplodeToVoteOk = state.match.phase === "DAY_VOTE" && !isNightPhase(state.match.phase);

      v2572SubmitGuardsAndVoteFlowOk = Boolean(
        blockedInSheriff &&
        sheriffPhaseIntact &&
        blockedReentry &&
        firstSubmitOk &&
        secondClickBlocked &&
        nonExplodeToVoteOk
      );
    }

    return {
      v2572Chunk0PrefetchOk,
      v2572SeerDedupAndLeadOk,
      v2572WolfExplodeStagingAndGuardsOk,
      v2572SubmitGuardsAndVoteFlowOk
    };
  })()`, ctx);

  const v2572RuntimeRes = await v2572Runtime;
  const all2572 = Object.assign({ v2572FilesAndVersionOk }, v2572RuntimeRes);
  for (const [k, v] of Object.entries(all2572)) {
    if (!v) {
      throw new Error("v25.7.2 Release regression failed for " + k + ": " + JSON.stringify(all2572));
    }
  }
}

// ==================== v25.8.0 STABILIZATION RELEASE REGRESSION SUITE ====================
{
  const readV2580 = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
  const vercel2580 = JSON.parse(readV2580("vercel.json"));
  const apiTts2580 = (await import("../api/tts.js")).default;
  const apiGem2580 = (await import("../api/gemini.js")).default;
  const sw2580 = readV2580("sw.js");
  const fb2580 = readV2580("js/ui/feedback.js");
  const spec2580 = readV2580("docs/作品說明書.md");
  const script2580 = readV2580("docs/三分鐘Demo影片腳本.md");
  const readme2580 = readV2580("README.md");
  const css2580 = readV2580("css/components.css").replace(/\/\*[\s\S]*?\*\//g, "");

  // 1. FILE 01..04 Serverless & config checks
  const vercelMaxDurOk = Boolean(
    vercel2580 &&
    vercel2580.functions &&
    vercel2580.functions["api/*.js"] &&
    vercel2580.functions["api/*.js"].maxDuration === 25 &&
    Array.isArray(vercel2580.headers) &&
    Array.isArray(vercel2580.rewrites)
  );
  const tts38Body = apiTts2580._buildTtsRequestBody("gemini-3.8-flash-lite-tts", "我是直心糾察長，警長和社長請聽好", "Kore", false);
  const tts25Body = apiTts2580._buildTtsRequestBody("gemini-2.5-flash-preview-tts", "我是直心糾察長，警長請聽好", "Kore", false);
  const ttsProxyV2580Ok = Boolean(
    apiTts2580.resolvePrimaryTtsModel("") === "gemini-3.8-flash-lite-tts" &&
    apiTts2580.resolvePrimaryTtsModel("gemini-2.5-flash-preview-tts") === "gemini-3.8-flash-lite-tts" &&
    apiTts2580.resolvePrimaryTtsModel("gemini-3.1-flash-tts-preview") === "gemini-3.8-flash-lite-tts" &&
    apiTts2580.normalizeTtsPolyphones("直心糾察長、糾察長、警長、社長") === "直心糾察掌、糾察掌、警長、社長" &&
    tts38Body.contents[0].parts[0].text === "我是直心糾察掌，警長和社長請聽好" &&
    !("temperature" in tts38Body.generationConfig) &&
    !("topP" in tts38Body.generationConfig) &&
    !("topK" in tts38Body.generationConfig) &&
    tts25Body.contents[0].parts[0].text.startsWith("Say: ")
  );
  const gem35Body = apiGem2580.sanitizeGeminiTextBody("gemini-3.5-flash-lite", {
    contents: [{ role: "user", parts: [{ text: "hello" }] }, { role: "model", parts: [{ text: "dangling" }] }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 32, candidateCount: 1, thinkingBudget: 128, maxOutputTokens: 1024 }
  });
  const gemProxyV2580Ok = Boolean(
    apiGem2580.resolveGeminiTextModel("gemini-4-hydrogen") === "gemini-3.5-flash-lite" &&
    apiGem2580.resolveGeminiTextModel("gemini-2.5-pro") === "gemini-3.8-flash" &&
    gem35Body.contents.length === 1 &&
    !("temperature" in gem35Body.generationConfig) &&
    !("topP" in gem35Body.generationConfig) &&
    !("topK" in gem35Body.generationConfig) &&
    !("candidateCount" in gem35Body.generationConfig) &&
    !("thinkingBudget" in gem35Body.generationConfig) &&
    gem35Body.generationConfig.thinkingConfig &&
    gem35Body.generationConfig.thinkingConfig.thinkingLevel === "minimal"
  );
  const docsV2580Ok = Boolean(
    sw2580.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2580.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb2580.includes('version: "v25.9.0"') &&
    spec2580.includes("v25.9.0") && spec2580.length <= 5000 &&
    script2580.includes("v25.9.0") &&
    readme2580.includes("v25.9.0") &&
    !css2580.includes("!important") &&
    !css2580.includes("backdrop-filter")
  );

  // 2. Runtime tests for FILE 05..10
  const v2580Runtime = vm.runInContext(`(async () => {
    // FILE 05: WAV RIFF non-double-wrapping, silence rejection, and AbortError vs 3-speaker breaker
    let file05VoiceV2580Ok = false;
    {
      const validPcm = new Uint8Array(24000); // 0.5s 24kHz 16-bit mono
      for (let i = 0; i < validPcm.length; i += 2) {
        validPcm[i] = 0x10;
        validPcm[i + 1] = 0x10;
      }
      const wav1 = voice._wrapPcmBytesToWav(validPcm, 24000);
      const parsedValid = voice.parseAndValidateTtsAudioBytes(wav1);

      const silentWav = voice._wrapPcmBytesToWav(new Uint8Array(24000), 24000);
      let silentThrew = false;
      try { voice.parseAndValidateTtsAudioBytes(silentWav); } catch (e) { silentThrew = true; }

      const shortWav = voice._wrapPcmBytesToWav(new Uint8Array(400), 24000);
      let shortThrew = false;
      try { voice.parseAndValidateTtsAudioBytes(shortWav); } catch (e) { shortThrew = true; }

      voice._clearCloudTtsFailState();
      voice.cloudGeminiTtsCooldownUntil = 0;
      voice._recordCloudTtsHardFail("小澄");
      voice._recordCloudTtsHardFail("小澄");
      const notTrippedSameSpeaker = voice.cloudGeminiTtsCooldownUntil === 0;
      voice._recordCloudTtsHardFail("暖暖");
      voice._recordCloudTtsHardFail("阿松");
      const tripped3Speakers = voice.cloudGeminiTtsCooldownUntil > Date.now();
      voice._clearCloudTtsFailState();
      voice.cloudGeminiTtsCooldownUntil = 0;

      file05VoiceV2580Ok = Boolean(
        parsedValid && parsedValid.isWav === true && parsedValid.bytes &&
        parsedValid.bytes.byteLength === wav1.byteLength &&
        parsedValid.pcmLength === validPcm.byteLength &&
        silentThrew && shortThrew && notTrippedSameSpeaker && tripped3Speakers
      );
    }

    // FILE 06 & 07: Bug 5 (marks all claimedSeers excluding self) & Bug 6 (skips dead seat dynamically in +2 prefetch)
    let file06And07BugsOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      state.match.playerSeatId = 1;
      state.match.seats.forEach((s) => { s.alive = true; s.claimedRole = null; s.isPlayer = (s.id === 1); });
      state.match.seats[1].claimedRole = "seer";
      state.match.seats[3].claimedRole = "seer";
      const spViewer = state.match.seats[5];
      spViewer.role = "seer";
      spViewer.team = "good";
      spViewer.claimedRole = "seer";
      const built5 = buildBlindGeminiSpeechPrompt(spViewer, buildHeuristicAiSpeech(spViewer));
      const bug5MarksBothSeers = Boolean(
        built5 && built5.prompt &&
        built5.prompt.includes("2號") &&
        built5.prompt.includes("4號")
      );

      // Bug 6: queue initially [2, 3, 4], mark 3 dead right after hook runs so +2 dynamically targets 4!
      state.match.seats.forEach((s) => {
        s.alive = true;
        s.isPlayer = (s.id === 1);
        s.role = "villager";
        s.team = "good";
        s.fakeSeer = false;
        s.claimedRole = null;
        s.suspicionMap = {};
      });
      state.match.seats[1].suspicionMap = { 5: 90 };
      state.match.phase = "DAY_SPEECH";
      state.match.day = 2;
      state.match.daySpeechEvents = [];
      state.match.allSpeechEvents = [];
      state.match.speechQueue = [2, 3, 4];
      state.activeSpeakerId = 6;
      state.match._prefetchedSpeeches = {};
      const origCanSp6 = voice.canSpeak;
      const origPf6 = voice.prefetchBestTts;
      const origLocal6 = voice.localNeuralAvailable;
      voice.canSpeak = () => true;
      voice.localNeuralAvailable = true;
      voice.prefetchBestTts = () => true;
      try {
        const hook6 = scheduleStaggeredNextSpeechPrefetch(orchestrator.matchEpoch, state._speechTurnSeq);
        state.match.seats.find((s) => s.id === 3).alive = false;
        if (typeof hook6 === "function") hook6();
        await Promise.resolve();
        await Promise.resolve();
        const pfMap = state.match._prefetchedSpeeches || {};
        file06And07BugsOk = Boolean(
          bug5MarksBothSeers &&
          pfMap[2] && !pfMap[3] && pfMap[4]
        );
      } finally {
        voice.canSpeak = origCanSp6;
        voice.localNeuralAvailable = origLocal6;
        voice.prefetchBestTts = origPf6;
      }
    }

    // FILE 09: 0-paren dialogue + opening_stance replacement + live badge-flow sync (Sheriff & Daytime)
    let file09CardsAndParensOk = false;
    {
      const strippedParen = stripDialogueParentheses("今晚警徽流先驗 2號（我若倒牌，徽給他）謝謝(補充)！");
      const noParenOk = strippedParen === "今晚警徽流先驗 2號謝謝！";

      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "seer";
      el("chkSheriffMode").checked = true;
      startNewGame();
      indieFlow.hideRoleDealRitual();
      const pid = getPlayerId();
      const others = getAliveSeats().filter((s) => s.id !== pid);
      const pSeat = getPlayerSeat();
      pSeat.role = "seer";
      pSeat.checkedHistory = [{ day: 1, targetId: others[0].id, isWolf: true }];
      state.match.phase = "SHERIFF_ELECTION";
      state.match.sheriffElectionCtx = {
        stage: "speech",
        candidateIds: [pid, others[0].id],
        speechOrderIds: [pid, others[0].id],
        speechIndex: 0,
        activeReelSeatId: pid,
        spokenSpeeches: [],
        withdrawnIds: [],
        playerRunning: true,
        playerBadgeFlowDraft: { firstTargetId: others[1].id, secondTargetId: others[2].id, explicit: true }
      };
      el("sheriffPlayerInput").value = "";
      updateAllUI();
      const shBtns = Array.from(el("sheriffPlayerQuickChips").querySelectorAll("button"));
      if (shBtns[0]) shBtns[0].click();
      const afterSh0 = el("sheriffPlayerInput").value;
      // Live dropdown sync while card 0 is loaded
      setPlayerSheriffDraftBadgeFlow(others[3].id, others[4].id);
      const afterDropdownSync = el("sheriffPlayerInput").value;
      const liveSyncReplacedTarget = Boolean(
        afterDropdownSync.includes(others[3].id + "號") &&
        !afterDropdownSync.includes(others[1].id + "號")
      );
      // Click mutually exclusive stance card 2 -> must replace card 0 instead of concatenating!
      const shBtns2 = Array.from(el("sheriffPlayerQuickChips").querySelectorAll("button"));
      if (shBtns2[2]) shBtns2[2].click();
      const afterSh2 = el("sheriffPlayerInput").value;
      const sheriffExclusiveOk = Boolean(
        afterSh0.includes("明心觀察員") &&
        liveSyncReplacedTarget &&
        !afterSh2.includes("明心觀察員") &&
        afterSh2.length > 10 &&
        !/[（）()]/.test(afterSh0 + afterSh2)
      );

      // Daytime exclusiveGroup replacement check (while qCards[0]+qCards[1] stacking remains intact)
      state.match.phase = "DAY_PLAYER_TURN";
      state.match.todayEvents = { fakeSeerId: others[0].id };
      state.match.pinnedClues = [];
      state.match.playerDraftPits = createEmptyPlayerDraftPits();
      el("quickFreeInput").value = "";
      el("playerSpeechInput").value = "";
      preparePlayerSpeechPanel();
      updateAllUI();
      const dayCards = Array.from(el("quickSpeechChips").querySelectorAll("button"));
      if (dayCards[0]) dayCards[0].click();
      const dAfter0 = el("quickFreeInput").value;
      if (dayCards[2]) dayCards[2].click();
      const dAfter2 = el("quickFreeInput").value;
      const dayExclusiveOk = Boolean(
        dAfter0.length > 10 &&
        dAfter2 !== dAfter0 &&
        !dAfter2.includes(dAfter0.trim()) &&
        state.match.playerDraftPits.composedModules.length === 1 &&
        !/[（）()]/.test(dAfter0 + dAfter2)
      );

      file09CardsAndParensOk = Boolean(noParenOk && sheriffExclusiveOk && dayExclusiveOk);
    }

    // FILE 10: Bugs 1, 2, 3, 4, 7
    let file10AiBugsOk = false;
    {
      resetMatchToLobby();
      state.aiDifficulty = "normal";
      el("selectModeCount").value = "8";
      el("selectPreferredRole").value = "villager";
      el("chkSheriffMode").checked = false;
      startNewGame();
      indieFlow.hideRoleDealRitual();

      state.match.judgeShowcase = true;
      const scSnap = createBlindMatchSnapshot(state.match.seats[0], { module: "v2580" });
      const bug2Easy = resolveActiveJargonDifficulty(scSnap) === "easy";
      const bug1Out = applyDifficultyTerminology("場上對跳觀察員，不能說有人悍跳觀察員", "easy");
      const bug1Ok = bug1Out.includes("兩個人都說自己是觀察員") && bug1Out.includes("假冒觀察員");
      const bug3In = "雙警徽流在前置位跟後置位搶查殺，想要坐實就得盤狼坑定進狼坑一起衝票倒鉤";
      const bug3Out = applyDifficultyTerminology(bug3In, "easy");
      const bug3Ok = [
        "雙人觀察名單順序", "前面發言的人", "後面發言的人",
        "搶先指控別人", "確定身分", "找出可疑名單", "列入可疑名單", "集中投票", "假裝站對邊"
      ].every((w) => bug3Out.includes(w));

      // Bug 7: dead fakeSeer excluded from wolfPits + latestVotedOutSeerDay null guard
      state.match.judgeShowcase = false;
      state.match.day = 3;
      state.match.seats.forEach((s) => { s.alive = true; s.claimedRole = null; s.publicRevealedRole = null; s.voteDisabled = false; });
      state.match.seats[1].claimedRole = "seer";
      state.match.seats[2].claimedRole = "seer";
      state.match.seats[2].alive = false;
      state.match.seats[2].outReason = "投票出局";
      state.match.allSpeechEvents = [
        { speakerId: 2, claimRole: "seer", day: 1, text: "2號觀察員" },
        { speakerId: 3, claimRole: "seer", day: 1, text: "3號觀察員" }
      ];
      state.match.daySpeechEvents = [];
      state.match.publicVoteHistory = [];
      const wView = buildTableSlotAndWorldAnalysis(state.match.seats[4], createBlindMatchSnapshot(state.match.seats[4], { module: "v2580" }));
      const bug7DeadFakeOk = Boolean(
        wView && wView.wolfPits.every((s) => s.alive) &&
        (!wView.dualSeerWorlds || (
          wView.dualSeerWorlds.worldA.wolfPits.every((s) => s.alive) &&
          wView.dualSeerWorlds.worldB.wolfPits.every((s) => s.alive)
        ))
      );
      state.match.seats[1].alive = true;
      state.match.seats[2].alive = false;
      state.match.seats[2].claimedRole = "seer";
      const soloSurvView = buildTableSlotAndWorldAnalysis(state.match.seats[4], createBlindMatchSnapshot(state.match.seats[4], { module: "v2580" }));
      const bug7NullDayOk = Boolean(soloSurvView && (!soloSurvView.survivingSeerSuspicionBoost || !soloSurvView.survivingSeerSuspicionBoost[2]));

      file10AiBugsOk = Boolean(bug2Easy && bug1Ok && bug3Ok && bug7DeadFakeOk && bug7NullDayOk);
    }

    resetMatchToLobby();
    return {
      file05VoiceV2580Ok,
      file06And07BugsOk,
      file09CardsAndParensOk,
      file10AiBugsOk
    };
  })()`, ctx);

  const v2580RuntimeRes = await v2580Runtime;
  const all2580 = Object.assign({
    vercelMaxDurOk,
    ttsProxyV2580Ok,
    gemProxyV2580Ok,
    docsV2580Ok
  }, v2580RuntimeRes);
  for (const [k, v] of Object.entries(all2580)) {
    if (!v) {
      throw new Error("v25.8.0 Stabilization regression failed for " + k + ": " + JSON.stringify(all2580));
    }
  }
}

// ==================== v25.9.0 RELEASE REGRESSION SUITE ====================
{
  const sw2590 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const fb2590 = fs.readFileSync(path.join(ROOT, "js/ui/feedback.js"), "utf8");
  const readme2590 = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const spec2590 = fs.readFileSync(path.join(ROOT, "docs/作品說明書.md"), "utf8");
  const script2590 = fs.readFileSync(path.join(ROOT, "docs/三分鐘Demo影片腳本.md"), "utf8");
  const versionSync2590Ok = Boolean(
    sw2590.includes('const SHELL_CACHE = "sanhao-shell-v25.9.0"') &&
    sw2590.includes('const ASSET_CACHE = "sanhao-assets-v25.9.0"') &&
    fb2590.includes('version: "v25.9.0"') &&
    readme2590.includes("v25.9.0") &&
    spec2590.includes("v25.9.0") && spec2590.length <= 5000 &&
    script2590.includes("v25.9.0") &&
    !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(script2590) &&
    !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(spec2590)
  );

  const v2590Res = await vm.runInContext(`(async () => {
    const emojiRe2590 = /[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u;
    const parenRe2590 = /[（）()]/;
    const clicheRe2590 = /泡芙|軟軟的|硬碟|記憶體|CPU|當機|舒芙蕾|布丁|算盤|馬卡龍|桂花糕/;

    // 1. Gender & Honorific checks
    const youziDef = AI_PERSONAS.find((p) => p.name === "柚子");
    const qinglanDef = AI_PERSONAS.find((p) => p.name === "晴嵐");
    const xiaoyunDef = AI_PERSONAS.find((p) => p.name === "小雲");
    const alangDef = AI_PERSONAS.find((p) => p.name === "阿朗");
    const allGendersSet = AI_PERSONAS.every((p) => p.gender === "female" || p.gender === "male");
    const mockSeats = [
      { id: 1, name: "阿松", gender: "male", isHuman: false },
      { id: 3, name: "柚子", gender: "female", aliases: ["小柚"], isHuman: false },
      { id: 9, name: "你", gender: "neutral", isHuman: true, isPlayer: true }
    ];
    const honorificOk = Boolean(
      allGendersSet &&
      youziDef && youziDef.gender === "female" && Array.isArray(youziDef.aliases) && youziDef.aliases.includes("小柚") &&
      qinglanDef && qinglanDef.gender === "female" &&
      xiaoyunDef && xiaoyunDef.gender === "female" &&
      alangDef && alangDef.gender === "male" &&
      getSeatHonorific(youziDef) === "學姐" &&
      getSeatHonorific(alangDef) === "學長" &&
      getSeatHonorific(mockSeats[2]) === "" &&
      fixGenderHonorificMismatch("我認同03號小柚學長", mockSeats) === "我認同03號小柚學姐" &&
      fixGenderHonorificMismatch("03號小柚認同01號阿松學長", mockSeats) === "03號小柚認同01號阿松學長" &&
      fixGenderHonorificMismatch("我認同09號玩家學長", mockSeats) === "我認同09號玩家"
    );

    // 2. Zero prop cliches across all persona data tables
    const personaBlob = JSON.stringify({
      AI_PERSONAS,
      PERSONA_FLAVORS,
      PERSONA_VOICE_STYLES,
      PERSONA_COGNITIVE_PROFILES,
      PERSONA_SIGNATURE_DOSSIERS,
      PERSONA_THINKING_CUES,
      PERSONA_LOBBY_GREETINGS
    });
    const zeroPersonaClichesOk = !clicheRe2590.test(personaBlob) && !emojiRe2590.test(personaBlob);

    // 3. Zero parentheses inside persona dialogue arrays & voice audition lines
    const dialogueItems = [];
    Object.values(PERSONA_FLAVORS).forEach((flv) => {
      Object.entries(flv).forEach(([k, val]) => {
        if (k === "bio") return;
        if (typeof val === "string") dialogueItems.push(val);
        else if (Array.isArray(val)) val.forEach((x) => typeof x === "string" && dialogueItems.push(x));
        else if (val && typeof val === "object") {
          Object.values(val).forEach((arr) => Array.isArray(arr) && arr.forEach((x) => dialogueItems.push(x)));
        }
      });
    });
    const zeroPersonaParensOk = dialogueItems.every((s) => !parenRe2590.test(s));

    // 4. Wolf self-explode: no last words + voice completion before Night (no 2800ms cutoff) + last wolf win
    resetMatchToLobby();
    el("selectModeCount").value = "8";
    el("selectPreferredRole").value = "villager";
    el("chkSheriffMode").checked = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.aiDifficulty = "normal";
    state.spectatorFastForward = false;
    state.match.day = 2;
    state.match.phase = "DAY_SPEECH";
    state.match.seats.forEach((s) => { s.alive = true; s.selfExploded = false; });
    const aiWolfExp = state.match.seats.find((s) => s.role === "wolf" && s.id !== getPlayerId());
    const origSetTo = setTimeout;
    const origClearTo = clearTimeout;
    const origCanSpeak = voice.canSpeak;
    const origSpeak = voice.speak;
    const timers2590 = [];
    const cleared2590 = [];
    let capturedVoiceOnDone = null;
    let voiceSpokenText = "";
    let voiceCompletionOk = false;
    let noLastWordsOnExplodeOk = false;
    let lastWolfWinOk = false;
    try {
      setTimeout = (fn, ms) => {
        const id = timers2590.length + 501;
        timers2590.push({ id, fn, ms });
        return id;
      };
      clearTimeout = (id) => {
        if (id) cleared2590.push(id);
      };
      voice.canSpeak = () => true;
      voice.speak = (_name, text, _mood, onDone) => {
        voiceSpokenText = text;
        capturedVoiceOnDone = onDone;
      };

      const firedVoice = triggerWolfSelfExplode(aiWolfExp.id, { aiSelfExplode: true, waitForVoice: true, dramaticPauseMs: 2800 });
      const spotAfterExplode = el("spotlightText") ? el("spotlightText").textContent : "";
      const hasCap9500 = timers2590.some((t) => t.id === state._wolfExplodeCapTimer && t.ms === 9500);
      const noEarly2800Cut = state._wolfExplodeTimer === null && !isNightPhase(state.match.phase);
      const capIdBeforeDone = state._wolfExplodeCapTimer;

      // Calling startLastWordsSequence after self-explode MUST be skipped with zero last words
      let lwCbFired = false;
      startLastWordsSequence([aiWolfExp.id], "vote_out", () => { lwCbFired = true; });
      noLastWordsOnExplodeOk = Boolean(
        aiWolfExp.selfExploded === true &&
        state.lastWordsCtx === null &&
        lwCbFired === true &&
        state.match.phase !== "LAST_WORDS_SPEECH" &&
        state.match.phase !== "LAST_WORDS_PLAYER"
      );

      if (typeof capturedVoiceOnDone === "function") capturedVoiceOnDone();
      const capClearedOnVoiceDone = capIdBeforeDone && cleared2590.includes(capIdBeforeDone) && state._wolfExplodeCapTimer === null;
      const pauseTimer350 = timers2590.find((t) => t.id === state._wolfExplodeTimer && t.ms === 350);
      if (pauseTimer350) pauseTimer350.fn();
      voiceCompletionOk = Boolean(
        firedVoice &&
        voiceSpokenText.length >= 10 && voiceSpokenText.length <= 18 &&
        !parenRe2590.test(voiceSpokenText) && !parenRe2590.test(spotAfterExplode) &&
        hasCap9500 && noEarly2800Cut && capClearedOnVoiceDone &&
        Boolean(pauseTimer350) &&
        isNightPhase(state.match.phase) && state.match.day === 3 &&
        state._wolfExplodeTimer === null && state._wolfExplodeCapTimer === null
      );

      // Last surviving wolf self-explodes during DAY_SPEECH -> immediate good win
      state.match.day = 3;
      state.match.phase = "DAY_SPEECH";
      state.match.wolfExplodedToday = false;
      state.match._wolfExplodePendingNight = false;
      const remainingWolves = state.match.seats.filter((s) => s.alive && s.role === "wolf");
      remainingWolves.slice(1).forEach((w) => { w.alive = false; w.outReason = "投票出局"; });
      const lastW = remainingWolves[0];
      if (lastW) {
        triggerWolfSelfExplode(lastW.id, { immediateNight: true });
        lastWolfWinOk = Boolean(state.match.phase === "GAME_OVER" && state.match.winner === "good" && state.lastWordsCtx === null);
      }
    } finally {
      setTimeout = origSetTo;
      clearTimeout = origClearTo;
      voice.canSpeak = origCanSpeak;
      voice.speak = origSpeak;
    }

    // 5. State rationality (8 states + SHERIFF_EARLY never accuses unspoken + consecutive opener uniqueness + usedReactionSet)
    resetMatchToLobby();
    el("selectModeCount").value = "8";
    el("chkSheriffMode").checked = true;
    startNewGame();
    indieFlow.hideRoleDealRitual();
    state.match.day = 1;
    state.match.phase = "SHERIFF_ELECTION";
    state.match.sheriffElectionCtx = { stage: "speech", candidateIds: [1, 2, 3, 4], speechOrderIds: [1, 2, 3, 4], spokenSpeeches: [], withdrawnIds: [] };
    const snapEarly = createBlindMatchSnapshot(state.match.seats[1], { module: "v2590_state", phase: "SHERIFF_ELECTION" });
    const earlyTagOk = classifySpeechGameState(state.match.seats[1], snapEarly, { isSheriff: true, phase: "SHERIFF_ELECTION", spokenCount: 0 }).stateTag === "SHERIFF_EARLY";
    state.match.sheriffElectionCtx.spokenSpeeches = [{ seatId: 1, name: "1", text: "a" }, { seatId: 2, name: "2", text: "b" }];
    const snapLate = createBlindMatchSnapshot(state.match.seats[2], { module: "v2590_state", phase: "SHERIFF_ELECTION" });
    const lateTagOk = classifySpeechGameState(state.match.seats[2], snapLate, { isSheriff: true, phase: "SHERIFF_ELECTION", spokenCount: 2 }).stateTag === "SHERIFF_LATE";
    const shCandLine = buildSheriffCandidateLine(state.match.seats[1], []);
    const shEarlyRationalOk = !/剛才發言心虛|剛剛講話心虛|剛才眼神/.test(shCandLine.text || "");

    state.match.phase = "DAY_SPEECH";
    state.match.daySpeechEvents = [
      { speakerId: 1, day: 1, accuseId: 4, rawText: "先表個態，4號聽起來有點急。" }
    ];
    state.match.usedHeuristicFragments = { buckets: {}, roundOpeners: {} };
    const aiSeq = state.match.seats.filter((s) => s.id !== getPlayerId()).slice(0, 4);
    const seqOpeners = aiSeq.map((s) => {
      const sp = buildHeuristicAiSpeech(s);
      state.match.daySpeechEvents.push({ speakerId: s.id, day: 1, accuseId: sp.accuseId || null, rawText: sp.text });
      return String(sp.text || "").replace(/\\s+/g, "").slice(0, 8);
    });
    const consecutiveOpenersUniqueOk = new Set(seqOpeners).size === seqOpeners.length;

    // usedReactionSet prevents duplicates in the same match
    state.match.usedReactionSet = {};
    const bubble1 = _pickUniqueCrowdReactionLine(aiSeq[0], "reactNod", ["補位1", "補位2"], 1);
    const bubble2 = _pickUniqueCrowdReactionLine(aiSeq[0], "reactNod", ["補位1", "補位2"], 1);
    const reactionNoRepeatOk = Boolean(bubble1 && bubble2 && bubble1 !== bubble2);

    const stateAndAntiRepeatOk = Boolean(earlyTagOk && lateTagOk && shEarlyRationalOk && consecutiveOpenersUniqueOk && reactionNoRepeatOk);

    resetMatchToLobby();
    return {
      honorificOk,
      zeroPersonaClichesOk,
      zeroPersonaParensOk,
      voiceCompletionOk,
      noLastWordsOnExplodeOk,
      lastWolfWinOk,
      stateAndAntiRepeatOk
    };
  })()`, ctx);

  const v2590Runtime = await v2590Res;
  const all2590 = Object.assign({ versionSync2590Ok }, v2590Runtime);
  for (const [k, v] of Object.entries(all2590)) {
    if (!v) {
      throw new Error("v25.9.0 regression failed for " + k + ": " + JSON.stringify(all2590));
    }
  }
}

console.log("[OK] Full v20.0 + v21.3 + v22.0 + v22.1 + v23.1 + v23.2 + v23.3 + v24.0 + v24.1 + v24.2 + v24.2.9 + v24.2.11 + v24.2.12 + v24.2.13 + v24.2.14 + v24.2.15 + v24.3.0 + v24.3.1 + v24.3.2 + v24.4.0 + v24.4.1 + v25.0 + v25.2 + v25.3 + v25.5.3 + v25.6.0 + v25.6.1 + v25.7.0 + v25.7.1 + v25.7.2 + v25.8.0 + v25.9.0 E2E smoke test PASSED!");
