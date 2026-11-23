/**
 * 3D 電影級山海實景古亭與茶席場景引擎（Three.js r128）
 * 升級包含：
 * - 連續多稜線地形山巒＋反光太平洋海面＋動態龜山島燈塔＋分層流動雲海
 * - 紅瓦白牆望海古亭（八柱花崗岩柱礎＋後側飛簷翹角屋瓦＋木格欄杆＋四座庭院石燈籠＋林美五葉松）
 * - 胡桃木茶桌搭配手工紫砂茶壺組＋雙層三好蓮花琉璃核心＋柔和散景微粒光暈＋三點電影冷暖補光
 */
"use strict";

function get3DTableLayout(seatCount) {
  const n = seatCount || 8;
  if (n >= 12) {
    return { n: 12, tableScale: 1.40, tableR: 4.55, ringRadius: 5.92, propZ: 2.08, pavilionScale: 1.15, heroMul: 1.24, camExtraR: 2.15 };
  }
  if (n >= 10) {
    return { n: 10, tableScale: 1.24, tableR: 4.03, ringRadius: 5.42, propZ: 2.08, pavilionScale: 1.08, heroMul: 1.13, camExtraR: 1.15 };
  }
  if (n >= 8) {
    return { n: 8, tableScale: 1.06, tableR: 3.45, ringRadius: 4.85, propZ: 2.06, pavilionScale: 1.0, heroMul: 1.0, camExtraR: 0.15 };
  }
  return { n: 6, tableScale: 1.00, tableR: 3.25, ringRadius: 4.55, propZ: 1.95, pavilionScale: 1.0, heroMul: 1.0, camExtraR: 0 };
}

function getActive3DSeatCount() {
  try {
    if (typeof state !== "undefined" && state.match && state.match.started && state.match.totalSeats) {
      return state.match.totalSeats;
    }
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      if (typeof getLobbySeatCount === "function") return getLobbySeatCount();
      const sel = document.getElementById("selectModeCount");
      if (sel) return parseInt(sel.value, 10) || 8;
    }
  } catch (e) {}
  return 8;
}

function build3DEnvironmentMap(renderer, scene, env) {
  if (!renderer || typeof THREE.PMREMGenerator !== "function") return;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    env.pmrem = pmrem;

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x162038);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x263455, side: THREE.BackSide })
    );
    envScene.add(dome);
    const warmRing = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.85, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27d })
    );
    warmRing.rotation.x = Math.PI * 0.5;
    warmRing.position.y = 5.5;
    envScene.add(warmRing);
    const sunPatch = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
    );
    sunPatch.position.set(8, 8, -9);
    envScene.add(sunPatch);
    const coolPatch = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    coolPatch.position.set(-9, 6, 7);
    envScene.add(coolPatch);

    const procRT = pmrem.fromScene(envScene, 0.04);
    env.iblDefaultTex = procRT.texture;
    scene.environment = procRT.texture;

    const isFileProto = typeof window !== "undefined" && window.location && window.location.protocol === "file:";
    if (!isFileProto && typeof THREE.TextureLoader === "function") {
      const loader = new THREE.TextureLoader();
      loader.load("assets/sky/sanctuary_day.jpg", function (tex) {
        tex.encoding = THREE.sRGBEncoding;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        env.skyPhotoDayMat.map = tex;
        env.skyPhotoDayMat.needsUpdate = true;
        env.hasPhotoDay = true;
        try {
          env.iblDayTex = pmrem.fromEquirectangular(tex).texture;
          if (env.moodKey === "day" || env.moodKey === "vote") scene.environment = env.iblDayTex;
        } catch (e) {}
      });
      loader.load("assets/sky/sanctuary_night.jpg", function (tex) {
        tex.encoding = THREE.sRGBEncoding;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        env.skyPhotoNightMat.map = tex;
        env.skyPhotoNightMat.needsUpdate = true;
        env.hasPhotoNight = true;
        try {
          env.iblNightTex = pmrem.fromEquirectangular(tex).texture;
          if (env.moodKey === "night" || (!env.iblDuskTex && (env.moodKey === "twilight" || !env.moodKey))) {
            scene.environment = env.iblNightTex;
          }
        } catch (e) {}
      });
      loader.load("assets/sky/sanctuary_dusk.jpg", function (tex) {
        tex.encoding = THREE.sRGBEncoding;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if (env.skyPhotoDuskMat) {
          env.skyPhotoDuskMat.map = tex;
          env.skyPhotoDuskMat.needsUpdate = true;
        }
        env.hasPhotoDusk = true;
        try {
          env.iblDuskTex = pmrem.fromEquirectangular(tex).texture;
          if (env.moodKey === "twilight" || env.moodKey === "vote" || !env.moodKey) {
            scene.environment = env.iblDuskTex;
          }
        } catch (e) {}
      });
    }
  } catch (e) {}
}

function build3DSkyAndLights(scene, env) {
  const bokehTex = stage3dTextures.createGlowParticleTexture();

  // 1. Procedural Fallback Sky Dome + Real 360° Photo Crossfade Domes
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 16;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext("2d");
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.encoding = THREE.sRGBEncoding;
  env.skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(64, 24, 18),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  env.skyCanvas = skyCanvas;
  env.skyCtx = skyCtx;
  env.skyTex = skyTex;
  scene.add(env.skyMesh);

  env.skyPhotoNightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoNightMesh = new THREE.Mesh(new THREE.SphereGeometry(62, 32, 22), env.skyPhotoNightMat);
  env.skyPhotoNightMesh.position.y = -6.0;
  scene.add(env.skyPhotoNightMesh);

  env.skyPhotoDuskMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoDuskMesh = new THREE.Mesh(new THREE.SphereGeometry(61, 32, 22), env.skyPhotoDuskMat);
  env.skyPhotoDuskMesh.position.y = -6.5;
  scene.add(env.skyPhotoDuskMesh);

  env.skyPhotoDayMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoDayMesh = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 22), env.skyPhotoDayMat);
  env.skyPhotoDayMesh.position.y = -6.0;
  scene.add(env.skyPhotoDayMesh);

  scene.fog = new THREE.FogExp2(0x0b1024, 0.015);

  // 2. Cinema Four-Point Lighting Rig (Hemisphere + Soft 2048 Key + Horizon Rim + Candlelight)
  env.hemiLight = new THREE.HemisphereLight(0x8fa8ff, 0x2b1b12, 0.92);
  scene.add(env.hemiLight);

  const isIgpuEnv = Boolean(typeof stage3d !== "undefined" && stage3d.isIntegratedGpu);
  const shadowRes = isIgpuEnv ? 1024 : 2048;
  env.dirLight = new THREE.DirectionalLight(0xfff1d0, 1.24);
  env.dirLight.position.set(11, 19, 9);
  env.dirLight.castShadow = true;
  env.dirLight.shadow.mapSize.width = shadowRes;
  env.dirLight.shadow.mapSize.height = shadowRes;
  env.dirLight.shadow.camera.near = 2;
  env.dirLight.shadow.camera.far = 48;
  const sc = 12.6;
  env.dirLight.shadow.camera.left = -sc;
  env.dirLight.shadow.camera.right = sc;
  env.dirLight.shadow.camera.top = sc;
  env.dirLight.shadow.camera.bottom = -sc;
  env.dirLight.shadow.bias = -0.0004;
  env.dirLight.shadow.normalBias = 0.02;
  env.dirLight.shadow.radius = 3;
  scene.add(env.dirLight);

  // Sculpting Rim Backlight separating characters & pavilion beams cleanly from mountain fog
  env.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.72);
  env.rimLight.position.set(-11, 9, -15);
  scene.add(env.rimLight);

  env.tableLight = new THREE.PointLight(0xffb454, 1.85, 17, 1.35);
  env.tableLight.position.set(0, 2.55, 0);
  scene.add(env.tableLight);

  // Volumetric Spotlight Tracking Active Speaker / Target
  env.spotTarget = new THREE.Object3D();
  env.spotTarget.position.set(0, 0.8, 0);
  scene.add(env.spotTarget);

  env.speakerSpot = new THREE.SpotLight(0xfde047, 0.0, 24, Math.PI / 7.2, 0.65, 1.15);
  env.speakerSpot.position.set(0, 11.5, 0);
  env.speakerSpot.target = env.spotTarget;
  scene.add(env.speakerSpot);

  const coneGeo = new THREE.ConeGeometry(1.7, 9.6, 24, 1, true);
  coneGeo.translate(0, -4.8, 0);
  env.spotCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  env.spotCone.position.set(0, 9.6, 0);
  scene.add(env.spotCone);

  // 3. Celestial Bodies (Sun + Moon + Soft Bokeh Starfield)
  const sunGroup = new THREE.Group();
  sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })));
  const sunHalo = new THREE.Mesh(
    new THREE.RingGeometry(2.55, 3.8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false })
  );
  sunGroup.add(sunHalo);
  sunGroup.position.set(17, 17, -28);
  scene.add(sunGroup);
  env.sunMesh = sunGroup;
  env.sunHalo = sunHalo;

  const moonGroup = new THREE.Group();
  moonGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.85, 20, 16), new THREE.MeshBasicMaterial({ color: 0xe0e7ff, fog: false })));
  moonGroup.add(new THREE.Mesh(
    new THREE.RingGeometry(2.15, 3.05, 32),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.28, side: THREE.DoubleSide, fog: false })
  ));
  moonGroup.position.set(-16, 16.5, -28);
  scene.add(moonGroup);
  env.moonGroup = moonGroup;

  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.44;
    const rad = 45 + Math.random() * 8;
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * rad;
    starPos[i * 3 + 1] = Math.cos(phi) * rad + 2;
    starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * rad;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  env.starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xe8efff,
      map: bokehTex,
      size: 0.58,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  scene.add(env.starPoints);
}

