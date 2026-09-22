create table if not exists public.forge_skill_regression_cases (
  case_id uuid primary key default gen_random_uuid(),
  skill_id text not null references public.forge_skills(skill_id) on update cascade on delete restrict,
  source_kind text not null check (source_kind in ('JOB_OUTPUT','INCIDENT','MANUAL_FIXTURE','MIGRATED_HISTORY')),
  source_ref text not null check (length(btrim(source_ref)) > 0),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  fixture jsonb not null check (jsonb_typeof(fixture) = 'object'),
  preconditions jsonb not null default '{}'::jsonb check (jsonb_typeof(preconditions) = 'object'),
  hard_invariants jsonb not null default '[]'::jsonb check (jsonb_typeof(hard_invariants) = 'array'),
  soft_metrics jsonb not null default '[]'::jsonb check (jsonb_typeof(soft_metrics) = 'array'),
  oracle_type text not null check (oracle_type in ('DETERMINISTIC','RECEIPT_MATCH','HUMAN_ACCEPTED','COMPOSITE')),
  expected_receipts jsonb not null default '[]'::jsonb check (jsonb_typeof(expected_receipts) = 'array'),
  setup_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(setup_contract) = 'object'),
  teardown_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(teardown_contract) = 'object'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','QUARANTINED','RETIRED')),
  created_from_version_no integer not null,
  last_verified_version_no integer,
  last_verified_at timestamptz,
  dedupe_key text not null check (length(btrim(dedupe_key)) > 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forge_skill_regression_cases_created_version_fk
    foreign key (skill_id, created_from_version_no)
    references public.forge_skill_versions(skill_id, version_no)
    on update cascade on delete restrict,
  constraint forge_skill_regression_cases_last_verified_version_fk
    foreign key (skill_id, last_verified_version_no)
    references public.forge_skill_versions(skill_id, version_no)
    on update cascade on delete restrict
);

create unique index if not exists forge_skill_regression_cases_active_dedupe_uq
  on public.forge_skill_regression_cases(skill_id, dedupe_key)
  where status in ('ACTIVE','QUARANTINED');

create index if not exists forge_skill_regression_cases_skill_status_idx
  on public.forge_skill_regression_cases(skill_id, status, created_at desc);

create table if not exists public.forge_skill_regression_runs (
  run_id uuid primary key default gen_random_uuid(),
  skill_id text not null references public.forge_skills(skill_id) on update cascade on delete restrict,
  candidate_version integer not null,
  baseline_version integer not null,
  selected_cases jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_cases) = 'array'),
  case_outcomes jsonb not null default '[]'::jsonb check (jsonb_typeof(case_outcomes) = 'array'),
  receipts jsonb not null default '[]'::jsonb check (jsonb_typeof(receipts) = 'array'),
  hard_invariant_violations jsonb not null default '[]'::jsonb check (jsonb_typeof(hard_invariant_violations) = 'array'),
  soft_metric_deltas jsonb not null default '{}'::jsonb check (jsonb_typeof(soft_metric_deltas) = 'object'),
  worker_provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(worker_provenance) = 'object'),
  conclusion text not null check (conclusion in ('PROMOTION_ELIGIBLE','PROMOTION_BLOCKED','INCONCLUSIVE')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint forge_skill_regression_runs_candidate_fk
    foreign key (skill_id, candidate_version)
    references public.forge_skill_versions(skill_id, version_no)
    on update cascade on delete restrict,
  constraint forge_skill_regression_runs_baseline_fk
    foreign key (skill_id, baseline_version)
    references public.forge_skill_versions(skill_id, version_no)
    on update cascade on delete restrict
);

create index if not exists forge_skill_regression_runs_versions_idx
  on public.forge_skill_regression_runs(skill_id, candidate_version, baseline_version, created_at desc);

comment on table public.forge_skill_regression_cases is
  'BACKLOG-205 Phase A durable SkillRegressionCase persistence. Additive and independently reversible by dropping regression runs first, then cases.';
comment on table public.forge_skill_regression_runs is
  'BACKLOG-205 Phase A durable SkillRegressionRun persistence only; no runner or automatic promotion semantics.';
