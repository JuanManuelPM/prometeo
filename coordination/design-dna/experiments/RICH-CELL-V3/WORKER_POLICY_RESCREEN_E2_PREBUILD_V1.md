# PROMETEO · WORKER POLICY RE-SCREEN E2 · PREBUILD V1

Status: DESIGN / PREBUILD
Purpose: learn more per human launch than SCREEN-10 E1.

## Why E2 exists

SCREEN-10 E1 was underpowered and transport-limited:
- 60 human attempts
- 24 backend arrivals
- 2-3 workers per arm
- several arms received no real cognitive exposure
- no arm reached the declared promotion threshold

E2 therefore does NOT jump to TOP-3-FULL.

It performs a compact confirmation re-screen.

## Separate the axes

### Transport reliability
Measure separately:
- human attempts
- backend arrivals
- ENTER success
- first TAKE
- first useful submit
- useful lifetime
- last_seen
- expiry
- stop cause

Transport failure is not treatment failure.

### Worker-policy comparison
Once a worker reaches backend, mechanical assignment fills treatment capacity.
For policy comparison, controlled filling/replacement is allowed AFTER every missed/failed arrival is durably recorded.

This differs deliberately from the E1 fixed-human-attempt reliability window.

## E2 policy arms

Use only three arms:

E2-A · GLOBAL_GREEDY_V2
- control
- useful priority remains SOLVE > REVIEW > FRAME
- no sticky affinity

E2-B · COVERAGE_BALANCED_V2
- replacement for seat/home-grid-limited E1 coverage
- claim-level policy prefers the least-progress eligible grid
- no fixed home_grid requirement
- falls back to global useful work
- purpose: test real coverage rather than first-N-seat coverage

E2-C · STICKY_TRIAD_V2
- stable 3-worker crew
- favor same crew handoffs
- fallback only when crew-local useful work is unavailable
- purpose: confirm whether quality/continuity signal persists under equal exposure

Do not include S03 pairs, S07 exemplar, or new reserve strategies in this immediate run.
Do not mix protocol probes into this policy comparison.

## Size

Per arm:
- 10 grids
- 4 matched cells per grid
- 40 fixed cells total
- no CREATE past 4/grid

Across 3 arms:
- 120 benchmark cells total

This preserves evidence from all 10 grids while reducing the E1 frontier by 90%.

## Worker target

Target:
- 3 admitted workers per arm
- 9 admitted workers total

Admission:
- backend mechanically assigns successful arrivals to the least-filled arm
- human launch attempts are counted separately
- continue launching only until all three arms have exactly 3 admitted workers
- pre-backend failures remain durable reliability evidence

No policy conclusion uses human-attempt count as executor exposure.

If a worker enters but never obtains first work:
- classify FIRST_WORK_FAILURE separately
- replacement may fill the policy-capacity slot after the failure is recorded
- the failed shell remains in reliability statistics

## Liveness semantics

Do not use session.status=ACTIVE as liveness.

A worker is recently live only from:
- recent TAKE/claim/submit/wait/last_seen evidence.

Add/verify:
- first_take_at
- first_claim_at
- last_useful_at
- current_lease_expires_at
- stop classification
- useful_lifetime_seconds

Autonomous server reaper:
- expired claims must be reaped without requiring another worker call
- this cleans state but does not pretend to wake a dead chat

## Finish / censoring

Primary finish:
- 40/40 DONE per arm.

Safety exposure cap:
- if an arm exceeds 3 active-worker-hours without reaching 40 DONE, mark FEASIBILITY_FAIL and stop comparison for that arm.

Report:
- raw wall time
- active-worker-seconds / DONE
- DONE / active-worker-hour
- PASS / REVISE / FAIL
- semantic score
- words / active-worker-hour
- phase p50/p90
- expiries
- handoffs
- worker useful lifetime
- grid coverage

## Promotion logic

No scalar winner.

Create a Pareto comparison:
- throughput efficiency
- quality
- revision burden
- liveness robustness
- coordination cost

Possible conclusions:
- control remains best low-overhead default;
- coverage is faster but needs quality guard;
- triad trades some throughput for quality/continuity;
- no policy clears confirmation.

Promotion requires:
- 40/40 DONE or explicitly declared feasibility failure;
- all 10 grids represented;
- no unresolved transport contamination;
- comparable admitted capacity;
- quality evidence;
- normalized exposure metrics.

## Canaries before/alongside E2

### C-S05 PHASE_SPECIALIZATION
Tiny 6-step lifecycle proof:
- two or three fresh workers
- must demonstrate FRAME claim, SOLVE claim, REVIEW claim
- must show spillover behavior
- only then return specialization to a future screen

### C-S06 SELF_COMPARISON
Tiny proof:
- worker produces one same-role result
- next same-role job receives SELF_PRIOR context
- second output accepted
- compare cold-start vs referenced output
- only then test at scale

### C-S09 RULE_FRONT
Tiny matched protocol proof:
- complete at least 5 cells
- verify instruction really appears at front
- compare revision/score against baseline smoke
- only then include in protocol A/B/C

## After E2

If E2 produces a clear Pareto set:
- do a full confirmation with only policies still justified.

Separately:
- run protocol A/B/C with worker policy frozen.
- objective-first remains a viable candidate.
- rule-tail requires confirmation only if there is a strong reason; E1's 13/20 REVISE is a substantial warning.

## Growth path after policy confirmation

Use the best validated policy to test:
1. objective-first / evidence-first protocol variants;
2. parallel Q1-Q5 if SOLVE latency remains dominant;
3. micro-crew + synthesizer if triad continuity is beneficial;
4. review panels only when quality is the active bottleneck.

## E1 output harvest

In parallel with E2, use E1's 178 completed cells as candidate design evidence:
- select high semantic PASS outputs;
- group by domain + task family;
- synthesize with high-intelligence workers;
- adversarially critique;
- emit typed candidate jobs/backlog changes;
- never auto-promote generated text into runtime authority.

This makes benchmark compute contribute directly to Prometeo evolution.
