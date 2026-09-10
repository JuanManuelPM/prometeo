create table if not exists public.creator_private_login_links (
  id uuid primary key default gen_random_uuid(),
  action_link text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '15 minutes')
);
alter table public.creator_private_login_links enable row level security;
revoke all on table public.creator_private_login_links from public, anon, authenticated;
grant all on table public.creator_private_login_links to service_role;