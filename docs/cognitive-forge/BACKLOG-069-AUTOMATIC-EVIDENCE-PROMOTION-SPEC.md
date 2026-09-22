# BACKLOG 069 · Promoción automática con evidencia

## Provenance

- Backlog origen: `docs/cognitive-forge/BACKLOG.md`, ítem 69.
- Índice estructurado: `docs/cognitive-forge/backlog.json`, id 69.
- Estado previo: `PENDIENTE`.
- Prerequisito directo: ítem 68, revisión independiente real.
- Fuente de evidencia histórica: ítem 70, utilidad cognitiva observable.
- Trabajo Prometeo que materializa esta spec: `WORK-RESERVOIR-01 / AUTO-Q01091`.
- Alcance: definir el contrato de promoción automática. Esta spec no autoriza promoción sin implementar y verificar sus invariantes.

## Problema

Prometeo ya distingue estados de madurez cognitiva y tiene contratos diseñados para revisión independiente y utilidad histórica, pero falta el puente determinista que decida cuándo una candidata reunió evidencia suficiente para pasar a `ACCEPTED`. Sin ese puente, la promoción queda manual, implícita o susceptible de confundirse con popularidad, verbosidad o una sola revisión favorable.

El sistema necesita una decisión reproducible y auditable: la misma candidata, revisión, evidencia y versión de política deben producir la misma resolución.

## Objetivo ejecutable

Implementar un evaluador durable de promoción que consuma evidencia verificable de una versión exacta de un objeto cognitivo y produzca sólo una de estas resoluciones:

- `PROMOTE`: puede transicionar a `ACCEPTED`.
- `HOLD`: evidencia todavía insuficiente o contradictoria; no cambia madurez.
- `REJECT`: falla una condición explícita y reproducible de la política.
- `STALE`: la versión evaluada ya no es la vigente.

La promoción debe ser determinista. La IA puede producir o interpretar evidencia en trabajos previos, pero no debe ser la autoridad final que altera el estado.

## Objetos y versiones

V1 debe aceptar al menos `PLUMA` y `TOOL`, porque el ítem 68 define revisión independiente para esos tipos. La interfaz debe permitir extender el mismo contrato a `CARD`, `RECIPE` y `SKILL` sin cambiar la semántica de decisión.

Toda evaluación debe identificar:

- `object_type`
- `object_id`
- `revision` o versión exacta
- `author_worker_code`
- `current_maturity`
- `policy_version`
- `evaluated_at`

Una revisión nueva invalida la autoridad de evaluaciones anteriores sobre la versión previa, pero no borra su historial.

## Evidence Bundle mínimo

El evaluador consume un bundle normalizado y trazable, no texto libre aislado:

- referencia a revisión independiente del ítem 68;
- reviewer distinto del autor;
- decisión y evidencia de esa revisión;
- observaciones de utilidad del contrato del ítem 70;
- cantidad de proyectos y jobs distintos cubiertos por esas observaciones;
- evidencia positiva, negativa y desconocida por separado;
- resultados de smoke/regresión cuando el objeto sea procedural;
- referencias durables a outputs, tests, receipts o eventos;
- conflictos o contradicciones detectadas;
- versión exacta del objeto que generó esa evidencia.

Nunca contar palabras, selecciones brutas ni frecuencia de aparición como prueba suficiente de utilidad.

## Política de promoción

La política debe vivir como configuración/versionado durable, no escondida en un prompt. V1 puede definir campos conceptuales equivalentes a:

- `min_independent_reviews`
- `min_distinct_jobs_with_evidence`
- `min_distinct_projects_with_evidence`
- `require_regression_pass`
- `max_unresolved_negative_evidence`
- `require_no_open_revision_request`

Los valores concretos son política operativa y deben poder cambiar por versión sin reescribir historia. La implementación no debe fijar un umbral arbitrario sólo para hacer pasar el smoke test.

## Invariantes obligatorias

