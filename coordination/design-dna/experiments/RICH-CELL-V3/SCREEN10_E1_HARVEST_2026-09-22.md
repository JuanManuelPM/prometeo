# PROMETEO · SCREEN-10 E1 HARVEST · 2026-09-22

Status: OBSERVATIONALLY QUIESCENT / PARTIAL EVIDENCE
Experiment: PROMETEO-SCREEN10-V3-E1
Launch batch: PROMETEO-UNIVERSAL-V1-SCREEN10-E1

## Executive state

SCREEN-10 E1 did not finish its declared 1,200-cell frontier.

At the harvest cut:
- backend sessions/admitted workers: 24 / 24
- human attempt target: 60
- total DONE: 178 / 1,200
- last canonical activity: 2026-09-23 00:29:45 UTC
- current observation time was ~2026-09-23 01:36 UTC
- no worker had been seen for at least ~67 minutes; several had not been seen for ~138 minutes
- session status rows still said ACTIVE and terminal_at remained NULL, so session state is not liveness
- 16 claims were durably EXPIRED
- 10 S04 claims still had state ACTIVE even though all leases were already expired, showing that cleanup/reaping is not autonomous when no worker path calls it

The run is therefore analytically useful but not terminally complete. Do not mutate it merely to make the dashboard say DONE.

## Promotion gate

The predeclared preliminary promotion requirement for SCREEN-10 was:
- integrity;
- >= 96 / 120 DONE;
- evidence from all 10 grids unless durable terminal/no-rescue;
- quality + active-worker-second interpretation.

No arm reached 96 / 120 DONE.

Therefore:
- no worker-policy arm qualifies for TOP-3-FULL promotion from E1;
- no protocol arm qualifies as a validated winner;
- Stage 2 TOP-3-FULL should NOT launch from E1 as if screening had completed.

## Worker-policy lane S01-S07

### S01 GLOBAL_GREEDY
- admitted workers: 3
- DONE: 22
- PASS: 22 / 22
- semantic score: 93.86
- active worker seconds: 3,888.42
- seconds / DONE: 176.75
- DONE / active-worker-hour: 20.37
- interpretation: valid control evidence; efficient normalized throughput and clean semantic outcome.

Disposition: KEEP AS CONTROL.

### S02 COVERAGE_THEN_FREE
- admitted workers: 3
- DONE: 15
- PASS: 13
- REVISE: 2
- semantic score: 91.93
- active worker seconds: 2,587.03
- seconds / DONE: 172.47
- DONE / active-worker-hour: 20.87
- interpretation: raw DONE was lower than S01/S03/S04, but normalized throughput was the highest among producing S01-S07 arms. Quality/revision burden was worse than S01/S03/S04. E1 implementation with only 3 workers covered only the first home-grid seats and did not realize the intended broad 10-grid coverage.

Disposition: KEEP, BUT MODIFY COVERAGE POLICY FOR E2 so coverage is claim-level/grid-balance rather than seat-limited home-grid seeding.

### S03 STICKY_PAIRS
- admitted workers: 3
- DONE: 34
- PASS: 33
- REVISE: 1
- semantic score: 94.47
- active worker seconds: 7,263.55
- seconds / DONE: 213.63
- DONE / active-worker-hour: 16.85
- interpretation: raw production looked strong, but exposure-normalized throughput was below S01/S02 and below triads; quality was strong but not better than S04.

Disposition: DEPRIORITIZE FROM IMMEDIATE E2; retain as evidence, not rejected forever.

### S04 STICKY_TRIADS
- admitted workers: 3
- DONE: 54
- PASS: 53
- REVISE: 1
- semantic score: 95.09
- active worker seconds: 10,453.87
- seconds / DONE: 193.59
- DONE / active-worker-hour: 18.60
- interpretation: largest raw DONE and strongest average semantic score among producing S01-S07, with 98.15% PASS. However raw lead is partly exposure; normalized throughput does not exceed S01/S02. E1 suggests a possible quality/continuity benefit rather than a simple throughput win.

Disposition: KEEP AS PRIMARY COLLABORATION CANDIDATE FOR E2.

### S05 PHASE_SPECIALIZATION
- admitted workers: 2
- claims: 0
- words: 0
- DONE: 0
- each worker last_seen == first_seen
- interpretation: this is NOT evidence that phase specialization is bad. The treatment never actually ran.

Candidate hypotheses:
- shell stopped after ENTER before TAKE;
- prompt/tool transport failed after admission;
- role assignment/eligibility prevented first work;
- worker did not continue loop;
- less likely: policy primitive defect.

