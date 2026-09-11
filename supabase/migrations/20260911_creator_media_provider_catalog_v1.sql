create table if not exists public.creator_media_provider_catalog (
  provider text primary key,
  label text not null,
  capabilities text[] not null default '{}',
  setup_url text,
  auth_fields jsonb not null default '[]'::jsonb,
  free_policy text not null,
  free_notes text,
  priority integer not null default 100,
  router_allowed_free_only boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.creator_media_provider_catalog enable row level security;
drop policy if exists creator_media_provider_catalog_read on public.creator_media_provider_catalog;
create policy creator_media_provider_catalog_read on public.creator_media_provider_catalog
  for select to authenticated using (true);
grant select on public.creator_media_provider_catalog to authenticated;

insert into public.creator_media_provider_catalog(provider,label,capabilities,setup_url,auth_fields,free_policy,free_notes,priority,router_allowed_free_only,metadata) values
('cloudflare','Cloudflare Workers AI',array['image','text','tts'],'https://dash.cloudflare.com/', '[{"key":"account_id","label":"Account ID","secret":false},{"key":"api_token","label":"API token","secret":true}]'::jsonb,'HARD_FREE_PLAN','Workers Free incluye cupo diario; Prometeo sólo enruta si logra verificar el guard gratuito.',10,false,'{"image_model":"@cf/black-forest-labs/flux-1-schnell","needs_free_plan_verification":true}'::jsonb),
('huggingface','Hugging Face',array['image','video','text','speech'],'https://huggingface.co/settings/tokens', '[{"key":"token","label":"HF token","secret":true}]'::jsonb,'FREE_CREDITS','Tiene créditos gratuitos, pero Prometeo no los consume automáticamente hasta poder demostrar un guard de gasto duro.',20,false,'{"aggregator":true,"providers":["hf-inference","fal-ai","replicate","novita","nscale","together","wavespeed"]}'::jsonb),
('huggingface_zerogpu','Hugging Face ZeroGPU',array['image','video'],'https://huggingface.co/spaces/zero-gpu-explorers/README', '[{"key":"token","label":"HF token","secret":true},{"key":"space_url","label":"Space URL","secret":false}]'::jsonb,'HARD_FREE_QUOTA','Uso gratuito con cuota; cada Space necesita un adaptador de contrato antes de enrutar.',5,false,'{"custom_space":true,"needs_space_adapter":true}'::jsonb),
('pollinations','Pollinations',array['image','video','audio','text'],'https://enter.pollinations.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'BUDGETED_CREDITS','Las keys pueden tener presupuesto; sólo se habilita bajo FREE_ONLY si el presupuesto puede comprobarse como no facturable.',15,false,'{"aggregator":true,"supports_budgeted_keys":true}'::jsonb),
('fal','fal',array['image','video','audio'],'https://fal.ai/dashboard/keys', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PREPAID_OR_PROMO','Conectable, nunca auto-ruteado en FREE_ONLY.',100,false,'{}'::jsonb),
('replicate','Replicate',array['image','video','audio'],'https://replicate.com/account/api-tokens', '[{"key":"api_token","label":"API token","secret":true}]'::jsonb,'PAID','Conectable, bloqueado en FREE_ONLY.',110,false,'{}'::jsonb),
('together','Together AI',array['image','video','text'],'https://api.together.ai/settings/api-keys', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID','Conectable, bloqueado en FREE_ONLY.',120,false,'{}'::jsonb),
('wavespeed','WaveSpeedAI',array['image','video'],'https://wavespeed.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','Conectable, bloqueado en FREE_ONLY salvo guard explícito.',130,false,'{}'::jsonb),
('novita','Novita AI',array['video','text'],'https://novita.ai/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','Conectable, bloqueado en FREE_ONLY salvo guard explícito.',140,false,'{}'::jsonb),
('stability','Stability AI',array['image'],'https://platform.stability.ai/account/keys', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID','Conectable, bloqueado en FREE_ONLY.',150,false,'{}'::jsonb),
('segmind','Segmind',array['image','video'],'https://www.segmind.com/', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','Conectable, bloqueado en FREE_ONLY salvo guard explícito.',160,false,'{}'::jsonb),
('deepinfra','DeepInfra',array['text','image'],'https://deepinfra.com/dash/api_keys', '[{"key":"api_key","label":"API key","secret":true}]'::jsonb,'PAID_OR_PROMO','Conectable, bloqueado en FREE_ONLY salvo guard explícito.',170,false,'{}'::jsonb)
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
