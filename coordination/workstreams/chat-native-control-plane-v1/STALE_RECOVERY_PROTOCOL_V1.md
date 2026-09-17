# Stale / Recovery Protocol v1.1

Status: BINDING CANARY POLICY
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prevent a vanished or slow worker from becoming a permanent gate while preserving immutable evidence and avoiding unsafe double writes.

## 1. Signals

A material universal worker should persist durable progress signals in its own run/receipt lineage:
- launch beacon before extended allocation;
- `STARTED` before substantive work;
- checkpoint receipts after meaningful progress;
- append-only worker heartbeat or equivalent durable timestamp at each material checkpoint;
- `RETURN` when terminal/useful result exists;
- own run `DONE`/boundary referencing the return.

Target cadence during active work: no more than **3 minutes** between durable signals when the tool/runtime permits. A heartbeat is evidence of liveness only, never evidence of quality or completion.

## 2. Time states

Defaults for the high-parallelism `/wc` canary:

- `<6 min` since latest durable signal: `ACTIVE_OR_UNKNOWN`; no takeover from time alone.
- `>=6 min` with claim/STARTED, no RETURN, no newer heartbeat/checkpoint: `STALE_SUSPECT`.
- `>=10 min` with the same evidence and retry-safe scope: `RECOVERY_ELIGIBLE`.
- launch beacon with no assignment/pin/claim after `>=3 min`: `ALLOCATION_SILENT`; another worker does not wait for it and may allocate independently.

Silence alone never means FAILED. The original attempt remains preserved. The point of the shorter windows is throughput: with many disposable workers, waiting 30–90 minutes on a vanished owner can become the dominant bottleneck.

## 3. Recovery eligibility

Another worker may take recovery work only when all are true:
1. original exclusive claim/pin exists;
2. STARTED/run evidence exists or the claim is otherwise known abandoned;
3. no durable RETURN exists;
4. no heartbeat/checkpoint newer than the 10-minute recovery cutoff exists;
5. the opportunity is retryable or can be converted to an isolated candidate attempt;
6. current target paths/authority have been re-fetched;
7. there is no evidence of a currently active overlapping writer that would make continuation unsafe.

For portfolio work, the latest durable signal age is the liveness source. A long historical `expires_at` value does not force Live or recovery to pretend the worker is active for 30–90 minutes when no durable signal has appeared for >=10 minutes. Recovery still uses the next deterministic pin generation and predecessor lineage; it never overwrites the predecessor pin.

## 4. Recovery claim

Never overwrite the original claim.

For normal opportunities, create an append-only recovery claim under:
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

For portfolio work, every eligible recovery contender races on the exact next deterministic pin generation defined by `PORTFOLIO_PIN_PROTOCOL_V1.json`; only the winner executes.

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

## 7. Sequential chains / worker rotation

A worker finishing step A should immediately attempt an atomic claim on newly-unblocked step B or another compatible high-value job. If another worker already owns B, it re-enters allocation instead of duplicating B.

A short task should normally lead to another allocation in the same chat while context/authority remain adequate. There is no one-task stopping rule.

## 8. External timing boundary

Chat turns do not wake themselves after they have ended. This protocol guarantees that any later universal worker can detect and recover eligible stale work. Fully unattended timed detection still requires an external Metabolism Tick/event loop; however, when the human is launching many `/wc` chats, each new worker performs the stale check during allocation and can recover eligible work immediately.

## 9. Success evidence

Do not call stale recovery operational until canaries prove:
- 6-minute stale suspicion from timestamps;
- 10-minute recovery eligibility;
- separate append-only recovery claim / next-generation portfolio pin;
- fresh run with lineage;
- CAS-safe continuation or isolated fallback;
- late-original reconciliation;
- no silent overwrite or duplicate authority promotion.
