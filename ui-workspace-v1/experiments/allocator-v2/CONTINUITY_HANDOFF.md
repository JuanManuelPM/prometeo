# PROMETEO · HANDOFF DE CONTINUIDAD · CHAT 001

**Cierre:** 2026-10-06  
**Estado al cierre:** EXP-003 PASS.

## Objetivo humano vigente

Construir Prometeo como sistema donde chats/workers fungibles reciban trabajo mecánicamente, trabajen sin routing humano, devuelvan evidencia durable y continúen. La UI pública debe mostrar estado real, no liveness inventada.

## Reglas vigentes

1. Workers fungibles. La especialización vive en la TASK.
2. El worker no elige tarea: usa `GET_NEXT`.
3. Loop: `GET_NEXT → TASK → trabajo local → RETURN → GET_NEXT`.
4. Medir trabajo terminado, I/O, conflictos, retries y tiempos.
5. Evitar rereads y exploración online innecesaria.
6. CANDIDATE no es CURRENT.
7. No crear scheduler/dealer paralelo.
8. Drive fue control plane experimental; GitHub telemetría/versionado público.
9. Un worker posee una sola tarea activa.
10. Lease/requeue es la siguiente capa aislada.

## EXP-001

`PARTIAL_PASS`. Desde un supervisor se probaron dos escrituras con el mismo `requiredRevisionId`: una pasó y la otra fue rechazada. Probó CAS, no dos chats reales.

## EXP-002

`PARTIAL_PASS`. Dos chats reales compartieron un claim. Hubo un owner y un RETURN; el segundo observó CLAIMED. No hubo solapamiento READY verificado.

## ALLOCATOR TEST V1

Un solo chat consumió 10 bloques:
- tickets 001–010;
- 10 RETURNS;
- terminal EMPTY;
- allocator final 011.

Demostró el loop básico, pero mostró I/O redundante que motivó telemetría explícita.

## EXP-003 · RESULTADO FINAL

`PASS`.

Dos chats reales:
- se registraron mecánicamente en slots 001 y 002;
- compartieron un allocator CAS;
- completaron 10/10 bloques;
- produjeron 10 RETURNS únicos;
- no duplicaron tickets;
- terminaron ambos EMPTY.

Worker 001:
- worker_id: `worker-001-gpt56sol-20261006T2355Z`
- 6 bloques: 002,004,006,007,009,010
- 1 revision conflict
- 27 external work ops
- 33 telemetry writes
- avg 44.5 s/bloque
- 0 errores

Worker 002:
- worker_id: `ALLOCATOR-V2-W002-20261006T2355Z`
- 4 bloques: 001,003,005,008
- 2 revision conflicts
- 18 external work ops
- 36 telemetry writes
- avg 48.181 s/bloque
- 1 error recuperado

Totales:
- 10/10 completados
- 0 duplicados
- 3 revision conflicts
- 4 retries
- 45 external work ops
- 69 telemetry writes
- Drive registry final `NEXT_WORKER|003`
- Drive allocator final `NEXT_TICKET|011`

Resultado detallado:
`ui-workspace-v1/experiments/EXP-003_RESULT.md`

## Interpretación

La propiedad básica buscada está resuelta: múltiples chats pueden entrar al mismo sistema, recibir identidad y trabajo de forma mecánica y vaciar una cola compartida sin routing humano.

No confundir esto con un allocator de producción completo. Todavía falta recuperar trabajo abandonado.

## Arquitectura más amplia que debe preservarse

Prometeo UI es modular:
- kernel universal;
- widget registry;
- widgets versionados;
- history/messages/references por widget;
- continuidad por widget;
- allocator/Work Graph como autoridad de trabajo, no una UI específica;
- storage reemplazable;
- GitHub como autoridad/versionado público cuando corresponde;
- privacidad y secretos nunca en repo público.

El worker ideal sigue siendo:
`register → GET_NEXT → bloque autocontenido → trabajo local → RETURN → GET_NEXT`.

Toda operación online de trabajo debe ser justificable y medible. La telemetría no debe auto-telemetrizar sus propias escrituras recursivamente.

## Exact next

Implementar solamente:

`lease + expiry + requeue + fencing`

Prueba siguiente:
1. worker reclama ticket;
2. deja de producir RETURN;
3. vence lease;
4. bloque vuelve a estar disponible;
5. otro worker lo reclama;
6. el owner viejo no puede cerrar tarde como válido.

Después, y sólo después:
- 2→10 workers;
- 10→100 bloques;
- medir throughput, colisiones, latencia de integración, duplicados e I/O.

## Regla de sucesión

El siguiente chat debe leer:
- este handoff;
- `EXP-003_RESULT.md`;
- `START_HERE.md`;
- `READINESS_GATE.json`;
- estados terminales de worker 001 y 002.

Debe responder el readiness antes de modificar arquitectura. No reconstruir desde memoria ni volver a experimentar claims básicos ya demostrados.
