-- P4 Anywhere Notes + AI sessions v1.
-- Reproduces the private schema already running in production so a fresh Prometeo backend
-- can recover phone audio transcription and disposable Think/Guardar sessions without chat history.

create extension if not exists pgcrypto with schema extensions;

alter table public.prometeo_captures
  add column if not exists audio_storage_path text,
  add column if not exists audio_mime_type text,
  add column if not exists audio_size_bytes bigint,
  add column if not exists audio_uploaded_at timestamptz,
  add column if not exists transcription_lease_hash text,
  add column if not exists transcription_lease_until timestamptz,
  add column if not exists transcription_attempts integer not null default 0,
  add column if not exists transcription_error text;

create index if not exists prometeo_captures_transcription_queue_idx
  on public.prometeo_captures(workspace_id, created_at)
  where archive_state='ACTIVE' and audio_storage_path is not null;

create table if not exists public.prometeo_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  thread_id uuid not null references public.prometeo_change_threads(id) on delete cascade,
  page_id text not null,
  session_code text not null,
  parent_session_id uuid references public.prometeo_ai_sessions(id) on delete set null,
  read_token_hash text not null,
  save_token_hash text not null,
  status text not null default 'OPEN',
  title text,
  snapshot jsonb not null default '{}'::jsonb,
  snapshot_hash text not null default '',
  saved_payload jsonb not null default '{}'::jsonb,
  saved_note_capture_id text,
  chat_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  saved_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(workspace_id, session_code),
  unique(read_token_hash),
  unique(save_token_hash)
);

create index if not exists prometeo_ai_sessions_page_idx
  on public.prometeo_ai_sessions(workspace_id,page_id,created_at desc);
create index if not exists prometeo_ai_sessions_thread_idx
  on public.prometeo_ai_sessions(workspace_id,thread_id,created_at desc);

alter table public.prometeo_ai_sessions enable row level security;
revoke all on public.prometeo_ai_sessions from anon, authenticated;
grant all on public.prometeo_ai_sessions to service_role;

create or replace function public.claim_prometeo_transcription_v1(
  p_workspace_id uuid,
  p_lease_hash text,
  p_lease_until timestamptz
)
returns table(
  workspace_id uuid,
  id text,
  page_id text,
  created_at timestamptz,
  audio_storage_path text,
  audio_mime_type text,
  audio_size_bytes bigint,
  transcription_attempts integer
)
language sql
security definer
set search_path to 'public', 'extensions'
as $$
  with candidate as (
    select c.workspace_id,c.id
    from public.prometeo_captures c
    where c.workspace_id=p_workspace_id
      and c.archive_state='ACTIVE'
      and c.audio_storage_path is not null
      and coalesce(c.transcript,'')=''
      and (
        c.processing_state in ('QUEUED_REMOTE','RETRY_REMOTE','SAVED_LOCAL','QUEUED','loading','transcribing')
        or c.transcription_lease_until is null
        or c.transcription_lease_until < now()
      )
    order by c.created_at asc
    for update skip locked
    limit 1
  )
  update public.prometeo_captures c
  set processing_state='TRANSCRIBING_REMOTE',
      transcription_lease_hash=p_lease_hash,
      transcription_lease_until=p_lease_until,
      transcription_attempts=coalesce(c.transcription_attempts,0)+1,
      transcription_error=null,
      updated_at=now()
  from candidate x
  where c.workspace_id=x.workspace_id and c.id=x.id
  returning c.workspace_id,c.id,c.page_id,c.created_at,c.audio_storage_path,c.audio_mime_type,c.audio_size_bytes,c.transcription_attempts;
$$;

