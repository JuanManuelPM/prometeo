-- BACKLOG-193: CREATE_REAL_RUN durable Skill + deterministic virginity receipt validator.
-- The Skill never invents creation authority: the invoking job must use the authoritative
-- creator for the target runtime, then prove the fresh run was not reused or contaminated.

create or replace function public.forge_create_real_run_result_validate(
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
  v_pre jsonb;
  v_post jsonb;
  v_evidence jsonb;
  v_key text;
begin
  if jsonb_typeof(v_input) <> 'object' or jsonb_typeof(v_output) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_REAL_RUN_RECEIPT_SHAPE');
  end if;

  if nullif(btrim(v_input->>'run_kind'),'') is null
     or nullif(btrim(v_input->>'requested_run_id'),'') is null
     or nullif(btrim(v_input->>'scope_ref'),'') is null
  then
    return jsonb_build_object('ok',false,'state','REAL_RUN_INPUT_REQUIRED');
  end if;

  if v_output->>'schema' <> 'prometeo.create-real-run-receipt/v1' then
    return jsonb_build_object('ok',false,'state','INVALID_REAL_RUN_RECEIPT_SCHEMA');
  end if;

  if v_output->>'run_kind' is distinct from v_input->>'run_kind'
     or v_output->>'run_id' is distinct from v_input->>'requested_run_id'
  then
    return jsonb_build_object('ok',false,'state','REAL_RUN_IDENTITY_MISMATCH');
  end if;

  v_pre := coalesce(v_output->'precreate','{}'::jsonb);
  v_post := coalesce(v_output->'postcreate','{}'::jsonb);
  v_evidence := coalesce(v_output->'evidence_refs','[]'::jsonb);

  if jsonb_typeof(v_pre) <> 'object'
     or jsonb_typeof(v_post) <> 'object'
     or jsonb_typeof(v_evidence) <> 'array'
  then
    return jsonb_build_object('ok',false,'state','INVALID_REAL_RUN_RECEIPT_COLLECTIONS');
  end if;

  if coalesce((v_pre->>'exists')::boolean,false) then
    return jsonb_build_object('ok',false,'state','RUN_ID_ALREADY_EXISTS');
  end if;

  foreach v_key in array array['jobs','outputs','worker_claims','domain_events']
  loop
    if greatest(0,coalesce((v_pre->v_key)::integer,0)) <> 0 then
      return jsonb_build_object('ok',false,'state','PRECREATE_SCOPE_NOT_EMPTY','artifact',v_key);
    end if;
  end loop;

  if coalesce((v_post->>'identity_matches')::boolean,false) is not true
     or nullif(btrim(v_post->>'created_at'),'') is null
  then
    return jsonb_build_object('ok',false,'state','RUN_READBACK_REQUIRED');
  end if;

  if greatest(0,coalesce((v_post->>'prior_artifacts')::integer,0)) <> 0
     or greatest(0,coalesce((v_post->>'foreign_artifacts')::integer,0)) <> 0
  then
    return jsonb_build_object(
      'ok',false,
      'state','RUN_VIRGINITY_CONTAMINATED',
      'prior_artifacts',greatest(0,coalesce((v_post->>'prior_artifacts')::integer,0)),
      'foreign_artifacts',greatest(0,coalesce((v_post->>'foreign_artifacts')::integer,0))
    );
  end if;

  if coalesce((v_output->>'virginity_verified')::boolean,false) is not true then
    return jsonb_build_object('ok',false,'state','VIRGINITY_FLAG_REQUIRED');
  end if;

  if jsonb_array_length(v_evidence) < 2 then
    return jsonb_build_object('ok',false,'state','REAL_RUN_EVIDENCE_REQUIRED');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','REAL_RUN_VIRGINITY_VALID',
    'run_kind',v_output->>'run_kind',
    'run_id',v_output->>'run_id',
    'scope_ref',v_input->>'scope_ref',
    'evidence_count',jsonb_array_length(v_evidence)
  );
exception
  when invalid_text_representation then
    return jsonb_build_object('ok',false,'state','INVALID_REAL_RUN_RECEIPT_VALUE');
