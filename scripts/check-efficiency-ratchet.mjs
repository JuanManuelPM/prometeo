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
for (const id of ['EFF001','EFF002','EFF003','EFF004','EFF005','EFF006','EFF007','EFF008','EFF009','EFF010','EFF011','EFF012','EFF013','EFF014','EFF015','EFF016','EFF017','EFF018','EFF019','EFF020','EFF021','EFF022','EFF023','EFF024','EFF025','EFF026','EFF027','EFF028','EFF029','EFF030','EFF031','EFF032','EFF033','EFF034','EFF035','EFF036','EFF037','EFF038','EFF039','EFF040','EFF041','EFF042','EFF043','EFF044','EFF048','EFF050','EFF049','EFF051','EFF055','EFF056','EFF057']) {
  if (!baseline?.items?.some(x => x.id === id)) errors.push(`baseline: missing ${id}`);
}
if (!baseline?.runtime_baseline_activated_at) errors.push('baseline: missing runtime_baseline_activated_at');
const strategyExperimentItem = baseline?.items?.find(x=>x.id==='EFF051');
if (!strategyExperimentItem) errors.push('baseline: EFF051 missing');
else {
  if (strategyExperimentItem.required?.active_experiment_ref !== 'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json') errors.push('baseline: EFF051 experiment ref drift');
  if (strategyExperimentItem.required?.worker_protocol_version !== 'v3.30') errors.push('baseline: EFF051 protocol version drift');
  if (strategyExperimentItem.required?.applies_after !== 'OWNERSHIP') errors.push('baseline: EFF051 ownership boundary drift');
  if (strategyExperimentItem.required?.preclaim_reads_added !== 0) errors.push('baseline: EFF051 preclaim read regression');
  if (strategyExperimentItem.required?.claim_authority_unchanged !== true) errors.push('baseline: EFF051 claim authority drift');
  if (strategyExperimentItem.required?.preclaim_diagnostics_not_causal !== true) errors.push('baseline: EFF051 causal boundary drift');
  if (strategyExperimentItem.required?.growth_campaign_strategy_authority_forbidden !== true) errors.push('baseline: EFF051 campaign authority drift');
}
const strategyExperiment = JSON.parse(read(root, 'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json')||'{}');
if (strategyExperiment.status !== 'ACTIVE_CANARY' || strategyExperiment.applies_after !== 'OWNERSHIP') errors.push('strategy-experiment: active ownership boundary drift');
if (strategyExperiment?.authority_boundary?.preclaim_reads_added !== 0 || strategyExperiment?.authority_boundary?.claim_authority_changed !== false) errors.push('strategy-experiment: preclaim/authority regression');
const strategyExam = JSON.parse(read(root, 'coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json')||'{}');
if (strategyExam.current_worker_protocol_version !== 'v3.30') errors.push('strategy-experiment: exam protocol drift');
if (strategyExam?.strategy_measurement?.active_experiment_ref !== 'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json') errors.push('strategy-experiment: exam ref drift');
if (strategyExam?.pattern_measurement?.active_pattern_ref !== null) errors.push('strategy-experiment: retired pattern still active');
const strategyWc = read(root, 'wc');
must('strategy-wc', strategyWc, 'POOL POST-OWNERSHIP STRATEGY EXPERIMENT');
must('strategy-wc', strategyWc, 'WORKER_STRATEGY_EXPERIMENT_V1.json');
mustNot('strategy-wc', strategyWc, '### POOL YIELD-PATTERN REPRODUCTION');
const strategyScoreboard = read(root, 'scripts/build-worker-scoreboard.mjs');
must('strategy-scoreboard', strategyScoreboard, 'strategy_experiment_health');
must('strategy-scoreboard', strategyScoreboard, 'preclaim_diagnostics');
must('strategy-scoreboard', strategyScoreboard, 'experimental_productive_slots');
must('strategy-scoreboard', strategyScoreboard, 'assignment_hint');
must('strategy-scoreboard', strategyScoreboard, 'launch_measurements');
must('strategy-scoreboard', strategyScoreboard, 'growth_health');

const growthItem = baseline?.items?.find(x=>x.id==='EFF055');
if (!growthItem) errors.push('baseline: EFF055 missing');
else {
  if (growthItem.required?.worker_protocol_version !== 'v3.30') errors.push('baseline: EFF055 protocol drift');
  if (growthItem.required?.growth_policy_ref !== 'coordination/workers/WORKER_GROWTH_POLICY_V1.json') errors.push('baseline: EFF055 policy ref drift');
  if (growthItem.required?.every_beacon_has_launch_row !== true) errors.push('baseline: EFF055 beacon measurement drift');
  if (growthItem.required?.derived_launch_strategy_causality_forbidden !== true) errors.push('baseline: EFF055 causal leakage');
  if (growthItem.required?.strategy_balance_mode !== 'ADAPTIVE_MIN_SAMPLE_THEN_HASH_TIEBREAK') errors.push('baseline: EFF055 assignment mode drift');
  if (growthItem.required?.preclaim_reads_added !== 0) errors.push('baseline: EFF055 preclaim regression');
  if (growthItem.required?.control_overhead_soft_max_share !== 0.15) errors.push('baseline: EFF055 overhead budget drift');
  if (growthItem.required?.successor_relay_max_per_terminal_close !== 1) errors.push('baseline: EFF055 relay bound drift');
}
const growthPolicy = JSON.parse(read(root, 'coordination/workers/WORKER_GROWTH_POLICY_V1.json')||'{}');
if (growthPolicy.status !== 'ACTIVE_CANARY') errors.push('growth-policy: must be ACTIVE_CANARY');
if (growthPolicy.worker_protocol_min_version !== 'v3.30') errors.push('growth-policy: protocol drift');
if (growthPolicy?.automatic_launch_measurement?.synthesized_strategy_causality_forbidden !== true) errors.push('growth-policy: derived causal leakage');
if (growthPolicy?.strategy_balance?.assignment_mode !== 'ADAPTIVE_MIN_SAMPLE_THEN_HASH_TIEBREAK') errors.push('growth-policy: assignment mode drift');
if (growthPolicy?.strategy_balance?.read_timing !== 'POST_OWNERSHIP_ONLY') errors.push('growth-policy: assignment read timing drift');
if (growthPolicy?.strategy_balance?.preclaim_reads_added !== 0) errors.push('growth-policy: preclaim read regression');
if (growthPolicy?.value_budget?.control_overhead_soft_max_share !== 0.15) errors.push('growth-policy: overhead budget drift');
if (growthPolicy?.successor_relay?.max_new_successors_per_terminal_close !== 1) errors.push('growth-policy: relay bound drift');
if (growthPolicy?.capability_specialization?.status !== 'ACTIVE_PARALLEL') errors.push('growth-policy: S4 not parallel active');
if (growthPolicy?.value_budget?.status !== 'ACTIVE_PARALLEL') errors.push('growth-policy: S5 not parallel active');
must('strategy-wc', strategyWc, 'WORKER_GROWTH_POLICY_V1.json');
must('strategy-wc', strategyWc, 'SUCCESSOR RELAY');
const growthClaimFrontier = read(root, 'scripts/build-claim-frontier.mjs');
must('claim-frontier', growthClaimFrontier, 'postclaim_context');
must('claim-frontier', growthClaimFrontier, 'value_class');
const growthTest = read(root, 'tests/worker-growth-pipeline-v1.test.mjs');
must('growth-test', growthTest, 'launch_observation_coverage');
must('growth-test', growthTest, 'ADAPTIVE_MIN_SAMPLE_THEN_HASH_TIEBREAK');

const handoffItem = baseline?.items?.find(x=>x.id==='EFF056');
if (!handoffItem) errors.push('baseline: EFF056 missing');
else {
  if (handoffItem.required?.handoff_policy_ref !== 'coordination/guide/GUIDE_WORKER_HANDOFF_V1.json') errors.push('baseline: EFF056 policy ref drift');
  if (handoffItem.required?.exhaustive_same_turn_before_handoff !== true) errors.push('baseline: EFF056 exhaustive handoff drift');
  if (handoffItem.required?.canonical_prompt_first_copyable_block !== true) errors.push('baseline: EFF056 prompt-first drift');
  if (handoffItem.required?.approximate_count_required !== true) errors.push('baseline: EFF056 count requirement drift');
  if (handoffItem.required?.count_withholding_on_stale_runtime_forbidden !== true) errors.push('baseline: EFF056 stale runtime count drift');
  if (handoffItem.required?.current_estimator_min !== 10 || handoffItem.required?.current_estimator_max !== 20) errors.push('baseline: EFF056 estimator range drift');
  if (handoffItem.required?.post_smoke_returns_to_ordinary_estimator !== true) errors.push('baseline: EFF056 post-smoke estimator drift');
  if (handoffItem.required?.integrity_smoke_override_supported !== true || handoffItem.required?.integrity_smoke_workers !== 3) errors.push('baseline: EFF056 smoke override support drift');
  if (handoffItem.required?.smoke_pass_disables_override !== true) errors.push('baseline: EFF056 smoke-pass disable drift');
  if (handoffItem.required?.human_worker_routing_forbidden !== true) errors.push('baseline: EFF056 routing drift');
}
const handoffPolicy = JSON.parse(read(root, 'coordination/guide/GUIDE_WORKER_HANDOFF_V1.json')||'{}');
if (handoffPolicy.status !== 'ACTIVE_BINDING') errors.push('guide-handoff: policy must be ACTIVE_BINDING');
if (handoffPolicy?.launch_estimator?.bounded_canary?.minimum !== 10 || handoffPolicy?.launch_estimator?.bounded_canary?.maximum !== 20) errors.push('guide-handoff: bounded canary drift');
if (handoffPolicy?.launch_estimator?.bounded_canary?.frontier_multiplier !== 1.25) errors.push('guide-handoff: frontier multiplier drift');
const handoffApprox = handoffPolicy?.current_recommendation_example?.recommended_approx_workers;
const freshLaunchPolicyForHandoff = JSON.parse(read(root,'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json')||'{}');
if (freshLaunchPolicyForHandoff?.smoke_gate?.status === 'SMOKE_PASS') {
  if (handoffPolicy?.integrity_smoke_override?.status === 'ACTIVE') errors.push('guide-handoff: smoke override still active after SMOKE_PASS');
  if (!Number.isInteger(handoffApprox) || handoffApprox < 10 || handoffApprox > 20) errors.push('guide-handoff: post-smoke recommendation outside bounded estimator');
} else if (handoffPolicy?.integrity_smoke_override?.status === 'ACTIVE') {
  if (handoffApprox !== handoffPolicy?.integrity_smoke_override?.approximate_workers_before_next_guide_return) errors.push('guide-handoff: active smoke recommendation drift');
}
const guideBootstrap = read(root, 'g');
must('guide-handoff', guideBootstrap, 'WORKER HANDOFF RESPONSE OVERRIDE');
must('guide-handoff', guideBootstrap, 'first visible copyable block');
must('guide-handoff', guideBootstrap, 'MANDÁ ~<N> /wc Y VOLVÉ A /g');
const guideHandoffTest = read(root, 'tests/guide-worker-handoff-v1.test.mjs');
must('guide-handoff-test', guideHandoffTest, 'GUIDE_WORKER_HANDOFF_V1_PASS');
const handoffGuideBriefBuilder = read(root, 'scripts/build-guide-brief.mjs');
must('guide-brief-handoff', handoffGuideBriefBuilder, 'approximate_additional_workers_before_next_guide_return');
must('guide-brief-handoff', handoffGuideBriefBuilder, 'strategy_sample_gaps');

