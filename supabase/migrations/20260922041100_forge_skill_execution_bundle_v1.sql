-- BACKLOG-199: version-pinned Skill references outside long prompts.

create or replace function public.forge_skill_ref_validate(
  p_skill_ref jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $$
declare
  v_ref jsonb := coalesce(p_skill_ref,'{}'::jsonb);
  v_version numeric;
  v_source text;
begin
  if jsonb_typeof(v_ref) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','REF_NOT_OBJECT');
  end if;
  if nullif(btrim(v_ref->>'skill_id'),'') is null then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','SKILL_ID_REQUIRED');
  end if;
  if not (v_ref ? 'version_no') or jsonb_typeof(v_ref->'version_no') <> 'number' then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','EXACT_VERSION_REQUIRED');
  end if;
  begin
    v_version := (v_ref->>'version_no')::numeric;
  exception when others then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','INVALID_VERSION');
  end;
  if v_version <= 0 or v_version <> trunc(v_version) then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','INVALID_VERSION');
  end if;
  v_source := upper(coalesce(nullif(btrim(v_ref->>'binding_source'),''),''));
  if v_source not in ('JOB','SCHEDULER','HUMAN','COMPILER') then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','BINDING_SOURCE_REQUIRED');
  end if;
  if nullif(btrim(v_ref->>'binding_provenance'),'') is null then
    return jsonb_build_object('ok',false,'state','INVALID_SKILL_REF','reason','BINDING_PROVENANCE_REQUIRED');
  end if;
  return jsonb_build_object(
    'ok',true,
    'state','SKILL_REF_VALID',
    'skill_id',btrim(v_ref->>'skill_id'),
    'version_no',v_version::integer,
    'binding_source',v_source,
    'binding_provenance',btrim(v_ref->>'binding_provenance')
  );
end;
$$;

create or replace function public.forge_skill_definition_hash(
  p_skill_id text,
  p_version_no integer
) returns text
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
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
      'provenance',v.provenance
    )::text
  )
  from public.forge_skill_versions v
  where v.skill_id=p_skill_id and v.version_no=p_version_no;
$$;

