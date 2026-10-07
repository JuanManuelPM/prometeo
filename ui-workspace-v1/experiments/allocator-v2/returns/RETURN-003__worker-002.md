# RETURN-003

TICKET|003
WORKER_SLOT|002
WORKER_ID|ALLOCATOR-V2-W002-20261006T2355Z
LOCAL_STARTED_AT|2026-10-06T23:59:35.290Z
LOCAL_FINISHED_AT|2026-10-07T00:00:19.293Z
LOCAL_WORK_MS|44003
IO_COUNTERS|BLOCK_READ=1;RETURN_PUBLISH=1;RETURN_VERIFY=1

La propiedad clave es que la asignación sea atómica: leer el próximo número y reservarlo tiene que comportarse como una sola operación indivisible. No alcanza con que cada worker lea un contador y después lo incremente, porque dos workers pueden leer el mismo valor antes de que alguno escriba el siguiente.

Un allocator robusto puede lograrlo con una actualización condicional sobre una versión o revisión. Supongamos que el contador dice 004. Los workers A y B llegan casi juntos y ambos leen 004 junto con la misma revisión R. A intenta cambiar 004 por 005 indicando “hacelo sólo si la revisión sigue siendo R” y gana. En ese instante cambia también la revisión. Cuando B intenta hacer exactamente lo mismo con R, su escritura falla porque el estado ya fue modificado.

Lo importante viene después: B no puede conservar el 004 ni asumir que le pertenece. Debe volver a leer el allocator, encontrar ahora 005 y competir por ese ticket con la revisión nueva. Así, incluso con llegadas prácticamente simultáneas, sólo una actualización puede confirmar cada número.

Esta propiedad suele describirse como compare-and-swap, control de concurrencia optimista o, más conceptualmente, una asignación linealizable: cada ticket tiene un único punto efectivo de adjudicación.

MINI_RESUMEN|Un allocator entrega tickets únicos cuando la reserva es atómica y cualquier worker que pierde una actualización condicional relee el estado antes de intentar otra vez.
