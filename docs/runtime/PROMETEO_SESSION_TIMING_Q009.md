# Q009 — Timing model validation

## Reconciliación con backend vigente · 2026-09-22

Los puntos 1–4 de la sección histórica siguiente describen defectos del snapshot previo a las correcciones de timing; ya no deben leerse como defectos del view vigente. La definición actual de `public.prometeo_control_session_timing`:

- cierra la cola abierta con `end_at` usando `closed_at` para sesiones cerradas y el máximo observable entre `last_seen_at`, `last_event_at` y `first_observed_at` para sesiones abiertas;
- recorta intervalos contra `t0_bound` con `greatest(event_at, t0_bound)`;
- colapsa timestamps iguales mediante `row_number() over (partition by session_id, created_at ...)` antes de calcular `lead()`;
- clasifica `PUBLISH_RESULT + RETRY_LENGTH/RETRY_CHILDREN` como WORK y `STALE_LEASE/WAIT/WAIT_TIMEOUT_CONTINUE/PARKED/PAUSED` como WAIT;
- cuando `PUBLISH_RESULT + PUBLISHED_AND_NEXT` comparte timestamp con una transición WORK, usa `same_ts_has_work` para conservar ese intervalo en WORK en vez de atribuirlo a PUBLISH;
- conserva el intervalo total calculando `other_ms` como residual no negativo del observado.

El punto 5 está **parcialmente mitigado, no cerrado**: el view actual incorpora `prometeo_events` como fallback para los primeros hitos ENTER / JOB_ASSIGNED|RESCUE_ASSIGNED / JOB_COMPLETED, pero no reconstruye por esa vía todas las transiciones repetidas de WAIT o WORK que falten en `prometeo_worker_session_events`. Por eso la recomendación histórica de identidades de evento por ciclo/request sigue vigente para trazabilidad completa.

La sección siguiente se conserva como diagnóstico histórico y justificación de las correcciones implementadas.

## Defectos verificados en el snapshot previo

1. **Open-tail loss.** The last event uses `coalesce(next_at, created_at)`, so its duration is always zero. Separately, `observed_ms` uses `coalesce(last_event_at, last_seen_at, t0)`; whenever a last event exists, a later `last_seen_at` is ignored. In K056, `last_event_at=02:59:08.511569Z` while `last_seen_at=03:01:59.476433Z`, so roughly 171 seconds disappeared from both buckets and the denominator.

2. **T0 clipping error.** Backfilled/compatibility events can precede `first_observed_at`. K056 has ENTER at 02:44:28.377025Z and T0 at 02:44:28.384286Z. Current bucket sums therefore exceeded `observed_ms` by ~7 ms. Recent sessions show the same small negative uncovered delta.

3. **Simultaneous events are order-sensitive.** `lead(created_at) over(order by created_at,event_id)` gives zero duration to all but the final event at an identical timestamp. The total is conserved only accidentally, and the final event_id determines the semantic bucket. The model should first collapse equal timestamps to one effective transition while retaining raw event_count separately.

4. **PUBLISH_RESULT is misclassified.** Current CASE assigns every `PUBLISH%` row to PUBLISH unless state is WORK. After `RETRY_LENGTH` or `RETRY_CHILDREN`, the worker is rewriting and should be WORK, not PUBLISH. After `STALE_LEASE` the next phase is WAIT. K056 currently attributes ~29.9 s after RETRY_LENGTH to PUBLISH.

5. **Backfill is structurally incomplete.** `prometeo_worker_session_touch` deduplicates on event_key. WAIT uses a constant key per agent and WAIT_RESULT a constant key per agent+state, so repeated waits and later WORK assignments are absent from `prometeo_worker_session_events`. K056's second assignment at 03:01:59.476433Z exists in `prometeo_events` as RESCUE_ASSIGNED but is missing from the session-event timeline.

## Mathematical correction

Use one explicit interval `[t0, end_at]`, where closed sessions use `closed_at` and open sessions use query time (the protocol defines them as resident until closed/stopped). For each distinct event timestamp, retain one effective transition, then compute:

`start_at = greatest(event_at, t0)`

`stop_at = least(coalesce(next_distinct_event_at, end_at), end_at)`

`interval_ms = max(0, stop_at - start_at)`

Clip all pre-T0 backfill to zero. Any uncovered gap must be assigned to OTHER rather than existing only in the denominator. Percentages must divide by the exact conserved bucket sum / observed interval so `BOOT + COORDINATION + WAIT + WORK + PUBLISH + OTHER = observed_ms` (allowing at most rounding noise).

State-aware bucket rules: WORK state and CHECKPOINT => WORK; `PUBLISH_RESULT + PUBLISHED_AND_NEXT` at a timestamp that also contains WORK => WORK; PUBLISH request => PUBLISH only until its result; PUBLISH_RESULT RETRY_LENGTH/RETRY_CHILDREN => WORK; PUBLISH_RESULT STALE_LEASE/WAIT/PARKED/PAUSED => WAIT; WAIT/WAIT_RESULT non-WORK => WAIT; PREFLIGHT/ENTER/CONTRACT_COMPAT => COORDINATION.

For historical backfill, union canonical `prometeo_events` transitions into the timing stream when the session-event record is missing: PARKED => WAIT, JOB_ASSIGNED/RESCUE_ASSIGNED => WORK, LEASE_EXPIRED/STALE_RESULT_REJECTED => WAIT, plus publish outcomes. Future event keys should include a request/sequence identity (wait cycle, lease fingerprint, or durable event id), not only agent+state, so repeated transitions remain observable.

## Fixture

`supabase/tests/runtime_session_timing_q009.sql` covers pre-T0 data, duplicate timestamps, missing next event, open tail, retry-to-WORK semantics, and conservation. Executed against Supabase: all six assertions returned true.
