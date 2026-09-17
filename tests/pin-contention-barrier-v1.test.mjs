import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BARRIER_SCHEMA, ENTRANT_SCHEMA, evaluateContentionBarrier, loadBarrierState } from '../scripts/pin-contention-barrier.mjs';

function config(required = 2) {
  return {
    schema: BARRIER_SCHEMA,
    fixture_id: 'fixture-1',
    target_job_id: 'race-job',
    required_contenders: required,
    opened_at: '2026-09-17T19:30:00Z',
    deadline_at: '2026-09-17T19:35:00Z'
  };
}

function entrant(worker, armedAt, extra = {}) {
  return {
    schema: ENTRANT_SCHEMA,
    fixture_id: 'fixture-1',
    target_job_id: 'race-job',
    worker_id: worker,
    armed_at: armedAt,
    authority: 'BARRIER_ENTRANT_ONLY',
    ...extra
  };
}

test('2 distinct workers release barrier but do not grant winner authority', () => {
  const result = evaluateContentionBarrier(config(2), [
    entrant('w1', '2026-09-17T19:31:00Z'),
    entrant('w2', '2026-09-17T19:31:05Z')
  ], { now: '2026-09-17T19:31:06Z' });
  assert.equal(result.state, 'RELEASED');
  assert.equal(result.race_allowed, true);
  assert.equal(result.release_at, '2026-09-17T19:31:05.000Z');
  assert.equal(result.authority, 'BARRIER_ONLY_NO_EXECUTION_AUTHORITY');
  assert.equal(result.next_action, 'RACE_NORMAL_DETERMINISTIC_PIN');
});

test('5-worker barrier ignores duplicate receipts from one worker', () => {
  const receipts = [
    entrant('w1', '2026-09-17T19:31:00Z'),
    entrant('w1', '2026-09-17T19:31:01Z'),
    entrant('w2', '2026-09-17T19:31:02Z'),
    entrant('w3', '2026-09-17T19:31:03Z'),
    entrant('w4', '2026-09-17T19:31:04Z')
  ];
  const armed = evaluateContentionBarrier(config(5), receipts, { now: '2026-09-17T19:31:10Z' });
  assert.equal(armed.state, 'ARMING');
  assert.equal(armed.distinct_valid_entrants, 4);
  assert.equal(armed.duplicate_receipts_ignored, 1);
  const released = evaluateContentionBarrier(config(5), [...receipts, entrant('w5', '2026-09-17T19:31:11Z')], { now: '2026-09-17T19:31:12Z' });
  assert.equal(released.state, 'RELEASED');
  assert.equal(released.distinct_valid_entrants, 5);
});

test('timeout abandons isolated fixture without allowing race', () => {
  const result = evaluateContentionBarrier(config(2), [entrant('w1', '2026-09-17T19:31:00Z')], { now: '2026-09-17T19:35:00Z' });
  assert.equal(result.state, 'TIMED_OUT');
  assert.equal(result.race_allowed, false);
  assert.equal(result.next_action, 'ABANDON_FIXTURE_AND_REALLOCATE');
});

test('wrong target and outside-window entrants fail closed', () => {
  const result = evaluateContentionBarrier(config(2), [
    entrant('w1', '2026-09-17T19:31:00Z', { target_job_id: 'other-job' }),
    entrant('w2', '2026-09-17T19:40:00Z')
  ], { now: '2026-09-17T19:32:00Z' });
  assert.equal(result.state, 'ARMING');
  assert.equal(result.distinct_valid_entrants, 0);
  assert.deepEqual(result.invalid_receipts.map((row) => row.reason).sort(), ['OUTSIDE_WINDOW', 'WRONG_TARGET']);
});

test('filesystem loader reads append-only entrant receipts and ignores malformed JSON', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-barrier-'));
  const base = path.join(root, 'coordination/portfolio/contention/fixture-1');
  await fs.mkdir(path.join(base, 'entrants'), { recursive: true });
  await fs.writeFile(path.join(base, 'BARRIER.json'), JSON.stringify(config(2)));
  await fs.writeFile(path.join(base, 'entrants/w1.json'), JSON.stringify(entrant('w1', '2026-09-17T19:31:00Z')));
  await fs.writeFile(path.join(base, 'entrants/w2.json'), JSON.stringify(entrant('w2', '2026-09-17T19:31:02Z')));
  await fs.writeFile(path.join(base, 'entrants/in-flight.json'), '{');
  const result = await loadBarrierState(root, 'fixture-1', { now: '2026-09-17T19:31:03Z' });
  assert.equal(result.state, 'RELEASED');
  assert.deepEqual(result.entrant_worker_ids, ['w1', 'w2']);
});
