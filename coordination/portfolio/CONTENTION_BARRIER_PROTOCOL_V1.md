# CONTENTION BARRIER PROTOCOL v1

Status: CANARY mechanism. This protocol coordinates isolated exclusive-PIN race fixtures only. It never grants execution authority and never changes Current, Human Accepted, Served, Catalog, or production `/w` authority.

## Purpose

A live PIN-race canary can fail to produce a real loser when the first worker reaches the deterministic PIN before another worker is armed. The barrier makes contender readiness durable without choosing a winner: workers register first, then all valid entrants race the ordinary deterministic PIN after release.

## Durable layout

For fixture `<fixture_id>`:

- config: `coordination/portfolio/contention/<fixture_id>/BARRIER.json`
- entrant: `coordination/portfolio/contention/<fixture_id>/entrants/<worker_id>.json`

Entrants MUST use atomic CREATE-if-absent. Never overwrite an entrant receipt. A duplicate CREATE for the same worker means that worker is already armed; reload state rather than minting another identity.

## Barrier config

`BARRIER.json` uses `prometeo.portfolio-contention-barrier/v1` and MUST include:

- `fixture_id`
- `target_job_id`
- `required_contenders` integer >= 2
- `opened_at`
- `deadline_at`, strictly after `opened_at`

The fixture itself is isolated test state. Creating it does not claim the target job.

## Entrant receipt

Each entrant file uses `prometeo.portfolio-contention-entrant/v1` and MUST include:

- `fixture_id` matching the config
- `target_job_id` matching the config
- `worker_id`
- `armed_at` inside the configured window
- `authority: "BARRIER_ENTRANT_ONLY"`

A receipt with a wrong fixture/target, missing worker, invalid/out-of-window timestamp, or different authority fails closed and does not count.

## Evaluation

Run `scripts/pin-contention-barrier.mjs --root <repo> --fixture <fixture_id> [--now <iso>]` or import `evaluateContentionBarrier` / `loadBarrierState`.

States:

- `ARMING`: fewer than `required_contenders` distinct valid workers and deadline not reached. Do not race the PIN.
- `RELEASED`: threshold reached. `race_allowed=true`, but barrier authority remains `BARRIER_ONLY_NO_EXECUTION_AUTHORITY`. Every entrant must now independently use the normal deterministic PIN protocol. The barrier never selects a winner.
- `TIMED_OUT`: threshold was not reached by the deadline. Do not race. Abandon this isolated fixture and re-enter normal allocation; unrelated allocation must continue.

Duplicate receipts from one worker count once. Malformed/in-flight JSON is excluded rather than guessed.

## Verification target

A successful real canary requires durable evidence of the configured entrant threshold followed by exactly one deterministic PIN winner and at least one genuine loser collision receipt. Winner-only evidence is not sufficient.
