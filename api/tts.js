/**
 * Vercel Serverless Function: /api/tts
 * 安全代理公版 Gemini 真人級語音合成（金鑰僅存於 Vercel Environment Variables，絕不暴露至前端）
 *
 * 環境變數設定（於 Vercel Project → Settings → Environment Variables）：
 * - GEMINI_API_KEY               (必填) Google AI Studio API Key
 * - GEMINI_PUBLIC_TTS_ENABLED    (選填，預設開啟；設為 "false" 可一鍵關閉公版雲端語音)
 * - GEMINI_TTS_MODEL             (選填，預設 gemini-3.8-flash-lite-tts；舊版 2.5 / 3.1 會自動升級為 3.8 Flash-Lite)
 * - GEMINI_TTS_SESSION_MAX_RPM   (選填，每瀏覽器會話每分鐘上限，預設 180)
 * - GEMINI_TTS_SESSION_MAX_RPD   (選填，每瀏覽器會話每日上限，預設 4000)
 * - GEMINI_TTS_NAT_IP_MAX_RPM    (選填，純 IP 與區網共用 IP 每分鐘上限，預設 360)
 * - GEMINI_TTS_NAT_IP_MAX_RPD    (選填，純 IP 與區網共用 IP 每日上限，預設 8000)
 */
"use strict";

const ALLOWED_VOICES = new Set([
  "Leda", "Kore", "Puck", "Orus", "Aoede", "Charon", "Zephyr", "Callirrhoe", "Fenrir",
  "Enceladus", "Achird", "Iapetus", "Autonoe", "Laomedeia", "Vindemiatrix", "Sulafat"
]);
const CORE_FALLBACK_VOICE_MAP = {
  Leda: "Zephyr",
  Orus: "Puck",
  Fenrir: "Puck",
  Aoede: "Zephyr",
  Callirrhoe: "Zephyr",
  Autonoe: "Zephyr",
  Laomedeia: "Zephyr",
  Vindemiatrix: "Zephyr",
  Sulafat: "Zephyr",
  Enceladus: "Puck",
  Achird: "Charon",
  Iapetus: "Puck"
};
const TTS_MODEL_CHAIN = [
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
  "gemini-2.5-flash-preview-tts"
];
const ALLOWED_TTS_MODELS = new Set(TTS_MODEL_CHAIN);
const DEFAULT_TTS_MODEL = "gemini-3.8-flash-lite-tts";
const TTS_FALLBACK_ORDER = TTS_MODEL_CHAIN;
const LEGACY_UPGRADE_TTS_MODELS = new Set([
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
  "gemini-3.1-flash-tts-preview"
]);

const MAX_TEXT_CHARS = 280;
const RATE_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAD_MODEL_COOLDOWN_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 3 * 60 * 1000;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,48}$/;
const MAX_TTS_CACHE = 48;
const TOTAL_BUDGET_MS = 9600;
const MIN_INLINE_AUDIO_B64_LEN = 1600;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 4200;

const _rateStore = new Map();
const _badModelCooldown = new Map();
const _ttsCache = new Map();
let _lastPruneAt = 0;

