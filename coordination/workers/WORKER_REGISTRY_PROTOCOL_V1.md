# Prometeo Worker Registry Protocol v1

Purpose: make every `/wc` launch visible before substantive work so Live can distinguish a worker that is allocating, pinned, working, finished, collided/re-entering, or silent.

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

## Completion

Returns/runs remain the completion evidence. Live joins them back to the launch beacon by `worker_id` and computes assignment time, completion time and duration. A beacon with no later assignment after 3 minutes is displayed as `SIN SEÑAL`, not silently hidden.

## Truth boundary

Beacon = chat reached Prometeo and registered. Pin/claim = work authority. Return = result evidence. None of these imply Current, Human Accepted or Served.
