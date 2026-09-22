-- Q027 scheduler fairness fixtures.
-- Derived from Q016 (scheduler audit) and Q019 (isolated runtime fixture rules).
-- Read-only: every case is VALUES/CTE based. No production rows are read or changed.
--
-- Covered invariants:
--   1. MIN_PROTECTION: a project below min beats a higher-priority project already at min.
--   2. HARD_MAX: a project at max_parallelism is not selectable.
--   3. NO_READY: priority cannot block a lower-priority project that actually has READY work.
--   4. RANK_INCOMPATIBILITY: incompatible READY work cannot block compatible work.
--   5. BOUNDED_STARVATION: current below-desired ordering reproduces starvation; a fixture-only
--      normalized-progress comparator demonstrates a minimal candidate correction.
--
-- The normalized comparator is NOT deployed here. Production prometeo_allocate/_core remain unchanged.
-- Rollback: delete this fixture file only; there is no production scheduler migration to revert.
-- Expected result: exactly five rows and fixture_pass=true for all rows.

with recursive
one_step_projects(
  case_id,
  project_id,
  priority,
  min_parallelism,
  desired_parallelism,
  max_parallelism,
  working_count,
  has_ready,
  required_rank
) as (
  values
    ('MIN_PROTECTION','A',150,6,8,12,6,true,0),
    ('MIN_PROTECTION','B',10,1,1,2,0,true,0),

    ('HARD_MAX','A',150,0,2,2,2,true,0),
    ('HARD_MAX','B',90,0,10,20,0,true,0),

    ('NO_READY','A',150,0,8,12,0,false,0),
    ('NO_READY','B',90,0,10,20,0,true,0),

    ('RANK_INCOMPATIBILITY','A',150,0,8,12,0,true,3),
    ('RANK_INCOMPATIBILITY','B',90,0,10,20,0,true,0)
),
one_step_workers(case_id,rank_level) as (
  values
    ('MIN_PROTECTION',0),
    ('HARD_MAX',0),
    ('NO_READY',0),
    ('RANK_INCOMPATIBILITY',0)
),
one_step_ranked as (
  select
    p.*,
    row_number() over (
      partition by p.case_id
      order by
        case when p.working_count<p.min_parallelism then 1 else 0 end desc,
        case when p.working_count<p.desired_parallelism then 1 else 0 end desc,
        p.priority desc,
        p.working_count asc,
        p.project_id asc
    ) as rn
  from one_step_projects p
  join one_step_workers w using(case_id)
  where p.has_ready
    and p.required_rank<=w.rank_level
    and p.working_count<p.max_parallelism
),
one_step as (
  select case_id,project_id
  from one_step_ranked
  where rn=1
),

-- BEFORE: mirror the current below-min / below-desired / priority ordering.
current_sim(step,a_working,b_working,last_choice) as (
  select 0,0,0,null::text
  union all
  select
    s.step+1,
    s.a_working + case when pick.project_id='A' then 1 else 0 end,
    s.b_working + case when pick.project_id='B' then 1 else 0 end,
    pick.project_id
  from current_sim s
  cross join lateral (
    select p.project_id
    from (
      values
        ('A'::text,150,0,100,100,s.a_working),
        ('B'::text,90,0,10,20,s.b_working)
    ) p(project_id,priority,min_parallelism,desired_parallelism,max_parallelism,working_count)
    where p.working_count<p.max_parallelism
    order by
      case when p.working_count<p.min_parallelism then 1 else 0 end desc,
      case when p.working_count<p.desired_parallelism then 1 else 0 end desc,
      p.priority desc,
      p.working_count asc,
      p.project_id asc
    limit 1
  ) pick
  where s.step<20
),

-- AFTER CANDIDATE, fixture only: preserve the two bands and hard max, but compare normalized
-- progress toward desired before priority. This is evidence, not a production change.
candidate_sim(step,a_working,b_working,last_choice) as (
  select 0,0,0,null::text
  union all
  select
    s.step+1,
    s.a_working + case when pick.project_id='A' then 1 else 0 end,
    s.b_working + case when pick.project_id='B' then 1 else 0 end,
    pick.project_id
  from candidate_sim s
  cross join lateral (
    select p.project_id
    from (
      values
        ('A'::text,150,0,100,100,s.a_working),
        ('B'::text,90,0,10,20,s.b_working)
    ) p(project_id,priority,min_parallelism,desired_parallelism,max_parallelism,working_count)
    where p.working_count<p.max_parallelism
    order by
      case when p.working_count<p.min_parallelism then 1 else 0 end desc,
      case when p.working_count<p.desired_parallelism then 1 else 0 end desc,
      case
        when p.desired_parallelism>0
          then p.working_count::numeric/p.desired_parallelism
        else 1
      end asc,
      p.priority desc,
      p.working_count asc,
      p.project_id asc
    limit 1
  ) pick
  where s.step<20
),
current_summary as (
  select
    max(a_working) filter (where step=20) as a20,
    max(b_working) filter (where step=20) as b20,
    min(step) filter (where last_choice='B') as first_b_step
  from current_sim
),
candidate_summary as (
  select
    max(a_working) filter (where step=20) as a20,
    max(b_working) filter (where step=20) as b20,
    min(step) filter (where last_choice='B') as first_b_step
  from candidate_sim
)
select *
from (
  select
    'MIN_PROTECTION'::text as case_id,
    (select project_id from one_step where case_id='MIN_PROTECTION') as before_state,
    'B'::text as expected_state,
    null::text as after_state,
    ((select project_id from one_step where case_id='MIN_PROTECTION')='B') as fixture_pass

  union all

  select
    'HARD_MAX',
    (select project_id from one_step where case_id='HARD_MAX'),
    'B',
    null,
    ((select project_id from one_step where case_id='HARD_MAX')='B')

  union all

  select
    'NO_READY',
    (select project_id from one_step where case_id='NO_READY'),
    'B',
    null,
    ((select project_id from one_step where case_id='NO_READY')='B')

  union all

  select
    'RANK_INCOMPATIBILITY',
    (select project_id from one_step where case_id='RANK_INCOMPATIBILITY'),
    'B',
    null,
    ((select project_id from one_step where case_id='RANK_INCOMPATIBILITY')='B')

  union all

  select
    'BOUNDED_STARVATION',
    format(
      'current:A=%s,B=%s,firstB=%s',
      c.a20,
      c.b20,
      coalesce(c.first_b_step::text,'null')
    ),
    'current exposes B=0; candidate serves B by step 2',
    format(
      'candidate:A=%s,B=%s,firstB=%s',
      f.a20,
      f.b20,
      coalesce(f.first_b_step::text,'null')
    ),
    (c.b20=0 and f.b20>0 and f.first_b_step<=2)
  from current_summary c
  cross join candidate_summary f
) q
order by case_id;
