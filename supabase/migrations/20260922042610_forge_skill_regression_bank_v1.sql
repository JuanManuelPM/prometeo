create or replace function public.forge_skill_regression_register_case(
  p_skill_id text,
  p_created_from_version_no integer,
  p_source_kind text,
  p_source_ref text,
  p_fixture jsonb,
  p_hard_invariants jsonb default '[]'::jsonb,
  p_oracle_type text default 'DETERMINISTIC',
  p_expected_receipts jsonb default '[]'::jsonb,
  p_dedupe_key text default null,
  p_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_case_id uuid;
  v_dedupe_key text;
begin
  if coalesce(btrim(p_skill_id), '') = '' then
    raise exception 'skill_id is required';
  end if;
  if p_created_from_version_no is null or p_created_from_version_no < 1 then
    raise exception 'created_from_version_no must be >= 1';
  end if;
  if coalesce(btrim(p_source_ref), '') = '' then
    raise exception 'source_ref is required';
  end if;
  if jsonb_typeof(coalesce(p_fixture, 'null'::jsonb)) <> 'object' then
    raise exception 'fixture must be a JSON object';
  end if;
  if jsonb_typeof(coalesce(p_hard_invariants, 'null'::jsonb)) <> 'array' then
    raise exception 'hard_invariants must be a JSON array';
  end if;
  if jsonb_typeof(coalesce(p_expected_receipts, 'null'::jsonb)) <> 'array' then
    raise exception 'expected_receipts must be a JSON array';
  end if;
  if jsonb_typeof(coalesce(p_provenance, 'null'::jsonb)) <> 'object' then
    raise exception 'provenance must be a JSON object';
  end if;

  v_dedupe_key := coalesce(nullif(btrim(p_dedupe_key), ''), p_source_kind || ':' || p_source_ref);

  insert into public.forge_skill_regression_cases(
    skill_id, source_kind, source_ref, fixture, hard_invariants, oracle_type,
    expected_receipts, created_from_version_no, dedupe_key, provenance
  )
  values (
    p_skill_id, p_source_kind, p_source_ref, p_fixture, p_hard_invariants, p_oracle_type,
    p_expected_receipts, p_created_from_version_no, v_dedupe_key, p_provenance
  )
  on conflict (skill_id, dedupe_key)
    where status in ('ACTIVE','QUARANTINED')
  do update set updated_at = public.forge_skill_regression_cases.updated_at
  returning case_id into v_case_id;

  return jsonb_build_object(
    'ok', true,
    'case_id', v_case_id,
    'skill_id', p_skill_id,
    'dedupe_key', v_dedupe_key
  );
end;
$$;

create or replace function public.forge_skill_regression_suite(p_skill_id text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'skill_id', p_skill_id,
    'case_count', count(*),
    'cases', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'case_id', c.case_id,
          'source_kind', c.source_kind,
          'source_ref', c.source_ref,
          'fixture', c.fixture,
          'preconditions', c.preconditions,
          'hard_invariants', c.hard_invariants,
          'soft_metrics', c.soft_metrics,
          'oracle_type', c.oracle_type,
          'expected_receipts', c.expected_receipts,
          'setup_contract', c.setup_contract,
          'teardown_contract', c.teardown_contract,
          'created_from_version_no', c.created_from_version_no,
          'last_verified_version_no', c.last_verified_version_no,
          'dedupe_key', c.dedupe_key,
          'provenance', c.provenance
        )
        order by c.created_at, c.case_id
      ),
      '[]'::jsonb
    )
  )
  from public.forge_skill_regression_cases c
  where c.skill_id = p_skill_id and c.status = 'ACTIVE';
$$;

