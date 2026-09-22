-- AUTO-Q01071 generation 2: reproducible lease-fencing smoke.
-- Synthetic only; the entire fixture rolls back.

begin;

do $smoke$
declare
  v_suffix text:=txid_current()::text;
  v_agent text:='lease-fence-'||v_suffix;
  v_project text:='LEASE-FENCE-'||v_suffix;
  v_pre jsonb; v_enter jsonb; v_cp jsonb; v_pub jsonb;
  v_old text; v_new text;
  v_outputs integer;
begin
  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,
    min_parallelism,desired_parallelism,max_parallelism,
    allow_spawn,max_jobs,auto_close
  ) values(
    v_project,'Lease fencing smoke','Synthetic lease fencing smoke',
    'RUNNING',1000,1,1,1,false,1,false
  );

  insert into public.prometeo_jobs(
    project_id,job_key,title,objective,instruction,status,priority,
    required_rank,lease_seconds,min_words,max_words
  ) values(
    v_project,'SMOKE','Lease fencing','Verify stale lease fencing',
    'Synthetic transaction only','READY',1000,0,300,5,100
  );

  v_pre:=public.prometeo_preflight(
    v_agent,'OBEY-v2',
    jsonb_build_object(
      'authority','USER','mode','CONTINUOUS',
      'publish_before_next',true,'no_hot_poll',true,
      'work_trace',true,'launch_batch','LEASE-FENCE-SMOKE'
    )
  );
  if v_pre->>'state'<>'PREFLIGHT_OK' then
    raise exception 'preflight failed %',v_pre;
  end if;

  v_enter:=public.prometeo_enter(v_agent);
  if v_enter->>'state'<>'WORK'
     or v_enter#>>'{project,project_id}'<>v_project then
    raise exception 'enter did not lease fixture %',v_enter;
  end if;

  v_old:=v_enter->>'lease_token';
  v_new:=gen_random_uuid()::text;

  update public.prometeo_jobs
  set lease_token=v_new,
      lease_expires_at=clock_timestamp()+interval '5 minutes'
  where project_id=v_project and job_key='SMOKE';

  v_cp:=public.prometeo_checkpoint(
    v_agent,v_old,'INPUTS_VALIDATED','{"smoke":"lease-fencing"}'::jsonb
  );
  if v_cp->>'state'<>'STALE_LEASE' then
    raise exception 'checkpoint fence failed %',v_cp;
  end if;

  v_pub:=public.prometeo_publish(
    v_agent,v_old,
    'synthetic stale lease output must never become canonical',
    '{"smoke":"lease-fencing"}'::jsonb,'[]'::jsonb
  );
  if v_pub->>'state'<>'STALE_LEASE' then
    raise exception 'publish fence failed %',v_pub;
  end if;

  select count(*) into v_outputs
  from public.prometeo_outputs
  where project_id=v_project and job_key='SMOKE';
  if v_outputs<>0 then
    raise exception 'stale publish produced output';
  end if;

  if not exists(
    select 1
    from public.prometeo_jobs
    where project_id=v_project
      and job_key='SMOKE'
      and status='LEASED'
      and assigned_agent_id=v_agent
      and lease_token=v_new
  ) then
    raise exception 'new lease authority changed unexpectedly';
  end if;
end;
$smoke$;

rollback;

select jsonb_build_object(
  'ok',true,
  'smoke','LEASE_FENCING',
  'rollback',true,
  'covered',jsonb_build_array(
    'PREFLIGHT','ENTER_WORK','CHECKPOINT_STALE_LEASE',
    'PUBLISH_STALE_LEASE','NO_CANONICAL_OUTPUT','NEW_LEASE_PRESERVED'
  )
) as result;
