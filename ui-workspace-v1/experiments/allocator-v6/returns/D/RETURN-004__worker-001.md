# EXP-007-D · RETURN-004

EXP|EXP-007-D
worker_id|exp007-d-w001-8dc4f4
worker_slot|001
launch_id|exp007-d-2-8dc4f415-dfd8-4a71-a3fc-13c474be5d6d
ticket|004
block|BLOCK-004
launch_clicked_at|2026-10-07T18:00:03.605Z
worker_started_at|2026-10-07T18:00:26.300Z
registered_at|2026-10-07T18:00:42.884Z
assigned_at|2026-10-07T18:02:16.475Z
block_read_start|2026-10-07T18:02:22.878Z
block_read_end|2026-10-07T18:02:23.277Z
local_work_start|2026-10-07T18:02:23.277Z
local_work_end|2026-10-07T18:02:34.643Z
publish_start|2026-10-07T18:02:34.643Z

COUNTERS|tickets_received=2;returns_created=1;blocks_completed=1;external_work_calls=15;telemetry_writes=2;telemetry_failures=0;revision_conflicts=1;retries=0;forbidden_ops=0;critical_errors=0

ANSWER|
Durante esta prueba conviene que cada worker tenga una sola tarea activa porque así la relación entre asignación, trabajo y resultado queda simple de observar. Un ticket entra, se procesa un bloque concreto, se publica su RETURN y recién entonces se pide el siguiente. Esa secuencia reduce estados ambiguos y hace mucho más fácil saber qué ocurrió si algo falla.

Si un mismo worker mantuviera varias tareas abiertas al mismo tiempo, aparecerían problemas de trazabilidad: habría que distinguir qué lectura corresponde a qué ticket, qué resultado pertenece a cada bloque y cuál tarea estaba realmente avanzando cuando se registró un checkpoint. También crecería el riesgo de mezclar contenido entre bloques, publicar un RETURN con metadatos equivocados o dejar tareas parcialmente procesadas.

La restricción de una tarea activa además permite evaluar mejor al allocator. Cada ticket ganado representa una unidad de trabajo bien delimitada y cada RETURN verificado cierra esa unidad antes de tomar otra. Así se puede medir reparto, latencia, conflictos y finalización sin sumar concurrencia interna dentro de cada worker.

No significa que el sistema definitivo deba ser estrictamente secuencial. En esta prueba, la simplicidad es deliberada: primero se valida que dos workers coordinen correctamente sobre tickets atómicos; después puede probarse más paralelismo sin confundir causas.

MINI_RESUMEN|Una sola tarea activa por worker mantiene trazabilidad, evita mezclas y permite medir limpiamente la coordinación del allocator.
