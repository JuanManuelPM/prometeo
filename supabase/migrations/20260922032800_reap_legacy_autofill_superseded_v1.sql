-- AUTO-Q01000: prevent expired legacy autofill clones from re-entering READY
-- when a newer job of the same reservoir_class is already READY/LEASED/DONE.
-- Scope is deliberately limited to pre-dedupe Work Reservoir autofill jobs.

create or replace function public.prometeo_reap_stale()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_count integer:=0;
  v_newer_job_key text;
  v_class text;
  v_seq bigint;
begin
  for r in
    select project_id,job_key,assigned_agent_id,assigned_worker_code,input_context
    from public.prometeo_jobs
    where status='LEASED' and lease_expires_at<=clock_timestamp()
    for update skip locked
  loop
    v_newer_job_key:=null;
    v_class:=null;
    v_seq:=0;

    if r.project_id='WORK-RESERVOIR-01'
       and coalesce((r.input_context->>'autofill')::boolean,false)=true
       and coalesce(r.input_context->>'dedupe_mode','')<>'ONE_ACTIVE_AUTOFILL_PER_CLASS'
    then
      v_class:=r.input_context->>'reservoir_class';
      v_seq:=coalesce(nullif(r.input_context->>'reservoir_seq',''),'0')::bigint;

      select x.job_key into v_newer_job_key
      from public.prometeo_jobs x
      where x.project_id=r.project_id
        and x.job_key<>r.job_key
        and coalesce((x.input_context->>'autofill')::boolean,false)=true
        and x.input_context->>'reservoir_class'=v_class
        and coalesce(nullif(x.input_context->>'reservoir_seq',''),'0')::bigint>v_seq
        and x.status in ('READY','LEASED','DONE')
      order by coalesce(nullif(x.input_context->>'reservoir_seq',''),'0')::bigint desc
      limit 1;
    end if;

    if v_newer_job_key is not null then
      update public.prometeo_jobs
      set status='CANCELLED',
          generation=generation+1,
          last_worker_code=r.assigned_worker_code,
          assigned_agent_id=null,
          assigned_worker_code=null,
          lease_token=null,
          lease_started_at=null,
          lease_expires_at=null,
          completed_at=coalesce(completed_at,now())
      where project_id=r.project_id and job_key=r.job_key;

      insert into public.prometeo_events(worker_code,agent_id,project_id,job_key,event_type,payload)
      values(
        r.assigned_worker_code,r.assigned_agent_id,r.project_id,r.job_key,
        'JOB_CANCELLED_DUPLICATE',
        jsonb_build_object(
          'reason_code','LEGACY_AUTOFILL_SUPERSEDED_AFTER_EXPIRY',
          'reservoir_class',v_class,
          'newer_job_key',v_newer_job_key
        )
      );
    else
      update public.prometeo_jobs
      set status='READY',
          generation=generation+1,
          last_worker_code=r.assigned_worker_code,
          assigned_agent_id=null,
          assigned_worker_code=null,
          lease_token=null,
          lease_started_at=null,
          lease_expires_at=null,
          is_rescue=true,
          rescue_count=rescue_count+1
      where project_id=r.project_id and job_key=r.job_key;
    end if;

    update public.prometeo_workers
    set status=case when stop_after_current then 'STOPPED' else 'WAITING' end,
        current_project_id=null,current_job_key=null,last_seen_at=now(),
        completed_at=case when stop_after_current then now() else completed_at end
    where agent_id=r.assigned_agent_id and status='WORKING';

    insert into public.prometeo_events(worker_code,agent_id,project_id,job_key,event_type)
    values(r.assigned_worker_code,r.assigned_agent_id,r.project_id,r.job_key,'LEASE_EXPIRED');

    v_count:=v_count+1;
  end loop;

  return v_count;
end;
$function$;
