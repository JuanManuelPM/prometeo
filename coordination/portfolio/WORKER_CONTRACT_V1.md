# Prometeo Portfolio Worker Contract v1.4

## Purpose

This contract turns spare `/wc` capacity into real, deduplicated project progress. The durable project/backlog source is `coordination/portfolio/PORTFOLIO.json`. The portfolio is a fallback allocation layer, not a replacement for higher-value live opportunity queues, dependency unlockers, required verification, or safe stale recovery.

Portfolio exclusivity is governed by `coordination/portfolio/PORTFOLIO_PIN_PROTOCOL_V1.json`. Pins determine execution authority; append-only claim and collision files are receipts/lineage, not independent locks.

## Allocation order

1. Reload authoritative L0 state, active opportunity queues, claims, runs, returns and recovery evidence.
2. Take the highest-value compatible normal/recovery work when it is claimable and useful.
3. If prepared work is exhausted or saturated by other workers, load `coordination/portfolio/PORTFOLIO.json`, `coordination/portfolio/derived/**`, current portfolio pins/claims/collisions/returns and this contract.
4. Treat seed jobs and valid derived jobs as one claimable frontier, ordered by priority and value.
5. Choose the highest-priority compatible job that is neither terminally returned nor owned by a live portfolio pin or temporary legacy winner.
6. Unknown/discovery projects MUST start with their archaeology/recovery job. Never infer an implementation from a project label alone.
7. If no compatible safe job remains, discovery/proposal rules from `/wc` still apply. `IDLE_NO_SAFE_USEFUL_WORK` remains last resort.

## Dedupe law

Every portfolio job has a stable `job_id` and `dedupe_key`.

Before working, scan:
- `coordination/portfolio/pins/<job_id>/`
- `coordination/portfolio/claims/<job_id>/`
- `coordination/portfolio/collisions/<job_id>/`
- `coordination/portfolio/returns/<job_id>/`
- `coordination/portfolio/derived/**` for the same `dedupe_key`

A terminal return for the same `dedupe_key` blocks replay. A live highest-generation pin blocks duplicate execution. For legacy jobs that have claims but no pins, choose at most one temporary legacy owner by earliest `claimed_at`, then lexicographic claim path; other simultaneous legacy claims are migration collision evidence, not concurrent authority.

Terminal outcomes are `DONE`, `VERIFIED`, `NO_ACTION_NEEDED`, or `SUPERSEDED`. A `BOUNDARY` or `PARTIAL` return does not silently count as completed; it must state exact residual work and may propose or emit a bounded successor.

## Exclusive pin protocol

Before creating an execution claim receipt or beginning substantive portfolio work, derive the next deterministic pin generation using `PORTFOLIO_PIN_PROTOCOL_V1.json`.

Pin path:

`coordination/portfolio/pins/<job_id>/G<generation_6d>.json`

Initial work uses `G000001.json` only when no pin and no live temporary legacy owner exists. Safe recovery from a silent/stale predecessor uses the exact next generation for every contender, preserving predecessor lineage. Pin generation files are append-only and are never updated in place.

Minimum pin shape:

```json
{
  "schema": "prometeo.portfolio-pin/v1",
  "pin_id": "<stable pin id>",
  "job_id": "<exact portfolio job_id>",
  "dedupe_key": "<exact portfolio dedupe_key>",
  "project_id": "<exact project_id>",
  "generation": 1,
  "worker_id": "<worker/chat identifier>",
  "claim_id": "<planned claim receipt id>",
  "claimed_at": "<ISO-8601>",
  "expires_at": "<ISO-8601, normally about 10 minutes later>",
  "source_head": "<main commit/head observed before pin>",
  "predecessor_pin_ref_or_null": null,
  "predecessor_claim_ref_or_null": null,
  "recovery_basis_or_null": null
}
```

All contenders for the same generation MUST CREATE the exact same pin path. A successful create is the exclusive winner. A create-exists/CAS-lost result is normal lost-race control flow: read the winning pin, persist the collision receipt described below, then immediately re-enter allocation. Never create a different per-worker pin path to evade the collision.

