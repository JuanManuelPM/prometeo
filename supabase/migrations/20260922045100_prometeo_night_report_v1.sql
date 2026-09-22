-- CORE-V1 MORNING BUILD
-- Read-only overnight/morning snapshot. DONE_REAL is intentionally stricter than a label.

create or replace view public.prometeo_night_report
with (security_invoker=false)
as
select
  p.product_id,
  p.sequence_no,
  p.title,
  p.objective,
  p.artifact_url,
  p.status,
  p.started_at,
  p.finished_at,
  p.sheets_total,
  p.sheets_done,
  p.sheets_crossfilled,
  p.sheets_crossfill_required,
  p.sheet_touches,
  p.distinct_workers,
  p.sheet_progress_pct,
  p.ready_jobs,
  p.working_jobs,
  p.blocked_jobs,
  p.done_jobs,
  p.cancelled_jobs,
  p.outputs,
  p.first_output_at,
  p.last_output_at,
  p.worker_elapsed_ms,
  p.wall_minutes,
  (
    p.status='DONE'
    and p.finished_at is not null
    and p.sheets_total > 0
    and p.sheets_done = p.sheets_total
    and p.sheets_crossfilled >= p.sheets_crossfill_required
  ) as done_real,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sheet_key',s.sheet_key,
        'title',s.title,
        'objective',s.objective,
        'artifact_scope',s.artifact_scope,
        'status',s.status,
        'requires_crossfill',s.requires_crossfill,
        'touch_count',s.touch_count,
        'distinct_workers',s.distinct_workers,
        'first_worker_code',s.first_worker_code,
        'last_worker_code',s.last_worker_code,
        'first_touched_at',s.first_touched_at,
        'last_touched_at',s.last_touched_at,
        'verified_at',s.verified_at,
        'build_status',s.build_status,
        'review_status',s.review_status
      )
      order by s.sheet_key
    ) filter (where s.sheet_key is not null),
    '[]'::jsonb
  ) as sheets,
  now() as server_time
from public.prometeo_morning_products p
left join public.prometeo_morning_sheets s on s.product_id=p.product_id
group by
  p.product_id,p.sequence_no,p.title,p.objective,p.artifact_url,p.status,p.started_at,p.finished_at,
  p.sheets_total,p.sheets_done,p.sheets_crossfilled,p.sheets_crossfill_required,p.sheet_touches,
  p.distinct_workers,p.sheet_progress_pct,p.ready_jobs,p.working_jobs,p.blocked_jobs,p.done_jobs,
  p.cancelled_jobs,p.outputs,p.first_output_at,p.last_output_at,p.worker_elapsed_ms,p.wall_minutes
order by p.sequence_no;

comment on view public.prometeo_night_report is
  'Morning/overnight read-only report: products, sheets, artifact scopes, timings and strict DONE_REAL evidence.';

grant select on public.prometeo_night_report to anon, authenticated;
