import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const requiredPinFields = [
  'schema','pin_id','job_id','dedupe_key','project_id','generation','worker_id','claim_id',
  'claimed_at','expires_at','source_head','predecessor_pin_ref_or_null',
  'predecessor_claim_ref_or_null','recovery_basis_or_null'
];

function portfolioPayload(workflow) {
  const start = workflow.indexOf("schema:'prometeo.portfolio-pin/v1'");
  assert.notEqual(start, -1, 'portfolio pin payload schema must exist');
  const end = workflow.indexOf('predecessor_pin_ref:predecessor', start);
  assert.ok(end > start, 'portfolio pin payload must terminate before compatibility predecessor field');
  return workflow.slice(start, end);
}

test('allocator emits every immutable portfolio pin field before CREATE', () => {
  const payload = portfolioPayload(read('.github/workflows/live-feed.yml'));
  for (const field of requiredPinFields) {
    assert.match(payload, new RegExp(`\\b${field}:`), `missing ${field}`);
  }
  for (const placeholder of ['<worker_id>', '<now_iso>', '<now_plus_10m_iso>']) {
    assert.ok(payload.includes(placeholder), `missing bounded placeholder ${placeholder}`);
  }
  assert.ok(payload.includes('f.source_sha'), 'source_head must come from compiled allocator source identity');
});

test('/wc refuses structurally incomplete immutable portfolio pins without deep preclaim reads', () => {
  const wc = read('wc');
  assert.ok(wc.includes('candidate.claim_payload_shape'));
  assert.ok(wc.includes('ALLOCATOR_PIN_PAYLOAD_INVALID'));
  assert.ok(wc.includes('Never CREATE an immutable malformed pin'));
  assert.ok(wc.includes('Maximum 3 fast CREATE attempts'));
  assert.ok(wc.includes('FORBIDDEN before ownership:'));
});

test('fast allocation preserves claim-first while adding bounded structural validation', () => {
  const fast = read('coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
  assert.ok(fast.includes('candidate.claim_payload_shape'));
  assert.ok(fast.includes('ALLOCATOR_PIN_PAYLOAD_INVALID'));
  assert.ok(fast.includes('At most 3 atomic candidate attempts'));
  assert.ok(fast.includes('DO NOT pre-read the candidate\'s pin directory'));
  assert.ok(fast.includes('Attempt the atomic CREATE first only after the bounded allocator payload has passed the structural field check.'));
});

test('efficiency ratchet records the immutable fast-claim regression', () => {
  const baseline = JSON.parse(read('coordination/efficiency/RATCHET_BASELINE_V1.json'));
  const item = baseline.items.find(x => x.id === 'EFF011');
  assert.ok(item, 'EFF011 must exist');
  assert.equal(item.required.allocator_claim_payload_complete, true);
  assert.equal(item.required.malformed_portfolio_pin_create_forbidden, true);
  assert.equal(item.required.preserve_eff001_claim_first, true);
  assert.equal(item.required.max_fast_claim_attempts, 3);
  assert.equal(baseline.runtime_baseline_activated_at, '2026-09-17T20:15:00Z', 'ordinary ratchet edit must not reset runtime epoch');
});