function createSculptedMountainRing(innerR, outerR, maxHeight, mat, seedShift) {
  const angSeg = 84;
  const radSeg = 9;
  const verts = [];
  const colors = [];
  const indices = [];

  for (let ri = 0; ri <= radSeg; ri++) {
    const rt = ri / radSeg;
    const rad = innerR + rt * (outerR - innerR);
    // Smooth mountain bell profile across radial span (rises cleanly, tapers at far edge)
    const radProfile = Math.sin(rt * Math.PI);
    for (let ai = 0; ai <= angSeg; ai++) {
      const ang = (ai / angSeg) * Math.PI * 2;
      // Carve wide coastal valley facing Guishan Island, Cloud Sea & Pacific Ocean around -1.18 rad (NNE)
      const seaDelta = Math.atan2(Math.sin(ang + 1.18), Math.cos(ang + 1.18));
      const seaNotch = 1.0 - 0.90 * Math.exp(-(seaDelta * seaDelta) / 0.56);

      const ridge =
        0.52 +
        0.28 * Math.sin(ang * 3 + seedShift) +
        0.16 * Math.cos(ang * 7 - seedShift * 1.4) +
        0.10 * Math.sin(ang * 13 + rt * 4.5);
      const y = -3.8 + Math.max(0.06, ridge) * radProfile * seaNotch * maxHeight;
      verts.push(Math.cos(ang) * rad, y, Math.sin(ang) * rad);

      // Qinglü Shan-Shui Height Vertex Coloring (deep indigo valley -> celadon mid-slope -> luminous mist peak!)
      const hNorm = clamp((y + 3.8) / Math.max(1, maxHeight * 0.85), 0, 1);
      const cr = 0.44 + hNorm * 0.54;
      const cg = 0.58 + hNorm * 0.40;
      const cb = 0.68 + hNorm * 0.32;
      colors.push(cr, cg, cb);
    }
  }

  for (let ri = 0; ri < radSeg; ri++) {
    for (let ai = 0; ai < angSeg; ai++) {
      const a = ri * (angSeg + 1) + ai;
      const b = a + angSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
  if (typeof geo.setIndex === "function") geo.setIndex(indices);
  if (typeof geo.computeVertexNormals === "function") geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function buildMountainPineTree(x, y, z, scaleMul) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1b, roughness: 0.90, metalness: 0.03 });
  const deepLeafMat = new THREE.MeshStandardMaterial({ color: 0x1d3b2b, roughness: 0.86, metalness: 0.03 });
  const needleTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createPineNeedleTexture === "function")
    ? stage3dTextures.createPineNeedleTexture()
    : null;
  const fanMatShade = needleTex
    ? new THREE.MeshStandardMaterial({
        map: needleTex,
        color: 0x5c9472,
        alphaTest: 0.28,
        transparent: true,
        roughness: 0.82,
        side: THREE.DoubleSide
      })
    : deepLeafMat;
  const fanMatSun = needleTex
    ? new THREE.MeshStandardMaterial({
        map: needleTex,
        color: 0x8bc99b,
        alphaTest: 0.28,
        transparent: true,
        roughness: 0.76,
        side: THREE.DoubleSide
      })
    : deepLeafMat;

  if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.42, 1.48, 0.18),
      new THREE.Vector3(-0.14, 3.12, -0.08)
    );
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 11, 0.155, 7, false), trunkMat);
    trunk.castShadow = true;
    g.add(trunk);

    // Gnarled bonsai-style lateral limbs connecting trunk to pine clouds
    [
      [new THREE.Vector3(0.24, 1.62, 0.10), new THREE.Vector3(0.56, 1.88, 0.24), new THREE.Vector3(0.76, 1.98, 0.30)],
      [new THREE.Vector3(0.08, 2.22, 0.02), new THREE.Vector3(-0.32, 2.40, -0.16), new THREE.Vector3(-0.62, 2.48, -0.26)]
    ].forEach(function (pts) {
      const bCurve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
      const limb = new THREE.Mesh(new THREE.TubeGeometry(bCurve, 6, 0.055, 5, false), trunkMat);
      g.add(limb);
    });
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.20, 3.0, 8), trunkMat);
    trunk.position.y = 1.5;
    g.add(trunk);
  }

  const canopy = new THREE.Group();
  const fanGeo = new THREE.PlaneGeometry(1.52, 1.08);
  [
    [0.68, 2.02, 0.28, 1.02],
    [-0.56, 2.52, -0.24, 0.94],
    [0.10, 3.10, 0.04, 1.12],
    [-0.14, 2.82, 0.44, 0.78]
  ].forEach(function (c, ti) {
    // Low-profile dark-emerald pine bough core (tapered flat pagoda silhouette instead of round sphere)
    const core = new THREE.Mesh(new THREE.ConeGeometry(c[3] * 0.66, c[3] * 0.36, 7), deepLeafMat);
    core.scale.set(1.16, 0.85, 0.98);
    core.position.set(c[0], c[1] + 0.02, c[2]);
    core.rotation.y = ti * 0.95;
    core.castShadow = true;
    canopy.add(core);
    if (needleTex) {
      // Lower shaded pine fronds (5 radial) + upper sunlit crown fronds (4 offset)
      for (let fi = 0; fi < 5; fi++) {
        const fa = (fi / 5) * Math.PI * 2 + ti * 0.65;
        const fan = new THREE.Mesh(fanGeo, fanMatShade);
        fan.position.set(c[0] + Math.cos(fa) * c[3] * 0.54, c[1] - 0.02 + (fi % 2) * 0.06, c[2] + Math.sin(fa) * c[3] * 0.54);
        fan.rotation.set(-0.62, fa, 0.14 * (fi % 2 ? 1 : -1));
        fan.scale.setScalar(c[3] * 0.86);
        canopy.add(fan);
      }
      for (let ui = 0; ui < 4; ui++) {
        const ua = (ui / 4) * Math.PI * 2 + ti * 0.9 + 0.4;
        const uFan = new THREE.Mesh(fanGeo, fanMatSun);
        uFan.position.set(c[0] + Math.cos(ua) * c[3] * 0.30, c[1] + 0.14 + (ui % 2) * 0.07, c[2] + Math.sin(ua) * c[3] * 0.30);
        uFan.rotation.set(-0.42, ua, -0.10 * (ui % 2 ? 1 : -1));
        uFan.scale.setScalar(c[3] * 0.72);
        canopy.add(uFan);
      }
    }
  });
  g.add(canopy);
  g.userData = { canopy: canopy };

  g.position.set(x, y, z);
  g.scale.setScalar(scaleMul || 1);
  return g;
}

function buildCourtyardStoneLantern(x, z, rotY) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.82, metalness: 0.08 });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffefc2,
    emissive: 0xffae42,
    emissiveIntensity: 1.55,
    roughness: 0.22
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.58), stoneMat);
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.95, 8), stoneMat);
  post.position.y = 0.68;
  post.castShadow = true;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.10, 0.50), stoneMat);
  tray.position.y = 1.18;
  const firebox = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.34, 6), coreMat);
  firebox.position.y = 1.40;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.28, 6), stoneMat);
  roof.position.y = 1.70;
  roof.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), stoneMat);
  finial.position.y = 1.88;

  g.add(plinth, post, tray, firebox, roof, finial);
  g.position.set(x, 0, z);
  g.rotation.y = rotY || 0;
  return { group: g, coreMat: coreMat };
}

function buildTabletopTeaSet(woodMat) {
  const teaSet = new THREE.Group();
  const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const clayMat = new THREE.MeshStandardMaterial({ color: 0x7c3b28, roughness: 0.42, metalness: 0.08 });
  const CupMatCtor = typeof THREE.MeshPhysicalMaterial === "function" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const cupPorcelain = new CupMatCtor({ color: 0xdff5eb, roughness: 0.14, metalness: 0.05, clearcoat: 0.9 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a657, roughness: 0.28, metalness: 0.72 });

  // Walnut coaster tea tray
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.036, 20), woodMat);
  tray.position.y = 0.018;
  tray.receiveShadow = true;
  teaSet.add(tray);

  // Sculpted Artisan Yixing Clay Teapot
  const potGeo = hasLathe
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.11, 0.0),
        new THREE.Vector2(0.175, 0.08),
        new THREE.Vector2(0.18, 0.15),
        new THREE.Vector2(0.125, 0.22),
        new THREE.Vector2(0.095, 0.24),
        new THREE.Vector2(0.01, 0.25)
      ], 18)
    : new THREE.SphereGeometry(0.16, 14, 12);
  const pot = new THREE.Mesh(potGeo, clayMat);
  pot.position.set(-0.04, 0.036, 0.0);
  pot.castShadow = true;
  teaSet.add(pot);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), brassMat);
  knob.position.set(-0.04, 0.305, 0);
  teaSet.add(knob);

  if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
    const spoutCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.18, 0.14, 0),
      new THREE.Vector3(-0.27, 0.19, 0),
      new THREE.Vector3(-0.30, 0.25, 0)
    );
    const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 8, 0.024, 7, false), clayMat);
    const handleCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.09, 0.21, 0),
      new THREE.Vector3(0.24, 0.19, 0),
      new THREE.Vector3(0.10, 0.09, 0)
    );
    const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 8, 0.020, 7, false), clayMat);
    teaSet.add(spout, handle);
  }

  // Twin Celadon Aroma Cups beside Teapot
  [
    [0.20, 0.16],
    [0.24, -0.10]
  ].forEach(function (cp) {
    const aromaCup = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.042, 0.072, 12), cupPorcelain);
    aromaCup.position.set(cp[0], 0.072, cp[1]);
    aromaCup.castShadow = true;
    teaSet.add(aromaCup);
  });

  teaSet.position.set(-1.26, 1.255, -0.44);
  return teaSet;
}

