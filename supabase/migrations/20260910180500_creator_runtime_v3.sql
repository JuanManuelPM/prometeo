-- Repair v2 compatibility: v1 runtime has one default provider grant per kind/provider.
-- Multiple YouTube channels may map to that grant; a future separate-grant table can extend this without changing frontend contracts.

drop index if exists creator_provider_connections_owner_kind_provider_connection_uidx;
create unique index if not exists creator_provider_connections_owner_kind_provider_uidx
  on public.creator_provider_connections(owner_id,kind,provider);

-- Built-in non-secret fallbacks are explicit, never confused with paid/credentialed providers.
insert into public.creator_provider_connections(owner_id,kind,provider,connection_key,mode,verified_at,last_probe,metadata)
values
('cafe0000-0000-4000-8000-000000000001','llm','fixture','default','MOCK',null,'{"ok":true,"fixture":true}','{"cost_cents":0}'),
('cafe0000-0000-4000-8000-000000000001','video','fixture','default','MOCK',null,'{"ok":true,"fixture":true}','{"cost_cents":0,"aspect_ratio":"9:16"}'),
('cafe0000-0000-4000-8000-000000000001','voice','edge-neural','default','VERIFIED_REAL',now(),'{"ok":true,"source":"existing casa-tts deployment"}','{"function":"casa-tts","default_voice":"es-AR-TomasNeural","credential_required":false}')
on conflict(owner_id,kind,provider) do update set mode=excluded.mode,verified_at=excluded.verified_at,last_probe=excluded.last_probe,metadata=excluded.metadata;
