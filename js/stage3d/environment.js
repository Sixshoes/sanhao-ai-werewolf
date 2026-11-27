/**
 * 3D 電影級山海實景古亭與茶席場景引擎（Three.js r128）
 * 升級包含：
 * - 連續多稜線地形山巒＋反光太平洋海面＋動態雲海山島燈塔＋分層流動雲海
 * - 紅瓦白牆望海古亭（八柱花崗岩柱礎＋後側飛簷翹角屋瓦＋木格欄杆＋四座庭院石燈籠＋山城五葉松）
 * - 胡桃木茶桌搭配手工紫砂茶壺組＋雙層三好蓮花琉璃核心＋柔和散景微粒光暈＋三點電影冷暖補光
 */
"use strict";

function get3DTableLayout(seatCount) {
  const n = seatCount || 8;
  if (n >= 12) {
    return { n: 12, tableScale: 1.40, tableR: 4.55, ringRadius: 5.52, propZ: 1.66, pavilionScale: 1.15, heroMul: 1.38, camExtraR: 1.55 };
  }
  if (n >= 10) {
    return { n: 10, tableScale: 1.24, tableR: 4.03, ringRadius: 4.98, propZ: 1.64, pavilionScale: 1.08, heroMul: 1.22, camExtraR: 0.65 };
  }
  if (n >= 8) {
    return { n: 8, tableScale: 1.08, tableR: 3.51, ringRadius: 4.44, propZ: 1.62, pavilionScale: 1.0, heroMul: 1.00, camExtraR: -0.35 };
  }
  return { n: 6, tableScale: 1.00, tableR: 3.25, ringRadius: 4.18, propZ: 1.62, pavilionScale: 1.0, heroMul: 0.96, camExtraR: -0.45 };
}

function getActive3DSeatCount() {
  try {
    if (typeof state !== "undefined" && state.match && state.match.started && state.match.totalSeats) {
      return state.match.totalSeats;
    }
    if (typeof stage3d !== "undefined" && stage3d.showcaseMode) {
      return 12;
    }
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      if (typeof getLobbySeatCount === "function") return getLobbySeatCount();
      const sel = document.getElementById("selectModeCount");
      if (sel) return parseInt(sel.value, 10) || 8;
    }
  } catch (e) { }
  return 8;
}

function apply3DEnvironmentIBL(scene, env) {
  if (!scene || !env) return;
  const mood = env.moodKey || "twilight";
  const isCel = env.sceneThemeKey === "celestial";
  let tex = null;
  if (mood === "day") {
    tex = (isCel && env.iblCelestialTex) ? env.iblCelestialTex : (env.iblDayTex || env.iblDefaultTex);
  } else if (mood === "vote") {
    tex = env.iblDuskTex || env.iblDayTex || env.iblDefaultTex;
  } else if (mood === "night") {
    tex = env.iblNightTex || env.iblDefaultTex;
  } else {
    // twilight / lobby
    tex = (isCel && env.iblCelestialTex) ? env.iblCelestialTex : (env.iblDuskTex || env.iblNightTex || env.iblDefaultTex);
  }
  if (tex) scene.environment = tex;
}

function buildInstancedOrGroup(geo, mat, specs, opts) {
  if (!specs || specs.length === 0) return null;
  const canInstance = typeof THREE.InstancedMesh === "function" && typeof THREE.Matrix4 === "function" && specs.length > 1;
  if (canInstance) {
    const im = new THREE.InstancedMesh(geo, mat, specs.length);
    im.frustumCulled = false;
    if (opts && opts.castShadow) im.castShadow = true;
    if (opts && opts.receiveShadow) im.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const localM = new THREE.Matrix4();
    const finalM = new THREE.Matrix4();
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      dummy.position.set(sp.px || 0, sp.py || 0, sp.pz || 0);
      dummy.rotation.set(sp.rx || 0, sp.ry || 0, sp.rz || 0);
      dummy.scale.set(sp.sx === undefined ? 1 : sp.sx, sp.sy === undefined ? 1 : sp.sy, sp.sz === undefined ? 1 : sp.sz);
      dummy.updateMatrix();
      if (sp.parentMat) {
        localM.copy(dummy.matrix);
        finalM.multiplyMatrices(sp.parentMat, localM);
        im.setMatrixAt(i, finalM);
      } else {
        im.setMatrixAt(i, dummy.matrix);
      }
    }
    if (im.instanceMatrix) im.instanceMatrix.needsUpdate = true;
    return im;
  }
  const grp = new THREE.Group();
  for (let i = 0; i < specs.length; i++) {
    const sp = specs[i];
    const m = new THREE.Mesh(geo, mat);
    m.position.set(sp.px || 0, sp.py || 0, sp.pz || 0);
    m.rotation.set(sp.rx || 0, sp.ry || 0, sp.rz || 0);
    m.scale.set(sp.sx === undefined ? 1 : sp.sx, sp.sy === undefined ? 1 : sp.sy, sp.sz === undefined ? 1 : sp.sz);
    if (opts && opts.castShadow) m.castShadow = true;
    if (opts && opts.receiveShadow) m.receiveShadow = true;
    if (sp.parentGrp) {
      sp.parentGrp.add(m);
    } else {
      grp.add(m);
    }
  }
  return grp.children.length > 0 ? grp : null;
}

function mergeStaticBufferGeos(items, disposeSrc) {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (
    typeof THREE === "undefined" ||
    typeof THREE.BufferGeometry !== "function" ||
    typeof THREE.BufferAttribute !== "function" ||
    typeof THREE.Matrix4 !== "function" ||
    typeof THREE.Object3D !== "function"
  ) {
    return null;
  }
  const baked = [];
  const dummy = new THREE.Object3D();
  let totalVerts = 0;
  let allHaveNormal = true;
  let allHaveUv = true;
  let failed = false;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const raw = it && it.geo;
    if (!raw || typeof raw.clone !== "function" || !raw.attributes || !raw.attributes.position || !raw.attributes.position.array) {
      failed = true;
      break;
    }
    const g = (raw.index && typeof raw.toNonIndexed === "function") ? raw.toNonIndexed() : raw.clone();
    if (!g || !g.attributes || !g.attributes.position || !g.attributes.position.array || typeof g.applyMatrix4 !== "function") {
      if (g && typeof g.dispose === "function") g.dispose();
      failed = true;
      break;
    }
    dummy.position.set(it.px || 0, it.py || 0, it.pz || 0);
    dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    dummy.scale.set(it.sx === undefined ? 1 : it.sx, it.sy === undefined ? 1 : it.sy, it.sz === undefined ? 1 : it.sz);
    dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    const count = g.attributes.position.count || 0;
    if (count <= 0) {
      if (typeof g.dispose === "function") g.dispose();
      continue;
    }
    if (!g.attributes.normal || !g.attributes.normal.array) allHaveNormal = false;
    if (!g.attributes.uv || !g.attributes.uv.array) allHaveUv = false;
    totalVerts += count;
    baked.push(g);
  }
  if (failed || totalVerts <= 0 || baked.length === 0) {
    for (let i = 0; i < baked.length; i++) {
      if (baked[i] && typeof baked[i].dispose === "function") baked[i].dispose();
    }
    return null;
  }
  const posOut = new Float32Array(totalVerts * 3);
  const normOut = allHaveNormal ? new Float32Array(totalVerts * 3) : null;
  const uvOut = allHaveUv ? new Float32Array(totalVerts * 2) : null;
  let vOff = 0;
  for (let i = 0; i < baked.length; i++) {
    const g = baked[i];
    const cnt = g.attributes.position.count;
    const pArr = g.attributes.position.array;
    posOut.set(pArr.subarray ? pArr.subarray(0, cnt * 3) : pArr, vOff * 3);
    if (normOut) {
      const nArr = g.attributes.normal.array;
      normOut.set(nArr.subarray ? nArr.subarray(0, cnt * 3) : nArr, vOff * 3);
    }
    if (uvOut) {
      const uArr = g.attributes.uv.array;
      uvOut.set(uArr.subarray ? uArr.subarray(0, cnt * 2) : uArr, vOff * 2);
    }
    vOff += cnt;
    if (typeof g.dispose === "function") g.dispose();
  }
  if (disposeSrc) {
    const seenSrc = new Set();
    for (let i = 0; i < items.length; i++) {
      const sg = items[i] && items[i].geo;
      if (sg && !seenSrc.has(sg) && typeof sg.dispose === "function") {
        seenSrc.add(sg);
        sg.dispose();
      }
    }
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(posOut, 3));
  if (normOut) merged.setAttribute("normal", new THREE.BufferAttribute(normOut, 3));
  if (uvOut) merged.setAttribute("uv", new THREE.BufferAttribute(uvOut, 2));
  return merged;
}