Disposition: INSUFFICIENT. Run a tiny targeted policy canary before any large comparison.

### S06 SELF_COMPARISON
- admitted workers: 2
- claims: 0
- words: 0
- DONE: 0
- each worker last_seen == first_seen
- interpretation: same as S05. No cognitive treatment exposure occurred.

Disposition: INSUFFICIENT. Run targeted cold-start/second-output canary.

### S07 PEER_EXEMPLAR
- admitted workers: 2
- DONE: 18
- PASS: 18 / 18
- semantic score: 94.78
- active worker seconds: 6,159.60
- seconds / DONE: 342.20
- DONE / active-worker-hour: 10.52
- interpretation: good semantic outcome but much lower normalized throughput. Useful as later quality/context research, not immediate throughput candidate.

Disposition: DEPRIORITIZE FROM E2; preserve for later context-policy round.

## Protocol-probe lane S08-S10

These are not ranked causally against S01-S07.

### S08 OBJECTIVE_FIRST
- 15 DONE
- 15 PASS
- score 94.93
- 9 expiries
- solve average ~46.68 sec
- interpretation: promising quality signal, but liveness/expiry contamination is substantial.

Disposition: KEEP AS LATER PROTOCOL CANDIDATE, not worker-policy E2.

### S09 RULE_FRONT
- only 1 accepted FRAME
- 0 DONE
- 634 words
- interpretation: not enough treatment exposure to interpret.

Disposition: INSUFFICIENT; targeted canary required.

### S10 RULE_TAIL
- 20 DONE
- 7 PASS
- 13 REVISE
- 0 FAIL
- score 91.35
- PASS rate 35%
- interpretation: strong warning that tail placement may increase revision burden or reduce compliance, but this is a probe with limited executor exposure.

Disposition: CANDIDATE REJECT / TARGETED CONFIRMATION. Do not promote.

## Core E1 learnings

1. Human-launch reliability and cognitive-treatment comparison were too entangled.
2. 60 human attempts produced only 24 backend arrivals, leaving 2-3 workers per arm instead of the nominal 6.
3. Because arm assignment happened after admission, pre-backend losses did not cross-contaminate treatment semantics, but they severely underpowered several arms.
4. Session rows are durable membership, not liveness.
5. The worker shell behaves like a finite burst, not a guaranteed resident process.
6. Claim reaping is not autonomous enough: expired S04 leases remain ACTIVE when no worker path runs.
7. Raw DONE can reverse interpretation after exposure normalization.
8. S04's strongest signal is quality/continuity, not unequivocal speed.
9. S02's strongest signal is normalized throughput with a quality cost.
10. S05/S06 are transport/non-execution failures, not policy failures.
11. S10 has a high revision-burden warning.
12. E1 does not justify TOP-3-FULL.

## Apply E1 outputs to Prometeo itself

The 178 DONE cells are not just benchmark counters. They contain candidate work about:
- routing;
- liveness;
- experiments;
- protocols;
- observability;
- trust;
- Guide replacement;
- collaboration;
- evaluation;
- evolution.

Next analysis should harvest the highest-quality PASS results by domain/task family into:
1. evidence bundles;
2. high-intelligence synthesis jobs;
3. adversarial critique jobs;
4. candidate design notes/backlog;
5. only then promotion/integration.

Do not let 178 completed cells become dead benchmark artifacts.

## Remaining prebuilt hypotheses

Still valuable after E1:
- GRID_AFFINITY: untested; useful as later context-continuity candidate.
- PHASE_ROTATION: defer until specialization canary works.
- PARALLEL_Q1_Q5: increasingly relevant because SOLVE remains the largest phase-time component in producing arms.
- PARALLEL_REVIEW_PANEL: quality/reliability experiment, not next throughput screen.
- MICRO_CREW_WITH_SYNTHESIZER: supported conceptually by triad quality signal, but should follow E2 confirmation.
- objective-first protocol: worth later A/B/C.
- rule-front: insufficient.
- rule-tail: warning/candidate reject.

## Immediate program

1. Preserve E1 rows/results read-only.
2. Treat E1 as observationally quiescent, not completed.
3. Run targeted canaries for S05, S06, S09.
4. Run E2 worker-policy re-screen with fewer arms and controlled admitted exposure.
5. Harvest E1 cognitive outputs into real Prometeo design work in parallel.
6. Only after E2 promotion gates pass, run TOP-3/FULL or a reduced full confirmation.
