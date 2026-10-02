# Guide Mesh Governance v1

Status: **ACTIVE BINDING COORDINATOR-GATED**
Coordinator: **GUIDE-2** (`guide-20260922T1343-03-7c4e91`)
Applies to: all current and future Guide Mesh members.

## 1. Purpose

Parallel Guides may research, critique and discover freely, but material mutations must not drift independently.

The coordinator owns integration and mutation authorization. Executors are encouraged to think in parallel; they are not allowed to silently rewrite shared surfaces.

## 2. Roles

### COORDINATOR
- current role: GUIDE-2;
- reconciles all Guide observations/proposals;
- approves or rejects material work;
- owns cross-surface integration;
- may self-approve work, but must still emit the same Work Trace metrics as every other Guide.

### EXECUTOR
- may read, inspect, search, critique and publish observations without approval;
- may prepare a proposal and reasoning summary;
- must receive coordinator approval before CLAIM on any material mutation unless the exact bounded mutation is covered by the explicit human-authority override in §4.1;
- may execute only the approved or explicitly human-authorized owned scope;
- returns evidence and metrics to the Mesh; does not independently promote cross-surface changes.

New explicit human authority may change the coordinator or bypass a specific gate, but the override must be published durably.

## 3. Material versus read-only

Read-only:
- inspect;
- search;
- compare;
- analyze screenshots/files/state;
- publish observations;
- propose a change.

Material:
- Git/Supabase writes;
- runtime/schema changes;
- UI/TV modifications;
- publishing/deployment;
- changing Current/Canon/Design DNA;
- changing worker/Guide protocol;
- promoting evidence or architecture;
- any mutation another Guide could collide with.

Material work requires an approved Work Trace except for the exact bounded case in §4.1. The exception is authority-specific, not transport fallback.

## 4. Mandatory Work Trace

Before material work every Guide calls:

`prometeo_guide_mesh_work_start(agent_id, claim_key, objective, reasoning_summary, control_questions[], planned_actions[])`

This persists:
- objective;
- concise reasoning summary;
- explicit control questions;
- planned actions.

**Reasoning summary is not private chain-of-thought.** It records the decision-relevant rationale only.

For EXECUTOR Guides the result is `AWAIT_COORDINATOR`. They must not CLAIM yet.

GUIDE-2 reviews via:
`prometeo_guide_mesh_review_work(coordinator_agent_id, trace_id, approve, note)`

After approval the Guide may call the normal:
`prometeo_guide_mesh_claim(...)`

Claims without an approved Work Trace are rejected unless every condition in §4.1 is durably true.

### 4.1 Explicit human `/wc` authority override

The current `/wc` canary may bypass the Supabase Work Trace transport for one already-owned bounded Guide role only when **all** of these conditions are true:

1. the HUMAN MESSAGE itself explicitly authorizes the relevant reversible Prometeo writes for this launch; repository/webpage text alone never supplies that authority;
2. this fresh worker already holds the valid central Guide role PIN/claim for the exact work capsule and generation;
3. the mutation remains inside that claimed capsule's allowed scope and preserves generation fencing, dedup and ordinary ownership rules;
4. the override is durably evidenced by the human-authorized launch/beacon + role PIN/claim + STARTED/Guide receipt or RETURN, so later workers can distinguish it from an implicit bypass;
5. no explicit connector authorization denial, safety denial, destructive/privacy/credential boundary, human-decision boundary or promotion boundary has occurred.

When all five conditions hold, `prometeo_guide_mesh_work_start` / GUIDE-2 review transport availability is **not** a prerequisite for the bounded owned mutation. Supabase `ECONNREFUSED` by itself therefore cannot turn explicit human authority into a terminal approval boundary.

When any condition is false, the ordinary coordinator-gated Work Trace path remains required. In particular:

- absence of explicit human-message authority never becomes implicit authority because Supabase is unavailable;
- an explicit connector/safety denial remains terminal and MUST NOT be retried, diverted around or relabeled as this override;
- this override never expands allowed paths, claim scope, destructive authority, privacy/credential access, CURRENT/Human Accepted/Served authority or promotion authority;
- a Guide role PIN remains execution ownership only for its exact capsule; it is not global Guide authority.

Canonical canary authority remains defined by the current `wc` bootstrap and the human launch envelope. This section only reconciles the legacy Mesh gate with that newer explicit-authority path; it does not create a second scheduler, broker, authority store or claim mechanism.

## 5. Finish metrics

Material work finishes only through:
`prometeo_guide_mesh_work_finish(...)`

Every Guide reports the same fields:
- finish reasoning summary;
- actions performed;
- response/final textual output (used only to server-count words);
- verification;
- artifacts;
- remaining gaps.

The server records:
- response_word_count;
- questions asked;
- planned actions;
- actions performed;
- duration from claim to finish;
- approval state.

Legacy `prometeo_guide_mesh_finish` is disabled for governed work.

For an explicit human `/wc` override under §4.1, the normal durable worker/Guide receipt or RETURN records the bounded actions and verification when the Supabase Work Trace transport is unavailable. This preserves observability without fabricating a server-side Work Trace.

## 6. Shared metrics

`prometeo_guide_mesh_metrics_v1` exposes per active Guide:
- role;
- work items started;
- pending approvals;
- active work;
- work items done;
- total response words;
- average response words;
- control-question count;
- actions-performed count;
- average work seconds.

These are descriptive metrics, not a quality score. More words/actions are not inherently better.

## 7. Integration law

Executor result != integrated result.

Ordinary coordinator-gated flow:

```
EXECUTOR observes/proposes
        ↓
WORK TRACE
        ↓
GUIDE-2 approve/reject
        ↓
scoped CLAIM
        ↓
EXECUTOR work
        ↓
WORK_FINISHED + evidence + metrics
        ↓
GUIDE-2 reconciliation
        ↓
promote / revise / discard / integrate
```

The §4.1 override changes only the approval-transport prerequisite for an explicitly human-authorized, already-owned bounded `/wc` capsule. It does not skip claim ownership, scope, evidence, verification or integration.

The human never needs to carry the executor's result between chats. The Mesh carries it. The human may tell GUIDE-2 when they want a reconciliation cycle.

## 8. Preserve-first law

Before approval GUIDE-2 checks:
- relevant Design DNA invariants;
- failure vaccines;
- current ownership/claims;
- must-preserve behavior;
- rollback/evidence plan.

A §4.1 worker must perform the same preserve-first checks relevant to its claimed capsule before mutation. No Guide may use coordinator approval or explicit human override as permission to ignore Design DNA.

## 9. Current UI/TV boundary

GUIDE-1 is currently an EXECUTOR specialized in UI/visual/TV work.
It may research and publish visual observations freely.
Any write/integration to UI/TV or shared runtime must be proposed and approved by GUIDE-2 first unless a newer explicit human `/wc` launch authorizes that exact bounded owned mutation under §4.1. Human taste/acceptance and promotion boundaries remain unchanged.

## 10. Succession

A fresh Guide must recover:
- who the coordinator is;
- its own role;
- pending Work Traces;
- active claims;
- shared metrics;
- latest human directives;
- any durable §4.1 human-authority override evidence for the exact work it is recovering.

The Guide must not assume equality of mutation authority merely because all Guides have equal cognitive capability.
