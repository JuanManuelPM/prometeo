-- Provider-neutral Study ingestion layer.
-- SOURCE stays in provider/raw tables + study_source_artifacts.
-- CONTENT/DERIVATION is projected into canonical documents/text/events.
-- UI/Reader/TTS is intentionally not touched here.

create extension if not exists pgcrypto;

create table if not exists public.study_canonical_documents (
  workspace_id text not null,
  document_id text not null,
  source_id text not null,
  course_id text,
  offering_id text,
  provider text not null,
  provider_course_id text,
  provider_item_id text,
  document_kind text not null,
  title text not null,
  source_url text,
  reopen_handle text,
  private_ref text,
  mime_type text,
  source_modified_at timestamptz,
  captured_at timestamptz not null,
  content_hash text,
  canonical_status text not null default 'metadata-only'
    check (canonical_status in ('metadata-only','source-text','binary-ready','extracted')),
  provenance jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, document_id),
  unique (workspace_id, source_id)
);
create index if not exists study_canonical_documents_course_idx
  on public.study_canonical_documents(workspace_id, course_id, provider, document_kind);
create index if not exists study_canonical_documents_source_idx
  on public.study_canonical_documents(workspace_id, source_id);

create table if not exists public.study_canonical_document_text_versions (
  workspace_id text not null,
  document_id text not null,
  version_id text not null,
  source_id text not null,
  text_kind text not null check (text_kind in ('source_text','extracted_text')),
  body_text text not null,
  text_hash text not null,
  extraction_method text not null,
  extraction_status text not null,
  source_locator jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, document_id, version_id, text_kind),
  foreign key (workspace_id, document_id)
    references public.study_canonical_documents(workspace_id, document_id) on delete cascade
);
create index if not exists study_canonical_document_text_source_idx
  on public.study_canonical_document_text_versions(workspace_id, source_id, captured_at desc);

create table if not exists public.study_document_extraction_queue (
  workspace_id text not null,
  job_id text not null,
  document_id text not null,
  source_id text not null,
  provider text not null,
  input_ref text not null,
  mime_type text,
  content_hash text,
  parser_profile text not null default 'document-default',
  status text not null default 'pending'
    check (status in ('pending','running','complete','error','blocked')),
  priority integer not null default 50,
  attempts integer not null default 0,
  reason text not null default 'binary-source-ready',
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, job_id),
  foreign key (workspace_id, document_id)
    references public.study_canonical_documents(workspace_id, document_id) on delete cascade
);
create index if not exists study_document_extraction_queue_pending_idx
  on public.study_document_extraction_queue(workspace_id, status, priority desc, created_at);

create table if not exists public.study_derived_events (
  workspace_id text not null,
  event_id text not null,
  course_id text,
  source_id text not null,
  document_id text,
  provider text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  event_type text not null,
  source_locator jsonb not null default '{}'::jsonb,
  extraction_confidence text not null,
  extraction_status text not null,
  conflict_group_id text,
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, event_id)
);
create index if not exists study_derived_events_course_date_idx
  on public.study_derived_events(workspace_id, course_id, starts_at);
create index if not exists study_derived_events_conflict_idx
  on public.study_derived_events(workspace_id, conflict_group_id)
  where conflict_group_id is not null;

alter table public.study_canonical_documents enable row level security;
alter table public.study_canonical_document_text_versions enable row level security;
alter table public.study_document_extraction_queue enable row level security;
alter table public.study_derived_events enable row level security;

create or replace function public.study_sync_source_artifact_to_canonical_document()
returns trigger
language plpgsql
as $$
declare
  did text := 'doc:' || new.source_id;
  status_v text;
  provider_course_v text := coalesce(new.metadata->>'external_course_key', new.metadata->>'course_key');
  provider_item_v text := coalesce(new.metadata->>'external_item_key', new.metadata->>'item_key');
