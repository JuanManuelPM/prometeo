# PROMETEO · PART 2 EXECUTION PLAN

Status: **PREPARED — NOT STARTED**

Part 2 question:

> How does Prometeo know what every artifact is, remember durable truth across chats/models/devices, assemble only the context a task needs, and return tested candidates without making the human manage the machinery?

This plan starts from `coordination/PART2_INPUT_CONTRACT.json` and the repaired Part 1 code anchor. It does **not** redesign V53.

---

## 0. Non-negotiable boundaries

1. V53 remains the visible canonical frontend until a later exact candidate is visually accepted.
2. V23 remains a physics oracle / rollback donor, not visible current.
3. No chat is canonical storage.
4. No “highest version wins” rule.
5. `EXISTS != PARTICIPATES`: stored material is not automatically context.
6. LOCAL privacy is fail-closed and inherited through lineage unless deliberately declassified by an explicit, reviewable operation.
7. No silent last-write-wins for durable state.
8. Candidate != Human Accepted != Served.
9. Human-facing surfaces stay simple; plumbing is backstage.
10. Part 2 does not consume the browser/perceptual/release gates reserved for Part 3.

---

# PHASE 2.01 — Catalog truth verifier

## Goal
Turn `catalog/tree.json` + `catalog/pages.json` from convenient data files into verifiable source inputs.

## Build

- `catalog/CATALOG_MANIFEST.json`
- `catalog/CATALOG_DIGEST.json`
- `shared/catalog/v1/catalog.js`
- `shared/catalog/v1/catalog.schema.json`
- `tests/part2-catalog.test.mjs`

## Required behavior

For every page:

- stable `page_id`;
- title;
- category/path;
- source identity;
- current href/artifact;
- status;
- authority class;
- exact source digest when known;
- dependencies;
- last verified timestamp;
- Human Accepted / Candidate / Reconstructed flags kept separate.

Validate:

- duplicate IDs;
- tree references to missing pages;
- orphan pages;
- cycles in tree;
- invalid status transitions;
- missing source lineage;
- two entries claiming one canonical identity;
- live page with missing href;
- href collisions when they imply same product identity accidentally.

## Gate P2-CATALOG
No downstream Current Graph may use unverified catalog bytes.

---

# PHASE 2.02 — Living Lineage graph

## Goal
Represent history without confusing chronology, capability, authority, and currentness.

## Build

- `lineage/LINEAGE_GRAPH.json`
- `lineage/CAPABILITY_REGISTRY.json`
- `lineage/SUPERSESSION.jsonl`
- `shared/lineage/v1/lineage.js`
- `tests/part2-lineage.test.mjs`

## Per artifact/version fields

- artifact/version ID;
- product/capability IDs;
- source SHA/digest;
- parent(s);
- supersedes;
- superseded_by;
- role;
- authority;
- state;
- known gains;
- known losses;
- Human Accepted scope;
- rollback role;
- historical evidence links.

## Capability view

For each capability record:

- BEST_KNOWN;
- SECOND_BEST;
- HUMAN_ACCEPTED;
- LATEST_EXPERIMENT;
- LOST_CAPABILITY;
- ROLLBACK_DONOR.

This prevents “v57 > v53 therefore v57 is truth.”

---

# PHASE 2.03 — Current Graph

## Goal
Create one durable answer to “what is current?”

## Build

- `state/CURRENT_GRAPH.json`
- `state/HEAD.json`
- `state/DOT_STATE.json`
- `state/PARENT.json`
- `shared/current-graph/v1/current-graph.js`
- schemas and migrations;
- tests.

## Required concepts

- SOURCE;
- RECOVERED;
- RECONSTRUCTED;
- CANDIDATE;
- TESTED_CANDIDATE;
- HUMAN_ACCEPTED;
- SERVED;
- ARCHIVED.

## Current Graph must track

- visible frontend current;
- served current;
- Human Accepted current;
- candidate current;
- active branch/workstream;
- page currents;
- shared component currents;
- pending work;
- parent version;
- last durable receipt;
- exact source identities.

## Invariants

- exactly one HEAD per namespace/product where singularity is required;
- Human Accepted pointer cannot move from a candidate-only receipt;
- Served pointer cannot move without served evidence;
- no reference to an unknown artifact;
- no cycle in parent/current relations;
- state transitions explicit and receipt-backed.

---

# PHASE 2.04 — RAW_RECENT intake

