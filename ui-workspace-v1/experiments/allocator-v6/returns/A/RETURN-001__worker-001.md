EXP-007-A
worker_id|exp007-a-w001-ed9e9f78
worker_slot|001
launch_id|exp007-a-1-ed9e9f78-588e-41cf-874d-79cae9257328
ticket|001
block|BLOCK-001
launch_clicked_at|2026-10-07T17:58:52.170Z
worker_started_at|2026-10-07T17:59:24.735Z
registered_at|2026-10-07T17:59:48.046Z
assigned_at|2026-10-07T17:59:59.171Z
block_read_start|2026-10-07T18:00:14.425Z
block_read_end|2026-10-07T18:00:14.849Z
local_work_start|2026-10-07T18:00:14.849Z
local_work_end|2026-10-07T18:00:36.683Z
publish_start|2026-10-07T18:00:36.683Z
counters|tickets_received=1;returns_created=0;blocks_completed=0;external_work_calls=6;telemetry_writes=2;telemetry_failures=0;revision_conflicts=0;retries=0;forbidden_ops=0;critical_errors=0

ANSWER
Imaginá un edificio con diez departamentos y dos repartidores que tienen que dejar paquetes. Si ambos miraran una pila común sin coordinación, podrían agarrar al mismo tiempo el paquete del departamento 4. Los dos caminarían hasta la misma puerta, uno de los dos viajes sería inútil y, peor todavía, quizá quedarían otros paquetes sin entregar.

Un repartidor central evita eso funcionando como una única ventanilla de asignación. Cada worker pide “dame la próxima tarea” y el repartidor central entrega una sola tarea disponible, marcándola como tomada antes de atender al siguiente pedido. Por ejemplo, al worker A le asigna “llevar el paquete al 4” y, cuando el worker B pregunta un instante después, ya ve esa tarea ocupada y recibe “llevar el paquete al 7”.

La clave no es que los workers sean más inteligentes ni que se comuniquen entre ellos. La clave es que existe un punto único que decide quién obtiene cada tarea y actualiza el estado de forma indivisible. Así, aunque dos workers pidan trabajo casi al mismo tiempo, sólo uno puede ganar una tarea concreta. El resultado es menos trabajo duplicado, mejor uso del tiempo y una lista de pendientes que refleja quién está haciendo qué.

MINI_RESUMEN|Un repartidor central evita duplicados asignando cada tarea una sola vez antes de ofrecer la siguiente.
