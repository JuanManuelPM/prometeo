const ELIGIBLE_STATES = new Set(['READY', 'READY_DERIVED']);
const FORBIDDEN_AUTHORITY = new Set(['GLOBAL_PROMOTION', 'CURRENT_PROMOTION', 'HUMAN_ACCEPTED_PROMOTION', 'SERVED_PROMOTION', 'PRODUCTION_W_PROMOTION']);

function n(value) {
  return Number.isFinite(value) ? value : 0;
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function rank(a, b) {
  return n(b.priority) - n(a.priority)
    || n(b.unblock_value) - n(a.unblock_value)
    || n(b.compounding_value) - n(a.compounding_value)
    || n(b.information_gain) - n(a.information_gain)
    || text(a.opportunity_id).localeCompare(text(b.opportunity_id));
}

function exclusionReason(op, surface, activeClaims) {
  if (!ELIGIBLE_STATES.has(op?.state)) return 'NOT_READY';
  if (op?.dependencies_satisfied !== true) return 'DEPENDENCIES_NOT_SATISFIED';
  if (activeClaims.has(op?.opportunity_id) || op?.active_claim === true) return 'ACTIVE_CLAIM';
  if (op?.live_write_collision === true) return 'LIVE_WRITE_COLLISION';
  if (FORBIDDEN_AUTHORITY.has(op?.authority_class)) return 'FORBIDDEN_AUTHORITY';
  if (op?.privacy_compatible === false) return 'PRIVACY_INCOMPATIBLE';
  if (op?.mutation_required === true && surface?.identity_resolved !== true) return 'IDENTITY_UNRESOLVED_FOR_MUTATION';
  if (op?.owner_resolved === false && op?.mutation_required === true) return 'OWNER_UNRESOLVED_FOR_MUTATION';
  return null;
}

export function deriveSurfaceWorkerDemand({ surface = {}, opportunities = [], active_claim_ids = [] } = {}) {
  if (!surface?.surface_id) throw new Error('surface.surface_id is required');
  if (!Array.isArray(opportunities)) throw new Error('opportunities must be an array');

  const activeClaims = new Set(active_claim_ids.filter(Boolean));
  const excluded = [];
  const eligible = [];

  for (const op of opportunities) {
    if (op?.surface_id !== surface.surface_id) continue;
    const reason = exclusionReason(op, surface, activeClaims);
    if (reason) {
      excluded.push({ opportunity_id: op?.opportunity_id || 'UNRESOLVED', reason });
      continue;
    }
    eligible.push(op);
  }

  eligible.sort(rank);

  const selected = [];
  const seenFingerprints = new Set();
  const seenCollisionKeys = new Set();

  for (const op of eligible) {
    const fingerprint = text(op.canonical_fingerprint, text(op.opportunity_id, 'UNRESOLVED'));
    const collisionKey = text(op.collision_key, `op:${text(op.opportunity_id, 'UNRESOLVED')}`);

    if (seenFingerprints.has(fingerprint)) {
      excluded.push({ opportunity_id: op.opportunity_id, reason: 'DUPLICATE_CANONICAL_FINGERPRINT' });
      continue;
    }
    if (seenCollisionKeys.has(collisionKey)) {
      excluded.push({ opportunity_id: op.opportunity_id, reason: 'SAME_COLLISION_GROUP_LOWER_RANK' });
      continue;
    }

    seenFingerprints.add(fingerprint);
    seenCollisionKeys.add(collisionKey);
    selected.push(op);
  }

  const declaredCap = Number.isInteger(surface.current_gate_parallel_cap) && surface.current_gate_parallel_cap >= 0
    ? surface.current_gate_parallel_cap
    : selected.length;
  const usefulFreeSlots = Math.min(declaredCap, selected.length);
  const runnable = selected.slice(0, usefulFreeSlots).map((op) => ({
    opportunity_id: op.opportunity_id,
    priority: n(op.priority),
    collision_key: text(op.collision_key, `op:${op.opportunity_id}`),
    mutation_required: op.mutation_required === true
  }));

  return {
    surface_id: surface.surface_id,
    usefulFreeSlots,
    basis: `durable READY after dependency/claim/collision/authority/privacy/identity gates; independent=${selected.length}; parallel_cap=${declaredCap}`,
    runnable,
    excluded: excluded.sort((a, b) => a.opportunity_id.localeCompare(b.opportunity_id))
  };
}

export function deriveMultiSurfaceWorkerDemand({ surfaces = [], opportunities = [], active_claim_ids = [] } = {}) {
  if (!Array.isArray(surfaces)) throw new Error('surfaces must be an array');
  const bySurface = surfaces.map((surface) => deriveSurfaceWorkerDemand({ surface, opportunities, active_claim_ids }));
  return {
    schema: 'prometeo.multi-surface-worker-demand/v1',
    surfaces: bySurface,
    totalUsefulFreeSlots: bySurface.reduce((sum, row) => sum + row.usefulFreeSlots, 0),
    sourceOfTruth: false,
    authority: 'DERIVED_CANDIDATE_PROJECTION_ONLY'
  };
}
