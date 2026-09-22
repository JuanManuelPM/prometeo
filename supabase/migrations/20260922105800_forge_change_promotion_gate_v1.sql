
-- BACKLOG-184: only validated changes may be promoted to production.
-- Canonical Prometeo promotion boundary: same-change test evidence + independent review,
-- dry-run by default, explicit authority for durable promotion, idempotent writes.

create table if not exists public.forge_change_promotions (
  promotion_id uuid primary key default gen_random_uuid(),
  source_key text not null check (btrim(source_key) <> ''),
  change_ref text not null unique check (btrim(change_ref) <> ''),
  author_worker_code text not null check (btrim(author_worker_code) <> ''),
  reviewer_worker_code text not null check (btrim(reviewer_worker_code) <> ''),
  test_evidence jsonb not null check (jsonb_typeof(test_evidence)='object'),
  review_evidence jsonb not null check (jsonb_typeof(review_evidence)='object'),
  validation_hash text not null check (btrim(validation_hash) <> ''),
  promoted_by_worker_code text not null check (btrim(promoted_by_worker_code) <> ''),
  promoted_at timestamptz not null default clock_timestamp()
);

create index if not exists forge_change_promotions_source_idx
on public.forge_change_promotions(source_key,promoted_at desc);

create or replace function public.forge_change_promotion_gate(
  p_source_key text,
  p_change_ref text,
  p_author_worker_code text,
  p_test_evidence jsonb,
  p_reviewer_worker_code text,
  p_review_evidence jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_source text := nullif(btrim(p_source_key),'');
  v_change text := nullif(btrim(p_change_ref),'');
  v_author text := nullif(btrim(p_author_worker_code),'');
  v_reviewer text := nullif(btrim(p_reviewer_worker_code),'');
  v_test jsonb := coalesce(p_test_evidence,'{}'::jsonb);
  v_review jsonb := coalesce(p_review_evidence,'{}'::jsonb);
  v_hash text;
begin
  if v_source is null or v_change is null or v_author is null then
    return jsonb_build_object('ok',false,'state','PROMOTION_INPUT_INVALID');
  end if;

  if jsonb_typeof(v_test) <> 'object'
     or upper(coalesce(v_test->>'result','')) <> 'PASS'
     or nullif(btrim(v_test->>'evidence_ref'),'') is null then
    return jsonb_build_object('ok',false,'state','TEST_EVIDENCE_INVALID');
  end if;

  if nullif(btrim(v_test->>'change_ref'),'') is distinct from v_change then
    return jsonb_build_object('ok',false,'state','TEST_CHANGE_MISMATCH');
  end if;

  if v_reviewer is null then
    return jsonb_build_object('ok',false,'state','REVIEWER_REQUIRED');
  end if;

  if v_reviewer = v_author then
    return jsonb_build_object('ok',false,'state','SELF_REVIEW_FORBIDDEN');
  end if;

  if jsonb_typeof(v_review) <> 'object'
     or upper(coalesce(v_review->>'result','')) <> 'PASS'
     or nullif(btrim(v_review->>'evidence_ref'),'') is null then
    return jsonb_build_object('ok',false,'state','REVIEW_EVIDENCE_INVALID');
  end if;

  if nullif(btrim(v_review->>'change_ref'),'') is distinct from v_change then
    return jsonb_build_object('ok',false,'state','REVIEW_CHANGE_MISMATCH');
  end if;

  v_hash := 'md5:' || md5(
    v_source || E'\n' || v_change || E'\n' || v_author || E'\n' ||
    v_reviewer || E'\n' || v_test::text || E'\n' || v_review::text
  );

  return jsonb_build_object(
    'ok',true,
    'state','PROMOTION_READY',
    'source_key',v_source,
    'change_ref',v_change,
    'author_worker_code',v_author,
    'reviewer_worker_code',v_reviewer,
    'validation_hash',v_hash,
    'test_evidence_ref',v_test->>'evidence_ref',
    'review_evidence_ref',v_review->>'evidence_ref'
  );
end;
$function$;

create or replace function public.forge_change_promote(
  p_source_key text,
  p_change_ref text,
  p_author_worker_code text,
  p_test_evidence jsonb,
  p_reviewer_worker_code text,
  p_review_evidence jsonb,
  p_promoted_by_worker_code text,
  p_authority boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_gate jsonb;
  v_promoter text := nullif(btrim(p_promoted_by_worker_code),'');
  v_existing public.forge_change_promotions%rowtype;
  v_inserted integer := 0;
begin
  v_gate := public.forge_change_promotion_gate(
    p_source_key,p_change_ref,p_author_worker_code,p_test_evidence,
    p_reviewer_worker_code,p_review_evidence
  );

  if coalesce((v_gate->>'ok')::boolean,false) is not true then
    return v_gate;
  end if;

  if v_promoter is null then
    return jsonb_build_object('ok',false,'state','PROMOTER_REQUIRED');
  end if;

  if p_authority is not true then
    return v_gate || jsonb_build_object(
      'authority_granted',false,
      'authority_required',true
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('forge-change-promote:' || p_change_ref));

  insert into public.forge_change_promotions(
    source_key,change_ref,author_worker_code,reviewer_worker_code,
    test_evidence,review_evidence,validation_hash,promoted_by_worker_code
  )
  values(
    btrim(p_source_key),btrim(p_change_ref),btrim(p_author_worker_code),btrim(p_reviewer_worker_code),
    p_test_evidence,p_review_evidence,v_gate->>'validation_hash',v_promoter
  )
  on conflict(change_ref) do nothing;

  get diagnostics v_inserted = row_count;

  select * into v_existing
  from public.forge_change_promotions
  where change_ref=btrim(p_change_ref);

  if v_inserted = 0 then
    if v_existing.source_key is distinct from btrim(p_source_key)
       or v_existing.author_worker_code is distinct from btrim(p_author_worker_code)
       or v_existing.reviewer_worker_code is distinct from btrim(p_reviewer_worker_code)
       or v_existing.test_evidence is distinct from p_test_evidence
       or v_existing.review_evidence is distinct from p_review_evidence
       or v_existing.validation_hash is distinct from v_gate->>'validation_hash'
    then
      return jsonb_build_object(
        'ok',false,'state','PROMOTION_CONFLICT',
        'change_ref',btrim(p_change_ref),
        'existing_promotion_id',v_existing.promotion_id
      );
    end if;

    return jsonb_build_object(
      'ok',true,'state','ALREADY_PROMOTED',
      'promotion_id',v_existing.promotion_id,
      'source_key',v_existing.source_key,
      'change_ref',v_existing.change_ref,
      'validation_hash',v_existing.validation_hash,
      'promoted_at',v_existing.promoted_at,
      'authority_granted',true
    );
  end if;

  return jsonb_build_object(
    'ok',true,'state','PROMOTED',
    'promotion_id',v_existing.promotion_id,
    'source_key',v_existing.source_key,
    'change_ref',v_existing.change_ref,
    'validation_hash',v_existing.validation_hash,
    'promoted_at',v_existing.promoted_at,
    'authority_granted',true
  );
end;
$function$;

comment on table public.forge_change_promotions is
'BACKLOG-184: durable ledger of production promotions admitted only after same-change test PASS and independent review PASS.';

comment on function public.forge_change_promotion_gate(text,text,text,jsonb,text,jsonb) is
'BACKLOG-184: validate that test and independent-review evidence both PASS and both bind to the exact change_ref.';

comment on function public.forge_change_promote(text,text,text,jsonb,text,jsonb,text,boolean) is
'BACKLOG-184: dry-run by default; with authority=true records an idempotent production promotion only when the validation gate passes.';

create or replace function public.forge_change_promotion_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_change text := 'github:smoke/' || gen_random_uuid()::text;
  v_test jsonb;
  v_review jsonb;
  v_missing_test jsonb;
  v_mismatch jsonb;
  v_self jsonb;
  v_bad_review jsonb;
  v_dry jsonb;
  v_promoted jsonb;
  v_again jsonb;
  v_conflict jsonb;
  v_count integer;
begin
  v_test := jsonb_build_object(
    'result','PASS','change_ref',v_change,'evidence_ref','smoke://test/pass'
  );
  v_review := jsonb_build_object(
    'result','PASS','change_ref',v_change,'evidence_ref','smoke://review/pass'
  );

  v_missing_test := public.forge_change_promotion_gate(
    'BACKLOG-184',v_change,'KAUTHOR','{}'::jsonb,'KREVIEW',v_review
  );

  v_mismatch := public.forge_change_promotion_gate(
    'BACKLOG-184',v_change,'KAUTHOR',
    jsonb_build_object('result','PASS','change_ref','other','evidence_ref','smoke://test/pass'),
    'KREVIEW',v_review
  );

  v_self := public.forge_change_promotion_gate(
    'BACKLOG-184',v_change,'KAUTHOR',v_test,'KAUTHOR',v_review
  );

  v_bad_review := public.forge_change_promotion_gate(
    'BACKLOG-184',v_change,'KAUTHOR',v_test,'KREVIEW',
    jsonb_build_object('result','FAIL','change_ref',v_change,'evidence_ref','smoke://review/fail')
  );

  v_dry := public.forge_change_promote(
    'BACKLOG-184',v_change,'KAUTHOR',v_test,'KREVIEW',v_review,'KPROMOTER',false
  );

  select count(*) into v_count
  from public.forge_change_promotions where change_ref=v_change;

  if v_missing_test->>'state' <> 'TEST_EVIDENCE_INVALID'
     or v_mismatch->>'state' <> 'TEST_CHANGE_MISMATCH'
     or v_self->>'state' <> 'SELF_REVIEW_FORBIDDEN'
     or v_bad_review->>'state' <> 'REVIEW_EVIDENCE_INVALID'
     or v_dry->>'state' <> 'PROMOTION_READY'
     or v_count <> 0 then
    raise exception 'promotion negative/dry-run assertions failed';
  end if;

  v_promoted := public.forge_change_promote(
    'BACKLOG-184',v_change,'KAUTHOR',v_test,'KREVIEW',v_review,'KPROMOTER',true
  );

  v_again := public.forge_change_promote(
    'BACKLOG-184',v_change,'KAUTHOR',v_test,'KREVIEW',v_review,'KPROMOTER2',true
  );

  v_conflict := public.forge_change_promote(
    'OTHER-SOURCE',v_change,'KAUTHOR',v_test,'KREVIEW',v_review,'KPROMOTER',true
  );

  select count(*) into v_count
  from public.forge_change_promotions where change_ref=v_change;

  if v_promoted->>'state' <> 'PROMOTED'
     or v_again->>'state' <> 'ALREADY_PROMOTED'
     or v_conflict->>'state' <> 'PROMOTION_CONFLICT'
     or v_count <> 1 then
    raise exception 'promotion positive/idempotency assertions failed';
  end if;

  delete from public.forge_change_promotions where change_ref=v_change;

  return jsonb_build_object(
    'ok',true,
    'state','CHANGE_PROMOTION_SMOKE_OK',
    'missing_test_blocked','PASS',
    'test_change_mismatch_blocked','PASS',
    'self_review_blocked','PASS',
    'failed_review_blocked','PASS',
    'dry_run_no_write','PASS',
    'promotion_written','PASS',
    'idempotent_repeat','PASS',
    'conflicting_repeat_blocked','PASS',
    'fixture_cleaned',not exists(
      select 1 from public.forge_change_promotions where change_ref=v_change
    )
  );
exception when others then
  delete from public.forge_change_promotions where change_ref=v_change;
  return jsonb_build_object(
    'ok',false,'state','CHANGE_PROMOTION_SMOKE_FAILED','error',sqlerrm
  );
end;
$function$;
