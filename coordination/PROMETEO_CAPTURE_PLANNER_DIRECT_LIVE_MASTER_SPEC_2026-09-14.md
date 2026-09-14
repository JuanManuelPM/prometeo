# Prometeo Capture → Planner / Direct → Workers → Live

Status: DESIGN AUTHORITY CANDIDATE / ACTIVE LAB SPECIFICATION
Date: 2026-09-14
Scope: Capture inbox UX, note lifecycle, Planner workflow, Direct workflow, worker spawning, Prometeo Live Control Room, progressive previews, remote control / room model, and continuity requirements.

This document exists so future chats and workers can recover the actual product idea without depending on old conversations. It is deliberately broader than the current implementation. Existing working pieces must be preserved surgically rather than replaced wholesale.

---

## 1. North star

Prometeo Capture is not a page-specific form and not a command parser. It is a low-friction place where the human can dump thoughts by voice or text throughout the day without deciding where they belong.

The human may say any of the following, mixed together and in any order:

- change Calendar;
- change Student World;
- redesign Prometeo navigation;
- create a completely new page;
- experiment with a game;
- put a YouTube video on Prometeo Live;
- make a four-way comparison workspace;
- remember a personal idea;
- propose an abstract architectural change;
- create a one-off experiment that may never become part of the product.

The system must not require classification at capture time.

The fundamental human flow is:

**Anotar → (optional select/group) → Preparar OR Directo → Producir → Ver vivo**

The important distinction is that **Preparar** and **Directo** are different paths.

- **Preparar** means: ask one Planner/Prompt Compiler AI to understand a pile of raw notes and convert them into a set of high-quality independent jobs.
- **Directo** means: bypass the Planner and launch one fresh execution chat immediately with the selected note or bundle plus automatically recovered durable context.

Neither path should force the human to manually copy notes, prompts, files, context or URLs between chats.

---

## 2. Preserve-first baseline

The current accepted Capture input donor must remain intact unless the human explicitly rejects it.

Preserve:

- `+` opens composer without autofocus / keyboard.
- text and audio can coexist in one note.
- MediaRecorder-first recording.
- raw audio preserved before authoritative transcription.
- transcription in a separate worker.
- Whisper Small candidate on WebGPU with Base fallback.
- Spanish forced explicitly.
- user can stop recording and immediately record again while prior transcription is running.
- user can tap Send while still recording.
- saved note may display `transcribiendo audio` and later update itself.
- note can be reopened and edited.
- new audio can be inserted at cursor position while editing.
- UI does not become unusable if ASR fails.

Do not clean-slate rewrite this path merely to add Planner/Direct/Live features.

---

## 3. Human-friction law

Prometeo should aggressively move uncertainty and bookkeeping below the UX layer.

The human should not be asked to:

- wait for transcription before saving;
- classify every thought;
- wait for a remote sync ceremony;
- confirm a second time after intentionally dragging an execution control;
- copy a long prompt;
- decide which GitHub file / Supabase row / page ID contains context;
- manually reopen prior chats for continuity;
- refresh Prometeo Live to see a result;
- understand packet hashes, receipts, revisions, Current Graph, lineage or transport internals.

The human action should happen immediately whenever the durable system can safely finish work after the gesture.

A useful rule:

> **human movement first; infrastructure catches up silently.**

For example, if a just-recorded audio is still transcribing when the human dispatches a bundle, the human should still be allowed to leave immediately. The packet may carry the note as pending and the receiving agent/backend may refetch when the transcript becomes ready.

Only surface an interruption if continuing would materially risk losing or corrupting the human's request.

---

## 4. Note lifecycle: fix the current clutter problem

The current experiment exposed an important UX defect: old test notes remain visible indefinitely and cannot be removed easily.

The main inbox should not be an append-only graveyard.

### 4.1 Note states

A note should have at least these conceptual states:

