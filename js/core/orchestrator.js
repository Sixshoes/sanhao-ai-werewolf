/**
 * 雙核四層總控編排器（Game & Multi-Agent AI Orchestrator）
 * 1. MatchDirector + matchEpoch 世代令牌與具名計時器池（杜絕重開殘留／舊回呼污染）
 * 2. 四大專業 AI 代理路由器（PersonaAgent・ThreeGoodGuardianAgent・QingmingDirectorAgent・GodViewAnalystAgent）
 * 3. 三好文化合規過濾閘道（自動淨化暗黑暴力與攻擊字眼）＋三層自動降級鏈（Pro → Flash → 本地引擎）
 * 4. Event Bus 感官編舞＋清茗茶席突發事件導演系統＋評審可視化即時編排軌跡（Orchestrator Trace）
 */
"use strict";

const TEA_DIRECTOR_EVENTS = [
  {
    id: "boba_truce",
    shortTitle: "學長請喝冬瓜青",
    title: "🍵 清茗插播・學長請喝冬瓜青",
    desc: "暖飲撫慰人心！本輪好話或 AI 轉好話說服力額外 +25%，友善度雙倍回升！",
    badge: "說服+25%"
  },
  {
    id: "anonymous_wall",
    shortTitle: "匿名牆截圖流傳",
    title: "📱 清茗插播・書院匿名牆截圖流傳",
    desc: "匿名謠言讓心虛者心跳加速（酸民狼心虛值 +10）；抓包酸言或記筆記額外連擊 +1！",
    badge: "破綻加倍"
  },
  {
    id: "mountain_mist",
    shortTitle: "林美山起霧求真",
    title: "🌫️ 清茗插播・林美山嵐起霧了",
    desc: "本輪若合力把全場友善度推上 80，清茗將搖響銅鈴吹散山嵐，並免費點亮 1 瓣三好蓮花！",
    badge: "友善80賞蓮"
  },
  {
    id: "tea_master_blessing",
    shortTitle: "清茗奉茶公道席",
    title: "🏮 清茗插播・奉茶見證公道席",
    desc: "清茗親臨監票！本輪公投若投中真正的酸民狼，全場友善度額外 +12 並全席喝采！",
    badge: "投狼+12友善"
  },
  {
    id: "truth_lantern",
    shortTitle: "照妖古燈觀微",
    title: "🏮 清茗插播・林美山點亮照妖古燈",
    desc: "古燈破迷霧！今日「靜心觀微」可用次數提升為 2 次，且必顯示精準心虛讀數（0 誤差）！",
    badge: "觀微×2"
  },
  {
    id: "harmony_feast",
    shortTitle: "書院茶點連擊",
    title: "🍡 清茗插播・書院同樂茶點時間",
    desc: "氣氛熱絡！今日每次成功抓包酸言或邏輯矛盾，連擊額外 +2、全場友善度額外 +5！",
    badge: "連擊×2"
  },
  {
    id: "kind_word_duel",
    shortTitle: "好話接龍茶會",
    title: "🌸 清茗插播・林美山好話接龍茶會",
    desc: "說好話更有力量！今天玩家發出正向好話說服力額外 +10，並免費點亮 1 瓣未亮的三好蓮花！",
    badge: "好話賞蓮"
  },
  {
    id: "fourg_echo",
    shortTitle: "四給雙倍共鳴",
    title: "🎴 清茗插播・四給雙倍共鳴祭",
    desc: "吉時相映！今日每施放任意一張「四給」錦囊卡牌，額外恢復全場 +10 友善度並讓清茗喝采！",
    badge: "四給+10友善"
  }
];

