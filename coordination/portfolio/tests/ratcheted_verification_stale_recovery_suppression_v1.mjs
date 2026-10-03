import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const staleReturnG8 = {
  path: 'coordination/portfolio/returns/portfolio-eff034-live-stale-collision-refresh-observation-v1/RETURN-wc-20261003T012733Z-551ea60c5de2-G000008-STALE-HINT-ABORT.json',
  outcome: 'BOUNDARY',
  boundary_code: 'STALE_ALLOCATOR_HINT_ALREADY_RATCHETED',
  returned_at: '2026-10-03T01:30:09Z'
};
const staleReturnG9 = {
  path: 'coordination/portfolio/returns/portfolio-eff034-live-stale-collision-refresh-observation-v1/RETURN-wc-20261003T012743Z-8b0925195081-G000009-STALE-HINT-ABORT.json',
  outcome: 'BOUNDARY',
  boundary_code: 'STALE_ALLOCATOR_HINT_ALREADY_RATCHETED',
  returned_at: '2026-10-03T01:43:25Z'
};

const feed = {
  generated_at: '2026-10-03T04:49:00Z',
  source_sha: 'fixture-ratcheted-verification-recovery-v1',
  projects: [{
    project_id: 'prometeo-autonomous-growth',
    label: 'Prometeo autonomous growth',
    jobs: [
      {
        job_id: 'fixture-ratcheted-verification-debt',
        dedupe_key: 'fixture:ratcheted-verification:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'EFF034 runtime observation debt',
        kind: 'verification',
        priority: 202,
        state: 'replaceable',
        pin_generation: 9,
        last_signal_at: staleReturnG9.returned_at,
        recent_return_evidence: [staleReturnG8, staleReturnG9],
        evidence: ['coordination/efficiency/RATCHET_BASELINE_V1.json#EFF034']
      },
      {
        job_id: 'fixture-fresh-reverification',
        dedupe_key: 'fixture:fresh-reverification:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'Explicit fresh reverification despite historical ratchet',
        kind: 'verification',
        priority: 180,
        state: 'ready',
        pin_generation: 0,
        evidence: ['coordination/efficiency/RATCHET_BASELINE_V1.json#EFF034']
      },
      {
        job_id: 'fixture-pending-verification-debt',
        dedupe_key: 'fixture:pending-verification:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'Still pending verification debt',
        kind: 'verification',
        priority: 150,
        state: 'replaceable',
        pin_generation: 2,
        evidence: ['coordination/efficiency/RATCHET_BASELINE_V1.json#EFF999']
      },
      {
        job_id: 'ordinary-retry-safe',
        dedupe_key: 'ordinary:retry-safe:ratchet-control:v1',
        project_id: 'prometeo-autonomous-growth',
        title: 'Ordinary retry-safe implementation',
        kind: 'implementation',
        priority: 100,
        state: 'replaceable',
        pin_generation: 4,
        last_signal_at: '2026-10-03T01:40:00Z'
      }
    ]
  }],
  plans: [],
  summary: { workers: {} },
  diagnostics: {}
};

const ratchetBaseline = {
  schema: 'prometeo.efficiency-ratchet/v1',
  status: 'CANARY_BINDING',
  updated_at: '2026-09-30T01:59:30Z',
  items: [
    {
      id: 'EFF034',
      status: 'RATCHETED',
      runtime_evidence: {
        status: 'OBSERVED',
        observed_at: '2026-09-30T01:05:25Z'
      }
    },
    {
      id: 'EFF999',
      status: 'STATIC_GUARDED_PENDING_RUNTIME',
      runtime_evidence: { status: 'PENDING' }
    }
  ]
};

const out = buildFastAllocator(feed, { status: 'OK', metrics: {}, reasons: [] }, { ratchetBaseline, recoveryPolicies: [] });

if (out.recovery.some(row => row.job_id === 'fixture-ratcheted-verification-debt')) throw new Error('canonically ratcheted verification debt resurfaced as ordinary recovery');
if (out.ready.some(row => row.job_id === 'fixture-ratcheted-verification-debt')) throw new Error('canonically ratcheted replaceable debt resurfaced as ready work');

const suppression = out.ratcheted_verification_recovery_gate?.decisions?.find(row => row.job_id === 'fixture-ratcheted-verification-debt');
if (!suppression?.suppressed) throw new Error('ratcheted verification suppression decision missing');
if (suppression.ratchet_id !== 'EFF034' || suppression.runtime_evidence_status !== 'OBSERVED') throw new Error('ratchet suppression did not bind to canonical EFF034 observed evidence');

const fresh = out.ready.find(row => row.job_id === 'fixture-fresh-reverification');
if (!fresh) throw new Error('fresh ready reverification was incorrectly suppressed by historical ratchet');
if (fresh.next_generation !== 1 || !fresh.claim_path.endsWith('/G000001.json')) throw new Error('fresh ready reverification generation changed');

const pending = out.recovery.find(row => row.job_id === 'fixture-pending-verification-debt');
if (!pending) throw new Error('unsatisfied verification debt was incorrectly suppressed');
if (pending.next_generation !== 3 || !pending.claim_path.endsWith('/G000003.json')) throw new Error('pending verification recovery generation changed');

const ordinary = out.recovery.find(row => row.job_id === 'ordinary-retry-safe');
if (!ordinary) throw new Error('ordinary retry-safe recovery disappeared');
if (ordinary.next_generation !== 5 || !ordinary.claim_path.endsWith('/G000005.json')) throw new Error('ordinary retry-safe generation changed');

if (out.ratcheted_verification_recovery_gate.suppressed !== 1) throw new Error('unexpected ratcheted suppression count');
if (!/^prometeo\.fast-allocator\/v\d+$/.test(out.schema)) throw new Error(`unexpected allocator schema ${out.schema}`);

console.log(JSON.stringify({
  ok: true,
  fixture_returns: [staleReturnG8.path, staleReturnG9.path],
  ratchet: 'EFF034',
  ratcheted_replaceable_verification_suppressed: true,
  fresh_ready_reverification_preserved: true,
  pending_verification_preserved: true,
  ordinary_retry_safe_preserved: true,
  ordinary_next_generation: ordinary.next_generation
}, null, 2));
