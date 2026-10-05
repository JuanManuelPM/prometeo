'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const moduleCode = fs.readFileSync('current-tree/control-v11/chat-canary/response-request-v1.js', 'utf8');
const indexHtml = fs.readFileSync('current-tree/control-v11/chat-canary/index.html', 'utf8');

const ctx = {
  console, Date, Math, JSON, Object, Array, String, RegExp, Promise, Error,
  crypto: { randomUUID: () => 'c003-test' }
};
ctx.globalThis = ctx;
ctx.window = ctx;
vm.runInContext(moduleCode, vm.createContext(ctx), { filename: 'response-request-v1.js' });

(async () => {
  const api = ctx.PROMETEO_PRIMARY_CHAT_RESPONSE_REQUEST_V1;
  assert.ok(api);

  const envelope = api.buildEnvelope({
    request_id: 'rr-test',
    created_at: '2026-10-05T00:02:00Z'
  });
  assert.equal(envelope.priority, 'HIGH');
  assert.equal(envelope.priority_trigger, 'EXPLICIT_HUMAN_RESPONDER_ACTION');
  assert.equal(envelope.routing, 'CURRENT_WORK_GRAPH');
  assert.equal(envelope.counts_are_targets_not_claims, true);
  assert.equal(envelope.actual_worker_returns_required_for_multi_worker_claim, true);
  assert.equal(envelope.scheduler_authority, false);
  assert.equal(envelope.queue_authority, false);
  assert.equal(envelope.current_authority, false);

  const encoded = api.encodePrivate('raw private c003', {
    request_id: envelope.request_id,
    created_at: envelope.created_at
  });
  const parsed = api.parsePrivate(encoded);
  assert.ok(parsed);
  assert.equal(parsed.text, 'raw private c003');

  const publicProjection = api.publicProjection(envelope);
  assert.equal(publicProjection.raw_text_public, false);
  assert.equal(JSON.stringify(publicProjection).includes('raw private c003'), false);

  let submitted = null;
  const fakeInput = {
    submitText: async payload => {
      submitted = payload;
      return { status: 'LOCAL_DURABLE', queued: false, ref: null, request_id: payload.request_id };
    }
  };
  const result = await api.submitResponseRequest({
    text: 'human secret',
    inputApi: fakeInput,
    page: { page_id: 'control-v11-chat-canary' },
    request_id: 'rr-submit'
  });
  assert.equal(submitted.kind, 'PRIMARY_CHAT_RESPONSE_REQUEST_V1');
  assert.ok(submitted.text.startsWith(api.prefix));
  assert.equal(submitted.request_id, 'rr-submit');
  assert.equal(result.status, 'LOCAL_DURABLE');

  assert.ok(indexHtml.includes('./response-request-v1.js'));
  assert.ok(indexHtml.includes("responseApi.submitResponseRequest(payload)"));
  assert.ok(indexHtml.includes("submitter: responseApi && typeof responseApi.submitResponseRequest === 'function'"));

  console.log('PRIMARY_CHAT_C003_RESPONSE_REQUEST_V1 PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
