import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const fixedPolicy = {
  schema: 'prometeo.portfolio-recovery-policy/v1',
  job_id: 'fixture-arbitrary-id',
  mode: 'fixed_generation',
  fixed_generation: 1,
  ordinary_next_generation_eligible: false,
  attention_route: 'FIXED_GENERATION_RECONCILE',
  reason: 'test fixture is generation-fixed'
};

const feed = {
  generated_at: '2026-09-17T21:20:00Z',
  source_sha: 'abc123',
  projects: [{
    project_id: 'p',
    label: 'P',
    jobs: [
      {
        job_id: 'fixture-arbitrary-id',
        dedupe_key: 'fixture:arbitrary:v1',
        project_id: 'p',
        title: 'Fixed fixture',
        priority: 200,
        state: 'replaceable',
        pin_generation: 1,
        collision_count: 2,
        last_signal_at: '2026-09-17T20:00:00Z'
      },
      {
        job_id: 'ordinary-retry-safe',
        dedupe_key: 'ordinary:retry-safe:v1',
        project_id: 'p',
        title: 'Ordinary retry',
        priority: 100,
        state: 'replaceable',
        pin_generation: 1,
        last_signal_at: '2026-09-17T20:00:00Z'
      },
      {
        job_id: 'fixture-fresh',
        dedupe_key: 'fixture:fresh:v1',
        project_id: 'p',
        title: 'Fresh fixed fixture',
        priority: 90,
        state: 'ready',
        pin_generation: 0
      }
    ]
  }],
  plans: [],
  summary: { workers: {} },
  diagnostics: {}
};

const freshPolicy = { ...fixedPolicy, job_id: 'fixture-fresh' };
const out = buildFastAllocator(feed, { status: 'OK', metrics: {}, reasons: [] }, { recoveryPolicies: [fixedPolicy, freshPolicy] });

if (out.recovery.some(row => row.job_id === 'fixture-arbitrary-id')) throw new Error('fixed-generation fixture leaked into ordinary recovery');
const ordinary = out.recovery.find(row => row.job_id === 'ordinary-retry-safe');
if (!ordinary) throw new Error('ordinary retry-safe job disappeared from recovery');
if (ordinary.next_generation !== 2 || !ordinary.claim_path.endsWith('/G000002.json')) throw new Error('ordinary recovery generation changed');

const attention = out.fixed_generation_attention.find(row => row.job_id === 'fixture-arbitrary-id');
if (!attention) throw new Error('unfinished fixed-generation evidence became invisible');
if (attention.route !== 'FIXED_GENERATION_RECONCILE' || attention.fixed_generation !== 1) throw new Error('fixed-generation attention route malformed');

const fresh = out.ready.find(row => row.job_id === 'fixture-fresh');
if (!fresh) throw new Error('fresh fixed-generation fixture should remain initially claimable');
if (fresh.next_generation !== 1 || !fresh.claim_path.endsWith('/G000001.json')) throw new Error('fresh fixed-generation fixture did not target its fixed generation');
if (fresh.recovery_semantics.ordinary_next_generation_eligible !== false) throw new Error('fixed-generation semantic lost');

if (out.schema !== 'prometeo.fast-allocator/v2') throw new Error(`unexpected allocator schema ${out.schema}`);
console.log(JSON.stringify({
  ok: true,
  fixed_generation_excluded_from_recovery: true,
  fixed_generation_attention_visible: true,
  ordinary_recovery_preserved: true,
  fresh_fixed_generation_claim_preserved: true
}, null, 2));
