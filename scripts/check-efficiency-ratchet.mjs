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
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006','EFF007','EFF008','EFF009','EFF010','EFF011','EFF012','EFF013']) {
  if (!baseline?.items?.some(x => x.id === id)) errors.push(`baseline: missing ${id}`);
}
if (!baseline?.runtime_baseline_activated_at) errors.push('baseline: missing runtime_baseline_activated_at');
const latentItem = baseline?.items?.find(x=>x.id==='EFF013');
if (latentItem?.required?.role_ready_compiled_centrally !== true) errors.push('baseline: EFF013 role_ready_compiled_centrally must be true');
if (JSON.stringify(latentItem?.required?.candidate_order) !== JSON.stringify(['ready','queue_ready','role_ready','recovery'])) errors.push('baseline: EFF013 candidate order drift');

const wc = read(root, 'wc');
must('wc', wc, 'CLAIM NOW');
must('wc', wc, 'Candidate order: `ready` -> `queue_ready` -> `role_ready` -> `recovery`.');
must('wc', wc, 'Maximum 3 fast CREATE attempts');
must('wc', wc, 'Lane diversification: after 2 CREATE_EXISTS/CAS_LOST outcomes in the same lane');
must('wc', wc, 'GUIDE_ROLE_PIN_CREATE');
must('wc', wc, 'prometeo.guide-role-pin/v1');
must('wc', wc, 'ROLE_FRONTIER_PROTOCOL_V1.md');
must('wc', wc, 'NO_ALLOCATION` is NOT evidence');
must('wc', wc, 'FORBIDDEN before ownership:');
must('wc', wc, 'Do not pre-read those directories. CREATE first.');
must('wc', wc, 'A worker without PIN/claim owns nothing and creates NO recovery debt.');
must('wc', wc, 'Known efficiency wins are cumulative durable constraints, not chat memory.');
must('wc', wc, 'The authorization must come from the HUMAN MESSAGE itself.');
must('wc', wc, 'CLAIM_TRANSPORT_BLOCKED');
must('wc', wc, 'STOP immediately; do not spend attempts 2–3');
must('wc', wc, 'candidate.claim_payload_shape');
must('wc', wc, 'ALLOCATOR_PIN_PAYLOAD_INVALID');
must('wc', wc, '<now_plus_10m_iso>');
must('wc', wc, 'Never CREATE an immutable malformed pin');

