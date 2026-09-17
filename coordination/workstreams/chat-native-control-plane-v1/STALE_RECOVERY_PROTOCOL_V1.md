# Stale / Recovery Protocol v1

Status: BINDING CANARY POLICY
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prevent a vanished or slow worker from becoming a permanent gate while preserving immutable evidence and avoiding unsafe double writes.

## 1. Signals

A material universal worker should persist durable progress signals in its own run/receipt lineage:
- `STARTED` before substantive work;
- checkpoint receipts after meaningful progress;
- `heartbeat_at` or equivalent durable timestamp at each material checkpoint;
- `RETURN` when terminal/useful result exists;
- own run `DONE`/boundary referencing the return.

Target cadence during active work: no more than 10 minutes between durable signals when the tool/runtime permits. A heartbeat is evidence of liveness only, never evidence of quality or completion.

## 2. Time states

These are policy defaults for the universal-worker canary:

- `<20 min` since latest durable signal: `ACTIVE_OR_UNKNOWN`; no takeover from time alone.
- `>=20 min` with claim/STARTED, no RETURN, no newer heartbeat/checkpoint: `STALE_SUSPECT`.
- `>=30 min` with the same evidence and retry-safe scope: `RECOVERY_ELIGIBLE`.

Silence alone never means FAILED. The original attempt remains preserved.

## 3. Recovery eligibility

Another worker may take recovery work only when all are true:
1. original exclusive claim exists;
2. STARTED/run evidence exists or the claim is otherwise known abandoned;
3. no durable RETURN exists;
4. no heartbeat/checkpoint newer than the recovery cutoff exists;
5. the opportunity is retryable or can be converted to an isolated candidate attempt;
6. current target paths/authority have been re-fetched;
7. there is no evidence of a currently active overlapping writer that would make continuation unsafe.

## 4. Recovery claim

Never overwrite the original claim.

Create an append-only recovery claim under:
`coordination/opportunities/recovery-claims/<opportunity_id>/<recovery_attempt_id>.json`

It records:
- original opportunity/claim/run refs;
- last durable signal and age;
- eligibility checks;
- current head/epoch;
- intended write mode (`CAS_CONTINUE`, `ISOLATED_CANDIDATE`, `READ_ONLY_RECOVERY`);
- recovery worker/session;
- collision/authority checks.

Then create a fresh run attempt with explicit `previous_run` / `supersedes_attempt_candidate` lineage. Do not mutate the old run.

## 5. Write safety

Recovery does not grant stale-overwrite authority.

Before every recovered material write:
- re-fetch exact target/current SHA;
- inspect changes since original source head/latest checkpoint;
- use CAS/expected SHA where available;
- if target changed incompatibly, do not overwrite; rebase/reconcile or switch to an isolated candidate/patch path;
- shared Current/Human Accepted/Served remains protected.

If the original worker produced durable writes but no RETURN, those bytes are evidence to inspect, not permission to assume intent or completeness.

## 6. Late original return

A late original worker may still produce a RETURN. It is not discarded merely because recovery started.

Steward/validator must reconcile both attempts:
- compare evidence and changed paths;
- prefer neither by recency alone;
- record disposition (`CONSUMED`, `PARTIAL`, `SUPERSEDED_WITH_REASON`, `CONFLICTED`, etc.);
- preserve lineage.

## 7. Sequential chains

A worker finishing step A may immediately attempt an atomic claim on newly-unblocked step B. If another worker already claimed B, the first worker must not duplicate B; it re-enters allocation for another useful task.

This is how a worker can keep working through a sequential campaign without forcing all sequential work into one permanent chat.

## 8. External timing boundary

Chat turns do not wake themselves after they have ended. This protocol guarantees that any later universal worker can detect and recover eligible stale work. Fully unattended timed detection requires the external Metabolism Tick/event loop to run the stale scanner periodically; that runtime remains a separate deployment gate.

## 9. Success evidence

Do not call stale recovery operational until a canary proves:
- stale suspicion from timestamps;
- recovery eligibility;
- separate append-only recovery claim;
- fresh run with lineage;
- CAS-safe continuation or isolated fallback;
- late-original reconciliation;
- no silent overwrite or duplicate authority promotion.