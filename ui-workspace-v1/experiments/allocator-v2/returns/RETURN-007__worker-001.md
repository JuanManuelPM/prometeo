# RETURN-007

ticket: 007
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-007.md
local_work_started_at: 2026-10-07T00:03:35.847Z
local_work_finished_at: 2026-10-07T00:04:20.847Z
local_work_duration_ms: 45000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

Redactar la respuesta localmente antes de publicarla como RETURN separa claramente dos fases: pensar y escribir, por un lado, y modificar el estado compartido, por el otro. Durante la redacción el worker no necesita hacer llamadas externas, tocar el allocator ni generar artefactos parciales. Eso reduce la cantidad de I/O y evita que otros componentes vean una respuesta a medio construir.

También mejora la atomicidad práctica del RETURN. Si el contenido ya está completo en memoria, la publicación puede hacerse en una sola operación durable. Así, el artefacto compartido aparece directamente en un estado coherente, con su respuesta, resumen, metadatos y contadores, en vez de depender de varias ediciones sucesivas que podrían fallar o ser observadas entre medio.

La regla además vuelve más limpia la telemetría. Es fácil medir cuánto duró el trabajo local y distinguirlo del tiempo dedicado a BLOCK_READ, RETURN_PUBLISH y RETURN_VERIFY. Si la redacción hiciera lecturas o escrituras online constantemente, esas fronteras se mezclarían y sería más difícil saber qué parte del tiempo correspondió a razonamiento y cuál a coordinación.

Finalmente, limitar la actividad externa mientras se redacta reduce conflictos innecesarios con otros workers y mantiene el protocolo pequeño: leer una vez, trabajar aislado, publicar una vez y verificar una vez.

MINI_RESUMEN|Redactar localmente permite publicar un RETURN completo de una sola vez, con menos I/O, menos conflictos y una telemetría más clara.
