-- I003 regression fixture: worker-specific scheduler assignability.
-- Read-only CTE: no production rows are changed.
-- Expected: all four booleans = true.

with
worker as (
  select 'K056'::text worker_code, 0::int rank_level
),
other_workers(worker_code,status,rank_level) as (
  values ('K999'::text,'PARKED'::text,0::int)
),
projects(project_id,status,priority,min_parallelism,desired_parallelism,max_parallelism,working_count) as (
  values
    ('TARGET','RUNNING',200,0,1,4,0),
    ('GLOBAL','RUNNING',150,0,1,4,0),
    ('DONE','DONE',999,0,1,4,0),
    ('FULL','RUNNING',300,0,1,1,1)
),
jobs(project_id,job_key,status,required_rank,last_worker_code) as (
  values
    ('TARGET','T1','READY',0,'K056'),
    ('GLOBAL','G1','READY',0,null),
    ('DONE','D1','READY',0,null),
    ('FULL','F1','READY',0,null)
),
assignable as (
  select j.*,
    (
      j.status='READY'
      and j.required_rank <= (select rank_level from worker)
      and (
        j.last_worker_code is null
        or j.last_worker_code<>(select worker_code from worker)
        or not exists(
          select 1 from other_workers alt
          where alt.status in ('WAITING','PARKED')
            and alt.rank_level>=j.required_rank
        )
      )
    ) as is_assignable
  from jobs j
),
chosen as (
  select p.project_id
  from projects p
  where p.status in ('OPEN','RUNNING')
    and p.working_count < p.max_parallelism
    and exists(
      select 1 from assignable a
      where a.project_id=p.project_id and a.is_assignable
    )
  order by
    case when p.working_count<p.min_parallelism then 1 else 0 end desc,
    case when p.working_count<p.desired_parallelism then 1 else 0 end desc,
    p.priority desc,
    p.working_count asc,
    p.project_id asc
  limit 1
)
select
  not exists(
    select 1 from assignable
    where project_id='TARGET' and is_assignable
  ) as target_rejected_for_worker,
  exists(
    select 1 from jobs
    where project_id='TARGET' and status='READY'
  ) as target_still_has_ready,
  (select project_id from chosen)='GLOBAL' as global_fallback_selected,
  not exists(
    select 1 from chosen where project_id in ('DONE','FULL')
  ) as inactive_or_full_not_selected;
