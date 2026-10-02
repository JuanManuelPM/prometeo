#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allocateRoleAndOpportunity } from '../../../scripts/universal-cognitive-worker-lib.mjs';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

const dynamicChild = JSON.parse(fs.readFileSync(
  new URL('../derived/prometeo-autonomous-growth/portfolio-agentic-dynamic-child-subcompile-v1.json', import.meta.url),
  'utf8'
));

assert.deepEqual(
  dynamicChild.required_capabilities,
  ['repository_test_runtime'],
  'repository-test job must declare repository_test_runtime'
);

const repositoryJob = {
  opportunity_id: 'repo-test-job',
  type: 'EXECUTE',
  status: 'READY',
  priority: 100,
  required_capabilities: ['repository_test_runtime']
};
const controlJob = {
  opportunity_id: 'control-job',
  type: 'EXECUTE',
  status: 'READY',
  priority: 10,
  required_capabilities: []
};

const lacking = allocateRoleAndOpportunity({
  opportunities: [repositoryJob, controlJob],
  worker: { capabilities: [] }
});
assert.equal(lacking.selected?.opportunity_id, 'control-job', 'worker lacking repository_test_runtime must not receive repository-test job');

const onlyIncompatible = allocateRoleAndOpportunity({
  opportunities: [repositoryJob],
  worker: { capabilities: [] }
});
assert.equal(onlyIncompatible.selected, null, 'incompatible worker must receive no repository-test authority candidate');

const capable = allocateRoleAndOpportunity({
  opportunities: [repositoryJob],
  worker: { capabilities: ['repository_test_runtime'] }
});
assert.equal(capable.selected?.opportunity_id, 'repo-test-job', 'capable worker should remain eligible');

const compact = buildClaimFrontier({
  schema: 'prometeo.fast-allocator/v3',
  generated_at: '2026-10-02T00:00:00Z',
  source_sha: 'fixture',
  ready: [
    {
      job_id: 'repo-test-job',
      project_id: 'prometeo-autonomous-growth',
      required_capabilities: ['repository_test_runtime'],
      forbidden_worker_ids: [],
      claim_mode: 'PORTFOLIO_PIN_CREATE',
      claim_path: 'coordination/portfolio/pins/repo-test-job/G000001.json'
    },
    {
      job_id: 'control-job',
      project_id: 'prometeo-autonomous-growth',
      required_capabilities: [],
      forbidden_worker_ids: [],
      claim_mode: 'PORTFOLIO_PIN_CREATE',
      claim_path: 'coordination/portfolio/pins/control-job/G000001.json'
    }
  ],
  queue_ready: [],
  role_ready: [],
  recovery: [],
  batch_candidates: []
});

const repoCandidate = compact.candidates.find(row => row.job_id === 'repo-test-job');
const controlCandidate = compact.candidates.find(row => row.job_id === 'control-job');
assert.deepEqual(repoCandidate?.required_capabilities, ['repository_test_runtime'], 'compact frontier must preserve repository_test_runtime requirement');
assert.deepEqual(controlCandidate?.required_capabilities, [], 'control candidate must stay zero-capability compatible');

console.log(JSON.stringify({
  ok: true,
  test: 'repository_test_runtime_capability_gate_v1',
  cases: {
    metadata_declared: true,
    incompatible_worker_excluded: true,
    control_job_remains_compatible: true,
    capable_worker_remains_eligible: true,
    compact_frontier_preserves_requirement: true
  }
}));
