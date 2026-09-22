-- AUTO-Q01120: compact, bounded telemetry snapshot for tool-reliability diagnosis.
-- Avoids raw output_text and raw payload scans in the normal diagnostic path.

create or replace function public.prometeo_tool_reliability_snapshot_v1(
  p_hours integer default 6
) returns jsonb
language plpgsql
stable
parallel safe
set search_path to 'public','pg_temp'
as $$
declare
  v_since timestamptz;
  v_events jsonb;
  v_sessions jsonb;
  v_recovery jsonb;
begin
  if p_hours is null or p_hours < 1 or p_hours > 24 then
    return jsonb_build_object(
      'ok',false,
      'state','TOOL_RELIABILITY_SNAPSHOT_INVALID',
      'reason_code','WINDOW_HOURS_OUT_OF_RANGE',
      'allowed_hours',jsonb_build_array(1,24)
    );
  end if;

  v_since := statement_timestamp() - make_interval(hours => p_hours);

  select jsonb_build_object(
    'output_rejected_length',count(*) filter(where event_type='OUTPUT_REJECTED_LENGTH'),
    'stale_result_rejected',count(*) filter(where event_type='STALE_RESULT_REJECTED'),
    'lease_expired',count(*) filter(where event_type='LEASE_EXPIRED')
  )
  into v_events
  from public.prometeo_events
  where created_at >= v_since;

  select jsonb_build_object(
    'sessions_observed',count(*),
    'sessions_with_tool_failure',count(*) filter(where tool_failure_count > 0),
    'checkpoint_tool_error_sessions',count(*) filter(where exists (
      select 1
      from public.prometeo_worker_session_events e
      where e.session_id=f.session_id
        and e.created_at >= v_since
        and e.phase='CHECKPOINT'
        and e.payload->>'milestone'='TOOL_ERROR'
    ))
  )
  into v_sessions
  from public.prometeo_worker_flight_recorder f
  where f.last_event_at >= v_since;

  select jsonb_build_object(
    'outputs_with_tool_recovery',count(*) filter(where meta ? 'tool_recovery'),
    'object_recovery_records',count(*) filter(
      where jsonb_typeof(meta->'tool_recovery')='object'
    ),
    'rate_limited_records',count(*) filter(
      where jsonb_typeof(meta->'tool_recovery')='object'
        and upper(coalesce(meta#>>'{tool_recovery,kind}',''))='RATE_LIMITED'
    ),
    'security_blocked_records',count(*) filter(
      where jsonb_typeof(meta->'tool_recovery')='object'
        and upper(coalesce(meta#>>'{tool_recovery,kind}','')) in ('SECURITY_BLOCKED','SECURITY_BLOCK')
    ),
    'recovered_true_records',count(*) filter(
      where jsonb_typeof(meta->'tool_recovery')='object'
        and lower(coalesce(meta#>>'{tool_recovery,recovered}',''))='true'
    )
  )
  into v_recovery
  from public.prometeo_outputs
  where published_at >= v_since;

  return jsonb_build_object(
    'ok',true,
    'state','TOOL_RELIABILITY_SNAPSHOT_OK',
    'generated_at',statement_timestamp(),
    'window_hours',p_hours,
    'since',v_since,
    'event_counts',v_events,
    'session_counts',v_sessions,
    'tool_recovery_counts',v_recovery,
    'query_contract',jsonb_build_object(
      'raw_output_text_included',false,
      'raw_payloads_included',false,
      'max_window_hours',24,
      'recommended_use','FIRST_READ_BEFORE_RAW_TELEMETRY_EXPANSION'
    )
  );
end;
$$;

comment on function public.prometeo_tool_reliability_snapshot_v1(integer) is
  'AUTO-Q01120 bounded first-read diagnostic for tool reliability. Aggregates durable counts without raw output_text or payloads.';

create or replace function public.prometeo_tool_reliability_snapshot_v1_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v1 jsonb;
  v24 jsonb;
  v0 jsonb;
  v25 jsonb;
  v_def text;
begin
  v1 := public.prometeo_tool_reliability_snapshot_v1(1);
  v24 := public.prometeo_tool_reliability_snapshot_v1(24);
  v0 := public.prometeo_tool_reliability_snapshot_v1(0);
  v25 := public.prometeo_tool_reliability_snapshot_v1(25);

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='prometeo_tool_reliability_snapshot_v1'
    and pg_get_function_identity_arguments(p.oid)='p_hours integer';

  if v1->>'state' <> 'TOOL_RELIABILITY_SNAPSHOT_OK'
     or v24->>'state' <> 'TOOL_RELIABILITY_SNAPSHOT_OK'
     or v0->>'state' <> 'TOOL_RELIABILITY_SNAPSHOT_INVALID'
     or v25->>'state' <> 'TOOL_RELIABILITY_SNAPSHOT_INVALID'
     or coalesce((v1#>>'{query_contract,raw_output_text_included}')::boolean,true)
     or coalesce((v1#>>'{query_contract,raw_payloads_included}')::boolean,true)
     or (v1#>>'{query_contract,max_window_hours}')::int <> 24
     or v1->'event_counts' is null
     or v1->'session_counts' is null
     or v1->'tool_recovery_counts' is null
     or v_def ilike '%output_text%'
  then
    raise exception 'tool reliability snapshot v1 smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','TOOL_RELIABILITY_SNAPSHOT_V1_SMOKE_OK',
    'bounded_window','PASS',
    'raw_output_text_excluded','PASS',
    'raw_payloads_excluded','PASS',
    'event_counts_present','PASS',
    'session_counts_present','PASS',
    'recovery_counts_present','PASS'
  );
end;
$$;
