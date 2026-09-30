import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluatePortfolioPrerequisites } from '../scripts/portfolio-prerequisite-gate.mjs';

const readJson = rel => JSON.parse(
  fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
);

assert.deepEqual(
  evaluatePortfolioPrerequisites({}, {}),
  {required:[], mode:'TERMINAL_SUCCESS', satisfied:true, unsatisfied:[], reason:'NO_PREREQUISITES'}
);

const evidence={
  A:{any_return:true,terminal_success:true},
  B:{any_return:true,terminal_success:false},
  C:{any_return:false,terminal_success:false}
};

let g=evaluatePortfolioPrerequisites({prerequisite_jobs:['A','B']}, evidence);
assert.equal(g.satisfied,false);
assert.deepEqual(g.unsatisfied,['B']);
assert.equal(g.mode,'TERMINAL_SUCCESS');

g=evaluatePortfolioPrerequisites({prerequisite_jobs:['A','B'],prerequisite_mode:'ANY_RETURN'}, evidence);
assert.equal(g.satisfied,true);
assert.deepEqual(g.unsatisfied,[]);

g=evaluatePortfolioPrerequisites({prerequisite_jobs:['A','C'],prerequisite_mode:'ANY_RETURN'}, evidence);
assert.equal(g.satisfied,false);
assert.deepEqual(g.unsatisfied,['C']);

g=evaluatePortfolioPrerequisites({prerequisite_jobs:['A'],prerequisite_mode:'MAGIC'}, evidence);
assert.equal(g.satisfied,false);
assert.equal(g.reason,'UNSUPPORTED_PREREQUISITE_MODE');

// CURRENT real-chain regression: PRE-GUIDE synthesis -> critic-v2 -> finalizer-v2.
const synthesis = readJson(
  'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-worker-pre-guide-synthesis-v1.json'
);
const critic = readJson(
  'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-worker-pre-guide-critic-v2.json'
);
const finalizer = readJson(
  'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-worker-pre-guide-finalizer-v2.json'
);

assert.deepEqual(critic.prerequisite_jobs, [synthesis.job_id]);
assert.deepEqual(finalizer.prerequisite_jobs, [synthesis.job_id, critic.job_id]);

const absent = {};
g = evaluatePortfolioPrerequisites(critic, absent);
assert.equal(g.satisfied, false);
assert.deepEqual(g.unsatisfied, [synthesis.job_id]);

const synthesisSuccess = {
  [synthesis.job_id]: {any_return:true, terminal_success:true}
};
g = evaluatePortfolioPrerequisites(critic, synthesisSuccess);
assert.equal(g.satisfied, true);
assert.deepEqual(g.unsatisfied, []);

g = evaluatePortfolioPrerequisites(finalizer, synthesisSuccess);
assert.equal(g.satisfied, false);
assert.deepEqual(g.unsatisfied, [critic.job_id]);

const criticSuccess = {
  ...synthesisSuccess,
  [critic.job_id]: {any_return:true, terminal_success:true}
};
g = evaluatePortfolioPrerequisites(finalizer, criticSuccess);
assert.equal(g.satisfied, true);
assert.deepEqual(g.unsatisfied, []);

// Non-success returns are evidence, not prerequisite completion.
for (const outcome of ['BOUNDARY','ROUTE_ABORTED','PARTIAL']) {
  const nonSuccess = {
    ...synthesisSuccess,
    [critic.job_id]: {
      any_return:true,
      terminal_success:false,
      fixture_outcome:outcome
    }
  };
  g = evaluatePortfolioPrerequisites(finalizer, nonSuccess);
  assert.equal(g.satisfied, false, outcome + ' must not satisfy finalizer prerequisite');
  assert.deepEqual(g.unsatisfied, [critic.job_id]);
}

// Missing RETURN is also fail-closed.
g = evaluatePortfolioPrerequisites(finalizer, {
  [synthesis.job_id]: {any_return:true, terminal_success:true}
});
assert.equal(g.satisfied, false);
assert.deepEqual(g.unsatisfied, [critic.job_id]);

console.log('PORTFOLIO_PREREQUISITE_GATE_V1_PASS');
