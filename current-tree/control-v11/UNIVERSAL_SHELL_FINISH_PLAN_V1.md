# PROMETEO · UNIVERSAL SHELL FINISH PLAN V1

Status: CANDIDATE EXECUTION PLAN
Date: 2026-09-29
Scope: human control surface / Universal Shell / Capture / Work Context / Organism / Page Change
Authority: this plan preserves CURRENT architecture. It does not create a new scheduler, queue, worker family, Current, storage authority or promotion path.

## 0. Human objective

The human objective is not “finish V11 gates” and not “make Page Change perfect”.

The objective is:

One Prometeo surface where the human can see/navigate every relevant page, project, tool, chat/context and organism node; open the exact thing being discussed; capture text/audio/files against that object; return later to the same semantic context; inspect its history/state; and, when desired, turn that accumulated feedback into durable work that existing CURRENT workers can consume and return to the same lineage.

The human must not act as message bus, router or memory.

The surface must be useful before remote execution is perfect.

## 1. Recovered baseline that must not be erased

This plan is based on the already-existing architecture, not a redesign.

### Universal Shell / Universal Control

Recovered historical/current invariants:
- exactly one global Universal Control;
- child/page surfaces do not mount competing Prometeo global chrome;
- one navigation owner and one input/capture owner;
- page navigation and local capture must remain usable without network;
- recording/transcription may survive page movement;
- local save must not wait on remote transport;
- Current/Human Accepted/Served are not inferred from candidate recency;
- persistence cutovers are additive, idempotent, parity-verified and rollbackable.

