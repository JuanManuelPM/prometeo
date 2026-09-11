insert into public.creator_media_provider_catalog(provider,label,capabilities,setup_url,auth_fields,free_policy,free_notes,priority,router_allowed_free_only,metadata) values
('runway','Runway Dev',array['image','video','audio'],'https://dev.runwayml.com/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID','API por créditos; preparada pero bloqueada bajo FREE_ONLY.',180,false,'{"aggregator":true}'::jsonb),
('luma','Luma Dream Machine',array['image','video'],'https://platform.lumalabs.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PREPAID','Expone balance de créditos; preparada, no enrutable en FREE_ONLY hasta verificar saldo puramente promocional.',190,false,'{"balance_endpoint":"/dream-machine/v1/credits"}'::jsonb),
('leonardo','Leonardo AI',array['image','video'],'https://app.leonardo.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID','API PAYG; preparada pero bloqueada en FREE_ONLY.',200,false,'{}'::jsonb),
('ideogram','Ideogram',array['image'],'https://ideogram.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PREPAID','API separada y prepagada; preparada pero bloqueada en FREE_ONLY.',210,false,'{}'::jsonb),
('recraft','Recraft',array['image'],'https://www.recraft.ai/api', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PREPAID','API Units prepagadas; preparada pero bloqueada en FREE_ONLY.',220,false,'{}'::jsonb),
('pika','Pika API',array['image','video','audio'],'https://dev.pika.art/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID','Agregador multimedia por uso; preparada pero bloqueada en FREE_ONLY.',230,false,'{"aggregator":true}'::jsonb),
('black_forest_labs','Black Forest Labs',array['image'],'https://docs.bfl.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','FLUX API directa; preparada pero bloqueada en FREE_ONLY salvo guard verificable.',240,false,'{}'::jsonb),
('freepik','Freepik AI API',array['image','video'],'https://www.freepik.com/api', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','Preparada; no enrutable bajo FREE_ONLY sin guard de saldo.',250,false,'{}'::jsonb),
('comfyui_local','ComfyUI local',array['image','video'],'http://127.0.0.1:8188', '[{"key":"endpoint_url","label":"Endpoint ComfyUI","secret":false}]'::jsonb,'HARD_FREE_LOCAL','Sin costo de API; requiere una máquina propia ejecutando ComfyUI y un puente accesible.',2,false,'{"local":true,"needs_bridge":true}'::jsonb),
('automatic1111_local','Stable Diffusion WebUI local',array['image'],'http://127.0.0.1:7860', '[{"key":"endpoint_url","label":"Endpoint WebUI","secret":false}]'::jsonb,'HARD_FREE_LOCAL','Sin costo de API; requiere una máquina propia ejecutando WebUI/Forge y un puente accesible.',3,false,'{"local":true,"needs_bridge":true}'::jsonb)
on conflict(provider) do update set
  label=excluded.label,
  capabilities=excluded.capabilities,
  setup_url=excluded.setup_url,
  auth_fields=excluded.auth_fields,
  free_policy=excluded.free_policy,
  free_notes=excluded.free_notes,
  priority=excluded.priority,
  router_allowed_free_only=excluded.router_allowed_free_only,
  metadata=excluded.metadata,
  updated_at=now();
