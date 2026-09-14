# Prometeo Capture — Voice Input Baseline

Status: HUMAN-CONFIRMED WORKING BASELINE (2026-09-14)
Scope: voice/text Capture input mechanics only. This does **not** promote the whole Capture product, Navigator, or any served Prometeo surface to Human Accepted/Current.

## Human decision

The user explicitly confirmed that the Capture Lab voice-input path works on the target Android device and asked that the successful mechanism be preserved in Prometeo so future work does not rediscover or regress it.

## Working architecture

1. **Capture is MediaRecorder-first.** `getUserMedia()` + `MediaRecorder` own recording. Do not run browser `SpeechRecognition` in parallel with the same recording as the authoritative transcript path.
2. **Stop means preserve first.** When the user stops, the recorder finalizes the Blob and the raw audio is written to IndexedDB before transcription is treated as authoritative.
3. **Decode locally.** The saved Blob is decoded with `AudioContext`, mixed to mono when necessary, and resampled through `OfflineAudioContext` to 16 kHz Float32 PCM.
4. **Whisper runs outside the UI thread.** Transcription is performed in a dedicated module Web Worker. Model/inference work must not block the composer, typing, navigation, or another recording.
5. **Lazy engine initialization.** The worker and Whisper pipeline are created only when transcription is first needed. A transcription-engine failure must never prevent the `+` button or basic note UI from opening.
6. **Serial inference queue.** Multiple captured audios may be pending at once, but Whisper inference is serialized. Users may record B while A transcribes; A and B must not compete for inference memory simultaneously.
7. **Model baseline.** `onnx-community/whisper-base`, Spanish transcription, with encoder kept `fp32` and merged decoder `q4`; prefer WebGPU when available and fall back to WASM. Do not silently downgrade to Tiny as the default quality path.
8. **No fake global progress.** Model downloads may contain multiple files whose individual percentages reset. The product UI should expose semantic states (`preparando modelo`, `transcribiendo audio`) rather than a misleading aggregate percentage.
9. **Durable diagnostics.** Keep stage logging for microphone request, recording, audio finalization/storage, decoding, PCM preparation, worker queue, model load, inference, completion/failure. Keep playback of the saved raw audio, retry of the same audio, and copyable diagnostics.
10. **Raw audio survives ASR failure.** A failed transcript must never destroy the source audio. Retrying transcription must not require recording again.

## Proven UX baseline

- `+` opens the composer without focusing the text field or opening the keyboard.
- The keyboard appears only after the user taps in the editable text area.
- The recording control is a physical 3D slider: the movable puck has no microphone icon; the microphone mark sits on the opposite side and is covered when recording starts, while a previously hidden red recording light is revealed and blinks.
- Recording can coexist with already-running background transcription.
- Pending transcription is represented inline as a small animated token inside the note text flow.

## New non-regression UX rules added after acceptance

- **Send while recording:** tapping Send during recording implicitly stops/finalizes the audio and saves the note immediately. The user must not have to toggle the microphone off first.
- **Send while transcribing:** a note may be saved while one or more audio segments are still transcribing. The saved note displays the pending animated transcription token and updates itself when the transcript arrives.
- **Editable notes:** tapping a saved note reopens the same composer. Text can be inserted or removed normally.
- **Audio inside an edit:** while editing a saved note, the user may place the cursor anywhere and record another audio segment. The pending transcription token is inserted at that cursor position, so audio can be added at the beginning, middle, or end.
- **Reload recovery:** saved notes with pending audio segments should requeue their stored audio after reload when the Blob is still available.

## Spanish quality profile — preserve-first tuning

- The working worker already forces **Spanish** explicitly with `language: 'spanish'` and `task: 'transcribe'`. Do not remove this for normal Spanish Capture input or fall back to automatic language detection by default.
- Language forcing is useful for short/noisy monolingual Spanish clips because it removes language-identification uncertainty; it does not by itself control comma placement, capitalization, paragraphing, or spacing. Those are primarily model-decoding quality issues.
- The currently accepted reliability baseline remains **whisper-base**. Do not overwrite it merely to chase accuracy.
- Accuracy experiments should be introduced as **candidate quality profiles** and must fall back to the accepted base path. The first candidate to compare is multilingual **whisper-small on WebGPU**, because the larger model has materially more capacity than base. Never require small on devices that cannot load it reliably.
- Quality comparisons must reuse the **same saved audio clips** and compare transcript error, punctuation, omissions, names, accents, and latency. Do not judge by one anecdotal sample.
- Prefer quality over speed for this user's Capture workflow, but not at the cost of losing the ability to save notes, keep raw audio, retry, or continue recording while transcription runs.
- If later punctuation cleanup is added, it must be a **second, reversible post-processing stage** over the raw Whisper transcript. Preserve the raw ASR transcript and source audio so a formatter cannot silently corrupt the evidence.

## Reference implementation

Served experiment: `experiments/capture-lab/`

Primary files:
- `experiments/capture-lab/index.html`
- `experiments/capture-lab/capture-lab.css`
- `experiments/capture-lab/capture-lab.js`
- `experiments/capture-lab/transcriber-worker.js`

The experiment is a donor/reference for Prometeo Capture voice input. Preserve the mechanism surgically when integrating it elsewhere; do not replace it with a clean-slate recorder unless the human explicitly rejects this baseline.