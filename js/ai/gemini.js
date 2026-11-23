/**
 * Gemini API 高階多代理人即時推論與自動降級重試
 */
"use strict";

// ==================== HIGH-TIER MULTI-AGENT GEMINI + VERCEL PROXY + LOCAL OLLAMA ENGINE ====================
function isServerGeminiProxyActive() {
  if (typeof state === "undefined") return false;
  if (state.localLlmModel || state.geminiApiKey || state.serverGeminiOptOut) return false;
  if (!state.serverGeminiAvailable) return false;
  if (state.serverGeminiCooldownUntil && Date.now() < state.serverGeminiCooldownUntil) return false;
  return true;
}

function isExternalLlmActive() {
  return typeof state !== "undefined" && Boolean(state.geminiApiKey || state.localLlmModel || isServerGeminiProxyActive());
}

function getActiveLlmLabel() {
  if (typeof state === "undefined") return "內建AI";
  if (state.localLlmModel) {
    return "本機 " + String(state.localLlmModel);
  }
  if (!state.geminiApiKey && isServerGeminiProxyActive()) {
    return "雲端 Gemini";
  }
  if (!state.geminiApiKey) return "內建AI";
  const m = state.geminiModel || "gemini-3.8-flash";
  if (m === "gemini-4-argon") return "Gemini 4 Argon";
  if (m === "gemini-3.8-flash") return "Gemini 3.8 Flash";
  if (m === "gemini-3.1-pro-preview") return "Gemini 3.1 Pro";
  if (m === "gemini-3.6-flash") return "Gemini 3.6 Flash";
  if (m === "gemini-2.5-pro") return "Gemini 2.5 Pro";
  if (m === "gemini-2.5-flash") return "Gemini 2.5 Flash";
  return m;
}

async function probeServerGeminiProxy() {
  if (typeof window === "undefined" || !window.location || typeof fetch !== "function") return false;
  const proto = window.location.protocol;
  if (proto !== "http:" && proto !== "https:") return false;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, 3500) : null;
  try {
    const opts = { method: "GET", cache: "no-store" };
    if (controller) opts.signal = controller.signal;
    const res = await fetch("/api/gemini", opts);
    if (timer) clearTimeout(timer);
    if (!res || !res.ok) return false;
    const data = await res.json().catch(function () { return null; });
    if (data && data.ok && data.available) {
      state.serverGeminiAvailable = true;
      state.serverGeminiModel = String(data.model || "gemini-3.8-flash");
      if (typeof updateAllUI === "function") updateAllUI();
      return true;
    }
    state.serverGeminiAvailable = false;
    return false;
  } catch (e) {
    if (timer) clearTimeout(timer);
    return false;
  }
}

async function callServerGeminiProxyOnce(promptText, timeoutMs, opts) {
  if (typeof fetch !== "function") return { ok: false, status: 0, text: null };
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 14000) : null;
  try {
    const fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptText,
        model: state.serverGeminiModel || "gemini-3.8-flash",
        jsonMode: Boolean(opts && opts.jsonMode)
      })
    };
    if (controller) fetchOpts.signal = controller.signal;
    const res = await fetch("/api/gemini", fetchOpts);
    if (timer) clearTimeout(timer);
    const data = await res.json().catch(function () { return null; });
    if (!res.ok || !data || !data.ok || !data.text) {
      return { ok: false, status: res.status, text: null };
    }
    return { ok: true, status: res.status, text: String(data.text).trim() };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return { ok: false, status: 0, text: null };
  }
}

async function callLocalOllamaOnce(modelName, promptText, timeoutMs, opts) {
  if (!modelName) return { ok: false, status: 0, text: null, error: "未指定本機模型" };
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 40000) : null;
  try {
    const fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt: promptText,
        jsonMode: Boolean(opts && opts.jsonMode)
      })
    };
    if (controller) fetchOpts.signal = controller.signal;
    const res = await fetch("/api/local-llm", fetchOpts);
    if (timer) clearTimeout(timer);
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data || !data.ok || !data.text) {
      return { ok: false, status: res.status, text: null, error: (data && data.error) || ("HTTP " + res.status) };
    }
    return { ok: true, status: res.status, text: String(data.text).trim() };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return { ok: false, status: 0, text: null, error: "本機 Ollama 連線逾時或未啟動" };
  }
}

function extractInteractionsText(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  let joined = "";
  const collectContent = function (items) {
    if (!Array.isArray(items)) return;
    items.forEach(function (c) {
      if (c && c.type === "text" && typeof c.text === "string") joined += c.text;
    });
  };
  if (Array.isArray(data.outputs)) collectContent(data.outputs);
  if (!joined && Array.isArray(data.steps)) {
    data.steps.forEach(function (st) {
      if (st && st.type === "model_output") collectContent(st.content);
    });
  }
  return joined.trim();
}

