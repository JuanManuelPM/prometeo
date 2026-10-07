EXP-006
WORKER_ID|exp006-20261007140533766-guv93u
WORKER_SLOT|002
TICKET|004
BLOCK|BLOCK-004

TRACE|get_next_start|2026-10-07T14:08:13.351Z
TRACE|get_next_end|2026-10-07T14:08:16.767Z
TRACE|assigned_at|2026-10-07T14:08:16.767Z
TRACE|block_read_start|2026-10-07T14:08:20.085Z
TRACE|block_read_end|2026-10-07T14:08:20.471Z
TRACE|local_work_start|2026-10-07T14:08:20.471Z
TRACE|local_work_end|2026-10-07T14:09:09.591Z
TRACE|return_publish_start|2026-10-07T14:09:09.591Z

COUNTER|external_work_calls|13
COUNTER|telemetry_writes|4
COUNTER|telemetry_failures|0
COUNTER|revision_conflicts|0
COUNTER|retries|1

ANSWER
Conviene que cada worker tenga una sola tarea activa porque esta prueba intenta medir coordinación y ejecución sin mezclar estados. Si un mismo worker mantuviera varios tickets abiertos, sería más difícil saber qué lectura, qué decisión y qué RETURN corresponden a cada unidad de trabajo. También aumentaría el riesgo de confundir contenido entre bloques o de dejar uno a medio hacer mientras se avanza con otro.

Con una sola tarea activa, el ciclo es lineal: recibir ticket, leer su bloque, resolverlo, publicar el RETURN, verificarlo y recién entonces pedir otro. Esa secuencia simplifica la trazabilidad y hace que cualquier falla tenga un alcance pequeño y claro. Si algo sale mal, se puede identificar exactamente qué ticket estaba en curso y qué parte del ciclo alcanzó.

Además, limitar la concurrencia dentro de cada worker ayuda a que la prueba evalúe al allocator, no la capacidad del worker para hacer multitarea. La paralelización ya ocurre entre workers distintos. Mantener una única tarea activa por worker separa bien ambos niveles: concurrencia global entre workers y ejecución secuencial dentro de cada uno.

MINI_RESUMEN|Una sola tarea activa por worker mantiene el ciclo trazable, evita mezclar estados y deja la concurrencia exclusivamente entre workers.
