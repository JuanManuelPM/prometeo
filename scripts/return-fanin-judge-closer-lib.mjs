const arr = value => Array.isArray(value) ? value : [];
const str = value => String(value ?? '').trim();

export const RETURN_FANIN_SCHEMA = 'prometeo.return-fanin/v1';
export const CAMPAIGN_VERDICT_SCHEMA = 'prometeo.campaign-verdict/v1';
export const CAMPAIGN_CLOSE_SCHEMA = 'prometeo.campaign-close/v1';

export function canonicalReturnIdentity(ret = {}) {
  const campaign = str(ret.campaign_id) || str(ret.project_id) || 'UNSCOPED';
  const work = str(ret.work_id) || str(ret.guide_work_id) || str(ret.job_id) || 'UNBOUND';
  const job = str(ret.job_id) || work;
  const returnId = str(ret.return_id) || [job, ret.generation ?? 'NA', str(ret.worker_id) || 'UNKNOWN'].join(':');
  return {campaign, work, job, return_id: returnId};
}

function canonicalReturnKey(identity = {}) {
  return [identity.campaign, identity.work, identity.job, identity.return_id].map(str).join('::');
}

export function fanInReturns(returns = []) {
  const byReturnIdentity = new Map();
  for (const ret of arr(returns)) {
    const identity = canonicalReturnIdentity(ret);
    const identityKey = canonicalReturnKey(identity);
    const previous = byReturnIdentity.get(identityKey);
    if (!previous) {
      byReturnIdentity.set(identityKey, ret);
      continue;
    }
    const previousAt = Date.parse(previous.returned_at || 0) || 0;
    const currentAt = Date.parse(ret.returned_at || 0) || 0;
    if (currentAt > previousAt) byReturnIdentity.set(identityKey, ret);
  }

  const groups = new Map();
  for (const ret of byReturnIdentity.values()) {
    const identity = canonicalReturnIdentity(ret);
    const key = `${identity.campaign}::${identity.work}::${identity.job}`;
    if (!groups.has(key)) groups.set(key, {campaign_id: identity.campaign, work_id: identity.work, job_id: identity.job, returns: []});
    groups.get(key).returns.push(ret);
  }

  const grouped = [...groups.values()].map(group => ({
    ...group,
    returns: group.returns.sort((a, b) => canonicalReturnIdentity(a).return_id.localeCompare(canonicalReturnIdentity(b).return_id))
  })).sort((a, b) => `${a.campaign_id}:${a.work_id}:${a.job_id}`.localeCompare(`${b.campaign_id}:${b.work_id}:${b.job_id}`));

  return {
    schema: RETURN_FANIN_SCHEMA,
    unique_return_count: byReturnIdentity.size,
    groups: grouped
  };
}

function outcomeClass(ret = {}) {
  const value = str(ret.outcome).toUpperCase();
  if (['DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED'].includes(value)) return 'PASS';
  if (value.includes('BOUNDARY')) return 'BOUNDARY';
  if (value.includes('PARTIAL')) return 'PARTIAL';
  if (value.includes('FAIL') || value.includes('ERROR') || value === 'ROUTE_ABORTED') return 'FAIL';
  return 'UNKNOWN';
}

function generationRank(ret = {}) {
  const generation = Number(ret.generation);
  return Number.isFinite(generation) ? generation : -1;
}

function newestCompatibleReturn(candidates = []) {
  return [...candidates].sort((a, b) => {
    const generationDelta = generationRank(b) - generationRank(a);
    if (generationDelta) return generationDelta;
    const timeDelta = (Date.parse(b.returned_at || 0) || 0) - (Date.parse(a.returned_at || 0) || 0);
    if (timeDelta) return timeDelta;
    return canonicalReturnIdentity(b).return_id.localeCompare(canonicalReturnIdentity(a).return_id);
  })[0];
}

export function judgeCampaign({campaign_id, required_lanes = [], returns = []} = {}) {
  const fanin = fanInReturns(returns);
  const lanes = arr(required_lanes).map(str).filter(Boolean);
  const evidence = [];
  const missing = [];
  const failed = [];
  const boundaries = [];

  for (const lane of lanes) {
    const candidates = fanin.groups
      .flatMap(group => group.returns)
      .filter(ret => str(ret.campaign_id || ret.project_id) === str(campaign_id) && (str(ret.lane) === lane || str(ret.job_id) === lane || str(ret.work_id) === lane));
    if (!candidates.length) {
      missing.push(lane);
      continue;
    }
    const latest = newestCompatibleReturn(candidates);
    const classification = outcomeClass(latest);
    const ref = str(latest.return_ref) || str(latest.return_id);
    evidence.push({lane, classification, ref, generation: latest.generation ?? null});
    if (classification === 'FAIL' || classification === 'UNKNOWN' || classification === 'PARTIAL') failed.push(lane);
    if (classification === 'BOUNDARY') boundaries.push(lane);
  }

  const pass = missing.length === 0 && failed.length === 0 && boundaries.length === 0;
  return {
    schema: CAMPAIGN_VERDICT_SCHEMA,
    campaign_id: str(campaign_id),
    status: pass ? 'PASS' : 'INCOMPLETE',
    required_lanes: lanes,
    evidence,
    missing_lanes: missing,
    failed_or_partial_lanes: failed,
    boundary_lanes: boundaries,
    authority: 'EVIDENCE_ONLY_NO_PROMOTION_AUTHORITY'
  };
}

export function closeCampaign({verdict, durable_boundary = null, prior_close = null} = {}) {
  if (prior_close?.schema === CAMPAIGN_CLOSE_SCHEMA && prior_close?.status === 'CLOSED') {
    return prior_close;
  }
  const boundaryValid = durable_boundary && typeof durable_boundary === 'object' && str(durable_boundary.ref) && str(durable_boundary.code);
  const verdictPass = verdict?.schema === CAMPAIGN_VERDICT_SCHEMA && verdict?.status === 'PASS';
  if (verdictPass || boundaryValid) {
    return {
      schema: CAMPAIGN_CLOSE_SCHEMA,
      campaign_id: str(verdict?.campaign_id),
      status: 'CLOSED',
      basis: verdictPass ? 'VERDICT_PASS' : 'DURABLE_BOUNDARY',
      verdict,
      durable_boundary: boundaryValid ? durable_boundary : null,
      authority: 'CLOSE_EVIDENCE_ONLY_PRIMARY_CHAT_PROJECTION_NOT_AUTHORITY'
    };
  }
  const needed = [...new Set([
    ...arr(verdict?.missing_lanes),
    ...arr(verdict?.failed_or_partial_lanes),
    ...arr(verdict?.boundary_lanes)
  ].map(str).filter(Boolean))].sort();
  return {
    schema: CAMPAIGN_CLOSE_SCHEMA,
    campaign_id: str(verdict?.campaign_id),
    status: 'CONTINUE',
    basis: 'REQUIREMENTS_UNSATISFIED',
    continuity_request: needed,
    verdict,
    authority: 'CONTINUITY_REQUEST_ONLY_NO_SCHEDULING_OR_PROMOTION_AUTHORITY'
  };
}

export function reduceLateReturn({prior_close = null, incoming_return = null} = {}) {
  if (prior_close?.schema === CAMPAIGN_CLOSE_SCHEMA && prior_close?.status === 'CLOSED') {
    return {close: prior_close, ignored: true, reason: 'VALID_CLOSE_IMMUTABLE_TO_LATE_OR_STALE_RETURN'};
  }
  return {close: prior_close, ignored: false, incoming_return};
}
