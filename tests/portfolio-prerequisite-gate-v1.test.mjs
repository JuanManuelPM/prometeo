import assert from 'node:assert/strict';
import { evaluatePortfolioPrerequisites } from '../scripts/portfolio-prerequisite-gate.mjs';

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

console.log('PORTFOLIO_PREREQUISITE_GATE_V1_PASS');
