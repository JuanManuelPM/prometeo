# RETURN-002

ticket: 002
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-002.md
block_read_at: 2026-10-06T23:57:03Z
local_work_started_at: 2026-10-06T23:57:03Z
local_work_finished_at: 2026-10-06T23:57:45Z
local_work_duration_ms: 42000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

Elegir una tarea significa que el worker observa varias opciones y decide por su cuenta cuál tomar. Esa decisión introduce criterio local: puede favorecer lo fácil, repetir trabajo, ignorar prioridades globales o competir con otro worker por el mismo objetivo. También obliga a cada worker a conocer más del sistema de lo necesario, porque para elegir tiene que ver alternativas, prioridades o estados ajenos.

Recibir un ticket asignado mecánicamente cambia esa relación. El worker no decide qué conviene hacer: ejecuta una operación atómica sobre un contador o allocator, obtiene un número único y ese número determina exactamente qué bloque puede leer y procesar. Su autonomía queda limitada al trabajo dentro del bloque, no al routing.

La ventaja principal es que la coordinación se vuelve verificable. Dos workers pueden competir por el siguiente ticket sin negociar entre sí y, si la asignación es atómica, cada uno termina con un bloque distinto. Además, el worker no necesita explorar tareas futuras ni reconstruir prioridades globales. Eso reduce duplicación, sesgo, lecturas innecesarias y dependencia del humano como distribuidor manual.

En síntesis, elegir es una decisión del worker; recibir un ticket es una asignación del sistema que separa coordinación de ejecución.

MINI_RESUMEN|El ticket mecánico elimina la elección local del trabajo y permite repartir bloques únicos de forma verificable.
