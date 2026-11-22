/**
 * Gemini API 高階多代理人即時推論與自動降級重試
 */
"use strict";

// ==================== HIGH-TIER MULTI-AGENT GEMINI + LOCAL OLLAMA ENGINE ====================
function isExternalLlmActive() {
  return typeof state !== "undefined" && Boolean(state.geminiApiKey || state.localLlmModel);
}

function getActiveLlmLabel() {
  if (typeof state === "undefined") return "內建AI";
  if (state.localLlmModel) {
    return "本機 " + String(state.localLlmModel);
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
    maxOutputTokens: isGen34 ? ((opts && opts.jsonMode) ? 2048 : 1536) : ((opts && opts.jsonMode) ? 1024 : 640)
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
  if (!state.geminiApiKey) return null;
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
  }
  if (candidate.charAt(0) === "{" && candidate.charAt(candidate.length - 1) === "}") {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.text === "string" && obj.text.trim()) {
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
        const cr = (obj.claimRole === "seer" || obj.claimRole === "witch" || obj.claimRole === "hunter" || obj.claimRole === "guard") ? obj.claimRole : null;
        const emoAllow = ["calm", "sharp", "warm", "urgent", "defensive"];
        const emo = (typeof obj.emotion === "string" && emoAllow.indexOf(obj.emotion) !== -1) ? obj.emotion : null;
        return {
          parsedJson: true,
          text: obj.text.trim(),
          accuseId: normId(obj.accuseId),
          vouchId: normId(obj.vouchId),
          claimRole: cr,
          wolfPits: normIdArr(obj.wolfPits, 2),
          goodPits: normIdArr(obj.goodPits, 3),
          standWithSeerId: normId(obj.standWithSeerId),
          emotion: emo
        };
      }
    } catch (e) {}
  }
  return {
    parsedJson: false,
    text: raw,
    accuseId: null,
    vouchId: null,
    claimRole: null,
    wolfPits: null,
    goodPits: null,
    standWithSeerId: null,
    emotion: null
  };
}

function syncGeminiSpeechMeta(speaker, generated, liveRes) {
  if (!speaker || !generated || !liveRes) return generated;
  if (typeof liveRes === "string") {
    generated.text = liveRes;
    return generated;
  }
  if (liveRes.text) generated.text = liveRes.text;
  if (!liveRes.parsedJson) {
    return (typeof sanitizeSpeechMeta === "function") ? sanitizeSpeechMeta(speaker, generated) : generated;
  }

  const canTarget = function (id, forAccuse) {
    if (!id || id === speaker.id) return false;
    const st = typeof getSeat === "function" ? getSeat(id) : null;
    if (!st || !st.alive) return false;
    if (forAccuse && speaker.role === "wolf" && st.role === "wolf") return false;
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
      speaker.claimedRole = "seer";
    } else if (!speaker.claimedRole || speaker.claimedRole === liveRes.claimRole) {
      generated.claimRole = liveRes.claimRole;
      speaker.claimedRole = liveRes.claimRole;
    }
  }
  if (Array.isArray(liveRes.wolfPits)) generated.wolfPits = liveRes.wolfPits;
  if (Array.isArray(liveRes.goodPits)) generated.goodPits = liveRes.goodPits;
  if (liveRes.standWithSeerId) generated.standWithSeerId = liveRes.standWithSeerId;
  if (liveRes.emotion) generated.emotion = liveRes.emotion;
  return (typeof sanitizeSpeechMeta === "function") ? sanitizeSpeechMeta(speaker, generated) : generated;
}

