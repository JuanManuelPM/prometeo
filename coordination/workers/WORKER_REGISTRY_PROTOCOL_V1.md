# Prometeo Worker Registry Protocol v1.2

Purpose: make every `/wc` launch visible without turning failed allocation attempts into fake active/recoverable workers.

## Launch beacon

After stable entry + Global Agent Constitution, and BEFORE extended queue archaeology/planning, create exactly one append-only beacon:

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

Beacon = launch evidence only. It grants no work authority.

## Claim-first allocation

Immediately after the beacon obey `coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md`.

Do not load broad project history before owning work. Use the allocator hint, revalidate a concrete candidate, atomically win its PIN/claim, persist STARTED, then load the deeper job-specific context.

The same `worker_id` MUST be reused in every later pin/claim/run/return/collision/heartbeat receipt.

## No allocation

A worker that never acquires a PIN/claim owns no job and creates no recovery debt.

When the bounded allocation cycle is exhausted, create:

`coordination/workers/no-allocation/<worker_id>.json`

with schema `prometeo.worker-no-allocation/v1` and `next_action=STOP_NO_RECOVERY`, then stop.

If the chat disappears before it can write that receipt, Live may infer `NO_ALLOCATION` after a short grace period from an old beacon with no assignment. That inference is UI/coordination state only; it grants no authority.

**Never launch a replacement specifically for a no-allocation worker.** Only an owned job can require recovery.

## Heartbeats

During substantive owned work, create append-only heartbeat receipts at material checkpoints, targeting <=3 minutes when practical:

`coordination/workers/heartbeats/<worker_id>/<timestamp_compact>.json`

Minimum shape:

```json
{
  "schema": "prometeo.worker-heartbeat/v1",
  "worker_id": "<same worker id>",
  "heartbeat_at": "<ISO-8601>",
  "job_id": "<current job/opportunity id>",
  "phase": "WORKING|VERIFYING|RETURNING|REALLOCATING",
  "source_head": "<observed head>"
}
```

## Liveness windows for owned work

Defaults for `/wc` canary:

- latest durable signal `<6 min`: `ACTIVE`;
- `>=6 min` and `<10 min`: `STALE_SUSPECT`;
- `>=10 min`, no terminal return and retry-safe: `RECOVERY_ELIGIBLE` / `REPLACEABLE`.

These thresholds apply to **owned work**, not bare launch beacons.

Bare beacon/no assignment:

- first ~90 seconds: `ALLOCATING` grace;
- after grace with no PIN/claim: `NO_ALLOCATION` and remove from the main active list;
- no recovery timer is created.

## Completion and rotation

Returns/runs remain completion evidence. After a RETURN, a worker should emit/reuse `REALLOCATING`, reload the fast allocator and attempt another useful compatible job while context/authority remain adequate.

Finishing one small task is not a reason to stop, but lack of claimable work is also not a reason to burn the chat indefinitely.

## Live projection

Human-facing Live must distinguish:

`ALLOCATING -> WORKING -> STALE_SUSPECT -> REPLACEABLE -> recovered/terminal`

from:

`ALLOCATING -> NO_ALLOCATION -> hidden from Ahora`.

For portfolio recovery generations, only the highest currently authoritative pin generation is shown as the current owner. Older generations remain historical evidence and must not appear as simultaneous active/replaceable workers once superseded.

## Truth boundary

Beacon = chat reached Prometeo. Pin/claim = work authority. Heartbeat = liveness evidence. Return = result evidence. No-allocation = capacity found no ownable work. None imply Current, Human Accepted or Served.