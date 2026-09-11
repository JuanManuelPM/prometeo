# Study Library / Prometeo — complete academic knowledge + source strategy

Date: 2026-09-11

Purpose: turn Study Library from a polished course browser into a durable academic knowledge system that knows the official Psychology curriculum, the user's real Blackboard courses, current instructor materials, class artifacts, and historical student resources while preserving source authority and temporal context.

This file is an execution specification. A future `.` should RESYNC current repository/runtime first, then use this strategy without asking the user to re-explain the source model.

Companion authorities:

- `coordination/STUDY_LIBRARY_MASTER_REMAINING_SCOPE_2026-09-11.md`
- `coordination/STUDY_LIBRARY_PENDING_2026-09-10.md`
- `coordination/STUDY_LIBRARY_STUDY_SYSTEM_HANDOFF_2026-09-10.md`
- `.study-system/v2/*`
- current `pages/study-library/*`

---

## 0. North star

Prometeo should know three different things and never collapse them:

1. **What the Psychology degree officially is** — official UP curriculum, years, semesters, course identity and public descriptions.
2. **What the user is actually taking now** — Blackboard course offerings, teachers, dates, syllabus, announcements, assignments, files, course organization, grading rules, current course Drive, and live class artifacts.
3. **What older students historically studied** — public old summaries, old program folders, old cases, old finals and old student material useful for orientation, comparison and idea generation, but never current authority.

The resulting product should answer:

- What courses exist in my degree?
- Which courses am I taking now?
- What comes next?
- What is happening this week?
- What is the real program of this course?
- What sources are current and authoritative?
- What do the teachers actually emphasize?
- What does this exam appear to test?
- What did older versions of the course cover, and what changed?
- What should I study next?
- Which old resources are useful and which are obsolete?

The user should not have to understand or manage this source machinery. It should surface as correct books, dates, materials, study systems and contextual labels.

---

## 1. Source authority model

Every artifact and every extracted claim must have explicit provenance.

### Tier A — official UP curriculum / public institutional pages

Authority for:

- degree structure;
- canonical course names;
- year + semester placement;
- degree duration;
- official general course descriptions;
- practices/residency/TFI structure;
- current public program-level information.

Current official source:

- `https://www.palermo.edu/cienciassociales/psicologia/plan.html`
- `https://www.palermo.edu/cienciassociales/psicologia/licenciatura-psicologia.html`

Do **not** use the public marketing description as authority for a specific professor's exam or current syllabus.

### Tier B — current authenticated Blackboard

Highest practical authority for the *real current offering* of a course:

- actual enrolled course instance;
- teachers;
- current syllabus/cronograma when found;
- announcements;
- class instructions;
- due dates;
- partials/finals/recuperatorios when explicitly published;
- assignments;
- course content tree;
- links to current Drive/materials;
- current files;
- current grading/attendance rules;
- messages or updates that supersede static documents.

Blackboard data is time-sensitive. Always preserve:

- `source_url`;
- Blackboard course key;
- item key;
- first/last seen;
- publication date when present;
- extraction timestamp;
- source kind;
- source title;
- temporal status (`current`, `past_offering`, `unknown`).

### Tier C — current instructor/current-course Drive and materials

For Modelos y Teorías II, current shared Drive root:

`https://drive.google.com/drive/folders/1whgCjIETj-1ZKXyM9W5OCoUuIFynNbXp`

Observed root structure includes:

- module folders including M1, M2, M3, M4, M5, M6, M8, M9, M10, M11, M12;
- `Power Points de clases`;
- a class/video artifact (`Corte Codigo enigma.mp4`);
- optative material.

`Power Points de clases` currently contains a clear current 1–12 teaching sequence, including:

1. Antecedentes de las Ciencias Cognitivas
2. Primera y Segunda Revolución cognitiva
3. Procesamiento de la Información — Ansiedad normal y patológica
4. Construcción de la realidad
5. Aproximaciones a la Psicoterapia — Aplicación clínica 2026
6. Conceptualización cognitiva de caso
7. Aplicación Clínica y Conceptualización de Caso
8. Teoría de la Atribución y aplicación clínica
9. Bandura — Aprendizaje Vicario y aplicación clínica
10. Integración en psicoterapia y Apego
11. Terapias de Tercera Generación y evolución TCC en Argentina
12. Psicología Genética

M1 currently includes source PDFs such as Gardner, antecedents/cognitive development material, etc.

This current Drive is a high-value course source, but Blackboard/current teacher instructions determine what is actually required for a given exam.

### Tier D — live class artifacts generated in Prometeo

Includes:

- recording;
- transcript;
- teacher/student notes;
- published class boards;
- shared notes;
- Walky/chat where pedagogically relevant;
- class materials;
- user annotations.

These are primary evidence of what actually happened in class, but they do not automatically override the official syllabus or explicit teacher corrections.

### Tier E — historical public student Drive (2015)

Recovered public folder:

`https://drive.google.com/drive/folders/0B4TDTdtDhDK8fkl6dzNSNkFJd3Z4dmNQNVdqWV9DQ0N0bVh5YUJ4bzQwWFM4ejFfc0RiNDA?resourcekey=0-Zg8Sq8t5ZprdUlU995nNEg`

Observed contents:

- `[destacado] Resumen Completo - Modelos ll.pdf` (2015)
- `FINAL.txt`
- `EJEMPLO_DE_ANALISIS_DE_CASO.doc`
- `TPs/`
- `PROGRAMA/`
- `UNIDAD_1` through `UNIDAD_6`

Example old Unit 1 contains:

- `magico_numero_7.doc`
- `Autores.pptx`
- `ANTECEDENTES.pdf`
- `ANTECEDENTES.doc`

The 2015 complete summary covers recognizable long-lived course themes such as cognition, James, Frege, Tolman, Turing, Shannon, Wiener, Vygotsky, Bruner, the information-processing paradigm, the Hixon symposium and the first cognitive revolution.

**Policy:** this source is useful for conceptual orientation, historical comparison, alternative explanation, old exam/case format discovery and detecting long-lived core themes. It is **not** current authority. Never silently merge a 2015 claim into a 2026 exam pack.

Any item from this source must carry:

- `historical=true`;
- `year=2015`;
- `source_role=historical_student_material`;
- confidence on whether it matches current curriculum;
- explicit comparison result when current material exists.

### Tier F — Prometeo inference/generated content

Generated explanations, quizzes, maps, contrasts, mnemonic prompts and predicted relationships are derivatives. They must reference the source artifacts that support them.

Generated content can improve pedagogy but must never become a hidden authority layer.

---

## 2. Canonical Psychology curriculum graph

Use current public UP plan as the stable degree skeleton.

### 1st year — 1st semester

- Psicología
- Neurociencia (Psicobiología)
- Psicología del Aprendizaje
- Antropología
- Historia de la Psicología

### 1st year — 2nd semester

- Modelos y Teorías 1 (Psicoanálisis)
- Cognición, Pensamiento y Lenguaje
- Sensación y Percepción
- Filosofía de la Ciencia
- Sociología

### 2nd year — 1st semester

- Modelos y Teorías 2 (Psicología Genética y Cognitiva)
- Modelos y Teorías 3 (Psicología Sistémica y Conductismo)
- Psicología Evolutiva 1 (Niños y adolescentes)
- Estadística Aplicada a la Psicología
- Psicología Social
- Cultura y Sociedad 1

### 2nd year — 2nd semester

- Modelos y Teorías 4 (Escuela Inglesa y Francesa)
- Modelos y Teorías 5
- Psicología Evolutiva 2 (Adultos y 3ra. Edad)
- Métodos de Investigación en Psicología
- Interacción Social y Dinámica de Grupos
- Cultura y Sociedad 2

### 3rd year — 1st semester

- Psicopatología 1
- Psicología de la Personalidad
- Exploración y Evaluación Psicológica 1
- Filosofía
- Salud Pública y Psicología Comunitaria
- Práctica de Investigación