async function tryGenerateGeminiAiSpeech(speaker, fallbackMeta) {
  const flvObj = PERSONA_FLAVORS[speaker.name] || {};
  const flvBio = flvObj.bio ? flvObj.bio : speaker.trait;
  const vs = flvObj.voiceStyle || null;
  const styleSamples = vs
    ? ("【你的專屬口語口癖範例（務必融入台詞開頭與收尾）】：開場「" + (vs.lead || []).slice(0, 2).join(" / ") + "」｜反駁「" + (vs.rebutLead || []).slice(0, 1).join("") + "」｜收尾「" + (vs.signoff || []).slice(0, 1).join("") + "」。\n")
    : "";
  const day = state.match.day;
  const todayLogs = state.match.logs.filter(function (l) { return l.day === day && l.kind === "speech"; });
  const spokenIds = todayLogs.map(function (l) { return l.speakerId; });
  const aliveList = getAliveSeats().map(function (s) {
    return "0" + s.id + "號" + (s.id === getPlayerId() ? "玩家你" : s.name) + (spokenIds.indexOf(s.id) !== -1 ? "(今日已發言)" : (s.id === speaker.id ? "(正在發言)" : "(今日尚未發言)"));
  }).join("、");

  const slotCtx = (typeof buildSpeechContext === "function") ? buildSpeechContext(speaker) : null;
  let pitContextNote = "";
  if (slotCtx) {
    pitContextNote += "【你的順位時序】：" + (slotCtx.positionTag || "中置位") + "。";
    if (slotCtx.callbackPhrase) {
      pitContextNote += "前置位焦點：" + slotCtx.callbackPhrase;
    }
    if (slotCtx.wolfPitOnMe) {
      const caller = getSeat(slotCtx.wolfPitOnMe.speakerId);
      pitContextNote += "前置位 0" + slotCtx.wolfPitOnMe.speakerId + "號" + (caller ? caller.name : "") + "剛才把你點進狼坑了，你必須第一句正面回應並解釋自己不在狼坑！";
    }
    if (slotCtx.dualSeerWorlds) {
      const dw = slotCtx.dualSeerWorlds;
      const aPits = dw.worldA.wolfPits.map(function (s) { return "0" + s.id + "號"; }).join("+");
      const bPits = dw.worldB.wolfPits.map(function (s) { return "0" + s.id + "號"; }).join("+");
      pitContextNote += "\n【雙明心觀察員盤坑參考】：如果站 0" + dw.seerA.id + "號，狼坑在 " + aPits + (dw.worldA.conflictReason ? ("(" + dw.worldA.conflictReason + ")") : "") +
        "；如果站 0" + dw.seerB.id + "號，狼坑在 " + bPits + (dw.worldB.conflictReason ? ("(" + dw.worldB.conflictReason + ")") : "") + "。務必清楚比較站 A 與站 B 的狼坑後表態站邊！";
    }
  }

  const transcript = todayLogs.length > 0
    ? todayLogs.map(function (l) { return l.title + "：「" + l.text + "」"; }).join("\n")
    : "（你是今天第一位發言者，目前還沒有任何人發言過！）";

  let secretIntel = "你的真實底牌：" + ROLE_DEFS[speaker.role].name + "（陣營：" + (speaker.team === "wolf" ? "酸民狼" : "好人") + "）。";
  if (speaker.role === "seer" && speaker.checkedHistory.length > 0) {
    secretIntel += "你已查驗的絕對真相：" + speaker.checkedHistory.map(function (c) {
      return "0" + c.targetId + "號=" + (c.isWolf ? "酸民狼" : "好人");
    }).join("、") + "。";
  } else if (speaker.role === "witch" && speaker.savedSeatId) {
    secretIntel += "你之前護回過 0" + speaker.savedSeatId + "號（他確定是好人）。";
  } else if (speaker.role === "wolf") {
    const mates = state.match.seats.filter(function (s) { return s.role === "wolf" && s.id !== speaker.id; });
    if (mates.length > 0) secretIntel += "你的狼同伴是：" + mates.map(function (m) { return "0" + m.id + "號" + m.name; }).join("、") + "（絕不可出賣同伴，要偽裝好人並自然帶點挑撥語氣栽贓好人）。";
  }

  const playbookKey = speaker.role === "wolf"
    ? (speaker.fakeSeer ? "wolf_fake_seer" : "wolf_stealth")
    : (ROLE_STRATEGY_PLAYBOOKS[speaker.role] ? speaker.role : "villager");
  const rolePlaybook = ROLE_STRATEGY_PLAYBOOKS[playbookKey];

  const claimsSummary = state.match.seats
    .filter(function (s) { return s.claimedRole; })
    .map(function (s) { return "0" + s.id + "號" + (s.id === getPlayerId() ? "玩家你" : s.name) + "自稱" + ROLE_DEFS[s.claimedRole].name; })
    .join("、") || "目前無人亮明神職身分";

  let priorRoundsArchive = "（目前為第 1 天，尚無前幾輪歷史紀錄）";
  if (day >= 2) {
    const roundBlocks = [];
    for (let d = 1; d < day; d++) {
      const dSpeeches = state.match.logs.filter(function (l) { return l.day === d && l.kind === "speech"; });
      const dVote = state.match.voteHistory.find(function (vh) { return vh.day === d; });
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

  const mindDesc = speaker.deductionStyle === "gullible"
    ? "思考風格：溫和輕信派（容易被先亮明身分或語氣溫暖的人說服，但仍會自然表達困惑）"
    : (speaker.deductionStyle === "skeptical"
      ? "思考風格：審慎求證派（絕不會因為有人跳明心觀察員或滴水奉茶師就馬上相信！會綜合比對前面所有人的發言找邏輯漏洞）"
      : "思考風格：平衡綜合派（會把前面所有人的發言串起來交叉比對，理性權衡真假身分與站邊關係）");
  const inPkNow = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive() && state.match.pkCandidates.indexOf(speaker.id) !== -1);
  const pkHint = inPkNow
    ? ("【緊急平票 PK 狀態】：你正與其他平票候選人（" + state.match.pkCandidates.join("號、") + "號）進入搶救拉票 PK，第一句就必須搶救清白並明確對比另位平票對手！\n")
    : "";
  const shId = state.match.sheriffSeatId;
  const shSeat = shId ? getSeat(shId) : null;
  const sheriffLine = (shSeat && shSeat.alive)
    ? ("👑 本局警長（1.5票＆末置位歸票權）：0" + shSeat.id + "號" + (shSeat.id === getPlayerId() ? "玩家你" : shSeat.name) + (shSeat.id === speaker.id ? "（就是你本人，務必在末置位歸總全場坑位）" : "") + "；")
    : "目前場上無警長；";
  const fgNotes = [];
  if (Array.isArray(state.match.fourGJoySuspects) && state.match.fourGJoySuspects.length > 0) {
    fgNotes.push("給歡喜曾笑僵對象：" + state.match.fourGJoySuspects.map(function (id) { return "0" + id + "號"; }).join("＋"));
  }
  if (Array.isArray(state.match.fourGHopePair) && state.match.fourGHopePair.length === 2) {
    fgNotes.push("給希望雙光必有1狼：0" + state.match.fourGHopePair[0] + "號 與 0" + state.match.fourGHopePair[1] + "號");
  }
  if (state.match.convenienceRallyTargetId) {
    fgNotes.push("給方便歸票焦點：0" + state.match.convenienceRallyTargetId + "號");
  }
  if (state.match.activeDirectorEvent) {
    fgNotes.push("今日茶會事件：「" + state.match.activeDirectorEvent.shortTitle + "」");
  }
  const hasGuardRole = state.match.seats.some(function (s) { return s.role === "guard"; });
  const aowuEndgameNote = "【凹嗚規則準則】：採標準屠邊制（狼刀在先），最後一神若是直心糾察長在夜間被狼鎖定將直接屠神結束且無法開槍" + (hasGuardRole ? "；本局含護心守衛，須防與回甘茶同守同救破盾！" : "。");

  const prompt =
    "你正在參與林美山書院茶席推理遊戲《三好AI狼人殺》（融入存好心、說好話、做好事理念，以理性防制網路酸言與假訊息取代傳統陰暗衝突，所有「出局」改為請離席冷靜）。\n" +
    "你扮演：0" + speaker.id + "號「" + speaker.name + "」。個性鮮明設定：" + flvBio + "。\n" +
    styleSamples +
    mindDesc + "。\n" +
    secretIntel + "\n" +
    pkHint +
    (pitContextNote ? (pitContextNote + "\n") : "") +
    "【你的專屬身分玩法攻略（務必遵守）】：\n" + rolePlaybook + "\n" +
    "【當前局勢情報】：第 " + day + " 天白天｜昨夜結果：" + ((state.match.lastNightCasualties && state.match.lastNightCasualties.length > 0) ? (state.match.lastNightCasualties.map(function (id) { return id + "號離席"; }).join("、")) : "平安夜無人離席") + "｜" + sheriffLine + (fgNotes.length ? ("公開茶席線索（" + fgNotes.join("、") + "）｜") : "") + "在場座位：" + aliveList + "\n" +
    aowuEndgameNote + "\n" +
    "【場上已宣稱身分】：" + claimsSummary + "\n" +
    "【前 1 至 " + Math.max(0, day - 1) + " 輪完整歷史發言與票型檔案】：\n" + priorRoundsArchive + "\n" +
    "【今天（第 " + day + " 輪）到目前為止的真實發言逐字稿】：\n" + transcript + "\n" +
    "【本輪基礎戰術參考】（請結合上方真實逐字稿與身分攻略靈活發揮）：" + fallbackMeta.text + "\n" +
    "嚴格規則：\n" +
    "1. 【最高優先】必須嚴守今日發言時序並點好人坑與狼人坑！被前置位點進狼坑或指認時第一句必須回應；雙觀察員對跳時務必比較站 A 坑與站 B 坑分別在哪！\n" +
    "2. 【獨立綜合判斷】你完全不知道其他人的真實底牌（除同伴或觀察員親查對象外）！必須參考前面「所有」已發言者的話來綜合判斷誰在狼坑、誰在好人坑。\n" +
    "3. 只能評論「今日已發言」的人說過的話，絕對禁止捏造「今日尚未發言」者的發言內容（未發言者僅能說「後置位還沒發言，待會聽表水」）。\n" +
    "4. 【嚴禁 AI 報告腔】禁止出現「根據上述資料」「綜上所述」「第一點、第二點」或系統旁白！要像台灣真人圍坐喝茶聊推理，自然接前一位的話回嘴或讚聲，用你的專屬口癖開場與俐落「過！」收尾。\n" +
    (day >= 2 ? ("5. 【第 " + day + " 輪對話連貫】：自然消化前 1 至 " + (day - 1) + " 輪的歷史發言與公投票型，抓出前後矛盾的人。\n") : "") +
    "6. 保持鮮明口語節奏（65～115字、無表情符號與括號動作），並只輸出單一純 JSON 物件：\n" +
    '{"text":"你的台詞內容","accuseId":懷疑並準備投票的座位整數或null,"vouchId":相信並站邊力挺的座位整數或null,"claimRole":"seer"|"witch"|"hunter"|"guard"|null,"wolfPits":[最多2個狼坑座號],"goodPits":[最多2個好人坑座號],"standWithSeerId":雙觀察員時站邊的座號或null,"emotion":"calm"|"sharp"|"warm"|"urgent"|"defensive"}';

  const rawOut = await callGeminiText(prompt, { jsonMode: true });
  return rawOut ? parseGeminiStructuredSpeech(rawOut) : null;
}
