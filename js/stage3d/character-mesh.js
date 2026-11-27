/**
 * 3D 二次元人物造型與桌上道具建模引擎（原神璃月風賽璐珞建模＋共享幾何體池）
 * 升級包含：
 * - 二次元瓜子臉精雕頭型（V 字收尖下顎、無縫曲面臉部貼圖、微翹鼻尖）
 * - 8 位書院夥伴專屬造型：漸細緞帶式長／短／雙馬尾／刺蝟／側分／鮑伯髮型＋微風物理擺動
 * - 分層立體學院服飾：開襟外套／書院領口／飄逸圍巾與蝴蝶結／坐姿雙腿與履靴（端坐茶椅）
 * - 原神風卡通階調著色＋天使髮環＋暖褐墨線描邊，並支援 1~8 號全員 .VRM/.GLB 即時替換
 */
"use strict";

const stage3dCharGeos = {
  ready: false,
  ensure: function () {
    if (this.ready) return this;
    this.ready = true;
    const hasAnime = typeof stage3dAnime !== "undefined";
    const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";

    this.baseRing = new THREE.TorusGeometry(0.72, 0.016, 6, 24);
    this.seatCushion = new THREE.BoxGeometry(0.86, 0.11, 0.80);
    this.cushionPiping = new THREE.BoxGeometry(0.88, 0.022, 0.82);
    if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
      // Classic Ming-style slender arched official-hat headrest rail (搭腦曲線) scaled to VRM proportions
      const crestCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.46, 0.04, 0.04),
        new THREE.Vector3(0.0, 0.09, -0.04),
        new THREE.Vector3(0.46, 0.04, 0.04)
      );
      this.backrest = new THREE.TubeGeometry(crestCurve, 14, 0.048, 8, false);
    } else {
      this.backrest = new THREE.BoxGeometry(0.86, 0.11, 0.09);
    }
    this.chairSplat = new THREE.BoxGeometry(0.24, 0.84, 0.040);
    this.chairMedallion = new THREE.CylinderGeometry(0.082, 0.082, 0.050, 14);
    this.chairSpindle = new THREE.CylinderGeometry(0.030, 0.036, 0.94, 8);
    this.chairLeg = new THREE.CylinderGeometry(0.048, 0.038, 0.65, 8);

    if (hasLathe) {
      // Refined slimmer anime torso proportions with sculpted waist & chest contour
      this.torso = new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.32, 0.03),
        new THREE.Vector2(0.25, 0.22),
        new THREE.Vector2(0.30, 0.50),
        new THREE.Vector2(0.35, 0.78),
        new THREE.Vector2(0.24, 0.90),
        new THREE.Vector2(0.01, 0.92)
      ], 22);
      // Flared pleated lower robe / seated coat skirt draping DOWNWARD from waist onto chair cushion (ascending Y for outward normals!)
      this.lapSkirt = new THREE.LatheGeometry([
        new THREE.Vector2(0.46, -0.14),
        new THREE.Vector2(0.42, -0.02),
        new THREE.Vector2(0.32, 0.12),
        new THREE.Vector2(0.24, 0.24)
      ], 18);
      this.teacup = new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.068, 0.0),
        new THREE.Vector2(0.092, 0.05),
        new THREE.Vector2(0.102, 0.13),
        new THREE.Vector2(0.090, 0.13),
        new THREE.Vector2(0.075, 0.04),
        new THREE.Vector2(0.01, 0.03)
      ], 14);
      this.candleHolder = new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.158, 0.0),
        new THREE.Vector2(0.142, 0.025),
        new THREE.Vector2(0.108, 0.042),
        new THREE.Vector2(0.056, 0.055),
        new THREE.Vector2(0.098, 0.092),
        new THREE.Vector2(0.118, 0.115),
        new THREE.Vector2(0.082, 0.108)
      ], 18);
      // Close-up grade beeswax candle pillar with soft melted wax drip collar
      this.candleStick = new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.072, 0.0),
        new THREE.Vector2(0.068, 0.12),
        new THREE.Vector2(0.074, 0.21),
        new THREE.Vector2(0.066, 0.255),
        new THREE.Vector2(0.058, 0.275),
        new THREE.Vector2(0.036, 0.262),
        new THREE.Vector2(0.01, 0.260)
      ], 16);
      // Sculpted organic teardrop flame (high-segment smooth curve — zero faceted crystal look!)
      this.candleFlame = new THREE.LatheGeometry([
        new THREE.Vector2(0.004, 0.0),
        new THREE.Vector2(0.030, 0.022),
        new THREE.Vector2(0.045, 0.056),
        new THREE.Vector2(0.040, 0.098),
        new THREE.Vector2(0.024, 0.138),
        new THREE.Vector2(0.009, 0.162),
        new THREE.Vector2(0.001, 0.176)
      ], 22);
      this.candleFlameCore = new THREE.LatheGeometry([
        new THREE.Vector2(0.002, 0.008),
        new THREE.Vector2(0.020, 0.032),
        new THREE.Vector2(0.024, 0.064),
        new THREE.Vector2(0.013, 0.100),
        new THREE.Vector2(0.001, 0.120)
      ], 16);
    } else {
      this.torso = new THREE.CylinderGeometry(0.30, 0.36, 0.90, 14);
      this.lapSkirt = new THREE.CylinderGeometry(0.28, 0.44, 0.38, 14);
      this.teacup = new THREE.CylinderGeometry(0.095, 0.068, 0.13, 12);
      this.candleHolder = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12);
      this.candleStick = new THREE.CylinderGeometry(0.065, 0.075, 0.28, 12);
      this.candleFlame = new THREE.ConeGeometry(0.044, 0.16, 16);
      this.candleFlameCore = new THREE.ConeGeometry(0.024, 0.10, 12);
    }

    // Seated lower body (thighs resting forward on cushion, shins dropping to courtyard stone, sculpted boots)
    this.seatedThigh = new THREE.CylinderGeometry(0.112, 0.096, 0.46, 12);
    this.seatedShin = new THREE.CylinderGeometry(0.092, 0.072, 0.56, 10);
    this.shoe = new THREE.SphereGeometry(0.098, 10, 8);
    this.belt = new THREE.TorusGeometry(0.265, 0.036, 8, 22);
    this.beltBuckle = new THREE.BoxGeometry(0.095, 0.095, 0.05);

    this.teasaucer = new THREE.CylinderGeometry(0.155, 0.125, 0.022, 16);
    this.teaLidRim = new THREE.CylinderGeometry(0.082, 0.112, 0.032, 16);
    this.teaLidKnob = new THREE.SphereGeometry(0.022, 10, 8);
    this.fogSealStrip = new THREE.BoxGeometry(0.11, 0.008, 0.25);
    this.contactShadow = new THREE.PlaneGeometry(1.95, 1.95);
    this.candleGlow = new THREE.PlaneGeometry(1.15, 1.15);
    this.collar = new THREE.TorusGeometry(0.21, 0.052, 10, 22);
    this.shoulderCap = new THREE.SphereGeometry(0.098, 12, 10);
    this.upperArm = new THREE.CylinderGeometry(0.084, 0.102, 0.29, 12);
    this.forearm = new THREE.CylinderGeometry(0.068, 0.056, 0.27, 12);
    this.hand = new THREE.SphereGeometry(0.074, 10, 8);
    this.thumb = new THREE.SphereGeometry(0.028, 8, 6);
    this.voteCard = new THREE.BoxGeometry(0.28, 0.38, 0.03);
    this.neck = new THREE.CylinderGeometry(0.092, 0.112, 0.22, 12);

    // Sculpted Anime V-Jaw Head + Curved Seamless 512x512 Face Overlay + Subtle Anime Nose
    this.headSphere = hasAnime ? stage3dAnime.createAnimeHeadGeometry(0.42) : new THREE.SphereGeometry(0.42, 26, 20);
    this.faceCurved = hasAnime
      ? stage3dAnime.createAnimeFacePatchGeometry(0.425)
      : new THREE.SphereGeometry(0.425, 24, 18, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.26, Math.PI * 0.50);
    this.nose = new THREE.ConeGeometry(0.022, 0.052, 5);
    this.ear = new THREE.SphereGeometry(0.064, 10, 8);
    this.hairCap = new THREE.SphereGeometry(0.448, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
    this.backHair = new THREE.SphereGeometry(0.442, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.72);
    this.sleeveCuff = new THREE.TorusGeometry(0.098, 0.018, 8, 16);
    this.glassRim = new THREE.TorusGeometry(0.082, 0.011, 8, 20);
    this.glassLens = new THREE.CircleGeometry(0.076, 16);
    this.glassBridge = new THREE.BoxGeometry(0.085, 0.013, 0.013);
    this.bowCone = new THREE.ConeGeometry(0.085, 0.17, 6);
    this.headband = new THREE.TorusGeometry(0.435, 0.030, 8, 24);
    this.hairPin = new THREE.OctahedronGeometry(0.072, 0);
    this.haloRing = new THREE.RingGeometry(0.56, 0.66, 28);
    this.hitCyl = new THREE.CylinderGeometry(0.76, 0.76, 2.55, 10);
    this.plaqueBox = new THREE.BoxGeometry(0.78, 0.28, 0.048);
    // Coalesce 6-face BoxGeometry groups (4 identical wood sides + 2 identical plaque faces) into 2 draw calls while preserving the 6-slot material array!
    if (typeof this.plaqueBox.clearGroups === "function" && typeof this.plaqueBox.addGroup === "function" && Array.isArray(this.plaqueBox.groups) && this.plaqueBox.groups.length === 6) {
      this.plaqueBox.clearGroups();
      this.plaqueBox.addGroup(0, 24, 0);
      this.plaqueBox.addGroup(24, 12, 4);
    }
    this.candleWick = new THREE.CylinderGeometry(0.005, 0.006, 0.032, 5);
    this.candleHalo = new THREE.SphereGeometry(0.072, 8, 6);
    this.candleHit = new THREE.CylinderGeometry(0.16, 0.16, 0.52, 8);
    this.sheriffCrown = new THREE.ConeGeometry(0.036, 0.11, 5);
    this.sheriffRing = new THREE.TorusGeometry(0.125, 0.018, 8, 22);
    this.sheriffPearl = new THREE.SphereGeometry(0.032, 10, 8);
    this.markCrystal = new THREE.OctahedronGeometry(0.052, 0);
    this.idCard = new THREE.BoxGeometry(0.58, 0.032, 0.80);
    this.idCardHit = new THREE.BoxGeometry(0.76, 0.28, 0.96);

    // Pre-merged static seat prop geometries (cuts ~100+ draw calls across 8–12 seats with zero visual change!)
    if (typeof mergeStaticBufferGeos === "function") {
      this.chairWoodMerged = mergeStaticBufferGeos([
        { geo: this.backrest, py: 1.56, pz: -0.41 },
        { geo: this.chairSplat, py: 1.14, pz: -0.42 },
        { geo: this.chairSpindle, px: -0.38, py: 1.14, pz: -0.39 },
        { geo: this.chairSpindle, px: 0.38, py: 1.14, pz: -0.39 },
        { geo: this.chairLeg, px: -0.36, py: 0.325, pz: -0.37 },
        { geo: this.chairLeg, px: 0.36, py: 0.325, pz: -0.37 },
        { geo: this.chairLeg, px: -0.36, py: 0.325, pz: 0.31 },
        { geo: this.chairLeg, px: 0.36, py: 0.325, pz: 0.31 }
      ], false);
      this.chairGoldMerged = mergeStaticBufferGeos([
        { geo: this.cushionPiping, py: 0.62, pz: -0.03 },
        { geo: this.chairMedallion, py: 1.30, pz: -0.42, rx: Math.PI * 0.5 }
      ], false);
      this.teaCupMerged = mergeStaticBufferGeos([
        { geo: this.teasaucer, py: 0.011 },
        { geo: this.teacup, py: 0.022 }
      ], false);
      this.teaLidMerged = mergeStaticBufferGeos([
        { geo: this.teaLidRim },
        { geo: this.teaLidKnob, py: 0.026 }
      ], false);
    }
    return this;
  }
};