### 3rd year — 2nd semester

- Psicopatología 2
- Psicología de la Educación
- Exploración y Evaluación Psicológica 2 y Rorschach
- Psicología de la Motivación y la Emoción
- Psicología del Trabajo y las Organizaciones
- Prácticas con Diferentes Enfoques en Psicoterapia

### 4th year — 1st semester

- Psicología Clínica y Psicoterapia 1
- Neurobiología de los Trastornos Mentales
- Clínica y Psicofarmacología
- Prácticas en Neuropsicología Infanto Juvenil
- Formación Profesional 1
- Práctica Profesional 1 (Instituciones)

### 4th year — 2nd semester

- Psicología Clínica y Psicoterapia 2
- Psicología y Ética Profesional
- Orientación Vocacional y Ocupacional
- Psicología Forense
- Formación Profesional 2
- Práctica Profesional 2 (Instituciones)

### Completion

- Residencia / Práctica y Habilitación Profesional
- Trabajo Final Integrador

The official public plan describes the degree as 4 years plus Residency and TFI and organizes it around broad axes including psychological processes/neuroscience/development, theories/models/psychopathology/evaluation, professional practice and practical training.

### UI consequence

The library can show the **entire degree map** even before a course is taken, but course state must be explicit:

- `future_plan` — exists in official curriculum but user has not taken it;
- `active` — detected as current Blackboard offering;
- `past` — previously taken / historical Blackboard offering;
- `planned_or_unverified` — manual or uncertain;
- `completed` — only when supported by user record/state, never inferred from calendar alone.

Do not fabricate completion.

---

## 3. Current Blackboard academic world already visible

Blackboard currently exposes course identities including:

- Cognición, Pensamiento y Lenguaje
- Estadística Aplicada a la Psicología
- Filosofía de la Ciencia
- Modelos y Teorías 1
- Modelos y Teorías 2
- Modelos y Teorías 3
- Psicología Evolutiva 1
- Psicología Social
- Sensación y Percepción
- Sociología

This list is already enough to map several offerings onto the official curriculum graph.

Current Browser Bridge can persist:

- course links;
- announcements;
- calendar page/events;
- activity stream;
- course files/attachments when reachable;
- content blocks;
- due-date/event links;
- source page/body previews.

Important Modelos II current-course announcement explicitly states that Blackboard contains or links to:

- syllabus + academic schedule;
- Google Drive material organized by modules;
- mandatory and complementary bibliography;
- class PowerPoints;
- clinical cases module;
- integrative final assignment;
- PRONTO messaging.

Current stated evaluation rules in that announcement include:

- two partial exams weighted 80% of course grade;
- class participation/activities + integrative group work weighted 20%;
- one recuperatorio per partial at the end of semester;
- oral mandatory final after passing the course;
- maximum four unexcused absences, with recovery work needed if exceeded.

Treat these rules as **current offering evidence**, not universal permanent course rules.

Blackboard also contains time-sensitive reminders and corrections. Example: an infographic on information processing/normal-pathological anxiety is explicitly described as explanatory and **not sufficient as the only study source**. This type of teacher instruction must modify source weight in Study System generation.

---

## 4. Blackboard crawler expansion target

Current sync proves authenticated access works, but discovery is still shallow. Expand it into a deterministic course-tree crawler.

### Required root discovery

Start from multiple complementary authenticated roots:

1. Ultra course list.
2. Activity stream.
3. Global announcements page, which exposes many enrolled course identities.
4. Personal calendar.
5. Known persisted course URLs.

Normalize every discovered Blackboard course key to a canonical `study_course` alias.

### Required per-course crawl

For each current or recently active course:

- course outline;
- content/module folders;
- documents/pages;
- files;
- assignments;
- tests/assessments metadata where student-visible;
- announcements;
- calendar events;
- grade/assessment labels if student-visible;
- virtual-class/videoconference folders;
- external Drive links;
- external resource links;
- teacher names where visible;
- syllabus/program/cronograma links/files;
- due dates;
- item hierarchy/parent-child structure.

