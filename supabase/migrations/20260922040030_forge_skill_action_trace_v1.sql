-- BACKLOG-206: durable Skill action tracing.
-- Requires forge_skills + forge_skill_versions from forge_skill_registry_and_version_schema.

create table if not exists public.forge_skill_action_traces (
  action_trace_id uuid primary key default gen_random_uuid(),
  skill_id text not null,
  skill_version_no integer not null check (skill_version_no > 0),
  project_id text,
  job_key text,
  worker_code text,
  session_id uuid,
  action_kind text not null check (action_kind in ('TOOL_CALL','STATE_CHANGE','ARTIFACT_WRITE','CHECK','OTHER')),
  action_ref text,
  procedure_step text,
  status text not null default 'STARTED'
    check (status in ('STARTED','SUCCEEDED','FAILED','REVERSED')),
  input_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(input_refs)='array'),
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs)='array'),
  output_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(output_refs)='array'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  dedupe_key text not null check (btrim(dedupe_key) <> ''),
  status_history jsonb not null default '[]'::jsonb check (jsonb_typeof(status_history)='array'),
  last_finish_fingerprint text,
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  constraint forge_skill_action_traces_version_fk
    foreign key (skill_id,skill_version_no)
    references public.forge_skill_versions(skill_id,version_no)
    on delete restrict
);

create unique index if not exists forge_skill_action_trace_dedupe_uq
on public.forge_skill_action_traces(skill_id,skill_version_no,dedupe_key);

create index if not exists forge_skill_action_trace_skill_history_idx
on public.forge_skill_action_traces(skill_id,skill_version_no,started_at desc);

create index if not exists forge_skill_action_trace_job_idx
on public.forge_skill_action_traces(project_id,job_key,started_at desc);

