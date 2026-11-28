#!/usr/bin/env python3
"""
Backend HTTP server, TTS profile, cache, and security unit tests (100% offline, sandbox-safe).
Run: python3 -m unittest tests/test_server.py -v
"""
import hashlib
import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server  # noqa: E402


class _MemorySocket:
    def __init__(self, raw_request: bytes):
        self._r = io.BytesIO(raw_request)
        self._w = io.BytesIO()
        self.raw_response = b""

    def makefile(self, mode, *args, **kwargs):
        if "r" in mode:
            return self._r
        sock = self

        class _CaptureWFile(io.BytesIO):
            def flush(self_w):
                sock.raw_response = self_w.getvalue()
                super().flush()

            def close(self_w):
                sock.raw_response = self_w.getvalue()
                super().close()

        self._w = _CaptureWFile()
        return self._w

    def sendall(self, data: bytes):
        self._w.write(data)


class _DummyServer:
    server_name = "127.0.0.1"
    server_port = 8788


def dispatch_handler(method: str, path: str, body: bytes | None = None, headers: dict | None = None):
    hdrs = {"Host": "127.0.0.1:8788", "Connection": "close"}
    if headers:
        hdrs.update(headers)
    if body is not None and "Content-Length" not in hdrs:
        hdrs["Content-Length"] = str(len(body))
    lines = [f"{method} {path} HTTP/1.0"] + [f"{k}: {v}" for k, v in hdrs.items()] + ["", ""]
    raw_req = ("\r\n".join(lines)).encode("latin-1") + (body or b"")

    sock = _MemorySocket(raw_req)
    server.SanhaoHandler(sock, ("127.0.0.1", 54321), _DummyServer())
    raw_resp = sock.raw_response or sock._w.getvalue()

    head_bytes, _, resp_body = raw_resp.partition(b"\r\n\r\n")
    head_lines = head_bytes.decode("latin-1").split("\r\n")
    status = int(head_lines[0].split(" ", 2)[1])
    resp_headers = {}
    for line in head_lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            resp_headers[k.strip()] = v.strip()
    return status, resp_headers, resp_body


