-- Compatibility for creator-api patchConn(upsert on owner_id,kind,provider).
-- NOTE: separate same-provider accounts will require connection_key-aware refactor later.
alter table public.creator_provider_connections
  add constraint creator_provider_connections_owner_kind_provider_key
  unique (owner_id, kind, provider);
