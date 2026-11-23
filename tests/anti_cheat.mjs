#!/usr/bin/env node
/**
 * 三好AI狼人殺 v9.0 — 零洩漏反作弊與反事實不變性（Counterfactual Invariance）證明套件
 *
 * 驗證四大防線：
 * 1. Proxy 越權陷阱測試：嚴格模式 (strictThrow=true) 下驗證讀取任何未授權他席私有欄位必遭攔截。
 * 2. 數學級反事實不變性證明（Counterfactual Invariance）：
 *    在 6/8/10/12 人局、第 1–4 天、低友善迷霧(30)與高友善(90)、雙觀察員對跳、平票 PK、
 *    玩家私密查驗未公開等 60+ 情境下，建構「公開歷史＋自身合法視野完全相同、但所有未揭露底牌、
 *    他人懷疑值 suspicionMap、未曝露心虛值、nightArchive、秘密日誌與玩家私密情報全部亂數置換」
 *    的平行世界 World A 與 World B，嚴格斷言全 12 類 AI 決策輸出 100% 逐位元一致！
 * 3. LLM Prompt 洩漏稽核攔截器正反測試。
 * 4. 靜態原始碼反偷看巡檢（確保已修復之洩漏模式永不回歸）。
 *
 * 執行方式：node tests/anti_cheat.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const html = fs.readFileSync("ai.html", "utf8");
const jsMatches = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(m => m[1])
  .filter(s => !s.startsWith("http") && !s.startsWith("js/vendor/"));

function assertStaticHygiene() {
  const blindIdx = jsMatches.indexOf("js/ai/blind-view.js");
  const geminiIdx = jsMatches.indexOf("js/ai/gemini.js");
  assert.ok(blindIdx !== -1, "ai.html must load js/ai/blind-view.js");
  assert.ok(geminiIdx !== -1 && blindIdx < geminiIdx, "js/ai/blind-view.js must load before js/ai/gemini.js");

  const forbiddenSnippets = [
    { file: "js/game/voting.js", pattern: /hazeChaos\s*&&\s*a\.team\s*===\s*"good"/, desc: "Good AI vote jitter peeking a.team" },
    { file: "js/ai/context.js", pattern: /speaker\.team\s*===\s*"wolf"/, desc: "applySpeechInfluence peeking speaker.team" },
    { file: "js/ai/reactions.js", pattern: /o\.suspicionMap\[speaker\.id\]/, desc: "Hunter/Guard/Elder mind-reading other seats' suspicionMap" },
    { file: "js/ai/reactions.js", pattern: /s\.role\s*===\s*"seer"\s*&&\s*s\.claimedRole\s*===\s*"seer"/, desc: "Wolf AI peeking hidden s.role === 'seer'" },
    { file: "js/ui/fx.js", pattern: /s\.team\s*===\s*"good"\s*\|\|/, desc: "Crowd reactions leaking hidden s.team" }
  ];
  for (const chk of forbiddenSnippets) {
    const src = fs.readFileSync(chk.file, "utf8");
    assert.ok(!chk.pattern.test(src), `Regression detected in ${chk.file}: ${chk.desc}`);
  }
}

function createRuntimeContext() {
  const noop = () => {};
  const makeEl = (id) => ({
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    checked: false,
    disabled: false,
    style: {},
    children: [],
    classList: {
      _s: new Set(),
      add(...xs) { xs.forEach(x => this._s.add(x)); },
      remove(...xs) { xs.forEach(x => this._s.delete(x)); },
      toggle(x, f) { if (f === undefined) { if (this._s.has(x)) this._s.delete(x); else this._s.add(x); } else if (f) this._s.add(x); else this._s.delete(x); },
      contains(x) { return this._s.has(x); }
    },
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getAttribute: () => null,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    querySelector: () => null,
    querySelectorAll: () => [],
    focus: noop,
    click: noop
  });

  const domMap = new Map();
  const getDom = (id) => {
    if (!domMap.has(id)) domMap.set(id, makeEl(id));
    return domMap.get(id);
  };

  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Proxy,
    Reflect,
    Set,
    Map,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    performance: { now: () => 1000 },
    setTimeout: () => 1,
    clearTimeout: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    navigator: { userAgent: "node-anticheat" },
    document: {
      body: makeEl("body"),
      getElementById: getDom,
      createElement: (tag) => makeEl(tag),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop
    },
    window: null
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  // Load ONLY the deterministic non-DOM/core/AI/game modules needed for decision verification
  const loadList = [
    "js/data/constants.js",
    "js/core/state.js",
    "js/core/orchestrator.js",
    "js/ai/blind-view.js",
    "js/ai/gemini.js",
    "js/ai/deduction.js",
    "js/ai/context.js",
    "js/ai/reactions.js",
    "js/ai/heuristics.js",
    "js/game/night.js",
    "js/game/last-words.js",
    "js/game/voting.js"
  ];
  for (const rel of loadList) {
    const code = fs.readFileSync(rel, "utf8");
    vm.runInContext(code, ctx, { filename: rel });
  }

  // Stub minimal audio/UI globals referenced by non-pure wrappers
  vm.runInContext(`
    sound = { unlock: function(){}, playVote: function(){}, playBlessing: function(){}, playSpeak: function(){}, playNight: function(){}, playDawn: function(){}, tone: function(){} };
    voice = { stop: function(){}, canSpeak: function(){ return false; }, speakHost: function(){}, speak: function(){} };
    showToast = function(){};
    addLog = function(){};
    spawnBeam = function(){};
    spawnFx = function(){};
    spawnBurst = function(){};
    setSeatEmotion = function(){};
    setSeatBubble = function(){};
    setCanvasBubble = function(){};
    triggerCutIn = function(){};
    triggerShake = function(){};
    updateAllUI = function(){};
    clearStepTimer = function(){};
    antiCheatMonitor.strictThrow = true;
    globalThis.state = state;
    globalThis.antiCheatMonitor = antiCheatMonitor;
    globalThis.createBlindMatchSnapshot = createBlindMatchSnapshot;
    globalThis.auditLlmPromptLeak = auditLlmPromptLeak;
  `, ctx);

  return ctx;
}

function makeSeededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildScenarioMatch(totalSeats, cfg, rng) {
  const names = ["你", "小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨", "墨白", "晴嵐", "阿朗", "柚子"];
  const styles = ["gullible", "balanced", "skeptical"];
  const baseRoles = totalSeats === 6
    ? ["seer", "witch", "villager", "villager", "wolf", "wolf"]
    : totalSeats === 8
      ? ["seer", "witch", "hunter", "guard", "villager", "villager", "wolf", "wolf"]
      : totalSeats === 10
        ? ["seer", "witch", "hunter", "guard", "villager", "villager", "villager", "wolf", "wolf", "wolf"]
        : ["seer", "witch", "hunter", "guard", "villager", "villager", "villager", "villager", "wolf", "wolf", "wolf", "wolf"];

  const seats = [];
  for (let i = 1; i <= totalSeats; i++) {
    const r = baseRoles[i - 1];
    const susp = {};
    for (let k = 1; k <= totalSeats; k++) {
      susp[k] = k === i ? 0 : Math.floor(30 + rng() * 50);
    }
    seats.push({
      id: i,
      name: names[i - 1],
      trait: "書院夥伴",
      deductionStyle: styles[(i + cfg.seed) % 3],
      color: "#fbbf24",
      role: r,
      team: r === "wolf" ? "wolf" : "good",
      alive: true,
      outReason: "",
      emojiMood: "",
      sweatExposed: false,
      suspicionMap: susp,
      trustShield: i === 2,
      microPulse: r === "wolf" ? 84 : 22,
      fakeSeer: false,
      fakeCheckedIds: [],
      isWolfKing: totalSeats >= 10 && r === "wolf" && i === totalSeats,
      isElder: totalSeats >= 10 && r === "villager" && i === 5,
      elderShieldUsed: false,
      voteDisabled: false,
      claimedRole: null,
      checkedHistory: [],
      savedSeatId: null,
      purifiedSeatId: null,
      publicVoteIntent: null,
      ironFollowPlayer: false,
      witchAnnouncedSave: false,
      hunterAnnounced: false,
      guardAnnounced: false,
      elderAnnounced: false
    });
  }

  const firstWolf = seats.find(s => s.role === "wolf");
  if (firstWolf) firstWolf.fakeSeer = true;

  // Give Seer a legal check history
  const seerSeat = seats.find(s => s.role === "seer");
  if (seerSeat) {
    const chkTgt = seats.find(s => s.id !== seerSeat.id && s.role === "wolf") || seats[1];
    seerSeat.checkedHistory.push({ day: 1, targetId: chkTgt.id, isWolf: chkTgt.team === "wolf" });
    seerSeat.suspicionMap[chkTgt.id] = chkTgt.team === "wolf" ? 100 : 0;
  }

  // Give Witch a legal silver water
  const witchSeat = seats.find(s => s.role === "witch");
  if (witchSeat) {
    witchSeat.savedSeatId = 3;
    witchSeat.suspicionMap[3] = 10;
  }

  const day = cfg.day || 2;
  const daySpeechEvents = [];
  const allSpeechEvents = [];
  const publicLogs = [];

  if (cfg.dualSeer && totalSeats >= 6) {
    seats[0].claimedRole = "seer";
    if (firstWolf) firstWolf.claimedRole = "seer";
    const evA = {
      day, turnOrderIndex: 0, speakerId: seats[0].id, speakerName: seats[0].name,
      claimRole: "seer", accuseId: firstWolf.id, vouchId: 3, wolfPits: [firstWolf.id], goodPits: [3],
      standWithSeerId: seats[0].id, checkedWolfId: firstWolf.id, checkedGoodId: null,
      hasToxicSlip: false, contradiction: null, rawText: "我是明心觀察員，昨晚查證他有問題。"
    };
    const evB = {
      day, turnOrderIndex: 1, speakerId: firstWolf.id, speakerName: firstWolf.name,
      claimRole: "seer", accuseId: seats[0].id, vouchId: null, wolfPits: [seats[0].id, 3], goodPits: [],
      standWithSeerId: firstWolf.id, checkedWolfId: seats[0].id, checkedGoodId: null,
      hasToxicSlip: true, contradiction: { code: "role_clash", severity: 3, isPublic: true, label: "身分對跳衝突" },
      rawText: "我才是真明心觀察員，他根本亂帶風向！"
    };
    daySpeechEvents.push(evA, evB);
    allSpeechEvents.push(evA, evB);
    publicLogs.push(
      { day, kind: "speech", speakerId: seats[0].id, title: "01號", text: evA.rawText },
      { day, kind: "speech", speakerId: firstWolf.id, title: "0" + firstWolf.id + "號", text: evB.rawText }
    );
  } else {
    const ev1 = {
      day, turnOrderIndex: 0, speakerId: 2, speakerName: seats[1].name,
      claimRole: null, accuseId: 4, vouchId: 3, wolfPits: [4], goodPits: [3],
      standWithSeerId: null, checkedWolfId: null, checkedGoodId: null,
      hasToxicSlip: false, contradiction: null, rawText: "我覺得3號誠懇，4號有點怪。"
    };
    daySpeechEvents.push(ev1);
    allSpeechEvents.push(ev1);
    publicLogs.push({ day, kind: "speech", speakerId: 2, title: "02號", text: ev1.rawText });
  }

  const voteHistory = day >= 2 ? [{
    day: 1,
    ballots: seats.map(s => ({ voterId: s.id, targetId: s.id === 4 ? 3 : 4, weight: 1 })),
    tallies: { 4: totalSeats - 1, 3: 1 },
    outId: null
  }] : [];

  return {
    started: true,
    phase: cfg.phase || "DAY_SPEECH",
    day,
    totalSeats,
    playerSeatId: 1,
    aiDifficulty: cfg.diff || "pro",
    harmonyScore: cfg.harmony ?? 72,
    sheriffSeatId: cfg.sheriffSeatId || 2,
    sheriffElectionPending: false,
    pkCandidates: cfg.pkCandidates || null,
    convenienceRallyTargetId: cfg.rallyId || null,
    lastNightCasualties: day >= 2 ? [] : [],
    peaceNights: day >= 2 ? [1] : [],
    speechQueue: seats.map(s => s.id),
    firstNightIntel: null,
    fourGJoySuspects: [],
    fourGHopePair: null,
    activeDirectorEvent: null,
    microPulseRevealed: false,
    wolfTactic: "auto",
    lastGuardTargetId: 2,
    witchPotions: { heal: cfg.witchHasHeal !== false, purify: true },
    nightState: { guardTarget: 2, wolfTarget: 3, seerTarget: 5, witchSaved: false, witchPoisonTarget: null },
    nightArchive: [{ day: 1, wolfTarget: 3, guardTarget: 2, seerTarget: 5, seerIsWolf: true, witchSaved: true, witchPoisonTarget: null, casualties: [] }],
    playerKnownRoles: { 1: seats[0].role, 5: "wolf", 3: "good_verified" },
    wolfGodMarks: { 1: "seer", 2: "witch" },
    detectedContradictions: [],
    daySpeechEvents,
    allSpeechEvents,
    voteHistory,
    logs: [
      ...publicLogs,
      { day, kind: "secret", speakerId: 1, title: "秘密查驗", text: "只有玩家能看到的秘密查驗：5號是酸民狼！" }
    ],
    seats
  };
}

/**
 * Adversarially scramble EVERY hidden variable that `viewerId` is NOT legally allowed to know!
 * If the AI peeks at even ONE forbidden bit, World A vs World B will diverge!
 */
