-- AUTO-Q01120 smoke assertion fix: distinguish the SQL identifier output_text
-- from the safe contract key raw_output_text_included.

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
     or v_def ~ E'(^|[^A-Za-z0-9_])output_text([^A-Za-z0-9_]|$)'
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