function makeAnimeToon(colorHex, opts) {
  const o = opts || {};
  if (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.createAnimeMaterial === "function") {
    return stage3dAnime.createAnimeMaterial({
      color: colorHex,
      isHair: o.isHair,
      hairRingColor: o.hairRingColor,
      hairRingStrength: o.hairRingStrength !== undefined ? o.hairRingStrength : (o.isHair ? 0.16 : 0),
      rimColor: o.rimColor || 0xfff3cf,
      rimStrength: o.rimStrength !== undefined ? o.rimStrength : 0.16,
      shadowTint: o.shadowTint || 0xd6c6e8,
      shadowLift: o.shadowLift !== undefined ? o.shadowLift : 0.12,
      bumpMap: o.bumpMap,
      bumpScale: o.bumpScale
    });
  }
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.54, metalness: 0.06 });
}

function addOutline(mesh, width, colHex) {
  if (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.addAnimeOutline === "function") {
    stage3dAnime.addAnimeOutline(mesh, width || 0.006, colHex || 0x3b241e);
  }
}

function makeHairRibbonMesh(pts, rBase, rTip, aspect, mat, outlineW) {
  const geo = (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.createTaperedHairLockGeo === "function")
    ? stage3dAnime.createTaperedHairLockGeo(pts, rBase, rTip, aspect || 1.48, 11, 8)
    : new THREE.ConeGeometry(rBase || 0.06, 0.28, 6);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  if (outlineW && outlineW > 0) addOutline(mesh, outlineW, 0x3b241e);
  return mesh;
}

function createIdCardFaceCanvas(isFront, roleDef, hidden) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 352;
  const ctx = c.getContext("2d");

  if (!isFront || hidden || !roleDef) {
    const g = ctx.createLinearGradient(0, 0, 256, 352);
    g.addColorStop(0, "#1e1b4b");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 352);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, 232, 328);
    ctx.strokeStyle = "rgba(253, 224, 71, 0.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, 208, 304);

    ctx.beginPath();
    ctx.arc(128, 152, 58, 0, Math.PI * 2);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fde68a";
    ctx.font = "900 52px 'Noto Sans TC', sans-serif";
    ctx.fillText("善", 128, 156);
    ctx.font = "700 22px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("點擊翻看底牌", 128, 268);
  } else {
    const isWolf = roleDef.team === "wolf";
    const g = ctx.createLinearGradient(0, 0, 256, 352);
    g.addColorStop(0, isWolf ? "#4c0519" : "#064e3b");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 352);
    ctx.strokeStyle = isWolf ? "#fb7185" : "#34d399";
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, 232, 328);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isWolf ? "#fda4af" : "#6ee7b7";
    ctx.font = "900 22px 'Noto Sans TC', sans-serif";
    ctx.fillText(isWolf ? "酸民狼陣營" : "三好好人陣營", 128, 66);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 54px 'Noto Sans TC', sans-serif";
    ctx.fillText(roleDef.name, 128, 174);

    ctx.fillStyle = "#fde68a";
    ctx.font = "700 18px 'Noto Sans TC', sans-serif";
    ctx.fillText("再次點擊蓋牌", 128, 294);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  return { canvas: c, ctx: ctx, tex: tex };
}

