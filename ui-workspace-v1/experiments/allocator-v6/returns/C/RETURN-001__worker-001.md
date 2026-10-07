# EXP-007-C RETURN

EXP|EXP-007-C
VARIANT|C
worker_id|exp007-c-w001-3139ba96
worker_slot|001
launch_id|exp007-c-1-3139ba96-57b8-40a9-8e55-e52aebb142fb
ticket|001
block|BLOCK-001
launch_clicked_at|2026-10-07T17:59:37.338Z
worker_started_at|2026-10-07T18:00:00.716Z
registered_at|2026-10-07T18:00:12.375Z
assigned_at|2026-10-07T18:00:23.710Z
block_read_start|2026-10-07T18:00:41.497Z
block_read_end|2026-10-07T18:00:41.830Z
local_work_start|2026-10-07T18:00:41.830Z
local_work_end|2026-10-07T18:01:00.040Z
publish_start|2026-10-07T18:01:00.040Z
counters|tickets_received=1;returns_created=0;blocks_completed=0;external_work_calls=6;telemetry_writes=1;telemetry_failures=0;revision_conflicts=0;retries=0;forbidden_ops=0;critical_errors=0

ANSWER|
Imaginá una pizzería con dos repartidores, Ana y Bruno, y cuatro pedidos listos. Si ambos miran una lista compartida sin coordinación, puede pasar algo bastante humano: los dos ven “Pedido 12”, creen que está libre y salen con la misma pizza mientras el Pedido 13 envejece tristemente sobre el mostrador.

Un repartidor central, o allocator, evita eso porque es el único que entrega trabajos. Ana pide una tarea y el allocator le asigna el Pedido 12, marcándolo inmediatamente como tomado. Cuando Bruno pide la suya, ya no puede recibir el 12: obtiene el 13. La decisión ocurre en un punto único y cada asignación cambia el estado antes de que otro worker pueda reclamar lo mismo.

En sistemas concurrentes, la parte importante no es que exista una lista, sino que “leer cuál sigue” y “reservarlo” formen una operación protegida. Si dos workers compiten al mismo tiempo, sólo uno debe ganar esa transición; el otro vuelve a leer el estado actualizado y toma otro ticket.

Así, los workers siguen siendo intercambiables y simples: no necesitan coordinarse entre sí ni saber qué hace el otro. Sólo preguntan “¿qué me toca?”, ejecutan su trabajo y vuelven por el siguiente.

MINI_RESUMEN|Un allocator central evita duplicados porque asigna y reserva cada tarea de forma exclusiva antes de entregar otra.
