/**
 * 3D 程式化 PBR 材質貼圖與角色電影立繪對照工廠（100% 離線相容 file:// 與 http://）
 * 產生胡桃木紋理＋粗糙度貼圖、石板地磚、高級布料織紋、接觸陰影、燭光桌面反射暈、
 * 織布桌墊、雕刻名牌與角色電影立繪路徑對應
 */
"use strict";

const PORTRAIT_ART_MAP = {
  "主持": "assets/portraits/qingming.jpg",
  "你": "assets/portraits/player_female.jpg",
  "你_女": "assets/portraits/player_female.jpg",
  "你_男": "assets/portraits/player.jpg",
  "小澄": "assets/portraits/xiaocheng.jpg",
  "暖暖": "assets/portraits/nuannuan.jpg",
  "阿松": "assets/portraits/asong.jpg",
  "星兒": "assets/portraits/xinger.jpg",
  "小雲": "assets/portraits/xiaoyun.jpg",
  "阿竹": "assets/portraits/azhu.jpg",
  "晨晨": "assets/portraits/chenchen.jpg",
  "墨白": "assets/portraits/mobai.jpg",
  "晴嵐": "assets/portraits/qinglan.jpg",
  "阿朗": "assets/portraits/alang.jpg",
  "柚子": "assets/portraits/youzi.jpg"
};

const VRM_PORTRAIT_ART_MAP = {
  "主持": "assets/portraits_vrm/qingming.jpg",
  "你": "assets/portraits_vrm/player.jpg",
  "你_男": "assets/portraits_vrm/player_male.jpg",
  "小澄": "assets/portraits_vrm/xiaocheng.jpg",
  "暖暖": "assets/portraits_vrm/nuannuan.jpg",
  "阿松": "assets/portraits_vrm/asong.jpg",
  "星兒": "assets/portraits_vrm/xinger.jpg",
  "小雲": "assets/portraits_vrm/xiaoyun.jpg",
  "阿竹": "assets/portraits_vrm/azhu.jpg",
  "晨晨": "assets/portraits_vrm/chenchen.jpg",
  "墨白": "assets/portraits_vrm/mobai.jpg",
  "晴嵐": "assets/portraits_vrm/qinglan.jpg",
  "阿朗": "assets/portraits_vrm/alang.jpg",
  "柚子": "assets/portraits_vrm/youzi.jpg"
};

function getPortraitKey(seat) {
  if (!seat) return null;
  return (typeof getPlayerId === "function" && seat.id === getPlayerId()) ? "你" : seat.name;
}

function getEffectiveVrmPortraitKey(baseKey) {
  if (baseKey === "你" && typeof state !== "undefined" && state.playerGender === "m") {
    return "你_男";
  }
  return baseKey;
}

function getEffectivePaintedPortraitKey(baseKey) {
  if (baseKey === "你") {
    return (typeof state !== "undefined" && state.playerGender === "m") ? "你_男" : "你_女";
  }
  return baseKey;
}

function getHostPortraitImageUrl() {
  if (typeof state !== "undefined" && state.portraitStyle === "vrm3d") {
    if (typeof stage3dTextures !== "undefined" && stage3dTextures.vrmPortraitUrls && stage3dTextures.vrmPortraitUrls["主持"]) {
      return stage3dTextures.vrmPortraitUrls["主持"];
    }
    return VRM_PORTRAIT_ART_MAP["主持"] || PORTRAIT_ART_MAP["主持"] || null;
  }
  return PORTRAIT_ART_MAP["主持"] || VRM_PORTRAIT_ART_MAP["主持"] || null;
}

function getPortraitImageUrl(seat) {
  const key = getPortraitKey(seat);
  if (!key) return null;
  if (typeof state !== "undefined" && state.portraitStyle === "vrm3d") {
    if (typeof stage3dTextures !== "undefined" && stage3dTextures.vrmPortraitUrls && stage3dTextures.vrmPortraitUrls[key]) {
      return stage3dTextures.vrmPortraitUrls[key];
    }
    const vrmKey = getEffectiveVrmPortraitKey(key);
    if (VRM_PORTRAIT_ART_MAP[vrmKey]) return VRM_PORTRAIT_ART_MAP[vrmKey];
  }
  const paintedKey = getEffectivePaintedPortraitKey(key);
  return PORTRAIT_ART_MAP[paintedKey] || PORTRAIT_ART_MAP[key] || null;
}

