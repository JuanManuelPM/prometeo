import fs from 'node:fs';
import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../recovery-policies/portfolio-exclusive-job-pin-live-canary-v1.json', import.meta.url), 'utf8'));

const feed = {
  generated_at: '2026-09-18T01:37:19Z',
  source_sha: 'fixture',
  projects: [{
    project_id: 'prometeo-autonomous-growth',
    label: 'Prometeo autonomous growth',
    jobs: [
      {
        job_id: 'portfolio-exclusive-job-pin-live-canary-v1',
        dedupe_key: 'portfolio:exclusive-job-pin:live-canary:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'Run live 2/5-worker portfolio pin contention canary',
        priority: 120,
        state: 'replaceable',
        pin_generation: 6,
        last_signal_at: '2026-09-18T01:19:57Z',
        latest_return: {
          outcome: 'ROUTE_ABORTED',
          returned_at: '2026-09-18T01:19:57Z',
          next_action: 'REENTER_ALLOCATION'
        }
      },
      {
        job_id: 'ordinary-retry-safe',
        dedupe_key: 'ordinary:retry-safe:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'Ordinary retry',
        priority: 10,
        state: 'replaceable',
        pin_generation: 2,
        last_signal_at: '2026-09-18T01:00:00Z'
      }
    ]
  }],
  plans: [],
  summary: { workers: {} },
  diagnostics: {}
};

const out = buildFastAllocator(feed, { status: 'OK', metrics: {}, reasons: [] }, { recoveryPolicies: [policy] });

if (out.recovery.some(row => row.job_id === policy.job_id)) throw new Error('delegated parent canary leaked into ordinary recovery');
if (out.ready.some(row => row.job_id === policy.job_id)) throw new Error('delegated parent canary leaked into ready');

const attention = out.fixed_generation_attention.find(row => row.job_id === policy.job_id);
if (!attention) throw new Error('delegated parent canary disappeared instead of remaining visible as directed attention');
if (attention.fixed_generation !== 6) throw new Error('parent canary fixed generation changed');
if (attention.route !== 'SUCCESSOR_OWNS_RESIDUAL_FANIN') throw new Error('parent canary attention route changed');
if (attention.ordinary_next_generation_eligible !== false) throw new Error('parent canary ordinary recovery reopened');

const ordinary = out.recovery.find(row => row.job_id === 'ordinary-retry-safe');
if (!ordinary || ordinary.next_generation !== 3) throw new Error('unrelated ordinary recovery was disturbed');

console.log(JSON.stringify({
  ok: true,
  parent_recovery_suppressed: true,
  successor_attention_preserved: true,
  fixed_generation: attention.fixed_generation,
  attention_route: attention.route,
  unrelated_recovery_preserved: true
}, null, 2));
