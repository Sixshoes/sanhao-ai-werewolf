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
        ctx.fillStyle = i < 8 ? "rgba(245, 158, 11, 0.88)" : (i < 16 ? "rgba(52, 211, 153, 0.88)" : "rgba(56, 189, 248, 0.88)");
        ctx.fillRect(x, y, bw, bh);
      }
      if (sound.voiceAnalyser && !sound.muted && typeof voice !== "undefined" && voice.speaking && typeof ctx.beginPath === "function" && typeof ctx.lineTo === "function") {
        const waveData = sound.voiceAnalyserData || new Uint8Array(64);
        sound.voiceAnalyser.getByteTimeDomainData(waveData);
        ctx.beginPath();
        ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
        ctx.strokeStyle = "rgba(167, 243, 208, 0.92)";
        const stepLen = Math.max(1, waveData.length);
        for (let wi = 0; wi < stepLen; wi++) {
          const wx = (wi / Math.max(1, stepLen - 1)) * w;
          const norm = ((waveData[wi] - 128) / 128);
          const wy = clamp(h * 0.5 + norm * (h * 0.42), 2, h - 2);
          if (wi === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
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

  const timbreFallbackMap = {
    btnTimbreZen: "zen",
    btnTimbreGuqin: "guqin",
    btnTimbreFolk: "folk",
    btnTimbreCinema: "cinema"
  };
  const timbreIds = ["btnTimbreZen", "btnTimbreGuqin", "btnTimbreFolk", "btnTimbreCinema"];
  timbreIds.forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      sound.timbre = el(id).getAttribute("data-timbre") || timbreFallbackMap[id] || "zen";
      timbreIds.forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      saveUserPrefs();
    });
  });

  const trackFallbackMap = {
    btnTrackAuto: "auto",
    btnTrackTwilight: "twilight",
    btnTrackNight: "night",
    btnTrackDay: "day",
    btnTrackSheriff: "sheriff",
    btnTrackVote: "vote",
    btnTrackMatchpoint: "matchpoint",
    btnTrackFinale: "finale"
  };
  const trackIds = ["btnTrackAuto", "btnTrackTwilight", "btnTrackNight", "btnTrackDay", "btnTrackSheriff", "btnTrackVote", "btnTrackMatchpoint", "btnTrackFinale"];
  trackIds.forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      const mode = el(id).getAttribute("data-track") || trackFallbackMap[id] || "auto";
      sound.trackMode = mode;
      sound.currentTrack = sound.resolveTargetTrack();
      sound.stepIdx = 0;
      sound.barIdx = 0;
      sound.startSequencer();
      trackIds.forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
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
    if (v === 0 && voice.speaking) {
      voice.stop();
      if (typeof maybeScheduleAutoAdvanceAfterSpeech === "function") maybeScheduleAutoAdvanceAfterSpeech();
    }
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

  ["btnEngineAuto", "btnEngineLocal", "btnEngineGemini"].forEach(function (id) {
    if (!el(id)) return;
    el(id).addEventListener("click", function () {
      sound.unlock();
      const fallbackPref = id === "btnEngineGemini" ? "gemini" : (id === "btnEngineLocal" ? "local" : "auto");
      const pref = el(id).getAttribute("data-vengine") || fallbackPref;
      voice.enginePref = (pref === "local" || pref === "gemini") ? pref : "auto";
      ["btnEngineAuto", "btnEngineLocal", "btnEngineGemini"].forEach(function (other) {
        if (el(other)) el(other).classList.toggle("is-active", other === id);
      });
      voice.updateEngineStatusUi();
      saveUserPrefs();
      const hasPersonal = Boolean(typeof state !== "undefined" && state.geminiApiKey);
      const hasCloud = Boolean(typeof voice.isCloudGeminiTtsActive === "function" && voice.isCloudGeminiTtsActive());
      if (voice.enginePref === "gemini" && !hasPersonal && !hasCloud) {
        if (typeof showToast === "function") {
          showToast("請先在 AI 設定填入 Gemini API Key，目前已自動使用免費本地神經語音兜底", "amber");
        }
      } else if (voice.enginePref === "gemini" && hasCloud && !hasPersonal && typeof showToast === "function") {
        showToast("已切換為雲端 Gemini 3.8 真人氣口語音", "emerald");
      }
      auditionPersonaVoice("暖暖");
    });
  });

  if (el("btnToggleLiveBackchannel")) {
    el("btnToggleLiveBackchannel").addEventListener("click", function () {
      sound.unlock();
      voice.liveBackchannel = !voice.liveBackchannel;
      el("btnToggleLiveBackchannel").classList.toggle("is-active", voice.liveBackchannel);
      el("btnToggleLiveBackchannel").textContent = "圓桌座位插話反應：" + (voice.liveBackchannel ? "開" : "關");
      saveUserPrefs();
    });
  }

  if (el("btnToggleHumanBreath")) {
    el("btnToggleHumanBreath").addEventListener("click", function () {
      sound.unlock();
      voice.humanBreath = !voice.humanBreath;
      el("btnToggleHumanBreath").classList.toggle("is-active", voice.humanBreath);
      el("btnToggleHumanBreath").textContent = "真人換氣＋木亭音場：" + (voice.humanBreath ? "開" : "關");
      saveUserPrefs();
      if (voice.humanBreath) auditionPersonaVoice("阿竹");
    });
  }

  if (el("btnToggleAmbience")) {
    el("btnToggleAmbience").addEventListener("click", function () {
      sound.unlock();
      sound.ambientEnabled = !sound.ambientEnabled;
      el("btnToggleAmbience").classList.toggle("is-active", sound.ambientEnabled);
      el("btnToggleAmbience").textContent = "山城茶席環境音景：" + (sound.ambientEnabled ? "開（松風・茶沸・清鈴）" : "關");
      sound.applyVolumes();
      saveUserPrefs();
    });
  }

  ["btnVoiceRateSlow", "btnVoiceRateDefault", "btnVoiceRateFast"].forEach(function (id) {
    el(id).addEventListener("click", function () {
      sound.unlock();
      const r = parseFloat(el(id).getAttribute("data-vrate")) || 0.96;
      if (typeof voice.setRate === "function") {
        voice.setRate(r);
      } else {
        voice.rate = r;
        saveUserPrefs();
      }
      ["btnVoiceRateSlow", "btnVoiceRateDefault", "btnVoiceRateFast"].forEach(function (other) {
        el(other).classList.toggle("is-active", other === id);
      });
    });
  });

  let cozyAuditionTimers = [];
  function clearCozyAuditionTimers() {
    cozyAuditionTimers.forEach(function (t) { clearTimeout(t); });
    cozyAuditionTimers = [];
  }

  function playCozyAudition(seatId) {
    clearCozyAuditionTimers();
    const sampleChars = ["歡", "迎", "來", "到", "三", "好", "狼", "人", "殺"];
    sampleChars.forEach(function (ch, idx) {
      const tid = setTimeout(function () {
        const nextC = idx === sampleChars.length - 1 ? "。" : (idx === 3 ? "，" : "");
        sound.playCozySyllable(seatId, ch.charCodeAt(0) + idx * 5, ch, nextC);
      }, idx * 105);
      cozyAuditionTimers.push(tid);
    });
  }

  function auditionPersonaVoice(personaName) {
    sound.unlock();
    if (!voice.enabled) {
      voice.enabled = true;
      el("voiceToggleLabel").textContent = voice.getModeLabel();
    }
    const lines = {
      "你":   "欸我剛順了一遍大家講的話喔，中間有幾句前後兜不太起來耶，這輪我們先投最可疑的那位吧，過。",
      "暖暖": "欸大家先喝口熱茶別吵架嘛…可是老實說，剛剛那樣刺刺的口氣聽了有點毛毛的耶，這輪先請他去旁邊冷靜一下囉，過。",
      "小澄": "欸等一下，我剛對了一下大家講的時間點，這邊前後根本兜不起來啊，照刪去法看這輪我先投他喔，過。",
      "阿松": "欸老松講句實在話吼，剛剛聽半天都在繞圈子沒講重點，聽起來超心虛啊，這輪別分票直接抓狼啦，過。",
      "星兒": "欸等一下啦…你們剛聽那段不會覺得哪裡怪怪的嗎？我聽完真的起雞皮疙瘩耶，直覺他超像在演的，過！",
      "小雲": "欸慢著，我剛邊聽邊記了一下喔，前面講的跟後面講的根本對不起來啊，這很明顯在帶風向吧，過。",
      "阿竹": "且慢，一盞凍頂未涼，席間破綻已浮茶面矣。小生便以此茶敬奉諸君明辨，過。",
      "晨晨": "欸不是啊兄弟們，剛剛那段破綻也太大了吧，講話一直閃重點還想帶節奏，我這票直接鎖死投他啦，過！",
      "墨白": "觀此席間，破綻昭然。此人言辭閃爍，實乃酸民狼無疑。言盡於此，請公決之。",
      "晴嵐": "細聆諸君方才清談，唯有此人弦外生躁、宮商失序。妾身願護茶席清音不濁，還請諸君明鑒。",
      "阿朗": "欸等一下，這邏輯說不通吧？連半點實際證據都沒拿出來就急著扣帽子，這輪照證據看我建議先出他，過。",
      "柚子": "咦…等一下喔，剛剛聽那段怎麼空空的像塌掉的舒芙蕾一樣沒重點呀，柚子覺得怪怪的，這輪我先投他喔，過。",
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
      clearCozyAuditionTimers();
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
        showToast(st === "vrm3d" ? "已切換為「3D 模型頭像」" : "已切換為「電影工筆立繪」", "emerald");
      }
    });
  });

  el("selectDeviceVoice").addEventListener("change", function () {
    sound.unlock();
    voice.selectedVoiceUri = el("selectDeviceVoice").value || "auto";
    saveUserPrefs();
    if ((voice.mode === "tts" || voice.mode === "hybrid") && voice.enabled) {
      clearCozyAuditionTimers();
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
          showToast(pausedNow ? "已暫停語音與字幕（再按一次繼續）" : "▶ 已繼續播放", "emerald");
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
        const tag = nextR >= 1.34 ? "1.5× 極速快節奏" : (nextR >= 1.18 ? "1.3× 疾風快節奏" : (nextR >= 1.05 ? "1.15× 輕快推理" : "1.0× 自然節奏"));
        if (typeof showToast === "function") showToast("語音語速切換為：" + tag, "emerald");
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
        showToast(state.subtitleLarge ? "已切換為「大字護眼字幕」" : "已切回標準字幕大小", "emerald");
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
