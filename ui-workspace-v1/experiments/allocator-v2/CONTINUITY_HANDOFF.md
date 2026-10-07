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
`PARTIAL_PASS`. CAS mecánico probado desde un supervisor.

## EXP-002
`PARTIAL_PASS`. Dos chats reales compartieron un claim, pero sin solapamiento READY verificado.

## ALLOCATOR TEST V1
Un solo chat consumió 10 bloques y terminó EMPTY. Demostró el loop básico y reveló I/O redundante.

## EXP-003 · RESULTADO FINAL

`PASS`.

Dos chats reales:
- slots únicos 001 y 002;
- 10/10 bloques completados;
- 10 RETURNS únicos;
- 0 tickets duplicados;
- ambos terminaron EMPTY.

Worker 001:
- `worker-001-gpt56sol-20261006T2355Z`
- bloques 002,004,006,007,009,010
- 1 revision conflict
- 27 external work ops
- 33 telemetry writes
- avg 44.5 s/bloque
- 0 errores

Worker 002:
- `ALLOCATOR-V2-W002-20261006T2355Z`
- bloques 001,003,005,008
- 2 revision conflicts
- 18 external work ops
- 36 telemetry writes
- avg 48.181 s/bloque
- 1 error recuperado

Totales:
- 3 revision conflicts
- 4 retries
- 45 external work ops
- 69 telemetry writes
- registry final `NEXT_WORKER|003`
- allocator final `NEXT_TICKET|011`

## Interpretación

La propiedad básica buscada está resuelta: múltiples chats pueden entrar al mismo sistema, recibir identidad y trabajo mecánicamente y vaciar una cola compartida sin routing humano.

Todavía falta recuperación de trabajo abandonado.

## Exact next

Implementar solamente:
`lease + expiry + requeue + fencing`

Prueba:
1. un worker reclama;
2. no devuelve RETURN;
3. vence lease;
4. el bloque vuelve a disponible;
5. otro worker lo reclama;
6. el owner viejo no puede cerrar tarde como válido.

Después: 2→10 workers y 10→100 bloques.

## Regla de sucesión

El siguiente chat debe leer este handoff, `EXP-003_RESULT.md`, `START_HERE.md`, `READINESS_GATE.json` y estados terminales de worker 001/002. Debe pasar readiness antes de modificar arquitectura. No reconstruir desde memoria ni repetir claims básicos ya demostrados.