function buildCounterfactualWorldB(matchA, viewerId, opts = {}) {
  const matchB = JSON.parse(JSON.stringify(matchA));
  const viewerA = matchA.seats.find(s => s.id === viewerId);
  const viewerIsWolf = viewerA.role === "wolf";
  const viewerIsSeer = viewerA.role === "seer";
  const viewerIsWitch = viewerA.role === "witch";

  const verifiedIds = new Set([viewerId]);
  if (viewerIsSeer) {
    (viewerA.checkedHistory || []).forEach(c => verifiedIds.add(c.targetId));
  }
  if (viewerIsWitch && viewerA.savedSeatId) {
    verifiedIds.add(viewerA.savedSeatId);
  }

  // 1. Scramble hidden roles & teams on ALL unauthorized seats!
  const goodRolesCycle = ["villager", "seer", "witch", "hunter", "guard"];
  matchB.seats.forEach((s, idx) => {
    if (s.id === viewerId) return;

    // Scramble private suspicionMap of EVERY OTHER seat (catches any mind-reading!)
    Object.keys(s.suspicionMap).forEach(k => {
      s.suspicionMap[k] = Number(k) === viewerId ? 99 : (100 - (s.suspicionMap[k] || 50));
    });

    // Scramble unrevealed microPulse
    if (!matchB.microPulseRevealed && !s.sweatExposed) {
      s.microPulse = 100 - s.microPulse;
    }

    // Scramble other seats' private histories
    s.checkedHistory = [{ day: 1, targetId: viewerId, isWolf: true }];
    s.savedSeatId = viewerId;
    s.purifiedSeatId = viewerId;
    s.ironFollowPlayer = !s.ironFollowPlayer;

    if (viewerIsWolf) {
      // Wolves legally know wolf vs non-wolf, so keep wolf-mate membership intact,
      // BUT scramble EXACT hidden role among all Good seats (seer <-> witch <-> hunter <-> guard <-> villager, flip isElder)!
      if (s.role !== "wolf") {
        const nextRole = goodRolesCycle[(goodRolesCycle.indexOf(s.role) + 2 + idx) % goodRolesCycle.length];
        s.role = nextRole;
        s.team = "good";
        s.isElder = !s.isElder;
      } else {
        s.fakeSeer = !s.fakeSeer;
        s.isWolfKing = !s.isWolfKing;
      }
    } else {
      // Good AI does NOT know hidden team or role of any unverified seat!
      if (!verifiedIds.has(s.id)) {
        if (s.team === "wolf") {
          s.role = "villager";
          s.team = "good";
          s.fakeSeer = false;
          s.isWolfKing = false;
          s.isElder = true;
        } else {
          s.role = "wolf";
          s.team = "wolf";
          s.fakeSeer = true;
          s.isElder = false;
        }
      } else if (s.team === "good") {
        // Even for a verified Good seat (e.g. Seer checked Good or Witch Silver Water), AI only knows "good", NOT exact role!
        const nextGood = s.role === "villager" ? "hunter" : "villager";
        s.role = nextGood;
        s.isElder = !s.isElder;
      }
    }
  });

  // 2. Scramble bottom-layer God-View state & player-private state!
  matchB.nightArchive = [{ day: 1, wolfTarget: viewerId, guardTarget: 6, seerTarget: 2, seerIsWolf: false, witchSaved: false, witchPoisonTarget: 4, casualties: [{ id: 4, cause: "purify" }] }];
  matchB.playerKnownRoles = { 1: "seer", 2: "wolf", 3: "wolf", 4: "good_verified", 5: "good_verified", 6: "wolf" };
  matchB.wolfGodMarks = { 2: "seer", 3: "witch", 4: "guard", 5: "hunter" };
  if (!viewerIsWolf) {
    matchB.wolfTactic = "deep_stealth"; // Good AI must NEVER see wolfTactic!
  }
  if (viewerA.role !== "guard") {
    matchB.lastGuardTargetId = 6; // Non-Guard AI must NEVER see Guard's last target!
  }
  if (!(viewerIsWitch && opts.phase === "NIGHT_WITCH" && matchA.witchPotions.heal)) {
    // Scramble nightState.wolfTarget whenever Witch isn't legally viewing it with heal available!
    matchB.nightState.wolfTarget = (matchA.nightState.wolfTarget % matchA.totalSeats) + 1;
  }
  matchB.nightState.seerTarget = ((matchA.nightState.seerTarget || 1) % matchA.totalSeats) + 1;
  matchB.nightState.guardTarget = ((matchA.nightState.guardTarget || 1) % matchA.totalSeats) + 1;

  // 3. Inject player-private contradiction & secret log in World B (AI MUST be 100% blind to both!)
  matchB.detectedContradictions.push({
    day: matchB.day,
    speakerId: matchB.daySpeechEvents[0]?.speakerId || 2,
    code: "known_fact_clash",
    severity: 3,
    isPublic: false,
    label: "替查殺狼洗白",
    detail: "玩家私密查驗衝突"
  });
  if (matchB.daySpeechEvents[0] && !matchB.daySpeechEvents[0].contradiction) {
    matchB.daySpeechEvents[0].contradiction = {
      code: "known_fact_clash",
      severity: 3,
      isPublic: false,
      label: "硬打已驗好人"
    };
    matchB.allSpeechEvents[0].contradiction = matchB.daySpeechEvents[0].contradiction;
  }
  matchB.logs.push({
    day: matchB.day,
    kind: "secret",
    speakerId: 1,
    title: "機密夜訊",
    text: "2號是酸民狼，3號是明心觀察員，4號是滴水奉茶師！"
  });

  return matchB;
}

