# PROMETEO · HANDOFF DE CONTINUIDAD · CHAT 001

**Fecha de cierre preparada:** 2026-10-06  
**Motivo:** dejar de depender de esta conversación antes de agotar su contexto.

## Objetivo humano vigente

Construir Prometeo como sistema donde chats/workers fungibles puedan recibir trabajo mecánicamente, trabajar sin routing humano, devolver evidencia durable y continuar. La UI pública debe permitir observar estado real, no liveness inventada.

## Decisiones recuperadas y vigentes

1. Workers fungibles. La especialización vive en la TASK, no en nombres de worker.
2. El worker nunca elige proyecto/tarea si existe allocator.
3. Patrón deseado: `GET_NEXT → TASK → trabajo local → RETURN → GET_NEXT`.
4. Medir cambios completados e integrados, no cantidad de chats lanzados.
5. CANDIDATE no es CURRENT.
6. Drive puede actuar como control experimental; GitHub como proyección pública/versionada.
7. Los workers deben minimizar I/O. La inteligencia pesada ocurre localmente después de recibir un bloque autocontenido.
8. Un acceso online no debe ocurrir “por las dudas”. En EXP-003 toda operación externa de trabajo se declara y mide.
9. No crear schedulers/dealers paralelos.
10. Lease/requeue es siguiente capa, no requisito para probar reparto básico.

## EXP-001

Prueba mecánica desde un supervisor: dos escrituras condicionales con el mismo Google Docs `requiredRevisionId`. Una pasó y la otra fue rechazada por revisión obsoleta.

Veredicto: `PARTIAL_PASS` porque probó la primitiva CAS, no dos chats reales.

## EXP-002

Dos chats reales compartieron un claim Drive.
- winner: `exp002-9e7c45e3aaed`
- loser: `exp002-ffe6050a1216`
- un solo owner y un solo RETURN;
- loser observó CLAIMED y no reintentó;
- `overlap_with_second_chat_verified=false`.

Veredicto: `PARTIAL_PASS`. Probó dos chats reales, pero no carrera simultánea sobre READY.

## ALLOCATOR TEST V1

Un chat real procesó 10 bloques solo:
- worker_id: `worker-gpt56-sol-20261006T2036-03A`
- tickets: 001–010
- RETURNS: 10
- bloques: 10
- allocator terminó `NEXT_TICKET|011`
- terminal: `EMPTY`
- 3 errores transitorios recuperados, 0 bloques fallidos.

Lección: el loop básico funciona. También se observó I/O innecesario: rereads, redacción mientras tocaba Drive, pasos redundantes y hasta mención de recuperación de abandonados que V1 no pedía.

## EXP-003 · último experimento preparado

Dos workers / 10 bloques, slots mecánicos + tickets CAS + telemetría pública.

Drive:
- folder_id: `1rzUDjL46_GhAGPLkM_G1CD9C5iDBLZ7O`
- registry: `1GlY2PVuA4GvYGGMAWx3QatwFO9c_uqj_L3PgZdundsQ`
- allocator: `1Kp-qF6YaOPdMELq-5Coya34LERnXD21ts9cgeSVPavc`

GitHub namespace:
`ui-workspace-v1/experiments/allocator-v2/`

La página pública muestra worker 001/002, operación actual, bloque actual, completados, tiempos, counters, eventos y respuestas desplegables.

## Lo que sigue después de EXP-003

No inventar el próximo sistema desde cero.

Si EXP-003 PASS/PARTIAL:
1. analizar distribución y costo I/O;
2. reducir llamadas redundantes;
3. agregar lease + expiry + requeue en EXP-004;
4. simular worker muerto;
5. luego escalar 2→10 workers y 10→100 bloques.

Si FAIL:
aislar la falla concreta (registro, allocator, estado, RETURN o telemetría) y repetir sólo esa capa.

## Arquitectura más amplia que debe preservarse

Prometeo UI es modular:
- kernel universal;
- widget registry;
- widgets versionados;
- history/messages/references por widget;
- continuidad por widget;
- Work Graph/allocator como autoridad de trabajo, no UI específica;
- storage reemplazable;
- GitHub como autoridad/versionado público cuando corresponde;
- privacidad/secrets nunca en repo público.

## Regla de sucesión

Un chat nuevo NO debe responder “entiendo” y empezar a improvisar. Debe leer el handoff, protocolo vigente, resultados y CURRENT público, responder un readiness gate y recién después actuar.

## Exact next

Ejecutar EXP-003 con dos chats usando el mismo prompt de worker. Traer o leer sus estados terminales. Clasificar PASS/PARTIAL_PASS/FAIL y registrar el resultado durablemente.
