# Prometeo Architecture vNext — Draft v1

Status: **CANDIDATE DRAFT — PARTIAL CONVERGENCE 16/18**  
Owner: `chat-object-prometeo-chat-control-main`  
Batch: `B-BIGPIC-01`  
Checkpoint: `B_BIGPIC_01_CONVERGENCE_CHECKPOINT_V1.json`

This document is a reconciled architecture draft from the sixteen currently durable B-BIGPIC-01 returns. It is **not** Human Accepted, Current, Served, or a final architecture head. `WI-BIG-09` (Steward/Merger) and `WI-BIG-13` (Goldens/Vaccines/chaos) remain required before full convergence.

## 1. System thesis

Prometeo is a portable cognitive operating system for long-lived projects and campaigns. Chats and models are disposable compute. Durable external state carries identity, method, memory, project/campaign state, authority, evidence and executable work. The human supplies goals and real approvals/boundaries, not routine scheduling, result transport, comparison, integration or context memory.

The architecture keeps these identities and authority classes separate instead of flattening them into one prompt, one chat, one file or one queue.

## 2. Governing stack

```text
GLOBAL CONSTITUTION
  -> METHOD_HEAD / ACTIVE METHOD
    -> PRODUCT MEMORY
      -> PROJECT NORTH
        -> CAMPAIGN
          -> RUN / WORKER
            -> EVIDENCE / RETURN
              -> INTEGRATION
                -> SUCCESSOR / CONTINUATION
```

Rules:
- Constitution is small, highest-order and non-overridable by jobs/prompts.
- `METHOD_HEAD` is a composition pointer/manifest over stable clauses/modules, not a mega-prompt.
- Product Memory stores durable semantic operating knowledge but does not become product authority.
- Campaign and Run are distinct identities.
- RETURN is evidence/candidate, never automatic promotion.
- Human Accepted, Current and Served remain separate host/product authorities.

## 3. Durable identity graph

Typed nodes:
- Umbrella Project
- Chat Object
- Project North
- Campaign
- Workstream
- Work Item/JOB
- Dispatch attempt
- Worker Run
- RETURN/Evidence
- Integration decision
- Product/host authority heads

A menu number, launch code, filename, UI position or latest commit is an alias/reference, never durable identity or authority.

Prometeo, Facultad, Alumnos and future roots share the substrate but keep root-specific identity, privacy, authority and context.

## 4. Chat Object

A Chat Object is a durable operational seat, not a transcript and not the whole project. It points to:
- identity + mission;
- FOCUS;
- Constitution / METHOD_HEAD;
- Product Memory;
- Project North / active campaign heads;
- relevant Source Plane / Working Set state;
- Work Board / prepared jobs / runs / returns;
- Shared Graph / owners / dependencies;
- integration/evidence lineage;
- successor rules and exact frontier.

`FOCUS` remains a small reconstructable operational cache. Unique durable truth must not exist only in FOCUS.

## 5. Memory and cognition layers

```text
RAW SOURCE / EVIDENCE
  -> SOURCE CARD / REGISTRY
    -> RETRIEVAL RECEIPT
      -> WORKING SET
        -> PRODUCT MEMORY / WRITTEN BOOK as applicable
          -> CANON
            -> FORGE PLAN / COMPILED PROGRAM
```

### Source Plane
Preserves reopenable evidence with source identity, revision, authority, freshness, privacy and provenance. Retrieval is deterministic/explainable and produces receipts.

### Product Memory
Cross-campaign semantic memory: decisions, rationale, architecture, invariants, owners, negative knowledge, incidents, tests, hypotheses and crystallized patterns. Records are lineaged and retired/superseded rather than silently deleted.

### Written Book / CIP
Expansive campaign-specific cognition. It can be large, revisionary and contradictory while understanding is still developing. It is not itself executable authority.

### Canon
A compact, versioned, frozen projection of the Book after an explicit Book Gate. Compression preserves provenance, negative knowledge and uncertainty.

### Forge Plan / Working Set
Narrow executable compilation from frozen Canon + METHOD_HEAD + current authority/baseline + job scope. It is execution input, not durable semantic memory.

## 6. Campaign metabolism

`PROJECT NORTH != CAMPAIGN != RUN`.

