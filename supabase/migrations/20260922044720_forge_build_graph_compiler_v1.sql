-- BACKLOG-179: deterministic System Spec -> Build Graph compiler.
-- This compiles structured implementation_units into a DAG. It does not create jobs (BACKLOG-180)
-- and it never infers implementation work from narrative prose.

create or replace function public.forge_build_graph_compile(p_system_spec jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_units jsonb;
  v_nodes jsonb;
  v_edges jsonb;
  v_node_count integer;
  v_edge_count integer;
  v_dup_count integer;
  v_dangling_count integer;
  v_invalid_count integer;
  v_cycle boolean;
  v_hash text;
begin
  if jsonb_typeof(coalesce(p_system_spec,'null'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','SYSTEM_SPEC_OBJECT_REQUIRED');
  end if;

  if coalesce(p_system_spec->>'schema','') <> 'prometeo.cognitive-forge-system-spec/v1' then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','SYSTEM_SPEC_SCHEMA_UNSUPPORTED');
  end if;

  if coalesce(p_system_spec->>'compile_state','') <> 'COMPILED' then
    return jsonb_build_object('ok',false,'state','WAITING_SYSTEM_SPEC','reason','SYSTEM_SPEC_NOT_COMPILED');
  end if;

  if nullif(btrim(coalesce(p_system_spec->>'system_spec_hash','')),'') is null then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','SYSTEM_SPEC_HASH_REQUIRED');
  end if;

  if not (p_system_spec ? 'implementation_units') then
    return jsonb_build_object(
      'ok',false,
      'state','WAITING_BUILD_DIRECTIVES',
      'reason','IMPLEMENTATION_UNITS_REQUIRED',
      'required_contract','prometeo.forge-implementation-unit/v1'
    );
  end if;

  if jsonb_typeof(p_system_spec->'implementation_units') <> 'array' then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','IMPLEMENTATION_UNITS_ARRAY_REQUIRED');
  end if;

  v_units := p_system_spec->'implementation_units';

  with u as (
    select value as x
    from jsonb_array_elements(v_units)
  )
  select count(*) into v_invalid_count
  from u
  where nullif(btrim(coalesce(x->>'unit_id','')),'') is null
     or nullif(btrim(coalesce(x->>'title','')),'') is null
     or coalesce(x->>'kind','') not in ('BUILD','MIGRATION','TEST','CONFIG','DOC')
     or nullif(btrim(coalesce(x->>'target_ref','')),'') is null
     or jsonb_typeof(coalesce(x->'depends_on','null'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(x->'acceptance','null'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(x->'acceptance','[]'::jsonb)) = 0
     or jsonb_typeof(coalesce(x->'source_refs','null'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(x->'source_refs','[]'::jsonb)) = 0;

  if v_invalid_count > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','INVALID_IMPLEMENTATION_UNIT','invalid_count',v_invalid_count
    );
  end if;

  with u as (
    select value->>'unit_id' as unit_id
    from jsonb_array_elements(v_units)
  )
  select count(*) - count(distinct unit_id) into v_dup_count from u;

  if v_dup_count > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','DUPLICATE_UNIT_ID','duplicate_count',v_dup_count
    );
  end if;

  with
  u as (
    select value->>'unit_id' as unit_id
    from jsonb_array_elements(v_units)
  ),
  e as (
    select x->>'unit_id' as unit_id, dep.value #>> '{}' as dep_id
    from jsonb_array_elements(v_units) x
    cross join lateral jsonb_array_elements(x->'depends_on') dep(value)
  )
  select count(*) into v_dangling_count
  from e
  left join u on u.unit_id=e.dep_id
  where u.unit_id is null;

  if v_dangling_count > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','DANGLING_DEPENDENCY','dangling_count',v_dangling_count
    );
  end if;

  with recursive
  e as (
    select x->>'unit_id' as unit_id, dep.value #>> '{}' as dep_id
    from jsonb_array_elements(v_units) x
    cross join lateral jsonb_array_elements(x->'depends_on') dep(value)
  ),
  walk(start_id,node_id,path,cycle) as (
    select x->>'unit_id', x->>'unit_id', array[x->>'unit_id']::text[], false
    from jsonb_array_elements(v_units) x
    union all
    select w.start_id, e.dep_id, w.path || e.dep_id, e.dep_id=any(w.path)
    from walk w
    join e on e.unit_id=w.node_id
    where not w.cycle
  )
  select coalesce(bool_or(cycle),false) into v_cycle from walk;

  if v_cycle then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','DEPENDENCY_CYCLE');
  end if;

  with recursive
  u as (
    select value as x, value->>'unit_id' as unit_id
    from jsonb_array_elements(v_units)
  ),
  e as (
    select x->>'unit_id' as unit_id, dep.value #>> '{}' as dep_id
    from jsonb_array_elements(v_units) x
    cross join lateral jsonb_array_elements(x->'depends_on') dep(value)
  ),
  paths(node_id,depth) as (
    select u.unit_id,0
    from u
    where not exists(select 1 from e where e.unit_id=u.unit_id)
    union all
    select e.unit_id,p.depth+1
    from paths p
    join e on e.dep_id=p.node_id
  ),
  depths as (
    select node_id,max(depth) as depth
    from paths
    group by node_id
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'unit_id',u.unit_id,
        'title',u.x->>'title',
        'kind',u.x->>'kind',
        'target_ref',u.x->>'target_ref',
        'depends_on',u.x->'depends_on',
        'acceptance',u.x->'acceptance',
        'source_refs',u.x->'source_refs',
        'depth',coalesce(d.depth,0)
      )
      order by coalesce(d.depth,0),u.unit_id
    ),'[]'::jsonb)
  into v_nodes
  from u
  left join depths d on d.node_id=u.unit_id;

  with e as (
    select x->>'unit_id' as unit_id, dep.value #>> '{}' as dep_id
    from jsonb_array_elements(v_units) x
    cross join lateral jsonb_array_elements(x->'depends_on') dep(value)
  )
  select
    count(*),
    coalesce(jsonb_agg(
      jsonb_build_object('from',dep_id,'to',unit_id)
      order by dep_id,unit_id
    ),'[]'::jsonb)
  into v_edge_count,v_edges
  from e;

  v_node_count := jsonb_array_length(v_nodes);

  v_hash := 'md5:' || md5(
    jsonb_build_object(
      'schema','prometeo.forge-build-graph/v1',
      'system_spec_hash',p_system_spec->>'system_spec_hash',
      'nodes',v_nodes,
      'edges',v_edges
    )::text
  );

  return jsonb_build_object(
    'ok',true,
    'state','BUILD_GRAPH_READY',
    'schema','prometeo.forge-build-graph/v1',
    'system_spec_hash',p_system_spec->>'system_spec_hash',
    'node_count',v_node_count,
    'edge_count',v_edge_count,
    'nodes',v_nodes,
    'edges',v_edges,
    'graph_hash',v_hash,
    'authority_granted',false,
    'next_boundary','BACKLOG-180 may materialize graph nodes as implementation jobs'
  );
end;
$$;

comment on function public.forge_build_graph_compile(jsonb) is
  'BACKLOG-179 deterministic compiler from COMPILED System Spec implementation_units to a validated DAG. Does not infer from prose or create jobs.';

create or replace function public.forge_build_graph_smoke_test()
returns jsonb
language plpgsql
as $$
declare
  v_input jsonb := '{
    "schema":"prometeo.cognitive-forge-system-spec/v1",
    "compile_state":"COMPILED",
    "system_spec_hash":"sha256:fixture",
    "implementation_units":[
      {"unit_id":"A","title":"Schema","kind":"MIGRATION","target_ref":"db:a","depends_on":[],"acceptance":["schema exists"],"source_refs":["section:fundamentos"]},
      {"unit_id":"B","title":"Runtime","kind":"BUILD","target_ref":"runtime:b","depends_on":["A"],"acceptance":["runtime passes"],"source_refs":["section:ejecucion"]},
      {"unit_id":"C","title":"Tests","kind":"TEST","target_ref":"tests:c","depends_on":["A","B"],"acceptance":["suite passes"],"source_refs":["section:evaluacion"]}
    ]
  }'::jsonb;
  v_cycle jsonb := '{
    "schema":"prometeo.cognitive-forge-system-spec/v1",
    "compile_state":"COMPILED",
    "system_spec_hash":"sha256:cycle",
    "implementation_units":[
      {"unit_id":"A","title":"A","kind":"BUILD","target_ref":"a","depends_on":["B"],"acceptance":["ok"],"source_refs":["s:a"]},
      {"unit_id":"B","title":"B","kind":"BUILD","target_ref":"b","depends_on":["A"],"acceptance":["ok"],"source_refs":["s:b"]}
    ]
  }'::jsonb;
  v_ready jsonb;
  v_ready2 jsonb;
  v_wait jsonb;
  v_bad jsonb;