create or replace function public.forge_skill_trace_action_start(
  p_skill_id text,
  p_version_no integer,
  p_context jsonb,
  p_dedupe_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_context jsonb := coalesce(p_context,'{}'::jsonb);
  v_dedupe text := nullif(btrim(p_dedupe_key),'');
  v_kind text;
  v_session uuid;
  v_trace public.forge_skill_action_traces%rowtype;
begin
  if jsonb_typeof(v_context) <> 'object' or v_dedupe is null then
    return jsonb_build_object('ok',false,'state','INVALID_TRACE_INPUT');
  end if;
  if not exists(
    select 1 from public.forge_skill_versions
    where skill_id=nullif(btrim(p_skill_id),'') and version_no=p_version_no
  ) then
    return jsonb_build_object('ok',false,'state','SKILL_VERSION_NOT_FOUND');
  end if;
  v_kind := coalesce(nullif(v_context->>'action_kind',''),'OTHER');
  if v_kind not in ('TOOL_CALL','STATE_CHANGE','ARTIFACT_WRITE','CHECK','OTHER') then
    return jsonb_build_object('ok',false,'state','INVALID_ACTION_KIND');
  end if;
  if jsonb_typeof(coalesce(v_context->'input_refs','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_context->'provenance','{}'::jsonb)) <> 'object'
  then
    return jsonb_build_object('ok',false,'state','INVALID_CONTEXT_SHAPE');
  end if;
  if nullif(v_context->>'session_id','') is not null then
    begin
      v_session := (v_context->>'session_id')::uuid;
    exception when invalid_text_representation then
      return jsonb_build_object('ok',false,'state','INVALID_SESSION_ID');
    end;
  end if;

  insert into public.forge_skill_action_traces(
    skill_id,skill_version_no,project_id,job_key,worker_code,session_id,
    action_kind,procedure_step,input_refs,provenance,dedupe_key,status_history
  ) values (
    btrim(p_skill_id),p_version_no,
    nullif(v_context->>'project_id',''),
    nullif(v_context->>'job_key',''),
    nullif(v_context->>'worker_code',''),
    v_session,
    v_kind,
    nullif(v_context->>'procedure_step',''),
    coalesce(v_context->'input_refs','[]'::jsonb),
    coalesce(v_context->'provenance','{}'::jsonb),
    v_dedupe,
    jsonb_build_array(jsonb_build_object('status','STARTED','at',clock_timestamp()))
  )
  returning * into v_trace;

  return jsonb_build_object(
    'ok',true,'state','TRACE_STARTED',
    'action_trace_id',v_trace.action_trace_id,
    'skill_id',v_trace.skill_id,
    'skill_version_no',v_trace.skill_version_no,
    'status',v_trace.status
  );
exception
  when unique_violation then
    select * into v_trace
    from public.forge_skill_action_traces
    where skill_id=btrim(p_skill_id)
      and skill_version_no=p_version_no
      and dedupe_key=v_dedupe;
    return jsonb_build_object(
      'ok',true,'state','TRACE_DEDUPED',
      'action_trace_id',v_trace.action_trace_id,
      'skill_id',v_trace.skill_id,
      'skill_version_no',v_trace.skill_version_no,
      'status',v_trace.status
    );
end;
$$;

create or replace function public.forge_skill_trace_action_finish(
  p_action_trace_id uuid,
  p_status text,
  p_action_ref text default null,
  p_evidence_refs jsonb default '[]'::jsonb,
  p_output_refs jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_trace public.forge_skill_action_traces%rowtype;
  v_status text := upper(coalesce(trim(p_status),''));
  v_evidence jsonb := coalesce(p_evidence_refs,'[]'::jsonb);
  v_outputs jsonb := coalesce(p_output_refs,'[]'::jsonb);
  v_fingerprint text;
  v_action_ref text := nullif(btrim(p_action_ref),'');
begin
  if v_status not in ('SUCCEEDED','FAILED','REVERSED') then
    return jsonb_build_object('ok',false,'state','INVALID_FINISH_STATUS');
  end if;
  if jsonb_typeof(v_evidence) <> 'array' or jsonb_typeof(v_outputs) <> 'array' then
    return jsonb_build_object('ok',false,'state','INVALID_FINISH_SHAPE');
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'status',v_status,
    'action_ref',v_action_ref,
    'evidence_refs',v_evidence,
    'output_refs',v_outputs
  )::text);

  select * into v_trace
  from public.forge_skill_action_traces
  where action_trace_id=p_action_trace_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'state','TRACE_NOT_FOUND');
  end if;

  if v_trace.status=v_status and v_trace.last_finish_fingerprint=v_fingerprint then
    return jsonb_build_object(
      'ok',true,'state','TRACE_ALREADY_FINISHED',
      'action_trace_id',v_trace.action_trace_id,
      'status',v_trace.status
    );
  end if;

  if v_trace.status='STARTED' then
    if v_status='REVERSED' then
      return jsonb_build_object('ok',false,'state','INVALID_TRACE_TRANSITION');
    end if;
    if v_status='SUCCEEDED'
       and v_action_ref is null
       and jsonb_array_length(v_evidence)=0
    then
      return jsonb_build_object('ok',false,'state','TRACE_EVIDENCE_REQUIRED');
    end if;

    update public.forge_skill_action_traces
    set status=v_status,
        action_ref=v_action_ref,
        evidence_refs=v_evidence,
        output_refs=v_outputs,
        finished_at=clock_timestamp(),
        last_finish_fingerprint=v_fingerprint,
        status_history=status_history || jsonb_build_array(
          jsonb_build_object('status',v_status,'at',clock_timestamp())
        )
    where action_trace_id=v_trace.action_trace_id
    returning * into v_trace;

    return jsonb_build_object(
      'ok',true,'state','TRACE_FINISHED',
      'action_trace_id',v_trace.action_trace_id,
      'status',v_trace.status
    );
  end if;

  if v_trace.status='SUCCEEDED' and v_status='REVERSED' then
    if jsonb_array_length(v_evidence)=0 then
      return jsonb_build_object('ok',false,'state','REVERSAL_EVIDENCE_REQUIRED');
    end if;
    update public.forge_skill_action_traces
    set status='REVERSED',
        action_ref=coalesce(v_action_ref,action_ref),
        evidence_refs=evidence_refs || v_evidence,
        output_refs=output_refs || v_outputs,
        finished_at=clock_timestamp(),
        last_finish_fingerprint=v_fingerprint,
        status_history=status_history || jsonb_build_array(
          jsonb_build_object('status','REVERSED','at',clock_timestamp(),'evidence_refs',v_evidence)
        )
    where action_trace_id=v_trace.action_trace_id
    returning * into v_trace;

    return jsonb_build_object(
      'ok',true,'state','TRACE_REVERSED',
      'action_trace_id',v_trace.action_trace_id,
      'status',v_trace.status,
      'action_ref',v_trace.action_ref
    );
  end if;

  return jsonb_build_object(
    'ok',false,'state','TRACE_FINISH_CONFLICT',
    'action_trace_id',v_trace.action_trace_id,
    'current_status',v_trace.status,
    'requested_status',v_status
  );
end;
$$;

create or replace function public.forge_skill_action_trace(p_action_trace_id uuid)
returns jsonb
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select coalesce(
    (
      select jsonb_build_object('ok',true,'state','TRACE_FOUND','trace',to_jsonb(t))
      from public.forge_skill_action_traces t
      where t.action_trace_id=p_action_trace_id
    ),
    jsonb_build_object('ok',false,'state','TRACE_NOT_FOUND')
  );
$$;

create or replace function public.forge_skill_action_history(
  p_skill_id text,
  p_version_no integer default null
) returns jsonb
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'ok',true,
    'state','TRACE_HISTORY',
    'skill_id',p_skill_id,
    'skill_version_no',p_version_no,
    'items',coalesce(
      jsonb_agg(to_jsonb(t) order by t.started_at,t.action_trace_id)
        filter (where t.action_trace_id is not null),
      '[]'::jsonb
    )
  )
  from public.forge_skill_action_traces t
  where t.skill_id=p_skill_id
    and (p_version_no is null or t.skill_version_no=p_version_no);