const freshLaunchItem = baseline?.items?.find(x=>x.id==='EFF057');
if (!freshLaunchItem) errors.push('baseline: EFF057 missing');
else {
  if (freshLaunchItem.required?.worker_protocol_version !== 'v3.30') errors.push('baseline: EFF057 protocol drift');
  if (freshLaunchItem.required?.fresh_launch_policy_ref !== 'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json') errors.push('baseline: EFF057 policy ref drift');
  if (freshLaunchItem.required?.fresh_worker_id_de_novo !== true) errors.push('baseline: EFF057 worker identity drift');
  if (freshLaunchItem.required?.launch_nonce_de_novo !== true) errors.push('baseline: EFF057 nonce drift');
  if (freshLaunchItem.required?.beacon_create_before_allocation !== true) errors.push('baseline: EFF057 beacon ordering drift');
  if (freshLaunchItem.required?.historical_terminal_substitution_forbidden !== true) errors.push('baseline: EFF057 replay guard drift');
  if (freshLaunchItem.required?.smoke_distinct_workers_required !== 3) errors.push('baseline: EFF057 smoke count drift');
}
const freshLaunchPolicy = JSON.parse(read(root,'coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json')||'{}');
if (freshLaunchPolicy.status !== 'ACTIVE_BINDING') errors.push('fresh-launch: policy must be ACTIVE_BINDING');
if (freshLaunchPolicy?.fresh_identity?.atomic_uniqueness_gate?.includes?.('CREATE') !== true) errors.push('fresh-launch: atomic beacon gate missing');
if (freshLaunchPolicy?.smoke_gate?.required_distinct_fresh_workers !== 3) errors.push('fresh-launch: smoke gate drift');
must('fresh-launch-wc', strategyWc, 'FRESH LAUNCH / ANTI-REPLAY');
must('fresh-launch-wc', strategyWc, 'fresh_launch=true');
must('fresh-launch-wc', strategyWc, 'launch_nonce');
must('fresh-launch-wc', strategyWc, 'FRESH_LAUNCH_BEACON_NOT_CREATED');
must('fresh-launch-scoreboard', strategyScoreboard, 'fresh_launch_integrity');
const freshLaunchTest = read(root,'tests/worker-fresh-launch-v1.test.mjs');
must('fresh-launch-test', freshLaunchTest, 'WORKER_FRESH_LAUNCH_V1_PASS');

const allocator = read(root, 'scripts/build-fast-allocator.mjs');
must('allocator', allocator, 'value_class');
const latentItem = baseline?.items?.find(x=>x.id==='EFF013');
if (latentItem?.required?.role_ready_compiled_centrally !== true) errors.push('baseline: EFF013 role_ready_compiled_centrally must be true');
if (JSON.stringify(latentItem?.required?.candidate_order) !== JSON.stringify(['ready','queue_ready','role_ready','recovery'])) errors.push('baseline: EFF013 candidate order drift');
const evidenceIntegrityItem = baseline?.items?.find(x=>x.id==='EFF017');
if (evidenceIntegrityItem?.required?.portfolio_fragment_semantics_validated !== true) errors.push('baseline: EFF017 portfolio_fragment_semantics_validated must be true');
if (evidenceIntegrityItem?.required?.derived_recovery_source_path_preserved !== true) errors.push('baseline: EFF017 derived_recovery_source_path_preserved must be true');
const frontierPressureItem = baseline?.items?.find(x=>x.id==='EFF043');
if (frontierPressureItem?.required?.frontier_pressure_source !== 'candidate.required_capabilities') errors.push('baseline: EFF043 pressure source drift');
if (frontierPressureItem?.required?.clean_frontier_total_preserved !== true) errors.push('baseline: EFF043 total frontier must remain published');
if (frontierPressureItem?.required?.generic_compatible_clean_frontier !== true) errors.push('baseline: EFF043 generic-compatible frontier missing');
if (JSON.stringify(frontierPressureItem?.required?.specialized_capability_buckets) !== JSON.stringify(['browser','mobile','host','dispatch','unknown'])) errors.push('baseline: EFF043 specialized bucket set drift');
if (frontierPressureItem?.required?.unknown_capability_is_not_absence !== true) errors.push('baseline: EFF043 unknown capability truth boundary drift');
if (frontierPressureItem?.required?.specialized_work_suppression_forbidden !== true) errors.push('baseline: EFF043 specialized work must not be suppressed');
if (frontierPressureItem?.required?.frontier_thin_uses_generic_compatible_count !== true) errors.push('baseline: EFF043 FRONTIER_THIN count drift');
if (frontierPressureItem?.required?.claim_authority_unchanged !== true) errors.push('baseline: EFF043 claim authority drift');
if (frontierPressureItem?.required?.max_fast_claim_attempts_unchanged !== 3) errors.push('baseline: EFF043 claim attempt bound drift');
if (frontierPressureItem?.required?.pool_sharding_unchanged !== true) errors.push('baseline: EFF043 POOL sharding drift');
if (frontierPressureItem?.required?.regression_test !== 'coordination/portfolio/tests/capability_aware_frontier_pressure_v1.mjs') errors.push('baseline: EFF043 regression test drift');
if (frontierPressureItem?.required?.workflow_guard !== '.github/workflows/eff043-capability-aware-frontier-pressure.yml') errors.push('baseline: EFF043 workflow guard drift');
const frontierPressureTest = read(root, 'coordination/portfolio/tests/capability_aware_frontier_pressure_v1.mjs');
must('capability-aware-frontier-pressure', frontierPressureTest, 'CAPABILITY_AWARE_FRONTIER_PRESSURE_PASS');
must('capability-aware-frontier-pressure', frontierPressureTest, 'generic_compatible_clean_frontier');
must('capability-aware-frontier-pressure', frontierPressureTest, 'unknown_capabilities');

const noAllocationCauseMixItem = baseline?.items?.find(x=>x.id==='EFF049');
if (noAllocationCauseMixItem?.required?.exact_recent_reason_histogram !== true) errors.push('baseline: EFF049 exact reason histogram drift');
if (noAllocationCauseMixItem?.required?.recent_window_minutes !== 10) errors.push('baseline: EFF049 recent window drift');
if (noAllocationCauseMixItem?.required?.bounded_recent_receipt_refs_max !== 12) errors.push('baseline: EFF049 receipt bound drift');
if (noAllocationCauseMixItem?.required?.cumulative_no_allocation_metrics_preserved !== true) errors.push('baseline: EFF049 cumulative metric drift');
if (noAllocationCauseMixItem?.required?.guide_low_yield_evidence_ref !== 'gh-pages:live/efficiency.json#no_allocation_causes') errors.push('baseline: EFF049 Guide evidence ref drift');
if (noAllocationCauseMixItem?.required?.guide_exact_recent_receipts !== true) errors.push('baseline: EFF049 exact receipt evidence drift');
if (noAllocationCauseMixItem?.required?.claim_semantics_unchanged !== true) errors.push('baseline: EFF049 claim semantics guard drift');
if (noAllocationCauseMixItem?.required?.regression_test !== 'coordination/portfolio/tests/efficiency_recent_no_allocation_cause_mix_v1.mjs') errors.push('baseline: EFF049 regression test drift');
if (noAllocationCauseMixItem?.required?.ci_entrypoint !== 'coordination/portfolio/tests/efficiency_recent_no_allocation_regression_v1.mjs') errors.push('baseline: EFF049 CI entrypoint drift');
if (noAllocationCauseMixItem?.required?.ci_entrypoint_executes_regression_test !== true) errors.push('baseline: EFF049 CI chaining drift');

const recoveryRescatePressureItem = baseline?.items?.find(x=>x.id==='EFF044');
if (recoveryRescatePressureItem?.required?.recovery_pressure_source !== 'candidate.required_capabilities') errors.push('baseline: EFF044 recovery pressure source drift');
if (recoveryRescatePressureItem?.required?.generic_compatible_recovery_published !== true) errors.push('baseline: EFF044 generic recovery metric missing');
if (recoveryRescatePressureItem?.required?.specialized_recovery_does_not_count_toward_replaceable_trigger !== true) errors.push('baseline: EFF044 specialized recovery threshold drift');
if (recoveryRescatePressureItem?.required?.specialized_recovery_remains_claimable_to_compatible_workers !== true) errors.push('baseline: EFF044 specialized recovery visibility drift');
if (recoveryRescatePressureItem?.required?.recovery_capability_pressure_published !== true) errors.push('baseline: EFF044 recovery capability telemetry missing');
if (recoveryRescatePressureItem?.required?.recovery_evidence_for_replaceable_trigger_uses_generic_compatible_rows !== true) errors.push('baseline: EFF044 recovery evidence drift');
if (JSON.stringify(recoveryRescatePressureItem?.required?.other_low_yield_triggers_preserved) !== JSON.stringify(['collision_pressure','efficiency_regression','recent_no_allocation'])) errors.push('baseline: EFF044 other LOW_YIELD triggers drift');
if (recoveryRescatePressureItem?.required?.claim_authority_unchanged !== true) errors.push('baseline: EFF044 claim authority drift');
if (recoveryRescatePressureItem?.required?.max_fast_claim_attempts_unchanged !== 3) errors.push('baseline: EFF044 claim attempt bound drift');
if (recoveryRescatePressureItem?.required?.regression_test !== 'coordination/portfolio/tests/guide_rescate_capability_recovery_pressure_v1.mjs') errors.push('baseline: EFF044 regression test drift');
const recoveryRescatePressureTest = read(root, 'coordination/portfolio/tests/guide_rescate_capability_recovery_pressure_v1.mjs');
must('guide-rescate-capability-recovery-pressure', recoveryRescatePressureTest, 'GUIDE_RESCATE_CAPABILITY_RECOVERY_PRESSURE_PASS');
must('guide-rescate-capability-recovery-pressure', recoveryRescatePressureTest, 'specialized recovery pressure alone must not spawn generic GUIDE_RESCATE');
must('guide-rescate-capability-recovery-pressure', recoveryRescatePressureTest, 'generic recovery pressure must preserve LOW_YIELD rescate');
must('fast-allocator', allocator, 'genericRecoveryPressure >= Number(signals.replaceable_trigger || 3)');
must('fast-allocator', allocator, 'recovery_capability_pressure: recoveryCapabilityPressure');
must('fast-allocator', allocator, 'generic_compatible_recovery: genericRecoveryPressure');
mustNot('fast-allocator', allocator, 'recovery.length >= Number(signals.replaceable_trigger || 3)');

