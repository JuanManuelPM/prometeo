# PROMETEO · RECOVERABLE WORKER BUS V2

Status: ACTIVE / SMOKE-VERIFIED
Trace: 45

## Root cause fixed

BLOCKED_TAKE_V3_NULL_JOB had a concrete PL/pgSQL cause: TAKE executed SELECT ... INTO job, then UPDATE session.last_seen_at, and only afterwards checked FOUND. The UPDATE overwrote FOUND, so an empty SELECT could be misread as a successful job selection and return WORK with a null job.

V3 now delegates auxiliary work to corrected TAKE V4. V4 captures has_job immediately after SELECT.

## Invariants

1. WORK always contains a complete packet.
2. Repeating TAKE while the same session owns ACTIVE work returns the exact same token/generation.
3. Membership, authority and liveness are separate.
4. A valid lease does not prove a shell is alive.
5. Workers leave durable PROGRESS checkpoints.
6. Known temporary failure uses FAIL_RECOVERABLE before the shell ends when possible.
7. Watchdog requeues after four missed heartbeat intervals.
8. Reassignment increments assignment_generation.
9. Old token/generation cannot commit after recovery.
10. Workflow dependencies unlock only on completion_class=SUCCESS.
11. Independent verifier jobs cannot be taken by the source executor session.
12. Auto-children are cognitive-only, allowlisted, max 3 per result and bounded depth; they cannot grant material authority.

## Active RPCs

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
- NEW TAKE followed by RESUME with same token/generation;
- PROGRESS accepted;
- forced silence -> watchdog requeue;
- reassignment increments generation;
- old generation -> STALE_GENERATION;
- current generation -> SUCCESS;
- explicit recoverable failure -> READY -> reassigned;
- incomplete packet -> RETRY_TAKE + requeue;
- source executor cannot take independent verifier;
- recoverable predecessor does not unlock dependency;
- successful retry does unlock dependency.

## E2 micro-screen V2

PROMETEO-E2-MICROSCREEN-V2 ran through bounded server-side RPCs.

- 4 arms / 16 matched cells / 20 benchmark sessions.
- Lease fencing: old token STALE, current token ACCEPTED on same cell.
- S05: FRAME -> SOLVE -> REVIEW works; however REVIEW immediately takes fresh FRAME work afterward. The supposed 120-second spillover is only a ranking preference, not a gate.
- S06: canonical same-role SELF_PRIOR linkage proven and context remains DATA_ONLY.
- S09: matched diagnostic + placebo ran under CELL_BASELINE vs CELL_RULE_FRONT with equal non-protocol config.
- fixture closed with 21 claims / 83 events.
- SCREEN-10 E1 remained exactly 1200 cells / 571 claims / 1702 events.
- shared TAKE_V1 / SUBMIT_V1 / REAP_V1 definitions remained unchanged.

Durable workflow is the process. Chat/model shells are disposable step executors. Never infer execution from possession of work.
