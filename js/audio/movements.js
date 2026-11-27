/**
 * 七段式動態配樂樂章定義與 MIDI 音高轉換（東方禪茶 × 懸疑推理調式）
 */
"use strict";

// ==================== ADAPTIVE POLYPHONIC SOUNDTRACK & REVERB ENGINE ====================
function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const MOVEMENTS = {
  twilight: {
    name: "01 暮色山城（大廳主題）",
    chordsLabel: "Dmaj9 — F#m7 — Gmaj9 — A13sus4",
    bpm: 72,
    pads: [
      [50, 57, 61, 64],
      [42, 49, 52, 57],
      [43, 50, 54, 57],
      [45, 52, 55, 62]
    ],
    arps: [
      [50, null, 57, 62, null, 61, 64, null],
      [42, null, 49, 54, null, 57, 61, null],
      [43, null, 50, 54, null, 57, 59, null],
      [45, null, 52, 55, null, 57, 62, null]
    ],
    bells: [
      [74, null, null, null, null, null, null, null],
      [null, null, null, null, 73, null, null, null],
      [71, null, null, null, null, null, null, null],
      [null, null, null, null, 69, null, null, null]
    ],
    melody: [
      [69, null, 76, null, 74, 71, 69, null],
      [null, null, 66, 69, 71, null, 69, null],
      [null, 66, 69, 71, 74, null, 71, null],
      [69, null, 66, 64, 62, null, null, null],
      [74, null, 78, null, 76, 74, 71, null],
      [69, null, 71, 74, 73, null, 69, null],
      [67, null, 69, 71, 74, 71, 69, 66],
      [64, null, 66, 69, 62, null, null, null]
    ],
    drums: [0, 0, 0, 0, 0, 0, 0, 0]
  },
  night: {
    name: "02 深夜迷霧（天黑懸疑）",
    chordsLabel: "Bm9 — Gmaj7 — Em9 — F#7sus4",
    bpm: 58,
    pads: [
      [47, 54, 59, 61],
      [43, 50, 54, 59],
      [40, 47, 54, 55],
      [42, 49, 54, 59]
    ],
    arps: [
      [47, null, null, 54, null, null, 61, null],
      [43, null, null, 50, null, null, 54, null],
      [40, null, null, 47, null, null, 55, null],
      [42, null, null, 49, null, null, 54, null]
    ],
    bells: [
      [null, null, null, null, 73, null, null, null],
      [null, null, null, null, null, null, 74, null],
      [null, null, null, null, 71, null, null, null],
      [null, null, null, null, null, null, 73, null]
    ],
    melody: [
      [78, null, null, 74, 73, null, 71, null],
      [null, null, 69, null, 66, null, null, null],
      [71, null, null, 67, 66, null, 64, null],
      [66, null, null, null, null, null, null, null],
      [74, null, 73, null, 71, null, 66, null],
      [67, null, 71, null, 69, null, 66, null],
      [64, null, 66, 67, 66, null, 61, null],
      [59, null, null, null, null, null, null, null]
    ],
    drums: [1, 0, 0, 2, 0, 0, 0, 0]
  },
  day: {
    name: "03 晨光論道（白天推理）",
    chordsLabel: "Gmaj9 — Asus4 — F#m7 — Bm9",
    bpm: 82,
    pads: [
      [43, 50, 54, 57],
      [45, 52, 57, 62],
      [42, 49, 52, 57],
      [47, 54, 57, 61]
    ],
    arps: [
      [43, null, 50, null, 54, 57, null, 59],
      [45, null, 52, null, 57, 62, null, 57],
      [42, null, 49, null, 54, 57, null, 61],
      [47, null, 54, null, 59, 61, null, 57]
    ],
    bells: [
      [null, null, null, null, null, null, 74, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, 73, null],
      [null, null, null, null, 71, null, null, null]
    ],
    melody: [
      [66, null, 69, 71, null, 74, 71, null],
      [69, null, 66, null, 64, 66, 69, null],
      [71, null, 73, 74, null, 71, 69, 66],
      [69, null, null, 66, 62, null, null, null],
      [67, null, 71, 74, null, 76, 74, null],
      [73, null, 71, 69, null, 66, 69, null],
      [71, 69, 66, 64, 66, null, 69, 71],
      [66, null, 64, null, 62, null, null, null]
    ],
    drums: [1, 0, 4, 0, 0, 3, 4, 0]
  },
  sheriff: {
    name: "04 上警爭鋒（警徽競選）",
    chordsLabel: "Em9 — Cmaj7(9) — Am11 — B7sus4",
    bpm: 86,
    pads: [
      [40, 47, 54, 55],
      [48, 55, 59, 62],
      [45, 52, 57, 62],
      [47, 54, 57, 64]
    ],
    arps: [
      [52, null, 59, 55, 59, null, 64, 59],
      [48, null, 55, 59, 62, null, 59, 55],
      [45, null, 52, 57, 60, null, 57, 52],
      [47, null, 54, 57, 64, null, 63, 59]
    ],
    bells: [
      [76, null, null, null, null, null, null, null],
      [null, null, null, null, 74, null, null, null],
      [72, null, null, null, null, null, null, null],
      [null, null, null, null, 71, null, null, null]
    ],
    melody: [
      [64, null, 67, null, 71, null, null, null],
      [74, null, 71, null, 67, null, null, null],
      [69, null, 72, null, 71, null, 69, null],
      [66, null, null, null, 71, null, null, null],
      [76, null, 74, null, 71, null, 67, null],
      [74, null, 72, null, 71, null, null, null],
      [69, null, 67, null, 64, null, 67, null],
      [66, null, 63, null, 64, null, null, null]
    ],
    drums: [1, 0, 3, 4, 2, 0, 3, 4]
  },
  vote: {
    name: "05 公投對決（高張力表決）",
    chordsLabel: "Bm7 — Gmaj7 — Em7 — F#sus4",
    bpm: 96,
    pads: [
      [47, 54, 57, 62],
      [43, 50, 54, 59],
      [40, 47, 50, 55],
      [42, 49, 54, 59]
    ],
    arps: [
      [47, 54, 59, null, 54, 62, null, null],
      [43, 50, 55, null, 50, 59, null, null],
      [40, 47, 52, null, 47, 55, null, null],
      [42, 49, 54, null, 49, 59, null, 61]
    ],
    bells: [
      [71, null, null, null, null, null, null, null],
      [74, null, null, null, null, null, null, null],
      [67, null, null, null, null, null, null, null],
      [66, null, null, null, 73, null, null, null]
    ],
    melody: [
      [71, null, 74, 73, 71, null, 66, null],
      [67, null, 71, 74, 73, null, 69, null],
      [71, null, 67, 66, 64, null, 67, 71],
      [73, null, 74, 73, 69, null, null, null],
      [74, null, 78, 76, 74, null, 71, null],
      [73, null, 76, 74, 73, null, 69, null],
      [71, 69, 67, 66, 67, 71, 74, 73],
      [71, null, 66, null, 71, null, null, null]
    ],
    drums: [1, 0, 4, 1, 0, 3, 2, 0]
  },
  matchpoint: {
    name: "06 茶涼聽牌（決死快鼓）",
    chordsLabel: "F#m(9) — Em9 — Dmaj7(no3) — C#7sus4",
    bpm: 102,
    pads: [
      [42, 49, 54, 57],
      [40, 47, 52, 55],
      [38, 45, 50, 54],
      [49, 53, 56, 61]
    ],
    arps: [
      [54, null, 57, 61, 54, 61, 64, null],
      [52, null, 55, 59, 52, 59, 62, null],
      [50, null, 54, 57, 50, 57, 61, null],
      [49, null, 53, 56, 61, null, 56, 53]
    ],
    bells: [
      [73, null, null, null, 76, null, null, null],
      [71, null, null, null, 74, null, null, null],
      [69, null, null, null, 73, null, null, null],
      [68, null, null, null, 73, null, null, null]
    ],
    melody: [
      [73, null, 76, 73, 71, null, 73, null],
      [71, null, 74, 71, 69, null, 71, null],
      [69, null, 73, 69, 66, null, 69, null],
      [68, null, null, null, 73, null, null, null],
      [78, null, 76, null, 73, null, 76, null],
      [76, null, 74, null, 71, null, 74, null],
      [74, null, 73, null, 69, null, 73, null],
      [73, null, 71, null, 68, null, null, null]
    ],
    drums: [1, 0, 3, 1, 2, 3, 1, 4]
  },
  finale: {
    name: "07 雲開見月（終局謝幕）",
    chordsLabel: "Dmaj9(no3) — Gmaj9 — Em11 — Asus4",
    bpm: 68,
    pads: [
      [50, 57, 62, 66],
      [43, 50, 57, 59],
      [40, 47, 55, 62],
      [45, 52, 57, 64]
    ],
    arps: [
      [50, 57, 62, 66, 69, null, 66, null],
      [43, 50, 55, 59, 62, null, 66, null],
      [40, 47, 52, 55, 59, null, 62, null],
      [45, 52, 57, 62, 64, null, 69, null]
    ],
    bells: [
      [74, null, null, null, null, null, null, null],
      [71, null, null, null, null, null, null, null],
      [67, null, null, null, null, null, null, null],
      [69, null, null, null, 74, null, null, null]
    ],
    melody: [
      [null, null, 69, null, 71, 74, null, null],
      [76, null, 74, null, 71, null, null, null],
      [67, null, 71, null, 69, null, 66, null],
      [64, null, null, null, 69, null, null, null],
      [null, null, 74, null, 76, 78, null, null],
      [76, null, 74, null, 71, null, 69, null],
      [67, null, 69, null, 71, null, 74, null],
      [74, null, null, null, null, null, null, null]
    ],
    drums: [2, 0, 0, 0, 0, 0, 0, 0]
  }
};
