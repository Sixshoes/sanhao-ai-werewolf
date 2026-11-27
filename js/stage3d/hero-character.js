/**
 * 專屬旗艦 3D 角色引擎：「清茗」（青嵐書院・清茗茶席引路人與主持人）
 * 規格：與席間八位書院陶瓷公仔 100% 統一之典藏級 3D 立體模型（黃金三角右後茶台站位，零遮擋）
 * - 同心無縫陶瓷曲面臉部＋即時繪本五官（眼神追蹤、自然眨眼、語音口型、驚訝／歡呼演技）
 * - 零穿模拱形瀏海、微風擺動馬尾與朱砂腰帶、無接縫肩關節、青瓷蓮花茶盞與三好金蓮燈
 * - 內建自動偵測 assets/models/qingming.glb 與鑑賞台即時載入 .GLB（自動縮放對齊台座）
 */
"use strict";

const HERO_STAGE_ANCHOR = { x: 2.75, y: 0.02, z: -5.18, rotY: -0.44 };

const HERO_PALETTES = {
  celadon: {
    name: "青瓷雅韻",
    vest: 0x4c7a69,
    vestTrim: 0xd4a657,
    underTunic: 0xf4ede0,
    sleeves: 0xeae0cd,
    sash: 0xa63a2e,
    trousers: 0x2c2520,
    shoes: 0x5c4637,
    hair: 0x33241d,
    ribbon: 0x6ea690,
    skin: 0xf7dbc2,
    jade: 0x7bc2a6
  },
  teagold: {
    name: "茶金秋韻",
    vest: 0x8f6232,
    vestTrim: 0xf2d498,
    underTunic: 0xfaf3e4,
    sleeves: 0xeadbc2,
    sash: 0x9c2f24,
    trousers: 0x29211c,
    shoes: 0x473326,
    hair: 0x2e1f18,
    ribbon: 0xd4a657,
    skin: 0xf7dbc2,
    jade: 0xe6be72
  },
  inknight: {
    name: "暮墨書院",
    vest: 0x34435e,
    vestTrim: 0xd9b36c,
    underTunic: 0xf1ece3,
    sleeves: 0xdcd5ca,
    sash: 0xa63a2e,
    trousers: 0x1d212b,
    shoes: 0x35312f,
    hair: 0x21212c,
    ribbon: 0x7b98bf,
    skin: 0xf7dbc2,
    jade: 0x8eb4d9
  }
};

function isLiteHeroGpu() {
  return Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
}

