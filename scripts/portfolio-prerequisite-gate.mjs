export function evaluatePortfolioPrerequisites(job = {}, evidenceByJob = {}) {
  const raw = Array.isArray(job?.prerequisite_jobs) ? job.prerequisite_jobs : [];
  const required = [...new Set(raw
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean))];

  const requestedMode = String(job?.prerequisite_mode || 'TERMINAL_SUCCESS').trim().toUpperCase();
  const supported = new Set(['TERMINAL_SUCCESS', 'ANY_RETURN']);
  const mode = supported.has(requestedMode) ? requestedMode : 'UNSUPPORTED';

  if (!required.length) {
    return Object.freeze({
      required: [],
      mode: supported.has(requestedMode) ? requestedMode : 'TERMINAL_SUCCESS',
      satisfied: true,
      unsatisfied: [],
      reason: 'NO_PREREQUISITES'
    });
  }

  if (mode === 'UNSUPPORTED') {
    return Object.freeze({
      required,
      mode: requestedMode,
      satisfied: false,
      unsatisfied: required,
      reason: 'UNSUPPORTED_PREREQUISITE_MODE'
    });
  }

  const unsatisfied = required.filter(id => {
    const evidence = evidenceByJob?.[id] || {};
    return mode === 'ANY_RETURN'
      ? evidence.any_return !== true
      : evidence.terminal_success !== true;
  });

  return Object.freeze({
    required,
    mode,
    satisfied: unsatisfied.length === 0,
    unsatisfied,
    reason: unsatisfied.length ? 'PREREQUISITES_UNSATISFIED' : 'PREREQUISITES_SATISFIED'
  });
}
