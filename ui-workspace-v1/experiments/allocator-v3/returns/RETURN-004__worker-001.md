EXP-004
ticket|004
block|BLOCK-004
worker_id|exp004-20261007T111451976Z-1lna36
worker_slot|001
assigned_worker_at|2026-10-07T11:22:07.433Z
local_work_started_worker_at|2026-10-07T11:22:14.838Z
local_work_ended_worker_at|2026-10-07T11:23:15.547Z

RESPUESTA|
Conviene que cada worker tenga una sola tarea activa porque la prueba intenta medir asignación, ejecución y cierre sin mezclar estados. Si un worker recibe el bloque 4 y, antes de terminarlo, reserva también el 5 y el 6, esos tickets quedan ocupados aunque todavía no haya producido nada para ellos. Otro worker podría quedarse sin trabajo visible mientras existen tareas “tomadas” pero inmóviles.

Con una sola tarea activa, el recorrido es simple: el worker recibe un ticket, lee sólo ese bloque, redacta, publica su RETURN, lo verifica y recién entonces pide el siguiente. Eso hace que cada transición sea fácil de auditar y que los timestamps tengan un significado claro. También reduce el costo de un fallo: si el worker se corta, como máximo queda afectada una tarea en curso, no una pequeña colección de trabajos reservados.

Además, esta restricción evita que la velocidad aparente se infle artificialmente. Reservar cinco tareas no equivale a completar cinco tareas. En un benchmark con dos workers, lo importante es observar cuánto trabajo real atraviesa el circuito completo y cómo se reparten los tickets sin duplicados. Una tarea activa por worker mantiene esa relación visible y comparable.

MINI_RESUMEN|Una sola tarea activa por worker evita reservas ociosas, simplifica la auditoría y hace que el progreso medido corresponda a trabajo realmente completado.
