# EXP-007-C RETURN

EXP|EXP-007-C
VARIANT|C
worker_id|exp007-c-w001-3139ba96
worker_slot|001
launch_id|exp007-c-1-3139ba96-57b8-40a9-8e55-e52aebb142fb
ticket|004
block|BLOCK-004
launch_clicked_at|2026-10-07T17:59:37.338Z
worker_started_at|2026-10-07T18:00:00.716Z
registered_at|2026-10-07T18:00:12.375Z
assigned_at|2026-10-07T18:03:22.841Z
block_read_start|2026-10-07T18:03:37.710Z
block_read_end|2026-10-07T18:03:38.049Z
local_work_start|2026-10-07T18:03:38.049Z
local_work_end|2026-10-07T18:03:50.120Z
publish_start|2026-10-07T18:03:50.120Z
counters|tickets_received=4;returns_created=3;blocks_completed=3;external_work_calls=23;telemetry_writes=4;telemetry_failures=0;revision_conflicts=0;retries=2;forbidden_ops=0;critical_errors=0

ANSWER|
Durante esta prueba conviene que cada worker tenga una sola tarea activa porque así la relación entre asignación, ejecución y resultado queda inequívoca. Si un worker pudiera acumular varios tickets, sería mucho más difícil saber qué ticket está realmente trabajando, cuál quedó esperando y qué ocurrió si el proceso se corta a mitad de camino.

Con una sola tarea activa, el ciclo es simple: recibe un ticket, lee únicamente ese bloque, produce un RETURN verificable y recién entonces pide el siguiente. Esa secuencia reduce estados intermedios y hace más fácil detectar duplicados, pérdidas o bloqueos.

También mejora la medición. Si el Worker 1 tiene el Ticket 004, cualquier duración entre CLAIMED y RETURNED corresponde a esa unidad de trabajo. No hay que descontar tiempo dedicado a otros tickets ni adivinar qué operación produjo cada escritura. Para un experimento de concurrencia, esa claridad vale más que intentar maximizar trabajo en vuelo.

Además, una única tarea activa limita el daño ante una falla. Si el worker desaparece, queda como máximo un ticket afectado. Con cinco tickets preasignados, una sola caída podría inmovilizar cinco unidades aunque otros workers estuvieran libres.

MINI_RESUMEN|Una sola tarea activa por worker simplifica causalidad, medición y recuperación, y limita a un único ticket el impacto de una falla.
