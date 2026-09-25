-- PROMETEO STATISTICS V3
-- Intervention-oriented diagnostics: admission, liveness, productivity, churn/capacity waste, frontier bottlenecks.

CREATE OR REPLACE FUNCTION public.prometeo_statistics_v3()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with base as (
  select public.prometeo_statistics_v2() as j
),
session_submit as (
  select s.session_id,s.agent_id,s.admitted,s.first_seen_at,s.last_seen_at,s.terminal_at,s.terminal_reason,
         count(e.*) filter(where e.event_type='SUBMIT_SUCCESS')::int as submits,
         count(e.*) filter(where e.event_type='PROGRESS')::int as progress_events,
         count(e.*) filter(where e.event_type='ASSIGNED')::int as assignments
  from public.prometeo_worker_sessions_v1 s
  left join public.prometeo_worker_job_events_v1 e on e.session_id=s.session_id
  group by s.session_id,s.agent_id,s.admitted,s.first_seen_at,s.last_seen_at,s.terminal_at,s.terminal_reason
),
fleet as (
 select
  count(*)::int as sessions_total,
  count(*) filter(where admitted)::int as admitted,
  count(*) filter(where not admitted)::int as rejected,
  round((100.0*count(*) filter(where admitted)/nullif(count(*),0))::numeric,1) as admission_pct,
  count(*) filter(where admitted and submits=0)::int as admitted_zero_submit,
  round((100.0*count(*) filter(where admitted and submits=0)/nullif(count(*) filter(where admitted),0))::numeric,1) as zero_submit_pct,
  round(avg(submits) filter(where admitted)::numeric,2) as avg_submits_per_admitted,
  percentile_cont(.5) within group(order by submits) filter(where admitted) as median_submits_per_admitted,
  percentile_cont(.9) within group(order by submits) filter(where admitted) as p90_submits_per_admitted,
  count(*) filter(where terminal_at is null)::int as open_memberships,
  count(*) filter(where terminal_at is null and last_seen_at>=now()-interval '2 minutes')::int as signal_2m,
  count(*) filter(where terminal_at is null and last_seen_at>=now()-interval '5 minutes')::int as signal_5m,
  count(*) filter(where terminal_at is null and (last_seen_at is null or last_seen_at<now()-interval '5 minutes'))::int as stale_open_memberships
 from session_submit
),
events as (
 select
  count(*) filter(where created_at>=now()-interval '15 minutes' and event_type='ASSIGNED')::int as assigned_15m,
  count(*) filter(where created_at>=now()-interval '15 minutes' and event_type='PROGRESS')::int as progress_15m,
  count(*) filter(where created_at>=now()-interval '15 minutes' and event_type='SUBMIT_SUCCESS')::int as submit_15m,
  count(*) filter(where created_at>=now()-interval '15 minutes' and event_type='WATCHDOG_REQUEUE')::int as requeue_15m,
  count(*) filter(where created_at>=now()-interval '60 minutes' and event_type='ASSIGNED')::int as assigned_60m,
  count(*) filter(where created_at>=now()-interval '60 minutes' and event_type='PROGRESS')::int as progress_60m,
  count(*) filter(where created_at>=now()-interval '60 minutes' and event_type='SUBMIT_SUCCESS')::int as submit_60m,
  count(*) filter(where created_at>=now()-interval '60 minutes' and event_type='WATCHDOG_REQUEUE')::int as requeue_60m,
  count(*) filter(where created_at>=now()-interval '60 minutes' and event_type in ('VERIFY_FAILED','VERIFICATION_FAILED'))::int as verify_failed_60m,
  count(*) filter(where created_at>=now()-interval '24 hours' and event_type='ASSIGNED')::int as assigned_24h,
  count(*) filter(where created_at>=now()-interval '24 hours' and event_type='SUBMIT_SUCCESS')::int as submit_24h,
  count(*) filter(where created_at>=now()-interval '24 hours' and event_type='WATCHDOG_REQUEUE')::int as requeue_24h
 from public.prometeo_worker_job_events_v1
),
work_now as (
 select
  count(*) filter(where state='ACTIVE')::int as active,
  count(*) filter(where state='ACTIVE' and last_progress_at>=now()-interval '2 minutes')::int as active_progress_2m,
  count(*) filter(where state='ACTIVE' and last_progress_at>=now()-interval '5 minutes')::int as active_progress_5m,
  count(*) filter(where state='ACTIVE' and (last_progress_at is null or last_progress_at<now()-interval '5 minutes'))::int as active_stale_5m,
  count(*) filter(where state='READY')::int as ready,
  count(*) filter(where state='BLOCKED')::int as blocked,
  count(*) filter(where state='DONE')::int as done
 from public.prometeo_work_graph_v1
),
timing as (
 select
  round(avg(work_pct)::numeric,1) as avg_work_pct,
  round(avg(wait_pct)::numeric,1) as avg_wait_pct,
  round(percentile_cont(.5) within group(order by t0_to_enter_ms)::numeric) as p50_to_enter_ms,
  round(percentile_cont(.9) within group(order by t0_to_enter_ms)::numeric) as p90_to_enter_ms,
  round(percentile_cont(.5) within group(order by t0_to_work_ms)::numeric) as p50_to_work_ms,
  round(percentile_cont(.9) within group(order by t0_to_work_ms)::numeric) as p90_to_work_ms,
  round(percentile_cont(.5) within group(order by t0_to_publish_ms)::numeric) as p50_publish_ms,
  round(percentile_cont(.9) within group(order by t0_to_publish_ms)::numeric) as p90_publish_ms
 from public.prometeo_control_session_timing
 where t0_to_publish_ms is not null
),
artifact_pipeline as (
 select
   count(*)::int as total,
   count(*) filter(where consumer_ref is not null and btrim(consumer_ref)<>'')::int as with_consumer,
   count(*) filter(where consumer_ref is null or btrim(consumer_ref)='')::int as without_consumer,
   count(*) filter(where artifact_kind='FINAL_PACKAGE')::int as final_packages
 from public.prometeo_cognitive_frontier_artifacts_v1
),
material_pipeline as (
 select jsonb_build_object(
   'synthesis_done',count(*) filter(where job_class='SYNTHESIS' and completed_at is not null),
   'prepare_bounded_done',count(*) filter(where job_class='PREPARE_BOUNDED' and completed_at is not null),
   'material_ui_done',count(*) filter(where job_class='MATERIAL_UI_EXECUTOR' and completed_at is not null),
   'material_experiment_done',count(*) filter(where job_class='MATERIAL_EXPERIMENT_EXECUTOR' and completed_at is not null),
   'verify_done',count(*) filter(where job_class='VERIFY_READONLY' and completed_at is not null),
   'verify_success',count(*) filter(where job_class='VERIFY_READONLY' and completion_class='SUCCESS')
 ) as j
 from public.prometeo_work_graph_v1
),
frontier_now as (
 select state,coalesce(frontier_stage,'UNSET') as key,count(*)::int as n
 from public.prometeo_work_graph_v1
 where state in ('READY','ACTIVE','BLOCKED')
 group by state,coalesce(frontier_stage,'UNSET')
),
blocked_guide as (
 select coalesce(guide_key,'UNSCOPED') as key,count(*)::int as n
 from public.prometeo_work_graph_v1
 where state='BLOCKED'
 group by 1 order by 2 desc
),
current_failure as (
 select coalesce(failure_code,'NONE') as key,count(*)::int as n
 from public.prometeo_work_graph_v1
 where state in ('READY','ACTIVE','BLOCKED')
 group by 1 order by 2 desc
 limit 12
),
terminal_recent as (
 select coalesce(terminal_reason,'UNSPECIFIED') as key,count(*)::int as n
 from public.prometeo_worker_sessions_v1
 where terminal_at is not null and terminal_at>=now()-interval '24 hours'
 group by 1 order by 2 desc
 limit 12
),
diagnostic_flags as (
 select jsonb_strip_nulls(jsonb_build_object(
   'ready_without_recent_workers',
     case when (select ready from work_now)>0 and (select signal_5m from fleet)=0
       then jsonb_build_object('severity','HIGH','title','Hay READY pero no hay workers con señal <5m','value',(select ready from work_now)) end,
   'stale_memberships',
     case when (select stale_open_memberships from fleet)>0
       then jsonb_build_object('severity','MEDIUM','title','Membresías abiertas sin señal reciente','value',(select stale_open_memberships from fleet)) end,
   'zero_submit_rate',
     case when coalesce((select zero_submit_pct from fleet),0)>=25
       then jsonb_build_object('severity','MEDIUM','title','Muchos workers admitidos terminaron con 0 submits','value',(select zero_submit_pct from fleet),'unit','%') end,
   'active_without_progress',
     case when (select active_stale_5m from work_now)>0
       then jsonb_build_object('severity','HIGH','title','ACTIVE sin progreso reciente','value',(select active_stale_5m from work_now)) end,
   'recent_requeue_pressure',
     case when (select assigned_60m from events)>0 and (100.0*(select requeue_60m from events)/(select assigned_60m from events))>=15
       then jsonb_build_object('severity','MEDIUM','title','Requeues altos sobre assignments en 60m','value',round((100.0*(select requeue_60m from events)/(select assigned_60m from events))::numeric,1),'unit','%') end,
   'unconsumed_artifacts',
     case when (select without_consumer from artifact_pipeline)>0
       then jsonb_build_object('severity','MEDIUM','title','Artifacts sin consumidor downstream','value',(select without_consumer from artifact_pipeline)) end
 ))
)
select jsonb_build_object(
  'schema','prometeo.statistics/v3',
  'generated_at',now(),
  'base',(select j from base),
  'fleet',(select to_jsonb(x) from fleet x),
  'recent_events',(select to_jsonb(x) from events x),
  'work_now',(select to_jsonb(x) from work_now x),
  'timing',(select to_jsonb(x) from timing x),
  'artifact_pipeline',(select to_jsonb(x) from artifact_pipeline x),
  'material_pipeline',(select j from material_pipeline),
  'frontier_now',coalesce((select jsonb_agg(to_jsonb(x) order by state,n desc) from frontier_now x),'[]'::jsonb),
  'blocked_by_guide',coalesce((select jsonb_agg(to_jsonb(x)) from blocked_guide x),'[]'::jsonb),
  'current_failure_codes',coalesce((select jsonb_agg(to_jsonb(x)) from current_failure x),'[]'::jsonb),
  'terminal_reasons_24h',coalesce((select jsonb_agg(to_jsonb(x)) from terminal_recent x),'[]'::jsonb),
  'flags',(select jsonb_agg(value) from diagnostic_flags,jsonb_each((select * from diagnostic_flags)))
);
$function$

revoke all on function public.prometeo_statistics_v3() from public;
grant execute on function public.prometeo_statistics_v3() to anon,authenticated,service_role;

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values(
 'PROMETEO_STATISTICS_V3','Prometeo Statistics V3','OPERATIONAL_DIAGNOSTICS','ROOT','3','CURRENT',
 'RPC:prometeo_statistics_v3()','/current-tree/control-v10/',100,'PROJECTION_ONLY',
 'PROMETEO_STATISTICS_V2',
 '["WORK_GRAPH_CURRENT_V1_1","PROMETEO_STATISTICS_V2"]'::jsonb,
 '["HUMAN_CONTROL_ROOM"]'::jsonb,
 '{"questions":["backend_admission","real_liveness","productive_workers","capacity_waste","frontier_bottleneck"],"law":"ACTIVE membership is never treated as proof of liveness."}'::jsonb,
 now(),now(),now()
)
on conflict(entity_key) do update set
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 supersedes=excluded.supersedes,depends_on=excluded.depends_on,consumers=excluded.consumers,
 payload=excluded.payload,updated_at=now();
