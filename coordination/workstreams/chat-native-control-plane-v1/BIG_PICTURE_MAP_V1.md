# Prometeo Big Picture Map v1

Status: BINDING NORTH-STAR MAP
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prevent the current Chat Object / worker implementation slice from shrinking the larger Prometeo vision.

## Core thesis

Prometeo is not only a chat-reincarnation system, not only a worker network, not only a memory layer, and not only a prompt/bootstrap.

It is a **portable cognitive operating system for long-lived projects and campaigns** where:
- chats/models are disposable compute;
- durable external state carries identity, memory, method, authority, campaign state, evidence and executable work;
- the human is not the scheduler, integrator, context bus or durable memory;
- parallel workers can scale reasoning and implementation without fragmenting authority;
- a fresh successor model can recover not only facts but the active method and critical posture required to continue safely.

Keep these layers distinct but composable:

`CONSTITUTION -> ACTIVE_METHOD -> PRODUCT_MEMORY -> PROJECT_NORTH -> CAMPAIGN -> RUN -> EVIDENCE/RETURN -> INTEGRATION -> SUCCESSOR`

`ONE ZIP != WRITTEN MIND != DEEP CAMPAIGN != ONE WORKER != ONE AUTHORITY != CHAT OBJECT != AGENT NETWORK != PRODUCT ARCHITECTURE`

---

# 1. Constitution / governing invariants

The highest layer defines non-negotiable operating laws:
- preserve-before-invent;
- explicit authority boundaries;
- no silent invariant drop;
- FACT / CANDIDATE / HUMAN_ACCEPTED / CURRENT / SERVED separation;
- chat/model replaceability;
- human friction minimization;
- evidence before claims;
- rollback/recovery identities;
- public/private boundaries;
- exact owner resolution before local duplication;
- material work must survive transcript deletion.

Historical Interaction Constitution and Global Agent Constitution belong here.

# 2. Active Method / METHOD_HEAD

Stored memory is insufficient if it does not govern execution.

Prometeo needs an explicit active method authority that composes the strongest historical method layers instead of letting newer prompts overwrite older useful methods.

Historical ingredients to recover/compose:
- R29 DAY_WORK;
- R31 Challenger / braided passes;
- R38 4X Acceleration / adaptive depth;
- R70 compact bootstrap + indexed source plane;
- R77/R78 Written Mind / one-worker / public working memory;
- R94 Airlock / host authority;
- CIP -> dot -> Forge;
- Book-first deep campaign;
- Deep / Exhaustive / Continue profiles;
- criticism -> repair -> retest;
- Apprentice Reconstruction;
- traceability requirement -> decision -> change -> test.

Method promotion should be clause-level/compositional when possible, not whole-document latest-wins.

# 3. Product Memory / Written Mind

Prometeo needs a durable expansive memory that can hold more than a compact FOCUS.

Memory plane includes:
- Written Mind / Written Book;
- Product Memory;
- design rationale;
- architecture;
- negative knowledge;
- incidents;
- Goldens/Vaccines;
- owners/capabilities;
- historical evidence;
- open hypotheses;
- source registry;
- decision lineage;
- tests/regression knowledge.

Pattern:
`compact input/source plane -> expansive Written Mind/Book -> compressed Canon -> executable Forge/context`

FOCUS is only the compact current frontier, not the whole memory system.

# 4. Context Foundry / source plane / Working Set

Prometeo must retrieve the right context rather than reread everything.

Target lineage:
`RAW SOURCE -> SOURCE CARD -> RETRIEVAL -> WORKING SET -> COMPILED PROMPT/PROGRAM`

Required capabilities:
- source registry;
- evidence reopening;
- relevance scoring;
- conditional retrieval;
- source-card compaction;
- Working Set construction;
- privacy boundaries;
- freshness/authority metadata;
- compiler participation;
- fresh-successor recovery.

Context Foundry is complementary to Chat Object state: one represents durable operational self, the other compiles relevant source context.

# 5. Chat Object / reincarnable working identity

A Chat Object is a durable conversational/operational seat that can reincarnate into any fresh chat.

It carries pointers to:
- identity;
- mission;
- FOCUS;
- Active Method;
- Design Board;
- Survival Set;
- Shared Graph;
- Work Board;
- Product Memory/Written Mind;
- relevant source plane;
- evidence/lineage;
- current campaign/run state;
- successor/reincarnation rules.

A Chat Object is not the whole project and not a transcript.

# 6. Project North -> Campaign -> Run

Do not flatten all long-lived work into one workstream.

- `PROJECT NORTH`: durable long-term human/product direction.
- `CAMPAIGN`: bounded multi-day/multi-chat effort with explicit gates and objective.
- `RUN`: one model/chat/worker execution instance.

