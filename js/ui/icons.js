/**
 * 三好・雲起茶席 — 東方墨印茶金細線 SVG 圖示系統（js/ui/icons.js）
 * - 以一致的 1.65px 茶金／青瓷／硃砂線繪美學，全面取代系統彩色 Emoji，消除 AI 生成感
 * - 內建 shIcon()、shRichHtml()（先 escapeHtml 防 XSS）、以及瀏覽器端自動圖示化觀察器
 */
"use strict";

const SANHAO_SVG_PATHS = Object.freeze({
  // 角色與陣營紋章
  seer:      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  witch:     '<path d="M5 11h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-4z"/><path d="M16 12h2a2 2 0 0 1 0 4h-2"/><path d="M4 20h14"/><path d="M8.5 7.5c0-1.2 1-1.6 1-2.8M12 7.5c0-1.2 1-1.6 1-2.8"/>',
  hunter:    '<path d="M5 19L19 5"/><path d="M13 5h6v6"/><path d="M5 14v5h5"/>',
  guard:     '<path d="M12 3l7 3v5.5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5V6l7-3z"/><path d="M12 7v10"/>',
  elder:     '<path d="M12 3l5 6h-3l4 5h-3.5l3 4.5H6.5L9.5 14H6l4-5H7l5-6z"/><path d="M12 18.5V21"/>',
  villager:  '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"/><path d="M9 8h6M9 12h5"/>',
  wolf:      '<path d="M5 5l3 5h8l3-5v9l-7 6-7-6V5z"/><path d="M9.5 12.5h.01M14.5 12.5h.01M10 16l2 1.2 2-1.2"/>',
  crown:     '<path d="M4 17l1.5-9 4 4L12 6l2.5 6 4-4L20 17H4z"/><path d="M5 20h14"/>',

  // 動作與介面細線圖示
  spark:     '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/>',
  target:    '<path d="M12 3l9 9-9 9-9-9 9-9z"/><circle cx="12" cy="12" r="2.6"/>',
  pin:       '<path d="M7 4h10v16l-5-3.5L7 20V4z"/>',
  search:    '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><circle cx="10.5" cy="10.5" r="2"/>',
  eye:       '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  check:     '<path d="M4.5 12.5l5 5L19.5 7"/>',
  thumbs_up: '<path d="M12 20c-4.5-2.6-7-5.8-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4c0 3.8-2.5 7-7 9.6z"/>',
  doubt:     '<path d="M12 3l9 9-9 9-9-9 9-9z"/><path d="M10.2 9.8a2 2 0 0 1 3.7 1c0 1.4-1.9 1.6-1.9 3"/><path d="M12 16.8h.01"/>',
  warn:      '<path d="M12 3l9.5 16.5h-19L12 3z"/><path d="M12 9.5v4.5"/><path d="M12 16.8h.01"/>',
  mic:       '<path d="M8 9v6M12 5v14M16 9v6M4 11v2M20 11v2"/>',
  book:      '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v17H5.5A2.5 2.5 0 0 0 3 22V5.5z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v17h6.5a2.5 2.5 0 0 1 2.5 2V5.5z"/>',
  compass:   '<circle cx="12" cy="12" r="8.5"/><polygon points="15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6 15.5 8.5"/>',
  lotus:     '<path d="M12 4c-2.2 3.8-2.6 7.5 0 12 2.6-4.5 2.2-8.2 0-12z"/><path d="M12 16c-4.8-.6-7.6-3.2-8.2-6.8 3.2.4 6 2.5 8.2 6.8z"/><path d="M12 16c4.8-.6 7.6-3.2 8.2-6.8-3.2.4-6 2.5-8.2 6.8z"/><path d="M5 19.5h14"/>',
  leaf:      '<path d="M19 5c-7 0-12 4.5-13 13 8.5-1 13-6 13-13z"/><path d="M6 18l6-6"/>',
  swords:    '<path d="M5 19L18 6M14 5l5 5M19 19L6 6M10 5L5 10"/>',
  candle:    '<path d="M12 3c1.6 2 2 3.4 1.2 4.7a1.5 1.5 0 0 1-2.4 0C10 6.4 10.4 5 12 3z"/><rect x="9" y="10" width="6" height="10" rx="1"/><path d="M6 20h12"/>',
  moon:      '<path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5a7.5 7.5 0 1 0 9 9z"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  ballot:    '<rect x="4" y="6" width="16" height="14" rx="1.5"/><path d="M8 10h8M10 3h4v7h-4z"/>',
  mask:      '<path d="M4 6c2.5-1.5 5.5-1.5 8 0 2.5-1.5 5.5-1.5 8 0v5.5c0 4.5-3.5 7.5-8 8.5-4.5-1-8-4-8-8.5V6z"/><path d="M8.5 11h2M13.5 11h2M9.5 15c1.5 1.2 3.5 1.2 5 0"/>',
  puzzle:    '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  help:      '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2-2.4 3.4"/><path d="M12 17h.01"/>',
  trophy:    '<path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v5M8.5 19h7"/>',
  mail:      '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/>',
  mist:      '<path d="M4 9c2.5-1.5 5-1.5 7.5 0s5 1.5 8.5 0"/><path d="M3 13.5c2.5-1.5 5-1.5 7.5 0s5 1.5 8.5 0"/><path d="M5 18c2.5-1.2 4.5-1.2 7 0s4.5 1.2 7 0"/>',
  pause:     '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  handshake: '<path d="M4 13l4-4 3 3 5-5 4 4"/><path d="M7 16l3 3 7-7"/>',
  lock:      '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  camera:    '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="12" cy="12" r="3"/>',

  // 11 角色專屬語風紋章
  abacus:    '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.5h16M4 14.5h16"/><circle cx="9" cy="9.5" r="1.4" fill="currentColor"/><circle cx="15" cy="14.5" r="1.4" fill="currentColor"/>',
  mountain:  '<path d="M3 19l6-11 4 6.5 2.5-4L21 19H3z"/><path d="M8 10.5l2 1.2 2-1.2"/>',
  star:      '<polygon points="12 3 14.6 8.8 21 9.5 16.2 13.8 17.6 20 12 16.7 6.4 20 7.8 13.8 3 9.5 9.4 8.8 12 3"/>',
  press:     '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h5.5"/>',
  bamboo:    '<path d="M12 3v18"/><path d="M9.5 9h5M9.5 15h5"/><path d="M12 8c2.8-2.2 5-2.6 6.5-2.2-1 2.2-3 3.4-6.5 3.4"/><path d="M12 14c-2.8-2-5-2.3-6.5-1.8 1 2 3 3.2 6.5 3.2"/>',
  flame:     '<path d="M12 3c2.5 3.4 5.5 6 5.5 10a5.5 5.5 0 0 1-11 0c0-2.5 1.3-4.7 2.8-6.4.2 1.8 1.2 2.9 2.2 3.1C11 7.2 11.4 5 12 3z"/>',
  brush:     '<path d="M18.5 3.5l2 2-9.5 9.5-3.2 1.2 1.2-3.2 9.5-9.5z"/><path d="M5 19c1.2-1.8 3.2-2.2 4.5-1.5.8.5 1 2-.5 2.5-1.5.5-3.3 0-4-1z"/>',
  guzheng:   '<path d="M4 16L18 6l2 2.5L6 18.5 4 16z"/><path d="M7.5 13.5l6-4.3M9.5 15.8l6-4.3"/>',
  scales:    '<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.2 5h4.4L5 8zM19 8l-2.2 5h4.4L19 8z"/>',
  pastry:    '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15M4.5 12h15"/><circle cx="12" cy="12" r="2.2"/>',

  // 補充東方細線介面圖示（反饋／教學／互動）
  chat:      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13V5.5z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/>',
  flag:      '<path d="M6 3v18"/><path d="M6 4h11l-2.5 4.2L17 12.5H6"/>',
  raise:     '<path d="M12 19V6"/><path d="M7.5 10.5L12 6l4.5 4.5"/><path d="M5 19h14"/>',
  bag:       '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9.5 13h5"/>',
  horn:      '<path d="M4 13v-2l11-4v10l-11-4z"/><path d="M15 9.5a3 3 0 0 1 0 5"/><path d="M7 14.2L8.5 19"/>',
  stop:      '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  launch:    '<path d="M5 19l5.5-5.5M12 4l8 0 0 8"/><path d="M12 4L20 4 9.5 14.5 5 19"/>',
  device:    '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M8 19.5h8M12 16v3.5"/>',
  pointer:   '<path d="M6 4l12 7.5-5.2 1.4-2.1 5.1L6 4z"/>',
  seal:      '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="7.5" y="7.5" width="9" height="9" rx="1"/><path d="M12 7.5v9M7.5 12h9"/>',
  cross:     '<path d="M6 6l12 12M18 6L6 18"/>'
});

