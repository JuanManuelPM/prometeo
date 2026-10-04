import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../../current-tree/control-v11/chat-canary/response-request-v1.js', import.meta.url), 'utf8');
const calls = [];
const sandbox = {
  Date,
  Math,
  JSON,
  Object,
  String,
  Number,
  Promise,
  crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000003' },
  PROMETEO_CHAT_CANARY_INPUT_V1: {
    submitText: async payload => {
      calls.push(payload);
      return { status: 'QUEUED', queued: true, ref: 'coordination/executions/WI-C003/RETURN.json' };
    }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'response-request-v1.js' });
const api = sandbox.PROMETEO_PRIMARY_CHAT_RESPONSE_REQUEST_V1;
assert.ok(api);
assert.equal(api.schema, 'prometeo.primary-chat-response-request/v1');
assert.equal(api.priority, 'HIGH');
assert.equal(api.priority_trigger, 'EXPLICIT_HUMAN_RESPONDER_ACTION');
assert.equal(api.routing, 'CURRENT_WORK_GRAPH');
assert.equal(api.targets.requested_candidate_count, 4);
assert.equal(api.targets.requested_exam_count, 2);
assert.equal(api.targets.requested_synthesizer_count, 1);
assert.equal(api.targets.human_routing_actions_target, 0);
assert.equal(api.authority.scheduler, false);
assert.equal(api.authority.queue, false);
assert.equal(api.authority.current, false);

const privateValue = api.encodePrivate('texto humano privado', {
  request_id: 'rr-test',
  created_at: '2026-10-04T16:55:00Z'
});
assert.ok(privateValue.startsWith('PROMETEO_RESPONSE_REQUEST_V1 '));
const parsed = api.parsePrivate(privateValue);
assert.equal(parsed.text, 'texto humano privado');
assert.equal(parsed.envelope.request_id, 'rr-test');
assert.equal(parsed.envelope.priority, 'HIGH');
assert.equal(parsed.envelope.counts_are_targets_not_claims, true);
assert.equal(parsed.envelope.actual_worker_returns_required_for_multi_worker_claim, true);
assert.equal(parsed.envelope.private_payload_only, true);
assert.equal(parsed.envelope.raw_text_public, false);

const projection = api.publicProjection(parsed.envelope);
assert.equal(projection.priority, 'HIGH');
assert.equal(projection.requested_candidate_count, 4);
assert.equal(projection.raw_text_public, false);
assert.equal(projection.authority, 'SANITIZED_DERIVED_REQUEST_ONLY');
assert.equal('text' in projection, false);
assert.equal(JSON.stringify(projection).includes('texto humano privado'), false);

const page = { page_id: 'control-v11-chat-canary' };
const result = await api.submitResponseRequest({
  text: 'resolver esto',
  page,
  request_id: 'rr-submit',
  created_at: '2026-10-04T16:56:00Z'
});
assert.equal(result.queued, true);
assert.equal(calls.length, 1);
assert.equal(calls[0].kind, 'PRIMARY_CHAT_RESPONSE_REQUEST_V1');
assert.equal(calls[0].page, page);
const submitted = api.parsePrivate(calls[0].text);
assert.equal(submitted.text, 'resolver esto');
assert.equal(submitted.envelope.requested_candidate_count, 4);
assert.equal(submitted.envelope.requested_exam_count, 2);
assert.equal(submitted.envelope.requested_synthesizer_count, 1);
assert.equal(submitted.envelope.counts_are_targets_not_claims, true);

console.log('PRIMARY_CHAT_RESPONSE_REQUEST_ENVELOPE_PASS');
