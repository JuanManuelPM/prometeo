# Prometeo Fast Allocation Protocol v1

Status: CANARY / binding for `/wc`.

Purpose: prevent disposable worker chats from spending minutes loading context before they own useful work.

## Core rule

A fresh `/wc` has two phases.

### PHASE A — CLAIM FIRST

Before deep context, archaeology, planning, page loading or implementation:

1. Load stable entry + Global Agent Constitution.
2. Load `WORKER_REGISTRY_PROTOCOL_V1.md` and create the unique launch beacon.
3. Read the tiny public allocator hint: `https://juanmanuelpm.github.io/prometeo/live/allocator.json`.
4. Prefer candidates in this order:
   - retry-safe `recovery` work;
   - ready executable/verification work;
   - ready queue work;
   - one deterministic Guide/Planner/Integrator/Rescate fallback when the frontier is thin.
5. Revalidate the exact candidate against current durable state.
6. Atomically win its normal claim or deterministic portfolio PIN.
7. Persist STARTED.

Only after step 7 may the worker load the deeper context required by that exact job.

`allocator.json` is a hint/index, never authority. Its entries must be revalidated before mutation.

## Allocation budget

Do not burn a chat on allocator archaeology.

- Try at most 3 concrete claim/PIN candidates in one short allocation cycle.
- A lost race means re-enter immediately and try a different candidate; do not reread broad project history.
- If no candidate can be owned, evaluate exactly one deterministic metabolism/guide fallback using `METABOLISM_POLICY_V1.json`.
- If that fallback is already owned, cannot be created safely, or no safe useful work exists, write one append-only no-allocation receipt and stop.

No-assignment receipt:

`coordination/workers/no-allocation/<worker_id>.json`

Minimum fields:

```json
{
  "schema": "prometeo.worker-no-allocation/v1",
  "worker_id": "<same worker id>",
  "observed_at": "<ISO-8601>",
  "attempts": 0,
  "reason": "NO_CLAIMABLE_WORK|RACES_LOST|BOUNDARY",
  "source_head": "<observed main head>",
  "next_action": "STOP_NO_RECOVERY"
}
```

A worker with no PIN/claim owns nothing. It MUST NOT create recovery work for itself and nobody should launch a replacement specifically for that worker.

## PHASE B — EXECUTE DEEPLY

Once the worker owns a job:

- load only the job-specific context, page plates, authority, protocols and evidence needed;
- execute through acceptance criteria;
- checkpoint/heartbeat during longer work;
- RETURN durably;
- immediately re-enter Phase A in the same chat when context remains safe.

The speed optimization applies only before ownership. It does not weaken evidence, verification, authority, CAS, page identity or publication laws during execution.

## Recovery semantics

Recovery exists only for work that acquired authority and then went silent.

- no PIN/claim -> no recovery, no replacement debt;
- authoritative job signal <6m -> active;
- 6–10m -> suspect;
- >=10m + retry-safe -> recovery candidate;
- a newer valid recovery PIN supersedes older owner attempts for the human-facing Live projection.

## Human-facing projection

Live should keep no-allocation launches out of the main `Ahora` list after a short grace period. They may contribute to a compact diagnostic count such as `lanzamientos sin trabajo`, but they are not `trabajando`, `reemplazable`, or jobs needing rescue.

Historical/superseded PIN generations are evidence, not simultaneous active workers. Only the latest authoritative generation for a job may appear as that job's current owner.

## Success condition

Repeated `/wc` launches should rapidly become one of:

`PIN/CLAIM -> WORK -> RETURN -> REALLOCATE`

or, when capacity exceeds useful work:

`BEACON -> bounded claim attempts -> NO_ALLOCATION -> STOP`

No multi-minute `Buscando trabajo` limbo, and no worker swarm devoted to repairing workers that never owned work.