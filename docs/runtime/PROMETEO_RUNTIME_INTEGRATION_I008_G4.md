# I008 G4 — Runtime integration smoke

Fecha: 2026-09-22
Worker: K097
Job: I008 generation 4

## Resultado

PASS. No se promovió ningún cambio de runtime en esta generación porque el camino integrado actual pasó el smoke completo y las invariantes de control/morgue verificadas.

## Inputs consumidos

I001–I007 están DONE en RUNTIME-IMPLEMENT-01. Se revisaron sus outputs publicados y metadatos:
- I001: sesiones/eventos y ENTER instrumentado.
- I002: checkpoint RPC protegido y Work Trace.
- I003: scheduler anti-WAIT / asignabilidad worker-specific.
- I004: liveness session-first y umbrales versionados.
- I005: contrato OBEY-v2 normalizado.
- I006: control runtime honesto; luego reemplazado intencionalmente por consola mínima.
- I007: experimento v1/v2 descriptivo, sin ganador automático.

## Smoke ejecutado

Se ejecutó desde main:

`supabase/tests/runtime_integration_i008_g3.sql`

Resultado devuelto:

`{"ok":true,"smoke":"I008_G3_FULL_RUNTIME","rollback":true}`

Cobertura confirmada:
PREFLIGHT, ENTER, WORK, SESSION_WORK_EVENT, CHECKPOINT, SESSION_TIMING, PUBLISH, NEXT, PARKED, DEAD, CONTROL_DEAD_EXCLUSION, REVIVE, DEAD_AGAIN y MORGUE.

El fixture es completamente transaccional y termina en ROLLBACK.

## Control: muertos fuera de capacidad viva

Verificación live:

- `prometeo_control_worker_liveness`: WORKING = 11, DEAD = 86.
- `prometeo_control_minimal`: working_workers = 11, dead_workers = 86.

Los conteos coinciden exactamente.

La definición actual de `prometeo_control_minimal` deriva `working_workers` sólo de `liveness='WORKING'` y cuenta `DEAD` por separado. `recommended_open` se calcula desde jobs rank-0 READY y slots libres de proyectos activos; no suma workers históricos ni cadáveres.

El `control/index.html` actual consume `prometeo_control_minimal` y presenta `working_workers` + `recommended_open`. El render detallado de I006 fue reemplazado intencionalmente por commits posteriores de la consola mínima; la invariancia de capacidad viva se conserva en la fuente actual.

## Morgue después de Q026

Sobre el último lote observado, D009:

- `prometeo_morgue_context(D009)` devuelve objeto JSON válido.
- Incluye `preflight_enter_loss`.
- `separate_from = WAIT_SILENCE_10M`.
- `client_cause = NOT_INFERRED`.

Esto confirma que el wrapper Q026 no rompió el contexto de morgue y que la pérdida PREFLIGHT→ENTER permanece separada de death/liveness.

## Superficie pública

Se intentó abrir `https://juanmanuelpm.github.io/prometeo/control/` con la herramienta web disponible y ésta devolvió un error interno de acceso. No se interpreta ese error como 404 ni como evidencia de despliegue fallido. La fuente actual en GitHub y el backend live sí fueron verificados.

## Rollback

G4 no aplicó migraciones, no modificó funciones, vistas ni frontend productivo. Por lo tanto no existe delta productivo G4 que revertir.

El smoke crea únicamente fixtures sintéticos dentro de una transacción y ejecuta `ROLLBACK`; su propio rollback fue confirmado por el resultado `rollback=true`.

Si una generación futura introduce un delta tras un smoke fallido, debe revertirse sólo ese delta y repetirse este mismo smoke antes de promoción. No corresponde revertir I001–I007 ni la integración I008 previa cuando la suite actual pasa.
