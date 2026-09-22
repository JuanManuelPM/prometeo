-- BACKLOG-124: read-only worker inspection projection.
-- Combines durable session route, published jobs, explicit rescues and reusable learning.

create or replace view public.prometeo_worker_inspection
with (security_invoker=false)
as
with latest_flight as (
  select distinct on (worker_code)
    worker_code,
    session_id,
    protocol_version,
    first_observed_at,
    first_work_observed_at,
    first_publish_at,
    last_event_at,
    last_seen_at,
    last_state,
    last_reason_code,
    event_count,
    publish_count,
    tool_failure_count,
    recovery_ms,
    work_ms,
    wait_ms,
    observed_ms,
    work_pct,
    wait_pct
  from public.prometeo_worker_flight_recorder
  where worker_code is not null
  order by worker_code, last_seen_at desc nulls last, last_event_at desc nulls last
)
select
  f.worker_code,
  f.session_id,
  f.protocol_version,
  f.first_observed_at,
  f.first_work_observed_at,
  f.first_publish_at,
  f.last_event_at,
  f.last_seen_at,
  f.last_state,
  f.last_reason_code,
  f.event_count,
  f.publish_count,
  f.tool_failure_count,
  f.recovery_ms,
  f.work_ms,
  f.wait_ms,
  f.observed_ms,
  f.work_pct,
  f.wait_pct,
  coalesce((
    select count(*)::integer
    from public.prometeo_outputs o
    where o.worker_code=f.worker_code
  ),0) as task_count,
  coalesce((
    select count(*)::integer
    from public.prometeo_outputs o
    where o.worker_code=f.worker_code and o.rescued
  ),0) as rescue_count,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'job_key', q.job_key,
      'project_id', q.project_id,
      'published_at', q.published_at,
      'rescued', q.rescued,
      'generation', q.generation,
      'outcome', q.meta #>> '{frontier,outcome}'
    ) order by q.published_at desc)
    from (
      select o.job_key,o.project_id,o.published_at,o.rescued,o.generation,o.meta
      from public.prometeo_outputs o
      where o.worker_code=f.worker_code
      order by o.published_at desc
      limit 12
    ) q
  ),'[]'::jsonb) as tasks,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'at', q.created_at,
      'phase', q.phase,
      'state', q.state,
      'job_key', q.payload->>'job_key',
      'reason_code', q.payload->>'reason_code'
    ) order by q.created_at desc, q.event_id desc)
    from (
      select e.event_id,e.created_at,e.phase,e.state,e.payload
      from public.prometeo_worker_session_events e
      where e.session_id=f.session_id
      order by e.created_at desc,e.event_id desc
      limit 30
    ) q
  ),'[]'::jsonb) as route,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'job_key', q.job_key,
      'published_at', q.published_at,
      'learning', q.learning
    ) order by q.published_at desc)
    from (
      select o.job_key,o.published_at,l.learning
      from public.prometeo_outputs o
      cross join lateral jsonb_array_elements_text(
        case
          when jsonb_typeof(o.meta #> '{frontier,reusable_learning}')='array'
            then o.meta #> '{frontier,reusable_learning}'
          else '[]'::jsonb
        end
      ) as l(learning)
      where o.worker_code=f.worker_code
      order by o.published_at desc
      limit 12
    ) q
  ),'[]'::jsonb) as knowledge_created
from latest_flight f;

comment on view public.prometeo_worker_inspection is
  'BACKLOG-124 read-only inspection: session route, published tasks, explicit rescue flags and reusable learning declared by worker outputs.';

grant select on public.prometeo_worker_inspection to anon, authenticated;
