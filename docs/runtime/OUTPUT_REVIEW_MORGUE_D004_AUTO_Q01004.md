# AUTO-Q01004 — Downstream review of MORGUE-D004

**Reviewed output:** `MORGUE-REVIEW-01 / MORGUE-D004`  
**Disposition:** ACCEPT_WITH_CORRECTIONS

## What is independently verified

The reviewed output names exactly death records 31, 32 and 216–223, all in batch D004. Their durable death rows support the four-way operational split:

- D216/K055, D217/K045, D218/K054 and D222/K057: `jobs_done=0`, `last_project_id=NULL`, detected PARKED.
- D219/K062: five completed jobs before PARKED/death detection.
- D223/K063: one completed job before PARKED/death detection.
- D31/K029: one completed Runtime job, then a later I003 lease expiry.
- D32/K020: I001 lease expiry, later rescue I003 lease expiry, no accepted job.
- D220/K041 and D221/K023: Runtime lease expiry followed by a stale-result rejection.

The near-miss timing is also correct. K041 expired at 02:23:05.473501Z and produced `STALE_RESULT_REJECTED` at 02:23:26.690265Z: ~21.217 s later. K023 expired at 02:16:26.710889Z and stale-rejected at 02:16:49.096320Z: ~22.385 s later. K029 completed I001, later received I003 and expired. K020 received both I001 and rescue I003 and both expired.

These facts make the high-level distinction “death detection is not equivalent to failed job” usable downstream.

## Required corrections before downstream policy use

### 1. PARKED is not a protocol-terminal state

D004 says `PARKED sin lease es terminal sano para métricas de ejecución` and later suggests the visible OBEY contract should say a parked session has no obligation to remain alive indefinitely.

Only the first statement is safe after narrowing its scope. A PARKED worker with no active lease can be a **non-failure execution outcome** for job-success metrics. That does **not** make PARKED terminal in the control protocol. When Prometeo returns `must_continue=true` / `next_action=WAIT`, the worker remains resident according to that contract. Downstream must never translate this metric classification into “stop polling” or “respond terminal”.

Safe wording: **PARKED_NO_WORK is non-failure for execution-quality metrics; protocol terminality is determined only by the returned state/action contract.**

### 2. NEAR_MISS_AFTER_EXPIRY currently needs provenance support

R3 is useful, but current `STALE_RESULT_REJECTED` events can lose `project_id/job_key` after the reaper clears the lease. The D220/D221 correlation was reconstructed from the raw lease token in historical events. That is sufficient for this audit, but not a good durable metric contract.

Before making NEAR_MISS_AFTER_EXPIRY a production metric, add immutable attempt provenance / lease fingerprint so stale receipt can retain project, job, generation, expiry and `seconds_after_expiry` without storing reusable raw lease secrets. Q005 specifies this candidate/evidence lane.

### 3. Scope the Runtime conclusion to D004

“Runtime concentrates the relevant expiry evidence” is supported **inside this ten-case batch**. It must not be consumed as a population-wide estimate of Runtime failure rate without a denominator across comparable jobs/cohorts. Downstream text should retain `scope=batch D004, n=10`.

### 4. lease_class is a proposal, not an observed field

The suggested `lease_class=QUICK_REVIEW|STANDARD_REVIEW|IMPLEMENTATION|GUIDE` may be useful, but no such durable field was verified in this review. Consumers must not branch on it until implemented. Existing job/project metadata can be used meanwhile for cohorting.

### 5. Checkpoint semantics are correctly cautious

D004 correctly states that checkpoint proves observable progress and does not imply lease renewal. Keep this distinction. If renewal is ever introduced, it needs an explicit returned state/action and auditable new expiry.

## Downstream-safe acceptance

Consumers may use D004 for:
- separating `parked_no_assignment`, `productive_then_parked`, `stale_after_expiry`, and `runtime_expiry_recovery`;
- treating death/liveness as distinct from job outcome;
- motivating a near-miss metric, candidate salvage, and cohort tests of longer Runtime leases.

Consumers must **not** use D004 to:
- treat PARKED as protocol terminal;
- infer security/tool/rate-limit root causes for the expiry cases;
- generalize D004 proportions to all workers;
- assume `lease_class` or reliable stale provenance already exists.

With those corrections, the output is conceptually usable without inventing decisions.
