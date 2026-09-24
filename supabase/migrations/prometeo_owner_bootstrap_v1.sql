create table if not exists public.prometeo_owner (
  singleton boolean primary key default true check (singleton = true),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  bootstrap_token_hash text,
  bootstrap_expires_at timestamptz,
  bootstrap_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prometeo_owner enable row level security;
revoke all on table public.prometeo_owner from anon, authenticated;

create or replace function public.claim_prometeo_owner(p_auth_user_id uuid, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.prometeo_owner%rowtype;
  profile_id uuid;
begin
  select * into o from public.prometeo_owner where singleton = true for update;
  if not found then
    raise exception 'bootstrap_not_initialized';
  end if;

  if o.auth_user_id = p_auth_user_id then
    select id into profile_id from public.finance_profiles where auth_user_id = p_auth_user_id;
    return jsonb_build_object('status','ready','financeProfileId',profile_id);
  end if;

  if o.auth_user_id is not null then raise exception 'owner_already_claimed'; end if;
  if o.bootstrap_used_at is not null then raise exception 'bootstrap_already_used'; end if;
  if o.bootstrap_expires_at is null or o.bootstrap_expires_at < now() then raise exception 'bootstrap_expired'; end if;
  if o.bootstrap_token_hash is null or o.bootstrap_token_hash <> p_token_hash then raise exception 'bootstrap_invalid'; end if;

  update public.prometeo_owner
     set auth_user_id = p_auth_user_id,
         claimed_at = now(),
         bootstrap_used_at = now(),
         bootstrap_token_hash = null,
         updated_at = now()
   where singleton = true;

  insert into public.finance_profiles (id, auth_user_id, mode, label, created_at, updated_at)
  values (gen_random_uuid(), p_auth_user_id, 'live', 'Personal', now(), now())
  on conflict (auth_user_id) do update
    set mode = 'live', label = 'Personal', updated_at = now()
  returning id into profile_id;

  insert into public.finance_sync_state (profile_id, provider, status, last_success_at, last_attempt_at, cursor, last_error_code, updated_at)
  values (profile_id, 'mercadopago', 'not_connected', null, null, '{}'::jsonb, null, now())
  on conflict (profile_id, provider) do nothing;

  return jsonb_build_object('status','claimed','financeProfileId',profile_id);
end;
$$;

revoke all on function public.claim_prometeo_owner(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_prometeo_owner(uuid,text) to service_role;

-- Bootstrap token initialization is intentionally runtime-only and must never be committed.
