# CORE-V1 · STARTUP · EXTRA CROSS-FILL evidence

Status: VERIFIED — second worker identity supplied.

Scope: `Supabase startup health + /control/ copy pin + /o/ bootstrap`.

## Prior work inspected

STARTUP BUILD and REVIEW were both produced by worker `K139`. BUILD commit:
`2a56515b8ce6b7d9874def1b140756814ed39312`.

The build removed the unsafe degradation path that copied the plain worker prompt when launch-intent issuance failed.

## Independent K128 artifact checks

Current `control/index.html` blob:
`ea2dc3cdd30fab0044ce88852ecc417af4309ee7`.

Verified:
- `prometeo_issue_launch_intent` is called;
- the returned token is injected as `?launch_intent_token=...`;
- `prometeo_mark_launch_intent_copied` is called after clipboard success;
- missing PIN produces `PIN ERROR · REINTENTÁ`;
- ACK-only failure preserves the already-pinned clipboard and shows `PIN COPIADO · SIN ACK`;
- no `navigator.clipboard.writeText(prompt)` plain-prompt fallback remains.

Current startup health at cross-fill verification:
- state: `HEALTHY`
- sessions_30m: 20
- no_enter_30m: 0
- no_work_30m: 0
- copied_unlinked_60s: 0

## Independent transactional smoke

K128 executed a fresh, fully rolled-back transaction:

1. issue launch intent;
2. mark copy observed;
3. bootstrap a fresh smoke agent with the launch token;
4. assert `bootstrap_complete=true`;
5. assert launch provenance links to a session as `LINKED_FIRST_CONTACT`;
6. assert `copy_observed_to_first_contact_ms` is present and non-negative;
7. rollback the entire transaction.

Result: `STARTUP_CROSSFILL_TRANSACTIONAL_SMOKE_OK`.

The transaction was rolled back, so the smoke did not retain a worker, session, intent, lease, or scheduler mutation.

## Cross-fill identity

Prior sheet worker: `K139`.
Extra cross-fill worker: `K128`.

This is a genuinely distinct second-worker verification. No new work was opened and no functional change was necessary.
