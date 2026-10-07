# RETURN-004__worker-002

EXP|EXP-007-E
worker_id|exp007-e-2-4f3c0f02
worker_slot|002
launch_id|exp007-e-2-4f3c0f02-2270-4ade-9d59-f2d40efd54ae
ticket|004
block|BLOCK-004
launch_clicked_at|2026-10-07T18:00:19.656Z
worker_started_at|2026-10-07T18:00:45.629Z
registered_at|2026-10-07T18:01:05.557Z
assigned_at|2026-10-07T18:02:16.114Z
block_read_start|2026-10-07T18:02:28.129Z
block_read_end|2026-10-07T18:02:28.753Z
local_work_start|2026-10-07T18:02:28.753Z
local_work_end|2026-10-07T18:02:40.583Z
publish_start|2026-10-07T18:02:40.583Z

COUNTERS
tickets_received|2
returns_created|1
blocks_completed|1
external_work_calls|16
telemetry_writes|3
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Durante esta prueba conviene que cada worker tenga una sola tarea activa a la vez porque así cada asignación mantiene una relación simple y comprobable entre ticket, bloque leído, trabajo local y RETURN publicado. Si un mismo worker sostuviera varias tareas simultáneas, aparecerían más estados intermedios, más archivos abiertos y más posibilidades de mezclar contenido o telemetría entre tickets.

La restricción también simplifica la coordinación. El allocator sólo necesita entregar un ticket cuando el worker está libre; después, ese worker completa el ciclo entero antes de pedir otro. Esto hace que sea mucho más fácil detectar dónde quedó una ejecución: o todavía está procesando un ticket concreto, o ya publicó y verificó su RETURN, o está listo para recibir el siguiente.

Además, una única tarea activa reduce el impacto de fallos. Si algo se interrumpe, hay un solo ticket cuyo estado debe revisarse. No hace falta reconstruir qué parte de varias tareas estaba avanzada ni decidir cuál retomar primero. Para una prueba cuyo objetivo es medir asignación mecánica, concurrencia y cierre correcto, eliminar esa complejidad extra ayuda a que cualquier error observado pertenezca al protocolo probado y no a multitarea innecesaria.

MINI_RESUMEN|Una sola tarea activa por worker mantiene cada ticket aislado, trazable y fácil de recuperar o verificar.
