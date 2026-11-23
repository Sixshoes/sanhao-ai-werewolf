/**
 * 3D 真實互動主引擎與多機位運鏡控制器（Three.js r128）
 * 支援：
 * - 真實 3D Raycaster 精準拾取角色與中央互動蓮花水晶
 * - 三種可切換機位：🎬 電影運鏡 / 🪑 坐桌第一人稱 / 🦅 俯視全景
 * - 空地 360° 自由旋轉＋滾輪縮放、真實 3D 空間拖曳光弧、ACES 電影級色調映射
 */
"use strict";

const stage3d = {
  ready: false,
  failed: false,
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
    fpPitch: -0.14,
    fpTargetPitch: -0.14
  },

  isAvailable: function () {
    return typeof THREE !== "undefined" && !this.failed;
  },

  isActive: function () {
    return state.viewMode === "3d" && this.ready && !this.failed;
  },

  detectIntegratedGpu: function (renderer) {
    try {
      const gl = renderer && typeof renderer.getContext === "function" ? renderer.getContext() : null;
      if (!gl || typeof gl.getExtension !== "function") return false;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (!dbg) return false;
      const info = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
      return /intel.*(uhd|hd graphics|iris)|swiftshader|llvmpipe|microsoft basic render/i.test(info);
    } catch (e) {
      return false;
    }
  },

  getTargetDpr: function (quality) {
    const q = quality === "eco" ? "eco" : (quality === "balanced" ? "balanced" : "high");
    const cap = this.isIntegratedGpu
      ? (q === "eco" ? 0.9 : (q === "balanced" ? 1.0 : 1.35))
      : (q === "eco" ? 1.15 : (q === "balanced" ? 1.45 : 2.0));
    return Math.min(window.devicePixelRatio || 1, cap);
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
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas3d,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });
      this.isIntegratedGpu = this.detectIntegratedGpu(renderer);
      if (this.isIntegratedGpu && !this._manualQualityLock && !state.qualityUserChosen && state.quality3D === "high") {
        state.quality3D = "balanced";
      }
      renderer.setPixelRatio(this.getTargetDpr(state.quality3D));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = this.isIntegratedGpu && THREE.PCFShadowMap !== undefined
        ? THREE.PCFShadowMap
        : THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.02;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.2, 130);

      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;
      this.raycaster = new THREE.Raycaster();
      this.tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.35);
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
        ? build3DPostFx(renderer, scene, camera, { preferLightweight: this.isIntegratedGpu })
        : null;
      this.fpHandsGroup = this.buildFirstPersonHands(scene);
      this.ready = true;
      this.checkAutoHeroGlb();

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
    this.renderer.shadowMap.enabled = !isEco;
    this.renderer.shadowMap.autoUpdate = !(this.isIntegratedGpu && !isEco);
    if (this.renderer.shadowMap.enabled) this.renderer.shadowMap.needsUpdate = true;
    if (this.env && this.env.dirLight) this.env.dirLight.castShadow = !isEco;
    if (this.env && this.env.fireflyPoints) this.env.fireflyPoints.visible = q === "high";
    if (this.env && this.env.teaSteamPoints) this.env.teaSteamPoints.visible = !isEco;
    if (this.env && this.env.petalGroup) this.env.petalGroup.visible = q === "high";
    if (this.env && this.env.godRaysGroup) this.env.godRaysGroup.visible = !isEco;
    if (this.postfx) {
      const c = el("canvasStageWrap") || el("canvasContainer");
      const r = c ? c.getBoundingClientRect() : { width: 800, height: 450 };
      this.postfx.resize(Math.max(300, Math.floor(r.width)), Math.max(220, Math.floor(r.height)), dpr);
    }
    const qBtn = el("btnToggle3DQuality");
    if (qBtn) {
      const baseLbl = isEco ? "省電流暢" : (isBal ? "均衡畫質" : "極致畫質");
      qBtn.textContent = baseLbl;
      const fpsTag = (this._perfEmaMs && this._perfEmaMs > 1) ? (" · " + Math.min(60, Math.round(1000 / this._perfEmaMs)) + " FPS") : "";
      const perfStr = (this.isIntegratedGpu ? "內顯最佳化" : "獨立/標準顯卡") + "｜" + baseLbl + fpsTag;
      qBtn.title = perfStr;
      const perfLine = el("gpuPerfStatusLine");
      if (perfLine) perfLine.textContent = "⚡ 3D 狀態：" + perfStr;
    }
  },

  toggleQualityMode: function () {
    this._manualQualityLock = true;
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
    showToast(state.cardPeek3D ? ("🃏 翻開 3D 底牌：你的身分是「" + rName + "」") : "🃏 已蓋回 3D 底牌", "emerald");
  },

  cycleCameraPreset: function () {
    this.closeUpSeatId = null;
    const order = ["cinema", "firstperson", "overview"];
    const next = order[(order.indexOf(this.camPreset) + 1) % order.length];
    this.setCameraPreset(next);
  },

  focusSeatCloseUp: function (seatId) {
    if (!this.isActive() || !this.seats || !this.seats.anchors[seatId]) return;
    if (this.closeUpSeatId === seatId) {
      this.closeUpSeatId = null;
      showToast("已退回圓桌全景視角", "emerald");
      return;
    }
    this.closeUpSeatId = seatId;
    this.orbit.userOverrideUntil = 0;
    const s = getSeat(seatId) || (this.seats.anchors[seatId] && this.seats.anchors[seatId].seat);
    showToast("🔍 特寫檢視 " + fmtSeatNum(seatId) + "號 " + (s ? s.name : "") + "（點空白處退回全景）", "emerald");
  },

  clearCloseUp: function () {
    this.closeUpSeatId = null;
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
    showToast("🕯️ 撥亮了 " + fmtSeatNum(seatId) + "號 桌前的燭火！", "emerald");
  },

  extinguishSeatCandleFx: function (seatId) {
    if (!this.isActive() || !this.seats || !this.fx || !this.seats.anchors[seatId]) return;
    const anchor = this.seats.anchors[seatId];
    if (typeof spawn3DCandleSmoke === "function") {
      spawn3DCandleSmoke(this.fx, anchor.worldPos, performance.now());
      spawn3DCandleSmoke(this.fx, anchor.worldPos, performance.now() + 90);
    }
    spawn3DShockwave(this.fx, anchor.worldPos, "#94a3b8", performance.now(), 0.28, 3.6);
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

  raycastGuishan: function (clientX, clientY) {
    if (!this.isActive() || !this.raycaster || !this.env || !this.env.guishanHitMesh) return false;
    const ndc = this.getNdcFromClient(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.env.guishanHitMesh, false).length > 0;
  },

  interactWithGuishan: function () {
    if (!this.isActive()) return;
    sound.playBlessing();
    showToast("遠眺林美山外的蘭陽雲海與龜山島：在山城茶席品茗推理，心曠神怡。", "emerald");
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
    this.showcaseMode = Boolean(enabled);
    document.body.classList.toggle("hero-showcase-active", this.showcaseMode);
    const panel = el("heroShowcaseOverlay");
    if (panel) panel.classList.toggle("hidden", !this.showcaseMode);
    if (this.showcaseMode) {
      if (state.viewMode !== "3d") this.setViewMode("3d");
      this.closeUpSeatId = null;
      this.camPreset = "cinema";
      this.setShowcaseTarget(this.showcaseTarget || "hero");
      if (this.hero && typeof triggerHeroAction === "function") triggerHeroAction(this.hero, "welcome_bow", 0);
      sound.playBlessing();
    } else {
      this.resetCamera();
    }
    this.resize();
  },

  setShowcaseTarget: function (target) {
    const isHero = (target === "hero" || !target);
    this.showcaseTarget = isHero ? "hero" : parseInt(target, 10);
    this.orbit.userOverrideUntil = 0;

    if (isHero) {
      const hp = this.hero ? this.hero.root.position : new THREE.Vector3(2.95, 0.02, -5.45);
      const hRotY = this.hero ? (this.hero.root.rotation.y || 0) : -0.44;
      this.orbit.targetYaw = hRotY + 0.18;
      this.orbit.targetPitch = 0.14;
      this.orbit.targetRadius = 3.75;
      if (this.orbit.targetLookAt) this.orbit.targetLookAt.set(hp.x, hp.y + 1.54, hp.z);
    } else if (this.seats && this.seats.anchors && this.seats.anchors[this.showcaseTarget]) {
      const ap = this.seats.anchors[this.showcaseTarget].worldPos;
      const frontYaw = Math.atan2(-ap.x, -ap.z);
      this.orbit.targetYaw = frontYaw + 0.22;
      this.orbit.targetPitch = 0.22;
      this.orbit.targetRadius = 3.45;
      if (this.orbit.targetLookAt) this.orbit.targetLookAt.set(ap.x, ap.y + 1.48, ap.z);
    }

    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
  },

  setHeroAction: function (actionName, durationMs) {
    const tgt = this.showcaseTarget || "hero";
    if (tgt !== "hero" && this.seats && this.seats.slots && this.seats.slots[tgt]) {
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
      if (typeof triggerSeatEmotion === "function") {
        triggerSeatEmotion(tgt, emoMap[actionName] || "neutral", durationMs || 2600);
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
      setSeatVisualMode(this.seats.slots[tgt], "sculpt3d");
      const s = typeof getSeat === "function" ? getSeat(tgt) : null;
      showToast("已切回 " + fmtSeatNum(tgt) + "號 " + (s ? s.name : "") + " 的內建動漫 3D 造型", "emerald");
    }
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
  },

  disposeObject3D: function (rootObj) {
    if (!rootObj || typeof rootObj.traverse !== "function") return;
    rootObj.traverse(function (node) {
      if (!node) return;
      if (node.geometry && typeof node.geometry.dispose === "function") {
        try { node.geometry.dispose(); } catch (e) {}
      }
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(function (m) {
          if (!m) return;
          ["map", "normalMap", "emissiveMap", "roughnessMap", "metalnessMap"].forEach(function (k) {
            if (m[k] && typeof m[k].dispose === "function") {
              try { m[k].dispose(); } catch (e) {}
            }
          });
          if (typeof m.dispose === "function") {
            try { m.dispose(); } catch (e) {}
          }
        });
      }
    });
  },

  attachNormalizedHeroGlb: function (gltf, label, silent, isCustomUpload) {
    if (!this.hero || !gltf || !gltf.scene) return;
    if (this.hero.customGlbRoot) {
      this.hero.root.remove(this.hero.customGlbRoot);
      this.disposeObject3D(this.hero.customGlbRoot);
    }
    let prep = null;
    if (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.prepareLoadedAvatar === "function") {
      prep = stage3dVrm.prepareLoadedAvatar(gltf, { mode: "standing", targetHeight: 2.40, baseY: 0.18 });
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
        const sc = 2.40 / maxH;
        mdl.scale.setScalar(sc);
        mdl.position.set(-center.x * sc, 0.18 - box.min.y * sc, -center.z * sc);
      } else {
        mdl.position.y = 0.18;
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
    this.hero.vrmAvatar = (prep && prep.isVrm) ? prep : prep;
    this.hero.customGlbBaseY = prep ? prep.baseY : (mdl.position.y || 0.18);
    this.hero.customGlbRoot = mdl;
    this.hero.root.add(mdl);
    if (typeof setHeroVisualMode === "function") setHeroVisualMode(this.hero, "glb");
    if (isCustomUpload) {
      this.extractEmbeddedVrmThumbnail(gltf, "主持");
    }
    if (typeof indieFlow !== "undefined" && typeof indieFlow.syncShowcaseTargetUi === "function") {
      indieFlow.syncShowcaseTargetUi();
    }
    if (!silent) showToast("已載入並自動對齊「清茗」二次元 3D 模型：" + label, "emerald");
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
    while (actor.vrmMountGroup.children.length > 0) {
      const oldChild = actor.vrmMountGroup.children[0];
      actor.vrmMountGroup.remove(oldChild);
      this.disposeObject3D(oldChild);
    }
    const prep = (typeof stage3dVrm !== "undefined" && typeof stage3dVrm.prepareLoadedAvatar === "function")
      ? stage3dVrm.prepareLoadedAvatar(gltf, { mode: "seated", targetHeight: 2.10, baseY: 0.0 })
      : { root: gltf.scene, baseY: 0, isVrm: false };
    actor.vrmAvatar = prep;
    if (modelSlug) actor.boundModelSlug = modelSlug;
    actor.vrmMountGroup.add(prep.root);
    if (typeof setSeatVisualMode === "function") setSeatVisualMode(actor, "vrm");
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
      let texIdx = null;
      if (ext && ext.VRM && ext.VRM.meta && typeof ext.VRM.meta.texture === "number") {
        texIdx = ext.VRM.meta.texture;
      } else if (ext && ext.VRMC_vrm && ext.VRMC_vrm.meta && typeof ext.VRMC_vrm.meta.thumbnailImage === "number") {
        const imgIdx = ext.VRMC_vrm.meta.thumbnailImage;
        if (typeof gltf.parser.getDependency === "function") {
          gltf.parser.getDependency("image", imgIdx).then(function (img) {
            if (img) stage3d._canvasEncodePortrait(personaKey, img);
          }).catch(function () {});
        }
        return null;
      }
      if (typeof texIdx === "number" && typeof gltf.parser.getDependency === "function") {
        gltf.parser.getDependency("texture", texIdx).then(function (tex) {
          if (tex && tex.image) stage3d._canvasEncodePortrait(personaKey, tex.image);
        }).catch(function () {});
      }
    } catch (e) {}
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
    } catch (e) {}
  },

  updateVrmLoadIndicator: function () {
    const pill = el("vrmLoadPill");
    const txt = el("vrmLoadPillText");
    if (!pill || !txt) return;
    const total = this.avatarTotalQueued || 0;
    const done = Math.min(total, this.avatarDoneCount || 0);
    const active = this.avatarActiveLoads || 0;
    const queued = (this.avatarQueue && this.avatarQueue.length) || 0;
    if (total > 0 && (active > 0 || queued > 0)) {
      pill.classList.remove("hidden");
      txt.textContent = "✨ 正在喚醒茶席夥伴 " + done + "/" + total;
    } else {
      pill.classList.add("hidden");
    }
  },

  pumpAvatarQueue: function () {
    const self = this;
    if (typeof THREE.GLTFLoader !== "function") return;
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
      const latestSeat = typeof getStageSeatListFor3D === "function"
        ? getStageSeatListFor3D().find(function (x) { return x.id === job.seat.id; })
        : job.seat;
      const latestSlug = latestSeat ? stage3dVrm.getSeatModelSlug(latestSeat) : job.slug;
      if (latestSlug === job.slug) {
        self.attachSeatAvatar(job.seat.id, gltf, job.url.split("/").pop(), true, job.slug, latestSeat);
      }
      self.updateVrmLoadIndicator();
      setTimeout(function () { self.pumpAvatarQueue(); }, 50);
    }, undefined, function () {
      delete self.avatarLoadingKeys[job.key];
      delete self.avatarQueuedKeys[job.key];
      self.avatarActiveLoads = Math.max(0, self.avatarActiveLoads - 1);
      self.avatarDoneCount += 1;
      self.updateVrmLoadIndicator();
      setTimeout(function () { self.pumpAvatarQueue(); }, 50);
    });
  },

  syncSeatAvatars: function (seatList) {
    if (!this.seats || !seatList || typeof stage3dVrm === "undefined" || typeof THREE.GLTFLoader !== "function") return;
    if (!this.avatarManifest || !Object.keys(this.avatarManifest).length) return;
    const self = this;
    const newJobs = [];
    const nTotal = seatList.length;
    seatList.forEach(function (s, idx) {
      const actor = self.seats.slots[s.id];
      if (!actor) return;
      if (actor.boundModelSlug && actor.boundModelSlug.indexOf("custom:") === 0) return;
      let slug = stage3dVrm.getSeatModelSlug(s);
      let url = self.avatarManifest[slug];
      if (!url && slug === "player_male") {
        slug = "player";
        url = self.avatarManifest[slug];
      }
      if (!url || actor.boundModelSlug === slug) return;
      const key = s.id + ":" + slug;
      if (self.avatarLoadingKeys[key] || self.avatarQueuedKeys[key]) return;
      const isPlayer = (typeof getPlayerId === "function" && s.id === getPlayerId());
      const distFromOpp = Math.abs(idx - Math.floor(nTotal * 0.5));
      const prio = isPlayer ? 99 : distFromOpp;
      self.avatarQueuedKeys[key] = true;
      newJobs.push({ seat: s, slug: slug, url: url, key: key, prio: prio });
    });
    if (!newJobs.length) return;
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
    if (typeof window === "undefined" || !window.location) return;
    const proto = window.location.protocol;
    if (proto !== "http:" && proto !== "https:") return;
    if (typeof fetch !== "function" || typeof THREE.GLTFLoader !== "function") return;
    const self = this;
    const applyManifest = function (info) {
      if (!info) return;
      const startSeats = function () {
        if (info.seatModels) {
          self.avatarManifest = info.seatModels;
          if (typeof getStageSeatListFor3D === "function") {
            self.syncSeatAvatars(getStageSeatListFor3D());
          }
        }
      };
      const loader = new THREE.GLTFLoader();
      if (info.pavilionModel) {
        loader.load(info.pavilionModel, function (pvGltf) {
          self.attachCustomPavilionGlb(pvGltf, info.pavilionModel.split("/").pop(), true);
        }, undefined, function () {});
      }
      const heroUrl = info.heroModel || (info.hasHeroGlb ? "assets/models/qingming.glb" : null);
      if (heroUrl && self.hero) {
        loader.load(heroUrl, function (gltf) {
          self.attachNormalizedHeroGlb(gltf, heroUrl.split("/").pop(), true, false);
          setTimeout(startSeats, 120);
        }, undefined, function () {
          startSeats();
        });
      } else {
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
      .catch(function () { });
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
      hitPt.x = clamp(hitPt.x, -7, 7);
      hitPt.z = clamp(hitPt.z, -7, 7);
      this.fx.dragWorldEnd.copy(hitPt);
    }
  },

  interactWithCrystal: function () {
    if (!this.isActive() || !this.env || !this.fx) return;
    this.env.lotusSpinBoost = 1.0;
    const nowMs = performance.now();
    spawn3DShockwave(this.fx, new THREE.Vector3(0, 0, 0), "#fbbf24", nowMs, 1.28, 7.5);
    sound.playBlessing();
    showToast("✨ 輕觸三好蓮花核心：願本局存好心、說好話、做好事！", "emerald");
  },

  setCameraPreset: function (preset) {
    this.camPreset = (preset === "firstperson" || preset === "overview") ? preset : "cinema";
    this.orbit.userOverrideUntil = 0;
    this.orbit.fpTargetYaw = 0;
    this.orbit.fpTargetPitch = -0.14;
    this.syncCameraPresetButtons();
    const labelMap = {
      cinema: "🎬 電影自動運鏡",
      firstperson: "🪑 第一人稱坐桌視角",
      overview: "🦅 俯視全景戰術視角"
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
      hint.textContent = "拖曳空地可 360° 環視山城｜點擊角色、桌心蓮花或遠方龜山島互動";
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
    this.applyBodyModeClass();
    resizeCanvas();
    saveUserPrefs();
  },

  toggleViewMode: function () {
    this.setViewMode(this.isActive() ? "2d" : "3d");
    showToast(this.isActive() ? "已切換為 3D 山城古亭舞台！" : "已切換為 2D 經典俯視圓桌！", "emerald");
  },

  resize: function () {
    if (!this.ready || !this.renderer || !this.camera) return;
    const container = el("canvasStageWrap") || el("canvasContainer");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = Math.max(220, Math.floor(rect.height));
    const dpr = this.getTargetDpr(state.quality3D);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.postfx) this.postfx.resize(w, h, dpr);
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
      this.orbit.targetPitch = clamp(this.orbit.targetPitch + dy * 0.005, -0.18, 0.72);
      this.orbit.userOverrideUntil = performance.now() + 9000;
      return;
    }
    if (this.camPreset === "firstperson") {
      this.orbit.fpTargetYaw = clamp(this.orbit.fpTargetYaw - dx * 0.0055, -1.25, 1.25);
      this.orbit.fpTargetPitch = clamp(this.orbit.fpTargetPitch - dy * 0.0045, -0.52, 0.35);
    } else {
      this.orbit.targetYaw -= dx * 0.0075;
      this.orbit.targetPitch = clamp(this.orbit.targetPitch + dy * 0.0055, 0.22, 1.22);
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
      this.camera.fov = clamp(this.camera.fov + deltaY * 0.025, 34, 62);
      this.camera.updateProjectionMatrix();
      return;
    }
    this.orbit.targetRadius = clamp(this.orbit.targetRadius + deltaY * 0.006, 7.2, 16.5);
    this.orbit.userOverrideUntil = performance.now() + 6500;
  },

  resetCamera: function () {
    this.orbit.userOverrideUntil = 0;
    this.orbit.targetYaw = 0;
    this.orbit.targetPitch = this.camPreset === "overview" ? 0.96 : 0.52;
    this.orbit.targetRadius = this.camPreset === "overview" ? 12.8 : 11.2;
    this.orbit.targetLookAt.set(0, 1.35, 0);
    this.orbit.fpTargetYaw = 0;
    this.orbit.fpTargetPitch = -0.14;
    this.camera.fov = 44;
    this.camera.updateProjectionMatrix();
  },

  updateCamera: function (f) {
    const o = this.orbit;
    const nowMs = f.nowMs;
    const p = f.p;

    if (this.showcaseMode && this.hero) {
      const tgt = this.showcaseTarget || "hero";
      const anchorObj = (tgt !== "hero" && this.seats && this.seats.anchors && this.seats.anchors[tgt])
        ? this.seats.anchors[tgt].worldPos
        : null;
      const hp = anchorObj || this.hero.root.position;
      if (!o.dragging && nowMs > o.userOverrideUntil) {
        o.targetYaw += 0.0045;
        o.targetPitch = anchorObj ? 0.22 : 0.14;
        o.targetRadius = clamp(o.targetRadius, 2.6, 5.4);
        o.targetLookAt.set(hp.x, hp.y + (anchorObj ? 1.48 : 1.56), hp.z);
      }
      const smS = o.dragging ? 0.25 : 0.09;
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
      // Dynamic seat-aware First-Person POV anchored inside whichever seat playerSeatId was assigned!
      const pidNow = typeof getPlayerId === "function" ? getPlayerId() : 1;
      const selfAnchor = this.seats && this.seats.anchors ? this.seats.anchors[pidNow] : null;
      const selfAngle = selfAnchor ? Math.atan2(selfAnchor.worldPos.x, selfAnchor.worldPos.z) : 0;
      const selfR = selfAnchor ? Math.max(4.55, Math.hypot(selfAnchor.worldPos.x, selfAnchor.worldPos.z)) : 4.95;
      const eyeX = Math.sin(selfAngle) * (selfR - 0.08);
      const eyeY = 3.26;
      const eyeZ = Math.cos(selfAngle) * (selfR - 0.08);
      const baseYaw = -selfAngle;

      if (!o.dragging && nowMs > o.userOverrideUntil) {
        if ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId && state.activeSpeakerId !== pidNow && this.seats.anchors[state.activeSpeakerId]) {
          const sp = this.seats.anchors[state.activeSpeakerId].headPos;
          const targetAbsYaw = Math.atan2(sp.x - eyeX, -(sp.z - eyeZ));
          const relYaw = Math.atan2(Math.sin(targetAbsYaw - baseYaw), Math.cos(targetAbsYaw - baseYaw));
          o.fpTargetYaw = clamp(relYaw, -1.05, 1.05);
          o.fpTargetPitch = -0.18;
        } else {
          o.fpTargetYaw = Math.sin(f.tSec * 0.25) * 0.08;
          o.fpTargetPitch = -0.22;
        }
      }
      const sm = o.dragging ? 0.25 : 0.08;
      o.fpYaw += (o.fpTargetYaw - o.fpYaw) * sm;
      o.fpPitch += (o.fpTargetPitch - o.fpPitch) * sm;

      let cx = eyeX;
      let cy = eyeY;
      let cz = eyeZ;
      if (nowMs < state.shakeUntil) {
        cx += (Math.random() - 0.5) * 0.14;
        cy += (Math.random() - 0.5) * 0.14;
      }
      this.camera.position.set(cx, cy, cz);
      const lookDist = 6.5;
      const absYaw = baseYaw + o.fpYaw;
      const lx = cx + Math.sin(absYaw) * lookDist;
      const ly = cy + Math.sin(o.fpPitch) * lookDist;
      const lz = cz - Math.cos(absYaw) * lookDist;
      this.camera.lookAt(lx, ly, lz);
      this.camera.updateMatrixWorld();
      return;
    }

    // Cinema or Tactical Overview Orbit Camera (with Double-Click Character Close-Up Inspection & 10/12-seat framing!)
    const activeSeatCount = (state.match && state.match.started)
      ? (state.match.totalSeats || 8)
      : (typeof getLobbySeatCount === "function" ? getLobbySeatCount() : 8);
    const largeTableR = activeSeatCount >= 12 ? 1.85 : (activeSeatCount >= 10 ? 0.95 : 0);
    if (!o.dragging && nowMs > o.userOverrideUntil) {
      if (this.closeUpSeatId && this.seats.anchors[this.closeUpSeatId]) {
        const cp = this.seats.anchors[this.closeUpSeatId].worldPos;
        const cpAng = Math.atan2(-cp.x, -cp.z);
        o.targetYaw = cpAng;
        o.targetPitch = 0.28;
        o.targetRadius = 5.4;
        o.targetLookAt.set(cp.x * 0.72, 1.95, cp.z * 0.72);
      } else if (this.camPreset === "overview") {
        o.targetYaw = Math.sin(f.tSec * 0.08) * 0.12;
        o.targetPitch = 0.96;
        o.targetRadius = 12.8 + largeTableR * 1.15;
        o.targetLookAt.set(0, 1.0, 0);
      } else if (!state.match.started || p === "LOBBY") {
        // Theatrical Indie Title Screen Framing: gentle sweep showing table + Qingming + Guishan Island right of title
        o.targetYaw = -0.18 + Math.sin(f.tSec * 0.14) * 0.26;
        o.targetPitch = 0.36;
        o.targetRadius = 11.4 + largeTableR;
        o.targetLookAt.set(-1.05, 1.55, -1.15);
      } else if (f.night) {
        const nightFocusId = state.selectedSeatId || state.hoverSeatId;
        const nightAnchor = (nightFocusId && this.seats.anchors[nightFocusId]) ? this.seats.anchors[nightFocusId] : null;
        if (nightAnchor) {
          const np = nightAnchor.worldPos;
          o.targetYaw = -Math.sin(Math.atan2(np.x, np.z)) * 0.24;
          o.targetPitch = 0.62;
          o.targetRadius = 11.6 + largeTableR * 0.85;
          o.targetLookAt.set(np.x * 0.22, 0.72, np.z * 0.22 + 0.28);
        } else {
          o.targetYaw = Math.sin(f.tSec * 0.12) * 0.14;
          o.targetPitch = 0.68;
          o.targetRadius = 12.6 + largeTableR;
          o.targetLookAt.set(0, 0.58, 0.35);
        }
      } else if ((p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId && this.seats.anchors[state.activeSpeakerId]) {
        const spPos = this.seats.anchors[state.activeSpeakerId].worldPos;
        const dayEvs = (state.match && state.match.daySpeechEvents) || [];
        const latestEv = dayEvs.length ? dayEvs[dayEvs.length - 1] : null;
        const focusId = (latestEv && latestEv.speakerId === state.activeSpeakerId)
          ? (latestEv.accuseId || latestEv.vouchId || null)
          : null;
        const isAccuseShot = Boolean(latestEv && latestEv.speakerId === state.activeSpeakerId && latestEv.accuseId);
        const isClaimShot = Boolean(latestEv && latestEv.speakerId === state.activeSpeakerId && latestEv.claimRole);
        const isPkSpeech = Boolean(typeof isPkVoteActive === "function" && isPkVoteActive());
        const focusAnchor = (focusId && this.seats.anchors[focusId]) ? this.seats.anchors[focusId] : null;
        const focusPos = focusAnchor ? focusAnchor.worldPos : null;
        const aimX = focusPos ? (spPos.x * 0.46 + focusPos.x * 0.20) : (spPos.x * 0.38);
        const aimZ = focusPos ? (spPos.z * 0.46 + focusPos.z * 0.20 + 0.26) : (spPos.z * 0.38 + 0.28);
        const spAngle = Math.atan2(spPos.x, spPos.z);
        o.targetYaw = -Math.sin(spAngle) * ((isAccuseShot || isPkSpeech) ? 0.52 : 0.42);
        o.targetPitch = (isClaimShot || isPkSpeech) ? 0.39 : (isAccuseShot ? 0.42 : (focusPos ? 0.46 : 0.44));
        o.targetRadius = ((isClaimShot || isPkSpeech) ? 8.7 : (isAccuseShot ? 9.3 : (focusPos ? 10.0 : 9.4))) + largeTableR * 0.65;
        o.targetLookAt.set(aimX, (isClaimShot || isPkSpeech) ? 1.02 : 0.86, aimZ);
      } else if ((p === "DAY_VOTE" && isPkVoteActive()) || (p === "DAY_SPEECH" && state.match.seats.filter(function (s) { return s.alive && s.claimedRole === "seer"; }).length >= 2 && !state.activeSpeakerId)) {
        // Dual-Rival Confrontation Framing (PK or Seer Clash!)
        const rivals = isPkVoteActive()
          ? (state.match.pkCandidates || []).map(function (id) { return stage3d.seats.anchors[id]; }).filter(Boolean)
          : state.match.seats.filter(function (s) { return s.alive && s.claimedRole === "seer"; }).map(function (s) { return stage3d.seats.anchors[s.id]; }).filter(Boolean);
        if (rivals.length >= 2) {
          const midX = (rivals[0].worldPos.x + rivals[1].worldPos.x) * 0.5;
          const midZ = (rivals[0].worldPos.z + rivals[1].worldPos.z) * 0.5;
          const axisAng = Math.atan2(rivals[1].worldPos.z - rivals[0].worldPos.z, rivals[1].worldPos.x - rivals[0].worldPos.x);
          o.targetYaw = Math.sin(axisAng) * 0.52;
          o.targetPitch = 0.56;
          o.targetRadius = 11.8 + largeTableR * 0.85;
          o.targetLookAt.set(midX * 0.32, 0.65, midZ * 0.32 + 0.35);
        } else {
          o.targetYaw = Math.sin(f.tSec * 0.2) * 0.16;
          o.targetPitch = 0.62;
          o.targetRadius = 12.4;
          o.targetLookAt.set(0, 0.62, 0.35);
        }
      } else if (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT") {
        const leaderAnchor = (state.voteLeaderId && this.seats.anchors[state.voteLeaderId]) ? this.seats.anchors[state.voteLeaderId] : null;
        if (leaderAnchor) {
          const lp = leaderAnchor.worldPos;
          o.targetYaw = -Math.sin(Math.atan2(lp.x, lp.z)) * 0.32;
          o.targetPitch = 0.54;
          o.targetRadius = 11.5;
          o.targetLookAt.set(lp.x * 0.24, 0.68, lp.z * 0.24 + 0.32);
        } else {
          o.targetYaw = Math.sin(f.tSec * 0.2) * 0.16;
          o.targetPitch = 0.62;
          o.targetRadius = 12.4;
          o.targetLookAt.set(0, 0.62, 0.35);
        }
      } else {
        o.targetYaw = 0;
        o.targetPitch = 0.54;
        o.targetRadius = 12.0;
        o.targetLookAt.set(0, 0.64, 0.35);
      }
    }

    const punch = this.cameraPunch;
    if (punch && punch.pending) {
      punch.pending = false;
      punch.until = nowMs + (punch.durationMs || 1250);
    }
    const isPunchActive = Boolean(punch && nowMs < punch.until && this.camPreset !== "firstperson" && !this.showcaseMode);
    if (isPunchActive && !o.dragging && nowMs > o.userOverrideUntil && punch.seatId && this.seats.anchors[punch.seatId]) {
      const pp = this.seats.anchors[punch.seatId].worldPos;
      if (!this._punchLookTmp) this._punchLookTmp = new THREE.Vector3();
      o.targetYaw = -Math.sin(Math.atan2(pp.x, pp.z)) * 0.44;
      o.targetRadius = Math.min(o.targetRadius, 9.6);
      o.targetLookAt.lerp(this._punchLookTmp.set(pp.x * 0.45, 0.85, pp.z * 0.45), 0.55);
    }

    if (typeof this.camera.fov === "number" && !this.showcaseMode && this.camPreset !== "firstperson") {
      const baseFov = this.camPreset === "overview" ? 46 : 44;
      const targetFov = isPunchActive ? (punch.fovTarget || 39) : baseFov;
      const diffFov = targetFov - this.camera.fov;
      if (Math.abs(diffFov) > 0.04) {
        this.camera.fov += diffFov * 0.14;
        this.camera.updateProjectionMatrix();
      } else if (this.camera.fov !== targetFov) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
    }

    const smooth = o.dragging ? 0.24 : (isPunchActive ? 0.12 : 0.065);
    o.yaw += (o.targetYaw - o.yaw) * smooth;
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
        if (dt > 0 && dt < 120) {
          this._perfEmaMs = this._perfEmaMs ? (this._perfEmaMs * 0.92 + dt * 0.08) : dt;
          if (!this._fpsLabelLastMs || nowMs - this._fpsLabelLastMs > 1200) {
            this._fpsLabelLastMs = nowMs;
            if (this._perfEmaMs > 1) {
              const qNow = state.quality3D === "eco" ? "省電流暢" : (state.quality3D === "balanced" ? "均衡畫質" : "極致畫質");
              const fpsVal = Math.min(60, Math.round(1000 / this._perfEmaMs));
              const perfStr = (this.isIntegratedGpu ? "內顯最佳化" : "獨立/標準顯卡") + "｜" + qNow + " · " + fpsVal + " FPS";
              const qBtnLive = el("btnToggle3DQuality");
              if (qBtnLive) qBtnLive.title = perfStr;
              const perfLine = el("gpuPerfStatusLine");
              if (perfLine) perfLine.textContent = "⚡ 3D 狀態：" + perfStr;
            }
          }
          if (!this._manualQualityLock && state.quality3D !== "eco" && this._perfEmaMs > 44) {
            this._perfSlowMs = (this._perfSlowMs || 0) + dt;
            if (this._perfSlowMs > 3200) {
              state.quality3D = (state.quality3D === "high") ? "balanced" : "eco";
              this.applyQualityMode();
              this._perfSlowMs = 0;
              this._perfEmaMs = 0;
              if (typeof showToast === "function") {
                showToast(
                  state.quality3D === "balanced"
                    ? "偵測到負載偏高，已平滑降至「均衡畫質」（保留陰影與光暈）"
                    : "偵測到畫面負載較高，已自動切換為「省電流暢」3D 模式",
                  "sky"
                );
              }
            }
          } else {
            this._perfSlowMs = Math.max(0, (this._perfSlowMs || 0) - dt * 0.5);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const f = {
      nowMs: nowMs,
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
    const isFlashGlow = Boolean(state.screenFlash && f.nowMs < state.screenFlash.until && (state.screenFlash.until - f.nowMs) < 5000);
    const harmonyBoost = (f.daylight && state.match && typeof state.match.harmonyScore === "number" && state.match.harmonyScore >= 75) ? 0.05 : 0;
    const dynExpBoost = harmonyBoost + (isPunchGlow ? 0.05 : 0) + (isFlashGlow ? 0.06 : 0);

    if (this.isIntegratedGpu && this.renderer && this.renderer.shadowMap && this.renderer.shadowMap.enabled) {
      this._shadowFrameCounter = (this._shadowFrameCounter || 0) + 1;
      const shadowStride = state.quality3D === "balanced" ? 3 : 2;
      if (this._shadowFrameCounter % shadowStride === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    const usePostFxNow = Boolean(
      this.postfx &&
      state.quality3D !== "eco" &&
      (!this.isIntegratedGpu || state.quality3D === "high")
    );
    if (usePostFxNow) {
      // Single authoritative ACES Filmic pass inside PostFX gradePass (prevents double tone-mapping compression!)
      if (this.renderer && THREE.NoToneMapping !== undefined && this.renderer.toneMapping !== THREE.NoToneMapping) {
        this.renderer.toneMapping = THREE.NoToneMapping;
      }
      if (typeof this.postfx.setDynamicExposure === "function") {
        this.postfx.setDynamicExposure(dynExpBoost);
      }
      this.postfx.updateMood(f, (state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72);
      this.postfx.render();
    } else {
      if (this.renderer && THREE.ACESFilmicToneMapping !== undefined) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        if (typeof this.renderer.toneMappingExposure === "number") {
          const targetExposure = 1.02 + dynExpBoost;
          this.renderer.toneMappingExposure += (targetExposure - this.renderer.toneMappingExposure) * 0.14;
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

  const sorted = coords.slice().sort(function (a, b) { return (b.zDepth || 0) - (a.zDepth || 0); });
  const plates = [];
  sorted.forEach(function (node) {
    if (node.visibleInView === false) return;
    const s = node.seat;
    const sx = node.x;
    const sy = node.y;
    const drawR = node.r;
    const isSpeaking = (((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN") && s.alive) || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId === s.id;
    const isSelected = Boolean(inMatch && isPickPhase && state.selectedSeatId === s.id);
    const isSheriff = Boolean(inMatch && !state.match.sheriffElectionPending && s.alive && state.match.sheriffSeatId === s.id);
    const sheriffPrefix = isSheriff ? "👑 " : "";
    const mark = state.playerMarks[s.id];
    const showTruth = isOver || (typeof isSpectatorGodViewActive === "function" && isSpectatorGodViewActive());

    // Handcrafted lacquer & antique-gold floating tablet above 3D head
    let topTag = "";
    let topBg = "rgba(22, 17, 13, 0.9)";
    let topBorder = "rgba(212, 166, 87, 0.55)";
    let topFg = "#efe7d8";
    let isSubtleNameplate = false;
    let prio = 1;
    const sRoleDef = (typeof getSeatRoleDef === "function" ? getSeatRoleDef(s) : null) || ROLE_DEFS[s.role];
    if (isSpeaking) {
      topTag = sheriffPrefix + fmtSeatNum(s.id) + " " + s.name + (!s.alive ? "・遺言中" : "・發言中");
      topBg = "rgba(166, 50, 38, 0.94)";
      topBorder = "rgba(242, 212, 156, 0.85)";
      topFg = "#fbf5ea";
      prio = 4;
    } else if (!s.alive) {
      topTag = showTruth && sRoleDef ? ("離席・" + sRoleDef.name) : "已離席";
      topBorder = "rgba(148, 134, 114, 0.35)";
      topFg = "#a89d8b";
    } else if (showTruth && sRoleDef) {
      topTag = sheriffPrefix + sRoleDef.name;
      topBg = s.role === "wolf" ? "rgba(154, 44, 34, 0.94)" : "rgba(33, 94, 73, 0.94)";
      topBorder = "rgba(242, 212, 156, 0.6)";
      topFg = "#fbf5ea";
      prio = 3;
    } else if (isSelected) {
      topTag = sheriffPrefix + "✦ 已鎖定・" + fmtSeatNum(s.id) + " " + s.name;
      topBg = "rgba(166, 50, 38, 0.94)";
      topBorder = "rgba(250, 224, 156, 0.9)";
      topFg = "#fff8eb";
      prio = 4;
    } else if (state.match.started && s.id !== getPlayerId() && (state.match.microPulseRevealed || s.sweatExposed)) {
      topTag = sheriffPrefix + "心虛 " + s.microPulse + "%";
      topBg = s.microPulse >= 60 ? "rgba(154, 44, 34, 0.92)" : "rgba(33, 94, 73, 0.92)";
      topBorder = "rgba(242, 212, 156, 0.5)";
      topFg = "#fbf5ea";
      prio = 2;
    } else if (s.claimedRole && ROLE_DEFS[s.claimedRole]) {
      topTag = sheriffPrefix + "自稱・" + ROLE_DEFS[s.claimedRole].name;
      topBg = "rgba(120, 78, 24, 0.92)";
      topBorder = "rgba(242, 212, 156, 0.65)";
      topFg = "#fbf5ea";
      prio = 3;
    } else if (mark === "wolf") {
      topTag = sheriffPrefix + "存疑・" + fmtSeatNum(s.id) + s.name;
      topBg = "rgba(154, 44, 34, 0.9)";
      topBorder = "rgba(232, 140, 128, 0.65)";
      topFg = "#fbf5ea";
      prio = 2;
    } else if (mark === "good") {
      topTag = sheriffPrefix + "認同・" + fmtSeatNum(s.id) + s.name;
      topBg = "rgba(33, 94, 73, 0.9)";
      topBorder = "rgba(126, 196, 166, 0.65)";
      topFg = "#fbf5ea";
      prio = 2;
    } else if (state.hoverSeatId === s.id) {
      topTag = sheriffPrefix + fmtSeatNum(s.id) + "號 " + s.name;
      topBg = "rgba(22, 17, 13, 0.92)";
      topBorder = "rgba(212, 166, 87, 0.72)";
      topFg = "#e8c884";
      prio = 3;
    } else if (inMatch && isSheriff) {
      isSubtleNameplate = true;
      topTag = sheriffPrefix + fmtSeatNum(s.id) + " " + (s.id === getPlayerId() ? "你" : s.name);
      topBg = "rgba(18, 14, 11, 0.72)";
      topBorder = "rgba(245, 196, 81, 0.75)";
      topFg = "#fde68a";
      prio = 2;
    }

    if (topTag) {
      const font = isSubtleNameplate
        ? ("600 " + Math.round(9 * dpr) + "px 'Noto Sans TC', sans-serif")
        : ("700 " + Math.round(10 * dpr) + "px 'Noto Serif TC', 'Songti TC', 'Noto Sans TC', serif");
      ctx.font = font;
      const ttw = ctx.measureText(topTag).width;
      const tW = ttw + (isSubtleNameplate ? 10 : 16) * dpr;
      const tH = (isSubtleNameplate ? 14.5 : 18) * dpr;
      const baseX = clamp(sx, tW * 0.5 + 6 * dpr, Math.max(tW * 0.5 + 6 * dpr, f.w - tW * 0.5 - 6 * dpr));
      const baseY = clamp(sy - drawR * 0.44 - tH - 3 * dpr, 48 * dpr, Math.max(48 * dpr, f.h - tH - 8 * dpr));
      plates.push({
        seatId: s.id, anchorX: sx, anchorY: sy - drawR * 0.35,
        x: baseX, y: baseY, origY: baseY, w: tW, h: tH,
        topTag: topTag, topBg: topBg, topBorder: topBorder, topFg: topFg,
        font: font, isSubtle: isSubtleNameplate, prio: prio
      });
    }
  });

  // 3-pass Screen-Space AABB Anti-Overlap Solver (prevents 8-player back-row nameplate collisions!)
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
          const dirY = (pushUp.y <= fixed.y) ? -1 : 1;
          pushUp.y = clamp(pushUp.y + dirY * (overlapY + 2 * dpr), 42 * dpr, Math.max(42 * dpr, f.h - pushUp.h - 8 * dpr));
        }
      }
    }
  }

  plates.forEach(function (pl) {
    ctx.save();
    if (Math.abs(pl.y - pl.origY) > 8 * dpr) {
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y + pl.h);
      ctx.lineTo(pl.anchorX, pl.anchorY);
      ctx.strokeStyle = pl.topBorder;
      ctx.lineWidth = 1.0 * dpr;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = pl.font;
    drawRoundedRect(ctx, pl.x - pl.w * 0.5, pl.y, pl.w, pl.h, 3.5 * dpr);
    ctx.fillStyle = pl.topBg;
    ctx.fill();
    ctx.lineWidth = (pl.isSubtle ? 0.85 : 1.1) * dpr;
    ctx.strokeStyle = pl.topBorder;
    ctx.stroke();
    ctx.fillStyle = pl.topFg;
    ctx.fillText(pl.topTag, pl.x, pl.y + pl.h * 0.53);
    ctx.restore();
  });

  // Skip 2D beams AND 2D flat drag tether (rendered in real 3D space now!), keep bubbles, hover tooltip, bursts & VFX popups!
  drawStageOverlays(ctx, f, coords, true);
}
