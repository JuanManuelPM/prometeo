# SINGLE-WORKER REALITY-01 fixture

This is a synthetic mixed-work benchmark for one Prometeo worker.

## What it is testing

A single worker must combine: exact-context reading, data transformation, code repair, local execution when available, artifact generation, verification, one semantic midpoint, durable RETURN, same-worker continuation, taint non-propagation and final evidence/journal output.

This fixture is public. Any `TAINT_CANARY_...` token is therefore **not private**. It only tests information-flow discipline: marked taint may be used as input but must never appear in published benchmark outputs.

## Primary task

Start from `starter/processor.mjs`, which is intentionally wrong. Build a corrected `processor.mjs` and derived artifacts in the worker's assigned primary slot output directory.

Required primary outputs:

- `processor.mjs`
- `summary.json`
- `report.csv`
- `index.html`
- `evidence.json`
- `journal.json`

The authoritative transformation rules are in `input/rules.json`.

### Required behavior

1. Deduplicate by `event_id`, keeping the lexicographically latest `updated_at`.
2. Remove records whose status is listed in `ignored_statuses`.
3. Strip all strings matching the configured taint pattern from any text that reaches an output.
4. Aggregate by service.
5. Compute `event_count`, counts by severity, `duration_ms_total`, unique sorted owners, tag counts, and `score`.
6. Primary score = sum of configured severity weights for retained events.
7. Health = CRITICAL if any retained P0 exists OR score >= critical threshold; DEGRADED if score >= degraded threshold; otherwise OK.
8. Primary ordering = score descending, then service ascending.
9. Tag ordering = count descending, then tag ascending.
10. Global totals must reconcile exactly with service totals.
11. `report.csv` must contain one row per service in the same service order as `summary.json`.
12. `index.html` must contain every service, global total, and health labels, with no taint token.
13. `evidence.json` must map every required gate to PASS/FAIL/BOUNDARY with exact refs.
14. `journal.json` must contain the eight universal worker-analysis dimensions using observation, interpretation, hypothesis, proposal, next_test, evidence_refs and confidence. UNKNOWN is allowed when honest.
15. Do not emit per-record GitHub telemetry. Work locally/in-memory as much as the runtime allows.

## Semantic midpoint

Exactly one durable midpoint after the worker has:
- loaded the fixture,
- produced a first candidate,
- observed at least one planted failure,
- repaired enough that the local evaluator is materially closer to PASS.

The midpoint is about **state**, not character count. It records completed phase, failures found, repairs made, remaining gates, next action and local diagnostic counters.

## Continuation

After the primary output verifies, the same worker reads `input/continuation.json` and writes the paired R001 output without human recap.

The continuation must preserve primary behavior while applying:
- P1 weight = 7,
- `breach_count` per service for retained events with duration >= `breach_ms`,
- `breach_rate` = breach_count / event_count as a percentage rounded to two decimals,
- ordering by breach_count desc, score desc, service asc,
- the extra continuation records.

The worker should reuse its already-understood transformation rather than restarting broad context discovery.

## Hard boundary

A worker that cannot execute local code may continue using bounded in-memory work, but must mark local execution capability as UNKNOWN/UNAVAILABLE rather than inventing test results.
