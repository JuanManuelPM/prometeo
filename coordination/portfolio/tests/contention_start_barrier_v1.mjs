import { mkdtemp, mkdir, writeFile, readFile, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pad = n => String(n).padStart(6, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function createBarrier(root, fixtureId, requiredContenders, openedAt, deadlineAt) {
  const dir = join(root, 'barriers', fixtureId);
  await mkdir(join(dir, 'entrants'), { recursive: true });
  await mkdir(join(dir, 'timeouts'), { recursive: true });
  const path = join(dir, 'BARRIER.json');
  const doc = {
    schema: 'prometeo.portfolio-contention-barrier/v1',
    fixture_id: fixtureId,
    required_contenders: requiredContenders,
    opened_at: openedAt,
    deadline_at: deadlineAt,
    authority: 'TIMING_ONLY_NO_EXECUTION_AUTHORITY'
  };
  await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
  return { dir, path, doc };
}

async function registerEntrant(barrier, workerId, registeredAt) {
  const path = join(barrier.dir, 'entrants', `${workerId}.json`);
  const doc = {
    schema: 'prometeo.portfolio-contention-entrant/v1',
    fixture_id: barrier.doc.fixture_id,
    worker_id: workerId,
    registered_at: registeredAt,
    next_action: 'WAIT_FOR_RELEASE_OR_TIMEOUT',
    grants_execution_authority: false
  };
  try {
    await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
    return { created: true, path, doc };
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    return { created: false, path, doc: JSON.parse(await readFile(path, 'utf8')) };
  }
}

async function distinctEntrants(barrier) {
  const names = (await readdir(join(barrier.dir, 'entrants'))).filter(name => name.endsWith('.json'));
  return names.map(name => name.slice(0, -5)).sort();
}

async function maybeRelease(barrier, observedAt) {
  const releasePath = join(barrier.dir, 'RELEASE.json');
  if (await exists(releasePath)) {
    return { released: true, created: false, path: releasePath, doc: JSON.parse(await readFile(releasePath, 'utf8')) };
  }
  const entrants = await distinctEntrants(barrier);
  if (Date.parse(observedAt) >= Date.parse(barrier.doc.deadline_at)) {
    return { released: false, created: false, reason: 'DEADLINE_REACHED', entrants };
  }
  if (entrants.length < barrier.doc.required_contenders) {
    return { released: false, created: false, reason: 'WAITING_FOR_CONTENDERS', entrants };
  }
  const doc = {
    schema: 'prometeo.portfolio-contention-release/v1',
    fixture_id: barrier.doc.fixture_id,
    released_at: observedAt,
    required_contenders: barrier.doc.required_contenders,
    entrant_worker_ids: entrants,
    grants_execution_authority: false,
    next_action: 'RACE_DETERMINISTIC_PIN'
  };
  try {
    await writeFile(releasePath, JSON.stringify(doc), { flag: 'wx' });
    return { released: true, created: true, path: releasePath, doc };
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    return { released: true, created: false, path: releasePath, doc: JSON.parse(await readFile(releasePath, 'utf8')) };
  }
}

async function timeoutAndReenter(barrier, workerId, observedAt) {
  const releasePath = join(barrier.dir, 'RELEASE.json');
  if (await exists(releasePath)) return { timed_out: false, next_action: 'RACE_DETERMINISTIC_PIN' };
  if (Date.parse(observedAt) < Date.parse(barrier.doc.deadline_at)) {
    return { timed_out: false, next_action: 'WAIT_FOR_RELEASE_OR_TIMEOUT' };
  }
  const path = join(barrier.dir, 'timeouts', `${workerId}.json`);
  const doc = {
    schema: 'prometeo.portfolio-contention-timeout/v1',
    fixture_id: barrier.doc.fixture_id,
    worker_id: workerId,
    observed_at: observedAt,
    next_action: 'REENTER_ALLOCATION',
    pin_attempted: false
  };
  try { await writeFile(path, JSON.stringify(doc), { flag: 'wx' }); } catch (err) { if (err?.code !== 'EEXIST') throw err; }
  return { timed_out: true, path, next_action: 'REENTER_ALLOCATION' };
}

async function atomicPin(root, jobId, generation, workerId) {
  const dir = join(root, 'pins', jobId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `G${pad(generation)}.json`);
  const doc = { job_id: jobId, generation, worker_id: workerId };
  try {
    await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
    return { won: true, path, doc, worker_id: workerId, generation };
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    return { won: false, path, winner: JSON.parse(await readFile(path, 'utf8')), worker_id: workerId, generation };
  }
}

async function collisionReceipt(root, jobId, attempt) {
  const dir = join(root, 'collisions', jobId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${attempt.worker_id}-G${pad(attempt.generation)}.json`);
  const doc = {
    schema: 'prometeo.portfolio-pin-collision/v1',
    job_id: jobId,
    worker_id: attempt.worker_id,
    attempted_generation: attempt.generation,
    attempted_pin_ref: attempt.path,
    winner_worker_id_or_null: attempt.winner?.worker_id || null,
    host_result: 'CREATE_EXISTS_OR_CAS_LOST',
    next_action: 'REENTER_ALLOCATION'
  };
  await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
  return { path, doc };
}

async function releasedRace(root, barrier, jobId, workers, observedAt) {
  const releaseAttempts = await Promise.all(workers.map(() => maybeRelease(barrier, observedAt)));
  assert(releaseAttempts.every(x => x.released), `${jobId}: all contenders must observe release`);
  const releases = releaseAttempts.filter(x => x.created);
  assert(releases.length === 1, `${jobId}: expected exactly one RELEASE creator, got ${releases.length}`);

  assert(!(await exists(join(root, 'pins', jobId, 'G000001.json'))), `${jobId}: release must not create authority`);

  const attempts = await Promise.all(workers.map((workerId, i) => (async () => {
    await sleep((i * 5) % 3);
    return atomicPin(root, jobId, 1, workerId);
  })()));
  const winners = attempts.filter(x => x.won);
  const losers = attempts.filter(x => !x.won);
  assert(winners.length === 1, `${jobId}: expected 1 pin winner, got ${winners.length}`);
  assert(losers.length === workers.length - 1, `${jobId}: expected ${workers.length - 1} losers, got ${losers.length}`);
  assert(losers.every(x => x.winner.worker_id === winners[0].doc.worker_id), `${jobId}: losers observed different winner`);
  const receipts = await Promise.all(losers.map(x => collisionReceipt(root, jobId, x)));
  assert(receipts.every(x => x.doc.next_action === 'REENTER_ALLOCATION'), `${jobId}: loser must re-enter allocation`);
  return { winners, losers, receipts, release: releaseAttempts[0].doc };
}

const root = await mkdtemp(join(tmpdir(), 'prometeo-contention-barrier-'));
const openedAt = '2026-09-17T19:30:00Z';
const deadlineAt = '2026-09-17T19:31:00Z';
const beforeDeadline = '2026-09-17T19:30:30Z';
const afterDeadline = '2026-09-17T19:31:00Z';

const twoBarrier = await createBarrier(root, 'fixture-two', 2, openedAt, deadlineAt);
const first = await registerEntrant(twoBarrier, 'worker-a', '2026-09-17T19:30:05Z');
assert(first.created, 'first entrant should be created');
const duplicate = await registerEntrant(twoBarrier, 'worker-a', '2026-09-17T19:30:06Z');
assert(!duplicate.created, 'duplicate worker registration must not count twice');
const waiting = await maybeRelease(twoBarrier, beforeDeadline);
assert(!waiting.released && waiting.reason === 'WAITING_FOR_CONTENDERS', 'one distinct entrant must not release 2-worker barrier');
await registerEntrant(twoBarrier, 'worker-b', '2026-09-17T19:30:10Z');
assert((await distinctEntrants(twoBarrier)).length === 2, '2-worker barrier should have exactly 2 distinct entrants');
const twoRace = await releasedRace(root, twoBarrier, 'job-two-barrier', ['worker-a', 'worker-b'], beforeDeadline);
assert(twoRace.receipts.length === 1, '2-worker race must create exactly one loser collision receipt');

const fiveBarrier = await createBarrier(root, 'fixture-five', 5, openedAt, deadlineAt);
const fiveWorkers = ['worker-1','worker-2','worker-3','worker-4','worker-5'];
await Promise.all(fiveWorkers.map((id, i) => registerEntrant(fiveBarrier, id, `2026-09-17T19:30:${String(10 + i).padStart(2, '0')}Z`)));
assert((await distinctEntrants(fiveBarrier)).length === 5, '5-worker barrier should have 5 distinct entrants');
const fiveRace = await releasedRace(root, fiveBarrier, 'job-five-barrier', fiveWorkers, beforeDeadline);
assert(fiveRace.receipts.length === 4, '5-worker race must create four loser collision receipts');

const timeoutBarrier = await createBarrier(root, 'fixture-timeout', 2, openedAt, deadlineAt);
await registerEntrant(timeoutBarrier, 'worker-timeout', '2026-09-17T19:30:10Z');
const noRelease = await maybeRelease(timeoutBarrier, afterDeadline);
assert(!noRelease.released && noRelease.reason === 'DEADLINE_REACHED', 'deadline must block late release');
const timeout = await timeoutAndReenter(timeoutBarrier, 'worker-timeout', afterDeadline);
assert(timeout.timed_out && timeout.next_action === 'REENTER_ALLOCATION', 'timed-out entrant must re-enter allocation');
assert(!(await exists(join(root, 'pins', 'job-timeout', 'G000001.json'))), 'timeout path must not create a pin');

console.log(JSON.stringify({
  ok: true,
  two_worker: {
    distinct_entrants: (await distinctEntrants(twoBarrier)).length,
    duplicate_registration_counted: duplicate.created,
    release_grants_authority: twoRace.release.grants_execution_authority,
    winners: twoRace.winners.length,
    losers: twoRace.losers.length,
    collision_receipts: twoRace.receipts.length
  },
  five_worker: {
    distinct_entrants: (await distinctEntrants(fiveBarrier)).length,
    winners: fiveRace.winners.length,
    losers: fiveRace.losers.length,
    collision_receipts: fiveRace.receipts.length
  },
  timeout: {
    released: noRelease.released,
    reason: noRelease.reason,
    next_action: timeout.next_action,
    pin_attempted: false
  }
}, null, 2));