function createPlaqueBackTexture() {
  if (stage3dTextures.cache.plaqueBack) return stage3dTextures.cache.plaqueBack;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1c120c";
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 84);
  ctx.fillStyle = "rgba(245, 185, 66, 0.72)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 26px 'Noto Sans TC', sans-serif";
  ctx.fillText("· 三好狼人殺 ·", 128, 49);
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  stage3dTextures.cache.plaqueBack = tex;
  return tex;
}

function build3DSeatPool(scene) {
  stage3dCharGeos.ensure();
  const pool = {
    root: new THREE.Group(),
    slots: {},
    anchors: {},
    hitMeshes: [],
    candleHitMeshes: [],
    idCardHitMesh: null,
    frameCounter: 0
  };
  scene.add(pool.root);
  return pool;
}

/**
 * 8 位書院角色專屬原神風雕塑級髮型＋頭飾系統（漸細新月髮束＋風動髮絲節點）
 */
function build3DHairAndAccessories(headGroup, st, G, seatId) {
  const hairMat = makeAnimeToon(st.hair || "#2a1f1a", {
    isHair: true,
    hairRingColor: st.hairHi || "#ffe5a8",
    hairRingStrength: 0.16,
    rimStrength: 0.18,
    shadowTint: 0x3b2c4e,
    shadowLift: 0.12
  });
  const accMat = makeAnimeToon(st.accent || "#d4a657", { rimStrength: 0.58 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe6be68, roughness: 0.24, metalness: 0.80 });
  const swayHairParts = [];

  // 1. Sculpted base skull crown & nape
  const cap = new THREE.Mesh(G.hairCap, hairMat);
  cap.position.set(0, 0.08, -0.02);
  cap.rotation.x = -0.22;
  cap.castShadow = true;
  addOutline(cap, 0.008, 0x211412);
  headGroup.add(cap);

  const isLong = st.style === "long";
  const isBob = st.style === "bob";
  const isTwin = st.style === "twintail";
  const isSpiky = st.style === "spiky";
  const isTousled = st.style === "tousled";

  const backHair = new THREE.Mesh(G.backHair, hairMat);
  backHair.position.set(0, isLong ? -0.10 : (isBob ? -0.05 : -0.01), -0.09);
  backHair.scale.set(1.03, isLong ? 1.38 : (isBob ? 1.15 : 0.94), 0.92);
  backHair.castShadow = true;
  headGroup.add(backHair);

  // 2. Layered Asymmetric Sweeping Bangs (strictly arching over upper brow so eyes shine clearly!)
  const bangCount = isSpiky ? 6 : 5;
  const bangAnchor = [
    [-0.27, 0.36, 0.22, -0.24, 0.18, 0.39, 0.052],
    [-0.14, 0.40, 0.22, -0.11, 0.22, 0.41, 0.056],
    [0.01, 0.41, 0.22, (st.style === "sidepart" ? 0.08 : -0.01), 0.23, 0.415, 0.052],
    [0.14, 0.40, 0.22, 0.16, 0.21, 0.40, 0.056],
    [0.27, 0.35, 0.22, 0.28, 0.17, 0.36, 0.050],
    [-0.04, 0.43, 0.16, 0.04, 0.25, 0.42, 0.044]
  ];
  for (let i = 0; i < bangCount; i++) {
    const b = bangAnchor[i];
    const pts = isSpiky
      ? [
          new THREE.Vector3(b[0], b[1], b[2]),
          new THREE.Vector3(b[3] * 1.1, b[4] + 0.07, b[5] + 0.03),
          new THREE.Vector3(b[3] * 1.25, b[4] + 0.02, b[5] + 0.06)
        ]
      : [
          new THREE.Vector3(b[0], b[1], b[2]),
          new THREE.Vector3((b[0] + b[3]) * 0.5, (b[1] + b[4]) * 0.5 + 0.03, b[5] + 0.01),
          new THREE.Vector3(b[3], b[4], b[5] - 0.01)
        ];
    headGroup.add(makeHairRibbonMesh(pts, b[6], 0.005, 1.55, hairMat, 0));
  }

  // 3. Delicate Tapered Cheek-Framing Temple Locks (with wind sway!)
  [-1, 1].forEach(function (side) {
    const tLockPivot = new THREE.Group();
    tLockPivot.position.set(side * 0.35, 0.14, 0.17);
    const tipY = isLong ? -0.58 : (isBob ? -0.44 : -0.34);
    const lockPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.05, tipY * 0.5, 0.04),
      new THREE.Vector3(side * 0.01, tipY, 0.03)
    ];
    tLockPivot.add(makeHairRibbonMesh(lockPts, 0.054, 0.005, 1.45, hairMat, 0.006));
    headGroup.add(tLockPivot);
    swayHairParts.push({ pivot: tLockPivot, baseZ: side * 0.03, baseX: 0, amp: 0.045, phase: seatId * 0.8 + side });
  });

  // 4. Silhouette-Defining Back & Crown Hair Craft (unique per persona!)
  if (isTwin) {
    [-1, 1].forEach(function (side) {
      const twinPivot = new THREE.Group();
      twinPivot.position.set(side * 0.41, 0.10, -0.14);
      const tie = new THREE.Mesh(G.sleeveCuff, goldMat);
      tie.scale.setScalar(0.88);
      tie.rotation.y = side * 0.7;
      twinPivot.add(tie);
      [
        [[0, 0, 0], [side * 0.16, -0.30, -0.08], [side * 0.10, -0.66, -0.02], 0.092],
        [[side * 0.02, -0.02, -0.02], [side * 0.24, -0.24, -0.14], [side * 0.20, -0.52, -0.10], 0.062],
        [[0, 0, 0.03], [side * 0.08, -0.26, 0.06], [side * 0.03, -0.48, 0.04], 0.052]
      ].forEach(function (sd) {
        twinPivot.add(makeHairRibbonMesh(
          [new THREE.Vector3(sd[0][0], sd[0][1], sd[0][2]), new THREE.Vector3(sd[1][0], sd[1][1], sd[1][2]), new THREE.Vector3(sd[2][0], sd[2][1], sd[2][2])],
          sd[3], 0.006, 1.38, hairMat, 0.007
        ));
      });
      headGroup.add(twinPivot);
      swayHairParts.push({ pivot: twinPivot, baseZ: side * 0.08, baseX: 0.05, amp: 0.09, phase: seatId + side * 0.5 });
    });
  } else if (isLong) {
    const longMantlePivot = new THREE.Group();
    longMantlePivot.position.set(0, -0.05, -0.34);
    [-0.24, -0.12, 0, 0.12, 0.24].forEach(function (ox, idx) {
      const len = idx === 2 ? -0.78 : (Math.abs(idx - 2) === 1 ? -0.72 : -0.62);
      longMantlePivot.add(makeHairRibbonMesh([
        new THREE.Vector3(ox, 0.12, 0.04),
        new THREE.Vector3(ox * 1.15, len * 0.48, -0.06),
        new THREE.Vector3(ox * 1.05, len, -0.02)
      ], 0.082, 0.007, 1.65, hairMat, 0.007));
    });
    headGroup.add(longMantlePivot);
    swayHairParts.push({ pivot: longMantlePivot, baseZ: 0, baseX: 0.06, amp: 0.075, phase: seatId * 1.1 });
  } else if (isBob) {
    [-0.24, -0.10, 0.10, 0.24].forEach(function (ox) {
      headGroup.add(makeHairRibbonMesh([
        new THREE.Vector3(ox * 0.9, 0.16, -0.24),
        new THREE.Vector3(ox * 1.12, -0.12, -0.32),
        new THREE.Vector3(ox * 0.85, -0.36, -0.18)
      ], 0.080, 0.012, 1.55, hairMat, 0.006));
    });
  } else if (isSpiky || isTousled) {
    // Dynamic lifted crown spikes & back tufts
    [
      [[0, 0.36, 0.06], [0.06, 0.58, 0.12], [0.14, 0.62, 0.02], 0.058],
      [[-0.14, 0.32, 0.04], [-0.28, 0.50, 0.02], [-0.36, 0.48, -0.08], 0.056],
      [[0.15, 0.32, 0.02], [0.30, 0.48, 0.0], [0.38, 0.44, -0.10], 0.056],
      [[0, 0.28, -0.22], [0.02, 0.44, -0.44], [0.04, 0.38, -0.56], 0.064],
      [[-0.22, 0.22, -0.18], [-0.38, 0.32, -0.36], [-0.42, 0.24, -0.46], 0.058],
      [[0.22, 0.22, -0.18], [0.38, 0.32, -0.36], [0.42, 0.24, -0.46], 0.058]
    ].forEach(function (sp) {
      headGroup.add(makeHairRibbonMesh(
        [new THREE.Vector3(sp[0][0], sp[0][1], sp[0][2]), new THREE.Vector3(sp[1][0], sp[1][1], sp[1][2]), new THREE.Vector3(sp[2][0], sp[2][1], sp[2][2])],
        sp[3], 0.005, 1.32, hairMat, 0.006
      ));
    });
  } else {
    // Sleek / Sidepart / Layered soft ahoge & nape locks
    const ahoge = makeHairRibbonMesh([
      new THREE.Vector3(0, 0.40, 0.04),
      new THREE.Vector3(0.06, 0.55, 0.06),
      new THREE.Vector3(0.16, 0.50, -0.02)
    ], 0.030, 0.004, 1.25, hairMat, 0.005);
    headGroup.add(ahoge);
    [-0.18, 0, 0.18].forEach(function (ox) {
      headGroup.add(makeHairRibbonMesh([
        new THREE.Vector3(ox, 0.10, -0.28),
        new THREE.Vector3(ox * 1.05, -0.12, -0.34),
        new THREE.Vector3(ox * 0.92, -0.30, -0.26)
      ], 0.072, 0.010, 1.5, hairMat, 0.006));
    });
  }

  // 5. Crisp Character Headwear / Eyewear
  let glassesGroup = null;
  if (st.acc === "glasses") {
    glassesGroup = new THREE.Group();
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.22, metalness: 0.80 });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xcffafe, transparent: true, opacity: 0.22, depthWrite: false });
    [-0.130, 0.130].forEach(function (gx) {
      const lensRim = new THREE.Mesh(G.glassRim, rimMat);
      lensRim.position.set(gx, 0.022, 0.422);
      lensRim.rotation.y = gx < 0 ? -0.20 : 0.20;
      const lens = new THREE.Mesh(G.glassLens, lensMat);
      lens.position.set(gx, 0.022, 0.420);
      lens.rotation.y = gx < 0 ? -0.20 : 0.20;
      glassesGroup.add(lensRim, lens);
    });
    const bridge = new THREE.Mesh(G.glassBridge, rimMat);
    bridge.position.set(0, 0.028, 0.432);
    glassesGroup.add(bridge);
    headGroup.add(glassesGroup);
  } else if (st.acc === "ribbon") {
    const bowL = new THREE.Mesh(G.bowCone, accMat);
    bowL.position.set(0.30, 0.30, 0.16);
    bowL.rotation.z = 0.88;
    const bowR = new THREE.Mesh(G.bowCone, accMat);
    bowR.position.set(0.38, 0.22, 0.16);
    bowR.rotation.z = -1.62;
    const centerKnot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), goldMat);
    centerKnot.position.set(0.34, 0.26, 0.18);
    headGroup.add(bowL, bowR, centerKnot);
  } else if (st.acc === "clip" || st.acc === "star_clip") {
    // 星兒：金色五角星髮夾
    const starGroup = new THREE.Group();
    starGroup.position.set(0.28, 0.28, 0.26);
    starGroup.rotation.z = 0.35;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const ray = new THREE.Mesh(G.hairPin, goldMat);
      ray.scale.set(0.55, 1.15, 0.35);
      ray.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
      ray.rotation.z = a - Math.PI * 0.5;
      starGroup.add(ray);
    }
    headGroup.add(starGroup);
  } else if (st.acc === "jade_hairpin") {
    // 晴嵐：青玉流蘇古風髮簪
    const jadeMatH = makeAnimeToon(0x6ec7a5, { rimStrength: 0.65 });
    const pinGrp = new THREE.Group();
    pinGrp.position.set(0.32, 0.28, 0.14);
    pinGrp.rotation.set(0.1, 0.2, -0.52);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.010, 0.42, 8), goldMat);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), jadeMatH);
    bead.position.y = 0.18;
    const tassel = new THREE.Mesh(G.bowCone, jadeMatH);
    tassel.scale.set(0.58, 1.35, 0.58);
    tassel.position.set(0.07, 0.02, 0);
    tassel.rotation.z = 0.52;
    pinGrp.add(stem, bead, tassel);
    headGroup.add(pinGrp);
  } else if (st.acc === "yuzu_clip") {
    // 柚子：金柚＋雙綠葉水果髮夾
    const yzGrp = new THREE.Group();
    yzGrp.position.set(0.29, 0.27, 0.25);
    yzGrp.rotation.z = 0.25;
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), makeAnimeToon(0xf4b938, { rimStrength: 0.5 }));
    const leafMat = makeAnimeToon(0x4ca64c, { rimStrength: 0.45 });
    const l1 = new THREE.Mesh(G.bowCone, leafMat);
    l1.scale.set(0.42, 0.72, 0.35); l1.position.set(-0.052, 0.048, 0); l1.rotation.z = 0.85;
    const l2 = new THREE.Mesh(G.bowCone, leafMat);
    l2.scale.set(0.38, 0.62, 0.35); l2.position.set(-0.015, 0.068, 0); l2.rotation.z = 0.25;
    yzGrp.add(fruit, l1, l2);
    headGroup.add(yzGrp);
  } else if (st.acc === "headband") {
    const band = new THREE.Mesh(G.headband, accMat);
    band.rotation.x = Math.PI * 0.42;
    band.position.set(0, 0.22, 0.02);
    addOutline(band, 0.006, 0x241512);
    headGroup.add(band);

    const bandTailPivot = new THREE.Group();
    bandTailPivot.position.set(0.18, 0.20, -0.40);
    bandTailPivot.add(makeHairRibbonMesh([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.12, -0.06, -0.18),
      new THREE.Vector3(0.20, -0.22, -0.28)
    ], 0.040, 0.012, 1.5, accMat, 0.005));
    headGroup.add(bandTailPivot);
    swayHairParts.push({ pivot: bandTailPivot, baseZ: 0, baseX: 0, amp: 0.12, phase: seatId * 1.3 });
  } else if (st.acc === "tie" || st.acc === "jade_pendant") {
    // Scholar jade hair clasp for 阿竹
    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.062, 0), makeAnimeToon(0x7bc2a6, { rimStrength: 0.6 }));
    clasp.scale.set(1.4, 0.6, 0.5);
    clasp.position.set(-0.28, 0.27, 0.25);
    clasp.rotation.set(0.2, -0.4, 0.5);
    headGroup.add(clasp);
  }

  return { glassesGroup: glassesGroup, swayHairParts: swayHairParts };
}

