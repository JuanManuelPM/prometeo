# GUIDE-BRANCH-SOURCE-COMPILER-V1 · Evidencia

## Objetivo

Compilar descubrimientos que realmente representan trabajo independiente en nuevas `prometeo_frontier_sources`, sin convertir texto libre en backlog ni inflar la frontera con duplicados o busywork.

## Implementación

Migración backend: `frontier_branch_source_compiler_v1` versión `20260922044147`.

Primitives:

- `prometeo_frontier_compile_branch_candidates_v1(origin,candidates,max_create)`
- `prometeo_frontier_compile_output_branches_v1(project_id,job_key,generation,max_create)`
- trigger `trg_prometeo_frontier_compile_output_branches_v1` sobre `prometeo_outputs`

El compilador sólo lee `meta.frontier.branch_candidates[]`. No interpreta `output_text`, `word_count` ni `discoveries[]` como trabajo.

Cada candidato debe declarar `source_key`, `title`, `summary`, `necessary=true`, `independent=true`, `verifiable=true`, `acceptance[]` no vacío y un `work_kind` válido. `priority` y `source_ref` son opcionales.

## Deduplicación y límite

Se rechazan de forma determinista:

- candidates no estructurados o incompletos;
- `NOT_NECESSARY`, `NOT_INDEPENDENT`, `NOT_VERIFIABLE`;
- duplicados dentro del mismo output;
- source_key/fingerprint/título+summary ya existentes;
- job derivado ya existente;
- candidatos por encima del límite.

El límite de compilación está hard-capped en **3 fuentes por output**.

## Contrato de workers

`prometeo_frontier_branch_audit_contract()` ahora agrega `BRANCH_CANDIDATES_V1` además de `BRANCH_AUDIT_V1`. Al aplicar la migración se backfillearon sólo jobs `READY`, no leases activos.

Verificación observada:

- READY con contrato estructurado: **64**
- READY sin contrato estructurado: **0**
- trigger de outputs presente: **true**

## Smoke

`prometeo_frontier_branch_source_compiler_smoke_test()` devolvió `BRANCH_SOURCE_COMPILER_SMOKE_OK`:

- first_created: 3
- first_rejected: 3
- repeat_created: 0
- bounded_to: 3
- duplicate_noise_no_growth: true
- fixture_cleaned: true

El fixture ejecuta creación, duplicado, ruido no necesario y cuarto candidato válido por encima del límite dentro de una transacción y borra sus fuentes antes de retornar.

## Resultado

La frontera puede crecer desde descubrimientos explícitos y verificables sin usar heurísticas de texto ni contar palabras como señal de ramificación.
