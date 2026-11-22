/**
 * 3D 零 GC 物件池特效層（Three.js r128）
 * 透過預建可重用 BufferGeometry 與物件池，徹底消除每幀 new/dispose 造成的 GC 抖動；
 * 負責 3D 拋物線關係弧線、3D 拖曳能量光弧、飛票球體／票卡、衝擊波、角色技能光柱與熄滅燭火青煙
 */
"use strict";

const ARC_SEGMENTS = 24;
const BEAM_POOL_SIZE = 12;
const SHOCK_POOL_SIZE = 14;
const SMOKE_POOL_SIZE = 32;

function createPooledArcEntry(orbGeo, cardGeo, cardTex) {
  const positions = new Float32Array((ARC_SEGMENTS + 1) * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.92 });
  const line = new THREE.Line(lineGeo, lineMat);
  line.frustumCulled = false;
  line.visible = false;

  // Zero-GC 3D Luminous Tapered Ribbon Strip (replaces thin 1px WebGL line visual with bold glowing arc!)
  const ribPositions = new Float32Array((ARC_SEGMENTS + 1) * 2 * 3);
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute("position", new THREE.BufferAttribute(ribPositions, 3));
  if (typeof ribGeo.setIndex === "function") {
    const ribIdx = [];
    for (let i = 0; i < ARC_SEGMENTS; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      ribIdx.push(a, b, c, b, d, c);
    }
    ribGeo.setIndex(ribIdx);
  }
  const ribMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ribbon = new THREE.Mesh(ribGeo, ribMat);
  ribbon.frustumCulled = false;
  ribbon.visible = false;

  const orbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.visible = false;

  const cardMat = cardTex
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, map: cardTex })
    : new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const card = new THREE.Mesh(cardGeo, cardMat);
  card.visible = false;

  // 5 Luminous beads gliding along the arc for crisp tapered comet trail without TubeGeometry GC!
  const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const beads = [];
  for (let b = 0; b < 5; b++) {
    const bm = new THREE.Mesh(orbGeo, beadMat);
    bm.scale.setScalar(Math.max(0.16, 0.48 - b * 0.075));
    bm.visible = false;
    beads.push(bm);
  }

  return { line: line, lineGeo: lineGeo, lineMat: lineMat, ribbon: ribbon, ribGeo: ribGeo, ribMat: ribMat, orb: orb, orbMat: orbMat, card: card, cardMat: cardMat, beads: beads };
}

function writeQuadraticArcToBuffer(entry, p0, mid, p2, maxProgress, halfWidth) {
  const posAttr = entry.lineGeo.attributes.position;
  const ribAttr = entry.ribGeo && entry.ribGeo.attributes ? entry.ribGeo.attributes.position : null;
  const maxU = clamp(maxProgress, 0.04, 1);
  const baseW = halfWidth || 0.085;
  const dx = p2.x - p0.x;
  const dz = p2.z - p0.z;
  const horizLen = Math.hypot(dx, dz) || 1;
  const px = (-dz / horizLen) * baseW;
  const pz = (dx / horizLen) * baseW;
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const frac = i / ARC_SEGMENTS;
    const u = frac * maxU;
    const inv = 1 - u;
    const x = inv * inv * p0.x + 2 * inv * u * mid.x + u * u * p2.x;
    const y = inv * inv * p0.y + 2 * inv * u * mid.y + u * u * p2.y;
    const z = inv * inv * p0.z + 2 * inv * u * mid.z + u * u * p2.z;
    posAttr.setXYZ(i, x, y, z);
    if (ribAttr) {
      const taper = 0.25 + 0.75 * Math.sin(frac * Math.PI);
      const wy = baseW * 0.55 * taper;
      ribAttr.setXYZ(i * 2, x + px * taper, y + wy, z + pz * taper);
      ribAttr.setXYZ(i * 2 + 1, x - px * taper, y - wy, z - pz * taper);
    }
  }
  posAttr.needsUpdate = true;
  if (ribAttr) ribAttr.needsUpdate = true;
}

function evalQuadraticPoint(outVec, p0, mid, p2, u) {
  const inv = 1 - u;
  outVec.set(
    inv * inv * p0.x + 2 * inv * u * mid.x + u * u * p2.x,
    inv * inv * p0.y + 2 * inv * u * mid.y + u * u * p2.y,
    inv * inv * p0.z + 2 * inv * u * mid.z + u * u * p2.z
  );
  return outVec;
}

