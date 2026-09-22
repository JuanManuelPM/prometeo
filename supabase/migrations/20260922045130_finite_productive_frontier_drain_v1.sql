-- CORE-V1 · FRONTIER
-- Finite Productive Frontier: expansion while durable NEW sources exist, drain once source inventory is exhausted.
-- Keeps CONTROL and PRODUCTION separated through work_plane and prevents growth-guide churn during drain.

create or replace view public.prometeo_frontier_metrics as
with active_projects as (
  select project_id,title,objective,status,priority,min_parallelism,desired_parallelism,
         max_parallelism,allow_spawn,max_jobs,auto_close,created_at,started_at,finished_at,work_plane
  from public.prometeo_projects
  where status in ('OPEN','RUNNING','DRAINING')
), prod_projects as (
  select coalesce(sum(desired_parallelism),0)::integer as desired,
         coalesce(sum(max_parallelism),0)::integer as max_parallel
  from active_projects
  where work_plane='PRODUCTION'
), prod_jobs as (
  select count(j.*) filter(where j.status='READY')::integer as ready,
         count(j.*) filter(where j.status='LEASED' and j.lease_expires_at>now())::integer as leased
  from public.prometeo_jobs j
  join active_projects p on p.project_id=j.project_id
  where p.work_plane='PRODUCTION'
), leases as (
  select count(j.*) filter(where j.status='LEASED' and j.lease_expires_at>now())::integer as all_leased,
         count(j.*) filter(where j.status='LEASED' and j.lease_expires_at>now() and p.work_plane='CONTROL')::integer as control_leased,
         count(j.*) filter(where j.status='LEASED' and j.lease_expires_at>now() and p.work_plane='PRODUCTION')::integer as production_leased
  from public.prometeo_jobs j
  join public.prometeo_projects p on p.project_id=j.project_id
), recent as (
  select
    (select count(*) from public.prometeo_outputs o join public.prometeo_projects p on p.project_id=o.project_id
      where p.work_plane='PRODUCTION' and o.published_at>now()-interval '1 hour')::integer as completed_60m,
    (select count(*) from public.prometeo_events e join public.prometeo_projects p on p.project_id=e.project_id
      where p.work_plane='PRODUCTION' and e.event_type='JOB_SPAWNED' and e.created_at>now()-interval '1 hour')::integer as spawned_60m,
    (select count(*) from public.prometeo_outputs o join public.prometeo_projects p on p.project_id=o.project_id
      where p.work_plane='PRODUCTION' and o.published_at>now()-interval '15 minutes')::integer as outputs_15m
), src as (
  select count(*) filter(where state='NEW')::integer as unused,
         count(*) filter(where state='MATERIALIZED')::integer as materialized,
         count(*) filter(where state='DONE')::integer as done
  from public.prometeo_frontier_sources
)
select
  prod_jobs.ready as production_ready,
  prod_jobs.leased as production_leased,
  greatest(1,prod_projects.desired) as production_desired,
  prod_projects.max_parallel as production_max_parallel,
  round(prod_jobs.ready::numeric / greatest(1,prod_projects.desired)::numeric,2) as frontier_ratio,
  recent.completed_60m,
  recent.spawned_60m,
  case when recent.completed_60m=0 then 0::numeric
       else round(recent.spawned_60m::numeric/recent.completed_60m::numeric,2) end as productive_branching,
  leases.all_leased,
  leases.control_leased,
  case when leases.all_leased=0 then 0::numeric
       else round(leases.control_leased::numeric/leases.all_leased::numeric,2) end as meta_share,
  recent.outputs_15m as productive_outputs_15m,
  src.unused as unused_sources,
  src.materialized as materialized_sources,
  src.done as completed_sources,
  case
    when src.unused=0 then 'DRAIN_FRONTIER'
    when (prod_jobs.ready::numeric/greatest(1,prod_projects.desired)::numeric)<2 then 'EXPAND_FRONTIER'
    when leases.all_leased>=5 and (leases.control_leased::numeric/greatest(1,leases.all_leased)::numeric)>0.20 then 'REDUCE_CONTROL'
    when recent.completed_60m>=5 and (recent.spawned_60m::numeric/greatest(1,recent.completed_60m)::numeric)<0.8 then 'DISCOVERY_MODE'
    when (prod_jobs.ready::numeric/greatest(1,prod_projects.desired)::numeric)>=3 then 'SCALE_WORKERS'
    else 'BALANCED'
  end as growth_mode,
  now() as server_time
