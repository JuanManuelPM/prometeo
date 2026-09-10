-- Creator Runtime v6: explicit search paths and no public access to SECURITY DEFINER internals.
alter function public.creator_touch_updated_at() set search_path = public;
revoke all on function public.creator_external_work_auto_apply() from public, anon, authenticated;
revoke all on function public.creator_apply_external_work(uuid,uuid) from public, anon, authenticated;
grant execute on function public.creator_apply_external_work(uuid,uuid) to service_role;