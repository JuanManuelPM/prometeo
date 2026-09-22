-- CORE-V1 / RECORDER · unified evidence timeline.
-- Facts and inference are deliberately separate. Absence of launch-intent
-- provenance is represented as NO_INTENT_OBSERVED, never backfilled.

create or replace view public.prometeo_worker_recorder_summary_v1 as
select
  f.session_id,
  f.agent_id,
  f.worker_code,
  f.protocol_version,
  f.prompt_version,
  f.launch_batch,
  lp.intent_token as launch_intent_token,
  coalesce(lp.provenance_state,'NO_INTENT_OBSERVED') as launch_provenance_state,
  (lp.intent_token is not null) as launch_intent_observed,
  lp.issued_at as launch_intent_issued_at,
  lp.copy_observed_at as launch_copy_observed_at,
  coalesce(lp.send_time_status,'UNKNOWN_UNOBSERVABLE') as send_time_status,
  coalesce(lp.first_server_contact_at,f.first_observed_at) as first_server_contact_at,
  f.preflight_at,
  f.enter_at,
  f.first_work_observed_at,
  f.first_publish_at,
  f.last_event_at,
  f.last_seen_at,
  f.final_state,
  f.entered_observed,
  f.entered_inferred,
  f.work_observed,
  f.work_inferred,
  f.published_observed,
  f.work_duration_observed,
  f.coordination_ms,
  f.wait_ms,
  f.work_ms,
  f.publish_ms,
  f.recovery_ms,
  pm.death_id,
  pm.detected_at as death_detected_at,
  pm.recovered_at,
  pm.frozen_at as postmortem_frozen_at,
  pm.terminal_phase,
  pm.terminal_state,
  pm.terminal_reason,
  pm.observed_cause,
  pm.inferred_cause,
  case
    when pm.death_id is null then 'LIVE_OR_NO_POSTMORTEM'
    when pm.recovered_at is not null then 'RECOVERED'
    else 'DEAD_UNRECOVERED'
  end as recovery_state
from public.prometeo_worker_flight_recorder f
left join public.prometeo_launch_provenance_v1 lp
  on lp.linked_session_id=f.session_id
left join lateral (
  select p.*
  from public.prometeo_worker_postmortems p
  where p.session_id=f.session_id
  order by p.detected_at desc,p.death_id desc
  limit 1
) pm on true;

comment on view public.prometeo_worker_recorder_summary_v1 is
  'CORE-V1 recorder chain. NO_INTENT_OBSERVED and UNKNOWN_UNOBSERVABLE are explicit evidence boundaries; no pre-server timestamp is inferred.';

create or replace view public.prometeo_worker_evidence_timeline_v1 as
with launch as (
  select
    lp.linked_session_id as session_id,
    s.worker_code,
    lp.issued_at as at,
    10::integer as sort_order,
    'LAUNCH'::text as phase,
    'INTENT_ISSUED'::text as state,
    'OBSERVED_FACT'::text as evidence_kind,
    jsonb_build_object(
      'intent_token',lp.intent_token,
      'source',lp.source,
      'launch_batch',lp.launch_batch,
      'issued_at',lp.issued_at
    ) as fact,
    '{}'::jsonb as inference,
    'prometeo_launch_provenance_v1'::text as source_ref
  from public.prometeo_launch_provenance_v1 lp
  join public.prometeo_worker_sessions s on s.session_id=lp.linked_session_id

  union all

  select
    lp.linked_session_id,
    s.worker_code,
    lp.copy_observed_at,
    20,
    'LAUNCH',
    'COPY_OBSERVED',
    'OBSERVED_FACT',
    jsonb_build_object(
      'intent_token',lp.intent_token,
      'copy_time_source',lp.copy_time_source,
      'copy_observed_at',lp.copy_observed_at
    ),
    '{}'::jsonb,
    'prometeo_launch_provenance_v1'
  from public.prometeo_launch_provenance_v1 lp
  join public.prometeo_worker_sessions s on s.session_id=lp.linked_session_id
  where lp.copy_observed_at is not null
),
session_events as (
  select
    e.session_id,
    e.worker_code,
    e.created_at as at,
    100::integer as sort_order,
    e.phase,
    e.state,
    'OBSERVED_FACT'::text as evidence_kind,
    jsonb_build_object(
      'event_id',e.event_id,
      'event_key',e.event_key,
      'payload',e.payload
    ) as fact,
    '{}'::jsonb as inference,
    'prometeo_worker_session_events'::text as source_ref
  from public.prometeo_worker_session_events e
),
death_events as (
  select
    p.session_id,
    p.worker_code,
    p.detected_at as at,
    200::integer as sort_order,
    'LIVENESS'::text as phase,
    'DEATH_DETECTED'::text as state,
    'OBSERVED_DERIVATION'::text as evidence_kind,
    jsonb_build_object(
      'death_id',p.death_id,
      'detected_at',p.detected_at,
      'last_seen_at',p.last_seen_at,
      'raw_terminal_reason',p.terminal_reason,
      'observed_cause',p.observed_cause
    ) as fact,
    case
      when p.inferred_cause is null then '{}'::jsonb
      else jsonb_build_object('inferred_cause',p.inferred_cause)
    end as inference,
    'prometeo_worker_postmortems'::text as source_ref
  from public.prometeo_worker_postmortems p

  union all

  select
    p.session_id,
    p.worker_code,
    p.recovered_at,
    210,
    'LIVENESS',
    'RECOVERED',
    'OBSERVED_FACT',
    jsonb_build_object(
      'death_id',p.death_id,
      'recovered_at',p.recovered_at
    ),
    '{}'::jsonb,
    'prometeo_worker_postmortems'
  from public.prometeo_worker_postmortems p
  where p.recovered_at is not null

  union all

  select
    p.session_id,
    p.worker_code,
    p.frozen_at,
    220,
    'POSTMORTEM',
    'FROZEN',
    'OBSERVED_ARTIFACT',
    jsonb_build_object(
      'death_id',p.death_id,
      'terminal_phase',p.terminal_phase,
      'terminal_state',p.terminal_state,
      'observed_cause',p.observed_cause,
      'event_count',p.event_count,
      'publish_count',p.publish_count
    ),
    case
      when p.inferred_cause is null then '{}'::jsonb
      else jsonb_build_object('inferred_cause',p.inferred_cause)
    end,
    'prometeo_worker_postmortems'
  from public.prometeo_worker_postmortems p
)
select * from launch
union all
select * from session_events
union all
select * from death_events;