create or replace function public.forge_skill_regression_record_run(
  p_skill_id text,
  p_candidate_version integer,
  p_baseline_version integer,
  p_case_outcomes jsonb,
  p_receipts jsonb default '[]'::jsonb,
  p_worker_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_run_id uuid;
  v_selected_cases jsonb;
  v_case_count integer;
  v_missing integer;
  v_unknown integer;
  v_duplicate integer;
  v_invalid_result integer;
  v_failures integer;
  v_inconclusive integer;
  v_violations jsonb;
  v_conclusion text;
begin
  if coalesce(btrim(p_skill_id), '') = '' then
    raise exception 'skill_id is required';
  end if;
  if p_candidate_version is null or p_candidate_version < 1
     or p_baseline_version is null or p_baseline_version < 1 then
    raise exception 'candidate_version and baseline_version must be >= 1';
  end if;
  if jsonb_typeof(coalesce(p_case_outcomes, 'null'::jsonb)) <> 'array' then
    raise exception 'case_outcomes must be a JSON array';
  end if;
  if jsonb_typeof(coalesce(p_receipts, 'null'::jsonb)) <> 'array' then
    raise exception 'receipts must be a JSON array';
  end if;
  if jsonb_typeof(coalesce(p_worker_provenance, 'null'::jsonb)) <> 'object' then
    raise exception 'worker_provenance must be a JSON object';
  end if;

  perform 1 from public.forge_skill_versions
   where skill_id = p_skill_id and version_no = p_candidate_version;
  if not found then
    raise exception 'candidate version %/% does not exist', p_skill_id, p_candidate_version;
  end if;

  perform 1 from public.forge_skill_versions
   where skill_id = p_skill_id and version_no = p_baseline_version;
  if not found then
    raise exception 'baseline version %/% does not exist', p_skill_id, p_baseline_version;
  end if;

  select count(*),
         coalesce(jsonb_agg(
           jsonb_build_object(
             'case_id', c.case_id,
             'dedupe_key', c.dedupe_key,
             'oracle_type', c.oracle_type,
             'expected_receipts', c.expected_receipts
           ) order by c.created_at, c.case_id
         ), '[]'::jsonb)
    into v_case_count, v_selected_cases
  from public.forge_skill_regression_cases c
  where c.skill_id = p_skill_id and c.status = 'ACTIVE';

  select count(*) into v_missing
  from public.forge_skill_regression_cases c
  where c.skill_id = p_skill_id
    and c.status = 'ACTIVE'
    and not exists (
      select 1 from jsonb_array_elements(p_case_outcomes) o
      where o->>'case_id' = c.case_id::text
    );

  select count(*) into v_unknown
  from jsonb_array_elements(p_case_outcomes) o
  where not exists (
    select 1
    from public.forge_skill_regression_cases c
    where c.skill_id = p_skill_id
      and c.status = 'ACTIVE'
      and c.case_id::text = o->>'case_id'
  );

  select count(*) - count(distinct o->>'case_id')
    into v_duplicate
  from jsonb_array_elements(p_case_outcomes) o;

  select count(*) into v_invalid_result
  from jsonb_array_elements(p_case_outcomes) o
  where coalesce(o->>'result', '') not in ('PASS','FAIL','INCONCLUSIVE');

  if v_missing > 0 then
    raise exception 'case_outcomes missing % active cases', v_missing;
  end if;
  if v_unknown > 0 then
    raise exception 'case_outcomes contains % unknown/non-active cases', v_unknown;
  end if;
  if v_duplicate > 0 then
    raise exception 'case_outcomes contains % duplicate case ids', v_duplicate;
  end if;
  if v_invalid_result > 0 then
    raise exception 'case_outcomes contains % invalid results', v_invalid_result;
  end if;

  select count(*) filter (where o->>'result' = 'FAIL'),
         count(*) filter (where o->>'result' = 'INCONCLUSIVE')
    into v_failures, v_inconclusive
  from jsonb_array_elements(p_case_outcomes) o;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'case_id', o->>'case_id',
        'hard_invariant_violations', coalesce(o->'hard_invariant_violations', '[]'::jsonb)
      )
    ) filter (where o->>'result' = 'FAIL'),
    '[]'::jsonb
  )
  into v_violations
  from jsonb_array_elements(p_case_outcomes) o;

  v_conclusion := case
    when v_case_count = 0 then 'INCONCLUSIVE'
    when v_failures > 0 then 'PROMOTION_BLOCKED'
    when v_inconclusive > 0 then 'INCONCLUSIVE'
    else 'PROMOTION_ELIGIBLE'
  end;

  insert into public.forge_skill_regression_runs(
    skill_id, candidate_version, baseline_version, selected_cases, case_outcomes,
    receipts, hard_invariant_violations, worker_provenance, conclusion, finished_at
  )
  values (
    p_skill_id, p_candidate_version, p_baseline_version, v_selected_cases, p_case_outcomes,
    p_receipts, v_violations, p_worker_provenance, v_conclusion, now()
  )
  returning run_id into v_run_id;

  update public.forge_skill_regression_cases c
     set last_verified_version_no = p_candidate_version,
         last_verified_at = now(),
         updated_at = now()
   where c.skill_id = p_skill_id
     and c.status = 'ACTIVE'
     and exists (
       select 1 from jsonb_array_elements(p_case_outcomes) o
       where o->>'case_id' = c.case_id::text and o->>'result' = 'PASS'
     );

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run_id,
    'skill_id', p_skill_id,
    'candidate_version', p_candidate_version,
    'baseline_version', p_baseline_version,
    'case_count', v_case_count,
    'failures', v_failures,
    'inconclusive', v_inconclusive,
    'conclusion', v_conclusion
  );
