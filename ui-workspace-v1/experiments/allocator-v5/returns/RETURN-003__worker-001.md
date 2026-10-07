EXP-006
WORKER_ID|exp006-20261007T140329086Z-30f38b
WORKER_SLOT|001
TICKET|003
BLOCK|BLOCK-003

TRACE|get_next_start|2026-10-07T14:07:28.933Z
TRACE|get_next_end|2026-10-07T14:07:31.632Z
TRACE|assigned_at|2026-10-07T14:07:31.632Z
TRACE|block_read_start|2026-10-07T14:07:34.258Z
TRACE|block_read_end|2026-10-07T14:07:34.629Z
TRACE|local_work_start|2026-10-07T14:07:34.629Z
TRACE|local_work_end|2026-10-07T14:08:14.432Z
TRACE|return_publish_start|2026-10-07T14:08:14.432Z

COUNTER|external_work_calls|11
COUNTER|telemetry_writes|4
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|0

ANSWER
La propiedad clave es la asignación atómica: para cada número de ticket, el allocator debe garantizar que como máximo un worker pueda confirmar que lo obtuvo. No alcanza con que ambos lean una lista y después la modifiquen, porque dos workers pueden leer “NEXT_TICKET|003” casi al mismo tiempo y creer que el 003 les pertenece.

La operación correcta combina la lectura del estado esperado con una escritura condicional. Por ejemplo, cada worker lee el valor 003 junto con una versión del documento. Luego intenta cambiar 003 por 004 sólo si esa versión sigue siendo la actual. Si el worker A gana primero, el cambio se aplica. Cuando el worker B intenta hacer lo mismo usando la versión vieja, su escritura debe fallar por conflicto; entonces vuelve a leer y encuentra 004.

Así, el allocator no necesita saber cuál worker es “más rápido” de antemano. Sólo necesita que el cambio de estado sea indivisible y condicionado a que nadie lo haya modificado desde la lectura previa. Esa exclusión sobre cada transición hace que un mismo ticket no pueda ser entregado dos veces, incluso con solicitudes prácticamente simultáneas.

MINI_RESUMEN|El allocator debe asignar cada ticket mediante una actualización atómica y condicional que sólo un worker pueda ganar.
