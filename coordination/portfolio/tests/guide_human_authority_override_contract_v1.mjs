import assert from 'node:assert/strict';
import fs from 'node:fs';

const governance = fs.readFileSync('coordination/guide/GUIDE_MESH_GOVERNANCE_V1.md', 'utf8');
const wc = fs.readFileSync('wc', 'utf8');

const requiredGovernanceClauses = [
  '### 4.1 Explicit human `/wc` authority override',
  'the HUMAN MESSAGE itself explicitly authorizes',
  'already holds the valid central Guide role PIN/claim',
  'explicit connector authorization denial',
  'Supabase `ECONNREFUSED` by itself therefore cannot turn explicit human authority into a terminal approval boundary',
  'this override never expands allowed paths, claim scope, destructive authority, privacy/credential access, CURRENT/Human Accepted/Served authority or promotion authority'
];
for (const clause of requiredGovernanceClauses) {
  assert.ok(governance.includes(clause), `missing governance clause: ${clause}`);
}

const requiredWcClauses = [
  'The authorization must come from the HUMAN MESSAGE itself.',
  'Human-decision, privacy, irreversible, destructive, credential, promotion and production boundaries remain unchanged.',
  'If an authority claim CREATE is **explicitly denied before authority exists** by connector/tool authorization or safety controls, classify `CLAIM_TRANSPORT_BLOCKED` and STOP immediately.'
];
for (const clause of requiredWcClauses) {
  assert.ok(wc.includes(clause), `missing wc authority clause: ${clause}`);
}

function explicitHumanOverrideEligible({humanAuthority, validRolePin, ownedScope, explicitDenial, protectedBoundary}) {
  return Boolean(humanAuthority && validRolePin && ownedScope && !explicitDenial && !protectedBoundary);
}

const cases = [
  {name:'authorized-owned-bounded', input:{humanAuthority:true, validRolePin:true, ownedScope:true, explicitDenial:false, protectedBoundary:false}, expected:true},
  {name:'missing-human-authority', input:{humanAuthority:false, validRolePin:true, ownedScope:true, explicitDenial:false, protectedBoundary:false}, expected:false},
  {name:'missing-role-pin', input:{humanAuthority:true, validRolePin:false, ownedScope:true, explicitDenial:false, protectedBoundary:false}, expected:false},
  {name:'scope-expansion', input:{humanAuthority:true, validRolePin:true, ownedScope:false, explicitDenial:false, protectedBoundary:false}, expected:false},
  {name:'explicit-denial', input:{humanAuthority:true, validRolePin:true, ownedScope:true, explicitDenial:true, protectedBoundary:false}, expected:false},
  {name:'protected-boundary', input:{humanAuthority:true, validRolePin:true, ownedScope:true, explicitDenial:false, protectedBoundary:true}, expected:false}
];
for (const testCase of cases) {
  assert.equal(explicitHumanOverrideEligible(testCase.input), testCase.expected, testCase.name);
}

console.log(JSON.stringify({
  schema: 'prometeo.guide-human-authority-override-contract-test/v1',
  status: 'PASS',
  cases: cases.length,
  authority: 'TEST_EVIDENCE_ONLY_NO_EXECUTION_OR_PROMOTION_AUTHORITY'
}));
