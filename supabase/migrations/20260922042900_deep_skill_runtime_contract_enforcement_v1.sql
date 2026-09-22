-- BACKLOG-223 · Deep Skill runtime contract enforcement v1
-- Applied to Supabase before this file was materialized; definitions below are read back from the live database.
-- No real Deep Skill seed data is included. Legacy Skills may keep execution_contract NULL.
-- Rollback boundary: restore the prior function definitions, then drop the nullable column only after confirming it contains no durable contracts.

alter table public.forge_skill_versions
  add column if not exists execution_contract jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.forge_skill_versions'::regclass
      and conname='forge_skill_versions_execution_contract_object'
  ) then
    alter table public.forge_skill_versions
      add constraint forge_skill_versions_execution_contract_object
      check (
        execution_contract is null
        or jsonb_typeof(execution_contract)='object'
      );
  end if;
end
$$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_contract_validate(p_contract jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_budget jsonb;
  v_item jsonb;
  v_min integer;
  v_target integer;
  v_max integer;
  v_tools integer;
  v_children integer;
  v_min_count integer;
  v_provenance_required jsonb;
begin
  if p_contract is null or jsonb_typeof(p_contract)<>'object' then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','CONTRACT_NOT_OBJECT');
  end if;

  if p_contract->>'schema'<>'prometeo.deep-skill-contract/v1' then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','SCHEMA_MISMATCH');
  end if;

  if coalesce(p_contract->>'profile','') not in ('ANALYZE','SYNTHESIZE','ADVERSARIAL','TRANSFORM','META') then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_PROFILE');
  end if;

  v_budget:=p_contract->'budget';
  if jsonb_typeof(v_budget)<>'object' then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','BUDGET_NOT_OBJECT');
  end if;

  begin
    if jsonb_typeof(v_budget->'min_words')<>'number'
       or jsonb_typeof(v_budget->'target_words')<>'number'
       or jsonb_typeof(v_budget->'max_words')<>'number'
       or jsonb_typeof(v_budget->'max_tool_calls')<>'number'
       or jsonb_typeof(v_budget->'max_children')<>'number' then
      raise exception 'budget numeric field missing';
    end if;
    v_min:=(v_budget->>'min_words')::integer;
    v_target:=(v_budget->>'target_words')::integer;
    v_max:=(v_budget->>'max_words')::integer;
    v_tools:=(v_budget->>'max_tool_calls')::integer;
    v_children:=(v_budget->>'max_children')::integer;
  exception when others then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_BUDGET_NUMBERS');
  end;

  if v_min<1 or v_target<v_min or v_max<v_target then
    return jsonb_build_object(
      'ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_WORD_BUDGET_ORDER',
      'min_words',v_min,'target_words',v_target,'max_words',v_max
    );
  end if;
  if v_tools<0 then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_MAX_TOOL_CALLS');
  end if;
  if v_children<0 or v_children>3 then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_MAX_CHILDREN');
  end if;

  if jsonb_typeof(p_contract->'required_operations')<>'array' then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','REQUIRED_OPERATIONS_NOT_ARRAY');
  end if;
  for v_item in select value from jsonb_array_elements(p_contract->'required_operations')
  loop
    if jsonb_typeof(v_item)<>'string' or nullif(btrim(v_item#>>'{}'),'') is null then
      return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_REQUIRED_OPERATION');
    end if;
  end loop;

  if jsonb_typeof(p_contract->'required_outputs')<>'array'
     or jsonb_array_length(p_contract->'required_outputs')<1 then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','REQUIRED_OUTPUTS_EMPTY');
  end if;
  for v_item in select value from jsonb_array_elements(p_contract->'required_outputs')
  loop
    if jsonb_typeof(v_item)<>'object'
       or coalesce(v_item->>'type','') not in ('FINDING','DECISION','RISK','SPEC_DELTA','EXPERIMENT','CAPABILITY','OPEN_QUESTION') then
      return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_REQUIRED_OUTPUT');
    end if;
    begin
      if jsonb_typeof(v_item->'min_count')<>'number' then raise exception 'min_count'; end if;
      v_min_count:=(v_item->>'min_count')::integer;
    exception when others then
      return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_REQUIRED_OUTPUT_COUNT');
    end;
    if v_min_count<1 then
      return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_REQUIRED_OUTPUT_COUNT');
    end if;
    v_provenance_required:=v_item->'provenance_required';
    if v_provenance_required is not null and jsonb_typeof(v_provenance_required)<>'boolean' then
      return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_PROVENANCE_REQUIRED');
    end if;
  end loop;

  if jsonb_typeof(p_contract->'stop_conditions')<>'array'
     or jsonb_typeof(p_contract->'failure_modes')<>'array'
     or jsonb_typeof(p_contract->'verification')<>'object'
     or jsonb_typeof(p_contract->'degradation_policy')<>'object' then
    return jsonb_build_object('ok',false,'state','INVALID_DEEP_SKILL_CONTRACT','reason','INVALID_CONTRACT_SHAPE');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_CONTRACT_VALID',
    'contract_schema','prometeo.deep-skill-contract/v1',
    'profile',p_contract->>'profile',
    'budget',v_budget
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_skill_add_version(p_skill_id text, p_definition jsonb, p_provenance jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_skill public.forge_skills%rowtype;
  v_version integer;
  v_maturity text;
  v_execution_contract jsonb;
  v_contract_check jsonb;
begin
  if jsonb_typeof(coalesce(p_definition,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_DEFINITION');
  end if;
  if jsonb_typeof(coalesce(p_provenance,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_PROVENANCE');
  end if;

  v_maturity := coalesce(p_definition->>'maturity_state','CANDIDATE');
  if v_maturity not in ('CANDIDATE','REVIEWING','ACCEPTED','REJECTED','SUPERSEDED') then
    return jsonb_build_object('ok',false,'state','INVALID_MATURITY');
  end if;

  if jsonb_typeof(coalesce(p_definition->'inputs_schema','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_definition->'outputs_schema','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_definition->'procedure_steps','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_definition->'rollback_contract','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_definition->'verification_contract','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_definition->'evidence_requirements','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_definition->'evidence','[]'::jsonb)) <> 'array'
  then
    return jsonb_build_object('ok',false,'state','INVALID_DEFINITION_SHAPE');
  end if;

  if p_definition ? 'execution_contract'
     and jsonb_typeof(p_definition->'execution_contract') <> 'null' then
    v_execution_contract:=p_definition->'execution_contract';
    v_contract_check:=public.forge_deep_skill_contract_validate(v_execution_contract);
    if coalesce((v_contract_check->>'ok')::boolean,false) is not true then
      return jsonb_build_object(
        'ok',false,
        'state','INVALID_EXECUTION_CONTRACT',
        'validation',v_contract_check
      );
    end if;
  else
    v_execution_contract:=null;
  end if;

  select * into v_skill
  from public.forge_skills
  where skill_id=nullif(btrim(p_skill_id),'')
  for update;

  if not found then
    return jsonb_build_object('ok',false,'state','SKILL_NOT_FOUND');
  end if;

  select coalesce(max(version_no),0)+1
  into v_version
  from public.forge_skill_versions
  where skill_id=v_skill.skill_id;

  insert into public.forge_skill_versions(
    skill_id,version_no,maturity_state,
    inputs_schema,outputs_schema,procedure_steps,
    rollback_contract,verification_contract,
    evidence_requirements,evidence,provenance,execution_contract
  ) values (
    v_skill.skill_id,v_version,v_maturity,
    coalesce(p_definition->'inputs_schema','{}'::jsonb),
    coalesce(p_definition->'outputs_schema','{}'::jsonb),
    coalesce(p_definition->'procedure_steps','[]'::jsonb),
    coalesce(p_definition->'rollback_contract','{}'::jsonb),
    coalesce(p_definition->'verification_contract','{}'::jsonb),
    coalesce(p_definition->'evidence_requirements','[]'::jsonb),
    coalesce(p_definition->'evidence','[]'::jsonb),
    coalesce(p_provenance,'{}'::jsonb),
    v_execution_contract
  );

  update public.forge_skills
  set updated_at=now()
  where skill_id=v_skill.skill_id;

  return jsonb_build_object(
    'ok',true,'state','SKILL_VERSION_CREATED',
    'skill_id',v_skill.skill_id,'version_no',v_version,
    'maturity_state',v_maturity,
    'execution_contract_schema',v_execution_contract->>'schema'
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok',false,'state','ACCEPTED_VERSION_CONFLICT',
      'skill_id',nullif(btrim(p_skill_id),'')
    );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_skill_definition_hash(p_skill_id text, p_version_no integer)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select 'md5:' || md5(
    jsonb_build_object(
      'skill_id',v.skill_id,
      'version_no',v.version_no,
      'inputs_schema',v.inputs_schema,
      'outputs_schema',v.outputs_schema,
      'procedure_steps',v.procedure_steps,
      'rollback_contract',v.rollback_contract,
      'verification_contract',v.verification_contract,
      'evidence_requirements',v.evidence_requirements,
      'execution_contract',v.execution_contract,
      'provenance',v.provenance
    )::text
  )
  from public.forge_skill_versions v
  where v.skill_id=p_skill_id
    and v.version_no=p_version_no;
$function$;

CREATE OR REPLACE FUNCTION public.forge_skill_execution_bundle(p_skill_id text, p_version_no integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_skill public.forge_skills%rowtype;
  v_version public.forge_skill_versions%rowtype;
  v_hash text;
begin
  select * into v_skill
  from public.forge_skills
  where skill_id=nullif(btrim(p_skill_id),'');

  if not found then
    return jsonb_build_object('ok',false,'state','SKILL_NOT_FOUND');
  end if;

  select * into v_version
  from public.forge_skill_versions
  where skill_id=v_skill.skill_id
    and version_no=p_version_no;

  if not found then
    return jsonb_build_object(
      'ok',false,'state','SKILL_VERSION_NOT_FOUND',
      'skill_id',v_skill.skill_id,
      'version_no',p_version_no
    );
  end if;

  if v_skill.registry_status <> 'ACTIVE' then
    return jsonb_build_object(
      'ok',false,'state','SKILL_NOT_EXECUTABLE',
      'reason','SKILL_RETIRED',
      'skill_id',v_skill.skill_id,
      'version_no',v_version.version_no
    );
  end if;

  if v_version.maturity_state <> 'ACCEPTED' then
    return jsonb_build_object(
      'ok',false,'state','SKILL_NOT_EXECUTABLE',
      'reason','VERSION_NOT_ACCEPTED',
      'skill_id',v_skill.skill_id,
      'version_no',v_version.version_no,
      'maturity_state',v_version.maturity_state
    );
  end if;

  v_hash := public.forge_skill_definition_hash(v_skill.skill_id,v_version.version_no);

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_EXECUTION_BUNDLE',
    'skill_id',v_skill.skill_id,
    'version_no',v_version.version_no,
    'definition_hash',v_hash,
    'registry_status',v_skill.registry_status,
    'maturity_state',v_version.maturity_state,
    'inputs_schema',v_version.inputs_schema,
    'outputs_schema',v_version.outputs_schema,
    'procedure_steps',v_version.procedure_steps,
    'rollback_contract',v_version.rollback_contract,
    'verification_contract',v_version.verification_contract,
    'evidence_requirements',v_version.evidence_requirements,
    'execution_contract',v_version.execution_contract,
    'provenance',v_version.provenance,
    'authority_granted',false
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_execution_validate(p_skill_ref jsonb, p_output text, p_meta jsonb DEFAULT '{}'::jsonb, p_children jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_ref jsonb;
  v_bundle jsonb;
  v_contract jsonb;
  v_contract_check jsonb;
  v_exec jsonb;
  v_budget jsonb;
  v_required jsonb;
  v_output jsonb;
  v_outputs jsonb;
  v_normalized_outputs jsonb := '[]'::jsonb;
  v_operations jsonb;
  v_evidence jsonb;
  v_tool_errors jsonb;
  v_blocked_operations jsonb;
  v_status text;
  v_words integer;
  v_min integer;
  v_target integer;
  v_max integer;
  v_max_tools integer;
  v_max_children integer;
  v_tool_calls integer;
  v_children integer;
  v_required_count integer;
  v_actual_count integer;
  v_evidence_count integer;
  v_required_provenance boolean;
  v_required_type text;
  v_required_operation text;
  v_receipt jsonb;
begin
  if p_skill_ref is null or jsonb_typeof(p_skill_ref)='null' then
    return jsonb_build_object('ok',true,'state','NO_SKILL_REF_BYPASS');
  end if;

  v_ref:=public.forge_skill_ref_validate(p_skill_ref);
  if coalesce((v_ref->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','INVALID_SKILL_REF','validation',v_ref,'retryable',true
    );
  end if;

  v_bundle:=public.forge_skill_execution_bundle(v_ref->>'skill_id',(v_ref->>'version_no')::integer);
  if coalesce((v_bundle->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','SKILL_NOT_EXECUTABLE','validation',v_bundle,'retryable',true
    );
  end if;

  v_contract:=v_bundle->'execution_contract';
  if v_contract is null or jsonb_typeof(v_contract)='null' then
    return jsonb_build_object(
      'ok',true,'state','LEGACY_SKILL_CONTRACT_BYPASS',
      'skill_id',v_bundle->>'skill_id','version_no',v_bundle->'version_no'
    );
  end if;

  v_contract_check:=public.forge_deep_skill_contract_validate(v_contract);
  if coalesce((v_contract_check->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','INVALID_EXECUTION_CONTRACT',
      'validation',v_contract_check,'retryable',true
    );
  end if;

  v_exec:=coalesce(p_meta,'{}'::jsonb)->'deep_skill_execution';
  if jsonb_typeof(v_exec)<>'object' then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','EXECUTION_META_REQUIRED','retryable',true
    );
  end if;

  if v_exec ? 'chain_of_thought'
     or v_exec ? 'scratchpad'
     or v_exec ? 'reasoning_trace' then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','PRIVATE_REASONING_FORBIDDEN','retryable',true
    );
  end if;

  v_status:=upper(coalesce(v_exec->>'status',''));
  if v_status not in ('COMPLETE','PARTIAL','BLOCKED','TOOL_ERROR') then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','INVALID_EXECUTION_STATUS','retryable',true
    );
  end if;

  v_budget:=v_contract->'budget';
  v_min:=(v_budget->>'min_words')::integer;
  v_target:=(v_budget->>'target_words')::integer;
  v_max:=(v_budget->>'max_words')::integer;
  v_max_tools:=(v_budget->>'max_tool_calls')::integer;
  v_max_children:=(v_budget->>'max_children')::integer;
  v_words:=public.exam_lab_word_count(coalesce(p_output,''));

  if v_words<v_min then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','BELOW_CONTRACT_MIN_WORDS','retryable',true,
      'word_count',v_words,'min_words',v_min,'max_words',v_max
    );
  end if;
  if v_words>v_max then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','ABOVE_CONTRACT_MAX_WORDS','retryable',true,
      'word_count',v_words,'min_words',v_min,'max_words',v_max
    );
  end if;

  if jsonb_typeof(coalesce(p_children,'[]'::jsonb))<>'array' then
    return jsonb_build_object('ok',false,'state','RETRY_SKILL_CONTRACT','reason','CHILDREN_NOT_ARRAY','retryable',true);
  end if;
  v_children:=jsonb_array_length(coalesce(p_children,'[]'::jsonb));
  if v_children>v_max_children then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT','reason','CONTRACT_MAX_CHILDREN_EXCEEDED',
      'children_created',v_children,'max_children',v_max_children,'retryable',true
    );
  end if;

  begin
    if jsonb_typeof(v_exec->'tool_calls_used')<>'number' then raise exception 'tool_calls_used'; end if;
    v_tool_calls:=(v_exec->>'tool_calls_used')::integer;
  exception when others then
    return jsonb_build_object('ok',false,'state','RETRY_SKILL_CONTRACT','reason','INVALID_TOOL_CALL_COUNT','retryable',true);
  end;
  if v_tool_calls<0 or v_tool_calls>v_max_tools then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT','reason','CONTRACT_MAX_TOOL_CALLS_EXCEEDED',
      'tool_calls_used',v_tool_calls,'max_tool_calls',v_max_tools,'retryable',true
    );
  end if;

  v_operations:=v_exec->'operations_completed';
  v_outputs:=v_exec->'outputs';
  v_evidence:=v_exec->'evidence_refs';
  if jsonb_typeof(v_operations)<>'array'
     or jsonb_typeof(v_outputs)<>'array'
     or jsonb_typeof(v_evidence)<>'array' then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','INVALID_EXECUTION_RECEIPT_SHAPE','retryable',true
    );
  end if;

  for v_output in select value from jsonb_array_elements(v_outputs)
  loop
    if jsonb_typeof(v_output)<>'object'
       or coalesce(v_output->>'type','') not in ('FINDING','DECISION','RISK','SPEC_DELTA','EXPERIMENT','CAPABILITY','OPEN_QUESTION')
       or nullif(btrim(v_output->>'ref'),'') is null
       or jsonb_typeof(v_output->'evidence_refs')<>'array' then
      return jsonb_build_object(
        'ok',false,'state','RETRY_SKILL_CONTRACT',
        'reason','INVALID_EXECUTION_OUTPUT','retryable',true
      );
    end if;
    v_normalized_outputs:=v_normalized_outputs||jsonb_build_array(
      jsonb_build_object(
        'type',v_output->>'type',
        'ref',v_output->>'ref',
        'evidence_refs',v_output->'evidence_refs'
      )
    );
  end loop;

  if v_status='COMPLETE' then
    for v_required in select value from jsonb_array_elements(v_contract->'required_operations')
    loop
      v_required_operation:=v_required#>>'{}';
      if not exists (
        select 1
        from jsonb_array_elements_text(v_operations) x(value)
        where x.value=v_required_operation
      ) then
        return jsonb_build_object(
          'ok',false,'state','RETRY_SKILL_CONTRACT',
          'reason','MISSING_REQUIRED_OPERATION',
          'required_operation',v_required_operation,'retryable',true
        );
      end if;
    end loop;

    for v_required in select value from jsonb_array_elements(v_contract->'required_outputs')
    loop
      v_required_type:=v_required->>'type';
      v_required_count:=(v_required->>'min_count')::integer;
      v_required_provenance:=coalesce((v_required->>'provenance_required')::boolean,true);

      select count(*) into v_actual_count
      from jsonb_array_elements(v_outputs) x(value)
      where x.value->>'type'=v_required_type;

      if v_actual_count<v_required_count then
        return jsonb_build_object(
          'ok',false,'state','RETRY_SKILL_CONTRACT',
          'reason','MISSING_REQUIRED_OUTPUT',
          'output_type',v_required_type,
          'required_count',v_required_count,
          'actual_count',v_actual_count,
          'retryable',true
        );
      end if;

      if v_required_provenance then
        select count(*) into v_evidence_count
        from jsonb_array_elements(v_outputs) x(value)
        where x.value->>'type'=v_required_type
          and jsonb_typeof(x.value->'evidence_refs')='array'
          and jsonb_array_length(x.value->'evidence_refs')>0;

        if v_evidence_count<v_required_count then
          return jsonb_build_object(
            'ok',false,'state','RETRY_SKILL_CONTRACT',
            'reason','MISSING_REQUIRED_EVIDENCE',
            'output_type',v_required_type,
            'required_count',v_required_count,
            'with_evidence',v_evidence_count,
            'retryable',true
          );
        end if;
      end if;
    end loop;
  else
    v_blocked_operations:=coalesce(v_exec->'blocked_operations','[]'::jsonb);
    if jsonb_typeof(v_blocked_operations)<>'array' then
      return jsonb_build_object('ok',false,'state','RETRY_SKILL_CONTRACT','reason','INVALID_BLOCKED_OPERATIONS','retryable',true);
    end if;

    if v_status='TOOL_ERROR' then
      v_tool_errors:=v_exec->'tool_errors';
      if jsonb_typeof(v_tool_errors)<>'array' or jsonb_array_length(v_tool_errors)<1 then
        return jsonb_build_object('ok',false,'state','RETRY_SKILL_CONTRACT','reason','TOOL_ERRORS_REQUIRED','retryable',true);
      end if;
    else
      v_tool_errors:=coalesce(v_exec->'tool_errors','[]'::jsonb);
      if jsonb_typeof(v_tool_errors)<>'array' then
        return jsonb_build_object('ok',false,'state','RETRY_SKILL_CONTRACT','reason','INVALID_TOOL_ERRORS','retryable',true);
      end if;
    end if;
  end if;

  v_receipt:=jsonb_build_object(
    'schema','prometeo.deep-skill-execution-receipt/v1',
    'skill_id',v_bundle->>'skill_id',
    'version_no',(v_bundle->>'version_no')::integer,
    'contract_schema',v_contract->>'schema',
    'status',v_status,
    'budget',jsonb_build_object(
      'min_words',v_min,
      'target_words',v_target,
      'max_words',v_max,
      'words_used',v_words,
      'max_tool_calls',v_max_tools,
      'tool_calls_used',v_tool_calls,
      'max_children',v_max_children,
      'children_created',v_children
    ),
    'operations_completed',v_operations,
    'outputs',v_normalized_outputs,
    'evidence_refs',v_evidence,
    'degradation',case
      when v_status='COMPLETE' then null
      else jsonb_build_object(
        'blocked_operations',coalesce(v_blocked_operations,'[]'::jsonb),
        'tool_errors',coalesce(v_tool_errors,'[]'::jsonb)
      )
    end
  );

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_PRE_PUBLISH_OK',
    'skill_id',v_bundle->>'skill_id',
    'version_no',v_bundle->'version_no',
    'receipt',v_receipt
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_pre_publish(p_agent_id text, p_lease_token text, p_output text, p_meta jsonb DEFAULT '{}'::jsonb, p_children jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_context jsonb;
begin
  select input_context into v_context
  from public.prometeo_jobs
  where lease_token=p_lease_token
    and assigned_agent_id=p_agent_id
    and status='LEASED'
    and lease_expires_at>clock_timestamp()
  limit 1;

  if not found then
    return jsonb_build_object('ok',true,'state','NO_ACTIVE_OWNED_JOB_BYPASS');
  end if;

  return public.forge_deep_skill_execution_validate(
    v_context->'skill_ref',
    p_output,
    p_meta,
    p_children
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.prometeo_publish_v1_core(p_agent_id text, p_lease_token text, p_output text, p_meta jsonb DEFAULT '{}'::jsonb, p_children jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v jsonb;
  v_gate jsonb;
  v_meta jsonb:=coalesce(p_meta,'{}'::jsonb);
begin
  v_gate:=public.forge_deep_skill_pre_publish(
    p_agent_id,p_lease_token,p_output,p_meta,p_children
  );

  if coalesce((v_gate->>'ok')::boolean,false) is not true then
    return public.prometeo_contract_response(
      p_agent_id,
      coalesce(v_gate,'{}'::jsonb)||jsonb_build_object('lease_token',p_lease_token)
    );
  end if;

  if v_gate->>'state'='DEEP_SKILL_PRE_PUBLISH_OK' then
    v_meta:=jsonb_set(v_meta,'{deep_skill_receipt}',v_gate->'receipt',true);
  end if;

  v:=public.prometeo_publish_core(
    p_agent_id,p_lease_token,p_output,v_meta,p_children
  );

  if v->>'state' in ('PUBLISHED_AND_STOPPED','STOPPED') then
    update public.prometeo_worker_sessions
    set final_state=v->>'state',closed_at=coalesce(closed_at,now()),last_seen_at=now()
    where agent_id=p_agent_id;
  elsif v->>'state'='PUBLISHED_AND_NEXT'
        and v->'next'->>'state'='WORK' then
    update public.prometeo_worker_sessions
    set consecutive_waits=0,last_seen_at=now()
    where agent_id=p_agent_id and protocol_version='OBEY-v2';
  end if;

  return public.prometeo_contract_response(p_agent_id,v);
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_contract_smoke_test()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_deep text:='__SMOKE_DEEP_CONTRACT__';
  v_legacy text:='__SMOKE_LEGACY_CONTRACT__';
  v_contract1 jsonb;
  v_contract2 jsonb;
  v_def jsonb;
  v_ref jsonb;
  v_legacy_ref jsonb;
  v_meta jsonb;
  v_valid jsonb;
  v_under jsonb;
  v_over jsonb;
  v_missing_output jsonb;
  v_missing_evidence jsonb;
  v_tool_error jsonb;
  v_no_skill jsonb;
  v_legacy_result jsonb;
  v_bad_order jsonb;
  v_hook boolean;
  v_v1_contract jsonb;
  v_v2_contract jsonb;
begin
  delete from public.forge_skills where skill_id in (v_deep,v_legacy);

  perform public.forge_skill_register(
    v_deep,'Smoke Deep Contract','temporary fixture',
    jsonb_build_object('source','forge_deep_skill_contract_smoke_test')
  );

  v_contract1:=jsonb_build_object(
    'schema','prometeo.deep-skill-contract/v1',
    'profile','ANALYZE',
    'budget',jsonb_build_object(
      'min_words',3,'target_words',4,'max_words',6,'max_tool_calls',2,'max_children',1
    ),
    'required_operations',jsonb_build_array('analyze'),
    'required_outputs',jsonb_build_array(
      jsonb_build_object('type','FINDING','min_count',1,'provenance_required',true)
    ),
    'stop_conditions',jsonb_build_array('done'),
    'failure_modes',jsonb_build_array('TOOL_ERROR'),
    'verification',jsonb_build_object('mode','receipt'),
    'degradation_policy',jsonb_build_object('allow',jsonb_build_array('TOOL_ERROR','PARTIAL','BLOCKED'))
  );
  v_contract2:=jsonb_set(v_contract1,'{budget,target_words}','5'::jsonb,true);

  v_def:=jsonb_build_object(
    'maturity_state','CANDIDATE',
    'inputs_schema',jsonb_build_object('type','object'),
    'outputs_schema',jsonb_build_object('type','object'),
    'procedure_steps',jsonb_build_array('analyze'),
    'rollback_contract',jsonb_build_object('mode','none'),
    'verification_contract',jsonb_build_object('mode','receipt'),
    'evidence_requirements',jsonb_build_array('evidence-ref'),
    'evidence',jsonb_build_array(),
    'execution_contract',v_contract1
  );
  perform public.forge_skill_add_version(v_deep,v_def,jsonb_build_object('source','smoke-v1'));

  v_def:=jsonb_set(v_def,'{execution_contract}',v_contract2,true);
  perform public.forge_skill_add_version(v_deep,v_def,jsonb_build_object('source','smoke-v2'));

  update public.forge_skill_versions
  set maturity_state=case when version_no=2 then 'ACCEPTED' else 'SUPERSEDED' end
  where skill_id=v_deep;

  select execution_contract into v_v1_contract
  from public.forge_skill_versions where skill_id=v_deep and version_no=1;
  select execution_contract into v_v2_contract
  from public.forge_skill_versions where skill_id=v_deep and version_no=2;

  if v_v1_contract->'budget'->>'target_words' <> '4'
     or v_v2_contract->'budget'->>'target_words' <> '5' then
    raise exception 'execution contract version history not preserved';
  end if;

  v_ref:=jsonb_build_object(
    'skill_id',v_deep,'version_no',2,
    'binding_source','JOB','binding_provenance','smoke'
  );

  v_meta:=jsonb_build_object(
    'deep_skill_execution',jsonb_build_object(
      'status','COMPLETE',
      'tool_calls_used',1,
      'operations_completed',jsonb_build_array('analyze'),
      'outputs',jsonb_build_array(
        jsonb_build_object(
          'type','FINDING','ref','finding:1','evidence_refs',jsonb_build_array('evidence:1')
        )
      ),
      'evidence_refs',jsonb_build_array('evidence:1')
    )
  );

  v_valid:=public.forge_deep_skill_execution_validate(v_ref,'one two three four',v_meta,'[]'::jsonb);
  if coalesce((v_valid->>'ok')::boolean,false) is not true
     or v_valid->'receipt'->>'contract_schema'<>'prometeo.deep-skill-contract/v1' then
    raise exception 'valid execution failed: %',v_valid;
  end if;

  v_under:=public.forge_deep_skill_execution_validate(v_ref,'one two',v_meta,'[]'::jsonb);
  if v_under->>'reason'<>'BELOW_CONTRACT_MIN_WORDS' then
    raise exception 'under-range case failed: %',v_under;
  end if;

  v_over:=public.forge_deep_skill_execution_validate(v_ref,'one two three four five six seven',v_meta,'[]'::jsonb);
  if v_over->>'reason'<>'ABOVE_CONTRACT_MAX_WORDS' then
    raise exception 'over-range case failed: %',v_over;
  end if;

  v_missing_output:=public.forge_deep_skill_execution_validate(
    v_ref,'one two three four',
    jsonb_build_object('deep_skill_execution',jsonb_build_object(
      'status','COMPLETE','tool_calls_used',0,
      'operations_completed',jsonb_build_array('analyze'),
      'outputs','[]'::jsonb,'evidence_refs','[]'::jsonb
    )),
    '[]'::jsonb
  );
  if v_missing_output->>'reason'<>'MISSING_REQUIRED_OUTPUT' then
    raise exception 'missing output case failed: %',v_missing_output;
  end if;

  v_missing_evidence:=public.forge_deep_skill_execution_validate(
    v_ref,'one two three four',
    jsonb_build_object('deep_skill_execution',jsonb_build_object(
      'status','COMPLETE','tool_calls_used',0,
      'operations_completed',jsonb_build_array('analyze'),
      'outputs',jsonb_build_array(
        jsonb_build_object('type','FINDING','ref','finding:2','evidence_refs','[]'::jsonb)
      ),
      'evidence_refs','[]'::jsonb
    )),
    '[]'::jsonb
  );
  if v_missing_evidence->>'reason'<>'MISSING_REQUIRED_EVIDENCE' then
    raise exception 'missing evidence case failed: %',v_missing_evidence;
  end if;

  v_tool_error:=public.forge_deep_skill_execution_validate(
    v_ref,'one two three four',
    jsonb_build_object('deep_skill_execution',jsonb_build_object(
      'status','TOOL_ERROR','tool_calls_used',1,
      'operations_completed','[]'::jsonb,
      'outputs','[]'::jsonb,
      'evidence_refs','[]'::jsonb,
      'blocked_operations',jsonb_build_array('analyze'),
      'tool_errors',jsonb_build_array(jsonb_build_object('tool','fixture','class','TOOL_ERROR'))
    )),
    '[]'::jsonb
  );
  if coalesce((v_tool_error->>'ok')::boolean,false) is not true
     or v_tool_error->'receipt'->>'status'<>'TOOL_ERROR' then
    raise exception 'tool error degradation failed: %',v_tool_error;
  end if;

  v_no_skill:=public.forge_deep_skill_execution_validate(null,'legacy output','{}'::jsonb,'[]'::jsonb);
  if v_no_skill->>'state'<>'NO_SKILL_REF_BYPASS' then
    raise exception 'no skill legacy bypass failed: %',v_no_skill;
  end if;

  perform public.forge_skill_register(
    v_legacy,'Smoke Legacy Skill','temporary legacy fixture',
    jsonb_build_object('source','forge_deep_skill_contract_smoke_test')
  );
  perform public.forge_skill_add_version(
    v_legacy,
    jsonb_build_object(
      'maturity_state','ACCEPTED',
      'inputs_schema',jsonb_build_object('type','object'),
      'outputs_schema',jsonb_build_object('type','object'),
      'procedure_steps',jsonb_build_array('legacy'),
      'rollback_contract',jsonb_build_object('mode','none'),
      'verification_contract',jsonb_build_object('mode','legacy'),
      'evidence_requirements','[]'::jsonb,
      'evidence','[]'::jsonb
    ),
    jsonb_build_object('source','legacy-smoke')
  );
  v_legacy_ref:=jsonb_build_object(
    'skill_id',v_legacy,'version_no',1,
    'binding_source','JOB','binding_provenance','smoke'
  );
  v_legacy_result:=public.forge_deep_skill_execution_validate(
    v_legacy_ref,'legacy output','{}'::jsonb,'[]'::jsonb
  );
  if v_legacy_result->>'state'<>'LEGACY_SKILL_CONTRACT_BYPASS' then
    raise exception 'legacy version bypass failed: %',v_legacy_result;
  end if;

  v_bad_order:=public.forge_deep_skill_contract_validate(
    jsonb_set(v_contract1,'{budget,target_words}','2'::jsonb,true)
  );
  if v_bad_order->>'reason'<>'INVALID_WORD_BUDGET_ORDER' then
    raise exception 'budget order validation failed: %',v_bad_order;
  end if;

  select position(
    'forge_deep_skill_pre_publish' in pg_get_functiondef(p.oid)
  )>0 into v_hook
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='prometeo_publish_v1_core'
  order by p.oid desc
  limit 1;

  if coalesce(v_hook,false) is not true then
    raise exception 'publish hook not installed';
  end if;

  delete from public.forge_skills where skill_id in (v_deep,v_legacy);

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_CONTRACT_SMOKE_OK',
    'contract_schema','prometeo.deep-skill-contract/v1',
    'receipt_schema','prometeo.deep-skill-execution-receipt/v1',
    'budget_order',true,
    'range_rejection',true,
    'required_outputs',true,
    'required_evidence',true,
    'tool_error_degradation',true,
    'version_history',true,
    'no_skill_legacy_bypass',true,
    'legacy_skill_bypass',true,
    'publish_hook_installed',v_hook,
    'fixtures_cleaned',not exists(
      select 1 from public.forge_skills where skill_id in (v_deep,v_legacy)
    )
  );
end
$function$;
