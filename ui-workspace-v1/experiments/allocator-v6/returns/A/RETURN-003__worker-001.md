EXP-007-A
worker_id|exp007-a-w001-ed9e9f78
worker_slot|001
launch_id|exp007-a-1-ed9e9f78-588e-41cf-874d-79cae9257328
ticket|003
block|BLOCK-003
launch_clicked_at|2026-10-07T17:58:52.170Z
worker_started_at|2026-10-07T17:59:24.735Z
registered_at|2026-10-07T17:59:48.046Z
assigned_at|2026-10-07T18:01:05.596Z
block_read_start|2026-10-07T18:01:17.625Z
block_read_end|2026-10-07T18:01:18.288Z
local_work_start|2026-10-07T18:01:18.288Z
local_work_end|2026-10-07T18:01:29.644Z
publish_start|2026-10-07T18:01:29.644Z
counters|tickets_received=2;returns_created=1;blocks_completed=1;external_work_calls=11;telemetry_writes=4;telemetry_failures=0;revision_conflicts=0;retries=0;forbidden_ops=0;critical_errors=0

ANSWER
El allocator tiene que cumplir una propiedad de exclusión atómica al asignar cada ticket. Eso significa que leer el próximo ticket disponible y marcarlo como tomado no pueden ser dos pasos independientes que otros workers puedan intercalar.

Supongamos que el próximo ticket es el 12 y llegan dos workers casi al mismo tiempo. Si ambos leen “12 disponible” antes de que ninguno actualice el estado, los dos podrían creer que lo ganaron. Para evitarlo, el allocator debe hacer una operación del tipo “cambiá NEXT_TICKET de 12 a 13 sólo si todavía vale 12 y el estado que leí sigue siendo el actual”. Esa condición se valida de manera atómica.

Entonces, uno de los workers gana la actualización y recibe el ticket 12. El otro intenta la misma operación, pero falla porque el valor o la revisión ya cambió. Ese segundo worker vuelve a leer el allocator y pasa a competir por el ticket 13.

La propiedad importante, por lo tanto, es que para cada valor sólo pueda existir un ganador válido. Los conflictos concurrentes deben convertirse en reintentos, no en dos asignaciones exitosas del mismo ticket. Así se conserva unicidad incluso cuando las solicitudes llegan con milisegundos de diferencia.

MINI_RESUMEN|Un allocator seguro entrega tickets únicos usando una actualización condicional atómica con un solo ganador por valor.
