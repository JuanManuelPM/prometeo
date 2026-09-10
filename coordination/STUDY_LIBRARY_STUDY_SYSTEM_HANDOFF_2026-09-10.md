# HANDOFF — Study Library × Study System V2 × Universal Whiteboard

Date: 2026-09-10
Repository: `JuanManuelPM/prometeo`

## Purpose

This document transfers the work done in the parallel Study System / whiteboard chat into the larger Study Library workstream.

The receiving AI must treat **Study Library** as the parent product and must **integrate**, not recreate, the two subsystems developed separately:

1. **Study System V2** — reusable exam/partial preparation engine.
2. **Universal Whiteboard** — reusable drawing/visual-memory capability, currently represented by the WB10 contracts/prototype lineage.

The Modelos y Teorías II first-partial page is the reference/demo instance showing how an assessment study surface should behave.

Do not make another standalone competing study app.

---

# 1. Product architecture / ownership

```text
STUDY LIBRARY
│
├── courses / semesters / curriculum
├── classes / live sessions
│   ├── participants
│   ├── shared notes
│   ├── recording / transcription
│   ├── Walky / voices
│   └── Universal Whiteboard (class mode)
│
└── assessments / partials / finals
    └── Study System V2
        ├── source inventory + authority
        ├── exam profile
        ├── coverage map
        ├── overview / summaries
        ├── topics / explanations
        ├── recall / progress
        ├── practice / cases / developments
        └── Universal Whiteboard (topic mnemonic mode)
```

### Study Library owns

- library navigation;
- years / semesters / courses;
- curriculum/program;
- classes and live sessions;
- assessment list / metadata;
- people, presence, collaboration;
- recording, transcript, Walky chat / voice system;
- routing between those surfaces.

### Study System V2 owns

- how sources become an exam-study instance;
- assessment scope and exam-operation profile;
- complete coverage map;
- connected summaries;
- topics and deeper explanations;
- recall atoms / mastery/progress;
- transversal maps;
- practice matching the real exam;
- assessment countdown when relevant;
- personal mnemonic-whiteboard attachment to topics.

### Universal Whiteboard owns

- input physics;
- pen / highlighter / lines / three-point curves;
- laser / selection semantics;
- images and object manipulation;
- large text and shapes;
- board expansion / page backgrounds;
- tablet/stylus mode and palm-rejection policy;
- vector/object persistence;
- high-fidelity mnemonic preview generation.

**Rule:** Study Library and Study System consume this whiteboard capability. They must not fork/reimplement its drawing physics independently.

---

# 2. Current Study Library state to preserve

The current active Study Library lineage is V6 under `pages/study-library/`.

It already contains useful parent-product functionality that must survive integration:

- multiple courses grouped by semester;
- `Programa / Clases / Parciales` navigation;
- live class sessions;
- participants and profile identity;
- per-user color;
- shared notes;
- recording and live transcription;
- realtime collaboration;
- Walky chat;
- improved TTS / voice selection and playback.

Do not regress these while integrating Study System.

Current loader architecture includes V4 core + V5 patch + V6 patch. Treat current `main` as live authority and resync before writes.

---

# 3. Study System V2 canonical authority

Canonical entrypoint:

- `.study-system/README.md`
- `.study-system/v2/README.md`

Required contracts:

- `.study-system/v2/BLUEPRINT.md`
- `.study-system/v2/AI_BUILD_PROTOCOL.md`
- `.study-system/v2/EXAM_INSTANCE.schema.json`
- `.study-system/v2/EXAM_INSTANCE.example.json`
- `.study-system/v2/REFERENCE_MODELOS_TEORIAS_II.md`
- `.study-system/v2/MANIFEST.json`

The receiving AI must read these before designing assessment integration.

## Core pedagogical structure

Do not reduce an assessment page to a generic summary or a list of flashcards.

The reusable structure is:

```text
OVERVIEW
  complete compact map of what exists

UNDERSTAND
  connected summary + deeper explanation + relations + distinctions

RECALL
  small retrievable atoms/checks; "done" means recall without looking

PRODUCE
  actual exam operations: development, case, problem, oral, etc.
```

Important lesson from the Modelos prototype:

- checklist-only information becomes fragmented;
- narrative summary alone hides coverage gaps;
- the useful combination is **connected explanation + atomic recall + exam-shaped production**.

Multiple choice may be used as a discrimination/coverage diagnostic even when the real exam is not multiple choice, but must not masquerade as the real exam format.

---

