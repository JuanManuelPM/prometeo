import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  canonicalFingerprint,
  compilePlannerGeneration,
  stableStringify
} from '../scripts/compile-planner-generation.mjs';

const fixturePath = new URL('./fixtures/prometeo-planner-recursion/g0-source.json', import.meta.url);
const base = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

// 1. Same immutable input produces byte-logically identical output/digests.
{
  const a = compilePlannerGeneration(clone(base));
  const b = compilePlannerGeneration(clone(base));
  assert.deepEqual(a, b);
  assert.equal(a.output.input_digest, b.output.input_digest);
  assert.equal(a.output.output_digest, b.output.output_digest);
  assert.equal(stableStringify(a.output), stableStringify(b.output));
}

// 2. Exact fingerprint links to existing work instead of duplicating execution.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  const atom = source.dispositionLedger.dispositions[0].planning_atoms[0];
  source.existingOpportunities = [{opportunity_id:'O-EXISTING', canonical_fingerprint: canonicalFingerprint(atom)}];
  const {output} = compilePlannerGeneration(source);
  assert.equal(output.opportunities.length, 0);
  assert.ok(output.dispositions.some(x => x.disposition === 'LINK_TO_EXISTING' && x.opportunity_id === 'O-EXISTING'));
}

// 3. A hard dependency remains blocked until explicitly satisfied.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  source.dispositionLedger.dispositions[0].planning_atoms[0].dependency_ids = ['O-DEP'];
  let result = compilePlannerGeneration(source).output;
  assert.equal(result.opportunities[0].derived_status, 'BLOCKED_DEPENDENCY');
  source.satisfiedDependencyIds = ['O-DEP'];
  result = compilePlannerGeneration(source).output;
  assert.equal(result.opportunities[0].derived_status, 'READY_DERIVED');
}

// 4. Unresolved authority or forbidden promotion label cannot become READY.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  const atom = source.dispositionLedger.dispositions[0].planning_atoms[0];
  atom.authority_resolved = false;
  let result = compilePlannerGeneration(source).output;
  assert.equal(result.opportunities[0].derived_status, 'BLOCKED_AUTHORITY');
  atom.authority_resolved = true;
  atom.requested_authority_label = 'CURRENT';
  result = compilePlannerGeneration(source).output;
  assert.equal(result.opportunities[0].derived_status, 'BLOCKED_AUTHORITY');
}

// 5. Privacy is a hard gate, never a weighted ranking term.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  source.dispositionLedger.dispositions[0].planning_atoms[0].privacy_class = 'UNRESOLVED';
  const {output} = compilePlannerGeneration(source);
  assert.equal(output.opportunities[0].derived_status, 'BLOCKED_PRIVACY');
}

// 6. Critic insertion is deterministic and excludes the route author.
{
  const {output} = compilePlannerGeneration(clone(base));
  const critic = output.opportunities.find(x => x.type === 'CRITIQUE');
  assert.ok(critic);
  assert.deepEqual(critic.forbidden_worker_ids, ['worker-route-author']);
  assert.equal(output.opportunities.filter(x => x.type === 'CRITIQUE').length, 1);
}

// 7. Soft textual similarity does not merge different write scopes/semantic targets.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  const atom = source.dispositionLedger.dispositions[0].planning_atoms[0];
  const second = clone(atom);
  second.semantic_target_id = 'capability-y/validator-v';
  second.allowed_write_scope = ['candidate/validator-y/**'];
  source.dispositionLedger.dispositions[0].planning_atoms.push(second);
  const {output} = compilePlannerGeneration(source);
  assert.equal(output.opportunities.length, 2);
  assert.notEqual(output.opportunities[0].canonical_fingerprint, output.opportunities[1].canonical_fingerprint);
}

// 8. Dependency cycles are blocked; priority cannot erase an edge.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  const a = source.dispositionLedger.dispositions[0].planning_atoms[0];
  a.opportunity_id = 'O-A';
  const b = clone(a);
  b.opportunity_id = 'O-B';
  a.semantic_target_id = 'A';
  b.semantic_target_id = 'B';
  a.dependency_ids = ['O-B'];
  b.dependency_ids = ['O-A'];
  source.dispositionLedger.dispositions[0].planning_atoms = [a, b];
  const {output} = compilePlannerGeneration(source);
  assert.ok(output.opportunities.every(x => x.derived_status === 'BLOCKED_DEPENDENCY'));
  assert.ok(output.opportunities.every(x => x.block_reasons.includes('DEPENDENCY_CYCLE')));
}

// 9. Non-CONSUMED dispositions fail closed and derive no work.
{
  const source = clone(base);
  source.criticPolicy.required = false;
  source.dispositionLedger.dispositions[0].disposition = 'DEFERRED';
  const {output} = compilePlannerGeneration(source);
  assert.equal(output.opportunities.length, 0);
  assert.equal(output.stop_state_or_null, 'STABLE_NO_NEW_WORK');
}

// 10. CLI writes deterministic OUTPUT/QUEUE candidate bytes.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-planner-'));
  const source = path.join(tmp, 'source.json');
  const outA = path.join(tmp, 'a');
  const outB = path.join(tmp, 'b');
  fs.writeFileSync(source, JSON.stringify(base, null, 2));
  for (const out of [outA, outB]) {
    const run = spawnSync(process.execPath, [new URL('../scripts/compile-planner-generation.mjs', import.meta.url).pathname, '--source', source, '--out', out], {encoding:'utf8'});
    assert.equal(run.status, 0, run.stderr || run.stdout);
  }
  assert.equal(fs.readFileSync(path.join(outA,'OUTPUT.json'),'utf8'), fs.readFileSync(path.join(outB,'OUTPUT.json'),'utf8'));
  assert.equal(fs.readFileSync(path.join(outA,'QUEUE.json'),'utf8'), fs.readFileSync(path.join(outB,'QUEUE.json'),'utf8'));
}

console.log('prometeo planner recursion v1: 10 checks passed');
