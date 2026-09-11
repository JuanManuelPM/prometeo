update public.creator_media_provider_catalog
set priority=80,
    auth_fields='[{"key":"api_key","label":"Endpoint ComfyUI","secret":false}]'::jsonb,
    updated_at=now()
where provider='comfyui_local';

update public.creator_media_provider_catalog
set priority=81,
    auth_fields='[{"key":"api_key","label":"Endpoint WebUI / Forge","secret":false}]'::jsonb,
    updated_at=now()
where provider='automatic1111_local';
