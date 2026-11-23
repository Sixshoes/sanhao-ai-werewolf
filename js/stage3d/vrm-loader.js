/**
 * 通用零相依二次元 .VRM（0.x / 1.0）與 .GLB 角色驅動引擎（Three.js r128）
 * 功能：
 * - 支援 9 位全角色（清茗＋1~8號書院夥伴）免外掛直接放入 assets/models/*.vrm 或 *.glb
 * - 自動解析 VRM Humanoid 骨骼與臉部表情 BlendShape / MorphTarget
 * - 自動擺出站姿或端坐茶椅姿、對嘴同步語音振幅、自然眨眼、眼神與情緒驅動
 */
"use strict";

const SEAT_MODEL_SLUGS = {
  "主持": "qingming",
  "清茗": "qingming",
  "你": "player",
  "小澄": "xiaocheng",
  "暖暖": "nuannuan",
  "阿松": "asong",
  "星兒": "xinger",
  "小雲": "xiaoyun",
  "阿竹": "azhu",
  "晨晨": "chenchen",
  "墨白": "mobai",
  "晴嵐": "qinglan",
  "阿朗": "alang",
  "柚子": "youzi"
};

const VRM_IDLE_ARCHETYPES = {
  "你": { breathFreq: 1.95, breathAmp: 0.016, spineLean: 0.01, headRollAmp: 0.020, headTiltBias: 0.0, idleHappy: 0.08, idleFun: 0.04, rDrop: 1.20, rFwd: 0.16, rBend: 0.64, lDrop: 1.20, lFwd: 0.16, lBend: 0.64, armSwayAmp: 0.018 },
  "小澄": { breathFreq: 1.85, breathAmp: 0.014, spineLean: 0.03, headRollAmp: 0.016, headTiltBias: 0.025, idleHappy: 0.0, idleFun: 0.0, rDrop: 1.18, rFwd: 0.20, rBend: 0.74, lDrop: 1.21, lFwd: 0.14, lBend: 0.62, armSwayAmp: 0.010 },
  "暖暖": { breathFreq: 2.15, breathAmp: 0.020, spineLean: 0.01, headRollAmp: 0.040, headTiltBias: -0.02, idleHappy: 0.24, idleFun: 0.14, rDrop: 1.19, rFwd: 0.18, rBend: 0.70, lDrop: 1.19, lFwd: 0.18, lBend: 0.70, armSwayAmp: 0.024 },
  "阿松": { breathFreq: 1.35, breathAmp: 0.018, spineLean: -0.015, headRollAmp: 0.012, headTiltBias: 0.0, idleHappy: 0.06, idleFun: 0.0, rDrop: 1.22, rFwd: 0.13, rBend: 0.58, lDrop: 1.22, lFwd: 0.13, lBend: 0.58, armSwayAmp: 0.010 },
  "星兒": { breathFreq: 2.85, breathAmp: 0.024, spineLean: 0.02, headRollAmp: 0.055, headTiltBias: 0.03, idleHappy: 0.16, idleFun: 0.26, rDrop: 1.18, rFwd: 0.20, rBend: 0.76, lDrop: 1.20, lFwd: 0.15, lBend: 0.64, armSwayAmp: 0.032 },
  "小雲": { breathFreq: 1.75, breathAmp: 0.016, spineLean: 0.02, headRollAmp: 0.032, headTiltBias: -0.035, idleHappy: 0.10, idleFun: 0.08, rDrop: 1.19, rFwd: 0.19, rBend: 0.72, lDrop: 1.21, lFwd: 0.15, lBend: 0.66, armSwayAmp: 0.018 },
  "阿竹": { breathFreq: 1.60, breathAmp: 0.014, spineLean: 0.015, headRollAmp: 0.018, headTiltBias: 0.015, idleHappy: 0.0, idleFun: 0.0, rDrop: 1.20, rFwd: 0.17, rBend: 0.70, lDrop: 1.20, lFwd: 0.16, lBend: 0.68, armSwayAmp: 0.014 },
  "晨晨": { breathFreq: 2.35, breathAmp: 0.020, spineLean: 0.0, headRollAmp: 0.028, headTiltBias: 0.0, idleHappy: 0.12, idleFun: 0.10, rDrop: 1.20, rFwd: 0.16, rBend: 0.62, lDrop: 1.20, lFwd: 0.16, lBend: 0.62, armSwayAmp: 0.022 },
  "墨白": { breathFreq: 1.45, breathAmp: 0.013, spineLean: 0.005, headRollAmp: 0.014, headTiltBias: 0.01, idleHappy: 0.02, idleFun: 0.0, rDrop: 1.21, rFwd: 0.15, rBend: 0.64, lDrop: 1.21, lFwd: 0.15, lBend: 0.64, armSwayAmp: 0.010 },
  "晴嵐": { breathFreq: 1.80, breathAmp: 0.017, spineLean: 0.01, headRollAmp: 0.030, headTiltBias: -0.025, idleHappy: 0.18, idleFun: 0.08, rDrop: 1.19, rFwd: 0.18, rBend: 0.72, lDrop: 1.20, lFwd: 0.16, lBend: 0.68, armSwayAmp: 0.018 },
  "阿朗": { breathFreq: 2.10, breathAmp: 0.018, spineLean: 0.025, headRollAmp: 0.022, headTiltBias: 0.015, idleHappy: 0.08, idleFun: 0.06, rDrop: 1.18, rFwd: 0.19, rBend: 0.68, lDrop: 1.20, lFwd: 0.15, lBend: 0.62, armSwayAmp: 0.020 },
  "柚子": { breathFreq: 2.65, breathAmp: 0.022, spineLean: 0.015, headRollAmp: 0.048, headTiltBias: -0.02, idleHappy: 0.28, idleFun: 0.22, rDrop: 1.18, rFwd: 0.20, rBend: 0.74, lDrop: 1.19, lFwd: 0.18, lBend: 0.70, armSwayAmp: 0.030 },
  default: { breathFreq: 2.05, breathAmp: 0.016, spineLean: 0.01, headRollAmp: 0.025, headTiltBias: 0.0, idleHappy: 0.05, idleFun: 0.0, rDrop: 1.20, rFwd: 0.16, rBend: 0.64, lDrop: 1.20, lFwd: 0.16, lBend: 0.64, armSwayAmp: 0.016 }
};

