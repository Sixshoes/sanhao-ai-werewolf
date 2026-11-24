/**
 * 右上角使用反饋系統：支援星級評分、分類回報、環境自動診斷、
 * 本機/區網伺服器直存 (/api/feedback)、GitHub Issues 一鍵回報、剪貼簿複製與 JSON 匯出
 */
"use strict";

const FEEDBACK_CONFIG = {
  githubOwner: "Sixshoes",
  githubRepo: "sanhao-ai-werewolf",
  // 若未來希望靜態網頁免登入 GitHub 也能靜默收件，可於此貼上 Formspree / Google Apps Script Webhook 網址
  webhookUrl: "",
  storageKey: "sanhao_feedback_history_v1",
  maxStoredItems: 30
};

const FEEDBACK_CATEGORIES = {
  bug: { key: "bug", label: "🐞 問題回報", ghLabel: "bug" },
  ui: { key: "ui", label: "🎨 畫面與視角", ghLabel: "ui-ux" },
  gameplay: { key: "gameplay", label: "🧠 AI 與規則", ghLabel: "gameplay" },
  idea: { key: "idea", label: "💡 許願與建議", ghLabel: "enhancement" }
};

const FEEDBACK_RATING_LABELS = {
  1: "1★ 遇到嚴重卡關",
  2: "2★ 有些地方不太順手",
  3: "3★ 還不錯，有改進空間",
  4: "4★ 很好玩！值得推薦",
  5: "5★ 超愛這個體驗！"
};

const feedbackUiState = {
  rating: 5,
  category: "idea",
  lastEntry: null
};

function isAnonymousReviewHost() {
  try {
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      const host = String(window.location.hostname).toLowerCase();
      return host.endsWith(".vercel.app") || host.endsWith(".netlify.app");
    }
  } catch (e) {}
  return false;
}

function resolveFeedbackGithubRepo() {
  try {
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      const host = String(window.location.hostname).toLowerCase();
      if (host.endsWith(".github.io")) {
        const owner = host.slice(0, -".github.io".length);
        const segs = String(window.location.pathname || "").split("/").filter(Boolean);
        const repo = segs[0] || FEEDBACK_CONFIG.githubRepo;
        if (owner && repo) return { owner: owner, repo: repo };
      }
    }
  } catch (e) {}
  return { owner: FEEDBACK_CONFIG.githubOwner, repo: FEEDBACK_CONFIG.githubRepo };
}