A campaign may span many chats, workers and model replacements.

Campaign state includes:
- objective;
- plan/map;
- counters/gates;
- current phase;
- Working Set;
- prepared jobs;
- returns;
- open conflicts;
- evidence;
- checkpoints;
- target head / working head;
- successor state.

# 7. Campaign Controller / metabolism

A durable controller should manage:
- campaign phase transitions;
- gates;
- adaptive depth;
- when to prepare more workers;
- when to challenge/critique;
- when to compact;
- when to integrate;
- when to checkpoint;
- when to request human input;
- when Forge/execution is allowed.

This replaces human mental scheduling.

# 8. Planner / Compiler / decomposition

High-level goals should compile into safe executable work.

Pipeline:
`PROJECT/CAMPAIGN INTENT -> PLAN/MAP -> dependency graph -> prepared Work Items -> Execution Packets/JOBs -> workers`

Planner/Compiler responsibilities:
- decompose into disjoint or intentionally overlapping jobs;
- identify dependencies;
- resolve owners;
- allocate write scopes;
- select critics/challengers;
- define return contracts;
- compile smallest sufficient context;
- detect what can execute in parallel now;
- avoid redundant jobs;
- adapt after returns.

# 9. Agent Network / nervous system

Reuse/extend Agent Network as shared coordination substrate:
- EPOCH cheap freshness;
- independent worker states;
- NETWORK derived view;
- convergence/collision detection;
- NEEDS / PROVIDES / DEPENDS_ON / IMPACTS;
- filtered compiled Work Packets;
- no global mutable worker-status file;
- no global locks unless real overlapping active writes.

Agent Network coordinates; it is not product authority and not the whole cognitive system.

# 10. One-shot workers / execution fabric

Normal worker:
- one prepared mission;
- tiny launch address;
- durable STARTED;
- scoped execution;
- durable evidence/RETURN;
- DONE/boundary;
- disposable chat.

Workers can be:
- builder;
- archaeologist;
- context researcher;
- critic/challenger;
- verifier;
- tester;
- recovery worker;
- integration assistant;
- architecture scout.

The worker type changes its mission, not the core lifecycle.

# 11. Control Room / parent awareness

The parent Chat Object must derive, not remember:
- jobs prepared;
- which were actually launched;
- which are STARTED/WORKING;
- partial returns;
- failures/boundaries/stale runs;
- missed human launches;
- collisions;
- dependencies satisfied;
- unconsumed returns;
- batch completion;
- next high-value action.

The parent continues working while children run.

# 12. Steward / Merger / canonical integration

Parallel workers generate evidence/candidates, not automatic truth.

A single canonical integrator/steward per integration domain:
- reads returns;
- resolves contradictions;
- tests against invariants/Current/owners;
- accepts/rejects/supersedes;
- merges artifacts;
- records integration rationale;
- updates Product Memory/Chat Object/Campaign state;
- launches follow-up work.

# 13. Authority plane

Keep separate:
- source evidence;
- facts;
- hypotheses/candidates;
- Human Accepted;
- Current;
- Served;
- worker completion;
- latest commit/version.

No newest-wins or worker-says-DONE promotion.

# 14. Reincarnation / Public Wake / successor

Cold boot must recover **method + identity + state**, not only facts.

Historical patterns to preserve/recover:
- Public Wake;
- Reincarnation Exam;
- SESSION_RETURN / rehydration;
- fresh-chat epochs;
- successor principle;
- chat-erasure tests;
- poisoned-chat/fresh-agent canaries;
- Cognitive Portrait / operational self-model;
- identity/causal/operational/adversarial wake;
- Material Response Constitution;
- message-two / longitudinal parity tests.

A successor should prove it can reconstruct and do useful material work before being trusted.

# 15. Checkpoints / ZIP / portable carrier

Prometeo historically treated a single portable carrier as useful for continuity.

A carrier/checkpoint can represent:
- RELEASE;
- WORK_CHECKPOINT;
- recovery bundle;
- external-model export;
- successor bootstrap.

It may contain projections of:
- memory;
- method;
- campaign;
- sources;
- execution/returns;
- receipts;
- target/working heads;
- rollback state.

The carrier is not the same as Written Mind or Active Method; it packages them/projections when needed.

# 16. Written Book -> Canon -> Forge

For deep campaigns:
- build an expansive Written Book with evidence and revisions;
- use challenge passes / 4X / independent critics;
- require coverage/traceability;
- run Apprentice Reconstruction;
- gate promotion into a compact Canon;
- only then Forge executable change/context;
- critique/repair/retest after execution.

`dot`/Continue resumes from last valid gate; it is not approval or gate bypass.

# 17. Goldens / Vaccines / incidents / negative phenotypes

Prometeo should learn durably from success and failure.

