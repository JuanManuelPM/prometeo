-- Prometeo Mobile security substrate v1.
-- Applied to production on 2026-09-24. Kept here as canonical source.

alter table public.prometeo_device_sessions
  add column if not exists public_key_spki text,
  add column if not exists approval_public_key_spki text,
  add column if not exists auth_scheme text not null default 'legacy_token',
  add column if not exists app_version_code integer,
  add column if not exists protocol_max integer,
  add column if not exists device_model text;

create unique index if not exists prometeo_device_sessions_public_key_spki_uq
  on public.prometeo_device_sessions(public_key_spki)
  where public_key_spki is not null;

create table if not exists public.prometeo_mobile_pair_codes (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_session_id uuid references public.prometeo_device_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prometeo_mobile_pair_codes enable row level security;
revoke all on public.prometeo_mobile_pair_codes from anon, authenticated;

create index if not exists prometeo_mobile_pair_codes_expires_idx
  on public.prometeo_mobile_pair_codes(expires_at)
  where used_at is null;

create table if not exists public.prometeo_mobile_request_nonces (
  session_id uuid not null references public.prometeo_device_sessions(id) on delete cascade,
  nonce text not null,
  created_at timestamptz not null default now(),
  primary key(session_id, nonce)
);

alter table public.prometeo_mobile_request_nonces enable row level security;
revoke all on public.prometeo_mobile_request_nonces from anon, authenticated;

create index if not exists prometeo_mobile_request_nonces_created_idx
  on public.prometeo_mobile_request_nonces(created_at);

create table if not exists public.prometeo_mobile_action_receipts (
  session_id uuid not null references public.prometeo_device_sessions(id) on delete cascade,
  action_id uuid not null,
  action_type text not null,
  request_hash text not null,
  status text not null check (status in ('PENDING','DONE')),
  response_json jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (session_id, action_id)
);

alter table public.prometeo_mobile_action_receipts enable row level security;
revoke all on public.prometeo_mobile_action_receipts from anon, authenticated;

create or replace function public.prometeo_mobile_apply_strategic_choices_v1(
  p_session_id uuid,
  p_action_id uuid,
  p_request_hash text,
  p_epoch_id uuid,
  p_selected_option_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.prometeo_mobile_action_receipts%rowtype;
  v_result jsonb;
begin
  if not exists (
    select 1 from public.prometeo_device_sessions s
    where s.id = p_session_id
      and s.revoked_at is null
      and s.expires_at > now()
      and s.auth_scheme = 'rsa-pkcs1-sha256-v1'
  ) then
    raise exception 'mobile_session_invalid';
  end if;

  insert into public.prometeo_mobile_action_receipts
    (session_id, action_id, action_type, request_hash, status)
  values
    (p_session_id, p_action_id, 'strategic_select', p_request_hash, 'PENDING')
  on conflict (session_id, action_id) do nothing;

  select * into v_receipt
  from public.prometeo_mobile_action_receipts
  where session_id = p_session_id and action_id = p_action_id
  for update;

  if not found then raise exception 'mobile_receipt_missing'; end if;
  if v_receipt.request_hash <> p_request_hash then raise exception 'mobile_action_id_conflict'; end if;

  if v_receipt.status = 'DONE' then
    return jsonb_build_object(
      'ok', true, 'idempotent_replay', true,
      'action', 'strategic_select', 'result', v_receipt.response_json
    );
  end if;

  v_result := public.prometeo_strategic_apply_choices_v2(
    'PROMETEO_MAIN', p_epoch_id, p_selected_option_ids
  );

  update public.prometeo_mobile_action_receipts
  set status='DONE', response_json=v_result, completed_at=now()
  where session_id=p_session_id and action_id=p_action_id;

  return jsonb_build_object(
    'ok', true, 'idempotent_replay', false,
    'action', 'strategic_select', 'result', v_result
  );
end;
$$;

revoke all on function public.prometeo_mobile_apply_strategic_choices_v1(uuid,uuid,text,uuid,text[])
  from public, anon, authenticated;
grant execute on function public.prometeo_mobile_apply_strategic_choices_v1(uuid,uuid,text,uuid,text[])
  to service_role;
