-- I008 generation 3 full runtime integration smoke.
-- Runs only synthetic fixtures inside one transaction and ends with ROLLBACK.
-- Expected final row: ok=true, rollback=true.

begin;

do $smoke$
declare
  v_suffix text:=txid_current()::text;
  v_agent text:='i008-g3-'||v_suffix;
  v_project text:='I008-G3-'||v_suffix;
  v_pre jsonb; v_enter jsonb; v_cp jsonb; v_pub jsonb; v_wait jsonb;
  v_revive jsonb; v_detect jsonb;
  v_lease text; v_worker text; v_live text; v_state text;
  v_i integer; v_unbatched integer; v_fill integer; v_batch text;
  v_summary_working integer; v_expected_working integer;
  v_summary_dead integer; v_expected_dead integer;
begin
  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,
    min_parallelism,desired_parallelism,max_parallelism,
    allow_spawn,max_jobs,auto_close
  ) values(
    v_project,'I008 G3 smoke','Full transactional runtime integration smoke',
    'RUNNING',1000,1,1,1,false,2,false
  );

  insert into public.prometeo_jobs(
    project_id,job_key,title,objective,instruction,status,priority,
    required_rank,lease_seconds,min_words,max_words
  ) values(
    v_project,'SMOKE','I008 G3 smoke job',
    'Exercise full OBEY-v2 runtime path',
    'Synthetic transactional smoke only.',
    'READY',1000,0,300,5,100
  );

  v_pre:=public.prometeo_preflight(
    v_agent,'OBEY-v2',
    jsonb_build_object(
      'authority','USER','mode','CONTINUOUS',
      'publish_before_next',true,'no_hot_poll',true,
      'work_trace',true,'launch_batch','I008-G3-SMOKE'
    )
  );
  if v_pre->>'state'<>'PREFLIGHT_OK' or v_pre->>'next_action'<>'ENTER'
     or v_pre->>'protocol_version'<>'OBEY-v2' then
    raise exception 'PREFLIGHT failed: %',v_pre;
  end if;

  v_enter:=public.prometeo_enter(v_agent);
  if v_enter->>'state'<>'WORK'
     or v_enter#>>'{project,project_id}'<>v_project
     or v_enter#>>'{job,job_key}'<>'SMOKE'
     or v_enter->>'protocol_version'<>'OBEY-v2' then
    raise exception 'ENTER/WORK failed: %',v_enter;
  end if;
  v_lease:=v_enter->>'lease_token';
  v_worker:=v_enter->>'worker_code';

  if not exists(
    select 1 from public.prometeo_worker_session_events
    where agent_id=v_agent and phase='ENTER_RESULT' and state='WORK'
  ) then raise exception 'session WORK evidence missing'; end if;

  v_cp:=public.prometeo_checkpoint(
    v_agent,v_lease,'INPUTS_VALIDATED',
    '{"smoke":"I008-G3"}'::jsonb
  );
  if v_cp->>'state'<>'CHECKPOINT_OK'
     or v_cp#>>'{action,operation}'<>'CONTINUE_JOB' then
    raise exception 'CHECKPOINT failed: %',v_cp;
  end if;

  if not exists(
    select 1 from public.prometeo_control_session_timing
    where agent_id=v_agent
      and first_work_at is not null
      and checkpoint_at is not null
      and t0<=first_work_at
      and first_work_at<=checkpoint_at
  ) then raise exception 'session timing linkage failed'; end if;

  update public.prometeo_jobs j
  set last_worker_code=v_worker
  from public.prometeo_projects p
  where p.project_id=j.project_id
    and p.status in ('OPEN','RUNNING')
    and j.status='READY'
    and j.required_rank<=0
    and j.project_id<>v_project;

  if not exists(
    select 1 from public.prometeo_workers
    where agent_id<>v_agent
      and status in ('WAITING','PARKED')
      and rank_level>=0
  ) then raise exception 'no fairness peer available'; end if;

  v_pub:=public.prometeo_publish(
    v_agent,v_lease,
    'synthetic smoke output validates publish next integration',
    '{"smoke":"I008-G3"}'::jsonb,'[]'::jsonb
  );
  if v_pub->>'state'<>'PUBLISHED_AND_NEXT' then
    raise exception 'PUBLISH failed: %',v_pub;
  end if;

  v_state:=coalesce(v_pub#>>'{next,state}','');
  if v_state='WORK' then raise exception 'unexpected external WORK'; end if;

  if v_state<>'PARKED' then
    for v_i in 1..3 loop
      v_wait:=public.prometeo_wait(v_agent,2);
      v_state:=v_wait->>'state';
      if v_state='WORK' then raise exception 'unexpected WORK during parking'; end if;
      exit when v_state='PARKED';
    end loop;
  end if;
  if v_state<>'PARKED' then raise exception 'WAIT did not converge to PARKED'; end if;

  update public.prometeo_worker_sessions
  set last_seen_at=clock_timestamp()-interval '9 minutes'
  where agent_id=v_agent and closed_at is null;
  update public.prometeo_workers
  set last_seen_at=clock_timestamp()-interval '9 minutes'
  where agent_id=v_agent;

  select liveness into v_live
  from public.prometeo_worker_liveness where agent_id=v_agent;
  if v_live<>'DEAD' then raise exception 'first DEAD failed: %',v_live; end if;

  if not exists(
    select 1 from public.prometeo_control_worker_liveness
    where agent_id=v_agent and liveness='DEAD'
  ) then raise exception 'control does not expose DEAD'; end if;

  if exists(
    select 1 from public.prometeo_control_worker_liveness
    where agent_id=v_agent and liveness='WORKING'
  ) then raise exception 'dead worker counted WORKING'; end if;

  select working_workers,dead_workers
  into v_summary_working,v_summary_dead
  from public.prometeo_control_minimal;

  select count(*) filter(where liveness='WORKING'),
         count(*) filter(where liveness='DEAD')
  into v_expected_working,v_expected_dead
  from public.prometeo_control_worker_liveness;

  if v_summary_working<>v_expected_working or v_summary_dead<>v_expected_dead then
    raise exception 'minimal control liveness counts diverge';
  end if;

  v_detect:=public.prometeo_detect_dead_workers();
  if not exists(
    select 1 from public.prometeo_worker_deaths
    where agent_id=v_agent and recovered_at is null
  ) then raise exception 'first death not registered: %',v_detect; end if;

  v_revive:=public.prometeo_enter(v_agent);
  select liveness into v_live
  from public.prometeo_worker_liveness where agent_id=v_agent;
  if v_live='DEAD' then raise exception 'REVIVE failed: %',v_revive; end if;

  perform public.prometeo_detect_dead_workers();
  if not exists(
    select 1 from public.prometeo_worker_deaths
    where agent_id=v_agent and recovered_at is not null
  ) then raise exception 'recovery not marked'; end if;

  update public.prometeo_worker_sessions
  set last_seen_at=clock_timestamp()-interval '11 minutes'
  where agent_id=v_agent and closed_at is null;
  update public.prometeo_workers
  set last_seen_at=clock_timestamp()-interval '11 minutes',
      status='PARKED',current_project_id=null,current_job_key=null
  where agent_id=v_agent;

  select liveness into v_live
  from public.prometeo_worker_liveness where agent_id=v_agent;
  if v_live<>'DEAD' then raise exception 'second DEAD failed: %',v_live; end if;

  v_detect:=public.prometeo_detect_dead_workers();

  select batch_id into v_batch
  from public.prometeo_worker_deaths
  where agent_id=v_agent and recovered_at is null
  order by death_id desc limit 1;

  if v_batch is null then
    select count(*) into v_unbatched
    from public.prometeo_worker_deaths
    where batch_id is null and recovered_at is null;

    v_fill:=case when v_unbatched=0 then 10 else 10-v_unbatched end;

    if v_fill>0 then
      insert into public.prometeo_worker_deaths(
        agent_id,worker_code,last_seen_at,status_at_detection,reason
      )
      select
        'i008-g3-fill-'||v_suffix||'-'||g,
        'X'||lpad(g::text,3,'0')||right(v_suffix,4),
        clock_timestamp()-interval '20 minutes',
        'PARKED','I008_G3_SMOKE_FILL'
      from generate_series(1,v_fill) g;
    end if;

    v_detect:=public.prometeo_detect_dead_workers();
    select batch_id into v_batch
    from public.prometeo_worker_deaths
    where agent_id=v_agent and recovered_at is null
    order by death_id desc limit 1;
  end if;

  if v_batch is null then raise exception 'MORGUE batch missing: %',v_detect; end if;
  if not exists(
    select 1 from public.prometeo_death_batches
    where batch_id=v_batch and death_count=10
  ) then raise exception 'MORGUE batch invalid: %',v_batch; end if;
  if not exists(
    select 1 from public.prometeo_jobs
    where project_id='MORGUE-REVIEW-01' and job_key='MORGUE-'||v_batch
  ) then raise exception 'MORGUE review job missing: %',v_batch; end if;
end;
$smoke$;

rollback;

select jsonb_build_object(
  'ok',true,'smoke','I008_G3_FULL_RUNTIME','rollback',true,
  'covered',jsonb_build_array(
    'PREFLIGHT','ENTER','WORK','SESSION_WORK_EVENT','CHECKPOINT',
    'SESSION_TIMING','PUBLISH','NEXT','PARKED','DEAD',
    'CONTROL_DEAD_EXCLUSION','REVIVE','DEAD_AGAIN','MORGUE'
  )
) as result;
