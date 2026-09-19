# Facultad semantic-context Edge · static preflight · 2026-09-19T15:09Z

Authority: `portfolio-facultad-semantic-context-edge-static-preflight-v1` G000001. Repository-side verification only. No Supabase deployment and no Current / Human Accepted / Served promotion.

## Exact repository identities

- Edge source: `supabase/functions/prometeo-change-loop-v1/index.ts` blob `77c55438c07fb4b5c5d166542ed3032d13750e38`
- Regression: `tests/facultad-change-loop-transport-v1.test.mjs` blob `6e48cee4e3307a7d1b4d12f14bfa1e31ebef1cda`
- Shared Change Loop client: `shared/capture/v1/change-loop.js` blob `cd27bce58bd43d3e5a0ce6633c5dd7a8e0a24c26`
- Study V18 source: `pages/study-library/study-v18.js` blob `f9fa29100195dc6d879a0ee61a96dc1534bb84bc`

## Static contract verification

PASS:

- Edge uses an explicit `SEMANTIC_CONTEXT_KEYS` allowlist.
- Only keys in that allowlist are copied from incoming `semantic_context`.
- The request path validates `body.semantic_context` through `semanticContext(...)` before packet inclusion.
- The validated capsule is included in packet context; `SEMANTIC_CONTEXT_INVALID` guards are present.
- Facultad surface/project consistency is guarded: `facultad-digital` cannot name a non-`project-facultad` project.
- Regression fixture carries course/year/tab/semantic_anchor and explicitly asserts an undeclared `ignored_field` is absent from the transported payload.
- Study V18 exposes semantic capture/viewport fallback without inventing `page_id:'facultad-digital'`.
- Raw/private correction text has no allowlisted semantic-context key and is therefore not copied into the semantic capsule by this repository contract.

## Exact residual

Still requires the specialized job `portfolio-facultad-fd-semantic-context-edge-deploy-verify-v1` with:

1. authorized Supabase Edge deployment of the exact repository source;
2. committed regression execution in a repository runtime;
3. live packet confirmation that only the allowlisted semantic capsule is preserved;
4. live return/restore confirmation including viewport fallback.

This preflight does not claim the deployed Edge function matches repository bytes, does not claim live round-trip success, and does not invent canonical Facultad identity.
