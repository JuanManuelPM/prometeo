import assert from 'node:assert/strict';
import {
  classifyPoolResidency,
  poolResidencyFailure,
  POOL_RESIDENCY_CHECKPOINT,
  POOL_RESIDENCY_TARGET,
  POOL_RESIDENCY_HARD_CAP
} from '../scripts/worker-residency-integrity.mjs';

assert.equal(POOL_RESIDENCY_CHECKPOINT,3);
assert.equal(POOL_RESIDENCY_TARGET,6);
assert.equal(POOL_RESIDENCY_HARD_CAP,8);

const active=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:false,productive_units:1
});
assert.equal(active.status,'OPEN_OR_DERIVED');
assert.equal(poolResidencyFailure(active),false);

const target=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:6
});
assert.equal(target.status,'TARGET_MET');
assert.equal(poolResidencyFailure(target),false);

const bad=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:2,
  close_reason:'EXHAUSTED_COMPATIBLE_FRONTIER',close_evidence_refs:[]
});
assert.equal(bad.status,'EARLY_CLOSE_UNJUSTIFIED');
assert.equal(poolResidencyFailure(bad),true);

const explained=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:4,
  close_reason:'EXHAUSTED_COMPATIBLE_FRONTIER',
  close_evidence_refs:['gh-pages:live/claim-frontier.json#post-return']
});
assert.equal(explained.status,'EARLY_CLOSE_EXPLAINED');
assert.equal(poolResidencyFailure(explained),false);

const fake=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:1,
  close_reason:'DONE',close_evidence_refs:['some/ref']
});
assert.equal(fake.status,'EARLY_CLOSE_UNJUSTIFIED');

const unbatched=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:null,explicit_exam:true,productive_units:1
});
assert.equal(unbatched.status,'NOT_APPLICABLE');

console.log('WORKER_RESIDENCY_INTEGRITY_V1_PASS');