/**
 * 專屬於 8 位書院夥伴的分層學院服裝配件（雙襟領、絲巾、領帶、腰帶玉珮、坐姿下擺）
 */
function build3DCharacterOutfit(figureGroup, st, robeMat, accentMat, G) {
  const creamMat = makeAnimeToon(0xf7efe1, { rimStrength: 0.35, shadowTint: 0xd9cde0, shadowLift: 0.32 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xdfb15b, roughness: 0.24, metalness: 0.78 });
  const darkMat = makeAnimeToon(0x232732, { rimStrength: 0.32 });

  // Open coat sculpted twin lapels + crisp inner cream shirt chest V-panel
  [-1, 1].forEach(function (side) {
    const lapel = makeHairRibbonMesh([
      new THREE.Vector3(side * 0.17, 0.88, 0.16),
      new THREE.Vector3(side * 0.08, 0.64, 0.30),
      new THREE.Vector3(side * 0.05, 0.32, 0.27)
    ], 0.044, 0.022, 1.55, accentMat, 0.006);
    figureGroup.add(lapel);
  });

  const vestInsert = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.04, 0.44, 8), creamMat);
  vestInsert.scale.set(1.0, 1.0, 0.45);
  vestInsert.position.set(0, 0.67, 0.25);
  figureGroup.add(vestInsert);

  // Waist belt + antique gold academy buckle
  const belt = new THREE.Mesh(G.belt, darkMat);
  belt.rotation.x = Math.PI * 0.5;
  belt.position.set(0, 0.24, 0);
  const buckle = new THREE.Mesh(G.beltBuckle, goldMat);
  buckle.position.set(0, 0.24, 0.26);
  figureGroup.add(belt, buckle);

  // Flared coat / skirt lap draping gently DOWN onto chair cushion & thighs
  const lapSkirt = new THREE.Mesh(G.lapSkirt, robeMat);
  lapSkirt.position.set(0, 0.04, 0.04);
  lapSkirt.rotation.x = 0.10;
  lapSkirt.castShadow = true;
  addOutline(lapSkirt, 0.009, 0x241512);
  figureGroup.add(lapSkirt);

  // Character-signature chest embellishment
  if (st.acc === "scarf") {
    const scarfWrap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.072, 10, 22), accentMat);
    scarfWrap.rotation.x = Math.PI * 0.5;
    scarfWrap.position.set(0, 0.86, 0.02);
    const scarfTail = makeHairRibbonMesh([
      new THREE.Vector3(0.11, 0.84, 0.24),
      new THREE.Vector3(0.14, 0.58, 0.33),
      new THREE.Vector3(0.09, 0.34, 0.31)
    ], 0.056, 0.020, 1.5, accentMat, 0.006);
    figureGroup.add(scarfWrap, scarfTail);
  } else if (st.acc === "glasses" || st.acc === "turtle") {
    // Sleek Academy Necktie + Metal Lapel Pin
    const tie = makeHairRibbonMesh([
      new THREE.Vector3(0, 0.86, 0.24),
      new THREE.Vector3(0, 0.62, 0.31),
      new THREE.Vector3(0, 0.38, 0.29)
    ], 0.036, 0.012, 1.7, st.acc === "glasses" ? robeMat : accentMat, 0.005);
    const pin = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), goldMat);
    pin.position.set(-0.18, 0.66, 0.27);
    figureGroup.add(tie, pin);
  } else if (st.acc === "ribbon" || st.acc === "clip" || st.acc === "star_clip" || st.acc === "jade_hairpin" || st.acc === "yuzu_clip") {
    // Double Satin Chest Ribbon Bow + Tea Brooch
    [-1, 1].forEach(function (side) {
      const wing = new THREE.Mesh(G.bowCone, accentMat);
      wing.scale.setScalar(0.76);
      wing.position.set(side * 0.09, 0.78, 0.28);
      wing.rotation.z = side * -1.25;
      figureGroup.add(wing);
    });
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), goldMat);
    gem.position.set(0, 0.78, 0.30);
    figureGroup.add(gem);
  } else if (st.acc === "tie" || st.acc === "jade_pendant" || st.acc === "ink_scroll") {
    // Modern Hanfu Cinnabar Seal / Jade Pendant at Waist + Mandarin Frog Buttons
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.032), makeAnimeToon(0xa63a2e, { rimStrength: 0.4 }));
    seal.position.set(0.15, 0.14, 0.28);
    const jade = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), makeAnimeToon(0x7bc2a6, { rimStrength: 0.6 }));
    jade.position.set(0.15, 0.06, 0.28);
    figureGroup.add(seal, jade);
    if (st.acc === "ink_scroll") {
      [0.72, 0.54, 0.38].forEach(function (fy) {
        const frog = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.025), accentMat);
        frog.position.set(0, fy, 0.29);
        figureGroup.add(frog);
      });
    }
  } else if (st.acc === "tang_collar") {
    // 阿松：墨綠立領盤扣唐裝
    [0.74, 0.56, 0.38].forEach(function (fy) {
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.026, 0.028), accentMat);
      knot.position.set(0, fy, 0.29);
      figureGroup.add(knot);
    });
  } else if (st.acc === "gavel_brooch") {
    // 阿朗：辯論社金色法槌桂冠胸章
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 8, 16), goldMat);
    wreath.position.set(-0.17, 0.66, 0.28);
    const gavel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.075, 8), goldMat);
    gavel.position.set(-0.17, 0.66, 0.29);
    gavel.rotation.z = -0.55;
    figureGroup.add(wreath, gavel);
  }

  // Seated Lower Legs & Shoes resting cleanly under table (relative to figureGroup y = 0.72)
  const legsGroup = new THREE.Group();
  const pantMat = makeAnimeToon(0x282936, { rimStrength: 0.32 });
  const bootMat = makeAnimeToon(0x3b2820, { rimStrength: 0.38 });
  [-0.14, 0.14].forEach(function (lx) {
    const thigh = new THREE.Mesh(G.seatedThigh, pantMat);
    thigh.rotation.x = Math.PI * 0.46;
    thigh.position.set(lx, 0.01, 0.22);
    thigh.castShadow = true;

    const shin = new THREE.Mesh(G.seatedShin, pantMat);
    shin.rotation.x = -0.08;
    shin.position.set(lx, -0.30, 0.44);
    shin.castShadow = true;

    const shoe = new THREE.Mesh(G.shoe, bootMat);
    shoe.scale.set(0.90, 0.56, 1.48);
    shoe.position.set(lx, -0.59, 0.48);
    shoe.castShadow = true;
    addOutline(shoe, 0.007, 0x1a110e);

    legsGroup.add(thigh, shin, shoe);
  });
  figureGroup.add(legsGroup);
}

