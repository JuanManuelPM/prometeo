-- BACKLOG-250: turn evidenced learning into durable Skill candidates.
-- This bridge deliberately stops at CANDIDATE; review/promotion remains a separate authority gate.

create or replace function public.forge_skill_candidate_from_learning(
  p_learning jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_learning jsonb := coalesce(p_learning,'{}'::jsonb);
  v_skill_id text;
  v_name text;
  v_purpose text;
  v_learning_ref text;
  v_provenance jsonb;
  v_reg jsonb;
  v_ver jsonb;
  v_existing_version integer;
  v_existing_state text;
begin
  if jsonb_typeof(v_learning) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_LEARNING','reason','LEARNING_NOT_OBJECT');
  end if;

  v_skill_id := nullif(btrim(v_learning->>'skill_id'),'');
  v_name := nullif(btrim(v_learning->>'name'),'');
  v_purpose := coalesce(v_learning->>'purpose','');
  v_learning_ref := nullif(btrim(v_learning->>'learning_ref'),'');

  if v_skill_id is null or v_name is null or v_learning_ref is null then
    return jsonb_build_object('ok',false,'state','INVALID_LEARNING','reason','IDENTITY_REQUIRED');
  end if;

  if jsonb_typeof(coalesce(v_learning->'inputs_schema','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(v_learning->'outputs_schema','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(v_learning->'procedure_steps','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_learning->'rollback_contract','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(v_learning->'verification_contract','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(v_learning->'evidence_requirements','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_learning->'evidence','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_learning->'provenance','{}'::jsonb)) <> 'object'
  then
    return jsonb_build_object('ok',false,'state','INVALID_LEARNING','reason','INVALID_SHAPE');
  end if;

  if jsonb_array_length(coalesce(v_learning->'procedure_steps','[]'::jsonb)) = 0 then
    return jsonb_build_object('ok',false,'state','INVALID_LEARNING','reason','PROCEDURE_REQUIRED');
  end if;

  if jsonb_array_length(coalesce(v_learning->'evidence','[]'::jsonb)) = 0 then
    return jsonb_build_object('ok',false,'state','INVALID_LEARNING','reason','EVIDENCE_REQUIRED');
  end if;

  select version_no, maturity_state
    into v_existing_version, v_existing_state
  from public.forge_skill_versions
  where skill_id=v_skill_id
    and provenance->>'learning_ref'=v_learning_ref
  order by version_no desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok',true,
      'state','SKILL_CANDIDATE_ALREADY_EXISTS',
      'skill_id',v_skill_id,
      'version_no',v_existing_version,
      'maturity_state',v_existing_state,
      'learning_ref',v_learning_ref
    );
  end if;

  v_provenance :=
    coalesce(v_learning->'provenance','{}'::jsonb)
    || jsonb_build_object(
      'source','LEARNING',
      'learning_ref',v_learning_ref,
      'compiler','forge_skill_candidate_from_learning'
    );

  v_reg := public.forge_skill_register(
    v_skill_id,
    v_name,
    v_purpose,
    v_provenance
  );

  if coalesce((v_reg->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,
      'state','SKILL_REGISTER_FAILED',
      'skill_id',v_skill_id,
      'registry_result',v_reg
    );
  end if;

  v_ver := public.forge_skill_add_version(
    v_skill_id,
    jsonb_build_object(
      'maturity_state','CANDIDATE',
      'inputs_schema',coalesce(v_learning->'inputs_schema','{}'::jsonb),
      'outputs_schema',coalesce(v_learning->'outputs_schema','{}'::jsonb),
      'procedure_steps',coalesce(v_learning->'procedure_steps','[]'::jsonb),
      'rollback_contract',coalesce(v_learning->'rollback_contract','{}'::jsonb),
      'verification_contract',coalesce(v_learning->'verification_contract','{}'::jsonb),
      'evidence_requirements',coalesce(v_learning->'evidence_requirements','[]'::jsonb),
      'evidence',coalesce(v_learning->'evidence','[]'::jsonb)
    ),
    v_provenance
  );

  if coalesce((v_ver->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,
      'state','SKILL_VERSION_FAILED',
      'skill_id',v_skill_id,
      'registry_result',v_reg,
      'version_result',v_ver
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_CANDIDATE_CREATED',
    'skill_id',v_skill_id,
    'version_no',(v_ver->>'version_no')::integer,
    'maturity_state','CANDIDATE',
    'learning_ref',v_learning_ref
  );
end;
$$;

create or replace function public.forge_skill_candidate_from_learning_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_skill text := '__LEARNING_SKILL_SMOKE__' || substr(md5(clock_timestamp()::text),1,10);
  v_learning jsonb;
  v_first jsonb;
  v_repeat jsonb;
  v_version integer;
  v_state text;
  v_ref text;
begin
  v_learning := jsonb_build_object(
    'learning_ref','smoke://learning/250',
    'skill_id',v_skill,
    'name','Learning Bridge Smoke',
    'purpose','temporary candidate generated from evidenced learning',
    'inputs_schema',jsonb_build_object('type','object'),
    'outputs_schema',jsonb_build_object('type','object'),
    'procedure_steps',jsonb_build_array('observe','apply','verify'),
    'rollback_contract',jsonb_build_object('mode','delete-fixture'),
    'verification_contract',jsonb_build_object('assert','candidate-persisted'),
    'evidence_requirements',jsonb_build_array('receipt'),
    'evidence',jsonb_build_array('evidence://learning-smoke'),
    'provenance',jsonb_build_object('source_job','BACKLOG-250')
  );

  v_first := public.forge_skill_candidate_from_learning(v_learning);
  v_repeat := public.forge_skill_candidate_from_learning(v_learning);

  select version_no, maturity_state, provenance->>'learning_ref'
    into v_version, v_state, v_ref
  from public.forge_skill_versions
  where skill_id=v_skill
  order by version_no desc
  limit 1;

  if v_first->>'state' <> 'SKILL_CANDIDATE_CREATED'
     or v_repeat->>'state' <> 'SKILL_CANDIDATE_ALREADY_EXISTS'
     or v_first->>'version_no' <> v_repeat->>'version_no'
     or v_version::text <> v_first->>'version_no'
     or v_state <> 'CANDIDATE'
     or v_ref <> 'smoke://learning/250'
  then
    raise exception 'learning -> Skill candidate smoke failed';
  end if;

  delete from public.forge_skills where skill_id=v_skill;

  return jsonb_build_object(
    'ok',true,
    'state','LEARNING_TO_SKILL_CANDIDATE_SMOKE_OK',
    'created','PASS',
    'dedupe','PASS',
    'candidate_gate','PASS',
    'provenance','PASS',
    'fixture_cleaned',not exists(select 1 from public.forge_skills where skill_id=v_skill)
  );
exception
  when others then
    delete from public.forge_skills where skill_id=v_skill;
    raise;
end;
$$;

comment on function public.forge_skill_candidate_from_learning(jsonb) is
'BACKLOG-250: converts evidenced learning into a durable CANDIDATE Skill version. Never auto-promotes to ACCEPTED.';

comment on function public.forge_skill_candidate_from_learning_smoke_test() is
'BACKLOG-250 deterministic smoke for learning-to-Skill candidate creation, dedupe, provenance, and candidate-only maturity.';
