create table if not exists public.study_drive_preview_capabilities (
  token_hash text primary key,
  workspace_id text not null,
  provider_item_id text not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.study_drive_preview_capabilities enable row level security;

create index if not exists study_drive_preview_capabilities_doc_idx
  on public.study_drive_preview_capabilities(workspace_id, provider_item_id);
