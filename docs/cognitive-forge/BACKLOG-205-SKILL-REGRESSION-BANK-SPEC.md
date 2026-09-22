# BACKLOG 205 · Banco de regresión para Skills · Spec ejecutable

## Estado

- Backlog origen: **205 · Banco de regresión para Skills**
- Estado propuesto del backlog: **DISEÑADO**
- Tipo: infraestructura durable de verificación
- Alcance: Skills versionadas antes de promoción
- Provenance canónica: `docs/cognitive-forge/BACKLOG.md#205`
- No implementa todavía el runner ni migra datos productivos.

## Problema

Prometeo ya diseña versionado de Skills y comparación entre versiones, pero falta un corpus durable de casos reutilizables. Sin ese banco, una versión nueva puede parecer mejor sobre el caso que la originó y degradar comportamientos previamente demostrados. La promoción necesita pruebas históricas reproducibles, no sólo evaluación narrativa.

## Objetivo

Definir un banco de regresión donde cada Skill pueda acumular casos con inputs, invariantes esperados, provenance y receipts. Una candidata sólo puede promoverse si ejecuta los casos aplicables y no rompe invariantes duros.

## Unidad durable: SkillRegressionCase

Cada caso MUST persistir como objeto independiente con estos campos mínimos:

- `case_id`: identidad estable.
- `skill_key`: Skill evaluada.
- `source_kind`: `JOB_OUTPUT | INCIDENT | MANUAL_FIXTURE | MIGRATED_HISTORY`.
- `source_ref`: referencia durable al origen.
- `fixture`: input normalizado necesario para reproducir el caso.
- `preconditions`: estado previo requerido.
- `hard_invariants[]`: condiciones binarias que no pueden degradarse.
- `soft_metrics[]`: métricas comparables que informan pero no bloquean por sí solas.
- `oracle_type`: `DETERMINISTIC | RECEIPT_MATCH | HUMAN_ACCEPTED | COMPOSITE`.
- `expected_receipts[]`: evidencia mínima esperada.
- `setup_contract` y `teardown_contract`: preparación y limpieza reproducibles.
- `status`: `ACTIVE | QUARANTINED | RETIRED`.
- `created_from_version`: versión donde el caso fue incorporado.
- `last_verified_version`, `last_verified_at`.
- `dedupe_key`: hash estable de `skill_key + normalized_fixture + hard_invariants`.

## Resultado durable: SkillRegressionRun

Cada ejecución MUST registrar:

- `run_id`, `skill_key`, `candidate_version`, `baseline_version`.
- casos seleccionados y razón de inclusión/exclusión.
- outcome por caso: `PASS | FAIL | BLOCKED | NOT_APPLICABLE`.
- receipts observables.
- violaciones de invariantes duros.
- delta de métricas blandas frente al baseline.
- timestamps y worker/tool provenance.
- conclusión: `PROMOTION_ELIGIBLE | PROMOTION_BLOCKED | INCONCLUSIVE`.

Un `FAIL` en cualquier hard invariant bloquea promoción. `BLOCKED` o `INCONCLUSIVE` nunca se interpreta como PASS.

## Dedupe y crecimiento

El banco no debe inflarse con variantes semánticamente idénticas. Antes de insertar un caso:

1. normalizar fixture;
2. calcular `dedupe_key`;
3. buscar ACTIVE/QUARANTINED con la misma clave;
4. si existe, anexar provenance adicional al caso existente;
5. sólo crear uno nuevo cuando cambie la condición probada o el fixture sea materialmente distinto.

Un incidente nuevo puede producir un caso nuevo sólo si agrega una regresión observable que el banco actual no detectaba.

## Selección de casos

El runner selecciona:

1. todos los ACTIVE de la misma `skill_key`;
2. casos heredados de la versión baseline;
3. casos marcados como críticos;
4. una muestra determinista de casos no críticos si el corpus supera el presupuesto configurado.

La selección y cualquier sampling MUST quedar en receipt para poder reproducirse.

## Runner mínimo

Contrato sugerido:

`run_skill_regression(skill_key, candidate_version, baseline_version, budget) -> SkillRegressionRun`

Secuencia:

1. validar identidad/versiones;
2. congelar lista de casos;
3. ejecutar baseline si falta receipt compatible reciente;
4. ejecutar candidata con el mismo fixture;
5. evaluar oráculos;
6. persistir receipts;
7. calcular conclusión;
8. devolver referencia durable del run.

El runner no modifica la versión ACCEPTED. La promoción ocurre después y consume el run como evidencia.

## Integración con promoción

La futura promoción de una Skill MUST exigir:

- al menos un `SkillRegressionRun` reciente para la candidata;
- cero hard invariant failures;
- ningún caso crítico BLOCKED;
- provenance completa;
- versión exacta de fixtures y runner;
- revisión independiente cuando la política de la Skill lo requiera.

La existencia de un run no implica promoción automática.

## Casos de aceptación de la implementación

La implementación se considera correcta cuando existan pruebas reproducibles para:

1. **Pass completo:** candidata pasa todos los invariantes y queda `PROMOTION_ELIGIBLE`.
2. **Regresión dura:** una única violación produce `PROMOTION_BLOCKED`.
3. **Caso bloqueado:** tool/input faltante produce `INCONCLUSIVE`, nunca PASS.
4. **Dedupe:** insertar dos fixtures equivalentes no crea dos casos ACTIVE.
5. **Provenance múltiple:** un incidente equivalente agrega source_ref al caso existente.
6. **Baseline pinning:** cambiar la versión baseline cambia la identidad del run.
7. **Repetibilidad:** mismo fixture + mismas versiones + mismo runner produce igual evaluación de invariantes deterministas.
8. **Rollback:** retirar runner/promoción nueva no destruye casos ni receipts históricos.

## Plan de implementación

Fase A: persistencia de `SkillRegressionCase` y `SkillRegressionRun` con índices de dedupe.

Fase B: runner determinista con soporte inicial para `DETERMINISTIC` y `RECEIPT_MATCH`.

Fase C: integrar el resultado al gate de promoción de Skills sin autoaceptación.

Fase D: migrar una muestra pequeña de incidentes reales y ejecutar el banco contra dos versiones conocidas.

Fase E: documentar métricas, límites de presupuesto y política de cuarentena.

## No objetivos

- No usar el banco como ranking de workers.
- No convertir métricas blandas en bloqueo automático sin política explícita.
- No borrar casos fallidos o antiguos; se RETIRED/QUARANTINED preservando historia.
- No depender de prompts largos para ejecutar fixtures deterministas.
- No inventar casos sintéticos sólo para aumentar cobertura numérica.

## Criterio de cierre

BACKLOG-205 puede pasar de DISEÑADO a HECHO únicamente cuando persistencia, runner, dedupe, promoción gate y los ocho casos de aceptación estén implementados con receipts reproducibles.
