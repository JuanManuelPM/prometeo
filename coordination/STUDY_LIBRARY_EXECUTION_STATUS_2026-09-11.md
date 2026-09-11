# Study Library — comprehensive execution status

Date: 2026-09-11
Scope authority: `coordination/STUDY_LIBRARY_MASTER_REMAINING_SCOPE_2026-09-11.md`

This file records what the single-dot comprehensive pass materially changed and what remains genuinely unclosed. It is not permission to infer success without QA.

## Implemented in this pass

### Study Library V11 experience layer

Added:

- `pages/study-library/study-v11-experience.js`
- `pages/study-library/study-v11.css`

V11 preserves the existing V4→V10 functional stack and replaces only the normal library/course presentation after those layers initialize.

Implemented target behavior:

- bookshelf-first home instead of generic dashboard/card grid;
- semester shelves populated from real Blackboard-discovered courses when available;
- compact integrated calendar with month / week / agenda views;
- calendar sources combine Blackboard events and Study Library assessment registry;
- Blackboard technical/debug panel is hidden in normal product UI;
- richer course-open surface: cover identity, next assessment, latest class, source freshness/count;
- `Programa / Clases / Parciales / Materiales` navigation;
- real Blackboard materials appear inside the course instead of a detached Blackboard panel;
- generated/filler Modelos units explicitly marked as placeholder lineage are filtered from the active program surface;
- Blackboard exam events can derive assessment metadata when an event can be correlated to a course through captured course-key links;
- mobile shelf/calendar/course compositions are included.

The existing live-class/session renderer, profiles, presence, Walky, voices, recording, transcription, shared notes and V10 class-board adapter were not replaced.

### Blackboard Bridge 0.4.0 code

Updated source package:

- canonical course-title scoring prevents filenames/generic page labels from overwriting a better course title;
- full sync seeds its queue from already-known canonical Blackboard course URLs as well as the portal roots;
- crawl budget increased while remaining bounded;
- file mirroring records failure reasons and exposes mirror counts in sync telemetry;
- pairing diagnostics V3 now forwards mirror statistics;
- `study-blackboard-probe-v1` deployed as version 2 with richer sync/file telemetry;
- Windows/ZIP installer now requests Bridge 0.4.0 assets with a new cache version.

Important validation boundary: 0.3.0 is the version already proven end-to-end in the user's Firefox. 0.4.0 is published source/package code but is not considered browser-validated until the temporary Firefox add-on is reloaded/reinstalled and a fresh sync is observed. File mirroring remains open until that run proves `study_bb_files` receives the detected files.

### Reusable Study System V2 renderer boundary

Added:

- `pages/study-system-v2-renderer.html`
- `pages/study-system-v2-renderer.css`
- `pages/study-system-v2-renderer.js`

Renderer consumes a `prometeo.study.exam/v2` instance and supplies reusable:

- Mapa / Entender / Recordar / Producir phases;
- module/topic expansion;
- connected explanation surfaces;
- recall atoms with persistent personal checks;
- practice/answer/rubric reveal;
- source/exam profile side information;
- two-color theming;
- Study-topic Universal Whiteboard launcher/overlay with reference beside the board and source-rendered mnemonic thumbnail reuse.

Added `pages/study-system-instances/modelos-teorias-ii-p1-shadow-v1.json` as a migration shadow only. It is intentionally NOT promoted to the Modelos P1 route because the historical reference still contains more detailed M1–M5 content than the data safely extracted so far. No content was invented to fill that gap.

### Integration manifest

`pages/study-library/INTEGRATION_MANIFEST.json` advanced to V11 and now records the V11 experience layer, Bridge 0.4 staged state, generic Study System renderer, migration shadow and unchanged WB10 authority.

## Still open after this pass

### Requires browser/user validation

- load/reload Firefox temporary Bridge 0.4.0;
- verify a fresh sync discovers the known current/visible courses deterministically;
- inspect new file-mirror diagnostics and prove files persist in `study_bb_files`;
- visual/browser QA of V11 home, calendar, course-open, materials and existing live-class routes on the user's real browser;
- confirm there is no regression in V7/V8/V10 collaboration behavior after V11 presentation patching.

### Requires source extraction, not invention

- full parity migration of the detailed Modelos P1 M1–M5 historical compressed reference into canonical `EXAM_INSTANCE.schema.json` data;
- practice/rubrics and recall atoms must be copied from supported source evidence, not guessed;
- only after parity may `assessment-registry-v1.json` switch Modelos P1 from `reference-surface-bridge` to the generic renderer.

### Requires multi-device/hardware QA

- two-device profiles/presence/Walky/notes/recording/transcription/class-board test;
- Wacom / touch / iPad-stylus Universal Whiteboard behavior;
- palm/long-press behavior on real hardware;
- shared whiteboard concurrency is still whole-state/revision, not a per-stroke CRDT.

### Still not solved product-operationally

- Firefox stable temporary add-on does not survive restart; persistent/signed extension deployment remains a separate owner/browser-distribution problem.
- real supplied cover artwork is still absent from durable repository context; V11 uses intentional two-color cover art rather than fabricating old image references.

## Closure rule

Do not mark the remaining items closed from file existence alone. Close only after the validation layer appropriate to each item is observed and persisted.