function loadFeedbackHistory() {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_CONFIG.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveFeedbackHistory(list) {
  try {
    const safeList = Array.isArray(list) ? list.slice(0, FEEDBACK_CONFIG.maxStoredItems) : [];
    window.localStorage.setItem(FEEDBACK_CONFIG.storageKey, JSON.stringify(safeList));
  } catch (e) {}
}

function collectFeedbackDiagnostics() {
  const m = (typeof state !== "undefined" && state.match) ? state.match : {};
  const cam = (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive())
    ? ("3D-" + (stage3d.camPreset || "cinema"))
    : "2D";
  const aiEngine = (typeof state !== "undefined" && state.localLlmModel)
    ? ("Ollama:" + state.localLlmModel)
    : ((typeof state !== "undefined" && state.geminiApiKey)
      ? ("Gemini:" + (state.geminiModel || "gemini-3.8-flash"))
      : ((typeof isServerGeminiProxyActive === "function" && isServerGeminiProxyActive())
        ? ("CloudGemini:" + (state.serverGeminiModel || "gemini-3.8-flash"))
        : "內建三好AI"));
  const w = typeof window !== "undefined" ? (window.innerWidth || 0) : 0;
  const h = typeof window !== "undefined" ? (window.innerHeight || 0) : 0;
  const uaRaw = (typeof navigator !== "undefined" && navigator.userAgent) ? String(navigator.userAgent) : "unknown";
  const ac = (typeof antiCheatMonitor !== "undefined" && typeof antiCheatMonitor.getSummary === "function")
    ? antiCheatMonitor.getSummary()
    : null;
  const playerSeat = (m.started && typeof getPlayerSeat === "function") ? getPlayerSeat() : null;
  const selfRole = (playerSeat && !state.hidePlayerRole && typeof getSeatRoleDef === "function")
    ? (getSeatRoleDef(playerSeat) ? getSeatRoleDef(playerSeat).name : "未揭露")
    : "未開局或已遮蔽";

  return {
    version: "v15.2 (公測 2.2)",
    timestamp: new Date().toISOString(),
    started: Boolean(m.started),
    phase: String(m.phase || "LOBBY"),
    day: Number(m.day) || 0,
    totalSeats: Number(m.totalSeats) || 8,
    selfRole: selfRole,
    view: cam,
    quality3D: (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high",
    gpu: (typeof stage3d !== "undefined" && typeof stage3d.getCleanGpuName === "function") ? stage3d.getCleanGpuName() : "",
    aiEngine: aiEngine,
    viewport: w + "x" + h,
    antiCheat: ac ? (ac.decisionsAudited + "次審計/" + ac.violationsBlocked + "違規") : "未啟用",
    ua: uaRaw.slice(0, 140)
  };
}

function formatDiagnosticsSummary(diag) {
  if (!diag) return "";
  return [
    "版本：" + diag.version,
    "局況：" + (diag.started ? (diag.totalSeats + "人局・第" + diag.day + "天・" + diag.phase + "（本人：" + diag.selfRole + "）") : "主畫面大廳"),
    "畫面：" + diag.view + "｜畫質：" + diag.quality3D + "｜視窗：" + diag.viewport,
    "AI 引擎：" + diag.aiEngine + "｜反作弊：" + diag.antiCheat
  ].join("\n");
}

function buildFeedbackReportText(entry) {
  const catDef = FEEDBACK_CATEGORIES[entry.category] || FEEDBACK_CATEGORIES.idea;
  const stars = "★".repeat(entry.rating) + "☆".repeat(Math.max(0, 5 - entry.rating));
  const lines = [
    "【三好・雲起茶席｜玩家使用反饋】",
    "・分類：" + catDef.label,
    "・評分：" + stars + " (" + entry.rating + "/5)",
    "・回報者：" + (entry.nickname || "匿名茶客"),
    "・時間：" + (entry.createdAt || new Date().toISOString()),
    "",
    "【反饋內容】",
    entry.message
  ];
  if (entry.includeEnv && entry.diagnostics) {
    lines.push("", "【自動附帶環境資訊】", formatDiagnosticsSummary(entry.diagnostics));
  }
  return lines.join("\n");
}

function buildGitHubIssueUrl(entry) {
  const repoInfo = resolveFeedbackGithubRepo();
  const catDef = FEEDBACK_CATEGORIES[entry.category] || FEEDBACK_CATEGORIES.idea;
  const snippet = String(entry.message || "").replace(/\s+/g, " ").trim().slice(0, 36);
  const title = "[" + catDef.label.replace(/^[^\u4e00-\u9fffA-Za-z0-9]+\s*/, "") + "][" + entry.rating + "★] " + (snippet || "玩家使用反饋");
  const body = buildFeedbackReportText(entry);
  const base = "https://github.com/" + encodeURIComponent(repoInfo.owner) + "/" + encodeURIComponent(repoInfo.repo) + "/issues/new";
  return base + "?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
}

function copyFeedbackText(text) {
  const payload = String(text || "");
  if (!payload) return Promise.resolve(false);
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(payload).then(function () { return true; }).catch(function () {
      return fallbackCopyText(payload);
    });
  }
  return Promise.resolve(fallbackCopyText(payload));
}

function fallbackCopyText(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch (e) {
    return false;
  }
}

function syncFeedbackStarUi() {
  const rating = clamp(Number(feedbackUiState.rating) || 5, 1, 5);
  feedbackUiState.rating = rating;
  const starWrap = el("feedbackStarGroup");
  if (starWrap) {
    starWrap.querySelectorAll("[data-fb-star]").forEach(function (btn) {
      const val = parseInt(btn.getAttribute("data-fb-star"), 10) || 1;
      btn.classList.toggle("is-lit", val <= rating);
      btn.setAttribute("aria-pressed", val <= rating ? "true" : "false");
    });
  }
  if (el("feedbackRatingText")) {
    el("feedbackRatingText").textContent = FEEDBACK_RATING_LABELS[rating] || (rating + "★");
  }
}

function syncFeedbackCategoryUi() {
  const cat = FEEDBACK_CATEGORIES[feedbackUiState.category] ? feedbackUiState.category : "idea";
  feedbackUiState.category = cat;
  const catWrap = el("feedbackCatGroup");
  if (catWrap) {
    catWrap.querySelectorAll("[data-fb-cat]").forEach(function (btn) {
      const active = btn.getAttribute("data-fb-cat") === cat;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
}

function refreshFeedbackEnvPreview() {
  const box = el("feedbackEnvPreview");
  const chk = el("chkFeedbackIncludeEnv");
  if (!box) return;
  const include = !chk || chk.checked;
  box.classList.toggle("hidden", !include);
  if (include) {
    box.textContent = formatDiagnosticsSummary(collectFeedbackDiagnostics());
  }
}

function renderFeedbackHistoryList() {
  const listEl = el("feedbackHistoryList");
  const countEl = el("feedbackHistoryCount");
  const exportBtn = el("btnExportFeedbackJson");
  const list = loadFeedbackHistory();
  if (countEl) countEl.textContent = "本機已留存 " + list.length + " 筆";
  if (exportBtn) exportBtn.classList.toggle("hidden", list.length === 0);
  if (!listEl) return;
  listEl.innerHTML = "";
  if (list.length === 0) {
    listEl.innerHTML = '<div class="text-[11px] text-slate-400 text-center py-2">尚無送出紀錄，歡迎分享你的試玩感受！</div>';
    return;
  }
  list.slice(0, 6).forEach(function (item) {
    const catDef = FEEDBACK_CATEGORIES[item.category] || FEEDBACK_CATEGORIES.idea;
    const stars = "★".repeat(clamp(Number(item.rating) || 5, 1, 5));
    const row = document.createElement("div");
    row.className = "fb-history-item";
    const timeLabel = item.createdAt ? String(item.createdAt).replace("T", " ").slice(5, 16) : "";
    const statusLabel = item.deliveredTo === "server"
      ? "已直傳主機"
      : (item.deliveredTo === "webhook" ? "已送達雲端" : "本機已存");
    row.innerHTML =
      '<div class="flex items-center justify-between gap-2 text-[10px]">' +
        '<span class="font-bold text-amber-300">' + escapeHtml(catDef.label) + ' · ' + escapeHtml(stars) + '</span>' +
        '<span class="text-slate-400">' + escapeHtml(statusLabel) + (timeLabel ? (" · " + escapeHtml(timeLabel)) : "") + '</span>' +
      '</div>' +
      '<div class="text-[11px] text-slate-200 mt-1 break-words">' + escapeHtml(String(item.message || "").slice(0, 120)) + '</div>';
    listEl.appendChild(row);
  });
}

function openFeedbackModal() {
  if (typeof sound !== "undefined" && typeof sound.unlock === "function") sound.unlock();
  const modal = el("modalFeedback");
  if (!modal) return;
  syncFeedbackStarUi();
  syncFeedbackCategoryUi();
  refreshFeedbackEnvPreview();
  renderFeedbackHistoryList();
  if (el("feedbackResultCard")) el("feedbackResultCard").classList.add("hidden");
  if (el("btnOpenGithubFeedback")) {
    el("btnOpenGithubFeedback").classList.toggle("hidden", isAnonymousReviewHost());
  }
  modal.classList.remove("hidden");
  if (el("inputFeedbackBody") && typeof el("inputFeedbackBody").focus === "function") {
    el("inputFeedbackBody").focus();
  }
}

function closeFeedbackModal() {
  const modal = el("modalFeedback");
  if (modal) modal.classList.add("hidden");
}

async function tryDeliverFeedbackRemote(entry) {
  const proto = (typeof window !== "undefined" && window.location && window.location.protocol) ? window.location.protocol : "";
  // 1. Optional custom cloud webhook (Formspree / Apps Script / etc.)
  if (FEEDBACK_CONFIG.webhookUrl && typeof fetch === "function") {
    try {
      const rWeb = await fetch(FEEDBACK_CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          category: entry.category,
          rating: entry.rating,
          nickname: entry.nickname,
          message: entry.message,
          diagnostics: entry.includeEnv ? entry.diagnostics : null,
          reportText: buildFeedbackReportText(entry)
        })
      });
      if (rWeb && rWeb.ok) return { delivered: true, channel: "webhook" };
    } catch (e) {}
  }

  // 2. Local / LAN Python server direct inbox (/api/feedback -> .feedback_inbox/feedback.jsonl)
  if ((proto === "http:" || proto === "https:") && typeof fetch === "function") {
    try {
      const rLoc = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: entry.category,
          rating: entry.rating,
          nickname: entry.nickname,
          message: entry.message,
          includeEnv: entry.includeEnv,
          diagnostics: entry.includeEnv ? entry.diagnostics : null
        })
      });
      if (rLoc && rLoc.ok) {
        const j = await rLoc.json().catch(function () { return null; });
        if (j && j.ok) return { delivered: true, channel: "server", id: j.id || "" };
      }
    } catch (e) {}
  }
  return { delivered: false, channel: "local" };
}

