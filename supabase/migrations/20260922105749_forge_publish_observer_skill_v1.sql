-- BACKLOG-194 · Skill PUBLISH_OBSERVER v1
-- Durable, versioned procedure for building, publishing and independently verifying an observer.

create or replace function public.forge_publish_observer_result_validate(
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
  v_sources jsonb := coalesce(v_input->'source_refs','[]'::jsonb);
  v_out_sources jsonb := coalesce(v_output->'source_refs','[]'::jsonb);
  v_checks jsonb := coalesce(v_input->'acceptance_checks','[]'::jsonb);
  v_receipts jsonb := coalesce(v_output->'verification_receipts','[]'::jsonb);
  v_item jsonb;
  v_check text;
begin
  if jsonb_typeof(v_input) <> 'object' or jsonb_typeof(v_output) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_PUBLISH_OBSERVER_SHAPE');
  end if;

  if jsonb_typeof(v_sources) <> 'array' or jsonb_array_length(v_sources) < 1 then
    return jsonb_build_object('ok',false,'state','SOURCE_REFS_REQUIRED');
  end if;
  if nullif(btrim(v_input->>'observer_target'),'') is null
     or nullif(btrim(v_input->>'publish_target'),'') is null
     or nullif(btrim(v_input->>'authority_ref'),'') is null
  then
    return jsonb_build_object('ok',false,'state','TARGET_AND_AUTHORITY_REQUIRED');
  end if;
  if jsonb_typeof(v_checks) <> 'array' or jsonb_array_length(v_checks) < 1 then
    return jsonb_build_object('ok',false,'state','ACCEPTANCE_CHECKS_REQUIRED');
  end if;

  if v_output->>'schema' <> 'prometeo.publish-observer-result/v1' then
    return jsonb_build_object('ok',false,'state','INVALID_PUBLISH_OBSERVER_RESULT_SCHEMA');
  end if;
  if v_output->>'status' <> 'VERIFIED' then
    return jsonb_build_object('ok',false,'state','PUBLISH_NOT_VERIFIED');
  end if;
  if nullif(btrim(v_output->>'artifact_ref'),'') is null
     or nullif(btrim(v_output->>'publish_ref'),'') is null
     or nullif(btrim(v_output->>'rollback_ref'),'') is null
  then
    return jsonb_build_object('ok',false,'state','ARTIFACT_PUBLISH_ROLLBACK_REF_REQUIRED');
  end if;
  if jsonb_typeof(coalesce(v_output->'build_receipt','null'::jsonb)) <> 'object'
     or nullif(btrim(v_output#>>'{build_receipt,evidence_ref}'),'') is null
  then
    return jsonb_build_object('ok',false,'state','BUILD_RECEIPT_REQUIRED');
  end if;
  if jsonb_typeof(coalesce(v_output->'publish_receipt','null'::jsonb)) <> 'object'
     or nullif(btrim(v_output#>>'{publish_receipt,evidence_ref}'),'') is null
  then
    return jsonb_build_object('ok',false,'state','PUBLISH_RECEIPT_REQUIRED');
  end if;

  if jsonb_typeof(v_out_sources) <> 'array'
     or jsonb_array_length(v_out_sources) <> jsonb_array_length(v_sources)
  then
    return jsonb_build_object('ok',false,'state','SOURCE_COVERAGE_MISMATCH');
  end if;

  for v_item in select value from jsonb_array_elements(v_sources)
  loop
    if jsonb_typeof(v_item) <> 'string'
       or not exists (
         select 1 from jsonb_array_elements(v_out_sources) x(value)
         where x.value = v_item
       )
    then
      return jsonb_build_object('ok',false,'state','SOURCE_COVERAGE_MISMATCH');
    end if;
  end loop;

  if jsonb_typeof(v_receipts) <> 'array' or jsonb_array_length(v_receipts) < 1 then
    return jsonb_build_object('ok',false,'state','VERIFICATION_RECEIPTS_REQUIRED');
  end if;

  for v_item in select value from jsonb_array_elements(v_receipts)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or nullif(btrim(v_item->>'check'),'') is null
       or v_item->>'state' <> 'PASS'
       or nullif(btrim(v_item->>'evidence_ref'),'') is null
       or nullif(btrim(v_item->>'observed_ref'),'') is null
    then
      return jsonb_build_object('ok',false,'state','INVALID_VERIFICATION_RECEIPT');
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(v_checks)
  loop
    if jsonb_typeof(v_item) <> 'string' then
      return jsonb_build_object('ok',false,'state','INVALID_ACCEPTANCE_CHECK');
    end if;
    v_check := btrim(v_item #>> '{}');
    if v_check = '' or not exists (
      select 1
      from jsonb_array_elements(v_receipts) r(value)
      where r.value->>'check' = v_check
        and r.value->>'state' = 'PASS'
    ) then
      return jsonb_build_object('ok',false,'state','ACCEPTANCE_CHECK_UNVERIFIED','check',v_check);
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'state','PUBLISH_OBSERVER_RESULT_VALID',
    'source_count',jsonb_array_length(v_sources),
    'acceptance_checks',jsonb_array_length(v_checks),
    'verification_receipts',jsonb_array_length(v_receipts),
    'status','VERIFIED'
  );
end;
$$;

create or replace function public.forge_publish_observer_skill_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_input jsonb;
  v_output jsonb;
  v_good jsonb;
  v_bad jsonb;
  v_bundle jsonb;
begin
  v_input := jsonb_build_object(
    'source_refs',jsonb_build_array('repo://observer/source','backend://observer/state'),
    'observer_target','observer://runtime-status',
    'publish_target','pages://control/runtime-status',
    'authority_ref','job://BACKLOG-194',
    'acceptance_checks',jsonb_build_array('reachable','expected_marker')
  );

  v_output := jsonb_build_object(
    'schema','prometeo.publish-observer-result/v1',
    'status','VERIFIED',
    'source_refs',jsonb_build_array('repo://observer/source','backend://observer/state'),
    'artifact_ref','git://observer/commit-fixture',
    'publish_ref','pages://control/runtime-status@fixture',
    'rollback_ref','git://observer/previous-fixture',
    'build_receipt',jsonb_build_object('evidence_ref','receipt://build/fixture'),
    'publish_receipt',jsonb_build_object('evidence_ref','receipt://publish/fixture'),
    'verification_receipts',jsonb_build_array(
      jsonb_build_object('check','reachable','state','PASS','evidence_ref','receipt://verify/reachable','observed_ref','https://example.invalid/observer'),
      jsonb_build_object('check','expected_marker','state','PASS','evidence_ref','receipt://verify/marker','observed_ref','marker://fixture')
    )
  );

  v_good := public.forge_publish_observer_result_validate(v_input,v_output);
  v_bad := public.forge_publish_observer_result_validate(
    v_input,
    jsonb_set(
      v_output,
      '{verification_receipts}',
      jsonb_build_array(
        jsonb_build_object('check','reachable','state','PASS','evidence_ref','receipt://verify/reachable','observed_ref','https://example.invalid/observer')
      )
    )
  );
  v_bundle := public.forge_skill_execution_bundle('PUBLISH_OBSERVER',1);

  if v_good->>'state' <> 'PUBLISH_OBSERVER_RESULT_VALID'
     or v_bad->>'state' <> 'ACCEPTANCE_CHECK_UNVERIFIED'
     or v_bundle->>'state' <> 'SKILL_EXECUTION_BUNDLE'
     or v_bundle->>'authority_granted' <> 'false'
     or jsonb_array_length(v_bundle->'procedure_steps') < 7
  then
    raise exception 'BACKLOG-194 PUBLISH_OBSERVER smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','PUBLISH_OBSERVER_SKILL_SMOKE_OK',
    'positive_fixture','PASS',
    'missing_acceptance_receipt_rejected','PASS',
    'execution_bundle','PASS',
    'authority_granted',false,
    'skill_id','PUBLISH_OBSERVER',
    'version_no',1,
    'definition_hash',v_bundle->>'definition_hash'
  );
end;
$$;

do $$
declare
  v_result jsonb;
begin
  if not exists(select 1 from public.forge_skills where skill_id='PUBLISH_OBSERVER') then
    v_result := public.forge_skill_register(
      'PUBLISH_OBSERVER',
      'PUBLISH_OBSERVER',
      'Construir un observador desde fuentes reales, publicarlo mediante autoridad explícita y verificar el recurso publicado con evidencia fresca y rollback preservado.',
      jsonb_build_object(
        'schema','prometeo.publish-observer-skill-provenance/v1',
        'source_backlog','BACKLOG-194',
        'implemented_by','PRODUCTIVE-FRONTIER-01'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-194 skill register failed: %',v_result;
    end if;
  end if;

  if not exists(
    select 1 from public.forge_skill_versions
    where skill_id='PUBLISH_OBSERVER' and version_no=1
  ) then
    v_result := public.forge_skill_add_version(
      'PUBLISH_OBSERVER',
      jsonb_build_object(
        'maturity_state','CANDIDATE',
        'inputs_schema',jsonb_build_object(
          'type','object',
          'required',jsonb_build_array('source_refs','observer_target','publish_target','authority_ref','acceptance_checks'),
          'properties',jsonb_build_object(
            'source_refs',jsonb_build_object('type','array','minItems',1),
            'observer_target',jsonb_build_object('type','string'),
            'publish_target',jsonb_build_object('type','string'),
            'authority_ref',jsonb_build_object('type','string'),
            'acceptance_checks',jsonb_build_object('type','array','minItems',1),
            'context',jsonb_build_object('type','object')
          )
        ),
        'outputs_schema',jsonb_build_object(
          'type','object',
          'schema','prometeo.publish-observer-result/v1',
          'required',jsonb_build_array(
            'schema','status','source_refs','artifact_ref','publish_ref','rollback_ref',
            'build_receipt','publish_receipt','verification_receipts'
          )
        ),
        'procedure_steps',jsonb_build_array(
          jsonb_build_object('id','inspect_current_state','action','Read the real source, target and current published state before deciding whether work is still needed.'),
          jsonb_build_object('id','define_observer_contract','action','Derive observer content and acceptance checks from source_refs; do not invent source state.'),
          jsonb_build_object('id','build_reversible_artifact','action','Build the smallest observer artifact that satisfies the contract and preserve a rollback reference.'),
          jsonb_build_object('id','publish_with_authority','action','Publish only through the authority_ref granted by the invoking job; preserve the previous published state.'),
          jsonb_build_object('id','verify_fresh_publication','action','Read the published target independently after publication and execute every acceptance check against the observed resource.'),
          jsonb_build_object('id','record_receipts','action','Record build, publish and per-check verification evidence refs; never infer success from a local build alone.'),
          jsonb_build_object('id','emit_validated_result','action','Emit prometeo.publish-observer-result/v1 and run forge_publish_observer_result_validate before declaring VERIFIED.')
        ),
        'rollback_contract',jsonb_build_object(
          'mode','versioned',
          'actions',jsonb_build_array(
            'restore the prior published artifact referenced by rollback_ref',
            'supersede this Skill version instead of deleting historical definitions'
          ),
          'authority','The Skill grants no mutation authority. Repository/backend/publish mutations require the invoking job authority_ref.'
        ),
        'verification_contract',jsonb_build_object(
          'validator','forge_publish_observer_result_validate(input, output)',
          'success_state','PUBLISH_OBSERVER_RESULT_VALID',
          'must_cover_all_sources',true,
          'must_cover_all_acceptance_checks',true,
          'fresh_publication_evidence_required',true,
          'local_build_is_not_publication_evidence',true
        ),
        'evidence_requirements',jsonb_build_array(
          'source_refs used to derive the observer',
          'build receipt with artifact evidence_ref',
          'publish receipt with published evidence_ref',
          'fresh verification receipt for every acceptance check',
          'rollback_ref to the prior published state'
        ),
        'evidence',jsonb_build_array(
          'BACKLOG-194',
          'public.forge_publish_observer_result_validate',
          'public.forge_publish_observer_skill_smoke_test'
        )
      ),
      jsonb_build_object(
        'schema','prometeo.publish-observer-skill-version-provenance/v1',
        'source_backlog','BACKLOG-194',
        'implemented_by','PRODUCTIVE-FRONTIER-01'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-194 version create failed: %',v_result;
    end if;
  end if;
end;
$$;

do $$
declare
  v_input jsonb;
  v_output jsonb;
  v_check jsonb;
begin
  v_input := jsonb_build_object(
    'source_refs',jsonb_build_array('repo://promotion/source'),
    'observer_target','observer://promotion',
    'publish_target','publish://promotion',
    'authority_ref','job://BACKLOG-194',
    'acceptance_checks',jsonb_build_array('reachable')
  );
  v_output := jsonb_build_object(
    'schema','prometeo.publish-observer-result/v1',
    'status','VERIFIED',
    'source_refs',jsonb_build_array('repo://promotion/source'),
    'artifact_ref','git://promotion/artifact',
    'publish_ref','publish://promotion/receipt',
    'rollback_ref','git://promotion/previous',
    'build_receipt',jsonb_build_object('evidence_ref','receipt://promotion/build'),
    'publish_receipt',jsonb_build_object('evidence_ref','receipt://promotion/publish'),
    'verification_receipts',jsonb_build_array(
      jsonb_build_object('check','reachable','state','PASS','evidence_ref','receipt://promotion/verify','observed_ref','publish://promotion/observed')
    )
  );
  v_check := public.forge_publish_observer_result_validate(v_input,v_output);
  if v_check->>'state' <> 'PUBLISH_OBSERVER_RESULT_VALID' then
    raise exception 'BACKLOG-194 promotion fixture failed: %',v_check;
  end if;

  update public.forge_skill_versions
  set maturity_state='ACCEPTED',
      evidence=evidence || jsonb_build_array(
        jsonb_build_object('kind','PROMOTION_FIXTURE','state',v_check->>'state','verified_at',clock_timestamp())
      )
  where skill_id='PUBLISH_OBSERVER'
    and version_no=1
    and maturity_state='CANDIDATE';
end;
$$;

select public.forge_publish_observer_skill_smoke_test();