async function callGeminiModelOnce(modelId, promptText, timeoutMs, opts) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 16000) : null;

  // Gemini 4 Argon official Interactions REST API (falls back to :generateContent if unavailable/mocked)
  if (modelId && modelId.indexOf("gemini-4") === 0) {
    try {
      const iFetchOpts = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": state.geminiApiKey
        },
        body: JSON.stringify({
          model: modelId,
          input: promptText,
          generation_config: {
            thinking_level: "low",
            max_output_tokens: 4096
          }
        })
      };
      if (controller) iFetchOpts.signal = controller.signal;
      const iRes = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", iFetchOpts);
      if (iRes && iRes.ok) {
        const iData = await iRes.json();
        const iText = extractInteractionsText(iData);
        if (iText) {
          if (timer) clearTimeout(timer);
          return { ok: true, status: iRes.status, text: iText };
        }
        // Fallback if a mock/response returned classic candidates
        const iParts = iData && iData.candidates && iData.candidates[0] && iData.candidates[0].content && iData.candidates[0].content.parts;
        if (Array.isArray(iParts)) {
          let pj = "";
          iParts.forEach(function (pt) { if (pt && pt.text) pj += pt.text; });
          if (pj.trim()) {
            if (timer) clearTimeout(timer);
            return { ok: true, status: iRes.status, text: pj.trim() };
          }
        }
      }
    } catch (e) {}
  }

  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":generateContent";
  const isGen34 = modelId && (modelId.indexOf("gemini-3") === 0 || modelId.indexOf("gemini-4") === 0);
  const genCfg = {
    maxOutputTokens: isGen34 ? ((opts && opts.jsonMode) ? 3072 : 2048) : ((opts && opts.jsonMode) ? 1280 : 768)
  };
  if (!modelId || modelId.indexOf("gemini-4") !== 0) {
    genCfg.temperature = 0.78;
  }
  if (isGen34) {
    genCfg.thinkingConfig = { thinkingLevel: "LOW" };
  }
  if (opts && opts.jsonMode) {
    genCfg.responseMimeType = "application/json";
  }
  try {
    const fetchOpts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": state.geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: genCfg
      })
    };
    if (controller) fetchOpts.signal = controller.signal;
    const res = await fetch(endpoint, fetchOpts);
    if (timer) clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status, text: null };
    const data = await res.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    let joined = "";
    if (Array.isArray(parts)) {
      parts.forEach(function (pt) { if (pt && pt.text) joined += pt.text; });
    }
    return { ok: Boolean(joined.trim()), status: res.status, text: joined.trim() || null };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return { ok: false, status: 0, text: null };
  }
}

function notifyGeminiIssueOnce(issueKey, msg, tone) {
  if (typeof state === "undefined" || typeof showToast !== "function") return;
  if (state._lastGeminiWarnKey === issueKey) return;
  state._lastGeminiWarnKey = issueKey;
  showToast(msg, tone || "warn");
}

async function callGeminiText(promptText, opts) {
  if (state.localLlmModel) {
    const loc = await callLocalOllamaOnce(state.localLlmModel, promptText, 40000, opts);
    return loc.ok && loc.text ? loc.text : null;
  }
  if (!state.geminiApiKey) {
    if (!isServerGeminiProxyActive()) return null;
    const prox = await callServerGeminiProxyOnce(promptText, 14000, opts);
    if (prox.ok && prox.text) {
      state._lastGeminiWarnKey = null;
      return prox.text;
    }
    if (prox.status === 429) {
      state.serverGeminiCooldownUntil = Date.now() + 180000;
      notifyGeminiIssueOnce("proxy:429", "ℹ️ 公測雲端 Gemini 目前額度忙碌，先由內建 AI 接手；您也可填入自己的免費 Key", "sky");
      if (typeof updateAllUI === "function") updateAllUI();
    } else if (prox.status === 404 || prox.status === 503) {
      state.serverGeminiAvailable = false;
      if (typeof updateAllUI === "function") updateAllUI();
    }
    return null;
  }
  const primary = state.geminiModel || "gemini-3.8-flash";
  const isHeavy = primary.indexOf("pro") !== -1 || primary.indexOf("argon") !== -1;
  const first = await callGeminiModelOnce(primary, promptText, isHeavy ? 20000 : 12000, opts);
  if (first.ok && first.text) {
    state._lastGeminiWarnKey = null;
    return first.text;
  }
  // Abort redundant retries immediately on invalid key (401/403) unless it's a tier-restricted flagship model
  if ((first.status === 401 || first.status === 403) && primary.indexOf("gemini-4") !== 0) {
    notifyGeminiIssueOnce("auth:" + primary + ":" + first.status, "⚠️ Gemini API Key 無效或無權限（HTTP " + first.status + "），暫改由內建 AI 推理", "warn");
    return null;
  }
  if (primary !== "gemini-3.8-flash") {
    const fb38 = await callGeminiModelOnce("gemini-3.8-flash", promptText, 12000, opts);
    if (fb38.ok && fb38.text) {
      if (primary.indexOf("gemini-4") === 0 && (first.status === 403 || first.status === 429 || first.status === 404)) {
        notifyGeminiIssueOnce("downgrade:" + primary, "ℹ️ Gemini 4 Argon 需付費額度，已自動降級至 Gemini 3.8 Flash", "emerald");
      }
      return fb38.text;
    }
    if (fb38.status === 401 || fb38.status === 403) {
      notifyGeminiIssueOnce("auth:38:" + fb38.status, "⚠️ Gemini API Key 無效或無權限（HTTP " + fb38.status + "），暫改由內建 AI 推理", "warn");
      return null;
    }
  }
  if (primary !== "gemini-2.5-flash") {
    const fb25 = await callGeminiModelOnce("gemini-2.5-flash", promptText, 9000, opts);
    if (fb25.ok && fb25.text) return fb25.text;
  }
  if (first.status === 429) {
    notifyGeminiIssueOnce("quota:" + primary, "⚠️ Gemini API 額度暫滿（HTTP 429），本回合自動由內建 AI 接手", "warn");
  }
  return null;
}

