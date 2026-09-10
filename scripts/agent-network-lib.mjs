import crypto from 'node:crypto';

export const uniq = xs => [...new Set((xs || []).filter(Boolean).map(String))];
export const sha256 = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const ACTIVE_WRITE_STATES = Object.freeze(new Set([
  'ACTIVE','CLAIMED','EXECUTING','WRITING','INTEGRATING','WORKING','RUNNING','MATERIAL_WORK'
]));

export function scopePrefix(scope) {
  return String(scope || '')
    .replace(/\\/g, '/')
    .replace(/\*\*.*$/, '')
    .replace(/\*.*$/, '')
    .replace(/\/$/, '');
}

export function scopesOverlap(a = [], b = []) {
  const A = uniq(a).map(scopePrefix).filter(Boolean);
  const B = uniq(b).map(scopePrefix).filter(Boolean);
  return A.some(x => B.some(y => x === y || x.startsWith(y + '/') || y.startsWith(x + '/')));
}

export function intersects(a = [], b = []) {
  const B = new Set(uniq(b).map(norm));
  return uniq(a).some(x => B.has(norm(x)));
}

export function isActiveWriter(ws = {}) {
  const states = uniq([
    ...(ws.worker_states || []),
    ws.worker_state,
    ws.state,
  ]).map(s => String(s).toUpperCase());
  return states.some(s => ACTIVE_WRITE_STATES.has(s));
}

export function relatedToWorkstream(event, ws) {
  const ids = new Set([ws.id, ...(ws.topics || []), ...(ws.depends_on || []), ...(ws.needs || [])].map(norm));
  const targets = uniq([...(event.targets || []), ...(event.topics || []), ...(event.dependencies || [])]).map(norm);
  return targets.includes('all') || targets.some(x => ids.has(x));
}

export function deriveConvergence(workstreams = []) {
  const events = [];
  const sorted = [...workstreams].sort((a,b)=>String(a.id).localeCompare(String(b.id)));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      const sameRepo = (a.repository || 'JuanManuelPM/prometeo') === (b.repository || 'JuanManuelPM/prometeo');
      const overlap = sameRepo && scopesOverlap(a.write_scope, b.write_scope);
      if (overlap) {
        const live = isActiveWriter(a) && isActiveWriter(b);
        events.push(live ? {
          type: 'HARD_WRITE_COLLISION',
          severity: 'HARD',
          participants: [a.id, b.id],
          targets: [a.id, b.id],
          reason: 'Overlapping write scopes are currently owned by active writing workers.',
          blocking: true
        } : {
          type: 'INACTIVE_SCOPE_OVERLAP',
          severity: 'INFO',
          participants: [a.id, b.id],
          targets: [a.id, b.id],
          reason: 'Declared scopes overlap, but both sides are not active writers; this is context, not a live lock.',
          blocking: false
        });
      }

      const aProvides = uniq(a.provides), bProvides = uniq(b.provides);
      const aNeeds = uniq([...(a.needs || []), ...(a.depends_on || [])]);
      const bNeeds = uniq([...(b.needs || []), ...(b.depends_on || [])]);

      if (intersects(aProvides, bNeeds)) {
        events.push({
          type: a.material_activity ? 'DEPENDENCY_CHANGED' : 'NEED_SATISFIED',
          severity: 'SOFT',
          participants: [a.id, b.id],
          source: a.id,
          targets: [b.id],
          dependencies: aProvides.filter(x => intersects([x], bNeeds)),
          reason: a.material_activity ? 'Provider changed while consumer depends on it.' : 'A declared need has an available provider.',
          blocking: false
        });
      }
      if (intersects(bProvides, aNeeds)) {
        events.push({
          type: b.material_activity ? 'DEPENDENCY_CHANGED' : 'NEED_SATISFIED',
          severity: 'SOFT',
          participants: [b.id, a.id],
          source: b.id,
          targets: [a.id],
          dependencies: bProvides.filter(x => intersects([x], aNeeds)),
          reason: b.material_activity ? 'Provider changed while consumer depends on it.' : 'A declared need has an available provider.',
          blocking: false
        });
      }

      const sharedOwners = uniq(a.candidate_shared_owners).filter(x => intersects([x], b.candidate_shared_owners || []));
      if (sharedOwners.length) {
        events.push({
          type: 'SHARED_OWNER_CANDIDATE',
          severity: 'SOFT',
          participants: [a.id, b.id],
          targets: [a.id, b.id],
          candidate_owners: sharedOwners,
          reason: 'Two workstreams independently point at the same reusable owner.',
          blocking: false
        });
      }
    }
  }

  for (const source of sorted) {
    if (!source.last_useful_delta) continue;
    const targets = uniq(source.impacts).filter(x => x !== source.id);
    if (!targets.length) continue;
    events.push({
      type: 'INFORMATIONAL_IMPACT',
      severity: 'INFO',
      participants: [source.id],
      source: source.id,
      targets,
      topics: targets,
      summary: source.last_useful_delta,
      reason: 'A worker marked its last useful delta as potentially relevant elsewhere.',
      blocking: false
    });
  }

  return events.map(e => ({...e, event_id: `E-${sha256(e).slice(0,12)}`}));
}

export function filterRelevantEvents(events, ws) {
  return events.filter(e => (e.participants || []).includes(ws.id) || relatedToWorkstream(e, ws));
}

export function publicWorker(worker = {}) {
  const allowed = [
    'schema','worker_instance_id','workstream_id','repository','branch','state','mode','updated_at','frontier',
    'last_useful_delta','write_scope','needs','provides','depends_on','impacts','candidate_shared_owners','epoch_seen','reported_head','privacy'
  ];
  const out = {};
  for (const key of allowed) if (worker[key] !== undefined) out[key] = worker[key];
  return out;
}

export function assertPublicSafe(value) {
  const text = JSON.stringify(value).toLowerCase();
  const forbiddenShapes = [
    '"service_role"',
    '"service_role_key"',
    '"password"',
    '"access_token"',
    '"refresh_token"',
    '"patent_token"',
    '"authorization":"bearer ',
    '"authorization": "bearer '
  ];
  const hit = forbiddenShapes.find(x => text.includes(x));
  if (hit) throw new Error(`PUBLIC_NETWORK_PRIVACY_VIOLATION:${hit}`);
  return true;
}