function buildArticulatedArm(sideSign, robeMat, accentMat, skinMat, G, withVoteCard) {
  const shoulderPivot = new THREE.Group();
  shoulderPivot.position.set(sideSign * 0.36, 0.78, 0.02);

  if (G.shoulderCap) {
    const cap = new THREE.Mesh(G.shoulderCap, robeMat);
    cap.castShadow = true;
    addOutline(cap, 0.007, 0x241512);
    shoulderPivot.add(cap);
  }

  const upper = new THREE.Mesh(G.upperArm, robeMat);
  upper.position.y = -0.14;
  upper.castShadow = true;
  addOutline(upper, 0.008, 0x241512);
  shoulderPivot.add(upper);

  if (G.sleeveCuff) {
    const cuff = new THREE.Mesh(G.sleeveCuff, accentMat);
    cuff.rotation.x = Math.PI * 0.5;
    cuff.position.y = -0.28;
    shoulderPivot.add(cuff);
  }

  const elbowPivot = new THREE.Group();
  elbowPivot.position.set(0, -0.28, 0);

  const fore = new THREE.Mesh(G.forearm, robeMat);
  fore.position.y = -0.13;
  fore.castShadow = true;
  addOutline(fore, 0.007, 0x241512);

  const hand = new THREE.Mesh(G.hand, skinMat);
  hand.scale.set(1.0, 0.85, 1.12);
  hand.position.y = -0.27;
  const thumb = new THREE.Mesh(G.thumb, skinMat);
  thumb.position.set(-sideSign * 0.050, -0.26, 0.036);
  elbowPivot.add(fore, hand, thumb);

  let voteCard = null;
  if (withVoteCard) {
    const vcMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.2 });
    voteCard = new THREE.Mesh(G.voteCard, vcMat);
    voteCard.position.set(0, -0.44, 0.12);
    voteCard.visible = false;
    elbowPivot.add(voteCard);
  }

  shoulderPivot.add(elbowPivot);
  return { shoulder: shoulderPivot, elbow: elbowPivot, hand: hand, voteCard: voteCard };
}

