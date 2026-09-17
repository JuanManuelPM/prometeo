import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildControlRoom, loadControlRoomInputs, CONTROL_ROOM_AUTHORITY, CONTROL_ROOM_SCHEMA} from '../scripts/build-control-room.mjs';

const NOW = '2026-09-17T04:00:00.000Z';
const queue = {
  schema: 'prometeo.opportunity-queue/v1',
  queue_id: 'Q-TEST',
  status: 'CANARY',
  opportunities: [
    {opportunity_id:'O-READY-FREE', priority:10, status:'READY', type:'BUILD', project_id:'P'},
    {opportunity_id:'O-READY-CLAIMED', priority:9, status:'READY', type:'BUILD', project_id:'P'},
    {opportunity_id:'O-WORKING-SUSPECT', priority:8, status:'READY', type:'VERIFY', project_id:'P'},
    {opportunity_id:'O-WORKING-RECOVERY-TIME', priority:7, status:'READY', type:'BUILD', project_id:'P'},
    {opportunity_id:'O-RETURNED-NOT-DONE', priority:6, status:'READY', type:'BUILD', project_id:'P'},
    {opportunity_id:'O-BLOCKED', priority:100, status:'BLOCKED_DEPENDENCY', type:'INTEGRATE', project_id:'P', dependencies:['O-X']},
    {opportunity_id:'O-DONE', priority:5, status:'READY', type:'BUILD', project_id:'P'},
    {opportunity_id:'O-LATE-ORIGINAL', priority:4, status:'READY', type:'BUILD', project_id:'P'}
  ]
};
const continuityHead = {
  active_queues:[{queue_id:'Q-TEST', ref:'coordination/opportunities/Q-TEST.json'}],
  roots:[{project_id:'P', status:'ACTIVE'}],
  surface_targets:[{surface_id:'surface-a', title:'Surface A', status:'ACTIVE'}],
  distributed_swarm:{stale_defaults:{suspect_minutes:20,recovery_eligible_minutes:30,heartbeat_target_minutes:10}}
};
const claims = [
  {opportunity_id:'O-READY-CLAIMED', worker_instance_id:'W1', claimed_at:'2026-09-17T03:58:00Z', state:'CLAIMED', _source_ref:'claims/c1.json'},
  {opportunity_id:'O-WORKING-SUSPECT', worker_instance_id:'W2', claimed_at:'2026-09-17T03:00:00Z', state:'CLAIMED', _source_ref:'claims/c2.json'},
  {opportunity_id:'O-WORKING-RECOVERY-TIME', worker_instance_id:'W3', claimed_at:'2026-09-17T03:00:00Z', state:'CLAIMED', _source_ref:'claims/c3.json'},
  {opportunity_id:'O-RETURNED-NOT-DONE', worker_instance_id:'W4', claimed_at:'2026-09-17T03:00:00Z', state:'CLAIMED', _source_ref:'claims/c4.json'},
  {opportunity_id:'O-DONE', worker_instance_id:'W5', claimed_at:'2026-09-17T03:00:00Z', state:'CLAIMED', _source_ref:'claims/c5.json'},
  {opportunity_id:'O-LATE-ORIGINAL', worker_instance_id:'WOLD', claimed_at:'2026-09-17T02:00:00Z', state:'CLAIMED', _source_ref:'claims/c6.json'}
];
const runs = [
  {opportunity_id:'O-WORKING-SUSPECT', run_id:'R2', worker_instance_id:'W2', state:'STARTED', started_at:'2026-09-17T03:00:00Z', heartbeat_at:'2026-09-17T03:35:00Z', _source_ref:'runs/r2.json'},
  {opportunity_id:'O-WORKING-RECOVERY-TIME', run_id:'R3', worker_instance_id:'W3', state:'STARTED', started_at:'2026-09-17T03:00:00Z', heartbeat_at:'2026-09-17T03:20:00Z', _source_ref:'runs/r3.json'},
  {opportunity_id:'O-RETURNED-NOT-DONE', run_id:'R4', worker_instance_id:'W4', state:'STARTED', started_at:'2026-09-17T03:00:00Z', heartbeat_at:'2026-09-17T03:55:00Z', _source_ref:'runs/r4.json'},
  {opportunity_id:'O-DONE', run_id:'R5', worker_instance_id:'W5', state:'DONE', started_at:'2026-09-17T03:00:00Z', updated_at:'2026-09-17T03:50:00Z', _source_ref:'runs/r5.json'},
  {opportunity_id:'O-LATE-ORIGINAL', run_id:'RNEW', worker_instance_id:'WRECOVERY', state:'STARTED', started_at:'2026-09-17T03:56:00Z', heartbeat_at:'2026-09-17T03:59:00Z', _source_ref:'runs/rnew.json'}
];
const returns = [
  {opportunity_id:'O-RETURNED-NOT-DONE', run_id:'R4', state:'RETURNED_CANDIDATE', created_at:'2026-09-17T03:57:00Z', _source_ref:'returns/ret4.json'},
  {opportunity_id:'O-DONE', run_id:'R5', state:'RETURNED_CANDIDATE', created_at:'2026-09-17T03:49:00Z', _source_ref:'returns/ret5.json'},
  {opportunity_id:'O-LATE-ORIGINAL', run_id:'ROLD', state:'RETURNED_CANDIDATE', created_at:'2026-09-17T03:58:00Z', _source_ref:'returns/late-old.json'}
];

