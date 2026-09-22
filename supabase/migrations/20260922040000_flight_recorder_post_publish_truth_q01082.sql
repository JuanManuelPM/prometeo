-- AUTO-Q01082: align Flight Recorder post-publish interval attribution with canonical session timing.
-- Same-timestamp WORK after PUBLISHED_AND_NEXT means the following interval belongs to the next job.

-- F001: worker flight recorder stage-truth reconciliation.
-- Keep duration metrics observational; separate observed stage evidence from logical inference.

create or replace view public.prometeo_worker_flight_recorder as
with ev as (
  select
    e.event_id,e.event_key,e.session_id,e.agent_id,e.worker_code,e.protocol_version,
    e.phase,e.state,e.payload,e.created_at,
    bool_or(e.state='WORK' or e.phase='WORK') over(
      partition by e.session_id,e.created_at
    ) as same_ts_has_work,
    lead(e.created_at) over(partition by e.session_id order by e.created_at,e.event_id) as next_at
  from public.prometeo_worker_session_events e
),
intervals as (
  select
    e.*,
    greatest(
      0::numeric,
      extract(epoch from(coalesce(e.next_at,e.created_at)-e.created_at))*1000.0
    ) as interval_ms,
    case
      when e.phase=any(array['BOOT','PREFLIGHT','ENTER','BOOTSTRAP','CONTRACT_COMPAT'])
        then 'COORDINATION'
      when e.state='WORK' then 'WORK'
      when e.phase='CHECKPOINT' then 'WORK'
      when e.phase='PUBLISH_RESULT'
        and e.state='PUBLISHED_AND_NEXT'
        and e.same_ts_has_work then 'WORK'
      when e.phase='PUBLISH_RESULT'
        and e.state in ('RETRY_LENGTH','RETRY_CHILDREN') then 'WORK'
      when e.phase=any(array['WAIT','WAIT_RESULT']) then 'WAIT'
      when e.phase='PUBLISH_RESULT'
        and e.state in ('STALE_LEASE','WAIT','WAIT_TIMEOUT_CONTINUE','PARKED','PAUSED') then 'WAIT'
      when e.phase='PUBLISH' then 'PUBLISH'
      when e.phase='TOOL_ERROR'
        or coalesce(e.state,'') ilike '%RATE_LIMIT%'
        or coalesce(e.state,'') ilike '%SECURITY%'
        then 'RECOVERY'
      else 'OTHER'
    end as bucket
  from ev e
),
agg as (
  select
    i.session_id,
    min(i.created_at) filter(where i.phase='BOOT') as boot_at,
    min(i.created_at) filter(where i.phase='PREFLIGHT') as preflight_at_event,
    min(i.created_at) filter(where i.phase='ENTER') as enter_at_event,
    min(i.created_at) filter(where i.state='WORK') as first_work_at_event,
    min(i.created_at) filter(
      where i.phase like 'PUBLISH%'
        and i.state=any(array['PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'])
    ) as first_publish_at_event,
    max(i.created_at) as last_event_at,
    count(*)::integer as event_count,
    count(*) filter(where i.phase='CHECKPOINT')::integer as checkpoint_count,
    count(*) filter(
      where i.phase like 'PUBLISH%'
        and i.state=any(array['PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'])
    )::integer as publish_count,
    count(*) filter(
      where i.phase='TOOL_ERROR'
        or coalesce(i.state,'') ilike '%RATE_LIMIT%'
        or coalesce(i.state,'') ilike '%SECURITY%'
        or coalesce(i.state,'') ilike '%STALE%'
    )::integer as tool_failure_count,
    sum(i.interval_ms) filter(where i.bucket='COORDINATION') as coordination_ms,
    sum(i.interval_ms) filter(where i.bucket='WAIT') as wait_ms,
    sum(i.interval_ms) filter(where i.bucket='WORK') as work_ms,
    sum(i.interval_ms) filter(where i.bucket='PUBLISH') as publish_ms,
    sum(i.interval_ms) filter(where i.bucket='RECOVERY') as recovery_ms,
    sum(i.interval_ms) filter(where i.bucket='OTHER') as other_ms
  from intervals i
  group by i.session_id
),
outagg as (
  select
    s.session_id,
    min(o.published_at) as first_output_at,
    count(o.*)::integer as output_count
  from public.prometeo_worker_sessions s
  left join public.prometeo_outputs o on o.worker_code=s.worker_code
  group by s.session_id
),
base as (
  select
    s.session_id,
    s.agent_id,
    s.worker_code,
    s.protocol_version,
    s.prompt_version,
    nullif(s.declaration->>'launch_batch','') as launch_batch,
    s.first_observed_at,
    coalesce(a.preflight_at_event,s.preflight_at) as preflight_at,
    s.joined_at,
    coalesce(st.enter_at,a.enter_at_event) as enter_at,
    st.first_work_at as first_work_observed_at,
    coalesce(st.first_publish_at,a.first_publish_at_event,oa.first_output_at) as first_publish_at,
    a.last_event_at,
    s.last_seen_at,
    s.last_state,
    s.last_reason_code,
    s.final_state,
    coalesce(a.event_count,0)::integer as event_count,
    coalesce(a.checkpoint_count,0)::integer as checkpoint_count,
    greatest(coalesce(a.publish_count,0),coalesce(oa.output_count,0))::integer as publish_count,
    coalesce(a.tool_failure_count,0)::integer as tool_failure_count,
    round(coalesce(a.coordination_ms,0::numeric))::bigint as coordination_ms,
    round(coalesce(a.wait_ms,0::numeric))::bigint as wait_ms,
    round(coalesce(a.work_ms,0::numeric))::bigint as work_ms,
    round(coalesce(a.publish_ms,0::numeric))::bigint as publish_ms,
    round(coalesce(a.recovery_ms,0::numeric))::bigint as recovery_ms,
    round(coalesce(a.other_ms,0::numeric))::bigint as other_ms,
    greatest(
      0::numeric,
      round(
        extract(epoch from(
          coalesce(a.last_event_at,s.last_seen_at,clock_timestamp())
          - coalesce(s.first_observed_at,s.created_at)
        ))*1000::numeric
      )
    )::bigint as observed_ms,
    round(
      100.0*coalesce(a.work_ms,0::numeric)
      / greatest(
          1::numeric,
          extract(epoch from(
            coalesce(a.last_event_at,s.last_seen_at,clock_timestamp())
            - coalesce(s.first_observed_at,s.created_at)
          ))*1000::numeric
        ),
      1
    ) as work_pct,
    round(
      100.0*coalesce(a.wait_ms,0::numeric)
      / greatest(
          1::numeric,
          extract(epoch from(
            coalesce(a.last_event_at,s.last_seen_at,clock_timestamp())
            - coalesce(s.first_observed_at,s.created_at)
          ))*1000::numeric
        ),
      1
    ) as wait_pct
  from public.prometeo_worker_sessions s
  left join agg a using(session_id)
  left join outagg oa using(session_id)
  left join public.prometeo_control_session_timing st using(session_id)
),
stage as (
  select
    b.*,
    (b.enter_at is not null) as entered_observed,
    (b.first_work_observed_at is not null) as work_observed,
    (b.first_publish_at is not null or b.publish_count>0) as published_observed
  from base b
),
truth as (
  select
    st.*,
    (not st.work_observed and st.published_observed) as work_inferred,
    (
      not st.entered_observed
      and (st.work_observed or st.published_observed)
    ) as entered_inferred
  from stage st
)
select
  session_id,
  agent_id,
  worker_code,
  protocol_version,
  prompt_version,
  launch_batch,
  first_observed_at,
  preflight_at,
  joined_at,
  enter_at,
  first_work_observed_at,
  first_publish_at,
  last_event_at,
  last_seen_at,
  last_state,
  last_reason_code,
  final_state,
  event_count,
  checkpoint_count,
  publish_count,
  tool_failure_count,
  coordination_ms,
  wait_ms,
  work_ms,
  publish_ms,
  recovery_ms,
  other_ms,
  observed_ms,
  work_pct,
  wait_pct,
  entered_observed,
  entered_inferred,
  work_observed,
  work_inferred,
  published_observed,
  (work_ms>0) as work_duration_observed,
  (work_observed or work_inferred) as work_stage,
  (entered_observed or entered_inferred) as entered_stage
