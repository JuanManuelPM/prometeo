-- Prometeo Current Tree V1
-- Applied to connected Supabase project as migration 20260925125544.
-- Purpose: one semantic project orientation surface without making the projection a second owner of truth.

create table if not exists public.prometeo_semantic_registry_v1 (
  entity_key text primary key,
  title text not null,
  kind text not null,
  owner_key text not null,
  version text not null default '1',
  status text not null check (status in ('CURRENT','PENDING','STALE','SUPERSEDED','LEGACY','CANDIDATE')),
  source_ref text not null,
  public_route text,
  importance integer not null default 50 check (importance between 0 and 100),
  authority text not null default 'REFERENCE',
  supersedes text,
  depends_on jsonb not null default '[]'::jsonb,
  consumers jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prometeo_semantic_registry_v1 enable row level security;

drop policy if exists "prometeo_semantic_registry_public_read_v1"
  on public.prometeo_semantic_registry_v1;

create policy "prometeo_semantic_registry_public_read_v1"
  on public.prometeo_semantic_registry_v1
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.prometeo_semantic_registry_v1 from anon, authenticated;
grant select on public.prometeo_semantic_registry_v1 to anon, authenticated;

insert into public.prometeo_semantic_registry_v1
(entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,authority,supersedes,depends_on,consumers,payload,promoted_at)
values
(
  'PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1',
  'Prometeo current architecture · Work Graph V1.1',
  'ARCHITECTURE',
  'STRATEGY',
  '1.1',
  'CURRENT',
  'Supabase: ROOT + Work Graph Current V1.1',
  '/current-tree/',
  100,
  'CANONICAL_INDEXED_ARCHITECTURE',
  null,
  '[]'::jsonb,
  '["ROOT","STRATEGY","UNIVERSAL_WORKERS","CURRENT_TREE"]'::jsonb,
  jsonb_build_object(
    'flow', jsonb_build_array(
      'Human Objective',
      'Objective Registry',
      'Frontier Compiler',
      'Global Work Graph',
      'Universal Worker Cycle',
      'Artifact / Result',
      'Independent Verification',
      'Promotion',
      'Canonical State'
    ),
    'supporting_systems', jsonb_build_array(
      'ROOT',
      'Worker Bus V2',
      'Cognitive Frontier',
      'Domain Guides',
      'Doctrine Registry',
      'Semantic Registry'
    ),
    'supersedes_concepts', jsonb_build_array(
      'family-local routing',
      'independent work queues as worker entrypoints',
      'manual queue refill as normal operation',
      'chat-owned continuity',
      'family-local TURN_COMPLETE'
    ),
    'expected_schemas', jsonb_build_object(
      'root','prometeo.root.index/v1',
      'work_graph','prometeo.work_graph_status/v1.1'
    ),
    'guide_invalidation_scope', jsonb_build_array('STRATEGY')
  ),
  now()
),
(
  'PROMETEO_ROOT_INDEX_V1',
  'Prometeo ROOT index',
  'INDEX',
  'ROOT',
  '1',
  'CURRENT',
  'RPC:prometeo_root_index_v1()',
  '/current-tree/',
  100,
  'INDEX_ONLY_NOT_OWNER',
  null,
  '[]'::jsonb,
  '["CURRENT_TREE","GUIDES"]'::jsonb,
  jsonb_build_object(
    'law','ROOT is an index/projection, never a second owner of truth.'
  ),
  now()
),
(
  'WORK_GRAPH_CURRENT_V1_1',
  'Global Work Graph Current V1.1',
  'RUNTIME_ARCHITECTURE',
  'WORK',
  '1.1',
  'CURRENT',
  'RPC:prometeo_root_module_v1(WORK)',
  '/o/',
  100,
  'RUNTIME',
  null,
  '[]'::jsonb,
  '["UNIVERSAL_WORKERS","ROOT","CURRENT_TREE"]'::jsonb,
  jsonb_build_object(
    'expected_schema','prometeo.work_graph_status/v1.1',
    'rule','Fresh worker shells route through the global claimable Work Graph, not a family-local queue.'
  ),
  now()
),
(
  'COGNITIVE_FRONTIER_BREAKER_PLAN_V1',
  'Cognitive Frontier Breaker Plan V1',
  'OPERATING_PLAN',
  'STRATEGY',
  '1',
  'CURRENT',
  'GitHub:/guides/prometeo/cognitive-frontier/',
  '/guides/prometeo/cognitive-frontier/',
  100,
  'STRATEGY_PLAN',
  null,
  '[]'::jsonb,
  '["STRATEGY","FRONTIER_COMPILER","CURRENT_TREE"]'::jsonb,
  jsonb_build_object(
    'law','Blocked material must not imply blocked cognition.',
    'plan_items',159
  ),
  '2026-09-24T16:25:01.77789+00:00'::timestamptz
),
(
  'LEGACY_CURRENT_GRAPH_V17',
  'Legacy repository CURRENT_GRAPH revision 17',
  'LEGACY_INDEX',
  'LEGACY',
  '17',
  'LEGACY',
  'GitHub:/state/CURRENT_GRAPH.json',
  null,
  90,
  'HISTORICAL_ONLY',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'reason','Older product/page current graph predating ROOT + global Work Graph architecture.',
    'do_not_use_as_project_current',true
  ),
  null
)
on conflict (entity_key) do update set
  title=excluded.title,
  kind=excluded.kind,
  owner_key=excluded.owner_key,
  version=excluded.version,
  status=excluded.status,
  source_ref=excluded.source_ref,
  public_route=excluded.public_route,
  importance=excluded.importance,
  authority=excluded.authority,
  supersedes=excluded.supersedes,
  depends_on=excluded.depends_on,
  consumers=excluded.consumers,
  payload=excluded.payload,
  promoted_at=coalesce(public.prometeo_semantic_registry_v1.promoted_at,excluded.promoted_at),
  updated_at=now();