function build3DEffects(scene) {
  const orbGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const cardGeo = new THREE.BoxGeometry(0.36, 0.50, 0.045);
  const ringGeo = new THREE.RingGeometry(0.30, 0.46, 28);
  ringGeo.rotateX(-Math.PI * 0.5);
  const smokeGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const cardTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createBallotCardTexture === "function")
    ? stage3dTextures.createBallotCardTexture()
    : null;
  const runesTex = (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.createSkillRunesTexture === "function")
    ? stage3dTextures.createSkillRunesTexture()
    : null;

  const fx = {
    relGroup: new THREE.Group(),
    beamPool: [],
    dragArc: null,
    shockPool: [],
    smokePool: [],
    skillCyl: null,
    skillCylMat: null,
    skillRunesTex: runesTex,
    skillRing: null,
    skillRingMat: null,
    skillDome: null,
    skillDomeMat: null,
    skillActive: null,
    reticle: null,
    reticleOuterMat: null,
    lastRelSig: "",
    dragWorldEnd: new THREE.Vector3(),
    tmpP0: new THREE.Vector3(),
    tmpMid: new THREE.Vector3(),
    tmpP2: new THREE.Vector3(),
    tmpPt: new THREE.Vector3()
  };

  scene.add(fx.relGroup);

  // Pre-allocate Reusable Beam / Flying Vote Card Pool (Zero Per-Frame Allocations!)
  for (let i = 0; i < BEAM_POOL_SIZE; i++) {
    const entry = createPooledArcEntry(orbGeo, cardGeo, cardTex);
    scene.add(entry.line, entry.ribbon, entry.orb, entry.card);
    entry.beads.forEach(function (b) { scene.add(b); });
    fx.beamPool.push(entry);
  }

  // Dedicated Reusable 3D Drag Tether Arc
  fx.dragArc = createPooledArcEntry(orbGeo, cardGeo, cardTex);
  scene.add(fx.dragArc.line, fx.dragArc.ribbon, fx.dragArc.orb);
  fx.dragArc.beads.forEach(function (b) { scene.add(b); });

  // Pre-allocate Shockwave Pool
  for (let i = 0; i < SHOCK_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    fx.shockPool.push({ mesh: mesh, mat: mat, active: false, born: 0, duration: 600, maxScale: 4.0 });
  }

  // Pre-allocate Candle Smoke Pool
  for (let i = 0; i < SMOKE_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    fx.smokePool.push({ mesh: mesh, mat: mat, active: false, born: 0, duration: 1450, vx: 0, vz: 0 });
  }

  // Rotating 3D Ground Targeting Reticle Ring
  const retGroup = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.06, 32),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  outer.rotation.x = -Math.PI * 0.5;
  retGroup.add(outer);

  const tickGeo = new THREE.PlaneGeometry(0.13, 0.34);
  const tickMat = new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  for (let ti = 0; ti < 4; ti++) {
    const a = (ti / 4) * Math.PI * 2;
    const tk = new THREE.Mesh(tickGeo, tickMat);
    tk.rotation.x = -Math.PI * 0.5;
    tk.rotation.z = -a;
    tk.position.set(Math.cos(a) * 1.18, 0.01, Math.sin(a) * 1.18);
    retGroup.add(tk);
  }
  retGroup.position.y = 0.05;
  retGroup.visible = false;
  scene.add(retGroup);
  fx.reticle = retGroup;
  fx.reticleOuterMat = outer.material;

  // Reusable 3D Role Skill Aura Cylinder + Rune Ring + Protective Dome (Guard / Seer / Tea-Master / Hunter!)
  const skillGeo = new THREE.CylinderGeometry(0.95, 1.18, 2.9, 24, 1, true);
  skillGeo.translate(0, 1.45, 0);
  fx.skillCylMat = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    map: runesTex || null,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  fx.skillCyl = new THREE.Mesh(skillGeo, fx.skillCylMat);
  fx.skillCyl.visible = false;
  scene.add(fx.skillCyl);

  fx.skillRingMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  fx.skillRing = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.16, 32), fx.skillRingMat);
  fx.skillRing.rotation.x = -Math.PI * 0.5;
  fx.skillRing.visible = false;
  scene.add(fx.skillRing);

  fx.skillDomeMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  fx.skillDome = new THREE.Mesh(new THREE.SphereGeometry(1.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), fx.skillDomeMat);
  fx.skillDome.visible = false;
  scene.add(fx.skillDome);

  return fx;
}

