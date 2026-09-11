# Study Library — master remaining scope

Date: 2026-09-11

Purpose: preserve the remaining product/design/technical work so a future `.` can execute from durable authority rather than reconstructing old chats. This file complements:

- `coordination/STUDY_LIBRARY_PENDING_2026-09-10.md`
- `coordination/STUDY_LIBRARY_STUDY_SYSTEM_HANDOFF_2026-09-10.md`
- `.study-system/v2/*`

Before execution: RESYNC `main`, current Study Library files, Blackboard status, `.study-system/v2/MANIFEST.json`, and this document. Current repository state wins over stale screenshots or old version numbers, but the visual/product intent below remains the target unless explicitly superseded by the user.

---

## 0. Product north star

Study Library is not a generic academic dashboard and not a collection of cards. It should feel like a personal academic environment where the user can:

1. see the year/semester and actual subjects spatially;
2. see what is coming next in a compact calendar/agenda;
3. open a subject and immediately understand its current state, upcoming assessment, classes, program and source material;
4. enter a live class with people/recording/transcript/Walky/boards;
5. enter an assessment and get the complete Study System V2 experience;
6. use one universal whiteboard engine in both study-topic and class contexts;
7. have Blackboard behave as an invisible source layer feeding the course/calendar/material system, not as a technical panel bolted onto the top.

Chrome/UI stays exactly two-color per active theme. Course-cover artwork and source content may use their own colors. Avoid white/black accidental third-color chrome, generic SaaS cards, oversized headings, unnecessary labels, obvious AI copy, glows, or explanatory UI text.

---

## 1. Home / Library visual target

### Structure

The library should read as a physical/digital bookshelf, not a card grid.

Hierarchy:

```text
ESTUDIO
└── 1º año
    ├── 1º cuatrimestre
    └── 2º cuatrimestre
```

Each semester is a horizontal shelf/band. Subjects are vertical book-like objects resting on a shared shelf line. Belonging is conveyed by spatial proximity and shelf position, not by enclosing each subject in a card/container.

### Books / covers

- Upright book proportions around 2:3.
- Cover image/art dominates; text/control chrome is secondary.
- No large rounded card around each book.
- Subtle depth/shadow only where useful.
- Desktop hover: slight rise (~4–6 px), no glow, no tooltip.
- Mobile: horizontal shelf scroll showing roughly two books plus a glimpse of the third; no arrow buttons.
- Replace generated/filler covers with real/intentional cover artwork.
- Preserve the rule that colorful cover imagery does not count as breaking the two-color UI system.

### Background / density

- Nearly empty background; shelves/books provide the structure.
- Avoid dashboard blocks around everything.
- Avoid giant title banners.
- The library should feel calm and spatial, with obvious hierarchy from placement rather than lots of borders.

### Current debt

The current runtime still contains hardcoded/filler subjects, units and dates in the `C` object. These must migrate into durable course/catalog data and be reconciled against real current subjects from Blackboard/user authority. Do not present placeholders as authoritative.

---

## 2. Calendar / agenda — restore and finish the early concept

The early Study Library direction included a calendar/agenda as a first-class companion to the library. It should return as a compact, useful planning surface rather than a second dashboard.

### Home relationship

- Library is primary and wider.
- Calendar/agenda is secondary but visible enough to answer “what is next?” without entering a course.
- It should not dominate the books.
- On narrower/mobile screens it can collapse/reorder, but must remain usable.

### Calendar behavior

Need coherent views for:

- month;
- week;
- agenda / next items.

Agenda priority should be upcoming:

1. partial/final;
2. assignment/delivery;
3. important class/event.

Each item needs subject identity and source/authority but without technical clutter.

### Source integration

Calendar events should combine authoritative sources rather than show separate calendars:

- Study Library assessments/classes;
- Blackboard calendar/events;
- Blackboard assignments/due dates when discovered;
- manually confirmed dates.

Blackboard must feed this calendar. The current Blackboard strip/panel is transitional debugging, not final product UI.

### Trust

Show uncertainty/state only where needed. Do not silently invent dates. Historical exams remain historical; upcoming placeholders must not masquerade as confirmed.

---

## 3. Opening a subject — the biggest unfinished UX surface

