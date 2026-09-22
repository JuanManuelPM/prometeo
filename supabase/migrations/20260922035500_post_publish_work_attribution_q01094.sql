-- AUTO-Q01094: attribute post-publish intervals to WORK when the same timestamp contains a WORK transition.
-- Prevent successful PUBLISH_RESULT from absorbing the duration of the next job.

-- TIMING-FUNNEL-FIX-01
-- Normalize session timing intervals and monotonic cohort funnel stages.

create or replace view public.prometeo_control_session_timing as
with raw_ranked as (
  select
    x.*,
    bool_or(x.state='WORK' or x.phase='WORK') over(
      partition by x.session_id,x.created_at
    ) as same_ts_has_work,
    row_number() over(
      partition by x.session_id,x.created_at
      order by x.event_id desc
    ) as same_ts_rank
  from public.prometeo_worker_session_events x
),
effective as (
  select
    r.event_id,r.event_key,r.session_id,r.agent_id,r.worker_code,r.protocol_version,
    r.phase,r.state,r.payload,r.created_at,r.same_ts_has_work,
    lead(r.created_at) over(
      partition by r.session_id
      order by r.created_at,r.event_id
    ) as next_at
  from raw_ranked r
  where r.same_ts_rank=1
),
session_event_stats as (
  select
    x.session_id,
    min(x.created_at) filter(where x.phase='PREFLIGHT') as preflight_event_at_raw,
    min(x.created_at) filter(where x.phase='ENTER') as enter_at_raw,
    min(x.created_at) filter(where x.state='WORK') as first_work_at_raw,
    min(x.created_at) filter(
      where x.phase like 'PUBLISH%'
        and x.state=any(array['PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'])
    ) as first_publish_at_raw,
    min(x.created_at) filter(where x.phase='CHECKPOINT') as checkpoint_at_raw,
    max(x.created_at) as last_event_at,
    count(*)::bigint as event_count
  from public.prometeo_worker_session_events x
  group by x.session_id
),
global_stage as (
  select
    e.agent_id,
    min(e.created_at) filter(where e.event_type='ENTER') as global_enter_at,
    min(e.created_at) filter(where e.event_type in ('JOB_ASSIGNED','RESCUE_ASSIGNED')) as global_work_at,
    min(e.created_at) filter(where e.event_type='JOB_COMPLETED') as global_publish_at
  from public.prometeo_events e
  group by e.agent_id
),
bounds as (
  select
    s.*,
    es.preflight_event_at_raw,
    es.enter_at_raw,
    es.first_work_at_raw,
    es.first_publish_at_raw,
    es.checkpoint_at_raw,
    es.last_event_at,
    coalesce(es.event_count,0::bigint) as event_count,
    gs.global_enter_at,
    gs.global_work_at,
    gs.global_publish_at,
    s.first_observed_at as t0_bound,
    case
      when s.closed_at is not null
        then greatest(s.closed_at,s.first_observed_at)
      else greatest(
        coalesce(s.last_seen_at,s.first_observed_at),
        coalesce(es.last_event_at,s.first_observed_at),
        s.first_observed_at
      )
    end as end_at
  from public.prometeo_worker_sessions s
  left join session_event_stats es using(session_id)
  left join global_stage gs on gs.agent_id=s.agent_id
),
intervals as (
  select
    b.session_id,
    e.event_id,
    greatest(e.created_at,b.t0_bound) as start_at,
    least(coalesce(e.next_at,b.end_at),b.end_at) as stop_at,
    case
      when e.phase='BOOT' then 'BOOT'
      when e.state='WORK' or e.phase='CHECKPOINT' then 'WORK'
      when e.phase='PUBLISH_RESULT'
        and e.state='PUBLISHED_AND_NEXT'
        and e.same_ts_has_work then 'WORK'
      when e.phase='PUBLISH' then 'PUBLISH'
      when e.phase='PUBLISH_RESULT'
        and e.state in ('RETRY_LENGTH','RETRY_CHILDREN') then 'WORK'
      when e.phase='PUBLISH_RESULT'
        and e.state in ('STALE_LEASE','WAIT','WAIT_TIMEOUT_CONTINUE','PARKED','PAUSED') then 'WAIT'
      when e.phase in ('WAIT','WAIT_RESULT') then 'WAIT'
      when e.phase in ('PREFLIGHT','ENTER','CONTRACT_COMPAT') then 'COORDINATION'
      else 'OTHER'
    end as bucket
  from bounds b
  left join effective e on e.session_id=b.session_id
),
dur as (
  select
    session_id,bucket,
    greatest(0::numeric,extract(epoch from(stop_at-start_at))*1000.0) as interval_ms
  from intervals
  where event_id is not null and stop_at>start_at
),
dur_agg as (
  select
    session_id,
    coalesce(sum(interval_ms) filter(where bucket='BOOT'),0::numeric) as boot_ms,
    coalesce(sum(interval_ms) filter(where bucket='COORDINATION'),0::numeric) as coordination_ms,
    coalesce(sum(interval_ms) filter(where bucket='WAIT'),0::numeric) as wait_ms,
    coalesce(sum(interval_ms) filter(where bucket='WORK'),0::numeric) as work_ms,
    coalesce(sum(interval_ms) filter(where bucket='PUBLISH'),0::numeric) as publish_ms
  from dur
  group by session_id
),
normalized as (
  select
    b.*,
    coalesce(d.boot_ms,0::numeric) as boot_ms_num,
    coalesce(d.coordination_ms,0::numeric) as coordination_ms_num,
    coalesce(d.wait_ms,0::numeric) as wait_ms_num,
    coalesce(d.work_ms,0::numeric) as work_ms_num,
    coalesce(d.publish_ms,0::numeric) as publish_ms_num,
    greatest(0::numeric,extract(epoch from(b.end_at-b.t0_bound))*1000.0) as observed_ms_num
  from bounds b
  left join dur_agg d using(session_id)
)
select
  n.session_id,
  n.agent_id,
  n.worker_code,
  n.protocol_version,
  n.prompt_version,
  nullif(n.declaration->>'launch_batch','') as launch_batch,
  n.t0_bound as t0,
  case when n.preflight_event_at_raw is not null
    then greatest(n.t0_bound,n.preflight_event_at_raw) end as preflight_event_at,
  case when least(n.enter_at_raw,n.global_enter_at) is not null
    then greatest(n.t0_bound,least(n.enter_at_raw,n.global_enter_at)) end as enter_at,
  case when least(n.first_work_at_raw,n.global_work_at) is not null
    then greatest(n.t0_bound,least(n.first_work_at_raw,n.global_work_at)) end as first_work_at,
  case when least(n.first_publish_at_raw,n.global_publish_at) is not null
    then greatest(n.t0_bound,least(n.first_publish_at_raw,n.global_publish_at)) end as first_publish_at,
  n.last_event_at,
  n.last_seen_at,
  n.last_state,
  n.last_reason_code,
  n.final_state,
  n.event_count,
  case when least(n.enter_at_raw,n.global_enter_at) is not null
    then round(extract(epoch from(
      greatest(n.t0_bound,least(n.enter_at_raw,n.global_enter_at))-n.t0_bound
    ))*1000)::bigint end as t0_to_enter_ms,
  case when least(n.first_work_at_raw,n.global_work_at) is not null
    then round(extract(epoch from(
      greatest(n.t0_bound,least(n.first_work_at_raw,n.global_work_at))-n.t0_bound
    ))*1000)::bigint end as t0_to_work_ms,
  case when least(n.first_publish_at_raw,n.global_publish_at) is not null
    then round(extract(epoch from(
      greatest(n.t0_bound,least(n.first_publish_at_raw,n.global_publish_at))-n.t0_bound
    ))*1000)::bigint end as t0_to_publish_ms,
  round(n.boot_ms_num)::bigint as boot_ms,
  round(n.coordination_ms_num)::bigint as coordination_ms,
  round(n.wait_ms_num)::bigint as wait_ms,
  round(n.work_ms_num)::bigint as work_ms,
  round(n.publish_ms_num)::bigint as publish_ms,
  greatest(
    0::bigint,
    round(n.observed_ms_num)::bigint
      - round(n.boot_ms_num)::bigint
      - round(n.coordination_ms_num)::bigint
      - round(n.wait_ms_num)::bigint
      - round(n.work_ms_num)::bigint
      - round(n.publish_ms_num)::bigint
  ) as other_ms,
  greatest(1::bigint,round(n.observed_ms_num)::bigint) as observed_ms,
  round(
    (100.0*n.work_ms_num)/greatest(1::numeric,n.observed_ms_num),1
  ) as work_pct,
  round(
    (100.0*n.wait_ms_num)/greatest(1::numeric,n.observed_ms_num),1
  ) as wait_pct,
  case when n.checkpoint_at_raw is not null
    then greatest(n.t0_bound,n.checkpoint_at_raw) end as checkpoint_at
