update public.creator_media_provider_catalog
set auth_fields='[{"key":"token","label":"HF token","secret":true}]'::jsonb,
    free_notes='Un único token de Hugging Face amplía la cuota ZeroGPU de todos los Spaces compatibles. No habilita proveedores pagos ni cambia FREE_ONLY.',
    updated_at=now()
where provider='huggingface_zerogpu';
