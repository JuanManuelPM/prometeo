# EXP-003 RESULT · Allocator V2 · 2 workers / 10 bloques

**Resultado:** `PASS`

Dos chats reales se registraron mecánicamente, recibieron slots distintos y completaron 10/10 bloques sin tickets duplicados ni routing humano.

## Totales
- worker 001: 6 bloques, 1 revision conflict, 27 external work ops, 33 telemetry writes, 0 errores, terminal EMPTY
- worker 002: 4 bloques, 2 revision conflicts, 18 external work ops, 36 telemetry writes, 1 error recuperado, terminal EMPTY
- tickets únicos: 10/10
- RETURNS únicos: 10/10
- duplicados: 0
- revision conflicts: 3
- retries: 4
- external work ops: 45
- telemetry writes: 69
- allocator final: `NEXT_TICKET|011`
- registry final: `NEXT_WORKER|003`

## Veredicto
`PASS`.

La propiedad buscada quedó demostrada: dos chats independientes pueden recibir identidad y trabajo mecánicamente y vaciar una cola compartida sin que el humano reparta tareas.

## Siguiente capa
Agregar solamente `lease + expiry + requeue` para recuperar trabajo abandonado antes de escalar a más workers.
