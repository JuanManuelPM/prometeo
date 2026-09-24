create table if not exists public.prometeo_mobile_release_channels (
  channel text primary key,
  contract_version integer not null check (contract_version > 0),
  min_version_code integer not null check (min_version_code > 0),
  recommended_version_code integer not null check (recommended_version_code > 0),
  version_name text,
  distribution text not null check (distribution in ('internal_signed_apk','play')),
  update_url text,
  apk_sha256 text,
  updated_at timestamptz not null default now(),
  check (recommended_version_code >= min_version_code)
);

alter table public.prometeo_mobile_release_channels enable row level security;
revoke all on public.prometeo_mobile_release_channels from anon, authenticated;

insert into public.prometeo_mobile_release_channels
  (channel, contract_version, min_version_code, recommended_version_code, version_name, distribution)
values
  ('internal', 1, 1, 1, '0.1.0', 'internal_signed_apk')
on conflict (channel) do nothing;