function makeHeroHairStrand(points, radius, mat, aspect, outlineW) {
  const liteHero = isLiteHeroGpu();
  if (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.createTaperedHairLockGeo === "function") {
    const geo = stage3dAnime.createTaperedHairLockGeo(points, radius * 1.18, 0.005, aspect || 1.48, 12, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !liteHero;
    if (!liteHero && outlineW && outlineW > 0) stage3dAnime.addAnimeOutline(mesh, outlineW, 0x3b241e);
    return mesh;
  }
  const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
  const geo = new THREE.TubeGeometry(curve, 10, radius, 7, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !liteHero;
  return mesh;
}

function drawHeroStorybookFace(ctx, opts) {
  const w = 512;
  const h = 512;
  const act = opts.act || "idle_breathe";
  const isBlinking = Boolean(opts.isBlinking);
  const mouthOpenNow = Boolean(opts.mouthOpenNow);
  const mouthAmp = opts.mouthAmp || 0.55;
  const gx = clamp(Number(opts.gazeX) || 0, -1, 1);
  const gy = clamp(Number(opts.gazeY) || 0, -1, 1);

  // Pure transparent 512x512 Genshin anime face canvas over sculpted V-jaw porcelain head
  ctx.clearRect(0, 0, w, h);

  // Warm soft porcelain cheek blush + anime highlight strokes
  const blushA = (act === "celebrate" || act === "welcome_bow") ? 0.38 : 0.25;
  [136, 376].forEach(function (bx) {
    const bg = ctx.createRadialGradient(bx, 300, 4, bx, 300, 56);
    bg.addColorStop(0, "rgba(240, 126, 120, " + blushA + ")");
    bg.addColorStop(1, "rgba(240, 126, 120, 0)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(bx, 300, 56, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 224, 220, " + (blushA * 0.65) + ")";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(bx - 16, 294);
    ctx.lineTo(bx - 8, 304);
    ctx.moveTo(bx + 2, 294);
    ctx.lineTo(bx + 10, 304);
    ctx.stroke();
  });

  const eyeY = 232;
  const leftX = 176;
  const rightX = 336;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (act === "celebrate") {
    ctx.strokeStyle = "#2b1d17";
    ctx.lineWidth = 10.4;
    [leftX, rightX].forEach(function (ex) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 12, 32, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
  } else if (isBlinking) {
    ctx.strokeStyle = "#2b1d17";
    ctx.lineWidth = 8.8;
    [leftX, rightX].forEach(function (ex) {
      ctx.beginPath();
      ctx.moveTo(ex - 30, eyeY + 4);
      ctx.quadraticCurveTo(ex, eyeY + 14, ex + 30, eyeY + 4);
      ctx.stroke();
    });
  } else {
    const rx = act === "gasp_react" ? 36 : 33;
    const ry = act === "gasp_react" ? 40 : 36;
    [leftX, rightX].forEach(function (ex, idx) {
      const sideSign = idx === 0 ? -1 : 1;

      ctx.strokeStyle = "rgba(128, 78, 66, 0.56)";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(ex, eyeY - 4, rx + 6, Math.PI * 1.16, Math.PI * 1.84);
      ctx.stroke();

      ctx.fillStyle = "#fffefa";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180, 190, 215, 0.24)";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - ry * 0.34, rx * 0.96, ry * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, rx - 1, ry - 1, 0, 0, Math.PI * 2);
      ctx.clip();

      const px = ex + gx * 9.5;
      const py = eyeY + 2 + gy * 6.5;
      const ir = act === "gasp_react" ? 16.5 : 24.5;

      const irisGrad = ctx.createLinearGradient(px, py - ir, px, py + ir);
      irisGrad.addColorStop(0.0, "#140d0b");
      irisGrad.addColorStop(0.35, "#4d3224");
      irisGrad.addColorStop(0.75, "#9c6d3b");
      irisGrad.addColorStop(1.0, "#f2ca78");
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, ir * 0.92, ir * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(253, 230, 138, 0.56)";
      ctx.beginPath();
      ctx.ellipse(px, py + ir * 0.46, ir * 0.62, ir * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#120c0a";
      ctx.beginPath();
      ctx.arc(px, py - 1, ir * 0.43, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px - ir * 0.36, py - ir * 0.38, ir * 0.32, 0, Math.PI * 2);
      ctx.arc(px + ir * 0.32, py + ir * 0.34, ir * 0.14, 0, Math.PI * 2);
      ctx.arc(px + ir * 0.30, py - ir * 0.44, ir * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "#221512";
      ctx.lineWidth = 9.4;
      ctx.beginPath();
      ctx.arc(ex, eyeY + 2, rx + 1, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.moveTo(ex + sideSign * (rx - 2), eyeY - 5);
      ctx.lineTo(ex + sideSign * (rx + 10), eyeY - 14);
      ctx.stroke();
    });
  }

  const browLift = act === "gasp_react" ? -16 : ((act === "purify_cast" || act === "celebrate") ? -10 : 0);
  const browY = eyeY - 56 + browLift;
  ctx.strokeStyle = "#3b2820";
  ctx.lineWidth = 8.0;
  ctx.beginPath();
  ctx.moveTo(leftX - 30, browY + 4);
  ctx.quadraticCurveTo(leftX, browY - 10, leftX + 28, browY + 2);
  ctx.moveTo(rightX - 28, browY + 2);
  ctx.quadraticCurveTo(rightX, browY - 10, rightX + 30, browY + 4);
  ctx.stroke();

  const mouthY = 354;
  ctx.strokeStyle = "#91463b";
  ctx.fillStyle = "#b84b4d";
  ctx.lineWidth = 7.2;
  if (act === "gasp_react") {
    ctx.beginPath();
    ctx.ellipse(256, mouthY + 4, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (mouthOpenNow) {
    const openH = 6.5 + mouthAmp * 24;
    const openW = 20 + mouthAmp * 9;
    ctx.beginPath();
    ctx.ellipse(256, mouthY, openW, openH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f28b8d";
    ctx.beginPath();
    ctx.ellipse(256, mouthY + openH * 0.38, openW * 0.65, openH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (act === "celebrate" || act === "welcome_bow") {
    ctx.beginPath();
    ctx.arc(256, mouthY - 10, 31, Math.PI * 0.14, Math.PI * 0.86);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(256, mouthY - 12, 25, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }
}

function buildHeroCharacter(scene) {
  const pal = HERO_PALETTES.celadon;
  const fabric = stage3dTextures.createFabricTextures();
  const wood = stage3dTextures.createWoodTextures();
  const CupMatCtor = THREE.MeshStandardMaterial;

  const hasAnime = typeof stage3dAnime !== "undefined";
  const liteHero = isLiteHeroGpu();
  const castHeroShadow = !liteHero;
  const makeHeroToon = function (col, opts) {
    if (hasAnime && typeof stage3dAnime.createAnimeMaterial === "function") {
      const cfg = Object.assign({ color: col, rimStrength: 0.46, shadowTint: 0xd4c4e8, shadowLift: 0.28 }, opts || {});
      if (liteHero) {
        delete cfg.bumpMap;
        delete cfg.bumpScale;
      }
      return stage3dAnime.createAnimeMaterial(cfg);
    }
    return new THREE.MeshStandardMaterial({ color: col, roughness: 0.56, metalness: 0.06 });
  };
  const addHeroOutline = function (mesh, w, colHex) {
    if (liteHero) return;
    if (hasAnime && typeof stage3dAnime.addAnimeOutline === "function") {
      stage3dAnime.addAnimeOutline(mesh, w || 0.009, colHex || 0x241512);
    }
  };

  const mats = {
    skin: makeHeroToon(pal.skin, { rimColor: 0xffe8d6, rimStrength: 0.14, shadowTint: 0xe6b8b0, shadowLift: 0.16 }),
    hair: makeHeroToon(pal.hair, { isHair: true, hairRingColor: 0xf5cf86, hairRingStrength: 0.18, rimStrength: 0.20, shadowTint: 0x3b2c4e, shadowLift: 0.12 }),
    ribbon: makeHeroToon(pal.ribbon, { rimStrength: 0.18, shadowLift: 0.12 }),
    vest: makeHeroToon(pal.vest, { bumpMap: fabric.bump, bumpScale: 0.015, rimStrength: 0.20, shadowLift: 0.12 }),
    trim: new THREE.MeshStandardMaterial({ color: pal.vestTrim, roughness: 0.30, metalness: 0.56 }),
    tunic: makeHeroToon(pal.underTunic, { bumpMap: fabric.bump, bumpScale: 0.012, shadowTint: 0xd9cde0, shadowLift: 0.14, rimStrength: 0.15 }),
    sleeves: makeHeroToon(pal.sleeves, { bumpMap: fabric.bump, bumpScale: 0.014, shadowTint: 0xd9cde0, shadowLift: 0.14, rimStrength: 0.15 }),
    sash: makeHeroToon(pal.sash, { bumpMap: fabric.bump, bumpScale: 0.015, rimStrength: 0.20, shadowLift: 0.12 }),
    trousers: makeHeroToon(pal.trousers, { shadowLift: 0.10, rimStrength: 0.14 }),
    shoes: makeHeroToon(pal.shoes, { shadowLift: 0.10, rimStrength: 0.14 }),
    jade: new CupMatCtor({ color: pal.jade, roughness: 0.14, metalness: 0.16 }),
    celadon: new CupMatCtor({ color: 0xd8f3e8, roughness: 0.12, metalness: 0.14 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9ad5b, roughness: 0.24, metalness: 0.82 }),
    lanternGlow: new THREE.MeshStandardMaterial({ color: 0xf4d58d, emissive: 0xb68a3e, emissiveIntensity: 0.38, roughness: 0.30, transparent: true, opacity: 0.80 }),
    daisWood: new THREE.MeshStandardMaterial({ map: wood.map, color: 0x452b1b, roughness: 0.42, metalness: 0.16 })
  };

  const root = new THREE.Group();
  root.position.set(HERO_STAGE_ANCHOR.x, HERO_STAGE_ANCHOR.y, HERO_STAGE_ANCHOR.z);
  root.rotation.y = HERO_STAGE_ANCHOR.rotY;

  // Low-Profile Carved Lacquered Mat Pedestal (keeps Qingming harmoniously scaled with seated students!)
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 0.08, 28), mats.daisWood);
  dais.position.y = 0.04;
  dais.receiveShadow = true;
  dais.castShadow = castHeroShadow;
  const daisRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.020, 8, 36), mats.gold);
  daisRing.rotation.x = Math.PI * 0.5;
  daisRing.position.y = 0.08;
  const daisShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({ map: stage3dTextures.createContactShadowTexture(), transparent: true, opacity: 0.58, depthWrite: false })
  );
  daisShadow.rotation.x = -Math.PI * 0.5;
  daisShadow.position.y = 0.01;
  root.add(dais, daisRing, daisShadow);

  // Built-in Collector's Ceramic Rig Container (cleanly hidden when a custom .glb is active!)
  const rigRoot = new THREE.Group();
  rigRoot.position.y = 0.08;
  root.add(rigRoot);

  // 1. Feet & Relaxed Academy Trousers
  [-0.16, 0.16].forEach(function (lx) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.088, 0.56, 14), mats.trousers);
    leg.position.set(lx, 0.34, 0);
    leg.castShadow = castHeroShadow;
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 10), mats.shoes);
    shoe.scale.set(0.92, 0.58, 1.42);
    shoe.position.set(lx, 0.064, 0.045);
    shoe.castShadow = castHeroShadow;
    rigRoot.add(leg, shoe);
  });

  // 2. Sculpted Multi-Layered Tea Robe Torso (Pelvis Pivot -> Upper Body)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.58;
  rigRoot.add(bodyPivot);

  const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const robeLowerGeo = hasLathe
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.44, 0.02),
        new THREE.Vector2(0.41, 0.18),
        new THREE.Vector2(0.35, 0.42),
        new THREE.Vector2(0.32, 0.62)
      ], 22)
    : new THREE.CylinderGeometry(0.32, 0.44, 0.62, 16);
  const robeLower = new THREE.Mesh(robeLowerGeo, mats.vest);
  robeLower.position.y = hasLathe ? -0.14 : 0.17;
  robeLower.castShadow = castHeroShadow;
  addHeroOutline(robeLower, 0.010, 0x241512);
  bodyPivot.add(robeLower);

  const innerHem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.43, 0.15, 20), mats.tunic);
  innerHem.position.y = -0.16;
  bodyPivot.add(innerHem);

  const torsoGeo = hasLathe
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.31, 0.02),
        new THREE.Vector2(0.30, 0.24),
        new THREE.Vector2(0.35, 0.52),
        new THREE.Vector2(0.38, 0.72),
        new THREE.Vector2(0.24, 0.84),
        new THREE.Vector2(0.01, 0.86)
      ], 22)
    : new THREE.CylinderGeometry(0.28, 0.34, 0.84, 16);
  const torsoMesh = new THREE.Mesh(torsoGeo, mats.vest);
  torsoMesh.position.y = hasLathe ? 0.34 : 0.76;
  torsoMesh.castShadow = castHeroShadow;
  addHeroOutline(torsoMesh, 0.009, 0x241512);
  bodyPivot.add(torsoMesh);

  // Cross-Collar V-Lapel & Antique-Gold Trim
  const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.052, 10, 20), mats.tunic);
  innerCollar.rotation.x = Math.PI * 0.5;
  innerCollar.position.set(0, 1.15, 0.02);
  bodyPivot.add(innerCollar);

  const lapelL = makeHeroHairStrand([new THREE.Vector3(-0.18, 1.14, 0.16), new THREE.Vector3(-0.04, 0.94, 0.34), new THREE.Vector3(0.14, 0.68, 0.33)], 0.032, mats.trim);
  const lapelR = makeHeroHairStrand([new THREE.Vector3(0.18, 1.14, 0.16), new THREE.Vector3(0.06, 0.98, 0.33), new THREE.Vector3(-0.04, 0.86, 0.34)], 0.028, mats.trim);
  bodyPivot.add(lapelL, lapelR);

  // Vermilion-Cinnabar Waist Sash + Flowing Ribbons + Carved Seal & Jade Tassel
  const sashWrap = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.060, 10, 26), mats.sash);
  sashWrap.rotation.x = Math.PI * 0.5;
  sashWrap.position.y = 0.44;
  bodyPivot.add(sashWrap);

  const sashRibbonPivot = new THREE.Group();
  sashRibbonPivot.position.set(0.16, 0.42, 0.30);
  const sashTailA = makeHeroHairStrand([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, -0.22, 0.05), new THREE.Vector3(0.04, -0.44, 0.02)], 0.030, mats.sash);
  const sashTailB = makeHeroHairStrand([new THREE.Vector3(0.04, 0, -0.02), new THREE.Vector3(0.13, -0.18, 0.02), new THREE.Vector3(0.14, -0.36, -0.02)], 0.024, mats.sash);
  const sealCharm = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.106, 0.038), mats.sash);
  sealCharm.position.set(-0.06, -0.16, 0.03);
  const jadeBead = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), mats.jade);
  jadeBead.position.set(-0.06, -0.25, 0.03);
  sashRibbonPivot.add(sashTailA, sashTailB, sealCharm, jadeBead);
  bodyPivot.add(sashRibbonPivot);

  // 3. Seamless Articulated Wide-Sleeve Arms (with Shoulder Joint Caps!)
  function buildHeroArm(sideSign) {
    const sh = new THREE.Group();
    sh.position.set(sideSign * 0.37, 1.05, 0.02);

    const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.106, 12, 10), mats.sleeves);
    shCap.castShadow = castHeroShadow;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.122, 0.32, 12), mats.sleeves);
    upper.position.y = -0.15;
    upper.castShadow = castHeroShadow;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.120, 0.020, 8, 16), mats.trim);
    cuff.rotation.x = Math.PI * 0.5;
    cuff.position.y = -0.31;
    sh.add(shCap, upper, cuff);

    const elb = new THREE.Group();
    elb.position.y = -0.32;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.060, 0.25, 10), mats.tunic);
    fore.position.y = -0.12;
    fore.castShadow = castHeroShadow;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.074, 10, 8), mats.skin);
    palm.scale.set(1.0, 0.85, 1.15);
    palm.position.y = -0.27;
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 6), mats.skin);
    thumb.position.set(-sideSign * 0.052, -0.26, 0.038);
    elb.add(fore, palm, thumb);
    sh.add(elb);
    return { shoulder: sh, elbow: elb, hand: palm };
  }

  const leftArm = buildHeroArm(-1);
  const rightArm = buildHeroArm(1);
  bodyPivot.add(leftArm.shoulder, rightArm.shoulder);

  // Left Hand Signature Prop: Glossy Celadon Porcelain Lotus Teacup
  const teacupGroup = new THREE.Group();
  teacupGroup.position.set(0.04, -0.33, 0.12);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.108, 0.022, 18), mats.celadon);
  const cup = new THREE.Mesh(
    hasLathe
      ? new THREE.LatheGeometry([
          new THREE.Vector2(0.01, 0.0),
          new THREE.Vector2(0.066, 0.0),
          new THREE.Vector2(0.094, 0.05),
          new THREE.Vector2(0.104, 0.128),
          new THREE.Vector2(0.088, 0.128),
          new THREE.Vector2(0.068, 0.04),
          new THREE.Vector2(0.01, 0.03)
        ], 16)
      : new THREE.CylinderGeometry(0.10, 0.07, 0.13, 14),
    mats.celadon
  );
  cup.position.y = 0.012;
  const teaSurf = new THREE.Mesh(new THREE.CircleGeometry(0.082, 14), new THREE.MeshStandardMaterial({ color: 0xb67b2e, roughness: 0.12, metalness: 0.2 }));
  teaSurf.rotation.x = -Math.PI * 0.5;
  teaSurf.position.y = 0.114;
  teacupGroup.add(saucer, cup, teaSurf);
  leftArm.elbow.add(teacupGroup);

  // Right Hand Summonable Three-Goodness Miniature Golden Lotus Charm (70% smaller & warm, never blinding)
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0, -0.38, 0.14);
  const lanternCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.048, 1), mats.lanternGlow);
  const lanternRing = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.008, 8, 24), mats.gold);
  lanternRing.rotation.x = Math.PI * 0.5;
  lanternGroup.add(lanternCore, lanternRing);
  lanternGroup.visible = false;
  rightArm.elbow.add(lanternGroup);

  // Subtle Miniature Floating Celadon Tea Charm when a custom .GLB/.VRM is casting purify/celebrate
  const glbLanternGroup = new THREE.Group();
  const glbLanternCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 1), mats.lanternGlow);
  const glbLanternRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 8, 24), mats.gold);
  glbLanternRing.rotation.x = Math.PI * 0.5;
  glbLanternGroup.add(glbLanternCore, glbLanternRing);
  glbLanternGroup.visible = false;
  root.add(glbLanternGroup);

  // 4. Concentric Porcelain Head + Seamless Transparent Storybook Face Canvas (0% Mask Edge, 0% Clipping!)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.56, 0.02);
  bodyPivot.add(headPivot);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.118, 0.24, 12), mats.skin);
  neck.position.y = -0.35;
  headPivot.add(neck);

  const headOval = new THREE.Group();
  headOval.scale.set(1.0, 1.04, 0.96);

  const headMesh = new THREE.Mesh(
    hasAnime ? stage3dAnime.createAnimeHeadGeometry(0.415) : new THREE.SphereGeometry(0.415, 28, 22),
    mats.skin
  );
  headMesh.castShadow = castHeroShadow;
  addHeroOutline(headMesh, 0.009, 0x3b211a);
  headOval.add(headMesh);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.052, 5), mats.skin);
  nose.rotation.x = Math.PI * 0.48;
  nose.position.set(0, -0.030, 0.408);
  headOval.add(nose);

  const heroFaceBundle = stage3dTextures.createFaceCanvas();
  const facePatchMat = new THREE.MeshBasicMaterial({ map: heroFaceBundle.tex, transparent: true, depthWrite: false });
  const heroFacePatch = new THREE.Mesh(
    hasAnime ? stage3dAnime.createAnimeFacePatchGeometry(0.420) : new THREE.SphereGeometry(0.420, 24, 18, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.26, Math.PI * 0.50),
    facePatchMat
  );
  headOval.add(heroFacePatch);
  headPivot.add(headOval);

  [-0.39, 0.39].forEach(function (ex) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), mats.skin);
    ear.scale.set(0.65, 1.12, 0.85);
    ear.position.set(ex, -0.02, -0.01);
    headPivot.add(ear);
  });

  // 5. Layered Sculpted Tapered-Ribbon Hair (Strictly Above Eyebrows — Zero Face Clipping!)
  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.445, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), mats.hair);
  hairCrown.position.set(0, 0.08, -0.02);
  hairCrown.rotation.x = -0.24;
  hairCrown.castShadow = castHeroShadow;
  addHeroOutline(hairCrown, 0.008, 0x211412);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.438, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.76), mats.hair);
  hairBack.position.set(0, -0.04, -0.10);
  hairBack.scale.set(1.02, 1.15, 0.92);
  headPivot.add(hairCrown, hairBack);

  // 5 Delicate Tapered Arched Forehead Bang Strands
  [
    [new THREE.Vector3(-0.26, 0.36, 0.20), new THREE.Vector3(-0.24, 0.28, 0.36), new THREE.Vector3(-0.18, 0.19, 0.38)],
    [new THREE.Vector3(-0.11, 0.41, 0.19), new THREE.Vector3(-0.08, 0.30, 0.39), new THREE.Vector3(-0.04, 0.22, 0.40)],
    [new THREE.Vector3(0.0, 0.42, 0.19), new THREE.Vector3(0.02, 0.32, 0.40), new THREE.Vector3(0.05, 0.23, 0.405)],
    [new THREE.Vector3(0.09, 0.41, 0.19), new THREE.Vector3(0.11, 0.30, 0.39), new THREE.Vector3(0.15, 0.21, 0.39)],
    [new THREE.Vector3(0.20, 0.37, 0.20), new THREE.Vector3(0.24, 0.28, 0.36), new THREE.Vector3(0.27, 0.18, 0.35)]
  ].forEach(function (pts) {
    headPivot.add(makeHeroHairStrand(pts, 0.048, mats.hair, 1.55, 0));
  });

  // Gentle Cheek-Framing Side Locks (hugs temples outside face, wind sway!)
  const sideLockL = new THREE.Group();
  sideLockL.position.set(-0.37, 0.12, 0.15);
  sideLockL.add(makeHeroHairStrand([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.04, -0.20, 0.04), new THREE.Vector3(-0.01, -0.40, 0.05)], 0.048, mats.hair));
  const sideLockR = new THREE.Group();
  sideLockR.position.set(0.37, 0.12, 0.15);
  sideLockR.add(makeHeroHairStrand([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, -0.20, 0.04), new THREE.Vector3(0.01, -0.40, 0.05)], 0.048, mats.hair));
  headPivot.add(sideLockL, sideLockR);

  // Antique-Gold Tea-Leaf Hairpin (right temple)
  const leafPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), mats.gold);
  leafPin.scale.set(1.5, 0.55, 0.4);
  leafPin.position.set(0.31, 0.28, 0.26);
  leafPin.rotation.set(0.2, 0.5, -0.45);
  headPivot.add(leafPin);

  // Wind-Swaying Low Ponytail + Celadon Ribbon Bow
  const ponyPivot = new THREE.Group();
  ponyPivot.position.set(0, -0.18, -0.42);
  const ponyTie = new THREE.Mesh(new THREE.TorusGeometry(0.090, 0.028, 8, 16), mats.ribbon);
  const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.17, 6), mats.ribbon);
  bowL.position.set(-0.105, 0, -0.04);
  bowL.rotation.z = 1.25;
  const bowR = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.17, 6), mats.ribbon);
  bowR.position.set(0.105, 0, -0.04);
  bowR.rotation.z = -1.25;
  const ponyTailA = makeHeroHairStrand([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.24, -0.13), new THREE.Vector3(0, -0.54, -0.07)], 0.086, mats.hair);
  const ponyTailB = makeHeroHairStrand([new THREE.Vector3(0.04, -0.02, 0), new THREE.Vector3(0.09, -0.22, -0.09), new THREE.Vector3(0.06, -0.45, -0.04)], 0.054, mats.hair);
  ponyPivot.add(ponyTie, bowL, bowR, ponyTailA, ponyTailB);
  headPivot.add(ponyPivot);

  // Invisible Hit Cylinder for Direct Click Interaction in the Pavilion!
  const hitMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.7, 10), new THREE.MeshBasicMaterial({ visible: false }));
  hitMesh.position.y = 1.4;
  hitMesh.userData = { isHeroHost: true };
  root.add(hitMesh);

  // Dedicated Showcase Rim Light (lights up softly when inspecting Qingming 360°!)
  const showcaseLight = new THREE.PointLight(0xffebc2, 0.0, 12);
  showcaseLight.position.set(1.6, 2.8, 2.4);
  root.add(showcaseLight);

  scene.add(root);

  // Render initial crisp storybook face immediately on frame 0!
  drawHeroStorybookFace(heroFaceBundle.ctx, { act: "welcome_bow", isBlinking: false, mouthOpenNow: false, gazeX: 0, gazeY: 0 });
  heroFaceBundle.tex.needsUpdate = true;

  return {
    root: root,
    rigRoot: rigRoot,
    customGlbRoot: null,
    vrmAvatar: null,
    customGlbBaseY: 0.18,
    visualMode: "sculpt3d",
    mats: mats,
    bodyPivot: bodyPivot,
    headPivot: headPivot,
    leftArm: leftArm,
    rightArm: rightArm,
    teacupGroup: teacupGroup,
    lanternGroup: lanternGroup,
    glbLanternGroup: glbLanternGroup,
    sashRibbonPivot: sashRibbonPivot,
    sideLockL: sideLockL,
    sideLockR: sideLockR,
    ponyPivot: ponyPivot,
    heroFaceBundle: heroFaceBundle,
    facePatchMat: facePatchMat,
    heroFaceFrame: 0,
    hitMesh: hitMesh,
    showcaseLight: showcaseLight,
    paletteKey: "celadon",
    action: "welcome_bow",
    actionUntil: 0,
    headYaw: 0,
    headPitch: 0,
    teacupWorldPos: new THREE.Vector3(),
    lastSteamAt: 0
  };
}

