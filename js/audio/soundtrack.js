/**
 * Web Audio 多聲部合成器、空間殘響、音序器與互動音效引擎
 */
"use strict";

const PERSONA_AUDIO_EQ = {
  "主持":  { lowFreq: 190, lowGain: 1.0,  midFreq: 950,  midGain: 0.4,  presFreq: 3000, presGain: 0.6, highFreq: 6800, highGain: -1.0, revSend: 0.14, gainTrim: 0.98, twRateMul: 1.00 },
  "你":    { lowFreq: 200, lowGain: 0.6,  midFreq: 1000, midGain: 0.2,  presFreq: 3100, presGain: 0.8, highFreq: 6600, highGain: -0.8, revSend: 0.04, gainTrim: 1.00, twRateMul: 1.00 },
  "你_男": { lowFreq: 185, lowGain: 0.8,  midFreq: 860,  midGain: 0.4,  presFreq: 2800, presGain: 0.8, highFreq: 6400, highGain: -1.0, revSend: 0.05, gainTrim: 1.01, twRateMul: 1.00 },
  "小澄":  { lowFreq: 215, lowGain: -1.2, midFreq: 1180, midGain: 0.9,  presFreq: 3500, presGain: 1.6, highFreq: 6800, highGain: -0.5, revSend: 0.04, gainTrim: 0.98, twRateMul: 1.045 },
  "暖暖":  { lowFreq: 220, lowGain: 0.8,  midFreq: 920,  midGain: 0.3,  presFreq: 2900, presGain: 0.5, highFreq: 7500, highGain: 0.9,  revSend: 0.07, gainTrim: 0.96, twRateMul: 0.98 },
  "阿松":  { lowFreq: 165, lowGain: 2.2,  midFreq: 640,  midGain: 0.9,  presFreq: 2400, presGain: 0.4, highFreq: 5500, highGain: -1.6, revSend: 0.06, gainTrim: 1.04, twRateMul: 0.935 },
  "星兒":  { lowFreq: 230, lowGain: -0.8, midFreq: 1150, midGain: 0.3,  presFreq: 3900, presGain: 1.2, highFreq: 7600, highGain: 0.8,  revSend: 0.05, gainTrim: 0.95, twRateMul: 1.04 },
  "小雲":  { lowFreq: 215, lowGain: -0.5, midFreq: 1050, midGain: 0.6,  presFreq: 2800, presGain: 1.3, highFreq: 6400, highGain: -1.0, revSend: 0.04, gainTrim: 0.99, twRateMul: 1.02 },
  "阿竹":  { lowFreq: 195, lowGain: 1.1,  midFreq: 720,  midGain: 1.2,  presFreq: 2700, presGain: 0.4, highFreq: 6000, highGain: -1.2, revSend: 0.09, gainTrim: 1.00, twRateMul: 0.965 },
  "晨晨":  { lowFreq: 210, lowGain: 0.3,  midFreq: 1080, midGain: 0.8,  presFreq: 3650, presGain: 1.8, highFreq: 7200, highGain: -0.2, revSend: 0.05, gainTrim: 1.02, twRateMul: 1.06 },
  "墨白":  { lowFreq: 155, lowGain: 2.5,  midFreq: 580,  midGain: 0.8,  presFreq: 2250, presGain: 0.5, highFreq: 5200, highGain: -1.8, revSend: 0.08, gainTrim: 1.03, twRateMul: 0.92 },
  "晴嵐":  { lowFreq: 205, lowGain: 0.7,  midFreq: 960,  midGain: 0.5,  presFreq: 2950, presGain: 0.7, highFreq: 6900, highGain: -0.4, revSend: 0.08, gainTrim: 0.98, twRateMul: 0.96 },
  "阿朗":  { lowFreq: 190, lowGain: -0.4, midFreq: 1140, midGain: 1.1,  presFreq: 3450, presGain: 1.9, highFreq: 6700, highGain: -0.4, revSend: 0.04, gainTrim: 1.02, twRateMul: 1.055 },
  "柚子":  { lowFreq: 240, lowGain: -0.9, midFreq: 1220, midGain: 0.4,  presFreq: 4050, presGain: 1.3, highFreq: 7800, highGain: 1.0,  revSend: 0.05, gainTrim: 0.96, twRateMul: 1.05 }
};

