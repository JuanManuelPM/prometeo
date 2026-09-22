-- BACKLOG-229: every persisted Skill version must carry explicit evidence
-- requirements and concrete evidence. Enforce both through the public creator and
-- table constraints so direct writes cannot silently bypass the invariant.

create or replace function public.forge_skill_evidence_contract_validate(
  p_definition jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $$
declare
  v_definition jsonb := coalesce(p_definition,'{}'::jsonb);
  v_requirements jsonb;
  v_evidence jsonb;
begin
  if jsonb_typeof(v_definition) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_DEFINITION');
  end if;

  v_requirements := coalesce(v_definition->'evidence_requirements','[]'::jsonb);
  v_evidence := coalesce(v_definition->'evidence','[]'::jsonb);

  if jsonb_typeof(v_requirements) <> 'array' then
    return jsonb_build_object('ok',false,'state','INVALID_EVIDENCE_REQUIREMENTS');
  end if;
  if jsonb_array_length(v_requirements)=0 then
    return jsonb_build_object('ok',false,'state','EVIDENCE_REQUIREMENTS_REQUIRED');
  end if;

  if jsonb_typeof(v_evidence) <> 'array' then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_EVIDENCE');
  end if;
  if jsonb_array_length(v_evidence)=0 then
    return jsonb_build_object('ok',false,'state','SKILL_EVIDENCE_REQUIRED');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_EVIDENCE_CONTRACT_VALID',
    'requirement_count',jsonb_array_length(v_requirements),
    'evidence_count',jsonb_array_length(v_evidence)
  );
end;
$$;

create or replace function public.forge_skill_add_version(
  p_skill_id text,
  p_definition jsonb,
  p_provenance jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_skill public.forge_skills%rowtype;
  v_version integer;
  v_maturity text;
  v_execution_contract jsonb;
  v_contract_check jsonb;
  v_evidence_check jsonb;
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

  v_evidence_check := public.forge_skill_evidence_contract_validate(p_definition);
  if coalesce((v_evidence_check->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,
      'state','INVALID_EVIDENCE_CONTRACT',
      'validation',v_evidence_check
    );
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
    p_definition->'evidence_requirements',
    p_definition->'evidence',
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
    'execution_contract_schema',v_execution_contract->>'schema',
    'evidence_contract',v_evidence_check
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok',false,'state','ACCEPTED_VERSION_CONFLICT',
      'skill_id',nullif(btrim(p_skill_id),'')
    );
end;
$$;

alter table public.forge_skill_versions
  drop constraint if exists forge_skill_versions_evidence_nonempty;
alter table public.forge_skill_versions
  add constraint forge_skill_versions_evidence_nonempty
  check (jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)>0)
  not valid;
alter table public.forge_skill_versions
  validate constraint forge_skill_versions_evidence_nonempty;

alter table public.forge_skill_versions
  drop constraint if exists forge_skill_versions_evidence_requirements_nonempty;
alter table public.forge_skill_versions
  add constraint forge_skill_versions_evidence_requirements_nonempty
  check (jsonb_typeof(evidence_requirements)='array' and jsonb_array_length(evidence_requirements)>0)
  not valid;
alter table public.forge_skill_versions
  validate constraint forge_skill_versions_evidence_requirements_nonempty;

create or replace function public.forge_skill_evidence_invariant_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_good jsonb;
  v_no_requirements jsonb;
  v_no_evidence jsonb;
  v_good_check jsonb;
  v_req_check jsonb;
  v_evidence_check jsonb;
  v_violations integer;
begin
  v_good := jsonb_build_object(
    'evidence_requirements',jsonb_build_array('deterministic verification receipt'),
    'evidence',jsonb_build_array('receipt://verified')
  );
  v_no_requirements := jsonb_set(v_good,'{evidence_requirements}','[]'::jsonb);
  v_no_evidence := jsonb_set(v_good,'{evidence}','[]'::jsonb);

  v_good_check := public.forge_skill_evidence_contract_validate(v_good);
  v_req_check := public.forge_skill_evidence_contract_validate(v_no_requirements);
  v_evidence_check := public.forge_skill_evidence_contract_validate(v_no_evidence);

  select count(*) into v_violations
  from public.forge_skill_versions
  where jsonb_typeof(evidence_requirements)<>'array'
     or jsonb_array_length(evidence_requirements)=0
     or jsonb_typeof(evidence)<>'array'
     or jsonb_array_length(evidence)=0;

  if v_good_check->>'state' <> 'SKILL_EVIDENCE_CONTRACT_VALID'
     or v_req_check->>'state' <> 'EVIDENCE_REQUIREMENTS_REQUIRED'
     or v_evidence_check->>'state' <> 'SKILL_EVIDENCE_REQUIRED'
     or v_violations <> 0
  then
    raise exception 'BACKLOG-229 skill evidence invariant smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_EVIDENCE_INVARIANT_SMOKE_OK',
    'validator_accepts_evidence','PASS',
    'missing_requirements_rejected','PASS',
    'missing_evidence_rejected','PASS',
    'persisted_violations',v_violations,
    'version_count',(select count(*) from public.forge_skill_versions)
  );
end;
$$;

select public.forge_skill_evidence_invariant_smoke_test();
