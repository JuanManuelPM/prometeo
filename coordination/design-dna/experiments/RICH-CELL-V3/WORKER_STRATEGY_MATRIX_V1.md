# PROMETEO · Worker Strategy & Cell Parallelism Matrix V1

Status: DESIGN CANDIDATE FOR RICH-CELL V3+

## 0. Preserve the previous design

This document extends, not replaces:
- universal workers + experimental treatment in cell protocols
- bounded A/B/C arms
- 10 grids x 100 cells per full benchmark arm
- fixed benchmark frontier
- mechanical worker-to-arm assignment
- matched cells across arms
- Observatory as permanent measurement layer
- no cognitive hardcoding in engine

Canonical refs:
- coordination/design-dna/experiments/RICH-CELL-V3/PARALLEL_CELL_EXPERIMENTS_V1.md
- coordination/design-dna/experiments/RICH-CELL-V3/PARALLEL_CELL_EXPERIMENTS_V1.json

## 1. Current cell dependency graph

Rich Cell V2 today is mostly sequential at the cell level:

EMPTY
→ FRAMING
→ FRAMED
→ SOLVING
→ PRODUCED
→ REVIEWING
→ DONE

Hard dependency:
- SOLVE requires durable FRAME.
- REVIEW requires durable SOLUTION.
- DONE requires the required terminal semantics.

Therefore the three top-level phases are currently linear.

Inside each phase, however, there is parallelizable cognitive structure that is not yet exploited by the runtime.

### FRAME internal decomposition
A five-question exam can be decomposed into:
- objective/context framing
- evidence requirements
- adversarial question
- implementation/artifact question
- synthesis question
- redundancy check

These may be generated independently and reconciled before FRAMED.

### SOLVE internal decomposition
The five answers can be produced as independent subresults:
Q1, Q2, Q3, Q4, Q5
then merged by SYNTHESIS.

Possible graph:
FRAME
→ [Q1 || Q2 || Q3 || Q4 || Q5]
→ SYNTHESIS
→ SELF-CHECK
→ PRODUCED

### REVIEW internal decomposition
Review can split into:
- factual/evidence review
- contradiction review
- implementation review
- adversarial review
then aggregate to semantic outcome.

This suggests a future DAG cell model rather than a strictly linear monolith, but V3 experiments should test the value before modifying the engine deeply.

## 2. Worker strategy is a separate experimental axis

The same universal worker can be routed under different collaboration policies.

We want to measure whether workers improve when:
- they repeat the same kind of work,
- they stay with the same grid/context,
- they compare against their prior work,
- they rotate roles,
- they move greedily to any useful task,
- they specialize temporarily,
- they collaborate on parallel subtasks.

The model does NOT choose the policy. The backend pins it mechanically.

## 3. Ten strategy experiments

These are ten candidate arms. Each arm uses the same matched cell set and same engine unless the named policy is the treatment.

### E1 — GLOBAL GREEDY CONTROL
Workers can take any useful cell in the arm.
Priority: SOLVE > REVIEW > FRAME.
Replicates Rich Cell V2 behavior.

Question:
Does unrestricted global movement maximize useful throughput?

### E2 — TWO-PER-GRID THEN FREE
Start with two workers per grid.
When a grid has no useful work, workers join the arm-wide pool.

Question:
Does initial spatial coverage improve parallelism without hurting later cooperation?

### E3 — GRID AFFINITY
Workers stay on one grid while useful work exists there.
They move only on starvation/completion.

Question:
Does context continuity improve quality or speed?

### E4 — PHASE SPECIALIZATION
Workers are mechanically assigned temporary specialities:
FRAMER / SOLVER / REVIEWER.
Assignments are balanced and may rotate on a fixed schedule.

Question:
Does repeated task type create skill/consistency gains?

### E5 — PHASE ROTATION
Every worker follows a deterministic cycle:
FRAME → SOLVE → REVIEW → repeat,
taking the next compatible cell.

Question:
Does forced cognitive variety reduce fatigue or increase integration?

### E6 — SELF-COMPARISON LOOP
A worker receives compact references to its own prior outputs in the same role when producing the next result.
No executable text is taken from runtime data; prior outputs are evidence/context only.

Question:
Can workers improve from their own recent examples?

### E7 — PEER-EXEMPLAR LOOP
Workers receive selected prior high-quality examples from other workers, versioned as context/evidence.

Question:
Does exposure to strong peer work improve subsequent outputs?