function trigger3DSkillAura(fx, worldPos, colorHex, kind, nowMs) {
  if (!fx || !fx.skillCyl) return;
  const isHunter = kind === "hunter_shot";
  const isShield = kind === "guard_shield" || kind === "witch_heal";
  fx.skillCyl.position.set(worldPos.x, 0.08, worldPos.z);
  fx.skillCylMat.color.set(colorHex || "#a78bfa");
  fx.skillCyl.visible = true;
  if (fx.skillRing) {
    fx.skillRing.position.set(worldPos.x, 0.14, worldPos.z);
    fx.skillRingMat.color.set(isHunter ? "#fbbf24" : (colorHex || "#fde68a"));
    fx.skillRing.visible = true;
  }
  if (fx.skillDome) {
    fx.skillDome.position.set(worldPos.x, 0.92, worldPos.z);
    fx.skillDomeMat.color.set(kind === "guard_shield" ? "#fbbf24" : "#34d399");
    fx.skillDome.visible = isShield;
  }
  fx.skillActive = { kind: kind, born: nowMs, duration: isHunter ? 2200 : (isShield ? 1700 : 1450) };
  spawn3DShockwave(fx, worldPos, colorHex, nowMs, 0.16, isHunter ? 6.2 : 4.8);
  setTimeout(function () {
    spawn3DShockwave(fx, worldPos, isHunter ? "#fbbf24" : colorHex, performance.now(), 0.72, isHunter ? 5.2 : 3.6);
  }, isHunter ? 160 : 180);
  if (isHunter) {
    setTimeout(function () {
      spawn3DShockwave(fx, worldPos, "#f43f5e", performance.now(), 0.32, 4.2);
    }, 360);
  }
}

function disposeRelChildren(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
}

function spawn3DShockwave(fx, worldPos, colorHex, nowMs, yLevel, maxScale) {
  const slot = fx.shockPool.find(function (s) { return !s.active; }) || fx.shockPool[0];
  slot.active = true;
  slot.born = nowMs;
  slot.duration = 600;
  slot.maxScale = maxScale || 4.0;
  slot.mat.color.set(colorHex || "#fbbf24");
  slot.mat.opacity = 0.88;
  slot.mesh.position.set(worldPos.x, yLevel !== undefined ? yLevel : 0.14, worldPos.z);
  slot.mesh.scale.setScalar(1);
  slot.mesh.visible = true;
}

function spawn3DCandleSmoke(fx, worldPos, nowMs) {
  const slot = fx.smokePool.find(function (s) { return !s.active; });
  if (!slot) return;
  slot.active = true;
  slot.born = nowMs;
  slot.duration = 1450;
  slot.vx = (Math.random() - 0.5) * 0.004;
  slot.vz = (Math.random() - 0.5) * 0.004;
  slot.mat.opacity = 0.42;
  slot.mesh.position.set(
    worldPos.x + (Math.random() - 0.5) * 0.05,
    worldPos.y + 0.18,
    worldPos.z + (Math.random() - 0.5) * 0.05
  );
  slot.mesh.scale.setScalar(0.7);
  slot.mesh.visible = true;
}

