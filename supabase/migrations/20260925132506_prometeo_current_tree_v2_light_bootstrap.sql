-- Prometeo Current Tree V2 · light public bootstrap
-- Applied in Supabase as migration 20260925132506.
-- Deep owners are intentionally lazy-loaded by the UI.

CREATE OR REPLACE FUNCTION public.prometeo_current_tree_v2()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with
root_idx as (
  select public.prometeo_root_index_v1() as j
),
arch as (
  select r.*
  from public.prometeo_semantic_registry_v1 r
  where r.entity_key='PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1'
  limit 1
),
guide_rows as (
  select
    g.guide_key,
    g.slug,
    g.title,
    g.short_title,
    g.domain_type,
    g.mission,
    g.status as declared_status,
    g.page_route,
    g.invoke_route,
    g.current_version,
    g.updated_at,
    c.capsule_status,
    c.headline,
    c.generated_at as capsule_generated_at,
    case
      when c.capsule_status='PENDING_SYNTHESIS' then 'PENDING'
      when c.generated_at is null then 'PENDING'
      when (
        coalesce((select a.payload->'guide_invalidation_scope' ? g.guide_key from arch a), false)
        and c.generated_at < coalesce((select a.promoted_at from arch a), '-infinity'::timestamptz)
      ) then 'STALE'
      else coalesce(c.capsule_status, g.status, 'PENDING')
    end as effective_status
  from public.prometeo_domain_guides_v1 g
  left join lateral (
    select c.*
    from public.prometeo_domain_guide_capsules_v1 c
    where c.guide_key=g.guide_key
    order by c.version desc
    limit 1
  ) c on true
  order by
    case g.guide_key
      when 'STRATEGY' then 0
      when 'VISUAL' then 1
      when 'STUDY' then 2
      when 'STUDENTS' then 3
      when 'AUDIO' then 4
      when 'PERSONAL' then 5
      else 99
    end,
    g.guide_key
),
guides as (
  select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) as j
  from guide_rows g
),
work_counts as (
  select jsonb_object_agg(state, n) as j
  from (
    select state, count(*)::int as n
    from public.prometeo_work_graph_v1
    group by state
  ) q
),
active_objectives as (
  select coalesce(jsonb_agg(to_jsonb(o) order by o.updated_at desc), '[]'::jsonb) as j
  from (
    select objective_key, guide_key, title, status, compiler_key, source_ref, updated_at
    from public.prometeo_work_objectives_v1
    where status='ACTIVE'
    order by updated_at desc
    limit 12
  ) o
),
active_jobs as (
  select coalesce(jsonb_agg(to_jsonb(j) order by j.last_progress_at desc nulls last, j.claimed_at desc nulls last), '[]'::jsonb) as j
  from (
    select job_id, objective_key, node_key, title, guide_key, job_class, state,
           frontier_stage, claimed_at, last_progress_at
    from public.prometeo_work_graph_v1
    where state='ACTIVE'
    order by last_progress_at desc nulls last, claimed_at desc nulls last
    limit 12
  ) j
),
registry as (
  select coalesce(jsonb_agg(
    to_jsonb(r) ||
    jsonb_build_object(
      'effective_status',
      case
        when r.entity_key='PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1'
         and coalesce((select j->>'schema' from root_idx),'')
             <> coalesce(r.payload->'expected_schemas'->>'root','')
        then 'STALE'
        else r.status
      end,
      'orphan_candidate',
      (r.importance >= 80 and r.status in ('CURRENT','CANDIDATE') and jsonb_array_length(r.consumers)=0)
    )
    order by r.importance desc, r.entity_key
  ), '[]'::jsonb) as j
  from public.prometeo_semantic_registry_v1 r
),
root_stale as (
  select coalesce(jsonb_agg(e order by (e->>'ordinal')::int),'[]'::jsonb) as j
  from root_idx,
       lateral jsonb_array_elements(coalesce(root_idx.j->'read_order','[]'::jsonb)) e
  where e->>'freshness'='STALE'
),
guide_issues as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind','GUIDE_STALE',
    'severity','HIGH',
    'guide_key',g.guide_key,
    'title',g.title,
    'reason','A material dependency changed after this Guide capsule was synthesized.',
    'capsule_generated_at',g.capsule_generated_at,
    'architecture_promoted_at',(select promoted_at from arch)
  )),'[]'::jsonb) as j
  from guide_rows g
  where g.effective_status='STALE'
),
root_issues as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind','ROOT_STALE',
    'severity',case when (e->>'required')::boolean then 'MEDIUM' else 'LOW' end,
    'module_key',e->>'module_key',
    'title',e->>'title',
    'age_minutes',e->'age_minutes',
    'sla_minutes',e->'freshness_sla_minutes',
    'source_ref',e->>'source_ref'
  ) order by (e->>'ordinal')::int),'[]'::jsonb) as j
  from root_idx,
       lateral jsonb_array_elements(coalesce(root_idx.j->'read_order','[]'::jsonb)) e
  where e->>'freshness'='STALE'
),
legacy_issues as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind','LEGACY_CURRENT_SOURCE',
    'severity','MEDIUM',
    'entity_key',r.entity_key,
    'title',r.title,
    'source_ref',r.source_ref,
    'reason',coalesce(r.payload->>'reason','Historical current-like source; do not treat as project CURRENT.')
  )),'[]'::jsonb) as j
  from public.prometeo_semantic_registry_v1 r
  where r.kind like 'LEGACY%'
),
orphan_issues as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind','ORPHAN_IMPORTANT',
    'severity','MEDIUM',
    'entity_key',r.entity_key,
    'title',r.title,
    'status',r.status,
    'importance',r.importance
  )),'[]'::jsonb) as j
  from public.prometeo_semantic_registry_v1 r
  where r.importance >= 80
    and r.status in ('CURRENT','CANDIDATE')
    and jsonb_array_length(r.consumers)=0
),
issues as (
  select coalesce((select j from guide_issues),'[]'::jsonb)
       || coalesce((select j from root_issues),'[]'::jsonb)
       || coalesce((select j from legacy_issues),'[]'::jsonb)
       || coalesce((select j from orphan_issues),'[]'::jsonb) as j
)
select jsonb_build_object(
  'schema','prometeo.current-tree/v2',
  'generated_at',clock_timestamp(),
  'contract',jsonb_build_object(
    'law','One orientation surface; source owners remain authoritative.',
    'load_model','LIGHT_BOOTSTRAP_THEN_LAZY_DETAIL',
    'invocation_read_order',jsonb_build_array(
      'CURRENT_TREE_V2',
      'CURRENT_ARCHITECTURE',
      'DOMAIN_CURRENT',
      'DRIFT',
      'CONTINUE'
    ),
    'status_vocabulary',jsonb_build_array(
      'CURRENT','PENDING','STALE','SUPERSEDED','LEGACY','CANDIDATE'
    )
  ),
  'architecture',(
    select to_jsonb(a) ||
      jsonb_build_object(
        'effective_status',
        case
          when coalesce((select j->>'schema' from root_idx),'')
               <> coalesce(a.payload->'expected_schemas'->>'root','')
          then 'STALE'
          else a.status
        end
      )
    from arch a
  ),
  'root_index',(select j from root_idx),
  'guides',(select j from guides),
  'work',jsonb_build_object(
    'counts',coalesce((select j from work_counts),'{}'::jsonb),
    'active_objectives',(select j from active_objectives),
    'active_jobs',(select j from active_jobs)
  ),
  'semantic_registry',(select j from registry),
  'health',jsonb_build_object(
    'issues',(select j from issues),
    'issue_count',jsonb_array_length((select j from issues)),
    'root_stale',(select j from root_stale)
  )
);
$function$
;

