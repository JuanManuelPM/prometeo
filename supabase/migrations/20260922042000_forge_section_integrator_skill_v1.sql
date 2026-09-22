-- BACKLOG-177: durable Section Integrator Skill.
-- Depends on forge_skills / forge_skill_versions and BACKLOG-176 compact interface contract.

create or replace function public.forge_section_integrator_result_validate(
  p_input jsonb,
  p_output jsonb
) returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $$
declare
  v_input jsonb := coalesce(p_input,'{}'::jsonb);
  v_output jsonb := coalesce(p_output,'{}'::jsonb);
  v_interfaces jsonb;
  v_sources jsonb;
  v_item jsonb;
  v_decision jsonb;
  v_source jsonb;
  v_source_ids text[] := array[]::text[];
  v_input_ids text[] := array[]::text[];
  v_open_ids text[] := array[]::text[];
  v_canonical_ids text[] := array[]::text[];
  v_id text;
begin
  if jsonb_typeof(v_input) <> 'object' or jsonb_typeof(v_output) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_SECTION_INTEGRATION_SHAPE');
  end if;

  if nullif(btrim(v_input->>'section_id'),'') is null then
    return jsonb_build_object('ok',false,'state','SECTION_ID_REQUIRED');
  end if;
  v_interfaces := coalesce(v_input->'interfaces','[]'::jsonb);
  if jsonb_typeof(v_interfaces) <> 'array' or jsonb_array_length(v_interfaces)=0 then
    return jsonb_build_object('ok',false,'state','POINT_INTERFACES_REQUIRED');
  end if;

  for v_item in select value from jsonb_array_elements(v_interfaces)
  loop
    if v_item->>'schema' <> 'prometeo.forge-point-interface/v1'
       or nullif(btrim(v_item->>'point_id'),'') is null
       or nullif(btrim(v_item#>>'{source,canonical_ref}'),'') is null
    then
      return jsonb_build_object('ok',false,'state','INVALID_POINT_INTERFACE');
    end if;
    v_id := btrim(v_item->>'point_id');
    if v_id = any(v_input_ids) then
      return jsonb_build_object('ok',false,'state','DUPLICATE_POINT_INTERFACE','point_id',v_id);
    end if;
    v_input_ids := array_append(v_input_ids,v_id);
  end loop;

  if v_output->>'schema' <> 'prometeo.forge-section-spec/v1' then
    return jsonb_build_object('ok',false,'state','INVALID_SECTION_SPEC_SCHEMA');
  end if;
  if v_output->>'section_id' is distinct from v_input->>'section_id' then
    return jsonb_build_object('ok',false,'state','SECTION_ID_MISMATCH');
  end if;

  if jsonb_typeof(coalesce(v_output->'sources','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'vocabulary','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'duplicates','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'contradictions','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'dependencies','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'canonical_decisions','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'open_decisions','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_output->'components','[]'::jsonb)) <> 'array'
  then
    return jsonb_build_object('ok',false,'state','INVALID_SECTION_SPEC_COLLECTIONS');
  end if;

  v_sources := v_output->'sources';
  if jsonb_array_length(v_sources) <> jsonb_array_length(v_interfaces) then
    return jsonb_build_object('ok',false,'state','SOURCE_COVERAGE_MISMATCH');
  end if;

  for v_source in select value from jsonb_array_elements(v_sources)
  loop
    v_id := nullif(btrim(v_source->>'point_id'),'');
    if v_id is null
       or nullif(btrim(v_source->>'canonical_ref'),'') is null
       or not (v_id = any(v_input_ids))
    then
      return jsonb_build_object('ok',false,'state','INVALID_SOURCE_PROVENANCE');
    end if;
    if v_id = any(v_source_ids) then
      return jsonb_build_object('ok',false,'state','DUPLICATE_SOURCE','point_id',v_id);
    end if;
    v_source_ids := array_append(v_source_ids,v_id);
  end loop;

  if exists (
    select 1
    from unnest(v_input_ids) x
    where not (x = any(v_source_ids))
  ) then
    return jsonb_build_object('ok',false,'state','UNACCOUNTED_POINT_INTERFACE');
  end if;

  for v_item in select value from jsonb_array_elements(v_output->'contradictions')
  loop
    if coalesce(v_item->>'status','') not in ('RESOLVED','OPEN') then
      return jsonb_build_object('ok',false,'state','INVALID_CONTRADICTION_STATUS');
    end if;
    if v_item->>'status'='RESOLVED'
       and (
         jsonb_typeof(coalesce(v_item->'evidence_refs','[]'::jsonb)) <> 'array'
         or jsonb_array_length(coalesce(v_item->'evidence_refs','[]'::jsonb))=0
       )
    then
      return jsonb_build_object('ok',false,'state','RESOLUTION_EVIDENCE_REQUIRED');
    end if;
  end loop;

  for v_decision in
    select value from jsonb_array_elements(coalesce(v_input->'canonical_decisions','[]'::jsonb))
  loop
    v_id := nullif(btrim(v_decision->>'id'),'');
    if v_id is not null then
      v_canonical_ids := array_append(v_canonical_ids,v_id);
    end if;
  end loop;

  for v_decision in select value from jsonb_array_elements(v_output->'open_decisions')
  loop
    v_id := nullif(btrim(v_decision->>'id'),'');
    if v_id is null then
      return jsonb_build_object('ok',false,'state','OPEN_DECISION_ID_REQUIRED');
    end if;
    v_open_ids := array_append(v_open_ids,v_id);
  end loop;

  if exists (
    select 1
    from unnest(v_canonical_ids) x
    where x = any(v_open_ids)
  ) then
    return jsonb_build_object('ok',false,'state','CANONICAL_DECISION_REOPENED');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SECTION_SPEC_VALID',
    'section_id',v_output->>'section_id',
    'source_count',jsonb_array_length(v_sources),
    'duplicate_groups',jsonb_array_length(v_output->'duplicates'),
    'contradictions',jsonb_array_length(v_output->'contradictions'),
    'open_decisions',jsonb_array_length(v_output->'open_decisions')
  );
end;
$$;

create or replace function public.forge_section_integrator_skill_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_input jsonb;
  v_output jsonb;
  v_invalid jsonb;
  v_validated jsonb;
  v_reopen jsonb;
  v_bundle jsonb;
begin
  v_input := jsonb_build_object(
    'section_id','EXECUTION',
    'interfaces',jsonb_build_array(
      jsonb_build_object(
        'schema','prometeo.forge-point-interface/v1',
        'point_id','P001',
        'interface_version',1,
        'source',jsonb_build_object('canonical_ref','forge://P001/canonical','canonical_version',1,'source_hash','sha256:a')
      ),
      jsonb_build_object(
        'schema','prometeo.forge-point-interface/v1',
        'point_id','P002',
        'interface_version',1,
        'source',jsonb_build_object('canonical_ref','forge://P002/canonical','canonical_version',1,'source_hash','sha256:b')
      )
    ),
    'canonical_decisions',jsonb_build_array(
      jsonb_build_object('id','decision.scheduler_authority','value','SERVER','evidence_ref','forge://decision/scheduler')
    )
  );

  v_output := jsonb_build_object(
    'schema','prometeo.forge-section-spec/v1',
    'section_id','EXECUTION',
    'sources',jsonb_build_array(
      jsonb_build_object('point_id','P001','canonical_ref','forge://P001/canonical','interface_version',1),
      jsonb_build_object('point_id','P002','canonical_ref','forge://P002/canonical','interface_version',1)
    ),
    'vocabulary',jsonb_build_array(
      jsonb_build_object('canonical_term','lease','aliases',jsonb_build_array('claim lease'))
    ),
    'duplicates',jsonb_build_array(
      jsonb_build_object('concept_id','lease.fencing','point_ids',jsonb_build_array('P001','P002'),'disposition','MERGED')
    ),
    'contradictions',jsonb_build_array(
      jsonb_build_object(
        'id','conflict.timeout',
        'status','RESOLVED',
        'resolution','server lease expiry wins',
        'evidence_refs',jsonb_build_array('forge://P001/canonical','forge://P002/canonical')
      )
    ),
    'dependencies',jsonb_build_array(
      jsonb_build_object('from_point_id','P002','to_point_id','P001','relation','REQUIRES')
    ),
    'canonical_decisions',jsonb_build_array(
      jsonb_build_object('id','decision.scheduler_authority','value','SERVER','evidence_ref','forge://decision/scheduler')
    ),
    'open_decisions',jsonb_build_array(
      jsonb_build_object('id','decision.retry_budget','question','What retry budget is canonical?','provenance',jsonb_build_array('P002'))
    ),
    'components',jsonb_build_array(
      jsonb_build_object('id','component.execution_lease','source_points',jsonb_build_array('P001','P002'))
    )
  );

  v_validated := public.forge_section_integrator_result_validate(v_input,v_output);

  v_invalid := jsonb_set(
    v_output,
    '{open_decisions}',
    jsonb_build_array(jsonb_build_object(
      'id','decision.scheduler_authority',
      'question','Reopen a canonical decision',
      'provenance',jsonb_build_array('P001')
    ))
  );
  v_reopen := public.forge_section_integrator_result_validate(v_input,v_invalid);

  v_bundle := public.forge_skill_execution_bundle('FORGE_SECTION_INTEGRATOR',1);

  if v_validated->>'state' <> 'SECTION_SPEC_VALID'
     or v_validated->>'source_count' <> '2'
     or v_reopen->>'state' <> 'CANONICAL_DECISION_REOPENED'
     or v_bundle->>'state' <> 'SKILL_EXECUTION_BUNDLE'
     or v_bundle->>'authority_granted' <> 'false'
     or jsonb_array_length(v_bundle->'procedure_steps') < 7
  then
    raise exception 'BACKLOG-177 section integrator smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','SECTION_INTEGRATOR_SKILL_SMOKE_OK',
    'valid_section_spec','PASS',
    'source_coverage','PASS',
    'canonical_decision_reopen_guard','PASS',
    'execution_bundle','PASS',
    'authority_granted',false,
    'skill_id','FORGE_SECTION_INTEGRATOR',
    'version_no',1,
    'definition_hash',v_bundle->>'definition_hash'
  );
end;
$$;

do $$
declare
  v_result jsonb;
begin
  if not exists(select 1 from public.forge_skills where skill_id='FORGE_SECTION_INTEGRATOR') then
    v_result := public.forge_skill_register(
      'FORGE_SECTION_INTEGRATOR',
      'Integrador de sección',
      'Reconciliar interfaces compactas de una sección en una Section Specification trazable sin reabrir decisiones canónicas sin evidencia.',
      jsonb_build_object(
        'source','docs/cognitive-forge/BACKLOG.md#177',
        'contract','prometeo.forge-section-spec/v1',
        'consumer_of','prometeo.forge-point-interface/v1'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-177 skill register failed: %',v_result;
    end if;
  end if;

  if not exists(
    select 1 from public.forge_skill_versions
    where skill_id='FORGE_SECTION_INTEGRATOR' and version_no=1
  ) then
    v_result := public.forge_skill_add_version(
      'FORGE_SECTION_INTEGRATOR',
      jsonb_build_object(
        'maturity_state','CANDIDATE',
        'inputs_schema',jsonb_build_object(
          'type','object',
          'required',jsonb_build_array('section_id','interfaces'),
          'properties',jsonb_build_object(
            'section_id',jsonb_build_object('type','string'),
            'interfaces',jsonb_build_object('type','array','minItems',1,'item_schema','prometeo.forge-point-interface/v1'),
            'canonical_decisions',jsonb_build_object('type','array'),
            'section_context',jsonb_build_object('type','object')
          )
        ),
        'outputs_schema',jsonb_build_object(
          'type','object',
          'schema','prometeo.forge-section-spec/v1',
          'required',jsonb_build_array(
            'schema','section_id','sources','vocabulary','duplicates','contradictions',
            'dependencies','canonical_decisions','open_decisions','components'
          )
        ),
        'procedure_steps',jsonb_build_array(
          jsonb_build_object('id','validate_inputs','action','Validate point-interface/v1 shape, unique point IDs and source provenance.'),
          jsonb_build_object('id','normalize_vocabulary','action','Unify equivalent terminology while preserving source aliases.'),
          jsonb_build_object('id','detect_duplicates','action','Group repeated concepts and record MERGED or KEPT_SEPARATE disposition with source points.'),
          jsonb_build_object('id','detect_contradictions','action','Surface incompatible claims; resolve only with evidence, otherwise leave OPEN.'),
          jsonb_build_object('id','derive_dependencies','action','Make missing cross-point dependencies explicit without inferring identity from textual similarity alone.'),
          jsonb_build_object('id','preserve_decisions','action','Separate canonical and open decisions; never reopen a canonical decision without new evidence.'),
          jsonb_build_object('id','emit_section_spec','action','Emit forge-section-spec/v1 with complete source coverage and provenance.'),
          jsonb_build_object('id','verify_result','action','Run forge_section_integrator_result_validate and preserve the validation receipt.')
        ),
        'rollback_contract',jsonb_build_object(
          'mode','versioned',
          'actions',jsonb_build_array(
            'Retire or supersede this Skill version; do not delete historical definitions.',
            'Restore the prior Section Specification artifact if a downstream integration is reversed.'
          ),
          'authority','No repository/backend mutation is implied by the Skill; the invoking job must grant authority separately.'
        ),
        'verification_contract',jsonb_build_object(
          'validator','forge_section_integrator_result_validate(input, output)',
          'success_state','SECTION_SPEC_VALID',
          'must_cover_all_sources',true,
          'resolved_contradictions_require_evidence',true,
          'canonical_decisions_must_not_reopen',true
        ),
        'evidence_requirements',jsonb_build_array(
          'source point-interface refs and versions',
          'canonical refs for every source point',
          'duplicate/contradiction dispositions',
          'validator receipt SECTION_SPEC_VALID'
        ),
        'evidence',jsonb_build_array(
          'docs/cognitive-forge/BACKLOG-176-COMPACT-INTERFACE-SCHEMA-SPEC.md',
          'public.forge_section_integrator_skill_smoke_test()'
        )
      ),
      jsonb_build_object(
        'source','BACKLOG-177',
        'implemented_by','PRODUCTIVE-FRONTIER-01',
        'schema','prometeo.forge-section-integrator-skill/v1'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-177 version create failed: %',v_result;
    end if;
  end if;
end;
$$;

-- Promote only after the deterministic validator has passed its representative fixture.
do $$
declare
  v_input jsonb;
  v_output jsonb;
  v_check jsonb;
begin
  v_input := jsonb_build_object(
    'section_id','PROMOTION_FIXTURE',
    'interfaces',jsonb_build_array(
      jsonb_build_object(
        'schema','prometeo.forge-point-interface/v1',
        'point_id','PF001',
        'source',jsonb_build_object('canonical_ref','forge://PF001','canonical_version',1,'source_hash','sha256:fixture')
      )
    ),
    'canonical_decisions','[]'::jsonb
  );
  v_output := jsonb_build_object(
    'schema','prometeo.forge-section-spec/v1',
    'section_id','PROMOTION_FIXTURE',
    'sources',jsonb_build_array(jsonb_build_object('point_id','PF001','canonical_ref','forge://PF001')),
    'vocabulary','[]'::jsonb,
    'duplicates','[]'::jsonb,
    'contradictions','[]'::jsonb,
    'dependencies','[]'::jsonb,
    'canonical_decisions','[]'::jsonb,
    'open_decisions','[]'::jsonb,
    'components',jsonb_build_array(jsonb_build_object('id','component.fixture','source_points',jsonb_build_array('PF001')))
  );
  v_check := public.forge_section_integrator_result_validate(v_input,v_output);
  if v_check->>'state' <> 'SECTION_SPEC_VALID' then
    raise exception 'BACKLOG-177 promotion fixture failed: %',v_check;
  end if;

  update public.forge_skill_versions
  set maturity_state='ACCEPTED',
      evidence=evidence || jsonb_build_array(
        jsonb_build_object('kind','PROMOTION_FIXTURE','state',v_check->>'state','verified_at',clock_timestamp())
      )
  where skill_id='FORGE_SECTION_INTEGRATOR'
    and version_no=1
    and maturity_state='CANDIDATE';
end;
$$;

select public.forge_section_integrator_skill_smoke_test();
