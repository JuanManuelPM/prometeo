-- Q025: complete session-event evidence for ENTER->WORK and OBEY-v2 checkpoints.
-- Add checkpoint_at to control_session_timing without changing existing column order.

create or replace function public.prometeo_enter(p_agent_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.prometeo_workers%rowtype;
  v_no bigint;
  v_code text;
  v jsonb;
  v_project_id text;
  v_job_key text;
  v_lease_fingerprint text;
begin
  perform pg_advisory_xact_lock(hashtext('prometeo-global-control'));

  select * into w from public.prometeo_workers where agent_id=p_agent_id;
  if found then
    update public.prometeo_workers set last_seen_at=now() where agent_id=p_agent_id;
    update public.prometeo_worker_sessions
    set joined_at=coalesce(joined_at,now()),worker_code=w.worker_code,
        consecutive_waits=0,last_seen_at=now()
    where agent_id=p_agent_id;

    perform public.prometeo_worker_session_touch(
      p_agent_id,'ENTER','ENTER:'||md5(p_agent_id),
      jsonb_build_object('state','ENTER','worker_code',w.worker_code),null
    );

    v:=public.prometeo_active_lease_packet(p_agent_id);
    if v is null then
      v:=public.prometeo_allocate(p_agent_id);
    end if;

    if v->>'state'='WORK' then
      v_project_id:=coalesce(v#>>'{project,project_id}',v->>'project_id');
      v_job_key:=coalesce(v#>>'{job,job_key}',v->>'job_key');
      v_lease_fingerprint:=md5(coalesce(v->>'lease_token',''));
      perform public.prometeo_worker_session_touch(
        p_agent_id,'ENTER_RESULT',
        'ENTER_WORK:'||md5(p_agent_id)||':'||
          coalesce(v_project_id,'')||':'||coalesce(v_job_key,'')||':'||v_lease_fingerprint,
        jsonb_build_object(
          'state','WORK','source','ENTER',
          'project_id',v_project_id,'job_key',v_job_key,
          'reason_code',v->>'reason_code',
          'lease_fingerprint',v_lease_fingerprint
        ),
        null
      );
    end if;

    return public.prometeo_contract_response(p_agent_id,v);
  end if;

  v_no:=nextval('public.prometeo_worker_no_seq');
  v_code:='K'||lpad(v_no::text,3,'0');

  insert into public.prometeo_workers(agent_id,worker_code,status)
  values(p_agent_id,v_code,'WAITING');

  update public.prometeo_worker_sessions
  set joined_at=coalesce(joined_at,now()),worker_code=v_code,
      consecutive_waits=0,last_seen_at=now()
  where agent_id=p_agent_id;

  perform public.prometeo_worker_session_touch(
    p_agent_id,'ENTER','ENTER:'||md5(p_agent_id),
    jsonb_build_object('state','ENTER','worker_code',v_code),null
  );

  insert into public.prometeo_events(worker_code,agent_id,event_type,payload)
  values(
    v_code,p_agent_id,'ENTER',
    jsonb_build_object(
      'session_id',(select session_id from public.prometeo_worker_sessions where agent_id=p_agent_id),
      'protocol_version',coalesce((select protocol_version from public.prometeo_worker_sessions where agent_id=p_agent_id),'OBEY-v1')
    )
  );

  v:=public.prometeo_allocate(p_agent_id);

  if v->>'state'='WORK' then
    v_project_id:=coalesce(v#>>'{project,project_id}',v->>'project_id');
    v_job_key:=coalesce(v#>>'{job,job_key}',v->>'job_key');
    v_lease_fingerprint:=md5(coalesce(v->>'lease_token',''));
    perform public.prometeo_worker_session_touch(
      p_agent_id,'ENTER_RESULT',
      'ENTER_WORK:'||md5(p_agent_id)||':'||
        coalesce(v_project_id,'')||':'||coalesce(v_job_key,'')||':'||v_lease_fingerprint,
      jsonb_build_object(
        'state','WORK','source','ENTER',
        'project_id',v_project_id,'job_key',v_job_key,
        'reason_code',v->>'reason_code',
        'lease_fingerprint',v_lease_fingerprint
      ),
      null
    );
  end if;

  return public.prometeo_contract_response(p_agent_id,v);
end;
$function$;

create or replace function public.prometeo_checkpoint(
  p_agent_id text,
  p_lease_token text,
  p_milestone text,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.prometeo_workers%rowtype;
  j public.prometeo_jobs%rowtype;
  s public.prometeo_worker_sessions%rowtype;
  v_allowed text[] := array[
    'INPUTS_VALIDATED','SOURCE_LOADED','ACTION_COMPLETED',
    'EVIDENCE_VERIFIED','TOOL_ERROR','RECOVERY_COMPLETED','PRE_PUBLISH'
  ];
  v_now timestamptz := clock_timestamp();
  v_event_id bigint;
begin
  select * into s
  from public.prometeo_worker_sessions
  where agent_id=p_agent_id and protocol_version='OBEY-v2' and closed_at is null;

  if not found then
    return public.prometeo_contract_response(
      p_agent_id,
      jsonb_build_object(
        'ok',false,'state','CHECKPOINT_REJECTED',
        'reason_code','V2_SESSION_REQUIRED','next_action','PREFLIGHT'
      )
    );
  end if;

  if not (p_milestone = any(v_allowed)) then
    return public.prometeo_contract_response(
      p_agent_id,
      jsonb_build_object(
        'ok',false,'state','CHECKPOINT_REJECTED',
        'reason_code','MILESTONE_INVALID','next_action','FIX_CHECKPOINT',
        'allowed_milestones',to_jsonb(v_allowed)
      )
    );
  end if;

  if jsonb_typeof(coalesce(p_detail,'{}'::jsonb)) <> 'object'
     or char_length(coalesce(p_detail,'{}'::jsonb)::text) > 4000
  then
    return public.prometeo_contract_response(
      p_agent_id,
      jsonb_build_object(
        'ok',false,'state','CHECKPOINT_REJECTED',
        'reason_code','DETAIL_INVALID','next_action','FIX_CHECKPOINT'
      )
    );
  end if;

  select * into w
  from public.prometeo_workers
  where agent_id=p_agent_id;

  if not found then
    return public.prometeo_contract_response(
      p_agent_id,
      jsonb_build_object('ok',false,'state','NOT_JOINED')
    );
  end if;

  select * into j
  from public.prometeo_jobs
  where lease_token=p_lease_token
    and status='LEASED'
    and assigned_agent_id=p_agent_id
    and lease_expires_at>v_now;

  if not found then
    return public.prometeo_contract_response(
      p_agent_id,
      jsonb_build_object(
        'ok',false,'state','STALE_LEASE',
        'worker_code',w.worker_code,'must_continue',not w.stop_after_current
      )
    );
  end if;

  insert into public.prometeo_events(
    worker_code,agent_id,project_id,job_key,event_type,payload
  )
  values(
    w.worker_code,p_agent_id,j.project_id,j.job_key,'CHECKPOINT',
    jsonb_build_object(
      'session_id',s.session_id,
      'protocol_version',s.protocol_version,
      'milestone',p_milestone,
      'detail',coalesce(p_detail,'{}'::jsonb)
    )
  )
  returning event_id into v_event_id;

  update public.prometeo_workers
  set last_seen_at=v_now
  where agent_id=p_agent_id;

  perform public.prometeo_worker_session_touch(
    p_agent_id,'CHECKPOINT','CHECKPOINT_EVENT:'||v_event_id::text,
    jsonb_build_object(
      'state','CHECKPOINT_OK',
      'project_id',j.project_id,
      'job_key',j.job_key,
      'generation',j.generation,
      'milestone',p_milestone,
      'event_id',v_event_id
    ),
    null
  );

  update public.prometeo_worker_sessions
  set last_seen_at=v_now,
      last_state='CHECKPOINT_OK',
      last_reason_code='CHECKPOINT_RECORDED'
  where agent_id=p_agent_id;

  return public.prometeo_contract_response(
    p_agent_id,
    jsonb_build_object(
      'ok',true,'state','CHECKPOINT_OK',
      'worker_code',w.worker_code,
      'project_id',j.project_id,
      'job_key',j.job_key,
      'milestone',p_milestone,
      'lease_expires_at',j.lease_expires_at,
      'lease_remaining_seconds',greatest(0,extract(epoch from (j.lease_expires_at-v_now))::int),
      'server_time',v_now
    )
  );
end;
$function$;

create or replace view public.prometeo_control_session_timing as
with e as (
  select
    x.event_id,x.event_key,x.session_id,x.agent_id,x.worker_code,x.protocol_version,
    x.phase,x.state,x.payload,x.created_at,
    lead(x.created_at) over(partition by x.session_id order by x.created_at,x.event_id) as next_at
  from public.prometeo_worker_session_events x
),
i as (
  select
    e.*,
    greatest(0::numeric,extract(epoch from(coalesce(e.next_at,e.created_at)-e.created_at))*1000.0) as interval_ms,
    case
      when e.phase='BOOT' then 'BOOT'
      when e.phase=any(array['PREFLIGHT','ENTER','CONTRACT_COMPAT']) then 'COORDINATION'
      when e.phase=any(array['WAIT','WAIT_RESULT']) and coalesce(e.state,'')<>'WORK' then 'WAIT'
      when e.state='WORK' or e.phase='CHECKPOINT' then 'WORK'
      when e.phase like 'PUBLISH%' then 'PUBLISH'
      else 'OTHER'
    end as bucket
  from e
),
agg as (
  select
    i.session_id,
    min(i.created_at) filter(where i.phase='BOOT') as boot_at,
    min(i.created_at) filter(where i.phase='PREFLIGHT') as preflight_event_at,
    min(i.created_at) filter(where i.phase='ENTER') as enter_at,
    min(i.created_at) filter(where i.state='WORK') as first_work_at,
    min(i.created_at) filter(where i.phase like 'PUBLISH%' and i.state=any(array['PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED'])) as first_publish_at,
    max(i.created_at) as last_event_at,
    count(*) as event_count,
    sum(i.interval_ms) filter(where i.bucket='BOOT') as boot_ms,
    sum(i.interval_ms) filter(where i.bucket='COORDINATION') as coordination_ms,
    sum(i.interval_ms) filter(where i.bucket='WAIT') as wait_ms,
    sum(i.interval_ms) filter(where i.bucket='WORK') as work_ms,
    sum(i.interval_ms) filter(where i.bucket='PUBLISH') as publish_ms,
    sum(i.interval_ms) filter(where i.bucket='OTHER') as other_ms,
    min(i.created_at) filter(where i.phase='CHECKPOINT') as checkpoint_at
  from i
  group by i.session_id
)
select
  s.session_id,
  s.agent_id,
  s.worker_code,
  s.protocol_version,
  s.prompt_version,
  nullif(s.declaration->>'launch_batch','') as launch_batch,
  s.first_observed_at as t0,
  a.preflight_event_at,
  a.enter_at,
  a.first_work_at,
  a.first_publish_at,
  a.last_event_at,
  s.last_seen_at,
  s.last_state,
  s.last_reason_code,
  s.final_state,
  coalesce(a.event_count,0::bigint) as event_count,
  case when a.enter_at is not null then round(extract(epoch from(a.enter_at-s.first_observed_at))*1000)::bigint else null::bigint end as t0_to_enter_ms,
  case when a.first_work_at is not null then round(extract(epoch from(a.first_work_at-s.first_observed_at))*1000)::bigint else null::bigint end as t0_to_work_ms,
  case when a.first_publish_at is not null then round(extract(epoch from(a.first_publish_at-s.first_observed_at))*1000)::bigint else null::bigint end as t0_to_publish_ms,
  round(coalesce(a.boot_ms,0::numeric))::bigint as boot_ms,
  round(coalesce(a.coordination_ms,0::numeric))::bigint as coordination_ms,
  round(coalesce(a.wait_ms,0::numeric))::bigint as wait_ms,
  round(coalesce(a.work_ms,0::numeric))::bigint as work_ms,
  round(coalesce(a.publish_ms,0::numeric))::bigint as publish_ms,
  round(coalesce(a.other_ms,0::numeric))::bigint as other_ms,
  greatest(1::numeric,round(extract(epoch from(coalesce(a.last_event_at,s.last_seen_at,s.first_observed_at)-s.first_observed_at))*1000))::bigint as observed_ms,
  round((100.0*coalesce(a.work_ms,0::numeric))/greatest(1::numeric,extract(epoch from(coalesce(a.last_event_at,s.last_seen_at,s.first_observed_at)-s.first_observed_at))*1000),1) as work_pct,
  round((100.0*coalesce(a.wait_ms,0::numeric))/greatest(1::numeric,extract(epoch from(coalesce(a.last_event_at,s.last_seen_at,s.first_observed_at)-s.first_observed_at))*1000),1) as wait_pct,
  a.checkpoint_at
from public.prometeo_worker_sessions s
left join agg a using(session_id);
