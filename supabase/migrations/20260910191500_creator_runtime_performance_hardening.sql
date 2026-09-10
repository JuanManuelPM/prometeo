-- Creator Runtime v7: optimize owner RLS and cover creator foreign keys.
do $$
declare t text;
begin
  foreach t in array array['creator_channels','creator_stories','creator_videos','creator_scripts','creator_scenes','creator_prompts','creator_assets','creator_jobs','creator_job_events','creator_video_versions','creator_validation_runs','creator_publications','creator_analytics_snapshots','creator_experiments','creator_provider_connections','creator_external_work','creator_oauth_states'] loop
    execute format('drop policy if exists %I on public.%I', t||'_owner_all', t);
    execute format('create policy %I on public.%I for all using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))', t||'_owner_all', t);
  end loop;
end $$;
create index if not exists creator_analytics_video_idx on public.creator_analytics_snapshots(video_id);
create index if not exists creator_assets_channel_idx on public.creator_assets(channel_id);
create index if not exists creator_assets_scene_idx on public.creator_assets(scene_id);
create index if not exists creator_assets_video_idx on public.creator_assets(video_id);
create index if not exists creator_channels_youtube_connection_idx on public.creator_channels(youtube_connection_id);
create index if not exists creator_experiments_channel_idx on public.creator_experiments(channel_id);
create index if not exists creator_experiments_video_idx on public.creator_experiments(video_id);
create index if not exists creator_external_work_channel_idx on public.creator_external_work(channel_id);
create index if not exists creator_external_work_story_idx on public.creator_external_work(story_id);
create index if not exists creator_external_work_video_idx on public.creator_external_work(video_id);
create index if not exists creator_jobs_channel_idx on public.creator_jobs(channel_id);
create index if not exists creator_jobs_story_idx on public.creator_jobs(story_id);
create index if not exists creator_prompts_scene_idx on public.creator_prompts(scene_id);
create index if not exists creator_prompts_video_idx on public.creator_prompts(video_id);
create index if not exists creator_publications_channel_idx on public.creator_publications(channel_id);
create index if not exists creator_publications_video_idx on public.creator_publications(video_id);
create index if not exists creator_scenes_asset_idx on public.creator_scenes(asset_id);
create index if not exists creator_scenes_script_idx on public.creator_scenes(script_id);
create index if not exists creator_validation_video_idx on public.creator_validation_runs(video_id);
create index if not exists creator_validation_version_idx on public.creator_validation_runs(video_version_id);
create index if not exists creator_video_versions_master_asset_idx on public.creator_video_versions(master_asset_id);
create index if not exists creator_videos_story_idx on public.creator_videos(story_id);