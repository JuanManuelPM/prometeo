-- AUTO-Q01011: state-truth correction for cohort WORK evidence.
-- Preserve exact public view columns; do not fabricate a first_work timestamp.
-- If durable worker/session state proves work but timing transition is missing,
-- reached_work is corrected while avg_work_pct remains NULL rather than a false 0%.

create or replace view public.prometeo_control_cohort_timing as
with truth as (
  select
    st.*,
    (
      st.first_work_at is not null
      or coalesce(w.jobs_done,0)>0
      or w.status='WORKING'
      or st.last_state in (
        'WORK','CHECKPOINT_OK','CHECKPOINTED',
        'PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'
      )
    ) as has_work_evidence,
    (
      st.first_work_at is null
      and (
        coalesce(w.jobs_done,0)>0
        or w.status='WORKING'
        or st.last_state in (
          'WORK','CHECKPOINT_OK','CHECKPOINTED',
          'PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'
        )
      )
    ) as missing_work_timing
  from public.prometeo_control_session_timing st
  left join public.prometeo_workers w
    on w.agent_id=st.agent_id
)
select
  coalesce(launch_batch,'UNBATCHED') as launch_batch,
  protocol_version,
  count(*) as sessions,
  count(*) filter(where preflight_event_at is not null) as preflight_ok,
  count(*) filter(where enter_at is not null) as entered,
  count(*) filter(where has_work_evidence) as reached_work,
  count(*) filter(where first_publish_at is not null) as published,
  count(*) filter(where last_state='PARKED') as parked,
  count(*) filter(where last_state in ('WAIT_TIMEOUT_CONTINUE','WAIT')) as waiting_or_wait_timeout,
  round(avg(t0_to_enter_ms) filter(where t0_to_enter_ms is not null))::bigint as avg_t0_to_enter_ms,
  round(avg(t0_to_work_ms) filter(where t0_to_work_ms is not null))::bigint as avg_t0_to_work_ms,
  case
    when bool_or(missing_work_timing) then null::numeric
    else round(avg(work_pct),1)
  end as avg_work_pct,
  round(avg(wait_pct),1) as avg_wait_pct,
  min(t0) as cohort_first_seen_at,
  max(t0) as cohort_last_seen_at
from truth
group by coalesce(launch_batch,'UNBATCHED'),protocol_version;