function build3DEnvironmentMap(renderer, scene, env) {
  if (!renderer || typeof THREE.PMREMGenerator !== "function") return;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    env.pmrem = pmrem;

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x162038);
    const domeGeo = new THREE.SphereGeometry(18, 16, 12);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x263455, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(domeGeo, domeMat));
    const warmRingGeo = new THREE.TorusGeometry(6, 0.85, 8, 24);
    const warmRingMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
    const warmRing = new THREE.Mesh(warmRingGeo, warmRingMat);
    warmRing.rotation.x = Math.PI * 0.5;
    warmRing.position.y = 5.5;
    envScene.add(warmRing);
    const sunPatchGeo = new THREE.SphereGeometry(2.6, 12, 10);
    const sunPatchMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
    const sunPatch = new THREE.Mesh(sunPatchGeo, sunPatchMat);
    sunPatch.position.set(8, 8, -9);
    envScene.add(sunPatch);
    const coolPatchGeo = new THREE.SphereGeometry(3.2, 12, 10);
    const coolPatchMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const coolPatch = new THREE.Mesh(coolPatchGeo, coolPatchMat);
    coolPatch.position.set(-9, 6, 7);
    envScene.add(coolPatch);

    const procRT = pmrem.fromScene(envScene, 0.04);
    env.iblDefaultTex = procRT.texture;
    scene.environment = procRT.texture;

    // Immediately release temporary procedural IBL baking geometries & materials
    [domeGeo, warmRingGeo, sunPatchGeo, coolPatchGeo, domeMat, warmRingMat, sunPatchMat, coolPatchMat].forEach(function (res) {
      try { if (res && typeof res.dispose === "function") res.dispose(); } catch (e) { }
    });

    let pmremDisposed = false;
    const disposePmrem = function () {
      if (pmremDisposed) return;
      pmremDisposed = true;
      try { if (typeof pmrem.dispose === "function") pmrem.dispose(); } catch (e) { }
      if (env.pmrem === pmrem) env.pmrem = null;
    };

    const isFileProto = typeof window !== "undefined" && window.location && window.location.protocol === "file:";
    if (!isFileProto && typeof THREE.TextureLoader === "function") {
      const loader = new THREE.TextureLoader();
      const isIgpuSky = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
      const startCelestial = Boolean(typeof state !== "undefined" && state.sceneTheme === "celestial");
      let pendingSkyCount = 4;
      let bootReported = false;
      const reportBootSkyReady = function () {
        if (bootReported) return;
        bootReported = true;
        if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
          bootPreloader.reportBucket("sky", 4, 4);
        }
      };
      const onSkySettled = function (isPrimary) {
        pendingSkyCount -= 1;
        if (isPrimary || pendingSkyCount <= 0) reportBootSkyReady();
        if (pendingSkyCount <= 0) disposePmrem();
      };
      const scheduleIdleBake = function (fn, delayMs) {
        if (typeof setTimeout === "function") {
          setTimeout(function () {
            if (typeof requestIdleCallback === "function") {
              requestIdleCallback(function () { fn(); }, { timeout: 600 });
            } else {
              fn();
            }
          }, delayMs);
        } else {
          fn();
        }
      };
      const skyJobs = [
        {
          key: "dusk",
          url: "assets/sky/sanctuary_dusk.jpg?v=12",
          isPrimary: !startCelestial,
          apply: function (tex, bakeIbl) {
            if (env.skyPhotoDuskMat) {
              env.skyPhotoDuskMat.map = tex;
              env.skyPhotoDuskMat.needsUpdate = true;
            }
            env.hasPhotoDusk = true;
            if (bakeIbl && !pmremDisposed) {
              try {
                env.iblDuskTex = pmrem.fromEquirectangular(tex).texture;
                apply3DEnvironmentIBL(scene, env);
              } catch (e) { }
            }
          }
        },
        {
          key: "celestial",
          url: "assets/sky/sanctuary_celestial_day.jpg?v=12",
          isPrimary: startCelestial,
          apply: function (tex, bakeIbl) {
            if (env.skyPhotoCelestialMat) {
              env.skyPhotoCelestialMat.map = tex;
              env.skyPhotoCelestialMat.needsUpdate = true;
            }
            env.hasPhotoCelestial = true;
            if (bakeIbl && !pmremDisposed) {
              try {
                env.iblCelestialTex = pmrem.fromEquirectangular(tex).texture;
                apply3DEnvironmentIBL(scene, env);
              } catch (e) { }
            }
          }
        },
        {
          key: "day",
          url: "assets/sky/sanctuary_day.jpg?v=12",
          isPrimary: false,
          apply: function (tex, bakeIbl) {
            env.skyPhotoDayMat.map = tex;
            env.skyPhotoDayMat.needsUpdate = true;
            env.hasPhotoDay = true;
            if (bakeIbl && !pmremDisposed) {
              try {
                env.iblDayTex = pmrem.fromEquirectangular(tex).texture;
                apply3DEnvironmentIBL(scene, env);
              } catch (e) { }
            }
          }
        },
        {
          key: "night",
          url: "assets/sky/sanctuary_night.jpg?v=12",
          isPrimary: false,
          apply: function (tex, bakeIbl) {
            env.skyPhotoNightMat.map = tex;
            env.skyPhotoNightMat.needsUpdate = true;
            env.hasPhotoNight = true;
            if (bakeIbl && !pmremDisposed) {
              try {
                env.iblNightTex = pmrem.fromEquirectangular(tex).texture;
                apply3DEnvironmentIBL(scene, env);
              } catch (e) { }
            }
          }
        }
      ];
      // Load ONLY the initially visible skybox immediately; stagger the other 3 sequentially after boot so 4x PMREM bakes never freeze startup!
      const primaryJob = skyJobs.find(function (j) { return j.isPrimary; }) || skyJobs[0];
      const deferredJobs = skyJobs.filter(function (j) { return j !== primaryJob; });
      const runSkyJob = function (job, nextCb) {
        loader.load(job.url, function (tex) {
          tex.encoding = THREE.sRGBEncoding;
          tex.mapping = THREE.EquirectangularReflectionMapping;
          // On integrated GPUs, bake PMREM only for primary sky to eliminate 3x multi-second cubemap convolution stalls
          const wantBake = !isIgpuSky || job.isPrimary;
          if (job.isPrimary) {
            // Paint dome & unblock boot preloader immediately; yield PMREM bake off the hot startup frame
            job.apply(tex, false);
            reportBootSkyReady();
            scheduleIdleBake(function () {
              if (wantBake && !pmremDisposed) job.apply(tex, true);
              onSkySettled(true);
              if (nextCb) nextCb();
            }, isIgpuSky ? 180 : 40);
          } else {
            job.apply(tex, wantBake);
            onSkySettled(false);
            if (nextCb) nextCb();
          }
        }, undefined, function () {
          onSkySettled(job.isPrimary);
          if (nextCb) nextCb();
        });
      };
      const pumpDeferredSkies = function (idx) {
        if (idx >= deferredJobs.length) return;
        scheduleIdleBake(function () {
          runSkyJob(deferredJobs[idx], function () {
            pumpDeferredSkies(idx + 1);
          });
        }, isIgpuSky ? 750 : 320);
      };
      runSkyJob(primaryJob, function () {
        pumpDeferredSkies(0);
      });
    } else {
      disposePmrem();
      if (typeof bootPreloader !== "undefined" && typeof bootPreloader.reportBucket === "function") {
        bootPreloader.reportBucket("sky", 4, 4);
      }
    }
  } catch (e) { }
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
  env.skyPhotoNightMesh = new THREE.Mesh(new THREE.SphereGeometry(62.5, 36, 24), env.skyPhotoNightMat);
  env.skyPhotoNightMesh.position.y = -1.8;
  scene.add(env.skyPhotoNightMesh);

  env.skyPhotoDuskMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoDuskMesh = new THREE.Mesh(new THREE.SphereGeometry(61.5, 36, 24), env.skyPhotoDuskMat);
  env.skyPhotoDuskMesh.position.y = -1.8;
  scene.add(env.skyPhotoDuskMesh);

  env.skyPhotoDayMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoDayMesh = new THREE.Mesh(new THREE.SphereGeometry(60.5, 36, 24), env.skyPhotoDayMat);
  env.skyPhotoDayMesh.position.y = -1.8;
  scene.add(env.skyPhotoDayMesh);

  env.skyPhotoCelestialMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.BackSide, fog: false, depthWrite: false
  });
  env.skyPhotoCelestialMesh = new THREE.Mesh(new THREE.SphereGeometry(59.6, 36, 24), env.skyPhotoCelestialMat);
  env.skyPhotoCelestialMesh.position.y = -1.6;
  scene.add(env.skyPhotoCelestialMesh);

  scene.fog = new THREE.FogExp2(0x0b1024, 0.015);

  // 2. Cinema Four-Point Lighting Rig (Hemisphere + Soft 2048 Key + Horizon Rim + Candlelight)
  env.hemiLight = new THREE.HemisphereLight(0x8fa8ff, 0x2b1b12, 0.92);
  scene.add(env.hemiLight);

  const isIgpuEnv = Boolean(typeof stage3d !== "undefined" && stage3d.isIntegratedGpu);
  const isWinAngleEnv = Boolean(typeof stage3d !== "undefined" && stage3d.isWindowsAngle);
  const shadowRes = isIgpuEnv ? 768 : (isWinAngleEnv ? 1024 : 1536);
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

  const coneTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createGodRayTexture === "function")
    ? stage3dTextures.createGodRayTexture()
    : null;
  const coneGeo = new THREE.ConeGeometry(1.7, 9.6, 24, 1, true);
  coneGeo.translate(0, -4.8, 0);
  env.spotCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      map: coneTex,
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

  // 3. Celestial Bodies (Soft Painterly Radial-Glow Sun & Moon + Soft Bokeh Starfield)
  const celGlowTex = typeof stage3dTextures.createCelestialSunGlowTexture === "function"
    ? stage3dTextures.createCelestialSunGlowTexture()
    : bokehTex;
  const sunGroup = new THREE.Group();
  sunGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff8dc, transparent: true, opacity: 0.92, fog: false })
  ));
  const sunHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 11.5),
    new THREE.MeshBasicMaterial({
      map: celGlowTex,
      color: 0xffe4a0,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  sunGroup.add(sunHalo);
  sunGroup.position.set(17, 17, -28);
  sunGroup.lookAt(0, 2, 0);
  scene.add(sunGroup);
  env.sunMesh = sunGroup;
  env.sunHalo = sunHalo;

  const moonGroup = new THREE.Group();
  moonGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xf0f4ff, transparent: true, opacity: 0.94, fog: false })
  ));
  const moonHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 9.6),
    new THREE.MeshBasicMaterial({
      map: celGlowTex,
      color: 0xbecbff,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  moonGroup.add(moonHalo);
  moonGroup.position.set(-16, 16.5, -28);
  moonGroup.lookAt(0, 2, 0);
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

function createSculptedMountainRing(innerR, outerR, maxHeight, mat, seedShift, baseY) {
  const angSeg = 84;
  const radSeg = 9;
  const yFloor = typeof baseY === "number" ? baseY : -3.8;
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
      // Carve wide coastal valley facing the distant Cloud Isle, Cloud Sea & Pacific Ocean around -1.18 rad (NNE)
      const seaDelta = Math.atan2(Math.sin(ang + 1.18), Math.cos(ang + 1.18));
      const seaNotch = 1.0 - 0.90 * Math.exp(-(seaDelta * seaDelta) / 0.56);

      const ridge =
        0.52 +
        0.28 * Math.sin(ang * 3 + seedShift) +
        0.16 * Math.cos(ang * 7 - seedShift * 1.4) +
        0.10 * Math.sin(ang * 13 + rt * 4.5);
      const y = yFloor + Math.max(0.06, ridge) * radProfile * seaNotch * maxHeight;
      verts.push(Math.cos(ang) * rad, y, Math.sin(ang) * rad);

      // Qinglü Shan-Shui Height Vertex Coloring (deep indigo valley -> celadon mid-slope -> luminous mist peak!)
      const hNorm = clamp((y - yFloor) / Math.max(1, maxHeight * 0.85), 0, 1);
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

function buildMountainPineTree(x, y, z, scaleMul, woodTex, sharedMats) {
  const g = new THREE.Group();
  let trunkMat, deepLeafMat, fanMatShade, fanMatSun, needleTex;
  if (sharedMats && sharedMats.trunkMat) {
    trunkMat = sharedMats.trunkMat;
    deepLeafMat = sharedMats.deepLeafMat;
    fanMatShade = sharedMats.fanMatShade;
    fanMatSun = sharedMats.fanMatSun;
    needleTex = sharedMats.needleTex;
  } else {
    trunkMat = new THREE.MeshStandardMaterial({
      map: woodTex ? woodTex.map : null,
      bumpMap: woodTex ? woodTex.bump : null,
      bumpScale: 0.085,
      color: 0x332116,
      roughness: 0.94,
      metalness: 0.02
    });
    deepLeafMat = new THREE.MeshStandardMaterial({ color: 0x183528, roughness: 0.90, metalness: 0.02 });
    needleTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createPineNeedleTexture === "function")
      ? stage3dTextures.createPineNeedleTexture()
      : null;
    fanMatShade = needleTex
      ? new THREE.MeshStandardMaterial({
        map: needleTex,
        color: 0x3e6e54,
        alphaTest: 0.26,
        transparent: true,
        roughness: 0.86,
        side: THREE.DoubleSide
      })
      : deepLeafMat;
    fanMatSun = needleTex
      ? new THREE.MeshStandardMaterial({
        map: needleTex,
        color: 0x6ea67c,
        alphaTest: 0.26,
        transparent: true,
        roughness: 0.80,
        side: THREE.DoubleSide
      })
      : deepLeafMat;
    if (sharedMats) {
      sharedMats.trunkMat = trunkMat;
      sharedMats.deepLeafMat = deepLeafMat;
      sharedMats.fanMatShade = fanMatShade;
      sharedMats.fanMatSun = fanMatSun;
      sharedMats.needleTex = needleTex;
    }
  }

  // Tapered gnarled Taiwanese black-pine trunk + sweeping lateral limbs merged into 1 single draw call!
  const segs = [
    { x0: 0, y0: 0, z0: 0, x1: 0.26, y1: 1.55, z1: 0.11, rBot: 0.25, rTop: 0.19 },
    { x0: 0.26, y0: 1.50, z0: 0.11, x1: 0.16, y1: 3.15, z1: 0.04, rBot: 0.19, rTop: 0.135 },
    { x0: 0.16, y0: 3.10, z0: 0.04, x1: -0.18, y1: 4.65, z1: -0.10, rBot: 0.135, rTop: 0.075 }
  ];
  const trunkParts = [];
  segs.forEach(function (s) {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, dz = s.z1 - s.z0;
    const len = Math.hypot(dx, dy, dz);
    trunkParts.push({
      geo: new THREE.CylinderGeometry(s.rTop, s.rBot, len, 9),
      px: (s.x0 + s.x1) * 0.5,
      py: (s.y0 + s.y1) * 0.5,
      pz: (s.z0 + s.z1) * 0.5,
      rx: Math.atan2(dz, dy),
      rz: -Math.atan2(dx, dy)
    });
  });
  if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
    [
      { pts: [new THREE.Vector3(0.22, 2.38, 0.09), new THREE.Vector3(0.86, 2.74, 0.30), new THREE.Vector3(1.38, 2.92, 0.44)], r: 0.068 },
      { pts: [new THREE.Vector3(0.14, 3.25, 0.04), new THREE.Vector3(-0.56, 3.55, -0.24), new THREE.Vector3(-1.12, 3.72, -0.38)], r: 0.060 },
      { pts: [new THREE.Vector3(-0.04, 3.92, -0.02), new THREE.Vector3(0.42, 4.22, -0.24), new THREE.Vector3(0.84, 4.34, -0.34)], r: 0.048 }
    ].forEach(function (br) {
      const bCurve = new THREE.QuadraticBezierCurve3(br.pts[0], br.pts[1], br.pts[2]);
      trunkParts.push({ geo: new THREE.TubeGeometry(bCurve, 7, br.r, 6, false) });
    });
  }
  const mergedTrunkGeo = (sharedMats && sharedMats.mergedTrunkGeo) || mergeStaticBufferGeos(trunkParts, true);
  if (mergedTrunkGeo) {
    if (sharedMats && !sharedMats.mergedTrunkGeo) sharedMats.mergedTrunkGeo = mergedTrunkGeo;
    g.add(new THREE.Mesh(mergedTrunkGeo, trunkMat));
  } else {
    trunkParts.forEach(function (tp) {
      const m = new THREE.Mesh(tp.geo, trunkMat);
      m.position.set(tp.px || 0, tp.py || 0, tp.pz || 0);
      m.rotation.set(tp.rx || 0, tp.ry || 0, tp.rz || 0);
      g.add(m);
    });
  }

  const canopy = new THREE.Group();
  const coreGeo = (sharedMats && sharedMats.coreGeo) || new THREE.ConeGeometry(0.46, 0.24, 7);
  const fanGeo = (sharedMats && sharedMats.fanGeo) || new THREE.PlaneGeometry(1.92, 1.32);
  if (sharedMats) {
    sharedMats.coreGeo = coreGeo;
    sharedMats.fanGeo = fanGeo;
  }
  const coreSpecs = [];
  const shadeFanSpecs = [];
  const sunFanSpecs = [];
  [
    [1.26, 2.96, 0.40, 1.24],
    [-1.02, 3.76, -0.36, 1.20],
    [0.78, 4.38, -0.32, 1.08],
    [-0.18, 4.72, -0.06, 1.38],
    [-0.22, 4.18, 0.58, 1.00]
  ].forEach(function (c, ti) {
    coreSpecs.push({
      px: c[0], py: c[1] + 0.02, pz: c[2],
      ry: ti * 0.95,
      sx: 1.22 * c[3], sy: 0.72 * c[3], sz: 1.04 * c[3]
    });
    if (needleTex) {
      for (let fi = 0; fi < 6; fi++) {
        const fa = (fi / 6) * Math.PI * 2 + ti * 0.65;
        const scF = c[3] * 0.90;
        shadeFanSpecs.push({
          px: c[0] + Math.cos(fa) * c[3] * 0.48,
          py: c[1] - 0.04 + (fi % 2) * 0.06,
          pz: c[2] + Math.sin(fa) * c[3] * 0.48,
          rx: -0.68, ry: fa, rz: 0.14 * (fi % 2 ? 1 : -1),
          sx: scF, sy: scF, sz: scF
        });
      }
      for (let ui = 0; ui < 5; ui++) {
        const ua = (ui / 5) * Math.PI * 2 + ti * 0.9 + 0.35;
        const scU = c[3] * 0.76;
        sunFanSpecs.push({
          px: c[0] + Math.cos(ua) * c[3] * 0.28,
          py: c[1] + 0.12 + (ui % 2) * 0.06,
          pz: c[2] + Math.sin(ua) * c[3] * 0.28,
          rx: -0.46, ry: ua, rz: -0.10 * (ui % 2 ? 1 : -1),
          sx: scU, sy: scU, sz: scU
        });
      }
    }
  });
  const coreBatch = buildInstancedOrGroup(coreGeo, deepLeafMat, coreSpecs);
  if (coreBatch) canopy.add(coreBatch);
  const shadeFanBatch = buildInstancedOrGroup(fanGeo, fanMatShade, shadeFanSpecs);
  if (shadeFanBatch) canopy.add(shadeFanBatch);
  const sunFanBatch = buildInstancedOrGroup(fanGeo, fanMatSun, sunFanSpecs);
  if (sunFanBatch) canopy.add(sunFanBatch);
  g.add(canopy);
  g.userData = { canopy: canopy };

  g.position.set(x, y, z);
  g.scale.setScalar(scaleMul || 1);
  return g;
}

function buildCourtyardStoneLanternsInstanced(positions, stoneTex) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex ? stoneTex.map : null,
    bumpMap: stoneTex ? stoneTex.bump : null,
    bumpScale: 0.045,
    color: 0x5d656d,
    roughness: 0.92,
    metalness: 0.04
  });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x2e231c, roughness: 0.65, metalness: 0.35 });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffefc2,
    emissive: 0xffae42,
    emissiveIntensity: 1.55,
    roughness: 0.22
  });

  const plinthSpecs = [];
  const postSpecs = [];
  const traySpecs = [];
  const fireboxSpecs = [];
  const mullionSpecs = [];
  const roofSpecs = [];
  const finialSpecs = [];
  const mullionOffsets = [[-0.145, -0.145], [0.145, -0.145], [-0.145, 0.145], [0.145, 0.145]];
  const canMat = typeof THREE.Matrix4 === "function";

  positions.forEach(function (sl) {
    const pObj = new THREE.Object3D();
    pObj.position.set(sl[0], 0, sl[1]);
    pObj.rotation.y = sl[2] || 0;
    let parentMat = null;
    let parentGrp = null;
    if (canMat && typeof pObj.updateMatrix === "function" && pObj.matrix) {
      pObj.updateMatrix();
      parentMat = pObj.matrix.clone();
    } else {
      parentGrp = new THREE.Group();
      parentGrp.position.set(sl[0], 0, sl[1]);
      parentGrp.rotation.y = sl[2] || 0;
      g.add(parentGrp);
    }
    plinthSpecs.push({ py: 0.10, parentMat: parentMat, parentGrp: parentGrp });
    postSpecs.push({ py: 0.64, parentMat: parentMat, parentGrp: parentGrp });
    traySpecs.push({ py: 1.12, parentMat: parentMat, parentGrp: parentGrp });
    fireboxSpecs.push({ py: 1.31, parentMat: parentMat, parentGrp: parentGrp });
    for (let mi = 0; mi < mullionOffsets.length; mi++) {
      mullionSpecs.push({ px: mullionOffsets[mi][0], py: 1.31, pz: mullionOffsets[mi][1], parentMat: parentMat, parentGrp: parentGrp });
    }
    roofSpecs.push({ py: 1.59, parentMat: parentMat, parentGrp: parentGrp });
    finialSpecs.push({ py: 1.75, parentMat: parentMat, parentGrp: parentGrp });
  });

  const isLiteShadowStone = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
  const parts = [
    buildInstancedOrGroup(new THREE.BoxGeometry(0.50, 0.20, 0.50), stoneMat, plinthSpecs, { castShadow: !isLiteShadowStone }),
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.105, 0.14, 0.88, 8), stoneMat, postSpecs, { castShadow: !isLiteShadowStone }),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.44, 0.09, 0.44), stoneMat, traySpecs),
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.155, 0.155, 0.29, 6), coreMat, fireboxSpecs),
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 5), mullionMat, mullionSpecs),
    buildInstancedOrGroup(new THREE.ConeGeometry(0.42, 0.25, 6), stoneMat, roofSpecs, { castShadow: !isLiteShadowStone }),
    buildInstancedOrGroup(new THREE.SphereGeometry(0.07, 8, 6), stoneMat, finialSpecs)
  ];
  parts.forEach(function (part) { if (part) g.add(part); });
  return { group: g, coreMat: coreMat };
}

function makeStylizedCelEnvMat(opts) {
  const o = opts || {};
  const gradMap = (typeof stage3dAnime !== "undefined" && typeof stage3dAnime.getToonGradientMap === "function")
    ? stage3dAnime.getToonGradientMap()
    : null;
  if (typeof THREE !== "undefined" && typeof THREE.MeshToonMaterial === "function" && gradMap) {
    const tOpts = { color: o.color !== undefined ? o.color : 0xffffff, gradientMap: gradMap };
    if (o.map) tOpts.map = o.map;
    if (o.bumpMap) { tOpts.bumpMap = o.bumpMap; tOpts.bumpScale = o.bumpScale !== undefined ? o.bumpScale : 0.03; }
    if (o.side !== undefined) tOpts.side = o.side;
    return new THREE.MeshToonMaterial(tOpts);
  }
  return new THREE.MeshStandardMaterial({
    map: o.map || null,
    bumpMap: o.bumpMap || null,
    bumpScale: o.bumpScale || 0.03,
    color: o.color !== undefined ? o.color : 0xffffff,
    roughness: o.roughness !== undefined ? o.roughness : 0.62,
    metalness: o.metalness !== undefined ? o.metalness : 0.06,
    side: o.side !== undefined ? o.side : THREE.FrontSide
  });
}

function buildTabletopTeaSet(woodMat) {
  const teaSet = new THREE.Group();
  const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const isLiteShadowTea = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
  const clayMat = makeStylizedCelEnvMat({ color: 0x994e36, roughness: 0.48, metalness: 0.06 });
  const cupPorcelain = makeStylizedCelEnvMat({ color: 0xe4f7ef, roughness: 0.22, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdcb264, roughness: 0.30, metalness: 0.68 });

  // Walnut coaster tea tray
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.036, 20), woodMat);
  tray.position.y = 0.018;
  tray.receiveShadow = true;
  teaSet.add(tray);

  // Sculpted Artisan Yixing Clay Teapot (merged pot + spout + handle -> 1 draw call!)
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
  const clayParts = [{ geo: potGeo, px: -0.04, py: 0.036, pz: 0.0 }];
  if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
    const spoutCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.18, 0.14, 0),
      new THREE.Vector3(-0.27, 0.19, 0),
      new THREE.Vector3(-0.30, 0.25, 0)
    );
    clayParts.push({ geo: new THREE.TubeGeometry(spoutCurve, 8, 0.024, 7, false) });
    const handleCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.09, 0.21, 0),
      new THREE.Vector3(0.24, 0.19, 0),
      new THREE.Vector3(0.10, 0.09, 0)
    );
    clayParts.push({ geo: new THREE.TubeGeometry(handleCurve, 8, 0.020, 7, false) });
  }
  const mergedPotGeo = mergeStaticBufferGeos(clayParts, true);
  if (mergedPotGeo) {
    const pot = new THREE.Mesh(mergedPotGeo, clayMat);
    pot.castShadow = !isLiteShadowTea;
    teaSet.add(pot);
  } else {
    clayParts.forEach(function (cp, idx) {
      const m = new THREE.Mesh(cp.geo, clayMat);
      m.position.set(cp.px || 0, cp.py || 0, cp.pz || 0);
      if (idx === 0) m.castShadow = !isLiteShadowTea;
      teaSet.add(m);
    });
  }

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), brassMat);
  knob.position.set(-0.04, 0.305, 0);
  teaSet.add(knob);

  // Twin Celadon Aroma Cups beside Teapot (merged into 1 draw call!)
  const cupGeo = new THREE.CylinderGeometry(0.056, 0.042, 0.072, 12);
  const mergedCupsGeo = mergeStaticBufferGeos([
    { geo: cupGeo, px: 0.20, py: 0.072, pz: 0.16 },
    { geo: cupGeo, px: 0.24, py: 0.072, pz: -0.10 }
  ], true);
  if (mergedCupsGeo) {
    teaSet.add(new THREE.Mesh(mergedCupsGeo, cupPorcelain));
  } else {
    [
      [0.20, 0.16],
      [0.24, -0.10]
    ].forEach(function (cp) {
      const aromaCup = new THREE.Mesh(cupGeo, cupPorcelain);
      aromaCup.position.set(cp[0], 0.072, cp[1]);
      teaSet.add(aromaCup);
    });
  }

  teaSet.position.set(-1.18, 1.085, -0.42);
  return teaSet;
}