end;
$$;

create or replace function public.forge_create_real_run_skill_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_input jsonb;
  v_good jsonb;
  v_reused jsonb;
  v_dirty jsonb;
  v_good_check jsonb;
  v_reused_check jsonb;
  v_dirty_check jsonb;
  v_version_count integer;
begin
  v_input := jsonb_build_object(
    'run_kind','FORGE_GOAL',
    'requested_run_id','SMOKE-CREATE-REAL-RUN-001',
    'scope_ref','forge_goals:SMOKE-CREATE-REAL-RUN-001'
  );

  v_good := jsonb_build_object(
    'schema','prometeo.create-real-run-receipt/v1',
    'run_kind','FORGE_GOAL',
    'run_id','SMOKE-CREATE-REAL-RUN-001',
    'precreate',jsonb_build_object(
      'exists',false,
      'jobs',0,
      'outputs',0,
      'worker_claims',0,
      'domain_events',0
    ),
    'postcreate',jsonb_build_object(
      'identity_matches',true,
      'created_at','2026-09-22T00:00:00Z',
      'prior_artifacts',0,
      'foreign_artifacts',0
    ),
    'virginity_verified',true,
    'evidence_refs',jsonb_build_array(
      'receipt://precreate-empty',
      'receipt://postcreate-readback'
    )
  );

  v_reused := jsonb_set(v_good,'{precreate,exists}','true'::jsonb);
  v_dirty := jsonb_set(v_good,'{postcreate,foreign_artifacts}','1'::jsonb);

  v_good_check := public.forge_create_real_run_result_validate(v_input,v_good);
  v_reused_check := public.forge_create_real_run_result_validate(v_input,v_reused);
  v_dirty_check := public.forge_create_real_run_result_validate(v_input,v_dirty);
  select count(*) into v_version_count
  from public.forge_skill_versions
  where skill_id='CREATE_REAL_RUN' and version_no=1;

  if v_good_check->>'state' <> 'REAL_RUN_VIRGINITY_VALID'
     or v_reused_check->>'state' <> 'RUN_ID_ALREADY_EXISTS'
     or v_dirty_check->>'state' <> 'RUN_VIRGINITY_CONTAMINATED'
     or v_version_count <> 1
  then
    raise exception 'BACKLOG-193 CREATE_REAL_RUN smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','CREATE_REAL_RUN_SKILL_SMOKE_OK',
    'fresh_fixture','PASS',
    'reused_id_guard','PASS',
    'contamination_guard','PASS',
    'version_present','PASS',
    'authority_granted',false,
    'skill_id','CREATE_REAL_RUN',
    'version_no',1
  );
end;
$$;

do $$
declare
  v_result jsonb;
