-- TIMING-FUNNEL-FIX-01 post-deploy smoke.
-- Expected: one row with all counts = 0 and max_duration_delta_ms <= 1.

select
  (select count(*)::int
   from public.prometeo_control_cohort_timing
   where published>reached_work
      or reached_work>entered
      or entered>sessions) as bad_cohort_monotonicity,
  (select count(*)::int
   from public.prometeo_control_session_timing
   where enter_at is not null and t0>enter_at) as t0_after_enter,
  (select count(*)::int
   from public.prometeo_control_session_timing
   where coalesce(t0_to_enter_ms,0)<0
      or coalesce(t0_to_work_ms,0)<0
      or coalesce(t0_to_publish_ms,0)<0) as negative_stage_latency,
  (select coalesce(max(abs(
      observed_ms-(boot_ms+coordination_ms+wait_ms+work_ms+publish_ms+other_ms)
   )),0)::bigint
   from public.prometeo_control_session_timing) as max_duration_delta_ms;
