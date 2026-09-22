-- Runtime scheduler anti-WAIT v2: align routing with worker-specific job eligibility.
-- I003 / RUNTIME-IMPLEMENT-01
-- This migration preserves the existing allocate_core implementation and adds a
-- pre-routing wrapper so a target/global project is selected only when this worker
-- can actually take at least one READY job under the anti-repeat fairness rule.

create or replace function public.prometeo_allocate(p_agent_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v jsonb;
  w public.prometeo_workers%rowtype;
  v_original_target text;
  v_original_reason text;
  v_original_expires timestamptz;
  v_route_project text;
  v_fallback_reason text;
begin
  perform pg_advisory_xact_lock(hashtext('prometeo-global-control'));

  select * into w
  from public.prometeo_workers
  where agent_id=p_agent_id
  for update;

  if found and w.status not in ('WORKING','STOPPED','PAUSED') then
    v_original_target:=w.next_project_id;
    v_original_reason:=w.target_reason_code;
    v_original_expires:=w.target_expires_at;

    if v_original_target is not null
       and (v_original_expires is null or v_original_expires>now())
       and exists(
         select 1 from public.prometeo_projects pr
         where pr.project_id=v_original_target and pr.status in ('OPEN','RUNNING')
       )
       and not exists(
         select 1
         from public.prometeo_jobs x
         where x.project_id=v_original_target
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
       )
    then
      if exists(
        select 1 from public.prometeo_jobs x
        where x.project_id=v_original_target
          and x.status='READY'
          and x.required_rank<=w.rank_level
      ) then
        v_fallback_reason:='TARGET_NO_ASSIGNABLE_JOB';
      else
        v_fallback_reason:='TARGET_NO_COMPATIBLE_READY';
      end if;

      select pr.project_id into v_route_project
      from public.prometeo_projects pr
      where pr.status in ('OPEN','RUNNING')
        and pr.project_id<>v_original_target
        and exists(
          select 1 from public.prometeo_jobs x
          where x.project_id=pr.project_id
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
      limit 1;

      if v_route_project is not null then
        update public.prometeo_workers
        set next_project_id=v_route_project,
            target_reason_code='AUTO_FALLBACK_ROUTE',
            target_expires_at=now()+interval '5 seconds'
        where agent_id=p_agent_id;
      end if;
    elsif v_original_target is null then
      select pr.project_id into v_route_project
      from public.prometeo_projects pr
      where pr.status in ('OPEN','RUNNING')
        and exists(
          select 1 from public.prometeo_jobs x
          where x.project_id=pr.project_id
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
      limit 1;

      if v_route_project is not null then
        update public.prometeo_workers
        set next_project_id=v_route_project,
            target_reason_code='AUTO_ASSIGNABLE_ROUTE',
            target_expires_at=now()+interval '5 seconds'
        where agent_id=p_agent_id;
      end if;
    end if;
  end if;

  v:=public.prometeo_allocate_core(p_agent_id);

  if v_fallback_reason is not null then
    v:=v||jsonb_build_object(
      'fallback_from_target',true,
      'target_reason_code',v_fallback_reason,
      'fallback_target_project_id',v_original_target
    );
  end if;

  if coalesce(v->>'state','')<>'WORK' then
    if v_original_target is not null
       and (v_original_expires is null or v_original_expires>now())
    then
      update public.prometeo_workers
      set next_project_id=v_original_target,
          target_reason_code=coalesce(v_fallback_reason,v_original_reason),
          target_expires_at=v_original_expires
      where agent_id=p_agent_id and status<>'WORKING';
    elsif v_original_target is null and v_route_project is not null then
      update public.prometeo_workers
      set next_project_id=null,target_reason_code=null,target_expires_at=null
      where agent_id=p_agent_id and status<>'WORKING'
        and next_project_id=v_route_project;
    end if;
  end if;

  if v->>'state'='WORK' then
    update public.prometeo_worker_sessions
    set consecutive_waits=0,last_seen_at=now()
    where agent_id=p_agent_id and closed_at is null;
  end if;

  return public.prometeo_contract_response(p_agent_id,v);
end;
$function$;