Relevant durable sources:
- shared/universal-shell/v5/**
- shared/capture/v1/**
- Universal Control backend ownership lineage from commit d8824f4b72770cfc58c8e0eaf8a138b03d54483a.

### Exact Back / reentrancy

A capture is not just text. It must preserve enough semantic identity to return to the exact object/context from which it was created.

Protected behavior:
- page_id / surface_id / project identity;
- semantic anchor where available;
- source URL/path;
- organism parent / context relation where available;
- history and candidate/result lineage;
- deterministic reopen route.

### Work Context

Work Context is the durable continuity spine for semantic work:

PROMPT → EVENT → DECISION/ARTIFACT → CHECKPOINT → REOPEN → CONTINUE.

It remembers where/why/how to continue but does not become source authority.

A chat shell is disposable. A page/project/idea/context survives it.

### Current Tree V2

Mandatory orientation order remains:

CURRENT_TREE_V2 → CURRENT_ARCHITECTURE → DOMAIN_CURRENT → DRIFT → CONTINUE.

Current Tree is an index/projection, never the second owner of truth.

### Design DNA

Binding method guard:

READ DNA → identify invariants/vaccines/goldens → declare preservation contract → isolate change → compare baseline → promote only with evidence.

Most relevant invariants:
- DNA011 PRESERVE_FIRST
- DNA012 BASELINE_MUST_SURVIVE
- DNA016 COMPLEXITY_MUST_EARN_ITSELF
- DNA017 REDUCE_BEFORE_ADD
- DNA018 FRESH_AGENT_TEST
- DNA019 EVIDENCE_OVER_NARRATIVE
- DNA020 GUIDE_IMPROVEMENT_GATE

Most relevant failure vaccines:
- FV001 INFRA_FOR_INFRA
- FV004 LONG_CHAT_AS_HIDDEN_DATABASE
- FV008 REINVENT_EXISTING_CAPABILITY
- FV012 HUMAN_AS_MESSAGE_BUS
- FV014 GOLDEN_ERASURE

## 2. Current product reality

The desired product is much closer than the recent 68% finish dashboard suggests.

current-tree/control-v11/ already contains:
- Ahora
- Proyectos
- Espacios
- Trabajo
- Herramientas
- Historial
- Estadísticas
- Organismo
- static previews
- project/catalog discovery
- organism matching
- Work Context matching
- page-scoped Notas · HACER
- text capture
- audio capture
- attachment transport
- page-scoped history/results
- worker-pool delivery intent
- visible-result projection
- local cache/degraded data layer

current-tree/control-v11/v11.js already merges catalog pages and Visuals, maps pages to organism/context, and opens the Page Change Loop.

shared/capture/v1/change-loop.js already implements the human interaction that was being discussed historically:
page → Notes → capture → history → Think/Work → result.

shared/prometeo-shell/v1/db.js already provides local IndexedDB persistence.

The main regression is not absence of capability. It is that the useful human loop became subordinate to remote workspace/control-plane availability and was presented as a side subsystem instead of the primary interaction model.

## 3. Failure diagnosis

### Failure A · Product objective was replaced by infrastructure completion

The project began measuring G05/G06/G09/G10 closure as if those gates were identical to human usefulness.

They are not.

Infrastructure readiness can improve the product, but the human surface must not remain unusable while infrastructure is blocked.

### Failure B · Notes became a side page

/notes/ is useful as a diagnostic/local projection, but it must not become a second product shell or second navigation authority.

It duplicates the interaction instead of making capture universal.

### Failure C · Remote workspace became an accidental prerequisite

Before this plan, mountPageChangeLoop().open() returned without opening when no remote workspace secret existed.

That violated the older Universal Control rule:
- local actions usable without network;
- local save must not wait for remote;
- Capture owner survives transport failure.

This exact regression was repaired on 2026-09-29:
- commit 3d38ea75b348f98a701137552ca065666fddf513
- test tests/p4-change-loop-local-first-regression.test.mjs
- commit 2e2c97670e39d428d4798fe035d46308b06f02e6

Text/audio page notes now have a local-first path even when remote transport is absent. Work/Think/files remain truthfully transport-gated.

### Failure D · Stable entry point drift

Control Room V10 was CURRENT human surface while newer work was happening in V11 CANDIDATE and older stable/bootstrap routes still existed.

A human should not need to know which version number represents “Prometeo”.

### Failure E · Context/capture/result are visible as separate systems

They are semantically one loop and must be projected as one object lineage:

object → captures → work → candidate/result → history → reopen.

## 4. Preservation Contract

### change_id

CONTROL-UNIVERSAL-SHELL-FINISH-V1

### actor

Current Guide / direct surgical implementation. No new worker cohort is required for the core human-surface closure.

### target

Existing Universal Shell / Control Room V11 candidate and shared Capture/Page Change components.

### requested_delta

Make the existing Control Room the single useful human shell for universal object-scoped capture and review, local-first, while preserving existing CURRENT architecture and routing any later work execution into the existing Work Graph/worker allocator.

### problem_evidence

- Human reports the project already had a large integrated graph/control page and expected notes to extend it.
- /notes/ is a reduced side surface and is not the desired product.
- V11 already contains page-scoped capture but previously refused to open without remote workspace.
- remote Page Change/Supabase control plane has been externally blocked;
- the infrastructure finish percentage therefore does not faithfully represent human-surface completeness.

### touched_invariants

DNA011, DNA012, DNA016, DNA017, DNA018, DNA019, DNA020.

### relevant_failure_vaccines

FV001, FV004, FV008, FV012, FV014.

### baseline_refs

- current-tree/control-v10/
- current-tree/control-v11/
- shared/universal-shell/v5/
- shared/capture/v1/change-loop.js
- current-tree/work-context/invoke.txt
- coordination/design-dna/INDEX.json
- chat migration readiness audit commit 5043fe94003a5e9e061b1dd6ad65fff077198588

### must_preserve

- V10/V11 Ahora, Proyectos, Historial, Estadísticas, Herramientas and Organismo capability;
- static previews rather than running every page live in a catalog;
- Current Tree V2 orientation semantics;
- Work Context continuity semantics;
- Exact Back/reopen semantics;
- one global input/capture owner;
- local-first capture;
- private prompts/captures do not leak to public GitHub Pages;
- Work Graph V1.1 remains sole normal work frontier;
- workers remain fungible;
- no human routing/copying requirement;
- V10 CURRENT_BASELINE and V11 CANDIDATE truth boundary until legitimate promotion;
- remote failure must not erase local human capture.

### forbidden_regressions

- second global Notes product/shell;
- page-local ad-hoc capture stores per surface;
- duplicate navigation/input controllers;
- remote backend required to open/write a local note;
- live iframes for every catalog card;
- human copies notes into chats to make work happen;
- new queue/scheduler/CURRENT/work family;
- treating ACTIVE/PARKED/UI badges as liveness;
- publishing raw private prompts/captures;
- promoting V11 only because this UX becomes useful;
- deleting V10 before parity/acceptance.

### experiment_or_test

Control:
- current V10/V11 behavior and historical Universal Shell invariants.

Candidate:
- V11 with universal local-first page/object capture and semantic reopen.

Required checks:
1. no remote workspace → open a page → Notes opens;
2. type note → reload → note remains on same page/object;
3. audio capture can save locally without remote transport;
4. unavailable remote transport does not blank Control Room;
5. Work/Think/files show truthful boundary rather than fake success;
6. navigating A → B → A never mixes page-scoped notes;
7. existing History/Statistics/Organism remain functional;
8. no second global capture owner appears;
9. public repository/projection contains no private raw capture text;
10. a fresh shell can identify this plan and the protected baseline without chat archaeology.

### promotion gate

Human-surface candidate can be called “usable candidate” when checks 1–9 pass.

It does not become CURRENT/SERVED until the normal authority/promotion path says so.

### rollback

- V10 remains intact.
- shared Capture changes are additive and reversible by commit.
- no destructive migration is required.
- remote worker delivery is not changed by local-first capture.

### truth_boundary

Human usefulness and infrastructure promotion are separate axes.

A local-first Control Room can be genuinely useful while V11 remains CANDIDATE and private remote execution remains partially blocked.

## 5. Target product model

There is one human shell.

Every important object is addressable:
- page
- visual/front
- project
- tool
- Work Context/chat/branch
- Guide
- organism node
- result/candidate when applicable

Selecting an object establishes a semantic focus.

The same universal capture affordance operates against that focus.

A capture records at minimum:
- capture_id
- created_at
- source_kind TEXT/AUDIO/FILE
- object/page identity
- source href/path
- project/surface identity where known
- organism/context refs where known
- semantic anchor when available
- local/remote sync state
- revision
- privacy class

The object view exposes:
- current preview/state;
- notes/captures;
- relevant history;
- related results/candidates;
- context lineage;
- exact reopen route.

“Trabajar” does not invent a second execution system. It freezes selected/pending capture revisions into the existing Page Change/Execution Packet shape and routes into CURRENT work allocation when transport is available.

If transport is unavailable:
- notes remain valid;
- human navigation remains valid;
- work button states the boundary;
- nothing claims queued/worker-active.

## 6. Execution sequence

### P0 · Stop architectural drift

Effective immediately:
- no new Notes app;
- no new scheduler/queue/worker architecture;
- no worker launch merely to design this surface;
- no Supabase recovery prerequisite for local UX;
- /progress/ is observability, not the product roadmap;
- all material changes are checked against this file + Design DNA.

### P1 · Restore local-first Universal Capture

Status: STARTED / first regression repaired.

Required:
- Page Change drawer opens without remote workspace;
- text notes persist locally;
- audio notes persist locally;
- remote-only actions fail closed;
- local capture does not redirect to /notes/.

The first code delta for this phase is already committed:
3d38ea75b348f98a701137552ca065666fddf513.

### P2 · Make V11 the integrated object surface, not a launcher to side apps

Change V11 UI behavior:
- remove the separate top-level Notas route as the normal workflow;
- keep Notas · HACER attached directly to page cards;
- add the same capture entry from organism drawer and project/object detail where identity is known;
- clicking a note/history item restores focus to the owning object;
- keep static previews.

Do not duplicate the editor implementation. Reuse mountPageChangeLoop.

### P3 · Semantic address + Exact Back

Define one canonical client-side focus descriptor, derived from existing IDs, not a new authority:
- object kind
- object key/page_id
- project/surface refs
- context_key if known
- organism node if known
- public/source route
- optional work/result id

Encode only non-secret routing identity in the URL/state.

On reload/back/forward:
- restore selected view;
- restore selected object;
- reopen its Notes/Result when requested;
- never leak private note text into URL.

### P4 · Unify history projections

The user should not hunt across separate systems.

For the selected object, present a chronological lineage assembled from existing owners:
- local captures;
- remote capture/thread events if available;
- Work Context checkpoints/events when available;
- commits/activity relevant to object;
- Page Change execution results;
- candidate/served refs.

This is a projection only. Do not create a new mega-ledger.

### P5 · Stable human route

Once P1–P4 pass:
- one non-versioned human route should resolve to the accepted control candidate/current surface;
- V10/V11 versioned routes remain preserved as baselines/history;
- stale Guide/continuity links must resolve through the stable route rather than hardcoding an old version.

This is a pointer/entrypoint cutover, not a new shell.

### P6 · Remote durability and worker execution

This is after the human surface is already usable.

Priority:
1. restore or replace private sync transport without exposing repository credentials;
2. preserve local outbox/idempotency;
3. sync capture revisions to durable private storage;
4. freeze selected revisions into existing execution packet;
5. allocator CURRENT claims work;
6. result returns to same object lineage;
7. independent verification remains separate;
8. candidate/served/human acceptance remain explicit.

GitHub may store public/sanitized durable work/evidence. Raw private capture text must not be published just to avoid a private transport problem.

## 7. File-level plan

Primary reuse:
- current-tree/control-v11/index.html
- current-tree/control-v11/v11.js
- current-tree/control-v11/data-layer.js
- shared/capture/v1/change-loop.js
- shared/prometeo-shell/v1/db.js
- shared/prometeo-shell/v1/voice.js
- shared/prometeo-shell/v2/sync.js
- catalog/CATALOG_MANIFEST.json
- Organism projection
- Work Context projection

Do not fork these into a new app.

Expected surgical deltas:
- local-only capture state in Change Loop;
- capture entry bindings for organism/projects;
- focus/reopen URL state;
- integrated object history projection;
- stable human entry pointer;
- tests for single owner/local-first/exact-back/privacy.

## 8. Tests required before declaring the human surface finished

### Core UX

- Catalog loads with remote control plane unavailable.
- User can choose any cataloged page.
- Page has preview/source identity.
- Notes opens from that page.
- Text note saves.
- Reload keeps note.
- Switching pages scopes notes correctly.
- Returning restores prior page note set.
- Audio save works local-first.
- Work button does not fake execution when transport is absent.

### Preservation

- Ahora still renders.
- Proyectos still renders.
- Historial remains separate.
- Estadísticas remains separate.
- Organismo pan/zoom/focus remains.
- static preview behavior remains.
- no live-project-simulation explosion.
- V10 still exists.
- no duplicate global input/capture mount.

### Privacy

- raw note text absent from GitHub Pages-generated public state;
- raw private text absent from public URL query/hash;
- no workspace secret/token embedded in public HTML/JS;
- remote payload keeps bearer/auth separate from private data.

### Reincarnation

A fresh Guide reading:
1. Current Tree V2;
2. Design DNA;
3. this finish plan;
4. current V10/V11 source

must conclude the same north star without requiring the human to explain the story again.

## 9. Definition of “we have something”

This milestone does NOT require workers.

It is reached when the human can open one integrated Prometeo Control surface and:
- browse the important pages/projects/nodes;
- see the page/object;
- leave text/audio notes on it;
- reload and find them again;
- move between objects without note mixing;
- inspect relevant object history;
- see truthful sync/work boundaries.

That is the immediate product milestone.

## 10. Definition of “finished loop”

The later complete loop is:

OBJECT → UNIVERSAL CAPTURE → DURABLE PRIVATE REVISION → WORK PACKET → CURRENT ALLOCATOR → WORKER → RETURN → INDEPENDENT VERIFY → RESULT/CANDIDATE → SAME OBJECT HISTORY → EXACT BACK.

This uses existing architecture.

No new queue.
No new scheduler.
No human courier.
No second notes product.
No pretending infrastructure health is product completion.

## 11. Execution checkpoint · 2026-09-29

P1–P5 have now been materially implemented as a served V11 candidate. This checkpoint is evidence of implementation, not a CURRENT/HUMAN_ACCEPTED promotion.

### P1 · Universal Capture local-first

Implemented:
- Notes opens and renders local captures even with no usable remote workspace.
- Remote identity and remote liveness are separate: a stored secret is not treated as proof that transport works.
- Text saves to IndexedDB before remote sync; remote sync is fire-and-reconcile rather than a save prerequisite.
- Audio remains local-first.
- Work/Think/files remain truthfully gated on proven private transport availability.
- Universal Notes overlays host chrome rather than being intercepted by the Control Room header.

Main commits:
- 3d38ea75b348f98a701137552ca065666fddf513
- c391f563a0da469d21e4e4da633a96e632f74486
- 46e261b4fb0383d2f73f4f19a46efac835de6221
- 183db3fa59e8d72fe7c3f0e8e4a49922cc84ddfb

### P2 · Capture native to the integrated object surface

Implemented:
- Side /notes/ is no longer a primary Control Room tab.
- Page cards use the existing Page Change / Capture owner.
- The existing object drawer now exposes Notes.
- Project/Tool/Context/Organism rows that already resolve to semantic nodes use the same drawer and same Capture implementation.
- No new note editor/store/router was created.

Main commits:
- 15993aa50a4a62197689aaa0b1a2e5a69da7d02b
- 0ad85ec56284833d513040c240f0ab7877fce56c

### P3 · Semantic address + Exact Back

Implemented:
- URL carries only non-secret semantic routing fields: view/page/node/panel/work.
- Private note text never enters the URL.
- Reload restores the selected page and Notes panel.
- Browser Back closes Notes when the semantic route no longer requests it.
- Browser Forward restores the same page/panel and local capture.
- Exact object metadata carries page/node/context/object kind without creating a new authority.

Main commits:
- 326657267e1b6710802f205a6645e4f35d15d9c3
- ed52da49f722255cc66c0b5967c37c65e55c2d2c
- d977ceeffff3781cf52fc0bc2aaa3a4665f56ce6

### P4 · Object history/context projection

Implemented:
- Universal Notes can render existing exact-node Work Context and Activity evidence under “Contexto · misma lineage”.
- This is a read projection only. Work Context, Activity, Page Change results and source owners retain authority.
- The projection degrades independently if remote context sources are unavailable.
- Page Change results remain separately typed from notes/context.

Main commit:
- 15993aa50a4a62197689aaa0b1a2e5a69da7d02b

### P5 · Stable public human entry

Implemented:
- Stable route: /current-tree/control/
- Target: /current-tree/control-v11/
- Query/hash semantic route is preserved through the alias.
- Alias declares V11 CANDIDATE and preserves V10 as baseline; it does not silently promote authority.
- main and gh-pages product bytes were compared and matched for the integrated V11 index/script, shared Capture, stable route and route truth file.
- Static preview bytes and the non-authoritative Project Context index were published to gh-pages using existing Git blobs.

Main commits:
- 1b7773105f0103ff913efe2340f1a4c2223a83e9
- cadb443553036b6587eb491fd969d51c6853e0a2

gh-pages publication commit:
- 949f97036b859b38e7f619700634843fe61690aa

### Served browser evidence before final full-site rerun

Run 36575909390 already passed:
- public V11 HTTP 200;
- served index == source bytes;
- served v11.js == source bytes;
- served change-loop.js == source bytes;
- stable route == source bytes;
- stable route redirect/query preservation;
- Universal Shell finish static contract;
- command text fail-closed: typing does not submit work;
- local-first page capture;
- private text absent from URL;
- reload persistence;
- browser Back/Forward Exact Back;
- 390px narrow layout without horizontal overflow;
- truthful stats projection.

That run reached the site before the newly published preview manifest and Project Context projection had propagated, so its only remaining hard failures were HTTP 404 for those two public projections. Both have since been materialized on gh-pages and Pages deployment completed successfully. The next served Chromium run is the final P1–P5 publication check.

### Known non-blocking historical workflow drift

Two V5 publication workflows triggered by changes under shared/capture still expect the repository root index.html to be the historical Universal Shell V5 EXPECTED/CHUNKS loader. The current root is Prometeo Home V2, so those workflows fail their legacy packaging assertion. This predates P1–P5 and must not be “fixed” by restoring the old root loader. Current Design DNA / Current Tree rules require classifying and later retiring or updating that stale workflow rather than reviving LEGACY bytes.

### Current truth boundary

P1–P5 = IMPLEMENTED_SERVED_CANDIDATE_PENDING_FINAL_FULL_SITE_CI.

P6 remains separate:
private cross-device durability / authenticated work transport / worker execution may remain degraded or blocked without invalidating the local-first human surface.

## 11. Immediate next actions

In order:

1. keep the local-first Change Loop repair;
2. verify/regress it;
3. integrate capture entry into organism/project focus without adding another editor;
4. implement semantic focus + Exact Back in V11;
5. unify object history projection;
6. publish/verify the integrated candidate;
7. only then repair cross-device/private transport and worker delivery;
8. promote only through existing authority gates.

The shortest path to value is P1–P5. Workers are not the bottleneck for those phases.
