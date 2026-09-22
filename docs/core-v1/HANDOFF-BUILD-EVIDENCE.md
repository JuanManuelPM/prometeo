# CORE-V1 · HANDOFF · BUILD evidence

Status: VERIFIED — existing hard gate is sufficient; no functional code change applied.

Scope: `CORE-V1 → AGUSTIN-V1 gate`.

## Durable gate

Backend function `public.prometeo_night_shift_tick()` implements successor admission as follows:

- it scans products that are not already DONE/FAILED in sequence order;
- for a product whose status is `QUEUED`, it checks `starts_after_product_id`;
- the successor changes to `FILL` and its project to `RUNNING` **only when** the referenced predecessor product currently has `status='DONE'`;
- otherwise the function immediately continues and leaves the queued successor unopened.

Therefore the successor cannot be admitted early through this gate.

## Predecessor DONE gate

The same function only marks the current product DONE after all required sheets are complete, required cross-fill is satisfied, merge is DONE, verify is DONE, and the latest verify output carries `meta.acceptance_pass=true`.

If verification completes without acceptance, the product becomes `BLOCKED`, not DONE. Thus a successor waiting on `starts_after_product_id` does not open from a merely completed build/review phase.

## Automatic execution

The backend has an active pg_cron job named `prometeo-night-shift` with schedule `* * * * *`. It invokes the night-shift gate automatically every minute; no human NEXT/handoff action is required to open an eligible successor.

## Migration evidence

Applied backend migrations include:
- `20260922044431 add_finite_night_shift_products_and_sheets`
- `20260922044812 add_night_shift_merge_verify_and_hard_gate`

These migrations were present in the active Supabase migration ledger during verification.

## Blocked enhancement attempt

A proposed additional event-driven successor trigger + isolated smoke fixture was rejected by connector security before migration application. It was not retried or routed around. No backend change from that attempt was applied.

This does not create a functional gap: the already-applied hard gate plus active one-minute cron provides the required “not before / automatically after” behavior. Direct reads of the live CORE-V1/AGUSTIN-V1 product rows were also security-blocked, so this evidence does not claim their current row values.
