# BACKLOG 206 · Trazar qué Skill produjo qué acción · Spec ejecutable

## Estado

- Backlog origen: **206 · Trazar qué Skill produjo qué acción**
- Estado: **HECHO**
- Dependencias satisfechas: BACKLOG-197/198 (forge_skills, forge_skill_versions)
- Alcance: observabilidad durable del procedimiento usado; no ranking de workers ni promoción automática.

## Problema

Prometeo puede persistir Skills y sus versiones, pero todavía no existe un receipt canónico que responda qué versión concreta de una Skill produjo una acción observable. Inferirlo desde el prompt, el nombre del job o timestamps rompe trazabilidad y vuelve imposible auditar utilidad histórica o comparar versiones.

## Principio

Una acción sólo se atribuye a una Skill cuando el ejecutor declara explícitamente skill_id + skill_version_no y el backend puede validar esa versión. Ausencia de declaración significa UNATTRIBUTED; nunca se hace matching heurístico.

## Objeto durable: SkillActionTrace

Campos mínimos:

- action_trace_id: UUID estable.
- skill_id + skill_version_no: FK exacta a forge_skill_versions.
- project_id, job_key, worker_code y session_id cuando existan.
- action_kind: TOOL_CALL | STATE_CHANGE | ARTIFACT_WRITE | CHECK | OTHER.
- action_ref: referencia durable al efecto o receipt externo.
- procedure_step: índice/clave opcional del paso de la Skill.
- status: STARTED | SUCCEEDED | FAILED | REVERSED.
- input_refs[], evidence_refs[], output_refs[].
- started_at, finished_at.
- provenance: objeto obligatorio con origen del vínculo.
- dedupe_key: clave estable para impedir doble receipt del mismo efecto.

## Invariantes

1. No existe trace con Skill/version inexistente.
2. Una versión se referencia exactamente; nunca latest.
3. El trace no concede autoridad ni modifica scheduler/lease.
4. SUCCEEDED requiere al menos un action_ref o evidence_ref.
5. REVERSED conserva el receipt original y añade evidencia de reversión.
6. Dedupe ocurre por identidad del efecto, no por proximidad temporal.
7. Un trace no transforma una Skill CANDIDATE en ACCEPTED.
8. Sin declaración explícita no se inventa atribución.

## API mínima

- forge_skill_trace_action_start(skill_id, version_no, context, dedupe_key)
- forge_skill_trace_action_finish(action_trace_id, status, action_ref, evidence_refs, output_refs)
- forge_skill_action_trace(action_trace_id)
- forge_skill_action_history(skill_id, version_no?)

Las funciones deben validar shapes JSON, referencias de versión y transiciones de estado. Un finish repetido con el mismo resultado puede ser idempotente; un resultado conflictivo debe rechazarse.

## Integración inicial

Primero instrumentar un solo camino controlado y reversible, no todo Prometeo. El smoke recomendado usa una Skill fixture versionada, inicia un trace, registra una acción simulada con receipt determinista, finaliza SUCCEEDED, recupera el historial y elimina el fixture.

Después, integrar traces en jobs que ya declaren explícitamente una Skill. No parsear prompts para descubrir Skills.

## Métricas derivables

A partir de traces, sin ranking humano:

- ejecuciones por Skill/version;
- success/failure/reversal por tipo de acción;
- cobertura de procedure steps;
- acciones sin evidencia;
- versiones con regresiones observables;
- utilidad histórica enlazable a BACKLOG-205.

Estas métricas son evidencia descriptiva, no promoción automática.

## Casos de aceptación

1. Skill/version válida crea STARTED.
2. Versión inexistente es rechazada.
3. Finish SUCCEEDED exige evidencia o action_ref.
4. Dedupe impide doble trace activo/equivalente.
5. Repetición idempotente conserva mismo receipt.
6. Conflicto de finish se rechaza.
7. REVERSED conserva historial previo.
8. History filtra por versión exacta.
9. Trace sin Skill explícita no se crea por heurística.
10. Borrar/retirar una Skill no destruye trazabilidad histórica; si la política FK exige impedir borrado, debe quedar explicitada.

## Implementación por fases

**A. Persistencia:** tabla/índices/FKs y transiciones.

**B. RPCs:** start/finish/get/history con fencing lógico e idempotencia.

**C. Smoke:** fixture temporal, receipt determinista y cleanup.

**D. Primer consumidor:** instrumentar un único flujo que ya conozca skill_id/version_no.

**E. Observabilidad:** vista agregada para utilidad histórica, sin score de workers.

## Criterio de cierre

BACKLOG-206 pasa a HECHO sólo cuando A-C estén implementadas y verificadas con receipts reproducibles. D/E pueden continuar como evolución sin bloquear la existencia del primitive de trazabilidad.

## Evidencia de implementación

- Migración Supabase aplicada: `forge_skill_action_trace_v1`.
- Fuente versionada: `supabase/migrations/20260922040030_forge_skill_action_trace_v1.sql`.
- Primitive durable: `forge_skill_action_traces`.
- RPCs: `forge_skill_trace_action_start`, `forge_skill_trace_action_finish`, `forge_skill_action_trace`, `forge_skill_action_history`.
- Smoke: `forge_skill_action_trace_smoke_test()` devolvió `SKILL_ACTION_TRACE_SMOKE_OK` con dedupe, missing-version, evidence gate, idempotencia, conflicto, reversión e historia por versión en PASS; fixture limpiado.