from truth;

comment on column public.prometeo_worker_flight_recorder.first_work_observed_at is
  'Earliest observed WORK-stage evidence. Uses session WORK/assignment evidence; never substitutes a publish timestamp.';
comment on column public.prometeo_worker_flight_recorder.work_observed is
  'True when a WORK-stage timestamp is directly observed.';
comment on column public.prometeo_worker_flight_recorder.work_inferred is
  'True only when downstream publish evidence proves WORK was reached but no WORK-stage timestamp was observed.';
comment on column public.prometeo_worker_flight_recorder.work_duration_observed is
  'True only when work_ms contains a positive observed interval. work_ms=0 does not negate work_stage.';
comment on column public.prometeo_worker_flight_recorder.entered_inferred is
  'True when downstream WORK/PUBLISH evidence proves ENTER was crossed but no ENTER timestamp is available. No timestamp is fabricated.';

create or replace view public.prometeo_worker_flight_funnel as
select
  coalesce(launch_batch,'UNBATCHED') as launch_batch,
  protocol_version,
  count(*)::bigint as sessions,
  count(*) filter(where entered_stage)::bigint as entered,
  count(*) filter(where work_stage)::bigint as reached_work,
  count(*) filter(where published_observed)::bigint as published,
  count(*) filter(where entered_inferred)::bigint as entered_inferred,
  count(*) filter(where work_inferred)::bigint as work_inferred,
  count(*) filter(where published_observed and work_ms=0)::bigint as published_zero_work_ms,
  bool_and(
    (not published_observed or work_stage)
    and (not work_stage or entered_stage)
  ) as funnel_row_invariant_ok,
  (
    count(*) filter(where published_observed)
      <= count(*) filter(where work_stage)
    and count(*) filter(where work_stage)
      <= count(*) filter(where entered_stage)
    and count(*) filter(where entered_stage)
      <= count(*)
  ) as funnel_count_invariant_ok
from public.prometeo_worker_flight_recorder
group by coalesce(launch_batch,'UNBATCHED'),protocol_version;

comment on view public.prometeo_worker_flight_funnel is
  'Monotonic session-stage funnel. Stage inference is boolean-only; missing timestamps remain null.';