- `NEW` — human-created/edited and not yet metabolized by a Planner or Direct execution.
- `PENDING_TRANSCRIPT` — saved but one or more audio parts are still transcribing.
- `PREPARED` — consumed into one or more Planner-produced jobs.
- `DIRECT_SUBMITTED` — sent directly to an execution worker.
- `METABOLIZED` — successfully incorporated into a finished job/result.
- `ARCHIVED` — retained in history but not in the active inbox.
- `DELETED` — tombstoned and must not resurrect through sync.

A note can also have multiple revisions. If a prepared/metabolized note is edited later, the new revision becomes `NEW` again without pretending the old execution never happened.

### 4.2 Default inbox

The main Capture screen should primarily show **NEW + PENDING_TRANSCRIPT** notes.

Prepared/metabolized history should collapse away automatically into a lightweight History/Done surface. This alone prevents the current problem where old experiments pollute every new dispatch.

The global `Preparar` action must operate on **currently unprepared notes**, not every historical note ever created.

### 4.3 Delete interaction

Deleting one note should be extremely fast.

Preferred gesture:

- tap card → edit;
- swipe card left → reveal/destructively cross a trash threshold;
- full enough swipe → note disappears immediately;
- show a short unobtrusive `Deshacer` affordance for a few seconds;
- no confirmation dialog for an ordinary note.

This should use the established Prometeo physical language: the card moves, the destructive surface is revealed underneath, and state is conveyed through motion rather than large explanatory text.

Implementation details:

- axis-lock early so vertical scrolling remains reliable;
- require a deliberate horizontal threshold to prevent accidental deletes;
- write a tombstone revision remotely, do not merely hide locally;
- if the note has a transcription job running, deletion prevents that result from resurrecting the card when it finishes;
- raw audio deletion can be delayed briefly for Undo, then garbage-collected later;
- deletion on one linked device propagates to all devices.

### 4.4 Bulk cleanup

Long-press on a note enters selection mode. From there the human can select many notes and delete/archive them together.

Do not clutter every card with permanent checkboxes.

---

## 5. Do not force categories: use temporary bundles

The user asked for a way to group notes, but permanent categories are not the right primitive for the default Capture experience. Requiring `Calendar`, `Gym`, `Navigation`, etc. at capture time reintroduces the exact classification burden Capture is designed to remove.

Use a lighter concept: **selection/bundle**.

UI language can later settle on `Grupo`, `Lote`, `Pila` or another short term. Internally it is a set of note revision references.

### 5.1 Create a bundle

- long-press one note;
- tap any additional notes;
- a small bottom action area appears;
- the user can either `Preparar`, `Directo`, `Agrupar/Guardar grupo`, `Archivar`, or `Eliminar`.

A temporary selection is enough for most use cases; persistent named groups are optional.

### 5.2 Persistent groups only when useful

If the human repeatedly works on the same set, the selection can be pinned as a named group/workspace. But this is secondary. Prometeo should not become a folder-management app.

### 5.3 One note may feed multiple jobs

Planner grouping is semantic, not equivalent to folders. One human note may legitimately affect Calendar and Navigator. The Planner can reference that same source note from two generated jobs.

---

## 6. Two dispatch paths

This is the most important UX distinction in the system.

## 6A. PREPARAR — Planner / Prompt Compiler path

Use when the human has accumulated many heterogeneous notes or wants the system to decide how the work should be split.

### Human experience

1. Capture has 3, 10, 30 or more new notes.
2. Human drags the global physical `Preparar` spring once.
3. Capture immediately opens one fresh ChatGPT conversation with a tiny prompt containing only a short code + packet URL.
4. The human can leave.
5. That first AI is the **Planner**, not an implementation worker.
6. Planner reads the packet, durable Prometeo state, Current/Catalog/Lineage/owners/donors as needed.
7. Planner groups/splits/rewrites the raw thoughts into independent, high-quality jobs.
8. Planner persists those jobs back to Prometeo.
9. The same Capture page now shows clean job cards with their own `Producir` springs.
10. Dragging each job launches a separate fresh worker chat.

### Planner authority

Planner may:

- read raw notes;
- understand intent;
- infer targets;
- merge related notes far apart in time;
- split one complex note into multiple jobs;
- allow one note to participate in multiple jobs;
- identify dependencies;
- inspect Current, Catalog, lineage, page memory, existing workstreams and known donors;
- produce a strong worker brief;
- assign job identity, title, short summary, targets and source refs;
- state ambiguity/blockers;
- persist job cards.

Planner must **not**:

- modify product pages merely because it understands the request;
- publish a candidate;
- infer Human Accepted/Current/Served;
- replace the execution worker;
- silently discard unclear notes.

### Example

Raw notes:

1. `en calendario los eventos viejos podrían verse más apagados`
2. `en jose en celu práctica tendría que plegarse`
3. `no tocar exact back cuando arreglemos navegación`
4. `calendario tocar un evento debería abrir detalle`
5. `navigator RIGHT en hoja tiene que abrir la página`
6. `en jose quiero ver avance cuando abro práctica`

Planner result:

- Job A — `Calendar · estado temporal + detalle` — sources 1,4
- Job B — `Student World José · práctica mobile` — sources 2,6
- Job C — `Navigator · hoja + Exact Back` — sources 3,5

The Planner does not implement A/B/C. It simply makes them ready.

---

## 6B. DIRECTO — one-step worker path

Use when the human already knows that one note or selected bundle is one coherent task and does not need a Planner to improve/split it.

Example:

> `Poneme en Prometeo Live una pantalla con YouTube a la derecha, calendario a la izquierda y una lista de próximos partidos abajo.`

The human should be able to launch this immediately.

### Human experience

There should be an intuitive direct gesture without adding permanent UI clutter.

Candidate interaction:

- **single note:** swipe right far enough to reveal/commit a `Directo` execution rail;
- **multiple notes:** long-press/select several, then drag a `Directo` spring in the temporary selection toolbar.

The direct path:

1. silently sync selected note revisions;
2. create a direct execution packet;
3. open a fresh ChatGPT chat immediately;
4. tiny prompt only: `PROMETEO DIRECT · <id>\n<packet_url>`;
5. worker recovers required Prometeo context itself;
6. worker executes/publishes/returns.

There is no Planner chat in between.

Important: `Directo` does **not** mean `paste raw transcript into ChatGPT`. It still benefits from Prometeo durable context and packet transport. It only bypasses the Planner stage.

---

## 7. Jobs produced by Planner

Prepared jobs should return to the same Capture surface. Do not force the human into a separate project-management dashboard.

A job card should be visually quiet and concise:

- job title;
- one short outcome sentence;
- target/page/workstream if known;
- source note count;
- blocker indicator only if needed;
- physical `Producir` spring.

Optional expansion reveals:

- source notes;
- richer prompt;
- dependencies;
- target authority/currentness;
- expected output.

Default view should not expose all technical packet text.

When a worker launches, the card becomes active and can show its live state.

---

## 8. Worker identity and parallelism

Each worker receives a durable identity independent of whatever title ChatGPT gives the browser tab.

Example:

- `WI-CALENDAR-01`
- `WI-NAV-02`
- `WI-STUDENT-03`

Identity fields:

- work item ID;
- planner batch/direct dispatch ID;
- short human-facing title;
- optional accent/avatar/icon;
- target surfaces;
- source note refs;
- packet URL;
- run state;
- created/spawned/finished timestamps.

The system must support many workers in parallel. Planner may create 2 jobs or 12 jobs; the architecture should not assume one chat at a time.

A later `Producir todos` command can exist, but individual explicit launches are the safer first baseline.

---

## 9. Prometeo Live has TWO roles

Prometeo Live should not be reduced to a destination page. It is both:

### A. Control Room

Shows what agents are doing.

### B. Live Surfaces

Shows what they are producing / what the human wants on the large screen.

These modes may be tabs, overlays, split view, or dynamically combined.

---

## 10. Control Room: show agents working

The current successful football canary exposed the next improvement: nothing appeared on the TV until the page was fully finished.

