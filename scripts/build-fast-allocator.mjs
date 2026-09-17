#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const g = n => String(n).padStart(6, '0');
const arr = value => Array.isArray(value) ? value : [];
const finiteInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export function normalizeRecoveryPolicy(job = {}, policy = null) {
  const source = policy && typeof policy === 'object' ? policy : {};
  if (source.mode === 'fixed_generation') {
    const fixedGeneration = finiteInt(source.fixed_generation, 0);
    if (fixedGeneration < 1) {
      return {
        mode: 'invalid_fixed_generation',
        ordinary_next_generation_eligible: false,
        fixed_generation: null,
        attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
        valid: false,
        reason: 'FIXED_GENERATION_POLICY_REQUIRES_POSITIVE_GENERATION'
      };
    }
    return {
      mode: 'fixed_generation',
      ordinary_next_generation_eligible: false,
      fixed_generation: fixedGeneration,
      attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
      valid: true,
      reason: source.reason || 'JOB_CONTRACT_IS_GENERATION_FIXED'
    };
  }
  return {
    mode: 'next_generation_retry',
    ordinary_next_generation_eligible: true,
    fixed_generation: null,
    attention_route: null,
    valid: true,
    reason: source.reason || 'DEFAULT_RETRY_SAFE_NEXT_GENERATION'
  };
}

