# BACKLOG-070 — historical cognitive utility evidence

Status: DECOMPOSED / core implemented

Implemented durable core:
- `public.cognitive_utility_observations` stores CARD/PLUMA/TOOL/RECIPE/SKILL observations with execution provenance.
- `public.forge_cognitive_utility_record(jsonb)` validates, deduplicates, and downgrades unevidenced HELPED claims to UNKNOWN.
- `public.cognitive_utility_aggregate` exposes transparent counters without an opaque score.
- `public.forge_cognitive_utility_history(type,id)` returns aggregate plus traceable raw observations.
- `public.forge_cognitive_utility_smoke_test()` verifies fixture counts, replay dedupe, unused-vs-used distinction, HELPED evidence gate, aggregate reproducibility, traceability, and cleanup.

Smoke result: `COGNITIVE_UTILITY_SMOKE_OK`.

Versioned migration:
`supabase/migrations/20260922044305_cognitive_utility_observations_v1.sql`

Remaining independent integration:
hook Prometeo publication to inspect actually attached cognitive objects and emit idempotent observations through the new primitive. This is intentionally delegated instead of rewriting the central publish path inside the storage job.
