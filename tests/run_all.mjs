#!/usr/bin/env node
/**
 * 三好AI狼人殺 — 四層自動化系統驗證統一執行器
 * 1. Python 後端語法編譯檢查
 * 2. Python 後端安全性 / ETag / TTS 輸入驗證單元測試
 * 3. 前端靜態檢查 / 10 VRMs / GLSL Shader / UI 易操作性 / 快捷鍵煙霧測試
 * 4. 60 局全規則多角色亂數壓力與不變量測試
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const pyBin = fs.existsSync(".venv/Scripts/python.exe")
  ? ".venv/Scripts/python.exe"
  : fs.existsSync(".venv/bin/python")
    ? ".venv/bin/python"
    : process.platform === "win32"
      ? "python"
      : "python3";
const steps = [
  { name: "[1/4] Python 後端語法編譯檢查", cmd: pyBin, args: ["-m", "py_compile", "server.py"] },
  { name: "[2/4] 後端安全性 / ETag / API 單元測試", cmd: pyBin, args: ["-m", "unittest", "tests/test_server.py", "-v"] },
  { name: "[3/4] 靜態檢查 / 10 VRMs / GLSL / UI 操作與快捷鍵煙霧測試", cmd: process.execPath, args: ["tests/smoke.mjs"] },
  { name: "[4/4] 60 局全流程多角色亂數壓力與不變量測試", cmd: process.execPath, args: ["tests/fuzz.mjs"] }
];

const totalStart = performance.now();
for (const step of steps) {
  const t0 = performance.now();
  console.log(`\n=== ${step.name} ===`);
  execFileSync(step.cmd, step.args, { stdio: "inherit" });
  const elapsedMs = Math.round(performance.now() - t0);
  console.log(`[PASS] ${step.name} (${elapsedMs} ms)`);
}

const totalMs = Math.round(performance.now() - totalStart);
console.log(`\n[ALL 4 VERIFICATION LAYERS PASSED in ${totalMs} ms]`);