### Do not crawl indiscriminately

Skip or heavily down-rank:

- Blackboard framework/navigation chrome;
- generic Helpdesk/system content;
- duplicate global wrappers;
- logout/password pages;
- repeated announcement containers with no pedagogical content.

### Canonicalization rules

A file name or announcement attachment may **never** overwrite canonical course title.

Preferred course-title authority order:

1. canonical UP curriculum title;
2. explicit Blackboard course title from course list/outline;
3. alias normalization;
4. never attachment title.

### File mirroring

Blackboard has already found file candidates but mirror persistence is not closed. Implement a durable owner-private mirror for student-accessible course files:

- fetch authenticated bytes in extension context;
- record original URL and metadata;
- hash content;
- persist private storage reference;
- avoid public repo publication;
- respect size limits;
- preserve mime type/file name;
- deduplicate by hash + source identity;
- never treat mirror failure as source absence.

---

## 5. Drive ingestion strategy

### A. Current course Drive

Crawl recursively and create a source inventory, not a flat list.

For each folder/file:

```text
source_id
course_id
offering_id
provider=google_drive
folder_path
title
mime_type
created_at
modified_at
source_role
module_id
possible_class_index
possible_exam_scope
currentness
source_url
content_hash if available
text_extract_status
```

Infer module/order from folder + current teacher PPT numbering, but store inference separately from explicit metadata.

### B. Historical 2015 public Drive

Crawl recursively once and cache metadata/text extracts. Mark every artifact as historical.

Create explicit comparison relationships:

```text
historical_artifact -> possibly_matches -> current_module
historical_artifact -> superseded_by -> current_artifact
historical_artifact -> still_relevant -> concept
historical_artifact -> format_evidence -> exam/case style
```

Do not mix old student summary sentences into current connected summaries without checking current sources.

### C. Historical-summary use cases

Useful for:

- finding concepts that survive across years;
- alternative explanations;
- discovering likely conceptual links;
- old exam terminology;
- sample case-analysis structure;
- checking whether a concept has historically been central;
- bootstrapping a rough course map before current syllabus is fully crawled.

Not valid for:

- current exam scope;
- current dates;
- current grading rules;
- current teacher preferences;
- current required bibliography;
- claims that conflict with newer source material.

---

## 6. Canonical data model

Prometeo should move toward an academic graph rather than a single hardcoded JS catalog.

### `study_degree_programs`

- id
- institution
- degree
- plan_version
- title
- duration
- source_url
- last_verified_at

### `study_curriculum_courses`

- course_id
- canonical_title
- year
- semester
- official_description
- official_source
- current_plan_version
- status

### `study_course_offerings`

Represents one actual semester/commission.

- offering_id
- course_id
- provider
- external_course_key
- external_title
- semester/year
- teachers
- start/end when known
- current_status
- last_seen_at

### `study_course_aliases`

Map Blackboard/Drive/historical names to canonical course ids.

### `study_course_modules`

- module_id
- offering_id
- code/order
- title
- explicit/inferred
- source basis
- currentness

### `study_source_artifacts`

Unified metadata for:

- Blackboard item/file/page/announcement;
- Drive PDF/PPT/video/document;
- class transcript/board/note;
- old public summary/case/final;
- public official page.

Fields include:

- source_id
- course_id/offering_id/module_id
- provider
- role
- authority_tier
- historical flag/year
- title
- url/private storage ref
- content hash
- created/modified/published/seen dates
- text extraction state
- freshness
- trust notes

### `study_source_claims`

For extracted factual/course claims:

- claim_id
- subject
- predicate
- object/value
- source_id
- confidence
- temporal_scope
- superseded_by

This allows Prometeo to know *why* it believes something.

### `study_assessments`

Keep stable assessment identity with:

- course/offering
- type/code
- date
- status
- evidence source
- confirmed vs inferred
- Study System instance id

