EXP-006
WORKER_ID|exp006-20261007T140329086Z-30f38b
WORKER_SLOT|001
TICKET|001
BLOCK|BLOCK-001

TRACE|get_next_start|2026-10-07T14:04:24.111Z
TRACE|get_next_end|2026-10-07T14:05:08.857Z
TRACE|assigned_at|2026-10-07T14:05:08.857Z
TRACE|block_read_start|2026-10-07T14:05:44.809Z
TRACE|block_read_end|2026-10-07T14:05:45.121Z
TRACE|local_work_start|2026-10-07T14:05:45.121Z
TRACE|local_work_end|2026-10-07T14:06:17.895Z
TRACE|return_publish_start|2026-10-07T14:06:17.895Z

COUNTER|external_work_calls|6
COUNTER|telemetry_writes|2
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|0

ANSWER
Imaginá una pizzería con dos repartidores esperando pedidos. Si ambos miran por separado una lista sin coordinación, pueden ver al mismo tiempo “llevar una pizza a Bartolomé Mitre 1444”, asumir que está libre y salir los dos hacia la misma dirección. El resultado es absurdo: dos personas gastan tiempo y combustible para cumplir una sola entrega, mientras otro pedido queda esperando.

Un repartidor central evita eso porque es el único que asigna el próximo pedido disponible. Cuando llega el repartidor A, el central le entrega el pedido 001 y, en ese mismo acto, lo marca como asignado. Cuando un instante después llega el repartidor B, ya no puede recibir el 001: obtiene el 002. Ninguno tiene que preguntarle al otro qué está haciendo ni comparar listas.

Con workers pasa lo mismo. El allocator funciona como ese repartidor central: mantiene un contador o cola común y entrega cada ticket una sola vez mediante una actualización atómica. Aunque dos workers pidan trabajo casi simultáneamente, sólo uno puede ganar un número concreto; el otro vuelve a leer el estado actualizado y recibe el siguiente. Así se elimina la duplicación sin depender de coordinación directa entre workers.

MINI_RESUMEN|Un allocator central asigna cada ticket atómicamente para que dos workers no puedan quedarse con la misma tarea.