1. El autor no puede satisfacer el requisito de revisión independiente.
2. Evidencia de otra revisión/version del objeto no promueve la versión actual.
3. `UNKNOWN` no cuenta como evidencia positiva.
4. Evidencia negativa no puede desaparecer de los agregados.
5. Una contradicción abierta produce `HOLD`, salvo que la policy version defina un fallo explícito que produzca `REJECT`.
6. Evaluar dos veces el mismo objeto + revisión + policy version es idempotente.
7. Una decisión `PROMOTE` debe conservar el bundle exacto que la justificó.
8. La transición a `ACCEPTED` debe ocurrir en la misma operación durable o con fencing que impida que una revisión nueva quede promovida por una evaluación vieja.
9. `REJECTED` y `SUPERSEDED` preservan provenance y evidencia.
10. Ningún score opaco puede sustituir estas condiciones.

## Operaciones requeridas

Implementar operaciones durables equivalentes a:

- construir/leer el Evidence Bundle de una candidata;
- evaluar el bundle contra una `policy_version`;
- persistir `promotion_evaluation` con inputs, resultado y reason codes;
- aplicar `PROMOTE` sólo si la revisión evaluada sigue vigente;
- consultar historial de evaluaciones y la evidencia que sostuvo cada resolución.

La operación de evaluación debe devolver reason codes legibles por máquina, por ejemplo `INSUFFICIENT_INDEPENDENT_REVIEW`, `INSUFFICIENT_DISTINCT_EVIDENCE`, `OPEN_NEGATIVE_EVIDENCE`, `REGRESSION_REQUIRED`, `REVISION_STALE` y `PROMOTION_POLICY_SATISFIED`.

## Criterios de aceptación

La implementación posterior queda aceptada sólo si demuestra, con fixtures reproducibles:

A. Una candidata sin revisión independiente devuelve `HOLD`.
B. Una auto-review no cuenta aunque tenga evidencia.
C. Una candidata con evidencia positiva insuficiente permanece sin promoción.
D. `UNKNOWN` adicional no convierte `HOLD` en `PROMOTE`.
E. Evidencia negativa abierta bloquea promoción según policy.
F. Una candidata que satisface todos los requisitos de una policy devuelve `PROMOTE` y queda `ACCEPTED` con provenance completa.
G. Repetir la evaluación no duplica decisiones ni eventos.
H. Modificar la revisión entre evaluación y aplicación produce `STALE` y no cambia madurez.
I. Una nueva policy version puede reevaluar sin borrar la decisión histórica anterior.
J. Todo contador agregado puede rastrearse hasta jobs/proyectos/evidence refs concretos.

## Smoke mínimo

Crear una candidata descartable `TOOL` en revisión N. Registrar autor A, revisión independiente por B y tres observaciones de utilidad con referencias durables, incluyendo al menos una señal no positiva. Ejecutar una policy deliberadamente insuficiente para obtener `HOLD`; agregar sólo la evidencia que falta; reevaluar la misma revisión para obtener `PROMOTE`; repetir y verificar idempotencia. Después crear revisión N+1 e intentar aplicar la evaluación de N: debe devolver `STALE`.

Los thresholds usados por el fixture deben formar parte explícita de una policy de prueba, no de la policy productiva.

## No-objetivos

- No implementar ranking de workers.
- No promover por cantidad de usos o palabras.
- No borrar conocimiento rechazado.
- No hacer que una revisión humana o de IA aislada sea autoridad suficiente.
- No redefinir los contratos de los ítems 68 o 70.
- No activar automáticamente esta política en producción como parte de esta spec.

## Salida esperada del trabajo técnico posterior

Una implementación completa debe entregar migración/esquema durable, evaluador determinista o RPC equivalente, policy versionada, fencing/idempotencia, fixtures de aceptación, receipts y provenance hacia los ítems 68, 69 y 70. Recién entonces el backlog 69 puede pasar de `DISENADO` a `HECHO`.