function buildBambooGrove(x, y, z, scaleMul, bambooLeafTex, sharedMats) {
  const g = new THREE.Group();
  let culmMat, nodeMat, leafMat;
  if (sharedMats && sharedMats.culmMat) {
    culmMat = sharedMats.culmMat;
    nodeMat = sharedMats.nodeMat;
    leafMat = sharedMats.leafMat;
  } else {
    culmMat = new THREE.MeshStandardMaterial({ color: 0x3b7a4f, roughness: 0.42, metalness: 0.06 });
    nodeMat = new THREE.MeshStandardMaterial({ color: 0xc2d8a4, roughness: 0.52, metalness: 0.04 });
    leafMat = bambooLeafTex
      ? new THREE.MeshStandardMaterial({
        map: bambooLeafTex,
        color: 0xdffce6,
        alphaTest: 0.28,
        transparent: true,
        roughness: 0.72,
        side: THREE.DoubleSide
      })
      : new THREE.MeshStandardMaterial({ color: 0x4ca66a, roughness: 0.78, side: THREE.DoubleSide });
    if (sharedMats) {
      sharedMats.culmMat = culmMat;
      sharedMats.nodeMat = nodeMat;
      sharedMats.leafMat = leafMat;
    }
  }

  const canopy = new THREE.Group();
  const leafGeo = (sharedMats && sharedMats.leafGeo) || new THREE.PlaneGeometry(1.55, 1.55);
  const nodeRingGeo = (sharedMats && sharedMats.nodeRingGeo) || new THREE.TorusGeometry(0.05, 0.010, 5, 10);
  if (sharedMats) {
    sharedMats.leafGeo = leafGeo;
    sharedMats.nodeRingGeo = nodeRingGeo;
  }
  const nodeRingSpecs = [];
  const sprigSpecs = [];
  const culmParts = [];
  const stalks = [
    { ox: 0.0, oz: 0.0, h: 5.8, r: 0.056, leanX: 0.05, leanZ: 0.04 },
    { ox: 0.34, oz: 0.18, h: 4.9, r: 0.046, leanX: 0.09, leanZ: -0.05 },
    { ox: -0.30, oz: 0.24, h: 5.3, r: 0.050, leanX: -0.08, leanZ: 0.07 },
    { ox: 0.16, oz: -0.32, h: 4.5, r: 0.042, leanX: 0.06, leanZ: -0.08 },
    { ox: -0.24, oz: -0.22, h: 6.1, r: 0.054, leanX: -0.05, leanZ: -0.06 }
  ];
  stalks.forEach(function (st, si) {
    if (!(sharedMats && sharedMats.mergedCulmGeo)) {
      culmParts.push({
        geo: new THREE.CylinderGeometry(st.r * 0.72, st.r, st.h, 7),
        px: st.ox + st.leanX * st.h * 0.4,
        py: st.h * 0.5,
        pz: st.oz + st.leanZ * st.h * 0.4,
        rx: st.leanZ,
        rz: -st.leanX
      });
    }

    for (let ni = 1; ni <= 4; ni++) {
      const ny = st.h * (ni / 5);
      const rScale = (st.r * (1.02 - ni * 0.05)) / 0.05;
      nodeRingSpecs.push({
        px: st.ox + st.leanX * ny * 0.8, py: ny, pz: st.oz + st.leanZ * ny * 0.8,
        rx: Math.PI * 0.5,
        sx: rScale, sy: rScale, sz: 1
      });
    }

    for (let li = 0; li < 2; li++) {
      const ly = st.h * (0.72 + li * 0.22);
      const lx = st.ox + st.leanX * ly * 0.82;
      const lz = st.oz + st.leanZ * ly * 0.82;
      for (let ci = 0; ci < 2; ci++) {
        const scB = 0.86 + (si % 3) * 0.14;
        sprigSpecs.push({
          px: lx, py: ly, pz: lz,
          rx: -0.22 + li * 0.12,
          ry: si * 1.15 + ci * Math.PI * 0.5 + li * 0.5,
          rz: ci === 0 ? 0.18 : -0.18,
          sx: scB, sy: scB, sz: scB
        });
      }
    }
  });
  const mergedCulmGeo = (sharedMats && sharedMats.mergedCulmGeo) || mergeStaticBufferGeos(culmParts, true);
  if (mergedCulmGeo) {
    if (sharedMats && !sharedMats.mergedCulmGeo) sharedMats.mergedCulmGeo = mergedCulmGeo;
    g.add(new THREE.Mesh(mergedCulmGeo, culmMat));
  } else {
    culmParts.forEach(function (cp) {
      const culm = new THREE.Mesh(cp.geo, culmMat);
      culm.position.set(cp.px, cp.py, cp.pz);
      culm.rotation.set(cp.rx, 0, cp.rz);
      g.add(culm);
    });
  }
  const nodeBatch = buildInstancedOrGroup(nodeRingGeo, nodeMat, nodeRingSpecs);
  if (nodeBatch) g.add(nodeBatch);
  const sprigBatch = buildInstancedOrGroup(leafGeo, leafMat, sprigSpecs);
  if (sprigBatch) canopy.add(sprigBatch);

  g.add(canopy);
  g.position.set(x, y, z);
  g.scale.setScalar(scaleMul || 1);
  return { group: g, canopy: canopy };
}

function buildBlossomTree(x, y, z, scaleMul, kind, woodTex, blossomTex, sharedCache) {
  const g = new THREE.Group();
  const isOsm = kind === "osmanthus";
  const cacheBucket = sharedCache ? (sharedCache[kind] || (sharedCache[kind] = {})) : null;
  let barkMat, coreMat, sprigMatShade, sprigMat;
  if (cacheBucket && cacheBucket.barkMat) {
    barkMat = cacheBucket.barkMat;
    coreMat = cacheBucket.coreMat;
    sprigMatShade = cacheBucket.sprigMatShade;
    sprigMat = cacheBucket.sprigMat;
  } else {
    barkMat = new THREE.MeshStandardMaterial({
      map: woodTex ? woodTex.map : null,
      bumpMap: woodTex ? woodTex.bump : null,
      bumpScale: 0.07,
      color: isOsm ? 0x452d1d : 0x3b2320,
      roughness: 0.90,
      metalness: 0.02
    });
    coreMat = new THREE.MeshStandardMaterial({
      color: isOsm ? 0xb47b1e : 0xc47b93,
      roughness: 0.82,
      metalness: 0.02
    });
    sprigMatShade = blossomTex
      ? new THREE.MeshStandardMaterial({
        map: blossomTex,
        color: isOsm ? 0xdec07a : 0xe2b8c7,
        emissive: isOsm ? 0x523106 : 0x451a2a,
        emissiveIntensity: 0.14,
        alphaTest: 0.22,
        transparent: true,
        roughness: 0.78,
        side: THREE.DoubleSide
      })
      : coreMat;
    sprigMat = blossomTex
      ? new THREE.MeshStandardMaterial({
        map: blossomTex,
        color: isOsm ? 0xfff3cc : 0xfff5f8,
        emissive: isOsm ? 0x6b4308 : 0x5c2438,
        emissiveIntensity: 0.18,
        alphaTest: 0.22,
        transparent: true,
        roughness: 0.70,
        side: THREE.DoubleSide
      })
      : coreMat;
    if (cacheBucket) {
      cacheBucket.barkMat = barkMat;
      cacheBucket.coreMat = coreMat;
      cacheBucket.sprigMatShade = sprigMatShade;
      cacheBucket.sprigMat = sprigMat;
    }
  }

  let mergedBarkGeo = (sharedCache && sharedCache.mergedBarkGeo) || null;
  if (!mergedBarkGeo) {
    const barkParts = [];
    const trunkSegs = [
      { x0: 0, y0: 0, z0: 0, x1: 0.18, y1: 1.45, z1: 0.10, rBot: 0.20, rTop: 0.14 },
      { x0: 0.18, y0: 1.40, z0: 0.10, x1: -0.06, y1: 2.95, z1: -0.04, rBot: 0.14, rTop: 0.095 }
    ];
    trunkSegs.forEach(function (s) {
      const dx = s.x1 - s.x0, dy = s.y1 - s.y0, dz = s.z1 - s.z0;
      const len = Math.hypot(dx, dy, dz);
      barkParts.push({
        geo: new THREE.CylinderGeometry(s.rTop, s.rBot, len, 8),
        px: (s.x0 + s.x1) * 0.5,
        py: (s.y0 + s.y1) * 0.5,
        pz: (s.z0 + s.z1) * 0.5,
        rx: Math.atan2(dz, dy),
        rz: -Math.atan2(dx, dy)
      });
    });
    if (typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function") {
      [
        [new THREE.Vector3(0.14, 1.95, 0.08), new THREE.Vector3(0.75, 2.45, 0.36), new THREE.Vector3(1.22, 2.75, 0.52)],
        [new THREE.Vector3(0.06, 2.35, 0.02), new THREE.Vector3(-0.62, 2.80, -0.28), new THREE.Vector3(-1.12, 3.12, -0.44)],
        [new THREE.Vector3(-0.04, 2.80, -0.02), new THREE.Vector3(0.32, 3.35, -0.34), new THREE.Vector3(0.72, 3.65, -0.48)]
      ].forEach(function (pts) {
        const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
        barkParts.push({ geo: new THREE.TubeGeometry(curve, 6, 0.048, 5, false) });
      });
    }
    mergedBarkGeo = mergeStaticBufferGeos(barkParts, true);
    if (mergedBarkGeo) {
      if (sharedCache) sharedCache.mergedBarkGeo = mergedBarkGeo;
      g.add(new THREE.Mesh(mergedBarkGeo, barkMat));
    } else {
      barkParts.forEach(function (bp) {
        const m = new THREE.Mesh(bp.geo, barkMat);
        m.position.set(bp.px || 0, bp.py || 0, bp.pz || 0);
        m.rotation.set(bp.rx || 0, bp.ry || 0, bp.rz || 0);
        g.add(m);
      });
    }
  } else {
    g.add(new THREE.Mesh(mergedBarkGeo, barkMat));
  }

  const canopy = new THREE.Group();
  const sprigGeo = (sharedCache && sharedCache.sprigGeo) || new THREE.PlaneGeometry(1.85, 1.58);
  if (sharedCache && !sharedCache.sprigGeo) sharedCache.sprigGeo = sprigGeo;
  const shadeSprigSpecs = [];
  const sunSprigSpecs = [];
  [
    [1.18, 2.86, 0.48, 1.05],
    [-1.08, 3.22, -0.42, 1.10],
    [0.68, 3.74, -0.46, 0.96],
    [-0.08, 3.92, 0.14, 1.24],
    [-0.36, 3.30, 0.66, 0.92]
  ].forEach(function (cl, idx) {
    // Pure layered painterly blossom sprigs batched via InstancedMesh!
    for (let si = 0; si < 3; si++) {
      const sa = (si / 3) * Math.PI * 2 + idx * 0.85;
      const scI = cl[3] * 0.78;
      shadeSprigSpecs.push({
        px: cl[0] + Math.cos(sa) * cl[3] * 0.16,
        py: cl[1] - 0.12 + (si % 2) * 0.08,
        pz: cl[2] + Math.sin(sa) * cl[3] * 0.16,
        rx: -0.22 + si * 0.18, ry: sa + 0.5, rz: si % 2 ? 0.22 : -0.22,
        sx: scI, sy: scI, sz: scI
      });
    }
    for (let pi = 0; pi < 5; pi++) {
      const pa = (pi / 5) * Math.PI * 2 + idx * 0.7;
      const scP = cl[3] * 0.88;
      sunSprigSpecs.push({
        px: cl[0] + Math.cos(pa) * cl[3] * 0.34,
        py: cl[1] + (pi % 2 ? 0.16 : -0.04),
        pz: cl[2] + Math.sin(pa) * cl[3] * 0.34,
        rx: -0.34 + (pi % 3) * 0.18, ry: pa, rz: pi % 2 ? 0.16 : -0.16,
        sx: scP, sy: scP, sz: scP
      });
    }
  });
  const shadeBlossomBatch = buildInstancedOrGroup(sprigGeo, sprigMatShade, shadeSprigSpecs);
  if (shadeBlossomBatch) canopy.add(shadeBlossomBatch);
  const sunBlossomBatch = buildInstancedOrGroup(sprigGeo, sprigMat, sunSprigSpecs);
  if (sunBlossomBatch) canopy.add(sunBlossomBatch);

  g.add(canopy);
  g.position.set(x, y, z);
  g.scale.setScalar(scaleMul || 1);
  return { group: g, canopy: canopy, kind: kind };
}

function buildMossyCliffBoulder(x, y, z, sx, sy, sz, rotY, stoneTex, sharedRockMat) {
  const g = new THREE.Group();
  // Single unified organic vertex-colored granite-to-moss rock (zero intersecting shell Z-fighting from overhead views!)
  const rockGeo = typeof THREE.DodecahedronGeometry === "function"
    ? new THREE.DodecahedronGeometry(1.0, 2)
    : new THREE.SphereGeometry(1.0, 12, 10);
  if (rockGeo.attributes && rockGeo.attributes.position) {
    const pos = rockGeo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const seed = (x * 0.7 + z * 1.1);
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const bump = 1.0 + 0.09 * Math.sin(vx * 3.4 + seed) * Math.cos(vz * 3.1 - seed) + 0.05 * Math.sin(vy * 5.2 + vx * 2.7);
      pos.setXYZ(i, vx * bump, vy * bump, vz * bump);
      // Smoothly blend dark mountain granite on flanks -> velvety mountain emerald moss on upper facets
      const mossMix = clamp((vy - 0.14) / 0.58, 0, 1);
      const sr = 0.34, sg = 0.40, sb = 0.45;
      const mr = 0.25, mg = 0.46, mb = 0.32;
      cols[i * 3] = sr + (mr - sr) * mossMix;
      cols[i * 3 + 1] = sg + (mg - sg) * mossMix;
      cols[i * 3 + 2] = sb + (mb - sb) * mossMix;
    }
    pos.needsUpdate = true;
    rockGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    if (typeof rockGeo.computeVertexNormals === "function") rockGeo.computeVertexNormals();
  }
  const rockMat = sharedRockMat || new THREE.MeshStandardMaterial({
    map: stoneTex ? stoneTex.map : null,
    bumpMap: stoneTex ? stoneTex.bump : null,
    bumpScale: 0.05,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.03
  });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.scale.set(sx, sy, sz);
  rock.receiveShadow = true;
  g.add(rock);
  g.position.set(x, y, z);
  g.rotation.y = rotY || 0;
  return g;
}

function createCelestialSpireMaterial(env) {
  if (typeof THREE.ShaderMaterial === "function") {
    env.celestialSpireUniforms = {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color(0x1f7268) },
      uMidColor: { value: new THREE.Color(0x2d5e7a) },
      uMistColor: { value: new THREE.Color(0xe2f6f8) },
      uRimColor: { value: new THREE.Color(0xffe9b0) }
    };
    return new THREE.ShaderMaterial({
      uniforms: env.celestialSpireUniforms,
      transparent: true,
      depthWrite: true,
      vertexShader: [
        "varying float vLocalY;",
        "varying vec3 vWorldNormal;",
        "varying vec3 vWorldPos;",
        "void main() {",
        "  vLocalY = position.y;",
        "  vec4 wp = modelMatrix * vec4(position, 1.0);",
        "  vWorldPos = wp.xyz;",
        "  vWorldNormal = normalize(mat3(modelMatrix) * normal);",
        "  gl_Position = projectionMatrix * viewMatrix * wp;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime;",
        "uniform vec3 uTopColor;",
        "uniform vec3 uMidColor;",
        "uniform vec3 uMistColor;",
        "uniform vec3 uRimColor;",
        "varying float vLocalY;",
        "varying vec3 vWorldNormal;",
        "varying vec3 vWorldPos;",
        "void main() {",
        "  float h = clamp(vLocalY + 0.5, 0.0, 1.0);",
        "  vec3 col = mix(uMistColor, uMidColor, smoothstep(0.08, 0.52, h));",
        "  col = mix(col, uTopColor, smoothstep(0.50, 0.92, h));",
        "  vec3 V = normalize(cameraPosition - vWorldPos);",
        "  float fresnel = pow(clamp(1.0 - max(dot(normalize(vWorldNormal), V), 0.0), 0.0, 1.0), 2.6);",
        "  float sunGlow = max(dot(normalize(vWorldNormal), normalize(vec3(0.45, 0.72, -0.52))), 0.0);",
        "  col += uRimColor * (fresnel * 0.34 + sunGlow * 0.16) * smoothstep(0.20, 0.85, h);",
        "  float mistWave = 0.04 * sin(vWorldPos.x * 0.25 + uTime * 0.4);",
        "  float alpha = smoothstep(-0.46 + mistWave, 0.14 + mistWave, vLocalY);",
        "  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));",
        "}"
      ].join("\n")
    });
  }
  return new THREE.MeshStandardMaterial({
    color: 0x2a6e68,
    roughness: 0.86,
    metalness: 0.06,
    transparent: true,
    opacity: 0.88
  });
}

