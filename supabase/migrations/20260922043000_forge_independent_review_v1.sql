-- BACKLOG-068: independent review for new PLUME/TOOL candidates.
-- Author and reviewer must differ. Review publication is fenced by exact revision + lease.

create table if not exists public.forge_knowledge_review_candidates (
  candidate_type text not null check (candidate_type in ('PLUMA','TOOL')),
  candidate_id text not null,
  author_worker_code text not null check (btrim(author_worker_code) <> ''),
  current_revision integer not null default 1 check (current_revision > 0),
  status text not null default 'CANDIDATE'
    check (status in ('CANDIDATE','REVIEWING','ACCEPTED','REJECTED')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(candidate_type,candidate_id)
);

create table if not exists public.forge_knowledge_reviews (
  review_id uuid primary key default gen_random_uuid(),
  candidate_type text not null,
  candidate_id text not null,
  review_revision integer not null check (review_revision > 0),
  reviewer_worker_code text not null check (btrim(reviewer_worker_code) <> ''),
  lease_token uuid not null,
  lease_started_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz not null,
  review_decision text check (review_decision in ('ACCEPT','REJECT','REVISE')),
  review_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(review_evidence)='object'),
  reviewed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique(candidate_type,candidate_id,review_revision),
  foreign key(candidate_type,candidate_id)
    references public.forge_knowledge_review_candidates(candidate_type,candidate_id)
    on delete cascade
);

create index if not exists forge_knowledge_reviews_candidate_history_idx
on public.forge_knowledge_reviews(candidate_type,candidate_id,review_revision);

