# PROMETEO · Parallel Cell Experiments V1

Status: DESIGN CANDIDATE FOR NEXT RICH CELL ROUND

## Core separation

Prometeo must evolve two things independently:

1. **Universal Worker / Engine**
   - admission
   - identity
   - leases
   - WAIT/retry
   - submit/next
   - liveness
   - persistence
   - deterministic routing
   - no cognitive experiment semantics

2. **Cell Protocol**
   - how a cell is framed
   - what the five questions ask
   - where instructions appear
   - how solving is structured
   - review/synthesis requirements
   - evaluation rubric

The worker consumes a cell protocol. The worker itself is not the experimental treatment.

## Experimental topology

Run three independent arms concurrently:

- ARM A
- ARM B
- ARM C

Each arm has:
- 10 logical grids
- exactly 100 cells per grid
- exactly 1,000 benchmark cells
- **fixed benchmark frontier: no CREATE beyond 100 during the benchmark**
- workers may move freely between the 10 grids **inside their own arm**
- workers may never cross between A/B/C during a benchmark

Elastic frontier remains a production capability, but is disabled for the bounded comparison.

## Mechanical assignment

Assignment to experimental arm must not be decided by the model.

Backend arrivals are assigned mechanically:

A → B → C → A → B → C ...

Use an atomic admission ordinal / deterministic dispatcher.

Goals:
- arm-size imbalance among successful backend arrivals is at most 1
- no semantic routing bias
- no worker chooses the experiment
- no human routes individual workers

The exact human launch count is a separate experimental parameter.

If preserving the current 20-worker scale **per arm**, the natural cohort is 60 exact human launch attempts, with no replacement during the measurement window. Pre-backend misses remain measured failures; admitted workers are round-robin distributed among A/B/C.

## Matched cells

For causal comparison, corresponding cells should be matched:

A/G01/C001
B/G01/C001
C/G01/C001

share the same:
- domain_goal
- domain_hint / base problem seed
- difficulty family
- evidence availability
- artifact opportunity where applicable

Only the declared cell-protocol treatment differs.

This permits paired comparisons instead of comparing unrelated content.

## Protocol graph

Engine/mechanical blocks should be stable:

ENTER → CLAIM → WAIT/RETRY → PERSIST → NEXT

Cognitive/public blocks are versioned and replaceable:

FRAME
SOLVE
REVIEW
EVALUATE
FRONTIER
PROJECTION

Every arm pins exact versions. Example:

ARM A:
- WORKER_PROTOCOL = W3
- FRAME = F7
- SOLVE = S5
- REVIEW = R3
- EVALUATE = E4

ARM B:
- same worker/engine protocols
- FRAME = F8-front

ARM C:
- same worker/engine protocols
- FRAME = F8-tail

A run must never silently change protocol versions mid-flight.

## What may vary

Change as little as possible per experiment.

Good A/B/C examples:

### Prompt-position experiment
- A: baseline
- B: identical augmentation placed at the beginning
- C: identical augmentation placed at the end

### Framing experiment
- A: current five-question baseline
- B: objective/evidence rubric before question generation
- C: adversarial + synthesis constraints in the framing protocol

### Solve experiment
Keep FRAME identical and vary only SOLVE structure.

Do not change engine mechanics and cognitive treatment in the same comparison unless explicitly testing their interaction.

## Worker experiment is separate

A worker reliability benchmark measures:

human launch attempts
→ backend arrivals
→ admissions
→ first claim
→ useful phases
→ WAIT/rescue
→ last useful event
→ stop cause

Do not hide pre-backend losses with replacement when measuring worker reliability.

For cell-protocol comparisons, successful backend workers are simply universal executors allocated mechanically across arms.

## Primary outcome families

### Admission / worker reliability
- human launch attempts
- backend arrivals
- admission rate
- time to first work
- continuous useful lifetime
- WAIT count
- WAIT→WORK rescue rate
- terminal cause

### Throughput
- DONE cells
- time to 100 / 500 / 1000
- cells per active-worker-hour
- words per active-worker-hour
- phase utilization

### Cognitive production
- framing words
- solving words
- review words
- handoffs
- semantic PASS / REVISE / FAIL
- revision burden
- paired-cell quality deltas

### Quality
- question nonredundancy
- evidence demand
- downstream answer coverage
- contradiction handling
- synthesis quality
- independent reviewer score
- artifact validity

### Collaboration
- framer→solver handoff
- solver→reviewer handoff
- worker diversity per cell
- cross-grid movement inside arm
- idle / starvation periods

## Finish condition

For benchmark mode, an arm is complete at:

**1,000/1,000 DONE**

No new cells are created past 100 in any grid.

This gives an unambiguous percentage and allows:
- first arm to finish
- completion-time comparison
- survival curves
- throughput curves

If arms have unequal admitted worker counts, raw completion time must be reported together with normalized metrics such as active-worker-seconds per completed cell. Do not call a raw speed difference a protocol effect without accounting for executor exposure.

## Observatory requirement

Routine metrics must be materialized/readable continuously, not reconstructed by a Guide each time.

Minimum live views:
- global experiment status
- arm A/B/C status
- per-grid progress
- per-worker liveness
- phase counts
- last event
- words by phase
- handoffs
- semantic outcomes
- admission funnel
- WAIT/rescue
- terminal causes
- active-worker-seconds
- paired-cell comparison

TV and Observatory are projections only.

## Experimental discipline

- exact protocol manifests are public/versioned
- engine version is pinned
- assignment policy is pinned
- no replacement during a declared worker-reliability measurement window
- no cross-arm worker movement
- no elastic growth inside bounded benchmark
- no synthetic data
- mechanical PASS is separate from semantic quality
- preserve all raw events/results so later analysis can recompute conclusions

## Evolution loop

BLOCK VERSION
→ WORKERS
→ RESULTS
→ OBSERVATORY
→ DIAGNOSIS
→ CANDIDATE BLOCK VERSION
→ CANARY
→ A/B/C
→ PROMOTE / REJECT

Prometeo should improve primarily by evolving public protocol blocks over a stable engine, not by repeatedly rebuilding the runtime.

## Long-term direction

Every recurring human bottleneck should become:

1. an observable state,
2. a public protocol,
3. a typed job,
4. eventually executable by universal workers.

The human/Guide role moves upward from manually routing chats toward choosing hypotheses, constraints and promotion decisions.
