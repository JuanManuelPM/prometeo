# RETURN-006

ticket: 006
worker_slot: 001
worker_id: worker-001-gpt56sol-20261006T2355Z
block: ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-006.md
block_read_at: 2026-10-07T00:00:30Z
local_work_started_at: 2026-10-07T00:02:33.213Z
local_work_finished_at: 2026-10-07T00:03:17.213Z
local_work_duration_ms: 44000
io_counters: BLOCK_READ=1; RETURN_PUBLISH=1

## RESPUESTA

Que un worker sea fungible significa que su identidad no determina qué trabajo puede hacer. Mientras cumpla el mismo contrato operativo, cualquier instancia puede registrarse, pedir el siguiente ticket, ejecutar el bloque asignado y devolver un resultado con la misma forma verificable. El sistema no depende de que “el worker 3” tenga conocimientos privados, memoria especial o autoridad exclusiva sobre una tarea.

Eso ayuda a escalar porque la capacidad se vuelve intercambiable. Si hay más trabajo, pueden incorporarse más workers compatibles sin rediseñar el routing para cada uno. El allocator distribuye tickets y cada worker consume el siguiente bloque disponible. Si uno desaparece, el problema es reemplazar capacidad, no recuperar una personalidad irremplazable ni reconstruir decisiones que solo existían en ese chat.

La fungibilidad también obliga a que el contexto importante viva fuera del worker, en contratos, tickets, estados y artefactos durables. Eso mejora la trazabilidad: el resultado puede evaluarse por lo que produjo y por el protocolo que siguió, no por quién lo produjo.

En esta prueba, además, permite comparar concurrencia real sin asignaciones manuales. Dos chats distintos pueden actuar como unidades equivalentes y competir mecánicamente por trabajo, manteniendo separada la coordinación de la ejecución.

MINI_RESUMEN|Un worker fungible es reemplazable bajo el mismo contrato, lo que permite agregar capacidad sin crear routing ni conocimiento exclusivo por instancia.
