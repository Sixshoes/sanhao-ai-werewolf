/**
 * 全域鍵盤快捷鍵、彈窗背景點擊關閉、新手教學 / 三好理念 / AI 設定 / 紀錄與小抄彈窗事件
 */
"use strict";

function hasBlockingModalOpen() {
  if (typeof stage3d !== "undefined" && stage3d.showcaseMode) return true;
  const modalIds = ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalFeedback", "modalPauseMenu", "heroShowcaseOverlay", "setupDrawer", "roleDealOverlay"];
  return modalIds.some(function (mid) {
    const m = el(mid);
    return Boolean(m && m.classList && !m.classList.contains("hidden"));
  });
}

function bindModalEvents() {
  window.addEventListener("keydown", function (ev) {
    const tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
    if (ev.key === "Escape") {
      if (tag === "textarea" || tag === "input" || tag === "select") {
        if (!hasBlockingModalOpen()) {
          if (ev.target && typeof ev.target.blur === "function") ev.target.blur();
          return;
        }
      }
      const tutOpenEsc = el("modalTutorial") && !el("modalTutorial").classList.contains("hidden");
      if (tutOpenEsc) {
        el("modalTutorial").classList.add("hidden");
        return;
      }
      const dealOv = el("roleDealOverlay");
      if (dealOv && !dealOv.classList.contains("hidden") && typeof indieFlow !== "undefined") {
        indieFlow.hideRoleDealRitual();
        return;
      }
      if (typeof stage3d !== "undefined" && stage3d.showcaseMode) {
        stage3d.setShowcaseMode(false);
        return;
      }
      if (el("setupDrawer") && !el("setupDrawer").classList.contains("hidden")) {
        el("setupDrawer").classList.add("hidden");
        return;
      }
      closeSeatIntel();
      closeRadialMenu();
      let closedAny = false;
      const roleGuidePop = el("roleGuidePopover");
      if (roleGuidePop && !roleGuidePop.classList.contains("hidden")) {
        roleGuidePop.classList.add("hidden");
        closedAny = true;
      }
      ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalFeedback", "modalPauseMenu"].forEach(function (mid) {
        const m = el(mid);
        if (m && !m.classList.contains("hidden")) {
          m.classList.add("hidden");
          closedAny = true;
        }
      });
      if (sound.spectrumRAF) { cancelAnimationFrame(sound.spectrumRAF); sound.spectrumRAF = null; }
      if (!closedAny && state.match.started && typeof indieFlow !== "undefined") {
        indieFlow.openPauseMenu(true);
      }
      return;
    }
    if (tag === "textarea" || tag === "input" || tag === "select") return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.repeat && (ev.key === " " || ev.key === "Enter")) {
      ev.preventDefault();
      return;
    }
    if (ev.key === " " || ev.key === "Enter") {
      const dealOv = el("roleDealOverlay");
      const tutModNow = el("modalTutorial");
      const tutOpenNow = Boolean(tutModNow && !tutModNow.classList.contains("hidden"));
      if (dealOv && !dealOv.classList.contains("hidden") && !tutOpenNow && typeof indieFlow !== "undefined") {
        ev.preventDefault();
        if (!indieFlow.dealRevealed && typeof indieFlow.unsealRoleDealCard === "function") {
          indieFlow.unsealRoleDealCard();
        } else {
          indieFlow.hideRoleDealRitual();
        }
        return;
      }
    }
    if ((ev.key === "j" || ev.key === "J") && state.match.started && typeof indieFlow !== "undefined") {
      const jModQuick = el("modalJournal");
      if (jModQuick && !jModQuick.classList.contains("hidden")) {
        jModQuick.classList.add("hidden");
        return;
      }
    }
    if (hasBlockingModalOpen()) {
      const tutMod = el("modalTutorial");
      if (tutMod && !tutMod.classList.contains("hidden")) {
        const tutSlides = (typeof getActiveTutorialSlides === "function") ? getActiveTutorialSlides() : TUTORIAL_SLIDES;
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          state.tutorialIndex = Math.min(tutSlides.length - 1, state.tutorialIndex + 1);
          renderTutorialSlide();
        } else if (ev.key === "ArrowLeft") {
          ev.preventDefault();
          state.tutorialIndex = Math.max(0, state.tutorialIndex - 1);
          renderTutorialSlide();
        }
      }
      return;
    }
    if (ev.key === " ") {
      if (state.voteFlight && typeof state.voteFlight.finish === "function") {
        ev.preventDefault();
        state.voteFlight.finish();
        return;
      }
      if (state.match.phase === "NIGHT_SEER" && state.seerReveal && el("btnSeerRevealContinue")) {
        ev.preventDefault();
        el("btnSeerRevealContinue").click();
        return;
      }
      if (state.match && state.match.candlelitReview && state.match.candlelitReview.active) {
        ev.preventDefault();
        if (typeof finishCandlelitNightReview === "function") finishCandlelitNightReview();
        return;
      }
      if (state.match.phase === "DAY_VOTE_RESULT" && el("btnVoteResultNext") && !el("btnVoteResultNext").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnVoteResultNext").click();
        return;
      }
      if (state.match.phase === "SHERIFF_ELECTION" && el("btnSheriffNextSpeech") && !el("btnSheriffNextSpeech").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnSheriffNextSpeech").click();
        return;
      }
      if (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH" || state.match.phase === "HUNTER_RESOLVE" || (state.match.phase === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && !isPlayerEligibleToVote())) {
        ev.preventDefault();
        el("btnStepNext").click();
        return;
      }
    }
    if (ev.key === "Enter") {
      const phNow = state.match && state.match.phase;
      if (state.match && state.match.candlelitReview && state.match.candlelitReview.active) {
        ev.preventDefault();
        if (typeof finishCandlelitNightReview === "function") finishCandlelitNightReview();
        return;
      }
      if (phNow === "SHERIFF_ELECTION" && el("btnSheriffNextSpeech") && !el("btnSheriffNextSpeech").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnSheriffNextSpeech").click();
        return;
      }
      if (phNow === "NIGHT_SEER" && state.seerReveal && el("btnSeerRevealContinue")) {
        ev.preventDefault();
        el("btnSeerRevealContinue").click();
        return;
      }
      if ((phNow === "NIGHT_GUARD" || phNow === "NIGHT_SEER" || phNow === "NIGHT_WOLF" || phNow === "HUNTER_TRIGGER") && el("btnConfirmTarget") && !el("btnConfirmTarget").disabled && !el("btnConfirmTarget").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnConfirmTarget").click();
        return;
      }
      if (phNow === "DAY_VOTE" && el("btnCastVote") && !el("btnCastVote").disabled && el("panelVote") && !el("panelVote").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnCastVote").click();
        return;
      }
      if (phNow === "DAY_VOTE_RESULT" && el("btnVoteResultNext") && !el("btnVoteResultNext").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnVoteResultNext").click();
        return;
      }
      if (phNow === "DAY_SPEECH" || phNow === "LAST_WORDS_SPEECH" || phNow === "HUNTER_RESOLVE" || (phNow === "DAY_VOTE" && typeof isPlayerEligibleToVote === "function" && !isPlayerEligibleToVote())) {
        ev.preventDefault();
        el("btnStepNext").click();
        return;
      }
    }
    if (ev.key === "Tab" && state.match.started && state.match.phase === "DAY_PLAYER_TURN" && el("btnCycleSpeechTarget")) {
      ev.preventDefault();
      el("btnCycleSpeechTarget").click();
      return;
    }
    if (state.match.started && state.match.phase === "DAY_PLAYER_TURN") {
      const cardMap = { q: 0, Q: 0, w: 1, W: 1, e: 2, E: 2 };
      if (Object.prototype.hasOwnProperty.call(cardMap, ev.key)) {
        const chipsBox = el("quickSpeechChips");
        const btns = chipsBox ? chipsBox.querySelectorAll("button") : null;
        const targetCardBtn = btns && btns[cardMap[ev.key]];
        if (targetCardBtn) {
          ev.preventDefault();
          targetCardBtn.click();
          return;
        }
      }
    }
    const maxSeatsKey = (state.match && state.match.totalSeats) || 8;
    const seatKeyMap = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "0": 10, "-": 11, "=": 12 };
    if (Object.prototype.hasOwnProperty.call(seatKeyMap, ev.key) && seatKeyMap[ev.key] <= maxSeatsKey) {
      selectSeat(seatKeyMap[ev.key]);
    }
    else if (ev.key === "p" || ev.key === "P") {
      const shSpeechNow = Boolean(state.match.phase === "SHERIFF_ELECTION" && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech");
      if (state.match.started && el("btnPauseVoice") && (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH" || shSpeechNow)) {
        el("btnPauseVoice").click();
      }
    }
    else if (ev.key === "a" || ev.key === "A") { if (state.match.started && el("btnAutoPlayToggle")) el("btnAutoPlayToggle").click(); }
    else if (ev.key === "j" || ev.key === "J") {
      if (state.match.started && typeof indieFlow !== "undefined") {
        const jMod = el("modalJournal");
        if (jMod && !jMod.classList.contains("hidden")) jMod.classList.add("hidden");
        else indieFlow.openJournal("log");
      }
    }
    else if (ev.key === "d" || ev.key === "D") { if (el("btnToggle3D")) el("btnToggle3D").click(); }
    else if (ev.key === "c" || ev.key === "C") { if (typeof stage3d !== "undefined" && stage3d.isActive()) stage3d.cycleCameraPreset(); }
    else if (ev.key === "r" || ev.key === "R") { if (typeof stage3d !== "undefined" && stage3d.isActive()) { stage3d.resetCamera(); showToast("已重置 3D 運鏡視角", "emerald"); } }
    else if (ev.key === "f" || ev.key === "F") { if (typeof stage3d !== "undefined" && stage3d.isActive()) stage3d.toggleIdCardPeek(); }
    else if (ev.key === "m" || ev.key === "M") el("btnToggleMute").click();
    else if (ev.key === "v" || ev.key === "V") el("btnToggleVoice").click();
  });

  // Click outside backdrop to close any open modal cleanly!
  ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalMusic", "modalCareer", "modalFeedback"].forEach(function (mid) {
    const m = el(mid);
    if (!m) return;
    m.addEventListener("click", function (ev) {
      if (ev.target === m) {
        m.classList.add("hidden");
        if (mid === "modalMusic" && sound.spectrumRAF) {
          cancelAnimationFrame(sound.spectrumRAF);
          sound.spectrumRAF = null;
        }
      }
    });
  });

  function openTutorialModal(startIdx, deviceOverride) {
    sound.unlock();
    state.tutorialDevice = deviceOverride || ((typeof detectTutorialDeviceMode === "function") ? detectTutorialDeviceMode() : "desktop");
    state.tutorialIndex = typeof startIdx === "number" ? startIdx : 0;
    renderTutorialSlide();
    el("modalTutorial").classList.remove("hidden");
  }
  el("btnOpenTutorial").addEventListener("click", function () { openTutorialModal(0); });
  if (el("btnOpenTutorialPause")) {
    el("btnOpenTutorialPause").addEventListener("click", function () { openTutorialModal(0); });
  }
  if (el("btnOpenTutorialFromGuide")) {
    el("btnOpenTutorialFromGuide").addEventListener("click", function () {
      if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
      openTutorialModal(1);
    });
  }
  el("btnCloseTutorial").addEventListener("click", function () {
    sound.unlock();
    el("modalTutorial").classList.add("hidden");
  });
  el("btnTutPrev").addEventListener("click", function () {
    sound.unlock();
    state.tutorialIndex = Math.max(0, state.tutorialIndex - 1);
    renderTutorialSlide();
  });
  el("btnTutNext").addEventListener("click", function () {
    sound.unlock();
    const tutSlides = (typeof getActiveTutorialSlides === "function") ? getActiveTutorialSlides() : TUTORIAL_SLIDES;
    state.tutorialIndex = Math.min(tutSlides.length - 1, state.tutorialIndex + 1);
    renderTutorialSlide();
  });

  // Touch horizontal swipe inside Tutorial body to turn chapters cleanly on Phone & Tablet
  const tutScrollEl = el("tutorialScrollArea") || el("tutorialSlideBody");
  if (tutScrollEl) {
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeActive = false;
    tutScrollEl.addEventListener("touchstart", function (ev) {
      if (!ev.touches || ev.touches.length !== 1) { swipeActive = false; return; }
      swipeStartX = ev.touches[0].clientX;
      swipeStartY = ev.touches[0].clientY;
      swipeActive = true;
    }, { passive: true });
    tutScrollEl.addEventListener("touchend", function (ev) {
      if (!swipeActive || !ev.changedTouches || !ev.changedTouches.length) return;
      swipeActive = false;
      const dx = ev.changedTouches[0].clientX - swipeStartX;
      const dy = ev.changedTouches[0].clientY - swipeStartY;
      if (Math.abs(dx) < 52 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
      const tutSlides = (typeof getActiveTutorialSlides === "function") ? getActiveTutorialSlides() : TUTORIAL_SLIDES;
      if (dx < 0 && state.tutorialIndex < tutSlides.length - 1) {
        state.tutorialIndex += 1;
        if (typeof sound !== "undefined" && typeof sound.tone === "function") sound.tone(540, 0.04, "triangle", 0.03, 0);
        renderTutorialSlide();
      } else if (dx > 0 && state.tutorialIndex > 0) {
        state.tutorialIndex -= 1;
        if (typeof sound !== "undefined" && typeof sound.tone === "function") sound.tone(480, 0.04, "triangle", 0.03, 0);
        renderTutorialSlide();
      }
    }, { passive: true });
  }
  el("btnLaunchGuidedDemo").addEventListener("click", startGuidedBeginnerMatch);
  el("btnStartTutorialMatch").addEventListener("click", startGuidedBeginnerMatch);
  if (el("btnStartJudgeShowcase") && typeof startJudgeShowcaseMatch === "function") {
    el("btnStartJudgeShowcase").addEventListener("click", startJudgeShowcaseMatch);
  }

  el("btnOpenGuide").addEventListener("click", function () {
    if (typeof switchGuideTab === "function") switchGuideTab("overview");
    el("modalGuide").classList.remove("hidden");
  });
  el("btnCloseGuide").addEventListener("click", function () { el("modalGuide").classList.add("hidden"); });
  if (el("tabGuideOverview")) {
    el("tabGuideOverview").addEventListener("click", function () {
      if (typeof switchGuideTab === "function") switchGuideTab("overview");
    });
  }
  if (el("tabGuideTrace")) {
    el("tabGuideTrace").addEventListener("click", function () {
      if (typeof switchGuideTab === "function") switchGuideTab("trace");
    });
  }
  if (el("btnClearOrchTrace")) {
    el("btnClearOrchTrace").addEventListener("click", function () {
      if (typeof orchestrator !== "undefined") orchestrator.clearTraces();
    });
  }

  const AI_MODE_CARDS = [
    { id: "btnAiModeCloud", mode: "cloud", pane: "aiPaneCloud" },
    { id: "btnAiModeKey", mode: "key", pane: "aiPaneKey" },
    { id: "btnAiModeOllama", mode: "ollama", pane: "aiPaneOllama" },
    { id: "btnAiModeOffline", mode: "offline", pane: "aiPaneOffline" }
  ];
  const AI_CLOUD_MODEL_BTNS = [
    { id: "btnCloudModelPro", model: "gemini-3.8-flash" },
    { id: "btnCloudModelFlash", model: "gemini-3.5-flash-lite" },
    { id: "btnCloudModelLite", model: "gemini-2.5-flash-lite" }
  ];

  let selectedAiUiMode = "cloud";
  let selectedCloudModelUi = "gemini-3.5-flash-lite";
  let aiTestInFlight = false;

  function playAiConfigClickSfx(freq) {
    if (typeof sound !== "undefined") {
      if (typeof sound.unlock === "function") sound.unlock();
      if (typeof sound.tone === "function") sound.tone(freq || 560, 0.045, "triangle", 0.032, 0);
    }
  }

  function detectCurrentActiveAiMode() {
    if (state.localLlmModel) return "ollama";
    if (state.geminiApiKey) return "key";
    if (state.serverGeminiOptOut) return "offline";
    if (typeof isServerGeminiProxyActive === "function" && isServerGeminiProxyActive()) return "cloud";
    return state.serverGeminiAvailable ? "cloud" : "offline";
  }

  function renderAiTestResult(statusKind, mainText, subText) {
    const box = el("aiTestResultBox");
    if (!box) return;
    box.classList.remove("hidden", "is-ok", "is-testing", "is-warn", "is-error");
    if (statusKind) box.classList.add("is-" + statusKind);
    while (box.firstChild) box.removeChild(box.firstChild);
    const row = document.createElement("div");
    row.className = "flex items-start gap-2";
    const dot = document.createElement("span");
    dot.className = "ai-status-dot mt-1 shrink-0" + (statusKind ? (" is-" + statusKind) : "");
    dot.setAttribute("aria-hidden", "true");
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "min-w-0 flex-1";
    const mainEl = document.createElement("div");
    mainEl.className = "font-semibold";
    mainEl.textContent = String(mainText || "");
    bodyWrap.appendChild(mainEl);
    if (subText) {
      const subEl = document.createElement("div");
      subEl.className = "text-[13px] opacity-85 mt-0.5";
      subEl.textContent = String(subText);
      bodyWrap.appendChild(subEl);
    }
    row.appendChild(dot);
    row.appendChild(bodyWrap);
    box.appendChild(row);
  }

  function syncAiModalActiveBadge() {
    const lblEl = el("aiModalActiveLabel");
    const dotEl = el("aiModalActiveDot");
    const activeText = typeof getActiveLlmLabel === "function" ? getActiveLlmLabel() : "離線規則";
    if (lblEl) lblEl.textContent = activeText;
    if (dotEl) {
      dotEl.className = "ai-status-dot is-ok";
    }
    const cloudHint = el("aiCloudEnvHint");
    if (cloudHint) {
      cloudHint.textContent = state.serverGeminiAvailable
        ? ("雲端代理就緒（目前選取 " + selectedCloudModelUi + "），按下「測試並套用」將實測連線並回報往返耗時。")
        : "目前尚未偵測到啟用中的雲端代理；按下「測試並套用」將即時探測 /api/gemini 狀態。";
    }
  }

  function syncCloudModelButtonsUi(modelId) {
    selectedCloudModelUi = (typeof normalizeCloudGeminiModel === "function")
      ? normalizeCloudGeminiModel(modelId)
      : (modelId === "gemini-3.8-flash" ? "gemini-3.8-flash" : (modelId === "gemini-2.5-flash-lite" ? "gemini-2.5-flash-lite" : "gemini-3.5-flash-lite"));
    AI_CLOUD_MODEL_BTNS.forEach(function (item) {
      const btn = el(item.id);
      if (!btn) return;
      const active = item.model === selectedCloudModelUi ||
        (item.model === "gemini-3.8-flash" && selectedCloudModelUi === "gemini-3.6-flash");
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    syncAiModalActiveBadge();
  }

  function setAiSaveButtonTesting(testing) {
    const saveBtn = el("btnSaveApiKey");
    if (!saveBtn) return;
    saveBtn.disabled = Boolean(testing);
    saveBtn.classList.toggle("is-testing", Boolean(testing));
    if (testing) {
      saveBtn.textContent = "連線測試中…";
    } else {
      saveBtn.textContent = selectedAiUiMode === "offline" ? "套用離線引擎" : "測試並套用";
    }
  }

  function switchAiModalMode(mode, playSfx) {
    const valid = ["cloud", "key", "ollama", "offline"].indexOf(mode) !== -1 ? mode : "cloud";
    selectedAiUiMode = valid;
    if (playSfx) playAiConfigClickSfx(valid === "offline" ? 490 : 580);
    AI_MODE_CARDS.forEach(function (card) {
      const btn = el(card.id);
      const pane = el(card.pane);
      const isCur = card.mode === valid;
      if (btn) {
        btn.classList.toggle("is-active", isCur);
        btn.setAttribute("aria-pressed", isCur ? "true" : "false");
      }
      if (pane) {
        pane.classList.toggle("hidden", !isCur);
      }
    });
    if (!aiTestInFlight) setAiSaveButtonTesting(false);
    if (valid === "ollama") refreshLocalOllamaOptions();
    syncAiModalActiveBadge();
  }

  async function refreshLocalOllamaOptions(showFeedback) {
    const grp = el("localOllamaOptGroup");
    const sel = el("selectOllamaModel");
    if (!grp) return;
    try {
      const resp = await fetch("/api/local-llm/status", { cache: "no-store" });
      const info = await resp.json();
      while (grp.firstChild) grp.removeChild(grp.firstChild);
      if (info && info.running && Array.isArray(info.models) && info.models.length > 0) {
        info.models.forEach(function (mName) {
          const opt = document.createElement("option");
          opt.value = String(mName);
          opt.textContent = "本機 Ollama · " + mName + "（免費離線免 Key）";
          grp.appendChild(opt);
        });
        if (sel) {
          sel.value = (state.localLlmModel && info.models.indexOf(state.localLlmModel) !== -1)
            ? state.localLlmModel
            : String(info.models[0]);
        }
        if (showFeedback) {
          renderAiTestResult("ok", "已偵測到 " + info.models.length + " 個本機 Ollama 模型", "請選擇模型後點選「測試並套用」。");
        }
      } else {
        const hintOpt = document.createElement("option");
        hintOpt.value = "";
        hintOpt.disabled = true;
        hintOpt.selected = true;
        hintOpt.textContent = (info && info.running)
          ? "Ollama 已啟動・尚無模型（終端機執行 ollama pull qwen3:8b）"
          : "未偵測到本機 Ollama（需先執行 server.py 與 ollama serve）";
        grp.appendChild(hintOpt);
        if (showFeedback) {
          renderAiTestResult("warn", "尚未偵測到可用的本機 Ollama 模型", "請確認已啟動 server.py 與 ollama serve。");
        }
      }
    } catch (e) {
      while (grp.firstChild) grp.removeChild(grp.firstChild);
      const errOpt = document.createElement("option");
      errOpt.value = "";
      errOpt.disabled = true;
      errOpt.selected = true;
      errOpt.textContent = "目前環境無法偵測本機 Ollama（需於本機執行 server.py）";
      grp.appendChild(errOpt);
      if (showFeedback) {
        renderAiTestResult("warn", "無法連線至本機 Ollama 狀態端點", "請改用雲端免金鑰、自備金鑰或離線規則引擎。");
      }
    }
  }

  AI_MODE_CARDS.forEach(function (card) {
    const btn = el(card.id);
    if (!btn) return;
    btn.addEventListener("click", function () {
      switchAiModalMode(card.mode, true);
    });
  });

  AI_CLOUD_MODEL_BTNS.forEach(function (item) {
    const btn = el(item.id);
    if (!btn) return;
    btn.addEventListener("click", function () {
      playAiConfigClickSfx(620);
      syncCloudModelButtonsUi(item.model);
    });
  });

  if (el("btnRefreshOllama")) {
    el("btnRefreshOllama").addEventListener("click", function () {
      playAiConfigClickSfx(540);
      refreshLocalOllamaOptions(true);
    });
  }

  el("btnOpenAiModal").addEventListener("click", function () {
    playAiConfigClickSfx(520);
    if (el("inputGeminiKey")) el("inputGeminiKey").value = state.geminiApiKey || "";
    const sel = el("selectGeminiModel");
    if (sel) {
      const normKeyModel = typeof normalizePersonalGeminiModel === "function"
        ? normalizePersonalGeminiModel(state.geminiModel)
        : (state.geminiModel || "gemini-3.5-flash-lite");
      sel.value = normKeyModel;
    }
    syncCloudModelButtonsUi(state.serverGeminiModel || "gemini-3.5-flash-lite");
    const initMode = detectCurrentActiveAiMode();
    switchAiModalMode(initMode, false);

    const box = el("aiTestResultBox");
    if (box) {
      if (initMode === "cloud" && typeof isServerGeminiProxyActive === "function" && isServerGeminiProxyActive()) {
        renderAiTestResult("ok", "目前使用：" + getActiveLlmLabel() + "（雲端免金鑰已啟用）", "切換高階／標準／極速模型後按下「測試並套用」即可即時實測與切換。");
      } else {
        box.classList.add("hidden");
      }
    }
    syncAiModalActiveBadge();
    el("modalAiConfig").classList.remove("hidden");
    refreshLocalOllamaOptions(false);
  });

  el("btnCloseAiModal").addEventListener("click", function () {
    playAiConfigClickSfx(460);
    el("modalAiConfig").classList.add("hidden");
  });

  el("btnSaveApiKey").addEventListener("click", async function () {
    if (aiTestInFlight) return;
    playAiConfigClickSfx(600);
    aiTestInFlight = true;
    setAiSaveButtonTesting(true);

    try {
      if (selectedAiUiMode === "offline") {
        state.geminiApiKey = "";
        state.localLlmModel = "";
        state.serverGeminiOptOut = true;
        state.serverGeminiCooldownUntil = 0;
        state._personalKeyCooldownUntil = 0;
        if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey("");
        saveUserPrefs();
        if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
        updateAllUI();
        syncAiModalActiveBadge();
        renderAiTestResult("ok", "已切換為純離線內建引擎（離線規則・0ms 零延遲）", "對局中下一席發言將立即採用本地盲視推理引擎。");
        return;
      }

      if (selectedAiUiMode === "cloud") {
        const targetCloudModel = typeof normalizeCloudGeminiModel === "function"
          ? normalizeCloudGeminiModel(selectedCloudModelUi)
          : "gemini-3.5-flash-lite";
        renderAiTestResult("testing", "正在向 /api/gemini 探測 " + targetCloudModel + " 連線…", "實測雲端代理可用性與真實往返耗時");
        const tStart = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
        const proto = (typeof window !== "undefined" && window.location) ? window.location.protocol : "";
        let statusInfo = null;
        let statusHttp = 0;
        if (proto === "http:" || proto === "https:") {
          try {
            const stResp = await fetch("/api/gemini", { method: "GET", cache: "no-store" });
            statusHttp = stResp ? stResp.status : 0;
            if (stResp && stResp.ok) {
              statusInfo = await stResp.json().catch(function () { return null; });
            }
          } catch (e) {
            statusInfo = null;
          }
        }
        if (!statusInfo || !statusInfo.ok || !statusInfo.available) {
          state.serverGeminiAvailable = false;
          updateAllUI();
          syncAiModalActiveBadge();
          const detailMsg = statusHttp === 404
            ? "偵測不到 /api/gemini 代理端點（HTTP 404）。"
            : "伺服器尚未設定 GEMINI_API_KEY 環境變數，無法進行免金鑰雲端推論。";
          renderAiTestResult("error", "本機環境未啟用雲端代理，請改填金鑰或切換離線引擎", detailMsg);
          return;
        }

        const probeTimeoutMs = (targetCloudModel === "gemini-3.8-flash" || targetCloudModel === "gemini-3.6-flash") ? 14000 : 10000;
        const prox = await callServerGeminiProxyOnce("請只回覆「連線成功」四個字", probeTimeoutMs, {
          model: targetCloudModel,
          lite: targetCloudModel === "gemini-3.5-flash-lite" || targetCloudModel === "gemini-2.5-flash-lite"
        });
        const tEnd = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
        const elapsedMs = (prox && prox.latencyMs) ? prox.latencyMs : Math.max(1, Math.round(tEnd - tStart));

        if (prox && prox.ok && prox.text) {
          state.localLlmModel = "";
          state.geminiApiKey = "";
          state.serverGeminiOptOut = false;
          state.serverGeminiCooldownUntil = 0;
          state._personalKeyCooldownUntil = 0;
          state.serverGeminiAvailable = true;
          state.serverGeminiModel = typeof normalizeCloudGeminiModel === "function"
            ? normalizeCloudGeminiModel(prox.model || targetCloudModel)
            : targetCloudModel;
          state.serverGeminiModelUserChosen = true;
          syncCloudModelButtonsUi(state.serverGeminiModel);
          if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey("");
          saveUserPrefs();
          if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
          updateAllUI();
          syncAiModalActiveBadge();
          const fbNote = (prox.fallbackFrom && prox.fallbackFrom !== state.serverGeminiModel)
            ? ("（" + prox.fallbackFrom + " 不可用，已自動切換為 " + state.serverGeminiModel + "）")
            : ("模型 " + state.serverGeminiModel + " 已生效，下一席發言將立即採用。");
          renderAiTestResult("ok", "連線正常・回應耗時 " + elapsedMs + "ms（" + getActiveLlmLabel() + "）", fbNote);
          return;
        }

        if (prox && prox.status === 503) {
          state.serverGeminiAvailable = false;
          updateAllUI();
          syncAiModalActiveBadge();
          renderAiTestResult("error", "本機環境未啟用雲端代理，請改填金鑰或切換離線引擎", "代理回傳 HTTP 503（伺服器尚未設定 GEMINI_API_KEY）。");
          return;
        }

        const errMsg = (prox && prox.status === 429)
          ? ("雲端公測額度暫時繁忙（HTTP 429・耗時 " + elapsedMs + "ms），請稍後重試或改填個人金鑰。")
          : ("雲端代理已連通，但上游模型回傳錯誤（" + ((prox && prox.error) || ("HTTP " + (prox ? prox.status : 0))) + "・耗時 " + elapsedMs + "ms）");
        renderAiTestResult(prox && prox.status === 429 ? "warn" : "error", errMsg, "請確認 Vercel 環境變數 GEMINI_API_KEY 權限，或切換「自備 Gemini 金鑰」／「純離線內建引擎」。");
        updateAllUI();
        syncAiModalActiveBadge();
        return;
      }

      if (selectedAiUiMode === "ollama") {
        const selOl = el("selectOllamaModel");
        const rawOl = selOl ? String(selOl.value || "").trim() : "";
        const ollamaName = rawOl.indexOf("ollama:") === 0 ? rawOl.slice(7) : rawOl;
        if (!ollamaName) {
          renderAiTestResult("warn", "尚未選擇可用的本機 Ollama 模型", "請先在本機啟動 server.py 與 ollama serve，再點擊「重新偵測」。");
          return;
        }
        renderAiTestResult("testing", "正在測試本機 Ollama 模型「" + ollamaName + "」…", "發送輕量驗證請求並量測本機回應延遲");
        const tStart = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
        const lRes = await callLocalOllamaOnce(ollamaName, "請只回覆「連線成功」四個字", 25000);
        const tEnd = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
        const elapsedMs = Math.max(1, Math.round(tEnd - tStart));
        if (lRes && lRes.ok && lRes.text) {
          state.localLlmModel = ollamaName;
          state.geminiApiKey = "";
          state.serverGeminiOptOut = false;
          state._personalKeyCooldownUntil = 0;
          if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey("");
          saveUserPrefs();
          if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
          updateAllUI();
          syncAiModalActiveBadge();
          renderAiTestResult("ok", "連線正常・回應耗時 " + elapsedMs + "ms（" + getActiveLlmLabel() + "）", "本機模型回覆：" + lRes.text.slice(0, 24));
        } else {
          renderAiTestResult("error", "本機 Ollama 連線失敗（" + ((lRes && lRes.error) || "未回應") + "・耗時 " + elapsedMs + "ms）", "已維持原本推理引擎，請確認 Ollama 服務已啟動。");
          updateAllUI();
          syncAiModalActiveBadge();
        }
        return;
      }

      // Mode: "key" (Personal Gemini API Key)
      const key = el("inputGeminiKey") ? el("inputGeminiKey").value.trim() : "";
      const rawModel = el("selectGeminiModel") ? el("selectGeminiModel").value : "gemini-3.5-flash-lite";
      const chosenModel = typeof normalizePersonalGeminiModel === "function"
        ? normalizePersonalGeminiModel(rawModel)
        : "gemini-3.5-flash-lite";
      if (!key) {
        if (el("inputGeminiKey") && typeof el("inputGeminiKey").focus === "function") el("inputGeminiKey").focus();
        renderAiTestResult("warn", "請先輸入 Gemini API Key", "若暫無金鑰，可點上方卡片切換「雲端免金鑰」或「純離線內建引擎」。");
        return;
      }

      renderAiTestResult("testing", "正在直連驗證 " + chosenModel + "…", "量測官方 API 往返耗時與金鑰權限");
      const tStart = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
      const res = await callGeminiModelOnce(chosenModel, "請只回覆「連線成功」四個字", chosenModel === "gemini-3.8-flash" ? 14000 : 10000, { apiKey: key });
      const tEnd = (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
      const elapsedMs = (res && res.latencyMs) ? res.latencyMs : Math.max(1, Math.round(tEnd - tStart));

      if (res && res.ok && res.text) {
        state.localLlmModel = "";
        state.serverGeminiOptOut = false;
        state.serverGeminiCooldownUntil = 0;
        state._personalKeyCooldownUntil = 0;
        state.geminiApiKey = key;
        state.geminiModel = chosenModel;
        if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey(key);
        saveUserPrefs();
        if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
        updateAllUI();
        syncAiModalActiveBadge();
        renderAiTestResult("ok", "連線正常・回應耗時 " + elapsedMs + "ms（" + getActiveLlmLabel() + "）", "模型 " + chosenModel + " 驗證通過，下一席發言立即生效。");
        return;
      }

      if (res && (res.status === 401 || res.status === 403)) {
        renderAiTestResult("error", "API 金鑰無效或無權限（HTTP " + res.status + "・耗時 " + elapsedMs + "ms）", (res.error || "請檢查金鑰是否複製完整，或切換其他模式。"));
        updateAllUI();
        syncAiModalActiveBadge();
        return;
      }

      const keyFallbackOrder = ["gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"].filter(function (m) { return m !== chosenModel; });
      for (let fi = 0; fi < keyFallbackOrder.length; fi++) {
        const fbModel = keyFallbackOrder[fi];
        const fbRes = await callGeminiModelOnce(fbModel, "請只回覆「連線成功」四個字", 10000, { apiKey: key });
        const totalMs = Math.max(1, Math.round(((typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now()) - tStart));
        if (fbRes && fbRes.ok && fbRes.text) {
          state.localLlmModel = "";
          state.serverGeminiOptOut = false;
          state.serverGeminiCooldownUntil = 0;
          state._personalKeyCooldownUntil = 0;
          state.geminiApiKey = key;
          state.geminiModel = fbModel;
          if (el("selectGeminiModel")) el("selectGeminiModel").value = fbModel;
          if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey(key);
          saveUserPrefs();
          if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
          updateAllUI();
          syncAiModalActiveBadge();
          renderAiTestResult("ok", chosenModel + " 不可用，已自動改用 " + getActiveLlmLabel() + "・耗時 " + totalMs + "ms", "模型 " + fbModel + " 已生效，下一席發言立即套用。");
          return;
        }
      }

      const failStatus = (res && res.status) ? ("HTTP " + res.status + (res.error ? ("・" + res.error) : "")) : "連線逾時或網路受限";
      renderAiTestResult("error", "個人金鑰連線測試失敗（" + failStatus + "・耗時 " + elapsedMs + "ms）", "已保留原本生效引擎，請確認網路狀態或金鑰額度。");
      updateAllUI();
      syncAiModalActiveBadge();
    } finally {
      aiTestInFlight = false;
      setAiSaveButtonTesting(false);
    }
  });

  el("btnClearApiKey").addEventListener("click", function () {
    playAiConfigClickSfx(480);
    state.geminiApiKey = "";
    state.localLlmModel = "";
    state.serverGeminiOptOut = true;
    state.serverGeminiCooldownUntil = 0;
    state._personalKeyCooldownUntil = 0;
    if (typeof saveSessionGeminiKey === "function") saveSessionGeminiKey("");
    saveUserPrefs();
    if (el("inputGeminiKey")) el("inputGeminiKey").value = "";
    switchAiModalMode("offline", false);
    if (typeof bumpTableStateRev === "function") bumpTableStateRev(true);
    updateAllUI();
    syncAiModalActiveBadge();
    renderAiTestResult("ok", "已切回純離線內建引擎（離線規則・0ms 零延遲）", "若需改回雲端或自備金鑰，點上方對應模式卡並按「測試並套用」即可。");
  });

  el("btnOpenLogDrawer").addEventListener("click", function () {
    if (typeof indieFlow !== "undefined") {
      indieFlow.openPauseMenu(false);
      indieFlow.openJournal("log");
    } else if (el("modalHistoryLog")) {
      el("modalHistoryLog").classList.remove("hidden");
    }
  });
  el("btnCloseLogDrawer").addEventListener("click", function () { el("modalHistoryLog").classList.add("hidden"); });
  el("btnOpenVoteSheet").addEventListener("click", function () {
    if (typeof indieFlow !== "undefined") indieFlow.openPauseMenu(false);
    openVoteSheetModal();
  });
  el("btnReviewRolesModal").addEventListener("click", openVoteSheetModal);
  el("btnCloseVoteSheet").addEventListener("click", function () { el("modalVoteSheet").classList.add("hidden"); });

  // Title Screen clean secondary shortcuts
  if (el("btnTitleOpenGuide")) {
    el("btnTitleOpenGuide").addEventListener("click", function () {
      if (typeof switchGuideTab === "function") switchGuideTab("overview");
      el("modalGuide").classList.remove("hidden");
    });
  }
  if (el("btnTitleOpenMusic")) el("btnTitleOpenMusic").addEventListener("click", function () { el("btnOpenMusicModal").click(); });
  if (el("btnTitleOpenCareer")) el("btnTitleOpenCareer").addEventListener("click", function () { el("btnOpenCareer").click(); });
  if (el("btnOpenCareer")) {
    el("btnOpenCareer").addEventListener("click", function () {
      sound.unlock();
      if (typeof openCareerModal === "function") openCareerModal();
    });
  }
  if (el("btnCloseCareer")) {
    el("btnCloseCareer").addEventListener("click", function () { el("modalCareer").classList.add("hidden"); });
  }
  if (el("btnExportReplay")) {
    el("btnExportReplay").addEventListener("click", function () {
      sound.unlock();
      if (typeof copyMatchReplayReport === "function") copyMatchReplayReport();
    });
  }
  if (typeof bindFeedbackEvents === "function") {
    bindFeedbackEvents();
  }
}
