# Web Speech STT privacy boundary

This surface is a static browser demo. Prometeo does not capture raw microphone bytes and does not send recognized transcript text to a Prometeo backend, repository receipt, worker heartbeat, durable telemetry stream, browser storage, or file sink.

`tests/test_stt_private_receipt_privacy.py` is the executable regression guard for that claim. It fails closed if the repo-owned STT script gains a network/durable sink (`fetch`, XHR, Beacon, WebSocket, browser storage, writable-file APIs, or form serialization), if it begins capturing raw microphone bytes (`getUserMedia`, `MediaRecorder`, `AudioContext`), or if recognized transcript state is serialized into an obvious persistence/egress shape.

A passing guard emits a machine-readable **redacted receipt**. The receipt contains only the audited surface, a hash of the static page, aggregate check count, and booleans/status labels. It never contains audio or recognized text.

## What this proves

For the checked Prometeo page version, recognized text stays in JavaScript memory/DOM except for the explicit user-triggered clipboard action. The repo-owned page has no durable/network path that can persist private transcript or raw audio into repo-visible telemetry/artifacts. Adding one of the guarded sinks makes the test fail until the privacy contract is deliberately revised.

## What this does not prove

`SpeechRecognition` / `webkitSpeechRecognition` is implemented by the browser. A browser vendor may process speech remotely. This guard does not claim browser-level recognition is local or private from the browser vendor; the UI already discloses that boundary. It specifically protects Prometeo-owned persistence and telemetry.

## Verification

From repository root:

```sh
python3 tests/test_stt_private_receipt_privacy.py
```

Expected exit status: `0`. Expected stdout: one JSON receipt with `status:"PASS"`, `private_transcript:"REDACTED_NOT_EMITTED"`, and `repo_visible_private_payload_persisted:false`.
