create or replace function public.creator_register_free_demo(
  p_video_id uuid,
  p_storage_path text,
  p_mime_type text default 'video/webm',
  p_bytes bigint default 0,
  p_duration_ms integer default 5000
) returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  vid public.creator_videos%rowtype;
  inserted public.creator_assets%rowtype;
  next_version integer;
  ver_id uuid;
begin
  if uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_storage_path is null or p_storage_path='' or split_part(p_storage_path,'/',1)<>uid::text then
    raise exception 'INVALID_STORAGE_PATH';
  end if;
  if coalesce(p_mime_type,'') not like 'video/%' then raise exception 'INVALID_VIDEO_MIME'; end if;

  select * into vid from public.creator_videos where id=p_video_id and owner_id=uid;
  if not found then raise exception 'VIDEO_NOT_FOUND'; end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id='creator-assets' and name=p_storage_path and owner_id=uid::text
  ) then
    raise exception 'STORAGE_OBJECT_NOT_FOUND';
  end if;

  insert into public.creator_assets(
    owner_id,channel_id,video_id,scene_id,kind,bucket,object_path,
    mime_type,byte_size,duration_ms,provider,metadata
  ) values (
    uid,vid.channel_id,p_video_id,null,'MASTER','creator-assets',p_storage_path,
    coalesce(nullif(p_mime_type,''),'video/webm'),greatest(coalesce(p_bytes,0),0),
    greatest(coalesce(p_duration_ms,5000),1),'free-browser',
    jsonb_build_object('provenance','FREE_BROWSER_DEMO','cost_cents',0,'generated_at',now(),'expected_aspect_ratio','9:16')
  ) returning * into inserted;

  update public.creator_video_versions set selected=false
    where owner_id=uid and video_id=p_video_id and selected=true;
  select coalesce(max(version),0)+1 into next_version
    from public.creator_video_versions where owner_id=uid and video_id=p_video_id;
  insert into public.creator_video_versions(owner_id,video_id,version,master_asset_id,scene_manifest,selected)
    values(uid,p_video_id,next_version,inserted.id,'[]'::jsonb,true)
    returning id into ver_id;

  insert into public.creator_validation_runs(owner_id,video_id,video_version_id,kind,status,score,findings,evidence)
  values(uid,p_video_id,ver_id,'DETERMINISTIC','WARN',0.8,
    '["Browser-rendered free demo: playable master persisted; server container probe not run."]'::jsonb,
    jsonb_build_object('provider','free-browser','mime_type',p_mime_type,'byte_size',greatest(coalesce(p_bytes,0),0),'duration_ms',greatest(coalesce(p_duration_ms,5000),1),'expected_aspect_ratio','9:16'));

  update public.creator_videos
  set state='READY', max_cost_cents=0, actual_cost_cents=0,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'provenance','FREE_BROWSER_DEMO','demo_storage_path',p_storage_path,
        'demo_asset_id',inserted.id,'master_version_id',ver_id,
        'cost_cents',0,'free_only',true
      ), updated_at=now()
  where id=p_video_id and owner_id=uid;

  return jsonb_build_object('ok',true,'asset_id',inserted.id,'video_id',p_video_id,
    'video_version_id',ver_id,'version',next_version,'storage_path',p_storage_path,'state','READY');
end;
$$;

drop policy if exists creator_free_demo_owner_delete_v1 on storage.objects;
create policy creator_free_demo_owner_delete_v1 on storage.objects
for delete to authenticated
using (bucket_id='creator-assets' and (storage.foldername(name))[1]=auth.uid()::text);

grant execute on function public.creator_register_free_demo(uuid,text,text,bigint,integer) to authenticated;
