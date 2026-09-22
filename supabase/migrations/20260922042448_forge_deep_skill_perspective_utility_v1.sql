-- BACKLOG-224: measure Deep Skill utility by perspective -> finding -> accepted outcome.

create table if not exists public.forge_deep_skill_findings (
  finding_id uuid primary key default gen_random_uuid(),
  skill_id text not null check (btrim(skill_id) <> ''),
  skill_version_no integer null check (skill_version_no is null or skill_version_no > 0),
  perspective text not null check (btrim(perspective) <> ''),
  finding_key text not null check (btrim(finding_key) <> ''),
  finding_text text not null check (btrim(finding_text) <> ''),
  project_id text null,
  job_key text null,
  worker_code text null,
  session_id uuid null,
  disposition text not null default 'PROPOSED'
    check (disposition in ('PROPOSED','ACCEPTED','REJECTED','SUPERSEDED')),
  review_ref text null,
  reviewer_worker_code text null,
  evidence_refs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_refs) = 'array'),
  provenance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  reviewed_at timestamptz null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (skill_id, finding_key)
);

create index if not exists forge_deep_skill_findings_skill_perspective_idx
  on public.forge_deep_skill_findings(skill_id, perspective, disposition);

create index if not exists forge_deep_skill_findings_job_idx
  on public.forge_deep_skill_findings(project_id, job_key)
  where job_key is not null;

create or replace function public.forge_deep_skill_record_finding(
  p_skill_id text,
  p_perspective text,
  p_finding_key text,
  p_finding_text text,
  p_context jsonb,
  p_evidence_refs jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_context jsonb := coalesce(p_context,'{}'::jsonb);
  v_evidence jsonb := coalesce(p_evidence_refs,'[]'::jsonb);
  v_row public.forge_deep_skill_findings;
begin
  if nullif(btrim(p_skill_id),'') is null then
    return jsonb_build_object('ok',false,'state','SKILL_ID_REQUIRED');
  end if;
  if nullif(btrim(p_perspective),'') is null then
    return jsonb_build_object('ok',false,'state','PERSPECTIVE_REQUIRED');
  end if;
  if nullif(btrim(p_finding_key),'') is null then
    return jsonb_build_object('ok',false,'state','FINDING_KEY_REQUIRED');
  end if;
  if nullif(btrim(p_finding_text),'') is null then
    return jsonb_build_object('ok',false,'state','FINDING_TEXT_REQUIRED');
  end if;
  if jsonb_typeof(v_context) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_CONTEXT');
  end if;
  if jsonb_typeof(v_evidence) <> 'array' then
    return jsonb_build_object('ok',false,'state','INVALID_EVIDENCE_REFS');
  end if;

  insert into public.forge_deep_skill_findings(
    skill_id, skill_version_no, perspective, finding_key, finding_text,
    project_id, job_key, worker_code, session_id,
    evidence_refs, provenance
  ) values (
    btrim(p_skill_id),
    case when nullif(v_context->>'skill_version_no','') is null then null
         else (v_context->>'skill_version_no')::integer end,
    btrim(p_perspective),
    btrim(p_finding_key),
    p_finding_text,
    nullif(v_context->>'project_id',''),
    nullif(v_context->>'job_key',''),
    nullif(v_context->>'worker_code',''),
    case when nullif(v_context->>'session_id','') is null then null
         else (v_context->>'session_id')::uuid end,
    v_evidence,
    coalesce(v_context->'provenance','{}'::jsonb)
  )
  on conflict (skill_id, finding_key) do update
  set perspective = excluded.perspective,
      finding_text = excluded.finding_text,
      skill_version_no = coalesce(excluded.skill_version_no, public.forge_deep_skill_findings.skill_version_no),
      project_id = coalesce(excluded.project_id, public.forge_deep_skill_findings.project_id),
      job_key = coalesce(excluded.job_key, public.forge_deep_skill_findings.job_key),
      worker_code = coalesce(excluded.worker_code, public.forge_deep_skill_findings.worker_code),
      session_id = coalesce(excluded.session_id, public.forge_deep_skill_findings.session_id),
      evidence_refs = case
        when jsonb_array_length(excluded.evidence_refs) > 0 then excluded.evidence_refs
        else public.forge_deep_skill_findings.evidence_refs end,
      provenance = public.forge_deep_skill_findings.provenance || excluded.provenance,
      updated_at = clock_timestamp()
  returning * into v_row;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_FINDING_RECORDED',
    'finding_id',v_row.finding_id,
    'skill_id',v_row.skill_id,
    'perspective',v_row.perspective,
    'finding_key',v_row.finding_key,
    'disposition',v_row.disposition
  );
exception
  when invalid_text_representation then
    return jsonb_build_object('ok',false,'state','INVALID_CONTEXT_IDENTIFIER');
end;
$$;

