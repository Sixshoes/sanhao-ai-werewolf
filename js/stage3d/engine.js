/**
 * 3D 真實互動主引擎與多機位運鏡控制器（Three.js r128）
 * 支援：
 * - 真實 3D Raycaster 精準拾取角色與中央互動蓮花水晶
 * - 三種可切換機位：電影運鏡 / 坐桌第一人稱 / 俯視全景
 * - 空地 360° 自由旋轉＋滾輪縮放、真實 3D 空間拖曳光弧、ACES 電影級色調映射
 */
"use strict";

function dampFactor3D(k60, dt60) {
  const k = clamp(Number(k60) || 0, 0, 0.999);
  const s = clamp(Number(dt60) || 1, 0.05, 3.0);
  return 1 - Math.pow(1 - k, s);
}

const _camRivalAnchors = [];

const stage3d = {
  ready: false,
  failed: false,
  isIntegratedGpu: false,
  isSoftwareRenderer: false,
  isWindowsAngle: false,
  gpuRendererStr: "",
  gpuShortLabel: "",
  renderer: null,
  scene: null,
  camera: null,
  raycaster: null,
  tablePlane: null,
  env: null,
  seats: null,
  hero: null,
  fx: null,
  postfx: null,
  fpHandsGroup: null,
  closeUpSeatId: null,
  cameraPunch: { until: 0, seatId: null, fovTarget: 44 },
  customPavilionRoot: null,
  showcaseMode: false,
  showcaseTarget: "hero", // "hero" or seatId 1..8
  avatarManifest: {},
  avatarLoadingKeys: {},
  avatarQueuedKeys: {},
  avatarQueue: [],
  avatarActiveLoads: 0,
  avatarTotalQueued: 0,
  avatarDoneCount: 0,
  avatarPool: {},
  avatarPoolOrder: [],
  _vrmWarmupUntil: 0,
  _shadowBakedOnce: false,
  camPreset: "cinema", // "cinema" | "firstperson" | "overview"
  orbit: {
    dragging: false,
    lastX: 0,
    lastY: 0,
    userOverrideUntil: 0,
    yaw: 0,
    pitch: 0.52,
    radius: 11.2,
    targetYaw: 0,
    targetPitch: 0.52,
    targetRadius: 11.2,
    lookAt: null,
    targetLookAt: null,
    fpYaw: 0,
    fpTargetYaw: 0,
    fpPitch: -0.10,
    fpTargetPitch: -0.10,
    fpFovOffset: 0
  },

  getFirstPersonBaseFov: function () {
    const aspect = (this.camera && this.camera.aspect) ? this.camera.aspect : (16 / 9);
    if (aspect < 0.85) return 72;
    if (aspect < 1.25) return 64;
    return 58;
  },

  getFirstPersonSeatEye: function () {
    const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
    const selfAnchor = this.seats && this.seats.anchors ? this.seats.anchors[pidNow] : null;
    const nSeats = typeof getActive3DSeatCount === "function" ? getActive3DSeatCount() : 8;
    const layout = typeof get3DTableLayout === "function" ? get3DTableLayout(nSeats) : { ringRadius: 4.44 };
    const selfAngle = selfAnchor ? Math.atan2(selfAnchor.worldPos.x, selfAnchor.worldPos.z) : 0;
    const selfR = selfAnchor ? Math.max(layout.ringRadius, Math.hypot(selfAnchor.worldPos.x, selfAnchor.worldPos.z)) : layout.ringRadius;
    // Tuck cleanly at seated eye-level ahead of neighbor hands so bottom corners stay pristine & opposite faces clear the lotus!
    const backOffset = nSeats >= 12 ? 0.68 : (nSeats >= 10 ? 0.56 : (nSeats >= 8 ? 0.42 : 0.36));
    const eyeR = selfR + backOffset;
    const eyeY = nSeats >= 12 ? 2.62 : (nSeats >= 10 ? 2.56 : 2.50);
    return {
      pid: pidNow,
      angle: selfAngle,
      baseYaw: -selfAngle,
      x: Math.sin(selfAngle) * eyeR,
      y: eyeY,
      z: Math.cos(selfAngle) * eyeR
    };
  },

  computeFirstPersonAnglesToPoint: function (targetPos, eye) {
    const dx = targetPos.x - eye.x;
    const dy = targetPos.y - eye.y;
    const dz = targetPos.z - eye.z;
    const horiz = Math.max(0.25, Math.hypot(dx, dz));
    const targetAbsYaw = Math.atan2(dx, -dz);
    const relYaw = Math.atan2(Math.sin(targetAbsYaw - eye.baseYaw), Math.cos(targetAbsYaw - eye.baseYaw));
    const pitch = Math.atan2(dy, horiz);
    return {
      yaw: clamp(relYaw, -1.44, 1.44),
      pitch: clamp(pitch, -0.38, 0.18)
    };
  },

  glanceAtSeatInFirstPerson: function (seatId) {
    if (!this.isActive() || this.camPreset !== "firstperson" || !this.seats || !this.seats.anchors || !this.seats.anchors[seatId]) return false;
    const eye = this.getFirstPersonSeatEye();
    if (seatId === eye.pid) {
      this.orbit.fpTargetYaw = 0;
      this.orbit.fpTargetPitch = -0.10;
      this.orbit.fpFovOffset = 0;
      this.orbit.userOverrideUntil = 0;
      return true;
    }
    const tgt = this.seats.anchors[seatId].headPos || this.seats.anchors[seatId].worldPos;
    const ang = this.computeFirstPersonAnglesToPoint(tgt, eye);
    this.orbit.fpTargetYaw = ang.yaw;
    this.orbit.fpTargetPitch = ang.pitch;
    this.orbit.userOverrideUntil = performance.now() + 6500;
    return true;
  },

  isAvailable: function () {
    return typeof THREE !== "undefined" && !this.failed;
  },

  isActive: function () {
    return state.viewMode === "3d" && this.ready && !this.failed;
  },

  detectGpuProfile: function (renderer, overrideInfo) {
    let info = typeof overrideInfo === "string" ? overrideInfo : "";
    if (!info) {
      try {
        const gl = renderer && typeof renderer.getContext === "function" ? renderer.getContext() : null;
        if (gl && typeof gl.getExtension === "function") {
          const dbg = gl.getExtension("WEBGL_debug_renderer_info");
          if (dbg) info = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        }
      } catch (e) { }
    }
    const isSoftware = /swiftshader|subzero|llvmpipe|softpipe|software|microsoft basic render|\bwarp\b/i.test(info);
    const isIntegrated = isSoftware || /intel.*(uhd|hd graphics|iris)|\bintel\(?r?\)?\s*(?:arc\(?tm\)?\s*)?graphics\b|radeon\(tm\)\s*graphics|amd radeon(?:\(tm\))?\s*(?:\d{3}m\s*)?graphics|vega \d/i.test(info);
    const isWinUa = typeof navigator !== "undefined" && /windows/i.test(String(navigator.userAgent || ""));
    const isWindowsAngle = /angle\s*\(.*direct3d/i.test(info) || (isWinUa && !/apple/i.test(info));
    let shortLabel = isSoftware ? "CPU 軟體渲染（請開硬體加速）" : (isIntegrated ? "內顯最佳化" : "獨立/標準顯卡");
    if (!isSoftware && info) {
      const mGpu = info.match(/(RTX\s*\d{3,4}(?:\s*(?:Ti|SUPER))?|GTX\s*\d{3,4}(?:\s*(?:Ti|SUPER))?|RX\s*\d{3,4}(?:\s*XTX?)?|Arc\s*[A-Z]\d{3}|Apple\s*M\d(?:\s*(?:Pro|Max|Ultra))?|Apple\s*GPU|Intel\(?R?\)?\s*(?:UHD|HD|Iris)\s*[A-Za-z0-9 ]{0,12})/i);
      if (mGpu && mGpu[1]) shortLabel = mGpu[1].replace(/\s+/g, " ").trim();
    }
    return {
      rendererStr: info,
      shortLabel: shortLabel,
      isSoftwareRenderer: isSoftware,
      isIntegratedGpu: isIntegrated,
      isWindowsAngle: isWindowsAngle
    };
  },

  detectIntegratedGpu: function (renderer) {
    return this.detectGpuProfile(renderer).isIntegratedGpu;
  },

  getCleanGpuName: function () {
    const raw = String(this.gpuRendererStr || "").trim();
    if (!raw) return this.gpuShortLabel || (this.isIntegratedGpu ? "內顯最佳化" : "獨立/標準顯卡");
    const mAngle = raw.match(/ANGLE\s*\([^,]+,\s*([^,(]+?)(?:\s*\(0x[0-9a-f]+\))?(?:\s+Direct3D|\s+OpenGL|\s+Vulkan|,|\))/i);
    if (mAngle && mAngle[1]) return mAngle[1].replace(/\s+/g, " ").trim();
    return this.gpuShortLabel || raw.replace(/\s+/g, " ").trim().slice(0, 48);
  },

  shouldWarnDesktopIntegratedGpu: function (screenW, isMobileUa) {
    const sw = typeof screenW === "number"
      ? screenW
      : (typeof window !== "undefined" && window.screen
        ? Math.max(window.screen.width || 0, window.innerWidth || 0)
        : 0);
    const mobile = typeof isMobileUa === "boolean"
      ? isMobileUa
      : (typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(String(navigator.userAgent || "")));
    if (mobile || sw < 1920) return false;
    if (this.isSoftwareRenderer) return true;
    const raw = String(this.gpuRendererStr || "");
    return Boolean(this.isIntegratedGpu || /intel.*(uhd|hd graphics|iris)|\bintel\(?r?\)?\s*(?:arc\(?tm\)?\s*)?graphics\b|radeon\(tm\)\s*graphics|amd radeon(?:\(tm\))?\s*(?:\d{3}m\s*)?graphics|vega \d/i.test(raw));
  },

  getShadowUpdateStride: function () {
    if (this.isSoftwareRenderer) return 4;
    const q = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    if (this.isIntegratedGpu || q === "eco") return 3;
    if (q === "balanced") return 2;
    return 1;
  },

  updateGpuStatusUi: function () {
    const q = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const baseLbl = q === "eco" ? "省電流暢" : (q === "balanced" ? "均衡畫質" : "極致畫質");
    const fpsTag = (this._perfEmaMs && this._perfEmaMs > 1)
      ? (" · " + Math.min(240, Math.round(1000 / this._perfEmaMs)) + " FPS")
      : "";
    const gpuName = this.getCleanGpuName();
    const perfStr = gpuName + "｜" + baseLbl + fpsTag;
    const qBtn = el("btnToggle3DQuality");
    if (qBtn) {
      qBtn.textContent = baseLbl;
      qBtn.title = perfStr;
    }
    const perfLine = el("gpuPerfStatusLine");
    if (perfLine) {
      perfLine.textContent = "3D 狀態：" + perfStr;
    }
    const hintEl = el("gpuDualCardHint");
    if (hintEl) {
      const warnDesktop = this.shouldWarnDesktopIntegratedGpu();
      hintEl.classList.toggle("hidden", !warnDesktop);
      if (warnDesktop) {
        hintEl.textContent = this.isSoftwareRenderer
          ? "偵測到瀏覽器目前以 CPU 軟體渲染 3D，已自動切為 2D 流暢圓桌（切 3D 時將採輕量內建人偶）。請於網址列輸入 chrome://settings/system 開啟「使用圖形加速」並重啟瀏覽器，即可啟用獨顯與全套 3D VRM。"
          : ("偵測到桌機高解析度畫面正由內顯（" + gpuName + "）執行。若本機配有多顯卡（如 RTX 獨顯），請至 Windows「設定 → 系統 → 顯示器 → 圖形」將瀏覽器指定為「高效能」後重開分頁，即可發揮高更新率原生滿幀。");
      }
    }
  },

  getStageViewportCssArea: function () {
    if (typeof document !== "undefined") {
      const container = el("canvasStageWrap") || el("canvasContainer");
      if (container && typeof container.getBoundingClientRect === "function") {
        const rect = container.getBoundingClientRect();
        if (rect && rect.width >= 200 && rect.height >= 150) {
          return rect.width * rect.height;
        }
      }
    }
    if (typeof window !== "undefined" && window.innerWidth >= 200 && window.innerHeight >= 150) {
      return window.innerWidth * window.innerHeight;
    }
    return 1280 * 720;
  },

  getTargetDpr: function (quality) {
    const q = quality === "eco" ? "eco" : (quality === "balanced" ? "balanced" : "high");
    const cap = this.isSoftwareRenderer
      ? 0.85
      : (this.isIntegratedGpu
        ? (q === "eco" ? 0.85 : (q === "balanced" ? 0.95 : 1.2))
        : (q === "eco" ? 1.0 : (q === "balanced" ? 1.25 : 1.5)));
    // Pixel-budget guard: prevents 1440p@150% / 4K monitors from allocating 3840x2160+ HalfFloat FBOs (>150MB VRAM + IPC stall)
    const maxPixels = this.isSoftwareRenderer
      ? 920000
      : (this.isIntegratedGpu
        ? (q === "eco" ? 960000 : (q === "balanced" ? 1450000 : 2050000))
        : (q === "eco" ? 1250000 : (q === "balanced" ? 1950000 : 2800000)));
    const budgetDpr = Math.sqrt(maxPixels / Math.max(1, this.getStageViewportCssArea()));
    const ecoScale = (q === "eco" && this._ecoDprScale && this._ecoDprScale < 1) ? this._ecoDprScale : 1;
    return Math.max(0.65, Math.min(window.devicePixelRatio || 1, cap, budgetDpr) * ecoScale);
  },

  getOverlayDpr: function () {
    const q = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const cap = this.isSoftwareRenderer ? 1.0 : ((this.isIntegratedGpu || q === "eco") ? 1.25 : 1.5);
    const maxOverlayPixels = this.isSoftwareRenderer ? 1200000 : ((this.isIntegratedGpu || q === "eco") ? 1650000 : 2400000);
    const budgetDpr = Math.sqrt(maxOverlayPixels / Math.max(1, this.getStageViewportCssArea()));
    return Math.max(0.75, Math.min((typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1, cap, budgetDpr));
  },

  init: function () {
    if (this.ready || this.failed) return this.ready;
    const canvas3d = el("sanctuary3DCanvas");
    if (!canvas3d || typeof THREE === "undefined") {
      this.failed = true;
      this.applyBodyModeClass();
      return false;
    }
    try {
      // Skip redundant 4K default-framebuffer MSAA whenever PostFX offscreen RenderTarget + FXAA pipeline is loaded
      const useMainAa = typeof build3DPostFx !== "function";
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas3d,
        antialias: useMainAa,
        alpha: false,
        powerPreference: "high-performance"
      });
      const gpuProf = this.detectGpuProfile(renderer);
      this.gpuRendererStr = gpuProf.rendererStr;
      this.gpuShortLabel = gpuProf.shortLabel;
      this.isSoftwareRenderer = gpuProf.isSoftwareRenderer;
      this.isWindowsAngle = gpuProf.isWindowsAngle;
      this.isIntegratedGpu = gpuProf.isIntegratedGpu;
      if (this.isSoftwareRenderer) {
        if (!this._manualQualityLock && !state.qualityUserChosen) {
          state.quality3D = "eco";
        }
        // Auto-switch to lightweight 2D illustrated tea-table when browser Hardware Acceleration is OFF (SwiftShader CPU)
        // without overwriting saved user prefs, so turning Hardware Acceleration back ON restores full 3D VRM automatically!
        if (!this._softwareModeAutoSwitched) {
          this._softwareModeAutoSwitched = true;
          state.viewMode = "2d";
          setTimeout(function () {
            if (typeof showToast === "function") {
              showToast("偵測到瀏覽器未開啟「圖形加速」（目前為 CPU 軟體渲染），已自動切為 2D 流暢圓桌避免吃爆記憶體；請至 chrome://settings/system 開啟「使用圖形加速」並重啟即可恢復 3D 顯卡流暢度。", "warn");
            }
          }, 1600);
        }
      } else if (this.isIntegratedGpu && !this._manualQualityLock && !state.qualityUserChosen && state.quality3D === "high") {
        state.quality3D = "balanced";
      }
      if (!this.isSoftwareRenderer && !this._dualGpuWarned && this.shouldWarnDesktopIntegratedGpu()) {
        this._dualGpuWarned = true;
        const cleanGpuMsg = this.getCleanGpuName();
        setTimeout(function () {
          if (typeof showToast === "function") {
            showToast("偵測到目前由內顯（" + cleanGpuMsg + "）執行 3D；若本機配有獨立顯卡，可至 Windows「圖形設定」將瀏覽器設為高效能以解放流暢度。", "warn");
          }
        }, 2200);
      }
      renderer.setPixelRatio(this.getTargetDpr(state.quality3D));
      renderer.shadowMap.enabled = !this.isSoftwareRenderer;
      renderer.shadowMap.type = (this.isIntegratedGpu || this.isWindowsAngle) && THREE.PCFShadowMap !== undefined
        ? THREE.PCFShadowMap
        : THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.2, 130);

      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;
      this.raycaster = new THREE.Raycaster();
      this.tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.12);
      this.orbit.lookAt = new THREE.Vector3(0, 1.35, 0);
      this.orbit.targetLookAt = new THREE.Vector3(0, 1.35, 0);

      if (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.preloadPortraitImages === "function") {
        stage3dTextures.preloadPortraitImages();
      }
      this.env = build3DEnvironment(scene, renderer);
      this.seats = build3DSeatPool(scene);
      this.hero = typeof buildHeroCharacter === "function" ? buildHeroCharacter(scene) : null;
      this.fx = build3DEffects(scene);
      this.postfx = typeof build3DPostFx === "function"
        ? build3DPostFx(renderer, scene, camera, {
          preferLightweight: this.isIntegratedGpu,
          isWindowsAngle: this.isWindowsAngle,
          isSoftwareRenderer: this.isSoftwareRenderer
        })
        : null;
      // Pre-align renderer.toneMapping BEFORE the first draw call and KEEP it locked across quality changes (prevents 6-second full-scene shader recompile stalls!)
      const willUsePostFxInit = Boolean(this.postfx && !this.isSoftwareRenderer);
      if (willUsePostFxInit && THREE.NoToneMapping !== undefined) {
        renderer.toneMapping = THREE.NoToneMapping;
      } else if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.02;
      }
      this._vrmWarmupUntil = (typeof performance !== "undefined" ? performance.now() : Date.now()) + 3500;
      this._shadowBakedOnce = false;
      this.fpHandsGroup = this.buildFirstPersonHands(scene);
      if (!this._ctxLostBound && typeof canvas3d.addEventListener === "function") {
        this._ctxLostBound = true;
        const self3d = this;
        canvas3d.addEventListener("webglcontextlost", function () {
          self3d.failed = true;
          self3d.ready = false;
          if (self3d.showcaseMode) self3d.setShowcaseMode(false);
          self3d.avatarQueue = [];
          self3d.avatarQueuedKeys = {};
          self3d.avatarLoadingKeys = {};
          self3d.avatarActiveLoads = 0;
          self3d.avatarTotalQueued = 0;
          self3d.avatarDoneCount = 0;
          self3d.updateVrmLoadIndicator();
          state.viewMode = "2d";
          self3d.applyBodyModeClass();
          if (typeof updateAllUI === "function") updateAllUI();
          if (typeof showToast === "function") {
            showToast("偵測到瀏覽器回收 3D 顯存，已自動無縫切換至 2D 茶席模式繼續對局。", "warn");
          }
        });
      }
      this.ready = true;
      if (!this.isSoftwareRenderer) {
        this.checkAutoHeroGlb();
      }

      this.applyQualityMode();
      this.applyBodyModeClass();
      this.resize();
      return true;
    } catch (err) {
      this.failed = true;
      state.viewMode = "2d";
      this.applyBodyModeClass();
      return false;
    }
  },

  buildFirstPersonHands: function (scene) {
    // Player seat already renders an authentic celadon teacup, brass candle, lacquer nameplate & flippable 3D ID card on the table rim!
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    return g;
  },

  applyQualityMode: function () {
    if (!this.ready || !this.renderer) return;
    const q = state.quality3D === "eco" ? "eco" : (state.quality3D === "balanced" ? "balanced" : "high");
    const isEco = q === "eco";
    const isBal = q === "balanced";
    const dpr = this.getTargetDpr(q);
    this.renderer.setPixelRatio(dpr);
    // Keep shadowMap.enabled & dirLight.castShadow stable on hardware GPUs so quality switches NEVER trigger 100+ shader recompilations!
    // In eco mode, we simply stop re-rendering the shadow map each frame (0.00ms/frame with zero shader rebuild).
    this.renderer.shadowMap.enabled = !this.isSoftwareRenderer;
    this.renderer.shadowMap.autoUpdate = false;
    if (this.renderer.shadowMap.enabled && (!isEco || !this._shadowBakedOnce)) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.env && this.env.dirLight) this.env.dirLight.castShadow = !this.isSoftwareRenderer;
    if (this.env && this.env.fireflyPoints) this.env.fireflyPoints.visible = q === "high";
    if (this.env && this.env.celestialWisps) this.env.celestialWisps.visible = !isEco;
    if (this.env && this.env.teaSteamPoints) this.env.teaSteamPoints.visible = !isEco;
    if (this.env && this.env.petalGroup) this.env.petalGroup.visible = q === "high";
    if (this.env && this.env.godRaysGroup) this.env.godRaysGroup.visible = !isEco;
    if (typeof this.syncSceneThemeUi === "function") this.syncSceneThemeUi();
    // Reset cached DPR and delegate to resize() so renderer.setSize(), camera.aspect & postfx ALWAYS stay 100% in sync!
    this._lastResizeDpr = 0;
    this.resize();
    if (typeof invalidate3DOverlayCache === "function") invalidate3DOverlayCache();
    this.updateGpuStatusUi();
  },

  toggleQualityMode: function () {
    this._manualQualityLock = true;
    this._ecoDprScale = 1;
    state.qualityUserChosen = true;
    const order = ["high", "balanced", "eco"];
    const nextIdx = (order.indexOf(state.quality3D) + 1) % order.length;
    state.quality3D = order[nextIdx];
    this.applyQualityMode();
    saveUserPrefs();
    const toastMap = {
      high: "已切換為 3D「極致畫質」（MSAA抗鋸齒＋HDR光影＋全粒子）",
      balanced: "已切換為 3D「均衡畫質」（保留陰影與HDR光暈，更順暢）",
      eco: "已切換為 3D「省電流暢」模式"
    };
    showToast(toastMap[state.quality3D] || toastMap.high, "emerald");
  },

  syncSceneThemeUi: function () {
    const isCel = state.sceneTheme === "celestial";
    const hudLbl = el("hudSceneLabel");
    if (hudLbl) hudLbl.textContent = isCel ? "仙境" : "書院";
    const hudBtn = el("btnToggleSceneThemeHud");
    if (hudBtn) {
      hudBtn.classList.toggle("is-active", isCel);
      hudBtn.title = isCel
        ? "目前造景：空靈青綠山水仙境（點擊切換至青嵐雅致書院）"
        : "目前造景：青嵐雅致書院（點擊切換至空靈青綠山水仙境）";
    }
    const titleLbl = el("titleSceneThemeLabel");
    if (titleLbl) titleLbl.textContent = isCel ? "絕雲仙境" : "青嵐書院";
    const titleBtn = el("btnTitleSceneTheme");
    if (titleBtn) {
      titleBtn.classList.toggle("is-celestial", isCel);
      titleBtn.title = isCel
        ? "目前造景：空靈青綠山水仙境（點擊切換回青嵐書院）"
        : "目前造景：青嵐雅致書院（點擊切換為空靈青綠仙境）";
    }
    const pauseBtn = el("btnToggleSceneThemePause");
    if (pauseBtn) {
      pauseBtn.textContent = isCel ? "造景:絕雲仙境" : "造景:青嵐書院";
      pauseBtn.classList.toggle("is-accent", isCel);
    }
  },

  setSceneTheme: function (themeKey, opts) {
    const next = themeKey === "celestial" ? "celestial" : "academy";
    state.sceneTheme = next;
    if (this.scene && this.env && typeof apply3DSceneTheme === "function") {
      apply3DSceneTheme(this.scene, this.env, next);
    }
    this.syncSceneThemeUi();
    saveUserPrefs();
    if (!opts || !opts.silent) {
      if (typeof sound !== "undefined" && typeof sound.tone === "function") {
        sound.tone(next === "celestial" ? 659.25 : 523.25, 0.14, "sine", 0.06, 0);
        sound.tone(next === "celestial" ? 880 : 659.25, 0.20, "triangle", 0.05, 0.07);
      }
      if (typeof showToast === "function") {
        showToast(
          next === "celestial"
            ? "已切換 3D 造景：空靈青綠山水仙境（浮空翠峰＋靈氣雲嵐）"
            : "已切換 3D 造景：青嵐雅致書院（翠竹林＋暖黃桂花與山櫻）",
          "emerald"
        );
      }
    }
  },

  toggleSceneTheme: function () {
    this.setSceneTheme(state.sceneTheme === "celestial" ? "academy" : "celestial");
  },

  raycastIdCard: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.seats || !this.seats.idCardHitMesh) return false;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.seats.idCardHitMesh, false).length > 0;
  },

  toggleIdCardPeek: function () {
    if (!state.match.started) return;
    state.cardPeek3D = !state.cardPeek3D;
    sound.tone(state.cardPeek3D ? 698 : 523, 0.14, "triangle", 0.08, 0);
    if (state.cardPeek3D && this.seats && this.seats.anchors[getPlayerId()]) {
      spawn3DShockwave(this.fx, this.seats.anchors[getPlayerId()].worldPos, "#fbbf24", performance.now(), 1.28, 2.2);
    }
    const p = getPlayerSeat();
    const pRoleDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(p) : null) || (p && ROLE_DEFS[p.role]);
    const rName = (pRoleDef && !state.hidePlayerRole) ? pRoleDef.name : "已遮蔽";
    showToast(state.cardPeek3D ? ("翻開 3D 底牌：你的身分是「" + rName + "」") : "已蓋回 3D 底牌", "emerald");
  },

  cycleCameraPreset: function () {
    this.closeUpSeatId = null;
    const order = ["cinema", "firstperson", "overview"];
    const next = order[(order.indexOf(this.camPreset) + 1) % order.length];
    this.setCameraPreset(next);
  },

  computeSeatFrontFraming: function (seatId, style) {
    if (!this.seats || !this.seats.anchors || !this.seats.anchors[seatId]) return null;
    const anchor = this.seats.anchors[seatId];
    const wp = anchor.worldPos;
    const hp = anchor.headPos;
    if (!wp) return null;
    const frontYaw = Math.atan2(-wp.x, -wp.z);
    const seatDist = Math.hypot(wp.x, wp.z) || 4.44;
    const isInspect = style === "inspect";
    const isDramatic = style === "dramatic";
    // Position camera cleanly IN FRONT OF & SLIGHTLY ABOVE tabletop props (clearing lotus, teacup & candle across 6/8/10/12-seat tables!)
    const isMobileSplit = typeof window !== "undefined" && window.innerWidth <= 767;
    const maxSafeR = Math.max(2.75, seatDist - 0.96);
    const desiredR = isMobileSplit
      ? (isInspect ? 3.56 : (isDramatic ? 3.62 : 3.74))
      : (isInspect ? 3.26 : (isDramatic ? 3.30 : 3.52));
    const radius = Math.min(desiredR, maxSafeR);
    const pitch = isMobileSplit
      ? (isInspect ? 0.14 : (isDramatic ? 0.15 : 0.16))
      : (isInspect ? 0.19 : (isDramatic ? 0.20 : 0.22));
    // Subtle ±6°..±7.5° three-quarter offset gives rich 3D facial depth without foreground prop intrusion
    const angleOffset = (seatId % 2 === 0 ? 1 : -1) * (isInspect ? 0.10 : 0.12);
    // Desktop: aim lookAt lower so head sits in upper open viewport above overlapping #controlDeck.
    // Mobile split-canvas (<= 767px): #controlDeck sits BELOW #canvasStageWrap while 2-row #inGameTopHud covers the top ~32%,
    // so raise lookY so the speaker's head drops cleanly below #inGameTopHud with room for the nameplate above the forehead!
    const headY = (hp && typeof hp.y === "number" && hp.y > 1.2) ? hp.y : 2.10;
    const lookY = isMobileSplit
      ? clamp(isInspect ? (headY - 0.18) : (headY - 0.24), 1.68, 1.98)
      : clamp(isInspect ? (headY - 0.80) : (headY - 0.92), 1.08, 1.46);
    const fov = isMobileSplit
      ? (isInspect ? 43 : 44)
      : (isInspect ? 39 : (isDramatic ? 38 : 40));
    return {
      yaw: frontYaw + angleOffset,
      pitch: pitch,
      radius: radius,
      lookX: wp.x,
      lookY: lookY,
      lookZ: wp.z,
      fov: fov
    };
  },

  jumpToSeatFront: function (seatId, opts) {
    if (!this.isActive() || !this.seats || !this.seats.anchors || !this.seats.anchors[seatId]) return false;
    if (this.showcaseMode) return false;
    if (this.camPreset === "firstperson") {
      return this.glanceAtSeatInFirstPerson(seatId);
    }
    this.closeUpSeatId = seatId;
    this.orbit.userOverrideUntil = 0;
    if (opts && opts.toast) {
      const s = getSeat(seatId) || (this.seats.anchors[seatId] && this.seats.anchors[seatId].seat);
      showToast("鏡頭切換至 " + fmtSeatNum(seatId) + "號 " + (s ? s.name : "") + " 面前（點空白處或換人復位）", "emerald");
    }
    return true;
  },

  focusSeatCloseUp: function (seatId) {
    if (!this.isActive() || !this.seats || !this.seats.anchors[seatId]) return;
    if (this.camPreset === "firstperson") {
      this.glanceAtSeatInFirstPerson(seatId);
      return;
    }
    if (this.closeUpSeatId === seatId) {
      this.closeUpSeatId = null;
      this.orbit.userOverrideUntil = 0;
      showToast("已退回圓桌自動運鏡", "emerald");
      return;
    }
    this.closeUpSeatId = seatId;
    this.orbit.userOverrideUntil = 0;
    const s = getSeat(seatId) || (this.seats.anchors[seatId] && this.seats.anchors[seatId].seat);
    showToast("正面特寫檢視 " + fmtSeatNum(seatId) + "號 " + (s ? s.name : "") + "（點空白處退回）", "emerald");
  },

  clearCloseUp: function () {
    this.closeUpSeatId = null;
    if (this.cameraPunch) {
      this.cameraPunch.pending = false;
      this.cameraPunch.until = 0;
    }
  },

  triggerCameraPunch: function (seatId, opts) {
    const cfg = opts || {};
    const fov = typeof cfg.fov === "number" ? clamp(cfg.fov, 32, 54) : 39;
    const ms = typeof cfg.durationMs === "number" ? clamp(cfg.durationMs, 350, 2600) : 1250;
    const nowWall = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.cameraPunch.seatId = seatId || null;
    this.cameraPunch.fovTarget = fov;
    this.cameraPunch.durationMs = ms;
    this.cameraPunch.pending = true;
    this.cameraPunch.until = nowWall + ms;
    this.orbit.userOverrideUntil = 0;
  },

  raycastCandle: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.seats || !this.seats.candleHitMeshes) return null;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.seats.candleHitMeshes, false);
    if (hits.length > 0 && hits[0].object && hits[0].object.userData && hits[0].object.userData.candleSeatId) {
      return hits[0].object.userData.candleSeatId;
    }
    return null;
  },

  pokeCandle: function (seatId) {
    if (!this.isActive() || !this.seats || !this.seats.slots[seatId]) return;
    const actor = this.seats.slots[seatId];
    actor.candleSparkBoost = 1.0;
    sound.tone(740 + seatId * 24, 0.14, "sine", 0.06, 0);
    setSeatEmotion(seatId, "happy", 2200);
    nudgeSeat(seatId, { scale: 1.08, vy: -4 });
    if (this.seats.anchors[seatId]) {
      spawn3DShockwave(this.fx, this.seats.anchors[seatId].worldPos, "#fde047", performance.now(), 1.32, 1.8);
    }
    showToast("撥亮了 " + fmtSeatNum(seatId) + "號 桌前的燭火！", "emerald");
  },

  extinguishSeatCandleFx: function (seatId) {
    if (!this.isActive() || !this.seats || !this.fx || !this.seats.anchors[seatId]) return;
    const anchor = this.seats.anchors[seatId];
    const actor = this.seats.slots ? this.seats.slots[seatId] : null;
    const nowMs = performance.now();
    let smokeOrigin = anchor.worldPos;
    if (actor && actor.candleGroup) {
      actor.candleGroup.getWorldPosition(actor.candleWorldPos);
      smokeOrigin = actor.candleWorldPos;
      actor.extinguishedAt = nowMs;
    }
    if (typeof spawn3DCandleSmoke === "function") {
      spawn3DCandleSmoke(this.fx, smokeOrigin, nowMs, { isExtinguish: true });
      spawn3DCandleSmoke(this.fx, smokeOrigin, nowMs + 85, { isExtinguish: true });
    }
    spawn3DShockwave(this.fx, smokeOrigin, "#94a3b8", nowMs, Math.max(0.28, smokeOrigin.y - 0.06), 2.4);
  },

  triggerHeroBeat: function (actionName, durationMs) {
    if (!this.isActive() || !this.hero || typeof triggerHeroAction !== "function") return;
    triggerHeroAction(this.hero, actionName || "speak_gesture", durationMs || 2200);
  },

  triggerSkillFx: function (kind, fromSeatId, toSeatId, isDanger) {
    if (!this.isActive() || !this.fx || !this.seats) return;
    const toAnchor = this.seats.anchors[toSeatId];
    const nowMs = performance.now();
    if (kind === "guard_shield" && toAnchor) {
      trigger3DSkillAura(this.fx, toAnchor.worldPos, "#fbbf24", "guard_shield", nowMs);
    } else if (kind === "seer_scan" && toAnchor) {
      trigger3DSkillAura(this.fx, toAnchor.worldPos, isDanger ? "#f43f5e" : "#a78bfa", "seer_scan", nowMs);
    } else if (kind === "witch_heal" && toAnchor) {
      trigger3DSkillAura(this.fx, toAnchor.worldPos, "#34d399", "witch_heal", nowMs);
    } else if (kind === "witch_poison" && toAnchor) {
      trigger3DSkillAura(this.fx, toAnchor.worldPos, "#c084fc", "witch_poison", nowMs);
    } else if (kind === "hunter_shot" && toAnchor) {
      const fromAnchor = this.seats.anchors[fromSeatId];
      if (fromAnchor) {
        spawn3DShockwave(this.fx, fromAnchor.worldPos, "#fbbf24", nowMs, 0.16, 4.4);
      }
      trigger3DSkillAura(this.fx, toAnchor.worldPos, "#f43f5e", "hunter_shot", nowMs);
      if (typeof triggerShake === "function") triggerShake(480);
      if (this.camPreset !== "firstperson") {
        this.orbit.userOverrideUntil = 0;
        this.orbit.targetYaw = Math.atan2(-toAnchor.worldPos.x, -toAnchor.worldPos.z);
        this.orbit.targetPitch = 0.32;
        this.orbit.targetRadius = 7.2;
        this.orbit.targetLookAt.set(toAnchor.worldPos.x * 0.55, 1.65, toAnchor.worldPos.z * 0.55);
      }
    } else if (kind === "three_good_resonance") {
      if (this.env) this.env.lotusSpinBoost = 1.3;
      const center = new THREE.Vector3(0, 0, 0);
      spawn3DShockwave(this.fx, center, "#fbbf24", nowMs, 1.28, 8.2);
      setTimeout(function () {
        if (stage3d.fx) spawn3DShockwave(stage3d.fx, center, "#34d399", performance.now(), 1.32, 7.0);
      }, 220);
    }
  },

  getNdcFromClient: function (clientX, clientY) {
    const canvas = el("sanctuaryCanvas");
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      y: -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
    };
  },

  raycastSeat: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.seats) return null;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.seats.hitMeshes, false);
    if (hits.length > 0 && hits[0].object && hits[0].object.userData && hits[0].object.userData.seatId) {
      const sid = hits[0].object.userData.seatId;
      return state.seatCoords.find(function (c) { return c.id === sid; }) || null;
    }
    return null;
  },

  raycastCenterCrystal: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.env || !this.env.lotusHitMesh) return false;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.env.lotusHitMesh, false).length > 0;
  },

  raycastCloudIsle: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.env || !this.env.cloudIsleHitMesh) return false;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.env.cloudIsleHitMesh, false).length > 0;
  },

  interactWithCloudIsle: function () {
    if (!this.isActive()) return;
    sound.playBlessing();
    showToast("遠眺書院外的層疊雲海與遠山小島：在山城茶席品茗推理，心曠神怡。", "emerald");
  },

  raycastHeroHost: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.hero || !this.hero.hitMesh) return false;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.hero.hitMesh, false).length > 0;
  },

  interactWithHeroHost: function () {
    if (!this.isActive() || !this.hero) return;
    if (typeof triggerHeroAction === "function") triggerHeroAction(this.hero, "purify_cast", 3200);
    if (this.fx) spawn3DShockwave(this.fx, this.hero.root.position.clone(), "#d4a657", performance.now(), 1.3, 4.5);
    sound.playBlessing();
    showToast("茶席引路人「清茗」向你微笑奉茶：願本局存好心、說好話、做好事！", "emerald");
  },

  setShowcaseMode: function (enabled) {
    const wantOn = Boolean(enabled);
    if (wantOn && !this.isAvailable()) {
      if (typeof showToast === "function") showToast("目前裝置不支援 3D 角色鑑賞模式", "warn");
      return;
    }
    this.showcaseMode = wantOn;
    document.body.classList.toggle("hero-showcase-active", this.showcaseMode);
    const panel = el("heroShowcaseOverlay");
    if (panel) panel.classList.toggle("hidden", !this.showcaseMode);
    if (this.showcaseMode) {
      if (typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
      if (state.viewMode !== "3d") this.setViewMode("3d");
      this.closeUpSeatId = null;
      this.camPreset = "cinema";
      if (this.camera && typeof this.camera.fov === "number") {
        this.camera.fov = 44;
        this.camera.updateProjectionMatrix();
      }
      this.setShowcaseTarget(this.showcaseTarget || "hero");
      if (this.hero && typeof triggerHeroAction === "function") triggerHeroAction(this.hero, "welcome_bow", 0);
      if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
        indieFlow.syncShowcaseTargetUi();
      }
      sound.playBlessing();
    } else {
      this.showcaseTarget = "hero";
      this.resetCamera();
    }
    this.resize();
    if (typeof resizeCanvas === "function") resizeCanvas();
    const selfStage = this;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        selfStage.resize();
        if (typeof resizeCanvas === "function") resizeCanvas();
      });
    }
  },

  setShowcaseTarget: function (target) {
    const isHero = (target === "hero" || !target);
    this.showcaseTarget = isHero ? "hero" : parseInt(target, 10);
    this.orbit.userOverrideUntil = 0;

    if (isHero) {
      const hp = this.hero ? this.hero.root.position : new THREE.Vector3(2.95, 0.02, -5.45);
      const hRotY = this.hero ? (this.hero.root.rotation.y || 0) : -0.44;
      this.orbit.targetYaw = hRotY + 0.14;
      this.orbit.targetPitch = 0.16;
      this.orbit.targetRadius = 2.95;
      if (this.orbit.targetLookAt) this.orbit.targetLookAt.set(hp.x, hp.y + 1.54, hp.z);
    } else if (this.seats && this.seats.anchors && this.seats.anchors[this.showcaseTarget]) {
      const ap = this.seats.anchors[this.showcaseTarget].worldPos;
      const frontYaw = Math.atan2(-ap.x, -ap.z);
      this.orbit.targetYaw = frontYaw + 0.22;
      this.orbit.targetPitch = 0.24;
      this.orbit.targetRadius = 3.45;
      if (this.orbit.targetLookAt) this.orbit.targetLookAt.set(ap.x, ap.y + 1.50, ap.z);
    }

    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
  },

  setHeroAction: function (actionName, durationMs) {
    const tgt = this.showcaseTarget || "hero";
    if (this.showcaseMode && tgt !== "hero" && this.seats && this.seats.slots && this.seats.slots[tgt]) {
      const actor = this.seats.slots[tgt];
      actor.showcaseAction = actionName === "idle_breathe" ? "" : (actionName || "");
      actor.showcaseActionUntil = durationMs ? (performance.now() + durationMs) : 0;
      const emoMap = {
        welcome_bow: "happy",
        speak_gesture: "proud",
        purify_cast: "happy",
        gasp_react: "shock",
        celebrate: "laugh",
        idle_breathe: "neutral"
      };
      if (typeof setSeatEmotion === "function") {
        setSeatEmotion(tgt, emoMap[actionName] || "neutral", durationMs || 2600);
      }
      if (typeof nudgeSeat === "function") {
        nudgeSeat(tgt, { scale: 1.09, vScale: 0.08 });
      }
      return;
    }
    if (this.hero && typeof triggerHeroAction === "function") {
      triggerHeroAction(this.hero, actionName, durationMs || 0);
    }
  },

  setHeroPalette: function (palKey) {
    if (this.hero && typeof applyHeroPalette === "function") {
      applyHeroPalette(this.hero, palKey);
    }
  },

  setHeroVisualMode: function (mode) {
    if (this.hero && typeof setHeroVisualMode === "function") {
      setHeroVisualMode(this.hero, mode);
    }
  },

  resetShowcaseAvatar: function () {
    const tgt = this.showcaseTarget || "hero";
    if (tgt === "hero") {
      this.setHeroVisualMode("sculpt3d");
      showToast("已切回內建二次元 3D 角色「清茗」", "emerald");
    } else if (this.seats && this.seats.slots[tgt] && typeof setSeatVisualMode === "function") {
      const actor = this.seats.slots[tgt];
      const wasCustom = Boolean(actor.boundModelSlug && actor.boundModelSlug.indexOf("custom:") === 0);
      const prevAvatar = actor.vrmAvatar;
      if (actor.vrmMountGroup) {
        while (actor.vrmMountGroup.children.length > 0) {
          const oldChild = actor.vrmMountGroup.children[0];
          actor.vrmMountGroup.remove(oldChild);
          this.disposeObject3D(oldChild, prevAvatar);
        }
      } else if (prevAvatar && prevAvatar.root) {
        this.disposeObject3D(prevAvatar.root, prevAvatar);
      }
      actor.vrmAvatar = null;
      actor.boundModelSlug = "";
      actor.boundAvatarKey = "";
      actor._vrmUpdatedOnce = false;
      setSeatVisualMode(actor, "sculpt3d");
      if (wasCustom && typeof getStageSeatListFor3D === "function") {
        this.syncSeatAvatars(getStageSeatListFor3D());
      }
      const s = typeof getSeat === "function" ? getSeat(tgt) : null;
      showToast("已切回 " + fmtSeatNum(tgt) + "號 " + (s ? s.name : "") + " 的內建動漫 3D 造型", "emerald");
    }
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
  },

  disposeObject3D: function (rootObj, extraAvatar) {
    if (!rootObj || typeof rootObj.traverse !== "function") return;
    const disposedGeos = new Set();
    const disposedMats = new Set();
    const disposedTexs = new Set();
    const freeTex = function (tex) {
      if (!tex || disposedTexs.has(tex)) return;
      disposedTexs.add(tex);
      if (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.disposeTextureResource === "function") {
        stage3dVrm.disposeTextureResource(tex);
      } else if (typeof tex.dispose === "function") {
        try { tex.dispose(); } catch (e) { }
      }
    };
    rootObj.traverse(function (node) {
      if (!node) return;
      if (node.geometry && !disposedGeos.has(node.geometry)) {
        disposedGeos.add(node.geometry);
        if (typeof node.geometry.dispose === "function") {
          try { node.geometry.dispose(); } catch (e) { }
        }
      }
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(function (m) {
          if (!m || disposedMats.has(m)) return;
          disposedMats.add(m);
          ["map", "normalMap", "bumpMap", "emissiveMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap"].forEach(function (k) {
            if (m[k]) freeTex(m[k]);
          });
          if (typeof m.dispose === "function") {
            try { m.dispose(); } catch (e) { }
          }
        });
      }
    });
    if (extraAvatar && Array.isArray(extraAvatar.recolorSlots)) {
      extraAvatar.recolorSlots.forEach(function (slot) {
        if (slot && slot.origMap) freeTex(slot.origMap);
      });
    }
  },

  attachNormalizedHeroGlb: function (gltf, label, silent, isCustomUpload) {
    if (!this.hero || !gltf || !gltf.scene) return;
    if (this.hero.customGlbRoot) {
      this.hero.root.remove(this.hero.customGlbRoot);
      this.disposeObject3D(this.hero.customGlbRoot, this.hero.vrmAvatar);
    }
    let prep = null;
    if (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.prepareLoadedAvatar === "function") {
      prep = stage3dVrm.prepareLoadedAvatar(gltf, {
        mode: "standing",
        targetHeight: 2.14,
        baseY: 0.08,
        personaName: isCustomUpload ? null : "清茗",
        keepRecolorSlots: !isCustomUpload
      });
    }
    const mdl = prep ? prep.root : gltf.scene;
    if (!prep) {
      if (typeof THREE.Box3 === "function") {
        const box = new THREE.Box3().setFromObject(mdl);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxH = Math.max(0.001, size.y);
        const sc = 2.14 / maxH;
        mdl.scale.setScalar(sc);
        mdl.position.set(-center.x * sc, 0.08 - box.min.y * sc, -center.z * sc);
      } else {
        mdl.position.y = 0.08;
      }
      if (typeof mdl.traverse === "function") {
        mdl.traverse(function (child) {
          if (child && child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      }
    }
    this.hero.vrmAvatar = (prep && prep.isVrm) ? prep : null;
    this.hero.customGlbBaseY = prep ? prep.baseY : (mdl.position.y || 0.18);
    this.hero.customGlbRoot = mdl;
    this.hero.root.add(mdl);
    if (!isCustomUpload && this.hero.paletteKey && this.hero.vrmAvatar && typeof stage3dVrm !== "undefined" && typeof stage3dVrm.applyHeroVrmPalette === "function") {
      stage3dVrm.applyHeroVrmPalette(this.hero.vrmAvatar, this.hero.paletteKey);
    }
    if (typeof setHeroVisualMode === "function") setHeroVisualMode(this.hero, "glb");
    this._shadowBakedOnce = false;
    if (isCustomUpload) {
      this.extractEmbeddedVrmThumbnail(gltf, "主持");
    }
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
    if (!silent) showToast("已載入並自動對齊「清茗」二次元 3D 模型：" + label, "emerald");
  },

  stashSeatAvatarInPool: function (actor) {
    if (!actor || !actor.vrmAvatar || !actor.vrmAvatar.root) return false;
    const key = actor.boundAvatarKey || "";
    const slug = actor.boundModelSlug || "";
    if (!key || slug.indexOf("custom:") === 0) return false;
    if (!this.avatarPool) this.avatarPool = {};
    if (!Array.isArray(this.avatarPoolOrder)) this.avatarPoolOrder = [];
    if (actor.vrmMountGroup && actor.vrmAvatar.root.parent === actor.vrmMountGroup) {
      actor.vrmMountGroup.remove(actor.vrmAvatar.root);
    }
    if (this.avatarPool[key] && this.avatarPool[key].avatar && this.avatarPool[key].avatar !== actor.vrmAvatar) {
      this.disposeObject3D(this.avatarPool[key].avatar.root, this.avatarPool[key].avatar);
    }
    this.avatarPool[key] = { avatar: actor.vrmAvatar, slug: slug, key: key };
    const prevIdx = this.avatarPoolOrder.indexOf(key);
    if (prevIdx !== -1) this.avatarPoolOrder.splice(prevIdx, 1);
    this.avatarPoolOrder.push(key);
    while (this.avatarPoolOrder.length > 14) {
      const oldestKey = this.avatarPoolOrder.shift();
      if (oldestKey && this.avatarPool[oldestKey]) {
        const oldEntry = this.avatarPool[oldestKey];
        if (oldEntry && oldEntry.avatar && oldEntry.avatar.root) {
          this.disposeObject3D(oldEntry.avatar.root, oldEntry.avatar);
        }
        delete this.avatarPool[oldestKey];
      }
    }
    actor.vrmAvatar = null;
    actor.boundModelSlug = "";
    actor.boundAvatarKey = "";
    actor._vrmUpdatedOnce = false;
    if (typeof setSeatVisualMode === "function") setSeatVisualMode(actor, "sculpt3d");
    return true;
  },

  mountPooledSeatAvatar: function (actor, pooledEntry) {
    if (!actor || !actor.vrmMountGroup || !pooledEntry || !pooledEntry.avatar || !pooledEntry.avatar.root) return false;
    while (actor.vrmMountGroup.children.length > 0) {
      const oldChild = actor.vrmMountGroup.children[0];
      actor.vrmMountGroup.remove(oldChild);
      this.disposeObject3D(oldChild, actor.vrmAvatar);
    }
    actor.vrmAvatar = pooledEntry.avatar;
    actor.vrmAvatar.lastMoodKey = "";
    actor.vrmAvatar.lastAlive = null;
    actor.vrmAvatar.lastTalkBoost = false;
    actor.boundModelSlug = pooledEntry.slug;
    actor.boundAvatarKey = pooledEntry.key;
    actor._vrmUpdatedOnce = false;
    actor.vrmMountGroup.add(pooledEntry.avatar.root);
    if (typeof setSeatVisualMode === "function") setSeatVisualMode(actor, "vrm");
    this._shadowBakedOnce = false;
    return true;
  },

  attachSeatAvatar: function (seatId, gltf, label, silent, modelSlug, seatObjHint) {
    if (!this.seats || !gltf || !gltf.scene) return;
    let actor = this.seats.slots[seatId];
    if (!actor && typeof getStageSeatListFor3D === "function" && typeof create3DSeatActor === "function") {
      const seatObj = getStageSeatListFor3D().find(function (s) { return s.id === seatId; });
      if (seatObj) {
        actor = create3DSeatActor(seatObj);
        this.seats.slots[seatId] = actor;
        this.seats.root.add(actor.root);
      }
    }
    if (!actor || !actor.vrmMountGroup) return;
    const prevAvatar = actor.vrmAvatar;
    while (actor.vrmMountGroup.children.length > 0) {
      const oldChild = actor.vrmMountGroup.children[0];
      actor.vrmMountGroup.remove(oldChild);
      this.disposeObject3D(oldChild, prevAvatar);
    }
    const curSeatForPrep = seatObjHint || (typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D().find(function (s) { return s.id === seatId; }) : null);
    const seatPersonaName = (curSeatForPrep && curSeatForPrep.name) ? curSeatForPrep.name : "";
    const prepPersonaName = (seatPersonaName && (!modelSlug || modelSlug.indexOf("custom:") !== 0)) ? seatPersonaName : null;
    const prep = (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.prepareLoadedAvatar === "function")
      ? stage3dVrm.prepareLoadedAvatar(gltf, { mode: "seated", targetHeight: 2.10, baseY: 0.0, personaName: prepPersonaName, keepRecolorSlots: false })
      : { root: gltf.scene, baseY: 0, isVrm: false };
    actor.vrmAvatar = prep;
    if (modelSlug) actor.boundModelSlug = modelSlug;
    actor.boundAvatarKey = (modelSlug || "") + "|" + seatPersonaName;
    actor._vrmUpdatedOnce = false;
    actor.vrmMountGroup.add(prep.root);
    if (typeof setSeatVisualMode === "function") setSeatVisualMode(actor, "vrm");
    this._shadowBakedOnce = false;
    this._vrmWarmupUntil = Math.max(this._vrmWarmupUntil || 0, (typeof performance !== "undefined" ? performance.now() : Date.now()) + 2200);
    if (modelSlug && modelSlug.indexOf("custom:") === 0) {
      const curSeat = seatObjHint || (typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D().find(function (s) { return s.id === seatId; }) : null);
      const pKey = (curSeat && typeof getPortraitKey === "function") ? getPortraitKey(curSeat) : (seatId === getPlayerId() ? "你" : null);
      if (pKey) this.extractEmbeddedVrmThumbnail(gltf, pKey);
    }
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
    if (!silent) showToast("已為 " + fmtSeatNum(seatId) + "號 套用專屬二次元 3D 模型：" + label, "emerald");
  },

  extractEmbeddedVrmThumbnail: function (gltf, personaKey) {
    // Lightweight zero-WebGL-stall embedded VRM thumbnail extractor (for user-uploaded custom .vrm files)
    if (!gltf || !gltf.parser || !personaKey) return null;
    try {
      const json = gltf.parser.json;
      const ext = json && json.extensions ? json.extensions : null;
      const isResourceUsedInScene = function (targetTex, targetImg) {
        let used = false;
        if (gltf.scene && typeof gltf.scene.traverse === "function") {
          gltf.scene.traverse(function (node) {
            if (used || !node || !node.material) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (let mi = 0; mi < mats.length; mi++) {
              const m = mats[mi];
              if (!m) continue;
              const maps = ["map", "normalMap", "bumpMap", "emissiveMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap"];
              for (let ki = 0; ki < maps.length; ki++) {
                const mt = m[maps[ki]];
                if (!mt) continue;
                if ((targetTex && mt === targetTex) || (targetImg && mt.image === targetImg)) {
                  used = true;
                  return;
                }
              }
            }
          });
        }
        return used;
      };
      let texIdx = null;
      if (ext && ext.VRM && ext.VRM.meta && typeof ext.VRM.meta.texture === "number") {
        texIdx = ext.VRM.meta.texture;
      } else if (ext && ext.VRMC_vrm && ext.VRMC_vrm.meta && typeof ext.VRMC_vrm.meta.thumbnailImage === "number") {
        const imgIdx = ext.VRMC_vrm.meta.thumbnailImage;
        if (typeof gltf.parser.getDependency === "function") {
          gltf.parser.getDependency("image", imgIdx).then(function (img) {
            if (!img) return;
            try {
              stage3d._canvasEncodePortrait(personaKey, img);
            } finally {
              if (!isResourceUsedInScene(null, img) && typeof ImageBitmap === "function" && img instanceof ImageBitmap && typeof img.close === "function") {
                try { img.close(); } catch (e) { }
              }
            }
          }).catch(function () { });
        }
        return null;
      }
      if (typeof texIdx === "number" && typeof gltf.parser.getDependency === "function") {
        gltf.parser.getDependency("texture", texIdx).then(function (tex) {
          if (!tex) return;
          try {
            if (tex.image) stage3d._canvasEncodePortrait(personaKey, tex.image);
          } finally {
            if (!isResourceUsedInScene(tex, tex.image)) {
              if (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.disposeTextureResource === "function") {
                stage3dVrm.disposeTextureResource(tex);
              } else if (typeof tex.dispose === "function") {
                try { tex.dispose(); } catch (e) { }
              }
            }
          }
        }).catch(function () { });
      }
    } catch (e) { }
    return null;
  },

  _canvasEncodePortrait: function (personaKey, img) {
    try {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext("2d");
      const iw = img.naturalWidth || img.width || 256;
      const ih = img.naturalHeight || img.height || 256;
      const side = Math.min(iw, ih);
      ctx.drawImage(img, (iw - side) * 0.5, 0, side, side, 0, 0, 256, 256);
      const url = c.toDataURL("image/jpeg", 0.84);
      if (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.registerVrmPortrait === "function") {
        stage3dTextures.registerVrmPortrait(personaKey, url);
      }
    } catch (e) { }
  },

  updateVrmLoadIndicator: function () {
    const pill = el("vrmLoadPill");
    const txt = el("vrmLoadPillText");
    const total = this.avatarTotalQueued || 0;
    const done = Math.min(total, this.avatarDoneCount || 0);
    const active = this.avatarActiveLoads || 0;
    const queued = (this.avatarQueue && this.avatarQueue.length) || 0;
    if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function" && total > 0) {
      bootPreloader.reportBucket("avatars", done, total);
    }
    if (!pill || !txt) return;
    if (total > 0 && (active > 0 || queued > 0)) {
      pill.classList.remove("hidden");
      txt.textContent = "正在喚醒茶席夥伴 " + done + "/" + total;
    } else {
      pill.classList.add("hidden");
    }
  },

  pumpAvatarQueue: function () {
    const self = this;
    if (this.failed || !this.ready || typeof THREE.GLTFLoader !== "function") return;
    if (this.avatarActiveLoads >= 1 || this.avatarQueue.length === 0) {
      this.updateVrmLoadIndicator();
      return;
    }
    const job = this.avatarQueue.shift();
    if (!job) {
      this.updateVrmLoadIndicator();
      return;
    }
    if (this.avatarLoadingKeys[job.key]) {
      delete this.avatarQueuedKeys[job.key];
      this.avatarDoneCount += 1;
      this.pumpAvatarQueue();
      return;
    }
    this.avatarLoadingKeys[job.key] = true;
    this.avatarActiveLoads += 1;
    this.updateVrmLoadIndicator();
    const loader = this.gltfLoader || (this.gltfLoader = new THREE.GLTFLoader());
    loader.load(job.url, function (gltf) {
      delete self.avatarLoadingKeys[job.key];
      delete self.avatarQueuedKeys[job.key];
      self.avatarActiveLoads = Math.max(0, self.avatarActiveLoads - 1);
      self.avatarDoneCount += 1;
      if (self.failed || !self.ready) {
        if (gltf && gltf.scene) self.disposeObject3D(gltf.scene);
        self.updateVrmLoadIndicator();
        return;
      }
      const latestSeat = typeof getStageSeatListFor3D === "function"
        ? getStageSeatListFor3D().find(function (x) { return x.id === job.seat.id; })
        : job.seat;
      const curActor = (self.seats && self.seats.slots) ? self.seats.slots[job.seat.id] : null;
      const hasCustom = Boolean(curActor && curActor.boundModelSlug && curActor.boundModelSlug.indexOf("custom:") === 0);
      const latestSlug = latestSeat ? stage3dVrm.getSeatModelSlug(latestSeat) : "";
      const latestAvatarKey = latestSlug + "|" + (latestSeat && latestSeat.name ? latestSeat.name : "");
      if (!hasCustom && latestSeat && latestSlug === job.slug && (!job.avatarKey || latestAvatarKey === job.avatarKey)) {
        self.attachSeatAvatar(job.seat.id, gltf, job.url.split("/").pop(), true, job.slug, latestSeat);
      } else if (gltf && gltf.scene) {
        // Stale in-flight load after seat shuffle or custom VRM upload: dispose immediately so GPU textures & ImageBitmaps never leak!
        self.disposeObject3D(gltf.scene);
      }
      self.updateVrmLoadIndicator();
      if (!self.failed && self.ready) {
        setTimeout(function () { self.pumpAvatarQueue(); }, 50);
      }
    }, undefined, function () {
      delete self.avatarLoadingKeys[job.key];
      delete self.avatarQueuedKeys[job.key];
      self.avatarActiveLoads = Math.max(0, self.avatarActiveLoads - 1);
      self.avatarDoneCount += 1;
      self.updateVrmLoadIndicator();
      if (!self.failed && self.ready) {
        setTimeout(function () { self.pumpAvatarQueue(); }, 50);
      }
    });
  },

  syncSeatAvatars: function (seatList) {
    if (this.failed || !this.ready || this.isSoftwareRenderer) return;
    if (!this.seats || !seatList || typeof stage3dVrm === "undefined" || typeof THREE.GLTFLoader !== "function") return;
    if (!this.avatarManifest || !Object.keys(this.avatarManifest).length) return;
    const self = this;
    const desiredList = [];
    const desiredBySeatId = {};
    const nTotal = seatList.length;

    // Step 1: Compute desired avatar identity (slug + personaName) for every seat
    seatList.forEach(function (s, idx) {
      const actor = self.seats.slots[s.id];
      if (!actor) return;
      if (actor.boundModelSlug && actor.boundModelSlug.indexOf("custom:") === 0) return;
      let slug = stage3dVrm.getSeatModelSlug(s);
      let rigSlug = typeof stage3dVrm.resolveVrmRigSlug === "function" ? stage3dVrm.resolveVrmRigSlug(s) : slug;
      let url = self.avatarManifest[rigSlug] || self.avatarManifest[slug];
      if (!url && (slug === "player_male" || rigSlug === "player_male")) {
        slug = "player";
        url = self.avatarManifest[slug];
      }
      if (!url) return;
      const avatarKey = slug + "|" + (s.name || "");
      const item = { seat: s, idx: idx, actor: actor, slug: slug, url: url, avatarKey: avatarKey };
      desiredList.push(item);
      desiredBySeatId[s.id] = item;
    });

    // Step 2: Drop stale queued jobs for seats dropped in smaller matches or whose persona changed across shuffles!
    if (this.avatarQueue && this.avatarQueue.length) {
      const kept = [];
      for (let qi = 0; qi < this.avatarQueue.length; qi++) {
        const qj = this.avatarQueue[qi];
        const want = qj && qj.seat ? desiredBySeatId[qj.seat.id] : null;
        if (!want || (qj.avatarKey && qj.avatarKey !== want.avatarKey)) {
          delete this.avatarQueuedKeys[qj.key];
          this.avatarTotalQueued = Math.max(0, (this.avatarTotalQueued || 0) - 1);
          continue;
        }
        kept.push(qj);
      }
      this.avatarQueue = kept;
    }

    // Step 3: Harvest mounted VRMs from all slots (including inactive higher seats after downsizing) into reusable avatarPool
    Object.keys(self.seats.slots).forEach(function (slotKey) {
      const actor = self.seats.slots[slotKey];
      if (!actor || !actor.vrmAvatar || !actor.boundAvatarKey) return;
      if (actor.boundModelSlug && actor.boundModelSlug.indexOf("custom:") === 0) return;
      const want = desiredBySeatId[slotKey];
      if (!want || actor.boundAvatarKey !== want.avatarKey) {
        self.stashSeatAvatarInPool(actor);
      }
    });

    // Step 4: Instant 0ms re-mount from avatarPool when persona simply moved seats; queue fetch ONLY for truly unloaded personas!
    const newJobs = [];
    desiredList.forEach(function (item) {
      const actor = item.actor;
      const s = item.seat;
      if (actor.vrmAvatar && actor.boundAvatarKey === item.avatarKey) return;
      if (self.avatarPool && self.avatarPool[item.avatarKey]) {
        const pooled = self.avatarPool[item.avatarKey];
        delete self.avatarPool[item.avatarKey];
        const oIdx = self.avatarPoolOrder ? self.avatarPoolOrder.indexOf(item.avatarKey) : -1;
        if (oIdx !== -1) self.avatarPoolOrder.splice(oIdx, 1);
        if (self.mountPooledSeatAvatar(actor, pooled)) return;
      }
      const key = s.id + ":" + item.avatarKey;
      if (self.avatarLoadingKeys[key] || self.avatarQueuedKeys[key]) return;
      const isPlayer = (typeof getPlayerId === "function" && s.id === getPlayerId());
      const distFromOpp = Math.abs(item.idx - Math.floor(nTotal * 0.5));
      const prio = isPlayer ? 99 : distFromOpp;
      self.avatarQueuedKeys[key] = true;
      newJobs.push({ seat: s, slug: item.slug, avatarKey: item.avatarKey, url: item.url, key: key, prio: prio });
    });
    if (!newJobs.length) {
      if (this.avatarActiveLoads === 0 && (!this.avatarQueue || this.avatarQueue.length === 0)) {
        if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
          bootPreloader.reportBucket("avatars", 1, 1);
        }
      }
      return;
    }
    if (this.avatarActiveLoads === 0 && this.avatarQueue.length === 0) {
      this.avatarDoneCount = 0;
      this.avatarTotalQueued = 0;
    }
    this.avatarQueue = this.avatarQueue.concat(newJobs);
    this.avatarQueue.sort(function (a, b) { return a.prio - b.prio; });
    this.avatarTotalQueued += newJobs.length;
    this.updateVrmLoadIndicator();
    this.pumpAvatarQueue();
  },

  attachCustomPavilionGlb: function (gltf, label, silent) {
    if (!this.scene || !gltf || !gltf.scene) return false;
    if (this.customPavilionRoot) {
      this.scene.remove(this.customPavilionRoot);
      this.disposeObject3D(this.customPavilionRoot);
      this.customPavilionRoot = null;
    }
    const wrap = new THREE.Group();
    const raw = gltf.scene;
    if (typeof raw.traverse === "function") {
      raw.traverse(function (node) {
        if (!node || !node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(function (m) {
          if (m && m.map && THREE.sRGBEncoding !== undefined) m.map.encoding = THREE.sRGBEncoding;
        });
      });
    }
    wrap.add(raw);
    this.scene.add(wrap);
    this.customPavilionRoot = wrap;
    if (this.env && this.env.proceduralPavilionGroup) {
      this.env.proceduralPavilionGroup.visible = false;
    }
    if (!silent && typeof showToast === "function") {
      showToast("已載入 Blender 自訂古亭場景：" + (label || "sanctuary_pavilion.glb"), "emerald");
    }
    return true;
  },

  resetPavilionToProcedural: function () {
    if (this.scene && this.customPavilionRoot) {
      this.scene.remove(this.customPavilionRoot);
      this.disposeObject3D(this.customPavilionRoot);
      this.customPavilionRoot = null;
    }
    if (this.env && this.env.proceduralPavilionGroup) {
      this.env.proceduralPavilionGroup.visible = true;
    }
  },

  loadCustomPavilionGlb: function (file) {
    if (!file) return;
    if (typeof THREE.GLTFLoader !== "function") {
      showToast("未偵測到 GLTFLoader，無法載入自訂場景", "warn");
      return;
    }
    const loader = new THREE.GLTFLoader();
    const url = URL.createObjectURL(file);
    const self = this;
    loader.load(url, function (gltf) {
      URL.revokeObjectURL(url);
      self.attachCustomPavilionGlb(gltf, file.name, false);
    }, undefined, function () {
      URL.revokeObjectURL(url);
      showToast("場景模型解析失敗（支援 .glb / .gltf），維持書院古亭", "warn");
    });
  },

  getDefaultStaticAvatarManifest: function () {
    return {
      ok: true,
      hasHeroGlb: true,
      heroModel: "assets/models/qingming.vrm",
      hasPavilionGlb: false,
      pavilionModel: null,
      seatModels: {
        player: "assets/models/player.vrm",
        player_male: "assets/models/player_male.vrm",
        xiaocheng: "assets/models/xiaocheng.vrm",
        nuannuan: "assets/models/nuannuan.vrm",
        asong: "assets/models/asong.vrm",
        xinger: "assets/models/xinger.vrm",
        xiaoyun: "assets/models/xiaoyun.vrm",
        azhu: "assets/models/azhu.vrm",
        chenchen: "assets/models/chenchen.vrm"
      }
    };
  },

  checkAutoAvatars: function () {
    const settleBootAvatars = function () {
      if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
        bootPreloader.reportBucket("hero", 1, 1);
        bootPreloader.reportBucket("avatars", 1, 1);
      }
    };
    if (this.isSoftwareRenderer) { settleBootAvatars(); return; }
    if (typeof window === "undefined" || !window.location) { settleBootAvatars(); return; }
    const proto = window.location.protocol;
    if (proto !== "http:" && proto !== "https:") { settleBootAvatars(); return; }
    if (typeof fetch !== "function" || typeof THREE.GLTFLoader !== "function") { settleBootAvatars(); return; }
    const self = this;
    const applyManifest = function (info) {
      if (!info) { settleBootAvatars(); return; }
      const startSeats = function () {
        if (info.seatModels) {
          self.avatarManifest = info.seatModels;
          if (typeof getStageSeatListFor3D === "function") {
            self.syncSeatAvatars(getStageSeatListFor3D());
          } else if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
            bootPreloader.reportBucket("avatars", 1, 1);
          }
        } else if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
          bootPreloader.reportBucket("avatars", 1, 1);
        }
      };
      const loader = new THREE.GLTFLoader();
      if (info.pavilionModel) {
        loader.load(info.pavilionModel, function (pvGltf) {
          self.attachCustomPavilionGlb(pvGltf, info.pavilionModel.split("/").pop(), true);
        }, undefined, function () { });
      }
      const heroUrl = info.heroModel || (info.hasHeroGlb ? "assets/models/qingming.glb" : null);
      if (heroUrl && self.hero) {
        loader.load(heroUrl, function (gltf) {
          self.attachNormalizedHeroGlb(gltf, heroUrl.split("/").pop(), true, false);
          if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
            bootPreloader.reportBucket("hero", 1, 1);
          }
          setTimeout(startSeats, 120);
        }, undefined, function () {
          if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
            bootPreloader.reportBucket("hero", 1, 1);
          }
          startSeats();
        });
      } else {
        if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
          bootPreloader.reportBucket("hero", 1, 1);
        }
        startSeats();
      }
    };
    const loadStaticFallback = function () {
      return fetch("assets/models/manifest.json")
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (staticInfo) {
          return staticInfo || self.getDefaultStaticAvatarManifest();
        });
    };
    fetch("/api/assets/status")
      .then(function (r) { return r && r.ok ? r.json() : loadStaticFallback(); })
      .catch(function () { return loadStaticFallback(); })
      .then(applyManifest)
      .catch(function () { settleBootAvatars(); });
  },

  checkAutoHeroGlb: function () {
    return this.checkAutoAvatars();
  },

  loadCustomHeroGlb: function (file) {
    if (!file) return;
    const tgt = this.showcaseTarget || "hero";
    if (typeof THREE.GLTFLoader === "function") {
      const loader = new THREE.GLTFLoader();
      const url = URL.createObjectURL(file);
      const self = this;
      loader.load(url, function (gltf) {
        URL.revokeObjectURL(url);
        if (self.failed || !self.ready) {
          if (gltf && gltf.scene) self.disposeObject3D(gltf.scene);
          return;
        }
        if (tgt === "hero") {
          self.attachNormalizedHeroGlb(gltf, file.name, false, true);
        } else {
          self.attachSeatAvatar(tgt, gltf, file.name, false, "custom:" + file.name);
        }
      }, undefined, function () {
        URL.revokeObjectURL(url);
        showToast("模型格式解析失敗（支援 .vrm / .glb / .gltf），已維持內建動漫角色", "warn");
      });
    } else {
      showToast("未偵測到 GLTFLoader，已維持內建 3D 角色", "warn");
    }
  },

  updateDragWorldPoint: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.fx) return;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hitPt = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.tablePlane, hitPt)) {
      hitPt.x = clamp(hitPt.x, -8.5, 8.5);
      hitPt.z = clamp(hitPt.z, -8.5, 8.5);
      this.fx.dragWorldEnd.copy(hitPt);
    }
  },

  interactWithCrystal: function () {
    if (!this.isActive() || !this.env || !this.fx) return;
    this.env.lotusSpinBoost = 1.0;
    const nowMs = performance.now();
    spawn3DShockwave(this.fx, new THREE.Vector3(0, 0, 0), "#fbbf24", nowMs, 1.28, 7.5);
    sound.playBlessing();
    showToast("輕觸三好蓮花核心：願本局存好心、說好話、做好事！", "emerald");
  },

  setCameraPreset: function (preset) {
    this.camPreset = (preset === "firstperson" || preset === "overview") ? preset : "cinema";
    this.closeUpSeatId = null;
    this.orbit.userOverrideUntil = 0;
    this.orbit.fpTargetYaw = 0;
    this.orbit.fpTargetPitch = -0.10;
    this.orbit.fpFovOffset = 0;
    if (this.camPreset === "firstperson") {
      // Snap gentle sit-down framing toward current speaker or center of tea table
      const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
      const focusId = (state.activeSpeakerId && state.activeSpeakerId !== pidNow)
        ? state.activeSpeakerId
        : ((state.selectedSeatId && state.selectedSeatId !== pidNow) ? state.selectedSeatId : null);
      if (focusId && this.seats && this.seats.anchors && this.seats.anchors[focusId]) {
        const eye = this.getFirstPersonSeatEye();
        const ang = this.computeFirstPersonAnglesToPoint(this.seats.anchors[focusId].headPos, eye);
        this.orbit.fpTargetYaw = ang.yaw;
        this.orbit.fpTargetPitch = ang.pitch;
      }
    }
    this.syncCameraPresetButtons();
    const hintEl = el("dragGestureHint");
    if (hintEl && this.isActive()) {
      hintEl.textContent = this.camPreset === "firstperson"
        ? "坐席視角：拖曳自由轉頭｜滾輪微調焦距｜雙擊空地回正｜點擊左右箭頭快速看鄰座"
        : "拖曳空地可 360° 環視山城｜點擊角色、桌心蓮花或遠方山海雲島互動";
    }
    const labelMap = {
      cinema: "電影自動運鏡",
      firstperson: "沉浸坐席視角（可拖曳轉頭・點邊緣箭頭快速回望）",
      overview: "俯視全景戰術視角"
    };
    showToast("已切換視角：" + labelMap[this.camPreset], "emerald");
  },

  syncCameraPresetButtons: function () {
    const bar = el("cam3DToolbar");
    if (!bar) return;
    bar.querySelectorAll("[data-cam-preset]").forEach(function (btn) {
      const active = btn.getAttribute("data-cam-preset") === stage3d.camPreset;
      btn.classList.toggle("is-active", active);
    });
  },

  applyBodyModeClass: function () {
    const active = this.isActive();
    document.body.classList.toggle("mode-3d", active);
    const c3 = el("sanctuary3DCanvas");
    if (c3) c3.classList.toggle("hidden", !active);
    const bar = el("cam3DToolbar");
    if (bar) bar.classList.toggle("hidden", !active);
    const toggleBtn = el("btnToggle3D");
    if (toggleBtn) {
      toggleBtn.textContent = active ? "3D舞台" : "2D平面";
      toggleBtn.classList.toggle("is-accent", active);
    }
    this.syncCameraPresetButtons();
    const hint = el("dragGestureHint");
    if (hint && active && !state.match.started) {
      hint.textContent = "拖曳空地可 360° 環視山城｜點擊角色、桌心蓮花或遠方山海雲島互動";
    }
  },

  setViewMode: function (mode) {
    if (mode === "3d") {
      if (!this.ready && !this.failed) this.init();
      if (!this.ready) {
        state.viewMode = "2d";
        showToast("目前環境尚未載入 3D 引擎，已維持 2D 舞台模式", "warn");
      } else {
        state.viewMode = "3d";
      }
    } else {
      state.viewMode = "2d";
    }
    if (typeof invalidate3DOverlayCache === "function") invalidate3DOverlayCache();
    this.applyBodyModeClass();
    resizeCanvas();
    saveUserPrefs();
  },

  toggleViewMode: function () {
    this.setViewMode(this.isActive() ? "2d" : "3d");
    if (this.isActive() && this.isSoftwareRenderer) {
      showToast("已切為 3D 輕量內建人偶（未開圖形加速，已暫緩載入高面數 VRM；開啟瀏覽器圖形加速即可解鎖全套 VRM）", "warn");
    } else {
      showToast(this.isActive() ? "已切換為 3D 山城古亭舞台！" : "已切換為 2D 經典俯視圓桌！", "emerald");
    }
  },

  resize: function () {
    if (!this.ready || !this.renderer || !this.camera) return false;
    const container = el("canvasStageWrap") || el("canvasContainer");
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    const w = Math.max(300, Math.round(rect.width));
    const h = Math.max(220, Math.round(rect.height));
    const dpr = this.getTargetDpr(state.quality3D);
    if (this._lastResizeW === w && this._lastResizeH === h && this._lastResizeDpr === dpr) return false;
    this._lastResizeW = w;
    this._lastResizeH = h;
    this._lastResizeDpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.postfx) this.postfx.resize(w, h, dpr);
    if (typeof invalidate3DOverlayCache === "function") invalidate3DOverlayCache();
    return true;
  },

  beginOrbit: function (clientX, clientY) {
    this.orbit.dragging = true;
    this.orbit.lastX = clientX;
    this.orbit.lastY = clientY;
    this.orbit.userOverrideUntil = performance.now() + 9000;
  },

  moveOrbit: function (clientX, clientY) {
    if (!this.orbit.dragging) return;
    const dx = clientX - this.orbit.lastX;
    const dy = clientY - this.orbit.lastY;
    this.orbit.lastX = clientX;
    this.orbit.lastY = clientY;
    if (this.showcaseMode) {
      this.orbit.targetYaw -= dx * 0.0085;
      // Strictly keep showcase pitch at or above horizontal (zero upskirt low-angle tilt!)
      this.orbit.targetPitch = clamp(this.orbit.targetPitch + dy * 0.005, 0.06, 0.68);
      this.orbit.userOverrideUntil = performance.now() + 9000;
      return;
    }
    if (this.camPreset === "firstperson") {
      // Natural grab-and-look drag with generous ±83° head turn so immediate left/right neighbors are effortless to inspect!
      this.orbit.fpTargetYaw = clamp(this.orbit.fpTargetYaw - dx * 0.0052, -1.45, 1.45);
      this.orbit.fpTargetPitch = clamp(this.orbit.fpTargetPitch + dy * 0.0040, -0.46, 0.24);
    } else {
      this.orbit.targetYaw -= dx * 0.0075;
      // Keep orbit camera gracefully above tabletop height
      this.orbit.targetPitch = clamp(this.orbit.targetPitch + dy * 0.0055, 0.16, 1.22);
    }
    if (Math.abs(dx) + Math.abs(dy) >= 4 && typeof dismissDragGestureHint === "function") {
      dismissDragGestureHint();
    }
    this.orbit.userOverrideUntil = performance.now() + 9000;
  },

  endOrbit: function () {
    this.orbit.dragging = false;
  },

  zoomBy: function (deltaY) {
    if (this.showcaseMode) {
      this.orbit.targetRadius = clamp(this.orbit.targetRadius + deltaY * 0.0035, 2.35, 5.8);
      this.orbit.userOverrideUntil = performance.now() + 6500;
      return;
    }
    if (this.camPreset === "firstperson") {
      this.orbit.fpFovOffset = clamp((this.orbit.fpFovOffset || 0) + deltaY * 0.022, -14, 14);
      this.orbit.userOverrideUntil = performance.now() + 6500;
      return;
    }
    this.orbit.targetRadius = clamp(this.orbit.targetRadius + deltaY * 0.006, 2.45, 19.5);
    this.orbit.userOverrideUntil = performance.now() + 6500;
  },

  resetCamera: function () {
    this.closeUpSeatId = null;
    if (!this.orbit) return;
    this.orbit.userOverrideUntil = 0;
    this.orbit.targetYaw = 0;
    this.orbit.targetPitch = this.camPreset === "overview" ? 0.96 : 0.52;
    this.orbit.targetRadius = this.camPreset === "overview" ? 12.8 : 11.2;
    if (this.orbit.targetLookAt && typeof this.orbit.targetLookAt.set === "function") {
      this.orbit.targetLookAt.set(0, 1.35, 0);
    }
    this.orbit.fpTargetYaw = 0;
    this.orbit.fpTargetPitch = -0.10;
    this.orbit.fpFovOffset = 0;
    if (this.camera && typeof this.camera.updateProjectionMatrix === "function") {
      this.camera.fov = this.camPreset === "firstperson" ? this.getFirstPersonBaseFov() : 44;
      this.camera.updateProjectionMatrix();
    }
  },

  updateCamera: function (f) {
    const o = this.orbit;
    const nowMs = f.nowMs;
    const p = f.p;
    const dt60 = clamp(Number(f.dt60) || 1, 0.05, 3.0);

    if (this.showcaseMode && this.hero) {
      const tgt = this.showcaseTarget || "hero";
      const anchorObj = (tgt !== "hero" && this.seats && this.seats.anchors && this.seats.anchors[tgt])
        ? this.seats.anchors[tgt].worldPos
        : null;
      const hp = anchorObj || this.hero.root.position;
      if (!o.dragging && nowMs > o.userOverrideUntil) {
        o.targetYaw += 0.0045 * dt60;
        o.targetPitch = anchorObj ? 0.24 : 0.18;
        o.targetRadius = clamp(o.targetRadius, 2.6, 5.4);
        o.targetLookAt.set(hp.x, hp.y + (anchorObj ? 1.50 : 1.58), hp.z);
      }
      o.targetPitch = clamp(o.targetPitch, 0.06, 0.68);
      const smS = dampFactor3D(o.dragging ? 0.25 : 0.09, dt60);
      o.yaw += (o.targetYaw - o.yaw) * smS;
      o.pitch += (o.targetPitch - o.pitch) * smS;
      o.radius += (o.targetRadius - o.radius) * smS;
      o.lookAt.lerp(o.targetLookAt, smS);
      const hz = Math.cos(o.pitch) * o.radius;
      this.camera.position.set(
        o.lookAt.x + Math.sin(o.yaw) * hz,
        o.lookAt.y + Math.sin(o.pitch) * o.radius,
        o.lookAt.z + Math.cos(o.yaw) * hz
      );
      this.camera.lookAt(o.lookAt);
      this.camera.updateMatrixWorld();
      return;
    }

    if (this.camPreset === "firstperson") {
      // Authentic Seated Eye-Level Round-Table POV (eye-to-eye framing, unobstructed tabletop props, smart face tracking!)
      const eye = this.getFirstPersonSeatEye();
      const pidNow = eye.pid;
      const punch = this.cameraPunch;
      if (punch && punch.pending) {
        punch.pending = false;
        punch.until = nowMs + (punch.durationMs || 1250);
      }
      const isFpPunch = Boolean(punch && nowMs < punch.until && punch.seatId && punch.seatId !== pidNow && this.seats.anchors[punch.seatId]);
      const isPickStage = (p === "DAY_VOTE" || p === "DAY_PLAYER_TURN" || p === "NIGHT_GUARD" || p === "NIGHT_SEER" || p === "NIGHT_WOLF" || p === "NIGHT_WITCH" || p === "HUNTER_TRIGGER");
      const shReelId = (p === "SHERIFF_ELECTION" && state.match && state.match.sheriffElectionCtx) ? state.match.sheriffElectionCtx.activeReelSeatId : null;
      const activeSpId = ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId && state.activeSpeakerId !== pidNow)
        ? state.activeSpeakerId
        : ((shReelId && shReelId !== pidNow) ? shReelId : null);

      let fpFocusLeanFov = 0;
      if (!o.dragging && nowMs > o.userOverrideUntil) {
        if (state.cardPeek3D && state.match && state.match.started) {
          // Gently dip gaze down onto your own flipped 3D Secret Role Card!
          o.fpTargetYaw = 0;
          o.fpTargetPitch = -0.34;
          fpFocusLeanFov = -5;
        } else if (isFpPunch) {
          const pp = this.seats.anchors[punch.seatId].headPos;
          const angP = this.computeFirstPersonAnglesToPoint(pp, eye);
          o.fpTargetYaw = angP.yaw;
          o.fpTargetPitch = angP.pitch;
          fpFocusLeanFov = -5.5;
        } else if (activeSpId && this.seats.anchors[activeSpId]) {
          const sp = this.seats.anchors[activeSpId].headPos;
          const angS = this.computeFirstPersonAnglesToPoint(sp, eye);
          o.fpTargetYaw = angS.yaw;
          o.fpTargetPitch = angS.pitch;
          fpFocusLeanFov = -3.5;
        } else if (isPickStage && state.selectedSeatId && state.selectedSeatId !== pidNow && this.seats.anchors[state.selectedSeatId]) {
          const selPos = this.seats.anchors[state.selectedSeatId].headPos;
          const angSel = this.computeFirstPersonAnglesToPoint(selPos, eye);
          o.fpTargetYaw = angSel.yaw;
          o.fpTargetPitch = angSel.pitch;
          fpFocusLeanFov = -2.5;
        } else {
          // Steady, poised gaze straight across the lotus centerpiece into the opposite players' eyes!
          o.fpTargetYaw = 0;
          o.fpTargetPitch = isPickStage ? -0.14 : -0.10;
          fpFocusLeanFov = isPickStage ? 3.5 : 0;
        }
      }

      const dramaFocusFp = typeof isDramaticFocusActive === "function" && isDramaticFocusActive(nowMs);
      if (typeof document !== "undefined" && document.body && document.body.classList) {
        document.body.classList.toggle("is-seat-focus-vignette", Boolean(dramaFocusFp));
      }
      if (typeof this.camera.fov === "number") {
        const rawFpFov = this.getFirstPersonBaseFov() + (o.fpFovOffset || 0) + fpFocusLeanFov;
        const targetFpFov = clamp(dramaFocusFp ? (rawFpFov * 0.92) : rawFpFov, 37, 78);
        const diffFpFov = targetFpFov - this.camera.fov;
        if (Math.abs(diffFpFov) > 0.05) {
          this.camera.fov += diffFpFov * dampFactor3D(0.12, dt60);
          this.camera.updateProjectionMatrix();
        } else if (this.camera.fov !== targetFpFov) {
          this.camera.fov = targetFpFov;
          this.camera.updateProjectionMatrix();
        }
      }

      const sm = dampFactor3D(o.dragging ? 0.28 : (isFpPunch ? 0.14 : 0.09), dt60);
      o.fpYaw += (o.fpTargetYaw - o.fpYaw) * sm;
      o.fpPitch += (o.fpTargetPitch - o.fpPitch) * sm;

      let cx = eye.x;
      let cy = eye.y + Math.sin(f.tSec * 1.35) * 0.014;
      let cz = eye.z;
      if (nowMs < state.shakeUntil) {
        cx += (Math.random() - 0.5) * 0.12;
        cy += (Math.random() - 0.5) * 0.12;
      }
      this.camera.position.set(cx, cy, cz);
      const lookDist = 6.5;
      const absYaw = eye.baseYaw + o.fpYaw;
      const horizLook = Math.cos(o.fpPitch) * lookDist;
      const lx = cx + Math.sin(absYaw) * horizLook;
      const ly = cy + Math.sin(o.fpPitch) * lookDist;
      const lz = cz - Math.cos(absYaw) * horizLook;
      this.camera.lookAt(lx, ly, lz);
      this.camera.updateMatrixWorld();
      return;
    }

    // Cinema or Tactical Overview Orbit Camera (with Double-Click Character Close-Up Inspection & 10/12-seat framing!)
    const activeSeatCount = typeof getActive3DSeatCount === "function"
      ? getActive3DSeatCount()
      : ((state.match && state.match.started) ? (state.match.totalSeats || 8) : (typeof getLobbySeatCount === "function" ? getLobbySeatCount() : 8));
    const camLayout = typeof get3DTableLayout === "function" ? get3DTableLayout(activeSeatCount) : null;
    const largeTableR = camLayout ? (camLayout.camExtraR || 0) : (activeSeatCount >= 12 ? 2.15 : (activeSeatCount >= 10 ? 1.15 : 0));
    let frontShotFov = null;
    let isFrontShot = false;
    if (!o.dragging && nowMs > o.userOverrideUntil) {
      if (this.closeUpSeatId && this.seats.anchors[this.closeUpSeatId]) {
        const frInspect = this.computeSeatFrontFraming(this.closeUpSeatId, "inspect");
        if (frInspect) {
          o.targetYaw = frInspect.yaw;
          o.targetPitch = frInspect.pitch;
          o.targetRadius = frInspect.radius;
          o.targetLookAt.set(frInspect.lookX, frInspect.lookY, frInspect.lookZ);
          frontShotFov = frInspect.fov;
          isFrontShot = true;
        }
      } else if (this.camPreset === "overview") {
        // Offset bird's-eye target forward (+Z) & pull radius back on desktop widescreen so ALL 12 seats + standing host Qingming sit cleanly ABOVE #controlDeck!
        const isLandscapeCam = (this.camera && this.camera.aspect ? this.camera.aspect : 1.6) >= 1.0;
        o.targetYaw = Math.sin(f.tSec * 0.08) * 0.08;
        o.targetPitch = isLandscapeCam ? 1.06 : 1.04;
        o.targetRadius = isLandscapeCam
          ? (15.6 + largeTableR * 2.15)
          : (14.0 + largeTableR * 1.45);
        o.targetLookAt.set(
          0,
          isLandscapeCam ? 0.52 : 0.72,
          isLandscapeCam ? (2.35 + largeTableR * 0.68) : (1.35 + largeTableR * 0.35)
        );
      } else if (!state.match.started || p === "LOBBY") {
        // Theatrical Indie Title Screen Framing: gentle sweep showing intimate table + Qingming + layered mountains & Cloud Isle
        o.targetYaw = -0.18 + Math.sin(f.tSec * 0.14) * 0.24;
        o.targetPitch = 0.34;
        o.targetRadius = 10.6 + largeTableR;
        o.targetLookAt.set(-0.92, 1.42, -0.95);
      } else if (f.night) {
        const nightFocusId = state.selectedSeatId || state.hoverSeatId;
        const nightAnchor = (nightFocusId && this.seats.anchors[nightFocusId]) ? this.seats.anchors[nightFocusId] : null;
        if (nightAnchor) {
          const np = nightAnchor.worldPos;
          o.targetYaw = -Math.sin(Math.atan2(np.x, np.z)) * 0.24;
          o.targetPitch = 0.60;
          o.targetRadius = 11.0 + largeTableR * 0.85;
          o.targetLookAt.set(np.x * 0.22, 0.68, np.z * 0.22 + 0.26);
        } else {
          o.targetYaw = Math.sin(f.tSec * 0.12) * 0.14;
          o.targetPitch = 0.65;
          o.targetRadius = 11.8 + largeTableR;
          o.targetLookAt.set(0, 0.56, 0.32);
        }
      } else if ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH" || p === "SHERIFF_ELECTION") && state.activeSpeakerId && this.seats.anchors[state.activeSpeakerId]) {
        // v11.3 True Front-Facing Medium / Half-Body Speaker Shot (builds vivid character recall while keeping face & hands clear above HUD!)
        const dayEvs = (state.match && state.match.daySpeechEvents) || [];
        const latestEv = dayEvs.length ? dayEvs[dayEvs.length - 1] : null;
        const isAccuseShot = Boolean(latestEv && latestEv.speakerId === state.activeSpeakerId && latestEv.accuseId);
        const isClaimShot = Boolean(latestEv && latestEv.speakerId === state.activeSpeakerId && latestEv.claimRole);
        const isPkSpeech = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive());
        const frSp = this.computeSeatFrontFraming(state.activeSpeakerId, (isClaimShot || isPkSpeech || isAccuseShot) ? "dramatic" : "speaker");
        if (frSp) {
          o.targetYaw = frSp.yaw + Math.sin(f.tSec * 0.42) * 0.035;
          o.targetPitch = frSp.pitch;
          o.targetRadius = frSp.radius;
          o.targetLookAt.set(frSp.lookX, frSp.lookY, frSp.lookZ);
          frontShotFov = frSp.fov;
          isFrontShot = true;
        }
      } else {
        let isDualConfrontation = false;
        _camRivalAnchors.length = 0;
        if (p === "DAY_VOTE" && isPkVoteActive()) {
          isDualConfrontation = true;
          const pkList = state.match.pkCandidates || [];
          for (let ri = 0; ri < pkList.length; ri++) {
            const anc = stage3d.seats.anchors[pkList[ri]];
            if (anc) _camRivalAnchors.push(anc);
          }
        } else if (p === "DAY_SPEECH" && !state.activeSpeakerId) {
          const allSeatsCam = (state.match && state.match.seats) || [];
          let seerClaimCount = 0;
          for (let si = 0; si < allSeatsCam.length; si++) {
            const sc = allSeatsCam[si];
            if (sc && sc.alive && sc.claimedRole === "seer") {
              seerClaimCount += 1;
              const anc = stage3d.seats.anchors[sc.id];
              if (anc) _camRivalAnchors.push(anc);
            }
          }
          if (seerClaimCount >= 2) isDualConfrontation = true;
          else _camRivalAnchors.length = 0;
        }
        if (isDualConfrontation) {
          // Dual-Rival Confrontation Framing (PK or Seer Clash! Zero per-frame array allocation)
          if (_camRivalAnchors.length >= 2) {
            const midX = (_camRivalAnchors[0].worldPos.x + _camRivalAnchors[1].worldPos.x) * 0.5;
            const midZ = (_camRivalAnchors[0].worldPos.z + _camRivalAnchors[1].worldPos.z) * 0.5;
            const axisAng = Math.atan2(_camRivalAnchors[1].worldPos.z - _camRivalAnchors[0].worldPos.z, _camRivalAnchors[1].worldPos.x - _camRivalAnchors[0].worldPos.x);
            o.targetYaw = Math.sin(axisAng) * 0.52;
            o.targetPitch = 0.56;
            o.targetRadius = 11.8 + largeTableR * 0.85;
            o.targetLookAt.set(midX * 0.32, 0.65, midZ * 0.32 + 0.35);
          } else {
            o.targetYaw = Math.sin(f.tSec * 0.2) * 0.16;
            o.targetPitch = 0.62;
            o.targetRadius = 12.4 + largeTableR;
            o.targetLookAt.set(0, 0.62, 0.35);
          }
        } else if (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT") {
          const leaderAnchor = (state.voteLeaderId && this.seats.anchors[state.voteLeaderId]) ? this.seats.anchors[state.voteLeaderId] : null;
          if (leaderAnchor) {
            const lp = leaderAnchor.worldPos;
            o.targetYaw = -Math.sin(Math.atan2(lp.x, lp.z)) * 0.32;
            o.targetPitch = 0.54;
            o.targetRadius = 11.5 + largeTableR * 0.85;
            o.targetLookAt.set(lp.x * 0.24, 0.68, lp.z * 0.24 + 0.32);
          } else {
            o.targetYaw = Math.sin(f.tSec * 0.2) * 0.16;
            o.targetPitch = 0.62;
            o.targetRadius = 12.4 + largeTableR;
            o.targetLookAt.set(0, 0.62, 0.35);
          }
        } else {
          o.targetYaw = 0;
          o.targetPitch = 0.54;
          o.targetRadius = 12.0 + largeTableR;
          o.targetLookAt.set(0, 0.64, 0.35);
        }
      }
    }

    const punch = this.cameraPunch;
    if (punch && punch.pending) {
      punch.pending = false;
      punch.until = nowMs + (punch.durationMs || 1250);
    }
    const isPunchActive = Boolean(punch && nowMs < punch.until && this.camPreset !== "firstperson" && !this.showcaseMode);
    if (isPunchActive && !o.dragging && nowMs > o.userOverrideUntil && punch.seatId && this.seats.anchors[punch.seatId]) {
      const frPunch = this.computeSeatFrontFraming(punch.seatId, "inspect");
      if (frPunch) {
        o.targetYaw = frPunch.yaw;
        o.targetPitch = frPunch.pitch;
        o.targetRadius = Math.min(frPunch.radius, 3.0);
        o.targetLookAt.set(frPunch.lookX, frPunch.lookY, frPunch.lookZ);
        frontShotFov = punch.fovTarget || 37;
        isFrontShot = true;
      }
    }

    if (typeof document !== "undefined" && document.body && document.body.classList) {
      document.body.classList.remove("is-seat-focus-vignette");
    }
    if (typeof this.camera.fov === "number" && !this.showcaseMode && this.camPreset !== "firstperson") {
      const dramaFocusCin = this.camPreset === "cinema" && typeof isDramaticFocusActive === "function" && isDramaticFocusActive(nowMs);
      const baseFov = frontShotFov !== null ? frontShotFov : (this.camPreset === "overview" ? 46 : 44);
      const focusedBaseFov = dramaFocusCin ? clamp(baseFov * 0.92, 33, 50) : baseFov;
      const targetFov = isPunchActive ? (punch.fovTarget || 37) : focusedBaseFov;
      const diffFov = targetFov - this.camera.fov;
      if (Math.abs(diffFov) > 0.04) {
        this.camera.fov += diffFov * dampFactor3D(0.14, dt60);
        this.camera.updateProjectionMatrix();
      } else if (this.camera.fov !== targetFov) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
    }

    const smooth = dampFactor3D(o.dragging ? 0.24 : (this.closeUpSeatId ? 0.135 : ((isPunchActive || isFrontShot) ? 0.115 : 0.07)), dt60);
    let dYaw = o.targetYaw - o.yaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    o.yaw += dYaw * smooth;
    if (o.yaw > Math.PI) o.yaw -= Math.PI * 2;
    if (o.yaw < -Math.PI) o.yaw += Math.PI * 2;
    o.pitch += (o.targetPitch - o.pitch) * smooth;
    o.radius += (o.targetRadius - o.radius) * smooth;
    o.lookAt.lerp(o.targetLookAt, smooth);

    const horiz = Math.cos(o.pitch) * o.radius;
    let camX = o.lookAt.x + Math.sin(o.yaw) * horiz;
    let camY = o.lookAt.y + Math.sin(o.pitch) * o.radius;
    let camZ = o.lookAt.z + Math.cos(o.yaw) * horiz;

    if (nowMs < state.shakeUntil) {
      camX += (Math.random() - 0.5) * 0.22;
      camY += (Math.random() - 0.5) * 0.22;
    }

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(o.lookAt);
    this.camera.updateMatrixWorld();
  },

  computeSeatPan: function (seatId) {
    if (!this.isActive() || !this.seats || !this.seats.anchors[seatId]) return 0;
    const anchor = this.seats.anchors[seatId];
    if (!this._panToSeat) this._panToSeat = new THREE.Vector3();
    if (!this._panCamRight) this._panCamRight = new THREE.Vector3();
    const toSeat = this._panToSeat.copy(anchor.headPos).sub(this.camera.position);
    const dist = Math.max(0.01, Math.hypot(toSeat.x, toSeat.y, toSeat.z));
    toSeat.multiplyScalar(1 / dist);
    const camRight = this._panCamRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const dot = camRight.x * toSeat.x + camRight.y * toSeat.y + camRight.z * toSeat.z;
    return clamp(dot * 0.85, -0.72, 0.72);
  },

  render: function (nowMs, overlayCanvas) {
    if (!this.isActive()) return null;
    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      if (this._perfLastMs) {
        const dt = nowMs - this._perfLastMs;
        // Track up to 650ms frames (down to ~1.5 FPS) so severely lagging / SwiftShader PCs still auto-downgrade smoothly!
        if (dt > 0 && dt < 650) {
          const sampleDt = Math.min(dt, 250);
          this._perfEmaMs = this._perfEmaMs ? (this._perfEmaMs * 0.90 + sampleDt * 0.10) : sampleDt;
          if (!this._fpsLabelLastMs || nowMs - this._fpsLabelLastMs > 1200) {
            this._fpsLabelLastMs = nowMs;
            if (this._perfEmaMs > 1) {
              this.updateGpuStatusUi();
            }
          }
          const isLoadingWarmup = Boolean(
            this.avatarActiveLoads > 0 ||
            (this.avatarQueue && this.avatarQueue.length > 0) ||
            (this._vrmWarmupUntil && nowMs < this._vrmWarmupUntil)
          );
          if (isLoadingWarmup) {
            this._perfSlowMs = 0;
          } else if (!this._manualQualityLock && state.quality3D !== "eco" && this._perfEmaMs > 30) {
            this._perfSlowMs = (this._perfSlowMs || 0) + sampleDt;
            if (this._perfSlowMs > 1800) {
              state.quality3D = (state.quality3D === "high") ? "balanced" : "eco";
              this.applyQualityMode();
              this._perfSlowMs = 0;
              this._perfEmaMs = 0;
              if (typeof showToast === "function") {
                showToast(
                  state.quality3D === "balanced"
                    ? "偵測到負載偏高，已平滑降至「均衡畫質」（保留陰影與光影色調）"
                    : "偵測到畫面負載較高，已自動切換為「省電流暢」3D 模式",
                  "sky"
                );
              }
            }
          } else if (!this._manualQualityLock && state.quality3D === "eco" && (this._ecoDprScale || 1) > 0.82 && this._perfEmaMs > 40) {
            this._perfSlowMs = (this._perfSlowMs || 0) + sampleDt;
            if (this._perfSlowMs > 2000) {
              this._ecoDprScale = 0.8;
              this._perfSlowMs = 0;
              this._perfEmaMs = 0;
              this.applyQualityMode();
            }
          } else {
            this._perfSlowMs = Math.max(0, (this._perfSlowMs || 0) - sampleDt * 0.5);
          }
        }
      }
      this._perfLastMs = nowMs;
    } else {
      this._perfLastMs = 0;
    }
    const p = state.match.phase;
    const night = isNightPhase(p) || (p === "GAME_OVER" && state.match.winner === "wolf");
    const daylight = state.match.started && !night && p !== "LOBBY";
    const dpr = this.getOverlayDpr();
    const rawDtMs = this._lastRenderMs ? (nowMs - this._lastRenderMs) : 16.6667;
    this._lastRenderMs = nowMs;
    const inHitStop = Boolean(typeof state !== "undefined" && state.fxHitStopUntil && nowMs < state.fxHitStopUntil);
    const dtSec = clamp(rawDtMs * 0.001, 0.001, 0.05) * (inHitStop ? 0.12 : 1.0);
    const dt60 = dtSec * 60;

    const f = {
      nowMs: nowMs,
      dt: dtSec,
      dt60: dt60,
      tSec: nowMs * 0.001,
      p: p,
      night: night,
      daylight: daylight,
      dpr: dpr,
      w: overlayCanvas ? overlayCanvas.width : 800,
      h: overlayCanvas ? overlayCanvas.height : 450,
      cx: overlayCanvas ? overlayCanvas.width * 0.5 : 400,
      cy: overlayCanvas ? overlayCanvas.height * 0.5 : 225
    };

    this.updateCamera(f);
    if (this.fpHandsGroup) {
      const showHands = this.camPreset === "firstperson";
      this.fpHandsGroup.visible = showHands;
      if (showHands) {
        const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
        const sAnchor = this.seats && this.seats.anchors ? this.seats.anchors[pidNow] : null;
        this.fpHandsGroup.rotation.y = sAnchor ? Math.atan2(sAnchor.worldPos.x, sAnchor.worldPos.z) : 0;
        this.fpHandsGroup.position.y = Math.sin(f.tSec * 2.1) * 0.025;
      }
    }
    const coords = update3DSeats(this.seats, this.camera, f, f.w, f.h, this.fx, this.camPreset);
    if (this.hero && typeof updateHeroCharacter === "function") {
      updateHeroCharacter(this.hero, this.camera, f, this.fx, this.showcaseMode);
    }
    update3DEnvironment(this.scene, this.env, f, this.seats.anchors);
    update3DEffects(this.fx, this.seats.anchors, f);

    // Sync 3D Spatial Stereo Panning for the active speaking character!
    if (typeof sound !== "undefined" && typeof sound.setVoicePan === "function") {
      const spId = state.activeSpeakerId;
      sound.setVoicePan(spId ? this.computeSeatPan(spId) : 0);
    }

    const punch = this.cameraPunch;
    const isPunchGlow = Boolean(punch && f.nowMs < punch.until && (punch.until - f.nowMs) < 5000);
    const flashEnd = state.screenFlash ? (state.screenFlash.until || ((state.screenFlash.born || 0) + (state.screenFlash.duration || 0))) : 0;
    const isFlashGlow = Boolean(state.screenFlash && f.nowMs < flashEnd && (flashEnd - f.nowMs) < 5000);
    const harmonyBoost = (f.daylight && state.match && typeof state.match.harmonyScore === "number" && state.match.harmonyScore >= 75) ? 0.05 : 0;
    const dynExpBoost = harmonyBoost + (isPunchGlow ? 0.05 : 0) + (isFlashGlow ? 0.06 : 0);

    if (this.renderer && this.renderer.shadowMap && this.renderer.shadowMap.enabled) {
      if (state.quality3D === "eco") {
        if (!this._shadowBakedOnce) {
          this._shadowBakedOnce = true;
          this.renderer.shadowMap.needsUpdate = true;
        }
      } else {
        this._shadowFrameCounter = (this._shadowFrameCounter || 0) + 1;
        const shadowStride = this.getShadowUpdateStride();
        if (!this._shadowBakedOnce || (this._shadowFrameCounter % shadowStride === 0)) {
          this._shadowBakedOnce = true;
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
    }

    // Keep PostFX gradePass locked on all hardware GPUs so renderer.toneMapping NEVER flips (eliminates 6s shader recompile stalls!)
    const usePostFxNow = Boolean(this.postfx && !this.isSoftwareRenderer);
    if (usePostFxNow) {
      // Single authoritative ACES Filmic pass inside PostFX gradePass (prevents double tone-mapping compression!)
      if (this.renderer && THREE.NoToneMapping !== undefined && this.renderer.toneMapping !== THREE.NoToneMapping) {
        this.renderer.toneMapping = THREE.NoToneMapping;
      }
      // v23.3 Fillrate Saver: Bypass 11-pass UnrealBloomPass in eco/balanced mode, iGPU, or 10-12 seat rooms while preserving crisp 1-pass ACES + FXAA gradePass!
      if (this.postfx && this.postfx.bloomPass) {
        const nSeatsNow = (state.match && Array.isArray(state.match.seats) && state.match.seats.length)
          ? state.match.seats.length
          : (state.setupSeatCount || 8);
        this.postfx.bloomPass.enabled = Boolean(state.quality3D === "high" && !this.isIntegratedGpu && nSeatsNow < 10);
      }
      if (typeof this.postfx.setDynamicExposure === "function") {
        this.postfx.setDynamicExposure(dynExpBoost, f.dt60);
      }
      this.postfx.updateMood(f, (state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72);
      this.postfx.render();
    } else {
      if (this.renderer && THREE.ACESFilmicToneMapping !== undefined) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        if (typeof this.renderer.toneMappingExposure === "number") {
          const targetExposure = 1.02 + dynExpBoost;
          this.renderer.toneMappingExposure += (targetExposure - this.renderer.toneMappingExposure) * dampFactor3D(0.14, f.dt60);
        }
      }
      this.renderer.render(this.scene, this.camera);
    }
    return { f: f, coords: coords };
  }
};

