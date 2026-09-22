# BACKLOG 143 · Duración por fase · Evidencia

## Implementación

Se creó la vista viva `public.blueprint_phase_duration_summary` para aprender tiempos observados por fase a partir de `blueprint_outputs.elapsed_ms`, unida al catálogo durable de fases en `blueprint_jobs`.

Por cada Blueprint/fase expone:

- jobs configurados y cobertura de muestras;
- tiempo total;
- promedio, mediana y p90 de `elapsed_ms`;
- mínimo y máximo;
- palabras totales/promedio;
- milisegundos por 1000 palabras;
- primera y última muestra.

Las fases sin outputs aparecen igualmente con cobertura 0, evitando confundir “sin datos” con duración cero.

## Smoke

`blueprint_phase_duration_summary_smoke_test('FORGE-BLUEPRINT-84-01')` devolvió `BLUEPRINT_PHASE_DURATION_SUMMARY_SMOKE_OK` con 5 fases y 182 outputs reconciliados.

Muestra observada al cierre:

- ARCHITECT: 84 muestras, 100% cobertura, avg 64768.2 ms, mediana 57953 ms, p90 83479.5 ms.
- DEEP_DEVELOPMENT: 73 muestras, 86.9%, avg 148525.1 ms, mediana 156004 ms, p90 226813 ms.
- ADVERSARIAL: 25 muestras, 29.8%, avg 4114.7 ms, mediana 3867 ms, p90 4817 ms.
- CANONICAL: 0 muestras.
- LEARNING: 0 muestras.

La vista se actualiza automáticamente al publicarse nuevos outputs; por eso aprende tiempos distintos por fase sin hardcodear ETAs.

## Fuente

Migración backend `blueprint_phase_duration_summary_v1`, versión `20260922043735`.

Fuente versionada: `supabase/migrations/20260922043735_blueprint_phase_duration_summary_v1.sql`.
