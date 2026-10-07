# EXP-007-D · RETURN-003

EXP-007-D
worker_id|exp007-d-1-db4eb4bb
worker_slot|002
launch_id|exp007-d-1-db4eb4bb-c451-4d8d-8afb-a88357a86b5d
ticket|003
block|BLOCK-003
launch_clicked_at|2026-10-07T17:59:55.512Z
worker_started_at|2026-10-07T18:00:37.331Z
registered_at|2026-10-07T18:00:50.954Z
assigned_at|2026-10-07T18:02:07.261Z
block_read_start|2026-10-07T18:02:20.739Z
block_read_end|2026-10-07T18:02:21.088Z
local_work_start|2026-10-07T18:02:21.088Z
local_work_end|2026-10-07T18:02:43.485Z
publish_start|2026-10-07T18:02:43.485Z

COUNTERS
tickets_received|2
returns_created|1
blocks_completed|1
external_work_calls|15
telemetry_writes|3
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Para que un allocator entregue tickets únicos bajo concurrencia, la propiedad esencial es que el reclamo sea atómico: leer qué ticket sigue y reservarlo debe ocurrir como una sola decisión indivisible. No alcanza con que ambos workers “lean rápido” ni con confiar en que llegarán en distinto orden.

Supongamos que NEXT_TICKET vale 003 y dos workers lo leen casi al mismo tiempo. Si cada uno pudiera leer 003 y después, por separado, escribir 004, los dos creerían haber ganado el mismo ticket. El allocator falló aunque su contador termine pareciendo correcto.

La solución es un compare-and-swap, una transacción o cualquier mecanismo equivalente: el worker intenta cambiar NEXT_TICKET de 003 a 004 sólo si el valor o la revisión siguen siendo exactamente los que leyó. Uno de los dos gana esa condición y recibe 003. El otro detecta que el estado cambió, vuelve a leer y recién entonces compite por 004.

Por eso la propiedad importante no es simplemente “tener un contador central”, sino garantizar exclusión en la transición de estado. Cada ticket debe pasar de libre a asignado una sola vez, incluso cuando las solicitudes sean prácticamente simultáneas.

MINI_RESUMEN|El allocator debe hacer el reclamo de cada ticket de forma atómica para que sólo un worker pueda ganar cada transición de estado.
