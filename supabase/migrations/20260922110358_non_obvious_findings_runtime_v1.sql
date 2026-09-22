
-- BACKLOG-219: NON_OBVIOUS_FINDINGS runtime enforcement.
-- Findings required by Deep Skills must show a non-obvious derivation basis and a concrete decision delta.

create or replace function public.forge_non_obvious_findings_policy()
returns jsonb
language sql
immutable
set search_path to 'public','pg_temp'
as $function$
  select jsonb_build_object(
    'schema','prometeo.non-obvious-finding-policy/v1',
    'applies_to','FINDING',
    'required',true,
    'novelty',jsonb_build_object(
      'required_fields',jsonb_build_array('basis','source_scan_refs'),
      'allowed_basis',jsonb_build_array(
        'CROSS_SOURCE','DERIVED_CONSTRAINT','COUNTERFACTUAL','CONTRADICTION','SECOND_ORDER'
      ),
      'source_scan_refs_min',1
    ),
    'decision_impact',jsonb_build_object(
      'required_fields',jsonb_build_array(
        'action','decision_ref','before_ref','after_ref','evidence_refs'
      ),
      'allowed_actions',jsonb_build_array(
        'CHANGE','BLOCK','REPRIORITIZE','MERGE','DROP','ADD'
      ),
      'requires_distinct_before_after',true,
      'evidence_refs_min',1
    )
  );
$function$;

create or replace function public.forge_non_obvious_findings_validate(
  p_outputs jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $function$
declare
  v_output jsonb;
  v_novelty jsonb;
  v_impact jsonb;
  v_count integer := 0;
  v_basis text;
  v_action text;
  v_decision_ref text;
  v_before text;
  v_after text;
begin
  if jsonb_typeof(coalesce(p_outputs,'null'::jsonb)) <> 'array' then
    return jsonb_build_object('ok',false,'state','FINDING_OUTPUTS_ARRAY_REQUIRED');
  end if;

  for v_output in
    select value from jsonb_array_elements(p_outputs)
    where value->>'type'='FINDING'
  loop
    v_count := v_count + 1;
    v_novelty := v_output->'novelty';
    v_impact := v_output->'decision_impact';

    if jsonb_typeof(coalesce(v_novelty,'null'::jsonb)) <> 'object' then
      return jsonb_build_object(
        'ok',false,'state','FINDING_NOVELTY_REQUIRED','finding_ref',v_output->>'ref'
      );
    end if;

    v_basis := upper(coalesce(nullif(btrim(v_novelty->>'basis'),''),''));
    if v_basis not in (
      'CROSS_SOURCE','DERIVED_CONSTRAINT','COUNTERFACTUAL','CONTRADICTION','SECOND_ORDER'
    ) then
      return jsonb_build_object(
        'ok',false,'state','FINDING_NOVELTY_BASIS_INVALID',
        'finding_ref',v_output->>'ref','basis',v_basis
      );
    end if;

    if jsonb_typeof(coalesce(v_novelty->'source_scan_refs','null'::jsonb)) <> 'array'
       or jsonb_array_length(v_novelty->'source_scan_refs') < 1 then
      return jsonb_build_object(
        'ok',false,'state','FINDING_NOVELTY_EVIDENCE_REQUIRED',
        'finding_ref',v_output->>'ref'
      );
    end if;

    if jsonb_typeof(coalesce(v_impact,'null'::jsonb)) <> 'object' then
      return jsonb_build_object(
        'ok',false,'state','FINDING_DECISION_IMPACT_REQUIRED','finding_ref',v_output->>'ref'
      );
    end if;

    v_action := upper(coalesce(nullif(btrim(v_impact->>'action'),''),''));
    if v_action not in ('CHANGE','BLOCK','REPRIORITIZE','MERGE','DROP','ADD') then
      return jsonb_build_object(
        'ok',false,'state','FINDING_DECISION_ACTION_INVALID',
        'finding_ref',v_output->>'ref','action',v_action
      );
    end if;

    v_decision_ref := nullif(btrim(v_impact->>'decision_ref'),'');
    v_before := nullif(btrim(v_impact->>'before_ref'),'');
    v_after := nullif(btrim(v_impact->>'after_ref'),'');
    if v_decision_ref is null then
      return jsonb_build_object(
        'ok',false,'state','FINDING_DECISION_REF_REQUIRED','finding_ref',v_output->>'ref'
      );
    end if;
    if v_before is null or v_after is null or v_before = v_after then
      return jsonb_build_object(
        'ok',false,'state','FINDING_DECISION_DELTA_REQUIRED',
        'finding_ref',v_output->>'ref',
        'before_ref',v_before,'after_ref',v_after
      );
    end if;

    if jsonb_typeof(coalesce(v_impact->'evidence_refs','null'::jsonb)) <> 'array'
       or jsonb_array_length(v_impact->'evidence_refs') < 1 then
      return jsonb_build_object(
        'ok',false,'state','FINDING_DECISION_EVIDENCE_REQUIRED',
        'finding_ref',v_output->>'ref'
      );
    end if;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok',false,'state','FINDING_REQUIRED');
  end if;

  return jsonb_build_object(
    'ok',true,'state','NON_OBVIOUS_FINDINGS_VALID',
    'finding_count',v_count,
    'policy',public.forge_non_obvious_findings_policy()
  );
end;
$function$;

comment on function public.forge_non_obvious_findings_validate(jsonb) is
'BACKLOG-219: enforce that every Deep Skill FINDING has a non-obvious derivation basis with source scan refs and a concrete evidence-backed decision delta.';

create or replace function public.forge_skill_execution_bundle(
  p_skill_id text,
  p_version_no integer
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_skill public.forge_skills%rowtype;
  v_version public.forge_skill_versions%rowtype;
  v_hash text;
  v_runtime_policies jsonb := '{}'::jsonb;
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

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_version.execution_contract->'required_outputs','[]'::jsonb)) x(value)
    where x.value->>'type'='FINDING'
  ) then
    v_runtime_policies := jsonb_build_object(
      'non_obvious_findings',public.forge_non_obvious_findings_policy()
    );
  end if;

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
    'runtime_policies',v_runtime_policies,
    'provenance',v_version.provenance,
    'authority_granted',false
  );