const tailRescueItem = baseline?.items?.find(x=>x.id==='EFF045');
if (!tailRescueItem) errors.push('baseline: EFF045 missing');
else {
  if (tailRescueItem.required?.base_fast_claim_attempts !== 3) errors.push('baseline: EFF045 base claim bound drift');
  if (tailRescueItem.required?.pool_tail_rescue_max !== 1) errors.push('baseline: EFF045 tail rescue count drift');
  if (tailRescueItem.required?.total_authority_create_max_with_tail !== 4) errors.push('baseline: EFF045 total authority CREATE bound drift');
  if (tailRescueItem.required?.requires_three_create_exists !== true) errors.push('baseline: EFF045 three-collision gate drift');
  if (tailRescueItem.required?.requires_untried_retained_compatible_candidate !== true) errors.push('baseline: EFF045 retained candidate gate drift');
  if (tailRescueItem.required?.extra_frontier_read_for_tail_forbidden !== true) errors.push('baseline: EFF045 extra read drift');
  if (tailRescueItem.required?.payload_fabrication_for_tail_forbidden !== true) errors.push('baseline: EFF045 payload fabrication drift');
  if (tailRescueItem.required?.unbatched_tail_rescue_forbidden !== true) errors.push('baseline: EFF045 unbatched guard drift');
  if (tailRescueItem.required?.transport_failure_tail_rescue_forbidden !== true) errors.push('baseline: EFF045 transport guard drift');
  if (tailRescueItem.required?.regression_test !== 'coordination/portfolio/tests/claim_tail_rescue_after_three_collisions_v1.mjs') errors.push('baseline: EFF045 regression test drift');
}
const tailRescueTest = read(root, 'coordination/portfolio/tests/claim_tail_rescue_after_three_collisions_v1.mjs');
must('claim-tail-rescue', tailRescueTest, 'CLAIM_TAIL_RESCUE_AFTER_THREE_COLLISIONS_PASS');
must('claim-tail-rescue', tailRescueTest, 'POOL_TAIL_RESCUE');
must('claim-tail-rescue', tailRescueTest, 'untried retained candidate');

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
if (compactFrontierItem?.required?.target_max_bytes !== 24000) errors.push('baseline: EFF023 transport byte target drift');
if (compactFrontierItem?.required?.hard_serialized_bytes_max !== 24000) errors.push('baseline: EFF023 hard byte cap drift');
if (compactFrontierItem?.required?.byte_budget_may_reduce_candidate_count !== true) errors.push('baseline: EFF023 byte-bound candidate truncation drift');
if (compactFrontierItem?.required?.published_claim_payload_must_remain_exact !== true) errors.push('baseline: EFF023 claim payload exactness drift');
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
if (sourceDebtPlannerItem?.required?.project_coverage_postprocessor_gate !== true) errors.push('baseline: EFF026 project coverage postprocessor gate must be true');
if (JSON.stringify(sourceDebtPlannerItem?.required?.suppressed_triggers) !== JSON.stringify(['PROJECT_FRONTIER_THIN','PROJECT_COVERAGE_GAP'])) errors.push('baseline: EFF026 suppressed trigger set drift');
if (sourceDebtPlannerItem?.required?.state_source !== 'coordination/project-guides/<project_id>/STATE.json') errors.push('baseline: EFF026 durable state source drift');
if (sourceDebtPlannerItem?.required?.project_coverage_regression_test !== 'coordination/portfolio/tests/project_coverage_allocator_v1.mjs') errors.push('baseline: EFF026 coverage regression test drift');
const staleCollisionRefreshItem = baseline?.items?.find(x=>x.id==='EFF034');
if (staleCollisionRefreshItem?.required?.ordinary_compact_frontier_reads !== 1) errors.push('baseline: EFF034 ordinary frontier read drift');
if (staleCollisionRefreshItem?.required?.stale_collision_refresh_max !== 1) errors.push('baseline: EFF034 refresh bound drift');
if (staleCollisionRefreshItem?.required?.refresh_requires_snapshot_age_gt_seconds !== 90) errors.push('baseline: EFF034 stale age drift');
if (staleCollisionRefreshItem?.required?.refresh_age_evaluated_at !== 'POST_SECOND_CREATE_EXISTS_DECISION') errors.push('baseline: EFF034 refresh decision point drift');
if (staleCollisionRefreshItem?.required?.first_read_age_gate_forbidden !== true) errors.push('baseline: EFF034 first-read age gate must remain forbidden');
if (staleCollisionRefreshItem?.required?.refresh_requires_create_exists_count !== 2) errors.push('baseline: EFF034 collision threshold drift');
if (staleCollisionRefreshItem?.required?.max_fast_claim_attempts !== 3) errors.push('baseline: EFF034 authority attempt ceiling drift');
if (staleCollisionRefreshItem?.required?.refresh_path !== 'gh-pages:live/claim-frontier.json') errors.push('baseline: EFF034 refresh path drift');
if (staleCollisionRefreshItem?.required?.refresh_only_after_real_create_exists !== true) errors.push('baseline: EFF034 must require real CREATE_EXISTS');
if (staleCollisionRefreshItem?.required?.capability_filter_rebuilt_from_refreshed_snapshot !== true) errors.push('baseline: EFF034 capability-filter rebuild drift');
if (staleCollisionRefreshItem?.required?.pool_shard_seed_reused !== 'beacon_commit_sha_first_8_hex') errors.push('baseline: EFF034 pool seed drift');
if (staleCollisionRefreshItem?.required?.no_extra_archaeology !== true) errors.push('baseline: EFF034 archaeology guard drift');
if (staleCollisionRefreshItem?.required?.full_allocator_refresh_forbidden !== true) errors.push('baseline: EFF034 full allocator must remain forbidden');
if (staleCollisionRefreshItem?.required?.explicit_denial_refresh_forbidden !== true) errors.push('baseline: EFF034 explicit denial refresh must be forbidden');
if (staleCollisionRefreshItem?.required?.ambiguous_transport_refresh_forbidden !== true) errors.push('baseline: EFF034 ambiguous transport refresh must be forbidden');
if (staleCollisionRefreshItem?.required?.stale_recovery_refresh_does_not_authorize_recovery !== true) errors.push('baseline: EFF034 stale recovery authority drift');
const retainedCandidatePayloadItem = baseline?.items?.find(x=>x.id==='EFF035');
if (retainedCandidatePayloadItem?.required?.local_view_retains_full_candidate_object !== true) errors.push('baseline: EFF035 local full-candidate retention drift');
if (JSON.stringify(retainedCandidatePayloadItem?.required?.retained_fields) !== JSON.stringify(['claim_mode','claim_path','claim_payload_shape','barrier_post_release_fields'])) errors.push('baseline: EFF035 retained fields drift');
if (retainedCandidatePayloadItem?.required?.display_summary_non_authoritative !== true) errors.push('baseline: EFF035 display summary authority drift');
if (retainedCandidatePayloadItem?.required?.collision_advance_requires_no_reread !== true) errors.push('baseline: EFF035 collision reread guard drift');
if (retainedCandidatePayloadItem?.required?.payload_fabrication_forbidden !== true) errors.push('baseline: EFF035 payload fabrication guard drift');
const humanDecisionPlannerItem = baseline?.items?.find(x=>x.id==='EFF036');
if (humanDecisionPlannerItem?.required?.project_guide_human_decision_gate !== true) errors.push('baseline: EFF036 human-decision planner gate must be true');
if (JSON.stringify(humanDecisionPlannerItem?.required?.statuses) !== JSON.stringify(['VERIFIED_CANDIDATE_AWAITING_REVIEW','HUMAN_DECISION_GATE'])) errors.push('baseline: EFF036 status allowlist drift');
if (humanDecisionPlannerItem?.required?.require_empty_frontier_refs !== true) errors.push('baseline: EFF036 empty-frontier predicate drift');
if (humanDecisionPlannerItem?.required?.required_blocker_prefix !== 'HUMAN_DECISION_GATE:') errors.push('baseline: EFF036 blocker prefix drift');
if (humanDecisionPlannerItem?.required?.suppress_trigger !== 'PROJECT_FRONTIER_THIN') errors.push('baseline: EFF036 trigger drift');
if (humanDecisionPlannerItem?.required?.source_debt_semantics_reused !== false) errors.push('baseline: EFF036 must remain distinct from SOURCE_DEBT');
if (humanDecisionPlannerItem?.required?.nonempty_frontier_reopens !== true) errors.push('baseline: EFF036 nonempty frontier must reopen');
if (humanDecisionPlannerItem?.required?.regression_test !== 'coordination/portfolio/tests/project_guide_human_decision_gate_v1.mjs') errors.push('baseline: EFF036 regression test drift');
const noAllocationWindowItem = baseline?.items?.find(x=>x.id==='EFF028');
if (noAllocationWindowItem?.required?.global_runtime_epoch_preserved !== true) errors.push('baseline: EFF028 global runtime epoch must be preserved');
if (noAllocationWindowItem?.required?.historical_no_allocation_metrics_preserved !== true) errors.push('baseline: EFF028 historical no-allocation metrics must be preserved');
if (noAllocationWindowItem?.required?.no_allocation_regression_uses_recent_durable_events !== true) errors.push('baseline: EFF028 recent durable-event window drift');
if (noAllocationWindowItem?.required?.no_allocation_regression_window_minutes !== 10) errors.push('baseline: EFF028 no-allocation regression window drift');
if (noAllocationWindowItem?.required?.current_metric !== 'no_allocation_close_p90_recent_ms') errors.push('baseline: EFF028 current metric drift');
if (noAllocationWindowItem?.required?.regression_threshold_ms !== 90000) errors.push('baseline: EFF028 threshold drift');
if (noAllocationWindowItem?.required?.regression_test !== 'coordination/portfolio/tests/efficiency_recent_no_allocation_regression_v1.mjs') errors.push('baseline: EFF028 regression test drift');

const ttfaWindowItem = baseline?.items?.find(x=>x.id==='EFF037');
if (ttfaWindowItem?.required?.global_runtime_epoch_preserved !== true) errors.push('baseline: EFF037 global runtime epoch must be preserved');
if (ttfaWindowItem?.required?.historical_ttfa_metrics_preserved !== true) errors.push('baseline: EFF037 historical TTFA metrics must be preserved');
if (ttfaWindowItem?.required?.ttfa_regression_uses_recent_durable_events !== true) errors.push('baseline: EFF037 recent durable-event window drift');
if (ttfaWindowItem?.required?.ttfa_regression_window_minutes !== 10) errors.push('baseline: EFF037 TTFA regression window drift');
if (ttfaWindowItem?.required?.current_metric !== 'ttfa_p90_recent_ms') errors.push('baseline: EFF037 current metric drift');
if (ttfaWindowItem?.required?.regression_threshold_ms !== 90000) errors.push('baseline: EFF037 threshold drift');
if (ttfaWindowItem?.required?.regression_test !== 'coordination/portfolio/tests/efficiency_recent_ttfa_regression_v1.mjs') errors.push('baseline: EFF037 regression test drift');
const efficiencyBuilder = read(root, 'scripts/build-efficiency-snapshot.mjs');
must('efficiency-builder-ttfa-window', efficiencyBuilder, "const eff037 = Array.isArray(baseline.items)");
must('efficiency-builder-ttfa-window', efficiencyBuilder, 'ttfa_p90_recent_ms');
must('efficiency-builder-ttfa-window', efficiencyBuilder, 'ttfa_regression_window_minutes:ttfaRegressionWindowMinutes');
must('efficiency-builder-ttfa-window', efficiencyBuilder, 'const ttfaBad=metrics.ttfa_p90_recent_ms!=null');
must('efficiency-builder-cause-mix', efficiencyBuilder, 'no_allocation_causes:noAllocationCauses');
must('efficiency-builder-cause-mix', efficiencyBuilder, 'histogram_recent:noAllocationCauseHistogramRecent');
must('efficiency-builder-cause-mix', efficiencyBuilder, 'recent_receipts:recentNoAllocationReceipts');

const wc = read(root, 'wc');
must('wc', wc, 'CLAIM NOW');
must('wc', wc, 'Read ONE compact claim frontier directly:');
must('wc', wc, 'gh-pages:live/claim-frontier.json');
must('wc', wc, '`live/allocator.json` is diagnostics only and is FORBIDDEN on the ordinary preclaim path.');
must('wc', wc, 'first 8 hex chars of beacon_commit_sha');
must('wc', wc, 'Maximum 3 fast CREATE attempts');
must('wc', wc, 'Lane diversification: after 2 CREATE_EXISTS outcomes in the same lane');
must('wc-stale-refresh', wc, 'PROVEN-STALE COLLISION REFRESH');
must('wc-stale-refresh', wc, 'snapshot is >90 seconds old at the post-collision refresh decision');
must('wc-stale-refresh', wc, 'reload exactly `gh-pages:live/claim-frontier.json` once');
must('wc-stale-refresh', wc, 'remaining third authority CREATE');
must('wc-stale-refresh', wc, 'Never refresh after `CLAIM_TRANSPORT_BLOCKED` or `CLAIM_TRANSPORT_AMBIGUOUS`');
must('wc-tail-rescue', wc, 'POOL_TAIL_RESCUE');
must('wc-tail-rescue', wc, 'total authority CREATE attempts are hard-capped at 4');
must('wc-tail-rescue', wc, 'untried retained candidate');
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
must('wc', wc, 'CLAIM_TRANSPORT_AMBIGUOUS');
must('wc', wc, 'explicit authorization/safety denial');
must('wc', wc, 'at most ONE transport diversion');
must('wc', wc, 'different claim path');
must('wc', wc, 'Never retry the denied action/path');
must('wc', wc, 'candidate.claim_payload_shape');
must('wc-retained-candidate', wc, 'CONTRACT-COMPLETE LOCAL RETENTION');
must('wc-retained-candidate', wc, 'zero extra frontier read');
must('wc-retained-candidate', wc, 'zero payload fabrication');
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
must('wc', wc, 'POOL <pool_id>');
must('wc', wc, 'batch_id=POOL-<pool_id>');
must('wc', wc, 'productivity exam card');
must('wc-strategy-experiment', wc, 'POOL POST-OWNERSHIP STRATEGY EXPERIMENT');
must('wc-strategy-experiment', wc, 'coordination/workers/WORKER_STRATEGY_EXPERIMENT_V1.json');
must('wc-strategy-experiment', wc, 'protocol_version="v3.30"');
must('wc-strategy-experiment', wc, 'experiment_id="EXP-STRATEGY-AB"');
mustNot('wc-strategy-experiment', wc, '### POOL YIELD-PATTERN REPRODUCTION');


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
must('fast-stale-refresh', fast, 'PROVEN-STALE COLLISION REFRESH');
must('fast-stale-refresh', fast, 'snapshot is >90 seconds old at the post-collision refresh decision');
must('fast-stale-refresh', fast, 'reload exactly `gh-pages:live/claim-frontier.json` once');
must('fast-stale-refresh', fast, 'remaining third authority CREATE');
must('fast-stale-refresh', fast, 'Never refresh after `CLAIM_TRANSPORT_BLOCKED` or `CLAIM_TRANSPORT_AMBIGUOUS`');
must('fast-tail-rescue', fast, 'POOL_TAIL_RESCUE');
must('fast-tail-rescue', fast, 'Total authority CREATE attempts are hard-capped at 4');
must('fast-tail-rescue', fast, 'untried retained candidate');
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
must('fast-allocation', fast, 'CLAIM_TRANSPORT_AMBIGUOUS');
must('fast-allocation', fast, 'explicit authorization/safety denial');
must('fast-allocation', fast, 'at most ONE transport diversion');
must('fast-allocation', fast, 'different claim path');
must('fast-allocation', fast, 'Never retry the denied action/path');
must('fast-allocation', fast, 'candidate.claim_payload_shape');
must('fast-retained-candidate', fast, 'CONTRACT-COMPLETE LOCAL RETENTION');
must('fast-retained-candidate', fast, 'zero frontier reread');
must('fast-retained-candidate', fast, 'zero payload reconstruction/fabrication');
must('fast-allocation', fast, 'ALLOCATOR_PIN_PAYLOAD_INVALID');
must('fast-allocation', fast, '<now_plus_10m_iso>');
must('fast-allocation', fast, 'Never CREATE an immutable malformed pin');
must('fast-allocation', fast, 'candidate.required_capabilities');
must('fast-allocation', fast, 'CAPABILITY_MISMATCH_PRECLAIM');
must('fast-allocation', fast, 'Unknown or ambiguous capability is NOT absence');
must('fast-allocation', fast, 'does not consume an authority CREATE attempt');
must('fast-allocation', fast, 'Batched / pooled unified candidate sharding');
must('fast-allocation', fast, 'claim-frontier.candidates');
must('fast-allocation', fast, 'gh-pages:live/claim-frontier.json');
must('fast-allocation', fast, 'first 8 hex chars of beacon_commit_sha');
must('fast-allocation', fast, 'Do not re-impose lane priority locally for a batched worker');
must('fast-allocation', fast, 'batch_compatible_candidates');
mustI('fast-allocation', fast, 'definitively incompatible candidates before the hash');

