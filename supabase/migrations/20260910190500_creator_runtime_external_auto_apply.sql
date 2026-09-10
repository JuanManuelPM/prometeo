-- Creator Runtime v5: returned external work applies transactionally when the story version still matches.
create or replace function public.creator_apply_external_work(p_owner uuid, p_work uuid)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  w public.creator_external_work%rowtype;
  s public.creator_stories%rowtype;
  merged jsonb;
begin
  select * into w from public.creator_external_work where id=p_work and owner_id=p_owner for update;
  if not found then raise exception 'WORK_NOT_FOUND'; end if;
  if w.status='APPLIED' then return jsonb_build_object('ok',true,'idempotent',true,'work_id',w.id,'story_id',w.story_id); end if;
  if w.status<>'RETURNED' or w.result is null then raise exception 'WORK_NOT_RETURNED'; end if;
  if w.story_id is not null then
    select * into s from public.creator_stories where id=w.story_id and owner_id=p_owner for update;
    if not found then raise exception 'STORY_NOT_FOUND'; end if;
    if s.version<>w.context_version then raise exception 'STORY_VERSION_CONFLICT expected=% actual=%', w.context_version, s.version; end if;
    merged := coalesce(s.story_data,'{}'::jsonb) || jsonb_build_object('external_return',w.result,'external_work_id',w.id,'external_applied_at',now());
    update public.creator_stories set story_data=merged, version=s.version+1, status='DEVELOPING', updated_at=now() where id=s.id;
  end if;
  update public.creator_external_work set status='APPLIED', applied_at=now() where id=w.id;
  return jsonb_build_object('ok',true,'idempotent',false,'work_id',w.id,'story_id',w.story_id,'new_story_version',case when w.story_id is null then null else s.version+1 end);
end $$;
revoke all on function public.creator_apply_external_work(uuid,uuid) from public, anon, authenticated;
grant execute on function public.creator_apply_external_work(uuid,uuid) to service_role;

create or replace function public.creator_external_work_auto_apply()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if new.status='RETURNED' and old.status is distinct from 'RETURNED' then
    perform public.creator_apply_external_work(new.owner_id,new.id);
  end if;
  return new;
end $$;
drop trigger if exists creator_external_work_auto_apply_trg on public.creator_external_work;
create trigger creator_external_work_auto_apply_trg
after update of status on public.creator_external_work
for each row when (new.status='RETURNED' and old.status is distinct from 'RETURNED')
execute function public.creator_external_work_auto_apply();
revoke all on function public.creator_external_work_auto_apply() from public, anon, authenticated;