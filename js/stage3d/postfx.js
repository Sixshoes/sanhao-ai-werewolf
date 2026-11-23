/**
 * 電影級 3D HDR 後製光影管線（EffectComposer + UnrealBloomPass + ACES Filmic 色調與鏡頭暗角）
 * 高畫質模式自動啟用真實 HDR 輝光；省電模式或離線降級環境平滑關閉不卡頓
 */
"use strict";

function build3DPostFx(renderer, scene, camera, opts) {
  if (
    !renderer || !scene || !camera ||
    typeof THREE.EffectComposer !== "function" ||
    typeof THREE.RenderPass !== "function" ||
    typeof THREE.ShaderPass !== "function" ||
    typeof THREE.UnrealBloomPass !== "function" ||
    typeof THREE.WebGLRenderTarget !== "function"
  ) {
    return null;
  }

  try {
    const preferLightweight = Boolean(opts && opts.preferLightweight);
    const w = 1280;
    const h = 720;
    const isWebGL2 = Boolean(renderer.capabilities && renderer.capabilities.isWebGL2);
    const hasHalfFloatExt = Boolean(renderer.extensions && renderer.extensions.get && renderer.extensions.get("EXT_color_buffer_float"));
    const canHalfFloat = Boolean(!preferLightweight && isWebGL2 && hasHalfFloatExt && THREE.HalfFloatType);

    let rt = null;
    let isMsaa = false;
    if (!preferLightweight && isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === "function") {
      try {
        const gl = typeof renderer.getContext === "function" ? renderer.getContext() : null;
        let msaaHalfFloatOk = false;
        if (canHalfFloat && gl && typeof gl.getInternalformatParameter === "function" && gl.RGBA16F && gl.SAMPLES) {
          const sampleArr = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES);
          msaaHalfFloatOk = Boolean(sampleArr && sampleArr.length > 0 && sampleArr[0] >= 4);
        }
        rt = new THREE.WebGLMultisampleRenderTarget(w, h, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: msaaHalfFloatOk ? THREE.HalfFloatType : THREE.UnsignedByteType
        });
        rt.samples = 4;
        isMsaa = true;
      } catch (msaaErr) {
        rt = null;
        isMsaa = false;
      }
    }
    if (!rt) {
      rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: canHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType
      });
    }

    const composer = new THREE.EffectComposer(renderer, rt);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomW = Math.max(128, Math.floor(w * 0.5));
    const bloomH = Math.max(128, Math.floor(h * 0.5));
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(bloomW, bloomH), 0.22, 0.42, 1.10);
    composer.addPass(bloomPass);

    const gradeShader = {
      uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: 1.00 },
        uExposureBoost: { value: 0.0 },
        uContrast: { value: 1.05 },
        uVignette: { value: 0.14 },
        uSaturation: { value: 1.14 },
        uWarmTint: { value: new THREE.Vector3(1.02, 1.01, 0.98) },
        uShadowTint: { value: new THREE.Vector3(0.96, 0.98, 1.04) },
        uShadowLift: { value: new THREE.Vector3(0.006, 0.006, 0.011) },
        uTexelSize: { value: new THREE.Vector2(1 / w, 1 / h) },
        uUseFxaa: { value: isMsaa ? 0.0 : 1.0 },
        uTime: { value: 0.0 }
      },
      vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "  vUv = uv;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D tDiffuse;",
        "uniform float uExposure;",
        "uniform float uExposureBoost;",
        "uniform float uContrast;",
        "uniform float uVignette;",
        "uniform float uSaturation;",
        "uniform vec3 uWarmTint;",
        "uniform vec3 uShadowTint;",
        "uniform vec3 uShadowLift;",
        "uniform vec2 uTexelSize;",
        "uniform float uUseFxaa;",
        "uniform float uTime;",
        "varying vec2 vUv;",
        "float lumaOf(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }",
        "vec3 sampleSmooth(vec2 uv) {",
        "  vec3 cM = texture2D(tDiffuse, uv).rgb;",
        "  if (uUseFxaa < 0.5) return cM;",
        "  vec3 cNW = texture2D(tDiffuse, uv + vec2(-uTexelSize.x, -uTexelSize.y)).rgb;",
        "  vec3 cNE = texture2D(tDiffuse, uv + vec2( uTexelSize.x, -uTexelSize.y)).rgb;",
        "  vec3 cSW = texture2D(tDiffuse, uv + vec2(-uTexelSize.x,  uTexelSize.y)).rgb;",
        "  vec3 cSE = texture2D(tDiffuse, uv + vec2( uTexelSize.x,  uTexelSize.y)).rgb;",
        "  float lM = lumaOf(cM);",
        "  float lMin = min(lM, min(min(lumaOf(cNW), lumaOf(cNE)), min(lumaOf(cSW), lumaOf(cSE))));",
        "  float lMax = max(lM, max(max(lumaOf(cNW), lumaOf(cNE)), max(lumaOf(cSW), lumaOf(cSE))));",
        "  float contrast = lMax - lMin;",
        "  float blend = smoothstep(0.08, 0.34, contrast) * 0.42;",
        "  return mix(cM, (cNW + cNE + cSW + cSE) * 0.25, blend);",
        "}",
        "vec3 acesFilmic(vec3 x) {",
        "  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);",
        "}",
        "void main() {",
        "  vec4 texel = texture2D(tDiffuse, vUv);",
        "  vec3 baseCol = sampleSmooth(vUv);",
        "  vec3 col = max(baseCol * (uExposure + uExposureBoost), vec3(0.0));",
        "  col += uShadowLift * (1.0 - smoothstep(0.0, 0.35, dot(col, vec3(0.333))));",
        "  col = acesFilmic(col);",
        "  col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);",
        "  float luma = lumaOf(col);",
        "  vec3 splitTone = mix(uShadowTint, uWarmTint, smoothstep(0.18, 0.78, luma));",
        "  col = mix(vec3(luma), col, uSaturation) * splitTone;",
        "  float d = distance(vUv, vec2(0.5));",
        "  col *= mix(1.0, 1.0 - uVignette, smoothstep(0.35, 0.92, d));",
        "  float grain = (fract(sin(dot(vUv * 420.0 + uTime * 1.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.006;",
        "  col = pow(clamp(col + grain, vec3(0.0), vec3(1.0)), vec3(1.0 / 2.2));",
        "  gl_FragColor = vec4(col, texel.a);",
        "}"
      ].join("\n")
    };

    const gradePass = new THREE.ShaderPass(gradeShader);
    composer.addPass(gradePass);

    const tmpWarm = new THREE.Vector3();
    const tmpShadowTint = new THREE.Vector3();
    const tmpShadow = new THREE.Vector3();
    return {
      composer: composer,
      bloomPass: bloomPass,
      gradePass: gradePass,
      isMsaa: isMsaa,
      resize: function (width, height, dpr) {
        const effDpr = dpr || 1;
        if (typeof composer.setPixelRatio === "function") composer.setPixelRatio(effDpr);
        composer.setSize(width, height);
        bloomPass.setSize(Math.max(128, Math.floor(width * 0.5)), Math.max(128, Math.floor(height * 0.5)));
        if (gradePass.uniforms && gradePass.uniforms.uTexelSize && gradePass.uniforms.uTexelSize.value) {
          gradePass.uniforms.uTexelSize.value.set(1 / Math.max(1, width * effDpr), 1 / Math.max(1, height * effDpr));
        }
      },
      setDynamicExposure: function (boost) {
        if (gradePass.uniforms && gradePass.uniforms.uExposureBoost) {
          gradePass.uniforms.uExposureBoost.value += ((boost || 0) - gradePass.uniforms.uExposureBoost.value) * 0.14;
        }
      },
      updateMood: function (f, harmony) {
        const p = f.p;
        const isVote = (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT");
        const mood = f.daylight ? (isVote ? "vote" : "day") : (f.night ? "night" : "twilight");
        const isCelestial = Boolean(typeof state !== "undefined" && state.sceneTheme === "celestial");
        const harmBoost = (harmony >= 85 ? 0.05 : 0) + (isCelestial ? 0.04 : 0);

        let tStrength = 0.22;
        let tThresh = 1.08;
        let tExp = 1.03;
        let tContrast = 1.06;
        let tVig = 0.15;
        let rx = 1.04, gy = 1.01, bz = 0.96;
        let stx = 0.96, sty = 0.98, stz = 1.04;
        let sx = 0.005, sy = 0.006, sz = 0.011;

        if (mood === "day") {
          tStrength = isCelestial ? 0.16 : 0.12;
          tThresh = isCelestial ? 1.18 : 1.24;
          tExp = isCelestial ? 0.99 : 0.97;
          tContrast = 1.06;
          tVig = isCelestial ? 0.08 : 0.10;
          rx = isCelestial ? 1.00 : 1.03;
          gy = isCelestial ? 1.03 : 1.01;
          bz = isCelestial ? 1.02 : 0.97;
          stx = isCelestial ? 0.93 : 0.96;
          sty = isCelestial ? 1.01 : 0.99;
          stz = isCelestial ? 1.05 : 1.03;
          sx = 0.004; sy = 0.006; sz = 0.009;
        } else if (mood === "vote") {
          tStrength = 0.27; tThresh = 1.02; tExp = 1.04;
          tContrast = 1.08; tVig = 0.18;
          rx = 1.08; gy = 0.98; bz = 0.91;
          stx = 0.98; sty = 0.94; stz = 1.03;
          sx = 0.008; sy = 0.005; sz = 0.009;
        } else if (mood === "night") {
          tStrength = 0.29; tThresh = 1.00; tExp = 1.08;
          tContrast = 1.08; tVig = 0.21;
          rx = 1.01; gy = 1.00; bz = 1.02;
          stx = 0.93; sty = 0.96; stz = 1.08;
          sx = 0.006; sy = 0.008; sz = 0.016;
        }

        bloomPass.strength += ((tStrength + harmBoost) - bloomPass.strength) * 0.08;
        bloomPass.threshold += (tThresh - bloomPass.threshold) * 0.08;
        const u = gradePass.uniforms;
        u.uExposure.value += (tExp - u.uExposure.value) * 0.08;
        u.uContrast.value += (tContrast - u.uContrast.value) * 0.08;
        u.uVignette.value += (tVig - u.uVignette.value) * 0.08;
        if (u.uTime) u.uTime.value = (f.tSec || 0) % 60;
        tmpWarm.set(rx, gy, bz);
        tmpShadowTint.set(stx, sty, stz);
        tmpShadow.set(sx, sy, sz);
        u.uWarmTint.value.lerp(tmpWarm, 0.08);
        u.uShadowTint.value.lerp(tmpShadowTint, 0.08);
        u.uShadowLift.value.lerp(tmpShadow, 0.08);
      },
      render: function () {
        composer.render();
      }
    };
  } catch (e) {
    return null;
  }
}
