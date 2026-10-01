import fs from 'node:fs';
import assert from 'node:assert/strict';

const contractUrl = new URL('../../workers/WORKER_NO_ALLOCATION_RECEIPT_V1.json', import.meta.url);
const contract = JSON.parse(fs.readFileSync(contractUrl, 'utf8'));

assert.equal(contract.status, 'ACTIVE_BINDING');
assert.equal(contract.durable_owner, 'coordination/workers/no-allocation/<worker_id>.json');

const rules = new Map(contract.classification_rules.map((rule) => [rule.classification, rule]));
assert.equal(rules.get('CREATE_EXISTS')?.signature, 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING');
assert.equal(rules.get('CLAIM_TRANSPORT_BLOCKED')?.signature, 'OPENAI_TOOL_SAFETY_DENIAL');
assert.match(rules.get('CLAIM_TRANSPORT_BLOCKED')?.rule ?? '', /retry_allowed=false/);
assert.match(rules.get('CLAIM_TRANSPORT_BLOCKED')?.rule ?? '', /Never retry, divert, or bypass/);
assert.equal(contract.compatibility?.eff016b_transport_denial_projection?.required, true);
assert.equal(contract.compatibility?.eff016b_transport_denial_projection?.canonical_reason, 'CLAIM_TRANSPORT_BLOCKED');
assert.equal(contract.compatibility?.eff016b_transport_denial_projection?.nested_classification, 'transport_boundary_v1.classification');
assert.match(contract.compatibility?.eff016b_transport_denial_projection?.rule ?? '', /EFF016B/);
assert.match(contract.compatibility?.eff016b_transport_denial_projection?.rule ?? '', /GUIDE_RESCATE/);

const samples = [
  {
    name: 'duplicate create is collision',
    input: { explicit_denial: false, signature: 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING' },
    expected: 'CREATE_EXISTS'
  },
  {
    name: 'explicit connector safety denial is terminal block',
    input: { explicit_denial: true, signature: 'OPENAI_TOOL_SAFETY_DENIAL' },
    expected: 'CLAIM_TRANSPORT_BLOCKED'
  },
  {
    name: 'unknown pre-authority failure is ambiguous, not blocked',
    input: { explicit_denial: false, signature: 'UNKNOWN' },
    expected: 'CLAIM_TRANSPORT_AMBIGUOUS'
  }
];

function classify({ explicit_denial, signature }) {
  if (signature === 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING') return 'CREATE_EXISTS';
  if (explicit_denial && signature === 'OPENAI_TOOL_SAFETY_DENIAL') return 'CLAIM_TRANSPORT_BLOCKED';
  return 'CLAIM_TRANSPORT_AMBIGUOUS';
}

for (const sample of samples) {
  assert.equal(classify(sample.input), sample.expected, sample.name);
}

console.log(JSON.stringify({
  test: 'claim_transport_boundary_contract_v1',
  passed: samples.length + 9,
  failed: 0,
  classifications: samples.map((sample) => sample.expected),
  eff016b_transport_denial_projection: true
}));