const sound = {
  ctx: null,
  comp: null,
  analyser: null,
  bgmGain: null,
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
        this.sfxGain = this.ctx.createGain();
        this.reverb = this.buildHallReverb(2.1);
        const revReturn = this.ctx.createGain();
        revReturn.gain.value = 0.38;

        this.bgmGain.connect(this.comp);
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
        this.voiceDeEss.frequency.value = 6400;
        this.voiceDeEss.gain.value = -2.0;

        const vComp = this.ctx.createDynamicsCompressor();
        vComp.threshold.value = -18;
        vComp.knee.value = 16;
        vComp.ratio.value = 3.5;

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
        this.voiceRevSend.gain.value = 0.08;

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
        this.voiceRevSend.connect(this.reverb);

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

  applyPersonaVoiceChain: function (personaKey, mood, seatId) {
    if (!this.ctx) return;
    const eq = PERSONA_AUDIO_EQ[personaKey] || PERSONA_AUDIO_EQ["暖暖"];
    const now = this.ctx.currentTime;
    try {
      if (this.voiceLowShelf) {
        this.voiceLowShelf.frequency.setTargetAtTime(eq.lowFreq, now, 0.04);
        this.voiceLowShelf.gain.setTargetAtTime(eq.lowGain, now, 0.04);
      }
      if (this.voiceMidPeak) {
        this.voiceMidPeak.frequency.setTargetAtTime(eq.midFreq, now, 0.04);
        this.voiceMidPeak.gain.setTargetAtTime(eq.midGain, now, 0.04);
      }
      if (this.voicePresence) {
        this.voicePresence.frequency.setTargetAtTime(eq.presFreq, now, 0.04);
        this.voicePresence.gain.setTargetAtTime(eq.presGain + (mood === "accuse" ? 0.9 : 0), now, 0.04);
      }
      if (this.voiceDeEss) {
        this.voiceDeEss.frequency.setTargetAtTime(eq.highFreq, now, 0.04);
        this.voiceDeEss.gain.setTargetAtTime(eq.highGain, now, 0.04);
      }
      if (this.voiceRevSend) {
        const rev = mood === "host_night" ? Math.max(0.26, eq.revSend) : (mood === "last_words" ? Math.max(0.14, eq.revSend) : eq.revSend);
        this.voiceRevSend.gain.setTargetAtTime(rev, now, 0.04);
      }
      if (this.voiceOutGain) {
        this.voiceOutGain.gain.setTargetAtTime(clamp(0.92 * (eq.gainTrim || 1.0), 0.72, 1.15), now, 0.04);
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

  getVoiceVowelWeights: function (seatId, nowMs) {
    const amp = this.getVoiceMouthLevel();
    if (this.voiceAnalyser && this.voiceFreqData && typeof voice !== "undefined" && voice.activeAudioNode) {
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
    const isSpeaking = Boolean((typeof voice !== "undefined" && voice.speaking) || (typeof state !== "undefined" && state.typewriter && state.typewriter.active));
    if (!isSpeaking && amp <= 0.01) {
      return { a: 0, i: 0, u: 0, e: 0, o: 0, amp: 0 };
    }
    const t = (nowMs || 0) * 0.001;
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
    if (this.voiceAnalyser && this.voiceAnalyserData && voice.activeAudioNode) {
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
    const duckMul = this.voiceDucking ? 0.22 : 1.0;
    const rampSec = this.voiceDucking ? 0.14 : 0.48;
    this.bgmGain.gain.setTargetAtTime(this.muted ? 0.0001 : Math.max(0.0001, this.bgmVol * 0.52 * duckMul), now, rampSec);
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0.0001 : Math.max(0.0001, this.sfxVol * 0.82), now, 0.06);
    this.updateEqIndicator();
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
    if (p === "DAY_VOTE" || p === "DAY_VOTE_RESULT" || p === "HUNTER_TRIGGER") return "vote";
    if (p === "GAME_OVER") return "finale";
    return "day";
  },

  syncWithPhase: function () {
    const next = this.resolveTargetTrack();
    if (next !== this.currentTrack) {
      this.currentTrack = next;
      this.stepIdx = 0;
      this.barIdx = 0;
      if (this.seqTimer) {
        this.startSequencer();
      }
    }
    this.refreshMusicModalLabels();
  },

  refreshMusicModalLabels: function () {
    const mv = MOVEMENTS[this.currentTrack] || MOVEMENTS.twilight;
    const np = document.getElementById("nowPlayingLabel");
    const ch = document.getElementById("musicChordReadout");
    const bp = document.getElementById("musicBpmReadout");
    if (np) np.textContent = "正在播放：" + mv.name + (this.trackMode === "auto" ? "（自動跟隨）" : "（手動試聽）");
    if (ch) ch.textContent = mv.chordsLabel;
    if (bp) bp.textContent = mv.bpm + " BPM";
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
    const mv = MOVEMENTS[this.currentTrack] || MOVEMENTS.twilight;
    const eighthMs = Math.round((60 / mv.bpm) * 500);
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
    const now = this.ctx.currentTime + 0.02;
    const bar = this.barIdx % 4;
    const step = this.stepIdx % 8;
    const stepDur = (60 / mv.bpm) * 0.5;

    // 1. Trigger warm extended Pad Chord on step 0 of every bar
    if (step === 0 && mv.pads[bar]) {
      this.voicePad(mv.pads[bar], now, stepDur * 7.8, this.currentTrack === "night" ? 0.11 : 0.09);
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
      if (this.reverb) gain.connect(this.reverb);

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
        if (self.reverb) gain.connect(self.reverb);

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
      if (this.reverb) env.connect(this.reverb);

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
  // Delicate 2-note acoustic signature motif right before each character speaks!
  playVoiceSignature: function (personaName, mood) {
    if (this.muted || !this.ctx || !this.sfxGain) return;
    try {
      const motifs = {
        "主持": [62, 69],
        "你":   [64, 71],
        "你_男": [55, 62],
        "小澄": [57, 64],
        "暖暖": [67, 74],
        "阿松": [50, 57],
        "星兒": [74, 81],
        "小雲": [69, 76],
        "阿竹": [55, 62],
        "晨晨": [62, 66]
      };
      const pair = motifs[personaName] || [62, 69];
      const now = this.ctx.currentTime;
      const vol = Math.max(0.015, Math.min(0.065, voice.volume * 0.055));
      const self = this;
      pair.forEach(function (midi, idx) {
        const t = now + idx * (mood === "panic" ? 0.055 : 0.075);
        const freq = midiToFreq(midi + (mood === "panic" ? 1 : 0));
        const osc = self.ctx.createOscillator();
        const filt = self.ctx.createBiquadFilter();
        const gain = self.ctx.createGain();
        osc.type = idx === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, t);
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(Math.min(2400, freq * 2.6), t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol * (idx === 0 ? 0.85 : 1.0), t + 0.016);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(self.sfxGain);
        if (self.reverb) gain.connect(self.reverb);
        osc.start(t);
        osc.stop(t + 0.26);
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
  playWin: function (goodWon) {
    const seq = goodWon ? [62, 66, 69, 74, 78] : [59, 57, 54, 50, 47];
    const self = this;
    seq.forEach(function (m, i) { self.tone(midiToFreq(m), 0.65, "triangle", 0.1, i * 0.11); });
  }
};
