#!/usr/bin/env node
import fs from 'node:fs';
import {BINDING_CANARY_POLICY, buildRecoveryAttempt, buildStaleProbe, evaluateRecovery} from './swarm-lease-lib.mjs';

export function scanSubjects(input = {}) {
  const now = input.now;
  const rootPolicy = input.policy ?? null;
  const subjects = Array.isArray(input.subjects) ? input.subjects : [];
  const results = subjects.map((subject) => {
    const policy = subject.policy ?? rootPolicy;
    const evaluation = evaluateRecovery({
      subject_id: subject.subject_id ?? subject.opportunity_id ?? null,
      events: subject.events ?? [],
      now,
      policy,
      retryable: subject.retryable === true,
      recovery_mode: subject.recovery_mode ?? 'READ_ONLY_RECOVERY',
      target_refetched: subject.target_refetched === true,
      expected_sha: subject.expected_sha ?? null,
      observed_sha: subject.observed_sha ?? null,
      active_overlap: subject.active_overlap === true,
      abandoned_evidence: subject.abandoned_evidence === true,
    });

    const opportunityId = subject.opportunity_id ?? subject.subject_id ?? null;
    const probe = buildStaleProbe({
      probe_id: subject.probe_id ?? `probe:${opportunityId ?? 'unknown'}:${now ?? 'unknown'}`,
      opportunity_id: opportunityId,
      original_claim_ref: subject.original_claim_ref ?? 'UNKNOWN_CLAIM_REF',
      original_run_ref: subject.original_run_ref ?? null,
      observed_at: now,
      evaluation,
    });

    let recovery_candidate = null;
    if (evaluation.recovery_eligible && subject.emit_recovery_candidate === true) {
      recovery_candidate = buildRecoveryAttempt({
        recovery_attempt_id: subject.recovery_attempt_id,
        opportunity_id: opportunityId,
        original_claim_ref: subject.original_claim_ref,
        original_run_ref: subject.original_run_ref ?? null,
        recovery_worker_instance_id: subject.recovery_worker_instance_id,
        created_at: now,
        source_head: subject.source_head ?? null,
        epoch: subject.epoch ?? null,
        mode: subject.recovery_mode ?? 'READ_ONLY_RECOVERY',
        evaluation,
        intended_write_scope: subject.intended_write_scope ?? [],
      });
    }

    return {subject_id: evaluation.subject_id, evaluation, stale_probe_candidate: probe, recovery_candidate};
  });

  return {
    schema: 'prometeo.swarm-stale-scan/v1',
    mode: 'READ_ONLY_CANDIDATE_SCAN',
    scanned_at: now ?? null,
    binding_default_policy: BINDING_CANARY_POLICY,
    mutation_performed: false,
    subjects_scanned: results.length,
    recovery_candidates: results.filter((result) => result.recovery_candidate).length,
    results,
  };
}

function usage() {
  return `Usage: node scripts/swarm-stale-scan.mjs [--pretty] [input.json]\n\nReads JSON from a file or stdin and writes a read-only stale/recovery candidate projection.\nThe scanner never mutates claims, runs, returns, or target files.`;
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const pretty = argv.includes('--pretty');
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  const raw = positional[0] ? fs.readFileSync(positional[0], 'utf8') : fs.readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  process.stdout.write(`${JSON.stringify(scanSubjects(input), null, pretty ? 2 : 0)}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
