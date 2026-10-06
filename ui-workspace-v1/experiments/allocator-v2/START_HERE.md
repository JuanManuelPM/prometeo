# PROMETEO · ALLOCATOR V2 · 2 WORKERS / 10 BLOQUES

## Objetivo

Probar dos chats reales trabajando sobre **10 bloques totales** sin elegir tareas y sin routing humano.

Cada chat:
1. se registra mecánicamente y recibe `worker_slot` 001 o 002;
2. pide siempre `GET_NEXT`;
3. recibe un ticket único;
4. lee solamente el bloque de ese ticket;
5. redacta la respuesta localmente;
6. publica RETURN durable;
7. actualiza telemetría;
8. vuelve a `GET_NEXT`;
9. termina cuando recibe `EMPTY`.

## Control plane en Google Drive

Folder: `ALLOCATOR_TEST_V2_TWO_WORKERS`
Folder ID: `1rzUDjL46_GhAGPLkM_G1CD9C5iDBLZ7O`

Worker registry:
- document_id: `1GlY2PVuA4GvYGGMAWx3QatwFO9c_uqj_L3PgZdundsQ`

Allocator:
- document_id: `1Kp-qF6YaOPdMELq-5Coya34LERnXD21ts9cgeSVPavc`

## Registro mecánico

1. Leé WORKER-REGISTRY-V2 con Google Docs `get_document` y conservá `revisionId`.
2. Leé `NEXT_WORKER|NNN`.
3. Si NNN > 002: terminar `NO_SLOT`.
4. Intentá exactamente una escritura condicional usando `requiredRevisionId`, reemplazando:
   `NEXT_WORKER|NNN` → `NEXT_WORKER|NNN+1`.
5. Si hay revision mismatch: releé y repetí el registro.
6. Si pasa: ese NNN es tu `worker_slot` fijo.

Después de ganar slot, tu archivo de estado es:
- slot 001: `ui-workspace-v1/experiments/allocator-v2/state/worker-001.json`
- slot 002: `ui-workspace-v1/experiments/allocator-v2/state/worker-002.json`

Repositorio: `JuanManuelPM/prometeo`, branch `main`.

Hacé un solo fetch inicial de tu state file para obtener su SHA. A partir de ahí usá el `content_sha` devuelto por cada update como SHA del siguiente update. No vuelvas a leerlo salvo conflicto real.

## Regla de telemetría

Toda **operación externa de trabajo** debe quedar declarada en tu state file con:
- `INTENT`: qué vas a hacer, target y motivo;
- luego `RESULT`: éxito/error, duración y datos relevantes.

Las escrituras del propio archivo de telemetría están **exentas de registrar otra telemetría**, porque si no inventamos una serpiente que se audita la cola hasta el fin del universo.

Operaciones externas de trabajo permitidas:
- `REGISTER`
- `GET_NEXT`
- `BLOCK_READ`
- `RETURN_PUBLISH`
- `RETURN_VERIFY`

No hagas lecturas exploratorias, listados de carpetas, búsquedas generales ni rereads “por las dudas”.

## GET_NEXT

1. Publicá `INTENT GET_NEXT` en tu state.
2. Leé ALLOCATOR-V2 con `get_document` y guardá `revisionId`.
3. Leé `NEXT_TICKET|NNN`.
4. Si NNN > 010: publicá `RESULT GET_NEXT EMPTY`, estado `EMPTY` y terminá.
5. Intentá una escritura condicional con `requiredRevisionId`:
   `NEXT_TICKET|NNN` → `NEXT_TICKET|NNN+1`.
6. Si revision mismatch: incrementá `revision_conflicts`, releé allocator y repetí GET_NEXT. Nunca uses el N viejo.
7. Si pasa: ticket NNN es tuyo. Actualizá state: `current_ticket`, `current_block`, `status=CLAIMED`.

## BLOCK_READ

Cada ticket NNN corresponde únicamente a:
`ui-workspace-v1/experiments/allocator-v2/blocks/BLOCK-NNN.md`

Fetch exacto de ese archivo. No leas otros bloques.

Registrá duración y resultado.

## Trabajo local

Después de leer el bloque, **no hagas ninguna operación online mientras redactás**.
Generá la respuesta completa en memoria.

## RETURN

Publicá:
`ui-workspace-v1/experiments/allocator-v2/returns/RETURN-NNN__worker-<slot>.md`

El RETURN debe incluir:
- ticket;
- worker_slot;
- worker_id;
- respuesta completa;
- MINI_RESUMEN;
- timestamps;
- duración de trabajo local;
- counters de I/O del bloque.

Luego hacé un único fetch exacto del RETURN para verificarlo.

Actualizá tu state:
- limpiar `current_ticket/current_block`;
- sumar el resultado a `completed`;
- actualizar métricas;
- volver inmediatamente a GET_NEXT.

## Formato de respuesta del bloque

Cada BLOCK pide 150–250 palabras y una última línea exacta:

`MINI_RESUMEN|...`

## Prohibiciones

- No elegir tarea.
- No reservar dos tickets.
- No leer bloques futuros.
- No tocar CURRENT.
- No modificar el state del otro worker.
- No crear scheduler/dealer alternativo.
- No implementar lease/requeue en esta prueba.
- No navegar Prometeo por curiosidad.

## Salida terminal

Cuando GET_NEXT devuelva EMPTY, responder solamente:

worker_id  
worker_slot  
tickets recibidos  
RETURNS creados  
bloques completados  
revision_conflicts  
external_work_ops  
telemetry_writes  
errores  
estado final