const stage3dVrm = {
  _scratch: null,
  ensureScratch: function () {
    if (!this._scratch && typeof THREE !== "undefined" && typeof THREE.Quaternion === "function" && typeof THREE.Euler === "function") {
      this._scratch = {
        qDelta: new THREE.Quaternion(),
        qTarget: new THREE.Quaternion(),
        euler: new THREE.Euler(0, 0, 0, "YXZ")
      };
    }
    return this._scratch;
  },

  getIdleArchetype: function (personaName, seed) {
    if (personaName && VRM_IDLE_ARCHETYPES[personaName]) return VRM_IDLE_ARCHETYPES[personaName];
    const keys = ["小澄", "暖暖", "阿松", "星兒", "小雲", "阿竹", "晨晨"];
    if (seed && keys.length) {
      const idx = Math.abs(Math.round(seed * 1.7)) % keys.length;
      return VRM_IDLE_ARCHETYPES[keys[idx]] || VRM_IDLE_ARCHETYPES.default;
    }
    return VRM_IDLE_ARCHETYPES.default;
  },

  playVrmClip: function (inst, clipNameOrIdx) {
    if (!inst || !inst.mixer || !Array.isArray(inst.clips) || inst.clips.length === 0) return false;
    let clip = null;
    if (typeof clipNameOrIdx === "number") {
      clip = inst.clips[clipNameOrIdx] || null;
    } else if (typeof clipNameOrIdx === "string") {
      clip = inst.clips.find(function (c) { return c && c.name === clipNameOrIdx; }) || inst.clips[0];
    } else {
      clip = inst.clips[0];
    }
    if (!clip) return false;
    if (inst.activeAction && typeof inst.activeAction.stop === "function") {
      inst.activeAction.stop();
    }
    inst.activeAction = inst.mixer.clipAction(clip);
    if (inst.activeAction && typeof inst.activeAction.play === "function") {
      inst.activeAction.play();
      inst.lastClipTime = null;
      return true;
    }
    return false;
  },

  stopVrmClip: function (inst) {
    if (!inst) return;
    if (inst.activeAction && typeof inst.activeAction.stop === "function") {
      inst.activeAction.stop();
    }
    inst.activeAction = null;
    inst.lastClipTime = null;
  },

  getSeatModelSlug: function (seatOrName) {
    const isMalePlayer = typeof state !== "undefined" && state.playerGender === "m";
    if (!seatOrName) return isMalePlayer ? "player_male" : "player";
    if (typeof seatOrName === "string") {
      if (seatOrName === "你") return isMalePlayer ? "player_male" : "player";
      return SEAT_MODEL_SLUGS[seatOrName] || "player";
    }
    if (typeof getPlayerId === "function" && seatOrName.id === getPlayerId()) {
      return isMalePlayer ? "player_male" : "player";
    }
    if (seatOrName.name === "你") return isMalePlayer ? "player_male" : "player";
    return SEAT_MODEL_SLUGS[seatOrName.name] || ("seat" + seatOrName.id);
  },

  resolveHumanoidBones: function (gltf, scene) {
    const bones = {};
    const wanted = [
      "hips", "spine", "chest", "upperChest", "neck", "head",
      "leftEye", "rightEye",
      "leftShoulder", "rightShoulder",
      "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand",
      "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg"
    ];
    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const assocs = gltf && gltf.parser && gltf.parser.associations ? gltf.parser.associations : null;

    // Build reverse nodeIndex -> Object3D map when GLTFLoader associations exist
    const nodeIdxToObj = {};
    if (assocs && typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        const meta = assocs.get ? assocs.get(obj) : null;
        if (meta && typeof meta.nodes === "number" && !nodeIdxToObj[meta.nodes]) {
          nodeIdxToObj[meta.nodes] = obj;
        }
      });
    }

    const pickByIdxOrName = function (nodeIdx) {
      if (typeof nodeIdx !== "number") return null;
      if (nodeIdxToObj[nodeIdx]) return nodeIdxToObj[nodeIdx];
      if (json && json.nodes && json.nodes[nodeIdx] && json.nodes[nodeIdx].name && typeof scene.getObjectByName === "function") {
        return scene.getObjectByName(json.nodes[nodeIdx].name) || null;
      }
      return null;
    };

    const ext = json && json.extensions ? json.extensions : null;
    if (ext && ext.VRM && ext.VRM.humanoid && Array.isArray(ext.VRM.humanoid.humanBones)) {
      ext.VRM.humanoid.humanBones.forEach(function (hb) {
        if (hb && hb.bone && wanted.indexOf(hb.bone) >= 0) {
          const obj = pickByIdxOrName(hb.node);
          if (obj) bones[hb.bone] = obj;
        }
      });
    } else if (ext && ext.VRMC_vrm && ext.VRMC_vrm.humanoid && ext.VRMC_vrm.humanoid.humanBones) {
      const map1 = ext.VRMC_vrm.humanoid.humanBones;
      wanted.forEach(function (bName) {
        const entry = map1[bName];
        if (entry && typeof entry.node === "number") {
          const obj = pickByIdxOrName(entry.node);
          if (obj) bones[bName] = obj;
        }
      });
    }

    // Regex bone name fallback for generic Mixamo / Rigged GLB or partial skeletons
    const fallbackRules = {
      hips: /hips|pelvis|bip.*pelvis/i,
      spine: /^spine$|spine1|mixamorig.*spine$/i,
      chest: /chest|spine2|upper_chest/i,
      neck: /neck/i,
      head: /^head$|mixamorig.*head|j_bip_c_head/i,
      leftEye: /left.*eye|j_adj_l_faceeye|eye_l/i,
      rightEye: /right.*eye|j_adj_r_faceeye|eye_r/i,
      leftShoulder: /left.*shoulder|j_bip_l_shoulder|l_shoulder/i,
      rightShoulder: /right.*shoulder|j_bip_r_shoulder|r_shoulder/i,
      leftUpperArm: /left.*upper.*arm|j_bip_l_upperarm|l_upperarm|leftarm/i,
      rightUpperArm: /right.*upper.*arm|j_bip_r_upperarm|r_upperarm|rightarm/i,
      leftLowerArm: /left.*lower.*arm|left.*forearm|j_bip_l_lowerarm/i,
      rightLowerArm: /right.*lower.*arm|right.*forearm|j_bip_r_lowerarm/i,
      leftHand: /left.*hand|j_bip_l_hand|l_hand/i,
      rightHand: /right.*hand|j_bip_r_hand|r_hand/i,
      leftUpperLeg: /left.*upper.*leg|left.*thigh|j_bip_l_upperleg|leftupleg/i,
      rightUpperLeg: /right.*upper.*leg|right.*thigh|j_bip_r_upperleg|rightupleg/i,
      leftLowerLeg: /left.*lower.*leg|left.*calf|left.*shin|j_bip_l_lowerleg|leftleg/i,
      rightLowerLeg: /right.*lower.*leg|right.*calf|right.*shin|j_bip_r_lowerleg|rightleg/i
    };
    if (typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        if (!obj || !obj.name) return;
        wanted.forEach(function (key) {
          if (!bones[key] && fallbackRules[key] && fallbackRules[key].test(obj.name)) {
            bones[key] = obj;
          }
        });
      });
    }
    return { bones: bones, pickByIdxOrName: pickByIdxOrName };
  },

  resolveMorphBindings: function (gltf, scene) {
    const bindings = {
      blink: [], blink_l: [], blink_r: [],
      aa: [], ih: [], ou: [], ee: [], oh: [],
      happy: [], fun: [], angry: [], sorrow: [], surprised: []
    };
    const meshByIdx = {};
    const meshes = [];
    if (typeof scene.traverse === "function") {
      scene.traverse(function (obj) {
        if (obj && obj.isMesh && obj.morphTargetInfluences) {
          meshes.push(obj);
          if (gltf && gltf.parser && gltf.parser.associations && gltf.parser.associations.get) {
            const meta = gltf.parser.associations.get(obj);
            if (meta && typeof meta.meshes === "number") meshByIdx[meta.meshes] = obj;
          }
        }
      });
    }

    const pushBinding = function (bucket, mesh, idx, weight) {
      if (!bindings[bucket] || !mesh || !mesh.morphTargetInfluences || typeof idx !== "number" || idx < 0) return;
      if (idx >= mesh.morphTargetInfluences.length) return;
      if (!bindings[bucket].some(function (b) { return b.mesh === mesh && b.idx === idx; })) {
        bindings[bucket].push({ mesh: mesh, idx: idx, weight: weight !== undefined ? weight : 1.0 });
      }
    };

    const pushFromObj = function (bucket, obj, idx, weight) {
      if (!obj) return;
      if (obj.isMesh && obj.morphTargetInfluences) {
        pushBinding(bucket, obj, idx, weight);
      } else if (typeof obj.traverse === "function") {
        obj.traverse(function (sub) {
          if (sub && sub.isMesh && sub.morphTargetInfluences) {
            pushBinding(bucket, sub, idx, weight);
          }
        });
      }
    };

    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;

    // 1. VRM 0.x BlendShapeMaster (13 preset buckets including 5 vowels + full emotions!)
    if (ext && ext.VRM && ext.VRM.blendShapeMaster && Array.isArray(ext.VRM.blendShapeMaster.blendShapeGroups)) {
      const map0 = {
        blink: "blink", blink_l: "blink_l", blink_r: "blink_r",
        a: "aa", aa: "aa", i: "ih", ih: "ih", u: "ou", ou: "ou", e: "ee", ee: "ee", o: "oh", oh: "oh",
        joy: "happy", happy: "happy", fun: "fun", angry: "angry", sorrow: "sorrow", surprised: "surprised"
      };
      ext.VRM.blendShapeMaster.blendShapeGroups.forEach(function (grp) {
        if (!grp) return;
        const pKey = String(grp.presetName || grp.name || "").toLowerCase();
        const bucket = map0[pKey];
        if (!bucket || !Array.isArray(grp.binds)) return;
        grp.binds.forEach(function (b) {
          const targetMesh = meshByIdx[b.mesh];
          if (targetMesh) pushBinding(bucket, targetMesh, b.index, (b.weight !== undefined ? b.weight : 100) / 100);
        });
      });
    }

    // 2. VRM 1.0 VRMC_vrm.expressions.preset
    if (ext && ext.VRMC_vrm && ext.VRMC_vrm.expressions && ext.VRMC_vrm.expressions.preset) {
      const preset = ext.VRMC_vrm.expressions.preset;
      const nodeByName = {};
      if (scene && typeof scene.traverse === "function") {
        scene.traverse(function (o) {
          if (o && o.name && !nodeByName[o.name]) nodeByName[o.name] = o;
        });
      }
      const map1 = {
        blink: "blink", blinkLeft: "blink_l", blinkRight: "blink_r",
        aa: "aa", ih: "ih", ou: "ou", ee: "ee", oh: "oh",
        happy: "happy", relaxed: "fun", angry: "angry", sad: "sorrow", surprised: "surprised"
      };
      Object.keys(map1).forEach(function (pName) {
        const exp = preset[pName];
        if (!exp || !Array.isArray(exp.morphTargetBinds)) return;
        exp.morphTargetBinds.forEach(function (b) {
          const nName = (typeof b.node === "number" && json && json.nodes && json.nodes[b.node]) ? json.nodes[b.node].name : null;
          const nodeObj = nName
            ? (nodeByName[nName] || (typeof scene.getObjectByName === "function" ? scene.getObjectByName(nName) : null))
            : null;
          if (nodeObj) pushFromObj(map1[pName], nodeObj, b.index, b.weight !== undefined ? b.weight : 1.0);
        });
      });
    }

    // 3. Direct morphTargetDictionary name fallback
    const dictRules = {
      blink: /^(blink|eye_close|eyes_closed|fcl_eye_close)$/i,
      blink_l: /^(blink_l|blinkleft|fcl_eye_close_l)$/i,
      blink_r: /^(blink_r|blinkright|fcl_eye_close_r)$/i,
      aa: /^(a|aa|mouth_a|vrc\.v_aa|fcl_mth_a)$/i,
      ih: /^(i|ih|mouth_i|vrc\.v_ih|fcl_mth_i)$/i,
      ou: /^(u|ou|mouth_u|vrc\.v_ou|fcl_mth_u)$/i,
      ee: /^(e|ee|mouth_e|vrc\.v_ee|fcl_mth_e)$/i,
      oh: /^(o|oh|mouth_o|vrc\.v_oh|fcl_mth_o)$/i,
      happy: /^(joy|happy|smile|fcl_all_joy|fcl_eye_joy)$/i,
      fun: /^(fun|relaxed|smirk|fcl_all_fun)$/i,
      angry: /^(angry|mad|fcl_all_angry)$/i,
      sorrow: /^(sorrow|sad|fcl_all_sorrow)$/i,
      surprised: /^(surprised|oh_face|shock|fcl_all_surprised)$/i
    };
    meshes.forEach(function (m) {
      if (!m.morphTargetDictionary) return;
      Object.keys(m.morphTargetDictionary).forEach(function (k) {
        Object.keys(dictRules).forEach(function (bucket) {
          if (dictRules[bucket].test(k)) pushBinding(bucket, m, m.morphTargetDictionary[k], 1.0);
        });
      });
    });

    return bindings;
  },

  resolveSpringBones: function (gltf, pickByIdxOrName) {
    const springBones = [];
    const seen = new Set();
    const skipRe = /bust|breast|boob|chest|mune/i;
    const skirtRe = /skirt|dress|hakama|apron/i;
    const json = gltf && gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;

    const addChainBone = function (obj, comment, depth, stiff) {
      if (!obj || !obj.rotation || seen.has(obj)) return;
      const nm = String(obj.name || "");
      const tag = String(comment || "") + " " + nm;
      if (skipRe.test(tag)) return;
      seen.add(obj);
      const boneInfo = {
        obj: obj,
        restX: obj.rotation.x || 0,
        restY: obj.rotation.y || 0,
        restZ: obj.rotation.z || 0,
        depth: Math.min(depth || 0, 3),
        isSkirt: skirtRe.test(tag),
        stiffness: clamp(Number(stiff) || 0.7, 0.2, 2.5),
        phase: (springBones.length * 0.73) % (Math.PI * 2)
      };
      springBones.push(boneInfo);
      // VRM 0.x lists root bones and animates their child hierarchy; include up to 2 direct child segments!
      if (depth < 2 && Array.isArray(obj.children) && obj.children.length > 0 && obj.children[0]) {
        const ch = obj.children[0];
        if (!ch.isMesh && !skipRe.test(ch.name || "")) {
          addChainBone(ch, comment, depth + 1, stiff);
        }
      }
    };

    if (ext && ext.VRM && ext.VRM.secondaryAnimation && Array.isArray(ext.VRM.secondaryAnimation.boneGroups)) {
      ext.VRM.secondaryAnimation.boneGroups.forEach(function (grp) {
        if (!grp || !Array.isArray(grp.bones)) return;
        const cmt = String(grp.comment || "");
        if (skipRe.test(cmt)) return;
        grp.bones.forEach(function (nodeIdx) {
          const obj = pickByIdxOrName ? pickByIdxOrName(nodeIdx) : null;
          addChainBone(obj, cmt, 0, grp.stiffiness || grp.stiffness || 0.7);
        });
      });
    } else if (ext && ext.VRMC_springBone && Array.isArray(ext.VRMC_springBone.springs)) {
      ext.VRMC_springBone.springs.forEach(function (spr) {
        if (!spr || !Array.isArray(spr.joints)) return;
        const cmt = String(spr.name || "");
        if (skipRe.test(cmt)) return;
        spr.joints.slice(0, 3).forEach(function (jt, jIdx) {
          const obj = (jt && typeof jt.node === "number" && pickByIdxOrName) ? pickByIdxOrName(jt.node) : null;
          if (obj && !skipRe.test(obj.name || "") && !seen.has(obj)) {
            seen.add(obj);
            springBones.push({
              obj: obj,
              restX: obj.rotation.x || 0,
              restY: obj.rotation.y || 0,
              restZ: obj.rotation.z || 0,
              depth: Math.min(jIdx, 3),
              isSkirt: skirtRe.test(cmt + " " + (obj.name || "")),
              stiffness: clamp(Number(jt.stiffness) || 1.0, 0.2, 3.0),
              phase: (springBones.length * 0.73) % (Math.PI * 2)
            });
          }
        });
      });
    }
    return springBones;
  },

  initBoneQuatData: function (obj) {
    if (!obj || typeof THREE.Quaternion !== "function" || !obj.quaternion) return null;
    const restLocalQuat = obj.quaternion.clone();
    const pWorld = new THREE.Quaternion();
    if (obj.parent && typeof obj.parent.getWorldQuaternion === "function") {
      obj.parent.getWorldQuaternion(pWorld);
    }
    const pWorldInv = pWorld.clone();
    if (typeof pWorldInv.invert === "function") pWorldInv.invert();
    else if (typeof pWorldInv.inverse === "function") pWorldInv.inverse();
    return {
      obj: obj,
      restLocalQuat: restLocalQuat,
      parentRestWorldQuat: pWorld,
      parentRestWorldQuatInv: pWorldInv
    };
  },

  computeModelSpaceBoneQuat: function (meta, qDeltaModel, outQuat) {
    if (!meta || !qDeltaModel || typeof THREE.Quaternion !== "function") return null;
    const out = outQuat || new THREE.Quaternion();
    return out.copy(meta.parentRestWorldQuatInv)
      .multiply(qDeltaModel)
      .multiply(meta.parentRestWorldQuat)
      .multiply(meta.restLocalQuat);
  },

  makeModelEulerDelta: function (rx, ry, rz, order, outQuat) {
    if (typeof THREE.Quaternion !== "function") return null;
    const q = outQuat || new THREE.Quaternion();
    const sc = this.ensureScratch();
    if (sc && sc.euler) {
      sc.euler.set(rx || 0, ry || 0, rz || 0, order || "YXZ");
      q.setFromEuler(sc.euler);
    } else if (typeof THREE.Euler === "function") {
      q.setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, order || "YXZ"));
    }
    return q;
  },

  setBoneModelDeltaImmediate: function (meta, rx, ry, rz, order) {
    if (!meta || !meta.obj) return;
    if (typeof THREE.Quaternion === "function" && meta.obj.quaternion) {
      const sc = this.ensureScratch();
      const qDelta = this.makeModelEulerDelta(rx, ry, rz, order || "YXZ", sc ? sc.qDelta : null);
      const qTarget = this.computeModelSpaceBoneQuat(meta, qDelta, sc ? sc.qTarget : null);
      if (qTarget) meta.obj.quaternion.copy(qTarget);
    } else if (meta.obj.rotation) {
      meta.obj.rotation.set(rx || 0, ry || 0, rz || 0);
    }
  },

  slerpBoneModelDelta: function (meta, rx, ry, rz, alpha, order) {
    if (!meta || !meta.obj) return;
    if (typeof THREE.Quaternion === "function" && meta.obj.quaternion && typeof meta.obj.quaternion.slerp === "function") {
      const sc = this.ensureScratch();
      const qDelta = this.makeModelEulerDelta(rx, ry, rz, order || "YXZ", sc ? sc.qDelta : null);
      const qTarget = this.computeModelSpaceBoneQuat(meta, qDelta, sc ? sc.qTarget : null);
      if (qTarget) meta.obj.quaternion.slerp(qTarget, alpha !== undefined ? alpha : 0.16);
    } else if (meta.obj.rotation) {
      const a = alpha !== undefined ? alpha : 0.16;
      meta.obj.rotation.x += ((rx || 0) - meta.obj.rotation.x) * a;
      meta.obj.rotation.y += ((ry || 0) - meta.obj.rotation.y) * a;
      meta.obj.rotation.z += ((rz || 0) - meta.obj.rotation.z) * a;
    }
  },

  prepareLoadedAvatar: function (gltf, opts) {
    if (!gltf || !gltf.scene) return null;
    const o = opts || {};
    const mode = o.mode === "seated" ? "seated" : "standing";
    const targetHeight = o.targetHeight || (mode === "seated" ? 2.10 : 2.40);
    const baseY = o.baseY !== undefined ? o.baseY : (mode === "seated" ? 0.0 : 0.18);

    const json = gltf.parser && gltf.parser.json ? gltf.parser.json : null;
    const ext = json && json.extensions ? json.extensions : null;
    const isVrm0 = Boolean(ext && ext.VRM);
    const isVrm1 = Boolean(ext && ext.VRMC_vrm);

    const root = new THREE.Group();
    const modelWrap = new THREE.Group();
    const rawScene = gltf.scene;
    modelWrap.add(rawScene);
    // VRM 0.x models face -Z natively; flip 180 deg so ALL avatars share unified Model Space (+Z forward, +Y up, +X char-left, -X char-right)!
    if (isVrm0) modelWrap.rotation.y = Math.PI;
    root.add(modelWrap);

    const boneRes = this.resolveHumanoidBones(gltf, rawScene);
    const bones = boneRes.bones || {};
    const morphs = this.resolveMorphBindings(gltf, rawScene);
    const springBones = this.resolveSpringBones(gltf, boneRes.pickByIdxOrName);

    // CRITICAL STEP 1: Scale model in STANDING T-Pose BEFORE bending legs so seated pose never inflates avatar into a 2.9m giant!
    root.updateMatrixWorld(true);
    if (typeof THREE.Box3 === "function") {
      const box = new THREE.Box3().setFromObject(modelWrap);
      if (typeof box.getSize === "function" && typeof box.getCenter === "function") {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const h = Math.max(0.01, size.y);
        const sc = targetHeight / h;
        modelWrap.scale.setScalar(sc);
        modelWrap.position.set(
          -center.x * sc,
          baseY - box.min.y * sc,
          -center.z * sc
        );
      }
    }

    // CRITICAL STEP 2: Capture true T-Pose Model-Space quaternion bases BEFORE posing any limb!
    root.updateMatrixWorld(true);
    const boneMeta = {};
    Object.keys(bones).forEach((k) => {
      if (bones[k]) boneMeta[k] = this.initBoneQuatData(bones[k]);
    });
    for (let si = 0; si < springBones.length; si++) {
      springBones[si].quatMeta = this.initBoneQuatData(springBones[si].obj);
    }

    // CRITICAL STEP 3: Pose legs & arms using exact anatomical Model-Space quaternions (zero gimbal flip or VRM 1.0 twist!)
    if (mode === "seated") {
      // Thighs extend cleanly FORWARD (+Z) with slight outward splay; knees hang STRAIGHT DOWN (-Y)
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperLeg, -1.40, 0.08, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperLeg, -1.40, -0.08, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerLeg, 1.42, 0, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerLeg, 1.42, 0, 0, "YXZ");

      // Arms drop DOWN & OUT from T-pose (left: Z = -drop, right: Z = +drop) and angle slightly FORWARD (X = -fwd), elbows bend FORWARD around Y (left: Y = -bend, right: Y = +bend)
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperArm, -0.26, 0, -1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperArm, -0.26, 0, 1.08, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerArm, 0, -1.02, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerArm, 0, 1.02, 0, "YXZ");

      // Lift skirt spring-bones slightly forward over thighs to prevent thigh-skirt clipping!
      for (let si = 0; si < springBones.length; si++) {
        if (springBones[si].isSkirt && springBones[si].quatMeta) {
          this.setBoneModelDeltaImmediate(springBones[si].quatMeta, -0.44, 0, 0, "YXZ");
        }
      }

      // Align seated hips cleanly ON TOP of wooden cushion (y = 0.87 -> bottoms rest at y ~ 0.75, ahead of backrest at z = -0.48, clear of table at z = 1.30!)
      if (bones.hips && typeof bones.hips.getWorldPosition === "function") {
        root.updateMatrixWorld(true);
        const hipW = new THREE.Vector3();
        bones.hips.getWorldPosition(hipW);
        modelWrap.position.x += (0 - hipW.x);
        modelWrap.position.y += (0.87 - hipW.y);
        modelWrap.position.z += (0.10 - hipW.z);
      }
    } else {
      this.setBoneModelDeltaImmediate(boneMeta.leftUpperArm, -0.14, 0, -1.14, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightUpperArm, -0.14, 0, 1.14, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.leftLowerArm, 0, -0.35, 0, "YXZ");
      this.setBoneModelDeltaImmediate(boneMeta.rightLowerArm, 0, 0.35, 0, "YXZ");
    }

    // Store initial rest rotations as fallback metadata
    const restRot = {};
    Object.keys(bones).forEach(function (k) {
      if (bones[k] && bones[k].rotation) {
        restRot[k] = {
          x: bones[k].rotation.x || 0,
          y: bones[k].rotation.y || 0,
          z: bones[k].rotation.z || 0
        };
      }
    });

    // Upgrade VRM KHR_materials_unlit meshes to real-time Lit Cel Shading (sun/moon + spotlight + rim + candle bounce!)
    const tintMats = [];
    const celMats = [];
    const canCelUpgrade = Boolean(
      typeof stage3dAnime !== "undefined" &&
      typeof stage3dAnime.upgradeVrmMaterialToCel === "function" &&
      (typeof state === "undefined" || state.quality3D !== "eco")
    );
    if (typeof rawScene.traverse === "function") {
      rawScene.traverse(function (child) {
        if (!child || !child.isMesh) return;
        const isArr = Array.isArray(child.material);
        const origMats = isArr ? child.material : [child.material];
        const nextMats = [];
        let allUnlitBasic = origMats.length > 0;
        let hasOutlineOnly = origMats.length > 0;
        const childName = String(child.name || "");
        let isFaceMesh = /face/i.test(childName);
        const hasSkin = Boolean(child.isSkinnedMesh);
        const hasMorph = Boolean(child.morphTargetInfluences && child.morphTargetInfluences.length);

        origMats.forEach(function (m) {
          if (!m) {
            nextMats.push(m);
            return;
          }
          const mName = String(m.name || "");
          const tagStr = mName + " " + childName;
          const isOutline = (mName && /outline/i.test(mName)) || m.side === THREE.BackSide;
          const keepUnlitEye = /eyewhite|eyehighlight|eyeextra/i.test(tagStr);
          const isFaceMat = /face|skin|brow|mouth|eyeline|eyelash|iris/i.test(tagStr);
          const isHairMat = /hair/i.test(tagStr);
          if (isFaceMat) isFaceMesh = true;
          if (!isOutline) hasOutlineOnly = false;
          if (m.transparent && !m.alphaTest) m.alphaTest = 0.35;
          if (m.map && THREE.sRGBEncoding !== undefined) m.map.encoding = THREE.sRGBEncoding;

          let finalMat = m;
          const isBasic = Boolean(m.isMeshBasicMaterial || m.type === "MeshBasicMaterial");
          if (canCelUpgrade && isBasic && !isOutline && !keepUnlitEye) {
            finalMat = stage3dAnime.upgradeVrmMaterialToCel(m, {
              isFace: isFaceMat,
              isHair: isHairMat,
              skinning: hasSkin,
              morphTargets: hasMorph,
              morphNormals: Boolean(child.geometry && child.geometry.morphAttributes && child.geometry.morphAttributes.normal)
            });
            if (finalMat !== m) {
              allUnlitBasic = false;
              if (finalMat.userData && finalMat.userData.vrmCelUniforms) {
                celMats.push({
                  mat: finalMat,
                  uniforms: finalMat.userData.vrmCelUniforms,
                  isFace: isFaceMat,
                  isHair: isHairMat
                });
              }
            }
          } else if (!isBasic) {
            allUnlitBasic = false;
          }

          if (!isOutline && finalMat.color && typeof finalMat.color.clone === "function") {
            tintMats.push({ mat: finalMat, baseColor: finalMat.color.clone(), isCel: Boolean(finalMat.userData && finalMat.userData.isVrmCel) });
          }
          nextMats.push(finalMat);
        });

        child.material = isArr ? nextMats : nextMats[0];
        child.castShadow = !hasOutlineOnly;
        child.receiveShadow = !isFaceMesh && !allUnlitBasic;
        child.frustumCulled = false;
      });
    }

    const mixer = (Array.isArray(gltf.animations) && gltf.animations.length > 0 && typeof THREE.AnimationMixer === "function")
      ? new THREE.AnimationMixer(rawScene)
      : null;

    return {
      root: root,
      modelWrap: modelWrap,
      rawScene: rawScene,
      isVrm: isVrm0 || isVrm1,
      isVrm0: isVrm0,
      mode: mode,
      baseY: modelWrap.position.y,
      bones: bones,
      boneMeta: boneMeta,
      restRot: restRot,
      morphs: morphs,
      springBones: springBones,
      tintMats: tintMats,
      celMats: celMats,
      mixer: mixer,
      clips: mixer ? gltf.animations : [],
      activeAction: null,
      lastClipTime: null,
      lastMoodKey: "",
      lastAlive: null,
      lastTalkBoost: false,
      blinkAmt: 0,
      winkLAmt: 0,
      mouthAmt: 0,
      vowelAmts: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 },
      happyAmt: 0,
      funAmt: 0,
      angryAmt: 0,
      sorrowAmt: 0,
      surprisedAmt: 0,
      prevHeadYaw: 0,
      headInertia: 0
    };
  },

  applyMorphWeight: function (list, val) {
    if (!list || !list.length) return;
    const v = clamp(val, 0, 1);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.mesh && b.mesh.morphTargetInfluences && b.idx < b.mesh.morphTargetInfluences.length) {
        b.mesh.morphTargetInfluences[b.idx] = v * (b.weight || 1.0);
      }
    }
  },

  updateVrmAvatar: function (inst, opts) {
    if (!inst) return;
    const o = opts || {};
    const t = o.tSec || 0;
    const seed = o.seed || 0;
    const sleeping = Boolean(o.sleeping) || o.alive === false;
    const talking = Boolean(o.talking) && o.alive !== false;
    const sweating = Boolean(o.sweating) && !sleeping && o.alive !== false;
    const emotion = o.emotion || "neutral";
    const arch = this.getIdleArchetype(o.personaName, seed);

    if (inst.mixer && inst.activeAction) {
      const dt = (typeof inst.lastClipTime === "number") ? clamp(t - inst.lastClipTime, 0, 0.1) : 0.016;
      inst.lastClipTime = t;
      inst.mixer.update(dt);
    }

    // 0. Mood-responsive VRM color tint + Real-Time Cel Rim / Candle Bounce Sync!
    const aliveFlag = o.alive !== false;
    const talkBoostFlag = Boolean(talking && aliveFlag);
    if (inst.tintMats && inst.tintMats.length && o.moodKey && (inst.lastMoodKey !== o.moodKey || inst.lastAlive !== aliveFlag || inst.lastTalkBoost !== talkBoostFlag)) {
      inst.lastMoodKey = o.moodKey;
      inst.lastAlive = aliveFlag;
      inst.lastTalkBoost = talkBoostFlag;
      const moodTint = o.moodKey === "night"
        ? { r: 0.72, g: 0.76, b: 0.92 }
        : (o.moodKey === "vote"
          ? { r: 0.91, g: 0.85, b: 0.83 }
          : (o.moodKey === "day" ? { r: 0.90, g: 0.90, b: 0.88 } : { r: 0.87, g: 0.86, b: 0.90 }));
      const deadDim = aliveFlag ? (talkBoostFlag ? 1.07 : 1.0) : 0.55;
      for (let mi = 0; mi < inst.tintMats.length; mi++) {
        const entry = inst.tintMats[mi];
        if (entry.mat && entry.mat.color && entry.baseColor) {
          const mulR = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.06 : 1.0) : 0.56) : (moodTint.r * deadDim);
          const mulG = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.05 : 1.0) : 0.58) : (moodTint.g * deadDim);
          const mulB = entry.isCel ? (aliveFlag ? (talkBoostFlag ? 1.04 : 1.0) : 0.64) : (moodTint.b * deadDim);
          entry.mat.color.r = Math.min(1.0, entry.baseColor.r * mulR);
          entry.mat.color.g = Math.min(1.0, entry.baseColor.g * mulG);
          entry.mat.color.b = Math.min(1.0, entry.baseColor.b * mulB);
        }
      }
      if (inst.celMats && inst.celMats.length) {
        const rimHex = o.moodKey === "night"
          ? (talkBoostFlag ? 0xfde68a : 0x93c5fd)
          : (o.moodKey === "vote" ? 0xfdba74 : (o.moodKey === "day" ? 0xfff7d6 : 0xffe2a8));
        const shadowHex = o.moodKey === "night"
          ? 0x7c86bd
          : (o.moodKey === "vote" ? 0xd9a8a0 : (o.moodKey === "day" ? 0xe8dff0 : 0xc8c2e0));
        const warmB = o.moodKey === "night" ? 0.18 : (o.moodKey === "day" ? 0.06 : 0.14);
        for (let ci = 0; ci < inst.celMats.length; ci++) {
          const cm = inst.celMats[ci];
          const u = cm.uniforms;
          if (!u) continue;
          if (u.uVrmRimColor && u.uVrmRimColor.value && typeof u.uVrmRimColor.value.setHex === "function") {
            u.uVrmRimColor.value.setHex(rimHex);
            if (typeof u.uVrmRimColor.value.convertSRGBToLinear === "function") u.uVrmRimColor.value.convertSRGBToLinear();
          }
          if (u.uVrmShadowTint && u.uVrmShadowTint.value && typeof u.uVrmShadowTint.value.setHex === "function") {
            u.uVrmShadowTint.value.setHex(shadowHex);
            if (typeof u.uVrmShadowTint.value.convertSRGBToLinear === "function") u.uVrmShadowTint.value.convertSRGBToLinear();
          }
          const baseRim = cm.isFace ? 0.14 : (cm.isHair ? 0.28 : 0.22);
          u.uVrmRimStrength.value = aliveFlag ? (talkBoostFlag ? baseRim * 1.55 : baseRim) : 0.04;
          u.uVrmShadowLift.value = aliveFlag ? (cm.isFace ? 0.64 : 0.44) : 0.30;
          u.uVrmWarmBounce.value = aliveFlag ? warmB : 0.02;
        }
      }
    }

    // 1. Multi-Vowel Lip-Sync (a/i/u/e/o) + 12 Full Facial Expressions + Playful Wink
    const blinkCycle = (t + seed * 0.7) % 3.6;
    const isBlinking = !sleeping && emotion !== "shock" && emotion !== "nervous" && blinkCycle > 3.45;
    const isPlayfulWink = !sleeping && (emotion === "happy" || emotion === "laugh") && ((t + seed * 1.9) % 5.2 > 4.92);
    const targetBlink = sleeping ? 1.0 : (isBlinking ? 1.0 : 0.0);
    const targetWinkL = isPlayfulWink ? 0.88 : 0.0;

    let tA = 0, tI = 0, tU = 0, tE = 0, tO = 0;
    if (talking) {
      if (o.vowels) {
        tA = clamp(o.vowels.a || 0, 0, 0.85);
        tI = clamp(o.vowels.i || 0, 0, 0.65);
        tU = clamp(o.vowels.u || 0, 0, 0.60);
        tE = clamp(o.vowels.e || 0, 0, 0.65);
        tO = clamp(o.vowels.o || 0, 0, 0.72);
      } else {
        const amp = clamp(o.mouthAmp || 0.55, 0.1, 1.0);
        tA = amp * 0.78;
        tI = Math.max(0, Math.sin(t * 9.5 + seed)) * amp * 0.36;
        tO = Math.max(0, Math.cos(t * 7.2 + seed)) * amp * 0.38;
      }
      const vSum = tA + tI + tU + tE + tO;
      if (vSum > 1.15) {
        const vSc = 1.15 / vSum;
        tA *= vSc; tI *= vSc; tU *= vSc; tE *= vSc; tO *= vSc;
      }
    } else if (emotion === "shock") {
      tO = 0.62;
    }

    const isNeutralIdle = (!sleeping && !talking && emotion === "neutral" && o.act !== "celebrate" && o.act !== "gasp_react");
    const targetHappy = (emotion === "happy" || emotion === "laugh" || emotion === "proud" || o.act === "celebrate" || o.isBeingVouched || o.speechAct === "vouch_warm")
      ? 0.82
      : (isNeutralIdle ? (arch.idleHappy || 0.0) : 0.0);
    const targetFun = (emotion === "laugh" || emotion === "proud" || o.act === "celebrate" || o.speechAct === "claim_role")
      ? 0.52
      : (emotion === "happy" ? 0.32 : (isNeutralIdle ? (arch.idleFun || 0.0) : 0.0));
    const targetAngry = (emotion === "angry" || emotion === "suspect" || o.isPointingAccuse) ? 0.78 : 0.0;
    const targetSorrow = o.alive === false ? 0.55 : ((emotion === "sorrow" || emotion === "sad") ? 0.72 : (emotion === "nervous" ? 0.25 : 0.0));
    const targetSurprised = (emotion === "shock" || emotion === "nervous" || o.act === "gasp_react") ? 0.80 : 0.0;

    inst.blinkAmt += (targetBlink - inst.blinkAmt) * 0.45;
    inst.winkLAmt += (targetWinkL - inst.winkLAmt) * 0.45;
    inst.mouthAmt += (tA - inst.mouthAmt) * 0.42;
    if (!inst.vowelAmts) inst.vowelAmts = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    inst.vowelAmts.aa += (tA - inst.vowelAmts.aa) * 0.45;
    inst.vowelAmts.ih += (tI - inst.vowelAmts.ih) * 0.45;
    inst.vowelAmts.ou += (tU - inst.vowelAmts.ou) * 0.45;
    inst.vowelAmts.ee += (tE - inst.vowelAmts.ee) * 0.45;
    inst.vowelAmts.oh += (tO - inst.vowelAmts.oh) * 0.45;

    inst.happyAmt += (targetHappy - inst.happyAmt) * 0.18;
    inst.funAmt = (inst.funAmt || 0) + (targetFun - (inst.funAmt || 0)) * 0.18;
    inst.angryAmt = (inst.angryAmt || 0) + (targetAngry - (inst.angryAmt || 0)) * 0.20;
    inst.sorrowAmt = (inst.sorrowAmt || 0) + (targetSorrow - (inst.sorrowAmt || 0)) * 0.18;
    inst.surprisedAmt += (targetSurprised - inst.surprisedAmt) * 0.22;

    this.applyMorphWeight(inst.morphs.blink, inst.blinkAmt);
    if (inst.winkLAmt > 0.02) this.applyMorphWeight(inst.morphs.blink_l, inst.winkLAmt);
    this.applyMorphWeight(inst.morphs.aa, inst.vowelAmts.aa);
    this.applyMorphWeight(inst.morphs.ih, inst.vowelAmts.ih);
    this.applyMorphWeight(inst.morphs.ou, inst.vowelAmts.ou);
    this.applyMorphWeight(inst.morphs.ee, inst.vowelAmts.ee);
    this.applyMorphWeight(inst.morphs.oh, inst.vowelAmts.oh);
    this.applyMorphWeight(inst.morphs.happy, inst.happyAmt);
    this.applyMorphWeight(inst.morphs.fun, inst.funAmt);
    this.applyMorphWeight(inst.morphs.angry, inst.angryAmt);
    this.applyMorphWeight(inst.morphs.sorrow, inst.sorrowAmt);
    this.applyMorphWeight(inst.morphs.surprised, inst.surprisedAmt);

    // 2. Unified Model-Space Quaternion Rig Animation (works identically across VRM 0.x & non-identity VRM 1.0 skeletons!)
    const bm = inst.boneMeta || {};
    const yawNow = clamp(o.headYaw || 0, -0.75, 0.75);
    const pitchNow = clamp(o.headPitch || 0, -0.42, 0.45);
    const nodOffset = (emotion === "happy" || o.isBeingVouched) ? Math.sin(t * 7.5 + seed) * 0.075 : 0;
    const shakeOffset = (emotion === "nervous" || sweating) ? Math.sin(t * 14 + seed) * 0.065 : 0;
    const idleRoll = sleeping ? 0 : (arch.headTiltBias + Math.sin(t * 1.15 + seed) * arch.headRollAmp);

    // Head looks directly toward +yawNow (around +Y) and +pitchNow (around +X, positive = bow/sleep down)
    if (bm.head) {
      this.slerpBoneModelDelta(bm.head, pitchNow + nodOffset, yawNow + shakeOffset, idleRoll, 0.18, "YXZ");
    }
    // Expressive Eye-Bone Micro-Saccades (eyes lead head gaze; nervous wolves show subtle sideways dart!)
    if (bm.leftEye || bm.rightEye) {
      const dartEye = (!sleeping && (sweating || emotion === "nervous"))
        ? Math.sin(t * 6.8 + seed * 1.3) * 0.14
        : (!sleeping ? Math.sin(t * 1.4 + seed * 2.1) * 0.035 : 0);
      const eyeYaw = sleeping ? 0 : clamp(yawNow * 0.28 + dartEye, -0.22, 0.22);
      const eyePitch = sleeping ? 0.12 : clamp(pitchNow * 0.22, -0.14, 0.14);
      if (bm.leftEye) this.slerpBoneModelDelta(bm.leftEye, eyePitch, eyeYaw, 0, 0.34, "YXZ");
      if (bm.rightEye) this.slerpBoneModelDelta(bm.rightEye, eyePitch, eyeYaw, 0, 0.34, "YXZ");
    }
    if (bm.spine) {
      const baseLean = o.isPointingAccuse ? 0.09 : (o.isAccusing ? -0.06 : (o.speechAct === "claim_role" ? -0.03 : (talking ? 0.05 : (sleeping ? 0.04 : arch.spineLean))));
      const breathWave = Math.sin(t * arch.breathFreq + seed) * arch.breathAmp;
      this.slerpBoneModelDelta(bm.spine, clamp(baseLean + breathWave, -0.08, 0.12), 0, 0, 0.14, "YXZ");
    }
    if (bm.chest) {
      this.slerpBoneModelDelta(bm.chest, Math.sin(t * arch.breathFreq + seed + 0.5) * (arch.breathAmp * 0.8), 0, 0, 0.14, "YXZ");
    }

    // Intuitive anatomical arm parameters: drop (0.20..1.20 down from T-pose), fwd (0..1.10 forward +Z), bend (0.10..1.55 elbow flex around Y)
    let rDrop = arch.rDrop, rFwd = arch.rFwd, rBend = arch.rBend;
    let lDrop = arch.lDrop, lFwd = arch.lFwd, lBend = arch.lBend;
    if (sleeping) {
      rDrop = 1.12; rFwd = 0.16; rBend = 0.82;
      lDrop = 1.12; lFwd = 0.16; lBend = 0.82;
    } else if (o.act === "celebrate") {
      rDrop = -0.35 + Math.sin(t * 5.0 + seed) * 0.14; rFwd = 0.35; rBend = 0.45;
      lDrop = -0.35 + Math.cos(t * 5.0 + seed) * 0.14; lFwd = 0.35; lBend = 0.45;
    } else if (o.act === "welcome_bow" || o.isHovered) {
      rDrop = 0.48; rFwd = 0.50; rBend = 1.02 + Math.sin(t * 6.5 + seed) * 0.22;
      lDrop = 1.10; lFwd = 0.20; lBend = 0.85;
    } else if (o.isVoting || o.act === "purify_cast") {
      rDrop = 0.28 + Math.sin(t * 5.0 + seed) * 0.08; rFwd = 0.48; rBend = 0.42;
      lDrop = 1.10; lFwd = 0.22; lBend = 0.90;
    } else if (o.speechAct === "claim_role") {
      rDrop = 0.45; rFwd = 0.72 + Math.sin(t * 5.2 + seed) * 0.08; rBend = 0.62;
      lDrop = 0.56; lFwd = 0.58 + Math.cos(t * 4.8 + seed) * 0.06; lBend = 0.72;
    } else if (o.isPointingAccuse) {
      rDrop = 0.86; rFwd = 1.14 + Math.sin(t * 8.0 + seed) * 0.06; rBend = 0.18;
      lDrop = 1.08; lFwd = 0.28; lBend = 1.02;
    } else if (o.speechAct === "vouch_warm") {
      rDrop = 0.76; rFwd = 0.82 + Math.sin(t * 4.8 + seed) * 0.06; rBend = 0.52;
      lDrop = 1.02; lFwd = 0.36; lBend = 0.98;
    } else if (o.isAccusing) {
      rDrop = 0.92; rFwd = 0.46; rBend = 1.32;
      lDrop = 0.92; lFwd = 0.46; lBend = 1.32;
    } else if (talking) {
      const talkAmp = clamp(o.mouthAmp || 0.4, 0.2, 1.0);
      rDrop = 0.96 - talkAmp * 0.08;
      rFwd = 0.38 + Math.sin(t * 7.2 + seed) * (0.12 + talkAmp * 0.08);
      rBend = 1.05 + Math.cos(t * 6.5) * 0.14;
      lDrop = 1.02;
      lFwd = 0.30 + Math.cos(t * 6.5 + seed) * 0.08;
      lBend = 0.98;
    } else if (sweating) {
      // Observable nervous fidget: subtly tense shoulders & restless hands
      rDrop = 0.90; rFwd = 0.44 + Math.sin(t * 9.5 + seed) * 0.04; rBend = 1.26;
      lDrop = 0.92; lFwd = 0.40 + Math.cos(t * 8.5 + seed) * 0.04; lBend = 1.22;
    } else if (o.isListeningCurious && inst.mode === "seated") {
      // Thoughtful deduction posture: right hand gently raised near chin while listening intently
      rDrop = 0.72; rFwd = 0.60 + Math.sin(t * 1.6 + seed) * 0.025; rBend = 1.42;
      lDrop = 1.06; lFwd = 0.24; lBend = 0.96;
    } else if (inst.mode === "standing") {
      rDrop = 1.14; rFwd = 0.12; rBend = 0.36;
      lDrop = 1.14; lFwd = 0.12; lBend = 0.36;
    } else {
      const sway = Math.sin(t * (arch.breathFreq * 0.72) + seed) * arch.armSwayAmp;
      rFwd += sway;
      lFwd -= sway * 0.7;
    }

    rDrop = clamp(rDrop, -0.55, 1.22);
    lDrop = clamp(lDrop, -0.55, 1.22);
    rFwd = clamp(rFwd, 0.05, 1.25);
    lFwd = clamp(lFwd, 0.05, 1.25);
    rBend = clamp(rBend, 0.10, 1.55);
    lBend = clamp(lBend, 0.10, 1.55);

    if (bm.rightUpperArm) this.slerpBoneModelDelta(bm.rightUpperArm, -rFwd, 0, rDrop, 0.16, "YXZ");
    if (bm.leftUpperArm) this.slerpBoneModelDelta(bm.leftUpperArm, -lFwd, 0, -lDrop, 0.16, "YXZ");
    if (bm.rightLowerArm) this.slerpBoneModelDelta(bm.rightLowerArm, 0, rBend, 0, 0.16, "YXZ");
    if (bm.leftLowerArm) this.slerpBoneModelDelta(bm.leftLowerArm, 0, -lBend, 0, 0.16, "YXZ");

    // 3. SpringBone Hair, Ribbons & Skirt Model-Space Physics (gentle non-clipping mountain breeze!)
    const dYaw = clamp(yawNow - (inst.prevHeadYaw || 0), -0.25, 0.25);
    inst.prevHeadYaw = yawNow;
    inst.headInertia = (inst.headInertia || 0) * 0.84 + dYaw * 1.4;

    const qMode = (typeof state !== "undefined" && state.quality3D) ? state.quality3D : "high";
    const springStride = o.isPriority ? 1 : (qMode === "eco" ? 3 : (qMode === "balanced" ? 2 : 1));
    const runSprings = springStride <= 1 || typeof o.frameCounter !== "number" || ((o.frameCounter + (o.seatId || 0)) % springStride === 0);
    if (runSprings && inst.springBones && inst.springBones.length) {
      for (let si = 0; si < inst.springBones.length; si++) {
        const sb = inst.springBones[si];
        if (!sb || !sb.quatMeta) continue;
        if (sb.isSkirt && inst.mode === "seated") {
          const skSway = Math.sin(t * 1.6 + sb.phase) * 0.022;
          this.slerpBoneModelDelta(sb.quatMeta, -0.44 + skSway, 0, 0, 0.16, "YXZ");
        } else {
          const baseAmp = clamp(0.045 / Math.sqrt(sb.stiffness || 0.7), 0.02, 0.065);
          const breezeZ = clamp(Math.sin(t * 2.1 + sb.phase) * baseAmp + inst.headInertia * 0.18, -0.08, 0.08);
          const breezeX = clamp(Math.cos(t * 1.7 + sb.phase) * (baseAmp * 0.65), -0.06, 0.06);
          this.slerpBoneModelDelta(sb.quatMeta, breezeX, 0, breezeZ, 0.16, "YXZ");
        }
      }
    }
  }
};
