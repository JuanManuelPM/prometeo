-- BACKLOG-185 · Cognitive bootstrap readiness v1
-- Applied to Supabase as migration forge_cognitive_bootstrap_readiness_v1.

create or replace function public.forge_cognitive_bootstrap_status(
  p_blueprint_id text default 'FORGE-BLUEPRINT-84-01'
) returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $$
declare
  v_blueprint_id text := nullif(btrim(p_blueprint_id),'');
  v_project_exists boolean := false;
  v_total_points integer := 0;
  v_canonical_points integer := 0;
  v_sections integer := 0;
  v_section_integrator boolean := false;
  v_build_graph boolean := false;
  v_materializer boolean := false;
  v_test_gate boolean := false;
  v_promotion_gate boolean := false;
  v_blocking_stage text;
  v_state text;
  v_next_source_keys jsonb := '[]'::jsonb;
begin
  if v_blueprint_id is null then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','BLUEPRINT_ID_REQUIRED');
  end if;

  select exists(select 1 from public.blueprint_projects p where p.blueprint_id=v_blueprint_id)
    into v_project_exists;

  select count(*)::integer,
         count(*) filter(where nullif(btrim(canonical_text),'') is not null)::integer
    into v_total_points,v_canonical_points
  from public.blueprint_points
  where blueprint_id=v_blueprint_id;

  select count(*)::integer into v_sections
  from public.forge_section_registry
  where registry_version=1;

  v_section_integrator := to_regprocedure('public.forge_section_integrator_result_validate(jsonb,jsonb)') is not null;
  v_build_graph := to_regprocedure('public.forge_build_graph_compile(jsonb)') is not null;
  v_materializer := to_regprocedure('public.forge_build_graph_materialize_jobs(jsonb,text,boolean)') is not null;
  v_test_gate := to_regprocedure('public.prometeo_frontier_test_evidence_validate(jsonb)') is not null;
  v_promotion_gate := to_regprocedure('public.forge_change_promotion_gate(text,text,text,jsonb,text,jsonb)') is not null;

  if not v_project_exists or v_total_points=0 then
    v_state := 'WAITING_BLUEPRINT';
    v_blocking_stage := 'BLUEPRINT';
    v_next_source_keys := jsonb_build_array('BACKLOG-185');
  elsif v_canonical_points < v_total_points then
    v_state := 'WAITING_CANONICALS';
    v_blocking_stage := 'CANONICALS';
    v_next_source_keys := jsonb_build_array('BACKLOG-176');
  elsif v_sections <> 7 or not v_section_integrator then
    v_state := 'WAITING_SECTION_INTEGRATION';
    v_blocking_stage := 'SECTION_SPECS';
    v_next_source_keys := jsonb_build_array('BACKLOG-174','BACKLOG-177');
  else
    v_state := 'READY_FOR_SPEC_PIPELINE';
    v_blocking_stage := 'SECTION_SPECS';
    v_next_source_keys := jsonb_build_array('BACKLOG-174','BACKLOG-175','BACKLOG-178');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state',v_state,
    'schema','prometeo.cognitive-bootstrap-readiness/v1',
    'blueprint_id',v_blueprint_id,
    'blocking_stage',v_blocking_stage,
    'blueprint',jsonb_build_object(
      'exists',v_project_exists,
      'total_points',v_total_points,
      'canonical_points',v_canonical_points,
      'canonical_complete',(v_total_points>0 and v_canonical_points=v_total_points)
    ),
    'section_registry',jsonb_build_object(
      'registered_sections',v_sections,
      'required_sections',7,
      'registry_ready',(v_sections=7)
    ),
    'capabilities',jsonb_build_object(
      'section_integrator',v_section_integrator,
      'build_graph_compiler',v_build_graph,
      'job_materializer',v_materializer,
      'post_build_test_gate',v_test_gate,
      'promotion_gate',v_promotion_gate
    ),
    'pipeline',jsonb_build_array(
      jsonb_build_object('stage','IDEA_BLUEPRINT','state',case when v_project_exists and v_total_points>0 then 'READY' else 'BLOCKED' end),
      jsonb_build_object('stage','CANONICALS','state',case when v_total_points>0 and v_canonical_points=v_total_points then 'READY' else 'BLOCKED' end),
      jsonb_build_object('stage','SECTION_SPECS','state',case when v_total_points>0 and v_canonical_points=v_total_points and v_sections=7 and v_section_integrator then 'READY_TO_EXECUTE' else 'BLOCKED_UPSTREAM' end),
      jsonb_build_object('stage','SYSTEM_SPEC','state','REQUIRES_DURABLE_ARTIFACT'),
      jsonb_build_object('stage','BUILD_GRAPH','state',case when v_build_graph then 'CAPABILITY_READY' else 'CAPABILITY_MISSING' end),
      jsonb_build_object('stage','BUILD_JOBS','state',case when v_materializer then 'CAPABILITY_READY' else 'CAPABILITY_MISSING' end),
      jsonb_build_object('stage','TEST','state',case when v_test_gate then 'CAPABILITY_READY' else 'CAPABILITY_MISSING' end),
      jsonb_build_object('stage','PROMOTE','state',case when v_promotion_gate then 'CAPABILITY_READY' else 'CAPABILITY_MISSING' end)
    ),
    'next_source_keys',v_next_source_keys,
    'authority_granted',false
  );
end;
$$;

create or replace function public.forge_cognitive_bootstrap_status_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_current jsonb;
  v_missing jsonb;
begin
  v_current := public.forge_cognitive_bootstrap_status('FORGE-BLUEPRINT-84-01');
  v_missing := public.forge_cognitive_bootstrap_status('__MISSING_BOOTSTRAP_FIXTURE__');

  if v_current->>'schema' <> 'prometeo.cognitive-bootstrap-readiness/v1'
     or jsonb_typeof(v_current->'pipeline') <> 'array'
     or jsonb_array_length(v_current->'pipeline') <> 8
     or (v_current->>'authority_granted')::boolean is not false
     or v_missing->>'state' <> 'WAITING_BLUEPRINT'
     or v_missing->>'blocking_stage' <> 'BLUEPRINT' then
    raise exception 'cognitive bootstrap readiness smoke failed: current %, missing %',v_current,v_missing;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','COGNITIVE_BOOTSTRAP_STATUS_SMOKE_OK',
    'current_state',v_current->>'state',
    'blocking_stage',v_current->>'blocking_stage',
    'blueprint_points',(v_current#>>'{blueprint,total_points}')::integer,
    'canonical_points',(v_current#>>'{blueprint,canonical_points}')::integer,
    'downstream_capabilities',v_current->'capabilities'
  );
end;
$$;

comment on function public.forge_cognitive_bootstrap_status(text) is
  'BACKLOG-185: evidence-based readiness projection for Idea -> Blueprint -> Spec -> Build -> Test -> Promote. Never fabricates missing artifacts or grants mutation authority.';
comment on function public.forge_cognitive_bootstrap_status_smoke_test() is
  'BACKLOG-185: validates the cognitive bootstrap readiness contract and fail-closed missing-blueprint behavior.';