function build3DPavilionAndTable(scene, env, wood, stone, feltTex) {
  const bokehTex = stage3dTextures.createGlowParticleTexture();

  // 4. Subtle Cliffside Foothills tucked below terrace lip so 360° sea-of-clouds, sunset & Milky Way shine completely unobstructed!
  env.mtnMatBack = new THREE.MeshStandardMaterial({ color: 0x263854, roughness: 0.94, metalness: 0.04, vertexColors: true });
  env.mtnMatFront = new THREE.MeshStandardMaterial({ color: 0x324a64, roughness: 0.90, metalness: 0.06, vertexColors: true });
  scene.add(createSculptedMountainRing(19.0, 34.0, 2.5, env.mtnMatFront, 0.4));
  scene.add(createSculptedMountainRing(32.0, 50.0, 3.2, env.mtnMatBack, 2.3));

  // Soft Translucent Distant Pacific Sea-Shimmer (radial alpha fade so photographic cloud sea glows cleanly!)
  env.oceanBumpTex = stage3dTextures.createWaterBumpTexture();
  if (typeof THREE.ShaderMaterial === "function" && typeof THREE.Vector3 === "function") {
    env.oceanUniforms = {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x112a46) },
      uShallowColor: { value: new THREE.Color(0x28698c) },
      uSunColor: { value: new THREE.Color(0xffe6a6) },
      uSunDir: { value: new THREE.Vector3(0.42, 0.38, -0.82).normalize() }
    };
    env.oceanMat = new THREE.ShaderMaterial({
      uniforms: env.oceanUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: [
        "varying vec3 vWorldPos;",
        "void main() {",
        "  vec4 wp = modelMatrix * vec4(position, 1.0);",
        "  vWorldPos = wp.xyz;",
        "  gl_Position = projectionMatrix * viewMatrix * wp;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime;",
        "uniform vec3 uDeepColor;",
        "uniform vec3 uShallowColor;",
        "uniform vec3 uSunColor;",
        "uniform vec3 uSunDir;",
        "varying vec3 vWorldPos;",
        "void main() {",
        "  float dist = length(vWorldPos.xz);",
        "  float edgeFade = smoothstep(46.0, 18.0, dist) * smoothstep(10.0, 17.5, dist);",
        "  vec2 p = vWorldPos.xz * 0.24;",
        "  float w1 = sin(p.x * 1.7 + uTime * 0.9 + cos(p.y * 1.4 - uTime * 0.6));",
        "  float w2 = cos(p.y * 2.3 - uTime * 1.15 + sin(p.x * 1.9 + uTime * 0.5));",
        "  float w3 = sin((p.x - p.y) * 3.1 + uTime * 1.6);",
        "  vec3 n = normalize(vec3((w1 + w3 * 0.45) * 0.09, 1.0, (w2 - w3 * 0.45) * 0.09));",
        "  vec3 V = normalize(cameraPosition - vWorldPos);",
        "  float fresnel = pow(clamp(1.0 - max(dot(n, V), 0.0), 0.0, 1.0), 3.0);",
        "  vec3 baseCol = mix(uDeepColor, uShallowColor, clamp(0.28 + fresnel * 0.72 + w1 * 0.06, 0.0, 1.0));",
        "  vec3 H = normalize(normalize(uSunDir) + V);",
        "  float spec = pow(max(dot(n, H), 0.0), 68.0) * 0.52;",
        "  float glitter = pow(max(dot(n, H), 0.0), 18.0) * 0.12 * (0.6 + 0.4 * w3);",
        "  vec3 col = baseCol + uSunColor * (spec + glitter);",
        "  gl_FragColor = vec4(col, edgeFade * 0.36);",
        "}"
      ].join("\n")
    });
  } else {
    const OceanMatCtor = typeof THREE.MeshPhysicalMaterial === "function" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    env.oceanMat = new OceanMatCtor({
      color: 0x16384c,
      bumpMap: env.oceanBumpTex,
      bumpScale: 0.08,
      roughness: 0.16,
      metalness: 0.30,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.36
    });
  }
  const oceanMesh = new THREE.Mesh(new THREE.CircleGeometry(48, 48), env.oceanMat);
  oceanMesh.rotation.x = -Math.PI * 0.5;
  oceanMesh.position.y = -3.1;
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  // 5. Mountain Courtyard Ground + Stepped Octagonal Academy Stone Terrace
  env.groundMat = new THREE.MeshStandardMaterial({ color: 0x121a2d, roughness: 0.94, metalness: 0.05 });
  const groundDisk = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 19.8, 1.4, 24), env.groundMat);
  groundDisk.position.y = -0.94;
  groundDisk.receiveShadow = true;
  scene.add(groundDisk);

  env.terraceMat = new THREE.MeshStandardMaterial({
    map: stone.map,
    bumpMap: stone.bump,
    bumpScale: 0.04,
    color: 0xb8c4d9,
    roughness: 0.70,
    metalness: 0.14
  });
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.44, 8), env.terraceMat);
  terrace.position.y = -0.22;
  terrace.receiveShadow = true;
  scene.add(terrace);
  env.terraceMesh = terrace;
  stage3dTextures.upgradeStoneWithPolyHavenCC0(env.terraceMat);

  // Far Horizon: Delicate Distant Guishan Island (龜山島) Silhouette + Coastal Beacon Light!
  const guishanGroup = new THREE.Group();
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x263f54, roughness: 0.90, metalness: 0.04, transparent: true, opacity: 0.72 });
  const shellMain = new THREE.Mesh(new THREE.SphereGeometry(4.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  shellMain.scale.set(1.65, 0.58, 0.78);
  const headHill = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  headHill.scale.set(1.05, 0.82, 0.80);
  headHill.position.set(5.4, 0.0, 0.2);
  const tailHill = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  tailHill.scale.set(1.5, 0.44, 0.68);
  tailHill.position.set(-5.6, -0.05, -0.15);
  const guishanBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe49e, fog: false })
  );
  guishanBeacon.position.set(6.0, 2.0, 0.25);
  const guishanHit = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 6.5), new THREE.MeshBasicMaterial({ visible: false }));
  guishanHit.position.set(0, 1.8, 0);
  guishanGroup.add(shellMain, headHill, tailHill, guishanBeacon, guishanHit);
  guishanGroup.scale.set(0.46, 0.40, 0.46);
  guishanGroup.position.set(17.5, -2.55, -43);
  guishanGroup.rotation.y = -0.26;
  scene.add(guishanGroup);
  env.guishanGroup = guishanGroup;
  env.guishanHitMesh = guishanHit;
  env.guishanMat = islandMat;
  env.guishanBeacon = guishanBeacon;

  // Shimmering Lanyang Plain Valley Night Lights (Soft glowing bokeh orbs!)
  const cityCount = 135;
  const cityPos = new Float32Array(cityCount * 3);
  for (let ci = 0; ci < cityCount; ci++) {
    const ang = -Math.PI * 0.92 + Math.random() * Math.PI * 0.84;
    const rad = 16.5 + Math.random() * 14.5;
    cityPos[ci * 3] = Math.cos(ang) * rad;
    cityPos[ci * 3 + 1] = -0.95 + (Math.random() - 0.5) * 0.55;
    cityPos[ci * 3 + 2] = Math.sin(ang) * rad;
  }
  const cityGeo = new THREE.BufferGeometry();
  cityGeo.setAttribute("position", new THREE.BufferAttribute(cityPos, 3));
  env.lanyangLights = new THREE.Points(
    cityGeo,
    new THREE.PointsMaterial({
      color: 0xfcd34d,
      map: bokehTex,
      size: 0.48,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(env.lanyangLights);

  const terraceTrim = new THREE.Mesh(
    new THREE.TorusGeometry(8.46, 0.06, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.78 })
  );
  terraceTrim.rotation.x = Math.PI * 0.5;
  terraceTrim.rotation.z = Math.PI / 8;
  terraceTrim.position.y = 0.01;
  scene.add(terraceTrim);
  env.terraceTrim = terraceTrim;

  env.floorMandala = new THREE.Mesh(
    new THREE.RingGeometry(4.55, 4.72, 48),
    new THREE.MeshBasicMaterial({ color: 0xf5b942, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
  );
  env.floorMandala.rotation.x = -Math.PI * 0.5;
  env.floorMandala.position.y = 0.015;
  scene.add(env.floorMandala);

  // Genshin Liyue Volumetric Sunbeams (God Rays streaming gently across the pavilion!)
  const rayTex = typeof stage3dTextures.createGodRayTexture === "function" ? stage3dTextures.createGodRayTexture() : null;
  if (rayTex) {
    const raysGrp = new THREE.Group();
    const rayGeo = new THREE.PlaneGeometry(3.8, 12.5);
    [
      [4.2, 5.4, -3.5, -0.34, 0.24, 0.20],
      [-3.8, 5.6, -4.2, -0.28, -0.22, 0.16],
      [0.6, 5.8, -5.8, -0.32, 0.05, 0.18],
      [-5.6, 5.2, 1.4, -0.30, -0.45, 0.14],
      [5.4, 5.3, 1.8, -0.30, 0.42, 0.15]
    ].forEach(function (rc, idx) {
      const rMat = new THREE.MeshBasicMaterial({
        map: rayTex,
        color: 0xfff0c2,
        transparent: true,
        opacity: rc[5],
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const rm = new THREE.Mesh(rayGeo, rMat);
      rm.position.set(rc[0], rc[1], rc[2]);
      rm.rotation.set(rc[3], rc[4], 0.28);
      raysGrp.add(rm);
      env.godRays.push({ mesh: rm, mat: rMat, baseOp: rc[5], phase: idx * 1.1 });
    });
    scene.add(raysGrp);
    env.godRaysGroup = raysGrp;
  }

  // Stylized Liyue Drifting Bamboo Leaves & Osmanthus Blossom Petals
  const petalTex = typeof stage3dTextures.createPetalTexture === "function" ? stage3dTextures.createPetalTexture() : null;
  if (petalTex) {
    const petalGrp = new THREE.Group();
    const petalGeo = new THREE.PlaneGeometry(0.18, 0.26);
    for (let pi = 0; pi < 36; pi++) {
      const isBamboo = (pi % 3) !== 0;
      const pMat = new THREE.MeshBasicMaterial({
        map: petalTex,
        color: isBamboo ? 0x6ee7b7 : (pi % 2 === 0 ? 0xfde68a : 0xfecdd3),
        transparent: true,
        opacity: isBamboo ? 0.78 : 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const pm = new THREE.Mesh(petalGeo, pMat);
      const startX = ((pi * 37) % 18) - 9;
      const startY = 0.8 + ((pi * 13) % 60) * 0.1;
      const startZ = ((pi * 29) % 18) - 9;
      pm.position.set(startX, startY, startZ);
      petalGrp.add(pm);
      env.petals.push({
        mesh: pm,
        x0: startX,
        y0: startY,
        z0: startZ,
        speed: 0.45 + (pi % 5) * 0.12,
        phase: pi * 0.65
      });
    }
    scene.add(petalGrp);
    env.petalGroup = petalGrp;
  }

  const tableAO = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 6.8),
    new THREE.MeshBasicMaterial({ map: stage3dTextures.createContactShadowTexture(), transparent: true, opacity: 0.72, depthWrite: false })
  );
  tableAO.rotation.x = -Math.PI * 0.5;
  tableAO.position.y = 0.012;
  scene.add(tableAO);
  env.tableAO = tableAO;

  // 6. Handcrafted Taiwanese Mountain-Academy Belvedere Pavilion + Balustrades + Swept Backdrop Eaves
  const proceduralPavilionGroup = new THREE.Group();
  env.proceduralPavilionGroup = proceduralPavilionGroup;
  scene.add(proceduralPavilionGroup);

  const roofTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createRoofTileTextures === "function")
    ? stage3dTextures.createRoofTileTextures()
    : null;
  const pillarMat = new THREE.MeshStandardMaterial({ map: wood.map, color: 0x992b21, roughness: 0.32, metalness: 0.16 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ map: wood.map, color: 0x5c3621, roughness: 0.48, metalness: 0.14 });
  const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0xebe6dc, roughness: 0.70, metalness: 0.06 });
  const roofTileMat = new THREE.MeshStandardMaterial({
    map: roofTex ? roofTex.map : null,
    bumpMap: roofTex ? roofTex.bump : null,
    bumpScale: 0.048,
    color: roofTex ? 0xf2d9d4 : 0x7c2318,
    roughness: 0.44,
    metalness: 0.18,
    side: THREE.DoubleSide
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xd4a657, roughness: 0.26, metalness: 0.78 });

  const hasLathePav = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const lanternSilkTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createLanternSilkTexture === "function")
    ? stage3dTextures.createLanternSilkTexture()
    : null;
  const latticeTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createLatticeScreenTexture === "function")
    ? stage3dTextures.createLatticeScreenTexture()
    : null;
  const latticeMat = latticeTex
    ? new THREE.MeshStandardMaterial({
        map: latticeTex,
        emissiveMap: latticeTex,
        color: 0xf7ead2,
        emissive: 0xffb85c,
        emissiveIntensity: 0.34,
        roughness: 0.56,
        metalness: 0.08
      })
    : woodDarkMat;
  env.latticeScreenMat = latticeMat;

  const lanternBodyGeo = hasLathePav
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.15, -0.30),
        new THREE.Vector2(0.24, -0.20),
        new THREE.Vector2(0.28, 0.0),
        new THREE.Vector2(0.24, 0.20),
        new THREE.Vector2(0.16, 0.30)
      ], 16)
    : new THREE.CylinderGeometry(0.24, 0.19, 0.56, 12);
  const lanternCapGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.075, 12);
  const lanternTrimRingGeo = new THREE.TorusGeometry(0.195, 0.016, 6, 16);
  const lanternHaloGeo = new THREE.SphereGeometry(0.50, 12, 10);
  const lanternCapMat = new THREE.MeshStandardMaterial({ color: 0x2b1409, roughness: 0.40, metalness: 0.45 });
  const tasselMat = new THREE.MeshStandardMaterial({ color: 0xb92c22, roughness: 0.65 });
  env.lanternHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffb84d,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  env.lanternBodyMat = new THREE.MeshStandardMaterial({
    map: lanternSilkTex,
    emissiveMap: lanternSilkTex,
    color: 0xfff5dc,
    emissive: 0xffa638,
    emissiveIntensity: 1.40,
    roughness: 0.34
  });

  const pillarPts = [];
  const lr = 7.85;
  for (let li = 0; li < 8; li++) {
    const la = (li / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(la) * lr;
    const pz = Math.sin(la) * lr;
    pillarPts.push({ x: px, z: pz, a: la, li: li });

    // Leave front South bays (li=1, li=2) open-air so pillars NEVER obstruct front camera views!
    if (li === 1 || li === 2) continue;

    const lg = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.36, 8), stonePlinthMat);
    plinth.position.y = 0.18;
    lg.add(plinth);
    const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 16), goldAccentMat);
    plinthRing.rotation.x = Math.PI * 0.5;
    plinthRing.position.y = 0.37;
    lg.add(plinthRing);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.7, 12), pillarMat);
    post.position.y = 2.6;
    post.castShadow = true;
    lg.add(post);

    // Sculpted Dougong (斗拱) stepped timber bracket capital supporting eaves
    const douLower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), woodDarkMat);
    douLower.position.y = 4.62;
    const douUpper = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.11, 0.52), goldAccentMat);
    douUpper.position.y = 4.75;
    lg.add(douLower, douUpper);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.85), woodDarkMat);
    arm.position.set(0, 4.25, -0.4);
    lg.add(arm);

    const orb = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 4), lanternCapMat);
    cord.position.y = 0.52;
    const body = new THREE.Mesh(lanternBodyGeo, env.lanternBodyMat);
    const halo = new THREE.Mesh(lanternHaloGeo, env.lanternHaloMat);
    const topCap = new THREE.Mesh(lanternCapGeo, lanternCapMat);
    topCap.position.y = 0.31;
    const topTrim = new THREE.Mesh(lanternTrimRingGeo, goldAccentMat);
    topTrim.rotation.x = Math.PI * 0.5;
    topTrim.position.y = 0.27;
    const botCap = new THREE.Mesh(lanternCapGeo, lanternCapMat);
    botCap.position.y = -0.31;
    const botTrim = new THREE.Mesh(lanternTrimRingGeo, goldAccentMat);
    botTrim.rotation.x = Math.PI * 0.5;
    botTrim.position.y = -0.27;
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.044, 0.32, 6), tasselMat);
    tassel.position.y = -0.49;
    orb.add(cord, body, halo, topCap, topTrim, botCap, botTrim, tassel);
    orb.position.set(0, 3.45, -0.78);
    lg.add(orb);

    lg.position.set(px, 0, pz);
    lg.lookAt(0, 0, 0);
    proceduralPavilionGroup.add(lg);
    env.lanterns.push({ group: lg, orb: orb, tassel: tassel, phase: li * 0.85 });
  }

  // Carved Wooden Balustrades, White-Plaster Academy Plinths & Swept Backdrop Flying Eaves (leaves +Z camera bays open!)
  const hasTube = typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function";
  for (let bi = 0; bi < 8; bi++) {
    // Bay 1 (Front South between li=1 and li=2) stays completely open gateway for uncluttered camera approach
    if (bi === 1) continue;
    const pA = pillarPts[bi];
    const pB = pillarPts[(bi + 1) % 8];
    const midX = (pA.x + pB.x) * 0.5;
    const midZ = (pA.z + pB.z) * 0.5;
    const span = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    // Low white-plaster courtyard curb + walnut railing (skip front-side entrance bays 0 and 2 so view feels inviting)
    if (bi >= 3 || bi === 7) {
      const bayGrp = new THREE.Group();
      bayGrp.position.set(midX, 0, midZ);
      bayGrp.rotation.y = yaw;

      const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, span - 0.35), stonePlinthMat);
      lowWall.position.y = 0.14;
      lowWall.receiveShadow = true;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, span - 0.25), woodDarkMat);
      topRail.position.y = 0.96;
      topRail.castShadow = true;
      bayGrp.add(lowWall, topRail);

      [-0.3, 0, 0.3].forEach(function (frac) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.68, 6), woodDarkMat);
        sp.position.set(0, 0.60, frac * (span - 0.5));
        bayGrp.add(sp);
      });
      proceduralPavilionGroup.add(bayGrp);
    }

    // Sloped Red-Tile Backdrop Veranda Roof + Swept Upturned Flying Eaves along Rear & Side Bays (3..7)!
    if (bi >= 3) {
      const eaveGrp = new THREE.Group();
      eaveGrp.position.set(midX, 4.92, midZ);
      eaveGrp.lookAt(0, 4.92, 0);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(span + 0.18, 0.22, 0.26), woodDarkMat);
      const frieze = new THREE.Mesh(new THREE.BoxGeometry(span + 0.12, 0.18, 0.28), stonePlinthMat);
      frieze.position.y = -0.18;

      // Outward-sloping crimson roof skirt (extends OUTSIDE pillar ring, zero camera occlusion!)
      const slopeLen = 2.05;
      const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(span + 0.72, 0.12, slopeLen), roofTileMat);
      roofPanel.position.set(0, 0.34, -0.78);
      roofPanel.rotation.x = 0.34;
      roofPanel.castShadow = true;

      const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(span + 0.78, 0.10, 0.12), goldAccentMat);
      ridgeBeam.position.set(0, 0.04, -1.72);
      eaveGrp.add(lintel, frieze, roofPanel, ridgeBeam);
      // Warm backlit carved lattice transom frieze along rear bays (zero horizon occlusion!)
      if (bi >= 4 && bi <= 6 && latticeTex) {
        const transom = new THREE.Mesh(new THREE.BoxGeometry(span - 0.42, 0.42, 0.06), latticeMat);
        transom.position.set(0, -0.50, 0.02);
        const transomBar = new THREE.Mesh(new THREE.BoxGeometry(span - 0.34, 0.06, 0.10), woodDarkMat);
        transomBar.position.set(0, -0.73, 0.02);
        eaveGrp.add(transom, transomBar);
      }
      proceduralPavilionGroup.add(eaveGrp);
    }
  }

  // Sculpted Upturned Flying Eave Horns + Golden Finials on the 6 Rear/Side Pillars (li = 3,4,5,6,7,0)!
  [0, 3, 4, 5, 6, 7].forEach(function (idx) {
    const pt = pillarPts[idx];
    const dirX = Math.cos(pt.a);
    const dirZ = Math.sin(pt.a);
    const hornGrp = new THREE.Group();
    if (hasTube) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(dirX * 7.6, 5.26, dirZ * 7.6),
        new THREE.Vector3(dirX * 8.95, 5.02, dirZ * 8.95),
        new THREE.Vector3(dirX * 9.75, 5.38, dirZ * 9.75)
      );
      const horn = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.095, 7, false), roofTileMat);
      hornGrp.add(horn);
    }
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), goldAccentMat);
    finial.position.set(dirX * 9.78, 5.46, dirZ * 9.78);
    hornGrp.add(finial);
    proceduralPavilionGroup.add(hornGrp);
  });

  // 4 Courtyard Stone Lanterns + 3 Sculpted Mountain Pines framing the horizon cliff!
  [
    [8.8, -4.8, 0.4],
    [-8.8, -4.8, -0.4],
    [4.4, -8.8, 0.1],
    [-4.4, -8.8, -0.1]
  ].forEach(function (sl) {
    const lanternObj = buildCourtyardStoneLantern(sl[0], sl[1], sl[2]);
    scene.add(lanternObj.group);
    env.stoneLanternCores.push(lanternObj.coreMat);
  });

  [
    [-9.8, -0.45, -3.8, 1.15],
    [-7.6, -0.55, -8.4, 1.32],
    [9.6, -0.45, -4.6, 1.10]
  ].forEach(function (pt, idx) {
    const pine = buildMountainPineTree(pt[0], pt[1], pt[2], pt[3]);
    scene.add(pine);
    env.pineTrees.push({ group: pine, canopy: pine.userData ? pine.userData.canopy : null, phase: idx * 1.45 });
  });

  // 7. Lacquered Clearcoat Walnut Round Table + Artisan Yixing Teapot & Academy Life Props
  // Round table geometry lives in env.tableScaleGroup so 6/8/10/12-seat modes scale X/Z cleanly without stretching inner tea props!
  const tableGroup = new THREE.Group();
  const tableScaleGroup = new THREE.Group();
  env.tableScaleGroup = tableScaleGroup;
  tableGroup.add(tableScaleGroup);
  const MatCtor = typeof THREE.MeshPhysicalMaterial === "function" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const tableWoodMat = new MatCtor({
    map: wood.map,
    bumpMap: wood.bump,
    bumpScale: 0.025,
    roughnessMap: wood.roughness || null,
    roughness: 0.28,
    metalness: 0.14,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15
  });
  stage3dTextures.upgradeWoodWithPolyHavenCC0(tableWoodMat);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.35, 1.05, 18), tableWoodMat);
  pedestal.position.y = 0.52;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  tableScaleGroup.add(pedestal);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.10, 0.24, 48), tableWoodMat);
  tableTop.position.y = 1.12;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableScaleGroup.add(tableTop);
  env.tableTopMesh = tableTop;

  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.09, 14, 56), tableWoodMat);
  rimTorus.rotation.x = Math.PI * 0.5;
  rimTorus.position.y = 1.22;
  tableScaleGroup.add(rimTorus);

  // Antique-brass inlaid outer rim filigree & pedestal collar
  const outerBrassTrim = new THREE.Mesh(new THREE.TorusGeometry(3.28, 0.024, 10, 56), goldAccentMat);
  outerBrassTrim.rotation.x = Math.PI * 0.5;
  outerBrassTrim.position.y = 1.235;
  const pedestalCollar = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.042, 10, 28), goldAccentMat);
  pedestalCollar.rotation.x = Math.PI * 0.5;
  pedestalCollar.position.y = 0.05;
  tableScaleGroup.add(outerBrassTrim, pedestalCollar);

  const feltDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(2.58, 2.58, 0.03, 44),
    new THREE.MeshStandardMaterial({
      map: feltTex,
      bumpMap: stage3dTextures.createFabricTextures().bump,
      bumpScale: 0.012,
      roughness: 0.84,
      metalness: 0.06
    })
  );
  feltDisk.position.y = 1.245;
  feltDisk.receiveShadow = true;
  tableScaleGroup.add(feltDisk);

  env.tableGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.60, 0.036, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.82 })
  );
  env.tableGlowRing.rotation.x = Math.PI * 0.5;
  env.tableGlowRing.position.y = 1.255;
  tableScaleGroup.add(env.tableGlowRing);

  tableGroup.add(buildTabletopTeaSet(tableWoodMat));
  tableGroup.add(buildTabletopAcademyProps(tableWoodMat, env));
  scene.add(tableGroup);
}