begin
  if new.source_role = 'calendar_event' then
    return new;
  end if;

  status_v := case
    when new.private_ref is not null then 'binary-ready'
    else 'metadata-only'
  end;

  insert into public.study_canonical_documents(
    workspace_id,document_id,source_id,course_id,offering_id,provider,
    provider_course_id,provider_item_id,document_kind,title,source_url,reopen_handle,
    private_ref,mime_type,source_modified_at,captured_at,content_hash,canonical_status,
    provenance,raw_metadata,first_seen_at,last_seen_at
  ) values (
    new.workspace_id,did,new.source_id,new.course_id,new.offering_id,new.provider,
    provider_course_v,provider_item_v,new.source_role,new.title,new.source_url,new.source_url,
    new.private_ref,new.mime_type,new.modified_source_at,coalesce(new.last_seen_at,now()),new.content_hash,status_v,
    jsonb_build_object(
      'source_id',new.source_id,
      'provider',new.provider,
      'authority_tier',new.authority_tier,
      'historical',new.historical,
      'source_table','study_source_artifacts'
    ),
    coalesce(new.metadata,'{}'::jsonb),
    coalesce(new.first_seen_at,now()),coalesce(new.last_seen_at,now())
  )
  on conflict (workspace_id,source_id) do update set
    course_id=coalesce(excluded.course_id,study_canonical_documents.course_id),
    offering_id=coalesce(excluded.offering_id,study_canonical_documents.offering_id),
    provider=excluded.provider,
    provider_course_id=coalesce(excluded.provider_course_id,study_canonical_documents.provider_course_id),
    provider_item_id=coalesce(excluded.provider_item_id,study_canonical_documents.provider_item_id),
    document_kind=excluded.document_kind,
    title=excluded.title,
    source_url=coalesce(excluded.source_url,study_canonical_documents.source_url),
    reopen_handle=coalesce(excluded.reopen_handle,study_canonical_documents.reopen_handle),
    private_ref=coalesce(excluded.private_ref,study_canonical_documents.private_ref),
    mime_type=coalesce(excluded.mime_type,study_canonical_documents.mime_type),
    source_modified_at=coalesce(excluded.source_modified_at,study_canonical_documents.source_modified_at),
    captured_at=greatest(study_canonical_documents.captured_at,excluded.captured_at),
    content_hash=coalesce(excluded.content_hash,study_canonical_documents.content_hash),
    canonical_status=case
      when study_canonical_documents.canonical_status='extracted' then 'extracted'
      when excluded.canonical_status='source-text' then 'source-text'
      when excluded.canonical_status='binary-ready' and study_canonical_documents.canonical_status='metadata-only' then 'binary-ready'
      else study_canonical_documents.canonical_status
    end,
    provenance=study_canonical_documents.provenance || excluded.provenance,
    raw_metadata=excluded.raw_metadata,
    first_seen_at=least(study_canonical_documents.first_seen_at,excluded.first_seen_at),
    last_seen_at=greatest(study_canonical_documents.last_seen_at,excluded.last_seen_at),
    updated_at=now();
  return new;
end $$;

drop trigger if exists trg_study_source_artifact_to_canonical on public.study_source_artifacts;
create trigger trg_study_source_artifact_to_canonical
after insert or update on public.study_source_artifacts
for each row execute function public.study_sync_source_artifact_to_canonical_document();

create or replace function public.study_sync_bb_item_text_to_canonical()
returns trigger
language plpgsql
as $$
declare
  sid text := 'bb:item:' || new.item_key;
  did text := 'doc:' || sid;
  h text;
  vid text;
begin
  if length(trim(coalesce(new.body_text,''))) = 0 then
    return new;
  end if;
  if not exists (
    select 1 from public.study_canonical_documents d
    where d.workspace_id=new.workspace_id and d.document_id=did
  ) then
    return new;
  end if;
  h := encode(digest(convert_to(new.body_text,'UTF8'),'sha256'),'hex');
  vid := 'text:' || h;
  insert into public.study_canonical_document_text_versions(
    workspace_id,document_id,version_id,source_id,text_kind,body_text,text_hash,
    extraction_method,extraction_status,source_locator,provenance,captured_at
  ) values (
    new.workspace_id,did,vid,sid,'source_text',new.body_text,h,
    'blackboard-rendered-body-text','captured',
    jsonb_build_object('source_page',new.source_page,'url',new.href),
    jsonb_build_object('provider','blackboard','source_id',sid,'raw_table','study_bb_items'),
    coalesce(new.last_seen_at,now())
  ) on conflict do nothing;

  update public.study_canonical_documents
  set canonical_status='source-text',
      content_hash=case when new.item_type='file' then content_hash else coalesce(content_hash,h) end,
      updated_at=now()
  where workspace_id=new.workspace_id and document_id=did;
  return new;
end $$;

drop trigger if exists trg_zz_study_bb_item_text_to_canonical on public.study_bb_items;
create trigger trg_zz_study_bb_item_text_to_canonical
after insert or update on public.study_bb_items
for each row execute function public.study_sync_bb_item_text_to_canonical();

create or replace function public.study_queue_source_artifact_for_document_extraction()
returns trigger
language plpgsql
as $$
declare
  did text := 'doc:' || new.source_id;
  h text := coalesce(new.content_hash, encode(digest(convert_to(new.private_ref,'UTF8'),'sha256'),'hex'));
  jid text;
  prio integer := case when new.title ~* '(syllabus|programa|cronograma)' then 100 else 70 end;
