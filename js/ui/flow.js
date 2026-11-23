/**
 * 獨立遊戲 8 階段介面流程協調器：
 * - 動態標題主畫面與無表單「自訂茶席」滑出抽屜
 * - 開局 1.8 秒「抽牌入戲儀式」
 * - 雙分頁「茶席手札（對話紀錄｜票型小抄）」與 Esc 暫停選單
 * - 單鍵循環視角按鈕、四給手牌懸停抽牌音效、三瓣微蓮花印點亮同步
 * - 360° 旗艦角色「清茗」鑑賞台與三視圖概念稿檢視器
 */
"use strict";

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
    this.switchJournalTab(tabKey || "log");
    m.classList.remove("hidden");
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

  showRoleDealRitual: function (roleKey) {
    const ov = el("roleDealOverlay");
    const pSelf = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    const effKey = (pSelf && typeof getSeatEffectiveRoleKey === "function" ? getSeatEffectiveRoleKey(pSelf) : null) || roleKey;
    const rDef = ROLE_DEFS[effKey] || ROLE_DEFS[roleKey];
    if (!ov || !rDef) return;
    if (this.dealTimer) {
      clearTimeout(this.dealTimer);
      this.dealTimer = null;
    }
    if (this.cardPeekTimer) {
      clearTimeout(this.cardPeekTimer);
      this.cardPeekTimer = null;
    }
    const isWolf = rDef.team === "wolf";
    const guide = (typeof ROLE_GUIDES !== "undefined" && ROLE_GUIDES[effKey]) ? ROLE_GUIDES[effKey] : null;
    if (el("roleDealTeam")) {
      el("roleDealTeam").textContent = isWolf
        ? "🐺 你是壞人隊（酸民狼・裝好人淘汰對手）"
        : "🌿 你是好人隊（找出所有酸民狼就贏！）";
      el("roleDealTeam").className = "role-deal-team-pill " + (isWolf ? "is-wolf" : "is-good");
    }
    if (el("roleDealName")) el("roleDealName").textContent = (guide ? (guide.icon + " ") : "") + rDef.name;
    if (el("roleDealSeat")) el("roleDealSeat").textContent = playerNumTag() + " 座位";
    if (el("roleDealDesc")) {
      el("roleDealDesc").textContent = (guide && guide.cardOneLiner) ? guide.cardOneLiner : rDef.desc;
    }
    if (el("roleDealActionList")) {
      el("roleDealActionList").innerHTML = guide
        ? (
          '<div class="deal-step-line"><span class="deal-step-tag is-night">🌙 晚上</span><span>' + escapeHtml(guide.cardNight || guide.nightAction) + "</span></div>" +
          '<div class="deal-step-line"><span class="deal-step-tag is-day">☀️ 白天</span><span>' + escapeHtml(guide.cardDay || guide.dayAction) + "</span></div>" +
          '<div class="deal-step-line"><span class="deal-step-tag is-vote">🗳 投票</span><span>' + escapeHtml(guide.cardVote || guide.winCond) + "</span></div>"
        )
        : "";
    }
    const card = el("roleDealCardBox");
    if (card) {
      card.classList.toggle("deal-wolf", isWolf);
      card.classList.toggle("deal-good", !isWolf);
    }
    ov.classList.remove("hidden");
    if (typeof sound !== "undefined" && typeof sound.playCardRustle === "function") {
      sound.playCardRustle();
    }
    // User-paced reading: NEVER auto-dismiss the secret role card! Wait until player clicks "我看懂了・開始對局" (or Space/Enter/backdrop).
    const self = this;
    const pacingMul = typeof getFxPacingMul === "function" ? getFxPacingMul() : 1.0;
    if (typeof stage3d !== "undefined" && stage3d.isActive()) {
      state.cardPeek3D = true;
      this.cardPeekTimer = setTimeout(function () {
        self.cardPeekTimer = null;
        state.cardPeek3D = false;
      }, Math.round(3200 * pacingMul));
    }
  },

  hideRoleDealRitual: function () {
    if (this.dealTimer) {
      clearTimeout(this.dealTimer);
      this.dealTimer = null;
    }
    if (this.cardPeekTimer) {
      clearTimeout(this.cardPeekTimer);
      this.cardPeekTimer = null;
    }
    state.cardPeek3D = false;
    const ov = el("roleDealOverlay");
    if (ov) ov.classList.add("hidden");
    const pendingCb = this.onRoleDealClosed;
    this.onRoleDealClosed = null;
    if (typeof pendingCb === "function") pendingCb();
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
    if (!isTitle) this.openSetupDrawer(false);

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
    const tgt = (typeof stage3d !== "undefined" && stage3d.showcaseTarget) ? String(stage3d.showcaseTarget) : "hero";
    document.querySelectorAll("[data-showcase-target]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-showcase-target") === tgt);
    });
    const titleEl = el("heroShowcaseTitle");
    const resetBtn = el("btnResetHeroRig");
    if (tgt === "hero") {
      if (titleEl) titleEl.textContent = "清茗・雲茶書靈";
      const glbActive = Boolean(typeof stage3d !== "undefined" && stage3d.hero && stage3d.hero.visualMode === "glb" && stage3d.hero.customGlbRoot);
      if (resetBtn) resetBtn.classList.toggle("hidden", !glbActive);
    } else {
      const sid = parseInt(tgt, 10);
      const s = typeof getStageSeatListFor3D === "function" ? getStageSeatListFor3D().find(function (x) { return x.id === sid; }) : null;
      const slug = (typeof stage3dVrm !== "undefined" && s) ? stage3dVrm.getSeatModelSlug(s) : ("seat" + sid);
      if (titleEl) titleEl.textContent = fmtSeatNum(sid) + "號 " + (s ? s.name : "") + "（可放入 " + slug + ".vrm）";
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
          if (el("selectModeCount")) el("selectModeCount").value = "8";
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
        if (el("chkSheriffMode")) el("chkSheriffMode").checked = !el("chkSheriffMode").checked;
        self.syncSetupDrawerFromSelects();
      });
    }
    if (el("btnSetupGuardToggle")) {
      el("btnSetupGuardToggle").addEventListener("click", function () {
        sound.unlock();
        const nextGuard = el("chkGuardMode") ? !el("chkGuardMode").checked : !state.guardMode;
        state.guardMode = nextGuard;
        if (el("chkGuardMode")) el("chkGuardMode").checked = nextGuard;
        if (nextGuard && el("selectModeCount")) {
          el("selectModeCount").value = "8";
          el("selectModeCount").dispatchEvent(new Event("change"));
        } else if (!nextGuard && el("selectPreferredRole") && el("selectPreferredRole").value === "guard") {
          el("selectPreferredRole").value = "seer";
        }
        if (typeof saveUserPrefs === "function") saveUserPrefs();
        self.syncSetupDrawerFromSelects();
      });
    }

    // Role Deal Ritual: confirm button or backdrop closes; "30秒白話教學" opens tutorial WITHOUT closing the card!
    if (el("roleDealOverlay")) {
      el("roleDealOverlay").addEventListener("click", function (ev) {
        if (ev && ev.target === el("roleDealOverlay")) self.hideRoleDealRitual();
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
        if (typeof showToast === "function") showToast("已收合新手步驟提示，隨時可點左下「❓ 能做什麼」查看！", "emerald");
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
    ["btnOpenMusicModal", "btnOpenAiModal", "btnOpenGuide", "btnOpenCareer", "btnOpenTutorial", "btnOpenTutorialPause", "btnRestartTop"].forEach(function (id) {
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
        if (el("heroSheetLightbox")) el("heroSheetLightbox").classList.add("hidden");
        if (typeof stage3d !== "undefined") stage3d.setShowcaseMode(false);
      });
    }
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
    if (el("btnToggleHeroSheet")) {
      el("btnToggleHeroSheet").addEventListener("click", function () {
        if (el("heroSheetLightbox")) el("heroSheetLightbox").classList.toggle("hidden");
      });
    }
    if (el("btnCloseHeroSheet")) {
      el("btnCloseHeroSheet").addEventListener("click", function () {
        if (el("heroSheetLightbox")) el("heroSheetLightbox").classList.add("hidden");
      });
    }
    if (el("heroSheetLightbox")) {
      el("heroSheetLightbox").addEventListener("click", function (ev) {
        if (ev.target === el("heroSheetLightbox")) el("heroSheetLightbox").classList.add("hidden");
      });
    }
    if (el("btnUploadHeroGlb") && el("inputHeroGlb")) {
      el("btnUploadHeroGlb").addEventListener("click", function () { el("inputHeroGlb").click(); });
      el("inputHeroGlb").addEventListener("change", function () {
        const f = el("inputHeroGlb").files && el("inputHeroGlb").files[0];
        if (f && typeof stage3d !== "undefined") stage3d.loadCustomHeroGlb(f);
      });
    }
  }
};
