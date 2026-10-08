# MECHANICAL FINDINGS
- EXP-001: CAS por revisión funciona; no eran dos chats reales.
- EXP-002: ownership durable entre dos chats reales.
- EXP-003: 10/10, 0 duplicados.
- EXP-004: telemetría bloqueante mata trabajo; telemetry nunca debe gatear material work.
- EXP-005: branch isolation ayuda, START_HERE remoto mata first work.
- EXP-006: self-contained recupera 10/10; RETURN es canónico y state no reescribe historia.
- EXP-007: menos ceremonia mejora startup; prompt prose deja de ser cuello principal.
- EXP-008: sin task exhaustion/terminal attractors aparecen runs largos; dominan límites de herramientas.
- EXP-009: W001=100, W002=25, tercer slot no adquirido, STOP_GRANT NONE, orphans 102/127.

Conclusión: hot path objetivo = CLAIM_RANGE → LOCAL×N → BATCH_RETURN → CLAIM_RANGE. Diseñar para muerte recuperable, no chats inmortales.