create or replace function public.forge_skill_execution_bundle(
  p_skill_id text,
  p_version_no integer
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
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
  where skill_id=v_skill.skill_id and version_no=p_version_no;
  if not found then
    return jsonb_build_object(
      'ok',false,'state','SKILL_VERSION_NOT_FOUND',
      'skill_id',v_skill.skill_id,'version_no',p_version_no
    );
  end if;

  if v_skill.registry_status <> 'ACTIVE' then
    return jsonb_build_object(
      'ok',false,'state','SKILL_NOT_EXECUTABLE',
      'reason','SKILL_RETIRED',
      'skill_id',v_skill.skill_id,'version_no',v_version.version_no
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
    'provenance',v_version.provenance,
    'authority_granted',false
  );
end;
$$;

create or replace function public.forge_skill_execution_bundle_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_skill text := '__B199_SMOKE__' || substr(md5(clock_timestamp()::text),1,10);
  v_ref_ok jsonb;
  v_ref_missing_version jsonb;
  v_reg jsonb;
  v_v1 jsonb;
  v_v2 jsonb;
  v_bundle1 jsonb;
  v_bundle1_repeat jsonb;
  v_missing jsonb;
  v_candidate jsonb;
  v_retired jsonb;
  v_hash1 text;
  v_hash1_repeat text;
  v_hash2 text;
begin
  v_ref_ok := public.forge_skill_ref_validate(jsonb_build_object(
    'skill_id',v_skill,'version_no',1,'binding_source','JOB',
    'binding_provenance','smoke://b199'
  ));
  v_ref_missing_version := public.forge_skill_ref_validate(jsonb_build_object(
    'skill_id',v_skill,'binding_source','JOB','binding_provenance','smoke://b199'
  ));

  v_reg := public.forge_skill_register(
    v_skill,'B199 Smoke Skill','temporary execution bundle fixture',
    jsonb_build_object('source','forge_skill_execution_bundle_smoke_test')
  );

  v_v1 := public.forge_skill_add_version(
    v_skill,
    jsonb_build_object(
      'maturity_state','ACCEPTED',
      'inputs_schema',jsonb_build_object('type','object','required',jsonb_build_array('x')),
      'outputs_schema',jsonb_build_object('type','object'),
      'procedure_steps',jsonb_build_array('read x','return x'),
      'rollback_contract',jsonb_build_object('mode','none'),
      'verification_contract',jsonb_build_object('assert','echo'),
      'evidence_requirements',jsonb_build_array('receipt'),
      'evidence',jsonb_build_array()
    ),
    jsonb_build_object('source','b199-smoke-v1')
  );

  v_bundle1 := public.forge_skill_execution_bundle(v_skill,1);
  v_bundle1_repeat := public.forge_skill_execution_bundle(v_skill,1);
  v_missing := public.forge_skill_execution_bundle(v_skill,99);
  v_hash1 := public.forge_skill_definition_hash(v_skill,1);
  v_hash1_repeat := public.forge_skill_definition_hash(v_skill,1);

  v_v2 := public.forge_skill_add_version(
    v_skill,
    jsonb_build_object(
      'maturity_state','CANDIDATE',
      'inputs_schema',jsonb_build_object('type','object','required',jsonb_build_array('x')),
      'outputs_schema',jsonb_build_object('type','object'),
      'procedure_steps',jsonb_build_array('read x','normalize x','return x'),
      'rollback_contract',jsonb_build_object('mode','none'),
      'verification_contract',jsonb_build_object('assert','echo-v2'),
      'evidence_requirements',jsonb_build_array('receipt'),
      'evidence',jsonb_build_array()
    ),
    jsonb_build_object('source','b199-smoke-v2')
  );

  v_hash2 := public.forge_skill_definition_hash(v_skill,2);
  v_candidate := public.forge_skill_execution_bundle(v_skill,2);

  update public.forge_skills
  set registry_status='RETIRED',updated_at=now()
  where skill_id=v_skill;
  v_retired := public.forge_skill_execution_bundle(v_skill,1);

  if v_ref_ok->>'state' <> 'SKILL_REF_VALID'
     or v_ref_missing_version->>'reason' <> 'EXACT_VERSION_REQUIRED'
     or v_bundle1->>'state' <> 'SKILL_EXECUTION_BUNDLE'
     or v_bundle1->>'version_no' <> '1'
     or v_bundle1->>'authority_granted' <> 'false'
     or v_bundle1->>'definition_hash' <> v_bundle1_repeat->>'definition_hash'
     or v_hash1 is distinct from v_hash1_repeat
     or v_hash1 = v_hash2
     or v_missing->>'state' <> 'SKILL_VERSION_NOT_FOUND'
     or v_candidate->>'state' <> 'SKILL_NOT_EXECUTABLE'
     or v_candidate->>'reason' <> 'VERSION_NOT_ACCEPTED'
     or v_retired->>'state' <> 'SKILL_NOT_EXECUTABLE'
     or v_retired->>'reason' <> 'SKILL_RETIRED'
  then
    raise exception 'B199 execution bundle smoke failed';
  end if;

  delete from public.forge_skills where skill_id=v_skill;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_EXECUTION_BUNDLE_SMOKE_OK',
    'skill_ref_shape','PASS',
    'exact_version','PASS',
    'missing_version_no_fallback','PASS',
    'candidate_rejected','PASS',
    'retired_rejected','PASS',
    'stable_hash','PASS',
    'version_hash_differs','PASS',
    'authority_granted',false,
    'fixture_cleaned',not exists(
      select 1 from public.forge_skills where skill_id=v_skill
    )
  );
exception
  when others then
    delete from public.forge_skills where skill_id=v_skill;
    raise;
end;
$$;
