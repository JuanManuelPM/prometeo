import assert from 'node:assert/strict';

function asTime(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

// Mirrors the persisted buildSnapshotFromRepo heartbeat association at
// scripts/compile-frontier-pressure.mjs blob 154c9587ca12744758f9cd40ca1fb39c80041b82:
// newest heartbeat is keyed only by worker_id, then attached to every pin for that worker.
function currentAssociation(heartbeatRows, pin) {
  const heartbeatLatest = new Map();
  for (const value of heartbeatRows) {
    const worker = value.worker_id;
    if (!worker) continue;
    const t = asTime(value.heartbeat_at);
    const prior = heartbeatLatest.get(worker);
    if (t !== null && (!prior || t > prior.t)) {
      heartbeatLatest.set(worker, { t, at: value.heartbeat_at, job_id: value.job_id ?? null });
    }
  }
  return heartbeatLatest.get(pin.worker_id) ?? null;
}

const pinA = {
  job_id: 'job-A',
  worker_id: 'worker-W',
  claimed_at: '2026-09-17T19:00:00Z'
};
const heartbeats = [
  { worker_id: 'worker-W', job_id: 'job-B', heartbeat_at: '2026-09-17T19:30:00Z' }
];
const observed = currentAssociation(heartbeats, pinA);
assert.equal(observed.job_id, 'job-B');
assert.equal(observed.at, '2026-09-17T19:30:00Z');

const now = Date.parse('2026-09-17T19:31:00Z');
const ageUsingObserved = (now - Date.parse(observed.at)) / 60000;
const ageUsingAttributableSignal = (now - Date.parse(pinA.claimed_at)) / 60000;
const observedLiveness = ageUsingObserved < 6 ? 'ACTIVE' : ageUsingObserved < 10 ? 'STALE_SUSPECT' : 'REPLACEABLE';
const expectedLiveness = ageUsingAttributableSignal < 6 ? 'ACTIVE' : ageUsingAttributableSignal < 10 ? 'STALE_SUSPECT' : 'REPLACEABLE';
assert.equal(observedLiveness, 'ACTIVE');
assert.equal(expectedLiveness, 'REPLACEABLE');

console.log(JSON.stringify({
  schema: 'prometeo.frontier-pressure-cross-job-heartbeat-canary/v1',
  observed_at: '2026-09-17T19:31:00Z',
  source_blob: '154c9587ca12744758f9cd40ca1fb39c80041b82',
  pin_job_id: pinA.job_id,
  heartbeat_job_id: observed.job_id,
  observed_associated_heartbeat: observed.at,
  observed_liveness: observedLiveness,
  expected_job_scoped_liveness: expectedLiveness,
  defect: 'worker-global heartbeat refreshes unrelated job ownership'
}, null, 2));