const fast = read(root, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
must('fast-allocation', fast, 'read ONE allocator snapshot');
must('fast-allocation', fast, '1. `ready` portfolio work;');
must('fast-allocation', fast, '2. `queue_ready` normal work;');
must('fast-allocation', fast, '3. `role_ready` centrally compiled Guide work;');
must('fast-allocation', fast, '4. only then `recovery` work.');
must('fast-allocation', fast, 'After 2 `CREATE_EXISTS` / `CAS_LOST` outcomes in the same lane');
must('fast-allocation', fast, 'METABOLISM_POLICY_V1.json -> durable signals -> role_ready -> atomic role PIN');
must('fast-allocation', fast, 'prometeo.guide-role-pin/v1');
must('fast-allocation', fast, 'ROLE_FRONTIER_PROTOCOL_V1.md');
must('fast-allocation', fast, 'Attempt the atomic CREATE first only after the bounded allocator payload has passed the structural field check.');
must('fast-allocation', fast, 'At most 3 atomic candidate attempts');
must('fast-allocation', fast, 'No PIN/claim means no recovery debt.');
must('fast-allocation', fast, 'CLAIM_TRANSPORT_BLOCKED');
must('fast-allocation', fast, 'Do not consume attempts 2–3');
must('fast-allocation', fast, 'candidate.claim_payload_shape');
must('fast-allocation', fast, 'ALLOCATOR_PIN_PAYLOAD_INVALID');
must('fast-allocation', fast, '<now_plus_10m_iso>');
must('fast-allocation', fast, 'Never CREATE an immutable malformed pin');

const roleProtocol = read(root, 'coordination/guide/ROLE_FRONTIER_PROTOCOL_V1.md');
must('role-frontier', roleProtocol, '`ready -> queue_ready -> role_ready -> recovery`');
must('role-frontier', roleProtocol, 'prometeo.guide-role-pin/v1');
must('role-frontier', roleProtocol, 'GUIDE_INTEGRATOR');
must('role-frontier', roleProtocol, 'GUIDE_PLANNER');
must('role-frontier', roleProtocol, 'GUIDE_RESCATE');
must('role-frontier', roleProtocol, 'GUIDE_CRITIC');
must('role-frontier', roleProtocol, 'The central compiler, not every disposable worker, owns detection of latent Guide work.');

const metabolism = read(root, 'coordination/guide/METABOLISM_POLICY_V1.json');
must('metabolism', metabolism, '"frontier_floor_absolute"');
must('metabolism', metabolism, '"GUIDE_PLANNER"');
must('metabolism', metabolism, '"GUIDE_INTEGRATOR"');
must('metabolism', metabolism, '"GUIDE_RESCATE"');
must('metabolism', metabolism, '"GUIDE_CRITIC"');

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
must('live-workflow', live, 'fetch-depth: 500');
must('live-workflow', live, "'coordination/guide/**'");
must('live-workflow', live, '.github/scripts/augment-live-role-workers.mjs');
must('live-workflow', live, 'scripts/build-efficiency-snapshot.mjs');
must('live-workflow', live, 'scripts/build-fast-allocator.mjs');
must('live-workflow', live, 'node source/scripts/build-fast-allocator.mjs /tmp/feed.json /tmp/efficiency.json /tmp/allocator.json source');
must('live-workflow', live, 'live/efficiency.json');

const allocator = read(root, 'scripts/build-fast-allocator.mjs');
must('fast-allocator', allocator, "schema: 'prometeo.fast-allocator/v3'");
must('fast-allocator', allocator, "preferred_order: ['ready', 'queue_ready', 'role_ready', 'recovery']");
must('fast-allocator', allocator, 'METABOLISM_POLICY_V1.json');
must('fast-allocator', allocator, 'role_ready');
must('fast-allocator', allocator, "role: 'GUIDE_PLANNER'");
must('fast-allocator', allocator, "role: 'GUIDE_INTEGRATOR'");
must('fast-allocator', allocator, "role: 'GUIDE_RESCATE'");
must('fast-allocator', allocator, "role: 'GUIDE_CRITIC'");
must('fast-allocator', allocator, "claim_mode: 'GUIDE_ROLE_PIN_CREATE'");
must('fast-allocator', allocator, "schema: 'prometeo.guide-role-pin/v1'");
must('fast-allocator', allocator, 'frontier_floor_absolute');
must('fast-allocator', allocator, 'max_recovery_snapshot_age_seconds: 90');
must('fast-allocator', allocator, 'claim_path:');
must('fast-allocator', allocator, 'claim_payload_shape:');
must('fast-allocator', allocator, "mode: 'fixed_generation'");
must('fast-allocator', allocator, 'ordinary_next_generation_eligible');
must('fast-allocator', allocator, 'fixed_generation_attention');
must('fast-allocator', allocator, 'loadRecoveryPolicies');
must('fast-allocator', allocator, "'recovery-policies'");
mustNot('fast-allocator', allocator, 'portfolio-exclusive-job-pin-live-race-5-v1');

const portfolioPayloadStart = allocator.indexOf("schema: 'prometeo.portfolio-pin/v1'");
const portfolioPayloadEnd = portfolioPayloadStart >= 0 ? allocator.indexOf('predecessor_pin_ref: predecessor', portfolioPayloadStart) : -1;
const portfolioPayload = portfolioPayloadStart >= 0 && portfolioPayloadEnd > portfolioPayloadStart ? allocator.slice(portfolioPayloadStart, portfolioPayloadEnd) : '';
if (!portfolioPayload) errors.push('fast-allocator: cannot isolate portfolio claim_payload_shape');
for (const field of ['schema','pin_id','job_id','dedupe_key','project_id','generation','worker_id','claim_id','claimed_at','expires_at','source_head','predecessor_pin_ref_or_null','predecessor_claim_ref_or_null','recovery_basis_or_null']) {
  must('fast-allocator-portfolio-payload', portfolioPayload, `${field}:`);
}
must('fast-allocator-portfolio-payload', portfolioPayload, "'<worker_id>'");
must('fast-allocator-portfolio-payload', portfolioPayload, "'<now_iso>'");
must('fast-allocator-portfolio-payload', portfolioPayload, "'<now_plus_10m_iso>'");
must('fast-allocator-portfolio-payload', portfolioPayload, 'feed.source_sha');

const rolePayloadStart = allocator.indexOf("schema: 'prometeo.guide-role-pin/v1'");
const rolePayloadEnd = rolePayloadStart >= 0 ? allocator.indexOf('post_claim_validate: true', rolePayloadStart) : -1;
const rolePayload = rolePayloadStart >= 0 && rolePayloadEnd > rolePayloadStart ? allocator.slice(rolePayloadStart, rolePayloadEnd) : '';
if (!rolePayload) errors.push('fast-allocator: cannot isolate guide role claim_payload_shape');
for (const field of ['schema','pin_id','guide_work_id','role','trigger','generation','worker_id','claim_id','claimed_at','expires_at','source_head','evidence','predecessor_pin_ref_or_null']) {
  must('fast-allocator-role-payload', rolePayload, `${field}:`);
}

const fixedPolicy = read(root, 'coordination/portfolio/recovery-policies/portfolio-exclusive-job-pin-live-race-5-v1.json');
must('fixed-generation-policy', fixedPolicy, '"mode": "fixed_generation"');
must('fixed-generation-policy', fixedPolicy, '"fixed_generation": 1');
must('fixed-generation-policy', fixedPolicy, '"ordinary_next_generation_eligible": false');
must('fixed-generation-policy', fixedPolicy, '"attention_route": "FIXED_GENERATION_RECONCILE"');

const fixedRecoveryTest = read(root, 'coordination/portfolio/tests/fixed_generation_recovery_filter_v1.mjs');
must('fixed-generation-test', fixedRecoveryTest, "job_id: 'fixture-arbitrary-id'");
must('fixed-generation-test', fixedRecoveryTest, "job_id: 'ordinary-retry-safe'");
must('fixed-generation-test', fixedRecoveryTest, 'fixed_generation_attention');
must('fixed-generation-test', fixedRecoveryTest, 'fixed-generation fixture leaked into ordinary recovery');

const normalize = read(root, '.github/scripts/normalize-live-feed.mjs');
must('live-normalizer', normalize, 'NO_ALLOCATION_GRACE_MS = 45_000');
must('live-normalizer', normalize, 'superseded_owner_attempts_suppressed');
const roleLive = read(root, '.github/scripts/augment-live-role-workers.mjs');
must('live-role-projection', roleLive, 'prometeo.guide-role-pin/v1');
must('live-role-projection', roleLive, "project:'Guide'");
must('live-role-projection', roleLive, 'guide_role_assignments_projected');

const runtime = read(root, 'scripts/build-efficiency-snapshot.mjs');
must('efficiency-runtime', runtime, 'baseline.runtime_baseline_activated_at || baseline.updated_at');
must('efficiency-runtime', runtime, "status==='REGRESSION'");
must('efficiency-runtime', runtime, 'ONE_SYSTEM_BOTTLENECK_NOT_PER_WORKER');
must('efficiency-runtime', runtime, "execFileSync('git'");
must('efficiency-runtime', runtime, "measurement_clock:'GIT_COMMIT_TIME_PREFERRED'");
must('efficiency-runtime', runtime, 'claim_transport_blocked');

if (site) {
  const pointer = read(site, 'wc/index.html');
  must('public-wc', pointer, 'PROMETEO /wc — CLAIM NOW');
  must('public-wc', pointer, 'CANONICAL HUMAN INVOCATION TO COPY:');
  must('public-wc', pointer, 'autorizo beacon, PIN/claim y commits reversibles necesarios');
  must('public-wc', pointer, 'Before ownership, do NOT load Guide, Metabolism, page protocols');
  mustI('public-wc', pointer, 'create your beacon, read ONE allocator snapshot, then attempt atomic claim/PIN immediately');
  must('public-wc', pointer, 'READY -> QUEUE_READY -> ROLE_READY -> RECOVERY');
  must('public-wc', pointer, 'ROLE_READY is centrally compiled latent work');
  must('public-wc', pointer, 'CLAIM_TRANSPORT_BLOCKED');
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
