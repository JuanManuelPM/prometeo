import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const feedPath = path.resolve(process.argv[3] || '/tmp/feed.json');
const NO_ALLOCATION_GRACE_MS = 45_000;
const now = Date.now();

const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const feed = readJson(feedPath);
if (!feed || !Array.isArray(feed.workers)) throw new Error('invalid live feed');

const noAllocationDir = path.join(root, 'coordination/workers/no-allocation');
const explicitNoAllocation = new Set();
if (fs.existsSync(noAllocationDir)) {
  for (const name of fs.readdirSync(noAllocationDir)) {
    if (!name.endsWith('.json')) continue;
    const d = readJson(path.join(noAllocationDir, name));
    if (d?.worker_id) explicitNoAllocation.add(d.worker_id);
  }
}

const ts = v => Date.parse(v || '') || 0;
const latestPinByJob = new Map();
for (const w of feed.workers) {
  for (const a of (w.assignments || [])) {
    if (a.kind !== 'portfolio' || !a.job_id || !a.pin_at) continue;
    if (!String(a.source || '').includes('/pins/')) continue;
    const t = ts(a.pin_at);
    const prev = latestPinByJob.get(a.job_id);
    if (!prev || t > prev.time) latestPinByJob.set(a.job_id, {time:t, worker_id:w.worker_id, source:a.source});
  }
}

const kept = [];
const noAllocation = [];
const superseded = [];

for (const w of feed.workers) {
  const assignments = (w.assignments || []).filter(a => !['beacon','collision'].includes(a.kind));
  const ownsAnything = assignments.some(a => a.kind === 'portfolio' || a.kind === 'queue');
  const beaconAge = w.first_seen ? Math.max(0, now - ts(w.first_seen)) : Infinity;

  if (!ownsAnything && !w.end_at && (explicitNoAllocation.has(w.worker_id) || beaconAge >= NO_ALLOCATION_GRACE_MS)) {
    noAllocation.push(w);
    continue;
  }

  if (!w.end_at && w.job_id && w.pin_at) {
    const newest = latestPinByJob.get(w.job_id);
    if (newest && newest.time > ts(w.pin_at) && newest.worker_id !== w.worker_id) {
      superseded.push({...w, superseded_by:newest.worker_id, superseded_at:new Date(newest.time).toISOString()});
      continue;
    }
  }

  kept.push(w);
}

feed.workers = kept;
feed.thresholds = {...(feed.thresholds || {}), allocation_grace_seconds:45};
feed.diagnostics = {
  ...(feed.diagnostics || {}),
  launches_total_before_projection: kept.length + noAllocation.length + superseded.length,
  no_allocation_suppressed: noAllocation.length,
  superseded_owner_attempts_suppressed: superseded.length,
  projection_rule: 'No-PIN launches age out of Ahora quickly; superseded pin generations remain evidence but are not simultaneous active owners.'
};

const s = feed.summary?.workers || (feed.summary.workers = {});
s.seen = kept.length;
s.working = kept.filter(w => ['working','recovery'].includes(w.status)).length;
s.suspect = kept.filter(w => w.status === 'suspect').length;
s.replaceable = kept.filter(w => w.status === 'replaceable').length;
s.allocating = kept.filter(w => w.status === 'allocating').length;
s.finished = kept.filter(w => !!w.end_at).length;
s.no_allocation = noAllocation.length;
s.superseded = superseded.length;

fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2) + '\n');
console.log(`normalized live: visible=${kept.length} no-allocation=${noAllocation.length} superseded=${superseded.length}`);