A Campaign Controller owns durable phase state and gates, including:
- objective and campaign map;
- active phase;
- Working Set / Book / Canon heads;
- prepared work and dependencies;
- returns and unresolved conflicts;
- evidence and checkpoints;
- target head vs working head;
- adaptive depth;
- critic/challenger timing;
- compaction/integration timing;
- escalation to real human boundaries;
- Forge permission.

It invokes/reinvokes Planner/Compiler as state changes. It does not manually encode every task itself.

## 7. Planner / Compiler

Pipeline:

```text
PROJECT/CAMPAIGN INTENT
  -> PLAN / COVERAGE MAP
    -> TYPED DEPENDENCY DAG
      -> PREPARED WORK ITEMS / JOBS
        -> SAFE PARALLEL FRONTIER
          -> DISPATCH / RUNS
```

Responsibilities:
- decompose goals into disjoint or intentionally overlapping work;
- resolve shared owners before duplication;
- declare read/write scopes and must-preserve rules;
- choose worker/critic roles;
- compile smallest sufficient context;
- define return/evidence contracts;
- detect dependencies and maximal safe parallelism;
- avoid redundant work;
- replan from returns/incidents/proposals.

Planner output is durable before worker execution.

## 8. Worker execution fabric

Separate four concepts:
1. stable logical Work Item;
2. dispatch/launch intent;
3. worker execution attempt (`worker_instance_id`);
4. side-effect/evidence receipts.

Lifecycle source facts remain independent per run:
`PREPARED -> CLAIMED -> STARTED -> WORKING -> RETURNED -> DONE`
with explicit `BOUNDARY | FAILED | CANCELLED | SUPERSEDED | STALE` semantics.

Missing run means not launched, never inferred completion. Staleness is bounded/evidence-based. Retry creates an explicit new attempt/generation and supersession relation. Idempotent side effects require receipts; transport acknowledgement is not execution truth.

## 9. Agent Network and Control Room

Agent Network remains the derived coordination/nervous-system layer:
- cheap EPOCH freshness;
- independent source objects;
- NEEDS/PROVIDES/DEPENDS_ON/IMPACTS;
- collision/dependency detection;
- filtered packets/projections;
- no central mutable worker-status bottleneck.

vNext compiler should ingest Chat Objects, campaigns, prepared JOBs, runs, returns and integration state.

Control Room is a **derived per-Chat-Object projection**, not a new authority. It answers:
- prepared vs actually launched;
- STARTED/WORKING/RETURNED/DONE/FAILED/STALE;
- partial/full batch readiness;
- missed launch;
- unconsumed returns;
- blockers/collisions;
- next high-value action.

Correctness does not depend on UI or Live.

## 10. Convergence / crystallized intelligence

Candidate convergence pipeline:

```text
IMMUTABLE RETURNS
  -> SEMANTIC ATOMS
    -> SCOPED + AUTHORITY-AWARE CLUSTERS
      -> CONTRADICTION GRAPH
        -> PRE/POST COVERAGE AUDIT
          -> STEWARD ADJUDICATION
            -> VERSIONED CRYSTALLIZED RECORDS / HEADS
              -> CANON / WORKING SET COMPILATION
```

Deduplicate semantics without deleting evidence. Contradictions are explicit objects, not averaged away. Stable reusable learning may promote into Product Memory and potentially method/golden/vaccine candidates through the correct authority path.

**Open gate:** exact Steward/Merger, integration-ledger and consumption-state contract awaits `WI-BIG-09`.

## 11. Deep campaign execution

```text
RECONSTRUCT / CONTEXT
  -> SOURCE-BACKED WRITTEN BOOK
    -> COMPLETE/FROZEN MAP
      -> BRAIDED DEVELOPMENT + ADAPTIVE-DEPTH HOTSPOTS
        -> INDEPENDENT CHALLENGE
          -> APPRENTICE RECONSTRUCTION
            -> BOOK GATE
              -> FROZEN CANON
                -> FORGE / EXECUTION
                  -> ADVERSARIAL CRITIQUE
                    -> REPAIR
                      -> RETEST
                        -> CONTINUITY CLOSURE
```