## Goal
Store recent evidence without prematurely turning it into truth.

## Build

- `context/raw_recent/`
- `shared/context-foundry/v2/intake.js`
- `schemas/raw-record.schema.json`

## Inputs

- messages;
- screenshots;
- files;
- generated artifacts;
- tool outputs;
- notes;
- change observations.

RAW_RECENT records contain provenance and privacy, but **not automatic authority**.

---

# PHASE 2.05 — Note Atoms

## Goal
Turn important observations/decisions into small, traceable units rather than opaque summaries.

## Build

- `context/note_atoms/*.jsonl`
- `shared/context-foundry/v2/note-atoms.js`

## Atom fields

- atom ID;
- claim;
- epistemic type;
- authority;
- source refs;
- product/capability tags;
- privacy;
- supersedes;
- contradiction refs;
- created/verified timestamps;
- currentness status.

No atom may silently overwrite an earlier atom.

---

# PHASE 2.06 — PENDING / CARRY / WATERMARKS

## Goal
Make continuation deterministic.

## Build

- `state/PENDING.json`
- `state/CARRY.json`
- `state/WATERMARKS.json`
- `shared/continuity/v1/continuity.js`

## PENDING
Unfinished work with owner, dependencies, blocker, next action and source frontier.

## CARRY
Minimal facts/decisions that must survive into the next work cycle.

## WATERMARKS
Per source/index/stream:

- last ingested item;
- last curated item;
- last summarized item;
- last exported item;
- last verified digest.

No source should be reread from zero unless watermarks are invalidated.

---

# PHASE 2.07 — Books HOT / WARM / COLD

## Goal
Keep context deep without loading the entire history on every task.

## Build

- `context/books/HOT.json`
- `context/books/WARM.json`
- `context/books/COLD.json`
- promotion/demotion rules;
- tests.

## HOT
Current invariants, active decisions, direct dependencies, pending work.

## WARM
Related recoverable history/capabilities.

## COLD
Historical archive and fossils.

Movement among levels must be evidence-based and reversible.

---

# PHASE 2.08 — Supersession engine

## Goal
Make “this replaces that for this scope” explicit.

## Build

- durable append-only supersession records;
- resolver;
- contradiction detection;
- scope-aware supersession.

Example:

`V53_VISIBLE_CURRENT` supersedes `V23_AS_VISIBLE_BASE`, but does **not** supersede `V23_PHYSICS_ORACLE`.

Supersession must be scoped to product/capability/decision dimension.

---

# PHASE 2.09 — Golden References registry

## Goal
Treat screenshots/videos/HTML/files as first-class historical evidence without confusing representation with source.

## Build

- `golden/GOLDEN_REFERENCES.json`
- `golden/assets/` references/metadata;
- `shared/golden/v1/golden.js`

Fields:

- artifact/source identity;
- screenshot/video identity;
- viewport/device;
- interaction state;
- timestamp;
- accepted/rejected status;
- exact bytes SHA when available;
- perceptual notes;
- relationship between image evidence and source bytes.

Rule: screenshot never substitutes exact source bytes when exact source exists.

---

# PHASE 2.10 — Context Foundry v2 pipeline

## Goal
Expand v1 selection kernel into the real context system.

Pipeline:

`BYTES -> INDEXED -> RETRIEVABLE -> CURATED -> AUTHORITY -> PRIVACY -> SELECTED -> CONSUMED -> REOPENABLE`

## Build

- `shared/context-foundry/v2/`
- byte registry;
- index registry;
- retrieval API;
- curation records;
- authority resolver;
- privacy resolver;
- lineage resolver;
- consumption receipts;
- reopen handles.

## Critical repairs over v1

- explicit IDs may not bypass privacy policy;
- role/tag/ID filter semantics are explicit rather than accidental;
- derived privacy inherits maximum source restriction unless explicit declassification receipt exists;
- superseded atoms are not selected as current truth unless historical context requested;
- contradictory high-authority records surface conflict instead of arbitrary ranking;
- selection is deterministic for equal inputs;
- selection result records why each item was included.

---

# PHASE 2.11 — Privacy Boundary

## Goal
Make privacy a lineage property, not a cosmetic label.

## Classes

- PUBLIC;
- PROJECT;
- LOCAL.

## Required rules

