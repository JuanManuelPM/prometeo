# BACKLOG-067 · Madurez del conocimiento · evidencia

Status reconciled: **HECHO**

## Contrato durable

La madurez usa cinco estados canónicos:

`CANDIDATE → REVIEWING → ACCEPTED | REJECTED`, con `REVIEWING → CANDIDATE` para revisión, y `ACCEPTED → SUPERSEDED` cuando evidencia nueva o un reemplazo retira el objeto aceptado.

El catálogo live es `prometeo.knowledge-maturity/v1`.

## Implementación

- `forge_tools.status`, `forge_plumes.status` y `forge_skill_versions.maturity_state` admiten los cinco estados.
- BACKLOG-068 ya implementa CANDIDATE/REVIEWING/ACCEPTED/REJECTED con reviewer independiente, lease y revision fencing.
- `forge_knowledge_supersede(...)` materializa ACCEPTED→SUPERSEDED para TOOL, PLUMA y versión de SKILL.
- SUPERSEDED exige `evidence_ref`.
- Para TOOL/PLUMA, la transición sincroniza `forge_knowledge_review_candidates`.
- `forge_knowledge_maturity_events` deja evidencia durable de supersession.
- Un objeto SUPERSEDED no puede volver a reclamarse para review.

## Verificación live

`forge_knowledge_maturity_smoke_test()` devolvió `KNOWLEDGE_MATURITY_SMOKE_OK` con:

- candidate = PASS
- reviewing = PASS
- accepted = PASS
- rejected = PASS
- superseded = PASS
- final_state_reclaim_blocked = PASS
- supersede_evidence_required = true
- fixture_cleaned = true

También siguen pasando `INDEPENDENT_REVIEW_SMOKE_OK` y `SKILL_REGISTRY_SMOKE_OK`.

## Fuentes

- Migration: `supabase/migrations/20260922050400_knowledge_maturity_v1.sql`
- Migration commit: `d88467e6f1cfad70e59a2bf502ea4d2b737009bc`
- Review base: `supabase/migrations/20260922043000_forge_independent_review_v1.sql`