The current `renderCourse()` is still essentially: cover + name/description + `Programa / Clases / Parciales`. That is structurally useful but visually/product-wise far below the intended course-open experience.

The final subject view should feel like entering the subject, not opening a database row.

### Desired first screen / hierarchy

The top of the subject should immediately show, with restrained density:

- strong cover/art identity;
- subject name and semester;
- next important assessment/date;
- progress/current position if authoritative;
- latest/relevant class;
- concise “where I am now” context;
- source freshness/Blackboard state only when actionable.

Do not turn these into a grid of KPI cards. Use layout, type scale, bands/rails and spatial hierarchy.

### Navigation inside a subject

Must preserve and improve access to:

- Programa;
- Clases;
- Parciales / Finales;
- Materiales / sources where appropriate.

Assessment rows should be real entities, not plain metadata lines.

### Programa

- Use actual unit/topic structure rather than generated `Unidad N` fillers.
- Class sessions/materials should attach to units/topics where possible.
- Program should provide useful orientation without duplicating Study System explanations.
- Source links can show what supports each unit while Study System remains authority for exam-study inclusion decisions.

### Clases

- Clear chronology and current/upcoming class state.
- Quick access to live/recent class artifacts.
- Class should expose transcript/notes/boards/materials after the session.
- A class should become a durable source artifact for future assessment prep.

### Parciales / finales

- Assessment entity with stable id, date/status, source evidence and linked Study System instance.
- `Modelos y Teorías II → Parciales → Primer parcial` is the reference path.
- P2/final must not pretend to have a Study System instance until one exists.

### Visual debt / old image feedback

The course-open surface still lacks the richer visual hierarchy discussed around the earlier references/images. The exact old screenshots are not all recoverable as pixel-perfect assets from current durable context, so future execution must preserve the agreed principles rather than inventing a generic dashboard: stronger cover-led identity, clearer next-event focus, compact useful secondary information, less boxed/card-like structure, and more polished spatial composition.

---

## 4. Blackboard as invisible source infrastructure

### Verified now

Blackboard Browser Bridge works end-to-end on Windows/Firefox: extension detected, paired, authenticated session accessible, successful ingest persisted.

### Remaining crawler/data work

- Deterministically discover all current courses without requiring the user to visit each course page.
- Fix course canonicalization so a page/file title can never overwrite the canonical course title.
- Build durable Blackboard-course ↔ Study Library-course alias/id mapping.
- Improve extraction of assignments, due dates, announcements, files, messages and course content.
- Validate and repair `study_bb_files` mirroring/offline storage; file items have been detected but mirror persistence is not yet closed.
- Deduplicate noisy/global announcement/page items.
- Distinguish current vs old courses/semesters.
- Keep provenance/source URL/last seen/freshness.

### Remaining UX work

Remove the debug-like Blackboard panel from the final top-level experience once the source layer is reliable. Replace it with subtle state only when useful, such as:

- connected;
- login needed;
- source stale;
- sync in progress/error.

No exposed engineering vocabulary unless debugging mode is explicitly opened.

### Device friction

Current 0.3.0 flow reduced setup substantially, but Firefox temporary extensions disappear after browser restart. A future low-friction solution should make installation persistent/signed or provide an equivalent durable owner-controlled bootstrap. Do not call this solved until restart persistence is verified.

---

## 5. Study System V2 — finish the reusable engine, not another hand-built exam page

### Product route

```text
Study Library
→ Subject
→ Parciales / Finales
→ Assessment
→ Study System V2
```

Study Library remains parent shell/owner. Study System is an assessment-preparation subsystem.

### Pedagogical invariant

Always preserve:

```text
SOURCES
→ authority
→ real exam profile
→ coverage map
→ pedagogical organization
→ connected summary
→ modules/topics
→ deep explanations
→ relations/contrasts
→ recall/checks
→ practice
→ gaps
→ simulation/production
```

And learner-facing progression:

```text
OVERVIEW → UNDERSTAND → RECALL → PRODUCE
```

A check means “I can retrieve/explain it without looking,” not “I read it.”

MCQ is only a discrimination/coverage radar unless the actual exam format is MCQ.

### Modelos P1 migration