### E8 — PARALLEL QUESTION SOLVING
A cell's five questions may be leased independently to multiple workers.
A SYNTHESIZER merges the five answers into one coherent solution.

Question:
Does intra-cell parallelism improve wall-clock time or quality enough to justify extra coordination?

### E9 — PARALLEL REVIEW PANEL
One solution is reviewed by multiple independent reviewers (for example evidence, adversarial, implementation), then aggregated.

Question:
Does review diversity improve semantic reliability more than a single reviewer?

### E10 — STICKY TEAM / MICRO-CREW
A small stable crew collaborates across cells:
one framer, one or more solvers, one reviewer/synthesizer.
Crew remains together for a bounded window.

Question:
Do repeated team interactions create better coordination than fungible global workers?

## 4. Prompt/cell-protocol experiments run orthogonally

Worker strategy experiments and cell-protocol experiments must not be mixed casually.

Cell protocol variants include:
- baseline
- same instruction at beginning
- same instruction at end
- objective-first
- evidence-first
- adversarial-first
- synthesis-first
- artifact-first
- self-check-before-submit
- redundancy-rewrite pass

We can run these as a separate factor after identifying strong worker collaboration policies.

## 5. Recommended experimental program

Do not immediately run 10 full 1,000-cell arms with 20 workers each.

Use a tournament:

### Stage 1 — Screen 10 strategies
- 10 strategy arms in parallel
- matched cells
- fixed short horizon
- enough workers to observe behavior, not to maximize throughput
- no replacement during reliability window
- same engine and cell protocol

Promote only strategies with evidence of value.

### Stage 2 — Top 3 full benchmark
- 3 arms
- 10 grids x 100 = 1,000 cells each
- fixed frontier
- full Observatory
- enough worker exposure for stable comparison

### Stage 3 — Cell protocol A/B/C
Take the best worker collaboration policy and compare three cell protocol variants.

### Stage 4 — Combine only validated improvements
Best worker policy + best cell protocol.
Run confirmation benchmark.

This is multiplicative learning without combinatorial explosion.

## 6. Why not test every combination at once

If we test:
10 worker strategies × 10 cell protocols = 100 arms,
we lose interpretability and need enormous executor capacity.

Instead use sequential factor isolation:
1. worker collaboration policy
2. frame protocol
3. solve protocol
4. review protocol
5. growth/frontier policy

Each stage reduces the search space.

## 7. Required Observatory metrics

Per arm:
- human launch attempts
- backend arrivals
- admitted workers
- active workers
- last_seen distribution
- terminal causes
- cells DONE
- time to milestones
- active-worker-seconds
- phase utilization
- words by phase
- semantic PASS/REVISE/FAIL
- revision burden
- handoffs
- cross-grid moves
- same-role repetition count
- context switches per worker
- same-worker repeated-task delta
- self-comparison effect
- peer-exemplar effect
- parallel subtask fanout
- synthesis latency
- review disagreement
- quality normalized by worker exposure

Per worker:
- role sequence
- grid sequence
- cell sequence
- output quality trajectory
- latency trajectory
- repeated-role improvement/decline
- number of context switches
- WAIT/rescue events
- stop cause

## 8. Key hypotheses

H1: repeated role execution may improve consistency and speed.
H2: excessive repetition may degrade novelty/quality.
H3: grid affinity may improve contextual coherence.
H4: global greedy movement may maximize throughput but reduce coverage.
H5: initial two-per-grid seeding may improve spatial parallelism.
H6: self-comparison may create measurable within-worker learning.
H7: peer exemplars may transfer useful patterns between workers.
H8: parallel question solving may reduce wall-clock time but increase synthesis cost.
H9: multi-reviewer panels may improve reliability but cost throughput.
H10: stable micro-crews may develop coordination advantages.

## 9. Non-negotiable separation

ENGINE:
identity, admission, leases, WAIT, persistence, routing primitives.

STRATEGY POLICY:
which compatible work a worker may receive.

CELL PROTOCOL:
what cognitive work the cell asks for.

EVALUATION:
how outputs are scored.

OBSERVATORY:
how evidence is measured.

TV:
how real state is projected.

A result cannot justify changing all five layers at once.

## 10. Long-term target

Prometeo should become a system where:
- universal workers are interchangeable executors,
- cell protocols are versioned cognitive programs,
- collaboration policies are declarative,
- experiments compare policies/protocols mechanically,
- Observatory identifies winners and failure modes,
- improvements are promoted only after bounded evidence.

This is not literal exponential compute growth. It is parallel, factorial learning with controlled search-space reduction.
