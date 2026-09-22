-- BACKLOG-067: canonical knowledge maturity states and evidence-gated supersession.
-- Existing independent review owns CANDIDATE/REVIEWING/ACCEPTED/REJECTED.
-- This migration closes the durable SUPERSEDED transition and keeps review state synchronized.

alter table public.forge_knowledge_review_candidates
  drop constraint if exists forge_knowledge_review_candidates_status_check;

alter table public.forge_knowledge_review_candidates
  add constraint forge_knowledge_review_candidates_status_check
  check (status in ('CANDIDATE','REVIEWING','ACCEPTED','REJECTED','SUPERSEDED'));

create table if not exists public.forge_knowledge_maturity_events (
  event_id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type in ('PLUMA','TOOL','SKILL')),
  object_id text not null check (btrim(object_id) <> ''),
  version_no integer,
  from_state text not null check (from_state in ('CANDIDATE','REVIEWING','ACCEPTED','REJECTED','SUPERSEDED')),
  to_state text not null check (to_state in ('CANDIDATE','REVIEWING','ACCEPTED','REJECTED','SUPERSEDED')),
  actor_worker_code text,
  evidence_ref text not null check (btrim(evidence_ref) <> ''),
  reason_code text not null default 'MATURITY_TRANSITION',
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists forge_knowledge_maturity_events_object_idx
  on public.forge_knowledge_maturity_events(object_type,object_id,version_no,created_at);

create or replace function public.forge_knowledge_maturity_catalog()
returns jsonb
language sql
immutable
set search_path to 'public','pg_temp'
as $$
select jsonb_build_object(
  'schema','prometeo.knowledge-maturity/v1',
  'states',jsonb_build_array('CANDIDATE','REVIEWING','ACCEPTED','REJECTED','SUPERSEDED'),
  'transitions',jsonb_build_array(
    jsonb_build_object('from','CANDIDATE','to','REVIEWING','reason','independent review claimed'),
    jsonb_build_object('from','REVIEWING','to','CANDIDATE','reason','review requests revision'),
    jsonb_build_object('from','REVIEWING','to','ACCEPTED','reason','review accepts exact revision'),
    jsonb_build_object('from','REVIEWING','to','REJECTED','reason','review rejects exact revision'),
    jsonb_build_object('from','ACCEPTED','to','SUPERSEDED','reason','newer evidence or replacement retires accepted object')
  ),
  'terminal_states',jsonb_build_array('REJECTED','SUPERSEDED'),
  'supersede_requires_evidence',true
);
$$;