from prod_projects,prod_jobs,leases,recent,src;

create or replace function public.prometeo_project_spawn_policy(p_project_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  p public.prometeo_projects%rowtype;
  m public.prometeo_frontier_metrics%rowtype;
begin
  select * into p
  from public.prometeo_projects
  where project_id=p_project_id;

  if not found then
    return jsonb_build_object('ok',false,'allowed',false,'reason','PROJECT_NOT_FOUND','project_id',p_project_id);
  end if;

  if not p.allow_spawn then
    return jsonb_build_object('ok',true,'allowed',false,'reason','PROJECT_SPAWN_DISABLED','project_id',p_project_id);
  end if;

  if p_project_id='PRODUCTIVE-FRONTIER-01' then
    select * into m from public.prometeo_frontier_metrics limit 1;
    if coalesce(m.unused_sources,0)=0 then
      return jsonb_build_object(
        'ok',true,'allowed',false,'reason','FRONTIER_SOURCE_INVENTORY_EXHAUSTED',
        'project_id',p_project_id,'growth_mode',m.growth_mode,
        'unused_sources',m.unused_sources,'materialized_sources',m.materialized_sources,'completed_sources',m.completed_sources
      );
    end if;
  end if;

  return jsonb_build_object('ok',true,'allowed',true,'reason','SPAWN_OPEN','project_id',p_project_id);
end;
$$;

create or replace function public.prometeo_publish_v1_core(
  p_agent_id text,
  p_lease_token text,
  p_output text,
  p_meta jsonb default '{}'::jsonb,
  p_children jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v jsonb;
  v_gate jsonb;
  v_meta jsonb:=coalesce(p_meta,'{}'::jsonb);
  v_project_id text;
  v_spawn_policy jsonb;
begin
  if jsonb_typeof(coalesce(p_children,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(p_children,'[]'::jsonb))>0 then
    select project_id into v_project_id
    from public.prometeo_jobs
    where lease_token=p_lease_token
      and status='LEASED'
      and assigned_agent_id=p_agent_id
    limit 1;

    if v_project_id is not null then
      v_spawn_policy:=public.prometeo_project_spawn_policy(v_project_id);
      if coalesce((v_spawn_policy->>'allowed')::boolean,false) is not true then
        return public.prometeo_contract_response(
          p_agent_id,
          jsonb_build_object(
            'ok',false,'state','RETRY_CHILDREN',
            'error','effective spawn policy is closed',
            'lease_token',p_lease_token,
            'spawn_policy',v_spawn_policy
          )
        );
      end if;
    end if;
  end if;

  v_gate:=public.forge_deep_skill_pre_publish(
    p_agent_id,p_lease_token,p_output,p_meta,p_children
  );

  if coalesce((v_gate->>'ok')::boolean,false) is not true then
    return public.prometeo_contract_response(
      p_agent_id,
      coalesce(v_gate,'{}'::jsonb)||jsonb_build_object('lease_token',p_lease_token)
    );
  end if;

  if v_gate->>'state'='DEEP_SKILL_PRE_PUBLISH_OK' then
    v_meta:=jsonb_set(v_meta,'{deep_skill_receipt}',v_gate->'receipt',true);
  end if;

  v:=public.prometeo_publish_core(
    p_agent_id,p_lease_token,p_output,v_meta,p_children
  );

  if v->>'state' in ('PUBLISHED_AND_STOPPED','STOPPED') then
    update public.prometeo_worker_sessions
    set final_state=v->>'state',closed_at=coalesce(closed_at,now()),last_seen_at=now()
    where agent_id=p_agent_id;
  elsif v->>'state'='PUBLISHED_AND_NEXT'
        and v->'next'->>'state'='WORK' then
    update public.prometeo_worker_sessions
    set consecutive_waits=0,last_seen_at=now()
    where agent_id=p_agent_id and protocol_version='OBEY-v2';
  end if;

  return public.prometeo_contract_response(p_agent_id,v);
end
$$;

create or replace function public.prometeo_frontier_compile_output_branches_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_policy jsonb;
begin
  if new.project_id='PRODUCTIVE-FRONTIER-01'
     and jsonb_typeof(new.meta #> '{frontier,branch_candidates}')='array' then
    v_policy:=public.prometeo_project_spawn_policy(new.project_id);

    if coalesce((v_policy->>'allowed')::boolean,false) is true then
      perform public.prometeo_frontier_compile_branch_candidates_v1(
        jsonb_build_object(
          'project_id',new.project_id,
          'job_key',new.job_key,
          'generation',new.generation
        ),
        new.meta #> '{frontier,branch_candidates}',
        3
      );
    else
      insert into public.prometeo_events(worker_code,project_id,job_key,event_type,payload)
      values(new.worker_code,new.project_id,new.job_key,'FRONTIER_BRANCH_SUPPRESSED',v_policy);
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

create or replace function public.prometeo_maybe_schedule_growth_guide()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m public.prometeo_frontier_metrics%rowtype;
  v_last timestamptz;
  v_job text;
  v_instruction text;
  v_questions jsonb;
begin
  select * into m from public.prometeo_frontier_metrics limit 1;

  if m.growth_mode='DRAIN_FRONTIER' then
    return jsonb_build_object('state','DRAIN_MODE','growth_mode',m.growth_mode,'metrics',to_jsonb(m));
  end if;

  if exists(
    select 1 from public.prometeo_jobs
    where project_id='GUIDE-SENTINEL-01' and status in ('READY','LEASED')
  ) then
    return jsonb_build_object('state','GUIDE_ALREADY_PENDING','growth_mode',m.growth_mode);
  end if;

  select max(created_at) into v_last
  from public.prometeo_growth_guide_runs;

  if v_last is not null and v_last>now()-interval '8 minutes' then
    return jsonb_build_object('state','COOLDOWN','growth_mode',m.growth_mode,'last_growth_guide_at',v_last);
  end if;

  if m.growth_mode='BALANCED' then
    return jsonb_build_object('state','NO_GROWTH_TRIGGER','metrics',to_jsonb(m));
  end if;

  v_job:='GROWTH-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MI');

  v_questions:=case m.growth_mode
    when 'EXPAND_FRONTIER' then jsonb_build_array(
      '¿Qué objetivos durables todavía no tienen ramas ejecutables independientes?',
      '¿Cómo llevamos la frontera a 3–5× desired workers sin fabricar busywork?',
      '¿Qué fuentes reales pueden convertirse inmediatamente en trabajo verificable?'
    )
    when 'REDUCE_CONTROL' then jsonb_build_array(
      '¿Qué trabajo de control puede pausarse, compactarse o convertirse en código determinista?',
      '¿Por qué más del 20% de los leases está en meta/control mientras existe frontera productiva?',
      '¿Qué workers deberían volver a producción después de publicar su lease actual?'
    )
    when 'DISCOVERY_MODE' then jsonb_build_array(
      '¿Por qué los outputs consumen ramas pero casi no descubren nuevas?',
      '¿Qué tipos de trabajo deberían producir children útiles y no lo están haciendo?',
      '¿Qué cambio de contrato aumenta productive_branching sin incentivar spam?'
    )
    when 'SCALE_WORKERS' then jsonb_build_array(
      'Si duplicamos workers ahora, ¿qué cuello aparece primero?',
      '¿La frontera es suficientemente independiente para escalar sin concentración?',
      '¿Qué capacidad productiva adicional puede absorberse ya con el mismo prompt humano?'
    )
    else jsonb_build_array(
      '¿Qué limita el crecimiento útil ahora?',
      '¿Qué cambio produce el mayor aumento de frontier width o throughput durable?'
    )
  end;

  v_instruction :=
    'GUIDE MODE: GROWTH / 10X. No hagas el trabajo de un worker común. '||
    'Tu misión es aumentar el crecimiento PRODUCTIVO de Prometeo sin sacrificar evidencia. '||
    'Inspeccioná prometeo_frontier_metrics, prometeo_frontier_sources, proyectos/jobs/outputs y estado real del repo. '||
    'Respondé las preguntas de foco. '||
    'Podés hacer cambios pequeños, reversibles y verificables directamente. '||
    'Si descubrís trabajo profundo, delegalo en PRODUCTIVE-FRONTIER-01 o creá fuentes/jobs deduplicados; no lo resuelvas todo vos. '||
    'Aplicá estas invariantes: frontier objetivo 3–5× desired production workers; meta_share objetivo <=20% cuando haya producción disponible; '||
    'productive_branching deseable >=1 mientras queden objetivos amplios; no fabricar busywork; no medir calidad por palabras. '||
    'Preguntate explícitamente: (1) 10X: si aparecieran 100 workers, ¿qué los frenaría? '||
    '(2) CEO: ¿qué ramas mueven más objetivos reales? '||
    '(3) SIMPLIFIER: ¿qué IA debería convertirse en función determinista? '||
    '(4) ADVERSARIAL: ¿qué métrica nos está haciendo sentir progreso sin producirlo? '||
    'Antes de publicar, volvé a consultar prometeo_frontier_metrics y dejá before/after. '||
    'En meta.guide_report incluí decision GO|HOLD|STOP, headline, findings[], actions_taken[], jobs_created[], questions_answered[], evidence[], next_actions[].';

  perform public.prometeo_add_job(
    'GUIDE-SENTINEL-01',
    v_job,
    'Growth Guide · '||m.growth_mode,
    'Pegar un volantazo de crecimiento basado en frontier, branching, meta share y capacidad.',
    v_instruction,
    jsonb_build_object(
      'guide_mode','GROWTH',
      'growth_mode',m.growth_mode,
      'metrics_before',to_jsonb(m),
      'focus_questions',v_questions
    ),
    1200,0,1200,700,1800,'[]'::jsonb
  );

  insert into public.prometeo_growth_guide_runs(guide_job_key,mode,metrics)
  values(v_job,m.growth_mode,to_jsonb(m));

  return jsonb_build_object(
    'state','GROWTH_GUIDE_SCHEDULED',
    'job_key',v_job,
    'growth_mode',m.growth_mode,
    'questions',v_questions,
    'metrics',to_jsonb(m)
  );
end;
$$;

create or replace function public.prometeo_finite_frontier_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  m public.prometeo_frontier_metrics%rowtype;
  pf jsonb;
  closeout jsonb;
  v_pf_plane text;
  v_control_plane text;
begin
  select * into m from public.prometeo_frontier_metrics limit 1;
  pf:=public.prometeo_project_spawn_policy('PRODUCTIVE-FRONTIER-01');
  closeout:=public.prometeo_project_spawn_policy('PROMETEO-CORE-V1-CLOSEOUT');

  select work_plane into v_pf_plane from public.prometeo_projects where project_id='PRODUCTIVE-FRONTIER-01';
  select work_plane into v_control_plane from public.prometeo_projects where project_id='GUIDE-SENTINEL-01';

  if coalesce(m.unused_sources,0)=0 and coalesce((pf->>'allowed')::boolean,true) is not false then
    raise exception 'finite frontier smoke: spawn remained open with no unused sources';
  end if;

  if coalesce(m.unused_sources,0)>0 and coalesce((pf->>'allowed')::boolean,false) is not true then
    raise exception 'finite frontier smoke: spawn closed while source inventory remains';
  end if;

  if coalesce((closeout->>'allowed')::boolean,true) is not false
     or closeout->>'reason' <> 'PROJECT_SPAWN_DISABLED' then
    raise exception 'finite frontier smoke: project allow_spawn=false not enforced';
  end if;

  if v_pf_plane <> 'PRODUCTION' or v_control_plane <> 'CONTROL' then
    raise exception 'finite frontier smoke: work planes not separated';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FINITE_FRONTIER_SMOKE_OK',
    'growth_mode',m.growth_mode,
    'unused_sources',m.unused_sources,
    'materialized_sources',m.materialized_sources,
    'completed_sources',m.completed_sources,
    'frontier_policy',pf,
    'closeout_policy',closeout,
    'production_plane',v_pf_plane,
    'control_plane',v_control_plane
  );
end;
$$;

select public.prometeo_finite_frontier_smoke_test();
