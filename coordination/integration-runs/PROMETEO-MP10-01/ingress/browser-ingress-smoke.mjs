import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(
  new URL('../../../../current-tree/control-v11/ingress-v1.js', import.meta.url),
  'utf8'
);

function boot(transport = null) {
  const sandbox = {
    console,
    Date,
    Math,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000003' }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  if (transport) sandbox.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = transport;
  vm.runInNewContext(source, sandbox, { filename: 'ingress-v1.js' });
  return sandbox;
}

{
  const s = boot();
  assert.equal(s.PROMETEO_INGRESS_V1.schema, 'prometeo.browser-ingress/v1');
  assert.equal(typeof s.PROMETEO_INGRESS_V1.submit, 'function');

  const empty = await s.PROMETEO_INGRESS_V1.submit({ text: '   ' });
  assert.equal(empty.queued, false);
  assert.equal(empty.status, 'BOUNDARY_INVALID_INPUT');
  assert.equal(empty.error, 'EMPTY_TEXT');

  const boundary = await s.PROMETEO_INGRESS_V1.submit({
    page: { id: 'control-room-v11', title: 'Control Room V11' },
    text: 'private command',
    kind: 'work'
  });
  assert.equal(boundary.queued, false);
  assert.equal(boundary.status, 'BOUNDARY_AUTH_REQUIRED');
  assert.equal(boundary.error, 'AUTH_BRIDGE_REQUIRED');
  assert.equal(JSON.stringify(boundary).includes('private command'), false);
}

{
  let seen = null;
  const s = boot({
    async submit(payload) {
      seen = payload;
      return {
        schema: 'prometeo.ingress-transport-result/v1',
        status: 'QUEUED',
        ref: 'coordination/page-change/ingress/request-3.json',
        queued: true,
        error: null
      };
    }
  });
  const out = await s.PROMETEO_INGRESS_V1.submit({
    page: {
      id: 'control-room-v11',
      title: 'Control Room V11',
      semantic_context: { private_note: 'must-not-leak' }
    },
    text: 'raw private work instruction',
    kind: 'work'
  });
  assert.equal(out.queued, true);
  assert.equal(out.status, 'QUEUED');
  assert.equal(out.ref, 'coordination/page-change/ingress/request-3.json');
  assert.equal(seen.private_payload.text, 'raw private work instruction');
  assert.equal('text' in seen.public_envelope, false);
  assert.equal(JSON.stringify(seen.public_envelope).includes('raw private work instruction'), false);
  assert.equal(JSON.stringify(seen.public_envelope).includes('must-not-leak'), false);
  assert.equal(seen.public_envelope.privacy.raw_text_public, false);
}

{
  const s = boot({
    async submit() {
      return {
        schema: 'wrong-schema',
        status: 'QUEUED',
        ref: 'coordination/fake.json',
        queued: true
      };
    }
  });
  const out = await s.PROMETEO_INGRESS_V1.submit({ text: 'do not trust malformed success' });
  assert.equal(out.queued, false);
  assert.equal(out.status, 'BOUNDARY_TRANSPORT_INVALID');
  assert.equal(out.error, 'TRANSPORT_RESULT_INVALID');
}

{
  const s = boot({
    async submit() {
      const e = new Error('raw command should never be echoed');
      e.code = 'AUTH_DOWN';
      throw e;
    }
  });
  const out = await s.PROMETEO_INGRESS_V1.submit({ text: 'raw command should never be echoed' });
  assert.equal(out.queued, false);
  assert.equal(out.status, 'BOUNDARY_TRANSPORT_FAILED');
  assert.equal(out.error, 'AUTH_DOWN');
  assert.equal(JSON.stringify(out).includes('raw command should never be echoed'), false);
}

console.log('PROMETEO-MP10-01 S003 browser ingress smoke: PASS');