create or replace function public.prometeo_current_tree_v1()
returns jsonb
language sql
volatile
security invoker
as $function$
with
root_idx as (
  select public.prometeo_root_index_v1() as j
),
modules as (
  select jsonb_object_agg(k, public.prometeo_root_module_v1(k)) as j
  from unnest(array[
    'NOW','OBJECTIVES','OPERATING_PLAN','GUIDES','DOCTRINES',
    'WORK','EXPERIMENTS','KNOWLEDGE','LEGACY_STATE','DRIFT','NEXT_ACTION'
  ]::text[]) as k
),
guides as (
  select public.prometeo_guides_dashboard_v2() as j
),
arch as (
  select *
  from public.prometeo_semantic_registry_v1
  where entity_key='PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1'
),
strategy_guide as (
  select g
  from guides,
       lateral jsonb_array_elements(coalesce(guides.j->'guides','[]'::jsonb)) g
  where g->>'guide_key'='STRATEGY'
  limit 1
),
registry as (
  select coalesce(
    jsonb_agg(
      to_jsonb(r) ||
      jsonb_build_object(
        'effective_status',
        case
          when r.entity_key='PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1'
           and (
             coalesce((select j->>'schema' from root_idx),'')
               <> coalesce(r.payload->'expected_schemas'->>'root','')
             or coalesce((select j->'NOW'->'worker_health'->'work_graph'->>'schema' from modules),'')
               <> coalesce(r.payload->'expected_schemas'->>'work_graph','')
           )
          then 'STALE'
          else r.status
        end,
        'orphan_candidate',
        (
          r.importance >= 80
          and r.status in ('CURRENT','CANDIDATE')
          and jsonb_array_length(r.consumers)=0
        )
      )
      order by r.importance desc, r.entity_key
    ),
    '[]'::jsonb
  ) as j
  from public.prometeo_semantic_registry_v1 r
),
root_stale as (
  select coalesce(jsonb_agg(e order by (e->>'ordinal')::int),'[]'::jsonb) as j
  from root_idx,
       lateral jsonb_array_elements(root_idx.j->'read_order') e
  where e->>'freshness'='STALE'
),
strategy_drift as (
  select
    case
      when (select g->>'capsule_generated_at' from strategy_guide) is null then null
      when (select promoted_at from arch) is null then null
      when ((select g->>'capsule_generated_at' from strategy_guide)::timestamptz
            < (select promoted_at from arch))
      then jsonb_build_object(
        'state','STALE',
        'guide_key','STRATEGY',
        'reason','A newer canonical architecture was promoted after the Strategy capsule was synthesized.',
        'capsule_generated_at',(select g->>'capsule_generated_at' from strategy_guide),
        'architecture_promoted_at',(select promoted_at from arch)
      )
      else null
    end as j
)
select jsonb_build_object(
  'schema','prometeo.current-tree/v1',
  'generated_at',clock_timestamp(),
  'contract',jsonb_build_object(
    'law','This tree is an index/projection, never a second owner of truth.',
    'invocation_read_order',jsonb_build_array(
      'CURRENT_TREE',
      'CURRENT_ARCHITECTURE',
      'DOMAIN_CURRENT',
      'DRIFT',
      'CONTINUE'
    ),
    'status_vocabulary',jsonb_build_array(
      'CURRENT','PENDING','STALE','SUPERSEDED','LEGACY','CANDIDATE'
    )
  ),
  'root_index',(select j from root_idx),
  'modules',(select j from modules),
  'guides',(select j from guides),
  'semantic_registry',(select j from registry),
  'health',jsonb_build_object(
    'root_stale',(select j from root_stale),
    'guide_status_issues',coalesce((select j->'DRIFT'->'guide_status_issues' from modules),'[]'::jsonb),
    'strategy_architecture_drift',(select j from strategy_drift),
    'legacy_current_sources',(
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity_key),'[]'::jsonb)
      from public.prometeo_semantic_registry_v1 r
      where r.kind like 'LEGACY%'
    ),
    'orphan_candidates',(
      select coalesce(jsonb_agg(to_jsonb(r) order by r.importance desc),'[]'::jsonb)
      from public.prometeo_semantic_registry_v1 r
      where r.importance >= 80
        and r.status in ('CURRENT','CANDIDATE')
        and jsonb_array_length(r.consumers)=0
    )
  )
);
$function$;

revoke execute on function public.prometeo_current_tree_v1() from public;
grant execute on function public.prometeo_current_tree_v1() to anon, authenticated, service_role;

comment on function public.prometeo_current_tree_v1()
is 'Read-only semantic projection of current Prometeo state. ROOT remains index-only; source owners remain authoritative.';
