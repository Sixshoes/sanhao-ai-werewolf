#!/usr/bin/env python3
"""
三好AI狼人殺 — 100% 免費本地遊戲與神經語音伺服器（$0 零花費、免 API Key）
功能：
1. 提供靜態網頁預覽（預設 http://localhost:8788/ai.html）
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
    if os.name == "nt":
        try:
            import ssl as _ssl_mod
            import edge_tts.communicate as _edge_comm
            _edge_comm._SSL_CTX = _ssl_mod.create_default_context()
        except Exception:
            pass
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
                if not p.is_file() or p.suffix not in (".mp3", ".wav") or ".tmp." in p.name:
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

# 動漫角色適配自然配音（v13.0 擬真升級：12 位角色聲線差異最大化＋柔化播音腔＋墨白／晴嵐古風韻味）
VOICE_PROFILES_ANIME = {
    "主持":  {"voice": "zh-TW-HsiaoChenNeural",        "rate": "+0%", "pitch": "+1Hz"},
    "你":    {"voice": "zh-TW-HsiaoChenNeural",        "rate": "+2%", "pitch": "+2Hz"},
    "你_男": {"voice": "zh-CN-YunxiNeural",            "rate": "+0%", "pitch": "+0Hz"},
    "小澄":  {"voice": "zh-CN-YunxiNeural",            "rate": "+3%", "pitch": "+1Hz"},
    "暖暖":  {"voice": "zh-TW-HsiaoChenNeural",        "rate": "-1%", "pitch": "+3Hz"},
    "阿松":  {"voice": "zh-TW-YunJheNeural",           "rate": "+0%", "pitch": "+0Hz"},
    "星兒":  {"voice": "zh-CN-XiaoyiNeural",           "rate": "+5%", "pitch": "+3Hz"},
    "小雲":  {"voice": "zh-TW-HsiaoChenNeural",        "rate": "+4%", "pitch": "+1Hz"},
    "阿竹":  {"voice": "zh-CN-YunxiNeural",            "rate": "-3%", "pitch": "-1Hz"},
    "晨晨":  {"voice": "zh-CN-YunjianNeural",          "rate": "+4%", "pitch": "+1Hz"},
    "墨白":  {"voice": "zh-CN-YunjianNeural",          "rate": "-5%", "pitch": "-2Hz"},
    "晴嵐":  {"voice": "zh-CN-XiaoxiaoNeural",         "rate": "-2%", "pitch": "+1Hz"},
    "阿朗":  {"voice": "zh-CN-YunjianNeural",          "rate": "+2%", "pitch": "-1Hz"},
    "柚子":  {"voice": "zh-CN-XiaoyiNeural",           "rate": "+6%", "pitch": "+4Hz"},
}

# 純台灣腔（注意：zh-TW-YunJheNeural 在微軟端點僅支援預設語速音高 +0%/+0Hz，男聲差異由前端聲道共振峰與無損變速拉開）
VOICE_PROFILES_TW = {
    "主持":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+0%", "pitch": "+1Hz"},
    "你":    {"voice": "zh-TW-HsiaoChenNeural", "rate": "+2%", "pitch": "+2Hz"},
    "你_男": {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "小澄":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "暖暖":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-1%", "pitch": "+3Hz"},
    "阿松":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "星兒":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+5%", "pitch": "+4Hz"},
    "小雲":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+4%", "pitch": "+1Hz"},
    "阿竹":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "晨晨":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "墨白":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "晴嵐":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "-2%", "pitch": "+2Hz"},
    "阿朗":  {"voice": "zh-TW-YunJheNeural",    "rate": "+0%", "pitch": "+0Hz"},
    "柚子":  {"voice": "zh-TW-HsiaoChenNeural", "rate": "+6%", "pitch": "+5Hz"},
}
VOICE_PROFILES = VOICE_PROFILES_ANIME

ALLOWED_CLAUSE_ROLES = {"", "open", "pivot", "question", "climax", "close", "backchannel"}
ALLOWED_GEMINI_VOICES = {
    "Leda", "Kore", "Puck", "Orus", "Aoede", "Charon", "Zephyr", "Callirrhoe", "Fenrir",
    "Enceladus", "Achird", "Iapetus", "Autonoe", "Laomedeia", "Vindemiatrix", "Sulafat"
}


def naturalize_mandarin_text(text):
    """Soften stiff written punctuation & seat digits into natural conversational Mandarin cadence."""
    s = str(text or "").strip()
    if not s:
        return ""
    # Convert 10~12 and 1~9 seat numbers into natural spoken Chinese numerals so neural TTS never reads digits stiffly
    cn_nums = {
        "12": "十二", "11": "十一", "10": "十",
        "9": "九", "8": "八", "7": "七", "6": "六",
        "5": "五", "4": "四", "3": "三", "2": "二", "1": "一",
    }
    for k, v in cn_nums.items():
        s = re.sub(rf"(?<!\d)0?{k}\s*號", f"{v}號", s)
    s = re.sub(r"1\.5\s*票", "一點五票", s)
    s = re.sub(r"[；：]", "，", s)
    s = re.sub(r"—+", "，", s)
    s = re.sub(r"，{2,}", "，", s)
    return s.strip()


def compute_rate_pitch(persona, user_rate, mood, accent="anime", clause_role=""):
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
    rate_delta = round((ur - 0.98) * 72)
    final_rate = max(-22, min(28, base_rate + rate_delta))
    final_pitch = base_pitch

    # Expressive natural prosody within ±5Hz so every mood feels vivid without pitch artifacts
    if mood == "panic":
        final_rate = min(28, final_rate + 8)
        final_pitch += 3
    elif mood == "accuse":
        final_rate = min(28, final_rate + 5)
        final_pitch += 2
    elif mood == "claim_seer":
        final_rate = min(26, final_rate + 2)
        final_pitch += 2
    elif mood == "rebut":
        final_rate = min(28, final_rate + 7)
        final_pitch += 2
    elif mood == "trust":
        final_rate = max(-20, final_rate - 3)
        final_pitch -= 1
    elif mood == "happy":
        final_rate = min(28, final_rate + 4)
        final_pitch += 2
    elif mood == "last_words":
        final_rate = max(-22, final_rate - 8)
        final_pitch -= 2
    elif mood == "host_night":
        final_rate = max(-22, final_rate - 8)
        final_pitch -= 3
    elif mood == "host_dawn":
        final_rate = min(26, final_rate + 3)
        final_pitch += 2

    # Clause-level human prosody arc: unhurried opening -> energized climax/question -> grounded signoff!
    c_role = clause_role if clause_role in ALLOWED_CLAUSE_ROLES else ""
    if c_role == "open":
        final_rate = max(-22, final_rate - 5)
        final_pitch -= 1
    elif c_role == "pivot":
        final_rate = min(28, final_rate + 3)
        final_pitch += 1
    elif c_role == "question":
        final_rate = min(28, final_rate + 2)
        final_pitch += 2
    elif c_role == "climax":
        final_rate = min(28, final_rate + 6)
        final_pitch += 2
    elif c_role == "close":
        final_rate = max(-22, final_rate - 7)
        final_pitch -= 2
    elif c_role == "backchannel":
        final_rate = min(28, final_rate + 4)
        final_pitch += 1

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
                # Only prune idle (unlocked) entries so active in-flight syntheses never lose their key lock
                idle_keys = [k for k, v in list(_TTS_KEY_LOCKS.items()) if not v.locked()][:256]
                for old_k in idle_keys:
                    _TTS_KEY_LOCKS.pop(old_k, None)
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
        elif voice_name == "zh-CN-liaoning-XiaobeiNeural":
            fallback_comm = edge_tts.Communicate(text=text, voice="zh-CN-XiaoyiNeural", rate="+6%", pitch="+3Hz")
            await fallback_comm.save(str(out_path))
        else:
            raise


GEMINI_TTS_VOICE_FALLBACK = {
    "Orus": "Puck",
    "Enceladus": "Puck",
    "Achird": "Charon",
    "Iapetus": "Puck",
    "Leda": "Zephyr",
    "Aoede": "Zephyr",
    "Callirrhoe": "Zephyr",
    "Autonoe": "Zephyr",
    "Laomedeia": "Zephyr",
    "Vindemiatrix": "Zephyr",
    "Sulafat": "Zephyr",
}


def redact_api_keys(msg):
    return re.sub(r"AIza[0-9A-Za-z_-]{10,}", "[redacted]", str(msg or ""))


def wrap_pcm_to_wav(raw_bytes, sample_rate=24000, channels=1, bits_per_sample=16):
    """Wrap raw 16-bit LE PCM bytes into a standard 44-byte RIFF WAV container if not already WAV."""
    if not raw_bytes or len(raw_bytes) < 16:
        return raw_bytes
    if raw_bytes[:4] == b"RIFF" and len(raw_bytes) > 44:
        return raw_bytes
    import struct
    byte_rate = sample_rate * channels * (bits_per_sample // 8)
    block_align = channels * (bits_per_sample // 8)
    data_size = len(raw_bytes)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + raw_bytes


def call_gemini_tts_wav(api_key, text, voice_name, style_prompt, timeout=14):
    """Call official Gemini TTS generateContent API (3.8 Flash Lite TTS -> 2.5 Flash Preview TTS); return RIFF WAV bytes."""
    import base64
    v_name = voice_name if voice_name in ALLOWED_GEMINI_VOICES else "Kore"
    voices_to_try = [v_name]
    fb_v = GEMINI_TTS_VOICE_FALLBACK.get(v_name)
    if fb_v and fb_v != v_name:
        voices_to_try.append(fb_v)
    models_to_try = ("gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts")
    last_err = None
    for model_id in models_to_try:
        is_38 = model_id.startswith("gemini-3.8-")
        for cand_voice in voices_to_try:
            if is_38:
                part = {"text": str(text), "speechMetadata": {"style": style_prompt}} if style_prompt else {"text": str(text)}
            else:
                prompt_line = f"請用以下口吻自然朗讀（不要唸出指示）：{style_prompt}\n{text}" if style_prompt else str(text)
                part = {"text": prompt_line}
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [part]
                }],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": cand_voice
                            }
                        }
                    }
                }
            }
            body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent",
                data=body_bytes,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "x-goog-api-key": api_key,
                    "User-Agent": "aistudio-build",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as hexc:
                err_detail = ""
                try:
                    err_detail = redact_api_keys(hexc.read().decode("utf-8", "ignore"))[:220]
                except Exception:
                    pass
                last_err = RuntimeError(f"Gemini TTS {model_id}/{cand_voice} HTTP {hexc.code}: {err_detail}")
                if hexc.code in (401, 403):
                    raise hexc
                if hexc.code in (400, 404, 429, 500, 502, 503):
                    continue
                raise hexc
            for cand in (data.get("candidates") or []):
                parts = ((cand.get("content") or {}).get("parts") or [])
                for pt in parts:
                    inline = pt.get("inlineData") or pt.get("inline_data") or {}
                    if inline.get("data"):
                        raw_bytes = base64.b64decode(inline["data"])
                        mime = str(inline.get("mimeType") or inline.get("mime_type") or "audio/L16;rate=24000")
                        rate_m = re.search(r"rate=(\d+)", mime)
                        sr = int(rate_m.group(1)) if rate_m else 24000
                        wav_bytes = wrap_pcm_to_wav(raw_bytes, sample_rate=sr)
                        return wav_bytes, "audio/wav"
    if last_err:
        raise last_err
    return None, ""


ALLOWED_PROXY_GEMINI_MODELS = {
    "gemini-2.5-pro",
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
}
DEFAULT_PROXY_GEMINI_MODEL = "gemini-4-hydrogen"
LITE_PROXY_GEMINI_MODEL = "gemini-3.1-flash-lite"
PROXY_GEMINI_FALLBACK_ORDER = ("gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-2.5-flash")


def get_server_gemini_key():
    key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if key:
        return key
    env_path = ROOT_DIR / ".env"
    if env_path.is_file():
        try:
            for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                if k.strip() == "GEMINI_API_KEY":
                    return v.strip().strip('"').strip("'")
        except OSError:
            pass
    return ""


def clamp_gemini_temperature(raw_temp, default_val=0.65):
    try:
        val = float(raw_temp)
    except (TypeError, ValueError):
        val = float(default_val)
    if not (val == val) or val <= 0:
        val = float(default_val)
    return round(max(0.45, min(0.85, val)), 2)


def call_gemini_text_rest(api_key, model_id, prompt_text, json_mode=False, timeout=14, temperature=0.65):
    safe_model = model_id if model_id in ALLOWED_PROXY_GEMINI_MODELS else DEFAULT_PROXY_GEMINI_MODEL
    is_gemini4 = safe_model.startswith("gemini-4-")
    is_pro25 = safe_model == "gemini-2.5-pro"
    gen_cfg = {
        "maxOutputTokens": (2048 if json_mode else 1152) if is_pro25 else (1536 if json_mode else 896),
    }
    if is_gemini4:
        t_lvl = str(os.environ.get("GEMINI_THINKING_LEVEL") or "LOW").strip().upper()
        gen_cfg["thinkingConfig"] = {"thinkingLevel": t_lvl if t_lvl in ("LOW", "MEDIUM", "HIGH") else "LOW"}
    else:
        gen_cfg["temperature"] = clamp_gemini_temperature(temperature)
        if is_pro25:
            gen_cfg["thinkingConfig"] = {"thinkingBudget": 512}
    if json_mode:
        gen_cfg["responseMimeType"] = "application/json"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": gen_cfg,
    }).encode("utf-8")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(safe_model, safe='')}:generateContent"
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    text = "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict) and not p.get("thought")).strip()
    return text, safe_model


class SanhaoHandler(SimpleHTTPRequestHandler):
    _STREAM_CHUNK_BYTES = 16384

    def __init__(self, *args, **kwargs):
        self._static_etag = None
        self._static_cache_ctl = None
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def setup(self):
        super().setup()
        if hasattr(self.connection, "setsockopt"):
            try:
                self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            except OSError:
                pass

    def copyfile(self, source, outputfile):
        # Stream static files in 16KB chunks to prevent Windows loopback TCP stalls on >128KB sendall buffers
        while True:
            chunk = source.read(self._STREAM_CHUNK_BYTES)
            if not chunk:
                break
            outputfile.write(chunk)

    def write_bytes_chunked(self, data):
        mv = memoryview(data)
        step = self._STREAM_CHUNK_BYTES
        for off in range(0, len(mv), step):
            self.wfile.write(mv[off:off + step])

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
        self.write_bytes_chunked(body)

    def _validate_static_path(self, route):
        unquoted = urllib.parse.unquote(route)
        parts = [p for p in unquoted.split("/") if p]
        blocked_top = ("server.py", "api", "tests", "tools", "__pycache__")
        if (
            any(p.startswith(".") or p == ".." or p.lower() == "__pycache__" for p in parts)
            or (parts and parts[0].lower() in blocked_top)
        ):
            return None
        raw_fs_path = Path(self.translate_path(self.path))
        try:
            resolved_fs = raw_fs_path.resolve()
        except OSError:
            return None
        if resolved_fs != ROOT_DIR and ROOT_DIR not in resolved_fs.parents:
            return None
        try:
            rel_parts = resolved_fs.relative_to(ROOT_DIR).parts
        except ValueError:
            return None
        if (
            any(p.startswith(".") or p.lower() == "__pycache__" for p in rel_parts)
            or (rel_parts and rel_parts[0].lower() in blocked_top)
        ):
            return None
        return raw_fs_path

    def do_HEAD(self):
        clean_path = self.path.split("#", 1)[0]
        route = clean_path.split("?", 1)[0]
        if route == "/":
            qs = clean_path.split("?", 1)[1] if "?" in clean_path else ""
            self.path = "/ai.html" + (("?" + qs) if qs else "")
            route = "/ai.html"
        raw_fs_path = self._validate_static_path(route)
        if raw_fs_path is None:
            self.send_response(403)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        clean_path = self.path.split("#", 1)[0]
        route = clean_path.split("?", 1)[0]
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

        if route == "/api/tts":
            gem_key = get_server_gemini_key()
            self.send_json(200, {
                "ok": True,
                "available": bool(gem_key),
                "model": "gemini-3.8-flash-lite-tts",
                "mode": "vercel-gemini-tts",
            })
            return

        if route == "/api/gemini":
            gem_key = get_server_gemini_key()
            def_m = os.environ.get("GEMINI_DEFAULT_MODEL", DEFAULT_PROXY_GEMINI_MODEL).strip() or DEFAULT_PROXY_GEMINI_MODEL
            safe_def = def_m if def_m in ALLOWED_PROXY_GEMINI_MODELS else DEFAULT_PROXY_GEMINI_MODEL
            self.send_json(200, {
                "ok": True,
                "available": bool(gem_key),
                "model": safe_def,
                "supportedModels": [DEFAULT_PROXY_GEMINI_MODEL, LITE_PROXY_GEMINI_MODEL, "gemini-2.5-flash"],
                "mode": "local-server-proxy",
            })
            return

        if route == "/":
            qs = clean_path.split("?", 1)[1] if "?" in clean_path else ""
            self.path = "/ai.html" + (("?" + qs) if qs else "")
            route = "/ai.html"

        raw_fs_path = self._validate_static_path(route)
        if raw_fs_path is None:
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

    def handle_post_gemini_proxy(self):
        api_key = get_server_gemini_key()
        if not api_key:
            self.send_json(503, {"ok": False, "error": "Server Gemini proxy not configured"})
            return
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
        raw_prompt = req.get("prompt")
        prompt_text = raw_prompt.strip()[:14000] if isinstance(raw_prompt, str) else ""
        if not prompt_text:
            self.send_json(400, {"ok": False, "error": "Empty prompt"})
            return
        req_model = str(req.get("model") or os.environ.get("GEMINI_DEFAULT_MODEL", DEFAULT_PROXY_GEMINI_MODEL)).strip()
        primary_model = req_model if req_model in ALLOWED_PROXY_GEMINI_MODELS else DEFAULT_PROXY_GEMINI_MODEL
        if str(req.get("tier") or "").strip() == "lite" and primary_model == DEFAULT_PROXY_GEMINI_MODEL:
            primary_model = LITE_PROXY_GEMINI_MODEL
        json_mode = bool(req.get("jsonMode"))
        safe_temp = clamp_gemini_temperature(req.get("temperature"))
        candidates = [primary_model] + [m for m in PROXY_GEMINI_FALLBACK_ORDER if m != primary_model]
        last_http = 502
        last_err = "Empty Gemini output"
        for idx, cand in enumerate(candidates):
            try:
                out_text, used_model = call_gemini_text_rest(
                    api_key, cand, prompt_text, json_mode=json_mode, timeout=9 if idx == 0 else 7, temperature=safe_temp
                )
                if out_text:
                    payload = {"ok": True, "model": used_model, "text": out_text}
                    if idx > 0:
                        payload["fallbackFrom"] = primary_model
                    self.send_json(200, payload)
                    return
            except urllib.error.HTTPError as hexc:
                last_http = hexc.code
                last_err = f"Upstream Gemini HTTP {hexc.code}"
                if hexc.code in (401, 403):
                    break
                if hexc.code not in (400, 404, 429, 500, 502, 503, 504):
                    break
            except Exception as exc:
                last_http = 502
                last_err = f"Upstream Gemini error: {redact_api_keys(exc)[:100]}"
        self.send_json(429 if last_http == 429 else 502, {"ok": False, "upstreamStatus": last_http, "error": last_err})

    def is_allowed_api_origin(self):
        origin = (self.headers.get("Origin") or "").strip()
        if not origin:
            return True
        if origin.lower() == "null":
            return False
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

    def handle_post_gemini_tts(self, pre_req=None, use_server_key=False):
        if pre_req is None:
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
        else:
            req = pre_req
        api_key = (self.headers.get("x-goog-api-key") or "").strip()
        if not api_key and use_server_key:
            api_key = get_server_gemini_key()
        raw_text = req.get("text")
        text = raw_text.strip() if isinstance(raw_text, str) else ""
        voice_name = str(req.get("voice") or "Kore").strip()
        style_prompt = str(req.get("style") or "").strip()[:320]
        if not text:
            self.send_json(400, {"ok": False, "error": "Empty text"})
            return
        if len(text) > 900:
            text = text[:900]
        v_safe = voice_name if voice_name in ALLOWED_GEMINI_VOICES else "Kore"
        key = "gem_" + hashlib.sha256(f"{v_safe}|{style_prompt}|{text}".encode("utf-8")).hexdigest()[:24]
        wav_path = CACHE_DIR / f"{key}.wav"

        # Serve directly from disk cache even without API call if already synthesized earlier!
        if not wav_path.exists() or wav_path.stat().st_size < 128:
            if not api_key:
                self.send_json(503 if use_server_key else 401, {"ok": False, "error": "Server Gemini TTS not configured" if use_server_key else "Missing x-goog-api-key header"})
                return
            with get_tts_key_lock(key):
                if not wav_path.exists() or wav_path.stat().st_size < 128:
                    try:
                        audio_bytes, _mime = call_gemini_tts_wav(api_key, text, v_safe, style_prompt)
                    except urllib.error.HTTPError as hexc:
                        self.send_json(hexc.code if 400 <= hexc.code < 600 else 502, {"ok": False, "error": f"Gemini TTS HTTP {hexc.code}"})
                        return
                    except Exception as exc:
                        self.send_json(502, {"ok": False, "error": f"Gemini TTS error: {redact_api_keys(exc)[:120]}"})
                        return
                    if not audio_bytes or len(audio_bytes) < 128:
                        self.send_json(502, {"ok": False, "error": "Empty Gemini TTS audio"})
                        return
                    tmp_path = CACHE_DIR / f"{key}.{threading.get_ident()}.{uuid.uuid4().hex[:8]}.tmp.wav"
                    try:
                        tmp_path.write_bytes(audio_bytes)
                        try:
                            tmp_path.replace(wav_path)
                        except PermissionError:
                            if not wav_path.exists():
                                wav_path.write_bytes(audio_bytes)
                        global _TTS_WRITE_COUNTER
                        with _TTS_LOCKS_GUARD:
                            _TTS_WRITE_COUNTER += 1
                            should_prune = (_TTS_WRITE_COUNTER % 20 == 0)
                        if should_prune:
                            threading.Thread(target=prune_tts_cache, daemon=True).start()
                    finally:
                        try:
                            if tmp_path.exists():
                                tmp_path.unlink()
                        except OSError:
                            pass

        out_bytes = wav_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(out_bytes)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.write_bytes_chunked(out_bytes)

    def do_POST(self):
        route = self.path.split("?")[0]
        if not self.is_allowed_api_origin():
            self.send_json(403, {"ok": False, "error": "Forbidden cross-origin API request"})
            return
        if route == "/api/gemini":
            self.handle_post_gemini_proxy()
            return
        if route == "/api/local-llm":
            self.handle_post_local_llm()
            return
        if route == "/api/feedback":
            self.handle_post_feedback()
            return
        if route == "/api/tts/gemini":
            self.handle_post_gemini_tts()
            return
        if route != "/api/tts":
            self.send_json(404, {"ok": False, "error": "Not found"})
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
            # Cloud/Server Gemini Studio TTS track ({ voice, style, text }) when server GEMINI_API_KEY is available
            if "voice" in req and get_server_gemini_key():
                self.handle_post_gemini_tts(pre_req=req, use_server_key=True)
                return
            if not HAS_EDGE_TTS:
                self.send_json(503, {"ok": False, "error": "edge-tts not installed"})
                return
            raw_text = req.get("text")
            text = raw_text.strip() if isinstance(raw_text, str) else ("" if raw_text is None else str(raw_text).strip())
            persona = str(req.get("persona") or "暖暖").strip()
            mood = str(req.get("mood") or "normal").strip()
            accent = str(req.get("accent") or "anime").strip()
            clause_role = str(req.get("clauseRole") or "").strip()
            if clause_role not in ALLOWED_CLAUSE_ROLES:
                clause_role = ""
            user_rate = req.get("rate", 0.96)
            if not text:
                self.send_json(400, {"ok": False, "error": "Empty text"})
                return
            if len(text) > 360:
                text = text[:360]
            if req.get("naturalize"):
                text = naturalize_mandarin_text(text) or text

            voice_name, rate_str, pitch_str = compute_rate_pitch(persona, user_rate, mood, accent, clause_role)
            key_src = f"{voice_name}|{rate_str}|{pitch_str}|{text}"
            key = hashlib.sha256(key_src.encode("utf-8")).hexdigest()[:24]
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
                                with _TTS_LOCKS_GUARD:
                                    _TTS_WRITE_COUNTER += 1
                                    should_prune = (_TTS_WRITE_COUNTER % 20 == 0)
                                if should_prune:
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
            self.write_bytes_chunked(audio_bytes)
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": redact_api_keys(exc)[:180]})


class SanhaoHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128


class DualStackServer(SanhaoHTTPServer):
    address_family = socket.AF_INET6

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
            httpd = SanhaoHTTPServer((bind_host, PORT), SanhaoHandler)
    else:
        httpd = SanhaoHTTPServer((bind_host, PORT), SanhaoHandler)
    httpd.daemon_threads = True
    prune_tts_cache()
    status = "已啟用免費微軟神經多角色語音 (edge-tts)" if HAS_EDGE_TTS else "未安裝 edge-tts（自動退回瀏覽器本機語音）"
    scope_note = "區網開放" if bind_host in ("::", "0.0.0.0") else "僅本機 127.0.0.1"
    print(f"[三好・清茗茶席] 伺服器啟動：http://localhost:{PORT}/ （{scope_note}） | {status}", flush=True)
    if HAS_EDGE_TTS:
        threading.Thread(target=prewarm_common_lines, daemon=True).start()
    httpd.serve_forever()