function isTtsEnabledByEnv() {
  const flag = String(process.env.GEMINI_PUBLIC_TTS_ENABLED || "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

function resolvePrimaryTtsModel(rawModel) {
  const candidate = String(
    (rawModel !== undefined && rawModel !== null) ? rawModel : (process.env.GEMINI_TTS_MODEL || "")
  ).trim();
  if (!candidate || LEGACY_UPGRADE_TTS_MODELS.has(candidate)) {
    return "gemini-3.8-flash-lite-tts";
  }
  if (ALLOWED_TTS_MODELS.has(candidate)) return candidate;
  return DEFAULT_TTS_MODEL;
}

function isModelCoolingDown(modelId, now) {
  const until = _badModelCooldown.get(modelId) || 0;
  if (!until) return false;
  if (now >= until) {
    _badModelCooldown.delete(modelId);
    return false;
  }
  return true;
}

function extractSessionId(req, body) {
  const headers = (req && req.headers) || {};
  const fromHeader = String(headers["x-tea-session"] || "").trim();
  if (fromHeader && SESSION_ID_RE.test(fromHeader)) return fromHeader;
  const fromBody = (body && typeof body.sessionId === "string") ? body.sessionId.trim() : "";
  if (fromBody && SESSION_ID_RE.test(fromBody)) return fromBody;
  return "";
}

function getClientIp(req) {
  const fwd = req && req.headers ? (req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "") : "";
  const first = String(fwd).split(",")[0].trim();
  if (first) return first.slice(0, 64);
  return (req && req.socket && req.socket.remoteAddress) ? String(req.socket.remoteAddress).slice(0, 64) : "unknown";
}

function getHostname(urlOrHost) {
  const raw = String(urlOrHost || "").trim();
  if (!raw) return "";
  try {
    if (raw.includes("://")) {
      return new URL(raw).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    }
    if (raw.startsWith("[")) {
      const closeIdx = raw.indexOf("]");
      return closeIdx > 1 ? raw.slice(1, closeIdx).toLowerCase() : "";
    }
    return raw.split(":", 1)[0].toLowerCase();
  } catch (e) {
    return "";
  }
}

function isAllowedOrigin(req) {
  const headers = (req && req.headers) || {};
  const origin = String(headers.origin || "").trim();
  const referer = String(headers.referer || "").trim();
  const reqHost = getHostname(headers["x-forwarded-host"] || headers.host || "");
  const secFetchSite = String(headers["sec-fetch-site"] || "").toLowerCase();
  const isProd = String(process.env.VERCEL_ENV || "").toLowerCase() === "production";

  const extraList = String(process.env.GEMINI_ALLOWED_ORIGINS || "")
    .split(",")
    .map(function (s) { return getHostname(s); })
    .filter(Boolean);
  const envHosts = new Set(extraList);
  [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL].forEach(function (v) {
    const h = getHostname(v);
    if (h) envHosts.add(h);
  });

  const checkCandidate = function (rawUrl) {
    const h = getHostname(rawUrl);
    if (!h) return false;
    if (!isProd && (h === "localhost" || h === "127.0.0.1" || h === "::1")) return true;
    if (reqHost && h === reqHost) return true;
    if (envHosts.has(h)) return true;
    return false;
  };

  if (origin && origin !== "null") return checkCandidate(origin);
  if (referer) return checkCandidate(referer);
  if (secFetchSite === "same-origin") return true;
  if (!isProd && (reqHost === "localhost" || reqHost === "127.0.0.1" || reqHost === "::1")) return true;
  return false;
}

function _checkSingleBucket(bucketKey, maxRpm, maxRpd, now, reasonPrefix) {
  let rec = _rateStore.get(bucketKey);
  if (!rec) {
    rec = { minStamps: [], dayStart: now, dayCount: 0 };
    _rateStore.set(bucketKey, rec);
  }
  if (now - rec.dayStart > DAY_WINDOW_MS) {
    rec.dayStart = now;
    rec.dayCount = 0;
  }
  rec.minStamps = rec.minStamps.filter(function (ts) { return now - ts < RATE_WINDOW_MS; });
  if (rec.minStamps.length >= maxRpm) {
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - rec.minStamps[0])) / 1000));
    return { allowed: false, retryAfterSec: retryAfterSec, reason: reasonPrefix + "_rpm", rec: rec };
  }
  if (rec.dayCount >= maxRpd) {
    const retryAfterSec = Math.max(60, Math.ceil((DAY_WINDOW_MS - (now - rec.dayStart)) / 1000));
    return { allowed: false, retryAfterSec: retryAfterSec, reason: reasonPrefix + "_rpd", rec: rec };
  }
  return { allowed: true, retryAfterSec: 0, reason: "", rec: rec };
}

