/**
 * 獨立遊戲 8 階段介面流程協調器：
 * - 動態標題主畫面與無表單「自訂茶席」滑出抽屜
 * - 開局 1.8 秒「抽牌入戲儀式」
 * - 雙分頁「茶席手札（對話紀錄｜票型小抄）」與 Esc 暫停選單
 * - 單鍵循環視角按鈕、四給手牌懸停抽牌音效、三瓣微蓮花印點亮同步
 * - 360° 旗艦角色「清茗」鑑賞台與三視圖概念稿檢視器
 */
"use strict";

function dismissDragGestureHint() {
  if (typeof state !== "undefined") {
    state.dragHintDismissed = true;
    if (state._dragHintTimer) {
      clearTimeout(state._dragHintTimer);
      state._dragHintTimer = null;
    }
  }
  const hint = el("dragGestureHint");
  if (hint) hint.classList.add("is-dismissed");
}

function scheduleDragGestureHintAutoHide(delayMs) {
  if (typeof state === "undefined" || state.dragHintDismissed) {
    const hint = el("dragGestureHint");
    if (hint && typeof state !== "undefined" && state.dragHintDismissed) hint.classList.add("is-dismissed");
    return;
  }
  if (state._dragHintTimer) {
    clearTimeout(state._dragHintTimer);
    state._dragHintTimer = null;
  }
  const ms = Math.max(1000, Number(delayMs) || 8000);
  state._dragHintTimer = setTimeout(function () {
    state._dragHintTimer = null;
    dismissDragGestureHint();
  }, ms);
}

