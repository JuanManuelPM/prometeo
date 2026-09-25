-- PROMETEO STATISTICS V2 + CONTROL ROOM V9

CREATE OR REPLACE FUNCTION public.prometeo_statistics_v2()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with bounds as (
  select least(
    coalesce((select min((created_at at time zone 'America/Argentina/Buenos_Aires')::date) from public.prometeo_work_graph_v1),(now() at time zone 'America/Argentina/Buenos_Aires')::date),
    coalesce((select min((first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date) from public.prometeo_worker_sessions_v1),(now() at time zone 'America/Argentina/Buenos_Aires')::date)
  ) as start_day,
  (now() at time zone 'America/Argentina/Buenos_Aires')::date as end_day
),
days as (
 select generate_series(start_day,end_day,interval '1 day')::date as day_key from bounds
),
daily as (
 select d.day_key,
   (d.day_key=(select end_day from bounds)) as partial,
   coalesce((select count(*) from public.prometeo_work_graph_v1 w where (w.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as jobs_created,
   coalesce((select count(*) from public.prometeo_work_graph_v1 w where w.completed_at is not null and (w.completed_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as jobs_completed,
   coalesce((select count(*) from public.prometeo_work_graph_v1 w where w.completed_at is not null and w.completion_class='SUCCESS' and (w.completed_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as jobs_success,
   coalesce((select count(*) from public.prometeo_worker_sessions_v1 s where (s.first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as sessions,
   coalesce((select count(distinct s.agent_id) from public.prometeo_worker_sessions_v1 s where (s.first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as agents,
   coalesce((select count(*) from public.prometeo_worker_sessions_v1 s where s.admitted and (s.first_seen_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as admitted,
   coalesce((select count(*) from public.prometeo_cognitive_frontier_artifacts_v1 a where (a.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as artifacts,
   coalesce((select sum(a.answer_word_count) from public.prometeo_cognitive_frontier_artifacts_v1 a where (a.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::bigint as artifact_words,
   coalesce((select count(*) from public.prometeo_worker_job_events_v1 e where e.event_type='WATCHDOG_REQUEUE' and (e.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as requeues,
   coalesce((select count(*) from public.prometeo_worker_job_events_v1 e where e.event_type in ('VERIFY_FAILED','VERIFICATION_FAILED') and (e.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as verify_failed,
   coalesce((select count(*) from public.prometeo_worker_job_events_v1 e where e.event_type='FAIL_RECOVERABLE' and (e.created_at at time zone 'America/Argentina/Buenos_Aires')::date=d.day_key),0)::int as recoverable_failures
 from days d
),
daily_cum as (
 select *,
   sum(jobs_completed) over(order by day_key)::int as cumulative_completed,
   sum(artifacts) over(order by day_key)::int as cumulative_artifacts,
   sum(artifact_words) over(order by day_key)::bigint as cumulative_words
 from daily
),
guide as (
 select coalesce(guide_key,'UNSCOPED') as key,count(*)::int as n
 from public.prometeo_work_graph_v1
 where completed_at is not null
 group by 1 order by 2 desc
 limit 12
),
classes as (
 select coalesce(job_class,'UNCLASSIFIED') as key,count(*)::int as n
 from public.prometeo_work_graph_v1
 where completed_at is not null
 group by 1 order by 2 desc
 limit 12
),
artifact_kinds as (
 select coalesce(artifact_kind,'UNCLASSIFIED') as key,count(*)::int as n,coalesce(sum(answer_word_count),0)::bigint as words
 from public.prometeo_cognitive_frontier_artifacts_v1
 group by 1 order by 2 desc
 limit 12
),
retention as (
 select coalesce(retention_state,'UNSET') as key,count(*)::int as n
 from public.prometeo_cognitive_frontier_artifacts_v1
 group by 1 order by 2 desc
),
terminals as (
 select coalesce(terminal_reason,'UNSPECIFIED') as key,count(*)::int as n
 from public.prometeo_worker_sessions_v1
 where terminal_at is not null
 group by 1 order by 2 desc
 limit 12
),
roles as (
 select coalesce(specialization_role,'UNSPECIALIZED') as key,count(*)::int as n
 from public.prometeo_worker_sessions_v1
 group by 1 order by 2 desc
 limit 12
),
timing as (
 select
   round(avg(work_pct)::numeric,1) as avg_work_pct,
   round(avg(wait_pct)::numeric,1) as avg_wait_pct,
   round(percentile_cont(.5) within group(order by t0_to_enter_ms)::numeric) as median_enter_ms,
   round(percentile_cont(.5) within group(order by t0_to_work_ms)::numeric) as median_work_ms,
   round(percentile_cont(.5) within group(order by t0_to_publish_ms)::numeric) as median_publish_ms,
   round(percentile_cont(.9) within group(order by t0_to_publish_ms)::numeric) as p90_publish_ms
 from public.prometeo_control_session_timing
 where t0_to_publish_ms is not null
),
current_state as (
 select state,count(*)::int as n from public.prometeo_work_graph_v1 group by 1
),
totals as (
 select jsonb_build_object(
   'jobs_created',(select count(*) from public.prometeo_work_graph_v1),
   'jobs_completed',(select count(*) from public.prometeo_work_graph_v1 where completed_at is not null),
   'agents_unique',(select count(distinct agent_id) from public.prometeo_worker_sessions_v1 where agent_id is not null),
   'sessions',(select count(*) from public.prometeo_worker_sessions_v1),
   'artifacts',(select count(*) from public.prometeo_cognitive_frontier_artifacts_v1),
   'artifact_words',(select coalesce(sum(answer_word_count),0) from public.prometeo_cognitive_frontier_artifacts_v1),
   'requeues',(select count(*) from public.prometeo_worker_job_events_v1 where event_type='WATCHDOG_REQUEUE'),
   'verify_failed',(select count(*) from public.prometeo_worker_job_events_v1 where event_type in ('VERIFY_FAILED','VERIFICATION_FAILED')),
   'recoverable_failures',(select count(*) from public.prometeo_worker_job_events_v1 where event_type='FAIL_RECOVERABLE')
 ) as value
)
select jsonb_build_object(
 'schema','prometeo.statistics/v2',
 'generated_at',now(),
 'timezone','America/Argentina/Buenos_Aires',
 'range',jsonb_build_object('from',(select start_day from bounds),'to',(select end_day from bounds)),
 'totals',(select value from totals),
 'timing',(select to_jsonb(t) from timing t),
 'current_state',coalesce((select jsonb_object_agg(state,n) from current_state),'{}'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(x) order by day_key) from daily_cum x),'[]'::jsonb),
 'guides',coalesce((select jsonb_agg(to_jsonb(x)) from guide x),'[]'::jsonb),
 'job_classes',coalesce((select jsonb_agg(to_jsonb(x)) from classes x),'[]'::jsonb),
 'artifact_kinds',coalesce((select jsonb_agg(to_jsonb(x)) from artifact_kinds x),'[]'::jsonb),
 'retention',coalesce((select jsonb_agg(to_jsonb(x)) from retention x),'[]'::jsonb),
 'terminal_reasons',coalesce((select jsonb_agg(to_jsonb(x)) from terminals x),'[]'::jsonb),
 'worker_roles',coalesce((select jsonb_agg(to_jsonb(x)) from roles x),'[]'::jsonb)
);
$function$

revoke all on function public.prometeo_statistics_v2() from public;
grant execute on function public.prometeo_statistics_v2() to anon,authenticated,service_role;

update public.prometeo_semantic_registry_v1
set status='SUPERSEDED',updated_at=now()
where entity_key in ('PROMETEO_CONTROL_ROOM_V8','PROMETEO_CONTROL_ROOM_V7')
  and status='CURRENT';

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values
(
 'PROMETEO_STATISTICS_V2','Prometeo Statistics V2','OBSERVABILITY_PROJECTION','ROOT','2','CURRENT',
 'RPC:prometeo_statistics_v2()','/current-tree/control-v9/',96,'PROJECTION_ONLY',null,
 '["WORK_GRAPH_CURRENT_V1_1","PROMETEO_HISTORY_METRICS_V1"]'::jsonb,
 '["HUMAN_CONTROL_ROOM"]'::jsonb,
 '{"dimensions":["daily_work","workers","artifacts","health","guides","job_classes","latency","terminal_reasons","worker_roles"],"timezone":"America/Argentina/Buenos_Aires"}'::jsonb,
 now(),now(),now()
),
(
 'PROMETEO_CONTROL_ROOM_V9','Prometeo Control Room V9','HUMAN_CONTROL_SURFACE','ROOT','9','CURRENT',
 'GitHub:/current-tree/control-v9/index.html','/current-tree/control-v9/',100,'PROJECTION_UI_ONLY',
 'PROMETEO_CONTROL_ROOM_V8',
 '["PROMETEO_ORGANISM_PROJECTION_V1_1","PROMETEO_CONTROL_ROOM_ACTIVITY_V1","PROMETEO_WORK_CONTEXTS_V1","PROMETEO_STATISTICS_V2"]'::jsonb,
 '["HUMAN_ORIENTATION"]'::jsonb,
 '{"views":["NOW","PROJECTS","TOOLS","HISTORY","STATISTICS","ORGANISM"],"history_rule":"Timeline only; no chart controls.","statistics_rule":"Dedicated observability surface with visible charts, KPIs and composition views.","source_owner":false}'::jsonb,
 now(),now(),now()
)
on conflict(entity_key) do update set
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 depends_on=excluded.depends_on,consumers=excluded.consumers,payload=excluded.payload,updated_at=now();