begin
  if not exists(select 1 from public.forge_skills where skill_id='CREATE_REAL_RUN') then
    v_result := public.forge_skill_register(
      'CREATE_REAL_RUN',
      'CREATE_REAL_RUN',
      'Crear un run con identidad fresca mediante la autoridad del runtime correspondiente y emitir evidencia determinística de virginidad antes de ejecutar trabajo.',
      jsonb_build_object(
        'schema','prometeo.create-real-run-skill-provenance/v1',
        'source_backlog','BACKLOG-193',
        'implemented_by','PRODUCTIVE-FRONTIER-01'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-193 skill register failed: %',v_result;
    end if;
  end if;

  if not exists(
    select 1 from public.forge_skill_versions
    where skill_id='CREATE_REAL_RUN' and version_no=1
  ) then
    v_result := public.forge_skill_add_version(
      'CREATE_REAL_RUN',
      jsonb_build_object(
        'maturity_state','CANDIDATE',
        'inputs_schema',jsonb_build_object(
          'type','object',
          'required',jsonb_build_array('run_kind','requested_run_id','scope_ref'),
          'properties',jsonb_build_object(
            'run_kind',jsonb_build_object('type','string'),
            'requested_run_id',jsonb_build_object('type','string'),
            'scope_ref',jsonb_build_object('type','string'),
            'creation_context',jsonb_build_object('type','object')
          )
        ),
        'outputs_schema',jsonb_build_object(
          'type','object',
          'schema','prometeo.create-real-run-receipt/v1',
          'required',jsonb_build_array(
            'schema','run_kind','run_id','precreate','postcreate',
            'virginity_verified','evidence_refs'
          )
        ),
        'procedure_steps',jsonb_build_array(
          jsonb_build_object(
            'id','resolve_authoritative_creator',
            'action','Resolve the exact authoritative creation operation for run_kind. Never emulate creation by direct inserts when a runtime creator exists.'
          ),
          jsonb_build_object(
            'id','mint_fresh_identity',
            'action','Mint requested_run_id once. Do not reuse a historical run identity or clone an old run row.'
          ),
          jsonb_build_object(
            'id','snapshot_precreate_scope',
            'action','Read the exact durable scope before creation and prove the run identity, jobs, outputs, worker claims and domain events are absent.'
          ),
          jsonb_build_object(
            'id','create_run',
            'action','Invoke the authoritative creator exactly once with explicit caller authority and the fresh identity.'
          ),
          jsonb_build_object(
            'id','read_back_run',
            'action','Read the created run from the source of truth and verify identity plus created_at.'
          ),
          jsonb_build_object(
            'id','verify_virginity',
            'action','Reject reuse or contamination: no artifact may predate creation or belong to another run; lifecycle creation events may exist only when explicitly scoped to this run.'
          ),
          jsonb_build_object(
            'id','emit_receipt',
            'action','Emit prometeo.create-real-run-receipt/v1 with precreate/postcreate evidence refs and run-specific creation receipt.'
          ),
          jsonb_build_object(
            'id','validate_receipt',
            'action','Run forge_create_real_run_result_validate(input, output) and preserve REAL_RUN_VIRGINITY_VALID as the verification receipt.'
          )
        ),
        'rollback_contract',jsonb_build_object(
          'mode','versioned',
          'actions',jsonb_build_array(
            'supersede this Skill version instead of deleting history',
            'if a created run must be reverted, use the target runtime cleanup/reset contract; never rewrite historical evidence'
          ),
          'authority','The Skill grants no creation or deletion authority by itself; the invoking job must already hold authority for the target runtime.'
        ),
        'verification_contract',jsonb_build_object(
          'validator','forge_create_real_run_result_validate(input, output)',
          'success_state','REAL_RUN_VIRGINITY_VALID',
          'fresh_identity_required',true,
          'precreate_scope_must_be_empty',true,
          'readback_required',true,
          'foreign_artifacts_must_be_zero',true
        ),
        'evidence_requirements',jsonb_build_array(
          'precreate exact-scope read proving requested_run_id is absent',
          'authoritative creation receipt or durable creation event',
          'postcreate exact-run readback with created_at',
          'artifact-scope check proving no prior or foreign jobs/outputs/claims/events',
          'validator receipt REAL_RUN_VIRGINITY_VALID'
        ),
        'evidence',jsonb_build_array(
          'BACKLOG-193',
          'public.forge_create_real_run_skill_smoke_test()'
        )
      ),
      jsonb_build_object(
        'schema','prometeo.create-real-run-skill-provenance/v1',
        'source_backlog','BACKLOG-193',
        'implemented_by','PRODUCTIVE-FRONTIER-01'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-193 version create failed: %',v_result;
    end if;
  end if;
end;
$$;

do $$
declare
  v_check jsonb;
begin
  v_check := public.forge_create_real_run_skill_smoke_test();
  if v_check->>'state' <> 'CREATE_REAL_RUN_SKILL_SMOKE_OK' then
    raise exception 'BACKLOG-193 promotion smoke failed: %',v_check;
  end if;

  update public.forge_skill_versions
  set maturity_state='ACCEPTED',
      evidence=evidence || jsonb_build_array(
        jsonb_build_object(
          'kind','PROMOTION_SMOKE',
          'state',v_check->>'state',
          'verified_at',clock_timestamp()
        )
      )
  where skill_id='CREATE_REAL_RUN'
    and version_no=1
    and maturity_state='CANDIDATE';
end;
$$;


select public.forge_create_real_run_skill_smoke_test();
