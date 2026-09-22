# BACKLOG 068 · Revisión independiente real

## Provenance

- Backlog origen: `docs/cognitive-forge/BACKLOG.md`, ítem 68.
- Índice estructurado: `docs/cognitive-forge/backlog.json`, id 68.
- Estado previo: `PENDIENTE`.
- Relacionado: ítem 67 (madurez CANDIDATE/REVIEWING/ACCEPTED/REJECTED/SUPERSEDED) e ítem 69 (promoción automática con evidencia).
- Alcance: nuevas Plumas y Herramientas. Esta spec no autoriza promoción automática; sólo define revisión independiente verificable.

## Problema

Hoy una nueva Pluma/Herramienta puede existir como candidata sin un contrato mínimo que pruebe que fue revisada por un actor distinto de quien la produjo. Eso impide distinguir revisión real de auto-validación y debilita la provenance de cualquier promoción posterior.

## Objetivo ejecutable

Agregar una etapa durable de revisión independiente para cada candidata de tipo `PLUMA` o `TOOL`, con identidad de autor y reviewer, decisión explícita, evidencia y fencing contra auto-review.

## Contrato mínimo de datos

Cada candidata revisable debe exponer:

- `candidate_id`
- `candidate_type`: `PLUMA|TOOL`
- `author_worker_code`
- `created_at`
- `status`: inicia `CANDIDATE`
- `reviewer_worker_code`
- `review_started_at`
- `reviewed_at`
- `review_decision`: `ACCEPT|REJECT|REVISE`
- `review_evidence`: referencia durable a pruebas/observaciones
- `review_revision`: revisión exacta evaluada

Invariante obligatoria: `reviewer_worker_code != author_worker_code`.

## Máquina de estados

1. `CANDIDATE` → puede ser reclamada para revisión.
2. Al claim válido: `REVIEWING`, reviewer y lease registrados.
3. `ACCEPT` → `ACCEPTED` sólo para la revisión exacta evaluada.
4. `REJECT` → `REJECTED`.
5. `REVISE` → vuelve a `CANDIDATE` con nueva revisión; la revisión anterior queda en historial.
6. Una revisión tardía sobre una revisión supersedida debe rechazarse como stale y no cambiar autoridad.

## Operaciones requeridas

Implementar o adaptar operaciones durables equivalentes a:

- claim de candidata revisable;
- publish de review con fencing por lease/revisión;
- consulta de historial de reviews por `candidate_id`.

El scheduler no debe asignar como reviewer al autor. Si no existe reviewer elegible, la candidata permanece sin promoción y el bloqueo debe ser observable.

## Evidencia mínima del reviewer

La revisión debe contener, como mínimo:

1. una comprobación de que la definición es comprensible sin contexto privado del autor;
2. un caso donde la Pluma/Tool ayuda;
3. un contraejemplo o condición donde no debe aplicarse;
4. evidencia de no duplicación o referencia al objeto previo relacionado;
5. decisión y razón verificable.

No alcanza con “aprobado”, puntuación genérica ni repetición de la descripción.

## Criterios de aceptación

La implementación futura queda aceptada sólo si un smoke test demuestra:

- un autor no puede revisar su propia candidata;
- otro worker sí puede reclamarla;
- un segundo reviewer no puede pisar un lease activo;
- una publicación con lease viejo/revisión vieja es rechazada;
- `REVISE` preserva historial y crea una revisión nueva;
- `ACCEPTED` conserva enlace a reviewer, evidencia y revisión exacta;
- una candidata sin reviewer elegible no se promociona silenciosamente.

## Prueba mínima reproducible

Crear una candidata descartable `TOOL`, registrar autor A, intentar self-review con A (debe fallar), reclamar con B (debe pasar), publicar `REVISE`, crear revisión 2, reclamar con C y publicar `ACCEPT`. Verificar historial de ambas revisiones y luego eliminar/aislar los datos de prueba según la política vigente.

## No-objetivos

- No implementar todavía el ítem 69 de promoción automática.
- No redefinir toda la taxonomía de conocimiento.
- No convertir el reviewer en ranking humano.
- No borrar revisiones rechazadas ni supersedidas.

## Salida esperada del trabajo técnico posterior

Migración/RPCs o adaptación equivalente + smoke test + receipt/provenance que cite este archivo y el ítem 68. Sólo entonces el backlog puede pasar de `DISENADO` a `HECHO`.