function buildCelestialKarstSpire(x, y, z, rTop, rBot, height, spireMat, woodTex, hasBonsai, seedIdx, sharedPineMats) {
  const g = new THREE.Group();
  // Unit-height geometry (-0.5..+0.5) scaled by height so ShaderMaterial mist-fade works cleanly for any tallness!
  const spireGeo = new THREE.CylinderGeometry(rTop, rBot, 1.0, 7, 5);
  if (spireGeo.attributes && spireGeo.attributes.position) {
    const pos = spireGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const ang = Math.atan2(vz, vx);
      const crag = 1.0 + 0.18 * Math.sin(ang * 3 + seedIdx * 1.7 + vy * 5.0) + 0.10 * Math.cos(ang * 5 - vy * 7.0);
      const capNarrow = vy > 0.42 ? 0.88 : 1.0;
      pos.setXYZ(i, vx * crag * capNarrow, vy, vz * crag * capNarrow);
    }
    pos.needsUpdate = true;
    if (typeof spireGeo.computeVertexNormals === "function") spireGeo.computeVertexNormals();
  }
  const rockMesh = new THREE.Mesh(spireGeo, spireMat);
  rockMesh.scale.set(1, height, 1);
  g.add(rockMesh);

  if (hasBonsai) {
    const bonsai = buildMountainPineTree(0, height * 0.48, 0, 0.44, woodTex, sharedPineMats);
    g.add(bonsai);
  }
  g.position.set(x, y, z);
  return g;
}

function buildFloatingSteppingStone(x, y, z, rotY, stoneTex, goldMat) {
  const g = new THREE.Group();
  const jadeStoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex ? stoneTex.map : null,
    bumpMap: stoneTex ? stoneTex.bump : null,
    bumpScale: 0.035,
    color: 0xa7d9cc,
    roughness: 0.56,
    metalness: 0.12
  });
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.64, 0.34, 8), jadeStoneMat);
  slab.receiveShadow = true;
  const underTrim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.026, 6, 16), goldMat);
  underTrim.rotation.x = Math.PI * 0.5;
  underTrim.position.y = -0.14;
  const crystalBase = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 0.58, 6),
    new THREE.MeshStandardMaterial({ color: 0x3b7d75, roughness: 0.65, metalness: 0.18 })
  );
  crystalBase.rotation.x = Math.PI;
  crystalBase.position.y = -0.44;
  g.add(slab, underTrim, crystalBase);
  g.position.set(x, y, z);
  g.rotation.y = rotY || 0;
  return g;
}

