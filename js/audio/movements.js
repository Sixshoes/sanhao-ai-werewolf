/**
 * 五段式動態配樂樂章定義與 MIDI 音高轉換
 */
"use strict";

// ==================== ADAPTIVE POLYPHONIC SOUNDTRACK & REVERB ENGINE ====================
function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const MOVEMENTS = {
  twilight: {
    name: "01 暮色山城（大廳主題）",
    chordsLabel: "Dadd9 — Bm11 — Gmaj9 — Asus4",
    bpm: 76,
    pads: [
      [50, 57, 64, 66],
      [47, 54, 62, 64],
      [43, 50, 57, 59],
      [45, 52, 57, 62]
    ],
    arps: [
      [62, 69, 76, 78, 74, 69, 66, 64],
      [59, 66, 74, 76, 78, 74, 71, 69],
      [55, 62, 69, 71, 74, 71, 69, 66],
      [57, 64, 69, 74, 73, 69, 64, 57]
    ],
    bells: [
      [81, null, null, null, null, null, 78, null],
      [null, null, null, null, 74, null, null, null],
      [78, null, null, null, null, null, 76, null],
      [null, null, 76, null, 73, null, null, null]
    ],
    drums: [0, 0, 0, 0, 0, 0, 0, 0]
  },
  night: {
    name: "02 深夜迷霧（天黑懸疑）",
    chordsLabel: "Bm9 — Gmaj7#11 — Em9 — F#7sus4",
    bpm: 62,
    pads: [
      [35, 42, 50, 54],
      [31, 38, 47, 54],
      [28, 35, 43, 50],
      [30, 37, 42, 47]
    ],
    arps: [
      [47, null, 54, null, 59, null, 54, null],
      [43, null, 50, null, 57, null, 54, null],
      [40, null, 47, null, 54, null, 50, null],
      [42, null, 49, null, 54, null, 52, null]
    ],
    bells: [
      [78, null, 74, 73, 71, null, null, 66],
      [79, null, 78, null, 73, 74, null, null],
      [76, null, 71, null, 67, 66, null, null],
      [78, null, 76, null, 73, null, 70, null]
    ],
    drums: [1, 0, 2, 0, 0, 0, 0, 0]
  },
  day: {
    name: "03 晨光論道（白天推理）",
    chordsLabel: "Gmaj7 — A6 — Bm7 — Dadd9",
    bpm: 96,
    pads: [
      [43, 50, 59, 66],
      [45, 52, 61, 66],
      [47, 54, 62, 66],
      [50, 57, 64, 66]
    ],
    arps: [
      [55, 62, 71, 69, 67, 62, 66, 67],
      [57, 64, 73, 71, 69, 64, 66, 69],
      [59, 66, 74, 73, 71, 66, 69, 71],
      [50, 57, 66, 64, 62, 69, 71, 69]
    ],
    bells: [
      [null, null, 79, null, null, null, 78, null],
      [null, null, 81, null, null, null, 76, null],
      [78, null, null, null, 74, null, null, null],
      [null, null, 78, null, 81, null, null, null]
    ],
    drums: [1, 0, 0, 3, 0, 0, 3, 0]
  },
  vote: {
    name: "04 公投對決（高張力表決）",
    chordsLabel: "Bm — A — Gmaj7 — F#7",
    bpm: 116,
    pads: [
      [35, 47, 54, 59],
      [33, 45, 52, 57],
      [31, 43, 50, 55],
      [30, 42, 49, 54]
    ],
    arps: [
      [47, 54, 59, 62, 59, 54, 62, 66],
      [45, 52, 57, 61, 57, 52, 61, 64],
      [43, 50, 55, 59, 55, 50, 59, 62],
      [42, 49, 54, 58, 54, 49, 58, 61]
    ],
    bells: [
      [71, null, null, 74, null, null, 73, null],
      [69, null, null, 73, null, null, 71, null],
      [67, null, null, 71, null, null, 69, null],
      [66, null, null, 70, null, null, 73, null]
    ],
    drums: [1, 0, 3, 1, 0, 3, 1, 3]
  },
  matchpoint: {
    name: "06 茶涼聽牌（決死快鼓）",
    chordsLabel: "F#m — Em — Dmaj7 — C#7",
    bpm: 138,
    pads: [
      [42, 49, 54, 57],
      [40, 47, 52, 55],
      [38, 45, 50, 54],
      [37, 44, 49, 53]
    ],
    arps: [
      [54, 57, 61, 66, 61, 57, 64, 61],
      [52, 55, 59, 64, 59, 55, 62, 59],
      [50, 54, 57, 62, 57, 54, 61, 57],
      [49, 53, 56, 61, 56, 53, 60, 56]
    ],
    bells: [
      [78, null, 76, null, 73, null, 76, null],
      [76, null, 74, null, 71, null, 74, null],
      [74, null, 73, null, 69, null, 73, null],
      [73, null, 71, null, 68, null, 73, 76]
    ],
    drums: [1, 3, 1, 3, 1, 2, 1, 3]
  },
  finale: {
    name: "05 雲開見月（終局謝幕）",
    chordsLabel: "Dmaj9 — Gmaj9 — Em9 — Asus4",
    bpm: 80,
    pads: [
      [50, 57, 62, 66],
      [43, 50, 59, 66],
      [40, 47, 55, 62],
      [45, 52, 57, 64]
    ],
    arps: [
      [50, 57, 62, 64, 66, 69, 74, 78],
      [43, 50, 55, 59, 62, 66, 71, 74],
      [40, 47, 52, 55, 59, 62, 67, 71],
      [45, 52, 57, 62, 64, 69, 74, 76]
    ],
    bells: [
      [86, null, null, null, 81, null, null, null],
      [83, null, null, null, 78, null, null, null],
      [79, null, null, null, 74, null, null, null],
      [81, null, 80, null, 81, null, null, null]
    ],
    drums: [1, 0, 0, 0, 2, 0, 0, 0]
  }
};
