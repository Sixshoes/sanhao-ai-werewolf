#!/usr/bin/env python3
"""
三好AI狼人殺 — 100% 免費本地遊戲與神經語音伺服器（$0 零花費、免 API Key）
功能：
1. 提供靜態網頁預覽（預設 http://localhost:8765/ai.html）
2. 提供 /api/tts 端點，透過開源免費 edge-tts 驅動微軟神經台灣／華語多角色配音
3. 內建 .tts_cache/ 磁碟快取，重播或常見系統播報毫秒級零延遲
"""
import asyncio
import datetime
import hashlib
import json
import os
import re
import socket
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
VENV_PY = (
    ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if os.name == "nt"
    else ROOT_DIR / ".venv" / "bin" / "python"
)
OLLAMA_BASE = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL_RE = re.compile(r"^[A-Za-z0-9._:/-]{1,96}$")
FEEDBACK_DIR = ROOT_DIR / ".feedback_inbox"
_FEEDBACK_LOCK = threading.Lock()
ALLOWED_FEEDBACK_CATEGORIES = {"bug", "ui", "gameplay", "idea"}


def strip_reasoning_tags(text):
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", str(text or ""), flags=re.IGNORECASE)
    return cleaned.strip()


def query_ollama_models(timeout=1.5):
    try:
        req = urllib.request.Request(OLLAMA_BASE + "/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        models = [str(m.get("name", "")).strip() for m in (data.get("models") or []) if m.get("name")]
        return True, [m for m in models if OLLAMA_MODEL_RE.match(m)]
    except Exception:
        return False, []


def call_ollama_generate(model_name, prompt_text, json_mode=False, timeout=45):
    payload = {
        "model": model_name,
        "prompt": prompt_text,
        "stream": False,
        "options": {"temperature": 0.78, "num_predict": 420},
    }
    if json_mode:
        payload["format"] = "json"
    body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_BASE + "/api/generate",
        data=body_bytes,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    raw = data.get("response") or data.get("thinking") or ""
    return strip_reasoning_tags(raw)

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    # Auto-switch into local .venv if edge-tts was installed there!
    if VENV_PY.exists() and Path(sys.executable).resolve() != VENV_PY.resolve():
        if os.name == "nt":
            import subprocess
            sys.exit(subprocess.call([str(VENV_PY), str(Path(__file__).resolve())] + sys.argv[1:]))
        os.execv(str(VENV_PY), [str(VENV_PY), str(Path(__file__).resolve())] + sys.argv[1:])
    edge_tts = None
    HAS_EDGE_TTS = False

PORT = int(os.environ.get("PORT", "8788"))
BIND_HOST = os.environ.get("BIND_HOST", "127.0.0.1").strip() or "127.0.0.1"
CACHE_DIR = ROOT_DIR / ".tts_cache"
CACHE_DIR.mkdir(exist_ok=True)
TTS_CACHE_MAX_FILES = int(os.environ.get("TTS_CACHE_MAX_FILES", "1200"))
TTS_CACHE_MAX_BYTES = int(os.environ.get("TTS_CACHE_MAX_BYTES", str(100 * 1024 * 1024)))
_TTS_CACHE_PRUNE_LOCK = threading.Lock()
_TTS_WRITE_COUNTER = 0


def prune_tts_cache(cache_dir=None, max_files=None, max_bytes=None):
    """Enforce bounded LRU size/count limits on .tts_cache so disk usage never grows unbounded."""
    target_dir = Path(cache_dir) if cache_dir is not None else CACHE_DIR
    lim_files = TTS_CACHE_MAX_FILES if max_files is None else int(max_files)
    lim_bytes = TTS_CACHE_MAX_BYTES if max_bytes is None else int(max_bytes)
    if not target_dir.exists():
        return 0
    removed = 0
    with _TTS_CACHE_PRUNE_LOCK:
        entries = []
        total_bytes = 0
        try:
            for p in target_dir.iterdir():
                if not p.is_file() or p.suffix != ".mp3" or ".tmp." in p.name:
                    continue
                try:
                    st = p.stat()
                    entries.append((st.st_mtime, st.st_size, p))
                    total_bytes += st.st_size
                except OSError:
                    continue
        except OSError:
            return 0
        if len(entries) <= lim_files and total_bytes <= lim_bytes:
            return 0
        # Sort oldest first and evict until comfortably within both limits
        entries.sort(key=lambda item: item[0])
        cur_count = len(entries)
        for _mtime, sz, p in entries:
            if cur_count <= lim_files and total_bytes <= lim_bytes:
                break
            try:
                p.unlink()
                cur_count -= 1
                total_bytes -= sz
                removed += 1
            except OSError:
                continue
    return removed

# 動漫角色適配自然配音（推薦預設：8 位高表現力神經配音員精準對應角色外型與年齡感，零機械變聲）
VOICE_PROFILES_ANIME = {
    "主持":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-2%", "pitch": "-1Hz"},
    "你":    {"voice": "zh-TW-HsiaoChenNeural", "rate": "+2%", "pitch": "+1Hz"},
    "你_男": {"voice": "zh-CN-YunxiNeural",     "rate": "+0%", "pitch": "+0Hz"},
    "小澄":  {"voice": "zh-CN-YunyangNeural",   "rate": "+4%", "pitch": "+0Hz"},
    "暖暖":  {"voice": "zh-CN-XiaoxiaoNeural",  "rate": "-3%", "pitch": "+1Hz"},
    "阿松":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "星兒":  {"voice": "zh-CN-XiaoyiNeural",    "rate": "+6%", "pitch": "+2Hz"},
    "小雲":  {"voice": "zh-TW-HsiaoYuNeural",   "rate": "+4%", "pitch": "-1Hz"},
    "阿竹":  {"voice": "zh-CN-YunxiNeural",     "rate": "-5%", "pitch": "-2Hz"},
    "晨晨":  {"voice": "zh-CN-YunjianNeural",   "rate": "+6%", "pitch": "+1Hz"},
    "墨白":  {"voice": "zh-CN-YunyangNeural",   "rate": "-9%", "pitch": "-3Hz"},
    "晴嵐":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-6%", "pitch": "-2Hz"},
    "阿朗":  {"voice": "zh-CN-YunjianNeural",   "rate": "+4%", "pitch": "-2Hz"},
    "柚子":  {"voice": "zh-CN-XiaoyiNeural",    "rate": "+7%", "pitch": "+3Hz"},
}

# 純台灣腔（注意：zh-TW-YunJheNeural 在微軟端點僅支援預設語速音高 +0%/+0Hz）
VOICE_PROFILES_TW = {
    "主持":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-2%", "pitch": "-1Hz"},
    "你":    {"voice": "zh-TW-HsiaoChenNeural", "rate": "+2%", "pitch": "+1Hz"},
    "你_男": {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "小澄":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "暖暖":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-3%", "pitch": "+3Hz"},
    "阿松":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "星兒":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+5%", "pitch": "+3Hz"},
    "小雲":  {"voice": "zh-TW-HsiaoYuNeural",   "rate": "+3%", "pitch": "-2Hz"},
    "阿竹":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "晨晨":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "墨白":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "晴嵐":  {"voice": "zh-TW-HsiaoYuNeural",   "rate": "-4%", "pitch": "-1Hz"},
    "阿朗":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "柚子":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+7%", "pitch": "+4Hz"},
}
VOICE_PROFILES = VOICE_PROFILES_ANIME


def compute_rate_pitch(persona, user_rate, mood, accent="anime"):
    table = VOICE_PROFILES_TW if accent == "tw" else VOICE_PROFILES_ANIME
    prof = table.get(persona, table["暖暖"])
    # zh-TW-YunJheNeural rejects any non-zero SSML rate/pitch upstream; keep strictly neutral
    if prof["voice"] == "zh-TW-YunJheNeural":
        return prof["voice"], "+0%", "+0Hz"
    base_rate = int(prof["rate"].replace("%", "").replace("+", ""))
    base_pitch = int(prof["pitch"].replace("Hz", "").replace("+", ""))

    # Blend user playback speed preference (0.96 baseline)
    try:
        ur = float(user_rate)
    except (TypeError, ValueError):
        ur = 0.96
    rate_delta = round((ur - 0.98) * 75)
    final_rate = max(-20, min(28, base_rate + rate_delta))
    final_pitch = base_pitch

    # Expressive natural prosody within ±5Hz so every mood feels vivid without pitch artifacts
    if mood == "panic":
        final_rate = min(28, final_rate + 9)
        final_pitch += 3
    elif mood == "accuse":
        final_rate = min(28, final_rate + 6)
        final_pitch += 2
    elif mood == "claim_seer":
        final_rate = min(26, final_rate + 3)
        final_pitch += 2
    elif mood == "rebut":
        final_rate = min(28, final_rate + 7)
        final_pitch += 1
    elif mood == "trust":
        final_rate = max(-18, final_rate - 3)
        final_pitch -= 1
    elif mood == "happy":
        final_rate = min(28, final_rate + 4)
        final_pitch += 2
    elif mood == "last_words":
        final_rate = max(-20, final_rate - 7)
        final_pitch -= 2
    elif mood == "host_night":
        final_rate = max(-20, final_rate - 7)
        final_pitch -= 3
    elif mood == "host_dawn":
        final_rate = min(26, final_rate + 3)
        final_pitch += 2

    final_pitch = max(-5, min(5, final_pitch))
    rate_str = f"+{final_rate}%" if final_rate >= 0 else f"{final_rate}%"
    pitch_str = f"+{final_pitch}Hz" if final_pitch >= 0 else f"{final_pitch}Hz"
    return prof["voice"], rate_str, pitch_str


_TTS_LOCKS_GUARD = threading.Lock()
_TTS_KEY_LOCKS = {}


def get_tts_key_lock(key):
    with _TTS_LOCKS_GUARD:
        lk = _TTS_KEY_LOCKS.get(key)
        if lk is None:
            if len(_TTS_KEY_LOCKS) > 512:
                _TTS_KEY_LOCKS.clear()
            lk = threading.Lock()
            _TTS_KEY_LOCKS[key] = lk
        return lk


async def synthesize_edge_mp3(text, voice_name, rate_str, pitch_str, out_path):
    try:
        comm = edge_tts.Communicate(text=text, voice=voice_name, rate=rate_str, pitch=pitch_str)
        await comm.save(str(out_path))
    except Exception:
        if voice_name == "zh-TW-YunJheNeural":
            fallback_comm = edge_tts.Communicate(text=text, voice="zh-CN-YunjianNeural", rate="-3%", pitch="-2Hz")
            await fallback_comm.save(str(out_path))
        else:
            raise


class SanhaoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self._static_etag = None
        self._static_cache_ctl = None
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self):
        if getattr(self, "_static_etag", None):
            self.send_header("ETag", self._static_etag)
            self._static_etag = None
        if getattr(self, "_static_cache_ctl", None):
            self.send_header("Cache-Control", self._static_cache_ctl)
            self._static_cache_ctl = None
        super().end_headers()

    def log_message(self, format, *args):
        # Keep console tidy while still logging API requests
        if args and "/api/" in str(args[0]):
            super().log_message(format, *args)

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = self.path.split("?")[0]
        if route == "/api/tts/status":
            self.send_json(200, {
                "ok": True,
                "freeNeural": HAS_EDGE_TTS,
                "engine": "edge-tts" if HAS_EDGE_TTS else "unavailable",
                "voices": len(VOICE_PROFILES),
            })
            return
        if route == "/api/local-llm/status":
            running, models = query_ollama_models()
            self.send_json(200, {
                "ok": True,
                "provider": "ollama",
                "running": running,
                "models": models,
            })
            return
        if route == "/api/assets/status":
            models_dir = ROOT_DIR / "assets" / "models"
            hero_rel = None
            for ext in (".vrm", ".glb", ".gltf"):
                if (models_dir / f"qingming{ext}").exists():
                    hero_rel = f"assets/models/qingming{ext}"
                    break
            seat_slugs = {
                "player": "seat1",
                "player_male": "seat1m",
                "xiaocheng": "seat2",
                "nuannuan": "seat3",
                "asong": "seat4",
                "xinger": "seat5",
                "xiaoyun": "seat6",
                "azhu": "seat7",
                "chenchen": "seat8",
                "mobai": "seat9",
                "qinglan": "seat10",
                "alang": "seat11",
                "youzi": "seat12",
            }
            seat_models = {}
            for slug, alias in seat_slugs.items():
                for stem in (slug, alias):
                    found = None
                    for ext in (".vrm", ".glb", ".gltf"):
                        cand = models_dir / f"{stem}{ext}"
                        if cand.exists():
                            found = f"assets/models/{stem}{ext}"
                            break
                    if found:
                        seat_models[slug] = found
                        break
            pavilion_rel = None
            for ext in (".glb", ".gltf"):
                if (models_dir / f"sanctuary_pavilion{ext}").exists():
                    pavilion_rel = f"assets/models/sanctuary_pavilion{ext}"
                    break
            self.send_json(200, {
                "ok": True,
                "hasHeroGlb": bool(hero_rel),
                "heroModel": hero_rel,
                "hasPavilionGlb": bool(pavilion_rel),
                "pavilionModel": pavilion_rel,
                "seatModels": seat_models,
            })
            return

        unquoted = urllib.parse.unquote(route)
        parts = [p for p in unquoted.split("/") if p]
        blocked_top = ("server.py", "tests", "tools", "__pycache__")
        if (
            any(p.startswith(".") or p == ".." or p == "__pycache__" for p in parts)
            or (parts and parts[0] in blocked_top)
        ):
            self.send_json(403, {"ok": False, "error": "Forbidden"})
            return

        raw_fs_path = Path(self.translate_path(self.path))
        try:
            resolved_fs = raw_fs_path.resolve()
        except OSError:
            self.send_json(403, {"ok": False, "error": "Forbidden"})
            return
        if resolved_fs != ROOT_DIR and ROOT_DIR not in resolved_fs.parents:
            self.send_json(403, {"ok": False, "error": "Forbidden"})
            return

        cache_ctl = (
            "public, max-age=3600"
            if route.startswith("/assets/")
            else ("no-cache" if route.endswith((".html", ".js", ".css")) else "public, max-age=300")
        )
        fs_path = raw_fs_path
        if fs_path.is_file():
            st = fs_path.stat()
            etag = f'W/"{st.st_mtime_ns:x}-{st.st_size:x}"'
            inm = self.headers.get("If-None-Match", "")
            if inm and (inm.strip() == "*" or etag in inm):
                self.send_response(304)
                self.send_header("ETag", etag)
                self.send_header("Cache-Control", cache_ctl)
                super().end_headers()
                return
            self._static_etag = etag
            self._static_cache_ctl = cache_ctl
        super().do_GET()

    def handle_post_local_llm(self):
        raw_len = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_len)
        except (TypeError, ValueError):
            self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return
        if length < 0:
            self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return
        if length > 49152:
            self.send_json(413, {"ok": False, "error": "Payload too large"})
            return
        raw = self.rfile.read(length)
        try:
            req = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"ok": False, "error": "Invalid JSON body"})
            return
        if not isinstance(req, dict):
            self.send_json(400, {"ok": False, "error": "JSON body must be an object"})
            return
        model = str(req.get("model") or "").strip()
        raw_prompt = req.get("prompt")
        prompt_text = raw_prompt.strip() if isinstance(raw_prompt, str) else ""
        if not model or not OLLAMA_MODEL_RE.match(model):
            self.send_json(400, {"ok": False, "error": "Invalid model name"})
            return
        if not prompt_text:
            self.send_json(400, {"ok": False, "error": "Empty prompt"})
            return
        prompt_text = prompt_text[:16000]
        try:
            out_text = call_ollama_generate(model, prompt_text, json_mode=bool(req.get("jsonMode")))
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            self.send_json(502, {"ok": False, "error": f"Local Ollama error: {str(exc)[:120]}"})
            return
        if not out_text:
            self.send_json(502, {"ok": False, "error": "Empty local model output"})
            return
        self.send_json(200, {"ok": True, "model": model, "text": out_text})

    def is_allowed_api_origin(self):
        origin = (self.headers.get("Origin") or "").strip()
        if not origin or origin == "null":
            return True
        try:
            parsed = urllib.parse.urlparse(origin)
            ohost = (parsed.hostname or "").lower()
        except Exception:
            return False
        if ohost in ("localhost", "127.0.0.1", "::1"):
            return True
        req_host = (self.headers.get("Host") or "").strip()
        if req_host:
            host_only = req_host.split(":", 1)[0].strip("[]").lower()
            if ohost and ohost == host_only:
                return True
        return False

    def handle_post_feedback(self):
        raw_len = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_len)
        except (TypeError, ValueError):
            self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return
        if length < 0:
            self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return
        if length > 8192:
            self.send_json(413, {"ok": False, "error": "Feedback payload too large"})
            return
        raw = self.rfile.read(length)
        try:
            req = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"ok": False, "error": "Invalid JSON body"})
            return
        if not isinstance(req, dict):
            self.send_json(400, {"ok": False, "error": "JSON body must be an object"})
            return
        raw_msg = req.get("message")
        message = raw_msg.strip() if isinstance(raw_msg, str) else ""
        if len(message) < 2:
            self.send_json(400, {"ok": False, "error": "Empty feedback message"})
            return
        cat = str(req.get("category") or "idea").strip().lower()
        if cat not in ALLOWED_FEEDBACK_CATEGORIES:
            cat = "idea"
        try:
            rating = max(1, min(5, int(req.get("rating", 5))))
        except (TypeError, ValueError):
            rating = 5
        nickname = str(req.get("nickname") or "").strip()[:32]
        diag = req.get("diagnostics") if isinstance(req.get("diagnostics"), dict) else None
        fb_id = f"fb_{uuid.uuid4().hex[:10]}"
        record = {
            "id": fb_id,
            "receivedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "clientIp": self.client_address[0] if self.client_address else "",
            "category": cat,
            "rating": rating,
            "nickname": nickname,
            "message": message[:1500],
            "diagnostics": diag,
        }
        try:
            FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
            inbox_file = FEEDBACK_DIR / "feedback.jsonl"
            line = json.dumps(record, ensure_ascii=False) + "\n"
            with _FEEDBACK_LOCK:
                with inbox_file.open("a", encoding="utf-8") as fh:
                    fh.write(line)
        except OSError as exc:
            self.send_json(500, {"ok": False, "error": f"Unable to save feedback: {str(exc)[:100]}"})
            return
        self.send_json(200, {"ok": True, "saved": True, "id": fb_id})

    def do_POST(self):
        route = self.path.split("?")[0]
        if not self.is_allowed_api_origin():
            self.send_json(403, {"ok": False, "error": "Forbidden cross-origin API request"})
            return
        if route == "/api/local-llm":
            self.handle_post_local_llm()
            return
        if route == "/api/feedback":
            self.handle_post_feedback()
            return
        if route != "/api/tts":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        if not HAS_EDGE_TTS:
            self.send_json(503, {"ok": False, "error": "edge-tts not installed"})
            return
        try:
            raw_len = self.headers.get("Content-Length", "0")
            try:
                length = int(raw_len)
            except (TypeError, ValueError):
                self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
                return
            if length < 0:
                self.send_json(400, {"ok": False, "error": "Invalid Content-Length"})
                return
            if length > 16384:
                self.send_json(413, {"ok": False, "error": "Payload too large"})
                return
            raw = self.rfile.read(length)
            try:
                req = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self.send_json(400, {"ok": False, "error": "Invalid JSON body"})
                return
            if not isinstance(req, dict):
                self.send_json(400, {"ok": False, "error": "JSON body must be an object"})
                return
            raw_text = req.get("text")
            text = raw_text.strip() if isinstance(raw_text, str) else ("" if raw_text is None else str(raw_text).strip())
            persona = str(req.get("persona") or "暖暖").strip()
            mood = str(req.get("mood") or "normal").strip()
            accent = str(req.get("accent") or "anime").strip()
            user_rate = req.get("rate", 0.96)
            if not text:
                self.send_json(400, {"ok": False, "error": "Empty text"})
                return
            if len(text) > 360:
                text = text[:360]

            voice_name, rate_str, pitch_str = compute_rate_pitch(persona, user_rate, mood, accent)
            key = hashlib.sha256(f"{voice_name}|{rate_str}|{pitch_str}|{text}".encode("utf-8")).hexdigest()[:24]
            mp3_path = CACHE_DIR / f"{key}.mp3"

            if not mp3_path.exists() or mp3_path.stat().st_size < 128:
                with get_tts_key_lock(key):
                    if not mp3_path.exists() or mp3_path.stat().st_size < 128:
                        tmp_path = CACHE_DIR / f"{key}.{threading.get_ident()}.{uuid.uuid4().hex[:8]}.tmp.mp3"
                        try:
                            asyncio.run(synthesize_edge_mp3(text, voice_name, rate_str, pitch_str, tmp_path))
                            if tmp_path.exists() and tmp_path.stat().st_size >= 128:
                                try:
                                    tmp_path.replace(mp3_path)
                                except PermissionError:
                                    if not mp3_path.exists():
                                        mp3_path.write_bytes(tmp_path.read_bytes())
                                global _TTS_WRITE_COUNTER
                                _TTS_WRITE_COUNTER += 1
                                if _TTS_WRITE_COUNTER % 20 == 0:
                                    threading.Thread(target=prune_tts_cache, daemon=True).start()
                            elif not mp3_path.exists() or mp3_path.stat().st_size < 128:
                                self.send_json(502, {"ok": False, "error": "Empty synthesis output"})
                                return
                        finally:
                            try:
                                if tmp_path.exists():
                                    tmp_path.unlink()
                            except OSError:
                                pass

            audio_bytes = mp3_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio_bytes)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(audio_bytes)
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)[:180]})


