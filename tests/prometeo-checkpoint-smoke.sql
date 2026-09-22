-- Prometeo checkpoint RPC smoke test
-- Safe to run against a development/test database. All fixture data is rolled back.

begin;

do $smoke$
declare
  v_project_id constant text := '__CHECKPOINT_SMOKE_PROJECT__';
  v_job_key constant text := '__CHECKPOINT_SMOKE_JOB__';
  v_agent_id constant text := '__CHECKPOINT_SMOKE_AGENT__';
  v_worker_code constant text := 'KSMOKE';
  v_token constant text := '__checkpoint_smoke_lease__';
  v_expiry timestamptz := clock_timestamp() + interval '10 minutes';
  v_before_last_seen timestamptz := clock_timestamp() - interval '1 minute';
  v_result jsonb;
  v_after_expiry timestamptz;
  v_after_last_seen timestamptz;
  v_payload jsonb;
begin
  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,min_parallelism,
    desired_parallelism,max_parallelism,allow_spawn,max_jobs,auto_close,started_at
  ) values (
    v_project_id,'Checkpoint smoke','Transactional checkpoint fixture',
    'RUNNING',0,0,1,1,false,10,false,clock_timestamp()
  );

  insert into public.prometeo_jobs(
    project_id,job_key,title,objective,instruction,status,priority,required_rank,
    generation,assigned_agent_id,assigned_worker_code,lease_token,lease_seconds,
    lease_started_at,lease_expires_at,min_words,max_words,started_at
  ) values (
    v_project_id,v_job_key,'Checkpoint smoke job','Validate checkpoint RPC',
    'Smoke fixture','LEASED',0,0,1,v_agent_id,v_worker_code,v_token,600,
    clock_timestamp(),v_expiry,0,100,clock_timestamp()
  );

  insert into public.prometeo_workers(
    agent_id,worker_code,status,rank_level,current_project_id,current_job_key,
    jobs_done,rescues_done,joined_at,last_seen_at
  ) values (
    v_agent_id,v_worker_code,'WORKING',0,v_project_id,v_job_key,
    0,0,clock_timestamp(),v_before_last_seen
  );

  v_result := public.prometeo_checkpoint(
    v_agent_id,
    v_token,
    jsonb_build_object(
      'sequence',1,
      'milestone','fixture_started',
      'evidence',jsonb_build_array('fixture:checkpoint-smoke')
    )
  );

  if v_result->>'state' <> 'CHECKPOINTED' then
    raise exception 'expected CHECKPOINTED, got %', v_result;
  end if;

  select lease_expires_at
    into v_after_expiry
  from public.prometeo_jobs
  where project_id=v_project_id and job_key=v_job_key;

  if v_after_expiry is distinct from v_expiry then
    raise exception 'checkpoint extended or changed lease expiry: before %, after %',
      v_expiry, v_after_expiry;
  end if;

  select last_seen_at
    into v_after_last_seen
  from public.prometeo_workers
  where agent_id=v_agent_id;

  if v_after_last_seen <= v_before_last_seen then
    raise exception 'checkpoint did not advance last_seen_at';
  end if;

  select payload
    into v_payload
  from public.prometeo_events
  where event_id=(v_result->>'event_id')::bigint;

  if v_payload->>'schema' <> 'prometeo.work-trace/v1'
     or v_payload->>'milestone' <> 'fixture_started'
     or v_payload->>'sequence' <> '1'
     or v_payload ? 'lease_token' then
    raise exception 'unexpected checkpoint event payload: %', v_payload;
  end if;

  v_result := public.prometeo_checkpoint(
    v_agent_id,
    v_token,
    '{"sequence":1,"milestone":"duplicate","evidence":["fixture:duplicate"]}'::jsonb
  );
  if v_result->>'state' <> 'CHECKPOINT_OUT_OF_ORDER' then
    raise exception 'expected CHECKPOINT_OUT_OF_ORDER, got %', v_result;
  end if;

  v_result := public.prometeo_checkpoint(
    v_agent_id,
    '__wrong_token__',
    '{"sequence":2,"milestone":"wrong_token","evidence":["fixture:wrong-token"]}'::jsonb
  );
  if v_result->>'state' <> 'STALE_LEASE' then
    raise exception 'expected STALE_LEASE, got %', v_result;
  end if;

  v_result := public.prometeo_checkpoint(
    v_agent_id,
    v_token,
    '{"sequence":2,"milestone":"forbidden_shape","evidence":["fixture:shape"],"thoughts":"must not persist"}'::jsonb
  );
  if v_result->>'state' <> 'INVALID_CHECKPOINT'
     or v_result->>'reason' <> 'unsupported_checkpoint_field' then
    raise exception 'expected unsupported field rejection, got %', v_result;
  end if;
end;
$smoke$;

rollback;
