# Prometeo Portfolio Worker Contract v1

## Purpose

This contract turns spare `/wc` capacity into real, deduplicated project progress. The durable project/backlog source is `coordination/portfolio/PORTFOLIO.json`. The portfolio is a fallback allocation layer, not a replacement for higher-value live opportunity queues, dependency unlockers, required verification, or safe stale recovery.

## Allocation order

1. Reload authoritative L0 state, active opportunity queues, claims, runs, returns and recovery evidence.
2. Take the highest-value compatible normal/recovery work when it is claimable and useful.
3. If prepared work is exhausted or saturated by other workers, load `coordination/portfolio/PORTFOLIO.json` plus current portfolio claims/returns.
4. Choose the highest-priority compatible portfolio job that is neither terminally returned nor actively claimed.
5. Unknown/discovery projects MUST start with their archaeology/recovery job. Never infer an implementation from a project label alone.
6. If no compatible safe job remains, discovery/proposal rules from `/wc` still apply. `IDLE_NO_SAFE_USEFUL_WORK` remains last resort.

## Dedupe law

Every portfolio job has a stable `job_id` and `dedupe_key`.

Before working, scan:
- `coordination/portfolio/claims/<job_id>/`
- `coordination/portfolio/returns/<job_id>/`

A terminal return for the same `dedupe_key` blocks replay. A non-expired active claim for the same `dedupe_key` blocks duplicate execution. Losing a claim race means reload and choose another job; never ask the human to assign a replacement.

Terminal outcomes are `DONE`, `VERIFIED`, `NO_ACTION_NEEDED`, or `SUPERSEDED`. A `BOUNDARY` or `PARTIAL` return does not silently count as completed; it must state exact residual work and may propose a successor.

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

`spawn_candidates` are candidate successor work, not automatically Current. A planner/reconciler may promote them into `PORTFOLIO.json` or another durable opportunity queue after dedupe/authority checks.

## Re-entry

After RETURN:
1. Reload `/wc`, normal queues and portfolio state.
2. If the result unlocked a normal successor, normal allocation wins.
3. Otherwise claim another compatible portfolio job and continue while context/authority remain adequate.
4. Do not stop merely because one portfolio job finished.

## Live projection

`/live/` may read the portfolio plus claims/returns and display project progress. Live is a projection only. Its percentages or DONE labels never override durable evidence or promotion gates.
