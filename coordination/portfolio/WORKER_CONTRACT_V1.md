# Prometeo Portfolio Worker Contract v1.1

## Purpose

This contract turns spare `/wc` capacity into real, deduplicated project progress. The durable project/backlog source is `coordination/portfolio/PORTFOLIO.json`. The portfolio is a fallback allocation layer, not a replacement for higher-value live opportunity queues, dependency unlockers, required verification, or safe stale recovery.

## Allocation order

1. Reload authoritative L0 state, active opportunity queues, claims, runs, returns and recovery evidence.
2. Take the highest-value compatible normal/recovery work when it is claimable and useful.
3. If prepared work is exhausted or saturated by other workers, load `coordination/portfolio/PORTFOLIO.json`, `coordination/portfolio/derived/**`, plus current portfolio claims/returns.
4. Treat seed jobs and valid derived jobs as one claimable frontier, ordered by priority and value.
5. Choose the highest-priority compatible job that is neither terminally returned nor actively claimed.
6. Unknown/discovery projects MUST start with their archaeology/recovery job. Never infer an implementation from a project label alone.
7. If no compatible safe job remains, discovery/proposal rules from `/wc` still apply. `IDLE_NO_SAFE_USEFUL_WORK` remains last resort.

## Dedupe law

Every portfolio job has a stable `job_id` and `dedupe_key`.

Before working, scan:
- `coordination/portfolio/claims/<job_id>/`
- `coordination/portfolio/returns/<job_id>/`
- `coordination/portfolio/derived/**` for the same `dedupe_key`

A terminal return for the same `dedupe_key` blocks replay. A non-expired active claim for the same `dedupe_key` blocks duplicate execution. Losing a claim race means reload and choose another job; never ask the human to assign a replacement.

Terminal outcomes are `DONE`, `VERIFIED`, `NO_ACTION_NEEDED`, or `SUPERSEDED`. A `BOUNDARY` or `PARTIAL` return does not silently count as completed; it must state exact residual work and may propose or emit a bounded successor.

## Claim protocol

Before substantive portfolio work, atomically CREATE (never overwrite):

`coordination/portfolio/claims/<job_id>/<claim_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.portfolio-claim/v1",
  "claim_id": "<unique>",
  "job_id": "<exact portfolio job_id>",
  "dedupe_key": "<exact portfolio dedupe_key>",
  "project_id": "<exact project_id>",
  "worker_id": "<worker/chat identifier>",
  "claimed_at": "<ISO-8601>",
  "expires_at": "<ISO-8601, normally 90 minutes later>",
  "source_head": "<main commit/head observed before claim>",
  "mission": "<bounded mission>"
}
```

If create collides, reload. Claims are immutable evidence; do not edit another worker's claim.

## Execution law

- Work through the job's `definition_of_done`, not merely until a file or plan exists.
- Re-fetch/CAS every mutable target before write.
- Prefer exact existing bytes/surfaces over redesign from memory.
- For archaeology jobs: recover paths, URLs, receipts, current-vs-old state and SOURCE_DEBT. Do not rebuild merely because discovery is inconvenient.
- For implementation jobs: test what can be tested and leave exact evidence.
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

## Derived successor jobs

A worker SHOULD turn a discovered successor into a claimable derived job when all of the following are true:
- the predecessor produced durable evidence for the successor;
- the successor is bounded and has explicit acceptance criteria;
- its authority/write scope is safe under current worker policy;
- its `dedupe_key` is not already represented by a seed job, derived job, active claim or terminal return;
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

A derived job is candidate work, not a promoted product state. Once created, `/wc` treats it exactly like a seed portfolio job for claim/dedupe/return purposes. If the successor is uncertain, authority-sensitive, or underspecified, leave it only in `spawn_candidates` until another planner/reconciler can ground it.

This append-only derived-job lane is the default way the portfolio grows without concurrent rewrites of `PORTFOLIO.json`.

## Re-entry

After RETURN:
1. Materialize any safe fully-grounded successor as a derived job before leaving the context.
2. Reload `/wc`, normal queues, seed portfolio, derived jobs, claims and returns.
3. If the result unlocked a normal successor, normal allocation wins.
4. Otherwise claim another compatible seed/derived portfolio job and continue while context/authority remain adequate.
5. Do not stop merely because one portfolio job finished.

## Live projection

`/live/` may read seed portfolio jobs, derived jobs, claims and returns and display project progress. Live is a projection only. Its percentages or DONE labels never override durable evidence or promotion gates.
