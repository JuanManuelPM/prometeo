# RETURN-002__worker-002

EXP|EXP-007-A
worker_id|exp007-a-w002-08583d35
worker_slot|002
launch_id|exp007-a-2-08583d35-a5a0-4c5e-ae9a-1b5da38fe404
ticket|002
block|BLOCK-002
launch_clicked_at|2026-10-07T17:59:01.877Z
worker_started_at|2026-10-07T17:59:31.584Z
registered_at|2026-10-07T17:59:53.432Z
assigned_at|2026-10-07T18:00:42.465Z
block_read_start|2026-10-07T18:00:53.874Z
block_read_end|2026-10-07T18:00:54.210Z
local_work_start|2026-10-07T18:00:54.210Z
local_work_end|2026-10-07T18:01:12.558Z
publish_start|2026-10-07T18:01:12.558Z

COUNTERS
tickets_received|1
returns_created|0
blocks_completed|0
external_work_calls|10
telemetry_writes|2
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Elegir una tarea significa que el worker toma una decisión sobre qué trabajo hacer. Esa decisión puede depender de preferencias, contexto incompleto, orden aparente, facilidad o interpretación propia. En un sistema con varios workers, eso abre la puerta a dos problemas clásicos: duplicación, porque dos workers pueden elegir lo mismo, y huecos, porque algunas tareas pueden quedar sin elegir.

Recibir un ticket asignado mecánicamente cambia la responsabilidad. El worker no decide qué tarea corresponde: un allocator aplica una regla compartida y le entrega un identificador concreto. El worker sólo ejecuta el bloque asociado a ese ticket. Así, la coordinación deja de depender del criterio individual de cada chat y pasa a depender de un mecanismo verificable.

La diferencia también importa para medir el sistema. Si cada worker elige, es difícil separar la calidad de la ejecución de la calidad de la selección. Con tickets mecánicos, se puede observar con claridad cuándo se asignó cada trabajo, quién lo recibió, si hubo conflictos de concurrencia, cuánto tardó y si produjo un RETURN válido.

En resumen, elegir una tarea introduce autonomía de routing; recibir un ticket limita esa autonomía para ganar coordinación, trazabilidad y menor riesgo de trabajo duplicado.

MINI_RESUMEN|Elegir decide qué hacer; un ticket mecánico fija qué hacer para coordinar workers sin depender de su criterio.