If an unrelated branch-head movement produces a write conflict and the deterministic pin path still does not exist, refresh head and retry that same path. If the path exists, the race is lost.

## Claim receipt protocol

Only the winning pin owner may CREATE the append-only execution claim receipt:

`coordination/portfolio/claims/<job_id>/<claim_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.portfolio-claim/v1",
  "claim_id": "<unique receipt id>",
  "job_id": "<exact portfolio job_id>",
  "dedupe_key": "<exact portfolio dedupe_key>",
  "project_id": "<exact project_id>",
  "worker_id": "<worker/chat identifier>",
  "claimed_at": "<ISO-8601>",
  "expires_at": "<ISO-8601, normally about 10 minutes later>",
  "source_head": "<main commit/head observed before pin>",
  "mission": "<bounded mission>",
  "pin_ref": "coordination/portfolio/pins/<job_id>/G000001.json",
  "pin_id": "<matching pin_id>",
  "pin_generation": 1,
  "predecessor_pin_ref_or_null": null
}
```

Claims are immutable receipts. They preserve historical execution evidence but no longer determine exclusivity by filename existence. A claim without a matching winning pin is non-authoritative legacy/collision evidence.

## Lost-race collision receipt

A worker that loses the deterministic pin create MUST NOT create an execution claim. After reading the winning pin, it SHOULD atomically CREATE its own append-only collision receipt:

`coordination/portfolio/collisions/<job_id>/<collision_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.portfolio-pin-collision/v1",
  "collision_id": "<unique receipt id>",
  "job_id": "<exact job_id>",
  "dedupe_key": "<exact dedupe_key>",
  "project_id": "<exact project_id>",
  "worker_id": "<losing worker id>",
  "observed_at": "<ISO-8601>",
  "attempted_generation": 1,
  "attempted_pin_ref": "coordination/portfolio/pins/<job_id>/G000001.json",
  "winner_pin_ref": "coordination/portfolio/pins/<job_id>/G000001.json",
  "winner_pin_id_or_null": "<winner pin id or null>",
  "winner_worker_id_or_null": "<winner worker id or null>",
  "source_head": "<head observed after collision>",
  "host_result": "CREATE_EXISTS_OR_CAS_LOST",
  "next_action": "REENTER_ALLOCATION"
}
```

Collision receipts are evidence only. They never grant authority, never mutate the winning pin, and never justify waiting for the human. Failure to persist a collision receipt does not weaken the winner: duplicate execution remains forbidden and the loser still re-enters allocation.

## Stale / recovery

- Worker heartbeat target: <=3 minutes between durable signals when tools/runtime permit.
- `<6 min` since the owner's latest durable signal: active/unknown; no time-only takeover.
- `6–10 min` without terminal return or newer signal: stale suspect.
- `>=10 min` without terminal return or newer signal: recovery eligible when retry/side-effect/write safety checks pass.
- Historical long `expires_at` values do not force the swarm to wait 30–90 minutes. Latest durable signal age controls the recovery boundary under `STALE_RECOVERY_PROTOCOL_V1.md` and `PORTFOLIO_PIN_PROTOCOL_V1.json`.
- Recovery never overwrites a pin. All recovery contenders derive `generation + 1` and race on that exact deterministic next-generation path.
- A recovery pin references predecessor lineage and its recovery basis; its claim receipt carries the same lineage.
- Lost recovery races emit collision receipts against the attempted next generation exactly like initial races.
- Late predecessor returns remain evidence and must be reconciled; they do not erase a later valid recovery generation.
- Effectful retries remain subject to idempotency/side-effect rules from the normal claim protocol.

## Execution law

- Work through the job's `definition_of_done`, not merely until a file or plan exists.
- Re-fetch/CAS every mutable target before write.
- Prefer exact existing bytes/surfaces over redesign from memory.
- For archaeology jobs: recover paths, URLs, receipts, current-vs-old state and SOURCE_DEBT. Do not rebuild merely because discovery is inconvenient.
- For implementation jobs: test what can be tested and leave exact evidence.
- During longer work, emit compact worker heartbeats/checkpoints so the swarm can distinguish slow work from vanished work.
- A worker may create isolated candidate artifacts when authority permits, but never self-promotes Current, Human Accepted or Served.
- User-facing chatter stays small; evidence belongs in durable state.

