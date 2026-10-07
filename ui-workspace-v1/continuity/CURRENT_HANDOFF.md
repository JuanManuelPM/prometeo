# CURRENT HANDOFF · Prometeo UI V4

Fecha: 2026-10-07

CURRENT:
- page_version 4
- chat@v1
- experiments@v3
- workers@v3
- gallery@v1

Cambios V4:
- EXPERIMENTOS abre directamente en EXP-003 CURRENT; historial queda en segunda página.
- WORKERS agrega TIEMPO con desglose server-observed desde primer durable hasta EMPTY.
- OBSERVED_TIMELINE.json deriva intervalos de commits GitHub del state de cada worker.
- GALLERY agrega las dos imágenes del usuario sólo como estética, sin autoridad ni telemetría.
- CHAT queda más compacto mientras siga siendo placeholder.

Benchmark vigente:
EXP-003 PASS · 2 workers · 10/10 bloques · reparto 6/4 · 0 duplicados.

Exact next funcional:
lease + expiry + requeue + fencing. Mantener 2 workers / 10 tareas como benchmark de comparación antes de escalar.
