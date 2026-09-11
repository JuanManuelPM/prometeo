update public.creator_media_provider_catalog
set label='Hugging Face ZeroGPU · ampliar cuota',
    setup_url='https://huggingface.co/settings/tokens',
    updated_at=now()
where provider='huggingface_zerogpu';
