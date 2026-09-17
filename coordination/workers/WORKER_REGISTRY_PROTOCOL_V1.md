# Prometeo Worker Registry Protocol v1.1

Purpose: make every `/wc` launch visible before substantive work so Live can distinguish a worker that is allocating, pinned, working, finished, collided/re-entering, silent, suspect or replaceable.

## Launch beacon

After loading the stable entry + Global Agent Constitution, and BEFORE extended queue archaeology/planning, create exactly one append-only beacon:

`coordination/workers/beacons/<worker_id>.json`

Minimum shape:

```json
{
  "schema": "prometeo.worker-beacon/v1",
  "worker_id": "<unique chat/worker id>",
  "launched_at": "<ISO-8601>",
  "source_head": "<main head observed>",
  "bootstrap": "/wc",
  "phase": "ALLOCATING"
}
```

The beacon grants NO mutation authority beyond registering liveness. It is never updated or deleted.

## Allocation

After the beacon, reload live durable state and immediately pursue the highest-value compatible work. For portfolio work the deterministic PIN is authority; for normal queues the existing exclusive claim protocol is authority. The same `worker_id` MUST be reused in pin/claim/run/return/collision evidence.

A worker must not perform substantive implementation before winning the appropriate pin/claim. A lost race means durable collision evidence where defined, then immediate re-entry to another job.

## Heartbeats

During substantive work, create compact append-only heartbeat receipts at material checkpoints, targeting no more than 3 minutes between durable signals when tools/runtime permit:

`coordination/workers/heartbeats/<worker_id>/<timestamp_compact>.json`

Minimum shape:

```json
{
  "schema": "prometeo.worker-heartbeat/v1",
  "worker_id": "<same worker id>",
  "heartbeat_at": "<ISO-8601>",
  "job_id": "<current job/opportunity id or null>",
  "phase": "WORKING|VERIFYING|RETURNING|REALLOCATING",
  "source_head": "<observed head>"
}
```

Heartbeat = liveness only. It does not renew product authority by itself, but stale/recovery policy uses the latest durable signal to decide whether a safe replacement may compete for the next recovery generation.

## Fast liveness windows

Defaults for `/wc` canary work:

- latest durable signal age `<6 min`: `ACTIVE`;
- `>=6 min` and `<10 min`: `STALE_SUSPECT`;
- `>=10 min`, no terminal return and retry-safe scope: `RECOVERY_ELIGIBLE` / `REPLACEABLE`;
- beacon with no assignment after 3 minutes: `SIN_PIN` / allocation failure signal.

These windows exist because worker tasks normally complete or emit checkpoints quickly; waiting 30–90 minutes creates an avoidable swarm bottleneck. Recovery still requires CAS/idempotency/authority safety and never authorizes silent overwrite.

## Completion and rotation

Returns/runs remain completion evidence. Live joins them back to the launch beacon by `worker_id` and computes assignment time, completion time, duration and last durable signal.

After a RETURN, the worker should immediately emit/reuse a REALLOCATING heartbeat, reload the frontier and attempt another useful compatible job while context/authority remain adequate. Finishing one small task is not a reason to stop.

## Live projection

Live should present human-facing effective state from durable evidence:

`ALLOCATING -> WORKING -> STALE_SUSPECT -> REPLACEABLE` or terminal result.

It should show the countdown until the 10-minute replacement boundary, not pretend a long declared lease means the worker is actively working. Historical technical receipts may remain hidden behind a detail tap.

## Truth boundary

Beacon = chat reached Prometeo and registered. Pin/claim = work authority. Heartbeat = liveness evidence. Return = result evidence. None of these imply Current, Human Accepted or Served.