function buildTabletopAcademyProps(woodMat, env) {
  const propsGroup = new THREE.Group();
  const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const celadonMat = new THREE.MeshStandardMaterial({ color: 0x7cb9a8, roughness: 0.22, metalness: 0.1 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a657, roughness: 0.28, metalness: 0.78 });
  const scrollMat = new THREE.MeshStandardMaterial({ color: 0xf6edd9, roughness: 0.78 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.12 });
  const pastryMat = new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.62 });

  // 1. Tripod Celadon Sandalwood Incense Burner (opposite Yixing teapot)
  const censer = new THREE.Group();
  const bowlGeo = hasLathe
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.04),
        new THREE.Vector2(0.11, 0.05),
        new THREE.Vector2(0.15, 0.12),
        new THREE.Vector2(0.12, 0.20),
        new THREE.Vector2(0.145, 0.22),
        new THREE.Vector2(0.10, 0.21)
      ], 16)
    : new THREE.CylinderGeometry(0.14, 0.10, 0.18, 14);
  const censerBowl = new THREE.Mesh(bowlGeo, celadonMat);
  censerBowl.castShadow = true;
  censer.add(censerBowl);
  for (let fi = 0; fi < 3; fi++) {
    const fa = (fi / 3) * Math.PI * 2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.06, 6), brassMat);
    foot.position.set(Math.cos(fa) * 0.095, 0.03, Math.sin(fa) * 0.095);
    censer.add(foot);
  }
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff8c42, emissive: 0xff5a1f, emissiveIntensity: 0.9, roughness: 0.4 });
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.016, 12), emberMat);
  ember.position.y = 0.20;
  censer.add(ember);
  env.incenseEmberMat = emberMat;
  censer.position.set(1.26, 1.255, -0.48);
  propsGroup.add(censer);

  // 2. Unrolled Academy Scroll, Jade Weight & Inkstone
  const scrollGrp = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.012, 0.32), scrollMat);
  paper.position.y = 0.008;
  paper.receiveShadow = true;
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8);
  const rodL = new THREE.Mesh(rodGeo, woodMat);
  rodL.rotation.x = Math.PI * 0.5;
  rodL.position.set(-0.29, 0.022, 0);
  const rodR = new THREE.Mesh(rodGeo, woodMat);
  rodR.rotation.x = Math.PI * 0.5;
  rodR.position.set(0.29, 0.022, 0);
  const inkstone = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.10), slateMat);
  inkstone.position.set(0.18, 0.018, -0.04);
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.26, 6), woodMat);
  brush.rotation.z = Math.PI * 0.5;
  brush.rotation.y = 0.32;
  brush.position.set(-0.04, 0.022, 0.04);
  scrollGrp.add(paper, rodL, rodR, inkstone, brush);
  scrollGrp.position.set(0.92, 1.255, 0.86);
  scrollGrp.rotation.y = -0.48;
  propsGroup.add(scrollGrp);

  // 3. Osmanthus Tea Pastry Celadon Dish
  const plateGrp = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.030, 16), celadonMat);
  dish.position.y = 0.015;
  dish.receiveShadow = true;
  plateGrp.add(dish);
  [
    [-0.06, 0.042, -0.04, 0.15],
    [0.07, 0.042, -0.03, -0.25],
    [0.0, 0.042, 0.07, 0.42]
  ].forEach(function (pc) {
    const cake = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.038, 0.082), pastryMat);
    cake.position.set(pc[0], pc[1], pc[2]);
    cake.rotation.y = pc[3];
    cake.castShadow = true;
    plateGrp.add(cake);
  });
  plateGrp.position.set(-0.96, 1.255, 0.88);
  propsGroup.add(plateGrp);

  return propsGroup;
}