That wastes a valuable large-screen feedback surface.

As soon as a Planner or worker is spawned, Prometeo Live should be able to show a live work tile:

```
SELECCIÓN ARGENTINA
● trabajando

recuperando contexto…
00:18
```

Later:

```
SELECCIÓN ARGENTINA
● construyendo

primer layout listo
00:43
```

Later:

```
SELECCIÓN ARGENTINA
● verificando

responsive + publicación
01:12
```

Finally:

```
✓ SELECCIÓN ARGENTINA
terminado · 01:28
[abrir resultado]
```

### Do not stream hidden chain-of-thought

The worker should publish **short operational status events**, not private reasoning.

Good events:

- `SPAWNED`
- `READING_PACKET`
- `RECOVERING_CURRENT`
- `RESOLVING_TARGET`
- `BUILDING`
- `PREVIEW_READY`
- `TESTING`
- `PUBLISHING`
- `DONE`
- `BLOCKED`
- `FAILED`

Each may carry one short human-readable phrase, e.g. `Armando primera estructura responsive`.

No need to mirror every token ChatGPT writes.

### Planner tile

The first `Preparar` chat should appear as its own tile:

```
PLANNER
● organizando 17 notas

5 posibles trabajos detectados
```

When finished it can transform into a job-board summary.

---

## 11. Progressive previews

A worker should not need to wait until the final artifact is perfect before Prometeo Live shows anything.

Use milestone-based progressive publication.

### For a brand-new surface

- worker spawn → work tile immediately;
- worker creates the first safe skeleton / layout → `PREVIEW_READY`;
- Live swaps or splits the tile with the candidate preview;
- later updates refresh that preview;
- final validation marks it finished.

### For modification of an existing authoritative page

Do not overwrite the stable page early.

Instead show:

- existing stable surface;
- candidate preview with a clear `candidate` state;
- optionally side-by-side for visual iteration.

Final publication/authority rules remain separate.

### Frequency

The goal is meaningful feedback, not continuous noisy rebuilding. A preview update every meaningful milestone (roughly tens of seconds for a long worker) is sufficient.

---

## 12. Live Surfaces: universal host

Prometeo Live must remain content-agnostic.

It should not know what a cat, calendar, football match, Student World, YouTube, dashboard or chessboard means.

Its job is to mount surfaces described by a manifest/state model.

A surface can be:

- a generated HTML app;
- an existing Prometeo page;
- a dashboard;
- a game;
- a media player;
- an embedded external URL when allowed;
- a visual comparison candidate;
- another composition of surfaces.

Layouts can include:

- single;
- split;
- three-column;
- quad;
- picture-in-picture;
- free grid later.

The worker decides what application to build. Live only renders it.

---

## 13. Phone as Prometeo Live remote

Not every action should use AI.

Once an application already exists, ordinary interaction should be immediate:

`phone → realtime event → TV`

Examples:

- switch surface;
- fullscreen a pane;
- play/pause YouTube;
- seek video;
- change day/week/month in Calendar;
- move a chess piece;
- choose quiz answer;
- control a game;
- change tabs;
- volume/mute;
- change Live layout.

AI is for creating/changing capabilities that do not already exist, not for pressing an existing play button.

---

## 14. QR / room model

Prometeo Live should be able to display a small connection QR.

The QR represents the **current Live room/session**, not a generic homepage.

Scan flow:

1. scan QR;
2. phone opens `Prometeo Remote` for that room;
3. no manual room code if QR succeeds;
4. phone receives current app/surface state;
5. phone renders appropriate controls.

### Roles

A room can issue different capability tokens:

- `OWNER/CONTROL` — trusted personal remote;
- `PLAYER` — game participant;
- `SPECTATOR` — read-only or limited interaction;
- optional temporary `GUEST_CONTROL`.

Guest tokens should be expiring and scoped. Scanning a party-game QR must not grant access to private Capture notes or Prometeo project internals.

### Multiple participants

The same room can connect multiple phones:

```
TV / shared state
        ↑
 Prometeo Room
  ↑    ↑    ↑
Juan  Guest1 Guest2
```

This enables multiplayer games, voting, trivia, hidden-role games, drawing, collaborative controls, etc.

---

## 15. Contextual remote controls

A fixed remote with dozens of permanent buttons is the wrong abstraction.

Each Live surface should be able to expose a small `remote_contract` describing what controls it supports.

Example media surface:

```json
{
  "kind": "media",
  "controls": ["play", "pause", "seek", "mute", "fullscreen"]
}
```

Example chess surface:

```json
{
  "kind": "game",
  "role": "black",
  "controls": ["board_input", "offer_draw", "resign"]
}
```

Prometeo Remote renders the appropriate UI dynamically.

This keeps the remote universal while letting generated apps add capabilities without redesigning the entire phone controller.

---

## 16. Choosing AI vs direct event

The system should distinguish two categories of human intent:

### Existing capability

`pausá el video`, `mostrá la semana`, `abrí panel C`, `mové esta pieza`

→ direct realtime event; no AI.

### New capability / product change

`rediseñame el calendario`, `creá un juego`, `quiero cuatro variantes`, `agregá un modo de navegación nuevo`

→ Capture note → Direct worker or Planner → worker.

This distinction may eventually be assisted automatically, but the user must always have explicit ways to choose Direct vs Prepare.

---

## 17. Synchronization without friction

The user suggested using timestamps as a cheap sanity check. Keep that principle but make it stronger internally without adding visible ceremony.

Each note has:

- `note_id`;
- `revision`;
- `created_at`;
- `updated_at`;
- optional audio-part state;
- sync state.

A dispatch has:

- `dispatch_id`;
- `mode = PREPARE | DIRECT`;
- `dispatched_at`;
- exact note revision refs;
- note count;
- optional freshness watermark/hash;
- capability packet token.

The drag can immediately open ChatGPT. If a tiny final-sync race exists, the packet endpoint/agent can briefly retry or refetch. Do not hold the human on a modal verification step.

The timestamp remains useful for diagnostics and human confidence but should not be the sole integrity mechanism.

---

## 18. Packet principle

Fresh ChatGPT conversations should receive intentionally tiny prompts.

Examples:

```
PROMETEO PREPARE · PREP-20260914-AB12
https://.../packet/<token>
```

or

```
PROMETEO DIRECT · WI-20260914-CD34
https://.../packet/<token>
```

The packet contains the real context. The chat must fetch it itself.

Benefits:

- no huge prompt transported in URL;
- no manual copy/paste;
- notes remain durable and versioned;
- packet can include updated Current/Catalog bindings;
- fresh workers can reincarnate without chat history;
- old chats remain disposable.

---

## 19. Suggested durable entities

This is a conceptual schema, not a mandate to rename existing production tables.

### Note

```text
note_id
revision
parts[]
text/transcript
created_at
updated_at
state
privacy
source_device
transcript_state
sync_version
deleted_at
```

### Dispatch

```text
dispatch_id
mode: PREPARE | DIRECT
source_note_refs[]
dispatched_at
packet_token_hash
status
```

### Plan

```text
plan_id
dispatch_id
planner_run_id
created_at
jobs[]
unresolved_notes[]
```

### Job

```text
job_id
title
summary
targets[]
source_note_refs[]
dependencies[]
worker_packet
status
```

### Worker run

```text
run_id
job_id
chat_ref optional
phase
status_message
started_at
last_event_at
preview_ref
candidate_ref
final_result_ref
finished_at
```

### Live room

```text
room_id
layout
active_surfaces[]
control_room_state
owner_token_hash
guest/session tokens
connected_clients
updated_at
```

### Surface

```text
surface_id
title
url/kind
state: stable | candidate | preview | working
worker_run_id optional
remote_contract optional
```

---

## 20. Capture interaction map

The phone UI should remain small and tactile.

### Normal state

