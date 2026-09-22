# Prometeo Design DNA v1

Status: **ACTIVE BINDING METHOD GUARD**  
Owner: `chat-object-prometeo-chat-control-main`  
Scope: architecture, worker orchestration, Guide coordination, recovery/reincarnation, evidence/evaluation and Live/TV coupling.

## 0. Why this exists

Prometeo repeatedly improves until a later iteration adds enough coordination machinery that workers spend more effort operating Prometeo than doing useful work. The human then notices the regression, points back to an older simpler experiment, and the system rediscovers principles it had already learned.

This file exists to stop that amnesia.

It is not a frozen architecture and not a transcript summary. It preserves **design judgment**: what has worked, what has failed, how to reason about a new failure, what evidence is required to challenge an existing rule, and what must survive a rewrite.

The goal is not to preserve one chat's personality. The goal is to preserve the transferable parts of expert judgment:

- causal distinctions;
- invariants;
- counterexamples;
- failure patterns;
- evidence standards;
- baseline discipline;
- negative knowledge;
- diagnostic questions;
- promotion/rollback logic.

A future Guide is allowed to disagree with this DNA. It is not allowed to forget it silently.

## 1. Core thesis

**Prometeo may become complex internally while the worker interface becomes simpler.**

The preferred worker loop is conceptually:

```
ENTER
  -> WORK
  -> SUBMIT_AND_NEXT
  -> WORK
  -> SUBMIT_AND_NEXT
  -> ...
  -> DONE / WAIT
```

Claims, leases, routing, stale detection, rescue, evidence, scheduling and durable recovery may all exist. Their existence does not imply every worker should reason about them.

A sophisticated operating system should remove coordination burden from applications. Prometeo should do the same for LLM workers.

## 2. The historical lesson we must not lose

Several iterations showed a recurring contrast.

Older pool-style runs were operationally simple: tasks existed, workers entered, completed one item, published it and immediately took another. Workers could chain many tasks. Later architectures added legitimate capabilities—identity, claims, packets, leases, checkpoints, recovery, richer routing—but also added more points where a worker could fail before reaching real work or between one task and the next.

The important diagnostic distinction is:

**If a worker performs well after reaching WORK, but workers frequently fail to reach or continue WORK, the primary suspect is orchestration—not cognition.**

Do not answer an admission/continuation failure by giving the model a more elaborate explanation of Prometeo.

The historic `POOL-8-100-01` and `GRID-5-100-01` figures currently survive as project-history reconstruction and are indexed in GOLDENS with an explicit evidence ceiling until exact durable receipts are recovered. Modern CATLAB evidence is durable and must be used alongside those historical candidates.

## 3. Architecture doctrine

### 3.1 Worker cognition versus runtime responsibility

Ask of every new responsibility:

> Does the LLM need to know this to solve the task, or can Prometeo enforce it below the interface?

Default answer: Prometeo.

Worker context should contain task intent, acceptance criteria, necessary source evidence, scoped authority and the minimum operational handles required to return work.

### 3.2 Completion continuity

The transition after successful work is a hot path. Avoid:

```
finish A
-> publish
-> become idle
-> rediscover runtime
-> reclaim identity
-> ask for work
-> discover B
```

Prefer:

```
submit A
-> runtime atomically accepts A
-> records evidence
-> renews/reconciles ownership
-> returns B
```

This is the reason `SUBMIT_AND_NEXT` is a protected design invariant.

### 3.3 Residency

A worker incarnation ENTERs once, then performs useful sequential work while context remains healthy and authority permits. Re-bootstrap is for incarnation/recovery boundaries, not an ordinary per-task ritual.

### 3.4 Fungibility and durable slots

Separate:

- logical worker slot / role;
- incarnation ID;
- concrete chat.

A chat may die. The logical slot and its durable task lineage survive. This allows replacement without pretending the new chat is literally the old process.

### 3.5 Recovery

Recovery must be enforceable by durable runtime:

