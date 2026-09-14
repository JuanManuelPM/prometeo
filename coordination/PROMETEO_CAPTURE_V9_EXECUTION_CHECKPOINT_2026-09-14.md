# Prometeo Capture V9 — Execution Checkpoint

Status: ACTIVE LAB IMPLEMENTATION / NOT HUMAN ACCEPTED YET
Date: 2026-09-14

This checkpoint records the first material implementation of the master design in `coordination/PROMETEO_CAPTURE_PLANNER_DIRECT_LIVE_MASTER_SPEC_2026-09-14.md`.

It exists so another chat can continue without reconstructing the design from conversation history.

## Already human-confirmed before V9

The following must be preserved:

- Capture voice input works on the target Android device.
- MediaRecorder-first capture.
- raw audio survives ASR failure.
- local Whisper worker.
- Spanish explicitly forced.
- Whisper Small candidate with Base fallback.
- user may send while recording.
- saved note may remain visible while transcription finishes in background.
- notes are editable.
- new audio may be inserted at cursor position while editing.
- the V8 handoff proved a fresh ChatGPT can receive only a tiny external packet link, read the packet, use GitHub, build a real Prometeo Live surface and publish it.
- the football/Selección canary succeeded end-to-end, but the user observed that the TV remained visually idle until the final page was complete.

Do not treat that successful V8 direct canary as proof of the Planner workflow or of V9 gestures.

---

# V9 active Capture implementation

Served entry:

`https://juanmanuelpm.github.io/prometeo/experiments/capture-lab/?v=9`

Active wrapper:

`experiments/capture-lab/capture-lab-v9.js`

V9 imports V8 rather than replacing the accepted voice-input path.

## Inbox hygiene

### Swipe left = delete

A note can now be swiped left past a deliberate threshold.

Behavior:

1. note disappears immediately from the active inbox;
2. a short `Deshacer` affordance appears;
3. remote tombstone is delayed for roughly four seconds so Undo remains cheap;
4. after the window, the backend marks the note deleted;
5. the local Storage write path filters deleted note IDs, so an old in-memory transcription completion cannot re-persist and visually resurrect a deleted note.

Bulk deletion uses the same model and one Undo operation for the full selection.

### Old submitted notes leave the active inbox

After a successful Planner or Direct dispatch, the involved note IDs become locally archived for the active view. The full local note material is copied into `captureLabHistoryV9` and is not destroyed.

This intentionally fixes the prior problem where every experimental note remained in the main inbox forever.

Important current limitation: V9 stores history but does not yet expose a polished History UI. Pre-V9 notes are not automatically guessed as obsolete; they remain visible until the human deletes or dispatches them.

---

# Selection / temporary bundles

Long-press a note enters selection mode.

While selection mode is active:

- tap other notes to add/remove them;
- no permanent checkboxes clutter ordinary cards;
- a temporary bottom dock appears;
- the selection can be deleted, sent to Planner, or sent Direct.

This is a temporary bundle, not a forced permanent category/folder.

---

# Two dispatch paths are now materially separate

## PREPARAR = Planner / Prompt Compiler

The global `Preparar` rail no longer means execute the raw notes.

It now dispatches the currently active notes with `mode=planner` and opens a fresh ChatGPT with a tiny handoff:

`PROMETEO PREPARE · <code>`
`<packet_url>`

The Planner packet explicitly instructs the AI to:

- read all selected raw notes;
- account for every note;
- merge related comments;
- split unrelated work;
- allow one source note to participate in multiple jobs;
- recover durable Prometeo context only as needed;
- create strong fresh-worker prompts;
- persist prepared jobs;
- NOT execute the requested product changes itself.

The lab Planner persists prepared jobs through the connected Supabase tool using the helper:

`public.prometeo_live_lab_submit_jobs_v1(planner_code, jobs_jsonb)`

This is a lab mechanism. It is not yet the final production authorization model.

## DIRECTO = bypass Planner

For a coherent request that does not need another AI to reorganize it:

- swipe one note right far enough, or
- long-press/select multiple notes and choose `Directo`.

Capture immediately creates a direct packet and opens a fresh execution ChatGPT:

`PROMETEO DIRECT · <code>`
`<packet_url>`

The fresh worker receives the selected note revisions plus the execution contract. It still recovers durable context; Direct does not mean pasting raw text into ChatGPT.

The popup is created synchronously from the human gesture before network work, specifically to avoid mobile/browser popup blocking.

---

# Planner-produced job cards

V9 polls the lab backend for prepared jobs.

Prepared jobs appear back on the same Capture page as quiet cards containing:

- title;
- short summary/target;
- a physical `Producir` rail.

Dragging `Producir` creates a dedicated worker packet and opens a fresh ChatGPT for that one job.

Therefore the intended real flow is now represented materially:

`ANOTAR -> PREPARAR (1 Planner) -> JOB CARDS -> PRODUCIR (N workers)`

Multiple independent jobs may be launched into multiple parallel chats.

Backend table:

`public.prometeo_live_lab_jobs`

Relevant conceptual states currently include:

- `PREPARED`
- `LAUNCHED`
- `DONE`
- `BLOCKED`
- `FAILED`

