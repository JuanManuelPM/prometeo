-- BACKLOG-253: executable readiness probe for the cognitive self-hosting loop.

create or replace function public.prometeo_self_hosting_readiness_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_goal_to_work boolean;
  v_assign_execute boolean;
  v_test boolean;
  v_publish boolean;
  v_observe boolean;
  v_work_to_learning boolean;
  v_learning_to_skill boolean;
  v_skill_to_improvement boolean;
  v_missing jsonb := '[]'::jsonb;
  v_stages jsonb;
  v_closed boolean;
begin
  v_goal_to_work :=
    to_regclass('public.forge_goals') is not null
    and exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='prometeo_frontier_materialize'
    );

  v_assign_execute :=
    exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='prometeo_bootstrap'
    )
    and exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='prometeo_publish'
    );

  v_test :=
    exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='forge_skill_regression_suite'
    )
    and exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='forge_deterministic_execution_smoke_test'
    );

  v_publish := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='prometeo_publish'
  );

  v_observe :=
    to_regclass('public.prometeo_runtime_learning_snapshot') is not null
    and exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='prometeo_observe_work_state_transition'
    );

  select coalesce(bool_or(p.prosrc ilike '%prometeo_runtime_learning_snapshot%'),false)
    into v_work_to_learning
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('prometeo_publish','prometeo_publish_core','prometeo_publish_v1_core');

  select coalesce(bool_or(
      p.prosrc ilike '%prometeo_runtime_learning_snapshot%'
      and p.prosrc ilike '%forge_skill_candidate_from_learning%'
    ),false)
    into v_learning_to_skill
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public';

  select coalesce(bool_or(
      p.prosrc ilike '%forge_skill_propose_evolution%'
      and (
        p.prosrc ilike '%prometeo_frontier%'
        or p.prosrc ilike '%prometeo_jobs%'
        or p.prosrc ilike '%forge_publish%'
      )
    ),false)
    into v_skill_to_improvement
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public';

  if not v_goal_to_work then v_missing := v_missing || '"GOAL_TO_WORK"'::jsonb; end if;
  if not v_assign_execute then v_missing := v_missing || '"ASSIGN_EXECUTE"'::jsonb; end if;
  if not v_test then v_missing := v_missing || '"TEST"'::jsonb; end if;
  if not v_publish then v_missing := v_missing || '"PUBLISH"'::jsonb; end if;
  if not v_observe then v_missing := v_missing || '"OBSERVE"'::jsonb; end if;
  if not v_work_to_learning then v_missing := v_missing || '"WORK_TO_LEARNING"'::jsonb; end if;
  if not v_learning_to_skill then v_missing := v_missing || '"LEARNING_TO_SKILL"'::jsonb; end if;
  if not v_skill_to_improvement then v_missing := v_missing || '"SKILL_TO_IMPROVEMENT"'::jsonb; end if;

  v_closed := jsonb_array_length(v_missing)=0;

  v_stages := jsonb_build_array(
    jsonb_build_object('stage','GOAL_TO_WORK','ready',v_goal_to_work,'evidence',jsonb_build_array('forge_goals','prometeo_frontier_materialize')),
    jsonb_build_object('stage','ASSIGN_EXECUTE','ready',v_assign_execute,'evidence',jsonb_build_array('prometeo_bootstrap','prometeo_publish')),
    jsonb_build_object('stage','TEST','ready',v_test,'evidence',jsonb_build_array('forge_skill_regression_suite','forge_deterministic_execution_smoke_test')),
    jsonb_build_object('stage','PUBLISH','ready',v_publish,'evidence',jsonb_build_array('prometeo_publish')),
    jsonb_build_object('stage','OBSERVE','ready',v_observe,'evidence',jsonb_build_array('prometeo_observe_work_state_transition','prometeo_runtime_learning_snapshot')),
    jsonb_build_object('stage','WORK_TO_LEARNING','ready',v_work_to_learning,'evidence',jsonb_build_array('publish path references runtime learning snapshot')),
    jsonb_build_object('stage','LEARNING_TO_SKILL','ready',v_learning_to_skill,'evidence',jsonb_build_array('runtime learning snapshot bridged to forge_skill_candidate_from_learning')),
    jsonb_build_object('stage','SKILL_TO_IMPROVEMENT','ready',v_skill_to_improvement,'evidence',jsonb_build_array('forge_skill_propose_evolution bridged to frontier/jobs/publish'))
  );

  return jsonb_build_object(
    'ok',true,'state','SELF_HOSTING_READINESS','closed_loop',v_closed,
    'ready_count',8-jsonb_array_length(v_missing),'total_stages',8,
    'missing_stages',v_missing,'stages',v_stages,'authority_granted',false
  );
end;
$$;

create or replace function public.prometeo_self_hosting_readiness_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_r jsonb;
  v_missing_count integer;
begin
  v_r := public.prometeo_self_hosting_readiness_v1();
  v_missing_count := jsonb_array_length(v_r->'missing_stages');

  if v_r->>'state' <> 'SELF_HOSTING_READINESS'
     or (v_r->>'total_stages')::integer <> 8
     or jsonb_array_length(v_r->'stages') <> 8
     or (v_r->>'ready_count')::integer <> 8-v_missing_count
     or (v_r->>'closed_loop')::boolean <> (v_missing_count=0)
     or v_r->>'authority_granted' <> 'false'
  then
    raise exception 'B253 self-hosting readiness smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,'state','SELF_HOSTING_READINESS_SMOKE_OK',
    'closed_loop',(v_r->>'closed_loop')::boolean,
    'ready_count',(v_r->>'ready_count')::integer,
    'missing_stages',v_r->'missing_stages',
    'shape','PASS','consistency','PASS','authority_granted',false
  );
end;
$$;