#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ms = value => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

const duration = unit => {
  const start = ms(unit?.started_at);
  const end = ms(unit?.completed_at);
  return start !== null && end !== null && end >= start ? end - start : null;
};

export function evaluateDeliveryDagRuntimeCanary({ producer = null, qa_precompile = null, promotion = {}, source_refs = [] } = {}) {
  const producerDuration = duration(producer);
  const qaDuration = duration(qa_precompile);
  const producerRelation = producer?.delivery_unit_ref || null;
  const qaRelation = qa_precompile?.delivery_unit_ref || null;
  const explicitComparableRelation = Boolean(producerRelation && qaRelation && producerRelation === qaRelation);
  const comparableEndpoints = producerDuration !== null && qaDuration !== null;

  let runtime = {
    status: 'INSUFFICIENT_COMPARABLE_RUNTIME_EVIDENCE',
    comparable_relation: explicitComparableRelation,
    overlap_ms: null,
    serial_baseline_ms: null,
    critical_path_ms: null,
    reduction_vs_serial_ratio: null,
    producer_duration_ms: producerDuration,
    qa_precompile_duration_ms: qaDuration,
    reason: explicitComparableRelation
      ? 'COMPARABLE_RELATION_EXISTS_BUT_DURABLE_START_OR_COMPLETE_ENDPOINT_IS_MISSING'
      : 'NO_EXPLICIT_DURABLE_RELATION_BETWEEN_PRODUCER_AND_QA_PRECOMPILE'
  };

  if (explicitComparableRelation && comparableEndpoints) {
    const ps = ms(producer.started_at);
    const pe = ms(producer.completed_at);
    const qs = ms(qa_precompile.started_at);
    const qe = ms(qa_precompile.completed_at);
    const overlap = Math.max(0, Math.min(pe, qe) - Math.max(ps, qs));
    const serial = producerDuration + qaDuration;
    const critical = Math.max(pe, qe) - Math.min(ps, qs);
    runtime = {
      status: overlap > 0 ? 'COMPARABLE_RUNTIME_OVERLAP_OBSERVED' : 'COMPARABLE_RUNTIME_SERIALIZATION_OBSERVED',
      comparable_relation: true,
      overlap_ms: overlap,
      serial_baseline_ms: serial,
      critical_path_ms: critical,
      reduction_vs_serial_ratio: serial > 0 ? (serial - critical) / serial : null,
      producer_duration_ms: producerDuration,
      qa_precompile_duration_ms: qaDuration,
      reason: overlap > 0 ? 'DURABLE_INTERVALS_OVERLAP' : 'DURABLE_INTERVALS_DO_NOT_OVERLAP'
    };
  }

  const blockerFailure = promotion?.blocker_result === 'FAIL';
  const advisoryOnly = promotion?.qa_precompile_advisory_only === true;
  const promotionReady = blockerFailure ? false : promotion?.promotion_ready ?? null;
  const reversibleCandidateUsable = promotion?.reversible_candidate_usable ?? null;

  return {
    schema: 'prometeo.delivery-dag-runtime-canary/v1',
    authority: 'OBSERVABILITY_ONLY',
    runtime,
    promotion_semantics: {
      qa_precompile_advisory_only: advisoryOnly,
      qa_precompile_in_promotion_fan_in: advisoryOnly ? false : null,
      blocker_result: promotion?.blocker_result ?? null,
      promotion_ready: promotionReady,
      reversible_candidate_usable: reversibleCandidateUsable,
      blocker_preserves_candidate: blockerFailure && reversibleCandidateUsable === true && promotionReady === false
    },
    collision_retry_evidence: {
      collisions: promotion?.collisions ?? null,
      retries: promotion?.retries ?? null,
      truth: promotion?.collisions == null && promotion?.retries == null ? 'UNKNOWN_WHEN_NO_BOUND_DURABLE_COUNTERS' : 'OBSERVED'
    },
    source_refs,
    truth_boundaries: [
      'Unrelated workers that merely overlap in wall-clock time are never treated as one delivery DAG.',
      'A comparable runtime pair requires the same explicit durable delivery_unit_ref plus durable start and completion endpoints.',
      'QA-precompile advisory evidence never becomes promotion authority.',
      'Missing comparable producer evidence is INSUFFICIENT_COMPARABLE_RUNTIME_EVIDENCE, never inferred concurrency.',
      'This projection grants no scheduler, liveness, CURRENT, Human Accepted, Served or promotion authority.'
    ]
  };
}

function main(argv = process.argv.slice(2)) {
  const input = argv[0];
  const output = argv[1];
  if (!input || !output) throw new Error('usage: delivery-dag-runtime-canary.mjs <input.json> <output.json>');
  const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
  const result = evaluateDeliveryDagRuntimeCanary(payload);
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${result.runtime.status}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