revoke all on function public.claim_prometeo_transcription_v1(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_prometeo_transcription_v1(uuid,text,timestamptz) to service_role;

create or replace function public.prometeo_save_ai_session_v1(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  s public.prometeo_ai_sessions%rowtype;
  v_note text;
  v_summary text;
  v_title text;
  v_capture_id text;
  v_revision integer;
  v_digest text;
  v_now timestamptz := now();
begin
  if p_token is null or length(p_token) < 24 then
    raise exception 'AI_SESSION_SAVE_TOKEN_INVALID';
  end if;

  select * into s
  from public.prometeo_ai_sessions
  where save_token_hash=encode(digest(p_token,'sha256'),'hex')
  for update;
  if not found then raise exception 'AI_SESSION_NOT_FOUND'; end if;
  if s.expires_at < v_now then raise exception 'AI_SESSION_EXPIRED'; end if;

  v_note := btrim(coalesce(p_payload->>'ai_note',''));
  if v_note='' then raise exception 'AI_NOTE_REQUIRED'; end if;
  if length(v_note)>50000 then raise exception 'AI_NOTE_TOO_LARGE'; end if;
  v_summary := left(btrim(coalesce(p_payload->>'continuity_summary','')),30000);
  v_title := left(btrim(coalesce(p_payload->>'title',s.title,s.session_code)),300);
  v_digest := encode(digest(v_note,'sha256'),'hex');
  v_capture_id := coalesce(s.saved_note_capture_id,'ai-'||lower(s.session_code));

  select transcript_revision into v_revision
  from public.prometeo_captures
  where workspace_id=s.workspace_id and id=v_capture_id
  for update;

  if found then
    v_revision := coalesce(v_revision,0)+1;
    update public.prometeo_captures
    set transcript=v_note,
        transcript_revision=v_revision,
        transcript_state='AI_DERIVED',
        transcript_digest=v_digest,
        processing_state='READY',
        status='pending',
        privacy='PROJECT',
        metadata=jsonb_build_object(
          'source_kind','AI_RESEARCH_NOTE',
          'session_code',s.session_code,
          'continuity_summary',v_summary,
          'decisions',coalesce(p_payload->'decisions','[]'::jsonb),
          'negative_knowledge',coalesce(p_payload->'negative_knowledge','[]'::jsonb),
          'open_questions',coalesce(p_payload->'open_questions','[]'::jsonb),
          'sources',coalesce(p_payload->'sources','[]'::jsonb),
          'artifacts',coalesce(p_payload->'artifacts','[]'::jsonb)
        ),
        context_snapshot=jsonb_build_object('ai_session_id',s.id,'session_code',s.session_code,'parent_session_id',s.parent_session_id),
        updated_at=v_now,
        sync_version=sync_version+1
    where workspace_id=s.workspace_id and id=v_capture_id;
  else
    v_revision := 1;
    insert into public.prometeo_captures(
      workspace_id,id,page_id,created_at,updated_at,status,transcript,transcript_revision,
      source_title,metadata,privacy,processing_state,transcript_state,context_snapshot,
      transcript_digest,archive_state,sync_version
    ) values (
      s.workspace_id,v_capture_id,s.page_id,v_now,v_now,'pending',v_note,v_revision,
      coalesce(v_title,s.page_id),
      jsonb_build_object(
        'source_kind','AI_RESEARCH_NOTE',
        'session_code',s.session_code,
        'continuity_summary',v_summary,
        'decisions',coalesce(p_payload->'decisions','[]'::jsonb),
        'negative_knowledge',coalesce(p_payload->'negative_knowledge','[]'::jsonb),
        'open_questions',coalesce(p_payload->'open_questions','[]'::jsonb),
        'sources',coalesce(p_payload->'sources','[]'::jsonb),
        'artifacts',coalesce(p_payload->'artifacts','[]'::jsonb)
      ),
      'PROJECT','READY','AI_DERIVED',
      jsonb_build_object('ai_session_id',s.id,'session_code',s.session_code,'parent_session_id',s.parent_session_id),
      v_digest,'ACTIVE',1
    );
  end if;

  insert into public.prometeo_capture_revisions(
    workspace_id,capture_id,revision,transcript,created_at,transcript_state,transcript_digest,privacy,source_ref
  ) values (
    s.workspace_id,v_capture_id,v_revision,v_note,v_now,'AI_DERIVED',v_digest,'PROJECT',
    'capture:'||v_capture_id||':rev:'||v_revision
  ) on conflict (workspace_id,capture_id,revision) do update set
    transcript=excluded.transcript,
    transcript_state=excluded.transcript_state,
    transcript_digest=excluded.transcript_digest,
    privacy=excluded.privacy,
    source_ref=excluded.source_ref;

  update public.prometeo_ai_sessions
  set status='SAVED',
      title=coalesce(nullif(v_title,''),title),
      saved_payload=p_payload,
      saved_note_capture_id=v_capture_id,
      chat_url=nullif(p_payload->>'chat_url',''),
      saved_at=v_now,
      updated_at=v_now
  where id=s.id;

  update public.prometeo_change_threads
  set last_capture_at=v_now,updated_at=v_now
  where id=s.thread_id and workspace_id=s.workspace_id;

  return jsonb_build_object(
    'ok',true,
    'session_code',s.session_code,
    'page_id',s.page_id,
    'capture_id',v_capture_id,
    'revision',v_revision,
    'saved_at',v_now
  );
end;
$$;

revoke all on function public.prometeo_save_ai_session_v1(text,jsonb) from public, anon, authenticated;
grant execute on function public.prometeo_save_ai_session_v1(text,jsonb) to service_role;
