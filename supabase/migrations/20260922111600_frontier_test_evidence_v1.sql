-- BACKLOG-182 · Tests posteriores
-- Enforce post-implementation test evidence for Productive Frontier work without
-- disturbing already-leased jobs. Rollback: drop the two triggers + three functions;
-- TEST_EVIDENCE_V1 text can remain harmlessly in historical instructions.

create or replace function public.prometeo_frontier_test_evidence_validate(
  p_meta jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $$
declare
  v_outcome text := upper(btrim(coalesce(p_meta #>> '{frontier,outcome}','')));
  v_tests jsonb := p_meta #> '{frontier,tests}';
  v_bad integer := 0;
begin
  if v_outcome <> 'IMPLEMENTED' then
    return jsonb_build_object(
      'ok',true,
      'state','TEST_EVIDENCE_NOT_REQUIRED',
      'outcome',nullif(v_outcome,'')
    );
  end if;

  if jsonb_typeof(v_tests) <> 'array' or jsonb_array_length(v_tests)=0 then
    return jsonb_build_object(
      'ok',false,
      'state','TEST_EVIDENCE_REQUIRED',
      'reason','IMPLEMENTED_REQUIRES_NONEMPTY_FRONTIER_TESTS'
    );
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(v_tests) t
  where jsonb_typeof(t) <> 'object'
     or nullif(btrim(coalesce(t->>'name','')),'') is null
     or upper(btrim(coalesce(t->>'status',''))) <> 'PASS'
     or nullif(btrim(coalesce(t->>'evidence_ref','')),'') is null;

  if v_bad > 0 then
    return jsonb_build_object(
      'ok',false,
      'state','TEST_EVIDENCE_INVALID',
      'reason','EVERY_TEST_REQUIRES_NAME_PASS_AND_EVIDENCE_REF',
      'invalid_count',v_bad
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','TEST_EVIDENCE_VALID',
    'test_count',jsonb_array_length(v_tests)
  );
end;
$$;

create or replace function public.prometeo_frontier_test_evidence_contract()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  v_marker constant text := 'TEST_EVIDENCE_V1';
  v_contract constant text := E'\n\nTEST_EVIDENCE_V1\nSi meta.frontier.outcome=IMPLEMENTED, antes de PUBLISH ejecutá pruebas reales posteriores a la implementación y agregá meta.frontier.tests como array no vacío. Cada entrada debe tener name, status=PASS y evidence_ref concreto. Un análisis, diff o afirmación sin ejecución no cuenta como prueba. Si no podés obtener PASS, no declares IMPLEMENTED.';
begin
  if new.project_id='PRODUCTIVE-FRONTIER-01'
     and new.job_key like 'FR-%'
     and position(v_marker in coalesce(new.instruction,''))=0 then
    new.instruction := coalesce(new.instruction,'') || v_contract;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prometeo_frontier_test_evidence_contract_v1
on public.prometeo_jobs;

create trigger trg_prometeo_frontier_test_evidence_contract_v1
before insert or update of instruction on public.prometeo_jobs
for each row
execute function public.prometeo_frontier_test_evidence_contract();

update public.prometeo_jobs
set instruction=instruction
where project_id='PRODUCTIVE-FRONTIER-01'
  and status='READY'
  and job_key like 'FR-%'
  and position('TEST_EVIDENCE_V1' in coalesce(instruction,''))=0;

create or replace function public.prometeo_frontier_test_evidence_gate_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_instruction text;
  v_check jsonb;
begin
  if new.project_id <> 'PRODUCTIVE-FRONTIER-01' then
    return new;
  end if;

  select j.instruction into v_instruction
  from public.prometeo_jobs j
  where j.project_id=new.project_id
    and j.job_key=new.job_key
  limit 1;

  if position('TEST_EVIDENCE_V1' in coalesce(v_instruction,''))=0 then
    return new;
  end if;

  v_check := public.prometeo_frontier_test_evidence_validate(coalesce(new.meta,'{}'::jsonb));
  if coalesce((v_check->>'ok')::boolean,false) is not true then
    raise exception 'FRONTIER_TEST_EVIDENCE_REJECTED: %', v_check::text
      using errcode='P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prometeo_frontier_test_evidence_gate_v1
on public.prometeo_outputs;

create trigger trg_prometeo_frontier_test_evidence_gate_v1
before insert on public.prometeo_outputs
for each row
execute function public.prometeo_frontier_test_evidence_gate_trg();

create or replace function public.prometeo_frontier_test_evidence_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_missing jsonb;
  v_invalid jsonb;
  v_valid jsonb;
  v_ready_missing integer;
begin
  v_missing := public.prometeo_frontier_test_evidence_validate(
    '{"frontier":{"outcome":"IMPLEMENTED"}}'::jsonb
  );
  v_invalid := public.prometeo_frontier_test_evidence_validate(
    '{"frontier":{"outcome":"IMPLEMENTED","tests":[{"name":"smoke","status":"FAIL","evidence_ref":"smoke:fail"}]}}'::jsonb
  );
  v_valid := public.prometeo_frontier_test_evidence_validate(
    '{"frontier":{"outcome":"IMPLEMENTED","tests":[{"name":"smoke","status":"PASS","evidence_ref":"smoke:pass"}]}}'::jsonb
  );

  select count(*) into v_ready_missing
  from public.prometeo_jobs
  where project_id='PRODUCTIVE-FRONTIER-01'
    and status='READY'
    and job_key like 'FR-%'
    and position('TEST_EVIDENCE_V1' in coalesce(instruction,''))=0;

  if coalesce((v_missing->>'ok')::boolean,true) is not false
     or v_missing->>'state' <> 'TEST_EVIDENCE_REQUIRED'
     or coalesce((v_invalid->>'ok')::boolean,true) is not false
     or v_invalid->>'state' <> 'TEST_EVIDENCE_INVALID'
     or coalesce((v_valid->>'ok')::boolean,false) is not true
     or v_valid->>'state' <> 'TEST_EVIDENCE_VALID'
     or v_ready_missing <> 0 then
    raise exception 'frontier test evidence smoke failed: missing %, invalid %, valid %, ready_missing %',
      v_missing,v_invalid,v_valid,v_ready_missing;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FRONTIER_TEST_EVIDENCE_SMOKE_OK',
    'missing_rejected',true,
    'failing_test_rejected',true,
    'passing_test_accepted',true,
    'ready_jobs_without_contract',v_ready_missing
  );
end;
$$;

comment on function public.prometeo_frontier_test_evidence_validate(jsonb) is
  'BACKLOG-182: validates structured post-implementation test evidence for Productive Frontier outputs.';
comment on function public.prometeo_frontier_test_evidence_gate_trg() is
  'BACKLOG-182: rejects IMPLEMENTED outputs for TEST_EVIDENCE_V1 jobs unless every declared test is PASS with evidence_ref.';
