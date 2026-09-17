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
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006','EFF007','EFF008']) {
  if (!baseline?.items?.some(x => x.id === id)) errors.push(`baseline: missing ${id}`);
}
if (!baseline?.runtime_baseline_activated_at) errors.push('baseline: missing runtime_baseline_activated_at');

const wc = read(root, 'wc');
must('wc', wc, 'CLAIM NOW');
must('wc', wc, 'Candidate order: `ready` -> `queue_ready` -> `recovery`.');
must('wc', wc, 'Maximum 3 fast CREATE attempts.');
must('wc', wc, 'FORBIDDEN before ownership:');
must('wc', wc, 'Do not pre-read those directories. CREATE first.');
must('wc', wc, 'A worker without PIN/claim owns nothing and creates NO recovery debt.');
must('wc', wc, 'Known efficiency wins are cumulative durable constraints, not chat memory.');

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

const guide = read(root, 'g');
must('guide', guide, '## FAST GUIDE HYDRATION');
mustI('guide', guide, "human's actual message");
must('guide', guide, 'DO NOT enumerate every queue, claim, run, return, heartbeat');
must('guide', guide, 'Prefer compiled/index/current views over N raw directory reads.');
must('guide', guide, 'If EPOCH and the relevant durable pointers are unchanged');
must('guide', guide, 'A sustained efficiency regression is ONE system bottleneck.');

const live = read(root, '.github/workflows/live-feed.yml');
must('live-workflow', live, 'cancel-in-progress: false');
must('live-workflow', live, "schema:'prometeo.fast-allocator/v2'");
must('live-workflow', live, "preferred_order:['ready','queue_ready','recovery']");
must('live-workflow', live, 'claim_path:');
must('live-workflow', live, 'max_recovery_snapshot_age_seconds:90');
must('live-workflow', live, 'scripts/build-efficiency-snapshot.mjs');
must('live-workflow', live, 'live/efficiency.json');

const normalize = read(root, '.github/scripts/normalize-live-feed.mjs');
must('live-normalizer', normalize, 'NO_ALLOCATION_GRACE_MS = 45_000');
must('live-normalizer', normalize, 'superseded_owner_attempts_suppressed');

const runtime = read(root, 'scripts/build-efficiency-snapshot.mjs');
must('efficiency-runtime', runtime, 'baseline.runtime_baseline_activated_at || baseline.updated_at');
must('efficiency-runtime', runtime, "status==='REGRESSION'");
must('efficiency-runtime', runtime, 'ONE_SYSTEM_BOTTLENECK_NOT_PER_WORKER');

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