begin
  if new.private_ref is null or new.source_role='calendar_event' then
    return new;
  end if;
  if new.extraction_status in ('extracted','complete') then
    return new;
  end if;
  if not exists (
    select 1 from public.study_canonical_documents d
    where d.workspace_id=new.workspace_id and d.document_id=did
  ) then
    return new;
  end if;
  jid := 'extract:' || new.source_id || ':' || left(h,32);
  insert into public.study_document_extraction_queue(
    workspace_id,job_id,document_id,source_id,provider,input_ref,mime_type,content_hash,
    parser_profile,status,priority,reason,metadata
  ) values (
    new.workspace_id,jid,did,new.source_id,new.provider,new.private_ref,new.mime_type,new.content_hash,
    'document-default','pending',prio,'binary-source-ready',
    jsonb_build_object('source_role',new.source_role,'authority_tier',new.authority_tier)
  ) on conflict (workspace_id,job_id) do update set
    input_ref=excluded.input_ref,
    mime_type=coalesce(excluded.mime_type,study_document_extraction_queue.mime_type),
    content_hash=coalesce(excluded.content_hash,study_document_extraction_queue.content_hash),
    priority=greatest(study_document_extraction_queue.priority,excluded.priority),
    status=case when study_document_extraction_queue.status='complete' then 'complete' else 'pending' end,
    updated_at=now();
  return new;
end $$;

drop trigger if exists trg_zz_study_source_artifact_to_extraction_queue on public.study_source_artifacts;
create trigger trg_zz_study_source_artifact_to_extraction_queue
after insert or update on public.study_source_artifacts
for each row execute function public.study_queue_source_artifact_for_document_extraction();

create or replace function public.study_sync_bb_calendar_to_derived_event()
returns trigger
language plpgsql
as $$
declare
  cid text;
  sid text := 'bb:calendar:' || new.uid;
  event_type_v text;
  body text := lower(coalesce(new.title,'') || ' ' || coalesce(new.description,''));
begin
  if new.starts_at is null then
    return new;
  end if;

  select a.course_id into cid
  from public.study_course_aliases a
  where a.workspace_id=new.workspace_id
    and a.source_kind in ('blackboard','blackboard_course_code')
    and a.source_key=new.course_hint
  order by case when a.source_kind='blackboard' then 0 else 1 end
  limit 1;

  event_type_v := case
    when body ~ '(recuperatorio|recuperacion)' then 'makeup_exam'
    when body ~ '(parcial|examen|evaluacion|final)' then 'exam'
    when body ~ '(entrega|trabajo practico|trabajo práctico|assignment)' then 'assignment_due'
    when body ~ '(feriado|sin clase|no hay clase|no-class)' then 'no_class'
    when body ~ '(clase)' then 'class'
    else 'important_date'
  end;

  insert into public.study_derived_events(
    workspace_id,event_id,course_id,source_id,document_id,provider,title,starts_at,ends_at,all_day,
    event_type,source_locator,extraction_confidence,extraction_status,provenance,metadata
  ) values (
    new.workspace_id,'event:'||sid,cid,sid,null,'blackboard',new.title,new.starts_at,new.ends_at,new.all_day,
    event_type_v,
    jsonb_build_object('kind','blackboard-calendar','uid',new.uid,'href',new.href),
    'direct-source-date',
    case when cid is null then 'derived-unmapped-course' else 'derived' end,
    jsonb_build_object('provider','blackboard','source_kind','calendar','source_id',sid,'authority','source-event-preserved'),
    jsonb_build_object('course_hint',new.course_hint,'location',new.location)
  ) on conflict (workspace_id,event_id) do update set
    course_id=coalesce(excluded.course_id,study_derived_events.course_id),
    title=excluded.title,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    all_day=excluded.all_day,
    event_type=excluded.event_type,
    source_locator=excluded.source_locator,
    extraction_confidence=excluded.extraction_confidence,
    extraction_status=case when study_derived_events.extraction_status='conflict' then 'conflict' else excluded.extraction_status end,
    provenance=excluded.provenance,
    metadata=excluded.metadata,
    updated_at=now();
  return new;
end $$;

drop trigger if exists trg_study_bb_calendar_to_derived_event on public.study_bb_events;
create trigger trg_study_bb_calendar_to_derived_event
after insert or update on public.study_bb_events
for each row execute function public.study_sync_bb_calendar_to_derived_event();

