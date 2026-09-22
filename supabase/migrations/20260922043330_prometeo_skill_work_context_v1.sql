-- BACKLOG-251 · Skills mejoran Prometeo
-- Inject relevant ACTIVE/ACCEPTED Skill bundles into WORK contract responses.
-- Reversible surface: drop prometeo_skill_context/prometeo_skill_work_context_smoke_test
-- and restore the prior prometeo_contract_response definition.

create or replace function public.prometeo_skill_context(
  p_job jsonb,
  p_limit integer default 3
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
with job_text as (
  select lower(concat_ws(
    ' ',
    coalesce(p_job->>'job_key',''),
    coalesce(p_job->>'title',''),
    coalesce(p_job->>'objective',''),
    coalesce(p_job->>'instruction',''),
    coalesce(p_job->'input_context','{}'::jsonb)::text
  )) as txt
),
ranked as (
  select
    s.skill_id,
    v.version_no,
    s.name,
    s.purpose,
    (
      case when position(lower(s.skill_id) in j.txt) > 0 then 100 else 0 end
      + case when position(lower(s.name) in j.txt) > 0 then 50 else 0 end
      + coalesce((
          select count(distinct t.token)::integer * 5
          from regexp_split_to_table(
            lower(concat_ws(' ', s.name, s.purpose)),
            '[^[:alnum:]_]+'
          ) as t(token)
          where length(t.token) >= 5
            and t.token not in (
              'sobre','desde','hasta','entre','hacia','donde','cuando',
              'porque','puede','deben','deber','hacer','hecho','misma',
              'mismo','estos','estas','otros','otras','their','there',
              'which','while','where','would','could','should','about',
              'after','before','using','without'
            )
            and position(t.token in j.txt) > 0
        ), 0)
    ) as match_score
  from public.forge_skills s
  join public.forge_skill_versions v using (skill_id)
  cross join job_text j
  where s.registry_status = 'ACTIVE'
    and v.maturity_state = 'ACCEPTED'
),
selected as (
  select *
  from ranked
  where match_score > 0
  order by match_score desc, skill_id, version_no desc
  limit greatest(1, least(coalesce(p_limit, 3), 5))
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'skill_ref', jsonb_build_object(
        'skill_id', skill_id,
        'version_no', version_no
      ),
      'name', name,
      'purpose', purpose,
      'match_score', match_score,
      'bundle', public.forge_skill_execution_bundle(skill_id, version_no)
    )
    order by match_score desc, skill_id, version_no desc
  ),
  '[]'::jsonb
)
from selected;
$function$;

