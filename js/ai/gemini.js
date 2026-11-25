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
      state.serverGeminiModel = String(data.model || "gemini-2.5-flash");
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

let _proxySessionIdMem = "";
function getOrCreateProxySessionId() {
  if (_proxySessionIdMem) return _proxySessionIdMem;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const saved = window.sessionStorage.getItem("sanhao_proxy_sid_v1");
      if (saved && /^[a-zA-Z0-9_-]{8,48}$/.test(saved)) {
        _proxySessionIdMem = saved;
        return saved;
      }
    }
  } catch (e) { }
  const sid = "tea_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  _proxySessionIdMem = sid;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("sanhao_proxy_sid_v1", sid);
    }
  } catch (e) { }
  return sid;
}

const GEMINI_TEMP_TIERS = Object.freeze({
  sheriff_logic: 0.58,
  day_standard: 0.65,
  interject_confront: 0.74,
  pk_last_words: 0.78
});

function clampGeminiTemperature(val, fallback) {
  const num = Number(val);
  const fb = typeof fallback === "number" ? fallback : GEMINI_TEMP_TIERS.day_standard;
  const base = (Number.isFinite(num) && num > 0) ? num : fb;
  return Math.round(Math.max(0.45, Math.min(0.85, base)) * 100) / 100;
}

function resolveGeminiSpeechTemperature(sceneKind, ctxOpts) {
  const o = ctxOpts || {};
  if (sceneKind === "pk" || sceneKind === "last_words" || o.isPkRound || o.pkActive) {
    return GEMINI_TEMP_TIERS.pk_last_words;
  }
  if (sceneKind === "interject" || sceneKind === "confrontation") {
    return GEMINI_TEMP_TIERS.interject_confront;
  }
  if (sceneKind === "sheriff" || sceneKind === "sheriff_tally" || sceneKind === "dual_seer" || o.isSheriff || o.isDualSeerOrGod) {
    return GEMINI_TEMP_TIERS.sheriff_logic;
  }
  return GEMINI_TEMP_TIERS.day_standard;
}

async function callServerGeminiProxyOnce(promptText, timeoutMs, opts) {
  if (typeof fetch !== "function") return { ok: false, status: 0, text: null };
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 14000) : null;
  const sid = getOrCreateProxySessionId();
  const safeTemp = clampGeminiTemperature(opts && opts.temperature, GEMINI_TEMP_TIERS.day_standard);
  try {
    const fetchOpts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tea-Session": sid
      },
      body: JSON.stringify({
        prompt: promptText,
        model: state.serverGeminiModel || "gemini-2.5-flash",
        tier: (opts && opts.lite) ? "lite" : "standard",
        sessionId: sid,
        jsonMode: Boolean(opts && opts.jsonMode),
        temperature: safeTemp
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
  // Gemini 4 Argon official Interactions REST API (own AbortController so fallback :generateContent never inherits an aborted signal!)
  if (modelId && modelId.indexOf("gemini-4") === 0) {
    const iCtrl = typeof AbortController === "function" ? new AbortController() : null;
    const iTimer = iCtrl ? setTimeout(function () { iCtrl.abort(); }, Math.min(timeoutMs || 14000, 12000)) : null;
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
      if (iCtrl) iFetchOpts.signal = iCtrl.signal;
      const iRes = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", iFetchOpts);
      if (iTimer) clearTimeout(iTimer);
      if (iRes && iRes.ok) {
        const iData = await iRes.json();
        const iText = extractInteractionsText(iData);
        if (iText) {
          return { ok: true, status: iRes.status, text: iText };
        }
        const iParts = iData && iData.candidates && iData.candidates[0] && iData.candidates[0].content && iData.candidates[0].content.parts;
        if (Array.isArray(iParts)) {
          let pj = "";
          iParts.forEach(function (pt) { if (pt && !pt.thought && pt.text) pj += pt.text; });
          if (pj.trim()) {
            return { ok: true, status: iRes.status, text: pj.trim() };
          }
        }
      }
    } catch (e) {
      if (iTimer) clearTimeout(iTimer);
    }
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 16000) : null;
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":generateContent";
  const isGen34 = modelId && (modelId.indexOf("gemini-3") === 0 || modelId.indexOf("gemini-4") === 0);
  const genCfg = {
    maxOutputTokens: isGen34 ? ((opts && opts.jsonMode) ? 3072 : 2048) : ((opts && opts.jsonMode) ? 1280 : 768)
  };
  if (!modelId || modelId.indexOf("gemini-4") !== 0) {
    genCfg.temperature = clampGeminiTemperature(opts && opts.temperature, GEMINI_TEMP_TIERS.day_standard);
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
      parts.forEach(function (pt) { if (pt && !pt.thought && pt.text) joined += pt.text; });
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
    const prox = await callServerGeminiProxyOnce(promptText, 19000, opts);
    if (prox.ok && prox.text) {
      state._lastGeminiWarnKey = null;
      state._proxyFailStreak = 0;
      return prox.text;
    }
    if (prox.status === 429) {
      state.serverGeminiCooldownUntil = Date.now() + 180000;
      notifyGeminiIssueOnce("proxy:429", "公測雲端 Gemini 目前額度忙碌，先由內建 AI 接手；您也可填入自己的免費 Key", "sky");
      if (typeof updateAllUI === "function") updateAllUI();
    } else if (prox.status === 404 || prox.status === 503 || prox.status === 403) {
      state.serverGeminiAvailable = false;
      if (prox.status === 403) {
        notifyGeminiIssueOnce("proxy:403", "雲端代理來源驗證未通過（HTTP 403），已自動切回內建三好 AI", "sky");
      }
      if (typeof updateAllUI === "function") updateAllUI();
    } else if (prox.status === 502 || prox.status === 504) {
      state._proxyFailStreak = (state._proxyFailStreak || 0) + 1;
      if (state._proxyFailStreak >= 2) {
        state.serverGeminiCooldownUntil = Date.now() + 60000;
        notifyGeminiIssueOnce("proxy:502", "雲端 Gemini 暫時回應緩慢，先由內建 AI 接手 60 秒", "sky");
        if (typeof updateAllUI === "function") updateAllUI();
      }
    }
    return null;
  }
  if (state._personalKeyCooldownUntil && Date.now() < state._personalKeyCooldownUntil) {
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
    state._personalKeyCooldownUntil = Date.now() + 120000;
    notifyGeminiIssueOnce("auth:" + primary + ":" + first.status, "Gemini API Key 無效或無權限（HTTP " + first.status + "），暫改由內建 AI 推理", "warn");
    return null;
  }
  if (primary !== "gemini-3.8-flash") {
    const fb38 = await callGeminiModelOnce("gemini-3.8-flash", promptText, 12000, opts);
    if (fb38.ok && fb38.text) {
      if (primary.indexOf("gemini-4") === 0 && (first.status === 403 || first.status === 429 || first.status === 404)) {
        notifyGeminiIssueOnce("downgrade:" + primary, "Gemini 4 Argon 需付費額度，已自動降級至 Gemini 3.8 Flash", "emerald");
      }
      return fb38.text;
    }
    if (fb38.status === 401 || fb38.status === 403) {
      state._personalKeyCooldownUntil = Date.now() + 120000;
      notifyGeminiIssueOnce("auth:38:" + fb38.status, "Gemini API Key 無效或無權限（HTTP " + fb38.status + "），暫改由內建 AI 推理", "warn");
      return null;
    }
  }
  if (primary !== "gemini-2.5-flash") {
    const fb25 = await callGeminiModelOnce("gemini-2.5-flash", promptText, 9000, opts);
    if (fb25.ok && fb25.text) return fb25.text;
  }
  if (first.status === 429) {
    notifyGeminiIssueOnce("quota:" + primary, "Gemini API 額度暫滿（HTTP 429），本回合自動由內建 AI 接手", "warn");
  }
  return null;
}

function stripStageDirectionParens(raw) {
  const s = String(raw || "");
  if (!s) return "";
  const keepGameFactRe = /狼|好人|金水|查殺|銀水|警徽|倒牌|離席|站邊|票|盾|茶|對跳|觀察員|奉茶師|糾察長|守衛|長老|\d+號/;
  return s.replace(/[（(]([^）)]*)[）)]/g, function (full, inner) {
    const t = String(inner || "").trim();
    if (!t) return "";
    if (keepGameFactRe.test(t)) return full;
    if (t.length <= 14 || /笑|嘆|點頭|搖頭|推眼鏡|喝茶|抿茶|頓了頓|語氣|低聲|輕聲|停頓|拍桌|眼神|皺眉|輕咳|深呼吸|微笑|聳肩|揮手|攤手|環顧|苦笑|冷笑|輕笑/.test(t)) {
      return "";
    }
    return full;
  });
}