insert into public.study_canonical_documents(
  workspace_id,document_id,source_id,course_id,offering_id,provider,
  provider_course_id,provider_item_id,document_kind,title,source_url,reopen_handle,
  private_ref,mime_type,source_modified_at,captured_at,content_hash,canonical_status,
  provenance,raw_metadata,first_seen_at,last_seen_at
)
select
  s.workspace_id,'doc:'||s.source_id,s.source_id,s.course_id,s.offering_id,s.provider,
  coalesce(s.metadata->>'external_course_key',s.metadata->>'course_key'),
  coalesce(s.metadata->>'external_item_key',s.metadata->>'item_key'),
  s.source_role,s.title,s.source_url,s.source_url,s.private_ref,s.mime_type,s.modified_source_at,
  coalesce(s.last_seen_at,now()),s.content_hash,
  case
    when s.private_ref is not null then 'binary-ready'
    else 'metadata-only'
  end,
  jsonb_build_object('source_id',s.source_id,'provider',s.provider,'authority_tier',s.authority_tier,'historical',s.historical,'source_table','study_source_artifacts'),
  coalesce(s.metadata,'{}'::jsonb),coalesce(s.first_seen_at,now()),coalesce(s.last_seen_at,now())
from public.study_source_artifacts s
where s.source_role <> 'calendar_event'
on conflict (workspace_id,source_id) do nothing;

insert into public.study_canonical_document_text_versions(
  workspace_id,document_id,version_id,source_id,text_kind,body_text,text_hash,
  extraction_method,extraction_status,source_locator,provenance,captured_at
)
select
  i.workspace_id,'doc:bb:item:'||i.item_key,
  'text:'||encode(digest(convert_to(i.body_text,'UTF8'),'sha256'),'hex'),
  'bb:item:'||i.item_key,'source_text',i.body_text,
  encode(digest(convert_to(i.body_text,'UTF8'),'sha256'),'hex'),
  'blackboard-rendered-body-text','captured',
  jsonb_build_object('source_page',i.source_page,'url',i.href),
  jsonb_build_object('provider','blackboard','source_id','bb:item:'||i.item_key,'raw_table','study_bb_items'),
  coalesce(i.last_seen_at,now())
from public.study_bb_items i
where length(trim(coalesce(i.body_text,'')))>0
  and exists (
    select 1 from public.study_canonical_documents d
    where d.workspace_id=i.workspace_id and d.document_id='doc:bb:item:'||i.item_key
  )
on conflict do nothing;

update public.study_canonical_documents d
set canonical_status='source-text',updated_at=now()
where d.provider='blackboard'
  and exists (
    select 1 from public.study_canonical_document_text_versions t
    where t.workspace_id=d.workspace_id and t.document_id=d.document_id and t.text_kind='source_text'
  );

insert into public.study_derived_events(
  workspace_id,event_id,course_id,source_id,document_id,provider,title,starts_at,ends_at,all_day,
  event_type,source_locator,extraction_confidence,extraction_status,provenance,metadata
)
select
  e.workspace_id,
  'event:bb:calendar:'||e.uid,
  a.course_id,
  'bb:calendar:'||e.uid,
  null,
  'blackboard',
  e.title,
  e.starts_at,
  e.ends_at,
  e.all_day,
  case
    when lower(coalesce(e.title,'')||' '||coalesce(e.description,'')) ~ '(recuperatorio|recuperacion)' then 'makeup_exam'
    when lower(coalesce(e.title,'')||' '||coalesce(e.description,'')) ~ '(parcial|examen|evaluacion|final)' then 'exam'
    when lower(coalesce(e.title,'')||' '||coalesce(e.description,'')) ~ '(entrega|trabajo practico|trabajo práctico|assignment)' then 'assignment_due'
    when lower(coalesce(e.title,'')||' '||coalesce(e.description,'')) ~ '(feriado|sin clase|no hay clase|no-class)' then 'no_class'
    when lower(coalesce(e.title,'')||' '||coalesce(e.description,'')) ~ '(clase)' then 'class'
    else 'important_date'
  end,
  jsonb_build_object('kind','blackboard-calendar','uid',e.uid,'href',e.href),
  'direct-source-date',
  case when a.course_id is null then 'derived-unmapped-course' else 'derived' end,
  jsonb_build_object('provider','blackboard','source_kind','calendar','source_id','bb:calendar:'||e.uid,'authority','source-event-preserved'),
  jsonb_build_object('course_hint',e.course_hint,'location',e.location)
from public.study_bb_events e
left join lateral (
  select x.course_id
  from public.study_course_aliases x
  where x.workspace_id=e.workspace_id
    and x.source_kind in ('blackboard','blackboard_course_code')
    and x.source_key=e.course_hint
  order by case when x.source_kind='blackboard' then 0 else 1 end
  limit 1
) a on true
where e.starts_at is not null
on conflict (workspace_id,event_id) do nothing;