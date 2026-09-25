# Coliseo Live Dynamics Lab

Responsabilidad exclusiva: proyección semántica y derivación de eventos causales para el Coliseo. Este lab no define sprites, mapa, materiales, HUD final ni promoción a la superficie canónica.

## Export estable

`module.js` publica `window.COLISEO_LAB_MODULE` con:

- `deriveVisualState(snapshot)`
- `deriveEvents(previous, current)`

## Gramática causal demostrada

`CLAIM → WORKING/WAIT → JOB_COMPLETED → OUTPUT_EMITTED → DEPENDENCY_DELIVERED → INPUT_BUFFER → NODE_READY → nuevo CLAIM`.

La demo usa `coliseo-shared/fixture-v1.js`, conserva tres proyectos simultáneos y prueba también stale, recovery y cambio de un mismo worker entre jobs. Los outputs se emiten únicamente en la transición del nodo a `SUCCESS`; repetir el mismo snapshot no vuelve a emitirlos.

## Liveness

`ACTIVE` nunca se usa como prueba de vida. La proyección calcula liveness desde `last_signal_at`/`age_seconds` y `heartbeat_seconds`, respetando estados de control explícitos `RECOVERING` y `STALE_MEMBERSHIP`. Un job puede seguir `ACTIVE` mientras su worker aparece `STALE`; en ese caso `activity_mode=STALE`, no `WORKING`.

## Carencia detectada del contrato compartido

El snapshot/fixture V1 no garantiza una identidad canónica de job separada de `worker_id` y `node_key`; el fixture actual ni siquiera incluye `job_ref`. El módulo consume `job_ref`, `job_id`, `current_job_id` o `lease_job_id` cuando existen. Si ninguno existe, genera un identificador **sólo visual** `visual-job:<node>:g<generation>` y lo marca con `job_id_source='derived-visual-fallback'`.

Integration debería decidir si una futura revisión del contrato exige `job_ref` canónico. Este lab no modifica `coliseo-shared`.
