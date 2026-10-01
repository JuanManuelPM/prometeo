#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ms = value => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

const eventDeliveryRef = event => String(event?.delivery_unit_ref || '').trim() || null;

export function normalizeDeliveryUnit(unit = null) {
  if (!unit) return null;
  if (unit.started || unit.completion) {
    const started = unit.started || null;
    const completion = unit.completion || null;
    const startedRef = eventDeliveryRef(started);
    const completionRef = eventDeliveryRef(completion);
    const stableRef = startedRef && completionRef && startedRef === completionRef ? startedRef : null;
    return {
      delivery_unit_ref: stableRef,
      started_at: started?.started_at || null,
      completed_at: completion?.completed_at || completion?.returned_at || null,
      event_binding_status: stableRef
        ? 'STARTED_COMPLETION_REF_MATCH'
        : (startedRef || completionRef ? 'STARTED_COMPLETION_REF_MISSING_OR_MISMATCHED' : 'NO_DELIVERY_UNIT_REF'),
      started_ref: unit.started_ref || null,
      completion_ref: unit.completion_ref || null
    };
  }
  return unit;
}

const duration = unit => {
  const start = ms(unit?.started_at);
  const end = ms(unit?.completed_at);
  return start !== null && end !== null && end >= start ? end - start : null;
};

export function evaluateDeliveryDagRuntimeCanary({ producer = null, qa_precompile = null, producer_events = null, qa_precompile_events = null, promotion = {}, source_refs = [] } = {}) {
  const normalizedProducer = normalizeDeliveryUnit(producer_events || producer);
  const normalizedQa = normalizeDeliveryUnit(qa_precompile_events || qa_precompile);
  const producerDuration = duration(normalizedProducer);
  const qaDuration = duration(normalizedQa);
  const producerRelation = normalizedProducer?.delivery_unit_ref || null;
  const qaRelation = normalizedQa?.delivery_unit_ref || null;
  const explicitComparableRelation = Boolean(producerRelation && qaRelation && producerRelation === qaRelation);
  const comparableEndpoints = producerDuration !== null && qaDuration !== null;

  let runtime = {
    status: 'INSUFFICIENT_COMPARABLE_RUNTIME_EVIDENCE',
    comparable_relation: explicitComparableRelation,
    delivery_unit_ref: explicitComparableRelation ? producerRelation : null,
    overlap_ms: null,
    serial_baseline_ms: null,
    critical_path_ms: null,
    reduction_vs_serial_ratio: null,
    producer_duration_ms: producerDuration,
    qa_precompile_duration_ms: qaDuration,
    producer_event_binding_status: normalizedProducer?.event_binding_status || null,
    qa_precompile_event_binding_status: normalizedQa?.event_binding_status || null,
    reason: explicitComparableRelation
      ? 'COMPARABLE_RELATION_EXISTS_BUT_DURABLE_START_OR_COMPLETE_ENDPOINT_IS_MISSING'
      : 'NO_EXPLICIT_DURABLE_RELATION_BETWEEN_PRODUCER_AND_QA_PRECOMPILE'
  };

  if (explicitComparableRelation && comparableEndpoints) {
    const ps = ms(normalizedProducer.started_at);
    const pe = ms(normalizedProducer.completed_at);
    const qs = ms(normalizedQa.started_at);
    const qe = ms(normalizedQa.completed_at);
    const overlap = Math.max(0, Math.min(pe, qe) - Math.max(ps, qs));
    const serial = producerDuration + qaDuration;
    const critical = Math.max(pe, qe) - Math.min(ps, qs);
    runtime = {
      status: overlap > 0 ? 'COMPARABLE_RUNTIME_OVERLAP_OBSERVED' : 'COMPARABLE_RUNTIME_SERIALIZATION_OBSERVED',
      comparable_relation: true,
      delivery_unit_ref: producerRelation,
      overlap_ms: overlap,
      serial_baseline_ms: serial,
      critical_path_ms: critical,
      reduction_vs_serial_ratio: serial > 0 ? (serial - critical) / serial : null,
      producer_duration_ms: producerDuration,
      qa_precompile_duration_ms: qaDuration,
      producer_event_binding_status: normalizedProducer?.event_binding_status || null,
      qa_precompile_event_binding_status: normalizedQa?.event_binding_status || null,
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
      'When STARTED/completion event pairs are supplied, each side must carry the same delivery_unit_ref before that interval becomes comparable.',
      'Historical events without a durable relation are never backfilled or inferred.',
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
