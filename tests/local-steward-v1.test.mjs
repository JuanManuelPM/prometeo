import assert from 'node:assert/strict';
import {
  DISPOSITIONS,
  assertCandidateAuthorityBoundary,
  buildLocalIntegrationCandidate,
} from '../scripts/local-steward-lib.mjs';

const sourceA = {
  return_ref: 'returns/A.json',
  content_sha: 'aaa111',
  run_id: 'RUN-A',
  authority_class: 'CANDIDATE_EVIDENCE_ONLY',
  semantic_atoms: [
    {scope:'control-plan',key:'route',value:'/plan',kind:'CANDIDATE'},
  ],
};
const sourceB = {
  return_ref: 'returns/B.json',
  content_sha: 'bbb222',
  run_id: 'RUN-B',
  semantic_atoms: [
    {scope:'control-plan',key:'route',value:'/plan',kind:'CANDIDATE'},
  ],
};

assert.deepEqual(DISPOSITIONS, [
  'CONSUMED','PARTIAL','CONFLICTED','SUPERSEDED_WITH_REASON',
  'DEFERRED_INSUFFICIENT_EVIDENCE','OUT_OF_SCOPE'
]);

// Equivalent evidence deduplicates semantically but preserves every source edge.
let before = structuredClone([sourceA, sourceB]);
let candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[sourceA,sourceB]
});
assert.equal(candidate.semantic_atoms.length,1);
assert.deepEqual(candidate.semantic_atoms[0].source_return_refs,['returns/A.json','returns/B.json']);
assert.equal(candidate.candidate_state,'CANDIDATE_DECISION_READY');
assert.equal(candidate.dispositions.every(d=>d.disposition==='CONSUMED'),true);
assert.deepEqual([sourceA,sourceB],before,'input returns must remain immutable from the steward perspective');
assert.equal(assertCandidateAuthorityBoundary(candidate),true);

// Same-scope contradiction must never resolve by recency/newest-wins.
const conflicting = {
  return_ref:'returns/C.json',content_sha:'ccc333',run_id:'RUN-C',
  semantic_atoms:[{scope:'control-plan',key:'route',value:'/other',kind:'CANDIDATE'}]
};
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[sourceA,conflicting]
});
assert.equal(candidate.candidate_state,'BLOCKED_CONTRADICTION');
assert.equal(candidate.conflicts.length,1);
assert.equal(candidate.dispositions.every(d=>d.disposition==='CONFLICTED'),true);
assert.ok(candidate.verification_requests.some(r=>r.trigger==='UNRESOLVED_CONFLICT' && r.independent));

// Mixed scope lets nonconflicting evidence survive while conflicting slice stays blocked.
const mixed = {
  return_ref:'returns/D.json',content_sha:'ddd444',run_id:'RUN-D',
  semantic_atoms:[
    {scope:'control-plan',key:'route',value:'/other',kind:'CANDIDATE'},
    {scope:'control-plan',key:'label',value:'Plan de acción',kind:'CANDIDATE'},
  ]
};
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[sourceA,mixed]
});
assert.equal(candidate.dispositions.find(d=>d.return_ref==='returns/D.json').disposition,'PARTIAL');
assert.ok(candidate.semantic_atoms.some(atom=>atom.key==='label'));

// Protected authority assertions are excluded and request independent verification.
const authorityAttempt = {
  return_ref:'returns/E.json',content_sha:'eee555',run_id:'RUN-E',current:true,
  semantic_atoms:[
    {scope:'control-plan',key:'candidate',value:'v2',kind:'CANDIDATE',authority_class:'CURRENT'},
    {scope:'control-plan',key:'note',value:'safe candidate evidence',kind:'CANDIDATE'}
  ]
};
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[authorityAttempt]
});
assert.equal(candidate.dispositions[0].disposition,'PARTIAL');
assert.equal(candidate.semantic_atoms.some(atom=>atom.key==='candidate'),false);
assert.equal(candidate.authority_boundary.may_move_current,false);
assert.equal(candidate.authority_boundary.may_mark_human_accepted,false);
assert.equal(candidate.authority_boundary.may_claim_served,false);
assert.ok(candidate.verification_requests.some(r=>r.trigger==='PROTECTED_AUTHORITY_ASSERTION'));

// Explicit supersession requires a reason and preserves source lineage.
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[sourceA],
  supersessions:{'returns/A.json':'Narrower return superseded by integrated surface candidate LSC-OLD'}
});
assert.equal(candidate.dispositions[0].disposition,'SUPERSEDED_WITH_REASON');
assert.match(candidate.dispositions[0].reasons[0],/superseded/i);

// Missing identity evidence defers rather than fabricating validity.
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',
  returns:[{return_ref:'returns/F.json',run_id:'RUN-F',semantic_atoms:[{scope:'control-plan',key:'x',value:1}]}]
});
assert.equal(candidate.dispositions[0].disposition,'DEFERRED_INSUFFICIENT_EVIDENCE');
assert.ok(candidate.dispositions[0].reasons.includes('MISSING_CONTENT_SHA'));

// Same immutable path with changed bytes is a hard evidence problem.
candidate = buildLocalIntegrationCandidate({
  surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',
  returns:[
    {return_ref:'returns/G.json',content_sha:'111',run_id:'RUN-G1',semantic_atoms:[{scope:'control-plan',key:'x',value:1}]},
    {return_ref:'returns/G.json',content_sha:'222',run_id:'RUN-G2',semantic_atoms:[{scope:'control-plan',key:'x',value:1}]},
  ]
});
assert.equal(candidate.immutability_breaches.length,1);
assert.equal(candidate.candidate_state,'BLOCKED_CONTRADICTION');
assert.ok(candidate.verification_requests.some(r=>r.trigger==='IMMUTABILITY_BREACH'));

// Deterministic/idempotent candidate identity for identical inputs.
const args = {surface_id:'control-plan',integration_scope_id:'control-plan',steward_id:'ST-1',returns:[sourceA,sourceB]};
assert.equal(buildLocalIntegrationCandidate(args).candidate_id,buildLocalIntegrationCandidate(args).candidate_id);

// Boundary validator rejects a promoted object.
assert.throws(()=>assertCandidateAuthorityBoundary({authority_class:'CURRENT'}),/AUTHORITY_VIOLATION/);
assert.throws(()=>assertCandidateAuthorityBoundary({authority_class:'CANDIDATE_ONLY',current:true}),/AUTHORITY_VIOLATION/);

console.log(JSON.stringify({ok:true,tests:'local-steward-v1',dispositions:DISPOSITIONS.length},null,2));
