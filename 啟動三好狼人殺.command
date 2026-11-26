#!/bin/bash
cd "$(dirname "$0")"
PORT=8788
URL="http://localhost:${PORT}/ai.html"
echo "============================================"
echo "  三好AI狼人殺（3D 互動＋免費神經配音版）"
echo "  啟動網址: ${URL}"
echo "  關閉此視窗即可停止本地語音伺服器"
echo "============================================"
(sleep 1.4 && open "${URL}") &
if [ -x "./.venv/bin/python" ]; then
  exec ./.venv/bin/python server.py
else
  exec python3 server.py
fi