begin
  v_ready := public.forge_build_graph_compile(v_input);
  v_ready2 := public.forge_build_graph_compile(v_input);
  v_wait := public.forge_build_graph_compile(
    '{"schema":"prometeo.cognitive-forge-system-spec/v1","compile_state":"COMPILED","system_spec_hash":"sha256:x"}'::jsonb
  );
  v_bad := public.forge_build_graph_compile(v_cycle);

  return jsonb_build_object(
    'ok',
      v_ready->>'state'='BUILD_GRAPH_READY'
      and (v_ready->>'node_count')::integer=3
      and (v_ready->>'edge_count')::integer=3
      and v_ready->>'graph_hash'=v_ready2->>'graph_hash'
      and v_wait->>'state'='WAITING_BUILD_DIRECTIVES'
      and v_bad->>'reason'='DEPENDENCY_CYCLE',
    'ready_state',v_ready->>'state',
    'node_count',v_ready->>'node_count',
    'edge_count',v_ready->>'edge_count',
    'deterministic_hash',(v_ready->>'graph_hash')=(v_ready2->>'graph_hash'),
    'missing_directives_state',v_wait->>'state',
    'cycle_reason',v_bad->>'reason'
  );
end;
$$;

comment on function public.forge_build_graph_smoke_test() is
  'BACKLOG-179 smoke: DAG compile, deterministic hash, missing directives gate and cycle rejection.';
