-- Additive bridge from historical Study source/canonical rows to the authoritative
-- .study-system/document-pipeline/v1 contract. No source rows are rewritten.
create table if not exists public.study_document_contract_v1_derivatives (
  workspace_id text not null,
  source_id text not null,
  provider text not null,
  provider_item_id text,
  provider_version text,
  source_version_id text not null check (source_version_id ~ '^srcv1:sha256:[0-9a-f]{64}$'),
  canonical_extraction_version_id text not null check (canonical_extraction_version_id ~ '^cex1:sha256:[0-9a-f]{64}$'),
  document_id text not null check (document_id ~ '^doc1:sha256:[0-9a-f]{64}$'),
  canonical_content_sha256 text not null check (canonical_content_sha256 ~ '^[0-9a-f]{64}$'),
  reader_projection_version_id text check (reader_projection_version_id is null or reader_projection_version_id ~ '^rpv1:sha256:[0-9a-f]{64}$'),
  tts_projection_version_id text check (tts_projection_version_id is null or tts_projection_version_id ~ '^ttsp1:sha256:[0-9a-f]{64}$'),
  extractor_id text not null,
  extractor_version text not null,
  extractor_config_sha256 text not null check (extractor_config_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'identity-only'
    check (status in ('identity-only','canonical-ready','reader-ready','tts-ready','blocked','error')),
  private_payload_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, canonical_extraction_version_id)
);

create index if not exists study_document_contract_v1_source_idx
  on public.study_document_contract_v1_derivatives(workspace_id, source_id);
create index if not exists study_document_contract_v1_document_idx
  on public.study_document_contract_v1_derivatives(workspace_id, document_id);
create index if not exists study_document_contract_v1_provider_item_idx
  on public.study_document_contract_v1_derivatives(workspace_id, provider, provider_item_id);

alter table public.study_document_contract_v1_derivatives enable row level security;

comment on table public.study_document_contract_v1_derivatives is
  'Private additive identity/cache bridge for prometeo.canonical-document/v1; historical source/canonical rows remain untouched.';
comment on column public.study_document_contract_v1_derivatives.private_payload_ref is
  'Optional private runtime/storage locator. Never a public provider credential or signed URL.';
