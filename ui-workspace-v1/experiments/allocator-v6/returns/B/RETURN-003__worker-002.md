EXP-007-B
worker_id|exp007-b-002-20261007T180002678Z-236df3
worker_slot|002
launch_id|exp007-b-1-236df3a7-1bc1-47ea-9c27-ef7d988b2117
ticket|003
block|ui-workspace-v1/experiments/allocator-v6/blocks/BLOCK-003.md
launch_clicked_at|2026-10-07T17:59:12.685Z
worker_started_at|2026-10-07T18:00:02.678Z
registered_at|2026-10-07T18:00:33.983Z
assigned_at|2026-10-07T18:02:15.913Z
block_read_start|2026-10-07T18:02:55.093Z
block_read_end|2026-10-07T18:02:55.437Z
local_work_start|2026-10-07T18:03:14.727Z
local_work_end|2026-10-07T18:03:14.727Z
publish_start|2026-10-07T18:03:24.219Z

counters|tickets_received=3;returns_created=1;blocks_completed=1;external_work_calls=30;telemetry_writes=4;telemetry_failures=2;revision_conflicts=4;retries=4;forbidden_ops=0;critical_errors=0

ANSWER|
La propiedad clave es que la asignación de un ticket sea atómica: leer cuál es el próximo ticket disponible y marcarlo como consumido tiene que ocurrir como una sola operación indivisible. Si dos workers llegan casi al mismo tiempo, no alcanza con que ambos lean “próximo ticket = 17” y después intenten avanzar el contador, porque los dos podrían creer que ganaron el 17.

Un allocator correcto evita eso usando un mecanismo como compare-and-swap, una transacción serializable o un lock exclusivo muy corto. Cada worker intenta cambiar el estado desde un valor exacto conocido, por ejemplo de NEXT_TICKET=17 a NEXT_TICKET=18. Sólo uno puede lograr ese cambio contra esa versión del estado. Ese worker recibe el ticket 17. El otro detecta que la versión cambió, vuelve a leer y recién entonces puede intentar obtener el 18.

La propiedad importante, entonces, no es simplemente “tener un contador”, sino garantizar exclusión lógica en el instante de asignación. Desde afuera puede haber concurrencia, pero las asignaciones se comportan como si hubieran ocurrido en un orden único. Eso asegura que cada número se entregue como máximo una vez, incluso cuando las solicitudes llegan con milisegundos de diferencia.

MINI_RESUMEN|Un allocator entrega tickets únicos cuando la lectura y reserva del próximo ticket forman una operación atómica que sólo un worker puede ganar.