# 4. Modelos y Teorías II P1 = reference/demo assessment

Use the existing Modelos y Teorías II first-partial implementation as the first real Study System reference.

Reference public page / lab lineage:

- `pages/modelos-teorias-ii.html`
- `pages/study-system-v2-lab.html`

The demo shows the desired study hierarchy:

- compact full-module overview;
- module summary;
- subtopics visible before opening;
- richer explanation on open;
- connected History/Philosophy transversal summary + author recall atoms;
- persistent recall checks and progress;
- practice area separated from the study map;
- two-color study themes;
- optional mnemonic whiteboard attached to individual subtopics.

## Required integration target

Study Library should evolve from:

```text
Modelos y Teorías II → Parciales → Primer parcial → [metadata row]
```

to:

```text
Modelos y Teorías II
  → Parciales
      → Primer parcial
          → Study System V2 instance (Modelos P1 reference/demo)
```

The partial should be an entity with a stable `assessment_id` and a linked `study_instance_id`, not merely text/date metadata.

This reference should remain available as a **demo/example course-assessment** even after future subjects are added, so later AIs and users can see all intended capabilities in one working example.

Do not hard-code the Modelos subject structure as universal. For example, its History/Philosophy transversal map is subject-specific; other courses may use relations such as `event → cause → consequence`, `structure → function → lesion`, etc.

---

# 5. Universal Whiteboard — current authority and non-regression floor

Read:

- `.study-system/v2/WHITEBOARD_CAPABILITY.md`
- `.study-system/v2/WHITEBOARD_OBJECTS_CAPABILITY.md`
- `.study-system/v2/WHITEBOARD_LAUNCHER_STATES.md`
- `.study-system/v2/WHITEBOARD_TABLET_AND_THUMBNAIL.md`
- `.study-system/v2/MANIFEST.json`

The manifest currently marks the WB10 family as the Study System whiteboard prototype/baseline lineage. Do not fall back to the older simplistic class-whiteboard snapshot implementation merely because it is already embedded in Study Library.

## Important recovered whiteboard behavior

The whiteboard was reconstructed from protected Class Player/PageKit lineage rather than invented from scratch. Preserve these semantics:

### Surface / visual

- whiteboard paper is **always white** and does not inherit the current violet/green/etc Study theme;
- its chrome can inherit/contextualize Study Library/Study System, but paper and stored ink remain independent;
- empty topic state shows only a small minimal whiteboard action, **not an empty fake thumbnail**;
- a thumbnail appears only after real visual content exists.

### Drawing tools

- pen with multiple ink colors and widths;
- true translucent highlighter;
- straight line variants: simple, arrow, ticks/marks, dotted;
- three-point curve where all three user points are pass-through points;
- stroke/object eraser;
- undo and clear;
- compact fixed-position toolbar; options use popovers instead of shifting tool positions.

### Laser / selection

Laser has dual-purpose object-selection semantics recovered from the prior good whiteboard:

- visible transient laser dot/trail;
- laser never persists as ink;
- click object/image = select;
- drag over an unselected object can remain a laser gesture;
- selected object can then move/resize;
- when returning to pen/highlighter/line, objects stop stealing drawing gestures so the user can annotate directly over images/objects.

### Objects

- pasted/imported images;
- move/resize images;
- large text object tool, intended to remain legible from far away on desktop;
- text sizes include large display-scale values;
- geometric forms such as rectangle/square/circle/oval/diamond, with controlled stroke/fill options;
- text/forms/images are objects and do not turn the whiteboard into a slide editor;
- drawing remains possible over those objects.

### Board expansion

The board is not limited to one viewport. It supports adding working space / board sections and useful backgrounds such as white, lined, grid, Cartesian axes, number line or timeline.

### Tablet / stylus mode

- explicit tablet mode;
- suppress browser long-press, selection/copy-paste callouts and unwanted touch gestures on drawing paper;
- use Pointer Events;
- when `pointerType="pen"` is available, reject palm/finger drawing on the paper while keeping toolbar touch usable;
- do not claim impossible perfect palm rejection on hardware/browser combinations that report pen and palm indistinguishably as generic touch.

### Mnemonic previews

Do NOT use a stale low-resolution screenshot of the visible canvas as canonical preview.

High-fidelity preview must be regenerated from the underlying vector/object sources and include:

1. imported images;
2. shapes;
3. large text;
4. freehand/vector strokes.

The preview should auto-frame actual content, use sufficient resolution, preserve readability, and avoid cropping large text merely to fill the card.

