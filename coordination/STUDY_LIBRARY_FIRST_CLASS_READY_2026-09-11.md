# Study Library — first live class readiness

Date: 2026-09-11
Status: READY FOR REAL FIRST-CLASS TEST, with explicit physical/runtime boundaries below.

This file is the durable handoff for the first real class with friends. Do not reconstruct this state from old chats.

## 1. Stable entry

Study Library:

`https://juanmanuelpm.github.io/prometeo/pages/study-library/`

Normal path:

`Study Library → Materia → Clases → + clase`

A live class creates a room-token-scoped session. `invitar` copies the class URL; friends opening that URL join the same room and get the room-scoped collaborative surfaces.

## 2. What is materially implemented

### Shared class

The class surface includes:

- room-token access;
- participant profile/name/avatar/color;
- realtime presence;
- shared note blocks;
- headings, text, images, audio and published board notes;
- private note drafts that remain private until published;
- Walkie chat with voice system;
- multiple Universal Whiteboards per class;
- recording controls;
- live provisional captions where browser speech recognition is available;
- canonical Whisper transcription;
- transcript `partes` and `total` views;
- copy/TXT/public transcript snapshot;
- ChatGPT handoff;
- paste-AI-result back into shared notes;
- eight exact two-color UI themes.

### Universal Whiteboard

Class boards use the WB10 authority/adapter, not a separate drawing engine. Each class can have multiple boards with stable id/title/owner/state/visibility/revision, reopen, duplicate and publish behavior. Publishing does not destroy the underlying board.

Shared board state remains whole-state + revision, not per-stroke CRDT. Do not claim conflict-free simultaneous stroke editing.

## 3. Transcription architecture

The original boundary-safety idea is preserved:

- v13 safety capture: 20 s windows launched every 15 s = 5 s overlap;
- overlap metadata is persisted with chunks.

The canonical transcript has since been strengthened for context quality:

- canonical window: 150 s;
- launch step: 135 s;
- overlap: 15 s;
- language: Spanish / `es-AR` context;
- browser live captions are provisional only;
- canonical transcript comes from recorded audio;
- overlap is de-duplicated when the `total` transcript is assembled;
- `recreo` creates a new semantic `PARTE` rather than pretending the class is one uninterrupted block.

This is intentionally safer than hard cuts. The technical chunk boundary is not the semantic transcript boundary.

### Master audio resilience

While recording, a master audio stream is persisted locally in IndexedDB in approximately 5-second pieces. This gives the recording device a recovery source independent from the canonical Whisper windows.

Important boundary: the master audio is local to the recording browser/device. It is not yet a remote/cloud archive.

### Quality control

Current server and client quality gates reject obvious transcription degeneration such as:

- repeated token loops;
- consecutive repeated n-gram blocks;
- extremely low lexical diversity.

The transcription backend tries `whisper-large-v3` first and can fall back to other Whisper spaces if necessary.

## 4. Transcript sharing + ChatGPT handoff

A class member can create a public transcript snapshot without publishing the private class room.

Canonical public surface:

`pages/study-library/transcript-share.html?s=<share-token>`

Backend:

`study-transcript-share-v1`

A share snapshot contains only:

- class title/course/date;
- current total transcript;
- current shared notes;
- snapshot/expiry metadata.

It does **not** expose the room token or grant access to the collaborative class.

Current snapshots expire after 30 days and can be revoked server-side.

The public transcript page offers:

- PASAR EN LIMPIO;
- RESUMIR;
- APUNTE DE ESTUDIO;
- copy;
- TXT;
- transcript / shared-notes tabs;
- the same two-color visual language.

The ChatGPT action copies a full source-grounded prompt to the clipboard before opening ChatGPT. This clipboard copy is the reliable transport fallback; do not depend on undocumented URL-prefill behavior alone.

The prompt tells ChatGPT to use the class transcript/notes as primary evidence, preserve names/examples/consignas, and mark doubtful/inaudible content rather than inventing it.

Inside the live class, `pegar IA` allows a student to paste the processed result back into shared notes.

## 5. Themes / visual rules

Class themes are exact two-color pairs. Current set:

1. noche — `#111326 / #D8D1FF`
2. crema — `#F5DABF / #6C151E`
3. tinta — `#111827 / #D9E4FF`
4. bosque — `#10231C / #D8EED0`
5. petróleo — `#0C2630 / #CDECF2`
6. borgoña — `#2A1017 / #F1D0C7`
7. ciruela — `#201427 / #E9C8FF`
8. papel — `#F1E7D8 / #241F1A`

