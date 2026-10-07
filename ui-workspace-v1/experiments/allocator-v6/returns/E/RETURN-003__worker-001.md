# EXP-007-E RETURN-003

EXP|EXP-007-E
worker_id|exp007-e-w001-47456c
worker_slot|001
launch_id|exp007-e-1-47456ce2-205b-4092-a557-021143c3e8f4
ticket|003
block|BLOCK-003
launch_clicked_at|2026-10-07T18:00:11.773Z
worker_started_at|2026-10-07T18:00:41.261Z
registered_at|2026-10-07T18:00:46.920Z
assigned_at|2026-10-07T18:02:07.355Z
block_read_start|2026-10-07T18:02:23.307Z
block_read_end|2026-10-07T18:02:23.667Z
local_work_start|2026-10-07T18:02:23.667Z
local_work_end|2026-10-07T18:02:37.178Z
publish_start|2026-10-07T18:02:37.178Z

## counters
tickets_received|2
returns_created|1
blocks_completed|1
external_work_calls|14
telemetry_writes|3
telemetry_failures|0
revision_conflicts|0
retries|0
forbidden_ops|0
critical_errors|0

## ANSWER

Para que un allocator entregue tickets únicos bajo concurrencia, la asignación debe ser atómica: leer el próximo ticket y reservarlo tiene que comportarse como una sola decisión indivisible. No alcanza con que cada worker lea un contador y después lo incremente por separado, porque dos workers podrían leer el mismo valor antes de que alguno lo cambie.

Por ejemplo, si NEXT_TICKET vale 003 y llegan dos workers casi simultáneamente, ambos podrían leer 003. Si luego los dos escriben 004 sin control de concurrencia, los dos creerían haber ganado el ticket 003. El allocator falló aunque el contador final parezca correcto.

La solución es usar una operación condicional, como compare-and-swap. Cada worker lee 003 junto con una versión del estado e intenta cambiarlo a 004 sólo si esa versión sigue siendo la actual. Uno de los dos cambios gana. El otro recibe un conflicto de revisión, vuelve a leer, encuentra 004 y compite por el siguiente ticket.

La propiedad importante es la exclusión lógica de cada asignación: para cada valor del contador puede existir un solo ganador observable. Así, dos solicitudes concurrentes se serializan sin necesitar que los workers se coordinen entre sí ni que haya un orden humano previo.

MINI_RESUMEN|Un allocator seguro debe reservar cada ticket de forma atómica para que, aun con concurrencia, exista un único ganador por número.
