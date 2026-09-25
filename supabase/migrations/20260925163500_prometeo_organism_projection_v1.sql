-- PROMETEO ORGANISM PROJECTION V1
-- Projection only: source owners remain authoritative.

create table if not exists public.prometeo_organism_bindings_v1 (
  node_key text primary key,
  title text not null,
  node_kind text not null,
  owner_key text not null,
  status text not null default 'CANDIDATE'
    check (status in ('CURRENT','PENDING','STALE','SUPERSEDED','LEGACY','CANDIDATE')),
  source_ref text not null,
  public_route text,
  parent_key text,
  depends_on jsonb not null default '[]'::jsonb check (jsonb_typeof(depends_on)='array'),
  consumers jsonb not null default '[]'::jsonb check (jsonb_typeof(consumers)='array'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prometeo_organism_bindings_v1 enable row level security;
revoke all on table public.prometeo_organism_bindings_v1 from anon, authenticated;
grant select on table public.prometeo_organism_bindings_v1 to anon, authenticated;
grant all on table public.prometeo_organism_bindings_v1 to service_role;

drop policy if exists prometeo_organism_bindings_public_read_v1
  on public.prometeo_organism_bindings_v1;
create policy prometeo_organism_bindings_public_read_v1
  on public.prometeo_organism_bindings_v1
  for select to anon, authenticated using (true);

create or replace function public.prometeo_organism_register_candidate_v1(
  p_node_key text,
  p_title text,
  p_node_kind text,
  p_owner_key text,
  p_source_ref text,
  p_parent_key text default null,
  p_public_route text default null,
  p_depends_on jsonb default '[]'::jsonb,
  p_consumers jsonb default '[]'::jsonb,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare v_row public.prometeo_organism_bindings_v1;
begin
  if nullif(btrim(p_node_key),'') is null
    or nullif(btrim(p_title),'') is null
    or nullif(btrim(p_node_kind),'') is null
    or nullif(btrim(p_owner_key),'') is null
    or nullif(btrim(p_source_ref),'') is null then
    raise exception 'node_key, title, node_kind, owner_key and source_ref are required';
  end if;

  if jsonb_typeof(coalesce(p_depends_on,'[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_consumers,'[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) <> 'object' then
    raise exception 'depends_on/consumers must be arrays and payload must be an object';
  end if;

  insert into public.prometeo_organism_bindings_v1(
    node_key,title,node_kind,owner_key,status,source_ref,public_route,parent_key,
    depends_on,consumers,payload,observed_at,created_at,updated_at
  )
  values(
    btrim(p_node_key),btrim(p_title),btrim(p_node_kind),btrim(p_owner_key),'CANDIDATE',
    btrim(p_source_ref),nullif(btrim(p_public_route),''),nullif(btrim(p_parent_key),''),
    coalesce(p_depends_on,'[]'::jsonb),coalesce(p_consumers,'[]'::jsonb),
    coalesce(p_payload,'{}'::jsonb),now(),now(),now()
  )
  on conflict(node_key) do update set
    title=excluded.title,node_kind=excluded.node_kind,owner_key=excluded.owner_key,
    status='CANDIDATE',source_ref=excluded.source_ref,public_route=excluded.public_route,
    parent_key=excluded.parent_key,depends_on=excluded.depends_on,
    consumers=excluded.consumers,payload=excluded.payload,
    observed_at=now(),updated_at=now()
  returning * into v_row;

  return to_jsonb(v_row);
end
$$;

revoke all on function public.prometeo_organism_register_candidate_v1(
  text,text,text,text,text,text,text,jsonb,jsonb,jsonb
) from public,anon,authenticated;
grant execute on function public.prometeo_organism_register_candidate_v1(
  text,text,text,text,text,text,text,jsonb,jsonb,jsonb
) to service_role;

create or replace function public.prometeo_organism_projection_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $$
declare t jsonb; nodes jsonb; edges jsonb; coverage jsonb;
begin
  t:=public.prometeo_current_tree_v2();

  with semantic as (
    select value x from jsonb_array_elements(coalesce(t->'semantic_registry','[]'::jsonb))
  ), roots as (
    select value x from jsonb_array_elements(coalesce(t->'root_index'->'read_order','[]'::jsonb))
  ), guides as (
    select value x from jsonb_array_elements(coalesce(t->'guides','[]'::jsonb))
  ), objectives as (
    select value x from jsonb_array_elements(coalesce(t->'work'->'active_objectives','[]'::jsonb))
  ), all_nodes as (
    select jsonb_build_object(
      'node_key','PROJECT:PROMETEO','title','Prometeo','kind','PROJECT','owner_key','ROOT',
      'status','CURRENT','source_ref','RPC:prometeo_organism_projection_v1()',
      'public_route','/current-tree/live-v6/','updated_at',t->>'generated_at',
      'authority','PROJECTION_ROOT','depends_on','[]'::jsonb,'consumers','[]'::jsonb,
      'payload',jsonb_build_object('projection_only',true)
    ) node
    union all
    select jsonb_build_object(
      'node_key','SEM:'||(x->>'entity_key'),'title',x->>'title','kind',x->>'kind',
      'owner_key',x->>'owner_key','status',coalesce(x->>'effective_status',x->>'status'),
      'source_ref',x->>'source_ref','public_route',x->>'public_route','updated_at',x->>'updated_at',
      'authority',x->>'authority','depends_on',coalesce(x->'depends_on','[]'::jsonb),
      'consumers',coalesce(x->'consumers','[]'::jsonb),'payload',coalesce(x->'payload','{}'::jsonb)
    ) from semantic
    union all
    select jsonb_build_object(
      'node_key','ROOT:'||(x->>'module_key'),'title',x->>'title','kind','ROOT_MODULE',
      'owner_key','ROOT','status',case when x->>'freshness'='STALE' then 'STALE' else 'CURRENT' end,
      'source_ref',x->>'source_ref','public_route',null,'updated_at',x->>'source_updated_at',
      'authority','INDEXED_SOURCE','depends_on','[]'::jsonb,'consumers','[]'::jsonb,
      'payload',jsonb_build_object('purpose',x->>'purpose','freshness',x->>'freshness',
        'age_minutes',x->'age_minutes','freshness_sla_minutes',x->'freshness_sla_minutes')
    ) from roots
    union all
    select jsonb_build_object(
      'node_key','GUIDE:'||(x->>'guide_key'),'title',coalesce(x->>'short_title',x->>'title'),
      'kind','GUIDE','owner_key',x->>'guide_key','status',x->>'effective_status',
      'source_ref',x->>'invoke_route','public_route',x->>'page_route',
      'updated_at',coalesce(x->>'capsule_generated_at',x->>'updated_at'),
      'authority','DOMAIN_GUIDE','depends_on','[]'::jsonb,'consumers','[]'::jsonb,
      'payload',jsonb_build_object('headline',x->>'headline','mission',x->>'mission',
        'domain_type',x->>'domain_type','version',x->'current_version')
    ) from guides
    union all
    select jsonb_build_object(
      'node_key','OBJECTIVE:'||(x->>'objective_key'),'title',x->>'title','kind','OBJECTIVE',
      'owner_key',x->>'guide_key','status',x->>'status','source_ref',x->>'source_ref',
      'public_route',null,'updated_at',x->>'updated_at','authority','WORK_OBJECTIVE',
      'depends_on','[]'::jsonb,'consumers','[]'::jsonb,
      'payload',jsonb_build_object('compiler_key',x->>'compiler_key')
    ) from objectives
    union all
    select jsonb_build_object(
      'node_key','EXT:'||b.node_key,'title',b.title,'kind',b.node_kind,'owner_key',b.owner_key,
      'status',b.status,'source_ref',b.source_ref,'public_route',b.public_route,
      'updated_at',b.updated_at,'authority','EXTERNAL_BINDING','depends_on',b.depends_on,
      'consumers',b.consumers,'payload',b.payload||jsonb_build_object('observed_at',b.observed_at)
    ) from public.prometeo_organism_bindings_v1 b
  )
  select coalesce(jsonb_agg(node order by node->>'node_key'),'[]'::jsonb) into nodes from all_nodes;

  with semantic as (
    select value x from jsonb_array_elements(coalesce(t->'semantic_registry','[]'::jsonb))
  ), dep_edges as (
    select jsonb_build_object('from','SEM:'||(s.x->>'entity_key'),'to','SEM:'||d.dep,'kind','DEPENDS_ON') edge
    from semantic s
    cross join lateral jsonb_array_elements_text(coalesce(s.x->'depends_on','[]'::jsonb)) d(dep)
  ), root_edges as (
    select jsonb_build_object('from','SEM:PROMETEO_ROOT_INDEX_V1','to','ROOT:'||(r.value->>'module_key'),'kind','INDEXES') edge
    from jsonb_array_elements(coalesce(t->'root_index'->'read_order','[]'::jsonb)) r(value)
  ), guide_edges as (
    select jsonb_build_object('from','ROOT:GUIDES','to','GUIDE:'||(g.value->>'guide_key'),'kind','CONTAINS') edge
    from jsonb_array_elements(coalesce(t->'guides','[]'::jsonb)) g(value)
  ), objective_edges as (
    select jsonb_build_object('from','ROOT:OBJECTIVES','to','OBJECTIVE:'||(o.value->>'objective_key'),'kind','CONTAINS') edge
    from jsonb_array_elements(coalesce(t->'work'->'active_objectives','[]'::jsonb)) o(value)
  ), external_edges as (
    select jsonb_build_object('from',b.parent_key,'to','EXT:'||b.node_key,'kind','CONTAINS') edge
    from public.prometeo_organism_bindings_v1 b where b.parent_key is not null
  ), fixed_edges(edge) as (
    values
      (jsonb_build_object('from','PROJECT:PROMETEO','to','SEM:PROMETEO_CURRENT_TREE_V2','kind','ORIENTS_WITH')),
      (jsonb_build_object('from','PROJECT:PROMETEO','to','SEM:PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1','kind','ARCHITECTURE')),
      (jsonb_build_object('from','PROJECT:PROMETEO','to','SEM:PROMETEO_ROOT_INDEX_V1','kind','INDEX')),
      (jsonb_build_object('from','ROOT:WORK','to','SEM:WORK_GRAPH_CURRENT_V1_1','kind','USES'))
  ), all_edges as (
    select edge from fixed_edges
    union all select edge from dep_edges
    union all select edge from root_edges
    union all select edge from guide_edges
    union all select edge from objective_edges
    union all select edge from external_edges
  )
  select coalesce(jsonb_agg(edge),'[]'::jsonb) into edges from all_edges;

  with node_keys as (
    select value->>'node_key' k from jsonb_array_elements(nodes)
  ), checks as (
    select
      (select count(*) from jsonb_array_elements(coalesce(t->'semantic_registry','[]'::jsonb)) x
        where coalesce(x->>'effective_status',x->>'status')='CURRENT') semantic_current_expected,
      (select count(*) from jsonb_array_elements(nodes) x
        where x->>'node_key' like 'SEM:%' and x->>'status'='CURRENT') semantic_current_represented,
      jsonb_array_length(coalesce(t->'guides','[]'::jsonb)) guides_expected,
      (select count(*) from node_keys where k like 'GUIDE:%') guides_represented,
      jsonb_array_length(coalesce(t->'root_index'->'read_order','[]'::jsonb)) root_expected,
      (select count(*) from node_keys where k like 'ROOT:%') root_represented,
      jsonb_array_length(coalesce(t->'work'->'active_objectives','[]'::jsonb)) objectives_expected,
      (select count(*) from node_keys where k like 'OBJECTIVE:%') objectives_represented
  ), missing_dependencies as (
    select distinct 'SEM:'||dep dep_key
    from jsonb_array_elements(coalesce(t->'semantic_registry','[]'::jsonb)) s(x)
    cross join lateral jsonb_array_elements_text(coalesce(s.x->'depends_on','[]'::jsonb)) d(dep)
    where not exists(select 1 from node_keys nk where nk.k='SEM:'||dep)
  ), missing_parents as (
    select b.node_key,b.parent_key from public.prometeo_organism_bindings_v1 b
    where b.parent_key is not null
      and not exists(select 1 from node_keys nk where nk.k=b.parent_key)
  ), missing_sources as (
    select value->>'node_key' node_key from jsonb_array_elements(nodes)
    where value->>'node_key'<>'PROJECT:PROMETEO' and nullif(value->>'source_ref','') is null
  )
  select jsonb_build_object(
    'required',jsonb_build_object(
      'semantic_current',jsonb_build_object('expected',semantic_current_expected,'represented',semantic_current_represented),
      'guides',jsonb_build_object('expected',guides_expected,'represented',guides_represented),
      'root_modules',jsonb_build_object('expected',root_expected,'represented',root_represented),
      'active_objectives',jsonb_build_object('expected',objectives_expected,'represented',objectives_represented)
    ),
    'coverage_percent',round(100.0*(semantic_current_represented+guides_represented+root_represented+objectives_represented)
      / greatest(1,semantic_current_expected+guides_expected+root_expected+objectives_expected),1),
    'missing_dependencies',coalesce((select jsonb_agg(dep_key) from missing_dependencies),'[]'::jsonb),
    'missing_binding_parents',coalesce((select jsonb_agg(to_jsonb(missing_parents)) from missing_parents),'[]'::jsonb),
    'nodes_without_source',coalesce((select jsonb_agg(node_key) from missing_sources),'[]'::jsonb),
    'external_bindings',(select count(*) from public.prometeo_organism_bindings_v1),
    'stale_nodes',(select count(*) from jsonb_array_elements(nodes) x where x->>'status'='STALE'),
    'legacy_nodes',(select count(*) from jsonb_array_elements(nodes) x where x->>'status' in ('LEGACY','SUPERSEDED'))
  ) into coverage from checks;

  return jsonb_build_object(
    'schema','prometeo.organism/v1','generated_at',now(),
    'authority','PROJECTION_ONLY_SOURCE_OWNERS_REMAIN_AUTHORITATIVE',
    'nodes',nodes,'edges',edges,'coverage',coverage,'source_tree_schema',t->>'schema'
  );
end
$$;

revoke all on function public.prometeo_organism_projection_v1() from public;
grant execute on function public.prometeo_organism_projection_v1() to anon,authenticated,service_role;

create or replace function public.prometeo_organism_coverage_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$ select public.prometeo_organism_projection_v1()->'coverage'; $$;

revoke all on function public.prometeo_organism_coverage_v1() from public;
grant execute on function public.prometeo_organism_coverage_v1() to anon,authenticated,service_role;

insert into public.prometeo_organism_bindings_v1(
 node_key,title,node_kind,owner_key,status,source_ref,parent_key,consumers,payload
) values(
 'NEXT_MEMORY_SELF_MAINTAINING_V1','Memoria operativa autosostenida','NEXT_CAPABILITY',
 'STRATEGY','CANDIDATE','USER_DIRECTION:2026-09-25','ROOT:NEXT_ACTION',
 '["STRATEGY","CURRENT_TREE","DOMAIN_GUIDES"]'::jsonb,
 '{"purpose":"Invalidar lo viejo, re-sintetizar CURRENT y reutilizar conocimiento previo sin depender de recordatorio humano."}'::jsonb
)
on conflict(node_key) do update set
 title=excluded.title,node_kind=excluded.node_kind,owner_key=excluded.owner_key,status=excluded.status,
 source_ref=excluded.source_ref,parent_key=excluded.parent_key,consumers=excluded.consumers,
 payload=excluded.payload,observed_at=now(),updated_at=now();

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values
('PROMETEO_ORGANISM_PROJECTION_V1','Prometeo Organism Projection V1','ORIENTATION_PROJECTION','ROOT','1','CURRENT',
 'RPC:prometeo_organism_projection_v1()','/current-tree/live-v6/',100,'PROJECTION_ONLY',null,
 '["PROMETEO_CURRENT_TREE_V2","PROMETEO_ROOT_INDEX_V1","WORK_GRAPH_CURRENT_V1_1"]'::jsonb,
 '["HUMAN_ORIENTATION","DOMAIN_GUIDES","PARALLEL_CHATS"]'::jsonb,
 '{"law":"Everything important gets an address; source owners remain authoritative.","coverage_rpc":"prometeo_organism_coverage_v1()"}'::jsonb,
 now(),now(),now()),
('PROMETEO_ORGANISM_COVERAGE_AUDIT_V1','Prometeo Organism Coverage Audit V1','AUDIT','ROOT','1','CURRENT',
 'RPC:prometeo_organism_coverage_v1()','/current-tree/live-v6/',100,'AUDIT_ONLY',null,
 '["PROMETEO_ORGANISM_PROJECTION_V1"]'::jsonb,'["ROOT","STRATEGY","DOMAIN_GUIDES"]'::jsonb,
 '{"checks":["semantic_current","guides","root_modules","active_objectives","missing_dependencies","missing_binding_parents","nodes_without_source"]}'::jsonb,
 now(),now(),now()),
('PROMETEO_ORGANISM_EXTERNAL_INTAKE_V1','Prometeo Organism External Intake V1','INTAKE','ROOT','1','CURRENT',
 'TABLE:prometeo_organism_bindings_v1','/current-tree/live-v6/',95,'CANDIDATE_INTAKE_ONLY',null,
 '["PROMETEO_ORGANISM_PROJECTION_V1"]'::jsonb,'["PARALLEL_CHATS","CURRENT_TREE"]'::jsonb,
 '{"registration_rpc":"prometeo_organism_register_candidate_v1","promotion_rule":"Registration never promotes authority; external work enters as CANDIDATE."}'::jsonb,
 now(),now(),now())
on conflict(entity_key) do update set
 title=excluded.title,kind=excluded.kind,owner_key=excluded.owner_key,version=excluded.version,
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 importance=excluded.importance,authority=excluded.authority,depends_on=excluded.depends_on,
 consumers=excluded.consumers,payload=excluded.payload,
 promoted_at=coalesce(public.prometeo_semantic_registry_v1.promoted_at,excluded.promoted_at),
 updated_at=now();