Alpha/color-mix derivatives are permitted; no accidental third chrome color.

Participant colors remain semantic identity accents and are not theme chrome.

### Durable visual-reference principles recovered from prior images/iterations

Not every old screenshot is currently available pixel-perfect, so do not pretend otherwise. Preserve these confirmed principles when refining the class:

- study-object / handwritten-document feel rather than generic SaaS dashboard;
- compact spatial hierarchy;
- content first, controls secondary;
- no glows;
- no huge labels;
- no explanatory copy for obvious controls;
- no rounded container around every group;
- subtle depth only where interaction benefits from it;
- responsive without overlap;
- mobile touch-first without degrading desktop;
- Universal Whiteboard paper remains white even when app chrome changes theme;
- natural handwritten board work is a stronger visual reference than decorative AI graphics.

If the original screenshots are uploaded again, they become stronger pixel-level references, but execution must not block waiting for them.

## 6. Security / room boundaries verified

Room-token RLS policies are present for:

- class sessions;
- session docs;
- participants;
- note blocks;
- chat messages;
- transcript chunks;
- boards.

The public transcript share table itself has RLS enabled and no direct anonymous table policy; public reads go through the share Edge Function using only a random share token.

Private Blackboard content/tokens are unrelated to this public transcript flow and must never be exposed here.

## 7. QA completed

GitHub workflow:

`.github/workflows/study-live-class-qa.yml`

The first run passed syntax + structural invariants for:

- overlap safety;
- canonical long-window transcription;
- local master audio persistence;
- parts + total;
- public share;
- ChatGPT handoff;
- paste-back notes;
- quality gate;
- eight two-color themes;
- lazy class loading;
- public-page privacy invariants.

The workflow now also performs a required live Edge contract probe against `study-transcribe-v1` and an optional diagnostic Whisper audio self-test. The external audio self-test is diagnostic because third-party model availability can be transient; the service contract probe is required.

Main and `gh-pages` were checked for the currently loaded first-class canonical blobs (`index`, loader, class-ready JS/CSS, V14 transcription/quality fix and transcript-share). Recheck branch heads before future writes because parallel work is active.

## 8. Exact first-class flow

1. Open the stable Study Library.
2. Open the subject.
3. Go to `Clases` and create/open the class.
4. Pick the desired two-color theme.
5. Press `invitar`; send that class URL to friends.
6. Everyone sets/uses their profile; presence should show them in the room.
7. Recorder presses `GRABAR` once.
8. Keep the recording device/browser open; live provisional text can appear while canonical blocks process.
9. Use `RECREO` for a genuine break; it creates a new `PARTE` on resume.
10. Collaborate in notes, Walkie and boards normally while transcription continues.
11. Use `partes` to inspect processing blocks and `total` for the de-duplicated transcript.
12. At/after the class, use `link` for a public transcript snapshot or `ChatGPT` for clean/summary/study workflows.
13. Paste the useful AI result back with `pegar IA` when desired.
14. `FINALIZAR` closes active recording; pending canonical transcription may still finish afterward.

## 9. What the real class is specifically testing

The remaining uncertainty is physical/runtime, not missing architecture:

- microphone/acoustic quality in the actual classroom;
- browser permission behavior on the exact devices;
- a true simultaneous multi-device presence/notes/Walkie/board session;
- external Whisper service latency under the real class duration;
- physical Wacom/iPad stylus behavior if used;
- whether local IndexedDB storage remains available for the entire class on the recorder device.

These must be treated as live evidence. Do not declare them proven before the class.

## 10. During the first real class

Do not rebuild architecture in response to a small issue. Capture evidence first:

- time of problem;
- device/browser;
- whether recording indicator remained live;
- affected `PARTE`;
- whether live provisional text continued;
- whether canonical chunk became ready/error;
- whether friends remained present;
- whether notes/Walkie/board continued.

The master local audio exists specifically so transcription failure does not necessarily mean the spoken class is lost.

## 11. Current release statement

The class system is ready for its first real human test. Static/integration contracts are closed enough to use it. The first class is now the required acceptance test for microphone/acoustics, multi-device realtime behavior and external ASR under real conditions.
