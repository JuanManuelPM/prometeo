#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

const payload = (id, project='fixture-project') => ({
  schema:'prometeo.portfolio-pin/v1',
  pin_id:`pin-${id}-G000001-<worker_id>`,
  job_id:id,
  dedupe_key:`fixture:${id}:v1`,
  project_id:project,
  generation:1,
  worker_id:'<worker_id>',
  claim_id:`claim-${id}-G000001-<worker_id>`,
  claimed_at:'<now_iso>',
  expires_at:'<now_plus_10m_iso>',
  source_head:'fixture-source-head',
  predecessor_pin_ref_or_null:null,
  predecessor_claim_ref_or_null:null,
  recovery_basis_or_null:null
});

const generic = Array.from({length:12}, (_, i) => ({
  job_id:`generic-${i}`,
  project_id:'fixture-project',
  source_path:`coordination/portfolio/derived/fixture-project/generic-${i}.json`,
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:`coordination/portfolio/pins/generic-${i}/G000001.json`,
  claim_payload_shape:payload(`generic-${i}`),
  required_capabilities:[]
}));

const browser = {
  job_id:'browser-specialized',
  project_id:'fixture-project',
  source_path:'coordination/portfolio/derived/fixture-project/browser-specialized.json',
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:'coordination/portfolio/pins/browser-specialized/G000001.json',
  claim_payload_shape:payload('browser-specialized'),
  required_capabilities:['representative_javascript_browser']
};

const http = {
  job_id:'http-specialized',
  project_id:'fixture-project',
  source_path:'coordination/portfolio/derived/fixture-project/http-specialized.json',
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:'coordination/portfolio/pins/http-specialized/G000001.json',
  claim_payload_shape:payload('http-specialized'),
  required_capabilities:['unrestricted_public_http_origin_fetch']
};

const heavyRole = {
  role_id:'guide-rescate-heavy',
  guide_work_id:'guide-rescate-heavy',
  role:'GUIDE_RESCATE',
  trigger:'LOW_YIELD',
  title:'Heavy rescate first choice',
  mission:'Preserve allocator first choice while ensuring pooled generic workers retain enough distinct atomic claim paths to exhaust their bounded attempt budget honestly.',
  claim_mode:'GUIDE_ROLE_PIN_CREATE',
  claim_path:'coordination/guide/pins/guide-rescate-heavy/G000001.json',
  claim_payload_shape:{
    schema:'prometeo.guide-role-pin/v1',
    pin_id:'pin-guide-rescate-heavy-G000001-<worker_id>',
    guide_work_id:'guide-rescate-heavy',
    role:'GUIDE_RESCATE',
    trigger:'LOW_YIELD',
    scope_project_id:null,
    state_ref:null,
    state_revision:null,
    generation:1,
    worker_id:'<worker_id>',
    claim_id:'claim-guide-rescate-heavy-G000001-<worker_id>',
    claimed_at:'<now_iso>',
    expires_at:'<now_plus_10m_iso>',
    source_head:'fixture-source-head',
    evidence:Array.from({length:12}, (_, i) => `coordination/portfolio/pins/heavy-evidence-${i}/G000001.json`),
    predecessor_pin_ref_or_null:null
  },
  required_capabilities:[]
};

const allocator = {
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-10-01T22:35:30.802Z',
  source_sha:'generic-collision-runway-fixture',
  batch_strategy:'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  ready:[browser,http,...generic],
  queue_ready:[],
  role_ready:[heavyRole],
  recovery:[],
  recovery_attention:Array.from({length:6}, (_, i) => ({
    job_id:`attention-${i}`,
    reason:'REPLACEABLE',
    source_path:`coordination/portfolio/derived/fixture-project/attention-${i}.json`
  })),
  batch_candidates:[
    {lane:'role_ready', ...heavyRole},
    {lane:'ready', ...browser},
    {lane:'ready', ...http},
    ...generic.map(row => ({lane:'ready', ...row}))
  ]
};

const frontier = buildClaimFrontier(allocator, 24, 14_000);
const bytes = Buffer.byteLength(JSON.stringify(frontier), 'utf8');
const genericVisible = frontier.candidates.filter(row => (row.required_capabilities || []).length === 0);

assert.equal(frontier.candidates[0].claim_path, heavyRole.claim_path, 'allocator first choice must remain first');
assert.equal(
  frontier.candidates.slice(0, 4).every(row => (row.required_capabilities || []).length === 0),
  true,
  'first four transport-visible paths must form a no-special-capability runway when enough generic work exists'
);
assert(genericVisible.length >= 4, 'generic worker must see enough distinct atomic paths to spend the four-attempt claim budget');
assert(frontier.candidates.some(row => row.job_id === 'browser-specialized'), 'browser capability exemplar must survive the generic runway');
assert(frontier.candidates.some(row => row.job_id === 'http-specialized'), 'HTTP capability exemplar must survive the generic runway');
assert(bytes <= 14_000, `compact frontier exceeded transport ceiling: ${bytes}`);

for (const candidate of frontier.candidates.filter(row => row.job_id)) {
  const source = [browser,http,...generic].find(row => row.claim_path === candidate.claim_path);
  assert.ok(source, `fixture source missing for ${candidate.claim_path}`);
  assert.deepEqual(candidate.claim_payload_shape, source.claim_payload_shape, 'transport ordering must not mutate immutable claim authority payloads');
}

console.log('CLAIM_FRONTIER_GENERIC_RUNWAY_PASS', JSON.stringify({
  candidate_visible:frontier.candidate_count,
  generic_visible:genericVisible.length,
  transport_bytes:bytes,
  browser_exemplar:true,
  http_exemplar:true
}));
