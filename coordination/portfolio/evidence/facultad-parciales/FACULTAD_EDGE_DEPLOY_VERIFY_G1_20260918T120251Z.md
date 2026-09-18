# Facultad semantic-context Edge deploy/verify · G1 · 2026-09-18T12:02:51.561Z

Authority: `coordination/portfolio/pins/portfolio-facultad-fd-semantic-context-edge-deploy-verify-v1/G000001.json`
Worker: `wc-prod-01-20260918T115700Z-gpt56sol-a7c4`
Pool: `PROD-01`

## Repository source and regression

Exact GitHub blobs inspected:

- `shared/capture/v1/change-loop.js` — `cd27bce58bd43d3e5a0ce6633c5dd7a8e0a24c26`
- `pages/study-library/study-v18.js` — `f9fa29100195dc6d879a0ee61a96dc1534bb84bc`
- `scripts/build-universal-control-v5-change-loop.py` — `53f4ca97aa3a4e348a4a6b2fa9302677ffd62c48`
- `supabase/functions/prometeo-change-loop-v1/index.ts` — `77c55438c07fb4b5c5d166542ed3032d13750e38`
- `tests/facultad-change-loop-transport-v1.test.mjs` — `6e48cee4e3307a7d1b4d12f14bfa1e31ebef1cda`

The committed regression logic was executed against those exact blobs in the available V8 runtime. `createChangeLoopClient().trabajar()` produced `action=prepare_execution`, `human_approved=true`, preserved only the declared Facultad semantic context, and dropped `ignored_field`. The remaining committed source assertions also passed. Total assertions executed: 24.

This is **not** represented as a `node --test` run. The local container has Node v22.16.0, but outbound DNS to github.com is unavailable and the GitHub connector does not materialize repository files into that container, so a repository-tree Node invocation was not observed.

## Live Supabase state

Supabase project `catnohyouxqjjtseaueb` is reachable through the connected management surface.

`prometeo-change-loop-v1` is ACTIVE at deployed version 4. A direct management read of its deployed source found:

- no `semantic_context`;
- no `SEMANTIC_CONTEXT_KEYS`;
- no `semanticContext(body.semantic_context)`;
- no `previous_ai_sessions:aiHistory,semantic_context`;
- no `SEMANTIC_CONTEXT_INVALID`.

Therefore repository-ready != live-ready.

## Authority boundary

The owned job states `DEPLOY_ONLY_WITH_EXPLICIT_DEPLOYMENT_AUTHORITY_NO_PRODUCT_PROMOTION`.
The human invocation authorizes beacon, telemetry, PIN/claim and reversible commits in `JuanManuelPM/prometeo`; it does not explicitly authorize a Supabase Edge deployment.

No Supabase mutation was performed. No Current, Human Accepted or Served promotion was performed. No live Study Library Work packet was created because the deployed function does not yet contain the semantic-context bridge.

## Exact next action

With explicit Supabase Edge deployment authority: deploy the exact repository source for `prometeo-change-loop-v1` without unrelated changes, then run the committed repository regression and verify a real Study Library Work packet preserves only allowlisted course/year/tab/semantic_anchor context and restores it with viewport fallback.
