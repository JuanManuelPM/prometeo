#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { compileForgePointInterface } from '../scripts/compile-forge-point-interface.mjs';
import { validateForgePointInterface } from '../scripts/validate-forge-point-interface.mjs';

const canonical = {
  blueprint_id: 'FORGE-BLUEPRINT-84-01',
  point_no: 7,
  canonical_version: 3,
  canonical_text: 'Canonical exact bytes.\nSecond line.\n'
};

function draft() {
  return {
    interface_version: 1,
    purpose: 'Expose a compact executable contract without replacing the canonical.',
    inputs: [{id:'input.work',type:'WorkItem',required:true,description:'Assigned work.',constraints:[]}],
    outputs: [{id:'output.receipt',type:'Receipt',required:true,description:'Observable result.',constraints:[]}],
    states: [
      {id:'state.ready',description:'Ready to execute.',terminal:false},
      {id:'state.done',description:'Execution accepted.',terminal:true}
    ],
    operations: [{
      id:'op.execute',
      requires_state:'state.ready',
      input_ids:['input.work'],
      output_ids:['output.receipt'],
      next_state:'state.done',
      event_ids:['event.done'],
      failure_modes:['VALIDATION_FAILED']
    }],
    events: [{id:'event.done',trigger:'result accepted',payload:[]}],
    invariants: [{id:'inv.canonical_preserved',status:'CANONICAL',statement:'The compact interface never replaces the canonical.',evidence_ref:'repo://docs/cognitive-forge/BACKLOG-176-COMPACT-INTERFACE-SCHEMA-SPEC.md'}],
    dependencies: [],
    tests: [{id:'test.compile',precondition:'Canonical bytes and a structured draft exist.',action:'Compile the point interface.',expected_observable_result:'A valid v1 interface is emitted with deterministic provenance.'}],
    open_decisions: []
  };
}

const cases = [];
function check(name, fn) {
  fn();
  cases.push({name,status:'PASS'});
}

check('compiler binds deterministic point identity and canonical ref', () => {
  const out = compileForgePointInterface(canonical, draft());
  assert.equal(out.point_id, 'P007');
  assert.equal(out.source.canonical_ref, 'forge://blueprint/FORGE-BLUEPRINT-84-01/P007/canonical');
});

check('compiler hashes exact canonical bytes', () => {
  const out = compileForgePointInterface(canonical, draft());
  const expected = 'sha256:' + crypto.createHash('sha256').update(canonical.canonical_text, 'utf8').digest('hex');
  assert.equal(out.source.source_hash, expected);
});

check('compiled output satisfies existing v1 validator', () => {
  const out = compileForgePointInterface(canonical, draft());
  const validation = validateForgePointInterface(out, {
    canonicalVersion: canonical.canonical_version,
    sourceHash: out.source.source_hash
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.stale, false);
});

check('blank canonical is rejected', () => {
  assert.throws(
    () => compileForgePointInterface({...canonical, canonical_text:'  '}, draft()),
    /canonical_text must be non-empty/
  );
});

check('draft cannot forge source provenance', () => {
  assert.throws(
    () => compileForgePointInterface(canonical, {...draft(), source:{canonical_ref:'forged'}}),
    /compiler-owned field: source/
  );
});

check('invalid semantic references fail compilation', () => {
  const bad = draft();
  bad.operations[0].next_state = 'state.missing';
  assert.throws(
    () => compileForgePointInterface(canonical, bad),
    /next_state does not resolve/
  );
});

process.stdout.write(JSON.stringify({
  suite:'compile-forge-point-interface',
  checks:cases.length,
  passed:cases.length,
  status:'PASS'
}, null, 2) + '\n');