end;
$$;

create or replace function public.forge_skill_regression_smoke_test()
returns jsonb
language plpgsql
as $$
declare
  v_skill_id text := '__REGRESSION_SMOKE_' || replace(gen_random_uuid()::text, '-', '');
  v_case_id uuid;
  v_suite jsonb;
  v_pass jsonb;
  v_fail jsonb;
begin
  insert into public.forge_skills(skill_id, name, purpose, provenance)
  values (v_skill_id, 'Regression smoke fixture', 'Ephemeral regression-bank self-test', '{"smoke":true}'::jsonb);

  insert into public.forge_skill_versions(skill_id, version_no, provenance)
  values (v_skill_id, 1, '{"smoke":true}'::jsonb);

  v_case_id := (public.forge_skill_regression_register_case(
    v_skill_id, 1, 'MANUAL_FIXTURE', 'smoke://case/1',
    '{"input":"known","expected":"known"}'::jsonb,
    '["output must equal expected"]'::jsonb,
    'DETERMINISTIC', '[]'::jsonb, 'smoke-case-1', '{"smoke":true}'::jsonb
  )->>'case_id')::uuid;

  v_suite := public.forge_skill_regression_suite(v_skill_id);

  v_pass := public.forge_skill_regression_record_run(
    v_skill_id, 1, 1,
    jsonb_build_array(jsonb_build_object('case_id', v_case_id, 'result', 'PASS')),
    '[]'::jsonb,
    '{"smoke":true,"variant":"pass"}'::jsonb
  );

  v_fail := public.forge_skill_regression_record_run(
    v_skill_id, 1, 1,
    jsonb_build_array(jsonb_build_object(
      'case_id', v_case_id,
      'result', 'FAIL',
      'hard_invariant_violations', jsonb_build_array('synthetic-smoke-failure')
    )),
    '[]'::jsonb,
    '{"smoke":true,"variant":"fail"}'::jsonb
  );

  delete from public.forge_skill_regression_runs where skill_id = v_skill_id;
  delete from public.forge_skill_regression_cases where skill_id = v_skill_id;
  delete from public.forge_skills where skill_id = v_skill_id;

  return jsonb_build_object(
    'ok',
      (v_suite->>'case_count')::integer = 1
      and v_pass->>'conclusion' = 'PROMOTION_ELIGIBLE'
      and v_fail->>'conclusion' = 'PROMOTION_BLOCKED',
    'suite_case_count', (v_suite->>'case_count')::integer,
    'pass_conclusion', v_pass->>'conclusion',
    'fail_conclusion', v_fail->>'conclusion',
    'residue_expected', 0
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

comment on function public.forge_skill_regression_register_case(text,integer,text,text,jsonb,jsonb,text,jsonb,text,jsonb) is
  'BACKLOG-205 deterministic idempotent registration API for reusable Skill regression fixtures.';
comment on function public.forge_skill_regression_suite(text) is
  'BACKLOG-205 active regression suite projection for one Skill.';
comment on function public.forge_skill_regression_record_run(text,integer,integer,jsonb,jsonb,jsonb) is
  'BACKLOG-205 records a complete candidate-vs-baseline regression result and derives promotion eligibility from PASS/FAIL/INCONCLUSIVE case outcomes.';
comment on function public.forge_skill_regression_smoke_test() is
  'BACKLOG-205 self-cleaning smoke test for registration, suite selection and deterministic regression conclusions.';
