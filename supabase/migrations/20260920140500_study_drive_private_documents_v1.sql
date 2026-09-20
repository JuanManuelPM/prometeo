create table if not exists public.study_drive_private_documents (
  workspace_id text not null,
  provider_item_id text not null,
  title text not null,
  mime_type text not null,
  modified_at timestamptz,
  full_text text not null,
  char_count integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider_item_id)
);

alter table public.study_drive_private_documents enable row level security;

create index if not exists study_drive_private_documents_workspace_idx
  on public.study_drive_private_documents(workspace_id);