- LOCAL default for personal context where classification is unknown;
- export fail-closed;
- derived artifacts inherit strongest source restriction;
- declassification requires explicit operation + receipt;
- screenshots and transcriptions carry privacy;
- external worker context packs cannot contain LOCAL unless explicitly authorized by policy and human action where required;
- redaction produces a new lineage child, never mutates source classification.

## Tests

- LOCAL direct export;
- LOCAL through derived summary;
- LOCAL through Note Atom;
- mixed PROJECT+LOCAL bundle;
- explicit ID attack;
- stale privacy migration;
- missing privacy classification.

---

# PHASE 2.12 — Context Pack compiler

## Goal
Generate the smallest sufficient task context.

## Build

- `shared/context-packs/v1/compiler.js`
- schemas;
- fixtures;
- receipts.

Example request:

“Make Calendar button smaller.”

Pack should contain:

- task/intent;
- exact Calendar source;
- Calendar page contract;
- relevant button/material rules;
- Design Kernel subset;
- relevant Human decisions;
- dependencies;
- applicable Known Diseases;
- tests;
- release policy.

It should **not** include unrelated Student World history, Adriana content, or all Prometeo conversations.

Each pack records:

- included IDs;
- excluded high-relevance candidates and reason;
- privacy decision;
- authority decision;
- source digests;
- token/size budget;
- reopen handles.

---

# PHASE 2.13 — Seed -> Work Item -> Artifact -> Return

## Goal
Formalize AI work metabolism.

## Build schemas

- `schemas/seed.schema.json`
- `schemas/work-item.schema.json`
- `schemas/context-pack.schema.json`
- `schemas/artifact-return.schema.json`
- `schemas/verification-result.schema.json`
- `schemas/acceptance.schema.json`

## State machine

`SEED -> WORK_ITEM -> CONTEXT_PACK -> EXECUTION -> ARTIFACT_RETURNED -> VERIFIED -> CANDIDATE -> HUMAN_ACCEPTED -> INTEGRATED`

With branches:

- BLOCKED;
- REJECTED;
- SUPERSEDED;
- NEEDS_REPAIR;
- ARCHIVED.

No artifact return may mutate Current/Human Accepted directly.

---

# PHASE 2.14 — Durable receipts / authority ledger

## Goal
Replace Part 1 session diagnostics with durable operational authority.

## Build

- `receipts/ledger.jsonl` or equivalent durable append-only representation;
- receipt schemas;
- hash-chain or equivalent tamper-evident ordering where practical;
- reader/validator;
- tests.

Receipt fields include:

- operation ID;
- task/work item;
- actor/worker/model when known;
- base artifact/version;
- source digests;
- files changed;
- output digests;
- tests and evidence;
- privacy/export decisions;
- candidate identity;
- acceptance identity;
- served identity;
- rollback refs;
- timestamps.

Receipts are evidence records, not self-validating claims: tests and exact digests still matter.

---

# PHASE 2.15 — Conflict and migration policy

## Goal
Turn Part 1 fail-closed CAS into useful durable behavior.

Per namespace define:

- RELOAD;
- MERGE;
- FORK;
- RETRY;
- HUMAN_DECISION;
- REJECT.

Author migrations for:

- Navigator semantic state;
- Class state;
- Student World state;
- Current Graph;
- Context records;
- privacy classifications;
- lineage/supersession.

Migration must be deterministic, reversible where feasible, receipt-backed, and tested against corrupted/partial old data.

---

# PHASE 2.16 — Automatic modification resolver

## Goal
Allow a human request to resolve itself to the correct product bytes and work pipeline.

## Build

- `shared/work-router/v1/`
- artifact/page resolver;
- ownership resolver;
- dependency resolver;
- test selector;
- context-pack request builder.

Example:

`"Calendar: make this button smaller"`

becomes:

1. resolve Calendar product/page ID;
2. locate current exact artifact;
3. determine local/shared ownership;
4. resolve applicable design rules;
5. assemble context pack;
6. create work item;
7. execute/return candidate;
8. verify;
9. expose candidate for later acceptance.

The human should not need repo path, SHA, worker ID, branch, or deployment details.

---

# PHASE 2.17 — Chat-agnostic reincarnation

## Goal
A new model/chat reconstructs operational truth from durable sources rather than memory.

## Build

- `PROMETEO_BOOT.json` or equivalent minimal bootstrap;
- `shared/reincarnation/v1/bootstrap.js`;
- machine-readable WAKE packet;
- tests.

Bootstrap must recover:

