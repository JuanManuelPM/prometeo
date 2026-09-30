# PROMETEO · MAXCAP + PRIMARY CHAT · BRANCH HANDOFF

Checkpoint: `coordination/guide/sessions/G-20260930-MAXCAP-CHAT-BRANCH-HANDOFF-V1.json`

## Qué quedó hecho
- Worker residency/continuation guard, prerequisite gating y bounded system-multiplier visibility.
- Worker Lab durable con historia, playbook y failure classes.
- RESIDENCY-MACROBATCH-01 como baseline moderado.
- MAXCAP-50-01 armado: 50 slots = 5 cargas × 2 condiciones × 5 réplicas.
- Primary chat negro con mensajes, details y live run_progress.

## Snapshot MAXCAP
Fuente: `launch/MAXCAP-50-01/status.json` @ 2026-09-30T12:20:41.490Z

45/50 claims · 39 primary · 38 realloc · 36 terminal · 5 missing claims.
El humano reportó lanzar workers adicionales DESPUÉS de ese snapshot. Refrescar antes de pedir más.

## Problemas de UI vistos por el humano
- Dos porcentajes compiten: Work Unit ~75% arriba y MAXCAP inline.
- Mensaje humano enorme domina la pantalla.
- Composer sticky superpone contenido.
- Botón enviar parece funcionar pero no aparece mensaje ni ack útil porque el bridge autenticado todavía no existe.
- Falta la respuesta automática/substantiva del Guide cuando el experimento avanza o termina.

## Siguiente acción
Refrescar MAXCAP -> analizar resultados por celda y failure class -> publicar síntesis fuerte en el mismo chat -> reparar UX del primary chat -> pedir sólo refill exacto si todavía falta admisión.

No broad archaeology. No pedir recap humano.