class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception:
            pass
        super().server_bind()


def prewarm_common_lines():
    if not HAS_EDGE_TTS:
        return
    common = [
        ("主持", "天黑請閉眼，山城入夜，請各位靜待神秘行動。", "host_night"),
        ("主持", "第1晚，天黑請靜心。", "host_night"),
        ("主持", "昨晚是平安夜，沒有人離席，請依序輪流發言！", "host_dawn"),
        ("主持", "全員發言完畢，現在開始公投，請把票投給你最懷疑的人！", "normal"),
        ("主持", "輪到1號你發言了，請選擇卡牌表態。", "normal"),
        ("暖暖", "哈囉！我們心平氣和說好話，一起理性推理找出酸民狼吧！", "normal"),
    ]
    for persona, text, mood in common:
        try:
            voice_name, rate_str, pitch_str = compute_rate_pitch(persona, 0.96, mood, "anime")
            key = hashlib.sha256(f"{voice_name}|{rate_str}|{pitch_str}|{text}".encode("utf-8")).hexdigest()[:24]
            mp3_path = CACHE_DIR / f"{key}.mp3"
            if not mp3_path.exists() or mp3_path.stat().st_size < 128:
                with get_tts_key_lock(key):
                    if not mp3_path.exists() or mp3_path.stat().st_size < 128:
                        tmp_path = CACHE_DIR / f"{key}.{threading.get_ident()}.{uuid.uuid4().hex[:8]}.tmp.mp3"
                        try:
                            asyncio.run(synthesize_edge_mp3(text, voice_name, rate_str, pitch_str, tmp_path))
                            if tmp_path.exists() and tmp_path.stat().st_size >= 128:
                                try:
                                    tmp_path.replace(mp3_path)
                                except PermissionError:
                                    if not mp3_path.exists():
                                        mp3_path.write_bytes(tmp_path.read_bytes())
                        finally:
                            try:
                                if tmp_path.exists():
                                    tmp_path.unlink()
                            except OSError:
                                pass
        except Exception:
            pass


if __name__ == "__main__":
    bind_host = "::" if "--lan" in sys.argv else BIND_HOST
    if ":" in bind_host:
        try:
            httpd = DualStackServer((bind_host, PORT), SanhaoHandler)
        except Exception:
            bind_host = "127.0.0.1"
            httpd = ThreadingHTTPServer((bind_host, PORT), SanhaoHandler)
    else:
        httpd = ThreadingHTTPServer((bind_host, PORT), SanhaoHandler)
    httpd.daemon_threads = True
    prune_tts_cache()
    status = "已啟用免費微軟神經多角色語音 (edge-tts)" if HAS_EDGE_TTS else "未安裝 edge-tts（自動退回瀏覽器本機語音）"
    scope_note = "區網開放" if bind_host in ("::", "0.0.0.0") else "僅本機 127.0.0.1"
    print(f"[三好AI狼人殺] 伺服器啟動：http://localhost:{PORT}/ai.html（{scope_note}） | {status}", flush=True)
    if HAS_EDGE_TTS:
        threading.Thread(target=prewarm_common_lines, daemon=True).start()
    httpd.serve_forever()
