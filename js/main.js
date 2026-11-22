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
  renderTimeline();
  updateAllUI();
  resizeCanvas();
  startAnimationLoop();
};