function setHeroVisualMode(hero, mode) {
  if (!hero) return;
  const useGlb = (mode === "glb") && Boolean(hero.customGlbRoot);
  hero.visualMode = useGlb ? "glb" : "sculpt3d";
  if (hero.customGlbRoot) hero.customGlbRoot.visible = useGlb;
  if (hero.rigRoot) hero.rigRoot.visible = !useGlb;
  if (useGlb && hero.heroFaceBundle && hero.heroFaceBundle.tex) {
    try { hero.heroFaceBundle.tex.dispose(); } catch (e) { }
    if (hero.heroFaceBundle.canvas) {
      hero.heroFaceBundle.canvas.width = 1;
      hero.heroFaceBundle.canvas.height = 1;
    }
    hero.heroFaceBundle = null;
    if (hero.facePatchMat) {
      hero.facePatchMat.map = null;
      hero.facePatchMat.needsUpdate = true;
    }
  } else if (!useGlb && !hero.heroFaceBundle && typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createFaceCanvas === "function") {
    hero.heroFaceBundle = stage3dTextures.createFaceCanvas();
    if (hero.heroFaceBundle && hero.heroFaceBundle.ctx && typeof drawHeroStorybookFace === "function") {
      drawHeroStorybookFace(hero.heroFaceBundle.ctx, { act: hero.action || "welcome_bow", isBlinking: false, mouthOpenNow: false, gazeX: 0, gazeY: 0 });
      if (hero.heroFaceBundle.tex) hero.heroFaceBundle.tex.needsUpdate = true;
    }
    if (hero.facePatchMat && hero.heroFaceBundle && hero.heroFaceBundle.tex) {
      hero.facePatchMat.map = hero.heroFaceBundle.tex;
      hero.facePatchMat.needsUpdate = true;
    }
  }
  const resetBtn = (typeof document !== "undefined" && typeof document.getElementById === "function") ? document.getElementById("btnResetHeroRig") : null;
  if (resetBtn) resetBtn.classList.toggle("hidden", !useGlb);
}

