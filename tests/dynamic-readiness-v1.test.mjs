import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  deriveOpportunityReadiness,
  classifyDependencyEvidence,
  buildProjectionFromRepository,
  detectDependencyCycles
} from '../scripts/derive-opportunity-readiness.mjs';

const q = opportunities => ({queue_id:'Q-T', opportunities});
const done = (id, run='R1') => ({opportunity_id:id, run_id:run, state:'DONE', return_ref:`coordination/opportunities/returns/${id}/${run}.json`});
const ret = (id, run='R1', state='RETURNED_CANDIDATE') => ({opportunity_id:id, run_id:run, state, __path:`coordination/opportunities/returns/${id}/${run}.json`});
const blocked = (id, dependencies, activation_rule='ALL_DEPENDENCIES_HAVE_RETURN', extra={}) => ({opportunity_id:id,status:'BLOCKED_DEPENDENCY',dependencies,activation_rule,...extra});

// Exact RETURN + DONE pair satisfies a dependency.
{
  const evidence = classifyDependencyEvidence('A', {runs:[done('A')], returns:[ret('A')]});
  assert.equal(evidence.satisfied, true);
  assert.equal(evidence.reason_code, 'RETURN_AND_DONE_PROVEN');
}

// RETURN without DONE is visible but not terminal.
{
  const projection = deriveOpportunityReadiness({queues:[q([blocked('B',['A'])])], returns:[ret('A')]});
  const b = projection.opportunities[0];
  assert.equal(b.derived_status, 'BLOCKED_DEPENDENCY');
  assert.ok(b.reasons.includes('A:RETURN_WITHOUT_DONE'));
}

// DONE without RETURN cannot satisfy the prerequisite.
{
  const projection = deriveOpportunityReadiness({queues:[q([blocked('B',['A'])])], runs:[done('A')]});
  const b = projection.opportunities[0];
  assert.equal(b.derived_status, 'BLOCKED_DEPENDENCY');
  assert.ok(b.reasons.includes('A:DONE_WITHOUT_RETURN'));
}

// All explicit dependencies with paired terminal evidence derive READY.
{
  const source = q([blocked('C',['A','B'])]);
  const frozen = JSON.stringify(source);
  const projection = deriveOpportunityReadiness({
    queues:[source],
    runs:[done('A','RA'),done('B','RB')],
    returns:[ret('A','RA'),ret('B','RB')]
  });
  assert.equal(projection.opportunities[0].derived_status, 'READY_DERIVED');
  assert.equal(projection.opportunities[0].claimable_if_unclaimed, true);
  assert.equal(JSON.stringify(source), frozen, 'derivation must not mutate queue source');
}

// Failed/boundary prerequisite invalidates activation.
{
  const projection = deriveOpportunityReadiness({
    queues:[q([blocked('B',['A'])])],
    runs:[{opportunity_id:'A',run_id:'RFAIL',state:'FAILED'}]
  });
  assert.equal(projection.opportunities[0].derived_status, 'BLOCKED_DEPENDENCY');
  assert.ok(projection.opportunities[0].reasons.includes('FAILED_PREREQUISITE'));
}

// Conflicted durable evidence blocks even if another attempt looks successful.
{
  const projection = deriveOpportunityReadiness({
    queues:[q([blocked('B',['A'])])],
    runs:[done('A','ROK')],
    returns:[ret('A','ROK'),ret('A','RCONFLICT','CONFLICTED')]
  });
  assert.equal(projection.opportunities[0].derived_status, 'BLOCKED_DEPENDENCY');
  assert.ok(projection.opportunities[0].reasons.includes('CONFLICTED_PREREQUISITE'));
}

// Cycles are blocked and never broken by priority or arbitrary edge deletion.
{
  const queue = q([
    blocked('A',['B']),
    blocked('B',['A'])
  ]);
  const cycles = detectDependencyCycles([queue]);
  assert.deepEqual(new Set(['A','B']), cycles);
  const projection = deriveOpportunityReadiness({queues:[queue]});
  assert.ok(projection.opportunities.every(x => x.reasons.includes('DEPENDENCY_CYCLE')));
}

// Authority block wins even when dependencies are satisfied.
{
  const projection = deriveOpportunityReadiness({
    queues:[q([blocked('B',['A'],'ALL_DEPENDENCIES_HAVE_RETURN',{authority_gate:{resolved:false}})])],
    runs:[done('A')],
    returns:[ret('A')]
  });
  const b = projection.opportunities[0];
  assert.equal(b.derived_status, 'BLOCKED_AUTHORITY');
  assert.equal(b.claimable_if_unclaimed, false);
}

// ANY_MAJOR_INTEGRATION_RETURN activates on one proven dependency, not mere return prose.
{
  const projection = deriveOpportunityReadiness({
    queues:[q([blocked('B',['A','X'],'ANY_MAJOR_INTEGRATION_RETURN')])],
    runs:[done('A')],
    returns:[ret('A')]
  });
  assert.equal(projection.opportunities[0].derived_status, 'READY_DERIVED');
}

// Unsupported activation rules stay blocked with a machine-readable reason.
{
  const projection = deriveOpportunityReadiness({
    queues:[q([blocked('B',['A'],'MAGIC')])],
    runs:[done('A')],
    returns:[ret('A')]
  });
  assert.equal(projection.opportunities[0].derived_status, 'BLOCKED_DEPENDENCY');
  assert.ok(projection.opportunities[0].reasons.includes('UNSUPPORTED_ACTIVATION_RULE'));
}

// Existing READY lanes are preserved as source readiness, not re-authored by this compiler.
{
  const projection = deriveOpportunityReadiness({queues:[q([{opportunity_id:'R',status:'READY',priority:999}])]});
  const r = projection.opportunities[0];
  assert.equal(r.derived_status, 'READY_SOURCE');
  assert.equal(r.claimable_if_unclaimed, true);
}

// Repository scanner recursively pairs standard runs/returns and emits auditable source hashes.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-readiness-'));
  const queuePath = 'coordination/opportunities/Q.json';
  fs.mkdirSync(path.join(root,'coordination/opportunities/runs/A'),{recursive:true});
  fs.mkdirSync(path.join(root,'coordination/opportunities/returns/A'),{recursive:true});
  fs.writeFileSync(path.join(root,queuePath), JSON.stringify(q([blocked('B',['A'])])));
  fs.writeFileSync(path.join(root,'coordination/opportunities/runs/A/R.json'), JSON.stringify(done('A','R')));
  fs.writeFileSync(path.join(root,'coordination/opportunities/returns/A/R.json'), JSON.stringify({opportunity_id:'A',run_id:'R',state:'RETURNED_CANDIDATE'}));
  const projection = buildProjectionFromRepository({repoRoot:root,queuePaths:[queuePath]});
  assert.equal(projection.opportunities[0].derived_status,'READY_DERIVED');
  assert.match(projection.sources.queues[0].sha256,/^[0-9a-f]{64}$/);
  assert.equal(projection.sources.runs_loaded,1);
  assert.equal(projection.sources.returns_loaded,1);
}

console.log(JSON.stringify({ok:true,tests:11,contract:'dynamic-readiness-v1'},null,2));