Current Modelos P1 reference works, but is still technically bridged to historical compressed/reference content. Remaining work:

- extract the complete M1–M5 content into a valid `prometeo.study.exam/v2` instance;
- preserve the full current useful content, not the tiny example schema payload;
- preserve connected Historia/Filosofía narrative + author/concept recall atoms;
- preserve M3 anxiety/process model, M4 schemas/reality construction, M5 psychotherapy/alliance content;
- keep real development/case practice;
- point the assessment registry to the generic data-driven renderer;
- retire the transitional reference-surface bridge only after parity is proven.

### Generic renderer

Future AIs should create validated exam instance data, not new bespoke pages. Renderer should own layout/theme/progress/navigation/timer/practice surfaces; subject data owns content/structure.

### Personal progress

Define cross-device personal state for mastery/checks/practice/mnemonic drawings. Keep it separate from shared class state.

---

## 6. Universal Whiteboard — preserve the good system and finish integration QA

Current authority is whatever `.study-system/v2/MANIFEST.json` names; at this handoff WB10 is the authority. Never promote a later number automatically.

### Non-regression floor

Must preserve:

- white paper independent of theme;
- compact stable toolbar;
- pen colors/width;
- true translucent highlighter;
- line/simple/arrow/ticks/dotted;
- true 3-point curve;
- stroke/object eraser;
- undo/clear;
- temporary laser;
- paste/import images;
- move/resize images;
- drawing over images;
- object selection without turning laser into a permanent move tool;
- large legible text objects;
- shapes including rectangle/square/circle/oval/diamond;
- move/resize text/shapes;
- vertical expansion;
- white/lined/grid/cartesian/number-line/timeline backgrounds;
- Pointer Events;
- mouse/touch/stylus/Wacom/iPad support policy;
- tablet mode;
- long-press/callout suppression;
- pen-aware palm rejection when hardware reports `pointerType=pen`;
- high-quality thumbnails rebuilt from source vectors/objects/images/text/shapes;
- smart framing/contain behavior that does not crop useful content.

### Study-topic mode

- Empty topic: only a minimal whiteboard launcher; no fake blank thumbnail.
- Open full board with study reference beside it; mobile reference can overlay.
- Ability to show summary/all/hide text while drawing.
- After real drawing exists, generate mini visual flashcard thumbnail.
- Thumbnail reopens same board.
- Drawing does not mark mastery automatically.

### Class mode

- Multiple named boards, not one eternal board.
- Editable title, owner, private/draft/shared state, date, preview.
- Reopen/edit; duplicate when useful.
- Publish independently without forcing deletion/new blank board.
- Canonical state remains structured/editable; preview is derivative.

### Still open

- Real hardware QA on mouse + Wacom + touch + iPad/stylus.
- Multi-device class QA.
- Simultaneous shared edits are still whole-state/revision, not true CRDT/operation-level conflict-free collaboration. Do not call per-stroke realtime solved.

---

## 7. Live classes / collaboration

Preserve all useful current Study Library capabilities:

- participant profiles;
- per-user color;
- realtime presence;
- shared notes;
- Walky/chat;
- voice/TTS choices;
- recording;
- transcription;
- multiple class boards.

### Remaining validation/integration

- Run real two-device session QA.
- Verify recording/transcription continuity and failure states.
- Verify profiles/colors/presence/Walky on two devices.
- Verify multiple whiteboards private/shared/published.
- Ensure published notes/transcripts/boards become durable class artifacts.
- Make class artifacts linkable as sources for later assessments.
- Keep PERSONAL state separate from SHARED/CLASS state.

Shared/class includes participants, transcript, chat, shared notes, published boards/artifacts. Personal includes mastery, assessment progress, mnemonic boards, private drafts/notes.

---

## 8. Visual language / interaction rules that must survive the redesign

### Two-color system

Current Study Library pair:

- background `#111326`
- ink `#d8d1ff`

Other pairs may exist, but UI chrome should always resolve to exactly two intentional colors plus alpha/color-mix derivatives. Cover/source imagery can be multicolor.

### Design behavior