function applyHeroPalette(hero, key) {
  if (!hero || !HERO_PALETTES[key]) return;
  const pal = HERO_PALETTES[key];
  hero.paletteKey = key;
  hero.mats.vest.color.setHex(pal.vest);
  hero.mats.trim.color.setHex(pal.vestTrim);
  hero.mats.tunic.color.setHex(pal.underTunic);
  hero.mats.sleeves.color.setHex(pal.sleeves);
  hero.mats.sash.color.setHex(pal.sash);
  hero.mats.trousers.color.setHex(pal.trousers);
  hero.mats.shoes.color.setHex(pal.shoes);
  hero.mats.hair.color.setHex(pal.hair);
  hero.mats.ribbon.color.setHex(pal.ribbon);
  hero.mats.jade.color.setHex(pal.jade);
  if (hero.vrmAvatar && typeof stage3dVrm !== "undefined" && typeof stage3dVrm.applyHeroVrmPalette === "function") {
    stage3dVrm.applyHeroVrmPalette(hero.vrmAvatar, key);
  }
}

function triggerHeroAction(hero, actionName, durationMs) {
  if (!hero) return;
  hero.action = actionName || "idle_breathe";
  hero.actionUntil = durationMs ? (performance.now() + durationMs) : 0;
}

function updateHeroCharacter(hero, camera, f, fx3d, isShowcase) {
  if (!hero) return;
  const t = f.tSec;
  const nowMs = f.nowMs;
  const dt60 = clamp(Number(f.dt60) || 1, 0.05, 3.0);
  const d10 = typeof dampFactor3D === "function" ? dampFactor3D(0.10, dt60) : 0.10;
  const d12 = typeof dampFactor3D === "function" ? dampFactor3D(0.12, dt60) : 0.12;
  const d14 = typeof dampFactor3D === "function" ? dampFactor3D(0.14, dt60) : 0.14;

  // Keep Qingming's dais smoothly clear of the outer seat ring on 10 / 12-player tables!
  if (typeof get3DTableLayout === "function" && typeof getActive3DSeatCount === "function" && hero.root && hero.root.position) {
    const hLayout = get3DTableLayout(getActive3DSeatCount());
    const tx = HERO_STAGE_ANCHOR.x * (hLayout.heroMul || 1.0);
    const tz = HERO_STAGE_ANCHOR.z * (hLayout.heroMul || 1.0);
    hero.root.position.x += (tx - hero.root.position.x) * d14;
    hero.root.position.z += (tz - hero.root.position.z) * d14;
  }

  if (hero.actionUntil > 0 && nowMs > hero.actionUntil) {
    hero.action = "idle_breathe";
    hero.actionUntil = 0;
  }

  // Auto-select ambient action from live match state unless pinned in showcase or timed gesture
  let act = hero.action;
  if (!isShowcase && hero.actionUntil === 0) {
    if (!state.match.started || f.p === "LOBBY") {
      // Gentle periodic tea-host welcome bow on title screen (3.2s warm welcome, then poised graceful idle!)
      act = ((t % 12.0) < 3.2) ? "welcome_bow" : "idle_breathe";
    } else if (f.p === "GAME_OVER" && state.match.winner === "good") act = "celebrate";
    else if (typeof voice !== "undefined" && voice.speaking && !state.activeSpeakerId) act = "speak_gesture";
    else act = "idle_breathe";
  }

  // Smooth showcase rim lighting
  const targetRim = isShowcase ? 1.45 : (act === "purify_cast" ? 1.2 : 0.36);
  hero.showcaseLight.intensity += (targetRim - hero.showcaseLight.intensity) * d10;

  // Organic Gaze: track active speaking seat during debate, camera/pointer in showcase, gentle sanctuary scan in lobby!
  let targetYaw = Math.sin(t * 0.55) * 0.16;
  let targetPitch = -0.02;
  if (isShowcase && state.pointer.inside) {
    targetYaw = clamp((state.pointer.x / Math.max(1, f.w) - 0.5) * 0.85, -0.52, 0.52);
    targetPitch = clamp((state.pointer.y / Math.max(1, f.h) - 0.5) * 0.45, -0.22, 0.22);
  } else if (act === "gasp_react") {
    targetYaw = Math.sin(t * 9) * 0.24;
    targetPitch = -0.12;
  } else if (!isShowcase && state.match && state.match.started && typeof stage3d !== "undefined" && stage3d.seats && stage3d.seats.anchors) {
    const heroFocusId = state.activeSpeakerId || ((f.p === "DAY_VOTE" && state.voteFlight && state.voteFlight.active && state.voteLeaderId) ? state.voteLeaderId : null);
    if (heroFocusId && stage3d.seats.anchors[heroFocusId]) {
      const spPos = stage3d.seats.anchors[heroFocusId].worldPos;
      let diffH = Math.atan2(spPos.x - hero.root.position.x, spPos.z - hero.root.position.z) - hero.root.rotation.y;
      while (diffH > Math.PI) diffH -= Math.PI * 2;
      while (diffH < -Math.PI) diffH += Math.PI * 2;
      targetYaw = clamp(diffH * 0.85, -0.72, 0.72);
      targetPitch = 0.08;
    }
  }
  hero.headYaw += (targetYaw - hero.headYaw) * d10;
  hero.headPitch += (targetPitch - hero.headPitch) * d10;

  const isTalking = act === "speak_gesture" || (typeof voice !== "undefined" && voice.speaking && !state.activeSpeakerId);
  const mouthOpenNow = isTalking || act === "gasp_react";
  const mouthAmp = isTalking ? (0.4 + Math.abs(Math.sin(t * 15)) * 0.65) : 0.9;
  const sculptVisible = !(hero.rigRoot && !hero.rigRoot.visible);

  if (sculptVisible) {
    // Breathing & gentle bounce
    const bounce = act === "celebrate" ? Math.abs(Math.sin(t * 6.5)) * 0.12 : Math.sin(t * 2.1) * 0.022;
    hero.bodyPivot.position.y = 0.58 + bounce;
    const bowTilt = act === "welcome_bow" ? (0.07 + Math.sin(t * 1.6) * 0.04) : (act === "gasp_react" ? -0.10 : 0.0);
    hero.bodyPivot.rotation.x += (bowTilt - hero.bodyPivot.rotation.x) * d12;
    hero.headPivot.rotation.set(hero.headPitch, hero.headYaw, Math.sin(t * 1.2) * 0.025);

    // Signature-Cached Seamless Storybook Face Update (skips redundant 512x512 redraws & texture uploads when idle!)
    const blinkCycle = (t + 0.8) % 3.5;
    const isBlinking = act !== "gasp_react" && blinkCycle > 3.38;
    if (hero.heroFaceBundle) {
      hero.heroFaceFrame += 1;
      if (hero.heroFaceFrame % 2 === 0) {
        const gxH = clamp(hero.headYaw * 0.85, -1, 1);
        const gyH = clamp(hero.headPitch * 0.85, -1, 1);
        const mBucket = mouthOpenNow ? Math.round(mouthAmp * 10) : 0;
        const hFaceSig = act + "|" + (isBlinking ? 1 : 0) + "|" + (mouthOpenNow ? 1 : 0) + "|" + mBucket + "|" + Math.round(gxH * 10) + "|" + Math.round(gyH * 10);
        if (hero._lastHeroFaceSig !== hFaceSig) {
          hero._lastHeroFaceSig = hFaceSig;
          drawHeroStorybookFace(hero.heroFaceBundle.ctx, {
            act: act,
            isBlinking: isBlinking,
            mouthOpenNow: mouthOpenNow,
            mouthAmp: mouthAmp,
            gazeX: gxH,
            gazeY: gyH
          });
          hero.heroFaceBundle.tex.needsUpdate = true;
        }
      }
    }

    // Secondary Wind Physics on Ponytail, Side Locks & Vermilion Waist Sash!
    hero.ponyPivot.rotation.z = Math.sin(t * 2.2) * 0.11;
    hero.ponyPivot.rotation.x = 0.08 + Math.cos(t * 1.7) * 0.05;
    hero.sideLockL.rotation.z = -0.04 + Math.sin(t * 2.4 + 0.5) * 0.04;
    hero.sideLockR.rotation.z = 0.04 + Math.sin(t * 2.4 + 0.9) * 0.04;
    hero.sashRibbonPivot.rotation.z = Math.sin(t * 2.0 + 0.3) * 0.09;
    hero.sashRibbonPivot.rotation.x = Math.cos(t * 1.6) * 0.05;

    // Articulated Arm State Machine
    let lShX = -0.58, lShZ = 0.16, lElbX = -0.78;
    let rShX = -0.22, rShZ = -0.14, rElbX = -0.42;
    if (act === "welcome_bow") {
      rShX = -1.24; rShZ = -0.42; rElbX = -0.70 + Math.sin(t * 5.0) * 0.28;
    } else if (act === "speak_gesture") {
      rShX = -0.80 + Math.sin(t * 5.5) * 0.20; rShZ = -0.26; rElbX = -0.74 + Math.cos(t * 6.0) * 0.20;
    } else if (act === "purify_cast") {
      rShX = -1.72 + Math.sin(t * 3.5) * 0.09; rShZ = -0.22; rElbX = -0.28;
      lShX = -0.72; lElbX = -0.92;
    } else if (act === "gasp_react") {
      rShX = -0.92; rShZ = 0.24; rElbX = -1.22;
      lShX = -0.76; lElbX = -1.02;
    } else if (act === "celebrate") {
      rShX = -2.28 + Math.sin(t * 7) * 0.16; rShZ = -0.35; rElbX = -0.32;
      lShX = -1.12 + Math.cos(t * 7) * 0.12; lShZ = 0.26; lElbX = -0.68;
    }

    hero.leftArm.shoulder.rotation.x += (lShX - hero.leftArm.shoulder.rotation.x) * d14;
    hero.leftArm.shoulder.rotation.z += (lShZ - hero.leftArm.shoulder.rotation.z) * d14;
    hero.leftArm.elbow.rotation.x += (lElbX - hero.leftArm.elbow.rotation.x) * d14;
    hero.rightArm.shoulder.rotation.x += (rShX - hero.rightArm.shoulder.rotation.x) * d14;
    hero.rightArm.shoulder.rotation.z += (rShZ - hero.rightArm.shoulder.rotation.z) * d14;
    hero.rightArm.elbow.rotation.x += (rElbX - hero.rightArm.elbow.rotation.x) * d14;
  }

  // Summoned Lotus Charm spin (only during purify_cast/celebrate — never a glaring orb in showcase!)
  const showLantern = (act === "purify_cast" || act === "celebrate");
  const glbActive = Boolean(hero.customGlbRoot && hero.customGlbRoot.visible);
  hero.lanternGroup.visible = showLantern && !glbActive;
  if (hero.lanternGroup.visible) {
    hero.lanternGroup.rotation.y = t * 1.8;
    hero.lanternGroup.position.y = -0.40 + Math.sin(t * 3.2) * 0.04;
  }

  if (glbActive) {
    if (hero.vrmAvatar && typeof stage3dVrm !== "undefined") {
      hero._vrmFrame = (hero._vrmFrame || 0) + 1;
      const isHeroPriority = Boolean(isShowcase || isTalking || act !== "idle_breathe");
      const qHero = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
      const isIgpuHero = Boolean(typeof stage3d !== "undefined" && stage3d.isIntegratedGpu);
      const heroStride = isHeroPriority ? 1 : ((qHero === "eco" || isIgpuHero) ? 3 : (qHero === "balanced" ? 2 : 1));
      if (!hero._vrmUpdatedOnce || heroStride <= 1 || (hero._vrmFrame % heroStride === 0)) {
        hero._vrmUpdatedOnce = true;
        const heroMoodKey = f.daylight ? ((f.p === "DAY_VOTE" || f.p === "DAY_VOTE_RESULT") ? "vote" : "day") : (f.night ? "night" : "twilight");
        const heroVowels = (isTalking && typeof sound !== "undefined" && typeof sound.getVoiceVowelWeights === "function")
          ? sound.getVoiceVowelWeights(0, nowMs)
          : null;
        stage3dVrm.updateVrmAvatar(hero.vrmAvatar, {
          tSec: t,
          dt60: dt60 * heroStride,
          seed: 0.5,
          moodKey: heroMoodKey,
          alive: true,
          sleeping: false,
          talking: isTalking,
          hasActiveSpeaker: Boolean(!isShowcase && state.match && state.match.started && state.activeSpeakerId),
          mouthAmp: mouthAmp,
          vowels: heroVowels,
          emotion: act === "celebrate" ? "happy" : (act === "gasp_react" ? "shock" : (act === "welcome_bow" ? "happy" : "neutral")),
          headYaw: hero.headYaw,
          headPitch: hero.headPitch,
          act: act,
          isHovered: false,
          isPriority: isHeroPriority,
          frameCounter: hero._vrmFrame,
          seatId: 0,
          seatCount: typeof getActive3DSeatCount === "function" ? getActive3DSeatCount() : 8
        });
      }
    } else {
      const glbHop = act === "celebrate" ? Math.abs(Math.sin(t * 6.5)) * 0.12 : Math.sin(t * 2.1) * 0.018;
      hero.customGlbRoot.position.y = (hero.customGlbBaseY || 0.08) + glbHop;
      hero.customGlbRoot.rotation.x = act === "welcome_bow" ? (0.05 + Math.sin(t * 1.6) * 0.035) : 0;
    }
  }
  if (hero.glbLanternGroup) {
    hero.glbLanternGroup.visible = showLantern && glbActive;
    if (hero.glbLanternGroup.visible) {
      const ang = t * 0.9;
      hero.glbLanternGroup.position.set(Math.cos(ang) * 0.72, 1.66 + Math.sin(t * 2.8) * 0.07, Math.sin(ang) * 0.52);
      hero.glbLanternGroup.rotation.y = t * 2.1;
    }
  }

  // Gentle warm steam puff from Qingming's celadon teacup
  if (fx3d && state.quality3D !== "eco" && nowMs - hero.lastSteamAt > 1650 && !glbActive) {
    hero.lastSteamAt = nowMs;
    hero.teacupGroup.getWorldPosition(hero.teacupWorldPos);
    spawn3DCandleSmoke(fx3d, hero.teacupWorldPos, nowMs);
  }
}