function checkRateLimit(ip, nowMs, sessionId) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  if (now - _lastPruneAt > 120000 || _rateStore.size > 800) {
    _lastPruneAt = now;
    for (const [k, rec] of _rateStore.entries()) {
      if (now - rec.dayStart > DAY_WINDOW_MS && (!rec.minStamps.length || now - rec.minStamps[rec.minStamps.length - 1] > RATE_WINDOW_MS)) {
        _rateStore.delete(k);
      }
    }
    // Same-day burst LRU cap: evict oldest 200 keys if store still exceeds 800
    if (_rateStore.size > 800) {
      let evicted = 0;
      for (const oldKey of _rateStore.keys()) {
        _rateStore.delete(oldKey);
        if (++evicted >= 200) break;
      }
    }
  }
  const hasSession = Boolean(sessionId && SESSION_ID_RE.test(sessionId));
  if (hasSession) {
    const sessRpm = Math.max(4, parseInt(process.env.GEMINI_TTS_SESSION_MAX_RPM || "180", 10) || 180);
    const sessRpd = Math.max(20, parseInt(process.env.GEMINI_TTS_SESSION_MAX_RPD || "4000", 10) || 4000);
    const natRpm = Math.max(sessRpm, parseInt(process.env.GEMINI_TTS_NAT_IP_MAX_RPM || "360", 10) || 360);
    const natRpd = Math.max(sessRpd, parseInt(process.env.GEMINI_TTS_NAT_IP_MAX_RPD || "8000", 10) || 8000);
    // Check IP bucket BEFORE allocating/checking session bucket to block random-sessionId floods
    const ipRes = _checkSingleBucket("tts_nat:" + (ip || "unknown"), natRpm, natRpd, now, "ip");
    if (!ipRes.allowed) return { allowed: false, retryAfterSec: ipRes.retryAfterSec, reason: ipRes.reason };
    const sessRes = _checkSingleBucket("tts_sid:" + sessionId, sessRpm, sessRpd, now, "session");
    if (!sessRes.allowed) return { allowed: false, retryAfterSec: sessRes.retryAfterSec, reason: sessRes.reason };
    sessRes.rec.minStamps.push(now);
    sessRes.rec.dayCount += 1;
    ipRes.rec.minStamps.push(now);
    ipRes.rec.dayCount += 1;
    return { allowed: true, retryAfterSec: 0, reason: "" };
  }
  const maxRpm = Math.max(4, parseInt(process.env.GEMINI_TTS_NAT_IP_MAX_RPM || "360", 10) || 360);
  const maxRpd = Math.max(20, parseInt(process.env.GEMINI_TTS_NAT_IP_MAX_RPD || "8000", 10) || 8000);
  const res = _checkSingleBucket("tts_ip:" + (ip || "unknown"), maxRpm, maxRpd, now, "ip");
  if (!res.allowed) return { allowed: false, retryAfterSec: res.retryAfterSec, reason: res.reason };
  res.rec.minStamps.push(now);
  res.rec.dayCount += 1;
  return { allowed: true, retryAfterSec: 0, reason: "" };
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

const MAX_TTS_BODY_BYTES = 8192;

async function readJsonBody(req) {
  if (req && typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_TTS_BODY_BYTES) return { __tooBig: true };
    try {
      const parsedStr = JSON.parse(req.body);
      return (parsedStr && typeof parsedStr === "object" && !Array.isArray(parsedStr)) ? parsedStr : null;
    } catch (e) { return null; }
  }
  if (req && req.body && typeof req.body === "object") {
    if (Array.isArray(req.body)) return null;
    try {
      if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > MAX_TTS_BODY_BYTES) return { __tooBig: true };
    } catch (e) { return null; }
    return req.body;
  }
  return await new Promise(function (resolve) {
    const chunks = [];
    let totalBytes = 0;
    let tooBig = false;
    req.on("data", function (chunk) {
      if (tooBig) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
      totalBytes += buf.length;
      if (totalBytes > MAX_TTS_BODY_BYTES) {
        tooBig = true;
        return;
      }
      chunks.push(buf);
    });
    req.on("end", function () {
      if (tooBig) return resolve({ __tooBig: true });
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null);
      } catch (e) { resolve(null); }
    });
    req.on("error", function () { resolve(null); });
  });
}

function stripGeminiVocalTags(rawText) {
  return String(rawText || "")
    .replace(/<\s*(?:breath|heavy breath|exhales|chuckle|chuckles|cough|gasp|sigh|sighs|throat-clearing|pff|phew|tsk|short pause|long pause|whispers|whispering)\s*>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTtsPolyphones(text) {
  return String(text || "")
    .replace(/直心糾察長/g, "直心糾察掌")
    .replace(/糾察長/g, "糾察掌");
}

function sanitizeTranscriptForTts(rawText) {
  let s = stripGeminiVocalTags(rawText);
  s = s.replace(/\[[^\]]*\]/g, " ");
  s = s.replace(/（[^）]*）/g, " ").replace(/\([^)]*\)/g, " ");
  s = normalizeTtsPolyphones(s);
  return s.replace(/\s+/g, " ").trim();
}

