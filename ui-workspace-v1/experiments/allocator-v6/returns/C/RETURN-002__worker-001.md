# EXP-007-C RETURN

EXP|EXP-007-C
VARIANT|C
worker_id|exp007-c-w001-3139ba96
worker_slot|001
launch_id|exp007-c-1-3139ba96-57b8-40a9-8e55-e52aebb142fb
ticket|002
block|BLOCK-002
launch_clicked_at|2026-10-07T17:59:37.338Z
worker_started_at|2026-10-07T18:00:00.716Z
registered_at|2026-10-07T18:00:12.375Z
assigned_at|2026-10-07T18:01:24.378Z
block_read_start|2026-10-07T18:01:39.790Z
block_read_end|2026-10-07T18:01:40.130Z
local_work_start|2026-10-07T18:01:40.130Z
local_work_end|2026-10-07T18:01:50.645Z
publish_start|2026-10-07T18:01:50.645Z
counters|tickets_received=2;returns_created=1;blocks_completed=1;external_work_calls=11;telemetry_writes=2;telemetry_failures=0;revision_conflicts=0;retries=0;forbidden_ops=0;critical_errors=0

ANSWER|
Elegir una tarea significa que el worker decide por sí mismo qué hacer. Puede mirar una lista, comparar opciones y tomar la que le parece disponible, urgente o conveniente. Eso introduce criterio local. Si varios workers hacen lo mismo al mismo tiempo, dos pueden elegir la misma tarea porque ambos observaron el mismo estado antes de que alguno registrara su elección.

Recibir un ticket asignado mecánicamente es distinto. El worker no selecciona nada: pide trabajo y un allocator le entrega un identificador concreto, por ejemplo “Ticket 002”. Esa asignación ya representa una reserva exclusiva. El worker sólo ejecuta el bloque asociado a ese ticket.

Un ejemplo simple es un supermercado. Elegir una tarea sería que dos repositoras miren un pizarrón y ambas decidan ir a reponer bebidas. Recibir tickets sería que una coordinadora entregue “Pasillo 3” a una y “Pasillo 7” a la otra. La segunda forma elimina la decisión distribuida sobre qué trabajo tomar.

La diferencia es importante porque separa planificación de ejecución. El allocator decide qué unidad corresponde; el worker se vuelve fungible, predecible y fácil de reemplazar. Así se reducen duplicados, carreras y desvíos, y la trazabilidad mejora porque cada resultado puede vincularse a una asignación concreta.

MINI_RESUMEN|Elegir una tarea delega la decisión al worker; recibir un ticket mecánico delega esa decisión al allocator y vuelve exclusiva la asignación.
