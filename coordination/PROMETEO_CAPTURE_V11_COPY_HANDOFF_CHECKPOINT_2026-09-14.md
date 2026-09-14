# Prometeo Capture V11 — Copy-only handoff checkpoint

Status: ACTIVE LAB IMPLEMENTATION / NOT HUMAN ACCEPTED YET
Date: 2026-09-14

## Why V11 exists

Mobile browser/app handoff remained unreliable when Capture tried to open a fresh ChatGPT tab/app automatically after an asynchronous sync + packet creation step.

The human explicitly chose a simpler temporary baseline:

- do not open ChatGPT automatically;
- generate the same tiny durable handoff packet;
- copy the tiny handoff prompt directly to the clipboard;
- human manually opens any ChatGPT chat, pastes, and sends.

This is intentionally lower automation but much higher reliability.

## Active behavior

### Direct

Swipe one note to the right far enough.

Capture:
1. syncs the selected note revision;
2. creates a DIRECT packet in the existing backend;
3. receives the generated ChatGPT URL;
4. extracts the tiny prompt from its `q` parameter;
5. copies that prompt to the clipboard;
6. does NOT navigate away from Capture;
7. shows a small confirmation bar: `Copiado · abrí ChatGPT · pegá · enviar`.

The copied text remains tiny, conceptually:

`PROMETEO DIRECT · DIRECT-...` + packet URL.

The raw notes are not copied into the clipboard.

### Planner

Dragging the global Prepare/Planner spring creates one PLANNER packet covering the active selected/new note batch, then copies its tiny handoff prompt instead of opening ChatGPT.

The Planner packet still has the existing contract:
- read all included heterogeneous notes;
- group related notes;
- split unrelated work;
- improve worker prompts;
- persist prepared jobs back into Prometeo;
- do NOT implement the product changes itself.

After the human pastes that one Planner handoff into a ChatGPT chat and the Planner completes, prepared job cards should appear in Capture.

### Prepared job / Produce

Launching a prepared job uses the same copy-only handoff mechanism. Its EXECUTE packet is generated, copied, and can be pasted into any fresh ChatGPT chat.

Thus all three paths share one temporary reliable transport UX:

- `PROMETEO PREPARE`
- `PROMETEO DIRECT`
- `PROMETEO EXECUTE`

=> generate packet => copy tiny handoff => human paste/send.

## Clipboard resilience

V11 first attempts `navigator.clipboard.writeText`.

If that fails, it falls back to a temporary hidden textarea + `document.execCommand('copy')`.

The latest handoff is also stored locally for several hours. A small bar exposes `Copiar otra vez` so a transient clipboard denial does not lose the generated packet.

## Preserve-first

V11 imports V9 and does not replace the accepted voice-input path.

Preserve:
- MediaRecorder-first voice capture;
- local Whisper Small candidate + Base fallback;
- Spanish forced;
- send while recording/transcribing;
- editing notes and audio insertion at cursor;
- swipe-left delete + Undo;
- long-press selection;
- temporary bundles;
- Planner vs Direct distinction;
- Planner-produced job cards;
- Prometeo Live / Control Room contracts.

V10 automatic-navigation code remains available as a donor but is no longer the active served Capture version.

## Served entry

`https://juanmanuelpm.github.io/prometeo/experiments/capture-lab/?v=11`

Active wrapper:

`experiments/capture-lab/capture-lab-v11.js`

## Human canaries still required

1. Swipe one note right => clipboard contains DIRECT handoff; Capture stays open.
2. Paste in ChatGPT => fresh chat can read packet and execute.
3. Global Planner spring with several notes => clipboard contains one PREPARE handoff.
4. Paste Planner handoff => Planner persists multiple prepared job cards.
5. Launch one job => EXECUTE handoff is copied rather than auto-opened.
6. If automatic clipboard write fails on target Android, `Copiar otra vez` succeeds from an explicit tap.
