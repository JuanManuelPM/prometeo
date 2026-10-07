# EXP-007-B RETURN-002

EXP|EXP-007-B
worker_id|exp007-b-w001-c847d4
worker_slot|001
launch_id|exp007-b-2-c847d4fd-d9b1-4c69-a5d0-44262218480d
ticket|002
block|BLOCK-002
launch_clicked_at|2026-10-07T17:59:22.388Z
worker_started_at|2026-10-07T18:00:37.308Z
registered_at|2026-10-07T18:00:37.308Z
assigned_at|2026-10-07T18:01:30.359Z
block_read_start|2026-10-07T18:02:18.897Z
block_read_end|2026-10-07T18:02:19.554Z
local_work_start|2026-10-07T18:02:22.148Z
local_work_end|2026-10-07T18:02:22.148Z
publish_start|2026-10-07T18:02:22.148Z

counters|{"tickets_received":1,"returns_created":0,"blocks_completed":0,"external_work_calls":12,"telemetry_writes":1,"telemetry_failures":2,"revision_conflicts":0,"retries":1,"forbidden_ops":1}

ANSWER|
Elegir una tarea significa que el worker toma una decisión de ruteo: inspecciona opciones, compara prioridades y decide por su cuenta qué trabajo hacer. Eso introduce criterio local donde debería existir coordinación global. Dos workers pueden elegir lo mismo, ignorar tareas menos atractivas, interpretar distinto la prioridad o gastar tiempo explorando antes de producir algo.

Recibir un ticket asignado mecánicamente es lo contrario. El allocator decide qué unidad corresponde y el worker se limita a ejecutar exactamente esa unidad. El ticket funciona como una asignación única y trazable: identifica el bloque, permite medir cuándo fue reclamado, evita duplicaciones y conserva una secuencia reproducible de trabajo. También separa responsabilidades. El allocator administra disponibilidad, orden y exclusión; el worker aporta capacidad de ejecución.

Esta diferencia importa especialmente cuando hay varios workers concurrentes. Si cada uno elige, la coordinación depende de decisiones independientes y puede aparecer colisión, starvation o trabajo fuera de prioridad. Si cada uno recibe un ticket atómico, la distribución queda centralizada y verificable. El worker no necesita comprender toda la cola ni buscar “algo útil”; sólo debe completar bien lo que recibió y volver a pedir el siguiente ticket.

MINI_RESUMEN|Elegir una tarea descentraliza el ruteo; recibir un ticket mecánico separa asignación y ejecución, reduce colisiones y vuelve el trabajo trazable.
