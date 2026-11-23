/**
 * 圓桌舞台互動事件：滑鼠/觸控拖曳互動、點選座位、放射選單與視窗縮放
 */
"use strict";

function bindCanvasEvents() {
  const canvas = el("sanctuaryCanvas");
  function getCanvasPoint(ev) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    return {
      x: (ev.clientX - rect.left) * dpr,
      y: (ev.clientY - rect.top) * dpr,
      dpr: dpr
    };
  }
  function hitTestSeat(mx, my, radiusMul, ev) {
    if (ev && typeof stage3d !== "undefined" && stage3d.isActive()) {
      const rayHit = stage3d.raycastSeat(ev.clientX, ev.clientY);
      if (rayHit) return rayHit;
    }
    const mul = radiusMul || 1.32;
    for (let i = 0; i < state.seatCoords.length; i++) {
      const c = state.seatCoords[i];
      if (c.visibleInView === false) continue;
      if (Math.hypot(mx - c.x, my - c.y) <= c.r * mul) return c;
    }
    return null;
  }

  let orbitMoved = false;
  const activeTouches = new Map();
  let lastPinchDist = 0;

  canvas.addEventListener("pointermove", function (ev) {
    if (activeTouches.has(ev.pointerId)) {
      activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (activeTouches.size === 2 && typeof stage3d !== "undefined" && stage3d.isActive()) {
        const pts = Array.from(activeTouches.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist > 0) {
          stage3d.zoomBy((lastPinchDist - dist) * 2.2);
        }
        lastPinchDist = dist;
        orbitMoved = true;
        return;
      }
    }

    const pt = getCanvasPoint(ev);
    state.pointer.x = pt.x;
    state.pointer.y = pt.y;
    state.pointer.inside = true;
    if (Math.random() < 0.45 || state.dragAction.active) {
      state.pointerTrail.push({ x: pt.x, y: pt.y, born: performance.now() });
      if (state.pointerTrail.length > 26) state.pointerTrail.shift();
    }

    if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.orbit.dragging) {
      stage3d.moveOrbit(ev.clientX, ev.clientY);
      orbitMoved = true;
      canvas.style.cursor = "grabbing";
      return;
    }

    const hitNode = hitTestSeat(pt.x, pt.y, 1.34, ev);
    state.hoverSeatId = hitNode ? hitNode.id : null;

    if (state.dragAction.active) {
      state.dragAction.curX = pt.x;
      state.dragAction.curY = pt.y;
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.updateDragWorldPoint(ev.clientX, ev.clientY);
      }
      if (Math.hypot(pt.x - state.dragAction.startX, pt.y - state.dragAction.startY) > 20 * pt.dpr) {
        state.dragAction.moved = true;
      }
      const snapNode = hitTestSeat(pt.x, pt.y, 1.65, ev);
      const validSnap = snapNode && snapNode.id !== state.dragAction.fromId && snapNode.seat && snapNode.seat.alive;
      const nextSnapId = validSnap ? snapNode.id : null;
      if (nextSnapId && nextSnapId !== state.dragAction.snapId) {
        sound.tone(540 + nextSnapId * 25, 0.05, "sine", 0.035, 0);
        nudgeSeat(nextSnapId, { scale: 1.18, vScale: 0.08 });
      }
      state.dragAction.snapId = nextSnapId;
      canvas.style.cursor = "grabbing";
    } else {
      const is3D = typeof stage3d !== "undefined" && stage3d.isActive();
      let hitProp = false;
      if (is3D && !hitNode) {
        const nowRay = performance.now();
        if (!canvas._lastPropRayAt || nowRay - canvas._lastPropRayAt >= 48) {
          canvas._lastPropRayAt = nowRay;
          canvas._lastHitProp = Boolean(stage3d.raycastCenterCrystal(ev.clientX, ev.clientY) || stage3d.raycastIdCard(ev.clientX, ev.clientY) || stage3d.raycastCandle(ev.clientX, ev.clientY) || stage3d.raycastGuishan(ev.clientX, ev.clientY) || stage3d.raycastHeroHost(ev.clientX, ev.clientY));
        }
        hitProp = Boolean(canvas._lastHitProp);
      }
      canvas.style.cursor = hitNode ? "grab" : (hitProp ? "pointer" : (is3D ? "move" : "default"));
    }
  });

  canvas.addEventListener("pointerdown", function (ev) {
    sound.unlock();
    if (ev.pointerType === "touch") {
      activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (activeTouches.size === 2) {
        const pts = Array.from(activeTouches.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (typeof stage3d !== "undefined") stage3d.endOrbit();
        return;
      }
    }
    const pt = getCanvasPoint(ev);
    spawnRipple(pt.x, pt.y, document.body.classList.contains("theme-day") ? "#d97706" : "#fbbf24", 44);
    closeRadialMenu();
    const hitNode = hitTestSeat(pt.x, pt.y, 1.36, ev);
    if (hitNode && hitNode.seat && hitNode.seat.alive) {
      nudgeSeat(hitNode.id, { scale: 0.88, vScale: 0.14 });
      state.dragAction = {
        active: true,
        moved: false,
        fromId: hitNode.id,
        startX: pt.x,
        startY: pt.y,
        curX: pt.x,
        curY: pt.y,
        snapId: null
      };
      if (typeof stage3d !== "undefined" && stage3d.isActive()) {
        stage3d.updateDragWorldPoint(ev.clientX, ev.clientY);
      }
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    } else if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      orbitMoved = false;
      stage3d.beginOrbit(ev.clientX, ev.clientY);
      canvas.style.cursor = "grabbing";
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    }
  });

  function finishCanvasDrag(ev) {
    if (ev && activeTouches.has(ev.pointerId)) {
      activeTouches.delete(ev.pointerId);
      if (activeTouches.size < 2) lastPinchDist = 0;
    }
    if (typeof stage3d !== "undefined" && stage3d.orbit.dragging) {
      stage3d.endOrbit();
      if (orbitMoved) {
        state.suppressNextClick = true;
        setTimeout(function () { state.suppressNextClick = false; }, 120);
      }
      orbitMoved = false;
      canvas.style.cursor = stage3d.isActive() ? "move" : "default";
    }
    if (!state.dragAction.active) return;
    const drag = state.dragAction;
    state.dragAction = { active: false, moved: false, fromId: null, startX: 0, startY: 0, curX: 0, curY: 0, snapId: null };
    canvas.style.cursor = state.hoverSeatId ? "grab" : "default";

    if (drag.moved) {
      state.suppressNextClick = true;
      setTimeout(function () { state.suppressNextClick = false; }, 120);
      if (drag.snapId) {
        const targetId = drag.snapId;
        const pid = getPlayerId();
        const p = state.match.phase;
        const player = getPlayerSeat();
        if (!state.match.started || p === "LOBBY") {
          const greetId = targetId !== pid ? targetId : (drag.fromId !== pid ? drag.fromId : null);
          if (greetId) {
            spawnBeam(drag.fromId, targetId, "#fbbf24", "trust");
            setSeatEmotion(greetId, "happy", 3200);
            setSeatEmotion(pid, "happy", 2400);
            nudgeSeat(greetId, { scale: 1.2, vy: -8, vTilt: 0.16 });
            state.intelSeatId = greetId;
            pokeSeatWithReaction(greetId);
            updateAllUI();
          }
        } else if (p === "DAY_VOTE" && isPlayerEligibleToVote() && !(state.voteFlight && state.voteFlight.active)) {
          if (!isValidVoteTarget(targetId)) {
            showToast("平票 PK 決選僅能投給 PK 台上的候選人（或棄票）！", "warn");
          } else {
            state.selectedSeatId = targetId;
            finalizeVoteRound(targetId);
          }
        } else if (p === "NIGHT_GUARD" && targetId === state.match.lastGuardTargetId && player && player.alive && player.role === "guard") {
          showToast("《凹嗚》規則：同一位夥伴不可連續兩晚守護！", "warn");
        } else if (p === "NIGHT_WOLF" && player && player.alive && player.role === "wolf" && getSeat(targetId) && getSeat(targetId).role === "wolf") {
          showToast("他是你的酸民狼同伴，請改鎖定好人！", "warn");
        } else if (((p === "NIGHT_GUARD" && player && player.alive && player.role === "guard" && state.match.lastGuardTargetId !== targetId) ||
                    (p === "NIGHT_SEER" && !state.seerReveal && player && player.alive && player.role === "seer") ||
                    (p === "NIGHT_WOLF" && player && player.alive && player.role === "wolf" && getSeat(targetId) && getSeat(targetId).role !== "wolf") ||
                    (p === "HUNTER_TRIGGER" && player && canSeatTriggerShot(player) && !player.alive && !(player.isWolfKing && getSeat(targetId) && getSeat(targetId).role === "wolf"))) && (p === "NIGHT_GUARD" || targetId !== pid)) {
          state.selectedSeatId = targetId;
          confirmTargetAction();
        } else if (p === "DAY_PLAYER_TURN" && targetId !== pid) {
          state.selectedSeatId = targetId;
          spawnBeam(pid, targetId, "#38bdf8", "emote");
          nudgeSeat(targetId, { scale: 1.16 });
          preparePlayerSpeechPanel();
          updateAllUI();
          showToast("🎯 已拖曳鎖定 " + fmtSeatNum(targetId) + "號 為發言點名對象！", "emerald");
        } else if (targetId !== pid && !isNightPhase(p) && p !== "SHERIFF_ELECTION" && p !== "SHERIFF_ORDER" && p !== "SHERIFF_TRANSFER") {
          openRadialMenu(targetId);
        }
      }
    }
  }
  canvas.addEventListener("pointerup", finishCanvasDrag);
  canvas.addEventListener("pointercancel", finishCanvasDrag);

  canvas.addEventListener("pointerleave", function () {
    state.pointer.inside = false;
    state.hoverSeatId = null;
    if (!state.dragAction.active) canvas.style.cursor = "default";
  });

  canvas.addEventListener("click", function (ev) {
    if (state.suppressNextClick) return;
    const pt = getCanvasPoint(ev);
    const hitNode = hitTestSeat(pt.x, pt.y, 1.32, ev);
    if (hitNode) {
      nudgeSeat(hitNode.id, { scale: 0.87, vScale: 0.24, vy: -4 });
      selectSeat(hitNode.id);
    } else if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.raycastIdCard(ev.clientX, ev.clientY)) {
      stage3d.toggleIdCardPeek();
    } else if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.raycastCenterCrystal(ev.clientX, ev.clientY)) {
      stage3d.interactWithCrystal();
    } else if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.raycastCandle(ev.clientX, ev.clientY)) {
      stage3d.pokeCandle(stage3d.raycastCandle(ev.clientX, ev.clientY));
    } else if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.raycastHeroHost(ev.clientX, ev.clientY)) {
      stage3d.interactWithHeroHost();
    } else if (typeof stage3d !== "undefined" && stage3d.isActive() && stage3d.raycastGuishan(ev.clientX, ev.clientY)) {
      stage3d.interactWithGuishan();
    } else {
      if (typeof stage3d !== "undefined" && stage3d.closeUpSeatId) stage3d.clearCloseUp();
      closeRadialMenu();
    }
  });

  if (el("radialSeatMenu")) {
    el("radialSeatMenu").querySelectorAll("[data-radial]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        executeRadialAction(btn.getAttribute("data-radial"));
      });
    });
  }

  canvas.addEventListener("wheel", function (ev) {
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      ev.preventDefault();
      stage3d.zoomBy(ev.deltaY);
    }
  }, { passive: false });

  canvas.addEventListener("dblclick", function (ev) {
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      const pt = getCanvasPoint(ev);
      const hitNode = hitTestSeat(pt.x, pt.y, 1.32, ev);
      if (hitNode) {
        stage3d.focusSeatCloseUp(hitNode.id);
        openSeatIntel(hitNode.id);
      } else {
        stage3d.clearCloseUp();
        stage3d.resetCamera();
        showToast("已重置 3D 運鏡視角", "emerald");
      }
    }
  });

  if (el("btnToggle3D")) {
    el("btnToggle3D").addEventListener("click", function () {
      sound.unlock();
      if (typeof stage3d !== "undefined") stage3d.toggleViewMode();
    });
  }

  if (el("cam3DToolbar")) {
    el("cam3DToolbar").querySelectorAll("[data-cam-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        if (typeof stage3d !== "undefined") {
          stage3d.setCameraPreset(btn.getAttribute("data-cam-preset"));
        }
      });
    });
  }

  if (el("btnToggle3DQuality")) {
    el("btnToggle3DQuality").addEventListener("click", function () {
      sound.unlock();
      if (typeof stage3d !== "undefined") stage3d.toggleQualityMode();
    });
  }

  if (el("btnReset3DCam")) {
    el("btnReset3DCam").addEventListener("click", function () {
      sound.unlock();
      if (typeof stage3d !== "undefined") {
        stage3d.resetCamera();
        showToast("已重置 3D 運鏡視角", "emerald");
      }
    });
  }

  window.addEventListener("resize", resizeCanvas);

  // Tactile 3D Card Perspective Tilt on hover for Speech Cards, Four-Givings Fan & Role Deal Card
  let activeTiltCard = null;
  const resetTiltCard = function () {
    if (!activeTiltCard) return;
    activeTiltCard.classList.remove("is-tilting");
    activeTiltCard.style.removeProperty("--tilt-x");
    activeTiltCard.style.removeProperty("--tilt-y");
    activeTiltCard = null;
  };
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("pointermove", function (ev) {
      const tgt = ev && ev.target && typeof ev.target.closest === "function"
        ? ev.target.closest(".play-card-btn, .fourg-card, #roleDealCardBox")
        : null;
      if (!tgt || tgt.disabled) {
        if (activeTiltCard) resetTiltCard();
        return;
      }
      if (activeTiltCard && activeTiltCard !== tgt) resetTiltCard();
      activeTiltCard = tgt;
      const rect = tgt.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const rx = clamp(((ev.clientY - rect.top) / rect.height - 0.5) * -14, -9, 9);
      const ry = clamp(((ev.clientX - rect.left) / rect.width - 0.5) * 16, -10, 10);
      tgt.style.setProperty("--tilt-x", rx.toFixed(2) + "deg");
      tgt.style.setProperty("--tilt-y", ry.toFixed(2) + "deg");
      tgt.classList.add("is-tilting");
    });
    document.addEventListener("pointerleave", resetTiltCard);
  }
}