const stage3dTextures = {
  cache: {},
  portraitImages: {},
  portraitLoading: {},
  vrmPortraitUrls: {},
  vrmPortraitImages: {},

  registerVrmPortrait: function (personaKey, dataUrl) {
    if (!personaKey || !dataUrl) return;
    this.vrmPortraitUrls[personaKey] = dataUrl;
    const self = this;
    if (typeof Image === "function") {
      const img = new Image();
      img.onload = function () {
        if (img.naturalWidth > 0) self.vrmPortraitImages[personaKey] = img;
        if (typeof renderSeatIntelPopover === "function" && typeof state !== "undefined" && state.intelSeatId) {
          renderSeatIntelPopover();
        }
        if (typeof syncSpeakerBannerVisuals === "function" && typeof state !== "undefined" && state.activeSpeakerId) {
          const sp = typeof getSeat === "function" ? getSeat(state.activeSpeakerId) : null;
          if (sp && getPortraitKey(sp) === personaKey) {
            const bEl = el("spotlightSpeakerBadge");
            const tEl = el("spotlightTraitTag");
            syncSpeakerBannerVisuals(sp, bEl ? bEl.textContent : "", tEl ? tEl.textContent : "", Boolean(state.typewriter && state.typewriter.active));
          }
        }
        if (typeof renderPkDuelBanner === "function" && typeof state !== "undefined" && state.match && state.match.pkCandidates) {
          renderPkDuelBanner();
        }
      };
      img.src = dataUrl;
    }
  },

  clearVrmPortrait: function (personaKey) {
    if (!personaKey) return;
    delete this.vrmPortraitUrls[personaKey];
    if (this.vrmPortraitImages) delete this.vrmPortraitImages[personaKey];
    if (this.portraitLoading) delete this.portraitLoading["vrm:" + personaKey];
    if (personaKey === "你") {
      if (this.vrmPortraitUrls) delete this.vrmPortraitUrls["你_男"];
      if (this.vrmPortraitImages) delete this.vrmPortraitImages["你_男"];
      if (this.portraitLoading) delete this.portraitLoading["vrm:你_男"];
    }
    if (typeof this.preloadPortraitImages === "function") {
      this.preloadPortraitImages();
    }
  },

  canLoadExternalImages: function () {
    if (typeof window === "undefined" || !window.location) return false;
    const proto = window.location.protocol;
    if (proto !== "http:" && proto !== "https:") return false;
    if (typeof Image !== "function") return false;
    if (typeof document === "undefined" || typeof document.createElementNS !== "function") return false;
    return true;
  },

  preloadPortraitImages: function () {
    if (!this.canLoadExternalImages()) {
      if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
        bootPreloader.reportBucket("portraits", 1, 1);
      }
      return;
    }
    const self = this;
    const paintedKeys = Object.keys(PORTRAIT_ART_MAP);
    const vrmKeys = Object.keys(VRM_PORTRAIT_ART_MAP);
    const totalPortraits = paintedKeys.length + vrmKeys.length;
    if (totalPortraits === 0) {
      if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
        bootPreloader.reportBucket("portraits", 1, 1);
      }
      return;
    }
    let settledCount = 0;
    const reportOnePortrait = function () {
      settledCount += 1;
      if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
        bootPreloader.reportBucket("portraits", settledCount, totalPortraits);
      }
    };
    paintedKeys.forEach(function (key) {
      if (self.portraitImages[key] || self.portraitLoading[key]) {
        reportOnePortrait();
        return;
      }
      self.portraitLoading[key] = true;
      let counted = false;
      const doneOnce = function () {
        if (counted) return;
        counted = true;
        reportOnePortrait();
      };
      const img = new Image();
      img.onload = function () {
        if (img.naturalWidth > 0) self.portraitImages[key] = img;
        doneOnce();
      };
      img.onerror = doneOnce;
      img.src = PORTRAIT_ART_MAP[key];
    });
    vrmKeys.forEach(function (key) {
      if (self.vrmPortraitImages[key] || self.portraitLoading["vrm:" + key]) {
        reportOnePortrait();
        return;
      }
      self.portraitLoading["vrm:" + key] = true;
      let counted = false;
      const doneOnce = function () {
        if (counted) return;
        counted = true;
        reportOnePortrait();
      };
      const img = new Image();
      img.onload = function () {
        if (img.naturalWidth > 0) self.vrmPortraitImages[key] = img;
        doneOnce();
      };
      img.onerror = doneOnce;
      img.src = VRM_PORTRAIT_ART_MAP[key];
    });
  },

  getRawPortraitImage: function (seat) {
    const key = getPortraitKey(seat);
    if (!key) return null;
    if (typeof state !== "undefined" && state.portraitStyle === "vrm3d") {
      if (this.vrmPortraitImages[key] && this.vrmPortraitUrls[key]) return this.vrmPortraitImages[key];
      const vrmKey = getEffectiveVrmPortraitKey(key);
      if (this.vrmPortraitImages[vrmKey]) return this.vrmPortraitImages[vrmKey];
    }
    const paintedKey = getEffectivePaintedPortraitKey(key);
    if (this.portraitImages[paintedKey]) return this.portraitImages[paintedKey];
    if (this.portraitImages[key]) return this.portraitImages[key];
    if (this.canLoadExternalImages() && !this.portraitLoading[paintedKey] && (PORTRAIT_ART_MAP[paintedKey] || PORTRAIT_ART_MAP[key] || VRM_PORTRAIT_ART_MAP[key])) {
      this.preloadPortraitImages();
    }
    return null;
  },

  createWoodTextures: function () {
    if (this.cache.wood) return this.cache.wood;
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const b = document.createElement("canvas");
    b.width = size;
    b.height = size;
    const bCtx = b.getContext("2d");

    const rCan = document.createElement("canvas");
    rCan.width = size;
    rCan.height = size;
    const rCtx = rCan.getContext("2d");

    ctx.fillStyle = "#482615";
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = "#525252";
    rCtx.fillRect(0, 0, size, size);

    // Rich lacquered walnut / mahogany wood grain fibers + pore roughness variation
    for (let y = 0; y < size; y += 2) {
      const wave = Math.sin(y * 0.042) * 14 + Math.sin(y * 0.14) * 4.5;
      const tone = Math.sin((y + wave) * 0.19) * 0.5 + 0.5;
      const fine = Math.sin(y * 0.85) * 0.12;
      const red = Math.round(52 + (tone + fine) * 42);
      const grn = Math.round(28 + (tone + fine) * 23);
      const blu = Math.round(15 + (tone + fine) * 12);
      ctx.fillStyle = "rgb(" + clamp(red, 20, 120) + "," + clamp(grn, 10, 75) + "," + clamp(blu, 6, 45) + ")";
      ctx.fillRect(0, y, size, 2);

      const bv = Math.round(98 + tone * 52);
      bCtx.fillStyle = "rgb(" + bv + "," + bv + "," + bv + ")";
      bCtx.fillRect(0, y, size, 2);

      const rv = Math.round(58 + (1 - tone) * 65);
      rCtx.fillStyle = "rgb(" + rv + "," + rv + "," + rv + ")";
      rCtx.fillRect(0, y, size, 2);
    }

    // Organic dark walnut knots & polished sheen streaks
    for (let k = 0; k < 48; k++) {
      const kx = (k * 97) % size;
      const ky = (k * 61) % size;
      ctx.fillStyle = "rgba(20, 9, 4, 0.18)";
      ctx.fillRect(0, ky, size, 1.5);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 26 + (k % 22), 3.8 + (k % 4), 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(28, 13, 6, 0.24)";
      ctx.fill();
    }

    const map = new THREE.CanvasTexture(c);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);
    map.encoding = THREE.sRGBEncoding;

    const bump = new THREE.CanvasTexture(b);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(2, 2);

    const roughness = new THREE.CanvasTexture(rCan);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.RepeatWrapping;
    roughness.repeat.set(2, 2);

    this.cache.wood = { map: map, bump: bump, roughness: roughness };
    return this.cache.wood;
  },

  upgradeWoodWithPolyHavenCC0: function (mat) {
    if (!mat || typeof THREE.TextureLoader !== "function") return;
    if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") return;
    const loader = new THREE.TextureLoader();
    const prep = function (tex, isSrgb) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      if (isSrgb) tex.encoding = THREE.sRGBEncoding;
      return tex;
    };
    loader.load("assets/textures/walnut_diff.jpg", function (t) {
      mat.map = prep(t, true);
      mat.needsUpdate = true;
    });
    loader.load("assets/textures/walnut_nor.jpg", function (t) {
      mat.normalMap = prep(t, false);
      mat.bumpMap = null;
      mat.needsUpdate = true;
    });
    loader.load("assets/textures/walnut_rough.jpg", function (t) {
      mat.roughnessMap = prep(t, false);
      mat.needsUpdate = true;
    });
  },

  upgradeStoneWithPolyHavenCC0: function (mat) {
    if (!mat || typeof THREE.TextureLoader !== "function") return;
    if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") return;
    const loader = new THREE.TextureLoader();
    const prep = function (tex, isSrgb) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      if (isSrgb) tex.encoding = THREE.sRGBEncoding;
      return tex;
    };
    loader.load("assets/textures/stone_diff.jpg", function (t) {
      mat.map = prep(t, true);
      mat.needsUpdate = true;
    });
    loader.load("assets/textures/stone_nor.jpg", function (t) {
      mat.normalMap = prep(t, false);
      mat.bumpMap = null;
      mat.needsUpdate = true;
    });
    loader.load("assets/textures/stone_rough.jpg", function (t) {
      mat.roughnessMap = prep(t, false);
      mat.needsUpdate = true;
    });
  },

  createFabricTextures: function () {
    if (this.cache.fabric) return this.cache.fabric;
    const size = 128;
    const b = document.createElement("canvas");
    b.width = size;
    b.height = size;
    const ctx = b.getContext("2d");
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const hi = ((x + y) / 4) % 2 === 0;
        ctx.fillStyle = hi ? "#9c9c9c" : "#646464";
        ctx.fillRect(x, y, 3, 2);
        ctx.fillStyle = hi ? "#6e6e6e" : "#949494";
        ctx.fillRect(x, y + 2, 2, 2);
      }
    }
    const bump = new THREE.CanvasTexture(b);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(5, 5);
    this.cache.fabric = { bump: bump };
    return this.cache.fabric;
  },

  createContactShadowTexture: function () {
    if (this.cache.contactShadow) return this.cache.contactShadow;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.56)");
    grad.addColorStop(0.55, "rgba(0, 0, 0, 0.24)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    this.cache.contactShadow = tex;
    return tex;
  },

  createCandleGlowTexture: function () {
    if (this.cache.candleGlow) return this.cache.candleGlow;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 240, 180, 0.85)");
    grad.addColorStop(0.35, "rgba(251, 146, 60, 0.42)");
    grad.addColorStop(0.75, "rgba(217, 119, 6, 0.12)");
    grad.addColorStop(1, "rgba(217, 119, 6, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.candleGlow = tex;
    return tex;
  },

  createStoneTextures: function () {
    if (this.cache.stone) return this.cache.stone;
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const b = document.createElement("canvas");
    b.width = size;
    b.height = size;
    const bCtx = b.getContext("2d");

    ctx.fillStyle = "#262320";
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = "#505050";
    bCtx.fillRect(0, 0, size, size);

    const tile = 64;
    for (let row = 0; row < size / tile; row++) {
      for (let col = 0; col < size / tile; col++) {
        const offset = (row % 2) * (tile * 0.5);
        const x = (col * tile + offset) % size;
        const y = row * tile;
        const shade = ((row * 7 + col * 13) % 16) - 8;
        ctx.fillStyle = "rgb(" + (64 + shade) + "," + (61 + shade) + "," + (56 + shade) + ")";
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        bCtx.fillStyle = "rgb(" + (165 + shade * 2) + "," + (165 + shade * 2) + "," + (165 + shade * 2) + ")";
        bCtx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
    }

    for (let i = 0; i < 900; i++) {
      const px = (i * 193) % size;
      const py = (i * 137) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,246,230,0.035)" : "rgba(0,0,0,0.075)";
      ctx.fillRect(px, py, 2, 2);
    }

    const map = new THREE.CanvasTexture(c);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 4);
    map.encoding = THREE.sRGBEncoding;

    const bump = new THREE.CanvasTexture(b);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(4, 4);

    this.cache.stone = { map: map, bump: bump };
    return this.cache.stone;
  },

  createFeltMatTexture: function () {
    if (this.cache.felt) return this.cache.felt;
    const baseSize = 512;
    const hiSize = 1024;
    const c = document.createElement("canvas");
    c.width = hiSize;
    c.height = hiSize;
    const ctx = c.getContext("2d");
    ctx.save();
    if (typeof ctx.scale === "function") ctx.scale(2, 2);

    // Deep Celadon-Obsidian Silk Brocade (Museum-Grade Carved Tea Tabletop, Baked Once at Startup)
    const grad = ctx.createRadialGradient(baseSize / 2, baseSize / 2, 18, baseSize / 2, baseSize / 2, baseSize / 2);
    grad.addColorStop(0, "#1c2e30");
    grad.addColorStop(0.54, "#132024");
    grad.addColorStop(0.84, "#0d1619");
    grad.addColorStop(1, "#090f12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, baseSize, baseSize);

    // Subtle woven silk cross-hatch sheen
    for (let i = 0; i < 2400; i++) {
      const sx = (i * 173) % baseSize;
      const sy = (i * 251) % baseSize;
      ctx.fillStyle = i % 2 === 0 ? "rgba(232, 200, 134, 0.024)" : "rgba(0, 0, 0, 0.055)";
      ctx.fillRect(sx, sy, 2, 1);
    }

    // Refined Antique-Gold Lotus Inlaid Mandala
    ctx.save();
    ctx.translate(baseSize / 2, baseSize / 2);
    ctx.strokeStyle = "rgba(222, 182, 108, 0.44)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, 218, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(222, 182, 108, 0.24)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 208, 0, Math.PI * 2);
    ctx.arc(0, 0, 168, 0, Math.PI * 2);
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.quadraticCurveTo(28, -114, 0, -166);
      ctx.quadraticCurveTo(-28, -114, 0, -64);
      ctx.strokeStyle = "rgba(226, 188, 112, 0.30)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -188, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(238, 204, 134, 0.46)";
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.felt = tex;
    return tex;
  },

  createBallotCardTexture: function () {
    if (this.cache.ballotCard) return this.cache.ballotCard;
    const w = 256;
    const h = 384;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    // Carved walnut-wood tally tile (刻紋木籌) with subtle natural wood grain
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#6b472b");
    bg.addColorStop(0.48, "#52341e");
    bg.addColorStop(1, "#3a2313");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(26, 14, 8, 0.24)";
    ctx.lineWidth = 2;
    for (let gy = 14; gy < h; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.quadraticCurveTo(w * 0.5, gy + ((gy % 32 === 0) ? 4 : -4), w, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = "#b88946";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = "rgba(232, 198, 132, 0.42)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Carved cinnabar wax/lacquer seal stamp
    ctx.fillStyle = "#9e2b22";
    ctx.fillRect(w / 2 - 54, h / 2 - 62, 108, 124);
    ctx.strokeStyle = "#e6c47e";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(w / 2 - 48, h / 2 - 56, 96, 112);

    ctx.fillStyle = "#fbf3e4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 70px 'Noto Serif TC', serif";
    ctx.fillText("票", w / 2, h / 2 + 2);

    ctx.fillStyle = "#e5c589";
    ctx.font = "700 20px 'Noto Serif TC', serif";
    ctx.fillText("清茗茶席", w / 2, 66);
    ctx.fillText("木籌落定", w / 2, h - 62);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.ballotCard = tex;
    return tex;
  },

  createFogSealStripTexture: function () {
    if (this.cache.fogSealStrip) return this.cache.fogSealStrip;
    const w = 128;
    const h = 256;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#e9dfc8");
    bg.addColorStop(0.5, "#dfd2b5");
    bg.addColorStop(1, "#d3c3a2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(122, 95, 58, 0.55)";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = "rgba(154, 44, 34, 0.72)";
    ctx.lineWidth = 3;
    ctx.strokeRect(w / 2 - 30, h / 2 - 30, 60, 60);
    ctx.fillStyle = "#8f271e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 40px 'Noto Serif TC', serif";
    ctx.fillText("封", w / 2, h / 2 + 2);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.fogSealStrip = tex;
    return tex;
  },

  createSkillRunesTexture: function () {
    if (this.cache.skillRunes) return this.cache.skillRunes;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const vGrad = ctx.createLinearGradient(0, 0, 0, size);
    vGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.0)");
    vGrad.addColorStop(0.22, "rgba(255, 255, 255, 0.34)");
    vGrad.addColorStop(0.55, "rgba(255, 255, 255, 0.72)");
    vGrad.addColorStop(0.85, "rgba(255, 255, 255, 0.28)");
    vGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, size, size);

    // Repeating luminous vertical energy ribbons & sacred lotus diamond glyphs
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (size / 8);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, size - 22);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 84);
      ctx.lineTo(x + 11, 128);
      ctx.lineTo(x, 172);
      ctx.lineTo(x - 11, 128);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 62); ctx.lineTo(size, 62);
    ctx.moveTo(0, 194); ctx.lineTo(size, 194);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.skillRunes = tex;
    return tex;
  },

  createRoofTileTextures: function () {
    if (this.cache.roofTiles) return this.cache.roofTiles;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const b = document.createElement("canvas");
    b.width = size;
    b.height = size;
    const bCtx = b.getContext("2d");

    ctx.fillStyle = "#6e1f16";
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = "#505050";
    bCtx.fillRect(0, 0, size, size);

    const cols = 8;
    const colW = size / cols;
    for (let ci = 0; ci < cols; ci++) {
      const x = ci * colW;
      const g = ctx.createLinearGradient(x, 0, x + colW, 0);
      g.addColorStop(0.0, "#4b140d");
      g.addColorStop(0.32, "#8f2c1f");
      g.addColorStop(0.55, "#ab3a2a");
      g.addColorStop(0.85, "#6b1d14");
      g.addColorStop(1.0, "#3b0f0a");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, colW, size);

      const bg = bCtx.createLinearGradient(x, 0, x + colW, 0);
      bg.addColorStop(0.0, "#202020");
      bg.addColorStop(0.5, "#f0f0f0");
      bg.addColorStop(1.0, "#202020");
      bCtx.fillStyle = bg;
      bCtx.fillRect(x, 0, colW, size);
    }

    // Horizontal overlapping clay tile lip shadows
    for (let row = 0; row < 6; row++) {
      const y = row * (size / 6);
      ctx.fillStyle = "rgba(25, 8, 5, 0.42)";
      ctx.fillRect(0, y, size, 4);
      bCtx.fillStyle = "#181818";
      bCtx.fillRect(0, y, size, 3);
    }

    const map = new THREE.CanvasTexture(c);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 1.5);
    map.encoding = THREE.sRGBEncoding;

    const bump = new THREE.CanvasTexture(b);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(3, 1.5);

    this.cache.roofTiles = { map: map, bump: bump };
    return this.cache.roofTiles;
  },

  createPineNeedleTexture: function () {
    if (this.cache.pineNeedle) return this.cache.pineNeedle;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    ctx.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const ang = -Math.PI * 0.92 + (i / 25) * Math.PI * 0.84;
      const len = 34 + (i % 4) * 7;
      const x1 = 64 + Math.cos(ang) * len;
      const y1 = 92 + Math.sin(ang) * len;
      ctx.strokeStyle = i % 3 === 0 ? "#4d8a63" : (i % 2 === 0 ? "#2d5e41" : "#1f452f");
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(64, 92);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.pineNeedle = tex;
    return tex;
  },

  createBambooLeafTexture: function () {
    if (this.cache.bambooLeaf) return this.cache.bambooLeaf;
    const size = 192;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    // Delicate arched bamboo twig + layered lance-shaped jade leaves
    ctx.strokeStyle = "#3f6a3c";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(96, 176);
    ctx.quadraticCurveTo(92, 110, 102, 40);
    ctx.stroke();

    const leaves = [
      [96, 146, -0.78, 52, 10, "#2f6b47"],
      [96, 142, 0.72, 50, 10, "#3d8256"],
      [94, 118, -1.05, 58, 11, "#4d9864"],
      [96, 114, 0.96, 56, 11, "#397a50"],
      [96, 90, -0.68, 60, 11, "#62b176"],
      [98, 86, 0.65, 58, 11, "#4c9862"],
      [99, 62, -0.42, 54, 10, "#79c88a"],
      [101, 58, 0.44, 52, 10, "#5ea872"],
      [102, 42, 0.04, 46, 9, "#8cd89a"]
    ];
    leaves.forEach(function (lf) {
      ctx.save();
      ctx.translate(lf[0], lf[1]);
      ctx.rotate(lf[2]);
      ctx.fillStyle = lf[5];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(lf[4], -lf[3] * 0.48, 0, -lf[3]);
      ctx.quadraticCurveTo(-lf[4], -lf[3] * 0.48, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(218, 252, 224, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(0, -lf[3] * 0.85);
      ctx.stroke();
      ctx.restore();
    });

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.bambooLeaf = tex;
    return tex;
  },

  createBlossomClusterTexture: function (kind) {
    const key = "blossom_" + (kind || "sakura");
    if (this.cache[key]) return this.cache[key];
    const size = 192;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const isOsmanthus = kind === "osmanthus";
    // Subtle dark-jade leaves tucked behind blossoms
    for (let li = 0; li < 7; li++) {
      const ang = (li / 7) * Math.PI * 2 + 0.3;
      const lx = 96 + Math.cos(ang) * 44;
      const ly = 96 + Math.sin(ang) * 38;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.fillStyle = isOsmanthus ? "#2f6142" : "#3a6b4c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Painterly blossom clusters (Osmanthus warm honey-gold vs Mountain Sakura blush-pink)
    const count = isOsmanthus ? 26 : 18;
    for (let bi = 0; bi < count; bi++) {
      const rad = 14 + ((bi * 31) % 58);
      const ang = bi * 2.39996;
      const bx = 96 + Math.cos(ang) * rad;
      const by = 96 + Math.sin(ang) * rad * 0.86;
      const r = isOsmanthus ? (8 + (bi % 4) * 2.2) : (12 + (bi % 4) * 3.2);
      const pal = isOsmanthus
        ? (bi % 3 === 0 ? "#fde68a" : (bi % 2 === 0 ? "#fbbf24" : "#f59e0b"))
        : (bi % 3 === 0 ? "#fff1f2" : (bi % 2 === 0 ? "#fbcfe8" : "#f9a8d4"));
      ctx.fillStyle = pal;
      const petals = isOsmanthus ? 4 : 5;
      for (let pi = 0; pi < petals; pi++) {
        const pa = (pi / petals) * Math.PI * 2 + bi * 0.4;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(pa) * r * 0.52, by + Math.sin(pa) * r * 0.52, r * 0.56, r * 0.42, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isOsmanthus ? "#fffbeb" : "#fde68a";
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache[key] = tex;
    return tex;
  },

  createCalligraphyScrollTexture: function () {
    if (this.cache.calligraphyScroll) return this.cache.calligraphyScroll;
    const w = 512;
    const h = 256;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");

    // Warm aged Xuan-paper gradient + antique silk brocade borders
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#f7eed8");
    bg.addColorStop(0.5, "#efe2c3");
    bg.addColorStop(1, "#e5d3ac");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#c9a66b";
    ctx.fillRect(0, 0, 26, h);
    ctx.fillRect(w - 26, 0, 26, h);
    ctx.strokeStyle = "rgba(120, 74, 28, 0.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 14, w - 64, h - 28);

    // Subtle ink-wash mountain horizon along bottom of scroll
    ctx.fillStyle = "rgba(68, 86, 98, 0.14)";
    ctx.beginPath();
    ctx.moveTo(36, h - 18);
    ctx.quadraticCurveTo(130, h - 98, 230, h - 52);
    ctx.quadraticCurveTo(340, h - 118, w - 36, h - 42);
    ctx.lineTo(w - 36, h - 18);
    ctx.closePath();
    ctx.fill();

    // Calligraphic Three-Goodness inscription
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#261912";
    ctx.font = "900 44px 'Noto Serif TC', 'Songti TC', serif";
    ctx.fillText("存好心・說好話・做好事", w * 0.5, h * 0.45);
    ctx.fillStyle = "rgba(62, 42, 28, 0.72)";
    ctx.font = "700 20px 'Noto Serif TC', serif";
    ctx.fillText("青嵐書院茶席", w * 0.5, h * 0.72);

    // Vermilion seal chop
    ctx.fillStyle = "#b92c22";
    ctx.fillRect(w - 92, h - 78, 34, 34);
    ctx.fillStyle = "#fff7eb";
    ctx.font = "900 22px 'Noto Serif TC', serif";
    ctx.fillText("善", w - 75, h - 60);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.calligraphyScroll = tex;
    return tex;
  },

  createBalustradeLatticeTexture: function () {
    if (this.cache.balustradeLattice) return this.cache.balustradeLattice;
    const w = 256;
    const h = 128;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    // Carved walnut East-Asian openwork fretwork railing (回字雲紋欄杆)
    ctx.strokeStyle = "#4d2b18";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.strokeStyle = "#693b21";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    // Vertical carved mullions & geometric fret squares
    const panels = 4;
    const pw = (w - 36) / panels;
    for (let i = 0; i < panels; i++) {
      const px = 18 + i * pw;
      ctx.strokeRect(px + 6, 26, pw - 12, h - 52);
      ctx.strokeStyle = "#b88a44";
      ctx.lineWidth = 2.6;
      ctx.strokeRect(px + 14, 34, pw - 28, h - 68);
      ctx.strokeStyle = "#693b21";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.5, 18);
      ctx.lineTo(px + pw * 0.5, 34);
      ctx.moveTo(px + pw * 0.5, h - 34);
      ctx.lineTo(px + pw * 0.5, h - 18);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.balustradeLattice = tex;
    return tex;
  },

  createCelestialSunGlowTexture: function () {
    if (this.cache.celestialSunGlow) return this.cache.celestialSunGlow;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createRadialGradient(size * 0.5, size * 0.5, 4, size * 0.5, size * 0.5, size * 0.5);
    g.addColorStop(0.0, "rgba(255, 255, 245, 1.0)");
    g.addColorStop(0.18, "rgba(255, 244, 200, 0.88)");
    g.addColorStop(0.42, "rgba(253, 214, 130, 0.38)");
    g.addColorStop(0.72, "rgba(251, 185, 92, 0.10)");
    g.addColorStop(1.0, "rgba(251, 185, 92, 0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.celestialSunGlow = tex;
    return tex;
  },

  createLanternSilkTexture: function () {
    if (this.cache.lanternSilk) return this.cache.lanternSilk;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    // Warm candlelight Xuan-silk vertical gradient (bright amber core -> rich vermilion top/bottom rims)
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0.0, "#8f2c1a");
    bg.addColorStop(0.14, "#d9772a");
    bg.addColorStop(0.48, "#fff2c6");
    bg.addColorStop(0.84, "#e0812d");
    bg.addColorStop(1.0, "#7c2416");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle antique gold brocade bands at top & bottom
    ctx.fillStyle = "rgba(212, 166, 87, 0.72)";
    ctx.fillRect(0, 12, size, 5);
    ctx.fillRect(0, size - 17, size, 5);

    // Delicate horizontal bamboo ribs
    ctx.strokeStyle = "rgba(96, 38, 16, 0.24)";
    ctx.lineWidth = 2;
    for (let ry = 36; ry < size - 24; ry += 26) {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(size, ry);
      ctx.stroke();
    }
    // Subtle vertical wood stiles
    ctx.strokeStyle = "rgba(74, 28, 12, 0.34)";
    ctx.lineWidth = 4;
    for (let rx = 0; rx < size; rx += 64) {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, size);
      ctx.stroke();
    }

    // Subtle traditional vermilion calligraphy seal medallion on opposite faces
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [64, 192].forEach(function (cx, idx) {
      ctx.strokeStyle = "rgba(166, 46, 32, 0.44)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, size * 0.5, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(154, 38, 26, 0.55)";
      ctx.font = "900 28px 'Noto Serif TC', serif";
      ctx.fillText(idx === 0 ? "善" : "茗", cx, size * 0.5 + 2);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping || THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    this.cache.lanternSilk = tex;
    return tex;
  },

  createLatticeScreenTexture: function () {
    if (this.cache.latticeScreen) return this.cache.latticeScreen;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    // Warm backlit Xuan-paper inner glow
    const bg = ctx.createRadialGradient(size * 0.5, size * 0.5, 18, size * 0.5, size * 0.5, size * 0.72);
    bg.addColorStop(0, "rgba(255, 241, 204, 0.92)");
    bg.addColorStop(0.65, "rgba(232, 196, 138, 0.78)");
    bg.addColorStop(1, "rgba(164, 118, 66, 0.65)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Classic East-Asian wooden fretwork lattice mullions (回字紋木格花窗)
    ctx.strokeStyle = "#3f2213";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, size - 48, size - 48);
    ctx.strokeRect(64, 64, size - 128, size - 128);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 6); ctx.lineTo(size * 0.5, size - 6);
    ctx.moveTo(6, size * 0.5); ctx.lineTo(size - 6, size * 0.5);
    ctx.moveTo(24, 24); ctx.lineTo(64, 64);
    ctx.moveTo(size - 24, 24); ctx.lineTo(size - 64, 64);
    ctx.moveTo(24, size - 24); ctx.lineTo(64, size - 64);
    ctx.moveTo(size - 24, size - 24); ctx.lineTo(size - 64, size - 64);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    this.cache.latticeScreen = tex;
    return tex;
  },

  createFaceCanvas: function () {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.encoding = THREE.sRGBEncoding;
    return { canvas: c, ctx: c.getContext("2d"), tex: tex };
  },

  createGodRayTexture: function () {
    if (this.cache.godRay) return this.cache.godRay;
    const w = 128;
    const h = 256;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, "rgba(255, 244, 210, 0)");
    hGrad.addColorStop(0.28, "rgba(255, 244, 210, 0.36)");
    hGrad.addColorStop(0.50, "rgba(255, 250, 228, 0.68)");
    hGrad.addColorStop(0.72, "rgba(255, 244, 210, 0.36)");
    hGrad.addColorStop(1, "rgba(255, 244, 210, 0)");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);

    // Smooth vertical fade along top & bottom edges
    ctx.globalCompositeOperation = "destination-in";
    const vGrad = ctx.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, "rgba(255, 255, 255, 0.92)");
    vGrad.addColorStop(0.45, "rgba(255, 255, 255, 0.52)");
    vGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.godRay = tex;
    return tex;
  },

  createPetalTexture: function () {
    if (this.cache.petal) return this.cache.petal;
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 26);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.65, "rgba(255, 255, 255, 0.88)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.15)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(32, 6);
    ctx.quadraticCurveTo(50, 26, 32, 58);
    ctx.quadraticCurveTo(14, 26, 32, 6);
    ctx.closePath();
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.petal = tex;
    return tex;
  },

  createGlowParticleTexture: function () {
    if (this.cache.glowParticle) return this.cache.glowParticle;
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.28, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.62, "rgba(255, 255, 255, 0.28)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.glowParticle = tex;
    return tex;
  },

  createCloudTexture: function () {
    if (this.cache.cloudPuff) return this.cache.cloudPuff;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    [
      [128, 134, 96, 0.34],
      [88, 144, 68, 0.28],
      [168, 144, 70, 0.28],
      [112, 114, 66, 0.26],
      [148, 118, 60, 0.24]
    ].forEach(function (p) {
      const g = ctx.createRadialGradient(p[0], p[1], p[2] * 0.12, p[0], p[1], p[2]);
      g.addColorStop(0, "rgba(255, 255, 255, " + p[3] + ")");
      g.addColorStop(0.55, "rgba(241, 245, 255, " + (p[3] * 0.5) + ")");
      g.addColorStop(1, "rgba(241, 245, 255, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    this.cache.cloudPuff = tex;
    return tex;
  },

  createWaterBumpTexture: function () {
    if (this.cache.waterBump) return this.cache.waterBump;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const step = (Math.PI * 2) / size;
    const img = typeof ctx.createImageData === "function" ? ctx.createImageData(size, size) : null;
    if (img && img.data && typeof ctx.putImageData === "function") {
      const data = img.data;
      for (let y = 0; y < size; y++) {
        const ay = y * step;
        const rowOff = y * size * 4;
        for (let x = 0; x < size; x++) {
          const ax = x * step;
          const wave = Math.sin(ax * 4 + Math.cos(ay * 3)) * 0.4 + Math.cos(ay * 6 + Math.sin(ax * 2)) * 0.35 + Math.sin((ax + ay) * 8) * 0.25;
          const v = clamp(Math.round(128 + wave * 64), 20, 240);
          const di = rowOff + x * 4;
          data[di] = v;
          data[di + 1] = v;
          data[di + 2] = v;
          data[di + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    } else {
      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const ax = x * step;
          const ay = y * step;
          const wave = Math.sin(ax * 4 + Math.cos(ay * 3)) * 0.4 + Math.cos(ay * 6 + Math.sin(ax * 2)) * 0.35 + Math.sin((ax + ay) * 8) * 0.25;
          const v = clamp(Math.round(128 + wave * 64), 20, 240);
          ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    this.cache.waterBump = tex;
    return tex;
  },

  createPlaqueCanvas: function () {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 204;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.encoding = THREE.sRGBEncoding;
    return { canvas: c, ctx: c.getContext("2d"), tex: tex };
  },

  drawPlaque: function (ctx, seat, isSpeaking, mark) {
    const w = 320;
    const h = 128;
    ctx.save();
    if (ctx.canvas && ctx.canvas.width === 512 && typeof ctx.scale === "function") {
      ctx.clearRect(0, 0, 512, 204);
      ctx.scale(1.6, 1.59375);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Handcrafted dark lacquer wooden nameplate with antique-gold inner rule
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isSpeaking) {
      bgGrad.addColorStop(0, "#d49b3c");
      bgGrad.addColorStop(1, "#a66c1c");
    } else if (!seat.alive) {
      bgGrad.addColorStop(0, "#232a36");
      bgGrad.addColorStop(1, "#161b24");
    } else {
      bgGrad.addColorStop(0, "#241913");
      bgGrad.addColorStop(1, "#160f0b");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const frameCol = isSpeaking
      ? "#fef08a"
      : (mark === "wolf" ? "#dc5a50" : (mark === "good" ? "#4ca885" : "#c99a4e"));
    ctx.strokeStyle = frameCol;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = "rgba(242, 212, 156, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(11, 11, w - 22, h - 22);

    // Left Circular Mini-Portrait Medallion (real studio illustration!)
    const px = 68;
    const py = 64;
    const pr = 44;
    const rawImg = this.getRawPortraitImage(seat);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (rawImg && rawImg.naturalWidth > 0) {
      const side = Math.min(rawImg.naturalWidth, rawImg.naturalHeight);
      ctx.drawImage(rawImg, (rawImg.naturalWidth - side) * 0.5, 0, side, side, px - pr, py - pr, pr * 2, pr * 2);
      if (!seat.alive) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.58)";
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
    } else if (typeof drawCharacterPortrait === "function") {
      drawCharacterPortrait(ctx, px, py, pr, seat, { nowMs: 0, daylight: false });
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.strokeStyle = frameCol;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Right Seat Number + Serif Nameplate Typography
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isSpeaking ? "#2b1908" : (!seat.alive ? "#94a3b8" : "#d9b46c");
    ctx.font = "700 22px 'Noto Serif TC', 'Songti TC', serif";
    ctx.fillText("第 " + fmtSeatNum(seat.id) + " 席", 128, 42);

    ctx.strokeStyle = isSpeaking ? "rgba(43, 25, 8, 0.35)" : "rgba(212, 166, 87, 0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 62);
    ctx.lineTo(294, 62);
    ctx.stroke();

    ctx.fillStyle = isSpeaking ? "#1a0e04" : (!seat.alive ? "#9ca3af" : "#fbf4e6");
    ctx.font = "900 38px 'Noto Serif TC', 'Noto Sans TC', serif";
    ctx.fillText(seat.name, 128, 92);
    ctx.restore();
  }
};
