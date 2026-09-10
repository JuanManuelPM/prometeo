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
