# WORKERS widget context

CURRENT: workers@v4 · page_version 5.

Objetivo: observabilidad visual real para EXP-004.

Páginas:
- WORKERS: dos lanes, 10 bloques, operación actual, último evento y counters;
- TIEMPO: barra por worker con registro/protocolo/allocator/lectura/trabajo local/publicación/verificación/espera;
- TIMELINE: horas absolutas;
- RETURNS.

Durante el run, TIEMPO deriva de worker_at.
Después del run, AUDITED_TIMELINE debe reemplazarlo con hora servidor de commits GitHub.

Regla crítica: primer ping público inmediatamente después del registro; cero I/O durante trabajo local.