### `study_exam_profiles`

- assessment_id
- question formats
- teacher emphasis
- required sources
- coverage map
- evidence links
- confidence
- generated_at

### `study_course_relations`

For pedagogical graph edges:

- prerequisite/supports/contrasts/continues/applications
- source-backed vs generated
- confidence

Do not imply formal prerequisite status unless the institution states it.

---

## 7. Study Library UX after this knowledge layer exists

### Home / degree library

The bookshelves should become a real curriculum map:

- four years;
- semester shelves;
- all official courses visible;
- current semester courses visually foregrounded;
- past/completed only when verified;
- future courses lighter/subordinate, still explorable;
- current calendar/agenda beside the library.

A future course may open a **preview** based on public official description and historical/public resources, but it must say that the user is not currently enrolled and must not present old material as current.

### Course interior

Default course-open surface should answer immediately:

- What course is this?
- Is this my current offering or a historical/future course?
- What is next?
- What am I studying now?
- What changed recently?
- What is the real evaluation structure?

Then provide compact access to:

- Programa
- Clases
- Evaluaciones
- Materiales/Fuentes

No generic KPI-card dashboard.

### Source presence should be mostly invisible

Normal UI can use small provenance/freshness hints, for example:

- current teacher source;
- Blackboard current;
- class note;
- historical 2015;
- public official.

Detailed source graph belongs in an optional inspection/debug layer, not the main study surface.

---

## 8. Program reconstruction per course

Prometeo should build a course program from highest-current authority available.

### Program synthesis order

1. Current explicit syllabus/program/cronograma.
2. Current Blackboard folder/module hierarchy.
3. Current teacher Drive organization.
4. Current class sequence/PPT numbering.
5. Current announcements/instructions.
6. Historical course material only to fill tentative orientation gaps.
7. Public general course description only as broad context.

Each module/topic can have:

- canonical label;
- teacher label;
- source artifacts;
- related classes;
- related assessments;
- historical equivalents;
- Study System coverage status.

Any inferred module must be visibly marked internally as inferred until confirmed.

---

## 9. Study System V2 source pack generation

Before an exam instance is generated, build a **Source Pack**.

### Required Source Pack sections

```text
assessment identity
exam date/status
current syllabus scope
teacher announcements/instructions
current module tree
mandatory bibliography
complementary bibliography
teacher PPTs
class transcripts/notes
current cases/TPs
historical comparison resources
known old exams/examples
uncertainties/gaps
```

### Source weighting

Example default priority:

1. explicit current teacher instruction about exam
2. current syllabus/cronograma
3. current mandatory bibliography
4. current teacher slides
5. current class transcript/notes
6. current complementary bibliography
7. current external supporting source
8. historical old course material
9. model-generated explanation

This ordering is contextual, not a simplistic numeric truth. A teacher can explicitly say a slide is “only explanatory, do not study only this”; such instruction changes its study weight.

### Historical comparison step

Before using old student material:

- map old concept to current module;
- check whether current sources still contain it;
- detect changed terminology;
- detect missing/new current material;
- label old examples as historical;
- only then use it for explanation/practice inspiration.

### Result

Future Study System instances should be richer because they can distinguish:

- `must_know_current`
- `current_support`
- `class_emphasis`
- `historically_core`
- `historical_only`
- `uncertain`

This is more useful than dumping all files into one LLM prompt.

---

## 10. Cross-course intelligence

Once the official degree graph exists, Prometeo can connect learning over years without pretending those are formal prerequisites.

Examples of useful generated relationships:

- Cognición/Pensamiento/Lenguaje ↔ Modelos II cognitive material
- Sensación/Percepción ↔ cognitive processing
- Sociology ↔ later Social Psychology/contextual models
- Statistics ↔ Methods of Research / later research practice
- Modelos I ↔ later psychoanalytic courses
- Modelos II/III ↔ later psychotherapy/model comparison courses
- Neurociencia ↔ later Neurobiología/Neuropsicología

