/**
 * Vercel Serverless Function: /api/gemini
 * 安全代理公測 2.0 線上版 Gemini 推論請求（金鑰僅存於 Vercel Environment Variables，絕不暴露至前端）
 *
 * 環境變數設定（於 Vercel Project → Settings → Environment Variables）：
 * - GEMINI_API_KEY         (必填) Google AI Studio API Key
 * - GEMINI_DEFAULT_MODEL   (選填，預設 gemini-2.5-flash)
 * - GEMINI_ALLOWED_ORIGINS (選填，逗號分隔自訂網域白名單，例如 https://game.example.com)
 * - GEMINI_SESSION_MAX_RPM (選填，每瀏覽器會話每分鐘上限，預設 24)
 * - GEMINI_SESSION_MAX_RPD (選填，每瀏覽器會話每日上限，預設 200)
 * - GEMINI_NAT_IP_MAX_RPM  (選填，帶會話標頭之同校網共用 IP 總上限，預設 96)
 * - GEMINI_NAT_IP_MAX_RPD  (選填，帶會話標頭之同校網共用 IP 每日總上限，預設 1200)
 * - GEMINI_MAX_RPM         (選填，無會話標頭舊版單 IP 每分鐘上限，預設 24)
 * - GEMINI_MAX_RPD         (選填，無會話標頭舊版單 IP 每日上限，預設 240)
 */
"use strict";

const ALLOWED_PUBLIC_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
]);

const MAX_PROMPT_CHARS = 14000;
const RATE_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAD_MODEL_COOLDOWN_MS = 10 * 60 * 1000;
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
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
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
  if (reqHost === "localhost" || reqHost === "127.0.0.1") {
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
  const defModel = String(process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash").trim();
  const req = String(requestedModel || "").trim();
  let chosen = "gemini-2.5-flash";
  if (req && ALLOWED_PUBLIC_MODELS.has(req)) chosen = req;
  else if (defModel && ALLOWED_PUBLIC_MODELS.has(defModel)) chosen = defModel;
  if (tierHint === "lite" && chosen === "gemini-2.5-flash" && !isModelCoolingDown("gemini-2.5-flash-lite", nowMs)) {
    chosen = "gemini-2.5-flash-lite";
  }
  if (chosen !== "gemini-2.5-flash" && isModelCoolingDown(chosen, nowMs)) {
    chosen = "gemini-2.5-flash";
  }
  return chosen;
}

function clampTemperature(reqTemp) {
  const num = Number(reqTemp);
  const base = (Number.isFinite(num) && num > 0) ? num : 0.65;
  return Math.round(Math.max(0.45, Math.min(0.85, base)) * 100) / 100;
}

async function callUpstreamGemini(apiKey, modelId, promptText, jsonMode, timeoutMs, temperature) {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":generateContent";
  const genCfg = {
    temperature: clampTemperature(temperature),
    maxOutputTokens: jsonMode ? 1280 : 768
  };
  if (jsonMode) {
    genCfg.responseMimeType = "application/json";
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 5200) : null;
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
      return { ok: false, status: resp.status, text: "" };
    }
    const data = await resp.json().catch(function () { return null; });
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    let joined = "";
    if (Array.isArray(parts)) {
      parts.forEach(function (pt) { if (pt && !pt.thought && typeof pt.text === "string") joined += pt.text; });
    }
    const text = joined.trim();
    return { ok: Boolean(text), status: text ? resp.status : 502, text: text };
  } catch (err) {
    return { ok: false, status: 504, text: "" };
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

async function readJsonBody(req) {
  if (req && req.body && typeof req.body === "object") return req.body;
  if (req && typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return await new Promise(function (resolve) {
    let raw = "";
    let tooBig = false;
    req.on("data", function (chunk) {
      if (tooBig) return;
      raw += String(chunk);
      if (raw.length > 49152) tooBig = true;
    });
    req.on("end", function () {
      if (tooBig) return resolve({ __tooBig: true });
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve(null); }
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

  // v24.2 Vercel Hobby 10s budget guard: 5.2s primary + 3.2s fallback = 8.4s max (leaves 1.6s cold-start/JSON margin)
  const first = await callUpstreamGemini(apiKey, primaryModel, promptText, jsonMode, 5200, safeTemp);
  if (first.ok && first.text) {
    return sendJson(res, 200, { ok: true, model: primaryModel, text: first.text });
  }
  if (primaryModel !== "gemini-2.5-flash" && (first.status === 400 || first.status === 404)) {
    _badModelCooldown.set(primaryModel, Date.now() + BAD_MODEL_COOLDOWN_MS);
  }

  const canFallback = primaryModel !== "gemini-2.5-flash" &&
    (first.status === 400 || first.status === 404 || first.status === 429 || first.status === 500 || first.status === 502 || first.status === 503 || first.status === 504 || !first.text);
  if (canFallback) {
    const fb = await callUpstreamGemini(apiKey, "gemini-2.5-flash", promptText, jsonMode, 3200, safeTemp);
    if (fb.ok && fb.text) {
      return sendJson(res, 200, { ok: true, model: "gemini-2.5-flash", text: fb.text });
    }
    return sendJson(res, fb.status === 429 ? 429 : 502, { ok: false, error: "Upstream Gemini unavailable (HTTP " + fb.status + ")" });
  }

  const outStatus = first.status === 429 ? 429 : (first.status >= 400 && first.status !== 401 && first.status !== 403 ? first.status : 502);
  return sendJson(res, outStatus, { ok: false, error: "Upstream Gemini error (HTTP " + (first.status || 502) + ")" });
}

handler._isAllowedOrigin = isAllowedOrigin;
handler._checkRateLimit = checkRateLimit;
handler._resolveSafeModel = resolveSafeModel;
handler._extractSessionId = extractSessionId;
handler._clampTemperature = clampTemperature;
handler._markBadModel = function (modelId, nowMs) {
  _badModelCooldown.set(modelId, (typeof nowMs === "number" ? nowMs : Date.now()) + BAD_MODEL_COOLDOWN_MS);
};
handler._resetRateLimit = function () { _rateStore.clear(); _badModelCooldown.clear(); };

module.exports = handler;
