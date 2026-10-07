EXP-007-B
worker_id|exp007-b-002-20261007T180002678Z-236df3
worker_slot|002
launch_id|exp007-b-1-236df3a7-1bc1-47ea-9c27-ef7d988b2117
ticket|001
block|ui-workspace-v1/experiments/allocator-v6/blocks/BLOCK-001.md
launch_clicked_at|2026-10-07T17:59:12.685Z
worker_started_at|2026-10-07T18:00:02.678Z
registered_at|2026-10-07T18:00:33.983Z
assigned_at|2026-10-07T18:01:08.327Z
block_read_start|2026-10-07T18:01:22.211Z
block_read_end|2026-10-07T18:01:22.541Z
local_work_start|2026-10-07T18:01:33.691Z
local_work_end|2026-10-07T18:01:33.692Z
publish_start|2026-10-07T18:01:45.367Z

counters|tickets_received=1;returns_created=0;blocks_completed=0;external_work_calls=11;telemetry_writes=2;telemetry_failures=1;revision_conflicts=1;retries=1;forbidden_ops=0;critical_errors=0

ANSWER|
Un repartidor central evita duplicados porque mantiene una única lista de tareas pendientes y decide quién recibe cada una. Imaginá un restaurante con dos cadetes esperando pedidos. Si ambos miran una hoja desordenada y eligen por su cuenta, los dos podrían ver “llevar pedido 42 a Corrientes 1200” y salir con el mismo encargo. Resultado: trabajo duplicado, otro pedido queda sin hacer y nadie sabe con certeza quién era responsable.

Con un repartidor central, el pedido 42 se entrega primero a un solo cadete y, en ese mismo momento, se marca como asignado. Cuando el segundo cadete pide trabajo, el repartidor ya no le ofrece el 42: le da el 43 o le dice que no quedan pedidos. La clave no es que los workers sean más cuidadosos, sino que exista un único punto que haga la asignación de forma atómica: consultar y reservar ocurren como una sola decisión.

En sistemas con varios workers pasa lo mismo. Cada worker pide la próxima tarea al allocator, y el allocator avanza su contador o cambia el estado antes de responder. Así dos workers pueden trabajar en paralelo sin necesitar coordinarse entre ellos ni adivinar qué está haciendo el otro.

MINI_RESUMEN|Un repartidor central evita duplicados porque asigna y reserva cada tarea una sola vez antes de ofrecérsela a otro worker.
