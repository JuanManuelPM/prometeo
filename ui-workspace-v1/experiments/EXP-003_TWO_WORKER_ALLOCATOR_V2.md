# EXP-003 · Allocator V2 · 2 workers / 10 bloques

**Estado:** `READY_TO_RUN`  
**Fecha:** 2026-10-06  
**Objetivo:** probar reparto mecánico real de 10 bloques entre dos chats independientes, con tickets únicos y telemetría visible.

## Hipótesis

Dos chats pueden registrarse, recibir slots distintos y vaciar una cola de 10 bloques sin elegir tareas ni recibir routing humano.

## Qué se mide

- registro de cada worker;
- ticket recibido;
- bloque actual;
- duración por operación;
- duración local por bloque;
- RETURNS por worker;
- conflictos de revisión;
- retries;
- errores;
- operaciones externas de trabajo;
- escrituras de telemetría;
- respuestas completas, visibles desde el panel.

## Arquitectura

Google Drive:
- registry CAS para slots 001–002;
- allocator CAS para tickets 001–010.

GitHub:
- bloques estáticos;
- state separado por worker;
- RETURNS inmutables;
- dashboard público.

## Restricción deliberada

No hay lease/requeue todavía. Si un worker muere después de obtener un ticket, ese ticket puede quedar varado. Eso se medirá después, no se “arregla” silenciosamente durante EXP-003.

## PASS

- dos slots únicos;
- cero ticket duplicado;
- 10 bloques completados;
- 10 RETURNS únicos;
- ambos workers terminan EMPTY;
- todo acceso de trabajo aparece en telemetría;
- no hay lecturas exploratorias no justificadas.

## PARTIAL_PASS

La cola se completa sin duplicados pero un worker termina haciendo casi todo, hay fallos de telemetría o aparecen operaciones online innecesarias.

## FAIL

Ticket duplicado, RETURN duplicado, worker elige tareas, worker toca state ajeno, se requiere routing humano o quedan bloques sin completar sin una caída explícita.
