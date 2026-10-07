# EXP-007-C RETURN

EXP|EXP-007-C
VARIANT|C
worker_id|exp007-c-w001-3139ba96
worker_slot|001
launch_id|exp007-c-1-3139ba96-57b8-40a9-8e55-e52aebb142fb
ticket|003
block|BLOCK-003
launch_clicked_at|2026-10-07T17:59:37.338Z
worker_started_at|2026-10-07T18:00:00.716Z
registered_at|2026-10-07T18:00:12.375Z
assigned_at|2026-10-07T18:02:38.181Z
block_read_start|2026-10-07T18:02:51.236Z
block_read_end|2026-10-07T18:02:51.852Z
local_work_start|2026-10-07T18:02:51.852Z
local_work_end|2026-10-07T18:03:01.385Z
publish_start|2026-10-07T18:03:01.385Z
counters|tickets_received=3;returns_created=2;blocks_completed=2;external_work_calls=18;telemetry_writes=3;telemetry_failures=0;revision_conflicts=0;retries=2;forbidden_ops=0;critical_errors=0

ANSWER|
Un allocator tiene que garantizar una asignación atómica y exclusiva. Eso significa que “leer cuál es el próximo ticket” y “marcarlo como entregado” no pueden ocurrir como dos pasos independientes visibles para otros workers. Si se separan, dos workers que llegan casi al mismo tiempo pueden leer el mismo número antes de que alguno lo cambie.

Por ejemplo, supongamos que NEXT_TICKET vale 17. Worker A lo lee y, unos milisegundos después, Worker B también. Si ambos pueden avanzar el contador sin comprobar que el estado sigue siendo el que observaron, los dos podrían creer que recibieron el Ticket 17.

La solución es usar una operación condicional tipo compare-and-swap. Cada worker lee el valor junto con una versión del estado. Luego intenta cambiar 17 por 18 sólo si esa versión todavía es la vigente. Uno de los dos gana. El otro recibe un conflicto de revisión, vuelve a leer y encuentra 18; entonces intenta reservar el 18.

La propiedad esencial es, por tanto, la linealización de la asignación: cada ticket debe tener un único instante lógico en el que pasa de disponible a asignado. Así se preserva la unicidad incluso cuando las solicitudes llegan casi simultáneamente.

MINI_RESUMEN|Un allocator evita tickets duplicados cuando la lectura y reserva del siguiente ticket forman una transición atómica, exclusiva y validada contra el estado vigente.