- Minimal, compact, sophisticated.
- Do not explain obvious interactions with instructional prose in the main UI.
- Do not put a rounded rectangle around every conceptual group.
- Depth only on manipulable/physical objects where it adds meaning.
- Avoid giant labels/titles.
- Avoid decorative symbols/icons that do not improve navigation.
- Controls secondary to content.
- Mobile-first touch behavior while preserving desktop quality.
- Responsive without overlapping panels.
- No fake disabled-looking buttons for unfinished features: either real state/action or omit them.

### Whiteboard visual reference

Prior visual evidence included a dark/digital board with handwritten chemistry-like notes as one of the visual-memory references. The final universal board itself remains white paper per its authority; the useful takeaway from that reference is the natural handwritten/study-object feel, not recoloring the canonical paper surface.

---

## 9. Data model / authority cleanup

- Replace `C` hardcoded runtime catalog with durable real course/semester/assessment/source records.
- Reconcile Blackboard-discovered courses with canonical Study Library entities.
- Keep historical subjects accessible without confusing them with active semester.
- Every assessment has stable ids and status.
- Every class has stable ids and source linkage.
- Study Library owns course/class/assessment navigation; Study System owns exam-source authority/pedagogy; Whiteboard owns drawing physics.
- No duplicate owners for the same concept.

---

## 10. QA / release requirements

A future “do everything” pass should not stop after writing files.

Required validation layers:

1. Static syntax/data validation.
2. Public HTTP verification on GitHub Pages.
3. Browser interaction QA for library, calendar, course-open, assessment route.
4. Blackboard ingestion QA after crawler changes.
5. Two-device realtime class QA.
6. Hardware whiteboard QA for stylus/touch where physically available.
7. Mobile responsive QA.
8. `main` + `gh-pages` reconciliation without force pushes.
9. Durable handoff/backlog/manifests updated after completion.

Do not mark a lane closed merely because an adapter/file exists.

---

## 11. Execution order for a future single-dot run

When the user sends `.` intending full execution, do not ask them to re-explain this scope. Execute in dependency order:

### Phase A — authority + data

- RESYNC current repo/runtime.
- Reconcile this master scope with newer commits.
- Fix Blackboard canonicalization, course discovery, material/file mirror and aliases.
- Replace hardcoded placeholder course data with real durable catalog where authority is available.

### Phase B — home experience

- Rebuild/refine Library shelf surface to the agreed spatial-book design.
- Restore/finish integrated calendar/agenda from real sources.
- Remove Blackboard debug-panel dominance.

### Phase C — subject-open experience

- Redesign the course-open view with cover-led identity, next assessment/class/current context, then Programa/Clases/Parciales/Materials.
- Keep it compact and non-dashboard-like.
- Wire real Blackboard/source artifacts into their correct places.

### Phase D — assessment system

- Finish Modelos P1 full schema extraction.
- Finish generic Study System renderer and switch reference route after parity QA.
- Keep future assessments data-driven.

### Phase E — classes + whiteboard

- Complete WB10 adapter validation in both contexts.
- Improve shared-board conflict handling if feasible without violating authority.
- Run/record class multi-device QA where environment allows.

### Phase F — polish + publish

- Responsive polish desktop/mobile.
- Preserve exact two-color chrome and cover-led visual hierarchy.
- Public verify stable Study Library URL.
- Update this master scope, pending backlog, manifests and integration status with what remains genuinely open.

If a real human-only/hardware-only boundary remains, continue everything else and stop only at that boundary with exact instructions/evidence needed.

---

## 12. Acceptance picture

The finished experience should feel like this:

```text
Open Study Library
→ immediately see a real personal bookshelf by semester
→ glance at a compact real calendar/agenda
→ open a beautiful subject surface with its cover, next important event and current context
→ move naturally between Program / Classes / Assessments / Materials
→ open a live class and use people + transcript + Walky + multiple whiteboards
→ or open an assessment and enter Study System V2
→ understand the full coverage, learn connected explanations, recall without looking, then produce exam-shaped answers
→ optionally draw a mnemonic board and keep a useful visual thumbnail
→ return anywhere without feeling like separate apps were stitched together
```

Blackboard should be felt through correct dates/materials/announcements/sources, not through a debugging box.

This document is the durable “what is still missing” authority for the next comprehensive pass.