# RETURN-009

ticket: 009
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-009.md
local_work_started_at: 2026-10-07T00:04:38.182Z
local_work_finished_at: 2026-10-07T00:05:24.182Z
local_work_duration_ms: 46000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

El problema pendiente es que el ticket quedaría reclamado pero sin resultado durable. El allocator habría avanzado su contador, por lo que ningún worker posterior recibiría automáticamente ese mismo número, pero tampoco existiría el RETURN que demuestra que el bloque fue completado. En otras palabras, aparecería un hueco entre “asignado” y “terminado”.

En esta prueba eso no se resuelve todavía porque, por diseño, no se están implementando leases ni requeue. Un lease permitiría considerar vencida una asignación si el worker deja de renovar su presencia; un mecanismo de requeue podría entonces volver a poner ese bloque en circulación. Sin algo equivalente, el sistema no puede distinguir de forma automática entre un worker que sigue trabajando lentamente y uno que desapareció definitivamente.

La consecuencia práctica es que la unicidad del claim no alcanza para garantizar finalización. El allocator evita que dos workers tomen el mismo ticket al mismo tiempo, pero no asegura que cada ticket produzca un RETURN. Para cerrar ese problema haría falta una política explícita de expiración, detección de abandono y reasignación, acompañada por fencing o alguna protección contra un worker viejo que reaparezca tarde y publique después de que otro ya reintentó el bloque.

MINI_RESUMEN|Sin leases o requeue, un worker que desaparece puede dejar un ticket consumido pero sin RETURN, creando un hueco durable entre asignación y finalización.