function update3DEffects(fx, anchors, f) {
  const nowMs = f.nowMs;
  const t = f.tSec;

  // 1. 3D Ground Targeting Reticle
  const focusId = (state.dragAction.active && state.dragAction.snapId)
    || state.selectedSeatId
    || state.hoverSeatId;
  const focusAnchor = focusId ? anchors[focusId] : null;
  if (focusAnchor && focusAnchor.seat && focusAnchor.seat.alive) {
    fx.reticle.visible = true;
    fx.reticle.position.x += (focusAnchor.worldPos.x - fx.reticle.position.x) * 0.28;
    fx.reticle.position.z += (focusAnchor.worldPos.z - fx.reticle.position.z) * 0.28;
    fx.reticle.rotation.y = t * 1.45;
    const isDanger = f.p === "DAY_VOTE" || f.p === "NIGHT_WOLF" || f.p === "HUNTER_TRIGGER";
    fx.reticleOuterMat.color.setHex(isDanger ? 0xf43f5e : (f.night ? 0xa78bfa : 0xf59e0b));
  } else {
    fx.reticle.visible = false;
  }

  // 2. 3D Parabolic Relationship Arcs (Rebuilt only when relation list actually changes!)
  const rels = (state.showRelationsOnCanvas && state.match.relations) ? state.match.relations.slice(-9) : [];
  const relSig = rels.map(function (r) { return r.fromId + "-" + r.toId + "-" + r.type; }).join("|") + ":" + Object.keys(anchors).length;
  if (relSig !== fx.lastRelSig) {
    fx.lastRelSig = relSig;
    disposeRelChildren(fx.relGroup);
    rels.forEach(function (rel) {
      const aFrom = anchors[rel.fromId];
      const aTo = anchors[rel.toId];
      if (!aFrom || !aTo) return;
      const p0 = aFrom.worldPos.clone().setY(1.85);
      const p2 = aTo.worldPos.clone().setY(1.85);
      const mid = p0.clone().add(p2).multiplyScalar(0.5);
      mid.y = 3.2;
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      const col = rel.type === "trust" ? 0x34d399 : (rel.type === "vote" ? 0xfbbf24 : 0xf43f5e);
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.72 });
      fx.relGroup.add(new THREE.Line(geo, mat));
    });
  }

  // 3. Zero-GC 3D Glowing Arcing Drag Tether
  const da = fx.dragArc;
  if (state.dragAction.active && state.dragAction.moved && anchors[state.dragAction.fromId]) {
    const startAnchor = anchors[state.dragAction.fromId];
    const snapAnchor = state.dragAction.snapId ? anchors[state.dragAction.snapId] : null;
    fx.tmpP0.copy(startAnchor.handPos || startAnchor.headPos);
    fx.tmpP2.copy(snapAnchor ? snapAnchor.headPos : fx.dragWorldEnd);
    fx.tmpMid.copy(fx.tmpP0).add(fx.tmpP2).multiplyScalar(0.5);
    fx.tmpMid.y = Math.max(fx.tmpP0.y, fx.tmpP2.y) + 1.45;

    const colHex = snapAnchor ? (f.p === "DAY_VOTE" ? 0xf43f5e : 0x34d399) : 0x38bdf8;
    writeQuadraticArcToBuffer(da, fx.tmpP0, fx.tmpMid, fx.tmpP2, 1.0, snapAnchor ? 0.10 : 0.07);
    da.lineMat.color.setHex(colHex);
    da.lineMat.opacity = 0.92;
    da.line.visible = true;
    if (da.ribbon) {
      da.ribMat.color.setHex(colHex);
      da.ribMat.opacity = snapAnchor ? 0.68 : 0.46;
      da.ribbon.visible = true;
    }

    da.orbMat.color.setHex(colHex);
    da.orb.position.copy(fx.tmpP2);
    da.orb.scale.setScalar(snapAnchor ? 1.18 : 0.78);
    da.orb.visible = true;

    for (let bi = 0; bi < da.beads.length; bi++) {
      const u = ((t * 1.4) + bi / da.beads.length) % 1;
      evalQuadraticPoint(da.beads[bi].position, fx.tmpP0, fx.tmpMid, fx.tmpP2, u);
      da.beads[bi].visible = true;
    }
  } else {
    da.line.visible = false;
    if (da.ribbon) da.ribbon.visible = false;
    da.orb.visible = false;
    for (let bi = 0; bi < da.beads.length; bi++) da.beads[bi].visible = false;
  }

  // 4. Zero-GC Pooled 3D Ribbon Beams & Carved Flying Vote Tablets
  state.beamFx = state.beamFx.filter(function (bm) { return nowMs - bm.born < (bm.duration + 260); });
  for (let pi = 0; pi < fx.beamPool.length; pi++) {
    const entry = fx.beamPool[pi];
    const bm = state.beamFx[pi];
    const aFrom = bm ? anchors[bm.fromId] : null;
    const aTo = bm ? anchors[bm.toId] : null;
    if (!bm || !aFrom || !aTo) {
      entry.line.visible = false;
      if (entry.ribbon) entry.ribbon.visible = false;
      entry.orb.visible = false;
      entry.card.visible = false;
      for (let bi = 0; bi < entry.beads.length; bi++) entry.beads[bi].visible = false;
      continue;
    }

    const tRaw = (nowMs - bm.born) / bm.duration;
    const prog = clamp(tRaw, 0, 1);
    const isHunter = bm.kind === "hunter";
    const isClash = bm.kind === "clash" || bm.kind === "logic_break";
    fx.tmpP0.copy(aFrom.handPos || aFrom.headPos);
    fx.tmpP2.copy(aTo.headPos);
    fx.tmpMid.copy(fx.tmpP0).add(fx.tmpP2).multiplyScalar(0.5);
    fx.tmpMid.y = isHunter ? 4.65 : (isClash ? 4.55 : (bm.kind === "vote" ? 4.4 : 3.55));

    if (tRaw >= 1 && !bm.impacted) {
      bm.impacted = true;
      const isHostile = bm.kind === "grill" || isClash || bm.kind === "vote" || isHunter;
      nudgeSeat(bm.toId, {
        scale: isHunter ? 0.78 : (isHostile ? 0.86 : 1.15),
        vScale: isHunter ? 0.28 : (isHostile ? 0.22 : -0.08),
        vy: isHunter ? 11.0 : (isHostile ? 7.5 : -6.0),
        vTilt: isHunter ? 0.36 : (isHostile ? 0.28 : 0.08)
      });
      spawnBurst(
        bm.toId,
        [bm.color, "#ffffff", "#fde68a"],
        isHunter ? 30 : (isClash ? 20 : (isHostile ? 14 : 12)),
        isHunter ? "spark" : (isClash ? "slash" : (isHostile ? "spark" : "petal"))
      );
      spawn3DShockwave(fx, aTo.worldPos, bm.color, nowMs, 0.14, isHunter ? 5.8 : (isClash ? 5.4 : 4.2));
    }

    const trailBaseAlpha = (isHunter || isClash) ? 0.96 : 0.85;
    const trailAlpha = tRaw <= 1 ? trailBaseAlpha : clamp(1 - (nowMs - bm.born - bm.duration) / 260, 0, 1) * trailBaseAlpha;
    const ribWidth = isHunter ? 0.19 : (isClash ? 0.14 : (bm.kind === "vote" ? 0.08 : 0.10));
    writeQuadraticArcToBuffer(entry, fx.tmpP0, fx.tmpMid, fx.tmpP2, prog, ribWidth);
    entry.lineMat.color.set(bm.color || "#fbbf24");
    entry.lineMat.opacity = trailAlpha;
    entry.line.visible = true;
    if (entry.ribbon) {
      entry.ribMat.color.set(bm.color || "#fbbf24");
      entry.ribMat.opacity = trailAlpha * (isHunter ? 0.82 : (isClash ? 0.68 : 0.50));
      entry.ribbon.visible = true;
    }

    if (tRaw <= 1.04) {
      evalQuadraticPoint(fx.tmpPt, fx.tmpP0, fx.tmpMid, fx.tmpP2, prog);
      if (bm.kind === "vote") {
        if (!entry.cardMat.map) entry.cardMat.color.set(bm.color || "#fbbf24");
        entry.card.position.copy(fx.tmpPt);
        entry.card.rotation.set(t * 7.5, t * 9.2, t * 4.5);
        entry.card.visible = true;
        entry.orb.visible = false;
      } else {
        entry.orbMat.color.set(bm.color || "#fbbf24");
        entry.orb.position.copy(fx.tmpPt);
        entry.orb.scale.setScalar(isHunter ? 2.15 : (isClash ? 1.48 : 1.05));
        entry.orb.visible = true;
        entry.card.visible = false;
      }
      const beadBase = isHunter ? 0.86 : (isClash ? 0.62 : 0.48);
      for (let bi = 0; bi < entry.beads.length; bi++) {
        const bu = Math.max(0, prog - (bi + 1) * 0.10);
        evalQuadraticPoint(entry.beads[bi].position, fx.tmpP0, fx.tmpMid, fx.tmpP2, bu);
        entry.beads[bi].scale.setScalar(Math.max(0.16, beadBase - bi * 0.075));
        entry.beads[bi].visible = bu > 0.02;
      }
    } else {
      entry.orb.visible = false;
      entry.card.visible = false;
      for (let bi = 0; bi < entry.beads.length; bi++) entry.beads[bi].visible = false;
    }
  }

  // 5. Update Pooled Shockwaves
  for (let i = 0; i < fx.shockPool.length; i++) {
    const sw = fx.shockPool[i];
    if (!sw.active) continue;
    const prog = (nowMs - sw.born) / sw.duration;
    if (prog >= 1) {
      sw.active = false;
      sw.mesh.visible = false;
      continue;
    }
    sw.mesh.scale.setScalar(1 + prog * sw.maxScale);
    sw.mat.opacity = (1 - prog) * 0.85;
  }

  // 6. Update Pooled Candle Smoke Puffs
  for (let i = 0; i < fx.smokePool.length; i++) {
    const sp = fx.smokePool[i];
    if (!sp.active) continue;
    const prog = (nowMs - sp.born) / sp.duration;
    if (prog >= 1) {
      sp.active = false;
      sp.mesh.visible = false;
      continue;
    }
    sp.mesh.position.y += 0.014;
    sp.mesh.position.x += sp.vx + Math.sin(t * 3 + sp.born) * 0.002;
    sp.mesh.position.z += sp.vz;
    sp.mesh.scale.setScalar(0.7 + prog * 2.1);
    sp.mat.opacity = (1 - prog) * 0.36;
  }

  // 7. Role Skill 3D Aura Cylinder + UV-Scrolling Runes + Guard Dome Animation
  if (fx.skillActive && fx.skillCyl) {
    const prog = (nowMs - fx.skillActive.born) / fx.skillActive.duration;
    if (prog >= 1) {
      fx.skillActive = null;
      fx.skillCyl.visible = false;
      if (fx.skillRing) fx.skillRing.visible = false;
      if (fx.skillDome) fx.skillDome.visible = false;
    } else {
      const env = Math.sin(prog * Math.PI);
      const isHunterSkill = fx.skillActive.kind === "hunter_shot";
      const isSeerSkill = fx.skillActive.kind === "seer_scan";
      const isShieldSkill = fx.skillActive.kind === "guard_shield" || fx.skillActive.kind === "witch_heal";
      if (fx.skillRunesTex && fx.skillRunesTex.offset) {
        fx.skillRunesTex.offset.x = (t * (isHunterSkill ? 1.2 : 0.55)) % 1;
        fx.skillRunesTex.offset.y = (t * 0.42) % 1;
      }
      fx.skillCylMat.opacity = env * (isHunterSkill ? 0.88 : (isSeerSkill ? 0.64 : 0.54));
      fx.skillCyl.rotation.y = t * (isHunterSkill ? 6.4 : (isSeerSkill ? 4.8 : 3.2));
      const sc = isSeerSkill
        ? (0.92 + Math.sin(prog * Math.PI * 4) * 0.22)
        : (isHunterSkill ? (1.05 + env * 0.48) : (0.94 + Math.sin(prog * Math.PI * 2) * 0.20));
      const sy = isHunterSkill ? (1.15 + env * 1.15) : (0.85 + env * 0.68);
      fx.skillCyl.scale.set(sc, sy, sc);

      if (fx.skillRing && fx.skillRing.visible) {
        fx.skillRing.position.y = isSeerSkill ? (0.35 + Math.sin(prog * Math.PI * 2) * 1.15 + 0.9) : (0.16 + prog * 1.85);
        fx.skillRing.scale.setScalar(0.85 + prog * 0.72);
        fx.skillRing.rotation.z = -t * 3.8;
        fx.skillRingMat.opacity = env * 0.78;
      }
      if (fx.skillDome && fx.skillDome.visible && isShieldSkill) {
        fx.skillDome.rotation.y = t * 1.8;
        fx.skillDome.scale.setScalar(0.86 + env * 0.24);
        fx.skillDomeMat.opacity = env * 0.48;
      }
    }
  }
}