function buildTtsRequestBody(modelName, cleanTranscript, voiceName, useFallbackVoice) {
  const rawVoice = String(voiceName || "").trim();
  const mappedVoice = (useFallbackVoice && CORE_FALLBACK_VOICE_MAP[rawVoice])
    ? CORE_FALLBACK_VOICE_MAP[rawVoice]
    : rawVoice;
  const safeVoice = ALLOWED_VOICES.has(mappedVoice) ? mappedVoice : "Kore";
  const cleaned = sanitizeTranscriptForTts(cleanTranscript) || String(cleanTranscript || "").trim();
  const isLegacy25 = String(modelName || "").startsWith("gemini-2.5-");
  const spokenText = isLegacy25 ? ("Say: " + cleaned) : cleaned;
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: spokenText }]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: safeVoice
          }
        }
      }
    }
  };
}

async function callUpstreamGeminiTts(apiKey, modelId, cleanTranscript, voiceName, timeoutMs, useFallbackVoice) {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":generateContent";
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || DEFAULT_UPSTREAM_TIMEOUT_MS) : null;
  try {
    const fetchOpts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "User-Agent": "aistudio-build"
      },
      body: JSON.stringify(buildTtsRequestBody(modelId, cleanTranscript, voiceName, useFallbackVoice))
    };
    if (controller) fetchOpts.signal = controller.signal;
    const resp = await fetch(endpoint, fetchOpts);
    if (!resp.ok) {
      return { ok: false, status: resp.status, bytes: null, mimeType: "" };
    }
    const data = await resp.json().catch(function () { return null; });
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const audioPart = Array.isArray(parts)
      ? parts.find(function (pt) { return pt && pt.inlineData && typeof pt.inlineData.data === "string" && pt.inlineData.data.length >= MIN_INLINE_AUDIO_B64_LEN; })
      : null;
    if (!audioPart) {
      return { ok: false, status: 502, bytes: null, mimeType: "" };
    }
    const bytes = Buffer.from(audioPart.inlineData.data, "base64");
    if (!bytes || bytes.length < 1024) {
      return { ok: false, status: 502, bytes: null, mimeType: "" };
    }
    const isWav = bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const mimeType = isWav ? "audio/wav" : (audioPart.inlineData.mimeType || "audio/l16;rate=24000");
    return { ok: true, status: 200, bytes: bytes, mimeType: mimeType };
  } catch (e) {
    return { ok: false, status: 504, bytes: null, mimeType: "" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function handler(req, res) {
  const method = String((req && req.method) || "GET").toUpperCase();
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const enabled = isTtsEnabledByEnv();
  const defaultPrimaryModel = resolvePrimaryTtsModel();

  if (method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      available: Boolean(apiKey && enabled),
      model: defaultPrimaryModel,
      mode: "vercel-gemini-tts"
    });
  }

  if (method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  if (!isAllowedOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: "Forbidden origin" });
  }

  if (!apiKey || !enabled) {
    return sendJson(res, 503, { ok: false, error: "Server Gemini TTS not configured" });
  }

  const reqContentType = String((req && req.headers && req.headers["content-type"]) || "").trim().toLowerCase();
  if (reqContentType && reqContentType.indexOf("application/json") === -1) {
    return sendJson(res, 415, { ok: false, error: "Unsupported Content-Type" });
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
  }
  if (body.__tooBig) {
    return sendJson(res, 413, { ok: false, error: "Payload too large" });
  }

  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  if (!rawText) {
    return sendJson(res, 400, { ok: false, error: "Empty text" });
  }
  const text = rawText.slice(0, MAX_TEXT_CHARS);
  const reqVoice = typeof body.voice === "string" ? body.voice.trim() : "Kore";
  const voiceName = ALLOWED_VOICES.has(reqVoice) ? reqVoice : "Kore";

  const primaryModel = resolvePrimaryTtsModel(body.model);
  const cleanTranscript = sanitizeTranscriptForTts(text) || text;
  if (!cleanTranscript) {
    return sendJson(res, 400, { ok: false, error: "Empty transcript" });
  }

  // Return cached audio directly without spending quota or rate-limit tokens
  const cacheKey = voiceName + "|" + cleanTranscript;
  const cached = _ttsCache.get(cacheKey);
  if (cached) {
    res.statusCode = 200;
    res.setHeader("Content-Type", cached.mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-TTS-Model", cached.model);
    res.setHeader("X-TTS-Cache", "HIT");
    res.end(cached.bytes);
    return;
  }

  const ip = getClientIp(req);
  const sessionId = extractSessionId(req, body);
  const rl = checkRateLimit(ip, Date.now(), sessionId);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: "TTS rate limit exceeded (" + rl.reason + ")" });
  }

  const now = Date.now();
  const fullOrder = [primaryModel].concat(TTS_MODEL_CHAIN.filter(function (m) { return m !== primaryModel; }));
  const queue = fullOrder.filter(function (m) { return !isModelCoolingDown(m, now); });
  if (!queue.length) {
    // All models cooling down: probe the model whose cooldown expires earliest
    const earliest = fullOrder.slice().sort(function (a, b) {
      return (_badModelCooldown.get(a) || 0) - (_badModelCooldown.get(b) || 0);
    })[0];
    queue.push(earliest || DEFAULT_TTS_MODEL);
  }

  let lastStatus = 502;
  const startedAt = Date.now();
  const RETRY_400_TIMEOUT_MS = 2800;
  for (let i = 0; i < queue.length; i++) {
    const modelId = queue[i];
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    let timeoutMs = 4200;
    if (modelId === "gemini-3.8-flash-lite-tts") {
      if (remaining < 1200) break;
      timeoutMs = Math.min(4200, remaining - 200);
    } else if (modelId === "gemini-3.8-flash-tts") {
      if (remaining < 1200) break;
      timeoutMs = Math.min(4500, remaining - 200);
    } else {
      if (remaining < 2800) continue;
      timeoutMs = Math.min(5000, remaining - 200);
    }
    let out = await callUpstreamGeminiTts(apiKey, modelId, cleanTranscript, voiceName, timeoutMs, false);
    const voiceChangesOnRetry = Boolean(CORE_FALLBACK_VOICE_MAP[voiceName] && CORE_FALLBACK_VOICE_MAP[voiceName] !== voiceName);
    if (!out.ok && out.status === 400 && voiceChangesOnRetry) {
      const retryRemaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
      if (retryRemaining >= 2200) {
        const retryTimeoutMs = Math.min(RETRY_400_TIMEOUT_MS, retryRemaining - 200);
        out = await callUpstreamGeminiTts(apiKey, modelId, cleanTranscript, voiceName, retryTimeoutMs, true);
      }
    }
    if (out.ok && out.bytes) {
      if (_ttsCache.size >= MAX_TTS_CACHE) {
        const firstKey = _ttsCache.keys().next().value;
        if (firstKey) _ttsCache.delete(firstKey);
      }
      _ttsCache.set(cacheKey, { bytes: out.bytes, mimeType: out.mimeType, model: modelId });
      res.statusCode = 200;
      res.setHeader("Content-Type", out.mimeType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-TTS-Model", modelId);
      res.setHeader("X-TTS-Cache", "MISS");
      res.end(out.bytes);
      return;
    }
    lastStatus = out.status || 502;
    if (out.status === 404) {
      _badModelCooldown.set(modelId, Date.now() + BAD_MODEL_COOLDOWN_MS);
    } else if (out.status === 429) {
      _badModelCooldown.set(modelId, Date.now() + RATE_LIMIT_COOLDOWN_MS);
    }
    if (out.status === 401 || out.status === 403) break;
  }

  return sendJson(res, lastStatus === 429 ? 429 : 502, {
    ok: false,
    upstreamStatus: lastStatus,
    error: "Upstream Gemini TTS HTTP " + lastStatus
  });
}

handler._isAllowedOrigin = isAllowedOrigin;
handler._getHostname = getHostname;
handler._checkRateLimit = checkRateLimit;
handler._buildTtsRequestBody = buildTtsRequestBody;
handler.buildTtsRequestBody = buildTtsRequestBody;
handler.resolvePrimaryTtsModel = resolvePrimaryTtsModel;
handler.sanitizeTranscriptForTts = sanitizeTranscriptForTts;
handler.normalizeTtsPolyphones = normalizeTtsPolyphones;
handler._stripGeminiVocalTags = stripGeminiVocalTags;
handler._ALLOWED_VOICES = ALLOWED_VOICES;
handler._TTS_MODEL_CHAIN = TTS_MODEL_CHAIN;
handler._TTS_FALLBACK_ORDER = TTS_FALLBACK_ORDER;
handler._isModelCoolingDown = isModelCoolingDown;
handler._resetRateLimit = function () { _rateStore.clear(); _badModelCooldown.clear(); _ttsCache.clear(); };

module.exports = handler;
