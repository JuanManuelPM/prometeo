# Q01072 — Recalcular work_pct sólo con sesiones post-ENTER_RESULT

## Estado

Especificación ejecutable. No cambia runtime, scheduler, vistas ni contratos de lease. Su objetivo es cerrar un sesgo de medición identificado por Guide State sin mezclar sesiones históricas que no podían observar `ENTER_RESULT`.

## Provenance verificada

- Guide State `MAIN`, actualizado `2026-09-22 03:27:24+00`, indica que el histórico de WORK sigue sesgado a 0% porque `ENTER_RESULT` quedó instrumentado desde la migración de aproximadamente `03:24 UTC`, y pide recalcular `work_pct` sólo con sesiones posteriores.
- Los otros tres follow-ups explícitos de GUIDE-G0003 ya estaban cubiertos al revisar dedupe: `GUIDE-G0003-BACKOFF-LIVE` estaba `DONE`; `GUIDE-G0003-CHK-IDEMP` y `GUIDE-G0003-GATE-RESERVOIR` estaban `LEASED` por otros workers. Este trabajo no los duplica.
- No había jobs cuyo title/objective/instruction coincidiera con `work_pct` o `ENTER_RESULT`.
- `docs/runtime/PROMETEO_SESSION_TIMING_Q009.md` ya corrige el modelo temporal (tail, T0, retry semantics, conservación), pero no define el cohortado post-instrumentación requerido para interpretar `work_pct`.
- El esquema observado de `public.prometeo_worker_session_events` expone `session_id`, `agent_id`, `worker_code`, `phase`, `state`, `payload` y `created_at`.
- Las métricas existentes aparecen en `prometeo_control_session_timing.work_pct`, `prometeo_control_cohort_timing.avg_work_pct` y `prometeo_control_minimal.batch_work_pct`.

## Regla de cohorte

La medición post-instrumentación debe incluir únicamente sesiones que tengan evidencia durable de `ENTER_RESULT` generada después del corte de instrumentación. Para esta iteración el corte documentado es:

`2026-09-22 03:24:00+00`

No se debe inferir `ENTER_RESULT` para sesiones anteriores ni completar el faltante con backfill sintético. La salida debe exponer siempre el tamaño de muestra; un porcentaje sin `eligible_sessions` es incompleto.

## Consulta de elegibilidad

```sql
with eligible as (
  select distinct session_id
  from public.prometeo_worker_session_events
  where phase = 'ENTER_RESULT'
    and created_at >= timestamptz '2026-09-22 03:24:00+00'
)
select
  count(*) as eligible_sessions,
  min(e.created_at) as first_enter_result,
  max(e.created_at) as last_enter_result
from public.prometeo_worker_session_events e
join eligible x using (session_id)
where e.phase = 'ENTER_RESULT'
  and e.created_at >= timestamptz '2026-09-22 03:24:00+00';
```

## Consulta de work_pct post-migración

```sql
with eligible as (
  select distinct session_id
  from public.prometeo_worker_session_events
  where phase = 'ENTER_RESULT'
    and created_at >= timestamptz '2026-09-22 03:24:00+00'
),
sample as (
  select t.*
  from public.prometeo_control_session_timing t
  join eligible e using (session_id)
)
select
  count(*) as eligible_sessions,
  round(avg(work_pct)::numeric, 2) as avg_work_pct,
  min(work_pct) as min_work_pct,
  max(work_pct) as max_work_pct
from sample;
```

Si `prometeo_control_session_timing` no conserva `session_id` como clave pública, el implementador debe unir por la clave durable equivalente expuesta por esa vista; no debe sustituirla por `worker_code` si eso mezcla encarnaciones.

## Criterios de aceptación

1. La consulta no incluye ninguna sesión sin `ENTER_RESULT` post-corte.
2. Se informa `eligible_sessions` junto con `avg_work_pct`.
3. El resultado se compara con el porcentaje histórico sólo como diagnóstico; no se presenta el histórico pre-instrumentación como representativo.
4. Si la muestra está vacía, el estado correcto es `NO_POST_MIGRATION_SAMPLE`, no `0% WORK`.
5. No se cambia el modelo Q009 ni se reescribe historia para hacer coincidir porcentajes.
6. Cualquier futura automatización debe derivar el corte desde provenance de la migración/instrumentación, no desde una fecha hardcodeada sin recibo.

## Siguiente implementación mínima

Agregar una lectura derivada o reporte de control que aplique esta cohorte y exponga `eligible_sessions`, `avg_work_pct`, `first_enter_result` y `last_enter_result`. Mantener las vistas actuales intactas hasta verificar una muestra natural y comparar conservación temporal con Q009.
