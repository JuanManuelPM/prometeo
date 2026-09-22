-- CORE-V1 · FRONTIER convergence-aware policy
-- Expansion follows product FILL; CONTRACT/MERGE/VERIFY/DONE force convergence.
-- Restores frontier growth metric semantics and keeps low-level compiler hardening.

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
  v_convergence jsonb;
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

  if p_project_id='PRODUCTIVE-FRONTIER-01'
     and to_regprocedure('public.prometeo_product_convergence_v1(text)') is not null then
    v_convergence:=public.prometeo_product_convergence_v1(null);

    if coalesce((v_convergence->>'suppress_growth_guide')::boolean,false)
       or coalesce((v_convergence->>'terminal')::boolean,false)
       or coalesce(v_convergence->>'effective_growth_mode','') in ('CONVERGE_TO_DONE','STOP') then
      return jsonb_build_object(
        'ok',true,
        'allowed',false,
        'reason','PRODUCT_CONVERGENCE_CLOSED',
        'project_id',p_project_id,
        'convergence',v_convergence
      );
    end if;

    return jsonb_build_object(
      'ok',true,
      'allowed',true,
      'reason','PRODUCT_FILL_OPEN',
      'project_id',p_project_id,
      'convergence',v_convergence
    );
  end if;

  return jsonb_build_object('ok',true,'allowed',true,'reason','SPAWN_OPEN','project_id',p_project_id);
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
  convergence jsonb;
  v_pf_plane text;
  v_control_plane text;
  v_anon_compiler boolean;
  v_should_close boolean;
begin
  select * into m from public.prometeo_frontier_metrics limit 1;
  pf:=public.prometeo_project_spawn_policy('PRODUCTIVE-FRONTIER-01');
  closeout:=public.prometeo_project_spawn_policy('PROMETEO-CORE-V1-CLOSEOUT');
  convergence:=case
    when to_regprocedure('public.prometeo_product_convergence_v1(text)') is not null
      then public.prometeo_product_convergence_v1(null)
    else '{}'::jsonb
  end;

  select work_plane into v_pf_plane from public.prometeo_projects where project_id='PRODUCTIVE-FRONTIER-01';
  select work_plane into v_control_plane from public.prometeo_projects where project_id='GUIDE-SENTINEL-01';

  v_anon_compiler:=has_function_privilege(
    'anon',
    'public.prometeo_frontier_compile_branch_candidates_v1(jsonb,jsonb,integer)',
    'EXECUTE'
  );

  v_should_close:=
    coalesce((convergence->>'suppress_growth_guide')::boolean,false)
    or coalesce((convergence->>'terminal')::boolean,false)
    or coalesce(convergence->>'effective_growth_mode','') in ('CONVERGE_TO_DONE','STOP');

  if v_should_close and coalesce((pf->>'allowed')::boolean,true) is not false then
    raise exception 'finite frontier smoke: spawn remained open in convergence phase';
  end if;

  if not v_should_close and coalesce((pf->>'allowed')::boolean,false) is not true then
    raise exception 'finite frontier smoke: spawn closed during fill phase';
  end if;

  if coalesce((closeout->>'allowed')::boolean,true) is not false
     or closeout->>'reason' <> 'PROJECT_SPAWN_DISABLED' then
    raise exception 'finite frontier smoke: project allow_spawn=false not enforced';
  end if;

  if v_pf_plane <> 'PRODUCTION' or v_control_plane <> 'CONTROL' then
    raise exception 'finite frontier smoke: work planes not separated';
  end if;

  if v_anon_compiler then
    raise exception 'finite frontier smoke: low-level compiler remains executable by anon';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FINITE_FRONTIER_SMOKE_OK',
    'growth_mode',m.growth_mode,
    'convergence',convergence,
    'frontier_policy',pf,
    'closeout_policy',closeout,
    'production_plane',v_pf_plane,
    'control_plane',v_control_plane,
    'anon_low_level_compiler_execute',v_anon_compiler
  );
end;
$$;

select public.prometeo_finite_frontier_smoke_test();
