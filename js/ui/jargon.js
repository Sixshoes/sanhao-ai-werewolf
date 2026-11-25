/**
 * 茶席術語箋（v23.2）：狼人殺新手友善白話辭典、全介面細虛線標註與宣紙浮動釋義卡
 * - 桌機：滑鼠移上小底線（或鍵盤聚焦）立即浮現白話釋義，不影響原按鈕點擊
 * - 手機／平板：輕點帶小底線的術語即可查看白話釋義，再點他處或關閉鈕即收起
 * - 100% 靜態公開規則教育文字，絕不接觸任何未公開陣營狀態
 */
"use strict";

const WEREWOLF_JARGON_GLOSSARY = [
  // 一、查驗與身分
  {
    term: "查殺",
    category: "查驗與身分",
    plain: "「明心觀察員」宣稱昨晚查驗過某位茶友，確定他是酸民狼。",
    tip: "通常會號召全場優先投票請離他，但也要留意是否有人冒充觀察員。"
  },
  {
    term: "金水",
    category: "查驗與身分",
    plain: "「明心觀察員」宣稱昨晚查驗過某位茶友，確定他是清白好人。",
    tip: "好人通常先暫信金水，但仍要提防假觀察員發假金水拉票。"
  },
  {
    term: "銀水",
    category: "查驗與身分",
    plain: "「滴水奉茶師」昨晚用暖心回甘茶救回的對象，大機率是好人。",
    tip: "極少數高階局中，酸民狼可能刻意「自刀」來騙取銀水身分。"
  },
  {
    term: "悍跳",
    category: "查驗與身分",
    plain: "酸民狼故意假冒「明心觀察員」等神職搶先報假查驗，混淆好人視聽。",
    tip: "當兩人同時搶認觀察員時，細聽他們的發言邏輯與警徽流即可辨真假。"
  },
  {
    term: "對跳",
    category: "查驗與身分",
    plain: "場上有兩位茶友同時宣稱自己是同一個神職（例如雙觀察員）。",
    tip: "同一個神職整局只有一位，對跳的兩人之中必定藏著酸民狼。"
  },
  {
    term: "表水",
    category: "查驗與身分",
    plain: "透過講清自己的觀察、理由與立場，向全場證明自己是清白好人。",
    tip: "好人表水越具體誠懇，越不容易被誤當成替罪羊。"
  },
  {
    term: "詐身分",
    category: "查驗與身分",
    plain: "故意假裝自己有查驗情報或神職身分來試探他人反應，講完多會退水澄清。",
    tip: "上警競選時偶爾用來逼出緊張的酸民狼，但容易引起誤會。"
  },
  {
    term: "炸人",
    category: "查驗與身分",
    plain: "假裝報出某位茶友是狼來試探對方瞬間反應，試探完通常會馬上澄清退水。",
    tip: "屬於心理試探招式，並非真正的查驗結果。"
  },
  {
    term: "單邊",
    category: "查驗與身分",
    plain: "全場只有一位茶友跳出來認明心觀察員，沒有第二個人跟他對跳。",
    tip: "單邊觀察員可信度通常較高，但也可能是狼隊選擇深水不對跳。"
  },
  {
    term: "神職",
    category: "查驗與身分",
    plain: "擁有特殊技能的好人角色統稱（觀察員、奉茶師、糾察長、守衛、清心長老）。",
    tip: "若所有神職全數離席，酸民狼會直接達成「屠邊」獲勝。"
  },
  {
    term: "划水",
    category: "查驗與身分",
    plain: "發言空泛、不分析線索也不給明確立場，藉此躲避大家關注。",
    tip: "長期划水的人往往最難分辨好壞，常被大家重點追問。"
  },
  {
    term: "獵神",
    category: "查驗與身分",
    plain: "酸民狼暗中推測誰是真正的神職角色，方便入夜優先請離。",
    tip: "因此奉茶師、守衛等神職在白天常會先低調隱藏身分。"
  },

  // 二、警長與發言位次
  {
    term: "警徽流",
    category: "警長與位次",
    plain: "明心觀察員當選警長時預先約定的「查驗名單與暗號」——倒牌時把警徽交給名單首位代表他是好人（金水），改交下一位或撕毀則暗示首位是狼（查殺）。",
    tip: "即使觀察員夜裡出局無法開口，也能靠警徽去向把最新查驗傳給全場。"
  },
  {
    term: "上警",
    category: "警長與位次",
    plain: "第一天舉手參選「警長」，爭取公投 1.5 票權重與決定發言順序的權力。",
    tip: "明心觀察員通常會積極上警，好讓好人聽見最完整的查驗資訊。"
  },
  {
    term: "警上",
    category: "警長與位次",
    plain: "第一天舉手參選警長、在台上依序發言拉票的候選人席位。",
    tip: "警上候選人不能投警長票，由警下茶友聽完發言後投票選出警長。"
  },
  {
    term: "警下",
    category: "警長與位次",
    plain: "沒有舉手參選警長、坐在台下聆聽並擁有警長投票權的茶友。",
    tip: "警下投票結果（誰投給真觀察員、誰投給假觀察員）是極重要的推理線索。"
  },
  {
    term: "退水",
    category: "警長與位次",
    plain: "原本舉手上警競選，發言後或聽完他人發言主動放棄競選警長。",
    tip: "退水後不會當選警長，也不會擁有該輪警下投票權。"
  },
  {
    term: "跳飛",
    category: "警長與位次",
    plain: "警長離席時跳過第一警徽流對象、直接把警徽交給第二順位，藉此暗號告知前一位極可能是狼。",
    tip: "屬於觀察員留給好人的無聲查驗暗號。"
  },
  {
    term: "撕毀警徽",
    category: "警長與位次",
    plain: "警長離席時選擇銷毀警徽，本局不再有警長（若曾留警徽流，也常用來暗示第一目標是狼）。",
    tip: "當不確定場上誰能信任時，撕毀警徽可避免 1.5 票落入酸民狼手中。"
  },
  {
    term: "撕徽",
    category: "警長與位次",
    plain: "「撕毀警徽」的簡稱：警長離席時銷毀警徽不移交給任何人，也常作為查殺暗號。",
    tip: "銷毀後本局後續皆不再設有警長。"
  },
  {
    term: "吞警徽",
    category: "警長與位次",
    plain: "在警長尚未選出前，酸民狼於警上直接自爆中斷選舉，使本局直接失去警長職位。",
    tip: "狼隊常用此招阻止真觀察員拿到 1.5 票與警徽流。"
  },
  {
    term: "歸票",
    category: "警長與位次",
    plain: "由警長或可信好人於發言尾聲統整立場，號召大家把選票集中投向同一位最可疑對象。",
    tip: "集中歸票能避免好人分票，讓狼隊難以趁虛而入。"
  },
  {
    term: "前置位",
    category: "警長與位次",
    plain: "本輪發言順序排在較前面、還沒聽到多少人發言就得先開口的席位。",
    tip: "前置位資訊最少，通常先表態立場與直覺，留待後置位補充對照。"
  },
  {
    term: "後置位",
    category: "警長與位次",
    plain: "本輪發言順序排在較後面、已經聽完多數茶友陳詞才開口的席位。",
    tip: "後置位資訊最全，但若只會順著風向附和也容易惹人懷疑。"
  },
  {
    term: "末置位",
    category: "警長與位次",
    plain: "本輪壓軸最後一位發言的席位。",
    tip: "警長通常會安排自己壓軸在末置位，聽完所有人後做總結歸票。"
  },
  {
    term: "平票",
    category: "警長與位次",
    plain: "公投結果有兩位以上茶友並列最高票，無法立刻決定誰離席，會進入 PK 決選。",
    tip: "平票上的候選人可再次發言搶救拉票，由非平票者重投。"
  },
  {
    term: "PK",
    category: "警長與位次",
    plain: "平票決選：當公投出現同票最高時，同票候選人輪流再次陳詞拉票，再由其他人重投決定離席者。",
    tip: "若二次 PK 依然平票，當日則無人離席、直接入夜。"
  },

  // 三、推理與排坑
  {
    term: "狼坑",
    category: "推理與排坑",
    plain: "你推測可能是「酸民狼」的席位名單（例如 8 人局共有 2 個狼坑）。",
    tip: "把確定的好人排除後，剩下的席位自然就能框出狼坑。"
  },
  {
    term: "好人坑",
    category: "推理與排坑",
    plain: "你判斷屬於好人陣營、這輪暫時保護不投的席位名單。",
    tip: "記清楚自己認下的好人坑，有助於比對誰在說謊矛盾。"
  },
  {
    term: "排坑",
    category: "推理與排坑",
    plain: "綜合發言邏輯、查驗結果與歷輪票型，逐一排除好人、鎖定酸民狼席位的推理過程。",
    tip: "善用右上角「手札」的票型表，能一眼看出誰一直護航誰。"
  },
  {
    term: "站邊",
    category: "推理與排坑",
    plain: "場上有兩邊對立說法（例如雙觀察員對跳）時，公開表態相信並支持其中一方。",
    tip: "站邊後記得觀察投票是否一致，言行不一常是重大破綻。"
  },
  {
    term: "倒鉤",
    category: "推理與排坑",
    plain: "酸民狼故意站在真好人那邊，甚至投票幫踩自己的狼同伴，藉此博取全場信任。",
    tip: "好人後期若只剩一狼難找，常要回頭檢查「表現太完美」的倒鉤位。"
  },
  {
    term: "深水",
    category: "推理與排坑",
    plain: "不悍跳、不挑釁，發言溫和低調像好人般潛伏在人群中的酸民狼打法。",
    tip: "深水狼最難一眼抓出，需要從歷輪投票紀錄與站邊變化抽絲剝繭。"
  },
  {
    term: "抗推",
    category: "推理與排坑",
    plain: "好人中因發言失誤或被誤會，容易被推上公投台替酸民狼背鍋出局的對象。",
    tip: "狼隊白天常尋找好人裡的抗推位來轉移焦點。"
  },
  {
    term: "衝票",
    category: "推理與排坑",
    plain: "狼隊或特定一方把票全數集中灌給同一位目標，強行把他投離茶席。",
    tip: "開票時若發現幾個人毫無理由同步齊投同一好人，要高度警戒。"
  },
  {
    term: "分票",
    category: "推理與排坑",
    plain: "好人之間沒有共識，把選票分散投給不同對象，導致目標票數落後。",
    tip: "好人人數雖多，但一旦分票就容易被集中投票的狼隊翻盤。"
  },
  {
    term: "反水",
    category: "推理與排坑",
    plain: "前一天還公開力挺某位茶友，隔天卻突然反過來改打對方，前後立場大翻轉。",
    tip: "手札會標出跨日反水的對象，方便你追問他改口的理由。"
  },

  // 四、規則與夜間戰術
  {
    term: "同守同救",
    category: "規則與戰術",
    plain: "同一晚「護心守衛」守護的人，剛好也是「滴水奉茶師」端暖心茶救的人；兩股力量相衝反而破盾失效。",
    tip: "所以守衛與奉茶師通常會錯開保護，避免同守同救造成倒牌。"
  },
  {
    term: "破盾",
    category: "規則與戰術",
    plain: "因同晚「同守同救」互相抵銷，導致原本被保護的茶友仍然離席。",
    tip: "這是進階 8～12 人局中守衛與奉茶師最需默契配合的規則。"
  },
  {
    term: "平安夜",
    category: "規則與戰術",
    plain: "昨晚過去沒有任何人倒牌（可能被暖心茶救回，或被護心結界成功擋下）。",
    tip: "出現平安夜代表好人多賺了一輪白天推理與公投的機會。"
  },
  {
    term: "自刀",
    category: "規則與戰術",
    plain: "酸民狼夜晚故意鎖定自己人，想賭奉茶師端暖心茶救他，藉此偽裝成清白「銀水」。",
    tip: "風險極高，但一旦成功往往能大幅擾亂好人視角。"
  },
  {
    term: "自爆",
    category: "規則與戰術",
    plain: "酸民狼於白天主動亮出狼身分離席，立即中斷當日剩餘發言與公投，直接進入黑夜。",
    tip: "常在局勢危急或想切斷警徽流、阻止好人討論時使用。"
  },
  {
    term: "拂袖掀席",
    category: "規則與戰術",
    plain: "本遊戲中「酸民狼自爆」的茶席雅稱：亮牌離席並立刻中斷當日流程直入黑夜。",
    tip: "使用後不會有公投，直接跳入下一晚行動。"
  },
  {
    term: "首夜",
    category: "規則與戰術",
    plain: "對局開始的第一個夜晚；首夜倒牌的茶友天亮後通常可留下一次遺言。",
    tip: "第二夜起倒牌則沒有遺言，只能靠公投離席才可留遺言。"
  },
  {
    term: "遺言",
    category: "規則與戰術",
    plain: "首夜倒牌或白天遭公投離席時，離場前向全場留下的最後一段提醒與線索。",
    tip: "AI 茶友都會記住遺言內容，神職離席時別忘了交代關鍵資訊。"
  },
  {
    term: "狼刀在先",
    category: "規則與戰術",
    plain: "當好人與酸民狼人數相等或一刀即可清邊時，因夜晚由狼隊先行動，系統直接判狼隊獲勝。",
    tip: "代表好人必須把握每一輪白天公投，不能輕易棄票或投錯。"
  },
  {
    term: "屠邊",
    category: "規則與戰術",
    plain: "酸民狼的勝利條件之一：只要讓「所有神職」或「所有書院生（平民）」其中一邊全數離席即勝。",
    tip: "不需要把全部好人都淘汰，只要清光其中一邊就算屠邊。"
  },
  {
    term: "刀口",
    category: "規則與戰術",
    plain: "酸民狼在夜晚鎖定要令其離席的目標席位。",
    tip: "奉茶師若還有暖心茶，通常會先看到今晚的刀口對象。"
  }
];

