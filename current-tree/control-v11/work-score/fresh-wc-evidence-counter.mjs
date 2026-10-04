import { isFreshDurableWorkerEvidence } from './capacity-projection-semantics.mjs';

const workerId = span => String(span?.actor_id || span?.worker_id || '').trim();

export function deriveFreshWcEvidenceCounter(spans, options = {}) {
  const ids = new Set();
  let acceptedEvidenceRows = 0;

  for (const span of Array.isArray(spans) ? spans : []) {
    if (!isFreshDurableWorkerEvidence(span, options)) continue;
    const id = workerId(span);
    if (!id) continue;
    acceptedEvidenceRows += 1;
    ids.add(id);
  }

  const freshWorkerIds = [...ids].sort();
  return {
    authority: 'DERIVED_PROJECTION_ONLY',
    fresh_available_wc: freshWorkerIds.length,
    fresh_worker_ids: freshWorkerIds,
    accepted_evidence_rows: acceptedEvidenceRows,
    duplicate_evidence_rows: Math.max(0, acceptedEvidenceRows - freshWorkerIds.length),
    evidence_rule: 'fresh durable worker evidence only; old ACTIVE/PARKED labels are not liveness',
    semantics_owner: 'B023_CAPACITY_PROJECTION_SEMANTICS'
  };
}
