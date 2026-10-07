# EXP-007-D · RETURN-002

EXP|EXP-007-D
worker_id|exp007-d-w001-8dc4f4
worker_slot|001
launch_id|exp007-d-2-8dc4f415-dfd8-4a71-a3fc-13c474be5d6d
ticket|002
block|BLOCK-002
launch_clicked_at|2026-10-07T18:00:03.605Z
worker_started_at|2026-10-07T18:00:26.300Z
registered_at|2026-10-07T18:00:42.884Z
assigned_at|2026-10-07T18:01:13.687Z
block_read_start|2026-10-07T18:01:31.412Z
block_read_end|2026-10-07T18:01:31.853Z
local_work_start|2026-10-07T18:01:31.853Z
local_work_end|2026-10-07T18:01:49.181Z
publish_start|2026-10-07T18:01:49.181Z

COUNTERS|tickets_received=1;returns_created=0;blocks_completed=0;external_work_calls=9;telemetry_writes=1;telemetry_failures=0;revision_conflicts=1;retries=0;forbidden_ops=0;critical_errors=0

ANSWER|
Elegir una tarea significa que el worker inspecciona varias posibilidades y decide por criterio propio cuál hacer. Esa elección introduce una capa de planificación local: puede depender de preferencias, de lo que parece más fácil, de información parcial o incluso de una lectura distinta de las prioridades. En un sistema con varios workers, eso aumenta el riesgo de que dos elijan lo mismo, que otras tareas queden olvidadas o que el reparto real de trabajo sea difícil de reconstruir.

Recibir un ticket asignado mecánicamente es distinto. El worker no decide qué trabajo tomar: un allocator mantiene un estado compartido y entrega de forma atómica el siguiente ticket disponible. El ticket identifica exactamente el bloque que debe procesarse. Así, la exclusión y el reparto quedan en manos del mecanismo de asignación, no del criterio del worker.

Esto hace que la concurrencia sea más medible y repetible. Si dos workers piden trabajo casi al mismo tiempo, cada uno compite por una transición concreta del allocator; quien gana recibe un ticket y el otro vuelve a leer el estado actualizado. El worker conserva libertad para ejecutar bien la tarea asignada, pero no para redefinir por su cuenta qué tarea corresponde hacer.

MINI_RESUMEN|Elegir una tarea delega el reparto al criterio del worker; recibir un ticket mecánico delega el reparto a un allocator atómico y verificable.
