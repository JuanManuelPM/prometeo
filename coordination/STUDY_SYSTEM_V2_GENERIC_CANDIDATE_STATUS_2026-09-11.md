# Study System V2 — generic renderer candidate status

Date: 2026-09-11

Status: `QA_CANDIDATE_NOT_PROMOTED`

This is a durable execution boundary. Do not replace the live Modelos II reference surface merely because the generic renderer exists.

## Material implementation now present

### Generic engine candidate

Public files:

- `pages/study-system-v2-generic.html`
- `pages/study-system-v2-generic.css`
- `pages/study-system-v2-generic-v2.js`

The renderer is data-driven. Ordinary exam content lives in a `prometeo.study.exam/v2` instance rather than being hard-coded into the engine.

Implemented baseline behavior:

- module rail / complete topic inventory;
- generous open theory surface;
- compact topic anchors;
- connected explanation;
- relation / do-not-confuse / exam-use panes;
- source references and source inspector;
- recall atoms with reveal;
- persistent topic mastery;
- progress derived from mastery;
- two-color themes only;
- countdown only while the exam datetime is in the future;
- practice drawer rather than permanently consuming theory space;
- on mobile, practice is a bottom sheet and the theory surface owns the vertical screen by default;
- practice completion persistence;
- transversal map rendering;
- WB10 launcher per topic, using an instance-qualified topic id so drawings/thumbnails do not collide across exam instances;
- WB10 thumbnail return into the topic row.

State uses the canonical per-instance namespace for engine settings/mastery/practice:

- `study:v2:<instance_id>:settings`
- `study:v2:<instance_id>:mastery`
- `study:v2:<instance_id>:practice`

WB10 itself still uses its historical storage prefix internally, but the generic launcher includes the `instance_id` inside the WB topic id. This prevents cross-instance collision without rewriting the accepted WB10 engine during candidate construction. A later engine cleanup may normalize WB storage prefixes, but must preserve/migrate existing boards.

## Canonical Modelos II P1 instance

New instance:

- `pages/study-library/instances/modelos-teorias-ii-p1-v2.json`
- `instance_id = modelos-teorias-ii-p1-v2`
- schema = `prometeo.study.exam/v2`

Current shape QA:

- 5 modules;
- 20 connected topics;
- 10 practice items;
- 13 source descriptors;
- 0 missing topic/practice source refs;
- 0 topics missing required id/title/anchor/summary/explanation/source_refs.

The module boundary is current evidence-supported M1–M5. The current M5 teacher deck explicitly places the first partial after module 5. Exact exam format remains unclaimed because the direct syllabus/cronograma artifact is still not crawled.

The instance distinguishes:

- current teacher slides / current authority;
- current evaluation evidence;
- current supporting bibliography;
- Blackboard current authority metadata without publishing private Blackboard URLs;
- historical 2015 sources as `historical_or_old` only.

Practice follows the current evidence profile:

- development;
- recall;
- comparison;
- cases;
- cross-module integration;
- one MCQ used explicitly as discrimination radar, not as a claim about real exam format.

## Public candidate

Candidate route:

`https://juanmanuelpm.github.io/prometeo/pages/study-system-v2-generic.html`

The default candidate loads the Modelos II P1 v2 instance. Other future instances can be supplied through the `instance` query parameter without modifying the renderer.

HTTP publication QA passed for:

- generic HTML;
- generic renderer JS;
- instance JSON.

The public instance JSON parsed successfully through the publication endpoint and passed structural checks listed above.

## Registry / persistence

`pages/study-library/assessment-registry-v1.json` now records a nested candidate for `modelos-teorias-ii-p1`:

- status `qa-candidate-not-promoted`;
- generic-v2 renderer;
- canonical v2 instance;
- HTTP QA passed;
- schema-shape QA passed;
- visual/device QA pending.

The same candidate state is persisted in `study_assessments.metadata` in Supabase. The live `study_instance_id` remains `modelos-teorias-ii-p1-reference` and the live renderer remains the `reference-surface-bridge`.

## Promotion gate

Do not promote the generic candidate until all of these pass materially:

1. Visual parity / improvement against the accepted Modelos reference on desktop.
2. Small-phone visual QA, especially vertical theory space and collapsible practice.
3. Topic open/close, source inspector, recall, mastery and practice interactions.
4. Reload persistence for mastery/practice/theme.
5. WB10 open/close, drawing persistence and thumbnail return from at least one topic.
6. No state collision between two different instance ids.
7. Touch QA.
8. No regression to Library → assessment → Study System navigation.
9. Current reference-only capabilities that are still valued are either reproduced or explicitly retired by authority.

Hardware-specific stylus/palm and two-device collaboration remain separate WB/class QA boundaries and are not prerequisites for merely validating the generic Study System reading/practice layout, but they remain prerequisites for declaring the overall whiteboard/class stack done.

## Related Blackboard/source work completed at this boundary

Server-side protection now exists independently of the browser extension:

- Blackboard file/page titles cannot downgrade canonical course titles;
- attachment URLs cannot replace a proper course URL;
- Blackboard items automatically enter the unified `study_source_artifacts` graph;
- unmapped global items may map to canonical courses through institutional course codes;
- `study_meaningful_bb_changes` exposes canonical course-aware Blackboard deltas;
- `study_preservation_queue` exists and is noise-filtered;
- a successful future `study_bb_files` mirror automatically marks the source and preservation queue item as preserved.

Current preservation queue contains only the two known pending Modelos Blackboard file/image assets, not global Blackboard chrome/noise.

The direct current Modelos syllabus/cronograma artifact and successful authenticated file mirror remain open. Bridge 0.5 code is published but the currently loaded temporary Firefox extension has not yet proven a 0.5 deep sync.

## Next autonomous execution

Before another write: RESYNC main + gh-pages + runtime.

Then prioritize, in order:

1. candidate interaction/visual QA that can be automated;
2. migrate any clearly valuable reference-only behavior into the generic engine without hard-coding Modelos;
3. only after parity, consider candidate promotion in the assessment registry;
4. continue Blackboard deep-crawl/mirror work once a running 0.5 extension supplies fresh evidence;
5. never invent closure for direct syllabus discovery, file mirroring, stylus/palm QA or simultaneous multi-device whiteboard editing.