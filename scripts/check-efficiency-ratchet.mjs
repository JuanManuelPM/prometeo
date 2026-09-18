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
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006','EFF007','EFF008','EFF009','EFF010','EFF011','EFF012','EFF013','EFF014','EFF015','EFF016','EFF017','EFF018','EFF019','EFF020','EFF021','EFF022','EFF023','EFF024','EFF025','EFF026','EFF027','EFF028','EFF029']) {
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
if (capabilityItem?.required?.legacy_capability_requirements_alias_normalized !== true) errors.push('baseline: EFF020 legacy_capability_requirements_alias_normalized must be true');
if (capabilityItem?.required?.definitive_absence_only !== true) errors.push('baseline: EFF020 definitive_absence_only must be true');
if (capabilityItem?.required?.unknown_capability_is_not_absence !== true) errors.push('baseline: EFF020 unknown_capability_is_not_absence must be true');
if (capabilityItem?.required?.mismatch_consumes_authority_create_attempt !== false) errors.push('baseline: EFF020 mismatch must not consume authority CREATE attempt');
if (capabilityItem?.required?.legacy_capability_required_singular_normalized !== true) errors.push('baseline: EFF020 singular capability_required normalization must be true');
if (capabilityItem?.required?.legacy_capability_required_alias_map?.real_browser_execution !== 'representative_javascript_browser') errors.push('baseline: EFF020 real_browser_execution alias drift');
if (capabilityItem?.required?.unsupported_legacy_capability_required_fail_closed_attention !== true) errors.push('baseline: EFF020 unsupported singular legacy capabilities must fail closed to attention');
if (capabilityItem?.required?.recovery_capability_metadata_from_legacy_singular_preserved !== true) errors.push('baseline: EFF020 singular legacy recovery metadata must be preserved');
if (capabilityItem?.required?.jose_v12_legacy_singular_fixture_capability_bound !== true) errors.push('baseline: EFF020 Jose V12 singular fixture must remain capability-bound');
const batchingItem = baseline?.items?.find(x=>x.id==='EFF021');
if (batchingItem?.required?.batched_unified_candidate_sharding !== true) errors.push('baseline: EFF021 unified batch sharding must be true');
if (batchingItem?.required?.batch_strategy !== 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD') errors.push('baseline: EFF021 batch strategy drift');
if (batchingItem?.required?.batched_reimpose_lane_priority_forbidden !== true) errors.push('baseline: EFF021 batched workers must not re-impose lane priority');
if (batchingItem?.required?.unbatched_lane_priority_preserved !== true) errors.push('baseline: EFF021 unbatched lane priority must remain preserved');
if (batchingItem?.required?.seed_source !== 'beacon_commit_sha_first_8_hex') errors.push('baseline: EFF021 seed source drift');
if (batchingItem?.required?.capability_filter_before_hash !== true) errors.push('baseline: EFF021 capability filter before hash drift');
if (batchingItem?.required?.compatibility_source !== 'allocator_required_capabilities_plus_known_runtime_surface') errors.push('baseline: EFF021 compatibility source drift');
if (batchingItem?.required?.definitively_absent_only !== true) errors.push('baseline: EFF021 must filter only definitively absent capabilities');
if (batchingItem?.required?.unknown_capability_retained !== true) errors.push('baseline: EFF021 unknown capabilities must remain eligible');
if (batchingItem?.required?.filtered_view_preserves_published_order !== true) errors.push('baseline: EFF021 filtered view order drift');
if (batchingItem?.required?.collision_rotation_within_filtered_view !== true) errors.push('baseline: EFF021 collision rotation must stay inside filtered view');
if (batchingItem?.required?.empty_filtered_view_attempts_zero_authority_creates !== true) errors.push('baseline: EFF021 empty compatible view must not attempt authority CREATE');
const roleSignalItem = baseline?.items?.find(x=>x.id==='EFF022');
if (roleSignalItem?.required?.bounded_recent_return_evidence !== true) errors.push('baseline: EFF022 compact Guide signal cable must be true');
if (roleSignalItem?.required?.allocator_consumes_compact_role_evidence !== true) errors.push('baseline: EFF022 allocator compact evidence consumption must be true');
if (roleSignalItem?.required?.full_authority_histories_stripped_from_public_projects !== true) errors.push('baseline: EFF022 full authority histories must remain stripped');
if (roleSignalItem?.required?.collision_pressure_window_minutes !== 30) errors.push('baseline: EFF022 collision pressure window drift');
const compactFrontierItem = baseline?.items?.find(x=>x.id==='EFF023');
if (compactFrontierItem?.required?.compact_frontier !== 'live/claim-frontier.json') errors.push('baseline: EFF023 compact frontier path drift');
if (compactFrontierItem?.required?.schema !== 'prometeo.claim-frontier/v1') errors.push('baseline: EFF023 schema drift');
if (compactFrontierItem?.required?.max_candidates !== 24) errors.push('baseline: EFF023 candidate bound drift');
if (compactFrontierItem?.required?.full_allocator_preclaim_forbidden !== true) errors.push('baseline: EFF023 full allocator must stay off hot path');
const compoundingItem = baseline?.items?.find(x=>x.id==='EFF024');
if (compoundingItem?.required?.productive_units_checkpoint !== 3) errors.push('baseline: EFF024 productive checkpoint drift');
if (compoundingItem?.required?.productive_units_target !== 6) errors.push('baseline: EFF024 productive target drift');
if (compoundingItem?.required?.productive_units_hard_cap !== 8) errors.push('baseline: EFF024 productive hard cap drift');
if (compoundingItem?.required?.same_project_soft_cap !== 2) errors.push('baseline: EFF024 same-project soft cap drift');
if (compoundingItem?.required?.same_worker_id_across_chain !== true) errors.push('baseline: EFF024 worker identity must persist across chain');
if (compoundingItem?.required?.reenter_compact_frontier_after_each_productive_return !== true) errors.push('baseline: EFF024 compact frontier re-entry must remain true');
if (compoundingItem?.required?.early_exit_with_compatible_frontier_forbidden !== true) errors.push('baseline: EFF024 early exit with frontier must stay forbidden');
if (compoundingItem?.required?.bounded_assist_children_max !== 2) errors.push('baseline: EFF024 assist child bound drift');
if (compoundingItem?.required?.assist_parent_retains_integration_authority !== true) errors.push('baseline: EFF024 parent integration authority drift');
if (compoundingItem?.required?.assist_non_overlapping_scopes_required !== true) errors.push('baseline: EFF024 assist scopes must remain non-overlapping');
if (compoundingItem?.required?.telemetry_close_only_at_chat_close !== true) errors.push('baseline: EFF024 CLOSE must be terminal to the chat chain');
if (compoundingItem?.required?.regression_test !== 'scripts/check-efficiency-ratchet.mjs') errors.push('baseline: EFF024 regression guard drift');
if (compoundingItem?.required?.workflow_guard !== '.github/workflows/efficiency-ratchet.yml') errors.push('baseline: EFF024 workflow guard drift');
const branchHeadItem = baseline?.items?.find(x=>x.id==='EFF025');
if (branchHeadItem?.required?.explicit_ref_head_move_classification !== 'BRANCH_HEAD_MOVED') errors.push('baseline: EFF025 branch-head classification drift');
if (branchHeadItem?.required?.same_exact_create_retry_max !== 1) errors.push('baseline: EFF025 retry bound drift');
if (branchHeadItem?.required?.head_move_retry_consumes_authority_attempt !== false) errors.push('baseline: EFF025 branch-head retry must not consume authority attempt');
if (branchHeadItem?.required?.pre_read_before_retry_forbidden !== true) errors.push('baseline: EFF025 pre-read must remain forbidden');
if (branchHeadItem?.required?.second_consecutive_head_move !== 'CLAIM_TRANSPORT_UNSTABLE') errors.push('baseline: EFF025 second head move classification drift');
const sourceDebtPlannerItem = baseline?.items?.find(x=>x.id==='EFF026');
if (sourceDebtPlannerItem?.required?.project_guide_source_debt_gate !== true) errors.push('baseline: EFF026 source-debt planner gate must be true');
if (sourceDebtPlannerItem?.required?.status !== 'SOURCE_DEBT') errors.push('baseline: EFF026 status drift');
if (sourceDebtPlannerItem?.required?.require_empty_frontier_refs !== true) errors.push('baseline: EFF026 empty-frontier predicate drift');
if (sourceDebtPlannerItem?.required?.required_blocker_prefix !== 'NEW_EVIDENCE_GATE:') errors.push('baseline: EFF026 blocker prefix drift');
if (sourceDebtPlannerItem?.required?.suppress_trigger !== 'PROJECT_FRONTIER_THIN') errors.push('baseline: EFF026 trigger drift');
const noAllocationWindowItem = baseline?.items?.find(x=>x.id==='EFF028');
if (noAllocationWindowItem?.required?.global_runtime_epoch_preserved !== true) errors.push('baseline: EFF028 global runtime epoch must be preserved');
if (noAllocationWindowItem?.required?.historical_no_allocation_metrics_preserved !== true) errors.push('baseline: EFF028 historical no-allocation metrics must be preserved');
if (noAllocationWindowItem?.required?.no_allocation_regression_uses_recent_durable_events !== true) errors.push('baseline: EFF028 recent durable-event window drift');
if (noAllocationWindowItem?.required?.no_allocation_regression_window_minutes !== 10) errors.push('baseline: EFF028 no-allocation regression window drift');
if (noAllocationWindowItem?.required?.current_metric !== 'no_allocation_close_p90_recent_ms') errors.push('baseline: EFF028 current metric drift');
if (noAllocationWindowItem?.required?.regression_threshold_ms !== 90000) errors.push('baseline: EFF028 threshold drift');
if (noAllocationWindowItem?.required?.regression_test !== 'coordination/portfolio/tests/efficiency_recent_no_allocation_regression_v1.mjs') errors.push('baseline: EFF028 regression test drift');

const wc = read(root, 'wc');
must('wc', wc, 'CLAIM NOW');
must('wc', wc, 'Read ONE compact claim frontier directly:');
must('wc', wc, 'gh-pages:live/claim-frontier.json');
must('wc', wc, '`live/allocator.json` is diagnostics only and is FORBIDDEN on the ordinary preclaim path.');
must('wc', wc, 'first 8 hex chars of beacon_commit_sha');
must('wc', wc, 'Maximum 3 fast CREATE attempts');
must('wc', wc, 'Lane diversification: after 2 CREATE_EXISTS outcomes in the same lane');
must('wc', wc, '`BRANCH_HEAD_MOVED`');
must('wc', wc, 'retry the same exact claim path and payload once');
must('wc', wc, 'does NOT consume an authority CREATE attempt');
must('wc', wc, '`CLAIM_TRANSPORT_UNSTABLE`');
mustNot('wc', wc, 'CREATE_EXISTS/CAS_LOST');
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
must('wc', wc, 'PRODUCTIVE CHAIN — SAME CHAT');
must('wc', wc, '**3 productive units is a checkpoint, not a stop**. Target **6 productive units**; hard cap **8**.');
must('wc', wc, 'at most **2 consecutive productive units in the same project**');
must('wc', wc, 'WAVE RESIDENCY / ASSIST');
must('wc', wc, 'at most **2** ordinary derived assist jobs');
must('wc', wc, 'The parent owner (or a later explicit steward) retains integration authority.');
must('wc', wc, 'Cross-worker help is advertised only through durable assist jobs');
must('wc', wc, 'Healthy resident compounding worker:');
must('wc-close', wc, '`CLOSE`: once when the worker/chat chain finally closes');
must('wc-close', wc, 'Intermediate durable RETURN/guide receipts do NOT emit lifecycle `CLOSE`.');
must('wc-close', wc, 'do NOT emit lifecycle `CLOSE` after an intermediate durable RETURN/guide receipt');
mustNot('wc-close', wc, '`CLOSE`: once at RETURN or terminal STOP.');
mustNot('wc-close', wc, 'emit one best-effort `CLOSE` event to issue #22 after durable RETURN/terminal STOP');


const fast = read(root, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
must('fast-allocation', fast, 'read ONE compact claim-frontier snapshot');
must('fast-allocation', fast, '1. `ready` portfolio work;');
must('fast-allocation', fast, '2. `queue_ready` normal work;');
must('fast-allocation', fast, '3. `role_ready` centrally compiled Guide work;');
must('fast-allocation', fast, '4. only then `recovery` work.');
must('fast-allocation', fast, 'After 2 `CREATE_EXISTS` outcomes in the same lane');
must('fast-allocation', fast, '`BRANCH_HEAD_MOVED`');
must('fast-allocation', fast, 'same exact claim path and byte-identical payload once');
must('fast-allocation', fast, 'does not consume one of the 3 authority candidate attempts');
must('fast-allocation', fast, '`CLAIM_TRANSPORT_UNSTABLE`');
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
must('fast-allocation', fast, 'claim-frontier.candidates');
must('fast-allocation', fast, 'gh-pages:live/claim-frontier.json');
must('fast-allocation', fast, 'first 8 hex chars of beacon_commit_sha');
must('fast-allocation', fast, 'Do not re-impose lane priority locally for a batched worker');
must('fast-allocation', fast, 'batch_compatible_candidates');
mustI('fast-allocation', fast, 'definitively incompatible candidates before the hash');

const projectGuideMesh = JSON.parse(read(root, 'coordination/guide/PROJECT_GUIDE_MESH_V1.json'));
if (projectGuideMesh.worker_chain_checkpoint_productive_units !== 3) errors.push('project-guide-mesh: checkpoint drift');
if (projectGuideMesh.worker_chain_target_productive_units !== 6) errors.push('project-guide-mesh: chain target drift');
if (projectGuideMesh.worker_chain_max_productive_units !== 8) errors.push('project-guide-mesh: chain hard cap drift');
if (projectGuideMesh.worker_chain_same_project_soft_cap !== 2) errors.push('project-guide-mesh: same-project soft cap drift');
if (projectGuideMesh?.worker_residency?.early_exit_with_compatible_frontier_forbidden !== true) errors.push('project-guide-mesh: resident early-exit law drift');
if (projectGuideMesh?.assist_protocol?.max_children_per_owned_job !== 2) errors.push('project-guide-mesh: assist child bound drift');
if (projectGuideMesh.source_debt_planner_gate?.enabled !== true) errors.push('project-guide-mesh: source debt planner gate must be enabled');
if (projectGuideMesh.source_debt_planner_gate?.status !== 'SOURCE_DEBT') errors.push('project-guide-mesh: source debt planner status drift');
if (projectGuideMesh.source_debt_planner_gate?.require_empty_frontier_refs !== true) errors.push('project-guide-mesh: source debt planner must require empty frontier');
if (projectGuideMesh.source_debt_planner_gate?.required_blocker_prefix !== 'NEW_EVIDENCE_GATE:') errors.push('project-guide-mesh: source debt planner blocker prefix drift');

const eventProtocol = read(root, 'coordination/workers/WORKER_EVENT_STREAM_V1.md');
must('worker-events', eventProtocol, 'Issue: https://github.com/JuanManuelPM/prometeo/issues/22');
must('worker-events', eventProtocol, 'Observability is best-effort and non-authoritative.');
must('worker-events', eventProtocol, 'THREE EVENTS ONLY');
must('worker-events', eventProtocol, 'ROUTED');
must('worker-events', eventProtocol, 'CLAIM_RESULT');
must('worker-events', eventProtocol, 'CLOSE');
mustI('worker-events', eventProtocol, 'never launch workers to repair missing telemetry');
must('worker-events-close', eventProtocol, 'Intermediate RETURN/guide receipts do not emit CLOSE.');
mustNot('worker-events-close', eventProtocol, 'At RETURN/terminal STOP.');

const workerRuntime = read(root, 'scripts/build-worker-runtime.mjs');
must('worker-runtime', workerRuntime, "schema:'prometeo.worker-runtime/v1'");
must('worker-runtime', workerRuntime, "issue_number:22");
must('worker-runtime', workerRuntime, "measurement_clock:'GITHUB_COMMENT_SERVER_TIME_PLUS_BEACON_DECLARED_TIME'");
must('worker-runtime', workerRuntime, 'beaconDocs');
must('worker-runtime', workerRuntime, "routed?'ROUTED':'BEACONED'");
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

const efficiencyWorkflow = read(root, '.github/workflows/efficiency-ratchet.yml');
must('efficiency-workflow', efficiencyWorkflow, 'Check recent no-allocation efficiency regression');
must('efficiency-workflow', efficiencyWorkflow, 'efficiency_recent_no_allocation_regression_v1.mjs');

const live = read(root, '.github/workflows/live-feed.yml');
must('live-workflow', live, 'cancel-in-progress: false');
must('live-workflow', live, 'fetch-depth: 500');
must('live-workflow', live, "'coordination/guide/**'");
must('live-workflow', live, '.github/scripts/augment-live-role-workers.mjs');
must('live-workflow', live, 'scripts/build-efficiency-snapshot.mjs');
must('live-workflow', live, 'scripts/build-fast-allocator.mjs');
must('live-workflow', live, 'scripts/build-claim-frontier.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/claim_frontier_compact_v1.mjs');
must('live-workflow', live, 'live/claim-frontier.json');
must('live-workflow', live, 'scripts/apply-project-coverage.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/project_coverage_allocator_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/batched_lane_sharding_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/role_signal_compaction_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/claim_branch_head_move_retry_v1.mjs');
must('live-workflow', live, 'coordination/portfolio/tests/project_guide_source_debt_gate_v1.mjs');
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
must('fast-allocator', allocator, 'export function classifyJobCapabilities(job = {})');
must('fast-allocator', allocator, "real_browser_execution: ['representative_javascript_browser']");
must('fast-allocator', allocator, 'job?.capability_required');
must('fast-allocator', allocator, "reason: 'UNSUPPORTED_LEGACY_CAPABILITY_REQUIRED'");
must('fast-allocator', allocator, "route: 'CAPABILITY_TAXONOMY_ATTENTION'");
must('fast-allocator', allocator, 'capability_attention: capabilityAttention.length');
must('fast-allocator', allocator, '.filter(jobCapabilityRouteable)');
must('fast-allocator', allocator, 'required_capabilities: jobRequiredCapabilities(job)');
must('fast-allocator', allocator, 'source_path: job.source_path || null');
must('fast-allocator', allocator, 'item.predecessor_pin_ref || item.source_path ||');
must('fast-allocator', allocator, 'claim_path:');
must('fast-allocator', allocator, 'claim_payload_shape:');
must('fast-allocator', allocator, "mode: 'fixed_generation'");
must('fast-allocator', allocator, 'ordinary_next_generation_eligible');
must('fast-allocator', allocator, 'fixed_generation_attention');
must('fast-allocator', allocator, 'loadRecoveryPolicies');
must('fast-allocator', allocator, "'recovery-policies'");
must('fast-allocator', allocator, 'projectPlannerSuppressedBySourceDebt');
must('fast-allocator', allocator, 'plannerSuppressed');
must('fast-allocator', allocator, 'row.gap > 0 && !row.plannerSuppressed');
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
must('batch-sharding-test', batchShardingTest, 'beacon_commit_sha_first_8_hex');
must('batch-sharding-test', batchShardingTest, 'BATCHED_CAPABILITY_FILTERED_SHARDING_PASS');

const recentNoAllocationTest = read(root, 'coordination/portfolio/tests/efficiency_recent_no_allocation_regression_v1.mjs');
must('recent-no-allocation-test', recentNoAllocationTest, 'EFFICIENCY_RECENT_NO_ALLOCATION_REGRESSION_PASS');
must('recent-no-allocation-test', recentNoAllocationTest, 'no_allocation_close_p90_recent_ms');
must('recent-no-allocation-test', recentNoAllocationTest, 'historical-only tail must not pin current regression');

const eff027 = baseline.items?.find(item => item.id === 'EFF027');
if (!eff027) errors.push('ratchet: EFF027 missing');
else {
  if (eff027.required?.batched_capability_filter_before_hash !== true) errors.push('ratchet: EFF027 filter-before-hash drift');
  if (eff027.required?.stable_survivor_order !== true) errors.push('ratchet: EFF027 survivor-order drift');
  if (eff027.required?.unknown_capability_is_not_absence !== true) errors.push('ratchet: EFF027 unknown-capability drift');
  if (eff027.required?.no_extra_preclaim_reads_or_writes !== true) errors.push('ratchet: EFF027 preclaim-overhead drift');
}

const eff029 = baseline.items?.find(item => item.id === 'EFF029');
if (!eff029) errors.push('ratchet: EFF029 missing');
else {
  if (eff029.required?.source_debt_time_only_retry_suppressed !== true) errors.push('ratchet: EFF029 time-only SOURCE_DEBT suppression drift');
  if (eff029.required?.unresolved_attention_preserved !== true) errors.push('ratchet: EFF029 unresolved attention drift');
  if (eff029.required?.next_pin_stamps_basis_fingerprint !== true) errors.push('ratchet: EFF029 basis fingerprint drift');
  if (eff029.required?.silent_owner_recovery_preserved !== true) errors.push('ratchet: EFF029 silent-owner recovery drift');
}

must('fast-allocator', allocator, 'recoveryBasisGate');
must('fast-allocator', allocator, 'SOURCE_DEBT_BASIS_UNCHANGED');
must('fast-allocator', allocator, 'recovery_attention: recoveryAttention');
must('live-feed', liveBuilder, 'latest_pin_recovery_basis:latestPin?.doc?.recovery_basis_or_null || null');
const sourceDebtRecoveryTest = read(root, 'coordination/portfolio/tests/source_debt_recovery_basis_gate_v1.mjs');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SOURCE_DEBT_RECOVERY_BASIS_GATE_PASS');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SILENT_OWNER_STALE_AFTER_LAST_RETURN');

const claimFrontier = read(root, 'scripts/build-claim-frontier.mjs');
must('claim-frontier', claimFrontier, "schema:'prometeo.claim-frontier/v1'");
must('claim-frontier', claimFrontier, 'maxCandidates = 24');
must('claim-frontier', claimFrontier, 'claim_payload_shape');
const claimFrontierTest = read(root, 'coordination/portfolio/tests/claim_frontier_compact_v1.mjs');
must('claim-frontier-test', claimFrontierTest, 'CLAIM_FRONTIER_COMPACT_PASS');
must('claim-frontier-test', claimFrontierTest, 'bytes<64000');

const branchHeadRetryTest = read(root, 'coordination/portfolio/tests/claim_branch_head_move_retry_v1.mjs');
must('branch-head-retry-test', branchHeadRetryTest, 'CLAIM_BRANCH_HEAD_MOVE_RETRY_PASS');
const sourceDebtPlannerTest = read(root, 'coordination/portfolio/tests/project_guide_source_debt_gate_v1.mjs');
must('source-debt-planner-test', sourceDebtPlannerTest, 'PROJECT_GUIDE_SOURCE_DEBT_GATE_PASS');
const capabilityFitTest = read(root, 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs');
must('capability-fit-test', capabilityFitTest, 'FAST_ALLOCATOR_CAPABILITY_FIT_PASS');
must('capability-fit-test', capabilityFitTest, 'unrestricted_public_http_origin_fetch');
must('capability-fit-test', capabilityFitTest, 'CAPABILITY_MISMATCH_PRECLAIM');
must('capability-fit-test', capabilityFitTest, 'legacySingularRows');
must('capability-fit-test', capabilityFitTest, 'real_browser_execution');
must('capability-fit-test', capabilityFitTest, 'authorityCreateAttempts');
must('capability-fit-test', capabilityFitTest, 'unknown_legacy_runtime');
must('capability-fit-test', capabilityFitTest, 'capability_attention');

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
  mustI('public-wc', pointer, 'create your beacon, read ONE compact claim frontier, then attempt atomic claim/PIN immediately');
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
