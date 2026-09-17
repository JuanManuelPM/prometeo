import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertPinnedHead,
  deriveMetabolism,
  deriveStaleCandidates,
  semanticDigest,
  writeShadowOutputs
} from '../scripts/prometeo-metabolism-lib.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/prometeo-metabolism/base.json', import.meta.url), 'utf8'));

const candidateWorkflow = path.join(path.dirname(new URL(import.meta.url).pathname), '../coordination/candidates/workflows/prometeo-metabolism-v1.yml');
assert.ok(fs.existsSync(candidateWorkflow), 'workflow draft must exist in candidate-only path');
assert.equal(candidateWorkflow.includes(`${path.sep}.github${path.sep}workflows${path.sep}`), false, 'candidate must not be deployed as an active GitHub workflow');

const sourceHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const first = deriveMetabolism({sourceHead, ...fixture, plannerCompilerAvailable:false, readyLowWatermark:2, maxOpenings:50});
const second = deriveMetabolism({sourceHead, ...fixture, plannerCompilerAvailable:false, readyLowWatermark:2, maxOpenings:50});
assert.deepEqual(second, first, 'same pinned inputs and same clock must derive identically');
assert.equal(first.authority, 'DERIVED_SHADOW_ONLY_NO_PROMOTION');
assert.equal(first.outputs.LAUNCH_DEMAND.claimable_slots, 1);
assert.deepEqual(first.outputs.LAUNCH_DEMAND.opportunity_ids, ['O-FREE']);
assert.equal(first.outputs.PLANNER_TRIGGER.state, 'PLANNER_COMPUTE_REQUIRED');
assert.ok(first.outputs.PLANNER_TRIGGER.reason_codes.includes('UNCONSUMED_RETURN'));
assert.ok(first.outputs.PLANNER_TRIGGER.reason_codes.includes('READY_DEPTH_BELOW_WATERMARK'));
assert.equal(first.outputs.STALE_CANDIDATES.candidates.length, 1);
assert.equal(first.outputs.STALE_CANDIDATES.candidates[0].stale_state, 'RECOVERY_TIME_GATE_MET');
assert.equal(first.outputs.STALE_CANDIDATES.candidates[0].recovery_authorized, false);
assert.ok(first.truth_boundary.includes('No output grants Current'));

const withCompiler = deriveMetabolism({sourceHead, ...fixture, plannerCompilerAvailable:true, readyLowWatermark:2});
assert.equal(withCompiler.outputs.PLANNER_TRIGGER.state, 'READY_FOR_DETERMINISTIC_PLANNER');

const noPolicy = deriveStaleCandidates({
  continuityHead:{},
  runs:fixture.runs,
  returns:fixture.returns,
  now:fixture.now
});
assert.equal(noPolicy.status, 'STALE_POLICY_MISSING');
assert.deepEqual(noPolicy.candidates, []);

assert.throws(() => assertPinnedHead('a','b'), /SOURCE_HEAD_DRIFT/);
assert.equal(assertPinnedHead('a','a'), true);

const tainted = deriveMetabolism({
  sourceHead,
  ...fixture,
  continuityHead:{...fixture.continuityHead, access_token:'do-not-publish'}
});
assert.equal(JSON.stringify(tainted.outputs).includes('do-not-publish'), false, 'private source fields must never flow into public shadow outputs');

const volatileA = {state:'X', generated_at:'2026-09-17T09:00:00Z', age_minutes:31.1};
const volatileB = {state:'X', generated_at:'2026-09-17T09:05:00Z', age_minutes:36.1};
assert.equal(semanticDigest(volatileA), semanticDigest(volatileB), 'volatile timestamps/ages cannot force commit churn');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-metabolism-'));
const write1 = writeShadowOutputs(temp, first, {trigger:'test'});
assert.ok(write1.changed.length >= 5);
const write2 = writeShadowOutputs(temp, first, {trigger:'test'});
assert.equal(write2.changed.length, 0, 'semantic no-op must not rewrite shadow outputs');

const changedNow = deriveMetabolism({...fixture, sourceHead, now:'2026-09-17T09:11:00-03:00', plannerCompilerAvailable:false});
const write3 = writeShadowOutputs(temp, changedNow, {trigger:'schedule'});
assert.equal(write3.changed.length, 0, 'pure clock drift without semantic transition must remain a no-op');

const outputText = fs.readFileSync(path.join(temp, 'coordination/workstreams/chat-native-control-plane-v1/generated/metabolism/PLANNER_TRIGGER.json'), 'utf8');
assert.equal(outputText.includes('do-not-publish'), false);
assert.equal(outputText.includes('HUMAN_ACCEPTED'), false);

console.log(JSON.stringify({
  ok:true,
  semantic_bundle_digest:first.semantic_bundle_digest,
  planner_state:first.outputs.PLANNER_TRIGGER.state,
  stale_state:first.outputs.STALE_CANDIDATES.candidates[0].stale_state,
  claimable_slots:first.outputs.LAUNCH_DEMAND.claimable_slots
}, null, 2));
