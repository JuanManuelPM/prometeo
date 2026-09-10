-- Creator Runtime v4: atomic application of external AI returns.
create or replace function public.creator_apply_external_work(p_owner uuid, p_work uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.creator_external_work%rowtype;
  s public.creator_stories%rowtype;
  new_version integer;
begin
  select * into w
  from public.creator_external_work
  where id = p_work and owner_id = p_owner
  for update;

  if not found then
    raise exception 'WORK_NOT_FOUND';
  end if;

  if w.status = 'APPLIED' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'work_id', w.id, 'status', w.status);
  end if;

  if w.status <> 'RETURNED' or w.result is null then
    raise exception 'WORK_NOT_RETURNED';
  end if;

  if w.story_id is not null then
    select * into s
    from public.creator_stories
    where id = w.story_id and owner_id = p_owner
    for update;

    if not found then
      raise exception 'STORY_NOT_FOUND';
    end if;

    if s.version <> w.context_version then
      raise exception 'STORY_VERSION_CONFLICT expected=% actual=%', w.context_version, s.version;
    end if;

    new_version := s.version + 1;
    update public.creator_stories
    set story_data = coalesce(story_data, '{}'::jsonb) || jsonb_build_object('external_return', w.result),
        version = new_version,
        status = 'DEVELOPING',
        updated_at = now()
    where id = s.id and owner_id = p_owner;
  else
    new_version := null;
  end if;

  update public.creator_external_work
  set status = 'APPLIED', applied_at = now()
  where id = w.id and owner_id = p_owner;

  return jsonb_build_object('ok', true, 'idempotent', false, 'work_id', w.id, 'story_id', w.story_id, 'story_version', new_version, 'status', 'APPLIED');
end;
$$;

revoke all on function public.creator_apply_external_work(uuid, uuid) from public;
grant execute on function public.creator_apply_external_work(uuid, uuid) to service_role;
