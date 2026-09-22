create or replace function public.forge_skill_compiler_patterns(
  p_min_distinct_jobs integer default 2,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_min integer := greatest(coalesce(p_min_distinct_jobs, 2), 2);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_patterns jsonb;
begin
  with steps as (
    select
      l.project_id,
      l.job_key,
      l.worker_code,
      l.learning_ref,
      l.output_published_at,
      e.key as step_key
    from public.prometeo_work_learnings l
    join public.prometeo_jobs j
      on j.project_id = l.project_id
     and j.job_key = l.job_key
    cross join lateral jsonb_each(coalesce(l.source_meta->'work_trace', '{}'::jsonb)) e
    where j.status = 'DONE'
      and l.output_published_at is not null
      and e.value = 'true'::jsonb
      and nullif(btrim(e.key), '') is not null
  ),
  grouped as (
    select
      step_key,
      count(*) as observations,
      count(distinct project_id || ':' || job_key) as distinct_jobs,
      count(distinct worker_code) as distinct_workers,
      min(output_published_at) as first_seen_at,
      max(output_published_at) as last_seen_at,
      jsonb_agg(
        jsonb_build_object(
          'learning_ref', learning_ref,
          'job_ref', project_id || ':' || job_key,
          'worker_code', worker_code
        )
        order by output_published_at, learning_ref
      ) as evidence
    from steps
    group by step_key
    having count(distinct project_id || ':' || job_key) >= v_min
    order by count(distinct project_id || ':' || job_key) desc, count(*) desc, step_key
    limit v_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'schema', 'prometeo.skill-compiler-pattern/v1',
        'pattern_kind', 'WORK_TRACE_TRUE',
        'step_key', step_key,
        'observations', observations,
        'distinct_jobs', distinct_jobs,
        'distinct_workers', distinct_workers,
        'first_seen_at', first_seen_at,
        'last_seen_at', last_seen_at,
        'evidence', evidence
      )
      order by distinct_jobs desc, observations desc, step_key
    ),
    '[]'::jsonb
  )
  into v_patterns
  from grouped;

  return jsonb_build_object(
    'ok', true,
    'state', 'SKILL_COMPILER_PATTERNS',
    'schema', 'prometeo.skill-compiler-patterns/v1',
    'min_distinct_jobs', v_min,
    'pattern_count', jsonb_array_length(v_patterns),
    'patterns', v_patterns
  );
end;
$$;