const EMOJI_TO_CRAFT_ICON = Object.freeze({
  "\u{1F52E}": { key: "seer",      tone: "gold" },
  "\u{1F375}": { key: "witch",     tone: "jade" },
  "\u2696": { key: "scales",    tone: "gold" },
  "\u{1F6E1}": { key: "guard",     tone: "jade" },
  "\u{1F43A}": { key: "wolf",      tone: "cinnabar" },
  "\u{1F451}": { key: "crown",     tone: "gold" },
  "\u26A1": { key: "spark",     tone: "gold" },
  "\u2728": { key: "spark",     tone: "gold" },
  "\u{1F31F}": { key: "star",      tone: "gold" },
  "\u2B50": { key: "star",      tone: "gold" },
  "\u{1F3AF}": { key: "target",    tone: "cinnabar" },
  "\u{1F4CC}": { key: "pin",       tone: "gold" },
  "\u{1F50D}": { key: "search",    tone: "gold" },
  "\u{1F50E}": { key: "search",    tone: "gold" },
  "\u{1F441}": { key: "eye",       tone: "gold" },
  "\u{1F440}": { key: "eye",       tone: "gold" },
  "\u{1F4D6}": { key: "book",      tone: "gold" },
  "\u{1F4CB}": { key: "press",     tone: "gold" },
  "\u{1F4DC}": { key: "bamboo",    tone: "jade" },
  "\u{1F9ED}": { key: "compass",   tone: "gold" },
  "\u{1FAB7}": { key: "lotus",     tone: "jade" },
  "\u{1F338}": { key: "lotus",     tone: "gold" },
  "\u{1F33F}": { key: "leaf",      tone: "jade" },
  "\u{1F343}": { key: "leaf",      tone: "jade" },
  "\u2694": { key: "swords",    tone: "cinnabar" },
  "\u{1F56F}": { key: "candle",    tone: "gold" },
  "\u{1F3EE}": { key: "candle",    tone: "cinnabar" },
  "\u{1F319}": { key: "moon",      tone: "indigo" },
  "\u{1F311}": { key: "moon",      tone: "indigo" },
  "\u2600": { key: "sun",       tone: "gold" },
  "\u{1F5F3}": { key: "ballot",    tone: "gold" },
  "\u{1F3AD}": { key: "mask",      tone: "gold" },
  "\u{1F9E9}": { key: "puzzle",    tone: "gold" },
  "\u{1F336}": { key: "flame",     tone: "cinnabar" },
  "\u{1F525}": { key: "flame",     tone: "cinnabar" },
  "\u{1F4A5}": { key: "spark",     tone: "cinnabar" },
  "\u26A0": { key: "warn",      tone: "cinnabar" },
  "\u{1F399}": { key: "mic",       tone: "jade" },
  "\u2753": { key: "help",      tone: "gold" },
  "\u{1F4A1}": { key: "spark",     tone: "gold" },
  "\u{1F44D}": { key: "thumbs_up", tone: "jade" },
  "\u{1F928}": { key: "doubt",     tone: "cinnabar" },
  "\u2705": { key: "check",     tone: "jade" },
  "\u{1F91D}": { key: "handshake", tone: "jade" },
  "\u{1F3C6}": { key: "trophy",    tone: "gold" },
  "\u{1F396}": { key: "trophy",    tone: "gold" },
  "\u{1F48C}": { key: "mail",      tone: "gold" },
  "\u{1F4E8}": { key: "mail",      tone: "gold" },
  "\u{1F4E5}": { key: "ballot",    tone: "gold" },
  "\u{1F32B}": { key: "mist",      tone: "cinnabar" },
  "\u{1F4A6}": { key: "mist",      tone: "indigo" },
  "\u23F8": { key: "pause",     tone: "gold" },
  "\u{1F512}": { key: "lock",      tone: "muted" },
  "\u{1F4CA}": { key: "abacus",    tone: "indigo" },
  "\u{1F3D4}": { key: "mountain",  tone: "jade" },
  "\u{1F4F0}": { key: "press",     tone: "cinnabar" },
  "\u{1F58B}": { key: "brush",     tone: "indigo" },
  "\u{1F3BC}": { key: "guzheng",   tone: "gold" },
  "\u{1F9C1}": { key: "pastry",    tone: "jade" },
  "\u{1F3AC}": { key: "camera",    tone: "gold" },
  "\u{1FA91}": { key: "compass",   tone: "gold" },
  "\u{1F985}": { key: "eye",       tone: "gold" },
  "\u{1F41E}": { key: "warn",      tone: "cinnabar" },
  "\u{1F3A8}": { key: "brush",     tone: "gold" },
  "\u{1F9E0}": { key: "seer",      tone: "indigo" },
  "\u{1F3B4}": { key: "villager",  tone: "gold" },
  "\u{1F54A}": { key: "lotus",     tone: "jade" },
  "\u{1F575}": { key: "search",    tone: "gold" },
  "\u{1F389}": { key: "spark",     tone: "gold" },
  "\u{1F44B}": { key: "lotus",     tone: "gold" },
  "\u{1F604}": { key: "lotus",     tone: "gold" },
  "\u{1F514}": { key: "candle",    tone: "gold" },
  "\u{1F361}": { key: "pastry",    tone: "gold" },
  "\u{1F4F1}": { key: "press",     tone: "muted" },
  "\u{1F7E2}": { key: "check",     tone: "jade" },
  "\u{1F535}": { key: "seer",      tone: "indigo" },
  "\u{1F64B}": { key: "raise",     tone: "gold" },
  "\u{1F3F3}": { key: "flag",      tone: "muted" },
  "\u{1F3C5}": { key: "trophy",    tone: "gold" },
  "\u2717":  { key: "cross",     tone: "cinnabar" },
  "\u{1F680}": { key: "launch",    tone: "gold" },
  "\u{1F4BB}": { key: "device",    tone: "indigo" },
  "\u{1F4AC}": { key: "chat",      tone: "gold" },
  "\u{1F419}": { key: "seal",      tone: "gold" },
  "\u{1F4C4}": { key: "press",     tone: "gold" },
  "\u{1F5B1}": { key: "pointer",   tone: "gold" },
  "\u{1F3A5}": { key: "camera",    tone: "gold" },
  "\u2328":  { key: "abacus",    tone: "indigo" },
  "\u{1F916}": { key: "seer",      tone: "indigo" },
  "\u23F9": { key: "stop",      tone: "cinnabar" },
  "\u{1F60F}": { key: "mask",      tone: "cinnabar" },
  "\u{1F49B}": { key: "lotus",     tone: "gold" },
  "\u{1F49A}": { key: "lotus",     tone: "jade" },
  "\u{1F499}": { key: "lotus",     tone: "indigo" },
  "\u{1F392}": { key: "bag",       tone: "gold" },
  "\u{1F4E3}": { key: "horn",      tone: "gold" },
  "\u2139":  { key: "help",      tone: "indigo" }
});

