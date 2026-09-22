-- Q026: durable PREFLIGHT_OK -> ENTER loss classification.
-- Keeps ingress-stage loss separate from worker liveness/death semantics.

create table if not exists public.prometeo_preflight_enter_losses (
  loss_id bigserial primary key,
  session_id uuid not null unique,
  agent_id text not null,
  worker_code text,
  classification text not null default 'PREFLIGHT_ENTER_LOSS'
    check (classification='PREFLIGHT_ENTER_LOSS'),
  preflight_ok_at timestamptz not null,
  timeout_seconds integer not null check (timeout_seconds > 0),
  threshold_version text not null,
  detected_at timestamptz not null default clock_timestamp(),
  enter_at timestamptz,
  resolved_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists prometeo_preflight_enter_losses_open_idx
  on public.prometeo_preflight_enter_losses(resolved_at, detected_at desc);

create or replace function public.prometeo_preflight_enter_loss_due(
  p_preflight_ok_at timestamptz,
  p_enter_at timestamptz,
  p_observed_at timestamptz,
  p_timeout_seconds integer default 120
)
returns boolean
language sql
immutable
as $function$
  select
    p_preflight_ok_at is not null
    and p_enter_at is null
    and p_observed_at is not null
    and p_timeout_seconds > 0
    and p_observed_at >= p_preflight_ok_at + make_interval(secs => p_timeout_seconds);
$function$;

create or replace function public.prometeo_detect_preflight_enter_losses(
  p_timeout_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_new integer := 0;
  v_resolved integer := 0;
  v_threshold_version text;
begin
  if p_timeout_seconds < 30 or p_timeout_seconds > 3600 then
    raise exception 'timeout_seconds must be between 30 and 3600';
  end if;

  v_threshold_version := 'PREFLIGHT_ENTER_TIMEOUT_V1:' || p_timeout_seconds::text || 's';

  with facts as (
    select
      s.session_id,
      s.agent_id,
      s.worker_code,
      min(e.created_at) filter (
        where e.phase='PREFLIGHT' and e.state='PREFLIGHT_OK'
      ) as preflight_ok_at,
      min(e.created_at) filter (where e.phase='ENTER') as enter_at
    from public.prometeo_worker_sessions s
    left join public.prometeo_worker_session_events e
      on e.session_id=s.session_id
    where s.protocol_version='OBEY-v2'
    group by s.session_id,s.agent_id,s.worker_code
  )
  insert into public.prometeo_preflight_enter_losses(
    session_id,agent_id,worker_code,preflight_ok_at,timeout_seconds,
    threshold_version,detected_at,evidence
  )
  select
    f.session_id,f.agent_id,f.worker_code,f.preflight_ok_at,p_timeout_seconds,
    v_threshold_version,v_now,
    jsonb_build_object(
      'basis','durable PREFLIGHT/PREFLIGHT_OK with no ENTER after server timeout',
      'client_cause','NOT_INFERRED',
      'observed_at',v_now
    )
  from facts f
  where public.prometeo_preflight_enter_loss_due(
    f.preflight_ok_at,f.enter_at,v_now,p_timeout_seconds
  )
  on conflict (session_id) do nothing;
  get diagnostics v_new=row_count;

  with enter_facts as (
    select
      l.session_id,
      min(e.created_at) filter (where e.phase='ENTER') as enter_at
    from public.prometeo_preflight_enter_losses l
    left join public.prometeo_worker_session_events e
      on e.session_id=l.session_id
    where l.resolved_at is null
    group by l.session_id
  )
  update public.prometeo_preflight_enter_losses l
  set enter_at=f.enter_at,
      resolved_at=v_now,
      evidence=l.evidence || jsonb_build_object(
        'resolved_by','ENTER_OBSERVED_LATER',
        'resolved_at',v_now
      )
  from enter_facts f
  where l.session_id=f.session_id
    and l.resolved_at is null
    and f.enter_at is not null;
  get diagnostics v_resolved=row_count;

  return jsonb_build_object(
    'ok',true,
    'classification','PREFLIGHT_ENTER_LOSS',
    'threshold_version',v_threshold_version,
    'timeout_seconds',p_timeout_seconds,
    'new_losses',v_new,
    'resolved_losses',v_resolved,
    'open_losses',(
      select count(*)
      from public.prometeo_preflight_enter_losses
      where resolved_at is null
    ),
    'client_cause','NOT_INFERRED',
    'server_time',v_now
  );
end;
$function$;

create or replace view public.prometeo_control_preflight_enter_loss as
select
  l.loss_id,l.session_id,l.agent_id,l.worker_code,l.classification,
  l.preflight_ok_at,l.timeout_seconds,l.threshold_version,l.detected_at,
  l.enter_at,l.resolved_at,
  case when l.resolved_at is null then 'OPEN' else 'RESOLVED' end as loss_status,
  greatest(0,extract(epoch from(coalesce(l.enter_at,clock_timestamp())-l.preflight_ok_at))::int) as elapsed_from_preflight_s,
  'NOT_INFERRED'::text as client_cause,
  l.evidence
from public.prometeo_preflight_enter_losses l;

do $block$
begin
  if to_regprocedure('public.prometeo_morgue_context_legacy_q026(text)') is null
     and to_regprocedure('public.prometeo_morgue_context(text)') is not null then
    alter function public.prometeo_morgue_context(text)
      rename to prometeo_morgue_context_legacy_q026;
  end if;
end;
$block$;

create or replace function public.prometeo_morgue_context(p_batch_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_base jsonb;
  v_detection jsonb;
  v_losses jsonb;
begin
  v_detection := public.prometeo_detect_preflight_enter_losses(120);
  v_base := public.prometeo_morgue_context_legacy_q026(p_batch_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'loss_id',x.loss_id,
    'session_id',x.session_id,
    'agent_id',x.agent_id,
    'worker_code',x.worker_code,
    'classification',x.classification,
    'preflight_ok_at',x.preflight_ok_at,
    'detected_at',x.detected_at,
    'timeout_seconds',x.timeout_seconds,
    'threshold_version',x.threshold_version,
    'loss_status',x.loss_status,
    'client_cause',x.client_cause
  ) order by x.detected_at desc),'[]'::jsonb)
  into v_losses
  from (
    select *
    from public.prometeo_control_preflight_enter_loss
    where loss_status='OPEN'
    order by detected_at desc
    limit 50
  ) x;

  return coalesce(v_base,'{}'::jsonb) || jsonb_build_object(
    'preflight_enter_loss',
    jsonb_build_object(
      'classification','PREFLIGHT_ENTER_LOSS',
      'separate_from','WAIT_SILENCE_10M',
      'detector',v_detection,
      'open',v_losses
    )
  );
end;
$function$;

comment on table public.prometeo_preflight_enter_losses is
  'Durable ingress-stage losses: accepted PREFLIGHT_OK with no ENTER after server timeout. Never a client-cause attribution.';
comment on view public.prometeo_control_preflight_enter_loss is
  'Control-plane projection for PREFLIGHT_ENTER_LOSS, intentionally separate from worker death/liveness.';
