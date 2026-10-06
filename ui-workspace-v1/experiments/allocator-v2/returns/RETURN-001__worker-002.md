# RETURN-001

TICKET|001
WORKER_SLOT|002
WORKER_ID|ALLOCATOR-V2-W002-20261006T2355Z
LOCAL_STARTED_AT|2026-10-06T23:57:41.897Z
LOCAL_FINISHED_AT|2026-10-06T23:58:24.834Z
LOCAL_WORK_MS|42937
IO_COUNTERS|BLOCK_READ=1;RETURN_PUBLISH=1;RETURN_VERIFY=1

Un repartidor central evita duplicaciones porque es el único que decide qué trabajo recibe cada worker. Imaginá una pizzería con dos cadetes y diez pedidos sobre una mesa. Si ambos cadetes miran la mesa por su cuenta, pueden agarrar el mismo pedido casi al mismo tiempo. Los dos viajarían a la misma dirección mientras otro pedido queda esperando: se desperdician tiempo, combustible y capacidad.

Con un repartidor central, cada cadete pide “dame el próximo”. El repartidor mira una lista ordenada, marca un pedido como entregado al cadete A y recién después responde. Cuando el cadete B pregunta, ese pedido ya no está disponible y recibe el siguiente. La clave no es que los cadetes sean más cuidadosos, sino que existe un único punto que asigna y actualiza el estado de forma atómica.

Por ejemplo, si el pedido 7 se asigna a A, el contador avanza inmediatamente al 8. B nunca necesita saber qué eligió A ni coordinarse con él: sólo consulta al repartidor. Así se elimina la carrera por elegir tareas y cada worker puede concentrarse en ejecutar exactamente lo que recibió.

MINI_RESUMEN|Un repartidor central evita trabajo duplicado asignando cada tarea una sola vez y avanzando el estado antes de atender al siguiente worker.
