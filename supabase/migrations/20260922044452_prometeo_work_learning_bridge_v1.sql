-- BACKLOG-249 · Trabajo genera aprendizaje
-- Durable bridge from explicit reusable learnings in Prometeo outputs into runtime learning.

create table if not exists public.prometeo_work_learnings (
  learning_ref text primary key,
  project_id text not null,
  job_key text not null,
  generation integer not null default 0,
  worker_code text not null,
  learning_no integer not null check (learning_no > 0),
  learning_text text not null check (nullif(btrim(learning_text),'') is not null),
  source_meta jsonb not null default '{}'::jsonb,
  output_published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(project_id,job_key,learning_no)
);

create index if not exists prometeo_work_learnings_published_idx
  on public.prometeo_work_learnings(output_published_at desc);

alter table public.prometeo_work_learnings enable row level security;
revoke all on table public.prometeo_work_learnings from anon, authenticated;

create or replace function public.prometeo_capture_work_learning()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_learning jsonb;
begin
  v_learning := new.meta #> '{frontier,reusable_learning}';

  if jsonb_typeof(v_learning)='array' then
    insert into public.prometeo_work_learnings(
      learning_ref,project_id,job_key,generation,worker_code,learning_no,
      learning_text,source_meta,output_published_at
    )
    select
      'WORK:'||new.project_id||':'||new.job_key||':'||x.ord::text,
      new.project_id,new.job_key,new.generation,new.worker_code,x.ord::integer,
      btrim(x.value),new.meta,new.published_at
    from jsonb_array_elements_text(v_learning) with ordinality as x(value,ord)
    where nullif(btrim(x.value),'') is not null
    on conflict(learning_ref) do update
      set learning_text=excluded.learning_text,
          source_meta=excluded.source_meta,
          output_published_at=excluded.output_published_at;
  end if;

  return new;
end;
$$;

drop trigger if exists prometeo_capture_work_learning_after_output on public.prometeo_outputs;
create trigger prometeo_capture_work_learning_after_output
after insert on public.prometeo_outputs
for each row execute function public.prometeo_capture_work_learning();

insert into public.prometeo_work_learnings(
  learning_ref,project_id,job_key,generation,worker_code,learning_no,
  learning_text,source_meta,output_published_at
)
select
  'WORK:'||o.project_id||':'||o.job_key||':'||x.ord::text,
  o.project_id,o.job_key,o.generation,o.worker_code,x.ord::integer,
  btrim(x.value),o.meta,o.published_at
from public.prometeo_outputs o
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(o.meta #> '{frontier,reusable_learning}')='array'
      then o.meta #> '{frontier,reusable_learning}'
    else '[]'::jsonb
  end
) with ordinality as x(value,ord)
where nullif(btrim(x.value),'') is not null
on conflict(learning_ref) do update
  set learning_text=excluded.learning_text,
      source_meta=excluded.source_meta,
      output_published_at=excluded.output_published_at;

create or replace view public.prometeo_work_learning_snapshot as
select jsonb_build_object(
  'generated_at',clock_timestamp(),
  'total',(select count(*) from public.prometeo_work_learnings),
  'distinct_jobs',(select count(distinct (project_id,job_key)) from public.prometeo_work_learnings),
  'recent',(
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
    from (
      select learning_ref,project_id,job_key,generation,worker_code,learning_no,
             learning_text,output_published_at
      from public.prometeo_work_learnings
      order by output_published_at desc,learning_ref
      limit 50
    ) x
  )
) as snapshot;

revoke all on public.prometeo_work_learning_snapshot from anon, authenticated;

