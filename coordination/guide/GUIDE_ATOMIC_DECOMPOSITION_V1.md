# Guide Atomic Work Decomposition V1

Status: CANARY / binding extension of existing Guide owners

This contract extends `GUIDE_SWARM_PROTOCOL_V1.md` and `METABOLISM_POLICY_V1.json`; it does **not** create a planner, scheduler, queue, CURRENT, worker family, persistence authority or claim authority. `GUIDE_PLANNER` remains the planning owner, the existing metabolism rules decide when planning is useful, portfolio/CURRENT remains the work surface, and the normal portfolio PIN remains execution authority.

## Activation

A `GUIDE_PLANNER`, `GUIDE_INTEGRATOR`, `GUIDE_RESCATE`, `GUIDE_CRITIC` or explicitly planner-class packet MAY run the deterministic atomization pass when a coarse job/objective satisfies `coordination/guide/ATOMIC_TASK_V1.json#coarse_job_detection`.

Ordinary executor `E4_PLAN_LOCK` stays bounded. It MUST NOT expand into this richer decomposition pass unless its owned capsule explicitly selects planner-class work.

## Planner pass

1. Freeze the owned parent job id, exact durable inputs and authority boundary.
2. Classify objective signals with `coarse_job_detection`.
3. If any anti-overhead veto applies, keep one job and record why atomization was rejected.
4. Otherwise propose candidate units with concrete `input_refs`, `output`, `done_when`, existing `owner`, `consumer`, hard `dependencies`, exact `required_capabilities` and a durable `recovery_checkpoint`.
5. Run `scripts/guide-atomic-work-decomposer-v1.mjs` to canonicalize identity, produce deterministic `atomic_task_v1` ids and topological order.
6. Persist the atoms inside the existing `planner_trace_v1` / Guide receipt. They are evidence only and carry `authority=PLANNING_ONLY_NO_CLAIM_AUTHORITY`.
7. For an atom that should become separately claimable, use the existing **Successor semantic dedup hard gate** from `GUIDE_SWARM_PROTOCOL_V1.md`. Only the fingerprint-pin winner may create the derived portfolio job. That derived job then uses the normal portfolio PIN claim path.
8. Prefer separate implementation / verification / runtime / critic / judge / integration units only where there is no hard dependency requiring one owner. Do not manufacture parallelism.

## Objective coarse-job rules

Atomization is justified when at least one of these is true and no anti-overhead veto is true:

- two or more independent acceptance clusters can be resumed or verified separately;
- two or more lifecycle phases can be owned independently;
- capability sets differ and do not contend on one shared mutation target;
- one early failure gate currently burns unrelated downstream setup or verification cost;
- an output has multiple independent consumers or validators.

Do **not** atomize when one small shared object must be edited serially, context/setup duplication dominates, the split would need new authority, a unit lacks a concrete output/done condition/consumer, or estimated claim+context+return coordination cost is at least the expected parallelism/recovery/failure-isolation saving.

## `atomic_task_v1`

The canonical contract is `coordination/guide/ATOMIC_TASK_V1.json`. Every unit names:

`input_refs -> output -> done_when -> owner -> consumer -> dependencies -> required_capabilities -> recovery_checkpoint`.

`owner` is an existing durable role/project owner, never an unclaimed worker id. `dependencies` are hard data/authority dependencies only, not preferences. A recovery checkpoint is the smallest durable evidence from which a fresh shell can continue without human recap.

## Single-worker fallback

The decomposition contract is independent of available concurrency. If only one shell is available, that shell executes ready units sequentially in the same deterministic order and preserves the same outputs/checkpoints. If more capacity exists, independently materialized units may be claimed by different workers through the existing portfolio machinery. No fake sub-worker identity is created.

## Recovery and fan-in

Every materialized atom must preserve the parent objective/evidence ref and name a consumer. A failed atom blocks only descendants with a hard dependency on its output. Siblings remain valid work. Fan-in occurs through the already named consumer/judge/integrator; atoms never self-promote or change Current/Human Accepted/Served authority.

## Real repo decompositions

The canonical contract contains three concrete examples, all authority-preserving:

1. `portfolio-guide-planner-universal-cognitive-block-v1`: planner contract/policy, deterministic regression harness, compatibility/authority judge.
2. `portfolio-jose-v12-map-runtime-verification-v1`: pinned-source integrity gate, then representative-browser verification. This isolates immutable fixture corruption from browser cost.
3. `portfolio-tele-current-room-physical-verify-v1`: room/backend bootstrap gate, paired command matrix, then `tv.state` return verification. This isolates backend/PostgREST failure from command verification.

## Regression

Run:

```bash
node scripts/check-guide-atomic-work-decomposer-v1.mjs
```

It must PASS fixtures covering the three real splits plus a tiny serial edit that is rejected by the anti-overhead rule, and must prove stable output when candidate/input/capability arrays are reordered.

## Truth boundary

This extension improves decomposition, failure isolation, recovery and possible parallelism. It does not prove that extra workers exist, that atoms are automatically launched, or that a planning atom is owned. Normal Guide successor dedup + portfolio claim authority remains mandatory.