- tap `+` → compose;
- save/send arrow → note exists immediately;
- global bottom `Preparar` spring appears when there are NEW notes.

### On a note

- tap → edit;
- swipe left → delete with short Undo;
- swipe right → Direct execution gesture for that one note;
- long-press → selection mode.

### Selection mode

- tap other notes to add/remove;
- bottom compact action surface can provide:
  - `Preparar selección`;
  - `Directo`;
  - `Agrupar` optional;
  - `Archivar`;
  - `Eliminar`.

Do not expose all actions as large textual buttons simultaneously. Use the physical language already established in Prometeo and reveal actions contextually.

### Prepared state

Same screen gains a `Trabajos` area/card stack. Each job has a `Producir` spring. Finished jobs collapse into history/results.

---

## 21. What happens to source notes after Planner

Once Planner successfully persists jobs:

- source note revisions become `PREPARED`;
- they leave the default raw inbox;
- their references remain attached to generated jobs;
- a History/Source expansion can recover them;
- if user edits one later, the new revision returns to `NEW`.

If Planner fails before producing a durable plan, notes remain `NEW`; no silent loss.

If one note is ambiguous, Planner may create an `Unresolved` item rather than discarding it.

---

## 22. What happens after Direct

Once a direct worker packet is successfully created:

- selected revisions become `DIRECT_SUBMITTED`;
- the note/bundle leaves the main NEW inbox but remains visible in an active/history area;
- if worker fails, the bundle should be easily retryable and may return to `NEW` or remain in `FAILED` with retry;
- success marks it metabolized.

Again, editing later creates a new actionable revision.

---

## 23. Current canary result and lesson

Human test on 2026-09-14 successfully demonstrated a fresh ChatGPT opened from Capture, read a `PROMETEO LIVE` packet, recovered external context and began building a football/Argentina surface. The human reported that the result worked.

This is strong evidence that the fundamental **fresh-chat handoff → external packet → real worker → Live publication** mechanism is viable.

However, two shortcomings were exposed:

1. the first handoff was acting as an implementation worker when the default global `Preparar` role should actually be Planner/Compiler;
2. Prometeo Live remained visually empty until the final result instead of showing worker spawn/status/progressive preview.

Treat the canary as proof of transport/execution, not proof that the overall UX is finished.

---

## 24. Current implementation frontier

As of this specification:

Working / materially demonstrated:

- Capture voice/text baseline;
- local Whisper transcription path;
- send-while-transcribing behavior;
- fresh ChatGPT packet handoff;
- tokenized external packet retrieval;
- worker can use GitHub and create/update a Live surface;
- Prometeo Live can display generated surfaces;
- one full football-related round trip was human-tested successfully.

Not finished / next frontier:

- note deletion and tombstone sync;
- default inbox filtered to actionable notes;
- selection/group UX;
- explicit `Directo` path;
- `Preparar` converted from executor to Planner;
- durable Planner output/job cards back into Capture;
- multiple worker launch cards;
- Control Room worker status model;
- progressive previews;
- Live room + QR remote;
- contextual remote contracts;
- multiplayer/guest role model.

---

## 25. Recommended build order

Do not attempt the entire vision in one rewrite.

### Phase 1 — Inbox hygiene

- swipe-left delete + Undo;
- tombstones;
- NEW-only default feed;
- history for processed/deleted where appropriate;
- long-press selection.

### Phase 2 — Two dispatch paths

- global `Preparar` → Planner packet, not execution;
- selected/single-note `Directo` → execution packet;
- preserve tiny ChatGPT launcher prompt.

### Phase 3 — Planner return

- Planner persists Job records;
- Capture renders job cards;
- job `Producir` spring launches fresh workers.

### Phase 4 — Control Room

- worker lifecycle events;
- Live tiles for Planner + workers;
- multiple workers simultaneously;
- timestamps/durations.

### Phase 5 — Progressive preview

- preview surface contract;
- candidate/stable separation;
- Live updates on meaningful milestones.

### Phase 6 — Room / QR remote