const SH_EMOJI_PATTERN = new RegExp(
  "(" +
    Object.keys(EMOJI_TO_CRAFT_ICON)
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\uFE0F?"; })
      .join("|") +
  ")",
  "gu"
);

function shIcon(key, tone) {
  const pathStr = SANHAO_SVG_PATHS[key] || SANHAO_SVG_PATHS.spark;
  const toneCls = tone ? (" sh-ico-" + tone) : "";
  return '<svg class="sh-ico' + toneCls + '" viewBox="0 0 24 24" aria-hidden="true">' + pathStr + "</svg>";
}

function shRichHtml(plainText) {
  const esc = typeof escapeHtml === "function" ? escapeHtml(plainText) : String(plainText || "");
  return esc.replace(SH_EMOJI_PATTERN, function (m) {
    const base = m.replace(/\uFE0F/g, "");
    const spec = EMOJI_TO_CRAFT_ICON[base];
    return spec ? shIcon(spec.key, spec.tone) : m;
  });
}

function shStripCanvasEmoji(text) {
  return String(text || "")
    .replace(SH_EMOJI_PATTERN, "")
    .replace(/^\s+/, "")
    .replace(/\s{2,}/g, " ");
}

function shPrependIcon(targetEl, key, tone) {
  if (!targetEl || !key) return;
  const svg = _shCreateSvgNode(key, tone);
  if (svg && typeof targetEl.insertBefore === "function") {
    targetEl.insertBefore(svg, targetEl.firstChild || null);
  }
}

