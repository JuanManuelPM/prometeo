create table if not exists public.creator_owner_login_throttle (
  singleton boolean primary key default true check (singleton),
  last_requested_at timestamptz,
  request_count bigint not null default 0
);
alter table public.creator_owner_login_throttle enable row level security;
revoke all on table public.creator_owner_login_throttle from public, anon, authenticated;
grant all on table public.creator_owner_login_throttle to service_role;
insert into public.creator_owner_login_throttle(singleton) values (true) on conflict (singleton) do nothing;

create or replace function public.creator_claim_owner_login_send(p_cooldown_seconds integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.creator_owner_login_throttle%rowtype;
  elapsed numeric;
  wait_s integer;
begin
  select * into r from public.creator_owner_login_throttle where singleton=true for update;
  if r.last_requested_at is not null then
    elapsed := extract(epoch from (now() - r.last_requested_at));
    if elapsed < greatest(1,p_cooldown_seconds) then
      wait_s := ceil(greatest(1,p_cooldown_seconds) - elapsed);
      return jsonb_build_object('allowed',false,'retry_after_seconds',wait_s);
    end if;
  end if;
  update public.creator_owner_login_throttle
  set last_requested_at=now(), request_count=request_count+1
  where singleton=true;
  return jsonb_build_object('allowed',true,'retry_after_seconds',0);
end;
$$;
revoke all on function public.creator_claim_owner_login_send(integer) from public, anon, authenticated;
grant execute on function public.creator_claim_owner_login_send(integer) to service_role;