const projectCoverage = read(root, 'scripts/apply-project-coverage.mjs');
must('project-coverage-source-debt-gate', projectCoverage, 'projectPlannerSuppressedBySourceDebt');
must('project-coverage-human-decision-gate', projectCoverage, 'projectPlannerSuppressedByHumanDecision');
must('project-coverage-planner-suppression', projectCoverage, '!row.plannerSuppressed');
const projectCoverageTest = read(root, 'coordination/portfolio/tests/project_coverage_allocator_v1.mjs');
must('project-coverage-test-source-debt', projectCoverageTest, 'SOURCE_DEBT + empty frontier + NEW_EVIDENCE_GATE');
must('project-coverage-test-human-decision', projectCoverageTest, 'HUMAN_DECISION_GATE + empty frontier');

const projectGuideMesh = JSON.parse(read(root, 'coordination/guide/PROJECT_GUIDE_MESH_V1.json'));
if (projectGuideMesh.worker_chain_checkpoint_productive_units !== 3) errors.push('project-guide-mesh: checkpoint drift');
if (projectGuideMesh.worker_chain_target_productive_units !== 6) errors.push('project-guide-mesh: chain target drift');
if (projectGuideMesh.worker_chain_max_productive_units !== 8) errors.push('project-guide-mesh: chain hard cap drift');
if (projectGuideMesh.worker_chain_same_project_soft_cap !== 2) errors.push('project-guide-mesh: same-project soft cap drift');
if (projectGuideMesh?.worker_residency?.early_exit_with_compatible_frontier_forbidden !== true) errors.push('project-guide-mesh: resident early-exit law drift');
if (projectGuideMesh?.assist_protocol?.max_children_per_owned_job !== 2) errors.push('project-guide-mesh: assist child bound drift');
if (projectGuideMesh?.human_decision_planner_gate?.enabled !== true) errors.push('project-guide-mesh: human decision planner gate must stay enabled');
if (JSON.stringify(projectGuideMesh?.human_decision_planner_gate?.statuses) !== JSON.stringify(['VERIFIED_CANDIDATE_AWAITING_REVIEW','HUMAN_DECISION_GATE'])) errors.push('project-guide-mesh: human decision status allowlist drift');
if (projectGuideMesh?.human_decision_planner_gate?.require_empty_frontier_refs !== true) errors.push('project-guide-mesh: human decision empty frontier predicate drift');
if (projectGuideMesh?.human_decision_planner_gate?.required_blocker_prefix !== 'HUMAN_DECISION_GATE:') errors.push('project-guide-mesh: human decision blocker prefix drift');
const examSpec = JSON.parse(read(root, 'coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json'));
if (examSpec.slots !== 6) errors.push('worker-exam: slot count drift');
if (examSpec?.score?.total_max !== 10) errors.push('worker-exam: score max drift');
if (!Array.isArray(examSpec?.anti_gaming) || !examSpec.anti_gaming.some(x=>String(x).includes('Word count'))) errors.push('worker-exam: verbosity anti-gaming law missing');
const scoreboardBuilder = read(root, 'scripts/build-worker-scoreboard.mjs');
must('worker-scoreboard', scoreboardBuilder, "prometeo.worker-scoreboard/v1");
must('worker-scoreboard', scoreboardBuilder, 'champion_reproducible');
must('worker-scoreboard', scoreboardBuilder, 'champion_candidate');
must('worker-scoreboard', scoreboardBuilder, 'leader');
must('worker-scoreboard', scoreboardBuilder, 'pattern:');
must('worker-scoreboard', scoreboardBuilder, 'strategy_experiment_health');
must('worker-scoreboard', scoreboardBuilder, 'champion_reproducible');

const yieldPattern = JSON.parse(read(root, 'coordination/workers/YIELD_PATTERN_CANDIDATE_V1.json'));
if (yieldPattern.pattern_id !== 'YIELD-10X-V1') errors.push('yield-pattern: id drift');
if (yieldPattern.status !== 'REJECTED_AS_UNIVERSAL_PATTERN_RETAINED_AS_EVIDENCE') errors.push('yield-pattern: rejected historical status drift');
if (yieldPattern.status==='REJECTED_AS_UNIVERSAL_PATTERN_RETAINED_AS_EVIDENCE') {
  if (yieldPattern?.reproduction_result?.verdict !== 'FAIL_REPRODUCTION_GATE') errors.push('yield-pattern: rejected status missing failed reproduction evidence');
  if (yieldPattern?.next_experiment?.status !== 'ACTIVE_PREPARE_JOB_CLASS_PATTERNS') errors.push('yield-pattern: rejected status missing active next experiment');
}
if (yieldPattern?.reproduction_gate?.required_independent_workers !== 3) errors.push('yield-pattern: reproduction count drift');
if (yieldPattern?.reproduction_gate?.min_score_each !== 8) errors.push('yield-pattern: score gate drift');


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
must('worker-events-pool', eventProtocol, 'POOL <pool_id>');
must('worker-events-pool', eventProtocol, 'no cohort completion barrier');

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
must('guide-yield-action', guide, 'DO NOT merely report that the gate is open');
must('guide-yield-action', guide, 'status correction alone is not a sufficient bare-/g action');
must('guide-power-compass', guide, '## STRATEGIC GUIDE COMPASS');
must('guide-power-compass', guide, 'coordination/guide/GUIDE_POWER_COMPASS_V1.json');
must('guide-power-compass', guide, 'PARALLELISM, YIELD_PER_CHAT, REPRODUCTION, VISIBLE_VALUE and AUTONOMY');
must('guide-visible-response', guide, '## LITERAL RESPONSE CONTINUITY');
must('guide-visible-response', guide, 'coordination/guide/visible-responses/<session_id>.md');
must('guide-utility-footer', guide, '## HUMAN UTILITY FOOTER');
must('guide-utility-footer', guide, 'https://juanmanuelpm.github.io/prometeo/guide/');
must('guide-utility-footer', guide, 'RELEVANT PAGES');
must('guide-utility-footer', guide, '/wc PROMPT');
must('guide-utility-footer', guide, 'HUMAN ACTION');
must('guide-utility-footer', guide, 'NEXT GUIDE CYCLE');
must('guide-growth-trajectory', guide, '## GROWTH TRAJECTORY / ANTI-DRIFT');
must('guide-growth-trajectory', guide, 'coordination/guide/GROWTH_TRAJECTORY_V1.json');
must('guide-growth-trajectory', guide, 'https://juanmanuelpm.github.io/prometeo/trajectory/');
must('guide-takeover', guide, '## STRICT TAKEOVER CANARY TKV1');
must('guide-takeover', guide, 'coordination/guide/GUIDE_TAKEOVER_CANARY_V1.json');
must('guide-takeover', guide, '00_STARTED');
must('guide-takeover', guide, '10_HYDRATED');
must('guide-takeover', guide, '20_ACTED');
must('guide-takeover', guide, '30_FINAL');




must('guide-current-mission', guide, '## ACTIVE CURRENT MISSION — PRIORITY OVERRIDE');
must('guide-current-mission', guide, 'coordination/guide/CURRENT_MISSION_V1.json');
must('guide-current-mission', guide, 'coordination/guide/GUIDE_CURRENT_MISSION_WRITEBACK_V1.md');
must('guide-current-mission', guide, 'there is no arbitrary one-action cap');
must('guide-current-mission', guide, 'Do not claim background/self-waking execution after the turn.');

const currentMission = JSON.parse(read(root, 'coordination/guide/CURRENT_MISSION_V1.json'));
if (currentMission.status !== 'ACTIVE_BINDING') errors.push('current-mission: status drift');
if (currentMission?.growth_trajectory?.ref !== 'coordination/guide/GROWTH_TRAJECTORY_V1.json') errors.push('current-mission: trajectory ref drift');
const growthTrajectory = JSON.parse(read(root, 'coordination/guide/GROWTH_TRAJECTORY_V1.json'));
if (growthTrajectory.status !== 'ACTIVE_BINDING') errors.push('growth-trajectory: status drift');
if (growthTrajectory?.empirical_growth_model?.status !== 'NOT_PROVEN_EXPONENTIAL') errors.push('growth-trajectory: proof status drift');
if (growthTrajectory?.empirical_growth_model?.acceleration_claim_gate?.minimum_comparable_windows !== 3) errors.push('growth-trajectory: comparable window gate drift');
if (!Array.isArray(growthTrajectory?.roadmap) || growthTrajectory.roadmap.length < 5) errors.push('growth-trajectory: roadmap missing');
if (!Array.isArray(growthTrajectory?.action_tree) || growthTrajectory.action_tree.length < 5) errors.push('growth-trajectory: action tree missing');
if (!Array.isArray(growthTrajectory?.drift_alarms) || growthTrajectory.drift_alarms.length < 5) errors.push('growth-trajectory: drift alarms missing');
if (!growthTrajectory?.human_north_star?.summary) errors.push('growth-trajectory: human north star missing');
const trajectoryBuilder = read(root, 'scripts/build-growth-trajectory.mjs');
must('growth-trajectory-builder', trajectoryBuilder, 'prometeo.growth-trajectory-public/v1');
must('growth-trajectory-builder', trajectoryBuilder, 'Growth Trajectory');
const trajectoryWorkflow = read(root, '.github/workflows/growth-trajectory.yml');
must('growth-trajectory-workflow', trajectoryWorkflow, 'Prometeo Growth Trajectory');
const pageRegistryTrajectory = JSON.parse(read(root, 'coordination/pages/PLATE_REGISTRY_V1.json'));
if (!pageRegistryTrajectory?.plates?.some(x=>x.plate==='TRJ001' && x.page_id==='growth-trajectory')) errors.push('growth-trajectory: TRJ001 plate missing');
const pageWatchTrajectory = JSON.parse(read(root, 'coordination/live/PAGE_WATCH_REGISTRY_V1.json'));
if (!pageWatchTrajectory?.pages?.some(x=>x.plate==='TRJ001' && x.url==='https://juanmanuelpm.github.io/prometeo/trajectory/')) errors.push('growth-trajectory: public watch registration missing');
if (currentMission?.operating_mode?.mode !== 'ROLLING_POOL') errors.push('current-mission: rolling pool mode drift');
if (currentMission?.operating_mode?.pool_id !== 'PROD-01') errors.push('current-mission: pool id drift');
if (currentMission?.guide_takeover_canary?.canary_id !== 'TKV1') errors.push('current-mission: takeover canary id drift');
{
  const takeoverStatus=currentMission?.guide_takeover_canary?.status;
  const qualityStatus=currentMission?.continuity_verification?.quality_takeover_canary;
  if (!['ARMED_FOR_FRESH_CHAT','PASS_TKV1'].includes(takeoverStatus)) errors.push('current-mission: takeover canary status drift');
  if (takeoverStatus==='ARMED_FOR_FRESH_CHAT' && qualityStatus!=='PENDING_TKV1') errors.push('current-mission: armed quality truth drift');
  if (takeoverStatus==='PASS_TKV1' && qualityStatus!=='PASS_TKV1') errors.push('current-mission: passed quality truth drift');
  if (takeoverStatus==='PASS_TKV1') {
    const finalRef=currentMission?.guide_takeover_canary?.final_ref;
    if (!finalRef) errors.push('current-mission: PASS_TKV1 missing final_ref');
    else {
      const finalTakeover=JSON.parse(read(root, finalRef));
      if (finalTakeover?.canary_result!=='PASS') errors.push('current-mission: PASS_TKV1 final artifact not PASS');
    }
  }
}