function _shCreateSvgNode(key, tone) {
  if (typeof document === "undefined" || typeof document.createElementNS !== "function") return null;
  const pathStr = SANHAO_SVG_PATHS[key] || SANHAO_SVG_PATHS.spark;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sh-ico" + (tone ? (" sh-ico-" + tone) : ""));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = pathStr;
  return svg;
}

const _SH_SKIP_TAGS = { INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, SCRIPT: 1, STYLE: 1, SVG: 1, CANVAS: 1, CODE: 1, PRE: 1 };

function shUpgradeElementIcons(rootEl) {
  if (!rootEl || typeof document === "undefined" || typeof document.createTreeWalker !== "function" || typeof NodeFilter === "undefined") {
    return 0;
  }
  const toReplace = [];
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node || !node.nodeValue || !SH_EMOJI_PATTERN.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      SH_EMOJI_PATTERN.lastIndex = 0;
      let p = node.parentNode;
      while (p && p !== rootEl) {
        if (p.nodeType === 1) {
          if (_SH_SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
          if (p.classList && (p.classList.contains("sh-ico") || p.classList.contains("clue-token") || p.classList.contains("fb-star-btn"))) return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let cur;
  while ((cur = walker.nextNode())) {
    toReplace.push(cur);
  }
  let replaced = 0;
  for (let i = 0; i < toReplace.length; i++) {
    const txtNode = toReplace[i];
    const parent = txtNode.parentNode;
    if (!parent) continue;
    const val = txtNode.nodeValue || "";
    SH_EMOJI_PATTERN.lastIndex = 0;
    let last = 0;
    let m;
    const frag = document.createDocumentFragment();
    let touched = false;
    while ((m = SH_EMOJI_PATTERN.exec(val)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(val.slice(last, m.index)));
      }
      const base = m[0].replace(/\uFE0F/g, "");
      const spec = EMOJI_TO_CRAFT_ICON[base];
      const svgNode = spec ? _shCreateSvgNode(spec.key, spec.tone) : null;
      if (svgNode) {
        frag.appendChild(svgNode);
        touched = true;
        replaced += 1;
      } else {
        frag.appendChild(document.createTextNode(m[0]));
      }
      last = SH_EMOJI_PATTERN.lastIndex;
    }
    if (touched) {
      if (last < val.length) {
        frag.appendChild(document.createTextNode(val.slice(last)));
      }
      parent.replaceChild(frag, txtNode);
    }
  }
  return replaced;
}

let _shIconObserverInstalled = false;
function installCraftIconObserver() {
  if (_shIconObserverInstalled || typeof document === "undefined" || typeof MutationObserver !== "function") return;
  _shIconObserverInstalled = true;
  const runFull = function () {
    if (document.body) shUpgradeElementIcons(document.body);
  };
  let pendingNodes = [];
  let rafScheduled = false;
  const flush = function () {
    rafScheduled = false;
    const batch = pendingNodes;
    pendingNodes = [];
    for (let i = 0; i < batch.length; i++) {
      const n = batch[i];
      if (n && n.isConnected) {
        shUpgradeElementIcons(n.nodeType === 1 ? n : n.parentNode);
      }
    }
  };
  const scheduleNode = function (n) {
    if (!n) return;
    if (pendingNodes.indexOf(n) === -1) pendingNodes.push(n);
    if (!rafScheduled) {
      rafScheduled = true;
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
      else setTimeout(flush, 16);
    }
  };
  const startObserve = function () {
    runFull();
    if (!document.body) return;
    const obs = new MutationObserver(function (mutations) {
      for (let i = 0; i < mutations.length; i++) {
        const mut = mutations[i];
        if (mut.type === "characterData" && mut.target) {
          scheduleNode(mut.target.parentNode);
        } else if (mut.type === "childList" && mut.addedNodes) {
          for (let j = 0; j < mut.addedNodes.length; j++) {
            const added = mut.addedNodes[j];
            if (added.nodeType === 1 && added.tagName !== "SVG") scheduleNode(added);
            else if (added.nodeType === 3) scheduleNode(mut.target);
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserve);
  } else {
    startObserve();
  }
}

installCraftIconObserver();
