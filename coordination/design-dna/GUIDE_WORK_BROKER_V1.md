# PROMETEO · GUIDE WORK BROKER V1

Status: SHADOW
Updated: 2026-09-23

## Purpose

Guides own semantic demand. Workers remain one fungible shared pool.

The Broker is a typed demand envelope and arbitration layer **over Worker Bus V2**. It is not a second scheduler and does not own TAKE, leases, generation fencing, watchdog recovery, retries, dependencies or worker assignment.

## Current safe mode

`GUIDE_WORK_BROKER_V1` is deployed in `SHADOW`.

A Guide can durably record:
- origin Guide + CURRENT/snapshot reference
- objective and why-now
- evidence refs
- capability requirements
- expected output + acceptance criteria
- authority class
- dependency refs
- freshness policy
- dedupe key + evidence fingerprint
- sensitivity/data-handling scope
- estimated/max cost units
- verification policy
- explainable priority components
- bounded expiring Strategy adjustment

SHADOW computes priority and dedupe/coalescing but **creates zero Worker Bus jobs**.

## Authority invariant

Priority, evidence, memory and Strategy arbitration never grant permission.

Authority classes:
- ANALYZE
- STORE
- PROPOSE
- MATERIAL_CHANGE
- EXTERNAL_ACTION

Future MATERIAL_CHANGE / EXTERNAL_ACTION compilation must require a valid scoped grant.

## Dedupe

Equivalent work may coalesce only when:
- dedupe_key matches
- evidence_fingerprint matches
- authority + sensitivity/data-handling scope matches

Cross-Guide coalescing must never widen access or authority.

## Priority

Shadow score is explainable from:
- urgency/deadline risk: 25%
- unblock value: 25%
- decision/mission impact: 20%
- evidence readiness: 10%
- freshness-loss risk: 10%
- aging: 10%
- optional Strategy adjustment: -10..+10, reasoned, evidenced and expiring

Cost is an admission/budget constraint, not the dominant priority term.

## Fairness target

No fixed workers per Guide.

Target policy for canary:
- rolling service accounting
- minimum service floor
- fairness debt
- aging to prevent starvation
- idle capacity borrowable
- candidate max share around 40% while other Guides have eligible demand

## Durable result return

Worker Bus result/checkpoint remains authoritative.

Broker should project candidate results back to a Guide inbox keyed by:
- origin_guide_key
- demand_id

A dead chat must not lose the result.

## Deployed read models

- `prometeo_guide_work_broker_dashboard_v1()`
- `prometeo_guide_work_inbox_v1(guide_key)`
- `prometeo_guides_dashboard_v2()`
- `prometeo_domain_guide_operating_view_v2(guide_key)`

The public Guides hub and six Guide pages read these projections.

## Smoke evidence

Transactional smoke:
- first compatible demand -> SHADOW_ELIGIBLE
- second cross-Guide compatible demand -> SHADOW_COALESCED
- shadow score -> 31.5
- Worker Bus jobs before -> 412
- Worker Bus jobs after -> 412

The smoke rolled back its test demand rows.

## Promotion path

0. Archaeology of Worker Bus primitives — done.
1. Envelope — deployed.
2. Shadow scoring/dedupe/read models — deployed.
3. Canary one Guide — not enabled.
4. Multi-Guide demand compilation — not enabled.
5. Consolidate direct Guide-specific creation paths — not started.

Do not enable CANARY/ACTIVE until the Guide Surface Portal synthesis is complete and a bounded canary proves no duplicate scheduler, no authority bypass, and no regression in Worker Bus recovery semantics.
