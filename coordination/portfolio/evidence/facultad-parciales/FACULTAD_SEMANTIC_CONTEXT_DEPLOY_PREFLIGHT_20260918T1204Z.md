# Facultad semantic-context bridge · deploy preflight · 2026-09-18T12:04Z

Authority: `coordination/portfolio/pins/portfolio-facultad-fd-semantic-context-deploy-preflight-v1/G000001.json`.
Worker: `gpt56sol-20260918T115800Z-p01-8f3c`.
Scope: repository-side preflight only. No Supabase deployment, Current promotion, Human Accepted claim or Served claim.

## Result

**STATIC_CONTRACT_OK**

Current repository blobs audited:
- Edge source: `supabase/functions/prometeo-change-loop-v1/index.ts` @ `77c55438c07fb4b5c5d166542ed3032d13750e38`
- Regression: `tests/facultad-change-loop-transport-v1.test.mjs` @ `6e48cee4e3307a7d1b4d12f14bfa1e31ebef1cda`
- Shared client: `shared/capture/v1/change-loop.js` @ `cd27bce58bd43d3e5a0ce6633c5dd7a8e0a24c26`
- Study V18: `pages/study-library/study-v18.js` @ `f9fa29100195dc6d879a0ee61a96dc1534bb84bc`
- Host generator: `scripts/build-universal-control-v5-change-loop.py` @ `53f4ca97aa3a4e348a4a6b2fa9302677ffd62c48`

The Edge source and regression blobs are unchanged from the prior G2 evidence, so no repository drift was observed.

## Privacy / allowlist audit

Client and Edge both use the same closed semantic-context key set:
`surface_id, project_id, authority_status, target_path, target_source_blob, course_id, selected_year, active_tab, semantic_anchor, viewport_fallback, explicit_shelf_position`.

The server reconstructs semantic context by iterating only that allowlist and validates bounded values before packet construction. The packet stores only the validated `semantic_context` capsule under `snapshot.context.semantic_context`.

A runtime-equivalent harness executed the exact current shared client blob. It submitted valid Facultad course/year/tab/anchor context plus `ignored_field`, `transcript`, `raw_correction` and `private_note`. The resulting Work payload contained the declared semantic context and omitted all four undeclared/private-content fields.

## Regression evidence

Equivalent assertions against current repository blobs all passed:
1. shared Change Loop Work payload preserves declared Facultad semantic context and strips undeclared/private-content keys;
2. Study V18 exposes capture/restore context without inventing canonical `page_id:'facultad-digital'`;
3. Universal Host consumes hosted semantic context instead of inventing page identity;
4. Edge source contains the semantic-context allowlist, consumes `body.semantic_context`, includes the validated capsule in the execution packet, and retains `SEMANTIC_CONTEXT_INVALID` guards.

The active container has Node v22.16.0, but this runtime could not materialize the repository checkout: archive/raw transfer into the container was unavailable. Therefore `node --test tests/facultad-change-loop-transport-v1.test.mjs` is **NOT_EXECUTED** here. The exact test file is present and its four cases were reproduced against the current blobs in the available JavaScript runtime; this does not masquerade as a Node repository test run.

## Remaining live boundary

`authorized_supabase_edge_deployment` remains required. This worker did not deploy the Edge Function. Live end-to-end verification must happen only after an explicitly authorized deployment and must confirm a real packet restores course/year/tab/semantic_anchor plus viewport fallback without inventing canonical Facultad page identity.
