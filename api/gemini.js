/**
 * Vercel Serverless Function: /api/gemini
 * 安全代理公測 2.0 線上版 Gemini 推論請求（金鑰僅存於 Vercel Environment Variables，絕不暴露至前端）
 *
 * 環境變數設定（於 Vercel Project → Settings → Environment Variables）：
 * - GEMINI_API_KEY            (必填) Google AI Studio API Key
 * - GEMINI_DEFAULT_MODEL      (選填，預設 gemini-4-hydrogen；可設為 gemini-2.5-pro / gemini-3.1-flash-lite)
 * - GEMINI_THINKING_LEVEL     (選填，Gemini 4 思考深度：LOW / MEDIUM / HIGH，預設 LOW)
 * - GEMINI_PRO_THINKING_BUDGET (選填，2.5 Pro 思考 token 上限 128~2048，預設 512)
 * - GEMINI_UPSTREAM_TIMEOUT_MS (選填，單次上游逾時毫秒，預設 Pro 14000 / Flash 8500)
 * - GEMINI_ALLOWED_ORIGINS    (選填，逗號分隔自訂網域白名單，例如 https://game.example.com)
 * - GEMINI_SESSION_MAX_RPM    (選填，每瀏覽器會話每分鐘上限，預設 24)
 * - GEMINI_SESSION_MAX_RPD    (選填，每瀏覽器會話每日上限，預設 200)
 * - GEMINI_NAT_IP_MAX_RPM     (選填，帶會話標頭之同區網共用 IP 總上限，預設 96)
 * - GEMINI_NAT_IP_MAX_RPD     (選填，帶會話標頭之同區網共用 IP 每日總上限，預設 1200)
 * - GEMINI_MAX_RPM            (選填，無會話標頭舊版單 IP 每分鐘上限，預設 24)
 * - GEMINI_MAX_RPD            (選填，無會話標頭舊版單 IP 每日上限，預設 240)
 */
"use strict";

const ALLOWED_PUBLIC_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
]);
const PUBLIC_DEFAULT_MODEL = "gemini-4-hydrogen";
const PUBLIC_LITE_MODEL = "gemini-3.1-flash-lite";
const PUBLIC_FALLBACK_ORDER = [
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const MAX_PROMPT_CHARS = 14000;
const RATE_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAD_MODEL_COOLDOWN_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 3 * 60 * 1000;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,48}$/;
const _rateStore = new Map();
const _badModelCooldown = new Map();
let _lastPruneAt = 0;

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
    if (raw.includes("://")) return new URL(raw).hostname.toLowerCase();
    return raw.split(":", 1)[0].replace(/^\[|\]$/g, "").toLowerCase();
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

  if (origin && origin !== "null") {
    return checkCandidate(origin);
  }
  if (referer) {
    return checkCandidate(referer);
  }
  if (secFetchSite === "same-origin") {
    return true;
  }
  if (!isProd && (reqHost === "localhost" || reqHost === "127.0.0.1")) {
    return true;
  }
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
    const oldest = rec.minStamps[0] || now;
    const retryAfterSec = Math.max(2, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    return { allowed: false, reason: (reasonPrefix ? (reasonPrefix + "_") : "") + "rpm", retryAfterSec: retryAfterSec, rec: rec };
  }
  if (rec.dayCount >= maxRpd) {
    return { allowed: false, reason: (reasonPrefix ? (reasonPrefix + "_") : "") + "rpd", retryAfterSec: 300, rec: rec };
  }
  return { allowed: true, reason: "", retryAfterSec: 0, rec: rec };
}

