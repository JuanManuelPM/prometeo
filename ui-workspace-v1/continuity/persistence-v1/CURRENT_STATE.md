# CURRENT STATE · 2026-10-08
Objetivo humano: liquidar primero la mecánica de workers; calidad semántica después.

UI: https://juanmanuelpm.github.io/prometeo/ui-workspace-v1/?v=15

EXP-009: branch `exp009-control`, dealer `1uPwvXmQxl-UwWqIQQY01olq4ZCPRlA-eYBfgFKO8C-s`.
Lectura fresca previa a publicación:
```text
NEXT_WORKER|003
MAX_WORKER|003
NEXT_TICKET|000128
STOP_GRANT|NONE
STOP_NONCE|EXP009-7c31a9
```

Evidencia durable:
- slot 001: 100 RETURNS; last durable 000126; 000127 reclamado sin RETURN durable.
- slot 002: 25 RETURNS; last durable 000101; 000102 reclamado sin RETURN durable.
- slot 003: NO ADQUIRIDO. El JSON WAITING precreado era una proyección defectuosa, no un worker.
- total durable observado: 125.
- STOP voluntario no autorizado.

Jerarquía de evidencia: RETURN durable > claim/lease > state/UI.
Siguiente dirección: profile rotation P0/P1/P3/P5/P10, 5 workers, epoch 30, Latin-square; luego lease+generation+requeue+crash recovery.
