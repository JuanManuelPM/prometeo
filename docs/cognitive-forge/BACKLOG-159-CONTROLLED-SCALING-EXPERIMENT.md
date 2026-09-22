# BACKLOG-159 · Controlled parallelism throughput experiment

## Purpose

Test the exact claim behind BACKLOG-159: **holding workload constant, fewer workers produce lower throughput and longer makespan until the workload stops offering enough parallel work**.

This experiment must not infer causality from historical cohorts, because cohort size, job mix, tool latency and launch timing differ.

## Hypothesis

For one immutable benchmark workload W with independent jobs of the same contract:

- throughput(1) <= throughput(2) <= throughput(4) <= throughput(8), within observed variance;
- makespan(1) >= makespan(2) >= makespan(4) >= makespan(8);
- a plateau is allowed once READY width is lower than worker count or coordination overhead dominates;
- if the relation is not supported, BACKLOG-159 must remain unproven.

No conclusion may be derived from output word count.

## Isolation

Use a dedicated project key derived from `SCALING-BENCH-159`. Do not enqueue benchmark jobs in PRODUCTIVE-FRONTIER-01 and do not mutate frontier sources.

Each run must use a fresh run_id but the exact same workload definition hash. Workers assigned to the benchmark may only publish benchmark receipts. Cleanup must retire/close benchmark rows without deleting the receipts required for comparison.

## Workload contract: BENCHMARK_NOP_V1

Use at least 32 independent jobs so every tested cohort has enough READY width.

Every job receives the same instruction and input shape:

- no web or external tool dependency;
- no repository/backend mutation;
- deterministic transformation over a small fixed JSON fixture;
- fixed acceptance validator;
- fixed min/max output bounds;
- identical required rank;
- identical lease duration.

The fixture and instruction bytes must be hashed once. Every run records the same `workload_hash`.

The benchmark is invalid if any run changes the fixture, instruction, validator, job count or model/rank requirement.

## Conditions

Preferred worker counts: 1, 2, 4, 8.

If an exact count cannot be launched safely, record the actual active benchmark worker count and do not relabel it.

Run every condition at least 3 times. Randomize or rotate condition order when practical so time-of-day/system drift is not perfectly correlated with worker count.

Never run two conditions concurrently.

## Timing boundaries

For each run record server-side timestamps:

- t_ready: all benchmark jobs are READY;
- t_first_lease;
- t_first_publish;
- t_last_publish;
- t_done: all jobs terminal.

Primary makespan = t_done - t_ready.

Primary throughput = completed benchmark jobs / makespan seconds.

Also retain:

- lease-to-publish latency distribution;
- number of rescues;
- tool failures (expected 0);
- WAIT time;
- coordination time;
- actual concurrently working benchmark workers.

Use server timestamps / flight-recorder events, not client clocks.

## Acceptance checks

A run is VALID only when:

1. workload_hash matches every other condition;
2. total benchmark jobs are equal across conditions;
3. no benchmark job leaked into a production project;
4. no non-benchmark job is counted;
5. all expected jobs reach terminal state or the run is explicitly INVALID;
6. actual worker-count evidence is present;
7. no manual intervention occurred after t_ready.

A condition is comparable only from VALID runs.

## Decision rule

Produce a result object containing raw runs plus aggregate medians.

BACKLOG-159 can become HECHO only if:

- at least two distinct worker-count conditions have >=3 VALID runs each;
- the lower-worker condition has both lower median throughput and longer median makespan than the higher-worker condition on the identical workload;
- the difference is larger than run-to-run noise or is explicitly reported as inconclusive;
- evidence refs point to durable receipts/flight-recorder rows.

If those checks fail, result is INCONCLUSIVE, not CONFIRMED.

## Relationship to neighboring backlog

- BACKLOG-160 asks whether more workers increase parallelism while READY work exists.
- BACKLOG-163 asks where marginal benefit becomes small.
- This experiment supplies reusable measurements for both, but must not mark either DONE automatically.
- BACKLOG-158 (recommended_workers vs safety cap) should consume the measured curve later, not hardcode it now.

## Expected durable output

A worker implementing this spec should add a deterministic benchmark runner or isolated benchmark schema, run the controlled conditions, preserve receipts, and publish:

- workload_hash;
- condition/run table;
- makespan and throughput per run;
- medians and variance;
- verdict CONFIRMED | INCONCLUSIVE | CONTRADICTED;
- exact evidence refs;
- cleanup/rollback receipt.