Every relation must be marked `generated_relation` unless explicitly supported by official/course sources.

Potential UX:

- “Esto retoma…”
- “Esto te va a servir después en…”
- “Lo viste antes en…”

Keep this subtle and optional.

---

## 11. Calendar intelligence

Unified calendar should combine:

- official/manual academic dates;
- Blackboard calendar;
- current course assessment announcements;
- assignment due dates;
- class dates;
- Study System milestones only when user creates them.

Never duplicate the same Blackboard event through multiple crawl paths.

Use canonical event identity + source aliases.

Agenda priority:

1. exam/final/recuperatorio
2. due assignment/TP
3. required preparation/readings
4. class
5. informational event

Current example already mapped from Blackboard for Estadística includes P1, P2 and recuperatorio. Store actual timezone/source evidence.

---

## 12. Preservation / expiry strategy

Blackboard institutional announcement states that course content may remain available only for a limited period after semester and Zoom recordings for a shorter period.

Therefore Prometeo should support a private **academic preservation queue**:

- prioritize current syllabus;
- current mandatory bibliography links/files;
- teacher slides;
- cases;
- assignments/TP descriptions;
- class recordings/transcripts where permitted and already accessible to the user;
- announcements with pedagogical rules;
- final/partial metadata.

Do not publish private course content to GitHub Pages or public repo.

Public historical Drive files can remain URL-referenced unless a local/private cache is useful.

---

## 13. “Source freshness” and conflict handling

Conflicts are expected.

Example conflict:

- 2015 summary says X;
- 2026 teacher PPT says Y;
- 2026 announcement clarifies Z.

Prometeo should not average them.

Resolution policy:

1. preserve all sources;
2. classify temporal scope;
3. prefer newer/current teacher/current syllabus for current assessment;
4. show internal conflict record;
5. generate learner-facing text from the resolved current state;
6. optionally expose “antes se trabajaba distinto” only if pedagogically useful.

### Confidence labels

Internal confidence examples:

- `explicit_current`
- `current_inferred`
- `historical_confirmed`
- `historical_possible_match`
- `generated`
- `conflict_open`

Do not clutter normal UI with these exact technical labels.

---

## 14. Search / retrieval experience

Prometeo should eventually support searches like:

- “¿Dónde vimos Bruner?”
- “Mostrame todas las cosas del parcial 1.”
- “¿Qué dijo la profesora sobre ansiedad?”
- “¿Hay un caso viejo parecido?”
- “¿Qué cambió respecto del resumen 2015?”
- “¿Qué PPT explica conceptualización cognitiva?”
- “¿Qué materias voy a tener el próximo cuatrimestre?”

Retrieval should respect authority filters automatically.

Default search order for current study questions:

`current Blackboard/current Drive/current class > historical Drive > general generated knowledge`.

---

## 15. Blackboard + Drive monitoring

Once a course is active, Prometeo should periodically detect meaningful deltas:

- new announcement;
- new file;
- changed due date;
- new assessment event;
- changed syllabus/cronograma;
- new teacher slide;
- new Drive module/file;
- new class artifact.

Do not notify for crawler noise or duplicate wrappers.

Persist deltas so another AI can answer “what changed since last week?” without rescanning everything blindly.

---

## 16. Privacy / publication rules

Hard rules:

- authenticated Blackboard content stays private;
- no Blackboard tokens in repo;
- no user identifiers or session secrets in public artifacts;
- no private mirrored PDFs on gh-pages;
- public UP curriculum links are safe to reference;
- public historical Drive links can be referenced, but preserve provenance;
- generated Study System content may be published only when it does not reproduce restricted source material inappropriately.

---

## 17. What to build next — dependency order

### Phase 1 — academic authority foundation

- import current UP curriculum graph into durable canonical tables;
- populate all official Psychology courses by year/semester;
- map known Blackboard aliases to canonical courses;
- distinguish active/past/future without inventing completion;
- store public official descriptions.

### Phase 2 — Blackboard deep crawler

