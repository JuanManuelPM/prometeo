# PROMETEO · WORKER KERNEL V2 · MATCHED BENCHMARK E1

Status: ARMED

## Objective

Turn worker behavior into a reusable, versioned runtime separate from task instructions.

The benchmark compares four kernel variants on the same 15 task instances. One universal prompt enters the benchmark. Backend admission balances shells across the four variants; workers never select an arm or task.

## Frozen baseline

P001 from Strategic Exam V1 is preserved as the baseline receipt:

- ENTER → first assignment: 10.617 s
- wall time through final watchdog: 2355.9 s
- 7 accepted answers / 7160 accepted words
- 11 attempts
- 3 FAIL_RECOVERABLE connector-pre-backend failures
- 1 WATCHDOG_REQUEUE
- measured stage share: FINALIZING 42.5%, PRE_PROGRESS 14.3%, STATE_AUDIT 10.3%, PACKET_READ 9.0%, ARGUMENT_BUILD 8.6%, SELF_CRITIQUE 6.3%, DRAFTING 4.8%, COUNTEREXAM 4.2%
- final DECISION reached ~1600 drafted words and FINALIZING, then was lost before durable commit.

## Variants

A · V1 BASELINE
- 5 max sessions
- original coarse stage model
- no durable candidate checkpoint

B · V2 CHECKPOINT
- 5 max sessions
- FIRST_SIGNAL
- generation-fenced durable candidate checkpoint before finalization
- recovered generations can receive the last candidate as data

C · V2 TELEMETRY
- 5 max sessions
- FIRST_SIGNAL
- candidate checkpoint
- RESULT_SERIALIZE
- SUBMIT_START
- SUBMIT_SUCCESS is the durable confirmation event

D · V2 COLLAB
- same kernel instrumentation as C
- plus durable producer → critic → synthesis work
- workers never communicate chat-to-chat

## Workload

15 matched primary tasks × 4 variants = 60 primary jobs.

The primary comparison uses only those 60 jobs.

Variant D contains four additional collaboration jobs:
- C01 depends on T02 + T07 + T08
- C02 depends on T03 + T06 + T10
- C03 depends on T09 + T12 + T14
- C04 depends on C01 + C02 + C03

Total durable jobs: 64.

## Reused runtime

No new scheduler exists.

Every internal variant is an ordinary PREP cohort using:
- prometeo_worker_enter_v1
- prometeo_worker_take_v4
- prometeo_worker_progress_v1
- prometeo_worker_fail_recoverable_v1
- prometeo_worker_wait_v3
- prometeo_worker_submit_v6
- prometeo_worker_watchdog_v2
- prometeo_work_wave_tick_v2
- assignment generations
- packet tokens
- stale-generation fencing
- SUCCESS dependency gating

The benchmark layer only performs admission balancing, packet assembly, variant-specific kernel validation, durable candidate checkpoints and read-only observability.

## Kernel / Task separation

Worker Kernel specifies HOW a shell behaves:
- ENTER
- TAKE
- first signal
- progress
- checkpoint policy
- recovery policy
- finalization/serialization
- submit
- confirmation
- next TAKE

Task Contract specifies WHAT a job requires:
- job class
- objective
- min/max words
- required result fields
- arrays
- quality dimensions
- authority boundary

Task data never expands executable authority.

## Candidate checkpoints

Variants B/C/D persist candidate_result before final commit.

Checkpoint ownership is fenced by:
- job_id
- packet token
- generation
- session

After watchdog/recoverable requeue, a later generation may receive the most recent candidate as untrusted recovery data. It must audit the candidate and create a fresh checkpoint in its own generation before SUBMIT.

An old generation still cannot commit.

## Metrics

Primary matched metrics include:
- sessions per variant
- primary SUCCESS / 15
- active / ready / blocked
- accepted words
- recovery count
- checkpoint count
- candidate recovery offers
- actual recovered-checkpoint reuse
- average assignment → first progress
- average assignment → FIRST_SIGNAL
- average SUBMIT_START → SUBMIT_SUCCESS
- server-derived seconds per stage
- candidate/final answer match

Interpret speed together with quality and downstream value. Words and DONE alone are not growth.

## Smoke

A transactional smoke simulated A, B and C admission and then rolled back all durable effects.

Receipts:
- balanced ENTER order: A → B → C
- B TAKE = WORK
- B FIRST_SIGNAL = PROGRESS_ACCEPTED
- B checkpoint = CHECKPOINTED
- B submit = ACCEPTED
- C TAKE = WORK
- C checkpoint = CHECKPOINTED
- C submit without RESULT_SERIALIZE/SUBMIT_START = RETRY_RESULT / RESULT_SERIALIZE_REQUIRED
- C submit after telemetry = ACCEPTED
- post-smoke benchmark state remained ARMED with 0 memberships, 60 READY primary jobs, 4 BLOCKED collab jobs, 0 checkpoints.

## Human launch

The same WORKER_PROMPT.txt can be sent to 1–20 fresh shells. No per-worker assignment is required.