create or replace function public.forge_knowledge_review_register_candidate(
  p_candidate_type text,
  p_candidate_id text,
  p_author_worker_code text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_type text := upper(coalesce(nullif(btrim(p_candidate_type),''),''));
  v_id text := nullif(btrim(p_candidate_id),'');
  v_author text := nullif(btrim(p_author_worker_code),'');
  v_status text;
  v_row public.forge_knowledge_review_candidates%rowtype;
begin
  if v_type not in ('PLUMA','TOOL') or v_id is null or v_author is null then
    return jsonb_build_object('ok',false,'state','INVALID_CANDIDATE_INPUT');
  end if;

  if v_type='TOOL' then
    select status into v_status from public.forge_tools where tool_id=v_id;
  else
    select status into v_status from public.forge_plumes where plume_id=v_id;
  end if;

  if v_status is null then
    return jsonb_build_object('ok',false,'state','CANDIDATE_OBJECT_NOT_FOUND');
  end if;
  if v_status <> 'CANDIDATE' then
    return jsonb_build_object('ok',false,'state','OBJECT_NOT_CANDIDATE','object_status',v_status);
  end if;

  insert into public.forge_knowledge_review_candidates(
    candidate_type,candidate_id,author_worker_code
  ) values(v_type,v_id,v_author)
  on conflict(candidate_type,candidate_id) do nothing;

  select * into v_row
  from public.forge_knowledge_review_candidates
  where candidate_type=v_type and candidate_id=v_id;

  if v_row.author_worker_code <> v_author then
    return jsonb_build_object('ok',false,'state','AUTHOR_CONFLICT');
  end if;

  return jsonb_build_object(
    'ok',true,'state','REVIEW_CANDIDATE_REGISTERED',
    'candidate_type',v_type,'candidate_id',v_id,
    'author_worker_code',v_author,
    'review_revision',v_row.current_revision,
    'status',v_row.status
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
  if v_candidate.status in ('ACCEPTED','REJECTED') then
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

create or replace function public.forge_knowledge_review_publish(
  p_candidate_type text,
  p_candidate_id text,
  p_reviewer_worker_code text,
  p_review_revision integer,
  p_lease_token uuid,
  p_decision text,
  p_evidence jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_type text := upper(coalesce(nullif(btrim(p_candidate_type),''),''));
  v_id text := nullif(btrim(p_candidate_id),'');
  v_reviewer text := nullif(btrim(p_reviewer_worker_code),'');
  v_decision text := upper(coalesce(nullif(btrim(p_decision),''),''));
  v_candidate public.forge_knowledge_review_candidates%rowtype;
  v_review public.forge_knowledge_reviews%rowtype;
  v_next_status text;
begin
  if v_decision not in ('ACCEPT','REJECT','REVISE') then
    return jsonb_build_object('ok',false,'state','INVALID_REVIEW_DECISION');
  end if;
  if jsonb_typeof(coalesce(p_evidence,'{}'::jsonb)) <> 'object'
     or nullif(btrim(p_evidence->>'clarity_check'),'') is null
     or nullif(btrim(p_evidence->>'helpful_case'),'') is null
     or nullif(btrim(p_evidence->>'counterexample'),'') is null
     or nullif(btrim(p_evidence->>'dedupe_evidence'),'') is null
     or nullif(btrim(p_evidence->>'reason'),'') is null then
    return jsonb_build_object('ok',false,'state','REVIEW_EVIDENCE_INCOMPLETE');
  end if;

  select * into v_candidate
  from public.forge_knowledge_review_candidates
  where candidate_type=v_type and candidate_id=v_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'state','REVIEW_CANDIDATE_NOT_FOUND');
  end if;
  if p_review_revision <> v_candidate.current_revision then
    return jsonb_build_object(
      'ok',false,'state','STALE_REVIEW',
      'current_revision',v_candidate.current_revision
    );
  end if;
  if v_candidate.author_worker_code=v_reviewer then
    return jsonb_build_object('ok',false,'state','SELF_REVIEW_FORBIDDEN');
  end if;

  select * into v_review
  from public.forge_knowledge_reviews
  where candidate_type=v_type and candidate_id=v_id
    and review_revision=p_review_revision
  for update;

  if not found then
    return jsonb_build_object('ok',false,'state','REVIEW_NOT_CLAIMED');
  end if;
  if v_review.review_decision is not null then
    return jsonb_build_object('ok',false,'state','REVIEW_ALREADY_PUBLISHED');
  end if;
  if v_review.reviewer_worker_code is distinct from v_reviewer
     or v_review.lease_token is distinct from p_lease_token then
    return jsonb_build_object('ok',false,'state','STALE_REVIEW_LEASE');
  end if;
  if v_review.lease_expires_at <= clock_timestamp() then
    return jsonb_build_object('ok',false,'state','REVIEW_LEASE_EXPIRED');
  end if;

  update public.forge_knowledge_reviews
  set review_decision=v_decision,
      review_evidence=p_evidence,
      reviewed_at=clock_timestamp()
  where review_id=v_review.review_id;

  if v_decision='REVISE' then
    update public.forge_knowledge_review_candidates
    set current_revision=current_revision+1,
        status='CANDIDATE',
        updated_at=clock_timestamp()
    where candidate_type=v_type and candidate_id=v_id;
    v_next_status := 'CANDIDATE';
  elsif v_decision='ACCEPT' then
    update public.forge_knowledge_review_candidates
    set status='ACCEPTED',updated_at=clock_timestamp()
    where candidate_type=v_type and candidate_id=v_id;
    v_next_status := 'ACCEPTED';
  else
    update public.forge_knowledge_review_candidates
    set status='REJECTED',updated_at=clock_timestamp()
    where candidate_type=v_type and candidate_id=v_id;
    v_next_status := 'REJECTED';
  end if;

  if v_type='TOOL' then
    update public.forge_tools set status=v_next_status where tool_id=v_id;
  else
    update public.forge_plumes set status=v_next_status where plume_id=v_id;
  end if;

  return jsonb_build_object(
    'ok',true,'state','REVIEW_PUBLISHED',
    'candidate_type',v_type,'candidate_id',v_id,
    'review_revision',p_review_revision,
    'decision',v_decision,
    'candidate_status',v_next_status,
    'next_revision',case when v_decision='REVISE' then p_review_revision+1 else p_review_revision end
  );
end;
$$;

create or replace function public.forge_knowledge_review_history(
  p_candidate_type text,
  p_candidate_id text
) returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'candidate_type',upper(btrim(p_candidate_type)),
    'candidate_id',btrim(p_candidate_id),
    'reviews',coalesce(
      jsonb_agg(
        jsonb_build_object(
          'review_id',r.review_id,
          'review_revision',r.review_revision,
          'reviewer_worker_code',r.reviewer_worker_code,
          'review_decision',r.review_decision,
          'review_evidence',r.review_evidence,
          'lease_started_at',r.lease_started_at,
          'reviewed_at',r.reviewed_at
        ) order by r.review_revision
      ) filter (where r.review_id is not null),
      '[]'::jsonb
    )
  )
  from public.forge_knowledge_reviews r
  where r.candidate_type=upper(btrim(p_candidate_type))
    and r.candidate_id=btrim(p_candidate_id);
$$;

create or replace function public.forge_knowledge_independent_review_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_id text := '__B068_TOOL__' || substr(md5(clock_timestamp()::text),1,10);
  v_reg jsonb;
  v_self jsonb;
  v_claim_b jsonb;
  v_claim_c_early jsonb;
  v_revise jsonb;
  v_stale jsonb;
  v_claim_c jsonb;
  v_accept jsonb;
  v_hist jsonb;
  v_status text;
  v_token_b uuid;
  v_token_c uuid;
begin
  insert into public.forge_tools(
    tool_id,name,problem,procedure_text,verification_text,status,source_goal_id
  ) values(
    v_id,'B068 temporary tool','smoke fixture',
    'do deterministic fixture step','verify fixture state',
    'CANDIDATE','BACKLOG-68'
  );

  v_reg := public.forge_knowledge_review_register_candidate('TOOL',v_id,'KAUTHOR');
  v_self := public.forge_knowledge_review_claim('TOOL',v_id,'KAUTHOR',300);
  v_claim_b := public.forge_knowledge_review_claim('TOOL',v_id,'KREVIEWB',300);
  v_token_b := (v_claim_b->>'lease_token')::uuid;
  v_claim_c_early := public.forge_knowledge_review_claim('TOOL',v_id,'KREVIEWC',300);

  v_revise := public.forge_knowledge_review_publish(
    'TOOL',v_id,'KREVIEWB',1,v_token_b,'REVISE',
    jsonb_build_object(
      'clarity_check','definition understood without author context',
      'helpful_case','useful on deterministic fixture',
      'counterexample','do not use outside fixture scope',
      'dedupe_evidence','no equivalent fixture object',
      'reason','revision requested for stronger verification wording'
    )
  );

  v_stale := public.forge_knowledge_review_publish(
    'TOOL',v_id,'KREVIEWB',1,v_token_b,'ACCEPT',
    jsonb_build_object(
      'clarity_check','stale attempt',
      'helpful_case','stale attempt',
      'counterexample','stale attempt',
      'dedupe_evidence','stale attempt',
      'reason','stale attempt'
    )
  );

  v_claim_c := public.forge_knowledge_review_claim('TOOL',v_id,'KREVIEWC',300);
  v_token_c := (v_claim_c->>'lease_token')::uuid;

  v_accept := public.forge_knowledge_review_publish(
    'TOOL',v_id,'KREVIEWC',2,v_token_c,'ACCEPT',
    jsonb_build_object(
      'clarity_check','revised definition understandable independently',
      'helpful_case','fixture demonstrates intended use',
      'counterexample','avoid when preconditions are absent',
      'dedupe_evidence','reviewed existing tool ids; no duplicate',
      'reason','revision 2 satisfies independent review contract'
    )
  );

  v_hist := public.forge_knowledge_review_history('TOOL',v_id);
  select status into v_status from public.forge_tools where tool_id=v_id;

  if v_reg->>'state' <> 'REVIEW_CANDIDATE_REGISTERED'
     or v_self->>'state' <> 'SELF_REVIEW_FORBIDDEN'
     or v_claim_b->>'state' <> 'REVIEW_CLAIMED'
     or v_claim_c_early->>'state' <> 'REVIEW_ALREADY_LEASED'
     or v_revise->>'candidate_status' <> 'CANDIDATE'
     or v_stale->>'state' <> 'STALE_REVIEW'
     or v_claim_c->>'review_revision' <> '2'
     or v_accept->>'candidate_status' <> 'ACCEPTED'
     or jsonb_array_length(v_hist->'reviews') <> 2
     or v_status <> 'ACCEPTED' then
    raise exception 'B068 independent review smoke failed';
  end if;

  delete from public.forge_knowledge_review_candidates
  where candidate_type='TOOL' and candidate_id=v_id;
  delete from public.forge_tools where tool_id=v_id;

  return jsonb_build_object(
    'ok',true,
    'state','INDEPENDENT_REVIEW_SMOKE_OK',
    'self_review_blocked','PASS',
    'other_reviewer_claimed','PASS',
    'active_lease_fenced','PASS',
    'stale_revision_blocked','PASS',
    'revise_preserved_history','PASS',
    'accepted_revision',2,
    'history_entries',2,
    'fixture_cleaned',not exists(select 1 from public.forge_tools where tool_id=v_id)
  );
exception
  when others then
    delete from public.forge_knowledge_review_candidates
    where candidate_type='TOOL' and candidate_id=v_id;
    delete from public.forge_tools where tool_id=v_id;
    raise;
end;
$$;
