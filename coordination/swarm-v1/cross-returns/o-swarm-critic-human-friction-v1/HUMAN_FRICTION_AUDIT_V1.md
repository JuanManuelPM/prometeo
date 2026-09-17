# Human Friction Audit v1

Status: CANDIDATE CRITIC EVIDENCE
Opportunity: `O-SWARM-CRITIC-HUMAN-FRICTION-V1`
Run: `RUN-O-SWARM-CRITIC-HUMAN-FRICTION-V1-20260917T091452-SOL56`
Authority: scoped critique only; no Current / Human Accepted / Served promotion.

## Executive finding

Manual per-worker routing is no longer the primary human-friction bottleneck. This canary wave now has durable candidate returns for role-fluid allocation, lease/retry, dynamic readiness and Local Steward behavior. This run itself lost several exclusive-claim races, reloaded live state, and acquired a different critic lane without any human job number or manual routing.

The remaining multiplicative human dependency is concentrated at three boundaries:
1. **wake/launch** — ended chat turns cannot wake themselves; humans still open fresh workers; the Metabolism Tick is currently only a non-deployed candidate build;
2. **end-to-end local integration proof** — component candidates exist, but one complete human-correction -> local planner -> workers -> local Steward -> verification -> same-surface preview journey has not yet been proven without manual routing/couriering/merging;
3. **fresh-state projection** — live `main` can advance faster than compiled EPOCH/manifest, forcing each worker to reconcile several moving evidence surfaces before safe writes.

Route change: stop adding duplicate allocator/stale/merger specifications. Exercise and verify the already-landed mechanisms together, then remove the remaining wake boundary through separately authorized deployment.

## Evidence-backed friction ledger

### HF-01 — Unique worker routing
**Disposition: CANARY MATERIAL PASS; production proof pending.**

Evidence: `UNIVERSAL_COGNITIVE_WORKER_V1.md` defines identical bootstraps; `O-SWARM-ROLE-FLUID-ALLOCATOR-V1` returned executable candidate code with 11/11 candidate tests; this run observed live collisions, refused overwrite, reloaded and atomically claimed another free lane.

Do not create another generic allocator/routing task.

### HF-02 — Human as result courier / memory
**Disposition: MATERIAL PASS for durable transport; PARTIAL for single-snapshot freshness.**

Claims/runs/returns are directly reopenable. This critic reconstructed current work and consumed other worker results without human copy/paste. Remaining risk is projection lag under rapid concurrent commits.

### HF-03 — Human as stale detector / recovery trigger
**Disposition: CANARY PASS for recoverability when another worker wakes; OPEN for unattended detection.**

Evidence: `O-SWARM-LEASE-RETRY-BUILD-V1` returned executable stale/retry primitives with 11/11 candidate tests. `O-SWARM-LOCAL-STEWARD-BUILD-V1` was actually recovered via append-only recovery lineage and exact-byte validation. But `STALE_RECOVERY_PROTOCOL_V1.md` explicitly says unattended timed detection requires an external Metabolism Tick/event loop. `O-METABOLISM-TICK-CANDIDATE-BUILD-V1` is now CLAIMED with `NO_DEPLOYMENT`, so this boundary remains real.

### HF-04 — Human/global guide as routine merger
**Disposition: IMPLEMENTED CANDIDATE, NOT END-TO-END PROVEN.**

The Local Steward candidate has durable recovery evidence and tests for typed dispositions, contradiction preservation and authority filtering. This does not yet prove the full surface-local loop. At least one surface must complete the entire path without a human carrying or reconciling worker returns before routine-merger friction can be called removed.

### HF-05 — Human as scheduler / launcher
**Disposition: OPEN.**

Humans still create fresh chat turns. The existing Event Loop return designed a GitHub-canonical metabolism tick, but design evidence is not deployment. Current Metabolism Tick work is explicitly non-deployed.

Distinguish this from legitimate human authority: Human Accepted / Served / irreversible / private decisions should remain human boundaries. Merely waking the system so it notices stale work or recompiles deterministic projections is avoidable friction.

### HF-06 — Human as chat locator / prompt router
**Disposition: MATERIAL PASS in canary topology.**

Stable `/wc` and `/g` bootstraps plus durable self-allocation remove unique worker prompts. Production `/w` remains a separate promotion boundary.

### HF-07 — State freshness / reconciliation tax
**Disposition: OPEN SCALING FRICTION.**

