-- Page Change Loop v1 hardening after live schema verification.
alter table public.prometeo_execution_packets
  add column if not exists selected_attachment_ids uuid[] not null default '{}'::uuid[];

-- Keep every private change-loop table inaccessible to direct browser roles.
alter table public.prometeo_change_threads enable row level security;
alter table public.prometeo_change_thread_captures enable row level security;
alter table public.prometeo_project_agent_grants enable row level security;
alter table public.prometeo_execution_packets enable row level security;
alter table public.prometeo_execution_results enable row level security;
alter table public.prometeo_change_attachments enable row level security;
revoke all on public.prometeo_change_threads from anon, authenticated;
revoke all on public.prometeo_change_thread_captures from anon, authenticated;
revoke all on public.prometeo_project_agent_grants from anon, authenticated;
revoke all on public.prometeo_execution_packets from anon, authenticated;
revoke all on public.prometeo_execution_results from anon, authenticated;
revoke all on public.prometeo_change_attachments from anon, authenticated;

-- A failed disposable worker must not strand the exact intent it claimed.
-- Restore both Capture revisions and packet-bound attachments to PENDING so HACER can retry.
create or replace function public.prometeo_restore_failed_execution_inputs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.prometeo_execution_packets%rowtype;
begin
  if new.status <> 'FAILED' then
    return new;
  end if;

  select * into p
  from public.prometeo_execution_packets
  where work_item_id = new.work_item_id
    and workspace_id = new.workspace_id
    and thread_id = new.thread_id;

  if not found then
    return new;
  end if;

  if cardinality(p.selected_revision_refs) > 0 then
    update public.prometeo_change_thread_captures
      set state = 'PENDING', submitted_at = null
    where workspace_id = p.workspace_id
      and thread_id = p.thread_id
      and revision_ref = any(p.selected_revision_refs)
      and state = 'SUBMITTED';
  end if;

  if cardinality(p.selected_attachment_ids) > 0 then
    update public.prometeo_change_attachments
      set state = 'PENDING', submitted_at = null
    where workspace_id = p.workspace_id
      and thread_id = p.thread_id
      and id = any(p.selected_attachment_ids)
      and state = 'SUBMITTED';
  end if;

  return new;
end;
$$;

revoke all on function public.prometeo_restore_failed_execution_inputs() from public, anon, authenticated;

drop trigger if exists prometeo_restore_failed_execution_inputs on public.prometeo_execution_results;
create trigger prometeo_restore_failed_execution_inputs
after insert or update of status on public.prometeo_execution_results
for each row
when (new.status = 'FAILED')
execute function public.prometeo_restore_failed_execution_inputs();
