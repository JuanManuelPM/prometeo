# EXP-003 · Allocator V2 · 2 workers / 10 bloques

**Estado:** `PASS`  
**Fecha:** 2026-10-06  
**Resultado:** `EXP-003_RESULT.md`

## Objetivo
Probar reparto mecánico real de 10 bloques entre dos chats independientes, con tickets únicos y telemetría visible.

## Resultado
- 2 slots únicos.
- 10 tickets únicos.
- 10/10 bloques completados.
- 10/10 RETURNS únicos.
- 0 tickets duplicados.
- worker 001 completó 6 bloques.
- worker 002 completó 4 bloques.
- 3 conflictos de revisión recuperados.
- ambos workers terminaron `EMPTY`.
- allocator final: `NEXT_TICKET|011`.
- registry final: `NEXT_WORKER|003`.

## Qué demuestra
Dos chats reales pueden registrarse mecánicamente y consumir una cola compartida sin elegir tareas ni recibir routing humano.

## Qué falta
No hay lease/requeue. Si un worker desaparece después de reclamar un ticket, el bloque puede quedar varado.

## Exact next
Implementar y probar solamente `lease + expiry + requeue`.