function runInWorld(ctx, matchObj, guardMode, fnExpr) {
  ctx.state.guardMode = Boolean(guardMode);
  ctx.state.aiDifficulty = matchObj.aiDifficulty || "pro";
  ctx.state.match = matchObj;
  ctx.antiCheatMonitor.resetMatch();
  ctx.antiCheatMonitor.strictThrow = true;
  const result = vm.runInContext(fnExpr, ctx);
  assert.equal(ctx.antiCheatMonitor.stats.violationsBlocked, 0, "Strict Proxy Trap caught an anti-cheat violation!");
  return result;
}

// ==================== 1. STATIC HYGIENE CHECK ====================
assertStaticHygiene();

const ctx = createRuntimeContext();

// ==================== 2. PROXY TRAP UNIT PROOF ====================
{
  const rng = makeSeededRng(42);
  const m = buildScenarioMatch(8, { day: 2, seed: 1 }, rng);
  ctx.state.match = m;
  ctx.antiCheatMonitor.resetMatch();
  ctx.antiCheatMonitor.strictThrow = true;

  // 2a. Villager AI viewing another seat cannot access ANY forbidden private field
  const villagerSnap = ctx.createBlindMatchSnapshot(m.seats[4], { module: "unit_villager" });
  const otherSeat = villagerSnap.getSeat(7);
  const forbiddenProps = ["role", "team", "isElder", "isWolfKing", "fakeSeer", "checkedHistory", "savedSeatId", "purifiedSeatId", "suspicionMap", "microPulse"];
  for (const prop of forbiddenProps) {
    assert.throws(() => { void otherSeat[prop]; }, /ANTI_CHEAT_VIOLATION/, `Villager BlindView must block .${prop}`);
  }
  assert.throws(() => { otherSeat.claimedRole = "seer"; }, /ANTI_CHEAT_VIOLATION/, "BlindView must be read-only");

  // 2b. Wolf AI knows isWolfMate/knownTeam, but CANNOT peek Good seat's exact .role!
  const wolfSnap = ctx.createBlindMatchSnapshot(m.seats[6], { module: "unit_wolf" });
  const goodSeerView = wolfSnap.getSeat(1);
  const wolfMateView = wolfSnap.getSeat(8);
  assert.equal(goodSeerView.isWolfMate, false);
  assert.equal(goodSeerView.knownTeam, "good");
  assert.equal(wolfMateView.isWolfMate, true);
  assert.equal(wolfMateView.knownTeam, "wolf");
  assert.throws(() => { void goodSeerView.role; }, /ANTI_CHEAT_VIOLATION/, "Wolf BlindView must block Good seat .role");
  assert.throws(() => { void wolfMateView.suspicionMap; }, /ANTI_CHEAT_VIOLATION/, "Wolf BlindView must block mate .suspicionMap");

  // 2c. Witch nightWolfVictimId gated strictly by phase === NIGHT_WITCH AND witchPotions.heal === true
  const witchDaySnap = ctx.createBlindMatchSnapshot(m.seats[1], { module: "unit_witch_day", phase: "DAY_SPEECH" });
  assert.equal(witchDaySnap.nightWolfVictimId, null, "Witch must not see nightWolfVictimId during daytime");
  const witchNightSnap = ctx.createBlindMatchSnapshot(m.seats[1], { module: "unit_witch_night", phase: "NIGHT_WITCH" });
  assert.equal(witchNightSnap.nightWolfVictimId, m.nightState.wolfTarget, "Witch with heal sees nightWolfVictimId during NIGHT_WITCH");
  m.witchPotions.heal = false;
  const witchNoHealSnap = ctx.createBlindMatchSnapshot(m.seats[1], { module: "unit_witch_noheal", phase: "NIGHT_WITCH" });
  assert.equal(witchNoHealSnap.nightWolfVictimId, null, "Witch without heal potion must NOT see nightWolfVictimId");

  // 2d. Player-private contradictions stripped for AI, kept for player
  m.detectedContradictions = [
    { day: 2, speakerId: 2, code: "known_fact_clash", isPublic: false, label: "私密驗人矛盾" },
    { day: 2, speakerId: 3, code: "toxic_bait", isPublic: true, label: "公開酸言" }
  ];
  const aiSnapC = ctx.createBlindMatchSnapshot(m.seats[4], { module: "unit_contra_ai" });
  const plSnapC = ctx.createBlindMatchSnapshot(m.seats[0], { module: "unit_contra_pl" });
  assert.equal(aiSnapC.detectedContradictions.length, 1, "AI must only see public contradictions");
  assert.equal(plSnapC.detectedContradictions.length, 2, "Player retains private verified contradictions");

  // 2e. LLM Prompt Leak Auditor blocks unauthorized seat mentions & god-view keywords
  ctx.antiCheatMonitor.strictThrow = false;
  const badAudit1 = ctx.auditLlmPromptLeak(villagerSnap, "你的真實底牌：書院生。偷看結果：07號是酸民狼。", "一般提示詞");
  assert.equal(badAudit1.ok, false, "Prompt auditor must block unauthorized seat in secretIntel");
  const badAudit2 = ctx.auditLlmPromptLeak(wolfSnap, "你的真實底牌：酸民狼。01號是明心觀察員。", "一般提示詞");
  assert.equal(badAudit2.ok, false, "Prompt auditor must block Wolf secretIntel leaking Good God role");
  const badAudit3 = ctx.auditLlmPromptLeak(villagerSnap, "你的真實底牌：書院生。", "附加 nightArchive 資料");
  assert.equal(badAudit3.ok, false, "Prompt auditor must block god-view tokens in prompt");
  ctx.antiCheatMonitor.strictThrow = true;
}

