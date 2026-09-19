import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const wc=read('wc');
const policy=json('coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');
const examSpec=json('coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json');
const growth=json('coordination/workers/WORKER_GROWTH_POLICY_V1.json');
const strategy=json('coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
const handoff=json('coordination/guide/GUIDE_WORKER_HANDOFF_V1.json');
const mission=json('coordination/guide/CURRENT_MISSION_V1.json');
const oldExam=json('coordination/workers/exams/wc-20260918T212321Z-94fec87501.json');
const oldBeacon=json('coordination/workers/beacons/wc-20260918T212321Z-94fec87501.json');
const scoreboard=read('scripts/build-worker-scoreboard.mjs');

assert.equal(policy.status,'ACTIVE_BINDING');
assert.equal(policy.incident.diagnosis,'FRESH_LAUNCH_REPLAY');
assert.equal(policy.incident.historical_exam_ref,'coordination/workers/exams/wc-20260918T212321Z-94fec87501.json');
assert.equal(oldExam.worker_id,'wc-20260918T212321Z-94fec87501');
assert.equal(oldExam.protocol_version,'v3.28');
assert.equal(oldExam.closed_at,'2026-09-18T21:38:00Z');
assert.equal(oldBeacon.worker_id,oldExam.worker_id);
assert.notEqual(oldBeacon.canary_protocol,'v3.30');

assert.ok(wc.startsWith('PROMETEO UNIVERSAL COGNITIVE WORKER CANARY v3.30'));
for(const needle of [
  'FRESH LAUNCH / ANTI-REPLAY',
  'WORKER_FRESH_LAUNCH_POLICY_V1.json',
  'fresh_launch=true',
  'launch_nonce',
  'FRESH_LAUNCH_BEACON_NOT_CREATED',
  'A terminal human response for a new launch is FORBIDDEN',
  'CREATE_EXISTS, DISCARD that worker_id'
]) assert.ok(wc.includes(needle),'wc missing '+needle);
assert.ok(wc.indexOf('atomically CREATE \`coordination/workers/beacons/<worker_id>.json\`') < wc.indexOf('Read ONE compact claim frontier directly:'),'fresh beacon must precede frontier read');

assert.equal(examSpec.current_worker_protocol_version,'v3.30');
assert.equal(examSpec.v330_fresh_launch.policy_ref,'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');
assert.equal(growth.worker_protocol_min_version,'v3.30');
assert.equal(strategy.protocol_min_version,'v3.30');
assert.equal(handoff.integrity_smoke_override.status,'ACTIVE');
assert.equal(handoff.integrity_smoke_override.approximate_workers_before_next_guide_return,3);
assert.equal(mission.operating_mode.current_worker_protocol_version,'v3.30');
assert.equal(mission.current_snapshot.fresh_launch_incident.status,'CONFIRMED_REPLAY');
assert.equal(mission.current_snapshot.occupancy.recommended_additional_launches_at_snapshot,3);

for(const needle of ['fresh_launch_integrity','beacon_launch_nonce','exam_launch_nonce','SMOKE_PASS']) assert.ok(scoreboard.includes(needle),'scoreboard missing '+needle);

console.log('WORKER_FRESH_LAUNCH_V1_PASS');
