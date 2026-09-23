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

## Post-Worker-Kernel refinement

Worker Kernel V2 completed 64/64 SUCCESS.

The Foundry adopts the parts that had the strongest operational justification before launch:
- idempotent ENTER,
- FIRST_SIGNAL,
- explicit RESULT_SERIALIZE,
- generation-fenced durable candidate checkpoint,
- SUBMIT_START,
- exact current-generation checkpoint/result match before SUBMIT,
- recovery candidates exposed only as DATA.

Collaboration remains selective: critique and synthesis exist only where the graph justifies them.

## Cognitive breadth contract

Every Foundry job answers three 70–180 word micro-lenses before the integrated long answer:
1. reality/evidence,
2. adversary/alternatives,
3. transfer/falsification.

The long answer keeps its existing task-specific word range. The mini-lenses are not extra jobs and should not duplicate the final answer.

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

Phase 2, automatically after that synthesis:
- SURFACE-STRATEGY
- SURFACE-STUDY
- SURFACE-PERSONAL
- SURFACE-STUDENTS
- SURFACE-VISUAL
- SURFACE-AUDIO
- GUIDE-WORK-BROKER

Final:
- GUIDE-SURFACE-PORTAL-SYNTHESIS

19 jobs total.

Phase 2 reuses the same universal shell pool. No extra human assignment is required.

Each SURFACE job receives a verified repository inventory and classifies existing routes as KEEP / LINK / EMBED / MERGE / SUPERSEDE / ARCHIVE / SHARED_PRIMITIVE. Existing useful pages are preserved by default.

GUIDE-WORK-BROKER designs the missing Guide → shared worker-demand layer: Guides create typed demand, while workers remain one fungible shared pool rather than belonging to a Guide.

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
- FIRST_SIGNAL establishes early durable execution
- checkpoint preserves full candidate result before submit
- FAIL_RECOVERABLE / watchdog / generation fencing remain canonical
- RESULT_SERIALIZE + SUBMIT_START isolate shell-to-commit latency
- SUBMIT V6 commits accepted results
- dependencies unlock only after SUCCESS

## Promotion boundary

Foundry output is candidate architecture.

After completion:
- inspect synthesis,
- compare proposed Guide boundaries,
- review privacy/authority,
- choose what to promote,
- create/upgrade actual Domain Exams,
- execute selected Domain Exams to produce real DOMAIN_CURRENT versions.

No automatic promotion is allowed.
