-- PROMETEO CONTROL ROOM V7
-- Public activity projection + human control surface registration.

CREATE OR REPLACE FUNCTION public.prometeo_control_room_activity_v1(p_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with lim as (
  select greatest(5,least(coalesce(p_limit,40),100)) as n
),
worker_events as (
  select
    e.created_at as occurred_at,
    'WORK_EVENT'::text as kind,
    e.event_type as event_type,
    coalesce(w.title,'Work Graph event') as title,
    coalesce(w.guide_key,'UNSCOPED') as scope,
    w.objective_key,
    case
      when w.objective_key is not null then 'OBJECTIVE:'||w.objective_key
      else 'SEM:WORK_GRAPH_CURRENT_V1_1'
    end as node_key,
    null::text as source_ref,
    jsonb_build_object(
      'job_class',w.job_class,
      'state',w.state,
      'completion_class',w.completion_class,
      'frontier_stage',w.frontier_stage
    ) as payload
  from public.prometeo_worker_job_events_v1 e
  left join public.prometeo_work_graph_v1 w on w.job_id=e.job_id
  where e.event_type in (
    'ASSIGNED','PROGRESS','SUBMIT_SUCCESS','WATCHDOG_REQUEUE',
    'VERIFY_FAILED','VERIFICATION_FAILED','FAIL_RECOVERABLE'
  )
  order by e.created_at desc
  limit (select n from lim)
),
semantic_events as (
  select
    s.updated_at as occurred_at,
    'SEMANTIC'::text as kind,
    s.status as event_type,
    s.title,
    s.owner_key as scope,
    null::text as objective_key,
    'SEM:'||s.entity_key as node_key,
    s.source_ref,
    jsonb_build_object(
      'kind',s.kind,
      'version',s.version,
      'authority',s.authority,
      'public_route',s.public_route
    ) as payload
  from public.prometeo_semantic_registry_v1 s
  order by s.updated_at desc
  limit (select n from lim)
),
objective_events as (
  select
    o.updated_at as occurred_at,
    'OBJECTIVE'::text as kind,
    o.status as event_type,
    o.title,
    o.guide_key as scope,
    o.objective_key,
    'OBJECTIVE:'||o.objective_key as node_key,
    o.source_ref,
    jsonb_build_object('compiler_key',o.compiler_key,'completed_at',o.completed_at) as payload
  from public.prometeo_work_objectives_v1 o
  order by o.updated_at desc
  limit (select n from lim)
),
context_events as (
  select
    c.last_activity_at as occurred_at,
    'WORK_CONTEXT'::text as kind,
    c.status as event_type,
    c.title,
    c.owner_key as scope,
    null::text as objective_key,
    'CTX:'||c.context_key as node_key,
    c.source_ref,
    jsonb_build_object(
      'context_kind',c.context_kind,
      'public_url',c.public_url,
      'event_count',c.event_count,
      'prompt_count',c.prompt_count,
      'next_action',c.next_action
    ) as payload
  from public.prometeo_work_contexts_v1 c
  where c.visibility='PUBLIC'
  order by c.last_activity_at desc
  limit (select n from lim)
),
all_events as (
  select * from worker_events
  union all select * from semantic_events
  union all select * from objective_events
  union all select * from context_events
),
ranked as (
  select * from all_events order by occurred_at desc limit (select n from lim)
)
select jsonb_build_object(
  'schema','prometeo.control-room-activity/v1',
  'generated_at',now(),
  'events',coalesce(jsonb_agg(jsonb_build_object(
    'occurred_at',occurred_at,'kind',kind,'event_type',event_type,
    'title',title,'scope',scope,'objective_key',objective_key,
    'node_key',node_key,'source_ref',source_ref,'payload',payload
  ) order by occurred_at desc),'[]'::jsonb)
)
from ranked;
$function$

revoke all on function public.prometeo_control_room_activity_v1(integer) from public;
grant execute on function public.prometeo_control_room_activity_v1(integer)
to anon,authenticated,service_role;

select public.prometeo_work_context_register_v1(
 'PROMETEO_CONTROL_ROOM_V7',
 'Prometeo · Control Room V7',
 'PAGE',
 'ROOT',
 'GitHub:/current-tree/control-v7/index.html',
 'PUBLIC',
 'ACTIVE',
 'SEM:PROMETEO_ORGANISM_PROJECTION_V1_1',
 null,
 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v7/',
 null,
 'Control room móvil: Ahora, Historial, Trabajo y Organismo con búsqueda, foco y panel contextual universal.',
 'Iterar con feedback humano sobre navegación, foco, estadísticas y organismo.',
 'Abrir Current Tree V2, Organism V1.1, History Metrics V1, Activity V1 y Work Context antes de modificar esta superficie.',
 '{"page_role":"HUMAN_CONTROL_ROOM","mobile_first":true}'::jsonb
);

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values(
 'PROMETEO_CONTROL_ROOM_ACTIVITY_V1','Prometeo Control Room Activity V1','OBSERVABILITY_PROJECTION',
 'ROOT','1','CURRENT','RPC:prometeo_control_room_activity_v1(integer)',
 '/current-tree/control-v7/',95,'PROJECTION_ONLY',null,
 '["WORK_GRAPH_CURRENT_V1_1","PROMETEO_WORK_CONTEXTS_V1"]'::jsonb,
 '["HUMAN_CONTROL_ROOM"]'::jsonb,
 '{"privacy":"Only public work contexts; no raw private prompt text.","event_sources":["worker_events","semantic_registry","objectives","public_work_contexts"]}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_CONTROL_ROOM_V7','Prometeo Control Room V7','HUMAN_CONTROL_SURFACE','ROOT','7','CURRENT',
 'GitHub:/current-tree/control-v7/index.html','/current-tree/control-v7/',100,'PROJECTION_UI_ONLY',null,
 '["PROMETEO_ORGANISM_PROJECTION_V1_1","PROMETEO_HISTORY_METRICS_V1","PROMETEO_CONTROL_ROOM_ACTIVITY_V1","PROMETEO_WORK_CONTEXTS_V1"]'::jsonb,
 '["HUMAN_ORIENTATION"]'::jsonb,
 '{"views":["NOW","HISTORY","WORK","ORGANISM"],"interactions":["GLOBAL_SEARCH","UNIVERSAL_DRAWER","FOCUS","IMPACT","PAN_PINCH"],"source_owner":false}'::jsonb,
 now(),now(),now()
)
on conflict(entity_key) do update set
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 depends_on=excluded.depends_on,consumers=excluded.consumers,payload=excluded.payload,updated_at=now();