A dot/Continue resumes from the last valid durable gate. It never means Human Accepted/Current/Served and never bypasses required authority.

## 12. Prompt OS / Cognitive Programs

Prompts are immutable compiled runtime projections, not primary durable authority.

A compiler combines:
- Constitution;
- active METHOD_HEAD clauses/modules;
- Campaign phase/gate;
- role/JOB;
- Working Set;
- relevant negative knowledge/vaccines;
- capability/privacy boundaries.

Reusable Cognitive Programs/Recipes are parameterized procedures/compilation plans with provenance, evaluations and promotion lineage. Runtime output cannot silently become durable truth.

## 13. FABRIC / Airlock / host authority

Candidate cognition stops at the admission boundary.

Workers/Chat Objects may produce missions, prompts, artifacts, evidence and candidate changes. Product mutation remains with the scoped host/owner. Admission validates exact artifact identity, current authority/baseline, scope, receipts and required human acceptance. Update/rollback uses explicit target/working heads and preserves history.

## 14. Checkpoints and portability

Distinguish:
- `WORK_CHECKPOINT`: in-progress continuity snapshot, no promotion semantics;
- `RELEASE`: target-confirmed authority checkpoint;
- ZIP/carrier: packaging/transport projection only.

Rollback resumes from a confirmed donor/base while retaining newer history. Forward update reconciles preserved work onto current authority and requires fresh validation before promotion.

## 15. Reincarnation and successor proof

Fresh boot must recover **identity + state + method + critical posture**, not only facts.

Continuity claim requires:
1. deterministic resolution of canonical heads;
2. reconstruction without transcript;
3. adversarial controls such as prompt erasure/poisoning/ambiguity;
4. equivalent applicable governing method;
5. one scoped material action completed with durable evidence;
6. persisted successor frontier.

## 16. Universal AI entry and capabilities

Separate layers:
- public discovery/bootstrap;
- freshness/integrity/version identity;
- job resolution;
- private context access;
- privileged capabilities;
- execution evidence;
- canonical product authority.

The existing project-scoped `.well-known/prometeo.json` may remain as compatibility locator, while standards-based discovery should ultimately use a root-level well-known resource/custom origin. Initial trust comes from trusted HTTPS/user-supplied origin; signatures strengthen integrity/version verification after bootstrap rather than magically creating first trust.

Privileged capability tokens should be server-side issued, revocable, short-lived, audience/resource/action/work-item/run scoped and replay-resistant; secrets never belong in public coordination artifacts.

`p.txt` becomes a generated compatibility bootstrap, not the semantic/security source of truth.

## 17. Human experience

Normal human commands remain tiny:
- universal fresh-parent locator;
- Home number / Chat Object selection;
- dot/Continue for a bound parent;
- eventually one generic `/w` worker bootstrap;
- occasional real consent/approval/external boundary action.

The system, not the human, derives plans, launch state, returns, integration frontier and next action.

## 18. Observability / falsification

Architecture should expose metrics/evidence for:
- reincarnation/successor parity;
- launch resolution;
- claim collision safety;
- STARTED/RETURN/DONE integrity;
- stale/retry correctness;
- context sufficiency;
- invariant/authority violations;
- repeated failure recurrence;
- human friction;
- parallel speedup vs coordination cost;
- convergence coverage.

**Open gate:** exact Goldens/Vaccines/incidents/negative-phenotype and chaos/falsification contract awaits `WI-BIG-13`.

## 19. Implementation ordering after full convergence

The present draft supports the already-prepared autonomous-swarm direction, but implementation promotion waits for the two missing return domains and final coverage reconciliation.

Likely shortest reuse-first sequence after that gate:
1. compile delegated JOB/run/return/integration state into Agent Network + Control Room;
2. Opportunity Queue + atomic claim/pin + generic `/w` bootstrap;
3. Planner/queue compiler and post-return continuation/proposals;
4. Continuity Head compiler;
5. bounded stale/retry/supersession;
6. method/memory heads and compiler wiring;
7. successor/claim/race/rollback/falsification canaries;
8. bind Facultad/Alumnos roots on the shared substrate;
9. prove multiple autonomous generations and parent-erasure recovery.

This ordering is a candidate plan, not final authorization to mutate product authority.
