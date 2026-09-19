#!/usr/bin/env node
import assert from 'node:assert/strict';
import { capabilityConfirmationGate, buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const capability = 'unrestricted_public_http_origin_fetch';
const repeated = {
  job_id:'fixture-http-boundary',
  dedupe_key:'fixture:http-boundary:v1',
  project_id:'fixture',
  title:'fixture repeated HTTP boundary',
  kind:'verification',
  priority:50,
  state:'replaceable',
  pin_generation:2,
  required_capabilities:[capability],
  claimed_at:'2026-09-19T14:55:00Z',
  last_signal_at:'2026-09-19T15:00:00Z',
  latest_return:{
    path:'returns/G2.json',
    outcome:'BOUNDARY',
    returned_at:'2026-09-19T15:00:00Z'
  },
  recent_return_evidence:[
    {path:'returns/G1.json',outcome:'BOUNDARY',returned_at:'2026-09-19T14:50:00Z'},
    {path:'returns/G2.json',outcome:'BOUNDARY',returned_at:'2026-09-19T15:00:00Z'}
  ]
};

const gate = capabilityConfirmationGate(repeated);
assert.equal(gate.required,true);
assert.equal(gate.capability,capability);
assert.equal(gate.positive_runtime_contract_required,true);
assert.equal(gate.unknown_or_absent_skip_preclaim,true);
assert.equal(gate.boundary_count,2);

const feed = {
  generated_at:'2026-09-19T15:01:00Z',
  source_sha:'fixture-source',
  summary:{workers:{}},
  workers:[],
  plans:[],
  projects:[{project_id:'fixture',label:'Fixture',jobs:[repeated]}]
};
const allocator = buildFastAllocator(feed,{status:'HEALTHY',metrics:{},reasons:[]},{recoveryPolicies:[],roleContext:null});
const row = allocator.recovery.find(item=>item.job_id===repeated.job_id);
assert.ok(row);
assert.equal(row.capability_confirmation_required.capability,capability);
assert.equal(row.capability_confirmation_required.unknown_or_absent_skip_preclaim,true);

const withSuccess = {
  ...repeated,
  recent_return_evidence:[
    {path:'returns/G1.json',outcome:'BOUNDARY',returned_at:'2026-09-19T14:40:00Z'},
    {path:'returns/G2.json',outcome:'VERIFIED',returned_at:'2026-09-19T14:50:00Z'},
    {path:'returns/G3.json',outcome:'BOUNDARY',returned_at:'2026-09-19T15:00:00Z'}
  ]
};
assert.equal(capabilityConfirmationGate(withSuccess).required,false);

const newBasis = {
  ...repeated,
  recovery_basis:{
    revision:1,
    updated_at:'2026-09-19T15:01:00Z',
    evidence:['runtime-contract:arbitrary-http-client']
  }
};
assert.equal(capabilityConfirmationGate(newBasis).required,false);

const firstAttempt = {...repeated,state:'ready',pin_generation:0};
const firstFeed = {...feed,projects:[{project_id:'fixture',label:'Fixture',jobs:[firstAttempt]}]};
const firstAllocator = buildFastAllocator(firstFeed,{status:'HEALTHY',metrics:{},reasons:[]},{recoveryPolicies:[],roleContext:null});
const first = firstAllocator.ready.find(item=>item.job_id===firstAttempt.job_id);
assert.ok(first);
assert.equal(first.capability_confirmation_required,null);

console.log('REPEATED_CAPABILITY_BOUNDARY_GATE_V1_PASS');
