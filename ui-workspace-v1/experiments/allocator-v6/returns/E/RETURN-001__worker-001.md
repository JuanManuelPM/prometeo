# EXP-007-E RETURN-001

EXP|EXP-007-E
worker_id|exp007-e-w001-47456c
worker_slot|001
launch_id|exp007-e-1-47456ce2-205b-4092-a557-021143c3e8f4
ticket|001
block|BLOCK-001
launch_clicked_at|2026-10-07T18:00:11.773Z
worker_started_at|2026-10-07T18:00:41.261Z
registered_at|2026-10-07T18:00:46.920Z
assigned_at|2026-10-07T18:01:06.688Z
block_read_start|2026-10-07T18:01:23.221Z
block_read_end|2026-10-07T18:01:23.539Z
local_work_start|2026-10-07T18:01:23.539Z
local_work_end|2026-10-07T18:01:41.443Z
publish_start|2026-10-07T18:01:41.443Z

## counters
tickets_received|1
returns_created|0
blocks_completed|0
external_work_calls|7
telemetry_writes|1
telemetry_failures|0
revision_conflicts|0
retries|0
forbidden_ops|0
critical_errors|0

## ANSWER

Un repartidor central funciona como una ventanilla única: cada worker pide una tarea y recibe una distinta. Así, la decisión de “quién hace qué” ocurre en un solo lugar, en vez de quedar librada a que varios workers miren la misma lista y elijan por su cuenta.

Imaginá una pizzería con dos repartidores, Ana y Bruno. Hay cuatro pedidos esperando. Si ambos miran una hoja pegada en la pared y ven primero el pedido de la calle Corrientes, los dos podrían salir con la idea de entregarlo. El resultado sería absurdo: dos personas gastando tiempo en el mismo pedido mientras otro cliente sigue esperando.

Con un repartidor central, Ana pide trabajo y el sistema le asigna Corrientes. En ese mismo instante, ese pedido deja de estar disponible. Cuando Bruno pide trabajo, recibe el siguiente, por ejemplo Callao. Ninguno necesita saber qué está haciendo el otro; sólo confían en que el centro entrega cada tarea una sola vez.

La clave es que la asignación sea atómica: consultar y reservar deben ocurrir como una única operación. Si dos workers preguntan casi al mismo tiempo, uno gana una tarea y el otro recibe otra. Eso evita duplicados sin coordinación manual entre ellos.

MINI_RESUMEN|Un repartidor central evita duplicados al asignar y reservar cada tarea una sola vez antes de ofrecer la siguiente.
