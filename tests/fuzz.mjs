#!/usr/bin/env node
/**
 * 三好AI狼人殺 — 60 局全流程多角色亂數壓力與不變量測試
 * 涵蓋：6/8 人局、全 5 種玩家身分 (seer/witch/hunter/villager/wolf)、3 難度、警長開關、
 * 觀戰雙陣營競猜 (wolf_hunt / god_hunt)、微表情觀微、呈堂證供、狼隊夜間戰術、平票 PK
 * 執行方式：node tests/fuzz.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const html = fs.readFileSync("ai.html", "utf8");
const jsMatches = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(m => m[1])
  .filter(s => !s.startsWith("http") && !s.startsWith("js/vendor/"));

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
    project() { this.x = 0.2; this.y = 0.1; this.z = 0.5; return this; }
  };
}
function makeColor(c = 0) {
  return { c, r: 0, g: 0, b: 0, setHex(h) { this.c = h; return this; }, set(v) { this.c = v; return this; }, lerp() { return this; }, clone() { return makeColor(this.c); } };
}
function makeObj3D(geo, mat) {
  return {
    geometry: geo || { attributes: { position: { setXYZ() { }, needsUpdate: false } }, dispose() { } },
    material: mat || { color: makeColor(), emissive: makeColor(), emissiveIntensity: 0, opacity: 1, dispose() { } },
    position: makeVec3(), rotation: makeVec3(), scale: makeVec3(1, 1, 1), quaternion: {},
    children: [], visible: true, castShadow: false, receiveShadow: false, frustumCulled: true, userData: {},
    add(...items) { items.forEach(x => this.children.push(x)); },
    remove(item) { const k = this.children.indexOf(item); if (k >= 0) this.children.splice(k, 1); },
    lookAt() { }, updateMatrixWorld() { }, getWorldPosition(t) { return t.copy(this.position); }, traverse() { }
  };
}
function makeGeo() {
  return {
    attributes: { position: { setXYZ() { }, needsUpdate: false } },
    translate() { return this; }, rotateX() { return this; }, rotateY() { return this; },
    setAttribute() { return this; }, setIndex() { return this; }, computeVertexNormals() { return this; }, setFromPoints() { return this; }, dispose() { }
  };
}

const THREE = {
  FrontSide: 0, BackSide: 1, DoubleSide: 2, AdditiveBlending: 2, NearestFilter: 1003, LinearFilter: 1006, RGBAFormat: 1023, RepeatWrapping: 1000,
  PCFSoftShadowMap: 2, sRGBEncoding: 3001, ACESFilmicToneMapping: 4, EquirectangularReflectionMapping: 303,
  Vector2: function (x = 0, y = 0) { this.x = x; this.y = y; },
  Vector3: function (x, y, z) { return makeVec3(x, y, z); },
  Color: function (c) { const col = makeColor(c); col.convertSRGBToLinear = () => col; return col; },
  Plane: function () { return {}; },
  Box3: function () { return { min: makeVec3(-0.5, 0, -0.5), max: makeVec3(0.5, 1.8, 0.5), setFromObject() { return this; }, getSize(v) { v.set(1, 1.8, 1); return v; }, getCenter(v) { v.set(0, 0.9, 0); return v; } }; },
  PMREMGenerator: function () { return { compileEquirectangularShader() { }, fromScene: () => ({ texture: { dispose() { } } }), fromEquirectangular: () => ({ texture: { dispose() { } } }) }; },
  TextureLoader: function () { return { load() { } }; },
  Raycaster: function () { return { setFromCamera() { }, intersectObjects: () => [], intersectObject: () => [], ray: { intersectPlane: (_, t) => { t.set(1, 1.35, -1); return true; } } }; },
  Scene: function () { const o = makeObj3D(); o.fog = null; o.background = null; o.environment = null; return o; },
  Group: function () { return makeObj3D(); },
  Object3D: function () { return makeObj3D(); },
  PerspectiveCamera: function () { const o = makeObj3D(); o.aspect = 1; o.fov = 44; o.updateProjectionMatrix = () => { }; return o; },
  WebGLRenderer: function () { return { shadowMap: {}, outputEncoding: 0, toneMapping: 0, toneMappingExposure: 1, setPixelRatio() { }, setSize() { }, render() { } }; },
  FogExp2: function (c, d) { return { color: makeColor(c), density: d }; },
  DataTexture: function () { return { minFilter: 0, magFilter: 0, generateMipmaps: false, needsUpdate: false, dispose() { } }; },
  CanvasTexture: function () { return { wrapS: 0, wrapT: 0, repeat: { set() { } }, offset: { x: 0, y: 0 }, minFilter: 0, encoding: 0, needsUpdate: false, dispose() { } }; },
  HemisphereLight: function (s, g, i) { const o = makeObj3D(); o.color = makeColor(s); o.groundColor = makeColor(g); o.intensity = i; return o; },
  DirectionalLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; o.shadow = { mapSize: {}, camera: {} }; return o; },
  PointLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; return o; },
  SpotLight: function (c, i) { const o = makeObj3D(); o.color = makeColor(c); o.intensity = i; o.target = null; return o; },
  SphereGeometry: function () { return makeGeo(); }, ConeGeometry: function () { return makeGeo(); }, CylinderGeometry: function () { return makeGeo(); },
  RingGeometry: function () { return makeGeo(); }, TorusGeometry: function () { return makeGeo(); }, OctahedronGeometry: function () { return makeGeo(); },
  CircleGeometry: function () { return makeGeo(); }, PlaneGeometry: function () { return makeGeo(); }, BoxGeometry: function () { return makeGeo(); },
  BufferGeometry: function () { return makeGeo(); }, TubeGeometry: function () { return makeGeo(); }, LatheGeometry: function () { return makeGeo(); },
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
  Line: function (g, m) { return makeObj3D(g, m); }
};

let timerSeq = 1;
const pendingTimers = new Map();
const memStorage = new Map();
const cache = new Map();
const makeEl = id => {
  if (cache.has(id)) return cache.get(id);
  const cl = new Set();
  const obj = {
    id, value: id === "selectModeCount" ? "8" : (id === "selectAiDifficulty" ? "pro" : "seer"),
    checked: false, textContent: "", innerHTML: "", disabled: false, width: 800, height: 420, style: {},
    get className() { return Array.from(cl).join(" "); },
    set className(v) { cl.clear(); String(v || "").split(/\s+/).filter(Boolean).forEach(x => cl.add(x)); },
    classList: {
      add: (...c) => c.forEach(x => cl.add(x)),
      remove: (...c) => c.forEach(x => cl.delete(x)),
      toggle: (c, f) => f === undefined ? (cl.has(c) ? cl.delete(c) : cl.add(c)) : (f ? cl.add(c) : cl.delete(c)),
      contains: c => cl.has(c)
    },
    getAttribute: () => null, setAttribute() { }, addEventListener() { }, removeEventListener() { },
    querySelectorAll: () => [], querySelector: () => null, appendChild() { }, focus() { }, click() { },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 420 }),
    getContext: () => new Proxy({}, { get: (_, p) => p === "measureText" ? () => ({ width: 48 }) : () => ({ addColorStop() { } }) }),
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 420 }) }
  };
  cache.set(id, obj);
  return obj;
};

const sb = {
  THREE, console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Map, Set, Promise,
  Uint8Array, Float32Array, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: (fn, ms) => {
    const id = timerSeq++;
    pendingTimers.set(id, { fn, ms: ms || 0 });
    return id;
  },
  clearTimeout: id => { pendingTimers.delete(id); },
  setInterval: () => timerSeq++,
  clearInterval() { },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame() { },
  performance: { now: () => 1000 },
  document: {
    hidden: false,
    getElementById: makeEl,
    createElement: t => makeEl("dyn_" + t + "_" + Math.random()),
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener() { },
    body: makeEl("body")
  },
  localStorage: {
    getItem: k => memStorage.has(k) ? memStorage.get(k) : null,
    setItem: (k, v) => memStorage.set(k, String(v))
  },
  speechSynthesis: { getVoices: () => [], cancel() { }, speak() { }, paused: false, speaking: false, pending: false },
  SpeechSynthesisUtterance: function (t) { this.text = t; },
  devicePixelRatio: 1, location: { protocol: "file:" },
  addEventListener() { }, removeEventListener() { }
};
sb.window = sb;

const ctx = vm.createContext(sb);
for (const f of jsMatches) {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
}
sb.window.onload();
const gState = vm.runInContext("state", ctx);

const roles = ["seer", "witch", "hunter", "guard", "villager", "wolf"];
const diffs = ["easy", "normal", "pro"];
const forbiddenSpeech = ["女巫", "毒藥", "解藥", "佛光大學", "fgu.edu.tw", "3goodai"];

let goodWins = 0;
let wolfWins = 0;
let pkTriggeredMatches = 0;
let maxDaysSeen = 0;

async function drainMicrotasks() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
  await new Promise(resolve => setImmediate(resolve));
}

function assertMatchInvariants(matchIdx) {
  const s = gState;
  const m = s.match;
  if (!Number.isFinite(m.harmonyScore) || m.harmonyScore < 0 || m.harmonyScore > 100) {
    throw new Error(`Match ${matchIdx}: invalid harmonyScore=${m.harmonyScore}`);
  }
  for (const seat of m.seats) {
    if (!Number.isFinite(seat.microPulse)) {
      throw new Error(`Match ${matchIdx}: invalid microPulse on seat ${seat.id}`);
    }
    for (const [k, val] of Object.entries(seat.suspicionMap || {})) {
      if (!Number.isFinite(val)) {
        throw new Error(`Match ${matchIdx}: NaN suspicionMap[${k}] on seat ${seat.id}`);
      }
    }
  }
  for (const ev of m.allSpeechEvents || []) {
    const txt = String(ev.rawText || "");
    for (const bad of forbiddenSpeech) {
      if (txt.includes(bad)) {
        throw new Error(`Match ${matchIdx}: forbidden term "${bad}" in speech: ${txt}`);
      }
    }
  }
}

for (let i = 0; i < 60; i++) {
  pendingTimers.clear();
  const count = i % 2 === 0 ? "8" : "6";
  const prefRole = roles[i % roles.length];
  const diff = diffs[i % diffs.length];
  const sheriffOn = i % 2 === 1;
  const guardOn = count === "8" && (prefRole === "guard" || i % 4 === 0);

  vm.runInContext(`
    el("selectModeCount").value = ${JSON.stringify(count)};
    el("selectPreferredRole").value = ${JSON.stringify(prefRole)};
    el("selectAiDifficulty").value = ${JSON.stringify(diff)};
    el("chkSheriffMode").checked = ${JSON.stringify(sheriffOn)};
    if (el("chkGuardMode")) el("chkGuardMode").checked = ${JSON.stringify(guardOn)};
    voice.enabled = false;
    state.autoPlay = false;
    startNewGame();
    indieFlow.hideRoleDealRitual();
  `, ctx);

  let steps = 0;
  let sawPk = false;
  while (gState.match.phase !== "GAME_OVER") {
    steps += 1;
    if (steps > 450 || gState.match.day > 14) {
      throw new Error(`Match ${i} (count=${count}, role=${prefRole}, diff=${diff}, sheriff=${sheriffOn}) stalled at phase=${gState.match.phase}, day=${gState.match.day}`);
    }
    if (gState.match.pkCandidates && gState.match.pkCandidates.length >= 2) sawPk = true;

    await drainMicrotasks();
    if (gState.match.phase === "GAME_OVER") break;

    if (gState.typewriter && gState.typewriter.active) {
      ctx.completeCurrentTypewriter(false);
    }

    const ph = gState.match.phase;
    const pSelf = ctx.getPlayerSeat();
    const pid = ctx.getPlayerId();
    const aliveOthers = ctx.getAliveSeats().filter(s => s.id !== pid);

    if (ph === "NIGHT_GUARD" && pSelf && pSelf.alive && pSelf.role === "guard") {
      const aliveAll = ctx.getAliveSeats();
      const gTarget = aliveAll.find(s => s.id !== gState.match.lastGuardTargetId) || null;
      gState.selectedSeatId = gTarget ? gTarget.id : null;
      if (gTarget) ctx.confirmTargetAction();
      else ctx.skipTargetAction();
    } else if (ph === "SHERIFF_ELECTION") {
      ctx.resolveSheriffElectionAction(i % 2 === 0 ? "run" : "pass");
      if (gState.match.phase === "SHERIFF_ELECTION") {
        ctx.resolveSheriffElectionAction("pass");
      }
    } else if (ph === "SHERIFF_ORDER") {
      ctx.resolveSheriffOrderPick(i % 2 === 0 ? 1 : -1);
    } else if (ph === "NIGHT_WOLF" && pSelf && pSelf.alive && pSelf.role === "wolf") {
      const target = aliveOthers.find(s => s.role !== "wolf") || aliveOthers[0];
      gState.match.wolfTactic = ["fake_seer", "deep_stealth", "pack_push"][i % 3];
      gState.selectedSeatId = target ? target.id : null;
      ctx.confirmTargetAction();
    } else if (ph === "NIGHT_SEER" && pSelf && pSelf.alive && pSelf.role === "seer") {
      if (gState.seerReveal) {
        gState.seerReveal = null;
        ctx.proceedToNightWitch();
      } else {
        const checked = (pSelf.checkedHistory || []).map(c => c.targetId);
        const tgt = aliveOthers.find(s => !checked.includes(s.id)) || aliveOthers[0];
        gState.selectedSeatId = tgt ? tgt.id : null;
        ctx.confirmTargetAction();
        gState.seerReveal = null;
        ctx.proceedToNightWitch();
      }
    } else if (ph === "NIGHT_WITCH" && pSelf && pSelf.alive && pSelf.role === "witch") {
      if (gState.match.witchPotions.purify && gState.match.day >= 2 && aliveOthers.length) {
        gState.selectedSeatId = aliveOthers[0].id;
        gState.match.nightState.witchPoisonTarget = aliveOthers[0].id;
        gState.match.witchPotions.purify = false;
        ctx.resolveDawn();
      } else {
        ctx.skipTargetAction();
      }
    } else if (ph === "HUNTER_TRIGGER" && pSelf && !pSelf.alive && pSelf.role === "hunter") {
      if (aliveOthers.length && i % 3 !== 0) {
        gState.selectedSeatId = aliveOthers[0].id;
        ctx.confirmTargetAction();
      } else {
        ctx.skipTargetAction();
      }
    } else if (ph === "SHERIFF_TRANSFER") {
      if (aliveOthers.length && i % 4 !== 0) ctx.resolvePlayerSheriffTransfer(aliveOthers[0].id);
      else ctx.resolvePlayerSheriffTransfer(null);
    } else if (ph === "LAST_WORDS_PLAYER") {
      ctx.submitPlayerLastWords("大家小心帶風向的夥伴！");
    } else if (ph === "DAY_PLAYER_TURN") {
      if (pSelf && pSelf.alive && aliveOthers.length) {
        ctx.inspectSeatMicroExpression(aliveOthers[0].id);
      }
      gState.selectedSeatId = aliveOthers[0] ? aliveOthers[0].id : null;
      if (!gState.match.fourGivingsUsed.joy && ctx.canUseFourGNow()) ctx.useFourGJoy();
      ctx.preparePlayerSpeechPanel();
      if ((gState.match.pinnedClues || []).length) {
        const clue = gState.match.pinnedClues[0];
        gState.match.pendingEvidenceTargetId = clue.seatId;
        gState.match.pendingEvidenceClueId = clue.id;
        ctx.el("playerSpeechInput").value = clue.summary;
      }
      ctx.submitPlayerSpeech();
    } else if (ph === "DAY_VOTE") {
      if (gState.voteFlight && typeof gState.voteFlight.finish === "function") {
        gState.voteFlight.finish();
      } else if (ctx.isPlayerEligibleToVote()) {
        if (gState.match.sheriffSeatId === pid && aliveOthers.length) {
          gState.selectedSeatId = aliveOthers[0].id;
          ctx.useSheriffRallyCall();
        }
        const cand = aliveOthers.find(s => ctx.isValidVoteTarget(s.id)) || null;
        ctx.finalizeVoteRound(cand ? cand.id : null);
        if (gState.voteFlight && typeof gState.voteFlight.finish === "function") {
          gState.voteFlight.finish();
        }
      } else {
        const stId = gState.stepTimer;
        if (stId && pendingTimers.has(stId)) {
          const entry = pendingTimers.get(stId);
          pendingTimers.delete(stId);
          entry.fn();
        } else {
          ctx.finalizeVoteRound(null);
        }
      }
    } else if (ph === "DAY_VOTE_RESULT") {
      if (pSelf && !pSelf.alive && ctx.isSpectatorGuessActive() && !gState.match.spectatorGuess.locked) {
        const mode = ctx.getSpectatorGuessMode();
        if (mode === "wolf_hunt") {
          aliveOthers.slice(0, 2).forEach(s => ctx.toggleSpectatorWolfGuess(s.id));
        } else if (mode === "god_hunt") {
          ctx.getActiveGodRoleKeys().forEach((rk, kIdx) => {
            ctx.selectSpectatorGodSlot(rk);
            const gCand = aliveOthers.filter(s => s.role !== "wolf")[kIdx];
            if (gCand) ctx.assignSpectatorGodGuess(gCand.id);
          });
        }
        ctx.lockSpectatorGuess();
      }
      const vr = gState.voteResultPayload;
      gState.voteResultPayload = null;
      if (vr && typeof vr.onContinue === "function") vr.onContinue();
      else ctx.beginNightPhase();
    } else if (ph === "DAY_SPEECH" || ph === "LAST_WORDS_SPEECH") {
      const stId = gState.stepTimer;
      if (stId && pendingTimers.has(stId)) {
        const entry = pendingTimers.get(stId);
        pendingTimers.delete(stId);
        entry.fn();
      } else if (ph === "LAST_WORDS_SPEECH") {
        ctx.advanceLastWordsQueue();
      } else {
        ctx.advanceSpeechQueue();
      }
    } else {
      // AI night timers (NIGHT_WOLF / NIGHT_SEER / NIGHT_WITCH / HUNTER_TRIGGER)
      const stId = gState.stepTimer;
      if (stId && pendingTimers.has(stId)) {
        const entry = pendingTimers.get(stId);
        pendingTimers.delete(stId);
        entry.fn();
      } else if (pendingTimers.size > 0) {
        const [firstKey, firstVal] = pendingTimers.entries().next().value;
        pendingTimers.delete(firstKey);
        firstVal.fn();
      } else {
        throw new Error(`Match ${i}: no timer or handler for phase=${ph}`);
      }
    }

    assertMatchInvariants(i);
  }

  const w = gState.match.winner;
  if (w === "good") goodWins += 1;
  else if (w === "wolf") wolfWins += 1;
  else throw new Error(`Match ${i}: unexpected winner=${w}`);
  if (sawPk) pkTriggeredMatches += 1;
  if (gState.match.day > maxDaysSeen) maxDaysSeen = gState.match.day;

  ctx.resetMatchToLobby();
  if (gState.match.started || gState.match.phase !== "LOBBY" || gState.match.seats.length !== 0) {
    throw new Error(`Match ${i}: resetMatchToLobby left dirty state!`);
  }
}

console.log(`[OK] 60-match full-game fuzz & invariant suite PASSED! (goodWins=${goodWins}, wolfWins=${wolfWins}, pkMatches=${pkTriggeredMatches}, maxDays=${maxDaysSeen})`);
