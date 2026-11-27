/**
 * 應用程式進入點：組合各模組事件綁定並初始化遊戲畫面
 */
"use strict";

const bootPreloader = {
  active: false,
  finished: false,
  maxPct: 6,
  readyCallbacks: [],
  skipTimer: null,
  hardTimer: null,
  _skipBound: false,
  buckets: {
    sky: { done: 0, total: 4, weight: 20 },
    portraits: { done: 0, total: 1, weight: 20 },
    hero: { done: 0, total: 1, weight: 15 },
    avatars: { done: 0, total: 1, weight: 45 }
  },

  isBrowserHttp: function () {
    if (typeof window === "undefined" || !window.location) return false;
    const proto = window.location.protocol;
    if (proto !== "http:" && proto !== "https:") return false;
    return typeof window.matchMedia === "function";
  },

  resetBuckets: function () {
    this.buckets = {
      sky: { done: 0, total: 4, weight: 20 },
      portraits: { done: 0, total: 1, weight: 20 },
      hero: { done: 0, total: 1, weight: 15 },
      avatars: { done: 0, total: 1, weight: 45 }
    };
    this.maxPct = 6;
  },

  start: function () {
    const self = this;
    this.finished = false;
    this.resetBuckets();
    if (this.skipTimer) { clearTimeout(this.skipTimer); this.skipTimer = null; }
    if (this.hardTimer) { clearTimeout(this.hardTimer); this.hardTimer = null; }
    const skipBtn = typeof el === "function" ? el("btnSkipBootPreload") : null;
    if (skipBtn && !this._skipBound && typeof skipBtn.addEventListener === "function") {
      this._skipBound = true;
      skipBtn.addEventListener("click", function () {
        self.dismiss("skip");
      });
    }
    if (skipBtn) skipBtn.classList.add("hidden");

    if (!this.isBrowserHttp()) {
      this.reportBucket("sky", 4, 4);
      this.reportBucket("portraits", 1, 1);
      this.reportBucket("hero", 1, 1);
      this.reportBucket("avatars", 1, 1);
      this.dismiss("headless");
      return;
    }

    this.active = true;
    const ov = typeof el === "function" ? el("bootPreloadOverlay") : null;
    if (ov) {
      ov.classList.remove("hidden");
      ov.classList.remove("is-fading");
    }
    this.render();
    this.skipTimer = setTimeout(function () {
      const sb = typeof el === "function" ? el("btnSkipBootPreload") : null;
      if (!self.finished && sb) sb.classList.remove("hidden");
    }, 4500);
    this.hardTimer = setTimeout(function () {
      self.dismiss("timeout");
    }, 14000);
  },

  render: function () {
    const b = this.buckets;
    let pctSum = 0;
    ["sky", "portraits", "hero", "avatars"].forEach(function (k) {
      const item = b[k];
      const frac = item.total > 0 ? Math.min(1, item.done / item.total) : 1;
      pctSum += frac * item.weight;
    });
    const pct = Math.min(100, Math.max(this.maxPct, Math.round(6 + pctSum * 0.94)));
    this.maxPct = pct;

    const fillEl = typeof el === "function" ? el("bootPreloadBarFill") : null;
    const pctEl = typeof el === "function" ? el("bootPreloadPct") : null;
    const stEl = typeof el === "function" ? el("bootPreloadStatus") : null;
    if (fillEl && fillEl.style) fillEl.style.width = pct + "%";
    if (pctEl) pctEl.textContent = pct + "%";
    if (stEl) {
      if (b.sky.done < b.sky.total) {
        stEl.textContent = "正在點亮書院天穹與古亭光影…";
      } else if (b.portraits.done < b.portraits.total) {
        stEl.textContent = "正在載入茶席夥伴立繪（" + b.portraits.done + "/" + b.portraits.total + "）…";
      } else if (b.hero.done < b.hero.total) {
        stEl.textContent = "正在喚醒清茗主茶師 3D 模型…";
      } else if (b.avatars.done < b.avatars.total) {
        stEl.textContent = "正在喚醒茶席夥伴 3D 模型（" + b.avatars.done + "/" + b.avatars.total + "）…";
      } else {
        stEl.textContent = "茶席已備妥，即將入席…";
      }
    }
  },

  reportBucket: function (name, done, total) {
    if (!this.buckets[name]) return;
    const normTotal = Math.max(1, total || 1);
    const normDone = Math.min(normTotal, Math.max(0, done || 0));
    this.buckets[name].total = normTotal;
    this.buckets[name].done = normDone;
    this.render();
    const allDone = ["sky", "portraits", "hero", "avatars"].every(function (k) {
      return this.buckets[k].done >= this.buckets[k].total;
    }, this);
    if (allDone && this.active && !this.finished) {
      const fillEl = typeof el === "function" ? el("bootPreloadBarFill") : null;
      const pctEl = typeof el === "function" ? el("bootPreloadPct") : null;
      if (fillEl && fillEl.style) fillEl.style.width = "100%";
      if (pctEl) pctEl.textContent = "100%";
      this.maxPct = 100;
      const self = this;
      setTimeout(function () { self.dismiss("complete"); }, 260);
    }
  },

  dismiss: function (reason) {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    if (this.skipTimer) { clearTimeout(this.skipTimer); this.skipTimer = null; }
    if (this.hardTimer) { clearTimeout(this.hardTimer); this.hardTimer = null; }
    const fillEl = typeof el === "function" ? el("bootPreloadBarFill") : null;
    const pctEl = typeof el === "function" ? el("bootPreloadPct") : null;
    const skipBtn = typeof el === "function" ? el("btnSkipBootPreload") : null;
    const ov = typeof el === "function" ? el("bootPreloadOverlay") : null;
    if (fillEl && fillEl.style) fillEl.style.width = "100%";
    if (pctEl) pctEl.textContent = "100%";
    if (skipBtn) skipBtn.classList.add("hidden");
    if (ov) {
      if (reason === "complete" && this.isBrowserHttp()) {
        ov.classList.add("is-fading");
        setTimeout(function () {
          ov.classList.add("hidden");
          ov.classList.remove("is-fading");
        }, 420);
      } else {
        ov.classList.add("hidden");
        ov.classList.remove("is-fading");
      }
    }
    const cbs = this.readyCallbacks.splice(0, this.readyCallbacks.length);
    cbs.forEach(function (cb) {
      try { if (typeof cb === "function") cb(); } catch (e) {}
    });
  },

  whenReady: function (cb) {
    if (typeof cb !== "function") return;
    if (this.finished) {
      cb();
      return;
    }
    this.readyCallbacks.push(cb);
  }
};
if (typeof window !== "undefined") window.bootPreloader = bootPreloader;

function initVercelAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined" || !window.location) return false;
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  const proto = String(window.location.protocol || "").toLowerCase();
  const host = String(window.location.hostname || "").toLowerCase();
  if (proto !== "https:" || !host || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".github.io")) {
    return false;
  }
  if (document.querySelector && document.querySelector('script[src="/_vercel/insights/script.js"]')) {
    return true;
  }
  try {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "/_vercel/insights/script.js";
    if (document.head && typeof document.head.appendChild === "function") {
      document.head.appendChild(s);
    } else if (document.body && typeof document.body.appendChild === "function") {
      document.body.appendChild(s);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function trackAnalyticsEvent(eventName, props) {
  if (typeof window === "undefined" || typeof window.va !== "function" || !eventName) return;
  try {
    const cleanProps = {};
    if (props && typeof props === "object") {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          cleanProps[k] = v;
        }
      });
    }
    window.va("event", { name: String(eventName).slice(0, 48), data: cleanProps });
  } catch (e) { }
}

function bindEvents() {
  bindCanvasEvents();
  bindAudioVoiceEvents();
  bindGameEvents();
  bindModalEvents();
  if (typeof indieFlow !== "undefined") {
    indieFlow.bindEvents();
    indieFlow.syncSetupDrawerFromSelects();
  }
  if (typeof initWerewolfJargonSystem === "function") {
    initWerewolfJargonSystem();
  }
}

window.addEventListener("beforeunload", function () { voice.stop(); });

