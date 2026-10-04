const parseTime = value => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

export function classifySourceFreshness(generatedAt, options = {}) {
  const now = parseTime(options.now) ?? Number(options.now) ?? Date.now();
  const staleAfterMs = Math.max(1, Number(options.staleAfterMs ?? 30000));
  const generated = parseTime(generatedAt);
  if (generated == null) return {status:'MISSING', age_ms:null, generated_at:null};
  const age = Math.max(0, now - generated);
  return {status: age < staleAfterMs ? 'FRESH' : 'STALE', age_ms:age, generated_at:new Date(generated).toISOString()};
}

export function aggregateRequiredSourceFreshness(sources = {}, options = {}) {
  const required = Array.isArray(options.required) ? options.required.map(String) : Object.keys(sources);
  const perSource = {};
  for (const name of required) perSource[name] = classifySourceFreshness(sources?.[name]?.generated_at ?? sources?.[name], options);
  const states = Object.values(perSource);
  const status = states.length > 0 && states.every(x => x.status === 'FRESH') ? 'FRESH' : states.some(x => x.status === 'MISSING') ? 'MISSING' : 'STALE';
  const ages = states.map(x => x.age_ms).filter(Number.isFinite);
  return {
    schema:'prometeo.required-source-freshness/v1',
    status,
    required_sources:required,
    per_source:perSource,
    stalest_age_ms:ages.length ? Math.max(...ages) : null
  };
}

export function validateScoreboardGenerationBinding(scoreboard = {}, sidecar = {}) {
  const sha = String(sidecar?.source_sha || '').toLowerCase();
  const scoreboardAt = String(scoreboard?.generated_at || '');
  const sidecarAt = String(sidecar?.scoreboard_generated_at || '');
  const bound = scoreboard?.schema === 'prometeo.worker-scoreboard/v1' &&
    sidecar?.schema === 'prometeo.worker-scoreboard-generation-freshness/v1' &&
    sidecar?.status === 'SOURCE_BOUND' &&
    /^[0-9a-f]{40}$/.test(sha) &&
    scoreboardAt && scoreboardAt === sidecarAt;
  return {
    schema:'prometeo.scoreboard-generation-binding-check/v1',
    status:bound ? 'SOURCE_BOUND' : 'UNBOUND',
    source_sha:bound ? sha : null,
    scoreboard_generated_at:bound ? scoreboardAt : null,
    truth_boundary:'Generation binding is not read-time freshness, liveness, or authority.'
  };
}

export function classifyWorkerEvidence(lastActivityAt, options = {}) {
  const now = parseTime(options.now) ?? Number(options.now) ?? Date.now();
  const at = parseTime(lastActivityAt);
  if (at == null) return {status:'NO_EVIDENCE', age_ms:null, contributes_live_capacity:false};
  const age = Math.max(0, now - at);
  if (age < 6 * 60000) return {status:'FRESH_ACTIVE', age_ms:age, contributes_live_capacity:true};
  if (age < 10 * 60000) return {status:'STALE_SUSPECT', age_ms:age, contributes_live_capacity:false};
  return {status:'REPLACEABLE', age_ms:age, contributes_live_capacity:false};
}
