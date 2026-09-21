import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  classifyPoolResidency,
  canonicalPoolTerminalClose,
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

const transportBlockedProjection=canonicalPoolTerminalClose({
  no_allocation:{outcome:'CLAIM_TRANSPORT_BLOCKED'},
  no_allocation_ref:'coordination/workers/no-allocation/wc-transport-blocked.json'
});
assert.equal(transportBlockedProjection.diagnostic_outcome,'CLAIM_TRANSPORT_BLOCKED');
assert.equal(transportBlockedProjection.close_reason,'TRANSPORT_BOUNDARY');
assert.deepEqual(transportBlockedProjection.close_evidence_refs,['coordination/workers/no-allocation/wc-transport-blocked.json']);
const transportExplained=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:0,
  close_reason:transportBlockedProjection.close_reason,
  close_evidence_refs:transportBlockedProjection.close_evidence_refs
});
assert.equal(transportExplained.status,'EARLY_CLOSE_EXPLAINED');
assert.equal(poolResidencyFailure(transportExplained),false);

const transportBlockedWithoutDurableRef=canonicalPoolTerminalClose({
  no_allocation:{outcome:'CLAIM_TRANSPORT_BLOCKED'}
});
const transportStillFailClosed=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:0,
  close_reason:transportBlockedWithoutDurableRef.close_reason,
  close_evidence_refs:transportBlockedWithoutDurableRef.close_evidence_refs
});
assert.equal(transportStillFailClosed.status,'EARLY_CLOSE_UNJUSTIFIED');
assert.equal(poolResidencyFailure(transportStillFailClosed),true);

const diagnosticReasonIsNotTerminalReason=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:'PROD-01',explicit_exam:true,productive_units:0,
  close_reason:'CLAIM_TRANSPORT_BLOCKED',
  close_evidence_refs:['coordination/workers/no-allocation/wc-transport-blocked.json']
});
assert.equal(diagnosticReasonIsNotTerminalReason.status,'EARLY_CLOSE_UNJUSTIFIED');

// Reproduce the exact historical PROD-01 transport-blocked case without rewriting it.
const historicalTransportNoAllocation=JSON.parse(
  fs.readFileSync(new URL('../coordination/workers/no-allocation/wc-20260919T145500Z-b83f2a6d91c4.json',import.meta.url),'utf8')
);
assert.equal(historicalTransportNoAllocation.outcome,'CLAIM_TRANSPORT_BLOCKED');
const historicalTransportProjection=canonicalPoolTerminalClose({
  no_allocation:historicalTransportNoAllocation,
  no_allocation_ref:'coordination/workers/no-allocation/wc-20260919T145500Z-b83f2a6d91c4.json'
});
assert.equal(historicalTransportProjection.diagnostic_outcome,'CLAIM_TRANSPORT_BLOCKED');
assert.equal(historicalTransportProjection.close_reason,'TRANSPORT_BOUNDARY');
assert.deepEqual(
  historicalTransportProjection.close_evidence_refs,
  ['coordination/workers/no-allocation/wc-20260919T145500Z-b83f2a6d91c4.json']
);
const historicalTransportExplained=classifyPoolResidency({
  protocol_version:'v3.30',
  pool_id:'PROD-01',
  explicit_exam:true,
  productive_units:historicalTransportNoAllocation.productive_units,
  close_reason:historicalTransportProjection.close_reason,
  close_evidence_refs:historicalTransportProjection.close_evidence_refs
});
assert.equal(historicalTransportExplained.status,'EARLY_CLOSE_EXPLAINED');
assert.equal(poolResidencyFailure(historicalTransportExplained),false);

const unbatched=classifyPoolResidency({
  protocol_version:'v3.30',pool_id:null,explicit_exam:true,productive_units:1
});
assert.equal(unbatched.status,'NOT_APPLICABLE');

console.log('WORKER_RESIDENCY_INTEGRITY_V1_PASS');
