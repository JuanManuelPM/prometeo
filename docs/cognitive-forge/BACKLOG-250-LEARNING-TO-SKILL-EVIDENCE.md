# BACKLOG-250 — learning generates Skills

Status: IMPLEMENTED

The existing Forge runtime already had a durable Skill registry, versioned Skill definitions, execution bundles, regression persistence, and action traces. The missing link was an explicit operation that turns reusable learning into a Skill object without bypassing review.

Migration `20260922042911_forge_skill_learning_candidate_bridge_v1.sql` adds `public.forge_skill_candidate_from_learning(jsonb)`.

The bridge requires a learning reference, Skill identity, non-empty procedure steps, verification/rollback contracts, schemas, and non-empty evidence. It persists provenance with `source=LEARNING`, deduplicates repeated compilation of the same `learning_ref`, and always creates a `CANDIDATE` version. It never promotes a Skill to `ACCEPTED`; existing review/promotion gates remain authoritative.

Deterministic verification: `public.forge_skill_candidate_from_learning_smoke_test()` returned `LEARNING_TO_SKILL_CANDIDATE_SMOKE_OK` with creation, dedupe, candidate gate, provenance, and fixture cleanup all PASS.