function build3DPavilionAndTable(scene, env, wood, stone, feltTex) {
  const bokehTex = stage3dTextures.createGlowParticleTexture();

  // 4. Softened Lower Foothill Silhouettes framing the Pacific coast without blocking the 360° skybox horizon!
  env.mtnMatBack = new THREE.MeshStandardMaterial({ color: 0x263854, roughness: 0.94, metalness: 0.04, vertexColors: true, transparent: true, opacity: 0.72 });
  env.mtnMatFront = new THREE.MeshStandardMaterial({ color: 0x324a64, roughness: 0.90, metalness: 0.06, vertexColors: true, transparent: true, opacity: 0.74 });
  scene.add(createSculptedMountainRing(19.5, 35.0, 2.8, env.mtnMatFront, 0.4, -5.2));
  scene.add(createSculptedMountainRing(33.0, 52.0, 4.8, env.mtnMatBack, 2.3, -5.4));

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
        "  vec3 H = normalize(uSunDir + V);",
        "  float spec = pow(max(dot(n, H), 0.0), 68.0) * 0.52;",
        "  float glitter = pow(max(dot(n, H), 0.0), 18.0) * 0.12 * (0.6 + 0.4 * w3);",
        "  vec3 col = baseCol + uSunColor * (spec + glitter);",
        "  gl_FragColor = vec4(col, edgeFade * 0.36);",
        "}"
      ].join("\n")
    });
  } else {
    const OceanMatCtor = THREE.MeshStandardMaterial;
    env.oceanMat = new OceanMatCtor({
      color: 0x16384c,
      bumpMap: env.oceanBumpTex,
      bumpScale: 0.08,
      roughness: 0.14,
      metalness: 0.34,
      transparent: true,
      opacity: 0.36
    });
  }
  const oceanMesh = new THREE.Mesh(new THREE.CircleGeometry(48, 48), env.oceanMat);
  oceanMesh.rotation.x = -Math.PI * 0.5;
  oceanMesh.position.y = -3.1;
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  // 5. Sculpted Mossy Cliff Skirt + Stepped Octagonal Academy Stone Terrace (shrunk so sea of clouds opens right past the cliff edge!)
  env.groundMat = new THREE.MeshStandardMaterial({
    map: stone.map,
    bumpMap: stone.bump,
    bumpScale: 0.055,
    color: 0x223836,
    roughness: 0.94,
    metalness: 0.04
  });
  const groundDisk = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 11.4, 1.4, 24), env.groundMat);
  groundDisk.position.y = -0.82;
  groundDisk.receiveShadow = true;
  scene.add(groundDisk);
  env.groundDisk = groundDisk;

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

  // Far Horizon: Grounded Cloud Isle (山海雲島) anchored into the Pacific sea-mist + Coastal Beacon Light!
  const cloudIsleGroup = new THREE.Group();
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x264458, roughness: 0.92, metalness: 0.04, transparent: true, opacity: 0.86 });
  const shellMain = new THREE.Mesh(new THREE.SphereGeometry(4.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  shellMain.scale.set(1.65, 0.58, 0.78);
  const headHill = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  headHill.scale.set(1.05, 0.82, 0.80);
  headHill.position.set(5.4, 0.0, 0.2);
  const tailHill = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), islandMat);
  tailHill.scale.set(1.5, 0.44, 0.68);
  tailHill.position.set(-5.6, -0.05, -0.15);
  const waterlineMist = new THREE.Mesh(
    new THREE.PlaneGeometry(17.5, 9.2),
    new THREE.MeshBasicMaterial({ map: stage3dTextures.createCloudTexture(), color: 0xdbeafe, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
  );
  waterlineMist.rotation.x = -Math.PI * 0.5;
  waterlineMist.position.y = 0.05;
  const cloudIsleBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe49e, fog: false })
  );
  cloudIsleBeacon.position.set(6.0, 2.0, 0.25);
  const cloudIsleHit = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 6.5), new THREE.MeshBasicMaterial({ visible: false }));
  cloudIsleHit.position.set(0, 1.8, 0);
  cloudIsleGroup.add(shellMain, headHill, tailHill, waterlineMist, cloudIsleBeacon, cloudIsleHit);
  cloudIsleGroup.scale.set(0.58, 0.52, 0.58);
  cloudIsleGroup.position.set(14.8, -3.08, -38.5);
  cloudIsleGroup.rotation.y = -0.24;
  scene.add(cloudIsleGroup);
  env.cloudIsleGroup = cloudIsleGroup;
  env.cloudIsleHitMesh = cloudIsleHit;
  env.cloudIsleMat = islandMat;
  env.cloudIsleBeacon = cloudIsleBeacon;

  // Shimmering Coastal Valley Night Lights (Soft glowing bokeh orbs!)
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
  env.valleyLights = new THREE.Points(
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
  scene.add(env.valleyLights);

  const terraceTrim = new THREE.Mesh(
    new THREE.TorusGeometry(8.46, 0.055, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.48, metalness: 0.55 })
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

  // Stylized Liyue Drifting Bamboo Leaves & Osmanthus Blossom Petals (batched into 3 InstancedMeshes instead of 36 draw calls!)
  const petalTex = typeof stage3dTextures.createPetalTexture === "function" ? stage3dTextures.createPetalTexture() : null;
  if (petalTex) {
    const petalGrp = new THREE.Group();
    const petalGeo = new THREE.PlaneGeometry(0.18, 0.26);
    const bucketColors = [0x6ee7b7, 0xfde68a, 0xfecdd3];
    const bucketOpacities = [0.78, 0.85, 0.85];
    const bucketMats = bucketColors.map(function (colHex, bi) {
      return new THREE.MeshBasicMaterial({
        map: petalTex,
        color: colHex,
        transparent: true,
        opacity: bucketOpacities[bi],
        side: THREE.DoubleSide,
        depthWrite: false
      });
    });
    const bucketCounts = [0, 0, 0];
    const petalSpecs = [];
    for (let pi = 0; pi < 36; pi++) {
      const isBamboo = (pi % 3) !== 0;
      const bucket = isBamboo ? 0 : (pi % 2 === 0 ? 1 : 2);
      const instIdx = bucketCounts[bucket];
      bucketCounts[bucket] += 1;
      petalSpecs.push({
        bucket: bucket,
        instIdx: instIdx,
        x0: ((pi * 37) % 18) - 9,
        y0: 0.8 + ((pi * 13) % 60) * 0.1,
        z0: ((pi * 29) % 18) - 9,
        speed: 0.45 + (pi % 5) * 0.12,
        phase: pi * 0.65
      });
    }
    const canInstPetals = typeof THREE.InstancedMesh === "function" && typeof THREE.Matrix4 === "function";
    env.petalBucketMats = bucketMats;
    if (canInstPetals) {
      const dummyP = new THREE.Object3D();
      const batches = bucketCounts.map(function (cnt, bi) {
        const im = new THREE.InstancedMesh(petalGeo, bucketMats[bi], Math.max(1, cnt));
        im.frustumCulled = false;
        petalGrp.add(im);
        return im;
      });
      for (let pi = 0; pi < petalSpecs.length; pi++) {
        const ps = petalSpecs[pi];
        dummyP.position.set(ps.x0, ps.y0, ps.z0);
        dummyP.rotation.set(0, 0, 0);
        dummyP.scale.set(1, 1, 1);
        dummyP.updateMatrix();
        batches[ps.bucket].setMatrixAt(ps.instIdx, dummyP.matrix);
        env.petals.push({
          bucket: ps.bucket,
          instIdx: ps.instIdx,
          mesh: null,
          x0: ps.x0,
          y0: ps.y0,
          z0: ps.z0,
          speed: ps.speed,
          phase: ps.phase
        });
      }
      batches.forEach(function (im) { if (im.instanceMatrix) im.instanceMatrix.needsUpdate = true; });
      env.petalBatches = batches;
      env._petalDummy = dummyP;
    } else {
      for (let pi = 0; pi < petalSpecs.length; pi++) {
        const ps = petalSpecs[pi];
        const pm = new THREE.Mesh(petalGeo, bucketMats[ps.bucket]);
        pm.position.set(ps.x0, ps.y0, ps.z0);
        petalGrp.add(pm);
        env.petals.push({
          bucket: ps.bucket,
          instIdx: ps.instIdx,
          mesh: pm,
          x0: ps.x0,
          y0: ps.y0,
          z0: ps.z0,
          speed: ps.speed,
          phase: ps.phase
        });
      }
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
  // Track 2 Stylized Cel/Watercolor Pavilion Materials (clean 3-step anime ramp, zero extra outline meshes, faster than PBR on iGPU!)
  const pillarMat = makeStylizedCelEnvMat({ map: wood.map, color: 0xa6382d, roughness: 0.44, metalness: 0.08 });
  const woodDarkMat = makeStylizedCelEnvMat({ map: wood.map, color: 0x69422a, roughness: 0.58, metalness: 0.06 });
  const stonePlinthMat = makeStylizedCelEnvMat({ color: 0xe3ddd0, roughness: 0.78, metalness: 0.03 });
  const roofTileMat = makeStylizedCelEnvMat({
    map: roofTex ? roofTex.map : null,
    bumpMap: roofTex ? roofTex.bump : null,
    bumpScale: 0.036,
    color: roofTex ? 0xf7e3de : 0x943225,
    roughness: 0.54,
    metalness: 0.10,
    side: THREE.DoubleSide
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xdfb462, roughness: 0.28, metalness: 0.72 });

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
  const canMatPav = typeof THREE.Matrix4 === "function";
  const pPlinthSpecs = [];
  const pPlinthRingSpecs = [];
  const pPostSpecs = [];
  const pDouLowerSpecs = [];
  const pDouUpperSpecs = [];
  const pQuetiMainSpecs = [];
  const pQuetiTrimSpecs = [];
  const pArmSpecs = [];
  const cordGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.52, 4);
  const tasselGeo = new THREE.CylinderGeometry(0.018, 0.044, 0.32, 6);
  const lanternCapMergedGeo = mergeStaticBufferGeos([
    { geo: cordGeo, py: 0.52 },
    { geo: lanternCapGeo, py: 0.31 },
    { geo: lanternCapGeo, py: -0.31 }
  ], false);
  const lanternTrimMergedGeo = mergeStaticBufferGeos([
    { geo: lanternTrimRingGeo, py: 0.27, rx: Math.PI * 0.5 },
    { geo: lanternTrimRingGeo, py: -0.27, rx: Math.PI * 0.5 }
  ], false);

  for (let li = 0; li < 8; li++) {
    const la = (li / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(la) * lr;
    const pz = Math.sin(la) * lr;
    pillarPts.push({ x: px, z: pz, a: la, li: li });

    // Leave front South bays (li=1, li=2) open-air so pillars NEVER obstruct front camera views!
    if (li === 1 || li === 2) continue;

    const lg = new THREE.Group();
    lg.position.set(px, 0, pz);
    lg.lookAt(0, 0, 0);
    let lgMat = null;
    if (canMatPav && typeof lg.updateMatrix === "function" && lg.matrix) {
      lg.updateMatrix();
      lgMat = lg.matrix.clone();
    }

    pPlinthSpecs.push({ py: 0.18, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    pPlinthRingSpecs.push({ py: 0.37, rx: Math.PI * 0.5, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    pPostSpecs.push({ py: 2.6, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    pDouLowerSpecs.push({ py: 4.62, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    pDouUpperSpecs.push({ py: 4.75, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    [-1, 1].forEach(function (sideDir) {
      pQuetiMainSpecs.push({ px: sideDir * 0.34, py: 4.44, parentMat: lgMat, parentGrp: lgMat ? null : lg });
      pQuetiTrimSpecs.push({ px: sideDir * 0.28, py: 4.33, parentMat: lgMat, parentGrp: lgMat ? null : lg });
    });
    pArmSpecs.push({ py: 4.25, pz: -0.4, parentMat: lgMat, parentGrp: lgMat ? null : lg });

    // Animated swaying silk lantern stays inside lg so wind sway & tassel secondary motion stay intact (merged static caps/trims!)
    const orb = new THREE.Group();
    const body = new THREE.Mesh(lanternBodyGeo, env.lanternBodyMat);
    const halo = new THREE.Mesh(lanternHaloGeo, env.lanternHaloMat);
    const tassel = new THREE.Mesh(tasselGeo, tasselMat);
    tassel.position.y = -0.49;
    if (lanternCapMergedGeo && lanternTrimMergedGeo) {
      orb.add(new THREE.Mesh(lanternCapMergedGeo, lanternCapMat), body, halo, new THREE.Mesh(lanternTrimMergedGeo, goldAccentMat), tassel);
    } else {
      const cord = new THREE.Mesh(cordGeo, lanternCapMat);
      cord.position.y = 0.52;
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
      orb.add(cord, body, halo, topCap, topTrim, botCap, botTrim, tassel);
    }
    orb.position.set(0, 3.45, -0.78);
    lg.add(orb);

    proceduralPavilionGroup.add(lg);
    env.lanterns.push({ group: lg, orb: orb, tassel: tassel, phase: li * 0.85 });
  }
  [
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.28, 0.36, 0.36, 8), stonePlinthMat, pPlinthSpecs),
    buildInstancedOrGroup(new THREE.TorusGeometry(0.26, 0.022, 6, 16), goldAccentMat, pPlinthRingSpecs),
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.14, 0.16, 4.7, 12), pillarMat, pPostSpecs, { castShadow: true }),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.42, 0.12, 0.42), woodDarkMat, pDouLowerSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.62, 0.11, 0.52), goldAccentMat, pDouUpperSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.42, 0.16, 0.09), woodDarkMat, pQuetiMainSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.30, 0.09, 0.11), goldAccentMat, pQuetiTrimSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.08, 0.08, 0.85), woodDarkMat, pArmSpecs)
  ].forEach(function (part) { if (part) proceduralPavilionGroup.add(part); });

  // Carved Wooden Balustrades, White-Plaster Academy Plinths & Swept Backdrop Flying Eaves (InstancedMesh batched!)
  const hasTube = typeof THREE.TubeGeometry === "function" && typeof THREE.QuadraticBezierCurve3 === "function";
  const balLatticeTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createBalustradeLatticeTexture === "function")
    ? stage3dTextures.createBalustradeLatticeTexture()
    : null;
  const balLatticeMat = balLatticeTex
    ? new THREE.MeshStandardMaterial({
      map: balLatticeTex,
      color: 0xf4e3c8,
      alphaTest: 0.25,
      transparent: true,
      roughness: 0.56,
      metalness: 0.14,
      side: THREE.DoubleSide
    })
    : null;
  const octSpan = 2 * lr * Math.sin(Math.PI / 8);
  const bLowWallSpecs = [];
  const bTopRailSpecs = [];
  const bBotRailSpecs = [];
  const bFretSpecs = [];
  const bSpindleSpecs = [];
  const bCapCollarSpecs = [];
  const bLotusBudSpecs = [];
  const eLintelSpecs = [];
  const eFriezeSpecs = [];
  const eRoofPanelSpecs = [];
  const eRidgeBeamSpecs = [];
  const eTransomSpecs = [];
  const eTransomBarSpecs = [];

  for (let bi = 0; bi < 8; bi++) {
    // Bay 1 (Front South between li=1 and li=2) stays completely open gateway for uncluttered camera approach
    if (bi === 1) continue;
    const pA = pillarPts[bi];
    const pB = pillarPts[(bi + 1) % 8];
    const midX = (pA.x + pB.x) * 0.5;
    const midZ = (pA.z + pB.z) * 0.5;
    const span = octSpan;
    const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    // Low white-plaster courtyard curb + carved walnut fretwork balustrade + lotus-bud newel caps (skip front entrance bays 0 and 2)
    if (bi >= 3 || bi === 7) {
      const bayRef = new THREE.Object3D();
      bayRef.position.set(midX, 0, midZ);
      bayRef.rotation.y = yaw;
      let bayMat = null;
      let bayGrp = null;
      if (canMatPav && typeof bayRef.updateMatrix === "function" && bayRef.matrix) {
        bayRef.updateMatrix();
        bayMat = bayRef.matrix.clone();
      } else {
        bayGrp = new THREE.Group();
        bayGrp.position.set(midX, 0, midZ);
        bayGrp.rotation.y = yaw;
        proceduralPavilionGroup.add(bayGrp);
      }

      bLowWallSpecs.push({ py: 0.14, parentMat: bayMat, parentGrp: bayGrp });
      bTopRailSpecs.push({ py: 0.96, parentMat: bayMat, parentGrp: bayGrp });
      bBotRailSpecs.push({ py: 0.31, parentMat: bayMat, parentGrp: bayGrp });
      if (balLatticeMat) {
        bFretSpecs.push({ py: 0.63, ry: Math.PI * 0.5, parentMat: bayMat, parentGrp: bayGrp });
      }
      [-0.36, 0, 0.36].forEach(function (frac) {
        const zOff = frac * (span - 0.5);
        bSpindleSpecs.push({ py: 0.60, pz: zOff, parentMat: bayMat, parentGrp: bayGrp });
        if (frac !== 0) {
          bCapCollarSpecs.push({ py: 1.01, pz: zOff, rx: Math.PI * 0.5, parentMat: bayMat, parentGrp: bayGrp });
          bLotusBudSpecs.push({ py: 1.08, pz: zOff, sx: 1, sy: 1.24, sz: 1, parentMat: bayMat, parentGrp: bayGrp });
        }
      });
    }

    // Sloped Red-Tile Backdrop Veranda Roof + Swept Upturned Flying Eaves along Rear & Side Bays (3..7)!
    if (bi >= 3) {
      const eaveRef = new THREE.Object3D();
      eaveRef.position.set(midX, 4.92, midZ);
      eaveRef.lookAt(0, 4.92, 0);
      let eaveMat = null;
      let eaveGrp = null;
      if (canMatPav && typeof eaveRef.updateMatrix === "function" && eaveRef.matrix) {
        eaveRef.updateMatrix();
        eaveMat = eaveRef.matrix.clone();
      } else {
        eaveGrp = new THREE.Group();
        eaveGrp.position.set(midX, 4.92, midZ);
        eaveGrp.lookAt(0, 4.92, 0);
        proceduralPavilionGroup.add(eaveGrp);
      }

      eLintelSpecs.push({ parentMat: eaveMat, parentGrp: eaveGrp });
      eFriezeSpecs.push({ py: -0.18, parentMat: eaveMat, parentGrp: eaveGrp });
      eRoofPanelSpecs.push({ py: 0.34, pz: -0.78, rx: 0.34, parentMat: eaveMat, parentGrp: eaveGrp });
      eRidgeBeamSpecs.push({ py: 0.04, pz: -1.72, parentMat: eaveMat, parentGrp: eaveGrp });
      if (bi >= 4 && bi <= 6 && latticeTex) {
        eTransomSpecs.push({ py: -0.50, pz: 0.02, parentMat: eaveMat, parentGrp: eaveGrp });
        eTransomBarSpecs.push({ py: -0.73, pz: 0.02, parentMat: eaveMat, parentGrp: eaveGrp });
      }
    }
  }
  const slopeLen = 2.05;
  [
    buildInstancedOrGroup(new THREE.BoxGeometry(0.24, 0.28, octSpan - 0.35), stonePlinthMat, bLowWallSpecs, { receiveShadow: true }),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.14, 0.08, octSpan - 0.25), woodDarkMat, bTopRailSpecs, { castShadow: true }),
    buildInstancedOrGroup(new THREE.BoxGeometry(0.10, 0.05, octSpan - 0.36), woodDarkMat, bBotRailSpecs),
    balLatticeMat ? buildInstancedOrGroup(new THREE.PlaneGeometry(octSpan - 0.54, 0.60), balLatticeMat, bFretSpecs) : null,
    buildInstancedOrGroup(new THREE.CylinderGeometry(0.036, 0.036, 0.68, 6), woodDarkMat, bSpindleSpecs),
    buildInstancedOrGroup(new THREE.TorusGeometry(0.052, 0.012, 5, 10), goldAccentMat, bCapCollarSpecs),
    buildInstancedOrGroup(new THREE.SphereGeometry(0.062, 8, 6), stonePlinthMat, bLotusBudSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan + 0.18, 0.22, 0.26), woodDarkMat, eLintelSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan + 0.12, 0.18, 0.28), stonePlinthMat, eFriezeSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan + 0.72, 0.12, slopeLen), roofTileMat, eRoofPanelSpecs, { castShadow: true }),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan + 0.78, 0.10, 0.12), goldAccentMat, eRidgeBeamSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan - 0.42, 0.42, 0.06), latticeMat, eTransomSpecs),
    buildInstancedOrGroup(new THREE.BoxGeometry(octSpan - 0.34, 0.06, 0.10), woodDarkMat, eTransomBarSpecs)
  ].forEach(function (part) { if (part) proceduralPavilionGroup.add(part); });

  // Sculpted Upturned Flying Eave Horns + Golden Finials on the 6 Rear/Side Pillars (li = 3,4,5,6,7,0) via InstancedMesh!
  const hornSpecs = [];
  const finialSpecs = [];
  [0, 3, 4, 5, 6, 7].forEach(function (idx) {
    const pt = pillarPts[idx];
    const dirX = Math.cos(pt.a);
    const dirZ = Math.sin(pt.a);
    hornSpecs.push({ ry: -pt.a });
    finialSpecs.push({ px: dirX * 9.78, py: 5.46, pz: dirZ * 9.78 });
  });
  if (hasTube) {
    const baseHornCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(7.6, 5.26, 0),
      new THREE.Vector3(8.95, 5.02, 0),
      new THREE.Vector3(9.75, 5.38, 0)
    );
    const hornBatch = buildInstancedOrGroup(new THREE.TubeGeometry(baseHornCurve, 10, 0.095, 7, false), roofTileMat, hornSpecs);
    if (hornBatch) proceduralPavilionGroup.add(hornBatch);
  }
  const finialBatch = buildInstancedOrGroup(new THREE.OctahedronGeometry(0.11, 0), goldAccentMat, finialSpecs);
  if (finialBatch) proceduralPavilionGroup.add(finialBatch);

  // 4 Courtyard Stone Lanterns (InstancedMesh batched) + 5 Sculpted Mountain Black Pines in a scaled courtyard group
  const courtyardPropsGroup = new THREE.Group();
  const stoneLanternPack = buildCourtyardStoneLanternsInstanced([
    [8.8, -4.8, 0.4],
    [-8.8, -4.8, -0.4],
    [4.4, -8.8, 0.1],
    [-4.4, -8.8, -0.1]
  ], stone);
  courtyardPropsGroup.add(stoneLanternPack.group);
  env.stoneLanternCores.push(stoneLanternPack.coreMat);

  const sharedPineMats = {};
  [
    [-10.4, -0.55, -3.2, 1.28],
    [-7.8, -0.65, -8.8, 1.48],
    [-1.8, -0.85, -10.8, 1.18],
    [9.8, -0.55, -4.4, 1.32],
    [11.2, -0.75, -8.6, 1.44]
  ].forEach(function (pt, idx) {
    const pine = buildMountainPineTree(pt[0], pt[1], pt[2], pt[3], wood, sharedPineMats);
    courtyardPropsGroup.add(pine);
    env.pineTrees.push({ group: pine, canopy: pine.userData ? pine.userData.canopy : null, phase: idx * 1.45 });
  });
  scene.add(courtyardPropsGroup);
  env.courtyardPropsGroup = courtyardPropsGroup;

  // 6B. Dual Switchable Garden Themes!
  // Theme A: 青嵐雅致書院風 (Qinglan Academy — Swaying Jade Bamboo Groves + Osmanthus & Mountain Sakura + Mossy Cliff Boulders)
  const academyGardenGroup = new THREE.Group();
  const bambooLeafTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createBambooLeafTexture === "function")
    ? stage3dTextures.createBambooLeafTexture()
    : null;
  const osmanthusTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createBlossomClusterTexture === "function")
    ? stage3dTextures.createBlossomClusterTexture("osmanthus")
    : null;
  const sakuraTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createBlossomClusterTexture === "function")
    ? stage3dTextures.createBlossomClusterTexture("sakura")
    : null;

  const sharedBambooMats = {};
  [
    [-9.8, -0.42, 3.6, 1.08],
    [9.9, -0.42, 3.2, 1.06],
    [-10.8, -0.52, -0.8, 1.22],
    [10.9, -0.52, -1.2, 1.18],
    [-5.8, -0.60, -9.8, 1.25],
    [6.2, -0.60, -9.6, 1.22]
  ].forEach(function (bg, idx) {
    const grove = buildBambooGrove(bg[0], bg[1], bg[2], bg[3], bambooLeafTex, sharedBambooMats);
    academyGardenGroup.add(grove.group);
    env.bambooGroves.push({ group: grove.group, canopy: grove.canopy, phase: idx * 1.12 });
  });

  const sharedBlossomCache = {};
  [
    [-9.2, -0.45, -6.2, 1.18, "osmanthus", osmanthusTex],
    [9.4, -0.45, -6.4, 1.22, "sakura", sakuraTex],
    [8.8, -0.42, 5.2, 1.04, "osmanthus", osmanthusTex],
    [-8.9, -0.42, 5.4, 1.02, "sakura", sakuraTex]
  ].forEach(function (bt, idx) {
    const tree = buildBlossomTree(bt[0], bt[1], bt[2], bt[3], bt[4], wood, bt[5], sharedBlossomCache);
    academyGardenGroup.add(tree.group);
    env.blossomTrees.push({ group: tree.group, canopy: tree.canopy, kind: bt[4], phase: idx * 1.55 });
  });

  const sharedBoulderMat = new THREE.MeshStandardMaterial({
    map: stone ? stone.map : null,
    bumpMap: stone ? stone.bump : null,
    bumpScale: 0.05,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.03
  });
  [
    [-9.4, -0.55, 2.2, 1.35, 0.72, 1.05, 0.4],
    [9.3, -0.55, 1.9, 1.25, 0.68, 1.12, -0.6],
    [-9.8, -0.60, -4.8, 1.48, 0.84, 1.20, 1.1],
    [9.9, -0.60, -5.0, 1.42, 0.80, 1.18, -0.9],
    [-6.6, -0.62, -8.8, 1.55, 0.86, 1.16, 0.3],
    [6.8, -0.62, -8.7, 1.46, 0.78, 1.24, -1.2],
    [-0.6, -0.65, -10.0, 1.62, 0.76, 1.08, 0.2],
    [2.4, -0.62, -9.8, 1.22, 0.64, 0.98, 0.85]
  ].forEach(function (br) {
    academyGardenGroup.add(buildMossyCliffBoulder(br[0], br[1], br[2], br[3], br[4], br[5], br[6], stone, sharedBoulderMat));
  });
  scene.add(academyGardenGroup);
  env.academyGardenGroup = academyGardenGroup;

  // Theme B: 空靈青綠山水仙境風 (Celestial Qinglü Wonderland — Floating Karst Spires + Jade Stepping Stones + Cloud Ribbon + Spirit Wisps)
  const celestialGardenGroup = new THREE.Group();
  const spireMat = createCelestialSpireMaterial(env);
  env.celestialSpireMat = spireMat;
  [
    [-19.5, 1.2, -16.5, 1.55, 2.8, 16.5, true],
    [-12.5, 2.6, -24.0, 1.85, 3.4, 21.0, true],
    [0.8, 3.2, -28.5, 2.1, 3.8, 23.5, true],
    [13.8, 1.8, -22.5, 1.65, 3.1, 18.5, false],
    [22.5, 0.8, -14.0, 1.50, 2.7, 16.0, true],
    [-25.5, 0.4, -3.5, 1.75, 3.0, 15.8, false],
    [26.2, 0.6, -2.0, 1.68, 2.9, 15.2, true],
    [-22.0, -0.4, 11.5, 1.45, 2.6, 13.8, false],
    [21.8, -0.2, 12.2, 1.40, 2.5, 13.4, false],
    [-6.5, 4.2, -33.0, 2.35, 4.2, 26.0, false]
  ].forEach(function (sp, idx) {
    const spire = buildCelestialKarstSpire(sp[0], sp[1], sp[2], sp[3], sp[4], sp[5], spireMat, wood, sp[6], idx, sharedPineMats);
    celestialGardenGroup.add(spire);
    env.celestialSpires.push({ group: spire, baseY: sp[1], phase: idx * 0.88, amp: 0.24 + (idx % 3) * 0.11 });
  });

  [
    [-10.2, 0.06, 2.6, 0.3],
    [10.4, 0.12, 2.4, -0.4],
    [-10.8, 0.28, -3.8, 0.9],
    [10.8, 0.22, -4.0, -0.8],
    [-6.0, 0.38, -9.6, 0.2],
    [6.2, 0.34, -9.5, -0.25]
  ].forEach(function (st, idx) {
    const stoneMesh = buildFloatingSteppingStone(st[0], st[1], st[2], st[3], stone, goldAccentMat);
    celestialGardenGroup.add(stoneMesh);
    env.celestialSteppingStones.push({ group: stoneMesh, baseY: st[1], phase: idx * 1.15 });
  });

  const celCloudTex = stage3dTextures.createCloudTexture();
  const celCloudRibbon = new THREE.Mesh(
    new THREE.CylinderGeometry(14.6, 16.8, 3.4, 32, 1, true),
    new THREE.MeshBasicMaterial({
      map: celCloudTex,
      color: 0xe0f7fa,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  celCloudRibbon.position.y = -1.15;
  celestialGardenGroup.add(celCloudRibbon);
  env.celestialCloudRibbon = celCloudRibbon;

  const wispCount = 32;
  const wispPos = new Float32Array(wispCount * 3);
  for (let wi = 0; wi < wispCount; wi++) {
    const ang = (wi / wispCount) * Math.PI * 2 + (wi % 3) * 0.22;
    const rad = 7.4 + (wi % 6) * 2.1;
    const wy = -0.6 + (wi % 7) * 0.95;
    wispPos[wi * 3] = Math.cos(ang) * rad;
    wispPos[wi * 3 + 1] = wy;
    wispPos[wi * 3 + 2] = Math.sin(ang) * rad;
    env.celestialWispMeta.push({ ang: ang, rad: rad, y0: wy, speed: 0.28 + (wi % 4) * 0.08, phase: wi * 0.72 });
  }
  const wispGeo = new THREE.BufferGeometry();
  wispGeo.setAttribute("position", new THREE.BufferAttribute(wispPos, 3));
  env.celestialWisps = new THREE.Points(
    wispGeo,
    new THREE.PointsMaterial({
      color: 0xa7f3d0,
      map: bokehTex,
      size: 0.44,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  celestialGardenGroup.add(env.celestialWisps);
  celestialGardenGroup.visible = false;
  scene.add(celestialGardenGroup);
  env.celestialGardenGroup = celestialGardenGroup;

  // 7. Lacquered Clearcoat Walnut Round Table + Artisan Yixing Teapot & Academy Life Props
  // Round table geometry lives in env.tableScaleGroup so 6/8/10/12-seat modes scale X/Z cleanly without stretching inner tea props!
  const tableGroup = new THREE.Group();
  const tableScaleGroup = new THREE.Group();
  env.tableScaleGroup = tableScaleGroup;
  tableGroup.add(tableScaleGroup);
  const tableWoodMat = new THREE.MeshStandardMaterial({
    map: wood.map,
    bumpMap: wood.bump,
    bumpScale: 0.020,
    roughnessMap: wood.roughness || null,
    color: 0xd8c4b0,
    roughness: 0.42,
    metalness: 0.08
  });
  stage3dTextures.upgradeWoodWithPolyHavenCC0(tableWoodMat);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.28, 0.90, 18), tableWoodMat);
  pedestal.position.y = 0.45;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  tableScaleGroup.add(pedestal);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.12, 0.18, 48), tableWoodMat);
  tableTop.position.y = 0.98;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableScaleGroup.add(tableTop);
  env.tableTopMesh = tableTop;

  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.072, 14, 56), tableWoodMat);
  rimTorus.rotation.x = Math.PI * 0.5;
  rimTorus.position.y = 1.055;
  tableScaleGroup.add(rimTorus);

  // Antique-brass inlaid outer rim filigree & pedestal collar
  const outerBrassTrim = new THREE.Mesh(new THREE.TorusGeometry(3.28, 0.022, 10, 56), goldAccentMat);
  outerBrassTrim.rotation.x = Math.PI * 0.5;
  outerBrassTrim.position.y = 1.072;
  const pedestalCollar = new THREE.Mesh(new THREE.TorusGeometry(1.30, 0.040, 10, 28), goldAccentMat);
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
  feltDisk.position.y = 1.075;
  feltDisk.receiveShadow = true;
  tableScaleGroup.add(feltDisk);

  env.tableGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.60, 0.032, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.82 })
  );
  env.tableGlowRing.rotation.x = Math.PI * 0.5;
  env.tableGlowRing.position.y = 1.085;
  tableScaleGroup.add(env.tableGlowRing);

  tableGroup.add(buildTabletopTeaSet(tableWoodMat));
  tableGroup.add(buildTabletopAcademyProps(tableWoodMat, env));
  scene.add(tableGroup);
}

