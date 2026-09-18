const TERMINAL_OUTCOMES = new Set(['done','verified','no_action_needed','superseded']);

const lower = value => String(value ?? '').toLowerCase();
const normalizeRef = value => String(value ?? '').trim().split('#')[0];

const lineageRefs = job => {
  const refs = [];
  if (typeof job?.derived_from_return === 'string') refs.push(job.derived_from_return);
  if (Array.isArray(job?.derived_from_returns)) refs.push(...job.derived_from_returns);
  return [...new Set(refs.map(normalizeRef).filter(Boolean))];
};

const isTerminalReturn = row =>
  TERMINAL_OUTCOMES.has(lower(row?.outcome ?? row?.status ?? row?.result));

export function buildGroundedReproductionMetric(jobs = []) {
  const eligible = new Set();
  for (const job of jobs) {
    for (const row of job?.returns || []) {
      const returnPath = normalizeRef(row?.path);
      if (returnPath && isTerminalReturn(row)) eligible.add(returnPath);
    }
  }

  let groundedSuccessors = 0;
  for (const job of jobs) {
    if (job?.origin !== 'derived') continue;
    if (lineageRefs(job).some(ref => eligible.has(ref))) groundedSuccessors += 1;
  }

  const eligibleTerminalReturns = eligible.size;
  return {
    grounded_successors: groundedSuccessors,
    eligible_terminal_returns: eligibleTerminalReturns,
    ratio: eligibleTerminalReturns ? groundedSuccessors / eligibleTerminalReturns : 0
  };
}
