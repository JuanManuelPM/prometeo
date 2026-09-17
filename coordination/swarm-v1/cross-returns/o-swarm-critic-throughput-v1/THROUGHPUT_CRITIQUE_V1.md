# Universal Swarm Throughput Critique V1

Status: CANDIDATE_CRITIQUE_ONLY  
Opportunity: `O-SWARM-CRITIC-THROUGHPUT-V1`  
Run: `RUN-SWARM-THROUGHPUT-20260917T0913-sol56`  
Authority: read-only critique + own durable evidence; no Current/Human Accepted/Served promotion.

## Question attacked

Where would a 10/20/50-chat universal-worker swarm still idle, duplicate, or block even though the allocator, stale/retry library, Control Room compiler and durable claim/return protocol exist?

## Evidence inspected

- `coordination/opportunities/UNIVERSAL_COGNITIVE_SWARM_QUEUE_V1.json`
- `coordination/opportunities/claims/**`
- `coordination/opportunities/runs/**`
- `coordination/opportunities/returns/**`
- `coordination/workstreams/chat-native-control-plane-v1/THROUGHPUT_SNAPSHOT_V1.json`
- `coordination/opportunities/returns/O-PROGRESS-METRICS-COMPILER-V1/RUN-O-PROGRESS-METRICS-COMPILER-V1-20260917T0046-SOL56R.json`
- `scripts/swarm-stale-scan.mjs`
- `scripts/universal-worker-allocator.mjs`
- `coordination/swarm-v1/control-room/CANARY_RECEIPT_V1.json`
- `.github/workflows/agent-runtime-v3.yml`
- live create-if-absent claim race observed during this run

## Findings

### T1 — The main bottleneck is now invocation/loop supply, not lack of prepared work

At 09:13 local time the queue still exposed a compatible READY critique lane (`O-SWARM-CRITIC-THROUGHPUT-V1`) with no claim, while several higher-priority lanes had been claimed around 00:41–00:47. This worker could immediately claim useful work. Therefore an idle system in that interval cannot be explained as queue exhaustion.

**Disposition:** ROUTE_CHANGE_REQUIRED. Capacity reporting must separate `prepared useful slots` from `worker invocations actually present`.

### T2 — Stale recovery is semantically implemented but not continuously driven

`O-SWARM-KERNEL-IMPLEMENT-V1` recorded its original last signal at 00:44 and a recovery run only started at 09:06. That is 8h22m after the last signal and 7h52m after the 30-minute recovery time gate. The recovery run proves the recovery protocol can be entered safely, but the delay proves the protocol is not itself an unattended event loop.

`swarm-stale-scan.mjs` is explicitly `READ_ONLY_CANDIDATE_SCAN`: it consumes a caller-supplied subject snapshot and never mutates claims/runs/returns. `universal-worker-allocator.mjs` likewise consumes a caller-supplied snapshot. Neither file discovers the repository frontier by itself or schedules its own next execution.

**Disposition:** ROUTE_CHANGE_REQUIRED. Treat stale/retry logic and stale/retry orchestration as separate capabilities.

### T3 — Metrics architecture exists, but current throughput is not executable/current enough for allocation

`THROUGHPUT_SNAPSHOT_V1.json` was created at 22:36 on 2026-09-16 and reports 7 durable returns, 21 parent-seeded opportunities, 0 automatically generated opportunities, and an automatic-next-wave ratio of 0.0. Later durable return evidence exists, so that snapshot is historical, not a live capacity projection.

The recovered progress-metrics opportunity specifies an exact deterministic compiler target at `scripts/compile-progress-metrics.mjs`, but that executable is absent at this run. Therefore the contract is stronger than the operational measurement surface.

**Disposition:** IMPLEMENTATION_GAP. Do not use the old snapshot as current allocator telemetry.

### T4 — Control Room semantics are proven on fixtures, not on the live repository loop

`CANARY_RECEIPT_V1.json` passes deterministic loader/compiler semantics on a controlled fixture and explicitly says it is not a full live-repository snapshot canary and does not prove Live/allocator/production wiring.

**Disposition:** INTEGRATION_GAP. A live snapshot receipt is required before using Control Room as evidence of real free capacity or stale risk.

### T5 — Exclusive claim collision handling works under real concurrency

This run observed `O-SWARM-CRITIC-PARALLELISM-V1` as absent, then its create-if-absent write lost a race because another worker created the claim. The worker reloaded the path, preserved the winning claim, and moved to the next READY lane, which it claimed successfully.

