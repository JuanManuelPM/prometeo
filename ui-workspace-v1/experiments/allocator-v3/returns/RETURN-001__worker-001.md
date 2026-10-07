EXP-004
ticket|001
block|BLOCK-001
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:17:25.575Z
local_work_started_worker_at|2026-10-07T11:18:49.538Z
local_work_ended_worker_at|2026-10-07T11:19:20.077Z

RESPUESTA|
Un repartidor central evita duplicados porque es el único que decide quién recibe cada trabajo. Imaginá una pizzería con dos cadetes y diez pedidos listos. Si cada cadete mira la mesa y elige por su cuenta, ambos pueden agarrar el mismo pedido porque lo vieron disponible casi al mismo tiempo. Resultado: dos personas viajan a la misma dirección mientras otro cliente sigue esperando.

Con un repartidor central, el proceso cambia. El cadete A pregunta “¿qué me toca?”. El repartidor marca el pedido 1 como asignado y se lo entrega. Un instante después, el cadete B pregunta lo mismo. Como el pedido 1 ya quedó registrado como tomado, el repartidor le entrega el pedido 2. Ninguno necesita saber qué está haciendo el otro: sólo confían en una fuente única que entrega trabajos distintos de manera atómica.

La parte importante es que “leer qué sigue” y “reservarlo” no pueden quedar separados sin control. Si dos workers leen el mismo número antes de que alguien lo cambie, aparece el duplicado. El repartidor central convierte esa decisión en una sola secuencia ordenada: cada ticket se entrega una vez y el siguiente worker recibe el siguiente disponible.

MINI_RESUMEN|Un repartidor central evita duplicados asignando cada tarea una sola vez antes de ofrecer la siguiente.
