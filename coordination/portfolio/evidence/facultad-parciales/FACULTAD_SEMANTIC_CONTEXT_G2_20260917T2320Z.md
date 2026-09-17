# Facultad semantic-context bridge · G2 evidence · 2026-09-17T23:20Z

Authority: portfolio recovery G000002. Candidate/source work only. No deployment, Current, Human Accepted or Served promotion.

## What G2 changed

Repository source `supabase/functions/prometeo-change-loop-v1/index.ts` now:

- accepts only the declared semantic-context keys;
- validates bounded strings, authority status, source blob, stable semantic anchor, year, viewport fallback and shelf position;
- enforces `project_id=project-facultad` when `surface_id=facultad-digital`;
- consumes `body.semantic_context` during `prepare_execution`;
- persists the validated capsule at `snapshot.context.semantic_context`, so it participates in the execution-packet hash and reaches the downstream worker.

Commit: `30384b4839033581cdc78fad46ab2431f110074e`.

A regression was added to `tests/facultad-change-loop-transport-v1.test.mjs` asserting the server allowlist, body consumption and packet inclusion.

Commit: `57d18caddb21872fb7e4291ce4a8d3d557d58543`.

## Persisted verification

A post-write GitHub read confirmed:

- source blob `77c55438c07fb4b5c5d166542ed3032d13750e38`;
- `SEMANTIC_CONTEXT_KEYS` exists;
- `const semantic_context=semanticContext(body.semantic_context)` exists;
- execution packet context contains `previous_ai_sessions:aiHistory,semantic_context`;
- `SEMANTIC_CONTEXT_INVALID` guards exist;
- test blob `6e48cee4e3307a7d1b4d12f14bfa1e31ebef1cda` contains the new regression.

No GitHub workflow run or combined status was attached to the test commit, so runtime test execution is not claimed.

## Live boundary

Supabase management read after the source commit reports deployed `prometeo-change-loop-v1` version 4, and its deployed source still does not contain `semantic_context`.

Therefore the repository bridge is source-ready, but the live Edge Function is not yet updated. This worker intentionally did not deploy Supabase because the /wc authorization covers reversible repository commits, not production Edge deployment.

No private/raw correction text was persisted in coordination.
