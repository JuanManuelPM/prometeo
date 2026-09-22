# Q009 — Timing model validation

## Verified defects in the current view

1. **Open-tail loss.** The last event uses `coalesce(next_at, created_at)`, so its duration is always zero. Separately, `observed_ms` uses `coalesce(last_event_at, last_seen_at, t0)`; whenever a last event exists, a later `last_seen_at` is ignored. In K056, `last_event_at=02:59:08.511569Z` while `last_seen_at=03:01:59.476433Z`, so roughly 171 seconds disappeared from both buckets and the denominator.

2. **T0 clipping error.** Backfilled/compatibility events can precede `first_observed_at`. K056 has ENTER at 02:44:28.377025Z and T0 at 02:44:28.384286Z. Current bucket sums therefore exceeded `observed_ms` by ~7 ms. Recent sessions show the same small negative uncovered delta.

3. **Simultaneous events are order-sensitive.** `lead(created_at) over(order by created_at,event_id)` gives zero duration to all but the final event at an identical timestamp. The total is conserved only accidentally, and the final event_id determines the semantic bucket. The model should first collapse equal timestamps to one effective transition while retaining raw event_count separately.

4. **PUBLISH_RESULT is misclassified.** Current CASE assigns every `PUBLISH%` row to PUBLISH unless state is WORK. After `RETRY_LENGTH` or `RETRY_CHILDREN`, the worker is rewriting and should be WORK, not PUBLISH. After `STALE_LEASE` the next phase is WAIT. K056 currently attributes ~29.9 s after RETRY_LENGTH to PUBLISH.

5. **Backfill is structurally incomplete.** `prometeo_worker_session_touch` deduplicates on event_key. WAIT uses a constant key per agent and WAIT_RESULT a constant key per agent+state, so repeated waits and later WORK assignments are absent from `prometeo_worker_session_events`. K056's second assignment at 03:01:59.476433Z exists in `prometeo_events` as RESCUE_ASSIGNED but is missing from the session-event timeline.

## Mathematical correction

Use one explicit interval `[t0, end_at]`, where closed sessions use `closed_at` and open sessions use query time (the protocol defines them as resident until closed/stopped). For each distinct event timestamp, retain one effective transition, then compute:

`start_at = greatest(event_at, t0)`

`stop_at = least(coalesce(next_distinct_event_at, end_at), end_at)`

`interval_ms = max(0, stop_at - start_at)`

Clip all pre-T0 backfill to zero. Any uncovered gap must be assigned to OTHER rather than existing only in the denominator. Percentages must divide by the exact conserved bucket sum / observed interval so `BOOT + COORDINATION + WAIT + WORK + PUBLISH + OTHER = observed_ms` (allowing at most rounding noise).

State-aware bucket rules: WORK state and CHECKPOINT => WORK; PUBLISH request => PUBLISH only until its result; PUBLISH_RESULT RETRY_LENGTH/RETRY_CHILDREN => WORK; PUBLISH_RESULT STALE_LEASE/WAIT/PARKED/PAUSED => WAIT; WAIT/WAIT_RESULT non-WORK => WAIT; PREFLIGHT/ENTER/CONTRACT_COMPAT => COORDINATION.

For historical backfill, union canonical `prometeo_events` transitions into the timing stream when the session-event record is missing: PARKED => WAIT, JOB_ASSIGNED/RESCUE_ASSIGNED => WORK, LEASE_EXPIRED/STALE_RESULT_REJECTED => WAIT, plus publish outcomes. Future event keys should include a request/sequence identity (wait cycle, lease fingerprint, or durable event id), not only agent+state, so repeated transitions remain observable.

## Fixture

`supabase/tests/runtime_session_timing_q009.sql` covers pre-T0 data, duplicate timestamps, missing next event, open tail, retry-to-WORK semantics, and conservation. Executed against Supabase: all six assertions returned true.