const stage3dCharMats = {
  ready: false,
  ensure: function () {
    if (this.ready) return this;
    this.ready = true;
    const wood = stage3dTextures.createWoodTextures();
    const fabric = stage3dTextures.createFabricTextures();
    const sealTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createFogSealStripTexture === "function")
      ? stage3dTextures.createFogSealStripTexture()
      : null;
    this.chairWood = new THREE.MeshStandardMaterial({ map: wood.map, color: 0x482616, roughness: 0.36, metalness: 0.16 });
    this.chairGold = new THREE.MeshStandardMaterial({ color: 0xd4a657, roughness: 0.28, metalness: 0.78 });
    this.cushion = new THREE.MeshStandardMaterial({ color: 0x52231c, bumpMap: fabric.bump, bumpScale: 0.022, roughness: 0.86, metalness: 0.04 });
    this.shadowDisc = new THREE.MeshBasicMaterial({ map: stage3dTextures.createContactShadowTexture(), transparent: true, opacity: 0.65, depthWrite: false });
    this.crown = new THREE.MeshStandardMaterial({ color: 0xf6d379, emissive: 0xd4942a, emissiveIntensity: 0.65, roughness: 0.22, metalness: 0.86 });
    this.crownJade = new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x10b981, emissiveIntensity: 0.55, roughness: 0.20, metalness: 0.22 });
    this.brass = new THREE.MeshStandardMaterial({ color: 0xc89232, roughness: 0.24, metalness: 0.86 });
    this.wax = new THREE.MeshStandardMaterial({ color: 0xf2e1be, emissive: 0xd99436, emissiveIntensity: 0.09, roughness: 0.38, metalness: 0.04 });
    this.wick = new THREE.MeshStandardMaterial({ color: 0x261a12, roughness: 0.9 });
    this.flameOuter = new THREE.MeshBasicMaterial({ color: 0xffa826, transparent: true, opacity: 0.86 });
    this.flameCore = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
    this.flameHalo = new THREE.MeshBasicMaterial({ color: 0xffbe4d, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    this.celadon = new THREE.MeshStandardMaterial({ color: 0xd1fae5, roughness: 0.12, metalness: 0.14 });
    this.teaLiquid = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.1, metalness: 0.2 });
    this.fogSeal = new THREE.MeshStandardMaterial({ color: sealTex ? 0xffffff : 0xe5d8bc, map: sealTex || null, roughness: 0.85, metalness: 0.02 });
    this.cardEdge = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 });
    this.hitInvisible = new THREE.MeshBasicMaterial({ visible: false });
    return this;
  }
};

