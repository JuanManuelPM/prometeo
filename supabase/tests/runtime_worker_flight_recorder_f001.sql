-- F001 smoke: prometeo_worker_flight_recorder stage truth and monotonic funnel.
-- Read-only. A healthy result has pass=true for every row.

with totals as (
  select
    count(*)::bigint as sessions,
    count(*) filter(where entered_stage)::bigint as entered,
    count(*) filter(where work_stage)::bigint as reached_work,
    count(*) filter(where published_observed)::bigint as published,
    count(*) filter(where published_observed and work_ms=0)::bigint as published_zero_work_ms,
    count(*) filter(where published_observed and not work_stage)::bigint as publish_without_work_stage,
    count(*) filter(where work_stage and not entered_stage)::bigint as work_without_enter_stage,
    count(*) filter(where work_inferred and first_work_observed_at is not null)::bigint as inferred_with_fake_work_time,
    count(*) filter(where entered_inferred and enter_at is not null)::bigint as inferred_with_fake_enter_time,
    count(*) filter(
      where first_publish_at is not null
        and first_work_observed_at is not null
        and first_publish_at < first_work_observed_at
    )::bigint as publish_before_work
  from public.prometeo_worker_flight_recorder
)
select
  'global_funnel_and_evidence' as test,
  (
    published<=reached_work
    and reached_work<=entered
    and entered<=sessions
    and publish_without_work_stage=0
    and work_without_enter_stage=0
    and inferred_with_fake_work_time=0
    and inferred_with_fake_enter_time=0
    and publish_before_work=0
  ) as pass,
  to_jsonb(totals.*) as evidence
from totals;

select
  'cohort_funnel' as test,
  bool_and(funnel_row_invariant_ok and funnel_count_invariant_ok) as pass,
  jsonb_agg(
    jsonb_build_object(
      'launch_batch',launch_batch,
      'protocol_version',protocol_version,
      'sessions',sessions,
      'entered',entered,
      'reached_work',reached_work,
      'published',published,
      'published_zero_work_ms',published_zero_work_ms,
      'work_inferred',work_inferred,
      'entered_inferred',entered_inferred
    )
    order by launch_batch,protocol_version
  ) as evidence
from public.prometeo_worker_flight_funnel;

select
  'zero_work_ms_is_not_zero_work_stage' as test,
  count(*) filter(where published_observed and work_ms=0 and not work_stage)=0 as pass,
  jsonb_build_object(
    'published_zero_work_ms',
    count(*) filter(where published_observed and work_ms=0),
    'lost_stage_rows',
    count(*) filter(where published_observed and work_ms=0 and not work_stage)
  ) as evidence
from public.prometeo_worker_flight_recorder;
