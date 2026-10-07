# START_HERE · EXP-004 · 2 workers / 10 bloques · Telemetry + Efficiency

## Objetivo único

Repetir el benchmark de EXP-003 con la misma carga (2 workers / 10 bloques), pero con:
- primer ping público inmediato;
- timestamps absolutos en cada transición;
- menos I/O innecesario;
- telemetría suficiente para reconstruir dónde se fue el tiempo.

No implementes lease/requeue. No mejores arquitectura. Ejecutá este protocolo.

## Control plane

Google Drive:
- registry_document_id: `1eJUVqmVzJwRvIuPLBIkiHtoFvJ2L130tXstOOwEs7Ug`
- allocator_document_id: `1UTLjGbt5Wsa2qbZze4H0PJVD89RVhKiqw4fDefx-AZI`

GitHub:
- repo: `JuanManuelPM/prometeo`
- branch: `main`
- root: `ui-workspace-v1/experiments/allocator-v3/`

State:
- slot 001 → `state/worker-001.json`
  initial SHA: `74d30be4d57e6a3f460451793116c0ac411fe39a`
- slot 002 → `state/worker-002.json`
  initial SHA: `5208a515950e1afc1ce34dc6127addae74545f9b`

## BOOTSTRAP: debe ocurrir antes de leer cualquier otra cosa

El prompt de lanzamiento ya te hizo registrar primero y publicar el primer ping. Si llegaste acá sin haberlo hecho, detenete: el orden correcto es REGISTER → PUBLIC PING → leer este archivo.

Después del primer write de tu state, usá siempre el `content_sha` devuelto por tu último update como SHA del próximo update. No releas tu state salvo un conflicto real de GitHub.

## Reloj

Cada evento lleva:
`worker_at: <ISO-8601 UTC con milisegundos>`

Ejemplo:
`2026-10-07T10:43:12.381Z`

No inventes duración como dato primario. Guardá horas absolutas. Las duraciones se recalculan por diferencia.

## Mensajes de commit de telemetría

Cada write de state usa exactamente:

`EXP004 W<slot> EVT <NNNN> <PHASE> <OPERATION>`

Ejemplo:
`EXP004 W001 EVT 0004 RESULT BLOCK_READ`

Esto permite auditar después la hora servidor de cada transición.

## Contadores

Separá:
- `logical_work_ops`: operaciones lógicas de trabajo;
- `external_work_calls`: llamadas reales a Drive/GitHub para trabajo;
- `telemetry_writes`: updates de tu propio state;
- `revision_conflicts`;
- `retries`;
- `errors`;
- `forbidden_ops`.

Los writes de telemetría no cuentan como `external_work_calls`, porque se miden aparte.

## Operaciones externas permitidas

Después del bootstrap sólo existen:

1. `PROTOCOL_READ` — esta lectura, exactamente una vez.
2. `GET_NEXT`
3. `BLOCK_READ`
4. `RETURN_PUBLISH`
5. `RETURN_VERIFY`

Nada más.

## Prohibido

No:
- list_folder;
- search;
- explorar Prometeo;
- leer branches/HEAD “por las dudas”;
- leer el state del otro worker;
- releer tu state salvo 409/conflicto real;
- releer allocator fuera de GET_NEXT;
- leer bloques futuros;
- procesar “4–10” como lote;
- reservar más de un ticket;
- mover archivos;
- crear carpetas;
- escribir un RETURN por partes;
- tocar Drive mientras redactás;
- tocar GitHub mientras redactás;
- diseñar arquitectura;
- implementar recuperación de abandonados;
- crear lease/requeue;
- hacer trabajo adicional “útil”.

Si una acción no está en la lista permitida, no la hagas.

## Forma de telemetría

Antes de cada operación permitida:
1. append de un evento `INTENT`;
2. update de tu state;
3. recién entonces ejecutá la operación.

Después:
1. append de un evento `RESULT`;
2. incluí `worker_at`, status y número real de connector calls de esa operación;
3. update de tu state.

Un error real puede producir `NOTE ERROR` y retry de **la misma operación**. Máximo 2 retries. No cambies de estrategia y no explores.

## GET_NEXT

INTENT GET_NEXT → state write.

Luego:
1. leé ALLOCATOR-V3 y conservá `revisionId`;
2. leé `NEXT_TICKET|NNN`;
3. si NNN > 010: RESULT GET_NEXT = EMPTY → state `EMPTY` → terminar;
4. intentá reemplazar condicionalmente `NEXT_TICKET|NNN` → `NEXT_TICKET|NNN+1` usando `requiredRevisionId`;
5. si revision mismatch: sumá conflict + retry, releé allocator y repetí dentro del mismo GET_NEXT;
6. al ganar, ticket NNN es tuyo.

RESULT GET_NEXT debe guardar:
- ticket;
- attempts;
- connector_calls reales;
- assigned_worker_at;
- current block.

## BLOCK_READ

Path exacto:
`ui-workspace-v1/experiments/allocator-v3/blocks/BLOCK-NNN.md`

INTENT → state.
Fetch exacto una sola vez.
RESULT → state.

El timestamp del RESULT BLOCK_READ es también `local_work_started_worker_at`.

## TRABAJO LOCAL

Desde RESULT BLOCK_READ hasta INTENT RETURN_PUBLISH:
- cero Drive;
- cero GitHub;
- cero web;
- cero rereads.

Redactá las 150–250 palabras completas en memoria.

No expliques el protocolo.
No diseñes sistemas.
Sólo respondé la pregunta del bloque.

## RETURN_PUBLISH

Antes de tocar GitHub, la respuesta ya debe estar terminada.

Path:
`ui-workspace-v1/experiments/allocator-v3/returns/RETURN-NNN__worker-<slot>.md`

INTENT RETURN_PUBLISH:
- su timestamp es `local_work_ended_worker_at`.

Después hacé **una sola** creación del archivo completo.

El RETURN contiene:
- EXP-004;
- ticket;
- block;
- worker_id;
- worker_slot;
- assigned_worker_at;
- local_work_started_worker_at;
- local_work_ended_worker_at;
- respuesta;
- `MINI_RESUMEN|...`

RESULT RETURN_PUBLISH → state.

## RETURN_VERIFY

INTENT → state.
Un único fetch exacto del RETURN.
Compará que existe y contiene ticket/worker/respuesta esperados.
RESULT → state.

Al RESULT exitoso:
- agregá ticket a `completed`;
- limpiá current ticket/block;
- después iniciá inmediatamente el siguiente GET_NEXT.

No hagas ninguna otra cosa entre ambos.

## EMPTY

Cuando GET_NEXT vea 011:
- RESULT GET_NEXT = EMPTY;
- status = EMPTY;
- current operation = null;
- guardar timestamp final;
- responder sólo el resumen terminal pedido por el prompt de lanzamiento.

## Métrica clave

El experimento no premia “hacer muchas cosas”.
Premia:
- 10 bloques correctos;
- 0 duplicados;
- 0 forbidden ops;
- visibilidad rápida;
- poca I/O;
- horas absolutas completas;
- continuidad mecánica sin intervención humana.
