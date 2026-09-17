import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const site = process.argv[3] ? path.resolve(process.argv[3]) : null;
const errors = [];
const ok = [];

const read = (base, rel) => {
  const p = path.join(base, rel);
  try { return fs.readFileSync(p, 'utf8'); }
  catch { errors.push(`missing:${rel}`); return ''; }
};
const must = (name, text, needle) => {
  if (!text.includes(needle)) errors.push(`${name}: missing ${JSON.stringify(needle)}`);
  else ok.push(`${name}:${needle}`);
};
const mustI = (name, text, needle) => {
  if (!text.toLowerCase().includes(needle.toLowerCase())) errors.push(`${name}: missing/i ${JSON.stringify(needle)}`);
  else ok.push(`${name}:i:${needle}`);
};
const mustNot = (name, text, needle) => {
  if (text.includes(needle)) errors.push(`${name}: forbidden ${JSON.stringify(needle)}`);
  else ok.push(`${name}:not:${needle}`);
};

const baselineText = read(root, 'coordination/efficiency/RATCHET_BASELINE_V1.json');
let baseline = null;
try { baseline = JSON.parse(baselineText); } catch { errors.push('baseline: invalid JSON'); }
if (!baseline?.items?.length) errors.push('baseline: no ratchet items');
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006']) {
  if (!baseline?.items?.some(x => x.id === id)) errors.push(`baseline: missing ${id}`);
}

const wc = read(root, 'wc');
must('wc', wc, 'CLAIM NOW');
must('wc', wc, 'Candidate order: `ready` -> `queue_ready` -> `recovery`.');
must('wc', wc, 'Maximum 3 fast CREATE attempts.');
must('wc', wc, 'FORBIDDEN before ownership:');
must('wc', wc, 'Do not pre-read those directories. CREATE first.');
must('wc', wc, 'A worker without PIN/claim owns nothing and creates NO recovery debt.');

const fast = read(root, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
must('fast-allocation', fast, 'read ONE allocator snapshot');
must('fast-allocation', fast, '1. `ready` portfolio work;');
must('fast-allocation', fast, '2. `queue_ready` normal work;');
must('fast-allocation', fast, '3. only then `recovery` work;');
must('fast-allocation', fast, 'Attempt the atomic CREATE first.');
must('fast-allocation', fast, 'At most 3 atomic candidate attempts.');
must('fast-allocation', fast, 'No PIN/claim means no recovery debt.');

const registry = read(root, 'coordination/workers/WORKER_REGISTRY_PROTOCOL_V1.md');
must('worker-registry', registry, 'Deep validation happens after ownership and before substantive mutation.');
must('worker-registry', registry, 'first ~45 seconds: `ALLOCATING` grace;');
must('worker-registry', registry, 'Never launch a replacement specifically for a no-allocation worker.');

const live = read(root, '.github/workflows/live-feed.yml');
must('live-workflow', live, 'cancel-in-progress: false');
must('live-workflow', live, "schema:'prometeo.fast-allocator/v2'");
must('live-workflow', live, "preferred_order:['ready','queue_ready','recovery']");
must('live-workflow', live, 'claim_path:');
must('live-workflow', live, 'max_recovery_snapshot_age_seconds:90');

const normalize = read(root, '.github/scripts/normalize-live-feed.mjs');
must('live-normalizer', normalize, 'NO_ALLOCATION_GRACE_MS = 45_000');
must('live-normalizer', normalize, 'superseded_owner_attempts_suppressed');

if (site) {
  const pointer = read(site, 'wc/index.html');
  must('public-wc', pointer, 'PROMETEO /wc — CLAIM NOW');
  must('public-wc', pointer, 'Before ownership, do NOT load Guide, Metabolism, page protocols');
  mustI('public-wc', pointer, 'create your beacon, read ONE allocator snapshot, then attempt atomic claim/PIN immediately');
  mustNot('public-wc', pointer, 'MANDATORY before allocation: load and obey the self-replenishing metabolism policy');
  mustNot('public-wc', pointer, 'Load and obey the distributed Guide/Rescate protocol');
  mustNot('public-wc', pointer, 'Load the page identity/request/publication laws before');
}

if (errors.length) {
  console.error('EFFICIENCY_RATCHET_FAIL');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`EFFICIENCY_RATCHET_PASS checks=${ok.length} items=${baseline.items.length}`);