const takeoverSpec = JSON.parse(read(root, 'coordination/guide/GUIDE_TAKEOVER_CANARY_V1.json'));
if (takeoverSpec.canary_id !== 'TKV1' || takeoverSpec.trigger_token !== 'TAKEOVER CANARY TKV1') errors.push('guide-takeover: spec identity drift');
if (!Array.isArray(takeoverSpec.sequence) || JSON.stringify(takeoverSpec.sequence.map(x=>x.phase)) !== JSON.stringify(['00_STARTED','10_HYDRATED','20_ACTED','30_FINAL'])) errors.push('guide-takeover: phase sequence drift');
const takeoverPrompt = read(root, 'coordination/guide/TAKEOVER_CANARY_PROMPT_V1.txt');
must('guide-takeover-prompt', takeoverPrompt, 'TAKEOVER CANARY TKV1');
must('guide-takeover-prompt', takeoverPrompt, 'https://juanmanuelpm.github.io/prometeo/g/');
const takeoverValidator = read(root, 'scripts/check-guide-takeover-v1.mjs');
must('guide-takeover-validator', takeoverValidator, 'GUIDE_TAKEOVER_TKV1_PASS');
must('guide-takeover-validator', takeoverValidator, 'visible response too short');
must('guide-takeover-validator', takeoverValidator, 'power_levers');
const takeoverWorkflow = read(root, '.github/workflows/guide-takeover-canary.yml');
must('guide-takeover-workflow', takeoverWorkflow, 'Prometeo Guide Takeover Canary');
must('guide-takeover-workflow', takeoverWorkflow, 'check-guide-takeover-v1.mjs');

if (currentMission?.operating_mode?.worker_residency?.checkpoint_productive_units !== 3) errors.push('current-mission: checkpoint drift');
if (currentMission?.operating_mode?.worker_residency?.target_productive_units !== 6) errors.push('current-mission: target drift');
if (currentMission?.operating_mode?.worker_residency?.hard_cap_productive_units !== 8) errors.push('current-mission: hard cap drift');
if (currentMission?.worker_exam?.champion_min_independent_reproductions !== 3) errors.push('current-mission: champion reproduction drift');
if (currentMission?.required_guide_behavior?.autonomous_turn_depth?.includes('No arbitrary one-action or one-cycle cap') !== true) errors.push('current-mission: guide action-depth law missing');

const missionContinuity = read(root, 'coordination/guide/CONTINUOUS_COGNITIVE_PRODUCTION_CONTINUITY_V1.md');
must('mission-continuity', missionContinuity, 'POOL PROD-01');
must('mission-continuity', missionContinuity, 'Worker Productivity Exam');
must('mission-continuity', missionContinuity, 'Do not reset to old MESH-03/04/05 wave choreography');
must('mission-continuity', missionContinuity, 'The human should not become the transport, scheduler, merger or memory system.');

const powerCompass = JSON.parse(read(root, 'coordination/guide/GUIDE_POWER_COMPASS_V1.json'));
if (powerCompass.status !== 'ACTIVE_BINDING') errors.push('guide-power-compass: status drift');
if (String(powerCompass?.growth_model?.conceptual_equation||'').includes('useful_parallelism') !== true) errors.push('guide-power-compass: growth model missing');
for (const axis of ['PARALLELISM','YIELD_PER_CHAT','REPRODUCTION','VISIBLE_VALUE','AUTONOMY']) {
  if (!Array.isArray(powerCompass?.growth_model?.axes) || !powerCompass.growth_model.axes.some(x=>x.id===axis)) errors.push('guide-power-compass: missing axis '+axis);
}
if (powerCompass?.literal_response_continuity?.enabled !== true) errors.push('guide-power-compass: literal response continuity drift');
if (powerCompass?.literal_response_continuity?.directory !== 'coordination/guide/visible-responses') errors.push('guide-power-compass: visible response directory drift');
if (!Array.isArray(powerCompass?.current_priority_experiments) || powerCompass.current_priority_experiments.length<1) errors.push('guide-power-compass: no experiments');
const guideBriefBuilder = read(root, 'scripts/build-guide-brief.mjs');
must('guide-brief-builder', guideBriefBuilder, 'prometeo.guide-brief/v1');
must('guide-brief-builder', guideBriefBuilder, 'coordination/project-guides/');
must('guide-brief-builder', guideBriefBuilder, 'PAGE_WATCH_REGISTRY_V1.json');
must('guide-brief-builder', guideBriefBuilder, 'worker_prompt');
const guideBriefWorkflow = read(root, '.github/workflows/guide-brief.yml');
must('guide-brief-workflow', guideBriefWorkflow, 'Prometeo Guide Brief');
must('guide-brief-workflow', guideBriefWorkflow, 'site/guide');
const pageRegistry = JSON.parse(read(root, 'coordination/pages/PLATE_REGISTRY_V1.json'));
if (!pageRegistry?.plates?.some(x=>x.plate==='GDB001' && x.page_id==='guide-brief')) errors.push('guide-brief: GDB001 plate missing');
const pageWatch = JSON.parse(read(root, 'coordination/live/PAGE_WATCH_REGISTRY_V1.json'));
if (!pageWatch?.pages?.some(x=>x.plate==='GDB001' && x.url==='https://juanmanuelpm.github.io/prometeo/guide/')) errors.push('guide-brief: public watch registration missing');


const missionWriteback = read(root, 'coordination/guide/GUIDE_CURRENT_MISSION_WRITEBACK_V1.md');
must('mission-writeback', missionWriteback, 'Mandatory writeback');
must('mission-writeback', missionWriteback, 'There is no arbitrary one-action cap.');
must('mission-writeback', missionWriteback, 'coordination/guide/sessions/<session_id>.json');
must('mission-writeback', missionWriteback, 'Strategic Guide aftercare');
must('mission-writeback', missionWriteback, 'Exact visible-response writeback');
must('mission-writeback', missionWriteback, 'coordination/guide/visible-responses/<session_id>.md');


const continuityHead = JSON.parse(read(root, 'coordination/CONTINUITY_HEAD.json'));
if (continuityHead.current_mission_ref !== 'coordination/guide/CURRENT_MISSION_V1.json') errors.push('continuity-head: current mission ref drift');
if (continuityHead.current_mission_status !== 'ACTIVE_BINDING') errors.push('continuity-head: current mission status drift');
if (!String(continuityHead.next_dot||'').includes('Load ACTIVE_BINDING Current Mission')) errors.push('continuity-head: next_dot mission priority missing');

const growthCampaign = JSON.parse(read(root, 'coordination/guide/GROWTH_CAMPAIGN_V1.json'));
if (growthCampaign.current_stage !== 'CONTINUOUS_POOL-01') errors.push('growth-campaign: current stage drift');
if (growthCampaign?.continuity_refs?.current_mission !== 'coordination/guide/CURRENT_MISSION_V1.json') errors.push('growth-campaign: mission continuity ref drift');

const shortBootstrap = read(root, 'p.txt');
must('p-current-mission', shortBootstrap, 'CURRENT_MISSION_V1.json');
must('p-current-mission', shortBootstrap, 'CURRENT MISSION WRITEBACK');

const stableEntry = JSON.parse(read(root, '.well-known/prometeo.json'));
if (!String(stableEntry.current_mission||'').includes('/coordination/guide/CURRENT_MISSION_V1.json')) errors.push('stable-entry: current mission pointer missing');
if (!String(stableEntry.current_mission_writeback||'').includes('/coordination/guide/GUIDE_CURRENT_MISSION_WRITEBACK_V1.md')) errors.push('stable-entry: current mission writeback pointer missing');

if (site) {
  const publicP = read(site, 'p.txt');
  must('public-p-current-mission', publicP, 'CURRENT_MISSION_V1.json');
  const publicEntry = JSON.parse(read(site, '.well-known/prometeo.json'));
  if (!String(publicEntry.current_mission||'').includes('/coordination/guide/CURRENT_MISSION_V1.json')) errors.push('public-entry: current mission pointer missing');
}


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
must('fast-allocator-cause-mix', allocator, 'gh-pages:live/efficiency.json#no_allocation_causes');
must('fast-allocator-cause-mix', allocator, 'efficiencyNoAllocationReceipts');
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

const claimTransportClassificationTest = read(root, 'coordination/portfolio/tests/claim_transport_classification_v1.mjs');
must('claim-transport-classification-test', claimTransportClassificationTest, 'CLAIM_TRANSPORT_CLASSIFICATION_PASS');
must('claim-transport-classification-test', claimTransportClassificationTest, 'TRY_ONE_DIFFERENT_PATH');
must('claim-transport-classification-test', claimTransportClassificationTest, 'STOP_CLAIM_TRANSPORT_AMBIGUOUS');

const recentNoAllocationTest = read(root, 'coordination/portfolio/tests/efficiency_recent_no_allocation_regression_v1.mjs');
must('recent-no-allocation-test', recentNoAllocationTest, 'EFFICIENCY_RECENT_NO_ALLOCATION_REGRESSION_PASS');
must('recent-no-allocation-test', recentNoAllocationTest, 'no_allocation_close_p90_recent_ms');
must('recent-no-allocation-test', recentNoAllocationTest, 'historical-only tail must not pin current regression');
must('recent-no-allocation-test', recentNoAllocationTest, 'efficiency_recent_no_allocation_cause_mix_v1.mjs');

const noAllocationCauseMixTest = read(root, 'coordination/portfolio/tests/efficiency_recent_no_allocation_cause_mix_v1.mjs');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'EFFICIENCY_RECENT_NO_ALLOCATION_CAUSE_MIX_PASS');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'ALLOCATOR_READ_TRUNCATED_JSON');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'CLAIM_ATTEMPTS_EXHAUSTED');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'CLAIM_TRANSPORT_BLOCKED');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'CLAIM_TRANSPORT_AMBIGUOUS');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'CAPABILITY_MISMATCH_PRECLAIM_EXHAUSTED');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'gh-pages:live/efficiency.json#no_allocation_causes');
must('no-allocation-cause-mix-test', noAllocationCauseMixTest, 'cause telemetry must not alter authority payload semantics');

const eff027 = baseline.items?.find(item => item.id === 'EFF027');
if (!eff027) errors.push('ratchet: EFF027 missing');
else {
  if (eff027.required?.batched_capability_filter_before_hash !== true) errors.push('ratchet: EFF027 filter-before-hash drift');
  if (eff027.required?.stable_survivor_order !== true) errors.push('ratchet: EFF027 survivor-order drift');
  if (eff027.required?.unknown_capability_is_not_absence !== true) errors.push('ratchet: EFF027 unknown-capability drift');
  if (eff027.required?.no_extra_preclaim_reads_or_writes !== true) errors.push('ratchet: EFF027 preclaim-overhead drift');
}

const eff030 = baseline.items?.find(item => item.id === 'EFF030');
if (!eff030) errors.push('ratchet: EFF030 missing');
else {
  if (eff030.required?.pool_invocation !== true) errors.push('ratchet: EFF030 pool invocation drift');
  if (eff030.required?.pool_no_cohort_barrier !== true) errors.push('ratchet: EFF030 pool barrier drift');
  if (eff030.required?.terminal_exam_card !== true) errors.push('ratchet: EFF030 exam card drift');
  if (eff030.required?.champion_requires_independent_reproduction !== 3) errors.push('ratchet: EFF030 champion replication drift');
}

const eff031 = baseline.items?.find(item => item.id === 'EFF031');
if (!eff031) errors.push('ratchet: EFF031 missing');
else {
  if (eff031.required?.explicit_denial_classification !== 'CLAIM_TRANSPORT_BLOCKED') errors.push('ratchet: EFF031 explicit denial classification drift');
  if (eff031.required?.ambiguous_transport_classification !== 'CLAIM_TRANSPORT_AMBIGUOUS') errors.push('ratchet: EFF031 ambiguous transport classification drift');
  if (eff031.required?.same_denied_action_retry_forbidden !== true) errors.push('ratchet: EFF031 denied-action retry drift');
  if (eff031.required?.safety_control_bypass_forbidden !== true) errors.push('ratchet: EFF031 safety-control bypass drift');
  if (eff031.required?.transport_diversion_max !== 1) errors.push('ratchet: EFF031 diversion bound drift');
  if (eff031.required?.alternate_candidate_must_be_already_loaded !== true) errors.push('ratchet: EFF031 candidate-source drift');
  if (eff031.required?.alternate_claim_path_must_differ !== true) errors.push('ratchet: EFF031 alternate path drift');
  if (eff031.required?.extra_preclaim_read_for_diversion_forbidden !== true) errors.push('ratchet: EFF031 preclaim-read drift');
  if (eff031.required?.max_fast_claim_attempts_preserved !== 3) errors.push('ratchet: EFF031 max-attempt drift');
  if (eff031.required?.regression_test !== 'coordination/portfolio/tests/claim_transport_classification_v1.mjs') errors.push('ratchet: EFF031 regression-test drift');
}