function normalizeGeminiSpeechText(txt) {
  let s = String(txt || "")
    .replace(/\\n/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[#>\-•\s]+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/^["「『]+|["」』]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Gracefully trim rambling > 145-char LLM paragraphs at a natural sentence boundary so UI & TTS stay crisp
  if (s.length > 145) {
    const windowStr = s.slice(0, 145);
    const lastStop = Math.max(windowStr.lastIndexOf("。"), windowStr.lastIndexOf("！"), windowStr.lastIndexOf("？"));
    if (lastStop >= 55) {
      s = windowStr.slice(0, lastStop + 1);
    } else {
      const lastComma = Math.max(windowStr.lastIndexOf("，"), windowStr.lastIndexOf("；"));
      s = (lastComma >= 65 ? windowStr.slice(0, lastComma) : windowStr.slice(0, 138)) + "。";
    }
  }
  return s;
}

function parseGeminiStructuredSpeech(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) return null;
  let candidate = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    candidate = fenceMatch[1].trim();
  } else {
    const fb = raw.indexOf("{");
    const lb = raw.lastIndexOf("}");
    if (fb !== -1 && lb > fb) candidate = raw.slice(fb, lb + 1);
    else if (fb !== -1) candidate = raw.slice(fb);
  }
  const maxSeats = (typeof state !== "undefined" && state.match && state.match.totalSeats) ? state.match.totalSeats : 8;
  const normId = function (val) {
    if (val === null || val === undefined || val === "") return null;
    const n = parseInt(val, 10);
    return (Number.isFinite(n) && n >= 1 && n <= maxSeats) ? n : null;
  };
  const normIdArr = function (arr, maxLen) {
    if (!Array.isArray(arr)) return null;
    const out = [];
    arr.forEach(function (item) {
      const id = normId(item);
      if (id && out.indexOf(id) === -1 && out.length < (maxLen || 3)) out.push(id);
    });
    return out;
  };
  const emoAllow = ["calm", "sharp", "warm", "urgent", "defensive"];

  if (candidate.charAt(0) === "{" && candidate.charAt(candidate.length - 1) === "}") {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.text === "string" && obj.text.trim()) {
        const cleanText = normalizeGeminiSpeechText(obj.text);
        if (!cleanText) return null;
        const cr = (obj.claimRole === "seer" || obj.claimRole === "witch" || obj.claimRole === "hunter" || obj.claimRole === "guard" || obj.claimRole === "elder") ? obj.claimRole : null;
        const emo = (typeof obj.emotion === "string" && emoAllow.indexOf(obj.emotion) !== -1) ? obj.emotion : null;
        return {
          parsedJson: true,
          text: cleanText,
          accuseId: normId(obj.accuseId),
          vouchId: normId(obj.vouchId),
          claimRole: cr,
          wolfPits: normIdArr(obj.wolfPits, maxSeats >= 12 ? 4 : (maxSeats >= 10 ? 3 : 2)),
          goodPits: normIdArr(obj.goodPits, maxSeats >= 10 ? 4 : 3),
          standWithSeerId: normId(obj.standWithSeerId),
          emotion: emo
        };
      }
    } catch (e) {}
  }

  // Salvage clean speech text from truncated or slightly malformed JSON (NEVER leak raw {"text":...} to the UI!)
  const looksLikeJson = /^\s*[\{\[]/.test(candidate) || /"(?:text|accuseId|vouchId|wolfPits|claimRole)"\s*:/.test(raw);
  if (looksLikeJson) {
    const tMatch = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
    if (tMatch && tMatch[1]) {
      let salvaged = tMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, " ");
      salvaged = normalizeGeminiSpeechText(salvaged);
      if (salvaged.length >= 6) {
        const accM = raw.match(/"accuseId"\s*:\s*(\d+)/);
        const vchM = raw.match(/"vouchId"\s*:\s*(\d+)/);
        const clM = raw.match(/"claimRole"\s*:\s*"(seer|witch|hunter|guard|elder)"/);
        const emoM = raw.match(/"emotion"\s*:\s*"(calm|sharp|warm|urgent|defensive)"/);
        return {
          parsedJson: true,
          text: salvaged,
          accuseId: accM ? normId(accM[1]) : null,
          vouchId: vchM ? normId(vchM[1]) : null,
          claimRole: clM ? clM[1] : null,
          wolfPits: null,
          goodPits: null,
          standWithSeerId: null,
          emotion: emoM ? emoM[1] : null
        };
      }
    }
    return null;
  }

  const plainClean = normalizeGeminiSpeechText(raw);
  if (!plainClean) return null;
  return {
    parsedJson: false,
    text: plainClean,
    accuseId: null,
    vouchId: null,
    claimRole: null,
    wolfPits: null,
    goodPits: null,
    standWithSeerId: null,
    emotion: null
  };
}