function createCurvedLotusPetalGeo(width, height, cupDepth) {
  const segU = 7;
  const segV = 8;
  const verts = [];
  const uvs = [];
  const indices = [];
  for (let vi = 0; vi <= segV; vi++) {
    const v = vi / segV;
    // Graceful teardrop silhouette: narrow base -> full belly -> delicately pointed tip
    const profileW = Math.sin(Math.pow(v, 0.78) * Math.PI) * width * 0.5;
    // Outward recurve spine (blooms gracefully outward and curls gently at tip)
    const spineZ = Math.sin(v * Math.PI * 0.85) * height * 0.30 + v * v * height * 0.16;
    const spineY = v * height;
    for (let ui = 0; ui <= segU; ui++) {
      const u = (ui / segU) * 2 - 1; // -1 .. +1 across petal width
      const px = u * profileW;
      // Concave cupped inner bowl curving inward along lateral edges
      const cup = (1.0 - u * u) * Math.sin(v * Math.PI) * cupDepth;
      const pz = spineZ - cup;
      verts.push(px, spineY, pz);
      uvs.push(ui / segU, v);
    }
  }
  for (let vi = 0; vi < segV; vi++) {
    for (let ui = 0; ui < segU; ui++) {
      const a = vi * (segU + 1) + ui;
      const b = a + segU + 1;
      indices.push(a, a + 1, b);
      indices.push(b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  if (typeof geo.setIndex === "function") geo.setIndex(indices);
  if (typeof geo.computeVertexNormals === "function") geo.computeVertexNormals();
  return geo;
}

function build3DLotusAndAtmosphere(scene, env) {
  const bokehTex = stage3dTextures.createGlowParticleTexture();
  const cloudTex = stage3dTextures.createCloudTexture();

  const mistRing = new THREE.Mesh(
    new THREE.CylinderGeometry(18.5, 20.5, 2.8, 28, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
  );
  mistRing.position.y = 0.9;
  scene.add(mistRing);
  env.mistRing = mistRing;

  // Subtle Distant Valley Cloud Wisps below terrace elevation (zero white wall!)
  const cloudCount = 22;
  for (let ci = 0; ci < cloudCount; ci++) {
    const ang = (ci / cloudCount) * Math.PI * 2 + (ci % 3) * 0.18;
    const rad = 22.0 + (ci % 4) * 4.5;
    const cW = 9.5 + (ci % 3) * 2.8;
    const cH = 3.4 + (ci % 2) * 1.2;
    const cMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cW, cH), cMat);
    const cy = -2.85 + (ci % 3) * 0.55;
    cMesh.position.set(Math.cos(ang) * rad, cy, Math.sin(ang) * rad);
    cMesh.lookAt(0, cy + 1.8, 0);
    scene.add(cMesh);
    env.cloudPlanes.push({
      mesh: cMesh,
      mat: cMat,
      ang: ang,
      rad: rad,
      y: cy,
      speed: 0.012 + (ci % 4) * 0.004,
      phase: ci * 0.7
    });
  }

  const pillarGeo = new THREE.CylinderGeometry(0.55, 1.35, 14, 18, 1, true);
  pillarGeo.translate(0, 7, 0);
  env.resonancePillar = new THREE.Mesh(
    pillarGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  env.resonancePillar.position.set(0, 1.25, 0);
  scene.add(env.resonancePillar);

  // 8. Interactive Handcrafted Glass-Jade Sacred Lotus Centerpiece (Curved Double-Tier Petals + Filigree Halos!)
  const lotusGroup = new THREE.Group();
  lotusGroup.position.set(0, 1.98, 0);

  const hasLatheLotus = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x6f4318, roughness: 0.26, metalness: 0.84 });
  const filigreeGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf4cf76,
    emissive: 0xd4942a,
    emissiveIntensity: 0.42,
    roughness: 0.20,
    metalness: 0.88
  });

  // Sculpted Stepped Antique-Bronze Chalice Stand resting on the felt mandala
  const standGeo = hasLatheLotus
    ? new THREE.LatheGeometry([
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.64, 0.0),
        new THREE.Vector2(0.60, 0.05),
        new THREE.Vector2(0.46, 0.09),
        new THREE.Vector2(0.36, 0.14),
        new THREE.Vector2(0.50, 0.21),
        new THREE.Vector2(0.44, 0.23),
        new THREE.Vector2(0.01, 0.19)
      ], 28)
    : new THREE.CylinderGeometry(0.46, 0.62, 0.18, 20);
  const crystalStand = new THREE.Mesh(standGeo, bronzeMat);
  crystalStand.position.set(0, 1.26, 0);
  crystalStand.receiveShadow = true;
  scene.add(crystalStand);
  const standRim = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.018, 8, 32), filigreeGoldMat);
  standRim.rotation.x = Math.PI * 0.5;
  standRim.position.set(0, 1.47, 0);
  scene.add(standRim);

  const CoreMatCtor = typeof THREE.MeshPhysicalMaterial === "function" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  // Smooth Iridescent Glass-Jade Sacred Heart + Golden Stamen Crown
  env.lotusCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 22, 18),
    new CoreMatCtor({
      color: 0xf6d88c,
      emissive: 0xd99224,
      emissiveIntensity: 0.72,
      roughness: 0.16,
      metalness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    })
  );
  env.lotusCore.scale.set(1.0, 1.12, 1.0);
  lotusGroup.add(env.lotusCore);

  env.lotusCoreAuraMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreAura = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    env.lotusCoreAuraMat
  );
  lotusGroup.add(coreAura);

  // Delicate Crown of 8 Luminous Golden Stamen Pearls around the lotus heart
  const stamenGeo = new THREE.SphereGeometry(0.036, 8, 6);
  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.25,
    roughness: 0.18
  });
  for (let si = 0; si < 8; si++) {
    const sa = (si / 8) * Math.PI * 2;
    const stPearl = new THREE.Mesh(stamenGeo, stamenMat);
    stPearl.position.set(Math.cos(sa) * 0.34, 0.12 + (si % 2) * 0.04, Math.sin(sa) * 0.34);
    lotusGroup.add(stPearl);
  }

  env.lotusHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.86, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  lotusGroup.add(env.lotusHitMesh);

  // Twin Counter-Rotating Antique-Gold Filigree Halos
  env.lotusRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.018, 10, 40),
    filigreeGoldMat
  );
  env.lotusRing.rotation.x = Math.PI * 0.38;
  lotusGroup.add(env.lotusRing);

  env.lotusRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.012, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.65 })
  );
  env.lotusRingInner.rotation.x = -Math.PI * 0.34;
  lotusGroup.add(env.lotusRingInner);

  // Outer Tier: 8 Sculpted Translucent Celadon-Ivory Jade Curved Lotus Petals
  const outerPetalGeo = createCurvedLotusPetalGeo(0.42, 0.68, 0.10);
  const outerPetalMat = new CoreMatCtor({
    color: 0xe8efe4,
    emissive: 0xb88c3e,
    emissiveIntensity: 0.22,
    roughness: 0.20,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  env.lotusOuterPetalMat = outerPetalMat;
  for (let oi = 0; oi < 8; oi++) {
    const oa = (oi / 8) * Math.PI * 2 + Math.PI / 8;
    const opWrap = new THREE.Group();
    opWrap.rotation.y = oa;
    const op = new THREE.Mesh(outerPetalGeo, outerPetalMat);
    op.position.set(0, -0.32, 0.32);
    op.rotation.x = 0.62;
    opWrap.add(op);
    lotusGroup.add(opWrap);
  }

  // Inner Tier: 6 Sculpted Three-Goodness Translucent Jade/Gold/Azure Petals
  const innerPetalGeo = createCurvedLotusPetalGeo(0.34, 0.56, 0.09);
  const tgKeys = ["heart", "words", "deeds"];
  const tgColors = {
    heart: { col: 0xfcd36a, em: 0xe69720 },
    words: { col: 0x6ee7b7, em: 0x169c72 },
    deeds: { col: 0x7dd3fc, em: 0x1e88c9 }
  };
  env.threeGoodPetals = { heart: [], words: [], deeds: [] };
  for (let pi = 0; pi < 6; pi++) {
    const kind = tgKeys[pi % 3];
    const tc = tgColors[kind];
    const pMat = new CoreMatCtor({
      color: tc.col,
      emissive: tc.em,
      emissiveIntensity: 0.38,
      roughness: 0.16,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const pa = (pi / 6) * Math.PI * 2;
    const ipWrap = new THREE.Group();
    ipWrap.rotation.y = pa;
    const petal = new THREE.Mesh(innerPetalGeo, pMat);
    petal.position.set(0, -0.22, 0.24);
    petal.rotation.x = 0.36;
    ipWrap.add(petal);
    lotusGroup.add(ipWrap);
    env.threeGoodPetals[kind].push({ mesh: petal, mat: pMat, pa: pa });
  }
  scene.add(lotusGroup);
  env.lotusGroup = lotusGroup;

  // 9. Zero-GC Rising Tea Steam & Sandalwood Incense Wisps + Ambient Fireflies
  const steamEmitters = [
    { x: -1.56, y: 1.50, z: -0.44, count: 14, maxRise: 0.72, drift: 0.09, speed: 0.48 }, // Yixing Teapot Spout
    { x: -1.06, y: 1.38, z: -0.28, count: 6, maxRise: 0.50, drift: 0.055, speed: 0.42 }, // Celadon Aroma Cup 1
    { x: -1.02, y: 1.38, z: -0.54, count: 6, maxRise: 0.50, drift: 0.055, speed: 0.40 }, // Celadon Aroma Cup 2
    { x: 1.26, y: 1.48, z: -0.48, count: 16, maxRise: 1.15, drift: 0.14, speed: 0.36 }   // Tripod Incense Burner
  ];
  let steamTotal = 0;
  steamEmitters.forEach(function (em) { steamTotal += em.count; });
  const steamPos = new Float32Array(steamTotal * 3);
  let sIdx = 0;
  steamEmitters.forEach(function (em, eIdx) {
    for (let k = 0; k < em.count; k++) {
      const phase = (k / em.count) + eIdx * 0.21;
      steamPos[sIdx * 3] = em.x;
      steamPos[sIdx * 3 + 1] = em.y + (phase % 1) * em.maxRise;
      steamPos[sIdx * 3 + 2] = em.z;
      env.teaSteamMeta.push({
        baseX: em.x,
        baseY: em.y,
        baseZ: em.z,
        maxRise: em.maxRise,
        drift: em.drift,
        speed: em.speed,
        phase: phase * Math.PI * 2
      });
      sIdx += 1;
    }
  });
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPos, 3));
  env.teaSteamPoints = new THREE.Points(
    steamGeo,
    new THREE.PointsMaterial({
      color: 0xf8fafc,
      map: bokehTex,
      size: 0.24,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(env.teaSteamPoints);

  const ffCount = 80;
  const ffPos = new Float32Array(ffCount * 3);
  for (let fi = 0; fi < ffCount; fi++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 2.6 + Math.random() * 8.8;
    const y = 0.6 + Math.random() * 5.2;
    ffPos[fi * 3] = Math.cos(ang) * rad;
    ffPos[fi * 3 + 1] = y;
    ffPos[fi * 3 + 2] = Math.sin(ang) * rad;
    env.fireflyMeta.push({ ang: ang, rad: rad, y: y, speed: 0.14 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 });
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos, 3));
  env.fireflyPoints = new THREE.Points(
    ffGeo,
    new THREE.PointsMaterial({
      color: 0xfde68a,
      map: bokehTex,
      size: 0.30,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(env.fireflyPoints);
}

function build3DEnvironment(scene, renderer) {
  const wood = stage3dTextures.createWoodTextures();
  const stone = stage3dTextures.createStoneTextures();
  const feltTex = stage3dTextures.createFeltMatTexture();

  const env = {
    moodKey: "",
    dawnSweep: 0,
    hasPhotoDay: false,
    hasPhotoDusk: false,
    hasPhotoNight: false,
    iblDefaultTex: null,
    iblDayTex: null,
    iblDuskTex: null,
    iblNightTex: null,
    skyCanvas: null,
    skyCtx: null,
    skyTex: null,
    skyMesh: null,
    skyPhotoDayMat: null,
    skyPhotoDuskMat: null,
    skyPhotoNightMat: null,
    skyPhotoDayMesh: null,
    skyPhotoDuskMesh: null,
    skyPhotoNightMesh: null,
    latticeScreenMat: null,
    sunMesh: null,
    sunHalo: null,
    moonGroup: null,
    starPoints: null,
    fireflyPoints: null,
    fireflyMeta: [],
    teaSteamPoints: null,
    teaSteamMeta: [],
    proceduralPavilionGroup: null,
    lanternHaloMat: null,
    incenseEmberMat: null,
    lanterns: [],
    stoneLanternCores: [],
    pineTrees: [],
    cloudPlanes: [],
    godRays: [],
    godRaysGroup: null,
    petals: [],
    petalGroup: null,
    lotusGroup: null,
    lotusCore: null,
    lotusCoreAuraMat: null,
    lotusOuterPetalMat: null,
    lotusRing: null,
    lotusRingInner: null,
    lotusHitMesh: null,
    lotusSpinBoost: 0,
    threeGoodPetals: null,
    resonancePillar: null,
    mistRing: null,
    tableScaleGroup: null,
    tableScaleCurrent: 0,
    pavilionScaleCurrent: 0,
    tableAO: null,
    terraceMesh: null,
    terraceTrim: null,
    tableGlowRing: null,
    tableTopMesh: null,
    oceanMat: null,
    oceanUniforms: null,
    oceanBumpTex: null,
    guishanGroup: null,
    guishanHitMesh: null,
    guishanMat: null,
    guishanBeacon: null,
    hemiLight: null,
    dirLight: null,
    rimLight: null,
    tableLight: null,
    speakerSpot: null,
    spotTarget: null,
    spotCone: null,
    targetColors: {
      fog: new THREE.Color(0x0b1024),
      hemiSky: new THREE.Color(0x6366f1),
      hemiGnd: new THREE.Color(0x1e1b4b),
      dir: new THREE.Color(0xfde68a),
      rim: new THREE.Color(0x93c5fd),
      table: new THREE.Color(0xf59e0b),
      lotus: new THREE.Color(0xfbbf24),
      cloud: new THREE.Color(0xdbeafe)
    },
    currentSpotPos: new THREE.Vector3(0, 0, 0)
  };

  build3DSkyAndLights(scene, env);
  build3DPavilionAndTable(scene, env, wood, stone, feltTex);
  build3DLotusAndAtmosphere(scene, env);
  build3DEnvironmentMap(renderer, scene, env);
  return env;
}

function apply3DMoodPalette(scene, env, moodKey) {
  const g = env.skyCtx;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (moodKey === "day") {
    // Luminous Genshin Liyue Jueyun Karst Morning Sky & Teal Mountains
    grad.addColorStop(0, "#1da1f2");
    grad.addColorStop(0.42, "#7dd3fc");
    grad.addColorStop(0.75, "#e0f7fa");
    grad.addColorStop(1, "#fef3c7");
    env.targetColors.fog.setHex(0xcbeefd);
    env.targetColors.hemiSky.setHex(0xbae6fd);
    env.targetColors.hemiGnd.setHex(0xe5c185);
    env.targetColors.dir.setHex(0xfffbeb);
    env.targetColors.rim.setHex(0xfef08a);
    env.targetColors.table.setHex(0xffc366);
    env.targetColors.lotus.setHex(0xfbbf24);
    env.targetColors.cloud.setHex(0xfffdf5);
    env.mtnMatBack.color.setHex(0x528d88);
    env.mtnMatFront.color.setHex(0x3a6f6b);
    env.groundMat.color.setHex(0x3b6355);
    env.terraceMat.color.setHex(0xf3efe4);
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x136386);
      env.oceanUniforms.uShallowColor.value.setHex(0x3ba9cc);
      env.oceanUniforms.uSunColor.value.setHex(0xfff5cc);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x1b8cb3);
    }
    if (env.skyPhotoDayMat && env.skyPhotoDayMat.color) env.skyPhotoDayMat.color.setHex(0xffffff);
    env.fireflyPoints.material.color.setHex(0xfef08a);
    if (env.iblDayTex) scene.environment = env.iblDayTex;
  } else if (moodKey === "vote") {
    // Dramatic Liyue Crimson-Amber Dusk
    grad.addColorStop(0, "#4c1d24");
    grad.addColorStop(0.45, "#b44a38");
    grad.addColorStop(0.80, "#f59e0b");
    grad.addColorStop(1, "#fde68a");
    env.targetColors.fog.setHex(0x7c2d23);
    env.targetColors.hemiSky.setHex(0xfdba74);
    env.targetColors.hemiGnd.setHex(0x9a3412);
    env.targetColors.dir.setHex(0xfde68a);
    env.targetColors.rim.setHex(0xfb7185);
    env.targetColors.table.setHex(0xf43f5e);
    env.targetColors.lotus.setHex(0xf43f5e);
    env.targetColors.cloud.setHex(0xffd8be);
    env.mtnMatBack.color.setHex(0x5a2a33);
    env.mtnMatFront.color.setHex(0x6e2e32);
    env.groundMat.color.setHex(0x3b1e24);
    env.terraceMat.color.setHex(0xcab2a6);
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x471d2e);
      env.oceanUniforms.uShallowColor.value.setHex(0x9e4338);
      env.oceanUniforms.uSunColor.value.setHex(0xffc978);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x5b2838);
    }
    if (env.skyPhotoDayMat && env.skyPhotoDayMat.color) env.skyPhotoDayMat.color.setHex(0xffcfb8);
    if (env.skyPhotoDuskMat && env.skyPhotoDuskMat.color) env.skyPhotoDuskMat.color.setHex(0xffb8a0);
    env.fireflyPoints.material.color.setHex(0xfdba74);
    if (env.iblDuskTex) scene.environment = env.iblDuskTex;
    else if (env.iblDayTex) scene.environment = env.iblDayTex;
  } else if (moodKey === "night") {
    // Clean Luminous Anime Indigo Starlight (zero muddy black shadows)
    grad.addColorStop(0, "#0b1336");
    grad.addColorStop(0.48, "#1b285c");
    grad.addColorStop(0.84, "#2f3e78");
    grad.addColorStop(1, "#1b2652");
    env.targetColors.fog.setHex(0x1b2756);
    env.targetColors.hemiSky.setHex(0x7c8cf8);
    env.targetColors.hemiGnd.setHex(0x282654);
    env.targetColors.dir.setHex(0xd4d2ff);
    env.targetColors.rim.setHex(0x7dd3fc);
    env.targetColors.table.setHex(0xa78bfa);
    env.targetColors.lotus.setHex(0xa78bfa);
    env.targetColors.cloud.setHex(0x7f8fe6);
    env.mtnMatBack.color.setHex(0x1e2b58);
    env.mtnMatFront.color.setHex(0x273869);
    env.groundMat.color.setHex(0x172044);
    env.terraceMat.color.setHex(0xa3acd1);
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x0c1b3b);
      env.oceanUniforms.uShallowColor.value.setHex(0x234a7d);
      env.oceanUniforms.uSunColor.value.setHex(0xc7d2fe);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x173766);
    }
    env.fireflyPoints.material.color.setHex(0xd8b4fe);
    if (env.iblNightTex) scene.environment = env.iblNightTex;
  } else {
    // Breathtaking Liyue Golden Hour Twilight (Title Screen & Courtyard Gathering)
    grad.addColorStop(0, "#1c3566");
    grad.addColorStop(0.44, "#4b5f9e");
    grad.addColorStop(0.78, "#d9895b");
    grad.addColorStop(1, "#fde68a");
    env.targetColors.fog.setHex(0x2a3b68);
    env.targetColors.hemiSky.setHex(0x9cb4ff);
    env.targetColors.hemiGnd.setHex(0x523b38);
    env.targetColors.dir.setHex(0xffe8a3);
    env.targetColors.rim.setHex(0xfdcb82);
    env.targetColors.table.setHex(0xffbe5c);
    env.targetColors.lotus.setHex(0xfbbf24);
    env.targetColors.cloud.setHex(0xdbeafe);
    env.mtnMatBack.color.setHex(0x2f4d6d);
    env.mtnMatFront.color.setHex(0x3a6278);
    env.groundMat.color.setHex(0x20324a);
    env.terraceMat.color.setHex(0xc8d2e3);
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x123154);
      env.oceanUniforms.uShallowColor.value.setHex(0x356991);
      env.oceanUniforms.uSunColor.value.setHex(0xffdf99);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x1b4c73);
    }
    if (env.skyPhotoDuskMat && env.skyPhotoDuskMat.color) env.skyPhotoDuskMat.color.setHex(0xffffff);
    env.fireflyPoints.material.color.setHex(0xfef08a);
    if (env.iblDuskTex) scene.environment = env.iblDuskTex;
    else if (env.iblNightTex) scene.environment = env.iblNightTex;
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  env.skyTex.needsUpdate = true;
}