create or replace function public.forge_deep_skill_review_finding(
  p_finding_id uuid,
  p_disposition text,
  p_review_ref text,
  p_reviewer_worker_code text,
  p_evidence_refs jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_disposition text := upper(coalesce(btrim(p_disposition),''));
  v_evidence jsonb := coalesce(p_evidence_refs,'[]'::jsonb);
  v_row public.forge_deep_skill_findings;
begin
  if v_disposition not in ('ACCEPTED','REJECTED','SUPERSEDED') then
    return jsonb_build_object('ok',false,'state','INVALID_REVIEW_DISPOSITION');
  end if;
  if nullif(btrim(p_review_ref),'') is null then
    return jsonb_build_object('ok',false,'state','REVIEW_REF_REQUIRED');
  end if;
  if jsonb_typeof(v_evidence) <> 'array' or jsonb_array_length(v_evidence)=0 then
    return jsonb_build_object('ok',false,'state','REVIEW_EVIDENCE_REQUIRED');
  end if;

  update public.forge_deep_skill_findings
  set disposition = v_disposition,
      review_ref = btrim(p_review_ref),
      reviewer_worker_code = nullif(btrim(p_reviewer_worker_code),''),
      evidence_refs = evidence_refs || v_evidence,
      reviewed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where finding_id = p_finding_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok',false,'state','FINDING_NOT_FOUND');
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_FINDING_REVIEWED',
    'finding_id',v_row.finding_id,
    'skill_id',v_row.skill_id,
    'perspective',v_row.perspective,
    'disposition',v_row.disposition,
    'review_ref',v_row.review_ref
  );
end;
$$;

create or replace view public.forge_deep_skill_perspective_utility as
select
  skill_id,
  skill_version_no,
  perspective,
  count(*)::bigint as total_findings,
  count(*) filter (where disposition='ACCEPTED')::bigint as accepted_findings,
  count(*) filter (where disposition='REJECTED')::bigint as rejected_findings,
  count(*) filter (where disposition='PROPOSED')::bigint as pending_findings,
  count(*) filter (where disposition='SUPERSEDED')::bigint as superseded_findings,
  count(distinct job_key) filter (where job_key is not null)::bigint as jobs_observed,
  round(
    (count(*) filter (where disposition='ACCEPTED'))::numeric
    / nullif((count(*) filter (where disposition in ('ACCEPTED','REJECTED')))::numeric,0),
    4
  ) as acceptance_rate,
  min(created_at) as first_seen_at,
  max(updated_at) as last_seen_at
from public.forge_deep_skill_findings
group by skill_id, skill_version_no, perspective;

create or replace function public.forge_deep_skill_utility(
  p_skill_id text
) returns jsonb
language sql
stable
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_UTILITY',
    'skill_id',p_skill_id,
    'perspectives',coalesce(
      jsonb_agg(
        jsonb_build_object(
          'perspective',u.perspective,
          'skill_version_no',u.skill_version_no,
          'total_findings',u.total_findings,
          'accepted_findings',u.accepted_findings,
          'rejected_findings',u.rejected_findings,
          'pending_findings',u.pending_findings,
          'superseded_findings',u.superseded_findings,
          'jobs_observed',u.jobs_observed,
          'acceptance_rate',u.acceptance_rate,
          'first_seen_at',u.first_seen_at,
          'last_seen_at',u.last_seen_at
        )
        order by u.accepted_findings desc, u.total_findings desc, u.perspective
      ),
      '[]'::jsonb
    )
  )
  from public.forge_deep_skill_perspective_utility u
  where u.skill_id = p_skill_id;
$$;

create or replace function public.forge_deep_skill_utility_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_prefix text := '__BACKLOG224_SMOKE__' || replace(gen_random_uuid()::text,'-','');
  v_skill text := v_prefix || '_SKILL';
  v_a jsonb;
  v_b jsonb;
  v_review jsonb;
  v_summary jsonb;
  v_a_id uuid;
  v_b_id uuid;
  v_accepted bigint;
  v_rejected bigint;
begin
  v_a := public.forge_deep_skill_record_finding(
    v_skill,'IT',v_prefix || '_A','Detect durable coupling.',
    jsonb_build_object('project_id','SMOKE','job_key',v_prefix || '_JOB','worker_code','SMOKE'),
    jsonb_build_array('smoke://source/a')
  );
  v_b := public.forge_deep_skill_record_finding(
    v_skill,'UX',v_prefix || '_B','Detect operator ambiguity.',
    jsonb_build_object('project_id','SMOKE','job_key',v_prefix || '_JOB','worker_code','SMOKE'),
    jsonb_build_array('smoke://source/b')
  );
  v_a_id := (v_a->>'finding_id')::uuid;
  v_b_id := (v_b->>'finding_id')::uuid;

  v_review := public.forge_deep_skill_review_finding(
    v_a_id,'ACCEPTED','smoke://review/accepted','SMOKE',jsonb_build_array('smoke://evidence/accepted')
  );
  perform public.forge_deep_skill_review_finding(
    v_b_id,'REJECTED','smoke://review/rejected','SMOKE',jsonb_build_array('smoke://evidence/rejected')
  );

  select
    coalesce(sum(accepted_findings),0),
    coalesce(sum(rejected_findings),0)
  into v_accepted,v_rejected
  from public.forge_deep_skill_perspective_utility
  where skill_id=v_skill;

  v_summary := public.forge_deep_skill_utility(v_skill);

  if v_review->>'state' <> 'DEEP_SKILL_FINDING_REVIEWED'
     or v_accepted <> 1
     or v_rejected <> 1
     or v_summary->>'state' <> 'DEEP_SKILL_UTILITY'
     or jsonb_array_length(v_summary->'perspectives') <> 2
  then
    raise exception 'BACKLOG-224 smoke failed: %, %, %, %', v_review, v_accepted, v_rejected, v_summary;
  end if;

  delete from public.forge_deep_skill_findings where skill_id=v_skill;

  return jsonb_build_object(
    'ok',true,
    'state','DEEP_SKILL_UTILITY_SMOKE_OK',
    'record_finding','PASS',
    'review_finding','PASS',
    'accepted_aggregation','PASS',
    'rejected_aggregation','PASS',
    'perspective_breakdown','PASS',
    'test_rows_removed',true
  );
end;
$$;

select public.forge_deep_skill_utility_smoke_test();
