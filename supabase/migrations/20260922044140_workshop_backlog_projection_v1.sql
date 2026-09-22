-- BACKLOG-243: safe public projection for the workshop backlog zone.
-- Read-only; no mutation authority is exposed.

create or replace view public.prometeo_workshop_backlog
with (security_invoker=false)
as
select
  source_key,
  title,
  state,
  work_kind,
  priority,
  materialized_job_key,
  created_at,
  completed_at
from public.prometeo_frontier_sources
where source_type='BACKLOG';

comment on view public.prometeo_workshop_backlog is
  'BACKLOG-243 read-only backlog projection for the physical worker workshop.';

grant select on public.prometeo_workshop_backlog to anon, authenticated;
