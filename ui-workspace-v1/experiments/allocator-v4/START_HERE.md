# START_HERE · EXP-005 · Branch-isolated workers

## Regla principal

**ALLOCATOR puede bloquear trabajo. TELEMETRÍA nunca.**

Este experimento repite 2 workers / 10 bloques, pero cada worker escribe en una branch exclusiva:

- slot 001 → `exp005-w001`
- slot 002 → `exp005-w002`

Nunca escribas `main` ni `gh-pages`.

## Operaciones críticas

Sólo estas pueden detener el ciclo si fallan después de 2 retries de la misma operación:

1. REGISTER en Drive.
2. GET_NEXT en Drive.
3. BLOCK_READ exacto.
4. RETURN_PUBLISH en tu branch.
5. RETURN_VERIFY exacto.

Un write de state/telemetría **NO es crítico**.

## Telemetría no bloqueante

Guardá timestamps y contadores localmente durante todo el ciclo.

Checkpoints públicos permitidos:
- REGISTERED
- TICKET_ASSIGNED
- RETURNED
- EMPTY

Para cada checkpoint:
1. intentá una sola actualización de tu state en tu branch;
2. si funciona, actualizá el SHA local del state y seguí;
3. si falla, incrementá `telemetry_failures` localmente, conservá el checkpoint pendiente y **seguí trabajando**;
4. en el próximo checkpoint, si tu SHA local quedó incierto, podés hacer **un único fetch de tu propio state** para resincronizar antes de intentar publicar el snapshot completo;
5. nunca termines por `ERROR_TELEMETRY_WRITE_*`.

El snapshot más nuevo incluye todos los completed/checkpoints anteriores, así un write posterior puede recuperar un checkpoint perdido.

## Tiempos

Usá UTC ISO-8601 con milisegundos.

Por cada ticket guardá localmente:

- get_next_start
- get_next_end
- assigned_at
- block_read_start
- block_read_end
- local_work_start
- local_work_end
- return_publish_start
- return_publish_end
- return_verify_start
- return_verify_end

Esos tiempos se publican juntos dentro del RETURN. No hagas writes online intermedios sólo para medir.

## GET_NEXT

1. guardá `get_next_start` localmente;
2. leé ALLOCATOR-V4 y conservá revisionId;
3. si NEXT_TICKET > 010 → checkpoint EMPTY best-effort y terminá;
4. intentá CAS `NEXT_TICKET|NNN → NEXT_TICKET|NNN+1` usando requiredRevisionId;
5. revision mismatch = retry de GET_NEXT, no error fatal;
6. al ganar, guardá `get_next_end` y `assigned_at`;
7. checkpoint TICKET_ASSIGNED best-effort;
8. seguí inmediatamente.

No elijas tareas.

## BLOCK_READ

Leé exactamente:
`ui-workspace-v1/experiments/allocator-v4/blocks/BLOCK-NNN.md`
desde **tu propia branch**.

Una vez. Sin búsqueda, listados ni rereads preventivos.

Guardá block_read_start/end y local_work_start.

## TRABAJO LOCAL

Desde local_work_start hasta local_work_end:

- cero GitHub;
- cero Drive;
- cero web;
- cero Python;
- cero búsquedas;
- cero telemetría online.

Redactá la respuesta completa en memoria. Sólo la pregunta asignada.

## RETURN

Antes de tocar GitHub:
- la respuesta debe estar completa;
- guardá local_work_end.

Creá una sola vez:
`ui-workspace-v1/experiments/allocator-v4/returns/RETURN-NNN__worker-<slot>.md`
en tu branch.

El archivo incluye:
- experiment_id
- worker_id
- worker_slot
- ticket
- block
- TRACE con todos los timestamps del ticket
- external_work_calls acumuladas
- telemetry_failures acumuladas
- respuesta completa
- `MINI_RESUMEN|...`

RETURN_PUBLISH es crítico: máximo 2 retries de la misma creación. Si el primer intento puede haber creado el archivo, verificá el path exacto antes de repetir create.

Después hacé un fetch exacto para verificar el RETURN.

Al verificar:
- agregá ticket a completed local;
- checkpoint RETURNED best-effort;
- GET_NEXT inmediato.

## Prohibido

No:
- list_folder;
- search;
- HEAD/branches “por las dudas”;
- leer el state del otro worker;
- escribir `main`;
- escribir `gh-pages`;
- mover archivos;
- crear carpetas;
- escribir RETURN por partes;
- usar Python durante trabajo local;
- leer bloques futuros;
- procesar lotes;
- diseñar arquitectura;
- lease/requeue;
- abandonar un ticket porque falló la telemetría.

## Final

Al EMPTY respondé sólo el resumen terminal solicitado en LAUNCH_PROMPT.
