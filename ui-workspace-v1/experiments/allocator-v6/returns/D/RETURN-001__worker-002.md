# EXP-007-D · RETURN-001

EXP-007-D
worker_id|exp007-d-1-db4eb4bb
worker_slot|002
launch_id|exp007-d-1-db4eb4bb-c451-4d8d-8afb-a88357a86b5d
ticket|001
block|BLOCK-001
launch_clicked_at|2026-10-07T17:59:55.512Z
worker_started_at|2026-10-07T18:00:37.331Z
registered_at|2026-10-07T18:00:50.954Z
assigned_at|2026-10-07T18:00:54.099Z
block_read_start|2026-10-07T18:01:19.929Z
block_read_end|2026-10-07T18:01:20.353Z
local_work_start|2026-10-07T18:01:20.353Z
local_work_end|2026-10-07T18:01:58.640Z
publish_start|2026-10-07T18:01:58.640Z

COUNTERS
tickets_received|1
returns_created|0
blocks_completed|0
external_work_calls|8
telemetry_writes|1
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Imaginá un restaurante con varios repartidores esperando pedidos. Si cada repartidor mira por su cuenta una pila de tickets y agarra el que le parece, dos pueden terminar saliendo con copias del mismo pedido. El resultado es absurdo: dos motos gastan tiempo y combustible para entregar una sola pizza, mientras otro pedido queda esperando.

Un repartidor central, o allocator, evita eso porque es el único punto que decide quién recibe cada tarea. Cuando un worker pide trabajo, el allocator toma el próximo ticket disponible, lo marca como asignado y recién entonces se lo entrega. Si otro worker pregunta un instante después, ya ve que ese ticket no está libre y recibe el siguiente.

Por ejemplo, hay cuatro pedidos numerados 001, 002, 003 y 004. Worker A pide tarea y el repartidor central le asigna 001. Casi al mismo tiempo, Worker B pide otra. Como 001 ya quedó reservado, B recibe 002. Ninguno necesita saber qué está haciendo el otro: ambos sólo confían en una asignación atómica y exclusiva.

La clave no es que el repartidor central sea “inteligente”, sino que exista una única operación de reclamar tarea que no pueda ganarse dos veces.

MINI_RESUMEN|Un allocator central evita duplicados al reservar cada tarea de forma atómica antes de entregársela a un worker.
