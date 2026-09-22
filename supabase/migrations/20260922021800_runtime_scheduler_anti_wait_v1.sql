-- Runtime scheduler anti-WAIT v1
-- I003 / RUNTIME-IMPLEMENT-01
-- Target project is a preference with TTL + reason, never a prison.
-- PARKED is scheduler capacity state, while top-level WAIT remains protocol-compatible.

alter table public.prometeo_workers
  add column if not exists target_reason_code text,
  add column if not exists target_expires_at timestamptz,
  add column if not exists parked_reason_code text,
  add column if not exists parked_at timestamptz;

create or replace function public.prometeo_retarget_worker_v2(
  p_worker_code text,
  p_project_id text,
  p_ttl_seconds integer default 30,
  p_reason_code text default 'MANUAL_RETARGET'
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count integer;
  v_ttl integer := greatest(5, least(coalesce(p_ttl_seconds,30),300));
  v_reason text := coalesce(nullif(trim(p_reason_code),''),'MANUAL_RETARGET');
begin
  if not exists(
    select 1 from public.prometeo_projects
    where project_id=p_project_id and status in ('OPEN','RUNNING')
  ) then
    return jsonb_build_object('ok',false,'state','NO_ACTIVE_PROJECT','project_id',p_project_id);
  end if;

  update public.prometeo_workers
  set next_project_id=p_project_id,
      target_reason_code=v_reason,
      target_expires_at=now()+make_interval(secs=>v_ttl)
  where worker_code=p_worker_code and status<>'STOPPED';
  get diagnostics v_count=row_count;

  insert into public.prometeo_control_orders(scope_type,scope_value,action,payload,status,applied_at)
  values(
    'WORKER',p_worker_code,'RETARGET',
    jsonb_build_object('project_id',p_project_id,'reason_code',v_reason,'ttl_seconds',v_ttl),
    'APPLIED',now()
  );

  return jsonb_build_object(
    'ok',true,'state','RETARGET_SET','workers',v_count,'project_id',p_project_id,
    'reason_code',v_reason,'ttl_seconds',v_ttl
  );
end;
$function$;

create or replace function public.prometeo_retarget_worker(
  p_worker_code text,
  p_project_id text
) returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select public.prometeo_retarget_worker_v2($1,$2,30,'MANUAL_RETARGET');
$function$;

create or replace function public.prometeo_allocate(p_agent_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.prometeo_workers%rowtype;
  p public.prometeo_projects%rowtype;
  j public.prometeo_jobs%rowtype;
  v_token text;
  v_inputs jsonb;
  v_target text;
  v_target_reason text;
  v_park_reason text;
  v_retry_after integer;
begin
  perform pg_advisory_xact_lock(hashtext('prometeo-global-control'));

  select * into w from public.prometeo_workers where agent_id=p_agent_id for update;
  if not found then return jsonb_build_object('ok',false,'state','NOT_JOINED'); end if;

  if w.status='STOPPED' then
    return jsonb_build_object('ok',true,'state','STOPPED','worker_code',w.worker_code);
  end if;
  if w.status='PAUSED' then
    return jsonb_build_object('ok',true,'state','PAUSED','worker_code',w.worker_code,'must_continue',true);
  end if;
  if w.stop_after_current and w.status<>'WORKING' then
    update public.prometeo_workers
    set status='STOPPED',completed_at=coalesce(completed_at,now()),last_seen_at=now(),
        current_project_id=null,current_job_key=null,
        parked_reason_code=null,parked_at=null
    where agent_id=p_agent_id;
    return jsonb_build_object('ok',true,'state','STOPPED','worker_code',w.worker_code);
  end if;

  perform public.prometeo_reap_stale();
  perform public.prometeo_refresh_ready();

  if w.status<>'WORKING'
     and w.current_project_id is not null
     and not exists(
       select 1 from public.prometeo_projects pr
       where pr.project_id=w.current_project_id and pr.status in ('OPEN','RUNNING')
     )
  then
    update public.prometeo_workers
    set current_project_id=null,current_job_key=null
    where agent_id=p_agent_id;
  end if;

  v_target:=w.next_project_id;

  if v_target is not null then
    if w.target_expires_at is not null and w.target_expires_at<=now() then
      v_target_reason:='TARGET_TTL_EXPIRED';
      update public.prometeo_workers
      set next_project_id=null,target_reason_code=v_target_reason,target_expires_at=null
      where agent_id=p_agent_id;
      v_target:=null;
    elsif not exists(
      select 1 from public.prometeo_projects
      where project_id=v_target and status in ('OPEN','RUNNING')
    ) then
      v_target_reason:='TARGET_PROJECT_INACTIVE';
      update public.prometeo_workers
      set next_project_id=null,target_reason_code=v_target_reason,target_expires_at=null
      where agent_id=p_agent_id;
      v_target:=null;
    else
      select * into p
      from public.prometeo_projects pr
      where pr.project_id=v_target
        and pr.status in ('OPEN','RUNNING')
        and exists(
          select 1 from public.prometeo_jobs x
          where x.project_id=pr.project_id
            and x.status='READY'
            and x.required_rank<=w.rank_level
        )
        and (
          select count(*) from public.prometeo_workers ww
          where ww.status='WORKING' and ww.current_project_id=pr.project_id
        ) < pr.max_parallelism
      for update;

      if not found then
        if not exists(
          select 1 from public.prometeo_jobs x
          where x.project_id=v_target and x.status='READY' and x.required_rank<=w.rank_level
        ) then
          v_target_reason:='TARGET_NO_COMPATIBLE_READY';
        else
          v_target_reason:='TARGET_CAPACITY_FULL';
        end if;
        update public.prometeo_workers
        set target_reason_code=v_target_reason
        where agent_id=p_agent_id;
      end if;
    end if;
  end if;

  if p.project_id is null then
    select pr.* into p
    from public.prometeo_projects pr
    where pr.status in ('OPEN','RUNNING')
      and exists(
        select 1 from public.prometeo_jobs x
        where x.project_id=pr.project_id
          and x.status='READY'
          and x.required_rank<=w.rank_level
      )
      and (
        select count(*) from public.prometeo_workers ww
        where ww.status='WORKING' and ww.current_project_id=pr.project_id
      ) < pr.max_parallelism
    order by
      case when (
        select count(*) from public.prometeo_workers ww
        where ww.status='WORKING' and ww.current_project_id=pr.project_id
      ) < pr.min_parallelism then 1 else 0 end desc,
      case when (
        select count(*) from public.prometeo_workers ww
        where ww.status='WORKING' and ww.current_project_id=pr.project_id
      ) < pr.desired_parallelism then 1 else 0 end desc,
      pr.priority desc,
      (
        select count(*) from public.prometeo_workers ww
        where ww.status='WORKING' and ww.current_project_id=pr.project_id
      ) asc,
      pr.created_at asc
    for update skip locked
    limit 1;
  end if;

  if p.project_id is null then
    if exists(
      select 1
      from public.prometeo_projects pr
      join public.prometeo_jobs x on x.project_id=pr.project_id
      where pr.status in ('OPEN','RUNNING')
        and x.status='READY'
        and x.required_rank<=w.rank_level
    ) then
      v_park_reason:='CAPACITY_PARKED';
      v_retry_after:=5;
    else
      v_park_reason:='NO_READY_PARKED';
      v_retry_after:=15;
    end if;

    if w.status<>'PARKED' or w.parked_reason_code is distinct from v_park_reason then
      insert into public.prometeo_events(worker_code,agent_id,event_type,payload)
      values(
        w.worker_code,p_agent_id,'PARKED',
        jsonb_build_object(
          'reason_code',v_park_reason,
          'retry_after_seconds',v_retry_after,
          'target_project_id',v_target,
          'target_reason_code',v_target_reason
        )
      );
    end if;

    update public.prometeo_workers
    set status='PARKED',current_project_id=null,current_job_key=null,last_seen_at=now(),
        parked_reason_code=v_park_reason,
        parked_at=case
          when status='PARKED' and parked_reason_code is not distinct from v_park_reason
          then parked_at else now()
        end
    where agent_id=p_agent_id;

    return jsonb_build_object(
      'ok',true,'state','WAIT','worker_code',w.worker_code,'must_continue',true,
      'capacity_state','PARKED','reason_code',v_park_reason,
      'retry_after_seconds',v_retry_after,
      'target_project_id',v_target,'target_reason_code',v_target_reason
    );
  end if;

  select * into j
  from public.prometeo_jobs x
  where x.project_id=p.project_id
    and x.status='READY'
    and x.required_rank<=w.rank_level
    and (
      x.last_worker_code is null
      or x.last_worker_code<>w.worker_code
      or not exists(
        select 1 from public.prometeo_workers alt
        where alt.agent_id<>w.agent_id
          and alt.status in ('WAITING','PARKED')
          and alt.rank_level>=x.required_rank
      )
    )
  order by x.is_rescue desc,x.priority desc,x.created_at asc,x.job_key asc
  for update skip locked
  limit 1;

  if not found then
    v_park_reason:='READY_RACE_PARKED';
    v_retry_after:=2;
    update public.prometeo_workers
    set status='PARKED',current_project_id=null,current_job_key=null,last_seen_at=now(),
        parked_reason_code=v_park_reason,parked_at=now()
    where agent_id=p_agent_id;
    return jsonb_build_object(
      'ok',true,'state','WAIT','worker_code',w.worker_code,'must_continue',true,
      'capacity_state','PARKED','reason_code',v_park_reason,
      'retry_after_seconds',v_retry_after
    );
  end if;

  v_token:=gen_random_uuid()::text;

  select coalesce(jsonb_agg(jsonb_build_object(
    'project_id',o.project_id,'job_key',o.job_key,'worker_code',o.worker_code,
    'word_count',o.word_count,'output',o.output_text,'meta',o.meta
  ) order by o.published_at),'[]'::jsonb)
  into v_inputs
  from public.prometeo_job_dependencies d
  join public.prometeo_outputs o
    on o.project_id=d.depends_on_project_id and o.job_key=d.depends_on_job_key
  where d.project_id=j.project_id and d.job_key=j.job_key;

  update public.prometeo_jobs
  set status='LEASED',
      assigned_agent_id=p_agent_id,
      assigned_worker_code=w.worker_code,
      lease_token=v_token,
      lease_started_at=now(),
      lease_expires_at=now()+make_interval(secs=>j.lease_seconds),
      started_at=coalesce(started_at,now())
  where project_id=j.project_id and job_key=j.job_key;

  update public.prometeo_workers
  set status='WORKING',
      current_project_id=j.project_id,
      current_job_key=j.job_key,
      last_project_id=j.project_id,
      next_project_id=null,
      target_reason_code=null,
      target_expires_at=null,
      parked_reason_code=null,
      parked_at=null,
      last_seen_at=now()
  where agent_id=p_agent_id;

  update public.prometeo_projects
  set status=case when status='OPEN' then 'RUNNING' else status end,
      started_at=coalesce(started_at,now())
  where project_id=j.project_id;

  insert into public.prometeo_events(worker_code,agent_id,project_id,job_key,event_type,payload)
  values(
    w.worker_code,p_agent_id,j.project_id,j.job_key,
    case when j.is_rescue then 'RESCUE_ASSIGNED' else 'JOB_ASSIGNED' end,
    jsonb_build_object(
      'lease_token',v_token,'lease_seconds',j.lease_seconds,'rank_level',w.rank_level,
      'fallback_from_target',case when v_target_reason is not null then true else false end,
      'target_reason_code',v_target_reason
    )
  );

  return jsonb_build_object(
    'ok',true,'state','WORK',
    'worker_code',w.worker_code,'rank_level',w.rank_level,
    'project',jsonb_build_object(
      'project_id',p.project_id,'title',p.title,'objective',p.objective,
      'priority',p.priority,'status',p.status,
      'allow_spawn',p.allow_spawn,'max_jobs',p.max_jobs,
      'min_parallelism',p.min_parallelism,'desired_parallelism',p.desired_parallelism,
      'max_parallelism',p.max_parallelism
    ),
    'job',jsonb_build_object(
      'job_key',j.job_key,'title',j.title,'objective',j.objective,
      'instruction',j.instruction,'input_context',j.input_context,
      'priority',j.priority,'required_rank',j.required_rank,
      'min_words',j.min_words,'max_words',j.max_words,
      'generation',j.generation,'is_rescue',j.is_rescue
    ),
    'inputs',v_inputs,
    'lease_token',v_token,'lease_seconds',j.lease_seconds,
    'fallback_from_target',case when v_target_reason is not null then true else false end,
    'target_reason_code',v_target_reason
  );
end;
$function$;

create or replace function public.prometeo_wait(
  p_agent_id text,
  p_timeout_seconds integer default 2
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v jsonb;
begin
  v:=public.prometeo_active_lease_packet(p_agent_id);
  if v is not null then return v; end if;

  v:=public.prometeo_allocate(p_agent_id);
  if v->>'state' in ('WORK','STOPPED') then return v; end if;

  return jsonb_build_object(
    'ok',true,
    'state','WAIT_TIMEOUT_CONTINUE',
    'worker_code',v->>'worker_code',
    'must_continue',true,
    'capacity_state',coalesce(v->>'capacity_state','PARKED'),
    'reason_code',coalesce(v->>'reason_code','NO_READY_PARKED'),
    'retry_after_seconds',coalesce((v->>'retry_after_seconds')::int, greatest(2,least(coalesce(p_timeout_seconds,2),15))),
    'target_project_id',v->>'target_project_id',
    'target_reason_code',v->>'target_reason_code'
  );
end;
$function$;
