# CURRENT HANDOFF · Prometeo UI V2

Fecha: 2026-10-06

## CURRENT
- Page version: 2
- Kernel: v1
- Widget API: v1
- Widgets: `chat@v1`, `experiments@v1`, `workers@v1`
- Fuente visual: V8 viewport-safe
- EXP-001: `PARTIAL_PASS`
- EXP-002: preparado para prueba con dos chats reales

## Objetivo inmediato
Continuar experimentando sobre broker/WorkBlocks sin romper la UI modular.

## Leer antes de actuar
1. `CURRENT/CURRENT.json`
2. `CONTINUITY/CHAT-001_2026-10-06.md`
3. `PROTOCOLS/WIDGET_CONTINUITY_PROTOCOL_V1.md`
4. `PROTOCOLS/READINESS_GATE_V1.md`
5. contexto + prompt del widget elegido

## Reglas
- CANDIDATE != CURRENT.
- Worker externo no promueve CURRENT.
- No inventar liveness ni pruebas.
- No crear scheduler/dealer/queue paralelos.
- Trabajar sólo dentro del write scope declarado.
- Kernel conserva funciones universales.


## Continuidad raíz
Antes de trabajar, leer `CONTINUITY/MASTER_CONTEXT.md`; luego CURRENT y el prompt propio del widget.

EXP-002 está preparado en Drive con `BLOCK-REALCHAT-002` y `CLAIM-REALCHAT-002`; sigue `READY_TO_RUN`, no probado con dos chats reales todavía.
