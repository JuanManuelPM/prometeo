create or replace view public.prometeo_dag_capacity
with (security_invoker=true)
as
with per_project as (
  select
    p.project_id,
    p.title,
    p.status as project_status,
    coalesce(p.max_parallelism,0)::integer as max_parallelism,
    (count(j.*) filter (
      where j.status='READY' and coalesce(j.required_rank,0) <= 0
    ))::integer as ready_nodes,
    (count(j.*) filter (
      where j.status='LEASED' and j.lease_expires_at > now()
    ))::integer as leased_nodes,
    (count(j.*) filter (where j.status='BLOCKED'))::integer as blocked_nodes
  from public.prometeo_projects p
  left join public.prometeo_jobs j on j.project_id=p.project_id
  where p.status = any(array['OPEN','RUNNING','DRAINING']::text[])
  group by p.project_id,p.title,p.status,p.max_parallelism
), measured as (
  select
    x.*,
    greatest(x.max_parallelism-x.leased_nodes,0)::integer as free_project_slots,
    least(
      x.ready_nodes,
      greatest(x.max_parallelism-x.leased_nodes,0)
    )::integer as additional_workers_useful_now
  from per_project x
)
select
  m.*,
  (m.leased_nodes+m.additional_workers_useful_now)::integer as useful_worker_ceiling_now,
  case
    when m.additional_workers_useful_now > 0 then 'PARALLELISM_AVAILABLE'
    when m.leased_nodes >= m.max_parallelism and m.max_parallelism > 0 then 'PROJECT_CAP'
    when m.ready_nodes = 0 and m.blocked_nodes > 0 then 'DAG_DEPENDENCIES'
    when m.ready_nodes = 0 then 'NO_READY_NODES'
    else 'NO_IMMEDIATE_GAIN'
  end as limiting_factor,
  now() as observed_at
from measured m;

comment on view public.prometeo_dag_capacity is
'BACKLOG-154 instantaneous DAG-width estimate. useful_worker_ceiling_now is the number of workers that can help immediately given current READY nodes, live leases and per-project max_parallelism. This is not the empirical diminishing-returns knee from BACKLOG-163.';

create or replace view public.prometeo_dag_capacity_summary
with (security_invoker=true)
as
with cap as (
  select
    coalesce(sum(ready_nodes),0)::integer as ready_nodes,
    coalesce(sum(leased_nodes),0)::integer as leased_nodes,
    coalesce(sum(blocked_nodes),0)::integer as blocked_nodes,
    coalesce(sum(additional_workers_useful_now),0)::integer as additional_workers_useful_now,
    coalesce(sum(useful_worker_ceiling_now),0)::integer as useful_worker_ceiling_now
  from public.prometeo_dag_capacity
), workers as (
  select
    (count(*) filter (where liveness='WORKING'))::integer as working_workers
  from public.prometeo_control_worker_liveness
)
select
  c.ready_nodes,c.leased_nodes,c.blocked_nodes,
  w.working_workers,
  c.additional_workers_useful_now,
  c.useful_worker_ceiling_now,
  greatest(w.working_workers-c.useful_worker_ceiling_now,0)::integer as workers_beyond_immediate_dag_capacity,
  case
    when c.additional_workers_useful_now = 0 then 'NO_IMMEDIATE_GAIN'
    when c.additional_workers_useful_now <= 2 then 'LIMITED_HEADROOM'
    else 'PARALLELISM_AVAILABLE'
  end as marginal_worker_signal,
  now() as observed_at
from cap c cross join workers w;

comment on view public.prometeo_dag_capacity_summary is
'Global BACKLOG-154 projection: compares current worker supply with instantaneous runnable DAG width. It estimates immediate headroom only and deliberately does not claim a statistical knee.';

grant select on public.prometeo_dag_capacity to anon, authenticated;
grant select on public.prometeo_dag_capacity_summary to anon, authenticated;