EXP-006
WORKER_ID|exp006-20261007T140329086Z-30f38b
WORKER_SLOT|001
TICKET|005
BLOCK|BLOCK-005

TRACE|get_next_start|2026-10-07T14:08:47.480Z
TRACE|get_next_end|2026-10-07T14:08:51.130Z
TRACE|assigned_at|2026-10-07T14:08:51.130Z
TRACE|block_read_start|2026-10-07T14:09:21.811Z
TRACE|block_read_end|2026-10-07T14:09:22.149Z
TRACE|local_work_start|2026-10-07T14:09:22.149Z
TRACE|local_work_end|2026-10-07T14:09:59.803Z
TRACE|return_publish_start|2026-10-07T14:09:59.803Z

COUNTER|external_work_calls|16
COUNTER|telemetry_writes|6
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|0

ANSWER
Para poder auditar un ticket después, hace falta guardar lo suficiente para reconstruir tres cosas: qué trabajo era, quién lo tomó y cómo terminó. Como mínimo, el ticket debería tener un identificador único, una referencia exacta al bloque o tarea asignada, el identificador del worker que lo recibió y la hora de asignación.

También conviene registrar el estado final del ticket y una referencia al resultado producido. Por ejemplo, si el ticket 005 correspondía a BLOCK-005, debería quedar asociado a un RETURN concreto o a una marca explícita de error. Junto con eso, hace falta la hora de finalización, porque permite saber cuánto duró el trabajo y ordenar los hechos si hubo varios workers activos al mismo tiempo.

Para verificar que no hubo una doble asignación, es útil conservar además el dato de la operación de claim o la versión del allocator con la que se ganó el ticket. No hace falta almacenar cada detalle interno del razonamiento del worker. La auditoría necesita hechos observables y verificables: identidad, tarea, tiempos, estado y resultado. Con esos campos se puede reconstruir la vida completa del ticket sin depender de la memoria del proceso que lo ejecutó.

MINI_RESUMEN|Un ticket auditable debe conservar identidad, tarea, worker, tiempos, estado y referencia verificable al resultado.
