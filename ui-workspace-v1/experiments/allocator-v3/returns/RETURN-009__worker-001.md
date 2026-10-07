EXP-004
ticket|009
block|BLOCK-009
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:47:30.634Z
local_work_started_worker_at|2026-10-07T11:47:36.391Z
local_work_ended_worker_at|2026-10-07T11:48:48.928Z

RESPUESTA|
Si un worker desaparece después de recibir un ticket pero antes de publicar el RETURN, queda un trabajo huérfano. El allocator ya avanzó su contador y considera ese ticket entregado, pero no existe un resultado durable que demuestre que la tarea terminó. Los demás workers seguirán pidiendo tickets nuevos y, sin un mecanismo adicional, nadie volverá automáticamente a ese bloque.

Eso significa que el sistema evita duplicados durante la asignación normal, pero todavía no garantiza recuperación frente a la desaparición de un worker. El problema no es sólo detectar que falta un RETURN. También hay que decidir cuándo asumir que el worker realmente murió y cuándo todavía podría volver tarde con un resultado. Reasignar demasiado pronto puede producir dos ejecuciones legítimas del mismo ticket; no reasignar nunca puede dejar un agujero permanente.

La solución futura suele requerir algún concepto de lease o vencimiento, señales de liveness y una forma de requeue. Además, conviene usar una generación o fencing token para que un RETURN tardío de la asignación vieja no pueda pisar al resultado de una reasignación más nueva.

En este experimento, ese mecanismo queda deliberadamente pendiente: se prueba primero la asignación atómica sin duplicados, no la recuperación de tickets huérfanos.

MINI_RESUMEN|Sin leases o requeue, un worker que desaparece tras recibir un ticket puede dejar esa tarea huérfana para siempre.