- what Prometeo is;
- visible current;
- Human Accepted;
- served current;
- pages/artifacts;
- shared engines;
- pending work;
- applicable rules;
- privacy boundary;
- how to create work;
- how to verify;
- how to hand off to release gates.

The bootstrap should point to durable sources rather than copy the whole project into one giant summary.

---

# PHASE 2.18 — Backstage invisibility

## Goal
All complexity above exists without turning the human Home into an ops console.

Human UI concepts stay:

- open;
- search;
- use;
- modify;
- create;
- back.

Backstage may expose diagnostics only through an explicit developer/system view.

Do not surface by default:

- worker IDs;
- SHAs;
- leases;
- migrations;
- receipts;
- internal states;
- provider plumbing.

---

# PHASE 2.19 — Part 2 verification suite

## Required tests

### Catalog
- duplicates;
- orphans;
- missing page;
- invalid href;
- changed digest;
- tree cycle.

### Current Graph
- two HEADs;
- invalid state transition;
- candidate tries to become Human Accepted without receipt;
- Served mismatch;
- unknown artifact pointer.

### Continuity
- watermark resume;
- duplicate intake idempotence;
- pending survives restart;
- carry contains only required frontier;
- HOT/WARM/COLD movement reversible.

### Context Foundry
- deterministic selection;
- authority conflict surfaced;
- explicit ID cannot bypass privacy;
- superseded truth excluded by default;
- historical query can retrieve superseded records;
- privacy inherited through derived records;
- export fail-closed;
- reopenability.

### Work lifecycle
- invalid transition rejected;
- returned artifact cannot mutate current directly;
- candidate tied to exact base;
- stale return rejected or forked;
- verification failure routes to repair.

### Receipts
- missing receipt;
- broken chain/order;
- mismatched artifact digest;
- duplicate operation ID;
- false test claim without evidence reference.

### Reincarnation
- fresh bootstrap;
- missing HOT book;
- stale Current Graph;
- corrupt watermark;
- missing historical source;
- LOCAL source excluded from external context pack.

---

# Exact Part 2 output tree

At minimum Part 2 should leave:

```text
catalog/
  CATALOG_MANIFEST.json
  CATALOG_DIGEST.json

lineage/
  LINEAGE_GRAPH.json
  CAPABILITY_REGISTRY.json
  SUPERSESSION.jsonl

state/
  CURRENT_GRAPH.json
  HEAD.json
  DOT_STATE.json
  PARENT.json
  PENDING.json
  CARRY.json
  WATERMARKS.json

context/
  raw_recent/
  note_atoms/
  books/HOT.json
  books/WARM.json
  books/COLD.json

receipts/
  ... durable ledger ...

golden/
  GOLDEN_REFERENCES.json

schemas/
  seed.schema.json
  work-item.schema.json
  context-pack.schema.json
  artifact-return.schema.json
  verification-result.schema.json
  acceptance.schema.json

shared/
  catalog/v1/
  lineage/v1/
  current-graph/v1/
  continuity/v1/
  context-foundry/v2/
  context-packs/v1/
  work-router/v1/
  reincarnation/v1/

coordination/
  PART2_MANIFEST.json
  PART2_EXECUTION_REPORT.md
```

---

# Part 2 termination gates

Part 2 is **not complete** until all are true:

1. every catalog page has durable identity and authority/status metadata;
2. lineage distinguishes current/best/accepted/latest/rollback roles;
3. Current Graph can answer current/Human Accepted/served/candidate without chat memory;
4. RAW_RECENT, Note Atoms, PENDING, CARRY and WATERMARKS survive restart;
5. HOT/WARM/COLD selection is deterministic;
6. supersession is scope-aware and non-destructive;
7. Golden References link perceptual evidence to exact source identity;
8. Context Foundry v2 enforces privacy inheritance and deterministic selection;
9. task context packs are minimal and reopenable;
10. Seed->Work Item->Artifact->Return state machine works and cannot bypass candidate gates;
11. durable receipts exist and validate;
12. automatic modification resolver can map a named page/request to exact source + context + tests;
13. a fresh bootstrap can reconstruct operational truth without this chat;
14. no Part 2 change requires replacing V53 visual identity;
15. no production/Human Accepted/Served pointer is moved merely to prove Part 2.

When these pass, the next `.` after production is **not Part 3 immediately**: it must first perform the agreed adversarial critique/repair/preparation pass for Part 2.
