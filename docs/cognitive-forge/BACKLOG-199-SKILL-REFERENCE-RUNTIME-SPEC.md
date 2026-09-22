# BACKLOG 199 · Skills fuera del prompt · Spec ejecutable

## Estado

- Backlog origen: **199 · No depender de prompts largos**
- Estado propuesto: **DISEÑADO**
- Dependencias satisfechas: BACKLOG-197/198 (`forge_skills`, `forge_skill_versions`).
- Objetivo: que trabajo repetitivo pueda referenciar una Skill durable/versionada sin copiar su procedimiento completo en la conversación.

## Problema

Persistir Skills no reduce por sí solo el tamaño del prompt. Si cada job vuelve a incrustar inputs, outputs, pasos, rollback, verificación y evidencia como texto libre, la conversación sigue siendo la fuente operacional y las versiones pueden divergir silenciosamente.

## Principio

El prompt humano conserva autoridad e intención. La Skill es datos/procedimiento versionado, no autoridad. Un job puede portar una referencia pequeña y explícita a una versión exacta; el worker resuelve esa referencia desde el registry sólo después de recibir WORK.

## Referencia durable

Forma mínima sugerida en `job.input_context.skill_ref`:

- `skill_id`: identidad estable.
- `version_no`: entero exacto; nunca `latest` en un job ya asignado.
- `binding_source`: quién fijó la referencia (`JOB`, `SCHEDULER`, `HUMAN`, `COMPILER`).
- `binding_provenance`: receipt/origen durable.

El scheduler puede resolver una policy de selección antes de asignar, pero el WORK final debe transportar una versión pinneada.

## Primitive de resolución

`forge_skill_execution_bundle(skill_id, version_no) -> jsonb`

Debe devolver:

- identidad y versión exacta;
- maturity_state;
- inputs_schema / outputs_schema;
- procedure_steps;
- rollback_contract;
- verification_contract;
- evidence_requirements;
- provenance de la versión;
- `definition_hash` estable calculado sobre la definición canónica.

Estados explícitos: `SKILL_EXECUTION_BUNDLE`, `SKILL_NOT_FOUND`, `SKILL_VERSION_NOT_FOUND`, `SKILL_NOT_EXECUTABLE`.

## Elegibilidad

Una versión ejecutable debe pertenecer a una Skill ACTIVE y estar en un maturity_state permitido por policy. Para el primer rollout, aceptar sólo `ACCEPTED`; CANDIDATE/REVIEWING se ejecutan únicamente en jobs de evaluación que lo declaren explícitamente y nunca por fallback.

## Integración con WORK

1. ENTER/NEXT asigna un job normal.
2. Si no hay `skill_ref`, el flujo actual no cambia.
3. Si existe `skill_ref`, el worker valida shape local y llama una vez al resolver.
4. Si el bundle es válido, usa esa definición como procedimiento del job.
5. Si falla la referencia, no busca una Skill parecida ni usa `latest`; publica el boundary observable.
6. PUBLISH registra `skill_id`, `version_no` y `definition_hash` usados.

El resolver no otorga permisos y no reemplaza la instruction específica del job. Si la Skill contradice autoridad, lease o safety, esas capas prevalecen.

## Evitar prompt bloat

- No copiar `procedure_steps` completos dentro de job.instruction cuando existe `skill_ref`.
- No serializar el registry entero al prompt.
- No agregar una tool call sólo para telemetría; resolver únicamente cuando el WORK lo necesita.
- El job conserva objetivo/constraints concretos; la Skill aporta método reusable.

## Compatibilidad

Jobs actuales sin `skill_ref` funcionan igual. La adopción es incremental y reversible. Un rollback puede dejar de emitir referencias sin borrar Skills ni versiones.

## Casos de aceptación

1. Referencia exacta a Skill ACTIVE + ACCEPTED devuelve bundle.
2. Version inexistente devuelve `SKILL_VERSION_NOT_FOUND` sin fallback.
3. `latest`/version ausente se rechaza para ejecución pinneada.
4. Skill RETIRED no se ejecuta.
5. CANDIDATE se rechaza en modo normal.
6. Definition hash cambia cuando cambia una nueva versión y permanece estable para la misma versión.
7. Job sin skill_ref no agrega ninguna llamada.
8. Dos workers con igual skill_ref reciben definición equivalente/hash idéntico.
9. PUBLISH puede citar la versión/hash sin reimprimir el procedimiento.
10. Ningún bundle concede authority, tools o lease.

## Fases

**A. Resolver:** implementar `forge_skill_execution_bundle` + smoke.

**B. Binding contract:** documentar/validar `job.input_context.skill_ref` y la policy de maturity.

**C. Primer consumidor:** migrar un único trabajo repetitivo que ya tenga procedimiento estable; comparar prompt bytes/tool calls y resultado.

**D. Expansión:** adoptar gradualmente sólo donde exista evidencia de repetición.

## Criterio de cierre

BACKLOG-199 pasa a HECHO cuando A-B estén implementadas y al menos un smoke pruebe version pinning, no-fallback y hash estable. La migración de consumers continúa incrementalmente.