create or replace function public.forge_knowledge_supersede(
  p_object_type text,
  p_object_id text,
  p_evidence_ref text,
  p_actor_worker_code text default null,
  p_version_no integer default null,
  p_reason_code text default 'SUPERSEDED'
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_type text := upper(coalesce(nullif(btrim(p_object_type),''),''));
  v_id text := nullif(btrim(p_object_id),'');
  v_evidence text := nullif(btrim(p_evidence_ref),'');
  v_actor text := nullif(btrim(p_actor_worker_code),'');
  v_reason text := coalesce(nullif(btrim(p_reason_code),''),'SUPERSEDED');
  v_state text;
  v_version integer := p_version_no;
begin
  if v_type not in ('PLUMA','TOOL','SKILL') or v_id is null then
    return jsonb_build_object('ok',false,'state','INVALID_MATURITY_OBJECT');
  end if;
  if v_evidence is null then
    return jsonb_build_object('ok',false,'state','SUPERSEDE_EVIDENCE_REQUIRED');
  end if;

  if v_type='TOOL' then
    select status into v_state
    from public.forge_tools
    where tool_id=v_id
    for update;
    if not found then
      return jsonb_build_object('ok',false,'state','MATURITY_OBJECT_NOT_FOUND');
    end if;
    if v_state <> 'ACCEPTED' then
      return jsonb_build_object('ok',false,'state','SUPERSEDE_REQUIRES_ACCEPTED','current_state',v_state);
    end if;
    update public.forge_tools set status='SUPERSEDED' where tool_id=v_id;
    update public.forge_knowledge_review_candidates
    set status='SUPERSEDED',updated_at=clock_timestamp()
    where candidate_type='TOOL' and candidate_id=v_id;

  elsif v_type='PLUMA' then
    select status into v_state
    from public.forge_plumes
    where plume_id=v_id
    for update;
    if not found then
      return jsonb_build_object('ok',false,'state','MATURITY_OBJECT_NOT_FOUND');
    end if;
    if v_state <> 'ACCEPTED' then
      return jsonb_build_object('ok',false,'state','SUPERSEDE_REQUIRES_ACCEPTED','current_state',v_state);
    end if;
    update public.forge_plumes set status='SUPERSEDED' where plume_id=v_id;
    update public.forge_knowledge_review_candidates
    set status='SUPERSEDED',updated_at=clock_timestamp()
    where candidate_type='PLUMA' and candidate_id=v_id;

  else
    if v_version is null then
      return jsonb_build_object('ok',false,'state','SKILL_VERSION_REQUIRED');
    end if;
    select maturity_state into v_state
    from public.forge_skill_versions
    where skill_id=v_id and version_no=v_version
    for update;
    if not found then
      return jsonb_build_object('ok',false,'state','MATURITY_OBJECT_NOT_FOUND');
    end if;
    if v_state <> 'ACCEPTED' then
      return jsonb_build_object('ok',false,'state','SUPERSEDE_REQUIRES_ACCEPTED','current_state',v_state);
    end if;
    update public.forge_skill_versions
    set maturity_state='SUPERSEDED'
    where skill_id=v_id and version_no=v_version;
  end if;

  insert into public.forge_knowledge_maturity_events(
    object_type,object_id,version_no,from_state,to_state,
    actor_worker_code,evidence_ref,reason_code
  ) values(
    v_type,v_id,v_version,'ACCEPTED','SUPERSEDED',
    v_actor,v_evidence,v_reason
  );

  return jsonb_build_object(
    'ok',true,'state','KNOWLEDGE_SUPERSEDED',
    'object_type',v_type,'object_id',v_id,'version_no',v_version,
    'from_state','ACCEPTED','to_state','SUPERSEDED','evidence_ref',v_evidence
  );
end;
$$;

create or replace function public.forge_knowledge_review_claim(
  p_candidate_type text,
  p_candidate_id text,
  p_reviewer_worker_code text,
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_type text := upper(coalesce(nullif(btrim(p_candidate_type),''),''));
  v_id text := nullif(btrim(p_candidate_id),'');
  v_reviewer text := nullif(btrim(p_reviewer_worker_code),'');
  v_candidate public.forge_knowledge_review_candidates%rowtype;
  v_review public.forge_knowledge_reviews%rowtype;
  v_token uuid := gen_random_uuid();
  v_seconds integer := greatest(30,least(coalesce(p_lease_seconds,300),1800));
begin
  select * into v_candidate
  from public.forge_knowledge_review_candidates
  where candidate_type=v_type and candidate_id=v_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'state','REVIEW_CANDIDATE_NOT_FOUND');
  end if;
  if v_reviewer is null then
    return jsonb_build_object('ok',false,'state','REVIEWER_REQUIRED');
  end if;
  if v_candidate.author_worker_code=v_reviewer then
    return jsonb_build_object('ok',false,'state','SELF_REVIEW_FORBIDDEN');
  end if;
  if v_candidate.status in ('ACCEPTED','REJECTED','SUPERSEDED') then
    return jsonb_build_object('ok',false,'state','REVIEW_ALREADY_FINAL','status',v_candidate.status);
  end if;

  select * into v_review
  from public.forge_knowledge_reviews
  where candidate_type=v_type and candidate_id=v_id
    and review_revision=v_candidate.current_revision
  for update;

  if found and v_review.review_decision is null and v_review.lease_expires_at > clock_timestamp() then
    return jsonb_build_object(
      'ok',false,'state','REVIEW_ALREADY_LEASED',
      'review_revision',v_candidate.current_revision,
      'lease_expires_at',v_review.lease_expires_at
    );
  end if;

  if found then
    update public.forge_knowledge_reviews
    set reviewer_worker_code=v_reviewer,
        lease_token=v_token,
        lease_started_at=clock_timestamp(),
        lease_expires_at=clock_timestamp()+make_interval(secs=>v_seconds),
        review_decision=null,
        review_evidence='{}'::jsonb,
        reviewed_at=null
    where review_id=v_review.review_id;
  else
    insert into public.forge_knowledge_reviews(
      candidate_type,candidate_id,review_revision,reviewer_worker_code,
      lease_token,lease_expires_at
    ) values(
      v_type,v_id,v_candidate.current_revision,v_reviewer,
      v_token,clock_timestamp()+make_interval(secs=>v_seconds)
    );
  end if;

  update public.forge_knowledge_review_candidates
  set status='REVIEWING',updated_at=clock_timestamp()
  where candidate_type=v_type and candidate_id=v_id;

  if v_type='TOOL' then
    update public.forge_tools set status='REVIEWING' where tool_id=v_id;
  else
    update public.forge_plumes set status='REVIEWING' where plume_id=v_id;
  end if;

  return jsonb_build_object(
    'ok',true,'state','REVIEW_CLAIMED',
    'candidate_type',v_type,'candidate_id',v_id,
    'review_revision',v_candidate.current_revision,
    'reviewer_worker_code',v_reviewer,
    'lease_token',v_token,
    'lease_seconds',v_seconds
  );
end;
$$;

create or replace function public.forge_knowledge_maturity_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_suffix text := substr(md5(clock_timestamp()::text || random()::text),1,10);
  v_accept_id text := '__B067_ACCEPT__'||v_suffix;
  v_reject_id text := '__B067_REJECT__'||v_suffix;
  v_claim_accept jsonb;
  v_claim_reject jsonb;
  v_accept jsonb;
  v_reject jsonb;
  v_super jsonb;
  v_after_final jsonb;
  v_accept_status text;
  v_candidate_status text;
  v_reject_status text;
  v_event_count integer;
  v_catalog jsonb;
begin
  v_catalog:=public.forge_knowledge_maturity_catalog();

  insert into public.forge_tools(
    tool_id,name,problem,procedure_text,verification_text,status,source_goal_id
  ) values
    (v_accept_id,'B067 accept fixture','maturity smoke','fixture procedure','fixture verify','CANDIDATE','BACKLOG-67'),
    (v_reject_id,'B067 reject fixture','maturity smoke','fixture procedure','fixture verify','CANDIDATE','BACKLOG-67');

  perform public.forge_knowledge_review_register_candidate('TOOL',v_accept_id,'KAUTHOR');
  perform public.forge_knowledge_review_register_candidate('TOOL',v_reject_id,'KAUTHOR');

  v_claim_accept:=public.forge_knowledge_review_claim('TOOL',v_accept_id,'KREVIEWA',300);
  v_claim_reject:=public.forge_knowledge_review_claim('TOOL',v_reject_id,'KREVIEWB',300);

  v_accept:=public.forge_knowledge_review_publish(
    'TOOL',v_accept_id,'KREVIEWA',1,(v_claim_accept->>'lease_token')::uuid,'ACCEPT',
    jsonb_build_object(
      'clarity_check','clear independently','helpful_case','fixture accepted path',
      'counterexample','outside fixture','dedupe_evidence','unique fixture id',
      'reason','exercise ACCEPTED state'
    )
  );

  v_reject:=public.forge_knowledge_review_publish(
    'TOOL',v_reject_id,'KREVIEWB',1,(v_claim_reject->>'lease_token')::uuid,'REJECT',
    jsonb_build_object(
      'clarity_check','clear independently','helpful_case','none sufficient',
      'counterexample','fixture rejected path','dedupe_evidence','unique fixture id',
      'reason','exercise REJECTED state'
    )
  );

  v_super:=public.forge_knowledge_supersede(
    'TOOL',v_accept_id,'receipt://B067/superseded','KREVIEWC',null,'REPLACED_BY_NEWER_EVIDENCE'
  );

  v_after_final:=public.forge_knowledge_review_claim('TOOL',v_accept_id,'KREVIEWD',300);

  select status into v_accept_status from public.forge_tools where tool_id=v_accept_id;
  select status into v_candidate_status
  from public.forge_knowledge_review_candidates
  where candidate_type='TOOL' and candidate_id=v_accept_id;
  select status into v_reject_status from public.forge_tools where tool_id=v_reject_id;
  select count(*) into v_event_count
  from public.forge_knowledge_maturity_events
  where object_type='TOOL' and object_id=v_accept_id
    and from_state='ACCEPTED' and to_state='SUPERSEDED';

  if jsonb_array_length(v_catalog->'states') <> 5
     or v_claim_accept->>'state' <> 'REVIEW_CLAIMED'
     or v_claim_reject->>'state' <> 'REVIEW_CLAIMED'
     or v_accept->>'candidate_status' <> 'ACCEPTED'
     or v_reject->>'candidate_status' <> 'REJECTED'
     or v_super->>'state' <> 'KNOWLEDGE_SUPERSEDED'
     or v_accept_status <> 'SUPERSEDED'
     or v_candidate_status <> 'SUPERSEDED'
     or v_reject_status <> 'REJECTED'
     or v_event_count <> 1
     or v_after_final->>'state' <> 'REVIEW_ALREADY_FINAL'
  then
    raise exception 'B067 knowledge maturity smoke failed';
  end if;

  delete from public.forge_knowledge_review_candidates
  where candidate_type='TOOL' and candidate_id in (v_accept_id,v_reject_id);
  delete from public.forge_knowledge_maturity_events
  where object_type='TOOL' and object_id in (v_accept_id,v_reject_id);
  delete from public.forge_tools
  where tool_id in (v_accept_id,v_reject_id);

  return jsonb_build_object(
    'ok',true,'state','KNOWLEDGE_MATURITY_SMOKE_OK',
    'candidate','PASS','reviewing','PASS','accepted','PASS',
    'rejected','PASS','superseded','PASS',
    'supersede_evidence_required',true,
    'final_state_reclaim_blocked','PASS',
    'fixture_cleaned',
      not exists(select 1 from public.forge_tools where tool_id in (v_accept_id,v_reject_id))
  );
exception when others then
  delete from public.forge_knowledge_review_candidates
  where candidate_type='TOOL' and candidate_id in (v_accept_id,v_reject_id);
  delete from public.forge_knowledge_maturity_events
  where object_type='TOOL' and object_id in (v_accept_id,v_reject_id);
  delete from public.forge_tools
  where tool_id in (v_accept_id,v_reject_id);
  raise;
end;
$$;

select public.forge_knowledge_maturity_smoke_test();
