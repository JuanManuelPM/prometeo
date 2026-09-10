create table if not exists public.creator_login_bootstrap (
  token_hash text primary key,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.creator_login_bootstrap enable row level security;
revoke all on table public.creator_login_bootstrap from public, anon, authenticated;
grant all on table public.creator_login_bootstrap to service_role;

create or replace function public.creator_claim_login_bootstrap(p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean:=false;
begin
  update public.creator_login_bootstrap
  set consumed_at=now()
  where token_hash=p_hash and consumed_at is null and expires_at>now()
  returning true into ok;
  return coalesce(ok,false);
end;
$$;
revoke all on function public.creator_claim_login_bootstrap(text) from public, anon, authenticated;
grant execute on function public.creator_claim_login_bootstrap(text) to service_role;