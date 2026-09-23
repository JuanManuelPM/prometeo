# PROMETEO · RECOVERABLE WORKER BUS V2

Status: ACTIVE / SMOKE-VERIFIED
Trace: 45

## Root cause fixed

The concrete BLOCKED_TAKE_V3_NULL_JOB failure was caused by PL/pgSQL FOUND semantics.

The old auxiliary TAKE path did:

1. SELECT ... INTO job
2. UPDATE session.last_seen_at
3. IF NOT FOUND ...

The UPDATE overwrote FOUND. Therefore a SELECT that found no job could be misread as successful and the function could continue with a null job.

V3 now delegates auxiliary work to corrected TAKE V4. V4 captures has_job immediately after SELECT.

## Core invariants

1. WORK implies a complete packet.
2. Repeating TAKE while the same session owns ACTIVE work returns the exact same packet/token/generation.
3. Membership, authority and liveness are separate concepts.
4. Authority lease does not prove the shell is alive.
5. Workers report durable PROGRESS/checkpoints.
6. Recoverable local/tool failure must be reported with FAIL_RECOVERABLE before ending when possible.
7. Watchdog requeues after four missed heartbeat intervals.
8. Every reassignment increments assignment_generation.
9. Old generation/token cannot commit after recovery.
10. Workflow dependencies unlock only when predecessor completion_class=SUCCESS.
11. Independent verifier jobs cannot be taken by the source executor session.
12. Auto-children are cognitive-only, allowlisted, max 3 per result and bounded depth; they cannot grant material authority.

## Trusted RPCs

- prometeo_worker_take_v4
- prometeo_worker_wait_v3
- prometeo_worker_progress_v1
- prometeo_worker_fail_recoverable_v1
- prometeo_worker_submit_v6
- prometeo_worker_watchdog_v2
- prometeo_work_wave_tick_v2
- prometeo_worker_runtime_v2
- prometeo_operational_now_v2

## Smoke receipts

Verified:
- first TAKE -> NEW;
- repeated TAKE -> RESUME with same token/generation;
- heartbeat/progress accepted;
- forced silence -> watchdog requeue;
- reassignment -> generation increments;
- old generation submit -> STALE_GENERATION;
- current generation submit -> SUCCESS;
- explicit recoverable failure -> READY -> reassigned;
- intentionally incomplete packet -> RETRY_TAKE + requeue;
- source executor cannot take independent verifier; another session can;
- recoverable predecessor failure does not unlock dependency;
- successful next generation unlocks dependency.

## Micro-screen V2

PROMETEO-E2-MICROSCREEN-V2 was executed using bounded server-side RPCs instead of arbitrary connector DML.

Receipts:
- 4 arms / 16 matched cells / 20 benchmark sessions.
- lease fencing: old token STALE, new token ACCEPTED on same cell.
- S05: FRAME -> SOLVE -> REVIEW works, but REVIEW specialist immediately takes fresh FRAME work afterward. The supposed 120s spillover is only a ranking preference, not an eligibility gate.
- S06: first FRAME has no prior; later same-role FRAME contains canonical SELF_PRIOR ref to accepted first job; context remains DATA_ONLY.
- S09: matched diagnostic + placebo executed under CELL_BASELINE vs CELL_RULE_FRONT with equal non-protocol config.
- fixture closed with 21 claims / 83 events.
- SCREEN-10 E1 unchanged: 1200 cells / 571 claims / 1702 events.
- shared TAKE_V1 / SUBMIT_V1 / REAP_V1 definitions unchanged.

## Operating model

Durable workflow is the process. Chat/model shells are disposable step executors.

Never infer execution from possession of work.
