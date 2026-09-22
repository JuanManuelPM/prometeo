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
- must receive coordinator approval before CLAIM on any material mutation;
- may execute only the approved scope;
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

Material work requires an approved Work Trace.

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

Claims without an approved Work Trace are rejected.

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

Flow:

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

The human never needs to carry the executor's result between chats. The Mesh carries it. The human may tell GUIDE-2 when they want a reconciliation cycle.

## 8. Preserve-first law

Before approval GUIDE-2 checks:
- relevant Design DNA invariants;
- failure vaccines;
- current ownership/claims;
- must-preserve behavior;
- rollback/evidence plan.

No Guide may use coordinator approval as permission to ignore Design DNA.

## 9. Current UI/TV boundary

GUIDE-1 is currently an EXECUTOR specialized in UI/visual/TV work.
It may research and publish visual observations freely.
Any write/integration to UI/TV or shared runtime must be proposed and approved by GUIDE-2 first.

## 10. Succession

A fresh Guide must recover:
- who the coordinator is;
- its own role;
- pending Work Traces;
- active claims;
- shared metrics;
- latest human directives.

The Guide must not assume equality of mutation authority merely because all Guides have equal cognitive capability.