create or replace function public.prometeo_contract_response(
  p_agent_id text,
  p_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  s public.prometeo_worker_sessions%rowtype;
  v_state text;
  v_reason text;
  v_action text;
  v_response jsonb := coalesce(p_response,'{}'::jsonb);
  v_action_contract jsonb;
begin
  v_state := coalesce(v_response->>'state','UNKNOWN');

  if v_state='WORK'
     and jsonb_typeof(v_response->'job')='object'
  then
    v_response := v_response || jsonb_build_object(
      'skill_context',
      public.prometeo_skill_context(v_response->'job', 3)
    );
  end if;

  select * into s
  from public.prometeo_worker_sessions
  where agent_id=p_agent_id;

  if not found and exists (
    select 1 from public.prometeo_workers where agent_id=p_agent_id
  ) then
    perform public.prometeo_worker_session_touch(
      p_agent_id,
      'CONTRACT_COMPAT',
      'CONTRACT_COMPAT:'||md5(p_agent_id),
      jsonb_build_object('state',v_state,'compatibility','v1'),
      null
    );
    select * into s
    from public.prometeo_worker_sessions
    where agent_id=p_agent_id;
  end if;

  v_reason := coalesce(
    v_response->>'reason_code',
    case v_state
      when 'PREFLIGHT_OK' then 'PREFLIGHT_ACCEPTED'
      when 'INVALID_AGENT_ID' then 'AGENT_ID_REQUIRED'
      when 'PROTOCOL_MISMATCH' then 'PROTOCOL_VERSION_UNSUPPORTED'
      when 'PREFLIGHT_DECLARATION_INVALID' then 'DECLARATION_REQUIRED'
      when 'NOT_JOINED' then 'AGENT_NOT_ENTERED'
      when 'WORK' then case when coalesce((v_response->>'resumed_existing_lease')::boolean,false)
                            then 'ACTIVE_LEASE_RESUMED' else 'JOB_ASSIGNED' end
      when 'WAIT' then 'NO_ASSIGNABLE_WORK'
      when 'WAIT_TIMEOUT_CONTINUE' then 'WAIT_WINDOW_EXHAUSTED'
      when 'PARKED' then 'WAIT_BUDGET_EXHAUSTED'
      when 'PAUSED' then 'WORKER_PAUSED'
      when 'STOPPED' then 'WORKER_STOPPED'
      when 'RETRY_LENGTH' then 'OUTPUT_LENGTH_INVALID'
      when 'RETRY_CHILDREN' then 'CHILDREN_INVALID'
      when 'STALE_LEASE' then 'LEASE_NOT_CURRENT'
      when 'PUBLISHED_AND_NEXT' then 'OUTPUT_ACCEPTED'
      when 'PUBLISHED_AND_STOPPED' then 'OUTPUT_ACCEPTED_WORKER_STOPPED'
      when 'CHECKPOINTED' then 'CHECKPOINT_RECORDED'
      when 'CHECKPOINT_OK' then 'CHECKPOINT_RECORDED'
      when 'CHECKPOINT_REJECTED' then 'CHECKPOINT_INVALID'
      when 'INVALID_CHECKPOINT' then 'CHECKPOINT_INVALID'
      when 'CHECKPOINT_OUT_OF_ORDER' then 'CHECKPOINT_SEQUENCE_INVALID'
      else 'UNCLASSIFIED_STATE'
    end
  );

  v_action := coalesce(
    v_response->>'next_action',
    case v_state
      when 'PREFLIGHT_OK' then 'ENTER'
      when 'INVALID_AGENT_ID' then 'FIX_PREFLIGHT'
      when 'PROTOCOL_MISMATCH' then 'USE_REQUIRED_PROTOCOL'
      when 'PREFLIGHT_DECLARATION_INVALID' then 'FIX_PREFLIGHT'
      when 'NOT_JOINED' then 'ENTER'
      when 'WORK' then 'WORK'
      when 'WAIT' then 'WAIT'
      when 'WAIT_TIMEOUT_CONTINUE' then 'WAIT'
      when 'PARKED' then 'RESPOND_PARKED'
      when 'PAUSED' then 'WAIT'
      when 'STOPPED' then 'RESPOND_STOPPED'
      when 'RETRY_LENGTH' then 'RETRY_PUBLISH'
      when 'RETRY_CHILDREN' then 'RETRY_PUBLISH'
      when 'STALE_LEASE' then 'WAIT'
      when 'PUBLISHED_AND_NEXT' then case
        when v_response->'next'->>'state'='WORK' then 'WORK'
        when v_response->'next'->>'state' in ('STOPPED','PUBLISHED_AND_STOPPED') then 'RESPOND_STOPPED'
        else 'WAIT'
      end
      when 'PUBLISHED_AND_STOPPED' then 'RESPOND_STOPPED'
      when 'CHECKPOINTED' then 'WORK'
      when 'CHECKPOINT_OK' then 'WORK'
      when 'CHECKPOINT_REJECTED' then 'FIX_CHECKPOINT'
      when 'INVALID_CHECKPOINT' then 'FIX_CHECKPOINT'
      when 'CHECKPOINT_OUT_OF_ORDER' then 'FIX_CHECKPOINT'
      else 'INSPECT_STATE'
    end
  );

  v_action_contract := case v_action
    when 'ENTER' then jsonb_build_object(
      'kind','RPC','rpc','prometeo_enter'
    )
    when 'PREFLIGHT' then jsonb_build_object(
      'kind','RPC','rpc','prometeo_preflight',
      'protocol_version','OBEY-v2',
      'requires',jsonb_build_array('agent_id','declaration')
    )
    when 'WAIT' then jsonb_build_object(
      'kind','RPC','rpc','prometeo_wait','timeout_seconds',2,
      'retry_after_seconds',coalesce((v_response->>'retry_after_seconds')::int,2)
    )
    when 'WORK' then jsonb_build_object(
      'kind','CLIENT','operation',
      case when v_state in ('CHECKPOINTED','CHECKPOINT_OK') then 'CONTINUE_JOB' else 'EXECUTE_JOB' end
    )
    when 'RETRY_PUBLISH' then jsonb_build_object(
      'kind','RPC','rpc','prometeo_publish','reuse_lease',true
    )
    when 'FIX_CHECKPOINT' then jsonb_build_object(
      'kind','CLIENT','operation','FIX_CHECKPOINT'
    )
    when 'FIX_PREFLIGHT' then jsonb_build_object(
      'kind','CLIENT','operation','FIX_PREFLIGHT'
    )
    when 'USE_REQUIRED_PROTOCOL' then jsonb_build_object(
      'kind','CLIENT','operation','USE_REQUIRED_PROTOCOL',
      'required_protocol_version','OBEY-v2'
    )
    when 'RESPOND_STOPPED' then jsonb_build_object(
      'kind','RESPOND','value','STOPPED'
    )
    when 'RESPOND_PARKED' then jsonb_build_object(
      'kind','PARK',
      'retry_after_seconds',coalesce((v_response->>'retry_after_seconds')::int,15)
    )
    else jsonb_build_object(
      'kind','CLIENT','operation','INSPECT_STATE'
    )
  end;

  if s.agent_id is not null then
    update public.prometeo_worker_sessions
    set last_seen_at=now(),
        last_state=v_state,
        last_reason_code=v_reason,
        final_state=case
          when v_state in ('STOPPED','PUBLISHED_AND_STOPPED') then v_state
          else final_state
        end,
        closed_at=case
          when v_state in ('STOPPED','PUBLISHED_AND_STOPPED') then coalesce(closed_at,now())
          else closed_at
        end
    where agent_id=p_agent_id;
  end if;

  if v_state='PUBLISHED_AND_NEXT'
     and jsonb_typeof(v_response->'next')='object'
  then
    v_response := jsonb_set(
      v_response,
      '{next}',
      public.prometeo_contract_response(p_agent_id,v_response->'next'),
      true
    );
  end if;

  return v_response || jsonb_build_object(
    'protocol_version',coalesce(s.protocol_version,'obey-v1'),
    'session_id',s.session_id,
    'session_linked',s.session_id is not null,
    'reason_code',v_reason,
    'next_action',v_action,
    'action',v_action_contract,
    'checkpoint_policy',public.prometeo_checkpoint_policy(),
    'server_time',clock_timestamp()
  );
end;
$function$;

create or replace function public.prometeo_skill_work_context_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_context jsonb;
  v_contract jsonb;
begin
  v_context := public.prometeo_skill_context(
    jsonb_build_object(
      'job_key','SMOKE-SKILL-CONTEXT',
      'title','Integrador de sección',
      'objective','Reconciliar interfaces compactas en una Section Specification trazable.',
      'instruction','Preservar decisiones canónicas y verificar el resultado.',
      'input_context',jsonb_build_object('section_id','SMOKE')
    ),
    3
  );

  if jsonb_array_length(v_context) < 1 then
    raise exception 'SKILL_CONTEXT_EMPTY';
  end if;

  if v_context->0->'skill_ref'->>'skill_id' <> 'FORGE_SECTION_INTEGRATOR' then
    raise exception 'EXPECTED_SECTION_INTEGRATOR_GOT_%',
      coalesce(v_context->0->'skill_ref'->>'skill_id','NULL');
  end if;

  if coalesce((v_context->0->'bundle'->>'ok')::boolean,false) is not true then
    raise exception 'SKILL_BUNDLE_NOT_OK';
  end if;

  v_contract := public.prometeo_contract_response(
    '__skill_context_smoke__',
    jsonb_build_object(
      'ok',true,
      'state','WORK',
      'job',jsonb_build_object(
        'job_key','SMOKE-SKILL-CONTEXT',
        'title','Integrador de sección',
        'objective','Reconciliar interfaces compactas en una Section Specification trazable.',
        'instruction','Preservar decisiones canónicas y verificar el resultado.',
        'input_context',jsonb_build_object('section_id','SMOKE')
      )
    )
  );

  if jsonb_array_length(coalesce(v_contract->'skill_context','[]'::jsonb)) < 1 then
    raise exception 'CONTRACT_SKILL_CONTEXT_EMPTY';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_WORK_CONTEXT_SMOKE_OK',
    'matched_skill_id',v_context->0->'skill_ref'->>'skill_id',
    'matched_version_no',(v_context->0->'skill_ref'->>'version_no')::integer,
    'contract_has_skill_context',true
  );
end;
$function$;
