# PROMETEO · DOMAIN FOUNDRY V1

Status: ARMED

## Purpose

Turn the declared Guide Registry into a useful candidate cognitive architecture.

The Foundry does not create permanent chat personalities. It uses universal workers to:
1. audit domain boundaries,
2. design deep Domain Exams,
3. map shared primitives,
4. audit privacy/authority,
5. cross-critique the exam set,
6. synthesize a candidate registry/exam architecture.

Canonical Guides are not auto-mutated by Foundry results.

## Declared Guides

- STRATEGY · Prometeo
- STUDY · Facultad
- PERSONAL
- STUDENTS · Alumnos
- VISUAL
- AUDIO

Only STRATEGY currently has a meaningful CURRENT. The other five are PENDING_SYNTHESIS.

## Work graph

Parallel first wave:
- REGISTRY-AUDIT
- EXAM-STRATEGY
- EXAM-STUDY
- EXAM-PERSONAL
- EXAM-STUDENTS
- EXAM-VISUAL
- EXAM-AUDIO
- SHARED-PRIMITIVES
- AUTHORITY-PRIVACY

Then:
- CROSS-EXAM-CRITIQUE

Then:
- FOUNDRY-SYNTHESIS

11 jobs total.

## Exam design rule

Every Domain Exam blueprint must contain:
- 7 analytic questions
- 1 synthesis question
- question-specific word ranges
- evidence/source requirements
- decision-changing purpose
- falsification condition
- CURRENT fields produced
- re-exam triggers

## Runtime

Reuses Worker Bus V2:
- ENTER wrapper is idempotent
- TAKE V4 owns routing
- PROGRESS uses durable stages
- FAIL_RECOVERABLE / watchdog / generation fencing remain canonical
- SUBMIT V6 commits accepted results
- dependencies unlock only after SUCCESS

## Promotion boundary

Foundry output is candidate architecture.

After completion:
- inspect synthesis
- compare proposed Guide boundaries
- review privacy/authority
- choose what to promote
- create/upgrade actual Domain Exams
- execute selected Domain Exams to produce real DOMAIN_CURRENT versions

No automatic promotion is allowed.
