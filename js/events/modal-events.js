/**
 * 全域鍵盤快捷鍵、彈窗背景點擊關閉、新手教學 / 三好理念 / AI 設定 / 紀錄與小抄彈窗事件
 */
"use strict";

function hasBlockingModalOpen() {
  const modalIds = ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalFeedback", "modalPauseMenu", "heroSheetLightbox", "setupDrawer", "roleDealOverlay"];
  return modalIds.some(function (mid) {
    const m = el(mid);
    return Boolean(m && m.classList && !m.classList.contains("hidden"));
  });
}

function bindModalEvents() {
  window.addEventListener("keydown", function (ev) {
    const tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
    if (tag === "textarea" || tag === "input" || tag === "select") return;
    if (ev.key === "Escape") {
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
        if (el("heroSheetLightbox") && !el("heroSheetLightbox").classList.contains("hidden")) {
          el("heroSheetLightbox").classList.add("hidden");
        } else {
          stage3d.setShowcaseMode(false);
        }
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
      ["modalTutorial", "modalGuide", "modalAiConfig", "modalVoteSheet", "modalHistoryLog", "modalJournal", "modalMusic", "modalCareer", "modalFeedback", "modalPauseMenu", "heroSheetLightbox"].forEach(function (mid) {
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
        indieFlow.hideRoleDealRitual();
        return;
      }
    }
    if (hasBlockingModalOpen()) {
      const tutMod = el("modalTutorial");
      if (tutMod && !tutMod.classList.contains("hidden")) {
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          state.tutorialIndex = Math.min(TUTORIAL_SLIDES.length - 1, state.tutorialIndex + 1);
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
      if (state.match.phase === "DAY_VOTE_RESULT" && el("btnVoteResultNext") && !el("btnVoteResultNext").classList.contains("hidden")) {
        ev.preventDefault();
        el("btnVoteResultNext").click();
        return;
      }
      if (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH" || state.match.phase === "HUNTER_RESOLVE") {
        ev.preventDefault();
        el("btnStepNext").click();
        return;
      }
    }
    if (ev.key === "Enter") {
      const phNow = state.match && state.match.phase;
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
      if (phNow === "DAY_SPEECH" || phNow === "LAST_WORDS_SPEECH" || phNow === "HUNTER_RESOLVE") {
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
      if (state.match.started && el("btnPauseVoice") && (state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH")) {
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

  function openTutorialModal(startIdx) {
    sound.unlock();
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
    state.tutorialIndex = Math.min(TUTORIAL_SLIDES.length - 1, state.tutorialIndex + 1);
    renderTutorialSlide();
  });
  el("btnLaunchGuidedDemo").addEventListener("click", startGuidedBeginnerMatch);
  el("btnStartTutorialMatch").addEventListener("click", startGuidedBeginnerMatch);

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

  async function refreshLocalOllamaOptions() {
    const grp = el("localOllamaOptGroup");
    const sel = el("selectGeminiModel");
    if (!grp) return;
    try {
      const resp = await fetch("/api/local-llm/status");
      const info = await resp.json();
      grp.innerHTML = "";
      if (info && info.running && Array.isArray(info.models) && info.models.length > 0) {
        info.models.forEach(function (mName) {
          const opt = document.createElement("option");
          opt.value = "ollama:" + mName;
          opt.textContent = "本機 Ollama · " + mName + "（免費離線免 Key）";
          grp.appendChild(opt);
        });
        if (sel && state.localLlmModel) {
          sel.value = "ollama:" + state.localLlmModel;
        }
      } else {
        const hintOpt = document.createElement("option");
        hintOpt.value = "";
        hintOpt.disabled = true;
        hintOpt.textContent = (info && info.running)
          ? "Ollama 已啟動・尚無模型（終端機執行 ollama pull qwen3:8b）"
          : "未偵測到本機 Ollama（需先執行 server.py 與 ollama serve）";
        grp.appendChild(hintOpt);
      }
    } catch (e) {
      grp.innerHTML = '<option value="" disabled>純檔案開啟無法偵測 Ollama（請改開 http://localhost:8788）</option>';
    }
  }

  el("btnOpenAiModal").addEventListener("click", function () {
    el("inputGeminiKey").value = state.geminiApiKey;
    const sel = el("selectGeminiModel");
    if (sel) sel.value = state.localLlmModel ? ("ollama:" + state.localLlmModel) : (state.geminiModel || "gemini-3.8-flash");
    el("aiTestResultBox").classList.add("hidden");
    el("modalAiConfig").classList.remove("hidden");
    refreshLocalOllamaOptions();
  });
  el("btnCloseAiModal").addEventListener("click", function () { el("modalAiConfig").classList.add("hidden"); });

  el("btnSaveApiKey").addEventListener("click", async function () {
    const key = el("inputGeminiKey").value.trim();
    const chosenModel = el("selectGeminiModel") ? el("selectGeminiModel").value : "gemini-3.8-flash";
    const box = el("aiTestResultBox");
    box.classList.remove("hidden");

    if (chosenModel && chosenModel.indexOf("ollama:") === 0) {
      const ollamaName = chosenModel.slice(7);
      state.localLlmModel = ollamaName;
      state.geminiApiKey = "";
      saveUserPrefs();
      box.textContent = "正在測試本機 Ollama 模型「" + ollamaName + "」…";
      const lRes = await callLocalOllamaOnce(ollamaName, "請只回覆「連線成功」四個字", 25000);
      if (lRes.ok && lRes.text) {
        box.textContent = "已成功啟用本機免費模型「" + ollamaName + "」（" + lRes.text.slice(0, 24) + "）";
      } else {
        state.localLlmModel = "";
        saveUserPrefs();
        box.textContent = "本機 Ollama 連線失敗（" + (lRes.error || "未回應") + "），已維持內建 AI。";
      }
      updateAllUI();
      return;
    }

    state.localLlmModel = "";
    state.geminiApiKey = key;
    state.geminiModel = chosenModel || "gemini-3.8-flash";
    saveUserPrefs();
    if (!key) {
      box.textContent = "已切回內建三好 AI 推理引擎！";
      updateAllUI();
      return;
    }
    box.textContent = "正在測試連線至 " + state.geminiModel + "…";
    const res = await callGeminiModelOnce(state.geminiModel, "請只回覆「連線成功」四個字", 15000);
    if (res.ok && res.text) {
      box.textContent = "已成功啟用 " + state.geminiModel + "（" + res.text + "）";
    } else {
      const fb38 = state.geminiModel !== "gemini-3.8-flash"
        ? await callGeminiModelOnce("gemini-3.8-flash", "請只回覆「連線成功」四個字", 10000)
        : { ok: false };
      if (fb38.ok && fb38.text) {
        state.geminiModel = "gemini-3.8-flash";
        if (el("selectGeminiModel")) el("selectGeminiModel").value = "gemini-3.8-flash";
        saveUserPrefs();
        box.textContent = chosenModel + " 暫無配額或權限，已自動切換為 Gemini 3.8 Flash 並連線成功！";
      } else {
        const fb25 = state.geminiModel !== "gemini-2.5-flash"
          ? await callGeminiModelOnce("gemini-2.5-flash", "請只回覆「連線成功」四個字", 8000)
          : { ok: false };
        if (fb25.ok && fb25.text) {
          state.geminiModel = "gemini-2.5-flash";
          if (el("selectGeminiModel")) el("selectGeminiModel").value = "gemini-2.5-flash";
          saveUserPrefs();
          box.textContent = chosenModel + " 暫無配額，已自動切換為 Gemini 2.5 Flash 並連線成功！";
        } else {
          state.geminiApiKey = "";
          box.textContent = "金鑰無效、配額不足或網路受限，已自動使用內建三好 AI 引擎";
        }
      }
    }
    updateAllUI();
  });

  el("btnClearApiKey").addEventListener("click", function () {
    state.geminiApiKey = "";
    state.localLlmModel = "";
    saveUserPrefs();
    el("inputGeminiKey").value = "";
    if (el("selectGeminiModel")) el("selectGeminiModel").value = state.geminiModel || "gemini-3.8-flash";
    el("aiTestResultBox").classList.remove("hidden");
    el("aiTestResultBox").textContent = "已切回內建 AI！";
    updateAllUI();
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
