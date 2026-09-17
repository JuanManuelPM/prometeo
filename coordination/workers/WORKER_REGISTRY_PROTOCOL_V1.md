# Prometeo Worker Registry Protocol v1.3

Purpose: make every `/wc` launch visible without turning allocation overhead into fake work.

## Launch beacon

Create exactly one append-only beacon as the first durable action:

`coordination/workers/beacons/<worker_id>.json`

```json
{
  "schema": "prometeo.worker-beacon/v1",
  "worker_id": "<unique worker id>",
  "launched_at": "<ISO-8601>",
  "source_head": "<observed main head>",
  "bootstrap": "/wc",
  "phase": "ALLOCATING"
}
```

Beacon = launch evidence only. It grants no work authority.

## Claim-now allocation

Immediately obey `coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md`.

Before ownership, the worker must NOT perform broad context loading or candidate archaeology. It reads one allocator snapshot and attempts atomic claim/PIN creation directly. Deep validation happens after ownership and before substantive mutation.

Reuse the same `worker_id` in every later pin/claim/run/return/collision/heartbeat receipt.

## No allocation

A worker that never acquires a PIN/claim owns no job and creates no recovery debt.

When bounded fast allocation is exhausted, create:

`coordination/workers/no-allocation/<worker_id>.json`

with `schema=prometeo.worker-no-allocation/v1` and `next_action=STOP_NO_RECOVERY`, then stop.

Never launch a replacement specifically for a no-allocation worker. Only owned work can require recovery.

## Allocation grace in Live

Bare beacon/no assignment:

- first ~45 seconds: `ALLOCATING` grace;
- after that with no PIN/claim: infer/display `NO_ALLOCATION` outside the main active list;
- explicit no-allocation receipt hides it immediately;
- no recovery timer is created.

This is projection only; it grants no authority.

## Heartbeats for owned work

During substantive owned work, create append-only heartbeat receipts at material checkpoints, targeting <=3 minutes when practical:

`coordination/workers/heartbeats/<worker_id>/<timestamp_compact>.json`

```json
{
  "schema": "prometeo.worker-heartbeat/v1",
  "worker_id": "<same worker id>",
  "heartbeat_at": "<ISO-8601>",
  "job_id": "<owned job id>",
  "phase": "WORKING|VERIFYING|RETURNING|REALLOCATING",
  "source_head": "<observed head>"
}
```

## Liveness windows for owned work

- latest durable owned signal `<6 min`: `ACTIVE`;
- `>=6 min` and `<10 min`: `STALE_SUSPECT`;
- `>=10 min`, no terminal return and retry-safe: `RECOVERY_ELIGIBLE` / `REPLACEABLE`.

These thresholds never apply to a bare beacon.

## Completion and rotation

After RETURN, re-enter fast allocation in the same chat while context remains safe. A small completed task is not a reason to stop; lack of claimable work is not a reason to burn minutes searching.

## Live projection

Owned lane:
`ALLOCATING -> WORKING -> STALE_SUSPECT -> REPLACEABLE -> recovered/terminal`

Unowned lane:
`ALLOCATING -> NO_ALLOCATION -> hidden from Ahora`

For portfolio recovery generations, only the highest authoritative generation appears as current owner. Older generations remain historical evidence.

## Truth boundary

Beacon = launch evidence. Pin/claim = work authority. Heartbeat = liveness. Return = result evidence. No-allocation = surplus capacity. None imply Current, Human Accepted or Served.