const _JARGON_MAP = {};
const _JARGON_TERMS_SORTED = [];
WEREWOLF_JARGON_GLOSSARY.forEach(function (entry) {
  if (!entry || !entry.term) return;
  _JARGON_MAP[entry.term] = entry;
  _JARGON_TERMS_SORTED.push(entry.term);
});
_JARGON_TERMS_SORTED.sort(function (a, b) { return b.length - a.length; });

const _JARGON_REGEX_SRC = _JARGON_TERMS_SORTED.map(function (t) {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return /^[A-Za-z0-9]+$/.test(t) ? ("\\b" + esc + "\\b") : esc;
}).join("|");
const _JARGON_TEST_RE = new RegExp(_JARGON_REGEX_SRC);
const _JARGON_SPLIT_RE = new RegExp("(" + _JARGON_REGEX_SRC + ")", "g");

function lookupWerewolfJargon(term) {
  if (!term) return null;
  const key = String(term).trim();
  if (_JARGON_MAP[key]) return _JARGON_MAP[key];
  if (_JARGON_MAP[key.toUpperCase()]) return _JARGON_MAP[key.toUpperCase()];
  return null;
}

function annotateJargonPlainText(rawText) {
  const str = String(rawText == null ? "" : rawText);
  const escFn = typeof escapeHtml === "function"
    ? escapeHtml
    : function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  if (!str || !_JARGON_TEST_RE.test(str)) return escFn(str);

  let out = "";
  let last = 0;
  _JARGON_SPLIT_RE.lastIndex = 0;
  let m;
  while ((m = _JARGON_SPLIT_RE.exec(str)) !== null) {
    if (m.index > last) out += escFn(str.slice(last, m.index));
    const tok = m[0];
    const entry = lookupWerewolfJargon(tok);
    if (entry) {
      out += '<span class="jargon-term" data-jargon="' + escFn(entry.term) + '" tabindex="0" role="button" aria-label="術語：' + escFn(entry.term) + '">' + escFn(tok) + "</span>";
    } else {
      out += escFn(tok);
    }
    last = _JARGON_SPLIT_RE.lastIndex;
  }
  if (last < str.length) out += escFn(str.slice(last));
  return out;
}

