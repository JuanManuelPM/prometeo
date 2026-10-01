#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

const portfolioPayload = i => ({
  schema:'prometeo.portfolio-pin/v1',
  pin_id:`pin-job-${i}-<worker_id>`,
  job_id:`job-${i}`,
  dedupe_key:`fixture:generic-frontier:${i}:v1`,
  project_id:'fixture-project',
  generation:1,
  worker_id:'<worker_id>',
  claim_id:`claim-job-${i}-<worker_id>`,
  claimed_at:'<now_iso>',
  expires_at:'<now_plus_10m_iso>',
  source_head:'fixture-source-head',
  predecessor_pin_ref_or_null:null,
  predecessor_claim_ref_or_null:null,
  recovery_basis_or_null:null
});

const ready = Array.from({length:20}, (_, i) => ({
  job_id:`job-${i}`,
  project_id:'fixture-project',
  source_path:`coordination/portfolio/derived/fixture-project/job-${i}.json`,
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:`coordination/portfolio/pins/job-${i}/G000001.json`,
  claim_payload_shape:portfolioPayload(i),
  required_capabilities:[]
}));

const guideRole = i => ({
  role_id:`guide-rescate-${i}`,
  guide_work_id:`guide-rescate-${i}`,
  role:'GUIDE_RESCATE',
  trigger:'LOW_YIELD',
  title:`Elastic role ${i}`,
  mission:'Diagnose an evidence-backed common bottleneck and materialize grounded work.',
  claim_mode:'GUIDE_ROLE_PIN_CREATE',
  claim_path:`coordination/guide/pins/guide-rescate-${i}/G000001.json`,
  claim_payload_shape:{
    schema:'prometeo.guide-role-pin/v1',
    pin_id:`pin-guide-rescate-${i}-G000001-<worker_id>`,
    guide_work_id:`guide-rescate-${i}`,
    role:'GUIDE_RESCATE',
    trigger:'LOW_YIELD',
    scope_project_id:null,
    state_ref:null,
    state_revision:null,
    generation:1,
    worker_id:'<worker_id>',
    claim_id:`claim-guide-rescate-${i}-G000001-<worker_id>`,
    claimed_at:'<now_iso>',
    expires_at:'<now_plus_10m_iso>',
    source_head:'fixture-source-head',
    evidence:Array.from({length:12}, (_, j) => `coordination/portfolio/returns/fixture-heavy-evidence-${i}-${j}.json`),
    predecessor_pin_ref_or_null:null
  },
  required_capabilities:[]
});

const roles = [guideRole(0), guideRole(1), guideRole(2)];
const specialized = {
  ...ready[19],
  job_id:'browser-verification',
  claim_path:'coordination/portfolio/pins/browser-verification/G000001.json',
  claim_payload_shape:{
    ...portfolioPayload(99),
    job_id:'browser-verification',
    pin_id:'pin-browser-verification-G000001-<worker_id>',
    claim_id:'claim-browser-verification-G000001-<worker_id>'
  },
  required_capabilities:['representative_javascript_browser']
};

const recoveryAttention = Array.from({length:8}, (_, i) => ({
  job_id:`blocked-${i}`,
  reason:'SOURCE_DEBT_BASIS_UNCHANGED',
  source_path:`coordination/portfolio/derived/blocked/blocked-${i}.json`,
  source_debt:{
    dependency_job_id:`dependency-${i}`,
    dependency_return_ref:`coordination/portfolio/returns/blocked/very-long-return-${i}.json`
  }
}));

const allocator = {
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-10-01T21:16:11Z',
  source_sha:'generic-frontier-elasticity-fixture',
  batch_strategy:'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  ready:[...ready, specialized],
  queue_ready:[],
  role_ready:roles,
  recovery:[],
  recovery_attention:recoveryAttention,
  batch_candidates:[
    {lane:'role_ready', ...roles[0]},
    {lane:'ready', ...ready[0]},
    {lane:'role_ready', ...roles[1]},
    {lane:'ready', ...specialized},
    ...ready.slice(1, 20).map(row => ({lane:'ready', ...row})),
    {lane:'role_ready', ...roles[2]}
  ]
};

const frontier = buildClaimFrontier(allocator, 24, 14_000);
const genericVisible = frontier.candidates.filter(row => (row.required_capabilities || []).length === 0).length;
const burst10Starvation = Math.max(0, 10 - genericVisible);
const burst20Starvation = Math.max(0, 20 - genericVisible);
const bytes = Buffer.byteLength(JSON.stringify(frontier), 'utf8');

assert.equal(frontier.candidates[0].claim_path, roles[0].claim_path, 'allocator first choice must stay first');
assert(bytes <= 14_000, `compact frontier exceeded transport ceiling: ${bytes}`);
assert.equal(frontier.recovery_attention_total, 8, 'diagnostic total cardinality must remain truthful');
assert.equal(frontier.recovery_attention.length, 2, 'verbose non-authority diagnostics must be bounded to two transport exemplars');
assert(genericVisible >= 10, `burst 10 still starved: visible generic=${genericVisible}`);
assert.equal(burst10Starvation, 0, 'ten fresh generic workers must have ten compatible claim paths in the synthetic burst');
assert(burst20Starvation > 0, 'burst 20 remaining starvation must be explicit until transport/materialization grows further');
assert(frontier.candidates.some(row => row.required_capabilities?.includes('representative_javascript_browser')), 'specialized capability exemplar must survive generic packing');

for (const candidate of frontier.candidates) {
  const source = [...roles, ...ready, specialized].find(row => row.claim_path === candidate.claim_path);
  assert.ok(source, `fixture source missing for ${candidate.claim_path}`);
  assert.deepEqual(candidate.claim_payload_shape, source.claim_payload_shape, 'transport packing must never mutate immutable claim authority payloads');
}

console.log('GENERIC_FRONTIER_ELASTICITY_PASS', JSON.stringify({
  transport_bytes:bytes,
  candidate_total:frontier.candidate_total,
  candidate_visible:frontier.candidate_count,
  generic_compatible_visible:genericVisible,
  recovery_attention_total:frontier.recovery_attention_total,
  recovery_attention_transport_sample:frontier.recovery_attention.length,
  burst_10:{starvation:burst10Starvation,status:'PASS'},
  burst_20:{starvation:burst20Starvation,status:'REMAINING_STARVATION_EXPLICIT'},
  specialized_exemplar_preserved:true
}));