create or replace view public.prometeo_runtime_learning_snapshot as
select jsonb_build_object(
  'generated_at',clock_timestamp(),
  'postmortems',jsonb_build_object(
    'total',(select count(*) from public.prometeo_worker_postmortems),
    'by_terminal_phase',(
      select coalesce(jsonb_object_agg(coalesce(x.terminal_phase,'UNKNOWN'),x.n),'{}'::jsonb)
      from (
        select terminal_phase,count(*) as n
        from public.prometeo_worker_postmortems
        group by terminal_phase
      ) x
    ),
    'avg_work_pct',(select round(avg(work_pct),1) from public.prometeo_worker_postmortems),
    'avg_wait_pct',(select round(avg(wait_pct),1) from public.prometeo_worker_postmortems)
  ),
  'survivors',jsonb_build_object(
    'candidates',(select count(*) from public.prometeo_positive_survival_candidates),
    'top',(
      select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
      from (
        select worker_code,protocol_version,launch_batch,publish_count,work_pct,wait_pct,
               tool_failure_count,observed_ms
        from public.prometeo_positive_survival_candidates
        limit 10
      ) x
    )
  ),
  'work_learnings',(select snapshot from public.prometeo_work_learning_snapshot)
) as snapshot;

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

  v_work_to_learning :=
    to_regclass('public.prometeo_work_learnings') is not null
    and to_regclass('public.prometeo_work_learning_snapshot') is not null
    and exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='prometeo_outputs'
        and t.tgname='prometeo_capture_work_learning_after_output'
        and not t.tgisinternal
    );

  select coalesce(bool_or(
      p.proname not in (
        'prometeo_self_hosting_readiness_v1',
        'forge_skill_candidate_from_learning',
        'forge_skill_candidate_from_learning_smoke_test'
      )
      and p.prosrc ilike '%forge_skill_candidate_from_learning%'
      and (
        p.prosrc ilike '%prometeo_work_learnings%'
        or p.prosrc ilike '%prometeo_runtime_learning_snapshot%'
      )
    ),false)
    into v_learning_to_skill
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public';

  select coalesce(bool_or(
      p.proname not in (
        'prometeo_self_hosting_readiness_v1',
        'forge_skill_propose_evolution'
      )
      and p.prosrc ilike '%forge_skill_propose_evolution%'
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
    jsonb_build_object('stage','WORK_TO_LEARNING','ready',v_work_to_learning,'evidence',jsonb_build_array('prometeo_outputs.meta.frontier.reusable_learning','prometeo_capture_work_learning','prometeo_work_learnings')),
    jsonb_build_object('stage','LEARNING_TO_SKILL','ready',v_learning_to_skill,'evidence',jsonb_build_array('automatic work-learning caller of forge_skill_candidate_from_learning')),
    jsonb_build_object('stage','SKILL_TO_IMPROVEMENT','ready',v_skill_to_improvement,'evidence',jsonb_build_array('automatic caller of forge_skill_propose_evolution into frontier/jobs/publish'))
  );

  return jsonb_build_object(
    'ok',true,
    'state','SELF_HOSTING_READINESS',
    'closed_loop',v_closed,
    'ready_count',8-jsonb_array_length(v_missing),
    'total_stages',8,
    'missing_stages',v_missing,
    'stages',v_stages,
    'authority_granted',false
  );
end;
$$;

create or replace function public.prometeo_work_learning_bridge_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_expected bigint;
  v_actual bigint;
  v_trigger boolean;
  v_stage boolean;
begin
  select count(*) into v_expected
  from public.prometeo_outputs o
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(o.meta #> '{frontier,reusable_learning}')='array'
        then o.meta #> '{frontier,reusable_learning}'
      else '[]'::jsonb
    end
  ) as x(value)
  where nullif(btrim(x.value),'') is not null;

  select count(*) into v_actual from public.prometeo_work_learnings;

  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='prometeo_outputs'
      and t.tgname='prometeo_capture_work_learning_after_output'
      and not t.tgisinternal
  ) into v_trigger;

  select coalesce((s->>'ready')::boolean,false) into v_stage
  from jsonb_array_elements(public.prometeo_self_hosting_readiness_v1()->'stages') s
  where s->>'stage'='WORK_TO_LEARNING';

  if not v_trigger or not v_stage or v_actual <> v_expected then
    raise exception 'WORK_LEARNING_BRIDGE_SMOKE_FAILED expected=% actual=% trigger=% stage=%',
      v_expected,v_actual,v_trigger,v_stage;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','WORK_LEARNING_BRIDGE_SMOKE_OK',
    'expected_learning_rows',v_expected,
    'actual_learning_rows',v_actual,
    'trigger','PASS',
    'work_to_learning_stage','PASS'
  );
end;
$$;
