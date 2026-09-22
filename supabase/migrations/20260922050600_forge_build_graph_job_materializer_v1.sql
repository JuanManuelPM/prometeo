-- BACKLOG-180: materialize a verified Forge Build Graph as concrete Prometeo technical jobs.

create or replace function public.forge_build_graph_materialize_jobs(
  p_graph jsonb,
  p_project_id text,
  p_authority boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project public.prometeo_projects%rowtype;
  v_graph_hash text;
  v_system_spec_hash text;
  v_nodes jsonb;
  v_node jsonb;
  v_dep text;
  v_unit_id text;
  v_job_key text;
  v_dep_job_key text;
  v_prefix text;
  v_job_keys text[] := array[]::text[];
  v_unit_ids text[] := array[]::text[];
  v_created integer := 0;
  v_existing integer := 0;
  v_dep_created integer := 0;
  v_current_jobs integer := 0;
  v_new_needed integer := 0;
  v_preview jsonb := '[]'::jsonb;
  v_status text;
begin
  if jsonb_typeof(coalesce(p_graph,'null'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','BUILD_GRAPH_OBJECT_REQUIRED');
  end if;
  if coalesce(p_graph->>'schema','') <> 'prometeo.forge-build-graph/v1'
     or coalesce(p_graph->>'state','') <> 'BUILD_GRAPH_READY'
  then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','BUILD_GRAPH_READY_REQUIRED');
  end if;

  v_graph_hash := nullif(btrim(coalesce(p_graph->>'graph_hash','')),'');
  v_system_spec_hash := nullif(btrim(coalesce(p_graph->>'system_spec_hash','')),'');
  v_nodes := p_graph->'nodes';

  if v_graph_hash is null or v_system_spec_hash is null then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','GRAPH_AND_SYSTEM_HASH_REQUIRED');
  end if;
  if jsonb_typeof(coalesce(v_nodes,'null'::jsonb)) <> 'array'
     or jsonb_array_length(v_nodes)=0
  then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','NON_EMPTY_NODES_REQUIRED');
  end if;

  select * into v_project
  from public.prometeo_projects
  where project_id=p_project_id;

  if not found then
    return jsonb_build_object('ok',false,'state','PROJECT_NOT_FOUND','project_id',p_project_id);
  end if;

  v_prefix := 'BG-' || substr(regexp_replace(lower(v_graph_hash),'[^a-f0-9]','','g'),1,12) || '-';

  for v_node in select value from jsonb_array_elements(v_nodes)
  loop
    v_unit_id := nullif(btrim(coalesce(v_node->>'unit_id','')),'');
    if v_unit_id is null
       or nullif(btrim(coalesce(v_node->>'title','')),'') is null
       or coalesce(v_node->>'kind','') not in ('BUILD','MIGRATION','TEST','CONFIG','DOC')
       or nullif(btrim(coalesce(v_node->>'target_ref','')),'') is null
       or jsonb_typeof(coalesce(v_node->'depends_on','null'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(v_node->'acceptance','null'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_node->'acceptance','[]'::jsonb))=0
       or jsonb_typeof(coalesce(v_node->'source_refs','null'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_node->'source_refs','[]'::jsonb))=0
    then
      return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','INVALID_BUILD_NODE','node',v_node);
    end if;

    if v_unit_id = any(v_unit_ids) then
      return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','DUPLICATE_UNIT_ID','unit_id',v_unit_id);
    end if;
    v_unit_ids := array_append(v_unit_ids,v_unit_id);

    v_job_key := v_prefix || left(upper(regexp_replace(v_unit_id,'[^A-Za-z0-9_-]','','g')),80);
    if length(v_job_key)<=length(v_prefix) then
      return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','UNIT_ID_NOT_JOB_KEY_SAFE','unit_id',v_unit_id);
    end if;
    if v_job_key = any(v_job_keys) then
      return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','JOB_KEY_COLLISION','job_key',v_job_key);
    end if;
    v_job_keys := array_append(v_job_keys,v_job_key);

    v_status := case when jsonb_array_length(v_node->'depends_on')=0 then 'READY' else 'BLOCKED' end;
    v_preview := v_preview || jsonb_build_array(jsonb_build_object(
      'unit_id',v_unit_id,'job_key',v_job_key,'status',v_status,'depends_on',v_node->'depends_on'
    ));
  end loop;

  for v_node in select value from jsonb_array_elements(v_nodes)
  loop
    for v_dep in select value from jsonb_array_elements_text(v_node->'depends_on')
    loop
      if not (v_dep = any(v_unit_ids)) then
        return jsonb_build_object(
          'ok',false,'state','INPUT_INVALID','reason','DANGLING_DEPENDENCY',
          'unit_id',v_node->>'unit_id','depends_on',v_dep
        );
      end if;
    end loop;
  end loop;

  if p_authority is not true then
    return jsonb_build_object(
      'ok',true,'state','MATERIALIZATION_READY',
      'project_id',p_project_id,'graph_hash',v_graph_hash,
      'job_count',jsonb_array_length(v_nodes),'preview',v_preview,
      'authority_granted',false,'authority_required',true
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('forge-build-materialize:'||p_project_id||':'||v_graph_hash));

  select count(*) into v_current_jobs
  from public.prometeo_jobs where project_id=p_project_id;

  select count(*) into v_new_needed
  from jsonb_array_elements(v_preview) p
  where not exists(
    select 1 from public.prometeo_jobs j
    where j.project_id=p_project_id and j.job_key=p->>'job_key'
  );

  if v_current_jobs + v_new_needed > v_project.max_jobs then
    return jsonb_build_object(
      'ok',false,'state','PROJECT_MAX_JOBS_EXCEEDED',
      'project_id',p_project_id,'current_jobs',v_current_jobs,
      'new_needed',v_new_needed,'max_jobs',v_project.max_jobs
    );
  end if;

  for v_node in select value from jsonb_array_elements(v_nodes)
  loop
    v_unit_id := v_node->>'unit_id';
    v_job_key := v_prefix || left(upper(regexp_replace(v_unit_id,'[^A-Za-z0-9_-]','','g')),80);
    v_status := case when jsonb_array_length(v_node->'depends_on')=0 then 'READY' else 'BLOCKED' end;

    if exists(
      select 1 from public.prometeo_jobs
      where project_id=p_project_id and job_key=v_job_key
    ) then
      if exists(
        select 1 from public.prometeo_jobs
        where project_id=p_project_id
          and job_key=v_job_key
          and input_context->>'build_graph_hash' is distinct from v_graph_hash
      ) then
        return jsonb_build_object(
          'ok',false,'state','JOB_CONFLICT','project_id',p_project_id,'job_key',v_job_key
        );
      end if;
      v_existing := v_existing + 1;
    else
      insert into public.prometeo_jobs(
        project_id,job_key,title,objective,instruction,input_context,status,
        priority,required_rank,lease_seconds,min_words,max_words
      )
      values(
        p_project_id,
        v_job_key,
        v_node->>'title',
        format('Implement Forge build unit %s (%s) at %s.',v_unit_id,v_node->>'kind',v_node->>'target_ref'),
        'FORGE BUILD GRAPH UNIT. Implement only this machine-readable unit. '||
        'Preserve source_refs and target_ref. Satisfy every acceptance criterion and verify evidence before PUBLISH. '||
        'Do not widen scope or infer work from narrative. Dependencies are enforced by Prometeo job dependencies.',
        jsonb_build_object(
          'schema','prometeo.forge-build-job/v1',
          'build_graph_hash',v_graph_hash,
          'system_spec_hash',v_system_spec_hash,
          'unit',v_node,
          'target_ref',v_node->>'target_ref',
          'acceptance',v_node->'acceptance',
          'source_refs',v_node->'source_refs'
        ),
        v_status,
        greatest(0,300-coalesce((v_node->>'depth')::integer,0)),
        0,900,80,1800
      );
      v_created := v_created + 1;
    end if;
  end loop;

  for v_node in select value from jsonb_array_elements(v_nodes)
  loop
    v_job_key := v_prefix || left(upper(regexp_replace(v_node->>'unit_id','[^A-Za-z0-9_-]','','g')),80);
    for v_dep in select value from jsonb_array_elements_text(v_node->'depends_on')
    loop
      v_dep_job_key := v_prefix || left(upper(regexp_replace(v_dep,'[^A-Za-z0-9_-]','','g')),80);
      insert into public.prometeo_job_dependencies(
        project_id,job_key,depends_on_project_id,depends_on_job_key
      )
      values(p_project_id,v_job_key,p_project_id,v_dep_job_key)
      on conflict do nothing;
      if found then v_dep_created := v_dep_created + 1; end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',true,'state','BUILD_JOBS_MATERIALIZED',
    'project_id',p_project_id,'graph_hash',v_graph_hash,
    'system_spec_hash',v_system_spec_hash,
    'created',v_created,'existing',v_existing,
    'dependencies_created',v_dep_created,
    'job_count',jsonb_array_length(v_nodes),
    'authority_granted',true,'idempotency_key',v_graph_hash
  );
end;
$function$;

comment on function public.forge_build_graph_materialize_jobs(jsonb,text,boolean) is
  'BACKLOG-180: idempotently materialize a BUILD_GRAPH_READY graph into concrete Prometeo technical jobs while preserving DAG dependencies, acceptance and provenance. Requires explicit authority=true for writes.';

create or replace function public.forge_build_graph_materializer_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project text := 'FORGE-BUILD-MATERIALIZER-SMOKE';
  v_graph jsonb;
  v_dry jsonb;
  v_first jsonb;
  v_second jsonb;
  v_jobs integer;
  v_ready integer;
  v_blocked integer;
  v_deps integer;
begin
  delete from public.prometeo_job_dependencies
  where project_id=v_project or depends_on_project_id=v_project;
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,
    min_parallelism,desired_parallelism,max_parallelism,
    allow_spawn,max_jobs,auto_close,work_plane
  )
  values(
    v_project,'Forge build materializer smoke',
    'Ephemeral paused project used to verify BACKLOG-180 job materialization.',
    'PAUSED',0,0,0,1,false,10,false,'CONTROL'
  );

  v_graph:=jsonb_build_object(
    'ok',true,'state','BUILD_GRAPH_READY','schema','prometeo.forge-build-graph/v1',
    'system_spec_hash','md5:smoke-system','graph_hash','md5:smoke-graph-180',
    'nodes',jsonb_build_array(
      jsonb_build_object(
        'unit_id','SMOKE-A','title','Smoke root','kind','BUILD',
        'target_ref','forge://smoke/a','depends_on','[]'::jsonb,
        'acceptance',jsonb_build_array('root accepted'),
        'source_refs',jsonb_build_array('forge://smoke/source-a'),'depth',0
      ),
      jsonb_build_object(
        'unit_id','SMOKE-B','title','Smoke dependent','kind','TEST',
        'target_ref','forge://smoke/b','depends_on',jsonb_build_array('SMOKE-A'),
        'acceptance',jsonb_build_array('dependent accepted'),
        'source_refs',jsonb_build_array('forge://smoke/source-b'),'depth',1
      )
    ),
    'edges',jsonb_build_array(jsonb_build_object('from','SMOKE-A','to','SMOKE-B'))
  );

  v_dry:=public.forge_build_graph_materialize_jobs(v_graph,v_project,false);
  if v_dry->>'state'<>'MATERIALIZATION_READY'
     or exists(select 1 from public.prometeo_jobs where project_id=v_project)
  then raise exception 'dry-run mutated or failed'; end if;

  v_first:=public.forge_build_graph_materialize_jobs(v_graph,v_project,true);

  select count(*),
         count(*) filter(where status='READY'),
         count(*) filter(where status='BLOCKED')
  into v_jobs,v_ready,v_blocked
  from public.prometeo_jobs where project_id=v_project;

  select count(*) into v_deps
  from public.prometeo_job_dependencies where project_id=v_project;

  v_second:=public.forge_build_graph_materialize_jobs(v_graph,v_project,true);

  if v_first->>'state'<>'BUILD_JOBS_MATERIALIZED'
     or (v_first->>'created')::integer<>2
     or v_jobs<>2 or v_ready<>1 or v_blocked<>1 or v_deps<>1
     or (v_second->>'created')::integer<>0
     or (v_second->>'existing')::integer<>2
  then raise exception 'materializer assertions failed'; end if;

  delete from public.prometeo_job_dependencies
  where project_id=v_project or depends_on_project_id=v_project;
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  return jsonb_build_object(
    'ok',true,'state','BUILD_GRAPH_MATERIALIZER_SMOKE_OK',
    'dry_run_state',v_dry->>'state','first_created',2,
    'ready_jobs',1,'blocked_jobs',1,'dependencies',1,
    'idempotent_second_created',0,'idempotent_second_existing',2,
    'cleanup','PASS'
  );
exception when others then
  delete from public.prometeo_job_dependencies
  where project_id=v_project or depends_on_project_id=v_project;
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;
  return jsonb_build_object(
    'ok',false,'state','BUILD_GRAPH_MATERIALIZER_SMOKE_FAILED','error',sqlerrm
  );
end;
$function$;
