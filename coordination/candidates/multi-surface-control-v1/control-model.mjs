export const CONTROL_MODEL_VERSION = 1;

export const REQUIRED_SURFACE_IDS = Object.freeze([
  'control-plan',
  'prometeo-mobile',
  'facultad-digital',
  'alumnos-teacher'
]);

const ALLOWED_INTEGRATION_STATES = new Set([
  'UNPROVEN',
  'NOT_STARTED',
  'DISCOVERY',
  'READY_FOR_LOCAL_STEWARD',
  'INTEGRATING_CANDIDATE',
  'VERIFIED_CANDIDATE',
  'BLOCKED'
]);

function finiteNonNegative(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, 'https://juanmanuelpm.github.io/prometeo/');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeSurface(raw = {}) {
  const integrationState = ALLOWED_INTEGRATION_STATES.has(raw?.integration?.status)
    ? raw.integration.status
    : 'UNPROVEN';

  const activeWorkers = Array.isArray(raw?.workers?.active)
    ? raw.workers.active.filter((id) => typeof id === 'string' && id.trim())
    : [];

  const returnedChanges = Array.isArray(raw?.returns?.items)
    ? raw.returns.items.filter((item) => item && typeof item === 'object')
    : [];

  return {
    id: safeText(raw.id),
    title: safeText(raw.title, safeText(raw.id, 'Superficie')),
    projectId: safeText(raw.projectId, 'UNRESOLVED'),
    intent: {
      summary: safeText(raw?.intent?.summary, 'Sin intención durable compilada'),
      threadRef: safeText(raw?.intent?.threadRef, 'UNRESOLVED'),
      state: safeText(raw?.intent?.state, 'UNPROVEN')
    },
    workers: { active: activeWorkers, count: activeWorkers.length },
    returns: {
      items: returnedChanges,
      count: returnedChanges.length,
      unread: finiteNonNegative(raw?.returns?.unread)
    },
    integration: {
      status: integrationState,
      evidenceRef: safeText(raw?.integration?.evidenceRef, 'UNRESOLVED')
    },
    preview: {
      label: safeText(raw?.preview?.label, 'Abrir'),
      href: safeHref(raw?.preview?.href),
      routeState: safeText(raw?.preview?.routeState, raw?.preview?.href ? 'KNOWN' : 'UNRESOLVED')
    },
    capacity: {
      usefulFreeSlots: finiteNonNegative(raw?.capacity?.usefulFreeSlots),
      basis: safeText(raw?.capacity?.basis, 'No calculado')
    },
    authority: {
      source: safeText(raw?.authority?.source, 'DURABLE_DERIVED_STATE'),
      humanAccepted: raw?.authority?.humanAccepted === true,
      current: raw?.authority?.current === true,
      served: raw?.authority?.served === true
    }
  };
}

export function validateControlState(state = {}) {
  const errors = [];
  if (state.schema !== 'prometeo.multi-surface-control-state/v1') {
    errors.push('schema must be prometeo.multi-surface-control-state/v1');
  }
  if (!Array.isArray(state.surfaces)) {
    errors.push('surfaces must be an array');
    return { ok: false, errors };
  }

  const ids = new Set(state.surfaces.map((surface) => surface?.id));
  for (const id of REQUIRED_SURFACE_IDS) {
    if (!ids.has(id)) errors.push(`missing required surface: ${id}`);
  }

  for (const surface of state.surfaces) {
    if (!surface?.id) errors.push('surface missing id');
    if (surface?.authority?.humanAccepted || surface?.authority?.current || surface?.authority?.served) {
      errors.push(`candidate state must not self-promote authority: ${surface?.id || 'unknown'}`);
    }
    if (surface?.preview?.routeState === 'UNRESOLVED' && surface?.preview?.href) {
      errors.push(`unresolved route must not carry href: ${surface?.id || 'unknown'}`);
    }
  }

  if (state?.telemetry?.sourceOfTruth === true) {
    errors.push('telemetry/live projection cannot be source of truth');
  }

  return { ok: errors.length === 0, errors };
}

export function buildControlView(state) {
  const validation = validateControlState(state);
  if (!validation.ok) {
    const error = new Error(`Invalid multi-surface control state: ${validation.errors.join('; ')}`);
    error.validation = validation;
    throw error;
  }

  const surfaces = state.surfaces.map(normalizeSurface);
  const working = surfaces.reduce((sum, surface) => sum + surface.workers.count, 0);
  const returned = surfaces.reduce((sum, surface) => sum + surface.returns.count, 0);
  const unread = surfaces.reduce((sum, surface) => sum + surface.returns.unread, 0);
  const usefulFreeSlots = surfaces.reduce((sum, surface) => sum + surface.capacity.usefulFreeSlots, 0);
  const problems = surfaces.filter((surface) => ['BLOCKED', 'UNPROVEN'].includes(surface.integration.status)).length;

  return {
    schema: state.schema,
    generatedAt: safeText(state.generatedAt, 'UNSPECIFIED'),
    authorityBanner: 'CANDIDATE · derived view only · not Current / Human Accepted / Served',
    telemetry: { working, returned, unread, problems, usefulFreeSlots, sourceOfTruth: false },
    surfaces
  };
}