function syncGeminiSpeechMeta(speaker, generated, liveRes, opts) {
  if (!speaker || !generated || !liveRes) return generated;
  const deferSeatMutation = Boolean(opts && opts.deferSeatMutation);
  if (typeof liveRes === "string") {
    generated.text = normalizeGeminiSpeechText(liveRes) || generated.text;
    return generated;
  }
  if (liveRes.text) generated.text = normalizeGeminiSpeechText(liveRes.text) || generated.text;
  if (!liveRes.parsedJson) {
    return (typeof sanitizeSpeechMeta === "function") ? sanitizeSpeechMeta(speaker, generated) : generated;
  }

  const syncSnap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(speaker, { module: "gemini_sync" })
    : null;
  const canTarget = function (id, forAccuse) {
    if (!id || id === speaker.id) return false;
    const st = syncSnap ? syncSnap.getSeat(id) : (typeof getSeat === "function" ? getSeat(id) : null);
    if (!st || !st.alive) return false;
    if (forAccuse && speaker.role === "wolf" && (syncSnap ? st.isWolfMate : st.role === "wolf")) return false;
    return true;
  };

  if (liveRes.accuseId !== null && canTarget(liveRes.accuseId, true)) {
    if (generated.accuseId !== liveRes.accuseId) {
      generated.checkedWolfId = undefined;
    }
    generated.accuseId = liveRes.accuseId;
  } else if (liveRes.accuseId === null && liveRes.vouchId && canTarget(liveRes.vouchId, false)) {
    generated.accuseId = null;
  }

  if (liveRes.vouchId !== null && canTarget(liveRes.vouchId, false) && liveRes.vouchId !== generated.accuseId) {
    if (generated.vouchId !== liveRes.vouchId) {
      generated.checkedGoodId = undefined;
    }
    generated.vouchId = liveRes.vouchId;
  }

  if (generated.accuseId) {
    generated.targetId = generated.accuseId;
    generated.relationType = "suspect";
  } else if (generated.vouchId) {
    generated.targetId = generated.vouchId;
    generated.relationType = "trust";
  }

  if (liveRes.claimRole) {
    if (liveRes.claimRole === "seer") {
      generated.claimSeer = true;
      generated.claimRole = "seer";
      if (!deferSeatMutation) speaker.claimedRole = "seer";
    } else if (!speaker.claimedRole || speaker.claimedRole === liveRes.claimRole) {
      generated.claimRole = liveRes.claimRole;
      if (!deferSeatMutation) speaker.claimedRole = liveRes.claimRole;
    }
  }
  if (Array.isArray(liveRes.wolfPits)) generated.wolfPits = liveRes.wolfPits;
  if (Array.isArray(liveRes.goodPits)) generated.goodPits = liveRes.goodPits;
  if (liveRes.standWithSeerId) generated.standWithSeerId = liveRes.standWithSeerId;
  if (liveRes.emotion) generated.emotion = liveRes.emotion;
  return (typeof sanitizeSpeechMeta === "function") ? sanitizeSpeechMeta(speaker, generated) : generated;
}