function create3DSeatActor(seat) {
  const G = stage3dCharGeos.ensure();
  const M = stage3dCharMats.ensure();
  const fabric = stage3dTextures.createFabricTextures();
  const st = getAvatarStyleForSeat(seat);
  const root = new THREE.Group();

  // 1. Subtle Brushed-Gold Floor Indicator Ring (Hidden when idle to eliminate neon floor clutter & overdraw)
  const ringMat = new THREE.MeshStandardMaterial({
    color: "#e4b963",
    emissive: "#d4a657",
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.72
  });
  const baseRing = new THREE.Mesh(G.baseRing, ringMat);
  baseRing.rotation.x = Math.PI * 0.5;
  baseRing.position.y = 0.025;
  baseRing.visible = false;
  root.add(baseRing);

  // 2. Handcrafted Ming-Style Curved Backrest Tea Chair with Gold Medallion Splat & Crimson-Espresso Brocade Cushion
  const chairGroup = new THREE.Group();
  const chairWoodMat = M.chairWood;
  const chairGoldMat = M.chairGold;
  const cushionMat = M.cushion;

  const shadowDisc = new THREE.Mesh(G.contactShadow, M.shadowDisc);
  shadowDisc.rotation.x = -Math.PI * 0.5;
  shadowDisc.position.y = 0.015;
  chairGroup.add(shadowDisc);

  const seatCushion = new THREE.Mesh(G.seatCushion, cushionMat);
  seatCushion.position.set(0, 0.675, -0.03);
  seatCushion.receiveShadow = true;
  chairGroup.add(seatCushion);

  if (G.chairWoodMerged && G.chairGoldMerged) {
    chairGroup.add(new THREE.Mesh(G.chairWoodMerged, chairWoodMat), new THREE.Mesh(G.chairGoldMerged, chairGoldMat));
  } else {
    const piping = new THREE.Mesh(G.cushionPiping, chairGoldMat);
    piping.position.set(0, 0.62, -0.03);
    chairGroup.add(piping);

    const topRail = new THREE.Mesh(G.backrest, chairWoodMat);
    topRail.position.set(0, 1.56, -0.41);
    chairGroup.add(topRail);

    const centerSplat = new THREE.Mesh(G.chairSplat, chairWoodMat);
    centerSplat.position.set(0, 1.14, -0.42);
    chairGroup.add(centerSplat);

    const backMedallion = new THREE.Mesh(G.chairMedallion, chairGoldMat);
    backMedallion.rotation.x = Math.PI * 0.5;
    backMedallion.position.set(0, 1.30, -0.42);
    chairGroup.add(backMedallion);

    [-0.38, 0.38].forEach(function (sx) {
      const sp = new THREE.Mesh(G.chairSpindle, chairWoodMat);
      sp.position.set(sx, 1.14, -0.39);
      chairGroup.add(sp);
    });

    [[-0.36, -0.37], [0.36, -0.37], [-0.36, 0.31], [0.36, 0.31]].forEach(function (p) {
      const leg = new THREE.Mesh(G.chairLeg, chairWoodMat);
      leg.position.set(p[0], 0.325, p[1]);
      chairGroup.add(leg);
    });
  }
  root.add(chairGroup);

  // 3. Sculpted Genshin-Style Seated Anime Character (Multi-layered Coat + Seated Legs + Sculpted Head + Rim Toon!)
  const figureGroup = new THREE.Group();
  figureGroup.position.set(0, 0.72, 0.02);

  // Clean separable sculpted body container inside figureGroup so .VRM/.GLB can cleanly replace it!
  const sculptBodyRoot = new THREE.Group();
  figureGroup.add(sculptBodyRoot);

  const robeMat = makeAnimeToon(st.outfit || seat.color || "#38bdf8", {
    bumpMap: fabric.bump,
    bumpScale: 0.015,
    rimStrength: 0.18,
    shadowTint: 0xd0c2e6,
    shadowLift: 0.12
  });
  const accentMat = makeAnimeToon(st.accent || "#fef3c7", {
    rimStrength: 0.16,
    shadowTint: 0xddd4eb,
    shadowLift: 0.14
  });
  const skinMat = makeAnimeToon(st.skin || "#f7dbc2", {
    rimColor: 0xffe8d6,
    rimStrength: 0.14,
    shadowTint: 0xe6b8b0,
    shadowLift: 0.16
  });

  const torso = new THREE.Mesh(G.torso, robeMat);
  torso.position.y = hasLatheHelper() ? 0.0 : 0.45;
  torso.castShadow = true;
  addOutline(torso, 0.009, 0x241512);
  sculptBodyRoot.add(torso);

  const collar = new THREE.Mesh(G.collar, accentMat);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.y = 0.89;
  sculptBodyRoot.add(collar);

  build3DCharacterOutfit(sculptBodyRoot, st, robeMat, accentMat, G);

  const leftArm = buildArticulatedArm(-1, robeMat, accentMat, skinMat, G, false);
  const rightArm = buildArticulatedArm(1, robeMat, accentMat, skinMat, G, true);
  sculptBodyRoot.add(leftArm.shoulder, rightArm.shoulder);

  // Articulated Sculpted Anime Head (V-Chin Geometry + 512x512 Seamless Anime Face + Tapered Hair Ribbons!)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.32, 0.02);

  const headSculptGroup = new THREE.Group();
  headPivot.add(headSculptGroup);

  const neck = new THREE.Mesh(G.neck, skinMat);
  neck.position.y = -0.34;
  headSculptGroup.add(neck);

  const headOvalGroup = new THREE.Group();
  headOvalGroup.scale.set(1.0, 1.03, 0.96);

  const headSphere = new THREE.Mesh(G.headSphere, skinMat);
  headSphere.castShadow = true;
  addOutline(headSphere, 0.009, 0x3b211a);
  headOvalGroup.add(headSphere);

  // Subtle sculpted anime nose tip
  const nose = new THREE.Mesh(G.nose, skinMat);
  nose.rotation.x = Math.PI * 0.48;
  nose.position.set(0, -0.032, 0.415);
  headOvalGroup.add(nose);

  const faceBundle = stage3dTextures.createFaceCanvas();
  const facePatchMat = new THREE.MeshBasicMaterial({ map: faceBundle.tex, transparent: true, depthWrite: false });
  const facePatch = new THREE.Mesh(G.faceCurved, facePatchMat);
  headOvalGroup.add(facePatch);
  headSculptGroup.add(headOvalGroup);

  [-0.39, 0.39].forEach(function (ex) {
    const ear = new THREE.Mesh(G.ear, skinMat);
    ear.scale.set(0.65, 1.15, 0.85);
    ear.position.set(ex, -0.02, -0.01);
    headSculptGroup.add(ear);
  });

  const hairMeta = build3DHairAndAccessories(headSculptGroup, st, G, seat.id);

  // Status Halo & Sheriff Crown live on headPivot outside headSculptGroup so they remain visible even on .VRM!
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  const haloRing = new THREE.Mesh(G.haloRing, haloMat);
  haloRing.rotation.x = Math.PI * 0.5;
  haloRing.position.y = 0.68;
  headPivot.add(haloRing);

  // Refined Antique-Gold Lotus-Prong Sheriff Coronet (replaces oversized cone hat!)
  const sheriffCrownGroup = new THREE.Group();
  const crownMat = M.crown;
  const crownJadeMat = M.crownJade;
  const crownBase = new THREE.Mesh(G.sheriffRing, crownMat);
  crownBase.rotation.x = Math.PI * 0.5;
  sheriffCrownGroup.add(crownBase);
  for (let ci = 0; ci < 5; ci++) {
    const ca = (ci / 5) * Math.PI * 2;
    const prong = new THREE.Mesh(G.sheriffCrown, crownMat);
    prong.position.set(Math.cos(ca) * 0.12, 0.055, Math.sin(ca) * 0.12);
    prong.rotation.z = -Math.cos(ca) * 0.22;
    prong.rotation.x = Math.sin(ca) * 0.22;
    sheriffCrownGroup.add(prong);
  }
  const crownPearl = new THREE.Mesh(G.sheriffPearl, crownJadeMat);
  crownPearl.position.y = 0.075;
  sheriffCrownGroup.add(crownPearl);
  sheriffCrownGroup.position.set(0, 0.76, 0);
  sheriffCrownGroup.visible = false;
  headPivot.add(sheriffCrownGroup);

  figureGroup.add(headPivot);
  root.add(figureGroup);

  // Container for optional custom VRoid .VRM / .GLB avatar attached to this seat
  const vrmMountGroup = new THREE.Group();
  vrmMountGroup.visible = false;
  root.add(vrmMountGroup);

  const hitMesh = new THREE.Mesh(G.hitCyl, M.hitInvisible);
  hitMesh.position.y = 1.35;
  hitMesh.userData = { seatId: seat.id };
  root.add(hitMesh);

  // 4. Tabletop Props (Refined Low-Angle Desk Plaque + Candle + Celadon Tea Cup + Mark Crystal + Flippable ID Card)
  const tablePropGroup = new THREE.Group();
  tablePropGroup.position.set(0, 1.07, 1.62);

  const plaqueBundle = stage3dTextures.createPlaqueCanvas();
  const plaqueFaceMat = new THREE.MeshBasicMaterial({ map: plaqueBundle.tex });
  const plaqueMesh = new THREE.Mesh(G.plaqueBox, [
    chairWoodMat, chairWoodMat, chairWoodMat, chairWoodMat,
    plaqueFaceMat,
    plaqueFaceMat
  ]);
  plaqueMesh.position.set(0, 0.10, 0);
  plaqueMesh.rotation.x = -0.58;
  tablePropGroup.add(plaqueMesh);

  const candleGroup = new THREE.Group();
  candleGroup.position.set(0.52, 0, -0.04);
  candleGroup.scale.setScalar(0.74);
  const candleHolder = new THREE.Mesh(G.candleHolder, M.brass);
  const candleStick = new THREE.Mesh(G.candleStick, M.wax);
  candleStick.position.y = hasLatheHelper() ? 0.095 : 0.20;
  const candleWick = new THREE.Mesh(G.candleWick, M.wick);
  candleWick.position.y = 0.365;
  const candleFlame = new THREE.Group();
  candleFlame.position.y = 0.372;
  const flameOuter = new THREE.Mesh(G.candleFlame, M.flameOuter);
  const flameCore = new THREE.Mesh(G.candleFlameCore, M.flameCore);
  const flameHalo = new THREE.Mesh(G.candleHalo, M.flameHalo);
  flameHalo.position.y = 0.075;
  candleFlame.add(flameOuter, flameCore, flameHalo);
  const candleGlowMat = new THREE.MeshBasicMaterial({
    map: stage3dTextures.createCandleGlowTexture(),
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const candleGlow = new THREE.Mesh(G.candleGlow, candleGlowMat);
  candleGlow.rotation.x = -Math.PI * 0.5;
  candleGlow.position.y = 0.022;
  const candleHit = new THREE.Mesh(G.candleHit, M.hitInvisible);
  candleHit.position.y = 0.28;
  candleHit.userData = { candleSeatId: seat.id };
  candleGroup.add(candleHolder, candleStick, candleWick, candleFlame, candleGlow, candleHit);
  tablePropGroup.add(candleGroup);

  const teaGroup = new THREE.Group();
  teaGroup.position.set(-0.48, 0.015, 0.12);
  const celadonMat = M.celadon;
  if (G.teaCupMerged) {
    const mergedCup = new THREE.Mesh(G.teaCupMerged, celadonMat);
    mergedCup.receiveShadow = true;
    teaGroup.add(mergedCup);
  } else {
    const saucer = new THREE.Mesh(G.teasaucer, celadonMat);
    saucer.position.y = 0.011;
    saucer.receiveShadow = true;
    const teacup = new THREE.Mesh(G.teacup, celadonMat);
    teacup.position.y = 0.022;
    teaGroup.add(saucer, teacup);
  }
  if (!G.teaLiquid) G.teaLiquid = new THREE.CircleGeometry(0.082, 12);
  const teaLiquid = new THREE.Mesh(G.teaLiquid, M.teaLiquid);
  teaLiquid.rotation.x = -Math.PI * 0.5;
  teaLiquid.position.y = 0.125;

  // Eliminated Seat Teacup Cover Lid (合蓋覆杯) & Fog-Seal Plain Parchment Strip (迷霧封牌素色封條)
  const teaLidGroup = new THREE.Group();
  if (G.teaLidMerged) {
    teaLidGroup.add(new THREE.Mesh(G.teaLidMerged, celadonMat));
  } else {
    const lidBody = new THREE.Mesh(G.teaLidRim, celadonMat);
    const lidKnob = new THREE.Mesh(G.teaLidKnob, celadonMat);
    lidKnob.position.y = 0.026;
    teaLidGroup.add(lidBody, lidKnob);
  }
  teaLidGroup.position.y = 0.24;
  teaLidGroup.visible = false;

  const fogSealStrip = new THREE.Mesh(G.fogSealStrip, M.fogSeal);
  fogSealStrip.position.set(0, 0.184, 0);
  fogSealStrip.rotation.y = 0.28;
  fogSealStrip.visible = false;

  teaGroup.add(teaLiquid, teaLidGroup, fogSealStrip);
  tablePropGroup.add(teaGroup);

  const markCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.4, flatShading: true
  });
  const markCrystal = new THREE.Mesh(G.markCrystal, markCrystalMat);
  markCrystal.position.set(-0.62, 0.22, -0.04);
  markCrystal.visible = false;
  tablePropGroup.add(markCrystal);

  // Lazy ID Card CanvasTextures (only allocated when showIdCard activates on the player's seat -> saves 22 CanvasTextures on 12p!)
  const idCardPivot = new THREE.Group();
  idCardPivot.position.set(0, 0.035, -0.18);
  const cardEdgeMat = M.cardEdge;
  const idCardMesh = new THREE.Mesh(G.idCard, [
    cardEdgeMat, cardEdgeMat,
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    cardEdgeMat, cardEdgeMat
  ]);
  const idCardHit = new THREE.Mesh(G.idCardHit, M.hitInvisible);
  idCardPivot.add(idCardMesh, idCardHit);
  idCardPivot.visible = false;
  tablePropGroup.add(idCardPivot);

  root.add(tablePropGroup);

  return {
    id: seat.id,
    root: root,
    chairGroup: chairGroup,
    figureGroup: figureGroup,
    sculptBodyRoot: sculptBodyRoot,
    headSculptGroup: headSculptGroup,
    headPivot: headPivot,
    leftArmPivot: leftArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightArmPivot: rightArm.shoulder,
    rightElbowPivot: rightArm.elbow,
    rightHand: rightArm.hand,
    voteCard: rightArm.voteCard,
    vrmMountGroup: vrmMountGroup,
    vrmAvatar: null,
    boundModelSlug: "",
    boundAvatarKey: "",
    useVrm: false,
    swayHairParts: hairMeta ? hairMeta.swayHairParts : [],
    hitMesh: hitMesh,
    baseRing: baseRing,
    ringMat: ringMat,
    robeMat: robeMat,
    collarMat: accentMat,
    haloRing: haloRing,
    haloMat: haloMat,
    sheriffCrownGroup: sheriffCrownGroup,
    noseMesh: nose,
    glassesGroup: hairMeta ? hairMeta.glassesGroup : null,
    faceBundle: faceBundle,
    facePatchMat: facePatchMat,
    plaqueBundle: plaqueBundle,
    plaqueMesh: plaqueMesh,
    plaqueSig: "",
    tablePropGroup: tablePropGroup,
    candleGroup: candleGroup,
    candleFlame: candleFlame,
    candleGlow: candleGlow,
    candleGlowMat: candleGlowMat,
    candleHit: candleHit,
    teaGroup: teaGroup,
    teaLiquid: teaLiquid,
    teaLidGroup: teaLidGroup,
    fogSealStrip: fogSealStrip,
    teaWorldPos: new THREE.Vector3(),
    lastSteamAt: 0,
    candleSparkBoost: 0,
    outFade: 0,
    lidProgress: 0,
    _wasAlive: true,
    extinguishedAt: 0,
    markCrystal: markCrystal,
    markCrystalMat: markCrystalMat,
    idCardPivot: idCardPivot,
    idCardMesh: idCardMesh,
    idCardHit: idCardHit,
    idCardBackReady: false,
    idCardRoleSig: "",
    cardFlipProgress: 0,
    worldPos: new THREE.Vector3(),
    headWorldPos: new THREE.Vector3(),
    handWorldPos: new THREE.Vector3(),
    candleWorldPos: new THREE.Vector3(),
    headYaw: 0,
    headPitch: 0,
    lastSmokeAt: 0
  };
}

