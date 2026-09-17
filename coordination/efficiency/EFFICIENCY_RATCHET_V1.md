# Prometeo Efficiency Ratchet v1

Status: BINDING CANARY LAW for hot-path coordination/runtime changes.

Purpose: once a coordination inefficiency is observed, explained, fixed and evidenced, future Prometeo versions must preserve the improvement or replace it with a measurably better mechanism. Efficiency knowledge is durable state, not chat memory.

## Core law

Prometeo may trade speed for correctness only when the exact risk requires it. It may not silently reintroduce known redundant work, repeated archaeology, human routing, duplicated reads, coordination starvation or fake liveness merely because a later prompt/protocol forgot an earlier optimization.

Every accepted optimization becomes a RATCHET ITEM with:
- stable id;
- scope/hot path;
- observed waste/failure;
- invariant that must remain true;
- measurable signal/SLO when measurable;
- static regression checks where possible;
- runtime evidence where possible;
- explicit supersession rule.

A successor mechanism may replace a ratchet item only when it preserves correctness and has evidence that it is at least as efficient on the relevant path. Deleting the test/invariant is not supersession.

## Hot paths covered first

- fresh `/wc` -> first PIN/claim;
- lost claim race -> next useful claim attempt;
- no-allocation -> clean stop;
- RETURN -> reallocation;
- Live feed publication under commit bursts;
- worker ownership projection/recovery;
- `/g` reconstruction/hydration;
- Guide planning/integration/rescate routing;
- page request -> worker -> publish -> Live notification.

## Monotonicity rule

For a hot path, prefer in this order:
1. precompute once centrally;
2. read one bounded compiled/index artifact;
3. perform the authoritative action;
4. only after ownership/load-bearing decision, expand context as needed.

Do not make N disposable workers independently rediscover information that a compiler/steward can derive once.

## Efficiency memory

`coordination/efficiency/RATCHET_BASELINE_V1.json` is the machine-readable baseline. It is cumulative. New incidents append new ratchet items; existing items are never silently weakened.

When a human points out repetitive work, wasted chats, repeated reads, stale UI, unnecessary waiting, routing friction or another multiplicative inefficiency:
1. preserve evidence;
2. identify the earliest unnecessary step and why it existed;
3. move repeatable reasoning into compiler/index/protocol where possible;
4. patch the hot path;
5. add/update a ratchet item and regression check;
6. measure the next real runs;
7. only then call the optimization demonstrated.

## No self-repair explosion

Efficiency monitoring must not create a swarm whose main work is repairing wasted workers.

Order of response to regression:
1. compiler/static/CI correction with zero worker chats when possible;
2. one deterministic deduped `GUIDE_RESCATE` job when model/runtime behavior requires reasoning;
3. one bounded verifier after the repair;
4. never one repair worker per failed/surplus worker.

Bare beacons/no-allocation workers are capacity evidence, not recovery debt.

## Change gate

Any change touching a hot-path file must satisfy the ratchet checker. Current gated files include:
- `wc`;
- `g`;
- `coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md`;
- `coordination/workers/WORKER_REGISTRY_PROTOCOL_V1.md`;
- `.github/workflows/live-feed.yml`;
- allocator compiler/public `/wc` pointer;
- runtime efficiency compiler;
- this ratchet baseline/checker itself.

The checker is intentionally conservative: it protects already-proven structural wins. Runtime metrics complement it; they do not excuse static regressions.

## Runtime sentinel

The durable events already provide useful timing without exposing private chain-of-thought:
- beacon timestamp;
- first PIN/claim timestamp;
- no-allocation timestamp;
- RETURN timestamp;
- heartbeat timestamps.

`live/efficiency.json` compiles these into:
- time-to-first-authority (TTFA);
- no-allocation close time;
- allocation rate;
- stale/recovery pressure when available;
- bounded recent launch evidence.

The runtime measurement epoch is explicit (`runtime_baseline_activated_at`) and does not reset merely because the ratchet ledger is edited.

A runtime status of `REGRESSION` requires a resolved sample before it is emitted. The snapshot also emits a deterministic regression fingerprint/dedupe key so a reasoning-based repair converges on ONE system rescue rather than one repair task per worker.

Do not require private reasoning traces to optimize the system. Human screenshots can reveal hidden waste and should be converted into ratchet items when they expose a structural problem.

## Promotion rule

A claimed improvement is:
- `PATCHED` when code/protocol changed;
- `STATIC_GUARDED` when automated non-regression checks exist;
- `RUNTIME_OBSERVED` after real runs show the intended behavior;
- `RATCHETED` only when both guard + runtime evidence exist.

Never call a merely written optimization permanently solved.
