-- BACKLOG-225: evidence-driven Deep Skill evolution.
-- Evolution creates a CANDIDATE from an exact ACCEPTED baseline; it never auto-promotes.

create or replace function public.forge_skill_propose_evolution(
  p_skill_id text,
  p_baseline_version integer,
  p_delta jsonb,
  p_evidence jsonb,
  p_provenance jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_base public.forge_skill_versions%rowtype;
  v_definition jsonb;
  v_result jsonb;
  v_evidence_count integer;
begin
  if jsonb_typeof(coalesce(p_delta,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_EVOLUTION_DELTA');
  end if;
  if jsonb_typeof(coalesce(p_evidence,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_evidence,'[]'::jsonb)) = 0 then
    return jsonb_build_object('ok',false,'state','EVOLUTION_EVIDENCE_REQUIRED');
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_evidence) e
    where jsonb_typeof(e) <> 'object'
       or nullif(btrim(e->>'kind'),'') is null
       or nullif(btrim(e->>'ref'),'') is null
  ) then
    return jsonb_build_object('ok',false,'state','INVALID_EVOLUTION_EVIDENCE');
  end if;
  if jsonb_typeof(coalesce(p_provenance,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_PROVENANCE');
  end if;

  select * into v_base
  from public.forge_skill_versions
  where skill_id=nullif(btrim(p_skill_id),'')
    and version_no=p_baseline_version;

  if not found then
    return jsonb_build_object('ok',false,'state','BASELINE_VERSION_NOT_FOUND');
  end if;
  if v_base.maturity_state <> 'ACCEPTED' then
    return jsonb_build_object(
      'ok',false,'state','BASELINE_NOT_ACCEPTED',
      'maturity_state',v_base.maturity_state
    );
  end if;

  v_definition := jsonb_build_object(
    'maturity_state','CANDIDATE',
    'inputs_schema',coalesce(p_delta->'inputs_schema',v_base.inputs_schema),
    'outputs_schema',coalesce(p_delta->'outputs_schema',v_base.outputs_schema),
    'procedure_steps',coalesce(p_delta->'procedure_steps',v_base.procedure_steps),
    'rollback_contract',coalesce(p_delta->'rollback_contract',v_base.rollback_contract),
    'verification_contract',coalesce(p_delta->'verification_contract',v_base.verification_contract),
    'evidence_requirements',coalesce(p_delta->'evidence_requirements',v_base.evidence_requirements),
    'evidence',p_evidence
  );

  if v_definition->'inputs_schema' = v_base.inputs_schema
     and v_definition->'outputs_schema' = v_base.outputs_schema
     and v_definition->'procedure_steps' = v_base.procedure_steps
     and v_definition->'rollback_contract' = v_base.rollback_contract
     and v_definition->'verification_contract' = v_base.verification_contract
     and v_definition->'evidence_requirements' = v_base.evidence_requirements then
    return jsonb_build_object('ok',false,'state','NO_DEFINITION_CHANGE');
  end if;

  v_evidence_count := jsonb_array_length(p_evidence);
  v_result := public.forge_skill_add_version(
    p_skill_id,
    v_definition,
    coalesce(p_provenance,'{}'::jsonb) || jsonb_build_object(
      'evolution',jsonb_build_object(
        'source_key','BACKLOG-225',
        'baseline_version',p_baseline_version,
        'evidence_count',v_evidence_count,
        'proposed_at',clock_timestamp()
      )
    )
  );

  if coalesce(v_result->>'state','') <> 'SKILL_VERSION_CREATED' then
    return v_result;
  end if;

  return v_result || jsonb_build_object(
    'state','SKILL_EVOLUTION_CANDIDATE_CREATED',
    'baseline_version',p_baseline_version,
    'candidate_version',(v_result->>'version_no')::integer,
    'evidence_count',v_evidence_count,
    'auto_promoted',false
  );
end;
$$;

create or replace function public.forge_skill_evolution_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_skill text := '__B225_SMOKE__' || substr(md5(clock_timestamp()::text),1,10);
  v_reg jsonb;
  v_v1 jsonb;
  v_no_evidence jsonb;
  v_no_change jsonb;
  v_evolved jsonb;
  v_bundle jsonb;
  v_candidate public.forge_skill_versions%rowtype;
begin
  v_reg := public.forge_skill_register(
    v_skill,'B225 evolution smoke','temporary fixture',
    jsonb_build_object('source','forge_skill_evolution_smoke_test')
  );

  v_v1 := public.forge_skill_add_version(
    v_skill,
    jsonb_build_object(
      'maturity_state','ACCEPTED',
      'inputs_schema',jsonb_build_object('type','object'),
      'outputs_schema',jsonb_build_object('type','object'),
      'procedure_steps',jsonb_build_array('observe','act'),
      'rollback_contract',jsonb_build_object('mode','reversible'),
      'verification_contract',jsonb_build_object('check','baseline'),
      'evidence_requirements',jsonb_build_array('receipt'),
      'evidence',jsonb_build_array(jsonb_build_object('kind','fixture','ref','smoke://baseline'))
    ),
    jsonb_build_object('source','b225-smoke-v1')
  );

  v_no_evidence := public.forge_skill_propose_evolution(
    v_skill,1,
    jsonb_build_object('procedure_steps',jsonb_build_array('observe','verify','act')),
    '[]'::jsonb,
    '{}'::jsonb
  );

  v_no_change := public.forge_skill_propose_evolution(
    v_skill,1,
    '{}'::jsonb,
    jsonb_build_array(jsonb_build_object('kind','ACTION_TRACE','ref','smoke://trace-1')),
    '{}'::jsonb
  );

  v_evolved := public.forge_skill_propose_evolution(
    v_skill,1,
    jsonb_build_object(
      'procedure_steps',jsonb_build_array('observe','verify','act'),
      'verification_contract',jsonb_build_object('check','evidence-before-action')
    ),
    jsonb_build_array(
      jsonb_build_object('kind','ACTION_TRACE','ref','smoke://trace-1'),
      jsonb_build_object('kind','REGRESSION','ref','smoke://regression-1')
    ),
    jsonb_build_object('reason','smoke evidence-driven improvement')
  );

  select * into v_candidate
  from public.forge_skill_versions
  where skill_id=v_skill and version_no=2;

  v_bundle := public.forge_skill_execution_bundle(v_skill,2);

  if v_no_evidence->>'state' <> 'EVOLUTION_EVIDENCE_REQUIRED'
     or v_no_change->>'state' <> 'NO_DEFINITION_CHANGE'
     or v_evolved->>'state' <> 'SKILL_EVOLUTION_CANDIDATE_CREATED'
     or v_evolved->>'baseline_version' <> '1'
     or v_evolved->>'candidate_version' <> '2'
     or v_evolved->>'evidence_count' <> '2'
     or v_evolved->>'auto_promoted' <> 'false'
     or v_candidate.maturity_state <> 'CANDIDATE'
     or v_candidate.provenance->'evolution'->>'baseline_version' <> '1'
     or jsonb_array_length(v_candidate.evidence) <> 2
     or v_bundle->>'state' <> 'SKILL_NOT_EXECUTABLE'
     or v_bundle->>'reason' <> 'VERSION_NOT_ACCEPTED'
  then
    raise exception 'B225 evolution smoke failed';
  end if;

  delete from public.forge_skill_versions where skill_id=v_skill;
  delete from public.forge_skills where skill_id=v_skill;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_EVOLUTION_SMOKE_OK',
    'evidence_required','PASS',
    'no_change_rejected','PASS',
    'exact_baseline','PASS',
    'candidate_created','PASS',
    'candidate_not_executable','PASS',
    'auto_promoted',false,
    'fixture_cleaned',not exists(select 1 from public.forge_skills where skill_id=v_skill)
  );
exception
  when others then
    delete from public.forge_skill_versions where skill_id=v_skill;
    delete from public.forge_skills where skill_id=v_skill;
    raise;
end;
$$;
