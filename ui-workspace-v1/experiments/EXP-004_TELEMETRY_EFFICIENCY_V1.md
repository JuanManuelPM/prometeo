# EXP-004 · Telemetry + Efficiency Benchmark V1

**Estado:** `READY_TO_RUN`  
**Benchmark:** 2 workers / 10 bloques idénticos a EXP-003.

## Objetivo

Mantener fija la carga de trabajo y cambiar solamente el protocolo de ejecución/observabilidad.

Queremos medir:
- cuánto tarda cada worker desde su primer ping durable hasta `EMPTY`;
- cuánto tiempo consume allocator, lectura, trabajo local, publicación, verificación y huecos/overhead;
- cuántas llamadas externas reales hace;
- si aparecen rereads, búsquedas, listados, movimientos de archivos o trabajo no pedido;
- cuánto tarda en hacerse visible después de registrarse;
- tiempo entre terminar un bloque y pedir el siguiente.

## Cambios frente a EXP-003

1. **REGISTER → PUBLIC PING inmediatamente.**
2. Cada evento lleva hora ISO-8601 absoluta.
3. Cada commit de state usa mensaje normalizado para poder auditar hora servidor.
4. Sólo una tarea activa.
5. Bloque leído exactamente una vez salvo error real.
6. Respuesta completa redactada localmente, sin internet.
7. RETURN completo en una sola creación.
8. Verificación exacta una sola vez.
9. Sin folder listings, búsquedas, exploración, movimiento de archivos ni rereads preventivos.
10. Un error sólo permite retry de la misma operación; nunca cambiar de estrategia por iniciativa propia.

## PASS

- 2 slots únicos.
- 10/10 tickets y RETURNS únicos.
- 0 duplicados.
- ambos workers `EMPTY`.
- primera marca pública emitida inmediatamente después de registro.
- ningún forbidden op.
- cada llamada externa de trabajo queda representada en telemetría.
- timestamps suficientes para recomputar fases externamente.

## Resultado comparativo

Se completa después del run usando commit timestamps de GitHub como reloj durable de auditoría.

## Fuera de alcance

No lease, no expiry, no requeue. Ese problema queda para el experimento siguiente.
