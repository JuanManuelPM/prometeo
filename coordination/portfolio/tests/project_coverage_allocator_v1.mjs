#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyProjectCoverage } from '../../../scripts/apply-project-coverage.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'prometeo-project-coverage-'));
for (const rel of ['coordination/guide/pins','coordination/guide/receipts','coordination/workers/heartbeats']) mkdirSync(path.join(root, rel), { recursive:true });

const feed = {
  source_sha:'fixture-sha',
  projects:[
    {project_id:'alpha',label:'Alpha',status:'ACTIVE',priority:100,jobs:[{job_id:'a1',state:'done',priority:100,terminal_return:{returned_at:'2026-09-17T18:00:00Z'}}]},
    {project_id:'beta',label:'Beta',status:'DISCOVERY',priority:80,jobs:[{job_id:'b1',state:'replaceable',priority:80,last_signal_at:'2026-09-17T17:00:00Z'}]},
    {project_id:'gamma',label:'Gamma',status:'ACTIVE',priority:70,jobs:[{job_id:'g1',state:'ready',priority:70}]},
    {project_id:'delta',label:'Delta',status:'ACTIVE',priority:60,jobs:[{job_id:'d1',state:'working',priority:60,last_signal_at:new Date().toISOString()}]},
    {project_id:'epsilon',label:'Epsilon',status:'ACTIVE',priority:50,jobs:[{job_id:'e1',state:'done',priority:50}]}
  ]
};

const allocator = {
  source_sha:'fixture-sha',
  counts:{ready:1,queue_ready:0,role_ready:0,recovery:1},
  ready:[{job_id:'g1',project_id:'gamma',priority:70}],
  queue_ready:[],
  role_ready:[],
  recovery:[{job_id:'b1',project_id:'beta'}],
  metabolism:{target_claimable:8},
  diagnostics:{}
};

const out = applyProjectCoverage(structuredClone(allocator), feed, root);
const projects = new Set(out.role_ready.map(x=>x.project_id));
assert(projects.has('alpha'), 'completed-but-active project should get a coverage planner');
assert(projects.has('beta'), 'replaceable-only project should get a clean coverage planner');
assert(projects.has('epsilon'), 'idle active project should get a coverage planner');
assert(!projects.has('gamma'), 'project with clean ready work must not get duplicate coverage planner');
assert(!projects.has('delta'), 'project with active execution must not get duplicate coverage planner');
assert.equal(out.coverage.added_count, 3);
for (const item of out.role_ready) {
  assert.equal(item.trigger, 'PROJECT_COVERAGE_GAP');
  assert.equal(item.claim_mode, 'GUIDE_ROLE_PIN_CREATE');
  assert.match(item.claim_path, /^coordination\/guide\/pins\/guide-planner-project-/);
  assert.equal(item.claim_payload_shape.schema, 'prometeo.guide-role-pin/v1');
  assert.equal(item.claim_payload_shape.project_id, item.project_id);
}

const alpha = out.role_ready.find(x=>x.project_id==='alpha');
mkdirSync(path.join(root, path.dirname(alpha.claim_path)), { recursive:true });
writeFileSync(path.join(root, alpha.claim_path), JSON.stringify({
  ...alpha.claim_payload_shape,
  worker_id:'worker-alpha',
  claimed_at:new Date().toISOString(),
  generation:1
}));
const out2 = applyProjectCoverage(structuredClone(allocator), feed, root);
assert(!out2.role_ready.some(x=>x.project_id==='alpha'), 'fresh active project coverage pin must suppress another planner for same project');
assert(out2.role_ready.some(x=>x.project_id==='beta'), 'other projects must remain claimable while one project planner is active');

console.log('PROJECT_COVERAGE_ALLOCATOR_PASS');
