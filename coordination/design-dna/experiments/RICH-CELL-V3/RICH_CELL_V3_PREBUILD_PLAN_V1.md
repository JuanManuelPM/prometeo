# PROMETEO · RICH CELL V3 · PREBUILD PLAN V1

Status: PRE-RESULT DESIGN — frozen before C0 terminal analysis.

## Purpose

Have the next experimental generation structurally ready before PROMETEO-RICH-CELL-V2-C0 finishes or all current workers stop.

This plan preserves:
- Universal workers.
- Cognitive experiment lives in cell protocol / collaboration policy.
- Engine stays stable unless C0 proves a mechanical defect.
- Worker reliability and cell quality are separate experimental problems.
- Bounded benchmarks have fixed frontiers.
- Assignment is mechanical; the model never chooses its arm.
- Observatory is permanent and continuously computed.
- No human routing between workers.

## Layer model

ENGINE
- identity
- admission
- leases
- WAIT/retry
- persistence
- typed submit/next
- deterministic arm routing

WORKER COLLABORATION POLICY
- which compatible work a worker may receive
- whether workers are sticky/free/specialized/paired/triads
- whether cell subtasks may fan out

CELL PROTOCOL
- FRAME grammar
- question count / question types
- instruction placement
- SOLVE structure
- REVIEW structure
- synthesis / self-check rules

EVALUATOR
- semantic score
- revision burden
- quality dimensions

OBSERVATORY
- admission, liveness, throughput, quality, timing and comparison metrics

TV
- read-only projection only

## Current C0 baseline

The current baseline is the global greedy Rich Cell V2 policy:
SOLVE > REVIEW > FRAME > CREATE
workers can move globally across grids.

C0 is preserved as baseline evidence. V3 experiments are new batches only.

## Experimental program

### Stage 0 — C0 terminal capture
When C0 reaches the declared observation stop:
- freeze a final snapshot
- preserve all worker trajectories
- preserve cell outputs/reviews
- classify every stop/death
- identify pre-backend misses separately
- calculate active-worker-seconds and phase timing
- do not mutate C0

### Stage 1 — SCREEN-10
Run ten short matched experiments in parallel.

Topology per arm:
- 10 logical grids
- 12 benchmark cells per grid
- 120 fixed cells total
- no CREATE past cell 12 in any grid
- matched cell seeds across all arms
- same engine version
- same evaluator version

Default executor target:
- 6 admitted universal workers per arm
- 60 admitted workers total
- human launch count is not the quality metric; every pre-backend miss is recorded separately
- assignment to arms is mechanical and balance-seeking/deterministic
- no model chooses arm

SCREEN-10 arms:

S01 CONTROL_GLOBAL_GREEDY
Baseline Rich Cell V2 behavior inside the arm.

S02 TWO_PER_GRID_THEN_FREE
Seed coverage mechanically; no grid may initially receive more than two workers while another eligible grid has zero. Once local work is unavailable, workers join the arm-wide pool.

S03 STICKY_PAIRS
Three stable crews of two. Pair stays together for a bounded work window; work handoffs favor the same pair.

S04 STICKY_TRIADS
Two stable crews of three. Triad cooperates through frame/solve/review handoffs.

S05 PHASE_SPECIALIZATION
Two framers, two solvers, two reviewers. Same-role repetition is intentional and measured.

S06 SELF_COMPARISON
Global greedy routing, but each worker receives compact typed references to its own previous same-role outputs/scores as non-executable context.

S07 PEER_EXEMPLAR
Global greedy routing, but worker receives selected high-quality prior examples from other workers as non-executable evidence/context.

S08 FRAME_OBJECTIVE_FIRST
Worker policy remains global greedy. Only FRAME protocol changes: objective, evidence standard and success criterion must be explicitly formed before the five questions.

S09 FRAME_RULE_FRONT
Same augmentation as S10, placed before the base framing instructions.

S10 FRAME_RULE_TAIL
Same augmentation as S09, placed after the base framing instructions.

Reserve strategies, already specified but not in the first screen:
- GRID_AFFINITY
- PHASE_ROTATION
- PARALLEL_Q1_Q5
- PARALLEL_REVIEW_PANEL
- MICRO_CREW_WITH_SYNTHESIZER

### Stage 2 — TOP-3 FULL
Promote three strategies/protocols based on predeclared evidence criteria.

Per promoted arm:
- 10 grids
- 100 cells per grid
- 1000 fixed benchmark cells
- no elastic CREATE
- worker movement only inside arm
- matched cells across A/B/C
- fixed engine/evaluator versions

If preserving the current large-scale regime:
- target 20 admitted workers per arm
- 60 admitted workers total
- report raw finish time AND exposure-normalized results

Finish condition:
1000/1000 DONE.

### Stage 3 — CELL PROTOCOL A/B/C
Hold the best worker-collaboration policy fixed.
Change only the cell protocol.

Candidate comparisons:
1. baseline vs instruction-at-front vs instruction-at-tail
2. baseline vs objective-first vs evidence-first
3. baseline vs adversarial-first vs synthesis-first
4. five-question baseline vs 4+1 adversarial vs 3+2 synthesis/implementation
5. solve-all-at-once vs plan-first vs self-critique-before-submit

### Stage 4 — PARALLEL CELL DAG
Only if C0/SCREEN-10 suggests phase latency is a real bottleneck.

Candidate DAG:
FRAME
→ Q1 || Q2 || Q3 || Q4 || Q5
→ SYNTHESIS
→ SELF-CHECK
→ REVIEW

Alternative review DAG:
SOLUTION
→ evidence-review || contradiction-review || implementation-review || adversarial-review
→ REVIEW_AGGREGATE
→ DONE

This is not adopted until a bounded experiment shows benefit.

## Matched-cell rule

Cell k across arms shares:
- same domain_goal
- same domain_hint
- same difficulty family
- same evidence availability
- same artifact opportunity
- same base seed / task identity

Only declared treatment differs.

## Worker reliability benchmark remains separate

Questions:
- Of N human launches, how many reach backend?
- how many are admitted?
- how many get first work?
- how long do they remain useful?
- how often do WAIT→WORK rescues occur?
- exact terminal cause?

Do not hide admission failures with replacements in a worker-reliability run.

In cell-quality experiments, equal executor exposure matters; controlled filling/replacement may be allowed after admission failures are durably recorded.

## Analysis dimensions

Throughput:
- DONE/hour
- time to 25%, 50%, 75%, 100%
- active-worker-seconds/cell
- phase utilization

Quality:
- semantic score
- PASS/REVISE/FAIL
- revision burden
- paired-cell deltas
- artifact validity
- question nonredundancy
- evidence demand
- synthesis quality

Worker trajectory:
- repeated-role count
- quality trend under repetition
- latency trend
- context switches
- grid switches
- self-comparison delta
- exemplar delta
- WAIT/rescue
- stop cause

Collaboration:
- handoffs
- same-crew continuity
- reviewer disagreement
- synthesis cost
- parallel fanout
- idle/starvation

## Promotion rule

No strategy is promoted on raw speed alone.

Promotion requires considering:
- throughput
- worker exposure
- semantic quality
- revision burden
- liveness
- coordination cost
- reproducibility
- failure modes

## Human interaction target

Between C0 and the next launch, the human should not act as message bus.

Expected next human gesture only after:
- C0 analysis complete
- SCREEN-10 manifest refined
- runtime substrate isolated in V3 namespace
- Observatory projections ready
- smokes pass
- batch ARMED
- exact launch count and trusted prompt prepared

Then the human only opens the requested fresh chats and pastes one identical trusted launch prompt.
