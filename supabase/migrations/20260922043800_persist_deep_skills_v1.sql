-- BACKLOG-222 · Persist Deep Skills v1
-- Exact live function definitions read back after successful migration and smoke.
-- Replaying is idempotent: forge_deep_skill_seed_v1 creates only missing Skills/versions.

CREATE OR REPLACE FUNCTION public.forge_deep_skill_profile_contract(p_profile text, p_required_operations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_profile text:=upper(coalesce(p_profile,''));
  v_budget jsonb;
  v_outputs jsonb;
begin
  if jsonb_typeof(coalesce(p_required_operations,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_required_operations,'[]'::jsonb))<1 then
    raise exception 'required operations must be a non-empty array';
  end if;

  case v_profile
    when 'ANALYZE' then
      v_budget:=jsonb_build_object('min_words',700,'target_words',1000,'max_words',1400,'max_tool_calls',8,'max_children',1);
      v_outputs:=jsonb_build_array(
        jsonb_build_object('type','FINDING','min_count',2,'provenance_required',true),
        jsonb_build_object('type','CAPABILITY','min_count',1,'provenance_required',true)
      );
    when 'SYNTHESIZE' then
      v_budget:=jsonb_build_object('min_words',900,'target_words',1300,'max_words',1800,'max_tool_calls',10,'max_children',2);
      v_outputs:=jsonb_build_array(
        jsonb_build_object('type','FINDING','min_count',2,'provenance_required',true),
        jsonb_build_object('type','DECISION','min_count',1,'provenance_required',true),
        jsonb_build_object('type','RISK','min_count',1,'provenance_required',true)
      );
    when 'ADVERSARIAL' then
      v_budget:=jsonb_build_object('min_words',700,'target_words',1000,'max_words',1500,'max_tool_calls',10,'max_children',2);
      v_outputs:=jsonb_build_array(
        jsonb_build_object('type','RISK','min_count',2,'provenance_required',true),
        jsonb_build_object('type','FINDING','min_count',1,'provenance_required',true),
        jsonb_build_object('type','SPEC_DELTA','min_count',1,'provenance_required',true)
      );
    when 'TRANSFORM' then
      v_budget:=jsonb_build_object('min_words',800,'target_words',1200,'max_words',1700,'max_tool_calls',12,'max_children',2);
      v_outputs:=jsonb_build_array(
        jsonb_build_object('type','SPEC_DELTA','min_count',1,'provenance_required',true),
        jsonb_build_object('type','DECISION','min_count',1,'provenance_required',true),
        jsonb_build_object('type','RISK','min_count',1,'provenance_required',true)
      );
    when 'META' then
      v_budget:=jsonb_build_object('min_words',1200,'target_words',1800,'max_words',2400,'max_tool_calls',12,'max_children',3);
      v_outputs:=jsonb_build_array(
        jsonb_build_object('type','FINDING','min_count',2,'provenance_required',true),
        jsonb_build_object('type','CAPABILITY','min_count',1,'provenance_required',true),
        jsonb_build_object('type','EXPERIMENT','min_count',1,'provenance_required',true),
        jsonb_build_object('type','DECISION','min_count',1,'provenance_required',true)
      );
    else
      raise exception 'unsupported deep skill profile: %',v_profile;
  end case;

  return jsonb_build_object(
    'schema','prometeo.deep-skill-contract/v1',
    'profile',v_profile,
    'budget',v_budget,
    'required_operations',p_required_operations,
    'required_outputs',v_outputs,
    'stop_conditions',jsonb_build_array(
      'evidence_sufficient',
      'decision_boundary_reached'
    ),
    'failure_modes',jsonb_build_array(
      'MISSING_INPUT',
      'EVIDENCE_GAP',
      'TOOL_ERROR'
    ),
    'verification',jsonb_build_object(
      'critical_claims_require_evidence',true,
      'receipt_schema','prometeo.deep-skill-execution-receipt/v1',
      'validator','forge_deep_skill_execution_validate'
    ),
    'degradation_policy',jsonb_build_object(
      'allowed_statuses',jsonb_build_array('PARTIAL','BLOCKED','TOOL_ERROR'),
      'never_invent_missing_input',true,
      'tool_error_is_not_incapacity',true
    )
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_seed_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_specs jsonb:=jsonb_build_array(
    jsonb_build_object(
      'skill_id','DEEP_ABSTRACT_PROCEDURE',
      'name','ABSTRAER EL PROCEDIMIENTO',
      'source_backlog',207,
      'profile','ANALYZE',
      'purpose','Extraer el método reusable detrás de una solución.',
      'operations',jsonb_build_array('observe_solution','separate_accident_from_method','model_reusable_procedure','verify_transfer')
    ),
    jsonb_build_object(
      'skill_id','DEEP_COUNCIL_OF_PERSPECTIVES',
      'name','CONSEJO DE PERSPECTIVAS',
      'source_backlog',208,
      'profile','SYNTHESIZE',
      'purpose','Analizar perspectivas de negocio, ingeniería, automatización, operaciones, UX, seguridad y otras; hacerlas discutir y reconciliar tensiones.',
      'operations',jsonb_build_array('collect_perspectives','surface_conflicts','reconcile_tradeoffs','emit_integrated_decisions')
    ),
    jsonb_build_object(
      'skill_id','DEEP_RADICAL_SIMPLIFIER',
      'name','RADICAL_SIMPLIFIER',
      'source_backlog',210,
      'profile','ADVERSARIAL',
      'purpose','Intentar eliminar al menos la mitad de los componentes sin perder propiedades esenciales.',
      'operations',jsonb_build_array('inventory_components','challenge_necessity','attempt_half_removal','verify_preserved_invariants')
    ),
    jsonb_build_object(
      'skill_id','DEEP_WHY_NOT_A_FUNCTION',
      'name','¿Por qué esto no es una función?',
      'source_backlog',211,
      'profile','ANALYZE',
      'purpose','Clasificar trabajo en determinista, cognitivo, humano y externo y extraer funciones donde corresponda.',
      'operations',jsonb_build_array('classify_steps','identify_deterministic_work','separate_cognitive_human_external','propose_function_boundaries')
    ),
    jsonb_build_object(
      'skill_id','DEEP_BLIND_RECONSTRUCTION',
      'name','Reconstrucción sin original',
      'source_backlog',212,
      'profile','ADVERSARIAL',
      'purpose','Reconstruir sin acceso al original para medir información perdida, ambigua o inventada.',
      'operations',jsonb_build_array('reconstruct_without_original','record_invented_information','compare_with_source','measure_information_loss')
    ),
    jsonb_build_object(
      'skill_id','DEEP_TEN_X',
      'name','DIEZ VECES MÁS',
      'source_backlog',213,
      'profile','META',
      'purpose','Modelar qué debe cambiar para procesar diez veces más trabajo con los mismos recursos humanos.',
      'operations',jsonb_build_array('model_10x_load','identify_breakpoints','remove_human_scaling','design_10x_changes')
    ),
    jsonb_build_object(
      'skill_id','DEEP_DUPLICATION_HUNTER',
      'name','¿Qué estamos haciendo dos veces?',
      'source_backlog',214,
      'profile','ANALYZE',
      'purpose','Detectar motores, pasos, contratos y protocolos duplicados y proponer una fuente común.',
      'operations',jsonb_build_array('inventory_repeated_work','cluster_duplicates','find_shared_engine','propose_deduplication')
    ),
    jsonb_build_object(
      'skill_id','DEEP_AUTOMATION_ARCHITECT',
      'name','Arquitecto de automatización',
      'source_backlog',215,
      'profile','TRANSFORM',
      'purpose','Decidir qué responsabilidad corresponde a SQL, navegador, worker, Skill, scheduler, servicio externo o humano.',
      'operations',jsonb_build_array('classify_responsibilities','assign_runtime_layer','define_contracts','verify_human_boundary')
    ),
    jsonb_build_object(
      'skill_id','DEEP_CEO_VS_ENGINEER',
      'name','CEO vs Ingeniero',
      'source_backlog',216,
      'profile','SYNTHESIZE',
      'purpose','Resolver tensiones entre valor, simplicidad, operación, UX, seguridad y restricciones técnicas.',
      'operations',jsonb_build_array('state_value_constraints','state_engineering_constraints','surface_tensions','reconcile_decisions')
    ),
    jsonb_build_object(
      'skill_id','DEEP_FUTURE_RETROSPECTIVE',
      'name','Futuro retrospectivo',
      'source_backlog',217,
      'profile','META',
      'purpose','Imaginar el sistema a gran escala y volver al presente con cambios pequeños y reversibles.',
      'operations',jsonb_build_array('simulate_future_scale','observe_failure_patterns','work_backward','select_cheap_present_changes')
    ),
    jsonb_build_object(
      'skill_id','FORGE_DEEP_RETHINK',
      'name','FORGE_DEEP_RETHINK',
      'source_backlog',218,
      'profile','META',
      'purpose','Combinar reconstrucción, perspectivas, simplificación, automatización, escala y aprendizaje para cambiar decisiones del sistema.',
      'operations',jsonb_build_array('reconstruct_system','run_perspective_council','simplify_radically','redesign_automation','test_10x','emit_non_obvious_findings')
    )
  );
  v_spec jsonb;
  v_register jsonb;
  v_version jsonb;
  v_contract jsonb;
  v_created integer:=0;
  v_existing integer:=0;
begin
  for v_spec in select value from jsonb_array_elements(v_specs)
  loop
    if not exists(
      select 1 from public.forge_skills
      where skill_id=v_spec->>'skill_id'
    ) then
      v_register:=public.forge_skill_register(
        v_spec->>'skill_id',
        v_spec->>'name',
        v_spec->>'purpose',
        jsonb_build_object(
          'schema','prometeo.deep-skill-provenance/v1',
          'source_backlog','BACKLOG-'||(v_spec->>'source_backlog'),
          'contract_source','BACKLOG-223',
          'seed_migration','persist_deep_skills_v1'
        )
      );
      if coalesce((v_register->>'ok')::boolean,false) is not true then
        raise exception 'register failed for %: %',v_spec->>'skill_id',v_register;
      end if;
    end if;

    if not exists(
      select 1 from public.forge_skill_versions
      where skill_id=v_spec->>'skill_id'
    ) then
      v_contract:=public.forge_deep_skill_profile_contract(
        v_spec->>'profile',
        v_spec->'operations'
      );
      v_version:=public.forge_skill_add_version(
        v_spec->>'skill_id',
        jsonb_build_object(
          'maturity_state','ACCEPTED',
          'inputs_schema',jsonb_build_object(
            'type','object',
            'required',jsonb_build_array('source_refs'),
            'properties',jsonb_build_object(
              'source_refs',jsonb_build_object('type','array','minItems',1),
              'context',jsonb_build_object('type','object')
            )
          ),
          'outputs_schema',jsonb_build_object(
            'type','object',
            'required',jsonb_build_array('outputs','evidence_refs'),
            'receipt_schema','prometeo.deep-skill-execution-receipt/v1'
          ),
          'procedure_steps',v_spec->'operations',
          'rollback_contract',jsonb_build_object(
            'mode','versioned',
            'actions',jsonb_build_array(
              'supersede this version instead of deleting history',
              'restore the previously accepted version if regression evidence requires rollback'
            )
          ),
          'verification_contract',jsonb_build_object(
            'validator','forge_deep_skill_execution_validate',
            'contract_schema','prometeo.deep-skill-contract/v1',
            'critical_claims_require_evidence',true
          ),
          'evidence_requirements',jsonb_build_array(
            'source_refs for critical findings',
            'structured deep_skill_execution receipt'
          ),
          'evidence',jsonb_build_array(
            'BACKLOG-'||(v_spec->>'source_backlog'),
            'BACKLOG-223-DEEP-SKILL-CONTRACTS-SPEC'
          ),
          'execution_contract',v_contract
        ),
        jsonb_build_object(
          'schema','prometeo.deep-skill-version-provenance/v1',
          'source_backlog','BACKLOG-'||(v_spec->>'source_backlog'),
          'contract_source','BACKLOG-223',
          'seed_migration','persist_deep_skills_v1'
        )
      );
      if coalesce((v_version->>'ok')::boolean,false) is not true then
        raise exception 'version failed for %: %',v_spec->>'skill_id',v_version;
      end if;
      v_created:=v_created+1;
    else
      v_existing:=v_existing+1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILLS_SEEDED',
    'expected',jsonb_array_length(v_specs),
    'versions_created',v_created,
    'already_existing',v_existing
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_seed_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_expected text[]:=array[
    'DEEP_ABSTRACT_PROCEDURE',
    'DEEP_COUNCIL_OF_PERSPECTIVES',
    'DEEP_RADICAL_SIMPLIFIER',
    'DEEP_WHY_NOT_A_FUNCTION',
    'DEEP_BLIND_RECONSTRUCTION',
    'DEEP_TEN_X',
    'DEEP_DUPLICATION_HUNTER',
    'DEEP_AUTOMATION_ARCHITECT',
    'DEEP_CEO_VS_ENGINEER',
    'DEEP_FUTURE_RETROSPECTIVE',
    'FORGE_DEEP_RETHINK'
  ];
  v_registered integer;
  v_accepted integer;
  v_contracts integer;
  v_missing jsonb;
begin
  select count(*) into v_registered
  from public.forge_skills
  where skill_id=any(v_expected)
    and registry_status='ACTIVE';

  select count(*) into v_accepted
  from public.forge_skill_versions
  where skill_id=any(v_expected)
    and maturity_state='ACCEPTED';

  select count(*) into v_contracts
  from public.forge_skill_versions
  where skill_id=any(v_expected)
    and maturity_state='ACCEPTED'
    and execution_contract->>'schema'='prometeo.deep-skill-contract/v1';

  select coalesce(jsonb_agg(x.skill_id order by x.skill_id),'[]'::jsonb)
  into v_missing
  from unnest(v_expected) x(skill_id)
  where not exists(
    select 1 from public.forge_skills s where s.skill_id=x.skill_id
  );

  return jsonb_build_object(
    'ok',v_registered=11 and v_accepted=11 and v_contracts=11 and jsonb_array_length(v_missing)=0,
    'state',case when v_registered=11 and v_accepted=11 and v_contracts=11 and jsonb_array_length(v_missing)=0
                 then 'DEEP_SKILLS_READY' else 'DEEP_SKILLS_INCOMPLETE' end,
    'expected',11,
    'registered_active',v_registered,
    'accepted_versions',v_accepted,
    'contract_v1_versions',v_contracts,
    'missing_skill_ids',v_missing
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.forge_deep_skill_seed_smoke_test()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_status jsonb;
  v_row record;
  v_check jsonb;
  v_bundle jsonb;
  v_hash text;
  v_validated integer:=0;
begin
  v_status:=public.forge_deep_skill_seed_status();
  if coalesce((v_status->>'ok')::boolean,false) is not true then
    raise exception 'deep skill seed incomplete: %',v_status;
  end if;

  for v_row in
    select s.skill_id,v.version_no,v.execution_contract
    from public.forge_skills s
    join public.forge_skill_versions v using(skill_id)
    where s.skill_id in (
      'DEEP_ABSTRACT_PROCEDURE',
      'DEEP_COUNCIL_OF_PERSPECTIVES',
      'DEEP_RADICAL_SIMPLIFIER',
      'DEEP_WHY_NOT_A_FUNCTION',
      'DEEP_BLIND_RECONSTRUCTION',
      'DEEP_TEN_X',
      'DEEP_DUPLICATION_HUNTER',
      'DEEP_AUTOMATION_ARCHITECT',
      'DEEP_CEO_VS_ENGINEER',
      'DEEP_FUTURE_RETROSPECTIVE',
      'FORGE_DEEP_RETHINK'
    )
      and v.maturity_state='ACCEPTED'
    order by s.skill_id
  loop
    v_check:=public.forge_deep_skill_contract_validate(v_row.execution_contract);
    if coalesce((v_check->>'ok')::boolean,false) is not true then
      raise exception 'contract invalid for %: %',v_row.skill_id,v_check;
    end if;

    v_bundle:=public.forge_skill_execution_bundle(v_row.skill_id,v_row.version_no);
    if coalesce((v_bundle->>'ok')::boolean,false) is not true
       or v_bundle->'execution_contract'->>'schema'<>'prometeo.deep-skill-contract/v1' then
      raise exception 'bundle invalid for %: %',v_row.skill_id,v_bundle;
    end if;

    v_hash:=public.forge_skill_definition_hash(v_row.skill_id,v_row.version_no);
    if nullif(v_hash,'') is null then
      raise exception 'definition hash missing for %',v_row.skill_id;
    end if;

    v_validated:=v_validated+1;
  end loop;

  if v_validated<>11 then
    raise exception 'expected 11 validated deep skills, got %',v_validated;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_SEED_SMOKE_OK',
    'validated_skills',v_validated,
    'all_active',true,
    'all_accepted',true,
    'all_contract_v1',true,
    'all_exact_bundles',true,
    'all_definition_hashes',true
  );
end
$function$;

select public.forge_deep_skill_seed_v1();