## Return protocol

After the job, CREATE:

`coordination/portfolio/returns/<job_id>/<return_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.portfolio-return/v1",
  "return_id": "<unique>",
  "job_id": "<exact portfolio job_id>",
  "dedupe_key": "<exact portfolio dedupe_key>",
  "project_id": "<exact project_id>",
  "worker_id": "<worker/chat identifier>",
  "returned_at": "<ISO-8601>",
  "outcome": "DONE|VERIFIED|NO_ACTION_NEEDED|SUPERSEDED|PARTIAL|BOUNDARY",
  "summary": "<material result>",
  "changed_paths": [],
  "evidence": [],
  "tests": [],
  "unresolved": [],
  "spawn_candidates": [
    {
      "title": "<bounded successor>",
      "reason": "<why this result created/uncovered it>",
      "dedupe_key": "<stable proposed key>",
      "acceptance": []
    }
  ]
}
```

A terminal return closes the dedupe key. Old pins/claims/collisions remain historical evidence and are never deleted merely because the job is terminal.

## Derived successor jobs

A worker SHOULD turn a discovered successor into a claimable derived job when all of the following are true:
- the predecessor produced durable evidence for the successor;
- the successor is bounded and has explicit acceptance criteria;
- its authority/write scope is safe under current worker policy;
- its `dedupe_key` is not already represented by a seed job, derived job, live pin/legacy owner or terminal return;
- it does not require Human Acceptance or a promotion decision merely to begin candidate/read-only/authorized implementation work.

CREATE, never overwrite:

`coordination/portfolio/derived/<project_id>/<job_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.portfolio-derived-job/v1",
  "job_id": "<stable unique job id>",
  "dedupe_key": "<stable unique dedupe key>",
  "project_id": "<existing project id>",
  "title": "<bounded successor>",
  "kind": "implementation|verification|integration|archaeology|recovery",
  "priority": 50,
  "seed_status": "ready",
  "mission": "<exact bounded mission>",
  "definition_of_done": [],
  "derived_from_return": "<exact predecessor return path>",
  "evidence": [],
  "created_at": "<ISO-8601>"
}
```

A derived job is candidate work, not a promoted product state. Once created, `/wc` treats it exactly like a seed portfolio job for pin/dedupe/return purposes. If the successor is uncertain, authority-sensitive, or underspecified, leave it only in `spawn_candidates` until another planner/reconciler can ground it.

This append-only derived-job lane is the default way the portfolio grows without rewriting the central portfolio.

## Re-entry / rotation

After RETURN or a lost pin race:
1. Materialize any safe fully-grounded successor as a derived job before leaving the useful context.
2. For a lost pin race, persist the collision receipt when possible before discarding the attempt context.
3. Emit a REALLOCATING heartbeat when practical, then reload `/wc`, normal queues, seed portfolio, derived jobs, pins, claims, collisions and returns.
4. If the result unlocked a normal successor, normal allocation wins.
5. Otherwise pin another compatible seed/derived portfolio job and continue while context/authority remain adequate.
6. Do not stop merely because one portfolio job finished or one pin race was lost. Small completed work should normally roll into another useful allocation in the same chat.

## Live projection

`/live/` may read seed portfolio jobs, derived jobs, pins, claims, collision receipts, worker heartbeats and returns and display project progress. It must derive at most one authority owner per job from the highest valid pin generation; before migration it may derive one deterministic temporary legacy owner. Lost-race receipts are counted separately from execution claims.

Live human-facing liveness uses latest durable signal age: active <6m, stale suspect 6–10m, replaceable >=10m when no terminal result exists. Terminal returns remain terminal.

Live is a projection only. Its labels or derived winner never override durable evidence or promotion gates.

## Canary / promotion boundary

The reference race test is `coordination/portfolio/tests/portfolio_pin_race_v1.mjs`. Passing portfolio pin/recovery tests improves `/wc` fallback only. It does not promote production `/w` or bypass broader readiness gates.