create or replace function public.forge_skill_compiler_candidate(
  p_pattern jsonb,
  p_authority boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pattern jsonb := coalesce(p_pattern, '{}'::jsonb);
  v_step text;
  v_jobs integer;
  v_workers integer;
  v_evidence jsonb;
  v_hash text;
  v_skill_id text;
  v_learning_ref text;
  v_name text;
  v_learning jsonb;
  v_result jsonb;
begin
  if jsonb_typeof(v_pattern) <> 'object' then
    return jsonb_build_object('ok', false, 'state', 'INVALID_PATTERN', 'reason', 'PATTERN_NOT_OBJECT');
  end if;

  if coalesce(v_pattern->>'pattern_kind', '') <> 'WORK_TRACE_TRUE' then
    return jsonb_build_object('ok', false, 'state', 'INVALID_PATTERN', 'reason', 'UNSUPPORTED_PATTERN_KIND');
  end if;

  v_step := nullif(btrim(v_pattern->>'step_key'), '');
  v_jobs := coalesce((v_pattern->>'distinct_jobs')::integer, 0);
  v_workers := coalesce((v_pattern->>'distinct_workers')::integer, 0);
  v_evidence := coalesce(v_pattern->'evidence', '[]'::jsonb);

  if v_step is null
     or v_jobs < 2
     or jsonb_typeof(v_evidence) <> 'array'
     or jsonb_array_length(v_evidence) < 2
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_PATTERN', 'reason', 'INSUFFICIENT_REPEATED_EVIDENCE');
  end if;

  v_hash := md5(v_step);
  v_skill_id := 'AUTO_STEP_' || upper(substr(v_hash, 1, 12));
  v_learning_ref := 'skill-compiler://work-trace/' || v_hash;
  v_name := 'Learned step: ' || initcap(replace(v_step, '_', ' '));

  v_learning := jsonb_build_object(
    'learning_ref', v_learning_ref,
    'skill_id', v_skill_id,
    'name', v_name,
    'purpose', format(
      'Candidate compiled from repeated successful work_trace step "%s" across %s distinct DONE jobs.',
      v_step,
      v_jobs
    ),
    'inputs_schema', jsonb_build_object('type', 'object'),
    'outputs_schema', jsonb_build_object('type', 'object'),
    'procedure_steps', jsonb_build_array(v_step),
    'rollback_contract', jsonb_build_object(
      'mode', 'versioned',
      'actions', jsonb_build_array(
        'supersede candidate version instead of deleting history',
        'do not promote automatically'
      )
    ),
    'verification_contract', jsonb_build_object(
      'schema', 'prometeo.skill-compiler-verification/v1',
      'pattern_kind', 'WORK_TRACE_TRUE',
      'step_key', v_step,
      'observed_distinct_jobs', v_jobs,
      'observed_distinct_workers', v_workers,
      'acceptance', jsonb_build_array(
        'review procedure semantics before ACCEPTED',
        'retain evidence from at least two distinct successful jobs',
        'run regression or deterministic smoke before ACCEPTED'
      )
    ),
    'evidence_requirements', jsonb_build_array(
      'at least two distinct DONE jobs with the work_trace step true',
      'durable learning/job references for each observation',
      'independent review or regression evidence before ACCEPTED'
    ),
    'evidence', v_evidence,
    'provenance', jsonb_build_object(
      'schema', 'prometeo.skill-compiler-candidate/v1',
      'source_backlog', 'BACKLOG-201',
      'compiler', 'forge_skill_compiler_candidate',
      'pattern_kind', 'WORK_TRACE_TRUE',
      'step_key', v_step,
      'distinct_jobs', v_jobs,
      'distinct_workers', v_workers
    )
  );

  if coalesce(p_authority, false) is not true then
    return jsonb_build_object(
      'ok', true,
      'state', 'SKILL_COMPILER_PREVIEW',
      'mutation_performed', false,
      'skill_id', v_skill_id,
      'learning_ref', v_learning_ref,
      'candidate', v_learning
    );
  end if;

  v_result := public.forge_skill_candidate_from_learning(v_learning);

  return v_result || jsonb_build_object(
    'compiler_state', 'SKILL_COMPILER_CANDIDATE',
    'mutation_performed', coalesce(v_result->>'state', '') = 'SKILL_CANDIDATE_CREATED',
    'pattern_kind', 'WORK_TRACE_TRUE',
    'step_key', v_step,
    'distinct_jobs', v_jobs,
    'distinct_workers', v_workers
  );
end;
$$;

create or replace function public.forge_skill_compiler_compile(
  p_min_distinct_jobs integer default 2,
  p_limit integer default 20,
  p_authority boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_scan jsonb;
  v_pattern jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_created integer := 0;
  v_existing integer := 0;
begin
  v_scan := public.forge_skill_compiler_patterns(p_min_distinct_jobs, p_limit);

  for v_pattern in
    select value
    from jsonb_array_elements(coalesce(v_scan->'patterns', '[]'::jsonb))
  loop
    v_result := public.forge_skill_compiler_candidate(v_pattern, p_authority);
    v_results := v_results || jsonb_build_array(v_result);

    if v_result->>'state' = 'SKILL_CANDIDATE_CREATED' then
      v_created := v_created + 1;
    elsif v_result->>'state' = 'SKILL_CANDIDATE_ALREADY_EXISTS' then
      v_existing := v_existing + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'state', case when coalesce(p_authority, false)
                  then 'SKILL_COMPILER_COMPILED'
                  else 'SKILL_COMPILER_PREVIEW' end,
    'schema', 'prometeo.skill-compiler-run/v1',
    'authority', coalesce(p_authority, false),
    'pattern_count', coalesce((v_scan->>'pattern_count')::integer, 0),
    'created_count', v_created,
    'existing_count', v_existing,
    'results', v_results
  );
end;
$$;

create or replace function public.forge_skill_compiler_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_step text := '__skill_compiler_smoke_' || substr(md5(clock_timestamp()::text), 1, 10);
  v_pattern jsonb;
  v_preview jsonb;
  v_first jsonb;
  v_repeat jsonb;
  v_skill_id text;
begin
  v_pattern := jsonb_build_object(
    'schema', 'prometeo.skill-compiler-pattern/v1',
    'pattern_kind', 'WORK_TRACE_TRUE',
    'step_key', v_step,
    'observations', 2,
    'distinct_jobs', 2,
    'distinct_workers', 2,
    'evidence', jsonb_build_array(
      jsonb_build_object('learning_ref', 'smoke://skill-compiler/1', 'job_ref', 'SMOKE:J1', 'worker_code', 'KSM1'),
      jsonb_build_object('learning_ref', 'smoke://skill-compiler/2', 'job_ref', 'SMOKE:J2', 'worker_code', 'KSM2')
    )
  );

  v_preview := public.forge_skill_compiler_candidate(v_pattern, false);
  v_first := public.forge_skill_compiler_candidate(v_pattern, true);
  v_repeat := public.forge_skill_compiler_candidate(v_pattern, true);
  v_skill_id := v_first->>'skill_id';

  if v_preview->>'state' <> 'SKILL_COMPILER_PREVIEW'
     or coalesce((v_preview->>'mutation_performed')::boolean, true)
     or v_first->>'state' <> 'SKILL_CANDIDATE_CREATED'
     or v_repeat->>'state' <> 'SKILL_CANDIDATE_ALREADY_EXISTS'
     or v_first->>'version_no' <> v_repeat->>'version_no'
     or not exists (
       select 1
       from public.forge_skill_versions
       where skill_id = v_skill_id
         and maturity_state = 'CANDIDATE'
         and provenance->>'source_backlog' = 'BACKLOG-201'
         and provenance->>'step_key' = v_step
     )
  then
    raise exception 'skill compiler smoke failed';
  end if;

  delete from public.forge_skills where skill_id = v_skill_id;

  return jsonb_build_object(
    'ok', true,
    'state', 'SKILL_COMPILER_SMOKE_OK',
    'preview_no_mutation', 'PASS',
    'candidate_created', 'PASS',
    'dedupe', 'PASS',
    'candidate_only', 'PASS',
    'provenance', 'PASS',
    'fixture_cleaned', not exists(select 1 from public.forge_skills where skill_id = v_skill_id)
  );
exception
  when others then
    if v_skill_id is not null then
      delete from public.forge_skills where skill_id = v_skill_id;
    end if;
    raise;
end;
$$;