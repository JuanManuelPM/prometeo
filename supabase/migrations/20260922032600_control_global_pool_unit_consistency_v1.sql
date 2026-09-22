-- AUTO-Q01001: keep prometeo_control_projects GLOBAL_POOL unit columns dimensionally consistent.
-- total/done/active/ready/blocked are all job counts; expected_workers remains capacity.

create or replace view public.prometeo_control_projects as
select
  'BLUEPRINT'::text as project_type,
  p.blueprint_id as project_id,
  p.title,
  p.status,
  p.expected_workers,
  count(j.*)::integer as total_units,
  count(j.*) filter(where j.status='DONE')::integer as done_units,
  count(j.*) filter(where j.status='LEASED')::integer as active_units,
  count(j.*) filter(where j.status='READY')::integer as ready_units,
  count(j.*) filter(where j.status='BLOCKED')::integer as blocked_units,
  p.created_at,p.started_at,p.finished_at
from public.blueprint_projects p
left join public.blueprint_jobs j on j.blueprint_id=p.blueprint_id
group by p.blueprint_id,p.title,p.status,p.expected_workers,p.created_at,p.started_at,p.finished_at

union all

select
  'FORGE'::text as project_type,
  g.goal_id as project_id,
  g.title,
  g.status,
  g.expected_workers,
  count(t.*)::integer as total_units,
  count(t.*) filter(where t.status='DONE')::integer as done_units,
  count(t.*) filter(where t.status='LEASED')::integer as active_units,
  count(t.*) filter(where t.status='READY')::integer as ready_units,
  count(t.*) filter(where t.status='BLOCKED')::integer as blocked_units,
  g.created_at,g.started_at,g.finished_at
from public.forge_goals g
left join public.forge_tasks t on t.goal_id=g.goal_id
group by g.goal_id,g.title,g.status,g.expected_workers,g.created_at,g.started_at,g.finished_at

union all

select
  'POOL'::text as project_type,
  r.run_id as project_id,
  r.run_id as title,
  r.status,
  r.expected_workers,
  count(t.*)::integer as total_units,
  count(t.*) filter(where t.status='DONE')::integer as done_units,
  count(t.*) filter(where t.status='LEASED')::integer as active_units,
  count(t.*) filter(where t.status='READY')::integer as ready_units,
  0 as blocked_units,
  r.created_at,r.started_at,r.finished_at
from public.pool_lab_runs r
left join public.pool_lab_tasks t on t.run_id=r.run_id
group by r.run_id,r.status,r.expected_workers,r.created_at,r.started_at,r.finished_at

union all

select
  'GLOBAL'::text as project_type,
  p.project_id,
  p.title,
  p.status,
  p.desired_parallelism as expected_workers,
  count(j.*)::integer as total_units,
  count(j.*) filter(where j.status='DONE')::integer as done_units,
  count(j.*) filter(where j.status='LEASED')::integer as active_units,
  count(j.*) filter(where j.status='READY')::integer as ready_units,
  count(j.*) filter(where j.status='BLOCKED')::integer as blocked_units,
  p.created_at,p.started_at,p.finished_at
from public.prometeo_projects p
left join public.prometeo_jobs j on j.project_id=p.project_id
group by p.project_id,p.title,p.status,p.desired_parallelism,p.created_at,p.started_at,p.finished_at

union all

select
  'GLOBAL_POOL'::text as project_type,
  'PROMETEO-GLOBAL'::text as project_id,
  'Global Worker Pool'::text as title,
  case when count(*) filter(where w.status<>'STOPPED')>0 then 'RUNNING'::text else 'PAUSED'::text end as status,
  count(*) filter(where w.status<>'STOPPED')::integer as expected_workers,
  (select count(*)::integer from public.prometeo_jobs) as total_units,
  (select count(*)::integer from public.prometeo_jobs where status='DONE') as done_units,
  (select count(*)::integer from public.prometeo_jobs where status='LEASED') as active_units,
  (select count(*)::integer from public.prometeo_jobs where status='READY') as ready_units,
  (select count(*)::integer from public.prometeo_jobs where status='BLOCKED') as blocked_units,
  min(w.joined_at) as created_at,
  min(w.joined_at) as started_at,
  null::timestamptz as finished_at
from public.prometeo_workers w
having count(*)>0;
