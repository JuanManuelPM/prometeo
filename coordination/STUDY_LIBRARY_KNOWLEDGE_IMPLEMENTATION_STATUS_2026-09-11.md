# Study Library — academic knowledge implementation status

Date: 2026-09-11

Authority companions:

- `coordination/STUDY_LIBRARY_KNOWLEDGE_SOURCE_STRATEGY_2026-09-11.md`
- `coordination/STUDY_LIBRARY_MASTER_REMAINING_SCOPE_2026-09-11.md`
- `.study-system/v2/MANIFEST.json`

This file records what has actually been implemented versus what remains open. Do not infer closure from version numbers.

## Implemented

### Canonical academic graph

Supabase now has durable structures for:

- degree programs;
- official curriculum courses;
- actual course offerings;
- course modules;
- source artifacts;
- source claims;
- source-to-source/course/module relations;
- cross-course relations;
- assessment Source Packs;
- exam profiles.

Current counts at this status boundary:

- official curriculum rows: **48** (semester courses + completion-stage Residencia/TFI entries);
- observed Blackboard offerings mapped: **10**;
- current Modelos II course modules: **12**;
- source artifacts: **147**;
- explicit/source-backed claims: **11**;
- compiled Source Packs: **1**;
- compiled exam profiles: **1**;
- generated cross-course relations: **8**.

### Official Psychology curriculum

Canonical program:

- Universidad de Palermo
- Licenciatura en Psicología
- Plan de Estudios 2023
- four years + Residencia + Trabajo Final Integrador

The full public official curriculum is persisted privately in Supabase and safely mirrored as public structural data at:

- `pages/study-library/psychology-curriculum-v1.json`

The Library can therefore represent the whole degree, not only hardcoded/current subjects.

### Blackboard offering map

Observed Blackboard offerings are mapped to canonical courses, including:

- Cognición, Pensamiento y Lenguaje
- Estadística Aplicada a la Psicología
- Filosofía de la Ciencia
- Modelos y Teorías 1
- Modelos y Teorías II
- Modelos y Teorías 3
- Psicología Evolutiva 1
- Psicología Social
- Sensación y Percepción
- Sociología

Current 2026C2 observed offering state is separate from prior 2026C1 state.

The previously corrupted Modelos II Blackboard course title was repaired in canonical persisted data. Attachment names must not become course titles.

### Current Modelos II source graph

Current Drive root and module/PPT organization are indexed.

Current teacher slide sequence persisted as 12 course modules:

1. Antecedentes de las Ciencias Cognitivas
2. Primera y Segunda Revolución cognitiva
3. Procesamiento de la Información — Ansiedad normal y patológica
4. Construcción de la realidad
5. Aproximaciones a la Psicoterapia — Aplicación clínica
6. Conceptualización cognitiva de caso
7. Aplicación Clínica y Conceptualización de Caso
8. Teoría de la Atribución y aplicación clínica
9. Bandura — Aprendizaje Vicario y aplicación clínica
10. Integración en psicoterapia y Apego
11. Terapias de Tercera Generación y evolución TCC en Argentina
12. Psicología Genética

Current Drive bibliography has been indexed by module for M1–M6 and M8–M12. M7 exists in the slide sequence but a distinct `MODULO 7` root folder was not observed in the current Drive root.

Current M1–M5 teacher slide text has been directly read and classified as extracted current teaching evidence rather than filename-only metadata.

### Modelos II P1 source evidence

A current Source Pack exists:

- `modelos-teorias-ii-p1-source-pack-v1`
- status: `usable-current`

A current exam profile exists:

- `modelos-teorias-ii-p1-profile-v1`
- status: `current-evidence-supported`

Strong current sequence evidence supports the M1–M5 boundary: the current teacher Module 5 slide deck ends by announcing that the next class is the **PRIMER PARCIAL**.

Current teacher slides also contain present-day case/application evidence, including the Laura/Susana anxiety exercise and integrative practice across modules. Historical case material is therefore no longer the only case-format evidence.

The Source Pack still records uncertainty honestly: the directly linked current syllabus/cronograma has been announced but has not yet been crawled as a distinct artifact.

### Current offering claims

Persisted source-backed 2026 Modelos II claims include:

- two partial exams = 80% of course grade;
- participation/activities + integrative group work = 20%;
- one recuperatorio per partial at semester end;
- oral mandatory final after course approval;
- maximum four unexcused absences, with recovery work if exceeded;
- current source structure includes syllabus/cronograma, Drive by modules, mandatory/complementary bibliography, class PPTs, clinical cases, integrative final assignment and PRONTO;
- the teacher's information-processing infographic is explanatory support and explicitly not sufficient as the only study source.

### Historical 2015 layer

The public historical Modelos II Drive is persisted as explicitly historical source material.

Indexed top-level evidence includes:

- complete 2015 student summary;
- historical final note;
- historical case-analysis example;
- historical units 1–6;
- Unit 1 child materials where connector access currently returns them.

Historical rules are enforced conceptually and in metadata:

- historical material may orient, compare, supply alternative explanations and old format evidence;
- it cannot define current exam scope unless confirmed by current sources;
- conflicts are preserved rather than averaged.

Some old folder calls currently return no children through the Drive connector. Treat this as `empty or unavailable through connector`, not proof that the folder never contained material.

### Cross-course memory

