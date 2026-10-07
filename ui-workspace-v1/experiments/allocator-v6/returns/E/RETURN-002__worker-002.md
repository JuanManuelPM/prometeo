# RETURN-002__worker-002

EXP|EXP-007-E
worker_id|exp007-e-2-4f3c0f02
worker_slot|002
launch_id|exp007-e-2-4f3c0f02-2270-4ade-9d59-f2d40efd54ae
ticket|002
block|BLOCK-002
launch_clicked_at|2026-10-07T18:00:19.656Z
worker_started_at|2026-10-07T18:00:45.629Z
registered_at|2026-10-07T18:01:05.557Z
assigned_at|2026-10-07T18:01:17.297Z
block_read_start|2026-10-07T18:01:33.849Z
block_read_end|2026-10-07T18:01:34.255Z
local_work_start|2026-10-07T18:01:34.255Z
local_work_end|2026-10-07T18:01:51.052Z
publish_start|2026-10-07T18:01:51.052Z

COUNTERS
tickets_received|1
returns_created|0
blocks_completed|0
external_work_calls|9
telemetry_writes|1
telemetry_failures|0
revision_conflicts|1
retries|0
forbidden_ops|0
critical_errors|0

ANSWER
Elegir una tarea significa que el worker toma una decisión sobre qué trabajo hacer. Para hacerlo necesita mirar opciones, comparar prioridades, interpretar contexto y decidir cuál conviene. Esa libertad puede parecer útil, pero en un sistema con varios workers introduce problemas: dos pueden elegir lo mismo, ignorar tareas menos atractivas, aplicar criterios distintos o gastar tiempo coordinándose. La selección deja de ser puramente mecánica y pasa a depender del juicio local de cada worker.

Recibir un ticket asignado mecánicamente cambia esa responsabilidad. El worker no decide qué tarea merece atención: un allocator entrega un identificador concreto mediante una operación atómica. Ese ticket determina qué bloque puede leer y procesar. Si dos workers compiten al mismo tiempo, el mecanismo de asignación evita que ambos ganen el mismo ticket. Así se separan dos funciones: el sistema central decide la distribución del trabajo y cada worker se concentra en ejecutar correctamente lo que recibió.

La ventaja principal es que la coordinación se vuelve observable y verificable. Se puede contar qué tickets fueron entregados, quién recibió cada uno, qué RETURN corresponde a cada ticket y detectar huecos o duplicados sin reconstruir decisiones subjetivas.

MINI_RESUMEN|Elegir implica decidir qué hacer; recibir un ticket implica ejecutar una asignación mecánica, única y verificable.
