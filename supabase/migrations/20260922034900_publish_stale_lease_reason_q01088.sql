-- AUTO-Q01088: classify stale publish results as non-retryable lease authority loss.
-- Additive response/session telemetry only; core lease validation remains unchanged.

create or replace function public.prometeo_publish(
  p_agent_id text,
  p_lease_token text,
  p_output text,
  p_meta jsonb default '{}'::jsonb,
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v jsonb;
  s jsonb;
  v_lease_fp text;
begin
  v_lease_fp:=md5(coalesce(p_lease_token,''));

  perform public.prometeo_worker_session_touch(
    p_agent_id,
    'PUBLISH',
    'PUBLISH:'||md5(p_agent_id)||':'||v_lease_fp,
    jsonb_build_object('lease_fingerprint',v_lease_fp),
    null
  );

  v:=public.prometeo_publish_v1_core(
    p_agent_id,p_lease_token,p_output,p_meta,p_children
  );

  if coalesce(v->>'state','')='STALE_LEASE' then
    v:=v||jsonb_build_object(
      'reason_code','LEASE_NOT_ACTIVE_OR_OWNED',
      'retryable',false
    );
  end if;

  s:=public.prometeo_worker_session_touch(
    p_agent_id,
    'PUBLISH_RESULT',
    'PUBLISH_RESULT:'||md5(p_agent_id)||':'||v_lease_fp||':'||coalesce(v->>'state','UNKNOWN'),
    jsonb_build_object(
      'state',v->>'state',
      'worker_code',v->>'worker_code',
      'project_id',v->>'project_id',
      'job_key',v->>'job_key',
      'reason_code',v->>'reason_code',
      'retryable',v->'retryable',
      'lease_fingerprint',v_lease_fp
    ),
    case when v->>'state' in ('STOPPED','PUBLISHED_AND_STOPPED') then v->>'state' else null end
  );

  if coalesce(v->>'state','')='STALE_LEASE' then
    return coalesce(v,'{}'::jsonb)||s||jsonb_build_object(
      'reason_code','LEASE_NOT_ACTIVE_OR_OWNED',
      'retryable',false
    );
  end if;

  return coalesce(v,'{}'::jsonb)||s;
end;
$function$;
