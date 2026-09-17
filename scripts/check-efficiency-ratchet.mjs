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
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006','EFF007','EFF008','EFF009','EFF010','EFF011','EFF012','EFF013','EFF014','EFF015','EFF016','EFF017','EFF018','EFF019','EFF020','EFF021','EFF022']) {
  if (!baseline?.items?.some(x => x.id === id)) errors.push(`baseline: missing ${id}`);
}
if (!baseline?.runtime_baseline_activated_at) errors.push('baseline: missing runtime_baseline_activated_at');
const latentItem = baseline?.items?.find(x=>x.id==='EFF013');
if (latentItem?.required?.role_ready_compiled_centrally !== true) errors.push('baseline: EFF013 role_ready_compiled_centrally must be true');
if (JSON.stringify(latentItem?.required?.candidate_order) !== JSON.stringify(['ready','queue_ready','role_ready','recovery'])) errors.push('baseline: EFF013 candidate order drift');
const evidenceIntegrityItem = baseline?.items?.find(x=>x.id==='EFF017');
if (evidenceIntegrityItem?.required?.portfolio_fragment_semantics_validated !== true) errors.push('baseline: EFF017 portfolio_fragment_semantics_validated must be true');
if (evidenceIntegrityItem?.required?.derived_recovery_source_path_preserved !== true) errors.push('baseline: EFF017 derived_recovery_source_path_preserved must be true');
const capabilityItem = baseline?.items?.find(x=>x.id==='EFF020');
if (capabilityItem?.required?.portfolio_required_capabilities_compiled !== true) errors.push('baseline: EFF020 portfolio_required_capabilities_compiled must be true');
if (capabilityItem?.required?.definitive_absence_only !== true) errors.push('baseline: EFF020 definitive_absence_only must be true');
if (capabilityItem?.required?.unknown_capability_is_not_absence !== true) errors.push('baseline: EFF020 unknown_capability_is_not_absence must be true');
if (capabilityItem?.required?.mismatch_consumes_authority_create_attempt !== false) errors.push('baseline: EFF020 mismatch must not consume authority CREATE attempt');
const batchingItem = baseline?.items?.find(x=>x.id==='EFF021');
if (batchingItem?.required?.batched_unified_candidate_sharding !== true) errors.push('baseline: EFF021 unified batch sharding must be true');
if (batchingItem?.required?.batch_strategy !== 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD') errors.push('baseline: EFF021 batch strategy drift');
if (batchingItem?.required?.batched_reimpose_lane_priority_forbidden !== true) errors.push('baseline: EFF021 batched workers must not re-impose lane priority');
if (batchingItem?.required?.unbatched_lane_priority_preserved !== true) errors.push('baseline: EFF021 unbatched lane priority must remain preserved');
const roleSignalItem = baseline?.items?.find(x=>x.id==='EFF022');
if (roleSignalItem?.required?.bounded_recent_return_evidence !== true) errors.push('baseline: EFF022 compact Guide signal cable must be true');
if (roleSignalItem?.required?.allocator_consumes_compact_role_evidence !== true) errors.push('baseline: EFF022 allocator compact evidence consumption must be true');
if (roleSignalItem?.required?.full_authority_histories_stripped_from_public_projects !== true) errors.push('baseline: EFF022 full authority histories must remain stripped');
if (roleSignalItem?.required?.collision_pressure_window_minutes !== 30) errors.push('baseline: EFF022 collision pressure window drift');

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
must('wc', wc, 'Do not pre-read those directories. CREATE first after the bounded structural/capability checks.');
must('wc', wc, 'A worker without PIN/claim owns nothing and creates NO recovery debt.');
must('wc', wc, 'Known efficiency wins are cumulative durable constraints, not chat memory.');
must('wc', wc, 'The authorization must come from the HUMAN MESSAGE itself.');
must('wc', wc, 'CLAIM_TRANSPORT_BLOCKED');
must('wc', wc, 'STOP immediately; do not spend attempts 2–3');
must('wc', wc, 'candidate.claim_payload_shape');
must('wc', wc, 'ALLOCATOR_PIN_PAYLOAD_INVALID');
must('wc', wc, '<now_plus_10m_iso>');
must('wc', wc, 'Never CREATE an immutable malformed pin');
must('wc', wc, 'WAVE OBSERVABILITY — NON-BLOCKING');
must('wc', wc, 'OBSERVABILITY MUST NEVER BLOCK COORDINATION');
must('wc', wc, 'ROUTED');
must('wc', wc, 'CLAIM_RESULT');
must('wc', wc, 'CLOSE');
must('wc', wc, 'Issue #22');
must('wc', wc, 'candidate.required_capabilities');
must('wc', wc, 'CAPABILITY_MISMATCH_PRECLAIM');
must('wc', wc, 'Unknown or ambiguous capability is NOT absence');
must('wc', wc, 'Never read repository/project context to prove capability fit.');


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
must('fast-allocation', fast, 'candidate.required_capabilities');
must('fast-allocation', fast, 'CAPABILITY_MISMATCH_PRECLAIM');
must('fast-allocation', fast, 'Unknown or ambiguous capability is NOT absence');
must('fast-allocation', fast, 'does not consume an authority CREATE attempt');
must('fast-allocation', fast, 'Batched unified candidate sharding');
must('fast-allocation', fast, 'batch_candidates');
must('fast-allocation', fast, 'Do not re-impose lane priority locally for a batched worker');

const eventProtocol = read(root, 'coordination/workers/WORKER_EVENT_STREAM_V1.md');
must('worker-events', eventProtocol, 'Issue: https://github.com/JuanManuelPM/prometeo/issues/22');
must('worker-events', eventProtocol, 'Observability is best-effort and non-authoritative.');
must('worker-events', eventProtocol, 'THREE EVENTS ONLY');
must('worker-events', eventProtocol, 'ROUTED');
must('worker-events', eventProtocol, 'CLAIM_RESULT');
must('worker-events', eventProtocol, 'CLOSE');
mustI('worker-events', eventProtocol, 'never launch workers to repair missing telemetry');

const workerRuntime = read(root, 'scripts/build-worker-runtime.mjs');
must('worker-runtime', workerRuntime, "schema:'prometeo.worker-runtime/v1'");
must('worker-runtime', workerRuntime, "issue_number:22");
must('worker-runtime', workerRuntime, "measurement_clock:'GITHUB_COMMENT_SERVER_TIME'");
must('worker-runtime', workerRuntime, "truth_boundary:'OBSERVABILITY_ONLY_GITHUB_PINS_REMAIN_AUTHORITY'");

const workerRuntimeWorkflow = read(root, '.github/workflows/worker-runtime-events.yml');
must('worker-runtime-workflow', workerRuntimeWorkflow, 'issue_comment:');
must('worker-runtime-workflow', workerRuntimeWorkflow, 'github.event.issue.number == 22');
must('worker-runtime-workflow', workerRuntimeWorkflow, 'cancel-in-progress: false');
must('worker-runtime-workflow', workerRuntimeWorkflow, 'live/runtime.json');
must('worker-runtime-workflow', workerRuntimeWorkflow, 'worker-runtime-events-v1.test.mjs');

const workerRuntimeTest = read(root, 'tests/worker-runtime-events-v1.test.mjs');
must('worker-runtime-test', workerRuntimeTest, 'WORKER_RUNTIME_EVENTS_PASS');

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
must('live-workflow', live, 'scripts/apply-project-coverage.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/project_coverage_allocator_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/batched_lane_sharding_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/role_signal_compaction_v1.mjs');
must('live-workflow', live, 'node source/scripts/build-fast-allocator.mjs /tmp/feed.json /tmp/efficiency.json /tmp/allocator.json source');
must('live-workflow', live, 'node source/scripts/apply-project-coverage.mjs /tmp/allocator.json /tmp/feed.json /tmp/allocator.json source');
must('live-workflow', live, 'live/efficiency.json');

const allocator = read(root, 'scripts/build-fast-allocator.mjs');
must('fast-allocator', allocator, "schema: 'prometeo.fast-allocator/v3'");
must('fast-allocator', allocator, "batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD'");
must('fast-allocator', allocator, 'batch_candidates: batchCandidates.slice(0, 40)');
must('fast-allocator', allocator, 'returnEvidenceRows');
must('fast-allocator', allocator, 'collisionEvidenceRows');
must('fast-allocator', allocator, 'collision_pressure_window_minutes');
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
must('fast-allocator', allocator, 'required_capabilities: uniq(job.required_capabilities)');
must('fast-allocator', allocator, 'source_path: job.source_path || null');
must('fast-allocator', allocator, 'item.predecessor_pin_ref || item.source_path ||');
must('fast-allocator', allocator, 'claim_path:');
must('fast-allocator', allocator, 'claim_payload_shape:');
must('fast-allocator', allocator, "mode: 'fixed_generation'");
must('fast-allocator', allocator, 'ordinary_next_generation_eligible');
must('fast-allocator', allocator, 'fixed_generation_attention');
must('fast-allocator', allocator, 'loadRecoveryPolicies');
must('fast-allocator', allocator, "'recovery-policies'");
mustNot('fast-allocator', allocator, 'portfolio-exclusive-job-pin-live-race-5-v1');

const liveBuilder = read(root, '.github/scripts/build-live-feed.mjs');
must('live-feed', liveBuilder, 'recent_return_evidence:returns.slice(-3)');
must('live-feed', liveBuilder, 'recent_collision_evidence:collisions.slice(-3)');
must('live-feed', liveBuilder, 'p.jobs.map(({returns,pins,claims,collisions,...j})=>j)');

const evidenceIntegrity = read(root, 'scripts/apply-role-evidence-integrity.mjs');
must('role-evidence-integrity', evidenceIntegrity, 'MISSING_REPO_LOCAL_FRAGMENT');
must('role-evidence-integrity', evidenceIntegrity, 'missing_repo_local_fragment_refs');
must('role-evidence-integrity', evidenceIntegrity, "localPath !== 'coordination/portfolio/PORTFOLIO.json'");

const coverage = read(root, 'scripts/apply-project-coverage.mjs');
must('project-coverage', coverage, "trigger: 'PROJECT_COVERAGE_GAP'");
must('project-coverage', coverage, "role: 'GUIDE_PLANNER'");
must('project-coverage', coverage, "claim_mode: 'GUIDE_ROLE_PIN_CREATE'");
must('project-coverage', coverage, "schema: 'prometeo.guide-role-pin/v1'");
must('project-coverage', coverage, "anti_starvation: 'OLDEST_UNCOVERED_THEN_PRIORITY'");
must('project-coverage', coverage, 'Math.min(8, gaps.length');
must('project-coverage', coverage, 'Math.max(3, target - currentClean)');
must('project-coverage', coverage, '!row.hasCleanReady && !row.hasActiveExecution && !row.hasActiveCoverage');
const coverageTest = read(root, 'coordination/portfolio/tests/project_coverage_allocator_v1.mjs');
must('project-coverage-test', coverageTest, 'PROJECT_COVERAGE_ALLOCATOR_PASS');
must('project-coverage-test', coverageTest, "projects.has('alpha')");
must('project-coverage-test', coverageTest, "!projects.has('gamma')");
must('project-coverage-test', coverageTest, "!projects.has('delta')");

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
for (const field of ['schema','pin_id','guide_work_id','generation','worker_id','claim_id','claimed_at','expires_at','source_head','evidence','predecessor_pin_ref_or_null']) {
  must('fast-allocator-role-payload', rolePayload, `${field}:`);
}
must('fast-allocator-role-payload', rolePayload, 'role,');
must('fast-allocator-role-payload', rolePayload, 'trigger,');

const roleSignalTest = read(root, 'coordination/portfolio/tests/role_signal_compaction_v1.mjs');
must('role-signal-test', roleSignalTest, 'ROLE_SIGNAL_COMPACTION_PASS');
must('role-signal-test', roleSignalTest, 'recent_return_evidence');
must('role-signal-test', roleSignalTest, 'recent_collision_evidence');

const batchShardingTest = read(root, 'coordination/portfolio/tests/batched_lane_sharding_v1.mjs');
must('batch-sharding-test', batchShardingTest, 'BATCHED_UNIFIED_SHARDING_PASS');
must('batch-sharding-test', batchShardingTest, 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD');

const capabilityFitTest = read(root, 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs');
must('capability-fit-test', capabilityFitTest, 'FAST_ALLOCATOR_CAPABILITY_FIT_PASS');
must('capability-fit-test', capabilityFitTest, 'unrestricted_public_http_origin_fetch');
must('capability-fit-test', capabilityFitTest, 'CAPABILITY_MISMATCH_PRECLAIM');

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
  must('public-wc', pointer, 'autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios');
  must('public-wc', pointer, 'Before ownership, do NOT load Guide, Metabolism, page protocols');
  mustI('public-wc', pointer, 'create your beacon, read ONE allocator snapshot, then attempt atomic claim/PIN immediately');
  must('public-wc', pointer, 'READY -> QUEUE_READY -> ROLE_READY -> RECOVERY');
  must('public-wc', pointer, 'ROLE_READY is centrally compiled latent work');
  must('public-wc', pointer, 'CLAIM_TRANSPORT_BLOCKED');
  must('public-wc', pointer, 'eventos de telemetría');
  must('public-wc', pointer, 'BATCH <batch_id> EXPECTED <n>');
  must('public-wc', pointer, 'Issue #22');
  must('public-wc', pointer, 'observability');
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
