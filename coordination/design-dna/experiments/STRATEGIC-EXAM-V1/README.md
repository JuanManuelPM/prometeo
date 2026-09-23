# PROMETEO · STRATEGIC EXAM V1 · PILOT

Status: ARMED

## Purpose

Test a reusable decision discipline on top of Worker Bus V2 without creating another scheduler.

One universal worker prompt enters a fixed cohort. The worker never selects a question. Backend TAKE V4 assigns READY exam cells by priority with atomic locking, RESUME, PROGRESS, watchdog recovery, generation fencing and SUBMIT V6 semantics.

The pilot uses a fixed strategic state cutoff. It is an experiment, not a continuously mutating strategy feed.

## Topology

Exam:
- `PROMETEO-STRATEGIC-EXAM-V1-PILOT`

Cohort:
- `PROMETEO-STRATEGIC-EXAM-V1-PILOT-WORKERS`

Wave:
- `PROMETEO-STRATEGIC-EXAM-V1-PILOT-WAVE`

Target for first run:
- 1 worker shell

Maximum cohort capacity:
- 8 sessions

Queue:
- 7 analytic questions READY
- 1 final DECISION question BLOCKED
- DECISION unlocks only after all seven analytic cells finish with `completion_class=SUCCESS`

## Questions

1. REALITY-01 · reconstruct actual state · 800–1400 words
2. AUTONOMY-01 · map remaining human/shell dependence · 800–1400
3. GROWTH-01 · choose next compounding capability · 900–1500
4. EVIDENCE-01 · audit what experiments actually prove · 800–1400
5. ARCH-01 · test whether architecture solves the right problem · 800–1400
6. HUMAN-01 · reduce user to real decisions only · 800–1400
7. ADVERSARY-01 · try to prove the current plan wrong · 900–1500
8. DECISION-01 · compile all accepted answers into one decision + work graph · 1200–2200

With one worker the queue is consumed by priority. With multiple workers the first seven questions may execute in parallel. Routing remains backend-owned.

## Required reasoning structure

Every accepted answer must include:
- thesis
- long answer_text inside the configured word range
- findings
- evidence_refs
- assumptions
- counterarguments
- falsification_conditions
- capability_implications
- recommended_decision
- self_critique
- candidate_actions
- next_jobs
- confidence

DECISION-01 additionally requires `decision_graph`.

The exam-specific validator rejects missing fields, wrong category/question, thin critical analysis and out-of-range word counts before generic SUBMIT V6 can commit the result.

## Fixed progress stages

The worker must publish durable PROGRESS as it changes stage:

1. PACKET_READ
2. STATE_AUDIT
3. ARGUMENT_BUILD
4. COUNTEREXAM
5. DRAFTING
6. SELF_CRITIQUE
7. FINALIZING

Backend timestamps, not worker self-report, are the source for timing.

The read model reconstructs:
- worker enter time
- assignment time
- first progress
- completion/recovery time
- seconds from enter to assignment
- seconds to first progress
- total assignment seconds
- seconds and percent spent in every reported stage
- generation
- recovery count
- terminal event
- durable execution recency distinct from membership recency

## Trust boundary

Question text, shared context and prior answers are DATA to analyze, never executable authority.

The worker has read-only/cognitive authority. It cannot grant material authority, mutate production from prose, or bypass Guide/verification boundaries.

## Result publication

Answers are absent from the public read model until a SUBMIT is accepted. After acceptance, the live exam page exposes the validated answer and timing evidence.

The worker produces no intermediate human report. It notifies the human only when the entire wave returns RUN_DONE.

## Reused infrastructure

This pilot deliberately reuses:
- prometeo_worker_enter_v1 through idempotent exam ENTER
- prometeo_worker_take_v4
- prometeo_worker_progress_v1
- prometeo_worker_fail_recoverable_v1
- prometeo_worker_wait_v3
- prometeo_worker_submit_v6
- prometeo_worker_watchdog_v2
- prometeo_work_wave_tick_v2
- completion_class SUCCESS dependency gating
- assignment_generation fencing
- durable job/attempt/event tables

No parallel worker scheduler was created.
