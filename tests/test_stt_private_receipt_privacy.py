#!/usr/bin/env python3
"""Fail-closed privacy regression guard for the static Web Speech STT surface.

This guard intentionally never consumes real audio or transcript text. It verifies that the
repo-owned page keeps recognized text request/session-scoped and has no durable/network sink
owned by Prometeo. On success it emits a redacted receipt containing only structural evidence.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "audio-lab" / "web-speech" / "index.html"

# Adding any of these to the repo-owned STT script is a privacy-sensitive change and must fail
# this guard until an explicit, reviewed redaction contract is added.
FORBIDDEN_DURABLE_OR_EGRESS_SINKS = (
    "fetch(",
    "XMLHttpRequest",
    "navigator.sendBeacon",
    "WebSocket(",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "showSaveFilePicker",
    "FileSystemWritableFileStream",
    "FormData(",
)

# The demo must not capture raw microphone bytes itself. SpeechRecognition may be implemented
# remotely by the browser vendor; that boundary is documented separately and is not Prometeo
# repo-visible telemetry.
FORBIDDEN_RAW_AUDIO_CAPTURE = (
    "getUserMedia(",
    "MediaRecorder(",
    "AudioContext(",
    "webkitAudioContext(",
)


def script_text(html: str) -> str:
    blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, flags=re.I | re.S)
    if not blocks:
        raise AssertionError("STT page has no inline script to audit")
    return "\n".join(blocks)


def run_guard() -> dict[str, object]:
    html = PAGE.read_text(encoding="utf-8")
    script = script_text(html)

    required_markers = (
        "window.SpeechRecognition || window.webkitSpeechRecognition",
        "event.results[i][0].transcript",
        "navigator.clipboard.writeText(finalText.trim())",
    )
    missing = [marker for marker in required_markers if marker not in script]
    if missing:
        raise AssertionError(f"expected STT privacy-flow marker missing: {missing}")

    sinks = [token for token in FORBIDDEN_DURABLE_OR_EGRESS_SINKS if token in script]
    if sinks:
        raise AssertionError(
            "private STT text gained a repo-owned durable/network sink; review/redact before merge: "
            + ", ".join(sinks)
        )

    raw_audio = [token for token in FORBIDDEN_RAW_AUDIO_CAPTURE if token in script]
    if raw_audio:
        raise AssertionError(
            "private STT surface started capturing raw audio; add an explicit private-audio contract first: "
            + ", ".join(raw_audio)
        )

    # A future serializer is not allowed to silently turn transcript state into telemetry.
    serialization_patterns = (
        r"JSON\.stringify\s*\([^)]*(?:finalText|interim|transcript)",
        r"URLSearchParams\s*\([^)]*(?:finalText|interim|transcript)",
    )
    leaking_serializers = [p for p in serialization_patterns if re.search(p, script, flags=re.I | re.S)]
    if leaking_serializers:
        raise AssertionError("private STT text is being serialized for persistence/egress")

    return {
        "schema": "prometeo.stt-private-receipt-privacy-guard/v1",
        "status": "PASS",
        "surface": "audio-lab/web-speech",
        "page_sha256": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "checks_passed": 4,
        "private_audio": "NOT_CAPTURED_BY_PROMETEO_PAGE",
        "private_transcript": "REDACTED_NOT_EMITTED",
        "repo_visible_private_payload_persisted": False,
    }


def main() -> int:
    try:
        receipt = run_guard()
    except (AssertionError, OSError) as exc:
        print(f"STT_PRIVACY_GUARD_FAIL: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