function normalizeGeminiSpeechText(txt) {
  let s = stripStageDirectionParens(String(txt || ""))
    .replace(/\\n/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[#>\-•\s]+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/^["「『]+|["」』]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (typeof normalizeSeatRefsInText === "function") {
    s = normalizeSeatRefsInText(s);
  } else {
    s = s
      .replace(/(?<!\d)0([1-9])\s*號/g, "$1號")
      .replace(/(?<!\d)0([1-9])(?=[\u4e00-\u9fff，。！？、；：,\.!?;:\s]|$)/g, "$1號");
  }
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
    } catch (e) { }
  }

  // Salvage clean speech text from truncated or slightly malformed JSON (NEVER leak raw {"text":...} to the UI!)
  const looksLikeJson = /^\s*[\{\[]/.test(candidate) || /"(?:text|accuseId|vouchId|wolfPits|claimRole)"\s*:/.test(raw);
  if (looksLikeJson) {
    const tMatch = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)("|$)/);
    if (tMatch && tMatch[1]) {
      const wasTruncated = tMatch[2] !== '"';
      let salvaged = tMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, " ");
      // If JSON was cut off mid-number/mid-word without closing quote, trim trailing incomplete digit/clause cleanly
      if (wasTruncated) {
        salvaged = salvaged.replace(/\d+$/, "").replace(/[，、：；\s]+$/, "");
      }
      salvaged = normalizeGeminiSpeechText(salvaged);
      if (salvaged.length >= 6) {
        const accM = raw.match(/"accuseId"\s*:\s*"?(\d+)/);
        const vchM = raw.match(/"vouchId"\s*:\s*"?(\d+)/);
        const swM = raw.match(/"standWithSeerId"\s*:\s*"?(\d+)/);
        const clM = raw.match(/"claimRole"\s*:\s*"(seer|witch|hunter|guard|elder)"/);
        const emoM = raw.match(/"emotion"\s*:\s*"(calm|sharp|warm|urgent|defensive)"/);
        const parseArrM = function (field) {
          const mArr = raw.match(new RegExp('"' + field + '"\\s*:\\s*\\[([^\\]]*)\\]'));
          if (!mArr || !mArr[1]) return null;
          const nums = (mArr[1].match(/\d+/g) || []).map(function (x) { return parseInt(x, 10); });
          return normIdArr(nums, field === "wolfPits" ? (maxSeats >= 12 ? 4 : (maxSeats >= 10 ? 3 : 2)) : (maxSeats >= 10 ? 4 : 3));
        };
        return {
          parsedJson: true,
          text: salvaged,
          accuseId: accM ? normId(accM[1]) : null,
          vouchId: vchM ? normId(vchM[1]) : null,
          claimRole: clM ? clM[1] : null,
          wolfPits: parseArrM("wolfPits"),
          goodPits: parseArrM("goodPits"),
          standWithSeerId: swM ? normId(swM[1]) : null,
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

function getAllowedGeminiClaimRole(speaker, fallbackMeta) {
  if (!speaker) return null;
  const fbClaim = fallbackMeta ? (fallbackMeta.claimSeer ? "seer" : (fallbackMeta.claimRole || null)) : null;
  if (fbClaim) return fbClaim;
  if (speaker.claimedRole) return speaker.claimedRole;
  // Never let villagers or stealth wolves spontaneously hallucinate God-role claims!
  return null;
}

function validateGeminiSpeechReality(speaker, fallbackMeta, parsed, snap) {
  if (!parsed || !parsed.text || !speaker) return { ok: false, reason: "empty" };
  const txt = typeof normalizeSeatRefsInText === "function" ? normalizeSeatRefsInText(parsed.text) : String(parsed.text);
  const allowedClaim = getAllowedGeminiClaimRole(speaker, fallbackMeta);

  const roleClaimMap = {
    seer: "(?:明心觀察員|觀察員|預言家)",
    witch: "(?:滴水奉茶師|奉茶師|女巫)",
    hunter: "(?:直心糾察長|糾察長|獵人)",
    guard: "(?:護心守衛|守衛)",
    elder: "(?:清心長老|長老)"
  };
  const allRolesPattern = "(?:明心觀察員|觀察員|預言家|滴水奉茶師|奉茶師|直心糾察長|糾察長|護心守衛|守衛|清心長老)";
  const selfClaimPrefix = "(?:我(?:才|就)?是(?:這張|本局)?(?:真)?|我這(?:真|張)|我(?:直接)?(?:起跳|拍|亮出|亮明)|吾(?:乃|實為)|妾身(?:乃|實為)|小生(?:乃|實為))";

  // 1. Block unauthorized God-role claims, wrong-God claims, or hallucinated night actions
  if (!allowedClaim) {
    const unauthRe = new RegExp(selfClaimPrefix + "(?!覺得|認為|想|幫|保|信)[^，。！？；;]{0,3}" + allRolesPattern);
    if (unauthRe.test(txt)) {
      return { ok: false, reason: "unauthorized_role_claim" };
    }
    if (/(?:我昨晚|昨晚我)(?!沒|被).{0,4}(?:親驗|查驗|驗了|驗過|護回|救了|守了)/.test(txt)) {
      return { ok: false, reason: "hallucinated_night_action" };
    }
  } else {
    // Block claiming a DIFFERENT God role than allowedClaim
    Object.keys(roleClaimMap).forEach(function () { });
    for (const rk of Object.keys(roleClaimMap)) {
      if (rk === allowedClaim) continue;
      const otherRe = new RegExp(selfClaimPrefix + "(?!覺得|認為|想|幫|保|信)[^，。！？；;]{0,3}" + roleClaimMap[rk]);
      if (otherRe.test(txt)) {
        return { ok: false, reason: "wrong_role_claim" };
      }
    }
    if (allowedClaim === "seer") {
      // Block logical blunder: Seer claiming they will check a rival counter-claiming Seer tonight (multi-digit safe!)
      const rivalSeers = (snap && Array.isArray(snap.seats) ? snap.seats : [])
        .filter(function (s) { return s.alive && s.id !== speaker.id && s.claimedRole === "seer"; })
        .map(function (s) { return s.id; });
      for (let i = 0; i < rivalSeers.length; i++) {
        const rid = rivalSeers[i];
        const checkRivalRe = new RegExp("(?:今晚|明天|下晚|晚點|必驗|去驗|再驗)[^\\d]{0,5}(?<!\\d)0?" + rid + "(?:號|(?=[，。！？、\\s]|$))");
        if (checkRivalRe.test(txt)) {
          return { ok: false, reason: "check_rival_seer_blunder" };
        }
      }
      // True Seer with confirmed alive wolf check MUST mention that checked wolf in text!
      if (speaker.role === "seer" && fallbackMeta && fallbackMeta.checkedWolfId) {
        const cwId = fallbackMeta.checkedWolfId;
        const cwRe = new RegExp("(?<!\\d)0?" + cwId + "(?:號|(?=[，。！？、\\s]|$))");
        if (!cwRe.test(txt)) {
          return { ok: false, reason: "seer_omitted_checked_wolf" };
        }
      }
    }
  }

  // 2. Block hallucinating past-tense vote-pushing ("衝票/跟票/分票/票型") when zero ballots exist yet (allow future-tense "別分票")
  const hasAnyBallots = Boolean(
    (snap && Array.isArray(snap.voteHistory) && snap.voteHistory.length > 0) ||
    (snap && snap.sheriffVoteRecord && Array.isArray(snap.sheriffVoteRecord.ballots) && snap.sheriffVoteRecord.ballots.length > 0)
  );
  if (!hasAnyBallots) {
    const pastVoteRe = /(?:剛才|剛剛|上一輪|昨天|前面|從|照|看).{0,6}(?:衝票|跟票|分票|票型)|(?:衝票|跟票|分票)的\s*\d+號|(?<!別|不要|勿|免得)(?:衝票|跟票|票型)/;
    if (pastVoteRe.test(txt)) {
      return { ok: false, reason: "hallucinated_vote_history" };
    }
  }

  // 3. Block wolf self-outing / leaking wolf team identity in public speech (including classical personas!) & accusing wolf mate outside wolf-vs-wolf PK
  if (speaker.role === "wolf") {
    if (/(?:其實我是|我就是|我們是|身為|吾乃|妾身(?:乃|實為)|小生(?:乃|實為)).{0,3}(?:酸民狼|狼人|流言首領|狼隊)|(?:我的狼同伴|我們狼隊|狼隊友)/.test(txt)) {
      return { ok: false, reason: "wolf_self_outing" };
    }
    const isWolfPkNow = Boolean(snap && snap.pkActive && Array.isArray(snap.pkCandidates) && snap.pkCandidates.indexOf(speaker.id) !== -1);
    const isDeepBusAllowed = Boolean(snap && (snap.wolfTactic === "deep_stealth_bus" || snap.wolfTactic === "deep_stealth"));
    if (!isWolfPkNow && !isDeepBusAllowed && parsed.accuseId && snap && Array.isArray(snap.knownWolfMates)) {
      const hitMate = snap.knownWolfMates.some(function (m) { return m && m.id === parsed.accuseId; });
      if (hitMate) {
        return { ok: false, reason: "wolf_accused_teammate" };
      }
    }
  }

  // 4. Block fabricating what an unspoken seat "just said" today (multi-digit safe, Sheriff stand aware, Four-Givings safe!)
  if (snap && Array.isArray(snap.seats)) {
    const dayNow = snap.day || 1;
    const spokenToday = {};
    (snap.publicLogs || []).forEach(function (l) {
      if (l && l.day === dayNow && l.kind === "speech" && l.speakerId) {
        spokenToday[l.speakerId] = true;
      }
    });
    if (dayNow === 1 && snap.sheriffVoteRecord && Array.isArray(snap.sheriffVoteRecord.candidateIds)) {
      snap.sheriffVoteRecord.candidateIds.forEach(function (cid) {
        if (cid) spokenToday[cid] = true;
      });
    }
    for (let i = 0; i < snap.seats.length; i++) {
      const s = snap.seats[i];
      if (!s || s.id === speaker.id) continue;
      if (s.alive && !spokenToday[s.id]) {
        const fabRe = new RegExp("(?:聽完|聽了)[^\\d]{0,3}(?<!\\d)0?" + s.id + "號|(?:剛才|剛剛)[^\\d]{0,2}(?<!\\d)0?" + s.id + "號.{0,4}(?:說|講|發言|表水|跳|點|打|保|踩)|(?<!\\d)0?" + s.id + "號.{0,3}(?:剛才說|剛剛說|剛才講|剛剛講|剛才點|剛剛點|剛才打|剛才保|剛才跳|剛才發言)");
        if (fabRe.test(txt)) {
          return { ok: false, reason: "fabricated_unspoken_speech" };
        }
      }
      if (!s.alive && allowedClaim === "seer") {
        const deadCheckRe = new RegExp("(?:今晚|明天|下晚|晚點|必驗|去驗|再驗)[^\\d]{0,5}(?<!\\d)0?" + s.id + "(?:號|(?=[，。！？、\\s]|$))");
        if (deadCheckRe.test(txt)) {
          return { ok: false, reason: "check_dead_seat_blunder" };
        }
      }
    }
  }

  return { ok: true, reason: "" };
}

function syncGeminiSpeechMeta(speaker, generated, liveRes, opts) {
  if (!speaker || !generated || !liveRes) return generated;
  const deferSeatMutation = Boolean(opts && opts.deferSeatMutation);
  if (typeof liveRes === "string") {
    generated.text = normalizeGeminiSpeechText(liveRes) || generated.text;
    return generated;
  }
  if (liveRes.text) generated.text = normalizeGeminiSpeechText(liveRes.text) || generated.text;

  const syncSnap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(speaker, { module: "gemini_sync" })
    : null;
  const inPkSelf = Boolean(syncSnap && syncSnap.pkActive && Array.isArray(syncSnap.pkCandidates) && syncSnap.pkCandidates.indexOf(speaker.id) !== -1);
  const pkRivals = inPkSelf ? syncSnap.pkCandidates.filter(function (id) { return id !== speaker.id; }) : [];
  const canTarget = function (id, forAccuse) {
    if (!id || id === speaker.id) return false;
    const st = syncSnap ? syncSnap.getSeat(id) : (typeof getSeat === "function" ? getSeat(id) : null);
    if (!st || !st.alive) return false;
    if (forAccuse && inPkSelf && pkRivals.length > 0 && pkRivals.indexOf(id) === -1) return false;
    if (forAccuse && !inPkSelf && speaker.role === "wolf" && (syncSnap ? st.isWolfMate : st.role === "wolf")) return false;
    return true;
  };

  if (!liveRes.parsedJson) {
    if (typeof analyzeThreeGoodSpeech === "function" && generated.text) {
      const plainAna = analyzeThreeGoodSpeech(generated.text);
      if (plainAna.primaryAccuseId && canTarget(plainAna.primaryAccuseId, true)) generated.accuseId = plainAna.primaryAccuseId;
      if (plainAna.primaryVouchId && canTarget(plainAna.primaryVouchId, false) && plainAna.primaryVouchId !== generated.accuseId) generated.vouchId = plainAna.primaryVouchId;
      generated.hasToxicSlip = Boolean(plainAna.isToxic);
    }
    return (typeof sanitizeSpeechMeta === "function") ? sanitizeSpeechMeta(speaker, generated) : generated;
  }

  const lockedTrueSeerWolf = (speaker.role === "seer" && generated.checkedWolfId && canTarget(generated.checkedWolfId, true))
    ? generated.checkedWolfId
    : null;
  if (lockedTrueSeerWolf) {
    generated.accuseId = lockedTrueSeerWolf;
  } else if (liveRes.accuseId !== null && canTarget(liveRes.accuseId, true)) {
    if (generated.accuseId !== liveRes.accuseId) {
      generated.checkedWolfId = undefined;
    }
    generated.accuseId = liveRes.accuseId;
  } else if (liveRes.accuseId === null) {
    // Respect Gemini explicitly outputting null accuseId (never leak stale fallbackMeta.accuseId!)
    generated.accuseId = null;
    generated.checkedWolfId = undefined;
  }

  if (liveRes.vouchId !== null && canTarget(liveRes.vouchId, false) && liveRes.vouchId !== generated.accuseId) {
    if (generated.vouchId !== liveRes.vouchId) {
      generated.checkedGoodId = undefined;
    }
    generated.vouchId = liveRes.vouchId;
  } else if (liveRes.vouchId === null || generated.vouchId === generated.accuseId) {
    generated.vouchId = null;
    generated.checkedGoodId = undefined;
  }

  if (generated.accuseId) {
    generated.targetId = generated.accuseId;
    generated.relationType = "suspect";
  } else if (generated.vouchId) {
    generated.targetId = generated.vouchId;
    generated.relationType = "trust";
  } else {
    generated.targetId = null;
    generated.relationType = null;
  }

  // Strictly lock role claims to engine-authorized claims only (zero spontaneous villager / stealth-wolf role-claim chaos!)
  const allowedClaim = getAllowedGeminiClaimRole(speaker, generated);
  if (allowedClaim) {
    if (allowedClaim === "seer") {
      generated.claimSeer = true;
      generated.claimRole = "seer";
      if (!deferSeatMutation) speaker.claimedRole = "seer";
    } else {
      generated.claimRole = allowedClaim;
      if (!deferSeatMutation) speaker.claimedRole = allowedClaim;
    }
  } else {
    generated.claimSeer = false;
    generated.claimRole = null;
  }

  if (Array.isArray(liveRes.wolfPits)) {
    generated.wolfPits = liveRes.wolfPits.filter(function (id) { return canTarget(id, true); });
  }
  if (Array.isArray(liveRes.goodPits)) {
    generated.goodPits = liveRes.goodPits.filter(function (id) { return canTarget(id, false); });
  }
  if (generated.claimSeer || generated.claimRole === "seer") {
    generated.standWithSeerId = null;
  } else if (liveRes.standWithSeerId && liveRes.standWithSeerId !== speaker.id && liveRes.standWithSeerId !== generated.accuseId && canTarget(liveRes.standWithSeerId, false)) {
    const swSeat = syncSnap ? syncSnap.getSeat(liveRes.standWithSeerId) : (typeof getSeat === "function" ? getSeat(liveRes.standWithSeerId) : null);
    generated.standWithSeerId = (swSeat && swSeat.claimedRole === "seer") ? liveRes.standWithSeerId : null;
  } else {
    generated.standWithSeerId = null;
  }
  if (liveRes.emotion) generated.emotion = liveRes.emotion;

  // Recompute hasToxicSlip directly from Gemini's actual speech text (eliminates ghost toxic slips & keeps 85 清風照破 accurate!)
  if (generated.text) {
    const extToxicRe = /亂帶風向|裝無辜|別演了|少裝了|隨便投|講廢話|別吵|根本在騙|挑撥/;
    const anaTxt = typeof analyzeThreeGoodSpeech === "function" ? analyzeThreeGoodSpeech(generated.text) : { isToxic: false };
    generated.hasToxicSlip = Boolean(anaTxt.isToxic || extToxicRe.test(generated.text));
  }
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
    return s.id + "號" + (s.id === pidNow ? "玩家你" : s.name) + (spokenIds.indexOf(s.id) !== -1 ? "(今日已發言)" : (s.id === self.id ? "(正在發言)" : "(今日尚未發言)"));
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
      pitContextNote += "前置位 " + slotCtx.wolfPitOnMe.speakerId + "號" + (caller ? caller.name : "") + "剛才把你點進狼坑了，你必須第一句正面回應並解釋自己不在狼坑！";
    }
    if (slotCtx.playerAnchorOnMe) {
      pitContextNote += "\n【玩家原話必答錨點】：玩家剛才直接對你拋出這句核心質問「" + slotCtx.playerAnchorOnMe + "」，你必須第一句引用並正面回答這點，絕不可答非所問！";
    }
    if (slotCtx.recentTableReactionNote || slotCtx.recentInterjectionNote) {
      const liveBits = [];
      if (slotCtx.recentTableReactionNote) liveBits.push(slotCtx.recentTableReactionNote);
      if (slotCtx.recentInterjectionNote) liveBits.push(slotCtx.recentInterjectionNote);
      pitContextNote += "\n【方才席間神情與舉杯交鋒紀錄（可自然呼應）】：\n- " + liveBits.join("\n- ");
    }
    if (slotCtx.dualSeerWorlds) {
      const dw = slotCtx.dualSeerWorlds;
      const aPits = dw.worldA.wolfPits.map(function (s) { return s.id + "號"; }).join("+");
      const bPits = dw.worldB.wolfPits.map(function (s) { return s.id + "號"; }).join("+");
      pitContextNote += "\n【雙明心觀察員盤坑參考】：如果站 " + dw.seerA.id + "號，狼坑在 " + aPits + (dw.worldA.conflictReason ? ("(" + dw.worldA.conflictReason + ")") : "") +
        "；如果站 " + dw.seerB.id + "號，狼坑在 " + bPits + (dw.worldB.conflictReason ? ("(" + dw.worldB.conflictReason + ")") : "") + "。務必清楚比較站 A 與站 B 的狼坑後表態站邊！";
    }
  }

  const transcript = todayLogs.length > 0
    ? todayLogs.map(function (l) {
      const badgeTag = (l.speakerId === pidNow && l.subBadge && /溫潤潤飾|語氣稍急|三好好話|好話暴擊|酸言警告/.test(l.subBadge)) ? ("［" + l.subBadge + "］") : "";
      return l.title + badgeTag + "：「" + String(l.text || "").slice(0, 180) + "」";
    }).join("\n")
    : "（你是今天第一位發言者，目前還沒有任何人發言過！）";

  const spEffKey = self.effectiveRoleKey || (typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(speaker) : self.role);
  const spRoleDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(speaker) : null) || ROLE_DEFS[self.role];
  let secretIntel = "你的真實底牌：" + (spRoleDef ? spRoleDef.name : "書院夥伴") + "（陣營：" + (self.team === "wolf" ? "酸民狼" : "好人") + "）。";
  if (snap && snap.selfSecretSummary) {
    secretIntel += snap.selfSecretSummary;
  }
  if (self.isElder) {
    secretIntel += self.elderShieldUsed
      ? "你已發動過清心長老豁免盾（目前無公投投票權，但發言具高公信力，應帶領好人歸票）。"
      : "你擁有清心長老首次公投豁免盾（被誤投一次不會離席，可大膽替神職分擔火力）。";
  } else if (self.role === "wolf") {
    const mates = snap ? snap.knownWolfMates : [];
    if (mates.length > 0) {
      secretIntel += "你的狼同伴是：" + mates.map(function (m) {
        return m.id + "號" + m.name + (m.alive ? "(在席)" : "(已離席)");
      }).join("、") + "（絕不可出賣同伴，且你並不知道好人之中誰是真神職，要偽裝好人並自然帶點挑撥語氣栽贓好人）。";
    }
    if (snap && (snap.wolfTactic === "deep_stealth_bus" || snap.wolfTactic === "deep_stealth")) {
      secretIntel += "【狼隊屏風戰術】：全員深水倒鉤互踩做身分，絕不輕易搶跳神職，必要時可適度拉開距離甚至反踩高壓同伴博好人信任。";
    } else if (snap && (snap.wolfTactic === "player_fake_seer_push" || snap.wolfTactic === "pack_push")) {
      secretIntel += "【狼隊屏風戰術】：由玩家同伴親自悍跳定調，你切勿搶跳觀察員，務必全力幫玩家衝票集火同一目標。";
    } else if (snap && (snap.wolfTactic === "mate_fake_seer_gold" || snap.wolfTactic === "fake_seer")) {
      secretIntel += "【狼隊屏風戰術】：同伴悍跳發玩家金水，若你獲授權起跳明心觀察員，請直接發給玩家同伴金水拉高其好人面。";
    }
    if (self.isWolfKing) secretIntel += "你同時是流言首領（白天被公投請離時可發動最後帶風向帶走 1 位在席夥伴）。";
  }

  const playbookKey = self.role === "wolf"
    ? (self.fakeSeer ? "wolf_fake_seer" : (self.isWolfKing && ROLE_STRATEGY_PLAYBOOKS.wolf_king ? "wolf_king" : "wolf_stealth"))
    : (ROLE_STRATEGY_PLAYBOOKS[spEffKey] ? spEffKey : (ROLE_STRATEGY_PLAYBOOKS[self.role] ? self.role : "villager"));
  const rolePlaybook = ROLE_STRATEGY_PLAYBOOKS[playbookKey];

  const claimsSummary = (snap ? snap.seats : [])
    .filter(function (s) { return s.claimedRole && ROLE_DEFS[s.claimedRole]; })
    .map(function (s) { return s.id + "號" + (s.id === pidNow ? "玩家你" : s.name) + "自稱" + ROLE_DEFS[s.claimedRole].name; })
    .join("、") || "目前無人亮明神職身分";

  let priorRoundsArchive = "（目前為第 1 天，尚無前幾輪歷史紀錄）";
  const voteHist = snap ? snap.voteHistory : (state.match.voteHistory || []);
  if (day >= 2) {
    const roundBlocks = [];
    const startDay = Math.max(1, day - 2);
    for (let d = startDay; d < day; d++) {
      const dSpeeches = publicLogs.filter(function (l) { return l.day === d && (l.kind === "speech" || (l.kind === "system" && /遺言/.test(l.title || ""))); });
      const dVotes = voteHist.filter(function (vh) { return vh.day === d; });
      const spText = dSpeeches.length > 0
        ? dSpeeches.map(function (l) { return "  - " + l.title + "：「" + String(l.text || "").slice(0, 120) + "」"; }).join("\n")
        : "  - （無發言紀錄）";
      const vtText = dVotes.length > 0
        ? dVotes.map(function (dv, idx) {
          const label = dVotes.length > 1 && idx > 0 ? ("第 " + d + " 天 PK 票型：") : ("第 " + d + " 天公投票型：");
          return "  - " + label + (dv.ballots || []).map(function (b) { return b.voterId + "號→" + (b.targetId ? (b.targetId + "號") : "棄票"); }).join("｜");
        }).join("\n")
        : "  - （無投票紀錄）";
      roundBlocks.push("【第 " + d + " 輪回顧】\n" + spText + "\n" + vtText);
    }
    priorRoundsArchive = roundBlocks.join("\n").slice(0, 4000);
  }
  const todayTieVotes = voteHist.filter(function (vh) { return vh.day === day; });
  const todayTieNote = (todayTieVotes.length > 0)
    ? ("【今日剛開出的平票票型】：\n" + todayTieVotes.map(function (dv) {
      return "- " + (dv.ballots || []).map(function (b) { return b.voterId + "號→" + (b.targetId ? (b.targetId + "號") : "棄票"); }).join("｜");
    }).join("\n") + "\n")
    : "";

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
    ? ("本局警長（1.5票＆末置位歸票權）：" + shSeat.id + "號" + (shSeat.id === pidNow ? "玩家你" : shSeat.name) + (shSeat.id === self.id ? "（就是你本人，務必在末置位歸總全場坑位）" : "") + "；")
    : "目前場上無警長；";
  const shRecPrompt = snap ? snap.sheriffVoteRecord : null;
  let sheriffVoteArchive = "";
  if (shRecPrompt) {
    const shCandStr = (shRecPrompt.candidateIds || []).map(function (id) { return id + "號"; }).join("、") || "無";
    const shWithStr = (shRecPrompt.withdrawnIds || []).length
      ? ("｜退水：" + shRecPrompt.withdrawnIds.map(function (id) { return id + "號"; }).join("、"))
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
      bfLines.push("現任警長 " + (bfOw ? (bfOw.id + "號") : "") + " 公開警徽流：先驗 " + (bf1 ? (bf1.id + "號") : "") + (bf2 ? (" → 再驗 " + bf2.id + "號") : "") + "（倒牌徽給先位即金水、跳飛或撕徽即查殺）");
    }
    bfSigsPrompt.forEach(function (sig) {
      if (sig && sig.detail) bfLines.push("第" + (sig.day || 1) + "天暗號解讀：" + sig.detail);
    });
    if (bfLines.length > 0) {
      sheriffVoteArchive += "【公開警徽流宣告與暗號解讀（務必結合站邊判斷）】：\n- " + bfLines.join("\n- ") + "\n";
    }
  }
  const fgNotes = [];
  const fgDetailLines = [];
  const harmNow = (snap && typeof snap.harmonyScore === "number") ? snap.harmonyScore : 70;
  fgDetailLines.push("當前茶席三好友善度：" + harmNow + "（" + (harmNow >= 85 ? "清風和煦、全場理性清明" : (harmNow <= 45 ? "酸言霧霾偏重、氣氛緊繃" : "平和推理中")) + "）");
  if (snap && snap.activeDirectorEvent) {
    fgNotes.push("今日茶會事件：「" + snap.activeDirectorEvent.shortTitle + "」");
    fgDetailLines.push("今日茶會事件「" + snap.activeDirectorEvent.shortTitle + "」：" + (snap.activeDirectorEvent.desc || ""));
  }
  const shieldedAlive = (snap && Array.isArray(snap.aliveSeats) ? snap.aliveSeats : []).filter(function (s) { return s.trustShield; });
  if (shieldedAlive.length > 0) {
    fgDetailLines.push("給信心護盾（公投-1票）：" + shieldedAlive.map(function (s) { return s.id + "號"; }).join("、"));
  }
  if (self && self.ironFollowPlayer) {
    fgDetailLines.push("【你的個人承諾】：你剛剛收到玩家（" + pidNow + "號）的給信心護盾，內心高度信任玩家並決定本輪投票跟隨玩家立場，發言切勿反打玩家！");
  }
  const aliveJoyIds = (snap && Array.isArray(snap.fourGJoySuspects) ? snap.fourGJoySuspects : []).filter(function (id) {
    const s = readSeat(id);
    return Boolean(s && s.alive);
  });
  if (aliveJoyIds.length > 0) {
    const joyLabels = aliveJoyIds.map(function (id) {
      const s = readSeat(id);
      return id + "號" + (s && s.microPulse !== null && s.microPulse !== undefined ? ("(心虛" + s.microPulse + "%)") : "");
    }).join("＋");
    fgNotes.push("給歡喜笑僵對象：" + joyLabels);
    fgDetailLines.push("給歡喜曾笑僵對象（其中必藏 1 狼）：" + joyLabels);
  }
  const aliveHopeIds = (snap && Array.isArray(snap.fourGHopePair) ? snap.fourGHopePair : []).filter(function (id) {
    const s = readSeat(id);
    return Boolean(s && s.alive);
  });
  if (aliveHopeIds.length === 2) {
    fgNotes.push("給希望明燈對質席位：" + aliveHopeIds[0] + "號 與 " + aliveHopeIds[1] + "號");
    const hcContras = (snap && snap.hopeConfrontation && Array.isArray(snap.hopeConfrontation.contradictions) && snap.hopeConfrontation.contradictions.length)
      ? ("｜言票矛盾紀錄：" + snap.hopeConfrontation.contradictions.slice(0, 2).join("；"))
      : "";
    fgDetailLines.push("給希望明燈雙向對質：" + aliveHopeIds[0] + "號 與 " + aliveHopeIds[1] + "號剛完成公開對質（僅比對公開言票邏輯，絕不代表兩人中必有狼）" + hcContras);
  }
  if (snap && snap.convenienceRallyTargetId) {
    const convS = readSeat(snap.convenienceRallyTargetId);
    if (convS && convS.alive) {
      fgNotes.push("給方便歸票焦點：" + snap.convenienceRallyTargetId + "號");
      fgDetailLines.push("給方便歸票焦點：玩家已點亮關係線號召好人本輪重點檢視並歸票 " + snap.convenienceRallyTargetId + "號。");
    }
  }
  const todayBlessings = publicLogs.filter(function (l) { return l.day === day && l.kind === "blessing"; }).slice(-4);
  if (todayBlessings.length > 0) {
    fgDetailLines.push("今日三好茶席互動：" + todayBlessings.map(function (l) { return (l.title || "") + " " + String(l.text || "").slice(0, 48); }).join("；"));
  }
  const threeGoodFourGBlock = "【茶席三好與四給公開局勢】：\n- " + fgDetailLines.join("\n- ") + "\n";

  // Subjective impressions derived strictly from self's own blind beliefs (Zero-Leak safe, never uses internal key names!)
  let subjectiveImpressionBlock = "";
  if (self && self.suspicionMap && snap && Array.isArray(snap.aliveOthers)) {
    const scoredOthers = snap.aliveOthers.map(function (s) {
      return { id: s.id, score: typeof self.suspicionMap[s.id] === "number" ? self.suspicionMap[s.id] : 50 };
    });
    const highSusp = scoredOthers.filter(function (x) { return x.score >= 62; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 2);
    const highTrust = scoredOthers.filter(function (x) { return x.score <= 38; }).sort(function (a, b) { return a.score - b.score; }).slice(0, 2);
    if (highSusp.length || highTrust.length) {
      subjectiveImpressionBlock = "【你目前對席間夥伴的主觀直覺】：" +
        (highTrust.length ? ("目前較信任 " + highTrust.map(function (x) { return x.id + "號"; }).join("、") + "；") : "") +
        (highSusp.length ? ("目前較懷疑 " + highSusp.map(function (x) { return x.id + "號"; }).join("、") + "。") : "") + "\n";
    }
  }

  // Zero-Leak: Public board configuration only (NEVER scans hidden seats[].role === "guard"!)
  const hasGuardRole = snap ? snap.hasGuardMode : Boolean(state.guardMode && state.match && state.match.totalSeats >= 8);
  const aowuEndgameNote = "【凹嗚規則準則】：採標準屠邊制（狼刀在先），最後一神若是直心糾察長在夜間被狼鎖定將直接屠神結束且無法開槍" + (hasGuardRole ? "；本局含護心守衛，須防與回甘茶同守同救破盾！" : "。");

  const ledgerObj = (day >= 2 && typeof buildCrossDayMemoryLedger === "function") ? buildCrossDayMemoryLedger(speaker, snap) : null;
  const ledgerNote = (ledgerObj && ledgerObj.lines && ledgerObj.lines.length)
    ? ("【跨日恩怨與矛盾記憶帳本】：\n- " + ledgerObj.lines.join("\n- ") + "\n")
    : "";
  const voteMatrixObj = (day >= 2 && typeof buildVoteSpeechMatrix === "function") ? buildVoteSpeechMatrix(speaker, snap) : null;
  const voteMatrixNote = (voteMatrixObj && voteMatrixObj.summaryLines && voteMatrixObj.summaryLines.length)
    ? ("【跨輪言票一致性與同票關聯矩陣（嚴格公開事證，必納入排坑）】：\n- " + voteMatrixObj.summaryLines.join("\n- ") + "\n")
    : "";

  const sheriffSpeechLogs = (day === 1)
    ? publicLogs.filter(function (l) { return l.day === 1 && l.kind === "system" && /警上/.test(l.title || ""); }).slice(-6)
    : [];
  const sheriffSpeechBlock = sheriffSpeechLogs.length > 0
    ? ("【第1天警上競選發言摘要】：\n" + sheriffSpeechLogs.map(function (l) { return "- " + l.title + "：「" + String(l.text || "").slice(0, 95) + "」"; }).join("\n") + "\n")
    : "";

  const lastCas = (snap && Array.isArray(snap.lastNightCasualties)) ? snap.lastNightCasualties : [];
  const totalSeatsNow = snap ? snap.totalSeats : ((state.match && state.match.totalSeats) || 8);
  const lockedClaim = getAllowedGeminiClaimRole(speaker, fallbackMeta);
  const lockedClaimRoleDef = lockedClaim && ROLE_DEFS[lockedClaim] ? ROLE_DEFS[lockedClaim].name : null;
  const unspokenNums = (snap ? snap.aliveSeats : getAliveSeats())
    .filter(function (s) { return s.id !== self.id && spokenIds.indexOf(s.id) === -1; })
    .map(function (s) { return s.id + "號"; });
  const hasVoteArchiveNow = Boolean(
    (voteHist && voteHist.length > 0) ||
    (shRecPrompt && Array.isArray(shRecPrompt.ballots) && shRecPrompt.ballots.length > 0)
  );
  const wolfSlipHint = (self.role === "wolf" && fallbackMeta && fallbackMeta.hasToxicSlip)
    ? "- 酸民狼微破綻演出：本輪語氣可以略顯急躁、自然夾帶一句輕度帶刺口癖（如「別演了」或「亂帶風向」），供機敏玩家抓包化解（但絕不可人身辱罵）。\n"
    : "";
  const skeletonParts = [];
  if (fallbackMeta && fallbackMeta.accuseId) skeletonParts.push("主要懷疑並準備投 " + fallbackMeta.accuseId + "號");
  if (fallbackMeta && fallbackMeta.vouchId) skeletonParts.push("較信任力挺 " + fallbackMeta.vouchId + "號");
  if (fallbackMeta && fallbackMeta.standWithSeerId) skeletonParts.push("目前站邊 " + fallbackMeta.standWithSeerId + "號觀察員");
  if (fallbackMeta && Array.isArray(fallbackMeta.wolfPits) && fallbackMeta.wolfPits.length) {
    skeletonParts.push("初步點狼坑：" + fallbackMeta.wolfPits.map(function (id) { return id + "號"; }).join("、"));
  }
  if (lockedClaim === "seer" && fallbackMeta && fallbackMeta.badgeFlow && fallbackMeta.badgeFlow.firstTargetId) {
    skeletonParts.push("可順帶交代警徽流先看 " + fallbackMeta.badgeFlow.firstTargetId + "號" + (fallbackMeta.badgeFlow.secondTargetId ? ("、再看 " + fallbackMeta.badgeFlow.secondTargetId + "號") : ""));
  }
  const tacticalSkeletonNote = skeletonParts.length
    ? ("【本輪純邏輯立場骨架（嚴禁套版，請完全以自己的角色口吻與真實對話脈絡即興發揮）】：\n- " + skeletonParts.join("；") + "。\n")
    : "【本輪純邏輯立場骨架】：場上線索尚淺，請依自身性格自然聽牌、點評前面剛發言的人，絕不照背制式台詞。\n";
  const lockedDirective =
    "【本輪最高鎖定規則（絕對禁止違背或編造）】\n" +
    "- 亮牌權限：" + (lockedClaimRoleDef
      ? ("你本輪【必須且僅能】以「" + lockedClaimRoleDef + "」身分發言（JSON claimRole 固定填 \"" + lockedClaim + "\"）；絕不可改跳別的職能，也不可捏造未發生的查驗／救援。")
      : ("你本輪【嚴禁】自稱或冒充任何神職（禁止說自己是觀察員／奉茶師／糾察長／守衛／長老，也禁止說昨晚驗人／救人／守人；JSON claimRole 必須填 null）！")) + "\n" +
    (self.role === "seer" && fallbackMeta && fallbackMeta.checkedWolfId
      ? ("- 真觀察員查殺鎖定：你親查出 " + fallbackMeta.checkedWolfId + "號是酸民狼，本輪必須明確報查殺並把 " + fallbackMeta.checkedWolfId + "號點進狼坑！\n")
      : "") +
    wolfSlipHint +
    "- 今日尚未發言座位：" + (unspokenNums.length ? unspokenNums.join("、") : "無（你是最後一位）") + "（嚴禁評論未發言者「說過的話」，但可以提及公開的四給／笑僵／護盾線索）。\n" +
    (!hasVoteArchiveNow ? "- 目前全場尚未進行過任何投票，嚴禁提及「剛剛有人衝票、跟票、看票型」！\n" : "");

  const prompt =
    "你正在參與青嵐書院茶席推理遊戲《三好AI狼人殺》（融入存好心、說好話、做好事理念，以理性防制網路酸言與假訊息取代傳統陰暗衝突，所有「出局」改為請離席冷靜）。\n" +
    "你扮演：" + self.id + "號「" + self.name + "」。個性鮮明設定：" + flvBio + "。\n" +
    styleSamples +
    mindDesc + "。\n" +
    secretIntel + "\n" +
    lockedDirective +
    pkHint +
    threeGoodFourGBlock +
    subjectiveImpressionBlock +
    (pitContextNote ? (pitContextNote + "\n") : "") +
    ledgerNote +
    voteMatrixNote +
    "【你的專屬身分玩法攻略（務必遵守）】：\n" + rolePlaybook + "\n" +
    "【當前局勢情報】：第 " + day + " 天白天｜昨夜結果：" + (lastCas.length > 0 ? (lastCas.map(function (id) { return id + "號離席"; }).join("、")) : "平安夜無人離席") + "｜" + sheriffLine + (fgNotes.length ? ("公開茶席線索（" + fgNotes.join("、") + "）｜") : "") + "在場座位：" + aliveList + "\n" +
    aowuEndgameNote + "\n" +
    "【場上已宣稱身分】：" + claimsSummary + "\n" +
    sheriffVoteArchive +
    sheriffSpeechBlock +
    todayTieNote +
    "【前 1 至 " + Math.max(0, day - 1) + " 輪完整歷史發言與票型檔案】：\n" + priorRoundsArchive + "\n" +
    "【今天（第 " + day + " 輪）到目前為止的真實發言逐字稿】：\n" + transcript + "\n" +
    tacticalSkeletonNote +
    "嚴格規則：\n" +
    "1. 【最高優先】嚴守上方【本輪最高鎖定規則】與今日發言時序！被前置位點進狼坑或指認時第一句必須回應；雙觀察員對跳時務必比較站 A 坑與站 B 坑；若你自己就是跳明心觀察員且已有對跳對手，對方在你眼中已是定狼，絕對不可說「今晚再去驗對跳觀察員」，警徽流只能驗其他未驗的中立位（且你自己跳觀察員時 JSON 的 standWithSeerId 必為 null）！\n" +
    "2. 【獨立綜合判斷】你完全不知道其他人的真實底牌（除同伴或觀察員親查對象外）！必須參考前面「所有」已發言者的話與三好四給線索來綜合判斷誰在狼坑、誰在好人坑。\n" +
    "3. 只能評論「今日已發言」的人說過的話，絕對禁止捏造「今日尚未發言」者的發言內容（未發言者僅能說「後置位還沒發言，待會聽表水」）。\n" +
    "4. 【嚴禁 AI 機器味與朗讀播報腔・像真實台灣大學茶社同儕圍桌聊天】提到任何座位請一律寫「阿拉伯數字＋號」（如 1號、3號、6號、11號），嚴禁寫前導零（01、06）、嚴禁省略「號」字（站3、抓6），也嚴禁寫中文數字（三號、六號）！禁止出現「根據上述資料」「綜上所述」「總而言之」「值得注意的是」「邏輯閉環」「數據模型」「高置信度」「異常值」「行為向量」「算力」或生硬古文代詞（「吾、汝、諸君、妾身、夫、蓋」），亦禁止機械重複以「先這樣，過！」或制式開場白作結。全桌以自然台灣現代白話為基底（墨白、晴嵐、阿竹保留溫和書卷氣質與適度四字成語），整段發言最多使用 1 個驚嘆號（多用「，」「。」「？」「…」製造自然換氣感），自然接前一位的話回嘴或點破剛剛的席間神情／追問。\n" +
    (day >= 2 ? ("5. 【第 " + day + " 輪對話連貫】：自然消化前 1 至 " + (day - 1) + " 輪的歷史發言與公投票型，抓出前後矛盾的人。\n") : "") +
    "6. 【三檔動態句長配額與純口語格式】本輪句長檔位為「" + ((snap && snap.speechCharCap > 0) ? ("茶涼聽牌／閃電快棋決死短兵相接（嚴格 " + snap.speechCharCap + " 字以內，直指關鍵一針見血！）") : ((fallbackMeta && fallbackMeta.lengthTier === "brief") ? "極短留白過水（嚴格 15～28 字，簡短自然表態即停）" : ((fallbackMeta && fallbackMeta.lengthTier === "intense") ? "焦點交鋒反詰（60～95 字，直面質疑拆解坑位）" : (totalSeatsNow >= 10 ? "標準推演（42～75 字）" : "標準推演（45～82 字）")))) + "」（切勿長篇大論、禁用換行、禁用 Markdown 符號、無表情符號與括號動作），並只輸出單一純 JSON 物件：\n" +
    '{"text":"你的台詞內容","accuseId":懷疑並準備投票的座位整數或null,"vouchId":相信並站邊力挺的座位整數或null,"claimRole":' + (lockedClaim ? ('"' + lockedClaim + '"') : 'null') + ',"wolfPits":[狼坑座號陣列],"goodPits":[好人坑座號陣列],"standWithSeerId":雙觀察員且你本人非觀察員時站邊的座號或null,"emotion":"calm"|"sharp"|"warm"|"urgent"|"defensive"}';

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiAiSpeech(speaker, fallbackMeta) {
  tryGenerateGeminiAiSpeech._lastRejectReason = "";
  const built = buildBlindGeminiSpeechPrompt(speaker, fallbackMeta);
  if (!built || !built.audit || !built.audit.ok) {
    tryGenerateGeminiAiSpeech._lastRejectReason = "prompt_audit";
    return null;
  }
  const totalSNow = (built.snap && built.snap.totalSeats) || 8;
  const lockedRoleNow = getAllowedGeminiClaimRole(speaker, fallbackMeta);
  const isSheriffNow = Boolean(built.snap && built.snap.sheriffSeatId === speaker.id);
  const isPkNow = Boolean(built.snap && built.snap.pkActive);
  const aliveSeerClaimCount = (built.snap && Array.isArray(built.snap.seats))
    ? built.snap.seats.filter(function (s) { return s.alive && s.claimedRole === "seer"; }).length
    : 0;
  const isDualSeerOrGod = Boolean(lockedRoleNow || aliveSeerClaimCount >= 2);
  const tempVal = resolveGeminiSpeechTemperature("day", {
    pkActive: isPkNow,
    isSheriff: isSheriffNow,
    isDualSeerOrGod: isDualSeerOrGod
  });
  const isBriefPass = Boolean(fallbackMeta && fallbackMeta.lengthTier === "brief");
  const useLiteTier = Boolean(totalSNow >= 10 && isBriefPass && !lockedRoleNow && !isSheriffNow && !(fallbackMeta && (fallbackMeta.checkedWolfId || fallbackMeta.accuseId)));
  const rawOut = await callGeminiText(built.prompt, { jsonMode: true, lite: useLiteTier, temperature: tempVal });
  const parsed = rawOut ? parseGeminiStructuredSpeech(rawOut) : null;
  if (!parsed) return null;
  const check = validateGeminiSpeechReality(speaker, fallbackMeta, parsed, built.snap);
  if (!check.ok) {
    tryGenerateGeminiAiSpeech._lastRejectReason = check.reason || "guardrail";
    return null;
  }
  return parsed;
}

// ==================== FULL-STAGE LIVE GEMINI GENERATORS (SHERIFF / LAST WORDS / INTERJECT / CONFRONTATION) ====================
function _buildMiniSecretIntelForPrompt(snap) {
  if (snap && typeof snap.selfSecretSummary === "string" && snap.selfSecretSummary) {
    return snap.selfSecretSummary;
  }
  return "【你的真實底牌】：好人陣營。";
}

function _buildMiniPersonaBlock(self) {
  const flv = (typeof PERSONA_FLAVORS !== "undefined" && self && PERSONA_FLAVORS[self.name]) ? PERSONA_FLAVORS[self.name] : null;
  const bio = flv ? flv.bio : (self && self.trait ? self.trait : "冷靜理性、語氣自然的大學茶友");
  const samples = (flv && Array.isArray(flv.samples) && flv.samples.length)
    ? ("語氣參考（只學語氣與口癖，絕不照抄）：" + flv.samples.slice(0, 2).join(" / ") + "\n")
    : "";
  return "你扮演：" + self.id + "號「" + self.name + "」。個性：" + bio + "。\n" + samples;
}

function _validateMiniLiveText(raw, self, opts) {
  if (!raw || !self) return null;
  const o = opts || {};
  let clean = normalizeGeminiSpeechText(raw);
  if (!clean) return null;
  if (typeof normalizeSeatRefsInText === "function") clean = normalizeSeatRefsInText(clean);
  clean = clean.replace(/^「|」$/g, "").trim();
  const minLen = o.minLen || 14;
  const maxLen = o.maxLen || 125;
  if (clean.length < minLen) return null;
  if (clean.length > maxLen) {
    const cut = clean.slice(0, maxLen);
    const lastStop = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"), cut.lastIndexOf("，"));
    clean = (lastStop >= Math.floor(maxLen * 0.55) ? cut.slice(0, lastStop + 1) : cut).trim();
  }
  // Never allow wolf self-outing
  if (self.role === "wolf" && /(?:其實我是|我就是|我們是|身為).{0,3}(?:酸民狼|狼人|流言首領|狼隊)|(?:我的狼同伴|我們狼隊|狼隊友)/.test(clean)) {
    return null;
  }
  // Never allow unauthorized god-role claim
  const allowedClaim = o.allowedClaim || null;
  const allRolesPat = "(?:明心觀察員|觀察員|預言家|滴水奉茶師|奉茶師|直心糾察長|糾察長|護心守衛|守衛|清心長老)";
  const selfClaimPre = "(?:我(?:才|就)?是(?:這張|本局)?(?:真)?|我這(?:真|張)|我(?:直接)?(?:起跳|拍|亮出|亮明))";
  if (!allowedClaim) {
    if (new RegExp(selfClaimPre + "(?!覺得|認為|想|幫|保|信|懷疑|猜|看)[^，。！？；;]{0,6}" + allRolesPat).test(clean)) {
      return null;
    }
  }
  if (o.mustContainSeatId) {
    const reqRe = new RegExp("(?<!\\d)0?" + o.mustContainSeatId + "(?:號|(?=[，。！？、\\s]|$))");
    if (!reqRe.test(clean)) return null;
  }
  if (o.mustContainKeywordRe && !o.mustContainKeywordRe.test(clean)) {
    return null;
  }
  return clean;
}

function _recordMiniLlmTrace(tagLabel, t0, summary) {
  if (typeof orchestrator === "undefined") return;
  if (orchestrator.stats) {
    orchestrator.stats.dispatches = (orchestrator.stats.dispatches || 0) + 1;
    orchestrator.stats.geminiHits = (orchestrator.stats.geminiHits || 0) + 1;
  }
  if (typeof orchestrator.recordTrace === "function") {
    const dt = Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0));
    orchestrator.recordTrace({
      agent: "PersonaAgent",
      tier: getActiveLlmLabel() + " (" + tagLabel + ")",
      ms: dt,
      compliance: true,
      summary: summary
    });
  }
}

function buildBlindGeminiSheriffPrompt(cand, priorSpeeches, built, opts) {
  const o = opts || {};
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(cand, { module: "sheriff_speech", phase: "SHERIFF_ELECTION" })
    : null;
  const self = (snap && snap.self) ? snap.self : cand;
  const secretIntel = _buildMiniSecretIntelForPrompt(snap);
  const pid = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
  const readSeat = snap ? snap.getSeat : getSeat;
  const labelOf = function (id) {
    const s = readSeat(id);
    if (!s) return id + "號";
    return s.id + "號" + (s.id === pid ? "你" : s.name);
  };
  const aliveList = (snap ? snap.aliveSeats : getAliveSeats()).map(function (s) {
    return s.id + "號" + (s.id === pid ? "玩家" : s.name);
  }).join("、");
  const priorArr = Array.isArray(priorSpeeches) ? priorSpeeches : [];
  const priorTranscript = priorArr.length > 0
    ? priorArr.map(function (sp) {
      return "- " + sp.id + "號" + (sp.id === pid ? "玩家" : sp.name) + "（" + (sp.tag || "警上發言") + "）：" + String(sp.text || "").replace(/^「|」$/g, "").slice(0, 120);
    }).join("\n")
    : "（你是第一位警上發言者，前面尚無人發言。）";

  const isSeerStand = Boolean(built && (built.tone === "seer" || built.tone === "clash"));
  const isClash = Boolean(built && built.tone === "clash");
  const isBluffStand = Boolean(built && built.tone === "bluff");
  const isPlayfulStand = Boolean(built && built.tone === "playful");
  const isWithdraw = Boolean(o.aiBluffWithdraw);
  const isPk = Boolean(o.isPkRound);

  const standRules = [];
  if (isPk) {
    standRules.push("現在進入「警上平票 PK 決選」最後拉票，語氣果斷誠懇，直面競爭對手並爭取警下票數（30～55字）。");
  } else if (isWithdraw && isPlayfulStand) {
    standRules.push("你本輪是「上警隨性亂聊搶麥後主動退水」：用輕鬆幽默的語氣隨意聊兩句、盲猜一位場上氣氛，最後大方宣布自己只是上來過過麥克風癮、現在拱手退水回警下投票（嚴禁冒充真神職，40～70字）。");
  } else if (isWithdraw) {
    standRules.push("你本輪是「詐身分上警試探後主動拱手退水」：故意點名一位夥伴試探反應或假裝帶節奏，並在結尾笑著攤牌說明只是詐身分、現在明確說出「退水」回警下投票（絕不可真的冒充神職，40～72字）。");
  } else if (isSeerStand) {
    const lastChk = (snap && snap.selfLastCheck) ? snap.selfLastCheck : null;
    const chkTargetId = lastChk ? lastChk.targetId : (built && built.checkTargetId ? built.checkTargetId : null);
    const chkVerdict = lastChk ? (lastChk.isWolf ? "酸民狼(查殺)" : "好人(金水)") : "好人(金水)";
    standRules.push("你本輪必須正式起跳「明心觀察員」競選警長" + (isClash && built.rivalId ? ("，並且直接反擊剛才搶跳對跳的 " + labelOf(built.rivalId) + " 是假觀察員／悍跳狼") : "") + "！");
    if (chkTargetId) {
      standRules.push("必須明確報出昨夜查驗結果：" + chkTargetId + "號為「" + chkVerdict + "」。");
    }
    if (built && built.badgeFlow && built.badgeFlow.firstTargetId) {
      const bf = built.badgeFlow;
      standRules.push("必須自然交代你的警徽流：今晚先驗 " + bf.firstTargetId + "號" + (bf.secondTargetId ? ("、再驗 " + bf.secondTargetId + "號") : "") + "（簡述倒牌飛徽即金水、撕徽即查殺）。");
    }
    standRules.push("字數 55～95 字，像真實台灣狼人殺玩家在警上侃侃而談、有氣勢又不制式。");
  } else if (isBluffStand) {
    standRules.push("你本輪以非觀察員身分上警「詐身分試水溫」：俏皮地胡亂點名一位夥伴試探對方會不會緊張，笑稱自己是來炸後置位看反應的，語氣生動有面殺博弈感（嚴禁真的自稱是明心觀察員／奉茶師／守衛／糾察長，40～72字）。");
  } else if (isPlayfulStand) {
    standRules.push("你本輪以非觀察員身分上警「隨性亂聊搶麥」：語氣輕鬆搞笑，表示自己只是想搶先拿麥克風暖場或憑直覺亂點一位夥伴玩一下，不一定要搶贏警徽（嚴禁冒充任何神職，38～68字）。");
  } else {
    standRules.push("你本輪以「非觀察員」身分上警競選（嚴禁冒充明心觀察員／奉茶師／守衛／糾察長！），自然回應前面剛發言的候選人（若有觀察員起跳或有人上來亂聊可順口點評，若自己是第一位則輕鬆開場爭取末置位歸票權），40～72 字。");
  }

  const prompt =
    "你正在參與青嵐書院茶席推理遊戲《三好AI狼人殺》的「第 1 天警長競選（警上發言）」。此時尚未公布昨夜倒牌結果，也尚未進行任何公投。\n" +
    _buildMiniPersonaBlock(self) +
    secretIntel + "\n" +
    "【在場座位】：" + aliveList + "\n" +
    "【前面已完成之警上真實發言】：\n" + priorTranscript + "\n" +
    "【本輪警上任務與硬性規則】：\n- " + standRules.join("\n- ") + "\n" +
    "【口語要求】：自然台灣現代白話（墨白、晴嵐、阿竹保留淡雅書卷氣），座號一律寫阿拉伯數字加「號」（如 3號、7號），禁止前導零、禁止換行、禁止 Markdown、禁止表情符號與括號動作、禁止「綜上所述／根據上述資料」等 AI 腔。只輸出你要說的一段純台詞文字（不要加引號與 JSON）：";

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiSheriffSpeech(cand, priorSpeeches, built, opts) {
  if (!cand || typeof callGeminiText !== "function") return null;
  const o = opts || {};
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pack = buildBlindGeminiSheriffPrompt(cand, priorSpeeches, built, o);
  if (!pack || !pack.audit || !pack.audit.ok) return null;
  const tempVal = resolveGeminiSpeechTemperature(o.isPkRound ? "pk" : "sheriff", { isPkRound: Boolean(o.isPkRound) });
  const raw = await callGeminiText(pack.prompt, { jsonMode: false, temperature: tempVal });
  if (!raw) return null;
  const isSeerStand = Boolean(built && (built.tone === "seer" || built.tone === "clash"));
  const clean = _validateMiniLiveText(raw, pack.snap ? pack.snap.self : cand, {
    minLen: o.isPkRound ? 16 : 22,
    maxLen: o.isPkRound ? 78 : 118,
    allowedClaim: isSeerStand ? "seer" : null,
    mustContainSeatId: (isSeerStand && built && built.badgeFlow && built.badgeFlow.firstTargetId && !o.isPkRound) ? built.badgeFlow.firstTargetId : null,
    mustContainKeywordRe: o.aiBluffWithdraw ? /退水|回警下|退出/ : null
  });
  if (!clean) return null;
  _recordMiniLlmTrace(o.isPkRound ? "警上PK" : "警上競選", t0, cand.id + "號 " + cand.name + " 即興警上拉票");
  return "「" + clean + "」";
}

function buildBlindGeminiLastWordsPrompt(seat, mode, lwObj) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(seat, { module: "last_words", phase: "LAST_WORDS_SPEECH" })
    : null;
  const self = (snap && snap.self) ? snap.self : seat;
  const secretIntel = _buildMiniSecretIntelForPrompt(snap);
  const pid = snap ? snap.playerSeatId : (typeof getPlayerId === "function" ? getPlayerId() : 1);
  const isFirstNight = (mode === "first_night");
  const aliveList = (snap ? snap.aliveSeats : getAliveSeats()).map(function (s) {
    return s.id + "號" + (s.id === pid ? "玩家" : s.name);
  }).join("、");
  const recentLogs = (snap && Array.isArray(snap.publicLogs) ? snap.publicLogs : [])
    .filter(function (l) { return l && (l.kind === "speech" || l.kind === "dawn" || l.kind === "system"); })
    .slice(-6)
    .map(function (l) { return "- " + (l.title || "") + (l.text ? ("：" + String(l.text).slice(0, 72)) : ""); })
    .join("\n") || "（尚無前段公開紀錄）";

  const directives = [];
  if (lwObj && lwObj.claimRole && ROLE_DEFS[lwObj.claimRole]) {
    const rName = ROLE_DEFS[lwObj.claimRole].name;
    if (lwObj.isFakeGodBluff) {
      directives.push("你臨走決定反向攪局，假裝自己是「" + rName + "」替 " + (lwObj.targetId ? (lwObj.targetId + "號") : "同伴") + " 站台喊冤，動搖好人陣營判斷！");
    } else {
      directives.push("你本輪公開亮明自己是「" + rName + "」交代遺言" + (lwObj.targetId ? ("，務必明確點出 " + lwObj.targetId + "號 的關鍵資訊（" + (lwObj.isWolf ? "可疑／酸民狼" : "好人／已保護對象") + "）") : "") + "。");
    }
  } else {
    directives.push("你以一般茶客（好人或低調偽裝）身分發表離席遺言，嚴禁冒充未授權的神職；自然流露不甘或叮嚀，點出你最在意或最懷疑的對象" + (lwObj && lwObj.targetId ? ("（重點提及 " + lwObj.targetId + "號）") : "") + "。");
  }

  const prompt =
    "你正在參與青嵐書院《三好AI狼人殺》，你剛在「" + (isFirstNight ? "第 1 晚首夜離席" : "白天公投最高票離席") + "」，現在是你的最後遺言時間。\n" +
    _buildMiniPersonaBlock(self) +
    secretIntel + "\n" +
    "【目前仍在場座位】：" + aliveList + "\n" +
    "【近期公開場況】：\n" + recentLogs + "\n" +
    "【遺言指引】：\n- " + directives.join("\n- ") + "\n" +
    "【口語要求】：35～75 字自然台灣口語，帶一點離席前的真誠情緒或犀利點評；座號寫阿拉伯數字加「號」（如 3號），禁止換行、Markdown、表情符號與括號動作，只輸出純台詞文字：";

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiLastWords(seat, mode, lwObj) {
  if (!seat || typeof callGeminiText !== "function") return null;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pack = buildBlindGeminiLastWordsPrompt(seat, mode, lwObj);
  if (!pack || !pack.audit || !pack.audit.ok) return null;
  const tempVal = resolveGeminiSpeechTemperature("last_words");
  const raw = await callGeminiText(pack.prompt, { jsonMode: false, temperature: tempVal });
  if (!raw) return null;
  const mustSeat = (lwObj && lwObj.targetId && (lwObj.claimRole === "seer" || lwObj.claimRole === "witch" || lwObj.claimRole === "guard"))
    ? lwObj.targetId
    : null;
  const clean = _validateMiniLiveText(raw, pack.snap ? pack.snap.self : seat, {
    minLen: 18,
    maxLen: 96,
    allowedClaim: (lwObj && lwObj.claimRole) ? lwObj.claimRole : null,
    mustContainSeatId: mustSeat
  });
  if (!clean) return null;
  _recordMiniLlmTrace("離席遺言", t0, seat.id + "號 " + seat.name + " 即興遺言生成");
  return clean;
}

function buildBlindGeminiInterjectionPrompt(targetSeat, questionText, fallbackReply) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(targetSeat, { module: "tea_interject", phase: "DAY_SPEECH" })
    : null;
  const self = (snap && snap.self) ? snap.self : targetSeat;
  const secretIntel = _buildMiniSecretIntelForPrompt(snap);
  const dayEvs = snap ? snap.daySpeechEvents : [];
  const ownEv = dayEvs.slice().reverse().find(function (ev) { return ev && ev.speakerId === self.id; });
  const ownSpeechBit = ownEv && ownEv.rawText ? ("你剛剛才說過：「" + String(ownEv.rawText).slice(0, 95) + "」\n") : "";
  const isTense = Boolean(fallbackReply && fallbackReply.tense);

  const prompt =
    "你正在《三好AI狼人殺》茶席發言途中，玩家（" + (snap ? snap.playerSeatId : 1) + "號）突然「舉杯追問」打斷你！\n" +
    _buildMiniPersonaBlock(self) +
    secretIntel + "\n" +
    ownSpeechBit +
    "【玩家當場對你的追問】：「" + String(questionText || "").trim() + "」\n" +
    "【回應指引】：請直接針對玩家這句追問臨場回防（嚴禁答非所問，絕不可自爆狼人身分，也不可冒充未宣稱的神職）。" +
    (isTense ? "你此刻其實有點被問中要害，語氣略微閃躲或急著找理由圓場，但仍要維持理性對話。" : "語氣自然坦蕩、切中玩家問題要點。") + "\n" +
    "【字數與格式】：嚴格 16～42 字單句自然台灣口語，座號寫阿拉伯數字加「號」，禁止換行、表情符號與括號動作，只輸出純回覆文字：";

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiInterjectionReply(targetSeat, questionText, fallbackReply) {
  if (!targetSeat || typeof callGeminiText !== "function") return null;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pack = buildBlindGeminiInterjectionPrompt(targetSeat, questionText, fallbackReply);
  if (!pack || !pack.audit || !pack.audit.ok) return null;
  const tempVal = resolveGeminiSpeechTemperature("interject");
  const raw = await callGeminiText(pack.prompt, { jsonMode: false, temperature: tempVal });
  if (!raw) return null;
  const clean = _validateMiniLiveText(raw, pack.snap ? pack.snap.self : targetSeat, {
    minLen: 10,
    maxLen: 52,
    allowedClaim: targetSeat.claimedRole || null
  });
  if (!clean) return null;
  _recordMiniLlmTrace("舉杯追問", t0, targetSeat.id + "號 " + targetSeat.name + " 臨場回防玩家追問");
  return clean;
}

function buildBlindGeminiConfrontationPrompt(speaker, rival, baseLine) {
  const snap = typeof createBlindMatchSnapshot === "function"
    ? createBlindMatchSnapshot(speaker, { module: "hope_confrontation", phase: "DAY_SPEECH" })
    : null;
  const self = (snap && snap.self) ? snap.self : speaker;
  const secretIntel = _buildMiniSecretIntelForPrompt(snap);
  const readSeat = snap ? snap.getSeat : getSeat;
  const rSeat = readSeat(rival.id) || rival;
  const dayEvs = snap ? snap.daySpeechEvents : [];
  const rivalEv = dayEvs.slice().reverse().find(function (ev) { return ev && ev.speakerId === rival.id; });
  const rivalQuote = rivalEv && rivalEv.rawText
    ? ("對方（" + rival.id + "號" + rSeat.name + "）今日發言：「" + String(rivalEv.rawText).slice(0, 95) + "」")
    : ("對方（" + rival.id + "號" + rSeat.name + "）目前發言立場模糊");
  const pitsStr = (baseLine && Array.isArray(baseLine.wolfPits) && baseLine.wolfPits.length)
    ? baseLine.wolfPits.map(function (id) { return id + "號"; }).join("、")
    : (rival.id + "號");

  const prompt =
    "你正在《三好AI狼人殺》的「給希望・15 秒明燈雙向對質」舞台上，與 " + rival.id + "號" + rSeat.name + " 當面對質！\n" +
    _buildMiniPersonaBlock(self) +
    secretIntel + "\n" +
    "【對質現況】：" + rivalQuote + "\n" +
    "【你的對質立場】：直接點名反駁 " + rival.id + "號 的言行或邏輯破綻，並亮出你目前盤的狼坑（" + pitsStr + "）。絕不可暴露自己是狼，也不可冒充未宣稱神職。\n" +
    "【字數與格式】：嚴格 28～62 字犀利而有禮的台灣圓桌口語，必須點出 " + rival.id + "號，禁止換行、表情符號與括號動作，只輸出純台詞：";

  const audit = typeof auditLlmPromptLeak === "function"
    ? auditLlmPromptLeak(snap, secretIntel, prompt)
    : { ok: true, blockedReasons: [] };

  return { prompt: prompt, secretIntel: secretIntel, snap: snap, audit: audit };
}

async function tryGenerateGeminiConfrontationLine(speaker, rival, baseLine) {
  if (!speaker || !rival || typeof callGeminiText !== "function") return null;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pack = buildBlindGeminiConfrontationPrompt(speaker, rival, baseLine);
  if (!pack || !pack.audit || !pack.audit.ok) return null;
  const tempVal = resolveGeminiSpeechTemperature("confrontation");
  const raw = await callGeminiText(pack.prompt, { jsonMode: false, temperature: tempVal });
  if (!raw) return null;
  const clean = _validateMiniLiveText(raw, pack.snap ? pack.snap.self : speaker, {
    minLen: 16,
    maxLen: 76,
    allowedClaim: speaker.claimedRole || null,
    mustContainSeatId: rival.id
  });
  if (!clean) return null;
  _recordMiniLlmTrace("明燈對質", t0, speaker.id + "號 對質 " + rival.id + "號");
  return clean;
}
