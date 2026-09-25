-- PROMETEO CONTROL ROOM V10
-- Static project screenshots + intervention-oriented Statistics V3 UI.

update public.prometeo_semantic_registry_v1
set status='SUPERSEDED',updated_at=now()
where entity_key in ('PROMETEO_CONTROL_ROOM_V9','PROMETEO_STATISTICS_V2')
  and status='CURRENT';

insert into public.prometeo_semantic_registry_v1(
 entity_key,title,kind,owner_key,version,status,source_ref,public_route,importance,
 authority,supersedes,depends_on,consumers,payload,promoted_at,created_at,updated_at
) values(
 'PROMETEO_CONTROL_ROOM_V10','Prometeo Control Room V10','HUMAN_CONTROL_SURFACE','ROOT','10','CURRENT',
 'GitHub:/current-tree/control-v10/index.html','/current-tree/control-v10/',100,'PROJECTION_UI_ONLY',
 'PROMETEO_CONTROL_ROOM_V9',
 '["PROMETEO_ORGANISM_PROJECTION_V1_1","PROMETEO_CONTROL_ROOM_ACTIVITY_V1","PROMETEO_WORK_CONTEXTS_V1","PROMETEO_STATISTICS_V3"]'::jsonb,
 '["HUMAN_ORIENTATION"]'::jsonb,
 '{"views":["NOW","PROJECTS","TOOLS","HISTORY","STATISTICS","ORGANISM"],"projects_preview":"STATIC_SCREENSHOT_ONLY","statistics_focus":["backend_admission","real_liveness","productive_workers","capacity_waste","frontier_bottleneck"],"source_owner":false}'::jsonb,
 now(),now(),now()
)
on conflict(entity_key) do update set
 status=excluded.status,source_ref=excluded.source_ref,public_route=excluded.public_route,
 supersedes=excluded.supersedes,depends_on=excluded.depends_on,consumers=excluded.consumers,
 payload=excluded.payload,updated_at=now();

select public.prometeo_work_context_register_v1(
 'PROMETEO_CONTROL_ROOM_V10','Prometeo · Control Room V10','PAGE','ROOT',
 'GitHub:/current-tree/control-v10/index.html','PUBLIC','ACTIVE',
 'SEM:PROMETEO_CONTROL_ROOM_V10',null,
 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v10/',null,
 'Control room móvil con previews estáticas de proyectos y Statistics V3 orientada a detectar problemas operativos que disparan intervenciones.',
 'Recibir feedback humano sobre la utilidad diagnóstica y densidad móvil.',
 'Abrir Control Room V10, Statistics V3 y Organism V1.1; continuar desde feedback humano.',
 '{"version":"V10","static_project_previews":true,"statistics_v3":true}'::jsonb
);
