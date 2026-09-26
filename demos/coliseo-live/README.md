# Coliseo Live Dynamics Lab

Responsabilidad exclusiva: proyección semántica y derivación de eventos causales para el Coliseo. Este lab no define sprites, mapa, materiales, HUD final ni promoción a la superficie canónica.

## Export estable

`module.js` publica `window.COLISEO_LAB_MODULE` con:
- `deriveVisualState(snapshot)`
- `deriveEvents(previous, current)`

## Regla CURRENT de liveness

`ACTIVE` es estado del job, **no prueba de vida del worker**. La proyección usa señal reciente (`last_signal_at` / `age_seconds` / `heartbeat_seconds`) y respeta `RECOVERING` y `STALE_MEMBERSHIP`.

Worker, job, output y dependency permanecen separados:
- **worker** = identidad + liveness/señal + stage/progreso cuando existe;
- **job** = assignment + node + `assignment_generation`;
- **output** = emisión acotada cuando el nodo cruza a `SUCCESS`;
- **dependency** = entrega causal cuando un upstream declarado cruza a `SUCCESS`.

## Política de movimiento V2

Se eliminó el pulso perpetuo de `WORKING`. La demo ya no loopea: corre una sola pasada y se detiene.

Cada animación mayor tiene una autoridad exacta:
- `WORKER_PROGRESS` → golpe breve sobre el worker;
- `OUTPUT_EMITTED` → emisión breve en el nodo;
- `DEPENDENCY_DELIVERED` → transferencia única upstream → downstream;
- `NODE_READY` → flash único;
- `RECOVERY_STARTED` → recovery one-shot;
- `WORKER_STALE` → corte one-shot;
- `WORKER_CLAIMED` / `WORKER_RELEASED` → entrada/salida acotada;
- `JOB_COMPLETED` → cierre acotado.

Sin un evento de `deriveEvents(previous,current)`, no se anima nada. La animación presenta evidencia; no la fabrica.

## Pruebas sintéticas

La página comprueba:
- ACTIVE + señal vieja => `STALE`, no `WORKING`;
- progreso explícito => `WORKER_PROGRESS`;
- stale y recovery;
- output → dependency → READY;
- repetir el mismo snapshot no re-emite output ni progreso;
- cambio fungible de worker entre jobs.

## Carencia conocida del contrato

El fixture V1 no garantiza una identidad canónica de job. `module.js` consume `job_ref`, `job_id`, `current_job_id` o `lease_job_id` si existen; si no, usa `visual-job:<node>:g<generation>` como fallback **sólo visual**. Este lab no modifica `coliseo-shared`.
