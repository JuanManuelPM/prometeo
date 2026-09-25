-- PROMETEO HISTORY METRICS + WORK CONTEXTS V1
-- Durable local continuity for pages/chats plus historical observability.
-- Raw chat prompts are private; public UI sees only PUBLIC context projection.

create table if not exists public.prometeo_work_contexts_v1(
  context_key text primary key,
  title text not null,
  context_kind text not null check(context_kind in ('PAGE','CHAT','BRANCH','IDEA','PROJECT','GUIDE','OTHER')),
  status text not null default 'ACTIVE' check(status in ('ACTIVE','PAUSED','DONE','STALE','ARCHIVED','CANDIDATE')),
  owner_key text not null default 'HUMAN',
  visibility text not null default 'PRIVATE' check(visibility in ('PRIVATE','INTERNAL','PUBLIC')),
  organism_parent_key text,
  page_id text,
  public_url text,
  chat_url text,
  source_ref text not null,
  summary text,
  next_action text,
  reopen_prompt text,
  event_count integer not null default 0,
  prompt_count integer not null default 0,
  decision_count integer not null default 0,
  last_user_prompt_at timestamptz,
  last_assistant_at timestamptz,
  last_activity_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prometeo_work_context_events_v1(
  event_id bigserial primary key,
  context_key text not null references public.prometeo_work_contexts_v1(context_key) on delete cascade,
  event_kind text not null check(event_kind in (
    'USER_PROMPT','ASSISTANT_CONCLUSION','DECISION','PLAN','ARTIFACT','PAGE_UPDATE',
    'IDEA','NOTE','OPEN','PAUSE','RESUME','DONE'
  )),
  message_text text,
  summary text,
  source_ref text,
  visibility text not null default 'PRIVATE' check(visibility in ('PRIVATE','INTERNAL','PUBLIC')),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.prometeo_work_contexts_v1 enable row level security;
alter table public.prometeo_work_context_events_v1 enable row level security;

revoke all on table public.prometeo_work_contexts_v1 from anon,authenticated;
grant select on table public.prometeo_work_contexts_v1 to anon,authenticated;
grant all on table public.prometeo_work_contexts_v1 to service_role;
revoke all on table public.prometeo_work_context_events_v1 from anon,authenticated;
grant all on table public.prometeo_work_context_events_v1 to service_role;

drop policy if exists prometeo_work_contexts_public_read_v1 on public.prometeo_work_contexts_v1;
create policy prometeo_work_contexts_public_read_v1
on public.prometeo_work_contexts_v1
for select to anon,authenticated
using(visibility='PUBLIC');

CREATE OR REPLACE FUNCTION public.prometeo_history_metrics_v1(p_days integer DEFAULT 14)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with params as (
  select greatest(1,least(coalesce(p_days,14),90))::int as days,
         (now() at time zone 'America/Argentina/Buenos_Aires')::date as today
),
bounds as (
  select
    greatest(
      (select today-(days-1) from params),
      least(
        coalesce((select min((first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date) from public.prometeo_worker_sessions_v1),date '9999-12-31'),
        coalesce((select min((created_at at time zone 'America/Argentina/Buenos_Aires')::date) from public.prometeo_work_graph_v1),date '9999-12-31'),
        coalesce((select min((created_at at time zone 'America/Argentina/Buenos_Aires')::date) from public.prometeo_worker_job_events_v1),date '9999-12-31')
      )
    ) as start_day,
    (select today from params) as end_day
),
days as (
  select generate_series(start_day,end_day,interval '1 day')::date as dte from bounds
),
agent_first as (
  select agent_id,min((first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date) as first_day
  from public.prometeo_worker_sessions_v1
  where agent_id is not null
  group by agent_id
),
new_agents as (
  select first_day as dte,count(*) as new_agents
  from agent_first group by first_day
),
sessions as (
  select (first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         count(*) as sessions,
         count(distinct agent_id) as agents_seen,
         count(*) filter(where admitted) as admitted,
         count(*) filter(where terminal_at is not null) as terminal
  from public.prometeo_worker_sessions_v1
  group by 1
),
jobs_created as (
  select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,count(*) as jobs_created
  from public.prometeo_work_graph_v1 group by 1
),
jobs_done as (
  select (completed_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         count(*) as jobs_completed,
         count(*) filter(where completion_class='SUCCESS') as jobs_success,
         count(*) filter(where completion_class is not null and completion_class<>'SUCCESS') as jobs_non_success
  from public.prometeo_work_graph_v1
  where completed_at is not null
  group by 1
),
events as (
  select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         count(*) as worker_events,
         count(*) filter(where event_type='PROGRESS') as progress_events,
         count(*) filter(where event_type='ASSIGNED') as assigned_events,
         count(*) filter(where event_type='SUBMIT_SUCCESS') as submit_success,
         count(*) filter(where event_type='WATCHDOG_REQUEUE') as watchdog_requeues,
         count(*) filter(where event_type in ('VERIFY_FAILED','VERIFICATION_FAILED')) as verify_failed,
         count(*) filter(where event_type='FAIL_RECOVERABLE') as recoverable_failures
  from public.prometeo_worker_job_events_v1
  group by 1
),
artifacts as (
  select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,count(*) as artifacts
  from public.prometeo_cognitive_frontier_artifacts_v1 group by 1
),
timing as (
  select (coalesce(t0,checkpoint_at) at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         round(avg(work_pct)::numeric,1) as avg_work_pct,
         round(avg(wait_pct)::numeric,1) as avg_wait_pct,
         round(avg(t0_to_publish_ms)::numeric) as avg_t0_to_publish_ms
  from public.prometeo_control_session_timing
  where coalesce(t0,checkpoint_at) is not null
  group by 1
),
domains_raw as (
  select (completed_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         coalesce(guide_key,'UNSCOPED') as key,count(*) as n
  from public.prometeo_work_graph_v1
  where completed_at is not null
  group by 1,2
),
domains as (
  select dte,jsonb_object_agg(key,n order by key) as domain_completed
  from domains_raw group by dte
),
classes_raw as (
  select (completed_at at time zone 'America/Argentina/Buenos_Aires')::date as dte,
         coalesce(job_class,'UNCLASSIFIED') as key,count(*) as n
  from public.prometeo_work_graph_v1
  where completed_at is not null
  group by 1,2
),
classes as (
  select dte,jsonb_object_agg(key,n order by key) as job_classes
  from classes_raw group by dte
),
daily0 as (
  select
    d.dte,
    coalesce(s.sessions,0)::int sessions,
    coalesce(s.agents_seen,0)::int agents_seen,
    coalesce(n.new_agents,0)::int new_agents,
    coalesce(s.admitted,0)::int admitted,
    coalesce(s.terminal,0)::int terminal,
    coalesce(jc.jobs_created,0)::int jobs_created,
    coalesce(jd.jobs_completed,0)::int jobs_completed,
    coalesce(jd.jobs_success,0)::int jobs_success,
    coalesce(jd.jobs_non_success,0)::int jobs_non_success,
    coalesce(e.worker_events,0)::int worker_events,
    coalesce(e.progress_events,0)::int progress_events,
    coalesce(e.assigned_events,0)::int assigned_events,
    coalesce(e.submit_success,0)::int submit_success,
    coalesce(e.watchdog_requeues,0)::int watchdog_requeues,
    coalesce(e.verify_failed,0)::int verify_failed,
    coalesce(e.recoverable_failures,0)::int recoverable_failures,
    coalesce(a.artifacts,0)::int artifacts,
    t.avg_work_pct,t.avg_wait_pct,t.avg_t0_to_publish_ms,
    coalesce(dm.domain_completed,'{}'::jsonb) domain_completed,
    coalesce(cl.job_classes,'{}'::jsonb) job_classes
  from days d
  left join sessions s using(dte)
  left join new_agents n using(dte)
  left join jobs_created jc using(dte)
  left join jobs_done jd using(dte)
  left join events e using(dte)
  left join artifacts a using(dte)
  left join timing t using(dte)
  left join domains dm using(dte)
  left join classes cl using(dte)
),
daily as (
 select *,
   sum(jobs_completed) over(order by dte)::int cumulative_jobs_completed,
   sum(artifacts) over(order by dte)::int cumulative_artifacts,
   sum(new_agents) over(order by dte)::int cumulative_agents
 from daily0
)
select jsonb_build_object(
 'schema','prometeo.history-metrics/v1',
 'generated_at',now(),
 'timezone','America/Argentina/Buenos_Aires',
 'range',jsonb_build_object('from',(select min(dte) from daily),'to',(select max(dte) from daily)),
 'metrics',jsonb_build_array(
   jsonb_build_object('key','jobs_completed','label','Trabajo completado','group','WORK'),
   jsonb_build_object('key','jobs_created','label','Trabajo creado','group','WORK'),
   jsonb_build_object('key','agents_seen','label','Workers detectados','group','WORKERS'),
   jsonb_build_object('key','new_agents','label','Workers nuevos','group','WORKERS'),
   jsonb_build_object('key','artifacts','label','Artifacts','group','ARTIFACTS'),
   jsonb_build_object('key','watchdog_requeues','label','Requeues','group','HEALTH'),
   jsonb_build_object('key','verify_failed','label','Verification failures','group','HEALTH'),
   jsonb_build_object('key','avg_work_pct','label','Tiempo trabajando','group','EFFICIENCY'),
   jsonb_build_object('key','avg_wait_pct','label','Tiempo esperando','group','EFFICIENCY')
 ),
 'daily',coalesce((
   select jsonb_agg(jsonb_build_object(
     'date',dte,'partial',dte=(select today from params),
     'sessions',sessions,'agents_seen',agents_seen,'new_agents',new_agents,
     'admitted',admitted,'terminal',terminal,
     'jobs_created',jobs_created,'jobs_completed',jobs_completed,
     'jobs_success',jobs_success,'jobs_non_success',jobs_non_success,
     'worker_events',worker_events,'progress_events',progress_events,
     'assigned_events',assigned_events,'submit_success',submit_success,
     'watchdog_requeues',watchdog_requeues,'verify_failed',verify_failed,
     'recoverable_failures',recoverable_failures,'artifacts',artifacts,
     'avg_work_pct',avg_work_pct,'avg_wait_pct',avg_wait_pct,
     'avg_t0_to_publish_ms',avg_t0_to_publish_ms,
     'cumulative_jobs_completed',cumulative_jobs_completed,
     'cumulative_artifacts',cumulative_artifacts,
     'cumulative_agents',cumulative_agents,
     'domain_completed',domain_completed,'job_classes',job_classes
   ) order by dte) from daily
 ),'[]'::jsonb)
);
$function$

CREATE OR REPLACE FUNCTION public.prometeo_organism_projection_v1_1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare p jsonb; ctx jsonb; ctx_nodes jsonb; ctx_edges jsonb; missing integer;
begin
 p:=public.prometeo_organism_projection_v1();
 ctx:=public.prometeo_work_contexts_projection_v1();

 select coalesce(jsonb_agg(jsonb_build_object(
   'node_key','CTX:'||(c->>'context_key'),
   'title',c->>'title',
   'kind','WORK_CONTEXT',
   'owner_key',c->>'owner_key',
   'status',c->>'status',
   'source_ref',c->>'source_ref',
   'public_route',c->>'public_url',
   'updated_at',c->>'updated_at',
   'authority','WORK_CONTEXT',
   'depends_on','[]'::jsonb,
   'consumers','[]'::jsonb,
   'payload',jsonb_build_object(
      'context_kind',c->>'context_kind','summary',c->>'summary','next_action',c->>'next_action',
      'chat_url',c->>'chat_url','event_count',c->'event_count','prompt_count',c->'prompt_count'
   )
 )),'[]'::jsonb)
 into ctx_nodes
 from jsonb_array_elements(coalesce(ctx->'contexts','[]'::jsonb)) c;

 select coalesce(jsonb_agg(jsonb_build_object(
   'from',c->>'organism_parent_key','to','CTX:'||(c->>'context_key'),'kind','WORK_CONTEXT'
 )),'[]'::jsonb)
 into ctx_edges
 from jsonb_array_elements(coalesce(ctx->'contexts','[]'::jsonb)) c
 where nullif(c->>'organism_parent_key','') is not null;

 select count(*) into missing
 from jsonb_array_elements(coalesce(ctx->'contexts','[]'::jsonb)) c
 where nullif(c->>'organism_parent_key','') is not null
   and not exists(
     select 1 from jsonb_array_elements((p->'nodes')||ctx_nodes) n
     where n->>'node_key'=c->>'organism_parent_key'
   );

 return jsonb_build_object(
   'schema','prometeo.organism/v1.1',
   'generated_at',now(),
   'authority','PROJECTION_ONLY_SOURCE_OWNERS_REMAIN_AUTHORITATIVE',
   'nodes',(p->'nodes')||ctx_nodes,
   'edges',(p->'edges')||ctx_edges,
   'coverage',(p->'coverage')||jsonb_build_object(
      'work_contexts',jsonb_array_length(coalesce(ctx->'contexts','[]'::jsonb)),
      'work_contexts_missing_parent',missing
   ),
   'source_tree_schema',p->>'source_tree_schema'
 );
end
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_context_append_event_v1(p_context_key text, p_event_kind text, p_message_text text DEFAULT NULL::text, p_summary text DEFAULT NULL::text, p_source_ref text DEFAULT NULL::text, p_visibility text DEFAULT 'PRIVATE'::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_occurred_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e public.prometeo_work_context_events_v1;
begin
 if not exists(select 1 from public.prometeo_work_contexts_v1 where context_key=p_context_key) then
   raise exception 'unknown context_key %',p_context_key;
 end if;
 if p_event_kind not in ('USER_PROMPT','ASSISTANT_CONCLUSION','DECISION','PLAN','ARTIFACT','PAGE_UPDATE','IDEA','NOTE','OPEN','PAUSE','RESUME','DONE') then
   raise exception 'invalid event_kind';
 end if;
 if p_visibility not in ('PRIVATE','INTERNAL','PUBLIC') then raise exception 'invalid visibility'; end if;

 insert into public.prometeo_work_context_events_v1(
  context_key,event_kind,message_text,summary,source_ref,visibility,metadata,occurred_at
 ) values(
  p_context_key,p_event_kind,p_message_text,p_summary,p_source_ref,p_visibility,coalesce(p_metadata,'{}'::jsonb),coalesce(p_occurred_at,now())
 ) returning * into e;

 update public.prometeo_work_contexts_v1 set
   event_count=event_count+1,
   prompt_count=prompt_count+case when p_event_kind='USER_PROMPT' then 1 else 0 end,
   decision_count=decision_count+case when p_event_kind='DECISION' then 1 else 0 end,
   last_user_prompt_at=case when p_event_kind='USER_PROMPT' then e.occurred_at else last_user_prompt_at end,
   last_assistant_at=case when p_event_kind in ('ASSISTANT_CONCLUSION','DECISION','PLAN') then e.occurred_at else last_assistant_at end,
   last_activity_at=e.occurred_at,
   updated_at=now()
 where context_key=p_context_key;

 return to_jsonb(e);
end
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_context_checkpoint_v1(p_context_key text, p_summary text DEFAULT NULL::text, p_next_action text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_reopen_prompt text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v public.prometeo_work_contexts_v1;
begin
 if p_status is not null and p_status not in ('ACTIVE','PAUSED','DONE','STALE','ARCHIVED','CANDIDATE') then
   raise exception 'invalid status';
 end if;
 update public.prometeo_work_contexts_v1 set
   summary=coalesce(p_summary,summary),
   next_action=coalesce(p_next_action,next_action),
   status=coalesce(p_status,status),
   reopen_prompt=coalesce(p_reopen_prompt,reopen_prompt),
   payload=payload||coalesce(p_payload,'{}'::jsonb),
   last_activity_at=now(),
   updated_at=now()
 where context_key=p_context_key
 returning * into v;
 if v.context_key is null then raise exception 'unknown context_key %',p_context_key; end if;
 return to_jsonb(v);
end
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_context_register_v1(p_context_key text, p_title text, p_context_kind text, p_owner_key text, p_source_ref text, p_visibility text DEFAULT 'PRIVATE'::text, p_status text DEFAULT 'ACTIVE'::text, p_organism_parent_key text DEFAULT NULL::text, p_page_id text DEFAULT NULL::text, p_public_url text DEFAULT NULL::text, p_chat_url text DEFAULT NULL::text, p_summary text DEFAULT NULL::text, p_next_action text DEFAULT NULL::text, p_reopen_prompt text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v public.prometeo_work_contexts_v1;
begin
 if nullif(btrim(p_context_key),'') is null or nullif(btrim(p_title),'') is null or nullif(btrim(p_source_ref),'') is null then
   raise exception 'context_key, title and source_ref are required';
 end if;
 if p_context_kind not in ('PAGE','CHAT','BRANCH','IDEA','PROJECT','GUIDE','OTHER') then raise exception 'invalid context_kind'; end if;
 if p_visibility not in ('PRIVATE','INTERNAL','PUBLIC') then raise exception 'invalid visibility'; end if;
 if p_status not in ('ACTIVE','PAUSED','DONE','STALE','ARCHIVED','CANDIDATE') then raise exception 'invalid status'; end if;

 insert into public.prometeo_work_contexts_v1(
  context_key,title,context_kind,status,owner_key,visibility,organism_parent_key,page_id,
  public_url,chat_url,source_ref,summary,next_action,reopen_prompt,payload,last_activity_at,created_at,updated_at
 ) values(
  btrim(p_context_key),btrim(p_title),p_context_kind,p_status,coalesce(nullif(btrim(p_owner_key),''),'HUMAN'),
  p_visibility,nullif(btrim(p_organism_parent_key),''),nullif(btrim(p_page_id),''),
  nullif(btrim(p_public_url),''),nullif(btrim(p_chat_url),''),btrim(p_source_ref),
  p_summary,p_next_action,p_reopen_prompt,coalesce(p_payload,'{}'::jsonb),now(),now(),now()
 )
 on conflict(context_key) do update set
  title=excluded.title,context_kind=excluded.context_kind,status=excluded.status,
  owner_key=excluded.owner_key,visibility=excluded.visibility,
  organism_parent_key=excluded.organism_parent_key,page_id=excluded.page_id,
  public_url=excluded.public_url,chat_url=excluded.chat_url,source_ref=excluded.source_ref,
  summary=coalesce(excluded.summary,public.prometeo_work_contexts_v1.summary),
  next_action=coalesce(excluded.next_action,public.prometeo_work_contexts_v1.next_action),
  reopen_prompt=coalesce(excluded.reopen_prompt,public.prometeo_work_contexts_v1.reopen_prompt),
  payload=public.prometeo_work_contexts_v1.payload||excluded.payload,
  last_activity_at=now(),updated_at=now()
 returning * into v;
 return to_jsonb(v);
end
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_context_reopen_v1(p_context_key text, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'schema','prometeo.work-context-reopen/v1',
  'context',(select to_jsonb(c) from public.prometeo_work_contexts_v1 c where c.context_key=p_context_key),
  'events',coalesce((
    select jsonb_agg(to_jsonb(e) order by e.occurred_at)
    from (
      select * from public.prometeo_work_context_events_v1
      where context_key=p_context_key
      order by occurred_at desc
      limit greatest(1,least(coalesce(p_limit,30),100))
    ) e
  ),'[]'::jsonb)
 );
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_context_search_v1(p_query text, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with q as (
 select '%'||lower(coalesce(p_query,''))||'%' as pat,
        greatest(1,least(coalesce(p_limit,10),50)) as lim
),
context_hits as (
 select c.context_key,c.title,c.context_kind,c.status,c.owner_key,c.page_id,c.public_url,c.chat_url,
        c.source_ref,c.summary,c.next_action,c.reopen_prompt,c.last_activity_at,
        case
          when lower(c.title) like q.pat then 100
          when lower(coalesce(c.summary,'')) like q.pat then 80
          when lower(coalesce(c.next_action,'')) like q.pat then 70
          when lower(coalesce(c.page_id,'')) like q.pat then 60
          else 20
        end as score
 from public.prometeo_work_contexts_v1 c,q
 where q.pat='%%'
    or lower(c.title) like q.pat
    or lower(coalesce(c.summary,'')) like q.pat
    or lower(coalesce(c.next_action,'')) like q.pat
    or lower(coalesce(c.page_id,'')) like q.pat
    or exists(
      select 1 from public.prometeo_work_context_events_v1 e
      where e.context_key=c.context_key
        and (
          lower(coalesce(e.message_text,'')) like q.pat
          or lower(coalesce(e.summary,'')) like q.pat
        )
    )
 order by score desc,c.last_activity_at desc
 limit (select lim from q)
),
event_hits as (
 select e.context_key,
        jsonb_agg(jsonb_build_object(
          'event_id',e.event_id,'event_kind',e.event_kind,
          'summary',e.summary,
          'snippet',left(coalesce(e.message_text,''),280),
          'occurred_at',e.occurred_at
        ) order by e.occurred_at desc) filter(where e.event_id is not null) as matches
 from public.prometeo_work_context_events_v1 e,q
 where q.pat<>'%%'
   and (
     lower(coalesce(e.message_text,'')) like q.pat
     or lower(coalesce(e.summary,'')) like q.pat
   )
 group by e.context_key
)
select jsonb_build_object(
 'schema','prometeo.work-context-search/v1',
 'query',p_query,
 'results',coalesce(jsonb_agg(jsonb_build_object(
   'context_key',h.context_key,'title',h.title,'context_kind',h.context_kind,'status',h.status,
   'owner_key',h.owner_key,'page_id',h.page_id,'public_url',h.public_url,'chat_url',h.chat_url,
   'source_ref',h.source_ref,'summary',h.summary,'next_action',h.next_action,
   'reopen_prompt',h.reopen_prompt,'last_activity_at',h.last_activity_at,
   'score',h.score,'matched_events',coalesce(e.matches,'[]'::jsonb)
 ) order by h.score desc,h.last_activity_at desc),'[]'::jsonb)
)
from context_hits h
left join event_hits e using(context_key);
$function$

CREATE OR REPLACE FUNCTION public.prometeo_work_contexts_projection_v1()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'schema','prometeo.work-contexts/v1',
  'generated_at',now(),
  'contexts',coalesce(jsonb_agg(jsonb_build_object(
    'context_key',context_key,'title',title,'context_kind',context_kind,'status',status,
    'owner_key',owner_key,'visibility',visibility,'organism_parent_key',organism_parent_key,
    'page_id',page_id,'public_url',public_url,'chat_url',chat_url,'source_ref',source_ref,
    'summary',summary,'next_action',next_action,'event_count',event_count,'prompt_count',prompt_count,
    'decision_count',decision_count,'last_activity_at',last_activity_at,'updated_at',updated_at
  ) order by last_activity_at desc),'[]'::jsonb)
 )
 from public.prometeo_work_contexts_v1;
$function$


revoke all on function public.prometeo_history_metrics_v1(integer) from public;
grant execute on function public.prometeo_history_metrics_v1(integer) to anon,authenticated,service_role;

revoke all on function public.prometeo_work_context_register_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.prometeo_work_context_register_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) to service_role;

revoke all on function public.prometeo_work_context_append_event_v1(text,text,text,text,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.prometeo_work_context_append_event_v1(text,text,text,text,text,text,jsonb,timestamptz) to service_role;

revoke all on function public.prometeo_work_context_checkpoint_v1(text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.prometeo_work_context_checkpoint_v1(text,text,text,text,text,jsonb) to service_role;

revoke all on function public.prometeo_work_context_search_v1(text,integer) from public,anon,authenticated;
grant execute on function public.prometeo_work_context_search_v1(text,integer) to service_role;

revoke all on function public.prometeo_work_context_reopen_v1(text,integer) from public,anon,authenticated;
grant execute on function public.prometeo_work_context_reopen_v1(text,integer) to service_role;

revoke all on function public.prometeo_work_contexts_projection_v1() from public;
grant execute on function public.prometeo_work_contexts_projection_v1() to anon,authenticated,service_role;

revoke all on function public.prometeo_organism_projection_v1_1() from public;
grant execute on function public.prometeo_organism_projection_v1_1() to anon,authenticated,service_role;

select public.prometeo_work_context_register_v1(
 'PROMETEO_LIVE_V6','Prometeo · Live V6','PAGE','ROOT','GitHub:/current-tree/live-v6/index.html',
 'PUBLIC','ACTIVE','SEM:PROMETEO_ORGANISM_PROJECTION_V1_1',
 null,'https://juanmanuelpm.github.io/prometeo/current-tree/live-v6/',null,
 'Superficie viva para Estado, Historial, Trabajo y Organismo.',
 'Integrar trabajo paralelo, contexto de chats y cobertura estadística.',
 'Abrir Current Tree V2, Organism Projection V1.1 y Work Context antes de modificar la superficie.',
 '{"page_role":"HUMAN_ORIENTATION","safe_public":true}'::jsonb
);

update public.prometeo_semantic_registry_v1
set status='SUPERSEDED',updated_at=now()
where entity_key='PROMETEO_ORGANISM_PROJECTION_V1' and status='CURRENT';

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values
(
 'PROMETEO_ORGANISM_PROJECTION_V1_1','Prometeo Organism Projection V1.1','ORIENTATION_PROJECTION','ROOT','1.1','CURRENT',
 'RPC:prometeo_organism_projection_v1_1()','/current-tree/live-v6/',100,'PROJECTION_ONLY',
 'PROMETEO_ORGANISM_PROJECTION_V1',
 '["PROMETEO_CURRENT_TREE_V2","PROMETEO_ROOT_INDEX_V1","WORK_GRAPH_CURRENT_V1_1"]'::jsonb,
 '["HUMAN_ORIENTATION","DOMAIN_GUIDES","PARALLEL_CHATS","WORK_CONTEXTS"]'::jsonb,
 '{"law":"Everything important gets an address; work contexts attach chats/pages to organism nodes without becoming source owners.","history_metrics_rpc":"prometeo_history_metrics_v1","work_contexts_rpc":"prometeo_work_contexts_projection_v1"}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_HISTORY_METRICS_V1','Prometeo History Metrics V1','OBSERVABILITY_PROJECTION','ROOT','1','CURRENT',
 'RPC:prometeo_history_metrics_v1(integer)','/current-tree/live-v6/',95,'PROJECTION_ONLY',null,
 '["WORK_GRAPH_CURRENT_V1_1"]'::jsonb,'["HUMAN_ORIENTATION","HISTORY_UI"]'::jsonb,
 '{"timezone":"America/Argentina/Buenos_Aires","dimensions":["work","workers","artifacts","health","efficiency","domains"]}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_WORK_CONTEXTS_V1','Prometeo Work Context Registry V1','CONTEXT_REGISTRY','ROOT','1','CURRENT',
 'TABLE:prometeo_work_contexts_v1','/current-tree/live-v6/',100,'CONTEXT_ONLY_NOT_CANON',null,
 '["PROMETEO_ORGANISM_PROJECTION_V1_1"]'::jsonb,'["PARALLEL_CHATS","PAGES","DOMAIN_GUIDES"]'::jsonb,
 '{"event_table":"prometeo_work_context_events_v1","private_prompts":true,"reopen_rpc":"prometeo_work_context_reopen_v1"}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_WORK_CONTEXT_REOPEN_V1','Prometeo Work Context Reopen V1','REOPEN_PROTOCOL','ROOT','1','CURRENT',
 'RPC:prometeo_work_context_search_v1(text,integer)','/current-tree/live-v6/',100,'PRIVATE_CONTEXT_RECALL',null,
 '["PROMETEO_WORK_CONTEXTS_V1"]'::jsonb,'["PARALLEL_CHATS","HUMAN_RECALL","DOMAIN_GUIDES"]'::jsonb,
 '{"search_rpc":"prometeo_work_context_search_v1","reopen_rpc":"prometeo_work_context_reopen_v1","checkpoint_rpc":"prometeo_work_context_checkpoint_v1"}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_WORK_CONTEXT_CHAT_MEMORY_V1','Prometeo Work Context / Chat Memory V1','INVOCATION_CONTRACT','ROOT','1','CURRENT',
 'GitHub:/current-tree/work-context/invoke.txt','/current-tree/work-context/invoke.txt',100,
 'PRIVATE_CONTEXT_CONTINUITY',null,
 '["PROMETEO_WORK_CONTEXTS_V1","PROMETEO_WORK_CONTEXT_REOPEN_V1","PROMETEO_ORGANISM_PROJECTION_V1_1"]'::jsonb,
 '["PARALLEL_CHATS","PAGES","DOMAIN_GUIDES","HUMAN_RECALL"]'::jsonb,
 '{"law":"Every adopted chat turn logs the human prompt privately before substantive work and checkpoints conclusions/next action after.","raw_prompts_public":false}'::jsonb,
 now(),now(),now()
)
on conflict(entity_key) do update set
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 depends_on=excluded.depends_on,consumers=excluded.consumers,payload=excluded.payload,updated_at=now();