const indieFlow = {
  dealTimer: null,
  cardPeekTimer: null,
  onRoleDealClosed: null,

  syncSetupDrawerFromSelects: function () {
    const cnt = el("selectModeCount") ? el("selectModeCount").value : "6";
    const role = el("selectPreferredRole") ? el("selectPreferredRole").value : "seer";
    const diff = el("selectAiDifficulty") ? el("selectAiDifficulty").value : "normal";
    const depth = el("selectRuleDepth") ? el("selectRuleDepth").value : (state.ruleDepth || "full");
    const sh = el("chkSheriffMode") ? Boolean(el("chkSheriffMode").checked) : false;
    const gd = el("chkGuardMode") ? Boolean(el("chkGuardMode").checked) : Boolean(state.guardMode);

    document.querySelectorAll("[data-setup-count]").forEach(function (b) {
      b.classList.toggle("is-selected", b.getAttribute("data-setup-count") === cnt);
    });
    document.querySelectorAll("[data-setup-role]").forEach(function (b) {
      b.classList.toggle("is-selected", b.getAttribute("data-setup-role") === role);
    });
    document.querySelectorAll("[data-setup-diff]").forEach(function (b) {
      b.classList.toggle("is-selected", b.getAttribute("data-setup-diff") === diff);
    });
    document.querySelectorAll("[data-setup-depth]").forEach(function (b) {
      b.classList.toggle("is-selected", b.getAttribute("data-setup-depth") === depth);
    });
    const shToggle = el("btnSetupSheriffToggle");
    if (shToggle) {
      shToggle.classList.toggle("is-selected", sh);
      shToggle.textContent = sh ? "已開啟・1.5 票" : "未開啟";
    }
    const gdToggle = el("btnSetupGuardToggle");
    if (gdToggle) {
      gdToggle.classList.toggle("is-selected", gd);
      gdToggle.textContent = gd ? "已開啟・守衛" : "未開啟";
    }
    this.renderSetupVariantsGrid();
  },

  renderSetupVariantsGrid: function () {
    const grid = el("setupVariantsGrid");
    const statusEl = el("setupVariantStatus");
    if (!grid) return;
    const career = typeof loadCareerStats === "function" ? loadCareerStats() : { wins: 0, unlockedBadges: [] };
    const wins = career.wins || 0;
    const badges = Array.isArray(career.unlockedBadges) ? career.unlockedBadges.length : 0;
    const curVar = state.activeVariant || "standard";
    const defs = (typeof CLOUD_VARIANT_DEFS !== "undefined" && Array.isArray(CLOUD_VARIANT_DEFS)) ? CLOUD_VARIANT_DEFS : [];
    const curDef = defs.find(function (d) { return d.id === curVar; });
    if (statusEl) {
      statusEl.textContent = curDef ? curDef.title : "標準席";
    }

    grid.innerHTML = "";
    const stdBtn = document.createElement("button");
    stdBtn.type = "button";
    stdBtn.className = "variant-pick-card" + (curVar === "standard" ? " is-selected" : "");
    stdBtn.setAttribute("data-setup-variant", "standard");
    stdBtn.innerHTML =
      '<div class="flex items-center justify-between gap-2">' +
      '<span class="font-serif-craft text-sm font-bold text-amber-100">標準雲起席</span>' +
      '<span class="variant-pill">預設常規</span>' +
      '</div>' +
      '<div class="text-[13px] text-slate-400 mt-0.5 text-left">依上方人數與進階板設定正常開局。</div>';
    stdBtn.addEventListener("click", function () {
      state.activeVariant = "standard";
      if (typeof saveUserPrefs === "function") saveUserPrefs();
      indieFlow.renderSetupVariantsGrid();
    });
    grid.appendChild(stdBtn);

    defs.forEach(function (v) {
      const unlocked = typeof isVariantUnlocked === "function" ? isVariantUnlocked(v.id, career) : true;
      const selected = curVar === v.id && unlocked;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "variant-pick-card" + (selected ? " is-selected" : "") + (unlocked ? "" : " is-locked");
      btn.setAttribute("data-setup-variant", v.id);
      const lockText = unlocked
        ? v.badge
        : ("需 " + v.needWins + " 勝或 " + v.needBadges + " 勳章（目前 " + wins + " 勝/" + badges + " 章）");
      btn.innerHTML =
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="font-serif-craft text-sm font-bold ' + (unlocked ? "text-amber-200" : "text-slate-400") + '">' + escapeHtml(v.title) + '</span>' +
        '<span class="variant-pill ' + (unlocked ? "is-open" : "is-locked") + '">' + escapeHtml(lockText) + '</span>' +
        '</div>' +
        '<div class="text-[13px] text-slate-400 mt-0.5 text-left">' + escapeHtml(v.desc) + '</div>';
      btn.addEventListener("click", function () {
        if (!unlocked) {
          if (typeof showToast === "function") {
            showToast("尚未解鎖【" + v.title + "】：累計 " + v.needWins + " 勝或 " + v.needBadges + " 枚勳章即可解鎖。", "warn");
          }
          return;
        }
        state.activeVariant = v.id;
        if (typeof saveUserPrefs === "function") saveUserPrefs();
        indieFlow.renderSetupVariantsGrid();
      });
      grid.appendChild(btn);
    });
  },

  openSetupDrawer: function (open) {
    const d = el("setupDrawer");
    if (!d) return;
    if (open) this.syncSetupDrawerFromSelects();
    d.classList.toggle("hidden", !open);
  },

  openPauseMenu: function (open) {
    const m = el("modalPauseMenu");
    if (!m) return;
    m.classList.toggle("hidden", !open);
  },

  togglePauseMenu: function () {
    const m = el("modalPauseMenu");
    if (!m) return;
    const isHidden = m.classList.contains("hidden");
    m.classList.toggle("hidden", !isHidden);
  },

  openJournal: function (tabKey) {
    const m = el("modalJournal");
    if (!m) return;
    m.classList.remove("hidden");
    this.switchJournalTab(tabKey || "log");
  },

  switchJournalTab: function (tabKey) {
    const key = (tabKey === "vote" || tabKey === "matrix") ? tabKey : "log";
    const tLog = el("tabJournalLog");
    const tMat = el("tabJournalMatrix");
    const tVote = el("tabJournalVote");
    const pLog = el("journalPaneLog");
    const pMat = el("journalPaneMatrix");
    const pVote = el("journalPaneVote");
    if (tLog) tLog.classList.toggle("is-active", key === "log");
    if (tMat) tMat.classList.toggle("is-active", key === "matrix");
    if (tVote) tVote.classList.toggle("is-active", key === "vote");
    if (pLog) pLog.classList.toggle("hidden", key !== "log");
    if (pMat) pMat.classList.toggle("hidden", key !== "matrix");
    if (pVote) pVote.classList.toggle("hidden", key !== "vote");
    if (key === "vote" && typeof renderVoteSheetIntoBody === "function") {
      renderVoteSheetIntoBody();
    } else if (key === "matrix" && typeof renderTableMatrixIntoBody === "function") {
      renderTableMatrixIntoBody();
    } else if (typeof renderTimeline === "function") {
      renderTimeline();
    }
  },

  dealUnsealTimer: null,
  dealRevealTimer: null,
  dealRevealed: false,
  dealIsWolf: false,

  unsealRoleDealCard: function () {
    const ov = el("roleDealOverlay");
    if (!ov || ov.classList.contains("hidden") || this.dealRevealed) return;
    if (this.dealUnsealTimer) {
      clearTimeout(this.dealUnsealTimer);
      this.dealUnsealTimer = null;
    }
    if (this.dealRevealTimer) {
      clearTimeout(this.dealRevealTimer);
      this.dealRevealTimer = null;
    }
    this.dealRevealed = true;
    const isWolfNow = Boolean(this.dealIsWolf);
    ov.classList.remove("is-sealed");
    ov.classList.add("is-unsealing");
    if (typeof sound !== "undefined" && typeof sound.playCardRustle === "function") {
      sound.playCardRustle();
    }
    const self = this;
    const pacingMul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
    this.dealRevealTimer = setTimeout(function () {
      self.dealRevealTimer = null;
      const ovNow = el("roleDealOverlay");
      if (!ovNow || ovNow.classList.contains("hidden")) return;
      ovNow.classList.remove("is-unsealing");
      ovNow.classList.add("is-revealed");
      if (typeof sound !== "undefined" && typeof sound.playRoleRevealFanfare === "function") {
        sound.playRoleRevealFanfare(isWolfNow);
      }
      if (typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive()) {
        if (stage3d.env) stage3d.env.lotusSpinBoost = 1.15;
        if (stage3d.fx && typeof spawn3DShockwave === "function" && typeof THREE !== "undefined") {
          spawn3DShockwave(stage3d.fx, new THREE.Vector3(0, 0, 0), isWolfNow ? "#e11d48" : "#f5b942", performance.now(), 1.18, 7.2);
        }
        if (stage3d.hero && typeof triggerHeroAction === "function") {
          triggerHeroAction(stage3d.hero, "welcome_bow", 2600);
        }
        state.cardPeek3D = true;
        if (self.cardPeekTimer) clearTimeout(self.cardPeekTimer);
        self.cardPeekTimer = setTimeout(function () {
          self.cardPeekTimer = null;
          state.cardPeek3D = false;
        }, Math.round(3200 * pacingMul));
      }
    }, 200);
  },

  showRoleDealRitual: function (roleKey) {
    this.onRoleDealClosed = null;
    const ov = el("roleDealOverlay");
    const pSelf = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    const effKey = (pSelf && typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(pSelf) : null) || roleKey;
    const rDef = ROLE_DEFS[effKey] || ROLE_DEFS[roleKey];
    if (!ov || !rDef) return;
    if (this.dealTimer) {
      clearTimeout(this.dealTimer);
      this.dealTimer = null;
    }
    if (this.dealUnsealTimer) {
      clearTimeout(this.dealUnsealTimer);
      this.dealUnsealTimer = null;
    }
    if (this.dealRevealTimer) {
      clearTimeout(this.dealRevealTimer);
      this.dealRevealTimer = null;
    }
    if (this.cardPeekTimer) {
      clearTimeout(this.cardPeekTimer);
      this.cardPeekTimer = null;
    }
    const isWolf = rDef.team === "wolf";
    this.dealIsWolf = isWolf;
    this.dealRevealed = false;
    const guide = (typeof ROLE_GUIDES !== "undefined" && ROLE_GUIDES[effKey]) ? ROLE_GUIDES[effKey] : null;
    const rkMap = { seer: "seer", witch: "witch", hunter: "scales", guard: "guard", elder: "elder", villager: "villager", wolf: "wolf", wolf_king: "crown" };
    const roleIcoKey = rkMap[effKey] || "spark";
    if (el("roleDealCrest") && typeof shIcon === "function") {
      el("roleDealCrest").innerHTML = shIcon(roleIcoKey, isWolf ? "cinnabar" : "gold").replace('class="sh-ico', 'class="sh-ico sh-ico-solo');
    }
    if (el("roleDealTeam")) {
      el("roleDealTeam").textContent = isWolf
        ? "酸民狼陣營・隱藏身分淘汰對手"
        : "好人陣營・找出所有酸民狼即勝";
      el("roleDealTeam").className = "role-deal-team-pill " + (isWolf ? "is-wolf" : "is-good");
    }
    if (el("roleDealName")) {
      el("roleDealName").textContent = rDef.name;
    }
    const seatTagStr = playerNumTag() + "席";
    if (el("roleDealSeat")) el("roleDealSeat").textContent = seatTagStr;
    if (el("roleDealBackSeat")) el("roleDealBackSeat").textContent = seatTagStr + "・密函待啟";
    if (el("roleDealDesc")) {
      el("roleDealDesc").textContent = (guide && guide.cardOneLiner) ? guide.cardOneLiner : rDef.desc;
    }
    if (el("roleDealActionList")) {
      const icoMoon = typeof shIcon === "function" ? shIcon("moon", "indigo") : "";
      const icoSun = typeof shIcon === "function" ? shIcon("sun", "gold") : "";
      const icoBallot = typeof shIcon === "function" ? shIcon("ballot", "cinnabar") : "";
      el("roleDealActionList").innerHTML = guide
        ? (
          '<div class="deal-step-line"><span class="deal-step-tag is-night">' + icoMoon + '晚上</span><span class="deal-step-text">' + escapeHtml(guide.cardNight || guide.nightAction) + "</span></div>" +
          '<div class="deal-step-line"><span class="deal-step-tag is-day">' + icoSun + '白天</span><span class="deal-step-text">' + escapeHtml(guide.cardDay || guide.dayAction) + "</span></div>" +
          '<div class="deal-step-line"><span class="deal-step-tag is-vote">' + icoBallot + '投票</span><span class="deal-step-text">' + escapeHtml(guide.cardVote || guide.winCond) + "</span></div>"
        )
        : "";
    }
    const card = el("roleDealCardBox");
    if (card) {
      card.classList.toggle("deal-wolf", isWolf);
      card.classList.toggle("deal-good", !isWolf);
    }
    ov.classList.remove("hidden", "is-unsealing", "is-revealed", "deal-theme-wolf", "deal-theme-good");
    ov.classList.add("is-sealed", isWolf ? "deal-theme-wolf" : "deal-theme-good");
    if (typeof sound !== "undefined" && typeof sound.playCardRustle === "function") {
      sound.playCardRustle();
    }
    // User-paced reading: NEVER auto-dismiss the secret role card (dealTimer stays null).
    // Click wax seal / press Space to unseal immediately, OR let the brief suspense beat auto-unseal into the 3D flip!
    const self = this;
    const pacingMul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
    this.dealUnsealTimer = setTimeout(function () {
      self.dealUnsealTimer = null;
      self.unsealRoleDealCard();
    }, Math.round(1350 * clamp(pacingMul, 0.7, 1.3)));
  },

  hideRoleDealRitual: function (opts) {
    const silent = Boolean(opts && opts.silent);
    if (this.dealTimer) {
      clearTimeout(this.dealTimer);
      this.dealTimer = null;
    }
    if (this.dealUnsealTimer) {
      clearTimeout(this.dealUnsealTimer);
      this.dealUnsealTimer = null;
    }
    if (this.dealRevealTimer) {
      clearTimeout(this.dealRevealTimer);
      this.dealRevealTimer = null;
    }
    if (this.cardPeekTimer) {
      clearTimeout(this.cardPeekTimer);
      this.cardPeekTimer = null;
    }
    this.dealRevealed = false;
    state.cardPeek3D = false;
    const ov = el("roleDealOverlay");
    if (ov) {
      ov.classList.add("hidden");
      ov.classList.remove("is-sealed", "is-unsealing", "is-revealed", "deal-theme-wolf", "deal-theme-good");
    }
    const pendingCb = this.onRoleDealClosed;
    this.onRoleDealClosed = null;
    if (!silent && typeof pendingCb === "function") pendingCb();
  },

  cycleSmartView: function () {
    sound.unlock();
    if (typeof stage3d === "undefined" || !stage3d.isAvailable()) {
      showToast("目前裝置維持 2D 經典俯視圓桌", "emerald");
      return;
    }
    if (stage3d.showcaseMode) stage3d.setShowcaseMode(false);
    if (!stage3d.isActive()) {
      stage3d.setViewMode("3d");
      stage3d.setCameraPreset("cinema");
    } else if (stage3d.camPreset === "cinema") {
      stage3d.setCameraPreset("firstperson");
    } else if (stage3d.camPreset === "firstperson") {
      stage3d.setCameraPreset("overview");
    } else {
      stage3d.setViewMode("2d");
    }
    this.syncHudViewLabel();
  },

  syncHudViewLabel: function () {
    const lbl = el("hudViewLabel");
    if (!lbl) return;
    if (typeof stage3d === "undefined" || !stage3d.isActive()) {
      lbl.textContent = "2D 圓桌";
    } else if (stage3d.camPreset === "firstperson") {
      lbl.textContent = "坐席";
    } else if (stage3d.camPreset === "overview") {
      lbl.textContent = "俯瞰";
    } else {
      lbl.textContent = "運鏡";
    }
  },

  syncBodyScreenState: function () {
    const started = Boolean(state.match && state.match.started);
    const p = (state.match && state.match.phase) || "LOBBY";
    const isTitle = !started || p === "LOBBY";
    const isGameOver = p === "GAME_OVER";
    const isPickSeat = p === "NIGHT_GUARD" || p === "NIGHT_SEER" || p === "NIGHT_WOLF" || p === "NIGHT_WITCH" || p === "HUNTER_TRIGGER" || p === "DAY_VOTE" || p === "DAY_PLAYER_TURN";
    const isListening = !isTitle && (p === "DAY_SPEECH" || p === "LAST_WORDS_SPEECH");
    const fourGUsable = typeof canUseFourGNow === "function" ? canUseFourGNow() : false;
    const showSeatBar = !isTitle && !isGameOver && p !== "DAY_PLAYER_TURN" && p !== "SHERIFF_TRANSFER" && p !== "SHERIFF_ELECTION" && p !== "SHERIFF_ORDER" && p !== "DAY_VOTE_RESULT" && p !== "LAST_WORDS_PLAYER" && p !== "LAST_WORDS_SPEECH";

    document.body.classList.toggle("screen-title", isTitle);
    document.body.classList.toggle("screen-ingame", !isTitle);
    document.body.classList.toggle("screen-gameover", isGameOver);
    document.body.classList.toggle("phase-pick-seat", !isTitle && isPickSeat);
    document.body.classList.toggle("phase-listening", isListening);
    document.body.classList.toggle("fourg-active", !isTitle && !isGameOver && fourGUsable);

    if (el("inGameTopHud")) el("inGameTopHud").classList.toggle("hidden", isTitle);
    if (el("cornerRoleTile")) el("cornerRoleTile").classList.toggle("hidden", isTitle || isGameOver);
    if ((isTitle || isGameOver) && typeof closeRoleGuidePopover === "function") closeRoleGuidePopover();
    if (el("cornerFourGDeck")) {
      el("cornerFourGDeck").classList.toggle("hidden", isTitle || isGameOver || !fourGUsable);
      el("cornerFourGDeck").classList.toggle("is-compact-fan", p === "DAY_PLAYER_TURN");
    }
    if (el("seatButtonStrip")) el("seatButtonStrip").classList.toggle("hidden", !showSeatBar);
    if (!isTitle) {
      this.openSetupDrawer(false);
      if (typeof scheduleDragGestureHintAutoHide === "function") scheduleDragGestureHintAutoHide(8000);
    }

    // Sync Three-Goodness SVG Lotus Petals in bottom-left secret role tile!
    const tg = (state.match && state.match.threeGood) || { heart: 0, words: 0, deeds: 0 };
    if (el("lotusPetalHeart")) el("lotusPetalHeart").classList.toggle("is-lit", tg.heart > 0);
    if (el("lotusPetalWords")) el("lotusPetalWords").classList.toggle("is-lit", tg.words > 0);
    if (el("lotusPetalDeeds")) el("lotusPetalDeeds").classList.toggle("is-lit", tg.deeds > 0);

    // Sync quick voice & auto-advance HUD icon states
    const qv = el("btnQuickVoiceHud");
    if (qv) qv.classList.toggle("is-muted", !voice.enabled);
    const qa = el("btnQuickAutoHud");
    const qaLbl = el("hudAutoLabel");
    if (qa) qa.classList.toggle("is-active", Boolean(state.autoPlay));
    if (qaLbl) qaLbl.textContent = state.autoPlay ? "自動:開" : "自動";
    this.syncHudViewLabel();
  },

  syncShowcaseTargetUi: function () {
    const liveSeats = typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D() : [];
    const inActiveMatch = Boolean(state.match && state.match.started);
    let tgt = (typeof stage3d !== "undefined" && stage3d.showcaseTarget) ? String(stage3d.showcaseTarget) : "hero";
    if (tgt !== "hero" && inActiveMatch) {
      const sidCheck = parseInt(tgt, 10);
      if (!liveSeats.some(function (x) { return x && x.id === sidCheck; })) {
        tgt = "hero";
        if (typeof stage3d !== "undefined") stage3d.showcaseTarget = "hero";
      }
    }
    document.querySelectorAll("[data-showcase-target]").forEach(function (b) {
      const val = b.getAttribute("data-showcase-target");
      if (val && val !== "hero") {
        const sidChip = parseInt(val, 10);
        const matchSeat = liveSeats.find(function (x) { return x && x.id === sidChip; });
        const hideChip = Boolean(inActiveMatch && !matchSeat);
        b.classList.toggle("hidden", hideChip);
        if (matchSeat) {
          const isPlayerChip = typeof getPlayerId === "function" && matchSeat.id === getPlayerId();
          b.textContent = fmtSeatNum(sidChip) + " " + (isPlayerChip ? "你" : matchSeat.name);
        }
      }
      b.classList.toggle("is-active", val === tgt);
    });
    const orderList = ["hero"].concat(liveSeats.map(function (x) { return String(x.id); }));
    const curIdx = Math.max(0, orderList.indexOf(tgt));
    const counterEl = el("showcaseTargetCounter");
    const palGroup = el("showcasePaletteGroup");
    if (palGroup) {
      palGroup.classList.toggle("hidden", tgt !== "hero");
    }
    if (counterEl) {
      if (tgt === "hero") {
        counterEl.textContent = "清茗 · " + (curIdx + 1) + "/" + orderList.length;
      } else {
        const sidC = parseInt(tgt, 10);
        const sObj = liveSeats.find(function (x) { return x && x.id === sidC; });
        const dispName = sObj ? ((typeof getPlayerId === "function" && sObj.id === getPlayerId()) ? "你" : sObj.name) : "";
        counterEl.textContent = fmtSeatNum(sidC) + " " + dispName + " · " + (curIdx + 1) + "/" + orderList.length;
      }
    }
    const titleEl = el("heroShowcaseTitle");
    const sealEl = el("heroShowcaseSeal");
    const bioEl = el("showcasePersonaBio");
    const profileCardEl = el("showcaseProfileCard");
    const resetBtn = el("btnResetHeroRig");
    if (tgt === "hero") {
      if (sealEl) sealEl.textContent = "茗";
      if (titleEl) titleEl.textContent = "清茗・雲茶書靈";
      if (bioEl) {
        bioEl.textContent = "雲起茶席說書主持｜使用下方左右箭頭可 360° 鑑賞全 12 席茶友造型與社團檔案。";
        if (typeof shPrependIcon === "function") shPrependIcon(bioEl, "leaf", "jade");
      }
      if (profileCardEl) {
        profileCardEl.classList.add("hidden");
        profileCardEl.innerHTML = "";
      }
      const glbActive = Boolean(typeof stage3d !== "undefined" && stage3d.hero && stage3d.hero.visualMode === "glb" && stage3d.hero.customGlbRoot);
      if (resetBtn) resetBtn.classList.toggle("hidden", !glbActive);
    } else {
      const sid = parseInt(tgt, 10);
      if (sealEl) sealEl.textContent = fmtSeatNum(sid);
      const s = typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D().find(function (x) { return x.id === sid; }) : null;
      const slug = (typeof stage3dVrm !== "undefined" && s) ? stage3dVrm.getSeatModelSlug(s) : ("seat" + sid);
      const pProfShow = (s && typeof getPersonaProfile === "function") ? getPersonaProfile(s) : null;
      if (titleEl) {
        titleEl.textContent = fmtSeatNum(sid) + "號 " + (s ? s.name : "") + (pProfShow && s && s.name !== "你" ? (" · " + pProfShow.registerBadge) : ("（可放入 " + slug + ".vrm）"));
      }
      if (bioEl) {
        bioEl.textContent = (pProfShow && s && s.name !== "你")
          ? (pProfShow.logicTags + "｜代表台詞：「" + pProfShow.sampleQuote + "」")
          : "你的專屬玩家席位（可於主畫面或設定切換男／女 3D 模型與聲線）";
        if (typeof shPrependIcon === "function") {
          shPrependIcon(bioEl, (pProfShow && s && s.name !== "你" && pProfShow.iconKey) ? pProfShow.iconKey : "mask", (pProfShow && pProfShow.iconTone) || "gold");
        }
      }
      if (profileCardEl) {
        const unlockInfo = (s && s.name !== "你" && typeof getPersonaDossierUnlockState === "function")
          ? getPersonaDossierUnlockState(s.name)
          : null;
        if (unlockInfo && unlockInfo.dossier) {
          const d = unlockInfo.dossier;
          const esc = typeof escapeHtml === "function" ? escapeHtml : function (v) { return String(v || ""); };
          const goodHtml = unlockInfo.goodUnlocked
            ? ('<div class="showcase-profile-row"><span class="showcase-profile-tag is-good">好人癖好</span><span>' + esc(d.goodHabit) + '</span></div>')
            : ('<div class="showcase-profile-row is-locked"><span class="showcase-profile-tag is-locked">好人癖好・未解鎖</span><span>完成 ' + unlockInfo.needGood + ' 場對局解鎖（尚差 ' + unlockInfo.remainGood + ' 局）</span></div>');
          const wolfHtml = unlockInfo.wolfUnlocked
            ? ('<div class="showcase-profile-row"><span class="showcase-profile-tag is-wolf">狼人破綻</span><span>' + esc(d.wolfTell) + '</span></div>')
            : ('<div class="showcase-profile-row is-locked"><span class="showcase-profile-tag is-locked">狼人破綻・未解鎖</span><span>累積 ' + unlockInfo.needWolf + ' 場對局解鎖（尚差 ' + unlockInfo.remainWolf + ' 局）</span></div>');
          const clubText = unlockInfo.goodUnlocked ? d.clubLabel : "完成 1 場對局解鎖社團熟人圈";
          profileCardEl.innerHTML =
            '<div class="showcase-profile-meta">' +
              '<span class="showcase-profile-pill">' + esc(d.quadrant) + '</span>' +
              '<span class="showcase-profile-pill is-club">' + esc(clubText) + '</span>' +
              '<span class="showcase-profile-pill is-sil">' + esc(d.silhouetteTag) + '</span>' +
            '</div>' +
            goodHtml +
            wolfHtml;
          profileCardEl.classList.remove("hidden");
        } else {
          profileCardEl.classList.add("hidden");
          profileCardEl.innerHTML = "";
        }
      }
      const actor = (typeof stage3d !== "undefined" && stage3d.seats && stage3d.seats.slots) ? stage3d.seats.slots[sid] : null;
      if (resetBtn) resetBtn.classList.toggle("hidden", !(actor && actor.useVrm));
    }
  },

  bindEvents: function () {
    const self = this;

    // Title Screen & No-Form Match Setup Drawer
    if (el("btnOpenSetupDrawer")) {
      el("btnOpenSetupDrawer").addEventListener("click", function () {
        sound.unlock();
        self.openSetupDrawer(true);
      });
    }
    if (el("btnCloseSetupDrawer")) {
      el("btnCloseSetupDrawer").addEventListener("click", function () { self.openSetupDrawer(false); });
    }
    if (el("setupDrawer")) {
      el("setupDrawer").addEventListener("click", function (ev) {
        if (ev && ev.target === el("setupDrawer")) self.openSetupDrawer(false);
      });
    }
    if (el("btnConfirmSetupStart")) {
      el("btnConfirmSetupStart").addEventListener("click", function () {
        self.openSetupDrawer(false);
        startNewGame();
      });
    }
    document.querySelectorAll("[data-setup-count]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const cntVal = btn.getAttribute("data-setup-count");
        if (el("selectModeCount")) {
          el("selectModeCount").value = cntVal;
          el("selectModeCount").dispatchEvent(new Event("change"));
        }
        if (cntVal === "6") {
          state.guardMode = false;
          if (el("chkGuardMode")) el("chkGuardMode").checked = false;
          if (el("selectPreferredRole") && ["guard", "hunter", "elder", "wolf_king"].indexOf(el("selectPreferredRole").value) !== -1) {
            el("selectPreferredRole").value = "seer";
          }
          if (typeof saveUserPrefs === "function") saveUserPrefs();
        } else if (cntVal === "8") {
          if (el("selectPreferredRole") && (el("selectPreferredRole").value === "elder" || el("selectPreferredRole").value === "wolf_king")) {
            el("selectPreferredRole").value = "seer";
          }
        } else if (cntVal === "10" || cntVal === "12") {
          state.guardMode = true;
          if (el("chkGuardMode")) el("chkGuardMode").checked = true;
          if (cntVal === "12") {
            state.sheriffMode = true;
            if (el("chkSheriffMode")) el("chkSheriffMode").checked = true;
          }
          if (typeof saveUserPrefs === "function") saveUserPrefs();
        }
        self.syncSetupDrawerFromSelects();
      });
    });
    document.querySelectorAll("[data-setup-role]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const rk = btn.getAttribute("data-setup-role");
        if (el("selectPreferredRole")) el("selectPreferredRole").value = rk;
        if (rk === "guard") {
          state.guardMode = true;
          if (el("chkGuardMode")) el("chkGuardMode").checked = true;
          if (el("selectModeCount") && parseInt(el("selectModeCount").value, 10) < 8) {
            el("selectModeCount").value = "8";
            el("selectModeCount").dispatchEvent(new Event("change"));
          }
          if (typeof saveUserPrefs === "function") saveUserPrefs();
        } else if (rk === "hunter") {
          if (el("selectModeCount") && parseInt(el("selectModeCount").value, 10) < 8) {
            el("selectModeCount").value = "8";
            el("selectModeCount").dispatchEvent(new Event("change"));
          }
        } else if (rk === "elder" || rk === "wolf_king") {
          state.guardMode = true;
          if (el("chkGuardMode")) el("chkGuardMode").checked = true;
          if (el("selectModeCount") && parseInt(el("selectModeCount").value, 10) < 10) {
            el("selectModeCount").value = "10";
            el("selectModeCount").dispatchEvent(new Event("change"));
          }
          if (typeof saveUserPrefs === "function") saveUserPrefs();
        }
        self.syncSetupDrawerFromSelects();
      });
    });
    document.querySelectorAll("[data-setup-diff]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        if (el("selectAiDifficulty")) el("selectAiDifficulty").value = btn.getAttribute("data-setup-diff");
        self.syncSetupDrawerFromSelects();
      });
    });
    document.querySelectorAll("[data-setup-depth]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const dp = btn.getAttribute("data-setup-depth") === "classic" ? "classic" : "full";
        state.ruleDepth = dp;
        if (el("selectRuleDepth")) el("selectRuleDepth").value = dp;
        if (typeof saveUserPrefs === "function") saveUserPrefs();
        self.syncSetupDrawerFromSelects();
      });
    });
    if (el("btnSetupSheriffToggle")) {
      el("btnSetupSheriffToggle").addEventListener("click", function () {
        sound.unlock();
        if (el("chkSheriffMode")) {
          el("chkSheriffMode").checked = !el("chkSheriffMode").checked;
          state.sheriffMode = Boolean(el("chkSheriffMode").checked);
        } else {
          state.sheriffMode = !state.sheriffMode;
        }
        if (typeof saveUserPrefs === "function") saveUserPrefs();
        self.syncSetupDrawerFromSelects();
      });
    }
    if (el("btnSetupGuardToggle")) {
      el("btnSetupGuardToggle").addEventListener("click", function () {
        sound.unlock();
        const curSeats = el("selectModeCount") ? parseInt(el("selectModeCount").value, 10) : 8;
        const nextGuard = el("chkGuardMode") ? !el("chkGuardMode").checked : !state.guardMode;
        if (curSeats === 12 && !nextGuard) {
          state.guardMode = true;
          if (el("chkGuardMode")) el("chkGuardMode").checked = true;
          if (typeof showToast === "function") showToast("12人標準板固定含護心守衛（切換 8/10 人可自由開關）", "sky");
          self.syncSetupDrawerFromSelects();
          return;
        }
        state.guardMode = nextGuard;
        if (el("chkGuardMode")) el("chkGuardMode").checked = nextGuard;
        if (nextGuard && el("selectModeCount") && curSeats < 8) {
          el("selectModeCount").value = "8";
          el("selectModeCount").dispatchEvent(new Event("change"));
        } else if (!nextGuard && el("selectPreferredRole") && el("selectPreferredRole").value === "guard") {
          el("selectPreferredRole").value = "seer";
        }
        if (typeof saveUserPrefs === "function") saveUserPrefs();
        self.syncSetupDrawerFromSelects();
      });
    }

    // Role Deal Ritual: click wax seal to unseal immediately; once revealed, confirm button or backdrop enters match!
    if (el("roleDealCardBack")) {
      el("roleDealCardBack").addEventListener("click", function (ev) {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        sound.unlock();
        self.unsealRoleDealCard();
      });
    }
    if (el("roleDealOverlay")) {
      el("roleDealOverlay").addEventListener("click", function (ev) {
        if (ev && ev.target === el("roleDealOverlay")) {
          if (!self.dealRevealed) {
            sound.unlock();
            self.unsealRoleDealCard();
          } else {
            self.hideRoleDealRitual();
          }
        }
      });
    }
    if (el("btnRoleDealConfirm")) {
      el("btnRoleDealConfirm").addEventListener("click", function (ev) {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        sound.unlock();
        self.hideRoleDealRitual();
      });
    }
    if (el("btnRoleDealOpenTut")) {
      el("btnRoleDealOpenTut").addEventListener("click", function (ev) {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        sound.unlock();
        state.tutorialIndex = 0;
        if (typeof renderTutorialSlide === "function") renderTutorialSlide();
        if (el("modalTutorial")) el("modalTutorial").classList.remove("hidden");
      });
    }
    if (el("btnDismissBeginnerCoach")) {
      el("btnDismissBeginnerCoach").addEventListener("click", function () {
        if (state.match) state.match.guidedBeginner = false;
        if (el("beginnerCoachBanner")) el("beginnerCoachBanner").classList.add("hidden");
        if (typeof showToast === "function") showToast("已收合新手步驟提示，隨時可點左下「指南」查看！", "emerald");
      });
    }

    // Minimal Top-Right 3-Button HUD
    if (el("btnOpenJournal")) {
      el("btnOpenJournal").addEventListener("click", function () {
        sound.unlock();
        self.openJournal("log");
      });
    }
    if (el("btnQuickAutoHud")) {
      el("btnQuickAutoHud").addEventListener("click", function () {
        sound.unlock();
        if (el("btnAutoPlayToggle")) el("btnAutoPlayToggle").click();
        else {
          state.autoPlay = !state.autoPlay;
          self.syncBodyScreenState();
        }
        if (typeof showToast === "function") {
          showToast(state.autoPlay ? "已開啟自動推進發言" : "已切換為手動推進發言", state.autoPlay ? "emerald" : "sky");
        }
      });
    }
    if (el("btnCloseJournal")) {
      el("btnCloseJournal").addEventListener("click", function () {
        if (el("modalJournal")) el("modalJournal").classList.add("hidden");
      });
    }
    if (el("modalJournal")) {
      el("modalJournal").addEventListener("click", function (ev) {
        if (ev.target === el("modalJournal")) el("modalJournal").classList.add("hidden");
      });
    }
    if (el("tabJournalLog")) el("tabJournalLog").addEventListener("click", function () { self.switchJournalTab("log"); });
    if (el("tabJournalMatrix")) el("tabJournalMatrix").addEventListener("click", function () { self.switchJournalTab("matrix"); });
    if (el("tabJournalVote")) el("tabJournalVote").addEventListener("click", function () { self.switchJournalTab("vote"); });

    if (el("btnCycleViewHud")) {
      el("btnCycleViewHud").addEventListener("click", function () { self.cycleSmartView(); });
    }
    if (el("btnQuickVoiceHud")) {
      el("btnQuickVoiceHud").addEventListener("click", function () {
        if (el("btnToggleVoice")) el("btnToggleVoice").click();
        self.syncBodyScreenState();
      });
    }
    if (el("btnOpenPauseMenu")) {
      el("btnOpenPauseMenu").addEventListener("click", function () {
        sound.unlock();
        self.openPauseMenu(true);
      });
    }
    if (el("btnClosePauseMenu")) {
      el("btnClosePauseMenu").addEventListener("click", function () { self.openPauseMenu(false); });
    }
    if (el("modalPauseMenu")) {
      el("modalPauseMenu").addEventListener("click", function (ev) {
        if (ev.target === el("modalPauseMenu")) self.openPauseMenu(false);
      });
    }
    if (el("btnBackToTitleOver")) {
      el("btnBackToTitleOver").addEventListener("click", function () {
        resetMatchToLobby();
      });
    }
    // Auto-close Pause Menu when jumping into a sub-modal
    ["btnOpenMusicModal", "btnOpenAiModal", "btnOpenGuide", "btnOpenCareer", "btnOpenTutorial", "btnOpenTutorialPause", "btnOpenFeedback", "btnRestartTop"].forEach(function (id) {
      const b = el(id);
      if (b) b.addEventListener("click", function () { self.openPauseMenu(false); });
    });

    // Tactile Card Rustle SFX on Four-Givings Hand Hover!
    ["btn4GConfidence", "btn4GJoy", "btn4GHope", "btn4GConvenience"].forEach(function (id) {
      const card = el(id);
      if (card) {
        card.addEventListener("pointerenter", function () {
          if (!card.disabled && typeof sound !== "undefined" && typeof sound.playCardRustle === "function") {
            sound.playCardRustle();
          }
        });
      }
    });

    // 360° Anime Character Showcase ("清茗" + 1~8號全員) Controls!
    ["btnOpenHeroShowcase", "btnOpenHeroShowcasePause"].forEach(function (id) {
      const btn = el(id);
      if (btn) {
        btn.addEventListener("click", function () {
          sound.unlock();
          self.openPauseMenu(false);
          self.openSetupDrawer(false);
          if (typeof stage3d !== "undefined") stage3d.setShowcaseMode(true);
        });
      }
    });
    if (el("btnCloseHeroShowcase")) {
      el("btnCloseHeroShowcase").addEventListener("click", function () {
        if (typeof stage3d !== "undefined") stage3d.setShowcaseMode(false);
      });
    }
    const stepShowcaseTarget = function (delta) {
      if (typeof stage3d === "undefined" || typeof stage3d.setShowcaseTarget !== "function") return;
      const liveSeats = typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D() : [];
      const orderList = ["hero"].concat(liveSeats.map(function (x) { return String(x.id); }));
      const curTgt = stage3d.showcaseTarget ? String(stage3d.showcaseTarget) : "hero";
      const curIdx = Math.max(0, orderList.indexOf(curTgt));
      const nextIdx = (curIdx + delta + orderList.length) % orderList.length;
      const nextTgt = orderList[nextIdx] || "hero";
      sound.unlock();
      stage3d.setShowcaseTarget(nextTgt);
      const seatActor = (nextTgt !== "hero" && stage3d.seats && stage3d.seats.slots) ? stage3d.seats.slots[parseInt(nextTgt, 10)] : null;
      const curAct = nextTgt === "hero"
        ? ((stage3d.hero && stage3d.hero.action) || "welcome_bow")
        : ((seatActor && seatActor.showcaseAction) || "idle_breathe");
      document.querySelectorAll("[data-hero-action]").forEach(function (o) {
        o.classList.toggle("is-active", o.getAttribute("data-hero-action") === curAct);
      });
    };
    if (el("btnShowcasePrev")) {
      el("btnShowcasePrev").addEventListener("click", function () { stepShowcaseTarget(-1); });
    }
    if (el("btnShowcaseNext")) {
      el("btnShowcaseNext").addEventListener("click", function () { stepShowcaseTarget(1); });
    }
    window.addEventListener("keydown", function (ev) {
      if (typeof stage3d === "undefined" || !stage3d.showcaseMode) return;
      if (ev.key === "ArrowLeft") { ev.preventDefault(); stepShowcaseTarget(-1); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); stepShowcaseTarget(1); }
    });
    document.querySelectorAll("[data-showcase-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const tgt = btn.getAttribute("data-showcase-target") || "hero";
        if (typeof stage3d !== "undefined" && typeof stage3d.setShowcaseTarget === "function") {
          stage3d.setShowcaseTarget(tgt);
          const seatActor = (tgt !== "hero" && stage3d.seats && stage3d.seats.slots) ? stage3d.seats.slots[parseInt(tgt, 10)] : null;
          const curAct = tgt === "hero"
            ? ((stage3d.hero && stage3d.hero.action) || "welcome_bow")
            : ((seatActor && seatActor.showcaseAction) || "idle_breathe");
          document.querySelectorAll("[data-hero-action]").forEach(function (o) {
            o.classList.toggle("is-active", o.getAttribute("data-hero-action") === curAct);
          });
        }
      });
    });
    document.querySelectorAll("[data-hero-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const act = btn.getAttribute("data-hero-action");
        document.querySelectorAll("[data-hero-action]").forEach(function (o) { o.classList.toggle("is-active", o === btn); });
        if (typeof stage3d !== "undefined") stage3d.setHeroAction(act, 0);
      });
    });
    if (el("btnShowcaseAuditionVoice")) {
      el("btnShowcaseAuditionVoice").addEventListener("click", function () {
        sound.unlock();
        const tgt = (typeof stage3d !== "undefined" && stage3d.showcaseTarget) ? String(stage3d.showcaseTarget) : "hero";
        if (tgt === "hero") {
          const line = "歡迎蒞臨林美山雲起茶席！我是清茗，今晚且看諸位同窗如何明辨是非、說好話抓出酸民狼。";
          if (typeof voice !== "undefined" && typeof voice.speakHost === "function") voice.speakHost(line, undefined, "normal");
          if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") stage3d.setHeroAction("speak_gesture", 3200);
          if (typeof showToast === "function") showToast("清茗：「" + line + "」", "emerald");
          return;
        }
        const sid = parseInt(tgt, 10);
        const s = typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D().find(function (x) { return x.id === sid; }) : null;
        if (!s) return;
        const pProf = typeof getPersonaProfile === "function" ? getPersonaProfile(s) : null;
        const sample = (s.name === "你")
          ? "我是書院推理夥伴，今晚一定細心傾聽每一句線索，帶領好人陣營獲勝！"
          : ((pProf && pProf.sampleQuote) || "這局我們一起說好話、理性抓出酸民狼！");
        if (typeof voice !== "undefined" && typeof voice.speak === "function") {
          voice.speak(s.name, sample, "normal", undefined);
        }
        if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
          stage3d.setHeroAction("speak_gesture", 3200);
        }
        if (typeof showToast === "function") {
          showToast(s.name + "（" + ((pProf && pProf.registerBadge) || "角色語風") + "）：「" + sample + "」", "emerald");
        }
      });
    }
    if (el("btnResetHeroRig")) {
      el("btnResetHeroRig").addEventListener("click", function () {
        sound.unlock();
        if (typeof stage3d !== "undefined" && typeof stage3d.resetShowcaseAvatar === "function") {
          stage3d.resetShowcaseAvatar();
        }
      });
    }
    document.querySelectorAll("[data-hero-palette]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sound.unlock();
        const pal = btn.getAttribute("data-hero-palette");
        document.querySelectorAll("[data-hero-palette]").forEach(function (o) { o.classList.toggle("is-active", o === btn); });
        if (typeof stage3d !== "undefined") stage3d.setHeroPalette(pal);
      });
    });
    if (el("btnUploadHeroGlb") && el("inputHeroGlb")) {
      el("btnUploadHeroGlb").addEventListener("click", function () { el("inputHeroGlb").click(); });
      el("inputHeroGlb").addEventListener("change", function () {
        const f = el("inputHeroGlb").files && el("inputHeroGlb").files[0];
        if (f && typeof stage3d !== "undefined") stage3d.loadCustomHeroGlb(f);
      });
    }
    if (typeof scheduleDragGestureHintAutoHide === "function") {
      scheduleDragGestureHintAutoHide(8000);
    }
  }
};
