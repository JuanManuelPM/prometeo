# RETURN-010

ticket: 010
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-010.md
local_work_started_at: 2026-10-07T00:05:44.048Z
local_work_finished_at: 2026-10-07T00:06:31.048Z
local_work_duration_ms: 47000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

El ciclo mínimo empieza con el registro mecánico. El worker lee el registro compartido, incrementa de forma condicional NEXT_WORKER y conserva el número ganado como worker_slot. Desde ese momento usa únicamente su propio archivo de estado para telemetría.

Después ejecuta GET_NEXT. Primero declara la intención, lee el allocator y trata de incrementar NEXT_TICKET usando la revisión observada. Si hay conflicto, descarta ese número, vuelve a leer y repite. Cuando gana un ticket, ese número determina exactamente qué BLOCK puede consultar.

El worker registra BLOCK_READ, lee solo ese archivo y luego deja de hacer operaciones online mientras redacta. La respuesta se construye completa en memoria, incluyendo el contenido pedido y su MINI_RESUMEN. Recién cuando está terminada se publica un RETURN durable con ticket, worker, timestamps, duración y contadores de I/O.

La publicación no basta por sí sola. El worker registra RETURN_VERIFY y hace una única lectura exacta del RETURN para comprobar que el contenido durable coincide con lo que quiso escribir. Si la verificación pasa, limpia su tarea activa, registra el bloque como completado y vuelve inmediatamente a GET_NEXT.

El ciclo termina únicamente cuando el allocator responde EMPTY; hasta entonces, cada ticket se procesa de punta a punta antes de pedir otro.

MINI_RESUMEN|El ciclo mínimo convierte cada ticket en un bloque leído una vez, trabajado localmente, publicado y verificado antes de solicitar el siguiente.
