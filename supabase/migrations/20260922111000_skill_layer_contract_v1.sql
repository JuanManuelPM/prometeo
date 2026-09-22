-- BACKLOG-226 · Skill = determinism + cognition + verification
-- Exposes the three layers explicitly without rewriting historical Skill versions.

create or replace function public.forge_skill_layer_bundle(
  p_skill_id text,
  p_version_no integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v public.forge_skill_versions%rowtype;
begin
  if nullif(btrim(coalesce(p_skill_id,'')),'') is null then
    return jsonb_build_object('ok',false,'state','SKILL_ID_REQUIRED');
  end if;

  if p_version_no is null then
    select * into v
    from public.forge_skill_versions
    where skill_id=p_skill_id and maturity_state='ACCEPTED'
    order by version_no desc
    limit 1;
  else
    select * into v
    from public.forge_skill_versions
    where skill_id=p_skill_id and version_no=p_version_no
    limit 1;
  end if;

  if v.skill_id is null then
    return jsonb_build_object(
      'ok',false,
      'state','SKILL_VERSION_NOT_FOUND',
      'skill_id',p_skill_id,
      'version_no',p_version_no
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_LAYER_BUNDLE',
    'schema','prometeo.skill-layer-bundle/v1',
    'skill_ref',jsonb_build_object('skill_id',v.skill_id,'version_no',v.version_no),
    'maturity_state',v.maturity_state,
    'definition_hash',v.definition_hash,
    'layer_order',jsonb_build_array('DETERMINISM','COGNITION','VERIFICATION'),
    'layers',jsonb_build_object(
      'determinism',jsonb_build_object(
        'inputs_schema',v.inputs_schema,
        'outputs_schema',v.outputs_schema,
        'execution_contract',coalesce(v.execution_contract,'{}'::jsonb),
        'rollback_contract',coalesce(v.rollback_contract,'{}'::jsonb)
      ),
      'cognition',jsonb_build_object(
        'procedure_steps',coalesce(v.procedure_steps,'[]'::jsonb)
      ),
      'verification',jsonb_build_object(
        'verification_contract',coalesce(v.verification_contract,'{}'::jsonb),
        'evidence_requirements',coalesce(v.evidence_requirements,'[]'::jsonb)
      )
    )
  );
end;
$$;

create or replace function public.forge_skill_layer_bundle_validate(p_bundle jsonb)
returns jsonb
language plpgsql
immutable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_reasons jsonb := '[]'::jsonb;
  v_layers jsonb := coalesce(p_bundle->'layers','{}'::jsonb);
begin
  if coalesce(p_bundle->>'schema','') <> 'prometeo.skill-layer-bundle/v1' then
    v_reasons:=v_reasons||jsonb_build_array('BAD_SCHEMA');
  end if;

  if coalesce(p_bundle->>'state','') <> 'SKILL_LAYER_BUNDLE' then
    v_reasons:=v_reasons||jsonb_build_array('BAD_STATE');
  end if;

  if jsonb_typeof(v_layers->'determinism') <> 'object'
     or coalesce(v_layers->'determinism'->'inputs_schema','{}'::jsonb)='{}'::jsonb
     or coalesce(v_layers->'determinism'->'outputs_schema','{}'::jsonb)='{}'::jsonb
  then
    v_reasons:=v_reasons||jsonb_build_array('DETERMINISM_MISSING');
  end if;

  if jsonb_typeof(v_layers->'cognition'->'procedure_steps') <> 'array'
     or jsonb_array_length(v_layers->'cognition'->'procedure_steps')=0
  then
    v_reasons:=v_reasons||jsonb_build_array('COGNITION_MISSING');
  end if;

  if jsonb_typeof(v_layers->'verification'->'verification_contract') <> 'object'
     or coalesce(v_layers->'verification'->'verification_contract','{}'::jsonb)='{}'::jsonb
     or jsonb_typeof(v_layers->'verification'->'evidence_requirements') <> 'array'
     or jsonb_array_length(v_layers->'verification'->'evidence_requirements')=0
  then
    v_reasons:=v_reasons||jsonb_build_array('VERIFICATION_MISSING');
  end if;

  return jsonb_build_object(
    'ok',jsonb_array_length(v_reasons)=0,
    'state',case when jsonb_array_length(v_reasons)=0
      then 'SKILL_LAYER_BUNDLE_VALID'
      else 'SKILL_LAYER_BUNDLE_INVALID'
    end,
    'reasons',v_reasons
  );
end;
$$;

create or replace function public.forge_skill_layers_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  r record;
  v_bundle jsonb;
  v_validation jsonb;
  v_checked integer := 0;
begin
  for r in
    select skill_id,version_no
    from public.forge_skill_versions
    where maturity_state='ACCEPTED'
    order by skill_id,version_no
  loop
    v_bundle:=public.forge_skill_layer_bundle(r.skill_id,r.version_no);
    v_validation:=public.forge_skill_layer_bundle_validate(v_bundle);

    if coalesce((v_validation->>'ok')::boolean,false) is not true then
      raise exception 'skill layer validation failed for % v%: %',
        r.skill_id,r.version_no,v_validation;
    end if;

    v_checked:=v_checked+1;
  end loop;

  if v_checked=0 then
    raise exception 'skill layer smoke found no ACCEPTED versions';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SKILL_LAYERS_SMOKE_OK',
    'checked_versions',v_checked,
    'schema','prometeo.skill-layer-bundle/v1',
    'layers',jsonb_build_array('DETERMINISM','COGNITION','VERIFICATION')
  );
end;
$$;

select public.forge_skill_layers_smoke_test();