function buildTabletopAcademyProps(woodMat, env) {
  const propsGroup = new THREE.Group();
  const hasLathe = typeof THREE.LatheGeometry === "function" && typeof THREE.Vector2 === "function";
  const isLiteShadowProp = Boolean(typeof stage3d !== "undefined" && (stage3d.isIntegratedGpu || stage3d.isSoftwareRenderer));
  const celadonMat = makeStylizedCelEnvMat({ color: 0x89c7b6, roughness: 0.28, metalness: 0.06 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xdfb462, roughness: 0.30, metalness: 0.70 });
  const scrollMat = makeStylizedCelEnvMat({ color: 0xfaf2e0, roughness: 0.78 });
  const slateMat = makeStylizedCelEnvMat({ color: 0x2a384f, roughness: 0.48, metalness: 0.08 });
  const pastryMat = makeStylizedCelEnvMat({ color: 0xf7c250, roughness: 0.62 });

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
  censerBowl.castShadow = !isLiteShadowProp;
  censer.add(censerBowl);
  const footGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.06, 6);
  const footParts = [];
  for (let fi = 0; fi < 3; fi++) {
    const fa = (fi / 3) * Math.PI * 2;
    footParts.push({ geo: footGeo, px: Math.cos(fa) * 0.095, py: 0.03, pz: Math.sin(fa) * 0.095 });
  }
  const mergedFeetGeo = mergeStaticBufferGeos(footParts, true);
  if (mergedFeetGeo) {
    censer.add(new THREE.Mesh(mergedFeetGeo, brassMat));
  } else {
    footParts.forEach(function (fp) {
      const foot = new THREE.Mesh(footGeo, brassMat);
      foot.position.set(fp.px, fp.py, fp.pz);
      censer.add(foot);
    });
  }
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff8c42, emissive: 0xff5a1f, emissiveIntensity: 0.9, roughness: 0.4 });
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.016, 12), emberMat);
  ember.position.y = 0.20;
  censer.add(ember);
  env.incenseEmberMat = emberMat;
  censer.position.set(1.18, 1.085, -0.44);
  propsGroup.add(censer);

  // 2. Unrolled Academy Calligraphy Scroll, Brass Rollers, Celadon Jade Weight & Inkstone
  const scrollGrp = new THREE.Group();
  const scrollTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createCalligraphyScrollTexture === "function")
    ? stage3dTextures.createCalligraphyScrollTexture()
    : null;
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.012, 0.32), scrollMat);
  paper.position.y = 0.008;
  paper.receiveShadow = true;
  scrollGrp.add(paper);
  if (scrollTex) {
    const scrollArt = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.30),
      new THREE.MeshStandardMaterial({ map: scrollTex, roughness: 0.72, metalness: 0.02 })
    );
    scrollArt.rotation.x = -Math.PI * 0.5;
    scrollArt.position.y = 0.0155;
    scrollArt.receiveShadow = true;
    scrollGrp.add(scrollArt);
  }
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8);
  const rodCapGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.028, 8);
  [-0.29, 0.29].forEach(function (rx) {
    const rod = new THREE.Mesh(rodGeo, woodMat);
    rod.rotation.x = Math.PI * 0.5;
    rod.position.set(rx, 0.022, 0);
    scrollGrp.add(rod);
    [-0.195, 0.195].forEach(function (rz) {
      const cap = new THREE.Mesh(rodCapGeo, brassMat);
      cap.rotation.x = Math.PI * 0.5;
      cap.position.set(rx, 0.022, rz);
      scrollGrp.add(cap);
    });
  });
  // Sculpted Celadon Jade Paperweight Bar anchoring the left scroll margin
  const jadeWeight = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.018, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x6ec9ae, roughness: 0.18, metalness: 0.08 })
  );
  jadeWeight.position.set(-0.20, 0.024, 0.0);
  const inkstone = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.10), slateMat);
  inkstone.position.set(0.18, 0.018, -0.04);
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.26, 6), woodMat);
  brush.rotation.z = Math.PI * 0.5;
  brush.rotation.y = 0.32;
  brush.position.set(-0.04, 0.022, 0.06);
  scrollGrp.add(jadeWeight, inkstone, brush);
  scrollGrp.position.set(0.86, 1.085, 0.80);
  scrollGrp.rotation.y = -0.48;
  propsGroup.add(scrollGrp);

  // 3. Osmanthus & Sakura Floral Wagashi Celadon Dish (gold-rimmed saucer + fluted floral cakes!)
  const plateGrp = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.030, 18), celadonMat);
  dish.position.y = 0.015;
  dish.receiveShadow = true;
  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.238, 0.007, 6, 24), brassMat);
  dishRim.rotation.x = Math.PI * 0.5;
  dishRim.position.y = 0.030;
  plateGrp.add(dish, dishRim);
  const sakuraPastryMat = new THREE.MeshStandardMaterial({ color: 0xf7c5d2, roughness: 0.58 });
  [
    [-0.068, 0.044, -0.045, 0.15, pastryMat],
    [0.072, 0.044, -0.035, -0.25, sakuraPastryMat],
    [0.0, 0.044, 0.074, 0.42, pastryMat]
  ].forEach(function (pc) {
    const cakeGrp = new THREE.Group();
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.032, 10), pc[4]);
    const stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.006, 6), brassMat);
    stamp.position.y = 0.018;
    cakeGrp.add(cake, stamp);
    cakeGrp.position.set(pc[0], pc[1], pc[2]);
    cakeGrp.rotation.y = pc[3];
    plateGrp.add(cakeGrp);
  });
  plateGrp.position.set(-0.90, 1.085, 0.82);
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

  // Subtle Distant Valley Cloud Wisps below terrace elevation (batched into 1 InstancedMesh + 1 shared material!)
  const cloudCount = 22;
  const cloudSharedMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  env.cloudSharedMat = cloudSharedMat;
  const canInstCloud = typeof THREE.InstancedMesh === "function" && typeof THREE.Matrix4 === "function";
  if (canInstCloud) {
    const cloudUnitGeo = new THREE.PlaneGeometry(1, 1);
    const cloudIm = new THREE.InstancedMesh(cloudUnitGeo, cloudSharedMat, cloudCount);
    cloudIm.frustumCulled = false;
    const dummyC = new THREE.Object3D();
    for (let ci = 0; ci < cloudCount; ci++) {
      const ang = (ci / cloudCount) * Math.PI * 2 + (ci % 3) * 0.18;
      const rad = 22.0 + (ci % 4) * 4.5;
      const cW = 9.5 + (ci % 3) * 2.8;
      const cH = 3.4 + (ci % 2) * 1.2;
      const cy = -2.85 + (ci % 3) * 0.55;
      const cx = Math.cos(ang) * rad;
      const cz = Math.sin(ang) * rad;
      dummyC.position.set(cx, cy, cz);
      dummyC.rotation.set(-0.08, Math.atan2(-cx, -cz), 0);
      dummyC.scale.set(cW, cH, 1);
      dummyC.updateMatrix();
      cloudIm.setMatrixAt(ci, dummyC.matrix);
      env.cloudPlanes.push({
        mesh: null,
        mat: cloudSharedMat,
        ang: ang,
        rad: rad,
        y: cy,
        w: cW,
        h: cH,
        speed: 0.012 + (ci % 4) * 0.004,
        phase: ci * 0.7
      });
    }
    if (cloudIm.instanceMatrix) cloudIm.instanceMatrix.needsUpdate = true;
    scene.add(cloudIm);
    env.cloudInstancedMesh = cloudIm;
    env._cloudDummy = dummyC;
  } else {
    for (let ci = 0; ci < cloudCount; ci++) {
      const ang = (ci / cloudCount) * Math.PI * 2 + (ci % 3) * 0.18;
      const rad = 22.0 + (ci % 4) * 4.5;
      const cW = 9.5 + (ci % 3) * 2.8;
      const cH = 3.4 + (ci % 2) * 1.2;
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cW, cH), cloudSharedMat);
      const cy = -2.85 + (ci % 3) * 0.55;
      cMesh.position.set(Math.cos(ang) * rad, cy, Math.sin(ang) * rad);
      cMesh.lookAt(0, cy + 1.8, 0);
      scene.add(cMesh);
      env.cloudPlanes.push({
        mesh: cMesh,
        mat: cloudSharedMat,
        ang: ang,
        rad: rad,
        y: cy,
        w: cW,
        h: cH,
        speed: 0.012 + (ci % 4) * 0.004,
        phase: ci * 0.7
      });
    }
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
  env.resonancePillar.position.set(0, 1.08, 0);
  scene.add(env.resonancePillar);

  // 8. Interactive Handcrafted Glass-Jade Sacred Lotus Centerpiece (Harmoniously Proportioned 0.66x Tabletop Sculpture — Clear Eye-Level Sightline!)
  const lotusGroup = new THREE.Group();
  lotusGroup.position.set(0, 1.48, 0);
  lotusGroup.scale.setScalar(0.66);

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
  crystalStand.position.set(0, 1.09, 0);
  crystalStand.scale.setScalar(0.66);
  crystalStand.receiveShadow = true;
  scene.add(crystalStand);
  const standRim = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.018, 8, 32), filigreeGoldMat);
  standRim.rotation.x = Math.PI * 0.5;
  standRim.position.set(0, 1.23, 0);
  standRim.scale.setScalar(0.66);
  scene.add(standRim);

  const CoreMatCtor = THREE.MeshStandardMaterial;
  // Smooth Iridescent Glass-Jade Sacred Heart + Golden Stamen Crown
  env.lotusCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 22, 18),
    new CoreMatCtor({
      color: 0xf6d88c,
      emissive: 0xd99224,
      emissiveIntensity: 0.72,
      roughness: 0.14,
      metalness: 0.28
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

  // Delicate Crown of 8 Luminous Golden Stamen Pearls around the lotus heart (batched 8 -> 1 draw call!)
  const stamenGeo = new THREE.SphereGeometry(0.036, 8, 6);
  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.25,
    roughness: 0.18
  });
  const stamenSpecs = [];
  for (let si = 0; si < 8; si++) {
    const sa = (si / 8) * Math.PI * 2;
    stamenSpecs.push({ px: Math.cos(sa) * 0.34, py: 0.12 + (si % 2) * 0.04, pz: Math.sin(sa) * 0.34 });
  }
  const stamenBatch = buildInstancedOrGroup(stamenGeo, stamenMat, stamenSpecs);
  if (stamenBatch) lotusGroup.add(stamenBatch);

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

  // Outer Tier: 8 Sculpted Translucent Celadon-Ivory Jade Curved Lotus Petals (batched 8 -> 1 draw call!)
  const outerPetalGeo = createCurvedLotusPetalGeo(0.42, 0.68, 0.10);
  const outerPetalMat = new CoreMatCtor({
    color: 0xe8efe4,
    emissive: 0xb88c3e,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.22,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  env.lotusOuterPetalMat = outerPetalMat;
  const outerPetalSpecs = [];
  const canOuterMat = typeof THREE.Matrix4 === "function";
  for (let oi = 0; oi < 8; oi++) {
    const oa = (oi / 8) * Math.PI * 2 + Math.PI / 8;
    if (canOuterMat) {
      const pRef = new THREE.Object3D();
      pRef.rotation.y = oa;
      pRef.updateMatrix();
      outerPetalSpecs.push({ py: -0.32, pz: 0.32, rx: 0.62, parentMat: pRef.matrix.clone() });
    } else {
      const opWrap = new THREE.Group();
      opWrap.rotation.y = oa;
      const op = new THREE.Mesh(outerPetalGeo, outerPetalMat);
      op.position.set(0, -0.32, 0.32);
      op.rotation.x = 0.62;
      opWrap.add(op);
      lotusGroup.add(opWrap);
    }
  }
  if (outerPetalSpecs.length) {
    const outerPetalBatch = buildInstancedOrGroup(outerPetalGeo, outerPetalMat, outerPetalSpecs);
    if (outerPetalBatch) lotusGroup.add(outerPetalBatch);
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
      roughness: 0.14,
      metalness: 0.24,
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
    { x: -1.48, y: 1.33, z: -0.42, count: 14, maxRise: 0.68, drift: 0.09, speed: 0.48 }, // Yixing Teapot Spout
    { x: -0.98, y: 1.21, z: -0.26, count: 6, maxRise: 0.48, drift: 0.055, speed: 0.42 }, // Celadon Aroma Cup 1
    { x: -0.94, y: 1.21, z: -0.52, count: 6, maxRise: 0.48, drift: 0.055, speed: 0.40 }, // Celadon Aroma Cup 2
    { x: 1.18, y: 1.31, z: -0.44, count: 16, maxRise: 1.08, drift: 0.14, speed: 0.36 }   // Tripod Incense Burner
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
    sceneThemeKey: "",
    dawnSweep: 0,
    hasPhotoDay: false,
    hasPhotoCelestial: false,
    hasPhotoDusk: false,
    hasPhotoNight: false,
    iblDefaultTex: null,
    iblDayTex: null,
    iblCelestialTex: null,
    iblDuskTex: null,
    iblNightTex: null,
    skyCanvas: null,
    skyCtx: null,
    skyTex: null,
    skyMesh: null,
    skyPhotoDayMat: null,
    skyPhotoCelestialMat: null,
    skyPhotoDuskMat: null,
    skyPhotoNightMat: null,
    skyPhotoDayMesh: null,
    skyPhotoCelestialMesh: null,
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
    academyGardenGroup: null,
    celestialGardenGroup: null,
    bambooGroves: [],
    blossomTrees: [],
    celestialSpires: [],
    celestialSteppingStones: [],
    celestialCloudRibbon: null,
    celestialWisps: null,
    celestialWispMeta: [],
    celestialSpireMat: null,
    celestialSpireUniforms: null,
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
    cloudIsleGroup: null,
    cloudIsleHitMesh: null,
    cloudIsleMat: null,
    cloudIsleBeacon: null,
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
  apply3DSceneTheme(scene, env, (typeof state !== "undefined" && state.sceneTheme === "celestial") ? "celestial" : "academy");
  return env;
}

function apply3DSceneTheme(scene, env, themeKey) {
  if (!env) return;
  const tk = themeKey === "celestial" ? "celestial" : "academy";
  env.sceneThemeKey = tk;
  const isCel = tk === "celestial";
  if (env.academyGardenGroup) env.academyGardenGroup.visible = !isCel;
  if (env.celestialGardenGroup) env.celestialGardenGroup.visible = isCel;

  if (env.petalBucketMats && env.petalBucketMats.length >= 3) {
    if (isCel) {
      env.petalBucketMats[0].color.setHex(0x99f6e4);
      env.petalBucketMats[1].color.setHex(0xfef08a);
      env.petalBucketMats[2].color.setHex(0xe0f2fe);
    } else {
      env.petalBucketMats[0].color.setHex(0x6ee7b7);
      env.petalBucketMats[1].color.setHex(0xfde68a);
      env.petalBucketMats[2].color.setHex(0xfecdd3);
    }
  } else if (env.petals && env.petals.length) {
    for (let pi = 0; pi < env.petals.length; pi++) {
      const pt = env.petals[pi];
      if (!pt || !pt.mesh || !pt.mesh.material || !pt.mesh.material.color) continue;
      if (isCel) {
        pt.mesh.material.color.setHex(pi % 3 === 0 ? 0xfef08a : (pi % 2 === 0 ? 0x99f6e4 : 0xe0f2fe));
      } else {
        const isBamboo = (pi % 3) !== 0;
        pt.mesh.material.color.setHex(isBamboo ? 0x6ee7b7 : (pi % 2 === 0 ? 0xfde68a : 0xfecdd3));
      }
    }
  }
  apply3DMoodPalette(scene, env, env.moodKey || "twilight");
}

function apply3DMoodPalette(scene, env, moodKey) {
  const g = env.skyCtx;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  const isCel = env.sceneThemeKey === "celestial";
  if (moodKey === "day") {
    // Luminous Morning Sky — Qinglan Academy Teal-Gold vs Celestial Qinglü Jade-Mist
    grad.addColorStop(0, isCel ? "#0ea5c6" : "#1da1f2");
    grad.addColorStop(0.42, isCel ? "#67e8f9" : "#7dd3fc");
    grad.addColorStop(0.75, isCel ? "#d8fcf6" : "#e0f7fa");
    grad.addColorStop(1, "#fef3c7");
    env.targetColors.fog.setHex(isCel ? 0xbce8e2 : 0xc6e2de);
    env.targetColors.hemiSky.setHex(isCel ? 0xa7f3d0 : 0xbae6fd);
    env.targetColors.hemiGnd.setHex(isCel ? 0xd9c698 : 0xe5c185);
    env.targetColors.dir.setHex(0xfffbeb);
    env.targetColors.rim.setHex(isCel ? 0x99f6e4 : 0xfef08a);
    env.targetColors.table.setHex(0xffc366);
    env.targetColors.lotus.setHex(0xfbbf24);
    env.targetColors.cloud.setHex(isCel ? 0xf0fdfa : 0xfffdf5);
    env.mtnMatBack.color.setHex(isCel ? 0x3b8c84 : 0x528d88);
    env.mtnMatFront.color.setHex(isCel ? 0x266b66 : 0x3a6f6b);
    env.groundMat.color.setHex(isCel ? 0x2d665c : 0x3b6355);
    env.terraceMat.color.setHex(isCel ? 0xeef5f0 : 0xf3efe4);
    if (env.celestialSpireUniforms) {
      env.celestialSpireUniforms.uTopColor.value.setHex(0x1f7a6c);
      env.celestialSpireUniforms.uMidColor.value.setHex(0x2c6882);
      env.celestialSpireUniforms.uMistColor.value.setHex(0xe6faf8);
      env.celestialSpireUniforms.uRimColor.value.setHex(0xfff0b8);
    }
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x136386);
      env.oceanUniforms.uShallowColor.value.setHex(0x3ba9cc);
      env.oceanUniforms.uSunColor.value.setHex(0xfff5cc);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x1b8cb3);
    }
    if (env.skyPhotoDayMat && env.skyPhotoDayMat.color) env.skyPhotoDayMat.color.setHex(0xffffff);
    if (env.skyPhotoCelestialMat && env.skyPhotoCelestialMat.color) env.skyPhotoCelestialMat.color.setHex(0xffffff);
    env.fireflyPoints.material.color.setHex(isCel ? 0x99f6e4 : 0xfef08a);
    if (isCel && env.iblCelestialTex) scene.environment = env.iblCelestialTex;
    else if (env.iblDayTex) scene.environment = env.iblDayTex;
  } else if (moodKey === "vote") {
    // Dramatic Liyue Crimson-Amber Dusk
    grad.addColorStop(0, "#4c1d24");
    grad.addColorStop(0.45, "#b44a38");
    grad.addColorStop(0.80, "#f59e0b");
    grad.addColorStop(1, "#fde68a");
    env.targetColors.fog.setHex(isCel ? 0x6b3234 : 0x7c2d23);
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
    if (env.celestialSpireUniforms) {
      env.celestialSpireUniforms.uTopColor.value.setHex(0x583b44);
      env.celestialSpireUniforms.uMidColor.value.setHex(0x7c403c);
      env.celestialSpireUniforms.uMistColor.value.setHex(0xffd9be);
      env.celestialSpireUniforms.uRimColor.value.setHex(0xffc978);
    }
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x471d2e);
      env.oceanUniforms.uShallowColor.value.setHex(0x9e4338);
      env.oceanUniforms.uSunColor.value.setHex(0xffc978);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x5b2838);
    }
    if (env.skyPhotoDayMat && env.skyPhotoDayMat.color) env.skyPhotoDayMat.color.setHex(0xffcfb8);
    if (env.skyPhotoDuskMat && env.skyPhotoDuskMat.color) env.skyPhotoDuskMat.color.setHex(0xffb8a0);
    if (env.skyPhotoCelestialMat && env.skyPhotoCelestialMat.color) env.skyPhotoCelestialMat.color.setHex(0xffc8a8);
    env.fireflyPoints.material.color.setHex(0xfdba74);
    if (env.iblDuskTex) scene.environment = env.iblDuskTex;
    else if (env.iblDayTex) scene.environment = env.iblDayTex;
  } else if (moodKey === "night") {
    // Clean Luminous Anime Indigo Starlight (zero muddy black shadows)
    grad.addColorStop(0, "#0b1336");
    grad.addColorStop(0.48, "#1b285c");
    grad.addColorStop(0.84, "#2f3e78");
    grad.addColorStop(1, "#1b2652");
    env.targetColors.fog.setHex(isCel ? 0x162b4f : 0x1b2756);
    env.targetColors.hemiSky.setHex(isCel ? 0x67a8e8 : 0x7c8cf8);
    env.targetColors.hemiGnd.setHex(0x282654);
    env.targetColors.dir.setHex(0xd4d2ff);
    env.targetColors.rim.setHex(isCel ? 0x5eead4 : 0x7dd3fc);
    env.targetColors.table.setHex(0xa78bfa);
    env.targetColors.lotus.setHex(0xa78bfa);
    env.targetColors.cloud.setHex(isCel ? 0x70a8cc : 0x7f8fe6);
    env.mtnMatBack.color.setHex(0x1e2b58);
    env.mtnMatFront.color.setHex(0x273869);
    env.groundMat.color.setHex(0x172044);
    env.terraceMat.color.setHex(0xa3acd1);
    if (env.celestialSpireUniforms) {
      env.celestialSpireUniforms.uTopColor.value.setHex(0x1b3a5c);
      env.celestialSpireUniforms.uMidColor.value.setHex(0x254b6e);
      env.celestialSpireUniforms.uMistColor.value.setHex(0x7caad0);
      env.celestialSpireUniforms.uRimColor.value.setHex(0x93e6dc);
    }
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x0c1b3b);
      env.oceanUniforms.uShallowColor.value.setHex(0x234a7d);
      env.oceanUniforms.uSunColor.value.setHex(0xc7d2fe);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x173766);
    }
    env.fireflyPoints.material.color.setHex(isCel ? 0x99f6e4 : 0xd8b4fe);
    if (env.iblNightTex) scene.environment = env.iblNightTex;
  } else {
    // Breathtaking Golden Hour Twilight (Qinglan Academy) vs Ethereal Qinglü Dawn-Mist Twilight (Celestial)
    grad.addColorStop(0, isCel ? "#16466b" : "#1c3566");
    grad.addColorStop(0.44, isCel ? "#38849e" : "#4b5f9e");
    grad.addColorStop(0.78, isCel ? "#98d4cc" : "#d9895b");
    grad.addColorStop(1, "#fde68a");
    env.targetColors.fog.setHex(isCel ? 0x264b61 : 0x23334c);
    env.targetColors.hemiSky.setHex(isCel ? 0x9fe6e0 : 0x9cb4ff);
    env.targetColors.hemiGnd.setHex(isCel ? 0x3b4a4c : 0x523b38);
    env.targetColors.dir.setHex(0xffe8a3);
    env.targetColors.rim.setHex(isCel ? 0x99f6e4 : 0xfdcb82);
    env.targetColors.table.setHex(0xffbe5c);
    env.targetColors.lotus.setHex(0xfbbf24);
    env.targetColors.cloud.setHex(isCel ? 0xd8f8f5 : 0xdbeafe);
    env.mtnMatBack.color.setHex(isCel ? 0x295c68 : 0x2f4d6d);
    env.mtnMatFront.color.setHex(isCel ? 0x2f6c72 : 0x3a6278);
    env.groundMat.color.setHex(isCel ? 0x1e3f44 : 0x20324a);
    env.terraceMat.color.setHex(isCel ? 0xd4e4e2 : 0xc8d2e3);
    if (env.celestialSpireUniforms) {
      env.celestialSpireUniforms.uTopColor.value.setHex(0x1f6e68);
      env.celestialSpireUniforms.uMidColor.value.setHex(0x2e6480);
      env.celestialSpireUniforms.uMistColor.value.setHex(0xd4f0f4);
      env.celestialSpireUniforms.uRimColor.value.setHex(0xffe6a8);
    }
    if (env.oceanUniforms) {
      env.oceanUniforms.uDeepColor.value.setHex(0x123154);
      env.oceanUniforms.uShallowColor.value.setHex(0x356991);
      env.oceanUniforms.uSunColor.value.setHex(0xffdf99);
    } else if (env.oceanMat && env.oceanMat.color) {
      env.oceanMat.color.setHex(0x1b4c73);
    }
    if (env.skyPhotoDuskMat && env.skyPhotoDuskMat.color) env.skyPhotoDuskMat.color.setHex(0xffffff);
    if (env.skyPhotoCelestialMat && env.skyPhotoCelestialMat.color) env.skyPhotoCelestialMat.color.setHex(0xdcecf5);
    env.fireflyPoints.material.color.setHex(isCel ? 0xa7f3d0 : 0xfef08a);
    if (isCel && env.iblCelestialTex) scene.environment = env.iblCelestialTex;
    else if (env.iblDuskTex) scene.environment = env.iblDuskTex;
    else if (env.iblNightTex) scene.environment = env.iblNightTex;
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  env.skyTex.needsUpdate = true;
}