/**
 * 3D 模式下的精簡透明 HUD 上層（保留狀態徽章、對話氣泡、Hover 提示與浮動特效字；
 * 能量光束、關係線與拖曳光弧皆已由真實 3D 場景直接繪製！）
 */
function draw3DOverlayHud(ctx, f, coords) {
  const { dpr, p } = f;
  const isOver = p === "GAME_OVER";
  const inMatch = Boolean(state.match && state.match.started && !isOver);
  const isPickPhase = (p === "NIGHT_GUARD" || p === "NIGHT_SEER" || p === "NIGHT_WOLF" || p === "NIGHT_WITCH" || p === "HUNTER_TRIGGER" || p === "DAY_VOTE" || p === "DAY_PLAYER_TURN");
  const activelyVoicing = Boolean((state.typewriter && state.typewriter.active) || (typeof voice !== "undefined" && voice.speaking));

  // Cached HUD top/bottom safe bounds (refreshed at ~2Hz or on size/phase change — zero per-frame Forced Synchronous Layout!)
  let topSafeY = 56 * dpr;
  let bottomSafeY = f.h - 10 * dpr;
  if (typeof document !== "undefined") {
    const cache = draw3DOverlayHud._safeCache || (draw3DOverlayHud._safeCache = { at: 0, w: 0, h: 0, p: "", inMatch: false, top: 56 * dpr, bottom: f.h - 10 * dpr });
    const needRefresh = (f.nowMs - cache.at) > 450 || cache.w !== f.w || cache.h !== f.h || cache.p !== p || cache.inMatch !== inMatch;
    if (needRefresh) {
      let nextTop = 56 * dpr;
      let nextBottom = f.h - 10 * dpr;
      const cvEl = el("sanctuaryCanvas");
      const cvRect = cvEl && typeof cvEl.getBoundingClientRect === "function" ? cvEl.getBoundingClientRect() : null;
      if (cvRect && cvRect.height > 80) {
        const topHudEl = el("inGameTopHud");
        if (topHudEl && !topHudEl.classList.contains("hidden") && typeof topHudEl.getBoundingClientRect === "function") {
          const tr = topHudEl.getBoundingClientRect();
          if (tr.height > 0 && tr.bottom > cvRect.top) {
            nextTop = Math.max(nextTop, Math.min(f.h * 0.36, (tr.bottom - cvRect.top + 8) * dpr));
          }
        }
        const deckEl = el("controlDeck");
        if (deckEl && inMatch && typeof deckEl.getBoundingClientRect === "function") {
          const dr = deckEl.getBoundingClientRect();
          if (dr.height > 0 && dr.top > cvRect.top + 80 && dr.top < cvRect.bottom - 16) {
            nextBottom = Math.max(nextTop + 42 * dpr, (dr.top - cvRect.top - 8) * dpr);
          }
        }
      }
      cache.at = f.nowMs;
      cache.w = f.w;
      cache.h = f.h;
      cache.p = p;
      cache.inMatch = inMatch;
      cache.top = nextTop;
      cache.bottom = nextBottom;
    }
    topSafeY = cache.top;
    bottomSafeY = cache.bottom;
  }

  const ROLE_SHORT_3D = {
    seer: "觀察員", witch: "奉茶師", hunter: "糾察長", guard: "守衛",
    elder: "長老", villager: "書院生", wolf: "酸民狼", wolf_king: "流言首領"
  };

  const sorted = coords.slice().sort(function (a, b) { return (b.zDepth || 0) - (a.zDepth || 0); });
  const plates = [];
  sorted.forEach(function (node) {
    if (node.visibleInView === false) return;
    const s = node.seat;
    const sx = node.x;
    const sy = node.y;
    const drawR = node.r;
    const isSpeaking = (((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "SHERIFF_ELECTION") && s.alive) || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id;
    const isSelected = Boolean(inMatch && isPickPhase && state.selectedSeatId === s.id);
    const isSheriff = Boolean(inMatch && !state.match.sheriffElectionPending && s.alive && state.match.sheriffSeatId === s.id);
    const sheriffPrefix = isSheriff ? "[警長] " : "";
    const mark = state.playerMarks[s.id];
    const showTruth = isOver || (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());
    const pSelf3D = state.match.started && typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    const isWolfViewer3D = Boolean(inMatch && !showTruth && !state.hidePlayerRole && pSelf3D && pSelf3D.role === "wolf");
    const isWolfMate3D = Boolean(isWolfViewer3D && s.role === "wolf" && s.id !== getPlayerId());
    const wolfGodKey3D = (isWolfViewer3D && !isWolfMate3D && state.match.wolfGodMarks) ? state.match.wolfGodMarks[s.id] : "";
    const wolfGodLabel3D = (wolfGodKey3D && typeof getWolfGodMarkDef === "function") ? getWolfGodMarkDef(wolfGodKey3D).label : "";

    // v19.0 0.3s Instant-Recognition Floating Seat Plate: 22px bold seat number + clean 2-char name (zero club-title clutter!)
    let topTag = "";
    let topBg = "rgba(20, 16, 12, 0.90)";
    let topBorder = "rgba(212, 166, 87, 0.58)";
    let topFg = "#f7f0e2";
    let numFg = "#f5c451";
    let isSubtleNameplate = false;
    let isDeadPlate = !s.alive;
    let prio = 1;
    const sRoleDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(s) : null) || ROLE_DEFS[s.role];
    const sCompactName = s.id === getPlayerId() ? "你" : s.name;
    const numLabel = fmtSeatNum(s.id);
    if (isSpeaking) {
      const spSuffix = !s.alive ? " · 遺言" : (activelyVoicing || p === "DAY_PLAYER_TURN" ? " · 發言" : "");
      topTag = sheriffPrefix + sCompactName + spSuffix;
      topBg = "rgba(13, 11, 10, 0.86)";
      topBorder = "rgba(226, 192, 122, 0.82)";
      topFg = "#faf3e4";
      numFg = "#ecc472";
      prio = 5;
    } else if (!s.alive) {
      topTag = showTruth && sRoleDef ? (sCompactName + " · " + (ROLE_SHORT_3D[s.role] || sRoleDef.name)) : (sCompactName + " · 離席");
      topBg = "rgba(16, 15, 14, 0.62)";
      topBorder = "rgba(148, 138, 124, 0.24)";
      topFg = "#8e867c";
      numFg = "#756e66";
    } else if (showTruth && sRoleDef) {
      topTag = sheriffPrefix + sCompactName + " · " + sRoleDef.name;
      topBg = "rgba(14, 12, 11, 0.84)";
      topBorder = s.role === "wolf" ? "rgba(208, 92, 80, 0.72)" : "rgba(92, 169, 141, 0.68)";
      topFg = "#f5ede0";
      numFg = s.role === "wolf" ? "#ea9e96" : "#9ad3bd";
      prio = 3;
    } else if (isSelected) {
      topTag = sheriffPrefix + sCompactName + " · 鎖定";
      topBg = "rgba(24, 14, 12, 0.88)";
      topBorder = "rgba(214, 96, 82, 0.78)";
      topFg = "#fbf4ea";
      numFg = "#f0b4a8";
      prio = 4;
    } else if (isWolfMate3D) {
      topTag = sheriffPrefix + sCompactName + " · 同伴";
      topBg = "rgba(26, 13, 14, 0.86)";
      topBorder = "rgba(214, 96, 86, 0.72)";
      topFg = "#f9e3e1";
      numFg = "#eba49c";
      prio = 3;
    } else if (state.match.started && s.id !== getPlayerId() && (state.match.microPulseRevealed || s.sweatExposed)) {
      topTag = sheriffPrefix + sCompactName + " · 心虛" + s.microPulse + "%";
      topBg = "rgba(14, 12, 11, 0.84)";
      topBorder = s.microPulse >= 60 ? "rgba(208, 92, 80, 0.68)" : "rgba(92, 169, 141, 0.62)";
      topFg = "#f5ede0";
      numFg = "#e2c27e";
      prio = 2;
    } else if (s.claimedRole && ROLE_DEFS[s.claimedRole]) {
      const cShort = ROLE_SHORT_3D[s.claimedRole] || ROLE_DEFS[s.claimedRole].name;
      topTag = sheriffPrefix + sCompactName + " · " + cShort;
      topBg = "rgba(15, 13, 11, 0.82)";
      topBorder = "rgba(216, 184, 118, 0.62)";
      topFg = "#f5ede0";
      numFg = "#e2c27e";
      prio = 3;
    } else if (wolfGodLabel3D) {
      topTag = sheriffPrefix + sCompactName + " · " + wolfGodLabel3D;
      topBg = "rgba(16, 13, 11, 0.84)";
      topBorder = "rgba(216, 184, 118, 0.64)";
      topFg = "#f5ede0";
      numFg = "#e2c27e";
      prio = 2;
    } else if (mark === "wolf") {
      topTag = sheriffPrefix + sCompactName + (isWolfViewer3D ? " · 甩鍋" : " · 懷疑");
      topBg = "rgba(18, 12, 12, 0.82)";
      topBorder = "rgba(204, 88, 76, 0.64)";
      topFg = "#f5ede0";
      numFg = "#e8a29a";
      prio = 2;
    } else if (mark === "good") {
      topTag = sheriffPrefix + sCompactName + (isWolfViewer3D ? " · 假保" : " · 信任");
      topBg = "rgba(12, 18, 16, 0.82)";
      topBorder = "rgba(92, 169, 141, 0.60)";
      topFg = "#f5ede0";
      numFg = "#9ad3bd";
      prio = 2;
    } else if (state.hoverSeatId === s.id) {
      topTag = sheriffPrefix + sCompactName;
      topBg = "rgba(16, 14, 12, 0.88)";
      topBorder = "rgba(222, 188, 120, 0.72)";
      topFg = "#fff8ea";
      numFg = "#e8c474";
      prio = 3;
    } else if (inMatch && isSheriff) {
      isSubtleNameplate = true;
      topTag = sheriffPrefix + sCompactName;
      topBg = "rgba(14, 12, 10, 0.78)";
      topBorder = "rgba(222, 188, 120, 0.62)";
      topFg = "#f3e2be";
      numFg = "#e8c474";
      prio = 2;
    } else if (inMatch && s.alive) {
      isSubtleNameplate = true;
      topTag = sCompactName;
      topBg = "rgba(13, 12, 11, 0.72)";
      topBorder = "rgba(216, 185, 124, 0.28)";
      topFg = "#ebe2d2";
      numFg = "#d8b878";
      prio = 1;
    }

    if (topTag) {
      const isNarrowFont = (f.w / Math.max(1, dpr)) < 600;
      const speakScale = isSpeaking ? 1.08 : 1.0;
      const numPx = Math.round((isNarrowFont ? 13 : (isSubtleNameplate ? 14 : 15)) * speakScale * dpr);
      const namePx = Math.round((isNarrowFont ? 12 : 13) * (isSpeaking ? 1.06 : 1.0) * dpr);
      const numFont = "600 " + numPx + "px 'Noto Serif TC', Georgia, serif";
      const nameFont = "500 " + namePx + "px 'Noto Sans TC', 'Microsoft JhengHei UI', sans-serif";
      ctx.font = numFont;
      const numW = ctx.measureText(numLabel).width;
      ctx.font = nameFont;
      const nameW = ctx.measureText(topTag).width;
      const gapX = Math.round(5.5 * dpr);
      const padH = Math.round((isSpeaking ? 12 : 9) * dpr);
      const tW = numW + gapX + nameW + padH * 2;
      const tH = Math.round((isNarrowFont ? 21 : (isSpeaking ? 30 : 25)) * dpr);
      const closeUpLift = drawR > 58 * dpr ? 0.68 : 0.46;
      const rawY = sy - drawR * closeUpLift - tH - 4 * dpr;
      // Hide low-priority subtle nameplates whose character sits buried behind the bottom #controlDeck so zero labels bleed through chips!
      if (isSubtleNameplate && prio <= 1 && rawY > bottomSafeY + 24 * dpr) return;
      const maxPlateY = Math.max(topSafeY, bottomSafeY - tH);
      const baseX = clamp(sx, tW * 0.5 + 6 * dpr, Math.max(tW * 0.5 + 6 * dpr, f.w - tW * 0.5 - 6 * dpr));
      const baseY = clamp(rawY, topSafeY, maxPlateY);
      plates.push({
        seatId: s.id, anchorX: sx, anchorY: sy - drawR * 0.35,
        x: baseX, y: baseY, origY: baseY, w: tW, h: tH,
        numLabel: numLabel, numW: numW, gapX: gapX, padH: padH,
        topTag: topTag, topBg: topBg, topBorder: topBorder, topFg: topFg, numFg: numFg,
        numFont: numFont, font: nameFont, isSubtle: isSubtleNameplate, isSpeaking: isSpeaking, isDead: isDeadPlate, prio: prio
      });
    }
  });

  // Subtle identity nameplate for standing Academy Tea Host「清茗」so players immediately recognize her even in settled overview!
  if (typeof stage3d !== "undefined" && stage3d.hero && stage3d.hero.root && stage3d.hero.root.visible && !stage3d.showcaseMode && stage3d.camera && typeof THREE !== "undefined") {
    const hp = stage3d.hero.root.position;
    const hostHead = draw3DOverlayHud._hostHeadVec || (draw3DOverlayHud._hostHeadVec = new THREE.Vector3());
    hostHead.set(hp.x, hp.y + 2.28, hp.z);
    hostHead.project(stage3d.camera);
    if (hostHead.z > -1 && hostHead.z < 1 && Math.abs(hostHead.x) < 0.96 && hostHead.y > -0.95 && hostHead.y < 1.14) {
      const hx = (hostHead.x * 0.5 + 0.5) * f.w;
      const hy = (-hostHead.y * 0.5 + 0.5) * f.h;
      const hFont = "700 " + Math.round(13 * dpr) + "px 'Noto Serif TC', 'Noto Sans TC', serif";
      const hTag = "清茗";
      ctx.font = hFont;
      const hW = ctx.measureText(hTag).width + 18 * dpr;
      const hH = 22 * dpr;
      const clampedHy = clamp(hy - hH * 0.5, topSafeY, Math.max(topSafeY, bottomSafeY - hH));
      if (hy <= bottomSafeY + 12 * dpr) {
        plates.push({
          seatId: 0, anchorX: hx, anchorY: Math.max(topSafeY + hH, hy + hH),
          x: clamp(hx, hW * 0.5 + 6 * dpr, Math.max(hW * 0.5 + 6 * dpr, f.w - hW * 0.5 - 6 * dpr)),
          y: clampedHy,
          origY: clampedHy,
          w: hW, h: hH,
          topTag: hTag,
          topBg: "rgba(38, 28, 16, 0.80)",
          topBorder: "rgba(212, 166, 87, 0.62)",
          topFg: "#f5dfac",
          font: hFont, isSubtle: true, prio: 0
        });
      }
    }
  }

  // 3-pass Screen-Space AABB Anti-Overlap Solver (vertical + horizontal nudge when clamped near topSafeY!)
  const padX = 4 * dpr;
  const padY = 3 * dpr;
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < plates.length; i++) {
      for (let j = i + 1; j < plates.length; j++) {
        const a = plates[i];
        const b = plates[j];
        const overlapX = (a.w + b.w) * 0.5 + padX - Math.abs(a.x - b.x);
        const overlapY = (a.h + b.h) * 0.5 + padY - Math.abs((a.y + a.h * 0.5) - (b.y + b.h * 0.5));
        if (overlapX > 0 && overlapY > 0) {
          const pushUp = (a.prio >= b.prio) ? b : a;
          const fixed = (pushUp === b) ? a : b;
          const nearTop = pushUp.y <= topSafeY + 6 * dpr && fixed.y <= topSafeY + 6 * dpr;
          if (nearTop && overlapX < overlapY * 2.8) {
            const dirX = (pushUp.x <= fixed.x) ? -1 : 1;
            pushUp.x = clamp(pushUp.x + dirX * (overlapX * 0.6 + 2 * dpr), pushUp.w * 0.5 + 4 * dpr, Math.max(pushUp.w * 0.5 + 4 * dpr, f.w - pushUp.w * 0.5 - 4 * dpr));
            pushUp.y = clamp(pushUp.y + (overlapY + 2 * dpr), topSafeY, Math.max(topSafeY, bottomSafeY - pushUp.h));
          } else {
            const dirY = (pushUp.y <= fixed.y && !nearTop) ? -1 : 1;
            pushUp.y = clamp(pushUp.y + dirY * (overlapY + 2 * dpr), topSafeY, Math.max(topSafeY, bottomSafeY - pushUp.h));
          }
        }
      }
    }
  }

  plates.forEach(function (pl) {
    ctx.save();
    if (pl.isDead) ctx.globalAlpha = 0.62;
    if (Math.abs(pl.y - pl.origY) > 8 * dpr) {
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y + pl.h);
      ctx.lineTo(pl.anchorX, pl.anchorY);
      ctx.strokeStyle = pl.topBorder;
      ctx.lineWidth = 1.2 * dpr;
      ctx.globalAlpha = pl.isDead ? 0.32 : 0.58;
      ctx.stroke();
      ctx.globalAlpha = pl.isDead ? 0.62 : 1.0;
    }
    if (pl.isSpeaking) {
      ctx.shadowColor = "rgba(245, 196, 81, 0.58)";
      ctx.shadowBlur = 14 * dpr;
    }
    drawRoundedRect(ctx, pl.x - pl.w * 0.5, pl.y, pl.w, pl.h, 7 * dpr);
    ctx.fillStyle = pl.topBg;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = (pl.isSpeaking ? 2.0 : (pl.isSubtle ? 1.1 : 1.4)) * dpr;
    ctx.strokeStyle = pl.topBorder;
    ctx.stroke();

    ctx.textBaseline = "middle";
    if (pl.numLabel && pl.numFont) {
      const leftX = pl.x - pl.w * 0.5 + (pl.padH || 9 * dpr);
      ctx.textAlign = "left";
      ctx.font = pl.numFont;
      ctx.fillStyle = pl.numFg || pl.topFg;
      ctx.fillText(pl.numLabel, leftX, pl.y + pl.h * 0.52);
      ctx.font = pl.font;
      ctx.fillStyle = pl.topFg;
      ctx.fillText(pl.topTag, leftX + (pl.numW || 0) + (pl.gapX || 5 * dpr), pl.y + pl.h * 0.53);
    } else {
      ctx.textAlign = "center";
      ctx.font = pl.font;
      ctx.fillStyle = pl.topFg;
      ctx.fillText(pl.topTag, pl.x, pl.y + pl.h * 0.53);
    }
    ctx.restore();
  });

  // Seated POV (firstperson) Edge-Glance Indicators: clickable left/right turn arrows for off-screen speakers or neighbors!
  state.fpGlanceButtons = [];
  if (typeof stage3d !== "undefined" && stage3d.camPreset === "firstperson" && !stage3d.showcaseMode) {
    const pidEdge = typeof getPlayerId === "function" ? getPlayerId() : 1;
    const offLeft = [];
    const offRight = [];
    coords.forEach(function (node) {
      if (node.visibleInView || !node.offScreenDir || node.id === pidEdge || !node.seat) return;
      const isSpk = Boolean(state.activeSpeakerId === node.id && (node.seat.alive || p === "LAST_WORDS_SPEECH"));
      const isSel = Boolean(state.selectedSeatId === node.id);
      const weight = (isSpk ? 100 : 0) + (isSel ? 50 : 0) + (node.seat.alive ? 10 : 0);
      const item = { node: node, isSpk: isSpk, isSel: isSel, weight: weight };
      if (node.offScreenDir < 0) offLeft.push(item);
      else offRight.push(item);
    });
    offLeft.sort(function (a, b) { return b.weight - a.weight; });
    offRight.sort(function (a, b) { return b.weight - a.weight; });

    const drawEdgeGlance = function (list, side) {
      if (!list.length) return;
      const best = list[0];
      const s = best.node.seat;
      const btnKey = (side < 0 ? "L:" : "R:") + s.id;
      const isHoverBtn = state.hoverFpGlanceKey === btnKey;
      const extraCnt = list.length > 1 ? (" +" + (list.length - 1)) : "";
      const tag = side < 0
        ? ("◀ " + fmtSeatNum(s.id) + " " + s.name + (best.isSpk ? "・發言" : extraCnt))
        : (fmtSeatNum(s.id) + " " + s.name + (best.isSpk ? "・發言" : extraCnt) + " ▶");
      ctx.save();
      const font = "700 " + Math.round(10.5 * dpr) + "px 'Noto Serif TC', 'Noto Sans TC', serif";
      ctx.font = font;
      const bw = ctx.measureText(tag).width + 18 * dpr;
      const bh = 24 * dpr;
      const bx = side < 0 ? (12 * dpr) : (f.w - bw - 12 * dpr);
      const by = clamp(f.h * 0.44 - bh * 0.5, 64 * dpr, Math.max(64 * dpr, f.h - bh - 120 * dpr));
      drawRoundedRect(ctx, bx, by, bw, bh, 12 * dpr);
      ctx.fillStyle = best.isSpk
        ? (isHoverBtn ? "rgba(196, 62, 46, 0.96)" : "rgba(166, 50, 38, 0.92)")
        : (isHoverBtn ? "rgba(44, 33, 22, 0.94)" : "rgba(22, 17, 13, 0.84)");
      ctx.fill();
      ctx.lineWidth = (isHoverBtn ? 1.6 : 1.2) * dpr;
      ctx.strokeStyle = best.isSpk || isHoverBtn ? "rgba(250, 224, 156, 0.94)" : "rgba(212, 166, 87, 0.65)";
      ctx.stroke();
      ctx.fillStyle = best.isSpk || isHoverBtn ? "#fff8eb" : "#f5e6c8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tag, bx + bw * 0.5, by + bh * 0.52);
      ctx.restore();
      state.fpGlanceButtons.push({ key: btnKey, seatId: s.id, isRecenter: false, x: bx, y: by, w: bw, h: bh });
    };
    drawEdgeGlance(offLeft, -1);
    drawEdgeGlance(offRight, 1);

    // Subtle 1-click Recenter Pill whenever player has turned head or zoomed away from front center
    const isOffCenterFp = Math.abs(stage3d.orbit.fpYaw || 0) > 0.34 || Math.abs(stage3d.orbit.fpFovOffset || 0) > 3;
    if (isOffCenterFp) {
      const recKey = "RECENTER";
      const isHoverRec = state.hoverFpGlanceKey === recKey;
      const recTag = "↺ 回正視線";
      ctx.save();
      const rFont = "700 " + Math.round(10 * dpr) + "px 'Noto Sans TC', sans-serif";
      ctx.font = rFont;
      const rw = ctx.measureText(recTag).width + 18 * dpr;
      const rh = 22 * dpr;
      const rx = (f.w - rw) * 0.5;
      const ry = Math.max(54 * dpr, Math.min(72 * dpr, f.h * 0.13));
      drawRoundedRect(ctx, rx, ry, rw, rh, 11 * dpr);
      ctx.fillStyle = isHoverRec ? "rgba(44, 33, 22, 0.94)" : "rgba(22, 17, 13, 0.80)";
      ctx.fill();
      ctx.lineWidth = (isHoverRec ? 1.5 : 1.1) * dpr;
      ctx.strokeStyle = isHoverRec ? "rgba(250, 224, 156, 0.94)" : "rgba(212, 166, 87, 0.62)";
      ctx.stroke();
      ctx.fillStyle = isHoverRec ? "#fff8eb" : "#f5e6c8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(recTag, rx + rw * 0.5, ry + rh * 0.52);
      ctx.restore();
      state.fpGlanceButtons.push({ key: recKey, seatId: pidEdge, isRecenter: true, x: rx, y: ry, w: rw, h: rh });
    }
  }

  // Skip 2D beams AND 2D flat drag tether (rendered in real 3D space now!), keep bubbles, hover tooltip, bursts & VFX popups!
  drawStageOverlays(ctx, f, coords, true);
}
