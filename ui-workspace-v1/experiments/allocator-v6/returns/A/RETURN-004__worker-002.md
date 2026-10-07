# RETURN-004__worker-002

EXP|EXP-007-A
worker_id|exp007-a-w002-08583d35
worker_slot|002
launch_id|exp007-a-2-08583d35-a5a0-4c5e-ae9a-1b5da38fe404
ticket|004
block|BLOCK-004
launch_clicked_at|2026-10-07T17:59:01.877Z
worker_started_at|2026-10-07T17:59:31.584Z
registered_at|2026-10-07T17:59:53.432Z
assigned_at|2026-10-07T18:01:50.896Z
block_read_start|2026-10-07T18:02:03.459Z
block_read_end|2026-10-07T18:02:03.805Z
local_work_start|2026-10-07T18:02:03.805Z
local_work_end|2026-10-07T18:02:16.177Z
publish_start|2026-10-07T18:02:16.177Z

COUNTERS
tickets_received|2
returns_created|1
blocks_completed|1
external_work_calls|17
telemetry_writes|4
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Durante esta prueba conviene que cada worker tenga una sola tarea activa porque reduce variables y vuelve mucho más fácil interpretar lo que ocurrió. Si un mismo worker mantiene varios trabajos abiertos a la vez, los tiempos, errores y operaciones externas se mezclan: deja de ser evidente qué ticket causó cada lectura, cada escritura o cada demora.

Con una sola tarea activa, el ciclo queda casi atómico: recibir ticket, leer su bloque, resolverlo localmente, publicar el RETURN, verificarlo y recién entonces pedir otro. Eso mejora la trazabilidad y permite atribuir cada resultado a un ticket concreto sin reconstrucciones posteriores.

También reduce el riesgo de interferencia accidental. Un worker con varios tickets podría confundir contenido, publicar una respuesta bajo el número equivocado o avanzar un bloque mientras otro todavía no quedó verificado. En una prueba de concurrencia, esos errores humanos o de estado contaminarían la medición del allocator.

Además, esta restricción separa dos preguntas distintas: primero comprobamos si varios workers pueden repartirse tickets correctamente; después, en otro experimento, podemos estudiar paralelismo interno dentro de un mismo worker. Mantener una sola tarea activa hace que cualquier conflicto, duplicación o pérdida sea más fácil de detectar y explicar.

MINI_RESUMEN|Una sola tarea activa por worker mantiene el ciclo aislado, trazable y medible sin mezclar tickets ni causas de error.