---

# 6. Two whiteboard contexts, one engine

The universal engine needs adapters for different ownership/persistence contexts.

## A. Study-topic mode

Owner: Study System / current learner.

- one optional board per topic initially, extensible later;
- board can collapse to a mnemonic thumbnail in the topic header/card;
- drawing itself does NOT automatically mark the topic mastered;
- state is personal learning state.

## B. Class/session mode

Owner: Study Library live class.

- may have **multiple named boards**, not one eternal board forced to be erased/reused;
- each board may remain private/draft until explicitly shared/published;
- published boards may become class-note blocks/cards;
- realtime/persistence can use Study Library/Supabase adapters;
- publishing a board should not destroy the working board or prevent creating a new one.

Do not make class mode save only a flattened screenshot and lose editability. A rendered image may be used as a display preview, but canonical state should be the structured whiteboard state.

---

# 7. Separation of personal vs shared state

Keep these domains distinct:

### Shared class state

- participants;
- shared notes;
- chat;
- transcript;
- published class boards / shared artifacts.

### Personal study state

- assessment progress;
- recall/mastery;
- mnemonic whiteboards attached to study topics;
- private drafts unless explicitly shared.

A later synchronization layer can make personal state portable across devices, but collaboration must not accidentally expose private study artifacts.

---

# 8. What NOT to do

- Do not create a third competing study application.
- Do not replace Study Library V6 navigation with the Modelos page.
- Do not copy the entire WB10 code into every feature area and fork it.
- Do not use the old class `canvasSnapshot()` behavior as the whiteboard authority.
- Do not turn every curriculum unit into a Study System assessment.
- Do not treat a program-unit description as the exam study summary.
- Do not make an empty white rectangle/card for every topic before the learner draws.
- Do not recolor whiteboard paper based on the Study theme.
- Do not degrade tablet/stylus behavior.
- Do not remove/replace the currently improved V6 voices, collaboration, recording or transcription while integrating.
- Do not promote a new whiteboard candidate merely by version number; preserve current manifest/contract authority until human evaluation.

---

# 9. Required integration work

After full RESYNC of current `main`, perform the following materially rather than only planning:

1. Read Study Library V6 code and all Study System V2 canonical docs.
2. Reconcile this handoff with any newer concurrent changes; current `main` wins over stale assumptions.
3. Introduce a first-class assessment entity/routing model in Study Library (`assessment_id`, course, label/date/status, `study_instance_id`).
4. Make `Modelos y Teorías II → Parciales → Primer parcial` open the existing Study System reference/demo.
5. Keep Modelos P1 as a durable demo/reference showing the intended partial-study experience.
6. Define a reusable Study System rendering/instance boundary so future assessments supply data/content rather than a new hand-built UI.
7. Replace/deprecate Study Library's internally forked/older board physics with an adapter to the universal whiteboard authority.
8. Preserve class-mode collaboration/realtime while adopting structured whiteboard state and multiple-board lifecycle.
9. Preserve all V6 voice/chat/profile/recording/transcription functionality.
10. Add/update manifests/coordination docs so future AIs can discover this hierarchy without old chats.
11. Publish a usable integrated version on the stable Study Library path and verify desktop + phone/tablet behavior.
12. Do not delete old artifacts until their role is explicitly superseded and documented.

---

# 10. Acceptance criteria

Integration is successful when a user can:

```text
open Study Library
→ choose a subject
→ browse Program / Classes / Assessments
→ open an assessment
→ receive the Study System V2 study experience
→ open a topic
→ optionally create a mnemonic board
→ close it and see its real visual thumbnail
→ return to class surfaces without leaving the parent Library
```

and separately:

```text
open a live class
→ keep using current people / notes / transcript / Walky functionality
→ create/use one or more editable universal whiteboards
→ keep them private/draft or explicitly publish/share them
→ create another board without erasing the previous one
```

No regression in V6 voices or collaboration, and no regression from WB10 whiteboard contracts.

---

# 11. Context supplied by chat

The user may paste the entire parallel Study System chat after this prompt. Treat that conversation as design/reasoning evidence and detailed feedback history. The repository contracts listed above are the durable technical authority. If pasted-chat claims conflict with newer repository state, inspect/reconcile rather than blindly replaying old steps.

The final goal is one coherent product:

**Study Library = parent academic environment**
**Study System V2 = assessment preparation subsystem**
**Universal Whiteboard = shared visual-work engine**

Do not ask the user to manually reconstruct work already persisted in the repository.