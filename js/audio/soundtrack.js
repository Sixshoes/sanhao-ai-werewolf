/**
 * Web Audio 多聲部合成器、空間殘響、音序器與互動音效引擎
 */
"use strict";

const PERSONA_AUDIO_EQ = {
  "主持":  { lowFreq: 200, lowGain: 0.4,  midFreq: 940,  midGain: 0.5,  presFreq: 3000, presGain: 0.5, highFreq: 6150, highGain: -1.6, revSend: 0.13, gainTrim: 0.96, animeRateMul: 1.01,  twRateMul: 1.01,  detuneCents: 4,   twDetuneCents: 6,   breathFreq: 1320, breathDur: 0.105 },
  "你":    { lowFreq: 215, lowGain: 0.2,  midFreq: 1020, midGain: 0.4,  presFreq: 3120, presGain: 0.6, highFreq: 6200, highGain: -1.6, revSend: 0.08, gainTrim: 0.97, animeRateMul: 1.01,  twRateMul: 1.01,  detuneCents: 6,   twDetuneCents: 10,  breathFreq: 1420, breathDur: 0.092 },
  "你_男": { lowFreq: 180, lowGain: 1.1,  midFreq: 840,  midGain: 0.4,  presFreq: 2720, presGain: 0.7, highFreq: 5800, highGain: -1.9, revSend: 0.09, gainTrim: 1.07, animeRateMul: 1.00,  twRateMul: 1.00,  detuneCents: -4,  twDetuneCents: -6,  breathFreq: 1080, breathDur: 0.100 },
  "小澄":  { lowFreq: 195, lowGain: 0.4,  midFreq: 1180, midGain: 0.5,  presFreq: 3050, presGain: 0.8, highFreq: 5950, highGain: -1.9, revSend: 0.07, gainTrim: 1.08, animeRateMul: 1.04,  twRateMul: 1.045, detuneCents: 8,   twDetuneCents: 34,  breathFreq: 1320, breathDur: 0.085 },
  "暖暖":  { lowFreq: 230, lowGain: 0.2,  midFreq: 980,  midGain: 0.4,  presFreq: 3020, presGain: 0.5, highFreq: 6400, highGain: -1.3, revSend: 0.10, gainTrim: 0.95, animeRateMul: 1.00,  twRateMul: 0.995, detuneCents: 10,  twDetuneCents: 16,  breathFreq: 1520, breathDur: 0.102 },
  "阿松":  { lowFreq: 165, lowGain: 1.7,  midFreq: 660,  midGain: 0.5,  presFreq: 2520, presGain: 0.7, highFreq: 5450, highGain: -2.1, revSend: 0.11, gainTrim: 1.10, animeRateMul: 0.94,  twRateMul: 0.935, detuneCents: -10, twDetuneCents: -38, breathFreq: 960,  breathDur: 0.120 },
  "星兒":  { lowFreq: 240, lowGain: -0.8, midFreq: 1200, midGain: 0.4,  presFreq: 3600, presGain: 0.6, highFreq: 6450, highGain: -1.4, revSend: 0.09, gainTrim: 0.94, animeRateMul: 1.02,  twRateMul: 1.04,  detuneCents: 18,  twDetuneCents: 30,  breathFreq: 1640, breathDur: 0.084 },
  "小雲":  { lowFreq: 220, lowGain: -0.6, midFreq: 1120, midGain: 0.7,  presFreq: 3180, presGain: 0.8, highFreq: 6200, highGain: -1.5, revSend: 0.08, gainTrim: 0.97, animeRateMul: 1.02,  twRateMul: 1.03,  detuneCents: 6,   twDetuneCents: 10,  breathFreq: 1460, breathDur: 0.086 },
  "阿竹":  { lowFreq: 186, lowGain: 1.3,  midFreq: 760,  midGain: 0.4,  presFreq: 2640, presGain: 0.6, highFreq: 5650, highGain: -2.0, revSend: 0.13, gainTrim: 1.08, animeRateMul: 0.985, twRateMul: 0.96,  detuneCents: -6,  twDetuneCents: -24, breathFreq: 1050, breathDur: 0.120 },
  "晨晨":  { lowFreq: 198, lowGain: 0.8,  midFreq: 1080, midGain: 0.5,  presFreq: 3020, presGain: 0.8, highFreq: 6050, highGain: -1.8, revSend: 0.09, gainTrim: 1.07, animeRateMul: 1.02,  twRateMul: 1.055, detuneCents: 8,   twDetuneCents: 34,  breathFreq: 1280, breathDur: 0.082 },
  "墨白":  { lowFreq: 158, lowGain: 1.8,  midFreq: 600,  midGain: 0.4,  presFreq: 2460, presGain: 0.6, highFreq: 5350, highGain: -2.2, revSend: 0.13, gainTrim: 1.11, animeRateMul: 0.97,  twRateMul: 0.92,  detuneCents: -10, twDetuneCents: -58, breathFreq: 890,  breathDur: 0.132 },
  "晴嵐":  { lowFreq: 220, lowGain: 0.1,  midFreq: 980,  midGain: 0.6,  presFreq: 3020, presGain: 0.6, highFreq: 6300, highGain: -1.4, revSend: 0.13, gainTrim: 0.97, animeRateMul: 0.99,  twRateMul: 0.99,  detuneCents: 6,   twDetuneCents: 12,  breathFreq: 1460, breathDur: 0.106 },
  "阿朗":  { lowFreq: 190, lowGain: 0.6,  midFreq: 1120, midGain: 0.6,  presFreq: 3040, presGain: 0.9, highFreq: 5900, highGain: -1.9, revSend: 0.08, gainTrim: 1.07, animeRateMul: 1.02,  twRateMul: 1.04,  detuneCents: 6,   twDetuneCents: 22,  breathFreq: 1240, breathDur: 0.085 },
  "柚子":  { lowFreq: 248, lowGain: -0.9, midFreq: 1300, midGain: 0.5,  presFreq: 3760, presGain: 0.7, highFreq: 6650, highGain: -1.2, revSend: 0.09, gainTrim: 0.94, animeRateMul: 1.035, twRateMul: 1.05,  detuneCents: 20,  twDetuneCents: 36,  breathFreq: 1700, breathDur: 0.086 }
};

