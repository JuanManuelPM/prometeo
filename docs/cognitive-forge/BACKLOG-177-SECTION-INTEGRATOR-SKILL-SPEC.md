# BACKLOG 177 · Integrador de sección · Skill ejecutable

## Estado

- Backlog origen: **177 · Integrador de sección**
- Skill durable: `FORGE_SECTION_INTEGRATOR`
- Versión inicial: **1**
- Input primario: `prometeo.forge-point-interface/v1`
- Output: `prometeo.forge-section-spec/v1`
- Implementación: `supabase/migrations/20260922042000_forge_section_integrator_skill_v1.sql`

## Objetivo

Reconciliar las interfaces compactas de una sección de Cognitive Forge en una única Section Specification trazable. La Skill integra; no inventa autoridad, no reemplaza los canonicals y no reabre decisiones cerradas sin evidencia nueva.

## Flujo

1. Validar interfaces, identidad y provenance.
2. Normalizar vocabulario conservando alias de origen.
3. Detectar duplicaciones y registrar su disposición.
4. Detectar contradicciones. Una resolución necesita evidencia; en caso contrario queda OPEN.
5. Hacer explícitas dependencias entre puntos.
6. Separar decisiones canónicas de decisiones abiertas.
7. Emitir `prometeo.forge-section-spec/v1`.
8. Verificar con `forge_section_integrator_result_validate(input, output)`.

## Contrato de salida

La Section Specification contiene como mínimo:

- `schema`, `section_id`;
- `sources`: cobertura uno-a-uno de las interfaces consumidas, con canonical refs;
- `vocabulary`;
- `duplicates`;
- `contradictions`;
- `dependencies`;
- `canonical_decisions`;
- `open_decisions`;
- `components`.

## Invariantes verificadas

- Todos los puntos de entrada aparecen exactamente una vez en `sources`.
- Un conflicto `RESOLVED` tiene al menos un `evidence_ref`.
- Una decisión canónica suministrada por el input no puede reaparecer como abierta.
- El bundle de Skill no concede autoridad: `authority_granted=false`.
- La versión ejecutable queda pinneada; no depende de “latest”.

## Rollback

La Skill es versionada. Una regresión se revierte retirando/supersediendo la versión y restaurando el Section Specification previo. No se borran definiciones históricas.

## Evidencia de ejecución

La migración incluye un fixture de promoción y `forge_section_integrator_skill_smoke_test()`. El smoke exige un output válido con cobertura de dos fuentes, prueba el guard que impide reabrir una decisión canónica y verifica que `forge_skill_execution_bundle('FORGE_SECTION_INTEGRATOR',1)` sea ejecutable sin otorgar autoridad.
