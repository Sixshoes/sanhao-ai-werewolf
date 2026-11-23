@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=8788"
set "URL=http://localhost:%PORT%/ai.html"

echo ============================================
echo   Sanhao AI Werewolf (3D + Free Neural TTS)
echo   URL: %URL%
echo   Close this window to stop the local server
echo ============================================

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1500; Start-Process '%URL%'"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" server.py %*
) else (
    python server.py %*
)
pause