class ServerTestCase(unittest.TestCase):
    def test_compute_rate_pitch_profiles(self):
        moods = ("normal", "panic", "accuse", "trust", "happy", "last_words", "host_night", "host_dawn")
        rates = (0.5, 0.96, 1.03, 1.13, 2.0, "invalid", None)
        for accent in ("anime", "tw"):
            table = server.VOICE_PROFILES_TW if accent == "tw" else server.VOICE_PROFILES_ANIME
            for persona in table:
                for mood in moods:
                    for ur in rates:
                        voice_name, rate_str, pitch_str = server.compute_rate_pitch(persona, ur, mood, accent)
                        self.assertTrue(voice_name)
                        self.assertTrue(rate_str.endswith("%"))
                        self.assertTrue(pitch_str.endswith("Hz"))
                        if voice_name == "zh-TW-YunJheNeural":
                            self.assertEqual((rate_str, pitch_str), ("+0%", "+0Hz"))
                        pitch_val = int(pitch_str[:-2])
                        self.assertGreaterEqual(pitch_val, -5)
                        self.assertLessEqual(pitch_val, 5)

    def test_static_etag_and_304(self):
        for path, cc_expect in (("/", "no-cache"), ("/ai.html", "no-cache"), ("/assets/models/asong.vrm", "max-age=3600")):
            status, headers, data = dispatch_handler("GET", path)
            self.assertEqual(status, 200, path)
            self.assertGreater(len(data), 256)
            if path == "/":
                self.assertIn(b"focalCenterCard", data)
            etag = headers.get("ETag")
            self.assertTrue(etag)
            self.assertIn(cc_expect, headers.get("Cache-Control", ""))

            status2, headers2, data2 = dispatch_handler("GET", path, headers={"If-None-Match": etag})
            self.assertEqual(status2, 304)
            self.assertEqual(data2, b"")
            self.assertEqual(headers2.get("ETag"), etag)

    def test_api_status_endpoints(self):
        status, _, data = dispatch_handler("GET", "/api/tts/status")
        self.assertEqual(status, 200)
        tts_info = json.loads(data.decode("utf-8"))
        self.assertTrue(tts_info.get("ok"))
        self.assertEqual(tts_info.get("voices"), len(server.VOICE_PROFILES))

        status2, _, data2 = dispatch_handler("GET", "/api/assets/status")
        self.assertEqual(status2, 200)
        assets_info = json.loads(data2.decode("utf-8"))
        self.assertTrue(assets_info.get("ok"))
        self.assertTrue(assets_info.get("hasHeroGlb"))
        self.assertEqual(assets_info.get("heroModel"), "assets/models/qingming.vrm")
        self.assertIn("hasPavilionGlb", assets_info)
        self.assertIn("pavilionModel", assets_info)
        for slug in ("player", "player_male", "xiaocheng", "nuannuan", "asong", "xinger", "xiaoyun", "azhu", "chenchen"):
            self.assertIn(slug, assets_info.get("seatModels", {}))

    def test_post_tts_validation_and_cache_hit(self):
        status404, _, _ = dispatch_handler("POST", "/api/unknown", body=b"{}")
        self.assertEqual(status404, 404)

        with patch.object(server, "HAS_EDGE_TTS", True):
            for bad_body in (
                b"{}",
                b'{"text": "   "}',
                b'{"text": null}',
                b"{not-json",
                b"[1, 2, 3]",
                b"\xff\xfe\xfd",
            ):
                st, _, data = dispatch_handler("POST", "/api/tts", body=bad_body)
                self.assertEqual(st, 400, f"Expected 400 for body={bad_body!r}, got {st} {data!r}")

            st_bad_len, _, _ = dispatch_handler("POST", "/api/tts", body=b"", headers={"Content-Length": "abc"})
            self.assertEqual(st_bad_len, 400)

            st_neg_len, _, _ = dispatch_handler("POST", "/api/tts", body=b"", headers={"Content-Length": "-5"})
            self.assertEqual(st_neg_len, 400)

            oversized = b'{"text": "' + (b"a" * 17000) + b'"}'
            st413, _, _ = dispatch_handler("POST", "/api/tts", body=oversized)
            self.assertEqual(st413, 413)

            probe_text = "__test_cache_hit_verification_only__"
            voice_name, rate_str, pitch_str = server.compute_rate_pitch("暖暖", 0.96, "normal", "anime")
            cache_key = hashlib.sha256(f"{voice_name}|{rate_str}|{pitch_str}|{probe_text}".encode("utf-8")).hexdigest()[:24]
            mp3_path = server.CACHE_DIR / f"{cache_key}.mp3"
            fake_mp3 = b"ID3FAKEAUDIOBYTES" * 16
            mp3_path.write_bytes(fake_mp3)
            try:
                payload = json.dumps({"text": probe_text, "persona": "暖暖", "mood": "normal", "accent": "anime", "rate": 0.96}).encode("utf-8")
                st200, hdrs200, body200 = dispatch_handler("POST", "/api/tts", body=payload, headers={"Content-Type": "application/json"})
                self.assertEqual(st200, 200)
                self.assertEqual(hdrs200.get("Content-Type"), "audio/mpeg")
                self.assertEqual(body200, fake_mp3)
            finally:
                if mp3_path.exists():
                    mp3_path.unlink()

    def test_security_blocks_dotfiles_and_source(self):
        for blocked in (
            "/.gitignore",
            "/.env",
            "/.tts_cache/",
            "/.venv/",
            "/server.py",
            "/server.py#",
            "/Server.py",
            "/api/gemini.js",
            "/api/tts.js",
            "/API/tts.js",
            "/tests/smoke.mjs",
            "/tools/blender_sanctuary_guide.py",
            "/__pycache__/",
            "/%2e%2e/etc/passwd",
            "/assets/../server.py",
        ):
            st, _, _ = dispatch_handler("GET", blocked)
            self.assertEqual(st, 403, f"Expected 403 for GET {blocked}, got {st}")

        for head_blocked in ("/.env", "/server.py", "/Server.py", "/api/tts.js"):
            st_h, _, _ = dispatch_handler("HEAD", head_blocked)
            self.assertEqual(st_h, 403, f"Expected 403 for HEAD {head_blocked}, got {st_h}")

        st_head_ok, _, head_body = dispatch_handler("HEAD", "/ai.html")
        self.assertEqual(st_head_ok, 200)
        self.assertEqual(head_body, b"")

        st_origin_null_tts, _, _ = dispatch_handler(
            "POST",
            "/api/tts",
            body=b'{"text":"hi"}',
            headers={"Origin": "null"},
        )
        self.assertEqual(st_origin_null_tts, 403)

        st_origin_null_gem, _, _ = dispatch_handler(
            "POST",
            "/api/gemini",
            body=b'{"prompt":"hi"}',
            headers={"Origin": "null"},
        )
        self.assertEqual(st_origin_null_gem, 403)

    def test_tts_key_lock_consistency(self):
        lk_a1 = server.get_tts_key_lock("same_key_test")
        lk_a2 = server.get_tts_key_lock("same_key_test")
        lk_b = server.get_tts_key_lock("other_key_test")
        self.assertIs(lk_a1, lk_a2)
        self.assertIsNot(lk_a1, lk_b)

    def test_local_llm_endpoints(self):
        with patch.object(server, "query_ollama_models", return_value=(True, ["qwen3:8b", "gemma3:12b"])):
            st, _, data = dispatch_handler("GET", "/api/local-llm/status")
            self.assertEqual(st, 200)
            info = json.loads(data.decode("utf-8"))
            self.assertTrue(info.get("ok"))
            self.assertTrue(info.get("running"))
            self.assertEqual(info.get("models"), ["qwen3:8b", "gemma3:12b"])

        for bad in (b"{}", b'{"model":"bad model!","prompt":"hi"}', b'{"model":"qwen3:8b","prompt":"  "}', b"{bad-json"):
            st400, _, _ = dispatch_handler("POST", "/api/local-llm", body=bad)
            self.assertEqual(st400, 400)

        oversized = b'{"model":"qwen3:8b","prompt":"' + (b"x" * 50000) + b'"}'
        st413, _, _ = dispatch_handler("POST", "/api/local-llm", body=oversized)
        self.assertEqual(st413, 413)

        class _FakeResp:
            def __init__(self, payload_bytes):
                self._b = payload_bytes

            def read(self):
                return self._b

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        fake_out = json.dumps({"response": '<think>內心思考</think>{"text":"您好"}'}, ensure_ascii=False).encode("utf-8")
        with patch("urllib.request.urlopen", return_value=_FakeResp(fake_out)):
            req_body = json.dumps({"model": "qwen3:8b", "prompt": "請發言", "jsonMode": True}).encode("utf-8")
            st200, _, resp_bytes = dispatch_handler("POST", "/api/local-llm", body=req_body)
            self.assertEqual(st200, 200)
            res_obj = json.loads(resp_bytes.decode("utf-8"))
            self.assertTrue(res_obj.get("ok"))
            self.assertEqual(res_obj.get("text"), '{"text":"您好"}')

    def test_cross_origin_post_blocked_and_cache_prune(self):
        st_bad, _, _ = dispatch_handler(
            "POST",
            "/api/tts",
            body=b'{"text":"hi"}',
            headers={"Origin": "https://evil.example"},
        )
        self.assertEqual(st_bad, 403)

        st_ok_origin, _, _ = dispatch_handler(
            "POST",
            "/api/local-llm",
            body=b"{}",
            headers={"Origin": "http://localhost:8788"},
        )
        self.assertEqual(st_ok_origin, 400)  # Origin allowed; fails JSON validation as expected

        import tempfile
        import os as _os
        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            for idx in range(5):
                fp = td_path / f"sample_{idx}.mp3"
                fp.write_bytes(b"0" * 512)
                _os.utime(fp, (1000 + idx * 10, 1000 + idx * 10))
            removed = server.prune_tts_cache(cache_dir=td_path, max_files=3, max_bytes=1024 * 1024)
            self.assertEqual(removed, 2)
            remaining = sorted(p.name for p in td_path.glob("*.mp3"))
            self.assertEqual(remaining, ["sample_2.mp3", "sample_3.mp3", "sample_4.mp3"])

    def test_feedback_endpoint_and_privacy_block(self):
        import tempfile

        for bad_body in (b"{}", b'{"message":" "}', b'{"message":"a"}', b"{not-json"):
            st400, _, _ = dispatch_handler("POST", "/api/feedback", body=bad_body)
            self.assertEqual(st400, 400)

        oversized = b'{"message":"' + (b"x" * 9000) + b'"}'
        st413, _, _ = dispatch_handler("POST", "/api/feedback", body=oversized)
        self.assertEqual(st413, 413)

        st_get_blocked, _, _ = dispatch_handler("GET", "/.feedback_inbox/feedback.jsonl")
        self.assertEqual(st_get_blocked, 403)

        with tempfile.TemporaryDirectory() as td:
            td_inbox = Path(td) / ".feedback_inbox"
            with patch.object(server, "FEEDBACK_DIR", td_inbox):
                payload = json.dumps({
                    "category": "ui",
                    "rating": 5,
                    "nickname": "測試茶客",
                    "message": "坐席視角很棒，右上角反饋按鈕很好找！",
                    "diagnostics": {"version": "v9.0", "totalSeats": 12},
                }, ensure_ascii=False).encode("utf-8")
                st200, _, resp_bytes = dispatch_handler("POST", "/api/feedback", body=payload)
                self.assertEqual(st200, 200)
                res = json.loads(resp_bytes.decode("utf-8"))
                self.assertTrue(res.get("ok"))
                self.assertTrue(res.get("saved"))
                saved_file = td_inbox / "feedback.jsonl"
                self.assertTrue(saved_file.exists())
                saved_lines = saved_file.read_text(encoding="utf-8").strip().splitlines()
                self.assertEqual(len(saved_lines), 1)
                row = json.loads(saved_lines[0])
                self.assertEqual(row.get("category"), "ui")
                self.assertEqual(row.get("rating"), 5)
                self.assertIn("坐席視角", row.get("message", ""))

    def test_v13_clause_prosody_and_gemini_tts_cache(self):
        # 1. Clause-level prosody arc stays strictly within ±5Hz & shapes open < climax and close < climax
        for role in server.ALLOWED_CLAUSE_ROLES:
            v_name, r_str, p_str = server.compute_rate_pitch("小澄", 0.96, "accuse", "anime", role)
            self.assertTrue(v_name)
            p_val = int(p_str[:-2])
            self.assertGreaterEqual(p_val, -5)
            self.assertLessEqual(p_val, 5)
        _, r_open, _ = server.compute_rate_pitch("小澄", 0.96, "normal", "anime", "open")
        _, r_climax, _ = server.compute_rate_pitch("小澄", 0.96, "normal", "anime", "climax")
        _, r_close, _ = server.compute_rate_pitch("小澄", 0.96, "normal", "anime", "close")
        self.assertLess(int(r_open[:-1]), int(r_climax[:-1]))
        self.assertLess(int(r_close[:-1]), int(r_climax[:-1]))

        # 2. Spoken Mandarin digit & rhythm naturalizer
        nat = server.naturalize_mandarin_text("我覺得 12號 與 03號 票型不對；警長 1.5票 很關鍵")
        self.assertIn("十二號", nat)
        self.assertIn("三號", nat)
        self.assertIn("一點五票", nat)
        self.assertNotIn("；", nat)

        # 3. Gemini 3.8 TTS disk cache endpoint: 401 without key on miss, 200 audio/wav on disk cache hit
        miss_body = json.dumps({"voice": "Kore", "style": "warm", "text": "__uncached_v13_probe__"}).encode("utf-8")
        st401, _, _ = dispatch_handler("POST", "/api/tts/gemini", body=miss_body)
        self.assertEqual(st401, 401)

        probe_txt = "<breath> 觀此席間，破綻昭然。"
        probe_style = "低沉古風男聲"
        clean_probe = server.sanitize_transcript_for_tts(probe_txt)
        gem_key = "gem_" + hashlib.sha256(f"Charon|{clean_probe}".encode("utf-8")).hexdigest()[:24]
        wav_path = server.CACHE_DIR / f"{gem_key}.wav"
        fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt " + (b"\x00" * 160)
        wav_path.write_bytes(fake_wav)
        try:
            hit_body = json.dumps({"voice": "Charon", "style": probe_style, "text": probe_txt}, ensure_ascii=False).encode("utf-8")
            st200, hdrs200, data200 = dispatch_handler("POST", "/api/tts/gemini", body=hit_body)
            self.assertEqual(st200, 200)
            self.assertEqual(hdrs200.get("Content-Type"), "audio/wav")
            self.assertEqual(data200, fake_wav)
        finally:
            if wav_path.exists():
                wav_path.unlink()

    def test_v135_gemini_proxy_status_and_api_source_blocked(self):
        # Serverless source file under /api/ must never be downloadable via static server
        st_src, _, _ = dispatch_handler("GET", "/api/gemini.js")
        self.assertEqual(st_src, 403)

        # Without GEMINI_API_KEY, GET /api/gemini reports available=False & POST returns 503
        with patch.object(server, "get_server_gemini_key", return_value=""):
            st_get, _, raw_get = dispatch_handler("GET", "/api/gemini")
            self.assertEqual(st_get, 200)
            info = json.loads(raw_get.decode("utf-8"))
            self.assertTrue(info.get("ok"))
            self.assertFalse(info.get("available"))

            st_post503, _, _ = dispatch_handler("POST", "/api/gemini", body=b'{"prompt":"hello"}')
            self.assertEqual(st_post503, 503)

        # With server key & mocked upstream call, POST /api/gemini succeeds cleanly & rejects empty/bad bodies
        with patch.object(server, "get_server_gemini_key", return_value="fake-test-key"), \
             patch.object(server, "call_gemini_text_rest", return_value=("連線成功", "gemini-3.5-flash-lite")):
            st_empty, _, _ = dispatch_handler("POST", "/api/gemini", body=b'{"prompt":"  "}')
            self.assertEqual(st_empty, 400)

            st_ok, _, raw_ok = dispatch_handler("POST", "/api/gemini", body=b'{"prompt":"test","model":"gemini-4-argon"}')
            self.assertEqual(st_ok, 200)
            res = json.loads(raw_ok.decode("utf-8"))
            self.assertTrue(res.get("ok"))
            self.assertEqual(res.get("text"), "連線成功")
            self.assertEqual(res.get("model"), "gemini-3.5-flash-lite")
            self.assertIn("gemini-3.8-flash", server.ALLOWED_PROXY_GEMINI_MODELS)

        # v20.0 tiered temperature clamping [0.45, 0.85] (default 0.65)
        self.assertEqual(server.clamp_gemini_temperature(0.58), 0.58)
        self.assertEqual(server.clamp_gemini_temperature(0.78), 0.78)
        self.assertEqual(server.clamp_gemini_temperature(0.1), 0.45)
        self.assertEqual(server.clamp_gemini_temperature(1.9), 0.85)
        self.assertEqual(server.clamp_gemini_temperature(None), 0.65)
        with patch.object(server, "get_server_gemini_key", return_value="fake-test-key"), \
             patch.object(server, "call_gemini_text_rest", return_value=("分階段溫度回應", "gemini-3.5-flash-lite")) as mock_call:
            st_t, _, _ = dispatch_handler("POST", "/api/gemini", body=b'{"prompt":"test","temperature":0.95}')
            self.assertEqual(st_t, 200)
            _, kwargs = mock_call.call_args
            self.assertEqual(kwargs.get("temperature"), 0.85)

    def test_v244_strip_vocal_tags_on_fallback(self):
        import base64
        import urllib.error

        self.assertEqual(
            server.strip_gemini_vocal_tags("哈囉，<breath> 大家好。<short pause> 開始吧！"),
            "哈囉， 大家好。 開始吧！",
        )
        calls = []

        class _FakeResp:
            def __init__(self, payload_bytes):
                self._payload = payload_bytes

            def read(self):
                return self._payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def fake_urlopen(req, timeout=None):
            body = json.loads(req.data.decode("utf-8"))
            calls.append((req.full_url, body))
            if "gemini-3.8-flash-lite-tts" in req.full_url:
                raise urllib.error.HTTPError(
                    req.full_url,
                    400,
                    "Bad Request",
                    hdrs=None,
                    fp=io.BytesIO(b'{"error":"bad voice"}'),
                )
            raw_pcm = b"\x10\x00" * 1600
            b64 = base64.b64encode(raw_pcm).decode("ascii")
            return _FakeResp(
                json.dumps(
                    {
                        "candidates": [
                            {
                                "content": {
                                    "parts": [
                                        {"inlineData": {"mimeType": "audio/L16;rate=24000", "data": b64}}
                                    ]
                                }
                            }
                        ]
                    }
                ).encode("utf-8")
            )

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            wav_bytes, mime_type = server.call_gemini_tts_wav(
                api_key="test-key",
                text="<breath> 各位警長請看三號。<short pause> 慢慢說。",
                voice_name="Charon",
                style_prompt="冷靜沉穩",
                timeout=5,
            )

        self.assertEqual(mime_type, "audio/wav")
        self.assertTrue(wav_bytes.startswith(b"RIFF"))
        self.assertGreaterEqual(len(calls), 2)
        part_38_lite = calls[0][1]["contents"][0]["parts"][0]
        part_38_flash = calls[-1][1]["contents"][0]["parts"][0]
        self.assertIn("gemini-3.8-flash-lite-tts", calls[0][0])
        self.assertNotIn("speechMetadata", part_38_lite)
        self.assertNotIn("<breath>", part_38_lite["text"])
        self.assertNotIn("<short pause>", part_38_lite["text"])
        self.assertNotIn("請用以下口吻", part_38_lite["text"])
        self.assertNotIn("冷靜沉穩", part_38_lite["text"])
        self.assertFalse(part_38_lite["text"].startswith("Say:"))
        self.assertIn("gemini-3.8-flash-tts", calls[-1][0])
        self.assertNotIn("speechMetadata", part_38_flash)
        self.assertNotIn("<breath>", part_38_flash["text"])
        self.assertIn("警長", part_38_flash["text"])
        body_25_compat = server.build_tts_request_body("gemini-2.5-flash-preview-tts", "警長好，我是直心糾察長", "Kore", False)
        self.assertTrue(body_25_compat["contents"][0]["parts"][0]["text"].startswith("Say: "))
        self.assertIn("直心糾察掌", body_25_compat["contents"][0]["parts"][0]["text"])
        self.assertEqual(server.resolve_primary_tts_model("gemini-2.5-flash-preview-tts"), "gemini-3.8-flash-lite-tts")
        self.assertEqual(server.normalize_tts_polyphones("直心糾察長、糾察長、警長、社長"), "直心糾察掌、糾察掌、警長、社長")

    def test_v244_edge_male_voice_fallback_retry(self):
        import asyncio
        import base64
        import pathlib
        import tempfile
        import types
        import urllib.error

        self.assertIn("zh-CN-YunxiNeural", server.EDGE_VOICE_FALLBACK_MAP)
        self.assertIn("zh-CN-YunjianNeural", server.EDGE_VOICE_FALLBACK_MAP)
        self.assertIn("zh-TW-YunJheNeural", server.EDGE_VOICE_FALLBACK_MAP)
        self.assertEqual(server.GEMINI_TTS_VOICE_FALLBACK.get("Fenrir"), "Puck")

        edge_attempts = []

        class _FakeEdgeComm:
            def __init__(self, text=None, voice=None, rate=None, pitch=None):
                self.voice = voice
                self.text = text

            async def save(self, out_path):
                edge_attempts.append(self.voice)
                if len(edge_attempts) == 1:
                    raise RuntimeError("transient upstream male voice 503")
                pathlib.Path(out_path).write_bytes(b"ID3fake-mp3-data")

        fake_edge_mod = types.SimpleNamespace(Communicate=_FakeEdgeComm)
        with patch.object(server, "edge_tts", fake_edge_mod):
            with tempfile.TemporaryDirectory() as tmpd:
                out_file = pathlib.Path(tmpd) / "yunxi_retry.mp3"
                asyncio.run(server.synthesize_edge_mp3("大家好", "zh-CN-YunxiNeural", "+3%", "+1Hz", out_file))
                self.assertEqual(edge_attempts, ["zh-CN-YunxiNeural", "zh-CN-YunjianNeural"])
                self.assertTrue(out_file.exists())

        calls_mid = []

        class _FakeResp2:
            def __init__(self, payload_bytes):
                self._payload = payload_bytes

            def read(self):
                return self._payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def fake_urlopen_mid(req, timeout=None):
            calls_mid.append(req.full_url)
            if "gemini-3.8-flash-lite-tts" in req.full_url or "gemini-3.8-flash-tts" in req.full_url:
                raise urllib.error.HTTPError(req.full_url, 503, "Busy", hdrs=None, fp=io.BytesIO(b"{}"))
            raw_pcm = b"\x10\x00" * 1600
            b64 = base64.b64encode(raw_pcm).decode("ascii")
            return _FakeResp2(
                json.dumps(
                    {
                        "candidates": [
                            {"content": {"parts": [{"inlineData": {"mimeType": "audio/L16;rate=24000", "data": b64}}]}}
                        ]
                    }
                ).encode("utf-8")
            )

        with patch("urllib.request.urlopen", side_effect=fake_urlopen_mid):
            wav_b, mime_t = server.call_gemini_tts_wav("test-key", "這輪先投三號", "Fenrir", "沉穩", timeout=5)
        self.assertEqual(mime_t, "audio/wav")
        self.assertTrue(wav_b.startswith(b"RIFF"))
        self.assertTrue(any("gemini-2.5-flash-preview-tts" in u for u in calls_mid))

    def test_v2552_flash25_zero_thinking_budget(self):
        seen_bodies = []

        class _FakeTextResp:
            def __init__(self, payload_bytes):
                self._payload = payload_bytes

            def read(self):
                return self._payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def fake_text_open(req, timeout=None):
            seen_bodies.append((req.full_url, json.loads(req.data.decode("utf-8"))))
            return _FakeTextResp(json.dumps({"candidates": [{"content": {"parts": [{"text": "測試回應"}]}}]}).encode("utf-8"))

        with patch("urllib.request.urlopen", side_effect=fake_text_open):
            txt1, mdl1 = server.call_gemini_text_rest("test-key", "gemini-2.5-flash", "你好")
            txt2, mdl2 = server.call_gemini_text_rest("test-key", "gemini-2.5-flash-lite", "你好")
        self.assertEqual((txt1, mdl1), ("測試回應", "gemini-3.5-flash-lite"))
        self.assertEqual((txt2, mdl2), ("測試回應", "gemini-2.5-flash-lite"))
        self.assertEqual(seen_bodies[0][1]["generationConfig"].get("thinkingConfig"), {"thinkingLevel": "minimal"})
        self.assertNotIn("temperature", seen_bodies[0][1]["generationConfig"])
        self.assertEqual(seen_bodies[1][1]["generationConfig"].get("thinkingConfig"), {"thinkingBudget": 0})
        sanitized_38 = server.sanitize_gemini_text_body(
            "gemini-3.8-flash",
            {
                "contents": [{"role": "user", "parts": [{"text": "hi"}]}, {"role": "model", "parts": [{"text": "trail"}]}],
                "generationConfig": {"temperature": 0.7, "topP": 0.9, "topK": 40, "thinkingConfig": {"thinkingBudget": 256}},
            },
        )
        self.assertEqual(len(sanitized_38["contents"]), 1)
        self.assertEqual(sanitized_38["generationConfig"].get("thinkingConfig"), {"thinkingLevel": "low"})
        for bad_k in ("temperature", "topP", "topK"):
            self.assertNotIn(bad_k, sanitized_38["generationConfig"])


if __name__ == "__main__":
    unittest.main()