from normalized n;

create or replace view public.prometeo_control_cohort_timing as
with base as (
  select
    st.*,
    w.status as worker_status,
    coalesce(w.jobs_done,0) as jobs_done,
    (st.first_publish_at is not null) as has_publish_evidence
  from public.prometeo_control_session_timing st
  left join public.prometeo_workers w on w.agent_id=st.agent_id
),
truth as (
  select
    b.*,
    (
      b.first_work_at is not null
      or b.has_publish_evidence
      or b.jobs_done>0
      or b.worker_status='WORKING'
      or b.last_state=any(array[
        'WORK','CHECKPOINT_OK','CHECKPOINTED',
        'PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'
      ])
    ) as has_work_evidence
  from base b
),
stages as (
  select
    t.*,
    (
      t.enter_at is not null
      or t.has_work_evidence
      or t.has_publish_evidence
    ) as has_enter_evidence,
    (
      t.has_work_evidence and t.first_work_at is null
    ) as missing_work_timing
  from truth t
)
select
  coalesce(launch_batch,'UNBATCHED') as launch_batch,
  protocol_version,
  count(*) as sessions,
  count(*) filter(where preflight_event_at is not null) as preflight_ok,
  count(*) filter(where has_enter_evidence) as entered,
  count(*) filter(where has_work_evidence) as reached_work,
  count(*) filter(where has_publish_evidence) as published,
  count(*) filter(where last_state='PARKED') as parked,
  count(*) filter(where last_state=any(array['WAIT_TIMEOUT_CONTINUE','WAIT'])) as waiting_or_wait_timeout,
  round(avg(t0_to_enter_ms) filter(where t0_to_enter_ms is not null))::bigint as avg_t0_to_enter_ms,
  round(avg(t0_to_work_ms) filter(where t0_to_work_ms is not null))::bigint as avg_t0_to_work_ms,
  case when bool_or(missing_work_timing) then null::numeric
       else round(avg(work_pct),1) end as avg_work_pct,
  round(avg(wait_pct),1) as avg_wait_pct,
  min(t0) as cohort_first_seen_at,
  max(t0) as cohort_last_seen_at
from stages
group by coalesce(launch_batch,'UNBATCHED'),protocol_version;