function hasLatheHelper() {
  return typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
}

function setSeatVisualMode(actor, mode) {
  if (!actor) return;
  const useVrm = (mode === "vrm" || mode === "glb") && Boolean(actor.vrmAvatar);
  actor.useVrm = useVrm;
  if (actor.sculptBodyRoot) actor.sculptBodyRoot.visible = !useVrm;
  if (actor.headSculptGroup) actor.headSculptGroup.visible = !useVrm;
  if (actor.vrmMountGroup) actor.vrmMountGroup.visible = useVrm;
  // Release unused 512x512 procedural face CanvasTexture while VRM is mounted (saves ~12MB GPU/RAM on 12p!)
  if (useVrm && actor.faceBundle && actor.faceBundle.tex) {
    try { actor.faceBundle.tex.dispose(); } catch (e) { }
    if (actor.faceBundle.canvas) {
      actor.faceBundle.canvas.width = 1;
      actor.faceBundle.canvas.height = 1;
    }
    actor.faceBundle = null;
    if (actor.facePatchMat) {
      actor.facePatchMat.map = null;
      actor.facePatchMat.needsUpdate = true;
    }
  } else if (!useVrm && !actor.faceBundle && typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createFaceCanvas === "function") {
    actor.faceBundle = stage3dTextures.createFaceCanvas();
    actor.faceDrawnOnce = false;
    actor._lastFaceSig = "";
    if (actor.facePatchMat) {
      actor.facePatchMat.map = actor.faceBundle.tex;
      actor.facePatchMat.needsUpdate = true;
    }
  }
}