const eff032 = baseline.items?.find(item => item.id === 'EFF032');
if (!eff032) errors.push('ratchet: EFF032 missing');
else {
  if (eff032.required?.structured_authority_gate !== true) errors.push('ratchet: EFF032 structured authority gate drift');
  if (eff032.required?.schema !== 'prometeo.portfolio-authority-gate/v1') errors.push('ratchet: EFF032 schema drift');
  if (eff032.required?.gate !== 'NEW_AUTHORITY_GATE') errors.push('ratchet: EFF032 gate enum drift');
  if (eff032.required?.open_time_only_recovery_suppressed !== true) errors.push('ratchet: EFF032 time-only recovery suppression drift');
  if (eff032.required?.malformed_gate_fail_closed !== true) errors.push('ratchet: EFF032 malformed gate fail-closed drift');
  if (eff032.required?.satisfaction_requires_durable_evidence_ref !== true) errors.push('ratchet: EFF032 durable satisfaction evidence drift');
  if (eff032.required?.satisfaction_must_postdate_boundary !== true) errors.push('ratchet: EFF032 satisfaction ordering drift');
  if (eff032.required?.recovery_pin_preserves_authority_provenance !== true) errors.push('ratchet: EFF032 recovery provenance drift');
  if (eff032.required?.ordinary_retry_safe_recovery_preserved !== true) errors.push('ratchet: EFF032 ordinary recovery drift');
  if (eff032.required?.facultad_g5_blocks_g6_fixture !== true) errors.push('ratchet: EFF032 Facultad G5/G6 fixture drift');
}

const eff033 = baseline.items?.find(item => item.id === 'EFF033');
if (!eff033) errors.push('ratchet: EFF033 missing');
else {
  if (eff033.required?.current_mission_ref !== 'coordination/guide/CURRENT_MISSION_V1.json') errors.push('ratchet: EFF033 mission ref drift');
  if (eff033.required?.mission_status !== 'ACTIVE_BINDING') errors.push('ratchet: EFF033 mission status drift');
  if (eff033.required?.guide_loads_mission_before_historical_next_dot !== true) errors.push('ratchet: EFF033 guide mission priority drift');
  if (eff033.required?.bare_g_one_action_cap_forbidden !== true) errors.push('ratchet: EFF033 action cap drift');
  if (eff033.required?.bare_g_material_writeback_required !== true) errors.push('ratchet: EFF033 writeback drift');
  if (eff033.required?.human_worker_recap_required !== false) errors.push('ratchet: EFF033 human recap drift');
  if (eff033.required?.rolling_pool_default !== 'PROD-01') errors.push('ratchet: EFF033 pool default drift');
  if (eff033.required?.evaluation_pauses_pool !== false) errors.push('ratchet: EFF033 evaluation pause drift');
}