const orchestrator = {
  matchEpoch: 0,
  timers: {},
  listeners: {},
  traces: [],
  traceSeq: 0,
  maxTraces: 32,
  choreographyBound: false,
  stats: {
    dispatches: 0,
    geminiHits: 0,
    heuristicHits: 0,
    complianceFiltered: 0
  },

  beginNewEpoch: function (reason) {
    this.matchEpoch += 1;
    this.clearAllTimers();
    if (typeof state !== "undefined" && state.match) {
      state.match.activeDirectorEvent = null;
      state.match.directorEventClearedDay = 0;
    }
    this.recordTrace({
      agent: "MatchDirector",
      tier: "FSM",
      ms: 0,
      compliance: true,
      summary: "啟動新世代 #" + this.matchEpoch + "（" + (reason || "reset") + "）"
    });
    this.emit("match:epoch", { epoch: this.matchEpoch, reason: reason || "reset" });
    return this.matchEpoch;
  },

  isEpochValid: function (ep) {
    return ep === this.matchEpoch;
  },

  schedule: function (key, fn, ms) {
    this.clearTimer(key);
    if (typeof fn !== "function") return null;
    const ep = this.matchEpoch;
    const self = this;
    const tid = setTimeout(function () {
      if (self.timers[key] === tid) delete self.timers[key];
      if (!self.isEpochValid(ep)) return;
      fn();
    }, Math.max(0, ms || 0));
    this.timers[key] = tid;
    return tid;
  },

  clearTimer: function (key) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      delete this.timers[key];
    }
  },

  clearAllTimers: function () {
    const self = this;
    Object.keys(this.timers).forEach(function (k) {
      clearTimeout(self.timers[k]);
      delete self.timers[k];
    });
  },

  on: function (eventName, fn) {
    if (!eventName || typeof fn !== "function") return;
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(fn);
  },

  emit: function (eventName, payload) {
    const list = this.listeners[eventName];
    if (!list || !list.length) return;
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](payload);
      } catch (e) {}
    }
  },

  recordTrace: function (entry) {
    this.traceSeq += 1;
    const now = new Date();
    const pad = function (n) { return n < 10 ? ("0" + n) : String(n); };
    const ts = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    const rec = {
      seq: this.traceSeq,
      time: ts,
      day: (typeof state !== "undefined" && state.match) ? (state.match.day || 0) : 0,
      epoch: this.matchEpoch,
      agent: entry.agent || "Orchestrator",
      tier: entry.tier || "Local",
      ms: Math.max(0, Math.round(Number(entry.ms) || 0)),
      compliance: entry.compliance !== false,
      summary: String(entry.summary || "")
    };
    this.traces.unshift(rec);
    if (this.traces.length > this.maxTraces) {
      this.traces.length = this.maxTraces;
    }
    if (typeof renderOrchestratorTracePanel === "function") {
      const m = typeof el === "function" ? el("modalGuide") : null;
      if (m && m.classList && !m.classList.contains("hidden")) {
        renderOrchestratorTracePanel();
      }
    }
    return rec;
  },

  clearTraces: function () {
    this.traces = [];
    if (typeof renderOrchestratorTracePanel === "function") renderOrchestratorTracePanel();
  },

  sanitizeAgentSpeech: function (rawText) {
    const orig = String(rawText || "");
    let cleaned = orig
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();

    const rules = [
      [/毒死|毒藥|下毒/g, "清心茶"],
      [/解藥/g, "暖心回甘茶"],
      [/女巫/g, "滴水奉茶師"],
      [/首刀|刀掉|刀了/g, "鎖定目標"],
      [/被刀/g, "被鎖定"],
      [/殺掉|殺了|殺死/g, "請離"],
      [/白癡|智障|垃圾|去死|滾蛋|閉嘴|低能|廢物/g, "先冷靜一下"]
    ];
    let filtered = false;
    rules.forEach(function (pair) {
      const next = cleaned.replace(pair[0], pair[1]);
      if (next !== cleaned) {
        filtered = true;
        cleaned = next;
      }
    });
    if (filtered) this.stats.complianceFiltered += 1;
    return { text: cleaned, filtered: filtered };
  },

  rollDailyTeaEvent: function (day) {
    if (typeof state === "undefined" || !state.match || !state.match.started) return null;
    if (!Array.isArray(state.match.usedDirectorEventIds)) state.match.usedDirectorEventIds = [];
    const used = state.match.usedDirectorEventIds;
    let pool = TEA_DIRECTOR_EVENTS.filter(function (ev) { return used.indexOf(ev.id) === -1; });
    if (pool.length === 0) {
      state.match.usedDirectorEventIds = [];
      pool = TEA_DIRECTOR_EVENTS.slice();
    }

    let picked = null;
    if ((state.match.harmonyScore || 70) < 76) {
      picked = pool.find(function (ev) { return ev.id === "mountain_mist" || ev.id === "boba_truce"; }) || null;
    }
    if (!picked) {
      picked = pool[Math.floor(Math.random() * pool.length)] || TEA_DIRECTOR_EVENTS[0];
    }

    state.match.activeDirectorEvent = picked;
    state.match.directorEventClearedDay = 0;
    state.match.usedDirectorEventIds.push(picked.id);

    if (picked.id === "anonymous_wall") {
      (state.match.seats || []).forEach(function (s) {
        if (s.alive && s.role === "wolf" && s.id !== getPlayerId()) {
          s.microPulse = clamp((s.microPulse || 70) + 10, 58, 98);
        }
      });
    }

    if (typeof addLog === "function") {
      addLog({ kind: "blessing", title: picked.title, text: picked.desc });
    }
    if (typeof showToast === "function") {
      showToast(picked.title + "｜" + picked.badge, "emerald");
    }
    this.recordTrace({
      agent: "QingmingDirectorAgent",
      tier: "EventDirector",
      ms: 1,
      compliance: true,
      summary: "第 " + (day || state.match.day) + " 天茶席事件：" + picked.shortTitle + "（" + picked.badge + "）"
    });
    this.emit("director:event", { event: picked, day: day || state.match.day });
    return picked;
  },

  canUseDirectorEventAction: function () {
    if (typeof state === "undefined" || !state.match || !state.match.started) return false;
    if (typeof isClassicSimpleMode === "function" && isClassicSimpleMode()) return false;
    if (!state.match.activeDirectorEvent) return false;
    if ((state.match.directorEventInteractedDay || 0) === state.match.day) return false;
    const pSelf = typeof getPlayerSeat === "function" ? getPlayerSeat() : null;
    if (!pSelf || !pSelf.alive) return false;
    const ph = state.match.phase;
    return ph === "DAY_SPEECH" || ph === "DAY_PLAYER_TURN";
  },

  triggerDirectorEventChoice: function (optionKey) {
    if (!this.canUseDirectorEventAction()) return false;
    const ev = state.match.activeDirectorEvent;
    const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
    const aliveOthers = (typeof getAliveSeats === "function" ? getAliveSeats() : []).filter(function (s) { return s.id !== pid; });
    if (!aliveOthers.length) return false;

    state.match.directorEventInteractedDay = state.match.day;
    if (typeof sound !== "undefined" && typeof sound.playBlessing === "function") sound.playBlessing();

    if (ev.id === "boba_truce") {
      const target = (typeof getSeat === "function" && state.selectedSeatId && state.selectedSeatId !== pid)
        ? getSeat(state.selectedSeatId)
        : null;
      const pick = (target && target.alive) ? target : aliveOthers[0];
      pick.suspicionMap[pid] = clamp((pick.suspicionMap[pid] || 50) - 12, 5, 95);
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 8, 0, 100);
      if (typeof spawnBeam === "function") spawnBeam(pid, pick.id, "#34d399", "trust", 720);
      if (typeof setSeatEmotion === "function") setSeatEmotion(pick.id, "happy", 2800);
      if (typeof setSeatBubble === "function") setSeatBubble(pick.id, "謝啦這杯冬瓜青超順口！感覺你態度很穩耶！", "trust", 3400);
      if (typeof spawnFx === "function") spawnFx(pick.id, "🍵 冬瓜青暖場 +8!", "#34d399");
      if (typeof addLog === "function") addLog({ kind: "blessing", title: "🍵 請喝冬瓜青：贈予 0" + pick.id + "號 " + pick.name + "，全場友善度 +8！", text: "" });
      if (typeof showToast === "function") showToast("🍵 已請 0" + pick.id + "號喝冬瓜青！友善度 +8 並拉近信任！", "emerald");
    } else if (ev.id === "truth_lantern") {
      const half = optionKey === "back" ? "back" : "front";
      const mid = Math.ceil((state.match.totalSeats || 8) / 2);
      const sidePool = aliveOthers.filter(function (s) { return half === "front" ? s.id <= mid : s.id > mid; });
      const pool = sidePool.length > 0 ? sidePool : aliveOthers;
      pool.sort(function (a, b) { return (b.microPulse || 0) - (a.microPulse || 0); });
      const peak = pool[0];
      peak.sweatExposed = true;
      if (typeof spawnBeam === "function") spawnBeam(pid, peak.id, "#fbbf24", "emote", 780);
      if (typeof setSeatEmotion === "function") setSeatEmotion(peak.id, peak.microPulse >= 60 ? "nervous" : "shock", 3000);
      if (typeof spawnFx === "function") spawnFx(peak.id, "🏮 古燈照出 " + peak.microPulse + "%", "#fbbf24");
      if (typeof addLog === "function") addLog({ kind: "blessing", title: "🏮 照妖古燈掃描（" + (half === "front" ? "前排" : "後排") + "）：0" + peak.id + "號 " + peak.name + " 脈搏最高（" + peak.microPulse + "%）", text: "" });
      if (typeof showToast === "function") showToast("🏮 古燈照出 " + (half === "front" ? "前半席" : "後半席") + "最緊張對象：0" + peak.id + "號（心虛 " + peak.microPulse + "%）！", "emerald");
    } else {
      state.match.harmonyScore = clamp((state.match.harmonyScore || 70) + 10, 0, 100);
      if (typeof stage3d !== "undefined" && typeof stage3d.triggerHeroBeat === "function") stage3d.triggerHeroBeat("purify_cast", 2200);
      if (typeof addThreeGoodPoint === "function") addThreeGoodPoint("words", "共襄茶會");
      if (typeof spawnFx === "function") spawnFx(pid, "🔔 茶席響應 +10!", "#fde68a");
      if (typeof addLog === "function") addLog({ kind: "blessing", title: "🔔 茶席響應「" + ev.shortTitle + "」：全場友善度 +10！", text: "" });
      if (typeof showToast === "function") showToast("🔔 已響應今日茶席事件「" + ev.shortTitle + "」，全場友善度 +10！", "emerald");
    }

    if (typeof updateAllUI === "function") updateAllUI();
    return true;
  },

  checkMistChallengeClear: function () {
    if (typeof state === "undefined" || !state.match || !state.match.started || state.match.phase === "GAME_OVER") return false;
    const ev = state.match.activeDirectorEvent;
    if (!ev || ev.id !== "mountain_mist") return false;
    if (state.match.directorEventClearedDay === state.match.day) return false;
    if ((state.match.harmonyScore || 0) < 80) return false;

    state.match.directorEventClearedDay = state.match.day;
    const tg = state.match.threeGood || { heart: 0, words: 0, deeds: 0 };
    const rewardKind = tg.words === 0 ? "words" : (tg.heart === 0 ? "heart" : (tg.deeds === 0 ? "deeds" : "words"));

    if (typeof addThreeGoodPoint === "function") {
      addThreeGoodPoint(rewardKind, "吹散山嵐賞蓮");
    }
    if (typeof sound !== "undefined" && typeof sound.playBlessing === "function") {
      sound.playBlessing();
    }
    if (typeof triggerCutIn === "function") {
      triggerCutIn("☀️ 山嵐雲開・清茗賞蓮！", "友善度達 80，吹散林美山霧並免費點亮 1 瓣三好蓮花！", "emerald");
    }
    if (typeof addLog === "function") {
      addLog({ kind: "blessing", title: "☀️ 山嵐雲開：友善度達 80，清茗搖鈴免費點亮 1 瓣三好蓮花！", text: "" });
    }
    this.recordTrace({
      agent: "QingmingDirectorAgent",
      tier: "EventDirector",
      ms: 1,
      compliance: true,
      summary: "達成「林美山起霧求真」友善度 ≥ 80，免費點亮蓮花花瓣！"
    });
    this.emit("director:challenge_cleared", { eventId: "mountain_mist", rewardKind: rewardKind });
    return true;
  },

  dispatchAgent: async function (agentName, payload) {
    const p = payload || {};
    const ep = this.matchEpoch;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.stats.dispatches += 1;

    if (agentName === "PersonaAgent") {
      const speaker = p.speaker || { id: 0, name: "AI" };
      const generated = Object.assign({}, p.fallbackMeta || {});
      let tier = "本地多代理推理";
      let filtered = false;

      if (typeof state !== "undefined" && (typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel)) && typeof tryGenerateGeminiAiSpeech === "function") {
        const usedModel = typeof getActiveLlmLabel === "function" ? getActiveLlmLabel() : (state.geminiModel || "gemini-3.8-flash");
        const liveRes = await tryGenerateGeminiAiSpeech(speaker, generated);
        if (!this.isEpochValid(ep)) {
          return { epochValid: false, generated: generated, tier: tier, filtered: false };
        }
        const liveTxt = typeof liveRes === "string" ? liveRes : (liveRes && liveRes.text);
        if (liveTxt) {
          if (typeof syncGeminiSpeechMeta === "function") {
            syncGeminiSpeechMeta(speaker, generated, liveRes);
          } else {
            generated.text = liveTxt;
          }
          const san = this.sanitizeAgentSpeech(generated.text);
          generated.text = san.text || generated.text;
          filtered = san.filtered;
          tier = usedModel + (liveRes && liveRes.parsedJson ? " (JSON同步)" : "");
          this.stats.geminiHits += 1;
        } else {
          const sanFb = this.sanitizeAgentSpeech(generated.text);
          generated.text = sanFb.text || generated.text;
          filtered = sanFb.filtered;
          tier = (state.localLlmModel ? "Ollama逾時→本地保底" : "Gemini逾時→本地保底");
          this.stats.heuristicHits += 1;
        }
      } else {
        const sanLoc = this.sanitizeAgentSpeech(generated.text);
        generated.text = sanLoc.text || generated.text;
        filtered = sanLoc.filtered;
        this.stats.heuristicHits += 1;
      }

      const dt = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      const stance = generated.accuseId
        ? ("懷疑 0" + generated.accuseId + "號")
        : (generated.vouchId ? ("力挺 0" + generated.vouchId + "號") : "整理局勢");
      this.recordTrace({
        agent: "PersonaAgent",
        tier: tier,
        ms: dt,
        compliance: !filtered,
        summary: "0" + speaker.id + "號" + speaker.name + "｜立場：" + stance + (generated.claimSeer ? "［宣稱觀察員］" : "") + (filtered ? "［已合規淨化］" : "")
      });
      return { epochValid: this.isEpochValid(ep), generated: generated, tier: tier, filtered: filtered };
    }

    if (agentName === "ThreeGoodGuardianAgent") {
      const text = String(p.rawText || "").trim();
      const analysis = typeof analyzeThreeGoodSpeech === "function" ? analyzeThreeGoodSpeech(text) : { isToxic: false, seatMentions: [] };
      const pid = typeof getPlayerId === "function" ? getPlayerId() : 1;
      const targetNum = (analysis.seatMentions || []).find(function (n) { return n !== pid; }) || (typeof state !== "undefined" ? state.selectedSeatId : null) || 2;
      const targetSeat = typeof getSeat === "function" ? getSeat(targetNum) : null;
      const targetLabel = targetSeat ? (targetSeat.id + "號" + targetSeat.name) : (targetNum + "號");

      let outText = "";
      let tier = "三好槽位轉譯引擎";
      let filtered = false;

      if (typeof state !== "undefined" && (typeof isExternalLlmActive === "function" ? isExternalLlmActive() : Boolean(state.geminiApiKey || state.localLlmModel)) && text.length > 0 && typeof callGeminiText === "function") {
        const prompt = "把這句推理發言保留座位號碼，改寫成55到80字之間、溫和有禮、具三好精神（存好心說好話做好事）又有邏輯說服力的繁體中文口語推理（禁用刀殺毒與表情符號，只輸出一段話）：" + text;
        const live = await callGeminiText(prompt);
        if (!this.isEpochValid(ep)) {
          return { epochValid: false, text: text, analysis: analysis, tier: tier };
        }
        if (live) {
          const san = this.sanitizeAgentSpeech(live);
          outText = san.text;
          filtered = san.filtered;
          tier = typeof getActiveLlmLabel === "function" ? getActiveLlmLabel() : (state.geminiModel || "gemini-3.8-flash");
          this.stats.geminiHits += 1;
        }
      }

      if (!outText) {
        outText = (/信任|好人|保護|相信/.test(text) && !analysis.isToxic)
          ? ("我想溫和跟大家分享觀察，剛剛仔細聽完 " + targetLabel + " 的發言，覺得他的邏輯前後一致而且態度很誠懇，建議好人夥伴這輪先相信他，不要投錯人了！")
          : ("大家先別急著動氣，我們心平氣和來比對線索：我發現 " + targetLabel + " 剛剛的說法跟場上局勢有些矛盾，想溫和請教他能不能多說明一點，這輪建議先留意 " + targetLabel + "。");
        this.stats.heuristicHits += 1;
      }

      const dt = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      this.recordTrace({
        agent: "ThreeGoodGuardianAgent",
        tier: tier,
        ms: dt,
        compliance: !filtered,
        summary: "酸言檢測 " + ((analysis.toxicHits && analysis.toxicHits.length) || 0) + " 處 → 轉譯三好好話（1.5×說服暴擊就緒）"
      });
      if (this.isEpochValid(ep)) {
        this.emit("three_good:rewritten", { targetNum: targetNum, tier: tier });
      }
      return { epochValid: this.isEpochValid(ep), text: outText, analysis: analysis, tier: tier };
    }

    if (agentName === "QingmingDirectorAgent") {
      if (p.kind === "daily_event") {
        const ev = this.rollDailyTeaEvent(p.day);
        return { epochValid: this.isEpochValid(ep), event: ev };
      }
      this.recordTrace({
        agent: "QingmingDirectorAgent",
        tier: "EventDirector",
        ms: 1,
        compliance: true,
        summary: p.summary || "茶席節奏導覽與演出同步"
      });
      return { epochValid: this.isEpochValid(ep) };
    }

    if (agentName === "GodViewAnalystAgent") {
      const m = typeof state !== "undefined" ? state.match : {};
      const st = m.stats || {};
      const summary = {
        winnerTeam: p.winnerTeam || m.winner || "good",
        reason: p.reason || m.winReason || "",
        totalDispatches: this.stats.dispatches,
        geminiHits: this.stats.geminiHits,
        heuristicHits: this.stats.heuristicHits,
        complianceFiltered: this.stats.complianceFiltered,
        eventsTriggered: (m.usedDirectorEventIds || []).slice(),
        kindnessHighlight: "說好話 " + (st.goodWordsCount || 0) + " 次・轉譯暴擊 " + (st.rewritesUsed || 0) + " 次・最高連擊 " + (m.maxCombo || 0)
      };
      if (typeof state !== "undefined" && state.match) {
        state.match.orchestratorSummary = summary;
      }
      this.recordTrace({
        agent: "GodViewAnalystAgent",
        tier: "ReportSynth",
        ms: 1,
        compliance: true,
        summary: "終局戰報封存（總調度 " + summary.totalDispatches + " 次・" + summary.kindnessHighlight + "）"
      });
      return summary;
    }

    return { epochValid: this.isEpochValid(ep) };
  },

  bindSensoryChoreography: function () {
    if (this.choreographyBound) return;
    this.choreographyBound = true;
    const self = this;

    this.on("director:event", function () {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction("welcome_bow", 2600);
      }
    });
    this.on("three_good:rewritten", function () {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction("purify_cast", 3400);
      }
    });
    this.on("three_good:awakened", function () {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction("celebrate", 4200);
      }
    });
    this.on("director:challenge_cleared", function () {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction("purify_cast", 3600);
      }
    });
    this.on("clash:detected", function () {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction("gasp_react", 2600);
      }
    });
    this.on("match:ended", function (info) {
      if (typeof stage3d !== "undefined" && typeof stage3d.setHeroAction === "function") {
        stage3d.setHeroAction(info && info.winner === "good" ? "celebrate" : "gasp_react", 4800);
      }
    });
    this.on("harmony:changed", function () {
      self.checkMistChallengeClear();
    });
  }
};