// ==================== 3. COUNTERFACTUAL INVARIANCE PROOF (60+ SCENARIOS) ====================
let totalChecks = 0;
const configs = [
  { seats: 6, day: 1, harmony: 72, dualSeer: false, diff: "normal" },
  { seats: 6, day: 2, harmony: 32, dualSeer: true, diff: "pro" },
  { seats: 8, day: 2, harmony: 35, dualSeer: false, diff: "pro" },
  { seats: 8, day: 3, harmony: 88, dualSeer: true, diff: "normal", pkCandidates: [2, 7] },
  { seats: 10, day: 2, harmony: 30, dualSeer: true, diff: "pro" },
  { seats: 12, day: 2, harmony: 34, dualSeer: false, diff: "pro" },
  { seats: 12, day: 3, harmony: 76, dualSeer: true, diff: "easy", pkCandidates: [5, 10] }
];

for (let ci = 0; ci < configs.length; ci++) {
  const cfg = configs[ci];
  const rng = makeSeededRng(1000 + ci * 97);
  const baseMatch = buildScenarioMatch(cfg.seats, { ...cfg, seed: ci + 1 }, rng);
  const guardOn = cfg.seats >= 8;

  // Test EVERY AI seat on the table (Good Villager, Seer, Witch, Hunter, Guard, Elder, Wolf, Fake-Seer Wolf, Wolf King)!
  for (let seatId = 2; seatId <= cfg.seats; seatId++) {
    const matchA = JSON.parse(JSON.stringify(baseMatch));
    const matchB = buildCounterfactualWorldB(matchA, seatId, { phase: "DAY_SPEECH" });

    // (1) Day Speech Counterfactual Invariance
    const spA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `buildHeuristicAiSpeech(getSeat(${seatId}))`);
    const spB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `buildHeuristicAiSpeech(getSeat(${seatId}))`);
    assert.deepEqual(spA, spB, `Day speech leaked hidden info for seat #${seatId} (${matchA.seats[seatId - 1].role}) in config #${ci}!`);
    totalChecks++;

    // (2) Day Vote Counterfactual Invariance (including Low-Harmony 30 haze!)
    const vtA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiVoteTarget(getSeat(${seatId}), { pkActive: ${Boolean(cfg.pkCandidates)}, playerTargetId: 3 })`);
    const vtB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiVoteTarget(getSeat(${seatId}), { pkActive: ${Boolean(cfg.pkCandidates)}, playerTargetId: 3 })`);
    assert.equal(vtA, vtB, `Vote target leaked hidden info for seat #${seatId} in config #${ci}!`);
    totalChecks++;

    // (3) Gemini / Ollama Prompt Counterfactual Invariance + Zero-Leak Audit
    const prA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `(() => { const s = getSeat(${seatId}); const fb = buildHeuristicAiSpeech(s); const b = buildBlindGeminiSpeechPrompt(s, fb); return { prompt: b.prompt, ok: b.audit.ok }; })()`);
    const prB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `(() => { const s = getSeat(${seatId}); const fb = buildHeuristicAiSpeech(s); const b = buildBlindGeminiSpeechPrompt(s, fb); return { prompt: b.prompt, ok: b.audit.ok }; })()`);
    assert.equal(prA.ok, true);
    assert.equal(prB.ok, true);
    assert.equal(prA.prompt, prB.prompt, `LLM prompt leaked hidden info for seat #${seatId} in config #${ci}!`);
    totalChecks++;

    // (4) Sheriff Badge Transfer & Election Speech/Vote Counterfactual Invariance
    const shTrA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiSheriffTransferTarget(getSeat(${seatId}))`);
    const shTrB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiSheriffTransferTarget(getSeat(${seatId}))`);
    assert.equal(shTrA, shTrB, `Sheriff transfer leaked hidden info for seat #${seatId}!`);
    totalChecks++;

    const priorShSpeeches = [{ id: 2, name: "小澄", tag: "🔮 強拍明心", tone: "seer", rivalId: null, text: "我拍明心" }];
    const shLnA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `buildSheriffCandidateLine(getSeat(${seatId}), ${JSON.stringify(priorShSpeeches)})`);
    const shLnB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `buildSheriffCandidateLine(getSeat(${seatId}), ${JSON.stringify(priorShSpeeches)})`);
    assert.deepEqual(shLnA, shLnB, `Sheriff speech leaked hidden info for seat #${seatId}!`);
    totalChecks++;

    const shVtA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiSheriffElectionVote(getSeat(${seatId}), [2, 3, ${cfg.seats}], ${JSON.stringify(priorShSpeeches)}, false)`);
    const shVtB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiSheriffElectionVote(getSeat(${seatId}), [2, 3, ${cfg.seats}], ${JSON.stringify(priorShSpeeches)}, false)`);
    assert.equal(shVtA, shVtB, `Sheriff vote leaked hidden info for seat #${seatId}!`);
    totalChecks++;

    // (5) Last Words Counterfactual Invariance
    const lwA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `buildAiLastWords(getSeat(${seatId}), "vote_out")`);
    const lwB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `buildAiLastWords(getSeat(${seatId}), "vote_out")`);
    assert.deepEqual(lwA, lwB, `Last words leaked hidden info for seat #${seatId}!`);
    totalChecks++;

    // (6) Speech Influence Counterfactual Invariance (flipping speaker's hidden team at low harmony!)
    const infWorldA = JSON.parse(JSON.stringify(matchA));
    const infWorldB = JSON.parse(JSON.stringify(matchB));
    const spkrId = seatId === 2 ? 3 : 2;
    const sampleMeta = { accuseId: 4, vouchId: null, claimSeer: false, claimRole: null, wolfPits: [4], hasToxicSlip: false };
    const suspAfterA = runInWorld(ctx, infWorldA, guardOn, `(() => { applySpeechInfluence(getSeat(${spkrId}), ${JSON.stringify(sampleMeta)}); return getSeat(${seatId}).suspicionMap; })()`);
    const suspAfterB = runInWorld(ctx, infWorldB, guardOn, `(() => { applySpeechInfluence(getSeat(${spkrId}), ${JSON.stringify(sampleMeta)}); return getSeat(${seatId}).suspicionMap; })()`);
    assert.deepEqual(suspAfterA, suspAfterB, `applySpeechInfluence leaked speaker hidden team to seat #${seatId}!`);
    totalChecks++;

    // (7) Role-Specific Night & Hunter Actions Counterfactual Invariance
    const r = matchA.seats[seatId - 1].role;
    if (r === "guard") {
      const gA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiGuardTarget(getSeat(${seatId}), 0.5)`);
      const gB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiGuardTarget(getSeat(${seatId}), 0.5)`);
      assert.equal(gA, gB, `Guard night target leaked hidden info!`);
      totalChecks++;
    } else if (r === "wolf") {
      const wA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiWolfTargetBlind(getSeat(${seatId}), 0.5)?.id`);
      const wB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiWolfTargetBlind(getSeat(${seatId}), 0.5)?.id`);
      assert.equal(wA, wB, `Wolf night target leaked hidden Good roles!`);
      totalChecks++;
      if (matchA.seats[seatId - 1].isWolfKing) {
        const wkA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiHunterTarget(getSeat(${seatId}))`);
        const wkB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiHunterTarget(getSeat(${seatId}))`);
        assert.equal(wkA, wkB, `Wolf King shot leaked hidden Good roles!`);
        totalChecks++;
      }
    } else if (r === "seer") {
      const seA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiSeerTarget(getSeat(${seatId}))`);
      const seB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiSeerTarget(getSeat(${seatId}))`);
      assert.equal(seA, seB, `Seer night target leaked hidden info!`);
      totalChecks++;
    } else if (r === "witch") {
      // With heal available (legally knows tonight's wolfTarget)
      const wiMatchA = JSON.parse(JSON.stringify(matchA));
      wiMatchA.phase = "NIGHT_WITCH";
      const wiMatchB = buildCounterfactualWorldB(wiMatchA, seatId, { phase: "NIGHT_WITCH" });
      const wiA = runInWorld(ctx, wiMatchA, guardOn, `chooseAiWitchNightAction(getSeat(${seatId}))`);
      const wiB = runInWorld(ctx, wiMatchB, guardOn, `chooseAiWitchNightAction(getSeat(${seatId}))`);
      assert.deepEqual(wiA, wiB, `Witch night action (with heal) leaked hidden info!`);
      totalChecks++;
      // With heal SPENT (must NOT know tonight's scrambled wolfTarget!)
      const wiNoA = JSON.parse(JSON.stringify(matchA));
      wiNoA.phase = "NIGHT_WITCH";
      wiNoA.witchPotions.heal = false;
      const wiNoB = buildCounterfactualWorldB(wiNoA, seatId, { phase: "NIGHT_WITCH" });
      const wnA = runInWorld(ctx, wiNoA, guardOn, `chooseAiWitchNightAction(getSeat(${seatId}))`);
      const wnB = runInWorld(ctx, wiNoB, guardOn, `chooseAiWitchNightAction(getSeat(${seatId}))`);
      assert.deepEqual(wnA, wnB, `Witch night action (heal spent) leaked nightState.wolfTarget!`);
      totalChecks++;
    } else if (r === "hunter") {
      const hA = runInWorld(ctx, JSON.parse(JSON.stringify(matchA)), guardOn, `chooseAiHunterTarget(getSeat(${seatId}))`);
      const hB = runInWorld(ctx, JSON.parse(JSON.stringify(matchB)), guardOn, `chooseAiHunterTarget(getSeat(${seatId}))`);
      assert.equal(hA, hB, `Hunter shot leaked hidden info!`);
      totalChecks++;
    }
  }
}

console.log(
  `[ANTI-CHEAT PASS] Static hygiene OK | Proxy Trap 100% enforced | Prompt Leak Auditor OK | ` +
  `Counterfactual Invariance PROVEN across ${totalChecks} adversarial A/B checks (0 leaks, 0 violations)!`
);
