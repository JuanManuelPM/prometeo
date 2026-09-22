-- F007: repeatable read-only runtime integration smoke for Flight Recorder.
-- External GitHub Engine verification remains outside PostgreSQL by design.

create or replace function public.prometeo_flight_recorder_integration_smoke_v1(
  p_session_id uuid,
  p_morgue_batch text default 'D005',
  p_guide_job_key text default 'GUIDE-G0004'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_agent_id text;
  v_worker_code text;
  v_morgue jsonb;
  v_deaths integer:=0;
  v_postmortems integer:=0;
  v_parked_deaths integer:=0;
  v_runtime_generated_at text;
  v_checks jsonb;
  v_pass boolean;
begin
  select s.agent_id,s.worker_code
    into v_agent_id,v_worker_code
  from public.prometeo_worker_sessions s
  where s.session_id=p_session_id;

  if v_agent_id is null then
    return jsonb_build_object(
      'state','SMOKE_INVALID_SESSION',
      'session_id',p_session_id,
      'pass',false
    );
  end if;

  v_morgue:=public.prometeo_morgue_context(p_morgue_batch);

  select count(*),
         count(*) filter(where p.death_id is not null),
         count(*) filter(where p.terminal_state='PARKED')
    into v_deaths,v_postmortems,v_parked_deaths
  from public.prometeo_worker_deaths d
  left join public.prometeo_worker_postmortems p on p.death_id=d.death_id
  where d.batch_id=p_morgue_batch;

  select snapshot->>'generated_at'
    into v_runtime_generated_at
  from public.prometeo_runtime_learning_snapshot
  limit 1;

  v_checks:=jsonb_build_object(
    'bootstrap', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id and phase='BOOT' and state='FIRST_SERVER_CONTACT'
    ),
    'preflight', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id and phase='PREFLIGHT' and state='PREFLIGHT_OK'
    ),
    'enter', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id and phase='ENTER'
    ),
    'work', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id and state='WORK'
    ),
    'checkpoint', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id and phase='CHECKPOINT' and state='CHECKPOINT_OK'
    ),
    'publish', exists(
      select 1 from public.prometeo_worker_session_events
      where session_id=p_session_id
        and phase='PUBLISH_RESULT'
        and state in ('PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED')
    ),
    'positive_survivor', exists(
      select 1 from public.prometeo_positive_survival_candidates
      where session_id=p_session_id
    ),
    'death_batch_exact_10', v_deaths=10,
    'postmortems_frozen_10', v_postmortems=10,
    'parked_death_present', v_parked_deaths>0,
    'morgue_context_exact_10',
      coalesce(jsonb_array_length(v_morgue->'deaths'),0)=10,
    'guide_sentinel_done', exists(
      select 1 from public.prometeo_jobs j
      where j.project_id='GUIDE-SENTINEL-01'
        and j.job_key=p_guide_job_key
        and j.status='DONE'
    ),
    'guide_sentinel_published', exists(
      select 1 from public.prometeo_outputs o
      where o.project_id='GUIDE-SENTINEL-01'
        and o.job_key=p_guide_job_key
    ),
    'runtime_learning_snapshot', v_runtime_generated_at is not null
  );

  select bool_and(value::boolean)
    into v_pass
  from jsonb_each(v_checks);

  return jsonb_build_object(
    'state',case when v_pass then 'RUNTIME_SMOKE_PASS' else 'RUNTIME_SMOKE_FAIL' end,
    'pass',v_pass,
    'session_id',p_session_id,
    'agent_id',v_agent_id,
    'worker_code',v_worker_code,
    'morgue_batch',p_morgue_batch,
    'guide_job_key',p_guide_job_key,
    'runtime_snapshot_generated_at',v_runtime_generated_at,
    'checks',v_checks,
    'external_checks_required',jsonb_build_array(
      'GITHUB_ENGINE_STATE',
      'GITHUB_ENGINE_INVARIANTS'
    ),
    'server_time',clock_timestamp()
  );
end;
$function$;
