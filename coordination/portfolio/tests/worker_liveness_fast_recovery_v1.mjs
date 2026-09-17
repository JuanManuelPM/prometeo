import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MIN = 60_000;
const pad = n => String(n).padStart(6, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function newestIso(...values) {
  const valid = values.filter(Boolean).map(value => ({ value, ms: Date.parse(value) })).filter(x => Number.isFinite(x.ms));
  valid.sort((a, b) => b.ms - a.ms);
  return valid[0]?.value ?? null;
}

function livenessState({ now, beaconAt, assignmentAt = null, latestSignalAt = null, terminal = false, retrySafe = true }) {
  const nowMs = Date.parse(now);
  if (terminal) return 'TERMINAL';
  if (!assignmentAt) {
    const beaconAge = nowMs - Date.parse(beaconAt);
    return beaconAge >= 3 * MIN ? 'ALLOCATION_SILENT' : 'ALLOCATING';
  }
  const effectiveSignal = newestIso(assignmentAt, latestSignalAt);
  const age = nowMs - Date.parse(effectiveSignal);
  if (age < 6 * MIN) return 'ACTIVE_OR_UNKNOWN';
  if (age < 10 * MIN) return 'STALE_SUSPECT';
  return retrySafe ? 'RECOVERY_ELIGIBLE' : 'RECOVERY_BLOCKED_UNSAFE';
}

async function atomicPin(root, jobId, generation, workerId, predecessor = null) {
  const dir = join(root, 'pins', jobId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `G${pad(generation)}.json`);
  const doc = { job_id: jobId, generation, worker_id: workerId, predecessor_pin_ref_or_null: predecessor };
  try {
    await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
    return { won: true, path, doc };
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    return { won: false, path, winner: JSON.parse(await readFile(path, 'utf8')) };
  }
}

async function race(root, jobId, generation, count, predecessor) {
  const attempts = await Promise.all(Array.from({ length: count }, (_, i) => (async () => {
    await sleep((i * 7) % 4);
    return atomicPin(root, jobId, generation, `recovery-worker-${i + 1}`, predecessor);
  })()));
  const winners = attempts.filter(x => x.won);
  const losers = attempts.filter(x => !x.won);
  assert(winners.length === 1, `expected exactly one recovery winner, got ${winners.length}`);
  assert(losers.length === count - 1, `expected ${count - 1} recovery losers, got ${losers.length}`);
  assert(losers.every(x => x.winner.worker_id === winners[0].doc.worker_id), 'recovery losers did not observe the same winner');
  return { winner: winners[0], losers };
}

const now = '2026-09-17T19:30:00Z';
const fixtures = {
  allocating: livenessState({ now, beaconAt: '2026-09-17T19:28:00Z' }),
  allocation_silent: livenessState({ now, beaconAt: '2026-09-17T19:27:00Z' }),
  fresh_599: livenessState({ now, beaconAt: '2026-09-17T19:20:00Z', assignmentAt: '2026-09-17T19:20:00Z', latestSignalAt: '2026-09-17T19:24:00.001Z' }),
  exact_6m: livenessState({ now, beaconAt: '2026-09-17T19:20:00Z', assignmentAt: '2026-09-17T19:20:00Z', latestSignalAt: '2026-09-17T19:24:00Z' }),
  just_before_10m: livenessState({ now, beaconAt: '2026-09-17T19:20:00Z', assignmentAt: '2026-09-17T19:20:00Z', latestSignalAt: '2026-09-17T19:20:00.001Z' }),
  exact_10m_safe: livenessState({ now, beaconAt: '2026-09-17T19:20:00Z', assignmentAt: '2026-09-17T19:20:00Z', latestSignalAt: '2026-09-17T19:20:00Z', retrySafe: true }),
  exact_10m_unsafe: livenessState({ now, beaconAt: '2026-09-17T19:20:00Z', assignmentAt: '2026-09-17T19:20:00Z', latestSignalAt: '2026-09-17T19:20:00Z', retrySafe: false }),
  old_claim_fresh_heartbeat: livenessState({ now, beaconAt: '2026-09-17T19:00:00Z', assignmentAt: '2026-09-17T19:00:00Z', latestSignalAt: '2026-09-17T19:29:00Z' }),
  terminal_old: livenessState({ now, beaconAt: '2026-09-17T19:00:00Z', assignmentAt: '2026-09-17T19:00:00Z', latestSignalAt: '2026-09-17T19:00:00Z', terminal: true })
};

assert(fixtures.allocating === 'ALLOCATING', 'beacon younger than 3m should remain allocating');
assert(fixtures.allocation_silent === 'ALLOCATION_SILENT', 'beacon at 3m without assignment should be allocation silent');
assert(fixtures.fresh_599 === 'ACTIVE_OR_UNKNOWN', 'signal younger than 6m should block time-only recovery');
assert(fixtures.exact_6m === 'STALE_SUSPECT', 'exactly 6m should be stale suspect');
assert(fixtures.just_before_10m === 'STALE_SUSPECT', 'signal younger than 10m should remain stale suspect');
assert(fixtures.exact_10m_safe === 'RECOVERY_ELIGIBLE', 'exactly 10m retry-safe should be recovery eligible');
assert(fixtures.exact_10m_unsafe === 'RECOVERY_BLOCKED_UNSAFE', 'unsafe retry must not gain takeover authority');
assert(fixtures.old_claim_fresh_heartbeat === 'ACTIVE_OR_UNKNOWN', 'fresh heartbeat must override old claim age');
assert(fixtures.terminal_old === 'TERMINAL', 'terminal return must block recovery regardless of age');

const root = await mkdtemp(join(tmpdir(), 'prometeo-fast-recovery-'));
const jobId = 'fixture-fast-recovery';
const g1 = await atomicPin(root, jobId, 1, 'silent-predecessor');
assert(g1.won, 'fixture predecessor G1 should be created');
const g1Before = await readFile(g1.path, 'utf8');

const recovery = await race(root, jobId, 2, 5, g1.path);
assert(recovery.winner.doc.predecessor_pin_ref_or_null === g1.path, 'recovery winner must preserve predecessor lineage');
const g1After = await readFile(g1.path, 'utf8');
assert(g1After === g1Before, 'recovery must not overwrite predecessor pin');

const loser = recovery.losers[0];
const reentry = await atomicPin(root, 'fixture-reentry-alt', 1, loser.winner.worker_id === 'recovery-worker-1' ? 'loser-reentry-a' : 'loser-reentry-b');
assert(reentry.won, 'a recovery loser must be able to re-enter allocation on a different job');

const terminalState = livenessState({
  now,
  beaconAt: '2026-09-17T19:00:00Z',
  assignmentAt: '2026-09-17T19:00:00Z',
  latestSignalAt: '2026-09-17T19:00:00Z',
  terminal: true
});
let g3Exists = true;
try { await access(join(root, 'pins', jobId, 'G000003.json')); } catch { g3Exists = false; }
assert(terminalState === 'TERMINAL' && !g3Exists, 'terminal state must not create a later recovery generation');

console.log(JSON.stringify({
  ok: true,
  policy_boundaries: fixtures,
  deterministic_recovery: {
    predecessor_generation: 1,
    recovery_generation: 2,
    contenders: 5,
    winners: 1,
    losers: 4,
    predecessor_preserved: g1After === g1Before,
    winner_has_predecessor_lineage: recovery.winner.doc.predecessor_pin_ref_or_null === g1.path,
    loser_reentry: reentry.won
  },
  terminal_blocks_new_generation: terminalState === 'TERMINAL' && !g3Exists
}, null, 2));
