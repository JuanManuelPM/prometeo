# CORE-V1 · GUIDE · Build/Review evidence

## Finding

The finite closeout already had a durable product state machine in `prometeo_night_shift_tick()`:

`FILL → CONTRACT → MERGE → VERIFY → DONE`

It also disables project spawning during contraction. Growth Guide, however, only consumed Productive Frontier metrics and could continue optimizing frontier growth without knowing that a finite product was approaching DONE.

## Implementation

Backend migration: `core_v1_guide_convergence_v1` version `20260922045251`.

It adds:

- `prometeo_convergence_strategy_v1(status)`
- `prometeo_product_convergence_v1(product_id)`
- convergence data and `effective_growth_mode` in `prometeo_growth_decision()`
- a convergence gate in `prometeo_maybe_schedule_growth_guide()`
- `prometeo_guide_convergence_smoke_test()`

Phase policy:

- FILL → `FILL_REMAINING_SHEETS`; frontier-driven growth remains allowed.
- CONTRACT → `CROSSFILL_AND_CLOSE_GAPS`; Growth Guide suppressed.
- MERGE → `MERGE_ONLY`; Growth Guide suppressed.
- VERIFY → `VERIFY_ONLY`; Growth Guide suppressed.
- DONE → `STOP_AFTER_DONE`; growth mode STOP.

## Verification

Review executed `prometeo_guide_convergence_smoke_test()` successfully:

- state: `GUIDE_CONVERGENCE_SMOKE_OK`
- phase_mapping: PASS
- contract_suppresses_growth: true
- merge_suppresses_growth: true
- verify_suppresses_growth: true
- done_stops_growth: true
- growth_decision_has_convergence: true

Live `CORE-V1` snapshot at review time:

- product_status: FILL
- required_sheets: 10
- done_sheets: 5
- remaining_sheets: 5
- progress_pct: 50
- crossfill_missing: 8
- touch_count: 13
- distinct_touch_workers: 4
- guide_strategy: `FILL_REMAINING_SHEETS`
- suppress_growth_guide: false

The live state correctly remains frontier-driven during FILL. The deterministic phase mapping proves that the scheduler switches to convergence and suppresses new Growth Guide scheduling when the product reaches CONTRACT/MERGE/VERIFY, then STOP at DONE.

## Tool recovery

The BUILD initially assumed a nonexistent `prometeo_guide_cycles.started_at` column; row-to-JSON inspection recovered the schema issue. Function-source introspection and migration application each encountered one security block and succeeded on exact retry. BUILD post-migration verification was security-blocked twice; the separately assigned REVIEW job executed the smoke successfully.

## Remaining closeout condition

This sheet requires cross-fill. Source/backend parity is now versioned, but the current review worker is the same K122 identity that performed BUILD. The sheet must still receive a touch from a second distinct worker before cross-fill can be considered satisfied.