- lease ownership;
- expiration;
- rescue eligibility;
- stale-result handling;
- exactly-once or explicitly reconciled completion semantics.

A worker can report evidence. It cannot be the only authority deciding whether its stale result is accepted.

## 4. Guide doctrine

A Guide is strategic/control-plane cognition, not a per-task scheduler.

Guide responsibilities include:

- reconciling current authority and evidence;
- receiving and persisting human direction;
- choosing experiments;
- identifying systemic bottlenecks;
- challenging architecture;
- defining preservation contracts;
- promoting/rejecting lessons based on evidence;
- coordinating distinct owned surfaces.

A Guide must stay out of the ordinary worker hot path. If Worker 7 needs a Guide to get Task 38, the runtime is not independent enough.

Guide Mesh, when available, is a coordination/memory/claim plane for Guides. It must not become another scheduler that every worker depends upon.

## 5. Reincarnation doctrine

Reincarnation evolved through several levels:

1. **Structural Wake** — recover identity/state.
2. **Authority Wake** — distinguish current authority from historical decoys.
3. **Cognitive Wake** — recover rationale, negative knowledge and open questions.
4. **Cooperative Reincarnation** — multiple concurrent Guides share durable intent/claims without human transport.

The final design principle is stronger than "chat B remembers chat A":

> No chat should need to remember the previous chat.

Fresh agents reconstruct the smallest sufficient durable state for their role. Important capabilities must survive a fresh-agent test.

## 6. Evidence doctrine

Never collapse:

`IMPLEMENTED -> DONE -> PASS/VERIFIED -> PROMOTED -> CURRENT -> SERVED`

A vivid demo, a worker saying "done", a green syntax test, a committed spec or a Live animation is not sufficient promotion evidence.

Producer and evaluator should be separable when quality is not mechanically guaranteed.

Every autonomy experiment records human intervention. Manual routing, recap, merging or rescue is not invisible assistance; it is part of the measured result.

## 7. Live / TV doctrine

TV is a microscope, not the laboratory notebook.

It may show:

- grids;
- workers;
- progress cells;
- death/reincarnation;
- current activity;
- compact counts.

Its data must be derived from durable events/projections. Turning TV off cannot alter scheduling, claims, recovery or truth. If the display disagrees with canonical evidence, fix the projection.

## 8. How to diagnose a failure

Before designing a new subsystem:

1. Identify the exact failed transition.
2. Ask whether useful WORK succeeded once reached.
3. Compare with the last known good/simple baseline.
4. Separate cognition failure from orchestration failure.
5. Separate platform/tool/rate-limit failure from Prometeo protocol failure.
6. Try removing/fusing/hiding steps before adding one.
7. Ask whether the worker actually needs to know the failing mechanism.
8. Reproduce with easy objectively evaluable tasks.
9. Hold task/model/evaluator/concurrency constant when comparing orchestration.
10. Only then design a new mechanism.

### Three mandatory questions

- **Can this be solved by removing something instead of adding something?**
- **Are we making Prometeo smarter, or merely forcing each worker to understand more Prometeo?**
- **What known-good behavior are we risking?**

## 9. Experiment doctrine

A useful orchestration experiment needs a control.

Preferred modern comparison:

- **A — simple baseline:** reconstruct the minimal resident pool semantics;
- **B — current runtime:** frozen existing behavior;
- **C — candidate:** modern durability/recovery hidden behind minimal ABI.

Same task difficulty distribution, model/configuration, concurrency and evaluator. Only orchestration should differ materially.

Do not wait calendar days for sequential phases that can run as compressed epochs. "Day" is not a scientific unit; an independently versioned run/epoch is.

The permanent full candidate is `GRID-10X100X2-V1` in REGRESSION_HARNESS_V1.json:

- 10 independent grids;
- 100 tasks/grid;
- 2 resident workers/grid;
- 20 workers total;
- overflow worker must receive NO_WORK;
- controlled task-complexity ladder;
- clean baseline;
- repeatability;
- fatigue;
- forced death/rescue;
- reincarnation;
- concurrency;
- blind taskset.