function isDramaticFocusActive(nowMs) {
  if (typeof state === "undefined" || !state.match || !state.match.started) return false;
  const p = state.match.phase;
  if (p === "LOBBY" || p === "GAME_OVER") return false;
  const now = typeof nowMs === "number" ? nowMs : (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (state.interjectOpen || (state.lastInterjectAt && (now - state.lastInterjectAt) < 4600)) return true;
  if (state.match.hopeConfrontation && state.match.hopeConfrontation.active) return true;
  if (typeof isPkVoteActive === "function" && isPkVoteActive() && (p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "DAY_VOTE")) return true;
  if (p === "LAST_WORDS_SPEECH") return true;
  if ((p === "DAY_SPEECH" || p === "SHERIFF_ELECTION") && state.activeSpeakerId) {
    const dayEvs = state.match.daySpeechEvents || [];
    const latest = dayEvs.length ? dayEvs[dayEvs.length - 1] : null;
    if (latest && latest.speakerId === state.activeSpeakerId && (latest.claimRole || latest.accuseId)) {
      return true;
    }
    const sp = typeof getSeat === "function" ? getSeat(state.activeSpeakerId) : null;
    if (sp && sp.claimedRole) return true;
  }
  return false;
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
    : { tableScale: 1.08, ringRadius: 4.44, pavilionScale: 1.0 };
  if (!env.tableScaleCurrent) env.tableScaleCurrent = tLayout.tableScale;
  if (!env.pavilionScaleCurrent) env.pavilionScaleCurrent = tLayout.pavilionScale;
  const tScaleDiff = Math.abs(tLayout.tableScale - env.tableScaleCurrent);
  const pScaleDiff = Math.abs(tLayout.pavilionScale - env.pavilionScaleCurrent);
  const layoutNeedsScale = !env._layoutScaleApplied || env._lastLayoutSeats !== activeSeatsN || tScaleDiff > 0.0005 || pScaleDiff > 0.0005;
  if (layoutNeedsScale) {
    env._layoutScaleApplied = true;
    env._lastLayoutSeats = activeSeatsN;
    env.tableScaleCurrent = tScaleDiff > 0.0005
      ? (env.tableScaleCurrent + (tLayout.tableScale - env.tableScaleCurrent) * 0.16)
      : tLayout.tableScale;
    env.pavilionScaleCurrent = pScaleDiff > 0.0005
      ? (env.pavilionScaleCurrent + (tLayout.pavilionScale - env.pavilionScaleCurrent) * 0.16)
      : tLayout.pavilionScale;
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
    if (env.groundDisk) env.groundDisk.scale.set(psNow, 1, psNow);
    if (env.proceduralPavilionGroup) env.proceduralPavilionGroup.scale.set(psNow, 1, psNow);
    if (env.courtyardPropsGroup) env.courtyardPropsGroup.scale.set(psNow, 1, psNow);
    if (env.academyGardenGroup) env.academyGardenGroup.scale.set(psNow, 1, psNow);
    if (env.celestialGardenGroup) env.celestialGardenGroup.scale.set(psNow, 1, psNow);
  }

  const desiredTheme = (typeof state !== "undefined" && state.sceneTheme === "celestial") ? "celestial" : "academy";
  if (env.sceneThemeKey !== desiredTheme) {
    apply3DSceneTheme(scene, env, desiredTheme);
  }
  const isCelestialTheme = env.sceneThemeKey === "celestial";

  if (env.moodKey !== moodKey) {
    if (env.moodKey === "night" && moodKey === "day") {
      env.dawnSweep = 1.0;
      env.lotusSpinBoost = Math.max(env.lotusSpinBoost, 0.75);
    }
    env.moodKey = moodKey;
    apply3DMoodPalette(scene, env, moodKey);
  }

  const dt60 = clamp(Number(f.dt60) || 1, 0.05, 3.0);
  const d04 = typeof dampFactor3D === "function" ? dampFactor3D(0.04, dt60) : 0.04;
  const d05 = typeof dampFactor3D === "function" ? dampFactor3D(0.05, dt60) : 0.05;
  const d06 = typeof dampFactor3D === "function" ? dampFactor3D(0.06, dt60) : 0.06;
  const d08 = typeof dampFactor3D === "function" ? dampFactor3D(0.08, dt60) : 0.08;
  const d10 = typeof dampFactor3D === "function" ? dampFactor3D(0.10, dt60) : 0.10;
  const d12 = typeof dampFactor3D === "function" ? dampFactor3D(0.12, dt60) : 0.12;
  const d14 = typeof dampFactor3D === "function" ? dampFactor3D(0.14, dt60) : 0.14;

  if (env.skyPhotoDayMat && env.skyPhotoNightMat) {
    const useCelestialSky = Boolean(isCelestialTheme && env.hasPhotoCelestial && moodKey !== "night");
    const useDuskNow = Boolean(!useCelestialSky && env.hasPhotoDusk && (moodKey === "twilight" || moodKey === "vote"));
    const targetCelOp = useCelestialSky ? (moodKey === "vote" ? 0.62 : (moodKey === "twilight" ? 0.90 : 0.98)) : 0.0;
    const targetDayOp = (!useCelestialSky && env.hasPhotoDay && f.daylight && !useDuskNow) ? (isVote ? 0.62 : 0.98) : 0.0;
    const targetDuskOp = useDuskNow ? (isVote ? 0.94 : 0.98) : (useCelestialSky && moodKey === "vote" && env.hasPhotoDusk ? 0.38 : 0.0);
    const targetNightOp = (env.hasPhotoNight && moodKey === "night") ? 0.96 : 0.0;
    env.skyPhotoDayMat.opacity += (targetDayOp - env.skyPhotoDayMat.opacity) * d08;
    if (env.skyPhotoCelestialMat) env.skyPhotoCelestialMat.opacity += (targetCelOp - env.skyPhotoCelestialMat.opacity) * d08;
    if (env.skyPhotoDuskMat) env.skyPhotoDuskMat.opacity += (targetDuskOp - env.skyPhotoDuskMat.opacity) * d08;
    env.skyPhotoNightMat.opacity += (targetNightOp - env.skyPhotoNightMat.opacity) * d08;

    // v23.3 Overdraw Cull: Hide zero-opacity sky domes & hide base procedural skyMesh when a painted dome is opaque!
    const dayOp = env.skyPhotoDayMat.opacity;
    const celOp = env.skyPhotoCelestialMat ? env.skyPhotoCelestialMat.opacity : 0;
    const duskOp = env.skyPhotoDuskMat ? env.skyPhotoDuskMat.opacity : 0;
    const nightOp = env.skyPhotoNightMat.opacity;
    env.skyPhotoDayMesh.visible = dayOp > 0.005;
    if (env.skyPhotoCelestialMesh) env.skyPhotoCelestialMesh.visible = celOp > 0.005;
    if (env.skyPhotoDuskMesh) env.skyPhotoDuskMesh.visible = duskOp > 0.005;
    env.skyPhotoNightMesh.visible = nightOp > 0.005;
    if (env.skyMesh) {
      env.skyMesh.visible = Math.max(dayOp, celOp, duskOp, nightOp) < 0.94;
    }

    // Gently anchor visible sky domes so directional sunlight stays aligned with the painted sky sun!
    const skyDrift = Math.sin(t * 0.03) * 0.015;
    if (env.skyPhotoDayMesh.visible) env.skyPhotoDayMesh.rotation.y = skyDrift;
    if (env.skyPhotoCelestialMesh && env.skyPhotoCelestialMesh.visible) env.skyPhotoCelestialMesh.rotation.y = skyDrift;
    if (env.skyPhotoDuskMesh && env.skyPhotoDuskMesh.visible) env.skyPhotoDuskMesh.rotation.y = skyDrift;
    if (env.skyPhotoNightMesh.visible) env.skyPhotoNightMesh.rotation.y = skyDrift * 0.8;
  }

  if (env.dawnSweep > 0.005) env.dawnSweep *= Math.pow(0.965, dt60);
  else env.dawnSweep = 0;

  const lerpAmt = d05;
  const targetFogDens = (f.daylight ? 0.0052 : (f.night ? 0.0080 : 0.0068)) + (isToxicHaze ? 0.0035 : (isClearBreeze ? -0.0012 : 0));
  scene.fog.color.lerp(env.targetColors.fog, lerpAmt);
  scene.fog.density += (targetFogDens - scene.fog.density) * lerpAmt;

  const isMatchPointNow = Boolean(typeof state !== "undefined" && state.match && state.match.started && state.match.isMatchPoint && state.match.phase !== "GAME_OVER");
  const mpFlicker = isMatchPointNow ? (0.86 + Math.sin(t * 14.3) * 0.08 + Math.sin(t * 23.7) * 0.05) : 1.0;
  const dramaticFocusNow = isDramaticFocusActive(f.nowMs);
  const activeSpeakingNow = Boolean(
    typeof state !== "undefined" &&
    state.match &&
    state.match.started &&
    (state.match.phase === "DAY_SPEECH" || state.match.phase === "SHERIFF_ELECTION") &&
    state.activeSpeakerId
  );
  const targetFocusDim = dramaticFocusNow ? 1.0 : (activeSpeakingNow ? 0.58 : 0.0);
  env.focusDimBlend = (env.focusDimBlend || 0) + (targetFocusDim - (env.focusDimBlend || 0)) * d08;
  // v24.0 Focus Dimming: ~20% gentle ambient dip during daytime speeches, 35% cinematic dip during dramatic beats!
  const focusDimMul = 1.0 - env.focusDimBlend * 0.35;
  const blackoutNow = Boolean(env.lanternBlackoutUntil && f.nowMs < env.lanternBlackoutUntil);
  const blackoutMul = blackoutNow ? 0.14 : 1.0;
  const hazeDim = (isToxicHaze ? 0.82 : (isClearBreeze ? 1.06 : 1.0)) * (isMatchPointNow ? 0.86 : 1.0) * focusDimMul * blackoutMul;
  env.hemiLight.color.lerp(env.targetColors.hemiSky, lerpAmt);
  env.hemiLight.groundColor.lerp(env.targetColors.hemiGnd, lerpAmt);
  env.hemiLight.intensity += (((f.daylight ? (0.64 + env.dawnSweep * 0.18) : (f.night ? 0.42 : 0.54)) * hazeDim) - env.hemiLight.intensity) * lerpAmt;
  env.dirLight.color.lerp(env.targetColors.dir, lerpAmt);
  env.dirLight.intensity += (((f.daylight ? (0.95 + env.dawnSweep * 0.25) : (f.night ? 0.58 : 0.78)) * hazeDim) - env.dirLight.intensity) * lerpAmt;
  env.dirLight.position.x = 11 - env.dawnSweep * 9;

  // Dim distant 360° sky dome subtly during dramatic focus so distant mountains recede behind the lit speaker!
  const skyBright = clamp(focusDimMul * (blackoutNow ? 0.25 : 1.0), 0.2, 1.0);
  if (env.skyPhotoDayMat && env.skyPhotoDayMat.color && typeof env.skyPhotoDayMat.color.setRGB === "function" && moodKey === "day") {
    env.skyPhotoDayMat.color.setRGB(skyBright, skyBright, skyBright);
  }
  if (env.skyPhotoCelestialMat && env.skyPhotoCelestialMat.color && typeof env.skyPhotoCelestialMat.color.setRGB === "function" && moodKey === "day") {
    env.skyPhotoCelestialMat.color.setRGB(skyBright, skyBright, skyBright);
  }
  if (env.skyPhotoDuskMat && env.skyPhotoDuskMat.color && typeof env.skyPhotoDuskMat.color.setRGB === "function" && moodKey === "twilight") {
    env.skyPhotoDuskMat.color.setRGB(skyBright, skyBright, skyBright);
  }

  if (env.rimLight) {
    if (isMatchPointNow) {
      if (!env._mpCrimsonColor) env._mpCrimsonColor = new THREE.Color(0xdc2626);
      env.rimLight.color.lerp(env._mpCrimsonColor, lerpAmt * 1.4);
      env.rimLight.intensity += ((0.74 * mpFlicker * focusDimMul * blackoutMul) - env.rimLight.intensity) * lerpAmt;
    } else {
      env.rimLight.color.lerp(env.targetColors.rim, lerpAmt);
      env.rimLight.intensity += (((f.daylight ? 0.36 : (f.night ? 0.48 : 0.42)) * focusDimMul * blackoutMul) - env.rimLight.intensity) * lerpAmt;
    }
  }
  if (isMatchPointNow) {
    if (!env._mpTableCrimson) env._mpTableCrimson = new THREE.Color(0xe11d48);
    env.tableLight.color.lerp(env._mpTableCrimson, lerpAmt * 1.2);
  } else {
    env.tableLight.color.lerp(env.targetColors.table, lerpAmt);
  }
  env.tableLight.intensity = ((f.night ? 1.05 : 0.72) + env.dawnSweep * 0.22) * hazeDim * mpFlicker + Math.sin(t * 5.2) * 0.08 + Math.sin(t * 11.7) * 0.03;

  // Pacific Ocean Shimmer Shader + Gentle Wave Ripples + Cloud Isle Lighthouse Beacon
  if (env.oceanUniforms && env.oceanUniforms.uTime) {
    env.oceanUniforms.uTime.value = t;
  } else if (env.oceanBumpTex && env.oceanBumpTex.offset) {
    env.oceanBumpTex.offset.x = (t * 0.008) % 1;
    env.oceanBumpTex.offset.y = (t * 0.005) % 1;
  }
  if (env.cloudIsleBeacon) {
    env.cloudIsleBeacon.visible = !f.daylight;
    if (env.cloudIsleBeacon.visible) {
      const pulseOn = Math.sin(t * 2.2) > -0.2;
      env.cloudIsleBeacon.scale.setScalar(pulseOn ? 1.1 : 0.45);
    }
  }

  env.sunMesh.position.y += ((f.daylight ? 17.5 : -12) - env.sunMesh.position.y) * d04;
  env.sunMesh.visible = env.sunMesh.position.y > -8.0;
  if (env.sunMesh.visible) {
    env.sunHalo.rotation.z = t * 0.25;
    env.sunHalo.scale.setScalar(1 + env.dawnSweep * 0.45);
  }
  env.moonGroup.position.y += ((f.daylight ? -12 : 16.5) - env.moonGroup.position.y) * d04;
  env.moonGroup.visible = env.moonGroup.position.y > -8.0;
  env.starPoints.material.opacity += (((f.daylight ? 0.0 : (f.night ? 0.88 : 0.52))) - env.starPoints.material.opacity) * d05;
  env.starPoints.visible = env.starPoints.material.opacity > 0.008;
  if (env.starPoints.visible) env.starPoints.rotation.y = t * 0.008;
  if (env.valleyLights) {
    const targetCity = f.daylight ? 0.05 : (f.night ? 0.90 : 0.58);
    env.valleyLights.material.opacity += (targetCity - env.valleyLights.material.opacity) * d05;
    env.valleyLights.visible = env.valleyLights.material.opacity > 0.01;
  }
  if (env.cloudIsleMat) {
    env.cloudIsleMat.color.setHex(f.daylight ? 0x2f5a67 : (f.night ? 0x151e38 : 0x233852));
  }

  // Interactive Lotus Core + Live 3-Petal Three-Goodness Awakening!
  env.lotusSpinBoost *= Math.pow(0.94, dt60);
  const tg = (state.match && state.match.threeGood) || { heart: 0, words: 0, deeds: 0, resonanceTriggered: false };
  const litCount = (tg.heart > 0 ? 1 : 0) + (tg.words > 0 ? 1 : 0) + (tg.deeds > 0 ? 1 : 0);
  const pulse = 1 + Math.sin(t * 2.6) * 0.06 + env.lotusSpinBoost * 0.22 + litCount * 0.035;
  env.lotusGroup.position.y = 1.48 + Math.sin(t * 1.9) * 0.055 + env.lotusSpinBoost * 0.18;
  env.lotusGroup.rotation.y += (0.012 + (isVote ? 0.015 : 0) + env.lotusSpinBoost * 0.18 + (tg.resonanceTriggered ? 0.014 : 0)) * dt60;
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
    env.latticeScreenMat.emissiveIntensity += (targetLatEm - env.latticeScreenMat.emissiveIntensity) * d06;
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
        item.mat.emissiveIntensity += (targetEm - item.mat.emissiveIntensity) * d10;
        item.mesh.position.y += (targetY - item.mesh.position.y) * d10;
        item.mesh.rotation.x += (targetTilt - item.mesh.rotation.x) * d10;
        item.mesh.scale.setScalar(targetSc);
      }
    }
  }

  // Hanging Silk Lanterns (Halos + Tassel Secondary Sway), Incense Embers, Zero-GC Tea Steam & Clouds
  const lanternGlow = (f.daylight ? 0.52 : 1.48) * (isToxicHaze ? 0.58 : 1.0) * blackoutMul;
  env.lanternBodyMat.emissiveIntensity += (lanternGlow - env.lanternBodyMat.emissiveIntensity) * d05;
  if (env.lanternHaloMat) {
    const haloTarget = (f.daylight ? 0.08 : 0.25) * (isToxicHaze ? 0.55 : 1.0) + Math.sin(t * 3.6) * 0.025;
    env.lanternHaloMat.opacity += (haloTarget - env.lanternHaloMat.opacity) * d06;
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
  env._envFrame = (env._envFrame || 0) + 1;
  const isLiteEnv = Boolean((typeof stage3d !== "undefined" && stage3d.isIntegratedGpu) || (typeof state !== "undefined" && state.quality3D !== "high"));
  const runParticleTick = !isLiteEnv || (env._envFrame % 2 === 0);

  if (!isCelestialTheme) {
    if (env.bambooGroves && env.bambooGroves.length) {
      for (let bi = 0; bi < env.bambooGroves.length; bi++) {
        const bg = env.bambooGroves[bi];
        if (bg.canopy) {
          bg.canopy.rotation.z = Math.sin(t * 1.25 * windBoost + bg.phase) * 0.045 * windBoost;
          bg.canopy.rotation.x = Math.cos(t * 0.92 * windBoost + bg.phase) * 0.028 * windBoost;
        }
      }
    }
    if (env.blossomTrees && env.blossomTrees.length) {
      for (let ti = 0; ti < env.blossomTrees.length; ti++) {
        const bt = env.blossomTrees[ti];
        if (bt.canopy) {
          bt.canopy.rotation.z = Math.sin(t * 1.05 * windBoost + bt.phase) * 0.036 * windBoost;
          bt.canopy.rotation.x = Math.cos(t * 0.82 * windBoost + bt.phase) * 0.022 * windBoost;
        }
      }
    }
  } else {
    if (env.celestialSpireUniforms && env.celestialSpireUniforms.uTime) {
      env.celestialSpireUniforms.uTime.value = t;
    }
    if (env.celestialSpires && env.celestialSpires.length) {
      for (let si = 0; si < env.celestialSpires.length; si++) {
        const sp = env.celestialSpires[si];
        sp.group.position.y = sp.baseY + Math.sin(t * 0.42 + sp.phase) * sp.amp;
      }
    }
    if (env.celestialSteppingStones && env.celestialSteppingStones.length) {
      for (let sti = 0; sti < env.celestialSteppingStones.length; sti++) {
        const st = env.celestialSteppingStones[sti];
        st.group.position.y = st.baseY + Math.sin(t * 0.85 + st.phase) * 0.085;
      }
    }
    if (env.celestialCloudRibbon) {
      env.celestialCloudRibbon.rotation.y = -t * 0.016;
      env.celestialCloudRibbon.material.opacity = f.night ? 0.14 : 0.24;
    }
    if (env.celestialWisps && env.celestialWisps.visible && env.celestialWispMeta && env.celestialWispMeta.length && runParticleTick) {
      const wAttr = env.celestialWisps.geometry.attributes.position;
      for (let wi = 0; wi < env.celestialWispMeta.length; wi++) {
        const wm = env.celestialWispMeta[wi];
        const ang = wm.ang + t * 0.08 * wm.speed;
        const wy = ((wm.y0 + t * wm.speed * 0.72 + 1.2) % 7.4) - 0.8;
        wAttr.setXYZ(wi, Math.cos(ang) * wm.rad, wy, Math.sin(ang) * wm.rad);
      }
      wAttr.needsUpdate = true;
    }
  }
  if (env.incenseEmberMat) {
    env.incenseEmberMat.emissiveIntensity = 0.85 + Math.sin(t * 3.4) * 0.25;
  }
  if (env.teaSteamPoints && env.teaSteamPoints.visible && env.teaSteamMeta && env.teaSteamMeta.length > 0 && runParticleTick) {
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
      cMat.emissiveIntensity += (stoneTarget - cMat.emissiveIntensity) * d08;
    }
  }

  if (env.cloudPlanes && env.cloudPlanes.length > 0) {
    const cloudTargetOp = (f.daylight ? 0.18 : (f.night ? 0.12 : 0.16)) + (isToxicHaze ? 0.08 : (isClearBreeze ? -0.03 : 0));
    if (env.cloudSharedMat) {
      env.cloudSharedMat.color.lerp(env.targetColors.cloud, lerpAmt);
      env.cloudSharedMat.opacity += (cloudTargetOp - env.cloudSharedMat.opacity) * d05;
    }
    const cloudStride = isLiteEnv ? 3 : 2;
    if (env._envFrame % cloudStride === 0) {
      if (env.cloudInstancedMesh && env._cloudDummy) {
        const dc = env._cloudDummy;
        for (let ci = 0; ci < env.cloudPlanes.length; ci++) {
          const cl = env.cloudPlanes[ci];
          const ang = cl.ang + t * cl.speed;
          const cx = Math.cos(ang) * cl.rad;
          const cy = cl.y + Math.sin(t * 0.45 + cl.phase) * 0.18;
          const cz = Math.sin(ang) * cl.rad;
          dc.position.set(cx, cy, cz);
          dc.rotation.set(-0.08, Math.atan2(-cx, -cz), 0);
          dc.scale.set(cl.w || 10, cl.h || 4, 1);
          dc.updateMatrix();
          env.cloudInstancedMesh.setMatrixAt(ci, dc.matrix);
        }
        if (env.cloudInstancedMesh.instanceMatrix) env.cloudInstancedMesh.instanceMatrix.needsUpdate = true;
      } else {
        for (let ci = 0; ci < env.cloudPlanes.length; ci++) {
          const cl = env.cloudPlanes[ci];
          const ang = cl.ang + t * cl.speed;
          const cx = Math.cos(ang) * cl.rad;
          const cy = cl.y + Math.sin(t * 0.45 + cl.phase) * 0.18;
          const cz = Math.sin(ang) * cl.rad;
          cl.mesh.position.set(cx, cy, cz);
          cl.mesh.rotation.set(-0.08, Math.atan2(-cx, -cz), 0);
        }
      }
    }
  }

  if (env.mistRing) {
    const mistTargetOp = (f.night ? 0.09 : 0.05) + (isToxicHaze ? 0.10 : (isClearBreeze ? -0.02 : 0));
    env.mistRing.material.opacity += (mistTargetOp - env.mistRing.material.opacity) * d05;
    env.mistRing.visible = env.mistRing.material.opacity > 0.005;
    if (env.mistRing.visible) env.mistRing.rotation.y = t * (isToxicHaze ? 0.048 : 0.025);
  }
  if (env.resonancePillar) {
    const targetOp = tg.resonanceTriggered ? (0.16 + Math.sin(t * 3.5) * 0.05) : 0.0;
    env.resonancePillar.material.opacity += (targetOp - env.resonancePillar.material.opacity) * d08;
    env.resonancePillar.visible = env.resonancePillar.material.opacity > 0.005;
    if (env.resonancePillar.visible) env.resonancePillar.rotation.y = -t * 0.5;
  }

  // Volumetric God Rays + Drifting Liyue Bamboo Leaves & Osmanthus Petals (Three-Goodness Weather Reactive!)
  if (env.godRays && env.godRays.length && (!env.godRaysGroup || env.godRaysGroup.visible)) {
    const isFpCam = Boolean(typeof stage3d !== "undefined" && stage3d.camPreset === "firstperson");
    const rayMoodMul = (f.night || isFpCam) ? 0.0 : (isVote ? 0.92 : (f.daylight ? 1.0 : 0.72));
    const themeRayMul = isCelestialTheme ? 1.45 : 1.0;
    const breezeRayMul = isClearBreeze ? 1.42 : (isToxicHaze ? 0.35 : 1.0);
    for (let ri = 0; ri < env.godRays.length; ri++) {
      const gr = env.godRays[ri];
      const targetOp = gr.baseOp * rayMoodMul * themeRayMul * breezeRayMul * (0.85 + Math.sin(t * 0.7 + gr.phase) * 0.15);
      gr.mat.opacity += (targetOp - gr.mat.opacity) * d06;
      gr.mesh.visible = gr.mat.opacity > 0.005;
      gr.mesh.material.color.setHex(
        isVote ? 0xfdba74 : (isCelestialTheme ? 0xdffcf2 : (isClearBreeze ? 0xfff3b0 : (f.daylight ? 0xfff7d6 : 0xffdf9e)))
      );
    }
  }
  if (env.petals && env.petals.length && (!env.petalGroup || env.petalGroup.visible) && runParticleTick) {
    const pSpeedMul = isToxicHaze ? 1.75 : (isClearBreeze ? 1.45 : 1.0);
    if (env.petalBatches && env._petalDummy) {
      const dp = env._petalDummy;
      for (let pi = 0; pi < env.petals.length; pi++) {
        const pt = env.petals[pi];
        const fall = (t * pt.speed * pSpeedMul + pt.phase) % 6.2;
        const py = 6.8 - fall;
        const px = pt.x0 + Math.sin(t * 0.9 * pSpeedMul + pt.phase) * 1.15 + fall * (isToxicHaze ? 0.62 : 0.35);
        const pz = pt.z0 + Math.cos(t * 0.8 + pt.phase) * 0.95;
        dp.position.set(px, py < 0.25 ? 6.8 : py, pz);
        dp.rotation.set(t * 1.4 * pSpeedMul + pt.phase, t * 0.9 + pt.phase, Math.sin(t * 2.1 + pt.phase) * 0.7);
        dp.scale.set(1, 1, 1);
        dp.updateMatrix();
        env.petalBatches[pt.bucket].setMatrixAt(pt.instIdx, dp.matrix);
      }
      for (let bi = 0; bi < env.petalBatches.length; bi++) {
        if (env.petalBatches[bi].instanceMatrix) env.petalBatches[bi].instanceMatrix.needsUpdate = true;
      }
    } else {
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
  }

  // Drifting fireflies / golden dawn petals
  if (env.fireflyPoints && env.fireflyPoints.visible && runParticleTick) {
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
  if ((p === "DAY_SPEECH" || p === "DAY_PLAYER_TURN" || p === "LAST_WORDS_SPEECH" || p === "SHERIFF_ELECTION") && state.activeSpeakerId) {
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
    env.currentSpotPos.lerp(spotAnchor.worldPos, d14);
    env.spotTarget.position.set(env.currentSpotPos.x, 1.35, env.currentSpotPos.z);
    env.speakerSpot.position.set(env.currentSpotPos.x * 0.32, 10.8, env.currentSpotPos.z * 0.32);
    env.speakerSpot.color.setHex(dramaticFocusNow ? 0xffdf9e : spotColorHex);
    const targetSpotInt = (dramaticFocusNow ? 3.65 : 2.5) * blackoutMul;
    env.speakerSpot.intensity += (targetSpotInt - env.speakerSpot.intensity) * d12;

    env.spotCone.position.set(env.currentSpotPos.x, 9.6, env.currentSpotPos.z);
    env.spotCone.material.color.setHex(dramaticFocusNow ? 0xffdf9e : spotColorHex);
    const coneTargetOp = (dramaticFocusNow ? (f.daylight ? 0.07 : 0.22) : (f.daylight ? 0.025 : 0.16)) * blackoutMul;
    env.spotCone.material.opacity += (coneTargetOp - env.spotCone.material.opacity) * d12;
    env.spotCone.visible = env.spotCone.material.opacity > 0.004;
  } else {
    env.speakerSpot.intensity += (0 - env.speakerSpot.intensity) * d10;
    env.spotCone.material.opacity += (0 - env.spotCone.material.opacity) * d10;
    env.spotCone.visible = env.spotCone.material.opacity > 0.004;
  }
}
