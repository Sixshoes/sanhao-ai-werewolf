/**
 * 配樂混音器、即時頻譜、音色/樂章切換、語音試聽與音量滑桿事件
 */
"use strict";

function bindAudioVoiceEvents() {
  // Auto-start warm BGM on user's very first gesture anywhere!
  function onFirstGesture() {
    sound.unlock();
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("keydown", onFirstGesture, true);
  }
  window.addEventListener("pointerdown", onFirstGesture, true);
  window.addEventListener("keydown", onFirstGesture, true);

  function drawMusicSpectrum() {
    const modal = el("modalMusic");
    if (!modal || modal.classList.contains("hidden")) {
      sound.spectrumRAF = null;
      return;
    }
    const c = el("musicSpectrumCanvas");
    if (c) {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
        c.width = Math.max(200, Math.floor(rect.width * dpr));
        c.height = Math.max(44, Math.floor(rect.height * dpr));
      }
      const ctx = c.getContext("2d");
      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 24;
      const data = new Uint8Array(32);
      if (sound.analyser && !sound.muted) {
        sound.analyser.getByteFrequencyData(data);
      }
      const gap = 3 * dpr;
      const bw = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const val = data[i] || 0;
        const bh = Math.max(3 * dpr, (val / 255) * (h - 4 * dpr));
        const x = i * (bw + gap);
        const y = h - bh;
        ctx.fillStyle = i < 8 ? "#f59e0b" : (i < 16 ? "#34d399" : "#38bdf8");
        ctx.fillRect(x, y, bw, bh);
      }
    }
    sound.spectrumRAF = requestAnimationFrame(drawMusicSpectrum);
  }

  el("btnOpenMusicModal").addEventListener("click", function () {
    sound.unlock();
    sound.refreshMusicModalLabels();
    el("modalMusic").classList.remove("hidden");
    if (!sound.spectrumRAF) sound.spectrumRAF = requestAnimationFrame(drawMusicSpectrum);
  });
  el("btnCloseMusicModal").addEventListener("click", function () {
    el("modalMusic").classList.add("hidden");
    if (sound.spectrumRAF) {
      cancelAnimationFrame(sound.spectrumRAF);
      sound.spectrumRAF = null;
    }
  });

  ["btnTimbreZen", "btnTimbreFolk", "btnTimbreCinema"].forEach(function (id) {
    el(id).addEventListener("click", function () {
      sound.unlock();
      sound.timbre = el(id).getAttribute("data-timbre") || "zen";
      ["btnTimbreZen", "btnTimbreFolk", "btnTimbreCinema"].forEach(function (other) {
        el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
    });
  });

  ["btnTrackAuto", "btnTrackTwilight", "btnTrackNight", "btnTrackDay", "btnTrackVote", "btnTrackFinale"].forEach(function (id) {
    el(id).addEventListener("click", function () {
      sound.unlock();
      const mode = el(id).getAttribute("data-track") || "auto";
      sound.trackMode = mode;
      sound.currentTrack = sound.resolveTargetTrack();
      sound.stepIdx = 0;
      sound.barIdx = 0;
      sound.startSequencer();
      ["btnTrackAuto", "btnTrackTwilight", "btnTrackNight", "btnTrackDay", "btnTrackVote", "btnTrackFinale"].forEach(function (other) {
        el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
    });
  });

  el("sliderBgmVol").addEventListener("input", function () {
    sound.unlock();
    const v = parseInt(el("sliderBgmVol").value, 10) || 0;
    sound.bgmVol = v / 100;
    el("bgmVolLabel").textContent = v + "%";
    sound.applyVolumes();
    saveUserPrefs();
  });

  el("sliderVoiceVol").addEventListener("input", function () {
    sound.unlock();
    const v = parseInt(el("sliderVoiceVol").value, 10) || 0;
    voice.volume = v / 100;
    if (voice.activeAudioGain) {
      voice.activeAudioGain.gain.value = clamp(voice.volume, 0, 1);
    }
    el("voiceVolLabel").textContent = v + "%";
    if (v === 0 && voice.speaking) voice.stop();
    saveUserPrefs();
  });

  ["btnAccentTw", "btnAccentMulti"].forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      voice.accentMode = el(id).getAttribute("data-accent") === "tw" ? "tw" : "anime";
      ["btnAccentTw", "btnAccentMulti"].forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
      auditionPersonaVoice("小澄");
    });
  });

  ["btnVoiceRateSlow", "btnVoiceRateDefault", "btnVoiceRateFast"].forEach(function (id) {
    el(id).addEventListener("click", function () {
      sound.unlock();
      const r = parseFloat(el(id).getAttribute("data-vrate")) || 0.96;
      voice.rate = r;
      ["btnVoiceRateSlow", "btnVoiceRateDefault", "btnVoiceRateFast"].forEach(function (other) {
        el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
    });
  });

  function playCozyAudition(seatId) {
    const sampleChars = ["歡", "迎", "來", "到", "三", "好", "狼", "人", "殺"];
    sampleChars.forEach(function (ch, idx) {
      setTimeout(function () {
        const nextC = idx === sampleChars.length - 1 ? "。" : (idx === 3 ? "，" : "");
        sound.playCozySyllable(seatId, ch.charCodeAt(0) + idx * 5, ch, nextC);
      }, idx * 105);
    });
  }

  function auditionPersonaVoice(personaName) {
    sound.unlock();
    if (!voice.enabled) {
      voice.enabled = true;
      el("voiceToggleLabel").textContent = voice.getModeLabel();
    }
    const lines = {
      "你":   "這輪大家的發言脈絡其實很清楚，我們一起對一下票型吧！",
      "暖暖": "哈囉！我們心平氣和說好話，一起理性推理找出酸民狼吧！",
      "小澄": "先講結論，照剛剛的發言邏輯來盤，線索其實很清楚喔。",
      "阿松": "別急別急，先聽完大家說法，再來比對票型最準啦！",
      "星兒": "咦？我第六感覺得，剛才有人說話語氣有點心虛喔！",
      "小雲": "等一下，我們來交叉核對一下剛剛這輪的發言前後有沒有矛盾。",
      "阿竹": "山城夜色靜謐，真相往往藏在最細微的語氣轉折裡。",
      "晨晨": "好人夥伴們衝起來！別被酸言帶風向，這輪一定抓出酸民狼！",
      "墨白": "落筆講究章法，對照票型與時間線，真相自然水落石出。",
      "晴嵐": "大家先喝口熱茶緩緩，我們把兩邊視角柔和整理清楚吧。",
      "阿朗": "論點擺上檯面直接交叉比對，破綻藏不住的，這輪精準歸票！",
      "柚子": "耶～茶點準備好囉！我們用好話和直覺一起守護書院吧！",
      "主持": "天黑請閉眼，山城入夜，請各位靜待神秘行動。"
    };
    if (el("voiceAuditionStrip")) {
      el("voiceAuditionStrip").querySelectorAll("[data-audition]").forEach(function (b) {
        b.classList.toggle("is-auditioning", b.getAttribute("data-audition") === personaName);
      });
    }
    const effKey = typeof voice.resolvePersonaKey === "function" ? voice.resolvePersonaKey(personaName) : personaName;
    const prof = PERSONA_VOICE_PROFILES[effKey] || PERSONA_VOICE_PROFILES["暖暖"];
    if (voice.mode === "cozy") {
      playCozyAudition(prof.seatHint || 3);
    } else {
      voice.speak(personaName, lines[personaName] || lines["暖暖"], personaName === "主持" ? "host_night" : "normal");
    }
  }

  ["btnVoiceModeHybrid", "btnVoiceModeNatural", "btnVoiceModeCozy"].forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      const m = el(id).getAttribute("data-vmode") || "hybrid";
      voice.mode = m;
      voice.enabled = true;
      voice.stop();
      el("voiceToggleLabel").textContent = voice.getModeLabel();
      ["btnVoiceModeHybrid", "btnVoiceModeNatural", "btnVoiceModeCozy"].forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      voice.refreshVoices();
      saveUserPrefs();
      auditionPersonaVoice("暖暖");
    });
  });

  if (el("voiceAuditionStrip")) {
    el("voiceAuditionStrip").querySelectorAll("[data-audition]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        auditionPersonaVoice(btn.getAttribute("data-audition") || "暖暖");
      });
    });
  }

  ["btnPlayerGenderF", "btnPlayerGenderM"].forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      const g = el(id).getAttribute("data-pgender") === "m" ? "m" : "f";
      state.playerGender = g;
      ["btnPlayerGenderF", "btnPlayerGenderM"].forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
      if (typeof stage3dTextures !== "undefined" && typeof stage3dTextures.clearVrmPortrait === "function") {
        stage3dTextures.clearVrmPortrait("你");
      }
      if (typeof stage3d !== "undefined" && typeof stage3d.syncSeatAvatars === "function" && typeof getStageSeatListFor3D === "function") {
        stage3d.syncSeatAvatars(getStageSeatListFor3D());
      }
      if (typeof updateAllUI === "function") updateAllUI();
      if (typeof showToast === "function") {
        showToast("已切換主角造型與聲線：" + (g === "m" ? "男主角・男聲" : "女主角・女聲"), "emerald");
      }
      auditionPersonaVoice("你");
    });
  });

  ["btnPortraitStyleVrm", "btnPortraitStylePainted"].forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      const st = el(id).getAttribute("data-pstyle") === "painted" ? "painted" : "vrm3d";
      state.portraitStyle = st;
      ["btnPortraitStyleVrm", "btnPortraitStylePainted"].forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
      if (typeof updateAllUI === "function") updateAllUI();
      if (typeof syncSpeakerBannerVisuals === "function" && typeof getSeat === "function") {
        const sp = state.activeSpeakerId ? getSeat(state.activeSpeakerId) : null;
        const bEl = el("spotlightSpeakerBadge");
        const tEl = el("spotlightTraitTag");
        syncSpeakerBannerVisuals(sp, bEl ? bEl.textContent : "", tEl ? tEl.textContent : "", Boolean(state.typewriter && state.typewriter.active));
      }
      if (typeof showToast === "function") {
        showToast(st === "vrm3d" ? "✨ 已切換為「3D 模型頭像」" : "🎨 已切換為「電影工筆立繪」", "emerald");
      }
    });
  });

  el("selectDeviceVoice").addEventListener("change", function () {
    sound.unlock();
    voice.selectedVoiceUri = el("selectDeviceVoice").value || "auto";
    saveUserPrefs();
    if ((voice.mode === "tts" || voice.mode === "hybrid") && voice.enabled) {
      voice.speak("暖暖", "已切換為這組聲線，祝你推理順利！", "normal");
    }
  });

  el("btnTestVoiceSample").addEventListener("click", function () {
    auditionPersonaVoice("暖暖");
  });

  el("btnToggleVoice").addEventListener("click", function () {
    sound.unlock();
    voice.enabled = !voice.enabled;
    el("voiceToggleLabel").textContent = voice.getModeLabel();
    saveUserPrefs();
    if (!voice.enabled) {
      voice.stop();
      maybeScheduleAutoAdvanceAfterSpeech();
    } else if ((state.match.phase === "DAY_SPEECH" || state.match.phase === "LAST_WORDS_SPEECH" || (state.match.phase === "SHERIFF_ELECTION" && state.match.sheriffElectionCtx && state.match.sheriffElectionCtx.stage === "speech")) && state.typewriter.fullText) {
      const sp = getSeat(state.activeSpeakerId);
      if (voice.canSpeak()) {
        voice.speakCharacter(sp, state.typewriter.fullText, "normal", function () {
          maybeScheduleAutoAdvanceAfterSpeech();
        });
      }
    }
  });

  el("btnReplayVoice").addEventListener("click", function (ev) {
    ev.stopPropagation();
    sound.unlock();
    if (state.typewriter.fullText) {
      const sp = getSeat(state.activeSpeakerId);
      if (!voice.enabled) {
        voice.enabled = true;
        el("voiceToggleLabel").textContent = voice.getModeLabel();
      }
      if (state.stepTimer) {
        clearTimeout(state.stepTimer);
        state.stepTimer = null;
      }
      if (voice.mode === "cozy") {
        playCozyAudition(sp ? sp.id : 3);
      } else {
        voice.speakCharacter(sp, state.typewriter.fullText, "normal", function () {
          maybeScheduleAutoAdvanceAfterSpeech();
        });
      }
    } else {
      voice.replayLast();
    }
  });

  if (el("btnPauseVoice")) {
    el("btnPauseVoice").addEventListener("click", function (ev) {
      ev.stopPropagation();
      sound.unlock();
      if (typeof voice.togglePause === "function") {
        const pausedNow = voice.togglePause();
        if (typeof showToast === "function") {
          showToast(pausedNow ? "⏸ 已暫停語音與字幕（再按一次繼續）" : "▶ 已繼續播放", "emerald");
        }
      }
    });
  }

  if (el("btnQuickVoiceSpeed")) {
    el("btnQuickVoiceSpeed").addEventListener("click", function (ev) {
      ev.stopPropagation();
      sound.unlock();
      if (typeof voice.cycleQuickRate === "function") {
        const nextR = voice.cycleQuickRate();
        const tag = nextR >= 1.18 ? "1.3× 疾風快節奏" : (nextR >= 1.05 ? "1.15× 輕快推理" : "1.0× 自然節奏");
        if (typeof showToast === "function") showToast("🎙️ 語音語速切換為：" + tag, "emerald");
      }
    });
  }

  if (el("btnToggleSubtitleSize")) {
    el("btnToggleSubtitleSize").addEventListener("click", function (ev) {
      ev.stopPropagation();
      state.subtitleLarge = !state.subtitleLarge;
      if (typeof document !== "undefined" && document.body) {
        document.body.classList.toggle("subtitle-large", state.subtitleLarge);
      }
      el("btnToggleSubtitleSize").textContent = state.subtitleLarge ? "大字" : "字級";
      el("btnToggleSubtitleSize").classList.toggle("is-active", state.subtitleLarge);
      if (typeof saveUserPrefs === "function") saveUserPrefs();
      if (typeof showToast === "function") {
        showToast(state.subtitleLarge ? "🔍 已切換為「大字護眼字幕」" : "已切回標準字幕大小", "emerald");
      }
    });
  }

  el("sliderSfxVol").addEventListener("input", function () {
    sound.unlock();
    const v = parseInt(el("sliderSfxVol").value, 10) || 0;
    sound.sfxVol = v / 100;
    el("sfxVolLabel").textContent = v + "%";
    sound.applyVolumes();
    saveUserPrefs();
  });

  el("btnToggleMute").addEventListener("click", function () {
    sound.unlock();
    sound.muted = !sound.muted;
    if (sound.muted) sound.stopSequencer();
    else sound.startSequencer();
    sound.applyVolumes();
    const lbl = el("muteToggleLabel");
    if (lbl) lbl.textContent = sound.muted ? "音效:關" : "音效:開";
    else el("btnToggleMute").textContent = sound.muted ? "音效:關" : "音效:開";
    saveUserPrefs();
  });
}