revoke execute on function public.prometeo_current_tree_v2() from public;
grant execute on function public.prometeo_current_tree_v2() to anon, authenticated, service_role;

update public.prometeo_semantic_registry_v1
set status='SUPERSEDED',
    payload=coalesce(payload,'{}'::jsonb) || jsonb_build_object(
      'reason','Public bootstrap exceeded PostgREST statement timeout because it eagerly expanded the full Guides dashboard.',
      'superseded_by','PROMETEO_CURRENT_TREE_V2'
    ),
    updated_at=now()
where entity_key='PROMETEO_CURRENT_TREE_V1';

insert into public.prometeo_semantic_registry_v1
(entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,authority,supersedes,depends_on,consumers,payload,promoted_at)
values (
  'PROMETEO_CURRENT_TREE_V2',
  'Prometeo Current Tree V2',
  'ORIENTATION_PROJECTION',
  'ROOT',
  '2',
  'CURRENT',
  'RPC:prometeo_current_tree_v2()',
  '/current-tree/',
  100,
  'PROJECTION_ONLY',
  'PROMETEO_CURRENT_TREE_V1',
  '["PROMETEO_ROOT_INDEX_V1","PROMETEO_ARCHITECTURE_WORK_GRAPH_V1_1","WORK_GRAPH_CURRENT_V1_1"]'::jsonb,
  '["DOMAIN_GUIDE_INVOCATION","HUMAN_ORIENTATION","CURRENT_TREE_UI"]'::jsonb,
  jsonb_build_object(
    'load_model','LIGHT_BOOTSTRAP_THEN_LAZY_DETAIL',
    'reason','Keep first paint fast and fetch deep owners only when selected.'
  ),
  now()
)
on conflict (entity_key) do update set
  status=excluded.status,
  source_ref=excluded.source_ref,
  public_route=excluded.public_route,
  importance=excluded.importance,
  authority=excluded.authority,
  supersedes=excluded.supersedes,
  depends_on=excluded.depends_on,
  consumers=excluded.consumers,
  payload=excluded.payload,
  updated_at=now();