function buildBlindGeminiSpeechPrompt(speaker, fallbackMeta) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(speaker, { module: "gemini_prompt" })
    : null;
  const self = (snap && snap.self) ? snap.self : speaker;
  const flvObj = PERSONA_FLAVORS[self.name] || {};
  const pProf = typeof getPersonaProfile === "function" ? getPersonaProfile(self) : null;
  const flvBio = flvObj.bio ? flvObj.bio : self.trait;
  const vs = flvObj.voiceStyle || null;
  const styleSamples = (pProf ? ("【你的專屬語風定位：" + pProf.registerBadge + "｜" + pProf.logicTags + "】\n【最高優先角色語風指令】：" + pProf.llmStyleRule + "\n【你的招牌示範句】：「" + pProf.sampleQuote + "」\n") : "") +
    (vs
      ? ("【你的專屬開場與收尾口癖】：開場「" + (vs.lead || []).slice(0, 2).join(" / ") + "」｜反駁「" + (vs.rebutLead || []).slice(0, 1).join("") + "」｜收尾「" + (vs.signoff || []).slice(0, 1).join("") + "」。\n")
      : "");
  const day = snap ? snap.day : state.match.day;
  const pidNow = snap ? snap.playerSeatId : getPlayerId();
  const publicLogs = snap ? snap.publicLogs : state.match.logs.filter(function (l) { return l.kind !== "secret"; });
  const todayLogs = publicLogs.filter(function (l) { return l.day === day && l.kind === "speech"; });
  const spokenIds = todayLogs.map(function (l) { return l.speakerId; });
  const aliveList = (snap ? snap.aliveSeats : getAliveSeats()).map(function (s) {
    return fmtSeatNum(s.id) + "號" + (s.id === pidNow ? "玩家你" : s.name) + (spokenIds.indexOf(s.id) !== -1 ? "(今日已發言)" : (s.id === self.id ? "(正在發言)" : "(今日尚未發言)"));
  }).join("、");

  const slotCtx = (typeof buildSpeechContext === "function") ? buildSpeechContext(speaker) : null;
  const readSeat = snap ? snap.getSeat : getSeat;
  let pitContextNote = "";
  if (slotCtx) {
    pitContextNote += "【你的順位時序】：" + (slotCtx.positionTag || "中置位") + "。";
    if (slotCtx.callbackPhrase) {
      pitContextNote += "前置位焦點：" + slotCtx.callbackPhrase;
    }
    if (slotCtx.wolfPitOnMe) {
      const caller = readSeat(slotCtx.wolfPitOnMe.speakerId);
      pitContextNote += "前置位 " + fmtSeatNum(slotCtx.wolfPitOnMe.speakerId) + "號" + (caller ? caller.name : "") + "剛才把你點進狼坑了，你必須第一句正面回應並解釋自己不在狼坑！";
    }
    if (slotCtx.dualSeerWorlds) {
      const dw = slotCtx.dualSeerWorlds;
      const aPits = dw.worldA.wolfPits.map(function (s) { return fmtSeatNum(s.id) + "號"; }).join("+");
      const bPits = dw.worldB.wolfPits.map(function (s) { return fmtSeatNum(s.id) + "號"; }).join("+");
      pitContextNote += "\n【雙明心觀察員盤坑參考】：如果站 " + fmtSeatNum(dw.seerA.id) + "號，狼坑在 " + aPits + (dw.worldA.conflictReason ? ("(" + dw.worldA.conflictReason + ")") : "") +
        "；如果站 " + fmtSeatNum(dw.seerB.id) + "號，狼坑在 " + bPits + (dw.worldB.conflictReason ? ("(" + dw.worldB.conflictReason + ")") : "") + "。務必清楚比較站 A 與站 B 的狼坑後表態站邊！";
    }
  }

  const transcript = todayLogs.length > 0
    ? todayLogs.map(function (l) { return l.title + "：「" + l.text + "」"; }).join("\n")
    : "（你是今天第一位發言者，目前還沒有任何人發言過！）";

  const spEffKey = self.effectiveRoleKey || (typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(speaker) : self.role);
  const spRoleDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(speaker) : null) || ROLE_DEFS[self.role];
  let secretIntel = "你的真實底牌：" + (spRoleDef ? spRoleDef.name : "書院夥伴") + "（陣營：" + (self.team === "wolf" ? "酸民狼" : "好人") + "）。";
  if (self.role === "seer" && (self.checkedHistory || []).length > 0) {
    secretIntel += "你已查驗的絕對真相：" + self.checkedHistory.map(function (c) {
      return fmtSeatNum(c.targetId) + "號=" + (c.isWolf ? "酸民狼" : "好人");
    }).join("、") + "。";
  } else if (self.role === "witch" && self.savedSeatId) {
    secretIntel += "你之前護回過 " + fmtSeatNum(self.savedSeatId) + "號（他確定是好人）。";
  } else if (self.role === "guard" && snap && snap.lastGuardTargetId) {
    secretIntel += "你昨晚展開護心結界守護過 " + fmtSeatNum(snap.lastGuardTargetId) + "號（今晚不可連守同一人，且須防與回甘茶同守破盾）。";
  } else if (self.isElder) {
    secretIntel += self.elderShieldUsed
      ? "你已發動過清心長老豁免盾（目前無公投投票權，但發言具高公信力，應帶領好人歸票）。"
      : "你擁有清心長老首次公投豁免盾（被誤投一次不會離席，可大膽替神職分擔火力）。";
  } else if (self.role === "wolf") {
    const mates = snap ? snap.knownWolfMates : [];
    if (mates.length > 0) secretIntel += "你的狼同伴是：" + mates.map(function (m) { return fmtSeatNum(m.id) + "號" + m.name; }).join("、") + "（絕不可出賣同伴，且你並不知道好人之中誰是真神職，要偽裝好人並自然帶點挑撥語氣栽贓好人）。";
    if (self.isWolfKing) secretIntel += "你同時是流言首領（白天被公投請離時可發動最後帶風向帶走 1 位在席夥伴）。";
  }

  const playbookKey = self.role === "wolf"
    ? (self.fakeSeer ? "wolf_fake_seer" : (self.isWolfKing && ROLE_STRATEGY_PLAYBOOKS.wolf_king ? "wolf_king" : "wolf_stealth"))
    : (ROLE_STRATEGY_PLAYBOOKS[spEffKey] ? spEffKey : (ROLE_STRATEGY_PLAYBOOKS[self.role] ? self.role : "villager"));
  const rolePlaybook = ROLE_STRATEGY_PLAYBOOKS[playbookKey];

  const claimsSummary = (snap ? snap.seats : [])
    .filter(function (s) { return s.claimedRole && ROLE_DEFS[s.claimedRole]; })
    .map(function (s) { return fmtSeatNum(s.id) + "號" + (s.id === pidNow ? "玩家你" : s.name) + "自稱" + ROLE_DEFS[s.claimedRole].name; })
    .join("、") || "目前無人亮明神職身分";

  let priorRoundsArchive = "（目前為第 1 天，尚無前幾輪歷史紀錄）";
  const voteHist = snap ? snap.voteHistory : (state.match.voteHistory || []);
  if (day >= 2) {
    const roundBlocks = [];
    for (let d = 1; d < day; d++) {
      const dSpeeches = publicLogs.filter(function (l) { return l.day === d && l.kind === "speech"; });
      const dVote = voteHist.find(function (vh) { return vh.day === d; });
      const spText = dSpeeches.length > 0
        ? dSpeeches.map(function (l) { return "  - " + l.title + "：「" + l.text + "」"; }).join("\n")
        : "  - （無發言紀錄）";
      const vtText = dVote
        ? ("  - 第 " + d + " 天公投票型：" + dVote.ballots.map(function (b) { return b.voterId + "號→" + (b.targetId ? (b.targetId + "號") : "棄票"); }).join("｜"))
        : "  - （無投票紀錄）";
      roundBlocks.push("【第 " + d + " 輪回顧】\n" + spText + "\n" + vtText);
    }
    priorRoundsArchive = roundBlocks.join("\n");
  }

  const mindDesc = self.deductionStyle === "gullible"
    ? "思考風格：溫和輕信派（容易被先亮明身分或語氣溫暖的人說服，但仍會自然表達困惑）"
    : (self.deductionStyle === "skeptical"
      ? "思考風格：審慎求證派（絕不會因為有人跳明心觀察員或滴水奉茶師就馬上相信！會綜合比對前面所有人的發言找邏輯漏洞）"
      : "思考風格：平衡綜合派（會把前面所有人的發言串起來交叉比對，理性權衡真假身分與站邊關係）");
  const inPkNow = Boolean(snap && snap.pkActive && snap.pkCandidates.indexOf(self.id) !== -1);
  const pkHint = inPkNow
    ? ("【緊急平票 PK 狀態】：你正與其他平票候選人（" + snap.pkCandidates.join("號、") + "號）進入搶救拉票 PK，第一句就必須搶救清白並明確對比另位平票對手！\n")
    : "";
  const shId = snap ? snap.sheriffSeatId : state.match.sheriffSeatId;
  const shSeat = shId ? readSeat(shId) : null;
  const sheriffLine = (shSeat && shSeat.alive)
    ? ("本局警長（1.5票＆末置位歸票權）：" + fmtSeatNum(shSeat.id) + "號" + (shSeat.id === pidNow ? "玩家你" : shSeat.name) + (shSeat.id === self.id ? "（就是你本人，務必在末置位歸總全場坑位）" : "") + "；")
    : "目前場上無警長；";
  const shRecPrompt = snap ? snap.sheriffVoteRecord : null;
  let sheriffVoteArchive = "";
  if (shRecPrompt) {
    const shCandStr = (shRecPrompt.candidateIds || []).map(function (id) { return fmtSeatNum(id) + "號"; }).join("、") || "無";
    const shWithStr = (shRecPrompt.withdrawnIds || []).length
      ? ("｜退水：" + shRecPrompt.withdrawnIds.map(function (id) { return fmtSeatNum(id) + "號"; }).join("、"))
      : "";
    const shBallotStr = (shRecPrompt.ballots || []).length
      ? shRecPrompt.ballots.map(function (b) { return b.voterId + "號→" + (b.targetId ? (b.targetId + "號") : "棄票"); }).join("｜")
      : "（直接推舉）";
    sheriffVoteArchive = "【第1天警長競選與警下票型（排坑必考）】：警上候選：" + shCandStr + shWithStr + "｜警下投票：" + shBallotStr + "\n";
  }
  const bfActivePrompt = snap ? snap.sheriffBadgeFlow : null;
  const bfSigsPrompt = (snap && Array.isArray(snap.badgeFlowSignals)) ? snap.badgeFlowSignals : [];
  if (bfActivePrompt || bfSigsPrompt.length > 0) {
    const bfLines = [];
    if (bfActivePrompt && bfActivePrompt.firstTargetId) {
      const bfOw = readSeat(bfActivePrompt.ownerId);
      const bf1 = readSeat(bfActivePrompt.firstTargetId);
      const bf2 = bfActivePrompt.secondTargetId ? readSeat(bfActivePrompt.secondTargetId) : null;
      bfLines.push("現任警長 " + (bfOw ? (fmtSeatNum(bfOw.id) + "號") : "") + " 公開警徽流：先驗 " + (bf1 ? (fmtSeatNum(bf1.id) + "號") : "") + (bf2 ? (" → 再驗 " + fmtSeatNum(bf2.id) + "號") : "") + "（倒牌徽給先位即金水、跳飛或撕徽即查殺）");
    }
    bfSigsPrompt.forEach(function (sig) {
      if (sig && sig.detail) bfLines.push("第" + (sig.day || 1) + "天暗號解讀：" + sig.detail);
    });
    if (bfLines.length > 0) {
      sheriffVoteArchive += "【公開警徽流宣告與暗號解讀（務必結合站邊判斷）】：\n- " + bfLines.join("\n- ") + "\n";
    }
  }
  const fgNotes = [];
  if (snap && Array.isArray(snap.fourGJoySuspects) && snap.fourGJoySuspects.length > 0) {
    fgNotes.push("給歡喜曾笑僵對象：" + snap.fourGJoySuspects.map(function (id) { return fmtSeatNum(id) + "號"; }).join("＋"));
  }
  if (snap && Array.isArray(snap.fourGHopePair) && snap.fourGHopePair.length === 2) {
    fgNotes.push("給希望雙光必有1狼：" + fmtSeatNum(snap.fourGHopePair[0]) + "號 與 " + fmtSeatNum(snap.fourGHopePair[1]) + "號");
  }
  if (snap && snap.convenienceRallyTargetId) {
    fgNotes.push("給方便歸票焦點：" + fmtSeatNum(snap.convenienceRallyTargetId) + "號");
  }
  if (snap && snap.activeDirectorEvent) {
    fgNotes.push("今日茶會事件：「" + snap.activeDirectorEvent.shortTitle + "」");
  }
  // Zero-Leak: Public board configuration only (NEVER scans hidden seats[].role === "guard"!)
  const hasGuardRole = snap ? snap.hasGuardMode : Boolean(state.guardMode && state.match && state.match.totalSeats >= 8);
  const aowuEndgameNote = "【凹嗚規則準則】：採標準屠邊制（狼刀在先），最後一神若是直心糾察長在夜間被狼鎖定將直接屠神結束且無法開槍" + (hasGuardRole ? "；本局含護心守衛，須防與回甘茶同守同救破盾！" : "。");

  const ledgerObj = (day >= 2 && typeof buildCrossDayMemoryLedger === "function") ? buildCrossDayMemoryLedger(speaker, snap) : null;
  const ledgerNote = (ledgerObj && ledgerObj.lines && ledgerObj.lines.length)
    ? ("【跨日恩怨與矛盾記憶帳本】：\n- " + ledgerObj.lines.join("\n- ") + "\n")
    : "";

  const lastCas = (snap && Array.isArray(snap.lastNightCasualties)) ? snap.lastNightCasualties : [];
  const totalSeatsNow = snap ? snap.totalSeats : ((state.match && state.match.totalSeats) || 8);
  const fallbackText = (fallbackMeta && fallbackMeta.text) ? fallbackMeta.text : "";

  const prompt =
    "你正在參與林美山書院茶席推理遊戲《三好AI狼人殺》（融入存好心、說好話、做好事理念，以理性防制網路酸言與假訊息取代傳統陰暗衝突，所有「出局」改為請離席冷靜）。\n" +
    "你扮演：" + fmtSeatNum(self.id) + "號「" + self.name + "」。個性鮮明設定：" + flvBio + "。\n" +
    styleSamples +
    mindDesc + "。\n" +
    secretIntel + "\n" +
    pkHint +
    (pitContextNote ? (pitContextNote + "\n") : "") +
    ledgerNote +
    "【你的專屬身分玩法攻略（務必遵守）】：\n" + rolePlaybook + "\n" +
    "【當前局勢情報】：第 " + day + " 天白天｜昨夜結果：" + (lastCas.length > 0 ? (lastCas.map(function (id) { return id + "號離席"; }).join("、")) : "平安夜無人離席") + "｜" + sheriffLine + (fgNotes.length ? ("公開茶席線索（" + fgNotes.join("、") + "）｜") : "") + "在場座位：" + aliveList + "\n" +
    aowuEndgameNote + "\n" +
    "【場上已宣稱身分】：" + claimsSummary + "\n" +
    sheriffVoteArchive +
    "【前 1 至 " + Math.max(0, day - 1) + " 輪完整歷史發言與票型檔案】：\n" + priorRoundsArchive + "\n" +
    "【今天（第 " + day + " 輪）到目前為止的真實發言逐字稿】：\n" + transcript + "\n" +
    "【本輪基礎戰術參考】（請結合上方真實逐字稿與身分攻略靈活發揮）：" + fallbackText + "\n" +
    "嚴格規則：\n" +
    "1. 【最高優先】必須嚴守今日發言時序並點好人坑與狼人坑！被前置位點進狼坑或指認時第一句必須回應；雙觀察員對跳時務必比較站 A 坑與站 B 坑分別在哪；若本局有警長票型，務必把警下投票與退水行為納入排坑理由！\n" +
    "2. 【獨立綜合判斷】你完全不知道其他人的真實底牌（除同伴或觀察員親查對象外）！必須參考前面「所有」已發言者的話來綜合判斷誰在狼坑、誰在好人坑。\n" +
    "3. 只能評論「今日已發言」的人說過的話，絕對禁止捏造「今日尚未發言」者的發言內容（未發言者僅能說「後置位還沒發言，待會聽表水」）。\n" +
    "4. 【嚴禁 AI 機器味與朗讀播報腔・像真實台灣人圍桌講話】禁止出現「根據上述資料」「綜上所述」「總而言之」「值得注意的是」「邏輯閉環」「數據模型」「高置信度」「異常值」「行為向量」「算力」或誇張卡通口號！現代角色請務必用台灣真人圓桌聊天碎句口語（可自然穿插「欸等一下」「老實說吼」「不是啊你看」「我剛聽下來覺得」等呼吸短句，只有墨白、晴嵐、阿竹保持古風或詩茶雅韻），整段發言最多使用 1 個驚嘆號（多用「，」「。」「？」「…」製造自然換氣感），自然接前一位的話回嘴或讚聲，用專屬收尾結束。\n" +
    (day >= 2 ? ("5. 【第 " + day + " 輪對話連貫】：自然消化前 1 至 " + (day - 1) + " 輪的歷史發言與公投票型，抓出前後矛盾的人。\n") : "") +
    "6. 【嚴格控制字數與純口語格式】整段台詞必須為單一段落、嚴格控制在 " + (totalSeatsNow >= 10 ? "50～85字" : "55～95字") + "（切勿長篇大論、禁用換行、禁用 Markdown 符號、無表情符號與括號動作），並只輸出單一純 JSON 物件：\n" +
    '{"text":"你的台詞內容","accuseId":懷疑並準備投票的座位整數或null,"vouchId":相信並站邊力挺的座位整數或null,"claimRole":"seer"|"witch"|"hunter"|"guard"|"elder"|null,"wolfPits":[狼坑座號陣列],"goodPits":[好人坑座號陣列],"standWithSeerId":雙觀察員時站邊的座號或null,"emotion":"calm"|"sharp"|"warm"|"urgent"|"defensive"}';

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiAiSpeech(speaker, fallbackMeta) {
  const built = buildBlindGeminiSpeechPrompt(speaker, fallbackMeta);
  if (!built || !built.audit || !built.audit.ok) {
    return null;
  }
  const rawOut = await callGeminiText(built.prompt, { jsonMode: true });
  const parsed = rawOut ? parseGeminiStructuredSpeech(rawOut) : null;
  if (parsed && parsed.text && typeof voice !== "undefined" && voice.localNeuralAvailable && typeof voice.prefetchFreeLocalNeural === "function") {
    voice.prefetchFreeLocalNeural(speaker.name, parsed.text, "normal");
  }
  return parsed;
}