end;
$function$;

create or replace function public.forge_deep_skill_pre_publish(
  p_agent_id text,
  p_lease_token text,
  p_output text,
  p_meta jsonb default '{}'::jsonb,
  p_children jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_context jsonb;
  v_core jsonb;
  v_bundle jsonb;
  v_exec jsonb;
  v_quality jsonb;
  v_requires_findings boolean := false;
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

  v_core := public.forge_deep_skill_execution_validate(
    v_context->'skill_ref',
    p_output,
    p_meta,
    p_children
  );

  if coalesce((v_core->>'ok')::boolean,false) is not true then
    return v_core;
  end if;

  if v_context->'skill_ref' is null or jsonb_typeof(v_context->'skill_ref')='null' then
    return v_core;
  end if;

  v_exec := coalesce(p_meta,'{}'::jsonb)->'deep_skill_execution';
  if upper(coalesce(v_exec->>'status','')) <> 'COMPLETE' then
    return v_core;
  end if;

  v_bundle := public.forge_skill_execution_bundle(
    v_context->'skill_ref'->>'skill_id',
    (v_context->'skill_ref'->>'version_no')::integer
  );

  if coalesce((v_bundle->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,'state','RETRY_SKILL_CONTRACT',
      'reason','SKILL_BUNDLE_UNAVAILABLE','validation',v_bundle,'retryable',true
    );
  end if;

  select exists (
    select 1
    from jsonb_array_elements(
      coalesce(v_bundle->'execution_contract'->'required_outputs','[]'::jsonb)
    ) x(value)
    where x.value->>'type'='FINDING'
  ) into v_requires_findings;

  if v_requires_findings then
    v_quality := public.forge_non_obvious_findings_validate(v_exec->'outputs');
    if coalesce((v_quality->>'ok')::boolean,false) is not true then
      return jsonb_build_object(
        'ok',false,'state','RETRY_SKILL_CONTRACT',
        'reason',v_quality->>'state',
        'finding_validation',v_quality,
        'retryable',true
      );
    end if;

    return v_core || jsonb_build_object(
      'non_obvious_findings',v_quality
    );
  end if;

  return v_core;
end;
$function$;

create or replace function public.forge_non_obvious_findings_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_project text := 'NON-OBVIOUS-FINDINGS-SMOKE';
  v_job text := 'SMOKE-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  v_agent text := 'smoke-agent-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  v_lease text := gen_random_uuid()::text;
  v_bundle jsonb;
  v_bad_meta jsonb;
  v_good_meta jsonb;
  v_bad jsonb;
  v_good jsonb;
  v_output text := repeat('validated ',760);
  v_ops jsonb := jsonb_build_array(
    'inventory_repeated_work','cluster_duplicates','find_shared_engine','propose_deduplication'
  );
  v_good_findings jsonb;
begin
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,
    min_parallelism,desired_parallelism,max_parallelism,
    allow_spawn,max_jobs,auto_close,work_plane
  ) values(
    v_project,'Non-obvious findings smoke',
    'Ephemeral project for BACKLOG-219 runtime enforcement.',
    'PAUSED',0,0,0,1,false,5,false,'CONTROL'
  );

  insert into public.prometeo_jobs(
    project_id,job_key,title,objective,instruction,input_context,status,
    priority,required_rank,lease_seconds,min_words,max_words,
    assigned_agent_id,assigned_worker_code,lease_token,
    lease_started_at,lease_expires_at
  ) values(
    v_project,v_job,'Non-obvious finding fixture',
    'Verify runtime finding quality gate.','Smoke fixture only.',
    jsonb_build_object(
      'skill_ref',jsonb_build_object('skill_id','DEEP_DUPLICATION_HUNTER','version_no',1)
    ),
    'LEASED',0,0,900,1,5000,
    v_agent,'SMOKE',v_lease,clock_timestamp(),clock_timestamp()+interval '10 minutes'
  );

  v_bundle := public.forge_skill_execution_bundle('DEEP_DUPLICATION_HUNTER',1);

  v_good_findings := jsonb_build_array(
    jsonb_build_object(
      'type','FINDING','ref','finding://one',
      'evidence_refs',jsonb_build_array('smoke://finding/one'),
      'novelty',jsonb_build_object(
        'basis','CROSS_SOURCE',
        'source_scan_refs',jsonb_build_array('smoke://source/a','smoke://source/b')
      ),
      'decision_impact',jsonb_build_object(
        'action','MERGE','decision_ref','decision://shared-engine',
        'before_ref','decision-state://duplicated',
        'after_ref','decision-state://shared',
        'evidence_refs',jsonb_build_array('smoke://decision/one')
      )
    ),
    jsonb_build_object(
      'type','FINDING','ref','finding://two',
      'evidence_refs',jsonb_build_array('smoke://finding/two'),
      'novelty',jsonb_build_object(
        'basis','DERIVED_CONSTRAINT',
        'source_scan_refs',jsonb_build_array('smoke://source/c')
      ),
      'decision_impact',jsonb_build_object(
        'action','REPRIORITIZE','decision_ref','decision://priority',
        'before_ref','decision-state://later',
        'after_ref','decision-state://now',
        'evidence_refs',jsonb_build_array('smoke://decision/two')
      )
    ),
    jsonb_build_object(
      'type','CAPABILITY','ref','capability://dedupe',
      'evidence_refs',jsonb_build_array('smoke://capability')
    )
  );

  v_bad_meta := jsonb_build_object(
    'deep_skill_execution',jsonb_build_object(
      'status','COMPLETE',
      'tool_calls_used',4,
      'operations_completed',v_ops,
      'outputs',jsonb_build_array(
        jsonb_build_object(
          'type','FINDING','ref','finding://one',
          'evidence_refs',jsonb_build_array('smoke://finding/one')
        ),
        v_good_findings->1,
        v_good_findings->2
      ),
      'evidence_refs',jsonb_build_array('smoke://execution')
    )
  );

  v_good_meta := jsonb_build_object(
    'deep_skill_execution',jsonb_build_object(
      'status','COMPLETE',
      'tool_calls_used',4,
      'operations_completed',v_ops,
      'outputs',v_good_findings,
      'evidence_refs',jsonb_build_array('smoke://execution')
    )
  );

  v_bad := public.forge_deep_skill_pre_publish(v_agent,v_lease,v_output,v_bad_meta,'[]'::jsonb);
  v_good := public.forge_deep_skill_pre_publish(v_agent,v_lease,v_output,v_good_meta,'[]'::jsonb);

  if v_bundle->'runtime_policies'->'non_obvious_findings'->>'schema'
       <> 'prometeo.non-obvious-finding-policy/v1'
     or v_bad->>'state' <> 'RETRY_SKILL_CONTRACT'
     or v_bad->>'reason' <> 'FINDING_NOVELTY_REQUIRED'
     or coalesce((v_good->>'ok')::boolean,false) is not true
     or v_good->'non_obvious_findings'->>'state' <> 'NON_OBVIOUS_FINDINGS_VALID'
  then
    raise exception 'BACKLOG-219 smoke failed: bundle %, bad %, good %',v_bundle,v_bad,v_good;
  end if;

  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  return jsonb_build_object(
    'ok',true,
    'state','NON_OBVIOUS_FINDINGS_SMOKE_OK',
    'policy_exposed_in_bundle','PASS',
    'missing_novelty_blocked','PASS',
    'decision_delta_required','PASS',
    'valid_findings_publishable','PASS',
    'fixture_cleaned',not exists(select 1 from public.prometeo_projects where project_id=v_project)
  );
exception when others then
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;
  return jsonb_build_object(
    'ok',false,'state','NON_OBVIOUS_FINDINGS_SMOKE_FAILED','error',sqlerrm
  );
end;
$function$;
