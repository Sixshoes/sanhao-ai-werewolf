/**
 * 原神風格化 NPR 二次元著色器與動畫模型幾何工廠（Three.js r128）
 * 包含：
 * - 三段明暗卡通階調著色器（Genshin Luminous Shadow Lift＋逆光邊緣金光＋天使環髮絲高光）
 * - 背面法線擠出柔和深咖／墨色細描邊（Anime Ink Outline）
 * - 瓜子臉二次元頭型變形與貼合臉部曲面
 * - 漸細新月緞帶式動漫髮束生成器（Tapered Ribbon Hair Lock）
 */
"use strict";

const stage3dAnime = {
  cache: {
    gradientMap: null,
    outlines: {}
  },

  /**
   * 建立 16×1 光滑階梯式卡通明暗貼圖（陰影明亮不發黑，呈現原神璃月清透色感）
   */
  getToonGradientMap: function () {
    if (this.cache.gradientMap) return this.cache.gradientMap;
    if (typeof THREE === "undefined" || typeof THREE.DataTexture !== "function" || !THREE.RGBAFormat) {
      return null;
    }
    const w = 16;
    const data = new Uint8Array(w * 4);
    for (let i = 0; i < w; i++) {
      let lum = 250;
      if (i <= 4) lum = 36;        // Clean cel shadow band (prevents multi-light 4x white blowout!)
      else if (i === 5) lum = 108; // Soft anti-aliased cel terminator
      else if (i <= 10) lum = 186; // Luminous rich midtone
      else if (i === 11) lum = 226;
      else lum = 250;              // Crisp sunlit highlight
      data[i * 4] = lum;
      data[i * 4 + 1] = lum;
      data[i * 4 + 2] = lum;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter || THREE.NearestFilter;
    tex.magFilter = THREE.LinearFilter || THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.cache.gradientMap = tex;
    return tex;
  },

  /**
   * 建立原神風賽璐珞動漫材質：支援暗部冷暖染色、Fresnel 逆光金邊與頭髮天使光環
   */
  createAnimeMaterial: function (opts) {
    const o = opts || {};
    const colHex = o.color !== undefined ? o.color : 0xffffff;
    if (typeof THREE === "undefined" || typeof THREE.MeshToonMaterial !== "function") {
      return new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: o.emissive !== undefined ? o.emissive : 0x000000,
        emissiveIntensity: o.emissiveIntensity !== undefined ? o.emissiveIntensity : 0,
        roughness: 0.52,
        metalness: 0.04
      });
    }

    const gradMap = this.getToonGradientMap();
    const matOpts = {
      color: colHex,
      gradientMap: gradMap
    };
    if (o.map) matOpts.map = o.map;
    if (o.bumpMap) {
      matOpts.bumpMap = o.bumpMap;
      matOpts.bumpScale = o.bumpScale !== undefined ? o.bumpScale : 0.015;
    }
    if (o.emissive !== undefined) matOpts.emissive = o.emissive;
    if (o.emissiveIntensity !== undefined) matOpts.emissiveIntensity = o.emissiveIntensity;
    if (o.side !== undefined) matOpts.side = o.side;
    if (o.skinning) matOpts.skinning = true;
    if (o.morphTargets) matOpts.morphTargets = true;
    if (o.morphNormals) matOpts.morphNormals = true;
    if (o.alphaTest !== undefined && o.alphaTest > 0) matOpts.alphaTest = o.alphaTest;
    if (o.depthWrite !== undefined) matOpts.depthWrite = o.depthWrite;
    if (o.transparent) {
      matOpts.transparent = true;
      matOpts.opacity = o.opacity !== undefined ? o.opacity : 1.0;
    }

    const mat = new THREE.MeshToonMaterial(matOpts);
    const rimCol = new THREE.Color(o.rimColor !== undefined ? o.rimColor : 0xfff3cf);
    const shadowTint = new THREE.Color(o.shadowTint !== undefined ? o.shadowTint : 0xdcc8e8);
    const hairRingCol = new THREE.Color(o.hairRingColor !== undefined ? o.hairRingColor : 0xffe6b3);
    if (typeof rimCol.convertSRGBToLinear === "function") rimCol.convertSRGBToLinear();
    if (typeof shadowTint.convertSRGBToLinear === "function") shadowTint.convertSRGBToLinear();
    if (typeof hairRingCol.convertSRGBToLinear === "function") hairRingCol.convertSRGBToLinear();

    const rimStrength = o.rimStrength !== undefined ? o.rimStrength : 0.18;
    const rimPower = o.rimPower !== undefined ? o.rimPower : 3.4;
    const shadowLift = o.shadowLift !== undefined ? o.shadowLift : 0.12;
    const hairRingStrength = (o.isHair ? (o.hairRingStrength !== undefined ? o.hairRingStrength : 0.16) : 0.0);

    mat.customProgramCacheKey = function () {
      return "sanhao_anime_toon_v2";
    };
    mat.onBeforeCompile = function (shader) {
      if (!shader || !shader.fragmentShader) return;
      shader.uniforms.uAnimeRimColor = { value: rimCol };
      shader.uniforms.uAnimeRimStrength = { value: rimStrength };
      shader.uniforms.uAnimeRimPower = { value: rimPower };
      shader.uniforms.uAnimeShadowTint = { value: shadowTint };
      shader.uniforms.uAnimeShadowLift = { value: shadowLift };
      shader.uniforms.uAnimeHairRingColor = { value: hairRingCol };
      shader.uniforms.uAnimeHairRingStrength = { value: hairRingStrength };

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uAnimeRimColor;",
          "uniform float uAnimeRimStrength;",
          "uniform float uAnimeRimPower;",
          "uniform vec3 uAnimeShadowTint;",
          "uniform float uAnimeShadowLift;",
          "uniform vec3 uAnimeHairRingColor;",
          "uniform float uAnimeHairRingStrength;"
        ].join("\n")
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
        [
          "vec3 animeN = normalize( geometry.normal );",
          "vec3 animeV = normalize( geometry.viewDir );",
          "float animeFresnel = pow( clamp( 1.0 - max( dot( animeN, animeV ), 0.0 ), 0.0, 1.0 ), uAnimeRimPower );",
          "float animeRimBias = smoothstep( -0.20, 0.75, animeN.y );",
          "vec3 animeRim = uAnimeRimColor * animeFresnel * uAnimeRimStrength * ( 0.40 + 0.60 * animeRimBias );",
          "vec3 animeMinTint = diffuseColor.rgb * uAnimeShadowTint * uAnimeShadowLift;",
          "outgoingLight = min( max( outgoingLight * 0.68, animeMinTint ) + animeRim, vec3( 1.02 ) );",
          "if ( uAnimeHairRingStrength > 0.001 ) {",
          "  float ringY = abs( animeN.y - 0.38 );",
          "  float ringMask = smoothstep( 0.18, 0.03, ringY ) * pow( max( animeN.z, 0.0 ), 1.4 );",
          "  float ringPulse = sin( animeN.x * 9.0 ) * 0.16 + 0.84;",
          "  outgoingLight = min( outgoingLight + uAnimeHairRingColor * ( ringMask * ringPulse * uAnimeHairRingStrength ), vec3( 1.05 ) );",
          "}",
          "gl_FragColor = vec4( outgoingLight, diffuseColor.a );"
        ].join("\n")
      );
    };

    // Preserve quick color reference for materials that update color dynamically
    mat.userData = mat.userData || {};
    mat.userData.isAnimeToon = true;
    mat.userData.shadowTintUniform = shadowTint;
    return mat;
  },

  /**
   * 將原生無光照 VRM 材質（KHR_materials_unlit / MeshBasicMaterial）升級為輕量賽璐珞受光材質
   * 保留原 VRM 貼圖、alphaTest、skinning 與 morphTargets，並注入逆光金邊與桌心燭火暖補光
   */
  upgradeVrmMaterialToCel: function (srcMat, opts) {
    if (!srcMat || typeof THREE === "undefined" || typeof THREE.MeshToonMaterial !== "function") {
      return srcMat;
    }
    const o = opts || {};
    const isFace = Boolean(o.isFace);
    const isHair = Boolean(o.isHair);
    const gradMap = this.getToonGradientMap();
    const matOpts = {
      color: srcMat.color ? srcMat.color.clone() : new THREE.Color(0xffffff),
      gradientMap: gradMap,
      side: srcMat.side !== undefined ? srcMat.side : THREE.FrontSide
    };
    if (srcMat.map) {
      if (THREE.sRGBEncoding !== undefined) srcMat.map.encoding = THREE.sRGBEncoding;
      matOpts.map = srcMat.map;
    }
    if (srcMat.normalMap) matOpts.normalMap = srcMat.normalMap;
    if (srcMat.alphaTest !== undefined && srcMat.alphaTest > 0) matOpts.alphaTest = srcMat.alphaTest;
    else if (srcMat.transparent) matOpts.alphaTest = 0.35;
    if (srcMat.transparent) {
      matOpts.transparent = true;
      matOpts.opacity = srcMat.opacity !== undefined ? srcMat.opacity : 1.0;
    }
    if (srcMat.depthWrite !== undefined) matOpts.depthWrite = srcMat.depthWrite;
    if (o.skinning || srcMat.skinning) matOpts.skinning = true;
    if (o.morphTargets || srcMat.morphTargets) matOpts.morphTargets = true;
    if (o.morphNormals || srcMat.morphNormals) matOpts.morphNormals = true;

    const celMat = new THREE.MeshToonMaterial(matOpts);
    celMat.name = srcMat.name || "";

    const rimCol = new THREE.Color(isHair ? 0xffe8b6 : 0xfff2d6);
    const shadowTint = new THREE.Color(isFace ? 0xf2e4ee : 0xd6cce8);
    if (typeof rimCol.convertSRGBToLinear === "function") rimCol.convertSRGBToLinear();
    if (typeof shadowTint.convertSRGBToLinear === "function") shadowTint.convertSRGBToLinear();

    const uniforms = {
      uVrmRimColor: { value: rimCol },
      uVrmRimStrength: { value: isFace ? 0.14 : (isHair ? 0.28 : 0.22) },
      uVrmShadowTint: { value: shadowTint },
      uVrmShadowLift: { value: isFace ? 0.64 : 0.44 },
      uVrmWarmBounce: { value: isFace ? 0.11 : 0.14 },
      uVrmClothHarm: { value: (isFace || isHair) ? 0.0 : 1.0 }
    };

    celMat.customProgramCacheKey = function () {
      return "sanhao_vrm_cel_v2";
    };
    celMat.onBeforeCompile = function (shader) {
      if (!shader || !shader.fragmentShader) return;
      shader.uniforms.uVrmRimColor = uniforms.uVrmRimColor;
      shader.uniforms.uVrmRimStrength = uniforms.uVrmRimStrength;
      shader.uniforms.uVrmShadowTint = uniforms.uVrmShadowTint;
      shader.uniforms.uVrmShadowLift = uniforms.uVrmShadowLift;
      shader.uniforms.uVrmWarmBounce = uniforms.uVrmWarmBounce;
      shader.uniforms.uVrmClothHarm = uniforms.uVrmClothHarm;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uVrmRimColor;",
          "uniform float uVrmRimStrength;",
          "uniform vec3 uVrmShadowTint;",
          "uniform float uVrmShadowLift;",
          "uniform float uVrmWarmBounce;",
          "uniform float uVrmClothHarm;"
        ].join("\n")
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
        [
          "vec3 vrmN = normalize( geometry.normal );",
          "vec3 vrmV = normalize( geometry.viewDir );",
          "float vrmFresnel = pow( clamp( 1.0 - max( dot( vrmN, vrmV ), 0.0 ), 0.0, 1.0 ), 3.2 );",
          "float vrmRimMask = smoothstep( -0.22, 0.74, vrmN.y );",
          "vec3 vrmRim = uVrmRimColor * vrmFresnel * uVrmRimStrength * ( 0.42 + 0.58 * vrmRimMask );",
          "float vrmUnder = clamp( -vrmN.y * 0.55 + 0.45, 0.0, 1.0 );",
          "vec3 vrmCandleBounce = diffuseColor.rgb * vec3( 1.0, 0.78, 0.48 ) * uVrmWarmBounce * vrmUnder;",
          "vec3 vrmMinFloor = diffuseColor.rgb * uVrmShadowTint * uVrmShadowLift;",
          "vec3 vrmOut = min( max( outgoingLight * 0.80, vrmMinFloor ) + vrmRim + vrmCandleBounce, vec3( 1.12 ) );",
          "if ( uVrmClothHarm > 0.5 ) {",
          "  float vrmLum = dot( vrmOut, vec3( 0.299, 0.587, 0.114 ) );",
          "  vrmOut = mix( vrmOut, vec3( vrmLum ), 0.11 );",
          "  vrmOut = mix( vrmOut, vrmOut * vec3( 1.04, 0.99, 0.92 ), 0.35 );",
          "}",
          "outgoingLight = vrmOut;",
          "gl_FragColor = vec4( outgoingLight, diffuseColor.a );"
        ].join("\n")
      );
    };

    celMat.userData = celMat.userData || {};
    celMat.userData.isVrmCel = true;
    celMat.userData.isFace = isFace;
    celMat.userData.isHair = isHair;
    celMat.userData.vrmCelUniforms = uniforms;
    return celMat;
  },

  /**
   * 取得快取的柔和暖褐／墨線二次元外輪廓 ShaderMaterial
   */
  getOutlineMaterial: function (colorHex, width) {
    const cHex = colorHex !== undefined ? colorHex : 0x2d1b18;
    const w = width !== undefined ? width : 0.011;
    const key = cHex + ":" + w.toFixed(4);
    if (this.cache.outlines[key]) return this.cache.outlines[key];
    if (typeof THREE === "undefined" || typeof THREE.ShaderMaterial !== "function") {
      return null;
    }

    const col = new THREE.Color(cHex);
    if (typeof col.convertSRGBToLinear === "function") col.convertSRGBToLinear();

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOutlineColor: { value: col },
        uOutlineWidth: { value: w }
      },
      vertexShader: [
        "uniform float uOutlineWidth;",
        "void main() {",
        "  vec3 norm = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);",
        "  vec3 extruded = position + norm * uOutlineWidth;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uOutlineColor;",
        "void main() {",
        "  gl_FragColor = vec4(uOutlineColor, 1.0);",
        "}"
      ].join("\n"),
      side: THREE.BackSide
    });
    this.cache.outlines[key] = mat;
    return mat;
  },

  /**
   * 為角色主要網格加上原神風細膩暖棕／墨色描邊
   */
  addAnimeOutline: function (mesh, width, colorHex) {
    if (!mesh || !mesh.geometry) return null;
    const outMat = this.getOutlineMaterial(colorHex, width);
    if (!outMat) return null;
    const outline = new THREE.Mesh(mesh.geometry, outMat);
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.userData = { isAnimeOutline: true };
    mesh.add(outline);
    return outline;
  },

  /**
   * 將球體頂點雕塑為二次元瓜子臉比例（微收下顎線條、雙頰立體、額前平順）
   */
  deformAnimeHeadVertex: function (x, y, z, baseR) {
    const invR = 1 / Math.max(0.001, baseR);
    const nx = x * invR;
    const ny = y * invR;
    const nz = z * invR;

    // Gentle V-taper along chin & lower jawline
    let taperXZ = 1.0;
    if (ny < 0.12) {
      const tLow = clamp((0.12 - ny) / 1.12, 0, 1);
      taperXZ = 1.0 - 0.24 * Math.pow(tLow, 1.32);
    }
    // Slight crown fullness at upper back cranium
    if (ny > 0.2 && nz < 0.1) {
      taperXZ += 0.04 * (ny - 0.2);
    }

    let dx = x * taperXZ;
    let dy = y * (ny < 0 ? 1.06 : 1.02);
    let dz = z * taperXZ;

    // Subtle soft planar flattening across the front eye zone so anime eyes read clearly
    if (nz > 0.35 && ny > -0.32 && ny < 0.38) {
      const fMask = clamp((nz - 0.35) / 0.65, 0, 1) * (1 - Math.abs(ny) * 0.7);
      dz -= baseR * 0.048 * Math.max(0, fMask);
    }
    // Delicate chin point forward & slightly down
    if (ny < -0.52 && nz > 0.1) {
      const chinF = clamp((-ny - 0.52) / 0.48, 0, 1) * clamp(nz, 0, 1);
      dz += baseR * 0.045 * chinF;
      dy -= baseR * 0.025 * chinF;
    }
    return [dx, dy, dz];
  },

  createAnimeHeadGeometry: function (baseR) {
    const r = baseR || 0.42;
    const geo = new THREE.SphereGeometry(r, 32, 24);
    const pos = geo && geo.attributes ? geo.attributes.position : null;
    if (!pos || typeof pos.count !== "number" || typeof pos.getX !== "function") {
      return geo;
    }
    for (let i = 0; i < pos.count; i++) {
      const d = this.deformAnimeHeadVertex(pos.getX(i), pos.getY(i), pos.getZ(i), r);
      pos.setXYZ(i, d[0], d[1], d[2]);
    }
    pos.needsUpdate = true;
    if (typeof geo.computeVertexNormals === "function") geo.computeVertexNormals();
    return geo;
  },

  createAnimeFacePatchGeometry: function (baseR) {
    const r = baseR || 0.425;
    const geo = new THREE.SphereGeometry(r, 28, 20, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.26, Math.PI * 0.50);
    const pos = geo && geo.attributes ? geo.attributes.position : null;
    if (!pos || typeof pos.count !== "number" || typeof pos.getX !== "function") {
      return geo;
    }
    for (let i = 0; i < pos.count; i++) {
      const d = this.deformAnimeHeadVertex(pos.getX(i), pos.getY(i), pos.getZ(i), r);
      pos.setXYZ(i, d[0], d[1], d[2]);
    }
    pos.needsUpdate = true;
    if (typeof geo.computeVertexNormals === "function") geo.computeVertexNormals();
    return geo;
  },

  /**
   * 漸細新月緞帶式動漫髮束生成器（無生硬香腸斷面，髮尾收尖自然飄逸）
   */
  createTaperedHairLockGeo: function (points, rBase, rTip, aspect, segs, radialSegs) {
    if (
      typeof THREE === "undefined" ||
      !THREE.BufferGeometry ||
      typeof THREE.BufferAttribute !== "function" ||
      typeof THREE.QuadraticBezierCurve3 !== "function"
    ) {
      return new THREE.ConeGeometry(rBase || 0.05, 0.25, 6);
    }
    const pts = points || [
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, -0.1, 0.05),
      new THREE.Vector3(0, -0.3, 0.02)
    ];
    const curve = (pts.length >= 4 && typeof THREE.CatmullRomCurve3 === "function")
      ? new THREE.CatmullRomCurve3(pts)
      : new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[pts.length - 1]);

    const tSteps = segs || 12;
    const rSteps = radialSegs || 8;
    const rb = rBase !== undefined ? rBase : 0.055;
    const rt = rTip !== undefined ? rTip : 0.004;
    const asp = aspect !== undefined ? aspect : 1.48;

    const verts = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= tSteps; i++) {
      const u = i / tSteps;
      const pt = curve.getPoint(u);
      const tRaw = typeof curve.getTangent === "function" ? curve.getTangent(u) : null;
      let tx = tRaw ? tRaw.x : 0, ty = tRaw ? tRaw.y : -1, tz = tRaw ? tRaw.z : 0;
      const tLen = Math.hypot(tx, ty, tz) || 1;
      tx /= tLen; ty /= tLen; tz /= tLen;

      // Keep wide face of hair ribbon tangent to spherical scalp around (0,0,0)
      let bx = pt.x, by = 0.14, bz = pt.z;
      if (bx * bx + by * by + bz * bz < 0.002) { bx = 0; by = 0; bz = 1; }
      const dotTB = bx * tx + by * ty + bz * tz;
      bx -= tx * dotTB; by -= ty * dotTB; bz -= tz * dotTB;
      let bLenSq = bx * bx + by * by + bz * bz;
      if (bLenSq < 1e-5) {
        bx = Math.abs(tz) < 0.9 ? 0 : 1; by = 0; bz = Math.abs(tz) < 0.9 ? 1 : 0;
        const d2 = bx * tx + by * ty + bz * tz;
        bx -= tx * d2; by -= ty * d2; bz -= tz * d2;
        bLenSq = bx * bx + by * by + bz * bz;
      }
      const bLen = Math.sqrt(bLenSq) || 1;
      bx /= bLen; by /= bLen; bz /= bLen;

      let rx = ty * bz - tz * by;
      let ry = tz * bx - tx * bz;
      let rz = tx * by - ty * bx;
      const rLen = Math.hypot(rx, ry, rz) || 1;
      rx /= rLen; ry /= rLen; rz /= rLen;

      const rootBell = u < 0.14 ? (0.72 + 0.28 * (u / 0.14)) : 1.0;
      const taper = Math.pow(Math.max(0, 1 - u), 0.72);
      const radW = (rt + (rb - rt) * taper * rootBell) * asp;
      const radD = (rt + (rb - rt) * taper * rootBell) * 0.56;

      for (let j = 0; j <= rSteps; j++) {
        const theta = (j / rSteps) * Math.PI * 2;
        const c = Math.cos(theta) * radW;
        const s = Math.sin(theta) * radD;
        verts.push(
          pt.x + rx * c + bx * s,
          pt.y + ry * c + by * s,
          pt.z + rz * c + bz * s
        );
        uvs.push(j / rSteps, u);
      }
    }

    for (let i = 0; i < tSteps; i++) {
      for (let j = 0; j < rSteps; j++) {
        const a = i * (rSteps + 1) + j;
        const b = (i + 1) * (rSteps + 1) + j;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    if (typeof geo.setIndex === "function") geo.setIndex(indices);
    if (typeof geo.computeVertexNormals === "function") geo.computeVertexNormals();
    return geo;
  }
};