During this run, live `main` and public EPOCH/manifest advanced at different moments. Preserve-first behavior correctly required refetching live main, public epoch, exact claims and target existence separately. At 50-worker scale this becomes repeated coordination cost and an ambiguity source.

Need a generation-consistent derived snapshot exposing source main head, queue identity, active claims/runs/returns, dependency readiness and projection freshness together. It must remain a projection, not authority.

## Falsification journeys required before claiming friction removed

1. **Zero-routing worker wave:** one identical bootstrap launched N times; workers acquire distinct/complementary work or safely lose/reallocate; zero unique human job prompts.
2. **Zero-courier integration:** RETURN reaches next worker/Steward only through durable state; no human copy/paste.
3. **Unattended stale recovery:** external tick detects a recovery-eligible worker without a new human chat turn and emits the authorized recovery path while preserving late/original evidence.
4. **Same-surface correction loop:** one human correction goes through page thread -> local planner -> workers -> Steward -> verification -> same-surface preview with zero guide/manual merge.
5. **Snapshot consistency under churn:** a source-head-pinned projection explicitly marks freshness/lag and is never mistaken for canonical truth.
6. **Protected-human-boundary control:** Human Accepted / Served / irreversible/private authority still stops for the human.

## Deduplicated removal work

Consume existing work instead of recreating it:
- `O-SWARM-ROLE-FLUID-ALLOCATOR-V1`
- `O-SWARM-LEASE-RETRY-BUILD-V1`
- `O-SWARM-DYNAMIC-READINESS-BUILD-V1`
- `O-SWARM-LOCAL-STEWARD-BUILD-V1`
- `O-SWARM-PAGE-THREAD-BRIDGE-V1`
- `O-SWARM-CONTROL-ROOM-PROJECTION-V1`
- `O-METABOLISM-TICK-CANDIDATE-BUILD-V1`
- existing surface-local integration opportunities

### Candidate A — `O-METABOLISM-TICK-DEPLOYMENT-CANARY-V1`
Activation: only after the candidate build has a valid RETURN and independent verification.
Mission: separately authorize and exercise the smallest event-loop deployment proving at least one no-human-turn detection/derivation event.
Dedup key: `chat-control|metabolism-tick|authorized-deployment-canary|unattended-detection`.

### Candidate B — `O-SWARM-ZERO-HUMAN-ROUTING-E2E-V1`
Mission: instrument one surface journey from a single human correction through page thread/local planner/identical workers/local Steward/verification back to same-surface preview. Count routing, courier and routine merge actions; pass only at zero, while preserving human acceptance authority.
Dedup key: `multi-surface|page-change-loop|zero-routing-courier-merge|e2e-canary`.

### Candidate C — `O-SWARM-CONTROL-SNAPSHOT-CONSISTENCY-V1`
Mission: falsify/verify source-head-pinned Control Room/Metabolism projection freshness under concurrent writes. Extend existing projections; do not create a new truth store.
Dedup key: `chat-control|control-room|source-head-pinned-snapshot|freshness-falsifier`.

## Exact evidence refs

- `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/USER_INTENT_GAP_AUDIT_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/STRATEGIC_NON_REGRESSION_AND_SELF_CRITIQUE_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/VERIFICATION_AND_CRITIC_CONTROL_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/UNIVERSAL_COGNITIVE_WORKER_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/STALE_RECOVERY_PROTOCOL_V1.md`
- `coordination/opportunities/UNIVERSAL_COGNITIVE_SWARM_QUEUE_V1.json`
- `coordination/opportunities/returns/O-SWARM-ROLE-FLUID-ALLOCATOR-V1/RUN-O-SWARM-ROLE-FLUID-ALLOCATOR-V1-20260917T0046-SOL56-3F7B.json`
- `coordination/opportunities/returns/O-SWARM-LEASE-RETRY-BUILD-V1/RUN-O-SWARM-LEASE-RETRY-BUILD-V1-20260917T0043-SOL56.json`
- `coordination/opportunities/returns/O-SWARM-LOCAL-STEWARD-BUILD-V1/RUN-O-SWARM-LOCAL-STEWARD-BUILD-V1-REC-20260917T0911-SOL56-B31D.json`
- `coordination/opportunities/returns/O-EVENT-LOOP-RUNTIME-V1/RUN-EVENTLOOP-20260916T225751-sol56.json`
- `coordination/opportunities/claims/O-METABOLISM-TICK-CANDIDATE-BUILD-V1.json`
- `agent-runtime/epoch.json@gh-pages`