A first set of relations exists as `generated_relation`, explicitly **not** formal UP prerequisite claims. Examples include:

- Cognición/Pensamiento/Lenguaje → Modelos II;
- Sensación/Percepción → Modelos II;
- Estadística → Métodos de Investigación;
- Neurociencia → later Neurobiología/Neuropsicología;
- Modelos I → later psychoanalytic Modelos line;
- Modelos II → later psychotherapy practice;
- Sociología → Psicología Social.

### Study Library V12

Public V12 knowledge layer is published at the stable Study Library route.

Files:

- `pages/study-library/study-v12-knowledge.js`
- `pages/study-library/study-v12-knowledge.css`
- `pages/study-library/psychology-curriculum-v1.json`

Behavior:

- full four-year Psychology bookshelf by official year/semester;
- current/past/future state separation;
- current subjects foregrounded;
- existing V11 compact calendar preserved;
- official future courses are previewable rather than fabricated as current;
- course interior receives source/currentness context;
- Modelos II Program can render the current 12-module teacher sequence;
- Materials can render current source graph separately from historical sources;
- canonical assessment metadata is merged into course state.

Public HTTP QA passed for index, V12 JS/CSS and curriculum JSON.

No claim is made that visual browser QA has been completed on every target device.

### Private catalog endpoint

`study-catalog-v1` is active and returns authenticated/private academic state including:

- courses/aliases/assessments;
- official program/curriculum;
- offerings;
- modules;
- source artifacts;
- source claims;
- Source Packs;
- exam profiles;
- cross-course relations;
- source summaries.

It uses the existing custom workspace-token authentication and does not expose the private token publicly.

### Blackboard Bridge 0.5.0 published

Bridge 0.5.0 has been committed and published.

Material changes:

- adds Activity Stream, calendar and global announcements as explicit crawl roots;
- parses institutional Blackboard course codes found in page text, so course discovery does not require a normal course link;
- associates announcement/content blocks with course codes when the course appears in the content text;
- avoids using file/attachment pages as canonical course URLs/titles;
- avoids wasting HTML crawl budget by following file URLs as pages;
- raises bounded crawl capacity;
- improves dynamic live-page snapshots with the same course-code discovery logic;
- keeps mirror errors in returned diagnostics.

Important: publication of 0.5.0 does **not** mean the currently loaded temporary Firefox extension has automatically reloaded it. Validation requires a running 0.5.0 extension sync.

## Still open / not falsely closed

### Blackboard deep validation

Current running extension telemetry before a 0.5 reload still shows the old shallow behavior:

- successful authenticated sync;
- about 11 pages / 29 items;
- only one course in the main crawl result.

Need one real 0.5.0 execution before declaring deep discovery fixed. Success criteria:

- more complete course discovery from announcements/activity roots;
- canonical course titles not overwritten by attachments;
- useful per-course links where available;
- no regression in ingestion.

### Blackboard file mirror

Still open.

Last observed instrumented mirror attempt before 0.5 had:

- 2 candidates;
- 0 mirrored;
- 2 failed.

0.5 improves diagnostics/request handling but has not yet been validated in the user's authenticated running Firefox. Do not claim private file preservation works until `study_bb_files` actually contains mirrored files.

### Direct current syllabus/cronograma artifact

Blackboard explicitly says it exists, but the deep crawler has not yet persisted the exact current syllabus/cronograma file/link as a separate source artifact.

Until found, current module/PPT sequence and teacher announcements are strong evidence but the syllabus remains preferred source authority for exact formal scope.

### Full text extraction

The source graph now knows many current Drive files, but most bibliography is indexed as metadata, not fully extracted text.

Current M1–M5 teacher slides have been read/extracted. Further extraction should prioritize:

1. current syllabus/cronograma when found;
2. mandatory bibliography for the active assessment;
3. current cases/TP descriptions;
4. later modules only when their assessment becomes active.

Avoid blindly duplicating entire copyrighted books into public artifacts.

### Preservation queue / delta monitor

Designed but not yet materially closed:

- private preservation of expiring Blackboard course assets;
- Drive/Blackboard meaningful-change detector;
- source freshness/conflict ledger;
- useful notifications without crawler-noise spam.

### Course-completion state

Do not infer `completed` simply because a course appeared in Blackboard in an earlier semester. Completion requires explicit user/record authority.

### Study System renderer migration

Modelos P1 has stronger source authority now, but the generic schema renderer still needs complete content parity before retiring historical/parallel page implementations. Do not promote by version number alone.

### Whiteboard / realtime QA

Still requires genuine device testing for:

- Wacom/stylus/palm behavior;
- iPad/touch;
- two-device class collaboration;
- simultaneous shared-board edits.

Whole-state/revision persistence is not a per-stroke CRDT.

### Firefox persistence

The Bridge remains a temporary unsigned Firefox extension in the current setup. Browser-restart persistence is not solved by 0.5. A signed/published or managed persistent installation remains future work.

## Next execution rule

A future `.` should continue from this boundary, not reconstruct the source strategy.

Priority:

1. validate running Bridge 0.5 against authenticated Blackboard;
2. ingest newly discovered course trees/syllabus/files;
3. repair/verify file mirror;
4. extract current high-authority active-assessment sources;
5. improve course interiors from the richer graph;
6. advance generic Study System parity using the current Source Pack;
7. add preservation/delta monitoring;
8. run real visual/device/multi-device QA where the environment permits.
