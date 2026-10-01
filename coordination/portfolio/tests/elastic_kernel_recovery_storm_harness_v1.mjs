#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const cases = [
  {
    id: 'lost-heartbeat-and-concurrent-recovery',
    file: 'worker_liveness_fast_recovery_v1.mjs',
    proves: ['lost_heartbeat_or_expiry_gate', 'single_recovery_generation_winner', 'predecessor_lineage', 'loser_reentry', 'terminal_blocks_new_generation']
  },
  {
    id: 'portfolio-pin-contention',
    file: 'portfolio_pin_race_v1.mjs',
    proves: ['concurrent_initial_claim_single_winner', 'concurrent_recovery_single_winner', 'collision_receipts', 'recovery_lineage']
  },
  {
    id: 'repeated-capability-boundary',
    file: 'repeated_capability_boundary_gate_v1.mjs',
    proves: ['terminal_capability_pressure_gate', 'unknown_or_absent_capability_skips_reincarnation', 'new_basis_reopens_only_with_evidence']
  },
  {
    id: 'fixed-generation-recovery-filter',
    file: 'fixed_generation_recovery_filter_v1.mjs',
    proves: ['fixed_generation_does_not_reincarnate_as_ordinary_recovery', 'ordinary_retry_generation_preserved']
  },
  {
    id: 'terminal-supersession',
    file: 'recovery_terminal_supersession_v1.mjs',
    proves: ['terminal_superseded_does_not_recover', 'nonterminal_route_abort_remains_recoverable', 'compact_frontier_preserves_legitimate_recovery']
  },
  {
    id: 'local-batch-single-generation-owner',
    file: 'local_batch_e5_single_generation_recovery_v1.mjs',
    proves: ['single_generation_owner_not_reopened', 'fresh_fixed_generation_still_claimable']
  },
  {
    id: 'authority-boundary-recovery-gate',
    file: 'authority_boundary_recovery_gate_v1.mjs',
    proves: ['authority_boundary_does_not_become_unsafe_retry']
  },
  {
    id: 'parent-successor-recovery-policy',
    file: 'parent_successor_recovery_policy_v1.mjs',
    proves: ['recovery_successor_policy_preserves_parent_context_without_human_courier']
  },
  {
    id: 'new-evidence-recovery-gate',
    file: 'new_evidence_gate_recovery_filter_v1.mjs',
    proves: ['recovery_requires_material_new_evidence_when_gated']
  }
];

const results = [];
for (const testCase of cases) {
  const target = path.join(here, testCase.file);
  const run = spawnSync(process.execPath, [target], {
    cwd: path.resolve(here, '../../..'),
    encoding: 'utf8',
    timeout: 120_000
  });
  results.push({
    id: testCase.id,
    file: testCase.file,
    proves: testCase.proves,
    status: run.status,
    signal: run.signal || null,
    stdout_tail: (run.stdout || '').trim().split('\n').slice(-8).join('\n'),
    stderr_tail: (run.stderr || '').trim().split('\n').slice(-8).join('\n')
  });
  if (run.status !== 0) {
    console.error(JSON.stringify({
      ok: false,
      failed_case: testCase.id,
      failed_file: testCase.file,
      results
    }, null, 2));
    process.exit(run.status || 1);
  }
}

const evidenceMap = {
  fixtures_cover_lost_heartbeat_replaceable_predecessor_stale_generation_capability_boundary_and_concurrency: [
    'worker_liveness_fast_recovery_v1.mjs',
    'portfolio_pin_race_v1.mjs',
    'repeated_capability_boundary_gate_v1.mjs',
    'fixed_generation_recovery_filter_v1.mjs'
  ],
  one_current_generation_can_mutate_or_close: [
    'portfolio_pin_race_v1.mjs',
    'fixed_generation_recovery_filter_v1.mjs',
    'local_batch_e5_single_generation_recovery_v1.mjs',
    'recovery_terminal_supersession_v1.mjs'
  ],
  terminal_boundary_does_not_reincarnate_without_new_evidence: [
    'repeated_capability_boundary_gate_v1.mjs',
    'new_evidence_gate_recovery_filter_v1.mjs',
    'recovery_terminal_supersession_v1.mjs'
  ],
  recovery_successor_preserves_lineage_without_human_courier: [
    'worker_liveness_fast_recovery_v1.mjs',
    'portfolio_pin_race_v1.mjs',
    'parent_successor_recovery_policy_v1.mjs'
  ]
};

console.log(JSON.stringify({
  ok: true,
  schema: 'prometeo.elastic-kernel-recovery-storm-harness-result/v1',
  cases: results.length,
  pass: results.every(row => row.status === 0),
  evidence_map: evidenceMap,
  results
}, null, 2));
