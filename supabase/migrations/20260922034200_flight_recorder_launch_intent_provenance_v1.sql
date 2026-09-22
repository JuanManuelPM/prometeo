-- F006: observable launch provenance before first server contact.
-- Core human prompt remains unchanged. send_time is deliberately unobservable/NULL.

create table if not exists public.prometeo_launch_intents (
  intent_token uuid primary key default gen_random_uuid(),
  source text not null default 'CONTROL',
  launch_batch text,
  issued_at timestamptz not null default clock_timestamp(),
  copy_observed_at timestamptz,
  linked_session_id uuid,
  linked_agent_id text,
  first_server_contact_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check(copy_observed_at is null or copy_observed_at>=issued_at),
  check(first_server_contact_at is null or first_server_contact_at>=issued_at)
);

create or replace function public.prometeo_issue_launch_intent(
  p_launch_batch text default null,
  p_source text default 'CONTROL'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v public.prometeo_launch_intents%rowtype;
begin
  insert into public.prometeo_launch_intents(source,launch_batch)
  values(coalesce(nullif(trim(p_source),''),'CONTROL'),nullif(trim(p_launch_batch),''))
  returning * into v;

  return jsonb_build_object(
    'state','LAUNCH_INTENT_ISSUED',
    'intent_token',v.intent_token,
    'issued_at',v.issued_at,
    'launch_batch',v.launch_batch,
    'declaration_patch',jsonb_build_object('launch_intent_token',v.intent_token::text),
    'send_time_status','UNKNOWN_UNOBSERVABLE'
  );
end;
$function$;

create or replace function public.prometeo_mark_launch_intent_copied(p_intent_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v public.prometeo_launch_intents%rowtype;
begin
  update public.prometeo_launch_intents
  set copy_observed_at=coalesce(copy_observed_at,clock_timestamp())
  where intent_token=p_intent_token
  returning * into v;

  if v.intent_token is null then
    return jsonb_build_object(
      'state','LAUNCH_INTENT_NOT_FOUND',
      'intent_token',p_intent_token
    );
  end if;

  return jsonb_build_object(
    'state','LAUNCH_COPY_OBSERVED',
    'intent_token',v.intent_token,
    'issued_at',v.issued_at,
    'copy_observed_at',v.copy_observed_at,
    'copy_time_source','CONTROL_COPY_ACK',
    'send_time_status','UNKNOWN_UNOBSERVABLE'
  );
end;
$function$;

create or replace function public.prometeo_link_launch_intent_from_session_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_token uuid;
begin
  if not (new.declaration ? 'launch_intent_token') then
    return new;
  end if;

  begin
    v_token:=(new.declaration->>'launch_intent_token')::uuid;
  exception when invalid_text_representation then
    return new;
  end;

  update public.prometeo_launch_intents
  set
    linked_session_id=coalesce(linked_session_id,new.session_id),
    linked_agent_id=coalesce(linked_agent_id,new.agent_id),
    first_server_contact_at=coalesce(first_server_contact_at,clock_timestamp()),
    linked_at=coalesce(linked_at,clock_timestamp())
  where intent_token=v_token
    and (linked_session_id is null or linked_session_id=new.session_id);

  return new;
end;
$function$;

drop trigger if exists trg_prometeo_link_launch_intent_v1
on public.prometeo_worker_sessions;

create trigger trg_prometeo_link_launch_intent_v1
after insert or update of declaration
on public.prometeo_worker_sessions
for each row
execute function public.prometeo_link_launch_intent_from_session_v1();

create or replace view public.prometeo_launch_provenance_v1 as
select
  i.intent_token,
  i.source,
  i.launch_batch,
  i.issued_at,
  i.copy_observed_at,
  case when i.copy_observed_at is null then 'UNOBSERVED' else 'CONTROL_COPY_ACK' end as copy_time_source,
  null::timestamptz as send_time_at,
  'UNKNOWN_UNOBSERVABLE'::text as send_time_status,
  i.first_server_contact_at,
  i.linked_session_id,
  i.linked_agent_id,
  case
    when i.first_server_contact_at is not null then 'LINKED_FIRST_CONTACT'
    when i.copy_observed_at is not null then 'COPIED_UNLINKED'
    else 'ISSUED_UNLINKED'
  end as provenance_state,
  case
    when i.first_server_contact_at is not null
    then round(extract(epoch from(i.first_server_contact_at-i.issued_at))*1000)::bigint
    else null::bigint
  end as issued_to_first_contact_ms,
  case
    when i.copy_observed_at is not null and i.first_server_contact_at is not null
    then round(extract(epoch from(i.first_server_contact_at-i.copy_observed_at))*1000)::bigint
    else null::bigint
  end as copy_observed_to_first_contact_ms
from public.prometeo_launch_intents i;