const sound = {
  ctx: null,
  comp: null,
  analyser: null,
  bgmGain: null,
  bgmVocalCarve: null,
  sfxGain: null,
  voiceBus: null,
  voiceLowShelf: null,
  voiceMidPeak: null,
  voicePresence: null,
  voiceDeEss: null,
  voiceRevSend: null,
  voicePanner: null,
  voiceAnalyser: null,
  voiceAnalyserData: null,
  voiceFreqData: null,
  voiceOutGain: null,
  voiceRoomConv: null,
  cozyMouthPulse: 0,
  reverb: null,
  muted: false,
  voiceDucking: false,
  bgmVol: 0.60,
  sfxVol: 0.75,
  timbre: "zen",
  trackMode: "auto",
  currentTrack: "twilight",
  seqTimer: null,
  stepIdx: 0,
  barIdx: 0,
  spectrumRAF: null,

  unlock: function () {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
        this.comp = this.ctx.createDynamicsCompressor();
        this.comp.threshold.value = -14;
        this.comp.knee.value = 18;
        this.comp.ratio.value = 4;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.82;

        this.bgmGain = this.ctx.createGain();
        // v18.0 Mid-Band Vocal-Carve Filter (1.25kHz peaking dip during speech replaces jarring volume drop!)
        this.bgmVocalCarve = this.ctx.createBiquadFilter();
        this.bgmVocalCarve.type = "peaking";
        this.bgmVocalCarve.frequency.value = 1250;
        this.bgmVocalCarve.Q.value = 0.85;
        this.bgmVocalCarve.gain.value = 0;

        this.sfxGain = this.ctx.createGain();
        this.reverb = this.buildHallReverb(2.1);
        const bgmRevSend = this.ctx.createGain();
        bgmRevSend.gain.value = 0.85;
        const revReturn = this.ctx.createGain();
        revReturn.gain.value = 0.38;

        this.bgmGain.connect(this.bgmVocalCarve);
        this.bgmVocalCarve.connect(this.comp);
        this.bgmVocalCarve.connect(bgmRevSend);
        bgmRevSend.connect(this.reverb);
        this.sfxGain.connect(this.comp);
        this.reverb.connect(revReturn);
        revReturn.connect(this.comp);

        // Broadcast Vocal Chain + Per-Persona Sculpting EQ + 3D Stereo Spatial Panner + Real-Time Multi-Vowel Lip-Sync Analyser!
        this.voiceBus = this.ctx.createGain();
        this.voiceLowShelf = this.ctx.createBiquadFilter();
        this.voiceLowShelf.type = "lowshelf";
        this.voiceLowShelf.frequency.value = 210;
        this.voiceLowShelf.gain.value = 2.0;

        this.voiceMidPeak = this.ctx.createBiquadFilter();
        this.voiceMidPeak.type = "peaking";
        this.voiceMidPeak.frequency.value = 950;
        this.voiceMidPeak.Q.value = 1.0;
        this.voiceMidPeak.gain.value = 0.8;

        this.voicePresence = this.ctx.createBiquadFilter();
        this.voicePresence.type = "peaking";
        this.voicePresence.frequency.value = 3100;
        this.voicePresence.Q.value = 1.1;
        this.voicePresence.gain.value = 1.8;

        this.voiceDeEss = this.ctx.createBiquadFilter();
        this.voiceDeEss.type = "highshelf";
        this.voiceDeEss.frequency.value = 5800;
        this.voiceDeEss.gain.value = -2.4;

        const vComp = this.ctx.createDynamicsCompressor();
        vComp.threshold.value = -20;
        vComp.knee.value = 20;
        vComp.ratio.value = 3.0;

        this.voiceAnalyser = this.ctx.createAnalyser();
        this.voiceAnalyser.fftSize = 128;
        this.voiceAnalyser.smoothingTimeConstant = 0.65;
        this.voiceAnalyserData = new Uint8Array(this.voiceAnalyser.fftSize);
        this.voiceFreqData = new Uint8Array(this.voiceAnalyser.frequencyBinCount || 64);

        this.voicePanner = typeof this.ctx.createStereoPanner === "function"
          ? this.ctx.createStereoPanner()
          : null;
        this.voiceOutGain = this.ctx.createGain();
        this.voiceOutGain.gain.value = 0.92;

        this.voiceRevSend = this.ctx.createGain();
        this.voiceRevSend.gain.value = 0.11;
        this.voiceRoomConv = this.buildWoodenPavilionImpulse(0.36);
        const voiceRoomReturn = this.ctx.createGain();
        voiceRoomReturn.gain.value = 0.52;

        this.voiceBus.connect(this.voiceLowShelf);
        this.voiceLowShelf.connect(this.voiceMidPeak);
        this.voiceMidPeak.connect(this.voicePresence);
        this.voicePresence.connect(this.voiceDeEss);
        this.voiceDeEss.connect(vComp);
        vComp.connect(this.voiceAnalyser);
        if (this.voicePanner) {
          this.voiceAnalyser.connect(this.voicePanner);
          this.voicePanner.connect(this.voiceOutGain);
        } else {
          this.voiceAnalyser.connect(this.voiceOutGain);
        }
        this.voiceOutGain.connect(this.comp);
        this.voiceOutGain.connect(this.voiceRevSend);
        this.voiceRevSend.connect(this.voiceRoomConv);
        this.voiceRoomConv.connect(voiceRoomReturn);
        voiceRoomReturn.connect(this.comp);

        this.comp.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.applyVolumes();
      } catch (e) {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(function () {});
    }
    if (!this.seqTimer && !this.muted) {
      this.startSequencer();
    }
    this.updateEqIndicator();
    voice.unlock();
  },

  buildWoodenPavilionImpulse: function (seconds) {
    // Near-field walnut tea table & cedar pavilion early-reflection impulse (replaces hollow 2.1s hall echo on voices)
    const conv = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = Math.max(256, Math.floor(rate * (seconds || 0.36)));
    const impulse = this.ctx.createBuffer(2, length, rate);
    const earlyTapsMs = [
      [7.4, 0.36, 0.32],   // Walnut tabletop bounce (~1.25m path diff)
      [13.8, 0.24, 0.28],  // Wooden floorboards
      [20.6, 0.19, 0.14],  // Left cypress pillar
      [27.9, 0.14, 0.20],  // Right lattice screen
      [36.5, 0.12, 0.12]   // Raftered cedar roof
    ];
    for (let ch = 0; ch < 2; ch++) {
      const buf = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Warm, intimate wood-absorbed diffuse tail (-60dB in ~0.34s)
        const env = Math.pow(1 - t, 4.4);
        const raw = (Math.random() * 2 - 1) * env * 0.14;
        lp = lp * 0.78 + raw * 0.22;
        buf[i] = lp;
      }
      for (let k = 0; k < earlyTapsMs.length; k++) {
        const tap = earlyTapsMs[k];
        const idx = Math.floor((tap[0] / 1000) * rate);
        if (idx > 1 && idx + 3 < length) {
          const amp = tap[ch + 1];
          buf[idx - 1] += amp * 0.25;
          buf[idx] += amp * 0.55;
          buf[idx + 1] += amp * 0.20;
        }
      }
    }
    conv.buffer = impulse;
    return conv;
  },

  playPreSpeechBreath: function (personaKey, mood, seatId, sitState) {
    if (this.muted || !this.ctx || typeof voice === "undefined" || voice.volume < 0.06) return;
    if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return;
    try {
      const eq = PERSONA_AUDIO_EQ[personaKey] || PERSONA_AUDIO_EQ["暖暖"];
      const rate = this.ctx.sampleRate;
      const isUrgent = sitState === "under_fire" || mood === "panic" || mood === "rebut" || mood === "claim_seer";
      const isSlow = sitState === "last_words" || mood === "last_words" || mood === "host_night";
      const isNervous = sitState === "wolf_nervous";
      const dur = isUrgent ? 0.14 : (isSlow ? 0.18 : (isNervous ? 0.16 : clamp(eq.breathDur || 0.11, 0.08, 0.15)));
      const frames = Math.max(64, Math.floor(rate * dur));
      const bBuf = this.ctx.createBuffer(1, frames, rate);
      const data = bBuf.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < frames; i++) {
        const u = i / frames;
        // Situational breath envelope: urgent sharp inhale vs gentle sigh vs soft nervous throat-catch
        const env = isNervous
          ? Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(u * Math.PI * 6))
          : (isSlow ? Math.pow(1 - u, 1.35) * Math.sin(Math.PI * Math.min(1, u * 1.6)) : Math.sin(Math.PI * Math.pow(u, isUrgent ? 0.62 : 0.78)));
        const white = (Math.random() * 2 - 1);
        prev = prev * (isNervous ? 0.78 : 0.62) + white * (isNervous ? 0.22 : 0.38);
        data[i] = prev * env;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = bBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = isNervous ? 680 : ((eq.breathFreq || 1250) * (isUrgent ? 1.18 : (isSlow ? 0.84 : 1.0)));
      bp.Q.value = isNervous ? 2.4 : 1.65;
      const g = this.ctx.createGain();
      const baseAmp = isUrgent ? 0.011 : (isSlow ? 0.010 : (isNervous ? 0.0095 : 0.0068));
      g.gain.value = clamp(baseAmp * voice.volume, 0.001, 0.016);
      src.connect(bp);
      if (typeof this.ctx.createStereoPanner === "function" && seatId && typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.computeSeatPan === "function") {
        const panNode = this.ctx.createStereoPanner();
        panNode.pan.value = clamp(stage3d.computeSeatPan(seatId) * 0.64, -0.75, 0.75);
        bp.connect(panNode);
        panNode.connect(g);
      } else {
        bp.connect(g);
      }
      g.connect(this.comp || this.ctx.destination);
      if (this.voiceRoomConv) {
        const rSend = this.ctx.createGain();
        rSend.gain.value = 0.18;
        g.connect(rSend);
        rSend.connect(this.voiceRoomConv);
      }
      if (this._activeBreathNode) {
        try { this._activeBreathNode.stop(); this._activeBreathNode.disconnect(); } catch (e) {}
      }
      this._activeBreathNode = src;
      const selfSndBreath = this;
      src.onended = function () {
        if (selfSndBreath._activeBreathNode === src) selfSndBreath._activeBreathNode = null;
        try { src.disconnect(); g.disconnect(); } catch (e) {}
      };
      src.start();
    } catch (e) {}
  },

  playSeatFoley: function (kind, seatId) {
    // v18.0 Subtle spatialized tabletop micro-foley (teacup lift/setdown & cloth rustle) panned to seat direction!
    if (this.muted || !this.ctx || this.sfxVol < 0.05) return;
    if (typeof isSpectatorFastForward === "function" && isSpectatorFastForward()) return;
    try {
      const now = this.ctx.currentTime;
      const outG = this.ctx.createGain();
      outG.gain.value = clamp(this.sfxVol * 0.22, 0.02, 0.20);
      let destNode = outG;
      if (typeof this.ctx.createStereoPanner === "function" && seatId && typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.computeSeatPan === "function") {
        const pNode = this.ctx.createStereoPanner();
        pNode.pan.value = clamp(stage3d.computeSeatPan(seatId) * 0.72, -0.78, 0.78);
        pNode.connect(outG);
        destNode = pNode;
      }
      outG.connect(this.comp || this.ctx.destination);

      if (kind === "cup_set") {
        // Gentle celadon teacup resting onto walnut wood (for dramatic post-bombshell pause!)
        const oscWood = this.ctx.createOscillator();
        const gWood = this.ctx.createGain();
        oscWood.type = "triangle";
        oscWood.frequency.setValueAtTime(192, now);
        oscWood.frequency.exponentialRampToValueAtTime(118, now + 0.065);
        gWood.gain.setValueAtTime(0.0001, now);
        gWood.gain.linearRampToValueAtTime(0.28, now + 0.005);
        gWood.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
        oscWood.connect(gWood); gWood.connect(destNode);
        oscWood.start(now); oscWood.stop(now + 0.095);

        const oscCup = this.ctx.createOscillator();
        const gCup = this.ctx.createGain();
        oscCup.type = "sine";
        oscCup.frequency.setValueAtTime(1640, now + 0.008);
        gCup.gain.setValueAtTime(0.0001, now + 0.008);
        gCup.gain.linearRampToValueAtTime(0.09, now + 0.015);
        gCup.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        oscCup.connect(gCup); gCup.connect(destNode);
        oscCup.start(now + 0.008); oscCup.stop(now + 0.12);
      } else {
        // Soft sleeve/linen rustle + faint cup-lift tap during 220ms pre-speech prep beat
        const frames = Math.max(64, Math.floor(this.ctx.sampleRate * 0.095));
        const nBuf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
        const ch = nBuf.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < frames; i++) {
          const u = i / frames;
          const env = Math.sin(Math.PI * u);
          lp = lp * 0.72 + (Math.random() * 2 - 1) * 0.28;
          ch[i] = lp * env * 0.45;
        }
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = kind === "cup_lift" ? 1150 : 880;
        bp.Q.value = 1.2;
        const nG = this.ctx.createGain();
        nG.gain.value = 0.16;
        nSrc.connect(bp); bp.connect(nG); nG.connect(destNode);
        nSrc.start(now);
      }
    } catch (e) {}
  },

  stopBackchannels: function () {
    if (this._activeBreathNode) {
      try { this._activeBreathNode.onended = null; this._activeBreathNode.stop(); this._activeBreathNode.disconnect(); } catch (e) {}
      this._activeBreathNode = null;
    }
    if (this._activeBackchannelNodes && this._activeBackchannelNodes.size) {
      this._activeBackchannelNodes.forEach(function (node) {
        try { node.onended = null; node.stop(); node.disconnect(); } catch (e) {}
      });
      this._activeBackchannelNodes.clear();
    }
  },

  playBackchannelBuffer: function (audioBuf, seatId, personaKey, pbRate, detuneCents) {
    if (this.muted || !this.ctx || !audioBuf || typeof voice === "undefined" || voice.volume < 0.05) return false;
    try {
      if (this.ctx.state === "suspended" && typeof this.ctx.resume === "function") {
        this.ctx.resume().catch(function () {});
      }
      if (!this._activeBackchannelNodes) this._activeBackchannelNodes = new Set();
      this.stopBackchannels();
      const eq = PERSONA_AUDIO_EQ[personaKey] || PERSONA_AUDIO_EQ["暖暖"];
      const src = this.ctx.createBufferSource();
      src.buffer = audioBuf;
      src.playbackRate.value = clamp(pbRate || 1.0, 0.88, 1.24);
      if (src.detune && typeof detuneCents === "number") {
        src.detune.value = clamp(detuneCents, -140, 140);
      }
      // Subtle off-axis tabletop distance warmth so listener interjection never masks main speaker
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4300;
      const bodyEq = this.ctx.createBiquadFilter();
      bodyEq.type = "peaking";
      bodyEq.frequency.value = eq.midFreq || 950;
      bodyEq.Q.value = 1.0;
      bodyEq.gain.value = eq.midGain || 0.5;
      const g = this.ctx.createGain();
      g.gain.value = clamp(voice.volume * 0.36 * (eq.gainTrim || 1.0), 0.04, 0.44);

      src.connect(bodyEq);
      bodyEq.connect(lp);
      if (typeof this.ctx.createStereoPanner === "function") {
        const panNode = this.ctx.createStereoPanner();
        let panVal = (((seatId || 2) % 2 === 0) ? -0.48 : 0.48);
        if (seatId && typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.computeSeatPan === "function") {
          panVal = clamp(stage3d.computeSeatPan(seatId) * 0.86, -0.82, 0.82);
          if (Math.abs(panVal) < 0.16) panVal = panVal >= 0 ? 0.24 : -0.24;
        }
        panNode.pan.value = panVal;
        lp.connect(panNode);
        panNode.connect(g);
      } else {
        lp.connect(g);
      }
      g.connect(this.comp || this.ctx.destination);
      if (this.voiceRoomConv) {
        const rSend = this.ctx.createGain();
        rSend.gain.value = 0.22;
        g.connect(rSend);
        rSend.connect(this.voiceRoomConv);
      }
      const selfSndBc = this;
      this._activeBackchannelNodes.add(src);
      src.onended = function () {
        if (selfSndBc._activeBackchannelNodes) selfSndBc._activeBackchannelNodes.delete(src);
        try { src.disconnect(); g.disconnect(); } catch (e) {}
      };
      src.start();
      return true;
    } catch (e) {
      return false;
    }
  },

  buildHallReverb: function (seconds) {
    const conv = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const buf = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 2.6);
        const white = (Math.random() * 2 - 1) * env * 0.45;
        lp = lp * 0.72 + white * 0.28;
        buf[i] = lp;
      }
    }
    conv.buffer = impulse;
    return conv;
  },

  setVoicePan: function (panVal) {
    if (!this.ctx || !this.voicePanner) return;
    const p = clamp(Number(panVal) || 0, -0.75, 0.75);
    try {
      this.voicePanner.pan.setTargetAtTime(p, this.ctx.currentTime, 0.06);
    } catch (e) {}
  },

  applyPersonaVoiceChain: function (personaKey, mood, seatId, sitState) {
    if (!this.ctx) return;
    const eq = PERSONA_AUDIO_EQ[personaKey] || PERSONA_AUDIO_EQ["暖暖"];
    const now = this.ctx.currentTime;
    try {
      if (this.voiceLowShelf) {
        this.voiceLowShelf.frequency.setTargetAtTime(eq.lowFreq, now, 0.04);
        const warmBoost = (sitState === "last_words" || mood === "last_words") ? 1.4 : 0;
        this.voiceLowShelf.gain.setTargetAtTime(eq.lowGain + warmBoost, now, 0.04);
      }
      if (this.voiceMidPeak) {
        this.voiceMidPeak.frequency.setTargetAtTime(eq.midFreq, now, 0.04);
        this.voiceMidPeak.Q.setTargetAtTime(1.15, now, 0.04);
        this.voiceMidPeak.gain.setTargetAtTime(eq.midGain, now, 0.04);
      }
      if (this.voicePresence) {
        this.voicePresence.frequency.setTargetAtTime(eq.presFreq, now, 0.04);
        const moodLift = (mood === "accuse" || mood === "rebut" || mood === "claim_seer") ? 0.65 : (mood === "last_words" ? -0.45 : 0);
        this.voicePresence.gain.setTargetAtTime(eq.presGain + moodLift, now, 0.04);
      }
      if (this.voiceDeEss) {
        this.voiceDeEss.frequency.setTargetAtTime(eq.highFreq, now, 0.04);
        this.voiceDeEss.gain.setTargetAtTime(eq.highGain, now, 0.04);
      }
      if (this.voiceRevSend) {
        const rev = mood === "host_night" ? Math.max(0.24, eq.revSend) : (mood === "last_words" ? Math.max(0.18, eq.revSend) : eq.revSend);
        this.voiceRevSend.gain.setTargetAtTime(rev, now, 0.04);
      }
      if (this.voiceOutGain) {
        this.voiceOutGain.gain.setTargetAtTime(clamp(0.95 * (eq.gainTrim || 1.0), 0.76, 1.22), now, 0.04);
      }
      if (personaKey === "主持" || personaKey === "你" || personaKey === "你_男") {
        this.setVoicePan(0);
      } else if (seatId && typeof stage3d !== "undefined" && stage3d.isActive && stage3d.isActive() && typeof stage3d.computeSeatPan === "function") {
        // Pull active speaker slightly closer to center-mic for crisp focus while preserving spatial cue!
        this.setVoicePan(stage3d.computeSeatPan(seatId) * 0.64);
      }
    } catch (e) {}
  },

  playTableReactionSfx: function (kind) {
    if (this.muted || !this.ctx) return;
    try {
      if (kind === "clash") {
        // Subtle porcelain teacup clink + wooden gavel resonance on role counter-claim
        this.tone(1480, 0.08, "sine", 0.045, 0);
        this.tone(2210, 0.11, "triangle", 0.032, 0.03);
        this.tone(296, 0.16, "triangle", 0.055, 0.05);
      } else if (kind === "agree") {
        // Warm wooden-chime nod for agreement / vouch
        this.tone(523.25, 0.09, "sine", 0.04, 0);
        this.tone(659.25, 0.14, "sine", 0.038, 0.07);
      } else if (kind === "doubt") {
        // Soft inquisitive wood-tap cue for suspicion / questioning
        this.tone(392, 0.07, "triangle", 0.048, 0);
        this.tone(330, 0.12, "triangle", 0.042, 0.06);
      } else if (kind === "mic_on") {
        this.tone(587.3, 0.07, "sine", 0.045, 0);
        this.tone(880, 0.11, "sine", 0.045, 0.06);
      } else if (kind === "mic_off") {
        this.tone(659.25, 0.07, "sine", 0.04, 0);
        this.tone(440, 0.10, "sine", 0.035, 0.06);
      }
    } catch (e) {}
  },

  computeMandarinCharVowels: function (ch, nowMs) {
    // v24.0 Phoneme-aware Mandarin character vowel aperture + bilabial onset modulation (eliminates uniform jaw flapping offline!)
    if (!ch || /^[\s，。！？、；：「」『』（）()—…·・\-~,.!?;:]+$/.test(ch)) {
      return { a: 0, i: 0, u: 0, e: 0, o: 0, amp: 0 };
    }
    const tNow = nowMs || 0;
    const bilabialMul = /[不把別白票牌沒明問我怕幫表邊評盤排拍破偏]/.test(ch)
      ? (0.58 + 0.42 * Math.max(0, Math.sin(tNow * 0.028)))
      : 1.0;
    const phraseArc = 0.72 + 0.28 * Math.sin(tNow * 0.017) * Math.cos(tNow * 0.007);
    const pulse = clamp(phraseArc * bilabialMul, 0.24, 1.0);
    // 1. Wide-open [a] aperture (啊/話/查/殺/打/吧/他/大/那/場/狼/講)
    if (/[好大他她吧啦嗎啊哪發話打殺查怕假家那看張場把當方長講狼像剛幫想常上讓感站晚牌排藍松朗]/.test(ch)) {
      return { a: 0.90 * pulse, i: 0.06, u: 0.08, e: 0.16, o: 0.24 * pulse, amp: 0.86 * pulse };
    }
    // 2. Rounded [o] aperture (我/說/多/過/投/號/票/座/若/桌/莫)
    if (/[我多說過錯落投公票座號就又手口後走有某否若桌作波魔破莫播囉喔]/.test(ch)) {
      return { a: 0.20 * pulse, i: 0.04, u: 0.44 * pulse, e: 0.10, o: 0.84 * pulse, amp: 0.70 * pulse };
    }
    // 3. Tight-puckered [u] aperture (出/不/五/主/守/竹/無/護/獨/錄/局/路/住)
    if (/[出不五主守竹無護獨局錄部度都圖書族入補覆步路露住注組毒忽突初]/.test(ch)) {
      return { a: 0.08, i: 0.04, u: 0.86 * pulse, e: 0.08, o: 0.34 * pulse, amp: 0.54 * pulse };
    }
    // 4. Wide-narrow [i] aperture (你/是/一/七/起/氣/疑/席/警/聽/心/清/信)
    if (/[你是一七起意氣理記仔細戲疑席警聽心定平輕清信民明奇緊離西席星]/.test(ch)) {
      return { a: 0.12 * pulse, i: 0.78 * pulse, u: 0.06, e: 0.42 * pulse, o: 0.08, amp: 0.46 * pulse };
    }
    // 5. Mid-open [e] aperture (這/得/給/誰/別/點/先/驗/徹/則/可/合/和/色/澄/晨)
    if (/[這得給誰別點先驗徹則可合和色澄晨車測設社覺切結]/.test(ch)) {
      return { a: 0.36 * pulse, i: 0.26 * pulse, u: 0.08, e: 0.76 * pulse, o: 0.14, amp: 0.60 * pulse };
    }
    const code = ch.charCodeAt(0) || 1;
    const bucket = code % 5;
    if (bucket === 0) return { a: 0.72 * pulse, i: 0.10, u: 0.10, e: 0.20, o: 0.22, amp: 0.68 * pulse };
    if (bucket === 1) return { a: 0.18, i: 0.62 * pulse, u: 0.10, e: 0.40 * pulse, o: 0.10, amp: 0.48 * pulse };
    if (bucket === 2) return { a: 0.18, i: 0.08, u: 0.44 * pulse, e: 0.14, o: 0.68 * pulse, amp: 0.58 * pulse };
    if (bucket === 3) return { a: 0.10, i: 0.06, u: 0.70 * pulse, e: 0.10, o: 0.28 * pulse, amp: 0.50 * pulse };
    return { a: 0.42 * pulse, i: 0.22, u: 0.14, e: 0.62 * pulse, o: 0.18, amp: 0.56 * pulse };
  },

  getVoiceVowelWeights: function (seatId, nowMs) {
    if (typeof voice !== "undefined" && voice.paused) {
      return { a: 0, i: 0, u: 0, e: 0, o: 0, amp: 0 };
    }
    const amp = this.getVoiceMouthLevel();
    const hasLiveAudioSource = Boolean(typeof voice !== "undefined" && (voice.activeAudioNode || voice.activeAudioEl));
    if (this.voiceAnalyser && this.voiceFreqData && hasLiveAudioSource) {
      try {
        this.voiceAnalyser.getByteFrequencyData(this.voiceFreqData);
        const fd = this.voiceFreqData;
        const lowE = ((fd[1] || 0) + (fd[2] || 0)) * 0.5;
        const midE = ((fd[2] || 0) + (fd[3] || 0) + (fd[4] || 0)) / 3;
        const hiE = ((fd[5] || 0) + (fd[6] || 0) + (fd[7] || 0) + (fd[8] || 0)) * 0.25;
        const sum = Math.max(1, lowE + midE + hiE);
        const wA = clamp((midE / sum) * 1.45, 0, 1) * amp;
        const wO = clamp((lowE / sum) * 1.25, 0, 1) * amp;
        const wI = clamp((hiE / sum) * 1.35, 0, 1) * amp;
        const wU = wO * 0.65;
        const wE = (wA * 0.45 + wI * 0.55) * 0.85;
        return { a: wA, i: wI, u: wU, e: wE, o: wO, amp: amp };
      } catch (e) {}
    }
    const nowT = nowMs || performance.now();
    // During 220ms pre-speech prep beat, keep lips lightly poised/closed before first syllable!
    if (typeof state !== "undefined" && state.speechPrepUntil && nowT < state.speechPrepUntil && state.speechPrepSeatId === seatId) {
      return { a: 0.08, i: 0, u: 0, e: 0, o: 0.04, amp: 0.08 };
    }
    const isSpeechWindow = Boolean(typeof state !== "undefined" && state.activeSpeechAnimUntil && nowT < state.activeSpeechAnimUntil);
    const isSpeaking = Boolean((typeof voice !== "undefined" && voice.speaking) || (typeof state !== "undefined" && state.typewriter && state.typewriter.active) || isSpeechWindow);
    if (!isSpeaking && amp <= 0.01) {
      return { a: 0, i: 0, u: 0, e: 0, o: 0, amp: 0 };
    }
    // v18.0 Character-syllable lip-sync when falling back to speechSynthesis or silent reading window!
    if (typeof voice !== "undefined" && voice.liveSpokenText && typeof voice.liveCharIndex === "number" && voice.liveCharIndex >= 0) {
      if (voice.liveInPause) {
        return { a: 0, i: 0, u: 0, e: 0, o: 0, amp: 0 };
      }
      const ch = voice.liveSpokenText.charAt(Math.min(voice.liveSpokenText.length - 1, voice.liveCharIndex));
      return this.computeMandarinCharVowels(ch, nowT);
    }
    const t = nowT * 0.001;
    const s = (seatId || 1) * 1.7;
    const level = Math.max(amp, clamp(Math.abs(Math.sin(t * 14.5 + s)) * 0.65 + Math.abs(Math.sin(t * 6.3 + s * 0.4)) * 0.25, 0.14, 0.92));
    const phase = (t * 4.8 + s) % 5;
    const wA = Math.max(0.15, Math.sin(phase * 1.25)) * level;
    const wI = Math.max(0, Math.sin((phase - 1.1) * 1.4)) * level * 0.78;
    const wU = Math.max(0, Math.sin((phase - 2.3) * 1.3)) * level * 0.68;
    const wE = Math.max(0, Math.sin((phase - 3.2) * 1.3)) * level * 0.72;
    const wO = Math.max(0, Math.sin((phase - 4.0) * 1.2)) * level * 0.76;
    return { a: wA, i: wI, u: wU, e: wE, o: wO, amp: level };
  },

  getVoiceMouthLevel: function () {
    let level = 0;
    const hasLiveSource = Boolean(typeof voice !== "undefined" && (voice.activeAudioNode || voice.activeAudioEl));
    if (this.voiceAnalyser && this.voiceAnalyserData && hasLiveSource) {
      this.voiceAnalyser.getByteTimeDomainData(this.voiceAnalyserData);
      let sumSq = 0;
      const len = this.voiceAnalyserData.length;
      for (let i = 0; i < len; i++) {
        const d = (this.voiceAnalyserData[i] - 128) / 128;
        sumSq += d * d;
      }
      const rms = Math.sqrt(sumSq / len);
      level = clamp(rms * 4.8, 0, 1);
    }
    if (this.cozyMouthPulse > 0.01) {
      this.cozyMouthPulse *= 0.84;
      level = Math.max(level, this.cozyMouthPulse);
    }
    return level;
  },

  applyVolumes: function () {
    if (!this.ctx || !this.bgmGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // v18.0 Mid-Band Vocal-Carve Mixing: keep warm BGM bed at 0.58 while carving 1.25kHz (-9dB) for crystal speech!
    const duckMul = this._briefDuckActive ? 0.14 : (this.voiceDucking ? 0.58 : 1.0);
    const rampSec = this._briefDuckActive ? 0.04 : (this.voiceDucking ? 0.14 : 0.45);
    this.bgmGain.gain.setTargetAtTime(this.muted ? 0.0001 : Math.max(0.0001, this.bgmVol * 0.52 * duckMul), now, rampSec);
    if (this.bgmVocalCarve) {
      const carveDb = this.voiceDucking ? -9.0 : 0.0;
      this.bgmVocalCarve.gain.setTargetAtTime(carveDb, now, this.voiceDucking ? 0.10 : 0.36);
    }
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0.0001 : Math.max(0.0001, this.sfxVol * 0.82), now, 0.06);
    this.updateEqIndicator();
  },

  duckBgmBrief: function (durationMs) {
    const dur = clamp(Number(durationMs) || 350, 120, 1200);
    this._briefDuckActive = true;
    this.applyVolumes();
    if (this._briefDuckTimer) clearTimeout(this._briefDuckTimer);
    const selfSnd = this;
    this._briefDuckTimer = setTimeout(function () {
      selfSnd._briefDuckTimer = null;
      selfSnd._briefDuckActive = false;
      selfSnd.applyVolumes();
    }, dur);
  },

  playWoodTokenDrop: function () {
    if (this.muted || !this.ctx) return;
    try {
      // Crisp walnut-wood tally landing knock + faint porcelain teacup resonance
      this.tone(176, 0.055, "triangle", 0.075, 0);
      this.tone(118, 0.075, "sine", 0.060, 0.012);
      this.tone(1320, 0.055, "sine", 0.022, 0.024);
    } catch (e) {}
  },

  updateEqIndicator: function () {
    const eq = document.getElementById("headerEqBars");
    if (eq) {
      eq.classList.toggle("playing", Boolean(this.ctx && !this.muted && this.bgmVol > 0.02 && this.seqTimer));
    }
  },

  resolveTargetTrack: function () {
    if (this.trackMode !== "auto") return this.trackMode;
    if (!state.match.started || state.match.phase === "LOBBY") return "twilight";
    const p = state.match.phase;
    if (p === "NIGHT_GUARD" || p === "NIGHT_WOLF" || p === "NIGHT_SEER" || p === "NIGHT_WITCH") return "night";
    if (p === "GAME_OVER") return "finale";
    if (state.match.isMatchPoint) return "matchpoint";
    if (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT" || p === "HUNTER_TRIGGER") return "vote";
    return "day";
  },

  syncAtmosphere: function () {
    this.syncWithPhase();
  },

  getCasualtyTensionCount: function () {
    if (typeof state === "undefined" || !state.match || !state.match.started || !Array.isArray(state.match.seats)) return 0;
    if (state.match.phase === "LOBBY" || state.match.phase === "GAME_OVER") return 0;
    let dead = 0;
    for (let i = 0; i < state.match.seats.length; i++) {
      if (state.match.seats[i] && !state.match.seats[i].alive) dead += 1;
    }
    return dead;
  },

  getEffectiveBpm: function (trackKey) {
    const tk = trackKey || this.currentTrack || "twilight";
    const mv = MOVEMENTS[tk] || MOVEMENTS.twilight;
    if (tk === "twilight" || tk === "finale") return mv.bpm;
    const dead = this.getCasualtyTensionCount();
    // v18.0 Escalation: +4 BPM per fallen player (capped cleanly at +20 BPM)
    return mv.bpm + Math.min(20, dead * 4);
  },

  syncWithPhase: function () {
    const next = this.resolveTargetTrack();
    const nextBpm = this.getEffectiveBpm(next);
    if (next !== this.currentTrack || (this.seqTimer && Math.abs(nextBpm - (this._activeSeqBpm || nextBpm)) >= 4)) {
      if (next !== this.currentTrack) {
        this.currentTrack = next;
        this.stepIdx = 0;
        this.barIdx = 0;
      }
      if (this.seqTimer) {
        this.startSequencer();
      }
    }
    this.refreshMusicModalLabels();
  },

  refreshMusicModalLabels: function () {
    const mv = MOVEMENTS[this.currentTrack] || MOVEMENTS.twilight;
    const effBpm = this.getEffectiveBpm(this.currentTrack);
    const np = document.getElementById("nowPlayingLabel");
    const ch = document.getElementById("musicChordReadout");
    const bp = document.getElementById("musicBpmReadout");
    if (np) np.textContent = "正在播放：" + mv.name + (this.trackMode === "auto" ? "（自動跟隨）" : "（手動試聽）");
    if (ch) ch.textContent = mv.chordsLabel;
    if (bp) bp.textContent = effBpm + " BPM";
  },

  startSequencer: function () {
    if (this.seqTimer) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
    if (!this.ctx || this.muted) {
      this.updateEqIndicator();
      return;
    }
    const effBpm = this.getEffectiveBpm(this.currentTrack);
    this._activeSeqBpm = effBpm;
    const eighthMs = Math.round((60 / effBpm) * 500);
    const self = this;
    this.refreshMusicModalLabels();
    this.tickStep();
    this.seqTimer = setInterval(function () {
      self.tickStep();
    }, eighthMs);
    this.updateEqIndicator();
  },

  stopSequencer: function () {
    if (this.seqTimer) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
    this.updateEqIndicator();
  },

  tickStep: function () {
    if (!this.ctx || this.muted || this.bgmVol <= 0.01 || (typeof document !== "undefined" && document.hidden)) return;
    const mv = MOVEMENTS[this.currentTrack] || MOVEMENTS.twilight;
    const effBpm = this.getEffectiveBpm(this.currentTrack);
    const now = this.ctx.currentTime + 0.02;
    const bar = this.barIdx % 4;
    const step = this.stepIdx % 8;
    const stepDur = (60 / effBpm) * 0.5;
    const deadTension = this.getCasualtyTensionCount();

    // 1. Trigger warm extended Pad Chord on step 0 of every bar (+ deeper low bass string layers per casualty!)
    if (step === 0 && mv.pads[bar]) {
      this.voicePad(mv.pads[bar], now, stepDur * 7.8, this.currentTrack === "night" ? 0.11 : 0.09);
      if (deadTension >= 1 && this.currentTrack !== "twilight" && this.currentTrack !== "finale") {
        const rootBass = mv.pads[bar][0] - 12;
        const bassVol = clamp(0.032 + Math.min(4, deadTension) * 0.014, 0.03, 0.095);
        this.voicePad([rootBass], now, stepDur * 7.9, bassVol);
      }
    }

    // 2. Plucked Zither / Acoustic Guitar Arpeggio
    const arpMidi = mv.arps[bar] ? mv.arps[bar][step] : null;
    if (arpMidi) {
      const accent = (step === 0 || step === 4) ? 0.16 : 0.10;
      this.voicePluck(midiToFreq(arpMidi), now, stepDur * 2.4, accent);
      // Add extra octave shimmer when it is Player's turn to play a card!
      if (state.match.phase === "DAY_PLAYER_TURN" && step % 2 === 0) {
        this.voiceBell(midiToFreq(arpMidi + 12), now, stepDur * 1.8, 0.035);
      }
    }

    // 3. Crystalline Bell / Singing Bowl Overtone Motif
    const bellMidi = mv.bells[bar] ? mv.bells[bar][step] : null;
    if (bellMidi) {
      this.voiceBell(midiToFreq(bellMidi), now, stepDur * 3.5, 0.065);
    }

    // 4. Subtle Taiko / Heartbeat / Woodblock Groove
    const drumCode = mv.drums ? mv.drums[step] : 0;
    if (drumCode === 1) this.voiceDrum("deep", now, 0.16);
    else if (drumCode === 2) this.voiceDrum("deep", now, 0.09);
    else if (drumCode === 3) this.voiceDrum("wood", now, 0.06);

    this.stepIdx += 1;
    if (this.stepIdx >= 8) {
      this.stepIdx = 0;
      this.barIdx = (this.barIdx + 1) % 4;
    }
  },

  voicePluck: function (freq, t, dur, vel) {
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      if (this.timbre === "zen") {
        osc1.type = "triangle";
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * 2, t);
        filt.frequency.setValueAtTime(Math.min(7000, freq * 6.5), t);
        filt.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.5), t + 0.28);
      } else if (this.timbre === "folk") {
        osc1.type = "triangle";
        osc2.type = "triangle";
        osc2.detune.value = 5;
        osc2.frequency.setValueAtTime(freq, t);
        filt.frequency.setValueAtTime(Math.min(4800, freq * 4.2), t);
        filt.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), t + 0.22);
      } else {
        osc1.type = "sawtooth";
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq, t);
        filt.frequency.setValueAtTime(Math.min(3200, freq * 3.0), t);
        filt.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.1), t + 0.35);
      }

      osc1.frequency.setValueAtTime(freq, t);
      filt.type = "lowpass";
      filt.Q.value = 1.4;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vel, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      const osc2Mix = this.ctx.createGain();
      osc2Mix.gain.value = 0.32;

      osc1.connect(filt);
      osc2.connect(osc2Mix);
      osc2Mix.connect(filt);
      filt.connect(gain);
      gain.connect(this.bgmGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur + 0.04);
      osc2.stop(t + dur + 0.04);
    } catch (e) {}
  },

  voicePad: function (midis, t, dur, vel) {
    const self = this;
    midis.forEach(function (m, idx) {
      try {
        const freq = midiToFreq(m);
        const osc = self.ctx.createOscillator();
        const filt = self.ctx.createBiquadFilter();
        const gain = self.ctx.createGain();

        osc.type = self.timbre === "cinema" ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.value = (idx % 2 === 0 ? 4 : -4);

        filt.type = "lowpass";
        filt.frequency.setValueAtTime(self.currentTrack === "night" ? 680 : 1150, t);

        const noteVel = vel / Math.sqrt(midis.length);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(noteVel, t + Math.min(0.65, dur * 0.3));
        gain.gain.setValueAtTime(noteVel * 0.85, t + dur * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(filt);
        filt.connect(gain);
        gain.connect(self.bgmGain);

        osc.start(t);
        osc.stop(t + dur + 0.05);
      } catch (e) {}
    });
  },

  voiceBell: function (freq, t, dur, vel) {
    try {
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const env = this.ctx.createGain();

      carrier.type = "sine";
      mod.type = "sine";
      const ratio = this.timbre === "zen" ? 2.756 : 2.0;
      carrier.frequency.setValueAtTime(freq, t);
      mod.frequency.setValueAtTime(freq * ratio, t);

      modGain.gain.setValueAtTime(freq * 0.85, t);
      modGain.gain.exponentialRampToValueAtTime(1.0, t + 0.25);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vel, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      env.connect(this.bgmGain);

      carrier.start(t);
      mod.start(t);
      carrier.stop(t + dur + 0.04);
      mod.stop(t + dur + 0.04);
    } catch (e) {}
  },

  voiceDrum: function (kind, t, vel) {
    if (this.muted || !this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      if (kind === "deep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(108, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.16);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vel, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(t);
        osc.stop(t + 0.28);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(760, t);
        osc.frequency.exponentialRampToValueAtTime(420, t + 0.045);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vel, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(t);
        osc.stop(t + 0.065);
      }
    } catch (e) {}
  },

  // Harmonically tuned SFX (in D Major / B Minor so every click blends musically!)
  tone: function (freq, duration, type, gainVal, delaySec) {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime + (delaySec || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainVal || 0.08, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      if (this.reverb && duration >= 0.25) gain.connect(this.reverb);
      osc.onended = function () {
        try { osc.disconnect(); gain.disconnect(); } catch (e) {}
      };
      osc.start(now);
      osc.stop(now + duration + 0.03);
    } catch (e) {}
  },
  playNight: function () {
    // Deep B-minor singing bowl gong
    this.tone(midiToFreq(47), 1.2, "sine", 0.14, 0);
    this.tone(midiToFreq(54), 1.0, "triangle", 0.08, 0.08);
    this.tone(midiToFreq(62), 0.9, "sine", 0.06, 0.18);
  },
  playDawn: function () {
    // Radiant Dadd9 pentatonic harp flourish
    const notes = [62, 64, 66, 69, 74];
    const self = this;
    notes.forEach(function (m, i) { self.tone(midiToFreq(m), 0.55, "triangle", 0.09, i * 0.07); });
  },
  playSpeak: function () {
    this.tone(midiToFreq(69), 0.09, "triangle", 0.05, 0);
  },
  playBlessing: function () {
    // Warm Dmaj9 shimmer
    const self = this;
    [62, 66, 69, 73, 76].forEach(function (m, i) { self.tone(midiToFreq(m), 0.5, "triangle", 0.075, i * 0.055); });
  },
  playVote: function () {
    if (this.muted || !this.ctx) return;
    this.voiceDrum("deep", this.ctx.currentTime, 0.22);
    this.tone(midiToFreq(54), 0.24, "triangle", 0.09, 0.02);
  },
  playHunterShot: function () {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.voiceDrum("deep", t0, 0.34);
    this.voiceDrum("deep", t0 + 0.16, 0.24);
    this.tone(midiToFreq(74), 0.16, "sawtooth", 0.08, 0);
    this.tone(midiToFreq(62), 0.45, "triangle", 0.13, 0.05);
    this.tone(midiToFreq(50), 0.72, "sine", 0.16, 0.12);
    this.tone(midiToFreq(69), 0.55, "triangle", 0.08, 0.2);
  },
  playVoiceBlip: function (seatId) {
    this.playCozySyllable(seatId, 0, "啊", "");
  },
  // Distinct 3-note character musical motif + instrument timbre right before each character speaks!
  playVoiceSignature: function (personaName, mood) {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    try {
      const motifs = {
        "主持": { notes: [62, 69],      wave: "sine",     step: 0.08, lp: 2100 },
        "你":   { notes: [64, 71],      wave: "triangle", step: 0.07, lp: 2200 },
        "你_男": { notes: [55, 62],     wave: "triangle", step: 0.07, lp: 1700 },
        "小澄": { notes: [60, 67, 72],  wave: "triangle", step: 0.055, lp: 2600 }, // Crisp analytical pulse
        "暖暖": { notes: [65, 69, 72],  wave: "sine",     step: 0.085, lp: 1900 }, // Warm teacup chime
        "阿松": { notes: [50, 55, 57],  wave: "triangle", step: 0.09,  lp: 1200 }, // Deep mountain woodblock
        "星兒": { notes: [76, 81, 83],  wave: "sine",     step: 0.055, lp: 3200 }, // Sparkling celesta
        "小雲": { notes: [69, 76, 81],  wave: "triangle", step: 0.05,  lp: 2700 }, // Crisp news chime
        "阿竹": { notes: [62, 67, 71],  wave: "sine",     step: 0.085, lp: 1850 }, // Airy bamboo flute
        "晨晨": { notes: [64, 68, 71],  wave: "triangle", step: 0.052, lp: 2800 }, // Sporty upward triad
        "墨白": { notes: [45, 52, 48],  wave: "triangle", step: 0.105, lp: 950  }, // Solemn deep guqin bass
        "晴嵐": { notes: [69, 71, 76],  wave: "sine",     step: 0.078, lp: 2500 }, // Graceful guzheng cascade
        "阿朗": { notes: [57, 64, 69],  wave: "triangle", step: 0.048, lp: 2400 }, // Assertive debate tap
        "柚子": { notes: [74, 78, 81],  wave: "sine",     step: 0.055, lp: 3000 }  // Sweet bouncy kalimba
      };
      const spec = motifs[personaName] || motifs["主持"];
      const now = this.ctx.currentTime;
      const vol = Math.max(0.02, Math.min(0.075, voice.volume * 0.065));
      const self = this;
      spec.notes.forEach(function (midi, idx) {
        const t = now + idx * (mood === "panic" ? spec.step * 0.78 : spec.step);
        const freq = midiToFreq(midi + (mood === "panic" ? 1 : 0));
        const osc = self.ctx.createOscillator();
        const filt = self.ctx.createBiquadFilter();
        const gain = self.ctx.createGain();
        osc.type = idx === 0 ? spec.wave : "sine";
        osc.frequency.setValueAtTime(freq, t);
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(Math.min(spec.lp, freq * 2.8), t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol * (idx === spec.notes.length - 1 ? 1.0 : 0.85), t + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(self.sfxGain);
        if (self.reverb) gain.connect(self.reverb);
        osc.start(t);
        osc.stop(t + 0.27);
      });
    } catch (e) {}
  },
  // Studio-Velvet Acoustic Voice Synth (Zero harsh sawtooth! Pure dual-harmonic warm instruments + speech contour!)
  playCozySyllable: function (seatId, charCode, charText, nextChar) {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    if (charText && /^[\s，。！？、；：「」『』（）()—…·・\-~]$/.test(charText)) return;
    try {
      // 8 distinct velvety acoustic voices (Warm Harp / Wooden Kalimba / Bamboo Flute / Velvet Cello / Crystal Celesta / Music Box / Serene Guzheng / Warm Nylon)
      const instrs = [
        { root: 62, wave: "triangle", overtone: 2.0, oMix: 0.16, lp: 1850, dur: 0.135 }, // 1 你: Warm Harp
        { root: 57, wave: "sine",     overtone: 2.0, oMix: 0.20, lp: 1450, dur: 0.12  }, // 2 小澄: Wooden Kalimba
        { root: 67, wave: "sine",     overtone: 1.5, oMix: 0.12, lp: 1900, dur: 0.155 }, // 3 暖暖: Soft Bamboo Flute
        { root: 50, wave: "triangle", overtone: 2.0, oMix: 0.18, lp: 1050, dur: 0.16  }, // 4 阿松: Velvet Cello
        { root: 72, wave: "sine",     overtone: 2.0, oMix: 0.14, lp: 2300, dur: 0.13  }, // 5 星兒: Crystal Celesta
        { root: 69, wave: "triangle", overtone: 2.0, oMix: 0.12, lp: 2100, dur: 0.125 }, // 6 小雲: Delicate Music Box
        { root: 55, wave: "triangle", overtone: 1.5, oMix: 0.15, lp: 1650, dur: 0.165 }, // 7 阿竹: Serene Guzheng
        { root: 60, wave: "triangle", overtone: 2.0, oMix: 0.17, lp: 1550, dur: 0.125 }  // 8 晨晨: Warm Nylon Guitar
      ];
      const cfg = instrs[((seatId || 1) - 1) % instrs.length];
      const scaleOffsets = [0, 2, 4, 7, 9, 12];
      let stepIdx = Math.abs((charCode || 0) + (seatId || 1) * 3) % scaleOffsets.length;
      let pitchBend = 1.0;
      if (nextChar === "？" || nextChar === "?") {
        stepIdx = Math.min(scaleOffsets.length - 1, stepIdx + 2);
        pitchBend = 1.045;
      } else if (nextChar === "。" || nextChar === "，") {
        stepIdx = Math.max(0, stepIdx - 1);
        pitchBend = 0.985;
      } else if (nextChar === "！" || nextChar === "!") {
        pitchBend = 1.025;
      }
      const baseFreq = midiToFreq(cfg.root + scaleOffsets[stepIdx]) * (0.995 + Math.random() * 0.01);
      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const o2Gain = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = cfg.wave;
      osc1.frequency.setValueAtTime(baseFreq * 0.99, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * pitchBend, now + cfg.dur * 0.65);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * cfg.overtone, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * cfg.overtone * pitchBend, now + cfg.dur * 0.65);
      o2Gain.gain.value = cfg.oMix;

      filt.type = "lowpass";
      filt.frequency.setValueAtTime(cfg.lp, now);
      filt.Q.value = 0.85;

      const vScale = Math.max(0.018, Math.min(0.088, voice.volume * 0.075));
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vScale, now + 0.016);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);

      osc1.connect(filt);
      osc2.connect(o2Gain);
      o2Gain.connect(filt);
      filt.connect(gain);
      if (this.voicePanner && typeof this.ctx.createStereoPanner === "function" && typeof stage3d !== "undefined" && stage3d.isActive()) {
        const pNode = this.ctx.createStereoPanner();
        pNode.pan.value = stage3d.computeSeatPan(seatId);
        gain.connect(pNode);
        pNode.connect(this.sfxGain);
      } else {
        gain.connect(this.sfxGain);
      }
      if (this.reverb) gain.connect(this.reverb);
      this.cozyMouthPulse = 0.88;

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + cfg.dur + 0.02);
      osc2.stop(now + cfg.dur + 0.02);
    } catch (e) {}
  },
  playCardRustle: function () {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.055);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8) * 0.18;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 1850;
      filt.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.sfxGain);
      src.start(now);
    } catch (e) {}
  },
  playRoleRevealFanfare: function (isWolf) {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime + 0.02;
      const self = this;
      if (isWolf) {
        // Enigmatic twilight taiko pulse + deep guqin minor cadence for Acid-Wolf faction reveal
        this.voiceDrum("deep", now, 0.24);
        [50, 53, 57, 58].forEach(function (midi, idx) {
          self.voicePluck(midiToFreq(midi), now + 0.05 + idx * 0.095, 0.95, 0.14);
        });
        this.voiceBell(midiToFreq(62), now + 0.34, 1.35, 0.06);
      } else {
        // Luminous pentatonic guzheng glissando + resonant bronze singing bowl for Academy Good faction reveal
        [62, 66, 69, 71, 74].forEach(function (midi, idx) {
          self.voicePluck(midiToFreq(midi), now + idx * 0.068, 1.05, 0.14);
        });
        this.voiceBell(midiToFreq(74), now + 0.22, 1.85, 0.10);
        this.voiceBell(midiToFreq(81), now + 0.34, 1.55, 0.065);
      }
    } catch (e) {}
  },
  playWin: function (goodWon) {
    const seq = goodWon ? [62, 66, 69, 74, 78] : [59, 57, 54, 50, 47];
    const self = this;
    seq.forEach(function (m, i) { self.tone(midiToFreq(m), 0.65, "triangle", 0.1, i * 0.11); });
  }
};