function update3DEnvironment(scene, env, f, seatAnchors) {
  const t = f.tSec;
  const p = f.p;
  const isVote = (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT");
  const moodKey = f.daylight ? (isVote ? "vote" : "day") : (f.night ? "night" : "twilight");
  const harmony = (state.match && typeof state.match.harmonyScore === "number") ? state.match.harmonyScore : 72;
  const isToxicHaze = Boolean(state.match && state.match.started && harmony <= 48);
  const isClearBreeze = Boolean(state.match && state.match.started && harmony >= 85);

  // Dynamically scale walnut round table, floor mandala & pavilion terrace to fit 6 / 8 / 10 / 12 seats with zero floating props!
  const activeSeatsN = typeof getActive3DSeatCount === "function" ? getActive3DSeatCount() : 8;
  const tLayout = typeof get3DTableLayout === "function"
    ? get3DTableLayout(activeSeatsN)
    : { tableScale: 1.06, ringRadius: 4.85, pavilionScale: 1.0 };
  if (!env.tableScaleCurrent) env.tableScaleCurrent = tLayout.tableScale;
  else env.tableScaleCurrent += (tLayout.tableScale - env.tableScaleCurrent) * 0.16;
  if (!env.pavilionScaleCurrent) env.pavilionScaleCurrent = tLayout.pavilionScale;
  else env.pavilionScaleCurrent += (tLayout.pavilionScale - env.pavilionScaleCurrent) * 0.16;
  const tsNow = env.tableScaleCurrent;
  const psNow = env.pavilionScaleCurrent;
  if (env.tableScaleGroup) env.tableScaleGroup.scale.set(tsNow, 1, tsNow);
  if (env.tableAO) env.tableAO.scale.set(tsNow, tsNow, 1);
  if (env.floorMandala) {
    const mSc = (tLayout.ringRadius / 4.65);
    env.floorMandala.scale.set(mSc, mSc, 1);
  }
  if (env.terraceMesh) env.terraceMesh.scale.set(psNow, 1, psNow);
  if (env.terraceTrim) env.terraceTrim.scale.set(psNow, psNow, 1);
  if (env.proceduralPavilionGroup) env.proceduralPavilionGroup.scale.set(psNow, 1, psNow);

  if (env.moodKey !== moodKey) {
    if (env.moodKey === "night" && moodKey === "day") {
      env.dawnSweep = 1.0;
      env.lotusSpinBoost = Math.max(env.lotusSpinBoost, 0.75);
    }
    env.moodKey = moodKey;
    apply3DMoodPalette(scene, env, moodKey);
  }

  if (env.skyPhotoDayMat && env.skyPhotoNightMat) {
    const useDuskNow = Boolean(env.hasPhotoDusk && (moodKey === "twilight" || moodKey === "vote"));
    const targetDayOp = (env.hasPhotoDay && f.daylight && !useDuskNow) ? (isVote ? 0.62 : 0.98) : 0.0;
    const targetDuskOp = useDuskNow ? (isVote ? 0.94 : 0.98) : 0.0;
    const targetNightOp = (env.hasPhotoNight && !f.daylight && !useDuskNow) ? 0.96 : 0.0;
    env.skyPhotoDayMat.opacity += (targetDayOp - env.skyPhotoDayMat.opacity) * 0.05;
    if (env.skyPhotoDuskMat) env.skyPhotoDuskMat.opacity += (targetDuskOp - env.skyPhotoDuskMat.opacity) * 0.05;
    env.skyPhotoNightMat.opacity += (targetNightOp - env.skyPhotoNightMat.opacity) * 0.05;
    env.skyPhotoDayMesh.rotation.y = t * 0.004;
    if (env.skyPhotoDuskMesh) env.skyPhotoDuskMesh.rotation.y = t * 0.0035;
    env.skyPhotoNightMesh.rotation.y = t * 0.003;
  }

  if (env.dawnSweep > 0.005) env.dawnSweep *= 0.965;
  else env.dawnSweep = 0;

  const lerpAmt = 0.05;
  const targetFogDens = (f.daylight ? 0.0040 : (f.night ? 0.0072 : 0.0056)) + (isToxicHaze ? 0.0035 : (isClearBreeze ? -0.0012 : 0));
  scene.fog.color.lerp(env.targetColors.fog, lerpAmt);
  scene.fog.density += (targetFogDens - scene.fog.density) * lerpAmt;

  const hazeDim = isToxicHaze ? 0.82 : (isClearBreeze ? 1.06 : 1.0);
  env.hemiLight.color.lerp(env.targetColors.hemiSky, lerpAmt);
  env.hemiLight.groundColor.lerp(env.targetColors.hemiGnd, lerpAmt);
  env.hemiLight.intensity += (((f.daylight ? (0.64 + env.dawnSweep * 0.18) : (f.night ? 0.42 : 0.54)) * hazeDim) - env.hemiLight.intensity) * lerpAmt;
  env.dirLight.color.lerp(env.targetColors.dir, lerpAmt);
  env.dirLight.intensity += (((f.daylight ? (0.95 + env.dawnSweep * 0.25) : (f.night ? 0.58 : 0.78)) * hazeDim) - env.dirLight.intensity) * lerpAmt;
  env.dirLight.position.x = 11 - env.dawnSweep * 9;
  if (env.rimLight) {
    env.rimLight.color.lerp(env.targetColors.rim, lerpAmt);
    env.rimLight.intensity += ((f.daylight ? 0.36 : (f.night ? 0.48 : 0.42)) - env.rimLight.intensity) * lerpAmt;
  }
  env.tableLight.color.lerp(env.targetColors.table, lerpAmt);
  env.tableLight.intensity = ((f.night ? 1.05 : 0.72) + env.dawnSweep * 0.22) * hazeDim + Math.sin(t * 5.2) * 0.08 + Math.sin(t * 11.7) * 0.03;

  // Pacific Ocean Shimmer Shader + Gentle Wave Ripples + Guishan Lighthouse Beacon
  if (env.oceanUniforms && env.oceanUniforms.uTime) {
    env.oceanUniforms.uTime.value = t;
  } else if (env.oceanBumpTex && env.oceanBumpTex.offset) {
    env.oceanBumpTex.offset.x = (t * 0.008) % 1;
    env.oceanBumpTex.offset.y = (t * 0.005) % 1;
  }
  if (env.guishanBeacon) {
    env.guishanBeacon.visible = !f.daylight;
    const pulseOn = Math.sin(t * 2.2) > -0.2;
    env.guishanBeacon.scale.setScalar(pulseOn ? 1.1 : 0.45);
  }

  env.sunMesh.position.y += ((f.daylight ? 17.5 : -12) - env.sunMesh.position.y) * 0.04;
  env.sunHalo.rotation.z = t * 0.25;
  env.sunHalo.scale.setScalar(1 + env.dawnSweep * 0.45);
  env.moonGroup.position.y += ((f.daylight ? -12 : 16.5) - env.moonGroup.position.y) * 0.04;
  env.starPoints.material.opacity += (((f.daylight ? 0.0 : (f.night ? 0.88 : 0.52))) - env.starPoints.material.opacity) * 0.05;
  env.starPoints.rotation.y = t * 0.008;
  if (env.lanyangLights) {
    const targetCity = f.daylight ? 0.05 : (f.night ? 0.90 : 0.58);
    env.lanyangLights.material.opacity += (targetCity - env.lanyangLights.material.opacity) * 0.05;
  }
  if (env.guishanMat) {
    env.guishanMat.color.setHex(f.daylight ? 0x2f5a67 : (f.night ? 0x151e38 : 0x233852));
  }

  // Interactive Lotus Core + Live 3-Petal Three-Goodness Awakening!
  env.lotusSpinBoost *= 0.94;
  const tg = (state.match && state.match.threeGood) || { heart: 0, words: 0, deeds: 0, resonanceTriggered: false };
  const litCount = (tg.heart > 0 ? 1 : 0) + (tg.words > 0 ? 1 : 0) + (tg.deeds > 0 ? 1 : 0);
  const pulse = 1 + Math.sin(t * 2.6) * 0.06 + env.lotusSpinBoost * 0.22 + litCount * 0.035;
  env.lotusGroup.position.y = 1.98 + Math.sin(t * 1.9) * 0.10 + env.lotusSpinBoost * 0.26;
  env.lotusGroup.rotation.y += 0.012 + (isVote ? 0.015 : 0) + env.lotusSpinBoost * 0.18 + (tg.resonanceTriggered ? 0.014 : 0);
  env.lotusCore.scale.setScalar(pulse);
  env.lotusCore.material.emissive.lerp(env.targetColors.lotus, lerpAmt);
  const dayLotusScale = f.daylight ? 0.34 : 1.0;
  env.lotusCore.material.emissiveIntensity = (tg.resonanceTriggered ? (1.05 + Math.sin(t * 4) * 0.16) : 0.68) * dayLotusScale;
  if (env.lotusCoreAuraMat) env.lotusCoreAuraMat.opacity = f.daylight ? 0.04 : 0.18;
  if (env.lotusOuterPetalMat) env.lotusOuterPetalMat.emissiveIntensity = f.daylight ? 0.06 : 0.24;
  env.lotusRing.rotation.z = -t * 0.95;
  if (env.lotusRingInner) env.lotusRingInner.rotation.z = t * 0.68;
  env.tableGlowRing.material.emissive.lerp(env.targetColors.lotus, lerpAmt);
  env.floorMandala.material.color.lerp(env.targetColors.lotus, lerpAmt);
  if (env.latticeScreenMat) {
    const targetLatEm = f.daylight ? 0.14 : (f.night ? 0.56 : 0.42);
    env.latticeScreenMat.emissiveIntensity += (targetLatEm - env.latticeScreenMat.emissiveIntensity) * 0.06;
  }

  if (env.threeGoodPetals) {
    const petalKeys = ["heart", "words", "deeds"];
    for (let pki = 0; pki < petalKeys.length; pki++) {
      const k = petalKeys[pki];
      const isLit = Boolean(tg[k] > 0);
      const list = env.threeGoodPetals[k] || [];
      const targetEm = (tg.resonanceTriggered ? (1.25 + Math.sin(t * 4.5) * 0.20) : (isLit ? 0.92 : 0.24)) * (f.daylight ? 0.38 : 1.0);
      const targetY = isLit ? -0.14 : -0.22;
      const targetTilt = isLit ? 0.52 : 0.36;
      const targetSc = isLit ? 1.12 : 0.96;
      for (let li = 0; li < list.length; li++) {
        const item = list[li];
        item.mat.emissiveIntensity += (targetEm - item.mat.emissiveIntensity) * 0.1;
        item.mesh.position.y += (targetY - item.mesh.position.y) * 0.1;
        item.mesh.rotation.x += (targetTilt - item.mesh.rotation.x) * 0.1;
        item.mesh.scale.setScalar(targetSc);
      }
    }
  }

  // Hanging Silk Lanterns (Halos + Tassel Secondary Sway), Incense Embers, Zero-GC Tea Steam & Clouds
  const lanternGlow = (f.daylight ? 0.52 : 1.48) * (isToxicHaze ? 0.58 : 1.0);
  env.lanternBodyMat.emissiveIntensity += (lanternGlow - env.lanternBodyMat.emissiveIntensity) * 0.05;
  if (env.lanternHaloMat) {
    const haloTarget = (f.daylight ? 0.08 : 0.25) * (isToxicHaze ? 0.55 : 1.0) + Math.sin(t * 3.6) * 0.025;
    env.lanternHaloMat.opacity += (haloTarget - env.lanternHaloMat.opacity) * 0.06;
  }
  const windBoost = isToxicHaze ? 1.55 : (isClearBreeze ? 1.25 : 1.0);
  for (let i = 0; i < env.lanterns.length; i++) {
    const L = env.lanterns[i];
    const swZ = Math.sin(t * 1.3 * windBoost + L.phase) * 0.075 * windBoost;
    const swX = Math.cos(t * 1.05 * windBoost + L.phase) * 0.045 * windBoost;
    L.orb.rotation.z = swZ;
    L.orb.rotation.x = swX;
    if (L.tassel) L.tassel.rotation.z = Math.sin(t * 1.3 * windBoost + L.phase - 0.55) * 0.12 * windBoost;
  }
  if (env.pineTrees && env.pineTrees.length) {
    for (let pi = 0; pi < env.pineTrees.length; pi++) {
      const pt = env.pineTrees[pi];
      if (pt.canopy) {
        pt.canopy.rotation.z = Math.sin(t * 0.95 * windBoost + pt.phase) * 0.032 * windBoost;
        pt.canopy.rotation.x = Math.cos(t * 0.72 * windBoost + pt.phase) * 0.020 * windBoost;
      }
    }
  }
  if (env.incenseEmberMat) {
    env.incenseEmberMat.emissiveIntensity = 0.85 + Math.sin(t * 3.4) * 0.25;
  }
  if (env.teaSteamPoints && env.teaSteamPoints.visible && env.teaSteamMeta && env.teaSteamMeta.length > 0) {
    const sPosAttr = env.teaSteamPoints.geometry.attributes.position;
    const breezeBias = isClearBreeze ? 1.35 : 1.0;
    for (let si = 0; si < env.teaSteamMeta.length; si++) {
      const sm = env.teaSteamMeta[si];
      const prog = ((t * sm.speed * breezeBias + sm.phase / (Math.PI * 2)) % 1 + 1) % 1;
      const sx = sm.baseX + Math.sin(t * 1.45 + sm.phase + prog * 4.2) * sm.drift * (0.35 + prog * 0.9);
      const sy = sm.baseY + prog * sm.maxRise;
      const sz = sm.baseZ + Math.cos(t * 1.2 + sm.phase + prog * 3.6) * sm.drift * (0.35 + prog * 0.9);
      sPosAttr.setXYZ(si, sx, sy, sz);
    }
    sPosAttr.needsUpdate = true;
  }
  if (env.stoneLanternCores) {
    const stoneTarget = f.daylight ? 0.22 : (1.15 + Math.sin(t * 4.2) * 0.10);
    for (let si = 0; si < env.stoneLanternCores.length; si++) {
      const cMat = env.stoneLanternCores[si];
      cMat.emissiveIntensity += (stoneTarget - cMat.emissiveIntensity) * 0.08;
    }
  }

  if (env.cloudPlanes && env.cloudPlanes.length > 0) {
    const cloudTargetOp = (f.daylight ? 0.18 : (f.night ? 0.12 : 0.16)) + (isToxicHaze ? 0.08 : (isClearBreeze ? -0.03 : 0));
    for (let ci = 0; ci < env.cloudPlanes.length; ci++) {
      const cl = env.cloudPlanes[ci];
      const ang = cl.ang + t * cl.speed;
      cl.mesh.position.set(
        Math.cos(ang) * cl.rad,
        cl.y + Math.sin(t * 0.45 + cl.phase) * 0.18,
        Math.sin(ang) * cl.rad
      );
      cl.mesh.lookAt(0, cl.y + 1.8, 0);
      cl.mat.color.lerp(env.targetColors.cloud, lerpAmt);
      cl.mat.opacity += (cloudTargetOp - cl.mat.opacity) * 0.05;
    }
  }

  if (env.mistRing) {
    env.mistRing.rotation.y = t * (isToxicHaze ? 0.048 : 0.025);
    const mistTargetOp = (f.night ? 0.09 : 0.05) + (isToxicHaze ? 0.10 : (isClearBreeze ? -0.02 : 0));
    env.mistRing.material.opacity += (mistTargetOp - env.mistRing.material.opacity) * 0.05;
  }
  if (env.resonancePillar) {
    const targetOp = tg.resonanceTriggered ? (0.16 + Math.sin(t * 3.5) * 0.05) : 0.0;
    env.resonancePillar.material.opacity += (targetOp - env.resonancePillar.material.opacity) * 0.08;
    env.resonancePillar.rotation.y = -t * 0.5;
  }

  // Volumetric God Rays + Drifting Liyue Bamboo Leaves & Osmanthus Petals (Three-Goodness Weather Reactive!)
  if (env.godRays && env.godRays.length && (!env.godRaysGroup || env.godRaysGroup.visible)) {
    const isFpCam = Boolean(typeof stage3d !== "undefined" && stage3d.camPreset === "firstperson");
    const rayMoodMul = (f.night || isFpCam) ? 0.0 : (isVote ? 0.92 : (f.daylight ? 1.0 : 0.72));
    const breezeRayMul = isClearBreeze ? 1.42 : (isToxicHaze ? 0.35 : 1.0);
    for (let ri = 0; ri < env.godRays.length; ri++) {
      const gr = env.godRays[ri];
      const targetOp = gr.baseOp * rayMoodMul * breezeRayMul * (0.85 + Math.sin(t * 0.7 + gr.phase) * 0.15);
      gr.mat.opacity += (targetOp - gr.mat.opacity) * 0.06;
      gr.mesh.visible = gr.mat.opacity > 0.005;
      gr.mesh.material.color.setHex(isVote ? 0xfdba74 : (isClearBreeze ? 0xfff3b0 : (f.daylight ? 0xfff7d6 : 0xffdf9e)));
    }
  }
  if (env.petals && env.petals.length && (!env.petalGroup || env.petalGroup.visible)) {
    const pSpeedMul = isToxicHaze ? 1.75 : (isClearBreeze ? 1.45 : 1.0);
    for (let pi = 0; pi < env.petals.length; pi++) {
      const pt = env.petals[pi];
      const fall = (t * pt.speed * pSpeedMul + pt.phase) % 6.2;
      const py = 6.8 - fall;
      const px = pt.x0 + Math.sin(t * 0.9 * pSpeedMul + pt.phase) * 1.15 + fall * (isToxicHaze ? 0.62 : 0.35);
      const pz = pt.z0 + Math.cos(t * 0.8 + pt.phase) * 0.95;
      pt.mesh.position.set(px, py < 0.25 ? 6.8 : py, pz);
      pt.mesh.rotation.set(t * 1.4 * pSpeedMul + pt.phase, t * 0.9 + pt.phase, Math.sin(t * 2.1 + pt.phase) * 0.7);
    }
  }

  // Drifting fireflies / golden dawn petals
  if (env.fireflyPoints && env.fireflyPoints.visible) {
    const posAttr = env.fireflyPoints.geometry.attributes.position;
    const speedMul = 1 + env.dawnSweep * 2.2 + (isClearBreeze ? 0.45 : 0);
    for (let fi = 0; fi < env.fireflyMeta.length; fi++) {
      const fm = env.fireflyMeta[fi];
      const ang = fm.ang + t * fm.speed * 0.22 * speedMul;
      let y = (fm.y + t * fm.speed * 0.35 * speedMul) % 5.6;
      if (y < 0.4) y += 0.4;
      posAttr.setXYZ(fi, Math.cos(ang) * fm.rad, y + Math.sin(t * 2 + fm.phase) * 0.14, Math.sin(ang) * fm.rad);
    }
    posAttr.needsUpdate = true;
  }

  // Volumetric Spotlight tracking Active Speaker / Target
  let spotAnchor = null;
  let spotColorHex = 0xfde047;
  if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH") && state.activeSpeakerId) {
    spotAnchor = seatAnchors[state.activeSpeakerId] || null;
    spotColorHex = 0xfde047;
  } else if (f.night && state.selectedSeatId) {
    spotAnchor = seatAnchors[state.selectedSeatId] || null;
    spotColorHex = 0xc4b5fd;
  } else if (p === "DAY_VOTE" && state.selectedSeatId) {
    spotAnchor = seatAnchors[state.selectedSeatId] || null;
    spotColorHex = 0xfb7185;
  }

  if (spotAnchor) {
    env.currentSpotPos.lerp(spotAnchor.worldPos, 0.14);
    env.spotTarget.position.set(env.currentSpotPos.x, 1.3, env.currentSpotPos.z);
    env.speakerSpot.position.set(env.currentSpotPos.x * 0.35, 11.2, env.currentSpotPos.z * 0.35);
    env.speakerSpot.color.setHex(spotColorHex);
    env.speakerSpot.intensity += (2.5 - env.speakerSpot.intensity) * 0.12;

    env.spotCone.position.set(env.currentSpotPos.x, 9.6, env.currentSpotPos.z);
    env.spotCone.material.color.setHex(spotColorHex);
    env.spotCone.material.opacity += ((f.daylight ? 0.045 : 0.18) - env.spotCone.material.opacity) * 0.12;
  } else {
    env.speakerSpot.intensity += (0 - env.speakerSpot.intensity) * 0.1;
    env.spotCone.material.opacity += (0 - env.spotCone.material.opacity) * 0.1;
  }
}