function checkRateLimit(ip, nowMs, sessionId) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const hasSession = Boolean(sessionId && SESSION_ID_RE.test(String(sessionId)));

  if (now - _lastPruneAt > 120000 || _rateStore.size > 800) {
    _lastPruneAt = now;
    for (const [k, entry] of _rateStore.entries()) {
      if (now - entry.dayStart > DAY_WINDOW_MS) _rateStore.delete(k);
    }
    // v24.2 Same-day burst LRU cap: evict oldest 200 keys if store still exceeds 800
    if (_rateStore.size > 800) {
      let evicted = 0;
      for (const oldKey of _rateStore.keys()) {
        _rateStore.delete(oldKey);
        if (++evicted >= 200) break;
      }
    }
  }

  if (hasSession) {
    const sessRpm = Math.max(6, Math.min(120, parseInt(process.env.GEMINI_SESSION_MAX_RPM || "24", 10) || 24));
    const sessRpd = Math.max(30, Math.min(2000, parseInt(process.env.GEMINI_SESSION_MAX_RPD || "200", 10) || 200));
    const natIpRpm = Math.max(sessRpm, Math.min(300, parseInt(process.env.GEMINI_NAT_IP_MAX_RPM || "96", 10) || 96));
    const natIpRpd = Math.max(sessRpd, Math.min(6000, parseInt(process.env.GEMINI_NAT_IP_MAX_RPD || "1200", 10) || 1200));

    // Check IP bucket BEFORE allocating/checking session bucket to block random-sessionId floods
    const ipRes = _checkSingleBucket("natip:" + ip, natIpRpm, natIpRpd, now, "ip");
    if (!ipRes.allowed) return { allowed: false, reason: ipRes.reason, retryAfterSec: ipRes.retryAfterSec };
    const sRes = _checkSingleBucket("sess:" + sessionId, sessRpm, sessRpd, now, "session");
    if (!sRes.allowed) return { allowed: false, reason: sRes.reason, retryAfterSec: sRes.retryAfterSec };

    sRes.rec.minStamps.push(now);
    sRes.rec.dayCount += 1;
    ipRes.rec.minStamps.push(now);
    ipRes.rec.dayCount += 1;
    return { allowed: true, reason: "", retryAfterSec: 0 };
  }

  const maxRpm = Math.max(4, Math.min(120, parseInt(process.env.GEMINI_MAX_RPM || "24", 10) || 24));
  const maxRpd = Math.max(20, Math.min(2000, parseInt(process.env.GEMINI_MAX_RPD || "240", 10) || 240));
  const legacyRes = _checkSingleBucket("ip:" + ip, maxRpm, maxRpd, now, "");
  if (!legacyRes.allowed) return { allowed: false, reason: legacyRes.reason, retryAfterSec: legacyRes.retryAfterSec };
  legacyRes.rec.minStamps.push(now);
  legacyRes.rec.dayCount += 1;
  return { allowed: true, reason: "", retryAfterSec: 0 };
}

function isModelCoolingDown(modelId, nowMs) {
  const until = _badModelCooldown.get(modelId);
  if (!until) return false;
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  if (now >= until) {
    _badModelCooldown.delete(modelId);
    return false;
  }
  return true;
}

function resolveSafeModel(requestedModel, tierHint, nowMs) {
  const defModel = String(process.env.GEMINI_DEFAULT_MODEL || PUBLIC_DEFAULT_MODEL).trim();
  const req = String(requestedModel || "").trim();
  let chosen = PUBLIC_DEFAULT_MODEL;
  if (req && ALLOWED_PUBLIC_MODELS.has(req)) chosen = req;
  else if (defModel && ALLOWED_PUBLIC_MODELS.has(defModel)) chosen = defModel;
  if (tierHint === "lite" && chosen === PUBLIC_DEFAULT_MODEL && !isModelCoolingDown(PUBLIC_LITE_MODEL, nowMs)) {
    chosen = PUBLIC_LITE_MODEL;
  }
  if (isModelCoolingDown(chosen, nowMs)) {
    for (let i = 0; i < PUBLIC_FALLBACK_ORDER.length; i++) {
      if (!isModelCoolingDown(PUBLIC_FALLBACK_ORDER[i], nowMs)) {
        chosen = PUBLIC_FALLBACK_ORDER[i];
        break;
      }
    }
  }
  return chosen;
}

function clampTemperature(reqTemp) {
  const num = Number(reqTemp);
  const base = (Number.isFinite(num) && num > 0) ? num : 0.65;
  return Math.round(Math.max(0.45, Math.min(0.85, base)) * 100) / 100;
}

