# Prometeo Role Frontier Protocol v1

Status: CANARY / binding for allocator `role_ready`.

## Purpose

Useful latent work must become claimable centrally before disposable `/wc` chats conclude `NO_ALLOCATION`.

A worker must not rediscover the whole project in order to notice that planning, integration, rescate or criticism is needed. The allocator/compiler derives bounded role candidates from durable signals already defined by `GUIDE_SWARM_PROTOCOL_V1.md` and `METABOLISM_POLICY_V1.json`.

If durable metabolism triggers prove useful latent work exists but the allocator exposes no compatible `role_ready`, that is allocator/control-plane debt, not evidence that Prometeo has no work.

## Pre-claim law

`role_ready` is a first-class fast-allocation lane.

Before ownership, the worker does NOT load Guide, Metabolism, Master Context or project archaeology. It only reads the compiled candidate and attempts its exact atomic role PIN.

Candidate order is:

`ready -> queue_ready -> role_ready -> recovery`

This keeps cheap concrete execution first, then makes latent cognition claimable before sending surplus capacity into expensive stale recovery.

## Atomic role PIN

Role ownership is append-only under:

`coordination/guide/pins/<guide_work_id>/G<generation_6d>.json`

The allocator supplies:
- stable `guide_work_id` / role fingerprint;
- `role`;
- exact `trigger`;
- bounded exact evidence refs;
- mission/title/priority;
- exact `claim_path`;
- contract-complete `claim_payload_shape`.

Schema: `prometeo.guide-role-pin/v1`.

Required fields:
- `schema`;
- `pin_id`;
- `guide_work_id`;
- `role`;
- `trigger`;
- `generation`;
- `worker_id`;
- `claim_id`;
- `claimed_at`;
- `expires_at`;
- `source_head`;
- `evidence`;
- `predecessor_pin_ref_or_null`.

The worker fills only bounded placeholders (`<worker_id>`, `<now_iso>`, `<now_plus_10m_iso>`) and attempts CREATE. Create-exists means race lost; immediately re-enter allocation.

## Deterministic identity / no meta-task inflation

Role fingerprint follows the metabolism canonicalization:

`{"role":ROLE,"trigger":TRIGGER,"evidence":[SORTED_UNIQUE_EXACT_REFS]}`

SHA-256 over those exact UTF-8 bytes; first 12 lowercase hex characters.

No worker id, chat id, current timestamp or random salt may affect role identity.

A role candidate is suppressed when:
- the same `guide_work_id` already has a durable guide receipt; or
- its newest role PIN has a fresh signal and remains owned; or
- a compatible already-materialized Guide job is ready/active.

A stale role PIN may be recovered by the next immutable generation after the normal recovery window. Never create one rescue job per failed worker.

## After winning

Only after the role PIN succeeds, load:
1. `coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md`;
2. `coordination/guide/METABOLISM_POLICY_V1.json`;
3. only the exact evidence/context needed by this role candidate;
4. Efficiency Ratchet only when the owned role touches a protected hot path.

Then perform durable work. A Guide role cannot complete with analysis-only prose.

### GUIDE_INTEGRATOR
Consume the listed unconsumed returns, persist dispositions, reconcile conflicts/duplicates and materialize grounded successors immediately.

### GUIDE_PLANNER
Replenish the useful frontier toward the compiled target with 1–7 grounded implementation/verification/integration jobs. Never invent filler. Prefer executing/verifying one newly unlocked job before stopping.

### GUIDE_RESCATE
Change the highest multiplicative mechanism-level bottleneck visible in the evidence: connect missing cable, remove repeated friction, reduce collision/recovery/human routing, or make hidden useful work claimable. Patch + guard + bounded verification when appropriate.

### GUIDE_CRITIC
Independently attack a weak route, false completion signal, repeated PARTIAL/BOUNDARY loop or regression. When software-solvable, create/implement a bounded repair or verifier.

### GUIDE_STEWARD
Consume compatible durable results into the delegated publication/page/current lane without inventing Human Acceptance or promotion authority; expose grounded successors.

## Durable return

Guide-role completion writes a receipt under:

`coordination/guide/receipts/<guide_work_id>/<receipt_id>.json`

The receipt follows `GUIDE_SWARM_PROTOCOL_V1.md`, names the same worker and role, records consumed returns/created jobs/changed paths/tests, and is evidence rather than promotion authority.

After the receipt, re-enter the fast allocator in the SAME chat. Guide is a temporary role, not a stopping state.

## NO_ALLOCATION boundary

A clean `NO_ALLOCATION` is legitimate only after prepared execution, queue work, compiled `role_ready`, and compatible recovery are all genuinely exhausted or bounded atomic races/transport prevent ownership.

`NO_ALLOCATION` while a usable `role_ready` candidate was simply ignored is a protocol violation.

## Anti-regression rule

The central compiler, not every disposable worker, owns detection of latent Guide work. This cable is part of the Efficiency Ratchet: future claim-first optimizations may make role allocation cheaper, but may not silently disconnect metabolism from the fast frontier again.