const jargonTooltipState = {
  initialized: false,
  activeAnchor: null,
  activeTerm: "",
  pinned: false,
  openTimer: null,
  closeTimer: null,
  lastTouchTs: 0,
  observer: null,
  pendingRoots: [],
  scanTimer: null,
  isMutating: false
};

const _JARGON_SKIP_IDS = {
  jargonTooltipPopover: true,
  dragGestureHint: true,
  spotlightProgressBar: true,
  wolfTacticTimerLabel: true,
  blitzVoteTimerBadge: true,
  speechCharCounter: true,
  speakerVoiceWave: true,
  gpuPerfStatusLine: true
};

const _JARGON_SKIP_TAGS = {
  SCRIPT: true, STYLE: true, NOSCRIPT: true, INPUT: true, TEXTAREA: true,
  SELECT: true, OPTION: true, KBD: true, SVG: true, CANVAS: true, CODE: true, PRE: true
};

function _isNodeInsideSkippedJargonZone(node) {
  let cur = node && node.nodeType === 3 ? node.parentElement : node;
  while (cur && cur.tagName) {
    if (_JARGON_SKIP_TAGS[cur.tagName]) return true;
    if (cur.id && _JARGON_SKIP_IDS[cur.id]) return true;
    if (cur.id === "spotlightText" && typeof state !== "undefined" && state.typewriter && state.typewriter.active) {
      return true;
    }
    if (cur.classList && (
      cur.classList.contains("jargon-term") ||
      cur.classList.contains("clue-token") ||
      cur.classList.contains("ui-kbd") ||
      cur.classList.contains("seat-pill-name") ||
      cur.classList.contains("seat-pill-num-big") ||
      cur.classList.contains("tut-anim-stage") ||
      cur.classList.contains("tut-anim-card")
    )) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

function enhanceJargonInContainer(rootEl) {
  if (!rootEl || typeof document === "undefined" || typeof document.createTreeWalker !== "function") return 0;
  if (_isNodeInsideSkippedJargonZone(rootEl)) return 0;
  const fullTxt = rootEl.textContent || "";
  const txtSig = fullTxt.length + ":" + fullTxt.slice(0, 24) + ":" + fullTxt.slice(-24);
  if (rootEl._jargonLastSig === txtSig) return 0;
  if (!_JARGON_TEST_RE.test(fullTxt)) {
    rootEl._jargonLastSig = txtSig;
    return 0;
  }

  const walker = document.createTreeWalker(rootEl, 4, null);
  const textNodes = [];
  let n;
  while ((n = walker.nextNode()) !== null) {
    const val = n.nodeValue;
    if (!val || val.length < 2) continue;
    if (!_JARGON_TEST_RE.test(val)) continue;
    if (_isNodeInsideSkippedJargonZone(n)) continue;
    textNodes.push(n);
  }

  let wrappedCount = 0;
  jargonTooltipState.isMutating = true;
  try {
    textNodes.forEach(function (tNode) {
      const val = tNode.nodeValue || "";
      const parent = tNode.parentNode;
      if (!parent) return;
      const insideInteractiveBtn = Boolean(
        tNode.parentElement && typeof tNode.parentElement.closest === "function" &&
        tNode.parentElement.closest("button, a, summary")
      );
      _JARGON_SPLIT_RE.lastIndex = 0;
      let m;
      let last = 0;
      let changed = false;
      const frag = document.createDocumentFragment();
      while ((m = _JARGON_SPLIT_RE.exec(val)) !== null) {
        const tok = m[0];
        const entry = lookupWerewolfJargon(tok);
        if (!entry) continue;
        if (m.index > last) {
          frag.appendChild(document.createTextNode(val.slice(last, m.index)));
        }
        const sp = document.createElement("span");
        sp.className = "jargon-term";
        sp.setAttribute("data-jargon", entry.term);
        if (insideInteractiveBtn) {
          sp.setAttribute("data-jargon-inside-btn", "1");
        } else {
          sp.setAttribute("tabindex", "0");
          sp.setAttribute("role", "button");
        }
        sp.setAttribute("aria-label", "術語：" + entry.term);
        sp.textContent = tok;
        frag.appendChild(sp);
        wrappedCount += 1;
        changed = true;
        last = _JARGON_SPLIT_RE.lastIndex;
      }
      if (changed) {
        if (last < val.length) {
          frag.appendChild(document.createTextNode(val.slice(last)));
        }
        parent.replaceChild(frag, tNode);
      }
    });
  } finally {
    jargonTooltipState.isMutating = false;
  }
  rootEl._jargonLastSig = txtSig;
  return wrappedCount;
}

function positionJargonPopover(anchorEl) {
  const pop = el("jargonTooltipPopover");
  if (!pop || !anchorEl || typeof anchorEl.getBoundingClientRect !== "function" || typeof window === "undefined") return;
  const aRect = anchorEl.getBoundingClientRect();
  if (!aRect || (aRect.width === 0 && aRect.height === 0)) return;
  const vw = window.innerWidth || 1024;
  const vh = window.innerHeight || 768;
  if (aRect.bottom < 0 || aRect.top > vh || aRect.right < 0 || aRect.left > vw) {
    hideJargonPopover();
    return;
  }
  const pRect = pop.getBoundingClientRect();
  const popW = Math.max(220, pRect.width || 276);
  const popH = Math.max(84, pRect.height || 110);
  const margin = 12;

  let left = aRect.left + (aRect.width / 2) - (popW / 2);
  left = Math.max(margin, Math.min(vw - popW - margin, left));

  let top = aRect.top - popH - 10;
  let placedBelow = false;
  if (top < margin) {
    top = aRect.bottom + 10;
    placedBelow = true;
    if (top + popH > vh - margin) {
      top = Math.max(margin, vh - popH - margin);
    }
  }
  pop.style.left = Math.round(left) + "px";
  pop.style.top = Math.round(top) + "px";
  pop.classList.toggle("is-below", placedBelow);
}

function hideJargonPopover() {
  if (jargonTooltipState.openTimer) {
    clearTimeout(jargonTooltipState.openTimer);
    jargonTooltipState.openTimer = null;
  }
  if (jargonTooltipState.closeTimer) {
    clearTimeout(jargonTooltipState.closeTimer);
    jargonTooltipState.closeTimer = null;
  }
  if (jargonTooltipState.activeAnchor && jargonTooltipState.activeAnchor.classList) {
    jargonTooltipState.activeAnchor.classList.remove("is-jargon-open");
  }
  jargonTooltipState.activeAnchor = null;
  jargonTooltipState.activeTerm = "";
  jargonTooltipState.pinned = false;
  const pop = el("jargonTooltipPopover");
  if (pop) {
    pop.classList.add("hidden");
    pop.setAttribute("aria-hidden", "true");
  }
}

function showJargonPopover(anchorEl, termKey, opts) {
  const pop = el("jargonTooltipPopover");
  const entry = lookupWerewolfJargon(termKey || (anchorEl && anchorEl.getAttribute && anchorEl.getAttribute("data-jargon")));
  if (!pop || !entry) return false;

  if (jargonTooltipState.closeTimer) {
    clearTimeout(jargonTooltipState.closeTimer);
    jargonTooltipState.closeTimer = null;
  }
  if (jargonTooltipState.activeAnchor && jargonTooltipState.activeAnchor !== anchorEl && jargonTooltipState.activeAnchor.classList) {
    jargonTooltipState.activeAnchor.classList.remove("is-jargon-open");
  }

  const catEl = el("jargonTipCategory");
  const titleEl = el("jargonTipTerm");
  const descEl = el("jargonTipPlain");
  const extraEl = el("jargonTipNote");
  if (catEl) catEl.textContent = entry.category || "茶席術語";
  if (titleEl) titleEl.textContent = entry.term;
  if (descEl) descEl.textContent = entry.plain;
  if (extraEl) {
    if (entry.tip) {
      extraEl.textContent = entry.tip;
      extraEl.classList.remove("hidden");
    } else {
      extraEl.textContent = "";
      extraEl.classList.add("hidden");
    }
  }

  jargonTooltipState.activeAnchor = anchorEl || null;
  jargonTooltipState.activeTerm = entry.term;
  jargonTooltipState.pinned = Boolean(opts && opts.pin);
  if (anchorEl && anchorEl.classList) anchorEl.classList.add("is-jargon-open");

  pop.classList.remove("hidden");
  pop.setAttribute("aria-hidden", "false");
  if (anchorEl) positionJargonPopover(anchorEl);
  return true;
}

function scheduleJargonClose(delayMs) {
  if (jargonTooltipState.pinned) return;
  if (jargonTooltipState.closeTimer) clearTimeout(jargonTooltipState.closeTimer);
  jargonTooltipState.closeTimer = setTimeout(function () {
    jargonTooltipState.closeTimer = null;
    hideJargonPopover();
  }, delayMs || 180);
}

function scheduleJargonScan(rootEl) {
  if (!rootEl || typeof window === "undefined" || jargonTooltipState.isMutating) return;
  if (jargonTooltipState.pendingRoots.indexOf(rootEl) === -1) {
    jargonTooltipState.pendingRoots.push(rootEl);
  }
  if (jargonTooltipState.scanTimer) return;
  const flush = function () {
    jargonTooltipState.scanTimer = null;
    const roots = jargonTooltipState.pendingRoots.splice(0, jargonTooltipState.pendingRoots.length);
    roots.forEach(function (r) {
      enhanceJargonInContainer(r);
    });
  };
  if (typeof window.setTimeout === "function") {
    jargonTooltipState.scanTimer = window.setTimeout(flush, 90);
  } else {
    flush();
  }
}

const _JARGON_WATCH_ROOT_IDS = [
  "focalCenterCard",
  "inGameTopHud",
  "cornerRoleTile",
  "cornerFourGDeck",
  "roleGuidePopover",
  "seatIntelPopover",
  "roleDealOverlay",
  "modalTutorial",
  "modalJournal",
  "modalGuide",
  "setupDrawer"
];

function refreshAllJargonAnnotations() {
  _JARGON_WATCH_ROOT_IDS.forEach(function (id) {
    const node = el(id);
    if (node) enhanceJargonInContainer(node);
  });
}

function initWerewolfJargonSystem() {
  if (jargonTooltipState.initialized || typeof document === "undefined") return;
  jargonTooltipState.initialized = true;

  const findJargonNode = function (target) {
    if (!target || typeof target.closest !== "function") return null;
    return target.closest(".jargon-term, .clue-token[data-jargon]");
  };

  document.addEventListener("pointerdown", function (ev) {
    if (ev && ev.pointerType === "touch") {
      jargonTooltipState.lastTouchTs = Date.now();
    }
  }, true);

  // Desktop hover intent (skip right after touch tap so mobile doesn't flicker)
  document.addEventListener("mouseover", function (ev) {
    if (Date.now() - jargonTooltipState.lastTouchTs < 700) return;
    const pop = el("jargonTooltipPopover");
    if (pop && ev.target && typeof ev.target.closest === "function" && ev.target.closest("#jargonTooltipPopover")) {
      if (jargonTooltipState.closeTimer) {
        clearTimeout(jargonTooltipState.closeTimer);
        jargonTooltipState.closeTimer = null;
      }
      return;
    }
    const jEl = findJargonNode(ev.target);
    if (!jEl) return;
    if (jargonTooltipState.closeTimer) {
      clearTimeout(jargonTooltipState.closeTimer);
      jargonTooltipState.closeTimer = null;
    }
    if (jargonTooltipState.activeAnchor === jEl) return;
    if (jargonTooltipState.openTimer) clearTimeout(jargonTooltipState.openTimer);
    jargonTooltipState.openTimer = setTimeout(function () {
      jargonTooltipState.openTimer = null;
      showJargonPopover(jEl, jEl.getAttribute("data-jargon"), { pin: false });
    }, 105);
  });

  document.addEventListener("mouseout", function (ev) {
    if (Date.now() - jargonTooltipState.lastTouchTs < 700) return;
    const jEl = findJargonNode(ev.target);
    const inPop = Boolean(ev.target && typeof ev.target.closest === "function" && ev.target.closest("#jargonTooltipPopover"));
    if (!jEl && !inPop) return;
    const rel = ev.relatedTarget;
    if (rel && typeof rel.closest === "function") {
      if (rel.closest("#jargonTooltipPopover") || findJargonNode(rel)) return;
    }
    if (jargonTooltipState.openTimer) {
      clearTimeout(jargonTooltipState.openTimer);
      jargonTooltipState.openTimer = null;
    }
    scheduleJargonClose(180);
  });

  // Tap / click support (Phone, Tablet & Desktop)
  document.addEventListener("click", function (ev) {
    const pop = el("jargonTooltipPopover");
    if (ev.target && typeof ev.target.closest === "function" && ev.target.closest("#btnCloseJargonTip")) {
      ev.stopPropagation();
      hideJargonPopover();
      return;
    }
    if (pop && !pop.classList.contains("hidden") && ev.target && typeof ev.target.closest === "function" && ev.target.closest("#jargonTooltipPopover")) {
      return;
    }
    const jEl = ev.target && typeof ev.target.closest === "function" ? ev.target.closest(".jargon-term") : null;
    if (jEl) {
      const insideBtn = jEl.getAttribute("data-jargon-inside-btn") === "1";
      const isRecentTouch = (Date.now() - jargonTooltipState.lastTouchTs) < 800;
      const termKey = jEl.getAttribute("data-jargon") || "";
      if (insideBtn && !isRecentTouch) {
        // Desktop click on a button containing a jargon term should still click the button cleanly!
        hideJargonPopover();
        return;
      }
      if (insideBtn && isRecentTouch && jargonTooltipState.activeAnchor === jEl) {
        // Second tap on same term inside a button on touch allows button action & dismisses tooltip
        hideJargonPopover();
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (jargonTooltipState.pinned && jargonTooltipState.activeAnchor === jEl) {
        hideJargonPopover();
      } else {
        showJargonPopover(jEl, termKey, { pin: true });
      }
      return;
    }
    if (pop && !pop.classList.contains("hidden")) {
      hideJargonPopover();
    }
  }, true);

  // Keyboard accessibility (Tab focus + Enter/Space + Escape)
  document.addEventListener("focusin", function (ev) {
    const jEl = findJargonNode(ev.target);
    if (jEl && jEl.classList && jEl.classList.contains("jargon-term")) {
      showJargonPopover(jEl, jEl.getAttribute("data-jargon"), { pin: false });
    }
  });
  document.addEventListener("keydown", function (ev) {
    const pop = el("jargonTooltipPopover");
    if (ev.key === "Escape" && pop && !pop.classList.contains("hidden")) {
      hideJargonPopover();
      return;
    }
    if (ev.key === "Enter" || ev.key === " ") {
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains("jargon-term")) {
        ev.preventDefault();
        ev.stopPropagation();
        if (jargonTooltipState.pinned && jargonTooltipState.activeAnchor === active) {
          hideJargonPopover();
        } else {
          showJargonPopover(active, active.getAttribute("data-jargon"), { pin: true });
        }
      }
    }
  });

  if (typeof window !== "undefined") {
    window.addEventListener("resize", function () {
      if (jargonTooltipState.activeAnchor) positionJargonPopover(jargonTooltipState.activeAnchor);
    }, { passive: true });
    window.addEventListener("scroll", function () {
      if (jargonTooltipState.activeAnchor) positionJargonPopover(jargonTooltipState.activeAnchor);
    }, true);
  }

  // Initial pass + debounced MutationObserver across all UI surfaces (skips self-mutations & high-frequency timers)
  refreshAllJargonAnnotations();
  if (typeof MutationObserver !== "undefined") {
    const obs = new MutationObserver(function (mutations) {
      if (jargonTooltipState.isMutating) return;
      mutations.forEach(function (mut) {
        const tgt = mut.target && mut.target.nodeType === 3 ? mut.target.parentElement : mut.target;
        if (tgt && !_isNodeInsideSkippedJargonZone(tgt)) {
          scheduleJargonScan(tgt);
        }
      });
    });
    _JARGON_WATCH_ROOT_IDS.forEach(function (id) {
      const node = el(id);
      if (node) {
        obs.observe(node, { childList: true, subtree: true, characterData: true });
      }
    });
    jargonTooltipState.observer = obs;
  }
}