const eff046 = baseline.items?.find(item => item.id === 'EFF046');
if (!eff046) errors.push('ratchet: EFF046 missing');
else {
  if (eff046.required?.overload_guard_preserved !== true) errors.push('ratchet: EFF046 overload guard drift');
  if (eff046.required?.specialized_only_zero_generic_override !== true) errors.push('ratchet: EFF046 starvation override drift');
  if (eff046.required?.generic_compatible_clean_frontier_equals !== 0) errors.push('ratchet: EFF046 zero-generic gate drift');
  if (eff046.required?.specialized_clean_frontier_required !== true) errors.push('ratchet: EFF046 specialized-frontier gate drift');
  if (eff046.required?.unresolved_evidence_required !== true) errors.push('ratchet: EFF046 unresolved-evidence gate drift');
  if (eff046.required?.planner_trigger !== 'FRONTIER_THIN') errors.push('ratchet: EFF046 planner trigger drift');
  if (eff046.required?.existing_generic_frontier_preserves_guard !== true) errors.push('ratchet: EFF046 guard-preservation drift');
  if (eff046.required?.regression_test !== 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs') errors.push('ratchet: EFF046 regression-test drift');
  must('fast-allocator', allocator, 'genericStarvationOverride');
  must('fast-allocator', allocator, 'generic_starvation_override: genericStarvationOverride');
  const starvationTest = read(root, 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs');
  must('EFF046 regression test', starvationTest, 'GENERIC_STARVATION_OVERRIDE_PASS');
  must('EFF046 regression test', starvationTest, 'zero generic-compatible work must keep one evidence-backed FRONTIER_THIN planner claimable');
}

const eff047 = baseline.items?.find(item => item.id === 'EFF047');
if (!eff047) errors.push('ratchet: EFF047 missing');
else {
  if (eff047.required?.exact_existing_guide_claim_path_suppressed_pre_publish !== true) errors.push('ratchet: EFF047 exact-path suppression drift');
  if (eff047.required?.suppression_stage !== 'scripts/suppress-concurrent-guide-rescate.mjs') errors.push('ratchet: EFF047 suppression-stage drift');
  if (eff047.required?.claim_path_match !== 'EXACT_IMMUTABLE_PATH') errors.push('ratchet: EFF047 claim-path match drift');
  if (eff047.required?.fresh_role_successor_preserved !== true) errors.push('ratchet: EFF047 fresh-successor drift');
  if (eff047.required?.guide_rescate_cross_fingerprint_suppression_preserved !== true) errors.push('ratchet: EFF047 rescate-suppression drift');
  if (eff047.required?.specialized_execution_candidates_preserved !== true) errors.push('ratchet: EFF047 specialized-work drift');
  if (eff047.required?.worker_preclaim_extra_reads !== 0) errors.push('ratchet: EFF047 preclaim-read drift');
  if (eff047.required?.atomic_create_authority_preserved !== true) errors.push('ratchet: EFF047 authority drift');
  if (eff047.required?.max_fast_claim_attempts !== 3) errors.push('ratchet: EFF047 attempt-budget drift');
  if (eff047.required?.stale_collision_refresh_law_preserved !== true) errors.push('ratchet: EFF047 stale-refresh drift');
  if (eff047.required?.regression_test !== 'coordination/portfolio/tests/role_ready_claim_path_suppression_v1.mjs') errors.push('ratchet: EFF047 regression-test drift');
}

const eff042 = baseline.items?.find(item => item.id === 'EFF042');
if (!eff042) errors.push('ratchet: EFF042 missing');
else {
  if (eff042.required?.trajectory_ref !== 'coordination/guide/GROWTH_TRAJECTORY_V1.json') errors.push('ratchet: EFF042 trajectory ref drift');
  if (eff042.required?.trajectory_plate !== 'TRJ001') errors.push('ratchet: EFF042 trajectory plate drift');
  if (eff042.required?.trajectory_url !== 'https://juanmanuelpm.github.io/prometeo/trajectory/') errors.push('ratchet: EFF042 trajectory url drift');
  if (eff042.required?.mission_reads_trajectory !== true) errors.push('ratchet: EFF042 mission read drift');
  if (eff042.required?.exponential_from_cumulative_counts_forbidden !== true) errors.push('ratchet: EFF042 exponential truth drift');
  if (eff042.required?.comparable_windows_required !== 3) errors.push('ratchet: EFF042 window gate drift');
  if (eff042.required?.product_vs_system_progress_required !== true) errors.push('ratchet: EFF042 product/system distinction drift');
  if (eff042.required?.literal_private_user_messages_publication_required !== false) errors.push('ratchet: EFF042 privacy drift');
}

const eff041 = baseline.items?.find(item => item.id === 'EFF041');
if (!eff041) errors.push('ratchet: EFF041 missing');
else {
  if (eff041.required?.trigger_token !== 'TAKEOVER CANARY TKV1') errors.push('ratchet: EFF041 trigger drift');
  if (eff041.required?.guide_version !== 'v1.9') errors.push('ratchet: EFF041 guide version drift');
  if (JSON.stringify(eff041.required?.phases) !== JSON.stringify(['00_STARTED','10_HYDRATED','20_ACTED','30_FINAL'])) errors.push('ratchet: EFF041 phases drift');
  if (eff041.required?.material_action_min !== 1) errors.push('ratchet: EFF041 action minimum drift');
  if (eff041.required?.status_refresh_is_material_action !== false) errors.push('ratchet: EFF041 status-only drift');
  if (eff041.required?.visible_response_min_chars !== 3500) errors.push('ratchet: EFF041 response completeness drift');
  if (eff041.required?.power_levers_min !== 3) errors.push('ratchet: EFF041 power lever drift');
  if (eff041.required?.relevant_page_urls_min !== 3) errors.push('ratchet: EFF041 page link drift');
  if (eff041.required?.exact_visible_response_persistence_required !== true) errors.push('ratchet: EFF041 response persistence drift');
  if (eff041.required?.pass_without_all_phase_artifacts_forbidden !== true) errors.push('ratchet: EFF041 pass integrity drift');
}

const eff040 = baseline.items?.find(item => item.id === 'EFF040');
if (!eff040) errors.push('ratchet: EFF040 missing');
else {
  if (eff040.required?.guide_brief_url !== 'https://juanmanuelpm.github.io/prometeo/guide/') errors.push('ratchet: EFF040 brief url drift');
  if (eff040.required?.guide_brief_plate !== 'GDB001') errors.push('ratchet: EFF040 plate drift');
  if (eff040.required?.current_wc_prompt_required !== true) errors.push('ratchet: EFF040 wc prompt drift');
  if (eff040.required?.human_action_explicit !== true) errors.push('ratchet: EFF040 human action drift');
  if (eff040.required?.next_guide_cycle_explicit !== true) errors.push('ratchet: EFF040 next guide drift');
  if (eff040.required?.utility_footer_last !== true) errors.push('ratchet: EFF040 footer position drift');
}

const eff039 = baseline.items?.find(item => item.id === 'EFF039');
if (!eff039) errors.push('ratchet: EFF039 missing');
else {
  if (eff039.required?.compass_ref !== 'coordination/guide/GUIDE_POWER_COMPASS_V1.json') errors.push('ratchet: EFF039 compass ref drift');
  if (eff039.required?.strategic_health_required !== true) errors.push('ratchet: EFF039 strategic health drift');
  if (eff039.required?.multiplicative_alternatives_required_when_grounded !== true) errors.push('ratchet: EFF039 alternatives drift');
  if (eff039.required?.minimal_file_plan_required_for_serious_experiments !== true) errors.push('ratchet: EFF039 file plan drift');
  if (eff039.required?.exact_visible_response_persisted_before_emit !== true) errors.push('ratchet: EFF039 literal response drift');
  if (eff039.required?.visible_response_directory !== 'coordination/guide/visible-responses') errors.push('ratchet: EFF039 visible response dir drift');
  if (eff039.required?.external_wake_only_after_internal_levers_exhausted !== true) errors.push('ratchet: EFF039 wake ordering drift');
}

const eff038 = baseline.items?.find(item => item.id === 'EFF038');
if (!eff038) errors.push('ratchet: EFF038 missing');
else {
  if (eff038.required?.guide_status_only_forbidden_when_high_yield_candidate !== true) errors.push('ratchet: EFF038 Guide action drift');
  if (eff038.required?.historical_candidate_pattern_ref !== 'coordination/workers/YIELD_PATTERN_CANDIDATE_V1.json') errors.push('ratchet: EFF038 historical candidate ref drift');
  if (eff038.required?.historical_pattern_id !== 'YIELD-10X-V1') errors.push('ratchet: EFF038 historical pattern id drift');
  if (eff038.required?.historical_worker_protocol_version !== 'v3.27') errors.push('ratchet: EFF038 historical worker protocol drift');
  if (eff038.required?.reproduction_result !== 'FAIL_REPRODUCTION_GATE') errors.push('ratchet: EFF038 falsification result drift');
  if (eff038.required?.new_assignment_forbidden !== true) errors.push('ratchet: EFF038 retired assignment guard drift');
  if (eff038.required?.superseded_for_active_strategy_by !== 'EFF051') errors.push('ratchet: EFF038 supersession drift');
  if (eff038.required?.scoreboard_leader_distinct_from_champion !== true) errors.push('ratchet: EFF038 scoreboard semantics drift');
  if (eff038.required?.champion_requires_non_null_pattern_id !== true) errors.push('ratchet: EFF038 pattern gate drift');
  if (eff038.required?.champion_min_independent_workers !== 3) errors.push('ratchet: EFF038 reproduction count drift');
  if (eff038.required?.champion_min_score !== 8) errors.push('ratchet: EFF038 score drift');
}

const eff029 = baseline.items?.find(item => item.id === 'EFF029');
if (!eff029) errors.push('ratchet: EFF029 missing');
else {
  if (eff029.required?.source_debt_time_only_retry_suppressed !== true) errors.push('ratchet: EFF029 time-only SOURCE_DEBT suppression drift');
  if (eff029.required?.unresolved_attention_preserved !== true) errors.push('ratchet: EFF029 unresolved attention drift');
  if (eff029.required?.next_pin_stamps_basis_fingerprint !== true) errors.push('ratchet: EFF029 basis fingerprint drift');
  if (eff029.required?.silent_owner_recovery_preserved !== true) errors.push('ratchet: EFF029 silent-owner recovery drift');
  if (eff029.required?.structured_source_debt_compacted !== true) errors.push('ratchet: EFF029 structured SOURCE_DEBT compaction drift');
  if (eff029.required?.latest_source_debt_return_preserved !== true) errors.push('ratchet: EFF029 latest structured SOURCE_DEBT return drift');
  if (eff029.required?.structured_open_exhaustive_negative_suppresses_time_only_recovery !== true) errors.push('ratchet: EFF029 structured exhaustive-negative suppression drift');
  if (eff029.required?.malformed_structured_source_debt_fail_closed !== true) errors.push('ratchet: EFF029 malformed structured SOURCE_DEBT fail-closed drift');
  if (eff029.required?.jose_v12_pinned_v11_structured_fixture !== true) errors.push('ratchet: EFF029 Jose V12 structured fixture drift');
  if (eff029.required?.dependent_source_debt_explicit_provenance !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT explicit provenance drift');
  if (eff029.required?.dependent_source_debt_bounded_exact_return_ref !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT bounded return-ref drift');
  if (eff029.required?.dependent_source_debt_time_only_retry_suppressed !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT time-only suppression drift');
  if (eff029.required?.dependent_source_debt_attention_provenance_preserved !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT attention provenance drift');
  if (eff029.required?.dependent_source_debt_next_pin_stamps_provenance !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT PIN provenance drift');
  if (eff029.required?.recursive_source_debt_evidence_traversal_forbidden !== true) errors.push('ratchet: EFF029 recursive SOURCE_DEBT traversal guard drift');
  if (eff029.required?.jose_v12_payload_dependency_fixture !== true) errors.push('ratchet: EFF029 Jose V12 payload dependency fixture drift');
  if (eff029.required?.dependent_source_debt_compact_frontier_observable !== true) errors.push('ratchet: EFF029 dependent SOURCE_DEBT compact-frontier observability drift');
}

const eff053 = baseline.items?.find(item => item.id === 'EFF053');
if (!eff053) errors.push('ratchet: EFF053 missing');
else {
  if (eff053.required?.latest_return_generation_preserved !== true) errors.push('ratchet: EFF053 latest-return generation drift');
  if (eff053.required?.one_silent_owner_liveness_retry_preserved !== true) errors.push('ratchet: EFF053 single silent-owner retry drift');
  if (eff053.required?.repeated_same_basis_silent_owner_retry_bounded !== true) errors.push('ratchet: EFF053 repeated silent-owner bound drift');
  if (eff053.required?.repeated_silent_owner_threshold !== 2) errors.push('ratchet: EFF053 threshold drift');
  if (eff053.required?.exhausted_reason !== 'SOURCE_DEBT_SILENT_OWNER_RETRY_EXHAUSTED') errors.push('ratchet: EFF053 exhausted reason drift');
  if (eff053.required?.recovery_attention_preserved !== true) errors.push('ratchet: EFF053 recovery-attention drift');
  if (eff053.required?.new_material_basis_reopens_recovery !== true) errors.push('ratchet: EFF053 new-basis reopen drift');
  if (eff053.required?.no_history_scan_required !== true) errors.push('ratchet: EFF053 history-scan drift');
  if (eff053.required?.regression_test !== 'coordination/portfolio/tests/source_debt_recovery_basis_gate_v1.mjs') errors.push('ratchet: EFF053 regression-test drift');
}

const eff059 = baseline.items?.find(item => item.id === 'EFF059');
if (!eff059) errors.push('ratchet: EFF059 missing');
else {
  if (eff059.required?.invalid_local_with_valid_dependency_falls_back !== true) errors.push('ratchet: EFF059 dependency fallback drift');
  if (eff059.required?.malformed_without_valid_dependency_fails_closed !== true) errors.push('ratchet: EFF059 fail-closed drift');
  if (eff059.required?.explicit_bounded_dependency_only !== true) errors.push('ratchet: EFF059 bounded-dependency drift');
  if (eff059.required?.recursive_source_debt_evidence_traversal_forbidden !== true) errors.push('ratchet: EFF059 recursive traversal drift');
  if (eff059.required?.unchanged_reason !== 'SOURCE_DEBT_BASIS_UNCHANGED') errors.push('ratchet: EFF059 unchanged-reason drift');
  if (eff059.required?.regression_test !== 'coordination/portfolio/tests/source_debt_recovery_basis_gate_v1.mjs') errors.push('ratchet: EFF059 regression-test drift');
}

const eff054 = baseline.items?.find(item => item.id === 'EFF054');
if (!eff054) errors.push('ratchet: EFF054 missing');
else {
  if (eff054.required?.allocator_preferred_prefix_preserved !== true) errors.push('ratchet: EFF054 preferred-prefix drift');
  if (eff054.required?.preferred_prefix_length !== 4) errors.push('ratchet: EFF054 prefix-length drift');
  if (eff054.required?.capability_signature_promotions_max !== 8) errors.push('ratchet: EFF054 promotion-cap drift');
  if (eff054.required?.exact_required_capabilities_signature !== true) errors.push('ratchet: EFF054 capability-signature drift');
  if (eff054.required?.capability_exemplars_promoted_before_truncation !== true) errors.push('ratchet: EFF054 promotion-order drift');
  if (eff054.required?.public_http_only_fixture_visible !== true) errors.push('ratchet: EFF054 public-HTTP fixture drift');
  if (eff054.required?.transport_bytes_max_unchanged !== 24000) errors.push('ratchet: EFF054 byte budget drift');
  if (eff054.required?.max_candidates_unchanged !== 24) errors.push('ratchet: EFF054 candidate budget drift');
  if (eff054.required?.claim_payload_shape_unchanged !== true) errors.push('ratchet: EFF054 payload-shape drift');
  if (eff054.required?.claim_authority_unchanged !== true) errors.push('ratchet: EFF054 authority drift');
  if (eff054.required?.regression_test !== 'coordination/portfolio/tests/claim_frontier_compact_v1.mjs') errors.push('ratchet: EFF054 regression-test drift');
}

must('fast-allocator', allocator, 'recoveryBasisGate');
must('fast-allocator', allocator, 'SOURCE_DEBT_BASIS_UNCHANGED');
must('fast-allocator', allocator, 'SOURCE_DEBT_SILENT_OWNER_RETRY_EXHAUSTED');
must('fast-allocator', allocator, 'silent_owners_since_return');
must('fast-allocator', allocator, 'source_debt_dependency_return_ref');
must('fast-allocator', allocator, "source_debt: gate.gate_kind === 'source_debt'");
must('fast-allocator', allocator, 'recovery_attention: recoveryAttention');
must('live-feed', liveBuilder, 'latest_pin_recovery_basis:latestPin?.doc?.recovery_basis_or_null || null');
must('live-feed', liveBuilder, 'generation:generation(latestReturn)');
must('fast-allocator', allocator, 'authorityBoundaryGate');
must('fast-allocator', allocator, 'AUTHORITY_DEBT_UNSATISFIED');
must('fast-allocator', allocator, 'AUTHORITY_GATE_MALFORMED_FAIL_CLOSED');
must('fast-allocator', allocator, 'AUTHORITY_GATE_SATISFACTION_INVALID_FAIL_CLOSED');
must('fast-allocator', allocator, 'authority_satisfied_by_evidence_ref');
must('live-feed', liveBuilder, 'authority_gate:compactAuthorityGate(authorityGate)');
must('live-feed', liveBuilder, 'satisfied_ref_exists');
must('live-feed', liveBuilder, 'latest_source_debt_return:compactSourceDebtReturn(latestSourceDebtReturn)');
must('live-feed', liveBuilder, 'source_debt_dependency:compactSourceDebtDependency(job)');
must('live-feed', liveBuilder, 'ref_bounded:refBounded');
must('live-feed', liveBuilder, 'structurally_valid: structurallyValid');
must('live-feed', liveBuilder, "searchResult === 'NO_EXACT_MATCH'");
const authorityBoundaryRecoveryTest = read(root, 'coordination/portfolio/tests/authority_boundary_recovery_gate_v1.mjs');
must('authority-boundary-recovery-test', authorityBoundaryRecoveryTest, 'AUTHORITY_BOUNDARY_RECOVERY_GATE_PASS');
must('authority-boundary-recovery-test', authorityBoundaryRecoveryTest, 'AUTHORITY_DEBT_UNSATISFIED');
must('authority-boundary-recovery-test', authorityBoundaryRecoveryTest, 'NEW_AUTHORITY_GATE_SATISFIED');
must('authority-boundary-recovery-test', authorityBoundaryRecoveryTest, 'AUTHORITY_GATE_SATISFACTION_INVALID_FAIL_CLOSED');
must('authority-boundary-recovery-test', authorityBoundaryRecoveryTest, 'Facultad G5 must not emit G6');

const sourceDebtRecoveryTest = read(root, 'coordination/portfolio/tests/source_debt_recovery_basis_gate_v1.mjs');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SOURCE_DEBT_RECOVERY_BASIS_GATE_PASS');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SILENT_OWNER_STALE_AFTER_LAST_RETURN');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SOURCE_DEBT_SILENT_OWNER_RETRY_EXHAUSTED');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'repeated silent SOURCE_DEBT basis must not emit another ordinary generation');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'Live feed must preserve latest portfolio return generation');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'latest_source_debt_return');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'SOURCE_DEBT_MALFORMED_FAIL_CLOSED');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'portfolio-jose-v12-pinned-v11-material-recovery-v1 must not emit a G5 recovery from age alone');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'invalid local SOURCE_DEBT projection must not mask a valid bounded dependency');
must('fast-allocator', allocator, 'local_source_debt_invalid');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'dependent SOURCE_DEBT must suppress time-only recovery');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'source_debt_dependency');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'source_debt_dependency_return_ref');
must('source-debt-recovery-test', sourceDebtRecoveryTest, 'compact claim frontier must keep dependent SOURCE_DEBT observable');

const claimFrontier = read(root, 'scripts/build-claim-frontier.mjs');
must('claim-frontier', claimFrontier, "schema:'prometeo.claim-frontier/v1'");
must('claim-frontier', claimFrontier, 'DEFAULT_MAX_CANDIDATES = 24');
must('claim-frontier', claimFrontier, 'DEFAULT_MAX_SERIALIZED_BYTES = 24_000');
must('claim-frontier', claimFrontier, "'source_path'");
must('claim-frontier', claimFrontier, 'recovery_attention:recoveryAttention');
must('claim-frontier', claimFrontier, 'source_debt_ref');
must('claim-frontier', claimFrontier, 'claim_payload_shape');
must('claim-frontier', claimFrontier, 'preserveCapabilityDiversity');
must('claim-frontier', claimFrontier, 'capabilitySignature');
must('claim-frontier', claimFrontier, 'DEFAULT_CAPABILITY_DIVERSITY_SLOTS = 8');
must('claim-frontier', claimFrontier, "fs.writeFileSync(outPath,JSON.stringify(out)+'\\n')");
const claimFrontierTest = read(root, 'coordination/portfolio/tests/claim_frontier_compact_v1.mjs');
must('claim-frontier-test', claimFrontierTest, 'CLAIM_FRONTIER_COMPACT_PASS');
must('claim-frontier-test', claimFrontierTest, 'CLAIM_FRONTIER_CAPABILITY_DIVERSITY_PASS');
must('claim-frontier-test', claimFrontierTest, 'compact frontier must promote an HTTP-only capability signature before truncation');
must('claim-frontier-test', claimFrontierTest, 'HTTP-only recovery must be visible inside the bounded compact frontier');
must('claim-frontier-test', claimFrontierTest, 'bytes<=24000');
must('claim-frontier-test', claimFrontierTest, 'byte budget must trim before transport overflow');

const roleClaimPathSuppression = read(root, 'scripts/suppress-concurrent-guide-rescate.mjs');
must('guide-role-claim-path-suppression', roleClaimPathSuppression, 'SUPPRESS_EXACT_EXISTING_IMMUTABLE_PIN_PATH');
const roleClaimPathSuppressionTest = read(root, 'coordination/portfolio/tests/role_ready_claim_path_suppression_v1.mjs');
must('guide-role-claim-path-suppression-test', roleClaimPathSuppressionTest, 'ROLE_READY_CLAIM_PATH_SUPPRESSION_PASS');
must('guide-role-claim-path-suppression-test', roleClaimPathSuppressionTest, 'STALE_FRONTIER_TWO_ALREADY_CLAIMED');

const branchHeadRetryTest = read(root, 'coordination/portfolio/tests/claim_branch_head_move_retry_v1.mjs');
must('branch-head-retry-test', branchHeadRetryTest, 'CLAIM_BRANCH_HEAD_MOVE_RETRY_PASS');
const sourceDebtPlannerTest = read(root, 'coordination/portfolio/tests/project_guide_source_debt_gate_v1.mjs');
must('source-debt-planner-test', sourceDebtPlannerTest, 'PROJECT_GUIDE_SOURCE_DEBT_GATE_PASS');
const httpVsRepresentativeJsItem = baseline?.items?.find(x=>x.id==='EFF050');
if (!httpVsRepresentativeJsItem) errors.push('ratchet: EFF050 missing');
else {
  if (httpVsRepresentativeJsItem.required?.http_navigation_satisfies_representative_js_browser !== false) errors.push('ratchet: EFF050 HTTP-vs-JS truth drift');
  if (httpVsRepresentativeJsItem.required?.absence_of_javascript_dom_execution_tool_is_definitive_absence !== true) errors.push('ratchet: EFF050 definitive-absence drift');
  if (httpVsRepresentativeJsItem.required?.unknown_unrelated_capability_is_not_absence !== true) errors.push('ratchet: EFF050 unknown-is-not-absence drift');
  if (httpVsRepresentativeJsItem.required?.capability_mismatch_preclaim_zero_authority_attempts !== true) errors.push('ratchet: EFF050 preclaim-attempt drift');
  if (httpVsRepresentativeJsItem.required?.jose_v12_web_fetch_only_fixture !== true) errors.push('ratchet: EFF050 Jose fixture drift');
  if (httpVsRepresentativeJsItem.required?.representative_js_profile_remains_eligible !== true) errors.push('ratchet: EFF050 representative-JS eligibility drift');
  if (httpVsRepresentativeJsItem.required?.regression_test !== 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs') errors.push('ratchet: EFF050 regression-test drift');
}
const wcHttpVsJsContract = read(root, 'wc');
const fastHttpVsJsContract = read(root, 'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
must('EFF050 wc', wcHttpVsJsContract, 'HTTP/search/fetch/navigation alone never satisfies `representative_javascript_browser`');
must('EFF050 fast allocation', fastHttpVsJsContract, 'HTTP/search/fetch/navigation alone never satisfies `representative_javascript_browser`');

const unrestrictedOriginHttpItem = baseline?.items?.find(x=>x.id==='EFF052');
if (!unrestrictedOriginHttpItem) errors.push('ratchet: EFF052 missing');
else {
  if (unrestrictedOriginHttpItem.required?.mediated_web_satisfies_unrestricted_public_http !== false) errors.push('ratchet: EFF052 mediated-web truth drift');
  if (unrestrictedOriginHttpItem.required?.code_runtime_without_network_satisfies_unrestricted_public_http !== false) errors.push('ratchet: EFF052 code-runtime network truth drift');
  if (unrestrictedOriginHttpItem.required?.absence_of_arbitrary_origin_http_client_is_definitive_absence !== true) errors.push('ratchet: EFF052 definitive-absence drift');
  if (unrestrictedOriginHttpItem.required?.genuine_arbitrary_origin_http_client_remains_eligible !== true) errors.push('ratchet: EFF052 genuine-client eligibility drift');
  if (unrestrictedOriginHttpItem.required?.ambiguous_origin_http_capability_is_not_absence !== true) errors.push('ratchet: EFF052 unknown-is-not-absence drift');
  if (unrestrictedOriginHttpItem.required?.capability_mismatch_preclaim_zero_authority_attempts !== true) errors.push('ratchet: EFF052 preclaim-attempt drift');
  if (unrestrictedOriginHttpItem.required?.regression_test !== 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs') errors.push('ratchet: EFF052 regression-test drift');
}
must('EFF052 wc', wcHttpVsJsContract, 'MEDIATED WEB ACCESS IS NOT UNRESTRICTED ORIGIN HTTP');
must('EFF052 wc', wcHttpVsJsContract, 'unrestricted_public_http_origin_fetch');
must('EFF052 fast allocation', fastHttpVsJsContract, 'MEDIATED WEB ACCESS IS NOT UNRESTRICTED ORIGIN HTTP');
must('EFF052 fast allocation', fastHttpVsJsContract, 'unrestricted_public_http_origin_fetch');
const capabilityFitTest = read(root, 'coordination/portfolio/tests/fast_allocator_capability_fit_v1.mjs');
must('capability-fit-test', capabilityFitTest, 'FAST_ALLOCATOR_CAPABILITY_FIT_PASS');
must('capability-fit-test', capabilityFitTest, 'unrestricted_public_http_origin_fetch');
must('capability-fit-test', capabilityFitTest, 'CAPABILITY_MISMATCH_PRECLAIM');
must('capability-fit-test', capabilityFitTest, 'legacySingularRows');
must('capability-fit-test', capabilityFitTest, 'real_browser_execution');
must('capability-fit-test', capabilityFitTest, 'authorityCreateAttempts');
must('capability-fit-test', capabilityFitTest, 'WEB_FETCH_ONLY_PRECLAIM_SKIP_PASS');
must('capability-fit-test', capabilityFitTest, 'MEDIATED_WEB_PUBLIC_HTTP_PRECLAIM_SKIP_PASS');
must('capability-fit-test', capabilityFitTest, 'arbitrary public-origin HTTP client');
must('capability-fit-test', capabilityFitTest, 'ambiguous arbitrary-origin HTTP capability must remain unknown rather than becoming absence');
must('capability-fit-test', capabilityFitTest, 'representative-JS profile must remain eligible for Jose V12');
must('capability-fit-test', capabilityFitTest, 'unknown JavaScript/DOM execution capability must remain unknown rather than becoming absence');
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
  must('public-wc', pointer, 'CANONICAL HUMAN INVOCATIONS TO COPY:');
  must('public-wc', pointer, 'autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios');
  must('public-wc', pointer, 'Before ownership, do NOT load Guide, Metabolism, page protocols');
  mustI('public-wc', pointer, 'create your beacon, read ONE compact claim frontier, then attempt atomic claim/PIN immediately');
  must('public-wc', pointer, 'READY -> QUEUE_READY -> ROLE_READY -> RECOVERY');
  must('public-wc', pointer, 'ROLE_READY is centrally compiled latent work');
  must('public-wc', pointer, 'CLAIM_TRANSPORT_BLOCKED');
  must('public-wc', pointer, 'CLAIM_TRANSPORT_AMBIGUOUS');
  must('public-wc', pointer, 'explicit authorization/safety denial');
  must('public-wc', pointer, 'eventos de telemetría');
  must('public-wc', pointer, 'BATCH <batch_id> EXPECTED <n>');
  must('public-wc', pointer, 'Issue #22');
  must('public-wc', pointer, 'observability');
  mustNot('public-wc', pointer, 'MANDATORY before allocation: load and obey the self-replenishing metabolism policy');
  mustNot('public-wc', pointer, 'Load and obey the distributed Guide/Rescate protocol');
  mustNot('public-wc', pointer, 'Load the page identity/request/publication laws before');
}


const eff048 = baseline.items?.find(item => item.id === 'EFF048');
if (!eff048) errors.push('ratchet: EFF048 missing');
else {
  if (eff048.required?.exact_signature !== 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING') errors.push('ratchet: EFF048 signature drift');
  if (eff048.required?.http_status !== 422) errors.push('ratchet: EFF048 HTTP status drift');
  if (eff048.required?.required_message_fragment !== '"sha" wasn\'t supplied') errors.push('ratchet: EFF048 message fragment drift');
  if (eff048.required?.classification !== 'CREATE_EXISTS') errors.push('ratchet: EFF048 classification drift');
  if (eff048.required?.claim_transport_ambiguous_for_exact_signature_forbidden !== true) errors.push('ratchet: EFF048 ambiguous transport guard drift');
  if (eff048.required?.branch_head_moved_for_exact_signature_forbidden !== true) errors.push('ratchet: EFF048 branch movement guard drift');
  if (eff048.required?.arbitrary_422_not_auto_collision !== true) errors.push('ratchet: EFF048 arbitrary 422 guard drift');
  if (eff048.required?.pre_read_before_classification_forbidden !== true) errors.push('ratchet: EFF048 pre-read guard drift');
  if (eff048.required?.authority_create_attempt_consumed !== true) errors.push('ratchet: EFF048 attempt accounting drift');
  if (eff048.required?.retained_candidate_advance_required !== true) errors.push('ratchet: EFF048 retained-candidate advance drift');
  if (eff048.required?.pool_tail_rescue_semantics_unchanged !== true) errors.push('ratchet: EFF048 pool-tail drift');
  if (eff048.required?.regression_test !== 'coordination/portfolio/tests/claim_create_exists_signature_v1.mjs') errors.push('ratchet: EFF048 regression-test drift');
}
const createExistsSignatureTest = read(root, 'coordination/portfolio/tests/claim_create_exists_signature_v1.mjs');
must('claim-create-exists-signature', createExistsSignatureTest, 'CLAIM_CREATE_EXISTS_SIGNATURE_PASS');
must('wc', wc, 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING');
must('wc', wc, '"sha" wasn\'t supplied');
must('fast-allocation', fast, 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING');
must('fast-allocation', fast, 'arbitrary HTTP 422');


const eff062 = baseline.items?.find(item => item.id === 'EFF062');
if (!eff062) errors.push('ratchet: EFF062 missing');
else {
  if (eff062.required?.batch_or_pool_only !== true) errors.push('ratchet: EFF062 pool/batch scope drift');
  if (eff062.required?.requires_real_create_exists !== true) errors.push('ratchet: EFF062 collision gate drift');
  if (eff062.required?.requires_retained_exact_initial_frontier_blob_sha !== true) errors.push('ratchet: EFF062 blob-SHA gate drift');
  if (eff062.required?.replay_transport !== 'GITHUB_FETCH_BLOB') errors.push('ratchet: EFF062 replay transport drift');
  if (eff062.required?.immutable_replay_max_per_worker_lifecycle !== 1) errors.push('ratchet: EFF062 replay bound drift');
  if (eff062.required?.byte_identical_original_snapshot_only !== true) errors.push('ratchet: EFF062 immutable snapshot drift');
  if (eff062.required?.newer_state_visibility !== false || eff062.required?.state_discovery_added !== 0) errors.push('ratchet: EFF062 state-discovery drift');
  if (eff062.required?.authority_attempt_accounting_unchanged !== true) errors.push('ratchet: EFF062 attempt accounting drift');
  if (eff062.required?.base_authority_create_attempts_max !== 3 || eff062.required?.pool_tail_rescue_max !== 1) errors.push('ratchet: EFF062 attempt ceiling drift');
  if (eff062.required?.payload_fabrication_forbidden !== true || eff062.required?.directory_archaeology_forbidden !== true) errors.push('ratchet: EFF062 anti-fabrication drift');
  if (eff062.required?.regression_test !== 'coordination/portfolio/tests/claim_frontier_immutable_replay_v1.mjs') errors.push('ratchet: EFF062 regression-test drift');
}
must('EFF062 wc', wcHttpVsJsContract, 'IMMUTABLE FRONTIER REPLAY');
must('EFF062 wc', wcHttpVsJsContract, 'fetch_blob');
must('EFF062 fast allocation', fastHttpVsJsContract, 'IMMUTABLE FRONTIER REPLAY');
must('EFF062 fast allocation', fastHttpVsJsContract, 'fetch_blob');
const immutableReplayTest = read(root, 'coordination/portfolio/tests/claim_frontier_immutable_replay_v1.mjs');
must('immutable-frontier-replay-test', immutableReplayTest, 'CLAIM_FRONTIER_IMMUTABLE_REPLAY_PASS');

if (errors.length) {
  console.error('EFFICIENCY_RATCHET_FAIL');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`EFFICIENCY_RATCHET_PASS checks=${ok.length} items=${baseline.items.length}`);