## 10. What to measure

Do not reduce a run to one score.

At minimum preserve:

- completion;
- independently evaluated PASS;
- false-DONE;
- duplicates accepted;
- tasks lost;
- cross-grid contamination;
- submit->next latency P50/P90;
- productive task streak;
- worker/incarnation death point;
- first-versus-last-quartile degradation;
- rescue success;
- reincarnation continuity;
- human interventions;
- failure class.

Averages alone can hide a destroyed grid. Preserve per-grid/per-worker distributions.

## 11. Learning versus manual repair

If the human or Guide observes a failure and patches the runtime, Prometeo did not autonomously "learn" merely because the next run improves.

Record the causal chain:

`OBSERVATION -> CAUSE HYPOTHESIS -> CHANGE -> VERSION -> COMPARABLE TEST -> RESULT`

Only then may a method lesson be promoted.

## 12. Preservation contract

Before a material architecture/runtime change, instantiate the machine-readable Preservation Contract.

It must say:

- requested delta;
- evidence for the problem;
- invariants touched;
- relevant failure vaccines;
- baseline;
- must-preserve behaviors;
- forbidden regressions;
- test/control;
- promotion gate;
- rollback;
- truth boundary.

A future Guide may improve this DNA only through the same discipline.

## 13. Goldens and anti-Goldens

A Golden is not an eternal implementation. It is a protected empirical control.

An anti-Golden is a failure pattern that looked attractive enough to recur.

Never delete old lineage when a Golden is superseded. Record:

`old rule -> challenge -> experiment -> new rule`

This preserves why Prometeo changed its mind.

## 14. Failure vaccines

Load FAILURE_VACCINES_V1.json before modifying any implicated mechanism. Vaccines are warning patterns, not absolute bans.

If a proposal resembles a vaccine, the default response is not "forbidden"; it is:

1. name the resemblance;
2. isolate the proposal;
3. define why this case may differ;
4. benchmark it;
5. promote only on evidence.

## 15. Regression harness

The short regression harness should become routine for orchestration changes. It explicitly checks:

- chaining;
- overflow;
- duplicate submission;
- stale lease;
- rescue;
- reincarnation;
- scope isolation;
- evaluator separation;
- TV independence;
- zero human routing.

Until executable wiring and receipts exist, the harness is a binding **spec**, not a claimed operational capability.

## 16. Authority and challenge

Order for method decisions:

1. new explicit human directive;
2. exact current authority/state/evidence;
3. binding Constitution + current mission;
4. this Design DNA and active invariants;
5. verified Goldens/experiments;
6. candidate historical evidence;
7. historical docs/speculation.

New human direction may override this DNA. The change must still be recorded so successors know a rule was intentionally changed rather than forgotten.

## 17. Anti-bloat rule

This file must not grow into a transcript dump.

Maintain three layers:

- **Kernel / invariants:** small, machine-readable, routinely loaded.
- **Canon / this document + vaccines:** reasoning and diagnostic doctrine.
- **Evidence archive / Goldens and receipts:** detailed proof.

Move detailed historical data downward; keep the high-level criterion compact.

## 18. Permanent improvement loop

```
Guide notices problem
  -> read current state + Design DNA
  -> load relevant vaccine + Golden
  -> declare Preservation Contract
  -> isolate candidate
  -> run control/regression
  -> worse? reject and record
  -> better? reproduce independently
  -> promote through correct authority
  -> update Design DNA/Golden/negative knowledge if lesson changed
```

The critical final step is **write the lesson back**.

Prometeo should not merely improve its runtime. It should improve the durable rules by which future Guides are allowed to improve the runtime.

## 19. What this DNA is trying to preserve in one sentence

**Keep the intelligence and safety inside Prometeo; keep the worker's path to useful work as short, resident, recoverable and boring as possible.**