- room creation;
- QR;
- owner remote;
- direct realtime events;
- surface-specific remote contracts.

### Phase 7 — multiplayer + richer composition

- guest/player tokens;
- per-user private state;
- party/game patterns;
- more flexible Live layouts.

---

## 26. Acceptance canaries

### Inbox

1. create three notes;
2. swipe one left;
3. it disappears immediately;
4. Undo restores it;
5. delete again and reload; it must not return.

### Prepare

1. create mixed Calendar + Gym + Navigator notes;
2. drag global Preparar once;
3. one new Planner chat opens;
4. Planner does not edit product;
5. it returns 2–3 logical jobs into Capture;
6. source notes leave raw inbox.

### Direct

1. create one coherent note: `creá una nueva Live surface con ...`;
2. swipe right/direct;
3. fresh worker opens immediately without Planner;
4. packet contains that note and durable context;
5. Live shows worker tile immediately;
6. result appears when ready.

### Multi-worker

1. Planner creates Calendar, Gym, Navigator jobs;
2. launch all three manually within seconds;
3. Control Room shows three distinct workers;
4. states update independently;
5. one worker finishing does not disturb the others.

### Progressive preview

1. launch a new page build;
2. within the early build phase Live shows worker tile;
3. first safe layout appears before final validation;
4. later final replaces/marks preview complete.

### Remote

1. TV displays QR;
2. scan on phone;
3. phone connects without ChatGPT;
4. pressing a direct control changes TV in near realtime;
5. AI is not invoked.

### Multiplayer

1. three guest phones scan same room QR;
2. each receives scoped player identity;
3. shared TV updates with all players;
4. private player state remains private.

---

## 27. Non-regression rules

Future workers must preserve these unless the human explicitly changes them:

- Do not make Capture ask for a category before saving a thought.
- Do not send all historical notes every time.
- Do not leave processed notes cluttering the default inbox forever.
- Do not require transcription completion before the human can continue.
- Do not use local regexes/keywords as a substitute for AI understanding.
- Do not make global `Preparar` directly implement heterogeneous raw notes.
- Do not require Planner for an explicitly Direct bundle.
- Do not paste huge note dumps into the ChatGPT launcher prompt; use packet URLs.
- Do not make ChatGPT browser-tab titles the canonical worker identity.
- Do not scrape or expose private chain-of-thought to create worker progress UI.
- Do not hide all activity until final publication; show coarse lifecycle/progress.
- Do not let an early preview overwrite an authoritative stable surface.
- Do not route ordinary remote-control actions through AI if an existing deterministic action suffices.
- Do not let a guest QR grant access to private Capture/Prometeo project data.
- Do not rebuild the proven Capture/Whisper mechanism from scratch merely to add these layers.

---

## 28. Mental model for future chats

When a future AI encounters this system, it should think in these layers:

### Layer 1 — Capture

Fast human thought intake. No organization burden.

### Layer 2 — Selection / routing

The human may let Planner organize everything or explicitly choose a Direct bundle.

### Layer 3 — Planner

Compiles messy human thoughts into good independent jobs. Does not execute them.

### Layer 4 — Workers

Disposable fresh chats execute one scoped job each using durable Prometeo context.

### Layer 5 — Control Room

Shows Planner/workers as living processes with coarse status and previews.

### Layer 6 — Live Surfaces

Hosts arbitrary software/results produced by workers.

### Layer 7 — Remote / Room

Phones and guests interact with existing surfaces in realtime without unnecessary AI.

This hierarchy is the coherent product. Do not collapse it into a single-purpose note app, TV widget, local command parser, or one giant ChatGPT conversation.

---

## 29. Short mnemonic

**Capture is the mouth.**

**Planner is the organizer.**

**Direct is the shortcut.**

**Workers are the hands.**

**Control Room is the factory window.**

**Live is the shared visual world.**

**Remote is the immediate physical control.**

AI is used where interpretation/creation is valuable; deterministic realtime plumbing is used where speed and direct manipulation are better.
