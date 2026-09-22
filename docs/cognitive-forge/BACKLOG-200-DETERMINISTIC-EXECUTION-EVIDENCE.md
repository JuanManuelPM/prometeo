# BACKLOG 200 · Extraer determinismo de la IA

## Estado

- Backlog origen: **200 · Extraer determinismo de la IA**
- Estado: **HECHO**
- Objetivo: ejecutar cálculos y procedimientos repetibles sin delegarlos a razonamiento generativo.
- Implementación backend: migración Supabase `forge_deterministic_executor_v1`, versión `20260922042418`.
- Fuente versionada: `supabase/migrations/20260922042418_forge_deterministic_executor_v1.sql`.

## Primitive

`public.forge_deterministic_compute_v1(operation, args) -> jsonb`

El executor es una whitelist SQL sin SQL dinámico, permisos nuevos ni side effects. Cada éxito declara `engine=SQL_WHITELIST_V1`, `generative_reasoning_used=false`, `authority_granted=false` y un `input_hash` estable.

Operaciones v1: `PERCENTAGE`, `MEDIAN`, `RATE_PER_SECOND`, `ETA_SECONDS`, `ROUND` y `BATCH` de 1–64 pasos no anidados.

Los errores no hacen fallback generativo: entrada inválida, división por cero, rate inválido, operación no soportada o step fallido devuelven estados deterministas explícitos.

## Procedimientos repetibles

`BATCH` ejecuta una secuencia declarada de pasos deterministas sin interpretación libre. Cada paso conserva `id`, resultado y evidencia. Los batches anidados están prohibidos en v1 para mantener comportamiento y costo acotados.

## Verificación

Smoke reproducible: `public.forge_deterministic_execution_smoke_test()`.

Resultado observado tras aplicar la migración: `DETERMINISTIC_EXECUTION_SMOKE_OK`; PASS en percentage, median, rate, eta, round, batch, stable_repeat y explicit_errors; `generative_reasoning_used=false`; `authority_granted=false`.

El smoke verifica además que objetos JSON semánticamente iguales producen el mismo resultado y `input_hash`, que ETA redondea hacia arriba y que división por cero / operación desconocida fallan explícitamente.

## Alcance

BACKLOG-200 queda cerrado con una primitive real y verificable para sacar cálculos y procedimientos repetibles del razonamiento generativo. El routing automático de Skills hacia esta primitive sigue separado en los contratos relacionados 226–228 y puede evolucionar incrementalmente sin modificar este executor.
