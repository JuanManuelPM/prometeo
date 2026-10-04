const DEFAULT_MAX_AGE_MS = 30_000;

const parsedTime = value => {
  const ms = Date.parse(value || '');
  return Number.isFinite(ms) ? ms : null;
};

export function projectSourceFreshness(sources = {}, options = {}) {
  const nowMs = Number.isFinite(Number(options.now_ms)) ? Number(options.now_ms) : Date.now();
  const maxAgeMs = Number.isFinite(Number(options.max_age_ms)) && Number(options.max_age_ms) >= 0
    ? Number(options.max_age_ms)
    : DEFAULT_MAX_AGE_MS;
  const required = Array.isArray(options.required) && options.required.length
    ? options.required.map(String)
    : Object.keys(sources);

  const perSource = {};
  for (const name of required) {
    const generatedAt = sources?.[name]?.generated_at ?? sources?.[name] ?? null;
    const generatedMs = parsedTime(generatedAt);
    const ageMs = generatedMs === null ? null : Math.max(0, nowMs - generatedMs);
    perSource[name] = {
      generated_at: generatedMs === null ? null : new Date(generatedMs).toISOString(),
      age_ms: ageMs,
      fresh: ageMs !== null && ageMs < maxAgeMs
    };
  }

  const staleSources = required.filter(name => !perSource[name]?.fresh);
  const generated = required.map(name => parsedTime(perSource[name]?.generated_at)).filter(Number.isFinite);
  return {
    schema: 'prometeo.work-score-source-freshness/v1',
    max_age_ms: maxAgeMs,
    all_required_fresh: staleSources.length === 0,
    stale_sources: staleSources,
    oldest_required_generated_at: generated.length ? new Date(Math.min(...generated)).toISOString() : null,
    newest_required_generated_at: generated.length ? new Date(Math.max(...generated)).toISOString() : null,
    sources: perSource,
    truth_boundary: 'Freshness is evaluated independently for every required source. One fresh source never makes another source fresh.'
  };
}

export function scoreRowsWhenFresh(scoreboard, options = {}) {
  const state = projectSourceFreshness({ scoreboard }, {
    now_ms: options.now_ms,
    max_age_ms: options.max_age_ms,
    required: ['scoreboard']
  });
  return state.all_required_fresh && Array.isArray(scoreboard?.launch_measurements)
    ? scoreboard.launch_measurements
    : [];
}