comment on view public.prometeo_worker_evidence_timeline_v1 is
  'Chronological worker evidence from optional launch intent through runtime events and frozen postmortem. fact and inference never share a semantic field.';

create or replace function public.prometeo_recorder_chain_smoke_v1(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v public.prometeo_worker_recorder_summary_v1%rowtype;
  v_first_event timestamptz;
  v_timeline_count integer;
  v_bad_inference integer;
  v_checks jsonb;
  v_pass boolean;
begin
  select * into v
  from public.prometeo_worker_recorder_summary_v1
  where session_id=p_session_id;

  if not found then
    return jsonb_build_object(
      'state','RECORDER_CHAIN_INVALID_SESSION',
      'session_id',p_session_id,
      'pass',false
    );
  end if;

  select min(at),count(*)::integer
    into v_first_event,v_timeline_count
  from public.prometeo_worker_evidence_timeline_v1
  where session_id=p_session_id;

  select count(*)::integer
    into v_bad_inference
  from public.prometeo_worker_evidence_timeline_v1
  where session_id=p_session_id
    and inference <> '{}'::jsonb
    and source_ref <> 'prometeo_worker_postmortems';

  v_checks:=jsonb_build_object(
    'first_server_contact_observed',v.first_server_contact_at is not null,
    'preflight_observed',v.preflight_at is not null,
    'entered_stage_accounted',v.entered_observed or v.entered_inferred,
    'work_stage_accounted',v.work_observed or v.work_inferred,
    'publish_truth_monotonic',(not v.published_observed) or (v.work_observed or v.work_inferred),
    'timeline_nonempty',v_timeline_count>0,
    'facts_inference_separated',v_bad_inference=0,
    'pre_server_boundary_explicit',
      (v.launch_intent_observed and v.launch_provenance_state<>'NO_INTENT_OBSERVED')
      or ((not v.launch_intent_observed) and v.launch_provenance_state='NO_INTENT_OBSERVED'
          and v.send_time_status='UNKNOWN_UNOBSERVABLE'),
    'postmortem_observed_cause_if_dead',
      v.death_id is null or v.observed_cause is not null,
    'recovery_state_consistent',
      (v.recovered_at is null and v.recovery_state<>'RECOVERED')
      or (v.recovered_at is not null and v.recovery_state='RECOVERED')
  );

  select bool_and(value::boolean) into v_pass from jsonb_each(v_checks);

  return jsonb_build_object(
    'state',case when v_pass then 'RECORDER_CHAIN_SMOKE_OK' else 'RECORDER_CHAIN_SMOKE_FAIL' end,
    'pass',v_pass,
    'session_id',v.session_id,
    'worker_code',v.worker_code,
    'launch_provenance_state',v.launch_provenance_state,
    'send_time_status',v.send_time_status,
    'death_id',v.death_id,
    'recovery_state',v.recovery_state,
    'timeline_events',v_timeline_count,
    'first_timeline_event_at',v_first_event,
    'checks',v_checks
  );
end;
$$;

revoke all on public.prometeo_worker_recorder_summary_v1 from anon,authenticated;
revoke all on public.prometeo_worker_evidence_timeline_v1 from anon,authenticated;