async function submitUserFeedback() {
  const bodyEl = el("inputFeedbackBody");
  const nameEl = el("inputFeedbackName");
  const chkEl = el("chkFeedbackIncludeEnv");
  const btnEl = el("btnSubmitFeedback");
  const resultCard = el("feedbackResultCard");
  const resultMsg = el("feedbackResultMsg");

  const msg = bodyEl ? String(bodyEl.value || "").trim() : "";
  if (msg.length < 2) {
    if (typeof showToast === "function") showToast("請先輸入至少 2 個字的反饋內容喔！", "warn");
    if (bodyEl && typeof bodyEl.focus === "function") bodyEl.focus();
    return false;
  }

  const includeEnv = !chkEl || Boolean(chkEl.checked);
  const entry = {
    id: "fb_" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    category: feedbackUiState.category,
    rating: feedbackUiState.rating,
    nickname: nameEl ? String(nameEl.value || "").trim().slice(0, 32) : "",
    message: msg.slice(0, 1500),
    includeEnv: includeEnv,
    diagnostics: includeEnv ? collectFeedbackDiagnostics() : null,
    deliveredTo: "local"
  };

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "送出中…";
  }

  const delivery = await tryDeliverFeedbackRemote(entry);
  entry.deliveredTo = delivery.channel;
  feedbackUiState.lastEntry = entry;

  const history = loadFeedbackHistory();
  history.unshift(entry);
  saveFeedbackHistory(history);
  renderFeedbackHistoryList();

  if (bodyEl) bodyEl.value = "";
  if (btnEl) {
    btnEl.disabled = false;
    btnEl.textContent = "📨 送出反饋";
  }

  if (resultCard && resultMsg) {
    if (delivery.channel === "server") {
      resultMsg.textContent = "✅ 已直接送達主辦者電腦（.feedback_inbox）！你也可以順手複製或送至 GitHub 備份：";
    } else if (delivery.channel === "webhook") {
      resultMsg.textContent = "✅ 已成功送達開發者雲端反饋箱！非常感謝你的試玩意見：";
    } else {
      resultMsg.textContent = "✅ 已為你整理並暫存反饋報告！請點下方任一按鈕回傳給作者：";
    }
    resultCard.classList.remove("hidden");
  }

  if (typeof sound !== "undefined" && typeof sound.tone === "function") {
    sound.tone(660, 0.08, "triangle", 0.05, 0);
  }
  if (typeof showToast === "function") {
    const anonHost = typeof isAnonymousReviewHost === "function" && isAnonymousReviewHost();
    showToast(
      delivery.delivered
        ? "💌 感謝你的反饋，已成功送達開發者！"
        : (anonHost
          ? "💌 反饋已整理完成，點「複製貼給作者」即可回傳！"
          : "💌 反饋已整理完成，點「送至 GitHub」或「複製貼給作者」即可回傳！"),
      "emerald"
    );
  }
  return entry;
}