- Goldens: accepted reference behavior/artefacts.
- Vaccines: explicit regression guards from past failures.
- Incidents: observed failures + root cause + prevention rule.
- Negative phenotypes: recognizable bad successor/agent behaviors.

These should influence future method/jobs/tests automatically.

# 18. Prompt OS / Cognitive Programs / Recipes

Prompts should be compilation targets, not handwritten mega-prompts.

Prometeo can maintain reusable cognitive programs/recipes for:
- archaeology;
- planning;
- critique;
- recovery;
- implementation;
- integration;
- verification;
- reincarnation;
- context compilation.

The active program is compiled from Constitution + Active Method + Campaign + role/job + Working Set.

# 19. FABRIC / Mission / Prompt / Airlock / host authority

Continuity/orchestration must respect broader product/host layers.

Historical concepts to recover/interface with:
- FABRIC identity/bytes/containment;
- Mission Fabric;
- Prompt Fabric;
- Airlock;
- host-owned apply/update authority;
- update/rollback;
- safe admission;
- deterministic/idempotent execution where needed.

The new Chat Object system must extend these rather than accidentally bypassing them.

# 20. Assembly Surface / human control surface

A future Assembly Surface/Control Room may expose:
- projects/Chat Objects;
- campaigns;
- current method;
- workers/batches;
- returns/integration;
- authority state;
- checkpoints;
- health/incidents.

But native ChatGPT remains the immediate conversational frontend. Do not block on custom UI.

# 21. Human experience / zero-memory mode

The human should need only tiny commands:
- universal fresh boot locator;
- Home number;
- launch code;
- dot/Continue;
- occasional real approval/consent.

Prometeo should answer from durable state:
- what is happening;
- what changed;
- what workers exist;
- which were actually launched;
- what returned;
- what needs integration;
- smallest next human action.

# 22. Universal AI entry / trust/capabilities

A completely unrelated IA needs a stable machine-readable entrypoint.

Target:
- public bootstrap/AI landing;
- protocol/schema discovery;
- job resolver;
- signed/versioned authority metadata;
- public instructions treated as public;
- private capability tokens for narrow privileged operations;
- expiration/scope/audience where needed;
- no fake security through reversing text/Base64/obfuscation.

# 23. Privacy / trust boundaries

Public coordination contains compact sanitized metadata only.

Private:
- raw transcripts when sensitive;
- credentials;
- token-gated data;
- private user material;
- Patent/private Capture payloads.

Workers receive minimum needed context.

# 24. Multi-project / multi-Chat-Object graph

One project may contain several Chat Objects/campaigns/workstreams.

Prometeo should model:
- umbrella projects;
- child Chat Objects;
- shared components;
- branches;
- dependencies;
- delegated subcampaigns;
- ownership/impact graph;
- integration points.

`Facultad`, `Alumnos`, Prometeo itself and future projects should use the same substrate without flattening into one chat.

# 25. Compaction / convergence / crystallized intelligence

Parallel exploration creates entropy. Prometeo needs a durable compactor/convergence process that:
- deduplicates ideas;
- reconciles competing findings;
- promotes stable rules/method clauses;
- compresses expansive memory into usable Canon/Working Sets;
- preserves evidence/lineage;
- retires obsolete candidates without deleting history;
- updates current heads.

Crystallized Intelligence is the accumulated reusable result of campaigns, not raw transcript volume.

# 26. Health / observability / falsification

Prometeo should measure whether the system works:
- reincarnation success;
- launch resolution success;
- worker STARTED/RETURN/DONE integrity;
- stale run detection;
- context sufficiency;
- authority violations;
- invariant coverage;
- repeated failure recurrence;
- human friction;
- parallel speedup vs coordination cost;
- successor parity.

Every major mechanism should have falsifying tests, not just happy-path demos.

# 27. Self-improvement without self-erasure

Prometeo can improve its own method, but method evolution must be explicit:
- candidate method change;
- compare against Survival Set / current Method Head;
- critic/challenger review;
- coverage delta;
- acceptance/promotion decision;
- rollback point;
- new Method Head.

Never let a clever new prompt silently erase older useful constraints.

---

# Current strategic conclusion

The present Chat Object + JOB/Run/RETURN work is **one implementation vertical through this larger architecture**, not the whole product.

Immediate strategy:
1. finish the zero-memory canary for the write/feedback transport;
2. meanwhile fan out read-only architecture/recovery scouts across all major layers above;
3. consume those returns through a single parent/steward;
4. compile a reconciled vNext architecture and method map;
5. only then choose the shortest implementation sequence, reusing historical Prometeo mechanisms wherever possible;
6. prove successor/reincarnation, parallel work, authority, compaction and campaign continuity end-to-end.