---

# Backend V2 lab transport

Edge Function remains:

`prometeo-live-lab-v1`

but is now version 2.

The name remains stable so existing V8/V9 links do not need a new origin.

## New backend capabilities

- note deletion tombstones;
- restore;
- `planner` dispatch mode;
- `direct` dispatch mode;
- prepared jobs;
- per-job worker dispatch;
- run/control-room records;
- public read-only control-room feed;
- Planner SQL helper;
- worker operational-status SQL helper.

Tables involved:

- `prometeo_live_lab_notes`
- `prometeo_live_lab_dispatches`
- `prometeo_live_lab_jobs`
- `prometeo_live_lab_runs`

Existing note/dispatch rows were extended rather than replaced.

---

# Control Room / worker visibility

Prometeo Live served entry:

`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-live/`

The previously working host was preserved as:

`experiments/prometeo-live/index-v1.html`

The active host is now a V2 control-room-capable host.

It still renders the current `live-manifest.json` surfaces, but it now also polls the public read-only endpoint:

`/functions/v1/prometeo-live-lab-v1/control-room`

The control strip appears only when recent run records exist.

A run is created as soon as a Planner/Direct/Worker handoff is created, so Live can display:

- waiting for chat;
- elapsed time;
- work title.

When the fresh ChatGPT actually opens its packet, the packet endpoint automatically changes the run to:

`READING_PACKET`

This is important: the first visible "chat is alive" signal does not require the worker to remember to report anything.

## Operational progress after packet open

Worker/Planner packets now include instructions for short operational milestones through:

`public.prometeo_live_lab_run_event_v1(...)`

Supported intended phases include:

- `READING_PACKET`
- `RECOVERING_CURRENT`
- `BUILDING`
- `PREVIEW_READY`
- `TESTING`
- `PUBLISHING`
- `DONE`
- `BLOCKED`
- `FAILED`

These events are concise execution telemetry, NOT private chain-of-thought.

---

# Progressive previews

Direct and worker packets now explicitly say not to wait for final perfection when a safe candidate preview can be published.

Expected pattern:

1. worker appears immediately as a Control Room run;
2. first safe skeleton/candidate is published at a meaningful milestone;
3. worker reports `PREVIEW_READY` with candidate URL;
4. Live may expose that preview while work continues;
5. worker continues testing/refining;
6. stable/authoritative pages are not overwritten early merely to create animation.

This directly addresses the successful football test where nothing appeared on TV until the final result.

The mechanism is in the worker contract, but the full progressive-preview round trip is not yet human-confirmed.

---

# Current public test surfaces

Capture V9:

`https://juanmanuelpm.github.io/prometeo/experiments/capture-lab/?v=9`

Prometeo Live:

`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-live/`

If a device has not previously stored the lab key, use the same key-bearing Capture URL established during V8 testing; the fragment is consumed once and removed from visible history after being saved locally.

Do not publish that lab key into public durable docs.

---

# What is NOT yet proven

Do not promote V9 to Human Accepted until the human physically verifies at least:

1. swipe left reliably deletes on target Android without breaking vertical scroll;
2. Undo restores correctly;
3. deleted note does not resurrect when a pending transcription later finishes;
4. long-press selection feels natural;
5. bulk selection does not accidentally open edit mode;
6. swipe right opens one Direct worker;
7. Direct worker still gets complete selected note content;
8. global Prepare opens a Planner, not an execution worker;
9. Planner uses the connected Supabase tool and successfully persists multiple prepared jobs;
10. those jobs appear back in Capture without reload/manual transport;
11. dragging each job opens a distinct fresh execution chat;
12. two or more workers can coexist;
13. Prometeo Live shows the new run immediately / on packet open;
14. one worker successfully reports at least BUILDING -> PREVIEW_READY -> TESTING -> DONE;
15. a preview can appear before the final artifact without overwriting stable authority incorrectly.

---

# Known V9 limitations / follow-up frontier

- History data exists locally, but a polished History/restore UI is still missing.
- The Planner currently depends on the connected Supabase tool to persist jobs; this is acceptable for the lab, not the final universal transport contract.
- Worker status after automatic `READING_PACKET` depends on workers following the explicit status helper instruction.
- A worker that ignores status reporting can still execute; Live will simply have less intermediate telemetry.
- The QR / phone-as-remote / multiplayer room protocol is documented in the master spec but NOT implemented in V9.
- Existing pre-V9 test notes are deliberately not auto-deleted by heuristics; the human now has gestures/bulk selection to remove them safely.
- No automatic `Producir todos` baseline yet.
- No assumption that ChatGPT browser-tab titles are worker identity. Prometeo run/job IDs remain authoritative for orchestration.

---

# Preserve-first rule for the next chat

Do not rewrite Capture from scratch.

Continue from:

- V9 for inbox / Planner / Direct UX;
- V7/V8 donor chain for accepted voice capture mechanics;
- Edge Function `prometeo-live-lab-v1` version 2 for lab routing;
- Prometeo Live active host for Control Room + surfaces;
- master spec for broader design authority.

If V9 has a gesture bug, patch the wrapper surgically. Do not discard the working voice/transcription baseline.