function exportFeedbackHistoryJson() {
  const list = loadFeedbackHistory();
  if (!list.length) {
    if (typeof showToast === "function") showToast("目前還沒有可匯出的反饋紀錄", "warn");
    return false;
  }
  const text = JSON.stringify(list, null, 2);
  try {
    if (typeof Blob === "function" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dayTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = "sanhao_feedback_" + dayTag + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (typeof showToast === "function") showToast("📥 已匯出 " + list.length + " 筆玩家反饋（JSON）！", "emerald");
      return true;
    }
  } catch (e) {}
  copyFeedbackText(text);
  if (typeof showToast === "function") showToast("📋 已複製全部反饋 JSON 到剪貼簿！", "emerald");
  return true;
}

function bindFeedbackEvents() {
  if (el("btnTitleFeedback")) {
    el("btnTitleFeedback").addEventListener("click", openFeedbackModal);
  }
  if (el("btnOpenFeedback")) {
    el("btnOpenFeedback").addEventListener("click", openFeedbackModal);
  }
  if (el("btnCloseFeedback")) {
    el("btnCloseFeedback").addEventListener("click", closeFeedbackModal);
  }
  if (el("feedbackStarGroup")) {
    el("feedbackStarGroup").querySelectorAll("[data-fb-star]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        feedbackUiState.rating = parseInt(btn.getAttribute("data-fb-star"), 10) || 5;
        syncFeedbackStarUi();
      });
    });
  }
  if (el("feedbackCatGroup")) {
    el("feedbackCatGroup").querySelectorAll("[data-fb-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        feedbackUiState.category = btn.getAttribute("data-fb-cat") || "idea";
        syncFeedbackCategoryUi();
      });
    });
  }
  if (el("chkFeedbackIncludeEnv")) {
    el("chkFeedbackIncludeEnv").addEventListener("change", refreshFeedbackEnvPreview);
  }
  if (el("btnSubmitFeedback")) {
    el("btnSubmitFeedback").addEventListener("click", function () {
      submitUserFeedback();
    });
  }
  if (el("btnCopyLastFeedback")) {
    el("btnCopyLastFeedback").addEventListener("click", function () {
      const target = feedbackUiState.lastEntry || loadFeedbackHistory()[0];
      if (!target) return;
      copyFeedbackText(buildFeedbackReportText(target)).then(function (ok) {
        if (typeof showToast === "function") {
          showToast(ok ? "📋 已複製完整反饋！可直接貼到 LINE / Discord 給作者" : "無法自動複製，請手動選取內容", ok ? "emerald" : "warn");
        }
      });
    });
  }
  if (el("btnOpenGithubFeedback")) {
    el("btnOpenGithubFeedback").addEventListener("click", function () {
      const target = feedbackUiState.lastEntry || loadFeedbackHistory()[0];
      if (!target) return;
      const url = buildGitHubIssueUrl(target);
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  }
  if (el("btnExportFeedbackJson")) {
    el("btnExportFeedbackJson").addEventListener("click", exportFeedbackHistoryJson);
  }
}