**Disposition:** PASS_WITH_EVIDENCE for exclusive normal-claim collision safety. This should become a durable metric/event rather than disappearing into chat history.

### T6 — Existing GitHub automation does not close the swarm loop

The inspected workflow set has no `swarm` workflow name. `agent-runtime-v3.yml` runs on relevant pushes or manual dispatch and compiles/tests/publishes the derived Agent Runtime; it does not periodically build a live swarm snapshot, run stale scanning, compile throughput, allocate recovery, or create worker invocations.

**Disposition:** ROUTE_CHANGE_REQUIRED. Agent Runtime publication is not the swarm event loop.

## Concrete throughput model

A useful 50-worker target needs four separately measured quantities:

1. `useful_slots`: READY/derived-READY/recovery-eligible work that is safe for this worker class.
2. `worker_supply`: worker invocations available to claim work now.
3. `claim_to_start_latency`: claim timestamp -> durable STARTED timestamp.
4. `stale_eligibility_to_recovery_latency`: first recovery-eligible timestamp -> recovery STARTED timestamp.

Today, (1) can be derived by existing candidate components, but (2) is not durably instrumented and (4) can be many hours despite a 30-minute eligibility rule. A single scalar “capacity” therefore hides the actual bottleneck.

## Recommended candidate changes

### P1 — Live swarm snapshot compiler

Create `scripts/build-swarm-live-snapshot.mjs` that deterministically scans active queue + claims + recovery claims + runs + returns and emits a pinned read-only snapshot consumable by the allocator, stale scanner, Control Room and metrics compiler. It must expose evidence refs and integrity errors, not inferred success.

Dedup fingerprint seed: `project-prometeo-chat-control|swarm-live-snapshot|queue+claims+runs+returns|deterministic-read-only-v1`.

### P2 — Executable progress/throughput compiler

Implement the already-specified `scripts/compile-progress-metrics.mjs` contract and generate a current report from pinned repository bytes. First acceptance test: the 22:36 historical snapshot must not be returned as current after later material claims/runs/returns exist.

Dedup fingerprint seed: `project-prometeo-chat-control|progress-throughput-compiler|recovered-contract|executable-v1`.

### P3 — Bounded swarm control-loop trigger

Add an isolated candidate trigger that periodically or event-drivably performs only read/derive steps: build live snapshot -> stale scan -> allocator/control-room projection -> persist candidate telemetry/alerts. It must not promote Current/Served and must not overwrite original attempts. Any actual recovery claim remains append-only and authority-checked.

Dedup fingerprint seed: `project-prometeo-chat-control|swarm-control-loop|snapshot-stale-allocator-projection|candidate-v1`.

### P4 — Worker-supply instrumentation

Persist privacy-safe worker launch/availability events so `worker_supply`, human launch actions and useful-result-per-human-intervention become computable without copying prompt text. Until this exists, 50-worker throughput cannot be distinguished from 50 prepared slots with 1 actual worker.

Dedup fingerprint seed: `project-prometeo-chat-control|worker-supply-instrumentation|launch-availability-events|privacy-safe-v1`.

### P5 — Claim-race receipt

Persist a minimal collision receipt when create-if-absent loses a normal claim race and the worker safely re-enters allocation. This turns a real concurrency success/failure signal into measurable evidence.

Dedup fingerprint seed: `project-prometeo-chat-control|claim-race-receipt|create-if-absent-reload|v1`.

## Falsification cases

- F50-A: 50 invocations, >=50 useful slots -> no duplicate normal claim IDs; losers re-enter allocation and useful worker utilization remains measurable.
- F50-B: 50 useful slots, 1 invocation -> report bottleneck `WORKER_SUPPLY`, not `QUEUE_EXHAUSTED`.
- F50-C: stale attempt crosses 30m with no return/new heartbeat -> live snapshot exposes recovery time gate promptly; measured recovery latency starts at eligibility, not at eventual human discovery.
- F50-D: old throughput snapshot exists plus newer durable events -> current compiler rejects/labels old projection as stale.
- F50-E: Control Room fixture passes but live loader cannot reconstruct repo -> status is integration failure/unknown, never synthetic PASS promoted as live health.

## Boundary

This critique does not authorize a production scheduler, automatic ChatGPT/UI chat creation, global queue mutation, promotion, or serving changes. The next step is to turn P1/P2 into executable candidate evidence and use that evidence to decide what form of control-loop/worker-launch adapter is actually available and authorized.
