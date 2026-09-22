-- BACKLOG-195: Skill GENERATE_WORKER_PROTOCOL.
-- Convert real Prometeo runtime state packets into a homogeneous, fail-closed worker prompt.
-- This does not replace server authority: the runtime state remains canonical.

create or replace function public.prometeo_generate_worker_protocol(
  p_state jsonb
) returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $$
declare
  v jsonb := coalesce(p_state,'{}'::jsonb);
  v_runtime_state text;
  v_action_kind text;
  v_action_operation text;
  v_project_id text;
  v_job_key text;
  v_job_title text;
  v_min_words integer;
  v_max_words integer;
  v_protocol_version text;
  v_next_rpc text;
  v_terminal boolean := false;
  v_instruction text;
  v_prompt text;
begin
  if jsonb_typeof(v) <> 'object' then
    return jsonb_build_object(
      'ok',false,
      'state','INVALID_WORKER_PROTOCOL_INPUT',
      'reason','STATE_PACKET_MUST_BE_OBJECT'
    );
  end if;

  v_runtime_state := upper(coalesce(
    nullif(btrim(v->>'state'),''),
    nullif(btrim(v->>'next_action'),'')
  ));

  if v_runtime_state is null then
    return jsonb_build_object(
      'ok',false,
      'state','INVALID_WORKER_PROTOCOL_INPUT',
      'reason','RUNTIME_STATE_REQUIRED'
    );
  end if;

  v_action_kind := upper(coalesce(nullif(btrim(v#>>'{action,kind}'),''),''));
  v_action_operation := upper(coalesce(nullif(btrim(v#>>'{action,operation}'),''),''));
  v_project_id := nullif(btrim(v#>>'{project,project_id}'),'');
  v_job_key := nullif(btrim(v#>>'{job,job_key}'),'');
  v_job_title := nullif(btrim(v#>>'{job,title}'),'');
  v_min_words := case
    when coalesce(v#>>'{job,min_words}','') ~ '^[0-9]+$' then (v#>>'{job,min_words}')::integer
    else null
  end;
  v_max_words := case
    when coalesce(v#>>'{job,max_words}','') ~ '^[0-9]+$' then (v#>>'{job,max_words}')::integer
    else null
  end;
  v_protocol_version := coalesce(nullif(btrim(v->>'protocol_version'),''),'OBEY-v2');

  case v_runtime_state
    when 'WORK' then
      v_next_rpc := 'prometeo_publish';
      v_instruction := 'Ejecutá únicamente el job asignado con sus inputs y autoridad actuales. Verificá evidencia antes de publicar. Después usá prometeo_publish con el lease vigente.';
    when 'CHECKPOINT' then
      v_next_rpc := 'prometeo_checkpoint';
      v_instruction := 'Emití checkpoint sólo si la política devuelta lo permite o exige; no agregues telemetría innecesaria. Después seguí el estado que devuelva el servidor.';
    when 'PUBLISH' then
      v_next_rpc := 'prometeo_publish';
      v_instruction := 'Publicá el resultado del job con el lease vigente, meta trazable y children sólo si son necesarios, independientes y verificables.';
    when 'NEXT' then
      v_next_rpc := 'prometeo_allocate';
      v_instruction := 'Pedí el siguiente trabajo al servidor. No inventes routing local ni reutilices una asignación anterior.';
    when 'WAIT' then
      v_next_rpc := 'prometeo_wait';
      v_instruction := 'Esperá mediante prometeo_wait respetando la política del servidor; no hagas hot polling.';
    when 'WAIT_TIMEOUT' then
      v_next_rpc := 'prometeo_wait';
      v_instruction := 'El wait venció sin trabajo. Volvé a esperar según la política recibida; no cambies de ruta.';
    when 'RETRY_LENGTH' then
      v_next_rpc := 'prometeo_publish';
      v_instruction := 'Corregí localmente el largo del output al rango job.min_words/job.max_words y repetí prometeo_publish con el mismo lease si sigue vigente.';
    when 'GOAL_DONE','BLUEPRINT_DONE','DONE','CLOSED','NO_WORK','STOPPED' then
      v_next_rpc := null;
      v_terminal := true;
      v_instruction := 'Estado terminal o sin trabajo ejecutable. No fabriques una transición adicional.';
    else
      return jsonb_build_object(
        'ok',false,
        'state','WORKER_PROTOCOL_UNMAPPED_STATE',
        'runtime_state',v_runtime_state,
        'action',coalesce(v->'action','{}'::jsonb),
        'reason','NO_CANONICAL_ROUTE_FOR_STATE'
      );
  end case;

  v_prompt :=
    '🕹️ PROMETEO · ' || v_runtime_state || E'\n\n' ||
    'PROTOCOLO=' || v_protocol_version || E'\n' ||
    'ESTADO=' || v_runtime_state || E'\n' ||
    'ACCIÓN=' || coalesce(nullif(v_action_kind || case when v_action_operation <> '' then '/' || v_action_operation else '' end,''),'SERVER_STATE') || E'\n' ||
    'PROYECTO=' || coalesce(v_project_id,'-') || E'\n' ||
    'JOB=' || coalesce(v_job_key,'-') ||
      case when v_job_title is not null then ' · ' || v_job_title else '' end || E'\n' ||
    'SIGUIENTE_RPC=' || coalesce(v_next_rpc,'NINGUNO') || E'\n\n' ||
    v_instruction || E'\n\n' ||
    'Reglas invariantes: seguí únicamente el estado devuelto por Prometeo; no improvises rutas. ' ||
    'Si una herramienta devuelve RATE_LIMITED con Retry-After, respetá el intervalo y repetí la misma operación. ' ||
    'No evadas bloqueos de seguridad. ' ||
    case
      when v_min_words is not null and v_max_words is not null
      then 'Antes de publicar validá localmente el rango de ' || v_min_words || '–' || v_max_words || ' palabras. '
      else ''
    end ||
    case
      when coalesce(v->>'lease_token','') <> ''
      then 'Hay un lease vigente en el paquete; usalo sólo en el RPC autorizado y no lo sustituyas. '
      else ''
    end ||
    'El estado/RPC del servidor conserva autoridad sobre este texto.';

  return jsonb_build_object(
    'ok',true,
    'state','WORKER_PROTOCOL_READY',
    'schema','prometeo.worker-protocol-prompt/v1',
    'protocol_version',v_protocol_version,
    'runtime_state',v_runtime_state,
    'action',coalesce(v->'action','{}'::jsonb),
    'control',jsonb_build_object(
      'next_rpc',v_next_rpc,
      'terminal',v_terminal,
      'lease_present',coalesce(v->>'lease_token','') <> ''
    ),
    'job',jsonb_strip_nulls(jsonb_build_object(
      'project_id',v_project_id,
      'job_key',v_job_key,
      'title',v_job_title,
      'min_words',v_min_words,
      'max_words',v_max_words
    )),
    'prompt_text',v_prompt
  );
end;
$$;

comment on function public.prometeo_generate_worker_protocol(jsonb) is
  'BACKLOG-195 deterministic state-aware worker prompt compiler. Runtime state remains authoritative; unknown states fail closed.';

create or replace function public.prometeo_generate_worker_protocol_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_work jsonb;
  v_wait jsonb;
  v_done jsonb;
  v_unknown jsonb;
begin
  v_work := public.prometeo_generate_worker_protocol(jsonb_build_object(
    'state','WORK',
    'protocol_version','OBEY-v2',
    'action',jsonb_build_object('kind','CLIENT','operation','EXECUTE_JOB'),
    'project',jsonb_build_object('project_id','P-SMOKE'),
    'job',jsonb_build_object(
      'job_key','J-SMOKE',
      'title','Smoke job',
      'min_words',120,
      'max_words',1800
    ),
    'lease_token','smoke-lease'
  ));

  v_wait := public.prometeo_generate_worker_protocol(jsonb_build_object(
    'state','WAIT',
    'action',jsonb_build_object('kind','RPC','operation','WAIT')
  ));

  v_done := public.prometeo_generate_worker_protocol(jsonb_build_object(
    'state','DONE'
  ));

  v_unknown := public.prometeo_generate_worker_protocol(jsonb_build_object(
    'state','FUTURE_STATE'
  ));

  if v_work->>'state' <> 'WORKER_PROTOCOL_READY'
     or v_work#>>'{control,next_rpc}' <> 'prometeo_publish'
     or v_work#>>'{job,job_key}' <> 'J-SMOKE'
     or position('J-SMOKE' in coalesce(v_work->>'prompt_text','')) = 0
     or v_wait#>>'{control,next_rpc}' <> 'prometeo_wait'
     or coalesce((v_done#>>'{control,terminal}')::boolean,false) is not true
     or v_unknown->>'state' <> 'WORKER_PROTOCOL_UNMAPPED_STATE'
  then
    raise exception 'BACKLOG-195 worker protocol smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','WORKER_PROTOCOL_SMOKE_OK',
    'work_to_publish','PASS',
    'wait_to_wait','PASS',
    'terminal_guard','PASS',
    'unknown_state_fail_closed','PASS'
  );
end;
$$;

do $$
declare
  v_result jsonb;
  v_smoke jsonb;
begin
  if not exists (
    select 1 from public.forge_skills where skill_id='GENERATE_WORKER_PROTOCOL'
  ) then
    v_result := public.forge_skill_register(
      'GENERATE_WORKER_PROTOCOL',
      'Generate Worker Protocol',
      'Convertir estados y acciones reales de Prometeo en un prompt homogéneo, determinista y fail-closed sin reemplazar la autoridad del servidor.',
      jsonb_build_object(
        'source','BACKLOG-195',
        'runtime_compiler','public.prometeo_generate_worker_protocol(jsonb)',
        'schema','prometeo.worker-protocol-prompt/v1'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-195 skill register failed: %',v_result;
    end if;
  end if;

  if not exists (
    select 1 from public.forge_skill_versions
    where skill_id='GENERATE_WORKER_PROTOCOL' and version_no=1
  ) then
    v_result := public.forge_skill_add_version(
      'GENERATE_WORKER_PROTOCOL',
      jsonb_build_object(
        'maturity_state','CANDIDATE',
        'inputs_schema',jsonb_build_object(
          'type','object',
          'required',jsonb_build_array('state'),
          'properties',jsonb_build_object(
            'state',jsonb_build_object('type','string'),
            'action',jsonb_build_object('type','object'),
            'project',jsonb_build_object('type','object'),
            'job',jsonb_build_object('type','object'),
            'lease_token',jsonb_build_object('type','string')
          )
        ),
        'outputs_schema',jsonb_build_object(
          'type','object',
          'schema','prometeo.worker-protocol-prompt/v1',
          'required',jsonb_build_array(
            'ok','state','schema','runtime_state','control','prompt_text'
          )
        ),
        'procedure_steps',jsonb_build_array(
          jsonb_build_object('id','read_runtime_state','action','Read the runtime state packet exactly as returned by Prometeo.'),
          jsonb_build_object('id','resolve_canonical_route','action','Map only known runtime states to their canonical control RPC or terminal behavior.'),
          jsonb_build_object('id','preserve_runtime_context','action','Carry project/job/action and lease-presence context without inventing missing values.'),
          jsonb_build_object('id','compile_homogeneous_prompt','action','Emit prometeo.worker-protocol-prompt/v1 with a stable layout and invariant safety/backoff rules.'),
          jsonb_build_object('id','fail_closed','action','Return WORKER_PROTOCOL_UNMAPPED_STATE for unknown states instead of guessing a transition.'),
          jsonb_build_object('id','verify','action','Run prometeo_generate_worker_protocol_smoke_test and preserve the receipt.')
        ),
        'rollback_contract',jsonb_build_object(
          'mode','versioned',
          'actions',jsonb_build_array(
            'Supersede this Skill version instead of deleting history.',
            'Drop or replace prometeo_generate_worker_protocol only through a later migration if the runtime contract changes.'
          ),
          'authority','The compiler does not grant execution authority; server state and lease remain authoritative.'
        ),
        'verification_contract',jsonb_build_object(
          'validator','public.prometeo_generate_worker_protocol_smoke_test()',
          'success_state','WORKER_PROTOCOL_SMOKE_OK',
          'unknown_states_fail_closed',true,
          'server_state_authoritative',true
        ),
        'evidence_requirements',jsonb_build_array(
          'runtime RPC/state source packet',
          'public.prometeo_control_worker_prompt baseline',
          'WORKER_PROTOCOL_SMOKE_OK receipt'
        ),
        'evidence',jsonb_build_array(
          'BACKLOG-195',
          'public.prometeo_generate_worker_protocol(jsonb)',
          'public.prometeo_generate_worker_protocol_smoke_test()'
        )
      ),
      jsonb_build_object(
        'source','BACKLOG-195',
        'implemented_by','PRODUCTIVE-FRONTIER-01',
        'schema','prometeo.generate-worker-protocol-skill/v1'
      )
    );
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'BACKLOG-195 version create failed: %',v_result;
    end if;
  end if;

  v_smoke := public.prometeo_generate_worker_protocol_smoke_test();
  if v_smoke->>'state' <> 'WORKER_PROTOCOL_SMOKE_OK' then
    raise exception 'BACKLOG-195 promotion smoke failed: %',v_smoke;
  end if;

  update public.forge_skill_versions
  set maturity_state='ACCEPTED',
      evidence=evidence || jsonb_build_array(
        jsonb_build_object(
          'kind','PROMOTION_SMOKE',
          'state',v_smoke->>'state',
          'verified_at',clock_timestamp()
        )
      )
  where skill_id='GENERATE_WORKER_PROTOCOL'
    and version_no=1
    and maturity_state='CANDIDATE';
end;
$$;

create or replace function public.forge_generate_worker_protocol_skill_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_runtime jsonb;
  v_bundle jsonb;
begin
  v_runtime := public.prometeo_generate_worker_protocol_smoke_test();
  v_bundle := public.forge_skill_execution_bundle('GENERATE_WORKER_PROTOCOL',1);

  if v_runtime->>'state' <> 'WORKER_PROTOCOL_SMOKE_OK'
     or v_bundle->>'state' <> 'SKILL_EXECUTION_BUNDLE'
     or v_bundle->>'maturity_state' <> 'ACCEPTED'
     or v_bundle->>'authority_granted' <> 'false'
  then
    raise exception 'BACKLOG-195 skill smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','GENERATE_WORKER_PROTOCOL_SKILL_SMOKE_OK',
    'runtime_smoke',v_runtime,
    'skill_id','GENERATE_WORKER_PROTOCOL',
    'version_no',1,
    'definition_hash',v_bundle->>'definition_hash',
    'authority_granted',false
  );
end;
$$;

select public.forge_generate_worker_protocol_skill_smoke_test();
