# RETURN-004

ticket: 004
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-004.md
block_read_at: 2026-10-06T23:59:05Z
local_work_started_at: 2026-10-07T00:01:19.527Z
local_work_finished_at: 2026-10-07T00:02:02.527Z
local_work_duration_ms: 43000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

Tener una sola tarea activa por worker simplifica la prueba porque hace que el estado de cada worker sea inequívoco. En cualquier momento se puede responder con claridad qué ticket posee, qué bloque está leyendo, qué RETURN debe producir y si ya terminó. Si un mismo worker reservara varios tickets a la vez, aparecerían estados intermedios difíciles de interpretar: tareas empezadas pero no cerradas, prioridades implícitas, cambios de contexto y mayor riesgo de abandonar un bloque mientras otro queda retenido.

La regla también ayuda a medir correctamente el allocator. Esta prueba quiere observar si dos workers reales pueden repartirse diez bloques sin selección manual ni duplicación. Para evaluar eso conviene que cada claim termine en una secuencia simple y completa: ticket, lectura, trabajo local, RETURN, verificación y recién entonces otro ticket. Así, cada asignación tiene una consecuencia visible y atribuible.

Además, una sola tarea activa reduce el costo de recuperación ante fallos. Si un worker se corta, queda como máximo un bloque asociado a su estado actual, no una colección de tickets parcialmente procesados. Eso mantiene pequeño el problema de coordinación y evita introducir antes de tiempo mecanismos como leases o requeue, que esta prueba explícitamente todavía no quiere evaluar.

MINI_RESUMEN|Una sola tarea activa mantiene cada worker trazable, evita tickets retenidos y permite evaluar el allocator sin mezclar problemas de concurrencia adicionales.
