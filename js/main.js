/**
 * 應用程式進入點：組合各模組事件綁定並初始化遊戲畫面
 */
"use strict";

function bindEvents() {
  bindCanvasEvents();
  bindAudioVoiceEvents();
  bindGameEvents();
  bindModalEvents();
  if (typeof indieFlow !== "undefined") {
    indieFlow.bindEvents();
    indieFlow.syncSetupDrawerFromSelects();
  }
}

window.addEventListener("beforeunload", function () { voice.stop(); });

window.onload = function () {
  loadUserPrefs();
  voice.refreshVoices();
  voice.probeLocalNeuralServer();
  if (typeof probeServerGeminiProxy === "function") probeServerGeminiProxy();
  syncPrefsToControls();
  if (typeof orchestrator !== "undefined" && typeof orchestrator.bindSensoryChoreography === "function") {
    orchestrator.bindSensoryChoreography();
  }
  initParticles();
  if (typeof stage3d !== "undefined") {
    stage3d.init();
    stage3d.applyBodyModeClass();
  }
  renderTutorialSlide();
  bindEvents();
  renderTimeline({ deferIfHidden: true });
  updateAllUI();
  resizeCanvas();
  startAnimationLoop();
  try {
    if (typeof window !== "undefined" && window.location && window.location.search && typeof startJudgeShowcaseMatch === "function") {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("demo") === "judge") {
        setTimeout(function () { startJudgeShowcaseMatch(); }, 280);
      }
    }
  } catch (e) {}
  if (typeof navigator !== "undefined" && navigator.serviceWorker && typeof navigator.serviceWorker.register === "function" && window.location && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }
};
