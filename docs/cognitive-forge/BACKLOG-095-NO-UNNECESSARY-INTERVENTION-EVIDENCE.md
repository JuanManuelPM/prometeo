# BACKLOG-95 · Evidencia de cierre

Estado reconciliado: **ALREADY_DONE**.

La necesidad durable era: **“Dejar terminar sin intervención innecesaria”**, con la regla “Intervenir sólo ante fallo estructural”.

## Evidencia actual

- `docs/cognitive-forge/GLOBAL_CONTROL.md` define que el trabajo actual se preserva salvo stop explícito.
- El retarget es “after current job”; no interrumpe el lease activo.
- `prometeo_stop_worker(worker, true)` usa `DRAINING`: evita nuevas asignaciones y permite terminar el trabajo actual.
- El scheduler reaps leases realmente stale y los resultados tardíos quedan fenced por lease token.
- `docs/cognitive-forge/BACKLOG.md` ya marca como HECHO la espera residente, el cierre decidido por servidor, leases, rescate automático y protección contra resultados tardíos.
- Verificación backend puntual: no existe actualmente una fila de `prometeo_projects` con `project_id='FORGE-BLUEPRINT-84-01'`. Esto sólo demuestra que ese identificador histórico no está activo en esa tabla; no se usa como prueba de que todo el Blueprint 84 haya finalizado.

## Decisión

BACKLOG-95 no requiere una nueva intervención sobre workers. El comportamiento pedido ya está expresado como invariante operacional: dejar correr leases válidos y actuar sólo ante estados estructurales del runtime (stale lease, stop/drain explícito, bloqueo o fallo real).

Se cierra el backlog como **HECHO** sin fabricar trabajo nuevo ni alterar una cohorte activa.