$$;

create or replace function public.forge_skill_action_trace_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_skill text := '__TRACE_SMOKE__' || substr(md5(clock_timestamp()::text),1,10);
  v_reg jsonb;
  v_ver jsonb;
  v_start jsonb;
  v_dedupe jsonb;
  v_missing jsonb;
  v_no_evidence jsonb;
  v_success jsonb;
  v_repeat jsonb;
  v_conflict jsonb;
  v_reverse jsonb;
  v_get jsonb;
  v_history jsonb;
  v_trace_id uuid;
begin
  v_reg := public.forge_skill_register(
    v_skill,'Trace Smoke Skill','temporary trace fixture',
    jsonb_build_object('source','forge_skill_action_trace_smoke_test')
  );
  if coalesce((v_reg->>'ok')::boolean,false) is not true then
    raise exception 'trace smoke register failed: %',v_reg;
  end if;

  v_ver := public.forge_skill_add_version(
    v_skill,
    jsonb_build_object(
      'maturity_state','CANDIDATE',
      'inputs_schema',jsonb_build_object('type','object'),
      'outputs_schema',jsonb_build_object('type','object'),
      'procedure_steps',jsonb_build_array('do-smoke'),
      'rollback_contract',jsonb_build_object('mode','delete-fixture'),
      'verification_contract',jsonb_build_object('assert','trace-smoke'),
      'evidence_requirements',jsonb_build_array('receipt'),
      'evidence',jsonb_build_array()
    ),
    jsonb_build_object('source','trace-smoke-version')
  );

  v_start := public.forge_skill_trace_action_start(
    v_skill,1,
    jsonb_build_object(
      'action_kind','CHECK',
      'procedure_step','do-smoke',
      'input_refs',jsonb_build_array('fixture://input'),
      'provenance',jsonb_build_object('source','trace-smoke')
    ),
    'trace-smoke-dedupe'
  );
  v_trace_id := (v_start->>'action_trace_id')::uuid;

  v_dedupe := public.forge_skill_trace_action_start(
    v_skill,1,
    jsonb_build_object(
      'action_kind','CHECK',
      'procedure_step','do-smoke',
      'input_refs',jsonb_build_array('fixture://input'),
      'provenance',jsonb_build_object('source','trace-smoke')
    ),
    'trace-smoke-dedupe'
  );

  v_missing := public.forge_skill_trace_action_start(
    v_skill,99,
    jsonb_build_object('action_kind','CHECK','provenance',jsonb_build_object('source','trace-smoke')),
    'missing-version'
  );

  v_no_evidence := public.forge_skill_trace_action_finish(
    v_trace_id,'SUCCEEDED',null,'[]'::jsonb,'[]'::jsonb
  );
  v_success := public.forge_skill_trace_action_finish(
    v_trace_id,'SUCCEEDED','receipt://trace-smoke',
    jsonb_build_array('evidence://success'),
    jsonb_build_array('output://smoke')
  );
  v_repeat := public.forge_skill_trace_action_finish(
    v_trace_id,'SUCCEEDED','receipt://trace-smoke',
    jsonb_build_array('evidence://success'),
    jsonb_build_array('output://smoke')
  );
  v_conflict := public.forge_skill_trace_action_finish(
    v_trace_id,'FAILED','receipt://other',
    jsonb_build_array('evidence://conflict'),
    '[]'::jsonb
  );
  v_reverse := public.forge_skill_trace_action_finish(
    v_trace_id,'REVERSED',null,
    jsonb_build_array('evidence://reversal'),
    '[]'::jsonb
  );

  v_get := public.forge_skill_action_trace(v_trace_id);
  v_history := public.forge_skill_action_history(v_skill,1);

  if v_start->>'state' <> 'TRACE_STARTED'
     or v_dedupe->>'state' <> 'TRACE_DEDUPED'
     or v_dedupe->>'action_trace_id' <> v_start->>'action_trace_id'
     or v_missing->>'state' <> 'SKILL_VERSION_NOT_FOUND'
     or v_no_evidence->>'state' <> 'TRACE_EVIDENCE_REQUIRED'
     or v_success->>'state' <> 'TRACE_FINISHED'
     or v_repeat->>'state' <> 'TRACE_ALREADY_FINISHED'
     or v_conflict->>'state' <> 'TRACE_FINISH_CONFLICT'
     or v_reverse->>'state' <> 'TRACE_REVERSED'
     or v_get->'trace'->>'status' <> 'REVERSED'
     or v_get->'trace'->>'action_ref' <> 'receipt://trace-smoke'
     or jsonb_array_length(v_get->'trace'->'status_history') <> 3
     or jsonb_array_length(v_history->'items') <> 1
  then
    raise exception 'skill action trace smoke failed';
  end if;

  delete from public.forge_skill_action_traces where skill_id=v_skill;
  delete from public.forge_skills where skill_id=v_skill;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_ACTION_TRACE_SMOKE_OK',
    'dedupe','PASS',
    'missing_version','PASS',
    'evidence_gate','PASS',
    'idempotent_finish','PASS',
    'conflict_rejected','PASS',
    'reversal_history','PASS',
    'exact_version_history','PASS',
    'fixture_cleaned',
      not exists(select 1 from public.forge_skills where skill_id=v_skill)
      and not exists(select 1 from public.forge_skill_action_traces where skill_id=v_skill)
  );
exception
  when others then
    delete from public.forge_skill_action_traces where skill_id=v_skill;
    delete from public.forge_skills where skill_id=v_skill;
    raise;
end;
$$;
