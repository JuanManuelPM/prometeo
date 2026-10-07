EXP-006
WORKER_ID|exp006-20261007140533766-guv93u
WORKER_SLOT|002
TICKET|006
BLOCK|BLOCK-006

TRACE|get_next_start|2026-10-07T14:09:16.253Z
TRACE|get_next_end|2026-10-07T14:09:19.048Z
TRACE|assigned_at|2026-10-07T14:09:19.048Z
TRACE|block_read_start|2026-10-07T14:09:22.549Z
TRACE|block_read_end|2026-10-07T14:09:22.885Z
TRACE|local_work_start|2026-10-07T14:09:22.885Z
TRACE|local_work_end|2026-10-07T14:10:10.593Z
TRACE|return_publish_start|2026-10-07T14:10:10.593Z

COUNTER|external_work_calls|18
COUNTER|telemetry_writes|6
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|1

ANSWER
Que un worker sea fungible significa que no depende de una identidad especial, de una tarea fija ni de conocimiento privilegiado para ser útil. Mientras cumpla el mismo contrato operativo que los demás, puede recibir cualquier ticket compatible y producir un resultado en el formato esperado. Si un worker deja de estar disponible, otro equivalente puede ocupar su lugar sin rediseñar todo el sistema.

Esa propiedad ayuda a escalar porque permite aumentar capacidad agregando más workers idénticos en lugar de crear roles nuevos para cada aumento de carga. El allocator distribuye tickets y los workers ejecutan; por lo tanto, sumar un worker aumenta la cantidad potencial de tareas procesadas en paralelo sin cambiar la lógica central.

La fungibilidad también reduce dependencias frágiles. El sistema no queda atado a “el worker que sabe hacer X” ni necesita conservar una sesión específica para continuar. Esto simplifica reemplazos, recuperación ante fallas y pruebas de concurrencia.

En una prueba como ésta, la idea es especialmente útil: cada worker puede tomar el próximo ticket disponible, procesar una sola unidad y devolverla. La coordinación queda en el mecanismo de asignación, mientras los workers permanecen intercambiables y simples.

MINI_RESUMEN|Un worker fungible es reemplazable e intercambiable, lo que permite sumar capacidad sin crear dependencias especiales ni rediseñar la coordinación.
