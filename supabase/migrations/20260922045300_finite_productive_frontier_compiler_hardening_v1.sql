-- CORE-V1 · FRONTIER hardening
-- Close low-level compiler bypass during finite-frontier drain.

create or replace function public.prometeo_frontier_compile_output_branches_v1(
  p_project_id text,
  p_job_key text,
  p_generation integer,
  p_max_create integer default 3
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_meta jsonb;
  v_policy jsonb;
begin
  if p_project_id='PRODUCTIVE-FRONTIER-01' then
    v_policy:=public.prometeo_project_spawn_policy(p_project_id);
    if coalesce((v_policy->>'allowed')::boolean,false) is not true then
      return jsonb_build_object(
        'ok',true,
        'state','BRANCH_SOURCE_COMPILE_SUPPRESSED',
        'project_id',p_project_id,
        'job_key',p_job_key,
        'generation',p_generation,
        'spawn_policy',v_policy
      );
    end if;
  end if;

  select o.meta into v_meta
  from public.prometeo_outputs o
  where o.project_id=p_project_id
    and o.job_key=p_job_key
    and o.generation=p_generation;

  if not found then
    return jsonb_build_object(
      'ok',false,'state','OUTPUT_NOT_FOUND',
      'project_id',p_project_id,'job_key',p_job_key,'generation',p_generation
    );
  end if;

  return public.prometeo_frontier_compile_branch_candidates_v1(
    jsonb_build_object(
      'project_id',p_project_id,
      'job_key',p_job_key,
      'generation',p_generation
    ),
    v_meta #> '{frontier,branch_candidates}',
    p_max_create
  );
end;
$$;

revoke execute on function public.prometeo_frontier_compile_branch_candidates_v1(jsonb,jsonb,integer) from public;
revoke execute on function public.prometeo_frontier_compile_branch_candidates_v1(jsonb,jsonb,integer) from anon;
revoke execute on function public.prometeo_frontier_compile_branch_candidates_v1(jsonb,jsonb,integer) from authenticated;

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
  v_anon_compiler boolean;
  v_compile_probe jsonb;
begin
  select * into m from public.prometeo_frontier_metrics limit 1;
  pf:=public.prometeo_project_spawn_policy('PRODUCTIVE-FRONTIER-01');
  closeout:=public.prometeo_project_spawn_policy('PROMETEO-CORE-V1-CLOSEOUT');

  select work_plane into v_pf_plane from public.prometeo_projects where project_id='PRODUCTIVE-FRONTIER-01';
  select work_plane into v_control_plane from public.prometeo_projects where project_id='GUIDE-SENTINEL-01';

  v_anon_compiler:=has_function_privilege(
    'anon',
    'public.prometeo_frontier_compile_branch_candidates_v1(jsonb,jsonb,integer)',
    'EXECUTE'
  );

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

  if v_anon_compiler then
    raise exception 'finite frontier smoke: low-level compiler remains executable by anon';
  end if;

  if coalesce(m.unused_sources,0)=0 then
    v_compile_probe:=public.prometeo_frontier_compile_output_branches_v1(
      'PRODUCTIVE-FRONTIER-01','__DRAIN_PROBE__',0,3
    );
    if v_compile_probe->>'state' <> 'BRANCH_SOURCE_COMPILE_SUPPRESSED' then
      raise exception 'finite frontier smoke: public compiler wrapper did not suppress drain';
    end if;
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
    'control_plane',v_control_plane,
    'anon_low_level_compiler_execute',v_anon_compiler,
    'compile_probe',v_compile_probe
  );
end;
$$;

select public.prometeo_finite_frontier_smoke_test();
