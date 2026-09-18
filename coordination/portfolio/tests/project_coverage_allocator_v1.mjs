#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyProjectCoverage } from '../../../scripts/apply-project-coverage.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'prometeo-project-coverage-'));
for (const rel of ['coordination/guide/pins','coordination/guide/receipts','coordination/workers/heartbeats','coordination/guide','coordination/project-guides/zeta','coordination/project-guides/theta']) mkdirSync(path.join(root, rel), { recursive:true });

writeFileSync(path.join(root, 'coordination/guide/PROJECT_GUIDE_MESH_V1.json'), JSON.stringify({
  source_debt_planner_gate:{enabled:true,status:'SOURCE_DEBT',require_empty_frontier_refs:true,required_blocker_prefix:'NEW_EVIDENCE_GATE:'},
  human_decision_planner_gate:{enabled:true,statuses:['VERIFIED_CANDIDATE_AWAITING_REVIEW','HUMAN_DECISION_GATE'],require_empty_frontier_refs:true,required_blocker_prefix:'HUMAN_DECISION_GATE:'}
}));
writeFileSync(path.join(root, 'coordination/project-guides/zeta/STATE.json'), JSON.stringify({
  project_id:'zeta',status:'SOURCE_DEBT',frontier_refs:[],blockers:['NEW_EVIDENCE_GATE: wait for genuinely new source bytes.']
}));
writeFileSync(path.join(root, 'coordination/project-guides/theta/STATE.json'), JSON.stringify({
  project_id:'theta',status:'HUMAN_DECISION_GATE',frontier_refs:[],blockers:['HUMAN_DECISION_GATE: await explicit human disposition.']
}));

const feed = {
  source_sha:'fixture-sha',
  projects:[
    {project_id:'alpha',label:'Alpha',status:'ACTIVE',priority:100,jobs:[{job_id:'a1',state:'done',priority:100,terminal_return:{returned_at:'2026-09-17T18:00:00Z'}}]},
    {project_id:'beta',label:'Beta',status:'DISCOVERY',priority:80,jobs:[{job_id:'b1',state:'replaceable',priority:80,last_signal_at:'2026-09-17T17:00:00Z'}]},
    {project_id:'gamma',label:'Gamma',status:'ACTIVE',priority:70,jobs:[{job_id:'g1',state:'ready',priority:70}]},
    {project_id:'delta',label:'Delta',status:'ACTIVE',priority:60,jobs:[{job_id:'d1',state:'working',priority:60,last_signal_at:new Date().toISOString()}]},
    {project_id:'epsilon',label:'Epsilon',status:'ACTIVE',priority:50,jobs:[{job_id:'e1',state:'done',priority:50}]},
    {project_id:'zeta',label:'Zeta',status:'ACTIVE',priority:90,jobs:[{job_id:'z1',state:'done',priority:90}]},
    {project_id:'theta',label:'Theta',status:'ACTIVE',priority:85,jobs:[{job_id:'t1',state:'done',priority:85}]}
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
assert(!projects.has('zeta'), 'SOURCE_DEBT + empty frontier + NEW_EVIDENCE_GATE must stay suppressed in project coverage post-processing');
assert(!projects.has('theta'), 'HUMAN_DECISION_GATE + empty frontier must stay suppressed in project coverage post-processing');
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