window.onload = function () {
  initVercelAnalytics();
  loadUserPrefs();
  voice.refreshVoices();
  voice.probeLocalNeuralServer();
  if (typeof probeServerGeminiProxy === "function") probeServerGeminiProxy();
  syncPrefsToControls();
  if (typeof orchestrator !== "undefined" && typeof orchestrator.bindSensoryChoreography === "function") {
    orchestrator.bindSensoryChoreography();
  }
  initParticles();
  bootPreloader.start();
  let stageOk = false;
  if (typeof stage3d !== "undefined") {
    stageOk = Boolean(stage3d.init());
    stage3d.applyBodyModeClass();
  }
  if (!stageOk || (typeof stage3d !== "undefined" && (stage3d.isSoftwareRenderer || state.viewMode === "2d"))) {
    bootPreloader.reportBucket("sky", 4, 4);
    if (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.preloadPortraitImages === "function") {
      stage3dTextures.preloadPortraitImages();
    } else {
      bootPreloader.reportBucket("portraits", 1, 1);
    }
    bootPreloader.reportBucket("hero", 1, 1);
    bootPreloader.reportBucket("avatars", 1, 1);
  }
  renderTutorialSlide();
  bindEvents();
  renderTimeline({ deferIfHidden: true });
  updateAllUI();
  resizeCanvas(true);
  startAnimationLoop();
  try {
    if (typeof window !== "undefined" && window.location && window.location.search && typeof startJudgeShowcaseMatch === "function") {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("demo") === "judge") {
        bootPreloader.whenReady(function () {
          setTimeout(function () { startJudgeShowcaseMatch(); }, 280);
        });
      }
    }
  } catch (e) {}
  if (typeof navigator !== "undefined" && navigator.serviceWorker && typeof navigator.serviceWorker.register === "function" && window.location && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    const hadSwController = Boolean(navigator.serviceWorker.controller);
    if (hadSwController && typeof navigator.serviceWorker.addEventListener === "function") {
      let swReloading = false;
      const resolveDynamicSwVersion = function () {
        return new Promise(function (resolve) {
          const ctrl = navigator.serviceWorker.controller;
          const fallbackVer = (ctrl && ctrl.scriptURL ? ctrl.scriptURL : "sw") + ":" + Math.floor(Date.now() / 60000);
          if (!ctrl || typeof MessageChannel !== "function") {
            resolve(fallbackVer);
            return;
          }
          let settled = false;
          const done = function (v) {
            if (settled) return;
            settled = true;
            resolve(String(v || fallbackVer));
          };
          try {
            const mc = new MessageChannel();
            mc.port1.onmessage = function (ev) { done(ev && ev.data); };
            ctrl.postMessage("GET_SW_VERSION", [mc.port2]);
            setTimeout(function () { done(fallbackVer); }, 350);
          } catch (e) {
            done(fallbackVer);
          }
        });
      };
      const performGuardedSwReload = function () {
        if (swReloading) return;
        resolveDynamicSwVersion().then(function (swVer) {
          if (swReloading) return;
          const guardKey = "sanhao_sw_reloaded:" + swVer;
          try {
            if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(guardKey) === "1") return;
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem(guardKey, "1");
          } catch (e) {}
          swReloading = true;
          if (window.location && typeof window.location.reload === "function") window.location.reload();
        });
      };
      if (typeof window !== "undefined") {
        window._applyPendingSwUpdateReload = function () {
          if (typeof state !== "undefined") state._pendingSwUpdateReload = false;
          performGuardedSwReload();
        };
      }
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (swReloading) return;
        const inActiveMatch = Boolean(
          typeof state !== "undefined" &&
          state.match &&
          state.match.started &&
          state.match.phase !== "LOBBY" &&
          state.match.phase !== "GAME_OVER"
        );
        if (inActiveMatch) {
          state._pendingSwUpdateReload = true;
          if (typeof showToast === "function") {
            showToast("系統已於背景更新至最新版，本局結束返回大廳後將自動套用。", "emerald");
          }
          return;
        }
        performGuardedSwReload();
      });
    }
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      if (hadSwController && reg && typeof reg.update === "function") {
        reg.update().catch(function () {});
      }
    }).catch(function () {});
  }
};