export function buildFastAllocator(feed = {}, efficiency = {}, { recoveryPolicies = [] } = {}) {
  const jobs = arr(feed.projects).flatMap(project => arr(project.jobs).map(job => ({ ...job, project_label: project.label })));
  const policyByJob = new Map(arr(recoveryPolicies).filter(Boolean).map(policy => [policy.job_id, policy]));
  const semantic = job => normalizeRecoveryPolicy(job, policyByJob.get(job.job_id));

  const compact = (job, targetGeneration = null) => {
    const current = finiteInt(job.pin_generation, 0);
    const recovery = semantic(job);
    const next = targetGeneration ?? current + 1;
    const predecessor = current ? `coordination/portfolio/pins/${job.job_id}/G${g(current)}.json` : null;
    return {
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      priority: job.priority || 0,
      state: job.state,
      authority_mode: job.authority_mode || null,
      pin_generation: current,
      next_generation: next,
      claim_generation_mode: recovery.mode === 'fixed_generation' ? 'FIXED' : 'NEXT',
      recovery_semantics: recovery,
      claim_mode: 'PORTFOLIO_PIN_CREATE',
      claim_path: `coordination/portfolio/pins/${job.job_id}/G${g(next)}.json`,
      claim_payload_shape: {
        schema: 'prometeo.portfolio-pin/v1',
        pin_id: `pin-${job.job_id}-G${g(next)}-<worker_id>`,
        job_id: job.job_id,
        dedupe_key: job.dedupe_key || null,
        project_id: job.project_id || null,
        generation: next,
        worker_id: '<worker_id>',
        claim_id: `claim-${job.job_id}-G${g(next)}-<worker_id>`,
        claimed_at: '<now_iso>',
        expires_at: '<now_plus_10m_iso>',
        source_head: feed.source_sha || '<allocator_source_sha>',
        predecessor_pin_ref_or_null: predecessor,
        predecessor_claim_ref_or_null: null,
        recovery_basis_or_null: current ? {
          allocator_generated_at: feed.generated_at,
          predecessor_last_signal_at: job.last_signal_at || null,
          allocator_state: job.state
        } : null
      },
      predecessor_pin_ref: predecessor,
      last_signal_at: job.last_signal_at || null,
      post_claim_validate: true
    };
  };

  const byPriority = (a, b) => (b.priority || 0) - (a.priority || 0) || String(a.job_id).localeCompare(String(b.job_id));
  const ready = jobs
    .filter(job => ['ready', 'partial'].includes(job.state))
    .filter(job => {
      const semantics = semantic(job);
      if (semantics.mode !== 'fixed_generation') return semantics.valid;
      return semantics.valid && finiteInt(job.pin_generation, 0) < semantics.fixed_generation;
    })
    .sort(byPriority)
    .map(job => {
      const semantics = semantic(job);
      return compact(job, semantics.mode === 'fixed_generation' ? semantics.fixed_generation : null);
    })
    .slice(0, 40);

  const queueReady = arr(feed.plans).flatMap(plan => arr(plan.items)
    .filter(item => item.state === 'ready')
    .map(item => ({
      opportunity_id: item.opportunity_id,
      mission: item.mission,
      priority: item.priority || 0,
      plan_id: plan.id,
      claim_mode: 'OPPORTUNITY_CLAIM_CREATE',
      claim_path: `coordination/opportunities/claims/${item.opportunity_id}.json`,
      claim_payload_shape: {
        schema: 'prometeo.opportunity-claim/v1',
        worker_id: '<worker_id>',
        opportunity_id: item.opportunity_id,
        claimed_at: '<now_iso>'
      },
      post_claim_validate: true
    })))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 30);

  const recovery = jobs
    .filter(job => job.state === 'replaceable')
    .filter(job => semantic(job).valid && semantic(job).ordinary_next_generation_eligible)
    .sort(byPriority)
    .map(job => compact(job))
    .slice(0, 30);

  const fixedGenerationAttention = jobs
    .filter(job => job.state !== 'done')
    .map(job => ({ job, semantics: semantic(job) }))
    .filter(({ job, semantics }) => semantics.mode === 'fixed_generation' && semantics.valid && finiteInt(job.pin_generation, 0) >= semantics.fixed_generation)
    .sort((a, b) => byPriority(a.job, b.job))
    .map(({ job, semantics }) => ({
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      priority: job.priority || 0,
      state: job.state,
      pin_generation: finiteInt(job.pin_generation, 0),
      fixed_generation: semantics.fixed_generation,
      collision_count: finiteInt(job.collision_count, 0),
      latest_return: job.latest_return || null,
      route: semantics.attention_route,
      reason: semantics.reason,
      ordinary_next_generation_eligible: false
    }))
    .slice(0, 30);

  const invalidRecoveryPolicies = jobs
    .map(job => ({ job_id: job.job_id, policy: semantic(job) }))
    .filter(row => !row.policy.valid);

  return {
    schema: 'prometeo.fast-allocator/v2',
    generated_at: feed.generated_at,
    source_sha: feed.source_sha || null,
    truth_boundary: 'OPTIMISTIC_ATOMIC_CREATE_THEN_POST_CLAIM_VALIDATE',
    max_recovery_snapshot_age_seconds: 90,
    preferred_order: ['ready', 'queue_ready', 'recovery'],
    counts: {
      ready: ready.length,
      queue_ready: queueReady.length,
      recovery: recovery.length,
      fixed_generation_attention: fixedGenerationAttention.length
    },
    ready,
    queue_ready: queueReady,
    recovery,
    fixed_generation_attention: fixedGenerationAttention,
    worker_projection: feed.summary?.workers || {},
    efficiency: {
      status: efficiency.status,
      metrics: efficiency.metrics,
      reasons: efficiency.reasons
    },
    diagnostics: {
      ...(feed.diagnostics || {}),
      invalid_recovery_policies: invalidRecoveryPolicies
    }
  };
}

export function loadRecoveryPolicies(root = '.') {
  const dir = path.join(root, 'coordination', 'portfolio', 'recovery-policies');
  if (!fs.existsSync(dir)) return [];
  const policies = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const file = path.join(dir, ent.name);
    try {
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (doc?.job_id) policies.push(doc);
    } catch {
      policies.push({ job_id: `INVALID:${ent.name}`, mode: 'fixed_generation', fixed_generation: 0, reason: 'INVALID_POLICY_JSON' });
    }
  }
  return policies;
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, efficiencyPath, outPath, root = '.'] = argv;
  if (!feedPath || !efficiencyPath || !outPath) {
    throw new Error('usage: build-fast-allocator.mjs <feed.json> <efficiency.json> <allocator.json> [repo-root]');
  }
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
  const recoveryPolicies = loadRecoveryPolicies(root);
  const allocator = buildFastAllocator(feed, efficiency, { recoveryPolicies });
  fs.writeFileSync(outPath, `${JSON.stringify(allocator, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
