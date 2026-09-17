import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pad = n => String(n).padStart(6, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function atomicPin(root, jobId, generation, workerId, predecessor = null) {
  const dir = join(root, jobId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `G${pad(generation)}.json`);
  const doc = { job_id: jobId, generation, worker_id: workerId, predecessor_pin_ref: predecessor };
  try {
    await writeFile(path, JSON.stringify(doc), { flag: 'wx' });
    return { won: true, path, doc };
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    const winner = JSON.parse(await readFile(path, 'utf8'));
    return { won: false, path, winner };
  }
}

async function race(root, jobId, count, generation = 1, predecessor = null) {
  const attempts = Array.from({ length: count }, (_, i) => (async () => {
    await sleep((i * 7) % 5);
    return atomicPin(root, jobId, generation, `worker-${i + 1}`, predecessor);
  })());
  const results = await Promise.all(attempts);
  const winners = results.filter(x => x.won);
  const losers = results.filter(x => !x.won);
  if (winners.length !== 1) throw new Error(`${jobId}: expected 1 winner, got ${winners.length}`);
  if (losers.length !== count - 1) throw new Error(`${jobId}: expected ${count - 1} losers, got ${losers.length}`);
  if (losers.some(x => x.winner.worker_id !== winners[0].doc.worker_id)) throw new Error(`${jobId}: losers did not observe same winner`);
  return { winners, losers };
}

function legacyWinner(rows) {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.claimed_at) || 0;
    const tb = Date.parse(b.claimed_at) || 0;
    return ta - tb || a.path.localeCompare(b.path);
  })[0] || null;
}

const root = await mkdtemp(join(tmpdir(), 'prometeo-pin-'));
const two = await race(root, 'job-two', 2);
const five = await race(root, 'job-five', 5);
const first = await race(root, 'job-recovery', 2, 1);
const predecessor = first.winners[0].path;
const recovery = await race(root, 'job-recovery', 5, 2, predecessor);
const legacy = legacyWinner([
  { path: 'z.json', claimed_at: '2026-09-17T17:48:49Z' },
  { path: 'b.json', claimed_at: '2026-09-17T17:48:37Z' },
  { path: 'a.json', claimed_at: '2026-09-17T17:48:37Z' }
]);
if (legacy.path !== 'a.json') throw new Error(`legacy deterministic winner mismatch: ${legacy.path}`);
if (recovery.winners[0].doc.predecessor_pin_ref !== predecessor) throw new Error('recovery predecessor lineage missing');

console.log(JSON.stringify({
  ok: true,
  two_worker: { winners: two.winners.length, losers: two.losers.length },
  five_worker: { winners: five.winners.length, losers: five.losers.length },
  recovery_five_worker: { winners: recovery.winners.length, losers: recovery.losers.length, predecessor_preserved: true },
  legacy_winner: legacy.path
}, null, 2));