- discover every visible course deterministically;
- recurse course outline/content hierarchy;
- capture syllabus/cronograma/current Drive link when available;
- capture announcements/events/assignments/files;
- repair file mirroring;
- deduplicate Blackboard chrome/global wrappers;
- preserve provenance + freshness.

### Phase 3 — Drive source graph

- recursively index the current Modelos II Drive;
- recursively index the public 2015 Modelos II Drive as historical;
- extract text from supported PDFs/docs/slides;
- map current materials to module/order;
- compare 2015 vs current concept coverage;
- never overwrite current authority with old notes.

### Phase 4 — richer Study Library

- full 4-year bookshelf map;
- active current books foregrounded;
- future official courses previewable;
- integrated calendar/agenda;
- course interior driven by canonical data, not hardcoded `C`;
- `Programa / Clases / Evaluaciones / Materiales` from source graph.

### Phase 5 — Study System source compiler

For each assessment:

- build Source Pack;
- derive exam profile from current evidence;
- generate coverage map;
- compare historical material;
- feed generic Study System V2 renderer/instance schema;
- preserve OVERVIEW → UNDERSTAND → RECALL → PRODUCE.

### Phase 6 — cross-course memory

- connect concepts across prior/current/future courses;
- use class artifacts as retrievable sources;
- allow “you saw this before” context;
- keep generated relationships distinct from official ones.

### Phase 7 — preservation/monitoring

- private archive queue for expiring Blackboard assets;
- Blackboard/Drive delta detector;
- source freshness and conflict ledger;
- notify only meaningful academic changes.

---

## 18. Acceptance criteria

Do not mark this strategy implemented until all of these are true:

1. The official 4-year Psychology curriculum is visible/represented without hardcoded fake courses.
2. Blackboard offerings map to canonical official courses.
3. Current vs past vs future course state is distinct.
4. Blackboard course-tree extraction reaches real syllabus/material folders for at least the current active courses.
5. Current Modelos II Drive is recursively indexed.
6. Public 2015 Modelos II Drive is recursively indexed and always labeled historical.
7. Study System can build one Source Pack that explicitly distinguishes current authority from historical support.
8. Course interior uses real program/material/assessment data rather than fillers.
9. Calendar merges Blackboard assessment/due-date data without duplicate event spam.
10. Private Blackboard materials never leak to public gh-pages/repo.
11. A generated explanation can point internally to supporting source artifacts.
12. A conflict between old and current material is preserved/resolved rather than silently merged.
13. The stable Study Library remains visually compact, two-color in UI chrome and non-dashboard-like.
14. Existing class collaboration + Universal Whiteboard authority is preserved.

---

## 19. Immediate high-value Modelos II application

Modelos II is the best pilot because Prometeo already has four complementary layers:

1. **official curriculum identity** — 2nd year, 1st semester, Psicología Genética y Cognitiva;
2. **current Blackboard offering** — teachers, announcements, rules, current schedule/material pointers;
3. **current course Drive** — modules, bibliography, 1–12 class PPT sequence, cases/clinical material;
4. **historical 2015 public Drive** — complete old summary, units, example case, TPs/final artifacts.

Build a comparison matrix:

```text
concept/topic
current syllabus/module
current teacher PPT/source
current class/announcement evidence
historical 2015 presence
changed terminology?
current exam relevance
confidence
```

This can directly improve the current Modelos P1 Study System while also proving the generic architecture for every future course.

---

## 20. Rule for future AIs

When asked to “complete Prometeo with everything we know”:

- do not simply add more UI;
- first improve the academic source graph;
- RESYNC all authorities;
- prefer current explicit evidence;
- preserve old sources as dated evidence;
- do not clone one-off course pages when generic Study System/data contracts exist;
- do not expose private course data publicly;
- do not ask the user to manually transport information that the connectors/Bridge can retrieve;
- continue material execution until a true human-only/hardware-only boundary is reached.

This document is the durable source-strategy authority for turning Study Library into a complete academic memory and study environment.