const projection = buildControlRoom({continuityHead, queues:[queue], claims, runs, returns, recoveryClaims:[], now:NOW});
const byId = id => projection.opportunities.find(x => x.opportunity_id === id);

assert.equal(projection.schema, CONTROL_ROOM_SCHEMA);
assert.equal(projection.authority, CONTROL_ROOM_AUTHORITY);
assert.equal(projection.summary.opportunities_total, 8);
assert.equal(projection.useful_free_slots.count, 1, 'only unclaimed explicit READY work is a free slot');
assert.deepEqual(projection.useful_free_slots.opportunity_ids, ['O-READY-FREE']);
assert.equal(byId('O-READY-CLAIMED').lifecycle_state, 'CLAIMED_NOT_STARTED');
assert.equal(byId('O-WORKING-SUSPECT').lifecycle_state, 'WORKING');
assert.equal(byId('O-WORKING-SUSPECT').stale.state, 'STALE_SUSPECT');
assert.equal(byId('O-WORKING-RECOVERY-TIME').stale.state, 'RECOVERY_TIME_GATE_MET');
assert.notEqual(byId('O-WORKING-RECOVERY-TIME').stale.state, 'RECOVERY_ELIGIBLE', 'time alone must not authorize recovery');
assert.equal(byId('O-RETURNED-NOT-DONE').lifecycle_state, 'RETURNED_NOT_TERMINAL');
assert.equal(byId('O-BLOCKED').lifecycle_state, 'BLOCKED_DEPENDENCY');
assert.deepEqual(byId('O-BLOCKED').dependency_ids, ['O-X']);
assert.equal(byId('O-DONE').lifecycle_state, 'DONE');
assert.equal(projection.summary.done, 1);
assert.equal(projection.summary.returned, 3);
assert.ok(projection.blockers.some(x => x.opportunity_id === 'O-RETURNED-NOT-DONE' && x.type === 'LINEAGE_MISMATCH'));
assert.equal(byId('O-LATE-ORIGINAL').lifecycle_state, 'WORKING', 'late return from prior attempt must not terminate current recovery attempt');
assert.equal(byId('O-LATE-ORIGINAL').current_run_return, null);
assert.equal(byId('O-LATE-ORIGINAL').latest_return_evidence.run_id, 'ROLD');
assert.ok(byId('O-LATE-ORIGINAL').blockers.some(x => x.type === 'RECONCILIATION_REQUIRED'));
assert.ok(projection.truth_boundary.includes('cannot create Current'));
assert.equal(JSON.stringify(projection).includes('HUMAN_ACCEPTED'), false, 'projection must not manufacture acceptance authority labels');

const repeat = buildControlRoom({continuityHead, queues:[queue], claims, runs, returns, recoveryClaims:[], now:NOW});
assert.deepEqual(repeat, projection, 'same durable inputs + same clock cut must compile identically');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'control-room-v1-'));
fs.mkdirSync(path.join(temp, 'coordination/opportunities/claims'), {recursive:true});
fs.mkdirSync(path.join(temp, 'coordination/opportunities/runs/O-WORKING-SUSPECT'), {recursive:true});
fs.mkdirSync(path.join(temp, 'coordination/opportunities/returns/O-DONE'), {recursive:true});
fs.writeFileSync(path.join(temp, 'coordination/CONTINUITY_HEAD.json'), JSON.stringify(continuityHead));
fs.writeFileSync(path.join(temp, 'coordination/opportunities/Q-TEST.json'), JSON.stringify(queue));
fs.writeFileSync(path.join(temp, 'coordination/opportunities/claims/c.json'), JSON.stringify(claims[1]));
fs.writeFileSync(path.join(temp, 'coordination/opportunities/runs/O-WORKING-SUSPECT/r.json'), JSON.stringify(runs[0]));
fs.writeFileSync(path.join(temp, 'coordination/opportunities/returns/O-DONE/r.json'), JSON.stringify(returns[1]));
const loaded = loadControlRoomInputs(temp);
assert.equal(loaded.queues.length, 1);
assert.equal(loaded.claims.length, 1);
assert.equal(loaded.runs.length, 1);
assert.equal(loaded.returns.length, 1);
assert.ok(loaded.claims[0]._source_ref.endsWith('coordination/opportunities/claims/c.json'));

console.log(JSON.stringify({ok:true,schema:projection.schema,summary:projection.summary,free:projection.useful_free_slots.count},null,2));