function sanitizeUpstreamReason(rawMsg) {
  return String(rawMsg || "")
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function resolveGemini4ThinkingLevel() {
  const raw = String(process.env.GEMINI_THINKING_LEVEL || "LOW").trim().toUpperCase();
  if (raw === "LOW" || raw === "MEDIUM" || raw === "HIGH") return raw;
  return "LOW";
}

function resolveProThinkingBudget() {
  const n = parseInt(process.env.GEMINI_PRO_THINKING_BUDGET || "512", 10);
  if (!Number.isFinite(n) || n <= 0) return 512;
  return Math.max(128, Math.min(2048, n));
}

function buildGenerationConfig(modelId, jsonMode, temperature) {
  const isGemini4 = /^gemini-4-/.test(String(modelId || ""));
  const isPro25 = modelId === "gemini-2.5-pro";
  const genCfg = {
    maxOutputTokens: (isPro25 || isGemini4) ? (jsonMode ? 3072 : 2048) : (jsonMode ? 1536 : 1024)
  };
  if (isGemini4) {
    genCfg.thinkingConfig = { thinkingLevel: resolveGemini4ThinkingLevel() };
  } else {
    genCfg.temperature = clampTemperature(temperature);
    if (isPro25) {
      genCfg.thinkingConfig = { thinkingBudget: resolveProThinkingBudget() };
    }
  }
  if (jsonMode) {
    genCfg.responseMimeType = "application/json";
  }
  return genCfg;
}

function resolvePrimaryTimeoutMs(modelId) {
  const envMs = parseInt(process.env.GEMINI_UPSTREAM_TIMEOUT_MS || "", 10);
  if (Number.isFinite(envMs) && envMs >= 3000) {
    return Math.min(20000, envMs);
  }
  return modelId === "gemini-2.5-pro" ? 14000 : 8500;
}

async function callUpstreamGemini(apiKey, modelId, promptText, jsonMode, timeoutMs, temperature) {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":generateContent";
  const genCfg = buildGenerationConfig(modelId, jsonMode, temperature);

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 8500) : null;
  try {
    const fetchOpts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: genCfg
      })
    };
    if (controller) fetchOpts.signal = controller.signal;
    const resp = await fetch(endpoint, fetchOpts);
    if (!resp.ok) {
      const errJson = await resp.json().catch(function () { return null; });
      const reason = sanitizeUpstreamReason(errJson && errJson.error && errJson.error.message);
      return { ok: false, status: resp.status, text: "", reason: reason };
    }
    const data = await resp.json().catch(function () { return null; });
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    let joined = "";
    if (Array.isArray(parts)) {
      parts.forEach(function (pt) { if (pt && !pt.thought && typeof pt.text === "string") joined += pt.text; });
    }
    const text = joined.trim();
    return { ok: Boolean(text), status: text ? resp.status : 502, text: text, reason: text ? "" : "Empty response" };
  } catch (err) {
    return { ok: false, status: 504, text: "", reason: "Upstream timeout" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

const MAX_GEMINI_BODY_BYTES = 49152;

function isModelConfigBad400(reason) {
  const r = String(reason || "").toLowerCase();
  if (!r) return false;
  if (/api[_ ]?key|invalid.*key|permission|quota|safety|block/.test(r)) return false;
  return /model|thinking|not found|not supported|unsupported|unknown name/.test(r);
}

async function readJsonBody(req) {
  if (req && typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_GEMINI_BODY_BYTES) return { __tooBig: true };
    try {
      const parsedStr = JSON.parse(req.body);
      return (parsedStr && typeof parsedStr === "object" && !Array.isArray(parsedStr)) ? parsedStr : null;
    } catch (e) { return null; }
  }
  if (req && req.body && typeof req.body === "object") {
    if (Array.isArray(req.body)) return null;
    try {
      if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > MAX_GEMINI_BODY_BYTES) return { __tooBig: true };
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
      if (totalBytes > MAX_GEMINI_BODY_BYTES) {
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

async function handler(req, res) {
  const method = String((req && req.method) || "GET").toUpperCase();
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const defaultModel = resolveSafeModel("");

  if (method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      available: Boolean(apiKey),
      model: defaultModel,
      supportedModels: Array.from(ALLOWED_PUBLIC_MODELS),
      mode: "vercel-proxy"
    });
  }

  if (method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  if (!isAllowedOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: "Forbidden origin" });
  }

  if (!apiKey) {
    return sendJson(res, 503, { ok: false, error: "Server Gemini proxy not configured" });
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

  const ip = getClientIp(req);
  const sessionId = extractSessionId(req, body);
  const rl = checkRateLimit(ip, Date.now(), sessionId);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: "Rate limit exceeded (" + rl.reason + ")" });
  }

  const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!rawPrompt) {
    return sendJson(res, 400, { ok: false, error: "Empty prompt" });
  }
  const promptText = rawPrompt.slice(0, MAX_PROMPT_CHARS);
  const jsonMode = Boolean(body.jsonMode);
  const safeTemp = clampTemperature(body.temperature);
  const tierHint = body.tier === "lite" ? "lite" : "standard";
  const primaryModel = resolveSafeModel(body.model, tierHint);

  // v24.2.5 Vercel 25s maxDuration budget guard (Pro 14s / Flash 8.5s) with automatic multi-model fallback
  const startedAt = Date.now();
  const primaryTimeoutMs = resolvePrimaryTimeoutMs(primaryModel);
  const first = await callUpstreamGemini(apiKey, primaryModel, promptText, jsonMode, primaryTimeoutMs, safeTemp);
  if (first.ok && first.text) {
    return sendJson(res, 200, { ok: true, model: primaryModel, text: first.text });
  }
  if (first.status === 404 || (first.status === 400 && isModelConfigBad400(first.reason))) {
    _badModelCooldown.set(primaryModel, Date.now() + BAD_MODEL_COOLDOWN_MS);
  } else if (first.status === 429) {
    _badModelCooldown.set(primaryModel, Date.now() + RATE_LIMIT_COOLDOWN_MS);
  }

  const shouldFallback = (first.status !== 401 && first.status !== 403) && (first.status === 400 || first.status === 404 || first.status === 429 || first.status === 500 || first.status === 502 || first.status === 503 || first.status === 504 || !first.text);
  let lastFail = first;
  if (shouldFallback) {
    const fbQueue = PUBLIC_FALLBACK_ORDER.filter(function (m) {
      return m !== primaryModel && !isModelCoolingDown(m, Date.now());
    });
    if (!fbQueue.length && primaryModel !== "gemini-2.5-flash-lite") {
      fbQueue.push("gemini-2.5-flash-lite");
    }
    for (let i = 0; i < fbQueue.length; i++) {
      const elapsed = Date.now() - startedAt;
      const remainingBudget = 21500 - elapsed;
      if (remainingBudget < 2400) break;
      const fbModel = fbQueue[i];
      const fbTimeout = Math.min(5500, remainingBudget - 400);
      const fb = await callUpstreamGemini(apiKey, fbModel, promptText, jsonMode, fbTimeout, safeTemp);
      if (fb.ok && fb.text) {
        return sendJson(res, 200, { ok: true, model: fbModel, fallbackFrom: primaryModel, text: fb.text });
      }
      if (fb.status === 404 || (fb.status === 400 && isModelConfigBad400(fb.reason))) {
        _badModelCooldown.set(fbModel, Date.now() + BAD_MODEL_COOLDOWN_MS);
      } else if (fb.status === 429) {
        _badModelCooldown.set(fbModel, Date.now() + RATE_LIMIT_COOLDOWN_MS);
      }
      lastFail = fb;
      if (fb.status === 401 || fb.status === 403) break;
    }
  }

  const outStatus = lastFail.status === 429 ? 429 : 502;
  const reasonSuffix = lastFail.reason ? (": " + lastFail.reason) : "";
  return sendJson(res, outStatus, {
    ok: false,
    upstreamStatus: lastFail.status || 502,
    error: "Upstream Gemini HTTP " + (lastFail.status || 502) + reasonSuffix
  });
}

handler._isAllowedOrigin = isAllowedOrigin;
handler._checkRateLimit = checkRateLimit;
handler._resolveSafeModel = resolveSafeModel;
handler._extractSessionId = extractSessionId;
handler._clampTemperature = clampTemperature;
handler._buildGenerationConfig = buildGenerationConfig;
handler._resolvePrimaryTimeoutMs = resolvePrimaryTimeoutMs;
handler._PUBLIC_FALLBACK_ORDER = PUBLIC_FALLBACK_ORDER;
handler._isModelCoolingDown = isModelCoolingDown;
handler._markBadModel = function (modelId, nowMs) {
  _badModelCooldown.set(modelId, (typeof nowMs === "number" ? nowMs : Date.now()) + BAD_MODEL_COOLDOWN_MS);
};
handler._resetRateLimit = function () { _rateStore.clear(); _badModelCooldown.clear(); };

module.exports = handler;
