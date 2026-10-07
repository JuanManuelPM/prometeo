EXP-007-B
worker_id|exp007-b-002-20261007T180002678Z-236df3
worker_slot|002
launch_id|exp007-b-1-236df3a7-1bc1-47ea-9c27-ef7d988b2117
ticket|004
block|ui-workspace-v1/experiments/allocator-v6/blocks/BLOCK-004.md
launch_clicked_at|2026-10-07T17:59:12.685Z
worker_started_at|2026-10-07T18:00:02.678Z
registered_at|2026-10-07T18:00:33.983Z
assigned_at|2026-10-07T18:02:20.856Z
block_read_start|2026-10-07T18:03:56.469Z
block_read_end|2026-10-07T18:03:56.995Z
local_work_start|2026-10-07T18:04:03.395Z
local_work_end|2026-10-07T18:04:03.395Z
publish_start|2026-10-07T18:04:10.677Z

counters|tickets_received=3;returns_created=2;blocks_completed=2;external_work_calls=35;telemetry_writes=6;telemetry_failures=3;revision_conflicts=4;retries=4;forbidden_ops=0;critical_errors=0

ANSWER|
Durante esta prueba conviene que cada worker tenga una sola tarea activa porque así resulta mucho más fácil saber qué pasó, medirlo y detectar fallas reales. Si un mismo worker mantuviera tres o cuatro tareas abiertas al mismo tiempo, una demora, un error de escritura o una devolución incompleta podría mezclarse con las demás y volver ambiguo el diagnóstico.

Con una sola tarea activa, la secuencia es clara: el worker recibe un ticket, lee únicamente ese bloque, produce la respuesta, publica su RETURN, verifica que quedó guardado y recién entonces pide otro ticket. Esa linealidad permite asociar tiempos, contadores y errores a una tarea concreta. También reduce el riesgo de que el worker confunda contenido entre bloques, publique una respuesta en el archivo equivocado o marque como completado algo que todavía estaba en proceso.

Además, esta restricción hace que el experimento mida mejor al allocator y al protocolo, no la capacidad del worker para hacer multitarea interna. La concurrencia que interesa ocurre entre workers distintos, mientras cada uno mantiene una unidad de trabajo simple y trazable. Así, si algo falla, se puede ubicar con precisión en REGISTER, GET_NEXT, lectura, publicación o verificación, en vez de investigar una maraña de tareas superpuestas.

MINI_RESUMEN|Una sola tarea activa por worker mantiene la prueba trazable, evita mezclar estados y permite atribuir cada error o demora a una operación concreta.
