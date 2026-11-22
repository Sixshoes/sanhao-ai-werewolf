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
        for path, cc_expect in (("/ai.html", "no-cache"), ("/assets/models/asong.vrm", "max-age=3600")):
            status, headers, data = dispatch_handler("GET", path)
            self.assertEqual(status, 200, path)
            self.assertGreater(len(data), 256)
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
            "/.tts_cache/",
            "/.venv/",
            "/server.py",
            "/tests/smoke.mjs",
            "/tools/blender_sanctuary_guide.py",
            "/__pycache__/",
            "/%2e%2e/etc/passwd",
            "/assets/../server.py",
        ):
            st, _, _ = dispatch_handler("GET", blocked)
            self.assertEqual(st, 403, f"Expected 403 for {blocked}, got {st}")

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


if __name__ == "__main__":
    unittest.main()
